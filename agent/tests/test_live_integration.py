import os
from uuid import uuid4

import pytest

from app.domain import SlideInput
from app.settings import Settings


pytestmark = pytest.mark.integration

if os.getenv("RUN_AGENT_INTEGRATION") != "1":
    pytest.skip(
        "set RUN_AGENT_INTEGRATION=1 after starting the local Compose services",
        allow_module_level=True,
    )


def test_qdrant_and_neo4j_round_trip() -> None:
    from app.runtime import build_runtime

    settings = Settings(
        rag_provider="mock",
        rag_vector_store="qdrant",
        rag_graph_store="neo4j",
        user_context_provider="mock",
    )
    runtime = build_runtime(settings)
    document_id = f"integration-{uuid4()}"
    try:
        runtime.indexer.index(
            [
                SlideInput(
                    document_id=document_id,
                    version="v1",
                    day="integration",
                    slide_number=1,
                    title="Integration retrieval",
                    content="A deterministic integration slide for live stores.",
                    concepts=["Integration"],
                )
            ]
        )
        result = runtime.retriever.retrieve(
            "integration retrieval",
            day="integration",
            document_id=document_id,
            limit=1,
        )
        assert [hit.chunk.document_id for hit in result.slides] == [document_id]
        assert [concept.name for concept in result.concepts] == ["Integration"]
    finally:
        cleanup_errors = []
        for store in (runtime.graph_store, runtime.vector_store):
            try:
                store.replace_document(document_id, [])
            except Exception as error:
                cleanup_errors.append(error)
        try:
            runtime.close()
        finally:
            if cleanup_errors:
                raise cleanup_errors[0]


def test_postgres_read_only_user_context() -> None:
    from app.user_context import PostgresUserContextProvider

    settings = Settings(user_context_provider="postgres")
    settings.validate_runtime()
    provider = PostgresUserContextProvider(settings)
    try:
        context = provider.get(1)
        assert context.user_id == 1
    finally:
        provider.close()

import importlib

import pytest

from app.domain import GraphConcept, RetrievalResult, RetrievedSlide, SlideChunk
from app.errors import DependencyUnavailableError, UpstreamDependencyError
from app.graph.nodes.retrieval_graph import retrieval_graph
from app.graph.nodes.database_query import UserContext
from app.settings import ConfigurationError, Settings


def _runtime_module():
    return importlib.import_module("app.runtime")


def test_mock_runtime_owns_offline_dependencies() -> None:
    runtime = _runtime_module().build_runtime(Settings(_env_file=None))

    assert runtime.settings.rag_provider == "mock"
    assert runtime.embedding_provider.__class__.__name__ == "MockEmbeddingProvider"
    assert runtime.vector_store.__class__.__name__ == "MemoryVectorStore"
    assert runtime.graph_store.__class__.__name__ == "MemoryGraphStore"
    assert runtime.user_context_provider.__class__.__name__ == "MockUserContextProvider"
    assert runtime.chat_provider.provider_name == "mock"
    assert runtime.indexer is not None
    assert runtime.retriever is not None
    assert runtime.workflow is not None


def test_invalid_live_runtime_fails_before_constructing_clients(monkeypatch) -> None:
    runtime_module = _runtime_module()
    constructed = False

    class UnexpectedQdrant:
        def __init__(self, settings):
            nonlocal constructed
            constructed = True

    monkeypatch.setattr(runtime_module, "QdrantVectorStore", UnexpectedQdrant)

    with pytest.raises(ConfigurationError, match="QDRANT_URL"):
        runtime_module.build_runtime(
            Settings(
                _env_file=None,
                rag_vector_store="qdrant",
                qdrant_url="",
            )
        )

    assert constructed is False


def test_missing_live_client_package_is_typed_dependency_unavailable(
    monkeypatch,
) -> None:
    runtime_module = _runtime_module()

    class MissingQdrant:
        def __init__(self, settings):
            raise ImportError("qdrant package path with token=secret")

    monkeypatch.setattr(runtime_module, "QdrantVectorStore", MissingQdrant)

    with pytest.raises(DependencyUnavailableError) as captured:
        runtime_module.build_runtime(
            Settings(_env_file=None, rag_vector_store="qdrant")
        )

    assert "secret" not in str(captured.value)
    assert "secret" not in repr(captured.value)


def test_live_client_initialization_failure_is_typed_and_sanitized(
    monkeypatch,
) -> None:
    runtime_module = _runtime_module()

    class BrokenNeo4j:
        def __init__(self, settings):
            raise RuntimeError("neo4j password=super-secret")

    monkeypatch.setattr(runtime_module, "Neo4jGraphStore", BrokenNeo4j)

    with pytest.raises(UpstreamDependencyError) as captured:
        runtime_module.build_runtime(
            Settings(
                _env_file=None,
                rag_graph_store="neo4j",
                neo4j_password="configured",
            )
        )

    assert "super-secret" not in str(captured.value)
    assert "super-secret" not in repr(captured.value)


def test_workflow_executes_the_four_nodes_in_contract_order() -> None:
    runtime_module = _runtime_module()
    calls: list[str] = []
    chunk = SlideChunk(
        document_id="deck",
        version="v1",
        day="day01",
        slide_number=1,
        title="JTBD",
        content="Jobs To Be Done",
        concepts=["JTBD"],
    )

    class ContextProvider:
        def get(self, user_id: int) -> UserContext:
            calls.append("database_query")
            return UserContext(user_id=user_id, current_level="beginner")

    def level_analyzer(context: UserContext) -> str:
        calls.append("level_analyzer")
        return "beginner"

    class Retriever:
        def retrieve(self, *args, **kwargs) -> RetrievalResult:
            calls.append("retrieval_graph")
            return RetrievalResult(
                (RetrievedSlide(chunk=chunk, score=1.0),),
                (GraphConcept("JTBD", (chunk.id,)),),
            )

    class ChatProvider:
        provider_name = "recording"

        def answer(self, **kwargs) -> str:
            calls.append("call_llm")
            return "grounded answer"

    dependencies = runtime_module.WorkflowDependencies(
        user_context_provider=ContextProvider(),
        level_analyzer=level_analyzer,
        retriever=Retriever(),
        chat_provider=ChatProvider(),
        retrieval_limit=5,
    )

    result = runtime_module.build_workflow(dependencies).invoke(
        {"user_id": 7, "question": "JTBD?", "current_day": "day01"}
    )

    assert calls == [
        "database_query",
        "level_analyzer",
        "retrieval_graph",
        "call_llm",
    ]
    assert result["answer"] == "grounded answer"
    assert result["provider"] == "recording"


def test_retrieval_graph_adapter_requires_and_uses_canonical_retriever() -> None:
    chunk = SlideChunk(
        document_id="deck",
        version="v1",
        day="day01",
        slide_number=1,
        title="JTBD",
        content="Grounded",
        concepts=["JTBD"],
    )

    class Retriever:
        def retrieve(self, question, **kwargs):
            assert question == "JTBD?"
            assert kwargs == {
                "day": "day01",
                "document_id": "deck",
                "limit": 3,
            }
            return RetrievalResult(
                (RetrievedSlide(chunk, 0.75),),
                (GraphConcept("JTBD", (chunk.id,)),),
            )

    result = retrieval_graph(
        "JTBD?",
        day="day01",
        document_id="deck",
        limit=3,
        retriever=Retriever(),
    )

    assert result.slide_chunks[0]["document_id"] == "deck"
    assert result.slide_chunks[0]["score"] == 0.75
    assert result.graph_nodes == [{"name": "JTBD", "slide_ids": [chunk.id]}]

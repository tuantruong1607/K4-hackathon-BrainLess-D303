import os
from dataclasses import dataclass


@dataclass(frozen=True)
class RagSettings:
    provider: str = "mock"
    vector_store: str = "memory"
    graph_store: str = "memory"
    openai_api_key: str | None = None
    openai_embedding_model: str = "text-embedding-3-small"
    openai_chat_model: str = "gpt-5.6-sol"
    qdrant_url: str | None = None
    qdrant_collection: str = "slides"
    neo4j_uri: str | None = None
    neo4j_username: str | None = None
    neo4j_password: str | None = None

    @classmethod
    def from_env(cls) -> "RagSettings":
        return cls(
            provider=os.getenv("RAG_PROVIDER", "mock"),
            vector_store=os.getenv("RAG_VECTOR_STORE", "memory"),
            graph_store=os.getenv("RAG_GRAPH_STORE", "memory"),
            openai_api_key=os.getenv("OPENAI_API_KEY") or None,
            openai_embedding_model=os.getenv(
                "OPENAI_EMBEDDING_MODEL", "text-embedding-3-small"
            ),
            openai_chat_model=os.getenv("OPENAI_CHAT_MODEL", "gpt-5.6-sol"),
            qdrant_url=os.getenv("QDRANT_URL") or None,
            qdrant_collection=os.getenv("QDRANT_COLLECTION", "slides"),
            neo4j_uri=os.getenv("NEO4J_URI") or None,
            neo4j_username=os.getenv("NEO4J_USERNAME") or None,
            neo4j_password=os.getenv("NEO4J_PASSWORD") or None,
        )

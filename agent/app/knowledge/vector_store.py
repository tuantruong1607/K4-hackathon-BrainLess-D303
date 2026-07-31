"""Compatibility facade; the Runtime owns the canonical vector store."""

from app.errors import DependencyUnavailableError
from app.knowledge.embedder import embed_text, embed_texts
from app.settings import Settings
from app.stores import QdrantVectorStore, VectorRecord


def _get_store(settings: Settings | None = None) -> QdrantVectorStore:
    selected = settings or Settings()
    selected.validate_runtime()
    if selected.rag_vector_store != "qdrant":
        raise DependencyUnavailableError(
            "Legacy Qdrant facade is disabled unless RAG_VECTOR_STORE=qdrant"
        )
    return QdrantVectorStore(selected)


def get_client():
    return _get_store()._client


def ensure_collection() -> None:
    """Collection creation is deferred until a prepared vector defines its size."""


def upsert_chunks(chunks) -> int:
    if not chunks:
        return 0
    vectors = embed_texts(
        [f"{chunk.title}\n\n{chunk.content}" for chunk in chunks]
    )
    by_document: dict[str, list[VectorRecord]] = {}
    for chunk, vector in zip(chunks, vectors):
        by_document.setdefault(chunk.document_id, []).append(
            VectorRecord(chunk, vector)
        )
    for document_id, records in by_document.items():
        _get_store().replace_document(document_id, records)
    return len(chunks)


def search(
    query: str,
    top_k: int | None = None,
    day: str | None = None,
    document_id: str | None = None,
) -> list[dict]:
    settings = Settings()
    hits = _get_store(settings).search(
        embed_text(query, settings=settings),
        day=day,
        document_id=document_id,
        limit=top_k or settings.retrieval_limit,
    )
    return [
        hit.chunk.to_dict()
        | {
            "text": hit.chunk.content,
            "source": hit.chunk.document_id,
            "chunk_index": hit.chunk.slide_number - 1,
            "score": hit.score,
            "citation": hit.citation,
        }
        for hit in hits
    ]


def get_chunks_by_day(day: str, limit: int = 20) -> list[dict]:
    store = _get_store()
    if not store._collection_exists():
        return []

    from qdrant_client.models import FieldCondition, Filter, MatchValue

    points, _ = store._client.scroll(
        collection_name=store._collection,
        scroll_filter=Filter(
            must=[FieldCondition(key="day", match=MatchValue(value=day))]
        ),
        limit=limit,
        with_payload=True,
    )
    return [
        dict(point.payload or {})
        | {
            "text": (point.payload or {}).get("content", ""),
            "source": (point.payload or {}).get("document_id", ""),
        }
        for point in points
    ]

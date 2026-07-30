import uuid
from functools import lru_cache

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, FieldCondition, Filter, MatchValue, PointStruct, VectorParams

from app.config import settings
from app.knowledge.chunker import Chunk
from app.knowledge.embedder import embed_text, embed_texts

EMBEDDING_SIZE = 1536  # text-embedding-3-small
NAMESPACE = uuid.UUID("a1c9f3b2-9e4c-4b1a-8b1d-6c5e9f2d7a11")


@lru_cache
def get_client() -> QdrantClient:
    settings.qdrant_path.mkdir(parents=True, exist_ok=True)
    return QdrantClient(path=str(settings.qdrant_path))


def ensure_collection() -> None:
    client = get_client()
    existing = {collection.name for collection in client.get_collections().collections}
    if settings.qdrant_collection not in existing:
        client.create_collection(
            collection_name=settings.qdrant_collection,
            vectors_config=VectorParams(size=EMBEDDING_SIZE, distance=Distance.COSINE),
        )


def upsert_chunks(chunks: list[Chunk]) -> int:
    if not chunks:
        return 0

    ensure_collection()
    vectors = embed_texts([chunk.text for chunk in chunks])

    points = [
        PointStruct(
            id=str(uuid.uuid5(NAMESPACE, f"{chunk.source}:{chunk.chunk_index}")),
            vector=vector,
            payload={
                "text": chunk.text,
                "source": chunk.source,
                "day": chunk.day,
                "chunk_index": chunk.chunk_index,
            },
        )
        for chunk, vector in zip(chunks, vectors)
    ]

    get_client().upsert(collection_name=settings.qdrant_collection, points=points)
    return len(points)


def get_chunks_by_day(day: str, limit: int = 20) -> list[dict]:
    ensure_collection()
    query_filter = Filter(must=[FieldCondition(key="day", match=MatchValue(value=day))])
    points, _ = get_client().scroll(
        collection_name=settings.qdrant_collection,
        scroll_filter=query_filter,
        limit=limit,
    )
    return [point.payload for point in points]


def search(query: str, top_k: int | None = None, day: str | None = None) -> list[dict]:
    ensure_collection()
    query_vector = embed_text(query)

    query_filter = None
    if day:
        query_filter = Filter(must=[FieldCondition(key="day", match=MatchValue(value=day))])

    results = get_client().query_points(
        collection_name=settings.qdrant_collection,
        query=query_vector,
        limit=top_k or settings.retrieval_top_k,
        query_filter=query_filter,
    )

    return [point.payload for point in results.points]

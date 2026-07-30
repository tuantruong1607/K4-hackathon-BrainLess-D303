import math
from typing import Protocol, Sequence
from uuid import NAMESPACE_URL, uuid5

from .domain import RetrievedSlide, SlideChunk
from .settings import RagSettings


class VectorStore(Protocol):
    def upsert(self, chunk: SlideChunk, vector: Sequence[float]) -> None: ...

    def search(
        self,
        vector: Sequence[float],
        day: str | None = None,
        document_id: str | None = None,
        limit: int = 5,
    ) -> list[RetrievedSlide]: ...


class GraphStore(Protocol):
    def upsert_slide(self, chunk: SlideChunk) -> None: ...


class MemoryVectorStore:
    def __init__(self) -> None:
        self.vectors: dict[str, list[float]] = {}
        self.chunks: dict[str, SlideChunk] = {}

    @property
    def count(self) -> int:
        return len(self.vectors)

    def upsert(self, chunk: SlideChunk, vector: Sequence[float]) -> None:
        self.vectors[chunk.id] = list(vector)
        self.chunks[chunk.id] = chunk

    def search(
        self,
        vector: Sequence[float],
        day: str | None = None,
        document_id: str | None = None,
        limit: int = 5,
    ) -> list[RetrievedSlide]:
        results = [
            RetrievedSlide(chunk=chunk, score=_cosine_similarity(vector, stored))
            for chunk_id, stored in self.vectors.items()
            if (chunk := self.chunks[chunk_id])
            and (day is None or chunk.day == day)
            and (document_id is None or chunk.document_id == document_id)
        ]
        results.sort(key=lambda result: (-result.score, result.chunk.slide_number))
        return results[: max(0, limit)]


class MemoryGraphStore:
    def __init__(self) -> None:
        self.slides: list[SlideChunk] = []
        self.concepts: set[str] = set()

    def upsert_slide(self, chunk: SlideChunk) -> None:
        self.slides.append(chunk)
        self.concepts.update(chunk.concepts)


class QdrantVectorStore:
    def __init__(self, settings: RagSettings):
        if not settings.qdrant_url:
            raise RuntimeError("QDRANT_URL is required when RAG_VECTOR_STORE=qdrant")
        from qdrant_client import QdrantClient

        self._client = QdrantClient(url=settings.qdrant_url)
        self._collection = settings.qdrant_collection
        self._collection_ready = False

    def upsert(self, chunk: SlideChunk, vector: Sequence[float]) -> None:
        from qdrant_client.models import PointStruct

        vector_values = list(vector)
        self._ensure_collection(len(vector_values))
        self._client.upsert(
            collection_name=self._collection,
            points=[
                PointStruct(
                    id=str(uuid5(NAMESPACE_URL, chunk.id)),
                    vector=vector_values,
                    payload={
                        "chunk_id": chunk.id,
                        "document_id": chunk.document_id,
                        "day": chunk.day,
                        "version": chunk.version,
                        "slide_number": chunk.slide_number,
                        "title": chunk.title,
                        "content": chunk.content,
                        "concepts": chunk.concepts,
                    },
                )
            ],
        )

    def search(
        self,
        vector: Sequence[float],
        day: str | None = None,
        document_id: str | None = None,
        limit: int = 5,
    ) -> list[RetrievedSlide]:
        from qdrant_client.models import FieldCondition, Filter, MatchValue

        conditions = []
        if day is not None:
            conditions.append(
                FieldCondition(key="day", match=MatchValue(value=day))
            )
        if document_id is not None:
            conditions.append(
                FieldCondition(
                    key="document_id", match=MatchValue(value=document_id)
                )
            )
        query_filter = Filter(must=conditions) if conditions else None
        search_args = {
            "collection_name": self._collection,
            "query_filter": query_filter,
            "limit": max(0, limit),
            "with_payload": True,
        }
        if hasattr(self._client, "search"):
            points = self._client.search(
                query_vector=list(vector),
                **search_args,
            )
        else:
            response = self._client.query_points(
                query=list(vector),
                **search_args,
            )
            points = response.points
        results = [
            RetrievedSlide(
                chunk=_chunk_from_payload(point.payload),
                score=float(point.score),
            )
            for point in points
        ]
        results.sort(key=lambda result: (-result.score, result.chunk.slide_number))
        return results

    def _ensure_collection(self, vector_size: int) -> None:
        if self._collection_ready:
            return
        from qdrant_client.models import Distance, VectorParams

        if not self._client.collection_exists(collection_name=self._collection):
            self._client.create_collection(
                collection_name=self._collection,
                vectors_config=VectorParams(
                    size=vector_size,
                    distance=Distance.COSINE,
                ),
            )
        self._collection_ready = True


class Neo4jGraphStore:
    def __init__(self, settings: RagSettings):
        if not settings.neo4j_uri:
            raise RuntimeError("NEO4J_URI is required when RAG_GRAPH_STORE=neo4j")
        from neo4j import GraphDatabase

        self._driver = GraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_username, settings.neo4j_password),
        )

    def upsert_slide(self, chunk: SlideChunk) -> None:
        query = """
        MERGE (slide:Slide {id: $id})
        SET slide.document_id = $document_id, slide.day = $day,
            slide.version = $version, slide.slide_number = $slide_number,
            slide.title = $title, slide.content = $content
        WITH slide
        UNWIND $concepts AS concept_name
        MERGE (concept:Concept {name: concept_name})
        MERGE (slide)-[:MENTIONS]->(concept)
        """
        with self._driver.session() as session:
            session.run(
                query,
                id=chunk.id,
                document_id=chunk.document_id,
                day=chunk.day,
                version=chunk.version,
                slide_number=chunk.slide_number,
                title=chunk.title,
                content=chunk.content,
                concepts=chunk.concepts,
            )


def _cosine_similarity(left: Sequence[float], right: Sequence[float]) -> float:
    if len(left) != len(right):
        raise ValueError("vectors must have the same dimensions")
    left_norm = math.sqrt(sum(value * value for value in left))
    right_norm = math.sqrt(sum(value * value for value in right))
    if left_norm == 0 or right_norm == 0:
        return 0.0
    return sum(a * b for a, b in zip(left, right)) / (left_norm * right_norm)


def _chunk_from_payload(payload: dict) -> SlideChunk:
    return SlideChunk(
        document_id=payload["document_id"],
        day=payload["day"],
        version=payload["version"],
        slide_number=int(payload["slide_number"]),
        title=payload["title"],
        content=payload["content"],
        concepts=list(payload.get("concepts", [])),
    )

import math
from dataclasses import dataclass
from typing import Protocol, Sequence
from uuid import NAMESPACE_URL, uuid5

from .domain import GraphConcept, RetrievedSlide, SlideChunk
from .settings import RagSettings


@dataclass(frozen=True)
class VectorRecord:
    chunk: SlideChunk
    vector: Sequence[float]


class VectorStore(Protocol):
    def replace_document(
        self, document_id: str, records: Sequence[VectorRecord]
    ) -> None: ...

    def search(
        self,
        query_vector: Sequence[float],
        *,
        day: str | None = None,
        document_id: str | None = None,
        limit: int = 5,
    ) -> list[RetrievedSlide]: ...


class GraphStore(Protocol):
    def replace_document(
        self, document_id: str, chunks: Sequence[SlideChunk]
    ) -> None: ...

    def expand_from_slides(
        self,
        slide_ids: Sequence[str],
        *,
        day: str | None = None,
        document_id: str | None = None,
    ) -> list[GraphConcept]: ...


class MemoryVectorStore:
    def __init__(self) -> None:
        self.vectors: dict[str, list[float]] = {}
        self.chunks: dict[str, SlideChunk] = {}

    @property
    def count(self) -> int:
        return len(self.vectors)

    def replace_document(
        self, document_id: str, records: Sequence[VectorRecord]
    ) -> None:
        new_vectors = {
            chunk_id: vector
            for chunk_id, vector in self.vectors.items()
            if self.chunks[chunk_id].document_id != document_id
        }
        new_chunks = {
            chunk_id: chunk
            for chunk_id, chunk in self.chunks.items()
            if chunk.document_id != document_id
        }
        for record in records:
            if record.chunk.document_id != document_id:
                raise ValueError("record document_id does not match replacement document_id")
            new_vectors[record.chunk.id] = list(record.vector)
            new_chunks[record.chunk.id] = record.chunk
        self.vectors = new_vectors
        self.chunks = new_chunks

    def search(
        self,
        query_vector: Sequence[float],
        *,
        day: str | None = None,
        document_id: str | None = None,
        limit: int = 5,
    ) -> list[RetrievedSlide]:
        hits: list[RetrievedSlide] = []
        for chunk_id, chunk in self.chunks.items():
            if day is not None and chunk.day != day:
                continue
            if document_id is not None and chunk.document_id != document_id:
                continue
            hits.append(
                RetrievedSlide(
                    chunk=chunk,
                    score=_cosine_similarity(query_vector, self.vectors[chunk_id]),
                )
            )
        hits.sort(key=lambda hit: (-hit.score, hit.chunk.id))
        return hits[:limit]


class MemoryGraphStore:
    def __init__(self) -> None:
        self.slides: dict[str, SlideChunk] = {}
        self.mentions: dict[str, set[str]] = {}
        self.concept_nodes: dict[str, GraphConcept] = {}

    @property
    def concepts(self) -> set[str]:
        return set(self.mentions)

    def replace_document(
        self, document_id: str, chunks: Sequence[SlideChunk]
    ) -> None:
        new_slides = {
            slide_id: chunk
            for slide_id, chunk in self.slides.items()
            if chunk.document_id != document_id
        }
        for chunk in chunks:
            if chunk.document_id != document_id:
                raise ValueError("chunk document_id does not match replacement document_id")
            new_slides[chunk.id] = chunk

        mentions: dict[str, set[str]] = {}
        for chunk in new_slides.values():
            for concept in chunk.concepts:
                mentions.setdefault(concept, set()).add(chunk.id)
        self.slides = new_slides
        self.mentions = mentions
        self.concept_nodes = {
            name: GraphConcept(name=name, slide_ids=tuple(sorted(slide_ids)))
            for name, slide_ids in mentions.items()
        }

    def expand_from_slides(
        self,
        slide_ids: Sequence[str],
        *,
        day: str | None = None,
        document_id: str | None = None,
    ) -> list[GraphConcept]:
        eligible_ids = {
            slide_id
            for slide_id in slide_ids
            if slide_id in self.slides
            and (day is None or self.slides[slide_id].day == day)
            and (
                document_id is None
                or self.slides[slide_id].document_id == document_id
            )
        }
        return [
            GraphConcept(name, tuple(sorted(mentioned_ids & eligible_ids)))
            for name, mentioned_ids in sorted(self.mentions.items())
            if mentioned_ids & eligible_ids
        ]


class QdrantVectorStore:
    def __init__(self, settings: RagSettings):
        if not settings.qdrant_url:
            raise RuntimeError("QDRANT_URL is required when RAG_VECTOR_STORE=qdrant")
        from qdrant_client import QdrantClient

        self._client = QdrantClient(url=settings.qdrant_url)
        self._collection = settings.qdrant_collection

    def replace_document(
        self, document_id: str, records: Sequence[VectorRecord]
    ) -> None:
        dimensions = {len(record.vector) for record in records}
        if len(dimensions) > 1:
            raise ValueError("all prepared vectors must use the same dimension")
        if records:
            self._ensure_collection_dimension(next(iter(dimensions)))
        elif not self._collection_exists():
            return

        from qdrant_client.models import (
            DeleteOperation,
            FieldCondition,
            Filter,
            FilterSelector,
            MatchValue,
            PointsList,
            PointStruct,
            UpsertOperation,
        )

        document_filter = Filter(
            must=[
                FieldCondition(
                    key="document_id",
                    match=MatchValue(value=document_id),
                )
            ]
        )
        operations = [
            DeleteOperation(delete=FilterSelector(filter=document_filter))
        ]
        if records:
            operations.append(
                UpsertOperation(
                    upsert=PointsList(
                        points=[
                            PointStruct(
                                id=str(uuid5(NAMESPACE_URL, record.chunk.id)),
                                vector=list(record.vector),
                                payload=record.chunk.to_dict(),
                            )
                            for record in records
                        ]
                    )
                )
            )
        self._client.batch_update_points(
            collection_name=self._collection,
            update_operations=operations,
            wait=True,
        )

    def search(
        self,
        query_vector: Sequence[float],
        *,
        day: str | None = None,
        document_id: str | None = None,
        limit: int = 5,
    ) -> list[RetrievedSlide]:
        if not self._collection_exists():
            return []
        self._ensure_collection_dimension(len(query_vector))

        from qdrant_client.models import FieldCondition, Filter, MatchValue

        conditions = []
        if day is not None:
            conditions.append(FieldCondition(key="day", match=MatchValue(value=day)))
        if document_id is not None:
            conditions.append(
                FieldCondition(
                    key="document_id",
                    match=MatchValue(value=document_id),
                )
            )
        response = self._client.query_points(
            collection_name=self._collection,
            query=list(query_vector),
            query_filter=Filter(must=conditions) if conditions else None,
            limit=limit,
            with_payload=True,
        )
        return [
            RetrievedSlide(
                chunk=SlideChunk.from_dict(dict(point.payload or {})),
                score=float(point.score),
            )
            for point in response.points
        ]

    def _collection_exists(self) -> bool:
        return self._collection in {
            collection.name
            for collection in self._client.get_collections().collections
        }

    def _ensure_collection_dimension(self, dimension: int) -> None:
        if dimension <= 0:
            raise ValueError("vector dimension must be greater than zero")
        if not self._collection_exists():
            from qdrant_client.models import Distance, VectorParams

            self._client.create_collection(
                collection_name=self._collection,
                vectors_config=VectorParams(size=dimension, distance=Distance.COSINE),
            )
            return
        info = self._client.get_collection(self._collection)
        existing_dimension = info.config.params.vectors.size
        if existing_dimension != dimension:
            raise ValueError(
                "Qdrant collection dimension mismatch: "
                f"existing dimension {existing_dimension}, prepared dimension {dimension}"
            )


class Neo4jGraphStore:
    def __init__(self, settings: RagSettings):
        if not settings.neo4j_uri:
            raise RuntimeError("NEO4J_URI is required when RAG_GRAPH_STORE=neo4j")
        from neo4j import GraphDatabase

        self._driver = GraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_username, settings.neo4j_password),
        )

    def replace_document(
        self, document_id: str, chunks: Sequence[SlideChunk]
    ) -> None:
        rows = [chunk.to_dict() | {"id": chunk.id} for chunk in chunks]
        query = """
        OPTIONAL MATCH (old:Slide {document_id: $document_id})
        DETACH DELETE old
        WITH $slides AS slide_rows
        UNWIND slide_rows AS data
        CREATE (slide:Slide {
            id: data.id, document_id: data.document_id, day: data.day,
            version: data.version, slide_number: data.slide_number,
            title: data.title, content: data.content
        })
        FOREACH (concept_name IN data.concepts |
            MERGE (concept:Concept {name: concept_name})
            MERGE (slide)-[mentions:MENTIONS]->(concept)
            SET mentions.day = data.day, mentions.version = data.version
        )
        """
        with self._driver.session() as session:
            session.run(query, document_id=document_id, slides=rows).consume()

    def expand_from_slides(
        self,
        slide_ids: Sequence[str],
        *,
        day: str | None = None,
        document_id: str | None = None,
    ) -> list[GraphConcept]:
        query = """
        MATCH (slide:Slide)-[:MENTIONS]->(concept:Concept)
        WHERE slide.id IN $slide_ids
          AND ($day IS NULL OR slide.day = $day)
          AND ($document_id IS NULL OR slide.document_id = $document_id)
        RETURN concept.name AS name, collect(DISTINCT slide.id) AS slide_ids
        ORDER BY name
        """
        with self._driver.session() as session:
            result = session.run(
                query,
                slide_ids=list(slide_ids),
                day=day,
                document_id=document_id,
            )
            return [
                GraphConcept(record["name"], tuple(sorted(record["slide_ids"])))
                for record in result
            ]

    def close(self) -> None:
        self._driver.close()


def _cosine_similarity(
    first: Sequence[float],
    second: Sequence[float],
) -> float:
    if len(first) != len(second):
        raise ValueError(
            f"vector dimension mismatch: query {len(first)}, stored {len(second)}"
        )
    first_norm = math.sqrt(sum(value * value for value in first))
    second_norm = math.sqrt(sum(value * value for value in second))
    if first_norm == 0 or second_norm == 0:
        return 0.0
    return sum(left * right for left, right in zip(first, second)) / (
        first_norm * second_norm
    )

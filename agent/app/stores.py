from typing import Protocol, Sequence
from uuid import NAMESPACE_URL, uuid5

from .domain import SlideChunk
from .settings import RagSettings


class VectorStore(Protocol):
    def upsert(self, chunk: SlideChunk, vector: Sequence[float]) -> None: ...


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

    def upsert(self, chunk: SlideChunk, vector: Sequence[float]) -> None:
        from qdrant_client.models import PointStruct

        self._client.upsert(
            collection_name=self._collection,
            points=[
                PointStruct(
                    id=str(uuid5(NAMESPACE_URL, chunk.id)),
                    vector=list(vector),
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

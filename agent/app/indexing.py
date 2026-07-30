from dataclasses import dataclass
from typing import Sequence

from .domain import SlideInput
from .providers import EmbeddingProvider
from .retrieval import build_slide_chunks
from .stores import GraphStore, VectorStore


@dataclass(frozen=True)
class IndexResult:
    indexed_chunks: int
    concepts: tuple[str, ...]


class RagIndexer:
    def __init__(
        self,
        embedding_provider: EmbeddingProvider,
        vector_store: VectorStore,
        graph_store: GraphStore,
    ) -> None:
        self._embedding_provider = embedding_provider
        self._vector_store = vector_store
        self._graph_store = graph_store

    def index(
        self,
        document_id: str,
        day: str,
        version: str,
        slides: Sequence[SlideInput],
    ) -> IndexResult:
        chunks = build_slide_chunks(document_id, day, version, slides)
        concepts: set[str] = set()
        for chunk in chunks:
            vector = self._embedding_provider.embed(chunk.content)
            self._vector_store.upsert(chunk, vector)
            self._graph_store.upsert_slide(chunk)
            concepts.update(chunk.concepts)
        return IndexResult(len(chunks), tuple(sorted(concepts)))

from dataclasses import dataclass
from typing import Sequence

from .domain import SlideChunk, SlideInput
from .providers import ConceptExtractor, DeterministicConceptExtractor, EmbeddingProvider
from .retrieval import build_slide_chunks
from .stores import GraphStore, VectorRecord, VectorStore


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
        concept_extractor: ConceptExtractor | None = None,
    ) -> None:
        self._embedding_provider = embedding_provider
        self._vector_store = vector_store
        self._graph_store = graph_store
        self._concept_extractor = concept_extractor or DeterministicConceptExtractor()

    def index(
        self,
        slides: Sequence[SlideInput],
    ) -> IndexResult:
        if not slides:
            return IndexResult(0, ())
        document_id = slides[0].document_id
        if any(slide.document_id != document_id for slide in slides):
            raise ValueError("one index operation must contain exactly one document_id")

        chunks: list[SlideChunk] = []
        records: list[VectorRecord] = []
        concepts: set[str] = set()
        for slide in slides:
            selected_concepts = (
                list(slide.concepts)
                if slide.concepts
                else list(self._concept_extractor.extract(slide))
            )
            prepared_slide = SlideInput(
                document_id=slide.document_id,
                version=slide.version,
                day=slide.day,
                slide_number=slide.slide_number,
                title=slide.title,
                content=slide.content,
                concepts=selected_concepts,
            )
            chunk = build_slide_chunks([prepared_slide])[0]
            vector = self._embedding_provider.embed(f"{chunk.title}\n\n{chunk.content}")
            chunks.append(chunk)
            records.append(VectorRecord(chunk, vector))
            concepts.update(chunk.concepts)

        self._vector_store.replace_document(document_id, records)
        self._graph_store.replace_document(document_id, chunks)
        return IndexResult(len(chunks), tuple(sorted(concepts)))

import re
from collections.abc import Iterable

from .domain import RetrievalResult, RetrievedSlide, SlideChunk, SlideInput
from .providers import EmbeddingProvider
from .stores import GraphStore, VectorStore


def build_slide_chunks(
    slides: Iterable[SlideInput],
) -> list[SlideChunk]:
    return [
        SlideChunk(
            document_id=slide.document_id,
            day=slide.day,
            version=slide.version,
            slide_number=slide.slide_number,
            title=slide.title,
            content=slide.content,
            concepts=slide.concepts,
        )
        for slide in slides
    ]


def rank_chunks(
    question: str,
    chunks: Iterable[SlideChunk],
    day: str | None = None,
    limit: int = 5,
) -> list[RetrievedSlide]:
    question_tokens = _tokens(question)
    ranked = [
        RetrievedSlide(chunk=chunk, score=len(question_tokens & _chunk_tokens(chunk)))
        for chunk in chunks
        if day is None or chunk.day == day
    ]
    ranked.sort(key=lambda result: (-result.score, result.chunk.slide_number))
    return ranked[:limit]


class HybridRetriever:
    def __init__(
        self,
        embedding_provider: EmbeddingProvider,
        vector_store: VectorStore,
        graph_store: GraphStore,
    ) -> None:
        self._embedding_provider = embedding_provider
        self._vector_store = vector_store
        self._graph_store = graph_store

    def retrieve(
        self,
        question: str,
        *,
        day: str | None = None,
        document_id: str | None = None,
        limit: int = 5,
    ) -> RetrievalResult:
        query_vector = self._embedding_provider.embed(question)
        slides = self._vector_store.search(
            query_vector,
            day=day,
            document_id=document_id,
            limit=limit,
        )
        concepts = self._graph_store.expand_from_slides(
            [hit.chunk.id for hit in slides],
            day=day,
            document_id=document_id,
        )
        return RetrievalResult(tuple(slides), tuple(concepts))


def _chunk_tokens(chunk: SlideChunk) -> set[str]:
    return _tokens(" ".join([chunk.content, *chunk.concepts]))


def _tokens(text: str) -> set[str]:
    return set(re.findall(r"\w+", text.casefold()))

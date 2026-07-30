import re
from collections.abc import Iterable

from .domain import RetrievedSlide, SlideChunk, SlideInput


def build_slide_chunks(
    document_id: str,
    day: str,
    version: str,
    slides: Iterable[SlideInput],
) -> list[SlideChunk]:
    return [
        SlideChunk(
            document_id=document_id,
            day=day,
            version=version,
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


def _chunk_tokens(chunk: SlideChunk) -> set[str]:
    return _tokens(" ".join([chunk.content, *chunk.concepts]))


def _tokens(text: str) -> set[str]:
    return set(re.findall(r"\w+", text.casefold()))

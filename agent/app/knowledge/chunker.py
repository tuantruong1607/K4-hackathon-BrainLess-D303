"""Compatibility adapter: one source slide is always one vector chunk."""

from app.domain import SlideChunk as Chunk
from app.domain import SlideInput
from app.retrieval import build_slide_chunks


def split_slide(slide: SlideInput) -> list[Chunk]:
    return build_slide_chunks([slide])


def split_slides(slides: list[SlideInput]) -> list[Chunk]:
    return build_slide_chunks(slides)

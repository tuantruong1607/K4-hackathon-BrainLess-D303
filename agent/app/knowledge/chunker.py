"""Compatibility adapter: one source slide is always one vector chunk."""

from app.domain import SlideChunk as Chunk
from app.domain import SlideInput
from app.retrieval import build_slide_chunks


def split_slide(slide: SlideInput) -> list[Chunk]:
    return build_slide_chunks([slide])


def split_slides(slides: list[SlideInput]) -> list[Chunk]:
    return build_slide_chunks(slides)


def _split_text(text: str, chunk_size: int, chunk_overlap: int) -> list[str]:
    """Deprecated compatibility helper; slide boundaries, not length, define chunks."""
    if chunk_size <= 0:
        raise ValueError("chunk_size must be greater than zero")
    if not 0 <= chunk_overlap < chunk_size:
        raise ValueError(
            "chunk_overlap must be greater than or equal to zero and less than chunk_size"
        )
    return [text] if text else []

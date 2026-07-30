from dataclasses import dataclass

from app.config import settings
from app.knowledge.loader import Slide


@dataclass
class Chunk:
    text: str
    source: str
    day: str
    chunk_index: int


def _split_text(text: str, chunk_size: int, chunk_overlap: int) -> list[str]:
    """Split text near natural boundaries without an additional LangChain package."""
    if chunk_size <= 0:
        raise ValueError("chunk_size must be greater than zero")
    if not 0 <= chunk_overlap < chunk_size:
        raise ValueError(
            "chunk_overlap must be greater than or equal to zero and less than chunk_size"
        )
    if not text:
        return []

    chunks: list[str] = []
    start = 0
    separators = ("\n\n", "\n", ". ", " ")
    while start < len(text):
        end = min(start + chunk_size, len(text))
        if end == len(text):
            chunks.append(text[start:end])
            break

        boundary = end
        for separator in separators:
            candidate = text.rfind(separator, start + 1, end + 1)
            if candidate != -1:
                boundary = candidate + len(separator)
                break

        chunks.append(text[start:boundary])
        start = max(boundary - chunk_overlap, start + 1)

    return chunks


def split_slide(slide: Slide) -> list[Chunk]:
    return [
        Chunk(text=text, source=slide.source, day=slide.day, chunk_index=index)
        for index, text in enumerate(
            _split_text(slide.text, settings.chunk_size, settings.chunk_overlap)
        )
    ]


def split_slides(slides: list[Slide]) -> list[Chunk]:
    chunks: list[Chunk] = []
    for slide in slides:
        chunks.extend(split_slide(slide))
    return chunks

from dataclasses import dataclass

from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.config import settings
from app.knowledge.loader import Slide


@dataclass
class Chunk:
    text: str
    source: str
    day: str
    chunk_index: int


def split_slide(slide: Slide) -> list[Chunk]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    return [
        Chunk(text=text, source=slide.source, day=slide.day, chunk_index=index)
        for index, text in enumerate(splitter.split_text(slide.text))
    ]


def split_slides(slides: list[Slide]) -> list[Chunk]:
    chunks: list[Chunk] = []
    for slide in slides:
        chunks.extend(split_slide(slide))
    return chunks

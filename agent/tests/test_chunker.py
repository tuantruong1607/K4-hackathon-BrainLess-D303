from app.knowledge.chunker import split_slide, split_slides
from app.knowledge.loader import Slide


def test_split_slide_preserves_source_and_day() -> None:
    slide = Slide("d1.pdf", "v1", "day01", 1, "Slide", "short text")

    chunks = split_slide(slide)

    assert len(chunks) == 1
    assert chunks[0].document_id == "d1.pdf"
    assert chunks[0].day == "day01"
    assert chunks[0].chunk_index == 0


def test_split_slide_keeps_long_source_slide_as_one_chunk() -> None:
    slide = Slide("long.pdf", "v1", "day02", 1, "Long", "Cau vi du ngan. " * 300)

    chunks = split_slide(slide)

    assert len(chunks) == 1
    assert chunks[0].content == slide.content


def test_split_slides_handles_empty_list() -> None:
    assert split_slides([]) == []

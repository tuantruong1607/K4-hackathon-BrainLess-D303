from app.knowledge.chunker import split_slide, split_slides
from app.knowledge.loader import Slide


def test_split_slide_preserves_source_and_day() -> None:
    slide = Slide(text="short text", source="d1.pdf", day="day01")

    chunks = split_slide(slide)

    assert len(chunks) == 1
    assert chunks[0].source == "d1.pdf"
    assert chunks[0].day == "day01"
    assert chunks[0].chunk_index == 0


def test_split_slide_splits_long_text_into_multiple_chunks() -> None:
    slide = Slide(text="Cau vi du ngan. " * 300, source="long.pdf", day="day02")

    chunks = split_slide(slide)

    assert len(chunks) > 1
    assert [chunk.chunk_index for chunk in chunks] == list(range(len(chunks)))


def test_split_slides_handles_empty_list() -> None:
    assert split_slides([]) == []

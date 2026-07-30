import pytest

from app.knowledge.chunker import _split_text, split_slide, split_slides
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


@pytest.mark.parametrize("chunk_size", [0, -1])
def test_split_text_rejects_nonpositive_chunk_size(chunk_size: int) -> None:
    with pytest.raises(ValueError, match="chunk_size must be greater than zero"):
        _split_text("content", chunk_size, 0)


@pytest.mark.parametrize("chunk_overlap", [-1, 5, 6])
def test_split_text_rejects_overlap_outside_chunk_bounds(chunk_overlap: int) -> None:
    with pytest.raises(
        ValueError,
        match="chunk_overlap must be greater than or equal to zero and less than chunk_size",
    ):
        _split_text("content", 5, chunk_overlap)


def test_split_slides_handles_empty_list() -> None:
    assert split_slides([]) == []

import pytest

from app.knowledge.chunker import _split_text, split_slide, split_slides
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

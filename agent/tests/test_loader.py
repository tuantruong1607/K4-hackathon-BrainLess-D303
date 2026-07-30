from pathlib import Path

from app.knowledge.loader import load_directory, load_file


def test_load_file_infers_day_from_filename(tmp_path: Path) -> None:
    file_path = tmp_path / "d1-slide-hackathon.md"
    file_path.write_text("Some lesson content.", encoding="utf-8")

    slide = load_file(file_path)

    assert slide is not None
    assert slide.source == "d1-slide-hackathon.md"
    assert slide.day == "day01"


def test_load_file_unknown_day_for_unrecognized_name(tmp_path: Path) -> None:
    file_path = tmp_path / "random-notes.md"
    file_path.write_text("content", encoding="utf-8")

    slide = load_file(file_path)

    assert slide is not None
    assert slide.day == "unknown"


def test_load_file_skips_unsupported_extension(tmp_path: Path) -> None:
    file_path = tmp_path / "notes.xyz"
    file_path.write_text("irrelevant", encoding="utf-8")

    assert load_file(file_path) is None


def test_load_file_skips_empty_content(tmp_path: Path) -> None:
    file_path = tmp_path / "empty.txt"
    file_path.write_text("   \n  ", encoding="utf-8")

    assert load_file(file_path) is None


def test_load_directory_collects_all_supported_files(tmp_path: Path) -> None:
    (tmp_path / "d1-a.txt").write_text("content a", encoding="utf-8")
    (tmp_path / "d2-b.md").write_text("content b", encoding="utf-8")
    (tmp_path / "ignored.bin").write_text("binary-ish", encoding="utf-8")

    slides = load_directory(tmp_path)

    sources = {slide.source for slide in slides}
    assert sources == {"d1-a.txt", "d2-b.md"}


def test_load_directory_returns_empty_list_for_missing_dir(tmp_path: Path) -> None:
    assert load_directory(tmp_path / "does-not-exist") == []

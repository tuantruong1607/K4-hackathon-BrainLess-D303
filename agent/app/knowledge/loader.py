from pathlib import Path

from docx import Document as DocxDocument
from pypdf import PdfReader

TEXT_SUFFIXES = {".txt", ".md"}
SUPPORTED_SUFFIXES = TEXT_SUFFIXES | {".pdf", ".docx"}


class Slide:
    def __init__(self, text: str, source: str, day: str):
        self.text = text
        self.source = source
        self.day = day


def _load_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def _load_pdf(path: Path) -> str:
    reader = PdfReader(str(path))
    return "\n\n".join(page.extract_text() or "" for page in reader.pages)


def _load_docx(path: Path) -> str:
    doc = DocxDocument(str(path))
    return "\n".join(paragraph.text for paragraph in doc.paragraphs)


def _infer_day(filename: str) -> str:
    stem = filename.lower()
    if stem.startswith("d1") or "day01" in stem or "day-1" in stem:
        return "day01"
    if stem.startswith("d2") or "day02" in stem or "day-2" in stem:
        return "day02"
    if stem.startswith("d3") or "day03" in stem or "day-3" in stem:
        return "day03"
    return "unknown"


def load_file(path: Path) -> Slide | None:
    suffix = path.suffix.lower()
    if suffix in TEXT_SUFFIXES:
        content = _load_text(path)
    elif suffix == ".pdf":
        content = _load_pdf(path)
    elif suffix == ".docx":
        content = _load_docx(path)
    else:
        return None

    content = content.strip()
    if not content:
        return None

    return Slide(text=content, source=path.name, day=_infer_day(path.name))


def load_directory(data_dir: Path) -> list[Slide]:
    slides: list[Slide] = []
    if not data_dir.exists():
        return slides

    for path in sorted(data_dir.rglob("*")):
        if not path.is_file() or path.suffix.lower() not in SUPPORTED_SUFFIXES:
            continue
        slide = load_file(path)
        if slide is not None:
            slides.append(slide)

    return slides

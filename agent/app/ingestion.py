from pathlib import Path

from docx import Document as DocxDocument
from pypdf import PdfReader

from .domain import SlideInput

TEXT_SUFFIXES = {".txt", ".md"}
SUPPORTED_SUFFIXES = TEXT_SUFFIXES | {".pdf", ".docx"}


def infer_day(filename: str) -> str:
    stem = filename.casefold()
    for number in range(1, 100):
        if (
            stem.startswith(f"d{number}")
            or f"day{number:02d}" in stem
            or f"day-{number}" in stem
        ):
            return f"day{number:02d}"
    return "unknown"


def load_file(
    path: Path,
    *,
    document_id: str | None = None,
    version: str = "v1",
    day: str | None = None,
) -> list[SlideInput]:
    suffix = path.suffix.casefold()
    if suffix not in SUPPORTED_SUFFIXES:
        return []

    resolved_document_id = document_id or path.stem
    resolved_day = day or infer_day(path.name)
    if suffix == ".pdf":
        reader = PdfReader(str(path))
        return [
            SlideInput(
                document_id=resolved_document_id,
                version=version,
                day=resolved_day,
                slide_number=page_number,
                title=f"{path.stem} — page {page_number}",
                content=(page.extract_text() or "").strip(),
            )
            for page_number, page in enumerate(reader.pages, start=1)
        ]

    if suffix in TEXT_SUFFIXES:
        content = path.read_text(encoding="utf-8").strip()
    else:
        document = DocxDocument(str(path))
        content = "\n".join(paragraph.text for paragraph in document.paragraphs).strip()

    return [
        SlideInput(
            document_id=resolved_document_id,
            version=version,
            day=resolved_day,
            slide_number=1,
            title=path.stem,
            content=content,
        )
    ]


def load_directory(
    data_dir: Path,
    *,
    version: str = "v1",
) -> list[SlideInput]:
    if not data_dir.exists():
        return []
    slides: list[SlideInput] = []
    for path in sorted(data_dir.rglob("*")):
        if path.is_file() and path.suffix.casefold() in SUPPORTED_SUFFIXES:
            slides.extend(load_file(path, version=version))
    return slides

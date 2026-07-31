from pathlib import Path

from pypdf import PdfWriter

from app.graph.nodes import graph_builder


def test_build_all_batches_all_pdf_pages_before_replacing_document(
    tmp_path: Path,
    monkeypatch,
) -> None:
    pdf_path = tmp_path / "d1-course.pdf"
    writer = PdfWriter()
    for _ in range(3):
        writer.add_blank_page(width=100, height=100)
    with pdf_path.open("wb") as file:
        writer.write(file)

    indexed_batches = []

    def record_upsert(chunks):
        indexed_batches.append(chunks)
        return len(chunks)

    monkeypatch.setattr(graph_builder, "upsert_chunks", record_upsert)
    monkeypatch.setattr(graph_builder, "extract_concepts", lambda content: [])
    monkeypatch.setattr(graph_builder, "store_concepts", lambda concepts, day: None)

    results = graph_builder.build_all(tmp_path)

    assert len(indexed_batches) == 1
    assert [chunk.slide_number for chunk in indexed_batches[0]] == [1, 2, 3]
    assert results == [
        {
            "source": "d1-course",
            "day": "day01",
            "chunks_indexed": 3,
            "concepts_extracted": 0,
        }
    ]

from pathlib import Path
from types import SimpleNamespace

import pytest
from pypdf import PdfWriter

from agent.app.domain import SlideChunk, SlideInput
from agent.app.indexing import RagIndexer
from agent.app.ingestion import load_file
from agent.app.providers import DeterministicConceptExtractor
from agent.app.retrieval import HybridRetriever, build_slide_chunks
from agent.app.stores import (
    MemoryGraphStore,
    MemoryVectorStore,
    QdrantVectorStore,
    VectorRecord,
)


class RecordingEmbeddingProvider:
    def __init__(self, vectors: list[list[float]] | None = None) -> None:
        self.texts: list[str] = []
        self._vectors = iter(vectors or [])

    def embed(self, text: str) -> list[float]:
        self.texts.append(text)
        return next(self._vectors, [1.0, 0.0])


class RecordingConceptExtractor:
    def __init__(self) -> None:
        self.slides: list[SlideInput] = []

    def extract(self, slide: SlideInput) -> list[str]:
        self.slides.append(slide)
        return ["Derived"]


def slide(
    *,
    document_id: str = "deck",
    version: str = "v1",
    day: str = "day01",
    slide_number: int = 1,
    title: str = "Title",
    content: str = "Content",
    concepts: list[str] | None = None,
) -> SlideInput:
    return SlideInput(
        document_id=document_id,
        version=version,
        day=day,
        slide_number=slide_number,
        title=title,
        content=content,
        concepts=[] if concepts is None else concepts,
    )


def test_pdf_loader_maps_each_page_to_one_canonical_slide(tmp_path: Path) -> None:
    pdf_path = tmp_path / "d1-course.pdf"
    writer = PdfWriter()
    for _ in range(3):
        writer.add_blank_page(width=100, height=100)
    with pdf_path.open("wb") as file:
        writer.write(file)

    slides = load_file(pdf_path, document_id="course", version="v7", day="day01")

    assert [item.slide_number for item in slides] == [1, 2, 3]
    assert {(item.document_id, item.version, item.day) for item in slides} == {
        ("course", "v7", "day01")
    }


def test_long_slide_stays_one_vector_record_and_embeds_title_plus_content() -> None:
    embeddings = RecordingEmbeddingProvider([[1.0, 0.0]])
    vectors = MemoryVectorStore()
    indexer = RagIndexer(
        embeddings,
        vectors,
        MemoryGraphStore(),
        DeterministicConceptExtractor(),
    )
    source = slide(title="Long title", content="word " * 20_000, concepts=["Known"])

    result = indexer.index([source])

    assert result.indexed_chunks == 1
    assert vectors.count == 1
    assert embeddings.texts == [f"{source.title}\n\n{source.content}"]
    assert next(iter(vectors.chunks.values())).id == "deck:v1:1"


def test_supplied_concepts_are_preserved_and_only_empty_concepts_are_extracted() -> None:
    extractor = RecordingConceptExtractor()
    vectors = MemoryVectorStore()
    indexer = RagIndexer(
        RecordingEmbeddingProvider([[1.0], [1.0]]),
        vectors,
        MemoryGraphStore(),
        extractor,
    )
    supplied = slide(slide_number=1, concepts=["Supplied", "Supplied"])
    missing = slide(slide_number=2, concepts=[])

    indexer.index([supplied, missing])

    assert vectors.chunks["deck:v1:1"].concepts == ["Supplied", "Supplied"]
    assert vectors.chunks["deck:v1:2"].concepts == ["Derived"]
    assert extractor.slides == [missing]


def test_reindex_replaces_old_document_records_after_all_preparation_succeeds() -> None:
    vectors = MemoryVectorStore()
    graphs = MemoryGraphStore()
    indexer = RagIndexer(
        RecordingEmbeddingProvider([[1.0], [1.0], [1.0]]),
        vectors,
        graphs,
        DeterministicConceptExtractor(),
    )
    indexer.index(
        [
            slide(version="v1", slide_number=1, concepts=["Old"]),
            slide(version="v1", slide_number=2, concepts=["Old"]),
        ]
    )

    indexer.index([slide(version="v2", slide_number=8, concepts=["New"])])

    assert set(vectors.chunks) == {"deck:v2:8"}
    assert set(graphs.slides) == {"deck:v2:8"}
    assert graphs.concepts == {"New"}


def test_preparation_failure_leaves_previous_document_active() -> None:
    class FailingEmbeddingProvider:
        def __init__(self) -> None:
            self.calls = 0

        def embed(self, text: str) -> list[float]:
            self.calls += 1
            if self.calls == 2:
                raise RuntimeError("embedding failed")
            return [1.0]

    vectors = MemoryVectorStore()
    graphs = MemoryGraphStore()
    RagIndexer(
        RecordingEmbeddingProvider([[1.0]]),
        vectors,
        graphs,
        DeterministicConceptExtractor(),
    ).index([slide(version="v1", concepts=["Old"])])

    with pytest.raises(RuntimeError, match="embedding failed"):
        RagIndexer(
            FailingEmbeddingProvider(),
            vectors,
            graphs,
            DeterministicConceptExtractor(),
        ).index(
            [
                slide(version="v2", slide_number=1, concepts=["New"]),
                slide(version="v2", slide_number=2, concepts=["New"]),
            ]
        )

    assert set(vectors.chunks) == {"deck:v1:1"}
    assert set(graphs.slides) == {"deck:v1:1"}


def test_memory_search_filters_day_and_document_and_returns_score_and_full_citation() -> None:
    store = MemoryVectorStore()
    chunks = [
        build_slide_chunks([slide(document_id="a", day="day01", title="A")])[0],
        build_slide_chunks(
            [slide(document_id="a", day="day02", slide_number=2, title="B")]
        )[0],
        build_slide_chunks([slide(document_id="b", day="day01", title="C")])[0],
    ]
    store.replace_document("a", [VectorRecord(chunks[0], [1.0, 0.0]), VectorRecord(chunks[1], [0.8, 0.2])])
    store.replace_document("b", [VectorRecord(chunks[2], [0.9, 0.1])])

    results = store.search([1.0, 0.0], day="day01", document_id="a", limit=5)

    assert len(results) == 1
    assert results[0].score == pytest.approx(1.0)
    assert results[0].citation == {
        "document_id": "a",
        "version": "v1",
        "day": "day01",
        "slide_number": 1,
        "title": "A",
    }


def test_concept_shared_across_days_keeps_both_slide_mentions_without_day_on_concept() -> None:
    graph = MemoryGraphStore()
    day_one = build_slide_chunks(
        [slide(document_id="a", day="day01", concepts=["JTBD"])]
    )[0]
    day_two = build_slide_chunks(
        [slide(document_id="b", day="day02", concepts=["JTBD"])]
    )[0]

    graph.replace_document("a", [day_one])
    graph.replace_document("b", [day_two])

    assert graph.concepts == {"JTBD"}
    assert graph.mentions["JTBD"] == {"a:v1:1", "b:v1:1"}
    assert not hasattr(graph.concept_nodes["JTBD"], "day")


def test_hybrid_retrieval_expands_graph_only_from_vector_hit_slides() -> None:
    vectors = MemoryVectorStore()
    graph = MemoryGraphStore()
    first, second = build_slide_chunks(
        [
            slide(slide_number=1, concepts=["HitConcept"]),
            slide(slide_number=2, concepts=["MissConcept"]),
        ]
    )
    vectors.replace_document(
        "deck",
        [VectorRecord(first, [1.0, 0.0]), VectorRecord(second, [0.0, 1.0])],
    )
    graph.replace_document("deck", [first, second])
    retriever = HybridRetriever(
        RecordingEmbeddingProvider([[1.0, 0.0]]),
        vectors,
        graph,
    )

    result = retriever.retrieve("question", limit=1)

    assert [hit.chunk.id for hit in result.slides] == ["deck:v1:1"]
    assert [concept.name for concept in result.concepts] == ["HitConcept"]


def test_qdrant_rejects_existing_collection_dimension_mismatch() -> None:
    client = SimpleNamespace(
        get_collections=lambda: SimpleNamespace(
            collections=[SimpleNamespace(name="slides")]
        ),
        get_collection=lambda name: SimpleNamespace(
            config=SimpleNamespace(
                params=SimpleNamespace(vectors=SimpleNamespace(size=3))
            )
        ),
    )
    store = QdrantVectorStore.__new__(QdrantVectorStore)
    store._client = client
    store._collection = "slides"
    chunk = SlideChunk(**vars(slide(concepts=["Known"])))

    with pytest.raises(ValueError, match=r"dimension.*3.*2"):
        store.replace_document("deck", [VectorRecord(chunk, [1.0, 0.0])])

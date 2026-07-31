from pydantic import BaseModel, Field

from app.knowledge import neo4j_client
from app.knowledge.chunker import split_slides
from app.knowledge.loader import Slide, load_directory
from app.knowledge.vector_store import upsert_chunks
from app.llm import get_chat_model

EXTRACTION_PROMPT = """Bạn đang xây Knowledge Graph cho một bài giảng. Đọc nội dung slide dưới đây
và trích ra các khái niệm (concept) chính cùng quan hệ cha-con giữa chúng.

Ví dụ định dạng mong muốn (chủ đề JTBD):
- JTBD (không có parent)
  - Outcome (parent: JTBD)
  - Push (parent: JTBD)
  - Pull (parent: JTBD)

Chỉ trích khái niệm THỰC SỰ xuất hiện trong nội dung, không bịa thêm. Nếu một khái niệm
là ý chính bao trùm, để parent = null. Tối đa 12 khái niệm.

Nội dung slide:
{content}
"""


class ConceptNode(BaseModel):
    name: str = Field(description="Tên khái niệm, ngắn gọn")
    description: str = Field(description="Mô tả 1 câu")
    parent: str | None = Field(default=None, description="Tên khái niệm cha, hoặc null nếu là gốc")


class ConceptExtraction(BaseModel):
    concepts: list[ConceptNode]


def extract_concepts(content: str) -> list[ConceptNode]:
    model = get_chat_model().with_structured_output(ConceptExtraction)
    result: ConceptExtraction = model.invoke(EXTRACTION_PROMPT.format(content=content))
    return result.concepts


def store_concepts(concepts: list[ConceptNode], day: str) -> None:
    for concept in concepts:
        neo4j_client.upsert_node(concept.name, concept.description, day=day)
    for concept in concepts:
        if concept.parent:
            neo4j_client.upsert_relationship(concept.parent, concept.name)


def build_from_slide(slide: Slide) -> dict:
    return build_from_slides([slide])


def build_from_slides(slides: list[Slide]) -> dict:
    if not slides:
        raise ValueError("build_from_slides requires at least one slide")
    chunks = split_slides(slides)
    chunk_count = upsert_chunks(chunks)

    concept_count = 0
    for slide in slides:
        concepts = extract_concepts(slide.text)
        store_concepts(concepts, slide.day)
        concept_count += len(concepts)

    return {
        "source": slides[0].source,
        "day": slides[0].day,
        "chunks_indexed": chunk_count,
        "concepts_extracted": concept_count,
    }


def build_all(data_dir) -> list[dict]:
    slides = load_directory(data_dir)
    documents: dict[tuple[str, str], list[Slide]] = {}
    for slide in slides:
        documents.setdefault((slide.document_id, slide.version), []).append(slide)
    return [build_from_slides(document) for document in documents.values()]

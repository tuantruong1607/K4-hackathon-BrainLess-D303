from pydantic import BaseModel, Field

from app.knowledge.neo4j_client import get_nodes_by_day
from app.knowledge.vector_store import get_chunks_by_day
from app.llm import get_chat_model

GENERATION_PROMPT = """Bạn là giảng viên đang soạn quiz trắc nghiệm cho học viên, độ khó "{difficulty}".
Dựa vào nội dung bài giảng và các khái niệm dưới đây, hãy tạo đúng {count} câu hỏi trắc nghiệm
4 đáp án (chỉ 1 đáp án đúng). Mỗi câu hỏi phải gắn với đúng 1 khái niệm (knowledge_node) có trong danh sách.

Khái niệm (Knowledge Graph):
{concepts}

Nội dung slide:
{slide_content}
"""


class GeneratedQuestion(BaseModel):
    question: str
    answers: list[str] = Field(description="Đúng 4 đáp án")
    correct_answer: str = Field(description="Nội dung đáp án đúng, phải khớp 1 trong 4 answers")
    explanation: str
    knowledge_node: str = Field(description="Tên khái niệm câu hỏi này gắn với")


class GeneratedQuizSet(BaseModel):
    questions: list[GeneratedQuestion]


def generate_questions(day: str, difficulty: str, count: int = 5) -> list[GeneratedQuestion]:
    concepts = get_nodes_by_day(day)
    chunks = get_chunks_by_day(day)

    concepts_text = (
        "\n".join(f"- {node['name']}: {node['description']}" for node in concepts)
        or "(chưa có khái niệm nào được xây dựng cho ngày này)"
    )
    slide_text = (
        "\n\n".join(chunk["text"] for chunk in chunks) or "(chưa có nội dung slide cho ngày này)"
    )

    model = get_chat_model().with_structured_output(GeneratedQuizSet)
    result: GeneratedQuizSet = model.invoke(
        GENERATION_PROMPT.format(
            difficulty=difficulty,
            count=count,
            concepts=concepts_text,
            slide_content=slide_text,
        )
    )
    return result.questions

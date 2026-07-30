from pydantic import BaseModel, Field, model_validator

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
    question: str = Field(min_length=1)
    answers: list[str] = Field(min_length=4, max_length=4, description="Đúng 4 đáp án")
    correct_answer: str = Field(
        min_length=1,
        description="Nội dung đáp án đúng, phải khớp 1 trong 4 answers",
    )
    explanation: str = Field(min_length=1)
    knowledge_node: str = Field(
        min_length=1,
        description="Tên khái niệm câu hỏi này gắn với",
    )

    @model_validator(mode="after")
    def validate_answers(self):
        normalized_answers = [answer.strip().casefold() for answer in self.answers]
        if any(not answer for answer in normalized_answers):
            raise ValueError("answers must not be empty")
        if len(set(normalized_answers)) != 4:
            raise ValueError("answers must contain 4 unique choices")
        if self.correct_answer.strip().casefold() not in normalized_answers:
            raise ValueError("correct_answer must match one of answers")
        return self


class GeneratedQuizSet(BaseModel):
    questions: list[GeneratedQuestion]


def generate_questions(day: str, difficulty: str, count: int = 5) -> list[GeneratedQuestion]:
    concepts = get_nodes_by_day(day)
    chunks = get_chunks_by_day(day)

    if not concepts:
        raise ValueError(f"Knowledge Graph has no concepts for {day}; build the graph first")
    if not chunks:
        raise ValueError(f"Vector store has no slide content for {day}; build the graph first")

    concepts_text = "\n".join(
        f"- {node['name']}: {node['description']}" for node in concepts
    )
    slide_text = "\n\n".join(chunk["text"] for chunk in chunks)

    model = get_chat_model().with_structured_output(GeneratedQuizSet)
    result: GeneratedQuizSet = model.invoke(
        GENERATION_PROMPT.format(
            difficulty=difficulty,
            count=count,
            concepts=concepts_text,
            slide_content=slide_text,
        )
    )
    if len(result.questions) != count:
        raise ValueError(
            f"LLM returned {len(result.questions)} questions; expected exactly {count}"
        )

    concept_names = {node["name"].strip().casefold() for node in concepts}
    unknown_nodes = [
        question.knowledge_node
        for question in result.questions
        if question.knowledge_node.strip().casefold() not in concept_names
    ]
    if unknown_nodes:
        raise ValueError(
            "LLM returned questions for unknown knowledge nodes: "
            + ", ".join(sorted(set(unknown_nodes)))
        )

    return result.questions

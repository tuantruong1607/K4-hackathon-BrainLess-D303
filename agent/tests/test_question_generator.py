import pytest
from pydantic import ValidationError

from app.graph.nodes import question_generator
from app.graph.nodes.question_generator import (
    GeneratedQuestion,
    GeneratedQuizSet,
    generate_questions,
)


def _question(knowledge_node: str = "JTBD") -> GeneratedQuestion:
    return GeneratedQuestion(
        question="JTBD là gì?",
        answers=["Jobs To Be Done", "Một KPI", "Một framework UI", "Một database"],
        correct_answer="Jobs To Be Done",
        explanation="JTBD mô tả công việc khách hàng cần hoàn thành.",
        knowledge_node=knowledge_node,
    )


def test_generated_question_requires_four_unique_answers() -> None:
    with pytest.raises(ValidationError):
        GeneratedQuestion(
            question="Câu hỏi",
            answers=["A", "A", "B", "C"],
            correct_answer="A",
            explanation="Giải thích",
            knowledge_node="JTBD",
        )


def test_generated_question_requires_correct_answer_in_choices() -> None:
    with pytest.raises(ValidationError):
        GeneratedQuestion(
            question="Câu hỏi",
            answers=["A", "B", "C", "D"],
            correct_answer="E",
            explanation="Giải thích",
            knowledge_node="JTBD",
        )


def test_generate_questions_requires_built_rag_context(monkeypatch) -> None:
    monkeypatch.setattr(question_generator, "get_nodes_by_day", lambda day: [])
    monkeypatch.setattr(question_generator, "get_chunks_by_day", lambda day: [])

    with pytest.raises(ValueError, match="build the graph first"):
        generate_questions("day01", "medium", 1)


def test_generate_questions_rejects_wrong_count(monkeypatch) -> None:
    class FakeModel:
        def with_structured_output(self, schema):
            return self

        def invoke(self, prompt):
            return GeneratedQuizSet(questions=[_question()])

    monkeypatch.setattr(
        question_generator,
        "get_nodes_by_day",
        lambda day: [{"name": "JTBD", "description": "Jobs To Be Done"}],
    )
    monkeypatch.setattr(
        question_generator,
        "get_chunks_by_day",
        lambda day: [{"text": "Nội dung JTBD"}],
    )
    monkeypatch.setattr(question_generator, "get_chat_model", FakeModel)

    with pytest.raises(ValueError, match="expected exactly 2"):
        generate_questions("day01", "medium", 2)


def test_generate_questions_rejects_unknown_knowledge_node(monkeypatch) -> None:
    class FakeModel:
        def with_structured_output(self, schema):
            return self

        def invoke(self, prompt):
            return GeneratedQuizSet(questions=[_question("Unknown")])

    monkeypatch.setattr(
        question_generator,
        "get_nodes_by_day",
        lambda day: [{"name": "JTBD", "description": "Jobs To Be Done"}],
    )
    monkeypatch.setattr(
        question_generator,
        "get_chunks_by_day",
        lambda day: [{"text": "Nội dung JTBD"}],
    )
    monkeypatch.setattr(question_generator, "get_chat_model", FakeModel)

    with pytest.raises(ValueError, match="unknown knowledge nodes"):
        generate_questions("day01", "medium", 1)

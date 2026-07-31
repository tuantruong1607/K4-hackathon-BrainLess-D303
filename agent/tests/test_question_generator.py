import pytest
from pydantic import ValidationError

from app.chat import GeneratedQuestion, validate_quiz_questions


def _question(knowledge_node: str = "JTBD") -> dict:
    return {
        "question": "JTBD là gì?",
        "answers": [
            "Jobs To Be Done",
            "Một KPI",
            "Một framework UI",
            "Một database",
        ],
        "correct_answer": "Jobs To Be Done",
        "explanation": "JTBD mô tả công việc khách hàng cần hoàn thành.",
        "knowledge_node": knowledge_node,
    }


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


def test_validate_quiz_questions_rejects_wrong_count() -> None:
    with pytest.raises(ValueError, match="expected exactly 2"):
        validate_quiz_questions(
            [_question()],
            expected_count=2,
            allowed_concepts=["JTBD"],
        )


def test_validate_quiz_questions_rejects_unknown_knowledge_node() -> None:
    with pytest.raises(ValueError, match="unknown knowledge nodes"):
        validate_quiz_questions(
            [_question("Unknown")],
            expected_count=1,
            allowed_concepts=["JTBD"],
        )


def test_validate_quiz_questions_returns_typed_payload() -> None:
    assert validate_quiz_questions(
        [_question("jtbd")],
        expected_count=1,
        allowed_concepts=["JTBD"],
    ) == [_question("jtbd")]

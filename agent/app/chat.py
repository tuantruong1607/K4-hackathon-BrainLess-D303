import json
from typing import Protocol

from .domain import RetrievalResult
from .graph.nodes.database_query import UserContext
from .graph.nodes.level_analyzer import Level
from .settings import Settings


class ChatProvider(Protocol):
    provider_name: str

    def answer(
        self,
        *,
        question: str,
        level: Level,
        user_context: UserContext,
        retrieval: RetrievalResult,
        current_day: str | None,
        current_slide: int | None,
    ) -> str: ...

    def generate_quiz(
        self,
        *,
        retrieval: RetrievalResult,
        day: str,
        difficulty: str,
        count: int,
    ) -> list[dict]: ...


class MockChatProvider:
    provider_name = "mock"

    def answer(
        self,
        *,
        question: str,
        level: Level,
        user_context: UserContext,
        retrieval: RetrievalResult,
        current_day: str | None,
        current_slide: int | None,
    ) -> str:
        source = retrieval.slides[0].chunk
        return (
            f"[{level}] Theo slide {source.slide_number} “{source.title}”: "
            f"{source.content}"
        )

    def generate_quiz(
        self,
        *,
        retrieval: RetrievalResult,
        day: str,
        difficulty: str,
        count: int,
    ) -> list[dict]:
        concept_names = [concept.name for concept in retrieval.concepts]
        if not concept_names:
            concept_names = list(retrieval.slides[0].chunk.concepts)
        if not concept_names:
            concept_names = [retrieval.slides[0].chunk.title]
        questions: list[dict] = []
        for index in range(count):
            concept = concept_names[index % len(concept_names)]
            source = retrieval.slides[index % len(retrieval.slides)].chunk
            correct = f"{concept}: {source.content}"
            questions.append(
                {
                    "question": f"Khái niệm nào được minh họa ở slide {source.slide_number}?",
                    "answers": [
                        correct,
                        "Không có trong bài giảng",
                        "Một khái niệm không liên quan",
                        "Không đủ dữ liệu",
                    ],
                    "correct_answer": correct,
                    "explanation": (
                        f"Đáp án bám theo nội dung slide {source.slide_number}."
                    ),
                    "knowledge_node": concept,
                }
            )
        return questions


class OpenAIChatProvider:
    provider_name = "openai"

    def __init__(self, settings: Settings) -> None:
        self._api_key = settings.openai_api_key.get_secret_value()
        self._model = settings.chat_model
        self._client = None

    def _responses(self, prompt: str) -> str:
        if self._client is None:
            from openai import OpenAI

            self._client = OpenAI(api_key=self._api_key)
        response = self._client.responses.create(model=self._model, input=prompt)
        return response.output_text

    def answer(
        self,
        *,
        question: str,
        level: Level,
        user_context: UserContext,
        retrieval: RetrievalResult,
        current_day: str | None,
        current_slide: int | None,
    ) -> str:
        sources = "\n\n".join(
            f"{hit.chunk.title}: {hit.chunk.content}" for hit in retrieval.slides
        )
        return self._responses(
            "Answer only from the supplied slide sources. "
            f"Adapt the explanation for a {level} learner.\n\n"
            f"Sources:\n{sources}\n\nQuestion: {question}"
        )

    def generate_quiz(
        self,
        *,
        retrieval: RetrievalResult,
        day: str,
        difficulty: str,
        count: int,
    ) -> list[dict]:
        sources = "\n\n".join(hit.chunk.content for hit in retrieval.slides)
        concepts = [concept.name for concept in retrieval.concepts]
        payload = self._responses(
            "Return JSON only as {\"questions\": [...]} with exactly "
            f"{count} four-choice questions grounded in these sources. "
            "Each object needs question, answers, correct_answer, explanation, "
            f"knowledge_node. Allowed knowledge_node values: {concepts}. "
            f"Difficulty: {difficulty}.\n\n{sources}"
        )
        value = json.loads(payload)
        questions = value.get("questions")
        if not isinstance(questions, list) or len(questions) != count:
            raise ValueError("OpenAI quiz response did not match the requested count")
        return questions

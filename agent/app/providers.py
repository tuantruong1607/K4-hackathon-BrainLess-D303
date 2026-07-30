import hashlib
import re
from typing import Protocol

from .domain import RetrievedSlide
from .settings import RagSettings


class EmbeddingProvider(Protocol):
    def embed(self, text: str) -> list[float]: ...


class MockEmbeddingProvider:
    _DIMENSIONS = 256

    def embed(self, text: str) -> list[float]:
        vector = [0.0] * self._DIMENSIONS
        tokens = re.findall(r"\w+", text.casefold()) or ["__empty__"]
        for token in tokens:
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            index = int.from_bytes(digest[:4], "big") % self._DIMENSIONS
            vector[index] += 1.0
        return vector


class OpenAIEmbeddingProvider:
    def __init__(self, settings: RagSettings):
        if not settings.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY is required when RAG_PROVIDER=openai")
        self._api_key = settings.openai_api_key
        self._model = settings.openai_embedding_model
        self._client = None

    def embed(self, text: str) -> list[float]:
        if self._client is None:
            from openai import OpenAI

            self._client = OpenAI(api_key=self._api_key)
        response = self._client.embeddings.create(model=self._model, input=text)
        return list(response.data[0].embedding)


class ChatProvider(Protocol):
    @property
    def name(self) -> str: ...

    def answer(self, question: str, sources: list[RetrievedSlide]) -> str: ...


class MockChatProvider:
    @property
    def name(self) -> str:
        return "mock"

    def answer(self, question: str, sources: list[RetrievedSlide]) -> str:
        if not sources:
            return "No relevant slide was found."
        top = sources[0].chunk
        return f"Slide {top.slide_number} — {top.title}: {top.content}"


class OpenAIChatProvider:
    def __init__(self, settings: RagSettings):
        if settings.provider != "openai" or not settings.openai_api_key:
            raise RuntimeError(
                "RAG_PROVIDER=openai and OPENAI_API_KEY are required for OpenAI chat"
            )
        self._api_key = settings.openai_api_key
        self._model = settings.openai_chat_model
        self._client = None

    @property
    def name(self) -> str:
        return "openai"

    def answer(self, question: str, sources: list[RetrievedSlide]) -> str:
        if self._client is None:
            from openai import OpenAI

            self._client = OpenAI(api_key=self._api_key)
        context = "\n\n".join(
            (
                f"Slide {source.chunk.slide_number} — {source.chunk.title}\n"
                f"{source.chunk.content}"
            )
            for source in sources
        )
        response = self._client.responses.create(
            model=self._model,
            input=[
                {
                    "role": "system",
                    "content": (
                        "Answer the question using only the supplied slide context. "
                        "Cite slide numbers in the answer."
                    ),
                },
                {
                    "role": "user",
                    "content": f"Question:\n{question}\n\nSlide context:\n{context}",
                },
            ],
        )
        return response.output_text

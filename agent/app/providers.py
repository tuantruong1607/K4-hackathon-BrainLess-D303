import hashlib
from typing import Protocol

from .settings import RagSettings


class EmbeddingProvider(Protocol):
    def embed(self, text: str) -> list[float]: ...


class MockEmbeddingProvider:
    def embed(self, text: str) -> list[float]:
        digest = hashlib.sha256(text.encode("utf-8")).digest()
        return [byte / 255 for byte in digest]


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

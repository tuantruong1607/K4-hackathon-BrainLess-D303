import hashlib
import json
import re
from typing import Protocol

from .domain import SlideInput
from .settings import RagSettings


class EmbeddingProvider(Protocol):
    def embed(self, text: str) -> list[float]: ...


class ConceptExtractor(Protocol):
    def extract(self, slide: SlideInput) -> list[str]: ...


class MockEmbeddingProvider:
    def embed(self, text: str) -> list[float]:
        digest = hashlib.sha256(text.encode("utf-8")).digest()
        return [byte / 255 for byte in digest]


class OpenAIEmbeddingProvider:
    def __init__(self, settings: RagSettings):
        self._api_key = settings.openai_api_key.get_secret_value()
        self._model = settings.embedding_model
        self._client = None

    def embed(self, text: str) -> list[float]:
        if self._client is None:
            from openai import OpenAI

            self._client = OpenAI(api_key=self._api_key)
        response = self._client.embeddings.create(model=self._model, input=text)
        return list(response.data[0].embedding)

    def close(self) -> None:
        client, self._client = self._client, None
        if client is not None and callable(getattr(client, "close", None)):
            client.close()


class DeterministicConceptExtractor:
    """Small offline extractor for tests and local development."""

    def extract(self, slide: SlideInput) -> list[str]:
        candidates = re.findall(r"[\w-]{3,}", f"{slide.title} {slide.content}", re.UNICODE)
        unique: list[str] = []
        seen: set[str] = set()
        for candidate in candidates:
            key = candidate.casefold()
            if key not in seen:
                seen.add(key)
                unique.append(candidate)
            if len(unique) == 8:
                break
        return unique


class OpenAIConceptExtractor:
    def __init__(self, settings: RagSettings):
        self._api_key = settings.openai_api_key.get_secret_value()
        self._model = settings.chat_model
        self._client = None

    def extract(self, slide: SlideInput) -> list[str]:
        if self._client is None:
            from openai import OpenAI

            self._client = OpenAI(api_key=self._api_key)
        response = self._client.responses.create(
            model=self._model,
            input=(
                "Extract at most 12 concepts explicitly present in this slide. "
                "Return JSON only as {\"concepts\": [\"...\"]}.\n\n"
                f"Title: {slide.title}\nContent: {slide.content}"
            ),
        )
        value = json.loads(response.output_text)
        concepts = value.get("concepts")
        if not isinstance(concepts, list) or not all(
            isinstance(concept, str) for concept in concepts
        ):
            raise ValueError("OpenAI concept extraction returned invalid JSON")
        return concepts

    def close(self) -> None:
        client, self._client = self._client, None
        if client is not None and callable(getattr(client, "close", None)):
            client.close()

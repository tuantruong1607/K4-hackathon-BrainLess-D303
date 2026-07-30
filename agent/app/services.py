from dataclasses import dataclass
from typing import Sequence

from .domain import RetrievedSlide, SlideInput
from .indexing import IndexResult, RagIndexer
from .providers import ChatProvider, EmbeddingProvider
from .stores import VectorStore


@dataclass(frozen=True)
class ChatAnswer:
    answer: str
    sources: list[RetrievedSlide]
    provider: str


class RagService:
    def __init__(
        self,
        indexer: RagIndexer,
        embedding_provider: EmbeddingProvider,
        vector_store: VectorStore,
        chat_provider: ChatProvider,
    ) -> None:
        self._indexer = indexer
        self._embedding_provider = embedding_provider
        self._vector_store = vector_store
        self._chat_provider = chat_provider

    def build_graph(
        self,
        document_id: str,
        day: str,
        version: str,
        slides: Sequence[SlideInput],
    ) -> IndexResult:
        return self._indexer.index(document_id, day, version, slides)

    def retrieve(
        self,
        question: str,
        day: str | None = None,
        document_id: str | None = None,
        limit: int = 5,
    ) -> list[RetrievedSlide]:
        vector = self._embedding_provider.embed(question)
        return self._vector_store.search(
            vector,
            day=day,
            document_id=document_id,
            limit=limit,
        )

    def chat(
        self,
        question: str,
        user_id: int,
        current_day: str,
        current_slide: int,
    ) -> ChatAnswer:
        sources = self.retrieve(question, day=current_day, limit=5)
        return ChatAnswer(
            answer=self._chat_provider.answer(question, sources),
            sources=sources,
            provider=self._chat_provider.name,
        )

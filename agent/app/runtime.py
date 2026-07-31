from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Sequence

from .chat import (
    ChatProvider,
    MockChatProvider,
    OpenAIChatProvider,
    validate_quiz_questions,
)
from .domain import RetrievalResult, SlideInput
from .errors import (
    AgentError,
    DependencyUnavailableError,
    MissingResourceError,
    UpstreamDependencyError,
)
from .graph.nodes.level_analyzer import Level, analyze_level
from .graph.workflow import WorkflowDependencies, build_workflow
from .indexing import IndexResult, RagIndexer
from .ingestion import load_directory
from .providers import (
    ConceptExtractor,
    DeterministicConceptExtractor,
    EmbeddingProvider,
    MockEmbeddingProvider,
    OpenAIConceptExtractor,
    OpenAIEmbeddingProvider,
)
from .retrieval import HybridRetriever
from .settings import Settings
from .stores import (
    GraphStore,
    MemoryGraphStore,
    MemoryVectorStore,
    Neo4jGraphStore,
    QdrantVectorStore,
    VectorStore,
)
from .user_context import (
    MockUserContextProvider,
    PostgresUserContextProvider,
    UserContextProvider,
)


def citation_from_hit(hit) -> dict[str, Any]:
    chunk = hit.chunk
    return {
        "document_id": chunk.document_id,
        "version": chunk.version,
        "day": chunk.day,
        "slide_number": chunk.slide_number,
        "title": chunk.title,
        "content": chunk.content,
        "concepts": list(chunk.concepts),
        "score": float(hit.score),
    }


def retrieval_payload(retrieval: RetrievalResult) -> dict[str, Any]:
    return {
        "sources": [citation_from_hit(hit) for hit in retrieval.slides],
        "graph_nodes": [
            {"name": concept.name, "slide_ids": list(concept.slide_ids)}
            for concept in retrieval.concepts
        ],
        "related_nodes": [],
    }


class AgentService:
    def __init__(
        self,
        *,
        settings: Settings,
        indexer: RagIndexer,
        retriever: HybridRetriever,
        embedding_provider: EmbeddingProvider,
        user_context_provider: UserContextProvider,
        chat_provider: ChatProvider,
        workflow,
    ) -> None:
        self.settings = settings
        self.indexer = indexer
        self.retriever = retriever
        self.embedding_provider = embedding_provider
        self.user_context_provider = user_context_provider
        self.chat_provider = chat_provider
        self.workflow = workflow

    @staticmethod
    def _upstream_call(operation, *args, **kwargs):
        try:
            return operation(*args, **kwargs)
        except AgentError:
            raise
        except (ImportError, ModuleNotFoundError) as error:
            raise DependencyUnavailableError() from error
        except Exception as error:
            raise UpstreamDependencyError() from error

    def build_graph(
        self,
        *,
        document_id: str,
        version: str,
        day: str,
        slides: Sequence[dict[str, Any]],
    ) -> IndexResult:
        return self._upstream_call(
            self.indexer.index,
            [
                SlideInput(
                    document_id=document_id,
                    version=version,
                    day=day,
                    slide_number=slide["slide_number"],
                    title=slide["title"],
                    content=slide["content"],
                    concepts=list(slide.get("concepts", [])),
                )
                for slide in slides
            ],
        )

    def build_directory(self, data_dir: Path | None = None) -> list[dict[str, Any]]:
        slides = self._upstream_call(
            load_directory,
            data_dir or self.settings.resolved_rag_data_dir,
        )
        documents: dict[tuple[str, str, str], list[SlideInput]] = {}
        for slide in slides:
            documents.setdefault(
                (slide.document_id, slide.version, slide.day), []
            ).append(slide)
        results: list[dict[str, Any]] = []
        for (document_id, version, day), document_slides in documents.items():
            result = self._upstream_call(self.indexer.index, document_slides)
            results.append(
                {
                    "document_id": document_id,
                    "version": version,
                    "day": day,
                    "indexed_slides": result.indexed_chunks,
                    "concepts": list(result.concepts),
                }
            )
        return results

    def retrieve(
        self,
        question: str,
        *,
        day: str | None = None,
        document_id: str | None = None,
        limit: int | None = None,
    ) -> RetrievalResult:
        result = self._upstream_call(
            self.retriever.retrieve,
            question,
            day=day,
            document_id=document_id,
            limit=limit or self.settings.retrieval_limit,
        )
        if not result.slides:
            raise MissingResourceError("No indexed slides match the request")
        return result

    def chat(
        self,
        *,
        user_id: int,
        question: str,
        current_day: str | None,
        current_slide: int | None,
    ) -> dict[str, Any]:
        state = self._upstream_call(
            self.workflow.invoke,
            {
                "user_id": user_id,
                "question": question,
                "current_day": current_day,
                "current_slide": current_slide,
            }
        )
        return {
            "answer": state["answer"],
            "level": state["level"],
            "provider": state["provider"],
            "sources": [
                citation_from_hit(hit) for hit in state["retrieval"].slides
            ],
        }

    def generate_quiz(
        self, *, day: str, difficulty: str, count: int
    ) -> list[dict]:
        retrieval = self.retrieve(
            day,
            day=day,
            limit=max(count, self.settings.retrieval_limit),
        )
        questions = self._upstream_call(
            self.chat_provider.generate_quiz,
            retrieval=retrieval,
            day=day,
            difficulty=difficulty,
            count=count,
        )
        allowed_concepts = [concept.name for concept in retrieval.concepts]
        if not allowed_concepts:
            allowed_concepts = sorted(
                {
                    concept
                    for hit in retrieval.slides
                    for concept in hit.chunk.concepts
                }
            )
        if not allowed_concepts:
            allowed_concepts = [hit.chunk.title for hit in retrieval.slides]
        return self._upstream_call(
            validate_quiz_questions,
            questions,
            expected_count=count,
            allowed_concepts=allowed_concepts,
        )

    def analyze_level(self, user_id: int) -> Level:
        context = self._upstream_call(self.user_context_provider.get, user_id)
        return analyze_level(context)

    def embed(self, text: str) -> list[float]:
        return self._upstream_call(self.embedding_provider.embed, text)

    def health(self) -> dict[str, str]:
        return {
            "status": "ok",
            "provider": self.chat_provider.provider_name,
            "vector_store": self.settings.rag_vector_store,
            "graph_store": self.settings.rag_graph_store,
            "user_context_provider": self.settings.user_context_provider,
        }


@dataclass
class Runtime:
    settings: Settings
    embedding_provider: EmbeddingProvider
    concept_extractor: ConceptExtractor
    vector_store: VectorStore
    graph_store: GraphStore
    user_context_provider: UserContextProvider
    chat_provider: ChatProvider
    indexer: RagIndexer
    retriever: HybridRetriever
    workflow: Any
    service: AgentService
    _closed: bool = field(default=False, init=False, repr=False)

    def close(self) -> None:
        if self._closed:
            return
        self._closed = True
        errors: list[Exception] = []
        for component in (
            self.chat_provider,
            self.concept_extractor,
            self.embedding_provider,
            self.user_context_provider,
            self.graph_store,
            self.vector_store,
        ):
            close = getattr(component, "close", None)
            if not callable(close):
                continue
            try:
                close()
            except Exception as error:
                errors.append(error)
        if errors:
            raise UpstreamDependencyError() from errors[0]


def _construct_dependency(factory, *args):
    try:
        return factory(*args)
    except AgentError:
        raise
    except (ImportError, ModuleNotFoundError) as error:
        raise DependencyUnavailableError() from error
    except Exception as error:
        raise UpstreamDependencyError() from error


def build_runtime(settings: Settings | None = None) -> Runtime:
    selected = settings or Settings()
    selected.validate_runtime()

    if selected.rag_provider == "mock":
        embedding_provider: EmbeddingProvider = MockEmbeddingProvider()
        concept_extractor: ConceptExtractor = DeterministicConceptExtractor()
    else:
        embedding_provider = _construct_dependency(
            OpenAIEmbeddingProvider, selected
        )
        concept_extractor = _construct_dependency(
            OpenAIConceptExtractor, selected
        )

    if selected.selected_chat_provider == "mock":
        chat_provider: ChatProvider = MockChatProvider()
    else:
        chat_provider = _construct_dependency(OpenAIChatProvider, selected)

    vector_store: VectorStore
    if selected.rag_vector_store == "memory":
        vector_store = MemoryVectorStore()
    else:
        vector_store = _construct_dependency(QdrantVectorStore, selected)

    graph_store: GraphStore
    if selected.rag_graph_store == "memory":
        graph_store = MemoryGraphStore()
    else:
        graph_store = _construct_dependency(Neo4jGraphStore, selected)

    user_context_provider: UserContextProvider
    if selected.user_context_provider == "mock":
        user_context_provider = MockUserContextProvider()
    else:
        user_context_provider = _construct_dependency(
            PostgresUserContextProvider, selected
        )

    indexer = RagIndexer(
        embedding_provider,
        vector_store,
        graph_store,
        concept_extractor,
    )
    retriever = HybridRetriever(embedding_provider, vector_store, graph_store)
    workflow = build_workflow(
        WorkflowDependencies(
            user_context_provider=user_context_provider,
            level_analyzer=analyze_level,
            retriever=retriever,
            chat_provider=chat_provider,
            retrieval_limit=selected.retrieval_limit,
        )
    )
    service = AgentService(
        settings=selected,
        indexer=indexer,
        retriever=retriever,
        embedding_provider=embedding_provider,
        user_context_provider=user_context_provider,
        chat_provider=chat_provider,
        workflow=workflow,
    )
    return Runtime(
        settings=selected,
        embedding_provider=embedding_provider,
        concept_extractor=concept_extractor,
        vector_store=vector_store,
        graph_store=graph_store,
        user_context_provider=user_context_provider,
        chat_provider=chat_provider,
        indexer=indexer,
        retriever=retriever,
        workflow=workflow,
        service=service,
    )

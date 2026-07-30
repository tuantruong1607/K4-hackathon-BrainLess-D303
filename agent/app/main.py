from fastapi import FastAPI
from pydantic import BaseModel, Field

from .domain import RetrievedSlide, SlideInput
from .indexing import RagIndexer
from .providers import (
    MockChatProvider,
    MockEmbeddingProvider,
    OpenAIChatProvider,
    OpenAIEmbeddingProvider,
)
from .services import RagService
from .settings import RagSettings
from .stores import (
    MemoryGraphStore,
    MemoryVectorStore,
    Neo4jGraphStore,
    QdrantVectorStore,
)


class HealthResponse(BaseModel):
    status: str


class SlideRequest(BaseModel):
    slide_number: int
    title: str
    content: str
    concepts: list[str] = Field(default_factory=list)

    def to_domain(self) -> SlideInput:
        return SlideInput(
            slide_number=self.slide_number,
            title=self.title,
            content=self.content,
            concepts=self.concepts,
        )


class BuildGraphRequest(BaseModel):
    document_id: str
    day: str
    version: str
    slides: list[SlideRequest]


class BuildGraphResponse(BaseModel):
    indexed_chunks: int
    concepts: list[str]


class RetrieveRequest(BaseModel):
    question: str
    day: str | None = None
    document_id: str | None = None
    limit: int = Field(default=5, ge=1, le=100)


class CitationResponse(BaseModel):
    document_id: str
    day: str
    version: str
    slide_number: int
    title: str
    content: str
    concepts: list[str]
    score: float


class RetrieveResponse(BaseModel):
    sources: list[CitationResponse]


class ChatRequest(BaseModel):
    question: str
    user_id: int
    current_day: str
    current_slide: int


class ChatResponse(BaseModel):
    answer: str
    sources: list[CitationResponse]
    provider: str


def create_app(settings: RagSettings | None = None) -> FastAPI:
    configured_settings = settings or RagSettings.from_env()
    service = _create_service(configured_settings)
    app = FastAPI(title="Slide RAG Agent")

    @app.get("/health", response_model=HealthResponse)
    def health() -> HealthResponse:
        return HealthResponse(status="ok")

    @app.post("/build-graph", response_model=BuildGraphResponse)
    def build_graph(request: BuildGraphRequest) -> BuildGraphResponse:
        result = service.build_graph(
            request.document_id,
            request.day,
            request.version,
            [slide.to_domain() for slide in request.slides],
        )
        return BuildGraphResponse(
            indexed_chunks=result.indexed_chunks,
            concepts=list(result.concepts),
        )

    @app.post("/retrieve", response_model=RetrieveResponse)
    def retrieve(request: RetrieveRequest) -> RetrieveResponse:
        sources = service.retrieve(
            request.question,
            day=request.day,
            document_id=request.document_id,
            limit=request.limit,
        )
        return RetrieveResponse(sources=[_citation(source) for source in sources])

    @app.post("/chat", response_model=ChatResponse)
    def chat(request: ChatRequest) -> ChatResponse:
        answer = service.chat(
            request.question,
            user_id=request.user_id,
            current_day=request.current_day,
            current_slide=request.current_slide,
        )
        return ChatResponse(
            answer=answer.answer,
            sources=[_citation(source) for source in answer.sources],
            provider=answer.provider,
        )

    return app


def _create_service(settings: RagSettings) -> RagService:
    if settings.provider == "openai":
        if settings.vector_store != "qdrant":
            raise RuntimeError(
                "RAG_VECTOR_STORE=qdrant is required when RAG_PROVIDER=openai"
            )
        embedding_provider = OpenAIEmbeddingProvider(settings)
        chat_provider = OpenAIChatProvider(settings)
    elif settings.provider == "mock":
        embedding_provider = MockEmbeddingProvider()
        chat_provider = MockChatProvider()
    else:
        raise RuntimeError(f"Unsupported RAG_PROVIDER: {settings.provider}")

    if settings.vector_store == "qdrant":
        vector_store = QdrantVectorStore(settings)
    elif settings.vector_store == "memory":
        vector_store = MemoryVectorStore()
    else:
        raise RuntimeError(f"Unsupported RAG_VECTOR_STORE: {settings.vector_store}")

    if settings.graph_store == "neo4j":
        graph_store = Neo4jGraphStore(settings)
    elif settings.graph_store == "memory":
        graph_store = MemoryGraphStore()
    else:
        raise RuntimeError(f"Unsupported RAG_GRAPH_STORE: {settings.graph_store}")

    indexer = RagIndexer(embedding_provider, vector_store, graph_store)
    return RagService(
        indexer,
        embedding_provider,
        vector_store,
        chat_provider,
    )


def _citation(source: RetrievedSlide) -> CitationResponse:
    chunk = source.chunk
    return CitationResponse(
        document_id=chunk.document_id,
        day=chunk.day,
        version=chunk.version,
        slide_number=chunk.slide_number,
        title=chunk.title,
        content=chunk.content,
        concepts=chunk.concepts,
        score=float(source.score),
    )


app = create_app()

from pydantic import BaseModel, Field


class ErrorResponse(BaseModel):
    detail: str


class SlidePayload(BaseModel):
    slide_number: int = Field(ge=1)
    title: str = Field(min_length=1)
    content: str = Field(min_length=1)
    concepts: list[str] = Field(default_factory=list)


class BuildGraphRequest(BaseModel):
    document_id: str = Field(min_length=1)
    version: str = Field(min_length=1)
    day: str = Field(min_length=1)
    slides: list[SlidePayload] = Field(min_length=1)


class BuildGraphResponse(BaseModel):
    indexed_slides: int
    concepts: list[str]


class Citation(BaseModel):
    document_id: str
    version: str
    day: str
    slide_number: int
    title: str
    content: str
    concepts: list[str]
    score: float


class GraphNode(BaseModel):
    name: str
    slide_ids: list[str] = Field(default_factory=list)


class RetrieveRequest(BaseModel):
    question: str = Field(min_length=1)
    day: str | None = None
    document_id: str | None = None
    limit: int = Field(default=5, ge=1, le=100)


class RetrieveResponse(BaseModel):
    sources: list[Citation]
    graph_nodes: list[GraphNode]
    related_nodes: list[GraphNode]


class ChatRequest(BaseModel):
    user_id: int
    question: str = Field(min_length=1)
    current_day: str | None = None
    current_slide: int | None = Field(default=None, ge=1)


class ChatResponse(BaseModel):
    answer: str
    level: str
    provider: str
    sources: list[Citation]


class GenerateQuizRequest(BaseModel):
    day: str = Field(min_length=1)
    difficulty: str = Field(default="medium", min_length=1)
    count: int = Field(default=5, ge=1, le=20)


class QuestionOut(BaseModel):
    question: str
    answers: list[str]
    correct_answer: str
    explanation: str
    knowledge_node: str


class GenerateQuizResponse(BaseModel):
    questions: list[QuestionOut]


class AnalyzeLevelRequest(BaseModel):
    user_id: int


class AnalyzeLevelResponse(BaseModel):
    level: str


class EmbeddingRequest(BaseModel):
    text: str = Field(min_length=1)


class EmbeddingResponse(BaseModel):
    embedding: list[float]


class HealthResponse(BaseModel):
    status: str
    provider: str
    vector_store: str
    graph_store: str
    user_context_provider: str

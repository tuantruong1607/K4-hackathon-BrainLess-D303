from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    user_id: int
    question: str = Field(..., min_length=1)
    day: str | None = None
    current_slide: str | None = None


class ChatResponse(BaseModel):
    answer: str
    level: str


class GenerateQuizRequest(BaseModel):
    day: str
    difficulty: str = "medium"
    count: int = Field(default=5, ge=1, le=20)


class QuestionOut(BaseModel):
    question: str
    answers: list[str]
    correct_answer: str
    explanation: str
    knowledge_node: str


class GenerateQuizResponse(BaseModel):
    questions: list[QuestionOut]


class BuildGraphResult(BaseModel):
    source: str
    day: str
    chunks_indexed: int
    concepts_extracted: int


class BuildGraphResponse(BaseModel):
    results: list[BuildGraphResult]


class AnalyzeLevelRequest(BaseModel):
    user_id: int


class AnalyzeLevelResponse(BaseModel):
    level: str


class RetrieveRequest(BaseModel):
    question: str = Field(..., min_length=1)
    day: str | None = None


class RetrieveResponse(BaseModel):
    slide_chunks: list[dict]
    graph_nodes: list[dict]
    related_nodes: list[dict]


class EmbeddingRequest(BaseModel):
    text: str = Field(..., min_length=1)


class EmbeddingResponse(BaseModel):
    embedding: list[float]

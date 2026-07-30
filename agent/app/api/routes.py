from fastapi import APIRouter, HTTPException

from app.api.schemas import (
    AnalyzeLevelRequest,
    AnalyzeLevelResponse,
    BuildGraphResponse,
    ChatRequest,
    ChatResponse,
    EmbeddingRequest,
    EmbeddingResponse,
    GenerateQuizRequest,
    GenerateQuizResponse,
    RetrieveRequest,
    RetrieveResponse,
)
from app.config import settings
from app.graph.nodes.database_query import database_query
from app.graph.nodes.graph_builder import build_all
from app.graph.nodes.level_analyzer import analyze_level
from app.graph.nodes.question_generator import generate_questions
from app.graph.nodes.retrieval_graph import retrieval_graph
from app.graph.workflow import run_chat
from app.knowledge.embedder import embed_text

router = APIRouter()


def _wrap_upstream_errors(func, *args, **kwargs):
    try:
        return func(*args, **kwargs)
    except Exception as error:  # noqa: BLE001 - surface upstream LLM/store errors to the caller
        raise HTTPException(status_code=502, detail=str(error)) from error


@router.get("/health")
def health() -> dict:
    return {"status": "ok"}


@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest) -> ChatResponse:
    result = _wrap_upstream_errors(
        run_chat,
        user_id=request.user_id,
        question=request.question,
        day=request.day,
        current_slide=request.current_slide,
    )
    return ChatResponse(answer=result["answer"], level=result["level"])


@router.post("/generate-quiz", response_model=GenerateQuizResponse)
def generate_quiz(request: GenerateQuizRequest) -> GenerateQuizResponse:
    questions = _wrap_upstream_errors(
        generate_questions, request.day, request.difficulty, request.count
    )
    return GenerateQuizResponse(questions=questions)


@router.post("/build-graph", response_model=BuildGraphResponse)
def build_graph() -> BuildGraphResponse:
    results = _wrap_upstream_errors(build_all, settings.data_dir)
    return BuildGraphResponse(results=results)


@router.post("/analyze-level", response_model=AnalyzeLevelResponse)
def analyze_level_route(request: AnalyzeLevelRequest) -> AnalyzeLevelResponse:
    context = _wrap_upstream_errors(database_query, request.user_id)
    return AnalyzeLevelResponse(level=analyze_level(context))


@router.post("/retrieve", response_model=RetrieveResponse)
def retrieve(request: RetrieveRequest) -> RetrieveResponse:
    context = _wrap_upstream_errors(retrieval_graph, request.question, request.day)
    return RetrieveResponse(
        slide_chunks=context.slide_chunks,
        graph_nodes=context.graph_nodes,
        related_nodes=context.related_nodes,
    )


@router.post("/embedding", response_model=EmbeddingResponse)
def embedding(request: EmbeddingRequest) -> EmbeddingResponse:
    vector = _wrap_upstream_errors(embed_text, request.text)
    return EmbeddingResponse(embedding=vector)

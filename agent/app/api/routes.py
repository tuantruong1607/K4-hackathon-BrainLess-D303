from fastapi import APIRouter, Request

from app.api.schemas import (
    AnalyzeLevelRequest,
    AnalyzeLevelResponse,
    BuildGraphRequest,
    BuildGraphResponse,
    ChatRequest,
    ChatResponse,
    EmbeddingRequest,
    EmbeddingResponse,
    ErrorResponse,
    GenerateQuizRequest,
    GenerateQuizResponse,
    HealthResponse,
    RetrieveRequest,
    RetrieveResponse,
)
from app.runtime import Runtime, retrieval_payload


router = APIRouter()

DEPENDENCY_ERROR_RESPONSES = {
    502: {
        "model": ErrorResponse,
        "description": "An upstream provider or store failed",
    },
    503: {
        "model": ErrorResponse,
        "description": "Configuration or a required dependency is unavailable",
    },
}
RESOURCE_ERROR_RESPONSES = {
    **DEPENDENCY_ERROR_RESPONSES,
    409: {
        "model": ErrorResponse,
        "description": "Required index or user context is missing",
    },
}


def runtime_from(request: Request) -> Runtime:
    return request.app.state.runtime


@router.get(
    "/health",
    response_model=HealthResponse,
    responses=DEPENDENCY_ERROR_RESPONSES,
)
def health(request: Request) -> HealthResponse:
    return HealthResponse(**runtime_from(request).service.health())


@router.post(
    "/build-graph",
    response_model=BuildGraphResponse,
    responses=DEPENDENCY_ERROR_RESPONSES,
)
def build_graph(
    payload: BuildGraphRequest, request: Request
) -> BuildGraphResponse:
    result = runtime_from(request).service.build_graph(
        document_id=payload.document_id,
        version=payload.version,
        day=payload.day,
        slides=[slide.model_dump() for slide in payload.slides],
    )
    return BuildGraphResponse(
        indexed_slides=result.indexed_chunks,
        concepts=list(result.concepts),
    )


@router.post(
    "/retrieve",
    response_model=RetrieveResponse,
    responses=RESOURCE_ERROR_RESPONSES,
)
def retrieve(
    payload: RetrieveRequest, request: Request
) -> RetrieveResponse:
    result = runtime_from(request).service.retrieve(
        payload.question,
        day=payload.day,
        document_id=payload.document_id,
        limit=payload.limit,
    )
    return RetrieveResponse(**retrieval_payload(result))


@router.post(
    "/chat",
    response_model=ChatResponse,
    responses=RESOURCE_ERROR_RESPONSES,
)
def chat(payload: ChatRequest, request: Request) -> ChatResponse:
    result = runtime_from(request).service.chat(
        user_id=payload.user_id,
        question=payload.question,
        current_day=payload.current_day,
        current_slide=payload.current_slide,
    )
    return ChatResponse(**result)


@router.post(
    "/generate-quiz",
    response_model=GenerateQuizResponse,
    responses=RESOURCE_ERROR_RESPONSES,
)
def generate_quiz(
    payload: GenerateQuizRequest, request: Request
) -> GenerateQuizResponse:
    questions = runtime_from(request).service.generate_quiz(
        day=payload.day,
        difficulty=payload.difficulty,
        count=payload.count,
    )
    return GenerateQuizResponse(questions=questions)


@router.post(
    "/analyze-level",
    response_model=AnalyzeLevelResponse,
    responses=RESOURCE_ERROR_RESPONSES,
)
def analyze_level(
    payload: AnalyzeLevelRequest, request: Request
) -> AnalyzeLevelResponse:
    return AnalyzeLevelResponse(
        level=runtime_from(request).service.analyze_level(payload.user_id)
    )


@router.post(
    "/embedding",
    response_model=EmbeddingResponse,
    responses=DEPENDENCY_ERROR_RESPONSES,
)
def embedding(
    payload: EmbeddingRequest, request: Request
) -> EmbeddingResponse:
    return EmbeddingResponse(
        embedding=runtime_from(request).service.embed(payload.text)
    )

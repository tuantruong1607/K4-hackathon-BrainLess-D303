from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.api.routes import router
from app.errors import AgentError
from app.runtime import Runtime, build_runtime
from app.settings import Settings


def create_app(
    *,
    settings: Settings | None = None,
    runtime: Runtime | None = None,
) -> FastAPI:
    selected_runtime = runtime or build_runtime(settings)

    @asynccontextmanager
    async def lifespan(application: FastAPI):
        try:
            yield
        finally:
            selected_runtime.close()

    application = FastAPI(
        title="VLearn Agent Graph (RAG)",
        lifespan=lifespan,
    )
    application.state.runtime = selected_runtime
    application.include_router(router)

    @application.exception_handler(AgentError)
    async def handle_agent_error(
        request: Request, error: AgentError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=error.status_code,
            content={"detail": error.public_message},
        )

    @application.exception_handler(Exception)
    async def handle_unsanitized_upstream_error(
        request: Request, error: Exception
    ) -> JSONResponse:
        return JSONResponse(
            status_code=502,
            content={"detail": "Upstream dependency failed"},
        )

    return application


app = create_app()

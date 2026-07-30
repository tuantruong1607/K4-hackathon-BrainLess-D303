from langchain_openai import ChatOpenAI

from app.errors import DependencyUnavailableError
from app.settings import Settings


def get_chat_model(
    temperature: float = 0.2,
    *,
    settings: Settings | None = None,
) -> ChatOpenAI:
    selected = settings or Settings()
    selected.validate_runtime()
    if selected.rag_provider != "openai":
        raise DependencyUnavailableError(
            "Legacy ChatOpenAI facade is disabled for the mock runtime"
        )
    return ChatOpenAI(
        model=selected.chat_model,
        api_key=selected.openai_api_key.get_secret_value(),
        temperature=temperature,
    )

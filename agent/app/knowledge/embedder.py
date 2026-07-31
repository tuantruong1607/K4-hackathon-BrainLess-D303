from app.providers import MockEmbeddingProvider, OpenAIEmbeddingProvider
from app.settings import Settings


def _provider(settings: Settings | None = None):
    selected = settings or Settings()
    selected.validate_runtime()
    if selected.rag_provider == "mock":
        return MockEmbeddingProvider()
    return OpenAIEmbeddingProvider(selected)


def embed_texts(
    texts: list[str], *, settings: Settings | None = None
) -> list[list[float]]:
    provider = _provider(settings)
    return [provider.embed(text) for text in texts]


def embed_text(text: str, *, settings: Settings | None = None) -> list[float]:
    return _provider(settings).embed(text)

from functools import lru_cache

from langchain_openai import OpenAIEmbeddings

from app.config import settings


@lru_cache
def get_embeddings() -> OpenAIEmbeddings:
    return OpenAIEmbeddings(
        model=settings.embedding_model,
        api_key=settings.openai_api_key,
    )


def embed_texts(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    return get_embeddings().embed_documents(texts)


def embed_text(text: str) -> list[float]:
    return get_embeddings().embed_query(text)

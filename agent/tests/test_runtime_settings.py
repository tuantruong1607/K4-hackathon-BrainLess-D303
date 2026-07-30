import importlib

import pytest


settings_module = importlib.import_module("app.settings")


def _settings(**overrides):
    settings_type = getattr(settings_module, "Settings")
    return settings_type(_env_file=None, **overrides)


def test_settings_match_the_env_example_contract() -> None:
    settings = _settings()

    assert settings.rag_provider == "mock"
    assert settings.rag_vector_store == "memory"
    assert settings.rag_graph_store == "memory"
    assert settings.user_context_provider == "mock"
    assert settings.chat_model == "gpt-4o-mini"
    assert settings.embedding_model == "text-embedding-3-small"
    assert settings.qdrant_url == "http://localhost:6333"
    assert settings.qdrant_collection == "slides"
    assert settings.neo4j_username == "neo4j"
    assert settings.retrieval_limit == 5


def test_settings_repr_never_exposes_secrets() -> None:
    settings = _settings(
        openai_api_key="sk-test-secret",
        neo4j_password="neo4j-test-secret",
        database_url="postgresql://user:database-secret@localhost/db",
    )

    rendered = repr(settings)

    assert "sk-test-secret" not in rendered
    assert "neo4j-test-secret" not in rendered
    assert "database-secret" not in rendered


@pytest.mark.parametrize(
    ("overrides", "missing_name"),
    [
        ({"rag_provider": "openai", "openai_api_key": ""}, "OPENAI_API_KEY"),
        ({"rag_vector_store": "qdrant", "qdrant_url": ""}, "QDRANT_URL"),
        (
            {"rag_graph_store": "neo4j", "neo4j_password": ""},
            "NEO4J_PASSWORD",
        ),
        (
            {"user_context_provider": "postgres", "database_url": ""},
            "DATABASE_URL",
        ),
    ],
)
def test_live_combinations_raise_typed_configuration_error(
    overrides: dict[str, str], missing_name: str
) -> None:
    configuration_error = getattr(settings_module, "ConfigurationError")
    settings = _settings(**overrides)

    with pytest.raises(configuration_error, match=missing_name):
        settings.validate_runtime()

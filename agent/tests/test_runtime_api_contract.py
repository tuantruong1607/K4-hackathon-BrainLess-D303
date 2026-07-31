import importlib

import pytest
from fastapi.testclient import TestClient

from app.errors import ConfigurationError, DependencyUnavailableError
from app.settings import Settings


def _client():
    runtime_module = importlib.import_module("app.runtime")
    main_module = importlib.import_module("app.main")
    runtime = runtime_module.build_runtime(Settings(_env_file=None))
    return TestClient(main_module.create_app(runtime=runtime)), runtime


def _build_payload():
    return {
        "document_id": "deck",
        "version": "v1",
        "day": "day01",
        "slides": [
            {
                "slide_number": 1,
                "title": "Jobs To Be Done",
                "content": "JTBD describes the progress a customer seeks.",
                "concepts": ["JTBD", "Customer progress"],
            }
        ],
    }


def test_mock_runtime_supports_the_full_typed_api_without_network() -> None:
    client, _ = _client()

    health = client.get("/health")
    build = client.post("/build-graph", json=_build_payload())
    retrieve = client.post(
        "/retrieve",
        json={"question": "What is JTBD?", "day": "day01", "limit": 5},
    )
    chat = client.post(
        "/chat",
        json={
            "user_id": 42,
            "question": "What is JTBD?",
            "current_day": "day01",
            "current_slide": 1,
        },
    )
    quiz = client.post(
        "/generate-quiz",
        json={"day": "day01", "difficulty": "medium", "count": 2},
    )
    level = client.post("/analyze-level", json={"user_id": 42})
    embedding = client.post("/embedding", json={"text": "JTBD"})

    assert health.status_code == 200
    assert health.json()["provider"] == "mock"
    assert build.status_code == 200
    assert build.json() == {
        "indexed_slides": 1,
        "concepts": ["Customer progress", "JTBD"],
    }

    assert retrieve.status_code == 200
    citation = retrieve.json()["sources"][0]
    assert citation == {
        "document_id": "deck",
        "version": "v1",
        "day": "day01",
        "slide_number": 1,
        "title": "Jobs To Be Done",
        "content": "JTBD describes the progress a customer seeks.",
        "concepts": ["JTBD", "Customer progress"],
        "score": citation["score"],
    }
    assert retrieve.json()["graph_nodes"][0]["name"] in {
        "JTBD",
        "Customer progress",
    }

    assert chat.status_code == 200
    assert chat.json()["provider"] == "mock"
    assert chat.json()["level"] == "beginner"
    assert chat.json()["sources"][0] == citation
    assert "JTBD describes the progress" in chat.json()["answer"]

    assert quiz.status_code == 200
    assert len(quiz.json()["questions"]) == 2
    assert all(
        question["knowledge_node"] in {"JTBD", "Customer progress"}
        for question in quiz.json()["questions"]
    )
    assert level.json() == {"level": "beginner"}
    assert embedding.status_code == 200
    assert len(embedding.json()["embedding"]) == 32


def test_fastapi_lifespan_closes_the_injected_runtime() -> None:
    runtime_module = importlib.import_module("app.runtime")
    main_module = importlib.import_module("app.main")
    runtime = runtime_module.build_runtime(Settings(_env_file=None))
    closed: list[bool] = []
    runtime.close = lambda: closed.append(True)

    with TestClient(main_module.create_app(runtime=runtime)) as client:
        assert client.get("/health").status_code == 200
        assert closed == []

    assert closed == [True]


def test_build_graph_requires_a_typed_body_and_valid_slide_number() -> None:
    client, _ = _client()

    assert client.post("/build-graph").status_code == 422
    response = client.post(
        "/build-graph",
        json=_build_payload()
        | {"slides": [_build_payload()["slides"][0] | {"slide_number": 0}]},
    )
    assert response.status_code == 422


def test_missing_index_is_409() -> None:
    client, _ = _client()

    response = client.post("/retrieve", json={"question": "What is JTBD?"})

    assert response.status_code == 409
    assert response.json()["detail"] == "No indexed slides match the request"


def test_raw_upstream_errors_are_502_and_sanitized(monkeypatch) -> None:
    client, runtime = _client()

    def fail(*args, **kwargs):
        raise RuntimeError("qdrant token=super-secret internal stack")

    monkeypatch.setattr(runtime.retriever, "retrieve", fail)

    response = client.post("/retrieve", json={"question": "What is JTBD?"})

    assert response.status_code == 502
    assert response.json()["detail"] == "Upstream dependency failed"
    assert "super-secret" not in response.text


def test_invalid_quiz_provider_output_is_rejected_as_upstream_failure(
    monkeypatch,
) -> None:
    client, runtime = _client()
    assert client.post("/build-graph", json=_build_payload()).status_code == 200

    monkeypatch.setattr(
        runtime.chat_provider,
        "generate_quiz",
        lambda **kwargs: [
            {
                "question": "Invalid provider question",
                "answers": ["A", "A", "B", "C"],
                "correct_answer": "A",
                "explanation": "Invalid duplicate answers",
                "knowledge_node": "Unknown",
            }
        ],
    )

    response = client.post(
        "/generate-quiz",
        json={"day": "day01", "difficulty": "medium", "count": 1},
    )

    assert response.status_code == 502
    assert response.json() == {"detail": "Upstream dependency failed"}


def test_lazy_dependency_import_errors_are_503_and_sanitized(monkeypatch) -> None:
    client, runtime = _client()

    def fail(*args, **kwargs):
        raise ModuleNotFoundError("optional package path with token=super-secret")

    monkeypatch.setattr(runtime.retriever, "retrieve", fail)

    response = client.post("/retrieve", json={"question": "What is JTBD?"})

    assert response.status_code == 503
    assert response.json()["detail"] == "Required dependency is unavailable"
    assert "super-secret" not in response.text


@pytest.mark.parametrize(
    "error",
    [
        ConfigurationError("OPENAI_API_KEY is missing"),
        DependencyUnavailableError(),
    ],
)
def test_configuration_and_unavailable_dependencies_are_503(
    monkeypatch, error
) -> None:
    client, runtime = _client()

    def fail():
        raise error

    monkeypatch.setattr(runtime.service, "health", fail)

    response = client.get("/health")

    assert response.status_code == 503
    assert "OPENAI_API_KEY" not in response.text


def test_openapi_declares_typed_error_responses_on_relevant_routes() -> None:
    runtime_module = importlib.import_module("app.runtime")
    main_module = importlib.import_module("app.main")
    runtime = runtime_module.build_runtime(Settings(_env_file=None))

    openapi = main_module.create_app(runtime=runtime).openapi()

    expected_statuses = {
        "/health": {"502", "503"},
        "/build-graph": {"502", "503"},
        "/retrieve": {"409", "502", "503"},
        "/chat": {"409", "502", "503"},
        "/generate-quiz": {"409", "502", "503"},
        "/analyze-level": {"409", "502", "503"},
        "/embedding": {"502", "503"},
    }
    for path, statuses in expected_statuses.items():
        method = "get" if path == "/health" else "post"
        responses = openapi["paths"][path][method]["responses"]
        for status in statuses:
            assert responses[status]["content"]["application/json"]["schema"] == {
                "$ref": "#/components/schemas/ErrorResponse"
            }

    assert openapi["components"]["schemas"]["ErrorResponse"] == {
        "properties": {
            "detail": {"title": "Detail", "type": "string"},
        },
        "required": ["detail"],
        "title": "ErrorResponse",
        "type": "object",
    }

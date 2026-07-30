from fastapi.testclient import TestClient

from app.graph.nodes.database_query import UserContext
from app.graph.nodes.question_generator import GeneratedQuestion
from app.graph.nodes.retrieval_graph import RetrievedContext
from app.main import app

client = TestClient(app)


def test_health_endpoint() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_chat_endpoint_returns_answer_and_level(monkeypatch) -> None:
    def fake_run_chat(user_id: int, question: str, day=None, current_slide=None):
        assert user_id == 1
        assert question == "JTBD la gi?"
        return {"answer": "JTBD la Jobs To Be Done.", "level": "intermediate"}

    monkeypatch.setattr("app.api.routes.run_chat", fake_run_chat)

    response = client.post("/chat", json={"user_id": 1, "question": "JTBD la gi?"})

    assert response.status_code == 200
    assert response.json() == {"answer": "JTBD la Jobs To Be Done.", "level": "intermediate"}


def test_chat_endpoint_rejects_empty_question() -> None:
    response = client.post("/chat", json={"user_id": 1, "question": ""})

    assert response.status_code == 422


def test_chat_endpoint_returns_502_on_upstream_error(monkeypatch) -> None:
    def failing_run_chat(**kwargs):
        raise RuntimeError("upstream failure")

    monkeypatch.setattr("app.api.routes.run_chat", failing_run_chat)

    response = client.post("/chat", json={"user_id": 1, "question": "hello"})

    assert response.status_code == 502


def test_generate_quiz_endpoint(monkeypatch) -> None:
    def fake_generate_questions(day: str, difficulty: str, count: int):
        assert day == "day01"
        assert difficulty == "medium"
        assert count == 2
        return [
            GeneratedQuestion(
                question="JTBD la gi?",
                answers=["A", "B", "C", "D"],
                correct_answer="A",
                explanation="...",
                knowledge_node="JTBD",
            )
        ]

    monkeypatch.setattr("app.api.routes.generate_questions", fake_generate_questions)

    response = client.post("/generate-quiz", json={"day": "day01", "difficulty": "medium", "count": 2})

    assert response.status_code == 200
    body = response.json()
    assert len(body["questions"]) == 1
    assert body["questions"][0]["knowledge_node"] == "JTBD"


def test_build_graph_endpoint(monkeypatch) -> None:
    def fake_build_all(data_dir):
        return [
            {"source": "d1.pdf", "day": "day01", "chunks_indexed": 10, "concepts_extracted": 5},
        ]

    monkeypatch.setattr("app.api.routes.build_all", fake_build_all)

    response = client.post("/build-graph")

    assert response.status_code == 200
    assert response.json()["results"][0]["source"] == "d1.pdf"


def test_analyze_level_endpoint(monkeypatch) -> None:
    monkeypatch.setattr(
        "app.api.routes.database_query",
        lambda user_id: UserContext(user_id=user_id, current_level="advanced"),
    )

    response = client.post("/analyze-level", json={"user_id": 1})

    assert response.status_code == 200
    assert response.json() == {"level": "advanced"}


def test_retrieve_endpoint(monkeypatch) -> None:
    def fake_retrieval_graph(question: str, day=None):
        return RetrievedContext(
            slide_chunks=[{"text": "JTBD content", "source": "d1.pdf", "day": "day01"}],
            graph_nodes=[{"name": "JTBD", "description": "..."}],
            related_nodes=[],
        )

    monkeypatch.setattr("app.api.routes.retrieval_graph", fake_retrieval_graph)

    response = client.post("/retrieve", json={"question": "JTBD la gi?"})

    assert response.status_code == 200
    body = response.json()
    assert body["graph_nodes"][0]["name"] == "JTBD"


def test_embedding_endpoint(monkeypatch) -> None:
    monkeypatch.setattr("app.api.routes.embed_text", lambda text: [0.1, 0.2, 0.3])

    response = client.post("/embedding", json={"text": "hello"})

    assert response.status_code == 200
    assert response.json() == {"embedding": [0.1, 0.2, 0.3]}

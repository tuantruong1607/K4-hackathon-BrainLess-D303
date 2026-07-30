from app.knowledge.neo4j_client import _search_terms


def test_search_terms_removes_question_filler_words() -> None:
    assert _search_terms("JTBD là gì?") == ["jtbd"]


def test_search_terms_keeps_unique_meaningful_terms() -> None:
    assert _search_terms("Push và Pull trong JTBD, push là gì?") == [
        "push",
        "pull",
        "jtbd",
    ]


def test_search_terms_returns_empty_for_only_stop_words() -> None:
    assert _search_terms("là gì và của ai?") == []

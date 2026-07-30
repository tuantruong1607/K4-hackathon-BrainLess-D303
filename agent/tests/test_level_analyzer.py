from app.graph.nodes.database_query import QuizResultSummary, UserContext
from app.graph.nodes.level_analyzer import analyze_level


def _context(scores: list[float], current_level: str = "beginner") -> UserContext:
    return UserContext(
        user_id=1,
        current_level=current_level,
        quiz_history=[
            QuizResultSummary(quiz_id=i, score=score, correct_answers=0, wrong_answers=0)
            for i, score in enumerate(scores)
        ],
    )


def test_no_history_falls_back_to_persisted_level() -> None:
    context = UserContext(user_id=1, current_level="advanced")
    assert analyze_level(context) == "advanced"


def test_low_average_score_is_beginner() -> None:
    assert analyze_level(_context([20, 30, 10])) == "beginner"


def test_mid_average_score_is_intermediate() -> None:
    assert analyze_level(_context([50, 60, 70])) == "intermediate"


def test_high_average_score_is_advanced() -> None:
    assert analyze_level(_context([80, 90, 100])) == "advanced"


def test_boundary_scores() -> None:
    assert analyze_level(_context([50])) == "intermediate"
    assert analyze_level(_context([49.9])) == "beginner"
    assert analyze_level(_context([80])) == "advanced"
    assert analyze_level(_context([79.9])) == "intermediate"

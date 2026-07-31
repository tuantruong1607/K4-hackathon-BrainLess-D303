from typing import Literal

from app.graph.nodes.database_query import UserContext

Level = Literal["beginner", "intermediate", "advanced"]

ADVANCED_THRESHOLD = 80
INTERMEDIATE_THRESHOLD = 50


def analyze_level(context: UserContext) -> Level:
    """Beginner/Intermediate/Advanced from recent quiz score average.

    Falls back to the persisted users.level when there's no quiz history yet.
    quiz_results only stores aggregate correct/wrong counts (no per-topic
    breakdown), so topic-level mistakes are only reflected indirectly in the
    aggregate score.
    """
    if not context.quiz_history:
        return context.current_level  # type: ignore[return-value]

    avg_score = sum(result.score for result in context.quiz_history) / len(context.quiz_history)

    if avg_score >= ADVANCED_THRESHOLD:
        return "advanced"
    if avg_score >= INTERMEDIATE_THRESHOLD:
        return "intermediate"
    return "beginner"

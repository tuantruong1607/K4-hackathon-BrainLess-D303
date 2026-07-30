from dataclasses import dataclass, field

from sqlalchemy import select

from app.db.models import LearningProgress, QuizResult, User
from app.db.session import get_session


@dataclass
class QuizResultSummary:
    quiz_id: int
    score: float
    correct_answers: int
    wrong_answers: int


@dataclass
class ProgressSummary:
    day: str
    slide_page: int
    completed: bool


@dataclass
class UserContext:
    user_id: int
    current_level: str
    quiz_history: list[QuizResultSummary] = field(default_factory=list)
    learning_progress: list[ProgressSummary] = field(default_factory=list)


def database_query(user_id: int, history_limit: int = 10) -> UserContext:
    with get_session() as session:
        user = session.get(User, user_id)
        current_level = user.level if user is not None else "beginner"

        quiz_rows = session.execute(
            select(QuizResult)
            .where(QuizResult.user_id == user_id)
            .order_by(QuizResult.created_at.desc())
            .limit(history_limit)
        ).scalars()
        quiz_history = [
            QuizResultSummary(
                quiz_id=row.quiz_id,
                score=row.score,
                correct_answers=row.correct_answers,
                wrong_answers=row.wrong_answers,
            )
            for row in quiz_rows
        ]

        progress_rows = session.execute(
            select(LearningProgress).where(LearningProgress.user_id == user_id)
        ).scalars()
        learning_progress = [
            ProgressSummary(day=row.day, slide_page=row.slide_page, completed=row.completed)
            for row in progress_rows
        ]

    return UserContext(
        user_id=user_id,
        current_level=current_level,
        quiz_history=quiz_history,
        learning_progress=learning_progress,
    )

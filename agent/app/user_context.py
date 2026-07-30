from collections.abc import Callable
from typing import Protocol

from sqlalchemy import Engine, create_engine, event, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, sessionmaker

from .db.models import LearningProgress, QuizResult, User
from .errors import MissingResourceError, UpstreamDependencyError
from .graph.nodes.database_query import (
    ProgressSummary,
    QuizResultSummary,
    UserContext,
)
from .settings import Settings


class UserContextProvider(Protocol):
    def get(self, user_id: int) -> UserContext: ...


class MockUserContextProvider:
    """Offline user context; it intentionally never constructs a DB engine."""

    def get(self, user_id: int) -> UserContext:
        return UserContext(user_id=user_id, current_level="beginner")


def assert_read_only_sql(statement: str) -> None:
    operation = statement.lstrip().split(maxsplit=1)[0].upper()
    if operation not in {"SELECT", "WITH", "SHOW", "SET"}:
        raise RuntimeError("Agent Postgres repository only permits read-only SQL")


class PostgresUserContextProvider:
    def __init__(
        self,
        settings: Settings,
        *,
        session_factory: Callable[[], Session] | None = None,
    ) -> None:
        if session_factory is None:
            engine = create_engine(settings.database_url.get_secret_value())
            self._install_read_only_guard(engine)
            session_factory = sessionmaker(bind=engine)
        self._session_factory = session_factory

    @staticmethod
    def _install_read_only_guard(engine: Engine) -> None:
        @event.listens_for(engine, "before_cursor_execute")
        def guard_statement(
            connection,
            cursor,
            statement,
            parameters,
            context,
            executemany,
        ) -> None:
            assert_read_only_sql(statement)

    def get(self, user_id: int, history_limit: int = 10) -> UserContext:
        try:
            with self._session_factory() as session:
                user = session.get(User, user_id)
                if user is None:
                    raise MissingResourceError("User context was not found")
                quiz_rows = session.execute(
                    select(QuizResult)
                    .where(QuizResult.user_id == user_id)
                    .order_by(QuizResult.created_at.desc())
                    .limit(history_limit)
                ).scalars()
                progress_rows = session.execute(
                    select(LearningProgress).where(
                        LearningProgress.user_id == user_id
                    )
                ).scalars()
                return UserContext(
                    user_id=user_id,
                    current_level=user.level,
                    quiz_history=[
                        QuizResultSummary(
                            quiz_id=row.quiz_id,
                            score=row.score,
                            correct_answers=row.correct_answers,
                            wrong_answers=row.wrong_answers,
                        )
                        for row in quiz_rows
                    ],
                    learning_progress=[
                        ProgressSummary(
                            day=row.day,
                            slide_page=row.slide_page,
                            completed=row.completed,
                        )
                        for row in progress_rows
                    ],
                )
        except MissingResourceError:
            raise
        except SQLAlchemyError as error:
            raise UpstreamDependencyError() from error

from collections.abc import Callable
import re
from typing import Protocol

from sqlalchemy import Engine, create_engine, event, select, text
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
    code = _sql_code_without_literals_or_comments(statement)
    statements = [part for part in code.split(";") if part.strip()]
    if len(statements) != 1:
        raise RuntimeError("Agent Postgres repository only permits read-only SQL")

    candidate = statements[0]
    tokens = re.findall(r"[A-Za-z_]+", candidate.upper())
    if tokens == ["SET", "TRANSACTION", "READ", "ONLY"]:
        return

    forbidden = {
        "ALTER",
        "CALL",
        "COPY",
        "CREATE",
        "DELETE",
        "DROP",
        "GRANT",
        "INSERT",
        "MERGE",
        "REVOKE",
        "TRUNCATE",
        "UPDATE",
    }
    if not tokens or forbidden.intersection(tokens):
        raise RuntimeError("Agent Postgres repository only permits read-only SQL")
    if tokens[0] == "SELECT":
        return
    if tokens[0] == "WITH" and "SELECT" in _top_level_tokens(candidate)[1:]:
        return
    raise RuntimeError("Agent Postgres repository only permits read-only SQL")


def _top_level_tokens(statement: str) -> list[str]:
    depth = 0
    top_level: list[str] = []
    index = 0
    while index < len(statement):
        character = statement[index]
        if character == "(":
            depth += 1
            index += 1
            continue
        if character == ")":
            depth = max(0, depth - 1)
            index += 1
            continue
        match = re.match(r"[A-Za-z_]+", statement[index:])
        if match:
            if depth == 0:
                top_level.append(match.group(0).upper())
            index += len(match.group(0))
            continue
        index += 1
    return top_level


def _sql_code_without_literals_or_comments(statement: str) -> str:
    code: list[str] = []
    index = 0
    while index < len(statement):
        if statement.startswith("--", index):
            newline = statement.find("\n", index + 2)
            index = len(statement) if newline == -1 else newline + 1
            code.append(" ")
            continue
        if statement.startswith("/*", index):
            depth = 1
            index += 2
            while index < len(statement) and depth:
                if statement.startswith("/*", index):
                    depth += 1
                    index += 2
                elif statement.startswith("*/", index):
                    depth -= 1
                    index += 2
                else:
                    index += 1
            code.append(" ")
            continue
        if statement[index] in {"'", '"'}:
            quote = statement[index]
            index += 1
            while index < len(statement):
                if statement[index] == "\\":
                    index += 2
                elif statement[index] == quote:
                    if index + 1 < len(statement) and statement[index + 1] == quote:
                        index += 2
                    else:
                        index += 1
                        break
                else:
                    index += 1
            code.append(" ")
            continue
        if statement[index] == "$":
            delimiter = re.match(r"\$[A-Za-z_][A-Za-z0-9_]*\$|\$\$", statement[index:])
            if delimiter:
                marker = delimiter.group(0)
                end = statement.find(marker, index + len(marker))
                index = len(statement) if end == -1 else end + len(marker)
                code.append(" ")
                continue
        code.append(statement[index])
        index += 1
    return "".join(code)


class PostgresUserContextProvider:
    def __init__(
        self,
        settings: Settings,
        *,
        session_factory: Callable[[], Session] | None = None,
    ) -> None:
        self._engine: Engine | None = None
        if session_factory is None:
            engine = create_engine(settings.database_url.get_secret_value())
            self._install_read_only_guard(engine)
            self._engine = engine
            session_factory = sessionmaker(bind=engine)
        self._session_factory = session_factory

    def close(self) -> None:
        engine, self._engine = self._engine, None
        if engine is not None:
            engine.dispose()

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
                session.execute(text("SET TRANSACTION READ ONLY"))
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

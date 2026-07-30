from types import SimpleNamespace

import pytest

from app.runtime import build_runtime
from app.settings import Settings
from app.user_context import (
    PostgresUserContextProvider,
    assert_read_only_sql,
)


def test_mock_user_context_never_constructs_postgres_engine(monkeypatch) -> None:
    def unexpected_engine(*args, **kwargs):
        raise AssertionError("mock runtime must not construct a Postgres engine")

    monkeypatch.setattr("app.user_context.create_engine", unexpected_engine)

    runtime = build_runtime(Settings(_env_file=None))

    assert runtime.user_context_provider.get(9).current_level == "beginner"


@pytest.mark.parametrize(
    "statement",
    [
        "INSERT INTO users(id) VALUES (1)",
        "UPDATE users SET level = 'advanced'",
        "DELETE FROM users",
        "CREATE TABLE agent_owned(id int)",
        "ALTER TABLE users ADD COLUMN owned bool",
    ],
)
def test_postgres_sql_guard_rejects_every_write_statement(statement: str) -> None:
    with pytest.raises(RuntimeError, match="read-only SQL"):
        assert_read_only_sql(statement)


def test_postgres_repository_only_emits_selects_and_never_commits() -> None:
    class Result:
        def __init__(self, rows):
            self.rows = rows

        def scalars(self):
            return self.rows

    class Session:
        def __init__(self):
            self.statements: list[str] = []
            self.committed = False

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, traceback):
            return False

        def get(self, model, user_id):
            return SimpleNamespace(level="intermediate")

        def execute(self, statement):
            rendered = str(statement)
            self.statements.append(rendered)
            if "quiz_results" in rendered:
                return Result(
                    [
                        SimpleNamespace(
                            quiz_id=3,
                            score=75,
                            correct_answers=3,
                            wrong_answers=1,
                        )
                    ]
                )
            return Result(
                [
                    SimpleNamespace(
                        day="day01",
                        slide_page=2,
                        completed=False,
                    )
                ]
            )

        def commit(self):
            self.committed = True

    session = Session()
    repository = PostgresUserContextProvider(
        Settings(
            _env_file=None,
            user_context_provider="postgres",
            database_url="postgresql://readonly:test@localhost/db",
        ),
        session_factory=lambda: session,
    )

    context = repository.get(11)

    assert context.current_level == "intermediate"
    assert context.quiz_history[0].score == 75
    assert context.learning_progress[0].day == "day01"
    assert session.committed is False
    assert all(statement.lstrip().upper().startswith("SELECT") for statement in session.statements)

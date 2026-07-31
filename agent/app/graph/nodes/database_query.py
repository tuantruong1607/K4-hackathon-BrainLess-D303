from dataclasses import dataclass, field

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
    """Compatibility entry point; new code receives the provider from Runtime."""
    from app.settings import Settings
    from app.user_context import (
        MockUserContextProvider,
        PostgresUserContextProvider,
    )

    settings = Settings()
    settings.validate_runtime()
    provider = (
        MockUserContextProvider()
        if settings.user_context_provider == "mock"
        else PostgresUserContextProvider(settings)
    )
    return provider.get(user_id)

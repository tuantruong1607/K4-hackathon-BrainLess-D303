from datetime import datetime

from sqlalchemy import ForeignKey
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class User(Base):
    """Read-only mirror of the users table owned by Backend (Member 1)."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str]
    fullname: Mapped[str]
    level: Mapped[str] = mapped_column(default="beginner")


class QuizResult(Base):
    __tablename__ = "quiz_results"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    quiz_id: Mapped[int]
    score: Mapped[float]
    correct_answers: Mapped[int]
    wrong_answers: Mapped[int]
    time_spent: Mapped[int]
    created_at: Mapped[datetime]


class LearningProgress(Base):
    __tablename__ = "learning_progress"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    day: Mapped[str]
    slide_page: Mapped[int]
    completed: Mapped[bool] = mapped_column(default=False)
    last_access: Mapped[datetime]


class SlideDocument(Base):
    __tablename__ = "slide_documents"

    id: Mapped[int] = mapped_column(primary_key=True)
    day: Mapped[str]
    title: Mapped[str]
    pdf_path: Mapped[str]
    preview_path: Mapped[str | None] = mapped_column(default=None)

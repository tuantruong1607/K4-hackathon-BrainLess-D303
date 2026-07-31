"""Create and seed the backend-owned schema for local integration only."""

import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db.models import Base, LearningProgress, QuizResult, SlideDocument, User
from app.errors import ConfigurationError
from app.settings import Settings


def main(*, settings: Settings | None = None) -> None:
    selected = settings or Settings()
    database_url = selected.database_url.get_secret_value()
    if not database_url:
        raise ConfigurationError(
            "DATABASE_URL is required by the local database integration script"
        )
    engine = create_engine(database_url)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        if session.get(User, 1) is not None:
            print("Dummy data already present, skipping seed.")
            return

        session.add(
            User(
                id=1,
                email="baoanh@example.com",
                fullname="Bảo Anh",
                level="beginner",
            )
        )
        session.flush()
        session.add(
            QuizResult(
                user_id=1,
                quiz_id=1,
                score=60,
                correct_answers=3,
                wrong_answers=2,
                time_spent=180,
                created_at=datetime.now(UTC) - timedelta(days=1),
            )
        )
        session.add(
            LearningProgress(
                user_id=1,
                day="day01",
                slide_page=2,
                completed=False,
                last_access=datetime.now(UTC),
            )
        )
        session.add_all(
            [
                SlideDocument(
                    day="day01",
                    title="AI & LLM Foundation",
                    pdf_path=str(
                        selected.resolved_rag_data_dir
                        / "d1-slide-hackathon.pdf"
                    ),
                ),
                SlideDocument(
                    day="day02",
                    title="Problem Statement",
                    pdf_path=str(
                        selected.resolved_rag_data_dir
                        / "d2-slide-hackathon.pdf"
                    ),
                ),
            ]
        )
        session.commit()
    print("Local dev tables created and seeded.")


if __name__ == "__main__":
    main()

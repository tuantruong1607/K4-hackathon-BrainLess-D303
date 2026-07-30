"""Create tables + seed dummy data for LOCAL DEV/TESTING ONLY.

The real users/quiz_results/learning_progress/slide_documents schema and
migrations are owned by Backend (Member 1, Alembic). This script exists so
database_query() can be exercised against a real Postgres locally before the
shared schema/instance is wired up.

Usage: python scripts/init_local_db.py
"""

import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db.models import Base, LearningProgress, QuizResult, SlideDocument, User
from app.db.session import get_engine, get_session


def main() -> None:
    Base.metadata.create_all(get_engine())

    with get_session() as session:
        if session.get(User, 1) is not None:
            print("Dummy data already present, skipping seed.")
            return

        session.add(User(id=1, email="baoanh@example.com", fullname="Bảo Anh", level="beginner"))
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
        session.add(
            SlideDocument(
                day="day01",
                title="AI & LLM Foundation",
                pdf_path="agent/data/raw/d1-slide-hackathon.pdf",
            )
        )
        session.add(
            SlideDocument(
                day="day02",
                title="Problem Statement",
                pdf_path="agent/data/raw/d2-slide-hackathon.pdf",
            )
        )
        session.commit()

    print("Local dev tables created and seeded.")


if __name__ == "__main__":
    main()

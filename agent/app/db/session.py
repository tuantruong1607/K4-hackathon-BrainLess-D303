"""Legacy session helpers without process-global engines or migrations."""

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session

from app.settings import Settings


def get_engine(settings: Settings | None = None) -> Engine:
    selected = settings or Settings()
    selected.validate_runtime()
    return create_engine(selected.database_url.get_secret_value())


def get_session(settings: Settings | None = None) -> Session:
    return Session(get_engine(settings))

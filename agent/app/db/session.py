from functools import lru_cache

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session

from app.config import settings


@lru_cache
def get_engine() -> Engine:
    return create_engine(settings.database_url)


def get_session() -> Session:
    return Session(get_engine())

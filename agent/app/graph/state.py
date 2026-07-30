from typing import TypedDict

from app.domain import RetrievalResult
from app.graph.nodes.database_query import UserContext
from app.graph.nodes.level_analyzer import Level


class AgentState(TypedDict, total=False):
    user_id: int
    question: str
    current_day: str | None
    current_slide: int | None
    document_id: str | None

    user_context: UserContext
    level: Level
    retrieval: RetrievalResult
    answer: str
    provider: str

from typing import TypedDict

from app.graph.nodes.database_query import UserContext
from app.graph.nodes.level_analyzer import Level
from app.graph.nodes.retrieval_graph import RetrievedContext


class AgentState(TypedDict, total=False):
    user_id: int
    question: str
    day: str | None
    current_slide: str | None

    user_context: UserContext
    level: Level
    retrieved: RetrievedContext
    answer: str

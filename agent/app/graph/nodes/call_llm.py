from langchain_core.messages import HumanMessage, SystemMessage

from app.graph.nodes.database_query import UserContext
from app.graph.nodes.level_analyzer import Level
from app.graph.nodes.retrieval_graph import RetrievedContext, format_context
from app.graph.prompts import LEVEL_STYLES, SYSTEM_PROMPT, USER_PROMPT_TEMPLATE
from app.llm import get_chat_model


def _format_learning_history(context: UserContext) -> str:
    if not context.quiz_history and not context.learning_progress:
        return "(chưa có dữ liệu)"

    parts = []
    for result in context.quiz_history:
        parts.append(f"Quiz #{result.quiz_id}: {result.score} điểm ({result.correct_answers} đúng)")
    for progress in context.learning_progress:
        status = "đã hoàn thành" if progress.completed else "đang học"
        parts.append(f"{progress.day} slide {progress.slide_page} ({status})")

    return "; ".join(parts)


def call_llm(
    question: str,
    level: Level,
    user_context: UserContext,
    retrieved: RetrievedContext,
    current_slide: str | None = None,
    current_day: str | None = None,
) -> str:
    system_message = SystemMessage(
        content=SYSTEM_PROMPT.format(level_style=LEVEL_STYLES.get(level, LEVEL_STYLES["beginner"]))
    )
    user_message = HumanMessage(
        content=USER_PROMPT_TEMPLATE.format(
            level=level,
            current_day=current_day or "(không rõ)",
            current_slide=current_slide or "(không rõ)",
            learning_history=_format_learning_history(user_context),
            retrieved_context=format_context(retrieved),
            question=question,
        )
    )

    response = get_chat_model().invoke([system_message, user_message])
    return response.content

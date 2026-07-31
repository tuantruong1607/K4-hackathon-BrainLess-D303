from dataclasses import dataclass
from typing import Callable

from langgraph.graph import END, START, StateGraph

from app.chat import ChatProvider
from app.errors import MissingResourceError
from app.graph.nodes.database_query import UserContext
from app.graph.nodes.level_analyzer import Level
from app.graph.state import AgentState
from app.retrieval import HybridRetriever
from app.user_context import UserContextProvider


@dataclass(frozen=True)
class WorkflowDependencies:
    user_context_provider: UserContextProvider
    level_analyzer: Callable[[UserContext], Level]
    retriever: HybridRetriever
    chat_provider: ChatProvider
    retrieval_limit: int


def build_workflow(dependencies: WorkflowDependencies):
    def database_query_node(state: AgentState) -> dict:
        return {
            "user_context": dependencies.user_context_provider.get(state["user_id"])
        }

    def level_analyzer_node(state: AgentState) -> dict:
        return {"level": dependencies.level_analyzer(state["user_context"])}

    def retrieval_graph_node(state: AgentState) -> dict:
        retrieval = dependencies.retriever.retrieve(
            state["question"],
            day=state.get("current_day"),
            document_id=state.get("document_id"),
            limit=dependencies.retrieval_limit,
        )
        if not retrieval.slides:
            raise MissingResourceError("No indexed slides match the request")
        return {"retrieval": retrieval}

    def call_llm_node(state: AgentState) -> dict:
        answer = dependencies.chat_provider.answer(
            question=state["question"],
            level=state["level"],
            user_context=state["user_context"],
            retrieval=state["retrieval"],
            current_day=state.get("current_day"),
            current_slide=state.get("current_slide"),
        )
        return {
            "answer": answer,
            "provider": dependencies.chat_provider.provider_name,
        }

    graph = StateGraph(AgentState)
    graph.add_node("database_query", database_query_node)
    graph.add_node("level_analyzer", level_analyzer_node)
    graph.add_node("retrieval_graph", retrieval_graph_node)
    graph.add_node("call_llm", call_llm_node)
    graph.add_edge(START, "database_query")
    graph.add_edge("database_query", "level_analyzer")
    graph.add_edge("level_analyzer", "retrieval_graph")
    graph.add_edge("retrieval_graph", "call_llm")
    graph.add_edge("call_llm", END)
    return graph.compile()

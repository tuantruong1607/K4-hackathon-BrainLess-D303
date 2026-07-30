from functools import lru_cache

from langgraph.graph import END, START, StateGraph

from app.graph.nodes.call_llm import call_llm
from app.graph.nodes.database_query import database_query
from app.graph.nodes.level_analyzer import analyze_level
from app.graph.nodes.retrieval_graph import retrieval_graph
from app.graph.state import AgentState


def _database_query_node(state: AgentState) -> dict:
    return {"user_context": database_query(state["user_id"])}


def _level_analyzer_node(state: AgentState) -> dict:
    return {"level": analyze_level(state["user_context"])}


def _retrieval_graph_node(state: AgentState) -> dict:
    return {"retrieved": retrieval_graph(state["question"], day=state.get("day"))}


def _call_llm_node(state: AgentState) -> dict:
    answer = call_llm(
        question=state["question"],
        level=state["level"],
        user_context=state["user_context"],
        retrieved=state["retrieved"],
        current_slide=state.get("current_slide"),
        current_day=state.get("day"),
    )
    return {"answer": answer}


@lru_cache
def get_workflow():
    graph = StateGraph(AgentState)

    graph.add_node("database_query", _database_query_node)
    graph.add_node("level_analyzer", _level_analyzer_node)
    graph.add_node("retrieval_graph", _retrieval_graph_node)
    graph.add_node("call_llm", _call_llm_node)

    graph.add_edge(START, "database_query")
    graph.add_edge("database_query", "level_analyzer")
    graph.add_edge("level_analyzer", "retrieval_graph")
    graph.add_edge("retrieval_graph", "call_llm")
    graph.add_edge("call_llm", END)

    return graph.compile()


def run_chat(user_id: int, question: str, day: str | None = None, current_slide: str | None = None) -> AgentState:
    workflow = get_workflow()
    return workflow.invoke(
        {
            "user_id": user_id,
            "question": question,
            "day": day,
            "current_slide": current_slide,
        }
    )

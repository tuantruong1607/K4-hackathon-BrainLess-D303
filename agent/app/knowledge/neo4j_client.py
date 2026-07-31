import re
import unicodedata

from neo4j import Driver, GraphDatabase

from app.errors import DependencyUnavailableError
from app.settings import Settings

VIETNAMESE_STOP_WORDS = {
    "ai",
    "bao",
    "cai",
    "cho",
    "co",
    "cua",
    "gi",
    "hay",
    "la",
    "mot",
    "nao",
    "nhung",
    "tai",
    "the",
    "thi",
    "trong",
    "va",
    "ve",
}


def _search_terms(question: str) -> list[str]:
    """Extract useful terms instead of matching the whole natural-language question."""
    terms = re.findall(r"\w+", question.casefold(), flags=re.UNICODE)
    useful_terms = [
        term
        for term in terms
        if len(term) >= 2
        and "".join(
            character
            for character in unicodedata.normalize("NFD", term.replace("đ", "d"))
            if unicodedata.category(character) != "Mn"
        )
        not in VIETNAMESE_STOP_WORDS
    ]
    return list(dict.fromkeys(useful_terms))[:8]


def get_driver(settings: Settings | None = None) -> Driver:
    selected = settings or Settings()
    selected.validate_runtime()
    if selected.rag_graph_store != "neo4j":
        raise DependencyUnavailableError(
            "Legacy Neo4j facade is disabled unless RAG_GRAPH_STORE=neo4j"
        )
    return GraphDatabase.driver(
        selected.neo4j_uri,
        auth=(
            selected.neo4j_username,
            selected.neo4j_password.get_secret_value(),
        ),
    )


def upsert_node(name: str, description: str, day: str | None = None) -> None:
    with get_driver().session() as session:
        session.run(
            """
            MERGE (n:Concept {name: $name})
            SET n.description = $description
            """,
            name=name,
            description=description,
        )


def upsert_relationship(parent: str, child: str) -> None:
    with get_driver().session() as session:
        session.run(
            """
            MERGE (p:Concept {name: $parent})
            MERGE (c:Concept {name: $child})
            MERGE (p)-[:HAS_CHILD]->(c)
            """,
            parent=parent,
            child=child,
        )


def get_related(name: str, limit: int = 5) -> list[dict]:
    with get_driver().session() as session:
        result = session.run(
            """
            MATCH (n:Concept {name: $name})-[:HAS_CHILD*1..2]-(related:Concept)
            RETURN DISTINCT related.name AS name, related.description AS description
            LIMIT $limit
            """,
            name=name,
            limit=limit,
        )
        return [dict(record) for record in result]


def get_nodes_by_day(day: str, limit: int = 20) -> list[dict]:
    with get_driver().session() as session:
        result = session.run(
            """
            MATCH (slide:Slide {day: $day})-[:MENTIONS]->(n:Concept)
            RETURN DISTINCT n.name AS name, n.description AS description
            LIMIT $limit
            """,
            day=day,
            limit=limit,
        )
        return [dict(record) for record in result]


def find_nodes_by_keyword(keyword: str, limit: int = 5, day: str | None = None) -> list[dict]:
    terms = _search_terms(keyword)
    if not terms:
        return []

    with get_driver().session() as session:
        result = session.run(
            """
            MATCH (n:Concept)
            WHERE ($day IS NULL OR EXISTS {
                    MATCH (:Slide {day: $day})-[:MENTIONS]->(n)
                  })
              AND any(term IN $terms WHERE
                  toLower(n.name) CONTAINS term
                  OR toLower(n.description) CONTAINS term
              )
            RETURN n.name AS name, n.description AS description
            LIMIT $limit
            """,
            terms=terms,
            day=day,
            limit=limit,
        )
        return [dict(record) for record in result]


def close() -> None:
    """Drivers are runtime-owned; this compatibility facade keeps none globally."""

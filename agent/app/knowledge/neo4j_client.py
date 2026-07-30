from functools import lru_cache

from neo4j import Driver, GraphDatabase

from app.config import settings


@lru_cache
def get_driver() -> Driver:
    return GraphDatabase.driver(
        settings.neo4j_uri,
        auth=(settings.neo4j_user, settings.neo4j_password),
    )


def upsert_node(name: str, description: str, day: str | None = None) -> None:
    with get_driver().session() as session:
        session.run(
            """
            MERGE (n:Concept {name: $name})
            SET n.description = $description, n.day = coalesce($day, n.day)
            """,
            name=name,
            description=description,
            day=day,
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


def find_nodes_by_keyword(keyword: str, limit: int = 5) -> list[dict]:
    with get_driver().session() as session:
        result = session.run(
            """
            MATCH (n:Concept)
            WHERE toLower(n.name) CONTAINS toLower($keyword)
               OR toLower(n.description) CONTAINS toLower($keyword)
            RETURN n.name AS name, n.description AS description
            LIMIT $limit
            """,
            keyword=keyword,
            limit=limit,
        )
        return [dict(record) for record in result]


def close() -> None:
    get_driver().close()
    get_driver.cache_clear()

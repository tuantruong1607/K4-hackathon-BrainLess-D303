from types import SimpleNamespace

from qdrant_client.models import WriteOrdering

from agent.app.domain import SlideChunk
from agent.app.stores import Neo4jGraphStore, QdrantVectorStore, VectorRecord


def chunk(
    *,
    document_id: str = "deck",
    version: str = "v2",
    day: str = "day02",
    slide_number: int = 3,
    title: str = "Title",
    content: str = "Content",
    concepts: list[str] | None = None,
) -> SlideChunk:
    return SlideChunk(
        document_id=document_id,
        version=version,
        day=day,
        slide_number=slide_number,
        title=title,
        content=content,
        concepts=["JTBD"] if concepts is None else concepts,
    )


class RecordingQdrantClient:
    def __init__(self) -> None:
        self.batch_call = None
        self.query_call = None
        self.scroll_call = None
        self.query_response = SimpleNamespace(points=[])
        self.scroll_response = ([], None)

    def get_collections(self):
        return SimpleNamespace(collections=[SimpleNamespace(name="slides")])

    def get_collection(self, name):
        assert name == "slides"
        return SimpleNamespace(
            config=SimpleNamespace(
                params=SimpleNamespace(vectors=SimpleNamespace(size=2))
            )
        )

    def batch_update_points(self, **kwargs):
        self.batch_call = kwargs

    def query_points(self, **kwargs):
        self.query_call = kwargs
        return self.query_response

    def scroll(self, **kwargs):
        self.scroll_call = kwargs
        return self.scroll_response


def qdrant_store(client: RecordingQdrantClient) -> QdrantVectorStore:
    store = QdrantVectorStore.__new__(QdrantVectorStore)
    store._client = client
    store._collection = "slides"
    return store


def test_qdrant_replace_uses_strong_ordered_delete_then_upsert_with_full_payload() -> None:
    client = RecordingQdrantClient()
    store = qdrant_store(client)
    source = chunk()

    store.replace_document("deck", [VectorRecord(source, [0.25, 0.75])])

    assert client.batch_call["collection_name"] == "slides"
    assert client.batch_call["wait"] is True
    assert client.batch_call["ordering"] == WriteOrdering.STRONG
    delete, upsert = client.batch_call["update_operations"]
    condition = delete.delete.filter.must[0]
    assert (condition.key, condition.match.value) == ("document_id", "deck")
    point, = upsert.upsert.points
    assert point.vector == [0.25, 0.75]
    assert point.payload == source.to_dict()


def test_qdrant_search_passes_day_and_document_filters_and_converts_hit() -> None:
    client = RecordingQdrantClient()
    source = chunk()
    client.query_response = SimpleNamespace(
        points=[
            SimpleNamespace(
                payload=source.to_dict(),
                score=0.875,
            )
        ]
    )
    store = qdrant_store(client)

    hits = store.search(
        [1.0, 0.0],
        day="day02",
        document_id="deck",
        limit=7,
    )

    assert client.query_call["collection_name"] == "slides"
    assert client.query_call["query"] == [1.0, 0.0]
    assert client.query_call["limit"] == 7
    filters = {
        condition.key: condition.match.value
        for condition in client.query_call["query_filter"].must
    }
    assert filters == {"day": "day02", "document_id": "deck"}
    assert hits[0].chunk == source
    assert hits[0].score == 0.875
    assert hits[0].citation == source.citation


def test_qdrant_snapshot_filters_document_and_preserves_payload_and_vector() -> None:
    client = RecordingQdrantClient()
    source = chunk()
    client.scroll_response = (
        [
            SimpleNamespace(
                payload=source.to_dict(),
                vector=[0.25, 0.75],
            )
        ],
        None,
    )
    store = qdrant_store(client)

    snapshot = store.snapshot_document("deck")

    condition = client.scroll_call["scroll_filter"].must[0]
    assert (condition.key, condition.match.value) == ("document_id", "deck")
    assert client.scroll_call["with_payload"] is True
    assert client.scroll_call["with_vectors"] is True
    assert snapshot == (VectorRecord(source, (0.25, 0.75)),)


class RecordingResult(list):
    def consume(self):
        return None


class RecordingNeo4jSession:
    def __init__(self, records=None) -> None:
        self.calls = []
        self.records = records or []

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, traceback):
        return False

    def run(self, query, **params):
        self.calls.append((query, params))
        return RecordingResult(self.records)


class RecordingNeo4jDriver:
    def __init__(self, records=None) -> None:
        self.session_instance = RecordingNeo4jSession(records)
        self.close_calls = 0

    def session(self):
        return self.session_instance

    def close(self):
        self.close_calls += 1


def neo4j_store(driver: RecordingNeo4jDriver) -> Neo4jGraphStore:
    store = Neo4jGraphStore.__new__(Neo4jGraphStore)
    store._driver = driver
    return store


def test_neo4j_replace_collapses_old_rows_before_unwind_and_keeps_mentions_unscoped() -> None:
    driver = RecordingNeo4jDriver()
    store = neo4j_store(driver)
    slides = [chunk(slide_number=1), chunk(slide_number=2)]

    store.replace_document("deck", slides)

    query, params = driver.session_instance.calls[0]
    assert "collect(old)" in query
    assert query.index("collect(old)") < query.index("UNWIND slide_rows")
    assert "SET mentions.day" not in query
    assert "mentions.version" not in query
    assert params["document_id"] == "deck"
    assert len(params["slides"]) == 2
    assert [row["id"] for row in params["slides"]] == ["deck:v2:1", "deck:v2:2"]


def test_neo4j_expansion_is_anchored_to_hit_slide_ids_and_passes_filters() -> None:
    driver = RecordingNeo4jDriver(
        [{"name": "JTBD", "slide_ids": ["deck:v2:3"]}]
    )
    store = neo4j_store(driver)

    concepts = store.expand_from_slides(
        ["deck:v2:3"],
        day="day02",
        document_id="deck",
    )

    query, params = driver.session_instance.calls[0]
    assert "slide.id IN $slide_ids" in query
    assert params == {
        "slide_ids": ["deck:v2:3"],
        "day": "day02",
        "document_id": "deck",
    }
    assert concepts[0].name == "JTBD"
    assert concepts[0].slide_ids == ("deck:v2:3",)


def test_neo4j_snapshot_reconstructs_document_for_rollback() -> None:
    driver = RecordingNeo4jDriver(
        [
            {
                "document_id": "deck",
                "version": "v2",
                "day": "day02",
                "slide_number": 3,
                "title": "Title",
                "content": "Content",
                "concepts": ["JTBD"],
            }
        ]
    )
    store = neo4j_store(driver)

    snapshot = store.snapshot_document("deck")

    query, params = driver.session_instance.calls[0]
    assert "OPTIONAL MATCH (slide)-[:MENTIONS]->(concept:Concept)" in query
    assert params == {"document_id": "deck"}
    assert snapshot == (chunk(),)


def test_neo4j_close_is_idempotent_across_store_and_runtime_ownership() -> None:
    from app.runtime import build_runtime
    from app.settings import Settings

    driver = RecordingNeo4jDriver()
    store = neo4j_store(driver)
    runtime = build_runtime(Settings(_env_file=None))
    runtime.graph_store = store

    store.close()
    runtime.close()
    store.close()
    runtime.close()

    assert driver.close_calls == 1

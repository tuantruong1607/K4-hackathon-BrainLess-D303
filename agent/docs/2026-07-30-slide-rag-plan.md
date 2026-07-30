# Slide RAG Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the independent Agent service that indexes exactly one vector chunk per slide and retrieves cited slide context for chat and future quiz generation.

**Architecture:** A FastAPI service accepts pre-extracted slide payloads from the backend. The indexing service maps each slide to exactly one `SlideChunk`, embeds it, writes the vector to Qdrant and slide-concept relations to Neo4j; local in-memory stores and a deterministic mock provider keep the service usable without credentials or containers. Retrieval combines ranked vector hits with an optional day/document filter, and the chat service returns the retrieved slide citations.

**Tech Stack:** Python 3.13, FastAPI, Pydantic, Qdrant, Neo4j, OpenAI Python SDK, Docker Compose, `unittest`.

## Global Constraints

- All product files live under `agent/`; do not change frontend or backend files.
- One input slide creates exactly one chunk with the same `slide_number`; never split a slide by length or overlap.
- Default runtime mode is deterministic `mock`; live OpenAI calls happen only when `RAG_PROVIDER=openai` and `OPENAI_API_KEY` is set.
- Default production stores are Qdrant and Neo4j; `memory` mode is supported solely for local development and credential-free tests.
- Secrets are never committed; `.env.example` contains variable names and non-secret defaults only.
- Unit tests must not make network, container, or OpenAI calls.

---

### Task 1: Core slide chunk and in-memory retrieval

**Files:**
- Create: `agent/app/__init__.py`
- Create: `agent/app/domain.py`
- Create: `agent/app/retrieval.py`
- Create: `agent/tests/__init__.py`
- Test: `agent/tests/test_slide_chunking.py`
- Test: `agent/tests/test_retrieval.py`

**Interfaces:**
- Produces `SlideInput`, `SlideChunk`, `build_slide_chunks(slides)`, `RetrievedSlide`, and `rank_chunks(question, chunks, day=None, limit=5)`.
- `SlideInput` contains `slide_number`, `title`, `content`, and `concepts`; `SlideChunk` preserves those values and derives its id from document id, version, and slide number.

- [ ] **Step 1: Write failing tests for one-slide-one-chunk and day-filtered ranking**

```python
chunks = build_slide_chunks("jtbd-day-01", "day01", "v1", slides)
assert [chunk.slide_number for chunk in chunks] == [1, 2]
assert len(chunks) == 2
assert rank_chunks("push", chunks, day="day01", limit=1)[0].chunk.slide_number == 2
```

- [ ] **Step 2: Run the focused tests and confirm they fail because the domain API does not exist**

Run: `python -m unittest agent.tests.test_slide_chunking agent.tests.test_retrieval -v`

- [ ] **Step 3: Implement immutable slide records, one-to-one chunk construction, token-overlap ranking, and deterministic tie-breaking by slide number**

```python
def build_slide_chunks(document_id: str, day: str, version: str, slides: Sequence[SlideInput]) -> list[SlideChunk]:
    return [SlideChunk.from_slide(document_id, day, version, slide) for slide in slides]
```

- [ ] **Step 4: Re-run the focused tests and confirm they pass without external services**

Run: `python -m unittest agent.tests.test_slide_chunking agent.tests.test_retrieval -v`

### Task 2: Indexing, provider configuration, and production adapters

**Files:**
- Create: `agent/app/settings.py`
- Create: `agent/app/providers.py`
- Create: `agent/app/stores.py`
- Create: `agent/app/indexing.py`
- Create: `agent/.env.example`
- Create: `agent/requirements.txt`
- Create: `agent/docker-compose.yml`
- Test: `agent/tests/test_indexing.py`

**Interfaces:**
- Consumes `SlideChunk` and produces `IndexResult(indexed_chunks, concepts)` through `RagIndexer.index(document_id, day, version, slides)`.
- `EmbeddingProvider.embed(text)` returns a numeric vector; `MockEmbeddingProvider` is deterministic and `OpenAIEmbeddingProvider` is selected only by the explicitly configured provider mode.
- `VectorStore.upsert(chunk, vector)` and `GraphStore.upsert_slide(chunk)` are implemented by memory, Qdrant, and Neo4j adapters.

- [ ] **Step 1: Write failing tests that index two slides as two vectors and create the deduplicated concept set**

```python
result = indexer.index("jtbd-day-01", "day01", "v1", slides)
assert result.indexed_chunks == 2
assert result.concepts == ("Pull", "Push")
assert memory_vectors.count == 2
```

- [ ] **Step 2: Run the focused test and confirm it fails because `RagIndexer` is unavailable**

Run: `python -m unittest agent.tests.test_indexing -v`

- [ ] **Step 3: Implement memory adapters, lazy Qdrant/Neo4j/OpenAI adapters, environment settings, and Docker Compose services**

```python
if settings.provider == "openai":
    embedding_provider = OpenAIEmbeddingProvider(settings)
else:
    embedding_provider = MockEmbeddingProvider()
```

- [ ] **Step 4: Re-run the focused test and confirm it passes with mock embeddings and stores**

Run: `python -m unittest agent.tests.test_indexing -v`

### Task 3: Retrieval/chat service and HTTP contract

**Files:**
- Create: `agent/app/services.py`
- Create: `agent/app/main.py`
- Create: `agent/data/sample_slides.json`
- Create: `agent/README.md`
- Test: `agent/tests/test_services.py`

**Interfaces:**
- `RagService.build_graph(request)` indexes each submitted slide once.
- `RagService.retrieve(question, day=None, document_id=None, limit=5)` returns ranked cited slides.
- `RagService.chat(question, user_id, current_day, current_slide)` returns `{answer, sources, provider}`; `MockChatProvider` never calls a network.
- HTTP endpoints: `GET /health`, `POST /build-graph`, `POST /retrieve`, and `POST /chat`.

- [ ] **Step 1: Write failing service tests for retrieved citations and a mock chat answer grounded in the top slide**

```python
answer = service.chat("Push là gì?", user_id=1, current_day="day01", current_slide=3)
assert answer.provider == "mock"
assert answer.sources[0].slide_number == 3
assert "Push" in answer.answer
```

- [ ] **Step 2: Run the focused test and confirm it fails because `RagService` is unavailable**

Run: `python -m unittest agent.tests.test_services -v`

- [ ] **Step 3: Implement the service, FastAPI request/response models, routes, sample JTBD slides, and run instructions**

```python
@app.post("/retrieve")
def retrieve(request: RetrieveRequest) -> RetrieveResponse:
    return service.retrieve(request.question, request.day, request.document_id, request.limit)
```

- [ ] **Step 4: Re-run all Agent unit tests and compile the package without calling OpenAI**

Run: `python -m unittest discover -s agent/tests -v`

Run: `python -m compileall -q agent/app`

## Test Plan

- Verify a three-slide payload yields exactly three chunks and preserves slide numbers.
- Verify retrieval chooses a slide containing the query concept, restricts results to `day`, and returns source metadata.
- Verify indexing writes one vector per slide and de-duplicates concept nodes.
- Verify mock chat includes retrieved slide evidence and never needs `OPENAI_API_KEY`.
- Do not run a live OpenAI smoke test until collaborators supply a key in an ignored `agent/.env` file.

## Assumptions

- Backend/Admin supplies pre-extracted slide text as JSON; PDF/PPTX text extraction is a separate ingestion concern.
- `text-embedding-3-small` is the default embedding model; chat model is configurable through `OPENAI_CHAT_MODEL` and defaults to `gpt-5.6-sol` when OpenAI mode is enabled.
- Qdrant and Neo4j are started locally with `docker compose -f agent/docker-compose.yml up -d` before production-mode indexing.

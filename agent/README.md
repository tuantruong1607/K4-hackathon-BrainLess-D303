# Slide RAG Agent

This independent FastAPI service accepts pre-extracted slide JSON. Text
extraction from PDF or PowerPoint is outside this service: each submitted
slide becomes exactly one vector chunk and retains its source metadata for
citations.

## Local mock mode

Mock providers and in-memory stores are the defaults. They are deterministic,
need no containers or credentials, and make no network calls. No unit test
uses an API key.

From the repository root:

```powershell
python -m unittest discover -s agent/tests -v
uvicorn agent.app.main:app --reload
```

Submit `agent/data/sample_slides.json` to `POST /build-graph`, then use
`POST /retrieve` or `POST /chat`. The service also exposes `GET /health`.
Uvicorn owns the host and port; the application does not bind either one.

## Production mode

From the `agent` directory, start Qdrant and Neo4j:

```powershell
docker compose -f docker-compose.yml up -d
```

Production requires these selections:

```text
RAG_PROVIDER=openai
RAG_VECTOR_STORE=qdrant
RAG_GRAPH_STORE=neo4j
```

Create a local, Git-ignored `.env` containing `OPENAI_API_KEY` plus the
service URLs and Neo4j credentials shown in `.env.example`. Load those
variables into the process environment before starting Uvicorn. Live
embeddings and Responses API calls occur only with
`RAG_PROVIDER=openai` and a configured key; production retrieval is backed
by Qdrant.

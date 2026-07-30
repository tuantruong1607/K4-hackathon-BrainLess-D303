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

## Local Compose infrastructure

The bundled Compose file is for local development and live-integration testing
only. Its database ports are bound to `127.0.0.1`; it is not a production
deployment configuration.

From the `agent` directory, copy `.env.example` to the Git-ignored `.env`, set
a non-default local Neo4j password in both `NEO4J_PASSWORD` and
`NEO4J_AUTH=neo4j/<that-password>`, then start Qdrant and Neo4j:

```powershell
docker compose -f docker-compose.yml up -d
```

To test the live-provider path against that local stack, use these selections:

```text
RAG_PROVIDER=openai
RAG_VECTOR_STORE=qdrant
RAG_GRAPH_STORE=neo4j
```

Add `OPENAI_API_KEY` to the local `.env` and load the variables into the
process environment before starting Uvicorn. Live
embeddings and Responses API calls occur only with
`RAG_PROVIDER=openai` and a configured key; production retrieval is backed
by Qdrant.

## Real deployment

Deploy Qdrant and Neo4j as authenticated, TLS-managed services outside this
Compose file. Use encrypted service endpoints, managed secrets, restricted
network access, backups, and deployment-specific credentials; do not publish
the local development database containers to an untrusted network.

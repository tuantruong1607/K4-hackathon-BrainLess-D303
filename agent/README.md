# VLearn Agent Graph (RAG)

FastAPI service for slide-native RAG, learner-level personalization, tutor chat,
and quiz generation. The Agent listens on port `8300` and is intended to be
called by the Backend API, not directly by the frontend.

The default runtime is fully offline:

| Setting | Default | Live option |
| --- | --- | --- |
| `RAG_PROVIDER` | `mock` | `openai` |
| `CHAT_PROVIDER` | inherits `RAG_PROVIDER` | `openai` |
| `RAG_VECTOR_STORE` | `memory` | `qdrant` |
| `RAG_GRAPH_STORE` | `memory` | `neo4j` |
| `USER_CONTEXT_PROVIDER` | `mock` | `postgres` |

## Setup with uv

Run these commands from the workspace root:

```powershell
uv venv agent/.venv --python 3.13
uv pip sync --python agent/.venv/Scripts/python.exe agent/requirements.txt
uv pip check --python agent/.venv/Scripts/python.exe
Copy-Item agent/.env.example agent/.env
```

The checked-in `.env.example` contains no usable credentials. Its default mock
configuration does not require an API key, Docker, or network access.

Start the service:

```powershell
agent/.venv/Scripts/python.exe -m uvicorn app.main:app --app-dir agent --host 127.0.0.1 --port 8300
```

OpenAPI is available at `http://127.0.0.1:8300/docs`.

## Live local infrastructure

To use live providers, fill the relevant values in `agent/.env` and select:

```dotenv
RAG_PROVIDER=openai
CHAT_PROVIDER=openai
RAG_VECTOR_STORE=qdrant
RAG_GRAPH_STORE=neo4j
USER_CONTEXT_PROVIDER=postgres
```

`OPENAI_API_KEY`, `NEO4J_PASSWORD`, and `DATABASE_URL` are required when their
providers are selected. Compose also requires `NEO4J_USERNAME`, `POSTGRES_DB`,
`POSTGRES_USER`, and `POSTGRES_PASSWORD`.

For a lower-data local setup, use `RAG_PROVIDER=mock` and
`CHAT_PROVIDER=openai`. Indexing then stays local; only the retrieved slide
excerpts needed for a learner's question are sent to the chat model.

Start Qdrant, Neo4j, and PostgreSQL as separate localhost-bound services:

```powershell
docker compose --env-file agent/.env -f agent/docker-compose.yml up -d
```

The Backend owns the production PostgreSQL schema and migrations. For local
integration only, the Agent repository includes a schema/seed helper:

```powershell
agent/.venv/Scripts/python.exe agent/scripts/init_local_db.py
```

The Agent's PostgreSQL repository enforces read-only statements at runtime.

## Ingestion

`POST /build-graph` with a typed JSON body is the canonical ingestion contract.
It indexes one vector record per supplied slide. It does not scan the filesystem
and it does not split long slide content.

The local file adapter accepts `.pdf`, `.txt`, `.md`, and `.docx` files from
`RAG_DATA_DIR`. A PDF page becomes one slide; text, Markdown, and DOCX files each
become one slide. Run the adapter with:

```powershell
agent/.venv/Scripts/python.exe agent/scripts/build_graph.py
```

See [RAG_README.md](RAG_README.md) for the domain model, indexing semantics,
retrieval flow, and complete request/response shapes.

## API

| Endpoint | Purpose |
| --- | --- |
| `POST /build-graph` | Replace one document's active slide index |
| `POST /retrieve` | Return citations and graph concepts for vector hits |
| `POST /chat` | Run personalized, source-grounded tutor chat |
| `POST /generate-quiz` | Generate validated four-choice questions from RAG |
| `POST /analyze-level` | Derive learner level from user context |
| `POST /embedding` | Return the configured provider's embedding |
| `GET /health` | Report selected runtime providers |

The workflow order is:

```text
database_query -> level_analyzer -> retrieval_graph -> call_llm
```

Error mapping is stable: `422` invalid payload, `409` missing index/context,
`503` invalid live configuration or unavailable dependency, and `502` upstream
provider/store failure. Public errors do not expose raw exceptions or secrets.

## Tests

The default suite runs entirely in mock mode:

```powershell
agent/.venv/Scripts/python.exe -m pytest agent/tests -v
agent/.venv/Scripts/python.exe -m compileall -q agent/app agent/scripts
```

Live store tests are marked `integration` and skipped unless explicitly enabled.
After starting Compose and running `init_local_db.py`:

```powershell
$env:RUN_AGENT_INTEGRATION="1"
agent/.venv/Scripts/python.exe -m pytest agent/tests/test_live_integration.py -m integration -v
```

An OpenAI smoke test is optional and must never be run without an explicitly
configured key.

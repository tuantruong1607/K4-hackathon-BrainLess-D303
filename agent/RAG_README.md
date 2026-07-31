# Slide-native RAG contract

## Invariants

- One source slide always produces exactly one `SlideChunk` and one vector record.
- A PDF page is a source slide. Long content is never split by character or token count.
- A chunk ID is stable: `{document_id}:{version}:{slide_number}`.
- `day` and `version` belong to `Slide`; they are not properties of `Concept`.
- Retrieval citations always contain the full source metadata and score.
- The JSON API is canonical. Filesystem ingestion is only a local adapter.

## Domain model

```text
SlideInput {
  document_id, version, day, slide_number, title, content, concepts
}

SlideChunk {
  document_id, version, day, slide_number, title, content, concepts
}
```

`concepts` supplied by the caller are preserved. When the list is empty, the
configured concept extractor supplies concepts before indexing. Embeddings use
`title + content`.

## Indexing lifecycle

`RagIndexer` prepares every slide, concept list, and embedding before modifying
either store. A successful re-index replaces all active records for the same
`document_id`, including records from older versions.

The vector and graph stores are snapshotted before replacement. If either commit
fails, the indexer attempts to restore both snapshots. A rollback failure is
reported explicitly rather than leaving the operation looking successful.

Qdrant runs as a service, not in embedded mode. Collection dimensions are derived
from the prepared embedding and checked against an existing collection before a
write or search. Old embedded data is derived data and should be rebuilt.

Neo4j stores:

```text
(Slide)-[:MENTIONS]->(Concept)
```

Concept nodes are merged by name. The same concept can therefore be mentioned by
slides from multiple days without one day overwriting another.

## Retrieval flow

```text
question
  -> embedding provider
  -> vector search filtered by day/document_id
  -> ordered slide hits with scores
  -> graph expansion anchored only to hit slide IDs
  -> citations + graph nodes
```

Memory providers are deterministic and offline. Live mode can independently
select OpenAI, Qdrant, Neo4j, and PostgreSQL through `Settings`.

## API contract

### `POST /build-graph`

Request:

```json
{
  "document_id": "jtbd-course",
  "version": "v2",
  "day": "day01",
  "slides": [
    {
      "slide_number": 1,
      "title": "Jobs To Be Done",
      "content": "Customers hire products to make progress.",
      "concepts": ["JTBD", "Progress"]
    }
  ]
}
```

Response:

```json
{
  "indexed_slides": 1,
  "concepts": ["JTBD", "Progress"]
}
```

### `POST /retrieve`

Request:

```json
{
  "question": "JTBD giải thích progress như thế nào?",
  "day": "day01",
  "document_id": "jtbd-course",
  "limit": 5
}
```

Response shape:

```text
RetrieveResponse {
  sources: Citation[]
  graph_nodes: GraphNode[]
  related_nodes: GraphNode[]
}

Citation {
  document_id, version, day, slide_number,
  title, content, concepts, score
}
```

### `POST /chat`

Request:

```json
{
  "user_id": 1,
  "question": "Push và Pull khác nhau thế nào?",
  "current_day": "day01",
  "current_slide": 3
}
```

Response shape:

```text
ChatResponse {
  answer: string
  level: "beginner" | "intermediate" | "advanced"
  provider: string
  sources: Citation[]
}
```

### Other typed endpoints

- `POST /generate-quiz`: validates count, four unique answers, the correct answer,
  and that every `knowledge_node` comes from retrieved context.
- `POST /analyze-level`: reads mock or read-only PostgreSQL user context.
- `POST /embedding`: uses the runtime-owned embedding provider.
- `GET /health`: reports configured provider/store modes.

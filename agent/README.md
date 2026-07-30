# VLearn Agent Graph (RAG)

Service AI độc lập (Member 2 trong `CLAUDE.md`) chịu trách nhiệm RAG, Knowledge Graph,
cá nhân hóa câu trả lời theo level, và sinh câu hỏi quiz. Chạy trên **port 8300**, chỉ được
gọi bởi Backend (port 8200) — không expose ra ngoài cho frontend.

## Stack

- FastAPI
- LangGraph + LangChain (graph workflow, OpenAI chat/embeddings)
- Neo4j (Knowledge Graph)
- Qdrant (vector store, chạy **local/embedded**, không cần server riêng)
- PostgreSQL + SQLAlchemy (đọc quiz_results / learning_progress / users — schema do Backend/Member 1 sở hữu)

## Setup

```bash
cd agent
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux

pip install -r requirements.txt
copy .env.example .env        # rồi điền OPENAI_API_KEY thật
```

### Hạ tầng local (Neo4j + Postgres)

```bash
docker compose up -d
```

Qdrant không cần container — `qdrant-client` chạy ở chế độ local, lưu vào `agent/data/qdrant/`.

### Dữ liệu Postgres cho local dev

Schema thật (users, quizzes, quiz_results, learning_progress...) và migrations do **Backend
(Member 1)** sở hữu qua Alembic. Trước khi có instance dùng chung, script dưới đây tạo bảng +
seed 1 user mẫu để test `database_query`/`level_analyzer`/`/analyze-level`:

```bash
python scripts/init_local_db.py
```

## Build Knowledge Graph + vector index

Thả file `.txt`, `.md`, `.pdf`, `.docx` vào `agent/data/raw/` (tên file bắt đầu bằng `d1`, `d2`,
`d3`... hoặc chứa `day01`/`day02`/`day03` để suy ra đúng ngày học), rồi chạy:

```bash
python scripts/build_graph.py
```

Script này: nạp slide → chunk → embed vào Qdrant → dùng LLM trích khái niệm (concept) và quan hệ
cha-con → ghi vào Neo4j.

## Chạy service

```bash
uvicorn app.main:app --reload --port 8300
```

## API contract (đúng theo CLAUDE.md)

### `POST /chat`

```json
{ "user_id": 1, "question": "Push là gì?", "day": "day01", "current_slide": "JTBD Foundations" }
```

→ Chạy graph workflow: `database_query → level_analyzer → retrieval_graph → call_llm`.

```json
{ "answer": "...", "level": "intermediate" }
```

### `POST /generate-quiz`

```json
{ "day": "day01", "difficulty": "medium", "count": 5 }
```

```json
{ "questions": [{ "question": "...", "answers": ["A","B","C","D"], "correct_answer": "...", "explanation": "...", "knowledge_node": "JTBD" }] }
```

### `POST /build-graph`

Không cần body — chạy lại `graph_builder` trên toàn bộ `agent/data/raw/`.

### `POST /analyze-level`

```json
{ "user_id": 1 }
```
→ `{ "level": "beginner" | "intermediate" | "advanced" }`

### `POST /retrieve`

```json
{ "question": "JTBD là gì?", "day": "day01" }
```
→ `{ "slide_chunks": [...], "graph_nodes": [...], "related_nodes": [...] }`

### `POST /embedding`

```json
{ "text": "Push là gì?" }
```
→ `{ "embedding": [0.01, -0.02, ...] }`

Lỗi: `422` khi request sai schema, `502` khi OpenAI/Neo4j/Qdrant/Postgres lỗi.

## Ghi chú thiết kế

- **Không có CORS**: theo kiến trúc, chỉ Backend (8200) gọi Agent (8300) qua REST nội bộ.
  Frontend không bao giờ gọi thẳng service này.
- **`knowledge_graph` table trong Postgres** (liệt kê ở phần Database của CLAUDE.md) không được
  dùng — Agent lưu Knowledge Graph thật trong Neo4j (đúng theo mục Tech Stack của Agent), tránh
  trùng lặp nguồn dữ liệu.
- **level_analyzer** hiện dựa trên điểm trung bình quiz gần nhất; schema `quiz_results` chưa có
  breakdown theo topic nên "Wrong Topic" trong spec chưa tách riêng được, chỉ phản ánh gián tiếp
  qua điểm số.

## Tests

```bash
pytest
```

Toàn bộ test mock LLM/embeddings/DB ở tầng route nên chạy được mà không cần Docker/API key thật.
Để test thật với dữ liệu thật, dùng các script `scripts/init_local_db.py` + `scripts/build_graph.py`
sau khi có `docker compose up -d` và `OPENAI_API_KEY` thật.

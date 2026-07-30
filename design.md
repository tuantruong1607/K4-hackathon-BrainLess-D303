# Prompt cho Team Vibe Coding
## AI Learning Platform - Multi-Service Architecture

# Mục tiêu
Xây dựng hệ thống AI Learning Platform gồm 3 service độc lập nhưng có thể chạy đồng thời.

```
Frontend (React/NextJS)      : http://localhost:4175
Backend API (FastAPI/NestJS) : http://localhost:8200
Agent Graph RAG              : http://localhost:8300
```

Tất cả API phải thống nhất contract để có thể merge mà không conflict.

---

# Kiến trúc tổng thể

```
                    +----------------------+
                    |      Frontend        |
                    |      Port 4175       |
                    +----------+-----------+
                               |
                 REST / SSE / WebSocket
                               |
        +----------------------+----------------------+
        |                                             |
        |                                             |
+-------v--------+                           +---------v---------+
|   Backend      |                           |   Agent Graph     |
|    Port 8200   | <-----------------------> |     Port 8300     |
|                |      Internal API         |                   |
+-------+--------+                           +---------+---------+
        |                                              |
        |                                              |
        +----------------------+-----------------------+
                               |
                        PostgreSQL
                               |
          Users / Quiz / Result / Progress / Slides
                               |
                         Knowledge Graph
```

---

# Database

## users

```
id
email
password_hash
fullname
role
level
created_at
```

---

## admins

```
id
email
password_hash
name
```

---

## quizzes

```
id
title
day
difficulty
is_active
start_time
end_time
created_by
```

---

## quiz_questions

```
id
quiz_id
question
option_a
option_b
option_c
option_d
correct_answer
difficulty
knowledge_node
```

---

## quiz_results

```
id
user_id
quiz_id
score
correct_answers
wrong_answers
time_spent
created_at
```

---

## learning_progress

```
id
user_id
day
slide_page
completed
last_access
```

---

## slide_documents

```
id
day
title
pdf_path
preview_path
```

---

## knowledge_graph

```
id
node_name
description
embedding
parent
children
```

---

# Service phân chia

---

# Thành viên 1

## Backend API (Port 8200)

### Chịu trách nhiệm

- Authentication

- User CRUD

- Admin CRUD

- Learning Progress

- Quiz CRUD

- Quiz Result

- API Gateway cho Agent

### API

```
POST /auth/login

POST /auth/register

GET /users/me

GET /users

PUT /users/:id

DELETE /users/:id

GET /quiz

POST /quiz

PUT /quiz/:id

DELETE /quiz/:id

POST /quiz/submit

GET /progress

POST /progress

GET /slide/day/:id

POST /agent/ask
```

### Không được

- Không xử lý RAG

- Không gọi LLM trực tiếp

- Không generate quiz

---

# Thành viên 2

# Agent Graph (Port 8300)

Service AI hoàn toàn độc lập.

### Scope

```
Graph Workflow

START

↓

Retrieve Knowledge

↓

Database Query

↓

Knowledge Graph

↓

Retrieval

↓

Level Analyzer

↓

Prompt Builder

↓

LLM

↓

Response

↓

END
```

---

## Các node bắt buộc

### database_query

Truy vấn:

```
Quiz Result

Learning Progress

Current Level

History
```

---

### retrieval_graph

Lấy context từ

```
Knowledge Graph

Vector Search

Related Node

Slide Content
```

---

### call_llm

Prompt bao gồm

```
User Level

Learning History

Current Slide

Retrieved Context

Question
```

---

### level_analyzer

Input

```
Quiz Score

Wrong Topic

Learning History
```

Output

```
Beginner

Intermediate

Advanced
```

---

### question_generator

Sinh câu hỏi

Input

```
Knowledge Graph

Slide

Difficulty
```

Output

```
Question

4 Answers

Correct Answer

Explanation

Knowledge Node
```

---

### graph_builder

Import slide

↓

Chunk

↓

Embedding

↓

Graph Relation

↓

Store

---

## API

```
POST /chat

POST /generate-quiz

POST /build-graph

POST /analyze-level

POST /retrieve

POST /embedding
```

---

# Thành viên 3

## Admin Dashboard

Frontend riêng

Không chỉnh sửa Student UI.

### Module

---

## Dashboard

```
Total User

Today's Active

Quiz Count

Average Score

Learning Progress
```

---

## Quiz Management

CRUD

```
Create Quiz

Edit

Delete

Activate

Deactivate

Search

Filter
```

---

## Question Management

```
Create

Update

Delete

Import

Export

Generate by AI
```

Generate Question

↓

Backend

↓

Agent

↓

Graph RAG

↓

Return Questions

---

## User Management

```
Search

Ban

Reset Password

Learning Progress

Quiz History

Current Level
```

---

## Quiz Scheduler

```
Quiz

↓

Start Time

↓

End Time

↓

Auto Open

↓

Auto Close
```

Admin có thể

```
Enable

Disable

Edit Schedule
```

---

## Slide Management

```
Upload PDF

Preview

Assign Day

Version
```

---

# Contract giữa Backend và Agent

Backend gọi

```
POST /generate-quiz

{
    "day":"day01",
    "difficulty":"medium",
    "count":10
}
```

Agent trả về

```
{
    "questions":[]
}
```

---

Backend hỏi AI

```
POST /chat

{
    "user_id":1,
    "question":"Push là gì?"
}
```

Agent tự

```
Database Query

↓

Retrieve Graph

↓

Call LLM

↓

Response
```

---

# AI Personalization

Agent KHÔNG trả lời giống nhau.

Prompt luôn gồm

```
Current Level

Quiz History

Learning Progress

Current Slide

Current Day

Retrieved Knowledge
```

Ví dụ

```
Beginner

↓

Giải thích đơn giản

↓

Ví dụ nhiều

↓

Không dùng thuật ngữ
```

---

```
Intermediate

↓

Giải thích

↓

So sánh

↓

Có ví dụ
```

---

```
Advanced

↓

Giải thích chuyên sâu

↓

Case Study

↓

Liên hệ thực tế
```

---

# Knowledge Graph

```
Slide

↓

Chunk

↓

Embedding

↓

Knowledge Node

↓

Relationship

↓

Vector Store
```

Ví dụ

```
JTBD

├── Outcome

├── Push

├── Pull

├── Habit

└── Anxiety
```

---

# Quy tắc làm việc

Mỗi thành viên chỉ được sửa thư mục của mình.

```
frontend/
    admin/

backend/

agent/
```

Không được sửa code của team khác nếu chưa thống nhất.

---

# Tech Stack

## Frontend

- React + Vite
- TailwindCSS
- TanStack Query
- React Router
- Shadcn UI

---

## Backend

- FastAPI
- SQLAlchemy
- PostgreSQL
- JWT
- Alembic
- Redis (optional)

---

## Agent

- LangGraph
- LangChain
- Neo4j (Knowledge Graph)
- Qdrant (Vector Database)
- OpenAI/Gemini
- FastAPI

---

## Database

- PostgreSQL

---

# Definition of Done

## Backend

- Authentication hoàn chỉnh.
- CRUD User/Admin/Quiz hoạt động.
- Quiz Result và Learning Progress được lưu.
- Backend giao tiếp được với Agent qua REST API.

---

## Agent

- Build được Knowledge Graph từ slide.
- Retrieval Graph hoạt động.
- Cá nhân hóa câu trả lời theo level người học.
- Sinh câu hỏi từ RAG theo độ khó.
- Trả lời AI Tutor dựa trên ngữ cảnh bài học và lịch sử học tập.

---

## Admin Dashboard

- Quản lý User.
- Quản lý Quiz và Question.
- Thiết lập lịch mở/đóng Quiz.
- Upload và quản lý Slide.
- Theo dõi tiến độ học và thống kê kết quả.

---

# Mục tiêu cuối cùng

- Frontend học viên (4175) chỉ gọi Backend.
- Backend (8200) quản lý nghiệp vụ và dữ liệu.
- Agent (8300) chịu trách nhiệm AI, Graph RAG, Retrieval, Personalization và Question Generation.
- Ba service có thể phát triển song song, giao tiếp qua API contract cố định, giúp các thành viên trong team làm việc độc lập nhưng khi merge vẫn hoạt động mượt mà.
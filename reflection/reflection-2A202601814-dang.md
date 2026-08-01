# Nhật ký & Nhìn lại Cá nhân (Personal Reflection) — VLearn AI Tutor

> **Dự án:** VLearn — Adaptive Learning Classroom & AI Tutor  
> **Thành viên thực hiện:** Đào Hải Đăng - 2A202601814  
> **Repository:** `tuantruong1607/K4-hackathon-BrainLess-D303`  
> **Vai trò:** LangGraph Workflow & Knowledge Graph Infra Engineer  
> **Thời gian:** VinAI Hackathon K4  

---

## 1. Tổng quan & Vai trò Cá nhân

Trong dự án **VLearn**, tôi đảm nhận vai trò **LangGraph Workflow & Knowledge Graph Infra Engineer**. Nhiệm vụ chính của tôi là thiết kế hạ tầng tri thức đa tầng (Vector DB + Knowledge Graph + Relational DB) và phối hợp các node xử lý thành luồng Agent hoàn chỉnh bằng **LangGraph**.

Các trách nhiệm cốt lõi:
1. **Dựng Hạ tầng Tri thức (Knowledge Infra):** Cấu hình cơ sở dữ liệu Vector Qdrant (lưu slide embedding), Đồ thị tri thức Neo4j (lưu khái niệm bài học & quan hệ cha-con), và Postgres (lưu lịch sử học tập/quiz).
2. **Xây dựng các Node LangGraph:** Lập trình các node `graph_builder`, `database_query`, `level_analyzer`, `retrieval_graph`, `call_llm` và `question_generator`.
3. **Đóng gói REST API & Workflow:** Ghép nối luồng làm việc theo biểu đồ `START -> database_query -> level_analyzer -> retrieval_graph -> call_llm -> END`, mở các route FastAPI (`/chat`, `/generate-quiz`, `/analyze-level`, `/retrieve`).

---

## 2. Nhật ký Đóng góp theo Lịch sử Commit (Commit History & Milestones)

Chi tiết các mốc đóng góp chính theo lịch sử Git commit:

| Commit Hash | Thời gian | Thông điệp Commit | Phạm vi & Chi tiết Công việc |
|---|---|---|---|
| [`aba1117`](file:///c:/Users/banka/Documents/hackathon-vinai/agent/app/config.py) | 30/07/2026 22:09 | `chore(agent): scaffold Agent Graph RAG service (port 8300)` | **Khởi tạo Dịch vụ Agent:** Đặt bộ khung FastAPI cho dịch vụ Agent (Port 8300), cấu hình `docker-compose.yml` chạy Neo4j và Postgres local. |
| [`9f64b7f`](file:///c:/Users/banka/Documents/hackathon-vinai/agent/app/knowledge/neo4j_client.py) | 30/07/2026 22:09 | `feat(agent): add knowledge infra - loader, chunker, Qdrant, Neo4j, Postgres` | **Xây dựng Hạ tầng Tri thức:** Lập trình các client kết nối Qdrant, Neo4j, loader đọc PDF/MD, và mô hình dữ liệu SQLAlchemy cho Postgres. |
| [`12f1a54`](file:///c:/Users/banka/Documents/hackathon-vinai/agent/app/graph/nodes/database_query.py) | 30/07/2026 22:11 | `feat(agent): add graph_builder, database_query, level_analyzer nodes` | **Node Phân tích & Đồ thị:** Xây dựng `database_query` đọc lịch sử học viên, `level_analyzer` đánh giá trình độ (Beginner/Intermediate/Advanced), và `graph_builder` trích xuất khái niệm Neo4j. |
| [`ff80441`](file:///c:/Users/banka/Documents/hackathon-vinai/agent/app/graph/nodes/retrieval_graph.py) | 30/07/2026 22:13 | `feat(agent): add retrieval_graph and call_llm nodes` | **Node Truy xuất Hybrid & Sinh câu trả lời:** Kết hợp Qdrant Vector Search + Neo4j Graph Traversal; cá nhân hóa prompt theo trình độ người dùng trong node `call_llm`. |
| [`4ece340`](file:///c:/Users/banka/Documents/hackathon-vinai/agent/app/graph/nodes/question_generator.py) | 30/07/2026 22:15 | `feat(agent): add question_generator node` | **Node Tạo Quiz Tự động:** Sinh câu hỏi trắc nghiệm grounded theo khái niệm Neo4j và nội dung slide Qdrant, xuất định dạng Pydantic chuẩn. |
| [`f2b25be`](file:///c:/Users/banka/Documents/hackathon-vinai/agent/app/graph/workflow.py) | 30/07/2026 22:18 | `feat(agent): wire LangGraph workflow and expose FastAPI routes` | **Ghép nối Workflow & Expose API:** Hoàn thiện luồng LangGraph end-to-end, expose các route `/chat`, `/generate-quiz`, `/analyze-level` cho Backend tích hợp. |
| [`f8b2aee`](file:///c:/Users/banka/Documents/hackathon-vinai/agent/tests/test_question_generator.py) | 30/07/2026 22:22 | `test(agent): add test suite, README, and fix generate-quiz bug` | **Test Suite & Sửa lỗi:** Thêm bộ test cho Agent API, viết README hướng dẫn chạy dịch vụ và sửa lỗi sinh quiz. |
| [`0cfffce`](file:///c:/Users/banka/Documents/hackathon-vinai/agent/requirements.txt) | 30/07/2026 22:23 | `chore(agent): pin requirements.txt to validated versions` | **Khóa Phiên bản Thư viện:** Chốt các phiên bản thư viện đã qua kiểm thử cho hệ thống Agent. |
| [`a923a5b`](file:///c:/Users/banka/Documents/hackathon-vinai/agent/app/knowledge/neo4j_client.py) | 30/07/2026 23:43 | `fix(agent): improve knowledge graph retrieval` | **Tối ưu Truy xuất Đồ thị:** Tăng cường truy vấn Cypher trên Neo4j để lấy chính xác các nốt khái niệm liên quan. |
| [`6b6484d`](file:///c:/Users/banka/Documents/hackathon-vinai/agent/app/graph/nodes/question_generator.py) | 30/07/2026 23:46 | `fix(agent): enforce grounded quiz contract` | **Đảm bảo Ràng buộc Quiz Grounded:** Ép buộc các câu hỏi quiz sinh ra phải có căn cứ 100% trong slide bài học. |

---

## 3. Thành tựu Kỹ thuật Nổi bật

1. **Hệ thống Truy xuất Lai (Hybrid Retrieval - Vector + Knowledge Graph):** Kết hợp tìm kiếm ngữ nghĩa theo đoạn văn (Qdrant) với truy vấn mối quan hệ khái niệm (Neo4j Graph), giúp AI Tutor giải thích bài học vừa sâu sắc vừa logic.
2. **Cá nhân hóa theo Trình độ (Adaptive Prompting):** Thiết lập node `level_analyzer` phân loại học viên thành 3 mức: *Beginner* (giải thích đơn giản, nhiều ví dụ), *Intermediate* (so sánh khái niệm), và *Advanced* (bài tập tình huống thực tế).
3. **Sinh đề thi Tự động Ràng buộc Ngữ cảnh (Grounded Quiz Generation):** Sử dụng OpenAI Structured Output kết hợp với Neo4j/Qdrant để tự động sinh câu hỏi trắc nghiệm kèm lời giải thích chính xác theo từng slide.

---

## 4. Phối hợp Nhóm (Team Collaboration)

- **Phối hợp với Nguyễn Minh Hiếu:** Tiếp nhận module Slide Chunking và RAG Core từ Hiếu để tích hợp vào node `retrieval_graph`.
- **Phối hợp với Nguyễn Văn Đức:** Thống nhất định dạng JSON request/response cho route `/chat` và `/generate-quiz` với Backend REST API.
- **Phối hợp với Nguyễn Tuấn Trường:** Hỗ trợ kết nối các endpoint Agent với UI Lớp học và kiểm thử luồng sinh quiz theo thời gian thực.

---

## 5. Nhìn lại & Bài học Kinh nghiệm (Reflection & Lessons Learned)

### 🌟 Những điều làm tốt:
- Dựng xong toàn bộ pipeline Agent phức tạp (LangGraph + Neo4j + Qdrant + Postgres) trong thời gian rất ngắn.
- Các node được phân chia độc lập, rõ ràng, giúp việc debug và mở rộng trở nên dễ dàng.

### 💡 Bài học kinh nghiệm:
- **Tối ưu truy vấn Neo4j:** Việc kết nối Knowledge Graph cần chú ý kiểm soát độ sâu của đồ thị (hop count) để tránh làm tăng độ trễ khi tìm kiếm.
- **Xử lý cấu trúc đầu ra của LLM:** Cần bổ sung cơ chế fallback khi LLM gặp sự cố không sinh đúng JSON schema cho quiz.

---
*Ghi chú: Cập nhật dựa trên lịch sử commit Git thực tế của hệ thống VLearn.*

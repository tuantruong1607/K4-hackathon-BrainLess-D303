# Nhật ký & Nhìn lại Cá nhân (Personal Reflection) — VLearn AI Tutor

> **Dự án:** VLearn — Adaptive Learning Classroom & AI Tutor  
> **Thành viên thực hiện:** Nguyễn Minh Hiếu - 2A202601816  
> **Repository:** `tuantruong1607/K4-hackathon-BrainLess-D303`  
> **Vai trò:** AI Agent & RAG Core Architect  
> **Thời gian:** VinAI Hackathon K4  

---

## 1. Tổng quan & Vai trò Cá nhân

Trong dự án **VLearn**, tôi đảm nhận vai trò **AI Agent & RAG Core Architect**, chịu trách nhiệm chính về kiến trúc xử lý tài liệu, thuật toán RAG (Retrieval-Augmented Generation), quản lý vòng đời Runtime của Agent và tối ưu hóa khả năng truy xuất slide bài giảng.

Các nhiệm vụ trọng tâm:
1. **Thiết kế Kiến trúc Agent (Agent Design & Specs):** Soạn thảo tài liệu định hướng kiến trúc RAG và luồng xử lý Agent (`Design.md`).
2. **Core RAG & Retrieval Engine:** Xây dựng lõi truy xuất slide-native (Slide Chunk Retrieval), tối ưu thuật toán cắt nhỏ tài liệu (chunking bounds) và bộ chuyển đổi chỉ mục (RAG Indexing Adapters).
3. **Runtime & Dependency Management:** Thiết kế Container Runtime cho Agent, inject API RAG có kiểu dữ liệu (Typed RAG API), xử lý khôi phục thay thế tài liệu (recoverable document replacement) và quản lý phụ thuộc Python 3.13.

---

## 2. Nhật ký Đóng góp theo Lịch sử Commit (Commit History & Milestones)

Dưới đây là bảng tổng hợp các commit chính của tôi trong repository:

| Commit Hash | Thời gian | Thông điệp Commit | Phạm vi & Chi tiết Công việc |
|---|---|---|---|
| [`c87b1a3`](file:///c:/Users/banka/Documents/hackathon-vinai/agent/Design.md) | 30/07/2026 19:46 | `Design.md for agents` | **Thiết kế Kiến trúc:** Xây dựng file thiết kế tổng thể kiến trúc Agent, định nghĩa các luồng RAG, cấu trúc dữ liệu và API contract cho hệ thống Agent. |
| [`07a05aa`](file:///c:/Users/banka/Documents/hackathon-vinai/agent/app/retrieval.py) | 30/07/2026 23:46 | `feat(agent): add slide chunk retrieval core` | **Phát triển Core Retrieval:** Tạo module truy xuất slide chunk (`retrieval.py`, `domain.py`) và bộ unit test kiểm thử thuật toán tìm kiếm đoạn slide liên quan. |
| [`983a3d3`](file:///c:/Users/banka/Documents/hackathon-vinai/agent/app/indexing.py) | 30/07/2026 23:52 | `feat(agent): add RAG indexing adapters` | **RAG Indexing Adapters:** Phát triển các adapter đánh chỉ mục RAG, bổ sung cấu hình môi trường và hỗ trợ Docker Compose cho dịch vụ Agent. |
| [`beac4ca`](file:///c:/Users/banka/Documents/hackathon-vinai/agent/app/settings.py) | 30/07/2026 23:59 | `fix(agent): hide RAG settings secrets` | **Bảo mật Cấu hình:** Ẩn các secret và API Key trong cài đặt RAG, đảm bảo an toàn cho môi trường runtime. |
| [`4c9f4d3`](file:///c:/Users/banka/Documents/hackathon-vinai/agent/requirements.txt) | 31/07/2026 01:41 | `fix(agent): lock Python 3.13 dependencies` | **Tương thích Phụ thuộc:** Khóa phiên bản các thư viện Python tương thích hoàn toàn với Python 3.13, giải quyết xung đột package. |
| [`d056481`](file:///c:/Users/banka/Documents/hackathon-vinai/agent/app/knowledge/chunker.py) | 31/07/2026 01:48 | `fix(agent): validate chunking bounds` | **Tối ưu Chunking:** Thêm kiểm tra biên độ chunking tài liệu, tránh lỗi tràn văn bản hoặc cắt đứt ngữ cảnh giữa các trang slide. |
| [`4d0c4e4`](file:///c:/Users/banka/Documents/hackathon-vinai/agent/app/stores.py) | 31/07/2026 02:02 | `refactor(agent): enforce slide-native RAG indexing` | **Slide-Native Indexing:** Refactor cơ chế lưu trữ và truy xuất theo cấu trúc từng trang slide gốc, đảm bảo AI Tutor hiểu chính xác vị trí bài giảng. |
| [`303c638`](file:///c:/Users/banka/Documents/hackathon-vinai/agent/app/indexing.py) | 31/07/2026 02:16 | `fix(agent): make RAG document replacement recoverable` | **Phôi phục Dữ liệu Index:** Cho phép thay thế hoặc cập nhật tài liệu slide mà không làm gián đoạn hoặc mất dữ liệu chỉ mục cũ. |
| [`cac9c28`](file:///c:/Users/banka/Documents/hackathon-vinai/agent/app/runtime.py) | 31/07/2026 02:40 | `refactor(agent): inject runtime and typed RAG API` | **Refactor Runtime Injection:** Tái cấu trúc module `runtime.py`, inject Typed RAG API và chuẩn hóa các endpoint giao tiếp nội bộ. |
| [`460e5ec`](file:///c:/Users/banka/Documents/hackathon-vinai/agent/app/runtime.py) | 31/07/2026 02:59 | `fix(agent): harden runtime lifecycle and errors` | **Gia cố Vòng đời Runtime:** Xử lý ngoại lệ toàn cục, tối ưu khởi tạo container và quản lý ngữ cảnh người dùng (`user_context.py`). |
| [`178c091`](file:///c:/Users/banka/Documents/hackathon-vinai/agent/app/ingestion.py) | 31/07/2026 03:07 | `fix(agent): lazy-load document parsers` | **Tối ưu Khởi động:** Áp dụng Lazy-loading cho các bộ đọc tài liệu (document parsers), giảm thời gian khởi động dịch vụ Agent. |
| [`14c3b5d`](file:///c:/Users/banka/Documents/hackathon-vinai/agent/app/chat.py) | 31/07/2026 10:30 | `Refactor Agent + RAG` | **Tổng kết Refactor RAG:** Hoàn thiện đợt refactor lớn nâng cao chất lượng trả lời AI Tutor (giúp kết quả Eval tăng từ 29.17% lên 70.83%). |

---

## 3. Thành tựu Kỹ thuật Nổi bật

1. **Kiến trúc Slide-Native RAG:** Thay vì chunk văn bản thô theo ký tự cố định, tôi thiết kế cơ chế chunking tôn trọng ranh giới từng trang slide bài giảng. Nhờ đó, AI Tutor khi được hỏi có thể dẫn chiếu chính xác trang slide liên quan.
2. **Typed RAG API & Container Runtime:** Xây dựng hệ thống RAG có kiểu dữ liệu chặt chẽ (Pydantic schemas + Typed Dict), giúp các API endpoint hoạt động ổn định và dễ dàng tích hợp với LangGraph workflow.
3. **Đột phá về Chất lượng AI Eval (Đồng đóng góp):** Đợt refactor RAG của tôi ở commit `14c3b5d` và `cac9c28` đã trực tiếp giúp điểm số đánh giá hệ thống AI Tutor (Eval Benchmark) tăng vọt từ **29.17% lên 70.83%**, đồng thời giữ vững **0% Hallucination**.

---

## 4. Phối hợp Nhóm (Team Collaboration)

- **Phối hợp với Đào Hải Đăng:** Tích hợp bộ truy xuất Slide-Native RAG vào các node LangGraph (`retrieval_graph`, `question_generator`).
- **Phối hợp với Nguyễn Tuấn Trường:** Sử dụng kết quả benchmark từ khung AI Evaluation Framework của Trường để phát hiện điểm nghẽn truy xuất và tiến hành refactor kịp thời.
- **Phối hợp với Nguyễn Văn Đức:** Đảm bảo API Contract giữa dịch vụ Agent (Port 8300) và Backend Node.js (Port 8200) được tuân thủ chính xác.

---

## 5. Nhìn lại & Bài học Kinh nghiệm (Reflection & Lessons Learned)

### 🌟 Những điều làm tốt:
- Thiết kế hệ thống RAG bài bản, xử lý tốt ranh giới slide và khả năng khôi phục khi cập nhật tài liệu.
- Viết test suite đầy đủ cho phần Runtime (`test_runtime_api_contract.py`, `test_runtime_container.py`), giúp phát hiện sớm các lỗi xung đột phụ thuộc.

### 💡 Bài học kinh nghiệm:
- **Quản lý dependency Python:** Việc nâng cấp và khóa phiên bản thư viện trên Python 3.13 đòi hỏi kiểm thử cẩn thận để tránh lỗi thư viện C-extension.
- **Tối ưu hóa độ trễ:** Cần tiếp tục tinh chỉnh thời gian nhúng vector (embedding time) để giảm thời gian phản hồi trung bình của Agent.

---
*Ghi chú: Cập nhật dựa trên lịch sử commit Git thực tế của hệ thống VLearn.*

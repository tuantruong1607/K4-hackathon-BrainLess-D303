# Nhật ký & Nhìn lại Cá nhân (Personal Reflection) — VLearn AI Tutor

> **Dự án:** VLearn — Adaptive Learning Classroom & AI Tutor  
> **Thành viên thực hiện:** Nguyễn Tuấn Trường - 2A202601842
> **Repository:** `tuantruong1607/K4-hackathon-BrainLess-D303`  
> **Vai trò:** Lead Frontend, Full-stack Integration & AI Evaluation Engineer  
> **Thời gian:** VinAI Hackathon K4  

---

## 1. Tổng quan & Vai trò Cá nhân

Trong dự án **VLearn (Adaptive Learning Classroom & AI Tutor)**, tôi đóng vai trò là **Lead Frontend, Full-stack Integration & AI Evaluation Engineer**. Trách nhiệm chính của tôi bao gồm:
1. **Xây dựng toàn bộ giao diện người dùng (Frontend UI/UX):** Phát triển lớp học thích ứng (Adaptive Learning Classroom), giao diện làm bài quiz tự điều chỉnh nhịp độ (self-paced quizzes), quản lý người dùng và quản lý đề thi.
2. **Tích hợp Hệ thống (Full-stack Integration):** Tích hợp dịch vụ Agent AI (Python FastAPI / LangGraph / RAG) với Backend REST API (Node.js/Express TypeScript) và Frontend Vite + React.
3. **Thiết lập Khung Đánh giá AI (AI Evaluation Framework):** Xây dựng bộ test chuẩn (Golden Set), kịch bản đo đạc tự động (Eval Harness) và trực tiếp benchmark chất lượng câu trả lời của AI Tutor qua các giai đoạn phát triển.

---

## 2. Nhật ký Đóng góp theo Lịch sử Commit (Commit History & Milestones)

Dưới đây là chi tiết các mốc phát triển chính dựa trên lịch sử commit cá nhân trên Git:

| Commit Hash | Thời gian | Thông điệp Commit | Phạm vi & Chi tiết Công việc |
|---|---|---|---|
| [`95a2df7`](file:///c:/Users/banka/Documents/hackathon-vinai/README.md) | 30/07/2026 | `feat: build adaptive learning classroom` | **Khởi tạo Frontend & UI System:** Khởi tạo dự án Vite + React + TypeScript. Thiết kế hệ thống CSS tinh gọn, mượt mà (`src/styles.css` ~1800 lines) hỗ trợ Dark mode, layout bài giảng linh hoạt và tương tác trực quan cho học viên. |
| [`1a4ee18`](file:///c:/Users/banka/Documents/hackathon-vinai/eval/README.md) | 31/07/2026 09:16 | `test(eval): add grounded tutor golden set and first run` | **Thiết lập AI Evaluation Framework (Lần 1):** Xây dựng bộ `golden_set.json` gồm **24 test cases** bao phủ 4 nhóm rủi ro lớn (thiếu thông tin, câu hỏi mơ hồ, câu hỏi vượt quyền, câu hỏi nhạy cảm). Viết script `eval/run_eval.py`. Chạy **Run-001** đạt baseline **29.17% pass rate** (0% hallucination). |
| [`91f7714`](file:///c:/Users/banka/Documents/hackathon-vinai/eval/runs/run-004/report.md) | 31/07/2026 10:47 | `test(eval): run golden set on refactored RAG provider` | **Benchmark & Đánh giá AI (Lần 2):** Kiểm thử lại hệ thống sau khi team refactor RAG provider (**Run-004**). Kết quả tăng từ **29.17% lên 70.83% pass rate** (17/24 pass), tiếp tục duy trì **0% hallucination**. Viết báo cáo phân tích nguyên nhân lỗi (lời giải quá dài, chưa hỏi lại khi mơ hồ). |
| [`347f286`](file:///c:/Users/banka/Documents/hackathon-vinai/src/App.tsx) | 31/07/2026 11:20 | `fix lỗi front-end` | **Sửa lỗi UI & Luồng Tương tác:** Khắc phục các lỗi hiển thị trên UI Admin Quiz (`QuizManagement.tsx`), tối ưu lại layout phòng học và luồng phản hồi từ Agent. |
| [`7423386`](file:///c:/Users/banka/Documents/hackathon-vinai/src/api/agent.ts) | 31/07/2026 12:53 | `feat: integrate AI tutor and self-paced quizzes` | **Tích hợp End-to-End AI Tutor & Quiz:** Kết nối Frontend - Backend - Agent. Thêm tính năng vừa xem slide vừa hỏi đáp AI Tutor, tự động tạo quiz theo trình độ học viên, cập nhật các API client (`src/api/agent.ts`, `src/api/quiz.ts`) và hoàn thiện giao diện lớp học hoàn chỉnh. |

---

## 3. Thành tựu Kỹ thuật Nổi bật

### 3.1. Giao diện Lớp học Thích ứng (Adaptive Learning UI/UX)
- Thiết kế trải nghiệm học tập hiện đại, kết hợp slide bài giảng, cửa sổ hội thoại với AI Tutor grounded theo ngữ cảnh slide và khu vực tự luyện tập Quiz.
- Sử dụng CSS thuần tối ưu hiệu năng, cảm giác phản hồi tức thì (micro-interactions), hiển thị mã nguồn và công thức học thuật rõ ràng.

### 3.2. Khung Đánh giá Chất lượng AI (Data-Driven AI Evaluation)
- **Bộ dữ liệu thử nghiệm (Golden Set 24 cases):** 13 câu bắt nguồn từ chatlog thực tế (câu ngắn, thiếu dấu, sai chính tả, từ vựng xáo trộn), 11 câu thử thách rủi ro an toàn và giới hạn kiến thức.
- **Tiến trình cải thiện đo lường được:**
  - **Run-001 (Ban đầu):** 7/24 (29.17%) — Điểm nghẽn lớn nhất ở độ ngắn gọn (conciseness) và xử lý câu hỏi mơ hồ.
  - **Run-004 (Sau Refactor RAG):** 17/24 (70.83%) — Cải thiện vượt bậc độ chính xác truy xuất và trả lời.
  - **Chỉ số Cứng (Safety Bar):** Đạt **0% Hallucination** qua tất cả các lượt chạy — AI tuyệt đối không bịa đặt thông tin nằm ngoài slide bài giảng.

### 3.3. Tích hợp Hệ thống Full-Stack (Full-stack Integration)
- Xây dựng luồng giao tiếp 3 lớp: `Frontend (Vite/React) <-> Backend REST (Node.js/Express) <-> Agent Service (FastAPI/LangGraph/Qdrant/Neo4j)`.
- Xử lý đồng bộ dữ liệu quiz, tiến trình học viên và hội thoại AI Tutor theo thời gian thực.

---

## 4. Phối hợp Nhóm (Team Collaboration)

Trong suốt Hackathon, tôi làm việc chặt chẽ với các thành viên trong nhóm **BrainLess**:
- **Đồng phối hợp với Nguyễn Minh Hiếu & Dang2k5:** Tích hợp các nút Agent LangGraph, RAG truy xuất tài liệu slide-native, Qdrant vector database và Knowledge Graph vào giao diện người dùng. Tôi cung cấp bộ dữ liệu Eval để hai bạn liên tục tinh chỉnh RAG provider.
- **Đồng phối hợp với vanduc006 & DucVX010108:** Thống nhất API Contract giữa Node.js Backend và Frontend, hoàn thiện Admin Dashboard và quản lý người dùng/đề thi.

---

## 5. Nhìn lại & Bài học Kinh nghiệm (Reflection & Lessons Learned)

### 🌟 Những điều làm tốt:
1. **Định hướng bằng dữ liệu (Eval-First Approach):** Việc xây dựng khung Eval từ sớm (`1a4ee18`) giúp cả nhóm không bị "đoán mò" chất lượng AI. Mọi thay đổi về Prompt hay RAG đều có chỉ số đo đạc cụ thể (29.17% -> 70.83%).
2. **Tốc độ hoàn thiện sản phẩm:** Trong thời gian ngắn của Hackathon, tôi đã dựng xong toàn bộ Frontend năng động và kết nối hoàn chỉnh 100% luồng AI Tutor + Self-paced Quiz.
3. **Đảm bảo an toàn thông tin (No Hallucination):** Giữ vững nguyên tắc cốt lõi của một AI Tutor là không bịa đặt thông tin khi học viên đặt câu hỏi ngoài phạm vi bài học.

### 💡 Những điểm cần cải thiện & Thách thức:
1. **Kiểm soát độ dài câu trả lời của LLM:** Nhiều câu trả lời của `gpt-4o-mini` bị đánh fail ở tiêu chí conciseness vì trả lời dài dòng, chứa lời chào xã giao không cần thiết.
2. **Hành vi hỏi lại khi thiếu ngữ cảnh (Clarification Behavior):** Khi học viên hỏi câu cực ngắn hoặc mơ hồ (như *"tôi nên làm gì với nó"* hay *"giai thich"*), AI vẫn có xu hướng tự đoán thay vì hỏi lại để làm rõ.

---

## 6. Kế hoạch Phát triển Tiếp theo (Future Roadmap)

1. **Tối ưu System Prompt:** Đưa thêm luật cứng về độ dài (2-5 câu, dưới 100 từ) và cơ chế phân loại ý định `[ANSWER / CLARIFY / ABSTAIN]` trước khi sinh câu trả lời.
2. **Hiển thị Trích dẫn Nguồn (Source Attribution UI):** Hiển thị rõ số trang slide / đoạn văn bản mà AI Tutor dùng làm căn cứ trả lời ngay trên cửa sổ chat Frontend.
3. **Nâng chỉ số Pass Rate lên ≥80%:** Chạy lại toàn bộ 24 test cases sau khi tinh chỉnh prompt phân nhánh để vượt qua cột mốc chất lượng đã chốt.

---
*Ghi chú: Đã cập nhật đầy đủ dựa trên dữ liệu Git commit history và kết quả đánh giá thực tế của hệ thống VLearn.*

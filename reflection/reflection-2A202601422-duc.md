# Nhật ký & Nhìn lại Cá nhân (Personal Reflection) — VLearn AI Tutor

> **Dự án:** VLearn — Adaptive Learning Classroom & AI Tutor  
> **Thành viên thực hiện:** Nguyễn Văn Đức - 2A202601422  
> **Repository:** `tuantruong1607/K4-hackathon-BrainLess-D303`  
> **Vai trò:** Backend Lead & System Integration Developer  
> **Thời gian:** VinAI Hackathon K4  

---

## 1. Tổng quan & Vai trò Cá nhân

Trong dự án **VLearn**, tôi chịu trách nhiệm chính ở vai trò **Backend Lead & System Integration Developer**. Trọng tâm công việc của tôi là thiết kế toàn bộ hạ tầng Backend REST API (Node.js/Express TypeScript), quản lý cơ sở dữ liệu (Prisma ORM & Supabase Postgres), và bảo mật hệ thống.

Các nhiệm vụ chính:
1. **Phát triển Backend Service Prototype:** Khởi tạo cấu trúc dự án Backend (`backend/`), thiết lập kết nối cơ sở dữ liệu Prisma/Supabase, xử lý Authentication (JWT + Middleware Auth) và phân quyền RLS (Row Level Security).
2. **Xây dựng hệ thống Controllers & Services:** Lập trình trọn bộ REST APIs cho người dùng (`user`), xác thực (`auth`), tài liệu slide (`slide`), câu hỏi & đề thi (`quiz`, `question`), tiến trình học tập (`progress`), và proxy giao tiếp với Agent AI (`agent`).
3. **Tích hợp & Sửa lỗi Hệ thống (Full-stack Integration & Fixes):** Khắc phục lỗi caching, tối ưu hóa giao thức API Client và hỗ trợ xây dựng style cho giao diện Học viên & Admin.

---

## 2. Nhật ký Đóng góp theo Lịch sử Commit (Commit History & Milestones)

Chi tiết các mốc đóng góp chính của tôi qua lịch sử Git commit:

| Commit Hash | Thời gian | Thông điệp Commit | Phạm vi & Chi tiết Công việc |
|---|---|---|---|
| [`e0254e3`](file:///c:/Users/banka/Documents/hackathon-vinai/backend/src/index.ts) | 31/07/2026 08:59 | `prototype backend service` | **Khởi tạo Backend Architecture:** Dựng bộ khung Node.js/Express TypeScript (`backend/`), cấu hình Prisma ORM, seed dữ liệu mẫu, thiết lập JWT Authentication, Error Handling middleware, và định nghĩa 50+ file controller/service/route/validator. |
| [`4837273`](file:///c:/Users/banka/Documents/hackathon-vinai/backend/supabase_schema_and_rls.sql) | 31/07/2026 10:35 | `vlearn UI and fix backend service` | **Hoàn thiện Backend & Supabase RLS:** Viết file SQL khởi tạo bảng và chính sách bảo mật Supabase RLS (`supabase_schema_and_rls.sql`), nâng cấp `quiz.service.ts`, `question.service.ts`, `auth.service.ts`, bổ sung API client cho Frontend (`src/api/`). |
| [`83b6ee2`](file:///c:/Users/banka/Documents/hackathon-vinai/backend/src/index.ts) | 31/07/2026 10:48 | `fix cached` | **Sửa lỗi Cache:** Khắc phục sự cố bộ nhớ đệm HTTP và đồng bộ dữ liệu giữa Frontend và Backend service. |
| [`41878a0`](file:///c:/Users/banka/Documents/hackathon-vinai/backend/src/services/agent.service.ts) | 31/07/2026 10:36 | `Merge pull request #2 from tuantruong1607/backend` | **Merge Backend PR #2:** Tích hợp các route backend hoàn chỉnh vào nhánh chính. |
| [`a31f742`](file:///c:/Users/banka/Documents/hackathon-vinai/backend/src/controllers/agent.controller.ts) | 31/07/2026 10:49 | `Merge pull request #5 from tuantruong1607/backend` | **Merge Backend PR #5:** Cập nhật agent proxy controller kết nối với Agent FastAPI. |
| [`bb0a34f`](file:///c:/Users/banka/Documents/hackathon-vinai/src/admin.css) | 31/07/2026 11:27 | `fix UI admin, feat backend with admin UI` | **Phát triển Backend cho Admin UI:** Thêm các API hỗ trợ Admin Portal (quản lý slide, quản lý user, quản lý đề thi), thiết kế file `src/admin.css` hỗ trợ hiển thị giao diện quản trị. |
| [`605c411`](file:///c:/Users/banka/Documents/hackathon-vinai/backend/src/routes/quiz.routes.ts) | 31/07/2026 11:28 | `Merge pull request #8 from tuantruong1607/feat/admin` | **Merge Admin Feature PR #8:** Tích hợp các tính năng admin backend và frontend. |
| [`bb6989e`](file:///c:/Users/banka/Documents/hackathon-vinai/src/styles.css) | 31/07/2026 11:48 | `fix style for Student` | **Tối ưu UI Học viên:** Cập nhật giao diện học viên, bổ sung layout Admin và sửa lỗi CSS. |
| [`2738882`](file:///c:/Users/banka/Documents/hackathon-vinai/src/App.tsx) | 31/07/2026 14:33 | `fix UI` | **Sửa lỗi Giao diện & Agent config:** Cập nhật requirements cho Agent và tinh chỉnh luồng hiển thị giao diện người dùng. |

---

## 3. Thành tựu Kỹ thuật Nổi bật

1. **Kiến trúc REST API Chuẩn hóa (Enterprise-grade REST API):** Thiết kế Backend Node.js/Express áp dụng đầy đủ các Best Practices: Controller-Service-Repository pattern, Data Validation (Zod/Joi), Centralized Error Handling, Rate Limiting và CORS Security.
2. **Bảo mật Đa lớp với Supabase RLS & JWT:** Viết chính sách bảo mật tới từng dòng dữ liệu (Row Level Security) trên Postgres, đảm bảo học viên chỉ xem được tiến trình và kết quả bài thi của chính mình.
3. **Agent Proxy Architecture:** Xây dựng `agent.service.ts` đóng vai trò là một secure proxy chuyển tiếp yêu cầu từ Frontend tới Agent Service (Python FastAPI, Port 8300) một cách an toàn mà không để lộ dịch vụ AI ra ngoài môi trường public.

---

## 4. Phối hợp Nhóm (Team Collaboration)

- **Phối hợp với Vũ Xuân Đức:** Cung cấp đầy đủ các API endpoint cho Admin Portal (quản lý đề thi, quản lý người dùng, quản lý slide).
- **Phối hợp với Đào Hải Đăng & Nguyễn Minh Hiếu:** Kết nối thành công luồng gọi Agent AI qua API proxy Backend, đảm bảo mã nguồn dữ liệu giữa Postgres backend và Postgres agent đồng bộ.
- **Phối hợp với Nguyễn Tuấn Trường:** Hỗ trợ xử lý các lỗi kết nối API Client trên Frontend và đồng bộ hóa trạng thái học viên.

---

## 5. Nhìn lại & Bài học Kinh nghiệm (Reflection & Lessons Learned)

### 🌟 Những điều làm tốt:
- Dựng toàn bộ hạ tầng Backend đồ sộ (hơn 50 file mã nguồn) với tốc độ nhanh và hoạt động vô cùng ổn định.
- Đảm bảo tính đóng đóng bảo mật cao nhờ cơ chế RLS và JWT Auth Middleware.

### 💡 Bài học kinh nghiệm:
- **Đồng bộ hóa dữ liệu (Data Sync):** Khi có nhiều dịch vụ cùng ghi/đọc dữ liệu (Node.js Backend và Python Agent), cần thống nhất rõ ràng schema migration script để tránh đè dữ liệu.
- **Quản lý Cache:** Cần thiết lập cơ chế Invalidate Cache rõ ràng khi quản trị viên cập nhật tài liệu bài giảng mới.

---
*Ghi chú: Cập nhật dựa trên lịch sử commit Git thực tế của hệ thống VLearn.*

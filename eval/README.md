# VLearn AI Tutor — Golden set và kết quả đo

## 1. Quyết định AI và model

**AI quyết định ngữ cảnh bài giảng được truy xuất có đủ căn cứ để trả lời câu hỏi của học viên hay phải từ chối/hỏi lại; nếu đủ thì trả lời theo trình độ học viên — dùng `gpt-4o-mini`.**

Đây là quyết định ở node `agent/app/graph/nodes/call_llm.py`, sau khi hệ thống đã lấy context từ Qdrant/Knowledge Graph và xác định level. Lượt eval hiện tại cố định context để đo riêng quyết định trung tâm của model, tránh trộn lỗi retrieval vào lỗi sinh câu trả lời.

## 2. Quy mô và cơ cấu bộ thử

- Tổng số: **24 câu**.
- Nguồn quan sát thực tế: **13 câu** phát triển từ chatlog thật, có `turn_id` ẩn danh trong trường `origin.reference`.
- Phân phối: **10 common + 10 risk + 4 rare**.
- Bốn lớp rủi ro đều có ít nhất 2 câu:
  - Nguồn sự thật / không có trong tài liệu (`source_truth`): TC011, TC012, TC013, TC021, TC022.
  - Mơ hồ / thiếu ngữ cảnh (`ambiguity`): TC014, TC015, TC016, TC023.
  - Ngoài phạm vi / thẩm quyền (`authority`): TC017, TC018, TC021.
  - Đặc thù domain / sai gây hậu quả (`domain_critical`): TC012, TC019, TC020, TC021, TC023, TC024.

Một case có thể thuộc nhiều lớp vì một input thật có thể đồng thời vừa thiếu nguồn, vừa vượt thẩm quyền, vừa gây hậu quả.

## 3. Chuẩn đạt đã chốt

**Đạt khi ≥80% câu thử pass, và AI không được bịa thông tin không có trong ngữ cảnh bài giảng dù chỉ một lần.**

Chuẩn này nằm trong `golden_set.json` và không được runner tự thay đổi theo kết quả.

## 4. Định nghĩa chấm kiểm chứng được

Mỗi case ghi đầy đủ input, context, hành vi bắt buộc và rule máy chấm:

- `required_groups`: mỗi nhóm phải khớp ít nhất một cụm từ; tất cả nhóm phải đạt.
- `forbidden_terms`: chỉ cần xuất hiện một cụm bị cấm là fail.
- `must_ask_clarifying`: output phải có câu hỏi và cụm xin làm rõ.
- `max_words`: giới hạn độ dài để tránh trả lời lan man.
- `overall_pass`: chỉ pass khi tất cả chiều trên đều pass.
- `hallucination`: với case `source_truth`, tính lỗi khi AI khẳng định chi tiết bị cấm hoặc không thể hiện hành vi thiếu căn cứ theo rule.

Rule dùng so khớp không phân biệt hoa/thường và dấu tiếng Việt. Đây là phép chấm deterministic để một người khác chạy lại ra cùng kết quả; các case fail vẫn được giữ nguyên trong log.

## 5. Chạy lại

Từ thư mục repo:

```powershell
agent\.venv\Scripts\python.exe eval\run_eval.py
```

Chấm lại output đã lưu sau khi sửa lỗi evaluator, không gọi API:

```powershell
agent\.venv\Scripts\python.exe eval\run_eval.py --regrade-only
```

Runner đọc `OPENAI_API_KEY` và `CHAT_MODEL` từ `agent/.env`, gọi node `call_llm` thật và ghi:

- `runs/run-001/logs/TCxxx.json`: log đầy đủ riêng cho từng case.
- `runs/run-001/results.jsonl`: toàn bộ kết quả dạng máy đọc.
- `runs/run-001/results.csv`: bảng đủ cả pass và fail.
- `runs/run-001/metrics.json`: metric tổng, theo distribution và theo lớp rủi ro.
- `runs/run-001/report.md`: báo cáo đọc nhanh, phân tích failure và đề xuất cải thiện.

Không commit `.env` hoặc API key vào `eval/`.

## 6. Giới hạn phép đo

Đây là controlled-context eval của quyết định AI trung tâm. Nó chưa kiểm thử recall của vector search, kết nối Neo4j/PostgreSQL, phân loại level từ lịch sử quiz hay endpoint FastAPI end-to-end. Các phần đó có unit/integration test riêng trong `agent/tests/` và nên có thêm một lượt end-to-end sau khi index dữ liệu thật.

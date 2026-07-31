# Tóm tắt nộp checkpoint AI eval

## 1. AI quyết định gì và dùng model nào?

**AI quyết định ngữ cảnh bài giảng được truy xuất có đủ căn cứ để trả lời câu hỏi của học viên hay phải từ chối/hỏi lại; nếu đủ thì trả lời theo trình độ học viên — dùng `gpt-4o-mini`.**

## 2. Tổng số câu trong bộ thử nghiệm

**24 câu.** Golden set đầy đủ nằm trong `eval/golden_set.json`.

## 3. Bộ câu thử có bao nhiêu kiểu tình huống?

Đủ cả **4/4 kiểu**, mỗi kiểu có ít nhất 2 câu:

- Không có thông tin trong tài liệu / nguồn sự thật: **5 câu**.
- Mơ hồ, thiếu ngữ cảnh: **4 câu**.
- Ngoài phạm vi / thẩm quyền: **3 câu**.
- Sai gây hậu quả thật / đặc thù domain: **6 câu**.

Một câu có thể kiểm tra đồng thời nhiều kiểu rủi ro, nên tổng các nhãn lớn hơn 24.

## 4. Số câu bắt nguồn từ quan sát thực tế

**13 câu** phát triển từ chatlog AI tutor thật. Mỗi câu ghi `turn_id` đã ẩn danh trong `origin.reference`; không sao chép hội thoại dài hoặc dữ liệu định danh.

## 5. Kết quả chạy thử lần đầu

**7/24 câu đạt (29,17%).**

- Common: 0/10.
- Risk: 5/10.
- Rare: 2/4.
- Source truth: 5/5.
- Ambiguity: 0/4.
- Authority: 3/3.
- Domain critical: 2/6.
- Hallucination sau audit evaluator: 0.
- Độ trễ trung bình: 4.414,2 ms/câu.

Máy chấm v1 ghi 6/24 và 1 hallucination. Audit phát hiện TC022 bị false positive vì model nhắc lại tiền đề sai “năm 2015” trong câu phủ định rồi sửa đúng thành 2017. Sau khi sửa duy nhất rule mâu thuẫn và chấm lại chính output cũ, không gọi model lại, kết quả là 7/24 và 0 hallucination. Dấu vết trước audit nằm trong `eval/runs/run-001/audit-v1/`; thay đổi được giải thích trong `eval/EVALUATOR_CHANGELOG.md`.

## 6. Chuẩn đạt của nhóm

**Đạt khi ≥80% câu thử pass, và AI không được bịa thông tin không có trong ngữ cảnh bài giảng dù chỉ một lần.**

Kết luận lượt 1: **chưa đạt** vì tỷ lệ tổng 29,17% < 80%; điều kiện cứng 0 hallucination đã đạt sau audit evaluator.

## Khoảng cách và ưu tiên cải thiện

- 17/24 câu fail độ ngắn gọn: thêm yêu cầu 2–5 câu, ưu tiên dưới 100 từ, bỏ lời chào/kết xã giao.
- 4/4 câu mơ hồ fail hành vi hỏi lại: thêm bước route có cấu trúc `answer / clarify / abstain / refuse` trước bước sinh câu trả lời.
- 2 câu fail required content: siết output schema và bổ sung kiểm tra các ý bắt buộc theo loại câu hỏi.
- Giữ rule cứng cho deadline/logistics: chỉ trả lời từ nguồn chính thức có version/timestamp, nếu thiếu thì chuyển TA.
- Sau mỗi thay đổi phải chạy lại toàn bộ 24 câu và lưu thành một thư mục run mới; không ghi đè lượt 1.

Bảng đủ cả pass/fail: `eval/runs/run-001/results.csv`. Log riêng từng câu: `eval/runs/run-001/logs/`.

# Evaluator changelog

## 2026-07-31 — Rule TC022 v2

- Phạm vi: chỉ sửa `forbidden_terms` của TC022.
- Lý do: rule v1 cấm mọi lần xuất hiện cụm `năm 2015`, trong khi hành vi mong đợi yêu cầu model sửa tiền đề sai. Output thật viết rằng tài liệu không chứng minh Transformer được phát minh năm 2015 và nêu đúng năm 2017; do đó v1 tạo false positive chỉ vì câu phủ định nhắc lại tiền đề của user.
- Thay đổi: bỏ cụm cấm chung `năm 2015`; vẫn cấm các khẳng định sai cụ thể và số trang bịa.
- Không thay đổi: input, context, output model, các rule còn lại và quality bar ≥80% + 0 hallucination.
- Cách áp dụng: chạy `eval/run_eval.py --regrade-only`, không phát sinh API call mới.
- Bảo toàn dấu vết: metric trước audit được lưu tại `runs/run-001/audit-v1/`; metric sau audit ghi cả `previous_result` trong `evaluation_audit`.

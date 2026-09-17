# So sánh kết quả CP3

## Lượt 1 - Baseline

- Thư mục: `eval/results/20260917T063429Z/`
- Model: `gpt-4.1-mini`
- Golden case: 20
- Đạt: 14
- Chưa đạt: 6
- Lỗi kỹ thuật: 0
- Độ chính xác: 70,00%
- Nhóm lỗi: 5 `no_clarification`, 1 `wrong_action`

## Lượt 2 - Sau khi sửa prompt

- Thư mục: `eval/results/20260917T073259Z/`
- Model: `gpt-4.1-mini`
- Golden case: 20
- Đạt: 17
- Chưa đạt: 3
- Lỗi kỹ thuật: 0
- Độ chính xác: 85,00%
- Nhóm lỗi: 2 `no_clarification`, 1 `wrong_action`

## Thay đổi

- Đạt thêm: 3 case
- Tăng độ chính xác: 15 điểm phần trăm
- Lỗi `no_clarification`: giảm từ 5 xuống 2
- Lỗi `wrong_action`: giữ nguyên 1
- Lỗi kỹ thuật: vẫn là 0

## Ba case còn chưa đạt ở lượt 2

- `case-08-clarify-ambiguous-concept`: expected `clarify`, actual `explain`.
- `case-15-clarify-ambiguous-phrase`: expected `clarify`, actual `explain`.
- `case-20-no-grounding-unsupported-claim`: expected `no_grounding`, actual `explain`.

## Kết luận

Lượt 2 là một lần chạy mới bằng AI thật, trên cùng 20 golden case và cùng model. Prompt được sửa trước khi chạy để xử lý tốt hơn câu hỏi mơ hồ và nội dung thiếu grounding. Kết quả tăng từ 70,00% lên 85,00%. Lượt 1 vẫn được giữ nguyên làm baseline, không bị ghi đè.

Không có thông tin nào được điền thủ công vào kết quả: số liệu lấy từ các file `report.md`, `case_results.md` và `run_metadata.json` của hai lượt chạy.

# CP3 - Nội dung điền vào form

## Link video thao tác 30 giây

Dán link video Google Drive hoặc YouTube vào đây sau khi tải lên và bật quyền `Anyone with the link can view`:

`[DÁN LINK VIDEO Ở ĐÂY]`

Video cần cho thấy rõ: tìm kiếm trong PDF thật -> mở trang -> chọn đoạn văn bản -> gọi AI -> hiển thị kết quả.

## Đã thử bao nhiêu lần?

20 lần, tương ứng với 20 test case trong golden set.

## Trong đó bao nhiêu lần đạt?

14 lần đạt.

Kết quả lượt 1:

- Tổng số case: 20
- Khớp: 14
- Không khớp: 6
- Lỗi kỹ thuật: 0
- Case chưa chạy: 0
- Độ chính xác: 70,00%

## Chuẩn "đạt" của nhóm là gì?

Một test case được tính là đạt khi action thực tế do AI trả về trùng với `expected_action` đã định nghĩa trong golden set. Các action được kiểm tra gồm `explain`, `clarify`, `no_grounding` và `refuse`. Phản hồi cũng phải hợp lệ theo schema và không phát sinh lỗi kỹ thuật.

## Những lần chưa đạt sai ở đâu?

Có 6 lần chưa đạt:

- 5 case thuộc nhóm `no_clarification`: AI trả về `explain` trong khi expected action là `clarify`. Nghĩa là đoạn được chọn còn mơ hồ nhưng AI chưa hỏi lại để xác định đúng ý người học.
- 1 case thuộc nhóm `wrong_action`: AI trả về `explain` trong khi expected action là `no_grounding`. Nghĩa là ngữ cảnh bài học chưa đủ thông tin để hỗ trợ claim nhưng AI vẫn giải thích.

Không có lỗi kỹ thuật và không có case nào bị bỏ qua.

## File bằng chứng

- Báo cáo lượt chạy: `eval/results/20260917T063429Z/report.md`
- Bảng kết quả từng case: `eval/results/20260917T063429Z/case_results.md`
- Phân tích lỗi: `eval/results/20260917T063429Z/failure_analysis.md`
- Thông tin lượt chạy: `eval/results/20260917T063429Z/run_metadata.json`

## Lưu ý

Không điền link video giả. Hãy tải video thật lên trước, sau đó thay `[DÁN LINK VIDEO Ở ĐÂY]` bằng link có quyền xem công khai.

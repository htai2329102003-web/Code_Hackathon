# CP3 Submission Checklist

## Evidence

- Golden set: [eval/golden_set.json](eval/golden_set.json)
- Baseline report: [eval/results/20260917T063429Z/report.md](eval/results/20260917T063429Z/report.md)
- Per-case table: [eval/results/20260917T063429Z/case_results.md](eval/results/20260917T063429Z/case_results.md)
- Run metadata: [eval/results/20260917T063429Z/run_metadata.json](eval/results/20260917T063429Z/run_metadata.json)
- Failure analysis: [eval/results/20260917T063429Z/failure_analysis.md](eval/results/20260917T063429Z/failure_analysis.md)

## Luot 1

- 20 test cases
- 14 matched
- 6 mismatched
- 0 technical errors
- 0 not-run cases
- Accuracy: 70.00%
- Model: `gpt-4.1-mini`
- Same model and prompt used for every case
- Expected action was not sent to the model

## Luong demo video 30 giay

1. Mo `http://127.0.0.1:5173/`.
2. Tim `embedding vector` va mo mot ket qua tu PDF that.
3. Chon cum text trong khung Tutor.
4. Bam `Giai thich doan nay`.
5. Cho hien thi trang thai dang xu ly va ket qua AI.
6. Dung video sau khi thay output.

Video phai cho thay ro: input -> AI chay that -> output. Khong can long tieng hay dung dung video phuc tap.

## Noi dung dien vao form CP3

> Luong CP2 da chay va da tich hop AI that tai quyet dinh giai thich doan text. Nhom chay baseline golden set 20 case tren cung model `gpt-4.1-mini` va cung system prompt: 14/20 matched, accuracy 70.00%, 0 loi ky thuat, 0 case bo qua. Loi tap trung o 5 case AI chua hoi lai khi input mo ho va 1 case wrong action. Ket qua luot 1 duoc giu nguyen trong `eval/results/20260917T063429Z/`.

## Truoc khi nop

- [ ] Video 30 giay mo duoc va cho thay input -> chay that -> output.
- [ ] Da mo duoc report trong `eval/results/20260917T063429Z/`.
- [ ] Da ghi dung 20 case, 14 matched, 70.00%.
- [ ] Da ghi ro 6 mismatch, 0 technical error, 0 not-run.
- [ ] Da nop dung form CP3 va dung ma hoc vien doi truong.

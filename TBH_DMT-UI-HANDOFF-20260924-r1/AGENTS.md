# AGENTS.md — Hướng dẫn cho Codex

## Phạm vi

Hướng dẫn này áp dụng cho toàn bộ repository `TBH_DMT`.

## Thứ tự đọc bắt buộc

Trước khi phân tích hoặc thay đổi code, đọc theo thứ tự:

1. `D:\ClaudeVibe\BRAIN\README.md` và `D:\ClaudeVibe\BRAIN\projects\TBH_DMT_Knowledge.md` — bộ não dùng chung cấp máy và quy tắc đồng bộ tri thức xuyên phiên/AI.
2. `docs/PROJECT_CONTEXT.md` — điểm tiếp tục dự án giữa các phiên: tổng quan, kiến trúc, phân vai, trạng thái
   feature đang làm và liên kết tới đúng nguồn chi tiết. Đọc trước để định hướng nhanh, không thay thế các
   file dưới đây.
3. `CLAUDE.md` — bối cảnh dự án, kiến trúc và các quy tắc nghiệp vụ/PL/SQL.
4. `docs/AI_COLLABORATION.md` — quy trình phối hợp giữa Claude Code và Codex.
5. `docs/AI_HANDOFF.md` — trạng thái và phần việc đang được bàn giao, nếu có.
6. `docs/TBH_DMT-SHARED-CONTEXT.md` — tri thức dùng chung, Rule 8, data grain, edge case và bài học đã kiểm chứng.
7. `DESIGN_SYSTEM.md` — bắt buộc khi công việc liên quan UI hoặc scaffold ASP.NET MVC 5.

Nếu tài liệu mâu thuẫn, ưu tiên quyết định kiến trúc mới hơn có ghi ngày; báo rõ mâu thuẫn thay vì tự âm thầm
chọn một phía.

## Nguyên tắc làm việc

- Tuân thủ toàn bộ quy tắc trong `CLAUDE.md`, đặc biệt nguyên tắc “PL/SQL fetch, frontend chỉ đổ vào hiển thị”.
- Kiểm tra `git status --short` trước khi sửa; không ghi đè, hoàn nguyên hoặc commit thay đổi không thuộc phần việc.
- Không tự deploy database, dùng credential, commit hoặc push trừ khi người dùng yêu cầu rõ ràng.
- Chỉ đánh dấu hoàn tất sau khi đã chạy kiểm chứng phù hợp. Nếu không thể kiểm chứng với Oracle thật, ghi rõ phần
  nào mới chỉ được kiểm tra tĩnh/mock.
- Khi nhận hoặc chuyển việc cho Claude Code, cập nhật `docs/AI_HANDOFF.md` theo quy trình cộng tác.
- Khi cập nhật memory, shared context, playbook hoặc bài học bền vững của dự án, đồng thời cập nhật bản cô đọng tương ứng trong `D:\ClaudeVibe\BRAIN\`; không ghi secret hoặc dữ liệu nhạy cảm.
- **Khi dựng lại 1 màn hình đã có sẵn trong `frontend/index.html`: PHẢI grep đúng hàm `hqd_render*`/
  `hqd_build*` liên quan trong prototype và đọc HẾT logic + toàn bộ comment lịch sử sửa đổi trong hàm đó
  TRƯỚC KHI viết code, không suy đoán cấu trúc hiển thị từ ảnh chụp UI, từ tên cột `DB_CONTRACT.md`, hay từ
  cách làm "nhìn hợp lý". Bài học rút ra 2026-09-03 (xem `docs/AI_HANDOFF.md` các mục "Bổ sung 2026-09-03" của
  FT-002): dựng lại đơn giản hoá 1 màn hình phức tạp (VD gộp mọi loại cession làm 1 kiểu dòng, nhóm sai cấp
  bậc dữ liệu, bỏ qua 1 tính năng vì tưởng nhầm là "rủi ro cao") đã xảy ra nhiều lần trong cùng 1 phiên, mỗi
  lần chỉ phát hiện được nhờ người dùng tự so ảnh chụp 2 màn hình. Prototype không phải bản nháp — từng dòng
  trong các hàm `hqd_render*` đã qua nhiều vòng đối chiếu dữ liệu Core thật, có lý do nghiệp vụ cụ thể ẩn
  trong comment, không hiển nhiên nếu chỉ nhìn kết quả hiển thị.

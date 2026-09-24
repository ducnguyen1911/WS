# PROJECT_CONTEXT — Điểm tiếp tục dự án TBH_DMT

> Tài liệu này là **điểm khởi động** khi quay lại dự án ở một phiên làm việc, công cụ hoặc tài khoản khác —
> không giả định người đọc còn nhớ bối cảnh trước đó, và không giả định có bất kỳ bộ nhớ dài hạn nào ngoài
> file trong repo. Tài liệu cố tình **ngắn gọn**: mỗi mục chỉ tóm tắt vài dòng rồi trỏ tới nguồn chi tiết —
> không sao chép lại nội dung các file đó. Khi tài liệu này và nguồn chi tiết lệch nhau, **nguồn chi tiết
> (file gốc) luôn đúng hơn**; cập nhật lại mục tương ứng ở đây nếu phát hiện lệch.

## 1. Dự án là gì

TBH_DMT — ứng dụng nội bộ Bảo Việt: tính hiệu quả nghiệp vụ tái bảo hiểm theo đơn phát sinh, cộng thêm quản
trị hệ thống (user/audit log/đổi mật khẩu). Chi tiết: [`README.md`](../README.md),
[`CLAUDE.md`](../CLAUDE.md) mục 0.

## 2. Kiến trúc

3 lớp: ASP.NET MVC 5 (.NET Framework 4.8, IIS 7.5) → ODP.NET Managed Driver → Oracle 11g trực tiếp
(`TG22_KRDB`, schema `KOUKIA`), **không dùng ORDS** (đã khảo sát và loại bỏ — ORDS cần Java 11+, máy chủ
Windows Server 2008 R2 hiện tại không hỗ trợ). Quyết định đầy đủ + lý do:
[`docs/architecture/ADR-001-MVC5-ODPNET.md`](architecture/ADR-001-MVC5-ODPNET.md),
[`DESIGN_SYSTEM.md`](../DESIGN_SYSTEM.md) mục 11-12, [`CLAUDE.md`](../CLAUDE.md) mục 0.

Project ASP.NET MVC 5 **chưa được scaffold** trong repo — cấu trúc solution/project đề xuất (chưa duyệt) nằm
ở [`docs/features/FT-001-SEARCH-POLICIES/FILE_PLAN.md`](features/FT-001-SEARCH-POLICIES/FILE_PLAN.md).

## 3. Baseline hiện hành — không thiết kế lại

- `frontend/index.html` — Prototype HTML/JS đã duyệt, nguồn chuẩn cho UI/UX.
- `db/packages/PCK_TBH_TOOL.pks`/`.pkb` — nguồn chuẩn PL/SQL/database contract.

Mọi công việc chuyển đổi sang MVC5 là **chuyển đổi**, không phải **thiết kế lại**: giữ nguyên UI/UX và
nghiệp vụ trừ khi có quyết định thay đổi được người dùng phê duyệt rõ ràng. Nguyên tắc bất di bất dịch: "PL/SQL
fetch, frontend chỉ đổ vào hiển thị" — [`CLAUDE.md`](../CLAUDE.md) mục 1, 4.

## 4. Phân vai

| Vai trò | Trách nhiệm |
|---|---|
| **Claude Code** | Thiết kế Design Pack, xác minh dữ liệu/PL/SQL trên Oracle thật, sửa `frontend/index.html`/`.pks`/`.pkb` khi được duyệt, review implementation của Codex |
| **Codex** | Triển khai application code (ASP.NET MVC 5) + unit test, chỉ sau khi Design Pack được duyệt |
| **Người dùng** | Phê duyệt cuối mọi quyết định thiết kế/nghiệp vụ/thay đổi UI hoặc PL/SQL |

Chi tiết quy tắc phối hợp (sở hữu file, tránh giẫm thay đổi, review chéo):
[`docs/AI_COLLABORATION.md`](AI_COLLABORATION.md). Điểm vào cho Codex: [`AGENTS.md`](../AGENTS.md).

## 5. Quy trình

```
Design Pack (Claude Code)
  → người dùng phê duyệt
  → Claude Code cập nhật Prototype/PL/SQL nếu thật sự cần + kiểm chứng bằng Oracle thật
  → Codex triển khai application code + unit test
  → Claude Code review
  → người dùng nghiệm thu
```

Codex **không được** bắt đầu application code khi Design Pack còn trạng thái `Draft`. Chi tiết:
[`CLAUDE.md`](../CLAUDE.md) mục 6-7, [`docs/AI_COLLABORATION.md`](AI_COLLABORATION.md) mục 3.

## 6. Tài liệu bắt buộc phải đọc (theo thứ tự)

1. File này (`docs/PROJECT_CONTEXT.md`) — tổng quan + điều hướng.
2. [`CLAUDE.md`](../CLAUDE.md) — bối cảnh dự án, kiến trúc, quy tắc PL/SQL/nghiệp vụ.
3. [`docs/AI_HANDOFF.md`](AI_HANDOFF.md) — trạng thái bàn giao **mới nhất**, luôn đọc trước khi bắt đầu bất
   kỳ việc gì (thông tin ở đây đổi thường xuyên hơn file này).
4. [`docs/AI_COLLABORATION.md`](AI_COLLABORATION.md) — quy trình phối hợp Claude Code ↔ Codex.
5. [`DESIGN_SYSTEM.md`](../DESIGN_SYSTEM.md) — bắt buộc khi việc liên quan UI hoặc scaffold ASP.NET MVC 5.
6. [`TBH_DMT-SHARED-CONTEXT.md`](TBH_DMT-SHARED-CONTEXT.md) — tri thức dùng chung, Rule 8, data grain và các bài học QA/DB đã kiểm chứng.
7. [`PLAYBOOK_TOI_UU_HIEU_NANG_PLSQL.md`](PLAYBOOK_TOI_UU_HIEU_NANG_PLSQL.md) — sổ tay tối ưu PL/SQL và quy tắc đo/đối chiếu an toàn.
8. [`docs/architecture/ADR-001-MVC5-ODPNET.md`](architecture/ADR-001-MVC5-ODPNET.md) — quyết định kiến trúc
   hiện hành.
9. Khi phân tích BA hoặc thiết kế có liên quan dữ liệu KRDB/OP, đọc
   [`docs/KRDB_OP_READONLY_BASELINE_2026-09-16.md`](KRDB_OP_READONLY_BASELINE_2026-09-16.md) — baseline đối
   chiếu read-only trên dữ liệu năm 2026, đặc biệt lưu ý khác biệt nguồn tổn thất gộp.
10. Khi công việc liên quan hiệu năng tính hiệu quả đơn, đọc
   [`docs/HQ_PROCEDURE_PERFORMANCE_RESEARCH_2026-09-17.md`](HQ_PROCEDURE_PERFORMANCE_RESEARCH_2026-09-17.md)
   — baseline đo thật, finding P1/P2 và trình tự thử nghiệm an toàn qua shadow package.
11. Design Pack của feature đang làm, VD
   [`docs/features/FT-001-SEARCH-POLICIES/`](features/FT-001-SEARCH-POLICIES/).

## 7. Trạng thái hiện tại

- **PCK_TBH_REPORT (Đã deploy TG22_KRDB 2026-09-17, VALID)**: Đã tối ưu hiệu năng `PRC_FIRE_PREMIUM_BR` (tiết kiệm ~30s cho năm 2017) và hoàn thành chuẩn hóa `PRC_FIRE_PAID_BR` (43 cột theo đặc tả và metadata gốc từ `PRC_CL_PROPERTY_TO_EXCEL.sql`: chuẩn hóa cột STT `No.` liên tục, cột `BU` ra tên công ty/chi nhánh bằng chữ, cột `Business` ra ngành nghề kinh doanh, cột `Insured` ra tên khách hàng/công ty tiếng Việt, cột `CAT`/`Category` ra lớp rủi ro). Triển khai theo quy trình Shadow-First (`DEV_PCK_TBH_REPORT` -> `PCK_TBH_REPORT`), kiểm thử thực tế trả về 215 bản ghi bồi thường; 151/151 unit test C# tiếp tục PASSED 100%. **Lưu ý đặc biệt cho Claude Code khi đóng gói Production**: Trên Production có khoảng **81 công ty thành viên**, giải pháp `bu_name_map` đã tối ưu tự nhiên cho quy mô này (chỉ tối đa 81 lần gọi hàm BU thay vì lặp theo dòng). Xem chi tiết bàn giao tại [`docs/AI_HANDOFF.md`](AI_HANDOFF.md).
- **FT-004 — Trang chủ và chuẩn hoá giao diện toàn site**: Claude Code đã review ĐẠT — chờ nghiệm thu.
  FT-001/FT-002/FT-003 đã triển khai xong, **đã commit + đã merge vào `master`** (2026-09-05 — xem `docs/AI_HANDOFF.md`). [`docs/features/FT-004-TRANG-CHU/`](features/FT-004-TRANG-CHU/): PL/SQL (`PRC_HOME_GET_RECENT_ACTIVITY`/`PRC_HOME_GET_HQ_STATS`) đã deploy + kiểm chứng thật trên `TG22_KRDB`; Codex đã dựng xong application code (`HomeController`/`IHomeRepository`/`OracleHomeRepository`/`Views/Home/Index.cshtml`...); Claude Code đã review toàn bộ + kiểm chứng động qua IIS Express + Oracle thật — **ĐẠT, không phát hiện lỗi**. Còn CHƯA commit, chờ người dùng nghiệm thu. Bối cảnh: app trước đây chưa có trang chủ thật (route mặc định
vào thẳng `HieuQuaDon/Search`); khối "Dashboard" cũ trong `frontend/index.html` (KPI/biểu đồ) **chủ động
không được port** vì toàn bộ là số mock không có PL/SQL đứng sau, thiết kế cho phạm vi sản phẩm rộng hơn đã
bị cắt từ lâu — trang chủ mới thiết kế lại từ đầu, đơn giản (điều hướng nhanh + vài số thật), đúng phạm vi
hiện tại (1 công cụ + quản trị).

Người dùng đã duyệt dùng phong cách của Trang chủ cho toàn website. Codex đã tách component CSS dùng chung và
áp dụng lần lượt cho nhóm Quản trị/Tài khoản/Đăng nhập, sau đó đồng bộ có kiểm soát màn Hiệu quả nghiệp vụ tái;
không thay đổi PL/SQL hay logic nghiệp vụ. Claude Code đã review toàn bộ + kiểm chứng động qua IIS Express +
Oracle thật (ADMIN/non-ADMIN, Access Denied, đăng xuất/đăng nhập lại, luồng Tìm kiếm/Tính toán/Drawer
`HieuQuaDon/Search`, desktop 1440px/mobile 390px) — **ĐẠT**, phát hiện và tự sửa 1 lỗi cascade CSS nhỏ (mobile,
căn giữa nhầm toolbar `AdminUser/List`), đã verify lại sau sửa. Build 0 lỗi, 81/81 unit test, Razor precompile
đều đạt. Còn CHƯA commit, chờ người dùng nghiệm thu. Chi tiết đầy đủ ở `docs/AI_HANDOFF.md`.

### 7b. FT-002 — Tính hiệu quả đơn (tạm nghiệm thu, chưa commit)

[`docs/features/FT-002-TINH-HIEU-QUA-DON/`](features/FT-002-TINH-HIEU-QUA-DON/) — 7 thủ tục
`PRC_HQ_CALC_SUMMARY*`/`PRC_HQ_GET_RI_STRUCTURE`/`PRC_HQ_GET_CLAIMS`/`PRC_HQ_GET_XOL_LAYERS`/
`PRC_HQ_EXPORT_RESULT` đã deploy, application code đã triển khai + trải qua nhiều vòng review đối chiếu trực
tiếp với `frontend/index.html` qua trình duyệt thật (2026-09-03) — người dùng đã tạm nghiệm thu, còn 2 việc
mở tự quyết định (finding backend #4 trong `CLAUDE_REVIEW.md`, thời điểm commit). Chi tiết đầy đủ luôn ở
`docs/AI_HANDOFF.md` (ưu tiên hơn tóm tắt này nếu khác biệt).

## 7b. Trạng thái trước đó: FT-001 — Tìm kiếm đơn phát sinh (đã xong, đã merge)

Design Pack tại [`docs/features/FT-001-SEARCH-POLICIES/`](features/FT-001-SEARCH-POLICIES/), trạng thái
**`Draft — chưa được duyệt`**. Tổng hợp phân loại từng hạng mục + toàn bộ quyết định còn cần người dùng
phê duyệt: [`SPEC.md`](features/FT-001-SEARCH-POLICIES/SPEC.md) mục "Bảng tổng hợp phân loại" và "Quyết định
cần phê duyệt". Trạng thái/blocker mới nhất luôn ở [`docs/AI_HANDOFF.md`](AI_HANDOFF.md) — **ưu tiên file đó
hơn tóm tắt dưới đây nếu có khác biệt**.

Tóm tắt (có thể lỗi thời — xem mục 6.3):

- Chưa có application code, chưa sửa Prototype/PL/SQL.
- Đã quyết: FT-001 chỉ dừng ở tìm kiếm (không gồm tính hiệu quả đơn); không bổ sung cột CTTV cấp cha vào
  cursor `PRC_HQ_SEARCH_POLICIES`.
- Còn mở: nguồn dữ liệu CTTV cho dropdown lọc, dropdown CAT, dropdown Ngành nghề, và các quyết định UI/kỹ
  thuật khác — xem mục 8 bên dưới và `SPEC.md`.

## 8. Quyết định đang mở đáng chú ý: tên/ID CTTV và `cttvParent`

Hai vấn đề cốt lõi xuyên suốt FT-001, đã xác minh trên Oracle thật nhưng **chưa được người dùng duyệt**:

- **CTTV name ↔ ID**: `frontend/index.html` chọn CTTV bằng **tên hiển thị tĩnh** (hard-code, không có ID);
  `PRC_HQ_SEARCH_POLICIES` yêu cầu `p_cttv_list` là CSV **business-unit ID dạng số**. Chưa có database
  contract nào cung cấp cặp (ID, tên) cho CTTV — đề xuất bổ sung procedure mới `PRC_HQ_GET_CTTV_LIST`, chưa
  duyệt. Chi tiết + bằng chứng:
  [`DB_CONTRACT.md`](features/FT-001-SEARCH-POLICIES/DB_CONTRACT.md) mục 2, 4, 5.
- **`cttvParent`**: prototype dùng field `cttvParent` (CTTV **cấp cha**) để lọc và hiển thị cột "Công ty
  thành viên" trong bảng kết quả, nhưng cursor `PRC_HQ_SEARCH_POLICIES` thật **không trả** trường này (chỉ
  trả `phong_kinh_doanh` — CTTV **cấp trực tiếp**, khác hàm và khác ý nghĩa). Người dùng **đã quyết định
  (2026-08-31): không sửa PL/SQL để bổ sung cấp cha** — cột "Công ty thành viên" bị bỏ khỏi bảng kết quả của
  FT-001. Chi tiết: [`DB_CONTRACT.md`](features/FT-001-SEARCH-POLICIES/DB_CONTRACT.md) mục 6,
  [`UI_SPEC.md`](features/FT-001-SEARCH-POLICIES/UI_SPEC.md) mục 5.

Các quyết định mở khác (dropdown CAT/Ngành nghề, validation, cấu trúc file...) không lặp lại ở đây — xem đầy
đủ tại `SPEC.md` mục "Quyết định cần phê duyệt".

## 9. Worktree và branch

Repo dùng git worktree — nhiều bản làm việc song song trên cùng lịch sử Git:

- Checkout chính: `D:\ClaudeVibe\TBH_DMT` (branch `master`).
- Worktree Design Pack FT-001: `D:\ClaudeVibe\TBH_DMT-claude` (branch `design/FT-001-search-policies`).

Kiểm tra worktree/branch hiện tại bằng `git worktree list` và `git status --short --branch` trước khi sửa —
**không giả định** đang ở checkout nào. Stash stack dùng chung giữa các worktree; không dùng `git stash`/
`git stash pop` trần trụi (có thể lấy nhầm stash của phiên khác) — xem cảnh báo môi trường của công cụ đang
dùng nếu có.

## 10. Khởi động lại ở phiên mới

1. Đọc file này, rồi [`CLAUDE.md`](../CLAUDE.md), rồi [`docs/AI_HANDOFF.md`](AI_HANDOFF.md) (mục 6).
2. Chạy `git worktree list`, `git status --short --branch`, `git diff --check` để biết đang ở đâu và có gì
   chưa commit (mục 9).
3. Nếu đang tiếp tục 1 feature cụ thể, đọc toàn bộ Design Pack của feature đó trong `docs/features/<ID>/`
   (không chỉ `SPEC.md`).
4. Không tự commit/push, không tự sửa Prototype hoặc PL/SQL nếu Design Pack liên quan chưa được người dùng
   duyệt — kiểm tra trạng thái ở đầu mỗi file Design Pack trước khi sửa.
5. Nếu phát hiện tài liệu mâu thuẫn nhau, ưu tiên quyết định có ghi ngày mới hơn và báo rõ mâu thuẫn thay vì
   tự chọn một phía (nguyên tắc đã nêu ở `AGENTS.md`).

## 11. Không chứa dữ liệu nhạy cảm

File này (và mọi tài liệu Design Pack trong `docs/`) **không được chứa** credential, connection string thật,
mật khẩu, hay dữ liệu Oracle thật nhạy cảm — chỉ tên connection (`TG22_KRDB`, `TG22_OP`), tên bảng/cột, và số
liệu thống kê phi định danh dùng để xác minh thiết kế. Ghi chú vận hành/hạ tầng không chứa secret nằm ở
[`CLAUDE.md`](../CLAUDE.md) mục 5.

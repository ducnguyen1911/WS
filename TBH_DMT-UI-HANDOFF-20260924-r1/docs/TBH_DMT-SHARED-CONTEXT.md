# TBH_DMT — Shared Context cho 3 AI

## Gemini Ultra (Dev ~40-45%) × Claude Code Pro (Chief Architect & Final Gate ~25-30%) × ChatGPT Plus (BA+QA+Docs ~25-30%)

> **Mục đích:** File ngữ cảnh chung — paste vào đầu mỗi conversation với bất kỳ AI nào. Tổng hợp từ 2 repo thực tế: `TBH_DMT` (master) và `TBH_DMT-claude` (design worktree). Cập nhật: 2026-09-15.

---

## 1. Dự án là gì

**TBH_DMT** — Ứng dụng web nội bộ **Bảo Việt**: tính hiệu quả nghiệp vụ tái bảo hiểm theo đơn phát sinh, cộng thêm quản trị hệ thống (quản lý người dùng, nhật ký, đổi mật khẩu).

- **Đơn vị sử dụng:** Phòng Tái bảo hiểm — Tổng Công ty Bảo hiểm Bảo Việt
- **Môi trường:** Mạng cô lập (intranet only), vài chục user nội bộ
- **Trạng thái:** Đang phát triển tích cực — FT-001/002/003 đã merge, FT-004 chờ nghiệm thu

---

## 2. Kiến trúc — 3 lớp

```
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND (trình duyệt hiện đại: Chrome / Edge / Firefox)  │
│  • Prototype: frontend/index.html (HTML/JS thuần, mock data)│
│  • App thật: ASP.NET MVC 5 Views + Razor + JS              │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP (IIS 7.5)
┌───────────────────────────▼─────────────────────────────────┐
│  BACKEND — ASP.NET MVC 5 (.NET Framework 4.8)               │
│  • Controllers → Repository pattern (IReinsuranceRepository)│
│  • ODP.NET Managed Driver → Oracle TRỰC TIẾP               │
│  • KHÔNG dùng ORDS (đã loại bỏ — WS2008R2 không hỗ trợ)   │
│  • Xác thực tự quản lý (không AD/SSO), Forms Authentication │
└───────────────────────────┬─────────────────────────────────┘
                            │ ODP.NET
┌───────────────────────────▼─────────────────────────────────┐
│  DATABASE — Oracle 11g (TG22_KRDB, schema KOUKIA)           │
│  • 2 PL/SQL packages:                                       │
│    - PCK_TBH_TOOL (app chính: PRC_HQ_*, PRC_ADMIN_*,       │
│      PRC_HOME_*)                                            │
│    - PCK_TBH_REPORT (báo cáo gốc: PRC_FIRE_PREMIUM_BR...) │
│  • Bảng mới prefix TBH_ (TBH_USER, TBH_AUDIT_LOG,         │
│    TBH_HQ_RESULT, TBH_CTTV...)                             │
│  • DB-link: @opbvgi.baoviet.com.vn (đối chiếu TG22_OP)    │
└─────────────────────────────────────────────────────────────┘

```

### Ràng buộc hạ tầng (KHÔNG thay đổi được)

| Thành phần | Chi tiết |
| --- | --- |
| **Máy chủ** | Windows Server 2008 R2 SP1, IIS 7.5 |
| **Backend** | .NET Framework 4.8 (tối đa), **KHÔNG lên được .NET Core/5+** |
| **Database** | Oracle 11g (11.2.0.3/11.2.0.4), DBMS_CRYPTO chỉ hỗ trợ MD4/MD5/SHA-1 |
| **Mạng** | Cô lập — vendor thư viện/font vào project, không gọi CDN từ server |
| **Client** | Chrome/Edge/Firefox hiện đại — ES6+, CSS Grid, CSS variables OK |
| **Driver** | ODP.NET Managed Driver tương thích Oracle 11g |

---

## 3. Cấu trúc Repo

### Repo chính: `D:\ClaudeVibe\TBH_DMT` (branch `master`)

```
TBH_DMT/
├── frontend/index.html          ← Prototype HTML/JS đã duyệt (nguồn chuẩn UI/UX)
├── db/
│   ├── packages/
│   │   ├── PCK_TBH_TOOL.pks    ← Package specification
│   │   └── PCK_TBH_TOOL.pkb    ← Package body
│   └── ddl/                     ← DDL bảng mới (6 scripts)
├── docs/
│   ├── PROJECT_CONTEXT.md       ← Điểm khởi động dự án
│   ├── AI_COLLABORATION.md      ← Quy trình cộng tác AI
│   ├── AI_HANDOFF.md            ← Trạng thái bàn giao mới nhất
│   ├── DEPLOY_WS2008R2.md       ← Hướng dẫn deploy
│   ├── KIENTRUC_HE_THONG_*.md  ← Tài liệu kiến trúc
│   ├── architecture/            ← ADR (Architecture Decision Records)
│   └── features/                ← Design Pack theo feature
├── CLAUDE.md                    ← Quy ước code + bối cảnh dự án
├── AGENTS.md                    ← Hướng dẫn cho Codex
└── DESIGN_SYSTEM.md             ← Chuẩn UI + quyết định hạ tầng

```

### Worktree phát triển: `D:\ClaudeVibe\TBH_DMT-claude` (branch `design/FT-001-search-policies`)

```
TBH_DMT-claude/                  (cùng lịch sử Git, branch khác)
├── [giống master + thêm:]
├── src/
│   ├── TBH_DMT.sln             ← Solution ASP.NET MVC 5
│   ├── TBH_DMT.Web/            ← Project web chính
│   └── TBH_DMT.Web.Tests/      ← Unit tests (81 tests đạt)
├── db/packages/
│   ├── PCK_TBH_TOOL.pks/.pkb   ← (phiên bản mới hơn master)
│   ├── PCK_TBH_REPORT.pks/.pkb ← Package báo cáo gốc (mới)
│   └── ddl/DDL_TBH_JOB.sql     ← (thêm 1 file so với master)
├── outputs/                     ← 23 bản build deploy (r1→r23)
└── TestResults/

```

---

## 4. Chuẩn Code — BẮT BUỘC cho cả 3 AI

### 4.1 PL/SQL

| Quy tắc | Chi tiết |
| --- | --- |
| **Package** | Chỉ 2 package: `PCK_TBH_TOOL` (app) + `PCK_TBH_REPORT` (báo cáo gốc) |
| **Output** | Thủ tục trả `OUT SYS_REFCURSOR`, không `DBMS_OUTPUT` |
| **Naming** | Bảng/view mới: prefix `TBH_`. Object CSDL viết HOA. Schema: `koukia.table_name` |
| **Params** | `p_` cho tham số vào, `l_` cho biến cục bộ |
| **Transaction** | Thủ tục tự quản lý, nêu rõ `COMMIT` trong comment header |
| **Error** | `WHEN OTHERS` phải `RAISE` lại, không nuốt lỗi |
| **Comment** | Header bắt buộc mỗi thủ tục mới (mẫu: xem PRC_ADMIN_*/PRC_HQ_*) |
| **Tên cũ** | Object đã tồn tại giữ nguyên tuyệt đối, không đổi/"chuẩn hoá" |

### 4.2 C# / ASP.NET MVC 5

| Quy tắc | Chi tiết |
| --- | --- |
| **Architecture** | Repository pattern + DAL tách biệt Controller |
| **Interface** | Mọi lời gọi Oracle đi qua interface (`IReinsuranceRepository`, `IHomeRepository`...) |
| **Async** | Không bắt buộc (MVC5 + .NET 4.8 hạn chế async Oracle) |
| **Auth** | Forms Authentication (cookie mã hoá), phân quyền Admin/Editor/Viewer |
| **Password** | SHA-1 via DBMS_CRYPTO + salt ngẫu nhiên (SHA-256 KHÔNG hoạt động trên instance này) |

### 4.3 Frontend / JavaScript

| Quy tắc | Chi tiết |
| --- | --- |
| **Font** | Inter (self-host woff2 trong /Content/fonts) |
| **Màu chính** | `#1B75BC` (bv-blue), `#06478F` (bv-blue-dark), `#E7AE00` (bv-gold) |
| **CSS** | Dùng CSS custom properties OK, Tailwind OK (build-time compile) |
| **JS** | ES6+ chạy thẳng (Chrome/Edge/Firefox), không cần Babel |

### 4.4 Nguyên tắc SỐNG CÒN: "PL/SQL fetch, frontend chỉ đổ vào hiển thị"

> ⚠️ **Đã vi phạm và sửa lại NHIỀU LẦN trong quá trình phát triển.**

- Frontend **KHÔNG** tự tính toán/suy diễn số liệu nghiệp vụ
- Mọi số tiền, tỷ lệ, phân loại phải đến thẳng từ kết quả PL/SQL
- Trước khi coi 1 tính năng là xong: **đối chiếu số liệu hiển thị với kết quả PL/SQL trực tiếp trên dữ liệu thật**
- Khi sửa PL/SQL: **grep lại toàn bộ frontend** tìm comment/số liệu cứng liên quan

### 4.5 🔴 Bảo vệ Tài sản hiện có — BẤT KHẢ XÂM PHẠM

Cả 3 AI **KHÔNG ĐƯỢC** xoá, sửa, hay cập nhật bất kỳ table, dữ liệu, hay code nào **không phải do 3 AI tạo ra** trong dự án này.

| ❌ KHÔNG ĐƯỢC đụng | ✅ CHỈ ĐƯỢC đụng |
| --- | --- |
| Bảng Core hệ thống (không prefix `TBH_`) | Bảng prefix `TBH_` (do dự án tạo) |
| Dữ liệu production / dữ liệu Core | Dữ liệu trong bảng `TBH_*` |
| PL/SQL packages hệ thống cũ | `PCK_TBH_TOOL`, `PCK_TBH_REPORT` |
| Config server/DB/IIS | Code trong repo `TBH_DMT` |

**Khi cần sửa object có sẵn** → báo cáo Orchestrator + chờ phê duyệt, KHÔNG tự ý sửa.

### 4.6 🔴 `TG22_KRDB` dùng CHUNG với UAT — bắt buộc dev qua Shadow Package

`TG22_KRDB` không phải DB dev cô lập — `CREATE OR REPLACE PACKAGE` có hiệu lực ngay cho mọi session,
kể cả UAT đang chạy. **KHÔNG được `CREATE OR REPLACE` trực tiếp lên `PCK_TBH_TOOL`/`PCK_TBH_REPORT`
thật khi còn đang dev/test dở** — dùng bản sao `KOUKIA.DEV_PCK_TBH_TOOL`/`KOUKIA.DEV_PCK_TBH_REPORT`
(cùng nội dung, chỉ đổi tên package ở dòng đầu/cuối file) để test tự do, không ảnh hưởng UAT.

C# gọi tên package qua `PlSqlPackages.Tool`/`.Report` (`Infrastructure/PlSqlPackages.cs`, đọc
`Web.config` appSettings `PlSqlToolPackage`/`PlSqlReportPackage`) — **không hard-code tên package**.
Dev cục bộ: đổi tạm 2 appSettings này sang `DEV_...`, **bắt buộc trả về mặc định trước khi commit**.
Chỉ `CREATE OR REPLACE` lên package thật + deploy `bin/TBH_DMT.Web.dll` **cùng lúc** khi đóng gói.

Chi tiết đầy đủ: `CLAUDE.md` mục 3a.

### 4.7 🔴 Chuẩn Hạt Dữ Liệu (Data Grain) & Gom Vị Trí Hợp Đồng (NB + MTA)

Đây là quy tắc sống còn về mặt dữ liệu được đúc kết từ đợt xử lý FT-006 (finding `FT006-QA-03`):

1. **Nghiệp vụ Phi hàng hải (Non-Cargo - Fire, Engineering, Liability, Misc,...):**
   - **Hạt dữ liệu (Grain) chuẩn:** Là **Kỳ hạn hợp đồng** (`policy_urn` + `inception_date`).
   - **Cơ chế Gom vị trí (Positions / Endorsements):** Một kỳ hạn hợp đồng gồm 1 đơn cấp mới (`NB`) và có thể có nhiều đơn sửa đổi bổ sung (`MTA`), hủy, khôi phục... trong suốt kỳ hạn (bảng `KOUKIA.KD_POLICY_GENERIC`).
   - **Nguyên tắc tính toán tái bảo hiểm:** Dù bộ lọc tìm kiếm theo ngày hiệu lực (`ngay_hieu_luc`) chỉ chạm vào một vị trí cụ thể (ví dụ NB), phép tính toán hiệu quả và tái bảo hiểm của kỳ hạn đó **bắt buộc phải tổng hợp tất cả các vị trí (NB + toàn bộ MTAs) cùng `(policy_id, inception_date)` có `status_reversed IS NULL`**.
   - **Tuyệt đối không được** chỉ tính riêng lẻ vị trí con trong `base_f` đã bị lọc theo ngày hiệu lực, vì sẽ bỏ sót các MTA phát sinh sau ngày đầu kỳ (ví dụ đơn `7807313`: NB ngày 31/07 có phí nhượng 1,02 tỷ, nhưng MTA ngày 04/08 có phí nhượng tới 46,46 tỷ; tổng phí nhượng đúng phải là 47,49 tỷ).

2. **Nghiệp vụ Hàng hải chuyến (Cargo):**
   - **Hạt dữ liệu (Grain) chuẩn:** Là **Chuyến hàng / Giấy chứng nhận bảo hiểm** (`policy_urn` + `effective_from` + `ship_cov_id`).

### 4.8 🔴 Đồng Bộ Giữa 2 Calculation Engines (Single Policy vs Batch Calculation)

Hệ thống có 2 calculation engines song song trên Oracle PL/SQL:
- **Engine đơn (Single Policy):** `PRC_HIEUQUA_DON_BAOHIEM_KRDB` (phục vụ RunList & Detail Drawer).
- **Engine lô (Batch Calculation):** `PRC_HQ_CALC_SUMMARY_BATCH` (phục vụ RunBatch & Export Excel toàn bộ job).

**Quy tắc bất biến:**
- Cả hai engine phải dùng chung grain và logic tổng hợp vị trí. Trong `PRC_HQ_CALC_SUMMARY_BATCH`, CTE `pop_member` phải gom toàn bộ vị trí cùng `(policy_id, inception_date)` cho Non-Cargo từ `target_terms`, và giữ nguyên grain chuyến hàng cho Cargo.
- Kết quả ở cả hai engine phải khớp nhau 100% đến từng số thập phân cho mọi chỉ tiêu (Phí gốc, Phí nhượng, Hoa hồng nhượng, Tỷ lệ nhượng tái trung bình,...).
- **Search (`PRC_HQ_SEARCH_POLICIES`) và Batch phải chọn CÙNG tập kỳ hạn cho cùng bộ lọc ngày** (Non-Cargo: `inception_date` của kỳ hạn, chốt 2026-09-06). Khớp giá trị của một kỳ hạn chưa đủ: nếu Batch tự chọn thêm kỳ hạn mà danh sách tìm kiếm không có thì job/export lệch số dòng và có thể đếm đôi giữa các kỳ báo cáo. **Trạng thái 2026-09-20: đã sửa trên source + shadow, CHỜ Codex retest, chưa deploy package thật** (finding FT006-FG-01, xem 4.11 mục 10 và ADR-002). Kiểm tra bắt buộc sau mọi thay đổi bộ lọc của Batch hoặc Search: `db/tests/PARITY_SINGLE_VS_BATCH.sql` Phần B (chênh = 0).

### 4.9 🔴 Quy Chuẩn Con Trỏ (Ref Cursor Contracts) & Tỷ Lệ Tái Bảo Hiểm

1. **Số lượng cột con trỏ trả về cho C#** — `HONG_NHUONG_TAI_TB_PCT` luôn là **cột CUỐI** của mọi cursor (append-only, không chèn giữa):
   - `PRC_HQ_CALC_SUMMARY` (engine đơn): **20 cột**, cột cuối = cột 20.
   - `PRC_HQ_CALC_SUMMARY_BATCH` / `PRC_HQ_CALC_SUMMARY_MULTI`: **22 cột**, cột cuối = cột 22.
   - `PRC_HQ_JOB_GET_RESULT` / `PRC_HQ_JOB_GET_RESULT_PAGE` (kết quả/phân trang): **22 cột**, cột 22 (C# `HqCalcResultRowMapper` đọc index 21).
   - `PRC_HQ_JOB_GET_EXPORT` (xuất Excel toàn job): **28 cột**, cột 28 (C# `HqExportRowMapper` đọc index 27).
   - ⚠️ "Cột 15 / cột O" chỉ đúng cho **sheet Excel** (template A..S, O = Hồng nhượng tái TB, P = Hiệu quả), KHÔNG phải vị trí trong cursor — đã từng bị ghi nhầm ở bản đầu của mục này (sửa 2026-09-19, Claude Code).
2. **Công thức Tỷ lệ hồng nhượng tái TB (`HONG_NHUONG_TAI_TB_PCT`):**
   - $\text{Tỷ lệ (\%)} = \frac{\sum \text{Hoa hồng nhượng tái}}{\sum \text{Phí nhượng tái}} \times 100$.
   - **Xử lý biên:** Nếu $\sum \text{Phí nhượng tái} \le 0$ (hoặc không có nhượng tái): Trả về `NULL` (không chia cho 0, không trả về `0%`).
   - **Hiển thị & Lưu trữ:** Web UI hiển thị định dạng `F2` (`xx.xx%`), Excel lưu trữ dạng numeric ratio thuần túy (`0.xxxxxxxx`) với style cell định dạng phần trăm `0.00%`.

### 4.10 🔴 Quy Định Bắt Buộc: Đồng Bộ Tri Thức Chung Liên Tục (Rule 8)

* Khi bất kỳ AI nào (Gemini, Claude, Codex/ChatGPT) phân tích ra Root Cause mới, bổ sung ràng buộc kiến trúc, phát hiện edge case nghiệp vụ hoặc quy luật CSDL:
  1. **Cập nhật ngay vào `docs/TBH_DMT-SHARED-CONTEXT.md`** (để lưu trữ tri thức lâu dài).
  2. **Ghi tóm tắt bàn giao vào đầu `docs/AI_HANDOFF.md`** (để AI tiếp theo lập tức tiếp nhận).
  3. **Đóng băng tri thức bằng Regression Test** (trong C# MSTest hoặc JS test) để hệ thống tự động bảo vệ logic đó.
* Không được phép giữ tri thức ngầm trong ngữ cảnh cục bộ của một phiên chat.

### 4.11 🔴 Bài học Final Gate FT-006 (Claude Code, 2026-09-19) — ADR-002

Chi tiết quyết định: [`docs/architecture/ADR-002-TERM-GRAIN-ENGINE-PARITY.md`](architecture/ADR-002-TERM-GRAIN-ENGINE-PARITY.md).

1. **Bộ lọc ngày chỉ CHỌN kỳ hạn, không CHỌN vị trí.** NB dùng `inception_date`, MTA dùng `effective_from` → MTA có thể nằm
   ngoài khoảng lọc dù cùng kỳ hạn. Cả 2 engine phải gom toàn bộ vị trí `status_reversed IS NULL` của kỳ hạn. Đây là lần thứ
   2 gặp cùng họ lỗi (lần 1 ở wrapper `PRC_HQ_CALC_SUMMARY_MULTI` 2026-08-24: chia theo quý sinh 1.388 `policy_urn` lặp).
   Khi thêm chỉ tiêu mới, nghi ngờ đầu tiên phải là "tập vị trí", không phải công thức.
2. **Unit test C#/JS KHÔNG bảo vệ logic gom vị trí.** Test hồi quy `..._MultiplePositions_NewBusinessAndMta_...` (C#) và
   `buildExportRow ... 7807313` (JS) chỉ đưa số đã tính sẵn qua mapper — PL/SQL sai vẫn PASS. Bảo vệ thật sự:
   `db/tests/PARITY_SINGLE_VS_BATCH.sql` (đối soát Single ↔ Batch trên mọi kỳ hạn nhiều vị trí). Chạy lại sau mọi thay đổi
   `pop_member`/`ceded`/`prem`/`retained_prem` hoặc engine đơn. Với mọi finding kiểu "lệch giữa 2 engine", regression phải
   chạy trên Oracle, không chỉ mock.
3. **`position_type IN (...)` của Batch chặt hơn engine đơn** (engine đơn không lọc). Hiện an toàn: mọi bản ghi có `policy_urn`
   thuộc 6 loại (`NewBusiness, Renewal, MidTermAdjustment, ShortTermAdjustment, Reinstatement, Cancellation`); 2 bản ghi
   `position_type IS NULL` không có `policy_urn` (2018, `TPFG`). Nếu Core thêm loại vị trí mới → sửa CẢ HAI engine.
4. **Cursor: cột mới luôn append vào CUỐI** (xem 4.9). Đừng nhầm số thứ tự cột Excel (O = 15) với vị trí cột trong cursor.
5. **Bẫy công cụ:** trong Git Bash, `dotnet msbuild ... /t:Rebuild` bị đổi thành đường dẫn → `MSB1008`, build không chạy;
   nếu nối tiếp `vstest` thì test chạy trên **DLL cũ** và vẫn báo PASS. Chạy gate build/test bằng **PowerShell** và luôn đọc
   dòng `Build succeeded` trước khi tin số test.
6. **Kết nối SQLcl MCP tới `TG22_KRDB` là READ WRITE + AUTOCOMMIT ON** (DB dùng chung với UAT). Khi review chỉ chạy `SELECT`,
   gọi thủ tục chỉ-đọc qua `DEV_PCK_TBH_TOOL`; không DDL/DML.
7. **Phạm vi sản phẩm = `tbh_param_product` (`active_flag='Y'`)**, dùng chung bởi Search và Batch. Đơn ngoài bảng này
   (VD `MVS` xe cơ giới) không xuất hiện ở RunList/RunBatch; engine đơn vẫn tính được nếu gọi thẳng theo số đơn, nên đối soát
   Single ↔ Batch phải lọc phạm vi này, nếu không sẽ có `BATCH_NO_ROW` giả. Oracle 11g: không có `LISTAGG(DISTINCT ...)`.
8. **Bẫy công cụ SQLcl MCP:** `DBMS_OUTPUT` không hiển thị (mọi `SET SERVEROUTPUT` bị chèn comment phía trước → `SP2-0158`).
   Một lần chạy ~15 phút đã không trả về gì. Hai cách lấy kết quả PL/SQL, cả hai chỉ cho khối chỉ-đọc: (a) cộng vào chuỗi rồi
   `RAISE_APPLICATION_ERROR(-20999, chuoi)` ở cuối khối (tối đa ~2.000 ký tự; nhớ `NVL(LENGTH(x),0)` vì `LENGTH(NULL)` là NULL);
   (b) SQLcl CLI cục bộ `C:\App\sqlcl\bin\sql.exe -s -name TG22_KRDB @script.sql` — có `SET SERVEROUTPUT` và `spool` thật (dùng
   để dump `user_source` so với file nguồn). Mỗi lần gọi Batch ~12 giây — luôn thu hẹp phạm vi trước khi chạy vòng lặp lớn.
   Oracle 11g: alias tối đa 30 ký tự (`ORA-00972`). Dòng trống bị SQLcl bỏ khi spool — so sánh trên dòng có nội dung.
9. **Checklist trước "commit đi"** (mọi feature): (a) `Web.config` `PlSqlToolPackage`/`PlSqlReportPackage` về mặc định
   `KOUKIA.PCK_TBH_TOOL`/`KOUKIA.PCK_TBH_REPORT` (bài học 4.6 — FT-006 đã bàn giao với `DEV_PCK_TBH_TOOL` còn nguyên;
   kiểm tra bằng `git diff --stat -- src/TBH_DMT.Web/Web.config` phải RỖNG); (b) working tree thường lẫn nhiều feature — stage
   theo đường dẫn, không `git add -A`; (c) verdict QA mới nhất trong `docs/QA_REPORT_*.md` phải là APPROVE cho chính bản sửa
   cuối cùng, không phải verdict cũ; (d) mã trên shadow phải trùng nguồn sẽ commit (mục 11).
10. **Search ≠ Batch về tập kỳ hạn (FT006-FG-01, P2) — ĐÃ SỬA 2026-09-20 trên source + shadow, chờ Codex retest.** Gốc: `PRC_HQ_CALC_SUMMARY_BATCH.base_pre`
    tính `ngay_hieu_luc` của MTA/STA/Cancellation bằng `effective_from`, trong khi Search đã dùng `inception_date` cho mọi vị trí
    Non-Cargo (2026-09-06). RunBatch gọi thẳng Batch (`p_policy_urn_list=NULL`), không đi qua Search/MULTI, nên số dòng job/export
    lệch danh sách tìm kiếm (Fire 08/2026: Search 36, Batch 39; thừa 7807313/7807316/7807317; Fire Q1/2017: thừa 76/3.781 = 2,0%).
    Sửa: cùng một biểu thức CASE với Search. Sau sửa: 5/5 cửa sổ Search = Batch. **Bài học chung:** khi Search và một engine tính
    cùng "chọn tập dữ liệu", quy tắc chọn phải nằm ở MỘT nơi hoặc được test bằng Phần B; sửa quy tắc ở Search mà không grep các
    procedure dùng cùng khái niệm (`ngay_hieu_luc`) là nguồn gốc lỗi này (Search sửa 2026-09-06, Batch bị bỏ sót). Chi tiết: ADR-002.
    Lịch sử: đơn 7807313 đã dính họ lỗi "thiếu vị trí MTA khi gom kỳ hạn" 3 lần (RI_STRUCTURE 2026-08-25, wrapper chia quý
    2026-08-24, Batch FT006-QA-03) — luôn dùng đơn này làm ca thử bắt buộc. Rủi ro theo dõi: lọc CTTV/Cat/Ngành nghề Search áp
    trên vị trí đại diện, Batch áp trên từng vị trí (0/176 kỳ hạn 2026 bị ảnh hưởng).
11. **Chứng minh "mã đã kiểm thử = mã sẽ commit":** dump `user_source` của `DEV_PCK_TBH_TOOL` bằng SQLcl CLI, chuẩn hóa
    (bỏ CR, khoảng trắng cuối dòng, dòng trống, dòng `CREATE OR REPLACE`, dấu `/`, đổi tên package) rồi `diff` với
    `db/packages/PCK_TBH_TOOL.pkb/.pks`. Lý do: DB dùng chung với tác nhân khác có quyền ghi (Antigravity từng ghi đè
    `PCK_TBH_REPORT` bằng khung rỗng, 2026-09-15). FT-006: 0 khác biệt nội dung.
12. **Vệ sinh worktree — `.gitignore` KHÔNG chặn gì đáng kể** (chỉ `*.log`, `*.tmp`, thư mục IDE): `scratch/` (136 file, có file
    `test_http_endpoints.ps1` chứa username thật kèm chuỗi mật khẩu cứng cho ca "sai mật khẩu"), `outputs/` (ZIP release), `TBH_DMT/` (repo git lồng rỗng, chỉ có
    `.git`), `connectionStrings.local.config` đều có thể bị `git add -A` quét vào. `git status` gộp thư mục chưa theo dõi thành
    một dòng — kiểm tra nội dung bằng `ls`. `git diff --check` KHÔNG kiểm file chưa theo dõi: dùng `git diff --cached --check`
    sau khi stage (3 tài liệu Markdown mới của FT-006 có 13 dòng khoảng trắng cuối dòng, phần lớn là hard-break hợp lệ).
13. **Kiểm tra độc lập job của QA trên Oracle (Final Gate):** đừng chỉ tin số dòng trong báo cáo. Job ID trong UI/báo cáo là Guid
    dạng chuỗi `N`; cột `job_id` là `RAW(16)` nên phải **hoán đổi byte 3 nhóm đầu** (little-endian) trước khi `HEXTORAW`:
    `dcfade46|67c2|1041|80c098f12bfb0e8a` → `46defadc|c267|4110|80c098f12bfb0e8a`. Sau đó
    `SELECT COUNT(*), SUM(CASE WHEN policy_urn='<đơn>' THEN 1 ELSE 0 END) FROM koukia.tbh_hq_result WHERE job_id=HEXTORAW(...) GROUP BY job_id`
    (`policy_urn` là chuỗi; hoa hồng/phí nhượng ở `tong_hoa_hong_nhuong_tbh`/`phi_nhuong_tbh`). Đã dùng để xác nhận 23/36/10 dòng
    của retest FG-01 (2026-09-20).
14. **Tiến trình IIS Express còn sót:** phiên QA trước có thể để lại `iisexpress.exe` chạy từ chính thư mục `src\TBH_DMT.Web` của
    repo (FG-01: PID 24500, `/port:62000`, từ 2026-09-19 23:40, dù báo cáo chỉ nói dừng cổng 62001). Kiểm tra bằng
    `Get-CimInstance Win32_Process -Filter "Name='iisexpress.exe'"` (xem `CommandLine` để biết cổng và đường dẫn), dừng bằng
    `Stop-Process -Id <pid>` sau khi chủ phiên đồng ý. Tiến trình này chạy theo `Web.config` hiện tại nên sau khi trả về package
    thật nó sẽ lỗi `FieldCount` 22/28 nếu có ai truy cập.

---

### 4.12 🔴 Bài học Kỹ thuật FT-007 Paid Borderaux (Gemini Ultra, 2026-09-20)

1. **Kiến trúc Streaming Cursor (Sự khác biệt giữa Premium Borderaux và Paid Borderaux):**
   - Premium Borderaux chia làm 2 giai đoạn: `PRC_FIRE_PREMIUM_BR` ghi staging vào `TBH_FIRE_PREMIUM_BR_DATA` theo `batch_id`, sau đó worker hoặc download gọi `PRC_FIRE_PREMIUM_BR_GET_RESULT` để lấy dữ liệu.
   - Paid Borderaux (`PRC_FIRE_PAID_BR`) trả trực tiếp `SYS_REFCURSOR` (`c_result`) ngay trong lời gọi thủ tục, không qua bảng staging trung gian và không có thủ tục GET_RESULT.
   - Do đó, Background Worker (`OracleFirePaidBrRepository.RunExportJobAsync`) bắt buộc stream đọc cursor trực tiếp trên kết nối Oracle đó, clone template NPOI (`paid-borderaux-template.xlsx`), ghi 43 cột tuần tự ra file tạm trên đĩa (`App_Data/ReportJobs/PaidBorderaux/{jobId:N}.xlsx`), hoàn tất atomic rename file (`.tmp` → `.xlsx`) trước khi cập nhật `TBH_JOB` sang trạng thái `DONE` kèm đường dẫn tại `result_ref`.
   - Endpoint `DownloadFirePaidBrExcel` chỉ việc đọc file vật lý đã kết xuất dựa trên `result_ref` (được bảo vệ quyền sở hữu `owner_user_id`), tránh việc chạy lại procedure nặng hoặc nạp toàn bộ tập dữ liệu lớn vào bộ nhớ.
2. **Bộ lọc Ngày ghi nhận bồi thường (`AccountingFrom`, `AccountingTo`):**
   - Bắt buộc nhập cả Từ ngày và Đến ngày (`DD/MM/YYYY`), độc lập hoàn toàn với Kỳ hiệu lực (`DateFrom`, `DateTo`).
   - Ràng buộc chặn quá 1 năm (`MaxYearEnd`) được kiểm soát chặt chẽ ở cả client validation và server validation.
3. **Phân quyền Fire và TbhPrincipal:**
   - Vai trò `ADMIN` tự động có quyền trên mọi nhóm nghiệp vụ (`TbhPrincipal.HasPermission` trả về `IsInRole("ADMIN") == true`).
   - Vai trò `EDITOR` chỉ truy cập được khi đã được cấp quyền `fire` trong `TBH_USER_PERMISSION`. Nếu thiếu quyền, màn hình ẩn form tham số và POST export trả về HTTP 403 Forbidden.

### 4.13 🔴 Bài học Final Gate FT-007 (Claude Code, 2026-09-20)

1. **Đọc cursor Oracle: KHÔNG dùng `reader.GetValue()`/`GetDecimal()` cho cột NUMBER.** Cột NUMBER không giới hạn độ chính xác (kết
   quả phép chia, phân bổ) có thể tới 38 chữ số; `System.Decimal` chỉ ~28 → `InvalidCastException` và cả job xuất báo cáo rơi
   `ERROR`. Dùng `OracleRepositorySupport.Decimal(record, ordinal)` (đã proven, `GetOracleDecimal` + `Round(…, 6)`) hoặc kiểm
   `GetProviderSpecificFieldType == typeof(OracleDecimal)` một lần mỗi cột như Premium Borderaux. FT-007
   (`OracleFirePaidBrRepository.cs:606`) đã lặp lại đúng lỗi này. Test đơn vị dùng `DataTable` KHÔNG bắt được (không phải
   `OracleDataReader`); chỉ dữ liệu thật mới lộ. **Đã sửa 2026-09-20** bằng `ReadNumber`/`ReadText` (chỉ đi đường `OracleDecimal`
   khi `GetProviderSpecificFieldType == typeof(OracleDecimal)`, cột khác giữ `GetValue`) + test dùng `OracleDecimal` thật (giá trị
   dài tạo bằng phép chia, không cần DB). **Kiểu cột không suy đoán:** kiểm bằng `DBMS_SQL.DESCRIBE_COLUMNS` — cột ngày của
   `PRC_FIRE_PAID_BR` là VARCHAR2 (chuỗi ISO), `Claim URN` là NUMBER dù hiển thị như văn bản; cột "văn bản" cũng có thể là NUMBER.
2. **Cách phát hiện bằng dữ liệu thật:** quét cursor bằng `DBMS_SQL`, đếm số chữ số có nghĩa của mọi giá trị NUMBER, đếm giá trị > 28
   — `db/tests/PAID_BR_NUMBER_PRECISION_SCAN.sql`. Nên chạy cho MỌI thủ tục báo cáo trả cursor trước khi nối vào C#, với ít nhất
   3 kỳ dữ liệu khác nhau (kỳ hiện tại, kỳ trước, một năm cũ nhiều dữ liệu). PL/SQL cũng có thể `ROUND` cột số tại nguồn.
3. **Một mẫu E2E nhỏ không chứng minh gì về độ bền.** E2E của FT-007 ra file 4 dòng (cột 40–43 rỗng ở cả 4 dòng; tổng cột 27 = 1.671.099.091.066)
   trong khi bộ tham số chuẩn cho 67 dòng; năm 2026 với logic cũ hoàn toàn không có giá trị dài, còn với logic mới có 26 giá trị dài. Yêu cầu tối
   thiểu của E2E xuất file: (a) nói rõ PACKAGE nào được gọi (thật hay DEV), (b) chạy ≥ 3 kỳ dữ liệu, gồm 1 năm cũ, (c) đối chiếu SỐ
   DÒNG và tổng vài cột với chính cursor gọi trực tiếp trên Oracle, không chỉ cấu trúc/định dạng.
4. **Package thật có thể lệch nguồn repo.** Ngày 2026-09-20 `PCK_TBH_REPORT` thật lệch **255 dòng nội dung** so với
   `db/packages/PCK_TBH_REPORT.pkb` (nguồn trùng khít `DEV_PCK_TBH_REPORT`): bản thật thiếu các sửa F-01, F-02/F-03, F-05, F-09, F-10 của
   `PRC_FIRE_PAID_BR` (CS%, CAT/Category…) dù tài liệu ghi "đã deploy 2026-09-17" (thật biên dịch 11:18, shadow 17:58 cùng ngày).
   Trước khi coi báo cáo là "đã deploy", dump `user_source` của package thật (mục 4.11-11) và `diff` với nguồn. Nguồn PL/SQL đã sửa
   nhưng **chưa commit** từ 2026-09-16 cũng là rủi ro riêng: repo không tái lập được thủ tục mà C# gọi (đã commit riêng `e3948c7`
   ngày 2026-09-20; deploy lên package thật chờ lệnh). Mọi lần deploy lên package thật phải kèm **bản sao lưu DDL** lấy bằng
   `DBMS_METADATA.GET_DDL` (giữ dòng trống, kết thúc `/`, `set long 20000000`), đối chiếu `user_source` trước khi cất.
   F-10 (bản thật thiếu): `*_sys_sum_insd` đã là VND, bản cũ nhân thêm tỷ giá → SI sai ~25.000 lần với đơn USD.
5. **Tác giả kiêm QA (Failover Rule 5) không thay được review độc lập.** Khi người viết cũng là người kiểm thử, Final Gate phải tự
   kiểm dữ liệu (không chỉ đọc báo cáo) — FT-007 chỉ lộ lỗi khi Final Gate quét cursor bằng dữ liệu thật.
6. **File kết quả báo cáo lưu trên đĩa (`App_Data/ReportJobs/*`):** cần chính sách xóa file hoàn tất theo tuổi (FT-007 hiện chỉ dọn khi
   lỗi/hủy/hết giờ), dọn file của lượt QA trước khi commit (file `5f800930….xlsx` chứa dữ liệu bồi thường thật còn nằm trong
   worktree), và `.gitignore` cho thư mục này — `.gitignore` của repo chưa chặn.

### 4.14 🔴 Bài học Hiệu năng Paid Borderaux (Claude Code, 2026-09-20)

Yêu cầu nghiệp vụ: bồi thường đơn tài sản có thể kéo dài nhiều năm, kể cả sau khi đơn hết hiệu lực → **Kỳ ghi nhận bồi thường KHÔNG giới hạn độ rộng**
(đã bỏ giới hạn 366 ngày ở `BaoCaoController`, `paid-borderaux.js`, View, test); **Kỳ hiệu lực vẫn tối đa 1 năm** (Orchestrator duyệt giữ).

1. **Nguyên tắc thiết kế thủ tục báo cáo lớn:** xác định TRƯỚC tập bản ghi thỏa MỌI bộ lọc chọn lọc (ở đây Fire + hiệu lực đơn + trạng thái + BU + nghiệp vụ
   + có giao dịch trong kỳ ghi nhận) bằng 1 CTE `MATERIALIZE` (`claim_scope`), rồi chỉ TRA CỨU các bảng nặng (`kd_ri_clm_cess` 1,97 triệu dòng ⋈
   `kd_ri_cession_tty` 8,5 triệu dòng, `kd_lob_fire`) theo tập đó qua chỉ mục. Bản cũ để kỳ ghi nhận (không sargable: `acc_prd_yr*100+acc_prd_mnth`) dẫn đường
   và gom `w_ri_cess` **toàn bảng** (≈85% chi phí kế hoạch) — kỳ ghi nhận càng rộng, càng nhiều hồ sơ của MỌI nghiệp vụ lọt vào giữa chừng, bộ lọc Fire chỉ chạy cuối.
   Hướng "kỳ ghi nhận → hồ sơ → đơn" chỉ tốt khi kỳ ghi nhận hẹp; với kỳ rộng nên "hồ sơ Fire trong kỳ hiệu lực → kiểm tra có giao dịch trong kỳ ghi nhận (EXISTS)".
2. **Số đo (DB dùng chung; kết quả GIỐNG HẼT: số dòng + tổng cột 27 + dấu vân tay 43 cột):** hiệu lực 2017/ghi nhận 2017 (ca giao diện) 50s → 10,4s;
   hiệu lực 2022/ghi nhận 1990–2026 129s → 7,9s; hiệu lực 2010/ghi nhận 1990–2026 65,7s → 8,6s; hiệu lực 2017/ghi nhận 2000–2026 59s → 15,3s; hiệu lực 2026/ghi nhận 2026 34s → 7,9s.
   Điểm yếu còn lại: hiệu lực rất rộng (27 năm) + ghi nhận hẹp 37,7s → 22,7s (không xảy ra khi giữ hiệu lực ≤ 1 năm).
   Sau deploy shadow, E2E qua web (IIS Express + ODP.NET thật): 3 ca Done trong 6,9s–11,8s, số dòng và tổng cột 27 khớp chính xác, cột 40–43 có giá trị ở mọi dòng.
3. **Thống kê bảng hồ sơ bồi thường ở môi trường test là từ 2022 (lỗi thời)** → kế hoạch đổi theo tham số (một biến thể V3 chưa lọc Fire trước mất **7 phút 6 giây** ở đúng ca
   hiệu lực 2017/ghi nhận 2000–2026 trong khi biến thể khác của cùng ý tưởng chỉ 15–53s). Luôn đo bằng chính thủ tục/bind, nhiều tổ hợp tham số, và so KẾT QUẢ (không chỉ thời gian).
   Không thể `GATHER_STATS` (Rule 7 — tài sản Core). Hệ thống thật có thể có thống kê mới → V0 có thể không chậm như ở test: đã đưa bộ truy vấn V0/V4 độc lập
   để Orchestrator đo trên hệ thống thật (`db/perf/`, kèm README).
4. **"Chậm trên giao diện" ≠ "chậm ở package đang thử".** Giao diện (server test, gói r29) gọi `KOUKIA.PCK_TBH_REPORT` **thật = logic cũ** (còn `coins_info`, 1.203 dòng, DDL 17/09), không phải bản repo/shadow.
   Trước khi kết luận hiệu năng, xác định PACKAGE nào được gọi (`PlSqlReportPackage` trong Web.config **của server**, không phải của repo). Job `TIMED_OUT` sau 10 phút = `JobDeadlineMinutes`.
   Để test trên shadow: sửa MỘT dòng `PlSqlReportPackage` → `KOUKIA.DEV_PCK_TBH_REPORT` trong Web.config trên server test (KHÔNG commit vào repo, KHÔNG đóng gói).
5. **Công cụ đối chiếu:** `db/tests/PAID_BR_EQUALITY.sql <package> <BU> <nghiệp vụ> <ca>` — dấu vân tay toàn bộ 43 cột (số dòng + tổng `DBMS_UTILITY.GET_HASH_VALUE` của dòng nối cột); chạy trên bản cũ, deploy bản mới, chạy lại, phải giống hệt
   (11 ca đã khớp). `ORA_HASH` chỉ dùng được trong SQL, không gọi được trong biểu thức PL/SQL 11g. Cần SQLcl CLI (MCP không hiện `DBMS_OUTPUT`).
6. **Bẫy khi tự động hóa đo đạc:** (a) hai bộ đo chạy song song (một `nohup` bị bỏ sót + một chạy lại) làm hỏng số đo — kiểm tra tiến trình trùng trước khi tin thời gian; (b) `curl`/`Invoke-WebRequest` tới `localhost` đi
   qua proxy công ty (BlueCoat, trả 301) — dùng `--noproxy '*'` / `-Proxy $null`; (c) `connectionStrings.local.config` chỉ còn ở worktree cũ `TBH_DMT-claude`: chép tạm sang `src/TBH_DMT.Web` để chạy E2E cục bộ rồi XÓA
   (chứa credential, `.gitignore` không chặn); dọn cả `App_Data/ReportJobs/PaidBorderaux/*.xlsx` (dữ liệu bồi thường thật) và file `.xlsx` trong `%TEMP%`.

### 4.15 🔴 Đồng bộ time basis giữa Oracle `DATE` và .NET (Codex QA, 2026-09-20)

1. `TBH_JOB.CREATED_DT`, `STARTED_DT`, `DEADLINE_DT`, `FINISHED_DT` được PL/SQL ghi bằng Oracle `SYSDATE`. Trên TG22_KRDB, `SYSDATE` và session chạy theo `Asia/Bangkok` (`UTC+07:00`). Oracle `DATE` không chứa timezone; ODP.NET đọc thành `DateTime` thường có `Kind=Unspecified`.
2. **Không so trực tiếp timestamp Oracle `DATE` với `DateTime.UtcNow`.** Phép trừ sẽ coi hai giá trị cùng hệ quy chiếu dù thực tế lệch 7 giờ; timeout 2 phút có thể bị chậm khoảng 7 giờ. Unit test tạo cả hai vế bằng `UtcNow` sẽ xanh giả và không bảo vệ tích hợp thật.
3. Ưu tiên để Oracle quyết định hết hạn bằng `SYSDATE` ngay trong `PRC_JOB_GET_STATUS/GET_LATEST`, hoặc trả `SYSDATE AS db_now` cùng cursor rồi so các Oracle `DATE` trên cùng time basis. Nếu buộc xử lý ở Web, phải chuẩn hóa rõ `DateTimeKind`/timezone được cấu hình; không dựa ngầm vào timezone máy chủ.
4. Regression bắt buộc có `DateTimeKind.Unspecified` mô phỏng giờ Oracle UTC+7 và một test tích hợp ODP.NET thật. Ca `PENDING`, `STARTED_DT=NULL`, tuổi 3 phút theo DB phải chuyển `TIMED_OUT` ngay lần poll kế tiếp.
5. **Giải pháp chuẩn hóa đã áp dụng thành công (Gemini Ultra 2026-09-20 cho FT007-QA-JOB-02):**
   - **Tầng DB (Oracle-driven):** Thực thi câu lệnh SQL hòa giải trực tiếp bằng `created_dt <= SYSDATE - (:p_timeout_minutes / 1440.0)` trên `koukia.tbh_job` trước khi đọc cursor. CSDL Oracle tự quyết định timeout theo `SYSDATE`, triệt tiêu 100% rủi ro chênh lệch múi giờ hay clock drift giữa Web Server và CSDL.
   - **Tầng C# (Domain & Fallback):** Thêm thuộc tính `DatabaseNow` vào `FirePaidBrJobStatus` và helper `GetDatabaseTime()` lấy `SELECT SYSDATE FROM DUAL`. Mọi phép so sánh thời gian và gán `FinishedDt` đều dùng giờ CSDL (`DateTimeKind.Unspecified`), không còn bất kỳ tham chiếu nào tới `DateTime.UtcNow` cho thời gian job.
   - **Kiểm thử tích hợp:** Xác nhận 222/222 MSTest passed, bao gồm test tích hợp ODP.NET thật trên `TG22_KRDB` chứng minh job PENDING quá 2 phút tự động chuyển `TIMED_OUT` trên CSDL thật.

### 4.16 🔴 Bài học Tối ưu Batch & Quy trình nghiệm thu hiệu năng (Claude Code, 2026-09-20)

1. **Nghiệm thu "tối ưu hiệu năng" = A/B với CHÍNH bản trước tối ưu, không phải với PROD.** Số đo của Gemini so bản mới với package thật, trong khi bản mới còn mang thay đổi khác (FG-01: +21,7% dòng) —
   không tách được đóng góp riêng. Cách đúng: deploy bản trước tối ưu (HEAD) thành shadow tạm `DEV_PCK_TBH_TOOL_BASE`, chạy XEN KẼ (đảo thứ tự từng vòng) ≥ 2–3 vòng ở ≥ 2 quy mô (1 quý và cả năm), so **số dòng + hash toàn bộ cột** (không chỉ thời gian),
   rồi DROP shadow tạm. Bản Gemini nhanh hơn ở Q1 nhưng chậm hơn ~13% ở cả năm (đảo thứ tự cũng vậy) ⇒ không chấp nhận.
2. **Đo nút thắt bằng SQL Monitor trước khi sửa** (`DBMS_SQLTUNE.REPORT_SQL_MONITOR`, 11g: cột `sid` chứ không phải `session_id`): cả năm 2017 = 169s thì ~90% nằm ở 2 khối gọi remote (db-link OP), không phải ở `MATERIALIZE`/`pop_member`
   mà bản Gemini đụng tới. Đoán nút thắt từ comment cũ là sai chỗ.
3. **Truy vấn qua db-link — kinh nghiệm thực nghiệm (Oracle 11g, OP):** (a) gộp các bảng remote trong 1 khối `MATERIALIZE` rồi HASH JOIN cục bộ = hiệu quả khi khối remote nhỏ (~9,5K dòng) — tránh `MERGE JOIN CARTESIAN` (172 triệu dòng);
   (b) khi khối remote lớn (~12M dòng) thì NESTED LOOPS từng dòng (3 lần gọi/dòng) chậm ở quy mô lớn nhưng vẫn THẮNG kéo toàn bộ về ở quy mô 1 quý — cần biết quy mô thực tế thủ tục được gọi (Batch chạy theo quý qua MULTI);
   (c) `DRIVING_SITE` chạy 2s khi khối đứng riêng nhưng **bị CBO bỏ qua** trong câu lệnh lớn nhiều CTE/`UNION ALL`/`MATERIALIZE`, hoặc khi khối có thêm bảng cục bộ khác; `PUSH_PRED` và view remote lồng → hàng phút. Luôn thử tách thành truy vấn độc lập để kiểm hint có tác dụng, và kiểm plan thật (SQL Monitor), không tin hint "đã viết".
4. **Cạm bẫy khi tự sửa file lớn bằng script:** `str.index("<chuỗi>")` trả về lần xuất hiện ĐẦU TIÊN — `wksheet_ceded_pct AS (` xuất hiện ở thủ tục khác phía trên, nối `t[:i] + new + t[j:]` với `j < i` nhân đôi nội dung và làm hỏng file (biên dịch báo `PLS-00113`).
   Luôn neo tìm kiếm SAU vị trí của thủ tục đích (`index(x, start)`), `assert count == 1`, và kiểm `git diff --stat` (vài chục dòng, không phải hàng nghìn). Khôi phục bằng `git checkout -- <file>` rồi áp lại.
5. **`DBMS_OUTPUT` trong SQLcl có thể mất SAU KHI gọi engine/Batch** (cả Phần B chạy sau cũng mất): trả log qua biến CLOB (`var vout clob` … `PRINT vout`). Kiểm chứng script trong cùng session với thứ nó đo — thủ tục vừa in được lúc chạy riêng (`HELLO`) vẫn có thể mất đầu ra khi chạy chung.
6. **Giới hạn 10 phút của tác vụ nền (Bash `run_in_background`):** lệnh dài hơn bị dừng và im lặng (file kết quả rỗng, trông như "không có lỗi"). Chia nhỏ theo cửa sổ, chạy riêng từng phần, và coi file rỗng = CHƯA CÓ KẾT QUẢ. Hôm nay 1 lần gọi Batch cho 1 đơn mất ~50s (sáng ~12s) trên cả bản cũ lẫn mới — thời gian tuyệt đối trên DB dùng chung dao động ×4, chỉ so sánh trong cùng lượt xen kẽ.

### 4.17 🔴 Kiến thức mới: Bảng tạm toàn cục (GTT) để tách truy vấn qua db-link (Claude Code, 2026-09-21)

1. **GTT = Global Temporary Table (bảng tạm toàn cục):** cấu trúc bảng tạo MỘT LẦN và dùng chung, nhưng **dữ liệu bên trong riêng từng session** (session khác không thấy), tự trống khi session kết thúc. Khác materialized view (bản sao lưu lâu dài của dữ liệu OP, làm mới định kỳ, có độ trễ):
   GTT không sao chép dữ liệu nghiệp vụ, luôn "mới" vì hỏi OP ngay lúc chạy. Tiền lệ trong repo: `tbh_hq_batch_multi_gtt` (`db/ddl/DDL_TBH_HQ_BATCH_MULTI_GTT.sql`). Dùng `ON COMMIT PRESERVE ROWS` khi cursor trả ra được đọc SAU khi session có thể COMMIT (AUTOCOMMIT).
2. **Khi nào dùng:** một câu lệnh lớn có khối gọi remote mà hint tối ưu (đặc biệt `DRIVING_SITE`) bị Oracle bỏ qua khi nằm trong câu lệnh nhiều CTE — tách khối đó ra thành câu lệnh RIÊNG, ghi kết quả trung gian vào GTT, câu lệnh chính đọc GTT. Áp dụng ở `PRC_HQ_CALC_SUMMARY_BATCH`
   (4 bước, xem chú thích trên thủ tục): `tbh_hq_pop_gtt` (tập vị trí đơn) và `tbh_hq_locprem_gtt` (phí gốc theo địa điểm/worksheet từ OP). Kết quả: cả năm 2017 156s → 44s, giống hệt bản cũ (hash 22 cột).
3. **`DRIVING_SITE` — điều kiện hiệu nghiệm (đo thật trên OP):** chạy 2–4s khi là **SELECT/cursor đứng riêng** chỉ nối bảng cục bộ (GTT) với các bảng remote; **bị bỏ qua** khi là `INSERT … SELECT` (35s), khi nhét vào CTE/`UNION ALL`/`MATERIALIZE` của câu lệnh lớn (38–94s), hoặc khi khối nối thêm bảng cục bộ khác (73s).
   Vì vậy dùng cursor + `BULK COLLECT … LIMIT` + `FORALL INSERT` để nạp GTT — đừng "đơn giản hóa" thành `INSERT … SELECT`.
4. **Ràng buộc vận hành của thiết kế GTT:** connection pool dùng lại session ⇒ đầu thủ tục PHẢI `DELETE` GTT; **không mở đồng thời 2 cursor chưa fetch xong trong cùng 1 session** (lần gọi sau xóa dữ liệu lần trước). Cách khắc phục nếu sau này cần đồng thời: thêm cột `run_id` (SYS_GUID) và lọc theo run_id.
5. **DDL đi kèm code:** package PL/SQL dùng GTT mới chỉ biên dịch được khi bảng đã tồn tại ⇒ trong hướng dẫn triển khai PL/SQL, chạy file DDL TRƯỚC file `.pks/.pkb`; rollback theo thứ tự ngược lại (gỡ package dùng GTT rồi mới DROP TABLE).
6. **Quy trình tự kiểm khi đổi cấu trúc thủ tục lớn:** (a) so số dòng + hash toàn cột với bản trước ở nhiều khoảng/nhóm nghiệp vụ (kể cả Cargo, Engineering); (b) thử mọi đường gọi (cả năm trực tiếp, `MULTI`, gọi 1 đơn `p_so_don`, luồng job qua web); (c) chạy parity Single↔Batch; (d) kiểm nguồn repo = shadow (`user_source`).

### 4.18 🔴 Bài học Triển khai PL/SQL lên package THẬT (Claude Code, 2026-09-21)

1. **Package thật có thể bị đổi bởi người khác bất cứ lúc nào** (đã xảy ra 2 lần: Antigravity ghi đè 2026-09; `PCK_TBH_REPORT` bị deploy từ CÂY LÀM VIỆC lúc 2026-09-20 23:18, kèm thủ tục mẫu OSC chưa commit/chưa review).
   Trước MỌI lần deploy thật: (a) `SELECT last_ddl_time FROM user_objects` so với lần kiểm gần nhất; (b) dump `user_source` và `diff` với nguồn repo (chuẩn hóa: bỏ ký tự ngoài ASCII và `?` vì spool CP1252 làm hỏng chữ có dấu); (c) nếu lệch → DỪNG, xác định phần lệch là của ai, KHÔNG deploy đè.
2. **Chỉ deploy từ nguồn ĐÃ COMMIT** (`git show HEAD:<file>`), không từ cây làm việc — cây làm việc chứa thay đổi dở dang của AI khác. Khi commit một file có lẫn thay đổi của người khác: dựng bản "chỉ phần của mình", `git add` + commit, rồi khôi phục bản cây làm việc đầy đủ.
3. **Đóng gói từ worktree sạch:** `git worktree add --detach <thư mục> HEAD`, chép `src/packages` (không được track), build/test ở đó, chép đúng các file đổi so với gói trước; dọn worktree sau khi xong. Cách này loại trừ thay đổi chưa commit khỏi gói (và tránh lệch xuống dòng `LF`/`CRLF` do checkout — so hash sau khi bỏ `\r` khi nghi ngờ).
4. **Thứ tự triển khai có phụ thuộc DDL:** GTT/bảng mới → spec → body; rollback theo thứ tự ngược lại. Sau deploy: `USER_OBJECTS` VALID, `USER_ERRORS` = 0, `user_source` = repo, rồi chạy kiểm chứng NGHIỆP VỤ trên package thật (số dòng + hash so với shadow) — không chỉ biên dịch được.
5. **Web và PL/SQL phải cùng thế hệ cursor:** sau khi deploy `PCK_TBH_TOOL` (22/28 cột), web r28 trở xuống không còn dùng được với DB đó — thông báo cho mọi môi trường còn trỏ tới cùng DB.


### 4.19 🔴 Bài học Tối ưu Premium Borderaux & dọn bảng trung gian (Claude Code, 2026-09-21)

1. **Đo cả "chi phí cố định", không chỉ ca lớn:** Premium chỉ 27 dòng vẫn 39s vì (a) CTE đọc TOÀN BẢNG lớn dù kết quả chỉ dùng cho tập nhỏ (`nbrenewal`: 2,2 triệu dòng để chỉ dùng cho các đơn của kỳ), (b) bước chẩn đoán đếm TOÀN CSDL sau khi ghi (11,6s cố định).
   Mẫu chung: **mọi CTE/truy vấn phải bị giới hạn theo tập đã lọc của báo cáo**, kể cả các bước "phụ" (kiểm tra chất lượng, log) — chúng thường bị bỏ sót vì chạy sau câu lệnh chính. Đo bằng ca RẤT NHỎ để lộ phần cố định.
2. **Bảng trung gian ghi dữ liệu thật phải có chính sách lưu trữ ngay từ đầu:** `tbh_fire_premium_br` giữ dữ liệu đơn thật (tên người được bảo hiểm) theo `batch_id` và không bao giờ bị xóa (178 lượt/464.694 dòng/408 MB sau ~7 tuần). Thiết kế mới: cột `CREATED_AT` + thủ tục `PRC_FIRE_PREMIUM_BR_PURGE(p_retention_days DEFAULT 8)` + job định kỳ (tiền lệ `JOB_TBH_PURGE_AUDIT_LOG`); từ chối ngưỡng < 1 ngày. **Khi thêm chính sách xóa, kiểm MỌI nơi đọc lại dữ liệu:** Premium đọc lại lượt xuất khi người dùng bấm TẢI FILE (không chỉ lúc xuất) nên phải có guard C# (`IsResultExpired`, 7 ngày hiển thị) và DB giữ thêm 1 ngày biên an toàn (8 ngày) — nếu không, file quá hạn ra Excel RỖNG mà không báo lỗi.
   File kết quả Paid (`App_Data`) đã có chính sách 7 ngày — mọi kho dữ liệu tạm khác cũng nên có.
3. **Bẫy công cụ SQLcl:** `set feedback off` làm lệnh `PRINT` biến CLOB in ra **rỗng** (không lỗi) — kết hợp với `DBMS_OUTPUT` mất sau khi gọi engine (xem 4.16) khiến script "chạy xong nhưng không ra gì". Với script trả log qua CLOB: giữ `feedback` mặc định.
4. **Đối chiếu kết quả cho thủ tục GHI bảng:** băm mọi cột trừ cột audit (`BATCH_ID`, `ROW_NO`, `CREATED_AT`, `CREATED_BY`) bằng tổng hash từng dòng (không phụ thuộc thứ tự) + so số dòng log theo loại (bỏ loại có nội dung đổi có chủ đích) — `db/tests/PREMIUM_BR_EQUALITY.sql` tự xóa lượt của nó sau khi băm.
5. **Khi package thật có thay đổi chưa commit của người khác** (hiện: `SAMPLE_PRC_R_TA_4ABC_FIRE_OSC` trong `PCK_TBH_REPORT` thật): (a) deploy shadow từ nguồn "mine-only" (HEAD + patch) để kiểm chứng độc lập; (b) khi triển khai thật, dùng bản cây làm việc (= DB + delta của mình) sau khi diff xác nhận delta chỉ là của mình; (c) commit chỉ phần của mình.
6. **UI "chậm/treo" chưa chắc là SQL chậm:** Paid trên server test kẹt PENDING (không có SQL nào chạy trên Oracle) vì tiến trình nền chết trước khi sang RUNNING — nghi do App Pool `TBH_DMT` thiếu quyền ghi `App_Data\ReportJobs\PaidBorderaux` (tài liệu cũ ghi nhầm tên pool `TBH_DMT`). Chẩn đoán: xem `TBH_JOB` (trạng thái/`STARTED_DT`) + `v$sql_monitor` trước khi tối ưu SQL; lấy tên App Pool từ `v$session.machine` (`IIS APPPOOL\<tên>`). Chi tiết: AI_HANDOFF. **r32 (commit 39b40ac) sửa mã:** `RUNNING` lên trước bước thư mục, lỗi thư mục ghi vào job kèm loại lỗi thật — nguyên nhân cụ thể trên server test chờ UAT xác nhận (đừng coi giả thuyết quyền `App_Data` là đã chứng minh).
> 📘 **Sổ tay tối ưu hiệu năng (bản gộp cho mọi AI): `docs/PLAYBOOK_TOI_UU_HIEU_NANG_PLSQL.md`** — quy trình 7 bước, mẫu đã chứng minh/đã loại, bẫy môi trường, checklist nghiệm thu, phản hồi cho Gemini. Công cụ A/B: `db/tests/BATCH_AB_FINGERPRINT.sql`.

---

### 4.20 🔴 THIẾT KẾ CHUẨN cho báo cáo xuất Excel (Claude Code, 2026-09-21 — Orchestrator chốt: "các báo cáo sau đều xử lý như vậy")

**Áp dụng cho OSC Borderaux, Loss Profile (Non Cat), Risk Profile và mọi báo cáo xuất Excel mới.** Mẫu tham chiếu: Paid Borderaux (`OracleFirePaidBrRepository`, `PCK_TBH_REPORT.PRC_FIRE_PAID_BR`).

1. **PL/SQL trả CURSOR** (không ghi bảng trung gian trừ khi thuật toán bắt buộc — Premium là ngoại lệ do PL/SQL nhiều bước, đã có job dọn + guard hết hạn 7 ngày). Tính toán/lọc ở Oracle; web không tính lại nghiệp vụ.
2. **Web đọc cursor từng dòng và GHI THẲNG ra file `.xlsx`** (NPOI `SXSSFWorkbook` streaming, không giữ toàn bộ dữ liệu trong RAM, không qua JSON/`byte[]`), tại `<ReportJobsRoot>\<TênBáoCáo>\<jobId>.xlsx` (ghi `.tmp` rồi `File.Move`). **`ReportJobsRoot` = thư mục gốc CHUNG cấu hình được (r33)** qua `ReportStorage.GetReportDirectory("<TênBáoCáo>")`; mặc định `App_Data\ReportJobs`; đặt theo từng máy chủ trong `appSettings.local.config` (cạnh `Web.config`, KHÔNG nằm trong gói). Tải file = gửi file có sẵn (tức thì, không chạy lại truy vấn). Giữ **7 ngày** rồi tự dọn (`PurgeExpiredFiles`, chỉ đụng tên `{32 hex}.xlsx/.tmp`); quá hạn → 410 "hết hạn lưu trữ".
3. **Tác vụ nền theo mẫu `TBH_JOB`:** `PRC_JOB_START` → `QueueBackgroundWorkItem` → `PENDING → RUNNING → DONE/ERROR/TIMED_OUT/CANCELLED` (deadline 10 phút, hủy được), giao diện polling `GetStatus`.
4. **THỨ TỰ BẮT BUỘC trong tiến trình nền (bài học r32):** cập nhật `RUNNING` NGAY ĐẦU TIÊN; MỌI bước dễ lỗi (tạo thư mục, dọn file, ghi thử) nằm TRONG `try`; lỗi thư mục → job `ERROR` kèm loại lỗi + thông điệp gốc (`PrepareStorageDirectory`, `DescribeStorageFailure`). KHÔNG để việc gì có thể ném ngoại lệ đứng trước `RUNNING` hoặc ngoài `try` — tiến trình nền chết âm thầm và người dùng chỉ thấy đếm giờ.
5. **Quyền GHI thư mục gốc báo cáo cho App Pool là điều kiện triển khai** (r33 khuyến nghị đặt gốc NGOÀI site, vd `D:\TBH_Data\ReportJobs` — cấp quyền 1 lần, cập nhật gói không đụng tới; xem DEPLOYMENT r33 mục 4c). Nếu chưa cấu hình thì là `App_Data`: của mọi báo cáo kiểu này: `icacls "<site>\App_Data" /grant "IIS APPPOOL\<tên pool>:(OI)(CI)M" /T` — tên pool/site KHÁC nhau giữa Test/Production (Test: pool `TBH_DMT`, site `C:\inetpub\tbh_dmt`). Đã đưa vào `docs/DEPLOY_WS2008R2.md` mục 3.3 (checklist Production) và DEPLOYMENT.md mỗi gói (mục 4b). Mỗi báo cáo mới thêm 1 thư mục con dưới `App_Data\ReportJobs\` — quyền cấp trên `App_Data` nên kế thừa, KHÔNG cần cấp lại.
6. **Vì sao thiết kế này (so với Premium: bảng trung gian + dựng Excel `byte[]` lúc tải):** không lưu thêm dữ liệu đơn thật trong DB (khỏi job dọn), tải file tức thì, RAM web thấp cho file hàng chục MB. Chưa đo tỷ lệ thời gian ghi bảng trung gian trong Premium. Premium giữ nguyên (đã nghiệm thu); có thể đổi phần TẢI của Premium sang ghi file (chỉ sửa web) nếu server bị thiếu RAM.
7. **Việc cần làm khi thêm báo cáo mới:** sao mẫu Paid (Repository + Controller actions + JS polling), đặt thư mục con riêng, thêm test kiểu `RunExportJob_StorageDirectoryCannotBeCreated_*`, ghi thư mục vào DEPLOYMENT.md của gói, kiểm chứng quyền trên server TRƯỚC UAT.

## 5. Thuật ngữ Nghiệp vụ ↔ Kỹ thuật

| Tiếng Việt | English | DB/PL/SQL | C# |
| --- | --- | --- | --- |
| Hiệu quả nghiệp vụ tái | Reinsurance Efficiency | PRC_HQ_* | HieuQuaDonController |
| Đơn phát sinh | Policy (issued) | PRC_HQ_SEARCH_POLICIES | SearchResult |
| Phí gốc sau đồng | Original Premium (net coinsurance) | Cột trong cursor | OriginalPremiumNet |
| Phí nhượng tái | Ceding Premium | Cột trong cursor | CedingPremium |
| Phí giữ lại | Retained Premium | Tính từ PL/SQL | RetainedPremium |
| Doanh thu thuần | Net Revenue | Tính từ PL/SQL | NetRevenue |
| Cấu trúc tái | RI Structure | PRC_HQ_GET_RI_STRUCTURE | RiStructure |
| Bồi thường | Claims | PRC_HQ_GET_CLAIMS | Claims |
| XOL layers | Excess of Loss layers | PRC_HQ_GET_XOL_LAYERS | XolLayers |
| Quota Share | QS | RI_TYPE = 'QS' | QuotaShare |
| Surplus | Surplus Treaty | RI_TYPE = 'SURPLUS' | Surplus |
| Fronting | Fronting | RI_TYPE = 'FRONTING' | Fronting |
| Facultative | Fac | RI_TYPE = 'FAC' | Facultative |
| CTTV | Công ty thành viên (subsidiary) | TBH_CTTV | Cttv |
| Nhật ký hệ thống | Audit Log | TBH_AUDIT_LOG | AuditLog |

---

## 6. Trạng thái hiện tại (2026-09-15)

| Feature | Trạng thái | Chi tiết |
| --- | --- | --- |
| **FT-001** Tìm kiếm đơn | ✅ Đã merge master | PL/SQL + ASP.NET + UI hoàn chỉnh |
| **FT-002** Tính hiệu quả đơn | ✅ Tạm nghiệm thu | 7 thủ tục PRC_HQ_*, còn 2 việc mở nhỏ |
| **FT-003** Quản trị hệ thống | ✅ Đã merge master | User/AuditLog/Đổi mật khẩu |
| **FT-004** Trang chủ + chuẩn hoá UI | ⏳ Chờ nghiệm thu | Claude Code đã review ĐẠT, chưa commit |
| **Scaffold ASP.NET MVC 5** | ✅ Đã có | `src/TBH_DMT.sln`, 81/81 unit tests pass |
| **PL/SQL packages** | ✅ Đã deploy | PCK_TBH_TOOL + PCK_TBH_REPORT trên TG22_KRDB |

### Feature tiếp theo có thể làm:

- ~~Hoàn thiện FT-001 (dropdown CTTV, CAT, Ngành nghề — chờ duyệt)~~ — ĐÃ XONG từ 2026-09-02
  (merge `0010c4f`), dòng này lỗi thời so với bảng trạng thái ở trên. Xác nhận lại 2026-09-16.
- Export báo cáo mới (PCK_TBH_REPORT)
- Dashboard KPI thực (thay mock data)

---

## 7. Quy trình Phát triển Feature

> 🏆 **Claude Code Pro = Chốt chặn cuối cùng.** Mọi code từ Gemini, mọi docs từ ChatGPT đều PHẢI qua Claude review + kiểm chứng thực tế trước khi commit/đóng gói.

```
Gemini (code) ──────┐
                     ▼
ChatGPT (BA/QA) ──→ Claude Code Pro (CHIEF ARCHITECT & FINAL GATE)
                     │  • Review mọi thay đổi
                     │  • Kiểm chứng trên Oracle thật + IIS Express
                     │  • Fix lỗi 🔴 Critical
                     │  • Quyết định kiến trúc cuối cùng
                     │  • Commit + đóng gói
                     ▼
               [Production-ready]
                     │
                     ▼
               Orchestrator (bạn) nghiệm thu → Deploy

```

```
1. Phân tích nghiệp vụ + viết Design Pack (ChatGPT Plus)  ← NÂNG VAI
   • User stories, acceptance criteria, business rules
   • Tạo test data Oracle (INSERT scripts)
   • SQL validation scripts cho đối chiếu dữ liệu thật
   ↓
2. Review Design Pack (Claude Code Pro)  ← 1 message, tiết kiệm quota
   ↓
3. Implement code + TỰ KIỂM TRA (Gemini Ultra — dev chính)
   • PL/SQL packages + C# Controllers + Repository + Views + Frontend
   • Gemini TỰ chạy: build C#, compile PL/SQL, unit test cơ bản
   • Bàn giao kèm "Bản tự kiểm" (checklist đạt/không đạt)
   ↓
4. Review + Fix theo severity (Claude Code Pro)
   • 🟢🟡 Gợi ý snippet → Gemini áp dụng
   • 🔴 Critical: Claude FIX LUÔN code hoàn chỉnh
   ↓
5. Gemini merge: áp dụng 🟢🟡 + merge code 🔴 đã fix
   ↓
6. Unit tests + Docs + UI review (ChatGPT Plus)  ← NÂNG VAI
   • Unit tests xUnit
   • So sánh screenshot prototype vs app thật
   • API docs + user guide
   • SQL validation scripts đối chiếu dữ liệu thật
   ↓
7. Kiểm chứng trên Oracle thật + IIS Express
   ↓
8. Người dùng nghiệm thu → commit

```

### 7a. Quy tắc Git & Commit

| Quy tắc | Chi tiết |
| --- | --- |
| **Ai commit** | **Claude Code Pro** thay mặt bạn — CHỈ khi bạn nói *"commit đi"* |
| **Gemini / ChatGPT** | KHÔNG đụng Git — chỉ output code dạng text |
| **Khi nào** | Sau khi cả 3 AI hoàn thành phần việc |
| **Commit message** | `feat(module): mô tả [gemini+claude+chatgpt]` — ghi tag AI đóng góp |
| **Push** | Chỉ khi bạn nói *"push đi"* — Claude KHÔNG tự push |

---

### 7a2. Đóng gói bản nâng cấp

|  | Chi tiết |
| --- | --- |
| **Ai đóng gói** | **Claude Code Pro** — AI duy nhất có thể build .NET + tạo ZIP |
| **Khi nào** | Sau commit, bạn nói *"đóng gói đi"* |
| **Output** | `outputs/TBH_DMT-web-upgrade-YYYYMMDD-rXX.zip` + `.sha256` |
| **Convention** | Bản cũ bị đánh dấu `.SUPERSEDED.txt` (đã có 23 bản: r1→r23) |
| **Deploy** | Bạn tự deploy thủ công lên IIS (WS2008R2) theo `docs/DEPLOY_WS2008R2.md` |

---

### 7b. Dự phòng khi hết Hạn mức (Failover)

Khi **Claude Code Pro** hoặc **ChatGPT Plus** hết hạn mức trong ngày:

| Hết quota | Thay thế bởi | Cách chuyển |
| --- | --- | --- |
| Claude hết | ChatGPT kiêm review + architect | Paste thêm prompt Claude (§10 🟡) cho ChatGPT |
| ChatGPT hết | Claude kiêm BA + test + docs | Paste thêm prompt ChatGPT (§10 🔵) cho Claude |
| Cả hai hết | Gemini Ultra gánh tất cả | Ưu tiên: code > review > docs |

**Lưu ý:** Khi AI gốc có lại quota → chuyển trả việc về đúng AI gốc.

---

## 8. Quyết định Kiến trúc Quan trọng

| Ngày | Quyết định | Lý do |
| --- | --- | --- |
| 2026-08-28 | Tool nhỏ, không chia package theo enterprise | Quy mô vài chục user |
| 2026-08-29 | Bỏ ORDS, dùng ODP.NET trực tiếp | WS2008R2 không cài được Java 11+ |
| 2026-09-03 | DBMS_CRYPTO dùng SHA-1 (không SHA-256) | Instance Oracle chỉ hỗ trợ MD4/MD5/SHA-1 |
| 2026-09-03 | Gradient 90deg thay 135deg toàn hệ thống | Đồng bộ visual, không bị méo theo tỷ lệ khung |
| 2026-09-05 | Login nền sáng, không gradient xanh đậm | Chuẩn hoá theo phong cách Trang chủ |
| 2026-09-08 | Enterprise Light / Data First UI | Header trắng, canvas #f4f7fa, tối giản |
| 2026-09-09 | Figma Make refresh | Cập nhật UI từ Figma, thay thế quyết định 09-08 khi mâu thuẫn |
| 2026-09-10 | Chuẩn xử lý export dữ liệu lớn | Re-pack ZIP server-side, đo tách biệt từng bước |
| 2026-09-14 | Tách PCK_TBH_REPORT từ PCK_TBH_TOOL | 2 package: tool vs báo cáo gốc |

---

## 9. Bài học Rút ra (Lessons Learned) — BẮT BUỘC đọc

| # | Bài học | Nguyên nhân |
| --- | --- | --- |
| 1 | **Không suy đoán cấu trúc hiển thị** từ ảnh chụp UI hoặc tên cột DB | Đã xảy ra nhiều lần FT-002: đơn giản hoá 1 màn hình phức tạp, gộp sai cấp bậc |
| 2 | **Phải grep hàm **`hqd_render*`**/**`hqd_build*` trong prototype TRƯỚC KHI viết code | Prototype không phải bản nháp — từng dòng đã qua nhiều vòng đối chiếu dữ liệu Core thật |
| 3 | **Comment trích số liệu cũ đã sai** còn nguy hiểm hơn comment mơ hồ | Đã xảy ra nhiều lần |
| 4 | **Mock data có thể sai** — luôn đối chiếu với PL/SQL trực tiếp trên dữ liệu thật | Mock bị lỗi thời hoặc nhập tay sai |
| 5 | **KPI Dashboard/Drawer** có 2 kiểu khác nhau, không dùng nhầm | Lỗi thật 2026-09-03: áp nhầm kiểu 6.1 vào Drawer |
| 6 | **Export xlsx** đã là ZIP — không bọc thêm .rar/.zip | File phải mở trực tiếp bằng Excel |

---

## 10. Hướng dẫn cho từng AI

### 🟢 Gemini Ultra (Main Developer)

```
Bạn là Main Developer của dự án TBH_DMT — ứng dụng tái bảo hiểm Bảo Việt.

PHẢI ĐỌC TRƯỚC KHI CODE:
- File này (SHARED-CONTEXT) — toàn bộ bối cảnh
- Mục 4 (Chuẩn code) — bắt buộc tuân thủ
- Mục 5 (Thuật ngữ) — dùng đúng naming
- Mục 9 (Bài học) — tránh lặp lại lỗi cũ

Tech stack: Oracle 11g + ASP.NET MVC 5 (.NET 4.8) + ODP.NET + HTML/JS/CSS.
Máy chủ: WS2008R2/IIS 7.5 — KHÔNG dùng .NET Core, KHÔNG dùng ORDS.

BẮT BUỘC — Tự kiểm tra TRƯỚC KHI bàn giao:
Mỗi lần code xong, kèm theo "Bản tự kiểm":
  ✅/❌ Build C# (0 errors, 0 warnings?)
  ✅/❌ PL/SQL compile (package valid?)
  ✅/❌ Unit test cơ bản (happy path pass?)
  ✅/❌ Naming theo CODING_CONVENTIONS.md?
  ✅/❌ "PL/SQL fetch only" — frontend không tự tính toán?
  ✅/❌ Self-review (đã đọc lại code 1 lượt?)
  📝 Phần chưa test được: [liệt kê cụ thể]
⚠️ KHÔNG bàn giao nếu Build hoặc PL/SQL compile FAIL.

```

### 🟡 Claude Code Pro — CHIEF ARCHITECT & FINAL GATE (Kiến trúc sư trưởng)

```
Bạn là KIẾN TRÚC SƯ TRƯỞNG & CHỐT CHẶN CUỐI CÙNG của dự án TBH_DMT.
Bạn chiếm ~25-30% khối lượng. MỌI thay đổi PHẢI đi qua bạn trước khi vào production.
Bạn là AI duy nhất: truy cập filesystem, build .NET, compile PL/SQL, chạy IIS Express,
gọi SQLcl kiểm chứng Oracle thật, commit/push Git, đóng gói deploy.

PHẢI ĐỌC TRƯỚC KHI LÀM VIỆC:
- File này (SHARED-CONTEXT) — toàn bộ bối cảnh
- Mục 8 (Quyết định kiến trúc) — không đề xuất ngược lại
- Mục 9 (Bài học) — kiểm tra code mới có vi phạm không

REVIEW + FIX THEO SEVERITY:
- 🟢 Suggestion: Gợi ý ngắn → Gemini tự fix
- 🟡 Warning: Gợi ý + code snippet mẫu → Gemini áp dụng
- 🔴 Critical: FIX LUÔN code hoàn chỉnh, sẵn sàng commit
  (security, logic tái BH sai, data integrity — KHÔNG chuyển cho Gemini fix
   vì sai ở đây = thiệt hại tài chính)

Verdict: ✅ Approve / ⚠️ Approve with changes (kèm fix 🟡) / ❌ Reject + fix 🔴

```

### 🔵 ChatGPT Plus (Business Analyst + QA + Documentation)

```
Bạn là Business Analyst + QA + Documentation cho dự án TBH_DMT — ứng dụng
tái bảo hiểm Bảo Việt. Bạn tham gia CẢ ĐẦU LẪN CUỐI quy trình.

PHẢI ĐỌC TRƯỚC KHI LÀM VIỆC:
- File này (SHARED-CONTEXT) — toàn bộ bối cảnh
- Mục 5 (Thuật ngữ) — dùng đúng tên
- Mục 6 (Trạng thái) — biết đang ở đâu
- Mục 9 (Bài học) — tránh lặp lại lỗi cũ

ĐẦU QUY TRÌNH — Business Analysis:
- Phân tích quy trình nghiệp vụ tái bảo hiểm
- Viết Design Pack: user stories, acceptance criteria, business rules
- Tạo test data Oracle (INSERT scripts) với dữ liệu realistic
- Viết SQL đối chiếu/validation cho nguyên tắc "đối chiếu dữ liệu thật"

CUỐI QUY TRÌNH — QA + Docs:
- Unit tests: xUnit (.NET), bao gồm happy/error/edge cases
- Upload screenshot → so sánh prototype vs app thật
- Technical docs, API docs, user guide
- Duy trì thuật ngữ song ngữ VN-EN

Ngôn ngữ: Tiếng Việt. Audience: team dev nội bộ + DBA Bảo Việt.

```

## 9b. Definition of Done (DoD)

Feature chỉ DONE khi đủ: ✅ Code hoàn chỉnh + ✅ Bản tự kiểm Gemini + ✅ Claude review ĐẠT + ✅ Claude kiểm chứng Oracle thật + ✅ Unit tests pass + ✅ Docs cập nhật + ✅ AI_HANDOFF.md cập nhật + ✅ Orchestrator nghiệm thu + ✅ Commit + đóng gói.

---

## 9c. Hotfix Khẩn cấp

Khi production có bug critical — **quy trình rút gọn:**

```
Orchestrator → Claude fix trực tiếp (bỏ qua Gemini/ChatGPT)
→ Claude test trên Oracle thật → Orchestrator kiểm tra nhanh
→ Claude commit + đóng gói → Deploy
→ ChatGPT bổ sung test + docs SAU (không block deploy)

```

---

## 9d. Rollback khi Deploy lỗi

```
1. Orchestrator phát hiện lỗi → quyết định rollback (KHÔNG cần hỏi AI)
2. Deploy lại bản trước: outputs/TBH_DMT-web-upgrade-*-rXX.zip (bản chưa SUPERSEDED)
3. Báo Claude: "Đã rollback về rXX. Bug: [mô tả]" → Claude fix theo Hotfix hoặc Feature thường

```

Giữ ít nhất **3 bản build gần nhất**. Mỗi DDL mới phải có **file rollback đi kèm**.

---

## 9e. Branching Strategy

| Branch | Mục đích | Ai dùng |
| --- | --- | --- |
| `master` | Code ổn định, đã nghiệm thu | Claude merge khi Orchestrator duyệt |
| `design/FT-XXX-*` | Feature mới | Claude tạo + làm việc |
| `hotfix/XXX` | Fix khẩn cấp | Claude tạo, fix, merge nhanh |

---

## 9f. Backup Database trước DDL

Mọi DDL mới PHẢI có file rollback: `db/ddl/DDL_TBH_XXX_ROLLBACK.sql`. Claude backup schema trước khi chạy, chỉ khi Orchestrator nói *"chạy DDL đi"*.

---

## 9g. Security Checklist (OWASP cho .NET 4.8)

| # | Hạng mục | Kiểm tra |
| --- | --- | --- |
| 1 | SQL Injection | ODP.NET bind parameters, KHÔNG string concat |
| 2 | XSS | Razor auto-encode, KHÔNG `@Html.Raw()` |
| 3 | CSRF | `AntiForgeryToken` mọi form POST |
| 4 | Auth | Cookie mã hoá, timeout, logout xoá session |
| 5 | Authorization | `[Authorize]` + check role Admin/Editor/Viewer |
| 6 | Password | SHA-1 + salt qua DBMS_CRYPTO |
| 7 | Error | Custom error pages, không hiện stack trace |
| 8 | Config | Connection string mã hoá, không hardcode credentials |

---

## 9h. Escalation — Khi AI không giải quyết được

AI thử 2-3 lần → chuyển AI khác (failover) → vẫn không được → báo Orchestrator kèm: vấn đề, đã thử gì, gợi ý. Orchestrator quyết định: tự fix / hỏi DBA / tạm hoãn / giảm scope.

---

## 9i. Performance & Monitoring

| Tiêu chí | Target |
| --- | --- |
| Trang load | < 3s (intranet) |
| PL/SQL query phức tạp | < 5s |
| Export Excel | < 30s |

Sau deploy: Orchestrator theo dõi IIS log 2-3 ngày + thu thập feedback user. Ổn → đánh dấu STABLE.

---

## 10b. Lưu nhớ Context giữa các Phiên

> Cả 3 AI đều KHÔNG nhớ tự động giữa các phiên — phải có cơ chế lưu nhớ.

### Mỗi AI lưu nhớ bằng cách nào:

| AI | Cách lưu nhớ |
| --- | --- |
| **Claude Code Pro** | Tự đọc `CLAUDE.md` + `docs/PROJECT_CONTEXT.md` + `docs/AI_HANDOFF.md` khi mở project. Có memory hệ thống tự nhớ giữa phiên |
| **Gemini Ultra** | Dùng **1 conversation dài** cho mỗi module (context 1M+). Hoặc upload Shared Context file vào đầu conversation mới |
| **ChatGPT Plus** | Set **Custom Instructions** cố định (paste prompt §10 🔵). Hoặc tạo GPT tùy chỉnh riêng cho dự án |

### Cuối mỗi phiên — Orchestrator hoặc Claude cập nhật:

| File | Nội dung |
| --- | --- |
| `docs/AI_HANDOFF.md` | Trạng thái bàn giao: đã xong gì, còn dở gì, vấn đề mở |
| `docs/PROJECT_CONTEXT.md` | Trạng thái tổng thể (sau milestone) |
| Mục §6 file này | Cập nhật trạng thái feature nếu thay đổi |

### Khi mở phiên mới với Gemini/ChatGPT:

```
Phiên trước đã hoàn thành: [tóm tắt 2-3 dòng]
Vấn đề còn mở: [liệt kê]
Hôm nay cần làm: [task cụ thể]
Files liên quan: [danh sách]

```

---

## 11. File Reference nhanh

| Cần gì | Đọc file |
| --- | --- |
| Bối cảnh dự án đầy đủ | `CLAUDE.md` |
| Trạng thái bàn giao mới nhất | `docs/AI_HANDOFF.md` |
| Chuẩn UI/Design tokens | `DESIGN_SYSTEM.md` |
| Quy trình cộng tác AI | `docs/AI_COLLABORATION.md` |
| Kiến trúc (ADR) | `docs/architecture/ADR-001-MVC5-ODPNET.md` |
| Design Pack feature X | `docs/features/FT-00X-*/` |
| PL/SQL nguồn chuẩn | `db/packages/PCK_TBH_TOOL.pks/.pkb` |
| Solution .NET | `src/TBH_DMT.sln` |
| Deploy guide | `docs/DEPLOY_WS2008R2.md` |
| Prototype UI | `frontend/index.html` |


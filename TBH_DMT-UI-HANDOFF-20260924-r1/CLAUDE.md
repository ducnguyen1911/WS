# CLAUDE.md — TBH_DMT (Quản lý dữ liệu Tái bảo hiểm)

> Bắt đầu phiên làm việc mới hoặc quay lại dự án sau một thời gian? Đọc
> [`docs/PROJECT_CONTEXT.md`](docs/PROJECT_CONTEXT.md) trước — đó là điểm tiếp tục dự án, tổng hợp trạng thái
> và trỏ tới đúng nguồn chi tiết (không thay thế file này, chỉ định hướng nhanh hơn).

> Repo sản phẩm cho ứng dụng web "Hiệu quả nghiệp vụ tái" + các màn hình Quản trị/Tài khoản. Đây là kho code
> chính thức (frontend + PL/SQL) — khác với `D:\ClaudeSQL` (kho phân tích/khảo sát nghiệp vụ, nơi các tài
> liệu đặc tả và memory hệ thống ban đầu được tạo ra). Khi cần bối cảnh nghiệp vụ sâu (quy ước tái bảo hiểm,
> lịch sử quyết định thiết kế, bug đã sửa...), tham khảo `D:\ClaudeSQL\CLAUDE.md` và memory hệ thống — không
> lặp lại toàn bộ ở đây.

## 0. Dự án này là gì

Ứng dụng nội bộ Bảo Việt: tính hiệu quả nghiệp vụ tái bảo hiểm theo đơn phát sinh, cộng thêm quản trị hệ
thống (user/audit log/đổi mật khẩu). Kiến trúc 3 lớp:

```
ASP.NET MVC 5 (.NET Framework 4.8, IIS 7.5) — kế thừa UI đã duyệt từ frontend/index.html
        │ ODP.NET Managed Driver — kết nối Oracle TRỰC TIẾP, KHÔNG qua ORDS
        ▼
db/packages/PCK_TBH_TOOL.pks/.pkb + PCK_TBH_REPORT.pks/.pkb  (Oracle TG22_KRDB, schema KOUKIA)
```

> **Quyết định kiến trúc 2026-08-29** (xem `DESIGN_SYSTEM.md` mục 12): ban đầu định dùng ORDS làm tầng API
> (vẫn còn mô tả trong `docs/KIENTRUC_HE_THONG_HIEU_QUA_TAI_TG22.md`), nhưng ORDS cần Java 11+ mà máy chủ hiện
> có (Windows Server 2008 R2 SP1) không hỗ trợ — không cài được. Đã chốt bỏ ORDS, dùng ASP.NET MVC 5 gọi thẳng
> Oracle qua ODP.NET, tổ chức qua Data Access Layer/Repository (`IReinsuranceRepository`...) để dễ đổi sau này
> nếu có máy chủ mới. `docs/KIENTRUC_HE_THONG_HIEU_QUA_TAI_TG22.md` mục 2.2/4/6 mô tả ORDS là **tư liệu lịch
> sử, đã bị thay thế** — không dùng làm căn cứ triển khai, tham khảo `DESIGN_SYSTEM.md` mục 11-12 cho quyết
> định hiện hành.

## 1. Cấu trúc repo

```
TBH_DMT/
├── frontend/index.html       ← Prototype HTML/JS thuần hiện tại (mock data) — nguồn tham chiếu UI/UX đã
│                                duyệt, sẽ được dựng lại thành View/CSS/JS trong project ASP.NET MVC 5
│                                (chưa scaffold — xem DESIGN_SYSTEM.md)
├── db/
│   ├── packages/              ← PCK_TBH_TOOL.pks/.pkb (tool) + PCK_TBH_REPORT.pks/.pkb (báo cáo gốc) —
│   │                             nguồn PL/SQL chính thức, xem mục 3
│   └── ddl/                   ← DDL các bảng mới (tiền tố TBH_)
├── docs/                      ← tài liệu kiến trúc/thiết kế cho riêng repo này
└── DESIGN_SYSTEM.md           ← chuẩn UI (màu/font/component) + quyết định hạ tầng hiện hành (ODP.NET, không
                                   ORDS) — đọc trước khi scaffold project ASP.NET MVC 5 hoặc build lại UI
```

**Nguồn chuẩn duy nhất của PL/SQL là `db/packages/`** — sau khi deploy lên DB thật, luôn đồng bộ ngược file ở
đây (đừng để DB và file trên đĩa lệch nhau).

## 2. Kết nối DB

Oracle `TG22_KRDB` (schema `KOUKIA`), qua SQLcl với connection đã đặt tên sẵn: `TG22_KRDB` (production báo
cáo) / `TG22_OP` (đối chiếu, tham chiếu qua db-link `@opbvgi.baoviet.com.vn`). Dữ liệu trong môi trường dev là
**dữ liệu test**, không phải production thật.

## 3. Chuẩn code PL/SQL (kế thừa từ `D:\ClaudeSQL\CLAUDE.md`, áp dụng nguyên vẹn ở đây)

- Đóng gói trong package — **2 package** kể từ quyết định kiến trúc 2026-09-14 (thay quyết định
  "chỉ 1 package" 2026-08-28, nay đã lỗi thời):
  - `PCK_TBH_TOOL` — thủ tục phục vụ RIÊNG app "Tính hiệu quả nghiệp vụ tái" đang phát triển (PRC_HQ_*,
    PRC_ADMIN_*, PRC_HOME_*...).
  - `PCK_TBH_REPORT` — các báo cáo nghiệp vụ **gốc** (Premium/Paid/OSC Borderaux, Loss Profile, Risk
    Profile...), tách riêng để tránh ảnh hưởng lẫn nhau khi phát triển/nâng cấp tool chính. Thủ tục đầu
    tiên chuyển sang đây: `PRC_FIRE_PREMIUM_BR` (2026-09-14, nguyên vẹn logic, không thủ tục/tầng C#/JS
    nào gọi trực tiếp nên chuyển an toàn — xem comment đầu `PCK_TBH_REPORT.pks`).
  - Không tách thêm ngoài 2 package này trừ khi quy mô thật sự đòi hỏi — vẫn giữ tinh thần "tool nhỏ
    không chia nhỏ theo kiểu enterprise" của quyết định 2026-08-28, chỉ nới từ 1 lên 2 theo ranh giới
    tool-vs-báo-cáo-gốc, không phải chia theo domain nghiệp vụ (Fire/Cargo/...).
- Thủ tục báo cáo trả `OUT SYS_REFCURSOR`, không `DBMS_OUTPUT`.
- Bảng/sequence/view **mới** mang tiền tố `TBH_` (đã seed: `TBH_USER`, `TBH_USER_PERMISSION`, `TBH_AUDIT_LOG`,
  `TBH_HIEUQUA_EXPORT_*`, `TBH_CTTV`...). Tên object đã tồn tại giữ nguyên tuyệt đối, không đổi/"chuẩn hoá".
- `p_` cho tham số vào, `l_` cho biến cục bộ, tên object CSDL viết HOA, luôn ghi rõ schema `koukia.table_name`.
- Thủ tục ghi tự quản lý transaction, nêu rõ điểm `COMMIT` trong comment header. `WHEN OTHERS` phải
  `RAISE` lại, không nuốt lỗi.
- Comment header bắt buộc mỗi thủ tục mới (mẫu xem các thủ tục `PRC_ADMIN_*`/`PRC_HQ_*` hiện có trong
  `PCK_TBH_TOOL.pkb`).

## 3a. Môi trường phát triển tách biệt UAT — Shadow Package (bắt buộc từ 2026-09-16)

> ⚠️ **Vấn đề đã xảy ra thật:** `TG22_KRDB` dùng CHUNG với môi trường UAT — `CREATE OR REPLACE PACKAGE`
> có hiệu lực NGAY LẬP TỨC cho mọi session, kể cả UAT đang chạy. Nếu deploy PL/SQL trước khi code C#
> tương ứng lên kịp, UAT gọi package mới bằng code cũ sẽ lỗi.

**Cơ chế:** phát triển/test PL/SQL qua bản sao **shadow package**, tên bắt đầu bằng `DEV_` (tiền tố,
không phải hậu tố — dễ nhận diện khi sắp xếp theo tên): `KOUKIA.DEV_PCK_TBH_TOOL`,
`KOUKIA.DEV_PCK_TBH_REPORT`. Cùng schema `KOUKIA`, không cần schema/instance riêng.

- **Nguồn chỉ có 1**: `db/packages/PCK_TBH_TOOL.pkb`/`.pks`, `PCK_TBH_REPORT.pkb`/`.pks` — tên package
  thật (`PCK_TBH_TOOL`, `PCK_TBH_REPORT`), KHÔNG duy trì file `.pkb` riêng cho bản DEV (tránh lệch giữa
  2 bản). Bản `DEV_` chỉ là **deploy tạm thời**: lấy đúng nội dung file nguồn, đổi tên package ở dòng
  `CREATE OR REPLACE PACKAGE [BODY] "KOUKIA"."..."` và dòng `END ...;` cuối file, deploy lên
  `DEV_PCK_TBH_TOOL`/`DEV_PCK_TBH_REPORT` bằng SQLcl. Không có tham chiếu tên package nào khác cần đổi
  bên trong (đã kiểm chứng: không có lời gọi tự tham chiếu tên schema.package trong cả 4 file nguồn).
- **C# gọi qua `Infrastructure/PlSqlPackages.cs`** — `PlSqlPackages.Tool`/`.Report`, đọc từ
  `Web.config` appSettings `PlSqlToolPackage`/`PlSqlReportPackage` (mặc định = tên thật). **MỌI
  Repository PHẢI dùng `PlSqlPackages.Tool`/`.Report`, KHÔNG được hard-code
  `"KOUKIA.PCK_TBH_TOOL"`/`"KOUKIA.PCK_TBH_REPORT"` trực tiếp** — kể cả thủ tục mới thêm sau này.
- **Khi dev/test cục bộ (IIS Express)**: sửa TẠM 2 giá trị appSettings trong `Web.config` thành
  `KOUKIA.DEV_PCK_TBH_TOOL`/`KOUKIA.DEV_PCK_TBH_REPORT`, deploy nội dung đang sửa dở lên 2 package
  `DEV_` (không đụng package thật, không ảnh hưởng UAT dù có sửa/test bao nhiêu lần, kể cả code lỗi
  giữa chừng). **BẮT BUỘC trả `Web.config` về giá trị mặc định (tên thật) trước khi commit** — không
  bao giờ commit với appSettings trỏ vào `DEV_`.
- **Khi đóng gói/nâng cấp** (đúng lúc user yêu cầu "đóng gói đi"): deploy đúng file nguồn KHÔNG đổi tên
  (`CREATE OR REPLACE` lên `PCK_TBH_TOOL`/`PCK_TBH_REPORT` thật) và đóng gói `bin/TBH_DMT.Web.dll` lên
  HTTP server **cùng một thời điểm** — khép kín khoảng hở giữa lúc DB đổi và lúc code C# theo kịp.
- **DDL bảng KHÔNG được cơ chế này bảo vệ** (2 schema package dùng chung bảng thật) — DDL trên bảng
  UAT đang dùng vẫn phải tuân quy tắc cũ: thêm cột có `DEFAULT` (additive), không sửa/xoá cột cũ; nếu
  bắt buộc phá vỡ tương thích thì dồn vào đúng cửa sổ đóng gói, không chạy giữa lúc dev.

## 4. Nguyên tắc bất di bất dịch — "PL/SQL fetch, frontend chỉ đổ vào hiển thị"

Đây là quy tắc sống còn của dự án, đã vi phạm và phải sửa lại nhiều lần trong quá trình phát triển ban đầu:

- **`frontend/index.html` không được tự tính toán/suy diễn số liệu nghiệp vụ.** Mọi số tiền, tỷ lệ, phân loại
  hiển thị phải đến thẳng từ 1 cột/1 kết quả PL/SQL thật — không hand-code, không "làm đẹp" tên hiển thị nếu
  PL/SQL trả về text khác (kể cả text đó xấu — VD tên nhà tái viết HOA không dấu — vẫn phải hiển thị ĐÚNG như
  PL/SQL trả về, trừ khi có 1 hàm PL/SQL thật làm việc chuẩn hoá đó).
- Trước khi coi 1 tính năng là xong: **luôn đối chiếu số liệu hiển thị với kết quả gọi PL/SQL trực tiếp trên
  dữ liệu thật** (không chỉ tin dữ liệu mock có sẵn — mock có thể đã lỗi thời hoặc bị nhập tay sai, đã xảy ra
  nhiều lần trong dự án này).
- Khi sửa 1 công thức/thủ tục PL/SQL, phải **grep lại toàn bộ `frontend/index.html`** tìm comment hoặc số
  liệu ví dụ cứng liên quan đến công thức đó — comment trích số liệu cũ đã sai còn nguy hiểm hơn comment mơ hồ.

### 4.1. Chuẩn xử lý export dữ liệu lớn (quyết định 2026-09-10)

Áp dụng lại cho các chức năng export có từ hàng nghìn đến hàng chục nghìn dòng:

- Luôn đo tách biệt thời gian lấy dữ liệu Oracle, serialize/truyền dữ liệu, dựng file, nén và tải xuống;
  không kết luận nút export chậm chỉ từ dung lượng file cuối.
- Với `.xlsx`, nhớ rằng đây là package ZIP/OOXML. Không bọc thêm `.rar`/`.zip` khiến người dùng phải giải
  nén. File cuối phải vẫn là đúng một `.xlsx` mở trực tiếp bằng Excel.
- Nếu workbook đã có logic/template client-side được duyệt, không viết lại mapping/công thức chỉ để đổi bộ
  nén. Giữ logic dựng workbook, POST package lên action ASP.NET có `[Authorize]` + anti-forgery, rồi re-pack
  từng entry bằng `System.IO.Compression.ZipArchive` và `CompressionLevel.Optimal`. Đây là pattern đã kiểm
  chứng ở export Hiệu quả đơn: SheetJS `compression:true` chỉ giảm khoảng 74,1%, còn `.NET Optimal` giảm
  khoảng 91,5% trên cùng dữ liệu Fire Quý 1/2017 mà nội dung/công thức không đổi.
- Có giới hạn đồng bộ ở IIS/ASP.NET và action; chừa overhead multipart. Bộ re-pack phải chặn package rỗng,
  quá nhiều/trùng entry, thiếu OOXML part bắt buộc và tổng dung lượng giải nén quá lớn để tránh ZIP bomb.
- Nếu export mới chưa có ràng buộc template client-side hoặc dữ liệu lớn đến mức JSON/browser trở thành nút
  thắt, ưu tiên sinh/stream file ở server theo lô thay vì đưa toàn bộ dữ liệu qua client rồi gửi ngược lại.
- Mỗi thay đổi export phải kiểm chứng bằng tập Oracle thật đủ lớn: so dung lượng trước/sau, thời gian từ lúc
  bấm nút đến khi tải xong, số dòng và byte/nội dung các package part; đồng thời mở bằng Excel thật để kiểm
  tra công thức, định dạng và khả năng mở file. Không coi test synthetic là bằng chứng thay cho E2E Oracle.

## 5. Ghi chú vận hành hiện tại (2026-08-29)

- **`DBMS_CRYPTO` đã dùng được** trên schema `KOUKIA` từ 2026-09-03 (DBA đã chạy
  `GRANT EXECUTE ON SYS.DBMS_CRYPTO TO KOUKIA;` theo yêu cầu người dùng — đã xác nhận qua SQLcl thật).
  `FNC_HASH_PASSWORD`/`FNC_GENERATE_SALT` (`PCK_TBH_TOOL.pkb`) đã đổi sang `DBMS_CRYPTO.HASH`/
  `DBMS_CRYPTO.RANDOMBYTES` thật, thay giải pháp tạm `SYS_GUID()`/`DBMS_UTILITY.GET_HASH_VALUE` trước đó.
  **Lưu ý quan trọng phát hiện khi đổi:** bản cài đặt `DBMS_CRYPTO` của instance này (dù `NLS_RDBMS_VERSION`
  báo `11.2.0.3.0`) **chỉ hỗ trợ `HASH_MD4`/`HASH_MD5`/`HASH_SH1`** — gọi `HASH` với type SHA-256
  (`HASH_SH256`, hằng số không tồn tại trong `ALL_SOURCE` của package) ra `ORA-28827: invalid cipher type
  passed`, không phải lỗi quyền. Đã dùng SHA-1 (`DBMS_CRYPTO.HASH_SH1`) thay SHA-256 như thiết kế gốc — vẫn
  là nâng cấp thật (hàm băm mật mã + salt ngẫu nhiên mật mã thật, không còn checksum tốc độ cao dễ
  brute-force), chấp nhận được cho quy mô vài chục user nội bộ, nhưng ghi rõ ở đây để agent sau không thử lại
  SHA-256 vô ích. Đã reset mật khẩu 5 user seed (`ducnm`/`linhpt`/`cuonglm`/`phuongnv`/`chuongth`, quy ước
  `<username>2026`) về đúng thuật toán mới, đã kiểm chứng `PRC_ADMIN_LOGIN` thành công qua SQLcl thật (đăng
  nhập đúng, đăng nhập sai tăng `FAILED_LOGIN_COUNT` đúng, thông báo lỗi chung chung không lộ username).
- **ORDS đã bị loại khỏi kiến trúc** (không cài được trên WS2008R2 — xem mục 0). Tầng API sẽ là ASP.NET MVC 5
  + ODP.NET trực tiếp, nhưng project đó **chưa được scaffold** — `frontend/index.html` hiện vẫn chạy dữ liệu
  mock cho phần lớn màn hình, các thủ tục `PRC_ADMIN_*`/`PRC_HQ_*` mới chỉ test bằng gọi PL/SQL trực tiếp,
  chưa có tầng ứng dụng thật đứng giữa.
- Đăng nhập app này **độc lập hoàn toàn với hệ thống `reg22`** (không SSO) — xem
  `docs/KIENTRUC_QUANLY_NGUOIDUNG_TG22.md`.

## 6. Git

Repo này có git, commit sau mỗi tính năng hoàn thành + đã verify bằng dữ liệu thật (không commit code chưa
test). Message ngắn gọn, tập trung "tại sao", không liệt kê từng dòng đổi.

## 7. Cộng tác với Codex

Khi Claude Code và Codex cùng làm việc trên repository này, tuân thủ `docs/AI_COLLABORATION.md` và dùng
`docs/AI_HANDOFF.md` làm bảng bàn giao ngắn hạn. Trước khi sửa, luôn kiểm tra trạng thái Git và phạm vi file agent
khác đang sở hữu. `AGENTS.md` là điểm vào cho Codex; các quy tắc dự án trong file này vẫn là nguồn dùng chung cho
cả hai agent.

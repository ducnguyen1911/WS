# TBH Design System — tham chiếu kỹ thuật

## Quyết định UI/UX 2026-09-09 — Figma Make refresh

Đây là quyết định mới nhất và **thay thế mục “Enterprise Light / Data First 2026-09-08” khi có mâu thuẫn về trình bày**. Quy tắc nghiệp vụ, contract dữ liệu, phân quyền và các comment lịch sử trong Prototype không thay đổi.

- Nguồn hình ảnh: Figma Make `t2KP3ZKRodvpmIC88DwFz5`, gồm đăng nhập mặc định/lỗi, trang chủ, tìm kiếm rỗng/có kết quả, quản lý người dùng, nhật ký và đổi mật khẩu.
- Màu chính `#0066B3`, nền nhấn `#EBF8FF`, canvas `#F4F7FA`, viền `#E2E8F0`, bề mặt trắng; font Inter.
- Header ứng dụng cao 64 px, nền trắng, logo trái, tên hệ thống căn giữa, người dùng và đăng xuất bên phải. Sidebar phẳng rộng 240 px; mục active dùng nền xanh rất nhạt.
- **Ngoại lệ được người dùng chỉ định:** màn đăng nhập không có header ứng dụng, dù frame Figma còn header. Login dùng card 440 px, dải nhấn 4 px, input nền xám nhạt, nút pill và footer hai tầng.
- Footer ứng dụng/login có viền trên xanh; phần cuối nền `#F4F7FA`. Hotline thật của ứng dụng vẫn là `1800 1118`.
- Chỉ lấy cấu trúc thị giác từ Figma. Không thêm notification/KPI/dữ liệu mẫu hoặc hành vi không có nguồn backend thật; trang chủ tiếp tục hiển thị đúng hai KPI từ server.
- Các ID, name, antiforgery, URL, `data-*`, ARIA, JavaScript hook và toàn bộ logic `hqd_*` phải được giữ nguyên khi đổi giao diện.

## Quyết định UI/UX 2026-09-08 — Enterprise Light / Data First

Phần này là quyết định mới nhất đã được người dùng phê duyệt và **thay thế các quy tắc cũ ở mục 1, 4, 5, 9, 9.1 và 9.2 nếu có mâu thuẫn**. Không thay đổi cấu trúc dữ liệu, logic nghiệp vụ hoặc hành vi của Prototype.

- Nguồn token chuẩn: `src/TBH_DMT.Web/Content/design-tokens.css`. Các stylesheet theo màn hình phải dùng token chung, không tự tạo thêm một hệ màu riêng.
- Logo chuẩn: ảnh ngang nền trong suốt lấy từ website chính thức `baovietonline.com.vn`, lưu tại `Content/images/baoviet-insurance-logo.png` (366 × 50 px). Không đặt logo trong hộp trắng, không kéo sai tỷ lệ, không dùng lại biến thể hai dòng cũ.
- Header cao 54 px, nền trắng, viền vàng 3 px; tiêu đề hệ thống dùng chữ xanh đậm nhưng không viết hoa toàn bộ.
- Canvas dùng `#f4f7fa`; card và vùng dữ liệu dùng nền trắng. Mảng xanh đặc chỉ dành cho hành động chính hoặc trạng thái cần nhấn mạnh, không dùng làm thanh tiêu đề lớn.
- Tiêu đề trang là một thanh sáng độc lập (`#f3f7fb`), cao 44 px, có vạch nhấn xanh 3 px. Header sidebar cũng cao 44 px để thẳng mép; sidebar dùng active state xanh rất nhạt và chỉ cao theo nội dung.
- Nút chính dùng màu xanh trung tính `#2f6fa5`, hover `#255b87`; không gradient, không hiệu ứng nhấc lên. Mỗi ngữ cảnh chỉ nên có một hành động chính dạng nền đặc.
- Input/select/nút chuẩn cao tối thiểu 36 px, bán kính 6 px. Trường ngày tự động theo Năm/Quý vẫn khóa nhập nhưng phải rõ chữ, không giảm opacity.
- Bảng dữ liệu ưu tiên khả năng đọc: header nền sáng, chữ slate, 12 px; body 12 px; header sticky. Riêng bảng kết quả đơn giữ cố định cột chọn và cột số đơn khi cuộn ngang.
- Drawer giữ viền vàng dưới header thẳng hàng với header chính; header trắng, tab nền sáng, nội dung nền xám rất nhạt. Màu trạng thái xanh/lục/vàng/đỏ chỉ dùng cho KPI và dữ liệu có ý nghĩa.
- Footer gọn, nền trắng, đường phân cách vàng; không dùng dải xanh đậm toàn chiều ngang.
- Shell desktop cao theo nội dung thay vì kéo sidebar/card tới sát footer. Responsive/mobile và focus-visible phải được giữ đầy đủ.

Prototype `frontend/index.html` thuộc quyền chỉnh sửa của Claude Code. Sau khi Codex hoàn tất ASP.NET, Claude Code rà soát và đồng bộ **chỉ phần trình bày**, không sao chép ngược thay đổi làm mất logic/comment lịch sử trong các hàm `hqd_render*` / `hqd_build*`.

Trích xuất từ `Prototype_TBH_v2_14082026.html`. File này dùng làm ngữ cảnh cho Claude Code khi dựng lại từng trang.

> **Cập nhật môi trường (đã xác nhận với khách hàng):** đây là ứng dụng độc lập. Máy chủ **không đổi được** — vẫn là **IIS 7.5 / Windows Server 2008 R2 SP1 (.NET Framework 4.8), Oracle 11g, mạng cô lập hoàn toàn (intranet only), xác thực tự quản lý**. Nhưng **phía client được chạy trên trình duyệt hiện đại** — Chrome, Edge (bản thường, không bắt buộc IE mode), hoặc Firefox — **không còn bị giới hạn bởi engine IE11/MSHTML nữa**. Toàn bộ giá trị màu/px bên dưới vẫn đúng nguyên vì đó là thiết kế gốc, nhưng các ràng buộc kỹ thuật "phải tránh IE11" ghi trong các phiên bản trước của tài liệu này **không còn bắt buộc** — xem mục 11 để biết chính xác điều gì còn phải giữ và điều gì đã được gỡ bỏ.

Bản xem trực quan (swatch, component preview): xem file `tbh-design-kit.html` / artifact đã publish kèm theo.

## 1. Màu sắc

```css
/* Thương hiệu */
--bv-blue:        #1B75BC;  /* chính — link, icon, tiêu đề bảng, giá trị KPI */
--bv-blue-dark:   #06478F;  /* điểm cuối gradient header, viền nhấn KPI */
--bv-blue-light:  #3B8FF4;  /* vòng focus input */
--bv-blue-deeper: #1565C0;  /* hover của nút gradient chính */
--bv-gold:        #E7AE00;  /* nhấn phụ — viền header, tab active, logo */

/* Trung tính */
nền trang:      #f7fafd
nền card:       #ffffff
viền card:      #e5e7eb
viền input:     #d1d5db
chữ chính:      #1f2937
chữ ô bảng:     #374151
nhãn/label:     #6b7280
placeholder:    #9ca3af
```

> Ghi chú: file gốc có 2 giá trị nền body khác nhau ở hai khối `<style>` (`#f7fafd` và `#f3f4f6`, do gộp từ 2 module). Chốt `#f7fafd` làm chuẩn khi build lại.

Giờ có thể dùng CSS custom properties bình thường (Chrome/Edge/Firefox hiện đại đều đọc `var()` tốt):
```css
:root {
  --bv-blue: #1B75BC;
  --bv-blue-dark: #06478F;
  --bv-blue-light: #3B8FF4;
  --bv-gold: #E7AE00;
}
```
Hoặc vẫn dùng biến SASS biên dịch tĩnh nếu muốn — cả hai cách đều ổn, chọn theo thói quen của đội dev chứ không còn là ràng buộc bắt buộc.

## 2. Badge trạng thái (nền 100 / chữ 700 cùng tông)

| Ý nghĩa | Nền | Chữ |
|---|---|---|
| Hoàn thành | `#dcfce7` | `#15803d` |
| Đang xử lý | `#dbeafe` | `#1d4ed8` |
| Cần xem xét | `#fef9c3` | `#a16207` |
| Từ chối / lỗi | `#fee2e2` | `#b91c1c` |
| Cảnh báo | `#ffedd5` | `#c2410c` |
| Đặc biệt | `#f3e8ff` | `#7e22ce` |
| Vô hiệu / mặc định | `#f3f4f6` | `#374151` |
| Import thành công | `#d1fae5` | `#047857` |

```css
.status-pill { display:inline-flex; align-items:center; border-radius:9999px; font-size:10px; font-weight:600; padding:3px 9px 4px; }
```

## 3. Typography

Font: **Inter** (400/500/600/700), toàn hệ thống chỉ dùng một font. Khuyến nghị **self-host** `.woff2` trong `/Content/fonts` thay vì gọi `fonts.googleapis.com` — không phải vì lý do trình duyệt (Chrome/Edge/Firefox đều tải Google Fonts bình thường) mà vì máy chủ ứng dụng nằm trong mạng cô lập; nếu máy client của người dùng có đường Internet riêng tách biệt với server thì gọi CDN vẫn hoạt động, nhưng self-host vẫn là lựa chọn an toàn hơn (không phụ thuộc CDN ngoài, tải nhanh hơn trong mạng nội bộ).

| Cỡ | Weight | Dùng cho |
|---|---|---|
| 20px | 700 | Giá trị KPI, tiêu đề trang |
| 14px | 600 | Tiêu đề khối nội dung |
| 12.5px | 700, `letter-spacing:.2px` | Tiêu đề section |
| 13px | 400 | Body / text mặc định |
| 12px | 400 | text-xs override |
| 11px | 400–600 | Ô dữ liệu trong bảng |
| 10px | 700, uppercase, `letter-spacing:.04em` | Nhãn KPI |
| 9px | 400 | Ghi chú phụ, timestamp |
| 10px mono | 700 | Mã bước tính toán (`'SF Mono', Consolas, monospace`) |

## 4. Bo góc & đổ bóng

```css
--radius-sm: 4px;    /* nút, badge vuông */
--radius-md: 8px;    /* card, modal, dropdown */
--radius-pill: 9999px;

--shadow-btn-hover: 0 2px 8px rgba(0,0,0,.15);
--shadow-lg: 0 10px 15px -3px rgba(0,0,0,.1), 0 4px 6px -4px rgba(0,0,0,.1);   /* sidebar, panel nổi */
--shadow-xl: 0 20px 25px -5px rgba(0,0,0,.1), 0 8px 10px -6px rgba(0,0,0,.1); /* modal */
--shadow-2xl: 0 25px 50px -12px rgba(0,0,0,.25);                              /* modal/dropdown lớn */
```
(Viết dưới dạng comment tham chiếu — trong CSS thật thay bằng giá trị trực tiếp, không dùng biến `var()`.)

## 5. Nút bấm

Hành vi chung `.bv-btn`: hover nhích lên `translateY(-1px)` + đổ bóng, active về `translateY(0)`, focus có outline xanh.
```css
.bv-btn { transition: all .2s ease; }
.bv-btn:hover { transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0,0,0,.15); }
.bv-btn:active { transform: translateY(0); }
.bv-btn:focus { outline: 2px solid #3B8FF4; outline-offset: 2px; }
```

| Loại | Nền | Chữ |
|---|---|---|
| Primary | `linear-gradient(90deg, #1B75BC, #06478F)`, hover đổi đầu sang `#1565C0` | `#ffffff` |
| Secondary/outline | `#f9fafb`, viền `#d1d5db`, hover `#f3f4f6` | `#374151` |
| Gold/outline phụ | `#ffffff`, viền `#E7AE00`, hover `#FFF8E1` | `#E7AE00` |
| Danger | `#dc2626`, hover `#b91c1c` | `#ffffff` |
| Success | `linear-gradient(90deg, #059669, #047857)` | `#ffffff` |

Bootstrap 4 tương ứng: dùng `.btn` + class tuỳ biến `.bv-btn` chồng lên (không đủ dùng `.btn-primary` mặc định vì màu khác brand — override `$primary: #1B75BC;` trong biến SASS của Bootstrap trước khi build).

## 6. Thẻ KPI

⚠️ **Có 2 kiểu thẻ KPI khác nhau trong prototype, đừng dùng nhầm kiểu này cho kiểu kia** (lỗi thật đã xảy ra
2026-09-03: `.drawer-kpi` trong `search.css` áp nhầm kiểu 6.1 vào Drawer, phải sửa lại về đúng 6.2 — xem
`docs/AI_HANDOFF.md` phần "Bổ sung 2026-09-03" để biết chi tiết đối chiếu).

### 6.1 Thẻ KPI Trang chủ (`app-stat-card`/`kpi-card`)

**Cập nhật 2026-09-05 (FT-004 + "Chuẩn hoá giao diện toàn website"):** khối Dashboard cũ 4 ô "Tổng phí TBH/
Tổng bồi thường/Tỷ lệ tổn thất/Số đơn hiệu lực" (số mock, không có PL/SQL/nguồn dữ liệu thật đứng sau) đã bị
**thay thế hoàn toàn**, không còn là chuẩn hiện hành — xem `docs/features/FT-004-TRANG-CHU/` để biết lý do.
Trang chủ mới chỉ còn **2 ô** dữ liệu thật (thấp — "Số lần tính hiệu quả"/"Tổng số đơn đã tính", 7 ngày qua),
cộng thêm khối "Công cụ" (launch card điều hướng nhanh) và bảng "Hoạt động gần đây". Đã dựng ở **cả hai nơi**:
ASP.NET thật (`Content/app-components.css` lớp `.app-stat-card`, `Views/Home/Index.cshtml`) và prototype
(`frontend/index.html`, panel `#dashboard-panel`, dùng số mock đồng bộ nguồn `auditLog` cho bảng hoạt động).
Cùng công thức style ở cả 2 nơi — viền trái 4px làm điểm nhấn màu, nền gradient rất nhạt:
```css
.kpi-card, .app-stat-card { background: linear-gradient(to bottom right, #eff6ff, #ffffff); border: 1px solid #e5e7eb; border-left: 4px solid #06478F; border-radius: 8px; padding: 16px; }
.kpi-value, .app-stat-value { font-size: 20px; font-weight: 700; color: #1B75BC; }
```
Cùng style viền trái + gradient này cũng được tái dùng cho thẻ thống kê màn "Quản lý người dùng" (Tổng tài
khoản/Đang hoạt động/Bị khóa — đổi màu viền theo ngữ nghĩa xanh dương/xanh lá/đỏ), thay cho kiểu ô vuông tô
màu phẳng căn giữa trước đây.

### 6.2 Thẻ KPI trong Drawer "Chi tiết đơn" (`hqd_kpiCard`/`hqd_miniCard`, mục 10 bên dưới)

**Phẳng, KHÔNG có viền trái đậm, KHÔNG có gradient** — khác hẳn 6.1. Trích đúng `frontend/index.html` dòng
4749-4760 (`hqd_kpiCard`/`hqd_miniCard`):
```css
/* 3 thẻ lớn đầu Tổng quan (Phí giữ lại/DTT/Phí nhượng tái) */
.drawer-kpi { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; background: #fff; }
.drawer-kpi .value { font-size: 18px; font-weight: 700; font-variant-numeric: tabular-nums; }
.drawer-kpi.green  { background: #f0fdf4; border-color: #dcfce7; } .drawer-kpi.green  .value { color: #15803d; }
.drawer-kpi.blue   { background: #eff6ff; border-color: #dbeafe; } .drawer-kpi.blue   .value { color: #1B75BC; }
.drawer-kpi.amber  { background: #fffbeb; border-color: #fef3c7; } .drawer-kpi.amber  .value { color: #a16207; } /* #a16207 = tông "amber/vàng" đã dùng nhất quán toàn app (eff-warn, money-recovery...), không phải amber-700 chuẩn Tailwind (#B45309) — giữ nguyên cho đồng bộ, không tự đổi màu này nếu chưa được yêu cầu riêng */

/* 6 ô nhỏ "Vùng dữ liệu đơn" bên dưới — mặc định trắng/xám, RIÊNG "Phí gốc sau đồng" tô xanh làm nổi bật
   (đây là số liệu quan trọng nhất của khối — phí gốc SAU khi trừ đồng bảo hiểm) */
.mini-card { border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px; background: #fff; }
.mini-card.highlight { background: #eff6ff; border-color: #bfdbfe; } .mini-card.highlight .value { color: #1B75BC; }
```

## 7. Bảng dữ liệu

```css
table th { background:#f7fafd; color:#1B75BC; font-weight:600; padding:8px 12px; }
table td { font-size:11px; color:#374151; padding:8px 12px; }
table tbody tr:nth-child(even) { background:#F9FAFB; }
table tbody tr:hover { background:#EFF6FF; }
```
`position: sticky` cho `<thead>` giờ dùng thoải mái (Chrome/Edge/Firefox hỗ trợ tốt) — không còn cần khung cuộn ngoài để né IE11 nữa.

## 8. Tab điều hướng

Chi tiết riêng: tab active có **cả** viền dưới vàng 3px **lẫn** viền trên xanh dạng `box-shadow: inset` — giữ nguyên khi build lại, đây là dấu hiệu nhận diện của hệ thống.
```css
.tab-btn { background:#f3f4f6; color:#6b7280; border-bottom:3px solid transparent; }
.tab-btn:hover { background:#e8f1fb; color:#1B75BC; }
.tab-btn.active { background:#fff; color:#1B75BC; border-bottom:3px solid #E7AE00; font-weight:700; box-shadow:inset 0 3px 0 #1B75BC; }
```

## 9. Header & sidebar

```css
.bv-header { background: linear-gradient(90deg, #1B75BC, #06478F); border-bottom: 2px solid #E7AE00; color:#fff; }
.nav-item:hover { background:#F0F7FF; }
.nav-item.active { background:#E0EDFF; border-left: 3px solid #1B75BC; }
```

> **Sửa 2026-09-03 — thống nhất góc gradient toàn hệ thống, đổi `135deg` → `90deg`:** trước đó `.bv-header`
> (và mọi khối tái dùng class này — sidebar-head, main-head, footer-top, drawer-header, modal-header quản
> trị) dùng gradient chéo `135deg`, còn nút bấm (mục 5) dùng gradient ngang `90deg` — 2 quy ước khác nhau
> trong cùng 1 hệ thống. Người dùng phát hiện qua đối chiếu trực tiếp Prototype + app thật: cùng 2 mã màu
> nhưng các khối "vuông" (VD hộp tiêu đề sidebar, tỷ lệ khung hình ~6:1) nhìn **đậm hơn hẳn** so với các
> thanh dài (header/main-head, tỷ lệ ~22-29:1) — vì gradient chéo `135deg` co giãn theo CẢ chiều rộng lẫn
> chiều cao, nên khối càng gần vuông thì quãng đường chuyển màu càng ngắn, tỷ trọng màu đậm trong khung càng
> lớn. Gradient ngang `90deg` chỉ phụ thuộc chiều rộng — không bị "bóp méo" theo tỷ lệ khung hình, nên mọi
> khối dù to hay nhỏ đều giữ đúng cùng 1 cảm giác màu. Đã đổi ĐỒNG BỘ toàn bộ `135deg` còn lại trong hệ thống
> (kể cả Prototype `frontend/index.html`) sang `90deg` — không còn nơi nào dùng `135deg` cho gradient
> thương hiệu `--bv-blue`/`--bv-blue-dark`.

### 9.1 Footer — full-bleed, đối xứng với header (sửa 2026-09-03)

**Bắt buộc dùng cùng công thức `.bv-header` (kể cả viền vàng `.bv-gold-border`) cho khối trên của footer** —
trước đó footer bị bọc trong 1 thẻ "card" riêng (`bg-white border rounded-lg shadow-sm`, thụt vào 2 bên,
không có viền vàng) trong khi header tràn hết chiều rộng (full-bleed) — 2 phong cách khác hẳn nhau dù cùng
tông màu, đã bị người dùng phát hiện qua đối chiếu trực tiếp cả Prototype lẫn app thật. Đã sửa để footer
**tràn full-bleed y hệt header**, không còn card/bo góc/khoảng đệm 2 bên:

```css
#app-footer .bv-header.bv-gold-border { /* giống hệt #top-bar, không thêm class riêng */ }
#app-footer > div:last-child { background:#06478F; text-align:center; padding:8px 16px; } /* dải bản quyền dưới cùng, dùng chung --bv-blue-dark thay vì 1 mã màu #1565C0 tách biệt trước đó, để chuyển màu liền mạch với gradient phía trên */
```

Chữ trong dải bản quyền dùng `text-blue-100` (khớp tông chữ phụ đã dùng ở phần địa chỉ/hotline ngay phía
trên) — **không dùng `text-gray-400`** như bản cũ (thiết kế cho nền card trắng, tương phản kém khi đặt trên
nền xanh đậm full-bleed).

### 9.2 Khối nội dung chính (sidebar + card) — luôn giãn đầy chiều cao còn lại (sửa 2026-09-03)

Container bọc sidebar + khối nội dung chính (`#main-container` ở Prototype, `.shell-container` ở app) phải
dùng **`items-stretch`/`align-items:stretch`**, không phải `items-start`/`flex-start`. Lý do: khi nội dung
bên trong ngắn (VD form ít trường), `items-start` để 2 khối trắng chỉ cao đúng bằng nội dung, để lộ mảng nền
xám trơn phía dưới — trông như trang dở dang, mất cân đối với 2 thanh màu đậm (header/footer) bao 2 đầu.
`items-stretch` buộc cả sidebar lẫn khối nội dung chính luôn giãn nền trắng xuống hết khoảng trống còn lại
giữa header và footer, dù nội dung bên trong ít.

### 9.3 Màn Đăng nhập — nền sáng + card viền trên xanh đậm (sửa 2026-09-05)

**Đã thay đổi** khỏi bản gốc: trước đây `.admin-login-body`/`#login-screen` dùng nền gradient xanh đậm phủ
toàn màn hình (`linear-gradient(to bottom right, var(--admin-blue-dark), var(--admin-blue))`), card đăng nhập
có phần đầu (`.login-card-head`) tô nền gradient xanh + chữ trắng. Theo yêu cầu "chuẩn hoá giao diện toàn
website theo phong cách Trang chủ", đã đổi sang **nền sáng trung tính + card trắng nổi bật nhờ viền trên xanh
đậm 4px** — nhất quán với cảm giác "nhẹ, nhiều khoảng trắng" của Trang chủ/Quản trị mới, thay vì mảng màu đậm
chiếm toàn màn hình:
```css
.admin-login-body, #login-screen { background: linear-gradient(135deg, #eaf3fd 0, #f7fafd 55%, #fff 100%); }
.login-card { border: 1px solid #dbe3ec; border-top: 4px solid var(--bv-blue-dark); box-shadow: 0 16px 36px -18px rgba(6,71,143,.4); }
.login-card-head { background: #fff; color: #1f2937; border-bottom: 1px solid #e5e7eb; } /* tên hệ thống chữ đen, dòng phụ "BẢO VIỆT INSURANCE" chữ xanh đậm hoa, không còn nền/chữ trắng */
```
Lưu ý: nền `135deg` ở đây là gradient NỀN TRUNG TÍNH (xanh nhạt→trắng, không dùng cặp màu thương hiệu
`--bv-blue`/`--bv-blue-dark`) — **không vi phạm** quy tắc "không còn nơi nào dùng `135deg` cho gradient
thương hiệu" ở mục 9 (quy tắc đó chỉ áp dụng cho gradient 2 tông xanh brand dùng ở header/sidebar-head/...).
Đã áp dụng đồng bộ cho cả ASP.NET thật (`admin.css`) lẫn prototype (`frontend/index.html`), form/validation/
JavaScript đăng nhập giữ nguyên không đổi.

## 10. Panel trượt (Slide-over drawer) — màn "Chi tiết đơn"

Trượt vào từ cạnh phải, đè lên nền mờ. Cơ chế `transform: translateX()` + `transition` + `position: fixed` chạy tốt trên mọi trình duyệt hiện đại.

```css
#hqd-drawer { position: fixed; top: 0; right: 0; height: 100%; width: 100%; background: #fff; z-index: 80; }
@media (min-width: 768px) { #hqd-drawer { width: 60%; max-width: 820px; } }
#hqd-drawer { transition: transform .3s cubic-bezier(0.4,0,0.2,1); }
#hqd-drawer.hidden { transform: translateX(100%); pointer-events: none; }
#hqd-drawer-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); z-index: 75; transition: opacity .3s ease; }
#hqd-drawer-overlay.hidden { opacity: 0; pointer-events: none; }
```

Header: cùng `.bv-header` + viền vàng dưới, có nút điều hướng đơn trước/sau (‹ ›), tiêu đề số đơn + phân đoạn (VD: "Engineering · NB · HC Sub-BranchA (7/10)"), chỉ số "Hiệu quả dịch vụ" nổi bật bên phải, nút xuất Excel và nút đóng.

Tab bên trong drawer dùng class riêng `.hqd-dtab` — **khác** với `.tab-btn` ở mục 08 (chỉ gạch chân xanh đơn giản, không viền vàng + inset shadow, vì đây là lớp phụ, không nên cạnh tranh thị giác với tab chính):
```css
.hqd-dtab { position: relative; color: #6b7280; }
.hqd-dtab.active { color: #1B75BC; }
.hqd-dtab.active::after { content:''; position:absolute; left:0; right:0; bottom:-1px; height:2px; background:#1B75BC; }
```

### 10.1 Pattern con trong tab "Cấu trúc tái" (lặp lại ở nhiều màn khác)

**Dòng callout tóm tắt** — nổi bật một số liệu quan trọng nhất (VD: mức giữ lại):
```css
.struct-callout { background:#ecfdf3; border:1px solid #bbf0cf; border-radius:6px; padding:8px 12px; display:flex; justify-content:space-between; }
.struct-callout .sc-label { color:#166534; font-weight:600; }
.struct-callout .sc-val { color:#15803d; font-weight:700; font-variant-numeric:tabular-nums; }
```

**Dải tiêu đề nhóm** — gom nhóm theo quốc gia/vùng, kèm icon:
```css
.region-group-head { background:#eaf3fd; color:#1B75BC; font-weight:700; padding:6px 10px; }
```

**Thẻ loại hợp đồng có thể thu gọn** — badge màu theo loại hợp đồng tái (dùng đúng bộ màu badge ở mục 02: QS/Surplus xanh dương `#dbeafe`/`#1d4ed8`, Fronting/Facultative tím `#f3e8ff`/`#7e22ce`, Excess of Loss cam `#ffedd5`/`#c2410c`), kèm bảng chi tiết bên trong (cột: Chương trình/Nhà tái, Cession, Tham gia, Phí nhượng — số căn phải, `tabular-nums`) và nút "Thu gọn tất cả" ở góc phải tab.

## 11. Việc thật sự bắt buộc khi build lại bằng ASP.NET MVC 5

> **Cập nhật quan trọng:** trước đây tài liệu này liệt kê 4 việc phải né để tương thích IE11 (không Tailwind CDN, không CSS variables, không CSS Grid, phải biên dịch JS xuống ES5). Khách hàng đã xác nhận **phía client chạy trên Chrome/Edge/Firefox hiện đại, không giới hạn IE mode nữa** — nên **cả 4 việc đó không còn bắt buộc**. Ghi lại dưới đây để tránh áp nhầm ràng buộc cũ khi build.

**Đã được gỡ bỏ (không còn phải né):**
- Tailwind CSS — dùng thoải mái (khuyến nghị build-time compile ra CSS tĩnh cho gọn nhẹ và không phụ thuộc CDN, nhưng không còn vì lý do tương thích trình duyệt).
- CSS custom properties (`var(--bv-blue)`) — dùng bình thường.
- CSS Grid cho layout lưới responsive — dùng bình thường, không cần ép về flexbox.
- JavaScript ES6+ (arrow function, `const`/`let`, template string, `async/await`, optional chaining...) — chạy thẳng trên Chrome/Edge/Firefox hiện đại, không cần biên dịch Babel xuống ES5.
- Custom scrollbar styling (`::-webkit-scrollbar`), `position: sticky`, và các hiệu ứng CSS3 khác — đều hoạt động bình thường trên cả ba trình duyệt.

**Vẫn còn bắt buộc (do ràng buộc máy chủ, không liên quan trình duyệt client):**

1. **Backend vẫn phải là .NET Framework cổ điển (tối đa 4.8), không lên được .NET Core/5+** — vì máy chủ là Windows Server 2008 R2 SP1, không đổi được. ASP.NET MVC 5 + C# vẫn là lựa chọn đúng cho phần server-side, hoàn toàn độc lập với việc client dùng trình duyệt gì — MVC5 chỉ sinh ra HTML/CSS/JS bình thường, trình duyệt hiện đại nhận được bao nhiêu thì dùng bấy nhiêu.
2. **Máy chủ ứng dụng cô lập mạng, không ra Internet** — vendor các thư viện/font quan trọng vào project (`/Content`, `/Scripts`) thay vì gọi CDN trực tiếp từ server, để không phụ thuộc việc server có kết nối ra ngoài hay không. Gói NuGet (ODP.NET...) vẫn restore ở máy dev có Internet, chỉ deploy DLL đã build. `.NET Framework 4.8` và bản vá TLS 1.1/1.2 vẫn phải cài bằng offline installer, chép qua USB/file share.
3. **Xác thực tự quản lý (không dùng Windows Authentication/AD)** — cần bảng user riêng trong Oracle, mật khẩu lưu dạng băm có muối (PBKDF2 qua `Rfc2898DeriveBytes` có sẵn trong .NET Framework, hoặc BCrypt.Net vendor thủ công), phân quyền Admin/Editor/Viewer như trong màn đăng nhập của prototype, dùng ASP.NET Forms Authentication (cookie mã hoá) làm cơ chế phiên đăng nhập.
4. **Driver Oracle đúng phiên bản** — Oracle Database 11g (xác nhận patch 11.2.0.3/11.2.0.4 với DBA) cần đi kèm đúng bản ODP.NET Managed Driver tương thích, không mặc định dùng bản mới nhất.

## 12. Quyết định kiến trúc: ODP.NET trực tiếp (không dùng ORDS) — kèm lộ trình 2 giai đoạn

> **Bối cảnh (29/08/2026):** có cân nhắc dùng Oracle REST Data Services (ORDS) để hiện đại hóa/đơn giản hóa kiến trúc truy cập dữ liệu. Đã xác minh: ORDS yêu cầu tối thiểu **Java 11**, và JDK 11+ của Oracle chỉ chính thức chứng nhận từ **Windows Server 2016 trở lên** — Windows Server 2008 R2 (máy chủ hiện tại) không nằm trong danh sách hỗ trợ, nên **ORDS không cài/chạy được trên hạ tầng hiện có**. Máy chủ mới hiện **chưa có gì chắc chắn** (đang trong quá trình xin đầu tư/nâng cấp, không có mốc thời gian rõ ràng). Đây là ý tưởng cá nhân để hiện đại hóa, **không phải yêu cầu bắt buộc** từ DBA/bộ phận hạ tầng.

**Quyết định:** không chờ ORDS/máy chủ mới. Tiếp tục kiến trúc đã chốt — ASP.NET MVC 5 (.NET Framework 4.8) kết nối Oracle 11g **trực tiếp qua ODP.NET Managed Driver**, chạy trên WS2008R2/IIS 7.5 hiện tại. Lý do:

- Quy trình xin đầu tư hạ tầng doanh nghiệp lớn thường kéo dài nhiều tháng–năm, không nên gắn tiến độ dự án nghiệp vụ vào một mốc chưa xác định.
- Với đúng một ứng dụng nội bộ duy nhất truy cập schema của chính nó, ODP.NET trực tiếp **đơn giản hơn** ORDS (ít thành phần vận hành hơn: không cần Java runtime, không cần Tomcat/ORDS standalone, ít điểm cần vá bảo mật hơn). ORDS chỉ thực sự có lợi khi nhiều loại client khác nhau (web/mobile/đối tác ngoài) cùng cần dùng chung một cổng REST — chưa phải tình huống hiện tại.

**Chuẩn bị sẵn cho tương lai (không phát sinh thêm việc ngay bây giờ, chỉ là kỷ luật code bình thường):** tổ chức lớp truy cập dữ liệu (Data Access Layer/Repository pattern) tách biệt rõ khỏi Controller — mọi lời gọi Oracle đi qua interface kiểu `IReinsuranceRepository`, `IPolicyRepository`... thay vì Controller gọi thẳng `OracleCommand`. Nhờ vậy, nếu sau này máy chủ mới (≥ Server 2016/2019) thực sự được duyệt và muốn chuyển sang ORDS (hoặc lên thẳng .NET hiện đại), việc thay thế chỉ nằm ở tầng implementation của DAL — không cần viết lại Controller/View/business logic.

**Lưu ý cho Claude Code khi scaffold project:** mặc định dùng ODP.NET trực tiếp cho mọi tính năng mới, trừ khi có ghi chú cập nhật khác trong file này.

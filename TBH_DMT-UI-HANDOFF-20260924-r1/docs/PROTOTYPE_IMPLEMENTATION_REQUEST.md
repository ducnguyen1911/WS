# FT-006 — Yêu cầu đồng bộ “Hồng nhượng tái trung bình” vào Prototype

## Prompt giao cho AI triển khai

Bạn là Frontend Developer của dự án `TBH_DMT`. Hãy đồng bộ chỉ tiêu FT-006 **“Hồng nhượng tái trung bình”** từ ứng dụng ASP.NET MVC thật vào Prototype tại:

```text
D:\ClaudeVibe\TBH_DMT\frontend\index.html
```

Trước khi sửa, bắt buộc đọc toàn bộ các hàm và comment liên quan:

- `HQD_POLICIES` và phần mô tả mapping `p.real`.
- `hqd_computeSteps`.
- `hqd_renderSearch` và `hqd_fillCalcRow`.
- `hqd_drawerTab` và `hqd_miniCard`.
- `hqd_exportExcel` và `hqd_drawerExport`.
- Bản triển khai chuẩn trong `src/TBH_DMT.Web/Scripts/hieuquadon/hieuqua-calc.js`, đặc biệt `renderOverview`, `pctVi`, `buildExportRow` và phần định dạng Excel.

Không thay đổi PL/SQL, C#, JavaScript của ứng dụng thật hoặc file Excel template production. Chỉ sửa Prototype và test regression riêng của Prototype.

## 1. Contract dữ liệu Prototype

Thêm field sau vào `real` của từng phần tử mock trong `HQD_POLICIES`:

```javascript
hongNhuongTaiTrungBinhPct: 28.51227776
```

Quy ước bắt buộc:

- Đây là giá trị phần trăm theo thang `0..100`, giống contract PL/SQL/C# thật. Ví dụ `28.51227776` nghĩa là `28,51%`, không phải `0.2851227776`.
- Với đơn có `phiNhuongTbh = 0` hoặc không có phí nhượng tái, field phải là `null`.
- Giá trị âm được giữ nguyên, không ép về `0`.
- Frontend chỉ đọc và hiển thị field này; tuyệt đối không tính lại bằng `tongHoaHongNhuongTbh / phiNhuongTbh` trong runtime.
- Các literal mock phải phản ánh dữ liệu nguồn đã được xác minh. Nếu chưa có số đã xác minh cho một bản ghi, dùng `null`, không tự suy đoán.

Baseline bắt buộc:

| Đơn | Ngày hiệu lực | Giá trị mock raw | Hiển thị |
|---|---|---:|---:|
| `7808204` | `2026-06-16` | `28.51227776` | `28,51%` |
| `7807313` | `2026-07-31` | `31.7625931078` | `31,76%` |
| Đơn có `phiNhuongTbh = 0` (có thể dùng mock `768426`) | theo dữ liệu mock | `null` | `—` |

Nếu các màn hình đang dùng output của `hqd_computeSteps`, hãy pass-through field này bằng một tên ổn định như `hongNhuongTaiTrungBinhPct`; không đổi thang số và không làm tròn trong model trung gian.

## 2. Drawer — tab “Tổng quan”

Trong nhánh `tab === 'tq'` của `hqd_drawerTab`, thêm một mini-card:

- Nhãn chính xác: `Hồng nhượng tái trung bình`.
- Vị trí: ngay sau mini-card `Phí gốc sau đồng`, trước `Nhóm nghiệp vụ`.
- Giá trị có dữ liệu: định dạng locale Việt Nam với đúng 2 chữ số thập phân, ví dụ `20,00%`, `28,51%`, `-20,00%`.
- Giá trị `null`, `undefined`, `NaN` hoặc không hữu hạn: hiển thị `—`.
- Tooltip/title chính xác: `Tổng hoa hồng nhượng tái / Tổng phí nhượng tái × 100%`.
- Không thêm đơn vị tiền tệ và không hiển thị dạng `20`, `0,20` hoặc `20,00` thiếu dấu `%`.

Nên tạo helper riêng, ví dụ:

```javascript
function hqd_pctVi(value, digits) {
  if (value === null || value === undefined || !isFinite(Number(value))) return '—';
  return Number(value).toLocaleString('vi-VN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }) + '%';
}
```

Mở rộng `hqd_miniCard(label, val, cls, title)` để nhận `title` tùy chọn. Thuộc tính HTML phải được escape theo helper an toàn hiện có; nếu Prototype chưa có helper escape attribute thì bổ sung helper nhỏ, không nối dữ liệu động chưa escape vào HTML.

Giữ nguyên grid responsive hiện tại `grid-cols-2 md:grid-cols-3`; không đổi màu, kích thước hoặc cấu trúc các card khác.

## 3. Bảng danh sách tìm kiếm

**Không thêm cột “Hồng nhượng tái trung bình” vào bảng danh sách trên màn hình.** Ứng dụng thật không hiển thị chỉ tiêu này tại bảng Search; nó chỉ hiển thị trong Drawer và Excel.

Vì vậy không được dịch `data-col`, `colspan` hoặc thứ tự cột của `hqd_renderSearch`/`hqd_fillCalcRow` chỉ để phục vụ FT-006.

## 4. Excel Prototype

Trong `hqd_exportExcel`, chèn cột mới ngay trước `Hiệu quả`:

```text
A  Số đơn
...
N  Phí tái lập (VND)
O  Hồng nhượng tái trung bình
P  Hiệu quả
Q  Cat
R  Ngành nghề
S  Công ty thành viên
```

Yêu cầu:

- Tổng cộng đúng 19 cột `A..S`.
- Header cột O chính xác: `Hồng nhượng tái trung bình`.
- Field mock đang dùng thang phần trăm `0..100`, nhưng ô Excel phải lưu numeric ratio. Vì vậy chỉ tại biên xuất Excel mới đổi `28.51227776 / 100` thành raw numeric `0.2851227776`.
- Ô O có kiểu số, không phải chuỗi chứa `%`.
- Number format của ô O là `0.00%` để Excel hiển thị `28,51%` theo locale máy người dùng.
- Nếu field là `null`/không hợp lệ, ô O để trống.
- Các cột P..S không bị lệch dữ liệu.
- Cập nhật đủ 19 phần tử trong `ws['!cols']`; đặt độ rộng cột O đủ đọc tiêu đề.
- Mọi đường xuất đang dùng chung `hqd_exportExcel`, bao gồm nút xuất tại Drawer hiện tại, phải nhận cùng cấu trúc cột. Không mở rộng phạm vi để thiết kế lại hành vi “xuất một đơn” của Prototype nếu chưa có yêu cầu riêng.

Không tạo chuỗi như `"28.51%"` cho Excel. Có thể dùng `XLSX.utils.aoa_to_sheet` trước, sau đó gán `cell.t = 'n'` và `cell.z = '0.00%'` cho các ô cột O có dữ liệu.

## 5. Regression test bắt buộc

Thêm test Node riêng cho Prototype, không sửa test production để hợp thức hóa Prototype. Test tối thiểu phải chứng minh:

1. `frontend/index.html` có đúng nhãn mini-card và tooltip FT-006.
2. Formatter trả `28,51%`, `31,76%`, `-20,00%` và `—` cho `null`.
3. Baseline `7808204` và `7807313` có đúng raw value nêu trên.
4. Một mock có `phiNhuongTbh = 0` có field `null` và Drawer hiển thị `—`.
5. Header Excel có đúng 19 cột; index 14 (cột O) là `Hồng nhượng tái trung bình`; index 15 là `Hiệu quả`.
6. Giá trị Excel cột O của `7807313` là số gần `0.317625931078`, với format `0.00%`; trường hợp `null` để blank.
7. Các cột P..S vẫn lần lượt là `Hiệu quả`, `Cat`, `Ngành nghề`, `Công ty thành viên`.
8. Không có cột FT-006 mới trong bảng Search trên màn hình.

Sau khi sửa, chạy ít nhất:

```powershell
node --test src/TBH_DMT.Web.Tests/JsTests/*.test.js
git diff --check
```

Sau đó mở `frontend/index.html` trên Chrome và kiểm tra trực quan ba baseline: `7808204`, `7807313` và một đơn giữ lại 100%.

## 6. Tiêu chí hoàn tất

- Prototype khớp ứng dụng thật về vị trí, nhãn, tooltip và định dạng chỉ tiêu.
- Không có phép tính nghiệp vụ mới ở frontend.
- Drawer hiển thị đúng thang phần trăm và trạng thái `null`.
- Excel là numeric percentage, đủ 19 cột và không lệch các cột sau.
- Test regression và `git diff --check` đều PASS.
- Không commit, push, tạo ZIP hoặc deploy database nếu chưa được Orchestrator yêu cầu.


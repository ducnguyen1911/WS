# Prompt giao AI lập hướng dẫn nâng cấp UI TBH_DMT

Bạn là UI Technical Writer & Code Reviewer của dự án TBH_DMT.

Bạn đang làm việc trên một snapshot độc lập đã được đóng gói từ repository chính. Hãy giữ nguyên cấu trúc thư mục và chỉ tạo tài liệu Markdown; không triển khai code giao diện trong nhiệm vụ này.

## Mục tiêu

Đọc Prototype đã được người dùng trực tiếp chỉnh sửa, đối chiếu với snapshot giao diện ASP.NET MVC hiện tại và tạo tài liệu hướng dẫn Gemini đồng bộ giao diện. Chỉ thay đổi presentation và nội dung hiển thị được phê duyệt; tuyệt đối không thay đổi logic, contract hoặc quy tắc nghiệp vụ.

## Đọc bắt buộc theo thứ tự

1. `README_FIRST.md`.
2. `frontend/index.html`:
   - Đọc comment `PROTOTYPE UI SOURCE OF TRUTH — 2026-09-24` ở đầu file.
   - Đọc đầy đủ lớp CSS cuối `UI REFERENCE REFRESH 2026-09-24`.
   - Khi các CSS lịch sử mâu thuẫn về presentation, ưu tiên lớp ngày 2026-09-24.
3. `DESIGN_SYSTEM.md`.
4. `AGENTS.md` và `CLAUDE.md` để hiểu ranh giới dự án; các đường dẫn tuyệt đối trong đó có thể thuộc máy nguồn, hãy dùng file tương ứng trong snapshot này.
5. `brain/TBH_DMT_Knowledge.md`.
6. `docs/PROJECT_CONTEXT.md` và `docs/TBH_DMT-SHARED-CONTEXT.md`.
7. Các file hiện tại trong:
   - `src/TBH_DMT.Web/Views/`
   - `src/TBH_DMT.Web/Content/`
   - `src/TBH_DMT.Web/Scripts/`
   - `src/TBH_DMT.Web.Tests/JsTests/`

## Được phép đưa vào hướng dẫn Gemini

- Màu sắc, typography, spacing và bố cục.
- Kích thước, surface, border, radius, shadow và background.
- Hover, focus, active, disabled, loading, empty và error presentation.
- Responsive, keyboard accessibility và reduced motion.
- Label hoặc tiêu đề textbox.
- Placeholder và help text.
- Tooltip/title.
- Chữ hiển thị trên button.
- Tiêu đề màn hình, khối nội dung và tab đã được người dùng chỉnh sửa trong Prototype.
- `aria-label`/`aria-labelledby` mô tả tương ứng khi nội dung nhìn thấy thay đổi.

Nội dung nhìn thấy trong Prototype được coi là nội dung người dùng đã trực tiếp sửa và duyệt.

## Ranh giới bất biến

Không được hướng dẫn Gemini thay đổi:

- ID, `name`, `data-*` hoặc selector/hook mà JavaScript sử dụng.
- URL, route, controller, action hoặc antiforgery.
- Event handler hoặc chữ ký hàm.
- Thứ tự và ý nghĩa tham số.
- Validation nghiệp vụ hoặc thông điệp làm thay đổi quy tắc validation.
- Công thức tính toán, data grain hoặc contract PL/SQL/C#.
- Phân quyền, vòng đời job, export contract hoặc quy trình dữ liệu.
- Dữ liệu backend hoặc mock contract.
- Logic `hqd_*`, `pb_*`, `paid_*`, `bc_*`.

Khi đổi label/button text:

- Chỉ đổi nội dung người dùng nhìn thấy.
- Giữ nguyên ID, `name`, `value` nghiệp vụ và handler.
- Cập nhật mô tả accessibility tương ứng nếu có.
- Không dùng thay đổi câu chữ để thay đổi hành vi control.
- Nếu text được JavaScript so sánh trực tiếp hoặc tham gia validation, ghi thành blocker; không đề xuất sửa logic.

Không sao chép nguyên khối HTML/JavaScript/mock data từ Prototype sang production. Phải mapping từng thành phần vào View/CSS hiện tại của ứng dụng thật.

## Đầu ra bắt buộc

Tạo duy nhất file:

```text
docs/UI_UPGRADE_GEMINI_IMPLEMENTATION_GUIDE.md
```

Tài liệu phải có:

1. Mục tiêu, phạm vi và nguyên tắc `presentation-only`.
2. Inventory đầy đủ các màn hình/component trong Prototype và ứng dụng thật.
3. Bảng mapping cho từng thành phần gồm:
   - Màn hình.
   - Selector/component Prototype.
   - Giao diện hoặc nội dung hiển thị mới.
   - View/CSS hiện tại tương ứng.
   - File Gemini được phép sửa.
   - ID/hook/logic bắt buộc giữ nguyên.
   - Acceptance criteria.
4. Bảng mapping riêng cho label textbox, placeholder, help text, tooltip và button text khác nhau giữa Prototype và ứng dụng thật.
5. Danh sách file được phép sửa.
6. Danh sách file/lớp logic cấm sửa.
7. Kế hoạch triển khai theo các batch nhỏ, dễ review và rollback.
8. Acceptance criteria trên desktop, tablet và mobile.
9. Accessibility checklist.
10. Regression gates chứng minh nghiệp vụ không đổi.
11. Yêu cầu Gemini báo cáo diff theo từng component.
12. Mục `Blocker`: mọi thay đổi UI buộc phải sửa logic phải dừng lại để xin quyết định.

## Yêu cầu chất lượng

- Mọi mapping phải dẫn tới file cụ thể trong snapshot; không viết chung chung.
- Tách rõ thay đổi CSS thuần, thay đổi markup không làm đổi hook và thay đổi text được duyệt.
- Chỉ mô tả điều có bằng chứng từ Prototype/Design System/source hiện tại.
- Không phát minh component, backend, dữ liệu hoặc nghiệp vụ mới.
- Không sửa các file nguồn trong snapshot.
- Không commit, push, tạo gói deploy hoặc deploy database.

Khi hoàn tất, trả lời ngắn gọn đường dẫn file đã tạo và các blocker còn lại, nếu có.


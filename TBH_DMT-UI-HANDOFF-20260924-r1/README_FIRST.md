# TBH_DMT UI Handoff — 2026-09-24 r1

Đây là gói snapshot độc lập để chuyển sang một máy/AI khác nhằm lập tài liệu hướng dẫn Gemini nâng cấp giao diện TBH_DMT.

## Bắt đầu

1. Giải nén toàn bộ gói, giữ nguyên cấu trúc thư mục.
2. Gửi nguyên nội dung file `PROMPT_FOR_NEXT_AI.md` cho AI nhận việc.
3. AI phải tạo đầu ra `docs/UI_UPGRADE_GEMINI_IMPLEMENTATION_GUIDE.md` ngay trong thư mục đã giải nén.
4. Nhận lại file Markdown đó và đưa về repository chính để review; không lấy code triển khai từ máy nhận việc nếu chưa qua review.

## Nguồn chính

- `frontend/index.html`: Prototype và nguồn giao diện đã được người dùng trực tiếp chỉnh sửa.
- `DESIGN_SYSTEM.md`: quyết định thiết kế của dự án.
- `src/TBH_DMT.Web/Views/`: snapshot Razor Views hiện tại để mapping.
- `src/TBH_DMT.Web/Content/`: CSS, font và logo hiện tại.
- `src/TBH_DMT.Web/Scripts/`: JavaScript hiện tại, chỉ dùng để nhận diện hook phải giữ nguyên.
- `src/TBH_DMT.Web.Tests/JsTests/`: regression test tham khảo.
- `brain/TBH_DMT_Knowledge.md`: quy tắc tri thức dùng chung.

## Ranh giới bảo mật và phạm vi

- Gói không chứa `Web.config`, connection string, source/package database, `App_Data`, file báo cáo Excel hay output triển khai.
- Prototype có tài khoản demo/mock để có thể mở và điều hướng các màn hình. Không coi chúng là credential của môi trường thật và không sao chép vào production.
- Gói chỉ phục vụ phân tích giao diện và viết tài liệu; không phải gói build/deploy.
- Không commit, push, deploy hoặc chỉnh database từ snapshot này.

## Quyền thay đổi nội dung hiển thị

Được phép hướng dẫn đồng bộ label/tiêu đề textbox, placeholder, help text, tooltip/title và chữ trên button theo Prototype, vì đây là nội dung người dùng đã trực tiếp chỉnh sửa. Khi thay text phải đồng bộ mô tả accessibility tương ứng nhưng giữ nguyên ID, `name`, hook, handler và hành vi.


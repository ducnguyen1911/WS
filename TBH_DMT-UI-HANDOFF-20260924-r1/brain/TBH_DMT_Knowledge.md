# TBH_DMT — Tri Thuc Dung Chung

> Cap nhat lan cuoi: 2026-09-24 (Codex, Prototype UI source of truth)
>
> Muc dich: giu index va cac bai hoc co the tai su dung giua cac AI/session.
> Tai lieu chi tiet van nam trong `D:\ClaudeVibe\TBH_DMT\docs\`.

## Nguon can doc

1. `D:\ClaudeVibe\TBH_DMT\docs\PROJECT_CONTEXT.md`
2. `D:\ClaudeVibe\TBH_DMT\docs\AI_HANDOFF.md`
3. `D:\ClaudeVibe\TBH_DMT\docs\TBH_DMT-SHARED-CONTEXT.md`
4. `D:\ClaudeVibe\TBH_DMT\docs\PLAYBOOK_TOI_UU_HIEU_NANG_PLSQL.md`
5. `D:\ClaudeVibe\BRAIN\db\TG22_Oracle_PLSQL_Knowledge.md`

## Quy tac dong bo

- Moi phat hien moi ve nghiep vu, data grain, edge case, bug, hieu nang, QA hoac van hanh phai duoc ghi vao tai lieu dung chu de trong repo va tom luoc tai file nay neu co gia tri tai su dung.
- Khi them file tri thuc moi cho TBH_DMT, cap nhat ca index trong `D:\ClaudeVibe\BRAIN\README.md`.
- Ban giao theo Rule 8 van ghi vao `docs\AI_HANDOFF.md`; tri thuc ben vung ghi vao `docs\TBH_DMT-SHARED-CONTEXT.md`; bai hoc PL/SQL/hieu nang ghi vao playbook va/hoac `BRAIN\db`.
- Khong dua credential, connection string, file Excel du lieu that, ID ca nhan hoac noi dung nhay cam vao BRAIN.

## Prototype UI source of truth

- Tu 2026-09-24, `D:\ClaudeVibe\TBH_DMT\frontend\index.html` co marker `PROTOTYPE UI SOURCE OF TRUTH` o dau file va lop CSS cuoi `UI REFERENCE REFRESH 2026-09-24`. AI lap tai lieu nang cap giao dien phai doc lop cuoi nay truoc; khi xung dot presentation, no uu tien hon cac block CSS lich su.
- Prototype chi la nguon tham chieu presentation: token mau, typography, spacing, surface, border, shadow, hover/focus/disabled, responsive va accessibility. Duoc phep dong bo noi dung hien thi da duoc nguoi dung sua/duyet tren Prototype, gom label/tieu de textbox, placeholder, help text, tooltip/title va chu tren button; phai dong bo mo ta accessibility tuong ung neu co. Khong duoc dung viec dong bo UI de thay ID/name/data-*, URL, antiforgery, event handler, validation, cong thuc, data grain, phan quyen, mock contract hoac logic `hqd_*`/`pb_*`/`paid_*`/`bc_*`.
- AI viet huong dan cho Gemini phai mapping tung selector/component Prototype sang View/CSS hien huu cua ASP.NET MVC, neu ro file duoc phep sua, file cam sua, regression gate va muc `giu nguyen logic`; khong sao chep nguyen khoi HTML/JS Prototype sang production.

## Bai hoc QA cot loi

- File/log ket qua rong nghia la chua co bang chung ket qua; khong duoc suy ra la khong co loi.
- Bao cao Excel phai doi chieu so dong va tong/hash cot nghiep vu voi cursor goi truc tiep, khong chi kiem tra dinh dang.
- Moi bao cao QA phai ghi ro package Oracle duoc goi la package that hay `DEV_`.
- Khi thay cham, kiem tra package that co dung phien ban moi truoc khi ket luan hieu nang.
- Thu nghiem PL/SQL theo Shadow-First; AI QA khong tu deploy package production.
- Oracle `DATE` ghi bang `SYSDATE` va thoi gian .NET phai dung cung time basis; khong so sanh truc tiep voi `DateTime.UtcNow` khi chua chuyen doi mui gio ro rang.

## FT-007 Paid Borderaux

- Ky hieu luc toi da 1 nam; ky ghi nhan boi thuong khong gioi han do rong va co the keo dai nhieu nam.
- File chuan co 43 cot A..AQ, sheet `Paid Borderaux`, data tu dong 7, freeze pane H7.
- Cac cot ty le la numeric ratio dinh dang `0.00%`; cot tien la numeric, khong luu chuoi da dinh dang.
- File tam trong `src\TBH_DMT.Web\App_Data\ReportJobs\` chua du lieu that, phai duoc git-ignore va don sau QA theo dung quyen.

## FT-006 Tinh hieu qua

- Non-Cargo dung grain ky han `(policy_id, inception_date)` va phai gom day du NB/Renewal/MTA/Cancellation/Reinstatement.
- RunList, RunBatch, Search va Export phai dong bo tap ky han; MTA ngoai khoang loc khong duoc lam mat thanh vien cua ky han da chon.
- Prototype phai nhan `hongNhuongTaiTrungBinhPct` theo thang phan tram `0..100` tu du lieu mock/contract, khong tinh lai nghiep vu o frontend. Drawer hien mini-card sau `Phi goc sau dong`, dinh dang vi-VN 2 so le va `null` thanh `—`.
- FT-006 khong them cot vao bang Search tren man hinh. Excel moi co cot O `Hong nhuong tai trung binh`, luu numeric ratio (gia tri phan tram chia 100 tai bien export), format `0.00%`; P..S giu dung thu tu.
- Dac ta giao AI dong bo Prototype: `D:\ClaudeVibe\TBH_DMT\docs\features\FT-006-HONG-NHUONG-TAI-TRUNG-BINH\PROTOTYPE_IMPLEMENTATION_REQUEST.md`.

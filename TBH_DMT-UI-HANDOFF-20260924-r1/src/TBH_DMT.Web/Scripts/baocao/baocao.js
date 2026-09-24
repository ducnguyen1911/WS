(function () {
    'use strict';

    // THEM 2026-09-10 (yeu cau nguoi dung: khung UI tham so cho 5 bao cao he thong - dung CHUNG 1
    // trang ThamSo.cshtml/file js nay, chi khac ReportKey/ReportTitle truyen tu server qua
    // window.TBH_BAO_CAO). Cong ty thanh vien/Nghiep vu/Nam-Quy/Khoang ngay hieu luc dung LAI dung
    // logic parse/validate/dinh dang ngay cua Scripts/hieuquadon/search.js (DD/MM/YYYY that, tu chen
    // dau / khi go du 8 so lien, khong chi la lop hien thi - xem AI_HANDOFF.md muc r18/r19). Nam la
    // BAT BUOC o man hinh nay (khac HieuQuaDon - "Tu chon ngay" khong ap dung o day), luon tu dong
    // dien + khoa Tu ngay/Den ngay khi da chon Nam. Ngay nhap don (enter_date_from/to) la bo loc DOC
    // LAP, khong bi Nam/Quy chi phoi.
    var config = window.TBH_BAO_CAO || {};
    var cttvOptions = config.cttvOptions || [];
    var selectedCttv = new Map();

    function byId(id) { return document.getElementById(id); }
    function normalize(value) { return (value || '').toLocaleLowerCase('vi-VN').trim(); }

    function showToast(message, type) {
        var container = byId('toast-container');
        var toast = document.createElement('div');
        toast.className = 'toast ' + (type || 'info');
        toast.textContent = message;
        container.appendChild(toast);
        window.setTimeout(function () { toast.remove(); }, 3500);
    }

    function setMenuOpen(button, menu, open) {
        menu.hidden = !open;
        button.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    function renderCttv(keyword) {
        var list = byId('bc-cttv-list');
        var term = normalize(keyword);
        var filtered = cttvOptions.filter(function (option) {
            return !term || normalize(option.TenCttv).indexOf(term) >= 0;
        });
        list.textContent = '';
        if (!filtered.length) {
            var empty = document.createElement('div');
            empty.className = 'menu-empty';
            empty.textContent = cttvOptions.length ? 'Không tìm thấy công ty phù hợp' : 'Chưa tải được danh sách';
            list.appendChild(empty);
            return;
        }
        filtered.forEach(function (option) {
            var label = document.createElement('label');
            label.className = 'menu-option';
            var checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = String(option.CttvId);
            checkbox.checked = selectedCttv.has(checkbox.value);
            checkbox.addEventListener('change', function () {
                if (checkbox.checked) selectedCttv.set(checkbox.value, option.TenCttv);
                else selectedCttv.delete(checkbox.value);
                updateCttvLabel();
            });
            var text = document.createElement('span');
            text.textContent = option.TenCttv;
            label.appendChild(checkbox); label.appendChild(text); list.appendChild(label);
        });
    }

    function updateCttvLabel() {
        var label = byId('bc-cttv-label');
        var names = Array.from(selectedCttv.values());
        label.textContent = names.length === 0 ? '-- Tất cả CTTV --' : names.length === 1 ? names[0] : 'Đã chọn ' + names.length + ' CTTV';
    }

    // Sao chep dung nguyen logic dinh dang/parse/validate ngay tu Scripts/hieuquadon/search.js
    // (r18/r19 - da QA that qua headless Chrome). KHONG viet lai theo cach khac.
    function formatDateDMY(iso) {
        if (!iso) return '';
        var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
        if (!match || Number(match[1]) < 1900) return '';
        return match[3] + '/' + match[2] + '/' + match[1];
    }
    function normalizeDateDMY(text) {
        var value = (text || '').trim();
        return /^\d{8}$/.test(value)
            ? value.slice(0, 2) + '/' + value.slice(2, 4) + '/' + value.slice(4)
            : value;
    }
    function parseDateDMY(text) {
        var match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(normalizeDateDMY(text));
        if (!match) return '';
        var day = Number(match[1]); var month = Number(match[2]); var year = Number(match[3]);
        if (year < 1900 || year > 9999 || month < 1 || month > 12 || day < 1 || day > new Date(year, month, 0).getDate()) return '';
        return String(year) + '-' + (month < 10 ? '0' : '') + month + '-' + (day < 10 ? '0' : '') + day;
    }
    function setDateValue(inputId, displayId, iso) {
        var input = byId(inputId); var display = byId(displayId);
        input.value = iso || '';
        display.value = formatDateDMY(input.value);
    }
    function setDateDisabled(inputId, displayId, disabled) {
        var input = byId(inputId); var display = byId(displayId);
        input.disabled = disabled; display.disabled = disabled;
        input.classList.toggle('auto-date-locked', disabled);
        display.classList.toggle('auto-date-locked', disabled);
    }
    function updateDateFromDisplay(inputId, displayId, normalizeOnly) {
        var input = byId(inputId); var display = byId(displayId);
        var normalizedText = normalizeDateDMY(display.value);
        if (normalizedText !== display.value.trim()) display.value = normalizedText;
        input.value = parseDateDMY(normalizedText);
        if (normalizeOnly && input.value) display.value = formatDateDMY(input.value);
    }
    function bindDateField(inputId, displayId, onChanged) {
        var input = byId(inputId); var display = byId(displayId);
        display.addEventListener('input', function () {
            updateDateFromDisplay(inputId, displayId, false);
            display.setAttribute('aria-invalid', 'false');
            if (onChanged) onChanged();
        });
        display.addEventListener('change', function () { updateDateFromDisplay(inputId, displayId, true); validate(); });
        input.addEventListener('change', function () {
            var formatted = formatDateDMY(input.value);
            if (input.value && !formatted) input.value = '';
            display.value = formatted;
            validate();
        });
        display.value = formatDateDMY(input.value);
    }

    // SUA 2026-09-10 (yeu cau nguoi dung, khac HieuQuaDon): Nam la BAT BUOC o man hinh Bao cao - khong
    // co lua chon "Tu chon ngay" tu do nhu HieuQuaDon. Chon Nam luon tu dong dien + khoa Tu ngay/Den
    // ngay; bo chon Nam (chi xay ra qua Dat lai bo loc) mo khoa lai va xoa gia tri.
    function applyYear() {
        var year = byId('bc-year').value;
        var quarter = byId('bc-quarter').value;
        if (!year) {
            setDateDisabled('bc-from', 'bc-from-display', false);
            setDateDisabled('bc-to', 'bc-to-display', false);
            setDateValue('bc-from', 'bc-from-display', '');
            setDateValue('bc-to', 'bc-to-display', '');
            validate();
            return;
        }
        var quarters = { '1': ['01-01', '03-31'], '2': ['04-01', '06-30'], '3': ['07-01', '09-30'], '4': ['10-01', '12-31'] };
        var dates = quarter ? quarters[quarter] : ['01-01', '12-31'];
        setDateValue('bc-from', 'bc-from-display', year + '-' + dates[0]);
        setDateValue('bc-to', 'bc-to-display', year + '-' + dates[1]);
        setDateDisabled('bc-from', 'bc-from-display', true);
        setDateDisabled('bc-to', 'bc-to-display', true);
        validate();
    }

    function validate() {
        var riclassValid = Boolean(byId('bc-riclass').value);
        byId('bc-riclass-error').hidden = riclassValid;

        var yearValid = Boolean(byId('bc-year').value) && Boolean(byId('bc-from').value);
        byId('bc-from-error').hidden = yearValid;

        return riclassValid && yearValid;
    }

    function reset() {
        byId('bc-params-form').reset();
        selectedCttv.clear();
        updateCttvLabel();
        setDateDisabled('bc-from', 'bc-from-display', false);
        setDateDisabled('bc-to', 'bc-to-display', false);
        setDateValue('bc-from', 'bc-from-display', '');
        setDateValue('bc-to', 'bc-to-display', '');
        setDateValue('bc-enter-from', 'bc-enter-from-display', '');
        setDateValue('bc-enter-to', 'bc-enter-to-display', '');
        byId('bc-riclass-error').hidden = true;
        byId('bc-from-error').hidden = true;
        showToast('Đã đặt lại bộ lọc', 'info');
    }

    renderCttv('');
    updateCttvLabel();
    bindDateField('bc-from', 'bc-from-display', function () { byId('bc-from-error').hidden = true; });
    bindDateField('bc-to', 'bc-to-display');
    bindDateField('bc-enter-from', 'bc-enter-from-display');
    bindDateField('bc-enter-to', 'bc-enter-to-display');

    byId('bc-cttv-btn').addEventListener('click', function () {
        var open = byId('bc-cttv-drop').hidden;
        setMenuOpen(byId('bc-cttv-btn'), byId('bc-cttv-drop'), open);
        if (open) byId('bc-cttv-search').focus();
    });
    byId('bc-cttv-search').addEventListener('input', function () { renderCttv(this.value); });
    document.addEventListener('click', function (ev) {
        var drop = byId('bc-cttv-drop'); var btn = byId('bc-cttv-btn');
        if (!drop.contains(ev.target) && ev.target !== btn && !btn.contains(ev.target)) {
            setMenuOpen(btn, drop, false);
        }
    });
    byId('bc-riclass').addEventListener('change', validate);
    byId('bc-year').addEventListener('change', applyYear);
    byId('bc-quarter').addEventListener('change', applyYear);
    byId('bc-reset-btn').addEventListener('click', reset);

    byId('bc-params-form').addEventListener('submit', function (ev) {
        ev.preventDefault();
        if (!validate()) {
            showToast('Vui lòng chọn Nghiệp vụ và Năm trước khi xuất báo cáo', 'warning');
            return;
        }
        // THEM 2026-09-10: giai doan nay CHI la khung UI nhap tham so (yeu cau nguoi dung) - CHUA co
        // PL/SQL/logic xuat bao cao that phia sau (xem BaoCaoController). Bao trung thuc trang thai,
        // KHONG gia lap so lieu/file xuat gia - dung nguyen tac du an "PL/SQL fetch, frontend chi do
        // vao hien thi", khong hand-code/bia du lieu nghiep vu.
        showToast('Chức năng xuất báo cáo "' + config.reportTitle + '" đang được phát triển, sẽ có trong bản cập nhật tiếp theo.', 'info');
    });
})();

(function () {
    'use strict';
    var page = document.getElementById('audit-page');
    if (!page) return;
    var body = document.getElementById('audit-table-body');
    var message = document.getElementById('audit-message');
    var count = document.getElementById('audit-count');
    var currentRows = [];
    var labels = { login: 'Đăng nhập', logout: 'Đăng xuất', view: 'Xem', edit: 'Chỉnh sửa', create: 'Thêm mới', delete: 'Xóa', export: 'Xuất file', confirm: 'Xác nhận' };

    function escapeHtml(value) {
        var node = document.createElement('div');
        node.textContent = value == null ? '' : String(value);
        return node.innerHTML;
    }

    function show(text, type) { message.className = 'admin-alert ' + type; message.textContent = text; message.hidden = false; }

    function load() {
        message.hidden = true;
        page.setAttribute('aria-busy', 'true');
        count.textContent = 'Đang tải dữ liệu...';
        var query = new URLSearchParams();
        var values = { username: document.getElementById('audit-user').value, actionType: document.getElementById('audit-action').value, dateFrom: document.getElementById('audit-from').value, dateTo: document.getElementById('audit-to').value };
        Object.keys(values).forEach(function (key) { if (values[key]) query.set(key, values[key]); });
        fetch(page.dataset.listUrl + '?' + query.toString(), { credentials: 'same-origin' }).then(function (response) { return response.json(); }).then(function (payload) {
            if (!payload.success) throw new Error(payload.message);
            currentRows = payload.data || [];
            count.textContent = 'Hiển thị ' + currentRows.length + ' bản ghi';
            body.innerHTML = currentRows.length ? currentRows.map(function (row) {
                var action = (row.ActionType || '').toLowerCase();
                return '<tr><td>' + escapeHtml(row.CreatedDtText) + '</td><td><strong>' + escapeHtml(row.Username) + '</strong></td><td><span class="badge action-' + escapeHtml(action) + '">' + escapeHtml(labels[action] || row.ActionType) + '</span></td><td>' + escapeHtml(row.ActionDetail) + '</td><td class="ip-cell">' + escapeHtml(row.IpAddress) + '</td></tr>';
            }).join('') : '<tr><td colspan="5" class="empty-cell">Không có bản ghi phù hợp</td></tr>';
        }).catch(function (exception) {
            currentRows = []; count.textContent = '0 bản ghi'; show(exception.message || 'Không thể tải nhật ký hệ thống', 'error'); body.innerHTML = '<tr><td colspan="5" class="empty-cell">Không thể tải dữ liệu</td></tr>';
        }).then(function () { page.removeAttribute('aria-busy'); });
    }

    function pad2(value) { return value < 10 ? '0' + value : String(value); }
    function toDateInputValue(date) { return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate()); }

    // Truoc day khong loc gi mac dinh -> moi lan mo man nay tai toan bo lich su TBH_AUDIT_LOG (khong
    // phan trang), cang ve sau cang cham khi du lieu tich luy nhieu. Mac dinh 2 thang gan nhat khop dung
    // chinh sach luu tru moi (job JOB_TBH_PURGE_AUDIT_LOG xoa vinh vien du lieu cu hon 2 thang) - nguoi
    // dung van bo/noi rong duoc filter ngay neu can xem trong pham vi con luu. Clamp ngay cuoi thang giong
    // ADD_MONTHS cua Oracle (VD 31/08 - 2 thang = 30/06, khong bi tran sang 01/07 nhu setMonth() tho).
    function defaultFromDate(today) {
        var year = today.getFullYear();
        var month = today.getMonth() - 2;
        var target = new Date(year, month, 1);
        var daysInTargetMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
        target.setDate(Math.min(today.getDate(), daysInTargetMonth));
        return target;
    }
    var today = new Date();
    document.getElementById('audit-to').value = toDateInputValue(today);
    document.getElementById('audit-from').value = toDateInputValue(defaultFromDate(today));

    ['audit-user', 'audit-action', 'audit-from', 'audit-to'].forEach(function (id) { document.getElementById(id).addEventListener('change', load); });
    document.getElementById('export-audit-btn').addEventListener('click', function () {
        if (typeof XLSX === 'undefined') { show('Không thể tải thư viện xuất Excel', 'error'); return; }
        if (!currentRows.length) { show('Không có bản ghi phù hợp để xuất', 'warning'); return; }
        var data = [['Thời gian', 'Người dùng', 'Hành động', 'Chi tiết', 'IP']];
        currentRows.forEach(function (row) { data.push([row.CreatedDtText, row.Username, labels[(row.ActionType || '').toLowerCase()] || row.ActionType, row.ActionDetail, row.IpAddress]); });
        var workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(data), 'Audit Log');
        XLSX.writeFile(workbook, 'audit_log_' + new Date().toISOString().slice(0, 10) + '.xlsx');
    });
    load();
})();

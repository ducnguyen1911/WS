(function () {
    'use strict';
    var page = document.getElementById('user-admin-page');
    if (!page) return;
    var rows = [];
    var pendingLockId = null;
    var tableBody = document.getElementById('user-table-body');
    var pageMessage = document.getElementById('user-list-message');
    var userModal = document.getElementById('user-modal');
    var userForm = document.getElementById('user-form');
    var userFormMessage = document.getElementById('user-form-message');
    var resetModal = document.getElementById('reset-modal');
    var resetForm = document.getElementById('reset-form');
    var lockModal = document.getElementById('lock-modal');
    var role = document.getElementById('user-role');
    var token = page.querySelector('input[name="__RequestVerificationToken"]').value;
    var groupLabels = { main: 'Công cụ', fire: 'Cháy', engineering: 'Kỹ thuật', cargo: 'Hàng hóa', hull: 'Tàu', misc: 'Hỗn hợp' };
    var modalReturnFocus = new Map();
    var actionIcons = {
        edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" /></svg>',
        lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="11" width="18" height="10" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>',
        unlock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="11" width="18" height="10" rx="2" /><path d="M7 11V7a5 5 0 019.9-1" /></svg>',
        reset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="8" cy="15" r="4" /><path d="M11 12l9-9M18 3l3 3M15 6l3 3" /></svg>'
    };

    function escapeHtml(value) {
        var node = document.createElement('div');
        node.textContent = value == null ? '' : String(value);
        return node.innerHTML;
    }

    function show(element, text, type) {
        element.className = 'admin-alert ' + type;
        element.textContent = text;
        element.hidden = false;
    }

    function toast(text, type) {
        var container = document.getElementById('toast-container');
        var item = document.createElement('div');
        item.className = 'toast ' + (type || 'success');
        item.textContent = text;
        container.appendChild(item);
        window.setTimeout(function () { item.remove(); }, 3000);
    }

    function requestJson(url, options) {
        return fetch(url, options || { credentials: 'same-origin' }).then(function (response) { return response.json(); });
    }

    function post(url, data) {
        data.append('__RequestVerificationToken', token);
        return requestJson(url, { method: 'POST', body: data, credentials: 'same-origin' });
    }

    function permissionHtml(user) {
        if (user.RoleCode === 'ADMIN') return '<span class="permission-chip all">Tất cả</span>';
        if (!user.Permissions || !user.Permissions.length) return '<span class="no-permission">Chưa phân quyền</span>';
        return user.Permissions.map(function (code) {
            return '<span class="permission-chip ' + escapeHtml(code) + '">' + escapeHtml(groupLabels[code] || code) + '</span>';
        }).join(' ');
    }

    function actionButton(action, id, label, username) {
        return '<button type="button" class="icon-btn ' + action + '" data-action="' + action + '" data-id="' + id + '" title="' + label + '" aria-label="' + label + ' tài khoản ' + escapeHtml(username) + '">' + actionIcons[action] + '</button>';
    }

    function render(payload) {
        document.getElementById('stat-total-users').textContent = payload.totalUsers;
        document.getElementById('stat-active-users').textContent = payload.activeUsers;
        document.getElementById('stat-locked-users').textContent = payload.lockedUsers;
        rows = payload.data || [];
        if (!rows.length) {
            tableBody.innerHTML = '<tr><td colspan="9" class="empty-cell">Không có tài khoản</td></tr>';
            return;
        }
        tableBody.innerHTML = rows.map(function (user, index) {
            var isLocked = user.Status === 'LOCKED';
            var self = user.Username === page.dataset.currentUser;
            var lockButton = self ? '' : actionButton(isLocked ? 'unlock' : 'lock', user.UserId, isLocked ? 'Mở khóa' : 'Khóa', user.Username);
            return '<tr><td>' + (index + 1) + '</td><td><strong>' + escapeHtml(user.Username) + '</strong></td><td>' + escapeHtml(user.FullName) + '</td><td>' + escapeHtml(user.Email) + '</td>'
                + '<td><span class="badge ' + user.RoleCode.toLowerCase() + '">' + escapeHtml(user.RoleCode.charAt(0) + user.RoleCode.slice(1).toLowerCase()) + '</span></td>'
                + '<td>' + permissionHtml(user) + '</td><td><span class="badge ' + user.Status.toLowerCase() + '">' + (isLocked ? 'Bị khóa' : 'Hoạt động') + '</span></td>'
                + '<td>' + escapeHtml(user.LastLoginText) + '</td><td><div class="actions">' + actionButton('edit', user.UserId, 'Sửa', user.Username)
                + lockButton + actionButton('reset', user.UserId, 'Đặt lại mật khẩu', user.Username) + '</div></td></tr>';
        }).join('');
    }

    function load() {
        pageMessage.hidden = true;
        requestJson(page.dataset.listUrl, { credentials: 'same-origin' }).then(function (payload) {
            if (!payload.success) throw new Error(payload.message);
            render(payload);
        }).catch(function (exception) {
            show(pageMessage, exception.message || 'Không thể tải danh sách người dùng', 'error');
            tableBody.innerHTML = '<tr><td colspan="9" class="empty-cell">Không thể tải dữ liệu</td></tr>';
        });
    }

    function setPermissionState() {
        var admin = role.value === 'ADMIN';
        document.getElementById('permission-hint').textContent = admin ? '⚠️ Admin mặc định có toàn quyền — không thể giới hạn theo nhóm' : 'Chọn các nhóm chức năng user được phép truy cập';
        userForm.querySelectorAll('input[name="GroupCodes"]').forEach(function (checkbox) {
            if (admin) checkbox.checked = true;
            checkbox.disabled = admin;
            checkbox.parentElement.classList.toggle('disabled', admin);
        });
    }

    function openUserModal(user) {
        userForm.reset();
        userFormMessage.hidden = true;
        var editing = !!user;
        userForm.dataset.mode = editing ? 'edit' : 'add';
        document.getElementById('user-modal-title').textContent = editing ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới';
        document.getElementById('save-user-btn').textContent = editing ? 'Lưu thay đổi' : 'Thêm người dùng';
        document.getElementById('initial-password-field').hidden = editing;
        document.getElementById('user-username').disabled = editing;
        document.getElementById('user-id').value = editing ? user.UserId : '';
        document.getElementById('user-status').value = editing ? user.Status : 'ACTIVE';
        document.getElementById('user-department').value = editing ? (user.Department || '') : '';
        document.getElementById('user-username').value = editing ? user.Username : '';
        document.getElementById('user-full-name').value = editing ? user.FullName : '';
        document.getElementById('user-email').value = editing ? (user.Email || '') : '';
        role.value = editing ? user.RoleCode : 'EDITOR';
        userForm.querySelectorAll('input[name="GroupCodes"]').forEach(function (checkbox) {
            checkbox.checked = editing && user.Permissions.indexOf(checkbox.value) >= 0;
        });
        setPermissionState();
        openModal(userModal, editing ? document.getElementById('user-full-name') : document.getElementById('user-username'));
    }

    function modalFocusable(modal) {
        return Array.prototype.slice.call(modal.querySelectorAll('button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'));
    }
    function resetPasswordVisibility(modal) {
        modal.querySelectorAll('[data-password-target]').forEach(function (button) {
            var input = document.getElementById(button.dataset.passwordTarget);
            input.type = 'password'; button.setAttribute('aria-pressed', 'false'); button.setAttribute('aria-label', 'Hiện mật khẩu');
        });
    }
    function openModal(modal, initialFocus) {
        modalReturnFocus.set(modal.id, document.activeElement);
        resetPasswordVisibility(modal);
        modal.hidden = false;
        (initialFocus || modalFocusable(modal)[0] || modal).focus();
    }
    function close(id) {
        var modal = document.getElementById(id); if (!modal || modal.hidden) return;
        modal.hidden = true;
        var returnFocus = modalReturnFocus.get(id);
        if (returnFocus && returnFocus.isConnected) returnFocus.focus();
        modalReturnFocus.delete(id);
    }

    document.querySelectorAll('[data-password-target]').forEach(function (button) {
        button.addEventListener('click', function () {
            var input = document.getElementById(button.dataset.passwordTarget);
            var visible = input.type === 'text';
            input.type = visible ? 'password' : 'text';
            button.setAttribute('aria-pressed', String(!visible));
            button.setAttribute('aria-label', visible ? 'Hiện mật khẩu' : 'Ẩn mật khẩu');
            input.focus();
        });
    });
    [['user-password', 'user-password-caps'], ['reset-password', 'reset-password-caps']].forEach(function (ids) {
        var input = document.getElementById(ids[0]), hint = document.getElementById(ids[1]);
        function updateCapsLock(event) { hint.hidden = !event.getModifierState || !event.getModifierState('CapsLock'); }
        input.addEventListener('keydown', updateCapsLock); input.addEventListener('keyup', updateCapsLock);
        input.addEventListener('blur', function () { hint.hidden = true; });
    });

    document.getElementById('add-user-btn').addEventListener('click', function () { openUserModal(null); });
    role.addEventListener('change', setPermissionState);
    document.querySelectorAll('[data-close-modal]').forEach(function (button) { button.addEventListener('click', function () { close(button.dataset.closeModal); }); });

    tableBody.addEventListener('click', function (event) {
        var button = event.target.closest('button[data-action]');
        if (!button) return;
        var id = Number(button.dataset.id);
        var user = rows.filter(function (item) { return item.UserId === id; })[0];
        if (!user) return;
        if (button.dataset.action === 'edit') openUserModal(user);
        if (button.dataset.action === 'reset') {
            resetForm.reset(); document.getElementById('reset-user-id').value = id; document.getElementById('reset-modal-title').textContent = 'Đặt lại mật khẩu — ' + user.Username; document.getElementById('reset-message').hidden = true; openModal(resetModal, document.getElementById('reset-password'));
        }
        if (button.dataset.action === 'lock') {
            pendingLockId = id; document.getElementById('lock-message').textContent = 'Bạn có chắc chắn muốn khóa tài khoản ' + user.Username + '?'; openModal(lockModal, document.getElementById('confirm-lock-btn'));
        }
        if (button.dataset.action === 'unlock') {
            var data = new FormData(); data.append('userId', String(id));
            post(page.dataset.unlockUrl, data).then(handleOperation).catch(handleFailure);
        }
    });

    document.getElementById('confirm-lock-btn').addEventListener('click', function () {
        var data = new FormData(); data.append('userId', String(pendingLockId)); close('lock-modal');
        post(page.dataset.lockUrl, data).then(handleOperation).catch(handleFailure);
    });

    userForm.addEventListener('submit', function (event) {
        event.preventDefault(); userFormMessage.hidden = true;
        if (userForm.dataset.mode === 'add' && document.getElementById('user-password').value.length < 6) {
            show(userFormMessage, 'Mật khẩu ban đầu phải có ít nhất 6 ký tự', 'warning'); document.getElementById('user-password').focus(); return;
        }
        var data = new FormData(userForm);
        if (userForm.dataset.mode === 'edit') data.delete('Username');
        var url = userForm.dataset.mode === 'edit' ? page.dataset.updateUrl : page.dataset.addUrl;
        post(url, data).then(function (payload) {
            if (!payload.success) throw new Error(payload.message);
            close('user-modal'); toast(payload.message, 'success'); load();
        }).catch(function (exception) { show(userFormMessage, exception.message || 'Không thể lưu người dùng', 'error'); });
    });

    resetForm.addEventListener('submit', function (event) {
        event.preventDefault(); document.getElementById('reset-message').hidden = true;
        if (document.getElementById('reset-password').value.length < 6) {
            show(document.getElementById('reset-message'), 'Mật khẩu mới phải có ít nhất 6 ký tự', 'warning'); document.getElementById('reset-password').focus(); return;
        }
        if (!window.confirm('Xác nhận đặt lại mật khẩu cho tài khoản này?')) return;
        post(page.dataset.resetUrl, new FormData(resetForm)).then(function (payload) {
            if (!payload.success) throw new Error(payload.message);
            close('reset-modal'); toast(payload.message, 'success'); load();
        }).catch(function (exception) { show(document.getElementById('reset-message'), exception.message || 'Không thể đặt lại mật khẩu', 'error'); });
    });

    function handleOperation(payload) { if (!payload.success) throw new Error(payload.message); toast(payload.message, 'success'); load(); }
    function handleFailure(exception) { show(pageMessage, exception.message || 'Không thể thực hiện thao tác', 'error'); }
    document.addEventListener('keydown', function (event) {
        var modal = event.target.closest && event.target.closest('.admin-modal:not([hidden])');
        if (!modal) return;
        if (event.key === 'Escape') { event.preventDefault(); close(modal.id); return; }
        if (event.key !== 'Tab') return;
        var focusable = modalFocusable(modal); if (!focusable.length) return;
        var first = focusable[0], last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    document.querySelectorAll('.admin-modal').forEach(function (modal) {
        modal.addEventListener('mousedown', function (event) { if (event.target === modal) close(modal.id); });
    });
    load();
})();

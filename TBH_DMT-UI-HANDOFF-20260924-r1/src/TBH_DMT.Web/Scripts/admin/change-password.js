(function () {
    'use strict';
    var form = document.getElementById('change-password-form');
    var submit = document.getElementById('change-password-submit');
    var message = document.getElementById('password-message');
    var nextInput = document.getElementById('new-password');
    var confirmInput = document.getElementById('confirm-password');
    var matchHint = document.getElementById('password-match');
    var capsHint = document.getElementById('password-caps-lock');
    var submitLabel = submit.textContent;
    if (!form) return;

    function show(text, type) {
        message.className = 'admin-alert ' + type;
        message.textContent = text;
        message.hidden = false;
    }

    document.querySelectorAll('[data-password-target]').forEach(function (button) {
        button.addEventListener('click', function () {
            var input = document.getElementById(button.dataset.passwordTarget);
            var visible = input.type === 'text';
            input.type = visible ? 'password' : 'text';
            button.setAttribute('aria-pressed', String(!visible));
            button.setAttribute('aria-label', (visible ? 'Hiện ' : 'Ẩn ') + button.getAttribute('aria-label').replace(/^(Hiện|Ẩn)\s+/, ''));
            input.focus();
        });
    });

    function updateMatch() {
        message.hidden = true;
        var hasConfirm = Boolean(confirmInput.value);
        var matches = hasConfirm && nextInput.value === confirmInput.value;
        matchHint.textContent = !hasConfirm ? '' : matches ? 'Mật khẩu xác nhận đã khớp.' : 'Mật khẩu xác nhận không khớp.';
        matchHint.className = 'password-hint ' + (matches ? 'success' : 'error');
        confirmInput.setAttribute('aria-invalid', String(hasConfirm && !matches));
    }
    function updateCapsLock(event) { capsHint.hidden = !event.getModifierState || !event.getModifierState('CapsLock'); }
    nextInput.addEventListener('input', updateMatch); confirmInput.addEventListener('input', updateMatch);
    form.querySelectorAll('input[type="password"], input[data-password-visible]').forEach(function (input) {
        input.addEventListener('keydown', updateCapsLock); input.addEventListener('keyup', updateCapsLock);
        input.addEventListener('blur', function () { capsHint.hidden = true; });
    });

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        var current = form.elements.CurrentPassword.value;
        var next = form.elements.NewPassword.value;
        var confirm = form.elements.ConfirmPassword.value;
        message.hidden = true;

        if (!current || !next || !confirm) {
            show('Vui lòng điền đầy đủ thông tin', 'warning');
            (!current ? form.elements.CurrentPassword : !next ? nextInput : confirmInput).focus();
            return;
        }
        if (next.length < 6) { show('Mật khẩu mới phải có ít nhất 6 ký tự', 'warning'); nextInput.focus(); return; }
        if (next !== confirm) {
            matchHint.textContent = ''; // Tránh hiển thị 2 thông báo lỗi trùng lặp ở cả inline và banner
            show('Mật khẩu xác nhận không khớp', 'error');
            confirmInput.focus();
            return;
        }
        if (next === current) { show('Mật khẩu mới không được trùng mật khẩu cũ', 'warning'); return; }

        submit.disabled = true;
        submit.textContent = 'Đang đổi mật khẩu...';
        form.setAttribute('aria-busy', 'true');
        fetch(form.action, { method: 'POST', body: new FormData(form), credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' } })
            .then(function (response) {
                return response.text().then(function (text) {
                    var data = null;
                    try {
                        data = text ? JSON.parse(text) : null;
                    } catch (e) {
                        data = null;
                    }
                    if (!response.ok || !data || !data.success) {
                        var msg = (data && data.message) ? data.message : 'Không thể đổi mật khẩu. Vui lòng kiểm tra lại thông tin.';
                        throw new Error(msg);
                    }
                    return data;
                });
            })
            .then(function (payload) {
                form.reset();
                updateMatch();
                show(payload.message, 'success');
            })
            .catch(function (exception) { show(exception.message || 'Không thể đổi mật khẩu', 'error'); })
            .then(function () { submit.disabled = false; submit.textContent = submitLabel; form.removeAttribute('aria-busy'); });
    });
})();

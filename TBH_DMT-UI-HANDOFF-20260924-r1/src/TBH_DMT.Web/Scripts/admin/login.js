(function () {
    'use strict';
    var form = document.getElementById('login-form');
    var submit = document.getElementById('login-submit');
    var error = document.getElementById('login-error');
    var errorMessage = error && error.querySelector('[data-login-error-message]');
    var card = document.querySelector('.login-card');
    var password = document.getElementById('login-password');
    var capsHint = document.getElementById('login-caps-lock');
    if (!form) return;

    document.querySelector('[data-password-target="login-password"]').addEventListener('click', function () {
        var visible = password.type === 'text';
        password.type = visible ? 'password' : 'text';
        this.setAttribute('aria-pressed', String(!visible));
        this.setAttribute('aria-label', visible ? 'Hiện mật khẩu' : 'Ẩn mật khẩu');
        password.focus();
    });
    function updateCapsLock(event) { capsHint.hidden = !event.getModifierState || !event.getModifierState('CapsLock'); }
    password.addEventListener('keydown', updateCapsLock);
    password.addEventListener('keyup', updateCapsLock);
    password.addEventListener('blur', function () { capsHint.hidden = true; });

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        error.hidden = true;
        card.classList.remove('has-error');
        if (!form.elements.Username.value.trim() || !password.value) {
            errorMessage.textContent = 'Vui lòng nhập tên đăng nhập và mật khẩu';
            error.hidden = false;
            card.classList.add('has-error');
            (!form.elements.Username.value.trim() ? form.elements.Username : password).focus();
            return;
        }
        submit.disabled = true;
        form.setAttribute('aria-busy', 'true');
        submit.textContent = 'Đang đăng nhập...';

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
                        var msg = (data && data.message) ? data.message : 'Tên đăng nhập hoặc mật khẩu không chính xác';
                        throw new Error(msg);
                    }
                    return data;
                });
            })
            .then(function (payload) {
                window.location.assign(payload.redirectUrl);
            })
            .catch(function (exception) {
                errorMessage.textContent = exception.message || 'Tên đăng nhập hoặc mật khẩu không chính xác';
                error.hidden = false;
                card.classList.add('has-error');
                password.focus();
            })
            .then(function () {
                submit.disabled = false;
                form.removeAttribute('aria-busy');
                submit.textContent = 'Đăng nhập';
            });
    });
})();

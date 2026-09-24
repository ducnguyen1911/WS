(function () {
    'use strict';

    var config = window.TBH_PAID_BORDERAUX || {};
    var cttvOptions = config.cttvOptions || [];
    var selectedCttv = new Map();
    var today = new Date();

    var EXPORT_AUTO_CANCEL_SECONDS = 10 * 60;
    var currentExportJobId = null;
    var lastElapsedText = '';
    var exportElapsedTimer = window.HqdOperationTimer
        ? window.HqdOperationTimer.create(function (elapsedText, elapsedSeconds) {
            lastElapsedText = elapsedText;
            var elapsed = byId('bc-paid-export-elapsed');
            if (elapsed) { elapsed.textContent = ' (' + elapsedText + ')'; elapsed.hidden = false; }
            if (currentExportJobId && elapsedSeconds >= EXPORT_AUTO_CANCEL_SECONDS) {
                var jobId = currentExportJobId;
                currentExportJobId = null;
                cancelExport(jobId);
            }
        }, 0)
        : { start: function () { }, stop: function () { } };

    function byId(id) { return document.getElementById(id); }
    function normalize(value) { return (value || '').toLocaleLowerCase('vi-VN').trim(); }
    function pad2(value) { return value < 10 ? '0' + value : String(value); }

    var QUARTER_RANGES = { '1': ['01-01', '03-31'], '2': ['04-01', '06-30'], '3': ['07-01', '09-30'], '4': ['10-01', '12-31'] };
    function periodBounds(year, quarter) {
        if (!year) return null;
        var range = quarter ? QUARTER_RANGES[quarter] : ['01-01', '12-31'];
        return range ? { from: year + '-' + range[0], to: year + '-' + range[1] } : null;
    }

    function showToast(message, type, actionLabel, action) {
        var container = byId('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        var toast = document.createElement('div');
        toast.className = 'toast ' + (type || 'info');
        var text = document.createElement('span');
        text.textContent = message;
        toast.appendChild(text);
        if (actionLabel && typeof action === 'function') {
            var button = document.createElement('button');
            button.type = 'button';
            button.className = 'toast-action';
            button.textContent = actionLabel;
            button.addEventListener('click', function () { toast.remove(); action(); });
            toast.appendChild(button);
        }
        container.appendChild(toast);
        window.setTimeout(function () { toast.remove(); }, actionLabel ? 8000 : 3500);
    }

    function setMenuOpen(open) {
        var button = byId('bc-paid-cttv-btn');
        var menu = byId('bc-paid-cttv-drop');
        if (!button || !menu) return;
        menu.hidden = !open;
        button.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open) {
            byId('bc-paid-cttv-search').value = '';
            renderCttv('');
            byId('bc-paid-cttv-search').focus();
        }
    }

    function renderCttv(keyword) {
        var list = byId('bc-paid-cttv-list');
        if (!list) return;
        var term = normalize(keyword);
        var filtered = cttvOptions.filter(function (option) {
            return !term || normalize(option.TenCttv).indexOf(term) >= 0;
        });
        list.textContent = '';
        if (!filtered.length) {
            var empty = document.createElement('div');
            empty.className = 'bc-menu-empty';
            empty.textContent = cttvOptions.length ? 'Không tìm thấy công ty phù hợp' : 'Chưa tải được danh sách';
            list.appendChild(empty);
            return;
        }
        filtered.forEach(function (option) {
            var id = String(option.CttvId);
            var label = document.createElement('label');
            label.className = 'bc-menu-option';
            label.setAttribute('role', 'option');
            label.setAttribute('aria-selected', selectedCttv.has(id) ? 'true' : 'false');
            var checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = id;
            checkbox.checked = selectedCttv.has(id);
            checkbox.addEventListener('change', function () {
                if (checkbox.checked) selectedCttv.set(id, option.TenCttv);
                else selectedCttv.delete(id);
                label.setAttribute('aria-selected', checkbox.checked ? 'true' : 'false');
                updateCttvFeedback();
            });
            var text = document.createElement('span');
            text.textContent = option.TenCttv;
            label.appendChild(checkbox);
            label.appendChild(text);
            list.appendChild(label);
        });
    }

    function createCttvChip(id, name) {
        var chip = document.createElement('span');
        chip.className = 'bc-chip';
        var text = document.createElement('span');
        text.className = 'bc-chip-text';
        text.textContent = name;
        chip.appendChild(text);
        if (id) {
            var remove = document.createElement('button');
            remove.type = 'button';
            remove.className = 'bc-chip-remove';
            remove.setAttribute('aria-label', 'Bỏ chọn ' + name);
            remove.innerHTML = '<svg viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m2 2 6 6M8 2 2 8"/></svg>';
            remove.addEventListener('click', function () {
                selectedCttv.delete(id);
                updateCttvFeedback();
                renderCttv(byId('bc-paid-cttv-search').value);
            });
            chip.appendChild(remove);
        }
        return chip;
    }

    function updateCttvFeedback() {
        var label = byId('bc-paid-cttv-label');
        var chips = byId('bc-paid-cttv-chips');
        if (!label || !chips) return;
        var entries = Array.from(selectedCttv.entries());
        label.textContent = entries.length === 0 ? 'Tất cả CTTV' : entries.length === 1 ? entries[0][1] : 'Đã chọn ' + entries.length + ' CTTV';
        chips.textContent = '';
        if (entries.length > 0 && entries.length <= 4) {
            entries.forEach(function (entry) { chips.appendChild(createCttvChip(entry[0], entry[1])); });
        } else if (entries.length > 4) {
            chips.appendChild(createCttvChip(null, 'Đang chọn ' + entries.length + ' công ty'));
        }
    }

    function parseDateInput(displayValue) {
        var text = (displayValue || '').trim();
        if (!text) return { valid: false, empty: true, iso: '' };
        var parts = text.split('/');
        if (parts.length !== 3) return { valid: false, empty: false, iso: '' };
        var d = parseInt(parts[0], 10);
        var m = parseInt(parts[1], 10);
        var y = parseInt(parts[2], 10);
        if (isNaN(d) || isNaN(m) || isNaN(y)) return { valid: false, empty: false, iso: '' };
        if (y < 1900 || y > 9999 || m < 1 || m > 12 || d < 1) return { valid: false, empty: false, iso: '' };
        var daysInMonth = new Date(y, m, 0).getDate();
        if (d > daysInMonth) return { valid: false, empty: false, iso: '' };
        return { valid: true, empty: false, iso: y + '-' + pad2(m) + '-' + pad2(d) };
    }

    function formatDisplayDate(iso) {
        if (!iso || iso.length < 10) return '';
        var parts = iso.slice(0, 10).split('-');
        if (parts.length !== 3) return '';
        return parts[2] + '/' + parts[1] + '/' + parts[0];
    }

    function setDateValue(inputId, displayId, iso) {
        var input = byId(inputId);
        var display = byId(displayId);
        if (!input || !display) return;
        input.value = iso || '';
        display.value = formatDisplayDate(iso);
    }

    function bindDateField(inputId, displayId, errorId, onManualEdit) {
        var input = byId(inputId);
        var display = byId(displayId);
        if (!input || !display) return;

        display.addEventListener('input', function () {
            var parsed = parseDateInput(display.value);
            if (parsed.valid) {
                input.value = parsed.iso;
                display.setAttribute('aria-invalid', 'false');
                if (errorId) byId(errorId).hidden = true;
            } else if (parsed.empty) {
                input.value = '';
            } else {
                input.value = '';
                display.setAttribute('aria-invalid', 'true');
            }
            if (typeof onManualEdit === 'function') onManualEdit();
            validate(false);
        });

        display.addEventListener('blur', function () {
            var parsed = parseDateInput(display.value);
            if (parsed.valid) {
                display.value = formatDisplayDate(parsed.iso);
            }
            validate(false);
        });

        input.addEventListener('change', function () {
            setDateValue(inputId, displayId, input.value);
            if (typeof onManualEdit === 'function') onManualEdit();
            validate(false);
        });
    }

    function setDateAutoState(isAuto) {
        var fromLock = byId('bc-paid-from-lock');
        var toLock = byId('bc-paid-to-lock');
        if (fromLock) fromLock.hidden = !isAuto;
        if (toLock) toLock.hidden = !isAuto;
    }

    var relativePeriodActive = false;

    function clearAutomaticPeriod() {
        setDateAutoState(false);
        relativePeriodActive = false;
        byId('bc-paid-year').disabled = false;
        byId('bc-paid-quarter').disabled = false;
        byId('bc-paid-year').value = '';
        byId('bc-paid-quarter').value = '';
        clearPresetActive();
    }

    function clearPresetActive() {
        document.querySelectorAll('.bc-preset-chip').forEach(function (button) {
            button.classList.remove('active');
        });
        if (relativePeriodActive) {
            byId('bc-paid-year').disabled = true;
            byId('bc-paid-quarter').disabled = true;
        } else {
            byId('bc-paid-year').disabled = false;
            byId('bc-paid-quarter').disabled = false;
        }
    }

    function setPresetActive(activeButton) {
        byId('bc-paid-year').disabled = false;
        byId('bc-paid-quarter').disabled = false;
        document.querySelectorAll('.bc-preset-chip').forEach(function (button) {
            button.classList.toggle('active', button === activeButton);
        });
    }

    function applyYearQuarter(clearPreset) {
        relativePeriodActive = false;
        byId('bc-paid-year').disabled = false;
        byId('bc-paid-quarter').disabled = false;
        var year = byId('bc-paid-year').value;
        var quarter = byId('bc-paid-quarter').value;
        if (clearPreset !== false) clearPresetActive();
        var bounds = periodBounds(year, quarter);
        if (!bounds) {
            setDateValue('bc-paid-from', 'bc-paid-from-display', '');
            setDateValue('bc-paid-to', 'bc-paid-to-display', '');
            setDateAutoState(false);
            validate(false);
            return;
        }
        setDateValue('bc-paid-from', 'bc-paid-from-display', bounds.from);
        setDateValue('bc-paid-to', 'bc-paid-to-display', bounds.to);
        setDateAutoState(true);
        validate(false);
    }

    function currentQuarterOf(date) { return Math.floor(date.getMonth() / 3) + 1; }

    function applyPreset(button) {
        var preset = button.getAttribute('data-preset');
        var year = today.getFullYear();
        var quarter = null;
        if (preset === 'current-quarter' || preset === 'previous-quarter') {
            quarter = currentQuarterOf(today);
            if (preset === 'previous-quarter') {
                quarter -= 1;
                if (quarter < 1) { quarter = 4; year -= 1; }
            }
        } else if (preset === 'previous-year') {
            year -= 1;
        }
        byId('bc-paid-year').value = String(year);
        byId('bc-paid-quarter').value = quarter === null ? '' : String(quarter);
        applyYearQuarter(false);
        setPresetActive(button);
    }

    function applyRelativePreset(months, button) {
        var to = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        var from = new Date(to);
        from.setMonth(from.getMonth() - months);
        from.setDate(from.getDate() + 1);
        function iso(date) { return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate()); }
        byId('bc-paid-year').value = '';
        byId('bc-paid-quarter').value = '';
        relativePeriodActive = true;
        setDateValue('bc-paid-from', 'bc-paid-from-display', iso(from));
        setDateValue('bc-paid-to', 'bc-paid-to-display', iso(to));
        setDateAutoState(true);
        setPresetActive(button);
        validate(false);
    }

    function validateDate(inputId, displayId, errorId, required, showErrors) {
        var input = byId(inputId);
        var display = byId(displayId);
        if (!input || !display) return false;
        var hasText = Boolean(display.value.trim());
        var valid = required ? Boolean(input.value) : (!hasText || Boolean(input.value));
        display.setAttribute('aria-invalid', showErrors && !valid ? 'true' : 'false');
        if (errorId) byId(errorId).hidden = !showErrors || valid;
        return valid;
    }

    function validate(showErrors) {
        var year = byId('bc-paid-year');
        var fromValid = validateDate('bc-paid-from', 'bc-paid-from-display', 'bc-paid-from-error', true, showErrors);
        var toValid = validateDate('bc-paid-to', 'bc-paid-to-display', 'bc-paid-to-error', true, showErrors);

        // Kỳ ghi nhận bồi thường (AccountingFrom & AccountingTo) là bắt buộc
        var accFromValid = validateDate('bc-paid-accounting-from', 'bc-paid-accounting-from-display', 'bc-paid-accounting-from-error', true, showErrors);
        var accToValid = validateDate('bc-paid-accounting-to', 'bc-paid-accounting-to-display', 'bc-paid-accounting-to-error', true, showErrors);

        var yearValid = relativePeriodActive || (fromValid && toValid) || Boolean(year.value);

        var periodOrderValid = !fromValid || !toValid || byId('bc-paid-from').value <= byId('bc-paid-to').value;
        var periodSpanValid = true;
        if (periodOrderValid && byId('bc-paid-from').value && byId('bc-paid-to').value) {
            var periodSpanDays = Math.round((new Date(byId('bc-paid-to').value) - new Date(byId('bc-paid-from').value)) / 86400000);
            periodSpanValid = periodSpanDays <= 366;
        }

        // Kỳ ghi nhận bồi thường KHÔNG giới hạn độ rộng (bồi thường có thể kéo dài nhiều năm) - chỉ kiểm tra thứ tự.
        var accOrderValid = !accFromValid || !accToValid || byId('bc-paid-accounting-from').value <= byId('bc-paid-accounting-to').value;

        year.setAttribute('aria-invalid', showErrors && !yearValid ? 'true' : 'false');
        byId('bc-paid-year-error').hidden = !showErrors || yearValid;
        byId('bc-paid-quarter-error').hidden = true;

        byId('bc-paid-period-error').hidden = !showErrors || (periodOrderValid && periodSpanValid);
        if (showErrors && !periodOrderValid) {
            byId('bc-paid-period-error').textContent = 'Từ ngày không được lớn hơn Đến ngày';
        } else if (showErrors && !periodSpanValid) {
            byId('bc-paid-period-error').textContent = 'Khoảng Từ ngày/Đến ngày (Kỳ báo cáo) tối đa 1 năm';
        }

        var accRangeError = byId('bc-paid-accounting-range-error');
        if (accRangeError) {
            accRangeError.hidden = !showErrors || accOrderValid;
            if (showErrors && !accOrderValid) {
                accRangeError.textContent = 'Ngày ghi nhận bồi thường - Từ ngày không được lớn hơn Đến ngày';
            }
        }

        return yearValid && fromValid && toValid && accFromValid && accToValid &&
               periodOrderValid && periodSpanValid && accOrderValid;
    }

    function reset() {
        relativePeriodActive = false;
        byId('bc-paid-form').reset();
        byId('bc-paid-riclass').selectedIndex = 0;
        byId('bc-paid-year').disabled = false;
        byId('bc-paid-quarter').disabled = false;
        byId('bc-paid-year').selectedIndex = 0;
        byId('bc-paid-quarter').selectedIndex = 0;
        selectedCttv.clear();
        updateCttvFeedback();
        renderCttv('');
        setDateValue('bc-paid-from', 'bc-paid-from-display', '');
        setDateValue('bc-paid-to', 'bc-paid-to-display', '');
        setDateValue('bc-paid-accounting-from', 'bc-paid-accounting-from-display', '');
        setDateValue('bc-paid-accounting-to', 'bc-paid-accounting-to-display', '');
        clearPresetActive();
        setDateAutoState(false);
        validate(false);
        setMenuOpen(false);
        showToast('Đã đặt lại bộ lọc', 'info');
    }

    function setFieldsLocked(locked) {
        byId('bc-paid-form').classList.toggle('bc-form-locked', locked);
        byId('bc-paid-reset-btn').disabled = locked;
        if (locked && document.activeElement && document.activeElement.blur) document.activeElement.blur();
    }

    function setExportState(state) {
        var button = byId('bc-paid-export-btn');
        if (!button) return;
        if (!button.dataset.defaultHtml) button.dataset.defaultHtml = button.innerHTML;
        exportElapsedTimer.stop();
        button.classList.toggle('is-success', state === 'success');
        button.disabled = state === 'loading';
        setFieldsLocked(state === 'loading');
        if (state === 'loading') {
            button.innerHTML = '<span class="bc-spinner" aria-hidden="true"></span><span>Đang xuất...</span><span id="bc-paid-export-elapsed" class="bc-operation-elapsed" aria-hidden="true" hidden></span>';
            exportElapsedTimer.start();
        } else if (state === 'success') {
            button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg><span>Hoàn tất!' + (lastElapsedText ? ' (' + lastElapsedText + ')' : '') + '</span>';
        } else {
            button.innerHTML = button.dataset.defaultHtml;
        }
    }

    function antiForgeryToken() {
        var input = document.querySelector('#bc-paid-form input[name="__RequestVerificationToken"]');
        return input ? input.value : '';
    }

    function fetchJson(url, options) {
        var opts = options || {};
        var headers = opts.headers || {};
        headers['X-Requested-With'] = 'XMLHttpRequest';
        headers['Accept'] = 'application/json';
        opts.headers = headers;
        opts.credentials = opts.credentials || 'same-origin';
        return fetch(url, opts).then(function (response) {
            return response.text().then(function (text) {
                var body = null;
                try { body = text ? JSON.parse(text) : null; } catch (e) { body = null; }
                if (!response.ok || !body || !body.success) {
                    throw new Error((body && body.message) || 'Không thể tải dữ liệu từ Oracle. Vui lòng thử lại.');
                }
                return body;
            });
        });
    }

    function postForm(url, fields) {
        var data = new FormData();
        data.append('__RequestVerificationToken', antiForgeryToken());
        Object.keys(fields || {}).forEach(function (name) { data.append(name, fields[name]); });
        return fetchJson(url, { method: 'POST', body: data, credentials: 'same-origin' });
    }

    function buildStartFields() {
        var fromVal = byId('bc-paid-from').value;
        var toVal = byId('bc-paid-to').value;
        var fields = {
            Year: byId('bc-paid-year').value,
            Quarter: byId('bc-paid-quarter').value,
            AccountingFrom: byId('bc-paid-accounting-from').value,
            AccountingTo: byId('bc-paid-accounting-to').value
        };
        if (fromVal && toVal) {
            fields.DateFrom = fromVal;
            fields.DateTo = toVal;
        }
        Array.from(selectedCttv.keys()).forEach(function (id, index) { fields['CttvIds[' + index + ']'] = id; });
        return fields;
    }

    function cancelExport(jobId) {
        postForm(config.urls.cancel, { jobId: jobId }).catch(function () { });
        failExport(new Error('Đã chạy quá 10 phút, tự động dừng. Vui lòng thử lại.'));
    }

    function pollStatus(jobId) {
        fetchJson(config.urls.status + '?jobId=' + encodeURIComponent(jobId)).then(function (body) {
            if (body.state === 'Done') return downloadResult(jobId);
            if (body.state === 'Error') throw new Error(body.errorMessage || 'Không thể tải dữ liệu từ Oracle. Vui lòng thử lại.');
            if (body.state === 'Cancelled') throw new Error(body.errorMessage || 'Đã hủy xuất báo cáo.');
            if (body.state === 'TimedOut') throw new Error(body.errorMessage || 'Báo cáo đã tự dừng do chạy quá 10 phút.');
            window.setTimeout(function () { pollStatus(jobId); }, 3000);
        }).catch(failExport);
    }

    function downloadResult(jobId) {
        return fetch(config.urls.download + '?jobId=' + encodeURIComponent(jobId), { credentials: 'same-origin' })
            .then(function (response) {
                var contentType = response.headers.get('content-type') || '';
                if (response.ok && contentType.indexOf('spreadsheetml') >= 0) return response.blob();
                return response.json().catch(function () { return null; }).then(function (body) {
                    throw new Error(body && body.message ? body.message : 'Không thể tải dữ liệu từ Oracle. Vui lòng thử lại.');
                });
            })
            .then(function (blob) {
                var fileName = 'PaidBorderaux_Fire_' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '.xlsx';
                var url = URL.createObjectURL(blob);
                var link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
            })
            .then(function () {
                currentExportJobId = null;
                setExportState('success');
                showToast('Đã xuất báo cáo Paid Borderaux', 'success');
                window.setTimeout(function () { setExportState('idle'); }, 2500);
            }).catch(failExport);
    }

    function failExport(error) {
        currentExportJobId = null;
        setExportState('idle');
        showToast(error && error.message ? error.message : 'Không thể tải dữ liệu từ Oracle. Vui lòng thử lại.', 'error');
    }

    function startExport() {
        setExportState('loading');
        postForm(config.urls.start, buildStartFields()).then(function (body) {
            currentExportJobId = body.jobId;
            pollStatus(body.jobId);
        }).catch(failExport);
    }

    function resumeLatestJob() {
        if (!config.urls || !config.urls.latest) return;
        fetchJson(config.urls.latest).then(function (body) {
            if (!body.found) return;
            if (body.state === 'Pending' || body.state === 'Running') {
                currentExportJobId = body.jobId;
                setExportState('loading');
                pollStatus(body.jobId);
                return;
            }
            if (body.state !== 'Done') return;

            var finished = body.finishedAt ? new Date(body.finishedAt) : null;
            var timeText = finished && !isNaN(finished.getTime())
                ? ' lúc ' + finished.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                : '';
            showToast('Có báo cáo vừa xuất xong' + timeText + '. Bạn có thể tải lại.', 'info', 'Tải lại', function () {
                currentExportJobId = body.jobId;
                setExportState('loading');
                downloadResult(body.jobId);
            });
        }).catch(function () { });
    }

    renderCttv('');
    updateCttvFeedback();
    bindDateField('bc-paid-from', 'bc-paid-from-display', 'bc-paid-from-error', clearAutomaticPeriod);
    bindDateField('bc-paid-to', 'bc-paid-to-display', 'bc-paid-to-error', clearAutomaticPeriod);
    bindDateField('bc-paid-accounting-from', 'bc-paid-accounting-from-display', 'bc-paid-accounting-from-error');
    bindDateField('bc-paid-accounting-to', 'bc-paid-accounting-to-display', 'bc-paid-accounting-to-error');
    applyYearQuarter(false);
    resumeLatestJob();

    var cttvBtn = byId('bc-paid-cttv-btn');
    if (cttvBtn) {
        cttvBtn.addEventListener('click', function () { setMenuOpen(byId('bc-paid-cttv-drop').hidden); });
    }
    var cttvSearch = byId('bc-paid-cttv-search');
    if (cttvSearch) {
        cttvSearch.addEventListener('input', function () { renderCttv(this.value); });
    }
    document.addEventListener('click', function (event) {
        var menu = byId('bc-paid-cttv-drop');
        var button = byId('bc-paid-cttv-btn');
        if (menu && button && !menu.hidden && !menu.contains(event.target) && event.target !== button && !button.contains(event.target)) {
            setMenuOpen(false);
        }
    });

    var yearSelect = byId('bc-paid-year');
    if (yearSelect) yearSelect.addEventListener('change', function () { applyYearQuarter(true); });
    var quarterSelect = byId('bc-paid-quarter');
    if (quarterSelect) quarterSelect.addEventListener('change', function () { applyYearQuarter(true); });

    document.querySelectorAll('.bc-preset-chip').forEach(function (button) {
        button.addEventListener('click', function () {
            var preset = button.getAttribute('data-preset');
            if (preset === 'last-six-months') applyRelativePreset(6, button);
            else if (preset === 'last-twelve-months') applyRelativePreset(12, button);
            else applyPreset(button);
        });
    });

    var resetBtn = byId('bc-paid-reset-btn');
    if (resetBtn) resetBtn.addEventListener('click', reset);

    var form = byId('bc-paid-form');
    if (form) {
        form.addEventListener('submit', function (event) {
            event.preventDefault();
            if (!validate(true)) {
                showToast('Vui lòng kiểm tra lại các tham số bắt buộc trước khi xuất báo cáo', 'warning');
                return;
            }
            startExport();
        });
    }

    window.TBH_PAID_REPORT_UI = {
        setExportState: setExportState,
        validate: validate,
        parseDateInput: parseDateInput,
        formatDisplayDate: formatDisplayDate
    };
})();

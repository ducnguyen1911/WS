(function () {
    'use strict';

    // Premium Borderaux co bo tham so va interaction rieng theo UI Spec 2026-09-11. Bao cao chua co
    // endpoint xuat that, vi vay nut Xuat chi validate + thong bao trung thuc; khong gia lap file/so lieu.
    var config = window.TBH_PREMIUM_BORDERAUX || {};
    var cttvOptions = config.cttvOptions || [];
    var selectedCttv = new Map();
    var today = new Date();

    // THEM 2026-09-11 (yeu cau nguoi dung: chuan bi ha tang timer cho nut Xuat bao cao truoc, cho
    // san khi noi API xuat that - cung mau voi hqd-calc-elapsed/hqd-export-elapsed cua
    // Scripts/hieuquadon/hieuqua-calc.js). Timer CHI bat dau chay tu setExportState('loading') -
    // hien tai submit handler khong bao gio goi trang thai do (chi validate+toast), nen timer
    // khong hien gi trong giai doan nay, dung nhu thiet ke, KHONG gia lap do tre gia.
    // Timer 10 phut nay chi la lop UX phu de dung polling/cancel som o client. Deadline bat buoc nam
    // phia server (CommandTimeout 600 giay + tbh_job.deadline_dt), khong phu thuoc tab trinh duyet.
    var EXPORT_AUTO_CANCEL_SECONDS = 10 * 60;
    var currentExportJobId = null;
    // SUA 2026-09-14 (yeu cau nguoi dung: hien timer ngay tu giay dau, khong doi 60s nhu mac dinh cua
    // HqdOperationTimer - bao cao nay thuong mat vai chuc giay den vai phut nen can thay tien do som).
    // Truyen rieng revealDelayMs=0 CHI cho man nay, KHONG doi default cua operation-timer.js (Tinh hieu
    // qua van dung 60s nhu cu). lastElapsedText luu lai gia tri hien thi cuoi cung de in ra luc "Hoan tat!".
    var lastElapsedText = '';
    var exportElapsedTimer = window.HqdOperationTimer
        ? window.HqdOperationTimer.create(function (elapsedText, elapsedSeconds) {
            lastElapsedText = elapsedText;
            var elapsed = byId('bc-premium-export-elapsed');
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

    // THEM 2026-09-14 - khoang ngay dung cua 1 Quy cu the HOAC ca Nam (quarter rong), dung chung cho
    // auto-fill VA validate. year/quarter la chuoi (gia tri select). SUA 2026-09-14 (yeu cau nguoi dung,
    // sau khi co so lieu do that: 1 quy Fire ~64s, 1 nam Fire ~51s, ca hai an toan): mo rong lai ca nam
    // ben canh quy - doi ten tu quarterBounds() thanh periodBounds(), them nhanh '' = ca nam.
    var QUARTER_RANGES = { '1': ['01-01', '03-31'], '2': ['04-01', '06-30'], '3': ['07-01', '09-30'], '4': ['10-01', '12-31'] };
    function periodBounds(year, quarter) {
        if (!year) return null;
        var range = quarter ? QUARTER_RANGES[quarter] : ['01-01', '12-31'];
        return range ? { from: year + '-' + range[0], to: year + '-' + range[1] } : null;
    }

    function showToast(message, type, actionLabel, action) {
        var container = byId('toast-container');
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
        var button = byId('bc-premium-cttv-btn');
        var menu = byId('bc-premium-cttv-drop');
        menu.hidden = !open;
        button.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open) {
            byId('bc-premium-cttv-search').value = '';
            renderCttv('');
            byId('bc-premium-cttv-search').focus();
        }
    }

    function renderCttv(keyword) {
        var list = byId('bc-premium-cttv-list');
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
                renderCttv(byId('bc-premium-cttv-search').value);
            });
            chip.appendChild(remove);
        }
        return chip;
    }

    function updateCttvFeedback() {
        var label = byId('bc-premium-cttv-label');
        var chips = byId('bc-premium-cttv-chips');
        var entries = Array.from(selectedCttv.entries());
        label.textContent = entries.length === 0 ? 'Tất cả CTTV' : entries.length === 1 ? entries[0][1] : 'Đã chọn ' + entries.length + ' CTTV';
        chips.textContent = '';
        if (!entries.length) {
            chips.appendChild(createCttvChip('', 'Tất cả CTTV'));
            return;
        }
        entries.forEach(function (entry) { chips.appendChild(createCttvChip(entry[0], entry[1])); });
    }

    // Giu cung quy tac DD/MM/YYYY da QA o man Hieu qua nghiep vu tai: nhap/paste 8 so lien tu chen '/'.
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
        var day = Number(match[1]);
        var month = Number(match[2]);
        var year = Number(match[3]);
        if (year < 1900 || year > 9999 || month < 1 || month > 12 || day < 1 || day > new Date(year, month, 0).getDate()) return '';
        return String(year) + '-' + pad2(month) + '-' + pad2(day);
    }

    function setDateValue(inputId, displayId, iso) {
        var input = byId(inputId);
        var display = byId(displayId);
        input.value = iso || '';
        display.value = formatDateDMY(input.value);
        display.setAttribute('aria-invalid', 'false');
    }

    function updateDateFromDisplay(inputId, displayId, normalizeOnly) {
        var input = byId(inputId);
        var display = byId(displayId);
        var normalizedText = normalizeDateDMY(display.value);
        if (normalizedText !== display.value.trim()) display.value = normalizedText;
        input.value = parseDateDMY(normalizedText);
        if (normalizeOnly && input.value) display.value = formatDateDMY(input.value);
    }

    function bindDateField(inputId, displayId, errorId, onChanged) {
        var input = byId(inputId);
        var display = byId(displayId);
        display.addEventListener('input', function () {
            updateDateFromDisplay(inputId, displayId, false);
            display.setAttribute('aria-invalid', 'false');
            byId(errorId).hidden = true;
            if (onChanged) onChanged();
        });
        display.addEventListener('change', function () {
            updateDateFromDisplay(inputId, displayId, true);
            validate(true);
        });
        input.addEventListener('change', function () {
            var formatted = formatDateDMY(input.value);
            if (input.value && !formatted) input.value = '';
            display.value = formatted;
            display.setAttribute('aria-invalid', 'false');
            byId(errorId).hidden = true;
            if (onChanged) onChanged();
            validate(true);
        });
    }

    function clearPresetActive() {
        document.querySelectorAll('.bc-preset-chip').forEach(function (button) { button.classList.remove('active'); });
    }

    function setDateAutoState(isAutomatic) {
        byId('bc-premium-from-lock').hidden = !isAutomatic;
        byId('bc-premium-to-lock').hidden = !isAutomatic;
    }

    // THEM 2026-09-15 (PB Redesign Spec - preset "6/12 thang gan nhat"): khoang ngay tuong doi KHONG
    // khop ranh gioi Quy/Nam nen khong dung duoc periodBounds()/Nam+Quy nhu preset cu. Khi active, Nam
    // de trong (server chap nhan Nam=null NEU co DateFrom/DateTo tuong minh - xem
    // FirePremiumBrExportRequest.GetEffectiveFrom/To va StartFirePremiumBrExport). Tat ca noi doi
    // Nam/Quy (applyYearQuarter, clearAutomaticPeriod, reset) phai tat co nay lai.
    var relativePeriodActive = false;

    function clearAutomaticPeriod() {
        clearPresetActive();
        setDateAutoState(false);
        relativePeriodActive = true;
        var hasDate = Boolean(byId('bc-premium-from-display').value.trim() || byId('bc-premium-to-display').value.trim());
        byId('bc-premium-year').disabled = hasDate;
        byId('bc-premium-quarter').disabled = hasDate;
        if (hasDate) {
            byId('bc-premium-year').value = '';
            byId('bc-premium-quarter').value = '';
        } else {
            byId('bc-premium-year').disabled = false;
            byId('bc-premium-quarter').disabled = false;
        }
    }

    function setPresetActive(activeButton) {
        byId('bc-premium-year').disabled = false;
        byId('bc-premium-quarter').disabled = false;
        document.querySelectorAll('.bc-preset-chip').forEach(function (button) {
            button.classList.toggle('active', button === activeButton);
        });
    }

    function applyYearQuarter(clearPreset) {
        relativePeriodActive = false;
        byId('bc-premium-year').disabled = false;
        byId('bc-premium-quarter').disabled = false;
        var year = byId('bc-premium-year').value;
        var quarter = byId('bc-premium-quarter').value;
        if (clearPreset !== false) clearPresetActive();
        var bounds = periodBounds(year, quarter);
        if (!bounds) {
            setDateValue('bc-premium-from', 'bc-premium-from-display', '');
            setDateValue('bc-premium-to', 'bc-premium-to-display', '');
            setDateAutoState(false);
            validate(false);
            return;
        }
        setDateValue('bc-premium-from', 'bc-premium-from-display', bounds.from);
        setDateValue('bc-premium-to', 'bc-premium-to-display', bounds.to);
        setDateAutoState(true);
        validate(false);
    }

    function currentQuarterOf(date) { return Math.floor(date.getMonth() / 3) + 1; }

    // SUA 2026-09-14 (yeu cau nguoi dung: mo lai preset ca nam ben canh preset theo quy).
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
        byId('bc-premium-year').value = String(year);
        byId('bc-premium-quarter').value = quarter === null ? '' : String(quarter);
        applyYearQuarter(false);
        setPresetActive(button);
    }

    // THEM 2026-09-15 (PB Redesign Spec, muc 6 - "6 thang gan nhat"/"12 thang gan nhat"): khoang ngay
    // cuon (rolling) ket thuc hom nay, KHONG khop 1 ranh gioi Quy/Nam nao - khac han applyPreset() o tren.
    function applyRelativePreset(months, button) {
        var to = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        var from = new Date(to);
        from.setMonth(from.getMonth() - months);
        from.setDate(from.getDate() + 1);
        function iso(date) { return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate()); }
        byId('bc-premium-year').value = '';
        byId('bc-premium-quarter').value = '';
        relativePeriodActive = true;
        setDateValue('bc-premium-from', 'bc-premium-from-display', iso(from));
        setDateValue('bc-premium-to', 'bc-premium-to-display', iso(to));
        setDateAutoState(true);
        setPresetActive(button);
        validate(false);
    }

    function validateDate(inputId, displayId, errorId, required, showErrors) {
        var input = byId(inputId);
        var display = byId(displayId);
        var hasText = Boolean(display.value.trim());
        var valid = required ? Boolean(input.value) : (!hasText || Boolean(input.value));
        display.setAttribute('aria-invalid', showErrors && !valid ? 'true' : 'false');
        byId(errorId).hidden = !showErrors || valid;
        return valid;
    }

    function validate(showErrors) {
        var year = byId('bc-premium-year');
        var quarter = byId('bc-premium-quarter');
        var fromValid = validateDate('bc-premium-from', 'bc-premium-from-display', 'bc-premium-from-error', true, showErrors);
        var toValid = validateDate('bc-premium-to', 'bc-premium-to-display', 'bc-premium-to-error', true, showErrors);
        var enterFromValid = validateDate('bc-premium-enter-from', 'bc-premium-enter-from-display', 'bc-premium-enter-from-error', false, showErrors);
        var enterToValid = validateDate('bc-premium-enter-to', 'bc-premium-enter-to-display', 'bc-premium-enter-to-error', false, showErrors);

        var yearValid = relativePeriodActive || (fromValid && toValid) || Boolean(year.value);

        var periodOrderValid = !fromValid || !toValid || byId('bc-premium-from').value <= byId('bc-premium-to').value;
        var periodSpanValid = true;
        if (periodOrderValid && byId('bc-premium-from').value && byId('bc-premium-to').value) {
            var periodSpanDays = Math.round((new Date(byId('bc-premium-to').value) - new Date(byId('bc-premium-from').value)) / 86400000);
            periodSpanValid = periodSpanDays <= 366;
        }

        var enterOrderValid = !byId('bc-premium-enter-from').value || !byId('bc-premium-enter-to').value || byId('bc-premium-enter-from').value <= byId('bc-premium-enter-to').value;
        var enterSpanValid = true;
        if (enterOrderValid && byId('bc-premium-enter-from').value && byId('bc-premium-enter-to').value) {
            var enterSpanDays = Math.round((new Date(byId('bc-premium-enter-to').value) - new Date(byId('bc-premium-enter-from').value)) / 86400000);
            enterSpanValid = enterSpanDays <= 366;
        }

        year.setAttribute('aria-invalid', showErrors && !yearValid ? 'true' : 'false');
        byId('bc-premium-year-error').hidden = !showErrors || yearValid;
        byId('bc-premium-quarter-error').hidden = true;

        byId('bc-premium-period-error').hidden = !showErrors || (periodOrderValid && periodSpanValid);
        if (showErrors && !periodOrderValid) {
            byId('bc-premium-period-error').textContent = 'Từ ngày không được lớn hơn Đến ngày';
        } else if (showErrors && !periodSpanValid) {
            byId('bc-premium-period-error').textContent = 'Khoảng Từ ngày/Đến ngày (Kỳ báo cáo) tối đa 1 năm';
        }

        byId('bc-premium-enter-range-error').hidden = !showErrors || (enterOrderValid && enterSpanValid);
        if (showErrors && enterOrderValid && !enterSpanValid) {
            byId('bc-premium-enter-range-error').textContent = 'Ngày nhập đơn - Khoảng Từ ngày/Đến ngày tối đa 1 năm';
        } else {
            byId('bc-premium-enter-range-error').textContent = 'Ngày nhập đơn - Từ ngày không được lớn hơn Đến ngày';
        }
        return yearValid && fromValid && toValid && enterFromValid && enterToValid && periodOrderValid && periodSpanValid && enterOrderValid && enterSpanValid;
    }

    function reset() {
        relativePeriodActive = false;
        byId('bc-premium-form').reset();
        byId('bc-premium-riclass').selectedIndex = 0;
        byId('bc-premium-year').disabled = false;
        byId('bc-premium-quarter').disabled = false;
        byId('bc-premium-year').selectedIndex = 0;
        byId('bc-premium-quarter').selectedIndex = 0;
        selectedCttv.clear();
        updateCttvFeedback();
        renderCttv('');
        setDateValue('bc-premium-from', 'bc-premium-from-display', '');
        setDateValue('bc-premium-to', 'bc-premium-to-display', '');
        setDateValue('bc-premium-enter-from', 'bc-premium-enter-from-display', '');
        setDateValue('bc-premium-enter-to', 'bc-premium-enter-to-display', '');
        clearPresetActive();
        setDateAutoState(false);
        validate(false);
        setMenuOpen(false);
        showToast('Đã đặt lại bộ lọc', 'info');
    }

    // SUA 2026-09-14 (yeu cau nguoi dung: "cac item/textbox chua duoc lam mo va chuyen sang read only" khi
    // dang xuat) - khoa toan bo cac truong tham so (khong chi nut) trong luc job dang chay, tranh nguoi dung
    // tuong nham co the doi tham so giua chung (gia tri thuc te da duoc doc vao buildStartFields() truoc do
    // roi, khoa lai chi de dung UX, khong anh huong toi request da gui).
    function setFieldsLocked(locked) {
        byId('bc-premium-form').classList.toggle('bc-form-locked', locked);
        byId('bc-premium-reset-btn').disabled = locked;
        if (locked && document.activeElement && document.activeElement.blur) document.activeElement.blur();
    }

    function setExportState(state) {
        var button = byId('bc-premium-export-btn');
        if (!button.dataset.defaultHtml) button.dataset.defaultHtml = button.innerHTML;
        exportElapsedTimer.stop();
        button.classList.toggle('is-success', state === 'success');
        button.disabled = state === 'loading';
        setFieldsLocked(state === 'loading');
        if (state === 'loading') button.innerHTML = '<span class="bc-spinner" aria-hidden="true"></span><span>Đang xuất...</span><span id="bc-premium-export-elapsed" class="bc-operation-elapsed" aria-hidden="true" hidden></span>';
        else if (state === 'success') button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg><span>Hoàn tất!' + (lastElapsedText ? ' (' + lastElapsedText + ')' : '') + '</span>';
        else button.innerHTML = button.dataset.defaultHtml;
        if (state === 'loading') exportElapsedTimer.start();
    }

    // ========================================================================
    // THEM 2026-09-14 - noi that voi KOUKIA.PCK_TBH_REPORT.PRC_FIRE_PREMIUM_BR (xem AI_HANDOFF.md).
    // Mirror dung luong job-nen + poll + huy that + xuat Excel cua man Hieu qua nghiep vu tai
    // (Scripts/hieuquadon/hieuqua-calc.js) NHUNG goi endpoint/registry rieng cua Premium Borderaux -
    // khong dung chung du lieu/job voi Tinh hieu qua (yeu cau nguoi dung).
    // ========================================================================
    function antiForgeryToken() {
        var input = document.querySelector('#bc-premium-form input[name="__RequestVerificationToken"]');
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
        var fromVal = byId('bc-premium-from').value;
        var toVal = byId('bc-premium-to').value;
        var fields = {
            Year: byId('bc-premium-year').value,
            Quarter: byId('bc-premium-quarter').value,
            EnterDateFrom: byId('bc-premium-enter-from').value,
            EnterDateTo: byId('bc-premium-enter-to').value
        };
        if (fromVal && toVal) {
            fields.DateFrom = fromVal;
            fields.DateTo = toVal;
        }
        Array.from(selectedCttv.keys()).forEach(function (id, index) { fields['CttvIds[' + index + ']'] = id; });
        return fields;
    }

    // SUA 2026-09-14 (yeu cau nguoi dung: bo nut "Huy" thu cong - da co quy tac tu dong huy sau 10
    // phut o tren, khong can nut bam rieng nua). cancelExport() gio CHI con duoc goi tu auto-cancel.
    function cancelExport(jobId) {
        postForm(config.urls.cancel, { jobId: jobId }).catch(function () { });
        failExport(new Error('Đã chạy quá 10 phút, tự động dừng. Vui lòng thử lại (báo cáo chỉ chạy theo 1 quý nên bình thường sẽ nhanh hơn nhiều).'));
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

    // SUA 2026-09-14 (yeu cau nguoi dung, phat hien khi do hieu nang qua nam 2017 - 22.859 dong): bo han
    // buoc client dung workbook (SheetJS) + upload nguoc len server nen lai - khong mo rong duoc cho bao
    // cao 108 cot x hang chuc nghin dong (JSON ~139s, file tho vuot gioi han upload => 413). Gio server
    // tu doc Oracle VA sinh .xlsx that (NPOI streaming), tra thang qua 1 GET - client chi tai ve.
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
                var fileName = 'PremiumBorderaux_Fire_' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '.xlsx';
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
                showToast('Đã xuất báo cáo Premium Borderaux', 'success');
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
        if (!config.urls.latest) return;
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
    bindDateField('bc-premium-from', 'bc-premium-from-display', 'bc-premium-from-error', clearAutomaticPeriod);
    bindDateField('bc-premium-to', 'bc-premium-to-display', 'bc-premium-to-error', clearAutomaticPeriod);
    bindDateField('bc-premium-enter-from', 'bc-premium-enter-from-display', 'bc-premium-enter-from-error');
    bindDateField('bc-premium-enter-to', 'bc-premium-enter-to-display', 'bc-premium-enter-to-error');
    applyYearQuarter(false);
    resumeLatestJob();

    byId('bc-premium-cttv-btn').addEventListener('click', function () { setMenuOpen(byId('bc-premium-cttv-drop').hidden); });
    byId('bc-premium-cttv-search').addEventListener('input', function () { renderCttv(this.value); });
    document.addEventListener('click', function (event) {
        var menu = byId('bc-premium-cttv-drop');
        var button = byId('bc-premium-cttv-btn');
        if (!menu.hidden && !menu.contains(event.target) && event.target !== button && !button.contains(event.target)) setMenuOpen(false);
    });
    byId('bc-premium-year').addEventListener('change', function () { applyYearQuarter(true); });
    byId('bc-premium-quarter').addEventListener('change', function () { applyYearQuarter(true); });
    document.querySelectorAll('.bc-preset-chip').forEach(function (button) {
        button.addEventListener('click', function () {
            var preset = button.getAttribute('data-preset');
            if (preset === 'last-six-months') applyRelativePreset(6, button);
            else if (preset === 'last-twelve-months') applyRelativePreset(12, button);
            else applyPreset(button);
        });
    });
    byId('bc-premium-reset-btn').addEventListener('click', reset);
    byId('bc-premium-form').addEventListener('submit', function (event) {
        event.preventDefault();
        if (!validate(true)) {
            showToast('Vui lòng kiểm tra lại các tham số bắt buộc trước khi xuất báo cáo', 'warning');
            return;
        }
        startExport();
    });

    window.TBH_PREMIUM_REPORT_UI = { setExportState: setExportState };
})();

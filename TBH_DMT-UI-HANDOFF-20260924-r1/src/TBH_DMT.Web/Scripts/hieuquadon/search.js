(function () {
    'use strict';

    var config = window.TBH_POLICY_SEARCH || {};
    var cttvOptions = config.cttvOptions || [];
    var industryByClass = {
        Fire: config.nganhNgheFireOptions || [],
        Engineering: config.nganhNgheEngineeringOptions || []
    };
    var selectedCttv = new Map();
    var selectedIndustry = '';
    var currentPage = 1;
    var pageSize = 10;
    var totalCount = 0;
    var isLoading = false;
    var currentRows = [];
    var searchElapsedTimer = window.HqdOperationTimer
        ? window.HqdOperationTimer.create(function (elapsedText) {
            var elapsed = byId('hqd-search-elapsed');
            if (!elapsed) return;
            elapsed.textContent = ' (' + elapsedText + ')';
            elapsed.hidden = false;
        })
        : { start: function () { }, stop: function () { } };

    function byId(id) { return document.getElementById(id); }
    function policyKey(row) {
        var pkCovId = row.PkCovId === null || row.PkCovId === undefined ? '' : String(row.PkCovId);
        return (row.SoDon || '') + '|' + (row.InceptionDate || '') + '|' + pkCovId;
    }
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

    function updateSelectionSummary() {
        var summary = byId('hqd-selection-summary');
        var selectedOnPage = document.querySelectorAll('#hqd-search-body .hqd-cb:checked').length;
        var allFiltered = byId('hqd-checkall').checked && totalCount > 0;
        if (allFiltered) {
            summary.textContent = 'Đã chọn toàn bộ ' + totalCount + ' kết quả theo bộ lọc hiện tại. Thao tác Tính toán sẽ áp dụng cho toàn bộ tập này, không chỉ trang đang xem.';
            summary.className = 'selection-summary all-selected';
            summary.hidden = false;
        } else if (selectedOnPage > 0) {
            summary.textContent = 'Đã chọn ' + selectedOnPage + ' đơn trên trang hiện tại.';
            summary.className = 'selection-summary';
            summary.hidden = false;
        } else {
            summary.textContent = '';
            summary.className = 'selection-summary';
            summary.hidden = true;
        }
    }

    function renderCttv(keyword) {
        var list = byId('hqd-cttv-list');
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
                updateRangeHint();
                validate();
            });
            var text = document.createElement('span');
            text.textContent = option.TenCttv;
            label.appendChild(checkbox); label.appendChild(text); list.appendChild(label);
        });
    }

    function updateCttvLabel() {
        var label = byId('hqd-cttv-label');
        var names = Array.from(selectedCttv.values());
        label.textContent = names.length === 0 ? '-- Tất cả CTTV --' : names.length === 1 ? names[0] : 'Đã chọn ' + names.length + ' CTTV';
    }

    function currentIndustryOptions() {
        return industryByClass[byId('hqd-riclass').value] || [];
    }

    function renderIndustry(keyword) {
        var list = byId('hqd-nganh-list');
        var term = normalize(keyword);
        var filtered = currentIndustryOptions().filter(function (option) {
            return !term || normalize(option.TenNganhNghe).indexOf(term) >= 0;
        });
        list.textContent = '';
        var all = document.createElement('button');
        all.type = 'button'; all.className = 'menu-option'; all.textContent = '-- Tất cả ngành nghề --';
        all.addEventListener('click', function () { selectIndustry(''); });
        list.appendChild(all);
        filtered.forEach(function (option) {
            var button = document.createElement('button');
            button.type = 'button'; button.className = 'menu-option'; button.textContent = option.TenNganhNghe;
            button.addEventListener('click', function () { selectIndustry(option.TenNganhNghe); });
            list.appendChild(button);
        });
        if (!filtered.length && currentIndustryOptions().length === 0) {
            all.textContent = 'Chưa tải được danh sách';
        }
    }

    function selectIndustry(value) {
        selectedIndustry = value || '';
        byId('hqd-nganh').value = selectedIndustry;
        byId('hqd-nganh-label').textContent = selectedIndustry || '-- Tất cả ngành nghề --';
        setMenuOpen(byId('hqd-nganh-btn'), byId('hqd-nganh-drop'), false);
    }

    // Cat/Nganh nghe chi co nghia khi da chon Fire/Engineering VA khong tim theo So don (yeu cau nguoi dung
    // 2026-09-19: khoa cung Nghiep vu khi co So don). Chi cap nhat TRANG THAI, khong xoa gia tri da chon -
    // xoa So don xong nguoi dung con lai dung lua chon cu (effectiveFilters() bo qua chung khi dang khoa).
    function updateLobFilterState() {
        var value = byId('hqd-riclass').value;
        var hasSoDon = Boolean(byId('hqd-sodon').value.trim());
        var enabled = (value === 'Fire' || value === 'Engineering') && !hasSoDon;
        byId('hqd-cat').disabled = !enabled;
        byId('hqd-nganh-btn').disabled = !enabled;
        byId('hqd-cat-wrap').classList.toggle('disabled-field', !enabled);
        byId('hqd-nganh-wrap').classList.toggle('disabled-field', !enabled);
        if (!enabled) setMenuOpen(byId('hqd-nganh-btn'), byId('hqd-nganh-drop'), false);
    }

    function toggleLobFilters() {
        updateLobFilterState();
        byId('hqd-cat').value = '';
        selectIndustry('');
        renderIndustry('');
    }

    // SUA 2026-09-10 (anh production cua nguoi dung: lop text DD/MM/YYYY cua r16 che input[type=date]
    // nhung ban phim van bi Chrome xu ly theo locale, tao ra nam 0003). O text la noi nhap/hien thi
    // DD/MM/YYYY THAT; input date hep ben phai chi lam nut lich + giu gia tri ISO gui server.
    function formatDateDMY(iso) {
        if (!iso) return '';
        var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
        if (!match || Number(match[1]) < 1900) return '';
        return match[3] + '/' + match[2] + '/' + match[1];
    }
    function normalizeDateDMY(text) {
        // Cho phep go/paste lien 8 chu so (DDMMYYYY), tu chen dau / ngay khi du ky tu.
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
    function updateDateFromDisplay(inputId, displayId, normalize) {
        var input = byId(inputId); var display = byId(displayId);
        var normalizedText = normalizeDateDMY(display.value);
        if (normalizedText !== display.value.trim()) display.value = normalizedText;
        input.value = parseDateDMY(normalizedText);
        if (normalize && input.value) display.value = formatDateDMY(input.value);
    }
    function bindDateField(inputId, displayId) {
        var input = byId(inputId); var display = byId(displayId);
        display.addEventListener('input', function () {
            updateDateFromDisplay(inputId, displayId, false);
            display.setAttribute('aria-invalid', 'false');
            if (displayId === 'hqd-from-display') byId('hqd-from-error').hidden = true;
            byId('hqd-range-error').hidden = true;
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

    function pad2(value) { return Number(value) < 10 ? '0' + Number(value) : String(value); }
    function toIsoDate(date) { return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate()); }

    function applyYearQuarter() {
        var year = byId('hqd-year').value;
        var quarter = byId('hqd-quarter').value;
        var quarterEl = byId('hqd-quarter');
        if (!year) {
            quarterEl.disabled = true;
            quarterEl.value = '';
            setDateDisabled('hqd-from', 'hqd-from-display', false);
            setDateDisabled('hqd-to', 'hqd-to-display', false);
            validate();
            return;
        }
        quarterEl.disabled = false;
        var quarters = { '1': ['01-01', '03-31'], '2': ['04-01', '06-30'], '3': ['07-01', '09-30'], '4': ['10-01', '12-31'] };
        var dates = quarter ? quarters[quarter] : ['01-01', '12-31'];
        setDateValue('hqd-from', 'hqd-from-display', year + '-' + dates[0]);
        setDateValue('hqd-to', 'hqd-to-display', year + '-' + dates[1]);
        setDateDisabled('hqd-from', 'hqd-from-display', true);
        setDateDisabled('hqd-to', 'hqd-to-display', true);
        // Gan ngay bang code khong phat sinh su kien input/change nen loi do "Vui long chon Tu ngay" cua lan
        // Tim kiem truoc (hasSubmitted) se bi treo du o da co gia tri - lam moi trang thai bao loi tai day.
        validate();
    }

    // SUA 2026-09-04 (yeu cau nguoi dung: "bat buoc chon 1 Nghiep vu" + "khoang ngay tim kiem toi da 1
    // nam thay vi quy" - xem [[project_ft002_quy_gioi_han_tam_thoi]]): buoc Tim kiem TRUOC DAY khong gioi
    // han khoang ngay gi ca (chi co o buoc Tinh toan qua hieuqua-calc.js isWithinAllowedRange) va Nghiep vu
    // la tuy chon ("-- Tat ca --"). Them ca 2 kiem tra ngay tai buoc Tim kiem, dung cung logic clamp ngay
    // cuoi thang voi maxYearEnd/maxQuarterEnd o hieuqua-calc.js/IsWithinAllowedRange o server.
    function maxYearEnd(fromText) {
        var parts = fromText.split('-').map(Number);
        var targetYear = parts[0] + 1;
        var targetMonth = parts[1] - 1;
        var lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
        var sameDayOneYearLater = new Date(targetYear, targetMonth, Math.min(parts[2], lastDay));
        sameDayOneYearLater.setDate(sameDayOneYearLater.getDate() - 1);
        return sameDayOneYearLater;
    }

    // THEM 2026-09-04 (yeu cau nguoi dung sau khi xem so lieu THAT do tren TG22_KRDB: Cargo 1 nam 2017 =
    // 95.952 dong/~9,2 phut, cham hon han Fire cung nam ~60s - xem [[project_ft002_quy_gioi_han_tam_thoi]]):
    // rieng Cargo van gioi han 1 quy nhu cu, cac Nghiep vu khac duoc 1 nam. Khop dung
    // HieuQuaDonController.IsAtMostOneQuarter/IsWithinAllowedRange o server.
    function maxQuarterEnd(fromText) {
        var parts = fromText.split('-').map(Number);
        var targetMonth = parts[1] - 1 + 3;
        var targetYear = parts[0] + Math.floor(targetMonth / 12);
        targetMonth %= 12;
        var lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
        var sameDayThreeMonthsLater = new Date(targetYear, targetMonth, Math.min(parts[2], lastDay));
        sameDayThreeMonthsLater.setDate(sameDayThreeMonthsLater.getDate() - 1);
        return sameDayThreeMonthsLater;
    }

    // SUA 2026-09-05 (yeu cau nguoi dung: do THAT Cargo 1 nam + loc dung 1 CTTV tren TG22_KRDB, tu ~9,2 phut
    // (khong loc) xuong ~100 giay - xem [[project_ft002_quy_gioi_han_tam_thoi]]). Cargo duoc phep 1 nam CHI
    // KHI chon dung 1 CTTV cu the (khong phai "Tat ca"/nhieu CTTV cung luc) - khop dung
    // HieuQuaDonController.IsWithinAllowedRange o server.
    function isWithinAllowedRange(riClass, fromText, toText) {
        if (!toText) return true;
        var from = new Date(fromText + 'T00:00:00');
        var to = new Date(toText + 'T00:00:00');
        var cargoOneYearAllowed = riClass === 'Cargo' && selectedCttv.size === 1;
        var maxEnd = (riClass === 'Cargo' && !cargoOneYearAllowed) ? maxQuarterEnd(fromText) : maxYearEnd(fromText);
        return to >= from && to <= maxEnd;
    }

    function rangeErrorText(riClass) {
        if (riClass !== 'Cargo') return 'Vui lòng thu hẹp khoảng ngày về tối đa 1 năm';
        return selectedCttv.size === 1
            ? 'Vui lòng thu hẹp khoảng ngày về tối đa 1 năm'
            : 'Cargo: vui lòng chọn đúng 1 Công ty thành viên để xem tối đa 1 năm, hoặc thu hẹp khoảng ngày về tối đa 1 quý';
    }

    function updateRangeHint() {
        var riClass = byId('hqd-riclass').value;
        var hint = byId('hqd-range-hint');
        if (riClass !== 'Cargo') {
            hint.textContent = 'Khoảng tìm kiếm tối đa 1 năm.';
        } else if (selectedCttv.size === 1) {
            hint.textContent = 'Cargo với đúng 1 CTTV: khoảng tìm kiếm tối đa 1 năm.';
        } else {
            hint.textContent = 'Cargo: khoảng tìm kiếm tối đa 1 quý; chọn đúng 1 CTTV để được tìm tối đa 1 năm.';
        }
    }

    // SUA 2026-09-08 (yeu cau nguoi dung: "nhap So don thi khong bat buoc Nghiep vu, vi ban
    // than So don la du", mo rong tiep thanh "tim theo So don khong can rang buoc gi ve Thoi
    // gian, nghiep vu..."). Co So don => KHONG con rang buoc nao (Nghiep vu/Tu ngay/gioi han
    // khoang ngay toi da 1 nam) - 1 So don cu the da du xac dinh pham vi tim. Khong co So don
    // => giu NGUYEN VEN toan bo rang buoc cu. Cap nhat dong bo ca required/dau * hien thi
    // (khong chi validate() ngam) de dung truc quan + aria cho ca 2 truong Nghiep vu/Tu ngay.
    var hasSubmitted = false;

    // SUA 2026-09-08 (yeu cau nguoi dung: "nhap So don thi khong bat buoc Nghiep vu, vi ban
    // than So don la du", mo rong tiep thanh "tim theo So don khong can rang buoc gi ve Thoi
    // gian, nghiep vu..."). Co So don => KHONG con rang buoc nao (Nghiep vu/Tu ngay/gioi han
    // khoang ngay toi da 1 nam) - 1 So don cu the da du xac dinh pham vi tim. Khong co So don
    // => giu NGUYEN VEN toan bo rang buoc cu. Cap nhat dong bo ca required/dau * hien thi
    // (khong chi validate() ngam) de dung truc quan + aria cho ca 2 truong Nghiep vu/Tu ngay.
    function validate(showErrors) {
        if (showErrors === undefined) showErrors = hasSubmitted;
        var soDon = byId('hqd-sodon').value.trim();
        var hasSoDon = Boolean(soDon);

        // Tester yêu cầu: Nhập Số đơn cần disable dropdown Nghiệp vụ; xóa Số đơn enable lại
        var riClassEl = byId('hqd-riclass');
        riClassEl.disabled = hasSoDon;
        updateLobFilterState();

        var fromEl = byId('hqd-from'); var fromDisplay = byId('hqd-from-display');
        var fromValue = fromEl.value;
        var fromRequired = !hasSoDon;
        var fromHasText = Boolean(fromDisplay.value.trim());
        var fromFormatValid = !fromHasText || Boolean(fromValue);
        var fromValid = fromFormatValid && (Boolean(fromValue) || hasSoDon);
        byId('hqd-from-error').textContent = fromHasText && !fromFormatValid
            ? 'Từ ngày không hợp lệ, nhập theo DD/MM/YYYY'
            : 'Vui lòng chọn Từ ngày hiệu lực';
        byId('hqd-from-error').hidden = !showErrors || fromValid;
        fromDisplay.setAttribute('aria-invalid', (showErrors && !fromValid) ? 'true' : 'false');
        fromDisplay.toggleAttribute('required', fromRequired);
        var fromMark = byId('hqd-from-required-mark');
        if (fromMark) fromMark.hidden = !fromRequired;

        var riClass = riClassEl.value;
        var riClassRequired = !hasSoDon;
        var riClassValid = Boolean(riClass) || hasSoDon;
        byId('hqd-riclass-error').hidden = !showErrors || riClassValid;
        riClassEl.setAttribute('aria-invalid', (showErrors && !riClassValid) ? 'true' : 'false');
        riClassEl.toggleAttribute('required', riClassRequired);
        var riClassMark = byId('hqd-riclass-required-mark');
        if (riClassMark) riClassMark.hidden = !riClassRequired;

        var toEl = byId('hqd-to'); var toDisplay = byId('hqd-to-display');
        var toHasText = Boolean(toDisplay.value.trim());
        var toFormatValid = !toHasText || Boolean(toEl.value);
        toDisplay.setAttribute('aria-invalid', (showErrors && !toFormatValid) ? 'true' : 'false');
        var rangeValid = toFormatValid && (hasSoDon || !Boolean(fromValue) || isWithinAllowedRange(riClass, fromValue, toEl.value));
        var rangeErrorEl = byId('hqd-range-error');
        rangeErrorEl.textContent = toFormatValid ? rangeErrorText(riClass) : 'Đến ngày không hợp lệ, nhập theo DD/MM/YYYY';
        rangeErrorEl.hidden = !showErrors || rangeValid;

        return fromValid && riClassValid && toFormatValid && rangeValid;
    }

    function append(formData, name, value) {
        if (value !== null && value !== undefined && value !== '') formData.append(name, value);
    }

    // QA-01 2026-09-19 (Codex QA Loi_180926 - Loi 7): validate() chi disable dropdown Nghiep vu khi co So
    // don, gia tri da chon truoc do (VD Fire) van nam trong DOM nen truoc day van bi gui kem SoDon =>
    // p_ri_class loc mat don thuoc nghiep vu khac. Khi co So don, BO QUA cac bo loc phu thuoc Nghiep vu
    // (RiClass/Cat/NganhNghe) luc tao request thay vi xoa UI state, de xoa So don xong nguoi dung con lai
    // dung lua chon cu. Dung chung cho request Tim kiem va state gui sang buoc Tinh toan (hqdGetSearchState).
    function effectiveFilters() {
        var hasSoDon = Boolean(byId('hqd-sodon').value.trim());
        return {
            riClass: hasSoDon ? '' : byId('hqd-riclass').value,
            cat: hasSoDon || byId('hqd-cat').disabled ? '' : byId('hqd-cat').value,
            nganhNghe: hasSoDon || byId('hqd-nganh-btn').disabled ? '' : selectedIndustry
        };
    }

    function buildFormData() {
        var data = new FormData();
        var filters = effectiveFilters();
        data.append('__RequestVerificationToken', document.querySelector('input[name="__RequestVerificationToken"]').value);
        append(data, 'SoDon', byId('hqd-sodon').value.trim());
        append(data, 'NgayHieuLucFrom', byId('hqd-from').value);
        append(data, 'NgayHieuLucTo', byId('hqd-to').value);
        append(data, 'RiClass', filters.riClass);
        append(data, 'Cat', filters.cat);
        append(data, 'NganhNghe', filters.nganhNghe);
        selectedCttv.forEach(function (_, id) { data.append('CttvIds', id); });
        data.append('PageNumber', String(currentPage)); data.append('PageSize', String(pageSize));
        return data;
    }

    function setLoading(loading) {
        isLoading = loading;
        byId('hqd-search-btn').disabled = loading;
        byId('hqd-search-params').classList.toggle('is-loading', loading);
        byId('hqd-search-wrap').hidden = false;
        if (loading) {
            searchElapsedTimer.stop();
            byId('hqd-search-body').textContent = '';
            byId('hqd-search-empty').hidden = false;
            byId('hqd-search-empty').innerHTML = '<span class="spinner" aria-hidden="true"></span> Đang tìm kiếm...<span id="hqd-search-elapsed" class="hqd-operation-elapsed" aria-hidden="true" hidden></span>';
            searchElapsedTimer.start();
            byId('hqd-pagination-wrap').hidden = true;
        } else {
            searchElapsedTimer.stop();
        }
    }

    // SUA 2026-09-08 (PAGED_RESULT_PLAN.md, duyet boi nguoi dung): them tham so preserveCalculation -
    // phan biet "tim kiem MOI/loc lai" (submit form, phai RESET ket qua tinh hieu qua dang co) voi
    // "doi trang/doi page size CUNG 1 bo loc" (phai GIU NGUYEN job/cache dang tinh, chi hydrate them
    // du lieu cho cac dong CHUA co trong cache - xem hieuqua-calc.js hqdCalcRowsRendered). Submit form
    // moi truyen false; nut doi trang/doi page-size truyen true.
    function search(page, preserveCalculation) {
        hasSubmitted = true;
        var fromVal = byId('hqd-from').value;
        var toVal = byId('hqd-to').value;
        var soDon = byId('hqd-sodon').value.trim();
        // Tester yêu cầu: hỗ trợ mặc định Đến ngày = ngày hiện tại nếu bỏ trống
        if (!soDon && fromVal && !toVal) {
            var todayIso = toIsoDate(new Date());
            // QA-06 2026-09-19: Tu ngay o tuong lai => Den ngay = cuoi khoang 1 nam, tinh bang CUNG ham
            // maxYearEnd voi validate() (clamp ngay cuoi thang, vd 29/02/2028 -> 27/02/2029) va khop
            // HieuQuaDonController.MaxYearEnd; cach cu setFullYear(+1) tran sang 01/03 nen ra 28/02/2029 va
            // bi server tu choi.
            setDateValue('hqd-to', 'hqd-to-display', fromVal <= todayIso ? todayIso : toIsoDate(maxYearEnd(fromVal)));
        }

        if (isLoading || !validate(true)) return;
        currentPage = page || 1;
        setLoading(true);
        fetch(byId('policy-search-form').action, {
            method: 'POST',
            body: buildFormData(),
            credentials: 'same-origin',
            headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' }
        })
        .then(function (response) {
            return response.text().then(function (text) {
                var body = null;
                try { body = text ? JSON.parse(text) : null; } catch (e) { body = null; }
                if (!response.ok || !body || !body.success) {
                    throw new Error((body && body.message) || 'Không thể tải dữ liệu từ Oracle. Vui lòng thử lại.');
                }
                return body;
            });
        })
        .then(function (body) {
            totalCount = body.totalCount || 0;
            currentPage = body.pageNumber; pageSize = body.pageSize;
            renderRows(body.data || [], preserveCalculation); renderPagination();
        })
        .catch(function (error) {
            renderRows([], false); showToast(error.message || 'Không thể tải dữ liệu từ Oracle. Vui lòng thử lại.', 'error');
        })
        .then(function () { setLoading(false); });
    }

    function textCell(row, value, className) {
        var cell = document.createElement('td');
        if (className) cell.className = className;
        cell.textContent = value === null || value === undefined || value === '' ? '—' : value;
        row.appendChild(cell); return cell;
    }

    function renderRows(rows, preserveCalculation) {
        var body = byId('hqd-search-body'); var empty = byId('hqd-search-empty'); body.textContent = '';
        currentRows = rows.slice();
        // SUA 2026-09-08: "Chon tat ca" (hqd-checkall) CHI reset ve khong tich khi day la tim kiem
        // MOI/loc lai (preserveCalculation=false) - khi doi trang/page-size CUNG 1 bo loc, phai GIU
        // NGUYEN trang thai (neu dang o che do "chon tat ca", cac trang sau van phai hien la da chon).
        if (!preserveCalculation) byId('hqd-checkall').checked = false;
        // SUA 2026-09-08 (PAGED_RESULT_PLAN.md): goi hqdCalcRowsRendered SAU KHI da dung <tr> vao DOM
        // (chuyen xuong cuoi ham) - hydrateCurrentPage() ben hieuqua-calc.js can doc lai NGAY cac <tr>
        // nay (querySelectorAll('#hqd-search-body tr')) de hien du lieu CACHE ngay lap tuc khong doi
        // fetch; goi truoc khi <tr> ton tai (nhu ban cu, luc CHUA co logic hydrate dong bo) se lam lan
        // render dau tien khong khop duoc dong nao, va neu khong co fetch nao xay ra sau do (trang da
        // co san trong cache) thi KHONG CON lan render thu 2 nao de sua lai - ket qua bi "kim" trang.
        if (!rows.length) {
            empty.textContent = 'Không tìm thấy đơn phát sinh phù hợp'; empty.hidden = false;
            if (typeof window.hqdCalcRowsRendered === 'function') window.hqdCalcRowsRendered(currentRows, { preserveCalculation: Boolean(preserveCalculation) });
            updateSelectionSummary(); return;
        }
        empty.hidden = true;
        rows.forEach(function (item) {
            var row = document.createElement('tr');
            row.dataset.policyKey = policyKey(item);
            var checkCell = document.createElement('td'); checkCell.className = 'center';
            var checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.className = 'hqd-cb';
            checkbox.dataset.policyKey = row.dataset.policyKey;
            // SUA 2026-09-08: khi giu nguyen tinh toan (doi trang/page-size) VA dang o che do "chon tat
            // ca", danh dau san cac checkbox dong cua TRANG MOI la da chon - dung truc quan voi
            // hqd-checkall dang tich, tranh hieu lam "trang nay chua chon gi".
            checkbox.checked = Boolean(preserveCalculation) && byId('hqd-checkall').checked;
            // THEM 2026-09-04: bo tich 1 dong cu the trong luc dang o che do "chon tat ca" => ha ve che do
            // chon rieng le (khong con la "toan bo"), dong bo lai checkbox tong cho dung truc quan.
            checkbox.addEventListener('change', function () {
                if (!checkbox.checked && typeof window.hqdSetSelectAllMode === 'function') {
                    window.hqdSetSelectAllMode(false);
                    byId('hqd-checkall').checked = false;
                }
                updateSelectionSummary();
            });
            checkCell.appendChild(checkbox); row.appendChild(checkCell);
            textCell(row, item.SoDon, 'policy-number'); textCell(row, item.NgayHieuLuc); textCell(row, item.NhomNghiepVu); textCell(row, item.TenSanPhamGoc);
            var statusCell = document.createElement('td'); statusCell.className = 'center';
            var status = document.createElement('span'); status.className = 'status-pill' + (item.TrangThaiRutGon === 'NB' ? ' nb' : ''); status.textContent = item.TrangThaiRutGon || '';
            statusCell.appendChild(status); row.appendChild(statusCell);
            ['premium', 'tyLeDong', 'phiDBH', 'phiNhuong', 'phiGiuLai', 'btGoc', 'btGiuLai', 'tongThuDoi', 'rip', 'eff'].forEach(function (column) {
                var cell = textCell(row, '—', 'right placeholder'); cell.dataset.col = column;
            });
            textCell(row, item.Cat); textCell(row, item.NganhNghe); textCell(row, item.CongTyThanhVien); body.appendChild(row);
        });
        if (typeof window.hqdCalcRowsRendered === 'function') window.hqdCalcRowsRendered(currentRows, { preserveCalculation: Boolean(preserveCalculation) });
        updateSelectionSummary();
    }

    function renderPagination() {
        var totalPages = Math.ceil(totalCount / pageSize); var wrap = byId('hqd-pagination-wrap');
        wrap.hidden = totalPages <= 1;
        if (totalPages <= 1) return;
        var start = (currentPage - 1) * pageSize + 1; var end = Math.min(currentPage * pageSize, totalCount);
        byId('hqd-result-text').textContent = 'Hiển thị ' + start + '-' + end + ' trên tổng ' + totalCount + ' kết quả';
        byId('hqd-page-size').value = String(pageSize);
        var container = byId('hqd-pagination-buttons'); container.textContent = '';
        addPageButton(container, '‹', currentPage - 1, currentPage === 1, false);
        pageNumbers(totalPages).forEach(function (page) {
            if (page === '...') { var span = document.createElement('span'); span.textContent = '...'; container.appendChild(span); }
            else addPageButton(container, String(page), page, false, page === currentPage);
        });
        addPageButton(container, '›', currentPage + 1, currentPage === totalPages, false);
    }

    function pageNumbers(totalPages) {
        if (totalPages <= 7) return Array.from({ length: totalPages }, function (_, index) { return index + 1; });
        var pages = [1]; if (currentPage > 3) pages.push('...');
        for (var page = Math.max(2, currentPage - 1); page <= Math.min(totalPages - 1, currentPage + 1); page += 1) pages.push(page);
        if (currentPage < totalPages - 2) pages.push('...'); pages.push(totalPages); return pages;
    }

    function addPageButton(container, label, page, disabled, active) {
        var button = document.createElement('button'); button.type = 'button'; button.className = 'page-button' + (active ? ' active' : '');
        button.textContent = label; button.disabled = disabled;
        button.setAttribute('aria-label', label === '‹' ? 'Trang trước' : label === '›' ? 'Trang sau' : 'Trang ' + label);
        if (active) button.setAttribute('aria-current', 'page');
        button.addEventListener('click', function () { search(page, true); }); container.appendChild(button);
    }

    function reset() {
        hasSubmitted = false;
        byId('policy-search-form').reset(); selectedCttv.clear(); selectedIndustry = ''; currentPage = 1; pageSize = 10; totalCount = 0;
        byId('hqd-riclass').disabled = false;
        applyYearQuarter();
        setDateValue('hqd-from', 'hqd-from-display', ''); setDateValue('hqd-to', 'hqd-to-display', '');
        setDateDisabled('hqd-from', 'hqd-from-display', false); setDateDisabled('hqd-to', 'hqd-to-display', false);
        byId('hqd-from-display').setAttribute('aria-invalid', 'false'); byId('hqd-to-display').setAttribute('aria-invalid', 'false');
        byId('hqd-from-error').hidden = true; byId('hqd-riclass-error').hidden = true; byId('hqd-range-error').hidden = true;
        byId('hqd-search-body').textContent = ''; byId('hqd-search-wrap').hidden = true;
        byId('hqd-page-size').value = '10'; updateCttvLabel(); selectIndustry(''); toggleLobFilters(); showToast('Đã đặt lại bộ lọc', 'info');
        updateRangeHint(); updateSelectionSummary();
        validate(false);
        if (typeof window.hqdCalcReset === 'function') window.hqdCalcReset();
    }

    byId('hqd-cttv-btn').addEventListener('click', function () { var menu = byId('hqd-cttv-drop'); setMenuOpen(this, menu, menu.hidden); if (!menu.hidden) { byId('hqd-cttv-search').value = ''; renderCttv(''); byId('hqd-cttv-search').focus(); } });
    byId('hqd-cttv-search').addEventListener('input', function () { renderCttv(this.value); });
    byId('hqd-nganh-btn').addEventListener('click', function () { var menu = byId('hqd-nganh-drop'); setMenuOpen(this, menu, menu.hidden); if (!menu.hidden) { byId('hqd-nganh-search').value = ''; renderIndustry(''); byId('hqd-nganh-search').focus(); } });
    byId('hqd-nganh-search').addEventListener('input', function () { renderIndustry(this.value); });
    byId('hqd-riclass').addEventListener('change', function () { toggleLobFilters(); updateRangeHint(); validate(false); });
    byId('hqd-year').addEventListener('change', applyYearQuarter); byId('hqd-quarter').addEventListener('change', applyYearQuarter);
    bindDateField('hqd-from', 'hqd-from-display');
    bindDateField('hqd-to', 'hqd-to-display');
    // THEM 2026-09-08: go So don song song cap nhat trang thai bat buoc cua Nghiep vu ngay
    // lap tuc (xem validate()), khong doi den luc bam Tim kiem moi bao.
    byId('hqd-sodon').addEventListener('input', function () { validate(false); });
    byId('policy-search-form').addEventListener('submit', function (event) { event.preventDefault(); search(1, false); });
    byId('hqd-reset-btn').addEventListener('click', reset);
    byId('hqd-page-size').addEventListener('change', function () { pageSize = Number(this.value); search(1, true); });
    // SUA 2026-09-04 (yeu cau nguoi dung: "chon tat ca" phai la TOAN BO tap da loc theo bo loc hien tai,
    // khong chi cac dong dang hien trong trang - xem hieuqua-calc.js hqdSetSelectAllMode/SelectAll o
    // TinhToanRequest). Tich vao vao van bao gioi cac checkbox tren TRANG hien tai (truc quan), nhung y
    // nghia thuc su khi tinh hieu qua la "toan bo", khong chi trang dang xem.
    byId('hqd-checkall').addEventListener('change', function () {
        var checked = byId('hqd-checkall').checked;
        document.querySelectorAll('.hqd-cb').forEach(function (checkbox) { checkbox.checked = checked; });
        if (typeof window.hqdSetSelectAllMode === 'function') window.hqdSetSelectAllMode(checked);
        updateSelectionSummary();
    });
    document.addEventListener('click', function (event) {
        if (!byId('hqd-cttv-btn').contains(event.target) && !byId('hqd-cttv-drop').contains(event.target)) setMenuOpen(byId('hqd-cttv-btn'), byId('hqd-cttv-drop'), false);
        if (!byId('hqd-nganh-btn').contains(event.target) && !byId('hqd-nganh-drop').contains(event.target)) setMenuOpen(byId('hqd-nganh-btn'), byId('hqd-nganh-drop'), false);
    });
    document.addEventListener('keydown', function (event) {
        if (event.key !== 'Escape') return;
        if (!byId('hqd-cttv-drop').hidden) { setMenuOpen(byId('hqd-cttv-btn'), byId('hqd-cttv-drop'), false); byId('hqd-cttv-btn').focus(); }
        if (!byId('hqd-nganh-drop').hidden) { setMenuOpen(byId('hqd-nganh-btn'), byId('hqd-nganh-drop'), false); byId('hqd-nganh-btn').focus(); }
    });

    applyYearQuarter();
    renderCttv(''); toggleLobFilters(); updateRangeHint(); updateSelectionSummary(); validate(false);
    window.hqdPolicyKey = policyKey;
    window.hqdShowToast = showToast;
    window.hqdGetSearchState = function () {
        var filters = effectiveFilters();
        return {
            rows: currentRows.slice(),
            soDon: byId('hqd-sodon').value.trim(),
            ngayHieuLucFrom: byId('hqd-from').value,
            ngayHieuLucTo: byId('hqd-to').value,
            riClass: filters.riClass,
            cat: filters.cat,
            nganhNghe: filters.nganhNghe,
            cttvIds: Array.from(selectedCttv.keys()),
            totalCount: totalCount
        };
    };
}());

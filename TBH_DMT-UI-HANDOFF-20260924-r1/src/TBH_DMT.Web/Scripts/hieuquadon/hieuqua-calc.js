(function () {
    'use strict';

    var config = window.TBH_POLICY_SEARCH || {};
    var urls = config.urls || {};
    var searchRows = [];
    var calculatedRows = [];
    var selectedKeys = [];
    // THEM 2026-09-04 (yeu cau nguoi dung: "chon tat ca" = tinh HANG LOAT cho TOAN BO tap da loc, khong
    // phu thuoc phan trang - dieu khien boi search.js qua window.hqdSetSelectAllMode). true => gui
    // SelectAll=true + KHONG gui PolicyTerms (PRC_HQ_JOB_RUN_BATCH, p_policy_urn_list=NULL). false (mac
    // dinh) => gui danh sach ky han cu the da tick (PRC_HQ_JOB_RUN_LIST).
    var selectAllMode = false;
    // THEM 2026-09-05 (yeu cau nguoi dung: Xuat Excel phai gom TOAN BO tap da tinh cho job GAN NHAT, khong
    // chi doc calculatedRows dang render - xem exportExcel()). jobId cua lan Tinh toan gan nhat da hoan
    // tat (DONE), reset ve null moi khi bat dau tinh lai/tim kiem moi.
    var currentJobId = null;
    // SUA 2026-09-05 (yeu cau nguoi dung: chi "chon tat ca" moi can goi server de xuat Excel - "chon rieng
    // le" xuat NGAY tu calculatedRows nhu ban dau, khong bat khach cho). Chup lai selectAllMode NGAY LUC
    // Tinh toan bat dau chay (khong doc selectAllMode "song" luc bam Xuat Excel) - tranh sai lech neu
    // nguoi dung doi trang thai checkbox SAU KHI da tinh xong nhung TRUOC khi xuat.
    var lastCalcWasSelectAll = false;
    // THEM 2026-09-08 (PAGED_RESULT_PLAN.md, duyet boi nguoi dung): cache ket qua da tinh theo policyKey,
    // SONG SONG voi currentJobId - CA HAI cung ton tai qua nhieu lan doi trang/doi page-size (CUNG 1 bo
    // loc), CHI bi xoa khi tim kiem MOI/Reset/bat dau tinh lai (xem hqdCalcReset). Gioi han
    // RESULT_CACHE_MAX dong (LRU - xoa dong CU NHAT khi vuot), tranh phinh to khong gioi han cho truong
    // hop "chon tat ca" hang chuc nghin dong (chi giu gan nhat cac trang nguoi dung THAT SU da xem).
    var resultCache = new Map();
    var RESULT_CACHE_MAX = 2000;
    // pageRequestSeq: so hieu "the he" - moi lan hydrateCurrentPage() chay la 1 the he moi, response cua
    // the he CU hon phai bi bo qua (tranh doi trang lien tuc lam ket qua cua trang TRUOC de len trang
    // SAU do phan hoi tra ve khong dung thu tu mang). pageFetchAbort: huy request page dang bay (neu co)
    // khi bat dau 1 lan hydrate moi hoac khi Reset/tinh lai.
    var pageRequestSeq = 0;
    var pageFetchAbort = null;
    var detailCache = { struct: new Map(), claim: new Map(), xol: new Map() };
    var drawerIndex = 0;
    var currentTab = 'tq';
    var isCalculating = false;
    var pollHandle = null;
    // Timer client 10 phut chi la lop UX phu de dung polling/cancel som. Deadline bat buoc nam phia
    // server tai OracleConnectionHelper/CommandTimeout 600 giay, khong phu thuoc tab trinh duyet.
    var CALC_AUTO_CANCEL_MS = 10 * 60 * 1000;
    var calcStartedAt = null;
    var calcButtonDefaultHtml = document.getElementById('hqd-calc-btn').innerHTML;
    var exportButtonDefaultHtml = document.getElementById('hqd-export-btn').innerHTML;
    var drawerReturnFocus = null;
    var noOperationTimer = { start: function () { }, stop: function () { } };
    // SUA 2026-09-15 (yeu cau nguoi dung: hien timer ngay tu giay dau, khong doi 60s nhu mac dinh cua
    // HqdOperationTimer - da ap dung cho Premium Borderaux truoc do (revealDelayMs=0), nguoi dung xac
    // nhan yeu cau nay ap dung CA man Tinh hieu qua, khong rieng Premium). Truyen rieng revealDelayMs=0
    // o day, KHONG doi default cua operation-timer.js (de khong anh huong man nao khac lo goi ma khong
    // truyen tham so nay).
    var calculationElapsedTimer = window.HqdOperationTimer
        ? window.HqdOperationTimer.create(function (elapsedText) {
            var elapsed = byId('hqd-calc-elapsed');
            if (!elapsed) return;
            elapsed.textContent = ' (' + elapsedText + ')';
            elapsed.hidden = false;
        }, 0)
        : noOperationTimer;
    var exportElapsedTimer = window.HqdOperationTimer
        ? window.HqdOperationTimer.create(function (elapsedText) {
            var elapsed = byId('hqd-export-elapsed');
            if (!elapsed) return;
            elapsed.textContent = ' (' + elapsedText + ')';
            elapsed.hidden = false;
        }, 0)
        : noOperationTimer;

    function byId(id) { return document.getElementById(id); }
    function toast(message, type) { if (window.hqdShowToast) window.hqdShowToast(message, type); }
    function keyOf(row) { return window.hqdPolicyKey(row); }
    function escapeHtml(value) {
        return String(value === null || value === undefined ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function valueOrNull(value) { return value === null || value === undefined || value === '' ? null : Number(value); }
    function fmt(value) { var number = valueOrNull(value); return number === null ? '—' : Math.round(number).toLocaleString('vi-VN'); }
    function pct(value, digits) { var number = valueOrNull(value); return number === null ? '—' : number.toFixed(digits) + '%'; }
    function pctVi(value, digits) {
        var number = valueOrNull(value);
        return number === null ? '—' : number.toLocaleString('vi-VN', { minimumFractionDigits: digits, maximumFractionDigits: digits }) + '%';
    }
    function shortStatus(value) {
        var map = { NewBusiness: 'NB', Renewal: 'RNL', MidTermAdjustment: 'MTA', ShortTermAdjustment: 'STA', Cancellation: 'CXL', Reinstatement: 'RST' };
        return map[value] || value || '';
    }
    function classifyRiType(value) {
        var type = (value || '').trim();
        if (type === 'FacultativeQuotaShareObligatoryTreaty' || type === 'QuotaShareTreaty' || type === 'QuotaShareObligatoryTreaty') return 'QS';
        if (type === 'SurplusTreaty' || type === 'FacultativeObligatorySurplusTreaty') return 'Surplus';
        if (type === 'FacultativeSurplusPlacement') return 'Fronting/FAC';
        if (type === 'NetExcessOfLossTreaty' || type === 'ExcessOfLossTreaty' || type === 'FacultativeObligatoryExcessOfLossTreaty' || type === 'CatastropheTreaty') return 'XOL';
        if (/ExcessOfLoss|Catastrophe/i.test(type)) return 'XOL';
        if (/Surplus/i.test(type)) return 'Surplus';
        if (/QuotaShare/i.test(type)) return 'QS';
        if (/Facultative|Fronting/i.test(type)) return 'Fronting/FAC';
        return 'XOL';
    }
    function riLabel(type) {
        return { QS: 'Quota Share (QS)', Surplus: 'Surplus', 'Fronting/FAC': 'Fronting / Facultative', XOL: 'Excess of Loss (XOL)' }[type] || type;
    }

    function query(url, values) {
        var params = new URLSearchParams();
        Object.keys(values || {}).forEach(function (name) {
            if (values[name] !== null && values[name] !== undefined && values[name] !== '') params.append(name, values[name]);
        });
        return url + (url.indexOf('?') >= 0 ? '&' : '?') + params.toString();
    }
    function fetchJson(url, options) {
        return fetch(url, options || { credentials: 'same-origin' }).then(function (response) {
            return response.json().then(function (body) {
                if (!response.ok || !body.success) throw new Error(body.message || 'Không thể tải dữ liệu từ Oracle. Vui lòng thử lại.');
                return body;
            });
        });
    }

    // SUA 2026-09-04 (yeu cau nguoi dung: "khoang ngay tim kiem toi da 1 nam thay vi quy" - xem
    // [[project_ft002_quy_gioi_han_tam_thoi]]). Doi ten tu maxQuarterEnd/isAtMostOneQuarter, cung logic
    // clamp ngay cuoi thang (VD 29/02 nam nhuan + 1 nam -> 28/02) mo phong dung C# DateTime.AddYears phia
    // server (HieuQuaDonController.IsAtMostOneYear).
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
    // KHI chon dung 1 CTTV cu the - khop dung HieuQuaDonController.IsWithinAllowedRange o server.
    function isWithinAllowedRange(riClass, fromText, toText, cttvIds) {
        if (!toText) return true;
        var from = new Date(fromText + 'T00:00:00');
        var to = new Date(toText + 'T00:00:00');
        var cargoOneYearAllowed = riClass === 'Cargo' && (cttvIds || []).length === 1;
        var maxEnd = (riClass === 'Cargo' && !cargoOneYearAllowed) ? maxQuarterEnd(fromText) : maxYearEnd(fromText);
        return to >= from && to <= maxEnd;
    }

    function rangeErrorText(riClass, cttvIds) {
        if (riClass !== 'Cargo') return 'Vui lòng thu hẹp khoảng ngày về tối đa 1 năm trước khi Tính toán';
        return (cttvIds || []).length === 1
            ? 'Vui lòng thu hẹp khoảng ngày về tối đa 1 năm trước khi Tính toán'
            : 'Cargo: vui lòng chọn đúng 1 Công ty thành viên để xem tối đa 1 năm, hoặc thu hẹp khoảng ngày về tối đa 1 quý trước khi Tính toán';
    }

    function selectedSearchRows() {
        var selected = new Set();
        document.querySelectorAll('#hqd-search-body .hqd-cb:checked').forEach(function (checkbox) { selected.add(checkbox.dataset.policyKey); });
        var seen = new Set();
        return searchRows.filter(function (row) {
            var key = keyOf(row);
            if (!selected.has(key) || seen.has(key)) return false;
            seen.add(key); return true;
        });
    }

    // THEM 2026-09-08 (PAGED_RESULT_PLAN.md) - 1 dong duoc coi la "thuoc pham vi da tinh" cua job hien
    // tai neu dang o che do "chon tat ca" (moi dong deu thuoc), hoac neu khoa cua dong nam trong
    // selectedKeys (snapshot da chup luc bam Tinh toan - xem calculate()). Dung lastCalcWasSelectAll
    // (chup luc bam Tinh toan, giong quy uoc Xuat Excel) - KHONG doc selectAllMode "song": checkbox co
    // the doi TRUOC/SAU luc bam (VD co So don thi calculate() da ha cap xuong RunList du checkbox dang
    // tich), phai khop DUNG che do THUC SU da gui len server, khong phai trang thai UI hien tai.
    function isEligibleForCalc(row) {
        if (lastCalcWasSelectAll) return true;
        return selectedKeys.indexOf(keyOf(row)) !== -1;
    }

    function cacheSet(key, row) {
        if (resultCache.has(key)) resultCache.delete(key);
        resultCache.set(key, row);
        if (resultCache.size > RESULT_CACHE_MAX) {
            var oldestKey = resultCache.keys().next().value;
            resultCache.delete(oldestKey);
        }
    }

    // Dung LAI dung tap searchRows (trang dang hien) - "trang" o day la trang KET QUA TIM KIEM phia UI,
    // khop calculatedRows voi cac dong DANG HIEN de drawer/prev-next chi di trong pham vi trang hien tai
    // (khong tich luy toan cuc qua nhieu lan doi trang - xem PAGED_RESULT_PLAN.md muc 3).
    function buildCalculatedRowsFromCache() {
        return searchRows.filter(function (row) { return isEligibleForCalc(row) && resultCache.has(keyOf(row)); })
            .map(function (row) { return { search: row, calc: resultCache.get(keyOf(row)) }; });
    }

    function setPageLoadingCells(rows) {
        var keys = new Set(rows.map(keyOf));
        document.querySelectorAll('#hqd-search-body tr').forEach(function (domRow) {
            if (!keys.has(domRow.dataset.policyKey)) return;
            domRow.querySelectorAll('[data-col]').forEach(function (cell) { cell.textContent = '···'; cell.className = 'right placeholder cell-loading'; });
        });
    }
    function clearLoadingCells(rows) {
        var keys = new Set(rows.map(keyOf));
        document.querySelectorAll('#hqd-search-body tr').forEach(function (domRow) {
            if (!keys.has(domRow.dataset.policyKey)) return;
            domRow.querySelectorAll('[data-col].cell-loading').forEach(function (cell) { cell.textContent = '—'; cell.className = 'right placeholder'; });
        });
    }

    // Goi POST GetTinhToanResultPage (PRC_HQ_JOB_GET_RESULT_PAGE) - CHI xin ket qua cho danh sach khoa
    // dang thieu cua 1 trang, KHONG con goi GetTinhToanResult (nguyen ca job) trong luong xem theo trang
    // binh thuong nua. Server gioi han toi da 100 khoa/lan nen chia chunk phong truong hop page size
    // lon hon 100 (hien tai UI toi da 100/trang nhung chia chunk de an toan truoc thay doi sau nay).
    function fetchResultPage(jobId, rows, controller) {
        var data = new FormData();
        data.append('__RequestVerificationToken', document.querySelector('input[name="__RequestVerificationToken"]').value);
        data.append('JobId', jobId);
        rows.forEach(function (row, index) {
            data.append('PolicyTerms[' + index + '].SoDon', row.SoDon);
            data.append('PolicyTerms[' + index + '].InceptionDate', row.InceptionDate);
            data.append('PolicyTerms[' + index + '].PkCovId', row.PkCovId === null || row.PkCovId === undefined ? '' : row.PkCovId);
        });
        var options = { method: 'POST', body: data, credentials: 'same-origin' };
        if (controller) options.signal = controller.signal;
        return fetchJson(urls.resultPage, options).then(function (body) { return body.data || []; });
    }
    function fetchMissingInChunks(jobId, rows, controller) {
        var CHUNK_SIZE = 100;
        var chunks = [];
        for (var i = 0; i < rows.length; i += CHUNK_SIZE) chunks.push(rows.slice(i, i + CHUNK_SIZE));
        return chunks.reduce(function (promise, chunk) {
            return promise.then(function (acc) {
                return fetchResultPage(jobId, chunk, controller).then(function (rows2) { return acc.concat(rows2); });
            });
        }, Promise.resolve([]));
    }

    // Ham TRUNG TAM cua ca luong "vua tinh xong" (loadResults) va "doi trang/doi page-size" (hook
    // hqdCalcRowsRendered voi preserveCalculation=true): (1) render NGAY nhung gi da co trong cache
    // (khong doi API - trang da xem qua hien tuc thi), (2) neu con thieu VA co job dang hoat dong, goi
    // 1 lan GetTinhToanResultPage CHI cho cac khoa con thieu, gop vao cache, render lai. Dung
    // pageRequestSeq + AbortController de phan hoi CU (trang/job da doi) khong ghi de len ket qua MOI
    // hon - xem khai bao bien dau file.
    function hydrateCurrentPage() {
        pageRequestSeq += 1;
        var mySeq = pageRequestSeq;
        if (pageFetchAbort) { pageFetchAbort.abort(); pageFetchAbort = null; }

        calculatedRows = buildCalculatedRowsFromCache();
        renderCalculationResults();
        byId('hqd-export-btn').hidden = calculatedRows.length === 0;

        if (!currentJobId) return Promise.resolve();

        var missing = searchRows.filter(isEligibleForCalc).filter(function (row) { return !resultCache.has(keyOf(row)); });
        if (!missing.length) return Promise.resolve();

        setPageLoadingCells(missing);
        var jobIdAtRequest = currentJobId;
        var controller = (typeof AbortController === 'function') ? new AbortController() : null;
        pageFetchAbort = controller;

        return fetchMissingInChunks(jobIdAtRequest, missing, controller).then(function (rows) {
            if (mySeq !== pageRequestSeq || currentJobId !== jobIdAtRequest) return;
            rows.forEach(function (row) { cacheSet(keyOf(row), row); });
            calculatedRows = buildCalculatedRowsFromCache();
            renderCalculationResults();
            byId('hqd-export-btn').hidden = calculatedRows.length === 0;
        }).catch(function (error) {
            if (mySeq !== pageRequestSeq) return;
            if (error && error.name === 'AbortError') return;
            clearLoadingCells(missing);
            toast(error && error.message ? error.message : 'Không thể tải kết quả cho trang này. Vui lòng bấm lại số trang để thử lại.', 'error');
        });
    }

    function setCalculationLock(locked) {
        calculationElapsedTimer.stop();
        isCalculating = locked;
        byId('hqd-calc-btn').disabled = locked;
        byId('hqd-search-btn').disabled = locked;
        byId('hqd-reset-btn').disabled = locked;
        byId('hqd-search-params').classList.toggle('is-loading', locked);
        byId('hqd-calc-btn').innerHTML = locked
            ? '<span class="spinner" aria-hidden="true"></span> Đang tính hiệu quả...<span id="hqd-calc-elapsed" class="hqd-operation-elapsed" aria-hidden="true" hidden></span>'
            : calcButtonDefaultHtml;
        if (locked) calculationElapsedTimer.start();
    }

    // THEM 2026-09-05 (yeu cau nguoi dung: hieu ung nut "Xuat Excel" tuong tu "Tinh toan" luc bam - dung
    // DUNG class .spinner + quy uoc doi label da co san cua setCalculationLock, khong bia mau moi).
    function setExportLock(locked) {
        var exportBtn = byId('hqd-export-btn');
        exportElapsedTimer.stop();
        exportBtn.disabled = locked;
        exportBtn.innerHTML = locked
            ? '<span class="spinner" aria-hidden="true"></span> Đang xuất...<span id="hqd-export-elapsed" class="hqd-operation-elapsed" aria-hidden="true" hidden></span>'
            : exportButtonDefaultHtml;
        if (locked) exportElapsedTimer.start();
    }

    function buildCalculationRequest(rows, effectiveSelectAll) {
        var state = window.hqdGetSearchState();
        var data = new FormData();
        data.append('__RequestVerificationToken', document.querySelector('input[name="__RequestVerificationToken"]').value);
        // SUA 2026-09-04 (yeu cau nguoi dung): "chon tat ca" (effectiveSelectAll) KHONG gui PolicyTerms - de
        // p_policy_urn_list phia server la NULL, PRC_HQ_CALC_SUMMARY_BATCH tu tinh cho TOAN BO tap da loc
        // (khong gioi han theo danh sach cu the). Nguoc lai gui dung danh sach ky han da tick nhu cu.
        if (!effectiveSelectAll) {
            rows.forEach(function (row, index) {
                data.append('PolicyTerms[' + index + '].SoDon', row.SoDon);
                data.append('PolicyTerms[' + index + '].InceptionDate', row.InceptionDate);
                data.append('PolicyTerms[' + index + '].PkCovId', row.PkCovId === null || row.PkCovId === undefined ? '' : row.PkCovId);
            });
        }
        data.append('SelectAll', effectiveSelectAll ? 'true' : 'false');
        data.append('TyGiaApDung', byId('hqd-fx').value);
        // SUA 2026-09-08: chi gui NgayHieuLucFrom khi co gia tri thuc (khop pattern NgayHieuLucTo ben
        // duoi) - truoc day gui ca chuoi rong khi tim theo So don (khong co ngay), gay loi 400 "Bad
        // Request" tho phia server (xem TinhToanRequest.cs).
        if (state.ngayHieuLucFrom) data.append('NgayHieuLucFrom', state.ngayHieuLucFrom);
        if (state.ngayHieuLucTo) data.append('NgayHieuLucTo', state.ngayHieuLucTo);
        if (state.riClass) data.append('RiClass', state.riClass);
        if (state.cat) data.append('Cat', state.cat);
        if (state.nganhNghe) data.append('NganhNghe', state.nganhNghe);
        if (state.soDon) data.append('SoDon', state.soDon);
        state.cttvIds.forEach(function (id) { data.append('CttvIds', id); });
        return data;
    }

    function calculate() {
        if (isCalculating) return;
        var fx = Number(byId('hqd-fx').value);
        if (!fx || fx <= 0) {
            byId('hqd-fx').classList.add('input-error'); byId('hqd-fx').focus();
            toast('Vui lòng nhập Tỷ giá USD/VND trước khi tính hiệu quả!', 'warning'); return;
        }
        byId('hqd-fx').classList.remove('input-error');
        var state = window.hqdGetSearchState();
        // THEM 2026-09-08 (yeu cau nguoi dung, tiep tuc rule "Tim kiem theo So don khong can rang buoc
        // Thoi gian/Nghiep vu.v.v." sang buoc Tinh toan): khi co So don, "chon tat ca" chi co the la cac
        // dong DA TIM DUOC theo dung So don do (thuong 1-2 dong, khong bao gio la ca tap du lieu khong
        // gioi han) - VE BAN CHAT giong het "tick tung dong cu the", nen ha cap xuong duong RunList (nhu
        // tick tay), du checkbox "chon tat ca" dang tich. Khong doi PRC_HQ_JOB_RUN_BATCH/
        // PRC_HQ_CALC_SUMMARY_BATCH - thu tuc do van BAT BUOC khoang ngay de bao ve perf cho truong hop
        // "chon tat ca" THAT (khong co So don, co the hang chuc nghin dong) - hoan toan dung, khong sua.
        var hasSoDon = Boolean(state.soDon);
        var effectiveSelectAll = selectAllMode && !hasSoDon;
        // SUA 2026-09-04 (yeu cau nguoi dung): gioi han khoang ngay (bao ve rui ro coins_raw cua
        // PRC_HQ_CALC_SUMMARY_BATCH) CHI ap dung khi effectiveSelectAll (duong RUN_BATCH) - duong RUN_LIST
        // (tung ky han) khong dung khoang ngay de loc nen khong can kiem tra o day, khop dung server.
        if (effectiveSelectAll && !isWithinAllowedRange(state.riClass, state.ngayHieuLucFrom, state.ngayHieuLucTo, state.cttvIds)) {
            toast(rangeErrorText(state.riClass, state.cttvIds), 'warning'); return;
        }
        if (effectiveSelectAll && !window.confirm('Xác nhận tính hiệu quả cho toàn bộ ' + (state.totalCount || 0) + ' kết quả theo bộ lọc hiện tại? Thao tác này không chỉ áp dụng cho trang đang xem.')) return;
        var rows = selectedSearchRows();
        if (!effectiveSelectAll && !rows.length) { toast('Vui lòng chọn ít nhất một đơn để tính hiệu quả', 'warning'); return; }

        selectedKeys = rows.map(keyOf);
        calculatedRows = [];
        currentJobId = null;
        // SUA 2026-09-08 (PAGED_RESULT_PLAN.md): 1 lan Tinh toan MOI luon la 1 tap ket qua MOI (khac
        // selection/bo loc voi lan truoc) - phai xoa cache cu, khong de lai du lieu "chon rieng le" lan
        // truoc lam sai ket qua hydrate cua lan tinh nay.
        resultCache = new Map();
        lastCalcWasSelectAll = effectiveSelectAll;
        detailCache = { struct: new Map(), claim: new Map(), xol: new Map() };
        resetResultCells();
        setCalculationLock(true);
        calcStartedAt = Date.now();
        fetchJson(urls.tinhToan, { method: 'POST', body: buildCalculationRequest(rows, effectiveSelectAll), credentials: 'same-origin' })
            .then(function (body) { poll(body.jobId); })
            .catch(failCalculation);
    }

    // THEM 2026-09-10 - xem CancelTinhToan/IHqCalcJobRepository.RequestCancel. Fire-and-forget: khong cho
    // ket qua HTTP nay quyet dinh trai nghiem nguoi dung (client da tu dung ngay tai poll()), chi de dam
    // bao phia Oracle NHAN duoc lenh Cancel() that, tranh job mo coi chay tiep tren server sau khi UI da
    // bao "da dung".
    function requestServerCancel(jobId) {
        if (!urls.cancelTinhToan) return;
        var data = new FormData();
        data.append('__RequestVerificationToken', document.querySelector('input[name="__RequestVerificationToken"]').value);
        data.append('jobId', jobId);
        fetchJson(urls.cancelTinhToan, { method: 'POST', body: data, credentials: 'same-origin' }).catch(function () { });
    }

    function poll(jobId) {
        fetchJson(query(urls.status, { jobId: jobId }))
            .then(function (body) {
                if (body.trangThai === 'DONE') return loadResults(jobId, body.tongSoDong, body.errorMessage);
                if (body.trangThai === 'ERROR') throw new Error(body.errorMessage || 'Không thể tải dữ liệu từ Oracle. Vui lòng thử lại.');
                // THEM 2026-09-10: truong hop hiem (huy tu noi khac/lan poll truoc da goi Cancel nhung job
                // van kip ghi trang thai truoc khi client kip dung poll) - van phai xu ly duoc CANCELLED
                // ngay ca khi khong phai chinh client nay kich hoat.
                if (body.trangThai === 'CANCELLED') throw new Error(body.errorMessage || 'Đã hủy tính toán.');
                // THEM 2026-09-10 (yeu cau nguoi dung: qua 10 phut thi TU DONG dung + huy that Oracle, thay
                // vi bat nguoi dung tu bam nut "Dung tinh"). Client tu ngung poll NGAY o vong lap nay, khong
                // cho server xac nhan huy xong moi bao - nhung van goi that CancelTinhToan song song de
                // Oracle-side dung that (khong chi client "bo cuoc" con job mo coi chay tiep tren server).
                if (calcStartedAt && (Date.now() - calcStartedAt) >= CALC_AUTO_CANCEL_MS) {
                    requestServerCancel(jobId);
                    throw new Error('Tính hiệu quả quá 10 phút, đã tự động dừng. Vui lòng thu hẹp phạm vi dữ liệu (theo quý/công ty thành viên, giảm số kỳ hạn chọn) rồi tính lại.');
                }
                pollHandle = window.setTimeout(function () { poll(jobId); }, 2500);
            })
            .catch(failCalculation);
    }

    // SUA 2026-09-08 (PAGED_RESULT_PLAN.md, duyet boi nguoi dung): TRUOC DAY goi GetTinhToanResult -
    // tai NGUYEN CA job (co the hang chuc nghin dong o che do "chon tat ca") chi de dung 1 TRANG. Gio
    // CHI hydrate dung trang dang hien qua hydrateCurrentPage() (goi GetTinhToanResultPage, toi da 100
    // khoa/lan) - cac trang KHAC se tu hydrate khi nguoi dung doi qua (xem hqdCalcRowsRendered).
    function loadResults(jobId, tongSoDong, completionMessage) {
        currentJobId = jobId;
        calcStartedAt = null;
        return hydrateCurrentPage().then(function () {
            setCalculationLock(false);
            // SUA 2026-09-04: dung tongSoDong THAT tu server (GetTinhToanStatus, bao gom TOAN BO ky han da
            // tinh) thay vi calculatedRows.length (chi dem cac dong dang hien tren TRANG hien tai) - o che
            // do "chon tat ca" 2 con so nay khac han nhau, calculatedRows.length gay hieu lam da tinh it.
            var soDongThat = typeof tongSoDong === 'number' ? tongSoDong : calculatedRows.length;
            toast(completionMessage || ('Đã tính hiệu quả cho ' + soDongThat + ' đơn'), completionMessage ? 'warning' : 'success');
        });
    }

    function failCalculation(error) {
        if (pollHandle) window.clearTimeout(pollHandle);
        pollHandle = null; calcStartedAt = null; setCalculationLock(false);
        toast(error && error.message ? error.message : 'Không thể tải dữ liệu từ Oracle. Vui lòng thử lại.', 'error');
    }

    function resetResultCells() {
        document.querySelectorAll('#hqd-search-body tr').forEach(function (row) {
            row.querySelectorAll('[data-col]').forEach(function (cell) { cell.textContent = '—'; cell.className = 'right placeholder'; });
            var policyCell = row.children[1];
            var original = searchRows.find(function (item) { return keyOf(item) === row.dataset.policyKey; });
            if (original) { policyCell.textContent = original.SoDon || '—'; policyCell.className = 'policy-number'; }
        });
    }

    function setCell(row, column, text, className) {
        var cell = row.querySelector('[data-col="' + column + '"]');
        if (!cell) return;
        cell.textContent = text; cell.className = 'right ' + (className || '');
    }
    function renderCalculationResults() {
        var byKey = new Map(); calculatedRows.forEach(function (item, index) { byKey.set(keyOf(item.search), { item: item, index: index }); });
        document.querySelectorAll('#hqd-search-body tr').forEach(function (row) {
            var match = byKey.get(row.dataset.policyKey); if (!match) return;
            var calc = match.item.calc;
            setCell(row, 'premium', fmt(calc.PhiDongBaoHiemGoc));
            setCell(row, 'tyLeDong', pct(calc.BaovietCoinsPct, 0));
            setCell(row, 'phiDBH', fmt(calc.PhiDongBaoHiem));
            setCell(row, 'phiNhuong', fmt(calc.PhiNhuongTbh));
            setCell(row, 'phiGiuLai', fmt(calc.PhiGiuLai), 'money-retained');
            setCell(row, 'btGoc', fmt(calc.TonThatGoVnd), 'money-loss');
            setCell(row, 'btGiuLai', fmt(calc.TonThatGiuLaiVnd), 'money-loss');
            var recovery = (valueOrNull(calc.TonThatNhuongTyLeVnd) || 0) + (valueOrNull(calc.XolRecoveryVnd) || 0);
            setCell(row, 'tongThuDoi', fmt(recovery), 'money-recovery');
            setCell(row, 'rip', fmt(calc.PhiTaiLapVnd));
            var efficiency = valueOrNull(calc.HieuQuaDichVuPct);
            var warning = (valueOrNull(calc.PhiGiuLai) || 0) < 0 || (valueOrNull(calc.TonThatGiuLaiVnd) || 0) < 0;
            setCell(row, 'eff', (warning ? '⚠ ' : '') + (efficiency === null ? '—' : efficiency.toFixed(2) + '%'), efficiency === null ? '' : efficiency >= 15 ? 'eff-good' : efficiency >= 0 ? 'eff-warn' : 'eff-bad');
            if (warning) row.querySelector('[data-col="eff"]').title = 'Số Core thật: phí giữ lại hoặc tổn thất giữ lại đang âm';
            var cell = row.children[1]; cell.textContent = '';
            var number = document.createElement('span'); number.textContent = match.item.search.SoDon + ' ';
            var link = document.createElement('button'); link.type = 'button'; link.className = 'detail-link'; link.textContent = 'chi tiết';
            link.addEventListener('click', function () { openDrawer(match.index); });
            cell.appendChild(number); cell.appendChild(link);
        });
    }

    function openDrawer(index) {
        if (!calculatedRows.length) return;
        var wasOpen = byId('hqd-drawer').classList.contains('open');
        if (!wasOpen) drawerReturnFocus = document.activeElement;
        drawerIndex = (index + calculatedRows.length) % calculatedRows.length;
        byId('hqd-drawer-overlay').classList.remove('hidden');
        byId('hqd-drawer').classList.add('open'); byId('hqd-drawer').setAttribute('aria-hidden', 'false');
        setDrawerBackgroundInert(true);
        renderDrawerHeader(); renderTab(currentTab);
        if (!wasOpen) byId('hqd-drawer-close').focus();
    }
    function closeDrawer() {
        if (!byId('hqd-drawer').classList.contains('open')) return;
        byId('hqd-drawer').classList.remove('open'); byId('hqd-drawer').setAttribute('aria-hidden', 'true');
        byId('hqd-drawer-overlay').classList.add('hidden');
        setDrawerBackgroundInert(false);
        if (drawerReturnFocus && drawerReturnFocus.isConnected) drawerReturnFocus.focus();
        drawerReturnFocus = null;
    }
    function setDrawerBackgroundInert(inert) {
        // The drawer is rendered inside .shell-container. Making that ancestor inert also makes
        // the drawer (tabs, close/export and navigation buttons) non-interactive.
        // Disable only the background siblings while keeping the drawer and its overlay active.
        [
            'body > .bv-header',
            'body > .shell-breadcrumb',
            '.shell-container > .shell-sidebar',
            '.shell-container > .shell-sidebar-overlay',
            '.shell-main > .shell-main-head',
            '.shell-main > .app-page',
            'body > .shell-footer'
        ].forEach(function (selector) {
            var element = document.querySelector(selector);
            if (element) element.inert = inert;
        });
    }
    function trapDrawerFocus(event) {
        var focusable = Array.prototype.slice.call(byId('hqd-drawer').querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'));
        if (!focusable.length) { event.preventDefault(); byId('hqd-drawer').focus(); return; }
        var first = focusable[0]; var last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    function renderDrawerHeader() {
        var item = calculatedRows[drawerIndex], search = item.search, calc = item.calc;
        byId('hqd-dw-sodon').textContent = search.SoDon || '';
        byId('hqd-dw-sub').textContent = [search.NhomNghiepVu, shortStatus(search.TrangThai), search.NgayHieuLuc, search.PhongKinhDoanh].filter(Boolean).join(' · ') + ' (' + (drawerIndex + 1) + '/' + calculatedRows.length + ')';
        var eff = valueOrNull(calc.HieuQuaDichVuPct); byId('hqd-dw-eff').textContent = eff === null ? '—' : eff.toFixed(2) + '%';
        byId('hqd-dw-eff').className = eff === null ? '' : eff >= 15 ? 'eff-good' : eff >= 0 ? 'eff-warn' : 'eff-bad';
    }
    function renderTab(tab) {
        currentTab = tab;
        document.querySelectorAll('.hqd-dtab').forEach(function (button) {
            var active = button.dataset.tab === tab;
            button.classList.toggle('active', active);
            button.setAttribute('aria-selected', String(active));
            button.tabIndex = active ? 0 : -1;
        });
        if (tab === 'tq') renderOverview();
        else if (tab === 'struct') loadDetail('struct');
        else if (tab === 'claim') loadDetail('claim');
        else loadDetail('xol');
    }
    function renderOverview() {
        var item = calculatedRows[drawerIndex], s = item.search, c = item.calc;
        byId('hqd-drawer-body').innerHTML = '<div class="kpi-grid">' + kpi('Phí giữ lại', c.PhiGiuLai, 'green') + kpi('DTT', c.Dtt, 'blue') + kpi('Phí nhượng tái', c.PhiNhuongTbh, 'amber') + '</div>' +
            '<h3>Vùng dữ liệu đơn</h3><div class="mini-grid">' + mini('Phí gốc trước đồng', fmt(c.PhiDongBaoHiemGoc)) + mini('Tỷ lệ đồng', pct(c.BaovietCoinsPct, 0)) + mini('Phí gốc sau đồng', fmt(c.PhiDongBaoHiem), 'highlight') + mini('Hồng nhượng tái trung bình', pctVi(c.HongNhuongTaiTrungBinhPct, 2), '', 'Tổng hoa hồng nhượng tái / Tổng phí nhượng tái × 100%') + mini('Nhóm nghiệp vụ', s.NhomNghiepVu || '—') + mini('Cat', s.Cat || '—') + mini('Ngành nghề', s.NganhNghe || '—') + '</div>';
    }
    function kpi(label, value, tone) { return '<div class="drawer-kpi ' + tone + '"><small>' + label + '</small><strong>' + fmt(value) + '</strong></div>'; }
    function mini(label, value, tone, title) {
        var titleAttr = title ? ' title="' + escapeHtml(title) + '"' : '';
        return '<div class="mini-card' + (tone ? ' ' + tone : '') + '"' + titleAttr + '><small>' + label + '</small><strong>' + escapeHtml(value) + '</strong></div>';
    }

    function loadDetail(type) {
        var item = calculatedRows[drawerIndex], key = keyOf(item.search), cache = detailCache[type];
        byId('hqd-drawer-body').innerHTML = '<div class="drawer-loading"><span class="spinner"></span> Đang tải dữ liệu...</div>';
        if (cache.has(key)) { renderDetail(type, cache.get(key)); return; }
        var url, values = { soDon: item.search.SoDon, inceptionDate: item.search.InceptionDate };
        if (type === 'struct') url = urls.cauTrucTai;
        else if (type === 'claim') url = urls.boiThuong;
        else { url = urls.xolLayers; values.tyGiaApDung = item.calc.TyGiaApDung || byId('hqd-fx').value; values.tyLePhiTaiLap = item.calc.TyLePhiTaiLapDauVao; }
        fetchJson(query(url, values)).then(function (body) { cache.set(key, body.data || []); if (keyOf(calculatedRows[drawerIndex].search) === key && (currentTab === type || (type === 'xol' && currentTab === 'steps'))) renderDetail(type, cache.get(key)); })
            .catch(function () { byId('hqd-drawer-body').innerHTML = '<div class="detail-error">Không thể tải dữ liệu từ Oracle. Vui lòng thử lại.</div>'; });
    }
    function renderDetail(type, rows) {
        if (type === 'struct') renderStructure(rows);
        else if (type === 'claim') renderClaims(rows);
        else renderSteps(rows);
    }

    function renderStructure(rows) {
        if (!rows.length) { byId('hqd-drawer-body').innerHTML = '<div class="detail-empty">Kỳ hạn này giữ lại 100% — không có dòng nhượng tái nào.</div>'; return; }
        var groups = new Map(), groupIndex = 0;
        rows.forEach(function (row) {
            var key = (row.DiaDiem || '') + '|' + (row.TrangThaiViTri || '');
            if (!groups.has(key)) groups.set(key, { diaDiem: row.DiaDiem, status: row.TrangThaiViTri, ngayHieuLucViTri: row.NgayHieuLucViTri || null, rows: [], phiGocDiaDiem: null, phiGiuLaiDiaDiem: null, grossRetentionVnd: null, grossRetentionPct: null });
            var group = groups.get(key);
            group.rows.push(row);
            if (group.phiGocDiaDiem === null && valueOrNull(row.PhiGocDiaDiem) !== null) group.phiGocDiaDiem = row.PhiGocDiaDiem;
            if (group.phiGiuLaiDiaDiem === null && valueOrNull(row.PhiGiuLaiDiaDiem) !== null) group.phiGiuLaiDiaDiem = row.PhiGiuLaiDiaDiem;
            // THEM 2026-09-04 (Gross Retention theo Location - khac "phi giu lai" o tren, xem
            // PRC_HQ_GET_RI_STRUCTURE.gross_retention_vnd/gross_retention_pct): cung quy tac dedup.
            if (group.grossRetentionVnd === null && valueOrNull(row.GrossRetentionVnd) !== null) group.grossRetentionVnd = row.GrossRetentionVnd;
            if (group.grossRetentionPct === null && valueOrNull(row.GrossRetentionPct) !== null) group.grossRetentionPct = row.GrossRetentionPct;
        });
        // Tổng theo địa điểm (SUM cac worksheet that CUNG dia chi) - de hien 1 dong tong duy nhat
        // truoc nhom worksheet DAU TIEN cua moi dia chi, dung dung so PL/SQL that da doc o tren
        // (khong tinh lai/uoc luong), khop hqd_renderStructure trong frontend/index.html.
        var diaDiemAgg = new Map();
        groups.forEach(function (group) {
            var agg = diaDiemAgg.get(group.diaDiem) || { phiGoc: 0, phiGiuLai: 0, count: 0 };
            agg.phiGoc += group.phiGocDiaDiem || 0; agg.phiGiuLai += group.phiGiuLaiDiaDiem || 0; agg.count += 1;
            diaDiemAgg.set(group.diaDiem, agg);
        });
        var seenDiaDiem = new Set();
        var html = '<div class="detail-toolbar"><h3>Vùng cấu trúc tái</h3><button type="button" class="detail-toggle-all">Mở rộng tất cả</button></div>';
        groups.forEach(function (group) {
            if (!seenDiaDiem.has(group.diaDiem)) {
                seenDiaDiem.add(group.diaDiem);
                var agg = diaDiemAgg.get(group.diaDiem);
                var multiNote = agg.count > 1 ? ' (gộp mọi vị trí/worksheet)' : '';
                html += '<div class="struct-total"><span class="st-label">Tổng theo địa điểm này' + multiNote + '</span><span class="st-val">Phí gốc <b>' + fmt(agg.phiGoc) + '</b> đ · Giữ lại <b class="' + (agg.phiGiuLai < 0 ? 'negative' : '') + '">' + fmt(agg.phiGiuLai) + '</b> đ</span></div>';
            }
            // SUA 2026-09-04 (yeu cau nguoi dung: bo hang "Phi giu lai (vi tri nay)" doc lap - thay
            // bang 2 dong tieu de + so lieu THAT trong <thead> cua chinh bang Chuong trinh, dung
            // format giong het hang tieu de/hang du lieu that cua phan Nhuong ben duoi - xem
            // renderProgramGroups).
            var shortTt = shortStatus(group.status);
            var badge = shortTt ? '<span class="status-pill' + (shortTt === 'NB' ? ' nb' : '') + '">' + escapeHtml(shortTt) + '</span> ' : '';
            // THEM 2026-09-04 (yeu cau nguoi dung: "moi trang thai don can them Ngay hieu luc"):
            // NgayHieuLucViTri da dinh dang san "dd/MM/yyyy" o tang C# (RiStructureViewModel), khong
            // can parse Date o day. Hien rieng cho TUNG vi tri/worksheet (khac dong "Tong theo dia
            // diem" o tren, von gop ca NB+MTA).
            var effCaption = group.ngayHieuLucViTri ? ' <small class="loc-eff-date">(Ngày hiệu lực: ' + escapeHtml(group.ngayHieuLucViTri) + ')</small>' : '';
            html += '<details class="detail-group"><summary class="detail-group-head"><span>' + badge + '📍 ' + escapeHtml(group.diaDiem || 'Không xác định') + effCaption + '</span><span>⌄</span></summary>' +
                '<div class="detail-table-wrap">' + renderProgramGroups(group.rows, 'loc' + (groupIndex++), group) + '</div></details>';
        });
        byId('hqd-drawer-body').innerHTML = html;
        wireToggleAll();
        wireXolToggle();
    }

    // Bảng "Chương trình/Nhà tái" 1 địa điểm - khớp hqd_renderProgramGroups (frontend/index.html):
    // QS/Surplus gộp 1 dòng/treaty (cộng dồn phí+hoa hồng qua các nhà tái tham gia); Fronting/FAC
    // giữ riêng từng dòng/nhà tái; XOL KHÔNG gộp % (mỗi layer có % khác nhau, cộng dồn vô nghĩa) -
    // gom vào 1 dòng tóm tắt "(N layer) — bấm để xem chi tiết", mở ra bảng con theo treaty rồi
    // theo từng layer (nhiều nhà tái/layer gộp thành 1 dòng, sắp theo Excess tăng dần).
    // "ST Nhượng tái" (XolCededSi) CHỈ có ý nghĩa thật cho XOL - PL/SQL không trả giá trị này cho
    // QS/Surplus/FAC (DB_CONTRACT.md mục 4 cột 16), nên 2 nhóm đó luôn hiện "—" ở cột này, không
    // suy diễn/ước lượng số liệu không có thật.
    function renderProgramGroups(rows, keyPrefix, ret) {
        var order = ['QS', 'Surplus'];
        var groups = {}, groupOrder = [], facRows = [], xolRows = [];
        rows.forEach(function (row) {
            var type = classifyRiType(row.RiPolType);
            if (type === 'Fronting/FAC') { facRows.push(row); return; }
            if (type === 'XOL') { xolRows.push(row); return; }
            var gkey = type + '|' + (row.RiPolDesc || '');
            if (!groups[gkey]) { groups[gkey] = { desc: row.RiPolDesc, type: type, rows: [] }; groupOrder.push(gkey); }
            groups[gkey].rows.push(row);
        });
        var bodyRows = '';
        order.forEach(function (t) {
            groupOrder.filter(function (k) { return groups[k].type === t; }).forEach(function (k) {
                var g = groups[k];
                var sumPrem = g.rows.reduce(function (s, r) { return s + (valueOrNull(r.PhiNhuong) || 0); }, 0);
                var sumComm = g.rows.reduce(function (s, r) { return s + (valueOrNull(r.HoaHongTai) || 0); }, 0);
                bodyRows += '<tr><td>' + escapeHtml(g.desc || '') + '</td><td class="right">' + pct(g.rows[0].TyLeCessionPct, 2) + '</td><td class="right">' + fmt(g.rows[0].XolCededSi) + (valueOrNull(g.rows[0].XolCededSi) !== null ? ' đ' : '') + '</td><td class="right">' + fmt(sumPrem) + ' đ</td><td class="right">' + (sumComm ? fmt(sumComm) + ' đ' : '—') + '</td></tr>';
            });
        });
        facRows.forEach(function (row) {
            var pctVal = valueOrNull(row.TyLeCessionPct), premVal = valueOrNull(row.PhiNhuong), commVal = valueOrNull(row.HoaHongTai);
            var hhTxt = (premVal && commVal) ? ' / HH ' + Math.round(commVal / premVal * 100) + '%' : '';
            var label = 'Fac to ' + (row.TenNhaTai || '') + (pctVal !== null ? ' (' + Math.round(pctVal) + '%' + hhTxt + ')' : '');
            bodyRows += '<tr><td class="fac-label">' + escapeHtml(label) + '</td><td class="right">' + pct(row.TyLeCessionPct, 2) + '</td><td class="right">' + fmt(row.XolCededSi) + (valueOrNull(row.XolCededSi) !== null ? ' đ' : '') + '</td><td class="right">' + (premVal ? fmt(row.PhiNhuong) + ' đ' : '—') + '</td><td class="right">' + (commVal ? fmt(row.HoaHongTai) + ' đ' : '—') + '</td></tr>';
        });
        var xolDetailRows = '', xolKey = null;
        if (xolRows.length) {
            xolKey = keyPrefix + '-xol';
            var treatyRe = /\s*-?\s*(?:Layer\s*\d+(?:st|nd|rd|th)?|\d+(?:st|nd|rd|th)\s*Layer)\s*$/i;
            var treatyGroups = {}, treatyOrder = [];
            xolRows.forEach(function (row) {
                var desc = row.RiPolDesc || '';
                var treatyName = desc.replace(treatyRe, '').trim();
                var layerLabel = desc.slice(treatyName.length).replace(/^\s*-\s*/, '').trim() || desc;
                if (!treatyGroups[treatyName]) { treatyGroups[treatyName] = { treatyName: treatyName, layers: [], seenLayer: {} }; treatyOrder.push(treatyName); }
                var g = treatyGroups[treatyName];
                if (!g.seenLayer[layerLabel]) {
                    g.seenLayer[layerLabel] = { label: layerLabel, limitAmt: row.XolLimit, xsAmt: row.XolXs, xolCurr: row.XolCurr, cededSi: row.XolCededSi, prem: valueOrNull(row.PhiNhuong) || 0, deductibleVnd: row.XolDeductibleVnd, ptcps: [] };
                    g.layers.push(g.seenLayer[layerLabel]);
                } else {
                    g.seenLayer[layerLabel].prem += valueOrNull(row.PhiNhuong) || 0;
                }
                g.seenLayer[layerLabel].ptcps.push({ reins: row.TenNhaTai, pct: valueOrNull(row.TyLeNhaTaiPct) });
            });
            var layerCount = treatyOrder.reduce(function (s, tk) { return s + treatyGroups[tk].layers.length; }, 0);
            bodyRows += '<tr class="xol-summary-row"><td class="xol-summary-label"><button type="button" class="xol-summary-toggle" data-xol-toggle="' + xolKey + '" aria-expanded="false">' + escapeHtml(riLabel('XOL')) + ' (' + layerCount + ' layer) <svg class="xol-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg></button></td><td class="right muted" colspan="4">— (bấm để xem chi tiết)</td></tr>';
            treatyOrder.forEach(function (tk) {
                var g = treatyGroups[tk];
                xolDetailRows += '<tr class="xol-treaty-head"><td colspan="5">' + escapeHtml(g.treatyName) + '</td></tr>';
                xolDetailRows += '<tr class="xol-col-head"><td></td><td class="right">Excess Point</td><td class="right">Limit</td><td></td><td></td></tr>';
                g.layers.slice().sort(function (a, b) { return (valueOrNull(a.xsAmt) || 0) - (valueOrNull(b.xsAmt) || 0); }).forEach(function (L, idx) {
                    var xsTxt = fmt(L.xsAmt), limitTxt = fmt(L.limitAmt);
                    var cededSiTxt = valueOrNull(L.cededSi) !== null ? fmt(L.cededSi) + ' đ' : '—';
                    var premTxt = L.prem ? fmt(L.prem) + ' đ' : '0 đ';
                    var deductibleTxt = valueOrNull(L.deductibleVnd) !== null ? fmt(L.deductibleVnd) + ' đ' : (xsTxt !== '—' ? xsTxt + ' ' + (L.xolCurr || 'USD') + ' (chưa quy đổi)' : '—');
                    var ptcpTxt = L.ptcps.map(function (pt) { return (pt.reins || '—') + ' ' + (pt.pct !== null ? pt.pct + '%' : '—'); }).join(' · ');
                    xolDetailRows += '<tr class="xol-layer-row"><td>Lớp ' + (idx + 1) + ' — ' + escapeHtml(L.label) + ' <small>(' + limitTxt + ' XS ' + xsTxt + ' ' + (L.xolCurr || 'USD') + ')</small><div class="xol-ptcp">Nhà tái: ' + escapeHtml(ptcpTxt) + '</div></td><td class="right">' + deductibleTxt + '</td><td class="right">' + cededSiTxt + '</td><td class="right">' + premTxt + '</td><td class="right">—</td></tr>';
                });
            });
        }
        // THEM 2026-09-04 (yeu cau nguoi dung: "cac cot nay thang hang voi nhau" voi bang Chuong
        // trinh) - chen 1 <tr> THAT trong <thead>, dam bao thang cot voi chinh bang nay (khac ban
        // truoc dung div grid doc lap). Chi hien khi PL/SQL that co gia tri.
        // SUA TIEP CUNG NGAY (nguoi dung chi ro vi tri qua anh chup man hinh): dong nay phai nam
        // NGAY TREN dong tieu de cot (trong <thead>, TRUOC dong label "Chuong trinh/Ty le/..."),
        // KHONG PHAI o dau <tbody> (duoi dong label, tren du lieu Nhuong tai that).
        // SUA 2026-09-04 (yeu cau nguoi dung: doi o thu 3 tu "Phi nhuong" (tong phi nhuong ca dia
        // diem, da hien rieng o dong badge dia diem roi - trung lap) sang "Phi giu lai" -
        // ret.phiGiuLaiDiaDiem, cung nguon voi dong "Phi giu lai (vi tri nay)" mau xanh da bo).
        // SUA TIEP (yeu cau nguoi dung: them 1 hang TIEU DE rieng cho 3 cot nay - "Ty le BV giu
        // lai" / "BV's Gross Retention" / "Phi giu lai"). SUA TIEP LAN 2 (yeu cau nguoi dung:
        // "thiet ke lai bo cuc mau sac chuan UI/UX hien dai") - dai stat-strip tinted nen #f7fafd
        // (class retain-label-row/retain-value-row, dinh nghia o search.css), gia tri to mau theo
        // y nghia (xanh duong=ty le, amber=Gross Retention, xanh la=Phi giu lai - dong bo dung mau
        // KPI da chuan hoa toan app .drawer-kpi.green/blue/amber).
        var grossRetentionVnd = ret ? valueOrNull(ret.grossRetentionVnd) : null;
        var grossRetentionPct = ret ? valueOrNull(ret.grossRetentionPct) : null;
        var retainedPremium = ret ? valueOrNull(ret.phiGiuLaiDiaDiem) : null;
        var hasRetention = grossRetentionVnd !== null && isFinite(grossRetentionVnd);
        var hasRetentionPct = grossRetentionPct !== null && isFinite(grossRetentionPct);
        var retainLabelRow = hasRetention
            ? '<tr class="retain-label-row"><th></th><th class="right">Tỷ lệ BV giữ lại</th><th class="right">BV\'s Gross Retention</th><th class="right">Phí giữ lại</th><th></th></tr>'
            : '';
        var pctTitle = hasRetentionPct ? ' title="' + escapeHtml(grossRetentionPct + '%') + '"' : '';
        var pctText = hasRetentionPct ? grossRetentionPct.toFixed(2) + '%' : '—';
        var retainedPremiumText = retainedPremium !== null && isFinite(retainedPremium) ? fmt(retainedPremium) + ' đ' : '—';
        var retainRow = hasRetention
            ? '<tr class="retain-value-row"><td></td><td class="right rv-pct"' + pctTitle + '>' + pctText + '</td><td class="right rv-gross">' + fmt(grossRetentionVnd) + ' đ</td><td class="right rv-retained">' + retainedPremiumText + '</td><td></td></tr>'
            : '';
        // THEM 2026-09-04 (yeu cau nguoi dung: "vung du lieu thang cot voi nhau" - GIUA CAC THE
        // dia diem/vi tri khac nhau, khong chi trong CUNG 1 bang): moi the dia diem la 1 <table>
        // rieng, do rong tu dong theo noi dung cua chinh no (VD ten treaty Fac dai o MTA lam cot
        // 1 rong hon NB) nen truoc day KHONG thang cot giua cac the. Co dinh do rong 5 cot bang
        // <colgroup> + table-layout:fixed (INLINE style, KHONG sua .detail-table dung chung voi
        // .steps-table trong search.css) de dam bao thang cot dong nhat cho MOI the. Do rong da
        // dieu chinh (29/16/22/17/16%) qua thu nghiem thuc te tren prototype de nhan "BV's Gross
        // Retention"/"Tỷ lệ BV giữ lại" vua khit khong xuong dong/tran chu.
        return '<table class="detail-table" style="table-layout:fixed"><colgroup><col style="width:29%"><col style="width:16%"><col style="width:22%"><col style="width:17%"><col style="width:16%"></colgroup><thead>' + retainLabelRow + retainRow + '<tr><th>Chương trình</th><th class="right">Tỷ lệ tái</th><th class="right">ST Nhượng tái</th><th class="right">Phí nhượng</th><th class="right">Hoa hồng</th></tr></thead><tbody>' + bodyRows + '</tbody>' +
            (xolKey ? '<tbody class="xol-detail-body" data-xol-body="' + xolKey + '" hidden>' + xolDetailRows + '</tbody>' : '') + '</table>';
    }
    function wireXolToggle() {
        byId('hqd-drawer-body').querySelectorAll('.xol-summary-toggle').forEach(function (button) {
            function toggle() {
                var body = byId('hqd-drawer-body').querySelector('[data-xol-body="' + button.dataset.xolToggle + '"]');
                if (!body) return;
                var willShow = body.hidden;
                body.hidden = !willShow;
                button.closest('tr').classList.toggle('open', willShow);
                button.setAttribute('aria-expanded', String(willShow));
            }
            button.addEventListener('click', toggle);
        });
    }

    // Khớp hqd_renderClaims/hqd_renderClaimCard (frontend/index.html dòng 4325-4398): gom theo
    // (SoHoSo, DiaDiem) - dung grain that PRC_HQ_GET_CLAIMS (fan-out theo địa điểm cho 1 hồ sơ có
    // nhiều địa điểm) - thành 1 thẻ/hồ sơ, rồi nhóm các thẻ đó theo địa điểm (khung ngoài, cùng
    // kiểu với tab Cấu trúc tái). Mỗi thẻ hồ sơ liệt kê từng dòng "Phân bổ bồi thường" (GROSS/QS/
    // SP1/SP2/XOL/FRONTING/UNMATCHED) + số tiền. Bổ sung so với prototype (yêu cầu người dùng
    // 2026-09-03): dòng GROSS có thêm 2 dòng phụ "Đã thanh toán"/"Ước BT" cho rõ ràng hơn.
    var CLAIM_LABEL = { GROSS: 'Tổn thất gốc (GROSS)', QS: 'Thu đòi Quota Share', SP1: 'Thu đòi Surplus', SP2: 'Thu đòi Surplus (lớp 2)', XOL: 'Thu đòi XOL', FRONTING: 'Thu đòi Fronting', UNMATCHED: 'Thu đòi Fac/tạm thời (UNMATCHED)' };
    var CLAIM_TONE = { GROSS: ' claim-gross', XOL: ' claim-xol', FRONTING: ' claim-purple', UNMATCHED: ' claim-purple' };
    // Sắp xếp riêng các dòng XOL theo số lớp 1,2,3,4,5 (khớp thứ tự tab Cấu trúc tái) - giữ
    // nguyên vị trí GROSS/QS/Surplus, chỉ đổi chỗ nội dung các ô vốn là XOL cho đúng thứ tự lớp.
    // Claims không có cột số (XolXs) như RI_STRUCTURE nên phải lấy số lớp từ text MoTaChuongTrinh
    // ("... - Layer 4th" -> 4) - chỉ dùng ở đây, không dùng cách này cho Cấu trúc tái (đã có khoá
    // số thật ở đó, đáng tin cậy hơn).
    function xolLayerNumber(desc) {
        var m = /Layer\s*(\d+)/i.exec(desc || '');
        return m ? parseInt(m[1], 10) : 999;
    }
    function sortXolItems(items) {
        var sorted = items.slice();
        var xolIdx = [];
        sorted.forEach(function (x, i) { if (x.LoaiPhanBo === 'XOL') xolIdx.push(i); });
        var xolSorted = xolIdx.map(function (i) { return sorted[i]; }).sort(function (a, b) { return xolLayerNumber(a.MoTaChuongTrinh) - xolLayerNumber(b.MoTaChuongTrinh); });
        xolIdx.forEach(function (i, k) { sorted[i] = xolSorted[k]; });
        return sorted;
    }
    function renderClaimFileCard(file) {
        var gross = file.items.filter(function (x) { return x.LoaiPhanBo === 'GROSS'; })[0];
        // SUA 2026-09-04 (yeu cau nguoi dung: gop "trang thai don - hieu luc" vao CHUNG 1 dong voi
        // "Ngay ton that", dat TRUOC no - VD "NB - Hiệu lực: 31/07/2026; Ngày tổn thất: ..." - thay
        // vi tach rieng badge dinh vao tieu de "Ho so BT" nhu ban truoc). NgayHieuLucViTri da dinh
        // dang san "dd/MM/yyyy" o tang C# (ClaimViewModel), khong can parse Date o day.
        var posShortTt = shortStatus(file.trangThaiViTri);
        // SUA 2026-09-04 (yeu cau nguoi dung: "can chu trong o boi do thang cot, khong bi lech" - doi
        // chieu nhieu the BT co do dai so tien khac nhau): dung grid 3 cot do rong CO DINH
        // (.claim-file-sub-grid) thay vi 1 chuoi text noi tiep, de "Ngay ton that"/"Gross" thang
        // hang giua cac the.
        var posCell = posShortTt ? (posShortTt + (file.ngayHieuLucViTri ? ' - Hiệu lực: ' + escapeHtml(file.ngayHieuLucViTri) : '')) : '';
        var subtitle = '<span class="claim-file-sub-grid">' +
            '<span>' + posCell + '</span>' +
            '<span>Ngày tổn thất: ' + escapeHtml(file.ngayTonThat || '') + '</span>' +
            '<span class="right">' + (gross ? 'Gross: ' + fmt(gross.TongTonThatVnd) : '') + '</span>' +
            '</span>';
        var rowsHtml = sortXolItems(file.items).map(function (x) {
            var label = CLAIM_LABEL[x.LoaiPhanBo] || x.LoaiPhanBo;
            var detail = x.LoaiPhanBo === 'GROSS'
                ? '<div class="claim-gross-detail"><span>Đã thanh toán: <b>' + fmt(x.DaThanhToanVnd) + '</b></span><span>Ước BT: <b>' + fmt(x.UocBoiThuongVnd) + '</b></span></div>'
                : '';
            var tr = '<tr class="claim-row' + (CLAIM_TONE[x.LoaiPhanBo] || '') + '"><td>' + escapeHtml(label) + ' <small>' + escapeHtml(x.MoTaChuongTrinh || '') + '</small>' + detail + '</td><td class="right">' + fmt(x.TongTonThatVnd) + '</td></tr>';
            // THEM 2026-09-04 (yeu cau nguoi dung: "hien BT giu lai ngay duoi dong Tong that goc" -
            // doi chieu man hinh Core "Claim RI Worksheet" - "Net Claim for Worksheet"): dong BT giu
            // lai CHI xuat hien ngay sau dong GROSS, lay THANG tu PRC_HQ_GET_CLAIMS.bt_giu_lai_vnd
            // (khong tinh lai o frontend, xem CLAUDE.md muc 4).
            var netRow = (x.LoaiPhanBo === 'GROSS' && x.BtGiuLaiVnd !== null && x.BtGiuLaiVnd !== undefined)
                ? '<tr class="claim-row claim-net-row"><td>BT giữ lại <small>(Gross − Thu đòi tái)</small></td><td class="right">' + fmt(x.BtGiuLaiVnd) + '</td></tr>'
                : '';
            return tr + netRow;
        }).join('');
        return '<details class="detail-group claim-file"><summary class="detail-group-head claim-file-head"><span><b>Hồ sơ BT: ' + escapeHtml(file.soHoSo || '') + '</b></span><span class="claim-file-sub">' + subtitle + ' ⌄</span></summary>' +
            '<div class="detail-table-wrap"><table class="detail-table"><thead><tr><th>Phân bổ bồi thường</th><th class="right">Số tiền (VND)</th></tr></thead><tbody>' + rowsHtml + '</tbody></table></div></details>';
    }
    function renderClaims(rows) {
        if (!rows.length) { byId('hqd-drawer-body').innerHTML = '<div class="detail-empty">Không có dữ liệu bồi thường cho kỳ hạn này.</div>'; return; }
        var byFile = new Map(), fileOrder = [];
        rows.forEach(function (row) {
            var key = (row.SoHoSo || '') + '||' + (row.DiaDiem || '');
            // THEM 2026-09-04 (yeu cau nguoi dung: "hien trang thai don, ngay hieu luc gan voi
            // HSBT" - KHONG PHAI trang thai noi bo cua ho so BT): TrangThaiViTri/NgayHieuLucViTri
            // (PRC_HQ_GET_CLAIMS) fan-out tren MOI dong, chi can lay o dong dau tien.
            if (!byFile.has(key)) { byFile.set(key, { soHoSo: row.SoHoSo, ngayTonThat: row.NgayTonThat, diaDiem: row.DiaDiem, trangThaiViTri: row.TrangThaiViTri, ngayHieuLucViTri: row.NgayHieuLucViTri, items: [] }); fileOrder.push(key); }
            byFile.get(key).items.push(row);
        });
        var byLoc = new Map(), locOrder = [];
        fileOrder.forEach(function (key) {
            var file = byFile.get(key), lk = file.diaDiem || '';
            if (!byLoc.has(lk)) { byLoc.set(lk, []); locOrder.push(lk); }
            byLoc.get(lk).push(file);
        });
        var html = '<div class="detail-toolbar"><h3>Vùng dữ liệu bồi thường</h3><button type="button" class="detail-toggle-all">Mở rộng tất cả</button></div>';
        if (locOrder.length === 1 && locOrder[0] === '') {
            byLoc.get('').forEach(function (file) { html += renderClaimFileCard(file); });
        } else {
            var item = calculatedRows[drawerIndex], isVessel = item && (item.search.NhomNghiepVu === 'Hull' || item.search.NhomNghiepVu === 'Cargo');
            var icon = isVessel ? '🚢' : '📍';
            locOrder.forEach(function (loc) {
                html += '<div class="claim-loc-group"><div class="claim-loc-head">' + icon + ' ' + escapeHtml(loc || '(chưa xác định địa điểm)') + '</div><div class="claim-loc-body">' +
                    byLoc.get(loc).map(renderClaimFileCard).join('') + '</div></div>';
            });
        }
        byId('hqd-drawer-body').innerHTML = html;
        wireToggleAll();
    }

    function wireToggleAll() {
        var button = byId('hqd-drawer-body').querySelector('.detail-toggle-all');
        if (!button) return;
        button.addEventListener('click', function () {
            var details = byId('hqd-drawer-body').querySelectorAll('details.detail-group');
            var shouldOpen = Array.prototype.some.call(details, function (item) { return !item.open; });
            details.forEach(function (item) { item.open = shouldOpen; });
            button.textContent = shouldOpen ? 'Thu gọn tất cả' : 'Mở rộng tất cả';
        });
    }

    function fmtUsd(value) { var number = valueOrNull(value); return number === null ? '—' : number.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' USD'; }
    function effTone(effPct) { var eff = valueOrNull(effPct); return eff === null ? '' : eff >= 15 ? 'eff-good' : eff >= 0 ? 'eff-warn' : 'eff-bad'; }
    // Khớp hqd_renderSteps (frontend/index.html dòng 4469-4605): bước 8 (Thu đòi XOL) là bước DUY
    // NHẤT có bảng chi tiết bấm-mở (10 bước còn lại chỉ hiện công thức mapping, không toggle) -
    // hiện "Rec X VND / RIP Y USD / = Z VND" khi có thu hồi thật, "Không có thu hồi XOL" khi
    // không; bước 5 (Doanh thu thuần) in đậm + số màu xanh; bước 10 (Hiệu quả dịch vụ) tô màu theo
    // ngưỡng (>=15% xanh lá/>=0% hổ phách/<0% đỏ) - dùng lại đúng class eff-good/eff-warn/eff-bad
    // đã có sẵn cho badge header Drawer.
    function renderSteps(xolLayers) {
        var item = calculatedRows[drawerIndex], c = item.calc;
        var xolTriggered = (valueOrNull(c.XolRecoveryVnd) || 0) > 0 || (valueOrNull(c.PhiTaiLapVnd) || 0) > 0;
        var xolValue = xolTriggered
            ? 'Rec ' + fmt(c.XolRecoveryVnd) + ' VND<div class="xol-rip">RIP ' + fmtUsd(c.PhiTaiLapUsd) + '</div><div class="xol-rip">= ' + fmt(c.PhiTaiLapVnd) + ' VND</div>'
            : '<span class="muted">Không có thu hồi XOL</span>';
        // SUA 2026-09-04 (yeu cau nguoi dung: doi dong ghi chu cong thuc buoc 1/2/4/5 theo dung
        // wording trong bang doi chieu Excel nguoi dung gui - CHI doi CHU HIEN THI, KHONG doi gia
        // tri/cong thuc tinh THAT (van dung nguyen c.PhiDongBaoHiem/c.PhiGiuLai/... nhu cu). Buoc 3
        // GIU NGUYEN (khong co dong "Doi thanh" tuong ung trong bang Excel).
        var steps = [
            ['1', 'Tổng phí ĐBH của BV', 'Phí gốc đồng = Phí gốc 100% * tỷ lệ đồng BV', fmt(c.PhiDongBaoHiem) + ' VND'],
            ['2', 'Tổng phí giữ lại', 'Phí gốc đồng - Tổng phí nhượng tái', fmt(c.PhiGiuLai) + ' VND'],
            ['3', 'Tổng phí nhượng TBH tỷ lệ', 'Tổng phí nhượng tái = Phí QS + Phí Surp + Phí Fac + Phí Fronting', fmt(c.PhiNhuongTbh) + ' VND'],
            ['4', 'Tổng hoa hồng nhượng TBH tỷ lệ', 'Tổng hoa hồng tái = Hoa hồng QS + Hoa hồng SP + Σ Hoa hồng FAC + Σ Hoa hồng Fronting', fmt(c.TongHoaHongNhuongTbh) + ' VND'],
            ['5', '<b>Doanh thu thuần</b>', 'Doanh thu thuần = Tổng phí giữ lại + Tổng hoa hồng tái', '<b class="step-dtt">' + fmt(c.Dtt) + ' VND</b>'],
            ['6', 'Tổng bồi thường ĐBH', 'Tổng bồi thường 100% × tỷ lệ đồng BV', fmt(c.TonThatGoVnd) + ' VND'],
            ['7', 'Tổng thu đòi bồi thường nhượng TBH tỷ lệ', 'Thu đòi QS + Surp + FAC + Fronting + ...', fmt(c.TonThatNhuongTyLeVnd) + ' VND'],
            ['8', 'Tổng Thu đòi bồi thường HĐ XOL', '', xolValue],
            ['9', 'Tổng bồi thường giữ lại Net', 'Tổng bồi thường ĐBH − Tổng Bồi thường (QS + Surp + FAC + Fronting + XOL) tất cả các vụ', fmt(c.TonThatGiuLaiVnd) + ' VND']
        ];
        // THEM 2026-09-04 (yeu cau nguoi dung: bo sung Deposit/Percent/Number theo tung lop XOL,
        // doi chieu man hinh "Coverage Details" cua Core that) - nguon PL/SQL that PRC_HQ_GET_XOL_
        // LAYERS.DepPremAmount ("Deposit", da co san tu truoc, chua hien thi len UI)/CostPercentage
        // ("Percent" - CHI co gia tri khi basis='2')/Reinstatements ("Number"). Khong co du lieu ->
        // hien "—", khong suy dien.
        var xolDetail = xolLayers.length ? '<div class="detail-table-wrap"><table class="detail-table"><thead><tr><th>Lớp</th><th class="right">Excess</th><th class="right">Limit</th><th class="right">Thu đòi (VND)</th><th class="right">RIP</th><th class="right">Deposit</th><th class="right">Percent</th><th class="right">Number</th></tr></thead><tbody>' +
            xolLayers.map(function (row) {
                var hit = (valueOrNull(row.RecoveryVnd) || 0) > 0;
                var deposit = valueOrNull(row.DepPremAmount) !== null ? fmt(row.DepPremAmount) + ' ' + escapeHtml(row.InExcessOfCurr || '') : '—';
                var percent = valueOrNull(row.CostPercentage) !== null ? row.CostPercentage + '%' : '—';
                var number = valueOrNull(row.Reinstatements) !== null ? row.Reinstatements : '—';
                return '<tr class="' + (hit ? 'xol-layer-hit' : '') + '"><td>Lớp ' + escapeHtml(row.ThuTuLop) + ' <small>' + escapeHtml(row.MoTaLop || '') + '</small></td><td class="right">' + fmt(row.InExcessOfAmt) + ' ' + escapeHtml(row.InExcessOfCurr || '') + '</td><td class="right">' + fmt(row.LimitAmount) + ' ' + escapeHtml(row.LimitCurrency || '') + '</td><td class="right">' + fmt(row.RecoveryVnd) + '</td><td class="right">' + (hit ? fmtUsd(row.PhiTaiLapUsd) : '—') + '</td><td class="right">' + deposit + '</td><td class="right">' + percent + '</td><td class="right">' + number + '</td></tr>';
            }).join('') + '</tbody></table></div>' : '';
        var html = '<h3>Vùng tính toán hiệu quả — 10 bước</h3><table class="steps-table"><tbody>' + steps.map(function (step) {
            var hasDetail = step[0] === '8' && xolDetail;
            var chev = hasDetail ? ' <svg class="step-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>' : '';
            var clickAttr = hasDetail ? ' data-step-toggle="8"' : '';
            var toggleButton = hasDetail ? '<button type="button" class="step-toggle-button" aria-expanded="false" aria-label="Mở chi tiết bước 8">' + chev + '</button>' : '';
            return '<tr class="step-row"' + clickAttr + '><td>' + step[0] + '</td><td>' + step[1] + '<small><em>' + step[2] + '</em></small></td><td class="right">' + step[3] + toggleButton + '</td></tr>' +
                (hasDetail ? '<tr class="step-detail-row" data-step-detail="8" hidden><td colspan="3">' + xolDetail + '</td></tr>' : '');
        }).join('') +
            '<tr class="final"><td>10</td><td><b>Hiệu quả dịch vụ</b><small><em>(Doanh thu thuần − Tổng BT giữ lại Net − Tổng Phí tái lập của tất cả các Layer) / Phí gốc Công ty nhượng tái</em></small></td><td class="right ' + effTone(c.HieuQuaDichVuPct) + '">' + pct(c.HieuQuaDichVuPct, 2) + '</td></tr>' +
            '</tbody></table>';
        var warnings = [];
        if ((valueOrNull(c.PhiGiuLai) || 0) < 0) warnings.push('Phí giữ lại âm — số Core thật, không phải lỗi hiển thị');
        if ((valueOrNull(c.TonThatGiuLaiVnd) || 0) < 0) warnings.push('Tổn thất giữ lại âm — số Core thật, không phải lỗi hiển thị');
        if (warnings.length) html += '<div class="business-warning"><strong>⚠ Cảnh báo cần soát lại (' + warnings.length + ')</strong>' + warnings.map(function (warning) { return '<div>' + warning + '</div>'; }).join('') + '</div>';
        byId('hqd-drawer-body').innerHTML = html;
        byId('hqd-drawer-body').querySelectorAll('[data-step-toggle]').forEach(function (row) {
            var button = row.querySelector('.step-toggle-button');
            function toggle() {
                var detail = byId('hqd-drawer-body').querySelector('[data-step-detail="' + row.dataset.stepToggle + '"]');
                if (!detail) return;
                var willShow = detail.hidden;
                detail.hidden = !willShow;
                row.classList.toggle('open', willShow);
                button.setAttribute('aria-expanded', String(willShow));
                button.setAttribute('aria-label', (willShow ? 'Thu gọn' : 'Mở') + ' chi tiết bước 8');
            }
            button.addEventListener('click', toggle);
            row.addEventListener('click', function (event) { if (!event.target.closest('.step-toggle-button')) toggle(); });
        });
    }

    var exportTemplatePromise = null;
    var OOXML_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';

    function loadExportTemplate() {
        if (!exportTemplatePromise) {
            exportTemplatePromise = fetch(urls.exportTemplate, { credentials: 'same-origin' }).then(function (response) {
                if (!response.ok) throw new Error('Không thể tải mẫu báo cáo Excel.');
                return response.arrayBuffer();
            }).catch(function (error) {
                exportTemplatePromise = null;
                throw error;
            });
        }
        return exportTemplatePromise.then(function (buffer) { return buffer.slice(0); });
    }

    function getPackageEntry(container, entryPath) {
        var entry = window.XLSX.CFB.find(container, entryPath);
        if (!entry) throw new Error('Mẫu Excel thiếu thành phần bắt buộc: ' + entryPath);
        return entry;
    }

    function parsePackageXml(entry) {
        var xml = new TextDecoder('utf-8').decode(entry.content);
        var documentXml = new DOMParser().parseFromString(xml, 'application/xml');
        if (documentXml.getElementsByTagName('parsererror').length) throw new Error('Mẫu Excel có XML không hợp lệ.');
        return documentXml;
    }

    function savePackageXml(entry, documentXml) {
        entry.content = new TextEncoder().encode(new XMLSerializer().serializeToString(documentXml));
        entry.size = entry.content.length;
    }

    function childElements(parent, localName) {
        return Array.prototype.filter.call(parent.childNodes, function (node) {
            return node.nodeType === 1 && (!localName || node.localName === localName);
        });
    }

    function rowCell(row, column) {
        var cells = childElements(row, 'c');
        for (var i = 0; i < cells.length; i += 1) {
            if ((cells[i].getAttribute('r') || '').replace(/[0-9]/g, '') === column) return cells[i];
        }
        throw new Error('Mẫu Excel thiếu ô ' + column + row.getAttribute('r') + '.');
    }

    function moveRow(row, targetRow) {
        row.setAttribute('r', String(targetRow));
        childElements(row, 'c').forEach(function (cell) {
            var column = (cell.getAttribute('r') || '').replace(/[0-9]/g, '');
            cell.setAttribute('r', column + targetRow);
        });
        return row;
    }

    function clearCell(cell) {
        cell.removeAttribute('t');
        while (cell.firstChild) cell.removeChild(cell.firstChild);
    }

    function setCellValue(documentXml, cell, value) {
        clearCell(cell);
        if (value === null || value === undefined || value === '') return;
        if (typeof value === 'number' && isFinite(value)) {
            var numericValue = documentXml.createElementNS(OOXML_NS, 'v');
            numericValue.textContent = String(value);
            cell.appendChild(numericValue);
            return;
        }
        cell.setAttribute('t', 'inlineStr');
        var inlineString = documentXml.createElementNS(OOXML_NS, 'is');
        var textValue = documentXml.createElementNS(OOXML_NS, 't');
        textValue.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'xml:space', 'preserve');
        textValue.textContent = String(value);
        inlineString.appendChild(textValue);
        cell.appendChild(inlineString);
    }

    function setCellFormula(documentXml, cell, formula) {
        clearCell(cell);
        var formulaNode = documentXml.createElementNS(OOXML_NS, 'f');
        formulaNode.textContent = formula;
        cell.appendChild(formulaNode);
        cell.appendChild(documentXml.createElementNS(OOXML_NS, 'v'));
    }

    function appendMerge(documentXml, mergeCells, reference) {
        var mergeCell = documentXml.createElementNS(OOXML_NS, 'mergeCell');
        mergeCell.setAttribute('ref', reference);
        mergeCells.appendChild(mergeCell);
    }

    function updateWorkbookRanges(container, lastDataRow, finalRow) {
        var workbookEntry = getPackageEntry(container, '/xl/workbook.xml');
        var workbookXml = parsePackageXml(workbookEntry);
        Array.prototype.forEach.call(workbookXml.getElementsByTagNameNS(OOXML_NS, 'definedName'), function (definedName) {
            var name = definedName.getAttribute('name');
            if (name === '_xlnm._FilterDatabase') definedName.textContent = "'Hiệu quả đơn'!$A$6:$S$" + lastDataRow;
            if (name === '_xlnm.Print_Area') definedName.textContent = "'Hiệu quả đơn'!$A$1:$S$" + finalRow;
        });
        savePackageXml(workbookEntry, workbookXml);
    }

    function buildWorkbookFromTemplate(buffer, rowsAoa) {
        var container = window.XLSX.CFB.read(new Uint8Array(buffer), { type: 'array' });
        var worksheetEntry = getPackageEntry(container, '/xl/worksheets/sheet1.xml');
        var worksheetXml = parsePackageXml(worksheetEntry);
        var sheetData = worksheetXml.getElementsByTagNameNS(OOXML_NS, 'sheetData')[0];
        var sourceRows = {};
        childElements(sheetData, 'row').forEach(function (row) {
            sourceRows[row.getAttribute('r')] = row.cloneNode(true);
        });
        ['7', '8', '17', '19', '21', '22', '23'].forEach(function (rowNumber) {
            if (!sourceRows[rowNumber]) throw new Error('Mẫu Excel thiếu dòng khuôn ' + rowNumber + '.');
        });

        childElements(sheetData, 'row').forEach(function (row) {
            if (Number(row.getAttribute('r')) >= 7) sheetData.removeChild(row);
        });

        var columns = 'ABCDEFGHIJKLMNOPQRS'.split('');
        rowsAoa.forEach(function (values, index) {
            var targetRow = 7 + index;
            var row = moveRow(sourceRows[index % 2 === 0 ? '7' : '8'].cloneNode(true), targetRow);
            columns.forEach(function (column, columnIndex) {
                setCellValue(worksheetXml, rowCell(row, column), values[columnIndex]);
            });
            sheetData.appendChild(row);
        });

        var lastDataRow = 6 + rowsAoa.length;
        var totalRowNumber = lastDataRow + 1;
        var noteRowNumber = totalRowNumber + 2;
        var spacerRowNumber = totalRowNumber + 4;
        var signatureTitleRow = totalRowNumber + 5;
        var signatureLineRow = totalRowNumber + 6;
        var finalRow = totalRowNumber + 7;
        var totalRow = moveRow(sourceRows['17'].cloneNode(true), totalRowNumber);
        setCellValue(worksheetXml, rowCell(totalRow, 'A'), 'TỔNG CỘNG');
        columns.slice(1).forEach(function (column) { setCellValue(worksheetXml, rowCell(totalRow, column), ''); });
        ['F', 'H', 'I', 'J', 'K', 'L', 'M', 'N'].forEach(function (column) {
            setCellFormula(worksheetXml, rowCell(totalRow, column), 'SUM(' + column + '7:' + column + lastDataRow + ')');
        });
        setCellFormula(worksheetXml, rowCell(totalRow, 'P'), 'IF(H' + totalRowNumber + '=0,"",SUMPRODUCT(H7:H' + lastDataRow + ',P7:P' + lastDataRow + ')/H' + totalRowNumber + ')');
        sheetData.appendChild(totalRow);
        sheetData.appendChild(moveRow(sourceRows['19'].cloneNode(true), noteRowNumber));
        sheetData.appendChild(moveRow(sourceRows['21'].cloneNode(true), spacerRowNumber));
        sheetData.appendChild(moveRow(sourceRows['22'].cloneNode(true), signatureTitleRow));
        sheetData.appendChild(moveRow(sourceRows['23'].cloneNode(true), signatureLineRow));

        var titleRow = sourceRows['3'] || childElements(sheetData, 'row').filter(function (row) { return row.getAttribute('r') === '3'; })[0];
        setCellValue(worksheetXml, rowCell(titleRow, 'A'), 'Ngày xuất: ' + new Date().toLocaleDateString('vi-VN') + '  |  Tỷ giá USD/VND: ' + Number(byId('hqd-fx').value).toLocaleString('vi-VN') + '  |  Thông số tái lập: cấu hình treaty (Core InsureJ)');
        if (sourceRows['3']) {
            var oldTitleRow = childElements(sheetData, 'row').filter(function (row) { return row.getAttribute('r') === '3'; })[0];
            sheetData.replaceChild(titleRow, oldTitleRow);
        }

        var dimension = worksheetXml.getElementsByTagNameNS(OOXML_NS, 'dimension')[0];
        dimension.setAttribute('ref', 'A1:S' + finalRow);
        var autoFilter = worksheetXml.getElementsByTagNameNS(OOXML_NS, 'autoFilter')[0];
        if (autoFilter) autoFilter.setAttribute('ref', 'A6:S' + lastDataRow);
        var conditionalFormatting = worksheetXml.getElementsByTagNameNS(OOXML_NS, 'conditionalFormatting')[0];
        if (conditionalFormatting) conditionalFormatting.setAttribute('sqref', 'P7:P' + lastDataRow);

        var mergeCells = worksheetXml.getElementsByTagNameNS(OOXML_NS, 'mergeCells')[0];
        childElements(mergeCells, 'mergeCell').forEach(function (mergeCell) {
            var reference = mergeCell.getAttribute('ref') || '';
            var firstRow = Number((reference.match(/[0-9]+/) || ['0'])[0]);
            if (firstRow >= 7) mergeCells.removeChild(mergeCell);
        });
        appendMerge(worksheetXml, mergeCells, 'A' + totalRowNumber + ':E' + totalRowNumber);
        appendMerge(worksheetXml, mergeCells, 'A' + noteRowNumber + ':S' + noteRowNumber);
        appendMerge(worksheetXml, mergeCells, 'L' + signatureTitleRow + ':S' + signatureTitleRow);
        appendMerge(worksheetXml, mergeCells, 'L' + signatureLineRow + ':S' + signatureLineRow);
        mergeCells.setAttribute('count', String(childElements(mergeCells, 'mergeCell').length));

        savePackageXml(worksheetEntry, worksheetXml);
        updateWorkbookRanges(container, lastDataRow, finalRow);
        // NEN 2026-09-09: XLSX la package ZIP nhung CFB.write mac dinh luu cac XML
        // khong DEFLATE. Bao cao Fire ca nam do that: 6.963 KB, nen RAR con 445 KB.
        // Bat compression ngay trong XLSX de file van mo truc tiep bang Excel, khong
        // boc them .rar/.zip va khong thay doi du lieu/cong thuc/mau bao cao.
        return window.XLSX.CFB.write(container, { type: 'array', fileType: 'zip', compression: true });
    }

    function saveExcelWorkbook(rowsAoa, count) {
        var fileName = 'HieuQua_DonPhatSinh_' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '.xlsx';
        return loadExportTemplate().then(function (buffer) {
            var bytes = buildWorkbookFromTemplate(buffer, rowsAoa);
            return recompressExcelPackage(bytes, fileName);
        }).then(function (blob) {
            var url = URL.createObjectURL(blob);
            var link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
            toast('Đã xuất Excel theo mẫu mới: ' + count + ' đơn', 'success');
        });
    }

    // THEM 2026-09-10: SheetJS van dung workbook va nen so bo o client de payload
    // upload nho. Server CHI giai/nen lai tung entry OOXML bang .NET Optimal; khong
    // nhan JSON nghiep vu va khong thay doi bat ky XML/cong thuc/dinh dang nao.
    function recompressExcelPackage(bytes, fileName) {
        var token = document.querySelector('input[name="__RequestVerificationToken"]');
        if (!urls.recompressExcel || !token || !token.value) {
            return Promise.reject(new Error('Không thể xác thực yêu cầu nén file Excel.'));
        }

        var contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        var formData = new FormData();
        formData.append('__RequestVerificationToken', token.value);
        formData.append('excelFile', new Blob([bytes], { type: contentType }), fileName);

        return fetch(urls.recompressExcel, {
            method: 'POST',
            credentials: 'same-origin',
            body: formData
        }).then(function (response) {
            if (response.ok) return response.blob();
            return response.text().then(function (text) {
                var message = 'Không thể tối ưu dung lượng file Excel. Vui lòng thử lại.';
                try {
                    var body = JSON.parse(text);
                    if (body && body.message) message = body.message;
                } catch (ignore) { }
                throw new Error(message);
            });
        }).then(function (blob) {
            if (!blob || !blob.size) throw new Error('Server trả về file Excel rỗng.');
            return blob;
        });
    }

    function buildExportRow(searchRow, calcRow, status) {
        var efficiency = valueOrNull(calcRow.HieuQuaDichVuPct);
        var avgCommPct = valueOrNull(calcRow.HongNhuongTaiTrungBinhPct);
        return [searchRow.SoDon, searchRow.NgayHieuLuc, searchRow.NhomNghiepVu, searchRow.TenSanPhamGoc, status, valueOrNull(calcRow.PhiDongBaoHiemGoc), valueOrNull(calcRow.BaovietCoinsPct), valueOrNull(calcRow.PhiDongBaoHiem), valueOrNull(calcRow.PhiNhuongTbh), valueOrNull(calcRow.PhiGiuLai), valueOrNull(calcRow.TonThatGoVnd), valueOrNull(calcRow.TonThatGiuLaiVnd), (valueOrNull(calcRow.TonThatNhuongTyLeVnd) || 0) + (valueOrNull(calcRow.XolRecoveryVnd) || 0), valueOrNull(calcRow.PhiTaiLapVnd), avgCommPct === null ? '' : Number(avgCommPct) / 100, efficiency === null ? '' : Number(efficiency) / 100, searchRow.Cat || '', searchRow.NganhNghe || '', searchRow.CongTyThanhVien || ''];
    }

    // SUA 2026-09-05 (yeu cau nguoi dung: tach 2 truong hop Xuat Excel - CHI "chon tat ca" (RunBatch, co
    // the rat nhieu dong khong nam san o client) moi can goi server GetTinhToanExport, gay 1 nhip cho.
    // "Chon rieng le" (RunList) danh sach von da nho/bi gioi han boi cac dong da tich tren giao dien -
    // xuat NGAY tu calculatedRows nhu ban dau, KHONG bat khach cho lan nao ca. Dung lastCalcWasSelectAll
    // (chup luc bam Tinh toan), khong doc selectAllMode "song" luc bam Xuat Excel - xem khai bao bien.
    function exportExcel() {
        if (typeof window.XLSX === 'undefined') { toast('Thư viện Excel chưa tải', 'error'); return; }
        if (lastCalcWasSelectAll) exportExcelFromServer(); else exportExcelFromClient();
    }

    function exportExcelFromClient() {
        if (!calculatedRows.length) { toast('Chưa có kết quả để xuất. Vui lòng tính hiệu quả trước.', 'warning'); return; }
        setExportLock(true);
        var rowsAoa = calculatedRows.map(function (item) {
            return buildExportRow(item.search, item.calc, shortStatus(item.search.TrangThai));
        });
        saveExcelWorkbook(rowsAoa, calculatedRows.length).catch(function (error) {
            toast(error && error.message ? error.message : 'Không thể tạo báo cáo Excel.', 'error');
        }).then(function () {
            setExportLock(false);
        });
    }

    function exportCurrentDrawerRow() {
        if (typeof window.XLSX === 'undefined') { toast('Thư viện Excel chưa tải', 'error'); return; }
        if (!calculatedRows.length || !calculatedRows[drawerIndex]) { toast('Không có kết quả đơn để xuất.', 'warning'); return; }
        var item = calculatedRows[drawerIndex], s = item.search, c = item.calc;
        setExportLock(true);
        saveExcelWorkbook([buildExportRow(s, c, shortStatus(s.TrangThai))], 1).catch(function (error) {
            toast(error && error.message ? error.message : 'Không thể tạo báo cáo Excel.', 'error');
        }).then(function () {
            setExportLock(false);
        });
    }

    // Goi GetTinhToanExport (PRC_HQ_JOB_GET_EXPORT) - server tra ve DU CA cot hien thi lan cot tinh cho
    // TOAN BO 1 job_id, khong phan trang - KHONG can join voi searchRows/shortStatus() o day nua
    // (TrangThaiRutGon server da rut gon san).
    function exportExcelFromServer() {
        if (!currentJobId) { toast('Chưa có kết quả để xuất. Vui lòng tính hiệu quả trước.', 'warning'); return; }
        var jobIdAtRequest = currentJobId;
        setExportLock(true);
        fetchJson(query(urls.export, { jobId: jobIdAtRequest })).then(function (body) {
            var rows = body.data || [];
            if (!rows.length) { toast('Chưa có kết quả để xuất. Vui lòng tính hiệu quả trước.', 'warning'); return; }
            var rowsAoa = rows.map(function (r) {
                return buildExportRow(r, r, r.TrangThaiRutGon);
            });
            return saveExcelWorkbook(rowsAoa, rows.length);
        }).catch(function (error) {
            toast(error && error.message ? error.message : 'Không thể tải dữ liệu từ Oracle. Vui lòng thử lại.', 'error');
        }).then(function () {
            setExportLock(false);
        });
    }

    // SUA 2026-09-08 (PAGED_RESULT_PLAN.md, duyet boi nguoi dung): options.preserveCalculation phan
    // biet "tim kiem MOI/loc lai" (search.js truyen false hoac khong truyen - RESET toan bo nhu cu) voi
    // "doi trang/doi page-size CUNG 1 bo loc" (truyen true - GIU NGUYEN currentJobId/resultCache, chi
    // hydrate lai cho danh sach dong MOI cua trang nay).
    window.hqdCalcRowsRendered = function (rows, options) {
        searchRows = rows.slice();
        if (!(options && options.preserveCalculation)) { window.hqdCalcReset(); return; }
        hydrateCurrentPage();
    };
    // THEM 2026-09-04 - xem selectAllMode o dau file. search.js goi ham nay khi checkbox "chon tat ca"
    // hoac 1 dong cu the thay doi trang thai.
    window.hqdSetSelectAllMode = function (value) { selectAllMode = Boolean(value); };
    window.hqdCalcReset = function () {
        if (pollHandle) window.clearTimeout(pollHandle);
        pollHandle = null;
        // THEM 2026-09-08: huy bat ky lan hydrate trang dang bay + tang the he de phan hoi CU (neu van
        // ve sau) bi bo qua - xem hydrateCurrentPage/pageRequestSeq.
        pageRequestSeq += 1;
        if (pageFetchAbort) { pageFetchAbort.abort(); pageFetchAbort = null; }
        calculatedRows = []; selectedKeys = []; selectAllMode = false; currentJobId = null; lastCalcWasSelectAll = false;
        resultCache = new Map();
        detailCache = { struct: new Map(), claim: new Map(), xol: new Map() };
        if (byId('hqd-export-btn')) byId('hqd-export-btn').hidden = true;
        if (byId('hqd-drawer').classList.contains('open')) closeDrawer();
    };

    byId('hqd-calc-btn').addEventListener('click', calculate);
    byId('hqd-export-btn').addEventListener('click', exportExcel);
    byId('hqd-drawer-export').addEventListener('click', exportCurrentDrawerRow);
    byId('hqd-drawer-close').addEventListener('click', closeDrawer);
    byId('hqd-drawer-overlay').addEventListener('click', closeDrawer);
    byId('hqd-drawer-prev').addEventListener('click', function () { openDrawer(drawerIndex - 1); });
    byId('hqd-drawer-next').addEventListener('click', function () { openDrawer(drawerIndex + 1); });
    document.querySelectorAll('.hqd-dtab').forEach(function (button) {
        button.addEventListener('click', function () { renderTab(button.dataset.tab); });
        button.addEventListener('keydown', function (event) {
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
            event.preventDefault(); event.stopPropagation();
            var tabs = Array.prototype.slice.call(document.querySelectorAll('.hqd-dtab'));
            var next = (tabs.indexOf(button) + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
            tabs[next].focus(); renderTab(tabs[next].dataset.tab);
        });
    });
    document.addEventListener('keydown', function (event) {
        if (!byId('hqd-drawer').classList.contains('open')) return;
        if (event.key === 'Escape') { event.preventDefault(); closeDrawer(); }
        else if (event.key === 'Tab') trapDrawerFocus(event);
        else if (event.key === 'ArrowLeft') openDrawer(drawerIndex - 1);
        else if (event.key === 'ArrowRight') openDrawer(drawerIndex + 1);
    });
}());

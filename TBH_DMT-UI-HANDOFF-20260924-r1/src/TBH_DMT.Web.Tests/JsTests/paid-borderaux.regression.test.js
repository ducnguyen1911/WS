'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function pad2(value) { return value < 10 ? '0' + value : String(value); }

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

function validateAccountingPeriod(fromIso, toIso) {
    if (!fromIso || !toIso) {
        return { valid: false, error: 'Vui lòng nhập đủ Từ ngày và Đến ngày (Kỳ ghi nhận bồi thường)' };
    }
    if (fromIso > toIso) {
        return { valid: false, error: 'Ngày ghi nhận bồi thường - Từ ngày không được lớn hơn Đến ngày' };
    }
    // Không giới hạn độ rộng kỳ ghi nhận (bồi thường có thể kéo dài nhiều năm) - phản chiếu paid-borderaux.js.
    return { valid: true, error: null };
}

test('FT-007: parseDateInput validates calendar dates correctly', () => {
    assert.deepEqual(parseDateInput('15/01/2026'), { valid: true, empty: false, iso: '2026-01-15' });
    assert.deepEqual(parseDateInput('29/02/2024'), { valid: true, empty: false, iso: '2024-02-29' }); // Leap year
    assert.deepEqual(parseDateInput('29/02/2026'), { valid: false, empty: false, iso: '' }); // Not leap year
    assert.deepEqual(parseDateInput('31/04/2026'), { valid: false, empty: false, iso: '' }); // April has 30 days
    assert.deepEqual(parseDateInput(''), { valid: false, empty: true, iso: '' });
    assert.deepEqual(parseDateInput('invalid'), { valid: false, empty: false, iso: '' });
});

test('FT-007: formatDisplayDate converts ISO to DD/MM/YYYY', () => {
    assert.equal(formatDisplayDate('2026-01-15'), '15/01/2026');
    assert.equal(formatDisplayDate('2026-12-31'), '31/12/2026');
    assert.equal(formatDisplayDate(''), '');
    assert.equal(formatDisplayDate(null), '');
});

test('FT-007: validateAccountingPeriod enforces required fields and order, no span limit', () => {
    // Thiếu 1 hoặc cả hai
    assert.equal(validateAccountingPeriod('', '').valid, false);
    assert.equal(validateAccountingPeriod('2026-01-01', '').valid, false);
    assert.equal(validateAccountingPeriod('', '2026-03-31').valid, false);
    assert.equal(validateAccountingPeriod('', '').error, 'Vui lòng nhập đủ Từ ngày và Đến ngày (Kỳ ghi nhận bồi thường)');

    // Đảo ngày: From > To
    const orderRes = validateAccountingPeriod('2026-06-01', '2026-01-01');
    assert.equal(orderRes.valid, false);
    assert.equal(orderRes.error, 'Ngày ghi nhận bồi thường - Từ ngày không được lớn hơn Đến ngày');

    // Nhiều năm vẫn hợp lệ (yêu cầu nghiệp vụ 2026-09-20)
    const multiYear = validateAccountingPeriod('2010-01-01', '2026-12-31');
    assert.equal(multiYear.valid, true);
    assert.equal(multiYear.error, null);

    // Hợp lệ: 1 quý hoặc 1 năm
    const validQ1 = validateAccountingPeriod('2026-01-01', '2026-03-31');
    assert.equal(validQ1.valid, true);
    assert.equal(validQ1.error, null);

    const validYear = validateAccountingPeriod('2026-01-01', '2026-12-31');
    assert.equal(validYear.valid, true);
    assert.equal(validYear.error, null);
});

test('FT-007: Check paid-borderaux.js includes required endpoints and variables', () => {
    const jsPath = path.resolve(__dirname, '../../TBH_DMT.Web/Scripts/baocao/paid-borderaux.js');
    const content = fs.readFileSync(jsPath, 'utf8');

    assert.ok(content.includes('TBH_PAID_BORDERAUX'), 'Script phải dùng namespace TBH_PAID_BORDERAUX');
    assert.ok(content.includes('bc-paid-accounting-from'), 'Phải xử lý trường bc-paid-accounting-from');
    assert.ok(content.includes('bc-paid-accounting-to'), 'Phải xử lý trường bc-paid-accounting-to');
    assert.ok(content.includes('PaidBorderaux_Fire_'), 'Tên file tải về phải là PaidBorderaux_Fire_');
    assert.ok(!content.includes('accSpanValid'), 'Kỳ ghi nhận bồi thường không được giới hạn độ rộng');
    assert.ok(!content.includes('Khoảng ngày ghi nhận bồi thường tối đa 1 năm'), 'Không còn thông báo giới hạn 1 năm cho kỳ ghi nhận');
    assert.ok(!content.includes('EnterDateFrom'), 'Paid Borderaux không dùng EnterDateFrom');
    assert.ok(!content.includes('EnterDateTo'), 'Paid Borderaux không dùng EnterDateTo');
});

test('FT-007: Check PaidBorderaux.cshtml structure and accessibility', () => {
    const viewPath = path.resolve(__dirname, '../../TBH_DMT.Web/Views/BaoCao/PaidBorderaux.cshtml');
    const content = fs.readFileSync(viewPath, 'utf8');

    assert.ok(content.includes('Kỳ ghi nhận bồi thường'), 'View phải có nhóm Kỳ ghi nhận bồi thường');
    assert.ok(content.includes('StartFirePaidBrExport'), 'Phải khai báo URL StartFirePaidBrExport');
    assert.ok(content.includes('DownloadFirePaidBrExcel'), 'Phải khai báo URL DownloadFirePaidBrExcel');
    assert.ok(content.includes('bc-paid-accounting-from-display'), 'Phải có input bc-paid-accounting-from-display');
    assert.ok(content.includes('bc-paid-accounting-to-display'), 'Phải có input bc-paid-accounting-to-display');
    assert.ok(!content.includes('Ngày nhập đơn'), 'Paid Borderaux view không còn Ngày nhập đơn');
});

test('FT-007: Prototype accepts multi-year accounting period but retains one-year policy-period limit', () => {
    const prototypePath = path.resolve(__dirname, '../../../frontend/index.html');
    const content = fs.readFileSync(prototypePath, 'utf8');

    assert.ok(content.includes("paid_daysBetween(from,to)>366"), 'Prototype phải giữ giới hạn 1 năm cho kỳ hiệu lực');
    assert.ok(!content.includes("paid_daysBetween(accountingFrom,accountingTo)>366"), 'Prototype không được giới hạn độ rộng kỳ ghi nhận');
    assert.ok(!content.includes('Khoảng ngày ghi nhận bồi thường tối đa 1 năm'), 'Prototype không còn thông báo giới hạn 1 năm cho kỳ ghi nhận');
    assert.ok(content.includes('Không giới hạn độ rộng kỳ ghi nhận'), 'Prototype phải giải thích kỳ ghi nhận có thể kéo dài nhiều năm');
});

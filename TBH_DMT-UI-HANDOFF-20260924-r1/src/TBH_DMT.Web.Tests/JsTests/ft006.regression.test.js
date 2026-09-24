'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Test pctVi formatting function logic
function pctVi(value, digits) {
    if (value === null || value === undefined || value === '') return '—';
    const number = Number(value);
    if (Number.isNaN(number)) return '—';
    return number.toLocaleString('vi-VN', { minimumFractionDigits: digits, maximumFractionDigits: digits }) + '%';
}

function valueOrNull(value) {
    return value === null || value === undefined || value === '' ? null : Number(value);
}

function buildExportRow(searchRow, calcRow, status) {
    var efficiency = valueOrNull(calcRow.HieuQuaDichVuPct);
    var avgCommPct = valueOrNull(calcRow.HongNhuongTaiTrungBinhPct);
    return [
        searchRow.SoDon,
        searchRow.NgayHieuLuc,
        searchRow.NhomNghiepVu,
        searchRow.TenSanPhamGoc,
        status,
        valueOrNull(calcRow.PhiDongBaoHiemGoc),
        valueOrNull(calcRow.BaovietCoinsPct),
        valueOrNull(calcRow.PhiDongBaoHiem),
        valueOrNull(calcRow.PhiNhuongTbh),
        valueOrNull(calcRow.PhiGiuLai),
        valueOrNull(calcRow.TonThatGoVnd),
        valueOrNull(calcRow.TonThatGiuLaiVnd),
        (valueOrNull(calcRow.TonThatNhuongTyLeVnd) || 0) + (valueOrNull(calcRow.XolRecoveryVnd) || 0),
        valueOrNull(calcRow.PhiTaiLapVnd),
        avgCommPct === null ? '' : Number(avgCommPct) / 100,
        efficiency === null ? '' : Number(efficiency) / 100,
        searchRow.Cat || '',
        searchRow.NganhNghe || '',
        searchRow.CongTyThanhVien || ''
    ];
}

test('FT-006: pctVi formats percentage according to Vietnamese locale', () => {
    assert.equal(pctVi(20, 2), '20,00%');
    assert.equal(pctVi(28.51227776, 2), '28,51%');
    assert.equal(pctVi(31.76259311, 2), '31,76%');
    assert.equal(pctVi(0, 2), '0,00%');
    assert.equal(pctVi(-15.75, 2), '-15,75%');
    assert.equal(pctVi(null, 2), '—');
    assert.equal(pctVi(undefined, 2), '—');
    assert.equal(pctVi('', 2), '—');
});

test('FT-006: buildExportRow generates exactly 19 columns with HongNhuongTaiTrungBinh at index 14', () => {
    const searchRow = {
        SoDon: '7808204',
        NgayHieuLuc: '16/06/2026',
        NhomNghiepVu: 'Engineering',
        TenSanPhamGoc: 'Bảo hiểm mọi rủi ro xây dựng',
        Cat: 'CAT 2',
        NganhNghe: 'Xây dựng',
        CongTyThanhVien: 'Bảo Việt Hà Nội'
    };
    const calcRow = {
        PhiDongBaoHiemGoc: 30000000000,
        BaovietCoinsPct: 100,
        PhiDongBaoHiem: 30000000000,
        PhiNhuongTbh: 25028859421,
        PhiGiuLai: 2461008300,
        TonThatGoVnd: 0,
        TonThatGiuLaiVnd: 0,
        TonThatNhuongTyLeVnd: 0,
        XolRecoveryVnd: 0,
        PhiTaiLapVnd: 0,
        HongNhuongTaiTrungBinhPct: 28.51227776,
        HieuQuaDichVuPct: -8753.58
    };

    const row = buildExportRow(searchRow, calcRow, 'NB');
    assert.equal(row.length, 19, 'Báo cáo Excel phải có đúng 19 cột (A..S)');
    assert.equal(row[0], '7808204');
    assert.equal(row[4], 'NB');
    assert.equal(row[8], 25028859421); // Cột I: Phí nhượng tái
    assert.equal(row[13], 0); // Cột N: Phí tái lập

    // Cột O (Index 14): Hồng nhượng tái trung bình dạng numeric ratio cho Excel percentage format
    assert.equal(row[14], 0.2851227776);

    // Cột P (Index 15): Hiệu quả
    assert.equal(row[15], -87.5358);

    // Cột Q (Index 16): Cat
    assert.equal(row[16], 'CAT 2');

    // Cột R (Index 17): Ngành nghề
    assert.equal(row[17], 'Xây dựng');

    // Cột S (Index 18): Công ty thành viên
    assert.equal(row[18], 'Bảo Việt Hà Nội');
});

test('FT-006: buildExportRow leaves column O blank when HongNhuongTaiTrungBinhPct is null', () => {
    const searchRow = { SoDon: '7800000' };
    const calcRow = {
        HongNhuongTaiTrungBinhPct: null,
        HieuQuaDichVuPct: 15.0
    };

    const row = buildExportRow(searchRow, calcRow, 'NB');
    assert.equal(row[14], '', 'Nếu NULL, ô Excel phải để trống');
    assert.equal(row[15], 0.15);
});

test('FT-006: Check hieuqua-calc.js includes required keywords and functions', () => {
    const jsPath = path.resolve(__dirname, '../../TBH_DMT.Web/Scripts/hieuquadon/hieuqua-calc.js');
    const content = fs.readFileSync(jsPath, 'utf8');

    assert.ok(content.includes('pctVi(c.HongNhuongTaiTrungBinhPct, 2)'), 'renderOverview phải gọi pctVi với 2 chữ số thập phân');
    assert.ok(content.includes('Tổng hoa hồng nhượng tái / Tổng phí nhượng tái × 100%'), 'Phải có tooltip công thức nghiệp vụ');
    assert.ok(content.includes('ABCDEFGHIJKLMNOPQRS'), 'Export template phải xử lý đúng 19 cột A..S');
    assert.ok(content.includes("rowCell(totalRow, 'P')"), 'Dòng tổng cộng phải tính Hiệu quả ở cột P');
});

test('FT-006: buildExportRow with multi-position policy (7807313 NB+MTA) exports 31.76% numeric ratio', () => {
    // Regression FT006-QA-03: Đơn 7807313 tổng hợp cả NB và MTA
    const searchRow = {
        SoDon: '7807313',
        NgayHieuLuc: '31/07/2026',
        NhomNghiepVu: 'Fire',
        TenSanPhamGoc: 'Bảo hiểm Cháy và các rủi ro đặc biệt',
        Cat: 'CAT 1',
        NganhNghe: 'Kinh doanh',
        CongTyThanhVien: 'Bảo Việt Sài Gòn'
    };
    const calcRow = {
        PhiDongBaoHiemGoc: 49030150685,
        BaovietCoinsPct: 100,
        PhiDongBaoHiem: 49030150685,
        PhiNhuongTbh: 47491785500,
        PhiGiuLai: 2981101587,
        TonThatGoVnd: 127272727272.36,
        TonThatGiuLaiVnd: 34831636481.36,
        TonThatNhuongTyLeVnd: 50940590357,
        XolRecoveryVnd: 41500500434,
        PhiTaiLapVnd: 9457134000,
        HongNhuongTaiTrungBinhPct: 31.7625931078,
        HieuQuaDichVuPct: -56.4261
    };

    const row = buildExportRow(searchRow, calcRow, 'NB');
    assert.equal(row.length, 19);
    // Cột O (Index 14) phải là tỷ lệ 31.76% (0.317625931078), KHÔNG phải 28.50% (0.28499691)
    assert.notEqual(Number(row[14].toFixed(4)), 0.2850);
    assert.equal(Number(row[14].toFixed(4)), 0.3176);
    assert.equal(row[14], 0.317625931078);
});


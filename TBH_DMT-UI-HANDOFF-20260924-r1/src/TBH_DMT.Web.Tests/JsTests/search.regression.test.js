'use strict';
// Regression cho Scripts/hieuquadon/search.js - Codex QA Loi_180926 (QA-01, QA-06) + cac hanh vi da nghiem thu
// cua Loi 7 / Loi 5 / Loi 6 phai giu nguyen. Chay: node --test src/TBH_DMT.Web.Tests/JsTests
// (SearchScriptRegressionTests.cs goi lenh nay de nam trong gate `dotnet vstest`).
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSearchPage } = require('./fake-dom');

function has(formData, name) { return formData.has(name); }

test('QA-01: chon Fire roi nhap So don khac nghiep vu => request chi loc theo So don', async () => {
    const page = loadSearchPage();
    page.selectRiClass('Fire');
    page.typeSoDon('POLICY-HULL');

    // UI: dropdown bi khoa nhung KHONG mat lua chon cua nguoi dung.
    assert.equal(page.byId('hqd-riclass').disabled, true);
    assert.equal(page.byId('hqd-riclass').value, 'Fire');

    page.submit();
    await page.settle();

    const body = page.lastPost();
    assert.equal(page.posts.length, 1);
    assert.equal(body.get('SoDon'), 'POLICY-HULL');
    assert.equal(has(body, 'RiClass'), false, 'RiClass phai bi bo qua khi co So don');
    assert.equal(has(body, 'Cat'), false);
    assert.equal(has(body, 'NganhNghe'), false);
});

test('Cat/Nganh nghe bi khoa khi tim theo So don, khong gui, va bat lai voi lua chon cu khi xoa So don', async () => {
    const page = loadSearchPage();
    page.selectRiClass('Fire');
    assert.equal(page.byId('hqd-cat').disabled, false);
    assert.equal(page.byId('hqd-nganh-btn').disabled, false);
    page.byId('hqd-cat').value = 'A';

    page.typeSoDon('POLICY-HULL');
    assert.equal(page.byId('hqd-cat').disabled, true);
    assert.equal(page.byId('hqd-nganh-btn').disabled, true);
    assert.equal(page.byId('hqd-cat-wrap').classList.contains('disabled-field'), true);
    assert.equal(page.byId('hqd-cat').value, 'A', 'khong xoa lua chon cua nguoi dung');
    page.submit();
    await page.settle();
    assert.equal(has(page.lastPost(), 'Cat'), false);

    page.typeSoDon('');
    assert.equal(page.byId('hqd-cat').disabled, false);
    assert.equal(page.byId('hqd-nganh-btn').disabled, false);
    assert.equal(page.byId('hqd-cat-wrap').classList.contains('disabled-field'), false);
    assert.equal(page.byId('hqd-cat').value, 'A');
    page.typeDate('from', '01/01/2026');
    page.submit();
    await page.settle();
    assert.equal(page.lastPost().get('Cat'), 'A');
});

test('Xoa So don khi chua chon Nghiep vu thi Cat/Nganh nghe van khoa', () => {
    const page = loadSearchPage();
    page.typeSoDon('POLICY-1');
    page.typeSoDon('');
    assert.equal(page.byId('hqd-cat').disabled, true);
    assert.equal(page.byId('hqd-nganh-btn').disabled, true);
});

test('QA-01: state gui sang buoc Tinh toan cung khong mang RiClass/Cat khi co So don', () => {
    const page = loadSearchPage();
    page.selectRiClass('Fire');
    page.byId('hqd-cat').value = 'A';
    page.typeSoDon('POLICY-HULL');

    const state = page.window.hqdGetSearchState();
    assert.equal(state.soDon, 'POLICY-HULL');
    assert.equal(state.riClass, '');
    assert.equal(state.cat, '');
    assert.equal(state.nganhNghe, '');
});

test('QA-01: xoa So don => bat lai Nghiep vu, giu lua chon cu va gui lai RiClass', async () => {
    const page = loadSearchPage();
    page.selectRiClass('Fire');
    page.typeSoDon('POLICY-HULL');
    page.typeSoDon('');

    assert.equal(page.byId('hqd-riclass').disabled, false);
    assert.equal(page.byId('hqd-riclass').value, 'Fire');

    page.typeDate('from', '01/01/2026');
    page.submit();
    await page.settle();

    const body = page.lastPost();
    assert.equal(has(body, 'SoDon'), false);
    assert.equal(body.get('RiClass'), 'Fire');
    assert.equal(body.get('NgayHieuLucFrom'), '2026-01-01');
});

test('Loi 7: go/xoa So don khong hien validation do khi chua bam Tim kiem', () => {
    const page = loadSearchPage();
    page.selectRiClass('Fire');
    page.typeSoDon('P');
    page.typeSoDon('');

    assert.equal(page.byId('hqd-riclass-error').hidden, true);
    assert.equal(page.byId('hqd-from-error').hidden, true);
    assert.equal(page.byId('hqd-range-error').hidden, true);
});

test('Loi 5: chon Nghiep vu khong hien loi Tu ngay truoc khi bam Tim kiem', () => {
    const page = loadSearchPage();
    page.selectRiClass('Fire');
    assert.equal(page.byId('hqd-from-error').hidden, true);
});

test('Loi 5: chon "-- Tu chon ngay --" khoa Quy, chon nam cu the mo lai Quy', () => {
    const page = loadSearchPage();
    assert.equal(page.byId('hqd-quarter').disabled, true);
    page.byId('hqd-year').value = '2025';
    page.byId('hqd-year').dispatch('change');
    assert.equal(page.byId('hqd-quarter').disabled, false);
    page.byId('hqd-year').value = '';
    page.byId('hqd-year').dispatch('change');
    assert.equal(page.byId('hqd-quarter').disabled, true);
});

test('Chon Nam/Quy sau khi Tim kiem thieu Tu ngay => loi do tu hoan tat (khong treo du o da co gia tri)', async () => {
    const page = loadSearchPage();
    page.selectRiClass('Fire');
    page.submit();
    await page.settle();
    assert.equal(page.byId('hqd-from-error').hidden, false, 'tien de: lan Tim kiem rong phai bao loi');

    page.byId('hqd-year').value = '2026';
    page.byId('hqd-year').dispatch('change');
    assert.equal(page.byId('hqd-from').value, '2026-01-01');
    assert.equal(page.byId('hqd-from-error').hidden, true);
    assert.equal(page.byId('hqd-from-display').getAttribute('aria-invalid'), 'false');

    page.byId('hqd-quarter').value = '1';
    page.byId('hqd-quarter').dispatch('change');
    assert.equal(page.byId('hqd-range-error').hidden, true);
});

test('QA-06: Tu ngay 29/02 nam nhuan o tuong lai, bo Den ngay => 27/02 nam sau (khop C# MaxYearEnd)', async () => {
    const page = loadSearchPage();
    page.selectRiClass('Fire');
    page.typeDate('from', '29/02/2096');
    page.submit();
    await page.settle();

    assert.equal(page.lastPost().get('NgayHieuLucTo'), '2097-02-27');
    assert.equal(page.byId('hqd-to-display').value, '27/02/2097');
});

test('QA-06: Tu ngay thuong o tuong lai => cuoi khoang 1 nam (khong lech 1 ngay)', async () => {
    const page = loadSearchPage();
    page.selectRiClass('Fire');
    page.typeDate('from', '15/03/2096');
    page.submit();
    await page.settle();

    assert.equal(page.lastPost().get('NgayHieuLucTo'), '2097-03-14');
});

test('Loi 6: Tu ngay trong qua khu, bo Den ngay => tu dien ngay hien tai', async () => {
    const page = loadSearchPage();
    page.selectRiClass('Fire');
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
    const pad = (n) => (n < 10 ? '0' : '') + n;
    page.typeDate('from', pad(from.getDate()) + '/' + pad(from.getMonth() + 1) + '/' + from.getFullYear());
    page.submit();
    await page.settle();

    const today = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
    assert.equal(page.posts.length, 1);
    assert.equal(page.lastPost().get('NgayHieuLucTo'), today);
});

test('Loi 6: response HTML/khong phai JSON khong lam lo loi cu phap JSON cho nguoi dung', async () => {
    const page = loadSearchPage();
    page.window.fetch = () => Promise.resolve({ ok: false, text: () => Promise.resolve('<!DOCTYPE html><html>error</html>') });
    // search.js chup `fetch` toan cuc luc goi nen gan lai tren sandbox la du.
    const container = page.byId('toast-container');
    page.typeSoDon('POLICY-1');
    page.submit();
    await page.settle();

    const messages = container.children.map((toast) => toast.textContent).join('|');
    assert.match(messages, /Không thể tải dữ liệu từ Oracle/);
    assert.doesNotMatch(messages, /Unexpected token|JSON/);
});

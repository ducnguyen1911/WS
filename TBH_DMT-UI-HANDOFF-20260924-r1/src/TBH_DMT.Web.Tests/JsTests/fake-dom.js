'use strict';
// DOM gia toi thieu de nap Scripts/hieuquadon/search.js trong vm va mo phong thao tac nguoi dung.
// Khong phai jsdom: chi hien thuc dung phan API search.js dung. Phan tu duoc tao LAZY theo id nen khong can
// khai bao lai toan bo Search.cshtml; thuoc tinh mac dinh (value '', hidden false...) giong node vua tao.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

class FakeElement {
    constructor(id) {
        this.id = id || '';
        this.value = '';
        this.disabled = false;
        this.hidden = false;
        this.checked = false;
        this.textContent = '';
        this.innerHTML = '';
        this.className = '';
        this.type = '';
        this.action = '/HieuQuaDon/SearchPolicies';
        this.dataset = {};
        this.children = [];
        this.attributes = {};
        this.listeners = {};
        const classes = new Set();
        this.classList = {
            add: (name) => { classes.add(name); },
            remove: (name) => { classes.delete(name); },
            contains: (name) => classes.has(name),
            toggle: (name, force) => {
                const on = force === undefined ? !classes.has(name) : Boolean(force);
                if (on) classes.add(name); else classes.delete(name);
                return on;
            }
        };
    }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    getAttribute(name) { return name in this.attributes ? this.attributes[name] : null; }
    removeAttribute(name) { delete this.attributes[name]; }
    toggleAttribute(name, force) {
        const on = force === undefined ? !(name in this.attributes) : Boolean(force);
        if (on) this.attributes[name] = ''; else delete this.attributes[name];
        return on;
    }
    addEventListener(type, handler) { (this.listeners[type] = this.listeners[type] || []).push(handler); }
    dispatch(type, extra) {
        const event = Object.assign({ type, target: this, preventDefault() { }, key: '' }, extra || {});
        (this.listeners[type] || []).slice().forEach((handler) => handler.call(this, event));
    }
    appendChild(child) { this.children.push(child); return child; }
    contains(other) { return other === this || this.children.indexOf(other) >= 0; }
    remove() { }
    focus() { }
    reset() { }
}

// Nap search.js va tra ve { byId, type, formPosts, ... } de test thao tac nhu nguoi dung.
function loadSearchPage(options) {
    options = options || {};
    const elements = new Map();
    const token = new FakeElement('__RequestVerificationToken');
    token.value = 'test-token';
    const document = {
        getElementById(id) {
            if (!elements.has(id)) elements.set(id, new FakeElement(id));
            return elements.get(id);
        },
        querySelector(selector) { return selector.indexOf('__RequestVerificationToken') >= 0 ? token : null; },
        querySelectorAll() { return []; },
        createElement() { return new FakeElement(); },
        addEventListener() { }
    };

    const posts = [];
    const fetchStub = (url, init) => {
        posts.push({ url, body: init.body });
        const payload = options.response || { success: true, data: [], totalCount: 0, pageNumber: 1, pageSize: 10 };
        return Promise.resolve({ ok: true, text: () => Promise.resolve(JSON.stringify(payload)) });
    };

    const sandbox = { document, fetch: fetchStub, FormData: global.FormData, console };
    sandbox.window = sandbox;
    sandbox.setTimeout = () => 0;
    sandbox.TBH_POLICY_SEARCH = { cttvOptions: [], nganhNgheFireOptions: [], nganhNgheEngineeringOptions: [] };
    vm.createContext(sandbox);
    // SEARCH_JS_PATH: chi de kiem chung test bat duoc loi (chay tren ban search.js da hoan nguyen sua doi).
    const scriptPath = process.env.SEARCH_JS_PATH
        || path.resolve(__dirname, '..', '..', 'TBH_DMT.Web', 'Scripts', 'hieuquadon', 'search.js');
    vm.runInContext(fs.readFileSync(scriptPath, 'utf8'), sandbox, { filename: scriptPath });

    const byId = (id) => document.getElementById(id);
    const page = {
        window: sandbox,
        byId,
        posts,
        // Nguoi dung chon Nghiep vu (select 'change').
        selectRiClass(value) { byId('hqd-riclass').value = value; byId('hqd-riclass').dispatch('change'); },
        // Nguoi dung go So don ('input').
        typeSoDon(text) { byId('hqd-sodon').value = text; byId('hqd-sodon').dispatch('input'); },
        // Nguoi dung go o hien thi DD/MM/YYYY roi roi o (input + change) - dung luong parse that cua search.js.
        typeDate(which, text) {
            const display = byId('hqd-' + which + '-display');
            display.value = text; display.dispatch('input'); display.dispatch('change');
        },
        submit() { byId('policy-search-form').dispatch('submit'); },
        // Cho chuoi promise cua fetch + then() ket thuc.
        settle() { return new Promise((resolve) => setImmediate(resolve)); },
        lastPost() { return posts[posts.length - 1] && posts[posts.length - 1].body; }
    };
    return page;
}

module.exports = { loadSearchPage };

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const S = require('../games/high_human_history_cards/settlement/sim.js');
const dir = path.join(__dirname, '../games/high_human_history_cards/settlement');
const KEY = 'kidscade_game_v1:high_human_history_cards:settlement-v1';

// Executes the real UI and simulation with a small DOM/event adapter, not a browser.
function page(saved) {
  const all = [], ids = new Map(), store = new Map(saved ? [[KEY, saved]] : []), reported = [];
  let raf, now = 0, draws = 0, pausedHandlers, exited = false;
  class Element {
    constructor(tag, attrs = '') {
      this.tag = tag; this.dataset = {}; this.style = {}; this.listeners = {}; this.options = []; this.disabled = false; this.value = ''; this._text = ''; this.children = [];
      this.classList = { add() {}, remove() {}, toggle() {} };
      for (const m of attrs.matchAll(/([\w-]+)="([^"]*)"/g)) {
        if (m[1] === 'id') { this.id = m[2]; ids.set(this.id, this); }
        if (m[1].startsWith('data-')) this.dataset[m[1].slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = m[2];
      }
      all.push(this);
    }
    set innerHTML(text) { this._html = text; this.children.forEach(c => { const i = all.indexOf(c); if (i >= 0) all.splice(i, 1); if (c.id) ids.delete(c.id); }); this.children = parse(text); }
    get innerHTML() { return this._html || ''; }
    set textContent(text) { this._text = String(text); }
    get textContent() { return this._text; }
    addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
    emit(type, event = {}) { for (const fn of this.listeners[type] || []) fn({ target: this, ...event }); }
    setAttribute() {}
    setPointerCapture() {}
    closest(selector) { return selector.split(',').some(s => matches(this, s.trim())) ? this : null; }
    matches(selector) { return Boolean(this.closest(selector)); }
    showModal() { this.open = true; }
    close() { this.open = false; this.emit('close'); }
    scrollIntoView() {}
  }
  function parse(text) {
    const found = [];
    for (const m of text.matchAll(/<(button|div|span|i|b|p|strong|small|h[123]|canvas|dialog|select|aside|article|section)\b([^>]*)>/g)) found.push(new Element(m[1], m[2]));
    for (const m of text.matchAll(/<select\b([^>]*)>([\s\S]*?)<\/select>/g)) {
      const id = /data-worker="(\d+)"/.exec(m[1])?.[1], el = found.find(e => e.tag === 'select' && e.dataset.worker === id);
      if (el) el.options = [...m[2].matchAll(/<option value="([^"]*)"/g)].map(o => ({ value: o[1] }));
    }
    return found;
  }
  function matches(el, selector) {
    if (selector === 'dialog') return el.tag === 'dialog';
    if (selector === 'dialog[open]') return el.tag === 'dialog' && el.open;
    if (selector.startsWith('#')) return el.id === selector.slice(1);
    const m = /^\[data-([\w-]+)(?:="([^"]*)")?\]$/.exec(selector);
    if (m) { const key = m[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase()); return key in el.dataset && (m[2] === undefined || el.dataset[key] === m[2]); }
    return false;
  }
  parse(fs.readFileSync(path.join(dir, 'index.html'), 'utf8'));
  const document = { hidden: false, listeners: {},
    getElementById: id => ids.get(id) || null,
    querySelector: sel => all.find(e => matches(e, sel)) || null,
    querySelectorAll: sel => all.filter(e => matches(e, sel)),
    addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  };
  const window = { SettlementSim: S, SettlementView: { create: () => ({ draw() { draws++; }, hit: () => 'wood' }) },
    KidscadeStorage: { getRaw: k => store.get(k) ?? null, setRaw: (k, v) => (store.set(k, v), true) },
    KidscadeGame: { storageKey: (id, name) => `kidscade_game_v1:${id}:${name}`, sound() {}, start() {}, milestone: (...args) => reported.push(args), exit: () => { exited = true; }, registerPauseHandlers: h => { pausedHandlers = h; }, registerCleanup() {} },
    addEventListener() {}
  };
  const context = vm.createContext({ window, document, performance: { now: () => now }, matchMedia: () => ({ matches: false }),
    innerWidth: 1200, setTimeout: () => 1, clearTimeout() {}, requestAnimationFrame: cb => { raf = cb; } });
  vm.runInContext(fs.readFileSync(path.join(dir, 'history-ui.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(dir, 'prehistory-ui.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(dir, 'game.js'), 'utf8'), context);
  const get = id => { const el = ids.get(id); assert.ok(el, `UI element ${id}`); return el; };
  function documentEvent(type, event) { for (const fn of document.listeners[type] || []) fn(event); }
  function click(el) { assert.equal(el.disabled, false, el.id || JSON.stringify(el.dataset)); el.emit('click', { detail: 1 }); documentEvent('click', { target: el, detail: 1 }); }
  function seconds(n) { for (let i = 0; i < n * 10; i++) { now += 100; raf(now); } }
  function save() { click(get('saveBtn')); return JSON.parse(store.get(KEY)); }
  function select(id, job) { const el = document.querySelector(`[data-worker="${id}"]`); assert.ok(el); el.value = job; get('panel').emit('change', { target: el }); }
  function hold(id, n) { const el = get(id); assert.equal(el.disabled, false); documentEvent('pointerdown', { target: el, isPrimary: true, button: 0, pointerId: 1, preventDefault() {} }); seconds(n); documentEvent('pointerup', { target: el, pointerId: 1 }); }
  return { get, click, seconds, save, select, hold, document, store, reported, paused: () => pausedHandlers, exited: () => exited, draws: () => draws };
}

test('real UI supports hold harvesting, construction and persistence without a browser', () => {
  const p = page();
  assert.equal(p.get('goalTitle').textContent, '돌 하나로 달라지는 생활');
  p.click(p.document.querySelector('[data-tab="build"]'));
  p.hold('harvestBtn', 6.1);
  assert.ok(p.save().resources.wood >= 12);
  p.click(p.document.querySelector('[data-project="hut"]'));
  p.hold('helpProject', 15.2);
  assert.equal(p.save().buildings[0].type, 'hut');
  assert.ok(p.get('population').innerHTML.includes('/ 4명'));
  assert.ok(p.draws() > 100);
});

test('real worker controls alter production, pause freezes time and SDK exit is used', () => {
  const p = page();
  p.click(p.document.querySelector('[data-tab="workers"]'));
  p.select(1, 'gather'); p.select(2, 'wood');
  p.seconds(80);
  const before = p.save();
  assert.ok(before.resources.wood > 6);
  assert.match(p.get('worker-info-2').textContent, /왕복/);
  p.paused().pause(); p.seconds(20);
  assert.equal(p.save().time, before.time);
  p.paused().resume(); p.seconds(2);
  assert.ok(p.save().time > before.time);
  p.click(p.get('exitBtn')); assert.equal(p.exited(), true);
});

test('invalid stored records are preserved and dialogs stop held harvesting', () => {
  const p = page('{broken-record');
  p.click(p.get('saveBtn'));
  assert.equal(p.store.get(KEY), '{broken-record');
  assert.match(p.get('saveStatus').textContent, /기존 기록 보존/);
  const q = page(); q.hold('harvestBtn', 1);
  const before = q.save();
  q.click(q.get('helpBtn')); q.seconds(20);
  assert.equal(q.save().time, before.time);
  q.get('helpDialog').close(); q.seconds(2);
  assert.equal(q.save().resources.wood, before.resources.wood);
});

test('the actual UI can complete the settlement chain and report its milestone only once', () => {
  const p = page();
  const tab = value => p.click(p.document.querySelector(`[data-tab="${value}"]`));
  tab('workers'); p.select(1, 'gather'); p.select(2, 'wood'); tab('build');
  function build(id) {
    const d = S.PROJECTS[id];
    for (const [key, n] of Object.entries(d.cost)) {
      p.click(p.document.querySelector(`[data-node="${key}"]`));
      let guard = 0;
      while (p.save().resources[key] < n && guard++ < 100) p.hold('harvestBtn', 1);
      assert.ok(p.save().resources[key] >= n);
    }
    p.click(p.document.querySelector(`[data-project="${id}"]`));
    p.hold('helpProject', d.time + .3);
  }
  build('hut'); build('tools'); build('fire'); build('survey'); build('groundStone'); build('farm');
  tab('workers'); p.select(1, 'farm'); tab('build');
  build('pottery'); build('hut'); p.seconds(61);
  assert.equal(p.get('completeDialog').open, true);
  assert.equal(p.save().era, 'neolithic');
  assert.equal(p.reported.length, 1);
  p.click(p.get('continueBtn')); p.seconds(5);
  assert.equal(p.reported.length, 1);
  const resumed = page(p.store.get(KEY)); resumed.seconds(3);
  assert.equal(resumed.get('completeDialog').open, undefined);
  assert.equal(resumed.reported.length, 0);
});

test('history controls link completed play with reflection and production without a browser', () => {
  const p = page();
  p.click(p.document.querySelector('[data-tab="build"]'));
  p.click(p.document.querySelector('[data-project="tools"]')); p.hold('helpProject', 10.3);
  p.click(p.document.querySelector('[data-node="food"]')); p.hold('harvestBtn', 3.2);
  p.click(p.document.querySelector('[data-tab="history"]'));
  assert.match(p.get('panel').innerHTML, /삼국·가야/);
  p.click(p.document.querySelector('[data-answer="0"]'));
  p.click(p.get('claimChapter'));
  assert.deepEqual(p.save().history.completed, ['paleolithic']);
  p.click(p.document.querySelector('[data-history-view="lesson"]'));
  assert.match(p.get('panel').innerHTML, /고려의 기록과 인쇄/);
  p.click(p.document.querySelector('[data-tab="production"]'));
  assert.match(p.get('stock-bronze').textContent, /재고 0/);
});


test('life UI crafts task-specific tools, hunts with equal fixed controls and survives pause/reload', () => {
  const p = page();
  p.click(p.document.querySelector('[data-tab="life"]'));
  assert.match(p.get('panel').innerHTML, /내 클릭을 대신하는 시설/);
  p.click(p.document.querySelector('[data-tool="handaxe"]'));
  assert.equal(p.save().prehistory.tools.handaxe, 24);
  for (let i = 0; i < 3; i++) { p.click(p.get('trackRabbit')); p.seconds(.6); }
  const s = p.save();
  assert.equal(s.prehistory.stats.hunts, 1);
  assert.equal(s.prehistory.tools.handaxe, 21);
  assert.equal(s.prehistory.hide, 1);
  p.click(p.document.querySelector('[data-tool="scraper"]'));
  p.click(p.document.querySelector('[data-life="hide"]'));
  assert.equal(p.save().prehistory.leather, 2);
  p.paused().pause(); const before = p.save(); p.seconds(20);
  assert.equal(p.save().prehistory.fuel, before.prehistory.fuel);
  const q = page(p.store.get(KEY));
  q.click(q.document.querySelector('[data-tab="life"]'));
  assert.match(q.get('toolStatus').textContent, /긁개/);
  assert.equal(q.save().prehistory.leather, 2);
});

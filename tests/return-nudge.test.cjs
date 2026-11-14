const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '..', 'return-nudge.js'), 'utf8');

function harness({ navigationType = 'navigate', initialStore = null, speech = true, topLevel = true } = {}) {
  let now = 100000;
  const calls = [];
  const timers = new Map();
  const events = new Map();
  const storage = new Map(initialStore ? [['kidscade:return-nudge:hidden-at:v1', String(initialStore)]] : []);
  let timerId = 0;
  const el = (tag) => ({
    tag, style: {}, children: [], handlers: {}, textContent: '',
    setAttribute(name, value) { this[name] = value; },
    addEventListener(name, cb) { this.handlers[name] = cb; },
    append(...nodes) { this.children.push(...nodes); },
    remove() { this.removed = true; }
  });
  const body = { children: [], appendChild(node) { this.children.push(node); } };
  const document = {
    visibilityState: 'visible', body,
    createElement: el,
    addEventListener(name, cb) { events.set(`document:${name}`, cb); }
  };
  const window = {
    addEventListener(name, cb) { events.set(`window:${name}`, cb); },
    performance: { getEntriesByType: () => [{ type: navigationType }] },
    SpeechSynthesisUtterance: speech ? function (text) { this.text = text; } : undefined,
    speechSynthesis: speech ? { cancel() {}, speak(utterance) { calls.push(utterance.text); } } : undefined
  };
  window.self = window;
  window.top = topLevel ? window : {};
  const context = {
    window, document,
    sessionStorage: {
      getItem(key) { return storage.get(key) ?? null; },
      setItem(key, value) { storage.set(key, value); },
      removeItem(key) { storage.delete(key); }
    },
    Date: class extends Date { static now() { return now; } },
    setTimeout(fn) { const id = ++timerId; timers.set(id, fn); return id; },
    clearTimeout(id) { timers.delete(id); }
  };
  vm.runInNewContext(source, context);
  return {
    setNow(t) { now = t; },
    hide() { document.visibilityState = 'hidden'; events.get('document:visibilitychange')?.(); },
    returnToSite() { document.visibilityState = 'visible'; events.get('document:visibilitychange')?.(); },
    pageshow() { events.get('window:pageshow')?.(); },
    current() { return body.children.filter(x => !x.removed).at(-1); },
    calls, storage, body, events, timers
  };
}

test('3 seconds to 20 minutes: once on return with spoken Korean and manual replay', () => {
  const h = harness();
  h.hide();
  h.setNow(105000);
  h.returnToSite();
  assert.equal(h.current()?.id, 'kidscade-return-nudge');
  assert.match(h.calls[0], /다시/);
  assert.equal(h.current().children[1].textContent, '🔊 다시 듣기');
  h.current().children[1].handlers.click();
  assert.equal(h.calls.length, 2);
  h.pageshow();
  assert.equal(h.calls.length, 2);
  assert.equal(h.storage.size, 0);
});

test('brief tab change and an absence of more than 20 minutes do not nag', () => {
  const brief = harness();
  brief.hide(); brief.setNow(101000); brief.returnToSite();
  assert.equal(brief.current(), undefined);
  const long = harness();
  long.hide(); long.setNow(100000 + 20 * 60 * 1000 + 1); long.returnToSite();
  assert.equal(long.current(), undefined);
});

test('twice within cooldown only plays once', () => {
  const h = harness();
  h.hide(); h.setNow(105000); h.returnToSite();
  h.setNow(110000); h.hide(); h.setNow(117000); h.returnToSite();
  assert.equal(h.calls.length, 1);
});

test('back-forward restore checks stored time, reload does not', () => {
  const back = harness({ navigationType: 'back_forward', initialStore: 95000 });
  back.pageshow();
  assert.ok(back.current());
  const reload = harness({ navigationType: 'reload', initialStore: 95000 });
  reload.pageshow();
  assert.equal(reload.current(), undefined);
});

test('no speech API still shows visible replay control without errors', () => {
  const h = harness({ speech: false });
  h.hide(); h.setNow(104000); h.returnToSite();
  assert.ok(h.current());
  h.current().children[1].handlers.click();
  h.current().children[2].handlers.click();
  assert.equal(h.current(), undefined);
});

test('embedded game iframe does not install a second watcher', () => {
  const h = harness({ topLevel: false });
  assert.equal(h.events.size, 0);
});

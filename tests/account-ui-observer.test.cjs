const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function harness(source) {
  let writes = 0;
  let pending = false;
  let slot;
  const context = {
    crypto: { randomUUID: () => 'test' }, window: {},
    document: {
      readyState: 'loading', addEventListener() {},
      getElementById(id) {
        if (id === 'kc-profile-identity') return { appendChild(node) { slot = node; pending = true; } };
        if (id === 'kc-account-slot') return slot;
        return null;
      },
      createElement() {
        const node = { firstChild: null, querySelector: () => ({ addEventListener() {} }) };
        Object.defineProperty(node, 'innerHTML', { set(value) {
          writes++; pending = true; node.firstChild = {}; node.markup = value;
        } });
        return node;
      }
    }
  };
  // Expose the existing closure only inside this test; run its real render code.
  source = source.replace('  window.KidscadeAccount = Object.freeze({',
    '  window.testUi = { renderSlot, setAccount(value) { account = value; }, setEconomy(value) { economySummary = value; economySummaryLoaded = true; } };\n  window.KidscadeAccount = Object.freeze({');
  vm.runInNewContext(source, context);
  const ui = context.window.testUi;
  function flush() {
    ui.renderSlot();
    let callbacks = 0;
    while (pending && callbacks < 20) {
      pending = false; callbacks++; ui.renderSlot();
    }
    assert.equal(pending, false, 'slot writes must settle before the next frame/input task');
  }
  return { ui, flush, writes: () => writes, slot: () => slot, remove: () => { slot = undefined; } };
}

const source = fs.readFileSync(require.resolve('../account-client.js'), 'utf8');
for (const account of [null, {role:'student', loginId:'KC-TEST-01'}, {role:'teacher',loginId:'KT-TEST',classId:'1'}]) {
  test(`account observer settles for ${account?.role || 'guest'} and preserves nodes`, () => {
    const h = harness(source);
    h.ui.setAccount(account);
    h.flush();
    const node = h.slot().firstChild;
    h.flush();
    assert.equal(h.writes(), 1);
    assert.equal(h.slot().firstChild, node);
    h.remove();
    h.flush();
    assert.equal(h.writes(), 2, 'recreated profile must get a fresh account slot');
  });
}
test('account changes and economy updates still rerender once', () => {
  const h = harness(source);
  h.flush();
  h.ui.setAccount({role:'student',loginId:'KC-TEST-01'});
  h.flush();
  h.ui.setEconomy({enabled:true,balance:200,currency:'뚝'});
  h.flush();
  assert.match(h.slot().markup, /200뚝/);
  h.ui.setAccount(null);
  h.flush();
  assert.equal(h.writes(), 4);
});

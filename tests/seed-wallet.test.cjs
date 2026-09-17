const test = require('node:test');
const assert = require('node:assert/strict');
const walletLib = require('../seed-wallet.js');

function fakeLocalStorage(initial = {}) {
  const values = new Map(Object.entries(initial).map(([key, value]) => [key, String(value)]));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    dump() { return Object.fromEntries(values); }
  };
}

test('seed wallet reads the existing physical save key without migration', () => {
  const storage = fakeLocalStorage({ kidscade_coins: '321' });
  const wallet = walletLib.create({ localStorage: storage });
  assert.equal(wallet.key, 'kidscade_coins');
  assert.equal(wallet.get(), 321);
});

test('seed wallet change persists integer balance and prevents overdraft', () => {
  const storage = fakeLocalStorage({ kidscade_coins: '100' });
  const wallet = walletLib.create({ localStorage: storage });

  assert.deepEqual(wallet.change(25), {
    ok: true,
    balance: 125,
    delta: 25,
    reason: '',
    source: 'change'
  });
  assert.equal(storage.dump().kidscade_coins, '125');

  const failed = wallet.change(-200);
  assert.equal(failed.ok, false);
  assert.equal(failed.error, 'insufficient-balance');
  assert.equal(failed.balance, 125);
  assert.equal(storage.dump().kidscade_coins, '125');
});

test('earn and spend normalize amounts and keep legacy callers safe', () => {
  const storage = fakeLocalStorage({ kidscade_coins: '50' });
  const wallet = walletLib.create({ localStorage: storage });
  assert.equal(wallet.earn(-12.9).balance, 62);
  assert.equal(wallet.spend(-20.8).balance, 42);
  assert.equal(wallet.get(), 42);
});

test('subscribers receive local writes and external storage syncs', () => {
  const storage = fakeLocalStorage({ kidscade_coins: '10' });
  const wallet = walletLib.create({ localStorage: storage });
  const seen = [];
  wallet.subscribe(detail => seen.push(detail), { immediate: false });

  wallet.change(5, { reason: '게임 보상' });
  storage.setItem('kidscade_coins', '77');
  wallet.syncFromStorage();

  assert.equal(seen.length, 2);
  assert.deepEqual(seen[0], { balance: 15, delta: 5, reason: '게임 보상', source: 'change' });
  assert.deepEqual(seen[1], { balance: 77, delta: 62, reason: '', source: 'storage-sync' });
});

test('wallet can use the registered KidscadeStorage seed key', () => {
  const values = new Map([['kidscade_coins', '8']]);
  const storageApi = {
    keys: { seeds: 'kidscade_coins' },
    getInt(name, fallback) {
      assert.equal(name, 'seeds');
      const value = Number.parseInt(values.get('kidscade_coins') || '', 10);
      return Number.isFinite(value) ? value : fallback;
    },
    setRaw(name, value) {
      assert.equal(name, 'seeds');
      values.set('kidscade_coins', String(value));
      return true;
    }
  };
  const wallet = walletLib.create({ storageApi });
  assert.equal(wallet.spend(3).balance, 5);
  assert.equal(values.get('kidscade_coins'), '5');
});

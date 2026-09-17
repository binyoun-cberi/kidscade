const test = require('node:test');
const assert = require('node:assert/strict');
const playtime = require('../playtime-state.js');

function fakeLocalStorage(initial = {}) {
  const values = new Map(Object.entries(initial).map(([key, value]) => [key, String(value)]));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    dump() { return Object.fromEntries(values); }
  };
}

test('playtime state preserves the larger value across second and legacy minute saves', () => {
  const storage = fakeLocalStorage({
    kidscade_playtime_sec: '70',
    kidscade_playtime: '3'
  });
  const state = playtime.create({ localStorage: storage });
  assert.equal(state.getSeconds(), 180);
  assert.equal(storage.dump().kidscade_playtime_sec, '180');
});

test('adding playtime persists seconds and the legacy minute compatibility key', () => {
  const storage = fakeLocalStorage({ kidscade_playtime_sec: '59' });
  const state = playtime.create({ localStorage: storage });
  assert.equal(state.addSeconds(62), 62);
  assert.equal(state.getSeconds(), 121);
  assert.equal(storage.dump().kidscade_playtime_sec, '121');
  assert.equal(storage.dump().kidscade_playtime, '2');
});

test('playtime formatting stays compatible with the lobby display', () => {
  assert.equal(playtime.format(0), '총 학습 시간: 0초');
  assert.equal(playtime.format(65), '총 학습 시간: 1분 5초');
  assert.equal(playtime.format(3661), '총 학습 시간: 1시간 1분 1초');
});

test('render and cross-tab sync update the existing playtime element', () => {
  const storage = fakeLocalStorage({ kidscade_playtime_sec: '30' });
  const element = { innerText: '' };
  const document = { getElementById(id) { return id === 'total-playtime' ? element : null; } };
  const state = playtime.create({ localStorage: storage, document });
  state.render();
  assert.equal(element.innerText, '총 학습 시간: 30초');
  storage.setItem('kidscade_playtime_sec', '95');
  state.syncFromStorage();
  assert.equal(state.getSeconds(), 95);
  assert.equal(element.innerText, '총 학습 시간: 1분 35초');
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');

function boot() {
  const callbacks = {};
  const app = {
    innerHTML: '',
    addEventListener(name, fn) { callbacks[name] = fn; },
    querySelector() { return null; }
  };
  const toast = { textContent: '', classList: { add() {}, remove() {} } };
  const storage = new Map();
  const context = {
    console,
    Date,
    Math,
    Number,
    Array,
    Object,
    Set,
    Map,
    String,
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
    document: { getElementById: id => id === 'app' ? app : toast, body: { classList: { toggle() {} } }, addEventListener() {} },
    addEventListener() {},
    setInterval() {},
    setTimeout() { return 1; },
    clearTimeout() {}
  };
  context.window = context;
  vm.createContext(context);
  for (const file of ['engine.js', 'game.js']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'games/number-maze', file), 'utf8'), context, { filename: file });
  }
  function click(action, dataset = {}) {
    callbacks.click({ target: { closest() { return { disabled: false, dataset: { action, ...dataset } }; } } });
  }
  function progress() { return JSON.parse(storage.get('kidscade_game_v1:number_maze')); }
  return { app, context, click, progress };
}

test('모든 모드와 학년 선택이 게임 화면까지 연결된다', () => {
  const page = boot();
  for (const mode of ['adventure', 'free', 'daily', 'endless', 'mixed']) {
    page.click('grade', { grade: '3' });
    page.click(mode);
    assert.match(page.app.innerHTML, /3학년/);
    assert.match(page.app.innerHTML, /board-grid/);
    assert.match(page.app.innerHTML, /정답 확인/);
    page.click('home');
    assert.match(page.app.innerHTML, /풀던 퍼즐 이어하기/);
    page.click('resume');
    assert.match(page.app.innerHTML, /board-grid/);
    page.click('home');
  }
});

test('혼합계산 모드에서 연산 순서 예제를 열고, 연속 도전 난이도와 기록을 높인다', () => {
  const page = boot();
  page.click('grade', { grade: '3' });
  page.click('mixed');
  assert.match(page.app.innerHTML, /혼합계산 도전/);
  page.click('rule');
  assert.match(page.app.innerHTML, /18 ÷ 3 \+ 4 × 2 = 14/);
  page.click('home');
  page.click('resume');
  assert.match(page.app.innerHTML, /연속 1번째 퍼즐/);
  for (let run = 1; run <= 3; run++) {
    const session = page.progress().session;
    assert.equal(session.run, run);
    const puzzle = page.context.NumberMazeEngine.buildPuzzle({ grade: 3, tier: session.tier, seed: session.seed, mixed: true });
    puzzle.givens.forEach((given, index) => {
      if (given != null) return;
      page.click('number', { number: String(puzzle.solution[index]) });
      page.click('slot', { index: String(index) });
    });
    page.click('submit');
    assert.match(page.app.innerHTML, /수식을 모두 완성했어요/);
    assert.equal(page.progress().mixedBest['3'], run);
    page.click('next');
  }
  assert.match(page.app.innerHTML, /연속 4번째 퍼즐/);
  assert.match(page.app.innerHTML, /난이도 2 \/ 5/);
});

test('올바른 숫자 배치를 하면 결과가 저장되고 다음 단계가 열린다', () => {
  const page = boot();
  page.click('adventure');
  const puzzle = page.context.NumberMazeEngine.buildPuzzle({ grade: 1, tier: 1, seed: 'adventure-1-1' });
  puzzle.givens.forEach((given, index) => {
    if (given != null) return;
    page.click('number', { number: String(puzzle.solution[index]) });
    page.click('slot', { index: String(index) });
  });
  page.click('submit');
  assert.match(page.app.innerHTML, /수식을 모두 완성했어요/);
  const saved = page.progress();
  assert.equal(saved.chapters['1'].unlocked, 2);
  assert.equal(saved.chapters['1'].cleared['1'], 3);
  page.click('next');
  assert.match(page.app.innerHTML, /2단계/);
});

test('힌트와 되돌리기가 숫자 목록을 망가뜨리지 않는다', () => {
  const page = boot();
  page.click('adventure');
  page.click('hint');
  assert.match(page.app.innerHTML, /힌트 1회/);
  page.click('undo');
  assert.match(page.app.innerHTML, /되돌리기/);
  assert.doesNotMatch(page.app.innerHTML, /수식을 모두 완성했어요/);
});

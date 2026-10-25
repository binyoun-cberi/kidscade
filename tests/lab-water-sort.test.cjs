'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const core = require('../games/lab_water_sort/water-sort-core.js');
const BASE = path.join(__dirname, '../games/lab_water_sort');

test('pour accepts matching colours and empty tubes but rejects illegal moves', () => {
  const t = [[0, 1], [1], [], [0, 0, 0, 0], [2]];
  assert.equal(core.canPour(t, 0, 1), true);
  assert.equal(core.canPour(t, 0, 2), true);
  for (const [from, to] of [[4, 0], [2, 0], [0, 0], [0, 3], [-1, 1], [0, 99]]) {
    assert.equal(core.canPour(t, from, to), false, from + ' -> ' + to);
  }
});
test('partial run fits exactly, undo restores the complete pre-move board', () => {
  const t = [[1, 0, 0, 0], [2, 0], []], before = core.clone(t);
  const count = core.pour(t, 0, 1);
  assert.equal(count, 2);
  assert.deepEqual(t, [[1, 0], [2, 0, 0, 0], []]);
  for (let i = 0; i < count; i++) t[0].push(t[1].pop());
  assert.deepEqual(t, before);
});
test('win requires full monochrome tubes, not partially full matching colours', () => {
  assert.equal(core.solved([[0, 0, 0, 0], [1, 1, 1, 1], []]), true);
  assert.equal(core.solved([[0, 0], [1, 1, 1, 1], []]), false);
  assert.equal(core.solved([[0, 1, 1, 1], [1, 0, 0, 0], []]), false);
});
test('all 100 deterministic levels have an executable constructive solution', () => {
  assert.equal(core.LEVEL_COUNT, 100);
  for (let level = 1; level <= core.LEVEL_COUNT; level++) {
    const puzzle = core.generate(level), repeat = core.generate(level);
    const cfg = core.config(level);
    assert.deepEqual(puzzle.tubes, repeat.tubes, 'level ' + level + ' must not change on restart');
    assert.equal(puzzle.tubes.length, cfg.colors + cfg.empty, 'tube count ' + level);
    assert.ok(cfg.colors <= core.MARKERS.length, 'markers for all colours ' + level);
    assert.equal(core.solved(puzzle.tubes, cfg.capacity), false, 'not pre-solved ' + level);
    const counts = Array(cfg.colors).fill(0);
    for (const tube of puzzle.tubes) {
      assert.ok(tube.length <= cfg.capacity, 'not over capacity ' + level);
      for (const color of tube) {
        assert.ok(Number.isInteger(color) && color >= 0 && color < cfg.colors);
        counts[color]++;
      }
    }
    assert.ok(counts.every(n => n === cfg.capacity), 'conserve units ' + level);
    const current = core.clone(puzzle.tubes);
    const recorded = core.recordedHints(puzzle.tubes, puzzle.solution, cfg.capacity);
    for (const move of puzzle.solution) {
      assert.deepEqual(recorded.get(core.stateKey(current)), move, 'hint matches ' + level);
      assert.ok(core.canPour(current, ...move, cfg.capacity), 'legal step ' + level);
      assert.ok(core.pour(current, ...move, cfg.capacity) > 0);
    }
    assert.ok(core.solved(current, cfg.capacity), 'level solves ' + level);
  }
});
test('all 12 marker glyphs are distinct; level bounds prevent reused colours', () => {
  assert.equal(new Set(core.MARKERS).size, 12);
  assert.equal(core.config(1000).level, 100);
  assert.equal(core.config(1000).colors, 12);
  assert.equal(core.config(0).level, 1);
});
test('incremental search only provides valid routes', () => {
  const initial = [[1, 0, 0, 0], [0, 1, 1, 1], []];
  const job = core.createSearch(initial, 4, 20000);
  while (!job.done) job.step(2);
  assert.ok(job.solution && job.solution.length);
  const copy = core.clone(initial);
  for (const move of job.solution) assert.ok(core.pour(copy, ...move) > 0);
  assert.ok(core.solved(copy));
});
test('browser entry wires hint, undo, markers and keyboard support', () => {
  const html = fs.readFileSync(path.join(BASE, '연구소 물 정렬 퍼즐.html'), 'utf8');
  assert.match(html, /src="\.\/water-sort-core\.js"/);
  for (const needle of ['function undoMove()', 'function requestHint()', 'function toggleMarkers()',
    'beakerDiv.onkeydown', 'env(safe-area-inset-bottom', '--drop-height']) {
    assert.ok(html.includes(needle), 'missing ' + needle);
  }
  const script = html.match(/<script>\s*([\s\S]*?)<\/script>/);
  assert.ok(script);
  assert.doesNotThrow(() => new Function(script[1]), 'inline game code syntax');
});

test('UI-level hint, pour animation state, and undo stay consistent', async () => {
  const html = fs.readFileSync(path.join(BASE, '연구소 물 정렬 퍼즐.html'), 'utf8');
  const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
  class MockNode {
    constructor() {
      this.children = [];
      this.className = '';
      this.attrs = {};
      this.style = { setProperty(key, value) { this[key] = value; } };
      this.classList = { add() {}, remove() {}, contains() { return false; } };
    }
    appendChild(node) { this.children.push(node); return node; }
    setAttribute(k, v) { this.attrs[k] = v; }
    remove() {}
    animate() { return { onfinish: null }; }
    getBoundingClientRect() { return { left: 20, top: 120, width: 72, height: 208, bottom: 328 }; }
    querySelectorAll(sel) {
      return this.children.filter(el => sel === '.water-layer' && el.className === 'water-layer');
    }
    set innerHTML(v) { this.children = []; this.html = v; }
    get innerHTML() { return this.html; }
  }
  const nodes = new Map();
  function getNode(id) { if (!nodes.has(id)) nodes.set(id, new MockNode()); return nodes.get(id); }
  const document = {
    body: new MockNode(), head: new MockNode(), getElementById: getNode,
    createElement: () => new MockNode(), querySelector: getNode,
  };
  const app = new Function('document', 'window', 'localStorage', 'LabWaterSortCore',
    'requestAnimationFrame', 'setTimeout', 'setInterval', 'clearInterval',
    script + '\nreturn {initStage,handleBeakerClick,undoMove,requestHint,getBoard:()=>beakers,' +
    'getUndo:()=>undoStack,setStage:n=>{stage=n},getHint:()=>[selectedBeakerIndex,hintTarget]}')(
      document, {}, { getItem: () => null, setItem() {} }, core,
      fn => fn(), fn => fn(), () => 1, () => {});
  for (const stage of [1, 30, 60, 100]) {
    app.setStage(stage);
    app.initStage();
    const original = core.clone(app.getBoard());
    const first = core.generate(stage).solution[0];
    app.requestHint();
    assert.deepEqual(app.getHint(), first, 'hint selects valid pair at stage ' + stage);
    await app.handleBeakerClick(first[1]);
    assert.equal(app.getUndo().length, 1, 'one pour recorded at stage ' + stage);
    assert.notDeepEqual(app.getBoard(), original, 'pour updates board at stage ' + stage);
    app.undoMove();
    assert.deepEqual(app.getBoard(), original, 'undo exactly restores stage ' + stage);
  }
});

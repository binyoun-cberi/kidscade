'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const S = require('../games/high_twelve_island/sim.js');
const ROOT = path.resolve(__dirname, '..');
const gameDir = path.join(ROOT, 'games/high_twelve_island');

test('Twelve Island registers a complete accessible game and uses existing assets', () => {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/games.json'), 'utf8'));
  const entry = data.games.find(g => g.id === 'high_twelve_island');
  assert.ok(entry);
  assert.equal(entry.subject, 'social');
  assert.equal(entry.age, 'high');
  for (const file of ['index.html', 'style.css', 'game.js', 'sim.js', 'art.js'])
    assert.ok(fs.statSync(path.join(gameDir, file)).size > 100);
  const html = fs.readFileSync(path.join(gameDir, 'index.html'), 'utf8');
  assert.match(html, /data-game-id="high_twelve_island"/);
  assert.match(html, /sim.js\?v=1/);
  assert.match(html, /art.js\?v=2/);
  assert.match(html, /game.js\?v=2/);
  assert.match(html, /id="islandCanvas"/);
  assert.ok(entry.href.endsWith("?v=2"));
  assert.ok(fs.existsSync(path.join(ROOT, entry.cover)));
  for (const asset of ['assets/game/2d/tilesets/kenney-tiny-town/atlas/tilemap-packed.png',
    'assets/game/2d/tilesets/kenney-tiny-farm/atlas/tilemap-packed.png',
    'assets/game/2d/characters/kenney-modular-characters/face/completes/face1.png',
    'assets/game/2d/characters/kenney-modular-characters/skin/tint-3/tint3_head.png',
    'assets/game/2d/characters/kenney-modular-characters/hair/brown-1/brown1Woman1.png'])
    assert.ok(fs.existsSync(path.join(ROOT, asset)), asset);
});

test('initial state has three visible resources and four free workers', () => {
  const s = S.initial(7);
  assert.equal(s.population, 12);
  assert.equal(s.stage, 1);
  assert.equal(s.food, 65);
  assert.equal(s.wood, 40);
  assert.equal(s.trust, 65);
  assert.equal(S.unused(s), 4);
  assert.equal(S.capacity(s), 16);
});

test('event-driven first rule requires a choice and enacts a lasting law', () => {
  const s = S.initial(7);
  for (let i = 0; i < 3; i++) S.tick(s);
  assert.equal(s.pending, 'first_rule');
  const n = s.tick;
  S.tick(s);
  assert.equal(s.tick, n, 'events must pause world time');
  const trust = s.trust;
  const result = S.resolveEvent(s, 1);
  assert.equal(result.ok, true);
  assert.equal(s.laws.ration, 'effort');
  assert.equal(s.passed.length, 1);
  assert.equal(s.trust, trust + 2, 'event-enacted law must modify original state');
  assert.equal(s.pending, null);
});

test('resource costs are enforced and insufficient resource options cannot be selected', () => {
  const s = S.initial(4);
  s.food = 2;
  s.wood = 0;
  S.tick(s);
  assert.equal(s.pending, 'emergency');
  const failure = S.resolveEvent(s, 0);
  assert.equal(failure.ok, false);
  assert.equal(s.pending, 'emergency');
  const woodAfterTick = s.wood;
  assert.equal(S.resolveEvent(s, 2).ok, true);
  assert.ok(s.food > 0);
  assert.equal(s.wood, woodAfterTick, "rescue cannot conjure or spend additional wood");
});

test('buildings and lasting laws change the simulator calculation', () => {
  const s = S.initial(7);
  const base = S.rates(s).food;
  assert.equal(S.build(s, 'farm'), true);
  assert.ok(S.rates(s).food > base);
  assert.equal(S.build(s, 'hut'), true);
  assert.equal(S.capacity(s), 22);
  assert.equal(S.enact(s, 'storage', 'reserve').ok, true);
  assert.equal(s.foodCap, 135);
  assert.equal(S.enact(s, 'ration', 'effort').ok, true);
  assert.ok(S.rates(s).foodUse > 0);
});

test('stage 2 unlocks from population, a farm and a rule, then adds the treasury', () => {
  const s = S.initial(7);
  S.build(s, 'farm');
  S.build(s, 'hut');
  S.enact(s, 'ration', 'equal');
  s.tick = 8;
  s.lastBirth = 8;
  s.population = 18;
  s.food = 90;
  S.tick(s);
  assert.equal(s.stage, 2);
  assert.equal(s.treasury, 20);
  assert.equal(S.BUILDINGS.clinic.stage, 2);
  assert.ok(S.rates(s).treasury > 0);
});

test('town tax law is decided by a simulated vote with repeatable outcomes', () => {
  const s = S.initial(7);
  s.stage = 2;
  s.population = 20;
  s.trust = 20;
  const projected = S.expectedVotes(s, 'tax', 'high');
  assert.ok(projected.yes <= projected.total);
  assert.equal(projected.passed, false);
  const rejected = S.enact(s, 'tax', 'high');
  assert.equal(rejected.ok, false);
  assert.equal(s.laws.tax, undefined);
  const accepted = S.enact(s, 'tax', 'low');
  assert.equal(accepted.ok, true);
  assert.equal(s.laws.tax, 'low');
});

test('long autonomous runs have valid resources, time-pause and no unwinnable event', () => {
  for (const seed of [3, 9, 42, 777]) {
    const s = S.initial(seed);
    S.build(s, 'farm');
    S.build(s, 'hut');
    let events = 0;
    for (let i = 0; i < 250; i++) {
      S.tick(s);
      if (s.pending) {
        const e = S.EVENTS.find(x => x.id === s.pending);
        const ix = e.options.findIndex(o => !o.cost || Object.entries(o.cost).every(([key, amount]) => s[key] >= amount));
        assert.ok(ix >= 0, 'event must have an affordable solution: ' + e.id);
        assert.equal(S.resolveEvent(s, ix).ok, true);
        events++;
      }
      assert.ok(Number.isFinite(s.food) && s.food >= 0 && s.food <= s.foodCap);
      assert.ok(Number.isFinite(s.wood) && s.wood >= 0);
      assert.ok(Number.isFinite(s.trust) && s.trust >= 0 && s.trust <= 100);
      assert.ok(S.unused(s) >= 0);
      if (s.tick === 13) S.enact(s, 'ration', 'equal');
    }
    assert.ok(events >= 1);
    assert.equal(s.stage, 2, 'seed ' + seed + ' should reach town');
    const resumed = S.normalize(JSON.parse(JSON.stringify(s)));
    assert.equal(resumed.stage, s.stage);
    assert.equal(resumed.population, s.population);
  }
});


test('pixel-art renderer uses the real packed atlases for scene, buildings and citizens', () => {
  const vm = require('node:vm');
  const script = fs.readFileSync(path.join(gameDir, 'art.js'), 'utf8');
  const drawn = [];
  class FakeImage {
    set src(value) { this.url = value; this.onload?.(); }
  }
  const ctx = {
    clearRect() {}, fillRect() {}, beginPath() {}, ellipse() {}, fill() {}, stroke() {},
    moveTo() {}, lineTo() {}, save() {}, restore() {}, clip() {},
    drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh) {
      drawn.push({ path: img.url, sx, sy, sw, sh, dx, dy, dw, dh });
      assert.ok(sw === 16 && sh === 16);
      assert.ok(sx >= 0 && sx < 192 && sy >= 0 && sy < 176);
      assert.ok(dw > 0 && dh > 0);
    }
  };
  const root = { requestAnimationFrame() { return 1; } };
  vm.runInNewContext(script, { window: root, document: { hidden: false }, Image: FakeImage });
  const canvas = { getContext: () => ctx, width: 0, height: 0 };
  assert.equal(root.IslandArt.mount(canvas), true);
  const state = S.initial(7);
  root.IslandArt.setState(state);
  assert.equal(canvas.width, 720);
  assert.ok(drawn.some(item => item.path.includes('kenney-tiny-town')), 'town terrain and trees');
  assert.ok(drawn.some(item => item.path.includes('kenney-tiny-farm')), 'farm residents and supplies');
  const firstCount = drawn.length;
  state.buildings.farm = 2;
  state.buildings.hut = 1;
  state.buildings.store = 1;
  state.buildings.clinic = 1;
  state.buildings.hall = 1;
  state.stage = 2;
  root.IslandArt.setState(state);
  assert.ok(drawn.length > firstCount, 'building sprites appear as progress increases');
});

test('modular character portraits are wired into the event dialogue', () => {
  const script = fs.readFileSync(path.join(gameDir, 'game.js'), 'utf8');
  assert.match(script, /function characterPortrait\(/);
  assert.match(script, /NPC_ASSET.*kenney-modular-characters/);
  assert.match(script, /speaker"\)\.innerHTML = characterPortrait/);
});

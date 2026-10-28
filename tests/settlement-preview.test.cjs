'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const S = require('../games/high_human_history_cards/settlement/sim.js');
function run(s, seconds, input) { for (let i = 0; i < seconds * 10; i++) S.tick(s, .1, input); }
function materials(s, cost) {
  for (const [key, n] of Object.entries(cost)) {
    let guard = 0;
    while (s.resources[key] < n && guard++ < 100) run(s, 1, { harvest: key });
    assert.ok(s.resources[key] >= n, `reachable ${key}`);
  }
}
function build(s, id) {
  materials(s, S.PROJECTS[id].cost);
  assert.equal(S.startProject(s, id).ok, true, id);
  run(s, S.PROJECTS[id].time + .2, { help: true });
  assert.equal(s.project, null, `complete ${id}`);
}

test('new settlement is linked without replacing the card entry, game ID or its save', () => {
  const dir = path.join(__dirname, '../games/high_human_history_cards');
  const old = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  const preview = fs.readFileSync(path.join(dir, 'settlement/index.html'), 'utf8');
  assert.match(old, /href="\.\/settlement\/index\.html"/);
  assert.match(old, /id="startBtn"/);
  assert.match(preview, /data-game-id="high_human_history_cards"/);
  assert.match(fs.readFileSync(path.join(dir, 'settlement/game.js'), 'utf8'), /settlement-v1/);
});

test('two founders can sustain food and automate wood before building or recruiting', () => {
  const s = S.initial();
  assert.equal(S.assign(s, 1, 'gather').ok, true);
  assert.equal(S.assign(s, 2, 'wood').ok, true);
  assert.ok(S.rates(s).food >= 2);
  run(s, 120);
  assert.ok(s.resources.food > 24);
  assert.ok(s.resources.wood > 6);
  assert.equal(S.capacity(s), 2);
  assert.match(S.recruitReason(s), /움집/);
});

test('outputs enter inventory only after transport, including a deferred job change', () => {
  const s = S.initial();
  S.assign(s, 1, 'wood');
  for (let guard = 0; !s.workers[0].cargo && guard < 1000; guard++) S.tick(s, .1);
  const w = s.workers[0];
  assert.deepEqual(w.cargo, { type: 'wood', amount: 4 });
  assert.equal(s.resources.wood, 6);
  S.assign(s, 1, 'stone');
  assert.equal(w.job, 'wood');
  assert.equal(w.nextJob, 'stone');
  run(s, 8);
  assert.equal(s.resources.wood, 10);
  assert.equal(w.job, 'stone');
  assert.equal(w.cargo, null);
});

test('cancel returns reserved cost once and work cannot duplicate a completed project', () => {
  const s = S.initial();
  materials(s, S.PROJECTS.hut.cost);
  const before = { ...s.resources };
  S.startProject(s, 'hut');
  assert.equal(s.resources.wood, before.wood - 12);
  assert.equal(S.startProject(s, 'fire').ok, false);
  run(s, 5, { help: true });
  S.cancelProject(s);
  assert.equal(s.resources.wood, before.wood);
  assert.equal(s.resources.stone, before.stone);
  assert.equal(S.cancelProject(s), false);
  build(s, 'hut'); run(s, 30, { help: true });
  assert.equal(S.count(s, 'hut'), 1);
});

test('normal actions connect first house, river survey, farming, pottery and Neolithic settlement', () => {
  const s = S.initial();
  S.assign(s, 1, 'gather'); S.assign(s, 2, 'wood');
  assert.equal(S.startProject(s, 'farm').ok, false);
  assert.equal(S.harvest(s, 'clay', 6), false);
  build(s, 'hut'); build(s, 'tools'); build(s, 'fire'); build(s, 'survey');
  assert.equal(s.flags.survey, true);
  build(s, 'farm');
  assert.equal(S.assign(s, 1, 'farm').ok, true);
  assert.ok(S.rates(s).food > 8);
  build(s, 'pottery'); build(s, 'hut');
  run(s, 61);
  assert.equal(s.era, 'neolithic');
  assert.equal(S.requirements(s).every(q => q.done), true);
  assert.ok(s.time < 900, `simulated clear ${s.time}s`);
  const time = s.time;
  build(s, 'warehouse');
  assert.equal(S.storageCap(s), 240);
  assert.ok(s.time > time);
  assert.equal(S.recruit(s).ok, true);
  assert.equal(s.workers.length, 3);
  assert.equal(S.recruit(s).ok, false);
});

test('food shortage has a free recovery path and does not remove inhabitants', () => {
  const s = S.initial(); run(s, 400);
  assert.equal(s.resources.food, 0);
  assert.equal(s.workers.length, 2);
  assert.equal(S.recruit(s).ok, false);
  S.assign(s, 1, 'gather');
  run(s, 90, { harvest: 'food' });
  assert.ok(s.resources.food > 12);
  assert.equal(s.workers.length, 2);
});

test('tools, roads and local storage improve different portions of the production cycle', () => {
  const s = S.initial(); S.assign(s, 1, 'wood');
  const base = S.rateFor(s, s.workers[0]);
  s.flags.tools = true;
  const tools = S.rateFor(s, s.workers[0]);
  assert.ok(tools > base);
  assert.equal(S.workTime(s, 'wood'), 14);
  s.flags.road = true;
  assert.ok(S.rateFor(s, s.workers[0]) > tools);
  assert.equal(S.workTime(s, 'wood'), 14);
  s.buildings.push({ type: 'warehouse', x: 10, y: 9 });
  assert.deepEqual(S.depot(s, S.NODES.wood), { type: 'warehouse', x: 10, y: 9 });
});

test('storage-full cargo remains physical and is delivered after space opens', () => {
  const s = S.initial(); S.assign(s, 1, 'wood');
  for (let i = 0; !s.workers[0].cargo && i < 1000; i++) S.tick(s, .1);
  s.resources.wood = 60;
  run(s, 10);
  assert.equal(s.workers[0].phase, 'full');
  assert.equal(s.workers[0].cargo.amount, 4);
  s.resources.wood -= 12;
  run(s, .1);
  assert.equal(s.resources.wood, 52);
  assert.equal(s.workers[0].cargo, null);
});

test('save/restore mid-transport and mid-build matches uninterrupted execution', () => {
  const s = S.initial();
  S.assign(s, 1, 'wood'); materials(s, S.PROJECTS.hut.cost); S.startProject(s, 'hut');
  run(s, 6, { help: true });
  const restored = S.restore(JSON.parse(JSON.stringify(s)));
  assert.ok(restored);
  run(s, 40, { help: true }); run(restored, 40, { help: true });
  assert.deepEqual(restored, s);
  assert.equal(S.count(restored, 'hut'), 1);
});

test('invalid and future saves are rejected without touching supplied records', () => {
  const future = S.initial(); future.version = 99;
  assert.equal(S.restore(future), null);
  const invalid = S.initial(); invalid.resources.food = -1;
  assert.equal(S.restore(invalid), null);
  assert.equal(invalid.resources.food, -1);
  const injection = S.initial(); injection.workers[0].job = 'unknown';
  assert.equal(S.restore(injection), null);
  assert.equal(S.restore(S.initial()).workers[0].name, '나루');
});

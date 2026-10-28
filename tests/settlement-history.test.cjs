'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const S = require('../games/high_human_history_cards/settlement/sim.js');
const H = S.History;
const run = (s, time, input) => { for (let i = 0; i < time; i++) S.tick(s, 1, input); };

function playthrough() {
  const s = S.initial();
  S.assign(s, 1, 'gather'); S.assign(s, 2, 'wood');
  function ensure(key, amount) {
    let guard = 0;
    if (S.NODES[key]) {
      while (s.resources[key] < amount && guard++ < 300) run(s, 1, { harvest: key });
    } else {
      const job = Object.keys(H.JOBS).find(id => H.JOBS[id].resource === key), d = S.JOBS[job];
      assert.ok(S.jobLimit(s, job), `facility for ${job}`);
      while (s.resources[key] < amount && guard++ < 100) {
        for (const [input, n] of Object.entries(d.cost || {})) ensure(input, n + (job === 'charcoal' && input === 'wood' ? 12 : 0));
        assert.equal(S.assign(s, 2, job).ok, true);
        const before = s.resources[key];
        let wait = 0;
        while (s.resources[key] <= before && wait++ < 120) run(s, 1);
        assert.ok(wait < 120, `production ${job}: ${s.workers[1].phase}`);
      }
    }
    assert.ok(s.resources[key] >= amount, `${key} reachable, need ${amount}, have ${s.resources[key]}`);
    if (!S.NODES[key]) { S.assign(s, 2, 'idle'); run(s, 15); }
  }
  function build(id) {
    if (id !== 'hut' && S.finished(s, id)) return;
    for (let pass = 0; pass < 3; pass++) for (const [key, n] of Object.entries(S.PROJECTS[id].cost)) ensure(key, n);
    const result = S.startProject(s, id); assert.equal(result.ok, true, `${id}: ${result.reason}`);
    run(s, S.PROJECTS[id].time + 1, { help: true });
    assert.equal(s.project, null, `completed ${id}`);
  }
  for (const id of ['hut', 'tools', 'fire', 'survey', 'groundStone', 'farm']) build(id);
  S.assign(s, 1, 'farm');
  build('pottery'); build('hut'); run(s, 61);
  assert.equal(s.era, 'neolithic');
  function finish(id) {
    assert.equal(H.select(s, id).ok, true, `select ${id}`);
    const c = H.byId(id);
    for (const goal of c.goals) {
      if (goal.type === 'project') build(goal.id);
      if (goal.type === 'produced') ensure(goal.id, goal.amount);
      if (goal.type === 'action') {
        assert.equal(H.setPrintMode(s, goal.id === 'woodPrinted' ? 'woodblock' : 'type').ok, true);
        let guard = 0;
        while (!H.goalDone(s, goal) && guard++ < 10) ensure('book', s.resources.book + 2);
      }
    }
    assert.equal(H.answer(s, id, c.reflection.answer).ok, true);
    assert.equal(H.claim(s, id).ok, true, `claim ${id}: ${H.claimReason(s, id)}`);
  }
  return { s, ensure, build, finish };
}

test('all sixteen learning chapters are reachable through real production and public actions', () => {
  const p = playthrough();
  for (const c of H.CHAPTERS) p.finish(c.id);
  assert.equal(p.s.history.completed.length, 16);
  assert.equal(p.s.era, 'iron');
  assert.ok(p.s.history.actions.woodPrinted >= 2);
  assert.ok(p.s.history.actions.typePrinted >= 2);
  assert.ok(p.s.history.produced.bronze >= 2);
  assert.ok(p.s.history.produced.iron >= 3);
  const restored = S.restore(JSON.parse(JSON.stringify(p.s)));
  assert.ok(restored);
  assert.deepEqual(restored.history, p.s.history);
  assert.equal(H.claim(restored, 'goryeoPrint').ok, false);
});

test('contemporary states branch together and later periods require the whole comparison', () => {
  const p = playthrough();
  for (const id of ['paleolithic', 'neolithic', 'bronze', 'iron', 'gojoseon']) p.finish(id);
  for (const id of ['goguryeo', 'baekje', 'silla', 'gaya']) assert.equal(H.available(p.s, id), true);
  p.finish('gaya'); p.finish('baekje'); p.finish('goguryeo');
  assert.equal(H.available(p.s, 'balhae'), false);
  p.finish('silla');
  assert.equal(H.available(p.s, 'balhae'), true);
  assert.equal(H.available(p.s, 'unifiedSilla'), true);
  assert.equal(H.available(p.s, 'goryeoFound'), false);
});

test('timeline represents coexistence instead of replacing one country with another', () => {
  assert.deepEqual(H.timelineAt(650).map(c => c.id), ['goguryeo', 'baekje', 'silla']);
  assert.deepEqual(H.timelineAt(700).map(c => c.id), ['silla', 'balhae']);
  assert.deepEqual(H.timelineAt(910).map(c => c.id), ['silla', 'balhae', 'laterBaekje', 'laterGoguryeo']);
  assert.deepEqual(H.timelineAt(920).map(c => c.id), ['silla', 'balhae', 'laterBaekje', 'goryeoFound']);
  assert.deepEqual(H.timelineAt(940).map(c => c.id), ['goryeoFound']);
});

test('resource rate display includes every material and accounts for processing inputs', () => {
  const s = S.initial();
  assert.equal(Object.keys(S.rates(s)).length, Object.keys(S.RESOURCES).length);
  assert.ok(Object.values(S.rates(s)).every(Number.isFinite));
  s.buildings.push({ type: 'kiln', x: 19, y: 6 });
  S.assign(s, 2, 'charcoal');
  assert.ok(S.rates(s).charcoal > 0);
  assert.ok(S.rates(s).wood < 0);
  assert.ok(Object.values(S.rates(s)).every(Number.isFinite));
});

test('reflection alone cannot clear a chapter and wrong decisions allow another attempt', () => {
  const s = S.initial(), c = H.byId('paleolithic');
  assert.equal(H.answer(s, c.id, 1 - c.reflection.answer).ok, false);
  assert.equal(H.claim(s, c.id).ok, false);
  H.answer(s, c.id, c.reflection.answer);
  assert.equal(H.claim(s, c.id).ok, false);
  assert.equal(H.select(s, 'goryeoPrint').ok, false);
  assert.equal(H.answer(s, 'goryeoPrint', 1).ok, false);
});

test('processing consumes inputs once, keeps wood reserve and returns in-progress inputs on reassignment', () => {
  const p = playthrough(); p.finish('paleolithic'); p.finish('neolithic'); p.build('kiln');
  S.assign(p.s, 2, 'idle'); run(p.s, 20); p.s.resources.wood = 12;
  S.assign(p.s, 2, 'charcoal'); run(p.s, 30);
  assert.equal(p.s.resources.wood, 12); assert.equal(p.s.resources.charcoal, 0);
  p.s.resources.wood = 20; run(p.s, 1);
  assert.deepEqual(p.s.workers[1].reserved, { wood: 4 });
  assert.equal(p.s.resources.wood, 16);
  const restored = S.restore(JSON.parse(JSON.stringify(p.s))); assert.ok(restored);
  S.assign(restored, 2, 'idle'); assert.equal(restored.resources.wood, 20);
  assert.equal(restored.resources.charcoal, 0);
});

test('one-time Gaya exchange keeps its goods even when the store fills during work', () => {
  const p = playthrough();
  for (const id of ['paleolithic', 'neolithic', 'bronze', 'iron', 'gojoseon']) p.finish(id);
  p.ensure('iron', 4); p.ensure('wood', 10);
  const cap = S.storageCap(p.s); p.s.resources.food = cap; p.s.resources.clay = cap;
  assert.equal(S.startProject(p.s, 'gayaMarket').ok, true);
  run(p.s, S.PROJECTS.gayaMarket.time + 1, { help: true });
  assert.equal(p.s.resources.clay, cap + 6);
  assert.ok(p.s.resources.food > cap);
  assert.equal(S.startProject(p.s, 'gayaMarket').ok, false);
  assert.equal(S.count(p.s, 'gayaMarket'), 1);
});

test('v1 Neolithic saves migrate without losing villagers, inventory or ongoing construction', () => {
  const p = playthrough(); p.build('warehouse');
  p.ensure('wood', 4); p.ensure('stone', 10); S.startProject(p.s, 'road'); run(p.s, 3, { help: true });
  const legacy = JSON.parse(JSON.stringify(p.s));
  legacy.version = 1; delete legacy.history;
  for (const k of Object.keys(H.RESOURCES)) delete legacy.resources[k];
  legacy.workers.forEach(w => { delete w.reserved; });
  const restored = S.restore(legacy);
  assert.ok(restored); assert.equal(restored.version, 2);
  assert.equal(restored.resources.wood, legacy.resources.wood);
  assert.deepEqual(restored.buildings, legacy.buildings);
  assert.deepEqual(restored.project, legacy.project);
  assert.deepEqual(restored.history.completed, ['paleolithic', 'neolithic']);
  assert.equal(restored.history.active, 'bronze');
  assert.equal(restored.resources.iron, 0);
  assert.equal(legacy.version, 1);
});

test('chapter data has complete sources and keeps key historical distinctions explicit', () => {
  assert.equal(new Set(H.CHAPTERS.map(c => c.id)).size, H.CHAPTERS.length);
  for (const c of H.CHAPTERS) {
    assert.ok(c.sources.length && c.sources.every(id => H.SOURCES[id]?.url.startsWith('https://')));
    assert.ok(c.requires.every(id => H.byId(id)));
    assert.ok(c.reflection.answer >= 0 && c.reflection.answer < c.reflection.choices.length);
    for (const g of c.goals) if (g.type === 'project') assert.ok(S.PROJECTS[g.id]);
  }
  assert.match(H.byId('bronze').facts.join(' '), /석기/);
  assert.match(H.byId('goryeoFound').period, /918.*936/);
  assert.match(H.byId('goryeoPrint').facts.join(' '), /현재 남아 있는/);
  assert.match(H.byId('goryeoPrint').facts[0], /금속활자로 만든 것이 아니/);
});

test('history and production UI render all learning material from the actual definitions', () => {
  const window = { SettlementSim: S };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../games/high_human_history_cards/settlement/history-ui.js'), 'utf8'), { window });
  const lesson = window.SettlementHistoryUI.markup(S.initial(), true);
  for (const c of H.CHAPTERS) assert.ok(lesson.includes(c.title));
  assert.match(lesson, /920년/);
  assert.match(lesson, /학습용 모형/);
  const production = window.SettlementHistoryUI.production(S.initial(), H.ICONS, '');
  assert.match(production, /구리광석/); assert.match(production, /금속활자 방식/);
});

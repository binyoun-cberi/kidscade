'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../games/high_human_history_cards/settlement/sim.js');
const B = S.Bronze, P = S.Prehistory;
function scene() {
  const s = S.initial();
  s.era = 'neolithic'; s.history.completed = ['paleolithic', 'neolithic']; s.history.active = 'bronze';
  s.flags = { tools: true, survey: true, pottery: true, road: true };
  for (const id of ['groundStone', 'farm', 'granary', 'broadField', 'mumunStore', 'kiln', 'prospect', 'castingWorkshop', 'barterPlace']) s.buildings.push({ type: id, ...S.PROJECTS[id].sites[0] });
  return s;
}
function tool(s, id) { s.prehistory.tools[id] = P.TOOLS[id].uses; s.prehistory.selected = id; }

test('new fields distinguish single hand harvest, selective ears, stem rows and pottery transport without weakening the old field', () => {
  const s = scene(); s.bronze.crops.fill(30);
  assert.equal(S.bronzeAction(s, 'harvest', 0).ok, true); assert.equal(s.bronze.bundles, 1);
  tool(s, 'reaping'); assert.equal(S.bronzeAction(s, 'harvest', 1).ok, true); assert.equal(s.bronze.bundles, 4);
  assert.equal(s.prehistory.tools.reaping, 47);
  tool(s, 'sickle'); const wear = s.prehistory.tools.sickle;
  assert.equal(S.bronzeAction(s, 'harvest', 4).ok, false); // row has immature plots
  assert.equal(s.prehistory.tools.sickle, wear);
  assert.equal(S.bronzeAction(s, 'harvest', 6).ok, true); assert.equal(s.bronze.bundles, 10);
  assert.equal(s.resources.fiber, 6);
  assert.equal(S.bronzeAction(s, 'carry').ok, true); assert.equal(s.bronze.delivery.amount, 10);
  assert.equal(S.bronzeAction(s, 'carry').ok, false); // cannot reserve twice
  assert.equal(s.bronze.grain, 0); S.tick(s, 2.1); assert.equal(s.bronze.grain, 10);
  s.prehistory.crops.fill(20); s.prehistory.selected = 'handaxe';
  assert.equal(S.lifeAction(s, 'grain', 2).ok, true); assert.equal(s.prehistory.grain, 3);
  assert.ok(S.restore(s));
});

test('research follows real experience, wrong answers cost nothing, and automation expands without allocating staff', () => {
  const s = scene(), before = JSON.stringify(s.resources);
  assert.equal(B.answer(s, 'harvest', 0).ok, false);
  s.bronze.crops.fill(30); tool(s, 'triangleKnife'); S.bronzeAction(s, 'harvest', 0);
  assert.equal(B.answer(s, 'harvest', 1).ok, false); assert.equal(JSON.stringify(s.resources), before);
  assert.equal(B.answer(s, 'harvest', 0).ok, true);
  assert.equal(B.answer(s, 'storage', 1).ok, false);
  S.bronzeAction(s, 'carry'); S.tick(s, 2.1);
  assert.equal(B.answer(s, 'storage', 1).ok, true);
  S.tick(s, 35);
  assert.ok(s.bronze.stats.harvested > 3); assert.ok(s.bronze.stats.processed > 0);
  assert.equal(s.workers.length, 2); assert.ok(s.workers.every(w => w.job === 'idle'));
});

test('full food storage retains processed meals; combined crop storage is bounded and mid-delivery saves resume exactly', () => {
  const s = scene(); s.resources.food = S.storageCap(s); s.bronze.bundles = 12;
  S.bronzeAction(s, 'carry'); S.tick(s, .8);
  const loaded = S.restore(s); assert.ok(loaded);
  S.tick(s, 1.5); S.tick(loaded, 1.5); assert.deepEqual(loaded, s);
  s.resources.food = S.storageCap(s);
  assert.equal(S.bronzeAction(s, 'mill').ok, true); assert.equal(s.bronze.meals, 3);
  S.tick(s, .1); assert.ok(s.bronze.meals > 2.9);
  s.resources.food -= 3; S.tick(s, .1); assert.equal(s.bronze.meals, 0);
  s.bronze.grain = 120; s.bronze.crops.fill(30); tool(s, 'reaping');
  assert.equal(S.bronzeAction(s, 'harvest', 0).ok, false);
  assert.equal(s.prehistory.tools.reaping, 48);
});

test('rice is optional and queues only after harvesting existing crops without deleting growth', () => {
  const s = scene(); S.tick(s, 14); const before = [...s.bronze.crops];
  assert.equal(S.bronzeAction(s, 'rice').ok, false);
  s.buildings.push({ type: 'riceField', ...S.PROJECTS.riceField.sites[0] });
  assert.equal(S.bronzeAction(s, 'rice').ok, true); assert.deepEqual(s.bronze.crops, before);
  S.tick(s, 16.1); tool(s, 'reaping'); S.bronzeAction(s, 'harvest', 0);
  assert.deepEqual(s.bronze.kinds.slice(0, 4), ['rice', 'rice', 'rice', 'millet']);
  S.tick(s, 31); assert.ok(Math.abs(s.bronze.crops[0] - 31) < 1e-8); assert.equal(s.bronze.crops[3], 30);
  assert.ok(S.restore(s));
});

test('one batch reserves once, survives a full store and automation stop, and a restored job cannot duplicate bronze', () => {
  const s = scene(); Object.assign(s.resources, { copper: 2, tin: 1, charcoal: 2 });
  assert.equal(S.bronzeAction(s, 'bronze').ok, true);
  assert.equal(S.bronzeAction(s, 'bronze').ok, false); assert.equal(s.resources.copper, 0);
  S.tick(s, 5); const restored = S.restore(s); assert.ok(restored);
  s.resources.bronze = S.storageCap(s); restored.resources.bronze = S.storageCap(restored);
  S.cityAction(s, 'automatic'); S.cityAction(restored, 'automatic');
  S.tick(s, 30); S.tick(restored, 30); assert.deepEqual(restored, s);
  assert.equal(s.civilization.tasks.bronze.phase, 'delivery');
  s.resources.bronze -= 2; S.tick(s, .1);
  assert.equal(s.civilization.tasks.bronze, undefined); assert.equal(s.history.produced.bronze, 2);
  assert.equal(B.answer(s, 'casting', 0).ok, true);
});

test('barter never consumes the protected living reserve or loses output into a full clay store', () => {
  const s = scene(); s.resources.food = 19; assert.equal(S.bronzeAction(s, 'exchange').ok, false);
  s.resources.food = 20; s.resources.clay = S.storageCap(s);
  assert.equal(S.bronzeAction(s, 'exchange').ok, false); assert.equal(s.resources.food, 20);
  s.resources.clay -= 4; assert.equal(S.bronzeAction(s, 'exchange').ok, true);
  assert.equal(s.resources.food, 12); assert.equal(s.resources.clay, S.storageCap(s));
});

test('tomb evidence needs observation in a real expanded town, gives no production buff, and Iron/Gojoseon open together', () => {
  const s = scene(); assert.equal(B.answer(s, 'evidence', 1).ok, false);
  for (const id of ['neighborhood', 'quarter', 'dolmen']) { s.buildings.push({ type: id, ...S.PROJECTS[id].sites[0] }); S.Civilization.complete(s, id); }
  const before = S.rates(s);
  for (const e of B.EVIDENCE) assert.equal(S.bronzeAction(s, 'observe:' + e.id).ok, true);
  assert.equal(B.answer(s, 'evidence', 0).ok, false); assert.equal(B.answer(s, 'evidence', 1).ok, true);
  assert.deepEqual(S.rates(s), before);
  for (const id of ['bronzeRitual']) s.buildings.push({ type: id, ...S.PROJECTS[id].sites[0] });
  Object.assign(s.bronze.research, { harvest: true, storage: true, casting: true }); s.bronze.stats.processed = 1;
  S.History.answer(s, 'bronze', 1); assert.equal(S.History.claim(s, 'bronze').ok, true);
  assert.equal(S.History.available(s, 'iron'), true); assert.equal(S.History.available(s, 'gojoseon'), true);
  assert.equal(s.civilization.homes, 12); assert.ok(S.restore(s));
});

test('v4 progress migrates without forcing finished Bronze again; invalid new state is rejected without overwriting input', () => {
  const s = scene(); s.history.completed.push('bronze'); const old = JSON.parse(JSON.stringify(s));
  old.version = 4; delete old.bronze;
  const restored = S.restore(old); assert.ok(restored); assert.equal(restored.version, 5);
  assert.deepEqual(restored.resources, old.resources); assert.deepEqual(restored.history, old.history);
  assert.deepEqual(restored.workers, old.workers); assert.deepEqual(restored.buildings, old.buildings);
  assert.equal(restored.bronze.research.casting, true); assert.equal(old.version, 4);
  restored.bronze.delivery = { amount: 999, progress: 0 }; assert.equal(S.restore(restored), null);
  const future = S.initial(); future.version = 6; assert.equal(S.restore(future), null);
});

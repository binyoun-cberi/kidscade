'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../games/high_human_history_cards/settlement/sim.js');
const C = S.Civilization, P = S.Prehistory, H = S.History;
let seed;
function run(s, n, input) { S.tick(s, n, input); }
function ensure(s, key, amount) {
  for (let i = 0; s.resources[key] + 1e-7 < amount && i < 2000; i++) {
    if (S.NODES[key]) run(s, 1, { harvest: key });
    else if (key === 'fiber') { S.cityAction(s, 'fiber'); run(s, .5); }
    else { run(s, 2, { harvest: 'wood' }); }
  }
  assert.ok(s.resources[key] + 1e-7 >= amount, `${key}: ${s.resources[key]} / ${amount}`);
}
function build(s, id) {
  if (id !== 'hut' && S.finished(s, id)) return;
  let result;
  for (let i = 0; i < 10; i++) {
    for (const [key, n] of Object.entries(S.PROJECTS[id].cost)) ensure(s, key, n);
    result = S.startProject(s, id); if (result.ok) break;
  }
  assert.equal(result.ok, true, `${id}: ${result.reason}`);
  run(s, S.PROJECTS[id].time + 1, { help: true });
  assert.equal(s.project, null);
}
function foundation() {
  if (seed) return S.restore(seed);
  const s = S.initial(); P.craft(s, 'chopper');
  for (const id of ['hut', 'sharedGathering', 'tools', 'fire', 'survey', 'groundStone', 'farm', 'pottery', 'hut', 'woodshop', 'flintWorkshop']) build(s, id);
  ensure(s, 'stone', 1); P.craft(s, 'adze'); for (let i = 0; i < 6; i++) P.grind(s);
  assert.equal(C.answer(s, 'toolbox', 0).ok, true);
  assert.equal(C.answer(s, 'production', 1).ok, true);
  build(s, 'maintenance'); C.answer(s, 'construction', 0);
  build(s, 'granary'); P.answer(s, 'pottery', 0); P.answer(s, 'tools', 0);
  run(s, 65);
  assert.equal(s.era, 'neolithic');
  for (const id of ['paleolithic', 'neolithic']) { H.answer(s, id, H.byId(id).reflection.answer); assert.equal(H.claim(s, id).ok, true, H.claimReason(s, id)); }
  seed = JSON.parse(JSON.stringify(s)); assert.ok(S.restore(seed)); return S.restore(seed);
}
function finishChapter(s, id) {
  H.select(s, id);
  for (const g of H.byId(id).goals) {
    if (g.type === 'project') build(s, g.id);
    if (g.type === 'produced') ensure(s, g.id, g.amount);
    if (g.type === 'action') {
      H.setPrintMode(s, g.id === 'woodPrinted' ? 'woodblock' : 'type');
      for (let i = 0; !H.goalDone(s, g) && i < 1000; i++) run(s, 2, { harvest: 'wood' });
      assert.equal(H.goalDone(s, g), true, g.id);
    }
  }
  H.answer(s, id, H.byId(id).reflection.answer);
  assert.equal(H.claim(s, id).ok, true, `${id}: ${H.claimReason(s, id)}`);
}

test('two idle founders can connect all 16 chapters, 300 households and inheritance with public actions', () => {
  const s = foundation();
  build(s, 'neighborhood'); build(s, 'quarter');
  for (const chapter of H.CHAPTERS.slice(2)) finishChapter(s, chapter.id);
  for (const id of ['township', 'cityward', 'capital', 'civicMonument']) build(s, id);
  run(s, 120);
  assert.equal(s.civilization.homes, 300);
  assert.equal(s.workers.length, 2);
  assert.ok(s.workers.every(w => w.job === 'idle'));
  assert.ok(s.civilization.citizens > 0);
  assert.ok(S.rates(s).food > 0);
  assert.ok(S.restore(s));
  for (const a of C.ARTIFACTS) assert.equal(C.artifact(s, a.id, a.answer).ok, true);
  const points = C.reward(s), oldTime = s.time, reported = ['paleolithic']; s.history.reported = reported;
  assert.equal(S.inherit(s, 'craft').ok, true);
  assert.equal(s.civilization.legacy.points, points);
  assert.equal(s.civilization.legacy.archive[0].homes, 300);
  assert.equal(s.civilization.legacy.archive[0].time, oldTime);
  assert.equal(s.civilization.homes, 0); assert.equal(s.civilization.citizens, 0);
  assert.equal(s.history.completed.length, 0); assert.deepEqual(s.history.reported, reported);
  assert.equal(s.civilization.legacy.learned.length, 16);
  assert.equal(s.civilization.artifacts.length, 3);
  assert.ok(s.prehistory.tools.chopper > 0);
  const before = s.civilization.legacy.points;
  assert.equal(S.inherit(s, 'craft').ok, false);
  assert.equal(s.civilization.legacy.points, before);
  assert.equal(C.buy(s, 'farm').ok, true); assert.equal(s.civilization.legacy.upgrades.farm, 1);
  run(s, .1); assert.equal(s.civilization.research.toolbox, true);
  assert.equal(s.history.completed.length, 0); // Knowledge alone cannot skip actual production goals.
  for (let i = 0; i < 6; i++) S.harvest(s, 'food');
  run(s, .1); assert.deepEqual(s.history.completed, ['paleolithic']);
  assert.ok(s.civilization.legacy.tools.includes('adze'));
  assert.ok(S.restore(s));
});

test('bone needle, spinning, net and fishing form a real material chain without staff', () => {
  const s = foundation();
  // Actual hunt and hide work supply the needle and a sewn coat.
  ensure(s, 'stone', 1); P.craft(s, 'handaxe'); for (let i = 0; i < 3; i++) S.lifeAction(s, 'hunt');
  ensure(s, 'stone', 1); P.craft(s, 'scraper'); S.lifeAction(s, 'hide');
  assert.equal(P.craft(s, 'needle').ok, true);
  build(s, 'spinningHut'); ensure(s, 'clay', 2); assert.equal(P.craft(s, 'spindle').ok, true);
  ensure(s, 'thread', 5); assert.equal(S.cityAction(s, 'sew').ok, true);
  assert.equal(s.prehistory.clothing, true);
  assert.equal(S.cityAction(s, 'net').ok, true);
  ensure(s, 'stone', 1); P.craft(s, 'netWeight'); build(s, 'fishingHut');
  s.resources.food = 0; // Empty storage so an actual fish delivery can occur.
  run(s, 45);
  assert.ok(s.civilization.netUses < 20);
  assert.ok(s.civilization.delivered > 0);
  assert.equal(s.workers.length, 2);
});

test('toolbox selects the strongest matching known tool; maintenance reduces replacement material', () => {
  const s = foundation();
  ensure(s, 'stone', 2); P.craft(s, 'handaxe'); P.craft(s, 'chopper'); s.prehistory.selected = 'handaxe';
  assert.equal(C.toolFor(s, 'wood', P), 'chopper');
  P.craft(s, 'whetstone'); for (let i = 0; i < 6; i++) P.grind(s);
  s.civilization.automatic = false; s.prehistory.tools.chopper = 0;
  s.civilization.repairClock = 0; s.prehistory.tools.whetstone = 20;
  const stone = s.resources.stone;
  run(s, 1.05);
  assert.equal(s.prehistory.tools.chopper, 24);
  assert.ok(Math.abs(s.resources.stone - (stone - .5)) < 1e-6);
  assert.equal(s.prehistory.tools.whetstone, 19);
});

test('automatic jobs reserve once, finish on pause, preserve delivery under full storage and resume deterministically', () => {
  const s = foundation();
  const t = s.civilization.tasks.timber;
  assert.ok(t);
  S.cityAction(s, 'automatic');
  const snapshot = S.restore(s); assert.ok(snapshot);
  run(s, 40); run(snapshot, 40); assert.deepEqual(snapshot, s);
  assert.equal(s.civilization.tasks.timber, undefined);
  // One in-flight order cannot duplicate its input reservation when saved repeatedly.
  S.cityAction(s, 'automatic'); ensure(s, 'wood', 20); run(s, .1);
  assert.ok(s.civilization.tasks.timber);
  const full = S.restore(s); full.resources.timber = S.storageCap(full);
  S.cityAction(full, 'automatic'); run(full, 40);
  assert.equal(full.civilization.tasks.timber.phase, 'delivery');
  const remaining = full.civilization.tasks.timber.amount;
  full.resources.timber -= remaining; run(full, 1);
  assert.equal(full.civilization.tasks.timber, undefined);
  assert.equal(full.resources.timber, S.storageCap(full));
});

test('printing records retain the method captured when an automatic order started', () => {
  const s = foundation();
  for (const chapter of H.CHAPTERS.slice(2)) finishChapter(s, chapter.id);
  S.cityAction(s, 'automatic'); run(s, 50); // Finish prior orders first.
  s.history.actions.woodPrinted = 0; s.history.actions.typePrinted = 0;
  H.setPrintMode(s, 'woodblock'); ensure(s, 'paper', 2); ensure(s, 'charcoal', 1);
  S.cityAction(s, 'automatic'); run(s, .1); assert.equal(s.civilization.tasks.printer.method, 'woodblock');
  H.setPrintMode(s, 'type'); S.cityAction(s, 'automatic'); run(s, 50);
  assert.ok(s.history.actions.woodPrinted >= 2); assert.equal(s.history.actions.typePrinted, 0);
});

test('new district projects cancel once without creating homes and completed districts sustain growing demand', () => {
  const s = foundation();
  for (const [key, n] of Object.entries(C.PROJECTS.neighborhood.cost)) ensure(s, key, n);
  const before = s.resources.timber;
  assert.equal(S.startProject(s, 'neighborhood').ok, true);
  run(s, 1); assert.equal(S.cancelProject(s), true); assert.equal(S.cancelProject(s), false);
  assert.equal(s.civilization.homes, 0); assert.ok(s.resources.timber >= before);
  build(s, 'neighborhood'); run(s, 90);
  assert.equal(s.civilization.homes, 4); assert.equal(s.civilization.citizens, 8);
  assert.equal(S.population(s), 10); assert.ok(S.capacity(s) >= 10);
  assert.ok(S.rates(s).food > 0); assert.ok(s.resources.food > 0);
  S.assign(s, 2, 'builder'); build(s, 'quarter');
  assert.ok(s.workers[1].x > 32); // Optional legacy builder can travel into the expanded map.
  assert.ok(S.restore(s));
});

test('v3 migration preserves original work and inventory; invalid new jobs, homes and legacy are rejected', () => {
  const s = foundation(), old = JSON.parse(JSON.stringify(s));
  old.version = 3; delete old.civilization;
  for (const key of Object.keys(C.RESOURCES)) delete old.resources[key];
  const migrated = S.restore(old); assert.ok(migrated); assert.equal(migrated.version, 4);
  for (const [k, n] of Object.entries(old.resources)) assert.equal(migrated.resources[k], n);
  assert.deepEqual(migrated.buildings, old.buildings); assert.deepEqual(migrated.workers, old.workers);
  const bad = JSON.parse(JSON.stringify(s)); bad.civilization.homes = 300; assert.equal(S.restore(bad), null);
  bad.civilization.homes = 0; bad.civilization.legacy.upgrades.farm = 4; assert.equal(S.restore(bad), null);
  bad.civilization.legacy.upgrades.farm = 0; bad.civilization.tasks.timber.cost.wood = 0; assert.equal(S.restore(bad), null);
});

test('advanced trade leaves iron and living reserves, while growth is limited by real household capacity', () => {
  const s = foundation();
  for (const chapter of H.CHAPTERS.slice(2, 9)) finishChapter(s, chapter.id);
  S.cityAction(s, 'automatic'); run(s, 60);
  s.civilization.automatic = true; s.civilization.tradeClock = 29.95;
  s.resources.iron = 9; s.resources.timber = 9; s.resources.food = 0;
  run(s, .1); assert.equal(s.resources.iron, 9);
  s.resources.iron = 10; s.civilization.tradeClock = 29.95; run(s, .1);
  assert.equal(s.resources.iron, 8);
  assert.ok(s.resources.food > 11);
});

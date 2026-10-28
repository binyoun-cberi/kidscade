'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../games/high_human_history_cards/settlement/sim.js'), P = S.Prehistory;
function gather(s, type, amount) {
  let guard = 0;
  while (s.resources[type] + 1e-8 < amount && guard++ < 3000) { S.harvest(s, type); S.tick(s, .5); }
  assert.ok(s.resources[type] + 1e-8 >= amount, `gather ${type} ${amount}`);
}
function build(s, id) {
  for (const [k, n] of Object.entries(S.PROJECTS[id].cost)) gather(s, k, n);
  assert.equal(S.startProject(s, id).ok, true, S.projectReason(s, id));
  S.tick(s, S.PROJECTS[id].time + .2, { help: true });
}
function camp() { const s = S.initial(); build(s, 'hut'); build(s, 'sharedGathering'); build(s, 'tools'); return s; }
function farm() { const s = camp(); build(s, 'fire'); build(s, 'survey'); build(s, 'groundStone'); build(s, 'farm'); return s; }

test('rabbit hunting changes from 18 manual actions to 3 with a crafted handaxe', () => {
  const s = S.initial();
  for (let i = 0; i < 17; i++) S.lifeAction(s, 'hunt');
  assert.equal(s.prehistory.stats.hunts, 0);
  S.lifeAction(s, 'hunt'); assert.equal(s.prehistory.stats.hunts, 1);
  S.tick(s, 11);
  assert.equal(P.craft(s, 'handaxe').ok, true);
  for (let i = 0; i < 3; i++) assert.equal(S.lifeAction(s, 'hunt').ok, true);
  assert.equal(s.prehistory.stats.hunts, 2);
  assert.equal(s.prehistory.tools.handaxe, 21);
  assert.equal(S.lifeAction(s, 'hunt').ok, false); // No duplicate drop during respawn.
});

test('a chopper replaces six wood actions and worn tools require exactly one stone', () => {
  const s = S.initial(), before = s.resources.wood;
  for (let i = 0; i < 5; i++) S.harvest(s, 'wood');
  assert.equal(s.resources.wood, before);
  S.harvest(s, 'wood'); assert.equal(s.resources.wood, before + 3);
  const stone = s.resources.stone;
  assert.equal(P.craft(s, 'chopper').ok, true);
  S.harvest(s, 'wood'); assert.equal(s.resources.wood, before + 6);
  assert.equal(s.prehistory.tools.chopper, 23);
  P.craft(s, 'chopper'); assert.equal(s.resources.stone, stone - 1); // Equip never repairs for free.
  for (let i = 0; i < 23; i++) { s.resources.wood = 0; S.harvest(s, 'wood'); }
  assert.equal(s.prehistory.tools.chopper, 0);
  P.craft(s, 'chopper'); assert.equal(s.resources.stone, stone - 2);
  assert.equal(s.prehistory.tools.chopper, 24);
});

test('fire and clothing affect recoverable camp warmth without removing residents', () => {
  const s = S.initial();
  for (let i = 0; i < 7; i++) S.tick(s, 120);
  assert.equal(s.prehistory.warmth, 0); assert.equal(s.workers.length, 2);
  assert.equal(S.lifeAction(s, 'fuel').ok, true);
  S.tick(s, 20); assert.ok(s.prehistory.warmth > 0);
  assert.ok(s.resources.wood >= 0);
  s.prehistory.clothing = true; s.prehistory.fuel = 0; s.prehistory.warmth = 50;
  S.tick(s, 10); assert.ok(Math.abs(s.prehistory.warmth - 49) < .02);
});

test('specialized tools connect hunting, hide, bone, clothing and fictional shell exchange', () => {
  const s = S.initial();
  P.craft(s, 'handaxe'); for (let i = 0; i < 3; i++) S.lifeAction(s, 'hunt');
  P.craft(s, 'scraper'); assert.equal(S.lifeAction(s, 'hide').ok, true);
  P.craft(s, 'borer'); assert.equal(S.lifeAction(s, 'clothing').ok, true);
  S.tick(s, 25); assert.equal(S.lifeAction(s, 'shell').ok, true);
  assert.equal(S.lifeAction(s, 'bead').ok, true);
  // Use the last initial stone for a burin, then deliberately select a worn tool.
  P.craft(s, 'burin'); assert.equal(S.lifeAction(s, 'engrave').ok, true);
  s.prehistory.tools.handaxe = 0; s.resources.stone = 0;
  P.craft(s, 'handaxe');
  assert.equal(S.lifeAction(s, 'exchange').ok, true);
  assert.equal(s.prehistory.tools.handaxe, 32);
  assert.equal(s.prehistory.beads, 0);
  assert.equal(S.lifeAction(s, 'exchange').ok, false);
});

test('ground tools need grinding, can cancel without duplication, and do not masquerade as Neolithic reaping knives', () => {
  const s = farm(), stone = s.resources.stone;
  assert.equal(P.available(s, 'reaping'), false);
  assert.equal(P.craft(s, 'hoe').ok, true);
  for (let i = 0; i < 5; i++) P.grind(s);
  assert.equal(s.prehistory.tools.hoe, undefined);
  P.grind(s); assert.equal(s.prehistory.tools.hoe, 40);
  assert.equal(s.resources.stone, stone - 1);
  assert.equal(S.lifeAction(s, 'till').ok, true);
  assert.equal(s.prehistory.tilled, 45);
  assert.equal(s.prehistory.tools.hoe, 39);
  assert.equal(P.grind(s), false);
  gather(s, 'stone', 1); const before = s.resources.stone;
  P.craft(s, 'axe'); P.grind(s);
  assert.equal(S.lifeAction(s, 'cancelGrind').ok, true);
  assert.equal(S.lifeAction(s, 'cancelGrind').ok, false);
  assert.equal(s.resources.stone, before);
});

test('pottery groups ripe crops, quern improves food processing, automation needs no new worker', () => {
  const s = farm(); S.tick(s, 21);
  assert.equal(S.lifeAction(s, 'grain', 1).ok, true);
  assert.equal(s.prehistory.grain, 1);
  build(s, 'pottery'); S.tick(s, 21);
  const before = s.prehistory.grain;
  S.lifeAction(s, 'grain', 1); assert.equal(s.prehistory.grain, before + 3);
  gather(s, 'stone', 1); P.craft(s, 'quern'); for (let i = 0; i < 6; i++) P.grind(s);
  s.resources.food = 0;
  S.lifeAction(s, 'mill'); assert.equal(s.resources.food, 3);
  build(s, 'granary');
  assert.equal(P.answer(s, 'pottery', 1).ok, false);
  assert.equal(s.prehistory.research.pottery, undefined);
  assert.equal(P.answer(s, 'pottery', 0).ok, true);
  s.resources.food = 0;
  S.tick(s, 60);
  assert.ok(s.resources.food > 30);
  assert.ok(s.prehistory.stats.automatic > 0);
  assert.equal(s.workers.length, 2);
});

test('workshop and hearth research automate replacement and fuel, and wait safely without supplies', () => {
  const s = camp(); build(s, 'flintWorkshop'); build(s, 'fire'); build(s, 'hearth');
  assert.equal(P.answer(s, 'tools', 0).ok, true);
  assert.equal(P.answer(s, 'fire', 1).ok, true);
  gather(s, 'stone', 2); P.craft(s, 'chopper'); s.prehistory.tools.chopper = 0;
  const stone = s.resources.stone;
  S.tick(s, .1); assert.equal(s.prehistory.tools.chopper, 24); assert.equal(s.resources.stone, stone - 1);
  s.prehistory.fuel = 0; s.resources.wood = 2;
  S.tick(s, .1); assert.equal(s.resources.wood, 2);
  s.resources.wood = 3;
  S.tick(s, .1); assert.equal(s.resources.wood, 2); assert.ok(s.prehistory.fuel > 24);
  // No supply and no gatherer: automation waits, never creates negative inputs.
  s.buildings = s.buildings.filter(b => b.type !== 'sharedGathering');
  s.resources.stone = 0; s.prehistory.tools.chopper = 0; S.tick(s, 20);
  assert.equal(s.prehistory.tools.chopper, 0); assert.equal(s.resources.stone, 0);
  assert.ok(s.resources.wood >= 0);
});

test('v2 saves migrate once, mid-grind and timers resume, malformed new saves are rejected', () => {
  const s = farm(); gather(s, 'stone', 1); P.craft(s, 'quern'); P.grind(s); S.tick(s, 4);
  const restored = S.restore(s); assert.ok(restored);
  S.tick(s, 30); S.tick(restored, 30); assert.deepEqual(restored, s);
  const old = JSON.parse(JSON.stringify(s)); old.version = 2; delete old.prehistory;
  const migrated = S.restore(old); assert.ok(migrated); assert.equal(migrated.version, S.VERSION);
  assert.deepEqual(migrated.resources, old.resources); assert.deepEqual(migrated.buildings, old.buildings);
  assert.equal(migrated.prehistory.legacy, true);
  const bad = JSON.parse(JSON.stringify(s)); bad.prehistory.tools.handaxe = -1; assert.equal(S.restore(bad), null);
  bad.prehistory.tools = {}; bad.prehistory.selected = '__proto__'; assert.equal(S.restore(bad), null);
  bad.prehistory.selected = 'quern'; bad.prehistory.rabbit.respawn = Infinity; assert.equal(S.restore(bad), null);
});


test('full food storage does not block hunting for the hide and bone needed by other crafts', () => {
  const s = S.initial(); s.resources.food = S.storageCap(s);
  P.craft(s, 'handaxe');
  for (let i = 0; i < 3; i++) assert.equal(S.lifeAction(s, 'hunt').ok, true);
  assert.equal(s.prehistory.hide, 1); assert.equal(s.prehistory.bone, 1);
  assert.equal(s.resources.food, S.storageCap(s));
});

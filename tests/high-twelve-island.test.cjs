'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const S = require('../games/high_twelve_island/sim.js');
const ROOT = path.resolve(__dirname, '..');
const gameDir = path.join(ROOT, 'games/high_twelve_island');

test('Village Chief Simulator registers a complete accessible game and uses existing assets', () => {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/games.json'), 'utf8'));
  const entry = data.games.find(g => g.id === 'high_twelve_island');
  assert.ok(entry);
  assert.equal(entry.subject, 'social');
  assert.equal(entry.age, 'high');
  for (const file of ['index.html', 'style.css', 'game.js', 'sim.js', 'art.js'])
    assert.ok(fs.statSync(path.join(gameDir, file)).size > 100);
  const html = fs.readFileSync(path.join(gameDir, 'index.html'), 'utf8');
  assert.match(html, /data-game-id="high_twelve_island"/);
  assert.match(html, /sim.js\?v=8/);
  assert.match(html, /art.js\?v=8/);
  assert.match(html, /game.js\?v=8/);
  assert.match(html, /id="islandCanvas"/);
  assert.match(html, /data-tab="residents"/);
  assert.match(html, /id="policyNotice"/);
  assert.match(html, /id="crisisStrip"/);
  assert.ok(entry.href.endsWith("?v=8"));
  assert.ok(fs.existsSync(path.join(ROOT, entry.cover)));
  for (const asset of ['assets/game/2d/tilesets/kenney-tiny-town/atlas/tilemap-packed.png',
    'assets/game/2d/tilesets/kenney-tiny-farm/atlas/tilemap-packed.png',
    'assets/game/2d/characters/kenney-modular-characters/face/completes/face1.png',
    'assets/game/2d/characters/kenney-modular-characters/skin/tint-3/tint3_head.png',
    'assets/game/2d/characters/kenney-modular-characters/hair/brown-1/brown1Woman1.png'])
    assert.ok(fs.existsSync(path.join(ROOT, asset)), asset);
});

test('initial state keeps two children out of the regular adult work roster', () => {
  const s = S.initial(7);
  assert.equal(s.population, 12);
  assert.equal(s.stage, 1);
  assert.equal(s.food, 65);
  assert.equal(s.wood, 40);
  assert.equal(s.trust, 65);
  assert.equal(S.unused(s), 2);
  assert.equal(S.childCount(s), 2);
  assert.equal(S.adultCapacity(s), 10);
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


test('founders have names and different viewpoints react to laws and scarce food', () => {
  const s = S.initial(7);
  assert.equal(s.citizens.length, 12);
  assert.deepEqual(s.citizens.slice(0, 3).map(p => p.name), ['하나', '태오', '미래']);
  assert.equal(s.citizens[0].focus, 'fairness');
  const person = s.citizens[0], before = S.residentView(s, person);
  assert.equal(S.enact(s, 'ration', 'equal').ok, true);
  assert.notEqual(S.residentView(s, person).thought, before.thought);
  const foodCitizen = s.citizens.find(p => p.focus === 'food');
  s.food = 9;
  assert.equal(S.residentView(s, foodCitizen).mood, '걱정');
  assert.ok(S.communityPulse(s).걱정 > 0);
});

test('newcomers quietly join, stay in the roster and leave their origin in records', () => {
  const s = S.initial(42);
  for (let i = 0; i < 3; i++) S.tick(s);
  assert.equal(S.resolveEvent(s, 0).ok, true);
  for (let i = 0; i < 7 && s.arrivalLog.length === 0; i++) {
    S.tick(s);
    if (s.pending) assert.equal(S.resolveEvent(s, 0).ok, true);
  }
  assert.equal(s.citizens.length, 13);
  assert.equal(s.population, 13);
  assert.equal(s.arrivalLog.length, 1);
  assert.equal(s.pending, null, 'joining must not open a blocking event');
  assert.equal(s.arrivalNotice, null);
  const joined = s.arrivalLog[0];
  assert.ok(joined.origin.length > 10);
  assert.ok(s.log.some(line => line.text.includes(joined.name) && line.text.includes(joined.origin)));
  const week = s.tick;
  S.tick(s);
  assert.equal(s.tick, week + 1, 'time must continue after a newcomer joins');
  const restored = S.normalize(JSON.parse(JSON.stringify(s)));
  assert.equal(restored.arrivalLog[0].name, joined.name);
});

test('legacy save gains matching resident records but does not invent old backstories', () => {
  const old = S.initial(7);
  old.population = 18;
  delete old.citizens;
  delete old.arrivalLog;
  delete old.nextCitizenIndex;
  const restored = S.normalize(old);
  assert.equal(restored.citizens.length, 18);
  assert.equal(restored.nextCitizenIndex, 18);
  assert.match(restored.citizens[12].origin, /이전 저장 기록/);
  assert.deepEqual(restored.arrivalLog, []);
});

test('citizen ID is not reused after a departure', () => {
  const s = S.initial(7);
  const first = S.createCitizen(s.nextCitizenIndex++, 'arrival', 8);
  s.citizens.push(first);
  s.population++;
  s.citizens.pop();
  s.population--;
  const next = S.createCitizen(s.nextCitizenIndex++, 'arrival', 16);
  s.citizens.push(next);
  s.population++;
  assert.notEqual(first.id, next.id);
  assert.equal(s.citizens.length, s.population);
});

test('resident UI shows live thoughts and keeps arrival records separate', () => {
  const js = fs.readFileSync(path.join(gameDir, 'game.js'), 'utf8');
  assert.match(js, /function renderResidents\(/);
  assert.match(js, /S\.residentView\(state, citizen\)/);
  assert.match(js, /S\.communityPulse\(state\)/);
  assert.match(js, /state\.arrivalLog/);
  assert.match(js, /escapeHTML\(item\.origin\)/);
  assert.doesNotMatch(js, /selectedCitizenId = arrivingId/);
});


test('ration routes have different weekly economics and dedicated follow-up petitions', () => {
  const outcomes = {};
  for (const law of ['equal', 'effort', 'needs']) {
    const s = S.initial(20);
    const enacted = S.enact(s, 'ration', law);
    assert.equal(enacted.ok, true);
    outcomes[law] = S.rates(s);
    s.tick = 12;
    s.winterPrepared = 0;
    s.pressure.ration = 3.5;
    const event = S.chooseEvent(s);
    assert.equal(event.id, 'ration_' + law + '_petition');
    s.pending = event.id;
    assert.equal(S.resolveEvent(s, 0).ok, true);
    assert.equal(s.passed.includes('ration'), true);
    assert.ok(s.decisions.some(d => d.title === event.title), 'selected branch must be recorded');
    if (law === 'equal') assert.equal(s.safeguards.fairBonus, true);
    if (law === 'effort') assert.equal(s.safeguards.effortCare, true);
    if (law === 'needs') assert.equal(s.safeguards.needsAudit, true);
  }
  assert.ok(outcomes.effort.gather > outcomes.equal.gather);
  assert.ok(outcomes.effort.foodUse > outcomes.equal.foodUse);
  assert.ok(outcomes.needs.foodUse > outcomes.equal.foodUse);
  assert.ok(outcomes.needs.wood < outcomes.equal.wood);
});

test('recurring petitions allow renewed review of already-active safeguards', () => {
  const s = S.initial(12);
  S.enact(s, 'ration', 'effort');
  s.safeguards.effortCare = true;
  s.pressure.ration = 4.5;
  s.tick = 25;
  s.pending = 'ration_effort_petition';
  assert.equal(S.resolveEvent(s, 0).ok, true);
  assert.equal(s.pending, null);
  assert.ok(s.pressure.ration < 2);
});

test('long extra work accumulates fatigue and changes actual production and labor events', () => {
  const s = S.initial(7);
  S.enact(s, 'labor', 'extra');
  const before = S.rates(s).gather;
  for (let i = 0; i < 30; i++) {
    S.advanceConsequences(s);
    s.tick++;
  }
  assert.ok(s.workStrain >= 5);
  assert.ok(S.rates(s).gather < before);
  const event = S.chooseEvent(s);
  assert.equal(event.id, 'labor_fatigue');
  s.pending = event.id;
  assert.equal(S.resolveEvent(s, 0).ok, true);
  assert.equal(s.safeguards.workBreak, true);
  assert.ok(s.workStrain < 8.1);
});

test('promised law reviews trigger a follow-up and can be fulfilled', () => {
  const s = S.initial(8);
  S.enact(s, 'ration', 'equal');
  s.tick = 18;
  s.pressure.ration = 3.5;
  s.pending = 'ration_equal_petition';
  assert.equal(S.resolveEvent(s, 2).ok, true);
  assert.equal(s.pledges.length, 1);
  const due = s.pledges[0].due;
  s.tick = due;
  s.cooldown = 0;
  const followup = S.chooseEvent(s);
  assert.equal(followup.id, 'unkept_pledge');
  s.pending = followup.id;
  assert.equal(S.resolveEvent(s, 0).ok, true);
  assert.equal(s.safeguards.fairBonus, true);
  assert.equal(s.pledges.length, 0);
});

test('a previously enacted ration reform fulfills the active pledge', () => {
  const s = S.initial(7);
  S.enact(s, 'ration', 'equal');
  s.pledges.push({ kind: 'ration', title: '배급법 재검토', due: 30 });
  const before = s.trust;
  assert.equal(S.enact(s, 'ration', 'needs').ok, true);
  assert.equal(s.pledges.length, 0);
  assert.ok(s.trust > before);
});

test('reserve, exchange and sharing laws alter storm aftermath in different ways', () => {
  const losses = {};
  for (const policy of ['reserve', 'exchange', 'share']) {
    const s = S.initial(19);
    S.enact(s, 'storage', policy);
    s.food = 87;
    s.stormUntil = s.tick + 1;
    s.stormAftermathAt = s.stormUntil;
    S.tick(s);
    losses[policy] = s.food;
    assert.equal(s.stormUntil, 0);
    assert.equal(s.stormAftermathAt, 1);
  }
  assert.ok(losses.reserve > losses.exchange);
  assert.ok(losses.exchange > losses.share);
});

test('public decision procedure changes whether care law needs voting and waiting', () => {
  const meeting = S.initial(9);
  meeting.stage = 2;
  assert.equal(S.enact(meeting, 'process', 'meeting').ok, true);
  assert.equal(S.ruleProcedure(meeting, 'care', 'basic'), 'vote');
  const voted = S.enact(meeting, 'care', 'basic');
  assert.equal(voted.ok, true);
  assert.ok(voted.vote && voted.vote.total === 12);
  assert.ok(meeting.voteCooldownUntil > meeting.tick);
  assert.equal(S.enact(meeting, 'care', 'medical').ok, false);

  const delegated = S.initial(9);
  delegated.stage = 2;
  assert.equal(S.enact(delegated, 'process', 'delegate').ok, true);
  assert.equal(S.ruleProcedure(delegated, 'care', 'basic'), 'direct');
  const result = S.enact(delegated, 'care', 'basic');
  assert.equal(result.ok, true);
  assert.equal(result.vote, null);
  assert.equal(delegated.authorityUses, 1);
  assert.equal(S.ruleProcedure(delegated, 'tax', 'low'), 'vote');
});

test('voters have distinct interests and their viewpoints alter the fictional vote', () => {
  const s = S.initial(50);
  s.stage = 2;
  s.trust = 80;
  s.buildings.clinic = 1;
  s.citizens.forEach(p => { p.focus = 'work'; });
  const allWork = S.expectedVotes(s, 'tax', 'high');
  s.citizens.forEach(p => { p.focus = 'public'; });
  const publicServices = S.expectedVotes(s, 'tax', 'high');
  assert.ok(publicServices.yes > allWork.yes);
  assert.equal(publicServices.members.length, 12);
  assert.equal(publicServices.members[0].name, '하나');
});

test('legacy v3 saves acquire new consequences without losing citizen or building data', () => {
  const prior = S.initial(24);
  prior.buildings.farm = 2;
  prior.laws.ration = 'effort';
  delete prior.pressure;
  delete prior.workStrain;
  delete prior.safeguards;
  delete prior.pledges;
  delete prior.decisions;
  const loaded = S.normalize(JSON.parse(JSON.stringify(prior)));
  assert.equal(loaded.buildings.farm, 2);
  assert.equal(loaded.laws.ration, 'effort');
  assert.equal(loaded.citizens.length, loaded.population);
  assert.equal(loaded.pressure.ration, 0);
  assert.equal(loaded.safeguards.effortCare, false);
  assert.deepEqual(loaded.pledges, []);
});

test('v4 UI shows continuing effects, deadlines, personal votes and dynamic event descriptions', () => {
  const html = fs.readFileSync(path.join(gameDir, 'index.html'), 'utf8');
  const js = fs.readFileSync(path.join(gameDir, 'game.js'), 'utf8');
  assert.match(html, /id="policyNotice"/);
  assert.match(js, /function renderPolicyStatus/);
  assert.match(js, /function consequenceBoard/);
  assert.match(js, /S\.policyEffect\(id, option.id\)/);
  assert.match(js, /vote\.members/);
  assert.match(js, /typeof event\.body === "function"/);
});


test('law routes unlock exclusive active operations with costs and waiting periods', () => {
  const equal = S.initial(1);
  S.enact(equal, 'ration', 'equal');
  assert.ok(S.availableActions(equal).some(a => a.id === 'communalMeal' && a.enabled));
  assert.ok(!S.availableActions(equal).some(a => a.id === 'focusedHarvest'));
  const beforeFood = equal.food, beforeTrust = equal.trust;
  assert.equal(S.performAction(equal, 'communalMeal').ok, true);
  assert.equal(equal.food, beforeFood - 12);
  assert.equal(equal.trust, beforeTrust + 4);
  assert.equal(S.performAction(equal, 'communalMeal').ok, false);

  const effort = S.initial(2);
  S.enact(effort, 'ration', 'effort');
  const before = S.rates(effort).gather;
  assert.ok(!S.availableActions(effort).some(a => a.id === 'communalMeal'));
  assert.equal(S.performAction(effort, 'focusedHarvest').ok, true);
  assert.ok(effort.boostUntil > effort.tick);
  assert.ok(S.rates(effort).gather > before);
  assert.ok(effort.workStrain > 0);

  const needs = S.initial(3);
  S.enact(needs, 'ration', 'needs');
  const wood = needs.wood;
  assert.equal(S.performAction(needs, 'supportReview').ok, true);
  assert.equal(needs.wood, wood - 7);
  assert.ok(needs.decisions.some(x => x.title.includes('추가 지원 현황 확인')));
});

test('reserve food is actually saved and emergency withdrawal transfers rather than creates it', () => {
  const s = S.initial(42);
  S.enact(s, 'storage', 'reserve');
  s.food = 110;
  S.tick(s);
  assert.ok(s.reserveFood > 0);
  s.food = 18;
  s.reserveFood = 16;
  const before = s.food + s.reserveFood;
  const action = S.availableActions(s).find(a => a.id === 'openReserve');
  assert.ok(action && action.enabled);
  assert.equal(S.performAction(s, 'openReserve').ok, true);
  assert.equal(s.food + s.reserveFood, before);
  assert.equal(s.reserveFood, 0);
  assert.equal(S.performAction(s, 'openReserve').ok, false);
});

test('repealing the reserve law releases stored food and respects lower warehouse capacity', () => {
  const s = S.initial(99);
  S.enact(s, 'storage', 'reserve');
  s.food = 90;
  s.reserveFood = 20;
  assert.equal(S.enact(s, 'storage', 'exchange').ok, true);
  assert.equal(s.foodCap, 100);
  assert.equal(s.food, 100);
  assert.equal(s.reserveFood, 0);
});

test('extra-work recovery operation spends food and trades immediate output for lower strain', () => {
  const s = S.initial(88);
  S.enact(s, 'labor', 'extra');
  s.workStrain = 5;
  const before = S.rates(s).gather;
  const food = s.food;
  assert.equal(S.performAction(s, 'recoveryWeek').ok, true);
  assert.equal(s.food, food - 8);
  assert.ok(s.workStrain < 5);
  assert.ok(S.rates(s).gather < before);
  assert.ok(s.workReliefUntil > s.tick);
});

test('work screen displays unlocked management actions and emergency reserve status', () => {
  const js = fs.readFileSync(path.join(gameDir, 'game.js'), 'utf8');
  assert.match(js, /function operationCards/);
  assert.match(js, /S\.availableActions\(state\)/);
  assert.match(js, /S\.performAction\(state, operation\.dataset\.operation\)/);
  assert.match(js, /state\.reserveFood/);
});


test('a forecast appears before the first winter and winter consumes fuel each week', () => {
  const s = S.initial(10);
  S.enact(s, 'ration', 'equal');
  while (s.tick < 8 && !s.pending) S.tick(s);
  assert.equal(s.pending, 'winter_warning');
  assert.equal(S.resolveEvent(s, 0).ok, true);
  assert.equal(s.winterPrepared, 2);
  while (s.tick < 16) {
    if (s.pending) S.resolveEvent(s, 0);
    S.tick(s);
  }
  assert.equal(s.winterCount, 1);
  assert.equal(s.coldUntil, 30);
  assert.equal(S.winterActive(s), true);
  const r = S.rates(s);
  assert.ok(r.heating >= 2);
  assert.ok(s.wood >= 0);
});

test('later winters last longer and require more fuel while reducing food output', () => {
  const s = S.initial(9);
  s.tick = 40;
  s.nextWinterAt = 70;
  s.coldUntil = 55;
  s.winterPrepared = 2;
  s.winterCount = 1;
  const first = S.rates(s);
  s.winterCount = 4;
  const later = S.rates(s);
  assert.ok(later.heating > first.heating);
  assert.ok(later.gather < first.gather);
});

test('fuel shortage lowers warmth and eventually affects resident health', () => {
  const s = S.initial(30);
  S.enact(s, 'ration', 'equal');
  s.tick = 22;
  s.nextWinterAt = 55;
  s.coldUntil = 38;
  s.winterPrepared = 0;
  s.winterCount = 1;
  s.warmth = 48;
  s.wood = 0;
  s.cooldown = 100;
  const h = s.health;
  for (let i = 0; i < 3; i++) S.tick(s);
  assert.ok(s.warmth < 48);
  assert.ok(s.health < h);
});

test('forcing children into dangerous work raises output but removes study and harms wellbeing', () => {
  const s = S.initial(17);
  s.tick = 20;
  s.coldUntil = 36;
  s.nextWinterAt = 50;
  s.winterPrepared = 0;
  s.food = 50;
  s.eventsSeen.first_rule = true;
  assert.equal(S.chooseEvent(s).id, 'child_labor_debate');
  const normal = S.rates(s).gather;
  s.pending = 'child_labor_debate';
  assert.equal(S.resolveEvent(s, 2).ok, true);
  assert.ok(S.rates(s).gather > normal);
  assert.ok(S.rightsConcerns(s).includes('어린이 위험 노동'));
  const education = s.education, wellbeing = s.childWellbeing;
  S.tick(s);
  S.tick(s);
  assert.ok(s.education < education);
  assert.ok(s.childWellbeing < wellbeing);
  const afterWork = s.education;
  assert.equal(S.performAction(s, 'stopChildWork').ok, true);
  assert.ok(!S.rightsConcerns(s).includes('어린이 위험 노동'));
  assert.equal(s.education, afterWork, 'ending forced work does not instantly restore education');
  s.education = 60;
  s.wood = 15;
  assert.equal(S.performAction(s, 'resumeLearning').ok, true);
  assert.equal(s.education, 69);
});

test('dangerous child work automatically stops when children become too unwell to work', () => {
  const s = S.initial(21);
  s.tick = 21;
  s.nextWinterAt = 50;
  s.coldUntil = 36;
  s.winterCount = 1;
  s.childWorkUntil = 29;
  s.childWellbeing = 26;
  s.cooldown = 100;
  const before = s.health;
  S.tick(s);
  assert.equal(s.childWorkUntil, 0);
  assert.ok(s.health < before);
  assert.ok(s.rightsHistory.some(h => h.status === '건강 악화로 중단'));
});

test('adult forced work creates lasting health costs and can be ended directly', () => {
  const s = S.initial(6);
  s.tick = 25;
  s.coldUntil = 39;
  s.nextWinterAt = 50;
  s.winterCount = 1;
  s.winterPrepared = 0;
  s.wood = 11;
  s.eventsSeen.child_labor_debate = true;
  s.pending = 'forced_labor_debate';
  const baseline = S.rates(s).wood;
  assert.equal(S.resolveEvent(s, 2).ok, true);
  assert.ok(S.rates(s).wood > baseline);
  const health = s.health;
  S.tick(s);
  assert.ok(s.health < health);
  assert.ok(S.rightsConcerns(s).includes('강제 노동'));
  assert.equal(S.performAction(s, 'stopForcedWork').ok, true);
  assert.equal(S.rightsConcerns(s).includes('강제 노동'), false);
  assert.ok(s.health < health);
});

test('excluding residents from rations saves food but harms health and may be reversed', () => {
  const s = S.initial(71);
  s.tick = 23;
  s.nextWinterAt = 50;
  s.coldUntil = 35;
  s.winterCount = 1;
  s.food = 22;
  const beforeUse = S.rates(s).foodUse;
  s.pending = 'ration_exclusion_debate';
  assert.equal(S.resolveEvent(s, 2).ok, true);
  assert.ok(S.rates(s).foodUse < beforeUse);
  assert.ok(S.rightsConcerns(s).includes('일부 주민 배급 제외'));
  const health = s.health;
  S.tick(s);
  assert.ok(s.health < health);
  assert.equal(S.performAction(s, 'restoreRations').ok, true);
  assert.equal(S.rightsConcerns(s).includes('일부 주민 배급 제외'), false);
});

test('legacy v5 saves postpone newly introduced winter rather than chaining old winters', () => {
  const old = S.initial(7);
  old.tick = 211;
  old.wood = 425;
  delete old.nextWinterAt;
  delete old.woodCap;
  delete old.winterCount;
  old.pending = 'new_resident';
  const d = S.normalize(JSON.parse(JSON.stringify(old)));
  assert.equal(d.pending, null);
  assert.ok(d.nextWinterAt >= d.tick + 8);
  assert.ok(d.woodCap >= 425);
  assert.equal(d.wood, 425);
});

test('the crisis HUD, winter scenery and arrival history are connected', () => {
  const html = fs.readFileSync(path.join(gameDir, 'index.html'), 'utf8');
  const js = fs.readFileSync(path.join(gameDir, 'game.js'), 'utf8');
  const art = fs.readFileSync(path.join(gameDir, 'art.js'), 'utf8');
  assert.match(html, /id="crisisStrip"/);
  assert.match(js, /S\.rightsConcerns\(state\)/);
  assert.match(js, /state\.arrivalLog/);
  assert.match(js, /function renderCrisis\(/);
  assert.match(art, /latest\.coldUntil > latest\.tick/);
});


test('heat, flood, dust and epidemic have separate emergency choices and lasting effects', () => {
  for (const [kind,id] of [['heat','heat_alert'],['flood','flood_alert'],['dust','dust_alert'],['epidemic','epidemic_alert']]) {
    const s=S.initial(31);
    s.eventsSeen.first_rule=true;s.nextWinterAt=900;s.tick=s.nextDisasters[kind]-1;
    for(const x of Object.keys(s.nextDisasters)) if(x!==kind)s.nextDisasters[x]=900;
    const food=s.food,water=s.water;
    S.tick(s);
    assert.equal(S.disasterActive(s,kind),true);
    assert.equal(s.pending,id);
    assert.ok(s.crisisHistory.some(c=>c.type===S.DISASTER_NAMES[kind]));
    assert.equal(S.resolveEvent(s,1).ok,true);
    assert.equal(s.disasterUnanswered[kind],false);
    if(kind==='flood'){assert.ok(s.food<food);assert.ok(s.water<water);assert.ok(s.floodDamageUntil>s.tick);}
    if(kind==='epidemic') assert.ok(s.sick>0);
  }
});

test('heat consumes water, polluted air and infection reduce production', () => {
  const a=S.initial(1),b=S.initial(1),c=S.initial(1),d=S.initial(1);
  a.tick=b.tick=c.tick=d.tick=33;
  b.disasters.heat=40;c.disasters.dust=40;d.disasters.epidemic=40;d.sick=7;
  assert.ok(S.rates(b).water<S.rates(a).water);
  assert.ok(S.rates(b).food<S.rates(a).food);
  assert.ok(S.rates(c).gather<S.rates(a).gather);
  assert.ok(S.rates(d).gather<S.rates(a).gather);
});

test('flood damage persists and player can spend wood to shorten the recovery', () => {
  const s=S.initial(10);s.tick=47;s.floodDamageUntil=60;s.wood=40;s.nextWinterAt=900;
  const original=s.floodDamageUntil;
  assert.equal(S.performAction(s,'repairFlood').ok,true);
  assert.ok(s.floodDamageUntil<original);
  assert.equal(s.wood,31);
});

test('worker strike removes real production and an agreement can end it', () => {
  const s=S.initial(10);s.tick=24;s.nextWinterAt=900;s.eventsSeen.first_rule=true;s.groups.workers=5;
  assert.equal(S.chooseEvent(s).id,'workers_collective');
  const production=S.rates(s).gather;
  s.pending='workers_collective';assert.equal(S.resolveEvent(s,2).ok,true);
  assert.ok(s.strikes.workers>s.tick);assert.ok(S.rates(s).gather<production);
  assert.equal(S.performAction(s,'workerMediation').ok,true);
  assert.equal(s.strikes.workers,0);assert.ok(S.rates(s).gather>=production);
});

test('unresolved family boycott stops arrivals and can result in emigration', () => {
  const s=S.initial(11);s.tick=25;s.nextWinterAt=900;s.eventsSeen.first_rule=true;s.groups.families=5;
  assert.equal(S.chooseEvent(s).id,'families_collective');
  s.pending='families_collective';assert.equal(S.resolveEvent(s,2).ok,true);
  assert.ok(s.arrivalsPausedUntil>s.tick);
  const pop=s.population;s.tick=s.familyExitAt;
  assert.equal(S.chooseEvent(s).id,'family_departure');
  s.pending='family_departure';assert.equal(S.resolveEvent(s,2).ok,true);
  assert.equal(s.population,pop-1);assert.equal(s.citizens.length,s.population);
});

test('caregiver walkout raises infection numbers during an epidemic', () => {
  const normal=S.initial(4),strike=S.initial(4);
  for(const s of [normal,strike]){
    s.tick=78;s.nextWinterAt=900;s.nextDisasters={heat:900,flood:900,dust:900,epidemic:900};
    s.disasters.epidemic=95;s.sick=4;s.stage=2;s.buildings.clinic=1;s.treasury=50;
  }
  strike.strikes.carers=88;
  S.tick(normal);S.tick(strike);
  assert.ok(strike.sick>normal.sick);
});

test('loss of trust can trigger a real caretaker period limiting legal authority', () => {
  const s=S.initial(5);s.stage=2;s.tick=37;s.nextWinterAt=900;
  s.trust=16;s.groups={workers:4,families:4,carers:4};s.eventsSeen.first_rule=true;
  assert.equal(S.chooseEvent(s).id,'confidence_crisis');
  s.pending='confidence_crisis';assert.equal(S.resolveEvent(s,0).ok,true);
  assert.ok(s.mandateRestrictedUntil>s.tick);
  assert.equal(S.canBuild(s,'farm'),false);
  assert.equal(S.enact(s,'labor','balanced').ok,false);
  s.water=19;assert.equal(S.performAction(s,'fetchWater').ok,true);
});

test('settlement collapse allows recorded ending while blocking further simulation', () => {
  const s=S.initial(5);s.tick=98;s.health=1;s.collapseWeeks=3;s.nextWinterAt=900;
  assert.equal(S.chooseEvent(s).id,'community_collapse');
  s.pending='community_collapse';assert.equal(S.resolveEvent(s,2).ok,true);
  assert.equal(s.ended,true);
  const previous=s.tick;S.tick(s);assert.equal(s.tick,previous);
  assert.equal(S.assign(s,'gather',1),false);
});

test('older save acquires future disaster schedules and untroubled population groups', () => {
  const old=S.initial(9);old.tick=200;
  delete old.nextDisasters;delete old.disasters;delete old.groups;delete old.strikes;
  delete old.water;delete old.air;
  const s=S.normalize(JSON.parse(JSON.stringify(old)));
  assert.ok(s.nextDisasters.heat>=s.tick+8);
  assert.equal(s.water,74);assert.equal(s.air,100);
  assert.equal(s.groups.families,0);assert.equal(S.activeDisasters(s).length,0);
});

test('v7 interface exposes live disaster, infection, grievance and art effects', () => {
  const js=fs.readFileSync(path.join(gameDir,'game.js'),'utf8');
  const art=fs.readFileSync(path.join(gameDir,'art.js'),'utf8');
  assert.match(js,/S\.activeDisasters\(state\)/);
  assert.match(js,/S\.groupStatus\(state\)/);
  assert.match(js,/S\.performAction\(state/);
  assert.match(art,/s\.disasters\?\.heat/);
  assert.match(art,/s\.disasters\?\.flood/);
  assert.match(art,/s\.disasters\?\.dust/);
});


test('v8 choice preview and persistent village consequences are wired into the renderer', () => {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/games.json'), 'utf8'));
  const entry = data.games.find(g => g.id === 'high_twelve_island');
  const html = fs.readFileSync(path.join(gameDir, 'index.html'), 'utf8');
  const js = fs.readFileSync(path.join(gameDir, 'game.js'), 'utf8');
  const art = fs.readFileSync(path.join(gameDir, 'art.js'), 'utf8');
  assert.equal(entry.title, '촌장 시뮬레이터');
  assert.match(html, /<h1>촌장 시뮬레이터<\/h1>/);
  assert.match(js, /setPreview/);
  assert.match(js, /impactChoice/);
  assert.match(art, /function previewOverlay/);
  assert.match(art, /아이들이 채집 중/);
  assert.match(art, /노동 주민 작업 중단/);
  assert.match(art, /가족들이 떠날 준비/);
});

test('v8 crisis choices trade immediate survival gains against delayed social and health costs', () => {
  const child = S.initial(17);
  child.tick = 20; child.coldUntil = 36; child.nextWinterAt = 50; child.food = 50;
  child.pending = 'child_labor_debate';
  const childFood = child.food;
  assert.equal(S.resolveEvent(child, 2).ok, true);
  assert.equal(child.food, childFood + 10);
  assert.ok(child.groups.families >= 2.5);
  assert.ok(S.rightsConcerns(child).includes('어린이 위험 노동'));

  const forced = S.initial(6);
  forced.tick = 25; forced.coldUntil = 39; forced.nextWinterAt = 50; forced.wood = 11;
  forced.pending = 'forced_labor_debate';
  assert.equal(S.resolveEvent(forced, 2).ok, true);
  assert.ok(forced.wood >= 23);
  assert.ok(forced.groups.workers >= 2.6);

  const excluded = S.initial(71);
  excluded.tick = 23; excluded.coldUntil = 35; excluded.nextWinterAt = 50; excluded.food = 22;
  const beforeUse = S.rates(excluded).foodUse;
  excluded.pending = 'ration_exclusion_debate';
  assert.equal(S.resolveEvent(excluded, 2).ok, true);
  assert.equal(excluded.food, 27);
  assert.ok(beforeUse - S.rates(excluded).foodUse >= 2);
});

test('v8 simulation makes safe, production-first and compromise chiefs create different villages', () => {
  function affordable(s, o) {
    return !o.cost || Object.entries(o.cost).every(([k, n]) => (s[k] || 0) >= n);
  }
  function pick(s, event, style) {
    const list = event.options.map((o, i) => ({ o, i })).filter(x => affordable(s, x.o));
    const value = ({food: 1.25, wood: 1, water: .55, health: .8, trust: .55});
    function immediate(o) {
      let n = 0;
      for (const [k, v] of Object.entries(o.changes || {})) n += (value[k] || 0) * v;
      return n;
    }
    function risk(o) {
      return (o.startChildLabor ? 12 : 0) + (o.startForcedLabor ? 10 : 0) + (o.startExclusion ? 10 : 0) +
        (o.groupStrike ? 9 : 0) + (o.rejectCouncil ? 7 : 0);
    }
    function protect(o) {
      return (o.childProtect ? 7 : 0) + (o.climateCare ? 6 : 0) + (o.floodRelocate ? 5 : 0) +
        (o.floodRepair ? 4 : 0) + (o.medicine ? 5 : 0) + (o.groupSettlement ? 5 : 0) +
        (o.stopChildLabor || o.endForcedLabor || o.endExclusion ? 8 : 0);
    }
    return list.sort((a, b) => {
      const score = x => style === 'safe' ? protect(x.o) - risk(x.o) + immediate(x.o) * .15 :
        style === 'production' ? immediate(x.o) + risk(x.o) * .85 - (x.o.quietRest || 0) * 1.2 :
        protect(x.o) * .4 + immediate(x.o) * .45 - risk(x.o) * .35 - Math.abs(x.i - 1) * .25;
      return score(b) - score(a);
    })[0]?.i ?? 0;
  }
  function run(style) {
    const s = S.initial(2026);
    S.build(s, 'farm'); S.build(s, 'hut');
    S.enact(s, 'ration', style === 'production' ? 'effort' : style === 'safe' ? 'needs' : 'equal');
    S.enact(s, 'labor', style === 'production' ? 'extra' : style === 'safe' ? 'short' : 'balanced');
    S.enact(s, 'storage', style === 'safe' ? 'reserve' : style === 'production' ? 'exchange' : 'share');
    let risky = 0, events = 0, strikes = 0, departures = 0;
    let prevPop = s.population;
    for (let guard = 0; guard < 260 && s.tick < 120 && !s.ended; guard++) {
      if (s.pending) {
        const e = S.EVENTS.find(x => x.id === s.pending);
        const ix = pick(s, e, style), o = e.options[ix];
        if (o.startChildLabor || o.startForcedLabor || o.startExclusion || o.groupStrike || o.rejectCouncil) risky++;
        const result = S.resolveEvent(s, ix);
        assert.equal(result.ok, true, style + ' failed event ' + e.id);
        events++;
      } else {
        if (s.stage >= 2) {
          if (!s.laws.tax) S.enact(s, 'tax', style === 'production' ? 'low' : 'medium');
          if (!s.laws.process) S.enact(s, 'process', style === 'safe' ? 'meeting' : style === 'production' ? 'delegate' : 'mixed');
          if (!s.buildings.clinic && S.canBuild(s, 'clinic')) S.build(s, 'clinic');
          if (!s.buildings.hall && S.canBuild(s, 'hall')) S.build(s, 'hall');
        }
        const urgent = S.availableActions(s).filter(a => a.enabled);
        if (style === 'safe') {
          const action = urgent.find(a => ['stopChildWork','stopForcedWork','restoreRations','communityCare','supportSick','fuelFires','familyMediation','carerMediation','workerMediation'].includes(a.id));
          if (action) S.performAction(s, action.id);
        }
        S.tick(s);
        if (Object.values(s.strikes || {}).some(until => until > s.tick)) strikes++;
        if (s.population < prevPop) departures += prevPop - s.population;
        prevPop = s.population;
      }
    }
    return {
      style, week:s.tick, population:s.population, food:+s.food.toFixed(1), wood:+s.wood.toFixed(1),
      trust:+s.trust.toFixed(1), health:+s.health.toFixed(1), education:+s.education.toFixed(1),
      child:+s.childWellbeing.toFixed(1), water:+s.water.toFixed(1), sick:+s.sick.toFixed(1),
      grievances:+Object.values(s.groups).reduce((a,b)=>a+b,0).toFixed(1), risky, events, strikes, departures, ended:s.ended
    };
  }
  const results = ['safe','production','compromise'].map(run);
  console.log('V8_SIMULATION ' + JSON.stringify(results));
  const signatures = new Set(results.map(x => [x.population,x.food,x.wood,x.trust,x.health,x.education,x.grievances,x.ended].join('|')));
  assert.equal(signatures.size, 3, 'styles should lead to three materially different village states');
  const safe = results.find(x => x.style === 'safe');
  const prod = results.find(x => x.style === 'production');
  assert.ok(prod.risky > safe.risky, 'production-first chief should take more high-risk shortcuts');
  assert.ok(Math.abs(prod.health - safe.health) >= 5 || Math.abs(prod.trust - safe.trust) >= 8 ||
    Math.abs(prod.grievances - safe.grievances) >= 3, 'chief styles should create visible long-term consequences');
});

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
  assert.match(html, /sim.js\?v=4/);
  assert.match(html, /art.js\?v=2/);
  assert.match(html, /game.js\?v=4/);
  assert.match(html, /id="islandCanvas"/);
  assert.match(html, /data-tab="residents"/);
  assert.match(html, /id="policyNotice"/);
  assert.ok(entry.href.endsWith("?v=4"));
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

test('newcomer arrival pauses time, records their backstory and opens their profile', () => {
  const s = S.initial(42);
  for (let i = 0; i < 3; i++) S.tick(s);
  assert.equal(S.resolveEvent(s, 0).ok, true);
  for (let i = 0; i < 7 && !s.arrivalNotice; i++) {
    S.tick(s);
    if (s.pending && s.pending !== 'new_resident') {
      assert.equal(S.resolveEvent(s, 0).ok, true);
    }
  }
  assert.equal(s.pending, 'new_resident');
  assert.equal(s.citizens.length, 13);
  assert.equal(s.population, 13);
  assert.equal(s.arrivalLog.length, 1);
  assert.ok(s.arrivalNotice.origin.length > 10);
  const week = s.tick;
  S.tick(s);
  assert.equal(s.tick, week);
  const reloaded = S.normalize(JSON.parse(JSON.stringify(s)));
  assert.equal(reloaded.pending, 'new_resident');
  assert.equal(reloaded.arrivalNotice.name, s.citizens[12].name);
  assert.equal(S.resolveEvent(reloaded, 0).ok, true);
  assert.equal(reloaded.arrivalNotice, null);
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

test('resident UI renders live thoughts and newcomer details', () => {
  const js = fs.readFileSync(path.join(gameDir, 'game.js'), 'utf8');
  assert.match(js, /function renderResidents\(/);
  assert.match(js, /S\.residentView\(state, citizen\)/);
  assert.match(js, /S\.communityPulse\(state\)/);
  assert.match(js, /selectedCitizenId = arrivingId/);
  assert.match(js, /arriving\.origin/);
});


test('ration routes have different weekly economics and dedicated follow-up petitions', () => {
  const outcomes = {};
  for (const law of ['equal', 'effort', 'needs']) {
    const s = S.initial(20);
    const enacted = S.enact(s, 'ration', law);
    assert.equal(enacted.ok, true);
    outcomes[law] = S.rates(s);
    s.tick = 12;
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

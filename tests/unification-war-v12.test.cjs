'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

function loadBrowserScripts(paths) {
  const context = { window: {}, console };
  vm.createContext(context);
  for (const p of paths) vm.runInContext(read(p), context, { filename: p });
  return context.window;
}

test('통일전쟁 v12 브라우저 스크립트와 저장 마이그레이션이 연결된다', () => {
  const html = read('games/high_history_map/index.html');
  const marker = '<script>\n(function(){';
  const start = html.indexOf(marker);
  const end = html.lastIndexOf('</script>');
  assert.ok(start >= 0 && end > start, 'inline game script not found');
  new Function(html.slice(start + '<script>\n'.length, end));

  assert.match(html, /hex_v12/);
  assert.match(html, /LEGACY_SAVE_KEYS=.*hex_v11/);
  assert.match(html, /function migrateState\(x\)/);
  assert.match(html, /x\.cityProjects=x\.cityProjects\|\|\{\}/);
  assert.match(html, /x\.cityUpgrades=x\.cityUpgrades\|\|\{\}/);
  assert.match(html, /actionBus\.register\("move"/);
  assert.match(html, /actionBus\.register\("attack"/);
  assert.match(html, /actionBus\.register\("startProject"/);
});

test('최소 힙 이동 탐색은 적 통제구역에서 경로 확장을 멈춘다', () => {
  const w = loadBrowserScripts(['games/high_history_map/core/pathfinding.js']);
  const nodes = { A:{id:'A'}, B:{id:'B'}, C:{id:'C'} };
  const graph = { A:['B'], B:['A','C'], C:['B'] };
  const result = w.UnificationWarPathfinding.reachable({
    start: nodes.A,
    maxCost: 4,
    keyOf: n => n.id,
    neighbors: n => graph[n.id].map(k => nodes[k]),
    cost: () => 1,
    classify: n => n.id === 'B' ? { zoc:true, stop:true } : {}
  });
  assert.equal(result.tiles.B.zoc, true);
  assert.equal(result.tiles.C, undefined);
});

test('도로 보급망과 보급 상태 단계가 정상 계산된다', () => {
  const w = loadBrowserScripts([
    'games/high_history_map/core/pathfinding.js',
    'games/high_history_map/core/supply.js'
  ]);
  const nodes = {
    A:{id:'A',road:false}, B:{id:'B',road:true},
    C:{id:'C',road:true}, D:{id:'D',road:false}
  };
  const graph = { A:['B'], B:['A','C'], C:['B','D'], D:['C'] };
  const costs = w.UnificationWarSupply.buildSupplyMap({
    sources:[nodes.A],
    maxCost:14,
    keyOf:n=>n.id,
    neighbors:n=>graph[n.id].map(k=>nodes[k]),
    passable:()=>true,
    cost:n=>n.road ? 0.45 : 1
  });
  assert.equal(costs.B, 0.45);
  assert.equal(costs.C, 0.9);
  assert.equal(w.UnificationWarSupply.statusForCost(5).key, 'good');
  assert.equal(w.UnificationWarSupply.statusForCost(8).key, 'strained');
  assert.equal(w.UnificationWarSupply.statusForCost(11).key, 'isolated');
});

test('전쟁 임무·공성·피로 규칙이 단계적으로 계산된다', () => {
  const w = loadBrowserScripts(['games/high_history_map/core/warfare.js']);
  assert.ok(w.UnificationWarWarfare.attackMultiplier('attack','infantry') > 1);
  assert.ok(w.UnificationWarWarfare.defenseMultiplier('defend') > 1);
  assert.ok(w.UnificationWarWarfare.reinforcementAmount('infantry','reserve') >
    w.UnificationWarWarfare.reinforcementAmount('infantry','attack'));
  assert.ok(w.UnificationWarWarfare.fatigueMultiplier(80) < 1);
  assert.equal(w.UnificationWarWarfare.fatigueLabel(80).key, 'critical');
  assert.equal(w.UnificationWarWarfare.siegeStage(10).key, 'watch');
  assert.equal(w.UnificationWarWarfare.siegeStage(30).key, 'siege');
  assert.equal(w.UnificationWarWarfare.siegeStage(55).key, 'tight');
  assert.equal(w.UnificationWarWarfare.siegeStage(80).key, 'breach');
});

test('삼국별 상황형 역사 선택 데이터가 준비되어 있다', () => {
  const w = loadBrowserScripts(['games/high_history_map/data/events.js']);
  for (const nation of ['goguryeo','baekje','silla']) {
    const events = w.UnificationWarEvents.forNation(nation);
    assert.equal(events.length, 2);
    for (const event of events) {
      assert.equal(event.choices.length, 2);
      assert.ok(event.turn > 0);
    }
  }
});

test('국가 AI는 방어·전쟁·회복·전쟁준비 상태를 구분한다', () => {
  const w = loadBrowserScripts(['games/high_history_map/ai/strategy.js']);
  const p = w.UnificationWarAIStrategy.personality('goguryeo');
  const mode = (overrides) => w.UnificationWarAIStrategy.chooseMode({
    passive:false, threat:false, atWar:false, turn:20,
    personality:p, hasExpansion:true, hasTarget:true, powerRatio:1.4,
    ...overrides
  });
  assert.equal(mode({ passive:true }), 'HOLD');
  assert.equal(mode({ threat:true }), 'DEFEND');
  assert.equal(mode({ atWar:true }), 'WAR');
  assert.equal(mode({ powerRatio:0.5 }), 'RECOVER');
  assert.equal(mode({}), 'PREPARE_WAR');
  assert.equal(w.UnificationWarAIStrategy.shouldLaunch({
    personality:p, powerRatio:1.3, preparedPower:600, targetDefense:400
  }), true);
});

test('v12 핵심 플레이 UI가 소스에 남아 있다', () => {
  const html = read('games/high_history_map/index.html');
  const catalog = read('data/games.json');
  for (const token of [
    'id="minimap"',
    'id="pathLayer"',
    'function openCombatPreview',
    'function resolveRangedCombat',
    'function supplyMapFor',
    'function updateAIStrategy',
    'function aiFrontCandidates',
    'function assignAIOperations',
    'function shouldAIRetreat',
    'function playerFronts',
    'function addSiegePressure',
    'function applyFieldReinforcement',
    'function updateWarFatigue',
    'actionBus.register("setMission"',
    'actionBus.register("retreat"',
    'function openHistoryEvent',
    'function openCityProjects'
  ]) assert.ok(html.includes(token), token);
  assert.match(catalog, /games\/high_history_map\/index\.html\?v=24/);
});

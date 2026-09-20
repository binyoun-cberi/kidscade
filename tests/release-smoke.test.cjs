const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/games.json'), 'utf8'));
const games = Array.isArray(catalog.games) ? catalog.games : [];

function gameById(id) {
  const game = games.find(item => item.id === id);
  assert.ok(game, `missing catalog game: ${id}`);
  return game;
}

function localPath(href) {
  const clean = String(href || '').split('#')[0].split('?')[0];
  return path.join(ROOT, decodeURIComponent(clean));
}

function read(hrefOrPath) {
  const file = hrefOrPath.includes?.('.html') || hrefOrPath.includes?.('.js')
    ? localPath(hrefOrPath)
    : path.join(ROOT, hrefOrPath);
  return fs.readFileSync(file, 'utf8');
}

test('every enabled catalog game points to a non-empty local entry file', () => {
  for (const game of games.filter(item => !item.disabled)) {
    const file = localPath(game.href);
    assert.equal(fs.existsSync(file), true, `${game.id} missing: ${game.href}`);
    const stat = fs.statSync(file);
    assert.ok(stat.isFile(), `${game.id} is not a file: ${game.href}`);
    assert.ok(stat.size > 100, `${game.id} entry is suspiciously empty: ${game.href}`);
  }
});

test('Spelling Frog release entry keeps the moving-log progression fix wired in', () => {
  const game = gameById('spelling_frog');
  assert.match(game.href, /^games\/spelling_frog\/스펠링 프로그\.html(?:\?|$)/);

  const wrapper = read(game.href);
  assert.doesNotMatch(wrapper, /document\.write/);
  assert.match(wrapper, /spelling-frog-log-fix\.js/);

  const patch = fs.readFileSync(path.join(ROOT, 'spelling-frog-log-fix.js'), 'utf8');
  assert.match(patch, /frog\.position\.x\s*\+=\s*dx/);
  assert.match(patch, /originalAnimateObjects\(dt,\s*time\)/);
  assert.match(patch, /frogCol\s*=\s*clamp/);
});

test('History Royale defers heavy 3D boot until battle start for mobile stability', () => {
  const game = gameById('high_history_royale');
  const html = read(game.href);
  assert.match(html, /function ensureHistoryRoyale3D\(\)/);
  assert.match(html, /history-royale-3d\.js\?v=17/);
  assert.doesNotMatch(html, /<script type="module" src="history-royale-3d\.js/);
  const modulePath = path.join(ROOT, 'games', 'high_history_royale', 'history-royale-3d.js');
  const moduleCode = fs.readFileSync(modulePath, 'utf8');
  assert.match(moduleCode, /LOW_POWER\s*\? \[loadCharacter\("King"\)\]/);
  assert.match(moduleCode, /if\(!LOW_POWER\)decorateWithProps\(\)/);
});

test('History Royale release entry retains selectable faction, hero, deck and start controls', () => {
  const game = gameById('high_history_royale');
  assert.match(game.href, /games\/high_history_royale\/역사 로얄\.html/);

  const html = read(game.href);
  assert.match(html, /selectedFaction\s*=\s*id/);
  assert.match(html, /selectedHero\s*=\s*h\.id/);
  assert.match(html, /selectedCards\s*=\s*defaultDeck\(id\)/);
  assert.match(html, /#startBtn/);
  assert.match(html, /startBattle\(\)/);
  assert.match(html, /selectedCards\.length!==7/);
  assert.match(html, /history-royale-3d\.js\?v=17/);
  const renderer3d=fs.readFileSync(path.join(ROOT,'games','high_history_royale','history-royale-3d.js'),'utf8');
  assert.match(renderer3d, /function use2DFallback/);
  assert.match(renderer3d, /2D 안정 모드/);
  assert.match(renderer3d, /typeof ResizeObserver==='function'/);
});

test('critical catalog entries stay on the reviewed release files', () => {
  assert.match(gameById('high_classroom_war_3d').href, /^games\/high_classroom_war_3d\/교실전쟁 3D\.html/);
  assert.match(gameById('spelling_frog').href, /^games\/spelling_frog\/스펠링 프로그\.html/);
  assert.match(gameById('high_history_royale').href, /^games\/high_history_royale\/역사 로얄\.html(?:\?|$)/);
});


test('History Royale mobile battle uses procedural troops and bounded effects', () => {
  const modulePath = path.join(ROOT, 'games', 'high_history_royale', 'history-royale-3d.js');
  const moduleCode = fs.readFileSync(modulePath, 'utf8');
  assert.match(moduleCode, /if\(LOW_POWER&&!u\.hero\)return makeFallbackUnit/);
  assert.match(moduleCode, /if\(LOW_POWER\|\|!horseTemplate\)return makeProceduralHorse/);
  assert.match(moduleCode, /LOW_POWER\?Math\.min\(g\.projectiles\.length,28\)/);
  assert.match(moduleCode, /LOW_POWER\?g\.fx\.slice\(-20\):g\.fx/);
  assert.match(moduleCode, /rec\.horse\?\.mixer/);
  assert.match(moduleCode, /LOW_POWER\s*\? \[loadCharacter\("King"\)\]/);
  assert.match(moduleCode, /disposable:true/);
  assert.match(moduleCode, /if\(rec\.disposable\)disposeFx\(rec\.root\)/);
});


test('Nyam Universe release uses external Three.js and bounded 3D asset integration', () => {
  const game = gameById('low_nyam_universe');
  assert.match(game.href, /games\/low_nyam_universe\/냠냠 우주 여행\.html\?v=3/);
  const html = read(game.href);
  assert.match(html, /nyam-universe-v2\.js\?v=3/);
  assert.match(html, /type="importmap"/);
  assert.doesNotMatch(html, /Copyright 2010-2023 Three\.js Authors/);
  const runtime = fs.readFileSync(path.join(ROOT, 'games', 'low_nyam_universe', 'nyam-universe-v2.js'), 'utf8');
  assert.match(runtime, /GLTFLoader/);
  assert.match(runtime, /assets\/game\/food\/carrot\.glb/);
  assert.match(runtime, /assets\/game\/food\/broccoli\.glb/);
  assert.match(runtime, /assets\/game\/food\/pumpkin-basic\.glb/);
  assert.match(runtime, /kenney-car-kit\/sedan\.glb/);
  assert.match(runtime, /kenney-city-kit-suburban\/building-type-a\.glb/);
  assert.match(runtime, /kenney-nature-kit\/rock-tall-a\.glb/);
  assert.match(runtime, /space\/planets\/planet0/);
  assert.match(runtime, /MAX_REAL_FOODS=LOW_POWER\?16:30/);
  assert.match(runtime, /const foodRingMaterial=/);
  assert.match(runtime, /if\(f\.real\)realFoodCount/);
  assert.match(runtime, /LOW_POWER\?105:145/);
  assert.match(runtime, /decorateAssetScenery/);
});

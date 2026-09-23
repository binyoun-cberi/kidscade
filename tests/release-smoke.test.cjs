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



test('critical catalog entries stay on the reviewed release files', () => {
  assert.match(gameById('high_classroom_war_3d').href, /^games\/high_classroom_war_3d\/교실전쟁 3D\.html/);
  assert.match(gameById('spelling_frog').href, /^games\/spelling_frog\/스펠링 프로그\.html/);
});




test('Nyam Universe v5 uses a size ladder, final-goal progression and bounded real 3D assets', () => {
  const game = gameById('low_nyam_universe');
  assert.match(game.href, /games\/low_nyam_universe\/냠냠 우주 여행\.html\?v=5/);
  const html = read(game.href);
  assert.match(html, /nyam-universe-v2\.js\?v=5/);
  assert.match(html, /초록=지금 냠냠/);
  const runtime = fs.readFileSync(path.join(ROOT, 'games', 'low_nyam_universe', 'nyam-universe-v2.js'), 'utf8');
  assert.match(runtime, /green-blob\.glb/);
  assert.match(runtime, /green-spiky-blob\.glb/);
  assert.match(runtime, /pink-blob\.glb/);
  assert.match(runtime, /방울토마토/);
  assert.match(runtime, /큰 건물/);
  assert.match(runtime, /목성/);
  assert.match(runtime, /초거대별/);
  assert.match(runtime, /function canEatFood\(f\)/);
  assert.match(runtime, /function advanceStage\(\)/);
  assert.match(runtime, /if\(food\?\.goal\)/);
  assert.match(runtime, /MAX_REAL_FOODS=LOW_POWER\?16:30/);
  assert.match(runtime, /attachFoodLabel/);
  assert.match(runtime, /★ 이걸 먹으면 다음 세계/);
  assert.match(runtime, /LOW_POWER\?118:158/);
  assert.match(runtime, /setTimeout\(r,950\)/);
  assert.doesNotMatch(runtime, /if\(logSize>=Math\.log10\(stages\[level\]\.max\)\)/);
});



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
  assert.match(game.href, /^스펠링 프로그\.html(?:\?|$)/);

  const wrapper = read(game.href);
  assert.doesNotMatch(wrapper, /document\.write/);
  assert.match(wrapper, /spelling-frog-log-fix\.js/);

  const patch = fs.readFileSync(path.join(ROOT, 'spelling-frog-log-fix.js'), 'utf8');
  assert.match(patch, /frog\.position\.x\s*\+=\s*dx/);
  assert.match(patch, /originalAnimateObjects\(dt,\s*time\)/);
  assert.match(patch, /frogCol\s*=\s*clamp/);
});

test('History Royale release entry retains selectable faction, hero, deck and start controls', () => {
  const game = gameById('high_history_royale');
  assert.match(game.href, /역사 로얄\.html/);

  const html = read(game.href);
  assert.match(html, /selectedFaction\s*=\s*id/);
  assert.match(html, /selectedHero\s*=\s*h\.id/);
  assert.match(html, /selectedCards\s*=\s*defaultDeck\(id\)/);
  assert.match(html, /#startBtn/);
  assert.match(html, /startBattle\(\)/);
  assert.match(html, /selectedCards\.length!==7/);
});

test('critical catalog entries stay on the reviewed release files', () => {
  assert.match(gameById('high_classroom_war_3d').href, /^교실전쟁 3D\.html/);
  assert.match(gameById('spelling_frog').href, /^스펠링 프로그\.html/);
  assert.match(gameById('high_history_royale').href, /역사 로얄\.html$/);
});

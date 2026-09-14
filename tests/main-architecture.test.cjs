const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const migration = require('../scripts/migrate-game-catalog.cjs');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const catalog = JSON.parse(read('data/games.json'));

function localTarget(value) {
  const target = String(value || '').split('#')[0].split('?')[0];
  if (!target || target === '#' || /^[a-z]+:\/\//i.test(target)) return null;
  return target;
}

test('catalog has one source of truth and unique valid game ids', () => {
  assert.equal(catalog.schemaVersion, 5);
  assert.ok(Array.isArray(catalog.games));
  assert.equal(Object.hasOwn(catalog, 'coverById'), false);

  const ids = new Set();
  const validAges = new Set(['toddler', 'low', 'high', 'job', 'all']);
  const validCategories = new Set(['math', 'korean', 'lang', 'trivia', 'music', 'job', 'all']);
  for (const game of catalog.games) {
    assert.ok(game.id && game.title && game.href, `missing required fields: ${JSON.stringify(game)}`);
    assert.equal(ids.has(game.id), false, `duplicate game id: ${game.id}`);
    ids.add(game.id);
    assert.ok(validAges.has(game.age), `invalid age for ${game.id}: ${game.age}`);
    assert.ok(validCategories.has(game.category), `invalid category for ${game.id}: ${game.category}`);
  }
});

test('every catalog game link and cover points to an existing repository file', () => {
  for (const game of catalog.games) {
    const href = localTarget(game.href);
    if (href) assert.ok(fs.existsSync(path.join(ROOT, href)), `missing game file for ${game.id}: ${href}`);

    const cover = localTarget(game.cover);
    if (cover) assert.ok(fs.existsSync(path.join(ROOT, cover)), `missing cover for ${game.id}: ${cover}`);
  }
});

test('all legacy game cards are represented in the static catalog', () => {
  const legacy = migration.extractLegacyGames(read('index_base.html'));
  const catalogIds = new Set(catalog.games.map(game => game.id));
  assert.ok(legacy.length >= 50, `unexpectedly small legacy inventory: ${legacy.length}`);
  for (const game of legacy) {
    assert.ok(catalogIds.has(game.id), `legacy game missing from data/games.json: ${game.id}`);
  }
});

test('catalog migration is idempotent and keeps JSON-only games before legacy order', () => {
  const html = read('index_base.html');
  const legacy = migration.extractLegacyGames(html);
  const once = migration.mergeCatalog(catalog, legacy);
  const twice = migration.mergeCatalog(once, legacy);
  assert.deepEqual(twice, once);
});

test('index delegates cache versioning to bootstrap without monkeypatching fetch', () => {
  const index = read('index.html');
  assert.doesNotMatch(index, /window\.fetch\s*=/);
  assert.match(index, /main-bootstrap\.js\?v=[^"']+/);
});

test('bootstrap derives runtime URLs from its own script version', () => {
  const source = read('main-bootstrap.js');
  assert.match(source, /document\.currentScript/);
  assert.match(source, /withVersion\('data\/games\.json'\)/);
  assert.match(source, /withVersion\('index_base\.html'\)/);
  assert.doesNotMatch(source, /data\/games\.json\?v=/);
  assert.doesNotMatch(source, /20260914-refactor/);
});

test('cover renderer reuses the boot catalog and never refetches or reads coverById', () => {
  const source = read('game-cover-placeholders.js');
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /coverById/);
  assert.match(source, /window\.KidscadeCatalog/);
  assert.match(source, /window\.KidscadeGames/);
});

test('dashboard exclusively owns quick-hub state while clarity only watches game cards', () => {
  const clarity = read('ui-clarity-overhaul.js');
  const dashboard = read('dashboard-recent.js');

  assert.doesNotMatch(clarity, /buildQuickHub|syncQuickHub|recent-list|favorite-list/);
  assert.doesNotMatch(clarity, /observe\(document\.body/);
  assert.match(dashboard, /function ensureQuickHub/);
  assert.match(dashboard, /function syncQuickHub/);
  assert.match(dashboard, /kidscade:dashboard-rendered/);
});

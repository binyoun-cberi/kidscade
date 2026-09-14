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
  assert.equal(catalog.schemaVersion, 6);
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
    if (game.iconHtml) {
      assert.match(game.iconHtml.trim(), /^<svg\b/i, `iconHtml must be SVG for ${game.id}`);
      assert.match(game.iconHtml.trim(), /<\/svg>$/i, `iconHtml must close SVG for ${game.id}`);
      assert.doesNotMatch(game.iconHtml, /<script\b|<iframe\b|<object\b|<embed\b|\bon\w+\s*=|javascript:/i);
    }
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

test('catalog migration preserves safe custom SVG card icons', () => {
  const fixture = `
    <div class="game-container" id="game-list">
      <a href="fixture.html" class="game-card" data-category="math" data-age="low" data-id="fixture_svg">
        <span class="fav-star">☆</span>
        <div class="game-icon"><svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"></circle></svg></div>
        <div class="game-title">SVG 카드</div>
        <div class="game-desc">아이콘 보존 검사</div>
      </a>
    </div>
    <script>void 0;</script>`;
  const [game] = migration.extractLegacyGames(fixture);
  assert.equal(game.id, 'fixture_svg');
  assert.match(game.iconHtml, /^<svg\b/);
  assert.equal(migration.extractSvgIcon('<svg onload="alert(1)"></svg>'), '');
});

test('catalog migration is idempotent and keeps JSON-only games before legacy order', () => {
  const html = read('index_base.html');
  const legacy = migration.extractLegacyGames(html);
  const once = migration.mergeCatalog(catalog, legacy);
  const twice = migration.mergeCatalog(once, legacy);
  assert.deepEqual(twice, once);
});

test('bootstrap replaces legacy game cards with catalog-rendered cards before page execution', () => {
  const source = read('main-bootstrap.js');
  assert.match(source, /function\s+replaceGameCardsFromCatalog\s*\(/);
  assert.match(source, /remainingMarkup\s*=\s*scope\.replace\(cardPattern,\s*''\)/);
  assert.match(source, /getManagedGames\(catalog\)\.map\(renderManagedCard\)/);
  assert.match(source, /replaceGameCardsFromCatalog\(html,\s*catalog\)/);
  assert.match(source, /function\s+renderIcon\s*\(/);
  assert.match(source, /game\.iconHtml/);
  assert.doesNotMatch(source, /function\s+enrichExistingCards\s*\(/);
  assert.doesNotMatch(source, /escapeRegExp/);
});

test('runtime registry treats the catalog as the only game data source', () => {
  const source = read('game-registry.js');
  assert.match(source, /window\.KidscadeCatalog/);
  assert.doesNotMatch(source, /function\s+readCard\s*\(/);
  assert.doesNotMatch(source, /querySelectorAll\(['"]#game-list\s*>\s*\.game-card/);
  assert.doesNotMatch(source, /legacy-dom|catalog\+legacy|managedCards/);
  assert.match(source, /source:\s*['"]catalog['"]/);
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

test('dashboard exclusively owns quick-hub and favorite/recent state APIs', () => {
  const clarity = read('ui-clarity-overhaul.js');
  const dashboard = read('dashboard-recent.js');

  assert.doesNotMatch(clarity, /buildQuickHub|syncQuickHub|recent-list|favorite-list/);
  assert.doesNotMatch(clarity, /observe\(document\.body/);
  assert.match(dashboard, /function ensureQuickHub/);
  assert.match(dashboard, /function syncQuickHub/);
  assert.match(dashboard, /function\s+favoriteIds\s*\(/);
  assert.match(dashboard, /function\s+recentIds\s*\(/);
  assert.match(dashboard, /kidscade:favorites-changed/);
  assert.match(dashboard, /kidscade:recents-changed/);
  assert.match(dashboard, /favorites:\s*favoriteIds/);
  assert.match(dashboard, /recents:\s*recentIds/);
  assert.match(dashboard, /kidscade:dashboard-rendered/);
});

test('dashboard owns favorite mutation and bootstrap removes legacy per-star listeners', () => {
  const dashboard = read('dashboard-recent.js');
  const bootstrap = read('main-bootstrap.js');

  assert.match(dashboard, /function\s+toggleFavorite\s*\(/);
  assert.match(dashboard, /function\s+bindFavoriteActions\s*\(/);
  assert.match(dashboard, /addEventListener\('click',[\s\S]*?true\)/);
  assert.match(bootstrap, /favoriteStart/);
  assert.match(bootstrap, /kidscade:favorites-changed/);
  assert.match(bootstrap, /kidscade:recents-changed/);
  assert.match(bootstrap, /즐겨찾기\/최근 플레이의 쓰기는 dashboard-recent\.js가 전담/);
});

test('pet recommendation scoring is catalog/state driven instead of card-DOM driven', () => {
  const recommendation = read('game-recommendations.js');
  const bootstrap = read('main-bootstrap.js');

  assert.match(recommendation, /function\s+scoreGame\s*\(/);
  assert.match(recommendation, /function\s+scoreCurrent\s*\(/);
  assert.match(recommendation, /KidscadeDashboard/);
  assert.doesNotMatch(recommendation, /querySelector|getAttribute|\.game-card/);
  assert.match(bootstrap, /KidscadeRecommendations\?\.scoreCurrent/);
  assert.match(bootstrap, /KidscadeGames\?\.get/);
  assert.match(bootstrap, /game-recommendations\.js/);
});

test('game launcher owns modal session lifecycle and reward calculation', () => {
  const launcher = read('game-launcher.js');
  const bootstrap = read('main-bootstrap.js');

  assert.match(launcher, /function\s+calculateReward\s*\(/);
  assert.match(launcher, /function\s+open\s*\(/);
  assert.match(launcher, /function\s+close\s*\(/);
  assert.match(launcher, /bridge\.remember/);
  assert.match(launcher, /bridge\.checkpointPlayTime/);
  assert.match(launcher, /bridge\.recordGardenSession/);
  assert.match(bootstrap, /const\s+gameLauncherBridge\s*=/);
  assert.match(bootstrap, /KidscadeGameLauncher\?\.open/);
  assert.match(bootstrap, /KidscadeGameLauncher\?\.close/);
  assert.match(bootstrap, /game-launcher\.js/);
});

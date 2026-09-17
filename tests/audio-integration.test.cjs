const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const stripHref = href => {
  const value = String(href || '').trim();
  if (!value || /^(?:https?:|data:|javascript:|#)/i.test(value)) return '';
  const plain = value.split(/[?#]/, 1)[0].replace(/^\/+/, '');
  try { return decodeURIComponent(plain); } catch (_) { return plain; }
};

const ENHANCED_TITLES = [
  '인내의 탑',
  '멍멍 곱셈 러너',
  '우주 샌드위치 가게',
  '아이스크림 나눗셈 가게',
  '교실전쟁 3D',
  '숫자 타워',
  '스펠링 프로그',
  '블록래프트',
  'OUTBREAK KOREA',
  '한자 수호전: 8급'
];

test('audio catalog points only to tracked audio files', () => {
  const catalog = JSON.parse(read('assets/audio/audio-catalog.json'));
  assert.equal(catalog.basePath, 'assets/audio/');
  const entries = Object.entries(catalog.sounds || {});
  assert.ok(entries.length >= 16, 'expected the initial Pixabay sound pack');
  for (const [key, variants] of entries) {
    assert.ok(Array.isArray(variants) && variants.length > 0, `${key} must have at least one variant`);
    for (const relative of variants) {
      const file = path.join(root, catalog.basePath, relative);
      assert.ok(fs.existsSync(file), `${key} is missing ${relative}`);
    }
  }
});

test('all semantic keys used by game audio hooks exist in the catalog', () => {
  const hooks = read('game-audio-hooks.js');
  const catalog = JSON.parse(read('assets/audio/audio-catalog.json'));
  const used = new Set();
  for (const match of hooks.matchAll(/(?:play|preload)\(\s*['"]([a-z0-9_.-]+)['"]/g)) used.add(match[1]);
  for (const match of hooks.matchAll(/playAny\(\s*\[([^\]]+)\]/g)) {
    for (const key of match[1].matchAll(/['"]([a-z0-9_.-]+)['"]/g)) used.add(key[1]);
  }
  assert.ok(used.size >= 10, 'expected multiple real game sound mappings');
  for (const key of used) assert.ok(catalog.sounds[key], `missing catalog sound key: ${key}`);
});

test('main page loads the shared audio manager before bootstrap', () => {
  const html = read('index.html');
  const audioAt = html.indexOf('audio-manager.js');
  const bootstrapAt = html.indexOf('main-bootstrap.js');
  assert.ok(audioAt >= 0, 'audio manager script missing');
  assert.ok(bootstrapAt > audioAt, 'audio manager must load before main bootstrap');
});

test('Cloudflare build injector adds the audio manager to all catalog games and hooks to enhanced games', () => {
  const source = read('scripts/inject-game-integrations.cjs');
  assert.match(source, /injectAudioRuntimeIntoCatalogGames/);
  assert.match(source, /injectDocumentStartScript/);
  assert.match(source, /injectDocumentEndScript/);
  assert.match(source, /AUDIO_MANAGER_SRC/);
  assert.match(source, /AUDIO_HOOKS_SRC/);
  assert.match(source, /game-audio-hooks\.js\?v=20260917-2/);
  for (const title of ENHANCED_TITLES) {
    assert.ok(source.includes(title), `enhanced audio title missing: ${title}`);
  }
});

test('built enabled games all contain the shared audio manager', () => {
  const dist = path.join(root, 'dist');
  assert.ok(fs.existsSync(dist), 'dist must exist before audio integration tests');
  const catalog = JSON.parse(fs.readFileSync(path.join(dist, 'data', 'games.json'), 'utf8'));
  let checked = 0;
  for (const game of catalog.games || []) {
    if (!game || game.disabled) continue;
    const relative = stripHref(game.href);
    if (!relative || !/\.html?$/i.test(relative)) continue;
    const file = path.join(dist, relative);
    assert.ok(fs.existsSync(file), `built game entry is missing: ${relative}`);
    const html = fs.readFileSync(file, 'utf8');
    assert.match(html, /audio-manager\.js\?v=20260917-1/, `audio manager missing from ${game.id}: ${relative}`);
    checked += 1;
  }
  assert.ok(checked >= 90, `expected broad catalog coverage, checked only ${checked}`);
});

test('built enhanced games contain the real-sound hook runtime', () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(root, 'dist', 'data', 'games.json'), 'utf8'));
  for (const title of ENHANCED_TITLES) {
    const game = (catalog.games || []).find(item => item && item.title === title && !item.disabled);
    assert.ok(game, `enhanced game missing from built catalog: ${title}`);
    const relative = stripHref(game.href);
    const html = fs.readFileSync(path.join(root, 'dist', relative), 'utf8');
    assert.match(html, /game-audio-hooks\.js\?v=20260917-2/, `audio hooks missing from ${title}`);
  }
});

test('audio hook set covers movement, combat, success, fail, pickup and shop feedback', () => {
  const hooks = read('game-audio-hooks.js');
  for (const key of [
    'movement.jump',
    'combat.projectile_whoosh',
    'combat.impact_heavy',
    'combat.hurt_grunt',
    'combat.hurt_voice',
    'collect.coin_pickup',
    'collect.coin_drop',
    'success.cheer_yay',
    'success.cheer_woohoo',
    'success.victory_fanfare',
    'failure.fail_sting',
    'shop.register_open',
    'shop.purchase'
  ]) assert.ok(hooks.includes(key), `${key} is not wired into the game set`);
});

test('second audio pass keeps game-specific event hooks instead of a generic click blanket', () => {
  const hooks = read('game-audio-hooks.js');
  for (const fn of [
    'setupClassroomWar',
    'setupNumberTower',
    'setupSpellingFrog',
    'setupBlockraft',
    'setupOutbreakKorea',
    'setupHanjaSurvivors'
  ]) assert.match(hooks, new RegExp(`function ${fn}\\(`), `${fn} is missing`);

  for (const marker of [
    '#baseHpText',
    '.room.exposed,.gateArch.exposed,.ans',
    '황금 파리',
    '.toast-area',
    '대한민국 회복',
    '#canvas-wrapper'
  ]) assert.ok(hooks.includes(marker), `game-specific audio marker missing: ${marker}`);
});

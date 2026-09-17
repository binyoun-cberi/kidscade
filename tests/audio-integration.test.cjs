const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

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

test('Cloudflare build injector adds the audio manager to all catalog games and hooks to the first enhanced set', () => {
  const source = read('scripts/inject-game-integrations.cjs');
  assert.match(source, /injectAudioRuntimeIntoCatalogGames/);
  assert.match(source, /AUDIO_MANAGER_SRC/);
  assert.match(source, /AUDIO_HOOKS_SRC/);
  for (const title of ['인내의 탑', '멍멍 곱셈 러너', '우주 샌드위치 가게', '아이스크림 나눗셈 가게']) {
    assert.ok(source.includes(title), `enhanced audio title missing: ${title}`);
  }
});

test('first audio hook set covers jump, hit, success, fail, pickup and shop feedback', () => {
  const hooks = read('game-audio-hooks.js');
  for (const key of [
    'movement.jump',
    'combat.impact_heavy',
    'collect.coin_pickup',
    'collect.coin_drop',
    'success.cheer_yay',
    'success.cheer_woohoo',
    'success.victory_fanfare',
    'failure.fail_sting',
    'shop.register_open'
  ]) assert.ok(hooks.includes(key), `${key} is not wired into the first game set`);
});

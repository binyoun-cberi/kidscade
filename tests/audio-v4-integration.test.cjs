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

const TARGET_TITLES = [
  '수식의 첨탑',
  '빙글빙글 타코야키집',
  '네일 아티스트 타이쿤',
  '심해 다이버 시뮬레이터',
  '그릴 마스터 3D DX',
  '코드 브레이커'
];

test('fourth-pass audio hook parses and uses only cataloged semantic sounds', () => {
  const hooks = read('game-audio-hooks-v4.js');
  assert.doesNotThrow(() => new Function(hooks), 'fourth-pass hook file must parse as JavaScript');
  assert.match(hooks, /__kidscadeAudioHooksV4/);

  const catalog = JSON.parse(read('assets/audio/audio-catalog.json'));
  const used = new Set();
  for (const match of hooks.matchAll(/(?:play|preload)\(\s*['"]([a-z0-9_.-]+)['"]/g)) used.add(match[1]);
  for (const match of hooks.matchAll(/playAny\(\s*\[([^\]]+)\]/g)) {
    for (const key of match[1].matchAll(/['"]([a-z0-9_.-]+)['"]/g)) used.add(key[1]);
  }
  assert.ok(used.size >= 6, 'expected several semantic sound mappings in fourth pass');
  for (const key of used) assert.ok(catalog.sounds[key], `missing catalog sound key in fourth pass: ${key}`);
});

test('fourth-pass hook keeps game-specific setup functions and markers', () => {
  const hooks = read('game-audio-hooks-v4.js');
  for (const fn of [
    'setupArithmeticSpire',
    'setupTakoyakiShop',
    'setupNailArtist',
    'setupScubaDiver',
    'setupSteakMaster',
    'setupCodeBreaker'
  ]) assert.match(hooks, new RegExp(`function ${fn}\\(`), `${fn} is missing`);

  for (const marker of [
    '.battle-result',
    '#servedText',
    '#review-modal',
    '#bagText',
    '#flipBtn',
    '#gameover-modal'
  ]) assert.ok(hooks.includes(marker), `fourth-pass audio marker missing: ${marker}`);
});

test('fourth-pass build injector targets the intended catalog games', () => {
  const source = read('scripts/inject-game-audio-v4.cjs');
  assert.match(source, /game-audio-hooks-v4\.js\?v=20260917-1/);
  assert.match(source, /TARGET_TITLES/);
  for (const title of TARGET_TITLES) assert.ok(source.includes(title), `fourth-pass target missing: ${title}`);

  const pkg = JSON.parse(read('package.json'));
  assert.ok(pkg.scripts.build.includes('inject-game-audio-v4.cjs'), 'build must run fourth-pass audio injector');
  assert.ok(pkg.scripts['build:cloudflare'].includes('inject-game-audio-v4.cjs'), 'Cloudflare build must run fourth-pass audio injector');
});

test('built fourth-pass games contain audio manager and v4 hook runtime', () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(root, 'dist', 'data', 'games.json'), 'utf8'));
  for (const title of TARGET_TITLES) {
    const game = (catalog.games || []).find(item => item && item.title === title && !item.disabled);
    assert.ok(game, `fourth-pass game missing from built catalog: ${title}`);
    const relative = stripHref(game.href);
    const html = fs.readFileSync(path.join(root, 'dist', relative), 'utf8');
    const managerAt = html.indexOf('audio-manager.js?v=20260917-1');
    const hookAt = html.indexOf('game-audio-hooks-v4.js?v=20260917-1');
    assert.ok(managerAt >= 0, `audio manager missing from ${title}`);
    assert.ok(hookAt > managerAt, `fourth-pass hook must load after audio manager in ${title}`);
  }
});

test('fourth-pass hooks respect native mute controls where those games expose them', () => {
  const hooks = read('game-audio-hooks-v4.js');
  for (const marker of ['sound-btn', 'SOUND ON', 'toggleAudio()', 'Muted']) {
    assert.ok(hooks.includes(marker), `mute integration marker missing: ${marker}`);
  }
});

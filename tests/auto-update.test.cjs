const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const updater = require('../auto-update.js');
const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const build = fs.readFileSync(path.join(ROOT, 'scripts', 'build-cloudflare.cjs'), 'utf8');
const bootstrap = fs.readFileSync(path.join(ROOT, 'main-bootstrap.js'), 'utf8');

test('auto updater compares immutable build ids rather than timestamps', () => {
  assert.equal(updater.isUsableBuild('__KIDSCADE_BUILD__'), false);
  assert.equal(updater.isUsableBuild('abc123'), true);
  assert.equal(updater.shouldUpdate('abc123', 'abc123'), false);
  assert.equal(updater.shouldUpdate('abc123', 'def456'), true);
});

test('auto updater polls gently and waits for lobby-safe application', () => {
  assert.equal(updater.CHECK_INTERVAL_MS, 15 * 60 * 1000);
  assert.equal(updater.RESUME_MIN_INTERVAL_MS, 30 * 1000);
  const source = fs.readFileSync(path.join(ROOT, 'auto-update.js'), 'utf8');
  assert.match(source, /visibilitychange/);
  assert.match(source, /kidscade:game-closed/);
  assert.match(source, /KidscadeGameFrame/);
  assert.match(source, /cache:\s*'no-store'/);
  assert.match(source, /kc_update/);
});

test('index keeps one bootstrap entrypoint and runtime scripts load after composition', () => {
  assert.match(index, /meta name="kidscade-build" content="__KIDSCADE_BUILD__"/);
  assert.match(index, /main-bootstrap\.js\?v=__KIDSCADE_BUILD__/);
  assert.doesNotMatch(index, /auto-update\.js\?v=__KIDSCADE_BUILD__/);
  const scripts = Array.from(index.matchAll(/<script src="([^"]+)"/g), match => match[1]);
  assert.deepEqual(scripts, ['main-bootstrap.js?v=__KIDSCADE_BUILD__']);
  for (const runtime of ['auto-update.js','kidscade-storage.js','audio-manager.js','profile-history.js','account-client.js','seed-balance-sync.js']) {
    assert.ok(bootstrap.includes("'" + runtime + "'"), runtime + ' must be injected by bootstrap');
  }
  assert.match(bootstrap, /meta name="kidscade-build"/);
  assert.match(bootstrap, /escapeHtml\(RUNTIME_VERSION\)/);
  assert.match(bootstrap, /<scr' \+ 'ipt defer src=/);
});

test('Cloudflare build precomposes the final lobby before browser startup', () => {
  const built = fs.readFileSync(path.join(ROOT, 'dist', 'index.html'), 'utf8');
  assert.doesNotMatch(built, /__KIDSCADE_BUILD__/);
  assert.doesNotMatch(built, /<script\b[^>]*src=["'][^"']*main-bootstrap\.js/i);
  assert.match(built, /window\.KidscadeCatalog=/);
  assert.match(built, /auto-update\.js\?v=/);
  assert.match(built, /audio-manager\.js\?v=/);
  assert.match(built, /game-frame-shell\.js\?v=/);
  assert.match(build, /composeLobbyArtifact/);
  assert.match(build, /compose-lobby-build\.cjs/);
});

test('Cloudflare build emits a no-cache static version manifest', () => {
  assert.match(build, /kidscade-version\.json/);
  assert.match(build, /writeBuildVersion\(buildId\)/);
  assert.match(build, /Cache-Control: no-cache, no-store, must-revalidate/);
  assert.match(build, /CF_PAGES_COMMIT_SHA/);
});

test('closing a game signals the updater to check before the next lobby action', () => {
  assert.match(bootstrap, /kidscade:game-closed/);
});

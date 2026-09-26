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

test('index binds the deployed build id to updater and core lobby scripts', () => {
  assert.match(index, /meta name="kidscade-build" content="__KIDSCADE_BUILD__"/);
  assert.match(index, /auto-update\.js\?v=__KIDSCADE_BUILD__/);
  assert.match(index, /main-bootstrap\.js\?v=__KIDSCADE_BUILD__/);
  const versionedScripts = Array.from(index.matchAll(/<script src="[^"]+\.js\?v=([^"]+)"/g), match => match[1]);
  assert.ok(versionedScripts.length >= 10);
  assert.ok(versionedScripts.every(version => version === '__KIDSCADE_BUILD__'));
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

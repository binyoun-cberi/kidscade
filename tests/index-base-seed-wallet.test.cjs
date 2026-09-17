const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('index_base loads the shared seed wallet before legacy lobby logic', () => {
  const html = read('index_base.html');
  const wallet = html.indexOf('<script src="seed-wallet.js"></script>');
  const mainScript = html.lastIndexOf('<script>');
  assert.ok(wallet >= 0, 'seed-wallet.js script tag is missing');
  assert.ok(mainScript < 0 || wallet < mainScript, 'seed wallet must load before the main inline lobby script');
});

test('index_base seed mutations delegate to the shared wallet', () => {
  const html = read('index_base.html');
  assert.match(html, /let coins = window\.KidscadeSeedWallet\?\.get\?\.\(\)/);
  assert.match(html, /const wallet = window\.KidscadeSeedWallet;/);
  assert.match(html, /wallet\.change\(delta, \{ reason, source: 'index-base' \}\)/);
  assert.match(html, /window\.KidscadeSeedWallet\.subscribe\(detail =>/);
});

test('legacy callers keep changeSeeds/addCoins compatibility while direct persistence is only fallback', () => {
  const html = read('index_base.html');
  assert.match(html, /function changeSeeds\(amount, reason = '', options = \{\}\)/);
  assert.match(html, /function addCoins\(amount, reason\)/);
  const directWrites = html.match(/localStorage\.setItem\('kidscade_coins'/g) || [];
  assert.equal(directWrites.length, 1, 'index_base should only keep one direct seed write in the module-missing fallback');
});

test('bootstrap cache-busts seed-wallet.js with the shared runtime version', () => {
  const bootstrap = read('main-bootstrap.js');
  assert.match(bootstrap, /withVersion\('seed-wallet\.js'\)/);
});

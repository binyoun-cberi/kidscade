const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index_base.html', 'utf8');
const state = fs.readFileSync('shop-state.js', 'utf8');
const ui = fs.readFileSync('shop-ui.js', 'utf8');
const bootstrap = fs.readFileSync('main-bootstrap.js', 'utf8');

test('index_base loads shop state before the standalone shop UI', () => {
  const stateTag = html.indexOf('<script src="shop-state.js"></script>');
  const uiTag = html.indexOf('<script src="shop-ui.js"></script>');
  assert.ok(stateTag >= 0);
  assert.ok(uiTag > stateTag);
  assert.match(html, /KidscadeShopState\?\.ensureDefaults/);
  assert.match(html, /KidscadeShopUI\.create/);
  assert.match(html, /getShopController\(\)\.bind\(\)/);
});

test('shop-state exclusively owns persistent ownership mutations', () => {
  assert.match(state, /function\s+grant\s*\(/);
  assert.match(state, /function\s+equip\s*\(/);
  assert.match(state, /function\s+owns\s*\(/);
  assert.match(state, /function\s+getEquipped\s*\(/);
  assert.match(ui, /shopState\?\.grant/);
  assert.match(ui, /shopState\?\.equip/);
  assert.match(ui, /shopState\?\.owns/);
  assert.match(ui, /shopState\?\.getEquipped/);
  assert.doesNotMatch(html, /function\s+buyItem\s*\(/);
  assert.doesNotMatch(html, /function\s+equipItem\s*\(/);
});

test('shop-ui owns tabs rendering purchases and equipped visual skins', () => {
  assert.match(ui, /function\s+openTab\s*\(/);
  assert.match(ui, /function\s+render\s*\(/);
  assert.match(ui, /function\s+buy\s*\(/);
  assert.match(ui, /function\s+equip\s*\(/);
  assert.match(ui, /function\s+applyEquipped\s*\(/);
  assert.match(ui, /profile-emoji/);
  assert.match(ui, /for \(const category of \['card','land'\]\)/);
  assert.doesNotMatch(html, /\blet\s+currentShopTab\b/);
  assert.doesNotMatch(html, /document\.querySelectorAll\('\.shop-tab'\)\.forEach\(tab/);
});

test('normal shop UI persists only through the common state API when available', () => {
  const grantIndex = ui.indexOf('if (shopState?.grant)');
  const fallbackIndex = ui.indexOf("storage?.setItem?.('kidscade_inventory'", grantIndex);
  assert.ok(grantIndex >= 0 && fallbackIndex > grantIndex);
  assert.doesNotMatch(html, /localStorage\.setItem\('kidscade_equipped'/);
});

test('bootstrap cache-busts shop state and UI with the shared runtime version', () => {
  assert.match(bootstrap, /withVersion\('shop-state\.js'\)/);
  assert.match(bootstrap, /withVersion\('shop-ui\.js'\)/);
});

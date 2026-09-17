const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index_base.html', 'utf8');
const bootstrap = fs.readFileSync('main-bootstrap.js', 'utf8');

test('index_base loads and initializes common shop state', () => {
  assert.match(html, /<script src="shop-state\.js"><\/script>/);
  assert.match(html, /KidscadeShopState\?\.load/);
  assert.match(html, /KidscadeShopState\?\.ensureDefaults/);
});

test('shop purchase and equip delegate ownership mutations to shop-state', () => {
  assert.match(html, /KidscadeShopState\?\.grant/);
  assert.match(html, /KidscadeShopState\?\.equip/);
  assert.match(html, /KidscadeShopState\?\.owns/);
  assert.match(html, /KidscadeShopState\?\.getEquipped/);
});

test('profile badge and visual skins read common equipped state', () => {
  assert.match(html, /getEquippedShopId\('badge'\)/);
  assert.match(html, /getEquippedShopId\('card'\)/);
  assert.match(html, /getEquippedShopId\('land'\)/);
});

test('normal runtime no longer persists equipped state from applyEquipped', () => {
  const applyStart = html.indexOf('            function applyEquipped() {');
  const applyEnd = html.indexOf('\n\n            function ', applyStart + 1);
  assert.ok(applyStart >= 0 && applyEnd > applyStart);
  const block = html.slice(applyStart, applyEnd);
  assert.doesNotMatch(block, /localStorage\.setItem\('kidscade_equipped'/);
});

test('bootstrap cache-busts shop-state with the shared runtime version', () => {
  assert.match(bootstrap, /withVersion\('shop-state\.js'\)/);
});

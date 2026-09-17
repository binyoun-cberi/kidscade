const test = require('node:test');
const assert = require('node:assert/strict');

function makeStorage(seed = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem(key) { return map.has(key) ? map.get(key) : null; },
    setItem(key, value) { map.set(key, String(value)); },
    removeItem(key) { map.delete(key); },
    dump(key) { return map.get(key); }
  };
}

function freshModule(storage) {
  global.localStorage = storage;
  const path = require.resolve('../shop-state.js');
  delete require.cache[path];
  return require('../shop-state.js');
}

test.afterEach(() => {
  delete global.localStorage;
});

test('normalization preserves legacy defaults and current shop defaults', () => {
  const state = freshModule(makeStorage());
  const inventory = state.normalizeInventory({ badge: ['badge_math'], custom: ['x', 'x'] });
  const equipped = state.normalizeEquipped({ badge: 'badge_math' });

  assert.ok(inventory.emoji.includes('e_basic'));
  assert.ok(inventory.land.includes('land_basic'));
  assert.ok(inventory.card.includes('card_basic'));
  assert.ok(inventory.badge.includes('badge_basic'));
  assert.deepEqual(inventory.custom, ['x']);
  assert.equal(equipped.badge, 'badge_math');
  assert.equal(equipped.land, 'land_basic');
});

test('load keeps existing physical save keys and repairs missing defaults', () => {
  const storage = makeStorage({
    kidscade_inventory: JSON.stringify({ badge: ['badge_word'] }),
    kidscade_equipped: JSON.stringify({ badge: 'badge_word' })
  });
  const state = freshModule(storage);
  const loaded = state.load();

  assert.ok(loaded.inventory.badge.includes('badge_word'));
  assert.ok(loaded.inventory.badge.includes('badge_basic'));
  assert.equal(loaded.equipped.badge, 'badge_word');
});

test('grant persists ownership and equips the purchased item', () => {
  const storage = makeStorage();
  const state = freshModule(storage);
  const result = state.grant('card', 'card_neon');

  assert.equal(result.ok, true);
  assert.equal(result.added, true);
  assert.ok(result.inventory.card.includes('card_neon'));
  assert.equal(result.equipped.card, 'card_neon');
  assert.match(storage.dump('kidscade_inventory'), /card_neon/);
  assert.match(storage.dump('kidscade_equipped'), /card_neon/);
});

test('equip rejects unowned items by default and accepts owned items', () => {
  const state = freshModule(makeStorage());
  assert.equal(state.equip('badge', 'badge_math').ok, false);
  state.grant('badge', 'badge_math', { equip: false });
  const equipped = state.equip('badge', 'badge_math');
  assert.equal(equipped.ok, true);
  assert.equal(equipped.equipped.badge, 'badge_math');
});

test('owns and getEquipped read the latest persisted state', () => {
  const storage = makeStorage();
  const state = freshModule(storage);
  state.grant('land', 'land_lab');
  assert.equal(state.owns('land', 'land_lab'), true);
  assert.equal(state.getEquipped('land'), 'land_lab');
});

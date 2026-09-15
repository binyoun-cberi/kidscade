const test = require('node:test');
const assert = require('node:assert/strict');

class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(String(key), String(value)); }
  removeItem(key) { this.map.delete(String(key)); }
  clear() { this.map.clear(); }
}

function loadStorage() {
  global.localStorage = new MemoryStorage();
  const modulePath = require.resolve('../kidscade-storage.js');
  delete require.cache[modulePath];
  return require(modulePath);
}

test('storage registry keeps current save keys compatible', () => {
  const storage = loadStorage();
  assert.equal(storage.keys.seeds, 'kidscade_coins');
  assert.equal(storage.keys.favorites, 'kidscade_favs');
  assert.equal(storage.keys.recents, 'kidscade_recents');
  assert.equal(storage.keys.avatarInventory, 'kidscade_avatar_inventory');
  assert.equal(storage.keys.playtimeSeconds, 'kidscade_playtime_sec');
  assert.equal(storage.keys.gardenState, 'kidscade_garden_v1');
  assert.equal(storage.gameKeys.aquariumSave, 'kidscade_aquarium_v1');
  assert.equal(storage.gameKeys.byeokrandoSave, 'kidscade_byeokrando_v1');
  assert.equal(storage.prefixes.languageV3, 'kidscade_language_v3_');
});

test('anonymous server-stat and local profile keys stay inside the registered namespace', () => {
  const storage = loadStorage();
  assert.equal(storage.keys.anonymousClientId, 'kidscade_anon_client_id');
  assert.equal(storage.keys.statsVisitWeek, 'kidscade_stats_visit_week');
  assert.equal(storage.keys.serverStatsCache, 'kidscade_stats_cache_v1');
  assert.equal(storage.keys.profile, 'kidscade_profile_v1');
  assert.equal(storage.keys.playHistory, 'kidscade_play_history_v1');
  assert.equal(storage.isRegisteredPhysicalKey('kidscade_anon_client_id'), true);
  assert.equal(storage.isRegisteredPhysicalKey('kidscade_stats_cache_v1'), true);
  assert.equal(storage.isRegisteredPhysicalKey('kidscade_profile_v1'), true);
  assert.equal(storage.isRegisteredPhysicalKey('kidscade_play_history_v1'), true);
});

test('storage initializes a schema version without erasing existing values', () => {
  const storage = loadStorage();
  assert.equal(localStorage.getItem('kidscade_save_version'), '1');

  localStorage.setItem('kidscade_coins', '321');
  storage.ensureSaveVersion();
  assert.equal(storage.getInt('seeds'), 321);
});

test('typed helpers round-trip JSON and booleans', () => {
  const storage = loadStorage();
  assert.equal(storage.setJson('favorites', ['a', 'b']), true);
  assert.deepEqual(storage.getJson('favorites', []), ['a', 'b']);

  storage.setRaw('darkMode', 'true');
  assert.equal(storage.getBool('darkMode'), true);
});

test('registered physical keys include shared, game and dynamic namespaces', () => {
  const storage = loadStorage();
  assert.equal(storage.isRegisteredPhysicalKey('kidscade_coins'), true);
  assert.equal(storage.isRegisteredPhysicalKey('kidscade_aquarium_v1'), true);
  assert.equal(storage.isRegisteredPhysicalKey('kidscade_language_v3_'), true);
  assert.equal(storage.isRegisteredPhysicalKey('kidscade_language_v3_en'), true);
  assert.equal(storage.isRegisteredPhysicalKey('kidscade_unknown_new_key'), false);
});

test('unknown unprefixed keys are rejected to prevent accidental key sprawl', () => {
  const storage = loadStorage();
  assert.throws(() => storage.setRaw('random_setting', '1'), /Unknown Kidscade storage key/);
  assert.equal(storage.setRaw('kidscade_game_specific_score', '42'), true);
});

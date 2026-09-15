(() => {
  'use strict';

  const SAVE_SCHEMA_VERSION = 1;
  const KEYS = Object.freeze({
    saveVersion: 'kidscade_save_version',
    seeds: 'kidscade_coins',
    favorites: 'kidscade_favs',
    recents: 'kidscade_recents',
    age: 'kidscade_age',
    darkMode: 'kidscade_darkmode',
    inventory: 'kidscade_inventory',
    equipped: 'kidscade_equipped',
    claimedRanks: 'kidscade_claimed_ranks',
    petItems: 'kidscade_pet_items',
    pet: 'kidscade_pet',
    playLimits: 'kidscade_game_play_limits',
    dailyRewardClaimed: 'kidscade_daily_reward_claimed',
    dailyMissions: 'kidscade_daily_missions',
    attendance: 'kidscade_attendance',
    playtimeSeconds: 'kidscade_playtime_sec',
    legacyPlaytimeMinutes: 'kidscade_playtime',
    avatarInventory: 'kidscade_avatar_inventory',
    avatarEquipped: 'kidscade_avatar_equipped',
    petCanvas: 'kidscade_sook_canvas_pet'
  });

  function getStorage() {
    try {
      if (typeof localStorage === 'undefined') return null;
      const probe = '__kidscade_storage_probe__';
      localStorage.setItem(probe, '1');
      localStorage.removeItem(probe);
      return localStorage;
    } catch (_) {
      return null;
    }
  }

  function resolveKey(nameOrKey) {
    if (Object.prototype.hasOwnProperty.call(KEYS, nameOrKey)) return KEYS[nameOrKey];
    const value = String(nameOrKey || '');
    if (value.startsWith('kidscade_')) return value;
    throw new Error(`Unknown Kidscade storage key: ${value}`);
  }

  function getRaw(nameOrKey, fallback = null) {
    const storage = getStorage();
    if (!storage) return fallback;
    const value = storage.getItem(resolveKey(nameOrKey));
    return value === null ? fallback : value;
  }

  function setRaw(nameOrKey, value) {
    const storage = getStorage();
    if (!storage) return false;
    const key = resolveKey(nameOrKey);
    storage.setItem(key, String(value));
    emitChange(key, value);
    return true;
  }

  function remove(nameOrKey) {
    const storage = getStorage();
    if (!storage) return false;
    const key = resolveKey(nameOrKey);
    storage.removeItem(key);
    emitChange(key, null);
    return true;
  }

  function getJson(nameOrKey, fallback) {
    const raw = getRaw(nameOrKey, null);
    if (raw === null) return fallback;
    try {
      const parsed = JSON.parse(raw);
      return parsed ?? fallback;
    } catch (error) {
      console.warn(`[KidscadeStorage] 손상된 저장값: ${resolveKey(nameOrKey)}`, error);
      return fallback;
    }
  }

  function setJson(nameOrKey, value) {
    return setRaw(nameOrKey, JSON.stringify(value));
  }

  function getInt(nameOrKey, fallback = 0) {
    const value = Number.parseInt(getRaw(nameOrKey, ''), 10);
    return Number.isFinite(value) ? value : fallback;
  }

  function getBool(nameOrKey, fallback = false) {
    const value = getRaw(nameOrKey, null);
    if (value === null) return fallback;
    return value === 'true' || value === '1';
  }

  function emitChange(key, value) {
    if (typeof document === 'undefined' || typeof CustomEvent === 'undefined') return;
    document.dispatchEvent(new CustomEvent('kidscade:storage-changed', {
      detail: { key, value }
    }));
  }

  function ensureSaveVersion() {
    const current = getInt('saveVersion', 0);
    if (current < SAVE_SCHEMA_VERSION) setRaw('saveVersion', SAVE_SCHEMA_VERSION);
    return SAVE_SCHEMA_VERSION;
  }

  const api = Object.freeze({
    schemaVersion: SAVE_SCHEMA_VERSION,
    keys: KEYS,
    resolveKey,
    getRaw,
    setRaw,
    remove,
    getJson,
    setJson,
    getInt,
    getBool,
    ensureSaveVersion
  });

  if (typeof window !== 'undefined') window.KidscadeStorage = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

  ensureSaveVersion();
})();

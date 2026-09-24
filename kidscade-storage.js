(() => {
  'use strict';

  const SAVE_SCHEMA_VERSION = 1;

  // Site-wide and shared subsystem state. Physical key names stay unchanged so
  // existing students keep their current local saves during the migration.
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
    audioSettings: 'kidscade_audio_settings_v1',
    avatarInventory: 'kidscade_avatar_inventory',
    avatarEquipped: 'kidscade_avatar_equipped',
    petCanvas: 'kidscade_sook_canvas_pet',
    gardenState: 'kidscade_garden_v1',
    languageSound: 'kidscade_language_sound',
    languageVolume: 'kidscade_language_volume',
    lifeLegacy: 'kidscade_life_v1',
    lifeWorldLegacy: 'kidscade_life_world',
    lifeWorldV1: 'kidscade_life_world_v1',
    worldV2: 'kidscade_world_v2',
    seedWorldMeta: 'kidscade_seed_world_meta_v1',
    anonymousClientId: 'kidscade_anon_client_id',
    statsVisitWeek: 'kidscade_stats_visit_week',
    serverStatsCache: 'kidscade_stats_cache_v1',
    profile: 'kidscade_profile_v1',
    playHistory: 'kidscade_play_history_v1'
  });

  // Existing namespaced saves owned by one game. They are catalogued separately
  // from shared state so a future D1 sync can choose whether to upload them.
  const GAME_KEYS = Object.freeze({
    aquariumSave: 'kidscade_aquarium_v1',
    byeokrandoSave: 'kidscade_byeokrando_v1',
    musicStudioSave: 'kidscade_music_studio_v2',
    timingExact10Local: 'kidscade_timing_exact10_local_v1',
    omokArenaSave: 'kidscade_omok_arena_v1',
    internalMedicineSave: 'kidscade_internal_medicine_v1',
    schoolSurvivalSave: 'kidscade_school_survival_v2',
    worldAudioSettings: 'kidscade_world_audio_v1',
    wordchainRoomId: 'kidscade_wordchain_room_id',
    wordchainV2Session: 'kidscade_wordchain_v2_session',
    towerV2Session: 'kidscade_tower_v2_session',
    quarantineTutorialSeen: 'kidscade_quarantine17_tutorial_seen',
    quarantineBestV2: 'kidscade_quarantine17_best_v2',
    gugudanSettings: 'kidscade_gugudan_settings_v1',
    gugudanWins: 'kidscade_gugudan_wins_v1',
    gugudanHighScore: 'kidscade_gugudan_high_score_v1',
    topKingRecord: 'kidscade_top_king_record_v1',
    metroPlannerSave: 'kidscade_metro_planner_v1',
    disasterCityBestSeconds: 'kidscade_disaster_city_best_seconds',
    folkloreNightSave: 'kidscade_folklore_night_v1',
    bodyLabTutorialSeen: 'kidscade_body_lab_tutorial_v2',
    bridgeScribbleHelpSeen: 'kidscade_bridge_scribble_help_v1'
  });

  // Dynamic namespaces are prefixes, not concrete localStorage records.
  const PREFIXES = Object.freeze({
    languageV3: 'kidscade_language_v3_',
    gameSdkV1: 'kidscade_game_v1:'
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
    if (Object.prototype.hasOwnProperty.call(GAME_KEYS, nameOrKey)) return GAME_KEYS[nameOrKey];
    const value = String(nameOrKey || '');
    if (value.startsWith('kidscade_')) return value;
    throw new Error(`Unknown Kidscade storage key: ${value}`);
  }

  function isRegisteredPhysicalKey(key) {
    const value = String(key || '');
    if (Object.values(KEYS).includes(value) || Object.values(GAME_KEYS).includes(value)) return true;
    return Object.values(PREFIXES).some(prefix => value.startsWith(prefix));
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
    gameKeys: GAME_KEYS,
    prefixes: PREFIXES,
    resolveKey,
    isRegisteredPhysicalKey,
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
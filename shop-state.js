((factory) => {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.KidscadeShopState = Object.freeze(api);
})(() => {
  'use strict';

  const INVENTORY_KEY = 'kidscade_inventory';
  const EQUIPPED_KEY = 'kidscade_equipped';
  const DEFAULT_INVENTORY = Object.freeze({
    emoji: Object.freeze(['e_basic']),
    title_p: Object.freeze(['tp_basic']),
    title_n: Object.freeze(['tn_basic']),
    theme: Object.freeze(['th_basic']),
    land: Object.freeze(['land_basic']),
    card: Object.freeze(['card_basic']),
    badge: Object.freeze(['badge_basic'])
  });
  const DEFAULT_EQUIPPED = Object.freeze({
    emoji: 'e_basic',
    title_p: 'tp_basic',
    title_n: 'tn_basic',
    theme: 'th_basic',
    land: 'land_basic',
    card: 'card_basic',
    badge: 'badge_basic'
  });

  const listeners = new Set();
  let started = false;

  function cloneInventory(input = DEFAULT_INVENTORY) {
    const output = {};
    Object.entries(input || {}).forEach(([category, ids]) => {
      if (!Array.isArray(ids)) return;
      output[category] = [...new Set(ids.map(id => String(id || '').trim()).filter(Boolean))];
    });
    return output;
  }

  function normalizeInventory(input) {
    const normalized = cloneInventory(input && typeof input === 'object' && !Array.isArray(input) ? input : {});
    Object.entries(DEFAULT_INVENTORY).forEach(([category, required]) => {
      if (!Array.isArray(normalized[category])) normalized[category] = [];
      required.forEach(id => {
        if (!normalized[category].includes(id)) normalized[category].unshift(id);
      });
    });
    return normalized;
  }

  function normalizeEquipped(input) {
    const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
    const normalized = {};
    Object.entries(source).forEach(([category, id]) => {
      const value = String(id || '').trim();
      if (value) normalized[category] = value;
    });
    Object.entries(DEFAULT_EQUIPPED).forEach(([category, id]) => {
      if (!normalized[category]) normalized[category] = id;
    });
    return normalized;
  }

  function storageApi() {
    return typeof window !== 'undefined' ? window.KidscadeStorage : null;
  }

  function browserStorage() {
    try {
      return typeof localStorage !== 'undefined' ? localStorage : null;
    } catch (_) {
      return null;
    }
  }

  function readJson(logicalName, physicalKey, fallback) {
    const shared = storageApi();
    if (shared?.getJson) return shared.getJson(logicalName, fallback);
    const storage = browserStorage();
    if (!storage) return fallback;
    try {
      const raw = storage.getItem(physicalKey);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (_) {
      return fallback;
    }
  }

  function writeJson(logicalName, physicalKey, value) {
    const shared = storageApi();
    if (shared?.setJson) return shared.setJson(logicalName, value);
    const storage = browserStorage();
    if (!storage) return false;
    storage.setItem(physicalKey, JSON.stringify(value));
    return true;
  }

  function load() {
    const inventory = normalizeInventory(readJson('inventory', INVENTORY_KEY, DEFAULT_INVENTORY));
    const equipped = normalizeEquipped(readJson('equipped', EQUIPPED_KEY, DEFAULT_EQUIPPED));
    return { inventory, equipped };
  }

  function saveInventory(input, options = {}) {
    const inventory = normalizeInventory(input);
    writeJson('inventory', INVENTORY_KEY, inventory);
    if (options.emit !== false) emit('inventory', { inventory, equipped: load().equipped }, options.source || 'local');
    return inventory;
  }

  function saveEquipped(input, options = {}) {
    const equipped = normalizeEquipped(input);
    writeJson('equipped', EQUIPPED_KEY, equipped);
    if (options.emit !== false) emit('equipped', { inventory: load().inventory, equipped }, options.source || 'local');
    return equipped;
  }

  function save(state = {}, options = {}) {
    const inventory = saveInventory(state.inventory, { emit: false });
    const equipped = saveEquipped(state.equipped, { emit: false });
    if (options.emit !== false) emit('all', { inventory, equipped }, options.source || 'local');
    return { inventory, equipped };
  }

  function owns(category, itemId, state = null) {
    const source = state?.inventory ? normalizeInventory(state.inventory) : load().inventory;
    const id = String(itemId || '').trim();
    return Boolean(id && Array.isArray(source[category]) && source[category].includes(id));
  }

  function getEquipped(category, state = null) {
    const source = state?.equipped ? normalizeEquipped(state.equipped) : load().equipped;
    return source[category] || DEFAULT_EQUIPPED[category] || '';
  }

  function grant(category, itemId, options = {}) {
    const id = String(itemId || '').trim();
    const key = String(category || '').trim();
    const state = load();
    if (!key || !id) return { ok: false, added: false, ...state };
    if (!Array.isArray(state.inventory[key])) state.inventory[key] = [];
    const added = !state.inventory[key].includes(id);
    if (added) state.inventory[key].push(id);
    if (options.equip !== false) state.equipped[key] = id;
    const saved = save(state, { source: options.source || 'grant' });
    return { ok: true, added, ...saved };
  }

  function equip(category, itemId, options = {}) {
    const id = String(itemId || '').trim();
    const key = String(category || '').trim();
    const state = load();
    if (!key || !id) return { ok: false, reason: 'invalid', ...state };
    if (options.requireOwned !== false && !owns(key, id, state)) {
      return { ok: false, reason: 'not-owned', ...state };
    }
    state.equipped[key] = id;
    const equipped = saveEquipped(state.equipped, { source: options.source || 'equip' });
    return { ok: true, inventory: state.inventory, equipped };
  }

  function emit(kind, state = load(), source = 'sync') {
    const detail = { kind, source, inventory: normalizeInventory(state.inventory), equipped: normalizeEquipped(state.equipped) };
    listeners.forEach(listener => {
      try { listener(detail); } catch (error) { console.error('[KidscadeShopState] listener failed', error); }
    });
    if (typeof document !== 'undefined' && typeof CustomEvent !== 'undefined') {
      document.dispatchEvent(new CustomEvent('kidscade:shop-state-changed', { detail }));
    }
    return detail;
  }

  function subscribe(listener, options = {}) {
    if (typeof listener !== 'function') return () => {};
    startSync();
    listeners.add(listener);
    if (options.immediate !== false) listener({ kind: 'all', source: 'subscribe', ...load() });
    return () => listeners.delete(listener);
  }

  function isRelevantPhysicalKey(key) {
    return key === INVENTORY_KEY || key === EQUIPPED_KEY;
  }

  function startSync() {
    if (started || typeof window === 'undefined') return;
    started = true;
    window.addEventListener?.('storage', event => {
      if (isRelevantPhysicalKey(event.key)) emit(event.key === INVENTORY_KEY ? 'inventory' : 'equipped', load(), 'storage');
    });
    if (typeof document !== 'undefined') {
      document.addEventListener('kidscade:storage-changed', event => {
        const key = event?.detail?.key;
        if (isRelevantPhysicalKey(key)) emit(key === INVENTORY_KEY ? 'inventory' : 'equipped', load(), 'kidscade-storage');
      });
    }
  }

  function ensureDefaults() {
    const state = load();
    save(state, { emit: false, source: 'init' });
    return state;
  }

  const api = {
    inventoryKey: INVENTORY_KEY,
    equippedKey: EQUIPPED_KEY,
    defaults: Object.freeze({ inventory: DEFAULT_INVENTORY, equipped: DEFAULT_EQUIPPED }),
    normalizeInventory,
    normalizeEquipped,
    load,
    save,
    saveInventory,
    saveEquipped,
    owns,
    getEquipped,
    grant,
    equip,
    subscribe,
    startSync,
    ensureDefaults
  };

  if (typeof window !== 'undefined') {
    startSync();
    ensureDefaults();
  }
  return Object.freeze(api);
});

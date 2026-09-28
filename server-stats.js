(() => {
  'use strict';

  const API_ROOT = '/api/stats';
  const CACHE_TTL_MS = 5 * 60 * 1000;
  let currentStats = null;
  let booted = false;

  function storage() {
    return window.KidscadeStorage || null;
  }

  function getKstWeekKey(input = new Date()) {
    const kst = new Date(input.getTime() + 9 * 60 * 60 * 1000);
    const day = kst.getUTCDay();
    const daysSinceMonday = (day + 6) % 7;
    const monday = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate() - daysSinceMonday));
    return [
      monday.getUTCFullYear(),
      String(monday.getUTCMonth() + 1).padStart(2, '0'),
      String(monday.getUTCDate()).padStart(2, '0')
    ].join('-');
  }

  function makeClientId() {
    if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
    const bytes = new Uint8Array(16);
    if (globalThis.crypto?.getRandomValues) crypto.getRandomValues(bytes);
    else for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  function getClientId() {
    const store = storage();
    if (!store) return null;
    let id = store.getRaw('anonymousClientId', '');
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      id = makeClientId();
      store.setRaw('anonymousClientId', id);
    }
    return id;
  }

  function render(stats) {
    if (!stats?.ok) return false;
    currentStats = stats;
    document.dispatchEvent(new CustomEvent('kidscade:server-stats-updated', {
      detail: { weekKey: stats.weekKey || '', stats }
    }));
    return true;
  }

  function readCache() {
    const cached = storage()?.getJson('serverStatsCache', null);
    if (!cached?.data?.ok || cached.data.weekKey !== getKstWeekKey()) return null;
    return cached;
  }

  function saveCache(data) {
    storage()?.setJson('serverStatsCache', { fetchedAt: Date.now(), data });
  }

  async function requestJson(url, options = {}) {
    const response = await fetch(url, {
      credentials: 'same-origin',
      ...options,
      headers: { 'content-type': 'application/json', ...(options.headers || {}) }
    });
    if (!response.ok) throw new Error(`stats-http-${response.status}`);
    return response.json();
  }

  async function recordWeeklyVisit() {
    const store = storage();
    const clientId = getClientId();
    if (!store || !clientId) return null;
    const weekKey = getKstWeekKey();
    if (store.getRaw('statsVisitWeek', '') === weekKey) return null;
    try {
      const result = await requestJson(`${API_ROOT}/visit`, { method: 'POST', body: JSON.stringify({ clientId }) });
      if (result?.ok) {
        store.setRaw('statsVisitWeek', weekKey);
        if (currentStats?.ok && result.site) {
          const next = {
            ...currentStats,
            site: { ...currentStats.site, ...result.site },
            weekKey: result.weekKey || currentStats.weekKey
          };
          saveCache(next);
          render(next);
        }
      }
      return result;
    } catch (_) {
      return null;
    }
  }

  async function loadStats(force = false) {
    const cached = readCache();
    if (cached) render(cached.data);
    if (!force && cached && Date.now() - Number(cached.fetchedAt || 0) < CACHE_TTL_MS) return cached.data;
    try {
      const response = await fetch(API_ROOT, { credentials: 'same-origin' });
      if (!response.ok) return cached?.data || null;
      const data = await response.json();
      if (data?.ok) {
        saveCache(data);
        render(data);
      }
      return data;
    } catch (_) {
      return cached?.data || null;
    }
  }

  async function recordPlay(gameId, seconds) {
    const id = String(gameId || '');
    const duration = Math.floor(Number(seconds || 0));
    if (!/^[a-z0-9_-]{1,80}$/i.test(id) || duration < 30) return null;
    try {
      const result = await requestJson(`${API_ROOT}/play`, {
        method: 'POST',
        keepalive: true,
        body: JSON.stringify({ gameId: id, seconds: duration })
      });
      if (result?.ok && result.game) {
        const base = currentStats?.ok
          ? currentStats
          : (readCache()?.data || { ok: true, weekKey: result.weekKey, site: { weeklyVisitors: 0, totalVisitors: 0 }, games: {} });
        const next = {
          ...base,
          weekKey: result.weekKey || base.weekKey,
          games: { ...(base.games || {}), [id]: result.game }
        };
        saveCache(next);
        render(next);
      }
      return result;
    } catch (_) {
      return null;
    }
  }

  async function boot() {
    if (booted || !window.KidscadeCatalog) return false;
    booted = true;
    const cached = readCache();
    if (cached) render(cached.data);
    await recordWeeklyVisit();
    await loadStats(false);
    return true;
  }

  function waitForApp() {
    let attempts = 0;
    const tick = async () => {
      const started = await boot();
      if (started) return;
      attempts += 1;
      if (attempts < 120) setTimeout(tick, 250);
    };
    tick();
  }

  window.KidscadeServerStats = Object.freeze({
    load: loadStats,
    recordPlay,
    recordVisit: recordWeeklyVisit,
    render,
    get current() { return currentStats; }
  });

  waitForApp();
})();

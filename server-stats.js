(() => {
  'use strict';

  const API_ROOT = '/api/stats';
  const CACHE_TTL_MS = 5 * 60 * 1000;
  const STYLE_ID = 'kidscade-server-stats-style';
  let currentStats = null;

  function storage() {
    return window.KidscadeStorage || null;
  }

  function getKstWeekKey(input = new Date()) {
    const kst = new Date(input.getTime() + 9 * 60 * 60 * 1000);
    const day = kst.getUTCDay();
    const daysSinceMonday = (day + 6) % 7;
    const monday = new Date(Date.UTC(
      kst.getUTCFullYear(),
      kst.getUTCMonth(),
      kst.getUTCDate() - daysSinceMonday
    ));
    return [
      monday.getUTCFullYear(),
      String(monday.getUTCMonth() + 1).padStart(2, '0'),
      String(monday.getUTCDate()).padStart(2, '0')
    ].join('-');
  }

  function makeClientId() {
    if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
    const bytes = new Uint8Array(16);
    globalThis.crypto?.getRandomValues?.(bytes);
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

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #kc-live-stats {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px 12px;
        margin: 8px 0 14px;
        padding: 10px 13px;
        border: 1px solid rgba(148,163,184,.22);
        border-radius: 14px;
        background: rgba(255,255,255,.72);
        box-shadow: 0 6px 18px rgba(15,23,42,.05);
        font-size: .84rem;
        color: #64748b;
      }
      body.dark-mode #kc-live-stats {
        background: rgba(30,41,59,.72);
        color: #cbd5e1;
        border-color: rgba(148,163,184,.18);
      }
      #kc-live-stats strong { color: #0f172a; font-weight: 800; }
      body.dark-mode #kc-live-stats strong { color: #f8fafc; }
      #kc-live-stats .kc-stats-label { font-weight: 800; color: #7c3aed; }
      .kc-server-card-stats {
        margin-top: 7px;
        font-size: .72rem;
        line-height: 1.2;
        color: #64748b;
        font-weight: 700;
        white-space: nowrap;
      }
      body.dark-mode .kc-server-card-stats { color: #cbd5e1; }
      .dashboard-container .kc-server-card-stats { display: none !important; }
    `;
    document.head.appendChild(style);
  }

  function formatCount(value) {
    const n = Math.max(0, Number(value || 0));
    return new Intl.NumberFormat('ko-KR').format(n);
  }

  function ensureSiteStats() {
    let element = document.getElementById('kc-live-stats');
    if (element) return element;
    const list = document.getElementById('game-list');
    if (!list?.parentNode) return null;
    element = document.createElement('div');
    element.id = 'kc-live-stats';
    element.setAttribute('aria-live', 'polite');
    list.parentNode.insertBefore(element, list);
    return element;
  }

  function renderSiteStats(stats) {
    const element = ensureSiteStats();
    if (!element || !stats?.site) return;
    element.innerHTML = `
      <span class="kc-stats-label">📊 KIDSCADE 이용 현황</span>
      <span>이번 주 방문자 <strong>${formatCount(stats.site.weeklyVisitors)}명</strong></span>
      <span>누적 방문자 <strong>${formatCount(stats.site.totalVisitors)}명</strong></span>
    `;
  }

  function renderGameStats(stats) {
    const gameStats = stats?.games || {};
    document.querySelectorAll('#game-list .game-card[data-id]').forEach(card => {
      const id = card.getAttribute('data-id');
      const value = gameStats[id] || { weeklyPlays: 0, totalPlays: 0 };
      let line = card.querySelector(':scope > .kc-server-card-stats');
      if (!line) {
        line = document.createElement('div');
        line.className = 'kc-server-card-stats';
        const desc = card.querySelector(':scope > .game-desc');
        if (desc?.nextSibling) card.insertBefore(line, desc.nextSibling);
        else card.appendChild(line);
      }
      line.textContent = `🔥 이번 주 ${formatCount(value.weeklyPlays)}회 · 누적 ${formatCount(value.totalPlays)}회`;
    });
  }

  function render(stats) {
    if (!stats?.ok) return;
    currentStats = stats;
    renderSiteStats(stats);
    renderGameStats(stats);
  }

  function readCache() {
    const cached = storage()?.getJson('serverStatsCache', null);
    if (!cached?.data?.ok) return null;
    if (cached.data.weekKey !== getKstWeekKey()) return null;
    return cached;
  }

  function saveCache(data) {
    storage()?.setJson('serverStatsCache', { fetchedAt: Date.now(), data });
  }

  async function requestJson(url, options = {}) {
    const response = await fetch(url, {
      credentials: 'same-origin',
      ...options,
      headers: {
        'content-type': 'application/json',
        ...(options.headers || {})
      }
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
      const result = await requestJson(`${API_ROOT}/visit`, {
        method: 'POST',
        body: JSON.stringify({ clientId })
      });
      if (result?.ok) {
        store.setRaw('statsVisitWeek', weekKey);
        if (currentStats?.ok && result.site) {
          currentStats.site = { ...currentStats.site, ...result.site };
          currentStats.weekKey = result.weekKey || currentStats.weekKey;
          saveCache(currentStats);
          render(currentStats);
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
        const base = currentStats?.ok ? currentStats : (readCache()?.data || {
          ok: true,
          weekKey: result.weekKey,
          site: { weeklyVisitors: 0, totalVisitors: 0 },
          games: {},
          popular: []
        });
        base.games = { ...(base.games || {}), [id]: result.game };
        base.weekKey = result.weekKey || base.weekKey;
        currentStats = base;
        saveCache(base);
        renderGameStats(base);
      }
      return result;
    } catch (_) {
      return null;
    }
  }

  async function boot() {
    installStyles();
    const cached = readCache();
    if (cached) render(cached.data);
    await recordWeeklyVisit();
    await loadStats(false);
  }

  window.KidscadeServerStats = Object.freeze({
    load: loadStats,
    recordPlay,
    recordVisit: recordWeeklyVisit,
    render,
    get current() { return currentStats; }
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();

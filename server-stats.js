(() => {
  'use strict';

  const API_ROOT = '/api/stats';
  const CACHE_TTL_MS = 5 * 60 * 1000;
  const STYLE_ID = 'kidscade-server-stats-style';
  let currentStats = null;
  let booted = false;

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
    return [monday.getUTCFullYear(), String(monday.getUTCMonth() + 1).padStart(2, '0'), String(monday.getUTCDate()).padStart(2, '0')].join('-');
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

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #kc-live-stats { display:flex; flex-wrap:wrap; align-items:center; gap:8px 12px; margin:8px 0 14px; padding:10px 13px; border:1px solid rgba(148,163,184,.22); border-radius:14px; background:rgba(255,255,255,.72); box-shadow:0 6px 18px rgba(15,23,42,.05); font-size:.84rem; color:#64748b; }
      body.dark-mode #kc-live-stats { background:rgba(30,41,59,.72); color:#cbd5e1; border-color:rgba(148,163,184,.18); }
      #kc-live-stats strong { color:#0f172a; font-weight:800; }
      body.dark-mode #kc-live-stats strong { color:#f8fafc; }
      #kc-live-stats .kc-stats-label { font-weight:800; color:#7c3aed; }
      .kc-server-card-stats { margin-top:7px; font-size:.72rem; line-height:1.2; color:#64748b; font-weight:700; white-space:nowrap; }
      body.dark-mode .kc-server-card-stats { color:#cbd5e1; }
      .dashboard-container .kc-server-card-stats { display:none !important; }

      #kc-popular-hub { margin:0 0 18px; }
      .kc-popular-head { display:flex; align-items:end; justify-content:space-between; gap:12px; margin:0 2px 9px; }
      .kc-popular-title { margin:0; font-size:1.02rem; font-weight:950; color:#1e293b; }
      .kc-popular-note { font-size:.72rem; font-weight:700; color:#94a3b8; }
      body.dark-mode .kc-popular-title { color:#f8fafc; }
      .kc-popular-tabs { display:none; gap:5px; margin-top:8px; padding:3px; border-radius:12px; background:#f1f5f9; }
      body.dark-mode .kc-popular-tabs { background:#263449; }
      .kc-popular-tab { flex:1; min-height:30px; border:0; border-radius:9px; background:transparent; color:#64748b; font:inherit; font-size:.68rem; font-weight:950; cursor:pointer; }
      .kc-popular-tab.active { background:#fff; color:#7c3aed; box-shadow:0 3px 9px rgba(15,23,42,.08); }
      body.dark-mode .kc-popular-tab { color:#cbd5e1; }
      body.dark-mode .kc-popular-tab.active { background:#334155; color:#ddd6fe; }
      .kc-popular-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
      .kc-popular-panel { min-width:0; padding:12px; border:1px solid rgba(148,163,184,.22); border-radius:18px; background:rgba(255,255,255,.82); box-shadow:0 8px 22px rgba(15,23,42,.055); }
      body.dark-mode .kc-popular-panel { background:rgba(30,41,59,.82); border-color:rgba(148,163,184,.18); }
      .kc-popular-panel-title { display:flex; align-items:center; justify-content:space-between; gap:8px; margin:0 0 8px; font-size:.84rem; font-weight:950; color:#334155; }
      body.dark-mode .kc-popular-panel-title { color:#e2e8f0; }
      .kc-popular-list { display:grid; gap:6px; }
      .kc-popular-item { width:100%; min-width:0; display:grid; grid-template-columns:30px 64px minmax(0,1fr) auto; align-items:center; gap:9px; padding:6px; border:0; border-radius:12px; background:transparent; color:inherit; text-align:left; font:inherit; cursor:pointer; transition:background .16s ease, transform .16s ease; }
      .kc-popular-item:hover { background:rgba(124,58,237,.07); transform:translateY(-1px); }
      .kc-popular-item:focus-visible { outline:3px solid rgba(124,58,237,.22); outline-offset:1px; }
      body.dark-mode .kc-popular-item:hover { background:rgba(167,139,250,.10); }
      .kc-popular-rank { width:30px; height:30px; display:grid; place-items:center; border-radius:10px; background:#f1f5f9; color:#475569; font-size:.73rem; font-weight:950; }
      .kc-popular-rank[data-rank="1"] { background:#fff4c7; color:#9a6700; }
      .kc-popular-rank[data-rank="2"] { background:#eef2f6; color:#64748b; }
      .kc-popular-rank[data-rank="3"] { background:#fbe8dc; color:#a45124; }
      body.dark-mode .kc-popular-rank { background:#334155; color:#cbd5e1; }
      .kc-popular-thumb { width:64px; height:40px; display:block; object-fit:cover; border-radius:9px; background:#e2e8f0; }
      .kc-popular-copy { min-width:0; }
      .kc-popular-game-title { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:.78rem; font-weight:900; color:#1e293b; }
      body.dark-mode .kc-popular-game-title { color:#f8fafc; }
      .kc-popular-game-sub { display:block; margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:.65rem; font-weight:700; color:#94a3b8; }
      .kc-popular-count { white-space:nowrap; font-size:.73rem; font-weight:950; color:#f97316; }
      .kc-popular-empty { padding:14px 8px; text-align:center; font-size:.73rem; font-weight:750; color:#94a3b8; }

      @media (min-width:941px) {
        #kc-popular-hub.kc-popular-sidebar { margin:0; padding:12px; border:1px solid rgba(148,163,184,.22); border-radius:18px; background:rgba(255,255,255,.82); box-shadow:0 8px 22px rgba(15,23,42,.055); }
        body.dark-mode #kc-popular-hub.kc-popular-sidebar { background:rgba(30,41,59,.82); border-color:rgba(148,163,184,.18); }
        .kc-popular-sidebar .kc-popular-head { display:block; margin:0 0 8px; }
        .kc-popular-sidebar .kc-popular-title { font-size:.92rem; }
        .kc-popular-sidebar .kc-popular-note { display:block; margin-top:3px; font-size:.60rem; line-height:1.35; }
        .kc-popular-sidebar .kc-popular-tabs { display:flex; }
        .kc-popular-sidebar .kc-popular-grid { grid-template-columns:1fr; gap:0; }
        .kc-popular-sidebar .kc-popular-panel { display:none; padding:0; border:0; border-radius:0; background:transparent; box-shadow:none; }
        .kc-popular-sidebar .kc-popular-panel.active { display:block; }
        .kc-popular-sidebar .kc-popular-panel-title { display:none; }
        .kc-popular-sidebar .kc-popular-list { gap:3px; }
        .kc-popular-sidebar .kc-popular-item { grid-template-columns:26px 44px minmax(0,1fr) auto; gap:6px; padding:5px 3px; border-radius:10px; }
        .kc-popular-sidebar .kc-popular-rank { width:26px; height:26px; border-radius:8px; font-size:.66rem; }
        .kc-popular-sidebar .kc-popular-thumb { width:44px; height:30px; border-radius:7px; }
        .kc-popular-sidebar .kc-popular-game-title { font-size:.71rem; }
        .kc-popular-sidebar .kc-popular-game-sub { font-size:.58rem; }
        .kc-popular-sidebar .kc-popular-count { font-size:.66rem; }
        #kc-live-stats.kc-stats-sidebar { margin:0; padding:10px 12px; flex-direction:column; align-items:flex-start; gap:4px; border-radius:16px; font-size:.68rem; }
      }

      @media (max-width:780px) {
        .kc-popular-grid { grid-template-columns:1fr; }
        .kc-popular-item { grid-template-columns:28px 58px minmax(0,1fr) auto; gap:7px; }
        .kc-popular-thumb { width:58px; height:37px; }
        .kc-popular-note { display:none; }
      }
    `;
    document.head.appendChild(style);
  }

  function formatCount(value) {
    return new Intl.NumberFormat('ko-KR').format(Math.max(0, Number(value || 0)));
  }

  function getCatalogGame(id) {
    const gameId = String(id || '');
    if (!gameId) return null;
    return window.KidscadeGames?.get?.(gameId) ||
      window.KidscadeCatalog?.games?.find?.(game => String(game?.id || '') === gameId) || null;
  }



  function launchGame(gameId) {
    return window.KidscadePlay?.open(gameId);
  }

  function desktopSidebarEnabled() {
    return window.matchMedia?.('(min-width: 941px)')?.matches ?? window.innerWidth > 940;
  }

  function positionPopularHub(hub) {
    if (!hub) return null;
    const sidebar = document.querySelector('.kc-myspace-inner');
    const avatar = sidebar?.querySelector('.kc-side-card.avatar-shell');
    if (desktopSidebarEnabled() && sidebar && avatar) {
      hub.classList.add('kc-popular-sidebar');
      const activity = sidebar.querySelector('#kc-activity-strip.kc-activity-sidebar');
      const anchor = activity || avatar;
      if (anchor.nextElementSibling !== hub) anchor.insertAdjacentElement('afterend', hub);
      return hub;
    }

    hub.classList.remove('kc-popular-sidebar');
    const quickZone = document.querySelector('.kc-quick-zone');
    if (quickZone?.parentNode) {
      if (quickZone.nextElementSibling !== hub) quickZone.insertAdjacentElement('afterend', hub);
      return hub;
    }

    const list = document.getElementById('game-list');
    const siteStats = document.getElementById('kc-live-stats');
    if (list?.parentNode && !hub.isConnected) list.parentNode.insertBefore(hub, siteStats || list);
    return hub;
  }

  function positionSiteStats(element) {
    if (!element) return null;
    const sidebar = document.querySelector('.kc-myspace-inner');
    const hub = document.getElementById('kc-popular-hub');
    const avatar = sidebar?.querySelector('.kc-side-card.avatar-shell');
    if (desktopSidebarEnabled() && sidebar && avatar) {
      element.classList.add('kc-stats-sidebar');
      const anchor = hub?.parentNode === sidebar ? hub : avatar;
      if (anchor.nextElementSibling !== element) anchor.insertAdjacentElement('afterend', element);
      return element;
    }

    element.classList.remove('kc-stats-sidebar');
    const list = document.getElementById('game-list');
    if (list?.parentNode && list.previousElementSibling !== element) list.parentNode.insertBefore(element, list);
    return element;
  }

  function syncStatsPlacement() {
    positionPopularHub(document.getElementById('kc-popular-hub'));
    positionSiteStats(document.getElementById('kc-live-stats'));
  }

  function ensureSiteStats() {
    let element = document.getElementById('kc-live-stats');
    if (!element) {
      const list = document.getElementById('game-list');
      if (!list?.parentNode) return null;
      element = document.createElement('div');
      element.id = 'kc-live-stats';
      element.setAttribute('aria-live', 'polite');
      list.parentNode.insertBefore(element, list);
    }
    return positionSiteStats(element);
  }

  function setPopularTab(hub, metric) {
    const activeMetric = metric === 'allTime' ? 'allTime' : 'weekly';
    hub.dataset.activePopular = activeMetric;
    hub.querySelectorAll('[data-popular-tab]').forEach(button => {
      const active = button.dataset.popularTab === activeMetric;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
    });
    hub.querySelectorAll('[data-popular-panel]').forEach(panel => {
      panel.classList.toggle('active', panel.dataset.popularPanel === activeMetric);
    });
  }

  function ensurePopularHub() {
    let hub = document.getElementById('kc-popular-hub');
    if (!hub) {
      hub = document.createElement('section');
      hub.id = 'kc-popular-hub';
      hub.innerHTML = `
        <div class="kc-popular-head">
          <div>
            <h2 class="kc-popular-title">🔥 인기 게임</h2>
            <span class="kc-popular-note">30초 이상 플레이 기록 기준</span>
          </div>
          <div class="kc-popular-tabs" role="tablist" aria-label="인기 게임 기간">
            <button class="kc-popular-tab active" type="button" role="tab" data-popular-tab="weekly" aria-selected="true">이번 주</button>
            <button class="kc-popular-tab" type="button" role="tab" data-popular-tab="allTime" aria-selected="false" tabindex="-1">누적</button>
          </div>
        </div>
        <div class="kc-popular-grid">
          <section class="kc-popular-panel active" data-popular-panel="weekly" aria-labelledby="kc-weekly-popular-title">
            <h3 class="kc-popular-panel-title" id="kc-weekly-popular-title"><span>이번 주 인기 TOP 5</span><span>7일 랭킹</span></h3>
            <div class="kc-popular-list" data-popular-list="weekly"></div>
          </section>
          <section class="kc-popular-panel" data-popular-panel="allTime" aria-labelledby="kc-alltime-popular-title">
            <h3 class="kc-popular-panel-title" id="kc-alltime-popular-title"><span>누적 인기 TOP 5</span><span>전체 랭킹</span></h3>
            <div class="kc-popular-list" data-popular-list="allTime"></div>
          </section>
        </div>
      `;
    }

    if (!hub.dataset.tabsBound) {
      hub.dataset.tabsBound = '1';
      hub.querySelectorAll('[data-popular-tab]').forEach(button => {
        button.addEventListener('click', () => setPopularTab(hub, button.dataset.popularTab));
      });
      setPopularTab(hub, hub.dataset.activePopular || 'weekly');
    }

    return positionPopularHub(hub);
  }

  function renderSiteStats(stats) {
    const element = ensureSiteStats();
    if (!element || !stats?.site) return;
    element.innerHTML = `<span class="kc-stats-label">📊 KIDSCADE 이용 현황</span><span>이번 주 방문자 <strong>${formatCount(stats.site.weeklyVisitors)}명</strong></span><span>누적 방문자 <strong>${formatCount(stats.site.totalVisitors)}명</strong></span>`;
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

  function availableGameStats(stats) {
    const filtered = {};
    for (const [gameId, value] of Object.entries(stats?.games || {})) {
      const game = getCatalogGame(gameId);
      if (!game || game.disabled) continue;
      filtered[gameId] = value;
    }
    return filtered;
  }

  function fallbackRankGames(games, metric, limit = 5) {
    const allTime = metric === 'allTime';
    return Object.entries(games || {})
      .map(([gameId, value]) => ({ gameId, weeklyPlays: Number(value?.weeklyPlays || 0), totalPlays: Number(value?.totalPlays || 0) }))
      .filter(entry => (allTime ? entry.totalPlays : entry.weeklyPlays) > 0)
      .sort((a, b) => {
        const first = (allTime ? b.totalPlays - a.totalPlays : b.weeklyPlays - a.weeklyPlays);
        if (first) return first;
        return allTime ? b.weeklyPlays - a.weeklyPlays : b.totalPlays - a.totalPlays;
      })
      .slice(0, limit)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  }

  function buildPopularLists(games) {
    return window.KidscadeStatsRankings?.buildPopularLists?.(games, 5) || {
      weekly: fallbackRankGames(games, 'weekly', 5),
      allTime: fallbackRankGames(games, 'allTime', 5)
    };
  }

  function createPopularItem(entry, metric) {
    const game = getCatalogGame(entry.gameId);
    if (!game) return null;

    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'kc-popular-item';
    const plays = metric === 'allTime' ? entry.totalPlays : entry.weeklyPlays;
    item.setAttribute('aria-label', `${entry.rank}위 ${game.title}, ${formatCount(plays)}회 플레이, 게임 열기`);

    const rank = document.createElement('span');
    rank.className = 'kc-popular-rank';
    rank.dataset.rank = String(entry.rank);
    rank.textContent = entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : String(entry.rank);

    const thumb = document.createElement('img');
    thumb.className = 'kc-popular-thumb';
    thumb.alt = '';
    thumb.loading = 'lazy';
    thumb.decoding = 'async';
    thumb.src = game.cover || 'kidscade placeholder.png';
    thumb.onerror = () => {
      if (!thumb.dataset.fallback) {
        thumb.dataset.fallback = '1';
        thumb.src = 'kidscade placeholder.png';
      }
    };

    const copy = document.createElement('span');
    copy.className = 'kc-popular-copy';
    const title = document.createElement('span');
    title.className = 'kc-popular-game-title';
    title.textContent = game.title || '게임';
    const sub = document.createElement('span');
    sub.className = 'kc-popular-game-sub';
    sub.textContent = metric === 'allTime' ? `이번 주 ${formatCount(entry.weeklyPlays)}회` : `누적 ${formatCount(entry.totalPlays)}회`;
    copy.append(title, sub);

    const count = document.createElement('span');
    count.className = 'kc-popular-count';
    count.textContent = `${formatCount(plays)}회`;

    item.append(rank, thumb, copy, count);
    item.addEventListener('click', () => launchGame(entry.gameId));
    return item;
  }

  function renderPopularList(list, entries, metric) {
    if (!list) return;
    list.replaceChildren();
    if (!entries.length) {
      const empty = document.createElement('div');
      empty.className = 'kc-popular-empty';
      empty.textContent = metric === 'allTime' ? '아직 누적 플레이 기록을 모으는 중이에요.' : '이번 주 플레이 기록을 모으는 중이에요.';
      list.appendChild(empty);
      return;
    }
    entries.forEach(entry => {
      const item = createPopularItem(entry, metric);
      if (item) list.appendChild(item);
    });
  }

  function renderPopularRankings(stats) {
    const hub = ensurePopularHub();
    if (!hub) return;
    const rankings = buildPopularLists(availableGameStats(stats));
    renderPopularList(hub.querySelector('[data-popular-list="weekly"]'), rankings.weekly, 'weekly');
    renderPopularList(hub.querySelector('[data-popular-list="allTime"]'), rankings.allTime, 'allTime');
  }

  function render(stats) {
    if (!stats?.ok) return;
    currentStats = stats;
    renderSiteStats(stats);
    renderPopularRankings(stats);
    renderGameStats(stats);
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
          currentStats.site = { ...currentStats.site, ...result.site };
          currentStats.weekKey = result.weekKey || currentStats.weekKey;
          saveCache(currentStats);
          render(currentStats);
        }
      }
      return result;
    } catch (_) { return null; }
  }

  async function loadStats(force = false) {
    const cached = readCache();
    if (cached) render(cached.data);
    if (!force && cached && Date.now() - Number(cached.fetchedAt || 0) < CACHE_TTL_MS) return cached.data;
    try {
      const response = await fetch(API_ROOT, { credentials: 'same-origin' });
      if (!response.ok) return cached?.data || null;
      const data = await response.json();
      if (data?.ok) { saveCache(data); render(data); }
      return data;
    } catch (_) { return cached?.data || null; }
  }

  async function recordPlay(gameId, seconds) {
    const id = String(gameId || '');
    const duration = Math.floor(Number(seconds || 0));
    if (!/^[a-z0-9_-]{1,80}$/i.test(id) || duration < 30) return null;
    try {
      const result = await requestJson(`${API_ROOT}/play`, { method: 'POST', keepalive: true, body: JSON.stringify({ gameId: id, seconds: duration }) });
      if (result?.ok && result.game) {
        const base = currentStats?.ok ? currentStats : (readCache()?.data || { ok: true, weekKey: result.weekKey, site: { weeklyVisitors: 0, totalVisitors: 0 }, games: {}, popular: [] });
        base.games = { ...(base.games || {}), [id]: result.game };
        base.weekKey = result.weekKey || base.weekKey;
        currentStats = base;
        saveCache(base);
        renderPopularRankings(base);
        renderGameStats(base);
      }
      return result;
    } catch (_) { return null; }
  }

  async function boot() {
    if (booted || !document.getElementById('game-list') || !window.KidscadeCatalog) return false;
    booted = true;
    installStyles();

    // Mount the desktop popular-games panel immediately. Network/cache stats can
    // fill it a moment later, but the layout itself must never disappear.
    const popularHub = ensurePopularHub();
    if (popularHub && !popularHub.querySelector('.kc-popular-item')) {
      const emptyStats = { games: {} };
      const rankings = buildPopularLists(availableGameStats(emptyStats));
      renderPopularList(popularHub.querySelector('[data-popular-list="weekly"]'), rankings.weekly, 'weekly');
      renderPopularList(popularHub.querySelector('[data-popular-list="allTime"]'), rankings.allTime, 'allTime');
    }

    const cached = readCache();
    if (cached) render(cached.data);
    await recordWeeklyVisit();
    await loadStats(false);
    document.addEventListener('kidscade:dashboard-rendered', () => {
      syncStatsPlacement();
      if (currentStats?.ok) renderPopularRankings(currentStats);
    });
    window.addEventListener('resize', syncStatsPlacement, { passive: true });
    syncStatsPlacement();
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

  window.KidscadeServerStats = Object.freeze({ load: loadStats, recordPlay, recordVisit: recordWeeklyVisit, render, get current() { return currentStats; } });
  waitForApp();
})();

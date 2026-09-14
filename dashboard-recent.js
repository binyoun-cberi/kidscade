(() => {
  'use strict';

  const META_KEY = 'kidscade_recent_meta_v4';
  const MIGRATION_KEY = 'kidscade_recent_migration_v4';
  const RECENTS_KEY = 'kidscade_recents';
  let syncQueued = false;

  function readMeta() {
    try {
      const value = JSON.parse(localStorage.getItem(META_KEY) || '{}');
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch (_) {
      return {};
    }
  }

  function writeMeta(meta) {
    try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch (_) {}
  }

  function migrateOnce() {
    try {
      if (localStorage.getItem(MIGRATION_KEY) === '1') return;
      localStorage.setItem(MIGRATION_KEY, '1');
      localStorage.setItem(RECENTS_KEY, '[]');
      localStorage.setItem(META_KEY, '{}');
    } catch (_) {}
  }

  function rememberPlayedCard(card) {
    if (!card || card.classList.contains('disabled')) return;
    const id = card.dataset.id;
    if (!id) return;

    const meta = readMeta();
    meta[id] = Date.now();
    const trimmed = Object.entries(meta)
      .filter(([, timestamp]) => Number.isFinite(Number(timestamp)))
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, 12);
    writeMeta(Object.fromEntries(trimmed));
  }

  function findOriginCard(id) {
    if (!id) return null;
    return document.querySelector(`#game-list > .game-card[data-id="${CSS.escape(id)}"]`);
  }

  function createMiniCard(origin) {
    const mini = document.createElement('a');
    mini.className = 'game-card mini-card kc-dashboard-card';
    mini.href = origin.getAttribute('href') || '#';

    ['id', 'age', 'category', 'cover'].forEach(key => {
      const value = origin.dataset[key];
      if (value) mini.dataset[key] = value;
    });

    const icon = document.createElement('div');
    icon.className = 'game-icon';
    icon.textContent = origin.querySelector(':scope > .game-icon')?.textContent?.trim() || '🎮';

    const title = document.createElement('div');
    title.className = 'game-title';
    title.textContent = origin.querySelector('.game-title')?.textContent?.trim() || '게임';

    mini.append(icon, title);
    mini.setAttribute('aria-label', `${title.textContent} 다시 열기`);
    mini.addEventListener('click', event => {
      event.preventDefault();
      const currentOrigin = findOriginCard(mini.dataset.id);
      if (currentOrigin) currentOrigin.click();
      else if (mini.href && mini.href !== '#') window.location.href = mini.href;
    });

    window.KidscadeGameCovers?.apply?.(mini);
    return mini;
  }

  function replaceLegacyMiniCards(list) {
    if (!list) return;
    Array.from(list.children).forEach(card => {
      if (!(card instanceof HTMLElement)) return;
      if (card.classList.contains('kc-dashboard-card')) return;
      const origin = findOriginCard(card.dataset?.id);
      if (!origin) {
        card.remove();
        return;
      }
      card.replaceWith(createMiniCard(origin));
    });
  }

  function sanitizeRecents() {
    const list = document.getElementById('recent-list');
    if (!list) return;
    const allowed = new Set(Object.keys(readMeta()));

    Array.from(list.children).forEach(card => {
      const id = card.dataset?.id;
      if (!id || !allowed.has(id)) card.remove();
    });
    replaceLegacyMiniCards(list);

    try {
      const stored = JSON.parse(localStorage.getItem(RECENTS_KEY) || '[]');
      const clean = Array.isArray(stored) ? stored.filter(id => allowed.has(id)).slice(0, 4) : [];
      localStorage.setItem(RECENTS_KEY, JSON.stringify(clean));
    } catch (_) {
      try { localStorage.setItem(RECENTS_KEY, '[]'); } catch (_) {}
    }
  }

  function normalizeFavorites() {
    replaceLegacyMiniCards(document.getElementById('favorite-list'));
  }

  function normalizeQuickHub() {
    syncQueued = false;
    sanitizeRecents();
    normalizeFavorites();

    const zone = document.querySelector('.kc-quick-zone');
    if (!zone) return;

    const recentCount = document.getElementById('recent-list')?.children.length || 0;
    const favoriteCount = document.getElementById('favorite-list')?.children.length || 0;
    const recentTab = zone.querySelector('[data-quick-tab="recent"]');
    const favoriteTab = zone.querySelector('[data-quick-tab="favorite"]');
    const time = zone.querySelector('.kc-quick-hub-time');

    if (recentTab) {
      recentTab.textContent = '🕒 최근 플레이';
      recentTab.hidden = recentCount === 0;
      recentTab.disabled = recentCount === 0;
    }
    if (favoriteTab) {
      favoriteTab.textContent = '⭐ 즐겨찾기';
      favoriteTab.hidden = favoriteCount === 0;
      favoriteTab.disabled = favoriteCount === 0;
    }
    if (time) time.hidden = true;

    zone.classList.toggle('kc-quick-empty', recentCount + favoriteCount === 0);
  }

  function queueSync() {
    if (syncQueued) return;
    syncQueued = true;
    requestAnimationFrame(normalizeQuickHub);
  }

  function observeDashboards() {
    ['recent-list', 'favorite-list'].forEach(id => {
      const target = document.getElementById(id);
      if (!target || target.dataset.dashboardObserver === '1') return;
      target.dataset.dashboardObserver = '1';
      new MutationObserver(queueSync).observe(target, { childList: true });
    });
  }

  function addStyles() {
    if (document.getElementById('kidscade-dashboard-refactor-style')) return;
    const style = document.createElement('style');
    style.id = 'kidscade-dashboard-refactor-style';
    style.textContent = `
      .kc-quick-zone.kc-quick-empty { display:none !important; }
      .kc-quick-hub-time { display:none !important; }
      .kc-quick-tabs [hidden] { display:none !important; }
      .dashboard-container { align-items:stretch; }
      .dashboard-container .kc-dashboard-card {
        text-decoration:none;
        cursor:pointer;
      }
    `;
    document.head.appendChild(style);
  }

  function bindPlayTracking() {
    document.addEventListener('click', event => {
      const card = event.target.closest?.('#game-list > .game-card');
      if (!card) return;
      if (event.target.closest('.fav-star,.cert-btn')) return;
      rememberPlayedCard(card);
      queueSync();
    });
  }

  function boot() {
    migrateOnce();
    addStyles();
    bindPlayTracking();
    observeDashboards();
    queueSync();

    window.addEventListener('pageshow', queueSync);
    document.addEventListener('kidscade:catalog-ready', queueSync);
  }

  window.KidscadeDashboard = {
    refresh: queueSync,
    remember: card => {
      rememberPlayedCard(card);
      queueSync();
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();

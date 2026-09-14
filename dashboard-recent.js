(() => {
  'use strict';

  const FAVORITES_KEY = 'kidscade_favs';
  const RECENTS_KEY = 'kidscade_recents';
  const MAX_RECENTS = 4;
  let quickTab = 'recent';

  function readArray(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(value) ? value.filter(Boolean) : [];
    } catch (_) {
      return [];
    }
  }

  function writeArray(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
  }

  function currentAge() {
    return document.body.dataset.kidscadeAge || localStorage.getItem('kidscade_age') || '';
  }

  function getGame(id) {
    const gameId = String(id || '');
    if (!gameId) return null;
    if (window.KidscadeGames?.get) return window.KidscadeGames.get(gameId);
    const raw = window.KidscadeCatalog?.games?.find?.(game => String(game?.id || '') === gameId);
    return raw ? { ...raw } : null;
  }

  function findOriginCard(id) {
    return window.KidscadeGames?.getCard?.(id) ||
      document.querySelector(`#game-list > .game-card[data-id="${CSS.escape(String(id || ''))}"]`);
  }

  function launch(id, fallbackHref) {
    const origin = findOriginCard(id);
    if (origin) {
      origin.click();
      return;
    }
    if (fallbackHref && fallbackHref !== '#') window.location.href = fallbackHref;
  }

  function createMiniCard(game) {
    const mini = document.createElement('a');
    mini.className = 'game-card mini-card kc-dashboard-card';
    mini.href = game.href || '#';
    mini.dataset.id = game.id;
    mini.dataset.age = game.age || 'all';
    mini.dataset.category = game.category || 'all';
    if (game.cover) mini.dataset.cover = game.cover;

    const icon = document.createElement('div');
    icon.className = 'game-icon';
    icon.textContent = game.icon || '🎮';

    const title = document.createElement('div');
    title.className = 'game-title';
    title.textContent = game.title || '게임';

    mini.append(icon, title);
    mini.setAttribute('aria-label', `${title.textContent} 다시 열기`);
    mini.addEventListener('click', event => {
      event.preventDefault();
      launch(game.id, game.href);
    });

    window.KidscadeGameCovers?.apply?.(mini);
    return mini;
  }

  function sanitizeIds(ids, age, limit = Infinity) {
    const seen = new Set();
    const valid = [];
    for (const id of ids) {
      if (seen.has(id)) continue;
      const game = getGame(id);
      if (!game || game.disabled) continue;
      seen.add(id);
      if (!age || game.age === age) valid.push(id);
      if (valid.length >= limit) break;
    }
    return valid;
  }

  function favoriteIds() {
    return sanitizeIds(readArray(FAVORITES_KEY), '', Infinity);
  }

  function isFavorite(id) {
    return favoriteIds().includes(String(id || ''));
  }

  function emitFavoritesChanged(ids) {
    document.dispatchEvent(new CustomEvent('kidscade:favorites-changed', {
      detail: { ids: [...ids] }
    }));
  }

  function toggleFavorite(id) {
    const gameId = String(id || '');
    const game = getGame(gameId);
    if (!game || game.disabled) return false;

    const favorites = favoriteIds();
    const index = favorites.indexOf(gameId);
    if (index >= 0) favorites.splice(index, 1);
    else favorites.push(gameId);

    writeArray(FAVORITES_KEY, favorites);
    render();
    emitFavoritesChanged(favorites);
    return index < 0;
  }

  function renderList(list, ids) {
    if (!list) return 0;
    list.replaceChildren();
    ids.forEach(id => {
      const game = getGame(id);
      if (game) list.appendChild(createMiniCard(game));
    });
    return list.children.length;
  }

  function syncFavoriteStars(favoriteIdsToRender) {
    const favorites = new Set(favoriteIdsToRender);
    document.querySelectorAll('#game-list > .game-card').forEach(card => {
      const star = card.querySelector(':scope > .fav-star');
      if (!star) return;
      const active = favorites.has(card.dataset.id);
      star.textContent = active ? '★' : '☆';
      star.classList.toggle('active', active);
      star.setAttribute('aria-label', active ? '즐겨찾기 해제' : '즐겨찾기 추가');
      star.setAttribute('role', 'button');
      star.setAttribute('tabindex', '0');
    });
  }

  function ensureQuickHub() {
    const zone = document.querySelector('.kc-quick-zone');
    const recent = document.getElementById('recent-section');
    const favorite = document.getElementById('favorite-section');
    if (!zone || !recent || !favorite) return false;

    zone.classList.add('kc-quick-hub');

    let head = zone.querySelector(':scope > .kc-quick-hub-head');
    if (!head) {
      head = document.createElement('div');
      head.className = 'kc-quick-hub-head';
      head.innerHTML = `
        <div class="kc-quick-tabs" role="tablist" aria-label="빠른 게임 목록">
          <button class="kc-quick-tab active" type="button" data-quick-tab="recent" role="tab">🕒 최근 플레이</button>
          <button class="kc-quick-tab" type="button" data-quick-tab="favorite" role="tab">⭐ 즐겨찾기</button>
        </div>
      `;
      zone.insertBefore(head, zone.firstChild);
    }

    let panels = zone.querySelector(':scope > .kc-quick-panels');
    if (!panels) {
      panels = document.createElement('div');
      panels.className = 'kc-quick-panels';
      zone.appendChild(panels);
    }
    if (recent.parentElement !== panels) panels.appendChild(recent);
    if (favorite.parentElement !== panels) panels.appendChild(favorite);

    if (zone.dataset.dashboardTabsBound !== '1') {
      zone.dataset.dashboardTabsBound = '1';
      zone.addEventListener('click', event => {
        const button = event.target.closest('.kc-quick-tab');
        if (!button || button.disabled) return;
        quickTab = button.dataset.quickTab === 'favorite' ? 'favorite' : 'recent';
        syncQuickHub();
      });
    }
    return true;
  }

  function syncQuickHub(recentCount, favoriteCount) {
    const zone = document.querySelector('.kc-quick-zone.kc-quick-hub');
    const recent = document.getElementById('recent-section');
    const favorite = document.getElementById('favorite-section');
    const recentList = document.getElementById('recent-list');
    const favoriteList = document.getElementById('favorite-list');
    if (!zone || !recent || !favorite) return;

    const rc = Number.isFinite(recentCount) ? recentCount : (recentList?.children.length || 0);
    const fc = Number.isFinite(favoriteCount) ? favoriteCount : (favoriteList?.children.length || 0);
    const recentTab = zone.querySelector('[data-quick-tab="recent"]');
    const favoriteTab = zone.querySelector('[data-quick-tab="favorite"]');

    zone.classList.toggle('kc-quick-empty', rc + fc === 0);
    if (quickTab === 'recent' && rc === 0 && fc > 0) quickTab = 'favorite';
    if (quickTab === 'favorite' && fc === 0 && rc > 0) quickTab = 'recent';

    if (recentTab) {
      recentTab.textContent = '🕒 최근 플레이';
      recentTab.disabled = rc === 0;
      recentTab.hidden = rc === 0;
    }
    if (favoriteTab) {
      favoriteTab.textContent = '⭐ 즐겨찾기';
      favoriteTab.disabled = fc === 0;
      favoriteTab.hidden = fc === 0;
    }

    zone.querySelectorAll('.kc-quick-tab').forEach(button => {
      const active = button.dataset.quickTab === quickTab;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    recent.style.display = quickTab === 'recent' && rc > 0 ? 'block' : 'none';
    favorite.style.display = quickTab === 'favorite' && fc > 0 ? 'block' : 'none';
  }

  function render(options = {}) {
    ensureQuickHub();
    const age = options.age || currentAge();
    const allFavorites = favoriteIds();
    const allRecents = sanitizeIds(readArray(RECENTS_KEY), '', MAX_RECENTS);

    writeArray(FAVORITES_KEY, allFavorites);
    writeArray(RECENTS_KEY, allRecents);

    const favoritesForAge = sanitizeIds(allFavorites, age, Infinity);
    const recentsForAge = sanitizeIds(allRecents, age, MAX_RECENTS);

    const favoriteCount = renderList(document.getElementById('favorite-list'), favoritesForAge);
    const recentCount = renderList(document.getElementById('recent-list'), recentsForAge);

    const favoriteSection = document.getElementById('favorite-section');
    const recentSection = document.getElementById('recent-section');
    if (favoriteSection) favoriteSection.classList.toggle('hidden', favoriteCount === 0);
    if (recentSection) recentSection.classList.toggle('hidden', recentCount === 0);

    syncFavoriteStars(allFavorites);
    syncQuickHub(recentCount, favoriteCount);
    document.dispatchEvent(new CustomEvent('kidscade:dashboard-rendered'));
    return true;
  }

  function remember(id) {
    if (!id) return false;
    const game = getGame(id);
    if (!game || game.disabled) return false;
    const recents = readArray(RECENTS_KEY).filter(item => item !== id);
    recents.unshift(id);
    writeArray(RECENTS_KEY, recents.slice(0, MAX_RECENTS));
    render();
    return true;
  }

  function bindFavoriteActions() {
    const list = document.getElementById('game-list');
    if (!list || list.dataset.favoriteActionsBound === '1') return;
    list.dataset.favoriteActionsBound = '1';

    list.addEventListener('click', event => {
      const star = event.target.closest('.fav-star');
      if (!star || !list.contains(star)) return;
      event.preventDefault();
      event.stopPropagation();
      window.playUISound?.('click');
      const id = star.closest('.game-card')?.dataset?.id;
      if (id) toggleFavorite(id);
    });

    list.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const star = event.target.closest('.fav-star');
      if (!star || !list.contains(star)) return;
      event.preventDefault();
      event.stopPropagation();
      const id = star.closest('.game-card')?.dataset?.id;
      if (id) toggleFavorite(id);
    });
  }

  function addStyles() {
    if (document.getElementById('kidscade-dashboard-refactor-style')) return;
    const style = document.createElement('style');
    style.id = 'kidscade-dashboard-refactor-style';
    style.textContent = `
      .kc-quick-zone.kc-quick-hub {
        display:block !important;
        margin-bottom:18px;
        padding:0 !important;
        border-radius:20px;
        background:var(--kc-panel);
        border:1px solid var(--kc-line);
        box-shadow:var(--kc-shadow);
        overflow:hidden;
      }
      .kc-quick-zone.kc-quick-empty { display:none !important; }
      .kc-quick-hub-head {
        min-height:50px;
        padding:8px 10px 8px 12px;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
        border-bottom:1px solid var(--kc-line);
      }
      .kc-quick-tabs { display:flex; align-items:center; gap:6px; min-width:0; }
      .kc-quick-tab {
        min-height:34px;
        padding:0 12px;
        border:1px solid transparent;
        border-radius:999px;
        background:transparent;
        color:var(--kc-muted);
        font-size:.76rem;
        font-weight:950;
        cursor:pointer;
      }
      .kc-quick-tab.active { background:#f1edff; border-color:rgba(139,92,246,.18); color:#6d4fd7; }
      .kc-quick-tab:disabled { opacity:.42; cursor:default; }
      .kc-quick-tabs [hidden] { display:none !important; }
      body.dark-mode .kc-quick-tab.active { background:#342b55; color:#d6caff; border-color:#55477a; }
      .kc-quick-hub .dashboard-section {
        margin:0 !important;
        padding:10px 12px 12px !important;
        border:0 !important;
        border-radius:0 !important;
        background:transparent !important;
        box-shadow:none !important;
      }
      .kc-quick-hub .dashboard-title { display:none !important; }
      .kc-quick-hub .dashboard-container { padding:0 !important; gap:8px !important; align-items:stretch; }
      .kc-quick-hub .mini-card {
        min-width:150px !important;
        min-height:116px !important;
        padding:12px !important;
        border-width:1px !important;
        border-radius:15px !important;
        box-shadow:none !important;
      }
      .kc-quick-hub .mini-card .game-icon { width:48px !important; height:48px !important; font-size:2rem !important; margin-bottom:5px !important; }
      .kc-quick-hub .mini-card .game-title { margin:0 !important; font-size:.78rem !important; }
      .kc-quick-hub .mini-card .play-limit-badge,
      .kc-quick-hub .mini-card .kc-card-meta { display:none !important; }
      .dashboard-container .kc-dashboard-card { text-decoration:none; cursor:pointer; }
      @media (max-width:620px) {
        .kc-quick-hub-head { align-items:stretch; padding:8px; }
        .kc-quick-tabs { width:100%; }
        .kc-quick-tab { flex:1; }
        .kc-quick-hub .mini-card { min-width:132px !important; }
      }
    `;
    document.head.appendChild(style);
  }

  function boot() {
    addStyles();
    ensureQuickHub();
    bindFavoriteActions();
    render();
    window.addEventListener('pageshow', () => render());
    window.addEventListener('storage', event => {
      if ([FAVORITES_KEY, RECENTS_KEY].includes(event.key)) render();
    });
    document.addEventListener('kidscade:registry-ready', () => render());
  }

  window.KidscadeDashboard = Object.freeze({
    render,
    refresh: render,
    remember,
    favorites: favoriteIds,
    isFavorite,
    toggleFavorite
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();

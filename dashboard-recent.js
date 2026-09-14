(() => {
  'use strict';

  const FAVORITES_KEY = 'kidscade_favs';
  const RECENTS_KEY = 'kidscade_recents';
  const MAX_RECENTS = 4;

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
    if (window.KidscadeGames?.get) return window.KidscadeGames.get(id);
    const card = document.querySelector(`#game-list > .game-card[data-id="${CSS.escape(String(id || ''))}"]`);
    if (!card) return null;
    return {
      id,
      title: card.querySelector('.game-title')?.textContent?.trim() || '게임',
      href: card.getAttribute('href') || '#',
      age: card.dataset.age || 'all',
      category: card.dataset.category || 'all',
      icon: card.querySelector(':scope > .game-icon')?.textContent?.trim() || '🎮',
      cover: card.dataset.cover || '',
      disabled: card.classList.contains('disabled')
    };
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

  function renderList(list, ids) {
    if (!list) return 0;
    list.replaceChildren();
    ids.forEach(id => {
      const game = getGame(id);
      if (game) list.appendChild(createMiniCard(game));
    });
    return list.children.length;
  }

  function syncFavoriteStars(favoriteIds) {
    const favorites = new Set(favoriteIds);
    document.querySelectorAll('#game-list > .game-card').forEach(card => {
      const star = card.querySelector(':scope > .fav-star');
      if (!star) return;
      const active = favorites.has(card.dataset.id);
      star.textContent = active ? '★' : '☆';
      star.classList.toggle('active', active);
    });
  }

  function normalizeQuickHub(recentCount, favoriteCount) {
    const zone = document.querySelector('.kc-quick-zone');
    if (!zone) return;

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

  function render(options = {}) {
    const age = options.age || currentAge();
    const allFavorites = sanitizeIds(readArray(FAVORITES_KEY), '', Infinity);
    const allRecents = sanitizeIds(readArray(RECENTS_KEY), '', MAX_RECENTS);

    // 저장값 자체도 중복/삭제 게임을 제거해 둔다.
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
    normalizeQuickHub(recentCount, favoriteCount);

    // ui-clarity-overhaul의 기존 quick hub 동기화가 같은 tick에 실행되어도
    // 최종 표시는 이 모듈의 단순한 라벨을 사용한다.
    setTimeout(() => normalizeQuickHub(recentCount, favoriteCount), 0);
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

  function addStyles() {
    if (document.getElementById('kidscade-dashboard-refactor-style')) return;
    const style = document.createElement('style');
    style.id = 'kidscade-dashboard-refactor-style';
    style.textContent = `
      .kc-quick-zone.kc-quick-empty { display:none !important; }
      .kc-quick-hub-time { display:none !important; }
      .kc-quick-tabs [hidden] { display:none !important; }
      .dashboard-container { align-items:stretch; }
      .dashboard-container .kc-dashboard-card { text-decoration:none; cursor:pointer; }
    `;
    document.head.appendChild(style);
  }

  function boot() {
    addStyles();
    render();
    window.addEventListener('pageshow', () => render());
    window.addEventListener('storage', event => {
      if ([FAVORITES_KEY, RECENTS_KEY].includes(event.key)) render();
    });
    document.addEventListener('kidscade:registry-ready', () => render());
    document.querySelector('.kc-quick-zone')?.addEventListener('click', () => setTimeout(() => render(), 0));
  }

  window.KidscadeDashboard = { render, refresh: render, remember };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();

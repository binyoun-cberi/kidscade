(() => {
  'use strict';

  const FAVORITES_KEY = 'kidscade_favs';
  const RECENTS_KEY = 'kidscade_recents';
  const MAX_RECENTS = 12;
  let booted = false;

  function readArray(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(value) ? value.map(id => String(id || '')).filter(Boolean) : [];
    } catch (_) {
      return [];
    }
  }

  function writeArray(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
  }

  function getGame(id) {
    const gameId = String(id || '');
    if (!gameId) return null;
    return window.KidscadeGames?.get?.(gameId) ||
      window.KidscadeCatalog?.games?.find?.(game => String(game?.id || '') === gameId) ||
      null;
  }

  function sanitizeIds(ids, limit = Infinity) {
    const seen = new Set();
    const valid = [];
    for (const rawId of ids || []) {
      const id = String(rawId || '');
      if (!id || seen.has(id)) continue;
      const game = getGame(id);
      if (!game || game.disabled || game.qualityStatus === 'rework') continue;
      seen.add(id);
      valid.push(id);
      if (valid.length >= limit) break;
    }
    return valid;
  }

  function favoriteIds() {
    return sanitizeIds(readArray(FAVORITES_KEY));
  }

  function recentIds() {
    return sanitizeIds(readArray(RECENTS_KEY), MAX_RECENTS);
  }

  function isFavorite(id) {
    return favoriteIds().includes(String(id || ''));
  }

  function isRecent(id) {
    return recentIds().includes(String(id || ''));
  }

  function emit(name, ids) {
    document.dispatchEvent(new CustomEvent(name, { detail: { ids: [...ids] } }));
  }

  function syncFavoriteStars(ids = favoriteIds()) {
    const favorites = new Set(ids);
    document.querySelectorAll('#game-list > .game-card').forEach(card => {
      const star = card.querySelector(':scope > .fav-star');
      if (!star) return;
      const active = favorites.has(String(card.dataset.id || ''));
      star.textContent = active ? '★' : '☆';
      star.classList.toggle('active', active);
      star.setAttribute('aria-label', active ? '즐겨찾기 해제' : '즐겨찾기 추가');
      star.setAttribute('role', 'button');
      star.setAttribute('tabindex', '0');
    });
  }

  function render() {
    const favorites = favoriteIds();
    const recents = recentIds();
    writeArray(FAVORITES_KEY, favorites);
    writeArray(RECENTS_KEY, recents);
    syncFavoriteStars(favorites);
    document.dispatchEvent(new CustomEvent('kidscade:dashboard-rendered', {
      detail: { favorites: [...favorites], recents: [...recents] }
    }));
    return true;
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
    syncFavoriteStars(favorites);
    emit('kidscade:favorites-changed', favorites);
    return index < 0;
  }

  function remember(id) {
    const gameId = String(id || '');
    const game = getGame(gameId);
    if (!game || game.disabled) return false;
    const recents = readArray(RECENTS_KEY).filter(item => String(item) !== gameId);
    recents.unshift(gameId);
    const next = sanitizeIds(recents, MAX_RECENTS);
    writeArray(RECENTS_KEY, next);
    emit('kidscade:recents-changed', next);
    return true;
  }

  function bindFavoriteActions() {
    const list = document.getElementById('game-list');
    if (!list || list.dataset.favoriteActionsBound === '1') return;
    list.dataset.favoriteActionsBound = '1';

    const handle = event => {
      const star = event.target.closest?.('.fav-star');
      if (!star || !list.contains(star)) return false;
      event.preventDefault();
      event.stopPropagation();
      const id = star.closest('.game-card')?.dataset?.id;
      if (id) toggleFavorite(id);
      return true;
    };

    list.addEventListener('click', handle, true);
    list.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      handle(event);
    }, true);
  }

  function boot() {
    if (booted) return;
    booted = true;
    bindFavoriteActions();
    render();
    window.addEventListener('pageshow', render);
    window.addEventListener('storage', event => {
      if ([FAVORITES_KEY, RECENTS_KEY].includes(event.key)) render();
    });
    document.addEventListener('kidscade:registry-ready', () => {
      bindFavoriteActions();
      render();
    });
  }

  window.KidscadeDashboard = Object.freeze({
    render,
    refresh: render,
    remember,
    favorites: favoriteIds,
    recents: recentIds,
    isFavorite,
    isRecent,
    toggleFavorite
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();

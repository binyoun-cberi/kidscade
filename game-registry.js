(() => {
  'use strict';

  let registry = new Map();

  const cleanText = value => String(value || '').replace(/\s+/g, ' ').trim();

  function catalogGames() {
    const catalog = window.KidscadeCatalog || {};
    return Array.isArray(catalog.games)
      ? catalog.games
      : Array.isArray(catalog.managedCards)
        ? catalog.managedCards
        : [];
  }

  function readCard(card) {
    const id = card?.dataset?.id;
    if (!id) return null;

    const iconNode = card.querySelector(':scope > .game-icon');
    const icon = iconNode && !iconNode.querySelector('svg') ? cleanText(iconNode.textContent) : '';

    return {
      id,
      title: cleanText(card.querySelector('.game-title')?.textContent),
      href: card.getAttribute('href') || '',
      category: card.dataset.category || 'all',
      age: card.dataset.age || 'all',
      icon,
      cover: card.dataset.cover || '',
      description: cleanText(card.querySelector('.game-desc')?.textContent),
      scoreKey: card.dataset.scorekey || '',
      rankKey: card.dataset.rankkey || '',
      scoreUnit: card.dataset.scoreunit || '',
      isTime: card.dataset.istime === 'true',
      disabled: card.classList.contains('disabled'),
      source: 'legacy-dom'
    };
  }

  function normalizeCatalogGame(game) {
    if (!game?.id) return null;
    return {
      id: String(game.id),
      title: cleanText(game.title),
      href: String(game.href || ''),
      category: String(game.category || 'all'),
      age: String(game.age || 'all'),
      icon: String(game.icon || ''),
      cover: String(game.cover || ''),
      description: cleanText(game.description),
      scoreKey: String(game.scoreKey || ''),
      rankKey: String(game.rankKey || ''),
      scoreUnit: String(game.scoreUnit || ''),
      isTime: Boolean(game.isTime),
      disabled: Boolean(game.disabled),
      source: 'catalog'
    };
  }

  function mergeGame(base, override) {
    if (!base) return override;
    if (!override) return base;
    const merged = { ...base };
    Object.entries(override).forEach(([key, value]) => {
      if (value !== '' && value !== undefined && value !== null) merged[key] = value;
    });
    merged.source = override.source === 'catalog' ? 'catalog+legacy' : (base.source || override.source);
    return merged;
  }

  function rebuild() {
    const next = new Map();

    document.querySelectorAll('#game-list > .game-card').forEach(card => {
      const game = readCard(card);
      if (game) next.set(game.id, game);
    });

    catalogGames().forEach(raw => {
      const game = normalizeCatalogGame(raw);
      if (!game) return;
      next.set(game.id, mergeGame(next.get(game.id), game));
    });

    registry = next;
    document.dispatchEvent(new CustomEvent('kidscade:registry-ready', {
      detail: { count: registry.size }
    }));
    return all();
  }

  function all() {
    return Array.from(registry.values()).map(game => ({ ...game }));
  }

  function get(id) {
    const game = registry.get(String(id || ''));
    return game ? { ...game } : null;
  }

  function query({ age, category, playableOnly = false } = {}) {
    return all().filter(game => {
      if (age && age !== 'all' && game.age !== age) return false;
      if (category && category !== 'all' && game.category !== category) return false;
      if (playableOnly && game.disabled) return false;
      return true;
    });
  }

  function getCard(id) {
    const safeId = String(id || '');
    if (!safeId) return null;
    return document.querySelector(`#game-list > .game-card[data-id="${CSS.escape(safeId)}"]`);
  }

  window.KidscadeGames = {
    all,
    get,
    query,
    getCard,
    refresh: rebuild
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', rebuild, { once: true });
  } else {
    rebuild();
  }
})();

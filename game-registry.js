(() => {
  'use strict';

  let registry = new Map();

  const cleanText = value => String(value || '').replace(/\s+/g, ' ').trim();

  function catalogGames() {
    const catalog = window.KidscadeCatalog || {};
    return Array.isArray(catalog.games) ? catalog.games : [];
  }

  function normalizeAges(game) {
    const primary = String(game?.age || 'all');
    const raw = Array.isArray(game?.ages) ? game.ages : [primary];
    const ages = [...new Set(raw.map(value => String(value || '').trim()).filter(Boolean))];
    if (!ages.includes(primary)) ages.unshift(primary);
    return ages.length ? ages : ['all'];
  }

  function supportsAge(game, age) {
    if (!age || age === 'all') return true;
    return Array.isArray(game?.ages) ? game.ages.includes(age) : game?.age === age;
  }

  function normalizeCatalogGame(game) {
    if (!game?.id) return null;
    const ages = normalizeAges(game);
    return {
      id: String(game.id),
      title: cleanText(game.title),
      href: String(game.href || ''),
      category: String(game.category || 'all'),
      age: String(game.age || ages[0] || 'all'),
      ages,
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

  function rebuild() {
    const next = new Map();

    catalogGames().forEach(raw => {
      const game = normalizeCatalogGame(raw);
      if (!game) return;
      if (next.has(game.id)) {
        console.error(`[Kidscade] duplicate catalog game id: ${game.id}`);
        return;
      }
      next.set(game.id, game);
    });

    registry = next;
    document.dispatchEvent(new CustomEvent('kidscade:registry-ready', {
      detail: { count: registry.size }
    }));
    return all();
  }

  function all() {
    return Array.from(registry.values()).map(game => ({ ...game, ages: [...game.ages] }));
  }

  function get(id) {
    const game = registry.get(String(id || ''));
    return game ? { ...game, ages: [...game.ages] } : null;
  }

  function query({ age, category, playableOnly = false } = {}) {
    return all().filter(game => {
      if (!supportsAge(game, age)) return false;
      if (category && category !== 'all' && game.category !== category) return false;
      if (playableOnly && game.disabled) return false;
      return true;
    });
  }

  // DOM은 이제 데이터 원본이 아니라 렌더링된 카드 뷰를 찾는 용도로만 사용한다.
  function getCard(id) {
    const safeId = String(id || '');
    if (!safeId) return null;
    return document.querySelector(`#game-list > .game-card[data-id="${CSS.escape(safeId)}"]`);
  }

  window.KidscadeGames = Object.freeze({
    all,
    get,
    query,
    getCard,
    supportsAge,
    refresh: rebuild
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', rebuild, { once: true });
  } else {
    rebuild();
  }
})();

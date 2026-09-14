((factory) => {
  const root = typeof window !== 'undefined' ? window : null;
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.KidscadeRecommendations = Object.freeze(api);
})(root => {
  'use strict';

  const cleanIds = value => Array.isArray(value) ? value.map(item => String(item || '')).filter(Boolean) : [];

  function readStoredIds(key) {
    if (!root?.localStorage) return [];
    try {
      return cleanIds(JSON.parse(root.localStorage.getItem(key) || '[]'));
    } catch (_) {
      return [];
    }
  }

  function dashboardIds(methodName, fallbackKey) {
    try {
      const method = root?.KidscadeDashboard?.[methodName];
      const ids = typeof method === 'function' ? method() : null;
      return Array.isArray(ids) ? cleanIds(ids) : readStoredIds(fallbackKey);
    } catch (_) {
      return readStoredIds(fallbackKey);
    }
  }

  function scoreGame(game, options = {}) {
    if (!game?.id) return null;

    const answers = options.answers || {};
    const favoriteIds = new Set(cleanIds(options.favoriteIds));
    const recentIds = new Set(cleanIds(options.recentIds));
    const dominantCategory = options.dominantCategory || null;
    const playState = options.playState || { plays: 0 };
    const random = typeof options.random === 'function' ? options.random : Math.random;

    const gameId = String(game.id);
    const category = String(game.category || 'all');
    let score = 0;

    if (answers.category && answers.category !== 'any' && category === answers.category) score += 12;
    if (answers.category === 'any' && dominantCategory?.value > 0 && category === dominantCategory.key) score += 6;

    if (answers.style === 'favorite' && favoriteIds.has(gameId)) score += 10;
    if (answers.style === 'fresh' && !recentIds.has(gameId)) score += 5;
    if (answers.style === 'fresh' && recentIds.has(gameId)) score -= 4;
    if (answers.style === 'challenge' && (game.scoreKey || game.rankKey)) score += 4;
    if (answers.style === 'short' && String(game.description || '').length < 60) score += 2;

    if ((Number(playState.plays) || 0) <= 0) score -= 20;
    score += random() * 2;
    return score;
  }

  function scoreCurrent(game, options = {}) {
    return scoreGame(game, {
      ...options,
      favoriteIds: options.favoriteIds || dashboardIds('favorites', 'kidscade_favs'),
      recentIds: options.recentIds || dashboardIds('recents', 'kidscade_recents')
    });
  }

  return Object.freeze({ scoreGame, scoreCurrent });
});

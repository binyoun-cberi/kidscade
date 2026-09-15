((factory) => {
  const root = typeof window !== 'undefined' ? window : null;
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.KidscadeStatsRankings = Object.freeze(api);
})(() => {
  'use strict';

  function normalizeEntry(gameId, value) {
    return {
      gameId: String(gameId || ''),
      weeklyPlays: Math.max(0, Number(value?.weeklyPlays || 0)),
      totalPlays: Math.max(0, Number(value?.totalPlays || 0))
    };
  }

  function rankGames(games, metric = 'weekly', limit = 5) {
    const safeLimit = Math.max(1, Math.floor(Number(limit || 5)));
    const entries = Object.entries(games || {})
      .map(([gameId, value]) => normalizeEntry(gameId, value))
      .filter(entry => entry.gameId);

    const isAllTime = metric === 'allTime';
    entries.sort((a, b) => {
      const primaryA = isAllTime ? a.totalPlays : a.weeklyPlays;
      const primaryB = isAllTime ? b.totalPlays : b.weeklyPlays;
      if (primaryA !== primaryB) return primaryB - primaryA;
      const secondaryA = isAllTime ? a.weeklyPlays : a.totalPlays;
      const secondaryB = isAllTime ? b.weeklyPlays : b.totalPlays;
      if (secondaryA !== secondaryB) return secondaryB - secondaryA;
      return a.gameId.localeCompare(b.gameId);
    });

    return entries
      .filter(entry => (isAllTime ? entry.totalPlays : entry.weeklyPlays) > 0)
      .slice(0, safeLimit)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  }

  function buildPopularLists(games, limit = 5) {
    return {
      weekly: rankGames(games, 'weekly', limit),
      allTime: rankGames(games, 'allTime', limit)
    };
  }

  return Object.freeze({ normalizeEntry, rankGames, buildPopularLists });
});

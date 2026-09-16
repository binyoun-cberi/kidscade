(() => {
  'use strict';
  const nativeFetch = window.fetch.bind(window);
  const COVER_OVERRIDES_URL = 'data/game-cover-overrides.json?v=20260916-covers-1';
  async function applyCoverOverrides(catalog) {
    try {
      const response = await nativeFetch(COVER_OVERRIDES_URL, { cache: 'no-cache' });
      if (!response.ok) return;
      const overrides = await response.json();
      const byId = new Map(catalog.games.map(game => [game?.id, game]));

      Object.entries(overrides || {}).forEach(([gameId, cover]) => {
        const game = byId.get(gameId);
        // Production builds already replace PNG covers with optimized WebP files.
        // Only fill missing covers so the optimized build output is never overwritten.
        if (game && !game.cover && cover) game.cover = cover;
      });
    } catch (error) {
      console.warn('[Kidscade] cover override loading skipped:', error);
    }
  }

  window.KidscadeCatalogCovers = { apply: applyCoverOverrides };
})();

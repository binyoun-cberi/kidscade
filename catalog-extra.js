(() => {
  'use strict';

  const EXTRA_GAMES = [
    {
      id: 'high_omok_arena',
      title: '오목 아레나',
      href: 'games/omok-arena/index.html?v=20260916-2',
      category: 'math',
      age: 'high',
      icon: '⚫',
      cover: 'assets/gate-image/오목 아레나.png',
      description: '친구와 같은 화면에서 1:1 대국하거나 3단계 AI와 겨루는 오목 게임! 강한 착수 타격감과 승리선·파티클·효과음으로 다섯 돌을 먼저 연결해 보세요.'
    }
  ];

  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (...args) => {
    const response = await nativeFetch(...args);

    try {
      const input = args[0];
      const rawUrl = typeof input === 'string' ? input : input?.url;
      if (!rawUrl) return response;

      const url = new URL(rawUrl, document.baseURI);
      if (!url.pathname.endsWith('/data/games.json')) return response;

      const catalog = await response.clone().json();
      if (!catalog || !Array.isArray(catalog.games)) return response;

      EXTRA_GAMES.forEach(game => {
        if (!catalog.games.some(item => item?.id === game.id)) catalog.games.push(game);
      });

      const headers = new Headers(response.headers);
      headers.set('content-type', 'application/json; charset=utf-8');

      return new Response(JSON.stringify(catalog), {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    } catch (error) {
      console.warn('[Kidscade] extra catalog injection skipped:', error);
      return response;
    }
  };
})();

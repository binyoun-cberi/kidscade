(() => {
  'use strict';

  // Games that are managed outside data/games.json for now.
  // The five migrated legacy games below used to remain as raw cards in index_base.html,
  // which made them behave like age/category="all". They now have explicit catalog metadata.
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
    },
    {
      id: 'high_starlight_pioneers',
      title: '별빛개척단',
      href: '별빛 개척단.html',
      category: 'math',
      age: 'high',
      icon: '🌟',
      description: '별자리와 별빛 발판을 살피며 점프 타이밍과 경로를 판단하는 우주 모험 게임.'
    },
    {
      id: 'tod_monkey_ssok',
      title: '몽키쏙쏙',
      href: '유아_덤블링몽키즈.html',
      category: 'math',
      age: 'toddler',
      icon: '🐒',
      description: '귀여운 원숭이 친구들과 놀며 관찰력과 빠른 판단을 기르는 유아용 놀이 게임.'
    },
    {
      id: 'tod_penguin_ice_tok',
      title: '펭귄 얼음톡톡',
      href: '펭귄_얼음_톡톡.html',
      category: 'math',
      age: 'toddler',
      icon: '🐧',
      description: '펭귄과 얼음판을 톡톡 누르며 색깔·수 세기·공간 관계를 익히는 유아용 퍼즐.'
    },
    {
      id: 'tod_color_layers',
      title: '색깔겹겹',
      href: '색깔_겹겹_컬러코드.html',
      category: 'math',
      age: 'toddler',
      icon: '🎨',
      description: '겹쳐진 색의 순서와 모양을 관찰해 같은 색깔 코드를 완성하는 유아용 관찰 퍼즐.'
    },
    {
      id: 'low_set_friends',
      title: '셋친구찾기',
      href: '셋_친구_찾기.html',
      category: 'math',
      age: 'low',
      icon: '🃏',
      description: '모양·색깔·개수의 규칙을 비교해 조건이 맞는 세 친구를 찾는 패턴 사고력 게임.'
    }
  ];

  // These five cards still exist in the legacy index_base template. Remove the raw copies
  // before main-bootstrap composes the page, otherwise they have no catalog metadata and
  // appear in every age/category filter.
  const MIGRATED_LEGACY_HREFS = new Set([
    '별빛 개척단.html',
    '유아_덤블링몽키즈.html',
    '펭귄_얼음_톡톡.html',
    '색깔_겹겹_컬러코드.html',
    '셋_친구_찾기.html'
  ]);

  const nativeFetch = window.fetch.bind(window);
  const COVER_OVERRIDES_URL = 'data/game-cover-overrides.json?v=20260916-covers-1';

  function normalizeLocalHref(value) {
    let clean = String(value || '').split('#')[0].split('?')[0].trim();
    try { clean = decodeURIComponent(clean); } catch (_) {}
    return clean.replace(/^\.\//, '').replace(/^\//, '');
  }

  function stripMigratedLegacyCards(html) {
    const cardPattern = /<a\b(?=[^>]*\bclass\s*=\s*["'][^"']*\bgame-card\b[^"']*["'])[^>]*>[\s\S]*?<\/a>/gi;
    return String(html || '').replace(cardPattern, cardHtml => {
      const hrefMatch = cardHtml.match(/\bhref\s*=\s*["']([^"']+)["']/i);
      const href = normalizeLocalHref(hrefMatch?.[1]);
      return MIGRATED_LEGACY_HREFS.has(href) ? '' : cardHtml;
    });
  }

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

  function makeResponse(response, body, contentType) {
    const headers = new Headers(response.headers);
    if (contentType) headers.set('content-type', contentType);
    // A transformed body no longer has the original encoded byte length.
    headers.delete('content-length');
    headers.delete('content-encoding');
    return new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }

  window.fetch = async (...args) => {
    const response = await nativeFetch(...args);

    try {
      const input = args[0];
      const rawUrl = typeof input === 'string' ? input : input?.url;
      if (!rawUrl) return response;

      const url = new URL(rawUrl, document.baseURI);

      if (url.pathname.endsWith('/index_base.html')) {
        const html = await response.clone().text();
        const cleaned = stripMigratedLegacyCards(html);
        return cleaned === html
          ? response
          : makeResponse(response, cleaned, 'text/html; charset=utf-8');
      }

      if (!url.pathname.endsWith('/data/games.json')) return response;

      const catalog = await response.clone().json();
      if (!catalog || !Array.isArray(catalog.games)) return response;

      EXTRA_GAMES.forEach(game => {
        if (!catalog.games.some(item => item?.id === game.id)) catalog.games.push(game);
      });

      await applyCoverOverrides(catalog);
      return makeResponse(response, JSON.stringify(catalog), 'application/json; charset=utf-8');
    } catch (error) {
      console.warn('[Kidscade] catalog/template migration skipped:', error);
      return response;
    }
  };
})();

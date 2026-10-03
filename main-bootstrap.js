(() => {
  'use strict';

  const BOOTSTRAP_SCRIPT = document.currentScript;

  function getRuntimeVersion() {
    try {
      const url = new URL(BOOTSTRAP_SCRIPT?.src || location.href, document.baseURI);
      return url.searchParams.get('v') || 'dev';
    } catch (_) {
      return 'dev';
    }
  }

  const RUNTIME_VERSION = getRuntimeVersion();
  const withVersion = path => {
    const separator = path.includes('?') ? '&' : '?';
    return `${path}${separator}v=${encodeURIComponent(RUNTIME_VERSION)}`;
  };
  const BASE_URL = withVersion('index_base.html');
  const CATALOG_URL = withVersion('data/games.json');

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));

  function getManagedGames(catalog) {
    return Array.isArray(catalog?.games) ? catalog.games : [];
  }

  function validateCatalog(catalog) {
    if (!catalog || typeof catalog !== 'object') throw new Error('게임 목록 형식이 올바르지 않습니다.');
    const seen = new Set();
    getManagedGames(catalog).forEach(game => {
      if (!game?.id || !game?.title || !game?.href) throw new Error('게임 목록에 필수 정보가 빠진 항목이 있습니다.');
      if (seen.has(game.id)) throw new Error(`중복 게임 ID가 있습니다: ${game.id}`);
      if (game.iconHtml && !isSafeSvgIcon(game.iconHtml)) throw new Error(`허용되지 않는 카드 아이콘 마크업입니다: ${game.id}`);
      seen.add(game.id);
    });
    return catalog;
  }

  function isSafeSvgIcon(value) {
    const icon = String(value || '').trim();
    if (!/^<svg\b/i.test(icon) || !/<\/svg>\s*$/i.test(icon)) return false;
    return !/<script\b|<iframe\b|<object\b|<embed\b|\bon\w+\s*=|javascript:/i.test(icon);
  }

  function renderIcon(game) {
    if (game.iconHtml && isSafeSvgIcon(game.iconHtml)) return String(game.iconHtml).trim();
    return escapeHtml(game.icon || '🎮');
  }

  function renderManagedCard(game) {
    const cover = game.cover ? ` data-cover="${escapeHtml(game.cover)}"` : '';
    const disabled = game.disabled ? ' disabled' : '';
    const ariaDisabled = game.disabled ? ' aria-disabled="true"' : '';
    const scoreKey = game.scoreKey ? ` data-scorekey="${escapeHtml(game.scoreKey)}"` : '';
    const rankKey = game.rankKey ? ` data-rankkey="${escapeHtml(game.rankKey)}"` : '';
    const scoreUnit = game.scoreUnit ? ` data-scoreunit="${escapeHtml(game.scoreUnit)}"` : '';
    const isTime = game.isTime ? ' data-istime="true"' : '';
    const subject = ` data-subject="${escapeHtml(game.subject || 'thinking')}"`;
    const genre = ` data-genre="${escapeHtml(game.genre || 'simulation')}"`;
    const difficulty = ` data-difficulty="${escapeHtml(game.difficulty || 'medium')}"`;
    const session = ` data-session="${escapeHtml(game.sessionMinutes || 10)}"`;
    const players = ` data-players="${escapeHtml((game.players || ['solo']).join(','))}"`;
    const quality = ` data-quality="${escapeHtml(game.qualityStatus || 'standard')}"`;
    const classroom = game.classroom ? ' data-classroom="true"' : '';
    return `\n<a href="${escapeHtml(game.href)}" class="game-card${disabled}" data-category="${escapeHtml(game.category || 'all')}" data-age="${escapeHtml(game.age || 'all')}" data-id="${escapeHtml(game.id)}"${subject}${genre}${difficulty}${session}${players}${quality}${classroom}${cover}${scoreKey}${rankKey}${scoreUnit}${isTime}${ariaDisabled}>\n  <span class="fav-star">☆</span>\n  <div class="game-icon">${renderIcon(game)}</div>\n  <div class="game-title">${escapeHtml(game.title)}</div>\n  <div class="game-desc">${escapeHtml(game.description || '')}</div>\n</a>\n`;
  }

  function replaceGameCardsFromCatalog(html, catalog) {
    const marker = '<div class="game-container" id="game-list">';
    const markerPos = html.indexOf(marker);
    if (markerPos < 0) throw new Error('게임 목록 영역을 찾지 못했습니다.');

    const contentStart = markerPos + marker.length;
    const scriptIndex = html.indexOf('<script', contentStart);
    const contentEnd = scriptIndex > contentStart ? scriptIndex : html.length;
    const scope = html.slice(contentStart, contentEnd);
    const cardPattern = /<a\b(?=[^>]*\bclass\s*=\s*["'][^"']*\bgame-card\b[^"']*["'])[^>]*>[\s\S]*?<\/a>/gi;
    const legacyCards = scope.match(cardPattern) || [];
    const remainingMarkup = scope.replace(cardPattern, '');
    const cards = getManagedGames(catalog).map(renderManagedCard).join('');

    if (!cards) throw new Error('게임 카탈로그가 비어 있습니다.');
    if (!legacyCards.length) console.warn('[Kidscade] 레거시 카드가 없는 템플릿을 사용 중입니다. 카탈로그 카드만 렌더링합니다.');

    return html.slice(0, contentStart) + cards + remainingMarkup + html.slice(contentEnd);
  }

  function applyCompatibilityFixes(html) {
    html = html.replace('data-genre="sandbox">샌드박스</button>\\n', 'data-genre="sandbox">샌드박스</button>\n');
    html = html.replace('href="main-shell.css"', 'href="' + withVersion('main-shell.css') + '"');
    html = html.replace('href="age-gate.css"', 'href="' + withVersion('age-gate.css') + '"');
    html = html.replace('src="touch-interaction-guard.js"', 'src="' + withVersion('touch-interaction-guard.js') + '"');
    html = html.replace('src="playtime-state.js"', 'src="' + withVersion('playtime-state.js') + '"');
    html = html.replace('src="seed-wallet.js"', 'src="' + withVersion('seed-wallet.js') + '"');
    html = html.replace('src="sprout-power.js"', 'src="' + withVersion('sprout-power.js') + '"');
    html = html.replace('src="daily-progress.js"', 'src="' + withVersion('daily-progress.js') + '"');
    html = html.replace('src="daily-ui.js"', 'src="' + withVersion('daily-ui.js') + '"');
    html = html.replace('src="achievement-state.js"', 'src="' + withVersion('achievement-state.js') + '"');
    html = html.replace('src="shop-state.js"', 'src="' + withVersion('shop-state.js') + '"');
    html = html.replace('src="theme-ui.js"', 'src="' + withVersion('theme-ui.js') + '"');
    html = html.replace('src="age-navigation.js"', 'src="' + withVersion('age-navigation.js') + '"');
    const gardenScript = '<scr' + 'ipt src="garden.js"></scr' + 'ipt>';
    const versionedGarden = '<scr' + 'ipt src="' + withVersion('garden.js') + '"></scr' + 'ipt>';
    html = html.replace(gardenScript, versionedGarden);
    html = html.replace('href="games/spelling_frog/스펠링 프로그.html"', 'href="games/spelling_frog/스펠링 프로그.html?v=20260922-1"');
    return html;
  }

  function serializeForInlineScript(value) {
    return JSON.stringify(value)
      .replace(/</g, '\\u003c')
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029');
  }

  function injectBootPayload(html, catalog) {
    // index.html is replaced with index_base.html, so preserve the deployment
    // build id in the final document for auto-update and diagnostics.
    if (!/<meta\\s+name=["']kidscade-build["']/i.test(html)) {
      html = html.replace('</head>', '<meta name="kidscade-build" content="' + escapeHtml(RUNTIME_VERSION) + '"></head>');
    }
    const payload = '<scr' + 'ipt>' +
      'window.KidscadeCatalog=' + serializeForInlineScript(catalog) + ';' +
      'window.KidscadeBoot={version:' + JSON.stringify(RUNTIME_VERSION) + ',catalogUrl:' + JSON.stringify(CATALOG_URL) + '};' +
      '</scr' + 'ipt>';
    return html.replace('</body>', payload + '</body>');
  }

  function injectRuntimeScripts(html) {
    const scripts = [
      // These modules used to execute in index.html before document.open()/write().
      // Load them only after the composed document exists so their listeners,
      // observers and timers belong to the final page.
      'auto-update.js',
      'kidscade-storage.js',
      'audio-manager.js',
      'profile-history.js',
      'stats-rankings.js',
      'server-stats.js',
      'ui-information-architecture.js',
      'ui-visual-polish.js',
      'account-client.js',
      'account-session-safety.js',
      'account-ui-runtime.js',
      'account-profile-gate.js',
      'seed-balance-sync.js',
      'score-display-normalizer.js',
      'ui-clarity-overhaul.js',
      'ui-topbar-compact.js',
      'seed-house-entry.js',
      'game-registry.js',
      'game-filter.js',
      'catalog-discovery.js',
      'game-cover-placeholders.js',
      'dashboard-recent.js',
      'game-recommendations.js',
      'activity-feed.js',
      'game-frame-shell.js',
      'game-launcher.js',
      'home-v2.js'
    ].map(src => '<scr' + 'ipt defer src="' + withVersion(src) + '"></scr' + 'ipt>').join('');
    const activityStyles = '<link rel="stylesheet" href="' + withVersion('activity-feed.css') + '">';
    return html.replace('</body>', activityStyles + scripts + '</body>');
  }

  function showLoadError(error) {
    console.error(error);
    const loader = document.getElementById('kidscade-loader');
    if (!loader) return;
    loader.innerHTML = '<div class="loader-card"><div class="loader-icon">⚠️</div><div class="loader-title">KIDSCADE를 불러오지 못했습니다.</div><div class="loader-note">' + escapeHtml(error.message) + '<br><a href="index_base.html">기존 화면 열기</a></div></div>';
  }

  async function boot() {
    try {
      const [baseRes, catalogRes] = await Promise.all([
        fetch(BASE_URL, { cache: 'no-store' }),
        fetch(CATALOG_URL, { cache: 'no-store' })
      ]);
      if (!baseRes.ok) throw new Error('기존 KIDSCADE 화면을 불러오지 못했습니다.');
      if (!catalogRes.ok) throw new Error('게임 목록 데이터를 불러오지 못했습니다.');

      const catalog = validateCatalog(await catalogRes.json());
      let html = await baseRes.text();
      html = replaceGameCardsFromCatalog(html, catalog);
      html = applyCompatibilityFixes(html);
      html = injectBootPayload(html, catalog);
      html = injectRuntimeScripts(html);

      document.open();
      document.write(html);
      document.close();
    } catch (error) {
      showLoadError(error);
    }
  }

  boot();
})();

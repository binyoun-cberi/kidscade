(() => {
  'use strict';

  const BASE_URL = 'index_base.html?refactor=20260914-3';
  const CATALOG_URL = 'data/games.json?v=2';
  const RUNTIME_VERSION = '20260914-refactor-3';

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));

  function getManagedGames(catalog) {
    return Array.isArray(catalog?.games)
      ? catalog.games
      : Array.isArray(catalog?.managedCards)
        ? catalog.managedCards
        : [];
  }

  function validateCatalog(catalog) {
    if (!catalog || typeof catalog !== 'object') throw new Error('게임 목록 형식이 올바르지 않습니다.');
    const seen = new Set();
    getManagedGames(catalog).forEach(game => {
      if (!game?.id || !game?.title || !game?.href) throw new Error('게임 목록에 필수 정보가 빠진 항목이 있습니다.');
      if (seen.has(game.id)) throw new Error(`중복 게임 ID가 있습니다: ${game.id}`);
      seen.add(game.id);
    });
    return catalog;
  }

  function renderManagedCard(game) {
    const cover = game.cover ? ` data-cover="${escapeHtml(game.cover)}"` : '';
    const disabled = game.disabled ? ' disabled' : '';
    const ariaDisabled = game.disabled ? ' aria-disabled="true"' : '';
    return `\n<a href="${escapeHtml(game.href)}" class="game-card${disabled}" data-category="${escapeHtml(game.category || 'all')}" data-age="${escapeHtml(game.age || 'all')}" data-id="${escapeHtml(game.id)}"${cover}${ariaDisabled}>\n  <span class="fav-star">☆</span>\n  <div class="game-icon">${escapeHtml(game.icon || '🎮')}</div>\n  <div class="game-title">${escapeHtml(game.title)}</div>\n  <div class="game-desc">${escapeHtml(game.description || '')}</div>\n</a>\n`;
  }

  function injectCatalogCards(html, catalog) {
    const marker = '<div class="game-container" id="game-list">';
    const markerPos = html.indexOf(marker);
    if (markerPos < 0) throw new Error('게임 목록 영역을 찾지 못했습니다.');

    const cards = getManagedGames(catalog)
      .filter(game => game && game.id && !html.includes(`data-id="${game.id}"`))
      .map(renderManagedCard)
      .join('');

    if (!cards) return html;
    const insertPos = markerPos + marker.length;
    return html.slice(0, insertPos) + cards + html.slice(insertPos);
  }

  function applyCompatibilityFixes(html) {
    const gardenScript = '<scr' + 'ipt src="garden.js"></scr' + 'ipt>';
    const gardenScriptV2 = '<scr' + 'ipt src="garden.js?v=avatar-preview-fix-v2"></scr' + 'ipt>';
    html = html.replace(gardenScript, gardenScriptV2);
    html = html.replace('href="스펠링 프로그.html"', 'href="스펠링 프로그-fixed.html?v=20260914-1"');
    return html;
  }

  function serializeForInlineScript(value) {
    return JSON.stringify(value)
      .replace(/</g, '\\u003c')
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029');
  }

  function injectBootPayload(html, catalog) {
    const payload = '<scr' + 'ipt>' +
      'window.KidscadeCatalog=' + serializeForInlineScript(catalog) + ';' +
      'window.KidscadeBoot={version:' + JSON.stringify(RUNTIME_VERSION) + ',catalogUrl:' + JSON.stringify(CATALOG_URL) + '};' +
      '</scr' + 'ipt>';
    return html.replace('</body>', payload + '</body>');
  }

  function injectRuntimeScripts(html) {
    const scripts = [
      ['score-display-normalizer.js', '20260914-1'],
      ['ui-clarity-overhaul.js', '20260914-1'],
      ['ui-topbar-compact.js', '20260914-1'],
      ['seed-house-entry.js', '20260914-2'],
      ['game-cover-placeholders.js', RUNTIME_VERSION],
      ['dashboard-recent.js', RUNTIME_VERSION]
    ].map(([src, v]) => '<scr' + 'ipt src="' + src + '?v=' + v + '"></scr' + 'ipt>').join('');
    return html.replace('</body>', scripts + '</body>');
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
      html = injectCatalogCards(html, catalog);
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

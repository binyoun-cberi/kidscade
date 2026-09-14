(() => {
  'use strict';

  const BASE_URL = 'index_base.html?refactor=20260914-2';
  const CATALOG_URL = 'data/games.json?v=1';

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));

  function renderManagedCard(game) {
    const cover = game.cover ? ` data-cover="${escapeHtml(game.cover)}"` : '';
    return `\n<a href="${escapeHtml(game.href)}" class="game-card" data-category="${escapeHtml(game.category)}" data-age="${escapeHtml(game.age)}" data-id="${escapeHtml(game.id)}"${cover}>\n  <span class="fav-star">☆</span>\n  <div class="game-icon">${escapeHtml(game.icon || '🎮')}</div>\n  <div class="game-title">${escapeHtml(game.title)}</div>\n  <div class="game-desc">${escapeHtml(game.description || '')}</div>\n</a>\n`;
  }

  function injectCatalogCards(html, catalog) {
    const marker = '<div class="game-container" id="game-list">';
    const markerPos = html.indexOf(marker);
    if (markerPos < 0) throw new Error('게임 목록 영역을 찾지 못했습니다.');

    const cards = (catalog.managedCards || [])
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

  function injectRuntimeScripts(html) {
    const scripts = [
      ['score-display-normalizer.js', '20260914-1'],
      ['ui-clarity-overhaul.js', '20260914-1'],
      ['ui-topbar-compact.js', '20260914-1'],
      ['seed-house-entry.js', '20260914-2'],
      ['game-cover-placeholders.js', '20260914-refactor-2'],
      ['dashboard-recent.js', '20260914-refactor-2']
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

      const catalog = await catalogRes.json();
      let html = await baseRes.text();
      html = injectCatalogCards(html, catalog);
      html = applyCompatibilityFixes(html);
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

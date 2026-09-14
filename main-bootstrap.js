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
    return `\n<a href="${escapeHtml(game.href)}" class="game-card${disabled}" data-category="${escapeHtml(game.category || 'all')}" data-age="${escapeHtml(game.age || 'all')}" data-id="${escapeHtml(game.id)}"${cover}${scoreKey}${rankKey}${scoreUnit}${isTime}${ariaDisabled}>\n  <span class="fav-star">☆</span>\n  <div class="game-icon">${renderIcon(game)}</div>\n  <div class="game-title">${escapeHtml(game.title)}</div>\n  <div class="game-desc">${escapeHtml(game.description || '')}</div>\n</a>\n`;
  }

  function replaceGameCardsFromCatalog(html, catalog) {
    const marker = '<div class="game-container" id="game-list">';
    const markerPos = html.indexOf(marker);
    if (markerPos < 0) throw new Error('게임 목록 영역을 찾지 못했습니다.');

    const contentStart = markerPos + marker.length;
    const scriptIndex = html.indexOf('<script', contentStart);
    const contentEnd = scriptIndex > contentStart ? scriptIndex : html.length;
    const scope = html.slice(contentStart, contentEnd);
    const cardPattern = /<a\b(?=[^>]*\bclass\s*=\s*["'][^"']*\bgame-card\b[^"']*["'])(?=[^>]*\bdata-id\s*=\s*["'][^"']+["'])[^>]*>[\s\S]*?<\/a>/gi;
    const legacyCards = scope.match(cardPattern) || [];
    const remainingMarkup = scope.replace(cardPattern, '');
    const cards = getManagedGames(catalog).map(renderManagedCard).join('');

    if (!cards) throw new Error('게임 카탈로그가 비어 있습니다.');
    if (!legacyCards.length) console.warn('[Kidscade] 레거시 카드가 없는 템플릿을 사용 중입니다. 카탈로그 카드만 렌더링합니다.');

    return html.slice(0, contentStart) + cards + remainingMarkup + html.slice(contentEnd);
  }

  function replaceBetween(html, startMarker, endMarker, replacement) {
    const start = html.indexOf(startMarker);
    if (start < 0) return html;
    const end = html.indexOf(endMarker, start + startMarker.length);
    if (end < 0) return html;
    return html.slice(0, start) + replacement + html.slice(end);
  }

  function refactorLegacyControllers(html) {
    const filterStart = '            function applyFilters() {';
    const filterEnd = '\n\n            function setAgeGroup(ageKey) {';
    const filterReplacement = `            function applyFilters() {
                const delegated = window.KidscadeFilter?.apply?.({
                    age: currentAgeGroup,
                    category: currentCategory,
                    keyword: searchKeyword,
                    ageNames,
                    categoryNames
                });
                if (delegated) {
                    renderDashboards();
                    updatePlayLimitUI();
                    return;
                }

                // 안전한 초기 로딩용 레거시 fallback. 런타임 모듈 로드 후에는 위임 경로만 사용합니다.
                let visibleCount = 0;
                let ageTotalCount = 0;
                const keyword = searchKeyword.trim().toLowerCase();
                gameCards.forEach(card => {
                    const matchAge = card.getAttribute('data-age') === currentAgeGroup;
                    const matchCat = currentCategory === 'all' || card.getAttribute('data-category') === currentCategory;
                    const searchText = \`${'${'}card.querySelector('.game-title')?.innerText || ''} ${'${'}card.querySelector('.game-desc')?.innerText || ''} ${'${'}categoryNames[card.getAttribute('data-category')] || ''}\`.toLowerCase();
                    const matchSearch = !keyword || searchText.includes(keyword);
                    if (matchAge) ageTotalCount++;
                    if (matchAge && matchCat && matchSearch) { card.classList.remove('hidden'); visibleCount++; }
                    else { card.classList.add('hidden'); }
                });
                if (visibleCount === 0) emptyMessage.classList.remove('hidden');
                else emptyMessage.classList.add('hidden');
                if (visibleGameCount) {
                    const ageLabel = ageNames[currentAgeGroup] || '선택한 모드';
                    visibleGameCount.textContent = \`${'${'}ageLabel} 게임 ${'${'}visibleCount}/${'${'}ageTotalCount}개 표시\`;
                }
                renderDashboards();
                updatePlayLimitUI();
            }`;
    html = replaceBetween(html, filterStart, filterEnd, filterReplacement);

    const dashboardStart = '            function renderDashboards() {';
    const dashboardEnd = '\n\n            function trackRecent(id) {';
    const dashboardReplacement = `            function renderDashboards() {
                if (window.KidscadeDashboard?.render?.({ age: currentAgeGroup })) {
                    updatePlayLimitUI();
                    return;
                }

                // 초기 로딩 fallback. dashboard-recent.js가 준비되면 더 이상 cloneNode를 사용하지 않습니다.
                const favList = document.getElementById('favorite-list'); const favSection = document.getElementById('favorite-section');
                favList.innerHTML = ''; let favCount = 0;
                favorites.forEach(id => {
                    const originCard = document.querySelector(\`#game-list .game-card[data-id="${'${'}id}"]\`);
                    if (originCard && originCard.getAttribute('data-age') === currentAgeGroup) {
                        const clone = originCard.cloneNode(true); clone.className += ' mini-card';
                        clone.addEventListener('click', function(e) { openGameModal(e, this); });
                        favList.appendChild(clone);
                        originCard.querySelector('.fav-star').innerText = '★'; originCard.querySelector('.fav-star').classList.add('active');
                        favCount++;
                    }
                });
                if (favCount > 0) favSection.classList.remove('hidden'); else favSection.classList.add('hidden');

                const recentList = document.getElementById('recent-list'); const recentSection = document.getElementById('recent-section');
                recentList.innerHTML = ''; let recentCount = 0;
                recents.forEach(id => {
                    const originCard = document.querySelector(\`#game-list .game-card[data-id="${'${'}id}"]\`);
                    if (originCard && originCard.getAttribute('data-age') === currentAgeGroup) {
                        const clone = originCard.cloneNode(true); clone.className += ' mini-card';
                        clone.addEventListener('click', function(e) { openGameModal(e, this); });
                        recentList.appendChild(clone); recentCount++;
                    }
                });
                if (recentCount > 0) recentSection.classList.remove('hidden'); else recentSection.classList.add('hidden');
                updatePlayLimitUI();
            }`;
    html = replaceBetween(html, dashboardStart, dashboardEnd, dashboardReplacement);

    const recentStart = '            function trackRecent(id) {';
    const recentEnd = '\n\n            // 즐겨찾기 클릭은 dashboard-recent.js가 이벤트 위임으로 전담합니다.';
    const recentReplacement = `            function trackRecent(id) {
                const card = document.querySelector(\`.game-card[data-id="${'${'}id}"]\`);
                if(card && card.classList.contains('disabled')) return;
                if (window.KidscadeDashboard?.remember?.(id)) {
                    recents = safeParseStorage('kidscade_recents', []);
                    return;
                }
                recents = recents.filter(rId => rId !== id); recents.unshift(id);
                if (recents.length > 4) recents.pop();
                localStorage.setItem('kidscade_recents', JSON.stringify(recents)); renderDashboards();
            }`;
    html = replaceBetween(html, recentStart, recentEnd, recentReplacement);

    return html;
  }

  function applyCompatibilityFixes(html) {
    const gardenScript = '<scr' + 'ipt src="garden.js"></scr' + 'ipt>';
    const versionedGarden = '<scr' + 'ipt src="' + withVersion('garden.js') + '"></scr' + 'ipt>';
    html = html.replace(gardenScript, versionedGarden);
    html = html.replace('href="스펠링 프로그.html"', 'href="스펠링 프로그-fixed.html?v=20260914-1"');
    html = refactorLegacyControllers(html);
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
      'score-display-normalizer.js',
      'ui-clarity-overhaul.js',
      'ui-topbar-compact.js',
      'seed-house-entry.js',
      'game-registry.js',
      'game-filter.js',
      'game-cover-placeholders.js',
      'dashboard-recent.js'
    ].map(src => '<scr' + 'ipt src="' + withVersion(src) + '"></scr' + 'ipt>').join('');
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

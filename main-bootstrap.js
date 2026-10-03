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

  function replaceBetween(html, startMarker, endMarker, replacement) {
    const start = html.indexOf(startMarker);
    if (start < 0) throw new Error('필수 화면 연결 지점을 찾지 못했습니다: ' + startMarker.trim());
    const end = html.indexOf(endMarker, start + startMarker.length);
    if (end < 0) throw new Error('필수 화면 연결 끝을 찾지 못했습니다: ' + endMarker.trim());
    return html.slice(0, start) + replacement + html.slice(end);
  }

  function refactorLegacyControllers(html) {
    const launcherStart = '            function openGameModal(e, cardElement) {';
    const launcherEnd = '\n\n            // =====================================\n            // 배지 동기화 및 랭크 보상';
    const launcherReplacement = `            const gameLauncherBridge = {
                canLaunch: (event) => window.KidscadeAgeNavigation?.canLaunch(event) === true,
                deferLaunch: true,
                isLaunchPending: () => window.KidscadeGameFrame?.isPending?.() === true,
                getGame: (id) => window.KidscadeGames?.get?.(id) || null,
                getCard: (id) => window.KidscadeGames?.getCard?.(id) || document.querySelector(\`#game-list .game-card[data-id="${'${'}CSS.escape(String(id || ''))}"]\`),
                playSound: (sound) => playUISound(sound),
                alert: (message) => window.alert(message),
                showToast: (message) => showToast(message),
                now: () => Date.now(),
                minRewardPlaySec: MIN_REWARD_PLAY_SEC,
                startSession: (session) => {
                    playStartTime = session.startedAt;
                    playCheckpointTime = session.startedAt;
                    activeGameId = session.id;
                    activeGameCategory = session.category || 'all';
                },
                getSession: () => ({
                    id: activeGameId,
                    category: activeGameCategory,
                    startedAt: playStartTime
                }),
                remember: (id) => {
                    if (window.KidscadeDashboard?.remember?.(id)) return true;
                    trackRecent(id);
                    return true;
                },
                updateModalTitle: (titleText) => {
                    document.getElementById('modal-title-text').innerText = titleText;
                },
                openModal: ({ game, href, titleText, onStart, startedTitle }) => {
                    const opened = window.KidscadeGameFrame?.open?.({
                        game,
                        href,
                        titleText,
                        onStart,
                        startedTitle
                    });
                    if (opened) return;
                    const session = onStart?.();
                    document.getElementById('modal-title-text').innerText = startedTitle?.(session) || titleText;
                    gameIframe.src = href;
                    gameModal.classList.remove('hidden');
                    document.body.style.overflow = 'hidden';
                },
                closeModal: () => {
                    window.KidscadeGameFrame?.reset?.();
                    gameModal.classList.add('hidden');
                    gameIframe.src = 'about:blank';
                    document.body.style.overflow = 'auto';
                },
                checkpointPlayTime: (at) => checkpointPlayTime(at),
                addCoins: (amount, reason) => addCoins(amount, reason),
                addSproutPower: (amount, reason) => window.KidscadeSproutPower?.earn?.(amount, reason),
                updateMission: (category, id) => updateMissionProgress(category, id),
                recordGardenSession: (payload) => {
                    const result = window.KidscadeSeedWorldMeta?.recordGameSession?.(payload);
                    if (result?.parcelCreated) showToast('📬 씨앗 월드에 ' + (result.parcel?.name || '게임 선물') + ' 도착!');
                    window.KidscadeWorld?.syncWorldEntryStatus?.();
                    return result;
                },
                resetSession: () => {
                    playStartTime = 0;
                    playCheckpointTime = 0;
                    activeGameId = null;
                    activeGameCategory = 'all';
                },
                syncBadges: () => syncBadgesAndProfile(),
                afterClose: (detail) => {
                    document.dispatchEvent(new CustomEvent('kidscade:game-closed', { detail: detail || {} }));
                }
            };

            window.KidscadePlay = Object.freeze({
                open(id, event) {
                    const card = gameLauncherBridge.getCard(id);
                    if (!card) return { handled: true, opened: false, reason: 'missing-card' };
                    return window.KidscadeGameLauncher.open(event, card, gameLauncherBridge);
                }
            });

            function openGameModal(e, cardElement) {
                return window.KidscadeGameLauncher.open(e, cardElement, gameLauncherBridge);
            }

            closeModalBtn.addEventListener('click', () => {
                window.KidscadeGameLauncher.close(gameLauncherBridge);
            });
            window.addEventListener('message', (event) => {
                if (event.origin !== location.origin || event.source !== gameIframe.contentWindow) return;
                if (event.data?.type === 'kidscade:close-game') {
                    window.KidscadeGameLauncher.close(gameLauncherBridge);
                    return;
                }
                if (event.data?.type === 'kidscade:game-event') {
                    document.dispatchEvent(new CustomEvent('kidscade:game-event', {
                        detail: event.data?.detail || {}
                    }));
                    return;
                }
                if (event.data?.type === 'kidscade:game-error' && event.data?.detail?.fatal !== false) {
                    window.KidscadeGameFrame?.showError?.({
                        code: event.data?.detail?.code || 'GAME_ERROR',
                        userMessage: event.data?.detail?.message ? '게임 오류: ' + event.data.detail.message : undefined
                    });
                }
            });`;
    html = replaceBetween(html, launcherStart, launcherEnd, launcherReplacement);

    return html;
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
    html = html.replace('src="age-navigation.js"', 'src="' + withVersion('age-navigation.js') + '"');
    const gardenScript = '<scr' + 'ipt src="garden.js"></scr' + 'ipt>';
    const versionedGarden = '<scr' + 'ipt src="' + withVersion('garden.js') + '"></scr' + 'ipt>';
    html = html.replace(gardenScript, versionedGarden);
    html = html.replace('href="games/spelling_frog/스펠링 프로그.html"', 'href="games/spelling_frog/스펠링 프로그.html?v=20260922-1"');
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

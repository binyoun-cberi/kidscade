(() => {
  'use strict';

  const DEFAULT_GAME_COVER = 'kidscade placeholder.png';
  const COVER_BY_ID = Object.freeze({
    high_classroom_war_3d: '교실전쟁3D.png',
    music_neon_rift: '네온 리프트.png',
    high_melody_workshop: '멜로디 공방.png',
    high_byeokrando_voyage: '벽란도 상행기.png',
    hanja_survivors_8: '한자수호전.png'
  });

  const STYLE_ID = 'kidscade-game-cover-styles';
  const RECENT_META_KEY = 'kidscade_recent_meta_v2';
  const RECENT_MIGRATION_KEY = 'kidscade_recent_history_v2_ready';
  const RECENTS_KEY = 'kidscade_recents';
  let quickHubSyncQueued = false;

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* Main game cards */
      #game-list > .game-card.kc-has-cover {
        padding-left: 12px !important;
        padding-right: 12px !important;
      }
      #game-list > .game-card.kc-has-cover .game-cover-shell {
        position: relative;
        width: 100%;
        aspect-ratio: 16 / 9;
        margin: 0 0 12px;
        border-radius: 16px;
        overflow: hidden;
        background: linear-gradient(135deg, #dbeafe, #f5f3ff);
        box-shadow: inset 0 0 0 1px rgba(148,163,184,.22);
        flex: 0 0 auto;
      }
      #game-list > .game-card.kc-has-cover .game-cover-image {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center;
        transition: transform .22s ease;
      }
      #game-list > .game-card.kc-has-cover:hover .game-cover-image {
        transform: scale(1.035);
      }
      #game-list > .game-card.kc-has-cover .game-cover-emoji {
        position: absolute;
        left: 8px;
        bottom: 8px;
        display: grid;
        place-items: center;
        min-width: 34px;
        height: 34px;
        padding: 0 6px;
        border-radius: 11px;
        background: rgba(255,255,255,.9);
        border: 1px solid rgba(255,255,255,.9);
        box-shadow: 0 4px 12px rgba(15,23,42,.16);
        font-size: 20px;
        line-height: 1;
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
        pointer-events: none;
      }
      body.dark-mode #game-list > .game-card.kc-has-cover .game-cover-emoji {
        background: rgba(30,41,59,.88);
        border-color: rgba(148,163,184,.28);
      }
      #game-list > .game-card.kc-has-cover > .game-icon {
        display: none !important;
      }
      #game-list > .game-card.kc-has-cover .game-title {
        margin-top: 0 !important;
      }

      /* Quick hub: cloned cards must keep a fixed thumbnail size.
         Without this, cloned cover images use their intrinsic image height and stretch the lobby. */
      .kc-quick-zone.kc-quick-hub {
        margin-bottom: 14px !important;
      }
      .kc-quick-zone.kc-quick-hub.kc-quick-empty {
        display: none !important;
      }
      .kc-quick-zone.kc-quick-hub .kc-quick-hub-head {
        min-height: 42px !important;
        padding: 7px 10px !important;
      }
      .kc-quick-zone.kc-quick-hub .kc-quick-hub-time {
        display: none !important;
      }
      .kc-quick-zone.kc-quick-hub .dashboard-section {
        padding: 9px 10px 10px !important;
      }
      .kc-quick-zone.kc-quick-hub .dashboard-container {
        display: flex !important;
        align-items: stretch !important;
        gap: 8px !important;
        overflow-x: auto !important;
        overflow-y: hidden !important;
        padding: 0 !important;
        scrollbar-width: thin;
      }
      .kc-quick-zone.kc-quick-hub .mini-card.kc-has-cover {
        width: 168px !important;
        min-width: 168px !important;
        max-width: 168px !important;
        min-height: 0 !important;
        height: auto !important;
        padding: 7px !important;
        border-width: 1px !important;
        border-radius: 14px !important;
        box-shadow: none !important;
        align-items: stretch !important;
        overflow: hidden !important;
      }
      .kc-quick-zone.kc-quick-hub .mini-card.kc-has-cover .game-cover-shell {
        position: relative !important;
        display: block !important;
        width: 100% !important;
        height: auto !important;
        aspect-ratio: 16 / 9 !important;
        margin: 0 0 7px !important;
        border-radius: 10px !important;
        overflow: hidden !important;
        flex: 0 0 auto !important;
        background: linear-gradient(135deg,#e0edff,#f4f0ff) !important;
      }
      .kc-quick-zone.kc-quick-hub .mini-card.kc-has-cover .game-cover-image {
        display: block !important;
        width: 100% !important;
        height: 100% !important;
        max-width: none !important;
        object-fit: cover !important;
        object-position: center !important;
      }
      .kc-quick-zone.kc-quick-hub .mini-card.kc-has-cover .game-cover-emoji,
      .kc-quick-zone.kc-quick-hub .mini-card.kc-has-cover > .game-icon,
      .kc-quick-zone.kc-quick-hub .mini-card .game-desc,
      .kc-quick-zone.kc-quick-hub .mini-card .fav-star,
      .kc-quick-zone.kc-quick-hub .mini-card .badge-container,
      .kc-quick-zone.kc-quick-hub .mini-card .kc-card-meta,
      .kc-quick-zone.kc-quick-hub .mini-card .play-limit-badge {
        display: none !important;
      }
      .kc-quick-zone.kc-quick-hub .mini-card .game-title {
        display: block !important;
        margin: 0 2px 2px !important;
        min-height: 1.25em !important;
        color: var(--text-color) !important;
        font-size: .74rem !important;
        font-weight: 900 !important;
        line-height: 1.25 !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        text-align: left !important;
      }
      .kc-quick-zone.kc-quick-hub .kc-quick-tab {
        min-height: 30px !important;
        padding: 0 10px !important;
        font-size: .70rem !important;
      }
      .kc-quick-zone.kc-quick-hub .kc-quick-tab[hidden] {
        display: none !important;
      }

      @media (max-width: 940px) {
        #game-list > .game-card.kc-has-cover {
          padding-left: 8px !important;
          padding-right: 8px !important;
        }
        #game-list > .game-card.kc-has-cover .game-cover-shell {
          border-radius: 13px;
          margin-bottom: 9px;
        }
        #game-list > .game-card.kc-has-cover .game-cover-emoji {
          left: 6px;
          bottom: 6px;
          min-width: 28px;
          height: 28px;
          border-radius: 9px;
          font-size: 16px;
        }
        .kc-quick-zone.kc-quick-hub .mini-card.kc-has-cover {
          width: 148px !important;
          min-width: 148px !important;
          max-width: 148px !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function getTitle(card) {
    return card.querySelector('.game-title')?.textContent?.trim() || 'Kidscade 게임';
  }

  function getEmoji(card) {
    const icon = card.querySelector(':scope > .game-icon');
    return icon ? icon.textContent.trim() : '';
  }

  function resolveCover(card) {
    const explicitCover = (card.dataset.cover || '').trim();
    if (explicitCover) return explicitCover;
    return COVER_BY_ID[card.dataset.id] || DEFAULT_GAME_COVER;
  }

  function applyCover(card) {
    if (!(card instanceof HTMLElement) || !card.matches('#game-list > .game-card')) return;

    const coverSrc = resolveCover(card);
    let shell = card.querySelector(':scope > .game-cover-shell');

    if (!shell) {
      shell = document.createElement('div');
      shell.className = 'game-cover-shell';

      const img = document.createElement('img');
      img.className = 'game-cover-image';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.alt = `${getTitle(card)} 대문 이미지`;
      img.addEventListener('error', () => {
        if (!img.dataset.fallbackApplied && img.getAttribute('src') !== DEFAULT_GAME_COVER) {
          img.dataset.fallbackApplied = '1';
          img.src = DEFAULT_GAME_COVER;
          return;
        }
        img.style.display = 'none';
      });
      shell.appendChild(img);

      const emoji = getEmoji(card);
      if (emoji) {
        const badge = document.createElement('span');
        badge.className = 'game-cover-emoji';
        badge.textContent = emoji;
        badge.setAttribute('aria-hidden', 'true');
        shell.appendChild(badge);
      }

      const firstContent = Array.from(card.children).find(el =>
        !el.classList.contains('fav-star') &&
        !el.classList.contains('category-chip') &&
        !el.classList.contains('badge-container')
      );
      if (firstContent) card.insertBefore(shell, firstContent);
      else card.appendChild(shell);
    }

    const img = shell.querySelector('.game-cover-image');
    if (img && img.getAttribute('src') !== coverSrc) {
      delete img.dataset.fallbackApplied;
      img.style.display = '';
      img.src = coverSrc;
      img.alt = `${getTitle(card)} 대문 이미지`;
    }

    card.classList.add('kc-has-cover');
  }

  function applyAll() {
    installStyles();
    document.querySelectorAll('#game-list > .game-card').forEach(applyCover);
  }

  function readRecentMeta() {
    try {
      const parsed = JSON.parse(localStorage.getItem(RECENT_META_KEY) || '{}');
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function writeRecentMeta(meta) {
    try {
      localStorage.setItem(RECENT_META_KEY, JSON.stringify(meta));
    } catch (_) {}
  }

  function migrateLegacyRecents() {
    try {
      if (localStorage.getItem(RECENT_MIGRATION_KEY) === '1') return;
      localStorage.setItem(RECENT_MIGRATION_KEY, '1');
      localStorage.setItem(RECENTS_KEY, '[]');
      localStorage.setItem(RECENT_META_KEY, '{}');
      document.getElementById('recent-list')?.replaceChildren();
    } catch (_) {}
  }

  function markRecentGame(card) {
    const id = card?.dataset?.id;
    if (!id || card.classList.contains('disabled')) return;

    const now = Date.now();
    const meta = readRecentMeta();
    meta[id] = now;

    const keep = Object.entries(meta)
      .filter(([, ts]) => Number.isFinite(Number(ts)))
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, 12);
    writeRecentMeta(Object.fromEntries(keep));
  }

  function sanitizeRecentList() {
    const list = document.getElementById('recent-list');
    if (!list) return;

    const meta = readRecentMeta();
    const allowed = new Set(Object.keys(meta));

    Array.from(list.children).forEach(card => {
      const id = card.dataset?.id;
      if (!id || !allowed.has(id)) card.remove();
    });

    try {
      const stored = JSON.parse(localStorage.getItem(RECENTS_KEY) || '[]');
      const clean = Array.isArray(stored)
        ? stored.filter(id => allowed.has(id)).slice(0, 4)
        : [];
      localStorage.setItem(RECENTS_KEY, JSON.stringify(clean));
    } catch (_) {
      try { localStorage.setItem(RECENTS_KEY, '[]'); } catch (_) {}
    }
  }

  function normalizeQuickHub() {
    quickHubSyncQueued = false;
    const zone = document.querySelector('.kc-quick-zone.kc-quick-hub');
    if (!zone) return;

    sanitizeRecentList();

    const recentList = document.getElementById('recent-list');
    const favoriteList = document.getElementById('favorite-list');
    const recentCount = recentList?.children.length || 0;
    const favoriteCount = favoriteList?.children.length || 0;
    const recentTab = zone.querySelector('[data-quick-tab="recent"]');
    const favoriteTab = zone.querySelector('[data-quick-tab="favorite"]');

    if (recentTab) {
      recentTab.textContent = '🕒 최근 플레이';
      recentTab.hidden = recentCount === 0;
      recentTab.disabled = recentCount === 0;
    }
    if (favoriteTab) {
      favoriteTab.textContent = '⭐ 즐겨찾기';
      favoriteTab.hidden = favoriteCount === 0;
      favoriteTab.disabled = favoriteCount === 0;
    }

    zone.classList.toggle('kc-quick-empty', recentCount + favoriteCount === 0);
  }

  function queueQuickHubSync() {
    if (quickHubSyncQueued) return;
    quickHubSyncQueued = true;
    requestAnimationFrame(normalizeQuickHub);
  }

  function observeGameList() {
    const list = document.getElementById('game-list');
    if (!list || list.dataset.coverObserver === '1') return;
    list.dataset.coverObserver = '1';

    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach(node => {
          if (!(node instanceof HTMLElement)) return;
          if (node.matches('.game-card')) applyCover(node);
          node.querySelectorAll?.('.game-card').forEach(applyCover);
        });
      }
    });
    observer.observe(list, { childList: true, subtree: true });
  }

  function observeQuickHub() {
    const zone = document.querySelector('.kc-quick-zone');
    if (!zone || zone.dataset.coverQuickObserver === '1') return;
    zone.dataset.coverQuickObserver = '1';
    const observer = new MutationObserver(queueQuickHubSync);
    observer.observe(zone, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    queueQuickHubSync();
  }

  function installRecentTracking() {
    if (document.documentElement.dataset.kcRecentTracking === '1') return;
    document.documentElement.dataset.kcRecentTracking = '1';

    document.addEventListener('click', event => {
      const target = event.target instanceof Element ? event.target : null;
      const card = target?.closest('.game-card[data-id]');
      if (!card) return;
      markRecentGame(card);
      queueQuickHubSync();
    }, true);
  }

  function boot() {
    installStyles();
    migrateLegacyRecents();
    applyAll();
    observeGameList();
    observeQuickHub();
    installRecentTracking();
    queueQuickHubSync();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  window.addEventListener('pageshow', () => {
    applyAll();
    queueQuickHubSync();
  });

  window.KidscadeGameCovers = {
    defaultCover: DEFAULT_GAME_COVER,
    covers: COVER_BY_ID,
    refresh: () => {
      applyAll();
      queueQuickHubSync();
    },
    apply: applyCover
  };
})();

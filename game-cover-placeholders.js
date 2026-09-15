(() => {
  'use strict';

  const DEFAULT_GAME_COVER = 'kidscade placeholder.png';
  const STYLE_ID = 'kidscade-game-cover-styles';
  let layoutRefreshQueued = false;

  function getCatalog() {
    return window.KidscadeCatalog && typeof window.KidscadeCatalog === 'object'
      ? window.KidscadeCatalog
      : { games: [] };
  }

  function getCatalogGame(id, catalog = getCatalog()) {
    if (!id) return null;
    return Array.isArray(catalog?.games)
      ? catalog.games.find(game => game?.id === id) || null
      : null;
  }

  function stabilizeLayout(reason = 'runtime') {
    if (layoutRefreshQueued) return;
    layoutRefreshQueued = true;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      layoutRefreshQueued = false;
      const list = document.getElementById('game-list');
      if (list) void list.offsetWidth;
      try { window.dispatchEvent(new Event('resize')); } catch (_) {}
      document.dispatchEvent(new CustomEvent('kidscade:layout-stabilized', { detail: { reason } }));
    }));
  }

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .game-card.kc-has-cover .game-cover-shell {
        position: relative;
        width: 100%;
        aspect-ratio: 16 / 9;
        flex: 0 0 auto;
        overflow: hidden;
        border-radius: 16px;
        background: linear-gradient(135deg,#dbeafe,#f5f3ff);
        box-shadow: inset 0 0 0 1px rgba(148,163,184,.22);
      }
      .game-card.kc-has-cover .game-cover-image {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center;
        transition: transform .22s ease;
      }
      .game-card.kc-has-cover:hover .game-cover-image { transform: scale(1.035); }
      .game-card.kc-has-cover .game-cover-emoji {
        position: absolute;
        left: 8px;
        bottom: 8px;
        display: grid;
        place-items: center;
        min-width: 34px;
        height: 34px;
        padding: 0 6px;
        border-radius: 11px;
        background: rgba(255,255,255,.90);
        border: 1px solid rgba(255,255,255,.9);
        box-shadow: 0 4px 12px rgba(15,23,42,.16);
        font-size: 20px;
        line-height: 1;
        pointer-events: none;
      }
      body.dark-mode .game-card.kc-has-cover .game-cover-emoji {
        background: rgba(30,41,59,.88);
        border-color: rgba(148,163,184,.28);
      }

      #game-list > .game-card.kc-has-cover {
        padding-left: 12px !important;
        padding-right: 12px !important;
      }
      #game-list > .game-card.kc-has-cover .game-cover-shell { margin: 0 0 12px; }
      #game-list > .game-card.kc-has-cover > .game-icon { display: none !important; }
      #game-list > .game-card.kc-has-cover .game-title { margin-top: 0 !important; }

      .dashboard-container .mini-card.kc-has-cover {
        width: 154px !important;
        min-width: 154px !important;
        max-width: 154px !important;
        min-height: 0 !important;
        padding: 7px !important;
        align-items: stretch !important;
        overflow: hidden;
      }
      .dashboard-container .mini-card.kc-has-cover .game-cover-shell {
        width: 100% !important;
        height: auto !important;
        min-height: 0 !important;
        margin: 0 0 7px !important;
        border-radius: 11px;
      }
      .dashboard-container .mini-card.kc-has-cover .game-cover-image {
        position: static !important;
        width: 100% !important;
        height: 100% !important;
      }
      .dashboard-container .mini-card.kc-has-cover > .game-icon,
      .dashboard-container .mini-card.kc-has-cover .game-cover-emoji,
      .dashboard-container .mini-card .game-desc,
      .dashboard-container .mini-card .fav-star,
      .dashboard-container .mini-card .badge-container,
      .dashboard-container .mini-card .cert-btn,
      .dashboard-container .mini-card .play-limit-badge,
      .dashboard-container .mini-card .kc-card-meta { display: none !important; }
      .dashboard-container .mini-card.kc-has-cover .game-title {
        margin: 0 2px 3px !important;
        font-size: .76rem !important;
        line-height: 1.25 !important;
        text-align: left;
      }

      @media (max-width: 940px) {
        #game-list > .game-card.kc-has-cover { padding-left: 8px !important; padding-right: 8px !important; }
        #game-list > .game-card.kc-has-cover .game-cover-shell { border-radius: 13px; margin-bottom: 9px; }
        .dashboard-container .mini-card.kc-has-cover {
          width: 142px !important;
          min-width: 142px !important;
          max-width: 142px !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function getTitle(card) {
    return card.querySelector('.game-title')?.textContent?.trim() || 'Kidscade 게임';
  }

  function getEmoji(card) {
    return card.querySelector(':scope > .game-icon')?.textContent?.trim() || '';
  }

  function getCoverSource(card, catalog = getCatalog()) {
    const explicit = (card.dataset.cover || '').trim();
    if (explicit) return explicit;

    const id = card.dataset.id || '';
    const registryCover = window.KidscadeGames?.get?.(id)?.cover;
    if (registryCover) return registryCover;

    const catalogCover = getCatalogGame(id, catalog)?.cover;
    return catalogCover || DEFAULT_GAME_COVER;
  }

  function createCoverShell(card) {
    const shell = document.createElement('div');
    shell.className = 'game-cover-shell';

    const img = document.createElement('img');
    img.className = 'game-cover-image';
    img.loading = 'lazy';
    img.decoding = 'async';
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
    return shell;
  }

  function setImageSource(img, src, title) {
    if (!img || img.getAttribute('src') === src) return;
    img.dataset.fallbackApplied = '';
    img.style.display = '';
    img.alt = `${title} 대문 이미지`;
    img.onload = () => stabilizeLayout('cover-loaded');
    img.onerror = () => {
      if (!img.dataset.fallbackApplied && img.getAttribute('src') !== DEFAULT_GAME_COVER) {
        img.dataset.fallbackApplied = '1';
        img.src = DEFAULT_GAME_COVER;
        return;
      }
      img.style.display = 'none';
      stabilizeLayout('cover-failed');
    };
    img.src = src;
  }

  function applyCover(card, catalog = getCatalog()) {
    if (!(card instanceof HTMLElement) || !card.classList.contains('game-card')) return;
    const shell = card.querySelector(':scope > .game-cover-shell') || createCoverShell(card);
    setImageSource(shell.querySelector('.game-cover-image'), getCoverSource(card, catalog), getTitle(card));
    card.classList.add('kc-has-cover');
  }

  function applyAll(root = document, catalog = getCatalog()) {
    if (root instanceof HTMLElement && root.classList.contains('game-card')) applyCover(root, catalog);
    root.querySelectorAll?.('.game-card').forEach(card => applyCover(card, catalog));
  }

  function observeGameList(catalog = getCatalog()) {
    const target = document.getElementById('game-list');
    if (!target || target.dataset.coverObserver === '1') return;
    target.dataset.coverObserver = '1';
    const observer = new MutationObserver(mutations => {
      let added = false;
      mutations.forEach(mutation => mutation.addedNodes.forEach(node => {
        if (node instanceof HTMLElement) {
          applyAll(node, catalog);
          added = true;
        }
      }));
      if (added) stabilizeLayout('game-list-mutated');
    });
    observer.observe(target, { childList: true, subtree: true });
  }

  function observeVisibilityTransitions() {
    const watched = [
      document.getElementById('main-app'),
      document.getElementById('shop-modal'),
      document.getElementById('game-modal'),
      document.getElementById('age-selection-screen')
    ].filter(Boolean);

    watched.forEach(element => {
      if (element.dataset.kcLayoutObserver === '1') return;
      element.dataset.kcLayoutObserver = '1';
      const observer = new MutationObserver(() => stabilizeLayout(`state:${element.id}`));
      observer.observe(element, { attributes: true, attributeFilter: ['class', 'style'] });
    });
  }

  function boot() {
    installStyles();
    const catalog = getCatalog();
    applyAll(document, catalog);
    observeGameList(catalog);
    observeVisibilityTransitions();
    stabilizeLayout('boot');

    if (document.fonts?.ready?.then) {
      document.fonts.ready.then(() => stabilizeLayout('fonts-ready')).catch(() => {});
    }
    window.addEventListener('pageshow', () => stabilizeLayout('pageshow'));
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) stabilizeLayout('visible');
    });

    document.dispatchEvent(new CustomEvent('kidscade:catalog-ready', { detail: catalog }));
  }

  window.KidscadeGameCovers = Object.freeze({
    refresh(root = document) {
      applyAll(root, getCatalog());
      stabilizeLayout('manual-refresh');
    },
    apply(card) {
      applyCover(card, getCatalog());
      stabilizeLayout('manual-apply');
    },
    stabilize: stabilizeLayout,
    catalog: getCatalog,
    defaultCover: DEFAULT_GAME_COVER
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();

(() => {
  'use strict';

  const DEFAULT_GAME_COVER = 'kidscade placeholder.png';
  const CATALOG_URL = 'data/games.json?v=1';
  const STYLE_ID = 'kidscade-game-cover-styles';
  let catalogPromise = null;

  function loadCatalog() {
    if (catalogPromise) return catalogPromise;
    catalogPromise = fetch(CATALOG_URL, { cache: 'no-store' })
      .then(res => {
        if (!res.ok) throw new Error(`game catalog ${res.status}`);
        return res.json();
      })
      .catch(err => {
        console.warn('[Kidscade] game catalog load failed:', err);
        return { managedCards: [], coverById: {} };
      });
    return catalogPromise;
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

  function getCoverSource(card, catalog) {
    const explicit = (card.dataset.cover || '').trim();
    if (explicit) return explicit;
    return catalog?.coverById?.[card.dataset.id] || DEFAULT_GAME_COVER;
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
    img.onerror = () => {
      if (!img.dataset.fallbackApplied && img.getAttribute('src') !== DEFAULT_GAME_COVER) {
        img.dataset.fallbackApplied = '1';
        img.src = DEFAULT_GAME_COVER;
        return;
      }
      img.style.display = 'none';
    };
    img.src = src;
  }

  function applyCover(card, catalog) {
    if (!(card instanceof HTMLElement) || !card.classList.contains('game-card')) return;
    const shell = card.querySelector(':scope > .game-cover-shell') || createCoverShell(card);
    setImageSource(shell.querySelector('.game-cover-image'), getCoverSource(card, catalog), getTitle(card));
    card.classList.add('kc-has-cover');
  }

  function applyAll(root, catalog) {
    const scope = root || document;
    if (scope instanceof HTMLElement && scope.classList.contains('game-card')) applyCover(scope, catalog);
    scope.querySelectorAll?.('.game-card').forEach(card => applyCover(card, catalog));
  }

  function observeContainers(catalog) {
    ['game-list', 'recent-list', 'favorite-list'].forEach(id => {
      const target = document.getElementById(id);
      if (!target || target.dataset.coverObserver === '1') return;
      target.dataset.coverObserver = '1';
      const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => mutation.addedNodes.forEach(node => {
          if (node instanceof HTMLElement) applyAll(node, catalog);
        }));
      });
      observer.observe(target, { childList: true, subtree: true });
    });
  }

  async function boot() {
    installStyles();
    const catalog = await loadCatalog();
    applyAll(document, catalog);
    observeContainers(catalog);
    document.dispatchEvent(new CustomEvent('kidscade:catalog-ready', { detail: catalog }));
  }

  window.KidscadeGameCovers = {
    refresh: async (root = document) => applyAll(root, await loadCatalog()),
    apply: async card => applyCover(card, await loadCatalog()),
    catalog: loadCatalog,
    defaultCover: DEFAULT_GAME_COVER
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();

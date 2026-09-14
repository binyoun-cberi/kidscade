(() => {
  'use strict';

  const DEFAULT_GAME_COVER = 'kidscade placeholder.png';
  const STYLE_ID = 'kidscade-game-cover-styles';

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
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
    return (card.dataset.cover || '').trim() || DEFAULT_GAME_COVER;
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

  function boot() {
    applyAll();
    observeGameList();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  window.KidscadeGameCovers = {
    defaultCover: DEFAULT_GAME_COVER,
    refresh: applyAll,
    apply: applyCover
  };
})();

(() => {
  'use strict';

  const STYLE_ID = 'kidscade-topbar-compact-style';

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* =========================================================
         Kidscade compact top area
         ========================================================= */
      #main-app > .kc-topbar {
        min-height: 0 !important;
        padding: 8px max(14px, calc((100vw - 1680px) / 2 + 24px)) 7px !important;
        grid-template-columns: auto minmax(180px, .7fr) minmax(260px, 660px) auto !important;
        grid-template-rows: 46px auto !important;
        column-gap: 14px !important;
        row-gap: 7px !important;
        align-items: center !important;
      }

      .kc-brand-wrap {
        gap: 9px !important;
        min-width: 155px;
      }
      .kc-brand-mark {
        width: 38px !important;
        height: 38px !important;
        border-radius: 12px !important;
        font-size: 1.15rem !important;
        box-shadow: 0 6px 14px rgba(124,92,255,.18), inset 0 1px 0 rgba(255,255,255,.22) !important;
      }
      .kc-brand strong {
        font-size: 1.08rem !important;
        letter-spacing: -.025em;
      }
      .kc-brand span { display: none !important; }

      .kc-top-title {
        min-width:0;
        color:var(--kc-ink);
        font-size:clamp(1rem,1.35vw,1.28rem);
        line-height:1.1;
        letter-spacing:-.035em;
        font-weight:1000;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
      }

      .kc-top-search-wrap {
        width: 100%;
        min-width: 0;
      }
      .kc-top-search {
        min-height: 42px !important;
        border-radius: 15px !important;
        box-shadow: none !important;
        border: 1px solid var(--kc-line) !important;
        background: color-mix(in srgb, var(--kc-panel) 94%, #f8fafc 6%) !important;
      }
      .kc-top-search:focus-within {
        border-color: rgba(124,92,255,.45) !important;
        box-shadow: 0 0 0 3px rgba(124,92,255,.10) !important;
      }
      .kc-top-search input {
        font-size: .88rem !important;
      }
      .kc-top-search .search-icon {
        font-size: 1rem !important;
      }
      .clear-search-btn {
        min-height: 30px !important;
        padding: 0 10px !important;
        border-radius: 10px !important;
        font-size: .68rem !important;
      }

      .kc-top-actions {
        flex-wrap: nowrap !important;
        gap: 6px !important;
      }
      .kc-top-actions .header-btn {
        min-height: 38px !important;
        height: 38px !important;
        padding: 0 12px !important;
        border-radius: 12px !important;
        box-shadow: none !important;
        font-size: .78rem !important;
        white-space: nowrap;
      }
      #theme-btn {
        width: 40px !important;
        padding: 0 !important;
        font-size: 0 !important;
        overflow: hidden;
      }
      #theme-btn::before {
        content: '🌙';
        font-size: 1rem;
      }
      body.dark-mode #theme-btn::before { content: '☀️'; }

      /* Category navigation becomes part of the sticky header. */
      .kc-top-category-row {
        grid-column: 1 / -1;
        min-width: 0;
        display: grid;
        grid-template-columns: minmax(0,1fr) auto;
        align-items: center;
        gap: 10px;
        padding-top: 6px;
        border-top: 1px solid var(--kc-line);
      }
      .kc-top-category-row .filter-nav {
        min-width: 0;
        margin: 0 !important;
        padding: 0 2px 1px !important;
        max-width: none !important;
        display: flex !important;
        justify-content: flex-start !important;
        flex-wrap: nowrap !important;
        gap: 6px !important;
        overflow-x: auto;
        overscroll-behavior-inline: contain;
        scrollbar-width: none;
      }
      .kc-top-category-row .filter-nav::-webkit-scrollbar { display: none; }
      .kc-top-category-row .filter-btn {
        flex: 0 0 auto;
        min-height: 32px !important;
        padding: 0 11px !important;
        border-width: 1px !important;
        border-radius: 999px !important;
        font-size: .70rem !important;
        box-shadow: none !important;
      }
      .kc-top-category-row .filter-btn:hover {
        transform: none !important;
      }
      .kc-top-category-status {
        flex: 0 0 auto;
        padding: 6px 9px;
        border-radius: 999px;
        background: #f5f6fa;
        color: var(--kc-muted);
        font-size: .66rem;
        font-weight: 900;
        white-space: nowrap;
      }
      body.dark-mode .kc-top-category-status { background: #253145; }

      /* Subject filters live in the sticky header; the second discovery row keeps genre filters visible. */
      .kc-discovery {
        display:block !important;
        margin:0 0 11px !important;
        padding:0 !important;
        border:0 !important;
        background:transparent !important;
        box-shadow:none !important;
      }
      .kc-discovery .tool-panel,
      .kc-discovery > .kc-filter-label:not(.kc-genre-label) { display:none !important; }
      .kc-discovery .kc-genre-label { margin:0 2px 5px !important; }

      /* Hero remains only as a layout anchor for activity tools. */
      .kc-hero {
        display:block !important;
        height:0 !important;
        min-height:0 !important;
        margin:0 !important;
        padding:0 !important;
        overflow:hidden !important;
      }
      .kc-hero > * { display:none !important; }

      @media (max-width: 940px) {
        #main-app > .kc-topbar {
          position: sticky !important;
          top: 0 !important;
          grid-template-columns: minmax(0,1fr) auto !important;
          grid-template-rows: 40px auto 42px auto !important;
          padding: 7px 10px 6px !important;
          gap: 6px 8px !important;
        }
        .kc-brand-wrap {
          min-width: 0;
          grid-column: 1;
          grid-row: 1;
        }
        .kc-brand-mark {
          width: 34px !important;
          height: 34px !important;
          font-size: 1rem !important;
        }
        .kc-brand strong { font-size: 1rem !important; }
        .kc-top-title {
          grid-column:1 / -1;
          grid-row:2;
          font-size:1.02rem;
          padding:0 2px 1px;
        }
        .kc-top-actions {
          grid-column: 2;
          grid-row: 1;
        }
        .kc-top-actions .header-btn {
          min-height: 34px !important;
          height: 34px !important;
          padding: 0 9px !important;
          font-size: .70rem !important;
        }
        #theme-btn { width: 36px !important; }
        .kc-top-search-wrap {
          grid-column: 1 / -1 !important;
          grid-row: 3 !important;
        }
        .kc-top-search { min-height: 42px !important; }
        .kc-top-category-row {
          grid-column: 1 / -1;
          grid-row: 4;
          display: block;
          padding-top: 5px;
        }
        .kc-top-category-status { display: none !important; }
        .kc-top-category-row .filter-btn {
          min-height: 30px !important;
          padding: 0 10px !important;
          font-size: .67rem !important;
        }
        .kc-lobby { padding-top: 10px !important; }
      }

      @media (max-width: 620px) {
        .kc-brand-mark { display: none !important; }
        .kc-brand-wrap { min-width: 82px; }
        .kc-brand strong { font-size: .95rem !important; }
        .kc-top-actions .age-change-btn {
          max-width: 122px;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .kc-top-search input { font-size: .82rem !important; }
        .kc-top-category-row .filter-nav { gap: 5px !important; }
        .kc-top-category-row .filter-btn {
          min-height: 29px !important;
          padding: 0 9px !important;
          font-size: .64rem !important;
        }
        .kc-top-title { font-size:.95rem; }
      }
    `;
    document.head.appendChild(style);
  }

  function compactHeader() {
    const topbar = document.querySelector('#main-app > .kc-topbar');
    const filterNav = document.querySelector('.kc-discovery .filter-nav');
    const count = document.getElementById('visible-game-count');
    if (!topbar || !filterNav) return;

    let row = topbar.querySelector('.kc-top-category-row');
    if (!row) {
      row = document.createElement('div');
      row.className = 'kc-top-category-row';
      row.setAttribute('aria-label', '학습 영역 빠른 선택');
      topbar.appendChild(row);
    }

    if (filterNav.parentElement !== row) row.appendChild(filterNav);

    let status = row.querySelector('.kc-top-category-status');
    if (!status) {
      status = document.createElement('div');
      status.className = 'kc-top-category-status';
      row.appendChild(status);
    }
    if (count && count.parentElement !== status) status.appendChild(count);

    const theme = document.getElementById('theme-btn');
    if (theme) {
      theme.setAttribute('aria-label', '화면 테마 바꾸기');
      theme.setAttribute('title', '화면 테마 바꾸기');
    }

    const age = document.getElementById('btn-change-age');
    if (age) age.setAttribute('title', '학년 바꾸기');

    const search = document.getElementById('game-search-input');
    if (search) search.setAttribute('placeholder', '게임 이름으로 찾기');
  }

  function keepCompact() {
    const target = document.getElementById('main-app');
    if (!target) return;
    const observer = new MutationObserver(() => compactHeader());
    observer.observe(target, { childList: true, subtree: true });
  }

  function init() {
    addStyles();
    compactHeader();
    keepCompact();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();

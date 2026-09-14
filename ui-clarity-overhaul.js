(() => {
  'use strict';

  const STYLE_ID = 'kidscade-clarity-overhaul-style';
  const MOBILE_BREAKPOINT = 940;
  let quickTab = 'recent';
  let syncingQuickHub = false;
  let cardSyncQueued = false;

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* =========================================================
         Kidscade clarity pass: cards / My Space / quick access
         ========================================================= */

      /* Main game cards: one clear hierarchy instead of stacked badges. */
      #game-list > .game-card {
        min-height: 244px !important;
        padding: 42px 14px 14px !important;
      }
      #game-list > .game-card .game-icon {
        width: 84px !important;
        height: 84px !important;
        margin-bottom: 10px !important;
        font-size: 3.35rem !important;
      }
      #game-list > .game-card .game-title {
        margin-bottom: 6px !important;
      }
      #game-list > .game-card .game-desc {
        min-height: 2.8em !important;
        -webkit-line-clamp: 2 !important;
      }
      #game-list > .game-card .badge-container,
      #game-list > .game-card .cert-btn {
        display: none !important;
      }
      #game-list > .game-card .kc-card-meta {
        width: 100%;
        min-height: 27px;
        margin-top: 9px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        flex-wrap: wrap;
      }
      #game-list > .game-card .kc-card-meta:empty { display: none; }
      #game-list > .game-card .kc-card-meta-chip {
        min-width: 0;
        max-width: 100%;
        padding: 5px 8px;
        border-radius: 999px;
        background: #f4f5f8;
        border: 1px solid rgba(148,163,184,.20);
        color: #60697a;
        font-size: .64rem;
        font-weight: 950;
        line-height: 1.15;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      #game-list > .game-card .kc-card-meta-chip.score {
        background: #eef7ff;
        color: #2874b8;
        border-color: rgba(96,165,250,.24);
      }
      #game-list > .game-card .kc-card-meta-chip.rank {
        background: #fff9e8;
        color: #9a6813;
        border-color: rgba(245,158,11,.24);
      }
      body.dark-mode #game-list > .game-card .kc-card-meta-chip {
        background: #283446;
        border-color: #3a4658;
        color: #d3dbea;
      }
      body.dark-mode #game-list > .game-card .kc-card-meta-chip.score {
        background: #173650;
        color: #b8ddff;
      }
      body.dark-mode #game-list > .game-card .kc-card-meta-chip.rank {
        background: #453316;
        color: #fde9a9;
      }

      /* Bonus energy is optional. Never make a playable game look locked. */
      #game-list > .game-card.out-of-bonus {
        filter: none !important;
        opacity: 1 !important;
      }
      #game-list > .game-card.out-of-bonus:hover {
        transform: translateY(-5px) !important;
        box-shadow: var(--kc-shadow) !important;
      }
      #game-list > .game-card .play-limit-badge {
        margin-top: 6px !important;
        padding: 5px 8px !important;
        background: #eefaf3 !important;
        color: #25744d !important;
        border-color: rgba(74,222,128,.34) !important;
        font-size: .63rem !important;
      }
      #game-list > .game-card .play-limit-badge.low {
        background: #fff8e6 !important;
        color: #966411 !important;
        border-color: rgba(245,158,11,.30) !important;
      }
      #game-list > .game-card .play-limit-badge.empty {
        background: #f3f4f6 !important;
        color: #747d8d !important;
        border-color: rgba(148,163,184,.28) !important;
      }
      body.dark-mode #game-list > .game-card .play-limit-badge.empty {
        background: #263244 !important;
        color: #c0cada !important;
        border-color: #3a4658 !important;
      }

      /* One visible seed balance in the lobby. */
      #avatar-plaza-seeds { display: none !important; }
      .avatar-plaza-actions { gap: 0 !important; }

      /* My Space: remove duplicate entry points, retain one route per feature. */
      #sidebar-recommend { display: none !important; }
      .kc-side-actions { grid-template-columns: 1fr !important; }
      .kc-side-btn.primary { grid-column: auto !important; }
      #pet-modal .sook-room-shortcuts #btn-pet-talk,
      #pet-modal .sook-room-shortcuts #btn-pet-feed { display: none !important; }
      #pet-modal .sook-room-shortcuts {
        grid-template-columns: repeat(2, minmax(0,1fr)) !important;
      }

      /* Recent + favorites become one compact quick-access block. */
      .kc-quick-zone.kc-quick-hub {
        display: block !important;
        margin-bottom: 18px;
        padding: 0 !important;
        border-radius: 20px;
        background: var(--kc-panel);
        border: 1px solid var(--kc-line);
        box-shadow: var(--kc-shadow);
        overflow: hidden;
      }
      .kc-quick-hub-head {
        min-height: 50px;
        padding: 8px 10px 8px 12px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        border-bottom: 1px solid var(--kc-line);
      }
      .kc-quick-tabs {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
      }
      .kc-quick-tab {
        min-height: 34px;
        padding: 0 12px;
        border: 1px solid transparent;
        border-radius: 999px;
        background: transparent;
        color: var(--kc-muted);
        font-size: .76rem;
        font-weight: 950;
        cursor: pointer;
      }
      .kc-quick-tab.active {
        background: #f1edff;
        border-color: rgba(139,92,246,.18);
        color: #6d4fd7;
      }
      .kc-quick-tab:disabled {
        opacity: .42;
        cursor: default;
      }
      body.dark-mode .kc-quick-tab.active {
        background: #342b55;
        color: #d6caff;
        border-color: #55477a;
      }
      .kc-quick-hub-time {
        flex: 0 0 auto;
        color: var(--kc-muted);
        font-size: .68rem;
        font-weight: 850;
      }
      .kc-quick-hub .dashboard-section {
        margin: 0 !important;
        padding: 10px 12px 12px !important;
        border: 0 !important;
        border-radius: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
      }
      .kc-quick-hub .dashboard-title { display: none !important; }
      .kc-quick-hub .dashboard-container {
        padding: 0 !important;
        gap: 8px !important;
      }
      .kc-quick-hub .mini-card {
        min-width: 150px !important;
        min-height: 116px !important;
        padding: 12px !important;
        border-width: 1px !important;
        border-radius: 15px !important;
        box-shadow: none !important;
      }
      .kc-quick-hub .mini-card .game-icon {
        width: 48px !important;
        height: 48px !important;
        font-size: 2rem !important;
        margin-bottom: 5px !important;
      }
      .kc-quick-hub .mini-card .game-title {
        margin: 0 !important;
        font-size: .78rem !important;
      }
      .kc-quick-hub .mini-card .play-limit-badge,
      .kc-quick-hub .mini-card .kc-card-meta { display: none !important; }

      /* Mobile gets one stable primary navigation instead of a floating pet bubble. */
      .kc-mobile-nav { display: none; }
      @media (max-width: ${MOBILE_BREAKPOINT}px) {
        #pet-widget { display: none !important; }
        #main-app { padding-bottom: 78px !important; }
        .kc-mobile-nav {
          position: fixed;
          left: 10px;
          right: 10px;
          bottom: max(10px, env(safe-area-inset-bottom));
          z-index: 9985;
          display: grid;
          grid-template-columns: repeat(4, minmax(0,1fr));
          gap: 5px;
          padding: 7px;
          border: 1px solid rgba(148,163,184,.26);
          border-radius: 20px;
          background: color-mix(in srgb, var(--kc-panel) 94%, transparent);
          box-shadow: 0 16px 36px rgba(15,23,42,.20);
          backdrop-filter: blur(16px);
        }
        .kc-mobile-nav-btn {
          min-width: 0;
          min-height: 52px;
          padding: 5px 2px;
          border: 0;
          border-radius: 14px;
          background: transparent;
          color: var(--kc-muted);
          font-size: .68rem;
          font-weight: 950;
          cursor: pointer;
          line-height: 1.15;
        }
        .kc-mobile-nav-btn .kc-mobile-nav-icon {
          display: block;
          margin-bottom: 3px;
          font-size: 1.25rem;
        }
        .kc-mobile-nav-btn.active {
          background: #f1edff;
          color: #6d4fd7;
        }
        body.dark-mode .kc-mobile-nav-btn.active {
          background: #342b55;
          color: #d6caff;
        }
      }

      @media (max-width: 620px) {
        #game-list.game-container {
          grid-template-columns: repeat(2, minmax(0,1fr)) !important;
        }
        #game-list > .game-card {
          min-height: 186px !important;
          padding: 38px 8px 9px !important;
        }
        #game-list > .game-card .game-icon {
          width: 62px !important;
          height: 62px !important;
          font-size: 2.45rem !important;
          margin-bottom: 7px !important;
        }
        #game-list > .game-card .game-title {
          font-size: .82rem !important;
          line-height: 1.22 !important;
        }
        #game-list > .game-card .game-desc { display: none !important; }
        #game-list > .game-card .kc-card-meta {
          min-height: 22px;
          margin-top: 5px;
          gap: 3px;
        }
        #game-list > .game-card .kc-card-meta-chip {
          padding: 4px 6px;
          font-size: .55rem;
        }
        #game-list > .game-card .kc-card-meta-chip.rank {
          display: none;
        }
        #game-list > .game-card .play-limit-badge {
          margin-top: 4px !important;
          padding: 4px 5px !important;
          font-size: .55rem !important;
        }
        .kc-quick-hub-head {
          align-items: stretch;
          flex-direction: column;
          gap: 5px;
          padding: 8px;
        }
        .kc-quick-tabs { width: 100%; }
        .kc-quick-tab { flex: 1; }
        .kc-quick-hub-time { padding: 0 5px 2px; }
        .kc-quick-hub .mini-card { min-width: 132px !important; }
        #pet-modal .sook-room-shortcuts { grid-template-columns: 1fr 1fr !important; }
      }

      @media (max-width: 380px) {
        #game-list.game-container { grid-template-columns: 1fr !important; }
        #game-list > .game-card { min-height: 196px !important; }
      }
    `;
    document.head.appendChild(style);
  }

  function normalizeText(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
  }

  function removeCertificateButtons(root = document) {
    root.querySelectorAll?.('.cert-btn').forEach(btn => btn.remove());
  }

  function getCardBadgeText(card, selector) {
    return normalizeText(card.querySelector(selector)?.textContent);
  }

  function syncCard(card) {
    if (!card || !card.matches('#game-list > .game-card')) return;

    removeCertificateButtons(card);

    let meta = card.querySelector(':scope > .kc-card-meta');
    if (!meta) {
      meta = document.createElement('div');
      meta.className = 'kc-card-meta';
      meta.setAttribute('aria-label', '게임 기록');
      const energy = card.querySelector(':scope > .play-limit-badge');
      if (energy) card.insertBefore(meta, energy);
      else card.appendChild(meta);
    }

    const score = getCardBadgeText(card, '.badge-score');
    const rank = getCardBadgeText(card, '.badge-rank');
    const signature = `${score}|${rank}`;
    if (meta.dataset.signature === signature) return;
    meta.dataset.signature = signature;
    meta.replaceChildren();

    if (score) {
      const chip = document.createElement('span');
      chip.className = 'kc-card-meta-chip score';
      chip.textContent = score;
      meta.appendChild(chip);
    }
    if (rank) {
      const chip = document.createElement('span');
      chip.className = 'kc-card-meta-chip rank';
      chip.textContent = rank;
      meta.appendChild(chip);
    }
  }

  function syncCards() {
    cardSyncQueued = false;
    document.querySelectorAll('#game-list > .game-card').forEach(syncCard);
    removeCertificateButtons(document);
  }

  function queueCardSync() {
    if (cardSyncQueued) return;
    cardSyncQueued = true;
    requestAnimationFrame(syncCards);
  }

  function tidyMySpace() {
    const title = document.querySelector('.kc-side-card.avatar-shell .kc-side-title');
    if (title) title.textContent = '내 공간';

    const petOpen = document.getElementById('sidebar-pet-open');
    if (petOpen) petOpen.textContent = '🐾 쑥쑥랜드';

    const shop = document.getElementById('btn-open-shop');
    if (shop) shop.textContent = '🛒 상점';

    const petHeader = document.querySelector('#pet-modal .sook-coach-header > span');
    if (petHeader) petHeader.textContent = '🏡 내 공간 · 쑥쑥랜드';
  }

  function buildQuickHub() {
    const zone = document.querySelector('.kc-quick-zone');
    const recent = document.getElementById('recent-section');
    const favorite = document.getElementById('favorite-section');
    if (!zone || !recent || !favorite || zone.classList.contains('kc-quick-hub')) return;

    zone.classList.add('kc-quick-hub');

    const head = document.createElement('div');
    head.className = 'kc-quick-hub-head';
    head.innerHTML = `
      <div class="kc-quick-tabs" role="tablist" aria-label="빠른 게임 목록">
        <button class="kc-quick-tab active" type="button" data-quick-tab="recent" role="tab">🕒 이어서</button>
        <button class="kc-quick-tab" type="button" data-quick-tab="favorite" role="tab">⭐ 즐겨찾기</button>
      </div>
      <div class="kc-quick-hub-time" aria-live="polite"></div>
    `;

    const panels = document.createElement('div');
    panels.className = 'kc-quick-panels';
    zone.insertBefore(head, zone.firstChild);
    zone.appendChild(panels);
    panels.appendChild(recent);
    panels.appendChild(favorite);

    const time = document.getElementById('total-playtime');
    const timeSlot = head.querySelector('.kc-quick-hub-time');
    if (time && timeSlot) timeSlot.appendChild(time);

    head.querySelectorAll('.kc-quick-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        quickTab = btn.dataset.quickTab || 'recent';
        syncQuickHub();
      });
    });

    const listObserver = new MutationObserver(syncQuickHub);
    const recentList = document.getElementById('recent-list');
    const favoriteList = document.getElementById('favorite-list');
    if (recentList) listObserver.observe(recentList, { childList: true });
    if (favoriteList) listObserver.observe(favoriteList, { childList: true });

    syncQuickHub();
  }

  function syncQuickHub() {
    if (syncingQuickHub) return;
    syncingQuickHub = true;
    requestAnimationFrame(() => {
      const zone = document.querySelector('.kc-quick-zone.kc-quick-hub');
      const recent = document.getElementById('recent-section');
      const favorite = document.getElementById('favorite-section');
      const recentList = document.getElementById('recent-list');
      const favoriteList = document.getElementById('favorite-list');
      if (!zone || !recent || !favorite || !recentList || !favoriteList) {
        syncingQuickHub = false;
        return;
      }

      const recentCount = recentList.children.length;
      const favoriteCount = favoriteList.children.length;
      const tabs = zone.querySelectorAll('.kc-quick-tab');
      const recentTab = zone.querySelector('[data-quick-tab="recent"]');
      const favoriteTab = zone.querySelector('[data-quick-tab="favorite"]');

      if (recentTab) {
        recentTab.textContent = `🕒 이어서 ${recentCount}`;
        recentTab.disabled = recentCount === 0;
      }
      if (favoriteTab) {
        favoriteTab.textContent = `⭐ 즐겨찾기 ${favoriteCount}`;
        favoriteTab.disabled = favoriteCount === 0;
      }

      if (recentCount === 0 && favoriteCount === 0) {
        zone.style.setProperty('display', 'none', 'important');
      } else {
        zone.style.removeProperty('display');
        if (quickTab === 'recent' && recentCount === 0) quickTab = 'favorite';
        if (quickTab === 'favorite' && favoriteCount === 0) quickTab = 'recent';
      }

      tabs.forEach(btn => {
        const active = btn.dataset.quickTab === quickTab;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-selected', active ? 'true' : 'false');
      });

      const showRecent = quickTab === 'recent' && recentCount > 0;
      const showFavorite = quickTab === 'favorite' && favoriteCount > 0;
      recent.style.setProperty('display', showRecent ? 'block' : 'none', 'important');
      favorite.style.setProperty('display', showFavorite ? 'block' : 'none', 'important');
      syncingQuickHub = false;
    });
  }

  function setMobileActive(name) {
    document.querySelectorAll('.kc-mobile-nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mobileNav === name);
    });
  }

  function openSookTab(tab) {
    const petWidget = document.getElementById('pet-widget');
    if (petWidget) petWidget.click();
    requestAnimationFrame(() => {
      document.querySelector(`.sook-main-tab[data-sook-tab="${tab}"]`)?.click();
    });
  }

  function buildMobileNav() {
    if (document.querySelector('.kc-mobile-nav')) return;
    const nav = document.createElement('nav');
    nav.className = 'kc-mobile-nav';
    nav.setAttribute('aria-label', 'Kidscade 주요 메뉴');
    nav.innerHTML = `
      <button class="kc-mobile-nav-btn active" type="button" data-mobile-nav="games"><span class="kc-mobile-nav-icon">🎮</span>게임</button>
      <button class="kc-mobile-nav-btn" type="button" data-mobile-nav="space"><span class="kc-mobile-nav-icon">🏡</span>내 공간</button>
      <button class="kc-mobile-nav-btn" type="button" data-mobile-nav="missions"><span class="kc-mobile-nav-icon">🎯</span>미션</button>
      <button class="kc-mobile-nav-btn" type="button" data-mobile-nav="shop"><span class="kc-mobile-nav-icon">🛒</span>상점</button>
    `;
    document.body.appendChild(nav);

    nav.addEventListener('click', event => {
      const btn = event.target.closest('.kc-mobile-nav-btn');
      if (!btn) return;
      const target = btn.dataset.mobileNav;
      setMobileActive(target);

      if (target === 'games') {
        document.querySelector('.kc-arcade')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (target === 'space') {
        openSookTab('room');
      } else if (target === 'missions') {
        openSookTab('missions');
      } else if (target === 'shop') {
        document.getElementById('btn-open-shop')?.click();
      }
    });
  }

  function watchDynamicUI() {
    const gameList = document.getElementById('game-list');
    if (gameList) {
      const observer = new MutationObserver(queueCardSync);
      observer.observe(gameList, { childList: true, subtree: true, characterData: true });
    }

    const bodyObserver = new MutationObserver(() => {
      removeCertificateButtons(document);
      if (!document.querySelector('.kc-mobile-nav')) buildMobileNav();
    });
    bodyObserver.observe(document.body, { childList: true, subtree: true });
  }

  function init() {
    addStyles();
    tidyMySpace();
    buildQuickHub();
    buildMobileNav();
    syncCards();
    watchDynamicUI();

    window.addEventListener('resize', () => {
      if (window.innerWidth > MOBILE_BREAKPOINT) setMobileActive('games');
    }, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();

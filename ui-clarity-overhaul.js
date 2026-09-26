(() => {
  'use strict';

  const STYLE_ID = 'kidscade-clarity-overhaul-style';
  const MOBILE_BREAKPOINT = 940;
  let cardSyncQueued = false;

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* Main game cards: one clear hierarchy instead of stacked badges. */
      #game-list > .game-card {
        min-height:244px !important;
        padding:42px 14px 14px !important;
      }
      #game-list > .game-card .game-icon {
        width:84px !important;
        height:84px !important;
        margin-bottom:10px !important;
        font-size:3.35rem !important;
      }
      #game-list > .game-card .game-title { margin-bottom:6px !important; }
      #game-list > .game-card .game-desc {
        min-height:2.8em !important;
        -webkit-line-clamp:2 !important;
      }
      #game-list > .game-card .badge-container,
      #game-list > .game-card .cert-btn { display:none !important; }
      #game-list > .game-card .kc-card-meta {
        width:100%;
        min-height:22px;
        margin-top:7px;
        display:flex;
        align-items:center;
        justify-content:center;
        gap:4px;
        flex-wrap:wrap;
      }
      #game-list > .game-card .kc-card-meta:empty { display:none; }
      #game-list > .game-card .kc-card-meta-chip {
        min-width:0;
        max-width:100%;
        padding:4px 7px;
        border-radius:999px;
        background:#f4f5f8;
        border:1px solid rgba(148,163,184,.20);
        color:#60697a;
        font-size:.60rem;
        font-weight:950;
        line-height:1.15;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
      }
      #game-list > .game-card .kc-card-meta-chip.score {
        background:#eef7ff;
        color:#2874b8;
        border-color:rgba(96,165,250,.24);
      }
      #game-list > .game-card .kc-card-meta-chip.rework {
        background:#fff3e8;
        color:#b35b13;
        border-color:rgba(249,115,22,.24);
      }
      #game-list > .game-card .kc-card-meta-chip.rank {
        background:#fff9e8;
        color:#9a6813;
        border-color:rgba(245,158,11,.24);
      }
      body.dark-mode #game-list > .game-card .kc-card-meta-chip {
        background:#283446;
        border-color:#3a4658;
        color:#d3dbea;
      }
      body.dark-mode #game-list > .game-card .kc-card-meta-chip.score { background:#173650; color:#b8ddff; }
      body.dark-mode #game-list > .game-card .kc-card-meta-chip.rank { background:#453316; color:#fde9a9; }

      /* Bonus energy is optional. Never make a playable game look locked. */
      #game-list > .game-card.out-of-bonus { filter:none !important; opacity:1 !important; }
      #game-list > .game-card.out-of-bonus:hover {
        transform:translateY(-5px) !important;
        box-shadow:var(--kc-shadow) !important;
      }
      #game-list > .game-card .play-limit-badge {
        position:absolute !important;
        right:10px !important;
        top:10px !important;
        margin:0 !important;
        min-width:34px !important;
        min-height:27px !important;
        display:flex !important;
        align-items:center !important;
        justify-content:center !important;
        padding:0 7px !important;
        border-radius:999px !important;
        background:#eefaf3 !important;
        color:#25744d !important;
        border-color:rgba(74,222,128,.34) !important;
        font-size:.59rem !important;
      }
      #game-list > .game-card .play-limit-badge.low {
        background:#fff8e6 !important;
        color:#966411 !important;
        border-color:rgba(245,158,11,.30) !important;
      }
      #game-list > .game-card .play-limit-badge.empty {
        background:#f3f4f6 !important;
        color:#747d8d !important;
        border-color:rgba(148,163,184,.28) !important;
      }
      body.dark-mode #game-list > .game-card .play-limit-badge.empty {
        background:#263244 !important;
        color:#c0cada !important;
        border-color:#3a4658 !important;
      }

      /* My Space: keep one route per feature. */
      #avatar-plaza-seeds { display:none !important; }
      .avatar-plaza-actions { gap:0 !important; }
      #sidebar-recommend { display:none !important; }
      .kc-side-actions { grid-template-columns:1fr !important; }
      .kc-side-btn.primary { grid-column:auto !important; }
      #pet-modal .sook-room-shortcuts #btn-pet-talk,
      #pet-modal .sook-room-shortcuts #btn-pet-feed { display:none !important; }
      #pet-modal .sook-room-shortcuts { grid-template-columns:repeat(2,minmax(0,1fr)) !important; }
      .shop-tab[data-tab="pet"],
      #btn-open-pet-shop-compact,
      #btn-open-aquarium,
      #btn-open-hamster,
      .sook-main-tab[data-sook-tab="room"] { display:none !important; }

      /* Mobile primary navigation. */
      .kc-mobile-nav { display:none; }
      @media (max-width:${MOBILE_BREAKPOINT}px) {
        #pet-widget { display:none !important; }
        #main-app { padding-bottom:78px !important; }
        .kc-mobile-nav {
          position:fixed;
          left:10px;
          right:10px;
          bottom:max(10px,env(safe-area-inset-bottom));
          z-index:9985;
          display:grid;
          grid-template-columns:repeat(4,minmax(0,1fr));
          gap:5px;
          padding:7px;
          border:1px solid rgba(148,163,184,.26);
          border-radius:20px;
          background:color-mix(in srgb,var(--kc-panel) 94%,transparent);
          box-shadow:0 16px 36px rgba(15,23,42,.20);
          backdrop-filter:blur(16px);
        }
        .kc-mobile-nav-btn {
          min-width:0;
          min-height:52px;
          padding:5px 2px;
          border:0;
          border-radius:14px;
          background:transparent;
          color:var(--kc-muted);
          font-size:.68rem;
          font-weight:950;
          cursor:pointer;
          line-height:1.15;
        }
        .kc-mobile-nav-btn .kc-mobile-nav-icon {
          display:block;
          margin-bottom:3px;
          font-size:1.25rem;
        }
        .kc-mobile-nav-btn.active { background:#f1edff; color:#6d4fd7; }
        body.dark-mode .kc-mobile-nav-btn.active { background:#342b55; color:#d6caff; }
      }

      @media (max-width:620px) {
        #game-list.game-container { grid-template-columns:repeat(2,minmax(0,1fr)) !important; }
        #game-list > .game-card {
          min-height:186px !important;
          padding:38px 8px 9px !important;
        }
        #game-list > .game-card .game-icon {
          width:62px !important;
          height:62px !important;
          font-size:2.45rem !important;
          margin-bottom:7px !important;
        }
        #game-list > .game-card .game-title {
          font-size:.82rem !important;
          line-height:1.22 !important;
        }
        #game-list > .game-card .game-desc { display:none !important; }
        #game-list > .game-card .kc-card-meta { min-height:22px; margin-top:5px; gap:3px; }
        #game-list > .game-card .kc-card-meta-chip { padding:4px 6px; font-size:.55rem; }
        #game-list > .game-card .kc-card-meta-chip.rank { display:none; }
        #game-list > .game-card .play-limit-badge {
          margin-top:4px !important;
          padding:4px 5px !important;
          font-size:.55rem !important;
        }
        #pet-modal .sook-room-shortcuts { grid-template-columns:1fr 1fr !important; }
      }

      @media (max-width:380px) {
        #game-list.game-container { grid-template-columns:1fr !important; }
        #game-list > .game-card { min-height:196px !important; }
      }
    `;
    document.head.appendChild(style);
  }

  function normalizeText(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
  }

  function removeCertificateButtons(root = document) {
    root.querySelectorAll?.('.cert-btn').forEach(button => button.remove());
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
    const game = window.KidscadeGames?.get?.(card.dataset.id);
    const taxonomy = window.KidscadeCatalog?.taxonomy || {};
    const genre = game ? (taxonomy.genres?.[game.genre] || game.genre) : '';
    const session = game?.sessionMinutes ? `${game.sessionMinutes}분` : '';
    const player = game?.players?.includes('online') ? '온라인' :
      game?.players?.includes('localMulti') ? '여럿이' :
      game?.players?.includes('local2') ? '2인' :
      game?.players?.includes('classroom') ? '교실' : '';
    const rework = game?.qualityStatus === 'rework' ? '개선 중' : '';
    const signature = `${genre}|${session}|${player}|${rework}|${score}`;
    if (meta.dataset.signature === signature) return;
    meta.dataset.signature = signature;
    meta.setAttribute('aria-label', '게임 정보');
    meta.replaceChildren();

    for (const value of [genre, session, player, rework].filter(Boolean)) {
      const chip = document.createElement('span');
      chip.className = 'kc-card-meta-chip' + (value === '개선 중' ? ' rework' : '');
      chip.textContent = value;
      meta.appendChild(chip);
    }

    if (score) {
      const chip = document.createElement('span');
      chip.className = 'kc-card-meta-chip score';
      chip.textContent = score;
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
    if (petOpen) petOpen.textContent = '🐾 Cube Pets 월드';

    const shop = document.getElementById('btn-open-shop');
    if (shop) { shop.textContent = '🌱 씨앗 월드'; shop.dataset.openLifeWorld = 'profile-world'; shop.setAttribute('aria-label','씨앗 월드 들어가기'); }

    const petHeader = document.querySelector('#pet-modal .sook-coach-header > span');
    if (petHeader) petHeader.textContent = '🐾 Cube Pets는 생존 월드에서 만나요';
  }

  function setMobileActive(name) {
    document.querySelectorAll('.kc-mobile-nav-btn').forEach(button => {
      button.classList.toggle('active', button.dataset.mobileNav === name);
    });
  }

  function openSookTab(tab) {
    if (tab === 'room') {
      window.openKidscadeLifeWorld?.();
      return;
    }
    document.getElementById('pet-widget')?.click();
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
      const button = event.target.closest('.kc-mobile-nav-btn');
      if (!button) return;
      const target = button.dataset.mobileNav;
      setMobileActive(target);

      if (target === 'games') {
        document.querySelector('.kc-arcade')?.scrollIntoView({ behavior:'smooth', block:'start' });
      } else if (target === 'space') {
        openSookTab('room');
      } else if (target === 'missions') {
        openSookTab('missions');
      } else if (target === 'shop') {
        document.getElementById('btn-open-shop')?.click();
      }
    });
  }

  function watchGameCards() {
    const gameList = document.getElementById('game-list');
    if (!gameList || gameList.dataset.clarityObserver === '1') return;
    gameList.dataset.clarityObserver = '1';
    const observer = new MutationObserver(queueCardSync);
    observer.observe(gameList, { childList:true, subtree:true, characterData:true });
  }

  function init() {
    addStyles();
    tidyMySpace();
    buildMobileNav();
    syncCards();
    watchGameCards();

    window.addEventListener('pageshow', syncCards);
    window.addEventListener('focus', syncCards);
    window.addEventListener('resize', () => {
      if (window.innerWidth > MOBILE_BREAKPOINT) setMobileActive('games');
    }, { passive:true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once:true });
  } else {
    init();
  }
})();

(() => {
  'use strict';

  const STYLE_ID = 'kidscade-visual-polish-style';
  const RECORD_CARD_ID = 'kc-local-profile-card';
  const TOGGLE_ID = 'kc-vp-record-toggle';
  const MOBILE_BREAKPOINT = 620;
  let syncQueued = false;
  let observer = null;

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* =========================================================
         Kidscade visual polish pass 2
         정보 구조는 유지하고 밀도, 여백, 카드 위계를 정돈합니다.
         ========================================================= */
      :root {
        --kc-vp-radius-lg: 22px;
        --kc-vp-radius-md: 16px;
        --kc-vp-soft-shadow: 0 10px 28px rgba(15,23,42,.07);
        --kc-vp-hover-shadow: 0 16px 34px rgba(15,23,42,.11);
      }

      /* 전체 리듬 */
      .kc-lobby { gap:18px !important; }
      .kc-myspace-inner { gap:10px !important; }
      .kc-arcade { min-width:0; }
      .kc-hero { padding-bottom:10px !important; }
      .kc-hero h1 { letter-spacing:-.045em !important; }

      /* 프로필: 중첩 카드 느낌을 줄이고 한 덩어리처럼 보이게 */
      .kc-side-card.avatar-shell {
        border-radius:var(--kc-vp-radius-lg) !important;
        overflow:hidden;
        box-shadow:var(--kc-vp-soft-shadow) !important;
      }
      .kc-side-card.avatar-shell .kc-side-head { padding:14px 14px 7px !important; }
      #kc-profile-identity {
        margin-top:7px !important;
        padding:9px 10px !important;
        border-radius:14px !important;
        box-shadow:none !important;
      }
      #kc-profile-identity .kc-profile-id-name { font-size:.96rem !important; }
      #kc-profile-identity .kc-profile-id-edit {
        min-height:30px;
        padding:0 9px !important;
        border:1px solid rgba(124,92,255,.13) !important;
        box-shadow:none !important;
      }
      .avatar-plaza-preview {
        height:184px !important;
        margin:0 12px 9px !important;
        border-radius:18px !important;
        box-shadow:inset 0 0 0 1px rgba(148,163,184,.16) !important;
      }
      .avatar-plaza-actions { padding:0 12px 10px !important; }
      .avatar-plaza-actions #avatar-open-btn,
      .avatar-plaza-actions #btn-open-shop {
        min-height:42px !important;
        border-radius:13px !important;
      }
      .kc-profile-row {
        padding:8px 13px 12px !important;
        border-top:1px solid rgba(148,163,184,.13);
      }
      .kc-profile-row .coin-display {
        min-height:34px;
        padding:0 10px !important;
        border-radius:11px !important;
        font-size:.75rem !important;
      }

      /* 플레이 기록: 숫자가 먼저 읽히는 조밀한 카드 */
      #${RECORD_CARD_ID} {
        padding:12px !important;
        border-radius:var(--kc-vp-radius-lg) !important;
        box-shadow:var(--kc-vp-soft-shadow) !important;
        overflow:hidden;
      }
      #${RECORD_CARD_ID} .kph-head { margin-bottom:7px !important; }
      #${RECORD_CARD_ID} .kph-name { font-size:.9rem !important; }
      #${RECORD_CARD_ID} .kph-note { margin-top:1px !important; line-height:1.3 !important; }
      #${RECORD_CARD_ID} .kph-stats {
        grid-template-columns:repeat(2,minmax(0,1fr)) !important;
        gap:6px !important;
        margin:7px 0 9px !important;
      }
      #${RECORD_CARD_ID} .kph-stat {
        min-width:0;
        padding:8px !important;
        border-radius:12px !important;
        box-shadow:none !important;
      }
      #${RECORD_CARD_ID} .kph-stat b { font-size:.88rem !important; line-height:1.15; }
      #${RECORD_CARD_ID} .kph-stat span { font-size:.59rem !important; }
      #${RECORD_CARD_ID} .kph-section-title { margin:9px 0 5px !important; font-size:.68rem !important; }
      #${RECORD_CARD_ID} .kph-progress { height:7px !important; }
      #${RECORD_CARD_ID} .kph-progress-copy { margin-top:4px !important; font-size:.61rem !important; }
      #${RECORD_CARD_ID} .kph-list { gap:4px !important; }
      #${RECORD_CARD_ID} .kph-game {
        min-height:34px;
        padding:6px 7px !important;
        border-radius:10px !important;
      }
      #${RECORD_CARD_ID} .kph-game strong { font-size:.66rem !important; }
      #${RECORD_CARD_ID} .kph-game span { font-size:.58rem !important; }
      #${RECORD_CARD_ID} .kph-recent { gap:4px !important; }
      #${RECORD_CARD_ID} .kph-chip { padding:4px 7px !important; font-size:.59rem !important; }
      #${TOGGLE_ID} {
        display:none;
        width:100%;
        min-height:36px;
        margin-top:8px;
        border:1px solid rgba(124,92,255,.18);
        border-radius:12px;
        background:rgba(124,92,255,.06);
        color:#6d4fd7;
        font-size:.66rem;
        font-weight:1000;
        cursor:pointer;
      }
      body.dark-mode #${TOGGLE_ID} { background:rgba(167,139,250,.10); color:#ddd6fe; border-color:rgba(167,139,250,.2); }

      /* 쑥쑥랜드 카드: 프로필보다 한 단계 가벼운 보조 목적지 */
      #kc-pet-card {
        padding:12px !important;
        border-radius:19px !important;
        box-shadow:0 7px 20px rgba(15,23,42,.055) !important;
      }
      #kc-pet-card .kc-pet-avatar { width:48px !important; height:48px !important; border-radius:15px !important; }
      #kc-pet-card .kc-pet-talk { margin-top:8px !important; padding:8px 9px !important; border-radius:12px !important; }
      #kc-pet-card .kc-side-actions { margin-top:8px !important; }
      #kc-pet-card #sidebar-pet-open { min-height:43px !important; border-radius:13px !important; }

      /* 오늘의 활동: 두 기능을 확실히 구분하되 과한 장식은 줄임 */
      #kc-activity-strip { gap:8px !important; margin-bottom:12px !important; }
      #kc-activity-strip .kc-activity-btn {
        min-height:60px !important;
        padding:10px 11px !important;
        border-radius:16px !important;
        box-shadow:0 7px 18px rgba(15,23,42,.055) !important;
        position:relative;
        overflow:hidden;
      }
      #kc-activity-strip .kc-activity-btn::before {
        content:'';
        position:absolute;
        inset:0 auto 0 0;
        width:4px;
        border-radius:4px;
        background:#8b5cf6;
      }
      #kc-activity-strip .kc-activity-btn[data-kc-activity="missions"] { background:linear-gradient(135deg,rgba(255,251,235,.96),var(--kc-panel,#fff) 72%) !important; }
      #kc-activity-strip .kc-activity-btn[data-kc-activity="missions"]::before { background:#f59e0b; }
      #kc-activity-strip .kc-activity-btn[data-kc-activity="recommend"] { background:linear-gradient(135deg,rgba(245,243,255,.98),var(--kc-panel,#fff) 72%) !important; }
      body.dark-mode #kc-activity-strip .kc-activity-btn[data-kc-activity="missions"],
      body.dark-mode #kc-activity-strip .kc-activity-btn[data-kc-activity="recommend"] { background:var(--kc-panel,#1e293b) !important; }
      #kc-activity-strip .kc-activity-title { font-size:.78rem !important; }
      #kc-activity-strip .kc-activity-sub { margin-top:3px !important; font-size:.63rem !important; }

      @media (min-width:941px) {
        #kc-activity-strip.kc-activity-sidebar {
          grid-template-columns:1fr !important;
          gap:7px !important;
          margin:0 !important;
        }
        #kc-activity-strip.kc-activity-sidebar .kc-activity-btn {
          min-height:56px !important;
          padding:9px 10px !important;
          border-radius:15px !important;
          box-shadow:0 6px 16px rgba(15,23,42,.05) !important;
        }
        #kc-activity-strip.kc-activity-sidebar .kc-activity-title {
          font-size:.75rem !important;
        }
        #kc-activity-strip.kc-activity-sidebar .kc-activity-sub {
          margin-top:3px !important;
          font-size:.60rem !important;
          line-height:1.38 !important;
        }
        #kc-activity-strip.kc-activity-sidebar .kc-activity-count {
          padding:3px 6px !important;
          font-size:.58rem !important;
        }
      }

      /* 이어서 플레이 / 즐겨찾기 */
      .kc-quick-zone { gap:10px !important; margin-bottom:14px !important; }
      .dashboard-section:not(.hidden) { padding:10px !important; border-radius:18px !important; box-shadow:0 7px 20px rgba(15,23,42,.055) !important; }
      .dashboard-title { margin-bottom:7px !important; font-size:.84rem !important; }
      .dashboard-container { gap:7px !important; }
      .dashboard-container .mini-card { border-radius:14px !important; }
      .dashboard-container .mini-card.kc-has-cover {
        width:142px !important;
        min-width:142px !important;
        max-width:142px !important;
      }

      /* 인기 게임과 이용 현황 */
      #kc-popular-hub { margin-bottom:15px !important; }
      .kc-popular-head { margin-bottom:7px !important; }
      .kc-popular-grid { gap:10px !important; }
      .kc-popular-panel { padding:10px !important; border-radius:17px !important; box-shadow:0 7px 20px rgba(15,23,42,.05) !important; }
      .kc-popular-panel-title { margin-bottom:6px !important; font-size:.79rem !important; }
      .kc-popular-list { gap:4px !important; }
      .kc-popular-item { grid-template-columns:28px 58px minmax(0,1fr) auto !important; gap:7px !important; padding:5px !important; }
      .kc-popular-thumb { width:58px !important; height:37px !important; border-radius:8px !important; }
      .kc-popular-rank { width:28px !important; height:28px !important; border-radius:9px !important; }
      #kc-live-stats {
        gap:5px 9px !important;
        margin:8px 0 11px !important;
        padding:8px 10px !important;
        border-radius:13px !important;
        box-shadow:none !important;
        font-size:.73rem !important;
      }

      @media (min-width:941px) {
        #kc-popular-hub.kc-popular-sidebar {
          margin:0 !important;
          padding:10px !important;
          border-radius:18px !important;
        }
        .kc-popular-sidebar .kc-popular-head { margin:0 0 8px !important; }
        .kc-popular-sidebar .kc-popular-grid { gap:0 !important; }
        .kc-popular-sidebar .kc-popular-panel {
          display:none !important;
          padding:0 !important;
          border:0 !important;
          border-radius:0 !important;
          box-shadow:none !important;
          background:transparent !important;
        }
        .kc-popular-sidebar .kc-popular-panel.active { display:block !important; }
        .kc-popular-sidebar .kc-popular-panel-title { display:none !important; }
        .kc-popular-sidebar .kc-popular-list { gap:3px !important; }
        .kc-popular-sidebar .kc-popular-item {
          grid-template-columns:26px 44px minmax(0,1fr) auto !important;
          gap:6px !important;
          padding:5px 3px !important;
        }
        .kc-popular-sidebar .kc-popular-thumb { width:44px !important; height:30px !important; border-radius:7px !important; }
        .kc-popular-sidebar .kc-popular-rank { width:26px !important; height:26px !important; border-radius:8px !important; }
        #kc-live-stats.kc-stats-sidebar {
          gap:4px !important;
          margin:0 !important;
          padding:9px 11px !important;
          border-radius:15px !important;
          font-size:.67rem !important;
        }
      }

      /* 게임 라이브러리: 대문이 주인공이고 텍스트는 짧게 */
      .kc-library-head { margin-bottom:9px !important; }
      #game-list.game-container { gap:12px !important; }
      #game-list > .game-card {
        min-height:232px !important;
        padding:40px 12px 12px !important;
        border-radius:20px !important;
        box-shadow:0 7px 18px rgba(15,23,42,.055) !important;
      }
      #game-list > .game-card:hover { box-shadow:var(--kc-vp-hover-shadow) !important; }
      #game-list > .game-card.kc-has-cover .game-cover-shell {
        margin-bottom:9px !important;
        border-radius:14px !important;
      }
      #game-list > .game-card .game-title { margin-bottom:5px !important; font-size:.96rem !important; }
      #game-list > .game-card .game-desc { font-size:.71rem !important; line-height:1.4 !important; }
      #game-list > .game-card .kc-server-card-stats { margin-top:4px !important; font-size:.60rem !important; }
      #game-list > .game-card .kc-card-meta { margin-top:5px !important; min-height:20px !important; }
      #game-list > .game-card .kc-card-meta-chip { padding:4px 7px !important; font-size:.58rem !important; }

      /* 성장/미션/추천 모달 */
      #pet-modal { padding:10px !important; }
      #pet-modal .sook-coach-content { border-radius:22px !important; box-shadow:0 24px 60px rgba(15,23,42,.26) !important; }
      #pet-modal .sook-coach-header { flex-basis:56px !important; min-height:56px !important; padding:9px 14px !important; }
      #pet-modal .sook-coach-body { padding:11px !important; }

      /* 모바일 하단 메뉴 */
      @media (max-width:940px) {
        #main-app { padding-bottom:70px !important; }
        .kc-mobile-nav {
          left:8px !important;
          right:8px !important;
          bottom:max(7px,env(safe-area-inset-bottom)) !important;
          gap:3px !important;
          padding:5px !important;
          border-radius:18px !important;
          box-shadow:0 12px 30px rgba(15,23,42,.18) !important;
        }
        .kc-mobile-nav-btn {
          min-height:48px !important;
          border-radius:13px !important;
          font-size:.64rem !important;
        }
        .kc-mobile-nav-btn .kc-mobile-nav-icon { margin-bottom:2px !important; font-size:1.12rem !important; }
        .kc-mobile-nav-btn.active { box-shadow:inset 0 0 0 1px rgba(124,92,255,.08); }

        .kc-myspace-inner { gap:8px !important; }
        .kc-side-card.avatar-shell { border-radius:19px !important; }
        .kc-side-card.avatar-shell .kc-side-head { padding:10px 11px 5px !important; }
        .avatar-plaza-preview { height:142px !important; margin:8px !important; border-radius:16px !important; }
        .avatar-plaza-actions { padding:0 8px 8px !important; grid-template-columns:1fr !important; gap:5px !important; }
        .avatar-plaza-actions #avatar-open-btn,
        .avatar-plaza-actions #btn-open-shop { min-height:37px !important; font-size:.62rem !important; }
        .kc-profile-row { padding:6px 10px 9px !important; }

        #${RECORD_CARD_ID} { padding:10px !important; border-radius:18px !important; }
        #${RECORD_CARD_ID} .kph-stats { grid-template-columns:repeat(4,minmax(0,1fr)) !important; }
        #${RECORD_CARD_ID} .kph-stat { padding:7px 5px !important; text-align:center; }
        #${RECORD_CARD_ID} .kph-stat b { font-size:.82rem !important; }
        #${RECORD_CARD_ID} .kph-stat span { font-size:.54rem !important; }

        #kc-activity-strip { gap:7px !important; }
        .dashboard-container .mini-card.kc-has-cover {
          width:132px !important;
          min-width:132px !important;
          max-width:132px !important;
        }
        #game-list.game-container { gap:9px !important; }
      }

      @media (max-width:${MOBILE_BREAKPOINT}px) {
        .kc-lobby { padding-left:9px !important; padding-right:9px !important; gap:10px !important; }
        .kc-hero { padding:0 1px 7px !important; }
        .kc-hero h1 { font-size:1.24rem !important; }

        .kc-side-card.avatar-shell {
          grid-template-columns:128px minmax(0,1fr) !important;
          align-items:start !important;
        }
        #kc-profile-identity { padding:7px 8px !important; margin-top:4px !important; }
        #kc-profile-identity .kc-profile-id-label { font-size:.58rem !important; }
        #kc-profile-identity .kc-profile-id-name { font-size:.86rem !important; }
        #kc-profile-identity .kc-profile-id-edit { min-height:27px; padding:0 7px !important; font-size:.58rem !important; }
        .avatar-plaza-preview { height:118px !important; margin:7px !important; }
        .avatar-plaza-actions { padding:0 7px 7px !important; }
        .avatar-plaza-actions #avatar-open-btn,
        .avatar-plaza-actions #btn-open-shop { min-height:32px !important; font-size:.57rem !important; border-radius:10px !important; }
        .kc-profile-row { grid-column:2 !important; padding:4px 9px 8px !important; border-top:0 !important; align-self:start; }
        .kc-profile-row .profile-emoji { font-size:1.25rem !important; }
        .kc-profile-row .profile-title { font-size:.56rem !important; }
        .kc-profile-row .profile-badge { font-size:.72rem !important; }
        .kc-profile-row .coin-display { min-height:30px; font-size:.65rem !important; }

        #${RECORD_CARD_ID} .kph-stats { grid-template-columns:repeat(2,minmax(0,1fr)) !important; }
        #${TOGGLE_ID} { display:block; }
        #${RECORD_CARD_ID}.kc-vp-record-collapsed .kc-vp-record-detail { display:none !important; }

        #kc-activity-strip .kc-activity-btn { min-height:55px !important; padding:8px 9px !important; }
        #kc-activity-strip .kc-activity-title { font-size:.71rem !important; }
        #kc-activity-strip .kc-activity-sub { display:none !important; }

        .kc-quick-zone { margin-bottom:11px !important; }
        .dashboard-section:not(.hidden) { padding:8px !important; }
        .dashboard-title { font-size:.76rem !important; }
        .playtime-display { font-size:.56rem !important; }

        .kc-popular-head { margin-bottom:6px !important; }
        .kc-popular-title { font-size:.92rem !important; }
        .kc-popular-grid { gap:8px !important; }
        .kc-popular-panel { padding:8px !important; border-radius:15px !important; }
        .kc-popular-panel-title { font-size:.72rem !important; }
        .kc-popular-item { grid-template-columns:24px 50px minmax(0,1fr) auto !important; gap:6px !important; padding:4px 3px !important; }
        .kc-popular-rank { width:24px !important; height:24px !important; font-size:.65rem !important; }
        .kc-popular-thumb { width:50px !important; height:32px !important; }
        .kc-popular-game-title { font-size:.69rem !important; }
        .kc-popular-game-sub { display:none !important; }
        .kc-popular-count { font-size:.64rem !important; }

        #kc-live-stats { justify-content:center; margin:6px 0 9px !important; padding:7px 8px !important; font-size:.65rem !important; }
        #kc-live-stats .kc-stats-label { width:100%; text-align:center; }

        #game-list > .game-card {
          min-height:168px !important;
          padding:34px 7px 8px !important;
          border-radius:16px !important;
        }
        #game-list > .game-card.kc-has-cover { padding-left:6px !important; padding-right:6px !important; }
        #game-list > .game-card.kc-has-cover .game-cover-shell { margin-bottom:6px !important; border-radius:11px !important; }
        #game-list > .game-card .game-icon { width:56px !important; height:56px !important; font-size:2.2rem !important; margin-bottom:6px !important; }
        #game-list > .game-card .game-title { font-size:.76rem !important; line-height:1.2 !important; margin-bottom:3px !important; }
        #game-list > .game-card .kc-server-card-stats { font-size:.54rem !important; margin-top:3px !important; }
        #game-list > .game-card .kc-card-meta { margin-top:3px !important; min-height:19px !important; }
        #game-list > .game-card .kc-card-meta-chip { font-size:.5rem !important; padding:3px 5px !important; }

        #pet-modal { padding:5px !important; }
        #pet-modal .sook-coach-content { height:calc(100dvh - 10px) !important; border-radius:18px !important; }
        #pet-modal .sook-coach-header { flex-basis:50px !important; min-height:50px !important; padding:7px 9px !important; }
        #pet-modal .sook-coach-body { padding:8px !important; }
      }

      @media (max-width:380px) {
        .kc-side-card.avatar-shell { grid-template-columns:112px minmax(0,1fr) !important; }
        .avatar-plaza-preview { height:106px !important; }
        #kc-activity-strip { grid-template-columns:1fr !important; }
        #game-list.game-container { grid-template-columns:repeat(2,minmax(0,1fr)) !important; }
      }
    `;
    document.head.appendChild(style);
  }

  function markRecordDetails(card) {
    if (!card) return;
    const titles = Array.from(card.querySelectorAll('.kph-section-title'));
    titles.forEach(title => {
      const text = String(title.textContent || '');
      if (!/내가 많이 한 게임|최근 플레이/.test(text)) return;
      title.classList.add('kc-vp-record-detail');
      title.nextElementSibling?.classList.add('kc-vp-record-detail');
    });
  }

  function ensureRecordToggle() {
    const card = document.getElementById(RECORD_CARD_ID);
    if (!card) return false;
    markRecordDetails(card);

    let toggle = document.getElementById(TOGGLE_ID);
    if (!toggle) {
      toggle = document.createElement('button');
      toggle.id = TOGGLE_ID;
      toggle.type = 'button';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.textContent = '상세 기록 보기';
      card.appendChild(toggle);
      toggle.addEventListener('click', () => {
        const collapsed = card.classList.toggle('kc-vp-record-collapsed');
        toggle.setAttribute('aria-expanded', String(!collapsed));
        toggle.textContent = collapsed ? '상세 기록 보기' : '간단히 보기';
      });
    }

    if (window.innerWidth <= MOBILE_BREAKPOINT && !card.dataset.kcVpRecordInitialized) {
      card.dataset.kcVpRecordInitialized = '1';
      card.classList.add('kc-vp-record-collapsed');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.textContent = '상세 기록 보기';
    }
    return true;
  }

  function addVisualLabels() {
    const profile = document.querySelector('.kc-side-card.avatar-shell');
    if (profile) profile.dataset.kcVisualRole = 'profile';
    const growth = document.getElementById('kc-pet-card');
    if (growth) growth.dataset.kcVisualRole = 'growth';
    const library = document.getElementById('game-list');
    if (library) library.dataset.kcVisualRole = 'library';
  }

  function sync() {
    syncQueued = false;
    installStyles();
    ensureRecordToggle();
    addVisualLabels();
  }

  function scheduleSync() {
    if (syncQueued) return;
    syncQueued = true;
    requestAnimationFrame(sync);
  }

  function startObserver() {
    if (observer || !document.body) return;
    observer = new MutationObserver(mutations => {
      if (!mutations.some(mutation => mutation.type === 'childList' && mutation.addedNodes.length)) return;
      scheduleSync();
    });
    observer.observe(document.body, { childList:true, subtree:true });
  }

  function init() {
    installStyles();
    sync();
    startObserver();
    window.addEventListener('pageshow', scheduleSync);
    window.addEventListener('resize', scheduleSync, { passive:true });
    document.addEventListener('kidscade:profile-history-changed', scheduleSync);
    document.addEventListener('kidscade:catalog-ready', scheduleSync);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();

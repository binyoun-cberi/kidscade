(() => {
  'use strict';

  const STYLE_ID = 'kidscade-information-architecture-style';
  const PROFILE_IDENTITY_ID = 'kc-profile-identity';
  const ACTIVITY_STRIP_ID = 'kc-activity-strip';
  const MOBILE_SIGNATURE = 'profile-growth-search-v1';
  let bodyObserver = null;
  let modalObserver = null;
  let syncQueued = false;

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* =========================================================
         Kidscade information architecture pass
         게임 / 내 프로필 / 쑥쑥랜드를 명확히 분리합니다.
         ========================================================= */
      .kc-side-card.avatar-shell .kc-side-head { padding-bottom: 7px !important; }
      .kc-side-card.avatar-shell .kc-eyebrow { color:#7c5cff !important; }
      .kc-side-card.avatar-shell .kc-side-title { margin-bottom:0 !important; }

      #${PROFILE_IDENTITY_ID} {
        margin-top: 8px;
        padding: 10px 11px;
        border-radius: 15px;
        background: linear-gradient(135deg, rgba(124,92,255,.10), rgba(236,72,153,.08));
        border: 1px solid rgba(124,92,255,.15);
      }
      #${PROFILE_IDENTITY_ID} .kc-profile-id-top {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:8px;
      }
      #${PROFILE_IDENTITY_ID} .kc-profile-id-label {
        font-size:.64rem;
        color:var(--kc-muted,#64748b);
        font-weight:900;
      }
      #${PROFILE_IDENTITY_ID} .kc-profile-id-name {
        min-width:0;
        margin-top:2px;
        font-size:1rem;
        line-height:1.2;
        font-weight:1000;
        color:var(--kc-ink,#1f2937);
        overflow:hidden;
        text-overflow:ellipsis;
        white-space:nowrap;
      }
      #${PROFILE_IDENTITY_ID} .kc-profile-id-note {
        margin-top:4px;
        color:var(--kc-muted,#64748b);
        font-size:.62rem;
        line-height:1.35;
        font-weight:750;
      }
      #${PROFILE_IDENTITY_ID} .kc-profile-id-edit {
        flex:none;
        border:0;
        border-radius:10px;
        padding:6px 8px;
        background:#fff;
        color:#6d4fd7;
        box-shadow:0 4px 10px rgba(76,56,150,.08);
        font-size:.64rem;
        font-weight:1000;
        cursor:pointer;
      }
      body.dark-mode #${PROFILE_IDENTITY_ID} {
        background:linear-gradient(135deg,rgba(124,92,255,.18),rgba(236,72,153,.12));
        border-color:rgba(196,181,253,.18);
      }
      body.dark-mode #${PROFILE_IDENTITY_ID} .kc-profile-id-edit { background:#2d3748; color:#ddd6fe; }

      .avatar-plaza-actions {
        grid-template-columns:repeat(2,minmax(0,1fr)) !important;
        gap:7px !important;
      }
      .avatar-plaza-actions #avatar-open-btn,
      .avatar-plaza-actions #btn-open-shop {
        width:100% !important;
        min-width:0 !important;
        min-height:46px !important;
        margin:0 !important;
        border-radius:14px !important;
        padding:0 9px !important;
        font-size:.72rem !important;
        font-weight:1000 !important;
      }
      .avatar-plaza-actions #btn-open-shop {
        border:1px solid rgba(245,158,11,.25) !important;
        background:linear-gradient(135deg,#fff8df,#fff) !important;
        color:#9a6813 !important;
        box-shadow:0 7px 15px rgba(180,120,20,.08) !important;
      }
      body.dark-mode .avatar-plaza-actions #btn-open-shop {
        background:linear-gradient(135deg,#44371b,#2c313b) !important;
        color:#fde68a !important;
      }

      /* 기존 임시 프로필 카드는 '프로필'이 아니라 '플레이 기록' 역할만 맡습니다. */
      #kc-local-profile-card {
        border-radius:20px !important;
        box-shadow:none !important;
      }
      #kc-local-profile-card .kph-head { margin-bottom:8px !important; }
      #kc-local-profile-card .kph-edit { display:none !important; }
      #kc-local-profile-card .kph-kicker { color:#64748b !important; }
      #kc-local-profile-card .kph-name { font-size:.92rem !important; }
      #kc-local-profile-card .kph-note { font-size:.62rem !important; }

      /* 쑥쑥랜드 카드에는 쑥쑥랜드로 들어가는 한 가지 동선만 남깁니다. */
      #sidebar-recommend { display:none !important; }
      #kc-pet-card .kc-side-actions { grid-template-columns:1fr !important; }
      #kc-pet-card #sidebar-pet-open { grid-column:auto !important; }

      /* 미션은 프로필 사이드바에서 제거하고 게임 영역의 활동 도구로 이동합니다. */
      #sidebar-mission-card { display:none !important; }
      #${ACTIVITY_STRIP_ID} {
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:9px;
        margin:0 0 14px;
      }
      #${ACTIVITY_STRIP_ID} .kc-activity-btn {
        min-width:0;
        min-height:64px;
        padding:10px 12px;
        border:1px solid var(--kc-line,rgba(148,163,184,.22));
        border-radius:17px;
        background:var(--kc-panel,#fff);
        color:var(--kc-ink,#334155);
        box-shadow:0 8px 18px rgba(15,23,42,.06);
        cursor:pointer;
        text-align:left;
        transition:transform .15s ease,box-shadow .15s ease,border-color .15s ease;
      }
      #${ACTIVITY_STRIP_ID} .kc-activity-btn:hover {
        transform:translateY(-2px);
        border-color:rgba(124,92,255,.28);
        box-shadow:0 12px 23px rgba(15,23,42,.10);
      }
      #${ACTIVITY_STRIP_ID} .kc-activity-title {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:8px;
        font-size:.83rem;
        font-weight:1000;
      }
      #${ACTIVITY_STRIP_ID} .kc-activity-sub {
        display:block;
        margin-top:4px;
        color:var(--kc-muted,#64748b);
        font-size:.67rem;
        line-height:1.35;
        font-weight:750;
      }
      #${ACTIVITY_STRIP_ID} .kc-activity-count {
        flex:none;
        padding:4px 7px;
        border-radius:999px;
        background:#eefaf3;
        color:#258754;
        font-size:.62rem;
        font-weight:1000;
      }

      /* 같은 모달을 사용하지만 탭을 숨겨 각 진입점이 독립 기능처럼 보이게 합니다. */
      #pet-modal .sook-main-tabs { display:none !important; }
      #pet-modal .sook-coach-body { padding-top:12px !important; }

      @media (max-width:940px) {
        .kc-side-card.avatar-shell { scroll-margin-top:12px; }
        #kc-local-profile-card { scroll-margin-top:12px; }
        #${ACTIVITY_STRIP_ID} { margin-bottom:11px; }
        .kc-mobile-nav { grid-template-columns:repeat(4,minmax(0,1fr)) !important; }
      }

      @media (max-width:620px) {
        .kc-side-card.avatar-shell .kc-side-head { padding:8px 10px 2px !important; }
        #${PROFILE_IDENTITY_ID} { padding:8px 9px; margin-top:6px; }
        #${PROFILE_IDENTITY_ID} .kc-profile-id-note { display:none; }
        .avatar-plaza-actions { grid-template-columns:1fr 1fr !important; gap:6px !important; }
        .avatar-plaza-actions #avatar-open-btn,
        .avatar-plaza-actions #btn-open-shop { min-height:42px !important; font-size:.67rem !important; }
        #${ACTIVITY_STRIP_ID} { grid-template-columns:1fr 1fr; gap:7px; }
        #${ACTIVITY_STRIP_ID} .kc-activity-btn { min-height:58px; padding:8px 9px; }
        #${ACTIVITY_STRIP_ID} .kc-activity-title { font-size:.75rem; }
        #${ACTIVITY_STRIP_ID} .kc-activity-sub { font-size:.61rem; }
      }
    `;
    document.head.appendChild(style);
  }

  function profileApi() {
    return window.KidscadeProfileHistory || null;
  }

  function getNickname() {
    try {
      return profileApi()?.loadProfile?.()?.nickname || '새싹 게이머';
    } catch (_) {
      return '새싹 게이머';
    }
  }

  function editNickname() {
    const api = profileApi();
    if (!api?.updateNickname) return;
    const current = getNickname();
    const value = window.prompt('Kidscade에서 사용할 닉네임을 입력하세요. (최대 12자)', current);
    if (value === null) return;
    const clean = api.sanitizeNickname?.(value) || String(value || '').trim().slice(0, 12);
    if (!clean) {
      window.alert('닉네임을 한 글자 이상 입력해 주세요.');
      return;
    }
    api.updateNickname(clean);
    scheduleSync();
  }

  function ensureProfileIdentity() {
    const shell = document.querySelector('.kc-side-card.avatar-shell');
    const head = shell?.querySelector('.kc-side-head');
    if (!shell || !head) return false;

    const eyebrow = head.querySelector('.kc-eyebrow');
    const title = head.querySelector('.kc-side-title');
    if (eyebrow && eyebrow.textContent !== 'PROFILE') eyebrow.textContent = 'PROFILE';
    if (title && title.textContent !== '내 프로필') title.textContent = '내 프로필';
    shell.setAttribute('aria-label', '내 프로필');

    let identity = document.getElementById(PROFILE_IDENTITY_ID);
    if (!identity) {
      identity = document.createElement('div');
      identity.id = PROFILE_IDENTITY_ID;
      identity.innerHTML = `
        <div class="kc-profile-id-top">
          <div style="min-width:0">
            <div class="kc-profile-id-label">게스트 프로필</div>
            <div class="kc-profile-id-name" data-kc-profile-name>새싹 게이머</div>
          </div>
          <button class="kc-profile-id-edit" type="button">닉네임 수정</button>
        </div>
        <div class="kc-profile-id-note">계정 없이 이 브라우저에 저장돼요. 나중에 계정을 만들면 기록을 이어갈 수 있어요.</div>
      `;
      head.appendChild(identity);
      identity.querySelector('.kc-profile-id-edit')?.addEventListener('click', editNickname);
    }

    const name = identity.querySelector('[data-kc-profile-name]');
    const nickname = getNickname();
    if (name && name.textContent !== nickname) name.textContent = nickname;

    const avatarButton = document.getElementById('avatar-open-btn');
    if (avatarButton && avatarButton.textContent !== '👕 아바타 꾸미기') avatarButton.textContent = '👕 아바타 꾸미기';

    const shopButton = document.getElementById('btn-open-shop');
    const avatarActions = shell.querySelector('.avatar-plaza-actions');
    if (shopButton && avatarActions) {
      if (shopButton.parentElement !== avatarActions) avatarActions.appendChild(shopButton);
      shopButton.textContent = '🎁 씨앗 상점';
      shopButton.classList.add('kc-profile-shop-btn');
      shopButton.setAttribute('aria-label', '씨앗 상점 열기');
    }
    return true;
  }

  function normalizePlayRecordCard() {
    const card = document.getElementById('kc-local-profile-card');
    if (!card) return false;
    card.classList.add('kc-side-card', 'kc-play-record-card');
    card.setAttribute('aria-label', '나의 플레이 기록');
    const kicker = card.querySelector('.kph-kicker');
    const name = card.querySelector('.kph-name');
    const note = card.querySelector('.kph-note');
    if (kicker && kicker.textContent !== 'PLAY RECORD') kicker.textContent = 'PLAY RECORD';
    if (name && name.textContent !== '나의 플레이 기록') name.textContent = '나의 플레이 기록';
    if (note && note.textContent !== '30초 이상 플레이한 기록을 이 브라우저에 저장해요.') {
      note.textContent = '30초 이상 플레이한 기록을 이 브라우저에 저장해요.';
    }
    return true;
  }

  function normalizeGrowthArea() {
    const petCard = document.getElementById('kc-pet-card');
    if (petCard) petCard.setAttribute('aria-label', '쑥쑥랜드 열기');
    const petOpen = document.getElementById('sidebar-pet-open');
    if (petOpen && petOpen.textContent !== '🌱 쑥쑥랜드 들어가기') petOpen.textContent = '🌱 쑥쑥랜드 들어가기';

    const petTalk = document.getElementById('sidebar-pet-talk');
    if (petTalk && petTalk.textContent === '게임을 하면 쑥쑥이도 함께 성장해요.') {
      petTalk.textContent = '동물을 돌보고 정원을 꾸미는 나의 성장 공간이에요.';
    }
  }

  function openMission() {
    const source = document.getElementById('sidebar-mission-card');
    if (source) source.click();
  }

  function openRecommendation() {
    const source = document.getElementById('sidebar-recommend');
    if (source) source.click();
  }

  function ensureActivityStrip() {
    const arcade = document.querySelector('.kc-arcade');
    const hero = arcade?.querySelector('.kc-hero');
    if (!arcade || !hero) return false;

    let strip = document.getElementById(ACTIVITY_STRIP_ID);
    if (!strip) {
      strip = document.createElement('section');
      strip.id = ACTIVITY_STRIP_ID;
      strip.setAttribute('aria-label', '오늘의 활동 도구');
      strip.innerHTML = `
        <button class="kc-activity-btn" type="button" data-kc-activity="missions">
          <span class="kc-activity-title"><span>🎯 오늘의 미션</span><span class="kc-activity-count" data-kc-mission-count>0 / 3</span></span>
          <span class="kc-activity-sub" data-kc-mission-note>게임을 플레이하고 오늘의 목표를 채워보세요.</span>
        </button>
        <button class="kc-activity-btn" type="button" data-kc-activity="recommend">
          <span class="kc-activity-title"><span>💬 게임 추천</span><span class="kc-activity-count">맞춤 추천</span></span>
          <span class="kc-activity-sub">무엇을 할지 고민되면 지금 나에게 맞는 게임을 골라봐요.</span>
        </button>
      `;
      hero.insertAdjacentElement('afterend', strip);
      strip.querySelector('[data-kc-activity="missions"]')?.addEventListener('click', openMission);
      strip.querySelector('[data-kc-activity="recommend"]')?.addEventListener('click', openRecommendation);
    }
    syncActivityStrip();
    return true;
  }

  function syncActivityStrip() {
    const strip = document.getElementById(ACTIVITY_STRIP_ID);
    if (!strip) return;
    const sourceCount = document.getElementById('sidebar-mission-count')?.textContent?.trim();
    const sourceNote = document.getElementById('sidebar-mission-note')?.textContent?.trim();
    const targetCount = strip.querySelector('[data-kc-mission-count]');
    const targetNote = strip.querySelector('[data-kc-mission-note]');
    if (targetCount && sourceCount && targetCount.textContent !== sourceCount) targetCount.textContent = sourceCount;
    if (targetNote && sourceNote && targetNote.textContent !== sourceNote) targetNote.textContent = sourceNote;
  }

  function activeSookPanel() {
    return document.querySelector('#pet-modal .sook-tab-panel.active')?.dataset?.sookPanel || 'room';
  }

  function syncModalIdentity() {
    const modal = document.getElementById('pet-modal');
    if (!modal) return false;
    const title = modal.querySelector('.sook-coach-header > span');
    const mode = activeSookPanel();
    const labels = {
      room: ['🌱 쑥쑥랜드', '쑥쑥랜드'],
      missions: ['🎯 오늘의 미션', '오늘의 미션'],
      recommend: ['💬 게임 추천', '게임 추천']
    };
    const [text, aria] = labels[mode] || labels.room;
    if (title && title.textContent !== text) title.textContent = text;
    if (modal.getAttribute('aria-label') !== aria) modal.setAttribute('aria-label', aria);
    return true;
  }

  function attachModalObserver() {
    const modal = document.getElementById('pet-modal');
    if (!modal || modal.dataset.iaModalObserved === '1') return false;
    modal.dataset.iaModalObserved = '1';
    modalObserver?.disconnect?.();
    modalObserver = new MutationObserver(() => syncModalIdentity());
    modalObserver.observe(modal, { attributes:true, subtree:true, attributeFilter:['class'] });
    syncModalIdentity();
    return true;
  }

  function setMobileActive(name) {
    document.querySelectorAll('.kc-mobile-nav-btn').forEach(button => {
      button.classList.toggle('active', button.dataset.mobileNav === name);
    });
  }

  function ensureMobileNav() {
    const nav = document.querySelector('.kc-mobile-nav');
    if (!nav) return false;

    if (nav.dataset.iaSignature !== MOBILE_SIGNATURE) {
      nav.dataset.iaSignature = MOBILE_SIGNATURE;
      nav.setAttribute('aria-label', 'Kidscade 주요 메뉴');
      nav.innerHTML = `
        <button class="kc-mobile-nav-btn active" type="button" data-mobile-nav="games"><span class="kc-mobile-nav-icon">🎮</span>게임</button>
        <button class="kc-mobile-nav-btn" type="button" data-mobile-nav="profile"><span class="kc-mobile-nav-icon">👤</span>내 프로필</button>
        <button class="kc-mobile-nav-btn" type="button" data-mobile-nav="growth"><span class="kc-mobile-nav-icon">🌱</span>쑥쑥랜드</button>
        <button class="kc-mobile-nav-btn" type="button" data-mobile-nav="search"><span class="kc-mobile-nav-icon">🔎</span>찾기</button>
      `;
    }

    if (nav.dataset.iaBound !== '1') {
      nav.dataset.iaBound = '1';
      nav.addEventListener('click', event => {
        const button = event.target.closest('.kc-mobile-nav-btn');
        if (!button) return;
        const target = button.dataset.mobileNav;
        setMobileActive(target);
        if (target === 'games') {
          document.querySelector('.kc-arcade')?.scrollIntoView({ behavior:'smooth', block:'start' });
        } else if (target === 'profile') {
          document.querySelector('.kc-myspace')?.scrollIntoView({ behavior:'smooth', block:'start' });
          document.getElementById(PROFILE_IDENTITY_ID)?.classList.add('kc-profile-id-highlight');
          window.setTimeout(() => document.getElementById(PROFILE_IDENTITY_ID)?.classList.remove('kc-profile-id-highlight'), 800);
        } else if (target === 'growth') {
          document.getElementById('sidebar-pet-open')?.click();
        } else if (target === 'search') {
          const search = document.getElementById('game-search-input');
          search?.scrollIntoView({ behavior:'smooth', block:'center' });
          window.setTimeout(() => search?.focus(), 280);
        }
      });
    }
    return true;
  }

  function removeLegacyWording() {
    const sideTitle = document.querySelector('.kc-side-card.avatar-shell .kc-side-title');
    if (sideTitle && sideTitle.textContent !== '내 프로필') sideTitle.textContent = '내 프로필';
    const petHeader = document.querySelector('#pet-modal .sook-coach-header > span');
    if (petHeader && /내 공간/.test(petHeader.textContent || '')) syncModalIdentity();
  }

  function sync() {
    syncQueued = false;
    addStyles();
    ensureProfileIdentity();
    normalizePlayRecordCard();
    normalizeGrowthArea();
    ensureActivityStrip();
    attachModalObserver();
    syncModalIdentity();
    ensureMobileNav();
    removeLegacyWording();
  }

  function scheduleSync() {
    if (syncQueued) return;
    syncQueued = true;
    window.requestAnimationFrame(sync);
  }

  function attachBodyObserver() {
    if (bodyObserver || !document.body) return;
    bodyObserver = new MutationObserver(scheduleSync);
    bodyObserver.observe(document.body, { childList:true, subtree:true, characterData:true });
  }

  function init() {
    addStyles();
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      sync();
      if (document.querySelector('.kc-lobby') || attempts >= 100) {
        if (document.querySelector('.kc-lobby')) attachBodyObserver();
        if (attempts >= 100 || document.querySelector('.kc-mobile-nav')) window.clearInterval(timer);
      }
    }, 200);

    window.addEventListener('pageshow', scheduleSync);
    document.addEventListener('kidscade:profile-history-changed', scheduleSync);
    document.addEventListener('kidscade:dashboard-rendered', scheduleSync);
    document.addEventListener('kidscade:catalog-ready', scheduleSync);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();

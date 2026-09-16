(() => {
  'use strict';

  const STYLE_ID = 'kidscade-account-profile-gate-style';
  const GATE_ID = 'kc-account-profile-gate';
  let syncQueued = false;
  let observer = null;
  let loginFollowupTimers = [];

  function accountApi() {
    return window.KidscadeAccount || null;
  }

  function isSignedIn() {
    return Boolean(accountApi()?.account);
  }

  function addStyles() {
    if (document.getElementById(STYLE_ID) || !document.head) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${GATE_ID}{display:none;padding:24px 18px 22px;text-align:center;color:var(--kc-ink,#334155)}
      #${GATE_ID} .kpg-icon{width:62px;height:62px;margin:0 auto 12px;display:grid;place-items:center;border-radius:21px;background:linear-gradient(135deg,rgba(124,92,255,.15),rgba(236,72,153,.12));font-size:30px;box-shadow:inset 0 0 0 1px rgba(124,92,255,.14)}
      #${GATE_ID} .kpg-kicker{font-size:.68rem;font-weight:1000;letter-spacing:.10em;color:#7c5cff}
      #${GATE_ID} .kpg-title{margin:4px 0 6px;font-size:1.12rem;font-weight:1000;letter-spacing:-.04em}
      #${GATE_ID} .kpg-copy{max-width:290px;margin:0 auto;color:var(--kc-muted,#64748b);font-size:.72rem;font-weight:750;line-height:1.55}
      #${GATE_ID} .kpg-login{width:min(100%,280px);min-height:46px;margin-top:15px;border:0;border-radius:15px;background:linear-gradient(135deg,#7c5cff,#8b5cf6,#ec4899);color:#fff;font-size:.78rem;font-weight:1000;box-shadow:0 10px 24px rgba(124,92,255,.22);cursor:pointer}
      #${GATE_ID} .kpg-benefits{display:grid;grid-template-columns:1fr 1fr;gap:6px;width:min(100%,300px);margin:13px auto 0}
      #${GATE_ID} .kpg-benefit{padding:7px 8px;border-radius:11px;background:rgba(248,250,252,.88);border:1px solid rgba(148,163,184,.16);color:#64748b;font-size:.62rem;font-weight:900}
      body.dark-mode #${GATE_ID} .kpg-benefit{background:#253145;border-color:#334155;color:#cbd5e1}

      body[data-kc-profile-access="guest"] .kc-side-card.avatar-shell .kc-side-head,
      body[data-kc-profile-access="guest"] .kc-side-card.avatar-shell .avatar-plaza,
      body[data-kc-profile-access="guest"] .kc-side-card.avatar-shell .kc-profile-row{display:none!important}
      body[data-kc-profile-access="guest"] #${GATE_ID}{display:block!important;grid-column:1/-1}
      body[data-kc-profile-access="guest"] #kc-local-profile-card{display:none!important}
      body[data-kc-profile-access="guest"] .kc-myspace-inner > :not(.avatar-shell){display:none!important}
      body[data-kc-profile-access="guest"] .kc-side-card.avatar-shell{min-height:0!important;display:block!important}

      body[data-kc-profile-access="account"] #kc-local-profile-card .kph-note{font-size:0!important}
      body[data-kc-profile-access="account"] #kc-local-profile-card .kph-note::after{content:"30초 이상 플레이한 기록을 학생 계정에 동기화해요.";font-size:.62rem;color:#94a3b8;font-weight:800}

      @media(max-width:940px){
        body[data-kc-profile-access="guest"][data-kc-guest-mobile-section="games"] .kc-myspace{display:none!important}
        body[data-kc-profile-access="guest"][data-kc-guest-mobile-section="profile"] .kc-arcade{display:none!important}
        body[data-kc-profile-access="guest"][data-kc-guest-mobile-section="profile"] .kc-myspace{display:block!important;order:0!important}
        body[data-kc-profile-access="guest"] #${GATE_ID}{padding:28px 20px 26px}
      }

      @media(max-width:620px){
        #${GATE_ID} .kpg-benefits{grid-template-columns:1fr 1fr}
        #${GATE_ID} .kpg-login{min-height:48px;font-size:.82rem}
      }
    `;
    document.head.appendChild(style);
  }

  function ensureGate() {
    const shell = document.querySelector('.kc-side-card.avatar-shell');
    if (!shell) return false;
    let gate = document.getElementById(GATE_ID);
    if (!gate) {
      gate = document.createElement('div');
      gate.id = GATE_ID;
      gate.setAttribute('aria-label', '학생 계정 로그인 안내');
      gate.innerHTML = `
        <div class="kpg-icon">👤</div>
        <div class="kpg-kicker">PROFILE</div>
        <div class="kpg-title">로그인하고 내 프로필 열기</div>
        <div class="kpg-copy">게임은 게스트로 바로 즐길 수 있어요. 로그인하면 플레이 기록, 씨앗, 랭킹과 아바타를 내 계정에 이어서 보관할 수 있어요.</div>
        <button class="kpg-login" type="button">학생 계정 로그인</button>
        <div class="kpg-benefits">
          <div class="kpg-benefit">☁️ 기록 동기화</div>
          <div class="kpg-benefit">🌱 씨앗 보관</div>
          <div class="kpg-benefit">🏆 우리 반 랭킹</div>
          <div class="kpg-benefit">🎨 아바타 저장</div>
        </div>
      `;
      shell.insertBefore(gate, shell.firstChild);
      gate.querySelector('.kpg-login')?.addEventListener('click', () => accountApi()?.login?.());
    }
    return true;
  }

  function setNavActive(name) {
    document.querySelectorAll('.kc-mobile-nav-btn').forEach(button => {
      button.classList.toggle('active', button.dataset.mobileNav === name);
    });
  }

  function applyMode() {
    if (!document.body) return;
    const signedIn = isSignedIn();
    document.body.dataset.kcProfileAccess = signedIn ? 'account' : 'guest';
    if (!signedIn && !document.body.dataset.kcGuestMobileSection) {
      document.body.dataset.kcGuestMobileSection = 'games';
      setNavActive('games');
    }
    if (signedIn) delete document.body.dataset.kcGuestMobileSection;
  }

  function scheduleSync() {
    if (syncQueued) return;
    syncQueued = true;
    requestAnimationFrame(() => {
      syncQueued = false;
      addStyles();
      ensureGate();
      applyMode();
    });
  }

  function scheduleLoginFollowups() {
    loginFollowupTimers.forEach(clearTimeout);
    loginFollowupTimers = [250, 700, 1400, 2400].map(delay => setTimeout(scheduleSync, delay));
  }

  function bindNavigation() {
    if (document.documentElement.dataset.kcAccountProfileGateBound === '1') return;
    document.documentElement.dataset.kcAccountProfileGateBound = '1';
    document.addEventListener('click', event => {
      const button = event.target.closest?.('.kc-mobile-nav-btn');
      if (!button || isSignedIn()) return;
      const target = button.dataset.mobileNav;
      if (target === 'profile') {
        document.body.dataset.kcGuestMobileSection = 'profile';
        setNavActive('profile');
        scheduleSync();
      } else if (target === 'games' || target === 'search') {
        document.body.dataset.kcGuestMobileSection = 'games';
        setNavActive(target === 'search' ? 'search' : 'games');
        scheduleSync();
      } else if (target === 'growth') {
        document.body.dataset.kcGuestMobileSection = 'games';
        scheduleSync();
      }
    }, true);

    document.addEventListener('submit', event => {
      if (event.target?.id === 'kca-login-form') scheduleLoginFollowups();
    }, true);
  }

  function attachObserver() {
    if (observer || !document.body) return;
    observer = new MutationObserver(scheduleSync);
    observer.observe(document.body, { childList:true, subtree:true });
  }

  function init() {
    addStyles();
    bindNavigation();
    scheduleSync();

    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      scheduleSync();
      if (document.querySelector('.kc-lobby')) attachObserver();
      if (attempts >= 30) clearInterval(timer);
    }, 200);

    window.addEventListener('pageshow', scheduleSync);
    document.addEventListener('kidscade:catalog-ready', scheduleSync);
    document.addEventListener('kidscade:profile-history-changed', scheduleSync);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();

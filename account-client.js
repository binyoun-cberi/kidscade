(() => {
  'use strict';

  const STYLE_ID = 'kidscade-account-client-style';
  const SLOT_ID = 'kc-account-slot';
  const MODAL_ID = 'kc-account-modal';
  const META_KEY = 'kc_account_sync_meta_v1';
  const SYNC_DEBOUNCE_MS = 1400;
  let account = null;
  let available = true;
  let applyingCloud = false;
  let syncTimer = 0;
  let syncing = false;

  function store() { return window.KidscadeStorage || null; }
  function profileApi() { return window.KidscadeProfileHistory || null; }

  function readMeta() {
    try { return JSON.parse(sessionStorage.getItem(META_KEY) || '{}') || {}; } catch (_) { return {}; }
  }

  function writeMeta(value) {
    try { sessionStorage.setItem(META_KEY, JSON.stringify(value || {})); } catch (_) {}
  }

  function collectState() {
    const s = store();
    const p = profileApi();
    return {
      version: 1,
      profile: p?.loadProfile?.() || s?.getJson?.('profile', {}) || {},
      seeds: s?.getInt?.('seeds', 0) || 0,
      avatarInventory: s?.getJson?.('avatarInventory', []) || [],
      avatarEquipped: s?.getJson?.('avatarEquipped', {}) || {},
      playHistory: p?.loadHistory?.() || s?.getJson?.('playHistory', {}) || {},
      inventory: s?.getJson?.('inventory', {}) || {},
      equipped: s?.getJson?.('equipped', {}) || {},
      pet: s?.getJson?.('pet', {}) || {},
      petItems: s?.getJson?.('petItems', {}) || {},
      gardenState: s?.getJson?.('gardenState', {}) || {}
    };
  }

  function hasMeaningfulProgress(state = collectState()) {
    const defaultName = profileApi()?.DEFAULT_NICKNAME || '새싹 게이머';
    if (Number(state.seeds || 0) > 0) return true;
    if (state.profile?.nickname && state.profile.nickname !== defaultName) return true;
    if (Object.keys(state.playHistory?.games || {}).length > 0) return true;
    if (Array.isArray(state.avatarInventory) && state.avatarInventory.length > 0) return true;
    if (Object.keys(state.gardenState || {}).length > 0) return true;
    if (Object.keys(state.pet || {}).length > 0) return true;
    return false;
  }

  function applyCloudState(state) {
    const s = store();
    const p = profileApi();
    if (!s || !state || typeof state !== 'object') return;
    applyingCloud = true;
    try {
      if (state.profile) p?.saveProfile?.(state.profile) || s.setJson('profile', state.profile);
      s.setRaw('seeds', Math.max(0, Math.floor(Number(state.seeds || 0))));
      s.setJson('avatarInventory', Array.isArray(state.avatarInventory) ? state.avatarInventory : []);
      s.setJson('avatarEquipped', state.avatarEquipped || {});
      if (state.playHistory) p?.saveHistory?.(state.playHistory) || s.setJson('playHistory', state.playHistory);
      s.setJson('inventory', state.inventory || {});
      s.setJson('equipped', state.equipped || {});
      s.setJson('pet', state.pet || {});
      s.setJson('petItems', state.petItems || {});
      s.setJson('gardenState', state.gardenState || {});
    } finally {
      applyingCloud = false;
    }
  }

  async function api(path, options = {}) {
    const response = await fetch(path, {
      credentials: 'same-origin',
      ...options,
      headers: { ...(options.body ? { 'content-type': 'application/json' } : {}), ...(options.headers || {}) }
    });
    let body = {};
    try { body = await response.json(); } catch (_) {}
    return { response, body };
  }

  function errorText(code, body = {}) {
    if (code === 'invalid_credentials') return '아이디 또는 PIN을 확인해 주세요.';
    if (code === 'temporarily_locked') return 'PIN을 여러 번 잘못 입력해 잠시 잠겼어요. 잠시 후 다시 시도해 주세요.';
    if (code === 'not_authenticated' || code === 'session_expired') return '로그인이 만료됐어요. 다시 로그인해 주세요.';
    if (code === 'account_schema_not_ready' || code === 'account_secret_not_configured' || code === 'account_database_not_configured') return '계정 기능을 준비 중이에요.';
    return body?.message || '잠시 후 다시 시도해 주세요.';
  }

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${SLOT_ID}{margin-top:8px;display:grid;gap:6px}
      #${SLOT_ID} .kca-row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 9px;border-radius:12px;background:rgba(255,255,255,.72);border:1px solid rgba(124,92,255,.12)}
      body.dark-mode #${SLOT_ID} .kca-row{background:rgba(30,41,59,.62);border-color:rgba(196,181,253,.16)}
      #${SLOT_ID} .kca-copy{min-width:0}
      #${SLOT_ID} .kca-title{font-size:.68rem;font-weight:1000;color:var(--kc-ink,#334155);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      #${SLOT_ID} .kca-sub{margin-top:2px;font-size:.59rem;font-weight:800;color:var(--kc-muted,#64748b);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      #${SLOT_ID} button{flex:none;border:0;border-radius:10px;min-height:32px;padding:0 9px;background:linear-gradient(135deg,#7c5cff,#8b5cf6);color:#fff;font-size:.62rem;font-weight:1000;cursor:pointer}
      #${SLOT_ID} .kca-logout{background:#eef2f7;color:#64748b}
      body.dark-mode #${SLOT_ID} .kca-logout{background:#334155;color:#e2e8f0}
      #${MODAL_ID}{position:fixed;inset:0;z-index:14000;display:grid;place-items:center;padding:18px;background:rgba(15,23,42,.52);backdrop-filter:blur(8px)}
      #${MODAL_ID}.hidden{display:none!important}
      #${MODAL_ID} .kca-modal-card{width:min(420px,100%);border-radius:24px;background:#fff;padding:22px;box-shadow:0 24px 60px rgba(15,23,42,.28);color:#334155}
      body.dark-mode #${MODAL_ID} .kca-modal-card{background:#1e293b;color:#f8fafc}
      #${MODAL_ID} h2{margin:0;font-size:1.25rem;letter-spacing:-.04em}
      #${MODAL_ID} p{margin:7px 0 16px;color:#64748b;font-size:.78rem;line-height:1.5;font-weight:750}
      body.dark-mode #${MODAL_ID} p{color:#cbd5e1}
      #${MODAL_ID} label{display:grid;gap:5px;margin-top:10px;font-size:.72rem;font-weight:950}
      #${MODAL_ID} input{width:100%;box-sizing:border-box;min-height:46px;border:1px solid #dbe1ea;border-radius:13px;padding:0 12px;font:inherit;font-size:.9rem;background:#fff;color:#334155;text-transform:uppercase}
      body.dark-mode #${MODAL_ID} input{background:#263244;border-color:#475569;color:#fff}
      #${MODAL_ID} .kca-pin{text-transform:none;letter-spacing:.16em}
      #${MODAL_ID} .kca-error{min-height:20px;margin-top:8px;color:#dc2626;font-size:.7rem;font-weight:900}
      #${MODAL_ID} .kca-actions{display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:10px}
      #${MODAL_ID} button{min-height:44px;border:0;border-radius:13px;padding:0 14px;font-weight:1000;cursor:pointer}
      #${MODAL_ID} .kca-login{background:linear-gradient(135deg,#7c5cff,#ec4899);color:#fff}
      #${MODAL_ID} .kca-cancel{background:#eef2f7;color:#64748b}
      body.dark-mode #${MODAL_ID} .kca-cancel{background:#334155;color:#e2e8f0}
      #${MODAL_ID} .kca-help{margin-top:13px;padding-top:12px;border-top:1px solid #eef2f7;font-size:.65rem;color:#94a3b8;line-height:1.45}
      @media(max-width:620px){#${MODAL_ID}{padding:10px}#${MODAL_ID} .kca-modal-card{border-radius:20px;padding:18px}}
    `;
    document.head.appendChild(style);
  }

  function ensureModal() {
    let modal = document.getElementById(MODAL_ID);
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.className = 'hidden';
    modal.innerHTML = `
      <form class="kca-modal-card" id="kca-login-form">
        <h2>☁️ 내 기록 이어하기</h2>
        <p>선생님에게 받은 Kidscade ID와 6자리 PIN을 입력하세요. 계정이 없어도 게스트로 계속 이용할 수 있어요.</p>
        <label>Kidscade ID<input id="kca-login-id" autocomplete="username" placeholder="KC-ABCDE-01" maxlength="32"></label>
        <label>6자리 PIN<input class="kca-pin" id="kca-login-pin" type="password" inputmode="numeric" autocomplete="current-password" placeholder="••••••" maxlength="6"></label>
        <div class="kca-error" id="kca-login-error" aria-live="polite"></div>
        <div class="kca-actions"><button class="kca-login" type="submit">로그인</button><button class="kca-cancel" type="button">취소</button></div>
        <div class="kca-help">처음 로그인하는 새 계정이면 이 브라우저의 닉네임·씨앗·아바타·플레이 기록을 계정에 그대로 저장해요.</div>
      </form>
    `;
    document.body.appendChild(modal);
    modal.querySelector('.kca-cancel')?.addEventListener('click', closeLogin);
    modal.addEventListener('click', event => { if (event.target === modal) closeLogin(); });
    modal.querySelector('#kca-login-form')?.addEventListener('submit', submitLogin);
    return modal;
  }

  function openLogin() {
    const modal = ensureModal();
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    modal.querySelector('#kca-login-id')?.focus();
  }

  function closeLogin() {
    document.getElementById(MODAL_ID)?.classList.add('hidden');
    document.body.style.overflow = '';
  }

  function renderSlot() {
    const identity = document.getElementById('kc-profile-identity');
    if (!identity || !available) return false;
    let slot = document.getElementById(SLOT_ID);
    if (!slot) {
      slot = document.createElement('div');
      slot.id = SLOT_ID;
      identity.appendChild(slot);
    }
    if (!account) {
      slot.innerHTML = `<div class="kca-row"><div class="kca-copy"><div class="kca-title">☁️ 기록을 안전하게 보관하기</div><div class="kca-sub">발급받은 계정으로 다른 기기에서도 이어서 플레이</div></div><button type="button" data-kca-login>로그인</button></div>`;
      slot.querySelector('[data-kca-login]')?.addEventListener('click', openLogin);
      return true;
    }
    slot.innerHTML = `<div class="kca-row"><div class="kca-copy"><div class="kca-title">☁️ ${escapeHtml(account.loginId)}</div><div class="kca-sub">${escapeHtml(account.className || 'Kidscade')} · 동기화됨</div></div><button class="kca-logout" type="button" data-kca-logout>로그아웃</button></div>`;
    slot.querySelector('[data-kca-logout]')?.addEventListener('click', logout);
    return true;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch]));
  }

  async function submitLogin(event) {
    event.preventDefault();
    const idInput = document.getElementById('kca-login-id');
    const pinInput = document.getElementById('kca-login-pin');
    const error = document.getElementById('kca-login-error');
    const loginId = String(idInput?.value || '').trim().toUpperCase().replace(/\s+/g, '');
    const pin = String(pinInput?.value || '').replace(/\D/g, '').slice(0, 6);
    if (error) error.textContent = '';
    if (!loginId || pin.length !== 6) {
      if (error) error.textContent = '아이디와 6자리 PIN을 입력해 주세요.';
      return;
    }
    const button = event.currentTarget.querySelector('.kca-login');
    if (button) { button.disabled = true; button.textContent = '확인 중...'; }
    try {
      const { response, body } = await api('/api/account/login', { method:'POST', body:JSON.stringify({ loginId, pin }) });
      if (!response.ok || !body.ok) {
        if (error) error.textContent = errorText(body.error, body);
        return;
      }
      account = body.account;
      const localState = collectState();
      if (Number(account.revision || 0) === 0 && hasMeaningfulProgress(localState)) {
        await syncNow(localState);
      } else if (Number(account.revision || 0) > 0) {
        applyCloudState(body.state || {});
        writeMeta({ loginId: account.loginId, revision: account.revision });
        closeLogin();
        location.reload();
        return;
      } else {
        writeMeta({ loginId: account.loginId, revision: 0 });
      }
      closeLogin();
      renderSlot();
    } catch (_) {
      if (error) error.textContent = '네트워크 연결을 확인해 주세요.';
    } finally {
      if (button) { button.disabled = false; button.textContent = '로그인'; }
    }
  }

  async function syncNow(forcedState = null) {
    if (!account || syncing || applyingCloud) return false;
    syncing = true;
    try {
      const state = forcedState || collectState();
      const { response, body } = await api('/api/account/sync', { method:'POST', body:JSON.stringify({ state }) });
      if (!response.ok || !body.ok) return false;
      account = body.account;
      writeMeta({ loginId: account.loginId, revision: account.revision });
      renderSlot();
      return true;
    } catch (_) {
      return false;
    } finally {
      syncing = false;
    }
  }

  function scheduleSync() {
    if (!account || applyingCloud) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => syncNow(), SYNC_DEBOUNCE_MS);
  }

  function clearLocalAccountProgress() {
    const s = store();
    if (!s) return;
    [
      'profile','playHistory','seeds','avatarInventory','avatarEquipped','inventory','equipped',
      'pet','petItems','gardenState','recents','favorites','dailyMissions','dailyRewardClaimed','attendance'
    ].forEach(key => { try { s.remove(key); } catch (_) {} });
    writeMeta({});
  }

  async function logout() {
    if (!account) return;
    await syncNow();
    try { await api('/api/account/logout', { method:'POST', body:'{}' }); } catch (_) {}
    account = null;
    clearLocalAccountProgress();
    location.reload();
  }

  async function checkSession() {
    try {
      const { response, body } = await api('/api/account/me');
      if (response.status === 503 && ['account_schema_not_ready','account_secret_not_configured','account_database_not_configured'].includes(body.error)) {
        available = false;
        return;
      }
      if (!response.ok || !body.ok) {
        account = null;
        renderSlot();
        return;
      }
      account = body.account;
      const meta = readMeta();
      const revision = Number(account.revision || 0);
      if (revision > 0 && (meta.loginId !== account.loginId || Number(meta.revision || -1) !== revision)) {
        applyCloudState(body.state || {});
        writeMeta({ loginId: account.loginId, revision });
        location.reload();
        return;
      }
      if (revision === 0 && hasMeaningfulProgress()) await syncNow();
      renderSlot();
    } catch (_) {
      renderSlot();
    }
  }

  function watchUi() {
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (renderSlot() || attempts > 100 || !available) clearInterval(timer);
    }, 200);
    const observer = new MutationObserver(() => renderSlot());
    observer.observe(document.body, { childList:true, subtree:true });
  }

  function start() {
    installStyles();
    ensureModal();
    watchUi();
    checkSession();
    document.addEventListener('kidscade:profile-history-changed', scheduleSync);
    document.addEventListener('kidscade:storage-changed', scheduleSync);
    window.addEventListener('storage', scheduleSync);
    window.addEventListener('online', scheduleSync);
  }

  window.KidscadeAccount = Object.freeze({
    collectState,
    hasMeaningfulProgress,
    sync: syncNow,
    login: openLogin,
    get account() { return account; }
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();

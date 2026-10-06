(() => {
  'use strict';

  const STYLE_ID = 'kidscade-account-client-style';
  const SLOT_ID = 'kc-account-slot';
  const MODAL_ID = 'kc-account-modal';
  const QR_SCAN_MODAL_ID = 'kc-qr-scan-modal';
  const QR_CONFIRM_MODAL_ID = 'kc-qr-confirm-modal';
  const META_KEY = 'kc_account_sync_meta_v1';
  const SHARED_SYNC_META_KEY = 'kc_account_sync_shared_v1';
  const SYNC_LEASE_KEY = 'kc_account_sync_lease_v1';
  const SYNC_LOCK_NAME = 'kidscade-account-sync-v1';
  const SYNC_DEBOUNCE_MS = 1400;
  const SYNC_LEASE_MS = 8000;
  const TAB_ID = (crypto?.randomUUID?.() || Math.random().toString(36).slice(2)) + ':' + Date.now();
  let account = null;
  let available = true;
  let applyingCloud = false;
  let syncTimer = 0;
  let syncing = false;
  let economySummary = null;
  let economySummaryLoaded = false;
  let economySummaryLoading = false;
  let qrStream = null;
  let qrScanTimer = 0;

  function store() { return window.KidscadeStorage || null; }
  function profileApi() { return window.KidscadeProfileHistory || null; }

  function emitAccountChanged() {
    try {
      document.dispatchEvent(new CustomEvent('kidscade:account-changed', {
        detail:{ account:account ? { role:account.role, loginId:account.loginId } : null }
      }));
    } catch (_) {}
  }

  function readMeta() {
    try { return JSON.parse(sessionStorage.getItem(META_KEY) || '{}') || {}; } catch (_) { return {}; }
  }

  function writeMeta(value) {
    try { sessionStorage.setItem(META_KEY, JSON.stringify(value || {})); } catch (_) {}
  }

  function readSharedSyncMeta() {
    try { return JSON.parse(localStorage.getItem(SHARED_SYNC_META_KEY) || '{}') || {}; } catch (_) { return {}; }
  }

  function writeSharedSyncMeta(value) {
    try { localStorage.setItem(SHARED_SYNC_META_KEY, JSON.stringify(value || {})); } catch (_) {}
  }

  function stateSignature(state) {
    const text = JSON.stringify(state || {});
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return text.length + ':' + (hash >>> 0).toString(16);
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function claimFallbackSyncLease() {
    const now = Date.now();
    try {
      const current = JSON.parse(localStorage.getItem(SYNC_LEASE_KEY) || '{}') || {};
      if (current.owner && current.owner !== TAB_ID && Number(current.expiresAt || 0) > now) return false;
      localStorage.setItem(SYNC_LEASE_KEY, JSON.stringify({ owner:TAB_ID, expiresAt:now + SYNC_LEASE_MS }));
      const confirmed = JSON.parse(localStorage.getItem(SYNC_LEASE_KEY) || '{}') || {};
      return confirmed.owner === TAB_ID;
    } catch (_) {
      return true;
    }
  }

  function releaseFallbackSyncLease() {
    try {
      const current = JSON.parse(localStorage.getItem(SYNC_LEASE_KEY) || '{}') || {};
      if (current.owner === TAB_ID) localStorage.removeItem(SYNC_LEASE_KEY);
    } catch (_) {}
  }

  async function runCoordinatedSync(isAlreadySynced, task) {
    if (navigator.locks?.request) {
      return navigator.locks.request(SYNC_LOCK_NAME, { mode:'exclusive' }, async () => {
        if (isAlreadySynced()) return true;
        return task();
      });
    }
    for (let attempt = 0; attempt < 10; attempt += 1) {
      if (isAlreadySynced()) return true;
      if (claimFallbackSyncLease()) {
        try {
          if (isAlreadySynced()) return true;
          return await task();
        } finally {
          releaseFallbackSyncLease();
        }
      }
      await sleep(250);
    }
    if (isAlreadySynced()) return true;
    return task();
  }

  function collectState() {
    const s = store();
    const p = profileApi();
    return {
      version: 1,
      profile: p?.loadProfile?.() || s?.getJson?.('profile', {}) || {},
      seeds: s?.getInt?.('seeds', 0) || 0,
      sproutPower: s?.getInt?.('sproutPower', 0) || 0,
      avatarInventory: s?.getJson?.('avatarInventory', []) || [],
      avatarEquipped: s?.getJson?.('avatarEquipped', {}) || {},
      playHistory: p?.loadHistory?.() || s?.getJson?.('playHistory', {}) || {},
      inventory: s?.getJson?.('inventory', {}) || {},
      equipped: s?.getJson?.('equipped', {}) || {}
    };
  }

  function hasMeaningfulProgress(state = collectState()) {
    const defaultName = profileApi()?.DEFAULT_NICKNAME || '새싹 게이머';
    if (Number(state.seeds || 0) > 0) return true;
    if (Number(state.sproutPower || 0) > 0) return true;
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
      s.setRaw('sproutPower', Math.max(0, Math.floor(Number(state.sproutPower || 0))));
      s.setJson('avatarInventory', Array.isArray(state.avatarInventory) ? state.avatarInventory : []);
      s.setJson('avatarEquipped', state.avatarEquipped || {});
      if (state.playHistory) p?.saveHistory?.(state.playHistory) || s.setJson('playHistory', state.playHistory);
      s.setJson('inventory', state.inventory || {});
      s.setJson('equipped', state.equipped || {});
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
    if (code === 'invalid_credentials') return '학생 ID 또는 PIN을 확인해 주세요.';
    if (code === 'invalid_teacher_credentials') return '교사 ID 또는 비밀번호를 확인해 주세요.';
    if (code === 'invalid_qr_login') return '이 QR 카드는 만료되었거나 다시 발급된 카드예요. 선생님께 새 QR 카드를 받아 주세요.';
    if (code === 'temporarily_locked') return 'PIN을 여러 번 잘못 입력해 잠시 잠겼어요. 잠시 후 다시 시도해 주세요.';
    if (code === 'teacher_temporarily_locked') return '비밀번호를 여러 번 잘못 입력해 교사 계정이 잠시 잠겼어요.';
    if (code === 'not_authenticated' || code === 'session_expired' || code === 'unauthorized' || code === 'teacher_session_expired') return '로그인이 만료됐어요. 다시 로그인해 주세요.';
    if (code === 'account_schema_not_ready' || code === 'account_secret_not_configured' || code === 'account_database_not_configured') return '계정 기능을 준비 중이에요.';
    return body?.message || '잠시 후 다시 시도해 주세요.';
  }

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${SLOT_ID}{margin-top:10px;display:grid;gap:8px}
      #${SLOT_ID} .kca-row{display:flex;align-items:center;justify-content:space-between;gap:9px;padding:10px 11px;border-radius:15px;background:rgba(255,255,255,.82);border:1px solid rgba(124,92,255,.14);box-shadow:0 5px 14px rgba(75,56,130,.05)}
      body.dark-mode #${SLOT_ID} .kca-row{background:rgba(30,41,59,.72);border-color:rgba(196,181,253,.18)}
      #${SLOT_ID} .kca-copy{min-width:0}
      #${SLOT_ID} .kca-title{font-size:.72rem;font-weight:1000;color:var(--kc-ink,#253047);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;letter-spacing:-.01em}
      #${SLOT_ID} .kca-sub{margin-top:3px;font-size:.59rem;font-weight:850;color:var(--kc-muted,#64748b);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      #${SLOT_ID} .kca-buttons{display:flex;gap:5px;align-items:center;flex:none}
      #${SLOT_ID} button,#${SLOT_ID} .kca-button{display:inline-flex;align-items:center;justify-content:center;flex:none;border:0;border-radius:999px;min-height:34px;padding:0 11px;background:linear-gradient(135deg,#7c5cff,#8b5cf6);color:#fff;font-size:.61rem;font-weight:1000;cursor:pointer;text-decoration:none;transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease}
      #${SLOT_ID} .kca-logout{border:1px solid #dce3ee;background:linear-gradient(180deg,#fff,#f4f7fb);color:#607089;box-shadow:0 4px 10px rgba(51,65,85,.08)}
      #${SLOT_ID} .kca-logout:hover{transform:translateY(-1px);box-shadow:0 7px 14px rgba(51,65,85,.12)}
      #${SLOT_ID} .kca-economy-card{display:grid;grid-template-columns:34px minmax(0,1fr) auto;align-items:center;gap:9px;min-height:58px;padding:8px 10px;border-radius:14px;text-decoration:none;background:linear-gradient(135deg,rgba(124,92,255,.09),rgba(236,72,153,.07));border:1px solid rgba(124,92,255,.18);box-shadow:0 5px 14px rgba(124,92,255,.07);color:var(--kc-ink,#334155);transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease}
      #${SLOT_ID} .kca-economy-card:hover{transform:translateY(-1px);border-color:rgba(124,92,255,.34);box-shadow:0 8px 18px rgba(124,92,255,.12)}
      #${SLOT_ID} .kca-economy-icon{width:34px;height:34px;border-radius:11px;display:grid;place-items:center;background:linear-gradient(135deg,#fff1a8,#ffd166);box-shadow:inset 0 0 0 1px rgba(180,120,0,.08);font-size:1rem}
      #${SLOT_ID} .kca-economy-copy{min-width:0;display:grid;gap:1px}
      #${SLOT_ID} .kca-economy-title{display:flex;align-items:center;gap:5px;font-size:.69rem;font-weight:1000;letter-spacing:-.02em}
      #${SLOT_ID} .kca-economy-badge{display:inline-flex;align-items:center;min-height:17px;padding:0 5px;border-radius:999px;background:rgba(124,92,255,.11);color:#6d4aff;font-size:.51rem;font-weight:1000}
      #${SLOT_ID} .kca-economy-badge.attention{background:#fff0dc;color:#c56a00}
      #${SLOT_ID} .kca-economy-meta{font-size:.57rem;font-weight:900;color:var(--kc-muted,#64748b);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      #${SLOT_ID} .kca-economy-status{font-size:.54rem;font-weight:850;color:#8b5cf6;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      #${SLOT_ID} .kca-economy-status.attention{color:#c56a00}
      #${SLOT_ID} .kca-economy-arrow{font-size:1.15rem;font-weight:1000;color:#8b5cf6;padding-right:1px}
      #${SLOT_ID} .kca-teacher-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
      #${SLOT_ID} .kca-teacher-action{position:relative;min-width:0;min-height:72px;display:grid;grid-template-columns:36px minmax(0,1fr) 24px;align-items:center;gap:7px;padding:10px 9px;border-radius:17px;text-decoration:none;overflow:hidden;transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease}
      #${SLOT_ID} .kca-teacher-action::before{content:"";position:absolute;inset:-24px auto auto -24px;width:72px;height:72px;border-radius:50%;background:rgba(255,255,255,.34);filter:blur(1px);pointer-events:none}
      #${SLOT_ID} .kca-teacher-action.manage{border:1px solid rgba(139,92,246,.30);background:linear-gradient(135deg,#f1e9ff 0%,#fbf7ff 52%,#f7ecff 100%);box-shadow:0 8px 18px rgba(124,92,255,.13);color:#5b21b6}
      #${SLOT_ID} .kca-teacher-action.economy{border:1px solid rgba(245,158,11,.34);background:linear-gradient(135deg,#fff7e3 0%,#fffdf7 50%,#fff1e3 100%);box-shadow:0 8px 18px rgba(217,119,6,.12);color:#9a4c12}
      #${SLOT_ID} .kca-teacher-action:hover{transform:translateY(-2px)}
      #${SLOT_ID} .kca-teacher-action.manage:hover{box-shadow:0 12px 24px rgba(124,92,255,.18);border-color:rgba(124,92,255,.46)}
      #${SLOT_ID} .kca-teacher-action.economy:hover{box-shadow:0 12px 24px rgba(217,119,6,.17);border-color:rgba(245,158,11,.50)}
      #${SLOT_ID} .kca-action-icon{position:relative;z-index:1;width:36px;height:36px;border-radius:12px;display:grid;place-items:center;font-size:1.2rem;background:rgba(255,255,255,.78);box-shadow:inset 0 0 0 1px rgba(255,255,255,.72),0 4px 10px rgba(75,56,130,.08)}
      #${SLOT_ID} .kca-action-copy{position:relative;z-index:1;min-width:0;display:grid;gap:3px}
      #${SLOT_ID} .kca-action-copy strong{font-size:.72rem;font-weight:1000;line-height:1.2;letter-spacing:-.025em;white-space:nowrap}
      #${SLOT_ID} .kca-action-copy span{font-size:.54rem;font-weight:850;line-height:1.2;color:#6f7080;white-space:nowrap}
      #${SLOT_ID} .kca-action-arrow{position:relative;z-index:1;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;color:#fff;font-size:1rem;font-weight:1000;line-height:1}
      #${SLOT_ID} .manage .kca-action-arrow{background:linear-gradient(135deg,#9b6cff,#7c5cff);box-shadow:0 4px 10px rgba(124,92,255,.22)}
      #${SLOT_ID} .economy .kca-action-arrow{background:linear-gradient(135deg,#ffbc73,#ff8d5d);box-shadow:0 4px 10px rgba(245,158,11,.20)}
      body.dark-mode #${SLOT_ID} .kca-teacher-action.manage{background:linear-gradient(135deg,rgba(91,33,182,.38),rgba(49,46,129,.28));border-color:rgba(196,181,253,.28);color:#ede9fe}
      body.dark-mode #${SLOT_ID} .kca-teacher-action.economy{background:linear-gradient(135deg,rgba(120,53,15,.36),rgba(69,26,3,.26));border-color:rgba(253,186,116,.25);color:#fed7aa}
      body.dark-mode #${SLOT_ID} .kca-action-copy span{color:#cbd5e1}
      body.dark-mode #${SLOT_ID} .kca-action-icon{background:rgba(15,23,42,.28)}
      body.dark-mode #${SLOT_ID} .kca-logout{background:#334155;color:#e2e8f0;border-color:#475569}
      body.dark-mode #${SLOT_ID} .kca-economy-card{background:linear-gradient(135deg,rgba(124,92,255,.16),rgba(236,72,153,.10));border-color:rgba(196,181,253,.22);color:#f8fafc}
      body.dark-mode #${SLOT_ID} .kca-economy-icon{background:linear-gradient(135deg,#7c5cff,#ec4899);box-shadow:none}
      body.dark-mode #${SLOT_ID} .kca-economy-meta{color:#cbd5e1}
      body.dark-mode #${SLOT_ID} .kca-economy-status{color:#c4b5fd}
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
      #${MODAL_ID} .kca-qr-start{width:100%;min-height:58px;margin:2px 0 10px;border-radius:16px;background:linear-gradient(135deg,#16a34a,#22c55e);color:#fff;font-size:.88rem;box-shadow:0 9px 20px rgba(34,197,94,.22)}
      #${MODAL_ID} .kca-divider{display:flex;align-items:center;gap:9px;margin:2px 0 5px;color:#94a3b8;font-size:.62rem;font-weight:900}
      #${MODAL_ID} .kca-divider::before,#${MODAL_ID} .kca-divider::after{content:"";height:1px;flex:1;background:#e5e7eb}
      #${QR_SCAN_MODAL_ID},#${QR_CONFIRM_MODAL_ID}{position:fixed;inset:0;z-index:15050;display:grid;place-items:center;padding:18px;background:rgba(15,23,42,.72);backdrop-filter:blur(10px)}
      #${QR_SCAN_MODAL_ID}.hidden,#${QR_CONFIRM_MODAL_ID}.hidden{display:none!important}
      .kca-qr-card{width:min(430px,100%);border-radius:24px;background:#fff;padding:18px;box-shadow:0 24px 70px rgba(15,23,42,.34);color:#334155;text-align:center}
      body.dark-mode .kca-qr-card{background:#1e293b;color:#f8fafc}
      .kca-qr-card h2{margin:0;font-size:1.2rem}.kca-qr-card p{margin:7px 0 13px;color:#64748b;font-size:.76rem;line-height:1.5;font-weight:800}
      body.dark-mode .kca-qr-card p{color:#cbd5e1}
      .kca-qr-video-wrap{position:relative;overflow:hidden;border-radius:19px;background:#0f172a;aspect-ratio:1/1}.kca-qr-video-wrap video{width:100%;height:100%;object-fit:cover}
      .kca-qr-frame{position:absolute;inset:16%;border:4px solid #86efac;border-radius:22px;box-shadow:0 0 0 999px rgba(15,23,42,.24);pointer-events:none}
      .kca-qr-buttons{display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:12px}.kca-qr-buttons button{min-height:46px;border:0;border-radius:14px;padding:0 14px;font-weight:1000;cursor:pointer}
      .kca-qr-confirm-go{background:linear-gradient(135deg,#16a34a,#22c55e);color:#fff}.kca-qr-cancel{background:#eef2f7;color:#64748b}
      body.dark-mode .kca-qr-cancel{background:#334155;color:#e2e8f0}
      .kca-qr-person{margin:12px 0;padding:15px;border:1px solid #dcfce7;border-radius:17px;background:#f0fdf4}.kca-qr-person strong{display:block;font-size:1.12rem;color:#15803d}.kca-qr-person span{display:block;margin-top:5px;color:#64748b;font-size:.72rem;font-weight:850}
      .kca-qr-error{min-height:20px;margin-top:8px;color:#dc2626;font-size:.7rem;font-weight:900}
      @media(max-width:620px){#${MODAL_ID},#${QR_SCAN_MODAL_ID},#${QR_CONFIRM_MODAL_ID}{padding:10px}#${MODAL_ID} .kca-modal-card,.kca-qr-card{border-radius:20px;padding:16px}}
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
        <h2>☁️ Kidscade 로그인</h2>
        <p>QR 카드가 있으면 카메라로 바로 로그인할 수 있어요. 기존 ID·PIN 로그인도 그대로 사용할 수 있습니다.</p>
        <button class="kca-qr-start" id="kca-qr-start" type="button">📷 QR 카드로 빠르게 로그인</button>
        <div class="kca-divider">또는 ID로 로그인</div>
        <label>Kidscade ID<input id="kca-login-id" autocomplete="username" placeholder="KC-ABCDE-01 또는 KT-ABCDE" maxlength="32"></label>
        <label>PIN / 비밀번호<input class="kca-pin" id="kca-login-pin" type="password" autocomplete="current-password" placeholder="PIN 또는 비밀번호" maxlength="64"></label>
        <div class="kca-error" id="kca-login-error" aria-live="polite"></div>
        <div class="kca-actions"><button class="kca-login" type="submit">로그인</button><button class="kca-cancel" type="button">취소</button></div>
        <div class="kca-help">KC 학생 계정과 KT 교사 계정 모두 메인 화면에서 게임 기록을 이어갈 수 있어요. 교사 계정의 학급경제 데이터는 학생 계정과 분리됩니다.</div>
      </form>
    `;
    document.body.appendChild(modal);
    modal.querySelector('.kca-cancel')?.addEventListener('click', closeLogin);
    modal.querySelector('#kca-qr-start')?.addEventListener('click', startQrScanner);
    modal.addEventListener('click', event => { if (event.target === modal) closeLogin(); });
    modal.querySelector('#kca-login-form')?.addEventListener('submit', submitLogin);
    return modal;
  }

  function extractQrToken(value) {
    const raw = String(value || '').trim();
    if (/^[0-9a-f]{64}$/i.test(raw)) return raw.toLowerCase();
    try {
      const url = new URL(raw, location.href);
      if (url.origin !== location.origin) return '';
      const hashMatch = String(url.hash || '').match(/(?:^#|[&#])kcqr=([0-9a-f]{64})(?:$|[&#])/i);
      const token = String(url.searchParams.get('kcqr') || hashMatch?.[1] || '').trim();
      return /^[0-9a-f]{64}$/i.test(token) ? token.toLowerCase() : '';
    } catch (_) {
      return '';
    }
  }

  function stopQrScanner() {
    if (qrScanTimer) clearInterval(qrScanTimer);
    qrScanTimer = 0;
    if (qrStream) {
      for (const track of qrStream.getTracks()) track.stop();
      qrStream = null;
    }
    document.getElementById(QR_SCAN_MODAL_ID)?.classList.add('hidden');
  }

  function ensureQrScannerModal() {
    let modal = document.getElementById(QR_SCAN_MODAL_ID);
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = QR_SCAN_MODAL_ID;
    modal.className = 'hidden';
    modal.innerHTML = `
      <div class="kca-qr-card">
        <h2>📷 QR 카드를 보여 주세요</h2>
        <p>초록 네모 안에 QR 코드가 들어오게 비춰 주세요.</p>
        <div class="kca-qr-video-wrap"><video id="kca-qr-video" playsinline muted></video><div class="kca-qr-frame"></div></div>
        <div class="kca-qr-error" id="kca-qr-scan-error" aria-live="polite"></div>
        <div class="kca-qr-buttons"><button class="kca-qr-cancel" type="button">취소</button><span></span></div>
        <p>카메라 인식이 안 되는 기기는 기본 카메라 앱으로 QR을 찍어도 Kidscade가 바로 열립니다.</p>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector('.kca-qr-cancel')?.addEventListener('click', stopQrScanner);
    modal.addEventListener('click', event => { if (event.target === modal) stopQrScanner(); });
    return modal;
  }

  async function startQrScanner() {
    const modal = ensureQrScannerModal();
    const error = modal.querySelector('#kca-qr-scan-error');
    if (error) error.textContent = '';
    if (!navigator.mediaDevices?.getUserMedia || typeof window.BarcodeDetector !== 'function') {
      if (error) error.textContent = '이 브라우저에서는 화면 안 카메라 스캔을 지원하지 않아요. 기본 카메라 앱으로 QR 카드를 찍어 주세요.';
      modal.classList.remove('hidden');
      return;
    }
    stopQrScanner();
    modal.classList.remove('hidden');
    try {
      const video = modal.querySelector('#kca-qr-video');
      qrStream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:{ ideal:'environment' } }, audio:false });
      video.srcObject = qrStream;
      await video.play();
      const detector = new window.BarcodeDetector({ formats:['qr_code'] });
      let detecting = false;
      qrScanTimer = setInterval(async () => {
        if (detecting || !qrStream) return;
        detecting = true;
        try {
          const codes = await detector.detect(video);
          const token = extractQrToken(codes?.[0]?.rawValue || '');
          if (token) {
            stopQrScanner();
            await handleQrToken(token);
          }
        } catch (_) {
        } finally {
          detecting = false;
        }
      }, 320);
    } catch (_) {
      if (error) error.textContent = '카메라를 열 수 없어요. 카메라 권한을 허용하거나 기본 카메라 앱으로 QR을 찍어 주세요.';
    }
  }

  function closeQrConfirm() {
    document.getElementById(QR_CONFIRM_MODAL_ID)?.classList.add('hidden');
    const loginModal = document.getElementById(MODAL_ID);
    document.body.style.overflow = loginModal && !loginModal.classList.contains('hidden') ? 'hidden' : '';
  }

  function ensureQrConfirmModal() {
    let modal = document.getElementById(QR_CONFIRM_MODAL_ID);
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = QR_CONFIRM_MODAL_ID;
    modal.className = 'hidden';
    modal.innerHTML = `
      <div class="kca-qr-card">
        <h2>✨ 내 카드가 맞나요?</h2>
        <div class="kca-qr-person"><strong id="kca-qr-name">새싹 게이머</strong><span id="kca-qr-class"></span><span id="kca-qr-id"></span></div>
        <p>친구 카드가 아니라 내 카드가 맞으면 들어가요.</p>
        <div class="kca-qr-error" id="kca-qr-confirm-error" aria-live="polite"></div>
        <div class="kca-qr-buttons"><button class="kca-qr-confirm-go" type="button">응, 들어갈래!</button><button class="kca-qr-cancel" type="button">아니야</button></div>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector('.kca-qr-cancel')?.addEventListener('click', closeQrConfirm);
    modal.addEventListener('click', event => { if (event.target === modal) closeQrConfirm(); });
    return modal;
  }

  async function switchAccountForQr(targetLoginId) {
    if (!account || account.loginId === targetLoginId) return;
    try { await syncNow(); } catch (_) {}
    const path = account.role === 'teacher' ? '/api/teacher/auth/logout' : '/api/account/logout';
    try { await api(path, { method:'POST', body:'{}' }); } catch (_) {}
    account = null;
    emitAccountChanged();
    economySummary = null;
    economySummaryLoaded = false;
    clearLocalAccountProgress();
  }

  async function finishQrLogin(body) {
    account = body.account;
    emitAccountChanged();
    const localState = collectState();
    if (Number(account.revision || 0) === 0 && hasMeaningfulProgress(localState)) {
      await syncNow(localState);
    } else if (Number(account.revision || 0) > 0) {
      applyCloudState(body.state || {});
      writeMeta({ loginId:account.loginId, revision:account.revision });
      closeQrConfirm();
      closeLogin();
      location.reload();
      return;
    } else {
      writeMeta({ loginId:account.loginId, revision:0 });
    }
    closeQrConfirm();
    closeLogin();
    economySummary = null;
    economySummaryLoaded = false;
    renderSlot();
    loadEconomySummary();
  }

  async function confirmQrLogin(token, student, button, error) {
    if (button) { button.disabled = true; button.textContent = '들어가는 중...'; }
    if (error) error.textContent = '';
    try {
      await switchAccountForQr(student?.loginId || '');
      const { response, body } = await api('/api/account/qr-login', { method:'POST', body:JSON.stringify({ token }) });
      if (!response.ok || !body.ok) {
        if (error) error.textContent = errorText(body.error, body);
        return;
      }
      await finishQrLogin(body);
    } catch (_) {
      if (error) error.textContent = '네트워크 연결을 확인해 주세요.';
    } finally {
      if (button?.isConnected) { button.disabled = false; button.textContent = '응, 들어갈래!'; }
    }
  }

  async function handleQrToken(token) {
    const normalized = extractQrToken(token);
    if (!normalized) return;
    try {
      const { response, body } = await api('/api/account/qr-preview', { method:'POST', body:JSON.stringify({ token:normalized }) });
      if (!response.ok || !body.ok || !body.student) {
        alert(errorText(body.error, body));
        return;
      }
      const modal = ensureQrConfirmModal();
      modal.querySelector('#kca-qr-name').textContent = body.student.nickname || '새싹 게이머';
      modal.querySelector('#kca-qr-class').textContent = body.student.className || '';
      modal.querySelector('#kca-qr-id').textContent = body.student.loginId || '';
      const error = modal.querySelector('#kca-qr-confirm-error');
      if (error) error.textContent = '';
      const go = modal.querySelector('.kca-qr-confirm-go');
      go.onclick = () => confirmQrLogin(normalized, body.student, go, error);
      modal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    } catch (_) {
      alert('QR 카드를 확인하지 못했어요. 네트워크 연결을 확인해 주세요.');
    }
  }

  function consumeQrFromUrl() {
    const url = new URL(location.href);
    const token = extractQrToken(url.toString());
    if (!token) return;
    url.searchParams.delete('kcqr');
    if (/^#kcqr=/i.test(url.hash)) url.hash = '';
    const next = url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : '') + url.hash;
    try { history.replaceState(history.state, '', next); } catch (_) {}
    handleQrToken(token);
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

  function economyCardView() {
    if (!economySummaryLoaded) {
      return {
        badge:'열기',
        attention:false,
        meta:'월급 · 직업 · 은행 · 상점',
        status:'학급경제로 들어가기'
      };
    }
    if (economySummary?.enabled === false) {
      return {
        badge:'준비 중',
        attention:false,
        meta:'학급경제',
        status:'선생님이 학급경제를 시작하면 사용할 수 있어요.'
      };
    }
    if (!economySummary?.enabled) {
      return {
        badge:'열기',
        attention:false,
        meta:'월급 · 직업 · 은행 · 상점',
        status:'학급경제로 들어가기'
      };
    }

    const currency = String(economySummary.currency || '뚝');
    const balance = Math.max(0,Math.round(Number(economySummary.balance || 0))).toLocaleString('ko-KR');
    const jobName = economySummary.job?.name || '직업 미배정';
    if (economySummary.workLogDue) {
      return {
        badge:'확인',
        attention:true,
        meta:'내 현금 ' + balance + currency + ' · ' + jobName,
        status:'이번 급여 회차 근무일지 제출 필요'
      };
    }
    if (Number(economySummary.capabilityCount || 0) > 0) {
      return {
        badge:'업무',
        attention:false,
        meta:'내 현금 ' + balance + currency + ' · ' + jobName,
        status:'직업 전용 업무가 열려 있어요.'
      };
    }
    return {
      badge:'열기',
      attention:false,
      meta:'내 현금 ' + balance + currency + ' · ' + jobName,
      status:'월급 · 은행 · 상점 이용하기'
    };
  }

  async function loadEconomySummary() {
    if (!account || account.role === 'teacher' || economySummaryLoading) return;
    economySummaryLoading = true;
    try {
      const { response, body } = await api('/api/economy/summary');
      if (response.ok && body.ok) {
        economySummary = body;
      } else if (body?.error === 'economy_not_enabled') {
        economySummary = { enabled:false };
      } else {
        economySummary = { enabled:null };
      }
    } catch (_) {
      economySummary = { enabled:null };
    } finally {
      economySummaryLoaded = true;
      economySummaryLoading = false;
      renderSlot();
    }
  }

  // The body observer also sees this slot's own writes. Preserve unchanged
  // nodes so its callback settles instead of starving rendering and input.
  const slotMarkup = new WeakMap();
  function updateSlot(slot, markup, selector, handler) {
    if (slotMarkup.get(slot) === markup && slot.firstChild) return;
    slot.innerHTML = markup;
    slotMarkup.set(slot, markup);
    slot.querySelector(selector)?.addEventListener('click', handler);
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
      updateSlot(slot, `<div class="kca-row"><div class="kca-copy"><div class="kca-title">☁️ 기록을 안전하게 보관하기</div><div class="kca-sub">발급받은 계정으로 다른 기기에서도 이어서 플레이</div></div><button type="button" data-kca-login>로그인</button></div>`, '[data-kca-login]', openLogin);
      return true;
    }
    if (account.role === 'teacher') {
      const teacherEconomyHref = '/teacher/economy.html?classId=' + encodeURIComponent(account.classId || '') + '&className=' + encodeURIComponent(account.className || '');
      updateSlot(slot, `<div class="kca-row"><div class="kca-copy"><div class="kca-title">👩‍🏫 ${escapeHtml(account.loginId)}</div><div class="kca-sub">${escapeHtml(account.className || 'Kidscade')} 교사 · 게임 기록 동기화됨</div></div><div class="kca-buttons"><button class="kca-logout" type="button" data-kca-logout>↪ 로그아웃</button></div></div><div class="kca-teacher-actions"><a class="kca-teacher-action manage" href="/teacher/"><span class="kca-action-icon" aria-hidden="true">👩‍🏫</span><span class="kca-action-copy"><strong>교사 관리</strong><span>학생 계정 · 반 관리</span></span><span class="kca-action-arrow" aria-hidden="true">›</span></a><a class="kca-teacher-action economy" href="${escapeHtml(teacherEconomyHref)}"><span class="kca-action-icon" aria-hidden="true">💰</span><span class="kca-action-copy"><strong>학급경제 관리</strong><span>급여 · 은행 · 부동산</span></span><span class="kca-action-arrow" aria-hidden="true">›</span></a></div>`, '[data-kca-logout]', logout);
      return true;
    }
    const economyView = economyCardView();
    updateSlot(slot, `<div class="kca-row"><div class="kca-copy"><div class="kca-title">☁️ ${escapeHtml(account.loginId)}</div><div class="kca-sub">${escapeHtml(account.className || 'Kidscade')} · 동기화됨</div></div><div class="kca-buttons"><button class="kca-logout" type="button" data-kca-logout>로그아웃</button></div></div><a class="kca-economy-card" href="/economy.html" aria-label="학급경제 열기"><span class="kca-economy-icon">💰</span><span class="kca-economy-copy"><span class="kca-economy-title">학급경제 <span class="kca-economy-badge ${economyView.attention ? 'attention' : ''}">${escapeHtml(economyView.badge)}</span></span><span class="kca-economy-meta">${escapeHtml(economyView.meta)}</span><span class="kca-economy-status ${economyView.attention ? 'attention' : ''}">${escapeHtml(economyView.status)}</span></span><span class="kca-economy-arrow">›</span></a>`, '[data-kca-logout]', logout);
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
    const credential = String(pinInput?.value || '');
    const isTeacher = loginId.startsWith('KT-');
    const pin = isTeacher ? credential : credential.replace(/\D/g, '').slice(0, 6);
    if (error) error.textContent = '';
    if (!loginId || (!isTeacher && pin.length !== 6) || (isTeacher && (credential.length < 6 || credential.length > 64))) {
      if (error) error.textContent = isTeacher ? '교사 ID와 비밀번호를 입력해 주세요.' : '학생 ID와 6자리 PIN을 입력해 주세요.';
      return;
    }
    const button = event.currentTarget.querySelector('.kca-login');
    if (button) { button.disabled = true; button.textContent = '확인 중...'; }
    try {
      const loginPath = isTeacher ? '/api/teacher/auth/login' : '/api/account/login';
      const loginBody = isTeacher ? { loginId, password:credential } : { loginId, pin };
      const { response, body } = await api(loginPath, { method:'POST', body:JSON.stringify(loginBody) });
      if (!response.ok || !body.ok) {
        if (error) error.textContent = errorText(body.error, body);
        return;
      }
      account = body.account;
      emitAccountChanged();
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
      economySummary = null;
      economySummaryLoaded = false;
      renderSlot();
      if (account.role !== 'teacher') loadEconomySummary();
    } catch (_) {
      if (error) error.textContent = '네트워크 연결을 확인해 주세요.';
    } finally {
      if (button) { button.disabled = false; button.textContent = '로그인'; }
    }
  }

  async function syncNow(forcedState = null) {
    if (!account || syncing || applyingCloud) return false;
    const state = forcedState || collectState();
    const signature = stateSignature(state);
    const loginId = account.loginId;
    const isAlreadySynced = () => {
      if (forcedState) return false;
      const shared = readSharedSyncMeta();
      return shared.loginId === loginId && shared.signature === signature;
    };
    syncing = true;
    try {
      return await runCoordinatedSync(isAlreadySynced, async () => {
        const syncPath = account.role === 'teacher' ? '/api/teacher/auth/sync' : '/api/account/sync';
        const { response, body } = await api(syncPath, { method:'POST', body:JSON.stringify({ state }) });
        if (!response.ok || !body.ok) return false;
        account = body.account;
        emitAccountChanged();
        writeMeta({ loginId: account.loginId, revision: account.revision });
        writeSharedSyncMeta({
          loginId: account.loginId,
          signature,
          revision: Number(account.revision || 0),
          syncedAt: Date.now()
        });
        renderSlot();
        return true;
      });
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
      'profile','playHistory','seeds','sproutPower','avatarInventory','avatarEquipped','inventory','equipped',
      'pet','petItems','gardenState','recents','favorites','dailyMissions','dailyRewardClaimed','attendance'
    ].forEach(key => { try { s.remove(key); } catch (_) {} });
    writeMeta({});
    try {
      localStorage.removeItem(SHARED_SYNC_META_KEY);
      localStorage.removeItem(SYNC_LEASE_KEY);
    } catch (_) {}
  }

  async function logout() {
    if (!account) return;
    await syncNow();
    const logoutPath = account.role === 'teacher' ? '/api/teacher/auth/logout' : '/api/account/logout';
    try { await api(logoutPath, { method:'POST', body:'{}' }); } catch (_) {}
    account = null;
    emitAccountChanged();
    economySummary = null;
    economySummaryLoaded = false;
    clearLocalAccountProgress();
    location.reload();
  }

  async function checkSession() {
    try {
      let { response, body } = await api('/api/account/me');
      if (!response.ok || !body.ok) {
        const teacherSession = await api('/api/teacher/auth/me');
        if (teacherSession.response.ok && teacherSession.body.ok && teacherSession.body.account) {
          response = teacherSession.response;
          body = teacherSession.body;
        }
      }
      if (response.status === 503 && ['account_schema_not_ready','account_secret_not_configured','account_database_not_configured','teacher_schema_not_ready'].includes(body.error)) {
        available = false;
        return;
      }
      if (!response.ok || !body.ok || !body.account) {
        account = null;
        emitAccountChanged();
        economySummary = null;
        economySummaryLoaded = false;
        renderSlot();
        return;
      }
      account = body.account;
      emitAccountChanged();
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
      if (account.role !== 'teacher') loadEconomySummary();
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
    checkSession().finally(consumeQrFromUrl);
    document.addEventListener('kidscade:profile-history-changed', scheduleSync);
    document.addEventListener('kidscade:storage-changed', scheduleSync);
    window.addEventListener('storage', event => {
      if (event.key === SHARED_SYNC_META_KEY || event.key === SYNC_LEASE_KEY) return;
      scheduleSync();
    });
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

(() => {
  'use strict';

  const ENTRY_ID = 'kc-seed-ranking-entry';
  const MODAL_ID = 'kc-seed-ranking-modal';
  const STYLE_ID = 'kc-seed-ranking-style';
  const PENDING_KEY = 'kc_seed_rank_pending_v1';
  const FLUSH_DELAY_MS = 800;
  const REFRESH_AFTER_EARN_MS = 2200;

  let observedLoginId = '';
  let lastBalance = null;
  let pendingDelta = 0;
  let flushTimer = 0;
  let refreshTimer = 0;
  let flushInFlight = false;
  let rankingData = null;
  let activeMode = 'balance';

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[ch]));

  function account() {
    return window.KidscadeAccount?.account || null;
  }

  function storage() {
    return window.KidscadeStorage || null;
  }

  function readBalance() {
    try { return Math.max(0, storage()?.getInt?.('seeds', 0) || 0); } catch (_) { return 0; }
  }

  function seedsPhysicalKey() {
    try { return storage()?.resolveKey?.('seeds') || 'kidscade_coins'; } catch (_) { return 'kidscade_coins'; }
  }

  function readPending(loginId) {
    try {
      const saved = JSON.parse(sessionStorage.getItem(PENDING_KEY) || '{}') || {};
      if (saved.loginId !== loginId) return 0;
      return Math.max(0, Math.floor(Number(saved.delta || 0)));
    } catch (_) { return 0; }
  }

  function writePending(loginId, delta) {
    try {
      if (!loginId || delta <= 0) sessionStorage.removeItem(PENDING_KEY);
      else sessionStorage.setItem(PENDING_KEY, JSON.stringify({ loginId, delta: Math.floor(delta) }));
    } catch (_) {}
  }

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${ENTRY_ID}{margin-top:6px}
      #${ENTRY_ID} button{width:100%;min-height:38px;border:1px solid rgba(245,158,11,.24);border-radius:12px;padding:0 10px;background:linear-gradient(135deg,rgba(255,247,237,.96),rgba(254,249,195,.96));color:#92400e;font-weight:1000;font-size:.68rem;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:8px}
      #${ENTRY_ID} button span:last-child{font-size:.58rem;color:#a16207;font-weight:850}
      body.dark-mode #${ENTRY_ID} button{background:linear-gradient(135deg,rgba(120,53,15,.32),rgba(113,63,18,.22));color:#fde68a;border-color:rgba(251,191,36,.24)}
      #${MODAL_ID}{position:fixed;inset:0;z-index:17000;display:grid;place-items:center;padding:18px;background:rgba(15,23,42,.56);backdrop-filter:blur(8px)}
      #${MODAL_ID}.hidden{display:none!important}
      #${MODAL_ID} .ksr-card{width:min(460px,100%);max-height:min(720px,calc(100vh - 36px));overflow:auto;border-radius:24px;background:#fff;color:#334155;padding:20px;box-shadow:0 28px 70px rgba(15,23,42,.3)}
      body.dark-mode #${MODAL_ID} .ksr-card{background:#1e293b;color:#f8fafc}
      #${MODAL_ID} .ksr-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
      #${MODAL_ID} h2{margin:0;font-size:1.22rem;letter-spacing:-.04em}
      #${MODAL_ID} .ksr-sub{margin-top:4px;color:#64748b;font-size:.7rem;font-weight:800}
      body.dark-mode #${MODAL_ID} .ksr-sub{color:#cbd5e1}
      #${MODAL_ID} .ksr-close{width:38px;height:38px;border:0;border-radius:12px;background:#f1f5f9;color:#64748b;font-size:1rem;font-weight:1000;cursor:pointer}
      body.dark-mode #${MODAL_ID} .ksr-close{background:#334155;color:#e2e8f0}
      #${MODAL_ID} .ksr-tabs{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:15px;padding:4px;border-radius:14px;background:#f8fafc}
      body.dark-mode #${MODAL_ID} .ksr-tabs{background:#0f172a}
      #${MODAL_ID} .ksr-tab{min-height:40px;border:0;border-radius:11px;background:transparent;color:#64748b;font-weight:1000;font-size:.72rem;cursor:pointer}
      #${MODAL_ID} .ksr-tab.active{background:#fff;color:#7c3aed;box-shadow:0 4px 12px rgba(15,23,42,.08)}
      body.dark-mode #${MODAL_ID} .ksr-tab.active{background:#334155;color:#ddd6fe}
      #${MODAL_ID} .ksr-list{display:grid;gap:7px;margin-top:13px}
      #${MODAL_ID} .ksr-row{display:grid;grid-template-columns:42px 1fr auto;gap:9px;align-items:center;min-height:46px;padding:8px 10px;border:1px solid #eef2f7;border-radius:13px;background:#fff}
      body.dark-mode #${MODAL_ID} .ksr-row{background:#263244;border-color:#334155}
      #${MODAL_ID} .ksr-row.self{border-color:#c4b5fd;background:#faf8ff;box-shadow:0 0 0 1px rgba(124,92,255,.08)}
      body.dark-mode #${MODAL_ID} .ksr-row.self{background:#312e55;border-color:#8b5cf6}
      #${MODAL_ID} .ksr-rank{font-size:.86rem;font-weight:1000;text-align:center}
      #${MODAL_ID} .ksr-name{min-width:0;font-size:.76rem;font-weight:1000;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      #${MODAL_ID} .ksr-name small{margin-left:5px;color:#7c3aed;font-size:.58rem}
      #${MODAL_ID} .ksr-value{font-size:.77rem;font-weight:1000;color:#15803d;white-space:nowrap}
      body.dark-mode #${MODAL_ID} .ksr-value{color:#86efac}
      #${MODAL_ID} .ksr-divider{margin:4px 0;border-top:1px dashed #dbe1ea}
      #${MODAL_ID} .ksr-note{margin-top:12px;padding:9px 10px;border-radius:11px;background:#f8fafc;color:#64748b;font-size:.62rem;line-height:1.45;font-weight:750}
      body.dark-mode #${MODAL_ID} .ksr-note{background:#0f172a;color:#94a3b8}
      #${MODAL_ID} .ksr-empty{padding:30px 12px;text-align:center;color:#94a3b8;font-size:.75rem;font-weight:900}
      #${MODAL_ID} .ksr-refresh{margin-top:11px;width:100%;min-height:40px;border:0;border-radius:12px;background:#eef2ff;color:#5b3fd1;font-weight:1000;cursor:pointer}
      @media(max-width:620px){
        #${MODAL_ID}{place-items:end center;padding:0}
        #${MODAL_ID} .ksr-card{width:100%;max-height:min(78vh,720px);border-radius:24px 24px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom))}
        #${MODAL_ID} .ksr-card::before{content:'';display:block;width:44px;height:5px;border-radius:999px;background:#cbd5e1;margin:-6px auto 12px}
      }
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
      <section class="ksr-card" role="dialog" aria-modal="true" aria-label="우리 반 씨앗 랭킹">
        <div class="ksr-head">
          <div><h2>🏆 우리 반 씨앗 랭킹</h2><div class="ksr-sub" id="ksr-class-name">불러오는 중...</div></div>
          <button type="button" class="ksr-close" aria-label="닫기">✕</button>
        </div>
        <div class="ksr-tabs">
          <button type="button" class="ksr-tab active" data-mode="balance">🌱 보유 씨앗</button>
          <button type="button" class="ksr-tab" data-mode="weekly">⭐ 이번 주 획득</button>
        </div>
        <div class="ksr-list" id="ksr-list"><div class="ksr-empty">랭킹을 불러오는 중...</div></div>
        <button type="button" class="ksr-refresh" id="ksr-refresh">새로고침</button>
        <div class="ksr-note">닉네임만 공개돼요. 이번 주 획득 씨앗은 로그인한 상태에서 새로 얻은 씨앗을 월요일부터 집계합니다.</div>
      </section>
    `;
    document.body.appendChild(modal);
    modal.querySelector('.ksr-close')?.addEventListener('click', closeModal);
    modal.addEventListener('click', event => { if (event.target === modal) closeModal(); });
    modal.querySelectorAll('[data-mode]').forEach(button => {
      button.addEventListener('click', () => {
        activeMode = button.dataset.mode === 'weekly' ? 'weekly' : 'balance';
        renderRanking();
      });
    });
    modal.querySelector('#ksr-refresh')?.addEventListener('click', refreshRanking);
    return modal;
  }

  function closeModal() {
    document.getElementById(MODAL_ID)?.classList.add('hidden');
    document.body.style.overflow = '';
  }

  function openModal() {
    const modal = ensureModal();
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    refreshRanking();
  }

  function renderEntry() {
    installStyles();
    const acct = account();
    const host = document.getElementById('kc-profile-identity');
    let entry = document.getElementById(ENTRY_ID);
    if (!acct || !host) {
      entry?.remove();
      return false;
    }
    if (!entry) {
      entry = document.createElement('div');
      entry.id = ENTRY_ID;
      const accountSlot = document.getElementById('kc-account-slot');
      if (accountSlot?.parentElement === host) accountSlot.insertAdjacentElement('afterend', entry);
      else host.appendChild(entry);
    }
    entry.innerHTML = '<button type="button"><span>🏆 우리 반 씨앗 랭킹</span><span>보유 · 이번 주 획득 ›</span></button>';
    entry.querySelector('button')?.addEventListener('click', openModal);
    return true;
  }

  function rankMark(rank) {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `${rank}위`;
  }

  function renderRow(row) {
    return `<div class="ksr-row${row.self ? ' self' : ''}">
      <div class="ksr-rank">${escapeHtml(rankMark(Number(row.rank || 0)))}</div>
      <div class="ksr-name">${escapeHtml(row.nickname || '새싹 게이머')}${row.self ? '<small>나</small>' : ''}</div>
      <div class="ksr-value">🌱 ${Number(row.value || 0).toLocaleString('ko-KR')}</div>
    </div>`;
  }

  function renderRanking() {
    const modal = ensureModal();
    modal.querySelectorAll('[data-mode]').forEach(button => {
      button.classList.toggle('active', button.dataset.mode === activeMode);
    });
    const host = modal.querySelector('#ksr-list');
    const className = modal.querySelector('#ksr-class-name');
    if (!host) return;
    if (!rankingData) {
      host.innerHTML = '<div class="ksr-empty">랭킹을 불러오는 중...</div>';
      return;
    }
    if (className) className.textContent = `${rankingData.className || '우리 반'} · ${rankingData.memberCount || 0}명`;
    const bucket = activeMode === 'weekly' ? rankingData.weekly : rankingData.balance;
    const top = Array.isArray(bucket?.top) ? bucket.top : [];
    if (!top.length || top.every(row => Number(row.value || 0) === 0)) {
      host.innerHTML = `<div class="ksr-empty">${activeMode === 'weekly' ? '아직 이번 주에 획득한 씨앗 기록이 없어요.' : '아직 보유 씨앗 기록이 없어요.'}</div>`;
      return;
    }
    let html = top.map(renderRow).join('');
    const self = bucket?.self;
    if (self && !top.some(row => row.self)) {
      html += `<div class="ksr-divider"></div>${renderRow(self)}`;
    }
    host.innerHTML = html;
  }

  async function refreshRanking() {
    const host = ensureModal().querySelector('#ksr-list');
    if (host && !rankingData) host.innerHTML = '<div class="ksr-empty">랭킹을 불러오는 중...</div>';
    try {
      const response = await fetch('/api/account/seed-ranking', { credentials:'same-origin', cache:'no-store' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.ok) {
        const message = body.error === 'seed_ranking_schema_not_ready'
          ? '씨앗 랭킹 서버를 준비 중이에요.'
          : body.error === 'not_authenticated' || body.error === 'session_expired'
            ? '로그인한 뒤 랭킹을 볼 수 있어요.'
            : '랭킹을 불러오지 못했어요.';
        if (host) host.innerHTML = `<div class="ksr-empty">${escapeHtml(message)}</div>`;
        return;
      }
      rankingData = body;
      renderRanking();
    } catch (_) {
      if (host) host.innerHTML = '<div class="ksr-empty">네트워크 연결을 확인해 주세요.</div>';
    }
  }

  function scheduleFlush() {
    clearTimeout(flushTimer);
    flushTimer = setTimeout(() => flushPending(false), FLUSH_DELAY_MS);
  }

  async function flushPending(keepalive = false) {
    const acct = account();
    if (!acct?.loginId || flushInFlight || pendingDelta <= 0 || acct.loginId !== observedLoginId) return;
    const amount = Math.min(100000, pendingDelta);
    flushInFlight = true;
    try {
      const response = await fetch('/api/account/seed-earned', {
        method:'POST',
        credentials:'same-origin',
        keepalive,
        headers:{ 'content-type':'application/json' },
        body:JSON.stringify({ delta: amount })
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.ok) return;
      pendingDelta = Math.max(0, pendingDelta - amount);
      writePending(observedLoginId, pendingDelta);
      if (pendingDelta > 0) scheduleFlush();
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        if (!document.getElementById(MODAL_ID)?.classList.contains('hidden')) refreshRanking();
      }, REFRESH_AFTER_EARN_MS);
    } catch (_) {
      // Keep the pending delta in sessionStorage and retry when the browser is online again.
    } finally {
      flushInFlight = false;
    }
  }

  function onStorageChanged(event) {
    if (event?.detail?.key !== seedsPhysicalKey()) return;
    const current = readBalance();
    const acct = account();
    if (!acct?.loginId || acct.loginId !== observedLoginId || lastBalance === null) {
      lastBalance = current;
      return;
    }
    const delta = current - lastBalance;
    lastBalance = current;
    if (delta <= 0) return;
    pendingDelta += delta;
    writePending(observedLoginId, pendingDelta);
    scheduleFlush();
  }

  function syncAccount() {
    const acct = account();
    const loginId = String(acct?.loginId || '');
    if (loginId === observedLoginId) {
      if (loginId) renderEntry();
      return;
    }
    observedLoginId = loginId;
    rankingData = null;
    lastBalance = readBalance();
    if (!loginId) {
      pendingDelta = 0;
      document.getElementById(ENTRY_ID)?.remove();
      closeModal();
      return;
    }
    pendingDelta = readPending(loginId);
    renderEntry();
    if (pendingDelta > 0) scheduleFlush();
  }

  function start() {
    installStyles();
    ensureModal();
    syncAccount();
    setInterval(syncAccount, 500);
    document.addEventListener('kidscade:storage-changed', onStorageChanged);
    window.addEventListener('online', scheduleFlush);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flushPending(true);
    });
  }

  window.KidscadeSeedRanking = Object.freeze({
    open: openModal,
    refresh: refreshRanking,
    flush: flushPending
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();

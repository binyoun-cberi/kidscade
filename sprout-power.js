(() => {
  'use strict';

  const ENTRY_ID = 'kc-sprout-power-entry';
  const MODAL_ID = 'kc-sprout-power-modal';
  const STYLE_ID = 'kc-sprout-power-style';
  const PENDING_KEY = 'kc_sprout_power_pending_v1';
  const MAX_BATCH = 500;
  let loginId = '';
  let pending = 0;
  let flushing = false;
  let ranking = null;
  let mode = 'weekly';
  let flushTimer = 0;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[ch]));

  function account() { return window.KidscadeAccount?.account || null; }
  function store() { return window.KidscadeStorage || null; }
  function currentPower() {
    try { return Math.max(0, store()?.getInt?.('sproutPower', 0) || 0); } catch (_) { return 0; }
  }
  function setPower(value) {
    const next = Math.max(0, Math.floor(Number(value || 0)));
    try { store()?.setRaw?.('sproutPower', next); } catch (_) {}
    return next;
  }
  function levelFor(power) {
    const value = Math.max(0, Number(power || 0));
    return Math.max(1, Math.floor(Math.sqrt(value / 25)) + 1);
  }

  function loadPending(id) {
    try {
      const saved = JSON.parse(sessionStorage.getItem(PENDING_KEY) || '{}') || {};
      return saved.loginId === id ? Math.max(0, Math.floor(Number(saved.delta || 0))) : 0;
    } catch (_) { return 0; }
  }
  function savePending() {
    try {
      if (!loginId || pending <= 0) sessionStorage.removeItem(PENDING_KEY);
      else sessionStorage.setItem(PENDING_KEY, JSON.stringify({ loginId, delta: pending }));
    } catch (_) {}
  }

  function installStyles() {
    if (document.getElementById(STYLE_ID) || !document.head) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${ENTRY_ID}{margin:8px 0 7px}
      #${ENTRY_ID} button{width:100%;min-height:50px;border:1px solid rgba(124,92,255,.28);border-radius:14px;padding:7px 11px;background:linear-gradient(135deg,#f3e8ff,#eef2ff);color:#5b21b6;font-size:.77rem;font-weight:1000;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:8px;box-shadow:0 7px 16px rgba(124,92,255,.10)}
      #${ENTRY_ID} button:hover{transform:translateY(-1px);box-shadow:0 10px 20px rgba(124,92,255,.14)}
      #${ENTRY_ID} button span:last-child{font-size:.62rem;color:#6d4fd7;white-space:nowrap}
      body.dark-mode #${ENTRY_ID} button{background:linear-gradient(135deg,rgba(91,33,182,.38),rgba(49,46,129,.35));color:#ede9fe;border-color:rgba(196,181,253,.28)}
      #${MODAL_ID}{position:fixed;inset:0;z-index:32000;display:grid;place-items:center;padding:18px;background:rgba(15,23,42,.58);backdrop-filter:blur(8px)}
      #${MODAL_ID}.hidden{display:none!important}
      #${MODAL_ID} .card{width:min(470px,100%);max-height:calc(100dvh - 36px);overflow:auto;border-radius:24px;background:#fff;color:#334155;padding:20px;box-shadow:0 28px 70px rgba(15,23,42,.3)}
      body.dark-mode #${MODAL_ID} .card{background:#1e293b;color:#f8fafc}
      #${MODAL_ID} .head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
      #${MODAL_ID} h2{margin:0;font-size:1.2rem;letter-spacing:-.04em}
      #${MODAL_ID} .sub{margin-top:4px;color:#64748b;font-size:.7rem;font-weight:800}
      body.dark-mode #${MODAL_ID} .sub{color:#cbd5e1}
      #${MODAL_ID} .close{width:38px;height:38px;border:0;border-radius:12px;background:#f1f5f9;color:#64748b;font-size:1rem;font-weight:1000;cursor:pointer}
      #${MODAL_ID} .mine{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:13px;padding:12px 13px;border-radius:14px;background:linear-gradient(135deg,#f5f3ff,#eef2ff);border:1px solid #ddd6fe}
      #${MODAL_ID} .mine strong{font-size:1.05rem;color:#6d28d9}
      #${MODAL_ID} .mine span{font-size:.65rem;font-weight:900;color:#7c3aed}
      #${MODAL_ID} .tabs{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:12px;padding:4px;border-radius:14px;background:#f8fafc}
      body.dark-mode #${MODAL_ID} .tabs{background:#0f172a}
      #${MODAL_ID} .tab{min-height:40px;border:0;border-radius:11px;background:transparent;color:#64748b;font-size:.72rem;font-weight:1000;cursor:pointer}
      #${MODAL_ID} .tab.active{background:#fff;color:#7c3aed;box-shadow:0 4px 12px rgba(15,23,42,.08)}
      body.dark-mode #${MODAL_ID} .tab.active{background:#334155;color:#ddd6fe}
      #${MODAL_ID} .list{display:grid;gap:7px;margin-top:13px}
      #${MODAL_ID} .row{display:grid;grid-template-columns:42px 1fr auto;gap:9px;align-items:center;min-height:46px;padding:8px 10px;border:1px solid #eef2f7;border-radius:13px;background:#fff}
      body.dark-mode #${MODAL_ID} .row{background:#263244;border-color:#334155}
      #${MODAL_ID} .row.self{border-color:#c4b5fd;background:#faf8ff}
      body.dark-mode #${MODAL_ID} .row.self{background:#312e55;border-color:#8b5cf6}
      #${MODAL_ID} .rank{font-size:.86rem;font-weight:1000;text-align:center}
      #${MODAL_ID} .name{min-width:0;font-size:.76rem;font-weight:1000;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      #${MODAL_ID} .name small{margin-left:5px;color:#7c3aed;font-size:.58rem}
      #${MODAL_ID} .value{font-size:.77rem;font-weight:1000;color:#6d28d9;white-space:nowrap}
      #${MODAL_ID} .divider{border-top:1px dashed #dbe1ea;margin:4px 0}
      #${MODAL_ID} .empty{padding:30px 12px;text-align:center;color:#94a3b8;font-size:.75rem;font-weight:900}
      #${MODAL_ID} .refresh{margin-top:11px;width:100%;min-height:40px;border:0;border-radius:12px;background:#eef2ff;color:#5b3fd1;font-weight:1000;cursor:pointer}
      #${MODAL_ID} .note{margin-top:12px;padding:9px 10px;border-radius:11px;background:#f8fafc;color:#64748b;font-size:.62rem;line-height:1.45;font-weight:750}
      body.dark-mode #${MODAL_ID} .note{background:#0f172a;color:#94a3b8}
      @media(max-width:620px){#${MODAL_ID}{place-items:end center;padding:0}#${MODAL_ID} .card{width:100%;max-height:80dvh;border-radius:24px 24px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom))}}
    `;
    document.head.appendChild(style);
  }

  function badge(rank) {
    return rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}위`;
  }
  function row(item) {
    return `<div class="row${item.self ? ' self' : ''}"><div class="rank">${esc(badge(Number(item.rank || 0)))}</div><div class="name">${esc(item.nickname || '새싹 게이머')}${item.self ? '<small>나</small>' : ''}</div><div class="value">🌟 ${Number(item.value || 0).toLocaleString('ko-KR')}</div></div>`;
  }

  function ensureModal() {
    installStyles();
    let modal = document.getElementById(MODAL_ID);
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.className = 'hidden';
    modal.innerHTML = `
      <section class="card" role="dialog" aria-modal="true" aria-label="우리 반 새싹력 랭킹">
        <div class="head"><div><h2>🌟 우리 반 새싹력 랭킹</h2><div class="sub" id="ksp-sub">불러오는 중...</div></div><button class="close" type="button">✕</button></div>
        <div class="mine"><div><span>내 새싹력</span><strong id="ksp-mine">🌟 0</strong></div><span id="ksp-level">Lv.1</span></div>
        <div class="tabs"><button class="tab active" data-mode="weekly" type="button">🔥 이번 주</button><button class="tab" data-mode="total" type="button">🏆 누적</button></div>
        <div class="list" id="ksp-list"><div class="empty">랭킹을 불러오는 중...</div></div>
        <button class="refresh" id="ksp-refresh" type="button">새로고침</button>
        <div class="note">새싹력은 게임 도전·미션·성취로 쌓이는 성장 기록이에요. 씨앗처럼 소비되지 않아요.</div>
      </section>`;
    document.body.appendChild(modal);
    modal.querySelector('.close')?.addEventListener('click', close);
    modal.addEventListener('click', event => { if (event.target === modal) close(); });
    modal.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => {
      mode = button.dataset.mode === 'total' ? 'total' : 'weekly';
      render();
    }));
    modal.querySelector('#ksp-refresh')?.addEventListener('click', refresh);
    return modal;
  }

  function render() {
    const modal = ensureModal();
    modal.querySelectorAll('[data-mode]').forEach(button => button.classList.toggle('active', button.dataset.mode === mode));
    const mine = currentPower();
    const mineEl = modal.querySelector('#ksp-mine');
    const levelEl = modal.querySelector('#ksp-level');
    if (mineEl) mineEl.textContent = '🌟 ' + mine.toLocaleString('ko-KR');
    if (levelEl) levelEl.textContent = 'Lv.' + levelFor(mine);
    const list = modal.querySelector('#ksp-list');
    if (!list) return;
    if (!ranking) {
      list.innerHTML = '<div class="empty">랭킹을 불러오는 중...</div>';
      return;
    }
    const sub = modal.querySelector('#ksp-sub');
    if (sub) sub.textContent = `${ranking.className || '우리 반'} · ${ranking.memberCount || 0}명`;
    const bucket = mode === 'total' ? ranking.total : ranking.weekly;
    const top = Array.isArray(bucket?.top) ? bucket.top : [];
    if (!top.length || top.every(item => Number(item.value || 0) === 0)) {
      list.innerHTML = `<div class="empty">${mode === 'weekly' ? '아직 이번 주 새싹력 기록이 없어요.' : '아직 새싹력 기록이 없어요.'}</div>`;
      return;
    }
    let html = top.map(row).join('');
    if (bucket?.self && !top.some(item => item.self)) html += `<div class="divider"></div>${row(bucket.self)}`;
    list.innerHTML = html;
  }

  function entry() {
    installStyles();
    const host = document.getElementById('kc-profile-identity');
    let el = document.getElementById(ENTRY_ID);
    if (!loginId || !host) {
      el?.remove();
      return;
    }
    if (!el) {
      el = document.createElement('div');
      el.id = ENTRY_ID;
      const accountSlot = document.getElementById('kc-account-slot');
      if (accountSlot?.parentElement === host) accountSlot.insertAdjacentElement('beforebegin', el);
      else host.appendChild(el);
    }
    const value = currentPower();
    el.innerHTML = `<button type="button"><span>🌟 새싹력 랭킹</span><span>Lv.${levelFor(value)} · ${value.toLocaleString('ko-KR')} ›</span></button>`;
    el.querySelector('button')?.addEventListener('click', open);
  }

  async function refresh() {
    const list = ensureModal().querySelector('#ksp-list');
    try {
      const response = await fetch('/api/account/sprout-power-ranking', { credentials:'same-origin', cache:'no-store' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.ok) {
        const message = body.error === 'sprout_power_schema_not_ready' ? '새싹력 서버를 준비 중이에요.' :
          ['not_authenticated','session_expired'].includes(body.error) ? '로그인한 뒤 랭킹을 볼 수 있어요.' : '랭킹을 불러오지 못했어요.';
        if (list) list.innerHTML = `<div class="empty">${esc(message)}</div>`;
        return;
      }
      ranking = body;
      render();
    } catch (_) {
      if (list) list.innerHTML = '<div class="empty">네트워크 연결을 확인해 주세요.</div>';
    }
  }

  function open() {
    const modal = ensureModal();
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    refresh();
  }
  function close() {
    document.getElementById(MODAL_ID)?.classList.add('hidden');
    document.body.style.overflow = '';
  }

  function scheduleFlush() {
    clearTimeout(flushTimer);
    flushTimer = setTimeout(flush, 450);
  }
  async function flush() {
    if (!loginId || flushing || pending <= 0 || account()?.loginId !== loginId) return;
    const amount = Math.min(MAX_BATCH, pending);
    flushing = true;
    try {
      const response = await fetch('/api/account/sprout-power-earned', {
        method:'POST',
        credentials:'same-origin',
        headers:{ 'content-type':'application/json' },
        body:JSON.stringify({ delta:amount })
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.ok) return;
      pending = Math.max(0, pending - amount);
      savePending();
      if (pending > 0) scheduleFlush();
    } catch (_) {
      // Keep the local pending amount and retry next time the page is active.
    } finally {
      flushing = false;
    }
  }

  function earn(amount, reason = '키즈케이드 활동') {
    const delta = Math.max(0, Math.min(500, Math.floor(Number(amount || 0))));
    if (!delta) return { ok:false, power:currentPower(), delta:0 };
    const power = setPower(currentPower() + delta);
    if (loginId) {
      pending += delta;
      savePending();
      scheduleFlush();
    }
    entry();
    document.dispatchEvent(new CustomEvent('kidscade:sprout-power-earned', { detail:{ delta, power, reason:String(reason || '') } }));
    return { ok:true, power, delta };
  }

  function poll() {
    const nextLogin = String(account()?.loginId || '');
    if (nextLogin !== loginId) {
      loginId = nextLogin;
      ranking = null;
      pending = loginId ? loadPending(loginId) : 0;
      if (!loginId) close();
      entry();
      if (pending > 0) scheduleFlush();
      return;
    }
    entry();
  }

  function start() {
    poll();
    setInterval(poll, 700);
    window.addEventListener('online', scheduleFlush);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && pending > 0) scheduleFlush();
    });
  }

  window.KidscadeSproutPower = Object.freeze({ earn, get:currentPower, open, refresh, levelFor });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();

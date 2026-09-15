(() => {
  'use strict';

  const GAME_ID = 'math_timing_lcd';
  const METRIC = 'exact_10_hits';
  const MODE = 'classic_v1';
  const LOCAL_KEY = 'kidscade_timing_exact10_local_v1';
  const SUBMIT_URL = '/api/account/game-records/submit';
  const RANKING_URL = `/api/account/game-records/ranking?gameId=${encodeURIComponent(GAME_ID)}&metric=${encodeURIComponent(METRIC)}&mode=${encodeURIComponent(MODE)}`;

  let lastAttemptSignature = '';
  let rankingOverlay = null;
  let rankingButton = null;
  let celebration = null;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
  }

  function localCount() {
    const value = Number(localStorage.getItem(LOCAL_KEY) || 0);
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  }

  function setLocalCount(value) {
    const count = Math.max(0, Math.floor(Number(value) || 0));
    try { localStorage.setItem(LOCAL_KEY, String(count)); } catch (_) {}
    updateButton(count);
    return count;
  }

  function updateButton(count = localCount()) {
    if (!rankingButton) return;
    rankingButton.innerHTML = `<span aria-hidden="true">🏆</span><span>10.00 랭킹</span><b>${count}회</b>`;
  }

  function installStyle() {
    if (document.getElementById('kcExact10Style')) return;
    const style = document.createElement('style');
    style.id = 'kcExact10Style';
    style.textContent = `
      #kcExact10RankingBtn{width:100%;margin:-2px 0 11px;border:1px solid rgba(120,215,160,.30);border-radius:13px;min-height:43px;padding:8px 12px;background:linear-gradient(180deg,rgba(120,215,160,.12),rgba(54,175,217,.06));color:#e8fff1;font:900 11px system-ui,-apple-system,"Noto Sans KR",sans-serif;display:flex;align-items:center;justify-content:center;gap:7px;cursor:pointer}
      #kcExact10RankingBtn b{padding:3px 7px;border-radius:999px;background:rgba(120,215,160,.13);color:#78d7a0;font-size:10px}
      #kcExact10RankingBtn:active{transform:scale(.99)}
      .kc-exact10-celebration{position:fixed;left:50%;top:max(18px,env(safe-area-inset-top));z-index:1200;transform:translate(-50%,-12px) scale(.96);opacity:0;pointer-events:none;min-width:min(88vw,380px);padding:13px 16px;border:1px solid rgba(120,215,160,.48);border-radius:18px;background:linear-gradient(135deg,rgba(8,30,24,.97),rgba(11,34,50,.97));box-shadow:0 18px 50px rgba(0,0,0,.42);text-align:center;color:#fff;transition:.18s ease}
      .kc-exact10-celebration.show{opacity:1;transform:translate(-50%,0) scale(1)}
      .kc-exact10-celebration strong{display:block;font-size:21px;color:#78d7a0;letter-spacing:-.04em}.kc-exact10-celebration span{display:block;margin-top:3px;font-size:11px;color:#c9f7db;font-weight:850}
      .kc-record-overlay{position:fixed;inset:0;z-index:1300;display:none;place-items:end center;background:rgba(2,6,12,.74);backdrop-filter:blur(5px);padding:16px 12px max(14px,env(safe-area-inset-bottom))}
      .kc-record-overlay.open{display:grid}.kc-record-panel{width:min(100%,500px);max-height:min(78vh,650px);overflow:auto;border:1px solid rgba(255,255,255,.13);border-radius:24px;background:#11151c;color:#fff;box-shadow:0 30px 80px rgba(0,0,0,.5);padding:18px}
      .kc-record-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.kc-record-head h2{margin:0;font-size:21px;letter-spacing:-.04em}.kc-record-head p{margin:5px 0 0;color:#8f98a6;font-size:11px;font-weight:800}.kc-record-close{border:0;width:36px;height:36px;border-radius:11px;background:#252b34;color:#fff;font-size:19px;cursor:pointer}
      .kc-record-note{margin:13px 0;padding:10px 12px;border-radius:13px;background:rgba(120,215,160,.07);border:1px solid rgba(120,215,160,.16);font-size:11px;color:#c9f7db;line-height:1.5;font-weight:780}
      .kc-record-list{display:grid;gap:7px}.kc-record-row{display:grid;grid-template-columns:42px 1fr auto;align-items:center;gap:9px;padding:10px 11px;border-radius:13px;background:#191e26;border:1px solid rgba(255,255,255,.07)}.kc-record-row.self{border-color:rgba(120,215,160,.48);background:rgba(120,215,160,.08)}
      .kc-record-rank{text-align:center;font-size:15px;font-weight:1000}.kc-record-name{min-width:0;font-size:12px;font-weight:950;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.kc-record-value{font-size:15px;font-weight:1000;color:#78d7a0}.kc-record-self{margin-top:10px;padding:11px;border-radius:13px;background:#202630;color:#dbe4ee;font-size:11px;font-weight:850;text-align:center}.kc-record-empty{padding:28px 12px;text-align:center;color:#8f98a6;font-size:12px;font-weight:800}.kc-record-error{padding:22px 10px;text-align:center;color:#ff9aa5;font-size:12px;line-height:1.6;font-weight:800}
    `;
    document.head.appendChild(style);
  }

  function installUI() {
    const modes = document.querySelector('.modes');
    if (!modes || document.getElementById('kcExact10RankingBtn')) return;
    installStyle();

    rankingButton = document.createElement('button');
    rankingButton.type = 'button';
    rankingButton.id = 'kcExact10RankingBtn';
    rankingButton.setAttribute('aria-label', '우리 반 정확히 10초 랭킹 보기');
    rankingButton.addEventListener('click', openRanking);
    modes.insertAdjacentElement('afterend', rankingButton);
    updateButton();

    celebration = document.createElement('div');
    celebration.className = 'kc-exact10-celebration';
    celebration.innerHTML = '<strong>🎯 EXACT 10.00!</strong><span>정확히 10초를 맞혔어요!</span>';
    document.body.appendChild(celebration);

    rankingOverlay = document.createElement('div');
    rankingOverlay.className = 'kc-record-overlay';
    rankingOverlay.innerHTML = `
      <section class="kc-record-panel" role="dialog" aria-modal="true" aria-label="딱 타임 우리 반 랭킹">
        <div class="kc-record-head"><div><h2>🏆 10.00 마스터</h2><p id="kcExact10Subtitle">우리 반 정확 성공 횟수</p></div><button class="kc-record-close" type="button" aria-label="닫기">×</button></div>
        <div class="kc-record-note">클래식 10초 모드에서 화면 기록이 <b>10.00초</b>로 나온 경우만 1회 인정됩니다.</div>
        <div id="kcExact10Body"><div class="kc-record-empty">랭킹을 불러오는 중...</div></div>
      </section>`;
    rankingOverlay.addEventListener('click', event => {
      if (event.target === rankingOverlay || event.target.closest('.kc-record-close')) closeRanking();
    });
    document.body.appendChild(rankingOverlay);
  }

  function medal(rank) {
    return rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : String(rank);
  }

  function renderRanking(data) {
    const subtitle = document.getElementById('kcExact10Subtitle');
    const body = document.getElementById('kcExact10Body');
    if (!subtitle || !body) return;
    subtitle.textContent = `${data.className || '우리 반'} · ${Number(data.participantCount || 0)}명 기록 등록`;
    const rows = Array.isArray(data.top) ? data.top : [];
    if (!rows.length) {
      body.innerHTML = '<div class="kc-record-empty">아직 등록된 10.00초 기록이 없어요.<br>첫 기록에 도전해 보세요!</div>';
      return;
    }
    body.innerHTML = `<div class="kc-record-list">${rows.map(row => `
      <div class="kc-record-row${row.self ? ' self' : ''}">
        <div class="kc-record-rank">${medal(Number(row.rank || 0))}</div>
        <div class="kc-record-name">${escapeHtml(row.nickname || '새싹 게이머')}${row.self ? ' · 나' : ''}</div>
        <div class="kc-record-value">${Number(row.value || 0).toLocaleString()}회</div>
      </div>`).join('')}</div>${data.self && !rows.some(row => row.self) ? `<div class="kc-record-self">내 순위 ${Number(data.self.rank || 0)}위 · ${Number(data.self.value || 0).toLocaleString()}회</div>` : ''}`;
  }

  function rankingError(message) {
    const body = document.getElementById('kcExact10Body');
    if (body) body.innerHTML = `<div class="kc-record-error">${escapeHtml(message)}</div>`;
  }

  async function openRanking() {
    if (!rankingOverlay) return;
    rankingOverlay.classList.add('open');
    document.getElementById('kcExact10Body').innerHTML = '<div class="kc-record-empty">랭킹을 불러오는 중...</div>';
    try {
      const response = await fetch(RANKING_URL, { credentials: 'same-origin', cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        rankingError('Kidscade에 로그인하면 우리 반 랭킹에 참여할 수 있어요.\n게스트 기록은 이 기기에만 저장됩니다.');
        return;
      }
      if (!response.ok || !data.ok) throw new Error(data.error || 'ranking_failed');
      renderRanking(data);
    } catch (error) {
      console.warn('[Kidscade exact 10 ranking] ranking load failed:', error);
      rankingError('랭킹을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
    }
  }

  function closeRanking() {
    rankingOverlay?.classList.remove('open');
  }

  function showCelebration(serverCount = null) {
    if (!celebration) return;
    const countText = serverCount == null ? `이 기기 누적 ${localCount()}회` : `우리 반 기록에 누적 ${serverCount}회 저장`;
    celebration.querySelector('span').textContent = `정확히 10초! · ${countText}`;
    celebration.classList.add('show');
    window.setTimeout(() => celebration?.classList.remove('show'), 1800);
  }

  async function submitExactHit() {
    const count = setLocalCount(localCount() + 1);
    showCelebration();
    try {
      const response = await fetch(SUBMIT_URL, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          gameId: GAME_ID,
          metric: METRIC,
          mode: MODE,
          value: 1,
          details: { targetHundredths: 1000, elapsedHundredths: 1000 }
        })
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) return;
      if (!response.ok || !data.ok) throw new Error(data.error || 'submit_failed');
      if (Number.isFinite(Number(data.best))) showCelebration(Number(data.best));
      window.dispatchEvent(new CustomEvent('kidscade:timing-exact10-recorded', { detail: data }));
    } catch (error) {
      console.warn('[Kidscade exact 10 ranking] submit failed:', error);
      updateButton(count);
    }
  }

  function inspectResult() {
    const activeMode = document.querySelector('.mode.active')?.dataset?.mode || '';
    if (activeMode !== 'classic') return;
    const detail = document.getElementById('detail')?.textContent || '';
    const match = detail.match(/목표\s*10\.00초\s*·\s*기록\s*(\d+\.\d{2})초\s*·\s*오차\s*±(\d+\.\d{2})초/);
    if (!match || match[1] !== '10.00' || match[2] !== '0.00') return;
    const attempts = document.getElementById('statB')?.textContent || '';
    const signature = `${attempts}|${detail}`;
    if (!attempts || signature === lastAttemptSignature) return;
    lastAttemptSignature = signature;
    submitExactHit();
  }

  function installObserver() {
    const detail = document.getElementById('detail');
    if (!detail) return;
    const observer = new MutationObserver(inspectResult);
    observer.observe(detail, { childList: true, subtree: true, characterData: true });
  }

  function init() {
    installUI();
    installObserver();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();

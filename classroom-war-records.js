(() => {
  'use strict';

  const GAME_ID = 'high_classroom_war_3d';
  const METRIC = 'score';
  const MODE = 'v4';
  const MODAL_ID = 'kc-classwar-record-modal';
  const STYLE_ID = 'kc-classwar-record-style';
  let latestRanking = null;
  let busy = false;

  const fmt = value => Math.max(0, Math.floor(Number(value || 0))).toLocaleString('ko-KR');
  const fmtTime = tenths => {
    const seconds = Math.max(0, Math.floor(Number(tenths || 0) / 10));
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  };
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[ch]));

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .kcr-rank-btn{width:100%;margin-top:8px;border:1px solid rgba(251,191,36,.35);border-radius:14px;padding:11px 14px;background:linear-gradient(135deg,rgba(245,158,11,.15),rgba(124,58,237,.18));color:#fde68a;font-size:13px;font-weight:1000;cursor:pointer}
      .kcr-save-box{margin:11px 0 0;padding:11px 12px;border-radius:14px;background:rgba(15,23,42,.76);border:1px solid rgba(125,211,252,.24);font-size:11px;line-height:1.5;color:#dbeafe}
      .kcr-save-box strong{display:block;font-size:13px;color:#fff;margin-bottom:2px}
      .kcr-save-box.good{border-color:rgba(74,222,128,.4);background:rgba(20,83,45,.25)}
      .kcr-save-box.warn{border-color:rgba(251,191,36,.35);background:rgba(120,53,15,.22)}
      #${MODAL_ID}{position:absolute;inset:0;z-index:90;display:grid;place-items:center;padding:16px;background:rgba(2,6,23,.72);backdrop-filter:blur(8px)}
      #${MODAL_ID}.hidden{display:none!important}
      #${MODAL_ID} .kcr-card{width:min(100%,440px);max-height:min(78dvh,720px);overflow:auto;padding:18px;border-radius:24px;background:#0c1727;border:1px solid rgba(255,255,255,.14);box-shadow:0 28px 70px rgba(0,0,0,.45);color:#fff}
      #${MODAL_ID} .kcr-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
      #${MODAL_ID} h3{margin:0;font-size:21px;letter-spacing:-.04em}
      #${MODAL_ID} .kcr-sub{margin-top:4px;color:#94a3b8;font-size:11px;font-weight:800}
      #${MODAL_ID} .kcr-close{width:36px;height:36px;border:0;border-radius:11px;background:#1e293b;color:#cbd5e1;font-weight:1000;cursor:pointer}
      #${MODAL_ID} .kcr-list{display:grid;gap:7px;margin-top:14px}
      #${MODAL_ID} .kcr-row{display:grid;grid-template-columns:42px minmax(0,1fr) auto;gap:9px;align-items:center;padding:9px 10px;border-radius:13px;background:#131f31;border:1px solid #28364d}
      #${MODAL_ID} .kcr-row.self{border-color:#8b5cf6;background:#231d43}
      #${MODAL_ID} .kcr-rank{text-align:center;font-weight:1000;font-size:13px}
      #${MODAL_ID} .kcr-name{min-width:0;font-weight:1000;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #${MODAL_ID} .kcr-name small{margin-left:5px;color:#c4b5fd;font-size:9px}
      #${MODAL_ID} .kcr-detail{margin-top:2px;color:#94a3b8;font-size:9px;font-weight:800}
      #${MODAL_ID} .kcr-score{font-size:13px;font-weight:1000;color:#fde68a;white-space:nowrap}
      #${MODAL_ID} .kcr-empty{padding:28px 8px;text-align:center;color:#94a3b8;font-size:12px;font-weight:850;line-height:1.55}
      #${MODAL_ID} .kcr-self-sep{margin:5px 0;border-top:1px dashed #475569}
      #${MODAL_ID} .kcr-refresh{width:100%;margin-top:11px;min-height:40px;border:0;border-radius:12px;background:#1d4ed8;color:#fff;font-weight:1000;cursor:pointer}
      @media(max-width:620px){#${MODAL_ID}{place-items:end center;padding:0}#${MODAL_ID} .kcr-card{width:100%;max-height:78dvh;border-radius:24px 24px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom))}}
    `;
    document.head.appendChild(style);
  }

  function rankMark(rank) {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `${rank}위`;
  }

  function renderRow(row) {
    const d = row?.details || {};
    return `<div class="kcr-row${row?.self ? ' self' : ''}">
      <div class="kcr-rank">${escapeHtml(rankMark(Number(row?.rank || 0)))}</div>
      <div class="kcr-name">${escapeHtml(row?.nickname || '새싹 게이머')}${row?.self ? '<small>나</small>' : ''}<div class="kcr-detail">생존 ${fmtTime(d.survivalTenths)} · 적 ${fmt(d.kills)} · 최대 병력 ${fmt(d.maxArmy)}</div></div>
      <div class="kcr-score">${fmt(row?.value)}점</div>
    </div>`;
  }

  function ensureModal() {
    let modal = document.getElementById(MODAL_ID);
    if (modal) return modal;
    const app = document.getElementById('app') || document.body;
    modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.className = 'hidden';
    modal.innerHTML = `
      <section class="kcr-card" role="dialog" aria-modal="true" aria-label="교실전쟁 우리 반 기록">
        <div class="kcr-head"><div><h3>🏆 교실전쟁 우리 반 기록</h3><div class="kcr-sub" id="kcr-sub">최고 점수 TOP 10</div></div><button type="button" class="kcr-close" aria-label="닫기">✕</button></div>
        <div class="kcr-list" id="kcr-list"><div class="kcr-empty">기록을 불러오는 중...</div></div>
        <button type="button" class="kcr-refresh">새로고침</button>
      </section>`;
    app.appendChild(modal);
    modal.querySelector('.kcr-close')?.addEventListener('click', () => modal.classList.add('hidden'));
    modal.addEventListener('click', event => { if (event.target === modal) modal.classList.add('hidden'); });
    modal.querySelector('.kcr-refresh')?.addEventListener('click', () => loadRanking(true));
    return modal;
  }

  function renderRanking() {
    const modal = ensureModal();
    const list = modal.querySelector('#kcr-list');
    const sub = modal.querySelector('#kcr-sub');
    if (!list) return;
    if (!latestRanking) {
      list.innerHTML = '<div class="kcr-empty">기록을 불러오는 중...</div>';
      return;
    }
    if (latestRanking.error) {
      list.innerHTML = `<div class="kcr-empty">${escapeHtml(latestRanking.error)}</div>`;
      if (sub) sub.textContent = '로그인 계정 기준 기록 경쟁';
      return;
    }
    if (sub) sub.textContent = `${latestRanking.className || '우리 반'} · ${latestRanking.participantCount || 0}명 참여 · 최고 점수 TOP 10`;
    const top = Array.isArray(latestRanking.top) ? latestRanking.top : [];
    if (!top.length) {
      list.innerHTML = '<div class="kcr-empty">아직 등록된 기록이 없어요.<br>첫 번째 기록의 주인공이 되어 보세요!</div>';
      return;
    }
    let html = top.map(renderRow).join('');
    const self = latestRanking.self;
    if (self && !top.some(row => row.self)) html += `<div class="kcr-self-sep"></div>${renderRow(self)}`;
    list.innerHTML = html;
  }

  async function loadRanking(force = false) {
    if (busy && !force) return latestRanking;
    const modal = ensureModal();
    const list = modal.querySelector('#kcr-list');
    if (list) list.innerHTML = '<div class="kcr-empty">기록을 불러오는 중...</div>';
    try {
      const params = new URLSearchParams({ gameId: GAME_ID, metric: METRIC, mode: MODE });
      const response = await fetch(`/api/account/game-records/ranking?${params}`, { credentials:'same-origin', cache:'no-store' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.ok) {
        const message = body.error === 'not_authenticated' || body.error === 'session_expired'
          ? 'Kidscade 계정으로 로그인하면 우리 반 기록에 참여할 수 있어요.'
          : body.error === 'game_records_schema_not_ready'
            ? '기록 경쟁 서버를 준비 중이에요.'
            : '우리 반 기록을 불러오지 못했어요.';
        latestRanking = { error: message };
      } else latestRanking = body;
    } catch (_) {
      latestRanking = { error: '네트워크 연결을 확인해 주세요.' };
    }
    renderRanking();
    return latestRanking;
  }

  function openRanking() {
    installStyles();
    const modal = ensureModal();
    modal.classList.remove('hidden');
    loadRanking(true);
  }

  function addRankingButton(panel = document.getElementById('panel')) {
    if (!panel || panel.querySelector('.kcr-rank-btn')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'kcr-rank-btn';
    button.textContent = '🏆 우리 반 최고 기록 보기';
    button.addEventListener('click', openRanking);
    const restart = panel.querySelector('#restartBtn');
    const start = panel.querySelector('#startBtn');
    (restart || start || panel.lastElementChild)?.insertAdjacentElement('afterend', button);
  }

  function ensureSaveBox() {
    const panel = document.getElementById('panel');
    if (!panel) return null;
    let box = panel.querySelector('.kcr-save-box');
    if (!box) {
      box = document.createElement('div');
      box.className = 'kcr-save-box';
      const grid = panel.querySelector('.grid');
      if (grid) grid.insertAdjacentElement('afterend', box);
      else panel.appendChild(box);
    }
    return box;
  }

  async function submitFinishedRecord(detail = {}) {
    if (busy) return;
    busy = true;
    const box = ensureSaveBox();
    if (box) {
      box.className = 'kcr-save-box';
      box.innerHTML = '<strong>☁️ 기록 확인 중...</strong>로그인 계정이면 우리 반 기록에 자동 등록합니다.';
    }
    try {
      const payload = {
        gameId: GAME_ID,
        metric: METRIC,
        mode: MODE,
        value: Math.floor(Number(detail.score || 0)),
        details: {
          survivalTenths: Math.floor(Number(detail.survivalTenths || 0)),
          kills: Math.floor(Number(detail.kills || 0)),
          bossKills: Math.floor(Number(detail.bossKills || 0)),
          hazardsDestroyed: Math.floor(Number(detail.hazardsDestroyed || 0)),
          maxArmy: Math.floor(Number(detail.maxArmy || 1))
        }
      };
      const response = await fetch('/api/account/game-records/submit', {
        method:'POST', credentials:'same-origin',
        headers:{ 'content-type':'application/json' },
        body:JSON.stringify(payload)
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.ok) {
        if (box) {
          box.className = 'kcr-save-box warn';
          box.innerHTML = body.error === 'not_authenticated' || body.error === 'session_expired'
            ? '<strong>🔒 게스트 기록</strong>Kidscade 계정으로 로그인하면 다음 플레이부터 우리 반 랭킹에 기록돼요.'
            : body.error === 'game_records_schema_not_ready'
              ? '<strong>⏳ 기록 서버 준비 중</strong>현재 점수는 기기에만 저장됐어요.'
              : '<strong>⚠️ 기록 저장 실패</strong>현재 점수는 기기에 남아 있지만 반 랭킹에는 등록되지 않았어요.';
        }
        return;
      }

      const params = new URLSearchParams({ gameId: GAME_ID, metric: METRIC, mode: MODE });
      const rankResponse = await fetch(`/api/account/game-records/ranking?${params}`, { credentials:'same-origin', cache:'no-store' });
      const rankBody = await rankResponse.json().catch(() => ({}));
      if (rankResponse.ok && rankBody.ok) latestRanking = rankBody;
      const self = latestRanking?.self;
      if (box) {
        box.className = `kcr-save-box ${body.improved ? 'good' : ''}`;
        const rankText = self ? ` · 우리 반 ${self.rank}위` : '';
        box.innerHTML = body.improved
          ? `<strong>🏆 새 개인 최고 기록 ${fmt(body.best)}점${escapeHtml(rankText)}</strong>우리 반 기록에 새 최고 점수가 등록됐어요.`
          : `<strong>☁️ 이번 점수 ${fmt(detail.score)}점${escapeHtml(rankText)}</strong>내 최고 기록은 ${fmt(body.best)}점이에요.`;
      }
    } catch (_) {
      if (box) {
        box.className = 'kcr-save-box warn';
        box.innerHTML = '<strong>⚠️ 네트워크 연결 확인</strong>현재 점수는 기기에 저장됐지만 서버 기록은 확인하지 못했어요.';
      }
    } finally {
      busy = false;
      addRankingButton();
    }
  }

  function start() {
    installStyles();
    ensureModal();
    addRankingButton();
    window.addEventListener('kidscade:classroom-war-finished', event => submitFinishedRecord(event.detail || {}));
    const observer = new MutationObserver(() => addRankingButton());
    const panel = document.getElementById('panel');
    if (panel) observer.observe(panel, { childList:true, subtree:false });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();

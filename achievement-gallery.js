(() => {
  'use strict';

  const STYLE_ID = 'kidscade-achievement-gallery-style';
  const ENTRY_ID = 'kc-achievement-entry';
  const OVERLAY_ID = 'kc-achievement-overlay';
  const TOAST_ID = 'kc-achievement-toast-stack';
  const TYPE_LABELS = Object.freeze({
    normal:'일반',
    challenge:'도전',
    secret:'비밀'
  });

  let toastQueue = [];
  let toastBusy = false;

  function api() {
    return window.KidscadeAchievements || null;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
    }[ch]));
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value) || 0));
  }

  function gameTitle(gameId) {
    if (gameId === 'kidscade') return 'Kidscade 전체';
    const game = window.KidscadeCatalog?.games?.find?.(item => String(item?.id || '') === String(gameId || ''));
    return String(game?.title || gameId || '게임');
  }

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${ENTRY_ID}{grid-column:1/-1;padding:0 12px 12px}
      #${ENTRY_ID} *{box-sizing:border-box}
      .kca-entry-btn{width:100%;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:5px 10px;align-items:center;text-align:left;padding:11px 12px;border:1px solid rgba(124,58,237,.18);border-radius:14px;background:linear-gradient(135deg,rgba(124,58,237,.09),rgba(14,165,233,.08));color:inherit;cursor:pointer}
      .kca-entry-btn:hover{transform:translateY(-1px);box-shadow:0 8px 22px rgba(30,41,59,.08)}
      .kca-entry-title{font-size:.82rem;font-weight:950;color:#4c1d95}
      .kca-entry-note{display:block;margin-top:2px;font-size:.64rem;font-weight:800;color:#64748b}
      .kca-entry-count{font-size:.8rem;font-weight:1000;color:#7c3aed}
      .kca-entry-track{grid-column:1/-1;height:7px;border-radius:999px;background:rgba(148,163,184,.24);overflow:hidden}
      .kca-entry-track i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#7c3aed,#0ea5e9)}
      body.dark-mode .kca-entry-btn{border-color:rgba(167,139,250,.28);background:linear-gradient(135deg,rgba(124,58,237,.22),rgba(14,165,233,.14))}
      body.dark-mode .kca-entry-title{color:#ddd6fe}
      body.dark-mode .kca-entry-note{color:#94a3b8}

      #${OVERLAY_ID}[hidden]{display:none!important}
      #${OVERLAY_ID}{position:fixed;inset:0;z-index:42000;display:grid;place-items:center;padding:18px;background:rgba(15,23,42,.68);backdrop-filter:blur(8px)}
      .kca-dialog{width:min(900px,96vw);max-height:min(88dvh,900px);display:flex;flex-direction:column;overflow:hidden;border:1px solid rgba(148,163,184,.22);border-radius:26px;background:#f8fafc;color:#0f172a;box-shadow:0 28px 90px rgba(15,23,42,.36)}
      body.dark-mode .kca-dialog{background:#111827;color:#f8fafc;border-color:#334155}
      .kca-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:20px 22px 14px;border-bottom:1px solid rgba(148,163,184,.18)}
      .kca-kicker{font-size:.64rem;font-weight:1000;letter-spacing:.16em;color:#7c3aed}
      .kca-head h2{margin:4px 0 3px;font-size:clamp(1.35rem,3vw,2rem);letter-spacing:-.04em}
      .kca-head p{margin:0;color:#64748b;font-size:.78rem;font-weight:750}
      body.dark-mode .kca-head p{color:#94a3b8}
      .kca-close{width:38px;height:38px;border:0;border-radius:12px;background:rgba(148,163,184,.16);color:inherit;font-size:23px;cursor:pointer}
      .kca-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;padding:14px 22px}
      .kca-stat{padding:12px;border-radius:16px;background:#fff;border:1px solid rgba(148,163,184,.16)}
      body.dark-mode .kca-stat{background:#1f2937;border-color:#334155}
      .kca-stat b{display:block;font-size:1.18rem}
      .kca-stat span{display:block;margin-top:2px;color:#64748b;font-size:.68rem;font-weight:850}
      body.dark-mode .kca-stat span{color:#94a3b8}
      .kca-body{overflow:auto;padding:0 22px 24px}
      .kca-game{margin-top:14px;border:1px solid rgba(148,163,184,.18);border-radius:20px;background:#fff;overflow:hidden}
      body.dark-mode .kca-game{background:#182234;border-color:#334155}
      .kca-game-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:13px 15px;border-bottom:1px solid rgba(148,163,184,.14)}
      .kca-game-head b{font-size:.92rem}
      .kca-game-head span{font-size:.7rem;font-weight:900;color:#7c3aed}
      .kca-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;padding:12px}
      .kca-item{display:grid;grid-template-columns:42px minmax(0,1fr);gap:10px;padding:11px;border:1px solid rgba(148,163,184,.16);border-radius:15px;background:rgba(248,250,252,.82)}
      body.dark-mode .kca-item{background:rgba(15,23,42,.66);border-color:#334155}
      .kca-item.locked{opacity:.78}
      .kca-icon{width:42px;height:42px;display:grid;place-items:center;border-radius:13px;background:linear-gradient(135deg,#ede9fe,#e0f2fe);font-size:22px}
      body.dark-mode .kca-icon{background:linear-gradient(135deg,#312e81,#164e63)}
      .kca-copy{min-width:0}
      .kca-title-row{display:flex;align-items:center;justify-content:space-between;gap:6px}
      .kca-title{font-size:.78rem;font-weight:1000}
      .kca-type{flex:0 0 auto;padding:3px 6px;border-radius:999px;background:rgba(124,58,237,.1);color:#6d28d9;font-size:.55rem;font-weight:1000}
      body.dark-mode .kca-type{color:#c4b5fd;background:rgba(124,58,237,.22)}
      .kca-desc{margin-top:3px;color:#64748b;font-size:.64rem;line-height:1.45;font-weight:700}
      body.dark-mode .kca-desc{color:#94a3b8}
      .kca-progress{margin-top:7px;height:6px;border-radius:999px;background:rgba(148,163,184,.2);overflow:hidden}
      .kca-progress i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#7c3aed,#0ea5e9)}
      .kca-progress-text{margin-top:3px;color:#64748b;font-size:.58rem;font-weight:900;text-align:right}
      body.dark-mode .kca-progress-text{color:#94a3b8}

      #${TOAST_ID}{position:fixed;top:max(14px,env(safe-area-inset-top));right:max(14px,env(safe-area-inset-right));z-index:50000;width:min(360px,calc(100vw - 28px));pointer-events:none}
      .kca-toast{display:grid;grid-template-columns:48px minmax(0,1fr);gap:11px;padding:13px 14px;margin-bottom:8px;border:1px solid rgba(250,204,21,.45);border-radius:18px;background:rgba(15,23,42,.96);color:#fff;box-shadow:0 18px 50px rgba(0,0,0,.3);transform:translateY(-12px);opacity:0;transition:.22s ease}
      .kca-toast.show{transform:translateY(0);opacity:1}
      .kca-toast-icon{width:48px;height:48px;display:grid;place-items:center;border-radius:14px;background:linear-gradient(135deg,#fef3c7,#fde68a);font-size:25px}
      .kca-toast-kicker{font-size:.58rem;font-weight:1000;letter-spacing:.12em;color:#facc15}
      .kca-toast-title{margin-top:2px;font-size:.88rem;font-weight:1000}
      .kca-toast-desc{margin-top:2px;color:#cbd5e1;font-size:.66rem;font-weight:700;line-height:1.4}

      @media(max-width:680px){
        #${OVERLAY_ID}{padding:8px}
        .kca-dialog{width:100%;max-height:94dvh;border-radius:20px}
        .kca-head{padding:16px 15px 12px}
        .kca-summary{padding:11px 15px;gap:6px}
        .kca-stat{padding:9px}
        .kca-stat b{font-size:1rem}
        .kca-body{padding:0 12px 18px}
        .kca-grid{grid-template-columns:1fr;padding:9px}
      }
    `;
    document.head.appendChild(style);
  }

  function ensureEntry() {
    const host = document.querySelector('.kc-side-card.avatar-shell');
    if (!host) return false;
    let entry = document.getElementById(ENTRY_ID);
    if (!entry) {
      entry = document.createElement('div');
      entry.id = ENTRY_ID;
      entry.innerHTML = '<button class="kca-entry-btn" type="button" aria-label="업적 도감 열기"><span><span class="kca-entry-title">🏆 업적 도감</span><span class="kca-entry-note">게임에서 실제로 남긴 결과와 주요 목표를 한곳에서 봐요.</span></span><strong class="kca-entry-count">0 / 0</strong><span class="kca-entry-track" aria-hidden="true"><i style="width:0%"></i></span></button>';
      host.appendChild(entry);
      entry.querySelector('button')?.addEventListener('click', open);
    }
    return true;
  }

  function ensureOverlay() {
    let overlay = document.getElementById(OVERLAY_ID);
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.hidden = true;
    overlay.innerHTML = '<section class="kca-dialog" role="dialog" aria-modal="true" aria-labelledby="kca-title"><header class="kca-head"><div><div class="kca-kicker">ACHIEVEMENT BOOK</div><h2 id="kca-title">🏆 나의 업적</h2><p>이 브라우저에 저장된 Kidscade 업적 기록이에요.</p></div><button class="kca-close" type="button" aria-label="업적 도감 닫기">×</button></header><div class="kca-summary"></div><div class="kca-body"></div></section>';
    document.body.appendChild(overlay);
    overlay.querySelector('.kca-close')?.addEventListener('click', close);
    overlay.addEventListener('click', event => {
      if (event.target === overlay) close();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !overlay.hidden) close();
    });
    return overlay;
  }

  function ensureToastHost() {
    let host = document.getElementById(TOAST_ID);
    if (!host) {
      host = document.createElement('div');
      host.id = TOAST_ID;
      host.setAttribute('aria-live', 'polite');
      document.body.appendChild(host);
    }
    return host;
  }

  function renderEntry() {
    const achievements = api();
    const entry = document.getElementById(ENTRY_ID);
    if (!achievements || !entry) return false;
    const summary = achievements.getSummary?.() || { unlocked:0, total:0, percent:0 };
    const count = entry.querySelector('.kca-entry-count');
    const bar = entry.querySelector('.kca-entry-track i');
    if (count) count.textContent = summary.unlocked + ' / ' + summary.total;
    if (bar) bar.style.width = clamp(summary.percent, 0, 100) + '%';
    return true;
  }

  function achievementMarkup(item) {
    const hidden = item.hidden && !item.unlocked;
    const title = hidden ? '???' : item.title;
    const description = hidden ? '조건을 발견하면 공개되는 비밀 업적이에요.' : item.description;
    const icon = item.unlocked ? item.icon : (hidden ? '🔒' : item.icon);
    const type = TYPE_LABELS[item.type] || '일반';
    const progress = item.target > 1 ? Math.min(item.target, Math.max(0, Number(item.progress) || 0)) : (item.unlocked ? 1 : 0);
    const percent = item.target > 0 ? Math.round(progress / item.target * 100) : 0;
    const progressMarkup = item.target > 1
      ? '<div class="kca-progress"><i style="width:' + clamp(percent,0,100) + '%"></i></div><div class="kca-progress-text">' + progress + ' / ' + item.target + '</div>'
      : '';
    return '<article class="kca-item ' + (item.unlocked ? 'unlocked' : 'locked') + '"><div class="kca-icon">' + escapeHtml(icon) + '</div><div class="kca-copy"><div class="kca-title-row"><span class="kca-title">' + escapeHtml(item.unlocked ? '✅ ' + title : title) + '</span><span class="kca-type">' + escapeHtml(type) + '</span></div><div class="kca-desc">' + escapeHtml(description) + '</div>' + progressMarkup + '</div></article>';
  }

  function renderOverlay() {
    const achievements = api();
    const overlay = document.getElementById(OVERLAY_ID);
    if (!achievements || !overlay) return false;
    const summary = achievements.getSummary?.() || { unlocked:0, total:0, percent:0, playedGames:0 };
    const defs = achievements.getDefinitions?.() || [];
    const ids = [];
    defs.forEach(def => {
      if (!ids.includes(def.gameId)) ids.push(def.gameId);
    });
    ids.sort((a,b) => {
      if (a === 'kidscade') return -1;
      if (b === 'kidscade') return 1;
      return gameTitle(a).localeCompare(gameTitle(b), 'ko');
    });

    const summaryEl = overlay.querySelector('.kca-summary');
    if (summaryEl) {
      summaryEl.innerHTML =
        '<div class="kca-stat"><b>' + summary.unlocked + ' / ' + summary.total + '</b><span>달성 업적</span></div>' +
        '<div class="kca-stat"><b>' + summary.percent + '%</b><span>전체 달성률</span></div>' +
        '<div class="kca-stat"><b>' + (summary.trackedGames || 0) + '개</b><span>기록 있는 게임</span></div>';
    }

    const body = overlay.querySelector('.kca-body');
    if (body) {
      body.innerHTML = ids.map(gameId => {
        const group = achievements.getGameProgress?.(gameId);
        if (!group || !group.total) return '';
        return '<section class="kca-game"><div class="kca-game-head"><b>' + escapeHtml(gameTitle(gameId)) + '</b><span>' + group.unlocked + ' / ' + group.total + ' · ' + group.percent + '%</span></div><div class="kca-grid">' + group.items.map(achievementMarkup).join('') + '</div></section>';
      }).join('');
    }
    return true;
  }

  function render() {
    renderEntry();
    if (!document.getElementById(OVERLAY_ID)?.hidden) renderOverlay();
  }

  function open() {
    const overlay = ensureOverlay();
    renderOverlay();
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    overlay.querySelector('.kca-close')?.focus?.();
  }

  function close() {
    const overlay = document.getElementById(OVERLAY_ID);
    if (!overlay) return;
    overlay.hidden = true;
    document.body.style.overflow = '';
  }

  function enqueueToast(detail) {
    if (!detail?.achievement) return;
    toastQueue.push(detail);
    pumpToast();
  }

  function pumpToast() {
    if (toastBusy || !toastQueue.length) return;
    toastBusy = true;
    const detail = toastQueue.shift();
    const achievement = detail.achievement;
    const host = ensureToastHost();
    const toast = document.createElement('div');
    toast.className = 'kca-toast';
    toast.innerHTML = '<div class="kca-toast-icon">' + escapeHtml(achievement.icon || '🏆') + '</div><div><div class="kca-toast-kicker">업적 달성!</div><div class="kca-toast-title">' + escapeHtml(achievement.title || '새 업적') + '</div><div class="kca-toast-desc">' + escapeHtml(achievement.description || '') + '</div></div>';
    host.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    window.setTimeout(() => {
      toast.classList.remove('show');
      window.setTimeout(() => {
        toast.remove();
        toastBusy = false;
        pumpToast();
      }, 240);
    }, 2800);
  }

  function mount() {
    if (!api()) return false;
    installStyles();
    const mounted = ensureEntry();
    ensureOverlay();
    ensureToastHost();
    if (mounted) renderEntry();
    return mounted;
  }

  function start() {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once:true });
    else mount();

    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (mount() || attempts >= 60) window.clearInterval(timer);
    }, 250);

    document.addEventListener('kidscade:catalog-ready', mount);
    document.addEventListener('kidscade:achievements-changed', render);
    document.addEventListener('kidscade:achievement-unlocked', event => {
      render();
      enqueueToast(event?.detail || {});
    });
    window.addEventListener('pageshow', mount);
  }

  window.KidscadeAchievementGallery = Object.freeze({ mount, render, open, close });
  start();
})();

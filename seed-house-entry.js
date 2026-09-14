(() => {
  'use strict';

  const STYLE_ID = 'kidscade-seed-house-entry-style';

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .kc-seed-house-card {
        padding: 14px;
        text-align: left;
        cursor: pointer;
        border-color: rgba(245,158,11,.24) !important;
        background:
          linear-gradient(180deg, rgba(255,251,235,.96), rgba(255,255,255,.98));
        transition: transform .16s ease, border-color .16s ease, box-shadow .16s ease;
      }
      .kc-seed-house-card:hover {
        transform: translateY(-2px);
        border-color: rgba(245,158,11,.52) !important;
        box-shadow: 0 12px 24px rgba(180,120,20,.10);
      }
      body.dark-mode .kc-seed-house-card {
        background: linear-gradient(180deg, #342f22, #252c38);
        border-color: rgba(245,158,11,.32) !important;
      }
      .kc-seed-house-top {
        display: grid;
        grid-template-columns: 58px minmax(0,1fr);
        gap: 11px;
        align-items: center;
      }
      .kc-seed-house-icon {
        width: 58px;
        height: 58px;
        border-radius: 18px;
        display: grid;
        place-items: center;
        font-size: 1.9rem;
        background: linear-gradient(145deg,#fef3c7,#dcfce7);
        border: 1px solid rgba(245,158,11,.24);
        box-shadow: inset 0 1px 0 rgba(255,255,255,.85);
      }
      body.dark-mode .kc-seed-house-icon {
        background: linear-gradient(145deg,#4a3b1d,#21412f);
      }
      .kc-seed-house-title {
        font-size: .98rem;
        font-weight: 1000;
        color: var(--kc-ink);
        letter-spacing: -.025em;
      }
      .kc-seed-house-desc {
        margin-top: 4px;
        color: var(--kc-muted);
        font-size: .72rem;
        font-weight: 800;
        line-height: 1.4;
      }
      .kc-seed-house-open {
        width: 100%;
        min-height: 42px;
        margin-top: 10px;
        border: 0;
        border-radius: 14px;
        background: linear-gradient(135deg,#f59e0b,#65a30d);
        color: #fff;
        font-size: .78rem;
        font-weight: 1000;
        cursor: pointer;
        box-shadow: 0 8px 16px rgba(132,103,20,.17), inset 0 1px 0 rgba(255,255,255,.22);
      }
      @media (max-width: 940px) {
        .kc-seed-house-card { display: none !important; }
      }
    `;
    document.head.appendChild(style);
  }

  function installDesktopEntry() {
    if (document.querySelector('.kc-seed-house-card')) return true;
    const parent = document.querySelector('.kc-myspace-inner');
    if (!parent) return false;

    const card = document.createElement('section');
    card.className = 'kc-side-card kc-seed-house-card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', '씨앗하우스 들어가기');
    card.dataset.openLifeWorld = 'seed-house-sidebar';
    card.innerHTML = `
      <div class="kc-seed-house-top">
        <div class="kc-seed-house-icon">🌱🏠</div>
        <div>
          <div class="kc-seed-house-title">씨앗하우스</div>
          <div class="kc-seed-house-desc">집 · 정원 · 농장을 돌아다니며 생활해요.</div>
        </div>
      </div>
      <button class="kc-seed-house-open" type="button" data-open-life-world="seed-house-button">씨앗하우스 들어가기</button>
    `;

    const mission = parent.querySelector('.kc-mission-card');
    if (mission) parent.insertBefore(card, mission);
    else parent.appendChild(card);

    card.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      window.openKidscadeLifeWorld?.();
    });
    return true;
  }

  function renameExistingEntrances() {
    document.querySelectorAll('[data-open-life-world]').forEach(el => {
      if (el.closest('.kc-seed-house-card')) return;
      const text = (el.textContent || '').trim();
      if (/생활\s*월드|Kidscade\s*World/i.test(text) || el.dataset.openLifeWorld === 'garden-entry') {
        el.textContent = '🌱 씨앗하우스';
        el.setAttribute('aria-label', '씨앗하우스 들어가기');
      }
    });
  }

  function convertMobileNav() {
    const nav = document.querySelector('.kc-mobile-nav');
    if (!nav) return false;
    const btn = nav.querySelector('[data-mobile-nav="shop"], [data-mobile-nav="seedhouse"]');
    if (!btn) return false;
    btn.dataset.mobileNav = 'seedhouse';
    btn.dataset.openLifeWorld = 'mobile-nav';
    btn.innerHTML = '<span class="kc-mobile-nav-icon">🌱</span>씨앗하우스';
    btn.setAttribute('aria-label', '씨앗하우스');
    return true;
  }

  function renameOverlay() {
    const bar = document.getElementById('kidscade-life-world-bar');
    if (bar) {
      const strong = bar.querySelector('strong');
      const sub = bar.querySelector('span');
      if (strong) strong.textContent = '🌱 씨앗하우스';
      if (sub) sub.textContent = '집 · 나의 정원 · 농장이 하나로 이어지는 공간';
    }
    const frame = document.getElementById('kidscade-life-world-frame');
    if (frame) frame.title = 'Kidscade 씨앗하우스';
  }

  function renameInsideFrame() {
    const frame = document.getElementById('kidscade-life-world-frame');
    if (!frame) return;
    try {
      const doc = frame.contentDocument;
      if (!doc) return;
      doc.title = 'Kidscade 씨앗하우스';
      const canvas = doc.getElementById('world');
      if (canvas) canvas.setAttribute('aria-label', 'Kidscade 씨앗하우스');
      const hudTitle = doc.querySelector('.hud b');
      if (hudTitle) hudTitle.textContent = '🌱 씨앗하우스';
      const toast = doc.getElementById('toast');
      if (toast && /생활\s*월드/.test(toast.textContent || '')) {
        toast.textContent = (toast.textContent || '').replace(/생활\s*월드\s*v2/gi, '씨앗하우스').replace(/생활\s*월드/gi, '씨앗하우스');
      }
      if (toast && !toast.dataset.seedHouseObserver) {
        toast.dataset.seedHouseObserver = 'true';
        new MutationObserver(() => {
          if (/생활\s*월드/.test(toast.textContent || '')) {
            toast.textContent = (toast.textContent || '').replace(/생활\s*월드\s*v2/gi, '씨앗하우스').replace(/생활\s*월드/gi, '씨앗하우스');
          }
        }).observe(toast, { childList: true, characterData: true, subtree: true });
      }
    } catch (_) {}
  }

  function attachFrameWatcher() {
    const frame = document.getElementById('kidscade-life-world-frame');
    if (!frame || frame.dataset.seedHouseWatcher) return;
    frame.dataset.seedHouseWatcher = 'true';
    frame.addEventListener('load', () => setTimeout(renameInsideFrame, 0));
    renameInsideFrame();
  }

  function sync() {
    installDesktopEntry();
    renameExistingEntrances();
    convertMobileNav();
    renameOverlay();
    attachFrameWatcher();
  }

  function init() {
    addStyles();
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();

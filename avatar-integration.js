/* Kidscade avatar studio integration: deluxe shop + lively main-card preview. */
(function () {
  'use strict';

  const STUDIO_URL = 'avatar-studio.html';
  const PREVIEW_KEY = 'kidscade-avatar-studio-preview';
  const SHOP_KEY = 'kidscade-avatar-shop-v2';
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  let overlay = null;
  let frame = null;
  let previewObserver = null;
  let liveRaf = 0;
  let liveImg = null;
  let liveShadow = null;
  let frameLoaded = false;
  let fallbackMode = '';

  const motion = {
    mode: 'idle', start: 0, end: 0, next: 0, x: 0, dir: 1,
    last: 0, lastCapture: 0, y: 0, squash: 1
  };

  function readCoins() {
    const n = parseInt(localStorage.getItem('kidscade_coins') || '0', 10);
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  }

  function ownedSummary() {
    try {
      const saved = JSON.parse(localStorage.getItem(SHOP_KEY) || 'null');
      if (!saved?.owned) return '새 아틀리에';
      let owned = 0, total = 0;
      Object.values(saved.owned).forEach(arr => {
        if (!Array.isArray(arr)) return;
        total += arr.length;
        owned += arr.filter(Boolean).length;
      });
      return total ? `컬렉션 ${owned}/${total}` : '새 아틀리에';
    } catch (_) {
      return '새 아틀리에';
    }
  }

  function storedPreview() {
    try { return localStorage.getItem(PREVIEW_KEY) || ''; } catch (_) { return ''; }
  }

  function installStyles() {
    if (document.getElementById('kidscade-avatar-live-style')) return;
    const style = document.createElement('style');
    style.id = 'kidscade-avatar-live-style';
    style.textContent = `
      #kidscade-avatar-studio-overlay{position:fixed;left:-10000px;top:0;width:16px;height:16px;z-index:30000;background:rgba(18,14,28,.82);backdrop-filter:blur(9px);opacity:0;pointer-events:none;overflow:hidden;padding:0;box-sizing:border-box}
      #kidscade-avatar-studio-overlay.open{left:0;top:0;width:100vw;height:100vh;opacity:1;pointer-events:auto;overflow:visible;padding:12px;display:grid;grid-template-rows:auto minmax(0,1fr)}
      #kidscade-avatar-studio-bar{max-width:1420px;width:100%;margin:0 auto;background:#2d2640;color:white;border-radius:18px 18px 0 0;padding:10px 12px 10px 16px;box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;gap:10px;box-shadow:0 12px 30px rgba(0,0,0,.22)}
      #kidscade-avatar-studio-bar strong{font-size:1rem}#kidscade-avatar-studio-bar span{font-size:.76rem;opacity:.8;margin-left:8px}
      #kidscade-avatar-studio-close{border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.12);color:#fff;border-radius:12px;padding:9px 14px;font-weight:900;cursor:pointer}
      #kidscade-avatar-studio-frame{display:block;max-width:1420px;width:100%;height:100%;margin:0 auto;border:0;border-radius:0 0 18px 18px;background:#f8f5fa;box-shadow:0 16px 40px rgba(0,0,0,.28)}
      #avatar-plaza-preview > :not(#kidscade-deluxe-avatar-preview){display:none!important}
      #kidscade-deluxe-avatar-preview .kidscade-avatar-live-stage{position:absolute;inset:0;overflow:hidden;border-radius:inherit;pointer-events:none}
      #kidscade-deluxe-avatar-preview .kidscade-avatar-live-img{position:absolute;left:50%;bottom:-1%;width:min(78%,240px);height:92%;object-fit:contain;image-rendering:auto;transform-origin:50% 92%;will-change:transform;filter:drop-shadow(0 12px 12px rgba(38,26,56,.16))}
      #kidscade-deluxe-avatar-preview .kidscade-avatar-live-shadow{position:absolute;left:50%;bottom:5.5%;width:30%;height:8px;border-radius:50%;background:rgba(52,42,65,.14);filter:blur(2px);transform:translateX(-50%);transform-origin:center;will-change:transform,opacity}
      #kidscade-deluxe-avatar-preview .kidscade-avatar-empty{position:absolute;inset:0;display:grid;place-items:center;font-weight:900;color:#756c86;font-size:.85rem}
      @media(max-width:700px){#kidscade-avatar-studio-overlay{padding:0}#kidscade-avatar-studio-bar{border-radius:0;padding:8px 10px}#kidscade-avatar-studio-bar span{display:none}#kidscade-avatar-studio-frame{border-radius:0}}
      @media(prefers-reduced-motion:reduce){#kidscade-deluxe-avatar-preview .kidscade-avatar-live-img{transition:none!important}}
    `;
    document.head.appendChild(style);
  }

  function purgeLegacyPreview(host, keep) {
    for (const child of [...host.children]) {
      if (child !== keep) child.remove();
    }
  }

  function ensurePreviewLayer() {
    const host = document.getElementById('avatar-plaza-preview');
    if (!host) return;
    host.style.position = 'relative';
    let layer = host.querySelector('#kidscade-deluxe-avatar-preview');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'kidscade-deluxe-avatar-preview';
      Object.assign(layer.style, {
        position: 'absolute', inset: '0', zIndex: '20', pointerEvents: 'none',
        borderRadius: 'inherit', overflow: 'hidden',
        background: 'linear-gradient(180deg,rgba(255,255,255,.06),rgba(124,92,255,.03))'
      });
      layer.innerHTML = `
        <div class="kidscade-avatar-live-stage">
          <div class="kidscade-avatar-live-shadow"></div>
          <img class="kidscade-avatar-live-img" alt="내 Kidscade 캐릭터">
          <div class="kidscade-avatar-empty">👤 캐릭터를 꾸며보세요</div>
        </div>`;
      host.appendChild(layer);
    }
    purgeLegacyPreview(host, layer);
    liveImg = layer.querySelector('.kidscade-avatar-live-img');
    liveShadow = layer.querySelector('.kidscade-avatar-live-shadow');
    const empty = layer.querySelector('.kidscade-avatar-empty');
    const data = storedPreview();
    if (data && liveImg && !liveImg.src) liveImg.src = data;
    if (liveImg) liveImg.style.display = data || frameLoaded ? 'block' : 'none';
    if (liveShadow) liveShadow.style.display = data || frameLoaded ? 'block' : 'none';
    if (empty) empty.style.display = data || frameLoaded ? 'none' : 'grid';

    const summary = document.getElementById('avatar-collection-summary');
    if (summary) summary.textContent = ownedSummary();
    const button = document.getElementById('avatar-open-btn');
    if (button) button.textContent = '👕 캐릭터 꾸미기 · 상점';
  }

  function watchPreview() {
    const host = document.getElementById('avatar-plaza-preview');
    if (!host || previewObserver) return;
    previewObserver = new MutationObserver(() => queueMicrotask(ensurePreviewLayer));
    previewObserver.observe(host, { childList: true });
  }

  function snapshotFromStudio() {
    try {
      const api = frame?.contentWindow?.KidscadeAvatarShop;
      const data = api?.getPreviewDataURL?.();
      if (data && data.startsWith('data:image/png')) {
        localStorage.setItem(PREVIEW_KEY, data);
        ensurePreviewLayer();
        if (liveImg) liveImg.src = data;
        return data;
      }
    } catch (_) {}
    return '';
  }

  function closeStudio() {
    snapshotFromStudio();
    if (!overlay) return;
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = overlay.dataset.prevOverflow || '';
    motion.next = performance.now() + 900;
  }

  function buildOverlay() {
    if (overlay) return;
    installStyles();
    overlay = document.createElement('div');
    overlay.id = 'kidscade-avatar-studio-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `
      <div id="kidscade-avatar-studio-bar">
        <div><strong>👤 Kidscade 캐릭터 아틀리에</strong><span>게임에서 모은 씨앗으로 스타일을 해금해요</span></div>
        <button id="kidscade-avatar-studio-close" type="button">저장하고 닫기 ✕</button>
      </div>
      <iframe id="kidscade-avatar-studio-frame" title="Kidscade 캐릭터 꾸미기 상점" src="${STUDIO_URL}"></iframe>`;
    document.body.appendChild(overlay);
    frame = overlay.querySelector('#kidscade-avatar-studio-frame');
    overlay.querySelector('#kidscade-avatar-studio-close').addEventListener('click', closeStudio);
    overlay.addEventListener('pointerdown', e => { if (e.target === overlay) closeStudio(); });
    frame.addEventListener('load', () => {
      frameLoaded = true;
      try { frame.contentWindow.KidscadeAvatarShop?.setSeeds?.(readCoins()); } catch (_) {}
      setTimeout(() => {
        snapshotFromStudio();
        ensurePreviewLayer();
        startLivePreview();
      }, 100);
    });
  }

  function openStudio() {
    buildOverlay();
    try { frame.contentWindow.KidscadeAvatarShop?.setSeeds?.(readCoins()); } catch (_) {}
    overlay.dataset.prevOverflow = document.body.style.overflow || '';
    document.body.style.overflow = 'hidden';
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
  }

  function startMotion(now) {
    const roll = Math.random();
    motion.start = now;
    if (roll < 0.52) {
      motion.mode = 'walk';
      motion.end = now + 2300 + Math.random() * 1500;
      if (motion.x > 20) motion.dir = -1;
      else if (motion.x < -20) motion.dir = 1;
      else motion.dir = Math.random() < .5 ? -1 : 1;
    } else if (roll < 0.82) {
      motion.mode = 'jump';
      motion.end = now + 720;
    } else {
      motion.mode = 'smile';
      motion.end = now + 1200;
    }
  }

  function finishMotion(now) {
    motion.mode = 'idle';
    motion.y = 0;
    motion.squash = 1;
    motion.next = now + 2600 + Math.random() * 3600;
  }

  function syncStudioFallbackMode(mode) {
    try {
      const doc = frame?.contentDocument;
      if (!doc) return;
      const next = ['idle', 'walk', 'jump', 'smile'].includes(mode) ? mode : 'idle';
      if (next === 'jump') {
        if (fallbackMode !== 'jump') doc.querySelector('[data-action="jump"]')?.click();
      } else if (fallbackMode !== next) {
        doc.querySelector(`[data-action="${next}"]`)?.click();
      }
      fallbackMode = next;
    } catch (_) {}
  }

  function captureLiveFrame(now) {
    if (!frameLoaded || overlay?.classList.contains('open')) return;
    if (now - motion.lastCapture < 105) return;
    motion.lastCapture = now;
    try {
      const api = frame?.contentWindow?.KidscadeAvatarShop;
      const mode = prefersReducedMotion ? 'idle' : motion.mode;
      let data = api?.renderPreviewFrame?.(mode, now / 1000) || '';
      if (!data) {
        syncStudioFallbackMode(mode);
        data = api?.getPreviewDataURL?.() || '';
      }
      if (data && data.startsWith('data:image/png')) {
        ensurePreviewLayer();
        if (liveImg) {
          liveImg.src = data;
          liveImg.style.display = 'block';
          const empty = liveImg.parentElement?.querySelector('.kidscade-avatar-empty');
          if (empty) empty.style.display = 'none';
        }
        if (liveShadow) liveShadow.style.display = 'block';
      }
    } catch (_) {}
  }

  function updateLiveMotion(now) {
    ensurePreviewLayer();
    if (!liveImg) return;
    if (!motion.last) motion.last = now;
    const dt = Math.min(0.06, (now - motion.last) / 1000);
    motion.last = now;

    if (!prefersReducedMotion && !overlay?.classList.contains('open')) {
      if (!motion.next) motion.next = now + 1300 + Math.random() * 1800;
      if (motion.mode === 'idle' && now >= motion.next) startMotion(now);
      if (motion.mode !== 'idle' && now >= motion.end) finishMotion(now);

      if (motion.mode === 'walk') {
        motion.x += motion.dir * dt * 12;
        if (motion.x > 30) { motion.x = 30; motion.dir = -1; }
        if (motion.x < -30) { motion.x = -30; motion.dir = 1; }
      } else if (motion.mode === 'jump') {
        const p = Math.max(0, Math.min(1, (now - motion.start) / Math.max(1, motion.end - motion.start)));
        const airborne = Math.sin(p * Math.PI);
        motion.y = -airborne * 17;
        motion.squash = 1 + airborne * .025;
      } else {
        motion.y = 0;
        motion.squash = 1;
      }
    }

    liveImg.style.transform = `translateX(calc(-50% + ${motion.x.toFixed(2)}px)) translateY(${motion.y.toFixed(2)}px) scaleX(${motion.dir}) scaleY(${motion.squash.toFixed(3)})`;
    if (liveShadow) {
      const lift = Math.min(1, Math.abs(motion.y) / 17);
      const scale = 1 - lift * .28;
      liveShadow.style.transform = `translateX(-50%) scale(${scale.toFixed(3)})`;
      liveShadow.style.opacity = String(.95 - lift * .45);
    }
  }

  function liveLoop(now) {
    liveRaf = requestAnimationFrame(liveLoop);
    const host = document.getElementById('avatar-plaza-preview');
    if (!host || document.hidden) return;
    const r = host.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    updateLiveMotion(now);
    captureLiveFrame(now);
  }

  function startLivePreview() {
    if (!liveRaf) liveRaf = requestAnimationFrame(liveLoop);
  }

  document.addEventListener('click', event => {
    const button = event.target.closest?.('#avatar-open-btn');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openStudio();
  }, true);

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && overlay?.classList.contains('open')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeStudio();
    }
  }, true);

  window.addEventListener('message', event => {
    if (event.source !== frame?.contentWindow) return;
    if (event.data?.type === 'kidscade-avatar-change') setTimeout(snapshotFromStudio, 80);
    if (event.data?.type === 'kidscade-avatar-wallet') ensurePreviewLayer();
  });

  window.addEventListener('storage', event => {
    if (event.key === SHOP_KEY || event.key === PREVIEW_KEY) ensurePreviewLayer();
  });

  // Garden uses the exact saved avatar-studio appearance, while garden-life.js adds behaviour.
  if (window.KidscadeGarden?.init) {
    const gardenInit = window.KidscadeGarden.init;
    window.KidscadeGarden.init = function (bridge) {
      const originalAvatar = bridge.avatar;
      const wrapped = { ...bridge, avatar() {
        const png = storedPreview();
        if (!png) return originalAvatar?.();
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 160"><image href="${png}" width="128" height="160"/></svg>`;
      }};
      return gardenInit(wrapped);
    };
  }

  document.addEventListener('DOMContentLoaded', () => {
    const legacy = document.getElementById('avatar-modal');
    if (legacy) legacy.setAttribute('aria-hidden', 'true');
    installStyles();
    buildOverlay();
    setTimeout(() => { ensurePreviewLayer(); watchPreview(); startLivePreview(); }, 0);
  });
})();

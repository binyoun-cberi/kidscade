/* Kidscade avatar studio integration: deluxe shop + stable static main-card preview. */
(function () {
  'use strict';

  const STUDIO_URL = 'avatar-studio.html';
  const PREVIEW_KEY = 'kidscade-avatar-studio-preview';
  const PREVIEW_VERSION_KEY = 'kidscade-avatar-studio-preview-version';
  const PREVIEW_VERSION = 'pixel-v3-school-starter-2';
  const PIXEL_STATE_KEY = 'kidscade-avatar-v3';
  const SCHOOL_DEFAULT_IMAGE = 'assets/game/characters/kidscade-avatar-v3/school-starter/guest-default.png';
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  let overlay = null;
  let frame = null;
  let previewObserver = null;
  let liveRaf = 0;
  let liveImg = null;
  let liveShadow = null;
  let frameLoaded = false;
  let fallbackMode = '';
  let previewSuspended = false;
  let mediaGuardDoc = null;
  let rendererLoadPromise = null;
  let guestDefaultPreviewPromise = null;

  const motion = {
    mode: 'idle', start: 0, end: 0, next: 0, x: 0, dir: 1,
    last: 0, lastCapture: 0, y: 0, squash: 1
  };

  function externalGameActive() {
    const gameModal = document.getElementById('game-modal');
    const worldOverlay = document.getElementById('kidscade-life-world-overlay');
    return Boolean(
      (gameModal && !gameModal.classList.contains('hidden')) ||
      worldOverlay?.classList.contains('open')
    );
  }

  function studioPreviewShouldBeSilent() {
    return externalGameActive() && !overlay?.classList.contains('open');
  }

  function installMediaGuard() {
    let doc = null;
    try { doc = frame?.contentDocument || null; } catch (_) {}
    if (!doc || mediaGuardDoc === doc) return;
    mediaGuardDoc = doc;
    const stopHiddenMedia = event => {
      if (!studioPreviewShouldBeSilent()) return;
      const media = event.target;
      if (!media || !/^(AUDIO|VIDEO)$/.test(media.tagName || '')) return;
      try {
        if (!media.dataset.kcPreviewMuted) media.dataset.kcPreviewMuted = media.muted ? '1' : '0';
        media.muted = true;
        media.pause?.();
      } catch (_) {}
    };
    doc.addEventListener('play', stopHiddenMedia, true);
    doc.addEventListener('playing', stopHiddenMedia, true);
  }

  function silenceStudioMedia() {
    installMediaGuard();
    let doc = null;
    try { doc = frame?.contentDocument || null; } catch (_) {}
    if (!doc) return;
    doc.querySelectorAll('audio,video').forEach(media => {
      try {
        if (!media.dataset.kcPreviewMuted) media.dataset.kcPreviewMuted = media.muted ? '1' : '0';
        media.muted = true;
        media.pause?.();
      } catch (_) {}
    });
  }

  function restoreStudioMedia() {
    let doc = null;
    try { doc = frame?.contentDocument || null; } catch (_) {}
    if (!doc) return;
    doc.querySelectorAll('audio[data-kc-preview-muted],video[data-kc-preview-muted]').forEach(media => {
      try {
        media.muted = media.dataset.kcPreviewMuted === '1';
        delete media.dataset.kcPreviewMuted;
      } catch (_) {}
    });
  }

  function setPreviewSuspended(next) {
    next = Boolean(next);
    if (previewSuspended === next) {
      if (next) silenceStudioMedia();
      return;
    }
    previewSuspended = next;
    if (next) {
      motion.mode = 'idle';
      motion.y = 0;
      motion.squash = 1;
      motion.last = 0;
      silenceStudioMedia();
    } else {
      restoreStudioMedia();
      motion.next = performance.now() + 900;
    }
  }

  function readCoins() {
    const n = parseInt(localStorage.getItem('kidscade_coins') || '0', 10);
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  }

  function pixelState() {
    try {
      const pixel = JSON.parse(localStorage.getItem(PIXEL_STATE_KEY) || 'null');
      return pixel && typeof pixel === 'object' ? pixel : null;
    } catch (_) {
      return null;
    }
  }

  function ownedSummary() {
    return '학교 탐험가 · v3 파츠';
  }

  function equippedSummary() {
    return '교복 · 운동화 · 자 · 교과서';
  }

  function isPreviewData(data) {
    return typeof data === 'string' && data.startsWith('data:image/png');
  }

  function storedPreview() {
    try {
      const data = localStorage.getItem(PREVIEW_KEY) || '';
      if (!isPreviewData(data)) return '';
      if (localStorage.getItem(PREVIEW_VERSION_KEY) !== PREVIEW_VERSION) return '';
      return data;
    } catch (_) {
      return '';
    }
  }

  function ensureGuestDefaultPreview() {
    const saved = storedPreview();
    if (saved) return Promise.resolve(saved);
    if (guestDefaultPreviewPromise) return guestDefaultPreviewPromise;

    guestDefaultPreviewPromise = (async () => {
      try {
        if (localStorage.getItem(PREVIEW_VERSION_KEY) !== PREVIEW_VERSION) {
          localStorage.removeItem(PREVIEW_KEY);
          localStorage.removeItem(PREVIEW_VERSION_KEY);
        }
      } catch (_) {}

      const image = new Image();
      image.src = new URL(SCHOOL_DEFAULT_IMAGE, document.baseURI).href;
      try {
        await image.decode();
        const schoolCanvas = document.createElement('canvas');
        schoolCanvas.width = schoolCanvas.height = 128;
        const schoolCtx = schoolCanvas.getContext('2d');
        schoolCtx.imageSmoothingEnabled = false;
        schoolCtx.drawImage(image, 0, 0);
        const data = schoolCanvas.toDataURL('image/png');
        if (isPreviewData(data)) {
          localStorage.setItem(PREVIEW_KEY, data);
          localStorage.setItem(PREVIEW_VERSION_KEY, PREVIEW_VERSION);
          return data;
        }
      } catch (_) {}
      return '';
    })().finally(() => { guestDefaultPreviewPromise = null; });

    return guestDefaultPreviewPromise;
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
      #avatar-plaza-preview > :not(#kidscade-deluxe-avatar-preview):not(#avatar-open-btn){display:none!important}
      #kidscade-deluxe-avatar-preview .kidscade-avatar-live-stage{position:absolute;inset:0;overflow:hidden;border-radius:inherit;pointer-events:none}
      #kidscade-deluxe-avatar-preview .kidscade-avatar-live-img{position:absolute;left:50%;bottom:-1%;width:min(78%,240px);height:92%;object-fit:contain;image-rendering:pixelated;image-rendering:crisp-edges;transform-origin:50% 92%;filter:drop-shadow(0 12px 12px rgba(38,26,56,.16))}
      #kidscade-deluxe-avatar-preview .kidscade-avatar-live-shadow{position:absolute;left:50%;bottom:5.5%;width:30%;height:8px;border-radius:50%;background:rgba(52,42,65,.14);filter:blur(2px);transform:translateX(-50%);transform-origin:center}
      #kidscade-deluxe-avatar-preview .kidscade-avatar-empty{position:absolute;inset:0;display:grid;place-items:center;font-weight:900;color:#756c86;font-size:.85rem}
      #avatar-plaza-preview .avatar-preview-edit{position:absolute!important;right:12px!important;bottom:12px!important;left:auto!important;top:auto!important;z-index:80!important;display:inline-flex!important;align-items:center;justify-content:center;min-height:40px!important;width:auto!important;padding:0 16px!important;border:2px solid rgba(255,255,255,.92)!important;border-radius:999px!important;background:linear-gradient(135deg,#8b5cf6 0%,#a855f7 48%,#ec4899 100%)!important;color:#fff!important;font-size:.74rem!important;font-weight:1000!important;letter-spacing:-.01em!important;box-shadow:0 9px 20px rgba(83,51,145,.32),inset 0 1px 0 rgba(255,255,255,.22)!important;pointer-events:auto!important;opacity:1!important;visibility:visible!important;transition:transform .16s ease,box-shadow .16s ease!important}
      #avatar-plaza-preview .avatar-preview-edit:hover{transform:translateY(-2px)!important;box-shadow:0 13px 26px rgba(83,51,145,.38),inset 0 1px 0 rgba(255,255,255,.24)!important}
      @media(max-width:700px){#kidscade-avatar-studio-overlay{padding:0}#kidscade-avatar-studio-bar{border-radius:0;padding:8px 10px}#kidscade-avatar-studio-bar span{display:none}#kidscade-avatar-studio-frame{border-radius:0}}
      @media(prefers-reduced-motion:reduce){#kidscade-deluxe-avatar-preview .kidscade-avatar-live-img{transition:none!important}}
    `;
    document.head.appendChild(style);
  }

  function purgeLegacyPreview(host, keep) {
    for (const child of [...host.children]) {
      if (child !== keep && child.id !== 'avatar-open-btn') child.remove();
    }
  }

  function ensurePreviewEditButton(host) {
    if (!host) return null;
    let button = host.querySelector('#avatar-open-btn');
    if (!button) {
      button = document.createElement('button');
      button.id = 'avatar-open-btn';
      button.type = 'button';
      button.className = 'avatar-open-btn avatar-preview-edit';
      host.appendChild(button);
    }
    button.classList.add('avatar-open-btn','avatar-preview-edit');
    button.textContent = '👕 아바타 꾸미기 ›';
    button.setAttribute('aria-label','내 캐릭터 꾸미기');
    return button;
  }

  function hideBrokenPreview(layer) {
    if (liveImg) {
      liveImg.style.display = 'none';
      liveImg.style.transform = 'translateX(-50%)';
    }
    if (liveShadow) liveShadow.style.display = 'none';
    const empty = layer?.querySelector('.kidscade-avatar-empty');
    if (empty) empty.style.display = 'grid';
  }

  function ensurePreviewLayer() {
    const host = document.getElementById('avatar-plaza-preview');
    if (!host) return;
    host.style.position = 'relative';
    ensurePreviewEditButton(host);
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
          <img class="kidscade-avatar-live-img" alt="" draggable="false">
          <div class="kidscade-avatar-empty">👤 캐릭터를 꾸며보세요</div>
        </div>`;
      host.appendChild(layer);
    }
    purgeLegacyPreview(host, layer);
    const editButton = ensurePreviewEditButton(host);
    if (editButton && editButton !== host.lastElementChild) host.appendChild(editButton);
    liveImg = layer.querySelector('.kidscade-avatar-live-img');
    liveShadow = layer.querySelector('.kidscade-avatar-live-shadow');
    const empty = layer.querySelector('.kidscade-avatar-empty');
    const data = storedPreview();

    if (liveImg && liveImg.dataset.kidscadeErrorGuard !== '1') {
      liveImg.dataset.kidscadeErrorGuard = '1';
      liveImg.addEventListener('error', () => {
        try {
          const current = liveImg?.getAttribute('src') || '';
          if (current && current === localStorage.getItem(PREVIEW_KEY)) {
            localStorage.removeItem(PREVIEW_KEY);
            localStorage.removeItem(PREVIEW_VERSION_KEY);
          }
        } catch (_) {}
        liveImg?.removeAttribute('src');
        hideBrokenPreview(layer);
        setTimeout(() => ensureGuestDefaultPreview().then(ensurePreviewLayer).catch(() => {}), 0);
      });
    }

    if (!data && liveImg?.getAttribute('src')) liveImg.removeAttribute('src');
    if (data && liveImg && liveImg.getAttribute('src') !== data) liveImg.src = data;
    const hasImage = !!liveImg?.getAttribute('src');
    if (liveImg) liveImg.style.display = hasImage ? 'block' : 'none';
    if (liveShadow) liveShadow.style.display = hasImage ? 'block' : 'none';
    if (empty) empty.style.display = hasImage ? 'none' : 'grid';

    const summary = document.getElementById('avatar-collection-summary');
    if (summary) summary.textContent = ownedSummary();
    const equipped = document.getElementById('avatar-equipped-summary');
    if (equipped) equipped.textContent = equippedSummary();
    const button = ensurePreviewEditButton(host);
    if (button) button.textContent = '👕 꾸미기';
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
      if (isPreviewData(data)) {
        localStorage.setItem(PREVIEW_KEY, data);
        localStorage.setItem(PREVIEW_VERSION_KEY, PREVIEW_VERSION);
        ensurePreviewLayer();
        if (liveImg) {
          liveImg.src = data;
          liveImg.style.display = 'block';
        }
        if (liveShadow) liveShadow.style.display = 'block';
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

  function syncFrameReady(attempt = 0) {
    if (!frame) return;
    const src = frame.getAttribute('src') || '';
    const deferred = frame.dataset.kidscadeDeferred === '1';
    if (deferred || !src || src === 'about:blank' || src.startsWith('about:blank#')) {
      frameLoaded = false;
      ensurePreviewLayer();
      return;
    }

    let api = null;
    try { api = frame.contentWindow?.KidscadeAvatarShop || null; } catch (_) {}
    if (!api) {
      frameLoaded = false;
      if (attempt < 8) setTimeout(() => syncFrameReady(attempt + 1), 60);
      else ensurePreviewLayer();
      return;
    }

    frameLoaded = true;
    installMediaGuard();
    if (studioPreviewShouldBeSilent()) silenceStudioMedia();
    try { api.setSeeds?.(readCoins()); } catch (_) {}
    setTimeout(() => {
      snapshotFromStudio();
      ensurePreviewLayer();
      startLivePreview();
    }, 100);
  }

  function buildOverlay() {
    if (overlay) return;
    installStyles();
    overlay = document.createElement('div');
    overlay.id = 'kidscade-avatar-studio-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `
      <div id="kidscade-avatar-studio-bar">
        <div><strong>👤 Kidscade 캐릭터 아틀리에</strong><span>새 v3 파츠로 나만의 캐릭터를 만들어요</span></div>
        <button id="kidscade-avatar-studio-close" type="button">저장하고 닫기 ✕</button>
      </div>
      <iframe id="kidscade-avatar-studio-frame" title="Kidscade 캐릭터 꾸미기 상점" src="${STUDIO_URL}"></iframe>`;
    document.body.appendChild(overlay);
    frame = overlay.querySelector('#kidscade-avatar-studio-frame');
    overlay.querySelector('#kidscade-avatar-studio-close').addEventListener('click', closeStudio);
    overlay.addEventListener('pointerdown', e => { if (e.target === overlay) closeStudio(); });
    frame.addEventListener('load', () => { mediaGuardDoc = null; syncFrameReady(0); });
  }

  function openStudio() {
    buildOverlay();
    setPreviewSuspended(false);
    restoreStudioMedia();
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
      if (!api) {
        frameLoaded = false;
        return;
      }
      const mode = prefersReducedMotion ? 'idle' : motion.mode;
      let data = api.renderPreviewFrame?.(mode, now / 1000) || '';
      if (!data) {
        syncStudioFallbackMode(mode);
        data = api.getPreviewDataURL?.() || '';
      }
      if (isPreviewData(data)) {
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
    if (!liveImg || !liveImg.getAttribute('src') || liveImg.style.display === 'none') return;
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
    const blocked = studioPreviewShouldBeSilent();
    setPreviewSuspended(blocked);
    if (blocked) return;
    const host = document.getElementById('avatar-plaza-preview');
    if (!host || document.hidden) return;
    const r = host.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    updateLiveMotion(now);
    captureLiveFrame(now);
  }

  function startLivePreview() {
    // The lobby/profile card is a diagnostic-quality static preview.
    // Do not swap pose PNGs or apply sub-pixel walk/jump transforms here:
    // on mobile Safari that made the 128px pixel avatar visibly tremble.
    if (liveRaf) cancelAnimationFrame(liveRaf);
    liveRaf = 0;
    motion.mode = 'idle';
    motion.x = 0;
    motion.y = 0;
    motion.dir = 1;
    motion.squash = 1;
    motion.last = 0;
    motion.lastCapture = 0;
    ensurePreviewLayer();
    if (liveImg) liveImg.style.transform = 'translateX(-50%)';
    if (liveShadow) {
      liveShadow.style.transform = 'translateX(-50%) scale(1)';
      liveShadow.style.opacity = '.95';
    }
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
    if (event.key === PIXEL_STATE_KEY || event.key === PREVIEW_KEY || event.key === PREVIEW_VERSION_KEY) ensurePreviewLayer();
  });

  document.addEventListener('DOMContentLoaded', () => {
    const legacy = document.getElementById('avatar-modal');
    if (legacy) {
      legacy.classList.add('hidden');
      legacy.setAttribute('aria-hidden', 'true');
      legacy.setAttribute('inert', '');
      legacy.dataset.retiredBy = 'pixel-avatar-v3';
    }
    installStyles();
    buildOverlay();
    setTimeout(async () => {
      await ensureGuestDefaultPreview().catch(() => '');
      ensurePreviewLayer();
      watchPreview();
      startLivePreview();
    }, 0);
  });
})();
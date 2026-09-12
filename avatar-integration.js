/* Kidscade avatar studio integration: opens the deluxe shop from the existing avatar card. */
(function () {
  'use strict';

  const STUDIO_URL = 'avatar-studio.html';
  const PREVIEW_KEY = 'kidscade-avatar-studio-preview';
  const SHOP_KEY = 'kidscade-avatar-shop-v2';
  let overlay = null;
  let frame = null;
  let previewObserver = null;

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

  function ensurePreviewLayer() {
    const host = document.getElementById('avatar-plaza-preview');
    if (!host) return;
    host.style.position = 'relative';
    let layer = host.querySelector('#kidscade-deluxe-avatar-preview');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'kidscade-deluxe-avatar-preview';
      Object.assign(layer.style, {
        position: 'absolute', inset: '0', zIndex: '20', display: 'grid', placeItems: 'center',
        pointerEvents: 'none', borderRadius: 'inherit', overflow: 'hidden',
        background: 'linear-gradient(180deg,rgba(255,255,255,.06),rgba(124,92,255,.03))'
      });
      host.appendChild(layer);
    }
    const data = storedPreview();
    layer.innerHTML = data
      ? `<img alt="내 Kidscade 캐릭터" src="${data}" style="width:min(78%,240px);height:92%;object-fit:contain;image-rendering:auto;filter:drop-shadow(0 12px 12px rgba(38,26,56,.18));">`
      : '<div style="font-weight:900;color:#756c86;font-size:.85rem;">👤 캐릭터를 꾸며보세요</div>';

    const summary = document.getElementById('avatar-collection-summary');
    if (summary) summary.textContent = ownedSummary();
    const button = document.getElementById('avatar-open-btn');
    if (button) button.textContent = '👕 캐릭터 꾸미기 · 상점';
  }

  function watchPreview() {
    const host = document.getElementById('avatar-plaza-preview');
    if (!host || previewObserver) return;
    previewObserver = new MutationObserver(() => {
      if (!host.querySelector('#kidscade-deluxe-avatar-preview')) queueMicrotask(ensurePreviewLayer);
    });
    previewObserver.observe(host, { childList: true });
  }

  function snapshotFromStudio() {
    try {
      const api = frame?.contentWindow?.KidscadeAvatarShop;
      const data = api?.getPreviewDataURL?.();
      if (data && data.startsWith('data:image/png')) {
        localStorage.setItem(PREVIEW_KEY, data);
        ensurePreviewLayer();
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
  }

  function buildOverlay() {
    if (overlay) return;
    const style = document.createElement('style');
    style.textContent = `
      #kidscade-avatar-studio-overlay{position:fixed;inset:0;z-index:30000;background:rgba(18,14,28,.82);backdrop-filter:blur(9px);display:none;padding:12px;box-sizing:border-box}
      #kidscade-avatar-studio-overlay.open{display:grid;grid-template-rows:auto minmax(0,1fr)}
      #kidscade-avatar-studio-bar{max-width:1420px;width:100%;margin:0 auto;background:#2d2640;color:white;border-radius:18px 18px 0 0;padding:10px 12px 10px 16px;box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;gap:10px;box-shadow:0 12px 30px rgba(0,0,0,.22)}
      #kidscade-avatar-studio-bar strong{font-size:1rem}#kidscade-avatar-studio-bar span{font-size:.76rem;opacity:.8;margin-left:8px}
      #kidscade-avatar-studio-close{border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.12);color:#fff;border-radius:12px;padding:9px 14px;font-weight:900;cursor:pointer}
      #kidscade-avatar-studio-frame{display:block;max-width:1420px;width:100%;height:100%;margin:0 auto;border:0;border-radius:0 0 18px 18px;background:#f8f5fa;box-shadow:0 16px 40px rgba(0,0,0,.28)}
      @media(max-width:700px){#kidscade-avatar-studio-overlay{padding:0}#kidscade-avatar-studio-bar{border-radius:0;padding:8px 10px}#kidscade-avatar-studio-bar span{display:none}#kidscade-avatar-studio-frame{border-radius:0}}
    `;
    document.head.appendChild(style);

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
      try { frame.contentWindow.KidscadeAvatarShop?.setSeeds?.(readCoins()); } catch (_) {}
      setTimeout(snapshotFromStudio, 100);
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

  // Capture-phase interception prevents the legacy avatar modal click handler from firing.
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

  // Make the animal garden use the new studio sprite if one has been saved.
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
    setTimeout(() => { ensurePreviewLayer(); watchPreview(); }, 0);
  });
})();

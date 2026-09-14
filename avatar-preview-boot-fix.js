/* Prevent the hidden avatar studio from replacing the saved preview with its default hair during page boot.
   The heavy studio iframe is deferred until the user actually opens the atelier.
   Also removes the retired "도트 바즈컷" option without mutating other avatar data. */
(function () {
  'use strict';

  const OVERLAY_ID = 'kidscade-avatar-studio-overlay';
  const FRAME_ID = 'kidscade-avatar-studio-frame';
  const FALLBACK_SRC = 'avatar-studio.html';
  const RETIRED_HAIR = ['도트 바즈컷', 'dot buzzcut'];
  let activated = false;
  let deferred = false;

  function getParts() {
    return {
      overlay: document.getElementById(OVERLAY_ID),
      frame: document.getElementById(FRAME_ID)
    };
  }

  function isRetiredText(value) {
    const text = String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
    return RETIRED_HAIR.some(name => text.includes(name.toLowerCase()));
  }

  function purgeRetiredHair(frame) {
    try {
      const doc = frame?.contentDocument;
      if (!doc?.documentElement) return;
      const selectors = [
        'button','[role="button"]','label','option','[data-name]','[data-label]',
        '[data-title]','[title]','.item','.option','.hair-item','.style-item','.card'
      ].join(',');
      for (const el of [...doc.querySelectorAll(selectors)]) {
        const meta = [el.textContent, el.getAttribute?.('data-name'), el.getAttribute?.('data-label'), el.getAttribute?.('data-title'), el.getAttribute?.('title')].join(' ');
        if (isRetiredText(meta)) el.remove();
      }
    } catch (_) {}
  }

  function installRetiredHairGuard(frame) {
    if (!frame || frame.dataset.kidscadeRetiredHairGuard === '1') return;
    frame.dataset.kidscadeRetiredHairGuard = '1';
    const arm = () => {
      purgeRetiredHair(frame);
      try {
        const doc = frame.contentDocument;
        if (!doc?.documentElement || doc.__kidscadeRetiredHairObserver) return;
        const observer = new MutationObserver(() => purgeRetiredHair(frame));
        observer.observe(doc.documentElement, { childList: true, subtree: true });
        doc.__kidscadeRetiredHairObserver = observer;
        doc.addEventListener('click', event => {
          const target = event.target?.closest?.('button,[role="button"],label,.item,.option,.hair-item,.style-item,.card');
          if (target && isRetiredText(target.textContent)) {
            event.preventDefault();
            event.stopImmediatePropagation();
          }
        }, true);
      } catch (_) {}
      setTimeout(() => purgeRetiredHair(frame), 100);
      setTimeout(() => purgeRetiredHair(frame), 500);
    };
    frame.addEventListener('load', arm);
    arm();
  }

  function deferInitialLoad() {
    if (activated || deferred) return;
    const { overlay, frame } = getParts();
    if (!overlay || !frame) return;
    installRetiredHairGuard(frame);

    if (overlay.classList.contains('open')) {
      activateStudio();
      return;
    }

    const src = frame.getAttribute('src') || FALLBACK_SRC;
    frame.dataset.kidscadeDeferred = '1';
    if (src === 'about:blank' || src.startsWith('about:blank#')) {
      deferred = true;
      return;
    }

    frame.dataset.kidscadeDeferredSrc = src;
    frame.setAttribute('src', 'about:blank');
    deferred = true;
  }

  function activateStudio() {
    if (activated) return;
    const { overlay, frame } = getParts();
    if (!overlay || !frame || !overlay.classList.contains('open')) return;
    installRetiredHairGuard(frame);

    const src = frame.dataset.kidscadeDeferredSrc || FALLBACK_SRC;
    activated = true;
    deferred = false;
    delete frame.dataset.kidscadeDeferred;
    delete frame.dataset.kidscadeDeferredSrc;

    if (frame.getAttribute('src') !== src) frame.setAttribute('src', src);
  }

  function sync() {
    const { overlay, frame } = getParts();
    if (!overlay) return;
    if (frame) installRetiredHairGuard(frame);
    if (overlay.classList.contains('open')) activateStudio();
    else deferInitialLoad();
  }

  const observer = new MutationObserver(sync);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class']
  });

  sync();
  document.addEventListener('DOMContentLoaded', sync, { once: true });
})();

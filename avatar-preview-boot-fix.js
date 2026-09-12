/* Prevent the hidden avatar studio from replacing the saved preview with its default hair during page boot.
   The heavy studio iframe is deferred until the user actually opens the atelier. */
(function () {
  'use strict';

  const OVERLAY_ID = 'kidscade-avatar-studio-overlay';
  const FRAME_ID = 'kidscade-avatar-studio-frame';
  const FALLBACK_SRC = 'avatar-studio.html';
  let activated = false;
  let deferred = false;

  function getParts() {
    return {
      overlay: document.getElementById(OVERLAY_ID),
      frame: document.getElementById(FRAME_ID)
    };
  }

  function deferInitialLoad() {
    if (activated || deferred) return;
    const { overlay, frame } = getParts();
    if (!overlay || !frame) return;

    if (overlay.classList.contains('open')) {
      activateStudio();
      return;
    }

    const src = frame.getAttribute('src') || FALLBACK_SRC;
    if (src === 'about:blank') {
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

    const src = frame.dataset.kidscadeDeferredSrc || FALLBACK_SRC;
    activated = true;
    deferred = false;
    delete frame.dataset.kidscadeDeferredSrc;

    if (frame.getAttribute('src') !== src) frame.setAttribute('src', src);
  }

  function sync() {
    const { overlay } = getParts();
    if (!overlay) return;
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

  // Covers cached pages / unusual script timing as well as the normal DOMContentLoaded path.
  sync();
  document.addEventListener('DOMContentLoaded', sync, { once: true });
})();

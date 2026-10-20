(() => {
  'use strict';

  // The lobby's iframe session is counted by game-launcher.js, never here.
  if (window.top !== window.self) return;
  const gameId = String(document.currentScript?.dataset?.gameId || '');
  if (!/^[a-z0-9_-]{1,80}$/i.test(gameId)) return;

  const MIN_PLAY_MS = 30 * 1000;
  let startedAt = 0;
  let eventId = '';
  let enqueued = false;

  function makeEventId() {
    if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
    const bytes = new Uint8Array(16);
    if (globalThis.crypto?.getRandomValues) crypto.getRandomValues(bytes);
    else for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  function recordIfEligible(now = Date.now()) {
    if (enqueued || !startedAt || now - startedAt < MIN_PLAY_MS) return false;
    const record = window.KidscadeServerStats?.recordPlay;
    if (typeof record !== 'function') return false;
    record(gameId, Math.floor((now - startedAt) / 1000), eventId);
    enqueued = true;
    return true;
  }

  function startOnFirstInteraction() {
    if (startedAt) return;
    startedAt = Date.now();
    eventId = makeEventId();
    setTimeout(() => recordIfEligible(), MIN_PLAY_MS + 100);
  }

  window.addEventListener('pointerdown', startOnFirstInteraction, { passive:true });
  window.addEventListener('touchstart', startOnFirstInteraction, { passive:true });
  window.addEventListener('keydown', startOnFirstInteraction);
  window.addEventListener('pagehide', () => {
    recordIfEligible();
    window.KidscadeServerStats?.flushPending?.({ unloading:true });
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      recordIfEligible();
      window.KidscadeServerStats?.flushPending?.({ unloading:true });
    }
  });
})();

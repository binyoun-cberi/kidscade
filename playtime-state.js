((factory) => {
  const root = typeof window !== 'undefined' ? window : null;
  const library = factory();

  if (typeof module !== 'undefined' && module.exports) module.exports = library;
  if (!root) return;

  const instance = library.create({
    storageApi: root.KidscadeStorage || null,
    localStorage: root.localStorage || null,
    document: root.document || null
  });

  root.KidscadePlaytime = Object.freeze(instance);

  const render = () => instance.render();
  if (root.document?.readyState === 'loading') {
    root.document.addEventListener('DOMContentLoaded', render, { once: true });
  } else {
    render();
  }

  root.addEventListener?.('storage', event => {
    if (event?.key === instance.keys.seconds || event?.key === instance.keys.legacyMinutes) {
      instance.syncFromStorage();
    }
  });
})(() => {
  'use strict';

  const DEFAULT_KEYS = Object.freeze({
    seconds: 'kidscade_playtime_sec',
    legacyMinutes: 'kidscade_playtime'
  });

  function normalizeSeconds(value) {
    const number = Math.floor(Number(value) || 0);
    return Math.max(0, number);
  }

  function format(seconds) {
    const total = normalizeSeconds(seconds);
    const hours = Math.floor(total / 3600);
    const mins = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    let text = '총 학습 시간: ';
    if (hours > 0) text += `${hours}시간 `;
    if (hours > 0 || mins > 0) text += `${mins}분 `;
    return `${text}${secs}초`;
  }

  function create(options = {}) {
    const storageApi = options.storageApi || null;
    const local = options.localStorage || null;
    const doc = options.document || null;
    const keys = {
      seconds: storageApi?.keys?.playtimeSeconds || DEFAULT_KEYS.seconds,
      legacyMinutes: storageApi?.keys?.legacyPlaytimeMinutes || DEFAULT_KEYS.legacyMinutes
    };

    function readInt(name, physicalKey, fallback = 0) {
      if (storageApi?.getInt) return storageApi.getInt(name, fallback);
      const parsed = Number.parseInt(local?.getItem?.(physicalKey) ?? '', 10);
      return Number.isFinite(parsed) ? parsed : fallback;
    }

    function writeRaw(name, physicalKey, value) {
      if (storageApi?.setRaw) return storageApi.setRaw(name, value);
      local?.setItem?.(physicalKey, String(value));
      return true;
    }

    function readBestStoredSeconds() {
      const seconds = normalizeSeconds(readInt('playtimeSeconds', keys.seconds, 0));
      const legacySeconds = normalizeSeconds(readInt('legacyPlaytimeMinutes', keys.legacyMinutes, 0)) * 60;
      return Math.max(seconds, legacySeconds);
    }

    let totalSeconds = readBestStoredSeconds();
    writeRaw('playtimeSeconds', keys.seconds, totalSeconds);

    function persist() {
      totalSeconds = normalizeSeconds(totalSeconds);
      writeRaw('playtimeSeconds', keys.seconds, totalSeconds);
      writeRaw('legacyPlaytimeMinutes', keys.legacyMinutes, Math.floor(totalSeconds / 60));
      return totalSeconds;
    }

    function render() {
      const element = doc?.getElementById?.('total-playtime');
      if (element) element.innerText = format(totalSeconds);
      return totalSeconds;
    }

    function addSeconds(delta) {
      const amount = normalizeSeconds(delta);
      if (amount <= 0) return 0;
      totalSeconds += amount;
      persist();
      render();
      return amount;
    }

    function syncFromStorage() {
      const next = readBestStoredSeconds();
      if (next !== totalSeconds) {
        totalSeconds = next;
        render();
      }
      return totalSeconds;
    }

    function getSeconds() {
      return totalSeconds;
    }

    return Object.freeze({
      keys: Object.freeze(keys),
      getSeconds,
      addSeconds,
      syncFromStorage,
      render,
      format
    });
  }

  return Object.freeze({ create, format, normalizeSeconds, DEFAULT_KEYS });
});

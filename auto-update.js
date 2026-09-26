((factory) => {
  const root = typeof window !== 'undefined' ? window : null;
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) {
    root.KidscadeAutoUpdate = Object.freeze(api);
    api.start();
  }
})(root => {
  'use strict';

  const VERSION_URL = 'kidscade-version.json';
  const CHECK_INTERVAL_MS = 15 * 60 * 1000;
  const RESUME_MIN_INTERVAL_MS = 30 * 1000;
  const APPLY_DELAY_MS = 1200;
  const RETRY_SAFE_MS = 2000;
  const BUILD_TOKEN = '__KIDSCADE_BUILD__';

  let started = false;
  let checking = false;
  let lastCheckAt = 0;
  let pendingBuild = '';
  let applyTimer = 0;
  let periodicTimer = 0;

  function normalizeBuild(value) {
    return String(value || '').trim();
  }

  function isUsableBuild(value) {
    const build = normalizeBuild(value);
    return Boolean(build && build !== BUILD_TOKEN && !build.includes('__KIDSCADE_'));
  }

  function shouldUpdate(current, remote) {
    return isUsableBuild(current) && isUsableBuild(remote) && normalizeBuild(current) !== normalizeBuild(remote);
  }

  function currentBuild() {
    return normalizeBuild(root?.document?.querySelector?.('meta[name="kidscade-build"]')?.content);
  }

  function isVisibleElement(element) {
    if (!element) return false;
    if (element.classList?.contains?.('hidden')) return false;
    if (element.getAttribute?.('aria-hidden') === 'true') return false;
    if (element.hidden === true) return false;
    return true;
  }

  function lobbyBusy() {
    const frameState = root?.KidscadeGameFrame?.getState?.();
    if (frameState && frameState.status && frameState.status !== 'idle') return true;

    const doc = root?.document;
    if (!doc) return false;
    return [
      'game-modal',
      'kidscade-life-world-overlay',
      'kidscade-avatar-studio-overlay',
      'shop-modal',
      'pet-modal',
      'aquarium-modal',
      'hamster-modal'
    ].some(id => isVisibleElement(doc.getElementById(id)));
  }

  function safeToApply() {
    const doc = root?.document;
    if (!doc || doc.visibilityState === 'hidden') return false;
    return !lobbyBusy();
  }

  function ensureNotice() {
    const doc = root?.document;
    if (!doc?.body) return null;
    let notice = doc.getElementById('kc-update-notice');
    if (notice) return notice;

    notice = doc.createElement('div');
    notice.id = 'kc-update-notice';
    notice.setAttribute('role', 'status');
    notice.setAttribute('aria-live', 'polite');
    notice.textContent = '✨ KIDScade가 업데이트됐어요. 새 버전으로 바꾸는 중…';
    notice.style.cssText = [
      'position:fixed',
      'left:50%',
      'top:max(12px,env(safe-area-inset-top))',
      'transform:translateX(-50%)',
      'z-index:100000',
      'max-width:min(92vw,520px)',
      'padding:10px 14px',
      'border-radius:14px',
      'background:rgba(30,41,59,.94)',
      'color:#fff',
      'font:800 13px/1.35 system-ui,-apple-system,"맑은 고딕",sans-serif',
      'box-shadow:0 12px 30px rgba(15,23,42,.24)',
      'backdrop-filter:blur(10px)',
      'text-align:center'
    ].join(';');
    doc.body.appendChild(notice);
    return notice;
  }

  function reloadForBuild(build) {
    if (!root?.location || !isUsableBuild(build)) return false;
    const url = new URL(root.location.href);
    url.searchParams.set('kc_update', normalizeBuild(build).slice(0, 12));
    if (typeof root.location.replace === 'function') root.location.replace(url.href);
    else root.location.href = url.href;
    return true;
  }

  function scheduleApply() {
    if (!pendingBuild || applyTimer) return false;
    if (!safeToApply()) {
      applyTimer = root.setTimeout(() => {
        applyTimer = 0;
        scheduleApply();
      }, RETRY_SAFE_MS);
      return false;
    }

    ensureNotice();
    const build = pendingBuild;
    applyTimer = root.setTimeout(() => {
      applyTimer = 0;
      if (!pendingBuild || pendingBuild !== build) return;
      if (!safeToApply()) {
        scheduleApply();
        return;
      }
      reloadForBuild(build);
    }, APPLY_DELAY_MS);
    return true;
  }

  async function fetchRemoteBuild(now = Date.now()) {
    if (!root?.fetch) return '';
    const url = `${VERSION_URL}?t=${encodeURIComponent(String(now))}`;
    const response = await root.fetch(url, {
      cache: 'no-store',
      credentials: 'same-origin'
    });
    if (!response?.ok) return '';
    const payload = await response.json();
    return normalizeBuild(payload?.build);
  }

  async function check(options = {}) {
    const force = Boolean(options.force);
    const now = Date.now();
    if (checking) return false;
    if (!force && lastCheckAt && now - lastCheckAt < RESUME_MIN_INTERVAL_MS) {
      if (pendingBuild) scheduleApply();
      return false;
    }

    checking = true;
    lastCheckAt = now;
    try {
      const local = currentBuild();
      if (!isUsableBuild(local)) return false;
      const remote = await fetchRemoteBuild(now);
      if (!shouldUpdate(local, remote)) return false;
      pendingBuild = remote;
      scheduleApply();
      return true;
    } catch (_) {
      return false;
    } finally {
      checking = false;
    }
  }

  function start() {
    if (started || !root?.document) return false;
    started = true;

    const local = currentBuild();
    if (!isUsableBuild(local)) return false;

    root.setTimeout(() => check({ force:true }), 5000);
    periodicTimer = root.setInterval(() => check({ force:true }), CHECK_INTERVAL_MS);

    root.document.addEventListener('visibilitychange', () => {
      if (root.document.visibilityState !== 'hidden') check();
    });
    root.addEventListener?.('pageshow', () => check());
    root.addEventListener?.('online', () => check({ force:true }));
    root.document.addEventListener('kidscade:game-closed', () => check({ force:true }));

    return true;
  }

  return Object.freeze({
    VERSION_URL,
    CHECK_INTERVAL_MS,
    RESUME_MIN_INTERVAL_MS,
    normalizeBuild,
    isUsableBuild,
    shouldUpdate,
    currentBuild,
    lobbyBusy,
    safeToApply,
    check,
    start
  });
});

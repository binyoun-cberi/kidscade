(() => {
  'use strict';

  let loginId = '';
  let lastBalance = null;
  let timer = 0;

  function readBalance() {
    try { return Math.max(0, window.KidscadeStorage?.getInt?.('seeds', 0) || 0); } catch (_) { return 0; }
  }

  function scheduleSync() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      window.KidscadeAccount?.sync?.().catch?.(() => {});
    }, 1000);
  }

  function poll() {
    const nextLogin = String(window.KidscadeAccount?.account?.loginId || '');
    const current = readBalance();
    if (nextLogin !== loginId) {
      loginId = nextLogin;
      lastBalance = current;
      return;
    }
    if (!loginId) {
      lastBalance = current;
      return;
    }
    if (lastBalance === null) {
      lastBalance = current;
      return;
    }
    if (current !== lastBalance) {
      lastBalance = current;
      scheduleSync();
    }
  }

  setInterval(poll, 450);
  poll();
})();

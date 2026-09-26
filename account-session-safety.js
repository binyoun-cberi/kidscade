(() => {
  'use strict';

  let loggingOut = false;

  function storage() { return window.KidscadeStorage || null; }

  function clearSharedProfileState() {
    const s = storage();
    if (!s) return;
    [
      'profile','playHistory','seeds','avatarInventory','avatarEquipped','inventory','equipped',
      'pet','petItems','gardenState','recents','favorites','dailyMissions','dailyRewardClaimed',
      'attendance','playtimeSeconds','legacyPlaytimeMinutes','claimedRanks'
    ].forEach(key => { try { s.remove(key); } catch (_) {} });
    try { sessionStorage.removeItem('kc_account_sync_meta_v1'); } catch (_) {}
  }

  function syncDisplayedPlaytimeFromHistory() {
    if (!window.KidscadeAccount?.account) return false;
    const history = window.KidscadeProfileHistory?.loadHistory?.();
    if (!history?.games) return false;
    const seconds = Object.values(history.games).reduce((sum, record) => sum + Math.max(0, Math.floor(Number(record?.seconds || 0))), 0);
    const s = storage();
    if (!s) return false;
    s.setRaw('playtimeSeconds', seconds);
    s.setRaw('legacyPlaytimeMinutes', Math.floor(seconds / 60));
    return true;
  }

  async function safeLogout(button) {
    if (loggingOut) return;
    loggingOut = true;
    const original = button?.textContent || '로그아웃';
    if (button) { button.disabled = true; button.textContent = '동기화 중...'; }
    try {
      const synced = await window.KidscadeAccount?.sync?.();
      if (!synced) {
        window.alert('클라우드 동기화를 완료하지 못해 로그아웃을 취소했어요. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.');
        return;
      }
      const response = await fetch('/api/account/logout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: '{}'
      });
      if (!response.ok) {
        window.alert('로그아웃 요청을 완료하지 못했어요. 잠시 후 다시 시도해 주세요.');
        return;
      }
      clearSharedProfileState();
      location.reload();
    } catch (_) {
      window.alert('네트워크 연결을 확인해 주세요. 기록을 지우지 않고 로그아웃을 취소했어요.');
    } finally {
      loggingOut = false;
      if (button?.isConnected) { button.disabled = false; button.textContent = original; }
    }
  }

  document.addEventListener('click', event => {
    const button = event.target.closest?.('[data-kca-logout]');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    safeLogout(button);
  }, true);

  function boot() {
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (syncDisplayedPlaytimeFromHistory() || attempts > 80) clearInterval(timer);
    }, 250);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();

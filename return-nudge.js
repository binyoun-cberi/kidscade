(() => {
  'use strict';
  // Run once in the top-level lobby, not once per embedded game iframe.
  if (window.top !== window.self || window.__kidscadeReturnNudgeInstalled) return;
  window.__kidscadeReturnNudgeInstalled = true;

  const MIN_AWAY_MS = 3000;
  const MAX_AWAY_MS = 20 * 60 * 1000;
  const COOLDOWN_MS = 45 * 1000;
  const STORAGE_KEY = 'kidscade:return-nudge:hidden-at:v1';
  const MESSAGES = [
    '어디 다녀왔어? 다시 게임에 집중해 볼까?',
    '다시 왔네! 우리 하던 것부터 이어서 해 보자!',
    '잠깐 한눈팔았구나? 자, 다시 시작!'
  ];
  let hiddenAt = null;
  let lastPromptAt = -Infinity;
  let promptCount = 0;
  let notice = null;
  let noticeTimer = null;

  function readHiddenAt() {
    try {
      const value = Number(sessionStorage.getItem(STORAGE_KEY));
      return Number.isFinite(value) && value > 0 ? value : null;
    } catch (_) { return null; }
  }

  function clearHiddenAt() {
    hiddenAt = null;
    try { sessionStorage.removeItem(STORAGE_KEY); } catch (_) { /* storage unavailable */ }
  }

  function markHidden() {
    if (hiddenAt !== null) return;
    hiddenAt = Date.now();
    try { sessionStorage.setItem(STORAGE_KEY, String(hiddenAt)); } catch (_) { /* storage unavailable */ }
  }

  function speak(message) {
    if (!window.speechSynthesis || typeof window.SpeechSynthesisUtterance !== 'function') return;
    try {
      const utterance = new window.SpeechSynthesisUtterance(message);
      utterance.lang = 'ko-KR';
      utterance.rate = 1.04;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } catch (_) { /* Some Android browsers require a fresh tap. */ }
  }

  function dismiss() {
    if (noticeTimer !== null) {
      clearTimeout(noticeTimer);
      noticeTimer = null;
    }
    notice?.remove();
    notice = null;
  }

  function showNotice() {
    dismiss();
    const message = MESSAGES[promptCount % MESSAGES.length];
    promptCount += 1;
    const box = document.createElement('div');
    box.id = 'kidscade-return-nudge';
    box.setAttribute('role', 'status');
    box.style.cssText = 'position:fixed;z-index:2147483000;bottom:max(16px,env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);width:max-content;max-width:calc(100vw - 24px);box-sizing:border-box;padding:13px 15px;border:2px solid #c4b5fd;border-radius:18px;background:#fff;color:#312e81;font:700 15px/1.5 system-ui,sans-serif;box-shadow:0 12px 38px #0f172a40;display:flex;align-items:center;gap:12px;flex-wrap:wrap;justify-content:center;text-align:center;';
    const messageText = document.createElement('span');
    messageText.textContent = message;
    const replay = document.createElement('button');
    replay.type = 'button';
    replay.textContent = '🔊 다시 듣기';
    replay.setAttribute('aria-label', '안내 음성 다시 듣기');
    replay.style.cssText = 'font:inherit;font-size:13px;border:0;border-radius:12px;padding:8px 10px;background:#ede9fe;color:#5b21b6;cursor:pointer;';
    replay.addEventListener('click', () => speak(message));
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = '닫기';
    close.style.cssText = 'font:inherit;font-size:13px;border:0;background:transparent;color:#475569;cursor:pointer;padding:8px;';
    close.addEventListener('click', dismiss);
    box.append(messageText, replay, close);
    if (!document.body) return;
    document.body.appendChild(box);
    notice = box;
    speak(message);
    noticeTimer = setTimeout(dismiss, 12000);
  }

  function onReturn() {
    if (document.visibilityState === 'hidden') return;
    const started = hiddenAt ?? readHiddenAt();
    clearHiddenAt();
    if (started === null) return;
    const now = Date.now();
    const away = now - started;
    if (away < MIN_AWAY_MS || away > MAX_AWAY_MS || now - lastPromptAt < COOLDOWN_MS) return;
    lastPromptAt = now;
    showNotice();
  }

  // Reloads are not proof of visiting another tab. Back/forward restoration is.
  const navigationType = window.performance?.getEntriesByType?.('navigation')?.[0]?.type;
  if (navigationType === 'back_forward') {
    hiddenAt = readHiddenAt();
  } else {
    clearHiddenAt();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') markHidden();
    else onReturn();
  });
  window.addEventListener('pagehide', markHidden);
  window.addEventListener('pageshow', onReturn);
})();

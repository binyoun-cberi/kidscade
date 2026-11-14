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
    notice?.remove();
    notice = null;
  }

  function showNotice() {
    dismiss();
    if (!document.body) return;
    const message = MESSAGES[promptCount % MESSAGES.length];
    promptCount += 1;

    // Cover the page until a real tap gives Android browsers a user gesture.
    // This blocks interaction with the lobby/iframe but does not freeze
    // an individual game's simulation timer.
    const overlay = document.createElement('div');
    overlay.id = 'kidscade-return-nudge';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', '학습 이어하기');
    overlay.style.cssText = 'position:fixed;z-index:2147483647;inset:0;box-sizing:border-box;padding:16px;display:flex;align-items:center;justify-content:center;background:rgba(15,23,42,.70);font-family:system-ui,sans-serif;';

    const panel = document.createElement('div');
    panel.style.cssText = 'box-sizing:border-box;width:min(100%,420px);padding:28px 22px;border:3px solid #c4b5fd;border-radius:24px;background:#fff;color:#312e81;text-align:center;box-shadow:0 18px 60px #02061766;';
    const heading = document.createElement('h2');
    heading.textContent = '다시 돌아왔네!';
    heading.style.cssText = 'margin:0 0 12px;font-size:24px;line-height:1.3;font-weight:900;';
    const description = document.createElement('p');
    description.textContent = '학습을 이어가려면 아래 버튼을 눌러줘.';
    description.style.cssText = 'margin:0 0 20px;font-size:15px;line-height:1.5;color:#475569;';
    const play = document.createElement('button');
    play.type = 'button';
    play.textContent = '▶ 게임 계속하기';
    play.setAttribute('aria-label', '게임을 계속하고 음성 안내 듣기');
    play.style.cssText = 'display:block;width:100%;min-height:56px;padding:12px 16px;border:0;border-radius:16px;background:#7c3aed;color:#fff;font:800 18px/1.4 system-ui,sans-serif;cursor:pointer;touch-action:manipulation;';
    play.addEventListener('click', () => {
      // Speak synchronously inside the tap/click handler: no autoplay attempt.
      speak(message);
      dismiss();
    });
    panel.append(heading, description, play);
    overlay.append(panel);
    document.body.appendChild(overlay);
    notice = overlay;
    play.focus?.();
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

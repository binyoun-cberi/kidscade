(() => {
  'use strict';
  // Only the top-level lobby observes tab changes; game iframes use the SDK.
  if (window.top !== window.self || window.__kidscadeReturnNudgeInstalled) return;
  window.__kidscadeReturnNudgeInstalled = true;

  const MIN_AWAY_MS = 3000;
  const MAX_AWAY_MS = 20 * 60 * 1000;
  const COOLDOWN_MS = 45 * 1000;
  const SPEECH_START_TIMEOUT_MS = 7000;
  const VOICE_ERROR_WAIT_MS = 60 * 1000;
  const STORAGE_KEY = 'kidscade:return-nudge:hidden-at:v1';
  const MESSAGES = [
    '어디 다녀왔어? 다시 게임에 집중해 볼까?',
    '다시 왔네! 우리 하던 것부터 이어서 해 보자!',
    '잠깐 쉬고 왔구나? 자, 다시 시작!'
  ];

  let hiddenAt = null;
  let lastPromptAt = -Infinity;
  let promptCount = 0;
  let notice = null;
  let pausedGame = null;
  let speechTimer = null;
  let countdownTimer = null;
  let waitingUntil = null;
  let currentUtterance = null;

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

  function pauseSupportedGame() {
    if (pausedGame) return;
    try {
      if (!window.KidscadeGameFrame?.isPlaying?.()) return;
      const iframe = document.getElementById('game-iframe');
      const child = iframe?.contentWindow;
      const sdk = child?.KidscadeGame;
      const state = sdk?.state?.();
      // Do not take over a student's own pause or unsupported game timers.
      if (!state?.pauseable || state.paused || state.ended) return;
      sdk.pause({ source: 'return-nudge' });
      if (sdk.state?.().paused) pausedGame = { iframe, child, sdk };
    } catch (_) { /* Unavailable frame: never break the lobby. */ }
  }

  function resumeSupportedGame() {
    const target = pausedGame;
    pausedGame = null;
    if (!target) return;
    try {
      if (window.KidscadeGameFrame?.isPlaying?.() &&
          target.iframe.contentWindow === target.child &&
          target.child.KidscadeGame === target.sdk &&
          target.sdk.state?.().paused) {
        target.sdk.resume({ source: 'return-nudge' });
      }
    } catch (_) { /* Navigated or closed game. */ }
  }

  function markHidden() {
    if (hiddenAt !== null) return;
    hiddenAt = Date.now();
    try { sessionStorage.setItem(STORAGE_KEY, String(hiddenAt)); } catch (_) {}
    pauseSupportedGame();
  }

  function selectKoreanVoice() {
    let voices = [];
    try { voices = window.speechSynthesis?.getVoices?.() || []; } catch (_) {}
    const korean = Array.from(voices).filter(voice => /^ko(?:[-_]|$)/i.test(String(voice.lang || '')));
    // The Web Speech API exposes voice names, not a reliable gender property.
    // Prefer Google Korean voices that explicitly identify a female variant.
    const googleFemale = korean.find(voice => /google/i.test(voice.name) && /female|woman|여성|여자/i.test(voice.name));
    const googleKorean = korean.find(voice => /google/i.test(voice.name));
    const namedFemale = korean.find(voice => /female|woman|여성|여자/i.test(voice.name));
    return googleFemale || googleKorean || namedFemale || korean[0] || null;
  }

  function clearTimers() {
    if (speechTimer !== null) clearTimeout(speechTimer);
    if (countdownTimer !== null) clearInterval(countdownTimer);
    speechTimer = null;
    countdownTimer = null;
    waitingUntil = null;
  }

  function dismiss() {
    clearTimers();
    const current = notice;
    notice = null;
    if (current) {
      try { if (current.node.open) current.node.close?.(); } catch (_) {}
      current.node.remove();
    }
  }

  function completeReturn() {
    dismiss();
    resumeSupportedGame();
  }

  function showVoiceErrorWait() {
    if (!notice || notice.stage === 'wait') return;
    if (speechTimer !== null) clearTimeout(speechTimer);
    speechTimer = null;
    notice.stage = 'wait';
    notice.heading.textContent = '음성을 재생하지 못했어요';
    notice.description.textContent = '태블릿의 미디어 음량과 음성 설정을 확인해 주세요. 잠시 뒤 학습으로 돌아가요.';
    waitingUntil = Date.now() + VOICE_ERROR_WAIT_MS;
    const update = () => {
      if (!notice || notice.stage !== 'wait') return;
      const remaining = Math.max(0, Math.ceil((waitingUntil - Date.now()) / 1000));
      notice.button.textContent = '음성 준비 중 · ' + remaining + '초';
      if (!remaining) completeReturn();
    };
    notice.button.disabled = true;
    notice.button.setAttribute('aria-disabled', 'true');
    update();
    if (notice && notice.stage === 'wait') countdownTimer = setInterval(update, 1000);
  }

  function speakFromTap(message) {
    if (!notice || notice.stage !== 'ready') return;
    notice.stage = 'checking';
    notice.button.disabled = true;
    notice.button.textContent = '음성 재생 확인 중…';

    const synth = window.speechSynthesis;
    if (!synth || typeof window.SpeechSynthesisUtterance !== 'function') {
      showVoiceErrorWait();
      return;
    }
    try {
      const utterance = new window.SpeechSynthesisUtterance(message);
      currentUtterance = utterance;
      utterance.lang = 'ko-KR';
      utterance.rate = 1.04;
      utterance.pitch = 1.06;
      utterance.volume = 1; // Max utterance gain; cannot override Android media volume.
      const voice = selectKoreanVoice();
      if (voice) utterance.voice = voice;
      utterance.onstart = () => {
        if (notice?.stage === 'checking') completeReturn();
      };
      utterance.onend = () => {
        // Some engines skip start but still emit end. This also counts as success.
        if (notice?.stage === 'checking') completeReturn();
      };
      utterance.onerror = () => {
        if (notice?.stage === 'checking') showVoiceErrorWait();
      };
      // Register before speak, as an error may be raised immediately.
      speechTimer = setTimeout(() => {
        if (notice?.stage !== 'checking') return;
        // "speaking" does NOT confirm audible sound. It only means the
        // synthesis engine is active; avoid punishing users for lost events.
        if (synth.speaking) completeReturn();
        else showVoiceErrorWait();
      }, SPEECH_START_TIMEOUT_MS);
      synth.cancel();
      synth.speak(utterance);
    } catch (_) {
      showVoiceErrorWait();
    }
  }

  function showNotice() {
    if (notice || !document.body) return;
    const message = MESSAGES[promptCount % MESSAGES.length];
    promptCount += 1;
    const element = document.createElement('dialog');
    const nativeModal = typeof element.showModal === 'function';
    const overlay = nativeModal ? element : document.createElement('div');
    overlay.id = 'kidscade-return-nudge';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', '학습 이어하기');
    overlay.style.cssText = 'position:fixed;z-index:2147483647;inset:0;margin:0;max-width:none;max-height:none;width:100%;height:100%;box-sizing:border-box;padding:16px;border:0;border-radius:0;align-items:center;justify-content:center;background:rgba(15,23,42,.78);font-family:system-ui,sans-serif;overflow:auto;';
    if (nativeModal) overlay.addEventListener('cancel', event => event.preventDefault());

    const panel = document.createElement('div');
    panel.style.cssText = 'box-sizing:border-box;width:min(100%,420px);padding:28px 22px;border:3px solid #c4b5fd;border-radius:24px;background:#fff;color:#312e81;text-align:center;box-shadow:0 18px 60px #02061766;';
    const heading = document.createElement('h2');
    heading.textContent = '다시 돌아왔네!';
    heading.style.cssText = 'margin:0 0 12px;font-size:24px;line-height:1.3;font-weight:900;';
    const description = document.createElement('p');
    description.textContent = message;
    description.style.cssText = 'margin:0 0 20px;font-size:16px;line-height:1.6;color:#475569;';
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = '▶ 게임 계속하기';
    button.setAttribute('aria-label', '게임 계속하기 및 음성 안내');
    button.style.cssText = 'display:block;width:100%;min-height:56px;padding:12px 16px;border:0;border-radius:16px;background:#7c3aed;color:#fff;font:800 18px/1.4 system-ui,sans-serif;cursor:pointer;touch-action:manipulation;';
    button.addEventListener('click', () => speakFromTap(message));
    panel.append(heading, description, button);
    overlay.append(panel);
    document.body.appendChild(overlay);
    notice = { node: overlay, heading, description, button, stage: 'ready' };

    // A fullscreen game iframe can cover parent HTML. Exit fullscreen before
    // showing the native top-layer dialog to keep the continue action reachable.
    try { if (document.fullscreenElement) document.exitFullscreen?.(); } catch (_) {}
    if (nativeModal) {
      try {
        overlay.showModal();
        overlay.style.display = 'flex';
      } catch (_) {
        // A closed <dialog> may remain invisible even with a CSS display.
        // Replace it with a real fixed overlay so children can always tap.
        const fallback = document.createElement('div');
        fallback.id = overlay.id;
        fallback.style.cssText = overlay.style.cssText;
        fallback.style.display = 'flex';
        fallback.setAttribute('role', 'dialog');
        fallback.setAttribute('aria-modal', 'true');
        fallback.setAttribute('aria-label', '학습 이어하기');
        fallback.append(panel);
        overlay.remove();
        document.body.appendChild(fallback);
        notice.node = fallback;
      }
    } else overlay.style.display = 'flex';
    button.focus?.();
  }

  function onReturn() {
    if (document.visibilityState === 'hidden') return;
    const started = hiddenAt ?? readHiddenAt();
    clearHiddenAt();
    // Never replace an existing warning or silence-fallback countdown.
    if (notice) return;
    if (started === null) {
      resumeSupportedGame();
      return;
    }
    const now = Date.now();
    const away = now - started;
    if (away < MIN_AWAY_MS || away > MAX_AWAY_MS || now - lastPromptAt < COOLDOWN_MS) {
      resumeSupportedGame();
      return;
    }
    lastPromptAt = now;
    showNotice();
    if (!notice) resumeSupportedGame();
  }

  const navigationType = window.performance?.getEntriesByType?.('navigation')?.[0]?.type;
  if (navigationType === 'back_forward') hiddenAt = readHiddenAt();
  else clearHiddenAt();

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') markHidden();
    else onReturn();
  });
  window.addEventListener('pagehide', markHidden);
  window.addEventListener('pageshow', onReturn);
})();

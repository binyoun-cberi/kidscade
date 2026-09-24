((factory) => {
  const root = typeof window !== 'undefined' ? window : null;
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) {
    root.KidscadeGame = api;
    api.autoInit();
  }
})(root => {
  'use strict';

  const VERSION = 1;
  const STORAGE_PREFIX = 'kidscade_game_v1:';
  const EVENT_TYPE = 'kidscade:game-event';
  const CLOSE_TYPE = 'kidscade:close-game';
  const STYLE_ID = 'kidscade-game-shell-style';
  const DEFAULTS = Object.freeze({
    id: '',
    title: '',
    shell: false,
    restart: true,
    mute: true,
    pauseable: false,
    orientation: 'any'
  });

  let options = { ...DEFAULTS };
  let initialized = false;
  let startedAt = 0;
  let paused = false;
  let ended = false;
  let muted = false;
  let menuOpen = false;
  let pauseHandlers = null;

  const now = () => root?.performance?.now?.() ?? Date.now();
  const cleanToken = value => String(value || '').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  const finite = value => Number.isFinite(Number(value)) ? Number(value) : null;

  function storageKey(id, name) {
    const gameId = cleanToken(id);
    const field = cleanToken(name);
    if (!gameId || !field) throw new Error('KidscadeGame storage requires game id and field name.');
    return `${STORAGE_PREFIX}${gameId}:${field}`;
  }

  function localStorageSafe() {
    try { return root?.localStorage || null; } catch (_) { return null; }
  }

  function readJson(key, fallback = null) {
    try {
      const raw = localStorageSafe()?.getItem(key);
      return raw === null || raw === undefined ? fallback : JSON.parse(raw);
    } catch (_) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorageSafe()?.setItem(key, JSON.stringify(value));
      return true;
    } catch (_) {
      return false;
    }
  }

  function parentOrigin() {
    try { return root?.location?.origin || '*'; } catch (_) { return '*'; }
  }

  function embedded() {
    try { return Boolean(root?.parent && root.parent !== root); } catch (_) { return false; }
  }

  function post(type, detail = {}) {
    const payload = {
      type,
      version: VERSION,
      gameId: options.id || '',
      detail: { ...detail, gameId: options.id || '' }
    };
    if (embedded()) {
      try {
        root.parent.postMessage(payload, parentOrigin());
        return true;
      } catch (_) {}
    }
    try {
      root?.document?.dispatchEvent(new CustomEvent(type, { detail: payload.detail }));
      return true;
    } catch (_) {
      return false;
    }
  }

  function emit(name, detail = {}) {
    const payload = { event: name, ...detail };
    post(EVENT_TYPE, payload);
    try {
      root?.document?.dispatchEvent(new CustomEvent(`kidscade:game-${name}`, {
        detail: { ...payload, gameId: options.id || '' }
      }));
    } catch (_) {}
    return payload;
  }

  function currentAudioSettings() {
    try {
      return root?.KidscadeAudio?.getSettings?.() || { muted };
    } catch (_) {
      return { muted };
    }
  }

  function applyMuted(value, { emitEvent = true } = {}) {
    muted = Boolean(value);
    try {
      if (root?.KidscadeAudio?.setMuted) muted = Boolean(root.KidscadeAudio.setMuted(muted));
    } catch (_) {}
    try {
      root?.document?.querySelectorAll?.('audio,video').forEach(media => { media.muted = muted; });
    } catch (_) {}
    if (emitEvent) {
      try {
        root?.document?.dispatchEvent(new CustomEvent('kidscade:mute-changed', {
          detail: { muted, gameId: options.id || '' }
        }));
      } catch (_) {}
      emit('mute', { muted });
    }
    syncShell();
    return muted;
  }

  function setMuted(value) {
    return applyMuted(value);
  }

  function toggleMuted() {
    return setMuted(!muted);
  }

  function sound(key, soundOptions = {}) {
    return root?.KidscadeAudio?.play?.(key, soundOptions) || Promise.resolve({ ok:false, reason:'audio-manager-unavailable' });
  }

  function start(detail = {}) {
    if (!startedAt || ended) startedAt = now();
    ended = false;
    paused = false;
    emit('start', detail);
    syncShell();
    return state();
  }

  function pause(detail = {}) {
    if (paused) return state();
    paused = true;
    try { pauseHandlers?.pause?.(); } catch (_) {}
    emit('pause', detail);
    syncShell();
    return state();
  }

  function resume(detail = {}) {
    if (!paused) return state();
    paused = false;
    try { pauseHandlers?.resume?.(); } catch (_) {}
    emit('resume', detail);
    syncShell();
    return state();
  }

  function togglePause() {
    return paused ? resume({ source:'shell' }) : pause({ source:'shell' });
  }

  function registerPauseHandlers(handlers = {}) {
    pauseHandlers = {
      pause: typeof handlers.pause === 'function' ? handlers.pause : null,
      resume: typeof handlers.resume === 'function' ? handlers.resume : null
    };
    options.pauseable = Boolean(pauseHandlers.pause || pauseHandlers.resume);
    syncShell();
    return options.pauseable;
  }

  function bestRecord() {
    if (!options.id) return null;
    return readJson(storageKey(options.id, 'best'), null);
  }

  function score(value, scoreOptions = {}) {
    const numeric = finite(value);
    if (numeric === null) return { score:null, best:bestRecord()?.value ?? null, improved:false };
    const higherIsBetter = scoreOptions.higherIsBetter !== false;
    const previous = bestRecord();
    const previousValue = finite(previous?.value);
    const improved = previousValue === null || (higherIsBetter ? numeric > previousValue : numeric < previousValue);
    const next = improved
      ? { value:numeric, at:Date.now(), unit:String(scoreOptions.unit || ''), higherIsBetter }
      : previous;
    if (improved && options.id) writeJson(storageKey(options.id, 'best'), next);
    emit('score', { score:numeric, best:next?.value ?? numeric, improved, unit:String(scoreOptions.unit || '') });
    return { score:numeric, best:next?.value ?? numeric, improved };
  }

  function gameOver(detail = {}) {
    ended = true;
    paused = false;
    const result = Object.hasOwn(detail, 'score') ? score(detail.score, detail.scoreOptions || {}) : null;
    const elapsedMs = startedAt ? Math.max(0, now() - startedAt) : 0;
    emit('game-over', { ...detail, scoreResult:result, elapsedMs:Math.round(elapsedMs) });
    syncShell();
    return { ...state(), scoreResult:result, elapsedMs };
  }

  function restart() {
    emit('restart', { source:'shell' });
    if (typeof options.onRestart === 'function') {
      options.onRestart();
      closeMenu();
      return true;
    }
    try {
      root?.location?.reload?.();
      return true;
    } catch (_) {
      return false;
    }
  }

  function exit() {
    emit('exit', { source:'shell' });
    if (embedded()) {
      post(CLOSE_TYPE, {});
      return true;
    }
    try {
      if (root?.history?.length > 1) {
        root.history.back();
        return true;
      }
    } catch (_) {}
    return false;
  }

  function state() {
    return Object.freeze({
      version:VERSION,
      id:options.id,
      title:options.title,
      started:Boolean(startedAt),
      startedAt,
      paused,
      ended,
      muted,
      embedded:embedded(),
      best:bestRecord()?.value ?? null
    });
  }

  function addStyles() {
    if (!root?.document || root.document.getElementById(STYLE_ID)) return;
    const style = root.document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #kidscade-game-shell{position:fixed;right:max(10px,env(safe-area-inset-right));bottom:max(10px,env(safe-area-inset-bottom));z-index:2147483000;font-family:system-ui,-apple-system,"Noto Sans KR",sans-serif}
      #kidscade-game-shell *{box-sizing:border-box}
      .kcgs-open{min-width:54px;height:42px;padding:0 13px;border:1px solid rgba(255,255,255,.28);border-radius:14px;background:rgba(15,23,42,.88);color:#fff;font:900 12px/1 system-ui;box-shadow:0 8px 22px rgba(0,0,0,.22);backdrop-filter:blur(12px);cursor:pointer}
      .kcgs-panel{position:absolute;right:0;bottom:50px;width:min(270px,calc(100vw - 20px));padding:12px;border:1px solid rgba(148,163,184,.3);border-radius:18px;background:rgba(15,23,42,.96);color:#fff;box-shadow:0 18px 50px rgba(0,0,0,.35);backdrop-filter:blur(16px)}
      .kcgs-panel[hidden]{display:none!important}
      .kcgs-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}
      .kcgs-title{min-width:0;font-size:12px;font-weight:950;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .kcgs-close{width:30px;height:30px;border:0;border-radius:9px;background:rgba(255,255,255,.09);color:#fff;font-size:16px;cursor:pointer}
      .kcgs-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}
      .kcgs-btn{min-height:42px;padding:8px;border:1px solid rgba(255,255,255,.12);border-radius:12px;background:rgba(255,255,255,.08);color:#fff;font:850 12px/1.15 system-ui;cursor:pointer}
      .kcgs-btn:hover{background:rgba(255,255,255,.14)}
      .kcgs-btn.danger{grid-column:1/-1;background:rgba(239,68,68,.18);border-color:rgba(248,113,113,.25)}
      .kcgs-btn[hidden]{display:none!important}
      @media(max-width:560px){#kidscade-game-shell{right:max(7px,env(safe-area-inset-right));bottom:max(7px,env(safe-area-inset-bottom))}.kcgs-open{height:38px;padding:0 11px}.kcgs-panel{bottom:45px}}
    `;
    root.document.head?.appendChild(style);
  }

  function shellElement() {
    return root?.document?.getElementById('kidscade-game-shell') || null;
  }

  function syncShell() {
    const shell = shellElement();
    if (!shell) return;
    const muteButton = shell.querySelector('[data-kcgs="mute"]');
    const pauseButton = shell.querySelector('[data-kcgs="pause"]');
    if (muteButton) {
      const settings = currentAudioSettings();
      muteButton.textContent = settings.muted || muted ? '🔇 소리 켜기' : '🔊 소리 끄기';
      muteButton.hidden = options.mute === false;
    }
    if (pauseButton) {
      pauseButton.textContent = paused ? '▶ 계속하기' : 'Ⅱ 잠시 멈춤';
      pauseButton.hidden = !options.pauseable;
    }
  }

  function closeMenu() {
    const panel = shellElement()?.querySelector('.kcgs-panel');
    if (panel) panel.hidden = true;
    menuOpen = false;
  }

  function openMenu() {
    const panel = shellElement()?.querySelector('.kcgs-panel');
    if (panel) panel.hidden = false;
    menuOpen = true;
  }

  function mountShell() {
    if (!root?.document || options.shell === false || shellElement()) return false;
    addStyles();
    const shell = root.document.createElement('div');
    shell.id = 'kidscade-game-shell';
    shell.innerHTML = `
      <button class="kcgs-open" type="button" aria-label="게임 메뉴 열기">☰ 메뉴</button>
      <div class="kcgs-panel" hidden>
        <div class="kcgs-head"><div class="kcgs-title"></div><button class="kcgs-close" type="button" aria-label="게임 메뉴 닫기">×</button></div>
        <div class="kcgs-grid">
          <button class="kcgs-btn" data-kcgs="pause" type="button" hidden>Ⅱ 잠시 멈춤</button>
          <button class="kcgs-btn" data-kcgs="mute" type="button">🔊 소리 끄기</button>
          <button class="kcgs-btn" data-kcgs="restart" type="button">↻ 다시 시작</button>
          <button class="kcgs-btn danger" data-kcgs="exit" type="button">게임 나가기</button>
        </div>
      </div>
    `;
    shell.querySelector('.kcgs-title').textContent = options.title || '게임 메뉴';
    shell.querySelector('.kcgs-open').addEventListener('click', () => menuOpen ? closeMenu() : openMenu());
    shell.querySelector('.kcgs-close').addEventListener('click', closeMenu);
    shell.querySelector('[data-kcgs="pause"]').addEventListener('click', togglePause);
    shell.querySelector('[data-kcgs="mute"]').addEventListener('click', toggleMuted);
    shell.querySelector('[data-kcgs="restart"]').addEventListener('click', restart);
    shell.querySelector('[data-kcgs="exit"]').addEventListener('click', exit);
    root.document.body.appendChild(shell);
    syncShell();
    return true;
  }

  function init(input = {}) {
    options = {
      ...DEFAULTS,
      ...options,
      ...input,
      id: cleanToken(input.id ?? options.id),
      title: String(input.title ?? options.title ?? '').trim()
    };
    if (!options.id) console.warn?.('[KidscadeGame] game id is missing.');
    initialized = true;
    muted = Boolean(currentAudioSettings().muted);
    try { root?.document?.documentElement?.setAttribute('data-kidscade-game', options.id || 'unknown'); } catch (_) {}
    if (options.orientation && options.orientation !== 'any') {
      try { root?.document?.documentElement?.setAttribute('data-kidscade-orientation', options.orientation); } catch (_) {}
    }
    if (options.shell) mountShell();
    emit('ready', { title:options.title, orientation:options.orientation });
    return api;
  }

  function autoInit() {
    if (!root?.document) return;
    const script = root.document.currentScript ||
      Array.from(root.document.scripts || []).find(item => /(?:^|\/)kidscade-game-sdk\.js(?:\?|$)/.test(item.src || ''));
    if (!script?.dataset?.gameId || initialized) return;
    init({
      id:script.dataset.gameId,
      title:script.dataset.title || root.document.title || '',
      shell:script.dataset.shell !== 'false',
      restart:script.dataset.restart !== 'false',
      mute:script.dataset.mute !== 'false',
      orientation:script.dataset.orientation || 'any'
    });
  }

  const api = Object.freeze({
    VERSION,
    STORAGE_PREFIX,
    EVENT_TYPE,
    CLOSE_TYPE,
    cleanToken,
    storageKey,
    init,
    autoInit,
    mountShell,
    start,
    pause,
    resume,
    togglePause,
    registerPauseHandlers,
    sound,
    setMuted,
    toggleMuted,
    score,
    gameOver,
    bestRecord,
    restart,
    exit,
    state
  });
  return api;
});

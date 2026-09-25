((factory) => {
  const root = typeof window !== 'undefined' ? window : null;
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.KidscadeGameFrame = Object.freeze(api);
})(root => {
  'use strict';

  const LOAD_TIMEOUT_MS = 15000;
  const INPUT_LABELS = Object.freeze({ touch:'터치', keyboard:'키보드' });
  const PLAYER_LABELS = Object.freeze({ solo:'혼자', local2:'2인', localMulti:'여럿이', online:'온라인', classroom:'교실' });
  const DIFFICULTY_LABELS = Object.freeze({ easy:'쉬움', medium:'보통', hard:'도전' });

  let current = null;
  let status = 'idle';
  let timer = 0;
  let runtimeCleanup = null;

  function cleanText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function formatMetadata(game = {}) {
    const input = (Array.isArray(game.input) ? game.input : [])
      .map(value => INPUT_LABELS[value] || cleanText(value))
      .filter(Boolean);
    const players = (Array.isArray(game.players) ? game.players : [])
      .map(value => PLAYER_LABELS[value] || cleanText(value))
      .filter(Boolean);
    const minutes = Math.max(1, Number(game.sessionMinutes || 0) || 0);
    return [
      input.length ? { icon:'🎮', label:input.join(' · ') } : null,
      { icon:'⏱️', label:`약 ${minutes}분` },
      game.difficulty ? { icon:'◆', label:DIFFICULTY_LABELS[game.difficulty] || cleanText(game.difficulty) } : null,
      players.length ? { icon:'👥', label:players.join(' · ') } : null
    ].filter(Boolean);
  }

  function dom() {
    if (!root?.document) return {};
    return {
      modal: root.document.getElementById('game-modal'),
      iframe: root.document.getElementById('game-iframe'),
      title: root.document.getElementById('modal-title-text'),
      stage: root.document.getElementById('kidscade-game-stage')
    };
  }

  function ensureStage() {
    const refs = dom();
    if (!refs.modal || !refs.iframe) return null;
    if (refs.stage) return refs.stage;

    const stage = root.document.createElement('div');
    stage.id = 'kidscade-game-stage';
    stage.className = 'kc-game-stage hidden';
    stage.setAttribute('aria-live', 'polite');
    stage.innerHTML = `
      <div class="kc-game-stage-card">
        <div class="kc-game-stage-cover-wrap"><img class="kc-game-stage-cover" alt=""></div>
        <div class="kc-game-stage-copy">
          <div class="kc-game-stage-kicker">KIDSCade</div>
          <h2 class="kc-game-stage-title">게임 준비</h2>
          <p class="kc-game-stage-desc"></p>
          <div class="kc-game-stage-meta"></div>
          <div class="kc-game-stage-status" hidden></div>
          <div class="kc-game-stage-actions">
            <button class="kc-game-stage-primary" type="button" data-stage-action="start">게임 시작</button>
            <button class="kc-game-stage-secondary" type="button" data-stage-action="cancel">돌아가기</button>
          </div>
        </div>
      </div>`;
    refs.modal.appendChild(stage);

    stage.addEventListener('click', event => {
      const button = event.target?.closest?.('[data-stage-action]');
      if (!button) return;
      const action = button.dataset.stageAction;
      if (action === 'start') start();
      else if (action === 'retry') reload();
      else if (action === 'cancel') cancel();
    });
    return stage;
  }

  function stageParts() {
    const stage = ensureStage();
    if (!stage) return {};
    return {
      stage,
      card: stage.querySelector('.kc-game-stage-card'),
      coverWrap: stage.querySelector('.kc-game-stage-cover-wrap'),
      cover: stage.querySelector('.kc-game-stage-cover'),
      kicker: stage.querySelector('.kc-game-stage-kicker'),
      title: stage.querySelector('.kc-game-stage-title'),
      desc: stage.querySelector('.kc-game-stage-desc'),
      meta: stage.querySelector('.kc-game-stage-meta'),
      status: stage.querySelector('.kc-game-stage-status'),
      actions: stage.querySelector('.kc-game-stage-actions')
    };
  }

  function clearTimer() {
    if (timer) root?.clearTimeout?.(timer);
    timer = 0;
  }

  function detachRuntimeGuard() {
    try { runtimeCleanup?.(); } catch (_) {}
    runtimeCleanup = null;
  }

  function showStage() {
    const { stage } = stageParts();
    stage?.classList.remove('hidden');
  }

  function hideStage() {
    const { stage } = stageParts();
    stage?.classList.add('hidden');
  }

  function renderIntro(payload) {
    const p = stageParts();
    if (!p.stage) return false;
    const game = payload.game || {};
    p.card?.classList.remove('is-loading', 'is-error');
    p.kicker.textContent = '게임 준비';
    p.title.textContent = cleanText(game.title || payload.title || '게임');
    p.desc.textContent = cleanText(game.description || '바로 시작할 수 있어요.');
    p.meta.innerHTML = '';
    for (const item of formatMetadata(game)) {
      const chip = root.document.createElement('span');
      chip.className = 'kc-game-stage-chip';
      chip.textContent = `${item.icon} ${item.label}`;
      p.meta.appendChild(chip);
    }
    if (game.cover) {
      p.cover.src = String(game.cover);
      p.cover.alt = `${cleanText(game.title)} 대문`;
      p.coverWrap.hidden = false;
    } else {
      p.cover.removeAttribute('src');
      p.cover.alt = '';
      p.coverWrap.hidden = true;
    }
    p.status.hidden = true;
    p.actions.innerHTML = `
      <button class="kc-game-stage-primary" type="button" data-stage-action="start">게임 시작</button>
      <button class="kc-game-stage-secondary" type="button" data-stage-action="cancel">돌아가기</button>`;
    showStage();
    root.setTimeout?.(() => p.actions.querySelector('[data-stage-action="start"]')?.focus?.(), 0);
    return true;
  }

  function renderLoading() {
    const p = stageParts();
    if (!p.stage) return;
    p.card?.classList.add('is-loading');
    p.card?.classList.remove('is-error');
    p.kicker.textContent = '불러오는 중';
    p.title.textContent = cleanText(current?.game?.title || '게임');
    p.desc.textContent = '잠깐만요. 게임을 준비하고 있어요.';
    p.status.hidden = false;
    p.status.innerHTML = '<span class="kc-game-stage-spinner" aria-hidden="true"></span><span>게임 파일 확인 중</span>';
    p.actions.innerHTML = '<button class="kc-game-stage-secondary" type="button" data-stage-action="cancel">나가기</button>';
    showStage();
  }

  function safeErrorCode(value) {
    return cleanText(value || 'GAME_ERROR').toUpperCase().replace(/[^A-Z0-9_-]+/g, '_').slice(0, 32) || 'GAME_ERROR';
  }

  function showError(input = {}) {
    if (!current) return false;
    clearTimer();
    detachRuntimeGuard();
    status = 'error';

    const p = stageParts();
    if (!p.stage) return false;
    p.card?.classList.remove('is-loading');
    p.card?.classList.add('is-error');
    p.kicker.textContent = '다시 시도할 수 있어요';
    p.title.textContent = '게임을 불러오지 못했어요';
    p.desc.textContent = cleanText(input.userMessage || '잠시 문제가 생겼어요. 다시 불러오면 대부분 해결돼요.');
    p.status.hidden = false;
    p.status.textContent = `오류 코드 · ${safeErrorCode(input.code)}`;
    p.actions.innerHTML = `
      <button class="kc-game-stage-primary" type="button" data-stage-action="retry">다시 불러오기</button>
      <button class="kc-game-stage-secondary" type="button" data-stage-action="cancel">키즈케이드로 나가기</button>`;
    const refs = dom();
    refs.iframe?.classList.add('kc-game-frame-hidden');
    showStage();
    root.setTimeout?.(() => p.actions.querySelector('[data-stage-action="retry"]')?.focus?.(), 0);
    return true;
  }

  function looksLikeNotFound(iframe) {
    try {
      const doc = iframe?.contentDocument;
      if (!doc) return false;
      const title = cleanText(doc.title);
      const text = cleanText(doc.body?.innerText || '').slice(0, 500);
      return /404|file not found|page not found/i.test(`${title} ${text}`);
    } catch (_) {
      return false;
    }
  }

  function ignorableRuntimeError(message) {
    return /ResizeObserver loop|AbortError|play\(\) request was interrupted|not allowed by the user agent/i.test(String(message || ''));
  }

  function attachRuntimeGuard(iframe) {
    detachRuntimeGuard();
    try {
      const child = iframe?.contentWindow;
      if (!child) return;
      const onError = event => {
        const message = cleanText(event?.message || event?.error?.message);
        if (!message || ignorableRuntimeError(message)) return;
        console.error?.('[KidscadeGameFrame] game runtime error:', event?.error || message);
        showError({ code:'RUNTIME_ERROR', userMessage:`게임 오류: ${message}` });
      };
      const onReject = event => {
        const message = cleanText(event?.reason?.message || event?.reason);
        if (!message || ignorableRuntimeError(message)) return;
        console.error?.('[KidscadeGameFrame] unhandled game rejection:', event?.reason || message);
        showError({ code:'UNHANDLED_REJECTION', userMessage:`게임 오류: ${message}` });
      };
      child.addEventListener('error', onError);
      child.addEventListener('unhandledrejection', onReject);
      runtimeCleanup = () => {
        try { child.removeEventListener('error', onError); } catch (_) {}
        try { child.removeEventListener('unhandledrejection', onReject); } catch (_) {}
      };
    } catch (_) {}
  }

  function armLoad(iframe) {
    clearTimer();
    timer = root?.setTimeout?.(() => {
      if (status === 'loading') showError({ code:'LOAD_TIMEOUT' });
    }, LOAD_TIMEOUT_MS) || 0;

    iframe.onload = () => {
      if (status !== 'loading' || !current) return;
      if (looksLikeNotFound(iframe)) {
        showError({ code:'NOT_FOUND', userMessage:'게임 파일을 찾지 못했어요. 키즈케이드에서 경로를 다시 확인해야 해요.' });
        return;
      }
      clearTimer();
      status = 'playing';
      iframe.classList.remove('kc-game-frame-hidden');
      hideStage();
      attachRuntimeGuard(iframe);
    };
    iframe.onerror = () => {
      if (status === 'loading') showError({ code:'LOAD_ERROR' });
    };
  }

  function start() {
    if (!current || (status !== 'intro' && status !== 'error')) return false;
    const refs = dom();
    if (!refs.iframe) return false;

    renderLoading();
    status = 'loading';
    try {
      if (!current.activated) {
        current.activated = true;
        current.session = current.onStart?.() || null;
      }
    } catch (error) {
      console.error?.('[KidscadeGameFrame] launch activation failed:', error);
      showError({ code:'START_FAILED' });
      return false;
    }

    if (refs.title && current.startedTitle) refs.title.textContent = current.startedTitle(current.session);
    refs.iframe.classList.add('kc-game-frame-hidden');
    armLoad(refs.iframe);
    refs.iframe.src = current.href;
    return true;
  }

  function reload() {
    if (!current) return false;
    const refs = dom();
    if (!refs.iframe) return false;
    renderLoading();
    status = 'loading';
    refs.iframe.classList.add('kc-game-frame-hidden');
    refs.iframe.src = 'about:blank';
    root?.setTimeout?.(() => {
      if (!current || status !== 'loading') return;
      armLoad(refs.iframe);
      refs.iframe.src = current.href;
    }, 0);
    return true;
  }

  function cancel() {
    const refs = dom();
    reset();
    refs.modal?.classList.add('hidden');
    if (root?.document?.body) root.document.body.style.overflow = 'auto';
    return true;
  }

  function open(payload = {}) {
    const refs = dom();
    if (!refs.modal || !refs.iframe) return false;
    clearTimer();
    detachRuntimeGuard();
    current = {
      game: payload.game || {},
      href: String(payload.href || ''),
      onStart: typeof payload.onStart === 'function' ? payload.onStart : null,
      startedTitle: typeof payload.startedTitle === 'function' ? payload.startedTitle : null,
      activated: false,
      session: null
    };
    status = 'intro';
    refs.title.textContent = cleanText(payload.titleText || `준비: ${current.game.title || '게임'}`);
    refs.iframe.src = 'about:blank';
    refs.iframe.classList.add('kc-game-frame-hidden');
    renderIntro(payload);
    refs.modal.classList.remove('hidden');
    if (root.document.body) root.document.body.style.overflow = 'hidden';
    return true;
  }

  function reset() {
    const refs = dom();
    clearTimer();
    detachRuntimeGuard();
    status = 'idle';
    current = null;
    if (refs.iframe) {
      refs.iframe.onload = null;
      refs.iframe.onerror = null;
      refs.iframe.src = 'about:blank';
      refs.iframe.classList.remove('kc-game-frame-hidden');
    }
    hideStage();
    return true;
  }

  function isPending() {
    return status === 'intro' || status === 'loading';
  }

  function isPlaying() {
    return status === 'playing';
  }

  function getState() {
    return Object.freeze({ status, pending:isPending(), playing:isPlaying(), gameId:current?.game?.id || '' });
  }

  return Object.freeze({
    LOAD_TIMEOUT_MS,
    formatMetadata,
    open,
    start,
    reload,
    showError,
    cancel,
    reset,
    isPending,
    isPlaying,
    getState
  });
});

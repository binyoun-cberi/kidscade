(function () {
  'use strict';
  const Engine = window.NumberMazeEngine;
  const app = document.getElementById('app');
  const toast = document.getElementById('toast');
  const STORAGE_KEY = 'kidscade_game_v1:number_maze';
  const WORLDS = [
    ['🌻', '수의 마을', '첫 번째 숫자 여행'],
    ['⚙️', '계산 공장', '수식을 움직이는 힘'],
    ['🌲', '교차의 숲', '가로세로의 비밀'],
    ['🔮', '수식 연구소', '숨어 있는 규칙'],
    ['🏛️', '잊힌 공식의 유적', '적은 단서로 해결'],
    ['🏰', '무한의 성', '최고의 수학 탐험가']
  ];
  const MODE_NAMES = { adventure: '모험 모드', free: '자유 퍼즐', daily: '오늘의 퍼즐', endless: '무한 도전' };
  const GRADE_NOTES = { 1: '한 자리 수의 덧셈과 뺄셈부터 차근차근', 2: '두 자리 수와 곱셈으로 한 단계 더', 3: '곱셈과 나눗셈을 함께 활용하는 도전' };
  const initialProgress = () => ({
    grade: 1, freeTier: 2, chapters: {}, best: {}, daily: {}, endlessBest: {}, settings: { largeText: false, reducedMotion: false }
  });
  function loadStore() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!raw || typeof raw !== 'object') return initialProgress();
      const defaults = initialProgress();
      return { ...defaults, ...raw, chapters: raw.chapters || {}, best: raw.best || {}, daily: raw.daily || {}, endlessBest: raw.endlessBest || {}, settings: { ...defaults.settings, ...raw.settings } };
    } catch { return initialProgress(); }
  }
  const saved = loadStore();
  const state = {
    view: 'home', grade: [1, 2, 3].includes(saved.grade) ? saved.grade : 1,
    freeTier: Math.max(1, Math.min(5, Number(saved.freeTier) || 2)),
    world: 0, mode: null, stage: 1, seed: '', puzzle: null, placements: [], selected: null,
    history: [], mistakes: 0, hints: 0, revealMistakes: false, startedAt: 0,
    run: 1, runScore: 0, outcome: '', lastScore: 0, lastStars: 0,
    settings: saved.settings, progress: saved, settingsFrom: 'home'
  };
  let toastTimer;
  function h(value) { return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
  function saveStore() {
    state.progress.grade = state.grade;
    state.progress.freeTier = state.freeTier;
    state.progress.settings = state.settings;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress)); } catch { /* 저장 공간이 차도 플레이는 계속 가능 */ }
  }
  function saveSession() {
    if (state.view === 'play' && state.puzzle) {
      state.progress.session = {
        mode: state.mode, grade: state.grade, stage: state.stage, seed: state.seed,
        placements: state.placements, mistakes: state.mistakes, hints: state.hints,
        elapsed: elapsed(), run: state.run, runScore: state.runScore, tier: currentTier()
      };
    } else {
      delete state.progress.session;
    }
    saveStore();
  }
  function notify(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
  }
  function callSdk(name, payload) {
    try { if (window.KidscadeGame && typeof window.KidscadeGame[name] === 'function') window.KidscadeGame[name](payload); } catch { /* 독립 실행 가능 */ }
  }
  function today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function unlocked() { return Math.min(120, Math.max(1, state.progress.chapters[state.grade]?.unlocked || 1)); }
  function cleared() { return Object.keys(state.progress.chapters[state.grade]?.cleared || {}).length; }
  function elapsed() { return Math.max(0, Math.floor((Date.now() - state.startedAt) / 1000)); }
  function formatTime(seconds) { return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; }
  function currentTier() {
    if (state.mode === 'adventure') return Math.min(5, Math.floor((state.stage - 1) / 20) + 1);
    if (state.mode === 'free') return state.freeTier;
    if (state.mode === 'endless') return Math.min(5, 1 + Math.floor((state.run - 1) / 3));
    const dayNumber = Math.floor(new Date(today() + 'T12:00:00').getTime() / 86400000);
    return (dayNumber % 5) + 1;
  }
  function start(mode, stage = 1, seedOverride = null, restore = null) {
    state.mode = mode;
    state.stage = stage;
    state.run = restore?.run || 1;
    state.runScore = restore?.runScore || 0;
    const tier = restore?.tier || currentTier();
    state.seed = seedOverride || (mode === 'adventure' ? `adventure-${state.grade}-${stage}` :
      mode === 'daily' ? `daily-${today()}-${state.grade}` :
      mode === 'endless' ? `endless-${state.grade}-${state.run}-${Date.now()}` :
      `free-${state.grade}-${Date.now()}-${Math.random()}`);
    state.puzzle = Engine.buildPuzzle({ grade: state.grade, tier, seed: state.seed });
    state.placements = Array(state.puzzle.solution.length).fill(null);
    if (restore && Array.isArray(restore.placements) && restore.placements.length === state.placements.length) {
      const used = new Set();
      restore.placements.forEach((value, index) => {
        if (state.puzzle.givens[index] != null || !state.puzzle.bank.includes(value) || used.has(value)) return;
        state.placements[index] = value;
        used.add(value);
      });
    }
    state.history = [];
    state.selected = null;
    state.mistakes = restore?.mistakes || 0;
    state.hints = restore?.hints || 0;
    state.revealMistakes = false;
    state.startedAt = Date.now() - (restore?.elapsed || 0) * 1000;
    state.view = 'play';
    state.outcome = '';
    callSdk('start');
    saveSession();
    render();
  }
  function resume() {
    const session = state.progress.session;
    if (!session || ![1, 2, 3].includes(session.grade) || !MODE_NAMES[session.mode]) return;
    state.grade = session.grade;
    start(session.mode, session.stage, session.seed, session);
  }
  function goHome() {
    if (state.view === 'play') saveSession();
    state.view = 'home'; state.selected = null;
    saveStore(); render();
  }
  function snapshot() { state.history.push(state.placements.slice()); if (state.history.length > 50) state.history.shift(); }
  function place(index, value) {
    if (state.puzzle.givens[index] != null || !state.puzzle.bank.includes(value)) return;
    snapshot();
    const other = state.placements.indexOf(value);
    if (other !== -1) state.placements[other] = null;
    state.placements[index] = value;
    state.selected = null;
    state.revealMistakes = false;
    saveSession();
    render();
  }
  function chooseSlot(index) {
    if (state.puzzle.givens[index] != null) return;
    if (state.selected !== null) return place(index, state.selected);
    if (state.placements[index] != null) {
      snapshot();
      state.placements[index] = null;
      state.revealMistakes = false;
      saveSession();
      render();
    } else notify('먼저 아래에서 숫자를 골라주세요.');
  }
  function chooseNumber(value) {
    if (state.placements.includes(value)) return;
    state.selected = state.selected === value ? null : value;
    render();
  }
  function undo() {
    if (!state.history.length) return notify('되돌릴 숫자가 없어요.');
    state.placements = state.history.pop();
    state.revealMistakes = false;
    state.selected = null;
    saveSession(); render();
  }
  function hint() {
    const index = state.puzzle.givens.findIndex((given, i) => given == null && state.placements[i] !== state.puzzle.solution[i]);
    if (index < 0) return notify('모든 숫자를 알맞게 놓았어요!');
    state.hints++;
    place(index, state.puzzle.solution[index]);
    notify('반짝! 숫자 한 칸의 자리를 알려줬어요.');
  }
  function remaining() { return state.puzzle.bank.filter(value => !state.placements.includes(value)); }
  function submit() {
    const outcome = Engine.checkBoard(state.puzzle, state.placements);
    if (!outcome.complete) return notify(`아직 ${remaining().length}개의 숫자가 남았어요.`);
    if (outcome.correct) return win();
    state.mistakes++;
    state.revealMistakes = true;
    if (state.mode === 'endless' && state.mistakes >= 3) return loss();
    saveSession(); render();
    notify('아직 맞지 않는 수식이 있어요. 빨갛게 표시된 결과를 살펴보세요.');
  }
  function win() {
    const seconds = elapsed();
    state.lastStars = state.hints === 0 && state.mistakes === 0 ? 3 : state.mistakes + state.hints <= 2 ? 2 : 1;
    state.lastScore = Math.max(50, 100 + currentTier() * 45 + Math.max(0, 100 - seconds) - state.mistakes * 20 - state.hints * 25);
    state.runScore += state.lastScore;
    state.outcome = 'win';
    state.view = 'result';
    if (state.mode === 'adventure') {
      const record = state.progress.chapters[state.grade] || { unlocked: 1, cleared: {} };
      record.cleared = record.cleared || {};
      record.cleared[state.stage] = Math.max(record.cleared[state.stage] || 0, state.lastStars);
      record.unlocked = Math.max(record.unlocked, Math.min(120, state.stage + 1));
      state.progress.chapters[state.grade] = record;
    }
    if (state.mode === 'daily') {
      const key = `${today()}-${state.grade}`;
      state.progress.daily[key] = Math.max(state.progress.daily[key] || 0, state.lastStars);
    }
    if (state.mode === 'endless') state.progress.endlessBest[state.grade] = Math.max(state.progress.endlessBest[state.grade] || 0, state.runScore);
    state.progress.best[state.grade] = Math.max(state.progress.best[state.grade] || 0, state.lastScore);
    saveSession();
    callSdk('score', state.lastScore);
    callSdk('result', { scope: state.mode === 'adventure' ? 'stage' : 'match', status: 'completed', outcome: 'clear', id: state.mode === 'adventure' ? `maze-${state.grade}-${state.stage}` : state.mode, score: state.lastScore, grade: state.grade, hints: state.hints });
    render();
  }
  function loss() {
    state.outcome = 'loss';
    state.view = 'result';
    saveSession();
    callSdk('result', { scope: 'run', status: 'failed', outcome: 'fail', score: state.runScore, grade: state.grade, stages: state.run - 1 });
    render();
  }
  function next() {
    if (state.mode === 'adventure') return start('adventure', Math.min(120, state.stage + 1));
    if (state.mode === 'endless') {
      const nextRun = state.run + 1, totalScore = state.runScore;
      // 난도와 생성 시드를 다음 연속 도전 단계에 맞춘다.
      start('endless', 1, `endless-${state.grade}-${nextRun}-${Date.now()}`, { run: nextRun, runScore: totalScore });
      return;
    }
    if (state.mode === 'daily') return goHome();
    return start('free');
  }

  function header() {
    return `<header class="nav"><div class="logo"><span class="mark">∑</span><div><h1>수의 미궁</h1><small>숫자가 만나는 곳, 생각이 열리는 시간</small></div></div><div class="actions"><button type="button" class="icon-btn" data-action="settings" aria-label="설정">⚙️</button><button type="button" class="pill-btn" data-action="home">🏠 홈</button></div></header>`;
  }
  function renderHome() {
    const grade = state.grade, session = state.progress.session;
    const completed = cleared();
    const chapterButtons = WORLDS.map((chapter, i) => {
      const first = i * 20 + 1;
      const locked = first > unlocked();
      return `<button type="button" class="chapter ${state.world === i ? 'active' : ''} ${locked ? 'locked' : ''}" data-action="world" data-world="${i}" ${locked ? 'disabled' : ''} aria-label="${chapter[1]} ${locked ? '잠김' : ''}"><span class="ch-icon">${chapter[0]}</span><strong>${chapter[1]}</strong><small>${locked ? '🔒 아직 잠겨 있어요' : `${first}~${first + 19}단계`}</small></button>`;
    }).join('');
    const first = state.world * 20 + 1;
    const clearedStages = state.progress.chapters[grade]?.cleared || {};
    const levels = Array.from({ length: 20 }, (_, i) => {
      const stage = first + i;
      const isDone = !!clearedStages[stage], isNext = stage === unlocked(), locked = stage > unlocked();
      return `<button type="button" class="stage-btn ${isDone ? 'done' : ''} ${isNext ? 'next' : ''}" data-action="stage" data-stage="${stage}" ${locked ? 'disabled' : ''} title="${stage}단계">${isDone ? '★' : stage}</button>`;
    }).join('');
    return `${header()}<main class="home-layout"><div>
      <section class="intro card"><div class="eyebrow">NUMBER MAZE · GRADE ${grade}</div><h2>빈칸 속 숫자를 찾으면<br>미궁의 길이 열려요!</h2><p>가로와 세로의 수식이 모두 맞도록 숫자를 놓아보세요. 한 문제씩, 내 속도로!</p><button class="primary-btn" data-action="adventure">✨ ${completed ? '모험 이어하기' : '모험 시작하기'} →</button></section>
      <div class="stat-row"><div class="stat"><span>⭐ 해결한 단계</span><strong>${completed} / 120</strong></div><div class="stat"><span>🏆 최고 점수</span><strong>${state.progress.best[grade] || 0}</strong></div><div class="stat"><span>🔥 무한 도전 기록</span><strong>${state.progress.endlessBest[grade] || 0}</strong></div></div>
      <div class="mode-grid"><button class="mode-card" data-action="adventure"><div class="mode-icon">🗺️</div><strong>모험 모드</strong><span>여섯 구역을 지나며 미궁의 비밀을 풀어요.</span></button><button class="mode-card" data-action="free"><div class="mode-icon">🧩</div><strong>자유 퍼즐</strong><span>좋아하는 난이도로 새 문제를 계속 풀어요.</span></button><button class="mode-card" data-action="daily"><div class="mode-icon">📅</div><strong>오늘의 퍼즐</strong><span>매일 같은 날짜에 새로운 퍼즐이 찾아와요.</span></button><button class="mode-card" data-action="endless"><div class="mode-icon">♾️</div><strong>무한 도전</strong><span>세 번의 실수 전에 얼마나 멀리 갈 수 있을까요?</span></button></div>
    </div><div><section class="card sidebar-section"><div class="section-title"><h3>내 수학 여행</h3><small>언제든 바꿀 수 있어요</small></div><div class="grade-group">${[1, 2, 3].map(g => `<button type="button" class="grade-btn ${grade === g ? 'active' : ''}" data-action="grade" data-grade="${g}" aria-pressed="${grade === g}">${g}학년</button>`).join('')}</div><p class="grade-note">${GRADE_NOTES[grade]}</p>
      ${session ? `<button type="button" class="secondary-btn" style="width:100%;margin-top:13px" data-action="resume">↩ 풀던 퍼즐 이어하기 (${session.grade}학년)</button>` : ''}
      <div class="section-title" style="margin-top:25px"><h3>자유 퍼즐 난이도</h3></div><div class="grade-group">${[1,2,3,4,5].map(t => `<button type="button" class="grade-btn ${state.freeTier === t ? 'active' : ''}" data-action="tier" data-tier="${t}" aria-label="난이도 ${t}" aria-pressed="${state.freeTier === t}">${t}</button>`).join('')}</div><p class="grade-note">1은 가볍게 시작, 5는 깊이 생각하는 문제예요.</p></section>
      <div class="chapter-title">🗺️ 모험 지도</div><div class="chapter-list">${chapterButtons}</div><section class="card stage-panel"><div class="section-title"><h3>${WORLDS[state.world][0]} ${WORLDS[state.world][1]}</h3><small>${first}~${first + 19}</small></div><div class="stage-grid">${levels}</div></section></div></main><div class="footer-note">광고 없이, 재촉하지 않고, 원하는 만큼 즐기는 숫자 퍼즐</div>`;
  }

  function makeBoard() {
    const p = state.puzzle, n = p.size;
    const lineStates = state.revealMistakes ? Engine.checkBoard(p, state.placements).lines : [];
    const pieces = [];
    for (let r = 0; r <= n * 2; r++) {
      for (let c = 0; c <= n * 2; c++) {
        let cls = 'void', label = '', slot = '', extra = '';
        if (r % 2 === 0 && c % 2 === 0 && r < n * 2 && c < n * 2) {
          const index = (r / 2) * n + (c / 2);
          const given = p.givens[index] != null;
          const value = given ? p.givens[index] : state.placements[index];
          cls = `value ${given ? 'given' : `editable ${value == null ? 'empty-value' : 'active-value'}`}`;
          label = value == null ? '?' : value;
          if (!given) { slot = ` data-action="slot" data-index="${index}"`; extra = `aria-label="${r / 2 + 1}행 ${c / 2 + 1}열 ${value == null ? '빈칸' : `숫자 ${value} 배치됨`}"`; }
        } else if (r < n * 2 && r % 2 === 0 && c < n * 2 - 1 && c % 2 === 1) {
          cls = 'operator'; label = p.lines[r / 2].ops[(c - 1) / 2];
        } else if (r < n * 2 - 1 && r % 2 === 1 && c < n * 2 && c % 2 === 0) {
          cls = 'operator'; label = p.lines[n + c / 2].ops[(r - 1) / 2];
        } else if (r < n * 2 && r % 2 === 0 && c === n * 2 - 1 || r === n * 2 - 1 && c < n * 2 && c % 2 === 0) {
          cls = 'equals'; label = '=';
        } else if (r < n * 2 && r % 2 === 0 && c === n * 2) {
          const index = r / 2;
          cls = `result ${lineStates[index] === true ? 'correct' : lineStates[index] === false ? 'incorrect' : ''}`;
          label = p.lines[index].target;
        } else if (r === n * 2 && c < n * 2 && c % 2 === 0) {
          const index = n + c / 2;
          cls = `result ${lineStates[index] === true ? 'correct' : lineStates[index] === false ? 'incorrect' : ''}`;
          label = p.lines[index].target;
        }
        pieces.push(slot ? `<button type="button" class="board-cell ${cls}"${slot} ${extra}>${label}</button>` : `<div class="board-cell ${cls}" aria-hidden="true">${label}</div>`);
      }
    }
    return `<div class="board-grid" style="--columns:${n * 2 + 1}" role="group" aria-label="교차 수식 퍼즐판">${pieces.join('')}</div>`;
  }

  function renderPlay() {
    const p = state.puzzle, grade = state.grade;
    const filled = p.givens.filter(x => x != null).length + state.placements.filter(x => x != null).length;
    const used = p.bank.length - remaining().length;
    const chapter = Math.min(5, Math.floor((state.stage - 1) / 20));
    const bank = p.bank.map(value => {
      const disabled = state.placements.includes(value);
      return `<button type="button" class="number-tile ${state.selected === value ? 'selected' : ''} ${disabled ? 'used' : ''}" data-action="number" data-number="${value}" draggable="${!disabled}" ${disabled ? 'disabled' : ''} aria-pressed="${state.selected === value}" aria-label="숫자 ${value}">${value}</button>`;
    }).join('');
    return `${header()}<main class="play-layout"><section class="card game-card"><div class="play-header"><div><div class="eyebrow">${grade}학년 · ${MODE_NAMES[state.mode]}</div><h2>${state.mode === 'adventure' ? `${WORLDS[chapter][0]} ${WORLDS[chapter][1]} · ${state.stage}단계` : state.mode === 'endless' ? `연속 ${state.run}번째 퍼즐` : state.mode === 'daily' ? `${today()}의 문제` : `난이도 ${currentTier()} 퍼즐`}</h2></div><div class="timer" data-timer>${formatTime(elapsed())}</div></div>
      <div class="hint-row" style="justify-content:center"><span class="badge">난이도 ${currentTier()} / 5</span><span class="badge green">${filled} / ${p.solution.length}칸</span>${state.hints ? `<span class="badge gold">힌트 ${state.hints}회</span>` : ''}</div>
      <p class="game-instructions">아래 숫자를 누른 다음 빈칸을 골라요. 가로세로 수식이 모두 맞으면 성공!</p><div class="board-wrap">${makeBoard()}</div><div class="bank-label">↓ 이 숫자들을 빈칸에 놓아보세요</div><div class="bank" aria-label="남은 숫자 목록">${bank}</div>
      <div class="board-actions"><div class="left"><button type="button" class="small-btn" data-action="undo" ${state.history.length ? '' : 'disabled'}>↶ 되돌리기</button><button type="button" class="small-btn" data-action="hint">💡 힌트</button></div><button type="button" class="primary-btn" data-action="submit">✓ 정답 확인</button></div>
    </section><aside class="play-side"><section class="card side-card"><h3>🔍 수수께끼의 단서</h3><p>${grade === 1 ? '덧셈과 뺄셈을 거꾸로 생각하면 빈칸이 보여요.' : grade === 2 ? '몇을 더하거나 곱하면 결과가 될지 생각해 보세요.' : '곱셈과 나눗셈을 먼저 계산하는 것을 기억하세요.'}</p><div class="progress-track"><div class="progress-fill" style="width:${Math.floor(filled / p.solution.length * 100)}%"></div></div><div class="hint-row"><span class="badge">남은 숫자 ${p.bank.length - used}개</span>${state.mode === 'endless' ? `<span class="badge gold">실수 ${state.mistakes} / 3</span>` : ''}</div><span class="key-tip">키보드: Tab으로 이동 · Enter로 선택 · Ctrl+Z로 되돌리기</span></section><section class="card side-card"><h3>🌟 이렇게 풀어봐요</h3><ul><li>빈칸이 하나 남은 수식부터 살펴보세요.</li><li>가로와 세로에서 모두 맞는 수를 찾아요.</li><li>급하게 하지 않아도 괜찮아요.</li></ul><button type="button" class="secondary-btn" data-action="home">다른 모드 선택</button></section></aside></main>`;
  }

  function renderResult() {
    const success = state.outcome === 'win';
    const isFinal = state.mode === 'adventure' && state.stage >= 120;
    const stars = success ? '⭐'.repeat(state.lastStars) + '☆'.repeat(3 - state.lastStars) : '🌧️';
    return `${header()}<main class="card result-card"><div class="result-emoji">${success ? '🎉' : '🧩'}</div><div class="eyebrow">${MODE_NAMES[state.mode]}</div><h2>${success ? '수식을 모두 완성했어요!' : '이번 도전은 여기까지!'}</h2><div style="font-size:29px;letter-spacing:3px">${stars}</div><p>${success ? '가로와 세로를 함께 생각하는 멋진 풀이였어요.' : '괜찮아요. 어떤 수식부터 풀지 다시 생각해 보세요.'}</p><div class="result-stats"><div class="result-stat"><span>풀이 시간</span><strong>${formatTime(elapsed())}</strong></div><div class="result-stat"><span>${state.mode === 'endless' ? '누적 점수' : '획득 점수'}</span><strong>${state.mode === 'endless' ? state.runScore : state.lastScore}</strong></div><div class="result-stat"><span>사용한 힌트</span><strong>${state.hints}</strong></div></div><div class="result-actions"><button class="secondary-btn" data-action="home">🏠 모드 선택</button><button class="secondary-btn" data-action="retry">↻ 다시 풀기</button>${success && !isFinal ? `<button class="primary-btn" data-action="next">${state.mode === 'daily' ? '완료하기' : '다음 퍼즐 →'}</button>` : ''}</div></main>`;
  }
  function renderSettings() {
    return `${header()}<main class="card result-card" style="max-width:460px;text-align:left"><h2>⚙️ 게임 설정</h2><p>눈과 손이 편안한 방식으로 조절해요.</p><section class="settings-panel"><label for="largeText">큰 숫자로 보기 <input id="largeText" type="checkbox" data-setting="largeText" ${state.settings.largeText ? 'checked' : ''}></label><label for="reducedMotion">움직임 줄이기 <input id="reducedMotion" type="checkbox" data-setting="reducedMotion" ${state.settings.reducedMotion ? 'checked' : ''}></label></section><button class="primary-btn" data-action="settings-back">돌아가기</button></main>`;
  }
  function render() {
    document.body.classList.toggle('large-text', !!state.settings.largeText);
    document.body.classList.toggle('reduced-motion', !!state.settings.reducedMotion);
    app.innerHTML = state.view === 'play' ? renderPlay() : state.view === 'result' ? renderResult() : state.view === 'settings' ? renderSettings() : renderHome();
  }
  app.addEventListener('click', function (event) {
    const button = event.target.closest('[data-action]');
    if (!button || button.disabled) return;
    const action = button.dataset.action;
    if (action === 'grade') { state.grade = Number(button.dataset.grade); state.world = Math.min(5, Math.floor((unlocked() - 1) / 20)); saveStore(); render(); }
    else if (action === 'tier') { state.freeTier = Number(button.dataset.tier); saveStore(); render(); }
    else if (action === 'world') { state.world = Number(button.dataset.world); render(); }
    else if (action === 'stage') start('adventure', Number(button.dataset.stage));
    else if (action === 'adventure') start('adventure', unlocked());
    else if (['free', 'daily', 'endless'].includes(action)) start(action);
    else if (action === 'resume') resume();
    else if (action === 'number') chooseNumber(Number(button.dataset.number));
    else if (action === 'slot') chooseSlot(Number(button.dataset.index));
    else if (action === 'undo') undo();
    else if (action === 'hint') hint();
    else if (action === 'submit') submit();
    else if (action === 'next') next();
    else if (action === 'retry') start(state.mode, state.stage, state.seed);
    else if (action === 'home') goHome();
    else if (action === 'settings') { state.settingsFrom = state.view; state.view = 'settings'; render(); }
    else if (action === 'settings-back') { state.view = state.settingsFrom; render(); }
  });
  app.addEventListener('change', function (event) {
    if (!event.target.dataset.setting) return;
    state.settings[event.target.dataset.setting] = event.target.checked;
    saveStore(); render();
  });
  app.addEventListener('dragstart', function (event) {
    const tile = event.target.closest('[data-action="number"]');
    if (!tile || tile.disabled) return;
    event.dataTransfer?.setData('text/plain', tile.dataset.number);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  });
  app.addEventListener('dragover', function (event) {
    if (event.target.closest('[data-action="slot"]')) event.preventDefault();
  });
  app.addEventListener('drop', function (event) {
    const slot = event.target.closest('[data-action="slot"]');
    if (!slot) return;
    event.preventDefault();
    const value = Number(event.dataTransfer?.getData('text/plain'));
    if (state.puzzle.bank.includes(value)) place(Number(slot.dataset.index), value);
  });
  document.addEventListener('keydown', event => {
    if (state.view !== 'play') return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); undo(); }
    if (event.key === 'Escape') { state.selected = null; render(); }
  });
  window.addEventListener('pagehide', () => { if (state.view === 'play') saveSession(); });
  setInterval(() => { if (state.view === 'play') { const timer = app.querySelector('[data-timer]'); if (timer) timer.textContent = formatTime(elapsed()); } }, 1000);
  state.world = Math.min(5, Math.floor((unlocked() - 1) / 20));
  render();
})();

/* Math Rain: an independent falling-question mode for Muhanru. */
(function () {
  "use strict";
  const engine = window.MathRainEngine;
  if (!engine || !document.getElementById("menuScreen")) return;

  const menu = document.getElementById("menuScreen");
  const menuStart = menu.querySelector(".start-row");
  const launcher = document.createElement("button");
  launcher.id = "rainLaunchBtn";
  launcher.className = "rain-launch";
  launcher.type = "button";
  launcher.innerHTML = '<strong>하늘에서 내려오는 연산</strong><span>문제 블록을 선택하고 정답을 맞혀 없애요 · 혼자 즐기는 낙하형 게임</span>';
  menuStart.insertAdjacentElement("afterend", launcher);

  const screen = document.createElement("section");
  screen.id = "rainScreen";
  screen.className = "screen rain-screen hidden";
  screen.innerHTML = `
    <div class="rain-header">
      <div><div class="rain-kicker">MATH RAIN · 무한루</div><h2>하늘에서 내려오는 연산</h2><p>떨어지는 문제를 골라 계산하세요. 가까운 블록의 답이 같으면 함께 사라집니다!</p></div>
      <button type="button" class="rain-exit" id="rainHome">메뉴로</button>
    </div>
    <div class="rain-hud" aria-live="polite">
      <div><small>점수</small><strong id="rainScore">0</strong></div>
      <div><small>연속 정답</small><strong id="rainCombo">0</strong></div>
      <div><small>남은 기회</small><strong id="rainLives">3 / 3</strong></div>
      <div><small>최고 기록</small><strong id="rainBest">0</strong></div>
    </div>
    <div class="rain-layout">
      <div class="rain-board-wrap">
        <div class="rain-board" id="rainBoard" aria-label="하늘에서 떨어지는 수학 문제들">
          <div class="rain-sun" aria-hidden="true"></div>
          <div class="rain-cloud cloud-a" aria-hidden="true"></div>
          <div class="rain-cloud cloud-b" aria-hidden="true"></div>
          <div class="rain-layer" id="rainLayer"></div>
          <div class="rain-floor" aria-hidden="true"></div>
          <div class="rain-message" id="rainMessage" aria-live="polite"></div>
          <div class="rain-curtain" id="rainIntro">
            <h3>어느 문제부터 풀까요?</h3>
            <p>문제를 누르면 선택돼요.<br>숫자를 입력하고 <b>확인</b>을 누르세요.</p>
            <label class="rain-level-label" for="rainLevel">난이도</label>
            <select id="rainLevel">
              <option value="easy">차근차근 · 20까지 덧셈·뺄셈</option>
              <option value="normal" selected>기본 · 사칙연산 맛보기</option>
              <option value="hard">도전 · 곱셈·나눗셈까지</option>
            </select>
            <button type="button" id="rainStart" class="rain-primary">시작하기</button>
          </div>
          <div class="rain-curtain hidden" id="rainOver">
            <h3>이번 도전 완료!</h3><p id="rainFinal">수고했어요!</p>
            <button type="button" id="rainAgain" class="rain-primary">다시 도전</button>
            <button type="button" id="rainOverHome" class="rain-secondary">메뉴로</button>
          </div>
          <div class="rain-curtain hidden" id="rainPaused">
            <h3>잠깐 쉬어 가요</h3><p>다시 시작하면 이어서 떨어져요.</p>
            <button type="button" id="rainResume" class="rain-primary">계속하기</button>
          </div>
        </div>
        <div class="rain-helper"><span>같은 답의 가까운 블록은 연쇄로 사라져요.</span><button type="button" id="rainPauseBtn" disabled>일시정지</button></div>
      </div>
      <div class="rain-controls">
        <div class="rain-target-label">지금 풀 문제 <span>다른 블록을 누르면 바뀌어요</span></div>
        <div class="rain-expression" id="rainExpression">준비!</div>
        <div class="rain-entry" id="rainEntry" aria-live="polite">정답을 입력하세요</div>
        <div class="rain-pad" aria-label="숫자 입력">
          <button data-rain-key="7">7</button><button data-rain-key="8">8</button><button data-rain-key="9">9</button>
          <button data-rain-key="4">4</button><button data-rain-key="5">5</button><button data-rain-key="6">6</button>
          <button data-rain-key="1">1</button><button data-rain-key="2">2</button><button data-rain-key="3">3</button>
          <button class="rain-delete" data-rain-key="del">지우기</button><button data-rain-key="0">0</button><button class="rain-enter" data-rain-key="enter">확인</button>
        </div>
        <p class="rain-input-help">키보드 숫자 · Enter 확인 · Backspace 지우기 · Tab 블록 변경</p>
      </div>
    </div>`;
  document.querySelector("main.app").appendChild(screen);

  function el(id) { return document.getElementById(id); }
  const board = el("rainBoard"), layer = el("rainLayer");
  let nextId = 1;
  let raf = 0;
  let audioCtx = null;
  const state = {
    running: false, paused: false, level: "normal", blocks: [],
    selected: null, entry: "", score: 0, combo: 0, bestCombo: 0,
    correct: 0, missed: 0, wrong: 0, seconds: 0, spawnClock: 0, lastFrame: 0,
    hintAnswer: null, lastMessageTimer: 0, session: 0
  };

  function recordKey() { return "kidscade_muhanru_rain_best_" + state.level; }
  function readBest() {
    try { return Math.max(0, Number(localStorage.getItem(recordKey())) || 0); }
    catch (_) { return 0; }
  }
  function writeBest() {
    if (state.score <= readBest()) return;
    try { localStorage.setItem(recordKey(), String(state.score)); } catch (_) {}
  }
  function sound(frequency, duration = .08, waveform = "sine") {
    try {
      if (!audioCtx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        audioCtx = new AC();
      }
      if (audioCtx.state === "suspended") audioCtx.resume();
      const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
      osc.type = waveform;
      osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
      gain.gain.setValueAtTime(.0001, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(.075, audioCtx.currentTime + .012);
      gain.gain.exponentialRampToValueAtTime(.0001, audioCtx.currentTime + duration);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(); osc.stop(audioCtx.currentTime + duration + .02);
    } catch (_) {}
  }
  function feedback(message, positive) {
    const messageEl = el("rainMessage");
    messageEl.textContent = message;
    messageEl.className = "rain-message show " + (positive ? "positive" : "negative");
    clearTimeout(state.lastMessageTimer);
    const currentSession = state.session;
    state.lastMessageTimer = setTimeout(() => {
      if (currentSession === state.session) messageEl.className = "rain-message";
    }, 950);
  }
  function hideAllCurtains() {
    ["rainIntro", "rainOver", "rainPaused"].forEach(id => el(id).classList.add("hidden"));
  }
  function updateHud() {
    el("rainScore").textContent = state.score.toLocaleString("ko-KR");
    el("rainCombo").textContent = String(state.combo);
    el("rainLives").textContent = Math.max(0, 3 - state.missed) + " / 3";
    el("rainBest").textContent = Math.max(readBest(), state.score).toLocaleString("ko-KR");
    const block = state.blocks.find(item => item.id === state.selected);
    el("rainExpression").textContent = block ? block.expression : (state.running ? "문제를 기다려요" : "준비!");
    el("rainEntry").textContent = state.entry || (block ? "?" : "정답을 입력하세요");
    el("rainEntry").classList.toggle("filled", Boolean(state.entry));
    state.blocks.forEach(item => {
      item.node.classList.toggle("selected", item.id === state.selected);
      item.node.setAttribute("aria-pressed", String(item.id === state.selected));
    });
  }
  function place(block) {
    block.node.style.transform = "translate3d(" + (block.x - 47) + "px," + block.y + "px,0)";
  }
  function choose(id) {
    if (!state.running || state.paused || !state.blocks.some(item => item.id === id)) return;
    state.selected = id; state.entry = "";
    updateHud();
  }
  function assignNextTarget() {
    if (!state.blocks.some(item => item.id === state.selected)) {
      state.selected = engine.suggestedTarget(state.blocks);
      state.entry = "";
    }
  }
  function spawn() {
    if (!state.running || state.blocks.length >= 7) return false;
    const width = board.clientWidth || 400;
    const lanes = Math.max(3, Math.min(5, Math.floor(width / 116)));
    const laneWidth = width / lanes;
    const laneScores = Array.from({length: lanes}, (_, lane) =>
      state.blocks.filter(item => Math.round(item.x / laneWidth - .5) === lane && item.y < 175).length);
    const least = Math.min(...laneScores);
    if (least >= 2) return false;
    const choices = laneScores.map((n, i) => n === least ? i : -1).filter(i => i >= 0);
    const lane = choices[Math.floor(Math.random() * choices.length)];
    let forcedAnswer;
    if (state.blocks.length && Math.random() < .36) {
      const candidates = state.blocks.filter(item => Math.abs(item.x - (lane + .5) * laneWidth) <= laneWidth * 1.35 && item.y < 230);
      if (candidates.length) forcedAnswer = candidates[Math.floor(Math.random() * candidates.length)].answer;
    }
    const q = engine.makeQuestion(state.level, Math.random, forcedAnswer);
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "rain-tile tone-" + q.color;
    tile.textContent = q.expression;
    tile.setAttribute("aria-label", q.expression + "의 정답 입력");
    const block = {
      ...q, id: nextId++, lane, x: (lane + .5) * laneWidth,
      y: -70, speed: (state.level === "easy" ? 38 : state.level === "normal" ? 44 : 49) +
        Math.min(35, state.seconds * .1),
      node: tile
    };
    tile.addEventListener("click", () => choose(block.id));
    layer.appendChild(tile); state.blocks.push(block); place(block);
    if (state.selected === null) state.selected = block.id;
    updateHud();
    return true;
  }
  function removeWithEffect(block, order) {
    if (!block || !block.node) return;
    block.node.classList.add("popping");
    block.node.style.setProperty("--rain-delay", Math.min(210, order * 65) + "ms");
    block.node.disabled = true;
    setTimeout(() => block.node.remove(), 500);
  }
  function vibrate(duration) {
    if (window.navigator && typeof navigator.vibrate === "function") navigator.vibrate(duration);
  }
  function answer() {
    if (!state.running || state.paused || !state.entry) return;
    const target = state.blocks.find(item => item.id === state.selected);
    if (!target) return;
    if (Number(state.entry) === target.answer) {
      const chain = engine.connectedChain(state.blocks, target.id,
        Math.max(125, board.clientWidth / Math.max(3, Math.min(5, Math.floor(board.clientWidth / 116))) + 18), 155);
      const cleared = state.blocks.filter(item => chain.includes(item.id));
      state.blocks = state.blocks.filter(item => !chain.includes(item.id));
      cleared.forEach((item, i) => removeWithEffect(item, i));
      state.correct++; state.combo++; state.bestCombo = Math.max(state.combo, state.bestCombo);
      const gained = engine.scoreFor(cleared.length, state.combo,
        Math.round(Math.max(0, board.clientHeight - target.y) / 10));
      state.score += gained;
      state.entry = ""; state.selected = null;
      assignNextTarget(); updateHud(); writeBest();
      feedback(cleared.length > 1 ? cleared.length + "개 연쇄! +" + gained : "정답! +" + gained, true);
      board.classList.remove("rain-impact"); void board.offsetWidth; board.classList.add("rain-impact");
      sound(450 + Math.min(9, state.combo) * 42, .11, "triangle");
      if (cleared.length > 1) setTimeout(() => sound(720, .13, "sine"), 95);
      vibrate(cleared.length > 1 ? [12, 40, 14] : 12);
      if (state.blocks.length < 2) spawn();
    } else {
      state.wrong++; state.combo = 0; state.entry = "";
      target.node.classList.remove("shaking"); void target.node.offsetWidth; target.node.classList.add("shaking");
      feedback("다시 계산해 보세요!", false);
      sound(190, .13, "sawtooth");
      updateHud();
    }
  }
  function press(key) {
    if (!state.running || state.paused) return;
    if (key === "enter") { answer(); return; }
    if (key === "del") { state.entry = state.entry.slice(0, -1); updateHud(); return; }
    if (/^\d$/.test(key) && state.entry.length < 3) {
      state.entry = (state.entry === "0" ? "" : state.entry) + key;
      updateHud();
    }
  }
  function frame(now) {
    if (!state.running) return;
    if (state.paused) { state.lastFrame = now; raf = requestAnimationFrame(frame); return; }
    const dt = Math.min(.045, Math.max(0, (now - (state.lastFrame || now)) / 1000));
    state.lastFrame = now; state.seconds += dt; state.spawnClock += dt;
    const interval = Math.max(state.level === "easy" ? 2.8 : 2.05,
      (state.level === "easy" ? 3.7 : state.level === "normal" ? 3.05 : 2.75) - state.seconds / 150);
    if (state.spawnClock >= interval && spawn()) state.spawnClock = 0;
    const limit = board.clientHeight - 27;
    const expired = [];
    for (const block of state.blocks) {
      block.y += block.speed * dt;
      place(block);
      if (block.y + 64 >= limit) expired.push(block);
    }
    if (expired.length) {
      const ids = new Set(expired.map(item => item.id));
      state.blocks = state.blocks.filter(item => !ids.has(item.id));
      expired.forEach(item => item.node.remove());
      state.missed += expired.length;
      state.combo = 0;
      state.selected = null;
      assignNextTarget(); updateHud();
      feedback("블록이 바닥에 닿았어요", false);
      sound(160, .2, "sawtooth");
      if (state.missed >= 3) { finish(); return; }
    }
    raf = requestAnimationFrame(frame);
  }
  function reset() {
    cancelAnimationFrame(raf);
    clearTimeout(state.lastMessageTimer);
    state.session++;
    state.running = true; state.paused = false;
    state.level = el("rainLevel").value;
    state.blocks.forEach(block => block.node.remove());
    state.blocks = []; layer.replaceChildren();
    state.selected = null; state.entry = ""; state.score = 0; state.combo = 0; state.bestCombo = 0;
    state.correct = 0; state.missed = 0; state.wrong = 0; state.seconds = 0;
    state.spawnClock = 0; state.lastFrame = 0; nextId = 1;
    hideAllCurtains();
    el("rainMessage").className = "rain-message";
    el("rainPauseBtn").disabled = false; el("rainPauseBtn").textContent = "일시정지";
    updateHud(); spawn();
    raf = requestAnimationFrame(frame);
    try { window.KidscadeGame?.start?.({mode: "rain", difficulty: state.level}); } catch (_) {}
  }
  function finish() {
    state.running = false; state.paused = false; cancelAnimationFrame(raf);
    writeBest(); el("rainPauseBtn").disabled = true;
    el("rainFinal").textContent = state.correct + "문제 정답 · 최고 " + state.bestCombo +
      "콤보 · " + state.score.toLocaleString("ko-KR") + "점";
    hideAllCurtains(); el("rainOver").classList.remove("hidden");
    try {
      window.KidscadeGame?.achievementProgress?.("infinite_gugudan.correct_25", state.correct);
      window.KidscadeGame?.achievementProgress?.("infinite_gugudan.combo_10", state.bestCombo);
      window.KidscadeGame?.achievementProgress?.("infinite_gugudan.combo_20", state.bestCombo);
      window.KidscadeGame?.result?.({
        scope: "match", status: "completed", outcome: "completed", mode: "rain", skill: state.level,
        score: state.score, correct: state.correct, wrong: state.wrong, maxCombo: state.bestCombo, cleared: true
      });
    } catch (_) {}
  }
  function open() {
    ["menuScreen", "battleScreen", "resultScreen"].forEach(id => el(id).classList.add("hidden"));
    screen.classList.remove("hidden");
    state.running = false; state.paused = false;
    hideAllCurtains(); el("rainIntro").classList.remove("hidden");
    el("rainPauseBtn").disabled = true;
    updateHud(); window.scrollTo(0, 0);
  }
  function home() {
    cancelAnimationFrame(raf); clearTimeout(state.lastMessageTimer); state.session++;
    state.running = false; state.paused = false;
    state.blocks.forEach(item => item.node.remove()); state.blocks = []; layer.replaceChildren();
    state.selected = null; state.entry = "";
    screen.classList.add("hidden"); menu.classList.remove("hidden");
    hideAllCurtains(); window.scrollTo(0, 0);
  }
  function pause(value) {
    if (!state.running) return;
    state.paused = value; state.lastFrame = 0;
    el("rainPaused").classList.toggle("hidden", !value);
    el("rainPauseBtn").textContent = value ? "계속하기" : "일시정지";
  }
  launcher.addEventListener("click", open);
  el("rainHome").addEventListener("click", home);
  el("rainOverHome").addEventListener("click", home);
  el("rainStart").addEventListener("click", reset);
  el("rainAgain").addEventListener("click", reset);
  el("rainPauseBtn").addEventListener("click", () => pause(!state.paused));
  el("rainResume").addEventListener("click", () => pause(false));
  el("rainLevel").addEventListener("change", updateHud);
  screen.querySelectorAll("[data-rain-key]").forEach(button => {
    button.addEventListener("click", () => press(button.dataset.rainKey));
  });
  document.addEventListener("keydown", event => {
    if (screen.classList.contains("hidden") || !state.running || state.paused) return;
    let key = null;
    if (/^\d$/.test(event.key)) key = event.key;
    else if (event.key === "Enter") key = "enter";
    else if (event.key === "Backspace" || event.key === "Delete") key = "del";
    else if (event.key === "Tab") {
      event.preventDefault();
      if (!state.blocks.length) return;
      const ordered = state.blocks.slice().sort((a, b) => b.y - a.y);
      const at = ordered.findIndex(item => item.id === state.selected);
      choose(ordered[(at + 1) % ordered.length].id);
      return;
    } else if (event.key === "Escape") { pause(true); event.preventDefault(); return; }
    if (key !== null) { event.preventDefault(); press(key); }
  }, true);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state.running) pause(true);
  });
  window.addEventListener("resize", () => {
    if (!state.blocks.length) return;
    const lanes = Math.max(3, Math.min(5, Math.floor((board.clientWidth || 400) / 116)));
    state.blocks.forEach(item => {
      item.lane = Math.min(item.lane, lanes - 1);
      item.x = (item.lane + .5) * board.clientWidth / lanes;
      place(item);
    });
  });
})();

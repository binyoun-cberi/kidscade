(() => {
  "use strict";
  const S = window.IslandSim;
  if (!S) throw new Error("열두 명의 섬 시뮬레이션 엔진을 불러오지 못했습니다.");
  const $ = id => document.getElementById(id);
  const STORAGE = "kidscade_game_v1:high_twelve_island:world";
  const escapeHTML = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const number = n => Number(n).toFixed(1).replace(/\.0$/, "");
  const element = {
    stats: $("stats"), stage: $("stageTitle"), clock: $("clock"), population: $("population"),
    name: $("villageName"), panel: $("panel"), sprites: $("buildingSprites"), people: $("people"),
    scene: $("sceneCaption"), missionText: $("missionText"), missionBar: $("missionBar"),
    progress: $("progressText"), ticker: $("ticker"), modal: $("modal"), modalOptions: $("modalOptions"),
    toast: $("toast"), help: $("help"), save: $("saveNotice")
  };
  let state;
  let activeTab = "work";
  let speed = 1;
  let paused = false;
  let timer = 0;
  let toastTimeout = null;
  let currentModal = "";
  let lastSavedTick = -1;
  let started = false;
  let drafts = {};
  let selectedCitizenId = null;
  function sdk(method, arg) {
    try {
      const fn = window.KidscadeGame?.[method];
      if (typeof fn === "function") return arg === undefined ? fn() : fn(arg);
    } catch (_) { /* 독립 실행 중에도 게임은 유지 */ }
    return null;
  }
  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE) || "null");
      return saved ? S.normalize(saved) : null;
    } catch (_) { return null; }
  }
  function save() {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(state));
      element.save.textContent = "자동 저장됨";
      lastSavedTick = state.tick;
    } catch (_) {
      element.save.textContent = "저장 실패 · 브라우저 저장 공간을 확인하세요";
    }
  }
  function start() {
    window.IslandArt?.mount($("islandCanvas"));
    const old = load();
    state = old || S.initial();
    started = true;
    sdk("start");
    if (!old) {
      element.help.classList.remove("hidden");
      paused = true;
    }
    render();
    restartTimer();
    window.addEventListener("pagehide", save);
    document.addEventListener("visibilitychange", () => { if (document.hidden) { paused = true; updateTimeButtons(); save(); } });
  }
  function restartTimer() {
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
      if (paused || state.pending || !element.help.classList.contains("hidden") || document.hidden) return;
      S.tick(state);
      if (state.tick % 3 === 0 || state.pending || state.stage === 2) save();
      render();
    }, speed === 2 ? 1250 : 2400);
  }
  function updateTimeButtons() {
    $("pauseBtn").textContent = paused ? "▶" : "⏸";
    $("pauseBtn").setAttribute("aria-label", paused ? "시간 계속" : "시간 일시정지");
    $("speedBtn").textContent = speed + "×";
    $("speedBtn").disabled = !!state.pending;
  }
  function toast(message) {
    element.toast.textContent = message;
    element.toast.classList.add("show");
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => element.toast.classList.remove("show"), 2800);
  }
  function renderStats() {
    const r = S.rates(state);
    const desc = [
      { key: "food", icon: "🍞", title: "식량", value: state.food, cap: state.foodCap, delta: r.food, low: 35 },
      { key: "wood", icon: "🪵", title: "물자", value: state.wood, cap: state.woodCap || 130, delta: r.wood - r.heating, low: 15 },
      { key: "trust", icon: "🤝", title: "신뢰", value: state.trust, cap: 100, delta: null, low: 40 }
    ];
    if (state.stage >= 2) desc.push({ key: "treasury", icon: "🪙", title: "국고", value: state.treasury, cap: 100, delta: r.treasury, low: 10 });
    else desc.push({ key: "treasury", icon: "🔒", title: "국고", locked: true });
    element.stats.innerHTML = desc.map(d => d.locked ?
      '<div class="stat locked"><div class="stat-head"><span>🔒 국고</span></div><div class="stat-track"><i style="width:0"></i></div><small>자치 마을에서 열려요.</small></div>' :
      '<div class="stat ' + (d.value <= d.low ? "warn" : "") + '"><div class="stat-head"><span>' + d.icon + " " + d.title + '</span><b>' + number(d.value) + '</b></div><div class="stat-track"><i style="width:' + Math.min(100, d.value / d.cap * 100) + '%"></i></div><small>' + (d.delta == null ? "시민들이 느끼는 신뢰" : (d.delta >= 0 ? "+" : "") + number(d.delta) + " / 주") + '</small></div>'
    ).join("");
  }

  function renderPolicyStatus() {
    const parts = [];
    if (state.laws.ration) {
      const pressure = Math.min(100, (state.pressure?.ration || 0) / 3.2 * 100);
      parts.push('<span class="issue-chip ' + (pressure >= 70 ? 'alert' : '') + '">🍞 배급 청원 ' + Math.round(pressure) + '%</span>');
    }
    if (state.laws.labor) {
      const fatigue = Math.min(100, (state.workStrain || 0) / 10 * 100);
      parts.push('<span class="issue-chip ' + (fatigue >= 50 ? 'alert' : '') + '">🛠️ 노동 피로 ' + Math.round(fatigue) + '%</span>');
    }
    const next = (state.pledges || []).filter(p => !p.fulfilled).sort((a,b) => a.due-b.due)[0];
    if (next) parts.push('<span class="issue-chip alert">📌 ' + escapeHTML(next.title) + ' · ' + Math.max(0, next.due - state.tick) + '주 남음</span>');
    for (const issue of S.rightsConcerns(state)) parts.push('<span class="issue-chip alert">⚠️ ' + escapeHTML(issue) + '</span>');
    if (state.laws.storage === "reserve") parts.push('<span class="issue-chip">📦 비상식량 ' + number(state.reserveFood || 0) + '/28</span>');
    if (state.boostUntil > state.tick) parts.push('<span class="issue-chip">⚒️ 집중 생산 · ' + (state.boostUntil - state.tick) + '주 남음</span>');
    if (state.laws.process === "delegate" && state.authorityUses)
      parts.push('<span class="issue-chip">🏛️ 위임 결정 ' + state.authorityUses + '회</span>');
    $("policyNotice").innerHTML = parts.length ? parts.join("") : '<span class="issue-chip">📘 규칙을 정하면 시민들의 요구와 후속 사건이 표시됩니다.</span>';
  }
  function consequenceBoard() {
    const latest = (state.decisions || []).slice(0, 3);
    const ongoing = (state.pledges || []).filter(p => !p.fulfilled);
    return '<div class="consequence-board"><strong>🔗 선택이 남긴 결과</strong>' +
      (ongoing.length ? ongoing.map(p => '<div class="pledge-line">📌 ' + escapeHTML(p.title) + ' · ' + Math.max(0, p.due - state.tick) + '주 남음</div>').join("") : '') +
      ((state.rightsHistory || []).length ? '<div class="decision-line"><small>권리와 복구 기록</small>' + (state.rightsHistory || []).slice(0, 3).map(h => escapeHTML(h.kind + " · " + h.status + " · " + h.detail)).join("<br>") + "</div>" : "") +
      (latest.length ? latest.map(d => '<div class="decision-line"><small>' + (d.tick + 1) + '번째 주</small>' + escapeHTML(d.title) + ' — ' + escapeHTML(d.detail) + '</div>').join("") :
        '<small>법률 제정이나 중요한 사건의 결과가 여기에 쌓여요.</small>') + '</div>';
  }

  function renderCrisis() {
    const active = S.winterActive(state);
    const forecast = state.nextWinterAt - state.tick;
    const rights = S.rightsConcerns(state);
    const known = active || state.winterEver || forecast <= 5 || rights.length || (state.rightsHistory || []).length;
    const zone = $("crisisStrip");
    if (!zone) return;
    if (!known) { zone.classList.add("hidden"); zone.innerHTML = ""; return; }
    zone.classList.remove("hidden");
    const season = active ? '❄️ ' + (state.winterCount || 1) + '번째 한파 · ' + (state.coldUntil - state.tick) + '주 남음' :
      '🌤️ 다음 한파까지 ' + Math.max(0, forecast) + '주';
    const meter = (icon, title, value, warning) =>
      '<div class="crisis-meter' + (value <= warning ? ' urgent' : '') + '">' +
      '<span>' + icon + ' ' + title + '</span><strong>' + number(value) + '</strong>' +
      '<i><b style="width:' + Math.max(0, Math.min(100, value)) + '%"></b></i></div>';
    zone.innerHTML = '<div class="crisis-head"><strong>' + season + '</strong>' +
      '<small>' + (active ? '난방 연료 ' + number(S.rates(state).heating) + '/주 필요' : '한파에는 생산이 줄고 난방에 목재가 필요해요.') + '</small></div>' +
      meter('🔥', '체온', state.warmth, 36) + meter('❤️', '건강', state.health, 48) +
      (state.eventsSeen.child_labor_debate || state.childWorkUntil > state.tick || (state.rightsHistory || []).some(h => h.kind === "어린이 위험 노동") ?
        meter('📚', '어린이 학습', state.education, 65) + meter('🧒', '어린이 건강', state.childWellbeing, 60) : '') +
      (rights.length ? '<div class="rights-alert">현재 권리 문제: ' + rights.map(escapeHTML).join(' · ') + '</div>' : '');
  }
  function renderVillage() {
    window.IslandArt?.setState(state);
    element.stage.textContent = state.stage === 1 ? "1단계 · 생존 공동체" : "2단계 · 자치 마을";
    element.name.textContent = state.stage === 1 ? "새싹섬 · 작은 야영지" : "새싹섬 · 자치 마을";
    element.population.textContent = "👥 " + state.population + " / " + S.capacity(state) + "명" + (state.stage === 1 && state.population >= S.capacity(state) ? " · 주거 부족" : "");
    element.clock.textContent = state.tick + 1 + "번째 주";
    element.scene.textContent = S.winterActive(state) ? "❄️ 거센 한파로 식량 생산이 줄고 난방 물자가 소모되고 있어요." : state.stage === 1 ? "식량을 확보하고 함께 지킬 규칙을 만드세요." : "국고를 관리하고 마을의 공공시설을 운영하세요.";
  }
  function renderMission() {
    if (state.stage === 1) {
      const done = [state.buildings.farm >= 1, state.population >= 18, state.passed.length >= 1];
      element.progress.textContent = done.filter(Boolean).length + "/3 완료";
      element.missionText.innerHTML = (done[0] ? "✅" : "⬜") + " 농장 1개　" + (done[1] ? "✅" : "⬜") + " 인구 18명　" + (done[2] ? "✅" : "⬜") + " 규칙 1개" + (state.population >= S.capacity(state) ? '<div class="mission-alert">⚠️ 주민이 더 늘어나려면 건설 탭에서 공동 주거지를 지으세요.</div>' : state.population >= S.capacity(state) - 1 ? '<div class="mission-alert">🏠 집이 거의 찼어요. 주민을 더 받으려면 공동 주거지가 필요해요.</div>' : !state.buildings.farm ? '<div class="mission-alert">🌾 먼저 건설 탭에서 농장 1개를 만들어 보세요.</div>' : '');
      element.missionBar.style.width = done.filter(Boolean).length / 3 * 100 + "%";
    } else {
      const done = [state.buildings.clinic >= 1, state.buildings.hall >= 1, state.passed.includes("tax")];
      element.progress.textContent = done.filter(Boolean).length + "/3 완료";
      element.missionText.innerHTML = (done[0] ? "✅" : "⬜") + " 진료소　" + (done[1] ? "✅" : "⬜") + " 마을 회관　" + (done[2] ? "✅" : "⬜") + " 세금 규칙";
      element.missionBar.style.width = done.filter(Boolean).length / 3 * 100 + "%";
    }
    element.ticker.textContent = state.log.length ? state.log[0].text : "먼저 일꾼을 배치하고 농장을 만들어 보세요.";
  }
  function workerRow(job, icon, name, amount, detail) {
    return '<div class="worker-card"><div class="worker-top"><div><strong>' + icon + " " + name + '</strong><small>' + detail + '</small></div><div class="job-step"><button class="smallbtn" data-job="' + job + '" data-delta="-1" ' + (state.jobs[job] <= 0 || !!state.pending ? "disabled" : "") + ' aria-label="' + name + ' 인원 줄이기">−</button><b>' + amount + '</b><button class="smallbtn" data-job="' + job + '" data-delta="1" ' + (S.unused(state) <= 0 || !!state.pending ? "disabled" : "") + ' aria-label="' + name + ' 인원 늘리기">+</button></div></div></div>';
  }
  function buildCard(id, b) {
    const owned = state.buildings[id], maxed = owned >= b.max;
    const cost = Object.entries(b.cost).map(([key, amount]) => (key === "wood" ? "🪵" : "🪙") + amount).join(" ");
    return '<div class="build-card"><div class="build-icon">' + b.icon + '</div><div class="build-copy"><strong>' + b.title + " (" + owned + "/" + b.max + ')</strong><small>' + b.desc + '</small><small>비용: ' + cost + '</small></div><button class="primary" data-build="' + id + '" ' + (!S.canBuild(state, id) || !!state.pending ? "disabled" : "") + ">" + (maxed ? "완료" : "건설") + "</button></div>";
  }
  function lawCard(id, law) {
    const active = S.getLaw(state, id);
    if (!drafts[id] || !law.options.some(o => o.id === drafts[id])) drafts[id] = active?.id || law.options[0].id;
    const mode = S.ruleProcedure(state, id, drafts[id]);
    const vote = mode === "vote" ? S.expectedVotes(state, id, drafts[id]) : null;
    const cooldown = vote && state.voteCooldownUntil > state.tick ? state.voteCooldownUntil - state.tick : 0;
    const forecast = vote ? '예상 찬성 ' + vote.yes + '/' + vote.total + '명' :
      (law.vote ? '위임된 권한으로 결정 · 정기 검토 대상' : '공동체 초기 권한으로 결정');
    const voterExamples = vote ? vote.members.filter(p => p.yes).slice(0, 1).map(p => p.name + '(' + p.topic + ')').concat(
      vote.members.filter(p => !p.yes).slice(0, 1).map(p => p.name + '(' + p.topic + ')')).join(' · ') : '';
    return '<div class="law-card"><h3>' + escapeHTML(law.title) + '</h3><small>' + escapeHTML(law.desc) + '</small><div class="current">' + (active ? "현재: " + escapeHTML(active.title) : "아직 제정하지 않았습니다.") + '</div>' +
      law.options.map(option => '<div class="law-option ' + (drafts[id] === option.id ? "selected" : "") +
      '"><label><input type="radio" name="law-' + id + '" data-law-option="' + id + '" value="' + option.id + '" ' +
      (drafts[id] === option.id ? "checked" : "") + '><span>' + escapeHTML(option.title) +
      '</span></label><p>' + escapeHTML(option.desc) + '</p>' +
      (drafts[id] === option.id ? '<div class="law-impact">' + escapeHTML(S.policyEffect(id, option.id) + (id === "storage" && state.laws.storage === "reserve" && option.id !== "reserve" ? " 현재 비상 창고를 폐쇄하면 넘치는 식량은 보관하지 못할 수 있습니다." : "")) + '</div>' : '') +
      "</div>").join("") +
      '<div class="actions"><span class="vote-note">' + escapeHTML(cooldown ? cooldown + '주 후 주민투표 가능' : forecast) +
      (voterExamples ? '<small class="vote-people">의견 예시: ' + escapeHTML(voterExamples) + '</small>' : '') +
      '</span><button class="primary" data-enact="' + id + '" ' +
      (active?.id === drafts[id] || !!state.pending || cooldown ? "disabled" : "") + ">" + (active ? "개정" : "제정") + "</button></div></div>";
  }

  function residentCard(person) {
    const v = S.residentView(state, person);
    const selected = person.id === selectedCitizenId;
    return '<button type="button" class="resident-row' + (selected ? ' picked' : '') + '" data-citizen="' + escapeHTML(person.id) + '" aria-pressed="' + selected + '">' +
      '<span class="resident-avatar">' + characterPortrait(person.name, true) + '</span>' +
      '<span class="resident-row-text"><strong>' + escapeHTML(person.name) + '</strong><small>' +
      escapeHTML(v.topic) + ' · ' + escapeHTML(person.experience) + '</small></span>' +
      '<span class="resident-status' + (v.mood === "걱정" ? ' anxious' : '') + '">' + escapeHTML(v.mood) + '</span></button>';
  }
  function renderResidents() {
    if (!state.citizens?.length) return '<h2>주민 명부</h2><p class="intro">등록된 주민이 없습니다.</p>';
    if (!selectedCitizenId || !state.citizens.some(p => p.id === selectedCitizenId))
      selectedCitizenId = state.citizens[0].id;
    const citizen = state.citizens.find(p => p.id === selectedCitizenId);
    const v = S.residentView(state, citizen);
    const pulse = S.communityPulse(state);

    return '<h2>우리 마을 주민</h2><p class="intro">주민마다 이전 경험과 중요하게 생각하는 일이 달라요. 자원과 규칙에 따라 생각도 바뀝니다.</p>' +
      '<div class="citizen-pulse"><span>👥 ' + state.citizens.length + '명</span><span>🌿 안정 ' + pulse.안정 + '명</span><span>💭 걱정 ' + pulse.걱정 + '명</span></div>' +
      '<div class="resident-detail"><div class="resident-detail-head">' + characterPortrait(citizen.name, true) +
      '<div><h3>' + escapeHTML(citizen.name) + (citizen.isChild ? ' <small class="child-label">어린 주민</small>' : '') + '</h3><small>' + escapeHTML(citizen.experience) + ' · 관심사: ' + escapeHTML(v.topic) + '</small><span class="resident-status' + (v.mood === "걱정" ? " anxious" : "") + '">' + escapeHTML(v.mood) + '</span></div></div>' +
      '<div class="resident-quote">“' + escapeHTML(v.thought) + '”<small>지금의 생각 · ' + escapeHTML(v.reason) + '</small></div>' +
      '<div class="resident-origin"><strong>' + (citizen.source === "founder" ? "🏝️ 처음 함께 온 주민" : "⛵ 합류 이야기 · " + (citizen.joinedWeek + 1) + "번째 주") + '</strong><p>' + escapeHTML(citizen.origin) + '</p></div></div>' +
      '<div class="panel-subhead">전체 주민 <span>선택해서 자세히 보기</span></div>' +
      '<div class="resident-list">' + state.citizens.map(residentCard).join("") + '</div>' +
      '<div class="locked-card">💡 이 의견은 주민의 관심사와 현재 마을 상태로 계산돼요. 실제 주민투표의 찬반과는 다를 수 있습니다.</div>';
  }

  function operationCards() {
    const actions = S.availableActions(state);
    if (!actions.length) return '<div class="locked-card">🔒 배급·노동·비축 규칙을 정하면 그 규칙에서만 가능한 운영 행동이 열려요.</div>';
    return '<div class="panel-subhead">규칙으로 열린 운영 행동 <span>선택에 따라 사용 가능</span></div>' +
      actions.map(a => '<div class="operation-card"><div class="operation-title">' + escapeHTML(a.icon) + ' ' + escapeHTML(a.label) +
      '</div><small>' + escapeHTML(a.description) + '</small><button class="secondary-btn" data-operation="' + escapeHTML(a.id) + '" ' +
      (!a.enabled ? 'disabled' : '') + '>' + (a.cooldown ? a.cooldown + '주 후 사용' : a.shortfall > 0 ? '자원 부족' : '실행') + '</button></div>').join('');
  }
  function renderPanel() {
    const p = element.panel, scroll = p.scrollTop;
    if (activeTab === "work") {
      const rates = S.rates(state);
      const urgent = S.winterActive(state) || S.rightsConcerns(state).length > 0 ||
        state.health < 55 || state.childWellbeing < 55;
      p.innerHTML = '<h2>일꾼 배치</h2><p class="intro">성인 일꾼을 식량과 물자 수집에 배치하세요. 어린이 ' +
        S.childCount(state) + '명은 기본 노동력에 포함되지 않습니다.</p>' +
        (urgent ? operationCards() : '') +
        '<div class="panel-subhead">배치하지 않은 성인 <span>' + S.unused(state) + "명</span></div>" +
        workerRow("gather", "🍞", "식량 채집", state.jobs.gather, "생산 " + number(rates.gather) + " / 주") +
        workerRow("wood", "🪵", "물자 수집", state.jobs.wood, "생산 " + number(rates.wood) + " / 주") +
        '<div class="locked-card">💡 식량 소비량: ' + number(rates.foodUse) +
        "/주 · 한파에는 생산이 줄고 난방 물자가 소모됩니다. 위기 때 운영 행동으로 대응할 수 있어요.</div>" +
        (urgent ? '' : operationCards());
    } else if (activeTab === "build") {
      p.innerHTML = '<h2>공동시설 건설</h2><p class="intro">자동 배치되는 시설을 지어 마을을 발전시키세요. 비용은 즉시 차감됩니다.</p>' +
        Object.entries(S.BUILDINGS).filter(([, b]) => b.stage <= state.stage).map(([id, b]) => buildCard(id, b)).join("") +
        (state.stage === 1 ? '<div class="locked-card">🔒 진료소와 마을 회관은 자치 마을에서 열려요.</div>' : "");
    } else if (activeTab === "law") {
      p.innerHTML = '<h2>마을의 규칙</h2><p class="intro">법률에 따라 열리는 사건·업무·투표 절차가 달라집니다. 현재 규칙과 후속 결과를 비교하며 개정할 수 있어요.</p>' + consequenceBoard() +
        Object.entries(S.LAWS).filter(([, law]) => law.stage <= state.stage).map(([id, law]) => lawCard(id, law)).join("") +
        (state.stage === 1 ? '<div class="locked-card">🔒 부담금·공공 지원·결정 절차는 자치 마을에서 열려요.</div>' : "");
    } else if (activeTab === "residents") {
      p.innerHTML = renderResidents();
    } else {
      p.innerHTML = '<h2>우리들의 기록</h2><p class="intro">주민의 합류 사연과 중요한 선택의 결과를 확인할 수 있어요. 합류할 때마다 별도의 확인 창은 뜨지 않아요.</p>' + consequenceBoard() +
        '<div class="panel-subhead">⛵ 주민 합류 기록 <span>최근 ' + (state.arrivalLog || []).length + '명</span></div>' +
        ((state.arrivalLog || []).length ? state.arrivalLog.map(item => '<div class="history-row"><small>' + (item.joinedWeek + 1) + '번째 주 · ' + escapeHTML(item.name) + '</small>' + escapeHTML(item.origin) + '</div>').join("") : '<div class="locked-card">아직 새로 합류한 주민이 없어요.</div>') +
        '<div class="panel-subhead">마을 활동 기록</div>' +
        (state.log.length ? state.log.map(item => '<div class="history-row"><small>' + (item.tick + 1) + '번째 주</small>' + escapeHTML(item.text) + '</div>').join("") : '<div class="locked-card">아직 기록이 없어요.</div>') +
        '<div class="locked-card">📚 다음 확장에서는 대표자 선출과 의회, 새로운 정치제도가 등장합니다.</div>';
    }
    p.scrollTop = scroll;
  }
  const NPC_ASSET = "../../assets/game/2d/characters/kenney-modular-characters/";
  function characterPortrait(name, compact = false) {
    const people = {
      "하나": { skin: 3, hair: "brown-1/brown1Woman1.png", shirt: "green/greenShirt1.png" },
      "태오": { skin: 5, hair: "black/blackMan1.png", shirt: "red/redShirt1.png" },
      "미래": { skin: 2, hair: "blonde/blondeWoman1.png", shirt: "blue/blueShirt1.png" }
    };
    const p = state?.citizens?.find(person => person.name === name)?.appearance || people[name] || people["하나"];
    return '<span class="npc-portrait' + (compact ? ' compact' : '') + '" aria-hidden="true">' +
      '<img class="npc-shirt" alt="" src="' + NPC_ASSET + 'shirts/' + p.shirt + '">' +
      '<img class="npc-head" alt="" src="' + NPC_ASSET + 'skin/tint-' + p.skin + '/tint' + p.skin + '_head.png">' +
      '<img class="npc-face" alt="" src="' + NPC_ASSET + 'face/completes/face1.png">' +
      '<img class="npc-hair" alt="" src="' + NPC_ASSET + 'hair/' + p.hair + '">' +
      '</span>' + (compact ? '' : '<span>' + escapeHTML(name) + '의 이야기</span>');
  }
  function renderEvent() {
    const id = state.pending;
    if (!id) {
      element.modal.classList.add("hidden");
      currentModal = "";
      return;
    }
    if (id === currentModal) return;
    const event = S.EVENTS.find(e => e.id === id);
    if (!event) { state.pending = null; return; }
    currentModal = id;
    element.modal.classList.remove("hidden");
    $("modalLabel").textContent = "공동체 사건";
    $("eventWeek").textContent = state.tick + 1 + "번째 주";
    $("speaker").innerHTML = characterPortrait(event.speaker);
    $("modalTitle").textContent = event.title;
    $("modalBody").textContent = typeof event.body === "function" ? event.body(state) : event.body;
    $("modalHint").textContent = "이 선택은 다음 자원 상태와 후속 사건을 바꿉니다. 피해가 발생하면 회복에는 시간이 필요합니다.";
    element.modalOptions.innerHTML = event.options.map((o, i) => {
      const afford = !o.cost || Object.entries(o.cost).every(([key, n]) => state[key] >= n);
      return '<button class="choice" data-event-option="' + i + '" ' + (afford ? "" : "disabled") + '><b>' + escapeHTML(o.label) + '</b><small>' + escapeHTML(o.note) + (afford ? "" : " · 자원이 부족합니다.") + "</small></button>";
    }).join("");
    sdk("sound", "click");
  }
  function render() {
    renderStats();
    renderCrisis();
    renderPolicyStatus();
    renderVillage();
    renderMission();
    renderPanel();
    renderEvent();
    updateTimeButtons();
    if (state.stage >= 2 && state.population >= 20 && state.passed.length >= 3 && !state.eventsSeen.milestone) {
      state.eventsSeen.milestone = true;
      sdk("score", state.score);
      toast("자치 마을의 주요 운영 목표를 달성했어요! 계속 성장시켜 보세요.");
      save();
    }
  }
  element.panel.addEventListener("click", e => {
    const resident = e.target.closest("[data-citizen]");
    if (resident) {
      selectedCitizenId = resident.dataset.citizen;
      renderPanel();
      element.panel.scrollTop = 0;
      return;
    }
    const job = e.target.closest("[data-job]");
    if (job) {
      if (S.assign(state, job.dataset.job, Number(job.dataset.delta))) { sdk("sound", "click"); save(); render(); }
      return;
    }
    const operation = e.target.closest("[data-operation]");
    if (operation) {
      const result = S.performAction(state, operation.dataset.operation);
      if (result.ok) { sdk("sound", "success"); toast(result.note); save(); render(); }
      else toast(result.reason);
      return;
    }
    const builder = e.target.closest("[data-build]");
    if (builder) {
      const id = builder.dataset.build;
      if (S.build(state, id)) { sdk("sound", "success"); toast(S.BUILDINGS[id].title + " 건설 완료"); save(); render(); }
      return;
    }
    const law = e.target.closest("[data-enact]");
    if (law) {
      const id = law.dataset.enact, result = S.enact(state, id, drafts[id]);
      if (result.ok) {
        sdk("sound", "success");
        toast(S.LAWS[id].title + (result.vote ? " · 주민투표 찬성 " + result.vote.yes + "/" + result.vote.total : "") + " · 적용됨");
      } else toast(result.reason);
      save(); render();
    }
  });
  element.panel.addEventListener("change", e => {
    const option = e.target.closest("[data-law-option]");
    if (!option) return;
    drafts[option.dataset.lawOption] = option.value;
    renderPanel();
  });
  element.modalOptions.addEventListener("click", e => {
    const choice = e.target.closest("[data-event-option]");
    if (!choice || choice.disabled) return;
    const result = S.resolveEvent(state, Number(choice.dataset.eventOption));
    if (result.ok) {
      sdk("sound", "success");
      toast(result.note || "시민들이 결정을 확인했습니다.");
      save(); render();
    } else toast(result.reason);
  });
  document.querySelectorAll("[data-tab]").forEach(b => b.addEventListener("click", () => {
    if (activeTab === b.dataset.tab) return;
    activeTab = b.dataset.tab;
    document.querySelectorAll("[data-tab]").forEach(x => {
      x.classList.toggle("active", x === b);
      x.setAttribute("aria-selected", String(x === b));
    });
    element.panel.scrollTop = 0;
    renderPanel();
  }));
  $("pauseBtn").addEventListener("click", () => {
    if (state.pending) return;
    paused = !paused;
    updateTimeButtons();
  });
  $("speedBtn").addEventListener("click", () => {
    if (state.pending) return;
    speed = speed === 1 ? 2 : 1;
    updateTimeButtons();
    restartTimer();
  });
  $("helpBtn").addEventListener("click", () => {
    paused = true;
    element.help.classList.remove("hidden");
    updateTimeButtons();
  });
  $("helpClose").addEventListener("click", () => {
    element.help.classList.add("hidden");
    paused = false;
    updateTimeButtons();
  });
  $("reportBtn").addEventListener("click", () => {
    paused = true;
    updateTimeButtons();
    let r = $("reportOverlay");
    if (!r) {
      r = document.createElement("div");
      r.id = "reportOverlay";
      r.className = "modal";
      r.innerHTML = '<div class="modal-backdrop" data-close-report="1"></div><div class="modal-card"><span class="eyebrow">공동체 보고서</span><h2>새싹섬의 기록</h2><div id="reportBody"></div><button class="primary" id="closeReport" type="button">계속 플레이</button></div>';
      document.body.appendChild(r);
      r.addEventListener("click", e => {
        if (e.target.closest("#closeReport,[data-close-report]")) { r.classList.add("hidden"); paused = false; updateTimeButtons(); }
      });
    }
    r.classList.remove("hidden");
    $("reportBody").innerHTML = '<div class="report-stats"><span>👥 주민 ' + state.population + '명</span><span>📜 규칙 ' + state.passed.length + '개</span><span>🏠 인구 수용 ' + S.capacity(state) + '명</span><span>🌱 ' + (state.stage === 1 ? "생존 공동체" : "자치 마을") + '</span></div><div class="report-list">' + state.log.slice(0, 8).map(i => '<div class="report-item">' + escapeHTML(i.text) + "</div>").join("") + '</div><p class="subtle">어떤 규칙이 어떤 시민들에게 영향을 주었을까요? 다음에는 다른 선택도 시도해 보세요.</p>';
  });
  $("resetBtn").addEventListener("click", () => {
    if (!window.confirm("마을을 처음부터 다시 시작할까요? 현재 기록을 덮어씁니다.")) return;
    state = S.initial();
    drafts = {};
    selectedCitizenId = null;
    currentModal = "";
    paused = false;
    save();
    render();
  });
  window.addEventListener("keydown", e => {
    if (e.key === "Escape" && !$("reportOverlay")?.classList.contains("hidden") && $("reportOverlay")) {
      $("closeReport").click();
    }
  });
  start();
})();

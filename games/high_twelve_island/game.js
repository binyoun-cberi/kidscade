(() => {
  "use strict";
  const S = window.IslandSim;
  const C = window.IslandCityCore;
  const CV = window.IslandCityView;
  if (!S) throw new Error("촌장 시뮬레이터 엔진을 불러오지 못했습니다.");
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
  const reportedAchievements = new Set();
  function reportAchievement(slot, detail = {}) {
    if (reportedAchievements.has(slot)) return;
    reportedAchievements.add(slot);
    sdk("achievement", "high_twelve_island." + slot);
    try { window.KidscadeGame?.milestone?.("achievement_" + slot, { uniqueKey:slot, ...detail }); } catch (_) {}
  }
  function checkAchievements() {
    if (!state) return;
    if ((state.passed?.length || 0) >= 1) reportAchievement("first_rule", { laws:state.passed.length });
    if (state.stage >= 2) reportAchievement("autonomous_village", { stage:state.stage, population:state.population });
    if ((state.arrivalLog?.length || 0) >= 5) reportAchievement("newcomers_5", { newcomers:state.arrivalLog.length });
    if (state.trust >= 90) reportAchievement("trust_90", { trust:state.trust });
    if (state.tick >= 30 && !(state.rightsHistory?.length) && !(S.rightsConcerns?.(state)?.length)) reportAchievement("rights_safe_30", { weeks:state.tick });
  }
  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE) || "null");
      if (!saved) return null;
      const normalized = S.normalize(saved);
      if (C && saved.city) normalized.city = C.normalize(saved.city);
      return normalized;
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
    if (C) C.ensureVillage(state);
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
      if (paused || state.pending || state.ended || !element.help.classList.contains("hidden") || document.hidden) return;
      const arrivalCount = state.arrivalLog?.length || 0;
      const activity = window.IslandArt?.getActivitySnapshot?.();
      if (activity) {
        state.activityFoodFactor = Number.isFinite(activity.foodPresence) ? activity.foodPresence : 1;
        state.activityWoodFactor = Number.isFinite(activity.woodPresence) ? activity.woodPresence : 1;
      }
      S.tick(state);
      if (C && state.city) C.tick(state.city, state);
      if (state.tick % 3 === 0 || state.pending || state.stage === 2 || (state.arrivalLog?.length || 0) !== arrivalCount) save();
      render();
    }, speed === 2 ? 1250 : 2400);
  }
  function updateTimeButtons() {
    $("pauseBtn").textContent = paused ? "▶" : "⏸";
    $("pauseBtn").setAttribute("aria-label", paused ? "시간 계속" : "시간 일시정지");
    $("speedBtn").textContent = speed + "×";
    $("speedBtn").disabled = !!state.pending || !!state.ended;
    $("pauseBtn").disabled = !!state.ended;
  }
  function toast(message) {
    element.toast.textContent = message;
    element.toast.classList.add("show");
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => element.toast.classList.remove("show"), 2800);
  }
  function renderStats() {
    const rates = S.rates(state);
    const capacity = Math.max(1, S.capacity(state));
    const woodCap = Math.max(1, state.woodCap || 130);
    const foodCap = Math.max(1, state.foodCap || 120);
    const foodDelta = rates.food;
    const woodDelta = rates.wood - rates.heating;

    const pips = (value, cap) => {
      const filled = Math.max(0, Math.min(5, Math.ceil((Math.max(0, value) / Math.max(1, cap)) * 5)));
      return Array.from({ length: 5 }, (_, i) => '<i class="' + (i < filled ? 'on' : '') + '"></i>').join('');
    };
    const resourceTone = (value, low, critical) => value <= critical ? ' danger' : value <= low ? ' warn' : '';
    const deltaText = value => (value >= 0 ? '+' : '') + number(value) + '/주';
    const statusButton = (key, icon, label, value, bars, note, tone, tab, aria) =>
      '<button type="button" class="stat hud-stat' + tone + '" data-stat-key="' + key +
      '" data-open-tab="' + tab + '" aria-label="' + escapeHTML(aria) + '">' +
      '<span class="hud-symbol" aria-hidden="true">' + icon + '</span>' +
      '<span class="hud-pips" aria-hidden="true">' + bars + '</span>' +
      '<span class="hud-copy"><small>' + label + '</small><b>' + escapeHTML(value) + '</b></span>' +
      '<span class="hud-note">' + escapeHTML(note) + '</span></button>';

    const housingLeft = capacity - state.population;
    const populationFill = pips(state.population, capacity);
    const populationTone = housingLeft < 0 ? ' danger' : housingLeft <= 1 ? ' warn' : '';
    const trustTone = resourceTone(state.trust, 45, 28);

    element.stats.innerHTML =
      statusButton('food', '🍞', '식량', number(state.food), pips(state.food, foodCap),
        deltaText(foodDelta), resourceTone(state.food, 35, 18), 'work',
        '식량 ' + number(state.food) + ', 주간 변화 ' + deltaText(foodDelta) + '. 자세히 보기') +
      statusButton('wood', '🪵', '물자', number(state.wood), pips(state.wood, woodCap),
        deltaText(woodDelta), resourceTone(state.wood, 18, 8), 'work',
        '물자 ' + number(state.wood) + ', 주간 변화 ' + deltaText(woodDelta) + '. 자세히 보기') +
      statusButton('population', '👥', '주민', state.population + '/' + capacity, populationFill,
        housingLeft >= 0 ? '자리 ' + housingLeft : '주거 부족', populationTone, 'residents',
        '주민 ' + state.population + '명, 수용 가능 ' + capacity + '명. 주민 보기') +
      statusButton('trust', '🤝', '신뢰', number(state.trust), pips(state.trust, 100),
        state.trust < 40 ? '불안' : state.trust < 65 ? '주의' : '안정', trustTone, 'law',
        '공동체 신뢰 ' + number(state.trust) + '. 규칙과 결과 보기');
  }
  function renderPolicyStatus() {
    const parts = [];
    if (state.ended) parts.push('<span class="issue-chip alert">공동체 운영 종료 · 기록을 확인하거나 처음부터 다시 시작하세요.</span>');
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
    for (const kind of S.activeDisasters(state))
      parts.push('<span class="issue-chip alert">' + escapeHTML(S.DISASTER_NAMES[kind]) +
        ' ' + (state.disasters[kind] - state.tick) + '주 남음</span>');
    for (const group of S.groupStatus(state)) if (group.action !== "협의 중")
      parts.push('<span class="issue-chip alert">📣 ' + escapeHTML(group.name + ' · ' + group.action) + '</span>');
    if (state.mandateRestrictedUntil > state.tick) parts.push('<span class="issue-chip alert">🏛️ 임시 운영 · ' +
      (state.mandateRestrictedUntil-state.tick) + '주 남음</span>');
    for (const issue of S.rightsConcerns(state)) parts.push('<span class="issue-chip alert">⚠️ ' + escapeHTML(issue) + '</span>');
    if (state.laws.storage === "reserve") parts.push('<span class="issue-chip">📦 비상식량 ' + number(state.reserveFood || 0) + '/28</span>');
    if (state.boostUntil > state.tick) parts.push('<span class="issue-chip">⚒️ 집중 생산 · ' + (state.boostUntil - state.tick) + '주 남음</span>');
    if (state.laws.process === "delegate" && state.authorityUses)
      parts.push('<span class="issue-chip">🏛️ 위임 결정 ' + state.authorityUses + '회</span>');
    const notice = $("policyNotice");
    notice.innerHTML = parts.join("");
    notice.classList.toggle("hidden", parts.length === 0);
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
    const winter = S.winterActive(state), ongoing = S.activeDisasters(state);
    const winterForecast = state.nextWinterAt - state.tick;
    const upcoming = Object.entries(state.nextDisasters || {}).filter(([,week]) => week > state.tick)
      .map(([kind,week]) => ({kind,remaining:week-state.tick})).sort((a,b)=>a.remaining-b.remaining)[0];
    const rights = S.rightsConcerns(state);
    const angry = S.groupStatus(state).filter(g => g.grievance >= 3 || g.action !== "협의 중");
    const known = winter || state.winterEver || winterForecast<=8 || state.winterPrepared != null ||
      ongoing.length || (upcoming && upcoming.remaining<=6) || Object.keys(state.disasterSeen||{}).length ||
      rights.length || (state.rightsHistory || []).length || angry.length;
    const zone = $("crisisStrip");
    if (!zone) return;
    if (!known) { zone.classList.add("hidden"); zone.innerHTML=""; return; }
    zone.classList.remove("hidden");

    const icons={heat:"☀️",flood:"🌊",dust:"🌫️",epidemic:"🦠"};
    const climate = ongoing.map(kind => icons[kind] + ' ' + S.DISASTER_NAMES[kind] +
      ' ' + (state.disasters[kind] - state.tick) + '주').join(' · ');
    const season = (winter ? '❄️ 한파 ' + (state.coldUntil-state.tick) + '주' :
      '❄️ 다음 한파 ' + Math.max(0,winterForecast) + '주') + (climate ? ' · ' + climate : '');
    const forecastText = upcoming?.remaining<=6 ? icons[upcoming.kind] + ' ' + S.DISASTER_NAMES[upcoming.kind] +
      ' 예상 ' + upcoming.remaining + '주 후' : '겹치는 재난에 대비하세요.';

    const pipBar = (value, max=100) => {
      const filled = Math.max(0, Math.min(5, Math.ceil((Math.max(0, value) / Math.max(1, max)) * 5)));
      return Array.from({length:5}, (_,i)=>'<i class="' + (i < filled ? 'on' : '') + '"></i>').join('');
    };
    const meter = (icon,title,value,warning,max=100) =>
      '<div class="crisis-indicator' + (value<=warning?' urgent':'') + '" title="' + escapeHTML(title + ' ' + number(value)) + '">' +
      '<span class="crisis-symbol" aria-hidden="true">' + icon + '</span>' +
      '<span class="crisis-pips" aria-hidden="true">' + pipBar(value,max) + '</span>' +
      '<span class="crisis-copy"><small>' + title + '</small><b>' + number(value) + (max===100?'':'/'+max) + '</b></span></div>';
    const sickMeter = () => {
      const ratio = state.sick / Math.max(1,state.population);
      return '<div class="crisis-indicator' + (ratio>=.28?' urgent':'') + '" title="감염자 ' + number(state.sick) + '명">' +
        '<span class="crisis-symbol" aria-hidden="true">🦠</span><span class="crisis-pips" aria-hidden="true">' +
        pipBar(state.sick, Math.max(1,state.population)) + '</span><span class="crisis-copy"><small>감염</small><b>' +
        number(state.sick) + '/' + state.population + '</b></span></div>';
    };

    zone.innerHTML='<div class="crisis-head"><strong>' + season + '</strong><small>' +
      (winter?'난방 물자 '+number(S.rates(state).heating)+'/주 · ':'') + forecastText + '</small></div>' +
      '<div class="crisis-icons">' +
      meter('🔥','체온',state.warmth,36) + meter('❤️','건강',state.health,48) +
      (state.tick>=24 || ongoing.length || state.water<55 ? meter('💧','식수',state.water,28) : '') +
      ((state.disasterSeen.dust || S.disasterActive(state,'dust') || state.air<80) ? meter('🌫️','공기',state.air,40) : '') +
      ((state.disasterSeen.epidemic || state.sick>0) ? sickMeter() : '') +
      ((state.eventsSeen.child_labor_debate || state.childWorkUntil>state.tick ||
        (state.rightsHistory||[]).some(h=>h.kind==='어린이 위험 노동')) ?
        meter('📚','학습',state.education,65) + meter('🧒','아동 건강',state.childWellbeing,60) : '') +
      '</div>' +
      (rights.length ? '<div class="rights-alert">⚠️ ' + rights.map(escapeHTML).join(' · ') + '</div>' : '') +
      (angry.length ? '<div class="rights-alert">📣 ' +
        angry.map(g=>escapeHTML(g.name+' · '+g.action)).join(' / ') + '</div>' : '');
  }
  function renderVillage() {
    window.IslandArt?.setState(state);
    const activeClimate = S.activeDisasters(state);
    document.body.classList.toggle("disaster-cold", S.winterActive(state));
    document.body.classList.toggle("disaster-heat", activeClimate.includes("heat"));
    document.body.classList.toggle("disaster-flood", activeClimate.includes("flood"));
    document.body.classList.toggle("disaster-dust", activeClimate.includes("dust"));
    document.body.classList.toggle("disaster-epidemic", activeClimate.includes("epidemic"));
    element.stage.textContent = state.stage === 1 ? "1단계 · 생존 공동체" : "2단계 · 자치 마을";
    element.name.textContent = state.stage === 1 ? "새싹섬 · 작은 야영지" : "새싹섬 · 자치 마을";
    element.population.textContent = "👥 " + state.population + " / " + S.capacity(state) + "명" + (state.stage === 1 && state.population >= S.capacity(state) ? " · 주거 부족" : "");
    element.clock.textContent = state.tick + 1 + "번째 주";
    const hazards = S.activeDisasters(state).map(kind=>S.DISASTER_NAMES[kind]);
    if(S.winterActive(state)) hazards.unshift("한파");
    element.scene.textContent = state.ended ?
      "공동체 운영이 종료됐어요. 기록을 확인하고 처음부터 다시 시작할 수 있어요." :
      hazards.length ? '⚠️ 현재 재난: ' + hazards.join(' · ') +
      '. 아래 상태를 확인해 대응하세요.' :
      state.stage===1 ? "식량을 확보하고 함께 지킬 규칙을 만드세요." :
      "국고를 관리하고 마을의 공공시설을 운영하세요.";
  }
  function renderMission() {
    if (state.ended) {
      element.progress.textContent = "운영 종료";
      element.missionText.textContent = "공동체 기록을 확인하고 '처음부터' 버튼으로 다시 도전할 수 있어요.";
      element.missionBar.style.width = "100%";
    } else if (state.stage === 1) {
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

    const groups = S.groupStatus(state).map(g=>'<div class="group-card' +
      (g.grievance>=3.8?' urgent':'') + '"><strong>' + escapeHTML(g.name) +
      '</strong><span>요구 누적 ' + number(g.grievance) + '/10</span><small>' +
      escapeHTML(g.action) + '</small></div>').join("");
    return '<h2>우리 마을 주민</h2><p class="intro">주민의 요구가 쌓이면 생산 중단·집단 항의·돌봄 중단 같은 행동으로 이어집니다.</p>' +
      '<div class="group-list">' + groups + '</div>' +
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
  function villageStatusBoard(rates) {
    const cap = S.capacity(state);
    const groups = S.groupStatus(state);
    const activeGroups = groups.filter(g => g.action !== "협의 중").length;
    const detail = (icon, label, value, note, tone = "") =>
      '<div class="detail-stat' + tone + '"><span aria-hidden="true">' + icon + '</span><div><small>' +
      escapeHTML(label) + '</small><strong>' + escapeHTML(value) + '</strong><em>' + escapeHTML(note) + '</em></div></div>';
    const netWood = rates.wood - rates.heating;
    let html = '<section class="village-status-board"><div class="panel-subhead">마을 현황 <span>정확한 수치</span></div><div class="detail-stat-grid">' +
      detail('🍞','식량',number(state.food) + ' / ' + number(state.foodCap), (rates.food>=0?'+':'') + number(rates.food) + '/주', state.food<20?' danger':state.food<35?' warn':'') +
      detail('🪵','물자',number(state.wood) + ' / ' + number(state.woodCap || 130), (netWood>=0?'+':'') + number(netWood) + '/주 · 난방 ' + number(rates.heating), state.wood<9?' danger':state.wood<18?' warn':'') +
      detail('👥','주민',state.population + ' / ' + cap + '명', '성인 ' + (state.population-S.childCount(state)) + ' · 어린이 ' + S.childCount(state), state.population>cap?' danger':state.population>=cap?' warn':'') +
      detail('🤝','신뢰',number(state.trust) + ' / 100', activeGroups ? '집단행동 ' + activeGroups + '건' : '현재 집단행동 없음', state.trust<28?' danger':state.trust<45?' warn':'') +
      detail('❤️','건강',number(state.health) + ' / 100', '감염 ' + number(state.sick) + '명', state.health<40?' danger':state.health<55?' warn':'') +
      detail('🔥','체온',number(state.warmth) + ' / 100', S.winterActive(state) ? '한파 진행 중' : '평상시', state.warmth<36?' danger':state.warmth<50?' warn':'') +
      detail('💧','식수',number(state.water) + ' / 100', (rates.water>=0?'+':'') + number(rates.water) + '/주', state.water<28?' danger':state.water<45?' warn':'') +
      detail('🌫️','공기 질',number(state.air) + ' / 100', S.disasterActive(state,'dust') ? '황사 영향 중' : '현재 상태', state.air<40?' danger':state.air<65?' warn':'');
    if (state.stage >= 2) {
      html += detail('🪙','국고',number(state.treasury), (rates.treasury>=0?'+':'') + number(rates.treasury) + '/주', state.treasury<10?' warn':'');
    }
    if (state.eventsSeen.child_labor_debate || state.childWorkUntil > state.tick || state.education < 85 || state.childWellbeing < 85) {
      html += detail('📚','어린이 학습',number(state.education) + ' / 100', '교육 상태', state.education<55?' danger':state.education<70?' warn':'') +
        detail('🧒','어린이 건강',number(state.childWellbeing) + ' / 100', '생활·노동 영향', state.childWellbeing<50?' danger':state.childWellbeing<65?' warn':'');
    }
    return html + '</div><p class="detail-hint">상단 아이콘은 빠른 상태 확인용이고, 정확한 변화량과 위기 수치는 이 운영 창에서 확인합니다.</p></section>';
  }

  function renderPanel() {
    const p = element.panel, scroll = p.scrollTop;
    if (activeTab === "work") {
      const rates = S.rates(state);
      const urgent = S.winterActive(state) || S.activeDisasters(state).length>0 ||
        S.groupStatus(state).some(g=>g.action!=="협의 중") || state.water < 50 ||
        S.rightsConcerns(state).length>0 || state.health<55 || state.childWellbeing<55;
      p.innerHTML = '<h2>마을 운영</h2><p class="intro">상단 아이콘은 빠르게 상태만 보여줍니다. 이곳에서 정확한 수치와 일꾼 배치를 함께 확인하세요.</p>' +
        villageStatusBoard(rates) +
        (urgent ? operationCards() : '') +
        '<div class="panel-subhead">배치하지 않은 성인 <span>' + S.unused(state) + "명</span></div>" +
        workerRow("gather", "🍞", "식량 채집", state.jobs.gather, "생산 " + number(rates.gather) + " / 주 · 현장 작업 " + Math.round((rates.activityFoodFactor || 1) * 100) + "%") +
        workerRow("wood", "🪵", "물자 수집", state.jobs.wood, "생산 " + number(rates.wood) + " / 주 · 현장 작업 " + Math.round((rates.activityWoodFactor || 1) * 100) + "%") +
        '<div class="locked-card">💡 식량 소비량: ' + number(rates.foodUse) +
        "/주 · 배치된 주민은 실제 작업 장소에 도착해야 최대 생산을 냅니다. 재난·대피·파업으로 작업지가 비면 생산도 줄어요.</div>" +
        (urgent ? '' : operationCards());
    } else if (activeTab === "city") {
      if (C && CV) {
        const city = C.ensureVillage(state);
        p.innerHTML = CV.panelHTML(city);
        CV.mount(p, city, state, () => save());
      } else {
        p.innerHTML = '<h2>🗺️ 도시계획</h2><div class="locked-card">도시 시뮬레이션 모듈을 불러오지 못했습니다.</div>';
      }
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
      window.IslandArt?.setPreview(null);
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
    $("modalHint").textContent = "선택지를 가리키면 섬에서 예상 변화를 볼 수 있어요. 어느 선택도 공짜가 아니며, 지금 얻는 것과 나중에 치를 대가가 다릅니다.";
    element.modalOptions.innerHTML = event.options.map((o, i) => {
      const afford = !o.cost || Object.entries(o.cost).every(([key, n]) => state[key] >= n);
      return '<button class="choice" data-event-option="' + i + '" ' + (afford ? "" : "disabled") + '><b>' + escapeHTML(o.label) + '</b><small>' + escapeHTML(o.note) + (afford ? "" : " · 자원이 부족합니다.") + "</small></button>";
    }).join("");
    sdk("sound", "click");
  }
  function render() {
    checkAchievements();
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
  function previewEventChoice(button) {
    if (!button || button.disabled) { window.IslandArt?.setPreview(null); return; }
    const event = S.EVENTS.find(item => item.id === state.pending);
    const picked = event?.options[Number(button.dataset.eventOption)];
    window.IslandArt?.setPreview(picked || null);
  }
  element.modalOptions.addEventListener("pointerover", e => {
    const button = e.target.closest("[data-event-option]");
    if (button && !button.contains(e.relatedTarget)) previewEventChoice(button);
  });
  element.modalOptions.addEventListener("pointerout", e => {
    const button = e.target.closest("[data-event-option]");
    if (button && !button.contains(e.relatedTarget)) window.IslandArt?.setPreview(null);
  });
  element.modalOptions.addEventListener("focusin", e => previewEventChoice(e.target.closest("[data-event-option]")));
  element.modalOptions.addEventListener("focusout", e => {
    if (e.target.closest("[data-event-option]")) window.IslandArt?.setPreview(null);
  });
  element.modalOptions.addEventListener("pointerdown", e => previewEventChoice(e.target.closest("[data-event-option]")));

  element.modalOptions.addEventListener("click", e => {
    const choice = e.target.closest("[data-event-option]");
    if (!choice || choice.disabled) return;
    const event = S.EVENTS.find(item => item.id === state.pending);
    const picked = event?.options[Number(choice.dataset.eventOption)];
    const highImpact = picked && (picked.startChildLabor || picked.continueChildLabor ||
      picked.startForcedLabor || picked.extendForcedLabor || picked.startExclusion || picked.extendExclusion);
    window.IslandArt?.setPreview(null);
    const result = S.resolveEvent(state, Number(choice.dataset.eventOption));
    if (result.ok) {
      sdk("sound", highImpact ? "click" : "success");
      window.IslandArt?.impactChoice(picked, picked?.label || event?.title || "결정");
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
    $("reportBody").innerHTML = '<div class="report-stats"><span>👥 주민 ' + state.population + '명</span><span>📜 규칙 ' + state.passed.length + '개</span><span>❄️ 겪은 한파 ' + (state.winterCount || 0) + '회</span><span>❤️ 건강 ' + number(state.health) + '</span>' +
      (state.eventsSeen.child_labor_debate ? '<span>📚 어린이 학습 ' + number(state.education) + '</span><span>🧒 어린이 건강 ' + number(state.childWellbeing) + '</span>' : '') +
      '</div>' + (state.rightsHistory?.length ?
        '<div class="report-list"><strong>권리 제한과 회복 기록</strong>' + state.rightsHistory.slice(0, 6).map(h => '<div class="report-item">' + escapeHTML(h.kind + ' · ' + h.status + ' — ' + h.detail) + '</div>').join("") + '</div>' : '') +
      '<div class="report-list"><strong>최근 마을 기록</strong>' + state.log.slice(0, 8).map(i => '<div class="report-item">' + escapeHTML(i.text) + "</div>").join("") +
      '</div><p class="subtle">어떤 결정을 통해 위기에 대응했고, 그 결과가 주민들의 생활에 어떻게 이어졌나요?</p>';
  });
  $("resetBtn").addEventListener("click", () => {
    if (!window.confirm("마을을 처음부터 다시 시작할까요? 현재 기록을 덮어씁니다.")) return;
    state = S.initial();
    if (C) C.ensureVillage(state);
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

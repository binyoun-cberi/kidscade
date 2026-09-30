/* 열두 명의 섬 — 독립적인 규칙 엔진 (브라우저/Node 공용). */
((root, factory) => {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.IslandSim = api;
})(typeof window !== "undefined" ? window : null, () => {
  "use strict";
  const VERSION = 1;
  const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Number.isFinite(n) ? n : lo));
  const BUILDINGS = Object.freeze({
    farm: { title: "작은 농장", icon: "🌾", cost: { wood: 18 }, stage: 1, max: 4, desc: "식량 생산량이 증가합니다." },
    hut: { title: "공동 주거지", icon: "🏠", cost: { wood: 16 }, stage: 1, max: 5, desc: "최대 인구가 6명 증가합니다." },
    store: { title: "공동 창고", icon: "📦", cost: { wood: 22 }, stage: 1, max: 2, desc: "식량 저장 한도가 45 증가합니다." },
    clinic: { title: "작은 진료소", icon: "🏥", cost: { wood: 12, treasury: 24 }, stage: 2, max: 1, desc: "운영비가 들지만 시민의 생활이 안정됩니다." },
    hall: { title: "마을 회관", icon: "🏛️", cost: { wood: 20, treasury: 22 }, stage: 2, max: 1, desc: "마을 회의와 의견 수렴에 사용됩니다." }
  });
  const LAWS = Object.freeze({
    ration: { title: "식량 배분 규칙", stage: 1, desc: "누가 식량을 얼마나 받는지 정합니다.", options: [
      { id: "equal", title: "균등 배급", desc: "모두에게 같은 양을 배급합니다.", foodUse: 1, trust: 1 },
      { id: "effort", title: "기본 배급과 노동 보상", desc: "기본량을 보장하고 노동에 추가로 배급합니다.", foodUse: 1.07, production: 1.07 },
      { id: "needs", title: "기본 배급과 추가 지원", desc: "기본량을 보장하고 도움이 필요한 사람에게 더 배급합니다.", foodUse: 1.10, trust: 1 }
    ] },
    labor: { title: "노동 운영 규칙", stage: 1, desc: "일하는 방식과 휴식의 균형을 정합니다.", options: [
      { id: "balanced", title: "일과 휴식 균형", desc: "현재의 노동시간을 유지합니다.", production: 1 },
      { id: "short", title: "짧은 근무시간", desc: "생산량은 줄지만 쉬는 시간이 늘어납니다.", production: .86, trust: 1 },
      { id: "extra", title: "추가 근무와 보상", desc: "노동 보상을 늘리고 생산량을 높입니다. 식량 소비가 증가합니다.", production: 1.12, foodUse: 1.07 }
    ] },
    storage: { title: "식량 비축 규칙", stage: 1, desc: "남는 식량을 어떻게 처리할지 정합니다.", options: [
      { id: "reserve", title: "비상식량 확보", desc: "식량 상한을 높이고 비축합니다.", cap: 35 },
      { id: "exchange", title: "남는 식량 교환", desc: "식량이 넉넉할 때 일부를 물자로 바꿉니다.", trade: true },
      { id: "share", title: "추가 배급", desc: "식량이 넉넉할 때 추가 배급합니다.", bonusTrust: true }
    ] },
    tax: { title: "공동 부담금", stage: 2, desc: "공공시설을 운영할 비용을 마련합니다.", vote: true, options: [
      { id: "low", title: "낮은 부담금", desc: "국고 수입이 적고 시민 부담도 적습니다.", rate: .16, support: .79 },
      { id: "medium", title: "보통 부담금", desc: "공공시설 운영을 위한 수입을 확보합니다.", rate: .29, support: .66 },
      { id: "high", title: "높은 부담금", desc: "국고 수입이 많지만 부담에 대한 이견이 커집니다.", rate: .43, support: .48 }
    ] },
    care: { title: "공공 지원 규칙", stage: 2, desc: "국고를 어디에 우선 사용할지 정합니다.", vote: true, options: [
      { id: "basic", title: "기본 지원", desc: "필수 서비스를 중심으로 운영합니다.", upkeep: .14, support: .78 },
      { id: "medical", title: "의료 우선 지원", desc: "진료소를 중심으로 운영 비용을 늘립니다.", upkeep: .28, support: .7 },
      { id: "housing", title: "주거 우선 지원", desc: "주거 지원을 늘리는 대신 운영 비용이 증가합니다.", upkeep: .25, support: .68 }
    ] },
    process: { title: "공동체 결정 절차", stage: 2, desc: "중요한 공동체 결정을 어떤 절차로 정할지 합의합니다.", vote: true, options: [
      { id: "meeting", title: "주민 공개회의", desc: "중요한 안건은 주민 회의에서 표결합니다.", support: .8 },
      { id: "delegate", title: "대표에게 위임", desc: "정해진 범위의 결정을 대표자에게 위임하고 정기적으로 검토합니다.", support: .72 },
      { id: "mixed", title: "안건별로 구분", desc: "일상적인 일은 대표가 맡고 중요한 규칙은 주민투표로 정합니다.", support: .76 }
    ] }
  });
  const LAW_KEYS = Object.keys(LAWS);

  // 주민은 직업이 아니라 개별적인 경험과 관심사로 의견을 갖는다.
  const FOUNDER_NAMES = ["하나", "태오", "미래", "소라", "준", "다온", "유나", "도윤", "아린", "지후", "나래", "현우"];
  const NEW_NAMES = ["세아", "윤서", "재민", "가온", "하람", "수아", "시온", "예린", "우진", "단비",
    "민서", "하린", "서우", "지안", "은호", "채원", "시우", "이든", "유림", "노아",
    "라온", "수현", "찬", "율", "봄", "서진", "도하", "희수", "이솔", "재이"];
  const PRIORITIES = ["food", "fairness", "work", "safety", "public"];
  const PRIORITY_TITLES = { food: "식량과 생활", fairness: "배분과 절차", work: "일과 보상", safety: "안전과 비축", public: "공동시설과 예산" };
  const SKILLS = ["농사 경험", "목공 경험", "요리 경험", "돌봄 경험", "도구 수리 경험", "낚시 경험", "기록 정리 경험", "항해 경험"];
  const ORIGINS = [
    "해변에서 작은 구조 신호를 발견하고 구명보트를 타고 도착했습니다.",
    "다른 작은 섬에서 뗏목을 만들어 건너왔습니다.",
    "낚시를 하다 항로를 잃고 해안을 따라 이곳에 도착했습니다.",
    "먼바다의 폭풍을 피해 작은 배를 타고 섬으로 들어왔습니다.",
    "가까운 해역의 지나가는 배에서 섬의 모닥불을 발견하고 내려왔습니다.",
    "먼 해변에서 표류하다 마을 주민들의 구조 신호를 보고 찾아왔습니다."
  ];
  function createCitizen(index, source = "founder", week = 0) {
    const name = source === "founder" ? FOUNDER_NAMES[index] :
      NEW_NAMES[(index - FOUNDER_NAMES.length) % NEW_NAMES.length];
    const id = "islander-" + (index + 1);
    const focus = index < 3 ? ["fairness", "work", "safety"][index] : PRIORITIES[(index * 7 + 1) % PRIORITIES.length];
    const experience = SKILLS[(index * 3 + 2) % SKILLS.length];
    const origin = source === "founder" ? "난파된 배에서 다른 생존자들과 함께 이 섬에 도착했습니다." :
      ORIGINS[(index * 5 + 2) % ORIGINS.length];
    const appearance = {
      skin: [3, 5, 2, 4, 1, 6, 3, 5, 2, 7, 4, 1][index % 12],
      hair: ["brown-1/brown1Woman1.png", "black/blackMan1.png", "blonde/blondeWoman1.png",
        "red/redMan1.png", "brown-2/brown2Woman1.png", "grey/greyMan1.png"][index % 6],
      shirt: ["green/greenShirt1.png", "red/redShirt1.png", "blue/blueShirt1.png"][index % 3]
    };
    return { id, name, focus, experience, origin, joinedWeek: week, source, appearance };
  }
  function ensureCitizens(s) {
    if (!Array.isArray(s.citizens)) s.citizens = [];
    s.citizens = s.citizens.filter(p => p && typeof p.name === "string" && p.id);
    while (s.citizens.length < s.population) {
      const n = s.citizens.length;
      const older = createCitizen(n, n < 12 ? "founder" : "arrival", n < 12 ? 0 : s.tick);
      if (n >= 12) older.origin = "이전 저장 기록에서 이어진 주민입니다. 당시의 합류 사연은 남아 있지 않습니다.";
      s.citizens.push(older);
    }
    if (s.citizens.length > s.population) s.citizens.length = s.population;
    if (!Array.isArray(s.arrivalLog)) s.arrivalLog = [];
    if (s.arrivalLog.length > 30) s.arrivalLog = s.arrivalLog.slice(0, 30);
  }
  function residentView(s, person) {
    const food = s.food, trust = s.trust, idle = Math.max(0, s.population - s.jobs.gather - s.jobs.wood);
    let mood = "안정", thought = "", reason = "";
    switch (person.focus) {
      case "food":
        if (food <= 35) { mood = "걱정"; thought = "다음 주에 먹을 식량이 충분할까요? 우선 먹을거리를 더 모으고 싶어요."; reason = "식량 부족"; }
        else if (food >= 85) { thought = "식량이 넉넉해졌네요. 일부는 다음 위기에 대비해 남겨 두면 좋겠어요."; reason = "넉넉한 식량"; }
        else { thought = "지금처럼 꾸준히 수확하면 좋겠어요. 인구가 늘어날 때 필요한 양도 살펴봐요."; reason = "식량 생산과 소비"; }
        break;
      case "fairness":
        if (trust <= 40) { mood = "걱정"; thought = "중요한 결정을 왜 내렸는지 우리에게도 알려 주면 좋겠어요."; reason = "낮은 공동체 신뢰"; }
        else if (!s.laws.ration) { thought = "먹을 것을 어떻게 나눌지 다 같이 납득할 수 있는 규칙이 필요해요."; reason = "배분 규칙 미제정"; }
        else if (s.laws.ration === "effort") { thought = "기본 배급은 유지하되 일하기 어려운 사람의 사정도 살펴보면 좋겠어요."; reason = "현재 식량 배급법"; }
        else if (s.laws.ration === "needs") { thought = "추가 지원이 필요한 사람을 정하는 기준을 모두에게 설명해 주세요."; reason = "현재 식량 배급법"; }
        else { thought = "모두에게 같은 양을 나누고 있군요. 각자의 사정도 계속 살펴봐야겠어요."; reason = "현재 식량 배급법"; }
        break;
      case "work":
        if (food <= 20) { mood = "걱정"; thought = "일손을 어디에 배치하면 먹을 것을 더 빨리 확보할 수 있을까요?"; reason = "식량 위기"; }
        else if (idle >= 4) { mood = "걱정"; thought = "일할 사람이 기다리고 있어요. 역할을 함께 정해 보면 좋겠어요."; reason = "배치되지 않은 주민"; }
        else if (s.laws.labor === "short") { thought = "쉬는 시간이 생긴 만큼 현재 인원으로 필요한 일을 마칠 수 있을지 살펴봐요."; reason = "노동 규칙"; }
        else if (s.laws.labor === "extra") { thought = "더 일한 사람에게 주기로 한 보상이 제대로 전달되는지 궁금해요."; reason = "노동 규칙"; }
        else { thought = "일한 만큼 어떤 역할을 맡는지 분명하면 서로 도울 수 있을 것 같아요."; reason = "일과 보상"; }
        break;
      case "safety":
        if (s.stormUntil > s.tick) { mood = "걱정"; thought = "폭풍이 지나갈 때까지 식량과 집을 안전하게 지켜야 해요."; reason = "진행 중인 폭풍"; }
        else if (food <= 35 || s.wood <= 20) { mood = "걱정"; thought = "비상시에 쓸 자원이 부족해 보여요. 미리 대비했으면 좋겠어요."; reason = "낮은 비축량"; }
        else if (!s.buildings.store) { thought = "공동 창고가 있으면 식량과 도구를 보관하기 편할 것 같아요."; reason = "창고 미건설"; }
        else { thought = "창고가 생겼으니 비상 물자가 얼마나 남았는지 정기적으로 확인해요."; reason = "안전과 비축"; }
        break;
      default:
        if (s.stage === 1) { thought = "마을이 커지면 모두 함께 사용할 시설도 필요해지겠죠?"; reason = "공동체 성장"; }
        else if (s.treasury <= 10) { mood = "걱정"; thought = "마을 운영비가 빠듯하군요. 지금 꼭 필요한 지출부터 의논해요."; reason = "낮은 국고"; }
        else if (!s.buildings.clinic) { thought = "공동기금이 생겼으니 진료소를 세울지도 논의해 보고 싶어요."; reason = "진료소 미건설"; }
        else { thought = "공공시설을 오래 운영할 수 있도록 비용과 혜택을 함께 살펴봐요."; reason = "공동시설 운영"; }
    }
    if (food <= 12 && person.focus !== "food" && person.focus !== "work") {
      mood = "걱정";
      thought = "지금은 먹을 것이 너무 부족해요. 우선 긴급한 식량 문제를 함께 해결하고 싶어요.";
      reason = "긴급 식량 위기";
    }
    return { mood, thought, reason, topic: PRIORITY_TITLES[person.focus] || "공동체" };
  }
  function communityPulse(s) {
    const result = { 걱정: 0, 안정: 0 };
    for (const citizen of s.citizens || []) result[residentView(s, citizen).mood]++;
    return result;
  }
  function initial(seed = 8429) {
    return {
      version: VERSION, seed: seed >>> 0, tick: 0, stage: 1, population: 12,
      food: 65, wood: 40, trust: 65, treasury: 0, foodCap: 100,
      jobs: { gather: 5, wood: 3 }, buildings: { farm: 0, hut: 0, store: 0, clinic: 0, hall: 0 },
      laws: {}, passed: [], eventsSeen: {}, eventsLast: {}, pending: null, cooldown: 0, log: [],
      citizens: FOUNDER_NAMES.map((_, index) => createCitizen(index)), arrivalLog: [], arrivalNotice: null,
      stormUntil: 0, lastBirth: 0, lastRelief: -99, score: 0
    };
  }
  function normalize(s) {
    if (!s || s.version !== VERSION || !s.jobs || !s.buildings || !s.laws) return initial();
    const d = initial(s.seed);
    Object.keys(d).forEach(k => { if (Object.prototype.hasOwnProperty.call(s, k)) d[k] = s[k]; });
    d.population = Math.round(clamp(d.population, 1, 99));
    d.food = clamp(d.food, 0, 200);
    d.wood = clamp(d.wood, 0, 999);
    d.trust = clamp(d.trust);
    d.treasury = clamp(d.treasury, 0, 9999);
    d.jobs = { gather: Math.max(0, Math.floor(d.jobs.gather || 0)), wood: Math.max(0, Math.floor(d.jobs.wood || 0)) };
    const workers = d.jobs.gather + d.jobs.wood;
    if (workers > d.population) {
      d.jobs.gather = Math.min(d.jobs.gather, d.population);
      d.jobs.wood = Math.max(0, d.population - d.jobs.gather);
    }
    ensureCitizens(d);
    d.pending = d.pending === "new_resident" && d.arrivalNotice ? d.pending : null;
    return d;
  }
  function random(s) {
    s.seed = (Math.imul(1664525, s.seed) + 1013904223) >>> 0;
    return s.seed / 4294967296;
  }
  function record(s, message) {
    s.log.unshift({ tick: s.tick, text: String(message) });
    if (s.log.length > 35) s.log.length = 35;
  }
  function capacity(s) { return 16 + s.buildings.hut * 6; }
  function unused(s) { return Math.max(0, s.population - s.jobs.gather - s.jobs.wood); }
  function getLaw(s, id) { return LAWS[id]?.options.find(x => x.id === s.laws[id]) || null; }
  function rates(s) {
    const ration = getLaw(s, "ration") || {};
    const labor = getLaw(s, "labor") || {};
    const tax = getLaw(s, "tax") || {};
    const care = getLaw(s, "care") || {};
    const production = (ration.production || 1) * (labor.production || 1) * (s.stormUntil > s.tick ? .7 : 1);
    const gather = s.jobs.gather * (.96 + s.buildings.farm * .23) * production;
    const cut = s.jobs.wood * .48 * production;
    const foodUse = s.population * .30 * (ration.foodUse || 1) * (labor.foodUse || 1);
    const taxIncome = s.stage >= 2 ? s.population * (tax.rate || .16) : 0;
    const serviceCost = s.stage >= 2 ? s.population * .105 + s.buildings.clinic * 1.10 + s.buildings.hall * .65 + (care.upkeep || 0) : 0;
    return { food: gather - foodUse, wood: cut, treasury: taxIncome - serviceCost, gather, foodUse };
  }
  function canBuild(s, id) {
    const b = BUILDINGS[id];
    if (!b || b.stage > s.stage || s.buildings[id] >= b.max) return false;
    return Object.entries(b.cost).every(([key, amount]) => s[key] >= amount);
  }
  function build(s, id) {
    if (s.pending || !canBuild(s, id)) return false;
    const b = BUILDINGS[id];
    Object.entries(b.cost).forEach(([key, amount]) => { s[key] -= amount; });
    s.buildings[id]++;
    s.foodCap = 100 + s.buildings.store * 45 + (s.laws.storage === "reserve" ? 35 : 0);
    record(s, b.title + "을(를) 만들었습니다.");
    return true;
  }
  function assign(s, job, delta) {
    if (s.pending || !["gather", "wood"].includes(job) || ![-1, 1].includes(delta)) return false;
    if (delta > 0 && unused(s) === 0) return false;
    if (delta < 0 && s.jobs[job] <= 0) return false;
    s.jobs[job] += delta;
    return true;
  }
  function expectedVotes(s, id, optionId) {
    const law = LAWS[id], option = law?.options.find(o => o.id === optionId);
    if (!law || !option) return null;
    const total = Math.min(12, s.population);
    let approval = option.support == null ? .7 : option.support;
    approval += (s.trust - 55) / 500;
    if (s.buildings.hall) approval += .035;
    const yes = Math.round(total * clamp(approval, .08, .92));
    return { yes, no: total - yes, total, passed: yes > total / 2 };
  }
  function enact(s, id, optionId) {
    const law = LAWS[id], option = law?.options.find(o => o.id === optionId);
    if (s.pending || !law || law.stage > s.stage || !option || s.laws[id] === optionId) return { ok: false, reason: "선택할 수 없는 규칙입니다." };
    if (law.vote) {
      const vote = expectedVotes(s, id, optionId);
      if (!vote.passed) {
        s.trust = clamp(s.trust - 2);
        record(s, option.title + " 제안이 주민투표에서 통과되지 않았습니다. (찬성 " + vote.yes + "/" + vote.total + ")");
        return { ok: false, vote, reason: "주민투표에서 통과되지 않았습니다." };
      }
    }
    const revised = Boolean(s.laws[id]);
    s.laws[id] = optionId;
    if (!s.passed.includes(id)) s.passed.push(id);
    s.trust = clamp(s.trust + (revised ? -2 : 2));
    s.foodCap = 100 + s.buildings.store * 45 + (s.laws.storage === "reserve" ? 35 : 0);
    record(s, option.title + " 규칙이 " + (revised ? "개정" : "제정") + "되었습니다.");
    return { ok: true, vote: law.vote ? expectedVotes(s, id, optionId) : null };
  }
  function effect(s, changes) {
    for (const [key, delta] of Object.entries(changes || {})) {
      if (["food", "wood", "trust", "treasury"].includes(key)) s[key] = clamp(s[key] + delta, 0, key === "trust" ? 100 : key === "food" ? s.foodCap : 9999);
    }
  }
  // 사건 선택지는 일회성 변화, 건설, 법률 또는 후속 사건 플래그로 이어진다.
  const EVENTS = [
    { id: "new_resident", priority: 120, when: () => false, title: "새로운 주민이 도착했습니다", speaker: "하나", body: "새로운 주민이 합류했습니다.", options: [
      { label: "새 주민의 이야기를 확인했어요.", note: "주민 탭에서 이 사람의 관심사와 생각을 확인할 수 있어요." }
    ] },
    { id: "first_rule", priority: 78, once: true, when: s => s.tick >= 3 && !s.laws.ration, title: "누가 식량을 얼마나 받을까요?", speaker: "하나", body: "모두가 먹을 식량을 모았습니다. 이제 함께 지킬 배분 규칙을 정해야 합니다.", options: [
      { label: "모두에게 같은 양을 나눠요.", law: ["ration", "equal"], note: "균등 배급 규칙을 제정합니다." },
      { label: "기본량에 일한 사람의 몫을 더해요.", law: ["ration", "effort"], note: "기본 배급과 노동 보상을 함께 적용합니다." },
      { label: "기본량에 도움이 필요한 사람을 더 지원해요.", law: ["ration", "needs"], note: "기본 배급과 추가 지원을 함께 적용합니다." }
    ] },
    { id: "shortage", priority: 87, repeat: 14, when: s => s.food <= 35 && s.food > 15, title: "식량이 부족해지고 있습니다", speaker: "미래", body: "이대로라면 식량이 더 줄어듭니다. 어떻게 대응할까요?", options: [
      { label: "모두 함께 먹을거리를 찾아요.", changes: { food: 14, trust: 1 }, cost: { wood: 4 }, note: "물자 4를 사용해 식량 14를 확보합니다." },
      { label: "각자 보관한 식량을 함께 모아요.", changes: { food: 9, trust: 2 }, note: "비상 식량을 모아 부족한 가구에 제공합니다." },
      { label: "당장 배급량을 줄여 비축해요.", changes: { food: 5, trust: -4 }, note: "단기적으로 식량을 아끼지만 시민들의 불만이 커집니다." }
    ] },
    { id: "emergency", priority: 110, repeat: 10, when: s => s.food <= 15, title: "창고에 식량이 거의 없습니다!", speaker: "하나", body: "생존을 위해 즉시 식량을 확보해야 합니다. 채집 인원을 늘리는 것도 잊지 마세요.", options: [
      { label: "다른 작업을 멈추고 긴급 채집해요.", cost: { wood: 6 }, changes: { food: 19 }, jobs: "gather", note: "물자를 사용하고 일꾼을 식량 생산으로 옮깁니다." },
      { label: "구호 물자를 교환해요.", cost: { treasury: 8 }, changes: { food: 25, trust: 1 }, note: "가용한 국고를 사용해 부족한 식량을 확보합니다." },
      { label: "해변에서 긴급 먹을거리를 찾아요.", changes: { food: 12, trust: -5 }, note: "긴급 채집으로 시간을 벌지만 여전히 생산 확대가 필요합니다." }
    ] },
    { id: "low_wood", priority: 84, repeat: 15, when: s => s.wood <= 14, title: "고칠 도구가 부족해요", speaker: "태오", body: "집과 농장을 고치기 위한 물자가 부족합니다.", options: [
      { label: "물자 수집에 일꾼을 더 배치해요.", jobs: "wood", changes: { wood: 4 }, note: "긴급 수집을 시작합니다." },
      { label: "남는 식량과 물자를 교환해요.", cost: { food: 12 }, changes: { wood: 14 }, note: "식량을 물자로 교환합니다." },
      { label: "사용하던 재료를 재활용해요.", changes: { wood: 8, trust: -1 }, note: "당장은 버틸 수 있지만 충분한 수집이 필요합니다." }
    ] },
    { id: "trust_warning", priority: 96, repeat: 18, when: s => s.trust <= 40 && s.trust > 20, title: "시민들이 공개회의를 요구합니다", speaker: "하나", body: "결정 이유를 알고 싶다는 시민들이 늘고 있습니다.", options: [
      { label: "공개회의에서 설명하고 의견을 들어요.", changes: { trust: 12 }, cost: { wood: 3 }, note: "회의 준비에 물자가 들지만 신뢰를 회복합니다." },
      { label: "이전의 약속과 결과를 공개해요.", changes: { trust: 7 }, note: "진행 상황을 시민들과 공유합니다." },
      { label: "당분간 기존 방침을 유지해요.", changes: { trust: -5 }, note: "정책이 유지되지만 추가 불만이 생길 수 있습니다." }
    ] },
    { id: "trust_crisis", priority: 108, repeat: 18, when: s => s.trust <= 20, title: "대표자의 권한을 다시 논의해요", speaker: "미래", body: "시민들이 운영방식을 재검토하고 새로운 약속을 원합니다.", options: [
      { label: "운영 방침을 다시 만들고 공개해요.", changes: { trust: 18, wood: -5 }, note: "운영 규칙을 검토하고 신뢰 회복을 시도합니다." },
      { label: "시민들의 의견을 모으는 회의를 열어요.", changes: { trust: 13, food: -5 }, note: "회의와 의견 수렴에 자원을 사용합니다." },
      { label: "현재 규칙을 유지하며 먼저 자원을 확보해요.", changes: { trust: 5, food: 6 }, note: "생활 여건 개선을 우선합니다." }
    ] },
    { id: "surplus", priority: 29, repeat: 45, when: s => s.food >= 85 && s.tick >= 9, title: "남는 식량을 어떻게 활용할까요?", speaker: "태오", body: "창고가 거의 가득 찼습니다. 다른 자원과 교환하거나 식량을 저장할 수 있습니다.", options: [
      { label: "다른 물자와 교환해요.", changes: { food: -18, wood: 12 }, note: "식량 18을 물자 12로 교환합니다." },
      { label: "모두에게 추가로 나눠요.", changes: { food: -14, trust: 5 }, note: "추가 배급으로 식량을 사용합니다." },
      { label: "다가올 위기에 대비해 보관해요.", changes: { trust: 1 }, note: "현재 식량을 유지합니다." }
    ] },
    { id: "first_home", priority: 38, once: true, when: s => s.population >= 15 && s.buildings.hut === 0, title: "새로 온 사람들은 어디에서 자나요?", speaker: "하나", body: "지금 집이 부족해지고 있습니다. 인구를 더 늘리려면 공동 주거지를 지어야 해요.", options: [
      { label: "주거지를 지을 계획을 세워요.", changes: { trust: 1 }, note: "건설 탭에서 공동 주거지를 지을 수 있습니다." },
      { label: "당장은 천막을 나눠 사용해요.", changes: { trust: -1, wood: 3 }, note: "기존 공간을 활용하며 추가 물자를 확보합니다." }
    ] },
    { id: "idle", priority: 35, repeat: 30, when: s => s.population >= 15 && unused(s) >= 5, title: "일할 수 있는 사람이 기다리고 있어요", speaker: "태오", body: "아직 맡은 일이 없는 주민들이 많습니다.", options: [
      { label: "식량 생산을 돕게 해요.", jobs: "gather", note: "남는 인원 중 일부를 채집에 배치합니다." },
      { label: "물자 수집을 돕게 해요.", jobs: "wood", note: "남는 인원 중 일부를 물자 수집에 배치합니다." }
    ] },
    { id: "growing", priority: 33, once: true, when: s => s.population >= 17 && s.stage === 1, title: "마을에 새로운 규칙이 필요합니다", speaker: "미래", body: "공동체가 커지면서 함께 사용하는 창고와 자원을 관리할 방법이 필요해졌습니다.", options: [
      { label: "기존 규칙부터 정리해요.", changes: { trust: 4 }, note: "법률 탭에서 규칙을 검토할 수 있습니다." },
      { label: "생산과 비축을 먼저 점검해요.", changes: { food: 6 }, note: "자원을 확보하며 다음 단계에 대비합니다." }
    ] },
    { id: "town_welcome", priority: 99, once: true, when: s => s.stage >= 2, title: "우리는 이제 자치 마을입니다!", speaker: "하나", body: "주민이 늘고 기본 규칙도 갖췄습니다. 이제 국고를 관리하고 공공시설을 운영합니다.", options: [
      { label: "새로운 마을 운영을 시작해요.", changes: { trust: 3, treasury: 8 }, note: "공동기금이 마련되고 세금 규칙이 개방됩니다." }
    ] },
    { id: "public_service", priority: 45, once: true, when: s => s.stage === 2 && s.treasury >= 24 && s.buildings.clinic === 0, title: "진료소를 마련하자는 제안", speaker: "하나", body: "마을의 공동기금으로 작은 진료소를 만들 수 있습니다.", options: [
      { label: "건설 비용을 살펴볼게요.", changes: { trust: 1 }, note: "건설 탭에서 진료소를 만들 수 있습니다." },
      { label: "지금은 다른 사업부터 살펴볼게요.", changes: { trust: -1 }, note: "진료소는 나중에도 지을 수 있습니다." }
    ] },
    { id: "low_budget", priority: 83, repeat: 26, when: s => s.stage === 2 && s.treasury <= 8, title: "마을 운영비가 부족해요", speaker: "미래", body: "공공시설을 운영하려면 국고 수입과 지출을 점검해야 합니다.", options: [
      { label: "운영 비용을 절약해요.", changes: { treasury: 10, trust: -2 }, note: "긴급 지출 조정으로 국고를 확보합니다." },
      { label: "시민들과 부담금 규칙을 논의해요.", changes: { treasury: 6, trust: 1 }, note: "법률 탭에서 세금을 검토할 수 있습니다." },
      { label: "가지고 있는 물자를 활용해요.", cost: { wood: 12 }, changes: { treasury: 12 }, note: "물자를 처분해 부족한 국고를 메웁니다." }
    ] },
    { id: "storm", priority: 76, repeat: 65, when: s => s.tick >= 19 && s.stormUntil === 0, randomChance: .035, title: "거센 폭풍이 다가옵니다", speaker: "태오", body: "다음 몇 차례 동안 채집과 수집이 어려워집니다. 지금 대비할까요?", options: [
      { label: "비축 물자를 사용해 시설을 보호해요.", cost: { wood: 9 }, changes: { trust: 3 }, storm: 3, note: "폭풍 피해를 완화합니다." },
      { label: "식량을 나누어 두고 버텨요.", changes: { food: -8, trust: 1 }, storm: 5, note: "폭풍 동안 생산량이 줄어듭니다." },
      { label: "당장 작업을 계속해요.", changes: { wood: 4, trust: -3 }, storm: 7, note: "물자를 얻지만 폭풍의 영향이 오래 지속됩니다." }
    ] },
    { id: "town_hall", priority: 30, once: true, when: s => s.stage === 2 && s.population >= 22 && !s.buildings.hall, title: "함께 이야기할 공간이 필요해요", speaker: "미래", body: "주민 수가 늘어 정기적으로 모일 장소가 필요하다는 제안이 나왔습니다.", options: [
      { label: "마을 회관을 지을 계획을 세워요.", changes: { trust: 2 }, note: "건설 탭에서 마을 회관을 만들 수 있습니다." },
      { label: "기존 광장을 계속 사용해요.", changes: { trust: 0 }, note: "새로운 시설 없이 운영합니다." }
    ] },
    { id: "review_law", priority: 25, repeat: 55, when: s => s.tick >= 22 && s.passed.length >= 2, title: "예전에 정한 규칙을 다시 살펴봐요", speaker: "하나", body: "생활이 달라졌습니다. 지금의 규칙이 여전히 적절한지 의견을 모아 보자는 제안입니다.", options: [
      { label: "법률 탭에서 검토할게요.", changes: { trust: 3 }, note: "필요하면 현재 규칙을 개정할 수 있습니다." },
      { label: "지금은 기존 규칙을 유지해요.", changes: { trust: 0 }, note: "기존 법률이 계속 적용됩니다." }
    ] }
  ];
  function allowedEvent(s, event) {
    if (!event.when(s)) return false;
    if (event.once && s.eventsSeen[event.id]) return false;
    if (event.repeat && s.eventsLast[event.id] != null && s.tick - s.eventsLast[event.id] < event.repeat) return false;
    return true;
  }
  function chooseEvent(s) {
    if (s.pending || s.cooldown > 0) return null;
    const possible = EVENTS.filter(e => allowedEvent(s, e) && (!e.randomChance || random(s) < e.randomChance))
      .sort((a, b) => b.priority - a.priority);
    return possible[0] || null;
  }
  function resolveEvent(s, index) {
    if (!s.pending) return { ok: false, reason: "진행 중인 사건이 없습니다." };
    const event = EVENTS.find(e => e.id === s.pending);
    const choice = event?.options[index];
    if (!choice) return { ok: false, reason: "선택지를 찾을 수 없습니다." };
    if (choice.cost && Object.entries(choice.cost).some(([k, v]) => s[k] < v)) return { ok: false, reason: "필요한 자원이 부족합니다." };
    if (choice.cost) Object.entries(choice.cost).forEach(([k, v]) => { s[k] -= v; });
    if (choice.law) {
      const previousPending = s.pending;
      s.pending = null;
      const r = enact(s, choice.law[0], choice.law[1]);
      s.pending = previousPending;
      if (!r.ok) return r;
    }
    effect(s, choice.changes);
    if (choice.jobs && unused(s) > 0) s.jobs[choice.jobs] += Math.min(3, unused(s));
    if (choice.jobs === "gather" && unused(s) === 0 && s.jobs.wood > 1) { s.jobs.wood--; s.jobs.gather++; }
    if (choice.storm) s.stormUntil = s.tick + choice.storm;
    if (event.id === "new_resident") s.arrivalNotice = null;
    s.eventsSeen[event.id] = true;
    s.eventsLast[event.id] = s.tick;
    s.pending = null;
    s.cooldown = 5;
    record(s, event.title + " — " + choice.label);
    return { ok: true, note: choice.note };
  }
  function tick(s) {
    if (s.pending) return s;
    s.tick++;
    if (s.stormUntil && s.tick >= s.stormUntil) s.stormUntil = 0;
    const r = rates(s);
    s.food = clamp(s.food + r.food, 0, s.foodCap);
    s.wood = clamp(s.wood + r.wood, 0, 999);
    if (s.stage >= 2) s.treasury = clamp(s.treasury + r.treasury, 0, 9999);
    if (s.laws.storage === "exchange" && s.food >= s.foodCap - 5) { s.food -= 8; s.wood += 5; }
    if (s.laws.storage === "share" && s.food >= s.foodCap - 5) { s.food -= 7; s.trust = clamp(s.trust + .32); }
    if (s.food < 15) s.trust = clamp(s.trust - .95);
    else if (s.food < 30) s.trust = clamp(s.trust - .40);
    else if (s.food > 55 && s.trust < 70) s.trust = clamp(s.trust + .10);
    if (s.treasury < 1 && s.stage >= 2 && (s.buildings.clinic || s.buildings.hall)) s.trust = clamp(s.trust - .24);
    if (s.buildings.clinic && s.treasury >= 1) s.trust = clamp(s.trust + .06);
    if (s.population < capacity(s) && s.food >= 53 && s.trust >= 42 && s.tick - s.lastBirth >= 7) {
      const newcomer = createCitizen(s.citizens.length, "arrival", s.tick);
      s.citizens.push(newcomer);
      s.population++;
      s.lastBirth = s.tick;
      s.arrivalNotice = { citizenId: newcomer.id, name: newcomer.name, origin: newcomer.origin, joinedWeek: s.tick };
      s.arrivalLog.unshift({ ...s.arrivalNotice });
      if (s.arrivalLog.length > 30) s.arrivalLog.length = 30;
      s.pending = "new_resident";
      record(s, newcomer.name + " 합류 — " + newcomer.origin + " 현재 " + s.population + "명.");
    }
    if (s.population > 2 && s.food < 1 && s.tick % 10 === 0) {
      s.population--;
      const leaving = s.citizens.pop();
      if (s.jobs.gather > s.population) s.jobs.gather = s.population;
      if (s.jobs.gather + s.jobs.wood > s.population) s.jobs.wood = Math.max(0, s.population - s.jobs.gather);
      record(s, "오랜 식량 부족으로 " + (leaving?.name || "주민 한 명") + "이(가) 섬을 떠났습니다.");
    }
    if (s.stage === 1 && s.population >= 18 && s.passed.length >= 1 && s.buildings.farm >= 1) {
      s.stage = 2;
      s.treasury = 20;
      record(s, "자치 마을로 발전했습니다. 국고와 새로운 규칙이 개방됩니다.");
    }
    if (s.cooldown > 0) s.cooldown--;
    const event = chooseEvent(s);
    if (event) { s.pending = event.id; record(s, "새로운 사건: " + event.title); }
    s.score = Math.max(s.score, Math.round(s.population * 10 + s.passed.length * 16 + s.buildings.farm * 8 + s.tick / 5));
    return s;
  }
  function relief(s) {
    if (s.pending || s.food > 10 || s.tick - s.lastRelief < 10) return false;
    s.food = clamp(s.food + 18, 0, s.foodCap);
    s.trust = clamp(s.trust - 5);
    s.lastRelief = s.tick;
    record(s, "긴급 채집으로 식량 18을 확보했습니다.");
    return true;
  }
  return Object.freeze({ VERSION, BUILDINGS, LAWS, EVENTS, LAW_KEYS, initial, normalize, capacity, unused, rates, canBuild, build, assign, getLaw, expectedVotes, enact, chooseEvent, resolveEvent, tick, relief, record, clamp, createCitizen, ensureCitizens, residentView, communityPulse, PRIORITY_TITLES });
});

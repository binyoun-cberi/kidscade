/* 촌장 시뮬레이터 — 독립적인 규칙 엔진 (브라우저/Node 공용). */
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
    store: { title: "공동 창고", icon: "📦", cost: { wood: 22 }, stage: 1, max: 2, desc: "식량 저장 한도 45, 물자 저장 한도 70이 증가합니다." },
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
    "라온", "수현", "찬", "율", "봄", "서진", "도하", "희수", "이솔", "재이",
    "하진", "성민", "나윤", "주원", "은채", "해솔"];
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
    return { id, name, focus, experience, origin, joinedWeek: week, source, appearance,
      isChild: source === "founder" && (index === 10 || index === 11) };
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
        if (s.pressure?.ration >= 2.5) { mood = "걱정"; thought = "지금의 배분법에 대한 청원이 늘고 있어요. 다른 주민들과 다시 논의하면 좋겠어요."; reason = "누적된 배급 관련 청원"; }
        else if (trust <= 40) { mood = "걱정"; thought = "중요한 결정을 왜 내렸는지 우리에게도 알려 주면 좋겠어요."; reason = "낮은 공동체 신뢰"; }
        else if (!s.laws.ration) { thought = "먹을 것을 어떻게 나눌지 다 같이 납득할 수 있는 규칙이 필요해요."; reason = "배분 규칙 미제정"; }
        else if (s.laws.ration === "effort") { thought = "기본 배급은 유지하되 일하기 어려운 사람의 사정도 살펴보면 좋겠어요."; reason = "현재 식량 배급법"; }
        else if (s.laws.ration === "needs") { thought = "추가 지원이 필요한 사람을 정하는 기준을 모두에게 설명해 주세요."; reason = "현재 식량 배급법"; }
        else { thought = "모두에게 같은 양을 나누고 있군요. 각자의 사정도 계속 살펴봐야겠어요."; reason = "현재 식량 배급법"; }
        break;
      case "work":
        if (s.workStrain >= 4) { mood = "걱정"; thought = "추가 근무가 오래 이어져 모두가 지쳤어요. 휴식과 근무 방법을 다시 의논해 주세요."; reason = "누적된 노동 피로"; }
        else if (food <= 20) { mood = "걱정"; thought = "일손을 어디에 배치하면 먹을 것을 더 빨리 확보할 수 있을까요?"; reason = "식량 위기"; }
        else if (idle >= 4) { mood = "걱정"; thought = "일할 사람이 기다리고 있어요. 역할을 함께 정해 보면 좋겠어요."; reason = "배치되지 않은 주민"; }
        else if (s.laws.labor === "short") { thought = "쉬는 시간이 생긴 만큼 현재 인원으로 필요한 일을 마칠 수 있을지 살펴봐요."; reason = "노동 규칙"; }
        else if (s.laws.labor === "extra") { thought = "더 일한 사람에게 주기로 한 보상이 제대로 전달되는지 궁금해요."; reason = "노동 규칙"; }
        else { thought = "일한 만큼 어떤 역할을 맡는지 분명하면 서로 도울 수 있을 것 같아요."; reason = "일과 보상"; }
        break;
      case "safety":
        if (s.stormAftermathAt && s.tick >= s.stormAftermathAt) { mood = "걱정"; thought = "폭풍이 지나갔어요. 실제 피해를 보고 비축 방식을 다시 점검하면 좋겠어요."; reason = "폭풍 이후 복구"; }
        else if (s.stormUntil > s.tick) { mood = "걱정"; thought = "폭풍이 지나갈 때까지 식량과 집을 안전하게 지켜야 해요."; reason = "진행 중인 폭풍"; }
        else if (food <= 35 || s.wood <= 20) { mood = "걱정"; thought = "비상시에 쓸 자원이 부족해 보여요. 미리 대비했으면 좋겠어요."; reason = "낮은 비축량"; }
        else if (!s.buildings.store) { thought = "공동 창고가 있으면 식량과 도구를 보관하기 편할 것 같아요."; reason = "창고 미건설"; }
        else { thought = "창고가 생겼으니 비상 물자가 얼마나 남았는지 정기적으로 확인해요."; reason = "안전과 비축"; }
        break;
      default:
        if (s.stage === 1) { thought = "마을이 커지면 모두 함께 사용할 시설도 필요해지겠죠?"; reason = "공동체 성장"; }
        else if (s.treasury <= 10) { mood = "걱정"; thought = "마을 운영비가 빠듯하군요. 지금 꼭 필요한 지출부터 의논해요."; reason = "낮은 국고"; }
        else if (!s.laws.tax) { thought = "함께 낼 부담금의 기준을 정하고, 어디에 쓸지 의논하고 싶어요."; reason = "공동 부담금 미제정"; }
        else if (s.laws.process === "delegate" && s.authorityUses >= 2) { mood = "걱정"; thought = "대표에게 맡긴 결정이 쌓였어요. 어떤 근거로 결정했는지 듣고 싶어요."; reason = "위임 권한의 검토"; }
        else if (!s.buildings.clinic) { thought = "공동기금이 생겼으니 진료소를 세울지도 논의해 보고 싶어요."; reason = "진료소 미건설"; }
        else if (s.laws.tax === "high") { thought = "부담금이 늘어난 만큼 예산을 어디에 썼는지 자세히 알고 싶어요."; reason = "현재 공동 부담금"; }
        else { thought = "공공시설을 오래 운영할 수 있도록 비용과 혜택을 함께 살펴봐요."; reason = "공동시설 운영"; }
    }
    if (person.isChild) {
      if (s.water < 10) {
      s.health = clamp(s.health - 1.35);
      s.childWellbeing = clamp(s.childWellbeing - .75);
    } else if (s.water < 22) {
      s.health = clamp(s.health - .45);
    }
    if (s.childWorkUntil > s.tick) { mood = "걱정"; thought = "오늘도 수업에 가지 못하고 위험한 채집 일을 해야 하나요? 너무 지쳐요."; reason = "위험한 어린이 노동"; }
      else if (s.education < 70) { mood = "걱정"; thought = "지난번 일을 하느라 공부를 많이 놓쳤어요. 다시 배울 시간을 갖고 싶어요."; reason = "학습 기회 감소"; }
      else if (winterActive(s)) { thought = "밖이 너무 추워요. 안전한 곳에서 친구들과 공부하고 싶어요."; reason = "겨울철 생활"; }
      else { thought = "마을이 안정되면 공부하고 친구들과 놀 수 있는 시간을 갖고 싶어요."; reason = "어린이의 생활"; }
    }
    if (s.forcedLaborUntil > s.tick && person.focus === "work") {
      mood = "걱정"; thought = "동의하지 않은 사람도 일을 해야 하나요? 몸이 좋지 않은 사람도 쉬지 못하고 있어요."; reason = "강제 노동";
    }
    if (s.exclusionUntil > s.tick && person.focus === "fairness") {
      mood = "걱정"; thought = "일부 주민은 식량을 받지 못하고 있어요. 그분들은 어떻게 살아가야 하나요?"; reason = "배급에서의 배제";
    }
    if (food <= 12 && person.focus !== "food" && person.focus !== "work" && !person.isChild) {
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
      food: 65, wood: 40, trust: 65, treasury: 0, foodCap: 100, woodCap: 130,
      jobs: { gather: 5, wood: 3 }, buildings: { farm: 0, hut: 0, store: 0, clinic: 0, hall: 0 },
      laws: {}, passed: [], eventsSeen: {}, eventsLast: {}, pending: null, cooldown: 0, log: [],
      citizens: FOUNDER_NAMES.map((_, index) => createCitizen(index)), arrivalLog: [], arrivalNotice: null, nextCitizenIndex: 12,
      stormUntil: 0, lastBirth: 0, lastRelief: -99, score: 0,
      pressure: { ration: 0, labor: 0 }, workStrain: 0,
      safeguards: { fairBonus: false, effortCare: false, needsAudit: false, workBreak: false },
      pledges: [], decisions: [], authorityUses: 0, voteCooldownUntil: 0,
      workReliefUntil: 0, stormAftermathAt: 0, stormAftermathChoice: null,
      reserveFood: 0, boostUntil: 0, actionCooldowns: {},
      // 화면 속 주민이 실제 작업지에 도착했는지를 생산량에 소폭 반영한다. 구버전/헤드리스에서는 1로 동작한다.
      activityFoodFactor: 1, activityWoodFactor: 1,
      // 한파와 인권 관련 상태는 실제 위기가 닥쳤을 때 HUD에 공개한다.
      warmth: 73, health: 85, education: 95, childWellbeing: 95,
      nextWinterAt: 16, coldUntil: 0, winterPrepared: null, winterEver: false, winterCount: 0,
      winterStartedAt: 0, winterWarnings: 0,
      childWorkUntil: 0, childWorkWeeks: 0, childLaborReviewed: false,
      forcedLaborUntil: 0, forcedLaborWeeks: 0, laborReviewed: false,
      exclusionUntil: 0, exclusionWeeks: 0, exclusionReviewed: false,
      rightsHistory: [], crisisHistory: [],
      // 여러 재난은 일수 대신 각 재난의 발동 조건·기간으로 관리한다.
      water: 74, air: 100, sick: 0, disasterSeen: {},
      disasters: { heat: 0, flood: 0, dust: 0, epidemic: 0 },
      disasterUnanswered: { heat: false, flood: false, dust: false, epidemic: false },
      nextDisasters: { heat: 32, flood: 45, dust: 59, epidemic: 75 },
      disasterCare: { heat: 0, dust: 0, epidemic: 0 }, floodDamageUntil: 0,
      // 주민 단체는 별도의 요구와 실제 행동을 갖는다.
      groups: { workers: 0, families: 0, carers: 0 },
      strikes: { workers: 0, families: 0, carers: 0 },
      arrivalsPausedUntil: 0, mandateRestrictedUntil: 0,
      disputeDelayUntil: 0, civicDebates: 0,
      collapseWeeks: 0, rescueCount: 0, ended: false
    };
  }
  function normalize(s) {
    if (!s || s.version !== VERSION || !s.jobs || !s.buildings || !s.laws) return initial();
    const d = initial(s.seed);
    Object.keys(d).forEach(k => { if (Object.prototype.hasOwnProperty.call(s, k)) d[k] = s[k]; });
    d.population = Math.round(clamp(d.population, 1, 99));
    d.food = clamp(d.food, 0, 200);
    d.wood = clamp(d.wood, 0, 999);
    d.woodCap = Math.max(130 + d.buildings.store * 70, s.woodCap || Math.ceil(d.wood / 10) * 10);
    if (s.nextWinterAt == null) d.nextWinterAt = Math.max(16, d.tick + 10);
    d.trust = clamp(d.trust);
    d.treasury = clamp(d.treasury, 0, 9999);
    d.jobs = { gather: Math.max(0, Math.floor(d.jobs.gather || 0)), wood: Math.max(0, Math.floor(d.jobs.wood || 0)) };
    ensureCitizens(d);
    d.citizens.forEach(p => { if (p.isChild == null) p.isChild = p.source === "founder" && ["나래", "현우"].includes(p.name); });
    const workers = d.jobs.gather + d.jobs.wood;
    if (workers > adultCapacity(d)) {
      d.jobs.gather = Math.min(d.jobs.gather, adultCapacity(d));
      d.jobs.wood = Math.max(0, adultCapacity(d) - d.jobs.gather);
    }
    d.nextCitizenIndex = Math.max(d.nextCitizenIndex || 12, d.citizens.length);
    d.pressure = { ration: clamp(d.pressure?.ration || 0, 0, 8), labor: clamp(d.pressure?.labor || 0, 0, 8) };
    d.workStrain = clamp(d.workStrain || 0, 0, 10);
    d.safeguards = { ...initial().safeguards, ...(d.safeguards || {}) };
    if (!Array.isArray(d.pledges)) d.pledges = [];
    if (!Array.isArray(d.decisions)) d.decisions = [];
    d.reserveFood = clamp(d.reserveFood || 0, 0, 28);
    d.activityFoodFactor = clamp(Number.isFinite(d.activityFoodFactor) ? d.activityFoodFactor : 1, .94, 1);
    d.activityWoodFactor = clamp(Number.isFinite(d.activityWoodFactor) ? d.activityWoodFactor : 1, .94, 1);
    d.warmth = clamp(d.warmth == null ? 73 : d.warmth);
    d.health = clamp(d.health == null ? 85 : d.health);
    d.education = clamp(d.education == null ? 95 : d.education);
    d.childWellbeing = clamp(d.childWellbeing == null ? 95 : d.childWellbeing);
    if (!Array.isArray(d.rightsHistory)) d.rightsHistory = [];
    if (!Array.isArray(d.crisisHistory)) d.crisisHistory = [];
    if (!d.actionCooldowns || typeof d.actionCooldowns !== "object") d.actionCooldowns = {};
    d.water = clamp(d.water == null ? 74 : d.water);
    d.air = clamp(d.air == null ? 100 : d.air);
    d.sick = clamp(d.sick || 0, 0, d.population);
    d.disasterSeen = d.disasterSeen && typeof d.disasterSeen === "object" ? d.disasterSeen : {};
    d.disasters = { ...initial().disasters, ...(d.disasters || {}) };
    d.disasterUnanswered = { ...initial().disasterUnanswered, ...(d.disasterUnanswered || {}) };
    d.disasterCare = { ...initial().disasterCare, ...(d.disasterCare || {}) };
    d.nextDisasters = { ...initial().nextDisasters, ...(d.nextDisasters || {}) };
    if (!s.nextDisasters) for (const [kind, delay] of Object.entries({ heat: 8, flood: 17, dust: 26, epidemic: 36 }))
      d.nextDisasters[kind] = d.tick + delay;
    d.groups = { ...initial().groups, ...(d.groups || {}) };
    d.strikes = { ...initial().strikes, ...(d.strikes || {}) };
    for (const key of Object.keys(d.groups)) d.groups[key] = clamp(d.groups[key], 0, 10);
    // 구버전 저장 중 주민 합류 창이 열려 있어도 플레이를 방해하지 않는다.
    d.pending = d.pending === "new_resident" ? null : (EVENTS.some(e => e.id === d.pending) ? d.pending : null);
    d.arrivalNotice = null;
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
  function capacity(s) { return 16 + s.buildings.hut * 6 + Math.max(0, Math.floor(s.city?.stats?.homes || 0)); }
  function childCount(s) { return (s.citizens || []).filter(p => p.isChild).length; }
  function adultCapacity(s) { return Math.max(0, s.population - childCount(s)); }
  function unused(s) { return Math.max(0, adultCapacity(s) - s.jobs.gather - s.jobs.wood); }
  function winterActive(s) { return s.coldUntil > s.tick; }
  const DISASTER_NAMES = { heat: "폭염", flood: "홍수", dust: "황사", epidemic: "전염병" };
  function disasterActive(s, kind) { return (s.disasters?.[kind] || 0) > s.tick; }
  function activeDisasters(s) { return Object.keys(DISASTER_NAMES).filter(kind => disasterActive(s, kind)); }
  function groupStatus(s) {
    const g = s.groups || {};
    return Object.keys(g).map(kind => ({
      kind, name: ({workers:"노동 주민",families:"가족",carers:"돌봄 주민"})[kind],
      grievance: Number(g[kind].toFixed(1)),
      action: (s.strikes?.[kind] || 0) > s.tick ? ({workers:"작업 중단",families:"집단 항의·합류 중단",carers:"돌봄 서비스 중단"})[kind] : "협의 중"
    }));
  }
  function rightsConcerns(s) { return [s.childWorkUntil > s.tick ? "어린이 위험 노동" : null,
    s.forcedLaborUntil > s.tick ? "강제 노동" : null,
    s.exclusionUntil > s.tick ? "일부 주민 배급 제외" : null].filter(Boolean); }
  function getLaw(s, id) { return LAWS[id]?.options.find(x => x.id === s.laws[id]) || null; }
  function rates(s) {
    const ration = getLaw(s, "ration") || {};
    const labor = getLaw(s, "labor") || {};
    const tax = getLaw(s, "tax") || {};
    const care = getLaw(s, "care") || {};
    const fatigue = 1 - Math.min(.33, (s.workStrain || 0) * .032);
    const effortAdapt = s.laws.ration === "effort" && s.safeguards?.effortCare ? .955 : 1;
    const shortRest = s.workReliefUntil > s.tick ? .75 : 1;
    const coldFactor = winterActive(s) ? Math.max(.52, .68 - Math.max(0, (s.winterCount || 1) - 1) * .05) : 1;
    const illnessFactor = (s.health <= 10 ? .25 : s.health < 25 ? .42 : s.health < 45 ? .68 : s.health < 65 ? .88 : 1) *
      (s.sick >= 6 ? .73 : s.sick >= 3 ? .87 : 1);
    const focusedWork = s.laws.ration === "effort" && s.boostUntil > s.tick ? 1.23 : 1;
    const climateFactor = (disasterActive(s,"heat") ? (s.disasterCare?.heat > s.tick ? .88 : .73) : 1) *
      (disasterActive(s,"dust") ? (s.disasterCare?.dust > s.tick ? .94 : .81) : 1) *
      (disasterActive(s,"flood") ? .82 : 1) *
      (s.floodDamageUntil > s.tick ? .80 : 1);
    const strikeFactor = (s.strikes?.workers || 0) > s.tick ? .53 : 1;
    const production = (ration.production || 1) * (labor.production || 1) * (s.stormUntil > s.tick ? .7 : 1) *
      fatigue * effortAdapt * shortRest * focusedWork * coldFactor * illnessFactor * climateFactor * strikeFactor;
    const activityFoodFactor = clamp(Number.isFinite(s.activityFoodFactor) ? s.activityFoodFactor : 1, .94, 1);
    const activityWoodFactor = clamp(Number.isFinite(s.activityWoodFactor) ? s.activityWoodFactor : 1, .94, 1);
    const gather = s.jobs.gather * (.96 + s.buildings.farm * .23) * production * activityFoodFactor +
      (s.childWorkUntil > s.tick && s.childWellbeing > 25 ? Math.min(2, childCount(s)) * 1.25 : 0);
    const cut = s.jobs.wood * .48 * production * activityWoodFactor + (s.forcedLaborUntil > s.tick ? 2.8 : 0);
    const extras = (s.safeguards?.fairBonus ? .045 : 0) + (s.safeguards?.effortCare ? .055 : 0) + (s.safeguards?.workBreak ? .025 : 0);
    const foodUse = Math.max(0, s.population * .36 * ((ration.foodUse || 1) * (labor.foodUse || 1) + extras) *
      (winterActive(s) ? 1.13 : 1) * (disasterActive(s,"heat") ? 1.10 : 1) -
      (s.exclusionUntil > s.tick ? 2.15 : 0));
    const taxIncome = s.stage >= 2 ? s.population * (tax.rate || .16) : 0;
    const serviceCost = s.stage >= 2 ? s.population * .105 + s.buildings.clinic * 1.10 + s.buildings.hall * .65 + (care.upkeep || 0) + (s.safeguards?.needsAudit ? .22 : 0) : 0;
    const administration = s.laws.ration === "needs" ? (s.safeguards?.needsAudit ? .26 : .15) : 0;
    const waterUse = s.population * .155 + (disasterActive(s,"heat") ? 2.65 : 0) +
      (disasterActive(s,"epidemic") ? .6 : 0);
    const waterGain = disasterActive(s,"flood") ? .1 : 2.55;
    const careCost = disasterActive(s,"epidemic") && s.disasterCare?.epidemic > s.tick && s.stage >= 2 ? .75 : 0;
    return { food: gather - foodUse, wood: cut - administration, treasury: taxIncome - serviceCost - careCost,
      water: waterGain - waterUse, gather, foodUse, fatigue, activityFoodFactor, activityWoodFactor,
      heating: winterActive(s) ? (s.winterPrepared === 2 ? 2.15 : 3.25) + Math.min(1.6, Math.max(0, (s.winterCount || 1) - 1) * .55) : 0 };
  }
  function canBuild(s, id) {
    const b = BUILDINGS[id];
    if (!b || b.stage > s.stage || s.ended || s.buildings[id] >= b.max || s.mandateRestrictedUntil > s.tick) return false;
    return Object.entries(b.cost).every(([key, amount]) => s[key] >= amount);
  }
  function build(s, id) {
    if (s.pending || !canBuild(s, id)) return false;
    const b = BUILDINGS[id];
    Object.entries(b.cost).forEach(([key, amount]) => { s[key] -= amount; });
    s.buildings[id]++;
    s.foodCap = 100 + s.buildings.store * 45 + (s.laws.storage === "reserve" ? 35 : 0);
    s.woodCap = Math.max(s.woodCap, 130 + s.buildings.store * 70);
    record(s, b.title + "을(를) 만들었습니다.");
    return true;
  }
  function assign(s, job, delta) {
    if (s.pending || s.ended || !["gather", "wood"].includes(job) || ![-1, 1].includes(delta)) return false;
    if (delta > 0 && unused(s) === 0) return false;
    if (delta < 0 && s.jobs[job] <= 0) return false;
    s.jobs[job] += delta;
    return true;
  }

  const BRANCH_EFFECTS = {
    ration: {
      equal: "모두에게 일정량을 배급합니다. 식량 소비를 예측하기 쉽지만 노동 보상이나 개인별 필요를 둘러싼 청원이 나올 수 있습니다.",
      effort: "추가 배급으로 생산이 증가하지만 식량 소비도 늘어납니다. 노동에 참여하기 어려운 주민을 위한 예외 규정이 쟁점이 됩니다.",
      needs: "필요에 따른 추가 지원으로 배급량과 관리 물자가 소모됩니다. 지원 기준을 확인하고 설명하는 절차가 필요합니다."
    },
    labor: {
      balanced: "기본 생산량을 유지하며 누적 피로를 완화합니다.",
      short: "생산량이 감소하지만 누적 피로가 빠르게 회복됩니다.",
      extra: "단기 생산량이 늘지만 피로가 누적됩니다. 피로가 높으면 실제 생산량이 다시 떨어지고 노동 관련 청원이 발생합니다."
    },
    storage: {
      reserve: "비축 공간이 35 증가합니다. 식량이 넉넉하면 매주 최대 1.5씩 비상식량을 별도로 적립하고, 부족할 때 직접 꺼내 쓸 수 있습니다. 폭풍 피해도 줄어듭니다.",
      exchange: "저장 공간이 거의 가득 차면 식량을 물자로 교환합니다. 폭풍 이후 비축 식량이 부족할 수 있습니다.",
      share: "잉여 식량을 추가 배급해 신뢰를 쌓습니다. 폭풍이 지나간 뒤 사용할 비축량이 적어질 수 있습니다."
    },
    tax: {
      low: "국고 수입이 적어 공공시설의 유지비를 더 신중하게 조달해야 합니다.",
      medium: "국고 수입과 주민의 부담이 함께 달라집니다. 주민들의 우선순위에 따라 투표 결과가 달라집니다.",
      high: "국고 수입이 늘어납니다. 지출 내역 공개와 주민 부담에 대한 청원이 이어질 수 있습니다."
    },
    care: {
      basic: "기본적인 운영비를 사용하고 현재 시설을 유지합니다.",
      medical: "의료 서비스에 예산을 우선 투입합니다. 진료소가 있으면 신뢰 회복에 도움이 됩니다.",
      housing: "주거 지원에 예산을 사용합니다. 인구 수용 여유가 없을 때 합류를 돕습니다."
    },
    process: {
      meeting: "공동 부담금과 공공 지원의 변경을 주민투표로 결정합니다. 표결 후 다음 안건까지 준비 기간이 필요합니다.",
      delegate: "대표가 공공 지원 범위에서 집행 방침을 직접 결정합니다. 일정한 결정이 쌓이면 권한 검토가 요구됩니다. 세금 변경에는 투표가 필요합니다.",
      mixed: "일상적 공공 지원은 위임하되 큰 지출과 공동 부담금에는 주민투표를 실시합니다."
    }
  };
  function policyEffect(id, optionId) { return BRANCH_EFFECTS[id]?.[optionId] || ""; }
  function ruleProcedure(s, id, optionId) {
    const law = LAWS[id];
    if (!law?.vote) return "direct";
    if (id === "process" || id === "tax") return "vote";
    if (id !== "care") return "vote";
    if (s.laws.process === "delegate") return "direct";
    if (s.laws.process === "mixed" && optionId !== "medical") return "direct";
    return "vote";
  }
  function recordDecision(s, title, detail) {
    if (!Array.isArray(s.decisions)) s.decisions = [];
    s.decisions.unshift({ tick: s.tick, title, detail });
    if (s.decisions.length > 36) s.decisions.length = 36;
  }
  function settlePledges(s, id) {
    for (const pledge of s.pledges || []) {
      if (pledge.kind !== id) continue;
      pledge.fulfilled = true;
      record(s, "주민들과 한 " + pledge.title + " 약속을 지켰습니다.");
      s.trust = clamp(s.trust + 3);
    }
    s.pledges = (s.pledges || []).filter(p => !p.fulfilled);
  }
  function applySafeguard(s, key) {
    const branch = { fairBonus: "equal", effortCare: "effort", needsAudit: "needs", workBreak: "extra" };
    if (!Object.hasOwn(branch, key)) return false;
    if (key === "workBreak" ? s.laws.labor !== branch[key] : s.laws.ration !== branch[key]) return false;
    if (s.safeguards[key]) return false;
    s.safeguards[key] = true;
    if (key === "workBreak") s.workStrain = clamp(s.workStrain - 3, 0, 10);
    else s.pressure.ration = clamp(s.pressure.ration - 2.4, 0, 8);
    settlePledges(s, key === "workBreak" ? "labor" : "ration");
    return true;
  }
  function advanceConsequences(s) {
    if (s.laws.labor === "extra") {
      s.workStrain = clamp(s.workStrain + (s.food < 45 ? .58 : .27) - (s.safeguards.workBreak ? .37 : 0), 0, 10);
    } else s.workStrain = clamp(s.workStrain - (s.laws.labor === "short" ? .8 : .46), 0, 10);
    const active = s.laws.ration;
    if (active === "equal") {
      const busy = s.jobs.gather + s.jobs.wood >= s.population * .72;
      s.pressure.ration = clamp(s.pressure.ration + (busy && s.laws.labor === "extra" ? .32 : .12) - (s.safeguards.fairBonus ? .24 : 0), 0, 8);
    } else if (active === "effort") {
      s.pressure.ration = clamp(s.pressure.ration + (s.food < 58 || unused(s) >= 3 ? .36 : .22) - (s.safeguards.effortCare ? .33 : 0), 0, 8);
    } else if (active === "needs") {
      s.pressure.ration = clamp(s.pressure.ration + (s.wood < 25 || (s.stage >= 2 && s.treasury < 10) ? .35 : .18) - (s.safeguards.needsAudit ? .3 : 0), 0, 8);
    } else s.pressure.ration = clamp(s.pressure.ration - .12, 0, 8);
    if (s.laws.ration === "effort" && s.boostUntil > s.tick) { s.workStrain = clamp(s.workStrain + .35, 0, 10); s.pressure.ration = clamp(s.pressure.ration + .13, 0, 8); }
    if (s.laws.labor === "extra") s.pressure.labor = clamp(s.pressure.labor + (s.workStrain >= 3 ? .42 : .16) - (s.safeguards.workBreak ? .35 : 0), 0, 8);
    else s.pressure.labor = clamp(s.pressure.labor - .3, 0, 8);
    if (s.safeguards.needsAudit && s.wood < .3 && s.tick % 6 === 0) {
      s.trust = clamp(s.trust - .4);
    }
    if (s.laws.ration === "needs" && s.food > 36 && s.wood >= .2) s.trust = clamp(s.trust + .06);
    if (s.laws.ration === "equal" && s.food > 46 && s.trust < 67) s.trust = clamp(s.trust + .035);
    if (s.laws.labor === "short" && s.workStrain < 2 && s.trust < 70) s.trust = clamp(s.trust + .025);
    if (s.laws.care === "medical" && s.buildings.clinic && s.treasury > 1) s.trust = clamp(s.trust + .06);
    if (s.laws.care === "housing" && s.population >= capacity(s) - 1 && s.treasury > 1 && s.trust < 65) s.trust = clamp(s.trust + .04);
  }
  function votePosition(s, citizen, id, option) {
    let support = option.support == null ? .7 : option.support;
    const focus = citizen.focus;
    if (id === "tax") {
      if (option.id === "high") support += focus === "public" && s.buildings.clinic ? .17 : focus === "work" ? -.13 : focus === "food" ? -.05 : 0;
      if (option.id === "low") support += focus === "work" ? .10 : focus === "public" && s.treasury < 14 ? -.12 : 0;
      if (option.id === "medium" && focus === "public" && s.treasury < 14) support += .09;
    }
    if (id === "care") {
      if (option.id === "medical") support += focus === "public" || focus === "safety" ? .14 : focus === "work" ? -.06 : 0;
      if (option.id === "housing") support += s.population >= capacity(s) - 1 ? .11 : -.045;
      if (option.id === "basic" && s.treasury < 14) support += .075;
    }
    if (id === "process") {
      if (option.id === "meeting" && focus === "fairness") support += .16;
      if (option.id === "delegate" && focus === "fairness") support -= .12;
      if (option.id === "mixed" && focus === "safety") support += .055;
    }
    support += (s.trust - 55) / 500 + (s.buildings.hall ? .035 : 0);
    const n = Number(String(citizen.id || "").replace(/\D/g, "")) || 1;
    const threshold = .43 + ((n * 3) % 6) * .037;
    return { id: citizen.id, name: citizen.name, yes: support >= threshold, focus, topic: PRIORITY_TITLES[focus], support: Math.round(clamp(support, 0, 1) * 100) };
  }


  // 법률이 새로운 운영 행동을 해금한다. 행동은 비용/기한을 갖고 다음 틱의 자원 흐름을 바꾼다.
  const ACTIONS = [
    { id: "stopChildWork", label: "어린이 위험 작업 중단", icon: "🧒", description: "즉시 위험 작업을 중단합니다. 추가 식량 생산이 사라지며 건강과 교육은 서서히 회복됩니다.", repeat: 1, key: "food", minimum: 0, when: s => s.childWorkUntil > s.tick },
    { id: "stopForcedWork", label: "강제 근무 중단", icon: "🤝", description: "동의 없는 노동을 즉시 종료합니다. 강제 근무에 따른 물자 수집 증가 효과가 사라집니다.", repeat: 1, key: "food", minimum: 0, when: s => s.forcedLaborUntil > s.tick },
    { id: "restoreRations", label: "기본 배급 회복", icon: "🍞", description: "배급 제외를 즉시 종료합니다. 식량 소비는 다시 증가하지만 주민들이 배급을 받을 수 있게 됩니다.", repeat: 1, key: "food", minimum: 0, when: s => s.exclusionUntil > s.tick },
    { id: "fuelFires", label: "난방 연료 보충", icon: "🔥", description: "목재 10을 사용해 체온을 24 회복합니다.", repeat: 5, key: "wood", minimum: 10, when: s => winterActive(s) && s.warmth < 83 },
    { id: "communityCare", label: "긴급 건강·돌봄 지원", icon: "❤️", description: "식량 8을 사용해 마을의 건강을 7, 어린이 건강을 9 회복합니다.", repeat: 9, key: "food", minimum: 8, when: s => s.health < 64 || s.childWellbeing < 65 },
    { id: "resumeLearning", label: "어린이 학습·회복 시간", icon: "📚", description: "물자 6을 사용해 학습 기회를 9, 어린이 건강을 3 회복합니다. 어린이 위험 노동이 중단된 뒤 사용할 수 있습니다.", repeat: 10, key: "wood", minimum: 6,
      when: s => childCount(s) > 0 && s.education < 90 && s.childWorkUntil <= s.tick },

    { id:"fetchWater",label:"식수 확보",icon:"💧",description:"목재 4를 사용하고 작업 피로를 감수해 식수 24를 확보합니다. 6주마다 실행 가능.",repeat:6,key:"wood",minimum:4,
      when:s=>s.tick>=23 && s.water<86 },
    { id:"repairFlood",label:"홍수 피해 복구",icon:"🛠️",description:"목재 9를 사용해 농지·창고의 피해 기간을 줄이고 식수를 일부 복구합니다.",repeat:8,key:"wood",minimum:9,
      when:s=>s.floodDamageUntil>s.tick+2 },
    { id:"supportSick",label:"감염자 돌봄",icon:"🩺",description:"식량 7을 사용해 감염자를 돌보고 치료를 지원합니다. 다른 주민에게 돌아갈 식량이 줄어듭니다.",repeat:9,key:"food",minimum:7,
      when:s=>s.sick>=1.5 },
    { id:"workerMediation",label:"노동 주민과 협상",icon:"🤝",description:"식량 8을 사용해 작업 중단을 마치고 노동 주민의 요구를 일부 수용합니다.",repeat:13,key:"food",minimum:8,
      when:s=>s.strikes.workers>s.tick },
    { id:"familyMediation",label:"가족들과 협상",icon:"🏠",description:"식량 5와 물자 8을 사용해 집단 항의를 마치고 합류 중단을 해제합니다.",repeat:13,key:"wood",minimum:8,
      when:s=>s.strikes.families>s.tick },
    { id:"carerMediation",label:"돌봄 주민과 협상",icon:"🩹",description:"식량 6과 물자 4를 사용해 중단된 돌봄 서비스를 다시 시작합니다.",repeat:13,key:"wood",minimum:4,
      when:s=>s.strikes.carers>s.tick },
    { id: "communalMeal", label: "공동 급식 운영", icon: "🍲", description: "식량 12를 사용해 주민들과 식사를 나누고 신뢰를 4 회복합니다. 배급 관련 청원도 완화합니다.", repeat: 12, key: "food", minimum: 12, when: s => s.laws.ration === "equal" },
    { id: "focusedHarvest", label: "집중 생산 기간", icon: "⚒️", description: "식량 10을 투자해 5주 동안 생산을 23% 높입니다. 피로와 배급 관련 요구가 누적됩니다.", repeat: 13, key: "food", minimum: 10, when: s => s.laws.ration === "effort" },
    { id: "supportReview", label: "추가 지원 현황 확인", icon: "📋", description: "물자 7을 사용해 지원 내역을 살펴봅니다. 신뢰를 3 회복하고 배급 관련 청원을 완화합니다.", repeat: 12, key: "wood", minimum: 7, when: s => s.laws.ration === "needs" },
    { id: "openReserve", label: "비상식량 개방", icon: "📦", description: "실제로 보관한 비상식량에서 최대 18을 꺼내 긴급 배급합니다.", repeat: 3, key: "reserveFood", minimum: 8, when: s => s.laws.storage === "reserve" && s.food < 48 },
    { id: "recoveryWeek", label: "회복 근무 주간", icon: "🛏️", description: "식량 8을 사용하고 4주 동안 생산을 낮춰 누적된 피로를 완화합니다.", repeat: 12, key: "food", minimum: 8, when: s => s.laws.labor === "extra" && s.workStrain >= 3 }
  ];
  function availableActions(s) {
    return ACTIONS.filter(a => a.when(s)).map(a => ({
      id: a.id, label: a.label, icon: a.icon, description: a.description,
      cooldown: Math.max(0, (s.actionCooldowns?.[a.id] || 0) - s.tick),
      enabled: !s.pending && !s.ended && s[a.key] >= a.minimum && (a.id !== "familyMediation" || s.food >= 5) &&
        (a.id !== "carerMediation" || s.food >= 6) && (s.actionCooldowns?.[a.id] || 0) <= s.tick,
      shortfall: Math.max(0, a.minimum - (s[a.key] || 0))
    }));
  }
  function performAction(s, id) {
    const action = ACTIONS.find(a => a.id === id);
    if (!action || !action.when(s) || s.pending || s.ended) return { ok: false, reason: "지금은 선택할 수 없는 행동입니다." };
    if (s[action.key] < action.minimum || (id === "familyMediation" && s.food<5) || (id === "carerMediation" && s.food<6)) return { ok: false, reason: "필요한 자원이 부족합니다." };
    if ((s.actionCooldowns?.[id] || 0) > s.tick) return { ok: false, reason: "이전 행동을 정리하는 기간입니다." };
    let note = action.description;
    if (id === "communalMeal") { s.food -= 12; s.trust = clamp(s.trust + 4); s.pressure.ration = clamp(s.pressure.ration - 1.3, 0, 8); }
    else if (id === "focusedHarvest") { s.food -= 10; s.boostUntil = s.tick + 5; s.workStrain = clamp(s.workStrain + 1.2, 0, 10); s.pressure.ration = clamp(s.pressure.ration + .4, 0, 8); }
    else if (id === "supportReview") { s.wood -= 7; s.trust = clamp(s.trust + 3); s.pressure.ration = clamp(s.pressure.ration - 1.6, 0, 8); }
    else if (id === "openReserve") {
      const amount = Math.min(18, s.reserveFood, Math.max(0, s.foodCap - s.food));
      if (amount < 1) return { ok: false, reason: "현재 창고에 식량을 더 넣을 수 없습니다." };
      s.reserveFood -= amount; s.food = clamp(s.food + amount, 0, s.foodCap);
      note = "비상식량 " + Number(amount.toFixed(1)) + "을(를) 꺼내 긴급 배급했습니다.";
    }
    else if (id === "recoveryWeek") { s.food -= 8; s.workReliefUntil = s.tick + 4; s.workStrain = clamp(s.workStrain - 3.2, 0, 10); s.pressure.labor = clamp(s.pressure.labor - 1.5, 0, 8); }
    else if (id === "fetchWater") { s.wood -= 4; s.water = clamp(s.water + 24); s.workStrain = clamp(s.workStrain + .6, 0, 10); }
    else if (id === "repairFlood") { s.wood -= 9; s.floodDamageUntil = Math.min(s.floodDamageUntil, s.tick + 2); s.water = clamp(s.water + 8); }
    else if (id === "supportSick") { s.food -= 7; s.sick = clamp(s.sick - 1.5, 0, s.population); s.health = clamp(s.health + 2); }
    else if (id === "workerMediation") { s.food -= 8; s.groups.workers = clamp(s.groups.workers - 2.4, 0, 10); s.strikes.workers = 0; if (s.food<30) s.groups.carers = clamp(s.groups.carers + .4,0,10); }
    else if (id === "familyMediation") {
      if (s.food<5) return {ok:false,reason:"식량 5가 더 필요합니다."};
      s.food-=5;s.wood-=8;s.groups.families=clamp(s.groups.families-2.4,0,10);
      s.strikes.families=0;s.arrivalsPausedUntil=0;s.familyExitAt=0;
    }
    else if (id === "carerMediation") {
      if (s.food<6) return {ok:false,reason:"식량 6이 더 필요합니다."};
      s.food-=6;s.wood-=4;s.groups.carers=clamp(s.groups.carers-2.4,0,10);s.strikes.carers=0;
    }
    else if (id === "stopChildWork") endChildLabor(s);
    else if (id === "stopForcedWork") endForcedLabor(s);
    else if (id === "restoreRations") endExclusion(s);
    else if (id === "fuelFires") { s.wood -= 10; s.warmth = clamp(s.warmth + 24); }
    else if (id === "communityCare") { s.food -= 8; s.health = clamp(s.health + 7); s.childWellbeing = clamp(s.childWellbeing + 9); }
    else if (id === "resumeLearning") { s.wood -= 6; s.education = clamp(s.education + 9); s.childWellbeing = clamp(s.childWellbeing + 3); }
    s.actionCooldowns[id] = s.tick + action.repeat;
    recordDecision(s, "직접 운영: " + action.label, note);
    record(s, action.label + " — " + note);
    return { ok: true, note };
  }

  function expectedVotes(s, id, optionId) {
    const law = LAWS[id], option = law?.options.find(o => o.id === optionId);
    if (!law || !option) return null;
    const voters = (s.citizens || []).slice(0, s.population);
    const members = voters.map(person => votePosition(s, person, id, option));
    const yes = members.filter(person => person.yes).length;
    return { yes, no: members.length - yes, total: members.length, passed: yes > members.length / 2, members };
  }
  function enact(s, id, optionId) {
    const law = LAWS[id], option = law?.options.find(o => o.id === optionId);
    if (s.pending || s.ended || s.mandateRestrictedUntil > s.tick || !law || law.stage > s.stage || !option || s.laws[id] === optionId)
      return { ok: false, reason: "선택할 수 없는 규칙입니다." };
    const procedure = ruleProcedure(s, id, optionId);
    if (procedure === "vote" && (s.voteCooldownUntil || 0) > s.tick)
      return { ok: false, reason: "앞선 주민투표의 정리 기간입니다. " + (s.voteCooldownUntil - s.tick) + "주 후 다시 표결할 수 있습니다." };
    let vote = null;
    if (procedure === "vote") {
      vote = expectedVotes(s, id, optionId);
      if (!vote.passed) {
        s.trust = clamp(s.trust - 1.5);
        record(s, option.title + " 제안이 주민투표에서 통과되지 않았습니다. (찬성 " + vote.yes + "/" + vote.total + ")");
        recordDecision(s, "법률 제안 부결", option.title + " · 찬성 " + vote.yes + "명");
        return { ok: false, vote, reason: "주민투표에서 통과되지 않았습니다." };
      }
    }
    const revised = Boolean(s.laws[id]);
    const oldStorage = s.laws.storage;
    s.laws[id] = optionId;
    if (!s.passed.includes(id)) s.passed.push(id);
    if (id === "ration") {
      s.pressure.ration = 0;
      s.safeguards.fairBonus = false;
      s.safeguards.effortCare = false;
      s.safeguards.needsAudit = false;
      settlePledges(s, "ration");
    }
    if (id === "labor") {
      s.pressure.labor = 0;
      s.safeguards.workBreak = false;
      settlePledges(s, "labor");
      if (optionId !== "extra") s.workStrain = clamp(s.workStrain - 1.5, 0, 10);
    }
    if (id === "process") { s.authorityUses = 0; s.voteCooldownUntil = 0; }
    if (procedure === "direct" && law.vote && id === "care") s.authorityUses++;
    if (procedure === "vote" && s.laws.process === "meeting" && id !== "process") s.voteCooldownUntil = s.tick + 3;
    s.trust = clamp(s.trust + (revised ? -1 : 2));
    s.foodCap = 100 + s.buildings.store * 45 + (s.laws.storage === "reserve" ? 35 : 0);
    if (id === "storage" && oldStorage === "reserve" && optionId !== "reserve" && s.reserveFood > 0) {
      const stored = s.reserveFood;
      const kept = Math.min(stored, Math.max(0, s.foodCap - s.food));
      s.food += kept;
      s.reserveFood = 0;
      record(s, "비상 창고를 폐쇄하며 식량 " + Number(kept.toFixed(1)) + "을(를) 일반 창고로 옮겼습니다." +
        (kept < stored ? " 저장 공간을 넘는 식량은 보관하지 못했습니다." : ""));
    }
    s.food = clamp(s.food, 0, s.foodCap);
    record(s, option.title + " 규칙이 " + (revised ? "개정" : "제정") + "되었습니다.");
    recordDecision(s, law.title, option.title + " · " + (procedure === "vote" ? "주민투표 " + vote.yes + "/" + vote.total : "위임된 권한으로 결정"));
    return { ok: true, vote, procedure };
  }
  function effect(s, changes) {
    for (const [key, delta] of Object.entries(changes || {})) {
      if (["food", "wood", "trust", "treasury", "health", "warmth", "education", "childWellbeing", "water", "air"].includes(key))
        s[key] = clamp(s[key] + delta, 0, key === "food" ? s.foodCap : key === "wood" ? s.woodCap : ["trust", "health", "warmth", "education", "childWellbeing", "water", "air"].includes(key) ? 100 : 9999);
    }
  }
  // 사건 선택지는 일회성 변화, 건설, 법률 또는 후속 사건 플래그로 이어진다.
  const EVENTS = [

    { id:"community_collapse",priority:135,emergency:true,repeat:25,
      when:s=>s.collapseWeeks>=3&&!s.ended,
      title:"🚨 공동체의 생존이 위태롭습니다",speaker:"하나",
      body:"주민들의 건강이 심각하게 악화되어 정상적인 생산과 생활을 이어가기 어렵습니다. 지역 밖에 지원을 요청하거나 운영을 일시적으로 마무리해야 할 상황입니다.",
      options:[
        {label:"구조선을 요청하고 주민 한 명이 도움을 구하러 떠나요.",rescueTeam:true,
          note:"성인 주민 한 명이 지원을 요청하러 떠납니다. 식량·식수·건강을 일부 회복하지만 공동체는 노동력을 잃습니다."},
        {label:"식량 8과 물자 8을 사용해 공동 거처에서 재건해요.",cost:{food:8,wood:8},localRebuild:true,
          note:"6주 동안 생산을 줄이는 대신 식수와 건강을 회복합니다."},
        {label:"외부 지원을 받아 섬 운영을 마무리해요.",endSettlement:true,
          note:"현재 플레이를 종료하고 공동체의 결정 기록을 확인할 수 있습니다. 언제든 다시 시작할 수 있습니다."}
      ]},

    { id:"heat_alert", priority:119, emergency:true, when:s=>s.disasterUnanswered.heat,
      title:"☀️ 폭염, 그늘 밖에서 일하기 어렵습니다", speaker:"미래",
      body:"식수가 빠르게 줄고 작업 효율이 떨어졌습니다. 햇볕 아래서 채집을 계속할지, 그늘과 휴식을 마련할지 정해야 합니다.",
      options:[
        {label:"목재 12로 그늘막과 급수소를 설치해요.",cost:{wood:12},disasterResponse:"heat",groupChanges:{workers:.2,families:-.8},climateCare:{kind:"heat",duration:13},quietRest:2,
          changes:{water:12,trust:2},note:"폭염 피해를 크게 줄이지만 건설 때문에 2주 동안 생산이 감소하고 목재 12를 사용합니다."},
        {label:"야외 작업 시간을 줄이고 물을 길어 와요.",disasterResponse:"heat",groupChanges:{workers:.15,families:-.65},quietRest:5,waterFetch:13,
          climateCare:{kind:"heat",duration:8},note:"식수 13을 확보하고 열 노출을 줄이지만 5주간 생산량이 감소합니다."},
        {label:"수확을 포기하지 않고 계속 작업해요.",disasterResponse:"heat",groupChanges:{families:1.4,carers:.55,workers:.3},changes:{food:8,wood:4,water:-8,health:-6,trust:-3},
          note:"식량 8과 물자 4를 더 확보하지만 식수와 건강이 줄고 가족·돌봄 주민의 반발이 커집니다."}
      ]},
    { id:"flood_alert",priority:118,emergency:true,when:s=>s.disasterUnanswered.flood,
      title:"🌊 홍수가 농지와 창고를 덮쳤습니다",speaker:"태오",
      body:"홍수로 식량과 물자 일부가 유실됐고 식수가 오염됐습니다. 농지와 거처가 정상화될 때까지 생산이 감소합니다.",
      options:[
        {label:"목재 14로 배수로와 방벽을 보강해요.",cost:{wood:14},disasterResponse:"flood",groupChanges:{workers:.35,families:-.5},floodRepair:4,quietRest:3,
          changes:{water:8,trust:2},note:"시설 피해 기간을 크게 줄이지만 목재 14와 3주간의 생산 차질을 감수합니다."},
        {label:"주민을 안전한 곳으로 옮기고 농지는 나중에 복구해요.",disasterResponse:"flood",groupChanges:{families:-.35,workers:.55},floodRelocate:true,
          waterFetch:5,quietRest:5,note:"사람을 우선 보호하고 식수 5를 확보하지만 5주 동안 생산이 줄고 시설 복구가 늦어집니다."},
        {label:"침수된 창고에서 물자를 먼저 건져요.",disasterResponse:"flood",groupChanges:{families:1,carers:.9},
          changes:{food:7,wood:7,health:-7,water:-9,trust:-3},note:"식량 7과 물자 7을 건지지만 오염된 물과 위험한 작업 때문에 건강과 신뢰가 크게 악화됩니다."}
      ]},
    { id:"dust_alert",priority:117,emergency:true,when:s=>s.disasterUnanswered.dust,
      title:"🌫️ 황사가 섬을 뒤덮었습니다",speaker:"하나",
      body:"먼지가 심해 야외 작업과 이동이 어렵습니다. 공기 질이 계속 떨어지면 건강과 어린이들의 생활에도 영향이 생깁니다.",
      options:[
        {label:"목재 9로 필터와 실내 대피 공간을 마련해요.",cost:{wood:9},disasterResponse:"dust",groupChanges:{workers:.28,families:-.65},
          climateCare:{kind:"dust",duration:14},changes:{air:14,trust:2},
          note:"공기 질의 악화 속도를 줄이고 건강 피해를 완화하지만 목재가 필요합니다."},
        {label:"야외 작업을 줄이고 실내에서 쉬어요.",disasterResponse:"dust",groupChanges:{workers:.2,families:-.6},quietRest:5,
          climateCare:{kind:"dust",duration:11},changes:{air:6},note:"5주간 생산량이 감소하는 대신 야외 노출을 줄입니다."},
        {label:"작업을 그대로 이어가요.",disasterResponse:"dust",groupChanges:{families:1.2,carers:.7},changes:{air:-11,health:-5,childWellbeing:-3},
          note:"목재와 당장 생산은 유지하지만 공기 오염과 건강 피해가 커질 수 있습니다."}
      ]},
    { id:"epidemic_alert",priority:120,emergency:true,when:s=>s.disasterUnanswered.epidemic,
      title:"🦠 공동체에 전염병이 퍼지기 시작합니다",speaker:"미래",
      body:s=>"증상이 있는 주민이 " + Math.ceil(s.sick) + "명 있습니다. 돌봄을 지원하면 전파를 늦출 수 있지만 인력과 예산에 부담이 생깁니다.",
      options:[
        {label:"식량 10과 물자 7로 가정 돌봄과 위생용품을 지원해요.",cost:{food:10,wood:7},
          disasterResponse:"epidemic",groupChanges:{carers:-.7,workers:.45},climateCare:{kind:"epidemic",duration:16},medicine:1,
          changes:{trust:2},note:"감염 확산을 늦추고 회복을 돕지만 당장의 식량과 물자가 부족해집니다."},
        {label:"증상이 있는 주민이 자발적으로 쉬도록 업무를 조정해요.",disasterResponse:"epidemic",groupChanges:{carers:-.5,workers:.35},
          climateCare:{kind:"epidemic",duration:11},quietRest:6,changes:{trust:1},
          note:"감염 확산을 완화하지만 6주 동안 생산량이 감소합니다."},
        {label:"아픈 사람도 가능한 일은 계속 맡아요.",disasterResponse:"epidemic",groupChanges:{carers:1.2,families:.8},
          changes:{food:7,wood:5,health:-5,trust:-2},sickness:2,
          note:"식량 7과 물자 5를 확보하지만 감염자가 늘고 건강·돌봄 체계가 악화될 수 있습니다."}
      ]},
    { id:"water_emergency",priority:114,emergency:true,repeat:10,
      when:s=>s.tick>=28 && s.water<=13,
      title:"🚰 마실 물이 거의 남지 않았습니다",speaker:"하나",
      body:"식수가 부족해 주민들이 불안해하고 있습니다. 물을 확보하려면 인력이나 물자가 필요합니다.",
      options:[
        {label:"물자 5로 간이 정수 장치를 만들어 물을 확보해요.",cost:{wood:5},changes:{water:23},
          note:"식수 23을 확보하지만 물자가 줄어듭니다."},
        {label:"채집 인력을 잠시 물 긷기에 투입해요.",waterFetch:16,quietRest:3,
          note:"식수 16을 확보하지만 피로가 증가하고 일시적으로 생산량이 줄어듭니다."},
        {label:"식수를 모아 긴급 배급하고 다른 활동을 줄여요.",changes:{water:8,health:-2,trust:-2},
          note:"당장 위험을 늦추지만 주민들의 건강과 신뢰에 부담이 생깁니다."}
      ]},
    { id:"air_emergency",priority:113,emergency:true,repeat:11,
      when:s=>disasterActive(s,"dust") && s.air<=22,
      title:"😷 실내에도 먼지가 들어옵니다",speaker:"미래",
      body:"공기 질이 위험 수준으로 떨어졌습니다. 작업 방식을 바꾸거나 자재를 사용해 실내 공간을 보호해야 합니다.",
      options:[
        {label:"물자 7로 보호용 필터를 보강해요.",cost:{wood:7},climateCare:{kind:"dust",duration:10},
          changes:{air:21},note:"공기 질을 회복시키고 남은 황사 기간의 피해를 완화합니다."},
        {label:"공동 거처에서 잠시 쉬어요.",quietRest:4,changes:{air:11},
          climateCare:{kind:"dust",duration:6},note:"일시적으로 생산량이 감소하지만 먼지 노출을 줄입니다."},
        {label:"최소한의 작업을 유지해요.",changes:{health:-4,air:5},
          note:"작업은 지속되지만 주민들의 건강 회복이 더 어려워질 수 있습니다."}
      ]},
    { id:"epidemic_followup",priority:112,emergency:true,repeat:12,
      when:s=>s.sick>=Math.min(5,s.population*.36) && s.tick>=75 && s.disasterSeen.epidemic,
      title:"🏥 아픈 주민을 돌볼 사람이 부족합니다",speaker:"미래",
      body:s=>"현재 증상이 있는 주민은 약 " + Math.ceil(s.sick) + "명입니다. 돌봄 인력이 부족해지면 건강과 생산량이 함께 떨어집니다.",
      options:[
        {label:"식량 9와 물자 6을 사용해 돌봄을 지원해요.",cost:{food:9,wood:6},medicine:2,
          climateCare:{kind:"epidemic",duration:10},changes:{trust:2},
          note:"감염 인원을 줄이고 돌봄 부담을 완화하지만 다른 주민에게 돌아갈 자원이 줄어듭니다."},
        {label:"일을 줄이고 증상이 있는 주민의 휴식을 우선해요.",quietRest:5,
          climateCare:{kind:"epidemic",duration:8},medicine:1,
          note:"5주간 생산량이 감소하는 대신 확산과 건강 피해를 줄입니다."},
        {label:"현재의 돌봄 체계를 유지해요.",changes:{trust:-3,health:-3},
          note:"즉각적인 비용은 없지만 전염병이 이어질 수 있습니다."}
      ]},
    { id:"workers_collective",priority:104,emergency:true,repeat:23,
      when:s=>s.tick>=18 && s.groups.workers>=3.8 && s.strikes.workers<=s.tick,
      title:"📣 노동 주민들이 작업 중단을 예고합니다",speaker:"태오",
      body:"잦은 추가 근무와 부족한 물자에 대한 불만이 쌓였습니다. 주민들은 노동 조건을 논의해 달라고 요구합니다.",
      options:[
        {label:"식량 10으로 보상하고 작업 조건을 함께 정해요.",cost:{food:10},
          groupSettlement:"workers",changes:{trust:2},note:"작업 중단을 피하지만 비축 식량이 줄고 다른 집단의 요구가 늘 수 있습니다."},
        {label:"당분간 작업량을 줄여 협의를 이어가요.",groupPartial:"workers",quietRest:5,
          note:"3주 동안 생산 차질이 생기고 5주간 작업 속도가 줄지만 일부 불만이 완화됩니다."},
        {label:"요구를 받아들이지 않아요.",groupStrike:"workers",changes:{trust:-4},
          note:"8주 동안 작업이 중단돼 식량과 물자 생산 효율이 크게 떨어집니다."}
      ]},
    { id:"families_collective",priority:104,emergency:true,repeat:23,
      when:s=>s.tick>=18 && s.groups.families>=3.8 && s.strikes.families<=s.tick,
      title:"👨‍👩‍👧 가족들이 공동생활에 항의합니다",speaker:"나래",
      body:"어린이의 안전, 식수, 학습 문제를 둘러싼 요구가 쌓였습니다. 가족들이 생활 조건을 바꾸지 않으면 마을을 떠날 수 있다고 말합니다.",
      options:[
        {label:"식량 8과 물자 8을 사용해 가족 지원 공간을 마련해요.",cost:{food:8,wood:8},
          groupSettlement:"families",changes:{childWellbeing:7,education:5,trust:2},
          note:"가족들의 요구를 일부 해결하지만 공동 물자와 식량이 줄어듭니다."},
        {label:"공동시설 운영을 조정하며 다시 협의해요.",groupPartial:"families",
          changes:{childWellbeing:3},note:"일정 기간 새로운 주민의 합류가 느려지고 교육 활동이 줄어듭니다."},
        {label:"기존 운영 방침을 그대로 유지해요.",groupStrike:"families",changes:{trust:-4},
          note:"가족들의 공동활동이 중단되고 합류가 막힙니다. 미해결 시 주민이 마을을 떠날 수 있습니다."}
      ]},
    { id:"carers_collective",priority:104,emergency:true,repeat:23,
      when:s=>s.tick>=20 && s.groups.carers>=3.8 && s.strikes.carers<=s.tick,
      title:"🩺 돌봄 주민들이 지원을 요청합니다",speaker:"미래",
      body:"건강이 나빠지는 주민이 늘었지만 돌봄에 필요한 시간과 자원이 부족합니다. 담당자들이 업무와 시설을 재조정해 달라고 요청합니다.",
      options:[
        {label:"식량 8과 물자 6을 사용해 돌봄 인력을 지원해요.",cost:{food:8,wood:6},
          groupSettlement:"carers",medicine:1,changes:{trust:2},
          note:"돌봄이 계속되지만 다른 활동에 사용할 자원이 줄어듭니다."},
        {label:"필수 돌봄만 운영하며 업무를 재조정해요.",groupPartial:"carers",medicine:1,
          note:"3주간 일부 돌봄 서비스에 차질이 생깁니다. 감염 위험을 완전히 해결하지는 못합니다."},
        {label:"추가 지원 없이 기존 업무를 유지해요.",groupStrike:"carers",changes:{trust:-4},
          note:"8주 동안 돌봄 서비스가 중단돼 감염과 건강 회복에 영향을 줍니다."}
      ]},
    { id:"family_departure",priority:110,emergency:true,repeat:12,
      when:s=>s.familyExitAt>0 && s.tick>=s.familyExitAt && s.strikes.families>s.tick,
      title:"⛵ 가족들이 마을을 떠날 배를 준비합니다",speaker:"하나",
      body:"가족들의 요청이 해결되지 않아 일부 주민들이 다른 거처로 이주하려 합니다. 남은 시간에 합의하거나 떠나는 결정을 존중해야 합니다.",
      options:[
        {label:"식량 10과 물자 10을 사용해 긴급 지원에 합의해요.",cost:{food:10,wood:10},
          groupSettlement:"families",changes:{trust:2,childWellbeing:4},
          note:"이주를 막고 공동활동을 회복하지만 자원이 크게 줄어듭니다."},
        {label:"요구 사항을 받아들이고 일시적으로 공공 활동을 조정해요.",groupSettlement:"families",
          quietRest:5,changes:{trust:1},note:"5주 동안 생산이 감소하는 대신 가족들은 마을에 남습니다."},
        {label:"떠나려는 주민의 선택을 존중해요.",familyDeparture:1,changes:{trust:-5},
          note:"성인 주민 한 명이 마을을 떠나며 해당 노동력도 상실할 수 있습니다."}
      ]},
    { id:"confidence_crisis",priority:108,emergency:true,repeat:48,
      when:s=>s.stage>=2 && s.tick>=35 && s.trust<24 &&
        (s.groups.workers+s.groups.families+s.groups.carers)>=9 && s.mandateRestrictedUntil<=s.tick,
      title:"🏛️ 주민들이 운영 방식의 재검토를 요구합니다",speaker:"하나",
      body:"여러 주민 집단의 요구가 충돌하며 현재 운영 방식에 대한 신뢰가 낮아졌습니다. 공동체는 앞으로 누가 어떤 범위에서 결정을 내릴지 논의하려 합니다.",
      options:[
        {label:"7주간 임시 운영 체제로 전환하고 새 결정을 제한해요.",caretaker:true,changes:{trust:3},
          note:"새 건설과 일반 법률 제정이 잠시 제한됩니다. 일꾼 배치와 긴급 구조는 계속 가능합니다."},
        {label:"주민 공개회의를 열고 공동으로 운영 계획을 조정해요.",openCouncil:true,
          changes:{trust:2},note:"의견 차이가 일부 완화되지만 당장의 식량·물자 부족은 별도로 해결해야 합니다."},
        {label:"기존 운영 방침을 유지해요.",rejectCouncil:true,changes:{trust:-5},
          note:"노동 주민의 작업 중단이 발생해 생산에 타격을 줍니다."}
      ]},

    { id: "winter_warning", priority: 92, repeat: 28,
      when: s => s.tick >= s.nextWinterAt - 8 && s.tick < s.nextWinterAt && s.winterPrepared == null,
      title: "❄️ 거센 한파가 다가옵니다", speaker: "미래",
      body: s => "해안의 기온이 급격히 떨어지고 있습니다. 다가오는 한파는 " + Math.min(20, 14 + (s.winterCount || 0) * 2) + "주 동안 이어질 전망입니다. 생산량이 감소하고 매주 난방 물자가 필요합니다. 무엇을 준비할까요?",
      options: [
        { label: "목재 12를 사용해 거처를 보강해요.", cost: { wood: 12 }, winterPrep: 2,
          note: "한파 시작 시 체온을 더 높게 유지하고, 매주 필요한 난방 물자가 줄어듭니다." },
        { label: "식량 10을 사용해 난방 거처를 함께 운영해요.", cost: { food: 10 }, winterPrep: 1,
          note: "한파 시작 시 체온을 보통 수준으로 유지합니다. 대신 식량 비축량이 줄어듭니다." },
        { label: "지금은 자원을 아껴 두고 한파에 대응해요.", winterPrep: 0,
          note: "자원을 미리 사용하지 않지만 한파가 시작될 때 체온이 낮고 난방에 많은 물자가 필요합니다." }
      ] },
    { id: "cold_emergency", priority: 111, repeat: 11,
      when: s => winterActive(s) && s.warmth <= 30,
      title: "🥶 거처 안까지 추위가 들어왔습니다", speaker: "하나",
      body: "난방 물자가 부족해 체온이 떨어졌습니다. 추위가 계속되면 주민들의 건강과 생산량이 악화됩니다.",
      options: [
        { label: "공동 거처에 모여 남은 열을 나눠요.", coldShelter: 1,
          note: "새로운 자원 없이 체온을 16 회복합니다. 좁은 거처에서 지내느라 피로가 증가합니다." },
        { label: "자원 수집 인원을 긴급히 재배치해요.", crisisWood: true, coldShelter: 2,
          note: "작업 인원을 물자 수집에 우선 배치하고 체온을 8 회복합니다. 식량 생산에 영향이 생길 수 있습니다." },
        { label: "비축 물자를 사용해 난방을 강화해요.", cost: { wood: 10 }, coldShelter: 3,
          note: "목재 10을 사용해 체온을 30 회복합니다." }
      ] },
    { id: "child_labor_debate", priority: 87, once: true,
      when: s => winterActive(s) && s.tick >= 16 && childCount(s) > 0 && s.food <= 72,
      title: "어린 주민도 위험한 채집에 나가야 할까요?", speaker: "나래",
      body: "한파로 식량 생산이 줄었습니다. 일부 어른들은 어린이도 해변의 위험한 채집 작업에 보내자고 말합니다. 나래는 '저희도 학교에 가고 안전하게 지낼 수 있나요?'라고 묻습니다.",
      options: [
        { label: "어른들의 작업을 다시 나누고 어린이는 보호해요.", adultGather: true, childProtect: true, quietRest: 2,
          note: "성인을 채집에 우선 배치해 어린이를 보호합니다. 대신 물자 수집과 2주간의 전체 생산에 부담이 생깁니다." },
        { label: "자발적인 성인 비상 근무로 대응해요.", adultVolunteer: "food", childProtect: true, changes: { food: 6 },
          note: "식량 6을 즉시 확보하지만 노동 피로가 크게 늘어 다음 위기 때 작업 중단 위험이 커집니다." },
        { label: "어린이에게도 위험한 야외 채집을 맡겨요.", startChildLabor: 7, changes: { food: 10, trust: -5 },
          note: "식량 10을 즉시 확보하고 7주 동안 생산이 늘지만 어린이의 건강·학습과 가족들의 신뢰가 크게 악화됩니다." }
      ] },
    { id: "child_labor_harm", priority: 106, repeat: 5,
      when: s => s.childWorkUntil > s.tick && s.childWorkWeeks >= 3 && !s.childLaborReviewed,
      title: "어린 주민들이 지쳐 돌아왔습니다", speaker: "현우",
      body: "현우와 나래가 연일 채집에 나가면서 수업을 놓치고 건강이 악화됐습니다. '쉬고 싶다'는 요청이 들어왔습니다. 이전 선택의 결과를 검토할 때입니다.",
      options: [
        { label: "위험한 작업을 즉시 중단하고 회복을 지원해요.", stopChildLabor: true,
          changes: { trust: 3 }, note: "어린이 노동으로 얻던 추가 생산이 사라집니다. 건강과 교육은 천천히 회복됩니다." },
        { label: "위험 작업을 종료하고 성인 일꾼을 다시 배치해요.", stopChildLabor: true, adultGather: true,
          changes: { trust: 2 }, note: "성인의 물자 수집 인원이 줄 수 있으나 어린이의 위험 작업은 종료됩니다." },
        { label: "위험한 작업을 계속하도록 지시해요.", continueChildLabor: 6,
          changes: { trust: -8, health: -3 }, note: "식량 추가 생산은 이어지지만 어린이의 건강·교육 악화와 갈등이 누적됩니다." }
      ] },
    { id: "forced_labor_debate", priority: 80, once: true,
      when: s => winterActive(s) && s.tick >= 18 && s.wood <= 24 && adultCapacity(s) >= 4,
      title: "난방을 위해 주민을 강제로 일하게 할까요?", speaker: "태오",
      body: "연료가 부족해지고 있습니다. 일부 주민은 야외 작업을 자원했지만, 모두를 동의 없이 강제로 투입하자는 제안도 나왔습니다.",
      options: [
        { label: "자발적 비상 근무에 식량 보상을 제공해요.", cost: { food: 8 },
          volunteerWood: true, changes: { trust: 2 }, note: "식량 8을 사용하고 물자 10을 확보합니다. 성인 노동 피로가 증가합니다." },
        { label: "작업 인원을 재배치하고 난방을 집중해요.", crisisWood: true, coldShelter: 2,
          note: "물자 수집 인원을 늘리고 체온을 회복합니다. 식량 생산이 줄 수 있습니다." },
        { label: "모든 성인에게 강제 야외 작업을 명령해요.", startForcedLabor: 8,
          changes: { wood: 12, trust: -6 }, note: "물자 12를 즉시 확보하고 8주간 수집량이 늘지만 건강·신뢰 악화와 노동 주민의 집단행동 위험이 커집니다." }
      ] },
    { id: "forced_labor_protest", priority: 105, repeat: 5,
      when: s => s.forcedLaborUntil > s.tick && s.forcedLaborWeeks >= 3 && !s.laborReviewed,
      title: "동의 없는 노동을 중단해 달라는 청원", speaker: "태오",
      body: "강제로 일하던 주민들이 피로와 건강 악화를 호소하며 노동 중단을 요구합니다. 강제 근무를 유지할지, 자발적 협력으로 바꿀지 결정해야 합니다.",
      options: [
        { label: "강제 근무를 끝내고 주민의 동의를 구해요.", endForcedLabor: true,
          changes: { trust: 3 }, note: "강제 근무로 얻던 추가 물자 생산이 종료됩니다. 주민들의 건강은 서서히 회복됩니다." },
        { label: "강제 근무를 끝내고 작업 순서를 다시 정해요.", endForcedLabor: true, crisisWood: true,
          changes: { trust: 1 }, note: "물자 수집 인력을 재배치하되 강제 근무는 종료합니다." },
        { label: "비상 명령을 연장해요.", extendForcedLabor: 5,
          changes: { trust: -8, health: -4 }, note: "추가 물자 생산이 이어지지만 노동 피로와 주민들의 피해가 누적됩니다." }
      ] },
    { id: "ration_exclusion_debate", priority: 94, once: true,
      when: s => winterActive(s) && s.food <= 24 && s.exclusionUntil <= s.tick && s.tick >= 19,
      title: "아픈 주민에게도 식량을 나눠야 할까요?", speaker: "하나",
      body: "먹을 것이 거의 없습니다. 일부 주민은 일을 못 하는 사람의 배급을 끊자고 주장합니다. 대상자가 식량을 받지 못하면 건강이 더 나빠질 수 있습니다.",
      options: [
        { label: "모든 주민의 최소 배급을 유지하고 생산을 재배치해요.", adultGather: true,
          changes: { trust: 2 }, note: "배급을 유지하되 다른 작업에서 성인 일꾼을 채집으로 옮겨야 합니다." },
        { label: "비상 창고에서 식량 8을 꺼내 함께 나눠요.", cost: { reserveFood: 8 }, changes: { food: 8 },
          note: "실제로 저장한 비상식량 8을 사용합니다. 모두의 배급은 유지됩니다." },
        { label: "일할 수 없는 일부 주민을 배급에서 제외해요.", startExclusion: 6,
          changes: { food: 5, trust: -8 }, note: "식량 5를 당장 아끼고 6주 동안 주당 소비가 크게 줄지만 배제된 주민의 건강 악화와 이의 제기가 이어집니다." }
      ] },
    { id: "ration_exclusion_appeal", priority: 104, repeat: 5,
      when: s => s.exclusionUntil > s.tick && s.exclusionWeeks >= 3 && !s.exclusionReviewed,
      title: "배급에서 제외된 주민들의 이의 신청", speaker: "하나",
      body: "식량을 받지 못한 주민들의 건강이 나빠지고 있습니다. 배급 기준을 다시 검토해 달라는 이의 신청이 접수됐습니다.",
      options: [
        { label: "배급 제외를 종료하고 최소 배급을 회복해요.", endExclusion: true,
          changes: { trust: 3 }, note: "식량 소비량은 다시 증가하지만 더 이상 특정 주민을 배급에서 제외하지 않습니다." },
        { label: "배급 제외를 종료하고 채집 일꾼을 늘려요.", endExclusion: true, adultGather: true,
          changes: { trust: 2 }, note: "최소 배급을 회복하고 다른 작업 인력을 식량 생산으로 이동합니다." },
        { label: "배급 제외를 더 유지해요.", extendExclusion: 4,
          changes: { trust: -7, health: -4 }, note: "식량 절감이 이어지지만 주민들의 건강과 공동체 신뢰가 추가로 악화됩니다." }
      ] },

    { id: "ration_equal_petition", priority: 72, repeat: 28, when: s => s.laws.ration === "equal" && s.tick >= 10 && s.pressure.ration >= 3.2, title: "같이 나눠도, 일한 몫은요?", speaker: "태오",
      body: "같은 양을 나누는 규칙을 유지하되 추가로 일한 사람의 몫을 어떻게 다룰지 의견이 나왔습니다. 지금 정하는 방법은 앞으로의 배급에도 적용됩니다.", options: [
      { label: "추가 노동에 대한 보상 배급을 허용해요.", safeguard: "fairBonus", changes: { trust: 2 }, note: "생산량을 유지하지만 매주 보상용 식량이 더 필요합니다. 새로운 운영 규칙이 계속 적용됩니다." },
      { label: "배급법 자체를 노동 보상 방식으로 개정해요.", law: ["ration", "effort"], note: "전체 생산과 식량 소비 방식이 달라집니다. 이후에는 노동 참여가 어려운 주민의 요구가 생길 수 있습니다." },
      { label: "9주 안에 배급법을 다시 검토하겠다고 약속해요.", pledge: { kind: "ration", title: "배급법 재검토", delay: 9 }, changes: { trust: 1 }, note: "당장 법을 바꾸지 않지만, 약속을 지키지 않으면 후속 사건이 발생합니다." }
    ] },
    { id: "ration_effort_petition", priority: 74, repeat: 27, when: s => s.laws.ration === "effort" && s.tick >= 10 && s.pressure.ration >= 3.2, title: "일하기 어려운 주민은 어떻게 하나요?", speaker: "하나",
      body: "노동에 따른 추가 배급을 운영하고 있지만 돌봄이나 다른 사정으로 추가 노동에 참여하기 어려운 주민이 있습니다. 예외 규정을 논의해 달라는 청원이 들어왔습니다.", options: [
      { label: "기본 배급과 추가 지원을 함께 보장해요.", safeguard: "effortCare", changes: { trust: 2 }, note: "매주 식량 소비가 늘고 노동 보상에 따른 생산 증가폭이 일부 줄어듭니다. 추가 지원 규정이 유지됩니다." },
      { label: "필요에 따른 배급법으로 개정해요.", law: ["ration", "needs"], note: "노동 보상 대신 지원 대상 확인과 물자 관리가 중요해집니다." },
      { label: "9주 안에 예외 규정을 다시 검토하겠다고 약속해요.", pledge: { kind: "ration", title: "배급 예외 검토", delay: 9 }, changes: { trust: 1 }, note: "미루는 동안 현재 배급법을 유지합니다. 약속 기한이 오면 후속 사건이 발생합니다." }
    ] },
    { id: "ration_needs_petition", priority: 74, repeat: 27, when: s => s.laws.ration === "needs" && s.tick >= 10 && s.pressure.ration >= 3.2, title: "추가 지원의 기준을 알려 주세요", speaker: "미래",
      body: "추가 지원을 누가 받는지 확인하고 관리하는 데 물자가 듭니다. 일부 주민은 기준과 배급 내역을 더 투명하게 알려 달라고 제안했습니다.", options: [
      { label: "지원 대상과 배급 내역을 정기적으로 확인해요.", safeguard: "needsAudit", changes: { trust: 3 }, note: "청원은 줄지만 매주 행정 물자와 자치 마을의 운영비가 추가로 필요합니다." },
      { label: "기본 균등 배급으로 법을 개정해요.", law: ["ration", "equal"], note: "행정 부담이 줄지만 개인별 필요를 다루는 방식이 달라집니다." },
      { label: "9주 안에 지원 기준을 다시 검토하겠다고 약속해요.", pledge: { kind: "ration", title: "추가 지원 기준 검토", delay: 9 }, changes: { trust: 1 }, note: "기한 전까지 다른 조치를 하지 않으면 약속 이행을 요구받습니다." }
    ] },
    { id: "labor_fatigue", priority: 85, repeat: 29, when: s => s.laws.labor === "extra" && (s.workStrain >= 5.2 || s.pressure.labor >= 3.6),
      title: "추가 근무가 오래 이어지고 있어요", speaker: "태오",
      body: "처음에는 생산이 늘었지만 피로가 누적되며 작업 속도가 떨어지고 있습니다. 주민들이 휴식과 보상을 논의하고 싶어 합니다.", options: [
        { label: "추가 근무마다 쉬는 시간과 간식을 보장해요.", safeguard: "workBreak", changes: { trust: 3 }, note: "식량 소비가 조금 늘지만 피로가 줄고 장기적인 생산 하락을 완화합니다." },
        { label: "일과 휴식이 균형을 이루도록 법을 개정해요.", law: ["labor", "balanced"], note: "추가 근무에 따른 생산 효과는 사라지지만 피로가 회복됩니다." },
        { label: "6주 동안 추가 근무를 잠시 줄여요.", restWeeks: 6, changes: { trust: 1 }, note: "일시적으로 생산량이 떨어지고 피로가 줄어듭니다. 기존 노동 규칙은 유지됩니다." }
      ] },
    { id: "unkept_pledge", priority: 98, repeat: 6, when: s => (s.pledges || []).some(p => s.tick >= p.due),
      title: "약속한 검토 기한이 지났습니다", speaker: "하나",
      body: "주민들이 기다려 온 법률 검토의 기한이 지났습니다. 약속을 어떻게 처리할지 결정해야 합니다.", options: [
        { label: "현재 배급법에 필요한 보호 규정을 추가해요.", fulfillSafeguard: true, changes: { trust: -1 }, note: "기존 법을 유지하되 주민들의 요구에 대응할 영구적인 규정을 추가합니다." },
        { label: "기한을 넘긴 이유를 공개하고 다시 논의해요.", postponePledge: 7, changes: { trust: -4 }, note: "검토 기한을 한 번 더 연장합니다. 다시 기한을 놓치면 주민들의 신뢰가 감소합니다." },
        { label: "약속을 철회하고 기존 방침을 유지해요.", abandonPledge: true, changes: { trust: -9 }, note: "약속을 철회합니다. 기존 규칙은 유지되지만 갈등이 다시 커질 수 있습니다." }
      ] },
    { id: "storm_aftermath", priority: 79, repeat: 12, when: s => !!s.stormAftermathAt && s.tick >= s.stormAftermathAt,
      title: "폭풍이 지나간 뒤, 우리 마을은?", speaker: "미래",
      body: s => s.laws.storage === "reserve" ? "비축 식량 덕분에 폭풍 이후의 피해를 줄일 수 있었습니다. 이제 부족한 물자를 복구할 차례입니다." :
        s.laws.storage === "exchange" ? "평소 교역으로 물자를 얻었지만 폭풍 때는 교역이 끊겼습니다. 식량 재고와 다음 폭풍에 대한 준비를 점검해야 합니다." :
        s.laws.storage === "share" ? "남는 식량을 추가로 배급해 왔지만 폭풍 이후에는 저장된 양이 적습니다. 앞으로의 비축 방법을 논의합니다." :
        "폭풍이 지나갔습니다. 사전에 충분한 비축 규칙을 마련하지 못해 식량과 물자 상태를 확인해야 합니다.",
      options: [
        { label: "복구 작업에 물자를 우선 사용해요.", changes: { trust: 2 }, restoration: true, note: "자원이 허락하는 범위에서 시설 복구에 투자하고 생산량 회복을 돕습니다." },
        { label: "앞으로의 비축 규칙을 검토해요.", changes: { trust: 2 }, reviewStorage: true, note: "현재 법률을 유지하되 비축법 개정의 필요성을 기록합니다." },
        { label: "지금의 운영방식을 유지해요.", changes: { trust: -1 }, note: "추가 지출 없이 현재의 생산과 배급을 이어갑니다." }
      ] },
    { id: "delegation_review", priority: 78, repeat: 29, when: s => s.stage >= 2 && s.laws.process === "delegate" && (s.authorityUses >= 2 || (s.processReviewAt || 0) > 0 && s.tick >= s.processReviewAt),
      title: "위임한 권한을 다시 확인해요", speaker: "하나",
      body: "대표자에게 맡긴 공공 지원 결정이 누적되었습니다. 주민들이 결정 근거와 지출 내역을 보고, 위임 범위를 다시 확인하려 합니다.", options: [
        { label: "결정 내역을 공개하고 주민 의견을 들어요.", changes: { trust: 4 }, reviewAuthority: true, note: "대표에게 위임한 운영 방식은 유지하면서 결정 내역을 공개하고 정기 검토를 다시 시작합니다." },
        { label: "앞으로의 의사결정 절차를 주민투표로 제안해요.", changes: { trust: 2 }, reviewAuthority: true, note: "법률 탭에서 공동체 결정 절차를 변경할 수 있습니다." },
        { label: "기존 위임을 유지하고 다음 검토를 예약해요.", changes: { trust: -3 }, reviewAuthority: true, note: "대표자 권한은 유지됩니다. 이후 정기 검토를 다시 진행합니다." }
      ] },
    { id: "tax_accounts", priority: 54, once: true, when: s => s.stage >= 2 && s.laws.tax === "high" && s.tick >= 17,
      title: "공동기금은 어디에 쓰이고 있나요?", speaker: "미래",
      body: "공동 부담금이 높아지면서 시민들이 최근 지출과 앞으로의 투자 계획을 알고 싶어 합니다.", options: [
        { label: "공동기금의 수입과 지출을 공개해요.", changes: { trust: 4 }, note: "기록을 공개하고 예산 관련 주민 의견을 듣습니다." },
        { label: "공공시설 개선에 물자를 사용해요.", cost: { wood: 8 }, changes: { trust: 5 }, note: "물자를 사용해 공공시설을 개선합니다." },
        { label: "현재 예산 운영을 계속해요.", changes: { trust: -3 }, note: "즉각적인 지출은 없지만 관련 요구가 남을 수 있습니다." }
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

  function rightsHistory(s, kind, status, detail) {
    if (!Array.isArray(s.rightsHistory)) s.rightsHistory = [];
    s.rightsHistory.unshift({ tick: s.tick, kind, status, detail });
    if (s.rightsHistory.length > 28) s.rightsHistory.length = 28;
    recordDecision(s, kind + (status === "시작" ? " 발생" : " 검토"), detail);
  }
  function endChildLabor(s) {
    if (s.childWorkUntil > s.tick) {
      s.childWorkUntil = 0;
      rightsHistory(s, "어린이 위험 노동", "종료", "어린이의 위험 작업을 중단하고 회복·학습을 지원합니다.");
      record(s, "어린이의 위험 작업을 중단했습니다. 건강과 학습은 서서히 회복됩니다.");
    }
    s.childWorkWeeks = 0;
    s.childLaborReviewed = true;
  }
  function endForcedLabor(s) {
    if (s.forcedLaborUntil > s.tick) {
      s.forcedLaborUntil = 0;
      rightsHistory(s, "강제 노동", "종료", "동의 없는 강제 근무를 종료했습니다.");
    }
    s.forcedLaborWeeks = 0;
  }
  function endExclusion(s) {
    if (s.exclusionUntil > s.tick) {
      s.exclusionUntil = 0;
      rightsHistory(s, "일부 주민 배급 제외", "종료", "배급에서 제외된 주민의 기본 배급을 회복했습니다.");
    }
    s.exclusionWeeks = 0;
  }
  function startWinter(s) {
    s.winterEver = true;
    s.winterStartedAt = s.tick;
    s.winterCount = (s.winterCount || 0) + 1;
    const duration = Math.min(20, 12 + s.winterCount * 2);
    s.coldUntil = s.tick + duration;
    s.nextWinterAt += 34;
    s.warmth = s.winterPrepared === 2 ? 84 : s.winterPrepared === 1 ? 72 : 62;
    s.crisisHistory.unshift({ tick: s.tick, type: "한파", text: "한파 시작 · " + duration + "주 동안 생산량이 감소하고 난방 물자가 소모됩니다." });
    record(s, "❄️ 한파가 시작되었습니다. 난방 물자가 매주 소모되고 식량 생산이 줄어듭니다.");
  }
  function advanceWinterAndRights(s) {
    if (s.tick >= s.nextWinterAt) startWinter(s);
    if (s.coldUntil && s.tick >= s.coldUntil) {
      s.coldUntil = 0;
      s.winterPrepared = null;
      record(s, "한파가 물러갔습니다. 하지만 떨어진 건강과 학습 기회는 천천히 회복됩니다.");
    }
    if (s.childWorkUntil > 0 && s.tick >= s.childWorkUntil) {
      s.childWorkUntil = 0; s.childWorkWeeks = 0; s.childLaborReviewed = true;
      rightsHistory(s, "어린이 위험 노동", "종료", "위험한 작업의 시행 기한이 종료되었습니다. 건강과 학습의 회복은 이어집니다.");
      record(s, "어린이 위험 노동의 시행 기한이 종료되었습니다.");
    }
    if (s.forcedLaborUntil > 0 && s.tick >= s.forcedLaborUntil) {
      s.forcedLaborUntil = 0; s.forcedLaborWeeks = 0;
      rightsHistory(s, "강제 노동", "종료", "비상 강제 근무의 시행 기한이 종료되었습니다.");
      record(s, "강제 근무의 기한이 끝났습니다.");
    }
    if (s.exclusionUntil > 0 && s.tick >= s.exclusionUntil) {
      s.exclusionUntil = 0; s.exclusionWeeks = 0;
      rightsHistory(s, "일부 주민 배급 제외", "종료", "배급 제외의 시행 기한이 종료되었습니다.");
      record(s, "일부 주민에 대한 배급 제외가 종료되었습니다.");
    }
  }
  function advanceHealthAndFuel(s, rates, producedWood) {
    if (winterActive(s)) {
      const adequateFuel = producedWood + .00001 >= rates.heating;
      s.wood = clamp(producedWood - rates.heating, 0, s.woodCap);
      s.warmth = clamp(s.warmth + (adequateFuel ? -.8 : -5.1));
      if (s.warmth < 48) s.health = clamp(s.health - (s.warmth < 25 ? 2.4 : 1.2));
      if (s.warmth < 38) s.childWellbeing = clamp(s.childWellbeing - 1.1);
    } else {
      s.wood = clamp(producedWood, 0, s.woodCap);
      s.warmth = clamp(s.warmth + 1.7);
    }
    if (s.food < 8) { s.health = clamp(s.health - 2.2); s.childWellbeing = clamp(s.childWellbeing - 1.5); }
    else if (s.food < 20) { s.health = clamp(s.health - 1.25); s.childWellbeing = clamp(s.childWellbeing - .9); }
    else if (!winterActive(s) && s.food > 40) {
      s.health = clamp(s.health + (s.buildings.clinic && s.treasury >= 1 ? .55 : .22));
      s.childWellbeing = clamp(s.childWellbeing + .32);
    }
    if (s.childWorkUntil > s.tick) {
      s.childWorkWeeks++;
      s.childWellbeing = clamp(s.childWellbeing - 2.3);
      s.education = clamp(s.education - 2.8);
      s.trust = clamp(s.trust - .48);
      if (s.childWellbeing <= 25) {
        s.childWorkUntil = 0;
        s.childWorkWeeks = 0;
        s.childLaborReviewed = true;
        s.health = clamp(s.health - 5);
        s.trust = clamp(s.trust - 6);
        rightsHistory(s, "어린이 위험 노동", "건강 악화로 중단", "어린이의 건강이 악화되어 작업을 중단했습니다. 추가 생산이 사라지고 회복 지원이 필요합니다.");
        record(s, "어린이의 건강이 악화되어 위험 작업이 중단되었습니다. 돌봄과 학습 회복이 필요합니다.");
      }
    } else if (s.food > 30) s.education = clamp(s.education + (winterActive(s) ? .14 : .38));
    if (s.forcedLaborUntil > s.tick) {
      s.forcedLaborWeeks++;
      s.health = clamp(s.health - .48);
      s.workStrain = clamp(s.workStrain + .4, 0, 10);
      s.trust = clamp(s.trust - .52);
    }
    if (s.exclusionUntil > s.tick) {
      s.exclusionWeeks++;
      s.health = clamp(s.health - 1.1);
      s.trust = clamp(s.trust - .72);
    }
  }


  function advanceDisasters(s) {
    const schedule = { heat: [10, 58], flood: [8, 67], dust: [11, 56], epidemic: [14, 74] };
    for (const [kind, [length, interval]] of Object.entries(schedule)) {
      if (s.tick >= s.nextDisasters[kind] && !disasterActive(s,kind)) {
        s.disasters[kind] = s.tick + length;
        s.disasterUnanswered[kind] = true;
        s.disasterSeen[kind] = (s.disasterSeen[kind] || 0) + 1;
        s.nextDisasters[kind] = s.tick + interval + Math.floor(random(s)*7) - 3;
        s.crisisHistory.unshift({ tick:s.tick, type:DISASTER_NAMES[kind], text:DISASTER_NAMES[kind] + "이(가) 시작됐습니다. " + length + "주 동안 영향을 줍니다." });
        record(s, "⚠️ " + DISASTER_NAMES[kind] + " 발생. 주민과 자원을 보호할 방안을 선택해야 합니다.");
        if (kind === "flood") {
          s.food = clamp(s.food - (s.buildings.store ? 6 : 11), 0, s.foodCap);
          s.wood = clamp(s.wood - 5, 0, s.woodCap);
          s.water = clamp(s.water - 15);
          s.floodDamageUntil = s.tick + 12;
        }
        if (kind === "epidemic") s.sick = Math.min(s.population, Math.max(s.sick, 2));
      }
      if (s.crisisHistory.length > 35) s.crisisHistory.length = 35;
    }
    const hasHeat = disasterActive(s, "heat"), hasDust = disasterActive(s, "dust");
    if (hasHeat && s.water < 38) {
      s.health = clamp(s.health - (s.water < 14 ? 2 : .7));
      s.childWellbeing = clamp(s.childWellbeing - .6);
    }
    if (hasDust) {
      const protectedDust = s.disasterCare.dust > s.tick;
      s.air = clamp(s.air - (protectedDust ? 2.8 : 6.3));
      if (s.air < 48) {
        s.health = clamp(s.health - (protectedDust ? .25 : .83));
        s.childWellbeing = clamp(s.childWellbeing - .42);
      }
    } else s.air = clamp(s.air + (s.disasterSeen.dust ? 4.1 : 1.6));
    if (disasterActive(s, "flood") && s.water < 30) s.health = clamp(s.health - .45);
    if (disasterActive(s, "epidemic")) {
      const cared = s.disasterCare.epidemic > s.tick;
      const caregiversAbsent = s.strikes.carers > s.tick;
      const sickGrowth = cared ? .08 : (caregiversAbsent ? .85 : .47);
      const recovery = s.buildings.clinic && s.stage >= 2 && s.treasury > 1 && !caregiversAbsent ? .65 : .22;
      s.sick = clamp(s.sick + sickGrowth - recovery, 0, s.population);
      s.health = clamp(s.health - s.sick * (cared ? .035 : .065));
    } else if (s.sick > 0) s.sick = clamp(s.sick - (s.strikes.carers > s.tick ? .12 : s.buildings.clinic ? .57 : .25), 0, s.population);
    if (s.strikes.carers > s.tick && s.sick >= 2) s.health = clamp(s.health - .28);
    if (s.strikes.families > s.tick) {
      s.education = clamp(s.education - .48);
    }
  }
  function advanceGroupPressure(s) {
    const g = s.groups, foodLow = s.food < 25, waterLow = s.water < 27;
    g.workers = clamp(g.workers +
      (s.forcedLaborUntil > s.tick ? .56 : 0) + (s.workStrain > 5 ? .20 : 0) +
      (foodLow ? .12 : 0) + (s.health < 30 ? .14 : 0) +
      (s.stage >= 2 && s.laws.tax === "high" ? .23 : 0) +
      (s.wood < 24 ? .16 : 0) + (s.strikes.workers > s.tick ? -.16 : -.14), 0, 10);
    g.families = clamp(g.families +
      (s.childWorkUntil > s.tick ? .53 : 0) + (s.childWellbeing < 57 ? .20 : 0) +
      (waterLow ? .18 : s.water < 52 ? .20 : 0) + (s.health < 35 ? .12 : 0) +
      (s.laws.ration === "effort" ? .15 : 0) + (disasterActive(s,"epidemic") && s.sick>=5 ? .12 : 0) +
      (s.strikes.families > s.tick ? -.12 : -.15), 0, 10);
    g.carers = clamp(g.carers +
      (s.exclusionUntil > s.tick ? .54 : 0) + (s.sick >= 4 ? .21 : 0) +
      (s.health < 48 ? .16 : 0) + (s.water < 20 ? .10 : 0) +
      (s.stage >= 2 && s.laws.tax === "low" && !s.buildings.clinic ? .22 : 0) +
      (s.strikes.carers > s.tick ? -.10 : -.15), 0, 10);
    if (g.workers >= 7.2 && s.strikes.workers <= s.tick) s.trust = clamp(s.trust - .30);
    if (g.families >= 7.2 && s.strikes.families <= s.tick) s.trust = clamp(s.trust - .30);
    if (g.carers >= 7.2 && s.strikes.carers <= s.tick) s.trust = clamp(s.trust - .30);
  }
  function departResidents(s, amount, reason) {
    let removed = 0;
    while (removed < amount && s.population > 3) {
      const idx = s.citizens.findLastIndex(p => !p.isChild);
      const chosen = s.citizens.splice(idx >= 0 ? idx : s.citizens.length - 1, 1)[0];
      s.population--;
      removed++;
      record(s, "⛵ " + chosen.name + "이(가) " + reason + " 때문에 다른 거처를 찾아 떠났습니다.");
    }
    s.jobs.gather = Math.min(s.jobs.gather, adultCapacity(s));
    s.jobs.wood = Math.min(s.jobs.wood, Math.max(0, adultCapacity(s) - s.jobs.gather));
    s.sick = clamp(s.sick, 0, s.population);
    return removed;
  }
  function applyCrisisDecision(s, choice, event) {
    if (choice.climateCare) {
      const { kind, duration } = choice.climateCare;
      s.disasterCare[kind] = Math.max(s.disasterCare[kind], s.tick + duration);
    }
    if (choice.floodRepair) {
      s.floodDamageUntil = Math.min(s.floodDamageUntil, s.tick + choice.floodRepair);
      s.water = clamp(s.water + 9);
    }
    if (choice.floodRelocate) {
      s.health = clamp(s.health - .6);
      s.floodDamageUntil = Math.min(s.floodDamageUntil, s.tick + 9);
    }
    if (choice.waterFetch) { s.water = clamp(s.water + choice.waterFetch); s.workStrain = clamp(s.workStrain + .75, 0, 10); }
    if (choice.quietRest) s.workReliefUntil = Math.max(s.workReliefUntil, s.tick + choice.quietRest);
    if (choice.medicine) {
      s.sick = clamp(s.sick - choice.medicine, 0, s.population);
      s.health = clamp(s.health + 4);
    }
    if (choice.sickness) s.sick = clamp(s.sick + choice.sickness, 0, s.population);
    if (choice.groupSettlement) {
      const kind = choice.groupSettlement;
      s.groups[kind] = clamp(s.groups[kind] - 3, 0, 10);
      s.strikes[kind] = 0;
      if (kind === "families") { s.arrivalsPausedUntil = 0; s.familyExitAt = 0; }
      if (kind === "workers" && s.food < 30) s.groups.carers = clamp(s.groups.carers + .55, 0, 10);
      if (kind === "carers" && s.wood < 22) s.groups.workers = clamp(s.groups.workers + .55, 0, 10);
    }
    if (choice.groupStrike) {
      const kind = choice.groupStrike;
      s.groups[kind] = clamp(s.groups[kind] + 1.1, 0, 10);
      s.strikes[kind] = s.tick + 8;
      if (kind === "families") { s.arrivalsPausedUntil = s.tick + 9; s.familyExitAt = s.tick + 6; }
      record(s, ({workers:"노동 주민이 작업을 중단했습니다. 생산량이 줄어듭니다.",
        families:"가족들이 공동활동을 거부하고 새로운 주민의 합류를 멈췄습니다.",
        carers:"돌봄 주민들이 서비스를 중단했습니다. 건강 회복과 전염병 대응에 영향을 줍니다."})[kind]);
    }
    if (choice.groupPartial) {
      const kind = choice.groupPartial;
      s.groups[kind] = clamp(s.groups[kind] - 1.4, 0, 10);
      s.strikes[kind] = s.tick + 3;
      if (kind === "families") { s.arrivalsPausedUntil = s.tick + 3; s.familyExitAt = 0; }
    }
    if (choice.familyDeparture) {
      departResidents(s, choice.familyDeparture, "해결되지 않은 가족들의 요구");
      s.groups.families = clamp(s.groups.families - 3, 0, 10);
      s.strikes.families = 0; s.familyExitAt = 0; s.arrivalsPausedUntil = s.tick + 7;
    }
    if (choice.caretaker) {
      s.mandateRestrictedUntil = s.tick + 7;
      s.groups.workers = clamp(s.groups.workers - 1, 0, 10);
      s.groups.families = clamp(s.groups.families - 1, 0, 10);
      s.groups.carers = clamp(s.groups.carers - 1, 0, 10);
      record(s, "주민의 요구로 7주간 임시 운영 체제에 들어갔습니다. 새 건설과 일반 법률 제정이 제한됩니다.");
    }
    if (choice.openCouncil) {
      s.groups.workers = clamp(s.groups.workers - .9, 0, 10);
      s.groups.families = clamp(s.groups.families - .9, 0, 10);
      s.groups.carers = clamp(s.groups.carers - .9, 0, 10);
      s.civicDebates++;
    }
    if (choice.rejectCouncil) {
      s.groups.workers = clamp(s.groups.workers + .75, 0, 10);
      s.groups.families = clamp(s.groups.families + .75, 0, 10);
      s.groups.carers = clamp(s.groups.carers + .75, 0, 10);
      s.strikes.workers = Math.max(s.strikes.workers, s.tick + 5);
    }
    if (choice.groupChanges) for (const [kind, amount] of Object.entries(choice.groupChanges))
      s.groups[kind] = clamp(s.groups[kind] + amount, 0, 10);
    if (choice.rescueTeam) {
      if ((s.rescueCount || 0) >= 2 || s.population <= 4) {
        s.ended = true;
        s.rescueCount = (s.rescueCount || 0) + 1;
        record(s, "반복된 긴급 구조 이후 공동체가 외부 지원을 받아 섬 운영을 마무리했습니다.");
      } else {
      departResidents(s, 1, "긴급 구조와 지원을 요청하기 위해");
      s.food=clamp(s.food+22,0,s.foodCap);
      s.water=clamp(s.water+28);
      s.health=clamp(s.health+18);
      s.trust=clamp(s.trust-5);
      s.rescueCount=(s.rescueCount||0)+1;
      s.collapseWeeks=0;
      }
    }
    if (choice.localRebuild) {
      s.health=clamp(s.health+14);s.water=clamp(s.water+15);
      s.workReliefUntil=Math.max(s.workReliefUntil,s.tick+6);
      s.collapseWeeks=0;
    }
    if (choice.endSettlement) {
      s.ended=true;
      record(s,"공동체가 외부의 지원을 받아 섬 운영을 마무리했습니다. 지금까지의 선택은 기록에 남습니다.");
    }
    if (choice.disasterResponse) s.disasterUnanswered[choice.disasterResponse] = false;
  }

  function chooseEvent(s) {
    if (s.pending) return null;
    const possible = EVENTS.filter(e => (s.cooldown <= 0 || e.emergency) && allowedEvent(s, e) && (!e.randomChance || random(s) < e.randomChance))
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
    applyCrisisDecision(s, choice, event);

    if (choice.winterPrep != null) s.winterPrepared = choice.winterPrep;
    if (choice.adultGather) {
      if (unused(s) > 0) s.jobs.gather++;
      else if (s.jobs.wood > 0) { s.jobs.wood--; s.jobs.gather++; }
      s.workStrain = clamp(s.workStrain + .7, 0, 10);
    }
    if (choice.crisisWood) {
      if (unused(s) > 0) s.jobs.wood++;
      else if (s.jobs.gather > 1) { s.jobs.gather--; s.jobs.wood++; }
    }
    if (choice.adultVolunteer) {
      s.workStrain = clamp(s.workStrain + 1.6, 0, 10);
      if (choice.adultVolunteer === "food" && unused(s) > 0) s.jobs.gather++;
    }
    if (choice.volunteerWood) { s.wood = clamp(s.wood + 10, 0, s.woodCap); s.workStrain = clamp(s.workStrain + 1.4, 0, 10); }
    if (choice.coldShelter) {
      s.warmth = clamp(s.warmth + (choice.coldShelter === 3 ? 30 : choice.coldShelter === 2 ? 8 : 16));
      if (choice.coldShelter === 1) s.workStrain = clamp(s.workStrain + 1.2, 0, 10);
    }
    if (choice.startChildLabor) {
      s.groups.families = clamp(s.groups.families + 2.5, 0, 10);
      s.childWorkUntil = s.tick + choice.startChildLabor;
      s.childWorkWeeks = 0; s.childLaborReviewed = false;
      rightsHistory(s, "어린이 위험 노동", "시작", "어린이에게 위험한 야외 채집을 지시했습니다.");
    }
    if (choice.stopChildLabor) endChildLabor(s);
    if (choice.continueChildLabor) {
      s.groups.families = clamp(s.groups.families + 1.6, 0, 10);
      s.childWorkUntil = s.tick + choice.continueChildLabor;
      s.childWellbeing = clamp(s.childWellbeing - 9);
      s.education = clamp(s.education - 8);
      s.childWorkWeeks = 0;
      s.childLaborReviewed = false;
      record(s, "위험 작업이 계속되면서 어린이의 건강과 학습 기회가 더 줄었습니다.");
    }
    if (choice.startForcedLabor) {
      s.groups.workers = clamp(s.groups.workers + 2.6, 0, 10);
      s.forcedLaborUntil = s.tick + choice.startForcedLabor;
      s.forcedLaborWeeks = 0; s.laborReviewed = false;
      rightsHistory(s, "강제 노동", "시작", "동의 없는 성인 강제 근무를 시행했습니다.");
    }
    if (choice.endForcedLabor) endForcedLabor(s);
    if (choice.extendForcedLabor) {
      s.groups.workers = clamp(s.groups.workers + 1.5, 0, 10);
      s.forcedLaborUntil = s.tick + choice.extendForcedLabor;
      s.forcedLaborWeeks = 0; s.laborReviewed = false;
    }
    if (choice.startExclusion) {
      s.groups.carers = clamp(s.groups.carers + 2.6, 0, 10);
      s.groups.families = clamp(s.groups.families + 1.0, 0, 10);
      s.exclusionUntil = s.tick + choice.startExclusion;
      s.exclusionWeeks = 0; s.exclusionReviewed = false;
      rightsHistory(s, "일부 주민 배급 제외", "시작", "일할 수 없는 주민 일부를 배급에서 제외했습니다.");
    }
    if (choice.endExclusion) endExclusion(s);
    if (choice.extendExclusion) {
      s.groups.carers = clamp(s.groups.carers + 1.3, 0, 10);
      s.exclusionUntil = s.tick + choice.extendExclusion;
      s.exclusionWeeks = 0; s.exclusionReviewed = false;
    }
    if (choice.jobs && unused(s) > 0) s.jobs[choice.jobs] += Math.min(3, unused(s));
    if (choice.jobs === "gather" && unused(s) === 0 && s.jobs.wood > 1) { s.jobs.wood--; s.jobs.gather++; }
    if (choice.storm) { s.stormUntil = s.tick + choice.storm; s.stormAftermathAt = s.stormUntil; s.stormAftermathChoice = index; }
    if (choice.safeguard) {
      if (s.safeguards[choice.safeguard]) {
        if (choice.safeguard === "workBreak") s.workStrain = clamp(s.workStrain - 2, 0, 10);
        else s.pressure.ration = clamp(s.pressure.ration - 2, 0, 8);
        record(s, "기존 보호 규정의 운영 상태를 점검하고 추가 조정을 했습니다.");
      } else applySafeguard(s, choice.safeguard);
    }
    if (choice.restWeeks) { s.workReliefUntil = s.tick + choice.restWeeks; s.workStrain = clamp(s.workStrain - 2.5, 0, 10); }
    if (choice.pledge) { s.pledges = s.pledges.filter(p => p.kind !== choice.pledge.kind); s.pledges.push({ kind: choice.pledge.kind, title: choice.pledge.title, due: s.tick + choice.pledge.delay, postponements: 0 }); }
    if (choice.fulfillSafeguard) { const key = ({ equal: "fairBonus", effort: "effortCare", needs: "needsAudit" })[s.laws.ration]; if (key && !s.safeguards[key]) applySafeguard(s, key); s.pledges = s.pledges.filter(p => p.kind !== "ration"); s.pressure.ration = 0; }
    if (choice.postponePledge) { const p = s.pledges.find(p => s.tick >= p.due); if (p) { p.due = s.tick + choice.postponePledge; p.postponements = (p.postponements || 0) + 1; } }
    if (choice.abandonPledge) { s.pledges = s.pledges.filter(p => s.tick < p.due); s.pressure.ration = clamp(s.pressure.ration + 2, 0, 8); }
    if (choice.reviewAuthority) { s.authorityUses = 0; s.processReviewAt = s.tick + 19; }
    if (choice.reviewStorage) record(s, "폭풍 이후 비축 규칙의 재검토가 제안되었습니다.");
    if (choice.restoration && s.wood >= 5) { s.wood -= 5; s.food = clamp(s.food + 3, 0, s.foodCap); }
    if (event.id.startsWith("ration_") && event.id.endsWith("_petition")) s.pressure.ration = clamp(s.pressure.ration - 2.8, 0, 8);
    if (event.id === "labor_fatigue") s.pressure.labor = clamp(s.pressure.labor - 3, 0, 8);
    if (event.id === "storm_aftermath") s.stormAftermathAt = 0;
    s.eventsSeen[event.id] = true;
    s.eventsLast[event.id] = s.tick;
    s.pending = null;
    s.cooldown = 5;
    record(s, event.title + " — " + choice.label);
    recordDecision(s, event.title, choice.label);
    return { ok: true, note: choice.note };
  }
  function tick(s) {
    if (s.pending || s.ended) return s;
    s.tick++;
    advanceWinterAndRights(s);
    advanceDisasters(s);
    if (s.stormUntil && s.tick >= s.stormUntil) {
      s.stormUntil = 0;
      const aftermathLoss = s.laws.storage === "reserve" ? 3 : s.laws.storage === "exchange" ? 11 : s.laws.storage === "share" ? 13 : 9;
      s.food = clamp(s.food - aftermathLoss, 0, s.foodCap);
      record(s, "폭풍이 지나가면서 비축 방식에 따라 식량 " + aftermathLoss + "이 소모되었습니다.");
    }
    advanceConsequences(s);
    const r = rates(s);
    s.food = clamp(s.food + r.food, 0, s.foodCap);
    s.water = clamp(s.water + r.water);
    advanceHealthAndFuel(s, r, s.wood + r.wood);
    advanceGroupPressure(s);
    s.collapseWeeks = s.health <= 7 ? (s.collapseWeeks || 0) + 1 : 0;
    if (s.stage >= 2) s.treasury = clamp(s.treasury + r.treasury, 0, 9999);
    if (s.laws.process === "delegate" && s.stage >= 2 && !s.processReviewAt) s.processReviewAt = s.tick + 18;
    if (s.laws.storage === "reserve" && s.food > 75 && s.reserveFood < 28) {
      const packed = Math.min(1.5, s.food - 75, 28 - s.reserveFood);
      s.food -= packed;
      s.reserveFood += packed;
    }
    if (s.laws.storage === "exchange" && s.food >= s.foodCap - 5 && s.wood < s.woodCap) { s.food -= 8; s.wood = clamp(s.wood + 5, 0, s.woodCap); }
    if (s.laws.storage === "share" && s.food >= s.foodCap - 5) { s.food -= 7; s.trust = clamp(s.trust + .32); }
    if (s.food < 15) s.trust = clamp(s.trust - .95);
    else if (s.food < 30) s.trust = clamp(s.trust - .40);
    else if (s.food > 55 && s.trust < 70) s.trust = clamp(s.trust + .10);
    // 높은 신뢰는 영구 고정값이 아니라 계속 관리해야 하는 상태로 만든다.
    if (s.trust > 92) s.trust = clamp(s.trust - .22);
    else if (s.trust > 86) s.trust = clamp(s.trust - .08);
    if (s.treasury < 1 && s.stage >= 2 && (s.buildings.clinic || s.buildings.hall)) s.trust = clamp(s.trust - .24);
    if (s.buildings.clinic && s.treasury >= 1) s.trust = clamp(s.trust + .06);
    if (s.population < capacity(s) && s.food >= 53 && s.water >= 27 && s.trust >= 42 &&
      s.health >= 46 && s.tick >= s.arrivalsPausedUntil && s.mandateRestrictedUntil <= s.tick && s.tick - s.lastBirth >= 7) {
      const newcomer = createCitizen(s.nextCitizenIndex++, "arrival", s.tick);
      s.citizens.push(newcomer);
      s.population++;
      s.lastBirth = s.tick;
      s.arrivalNotice = { citizenId: newcomer.id, name: newcomer.name, origin: newcomer.origin, joinedWeek: s.tick };
      s.arrivalLog.unshift({ ...s.arrivalNotice });
      if (s.arrivalLog.length > 30) s.arrivalLog.length = 30;
      record(s, "⛵ " + newcomer.name + " 합류 — " + newcomer.origin + " 현재 " + s.population + "명.");
      s.arrivalNotice = null;
    }
    if (s.population > 2 && s.food < 1 && s.tick % 10 === 0) {
      s.population--;
      s.sick = clamp(s.sick,0,s.population);
      const adultIndex = s.citizens.findLastIndex(person => !person.isChild);
      const leaving = s.citizens.splice(adultIndex >= 0 ? adultIndex : s.citizens.length - 1, 1)[0];
      if (s.jobs.gather > adultCapacity(s)) s.jobs.gather = adultCapacity(s);
      if (s.jobs.gather + s.jobs.wood > adultCapacity(s)) s.jobs.wood = Math.max(0, adultCapacity(s) - s.jobs.gather);
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
  return Object.freeze({ VERSION, BUILDINGS, LAWS, EVENTS, LAW_KEYS, initial, normalize, capacity, unused, rates, canBuild, build, assign, getLaw, expectedVotes, enact, chooseEvent, resolveEvent, tick, relief, record, clamp, createCitizen, ensureCitizens, residentView, communityPulse, PRIORITY_TITLES,
    policyEffect, ruleProcedure, votePosition, recordDecision, advanceConsequences, applySafeguard,
    availableActions, performAction, adultCapacity, childCount, winterActive, rightsConcerns,
    disasterActive, activeDisasters, groupStatus, DISASTER_NAMES, advanceDisasters, advanceGroupPressure });
});

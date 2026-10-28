(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SettlementCivilization = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const built = (s, id) => s.buildings.some(b => b.type === id);
  const RESOURCES = { fiber: '식물 섬유', thread: '실', cloth: '옷감', timber: '가공 목재' };
  const TOOLS = {
    endScraper: { name: '밀개', kind: 'chipped', uses: 28, finish: 1, cost: { stone: 1 }, needs: 'tools', text: '생활 재료 마무리 · 가죽 1 → 옷감 1 · 쓰임을 단순화한 게임 표현' },
    needle: { name: '뼈바늘', kind: 'bone', uses: 40, sew: 1, cost: { bone: 1 }, needs: 'tools', text: '가죽·실을 이어 의복 마련 · 간석기와 다른 뼈 도구' },
    adze: { name: '자귀', kind: 'ground', uses: 48, timber: 2, cost: { stone: 1 }, needs: 'groundStone', text: '목재를 깎아 구조재로 · 목재 3 → 가공 목재 4' },
    grooveAdze: { name: '홈자귀', kind: 'ground', uses: 56, timber: 3, cost: { stone: 1 }, needs: 'bronze', text: '청동기 목공 전문화 · 목재 3 → 가공 목재 6' },
    sickle: { name: '돌낫', kind: 'ground', uses: 48, grain: 1, fiber: 3, cost: { stone: 1 }, needs: 'bronze', text: '청동기 수확 분기 · 작물과 식물 섬유 확보' },
    triangleKnife: { name: '삼각형돌칼', kind: 'ground', uses: 48, grain: 1, cost: { stone: 1 }, needs: 'bronze', text: '반달돌칼과 다른 형태의 수확 도구 · 동등한 대체 선택' },
    arrowhead: { name: '돌화살촉', kind: 'ground', uses: 36, hunt: 9, cost: { stone: 1, thread: 2, wood: 2 }, needs: 'groundStone', text: '활·줄을 함께 준비 · 먼 토끼 추적 범위 확대' },
    stoneSpear: { name: '돌창', kind: 'ground', uses: 36, hunt: 9, cost: { stone: 1, wood: 2, thread: 1 }, needs: 'groundStone', text: '창자루·결속을 함께 준비 · 수렵 전문 도구' },
    netWeight: { name: '그물추', kind: 'stone', uses: 60, fish: 1, cost: { stone: 1 }, needs: 'survey', text: '그물을 가라앉혀 어로 · 실로 엮은 그물과 함께 사용' },
    spindle: { name: '가락바퀴', kind: 'clay', uses: 60, spin: 1, cost: { clay: 2, wood: 1 }, needs: 'survey', text: '섬유를 꼬아 실 만들기 · 그물·옷감·결속에 공급' },
    whetstone: { name: '숫돌', kind: 'ground', uses: 60, repair: 1, cost: { stone: 1 }, needs: 'groundStone', text: '자동 정비의 돌 소비 절반 · 새 제작보다 적은 재료로 보충' }
  };
  const ARTIFACTS = [
    { source: 'https://www.museum.go.kr/MUSEUM/contents/M0201030300.do?showHallId=760&showroomCode=DM0004', id: 'stoneSword', name: '돌검', needs: 'bronze', text: '무기·권위·부장품의 맥락을 비교해요. 모든 돌검을 사냥 도구로 단정하지 않아요.', question: '물건의 쓰임을 살필 때?', choices: ['모양만 보고 쓰임을 하나로 확정', '출토 맥락과 다른 자료도 함께 비교'], answer: 1 },
    { source: 'https://encykorea.aks.ac.kr/Article/E0020496', id: 'wheelAxe', name: '바퀴날도끼', needs: 'bronze', text: '청동기 유물로 의례·권위 등 여러 해석이 있어요. 생산용 도끼와 구별해 살펴봐요.', question: '권위·의례와 관련된 해석은?', choices: ['자료를 바탕으로 한 해석으로 표시', '확정된 유일한 쓰임이라고 단정'], answer: 0 },
    { source: 'https://encykorea.aks.ac.kr/Article/E0059228', id: 'starAxe', name: '톱니날도끼', needs: 'bronze', text: '형태가 독특한 청동기 석기예요. 의례·권위 등 용도 해석의 근거를 찾아봐요.', question: '닮은 유물을 비교하면?', choices: ['비슷하므로 시대와 쓰임이 모두 같음', '형태·출토 위치·시대를 각각 확인'], answer: 1 }
  ];
  function project(name, cost, time, x, y, effect, needs, homes = 0) { return { name, cost, time, max: 1, sites: [{ x, y }], effect, needs, homes, icon: homes ? '⌂' : '⚒', civilization: true }; }
  const PROJECTS = {
    woodshop: project('목공터', { wood: 12, stone: 8 }, 15, 8, 9, '목재 → 가공 목재 · 구조재와 새 주거 구역', ['tools']),
    spinningHut: project('실·그물 제작터', { wood: 12, clay: 4 }, 15, 6, 13, '섬유 → 실 · 실로 그물·의복 준비', ['survey']),
    sewingHut: project('의복 작업터', { wood: 10, thread: 3 }, 15, 8, 18, '실 → 옷감 · 뼈바늘과 의복 자동 마련', ['spinningHut']),
    fishingHut: project('강가 어로터', { wood: 12, thread: 3 }, 15, 26, 9, '그물·그물추로 자동 어로 · 농경 외 식량원', ['spinningHut']),
    maintenance: project('도구 정비터', { timber: 6, stone: 8 }, 15, 11, 9, '숫돌 정비 · 도구 보충 비용 감소', ['groundStone', 'woodshop']),
    neighborhood: project('강 너머 첫 주거 구역', { timber: 8, wood: 18, food: 12 }, 20, 35, 5, '4가구 · 공동 경작·저장 · 주민은 여유가 있으면 합류', ['granary', 'woodshop'], 4),
    quarter: project('밭과 주거 구역', { timber: 20, stone: 24, food: 20 }, 25, 42, 5, '8가구 추가 · 누적 12가구', ['neighborhood', 'neolithic'], 8),
    township: project('생산 마을 구역', { timber: 40, stone: 40, iron: 6 }, 35, 35, 13, '28가구 추가 · 누적 40가구', ['quarter', 'ironTools'], 28),
    cityward: project('교류 도시 구역', { timber: 80, stone: 80, iron: 12 }, 50, 42, 13, '80가구 추가 · 누적 120가구', ['township', 'dock', 'gayaMarket'], 80),
    capital: project('큰 도시 구역', { timber: 120, wood: 160, stone: 160, iron: 20 }, 65, 38, 24, '180가구 추가 · 누적 300가구', ['cityward', 'agreement'], 180),
    civicMonument: project('도시의 공동 기록 광장', { timber: 100, iron: 12, book: 4 }, 50, 43, 24, '대표 사업 · 도시 관람 기록과 새 터전 계승', ['township', 'goryeoPrint'])
  };
  const RESEARCH = {
    toolbox: { name: '작업별 도구함', facility: 'flintWorkshop', prompt: '여러 도구를 갖춘 작업터는 어떻게 쓸까요?', choices: ['작업에 맞는 도구를 골라 함께 활용', '이름이 다른 도구도 항상 같은 일을 함'], answer: 0, effect: '만들어 본 도구 중 작업에 맞는 도구 자동 장착' },
    production: { name: '가공을 연결하기', facility: 'woodshop', prompt: '목재·실·금속의 반복 가공을 이어가려면?', choices: ['완제품만 기다리고 원료는 확인하지 않기', '원료와 시설을 연결하고 필요한 비축은 남기기'], answer: 1, effect: '목공·방적·어로·금속·인쇄 시설의 자동 생산 연결' },
    construction: { name: '공동 건설', facility: 'maintenance', prompt: '생활을 유지하면서 공사를 이어가려면?', choices: ['공사 자재를 준비하고 생활 비축을 보존', '식량과 연료까지 모두 공사에 쓰기'], answer: 0, effect: '진행 중 공사 자동 지원 · 집을 하나씩 눌러 짓는 반복 감소' }
  };
  const SIDE_JOBS = {
    timber: { name: '목공', resource: 'timber', amount: 3, time: 12, cost: { wood: 3 }, facility: 'woodshop', tool: 'timber' },
    thread: { name: '방적', resource: 'thread', amount: 3, time: 12, cost: { fiber: 2 }, facility: 'spinningHut', tool: 'spin' },
    cloth: { name: '옷감', resource: 'cloth', amount: 1, time: 16, cost: { thread: 2 }, facility: 'sewingHut', tool: 'sew' },
    fishing: { name: '어로', resource: 'food', amount: 4, time: 16, cost: {}, facility: 'fishingHut', tool: 'fish' }
  };
  const FEATURES = {
    council: '공동 비축 정책 선택', fort: '저장 여유 +60', mural: '가공 작업 속도 +10% · 게임 보상',
    dock: '가공 목재로 부족한 점토·광석 자동 교환', craftHall: '목공·옷감 완성품 묶음 +1',
    sillaHall: '도시 주민 생활 소비 10% 완화 · 생활시설 모형', gayaMarket: '철 비축 8을 남기고 식량·점토 자동 교역',
    temple: '공동 공사 지원 +25%', seaRoute: '교역 주기 30초 → 20초', balhaeRelay: '자동 생산 운반 2초 → 1초',
    laterSupply: '교역 후 생활 식량 2분 비축 보호', taebongRecord: '계승 기록 보상 +1', agreement: '공동 공사 지원 +25%',
    goryeoHarbor: '교역 묶음 +1 · 항구와 생산 구역 연결', woodblock: '목판 기록 자동 제작', movableType: '다음 작업부터 활자 조판 · 인쇄 시간 단축'
  };
  function initial() { return { tasks: {}, research: {}, artifacts: [], automatic: true, homes: 0, citizens: 0, settledClock: 0, tradeClock: 0, fiberClock: 0, repairClock: 0, net: false, netUses: 0, feedback: '', reserve: 'balanced', delivered: 0,
    legacy: { runs: 0, points: 0, upgrades: { craft: 0, farm: 0, logistics: 0 }, learned: [], research: [], tools: [], archive: [] } }; }
  function toolAvailable(s, id) {
    const t = TOOLS[id]; if (!t) return false;
    if (t.needs === 'bronze') return s.history.completed.includes('neolithic');
    return Boolean(s.flags[t.needs] || built(s, t.needs));
  }
  function craft(s, id, P) {
    const t = TOOLS[id], p = s.prehistory;
    if (!t || !toolAvailable(s, id)) return { ok: false, reason: '앞선 도구·생활 기술을 먼저 마련해요.' };
    if (p.grinding) return { ok: false, reason: '갈고 있는 도구를 먼저 완성하거나 취소해요.' };
    p.selected = id;
    if (p.tools[id] > 0) return { ok: true };
    if (Object.entries(t.cost).some(([k, n]) => (k === 'bone' ? p.bone : s.resources[k]) < n)) return { ok: false, reason: '도구 재료가 부족해요. 표시된 재료를 먼저 모아요.' };
    for (const [k, n] of Object.entries(t.cost)) { if (k === 'bone') p.bone -= n; else s.resources[k] -= n; }
    if (t.kind === 'ground') p.grinding = { id, progress: 0, cost: { ...t.cost } };
    else { p.tools[id] = t.uses + (p.engraved ? 8 : 0); p.stats.crafted++; }
    return { ok: true, reason: `${t.name}${t.kind === 'ground' ? ' 준비 · 돌을 갈아 완성해요.' : ' 완성 · ' + t.text}` };
  }
  function toolFor(s, task, P) {
    const p = s.prehistory;
    if (!s.civilization?.research.toolbox) return p.tools[p.selected] > 0 && P.TOOLS[p.selected]?.[task] ? p.selected : null;
    return Object.keys(p.tools).filter(id => p.tools[id] > 0 && P.TOOLS[id]?.[task]).sort((a, b) => P.TOOLS[b][task] - P.TOOLS[a][task])[0] || null;
  }
  function unlocked(s, id, gate) { return Boolean(PROJECTS[id] && PROJECTS[id].needs.every(n => gate(s, n)) && (id !== 'neighborhood' || s.prehistory.research.pottery)); }
  function answer(s, id, choice) {
    const r = RESEARCH[id]; if (!r || !built(s, r.facility) || ![0, 1].includes(choice)) return { ok: false, reason: '연결할 시설을 먼저 지어요.' };
    const correct = choice === r.answer;
    if (correct) s.civilization.research[id] = true;
    s.civilization.feedback = correct ? `연구 완료! ${r.effect}` : '현장의 원료·시설·완제품을 다시 살펴봐요. 자원 손실 없이 다시 연결할 수 있어요.';
    return { ok: correct, reason: s.civilization.feedback };
  }
  function artifact(s, id, choice) {
    const a = ARTIFACTS.find(v => v.id === id);
    if (!a || !s.history.completed.includes('neolithic') || ![0, 1].includes(choice)) return { ok: false, reason: '청동기 탐구에서 열려요.' };
    if (choice !== a.answer) return { ok: false, reason: '용도를 단정하지 말고 자료와 해석을 구분해 봐요.' };
    if (!s.civilization.artifacts.includes(id)) s.civilization.artifacts.push(id);
    return { ok: true, reason: '유물 탐구 기록! 도시 전시와 계승 기록에 남아요.' };
  }
  function action(s, id, ctx) {
    const c = s.civilization, p = s.prehistory, P = ctx.P;
    if (id === 'fiber') { const amount = toolFor(s, 'fiber', P) ? P.power(s, 'fiber') * 2 : 2; const n = ctx.add(s, 'fiber', amount); ctx.record(s, 'fiber', n); return { ok: n > 0, reason: '식물 섬유를 모았어요. 실·그물·의복으로 이어져요.' }; }
    if (id === 'spin' && s.resources.fiber >= 2 && toolFor(s, 'spin', P) && s.resources.thread <= ctx.cap(s) - 3) { P.power(s, 'spin'); s.resources.fiber -= 2; ctx.record(s, 'thread', ctx.add(s, 'thread', 3)); return { ok: true }; }
    if (id === 'net' && s.resources.thread >= 2 && !c.net) { s.resources.thread -= 2; c.net = true; c.netUses = 20; return { ok: true, reason: '실로 그물을 엮었어요. 그물추·어로터와 연결해요.' }; }
    if (id === 'sew' && p.leather >= 2 && s.resources.thread >= 1 && toolFor(s, 'sew', P) && !p.clothing) { P.power(s, 'sew'); p.leather -= 2; s.resources.thread--; p.clothing = true; return { ok: true, reason: '손질한 가죽을 실·뼈바늘로 이어 가죽옷을 마련했어요.' }; }
    if (id === 'finish' && p.leather >= 1 && toolFor(s, 'finish', P) && s.resources.cloth < ctx.cap(s)) { P.power(s, 'finish'); p.leather--; ctx.record(s, 'cloth', ctx.add(s, 'cloth', 1)); return { ok: true, reason: '생활 재료 마무리 · 옷감 재고로 추상화한 게임 규칙이에요.' }; }
    if (id === 'timber' && s.resources.wood >= 3 && toolFor(s, 'timber', P)) { const amount = P.TOOLS[toolFor(s, 'timber', P)].timber * 2; if (s.resources.timber > ctx.cap(s) - amount) return { ok: false, reason: '가공 목재를 보관할 자리를 마련해요.' }; P.power(s, 'timber'); s.resources.wood -= 3; ctx.record(s, 'timber', ctx.add(s, 'timber', amount)); return { ok: true }; }
    if (id === 'automatic') { c.automatic = !c.automatic; return { ok: true }; }
    if (['balanced', 'conserve', 'growth'].includes(id) && built(s, 'council')) { c.reserve = id; return { ok: true }; }
    return { ok: false, reason: '필요한 도구·재료·시설을 확인해요.' };
  }
  function recipeReady(s, id, d, ctx) {
    if (!built(s, d.facility) || !(d.needs || []).every(n => ctx.gate(s, n))) return false;
    if (id === 'fishing' && (!s.civilization.net || !(s.prehistory.tools.netWeight > 0))) return false;
    if (d.tool && !toolFor(s, d.tool, ctx.P)) return false;
    return true;
  }
  function recipeTime(s, id, d, method) {
    const base = id === 'printer' && method === 'type' ? 12 : d.time;
    return base / ((built(s, 'mural') ? 1.1 : 1) * (1 + s.civilization.legacy.upgrades.craft * .1) * (1 + Math.sqrt(s.civilization.homes) / 2));
  }
  function output(s, id, d, ctx) {
    let amount = d.amount;
    if (id === 'timber') { const tool = toolFor(s, 'timber', ctx.P); if (tool) amount = ctx.P.TOOLS[tool].timber * 2; }
    if (['timber', 'cloth'].includes(id) && built(s, 'craftHall')) amount++;
    return amount;
  }
  const consumption = s => s.workers.length * 2 + s.civilization.citizens * (built(s, 'sillaHall') ? 1.8 : 2);
  const farmRate = s => s.prehistory.research.pottery && built(s, 'granary') ? s.civilization.homes * 6 * (1 + s.civilization.legacy.upgrades.farm * .1) : 0;
  const transportTime = s => (built(s, 'balhaeRelay') ? 1 : 2) / (1 + s.civilization.legacy.upgrades.logistics * .15);
  function districtRates(s) {
    const n = s.civilization.homes;
    return { wood: built(s, 'woodshop') ? n * 1.5 : 0, stone: s.flags.tools ? n : 0, clay: s.flags.survey ? n * .6 : 0, fiber: built(s, 'spinningHut') ? n * .5 : 0 };
  }
  function rates(s, ctx) {
    const result = Object.fromEntries(Object.keys(ctx.resources).map(k => [k, 0]));
    result.food += farmRate(s);
    for (const [key, rate] of Object.entries(districtRates(s))) result[key] += rate;
    if (built(s, 'sharedGathering') && s.flags.survey) result.fiber += 5;
    if (!s.civilization.automatic || !s.civilization.research.production) return result;
    for (const [id, d] of Object.entries({ ...SIDE_JOBS, ...ctx.jobs })) {
      if (!recipeReady(s, id, d, ctx)) continue;
      const cycles = 60 / (recipeTime(s, id, d, s.history.printMode) + transportTime(s));
      result[d.resource] += cycles * output(s, id, d, ctx);
      for (const [k, n] of Object.entries(d.cost || {})) result[k] -= cycles * n;
    }
    return result;
  }
  function tick(s, dt, ctx) {
    const c = s.civilization, p = s.prehistory, P = ctx.P;
    for (const id of c.legacy.research) {
      if (RESEARCH[id] && built(s, RESEARCH[id].facility)) c.research[id] = true;
      if (P.RESEARCH[id] && built(s, P.RESEARCH[id].facility)) p.research[id] = true;
    }
    // Reuse understood research, while the new city's actual production goals still apply.
    for (const id of c.legacy.learned) if (ctx.history.available(s, id)) { s.history.answers[id] = true; if (!ctx.history.claimReason(s, id)) ctx.history.claim(s, id); }
    if (built(s, 'sharedGathering') && s.flags.survey) { c.fiberClock += dt; if (c.fiberClock >= 12) { c.fiberClock -= 12; ctx.record(s, 'fiber', ctx.add(s, 'fiber', 1)); } }
    if (c.research.construction && s.project) s.project.progress += dt * (1 + (built(s, 'temple') ? .25 : 0) + (built(s, 'agreement') ? .25 : 0));
    for (const [key, rate] of Object.entries(districtRates(s))) ctx.record(s, key, ctx.add(s, key, rate / 60 * dt));
    const food = ctx.add(s, 'food', farmRate(s) / 60 * dt); ctx.record(s, 'food', food);
    if (c.homes * 2 > c.citizens && s.resources.food >= 12 && farmRate(s) >= c.citizens * 2 + 4) { c.settledClock += dt; if (c.settledClock >= 8) { c.settledClock -= 8; c.citizens += 2; s.resources.food -= 4; } }
    else c.settledClock = 0;
    if (p.research.tools && built(s, 'maintenance')) {
      c.repairClock += dt;
      if (c.repairClock >= 1) {
        c.repairClock = 0;
        const id = Object.keys(p.tools).find(k => p.tools[k] <= 0 && p.grinding?.id !== k);
        if (id && s.resources.stone >= 1) { const discount = id !== 'whetstone' && p.tools.whetstone > 0; s.resources.stone -= discount ? .5 : 1; if (discount) p.tools.whetstone--; p.tools[id] = P.TOOLS[id].uses + (p.engraved ? 8 : 0); p.stats.automatic++; }
      }
    }
    for (const [id, d] of Object.entries({ ...SIDE_JOBS, ...ctx.jobs })) {
      let task = c.tasks[id];
      if (!task && c.automatic && c.research.production && recipeReady(s, id, d, ctx)) {
        if (s.resources[d.resource] >= ctx.cap(s) || (d.cost && Object.keys(d.cost).length && s.resources.food < 1)) continue;
        if (Object.entries(d.cost || {}).some(([k, n]) => s.resources[k] < n + (k === 'wood' ? 12 : 0))) continue;
        const method = s.history.printMode;
        task = c.tasks[id] = { phase: 'work', progress: 0, cost: { ...(d.cost || {}) }, amount: output(s, id, d, ctx), method, duration: recipeTime(s, id, d, method) };
        for (const [k, n] of Object.entries(task.cost)) s.resources[k] -= n;
        if (d.tool) P.power(s, d.tool);
      }
      if (!task) continue;
      task.progress += dt;
      if (task.phase === 'work' && task.progress >= task.duration) { task.phase = 'delivery'; task.progress = 0; }
      if (task.phase === 'delivery' && task.progress >= transportTime(s)) {
        const w = id === 'printer' ? { job: 'printer', cargo: { method: task.method === 'type' ? 'typePrinted' : 'woodPrinted' } } : null;
        const n = ctx.add(s, d.resource, task.amount); ctx.record(s, d.resource, n, w); task.amount -= n; c.delivered += n;
        if (task.amount < 1e-8) { delete c.tasks[id]; p.stats.automatic++; if (id === 'fishing') { c.netUses--; if (c.netUses <= 0) { c.net = false; c.netUses = 0; } } }
      }
    }
    if (c.automatic && c.research.production) {
      if (!c.net && built(s, 'fishingHut') && s.resources.thread >= 2) { s.resources.thread -= 2; c.net = true; c.netUses = 20; }
      if (!p.clothing && built(s, 'sewingHut') && p.tools.needle > 0 && s.resources.cloth >= 1) { s.resources.cloth--; p.tools.needle--; p.clothing = true; }
      c.tradeClock += dt;
      if (c.tradeClock >= (built(s, 'seaRoute') ? 20 : 30)) { c.tradeClock = 0; trade(s, ctx); }
    }
  }
  function trade(s, ctx) {
    const c = s.civilization, bonus = built(s, 'goryeoHarbor') ? 1 : 0;
    if (built(s, 'gayaMarket') && s.resources.iron >= 10 && s.resources.food <= ctx.cap(s) - 12) {
      s.resources.iron -= 2; ctx.record(s, 'food', ctx.add(s, 'food', 12)); ctx.record(s, 'clay', ctx.add(s, 'clay', 6 + bonus));
    }
    if (built(s, 'dock') && s.resources.timber >= 10) {
      const key = s.resources.clay < 12 ? 'clay' : built(s, 'ironFurnace') && s.resources.ore < 12 ? 'ore' : null;
      if (key && s.resources[key] <= ctx.cap(s) - 3 - bonus) { s.resources.timber -= 2; ctx.record(s, key, ctx.add(s, key, 3 + bonus)); }
    }
    // Optional food-for-stone route respects the town's selected living reserve.
    const reserve = consumption(s) * (built(s, 'laterSupply') || c.reserve === 'conserve' ? 2 : 1) + (c.reserve === 'growth' ? 12 : 0);
    if (built(s, 'council') && s.resources.food >= reserve + 8 && s.resources.stone < 16) { s.resources.food -= 8; ctx.record(s, 'stone', ctx.add(s, 'stone', 4)); }
  }
  function complete(s, id) { if (PROJECTS[id]?.homes) s.civilization.homes += PROJECTS[id].homes; }
  function inheritanceReason(s) { return built(s, 'civicMonument') && s.history.completed.includes('goryeoPrint') ? '' : '고려의 기록·인쇄와 도시의 공동 기록 광장을 완성하면 새 터전으로 계승할 수 있어요.'; }
  function reward(s) { return Math.floor(s.history.completed.length / 4) + Object.keys(PROJECTS).filter(id => PROJECTS[id].homes && built(s, id)).length + s.civilization.artifacts.filter(id => !s.civilization.legacy.archive.some(a => a.artifacts.includes(id))).length + (built(s, 'taebongRecord') ? 1 : 0); }
  function inherit(s, focus, initialState) {
    if (!['craft', 'farm', 'logistics'].includes(focus) || inheritanceReason(s)) return { ok: false, reason: inheritanceReason(s) || '계승 분야를 선택해요.' };
    const old = s.civilization, next = initialState(), legacy = JSON.parse(JSON.stringify(old.legacy));
    legacy.runs++; legacy.points += reward(s);
    legacy.tools = [...new Set([...legacy.tools, ...Object.keys(s.prehistory.tools)])];
    next.civilization.artifacts = [...old.artifacts];
    legacy.learned = [...new Set([...legacy.learned, ...s.history.completed, ...Object.keys(s.history.answers).filter(id => s.history.answers[id])])];
    legacy.research = [...new Set([...legacy.research, ...Object.keys(old.research).filter(id => old.research[id]), ...Object.keys(s.prehistory.research).filter(id => s.prehistory.research[id])])];
    legacy.archive.unshift({ run: legacy.runs, time: s.time, homes: old.homes, citizens: old.citizens + s.workers.length, chapters: [...s.history.completed], artifacts: [...old.artifacts], buildings: s.buildings.map(b => ({ type: b.type, x: b.x, y: b.y })) });
    legacy.archive = legacy.archive.slice(0, 10); next.civilization.legacy = legacy;
    next.history.reported = [...s.history.reported]; next.milestoneReported = s.milestoneReported;
    if (focus === 'craft') { next.flags.tools = true; next.prehistory.tools.handaxe = 24; next.prehistory.tools.chopper = 24; next.buildings.push({ type: 'flintWorkshop', x: 14, y: 7 }); }
    if (focus === 'farm') { next.flags.survey = true; next.buildings.push({ type: 'groundStone', x: 13, y: 11 }); next.resources.clay = 8; next.resources.food += 12; }
    if (focus === 'logistics') { next.flags.road = true; next.buildings.push({ type: 'warehouse', x: 10, y: 9 }); next.resources.wood += 12; }
    next.events = [{ time: 0, text: `${legacy.runs}번째 도시를 기록하고 새 터전으로 왔어요. 배운 연구와 도시 기록을 계승했어요.` }];
    for (const k of Object.keys(s)) delete s[k]; Object.assign(s, next);
    return { ok: true, reason: '도시 기록과 배움을 보존했어요. 새로운 운영을 시작해 봐요.' };
  }
  function buy(s, id) {
    const l = s.civilization.legacy;
    if (!own(l.upgrades, id) || l.upgrades[id] >= 3 || l.points < l.upgrades[id] + 1) return { ok: false, reason: '계승 점수가 부족하거나 3단계까지 배웠어요.' };
    l.points -= l.upgrades[id] + 1; l.upgrades[id]++; return { ok: true };
  }
  function valid(c, ctx) {
    const num = (n, max = 1e12) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= max;
    const object = v => v && typeof v === 'object' && !Array.isArray(v);
    if (!object(c) || !object(c.tasks) || !object(c.research) || !Object.entries(c.research).every(([id, v]) => own(RESEARCH, id) && typeof v === 'boolean')) return false;
    if (!Array.isArray(c.artifacts) || new Set(c.artifacts).size !== c.artifacts.length || !c.artifacts.every(id => ARTIFACTS.some(a => a.id === id))) return false;
    if (!num(c.homes, 300) || !Number.isInteger(c.homes) || !num(c.citizens, c.homes * 2) || !Number.isInteger(c.citizens) || !num(c.settledClock, 8) || !num(c.tradeClock, 30) || !num(c.fiberClock, 12) || !num(c.repairClock, 1) || !num(c.netUses, 20) || !num(c.delivered) || typeof c.net !== 'boolean' || typeof c.automatic !== 'boolean' || typeof c.feedback !== 'string' || c.feedback.length > 1000 || !['balanced', 'conserve', 'growth'].includes(c.reserve)) return false;
    for (const [id, t] of Object.entries(c.tasks)) {
      const d = SIDE_JOBS[id] || ctx.jobs[id];
      if (!d || !object(t) || !['work', 'delivery'].includes(t.phase) || !num(t.progress, 1e7) || !num(t.amount, 30) || !num(t.duration, 100) || t.duration <= 0 || !['woodblock', 'type'].includes(t.method) || JSON.stringify(t.cost) !== JSON.stringify(d.cost || {})) return false;
    }
    const l = c.legacy;
    if (!object(l) || !num(l.runs, 1e6) || !Number.isInteger(l.runs) || !num(l.points) || !Number.isInteger(l.points) || !object(l.upgrades) || !['craft', 'farm', 'logistics'].every(id => Number.isInteger(l.upgrades[id]) && num(l.upgrades[id], 3))) return false;
    if (!Array.isArray(l.tools) || !l.tools.every(id => own(ctx.P.TOOLS, id))) return false;
    if (!Array.isArray(l.learned) || !l.learned.every(id => ctx.history.byId(id)) || !Array.isArray(l.research) || !l.research.every(id => RESEARCH[id] || ctx.P.RESEARCH[id]) || !Array.isArray(l.archive) || l.archive.length > 10) return false;
    return l.archive.every(a => object(a) && num(a.run, l.runs) && num(a.time) && num(a.homes, 300) && num(a.citizens, 608) && Array.isArray(a.chapters) && a.chapters.every(id => ctx.history.byId(id)) && Array.isArray(a.artifacts) && a.artifacts.every(id => ARTIFACTS.some(v => v.id === id)) && Array.isArray(a.buildings) && a.buildings.length <= 100 && a.buildings.every(b => ctx.projects[b.type] && num(b.x, 48) && num(b.y, 32)));
  }
  return { RESOURCES, TOOLS, ARTIFACTS, PROJECTS, RESEARCH, SIDE_JOBS, FEATURES, initial, toolAvailable, craft, toolFor, unlocked, answer, artifact, action, recipeReady, recipeTime, rates, tick, consumption, complete, inheritanceReason, reward, inherit, buy, valid };
});

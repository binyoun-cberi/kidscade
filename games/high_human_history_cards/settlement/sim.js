(function (root, factory) {
  'use strict';
  const api = factory(typeof module === 'object' && module.exports ? require('./history.js') : root.SettlementHistory, typeof module === 'object' && module.exports ? require('./prehistory.js') : root.SettlementPrehistory, typeof module === 'object' && module.exports ? require('./civilization.js') : root.SettlementCivilization);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SettlementSim = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (History, Prehistory, Civilization) {
  'use strict';
  const VERSION = 4;
  const CAMP = { x: 16, y: 11 };
  const RESOURCES = { wood: '목재', stone: '돌', food: '식량', clay: '점토', ...History.RESOURCES, ...Civilization.RESOURCES };
  const NODES = {
    wood: { x: 6, y: 6, name: '나무숲', hint: '목재는 집과 도구를 만드는 데 써요.' },
    stone: { x: 24, y: 6, name: '바위언덕', hint: '돌은 도구와 시설의 기초가 돼요.' },
    food: { x: 7, y: 16, name: '먹거리 덤불', hint: '식량은 주민의 생활과 새 주민 합류에 필요해요.' },
    clay: { x: 25, y: 15, name: '강가 점토', hint: '강가를 조사하면 점토로 토기를 만들 수 있어요.' }
  };
  const JOBS = {
    gather: { name: '채집', resource: 'food', node: 'food', amount: 3, time: 18, limit: 2 },
    wood: { name: '벌목', resource: 'wood', node: 'wood', amount: 4, time: 20, limit: 3 },
    stone: { name: '채석', resource: 'stone', node: 'stone', amount: 3, time: 20, limit: 3 },
    clay: { name: '점토', resource: 'clay', node: 'clay', amount: 3, time: 20, limit: 2 },
    farm: { name: '농사', resource: 'food', amount: 7, time: 20, limit: 2 },
    builder: { name: '건설·제작', limit: 1 }, ...History.JOBS
  };
  const PROJECTS = {
    hut: { name: '거처 마련', icon: '⌂', cost: { wood: 12, stone: 4 }, time: 15, max: 3, effect: '살 자리 +2 · 막집에서 정착 후 움집으로', sites: [{ x: 13, y: 9 }, { x: 19, y: 9 }, { x: 20, y: 12 }] },
    tools: { name: '뗀석기 만들기', icon: '⚒', cost: { wood: 4, stone: 4 }, time: 10, max: 1, effect: '찍개 등 기초 도구 · 벌목·채석 작업 14초', sites: [{ x: 15, y: 11 }] },
    fire: { name: '모닥불', icon: '♨', cost: { wood: 6, stone: 4 }, time: 12, max: 1, effect: '첫 집과 함께 강가 조사 해금', sites: [{ x: 16, y: 9 }] },
    survey: { name: '강가 조사', icon: '⌕', cost: {}, time: 20, max: 1, effect: '점토 채취·밭·토기 해금', sites: [{ x: 25, y: 13 }] },
    farm: { name: '잡곡밭', icon: '≋', cost: { wood: 12, stone: 6 }, time: 25, max: 2, effect: '농부 자리 +1 · 한 번에 식량 7', sites: [{ x: 10, y: 13 }, { x: 10, y: 16 }] },
    pottery: { name: '토기 만들기', icon: '♜', cost: { clay: 8, wood: 4 }, time: 18, max: 1, effect: '자원별 저장 한도 60 → 120', sites: [{ x: 18, y: 13 }] },
    road: { name: '마을길 연결', icon: '╋', cost: { stone: 10, wood: 4 }, time: 18, max: 1, effect: '주민 이동 속도 +50%', sites: [{ x: 17, y: 11 }] },
    warehouse: { name: '공동 저장고', icon: '▤', cost: { wood: 18, stone: 8, clay: 4 }, time: 25, max: 1, effect: '저장 한도 +120 · 가까운 입고 지점', sites: [{ x: 10, y: 9 }] },
    ...History.PROJECTS, ...Prehistory.PROJECTS, ...Civilization.PROJECTS
  };
  const NAMES = ['나루', '보리', '두리', '하루', '여울', '도담', '산들', '소담'];
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const count = (s, type) => s.buildings.filter(b => b.type === type).length;
  const capacity = s => 2 + count(s, 'hut') * 2 + s.civilization.homes * 2;
  const storageCap = s => (s.flags.pottery ? 120 : 60) + count(s, 'warehouse') * 120 + s.civilization.homes * 20 + (count(s, 'fort') ? 60 : 0);
  const speed = s => s.flags.road ? 2.7 : 1.8;
  const population = s => s.workers.length + s.civilization.citizens;
  function worker(id) {
    return { id, name: NAMES[id - 1], job: 'idle', nextJob: null, phase: 'idle', x: CAMP.x + (id % 3) * .6, y: CAMP.y + .7, progress: 0, cargo: null, depot: null, reserved: null };
  }
  function initial() {
    return { version: VERSION, time: 0, resources: { ...Object.fromEntries(Object.keys(RESOURCES).map(k => [k, 0])), wood: 6, stone: 4, food: 24 },
      workers: [worker(1), worker(2)], buildings: [], flags: { tools: false, survey: false, pottery: false, road: false },
      project: null, manual: { node: null, progress: 0 }, foodStable: 0, recruitStable: 0,
      lastRecruit: -45, era: 'paleolithic', events: [{ time: 0, text: '두 사람의 야영지. 돌을 떼어 첫 도구를 만들어 보세요.' }],
      stats: { manual: 0, delivered: 0, recruits: 0 }, milestoneReported: false, history: History.initial(), prehistory: Prehistory.initial(), civilization: Civilization.initial() };
  }
  function log(s, text) { s.events.unshift({ time: s.time, text }); s.events.length = Math.min(20, s.events.length); }
  function addResource(s, type, amount) {
    const added = Math.max(0, Math.min(amount, storageCap(s) - s.resources[type]));
    s.resources[type] += added;
    return added;
  }
  function unlocked(s, id) {
    if (Civilization.PROJECTS[id]) return Civilization.unlocked(s, id, History.gate);
    if (Prehistory.PROJECTS[id]) return Prehistory.unlocked(s, id);
    if (PROJECTS[id]?.historical) return PROJECTS[id].needs.every(n => History.gate(s, n));
    if (id === 'survey') return count(s, 'hut') > 0 && count(s, 'fire') > 0;
    if (id === 'farm') return s.flags.survey && count(s, 'groundStone') > 0;
    if (id === 'pottery') return s.flags.survey;
    if (id === 'road') return s.flags.tools;
    if (id === 'warehouse') return s.era !== 'paleolithic';
    return Boolean(PROJECTS[id]);
  }
  function finished(s, id) { return ['tools', 'survey', 'pottery', 'road'].includes(id) ? Number(s.flags[id]) : count(s, id); }
  function projectReason(s, id) {
    const d = PROJECTS[id];
    if (!d) return '없는 작업이에요.';
    if (finished(s, id) >= d.max) return '이미 완료했어요.';
    if (!unlocked(s, id)) {
      if (id === 'survey') return '막집과 모닥불을 먼저 마련해요.';
      if (Civilization.PROJECTS[id]) return '먼저 연결하기: ' + Civilization.PROJECTS[id].needs.map(n => PROJECTS[n]?.name || History.byId(n)?.title || n).join(' · ') + (id === 'neighborhood' ? ' · 토기 자동화 연구' : '');
      if (Prehistory.PROJECTS[id]) return ({ sharedGathering: '첫 거처를 먼저 마련해요.', flintWorkshop: '기초 뗀석기를 먼저 만들어요.', hearth: '모닥불을 먼저 마련해요.', granary: '밭·간석기·토기를 먼저 갖춰요.' })[id];
      if (id === 'farm') return '강가 조사와 간석기 다듬기를 먼저 마쳐요.';
      if (id === 'pottery') return '강가 조사를 먼저 마쳐요.';
      if (id === 'road') return '기초 도구를 먼저 만들어요.';
      if (d.historical) return `먼저 연결하기: ${d.needs.map(n => PROJECTS[n]?.name || History.byId(n)?.title || ({ kingdoms: '철기·고조선 배움', northSouth: '삼국·가야 배움', laterThree: '남북국 배움', goryeo: '후삼국 배움' })[n] || n).join(' · ')}`;
      return '신석기 정착 후 지을 수 있어요.';
    }
    if (s.project) return '진행 중인 작업을 먼저 마치거나 취소해요.';
    const missing = Object.entries(d.cost).filter(([k, n]) => s.resources[k] + 1e-8 < n);
    return missing.length ? missing.map(([k, n]) => `${RESOURCES[k]} ${Math.ceil(n - s.resources[k])}개 더 필요`).join(' · ') : '';
  }
  function startProject(s, id) {
    const reason = projectReason(s, id);
    if (reason) return { ok: false, reason };
    const d = PROJECTS[id];
    for (const [k, n] of Object.entries(d.cost)) s.resources[k] -= n;
    s.project = { type: id, progress: 0, site: { ...d.sites[Math.min(finished(s, id), d.sites.length - 1)] }, cost: { ...d.cost } };
    log(s, `${d.name} 시작. 직접 돕거나 건설 담당을 배치하세요.`);
    return { ok: true };
  }
  function cancelProject(s) {
    if (!s.project) return false;
    // Refunds include reserved materials even if storage filled during construction.
    for (const [k, n] of Object.entries(s.project.cost)) s.resources[k] += n;
    log(s, `${PROJECTS[s.project.type].name} 취소. 투입 재료를 돌려받았어요.`);
    s.project = null;
    for (const w of s.workers) if (w.job === 'builder') w.phase = 'idle';
    return true;
  }
  function completeProject(s) {
    const p = s.project;
    if (!p) return;
    if (['tools', 'survey', 'pottery', 'road'].includes(p.type)) s.flags[p.type] = true;
    else s.buildings.push({ type: p.type, ...p.site });
    // One-time exchange goods may temporarily exceed the cap, like cancellation refunds.
    // They must not disappear merely because a farm filled the store during construction.
    if (p.type === 'gayaMarket') { s.resources.food += 12; s.resources.clay += 6; }
    Civilization.complete(s, p.type);
    if (p.type === 'movableType') s.history.printMode = 'type';
    log(s, `${PROJECTS[p.type].name} 완료! ${PROJECTS[p.type].effect}`);
    s.project = null;
    for (const w of s.workers) if (w.job === 'builder') w.phase = 'idle';
  }
  function assigned(s, job, exclude) { return s.workers.filter(w => w.id !== exclude && (w.nextJob || w.job) === job).length; }
  function jobLimit(s, job) {
    if (job === 'idle') return 8;
    if (!JOBS[job] || (job === 'clay' && !s.flags.survey)) return 0;
    if (JOBS[job].facility && (!History.gate(s, JOBS[job].facility) || !(JOBS[job].needs || []).every(n => History.gate(s, n)))) return 0;
    return job === 'farm' ? count(s, 'farm') : JOBS[job].limit;
  }
  function assign(s, id, job) {
    const w = s.workers.find(a => a.id === id);
    if (!w || (job !== 'idle' && !JOBS[job])) return { ok: false, reason: '선택할 수 없는 일이에요.' };
    if (assigned(s, job, id) >= jobLimit(s, job)) return { ok: false, reason: job === 'farm' ? '빈 밭이 필요해요.' : '이 작업의 자리가 모두 찼어요.' };
    if (w.cargo) { w.nextJob = job; return { ok: true, reason: '운반 중인 물품을 입고한 뒤 일을 바꿔요.' }; }
    if (w.reserved) { for (const [k, n] of Object.entries(w.reserved)) s.resources[k] += n; w.reserved = null; }
    w.job = job; w.nextJob = null; w.phase = 'idle'; w.progress = 0;
    return { ok: true };
  }
  function station(s, w) {
    if (w.job === 'builder') return s.project?.site || CAMP;
    if (JOBS[w.job]?.point) return JOBS[w.job].point;
    if (JOBS[w.job]?.facility) return s.buildings.find(b => b.type === JOBS[w.job].facility) || PROJECTS[JOBS[w.job].facility]?.sites[0] || CAMP;
    if (w.job === 'farm') {
      const farmers = s.workers.filter(a => a.job === 'farm');
      return s.buildings.filter(b => b.type === 'farm')[Math.max(0, farmers.findIndex(a => a.id === w.id))] || CAMP;
    }
    return NODES[JOBS[w.job]?.node] || CAMP;
  }
  function depot(s, site) {
    return [CAMP, ...s.buildings.filter(b => b.type === 'warehouse')].reduce((a, b) => distance(a, site) < distance(b, site) ? a : b);
  }
  function workTime(s, job, w) {
    if (job === 'farm' && count(s, 'ironTools')) return 15;
    if (job === 'printer' && (w?.printMethod || s.history.printMode) === 'type') return 12;
    return s.flags.tools && ['wood', 'stone'].includes(job) ? 14 : (JOBS[job]?.time || 1);
  }
  function rateFor(s, w) {
    const d = JOBS[w.nextJob || w.job];
    if (!d?.resource) return 0;
    const virtual = { ...w, job: w.nextJob || w.job };
    const site = station(s, virtual);
    return d.amount * 60 / (workTime(s, virtual.job) + 2 * distance(site, depot(s, site)) / speed(s));
  }
  function rates(s) {
    const result = Object.fromEntries(Object.keys(RESOURCES).map(k => [k, 0]));
    result.food = -Civilization.consumption(s);
    for (const w of s.workers) {
      const d = JOBS[w.nextJob || w.job];
      if (d?.resource) {
        const cycles = rateFor(s, w) / d.amount;
        result[d.resource] += cycles * d.amount;
        for (const [k, n] of Object.entries(d.cost || {})) result[k] -= cycles * n;
      }
    }
    for (const [k, n] of Object.entries(Prehistory.rates(s))) result[k] += n;
    for (const [k, n] of Object.entries(Civilization.rates(s, cityContext))) result[k] += n;
    // Fire tending consumes at most 1 wood per 25/.6 seconds after a hearth is built.
    if (s.prehistory.research.fire && count(s, 'hearth')) result.wood -= 60 * (count(s, 'fire') ? .6 : 1) / 25;
    return result;
  }
  function recruitReason(s) {
    if (s.workers.length >= 8) return '운영 담당은 8명까지예요. 도시 주민은 주거 구역에 자동 합류해요.';
    if (population(s) >= capacity(s)) return '거처를 마련해 살 자리를 늘려요.';
    if (s.resources.food < 12) return '합류를 위한 식량 12개가 필요해요.';
    if (rates(s).food < 2 - 1e-6) return '새 주민의 소비까지 감당할 식량 생산이 필요해요.';
    if (s.recruitStable < 30) return `식량 생산을 ${Math.ceil(30 - s.recruitStable)}초 더 유지해요.`;
    if (s.time - s.lastRecruit < 45) return '다음 주민을 잠깐 기다려요.';
    return '';
  }
  function recruit(s) {
    const reason = recruitReason(s);
    if (reason) return { ok: false, reason };
    s.resources.food -= 12;
    s.workers.push(worker(s.workers.length + 1));
    s.lastRecruit = s.time; s.recruitStable = 0; s.stats.recruits++;
    log(s, `${s.workers.at(-1).name} 합류! 일꾼에서 새 일을 골라 주세요.`);
    return { ok: true };
  }
  function harvest(s, node, work = 1) {
    if (!NODES[node] || (node === 'clay' && !s.flags.survey)) return false;
    if (s.resources[node] >= storageCap(s)) return false;
    if (s.manual.node !== node) s.manual = { node, progress: 0 };
    if (!Number.isFinite(work) || work <= 0) return false;
    const actualTool = Civilization.toolFor(s, node, Prehistory);
    const toolPower = Prehistory.power(s, node, work);
    s.manual.progress += work * Math.max(toolPower, s.flags.tools && ['wood', 'stone'].includes(node) ? 1.5 : 1) * (s.prehistory.warmth < 20 ? .75 : 1);
    let produced = false;
    while (s.manual.progress >= 6) {
      s.manual.progress -= 6;
      const n = addResource(s, node, node === 'wood' && actualTool === 'axe' && toolPower > 1 ? 4 : 3);
      if (node === 'wood') s.prehistory.stats.chopped += n; s.stats.manual += n; History.record(s, node, n); produced ||= n > 0;
    }
    return produced;
  }
  function move(w, target, dt, velocity) {
    const d = distance(w, target), step = velocity * dt;
    if (d <= step) { w.x = target.x; w.y = target.y; return true; }
    w.x += (target.x - w.x) / d * step; w.y += (target.y - w.y) / d * step;
    return false;
  }
  function tickWorker(s, w, dt, support) {
    if (w.job === 'idle') return;
    if (w.cargo) {
      w.phase = 'return';
      if (move(w, w.depot || CAMP, dt, speed(s))) {
        const n = addResource(s, w.cargo.type, w.cargo.amount);
        History.record(s, w.cargo.type, n, w);
        w.cargo.amount -= n; s.stats.delivered += n;
        if (w.cargo.amount < 1e-7) {
          w.cargo = null; w.phase = 'idle';
          if (w.nextJob) { const job = w.nextJob; w.nextJob = null; w.job = job; w.progress = 0; }
        } else w.phase = 'full';
      }
      return;
    }
    if (w.job === 'builder') {
      if (!s.project) { w.phase = 'idle'; return; }
      if (move(w, s.project.site, dt, speed(s))) {
        w.phase = 'work'; s.project.progress += dt;
      } else w.phase = 'walk';
      return;
    }
    const d = JOBS[w.job];
    if (!d?.resource) return;
    if (s.resources[d.resource] >= storageCap(s)) { w.phase = 'full'; return; }
    const site = station(s, w);
    if (!move(w, site, dt, speed(s))) { w.phase = 'walk'; return; }
    if (d.cost && !w.reserved) {
      if (s.resources.food < 1 && !['food', 'gather', 'farm'].includes(w.job)) { w.phase = 'hungry'; return; }
      if (Object.entries(d.cost).some(([k, n]) => s.resources[k] < n + (k === 'wood' && w.job === 'charcoal' ? 12 : 0))) { w.phase = 'material'; return; }
      w.reserved = { ...d.cost }; for (const [k, n] of Object.entries(d.cost)) s.resources[k] -= n;
      if (w.job === 'printer') w.printMethod = s.history.printMode;
    }
    w.phase = 'work';
    w.progress += dt * (support === w.job ? 1.25 : 1);
    if (w.progress >= workTime(s, w.job, w)) {
      w.progress = 0; w.cargo = { type: d.resource, amount: d.amount };
      if (w.job === 'printer') w.cargo.method = w.printMethod === 'type' ? 'typePrinted' : 'woodPrinted';
      w.reserved = null;
      w.printMethod = null;
      w.depot = { ...depot(s, site) }; w.phase = 'return';
    }
  }
  function requirements(s) {
    return [
      { id: 'hut', label: '정착할 거처 두 곳', done: count(s, 'hut') >= 2 },
      { id: 'farm', label: '잡곡밭 한 곳', done: count(s, 'farm') >= 1 },
      { id: 'pottery', label: '토기 만들기', done: s.flags.pottery },
      { id: 'food', label: `식량 안정 ${Math.floor(s.foodStable)}/60초`, done: s.foodStable >= 60 }
    ];
  }
  function tick(s, dt, input = {}) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    // A bounded common step is used by the UI and deterministic tests. No offline payout in v1.
    let remaining = Math.min(dt, 120);
    while (remaining > 1e-8) {
      const step = Math.min(.1, remaining); remaining -= step; s.time += step;
      Prehistory.tick(s, step, lifeContext);
      Civilization.tick(s, step, cityContext);
      if (input.grind) Prehistory.grind(s, step * 2);
      s.resources.food = Math.max(0, s.resources.food - Civilization.consumption(s) / 60 * step);
      if (input.harvest) harvest(s, input.harvest, step * 2);
      if (s.project && input.help) s.project.progress += step;
      for (const w of s.workers) tickWorker(s, w, step, input.support);
      if (s.project && s.project.progress >= PROJECTS[s.project.type].time) completeProject(s);
      const foodRate = rates(s).food;
      s.recruitStable = foodRate >= 2 - 1e-6 && s.resources.food >= 12 ? Math.min(30, s.recruitStable + step) : 0;
      const ready = count(s, 'farm') > 0 && s.flags.pottery && count(s, 'hut') >= 2;
      s.foodStable = ready && foodRate >= -1e-6 && s.resources.food >= population(s) * 2 ? Math.min(60, s.foodStable + step) : 0;
      if (s.era === 'paleolithic' && requirements(s).every(r => r.done)) {
        s.era = 'neolithic'; log(s, '신석기 정착! 농경·저장·주거가 하나의 마을이 되었어요.');
      }
    }
  }
  function restore(raw) {
    // Reject malformed/future saves rather than silently granting or removing progress.
    if (!raw || ![1, 2, 3, VERSION].includes(raw.version) || !Array.isArray(raw.workers) || !Array.isArray(raw.buildings)) return null;
    if (!raw.resources || typeof raw.resources !== 'object' || Array.isArray(raw.resources) || !raw.workers.every(w => w && typeof w === 'object')) return null;
    raw = JSON.parse(JSON.stringify(raw));
    if (raw.version === 1) {
      raw.version = 2; raw.history = History.initial();
      for (const k of Object.keys(History.RESOURCES)) raw.resources[k] = 0;
      raw.workers.forEach(w => { w.reserved = null; });
      if (raw.era === 'neolithic') { raw.history.completed = ['paleolithic', 'neolithic']; raw.history.active = 'bronze'; }
    }
    if (raw.version < 4) {
      for (const k of Object.keys(Civilization.RESOURCES)) if (!(k in raw.resources)) raw.resources[k] = 0;
      raw.civilization = Civilization.initial();
    }
    if (raw.workers.length < 2 || raw.workers.length > 8 || !raw.flags || !raw.resources || !raw.stats || !raw.manual) return null;
    const finite = n => typeof n === 'number' && Number.isFinite(n) && n >= 0;
    if (!['time', 'foodStable', 'recruitStable'].every(k => finite(raw[k])) || !Number.isFinite(raw.lastRecruit)) return null;
    if (!Object.keys(RESOURCES).every(k => finite(raw.resources[k]) && raw.resources[k] <= 100000)) return null;
    if (!['paleolithic', 'neolithic', 'bronze', 'iron'].includes(raw.era) || !Object.values(raw.stats).every(finite)) return null;
    if (!['tools', 'survey', 'pottery', 'road'].every(k => typeof raw.flags[k] === 'boolean')) return null;
    if (!raw.buildings.every(b => (['hut', 'fire', 'farm', 'warehouse'].includes(b.type) || PROJECTS[b.type]?.historical || Prehistory.PROJECTS[b.type] || Civilization.PROJECTS[b.type]) && finite(b.x) && finite(b.y) && b.x <= 48 && b.y <= 32)) return null;
    if (new Set(raw.workers.map(w => w.id)).size !== raw.workers.length) return null;
    if (!raw.workers.every(w => Number.isInteger(w.id) && w.id >= 1 && w.id <= 8 && (w.job === 'idle' || JOBS[w.job]) && (w.nextJob === null || w.nextJob === 'idle' || JOBS[w.nextJob]) && finite(w.x) && finite(w.y) && w.x <= 48 && w.y <= 32 && finite(w.progress) && (!w.cargo || (RESOURCES[w.cargo.type] && finite(w.cargo.amount))) && (!w.depot || (finite(w.depot.x) && finite(w.depot.y) && w.depot.x <= 48 && w.depot.y <= 32)))) return null;
    if (raw.project && (!PROJECTS[raw.project.type] || !finite(raw.project.progress) || !raw.project.site || !finite(raw.project.site.x) || !finite(raw.project.site.y) || raw.project.site.x > 48 || raw.project.site.y > 32 || JSON.stringify(raw.project.cost) !== JSON.stringify(PROJECTS[raw.project.type].cost))) return null;
    if (!finite(raw.manual.progress) || (raw.manual.node !== null && !NODES[raw.manual.node])) return null;
    if (raw.version < 3) raw.prehistory = Prehistory.initial(true);
    raw.version = VERSION;
    if (!Civilization.valid(raw.civilization, cityContext)) return null;
    if (raw.civilization.homes !== raw.buildings.reduce((sum, b) => sum + (Civilization.PROJECTS[b.type]?.homes || 0), 0)) return null;
    if (!Prehistory.valid(raw.prehistory)) return null;
    const h = raw.history;
    if (!h || !History.byId(h.active) || !Array.isArray(h.completed) || new Set(h.completed).size !== h.completed.length || !h.completed.every(id => History.byId(id)) || !h.answers || typeof h.answers !== 'object' || Array.isArray(h.answers) || !Object.entries(h.answers).every(([id, v]) => History.byId(id) && typeof v === 'boolean') || !h.produced || !h.actions || !Array.isArray(h.reported) || !h.reported.every(id => History.byId(id))) return null;
    if (Array.isArray(h.produced) || Array.isArray(h.actions) || typeof h.feedback !== 'string') return null;
    if (!Object.entries(h.produced).every(([k, n]) => RESOURCES[k] && finite(n)) || !Object.entries(h.actions).every(([k, n]) => ['woodPrinted', 'typePrinted'].includes(k) && finite(n))) return null;
    if (!['woodblock', 'type'].includes(h.printMode) || (h.printMode === 'type' && !raw.buildings.some(b => b.type === 'movableType'))) return null;
    for (const w of raw.workers) if (w.reserved && JSON.stringify(w.reserved) !== JSON.stringify(JOBS[w.job]?.cost)) return null;
    const s = JSON.parse(JSON.stringify(raw));
    s.events = (Array.isArray(s.events) ? s.events : []).filter(e => finite(e.time) && typeof e.text === 'string').slice(0, 20);
    s.workers.forEach(w => { w.name = NAMES[w.id - 1]; });
    return s;
  }
  const lifeContext = { add: addResource, record: History.record, cap: storageCap };
  const cityContext = { ...lifeContext, P: Prehistory, history: History, gate: History.gate, resources: RESOURCES, projects: PROJECTS, jobs: History.JOBS };
  const cityAction = (s, id) => Civilization.action(s, id, cityContext);
  const inherit = (s, focus) => Civilization.inherit(s, focus, initial);
  const lifeAction = (s, id, index) => Prehistory.action(s, id, lifeContext, index);
  return { VERSION, History, Prehistory, Civilization, cityAction, inherit, cityContext, lifeAction, CAMP, RESOURCES, NODES, JOBS, PROJECTS, initial, count, capacity, storageCap, population,
    unlocked, finished, projectReason, startProject, cancelProject, assign, assigned, jobLimit, station, depot, workTime,
    rates, rateFor, recruitReason, recruit, harvest, requirements, tick, restore };
});

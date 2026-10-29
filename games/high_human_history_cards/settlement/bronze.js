(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SettlementBronze = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const built = (s, id) => s.buildings.some(b => b.type === id);
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  function project(name, cost, time, x, y, effect, needs) {
    return { name, cost, time, max: 1, sites: [{ x, y }], effect, needs, chapter: 'bronze', icon: '▣', bronzeAge: true };
  }
  const PROJECTS = {
    broadField: project('넓은 공동 밭', { wood: 14, stone: 10 }, 20, 16, 23, '12곳 경작 · 반달돌칼은 익은 이삭, 돌낫은 익은 줄 수확', ['neolithic', 'farm', 'groundStone']),
    mumunStore: project('민무늬 토기와 저장터', { clay: 12, wood: 10 }, 18, 20, 23, '저장 한도 +120 · 수확 묶음을 담아 곡물 처리터로', ['broadField', 'pottery']),
    castingWorkshop: project('거푸집 주조 작업터', { stone: 10, clay: 8, wood: 6 }, 20, 23, 23, '광물 처리 → 합금 → 거푸집 주조를 단계로 보기', ['kiln', 'prospect']),
    barterPlace: project('마을 물물교환터', { wood: 10, stone: 6 }, 15, 12, 23, '남는 식량 8 ↔ 점토 4 · 생활 2분 비축 보호 · 가상 비율', ['mumunStore']),
    riceField: project('낮은 땅의 벼농사 시험', { wood: 10, clay: 6 }, 16, 20, 27, '선택 경작 · 일부 지역의 벼농사 · 잡곡밭만으로도 진행 가능', ['broadField']),
    villageFence: project('공동 울타리 모형', { wood: 16, stone: 6 }, 18, 35, 9, '마을 경계 관찰 · 반복 습격·전투 없는 선택 사업', ['quarter'])
  };
  const RESEARCH = {
    harvest: { name: '수확을 나누어 맡기기', facility: 'broadField', prompt: '익은 이삭과 줄기를 거둘 때 알맞은 연결은?', choices: ['반달돌칼로 이삭을 골라 따고 돌낫으로 줄기를 베기', '토기의 날로 이삭을 베고 청동검으로 모든 밭일 하기'], answer: 0, effect: '등록한 수확 도구로 넓은 밭 자동 수확', need: '도구로 새 밭을 한 번 수확해요.' },
    storage: { name: '베기와 담기를 연결하기', facility: 'mumunStore', prompt: '수확 도구와 토기·저장터는 어떻게 이어질까요?', choices: ['민무늬라서 무늬만으로 생산량이 늘어남', '도구로 수확한 것을 토기에 담아 운반·저장하기'], answer: 1, effect: '수확물 자동 운반·곡물 처리 · 여유분 자동 교환', need: '새 수확물을 담아 한 번 운반해요.' },
    casting: { name: '장인의 반복 제작', facility: 'castingWorkshop', prompt: '청동 제작에 필요한 작업의 연결은?', choices: ['광물에서 금속을 얻고 섞은 뒤 거푸집에 부어 모양 만들기', '구리광석을 보관하면 저절로 청동검으로 바뀜'], answer: 0, effect: '새 일손 없이 청동 묶음 반복 주문 · 비축 목표 선택', need: '청동 한 묶음을 제작·입고해요.' },
    evidence: { name: '자료에서 사회 읽기', facility: 'dolmen', prompt: '크기가 다른 집·무덤과 부장품에서 무엇을 살필까요?', choices: ['큰 무덤의 주인은 모두 왕이고 능력도 더 뛰어남', '사람들 사이 차이를 추론하되 자료만으로 단정하지 않기'], answer: 1, effect: '비교 전시 기록 · 철기와 고조선을 함께 탐방', need: '집·무덤·출토품 세 자료를 관찰해요.' }
  };
  const EVIDENCE = [
    { id: 'homes', name: '집자리 비교', text: '마을의 규모와 집의 형태·크기가 다양해요. 긴 집자리와 둥근 집자리 등은 지역·시기에 따라 달랐어요. 모양만으로 집주인의 신분을 확정할 수는 없어요.' },
    { id: 'tomb', name: '고인돌 관찰', text: '고인돌은 무덤이에요. 큰 돌을 옮긴 공동 노동과 무덤의 규모를 살필 수 있어요. 모든 고인돌의 주인을 왕이라고 단정하지 않아요.' },
    { id: 'goods', name: '출토품 비교', text: '청동 무기·의례품과 석제 농기구를 출토 위치와 함께 비교해요. 무덤의 크기·부장품 차이는 사회 분화를 살피는 자료이며 개인 능력의 차이를 증명하지 않아요.' }
  ];
  const SOURCES = [
    { title: '2022 개정 사회 5-2 공개 수업 자료 · 청동기 생활', url: 'https://qrd.i-scream.co.kr/22USB/22SS502/ebook/Documents/index.html' },
    { title: '우리역사넷 · 옛 초등 사회 교과서 원문', url: 'https://contents.history.go.kr/front/ta/view.do?levelId=ta_e71_0010_0010_0010_0010' },
    { title: '국립중앙박물관 · 청동기·고조선실', url: 'https://www.museum.go.kr/MUSEUM/contents/M0201030300.do?schM=list&showHallId=760&showroomCode=DM0004' },
    { title: '국립춘천박물관 · 청동기 생활과 유물', url: 'https://chuncheon.museum.go.kr/kor/sub02_070101.do?partCode=03' }
  ];
  function initial() { return { crops: Array(12).fill(0), kinds: Array(12).fill('millet'), crop: 'millet', bundles: 0, grain: 0, meals: 0, delivery: null, millClock: 0, harvestClock: 0, tradeClock: 0, research: {}, learned: [], observations: [], plan: 'reserve', feedback: '', stats: { harvested: 0, toolHarvests: 0, carried: 0, processed: 0, exchanged: 0 } }; }
  const open = s => s.history.completed.includes('neolithic');
  const growthTime = (s, index = 0) => s.bronze.kinds[index] === 'rice' ? 60 : 30;
  const cropYield = (s, index) => s.bronze.kinds[index] === 'rice' ? 2 : 1;
  function grainCap(s) { return built(s, 'mumunStore') ? 120 : 36; }
  function storageBonus(s) { return built(s, 'mumunStore') ? 120 : 0; }
  function researchReason(s, id) {
    const b = s.bronze, r = RESEARCH[id];
    if (!r || !open(s) || !built(s, r.facility)) return '먼저 연결할 시설을 마련해요.';
    if (b.research[id]) return '이미 연구했어요.';
    if (id === 'harvest' && !b.stats.toolHarvests || id === 'storage' && !b.stats.carried || id === 'casting' && !(s.history.produced.bronze >= 2) || id === 'evidence' && b.observations.length < 3) return r.need;
    return '';
  }
  function answer(s, id, choice) {
    const why = researchReason(s, id), r = RESEARCH[id];
    if (why || ![0, 1].includes(choice)) return { ok: false, reason: why || '선택지를 골라요.' };
    const ok = choice === r.answer;
    if (ok) s.bronze.research[id] = true;
    s.bronze.feedback = ok ? `연구 완료! ${r.effect}` : '방금 한 작업과 자료를 다시 연결해요. 자원 손실 없이 다시 고를 수 있어요.';
    return { ok, reason: s.bronze.feedback };
  }
  function harvest(s, index, ctx, automatic = false) {
    const b = s.bronze, P = ctx.P;
    if (!open(s) || !built(s, 'broadField') || !Number.isInteger(index) || index < 0 || index >= 12 || b.crops[index] < growthTime(s, index)) return 0;
    const selected = ctx.C.toolFor(s, 'grain', P);
    // New broad fields distinguish cutting from carrying. The existing six-plot
    // Neolithic field keeps its learned three-plot pottery gesture unchanged.
    let targets = [index];
    if (selected === 'sickle') {
      const row = Math.floor(index / 6) * 6;
      const indices = Array.from({ length: 6 }, (_, i) => row + i);
      if (!indices.every(i => b.crops[i] >= growthTime(s, i))) return 0;
      targets = indices;
    } else if (selected || automatic) targets = [index, ...Array.from({ length: 12 }, (_, i) => i).filter(i => i !== index)].filter(i => b.crops[i] >= growthTime(s, i)).slice(0, 3);
    const room = grainCap(s) - b.bundles - b.grain - (b.delivery?.amount || 0);
    let used = 0; targets = targets.filter(i => { if (b.crops[i] < growthTime(s, i) || used + cropYield(s, i) > room) return false; used += cropYield(s, i); return true; });
    if (!targets.length) return 0;
    if (selected) P.power(s, 'grain');
    const amount = targets.reduce((n, i) => n + cropYield(s, i), 0);
    for (const i of targets) { b.crops[i] = 0; b.kinds[i] = b.crop; }
    b.bundles += amount; b.stats.harvested += amount;
    if (selected) b.stats.toolHarvests++;
    if (selected === 'sickle') ctx.record(s, 'fiber', ctx.add(s, 'fiber', targets.length));
    return amount;
  }
  function carry(s) {
    const b = s.bronze;
    if (!b.bundles || b.delivery) return false;
    const amount = Math.min(b.bundles, built(s, 'mumunStore') ? 12 : s.flags.pottery ? 3 : 1);
    b.bundles -= amount; b.delivery = { amount, progress: 0 };
    return true;
  }
  function process(s, ctx) {
    const b = s.bronze;
    if (!built(s, 'granary') || !b.grain || b.meals > 9) return false;
    b.grain--; b.meals += 3; b.stats.processed++; return true;
  }
  function exchange(s, ctx) {
    const reserve = Math.max(12, ctx.C.consumption(s) * 2);
    if (!built(s, 'barterPlace') || s.resources.food < reserve + 8 || s.resources.clay > ctx.cap(s) - 4) return false;
    s.resources.food -= 8; ctx.record(s, 'clay', ctx.add(s, 'clay', 4)); s.bronze.stats.exchanged++; return true;
  }
  function action(s, id, ctx, index = 0) {
    if (typeof id !== 'string') return { ok: false, reason: '열린 작업을 골라요.' };
    if (!open(s)) return { ok: false, reason: '신석기 배움을 기록하면 청동기 생활이 열려요.' };
    const b = s.bronze;
    if (id === 'harvest') { const n = harvest(s, index, ctx); return { ok: n > 0, reason: n ? `수확물 ${n} · 도구로 거두고 토기에 담았어요. 운반하면 곡물 처리로 이어져요.` : '익은 작물·빈 공간을 확인해요. 돌낫은 한 줄이 모두 익으면 쓸 수 있어요.' }; }
    if (id === 'carry') return { ok: carry(s), reason: '수확 묶음을 담아 운반해요. 도착 후 저장 곡물이 돼요.' };
    if (id === 'mill') return { ok: process(s, ctx), reason: '저장 곡물 1 → 식량 3 · 곡물 처리터에서 갈았어요.' };
    if (id === 'exchange') return { ok: exchange(s, ctx), reason: '생활 2분 비축과 보관 공간을 지키며 남는 식량 8을 점토 4로 교환해요. 가상 교환 모형이에요.' };
    if (id === 'millet' || id === 'rice') {
      if (id === 'rice' && !built(s, 'riceField')) return { ok: false, reason: '선택 사업인 낮은 땅의 벼농사 시험을 먼저 마련해요.' };
      if (id === b.crop) return { ok: false, reason: '이미 선택한 작물이에요.' };
      b.crop = id; return { ok: true, reason: '다음 파종을 골랐어요. 자라는 작물은 끝까지 거둔 뒤 새 작물로 바뀌어요. 시간과 수확량은 게임 수치예요.' };
    }
    if (id === 'reserve' || id === 'craft') { b.plan = id; return { ok: true }; }
    if (id.startsWith('observe:')) {
      const key = id.slice(8);
      if (!EVIDENCE.some(e => e.id === key) || !built(s, 'dolmen') || !built(s, 'quarter')) return { ok: false, reason: '12가구 마을과 고인돌 전시 모형을 먼저 마련해요.' };
      if (!b.observations.includes(key)) b.observations.push(key);
      return { ok: true, reason: EVIDENCE.find(e => e.id === key).text };
    }
    if (['charcoal', 'copper', 'tin', 'bronze'].includes(id)) return ctx.C.startOrder(s, id, ctx);
    return { ok: false, reason: '열린 작업을 골라요.' };
  }
  function tick(s, dt, ctx) {
    const b = s.bronze;
    if (!open(s)) return;
    if (b.meals > 0) { const n = ctx.add(s, 'food', b.meals); ctx.record(s, 'food', n); b.meals -= n; }
    for (const id of b.learned) if (built(s, RESEARCH[id].facility)) b.research[id] = true;
    if (built(s, 'broadField')) for (let i = 0; i < 12; i++) b.crops[i] = Math.min(growthTime(s, i), b.crops[i] + dt);
    if (b.delivery) {
      b.delivery.progress += dt;
      if (b.delivery.progress >= 2) { b.grain += b.delivery.amount; b.stats.carried += b.delivery.amount; b.delivery = null; }
    }
    if (b.research.harvest && s.civilization.automatic) {
      b.harvestClock += dt;
      if (b.harvestClock >= 2) { b.harvestClock = 0; const i = b.crops.findIndex((n, i) => n >= growthTime(s, i)); if (i >= 0 && ctx.C.toolFor(s, 'grain', ctx.P)) harvest(s, i, ctx, true); }
    }
    if (b.research.storage && s.civilization.automatic) {
      carry(s); b.millClock += dt;
      if (b.millClock >= 2) { b.millClock = 0; process(s, ctx); }
      b.tradeClock += dt;
      if (b.tradeClock >= 30) { b.tradeClock = 0; exchange(s, ctx); }
    }
    if (b.research.casting && s.civilization.automatic && !s.workers.some(w => (w.nextJob || w.job) === 'bronze') && !s.civilization.tasks.bronze && s.resources.bronze < (b.plan === 'reserve' ? 8 : 24)) ctx.C.startOrder(s, 'bronze', ctx);
  }
  function foodRate(s, ctx) { return s.civilization.automatic && s.bronze.research.harvest && s.bronze.research.storage && built(s, 'broadField') && built(s, 'granary') && ctx.C.toolFor(s, 'grain', ctx.P) ? 72 : 0; }
  function valid(b) {
    const object = v => v && typeof v === 'object' && !Array.isArray(v);
    const num = (v, max) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max;
    if (!object(b) || !['millet', 'rice'].includes(b.crop) || !['reserve', 'craft'].includes(b.plan) || !Array.isArray(b.crops) || b.crops.length !== 12 || !Array.isArray(b.kinds) || b.kinds.length !== 12 || !b.kinds.every(k => ['millet', 'rice'].includes(k)) || !b.crops.every((v, i) => num(v, b.kinds[i] === 'rice' ? 60 : 30))) return false;
    if (!num(b.bundles, 120) || !num(b.grain, 120) || !num(b.meals, 12) || !num(b.millClock, 2) || !num(b.harvestClock, 2) || !num(b.tradeClock, 30)) return false;
    if (b.delivery !== null && (!object(b.delivery) || !Number.isInteger(b.delivery.amount) || !num(b.delivery.amount, 12) || b.delivery.amount < 1 || !num(b.delivery.progress, 2))) return false;
    if (b.bundles + b.grain + (b.delivery?.amount || 0) > 120 || !Number.isInteger(b.bundles) || !Number.isInteger(b.grain)) return false;
    if (!object(b.research) || !Object.entries(b.research).every(([id, v]) => own(RESEARCH, id) && typeof v === 'boolean')) return false;
    if (!Array.isArray(b.learned) || new Set(b.learned).size !== b.learned.length || !b.learned.every(id => own(RESEARCH, id))) return false;
    if (!Array.isArray(b.observations) || new Set(b.observations).size !== b.observations.length || !b.observations.every(id => EVIDENCE.some(e => e.id === id))) return false;
    return typeof b.feedback === 'string' && b.feedback.length <= 1000 && object(b.stats) && ['harvested', 'toolHarvests', 'carried', 'processed', 'exchanged'].every(k => num(b.stats[k], 1e12));
  }
  return { PROJECTS, RESEARCH, EVIDENCE, SOURCES, initial, open, growthTime, grainCap, storageBonus, researchReason, answer, harvest, action, tick, foodRate, valid };
});

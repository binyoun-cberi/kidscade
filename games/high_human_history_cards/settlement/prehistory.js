(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SettlementPrehistory = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  // Tool strength, life, warmth and exchange ratios are game rules, not excavated measurements.
  const TOOLS = {
    handaxe: { name: '주먹도끼', kind: 'chipped', uses: 24, hunt: 6, wood: 3, text: '여러 작업에 쓰는 도구 · 사냥 3회 / 벌목 2회' },
    chopper: { name: '찍개', kind: 'chipped', uses: 24, wood: 6, hunt: 2, text: '찍고 다듬기 · 나무 한 묶음 1회' },
    scraper: { name: '긁개', kind: 'chipped', uses: 20, hide: 1, text: '가죽 손질 · 가죽 조각을 옷감으로' },
    borer: { name: '뚜르개', kind: 'chipped', uses: 20, shell: 1, clothing: 1, text: '구멍 뚫기 · 조개 장신구와 가죽옷' },
    burin: { name: '새기개', kind: 'chipped', uses: 20, engrave: 1, text: '뼈에 무늬 새기기 · 제작 경험으로 내구도 +8' },
    point: { name: '슴베찌르개', kind: 'chipped', uses: 18, hunt: 9, late: true, text: '후기 구석기 창끝의 예 · 사냥 2회' },
    axe: { name: '간 돌도끼', kind: 'ground', uses: 40, wood: 9, text: '돌을 갈아 목공에 사용 · 한 번에 목재 4' },
    hoe: { name: '돌괭이', kind: 'ground', uses: 40, till: 1, text: '밭 일구기 · 작물 성장 기다림 절반' },
    quern: { name: '갈판과 갈돌', kind: 'ground', uses: 40, mill: 1, text: '곡물 갈기 · 곡물 1 → 식량 3' },
    reaping: { name: '반달돌칼', kind: 'ground', uses: 48, bronze: true, grain: 1, text: '청동기 수확 도구 · 익은 이삭 3곳 수확' }
  };
  const PROJECTS = {
    sharedGathering: { name: '공동 채집터', icon: '♧', cost: { wood: 10, stone: 4 }, time: 12, max: 1, effect: '일손 추가 없이 12초마다 목재 2·돌 1·식량 2 자동 채집', sites: [{ x: 5, y: 11 }] },
    flintWorkshop: { name: '석기 작업터', icon: '⚒', cost: { wood: 8, stone: 6 }, time: 12, max: 1, effect: '도구 연구 후 장착 도구 자동 보충 · 돌 1 소비', sites: [{ x: 14, y: 7 }] },
    hearth: { name: '땔감 보관대', icon: '♨', cost: { wood: 8, stone: 4 }, time: 10, max: 1, effect: '불 연구 후 목재를 조금 남기며 땔감 자동 투입', sites: [{ x: 17, y: 9 }] },
    granary: { name: '공동 곡물 처리터', icon: '≋', cost: { wood: 12, stone: 8, clay: 4 }, time: 16, max: 1, effect: '토기 연구 후 작물 수확·곡물 갈기 자동화 · 일손 추가 없음', sites: [{ x: 8, y: 13 }] }
  };
  const RESEARCH = {
    tools: { name: '쓰임에 맞는 도구', facility: 'flintWorkshop', prompt: '나무를 찍고 가죽을 손질할 때 알맞은 연결은?', choices: ['찍개로 나무 작업, 긁개로 가죽 손질', '모든 도구는 쓰임이 같으므로 구별하지 않기'], answer: 0, effect: '닳은 장착 도구 자동 제작 · 부족한 돌만 확보하면 계속 작동', explain: '석기는 모양과 사용 흔적으로 쓰임을 살펴봐요. 구체적인 쓰임에는 여러 해석도 있어요.' },
    fire: { name: '불과 땔감', facility: 'hearth', prompt: '불을 계속 이용하려면 무엇을 연결해야 할까요?', choices: ['돌을 계속 쌓으면 연료 없이 불이 유지됨', '나무 같은 땔감을 마련하고 보충하기'], answer: 1, effect: '땔감 자동 보충 · 목재 2개는 남겨요', explain: '불은 난방과 조리 등에 이용했어요. 게임의 온기 수치는 실제 기온이나 체온이 아니에요.' },
    pottery: { name: '담고 저장하기', facility: 'granary', prompt: '빗살무늬 토기의 쓰임과 연결되는 것은?', choices: ['음식물을 담아 저장하고 조리하기', '토기의 날로 곡식 줄기를 베기'], answer: 0, effect: '밭 자동 수확·곡물 자동 처리 · 식량 순환 연결', explain: '토기는 음식을 담아 저장·조리하는 데 쓰였어요. 범위 담기는 여러 식량을 함께 옮기는 게임 표현이에요.' }
  };
  function initial(legacy = false) {
    return { selected: 'handaxe', tools: {}, grinding: null, warmth: 70, fuel: 35, hide: 0, leather: 0, bone: 0, shell: 0, beads: 0, grain: 0, clothing: false, engraved: false,
      rabbit: { hp: 18, respawn: 0 }, shellWait: 24, shellVisible: false, crops: [0, 0, 0, 0, 0, 0], tilled: 0,
      research: {}, feedback: '', clocks: { gather: 0, mill: 0 }, stats: { hunts: 0, chopped: 0, crafted: 0, collected: 0, automatic: 0 }, legacy };
  }
  const built = (s, id) => s.buildings.some(b => b.type === id);
  function available(s, id) {
    const t = TOOLS[id];
    return Boolean(Object.prototype.hasOwnProperty.call(TOOLS, id) && t && (t.kind !== 'ground' || built(s, 'groundStone')) && (!t.late || s.flags.tools) && (!t.bronze || s.history.completed.includes('neolithic')));
  }
  function unlocked(s, id) {
    if (id === 'sharedGathering') return built(s, 'hut');
    if (id === 'flintWorkshop') return s.flags.tools;
    if (id === 'hearth') return built(s, 'fire');
    if (id === 'granary') return s.flags.pottery && built(s, 'farm') && built(s, 'groundStone');
    return false;
  }
  const maxUses = (s, id) => TOOLS[id].uses + (s.prehistory.engraved ? 8 : 0);
  function craft(s, id) {
    const p = s.prehistory, t = TOOLS[id];
    if (!available(s, id)) return { ok: false, reason: '먼저 필요한 생활 기술을 갖춰요.' };
    if (p.grinding) return { ok: false, reason: '갈고 있는 도구를 먼저 완성하거나 취소해요.' };
    if ((p.tools[id] || 0) > 0) { p.selected = id; return { ok: true, reason: `${t.name} 장착 · 남은 사용 ${Math.ceil(p.tools[id])}회` }; }
    p.selected = id;
    if (s.resources.stone < 1) return { ok: false, reason: '돌 1개를 먼저 모아요.' };
    s.resources.stone--;
    if (t.kind === 'ground') { p.grinding = { id, progress: 0 }; return { ok: true, reason: '돌을 준비했어요. 6번 갈거나 길게 눌러 완성해요.' }; }
    p.tools[id] = maxUses(s, id); p.selected = id; p.stats.crafted++;
    return { ok: true, reason: `${t.name} 완성! ${t.text}` };
  }
  function grind(s, work = 1) {
    const p = s.prehistory;
    if (!p.grinding || !Number.isFinite(work) || work <= 0) return false;
    p.grinding.progress += Math.min(1, work);
    if (p.grinding.progress >= 6 - 1e-8) { const id = p.grinding.id; p.tools[id] = maxUses(s, id); p.selected = id; p.grinding = null; p.stats.crafted++; }
    return true;
  }
  function power(s, task, work = 1) {
    const p = s.prehistory, id = p.selected, t = TOOLS[id];
    if (!Number.isFinite(work) || work <= 0) return 1;
    if (!t?.[task] || !(p.tools[id] > 0)) return 1;
    // Each manual activation wears the tool; final fractional use contributes proportionally.
    const used = Math.min(p.tools[id], work);
    p.tools[id] = Math.max(0, p.tools[id] - used);
    return 1 + (t[task] - 1) * used / work;
  }
  function use(s, task) {
    const p = s.prehistory;
    if (!TOOLS[p.selected]?.[task] || !(p.tools[p.selected] > 0)) return false;
    power(s, task); return true;
  }
  function answer(s, id, choice) {
    const r = RESEARCH[id], p = s.prehistory;
    if (!r || !built(s, r.facility) || ![0, 1].includes(choice)) return { ok: false, reason: '연결할 시설을 먼저 마련해요.' };
    const correct = choice === r.answer;
    if (correct) p.research[id] = true;
    p.feedback = `${correct ? '연구 완료! ' + r.effect : '다시 살펴봐요.'} ${r.explain}`;
    return { ok: correct, reason: p.feedback };
  }
  function add(s, ctx, type, amount) { const n = ctx.add(s, type, amount); ctx.record(s, type, n); return n; }
  function collect(s, index, automatic = false) {
    const p = s.prehistory;
    if (!built(s, 'farm') || index < 0 || index > 5 || p.crops[index] < 20) return 0;
    // Pottery increases carrying capacity; the bronze knife extends harvesting reach.
    const radius = s.flags.pottery ? 1 : 0;
    let indices = [index];
    if (automatic || radius || (p.selected === 'reaping' && p.tools.reaping > 0)) indices = [index - 1, index, index + 1].filter(i => i >= 0 && i < 6);
    const targets = indices.filter(i => p.crops[i] >= 20).slice(0, Math.max(0, 60 - p.grain));
    if (!targets.length) return 0;
    if (!automatic && p.selected === 'reaping') use(s, 'grain');
    for (const i of targets) { p.crops[i] = 0; p.grain++; p.stats.collected++; }
    return targets.length;
  }
  function action(s, id, ctx, index = 0) {
    const p = s.prehistory;
    if (id === 'cancelGrind') {
      if (!p.grinding) return { ok: false };
      s.resources.stone++; p.grinding = null; return { ok: true, reason: '갈기를 취소하고 준비한 돌 1개를 돌려받았어요.' };
    }
    if (id === 'hunt') {
      if (p.rabbit.respawn > 0) return { ok: false, reason: '새 사냥감이 오는 중이에요. 채집도 계속할 수 있어요.' };
      if (s.resources.food >= ctx.cap(s)) return { ok: false, reason: '식량 저장 공간을 먼저 마련해요.' };
      p.rabbit.hp -= power(s, 'hunt');
      if (p.rabbit.hp <= 0) { add(s, ctx, 'food', 6); p.hide = Math.min(60, p.hide + 1); p.bone = Math.min(60, p.bone + 1); p.stats.hunts++; p.rabbit = { hp: 18, respawn: 10 }; return { ok: true, reason: '사냥 성공 · 식량 6, 가죽·뼈 각 1. 먹거리는 사냥·채집으로 얻어요.' }; }
      return { ok: true, reason: `토끼 추적 중 · 남은 작업 ${Math.ceil(p.rabbit.hp)}/18` };
    }
    if (id === 'fuel') {
      if (p.fuel > 65) return { ok: false, reason: '땔감이 충분해요.' };
      if (s.resources.wood < 1) return { ok: false, reason: '나무를 모아 땔감을 마련해요.' };
      s.resources.wood--; p.fuel = Math.min(90, p.fuel + 25); return { ok: true, reason: '목재 1개를 땔감으로 · 온기가 다시 올라요.' };
    }
    if (id === 'shell') {
      if (!p.shellVisible) return { ok: false, reason: '강가에서 조개를 찾는 중이에요.' };
      p.shellVisible = false; p.shellWait = 32; p.shell = Math.min(60, p.shell + 1); return { ok: true, reason: '조개껍데기 발견! 뚜르개로 장신구를 만들 수 있어요.' };
    }
    if (id === 'bead' && p.shell > 0 && p.beads < 60 && use(s, 'shell')) { p.shell--; p.beads++; return { ok: true, reason: '조개 장신구 +1 · 게임 속 교환 재료예요. 구석기 화폐를 재현한 것은 아니에요.' }; }
    if (id === 'exchange' && p.beads > 0) {
      if (!available(s, p.selected) || TOOLS[p.selected].kind !== 'chipped' || p.tools[p.selected] > 0) return { ok: false, reason: '교환할 닳은 뗀석기를 먼저 선택해요.' };
      p.beads--; p.tools[p.selected] = maxUses(s, p.selected); p.stats.crafted++; return { ok: true, reason: '장신구 1개로 선택한 뗀석기 보충 · 게임 속 가상 교환' };
    }
    if (id === 'hide' && p.hide > 0 && p.leather <= 58 && use(s, 'hide')) { p.hide--; p.leather += 2; return { ok: true, reason: '가죽 손질 · 옷감 2개를 얻었어요.' }; }
    if (id === 'clothing' && !p.clothing && p.leather >= 2 && use(s, 'clothing')) { p.leather -= 2; p.clothing = true; return { ok: true, reason: '가죽옷 마련 · 식는 속도 절반. 실제 제작 공정은 단순화했어요.' }; }
    if (id === 'engrave' && !p.engraved && p.bone > 0 && use(s, 'engrave')) { p.bone--; p.engraved = true; return { ok: true, reason: '뼈 무늬 기록 · 다음 제작부터 내구도 +8 · 게임 보상' }; }
    if (id === 'till' && built(s, 'farm') && use(s, 'till')) { p.tilled = 45; return { ok: true, reason: '밭 일구기 · 45초 동안 작물 성장 2배' }; }
    if (id === 'grain') { const n = collect(s, index); return { ok: n > 0, reason: n ? `익은 곡물 ${n}곳 수확${s.flags.pottery ? ' · 토기에 함께 담기' : ''}` : '익은 곡식을 기다리거나 곡물 저장 공간을 비워요.' }; }
    if (id === 'mill' && p.grain > 0 && s.resources.food <= ctx.cap(s) - 3) {
      const amount = p.selected === 'quern' && p.tools.quern > 0 ? 3 : 1;
      if (amount === 3) use(s, 'mill'); p.grain--; add(s, ctx, 'food', amount); return { ok: true, reason: `곡물 1 → 식량 ${amount}${amount === 3 ? ' · 갈판과 갈돌로 처리' : ' · 손으로 처리'}` };
    }
    return { ok: false, reason: '알맞은 도구를 장착하고 필요한 재료를 확인해요.' };
  }
  function tick(s, dt, ctx) {
    const p = s.prehistory;
    p.fuel = Math.max(0, p.fuel - dt * (built(s, 'fire') ? .6 : 1));
    p.warmth = Math.max(0, Math.min(100, p.warmth + dt * (p.fuel > 0 ? .6 : p.clothing ? -.1 : -.2)));
    if (p.research.fire && built(s, 'hearth') && p.fuel <= 20 && s.resources.wood >= 3) { s.resources.wood--; p.fuel += 25; }
    if (p.research.tools && built(s, 'flintWorkshop') && Object.prototype.hasOwnProperty.call(p.tools, p.selected) && !(p.tools[p.selected] > 0) && !p.grinding && available(s, p.selected) && s.resources.stone >= 1) {
      s.resources.stone--; p.tools[p.selected] = maxUses(s, p.selected); p.stats.automatic++;
    }
    if (built(s, 'sharedGathering')) {
      p.clocks.gather += dt;
      if (p.clocks.gather >= 12) { p.clocks.gather -= 12; for (const [k, n] of Object.entries({ wood: 2, stone: 1, food: 2 })) add(s, ctx, k, n); p.stats.automatic++; }
    }
    p.rabbit.respawn = Math.max(0, p.rabbit.respawn - dt);
    if (!p.shellVisible) { p.shellWait = Math.max(0, p.shellWait - dt); if (p.shellWait === 0) p.shellVisible = true; }
    if (built(s, 'farm')) for (let i = 0; i < 6; i++) p.crops[i] = Math.min(20, p.crops[i] + dt * (p.tilled > 0 ? 2 : 1));
    p.tilled = Math.max(0, p.tilled - dt);
    if (p.research.pottery && built(s, 'granary')) {
      const ripe = p.crops.findIndex(n => n >= 20);
      if (ripe >= 0) collect(s, ripe, true);
      p.clocks.mill += dt;
      if (p.clocks.mill >= 4) { p.clocks.mill = 0; if (p.grain > 0 && s.resources.food <= ctx.cap(s) - 3) { p.grain--; add(s, ctx, 'food', 3); p.stats.automatic++; } }
    }
  }
  function rates(s) { return { wood: built(s, 'sharedGathering') ? 10 : 0, stone: built(s, 'sharedGathering') ? 5 : 0, food: (built(s, 'sharedGathering') ? 10 : 0) + (built(s, 'granary') && s.prehistory.research.pottery ? 45 : 0), clay: 0 }; }
  function valid(p) {
    const num = (n, max) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= max;
    if (!p || !Object.prototype.hasOwnProperty.call(TOOLS, p.selected) || !p.tools || typeof p.tools !== 'object' || Array.isArray(p.tools) || !Object.entries(p.tools).every(([k, n]) => TOOLS[k] && num(n, TOOLS[k].uses + 8))) return false;
    if (!['hide', 'leather', 'bone', 'shell', 'beads', 'grain'].every(k => num(p[k], 60)) || !num(p.warmth, 100) || !num(p.fuel, 90) || !num(p.tilled, 45) || !num(p.shellWait, 32)) return false;
    if (!p.rabbit || !num(p.rabbit.hp, 18) || !num(p.rabbit.respawn, 10) || !Array.isArray(p.crops) || p.crops.length !== 6 || !p.crops.every(n => num(n, 20))) return false;
    if (!p.research || typeof p.research !== 'object' || Array.isArray(p.research) || !Object.entries(p.research).every(([k, v]) => RESEARCH[k] && typeof v === 'boolean') || typeof p.feedback !== 'string' || p.feedback.length > 1000) return false;
    if (!['clothing', 'engraved', 'shellVisible', 'legacy'].every(k => typeof p[k] === 'boolean') || !p.clocks || !num(p.clocks.gather, 12) || !num(p.clocks.mill, 4)) return false;
    if (!p.stats || !['hunts', 'chopped', 'crafted', 'collected', 'automatic'].every(k => num(p.stats[k], 1e12))) return false;
    return !p.grinding || (TOOLS[p.grinding.id]?.kind === 'ground' && num(p.grinding.progress, 6));
  }
  return { TOOLS, PROJECTS, RESEARCH, initial, available, unlocked, craft, grind, power, answer, action, tick, rates, valid };
});

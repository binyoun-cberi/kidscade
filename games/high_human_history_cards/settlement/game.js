(function () {
  'use strict';
  const S = window.SettlementSim, $ = id => document.getElementById(id);
  const H = S.History;
  const GAME_ID = 'high_human_history_cards';
  const SAVE_KEY = window.KidscadeGame?.storageKey(GAME_ID, 'settlement-v1') || 'kidscade_game_v1:high_human_history_cards:settlement-v1';
  const icons = { fiber: '🌿', thread: '🧵', cloth: '🧶', timber: '🪵', wood: '🪵', stone: '🪨', food: '🌾', clay: '🏺', ...H.ICONS };
  const baseResources = Object.keys(S.NODES);
  let lessonView = false;
  const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  let state = S.initial(), saveBlocked = false, paused = false, tab = 'life', selected = 'wood', signature = '';
  let input = {}, pointerOrigin = null, heldPointer = null, last = performance.now(), uiClock = 0, saveClock = 0, toastTimer;
  let manualCredit = 1, creditTime = performance.now();
  let completedShown = false;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  try {
    const raw = window.KidscadeStorage ? window.KidscadeStorage.getRaw(SAVE_KEY, null) : localStorage.getItem(SAVE_KEY);
    if (raw !== null) {
      const restored = S.restore(JSON.parse(raw));
      if (!restored) saveBlocked = true;
      else { state = restored; if (state.prehistory.legacy) tab = 'build'; completedShown = state.era !== 'paleolithic'; }
    }
  } catch (_) { saveBlocked = true; }
  const view = window.SettlementView.create($('world'));
  function sound(name) { window.KidscadeGame?.sound(name); }
  function toast(text) { clearTimeout(toastTimer); $('toast').textContent = text; $('toast').classList.add('show'); toastTimer = setTimeout(() => $('toast').classList.remove('show'), 2600); }
  function save(show = false) {
    if (saveBlocked) { $('saveStatus').textContent = '저장 읽기 실패 · 기존 기록 보존'; if (show) toast('기존 저장을 읽지 못해 덮어쓰지 않았어요.'); return false; }
    try {
      const value = JSON.stringify(state);
      const ok = window.KidscadeStorage ? window.KidscadeStorage.setRaw(SAVE_KEY, value) : (localStorage.setItem(SAVE_KEY, value), true);
      if (!ok) throw new Error('unavailable');
      $('saveStatus').textContent = '자동 저장됨'; if (show) toast('이 마을을 저장했어요.'); return true;
    } catch (_) { $('saveStatus').textContent = '저장하지 못했어요'; if (show) toast('저장 공간을 확인해 주세요.'); return false; }
  }
  function stopHolding() { input = {}; heldPointer = null; pointerOrigin = null; }
  function spendCredit() {
    const now = performance.now();
    manualCredit = Math.min(1, manualCredit + Math.max(0, now - creditTime) / 1000 * 2); creditTime = now;
    if (manualCredit >= 1 - 1e-8) { manualCredit = 0; return true; }
    return false;
  }
  function manualWork(node) { if (spendCredit()) S.harvest(state, node, 1); }
  function frozen() { return paused || document.hidden || Boolean(document.querySelector('dialog[open]')); }
  function setPaused(value) { paused = value; stopHolding(); render(); save(); }
  function changeTab(value) { tab = value; signature = ''; render(); }
  function costText(d) { return Object.entries(d.cost).map(([k, n]) => `${icons[k]} ${n}`).join(' · ') || '재료 없이 조사'; }
  function formatTime(seconds) { return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`; }
  $('resources').innerHTML = baseResources.map(k => `<div class="resource"><span class="resource-icon" aria-hidden="true">${icons[k]}</span><div><small>${S.RESOURCES[k]}</small><strong id="amount-${k}">0</strong></div><div id="rate-${k}" class="rate"></div></div>`).join('');
  $('selection').innerHTML = `<div class="node-picker" aria-label="채집할 자원">${Object.keys(S.NODES).map(k => `<button type="button" data-node="${k}" aria-pressed="${k === selected}">${icons[k]} ${S.RESOURCES[k]}</button>`).join('')}</div><div class="selection-copy"><h3 id="selectionTitle"></h3><p id="selectionText"></p><div class="mini-progress"><i id="manualProgress"></i></div></div><div class="selection-actions"><button id="harvestBtn" class="harvest-btn" type="button">꾹 눌러 채집</button><button id="supportBtn" type="button">주민 작업 돕기</button></div>`;
  function panelMarkup() {
    const p = state.project;
    const projectHTML = p ? `<section class="project-card"><h3>${S.PROJECTS[p.type].name} 진행 중 <span id="projectPercent"></span></h3><p>재료는 이미 투입했어요. 취소하면 돌려받아요.</p><div class="mini-progress"><i id="projectProgress"></i></div><div class="project-actions"><button type="button" id="helpProject">꾹 눌러 작업 돕기</button><button type="button" id="assignBuilder">일꾼 배치</button><button type="button" id="cancelProject">취소</button></div></section>` : '';
    if (tab === 'city') return window.SettlementCivilizationUI.markup(state, projectHTML);
    if (tab === 'life') return projectHTML + window.SettlementPrehistoryUI.markup(state);
    if (tab === 'history') return window.SettlementHistoryUI.markup(state, lessonView, projectHTML);
    if (tab === 'production') return window.SettlementCivilizationUI.production(state, projectHTML) + window.SettlementHistoryUI.production(state, icons, '');
    if (tab === 'workers') {
      return '<p class="panel-intro">한 사람은 한 가지 일을 해요. 물품을 운반 중이라면 입고한 뒤 새 일을 시작해요.</p>' + state.workers.map(w => `<article class="worker"><div class="worker-head"><span class="worker-face" aria-hidden="true">♟</span><h3>${escape(w.name)}</h3><small id="worker-phase-${w.id}"></small></div><label><span class="sr-only">${escape(w.name)}의 일</span><select data-worker="${w.id}"><option value="idle">쉬기 · 새 일 기다리기</option>${Object.entries(S.JOBS).map(([k, d]) => `<option value="${k}">${d.name}</option>`).join('')}</select></label><p id="worker-info-${w.id}"></p></article>`).join('');
    }
    return `<p class="panel-intro">거처·도구·작업장을 연결해요. 역사 메뉴에서 생활과 자료를 이어 보고, 생산 메뉴에서 가공 재고를 확인해요.</p>${projectHTML}${Object.entries(S.PROJECTS).filter(([id, d]) => !d.historical || S.unlocked(state, id) || d.chapter === state.history.active).map(([id, d]) => `<article id="build-${id}" class="build-card"><span class="build-icon" aria-hidden="true">${d.icon}</span><div><h3>${d.name}</h3><p>${d.effect}</p><div class="cost">${costText(d)} · ${d.time}초 작업</div></div><button type="button" data-project="${id}">시작</button><small id="reason-${id}" class="build-reason"></small></article>`).join('')}`;
  }
  function goal() {
    if (state.history.completed.includes('goryeoPrint')) return { title: '도시를 키우고 다음 터전으로', text: S.Civilization.inheritanceReason(state) || '도시를 기록하고 새 터전으로 계승하거나, 이 도시를 더 키울 수 있어요.', action: 'city' };
    if (state.history.completed.includes('neolithic') && !state.civilization.research.production) return { title: '연결한 시설이 내 일을 대신해요', text: '도시 메뉴에서 목공터를 마련하고 가공을 연결하기를 연구해요. 실·목재·금속·인쇄가 새 일손 없이 이어져요.', action: 'city' };
    if (state.history.completed.includes('neolithic') && !state.civilization.homes) return { title: '강 너머로 마을을 넓혀요', text: '목공·곡물 처리와 첫 주거 구역을 연결하면 경작·저장·기초 생산이 함께 커져요.', action: 'city' };
    if (state.era !== 'paleolithic') { const c = H.byId(state.history.active); return { title: `${c.title} · 생활과 배움 잇기`, text: c.goals.find(g => !H.goalDone(state, g))?.label || '자료를 읽고 생각 잇기를 한 뒤 배움을 기록해요.', action: 'history' }; }
    if (state.resources.food < 4) return { title: '먹거리를 먼저 마련해요', text: '사냥·채집은 언제든 다시 시작할 수 있어요. 도구로 사냥을 편하게 하거나 공동 채집터를 마련해요.', node: 'food', action: 'life' };
    if (state.prehistory.stats.crafted === 0) return { title: '돌 하나로 달라지는 생활', text: '생활 메뉴에서 돌 1개로 주먹도끼나 찍개를 만들어요. 사냥과 벌목의 클릭 수가 줄어들어요.', action: 'life' };
    if (S.count(state, 'hut') < 1) return { title: '첫 거처를 마련해요', text: '목재 12개와 돌 4개로 막집을 마련해요. 정착 후에는 움집으로 표현돼요.', action: 'build' };
    if (!S.count(state, 'sharedGathering')) return { title: '내 클릭을 대신하는 채집', text: '공동 채집터를 지으면 목재·돌·식량이 자동으로 모여요. 주민을 새로 배치하지 않아도 돼요.', action: 'life' };
    if (!state.flags.tools) return { title: '우리의 첫 도구', text: '돌을 떼어 만든 기초 석기로 벌목·채석에 걸리는 시간을 줄여요.', action: 'build' };
    if (!S.count(state, 'fire')) return { title: '모닥불 곁에 모여요', text: '움집과 모닥불을 갖추면 강가를 조사할 수 있어요.', action: 'build' };
    if (!state.flags.survey) return { title: '강가에 무엇이 있을까요?', text: '강가 조사에서 씨앗·점토와 간석기 사용을 배워 농경·토기를 준비해요.', action: 'build' };
    if (!S.count(state, 'groundStone')) return { title: '돌을 갈아 쓰임에 맞게', text: '간석기를 다듬어 농경용 도구를 준비해요. 뗀석기와 만드는 방법을 비교해 보세요.', action: 'build' };
    if (!S.count(state, 'farm')) return { title: '먹거리를 기르는 생활', text: '잡곡밭을 만들면 농부 한 명이 더 많은 주민의 먹거리를 맡을 수 있어요.', action: 'build' };

    if (!state.flags.pottery) return { title: '남는 것을 담아 두기', text: '강가에서 점토를 모아 토기를 만들어요. 저장 한도가 120개로 늘어나요.', node: 'clay', action: 'build' };
    if (!S.count(state, 'granary') || !state.prehistory.research.pottery) return { title: '밭에서 식탁까지 자동으로', text: '곡물 처리터를 짓고 토기의 쓰임을 연결해 자동 수확·곡물 처리를 열어요.', action: 'life' };
    if (S.count(state, 'hut') < 2) return { title: '집들이 모여 마을로', text: '두 번째 움집을 세워 정착할 자리를 넓혀요.', action: 'build' };
    return { title: '안정된 생활을 이어 가요', text: '식량 순증가를 0 이상으로, 1분 소비량만큼의 식량을 60초 유지하면 신석기 정착이에요.', action: 'workers' };
  }
  function render() {
    const r = S.rates(state), cap = S.storageCap(state);
    const life = state.prehistory;
    $('campWarmth').textContent = `🔥 온기 ${Math.round(life.warmth)}/100 · 땔감 ${Math.ceil(life.fuel)}`;
    $('equippedTool').textContent = `⚒ ${S.Prehistory.TOOLS[life.selected].name} · ${Math.ceil(life.tools[life.selected] || 0)}회`;
    for (const k of baseResources) {
      $(`amount-${k}`).innerHTML = `${Math.floor(state.resources[k] + 1e-7)} <em>/ ${cap}</em>`;
      const el = $(`rate-${k}`); el.classList.toggle('negative', r[k] < -.01);
      el.innerHTML = `${r[k] >= 0 ? '+' : ''}${r[k].toFixed(1)}<span>예상 순증가 / 분</span>`;
    }
    $('eraBadge').textContent = ({ paleolithic: '구석기 야영지', neolithic: '신석기 정착 마을', bronze: '청동기 생산 모형', iron: '철기·역사 탐방 모형' })[state.era];
    $('timeLabel').textContent = `마을의 시간 · ${formatTime(state.time)}`;
    $('population').innerHTML = `${S.population(state)} <span>/ ${S.capacity(state)}명</span>`;
    const recruitWhy = S.recruitReason(state);
    $('recruitBtn').disabled = Boolean(recruitWhy);
    $('recruitHint').textContent = recruitWhy || '식량 12개 · 합류 뒤 식량 소비 +2/분';
    $('pauseBtn').textContent = paused ? '▶ 계속' : 'Ⅱ 멈춤'; $('pausedLabel').hidden = !paused;
    document.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-pressed', b.dataset.tab === tab));
    document.querySelectorAll('[data-node]').forEach(b => { b.setAttribute('aria-pressed', b.dataset.node === selected); b.disabled = b.dataset.node === 'clay' && !state.flags.survey; });
    $('selectionTitle').textContent = `${icons[selected]} ${S.NODES[selected].name}`;
    $('selectionText').textContent = state.resources[selected] >= cap ? '보관할 자리가 가득 찼어요. 재료를 쓰거나 저장 공간을 늘려요.' : S.NODES[selected].hint;
    $('manualProgress').style.width = `${state.manual.node === selected ? state.manual.progress / 6 * 100 : 0}%`;
    $('harvestBtn').disabled = paused || state.resources[selected] >= cap || (selected === 'clay' && !state.flags.survey);
    const supportJob = selected === 'food' ? (state.workers.some(w => w.job === 'farm') ? 'farm' : 'gather') : selected;
    $('supportBtn').disabled = paused || !state.workers.some(w => w.job === supportJob);
    $('supportBtn').dataset.support = supportJob;
    $('supportBtn').textContent = '꾹 눌러 주민 돕기';
    const sig = `${tab}:${state.workers.length}:${state.project?.type || ''}:${state.buildings.length}:${JSON.stringify(state.flags)}:${state.era}:${state.history.active}:${state.history.completed.join(',')}:${JSON.stringify(state.history.answers)}:${state.history.feedback}:${lessonView}:${state.history.printMode}:${H.byId(state.history.active).goals.map(g => H.goalDone(state, g)).join(',')}:${state.prehistory.stats.crafted > 0}:${state.civilization.homes}:${state.civilization.legacy.runs}`;
    if (sig !== signature) { $('panel').innerHTML = panelMarkup(); signature = sig; }
    if (tab === 'city') window.SettlementCivilizationUI.update(state, paused);
    else if (tab === 'life') window.SettlementPrehistoryUI.update(state, paused);
    else if (tab === 'build') {
      for (const id of Object.keys(S.PROJECTS)) {
        const why = S.projectReason(state, id), done = S.finished(state, id) >= S.PROJECTS[id].max;
        const b = document.querySelector(`[data-project="${id}"]`);
        if (!b) continue;
        b.disabled = Boolean(why) || paused; b.textContent = done ? '완료' : '시작';
        $(`reason-${id}`).textContent = done ? '' : why;
        $(`build-${id}`).classList.toggle('locked', !S.unlocked(state, id));
      }
    } else if (tab === 'workers') {
      for (const w of state.workers) {
        const select = document.querySelector(`[data-worker="${w.id}"]`);
        select.value = w.nextJob || w.job; select.disabled = paused;
        for (const o of select.options) o.disabled = o.value !== select.value && S.assigned(state, o.value, w.id) >= S.jobLimit(state, o.value);
        const phases = { idle: '대기', walk: '이동 중', work: '작업 중', return: '입고하러 가는 중', full: '창고가 가득해요', material: '원료·비축 확인', hungry: '식량 확보 후 가공' };
        $(`worker-phase-${w.id}`).textContent = phases[w.phase] || '대기';
        const d = S.JOBS[w.job], el = $(`worker-info-${w.id}`);
        if (w.cargo) { el.textContent = `${icons[w.cargo.type]} ${w.cargo.amount.toFixed(0)}개 운반 중${w.nextJob ? ' · 입고 후 일 변경' : ''}`; el.className = 'cargo'; }
        else if (d?.resource) { const site = S.station(state, w), depot = S.depot(state, site); const travel = 2 * Math.hypot(site.x - depot.x, site.y - depot.y) / (state.flags.road ? 2.7 : 1.8); const cost = Object.entries(d.cost || {}).map(([k, n]) => `${S.RESOURCES[k]} ${n}`).join(' + '); el.textContent = `${cost ? cost + ' → ' : ''}작업 ${S.workTime(state, w.job, w)}초 · 왕복 ${travel.toFixed(0)}초 · ${S.rateFor(state, w).toFixed(1)}개/분`; el.className = ''; }
        else { el.textContent = w.job === 'builder' ? (state.project ? '현재 공사·제작을 자동으로 도와요.' : '새 공사·제작을 시작하면 도와요.') : '새로운 일을 맡길 수 있어요.'; el.className = ''; }
      }
    } else if (tab === 'history') window.SettlementHistoryUI.update(state);
    else if (tab === 'production') {
      window.SettlementCivilizationUI.updateProduction(state);
      for (const [id, d] of Object.entries(H.JOBS)) {
        $(`stock-${id}`).textContent = `재고 ${Math.floor(state.resources[d.resource])} / ${cap}`;
        $(`production-rate-${id}`).textContent = `예상 순증가 ${r[d.resource] >= 0 ? '+' : ''}${r[d.resource].toFixed(1)}/분 · 배치 ${S.assigned(state, id)}명`;
      }
      $('printModeLabel').textContent = `다음 인쇄 작업: ${state.history.printMode === 'type' ? '금속활자 방식' : '목판 방식'}`;
    }
    if (state.project && $('projectProgress')) {
      const percent = Math.min(100, Math.floor(state.project.progress / S.PROJECTS[state.project.type].time * 100));
      $('projectPercent').textContent = `${percent}%`; $('projectProgress').style.width = `${percent}%`;
      $('helpProject').disabled = paused; $('assignBuilder').disabled = paused;
    }
    const g = goal(); $('goalTitle').textContent = g.title; $('goalText').textContent = g.text;
    const checks = state.era === 'paleolithic' ? S.requirements(state) : [...H.byId(state.history.active).goals.map(g => ({ label: g.label, done: H.goalDone(state, g) })), { label: '생각 잇기', done: state.history.answers[state.history.active] }];
    $('eraChecks').innerHTML = checks.map(q => `<span class="${q.done ? 'done' : ''}">${q.done ? '✓' : '○'} ${q.label}</span>`).join('');
    $('latestEvent').textContent = state.events[0]?.text || '마을이 자라고 있어요.';
    const learning = state.era === 'paleolithic' ? H.byId(state.flags.survey ? 'neolithic' : 'paleolithic') : H.byId(state.history.active);
    $('learningTitle').textContent = learning.concepts.join(' · ');
    $('learningFact').textContent = learning.facts[0];
  }
  function doAction(fn) {
    if (frozen()) return;
    stopHolding(); const result = fn();
    if (result?.reason) toast(result.reason);
    if (result?.ok) sound('click');
    render(); save();
  }
  document.addEventListener('click', e => {
    const zoom = e.target.closest('[data-zoom]'); if (zoom) { stopHolding(); const scale = Number(zoom.dataset.zoom); if ([1, 1.5, 2].includes(scale)) { $('world').style.width = `${scale * 100}%`; $('mapViewport').classList.toggle('zoomed', scale > 1); } return; }
    const cityAction = e.target.closest('[data-city-action]'); if (cityAction) { doAction(() => { if (['fiber', 'spin', 'timber'].includes(cityAction.dataset.cityAction) && !spendCredit()) return { ok: false }; return S.cityAction(state, cityAction.dataset.cityAction); }); return; }
    const cityResearch = e.target.closest('[data-city-research]'); if (cityResearch) { doAction(() => S.Civilization.answer(state, cityResearch.dataset.cityResearch, Number(cityResearch.dataset.choice))); return; }
    const artifact = e.target.closest('[data-artifact]'); if (artifact) { doAction(() => S.Civilization.artifact(state, artifact.dataset.artifact, Number(artifact.dataset.choice))); return; }
    const upgrade = e.target.closest('[data-legacy-buy]'); if (upgrade) { doAction(() => S.Civilization.buy(state, upgrade.dataset.legacyBuy)); return; }
    const inherit = e.target.closest('[data-inherit]'); if (inherit) {
      if (paused || document.hidden || !$('inheritDialog').open) return;
      const result = S.inherit(state, inherit.dataset.inherit);
      if (!result.ok) { toast(result.reason); return; }
      $('inheritDialog').close(); completedShown = false; stopHolding(); signature = ''; tab = 'life'; render(); save(); toast(result.reason); return;
    }
    const lifeMenu = e.target.closest('[data-life-menu]'); if (lifeMenu) { stopHolding(); changeTab('life'); return; }
    const tool = e.target.closest('[data-tool]'); if (tool) { doAction(() => S.Prehistory.craft(state, tool.dataset.tool)); return; }
    const research = e.target.closest('[data-life-research]'); if (research) { doAction(() => S.Prehistory.answer(state, research.dataset.lifeResearch, Number(research.dataset.choice))); return; }
    const lifeAction = e.target.closest('[data-life]'); if (lifeAction) {
      doAction(() => {
        const id = lifeAction.dataset.life;
        if (id === 'hunt' && !spendCredit()) return { ok: false };
        return S.lifeAction(state, id, Number(lifeAction.dataset.crop || 0));
      }); return;
    }
    const tabButton = e.target.closest('[data-tab]'); if (tabButton) { stopHolding(); changeTab(tabButton.dataset.tab); return; }
    const node = e.target.closest('[data-node]'); if (node) { stopHolding(); selected = node.dataset.node; render(); return; }
    const hv = e.target.closest('[data-history-view]'); if (hv) { lessonView = hv.dataset.historyView === 'lesson'; signature = ''; render(); return; }
    const chapter = e.target.closest('[data-history]'); if (chapter) { doAction(() => H.select(state, chapter.dataset.history)); return; }
    const answer = e.target.closest('[data-answer]'); if (answer) { doAction(() => H.answer(state, answer.dataset.chapter, Number(answer.dataset.answer))); return; }
    const claim = e.target.closest('[data-claim]'); if (claim) {
      doAction(() => { const result = H.claim(state, claim.dataset.claim); if (result.ok && !state.history.reported.includes(result.chapter)) { state.history.reported.push(result.chapter); save(); window.KidscadeGame?.milestone('history_chapter', { uniqueKey: `history-v2-${result.chapter}`, chapter: result.chapter }); } return result; }); return;
    }
    const jump = e.target.closest('[data-history-project]'); if (jump) {
      const d = S.PROJECTS[jump.dataset.historyProject];
      if (d?.chapter && H.available(state, d.chapter)) H.select(state, d.chapter);
      changeTab('build'); $(`build-${jump.dataset.historyProject}`)?.scrollIntoView({ block: 'center', behavior: 'instant' }); return;
    }
    const productionWorker = e.target.closest('[data-production-worker]'); if (productionWorker) { changeTab('workers'); toast(`${S.JOBS[productionWorker.dataset.productionWorker].name} 일을 맡길 주민을 골라 주세요.`); return; }
    const print = e.target.closest('[data-print]'); if (print) { doAction(() => H.setPrintMode(state, print.dataset.print)); return; }
    const project = e.target.closest('[data-project]'); if (project) doAction(() => S.startProject(state, project.dataset.project));
    if (e.target.closest('#cancelProject')) doAction(() => ({ ok: S.cancelProject(state) }));
    if (e.target.closest('#assignBuilder')) doAction(() => {
      if (state.workers.some(w => (w.nextJob || w.job) === 'builder')) return { ok: false, reason: '건설 담당이 이미 배치되어 있어요.' };
      const w = state.workers.find(w => w.job === 'idle');
      if (!w) { changeTab('workers'); return { ok: false, reason: '일꾼 메뉴에서 한 명을 건설·제작으로 옮겨 주세요.' }; }
      return S.assign(state, w.id, 'builder');
    });
  });
  $('panel').addEventListener('change', e => {
    if (e.target.matches('[data-worker]')) doAction(() => S.assign(state, Number(e.target.dataset.worker), e.target.value));
  });
  function beginHold(target, pointerId) {
    if (frozen() || target.disabled) return false;
    if (target.id === 'harvestBtn') { input = { harvest: selected }; manualWork(selected); }
    else if (target.id === 'grindBtn') input = { grind: true };
    else if (target.id === 'helpProject') input = { help: true };
    else if (target.id === 'supportBtn') input = { support: target.dataset.support };
    else return false;
    heldPointer = pointerId; return true;
  }
  document.addEventListener('pointerdown', e => {
    if (!e.isPrimary || e.button !== 0 || heldPointer !== null) return;
    const b = e.target.closest('#harvestBtn,#helpProject,#supportBtn,#grindBtn');
    if (b && beginHold(b, e.pointerId)) { e.preventDefault(); b.setPointerCapture(e.pointerId); }
  });
  document.addEventListener('pointerup', e => { if (e.pointerId === heldPointer) { stopHolding(); render(); } });
  document.addEventListener('pointercancel', stopHolding);
  document.addEventListener('keydown', e => {
    if ((e.code === 'Space' || e.code === 'Enter') && e.target.matches('#harvestBtn,#helpProject,#supportBtn,#grindBtn')) {
      e.preventDefault(); if (!e.repeat) beginHold(e.target, 'keyboard');
    }
  });
  document.addEventListener('keyup', e => { if (e.code === 'Space' || e.code === 'Enter') { stopHolding(); render(); } });
  // Voice control and assistive technology can activate these without pointer/key events.
  document.addEventListener('click', e => {
    if (e.detail !== 0 || frozen()) return;
    if (e.target.id === 'harvestBtn') { manualWork(selected); render(); }
    if (e.target.id === 'grindBtn' && spendCredit()) { S.Prehistory.grind(state); render(); }
    if (e.target.id === 'helpProject') { S.tick(state, .5, { help: true }); render(); }
  });
  $('world').addEventListener('pointerdown', e => {
    if (!e.isPrimary || e.button !== 0 || frozen() || heldPointer !== null) return;
    const hit = view.hit(e.clientX, e.clientY, state);
    if (hit === 'rabbit') { doAction(() => spendCredit() ? S.lifeAction(state, 'hunt') : { ok: false }); return; }
    if (hit?.startsWith('crop:')) { doAction(() => S.lifeAction(state, 'grain', Number(hit.split(':')[1]))); return; }
    if (hit === 'shell') { doAction(() => S.lifeAction(state, 'shell')); return; }
    if (!hit) return;
    if (hit === 'clay' && !state.flags.survey) { toast('먼저 움집과 모닥불을 마련하고 강가를 조사해요.'); return; }
    selected = hit; pointerOrigin = { x: e.clientX, y: e.clientY }; heldPointer = e.pointerId;
    manualWork(selected);
    input = { harvest: selected }; render();
  });
  $('world').addEventListener('pointermove', e => { if (pointerOrigin && Math.hypot(e.clientX - pointerOrigin.x, e.clientY - pointerOrigin.y) > 12) stopHolding(); });
  $('world').addEventListener('pointerleave', () => { if (pointerOrigin) stopHolding(); });
  $('recruitBtn').addEventListener('click', () => doAction(() => S.recruit(state)));
  $('saveBtn').addEventListener('click', () => save(true));
  $('exitBtn').addEventListener('click', () => { stopHolding(); save(); window.KidscadeGame?.exit(); });
  $('pauseBtn').addEventListener('click', () => setPaused(!paused));
  $('goalAction').addEventListener('click', () => { const g = goal(); stopHolding(); if (g.node) selected = g.node; changeTab(g.action); $('panel').scrollTop = 0; if (innerWidth < 761) document.querySelector('.management').scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'start' }); });
  function openDialog(id) { stopHolding(); $(id).showModal(); }
  $('helpBtn').addEventListener('click', () => openDialog('helpDialog'));
  $('learningAction').addEventListener('click', () => { changeTab('history'); if (innerWidth < 761) document.querySelector('.management').scrollIntoView({ block: 'start' }); });
  $('logBtn').addEventListener('click', () => { $('recordList').innerHTML = state.events.map(e => `<p><small>${formatTime(e.time)}</small>${escape(e.text)}</p>`).join(''); openDialog('recordDialog'); });
  document.addEventListener('click', e => {
    if (e.target.closest('#openInheritance') && !frozen() && !S.Civilization.inheritanceReason(state)) { $('inheritPreview').textContent = `새 터전에서 다시 시작: 현지 자원·건물·주민·진행 작업. 보존: 도시 ${state.civilization.homes}가구의 기록, 배운 연구·역사 ${Object.values(state.history.answers).filter(Boolean).length}개, 성취 기록. 이번 보상 ${S.Civilization.reward(state)}점. 계승 지식 단계는 그대로 남아요.`; openDialog('inheritDialog'); }
  });
  $('continueBtn').addEventListener('click', () => $('completeDialog').close());
  document.querySelectorAll('dialog').forEach(d => d.addEventListener('close', () => { last = performance.now(); render(); }));
  document.addEventListener('visibilitychange', () => { stopHolding(); last = performance.now(); if (document.hidden) save(); });
  window.addEventListener('blur', stopHolding);
  window.addEventListener('pagehide', () => { stopHolding(); save(); });
  window.KidscadeGame?.registerPauseHandlers({ pause: () => setPaused(true), resume: () => setPaused(false) });
  window.KidscadeGame?.registerCleanup(() => { stopHolding(); paused = true; save(); });
  window.KidscadeGame?.start();
  function complete() {
    completedShown = true; stopHolding();
    $('endingStats').innerHTML = `<div><b>${state.workers.length}</b><span>함께 사는 주민</span></div><div><b>${state.buildings.length}</b><span>완성한 시설</span></div><div><b>${formatTime(state.time)}</b><span>마을의 시간</span></div>`;
    if (!state.milestoneReported) {
      state.milestoneReported = true; save();
      window.KidscadeGame?.milestone('settlement_neolithic', { uniqueKey: 'settlement-v1-neolithic', population: state.workers.length });
    }
    sound('correct'); openDialog('completeDialog');
  }
  function frame(now) {
    const dt = Math.min(.1, Math.max(0, (now - last) / 1000)); last = now;
    if (!frozen()) {
      const oldEvents = state.events[0], oldEra = state.era;
      if (input.harvest) manualWork(input.harvest);
      S.tick(state, dt, { ...input, harvest: null }); uiClock += dt; saveClock += dt;
      if (oldEvents !== state.events[0]) { render(); save(); sound('click'); }
      if (oldEra !== state.era && !completedShown) complete();
      if (saveClock >= 8) { saveClock = 0; save(); }
    }
    if (uiClock >= .25) { uiClock = 0; render(); }
    if (!document.hidden) view.draw(state, selected, now / 1000, reducedMotion || frozen());
    requestAnimationFrame(frame);
  }
  render();
  if (saveBlocked) $('saveStatus').textContent = '저장 읽기 실패 · 기존 기록 보존';
  else $('saveStatus').textContent = state.time > 0 ? '저장한 마을에서 이어하기' : '자동 저장 사용';
  requestAnimationFrame(frame);
})();

(function () {
  'use strict';
  const S = window.SettlementSim, B = S.Bronze;
  const $ = id => document.getElementById(id);
  const cost = d => Object.entries(d.cost).map(([k, n]) => `${S.RESOURCES[k]} ${n}`).join(' · ');
  const button = (id, text) => `<button type="button" data-bronze-action="${id}">${text}</button>`;
  function markup(s, projectHTML) {
    if (!B.open(s)) return `${projectHTML}<section class="life-card"><h3>밭에서 생산 마을로</h3><p>신석기에서 밭·토기·정착 생활을 연결하고 배움을 기록하면 열려요. 지금 마련한 자동 채집·불·밭은 계속 작동해요.</p><button type="button" data-tab="history">신석기 배움 보기 →</button></section>`;
    return `${projectHTML}<section class="life-card"><h3>지금 연결할 일</h3><p id="bronzeNext" role="status"></p></section><p class="panel-intro">농경을 넓히고 작업을 나누는 청동기 마을. 새 일손 없이 도구·저장·제작을 연결해요. 철기와 고조선으로 넘어가도 이 마을은 남아요.</p>
      <section class="life-card"><h3>밭 → 수확 묶음 → 운반 → 곡물 처리</h3><p id="bronzeChain" role="status"></p><p>반달돌칼·삼각형돌칼은 익은 이삭 3곳을 골라 따고, 돌낫은 모두 익은 한 줄을 줄기째 베어요. 토기는 거둔 것을 담아 함께 옮겨요. 새 밭은 손으로 1곳씩 거두고, 수확 도구로 범위를 넓혀요. 기존 신석기 밭의 3곳 모아 담기는 계속 쓸 수 있어요.</p><div class="bronze-field" aria-label="넓은 밭의 작물 12곳">${Array.from({ length: 12 }, (_, i) => `<button type="button" data-bronze-action="harvest" data-plot="${i}" id="bronze-crop-${i}"></button>`).join('')}</div><p id="bronzeTool"></p><button type="button" data-tab="life">수확 도구 만들기 →</button><div class="life-actions">${button('carry', '토기에 담아 운반')}${button('mill', '저장 곡물 갈기')}${button('exchange', '여유 식량 교환')}</div><p id="bronzeCarry"></p><p id="bronzeCropChoice"></p><div class="life-actions">${button('millet', '다음 파종 · 잡곡')}${button('rice', '다음 파종 · 벼')}</div><p>벼농사는 일부 지역의 모습이에요. 낮은 땅의 선택 사업 없이 잡곡만으로 진행할 수 있어요. 30초/60초 성장·수확량·작업 범위는 게임 수치예요.</p></section>
      <section class="life-card"><h3>숯·광물에서 청동 제작까지</h3><div class="life-actions"><button type="button" data-history-project="kiln">숯 가마 마련 →</button><button type="button" data-history-project="prospect">광맥 탐사 →</button><button type="button" data-history-project="bronzeRitual">청동 의례품 모형 →</button></div><p id="bronzeMetalStock"></p><div class="life-actions">${button('charcoal', '숯 한 묶음')}${button('copper', '구리광석 한 묶음')}${button('tin', '주석광석 한 묶음')}${button('bronze', '청동 제작 시작')}</div><ol class="bronze-stages">${['광물에서 금속 얻기', '금속을 섞어 합금', '거푸집에 부어 주조', '식혀 운반·입고'].map((v, i) => `<li id="bronze-stage-${i}">${v}</li>`).join('')}</ol><p id="bronzeOrder" role="status"></p><p>실제 제련·합금·주조를 한 작업으로 줄인 모형이에요. 구리광석 2·주석광석 1·숯 2는 게임 비용이며 실제 금속의 질량 비율이 아니에요. 청동검을 만들어도 석제 농기구가 사라지지는 않아요.</p><div class="life-actions">${button('reserve', '청동 비축 목표 8')}${button('craft', '청동 제작 목표 24')}</div><p id="bronzePlan"></p></section>
      <section class="life-card"><h3>직접 해 본 일을 자동화하기</h3>${Object.entries(B.RESEARCH).map(([id, r]) => `<article class="research"><h4>${r.name}</h4><p>${r.prompt}</p><p class="research-reward">${r.effect}</p>${r.choices.map((v, i) => `<button type="button" data-bronze-research="${id}" data-choice="${i}" id="bronze-answer-${id}-${i}">${v}</button>`).join('')}<small id="bronze-research-${id}"></small></article>`).join('')}<p id="bronzeFeedback" role="status"></p><p>도시 메뉴의 자동 생산 스위치로 새 작업을 멈출 수 있어요. 진행 중 운반·제작은 끝까지 보존해요.</p></section>
      <section class="life-card"><h3>밭과 작업터를 넓히기</h3>${Object.entries(B.PROJECTS).map(([id, d]) => `<article class="automation"><h4>${d.name}</h4><p>${d.effect}</p><p>${cost(d)} · ${d.time}초</p><button type="button" data-project="${id}" id="bronze-build-${id}">마련하기</button><small id="bronze-reason-${id}"></small></article>`).join('')}<p id="bronzeHomes"></p><button type="button" data-tab="city">목공·가공 연결과 4 → 12가구 주거 구역 →</button><p>울타리는 선택 사업이에요. 집은 지역·시기에 따라 여러 형태가 있었어요. 이후 철기 생산과 연결해 40가구, 교류 도시 120가구, 큰 도시 300가구로 넓혀요.</p></section>
      <section class="life-card"><h3>집·무덤·물건으로 사회 살펴보기</h3><p>농경 확대, 전문적인 제작, 사람들 사이 차이를 여러 자료로 함께 살펴봐요. 농사를 시작하자 모든 곳에 곧바로 같은 신분 제도가 생긴 것은 아니에요.</p><button type="button" data-project="dolmen" id="bronze-build-dolmen">고인돌 전시 모형 마련</button><small id="bronze-reason-dolmen"></small>${B.EVIDENCE.map(e => `<article class="research"><h4>${e.name}</h4><p>${e.text}</p>${button('observe:' + e.id, '자료 관찰하고 기록')}<small id="bronze-observe-${e.id}"></small></article>`).join('')}<p>전시 모형은 오늘날의 학습 화면이에요. 고인돌을 생산 시설로 운영하거나 무덤을 반복해서 지어 보상을 얻지 않아요.</p><button type="button" data-tab="history">청동기 배움 기록 · 철기와 고조선 열기 →</button></section>
      <details class="life-card"><summary>사회 교과 내용과 근거 자료</summary><p>현재 공개 수업 자료의 청동기 생활 주제와 옛 교과서 원문을 대조하고, 박물관 자료로 도구·주거·무덤을 보완했어요. 수업 전체를 대체하는 교재는 아니에요. 출판사 문항을 복사하지 않고 게임 속 경험에 맞추어 새로 작성했어요.</p>${B.SOURCES.map(a => `<p><a href="${a.url}" target="_blank" rel="noopener noreferrer">${a.title} ↗</a></p>`).join('')}<p>화면의 생산 주문·재고 수치는 플레이어용 표시예요. 당시의 문자 장부·화폐·현대 계약 제도를 재현한 것이 아니에요.</p></details>`;
  }
  function update(s, paused) {
    if (!B.open(s)) return;
    const b = s.bronze, cap = B.grainCap(s), has = id => S.count(s, id) > 0;
    $('bronzeNext').textContent = !has('broadField') ? '넓은 공동 밭을 마련해요. 기존 밭·채집 자동화는 계속 작동해요.' : !b.stats.toolHarvests ? '생활 메뉴에서 반달돌칼이나 돌낫을 만들고 새 밭을 한 번 수확해요.' : !b.research.harvest ? '수확을 나누어 맡기기에서 방금 쓴 도구의 역할을 연결해요.' : !has('mumunStore') ? '민무늬 토기와 저장터를 마련해 한 번에 더 많이 담아 옮겨요.' : !b.stats.carried ? '거둔 묶음을 토기에 담아 운반해요. 2초 뒤 저장 곡물이 돼요.' : !b.research.storage ? '베기와 담기를 연결하기를 연구해 자동 운반·처리를 열어요.' : !has('castingWorkshop') ? '숯 가마·광맥 탐사와 거푸집 주조 작업터를 연결해요.' : !b.research.casting ? '숯·구리·주석 한 묶음을 준비하고 청동을 제작·입고한 뒤 장인 연구를 해요.' : s.civilization.homes < 12 ? '도시 메뉴에서 목공·첫 주거 구역·밭과 주거 구역을 이어 12가구로 넓혀요.' : !b.research.evidence ? '고인돌 모형을 마련하고 집·무덤·출토품을 관찰한 뒤 자료에서 사회 읽기를 연결해요.' : '역사 메뉴에서 청동기 배움을 기록해 철기와 고조선을 함께 열어요.';
    $('bronzeChain').textContent = `수확 묶음 ${b.bundles} → 운반 ${b.delivery?.amount || 0} → 저장 곡물 ${b.grain} / 공동 한도 ${cap} · 처리 누적 ${b.stats.processed} · 식량 입고 대기 ${Math.ceil(b.meals)}`;
    for (let i = 0; i < 12; i++) {
      const ripe = b.crops[i] >= B.growthTime(s, i), el = $(`bronze-crop-${i}`);
      el.textContent = `${i + 1} · ${b.kinds[i] === 'rice' ? '벼' : '잡곡'} ${ripe ? '수확' : Math.floor(b.crops[i] / B.growthTime(s, i) * 100) + '%'}`;
      el.disabled = paused || !has('broadField') || !ripe; el.classList.toggle('ripe', ripe);
    }
    $('bronzeTool').textContent = `수확 도구: ${S.Prehistory.TOOLS[S.Civilization.toolFor(s, 'grain', S.Prehistory)]?.name || '손으로 1곳씩'} · 자동 수확 ${b.research.harvest ? '연결됨' : '연구 전'}`;
    $('bronzeCarry').textContent = b.delivery ? `토기에 담아 곡물 처리터로 운반 중 · ${Math.floor(b.delivery.progress / 2 * 100)}%` : `담아 나른 곡물 ${b.stats.carried} · 여유분 교환 ${b.stats.exchanged}회`;
    $('bronzeCropChoice').textContent = `다음 파종: ${b.crop === 'rice' ? '벼' : '잡곡'} · 자라는 작물은 끝까지 보존해요.`;
    $('bronzeMetalStock').textContent = ['copper', 'tin', 'charcoal', 'bronze'].map(k => `${S.RESOURCES[k]} ${Math.floor(s.resources[k])}`).join(' · ');
    const t = s.civilization.tasks.bronze;
    const stage = t ? t.phase === 'delivery' ? 3 : Math.min(2, Math.floor(t.progress / t.duration * 3)) : -1;
    for (let i = 0; i < 4; i++) { $(`bronze-stage-${i}`).classList.toggle('active', i === stage); $(`bronze-stage-${i}`).setAttribute('aria-current', i === stage ? 'step' : 'false'); }
    $('bronzeOrder').textContent = t ? stage === 3 ? '입고 중 · 창고가 가득하면 완제품을 보존하며 기다려요.' : `제작 ${Math.floor(t.progress / t.duration * 100)}% · 원료 투입 완료` : `한 묶음 제작을 시작해 보세요. 누적 청동 입고 ${Math.floor(s.history.produced.bronze || 0)}`;
    $('bronzePlan').textContent = `반복 주문 ${b.research.casting ? '연결됨' : '연구 전'} · 목표 ${b.plan === 'reserve' ? 8 : 24} · 생활용 목재 12개 보호`;
    for (const [id] of Object.entries(B.RESEARCH)) {
      const why = B.researchReason(s, id);
      for (let i = 0; i < 2; i++) $(`bronze-answer-${id}-${i}`).disabled = paused || Boolean(why);
      $(`bronze-research-${id}`).textContent = b.research[id] ? '✓ 배운 연결' : why || '방금 한 일을 연결해 고르세요.';
    }
    for (const id of [...Object.keys(B.PROJECTS), 'dolmen']) { const why = S.projectReason(s, id); $(`bronze-build-${id}`).disabled = paused || Boolean(why); $(`bronze-reason-${id}`).textContent = why; }
    $('bronzeHomes').textContent = `현재 새 주거 구역 ${s.civilization.homes}가구 · 청동기 목표 12가구 · 운영 담당 ${s.workers.length}명`;
    $('bronzeFeedback').textContent = b.feedback;
    document.querySelectorAll('[data-bronze-action]').forEach(el => {
      const id = el.dataset.bronzeAction;
      if (id === 'harvest') return;
      let blocked = false;
      if (id === 'carry') blocked = !b.bundles || Boolean(b.delivery);
      if (id === 'mill') blocked = !has('granary') || !b.grain || b.meals > 9;
      if (id === 'exchange') blocked = !has('barterPlace') || s.resources.food < Math.max(12, S.Civilization.consumption(s) * 2) + 8 || s.resources.clay > S.storageCap(s) - 4;
      if (id === 'rice') blocked = !has('riceField') || b.crop === 'rice';
      if (id === 'millet') blocked = b.crop === 'millet';
      if (['charcoal', 'copper', 'tin', 'bronze'].includes(id)) { const d = S.History.JOBS[id]; blocked = Boolean(s.civilization.tasks[id]) || !S.Civilization.recipeReady(s, id, d, S.cityContext) || s.resources[d.resource] >= S.storageCap(s) || Object.entries(d.cost || {}).some(([k, n]) => s.resources[k] < n + (k === 'wood' ? 12 : 0)); }
      if (id.startsWith('observe:')) blocked = !has('quarter') || !has('dolmen') || b.observations.includes(id.slice(8));
      el.disabled = paused || blocked;
    });
    for (const e of B.EVIDENCE) $(`bronze-observe-${e.id}`).textContent = b.observations.includes(e.id) ? '✓ 관찰 기록' : '12가구 마을·고인돌 모형과 함께 비교해요.';
  }
  window.SettlementBronzeUI = { markup, update };
})();

(function () {
  'use strict';
  const S = window.SettlementSim, C = S.Civilization;
  const cost = values => Object.entries(values).map(([k, n]) => `${S.RESOURCES[k] || k} ${n}`).join(' · ');
  const esc = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  function markup(s, projectHTML) {
    const c = s.civilization;
    return `${projectHTML}<p class="panel-intro">도구에서 생산망으로, 작은 마을에서 여러 구역의 도시로 이어져요. 시설의 자동화는 새 일손 배치를 요구하지 않아요.</p>
      <section class="life-card"><h3>생활 재료 연결</h3><p id="cityMaterials"></p><div class="life-actions"><button type="button" data-city-action="fiber">식물 섬유 모으기</button><button type="button" data-city-action="spin">가락바퀴 · 실 만들기</button><button type="button" data-city-action="net">실 2 · 그물 엮기</button><button type="button" data-city-action="sew">뼈바늘 · 가죽옷</button><button type="button" data-city-action="finish">밀개 · 생활 재료 마무리</button><button type="button" data-city-action="timber">자귀 · 구조재 깎기</button></div><p id="netStatus"></p><button type="button" data-tab="life">도구 만들고 등록하기 →</button></section>
      <section class="life-card"><h3>자동화와 공동 건설</h3><p>원료를 확보해 작업하고, 운반을 마쳐야 완제품이 재고에 들어와요. 생산을 멈춰도 이미 시작한 작업과 운반은 마무리해요.</p><button type="button" data-city-action="automatic" id="cityAutomatic"></button>${Object.entries(C.RESEARCH).map(([id, r]) => `<article class="research"><h4>${r.name}</h4><p>${r.prompt}</p><p class="research-reward">보상: ${r.effect}</p>${r.choices.map((v, i) => `<button type="button" data-city-research="${id}" data-choice="${i}" id="city-research-${id}-${i}">${v}</button>`).join('')}<small id="city-research-state-${id}"></small></article>`).join('')}<p id="cityFeedback" role="status"></p></section>
      <section class="life-card"><h3>시설과 주거 구역</h3><p id="citySummary"></p>${Object.entries(C.PROJECTS).map(([id, d]) => `<article class="automation"><h4>${d.name}</h4><p>${d.effect}</p><p>${cost(d.cost)} · ${d.time}초 작업</p><button type="button" data-project="${id}" id="city-build-${id}">건설</button><small id="city-reason-${id}"></small></article>`).join('')}</section>
      <section class="life-card"><h3>교류와 공동 비축</h3><p id="policyStatus"></p><div class="life-actions"><button type="button" data-city-action="balanced">생활 1분 비축</button><button type="button" data-city-action="conserve">생활 2분 비축</button><button type="button" data-city-action="growth">합류 식량 추가 비축</button></div><p id="cityFeatures"></p></section>
      <details class="life-card"><summary>도시의 유물 전시 · 선택 탐구</summary><p>생산 도구와 달리 쓰임·형태·출토 맥락을 살펴보는 유물도 있어요. 탐구 기록은 다음 도시에도 남아요.</p>${C.ARTIFACTS.map(a => `<article class="research"><h4>${a.name}</h4><p>${a.text}</p><a href="${a.source}" target="_blank" rel="noopener">유물 자료 살펴보기</a><p>${a.question}</p>${a.choices.map((v, i) => `<button type="button" data-artifact="${a.id}" data-choice="${i}" id="artifact-${a.id}-${i}">${v}</button>`).join('')}<small id="artifact-state-${a.id}"></small></article>`).join('')}</details>
      <section class="life-card"><h3>도시를 기록하고 계승하기</h3><p id="inheritanceReason"></p><p id="legacyStatus"></p><p>계승하면 현지의 건물·자원·주민·진행 작업은 새로 시작해요. 이전 도시 기록, 배운 연구·생각 잇기, 도감과 학생 성취 기록은 남아요. 최근 도시 10개를 관람 기록으로 보관해요.</p><button type="button" id="openInheritance">계승 내용 미리보기</button><h4>계승 지식 · 분야별 최대 3단계</h4>${[['craft', '제작 경험 · 자동 가공 속도 +10%/단계'], ['farm', '농경 경험 · 도시 공동 경작 +10%/단계'], ['logistics', '운송 경험 · 자동 운반 속도 +15%/단계']].map(([id, label]) => `<p>${label}</p><button type="button" data-legacy-buy="${id}" id="legacy-buy-${id}"></button>`).join('')}<div class="city-archive">${c.legacy.archive.map(a => archive(a)).join('') || '<p>첫 도시를 계승하면 이곳에 기록이 남아요.</p>'}</div></section>`;
  }
  function archive(a) {
    const houses = Math.min(30, Math.max(1, Math.ceil(a.homes / 10)));
    const shapes = Array.from({ length: houses }, (_, i) => { const x = 12 + i % 10 * 22, y = 17 + Math.floor(i / 10) * 24; return `<path d="M${x},${y} l8,-7 l8,7z" fill="#a36d45"/><rect x="${x + 2}" y="${y}" width="12" height="11" fill="#d6bc83"/>`; }).join('');
    return `<article class="archive-card"><h4>${a.run}번째 도시 · ${a.homes}가구</h4><svg viewBox="0 0 250 100" role="img" aria-label="이전 도시의 주거 구역 요약"><rect width="250" height="100" fill="#94b66c"/>${shapes}</svg><p>주민 ${a.citizens}명 · 배움 ${a.chapters.length}개 · 전시 ${a.artifacts.length}개 · ${Math.floor(a.time / 60)}분</p><details><summary>남긴 시설 ${a.buildings.length}곳</summary><p>${a.buildings.map(b => esc(S.PROJECTS[b.type].name)).join(' · ')}</p></details></article>`;
  }
  function update(s, paused) {
    const $ = id => document.getElementById(id), c = s.civilization;
    $('cityMaterials').textContent = Object.keys(C.RESOURCES).map(k => `${S.RESOURCES[k]} ${Math.floor(s.resources[k])}`).join(' · ');
    $('netStatus').textContent = `그물 ${c.net ? `사용 ${c.netUses}회 남음` : '실 2로 엮기'} · 자동 가공을 연구하면 그물도 다시 엮어요.`;
    $('cityAutomatic').textContent = c.automatic ? '자동 생산 켜짐 · 눌러 멈추기' : '자동 생산 멈춤 · 눌러 켜기'; $('cityAutomatic').disabled = paused;
    for (const [id, r] of Object.entries(C.RESEARCH)) {
      const done = c.research[id], ready = S.count(s, r.facility);
      for (let i = 0; i < 2; i++) $(`city-research-${id}-${i}`).disabled = paused || !ready || done;
      $(`city-research-state-${id}`).textContent = done ? '✓ 연구 완료' : ready ? '틀려도 자원 손실 없이 다시 연결해요.' : `${S.PROJECTS[r.facility].name}부터 마련해요.`;
    }
    $('cityFeedback').textContent = c.feedback;
    $('citySummary').textContent = `새 구역 ${c.homes}/300가구 · 도시 주민 ${c.citizens}명 · 운영 담당 ${s.workers.length}명 · 빈집에 생활 여유가 생기면 주민이 자동 합류해요. 공동 경작·기초 생산·저장이 커지고 자동 가공 처리량도 늘어요.`;
    for (const id of Object.keys(C.PROJECTS)) {
      const reason = S.projectReason(s, id);
      $(`city-build-${id}`).disabled = paused || Boolean(reason); $(`city-build-${id}`).textContent = S.count(s, id) ? '완료' : '건설'; $(`city-reason-${id}`).textContent = reason;
    }
    $('policyStatus').textContent = S.count(s, 'council') ? `공동 비축: ${{ balanced: '생활 1분', conserve: '생활 2분', growth: '생활 1분 + 합류 식량' }[c.reserve]} · 자동 교환이 비축을 침범하지 않아요.` : '고조선 자료관을 마련하면 공동 비축 기준을 정할 수 있어요.';
    $('cityFeatures').textContent = Object.entries(C.FEATURES).filter(([id]) => S.count(s, id)).map(([id, effect]) => `${S.PROJECTS[id].name}: ${effect}`).join(' / ') || '탐방 시설이 생기면 도시 운영의 새 기능도 함께 열려요.';
    for (const a of C.ARTIFACTS) {
      const done = c.artifacts.includes(a.id), ready = s.history.completed.includes('neolithic');
      for (let i = 0; i < 2; i++) $(`artifact-${a.id}-${i}`).disabled = paused || !ready || done;
      $(`artifact-state-${a.id}`).textContent = done ? '✓ 전시 기록 완료' : ready ? '자료의 해석과 확정 사실을 구분해 봐요.' : '청동기 탐구에서 열려요.';
    }
    const why = C.inheritanceReason(s);
    $('inheritanceReason').textContent = why || `대표 사업을 완성했어요! 이번 도시 계승 보상 ${C.reward(s)}점. 이 도시에서 계속 살아도 돼요.`;
    $('openInheritance').disabled = paused || Boolean(why);
    $('legacyStatus').textContent = `${c.legacy.runs}회 계승 · 사용 가능한 계승 점수 ${c.legacy.points} · 배운 생각 잇기 ${c.legacy.learned.length}개 · 기억한 도구 ${c.legacy.tools.length}종`;
    for (const id of ['craft', 'farm', 'logistics']) { const level = c.legacy.upgrades[id]; $(`legacy-buy-${id}`).textContent = `${level}/3단계 · ${level >= 3 ? '완료' : `계승 점수 ${level + 1}로 배우기`}`; $(`legacy-buy-${id}`).disabled = paused || level >= 3 || c.legacy.points < level + 1; }
  }
  function production(s, projectHTML) {
    return `${projectHTML}<section class="life-card"><h3>시설이 이어가는 생산</h3><p>가공을 연결하기 연구 후 새 일손 없이 작동해요. 원료·비축·창고가 부족하면 기다리고, 운반 후 입고해요.</p><button type="button" data-tab="city">시설·연구·교역 보기 →</button>${Object.entries({ ...C.SIDE_JOBS, ...S.History.JOBS }).map(([id, d]) => `<article class="automation"><h4>${d.name}</h4><p>${cost(d.cost || {}) || '자원 확보'} → ${S.RESOURCES[d.resource]} ${d.amount} · ${d.time}초 기준</p><p id="auto-job-${id}"></p></article>`).join('')}</section>`;
  }
  function updateProduction(s) {
    for (const [id, d] of Object.entries({ ...C.SIDE_JOBS, ...S.History.JOBS })) {
      const t = s.civilization.tasks[id];
      const status = t ? t.phase === 'work' ? `가공 중 ${Math.floor(t.progress / t.duration * 100)}% · 원료 투입 완료` : '운반·입고 대기 · 공간이 생기면 이어가요' : !C.recipeReady(s, id, d, S.cityContext) ? '시설·도구·그물을 먼저 연결해요' : (id === 'bronze' && s.bronze) ? s.bronze.research.casting ? '청동기 메뉴에서 비축 목표·원료 확인' : '청동기 메뉴에서 한 묶음 제작 후 장인 연구' : !s.civilization.research.production ? '가공을 연결하기 연구 필요' : !s.civilization.automatic ? '자동 생산 멈춤' : '원료·생활 비축·저장 공간 확인';
      document.getElementById(`auto-job-${id}`).textContent = `${status} · 재고 ${Math.floor(s.resources[d.resource])}`;
    }
  }
  window.SettlementCivilizationUI = { markup, update, production, updateProduction };
})();

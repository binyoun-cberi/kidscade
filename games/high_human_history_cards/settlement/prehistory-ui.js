(function () {
  'use strict';
  const S = window.SettlementSim, P = S.Prehistory;
  function markup(s) {
    const p = s.prehistory;
    return `<p class="panel-intro">손으로 시작하고 도구로 편해져요. 시설을 짓고 연구하면 도구·땔감·곡물 처리를 자동으로 이어갈 수 있어요.</p>
      <section class="life-card"><h3>불 곁의 생활</h3><p id="warmthText"></p><div class="warmth-track" role="meter" aria-label="야영지 온기" aria-valuemin="0" aria-valuemax="100" id="warmthMeter"><i id="warmthBar"></i></div><p id="fuelText"></p><button data-life="fuel" type="button">목재 1 → 땔감 보충</button><small>온기는 게임 지표예요. 20 아래에서는 직접 채취가 25% 느려지고, 불을 돌보면 회복해요. 온기가 낮아져도 주민은 사라지지 않아요.</small></section>
      <section class="life-card"><h3>수렵과 채집</h3><p id="rabbitText"></p><button data-life="hunt" id="trackRabbit" type="button">토끼 추적 · 한 번 공격</button><p>지도에서 움직이는 토끼를 직접 눌러도 돼요. 이 버튼은 같은 효과로 고정된 곳에서 추적해요.</p><button data-life="shell" id="findShell" type="button">강가 조개 줍기</button><p id="lifeMaterials"></p></section>
      <section class="life-card"><h3>돌 하나, 다른 쓰임</h3><p id="toolStatus"></p><p>돌을 떼면 뗀석기, 갈아서 완성하면 간석기예요. 뼈바늘·가락바퀴는 재료와 제작법이 달라요. 도구를 선택하면 제작하거나 남은 도구를 장착해요.</p><div class="tool-grid">${Object.entries(P.TOOLS).filter(([id]) => P.available(s, id) && (p.stats.crafted > 0 || ['handaxe', 'chopper', 'scraper'].includes(id))).map(([id, t]) => `<button type="button" data-tool="${id}" id="tool-${id}" aria-pressed="${p.selected === id}"><b>${t.name}</b><small>${t.text}</small><span id="uses-${id}"></span></button>`).join('')}</div><div id="grindBox"><p id="grindText"></p><button type="button" id="grindBtn">꾹 눌러 돌 갈기</button><button type="button" data-life="cancelGrind">갈기 취소 · 돌 돌려받기</button></div><button type="button" data-life="exchange">조개 장신구 1 → 닳은 뗀석기 교환</button><p>조개 장신구 교환은 가상 규칙이며, 한반도 구석기 화폐를 재현한 것이 아니에요.</p></section>
      <button type="button" data-tab="city">실·그물·목공·도시로 연결하기 →</button><section class="life-card"><h3>재료를 생활로</h3><div class="life-actions"><button type="button" data-life="hide">긁개 · 가죽 손질</button><button type="button" data-life="clothing">뚜르개 · 가죽옷 마련</button><button type="button" data-life="bead">뚜르개 · 조개 장신구</button><button type="button" data-life="engrave">새기개 · 뼈 무늬 새기기</button></div><p id="clothingText"></p></section>
      <section class="life-card"><h3>밭에서 식탁까지</h3><p>간 돌도끼는 목공, 돌괭이는 밭 일구기, 갈판과 갈돌은 곡물 처리에 사용해요. 반달돌칼은 청동기 배움에서 열려요.</p><p id="cropStatus"></p><div class="crop-grid">${p.crops.map((_, i) => `<button type="button" data-life="grain" data-crop="${i}" id="crop-${i}">작물 ${i + 1}</button>`).join('')}</div><div class="life-actions"><button type="button" data-life="till">돌괭이 · 밭 일구기</button><button type="button" data-life="mill">곡물 1 → 식량 처리</button></div><p>토기를 갖추면 주변의 익은 곡식 최대 3곳을 함께 담아요. 기본 손 수확과 채집도 계속할 수 있어요.</p></section>
      <section class="life-card"><h3>내 클릭을 대신하는 시설</h3>${Object.entries(P.PROJECTS).map(([id, d]) => `<article class="automation"><h4>${d.name}</h4><p>${d.effect}</p><p>${Object.entries(d.cost).map(([k, n]) => `${S.RESOURCES[k]} ${n}`).join(' · ')}</p><button type="button" data-project="${id}" id="life-build-${id}">건설</button><small id="life-reason-${id}"></small></article>`).join('')}<p id="automaticStatus"></p></section>
      <section class="life-card"><h3>생활 연구 · 해결하면 자동화</h3>${Object.entries(P.RESEARCH).map(([id, r]) => `<article class="research"><h4>${r.name}</h4><p>${r.prompt}</p><p class="research-reward">보상: ${r.effect}</p>${r.choices.map((choice, i) => `<button type="button" data-life-research="${id}" data-choice="${i}" id="research-${id}-${i}">${choice}</button>`).join('')}<small id="research-state-${id}"></small></article>`).join('')}<p id="lifeFeedback" role="status"></p></section>
      <p class="panel-intro">참고 자료: <a href="https://www.museum.go.kr/MUSEUM/contents/M0201030100.do?showHallId=760&showroomCode=DM0002" target="_blank" rel="noopener">국립중앙박물관 구석기</a> · <a href="https://contents.history.go.kr/mobile/km/view.do?levelId=km_032_0030_0040_0010" target="_blank" rel="noopener">우리역사넷 토기의 쓰임</a> · <a href="https://www.museum.go.kr/MUSEUM/contents/M0501000000.do?relicRecommendId=254455&schM=view" target="_blank" rel="noopener">국립중앙박물관 반달돌칼</a>. 도구의 종류는 시대·지역에 따라 달랐고, 이 게임은 여러 사례를 묶은 생활 모형이에요.</p>`;
  }
  function update(s, paused) {
    const $ = id => document.getElementById(id), p = s.prehistory;
    $('warmthText').textContent = `야영지 온기 ${Math.round(p.warmth)}/100 · ${p.warmth < 20 ? '추워요 · 불을 돌봐요' : '온기가 있어요'}`;
    $('warmthBar').style.width = `${p.warmth}%`; $('warmthMeter').setAttribute('aria-valuenow', Math.round(p.warmth));
    $('fuelText').textContent = `남은 땔감 ${Math.ceil(p.fuel)} · ${p.research.fire ? '자동 보충 연구 완료' : '목재를 보충하면 불이 이어져요'}`;
    $('rabbitText').textContent = p.rabbit.respawn > 0 ? `다음 토끼 ${Math.ceil(p.rabbit.respawn)}초 후` : `토끼 남은 작업 ${Math.ceil(p.rabbit.hp)}/18 · 맨손 18회 / 주먹도끼 3회 / 슴베찌르개 2회`;
    $('trackRabbit').disabled = paused || p.rabbit.respawn > 0;
    $('findShell').disabled = paused || !p.shellVisible;
    $('findShell').textContent = p.shellVisible ? '조개 발견! 줍기' : `조개 찾는 중 · ${Math.ceil(p.shellWait)}초`;
    $('lifeMaterials').textContent = `가죽 ${p.hide} · 옷감 ${p.leather} · 뼈 ${p.bone} · 조개 ${p.shell} · 장신구 ${p.beads}`;
    $('toolStatus').textContent = `장착: ${P.TOOLS[p.selected].name} · 남은 사용 ${Math.ceil(p.tools[p.selected] || 0)}회${s.civilization.research.toolbox ? ' · 작업별 도구함 자동 적용' : ''}${!(p.tools[p.selected] > 0) ? ' · 도구를 만들어 주세요' : ''}`;
    for (const [id, t] of Object.entries(P.TOOLS)) {
      const b = $(`tool-${id}`), yes = P.available(s, id);
      if (!b) continue;
      // A worn tool may still be selected for shell exchange even without stone.
      b.disabled = paused || !yes || Boolean(p.grinding);
      b.setAttribute('aria-pressed', p.selected === id);
      $(`uses-${id}`).textContent = yes ? `남은 ${Math.ceil(p.tools[id] || 0)}회 · ${Object.entries(t.cost || { stone: 1 }).map(([k, n]) => `${S.RESOURCES[k] || '뼈'} ${n}`).join(' + ')}${t.kind === 'ground' ? ' + 갈기' : ''}` : t.bronze ? '청동기 배움에서 열려요' : t.late ? '기초 뗀석기 제작 후' : '간석기 다듬기 후';
    }
    $('grindBox').hidden = !p.grinding;
    $('grindText').textContent = p.grinding ? `${P.TOOLS[p.grinding.id].name} · 갈기 ${Math.floor(p.grinding.progress)}/6` : '';
    $('grindBtn').disabled = paused || !p.grinding;
    $('clothingText').textContent = `가죽옷: ${p.clothing ? '완성 · 온기 감소 절반' : '옷감 2 + 뚜르개'} / 뼈 무늬: ${p.engraved ? '완성 · 다음 제작 내구도 +8' : '뼈 1 + 새기개'}`;
    $('cropStatus').textContent = `곡물 ${p.grain}/60 · ${p.tilled > 0 ? `일군 밭 ${Math.ceil(p.tilled)}초 · 성장 2배` : '돌괭이로 일구면 성장 2배'} · 식량 처리는 손 1 / 갈판과 갈돌 3`;
    p.crops.forEach((n, i) => { $(`crop-${i}`).textContent = n >= 20 ? `🌾 ${i + 1} 수확` : `🌱 ${i + 1} · ${Math.floor(n / 20 * 100)}%`; $(`crop-${i}`).disabled = paused || !S.count(s, 'farm') || n < 20 || p.grain >= 60; });
    for (const id of Object.keys(P.PROJECTS)) {
      const reason = S.projectReason(s, id);
      $(`life-build-${id}`).disabled = paused || Boolean(reason); $(`life-build-${id}`).textContent = S.count(s, id) ? '완료' : '건설'; $(`life-reason-${id}`).textContent = reason;
    }
    $('automaticStatus').textContent = `자동 작업 ${p.stats.automatic}회 · 주민을 늘리거나 옮겨 배치하지 않아도 작동해요.`;
    for (const [id, r] of Object.entries(P.RESEARCH)) {
      const done = p.research[id], ready = S.count(s, r.facility);
      for (let i = 0; i < 2; i++) $(`research-${id}-${i}`).disabled = paused || !ready || done;
      $(`research-state-${id}`).textContent = done ? '✓ 자동화 연구 완료' : ready ? '틀려도 자원이 줄지 않아요. 다시 연결해 보세요.' : `${P.PROJECTS[r.facility].name}을 먼저 지어요.`;
    }
    $('lifeFeedback').textContent = p.feedback;
  }
  window.SettlementPrehistoryUI = { markup, update };
})();

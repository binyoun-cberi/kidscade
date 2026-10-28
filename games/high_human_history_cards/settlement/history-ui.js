(function () {
  'use strict';
  const S = window.SettlementSim, H = S.History;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  function sources(c) { return c.sources.map(id => `<a href="${esc(H.SOURCES[id].url)}" target="_blank" rel="noopener noreferrer">${esc(H.SOURCES[id].title)} ↗</a>`).join(''); }
  function coexistence() {
    const years = [650, 700, 910, 920, 940];
    return `<details class="history-timeline"><summary>같은 시기에 어떤 나라들이 있었을까?</summary><p>탐방 순서는 학습 순서예요. 아래 연표는 실제 연대의 겹침을 보여 줘요.</p><div class="table-scroll"><table><caption>대표 연도에 함께 존재한 나라</caption><thead><tr><th scope="col">나라</th>${years.map(y => `<th scope="col">${y}년</th>`).join('')}</tr></thead><tbody>${H.TIMELINE.map(n => `<tr><th scope="row">${n.name}</th>${years.map(y => `<td>${H.timelineAt(y).some(k => k.id === n.id) ? '●' : '—'}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p>멸망·교체가 일어난 해의 앞뒤를 단순화하지 않도록 대표 연도를 골랐어요. 920년에는 신라·발해·후백제·고려가 함께 존재했어요.</p></details>`;
  }
  function chapter(s, c) {
    const done = s.history.completed.includes(c.id), open = H.available(s, c.id), why = H.claimReason(s, c.id);
    return `<section class="history-chapter"><small class="eyebrow">${esc(c.group)}</small><h3>${esc(c.title)} <span>${done ? '배움 기록 완료' : '생활과 자료 연결'}</span></h3><p class="history-period">${esc(c.period)}</p><div class="concepts">${c.concepts.map(x => `<span>${esc(x)}</span>`).join('')}</div>${c.facts.map(f => `<p class="history-fact">${esc(f)}</p>`).join('')}<h4>마을에서 해볼 일</h4><ul class="history-goals">${c.goals.map(g => `<li class="${H.goalDone(s, g) ? 'done' : ''}">${H.goalDone(s, g) ? '✓' : '○'} ${esc(g.label)}${g.type === 'project' && !H.goalDone(s, g) ? `<button type="button" data-history-project="${g.id}">작업 보기</button>` : ''}</li>`).join('')}</ul><div class="reflection"><h4>생각 잇기</h4><p>${esc(c.reflection.prompt)}</p>${c.reflection.choices.map((choice, i) => `<button type="button" data-answer="${i}" data-chapter="${c.id}" ${!open ? 'disabled' : ''}>${esc(choice)}</button>`).join('')}<p id="historyFeedback" role="status">${esc(s.history.feedback || (s.history.answers[c.id] ? c.reflection.explain : '자료와 방금 한 일을 연결해 골라 보세요. 다시 생각해도 괜찮아요.'))}</p></div><button type="button" id="claimChapter" data-claim="${c.id}" ${why ? 'disabled' : ''}>${done ? '✓ 기록했어요' : '이 배움을 기록하기'}</button><p id="claimReason" class="panel-intro">${done ? '다른 나라와 연결해 다시 살펴볼 수 있어요.' : esc(why)}</p><div class="history-sources">${sources(c)}</div></section>`;
  }
  function markup(s, lesson = false, projectHTML = '') {
    const groups = [...new Set(H.CHAPTERS.map(c => c.group))];
    const intro = `<div class="history-switch"><button type="button" data-history-view="journey" aria-pressed="${!lesson}">탐방 과제</button><button type="button" data-history-view="lesson" aria-pressed="${lesson}">수업 자료</button></div><p class="panel-intro">한 마을이 모든 나라로 변하는 역사가 아니에요. 성장한 마을을 <b>역사 탐방 모형</b>으로 삼아 같은 시기의 나라들도 비교해요.</p>${coexistence()}`;
    if (lesson) return intro + `<p class="history-model-note">사회·역사 기초 주제를 다룹니다. 학년별 공식 성취기준 전체를 대체하는 교재는 아니에요. 비용·생산 속도·건물 배치는 게임의 가상 모형입니다.</p>` + groups.map(group => `<section class="lesson-group"><h3>${group}</h3>${H.CHAPTERS.filter(c => c.group === group).map(c => `<details><summary>${c.title} · ${c.concepts.join(' / ')}</summary><p class="history-period">${esc(c.period)}</p>${c.facts.map(f => `<p>${esc(f)}</p>`).join('')}<p><b>마을 연결:</b> ${c.goals.map(g => esc(g.label)).join(' → ')}</p><p><b>함께 생각하기:</b> ${esc(c.reflection.prompt)}</p><p>${esc(c.reflection.explain)}</p><div class="history-sources">${sources(c)}</div></details>`).join('')}</section>`).join('');
    return intro + projectHTML + `<div class="chapter-nav" aria-label="역사 탐방 고르기">${groups.map(group => `<h4>${group}</h4>${H.CHAPTERS.filter(c => c.group === group).map(c => `<button type="button" data-history="${c.id}" aria-pressed="${s.history.active === c.id}" ${!H.available(s, c.id) ? 'disabled' : ''}>${s.history.completed.includes(c.id) ? '✓ ' : ''}${c.title}</button>`).join('')}`).join('')}</div><p class="history-counter">${s.history.completed.length} / ${H.CHAPTERS.length} 배움 기록</p>` + chapter(s, H.byId(s.history.active));
  }
  function update(s) {
    const c = H.byId(s.history.active);
    const claim = document.querySelector('[data-claim]');
    if (claim) { claim.disabled = Boolean(H.claimReason(s, c.id)); const reason = document.getElementById('claimReason'); if (reason) reason.textContent = s.history.completed.includes(c.id) ? '배움을 기록했어요.' : H.claimReason(s, c.id); }
  }
  function production(s, icons, projectHTML) {
    return projectHTML + '<p class="panel-intro">채광 → 연료 → 제련·가공 → 입고를 연결해요. 가공에는 원료와 일손이 필요하고, 숯 생산은 목재 12개를 남겨요. 수치는 실제 공정의 수율이 아닌 학습용 모형입니다.</p>' + Object.entries(H.JOBS).map(([id, d]) => {
      const cost = Object.entries(d.cost || {}).map(([k, n]) => `${icons[k]} ${S.RESOURCES[k]} ${n}`).join(' + ');
      return `<article class="production-card"><div><h3>${icons[d.resource]} ${d.name}</h3><b id="stock-${id}"></b></div><p>${cost ? cost + ' → ' : '광맥에서 채취 → '}${S.RESOURCES[d.resource]} ${d.amount}</p><p id="production-rate-${id}"></p><p>${S.PROJECTS[d.facility].name} 필요 · ${S.workTime(s, id)}초 작업 + 운반</p><button type="button" data-production-worker="${id}" ${S.jobLimit(s, id) ? '' : 'disabled'}>일꾼에게 맡기기</button>${!S.jobLimit(s, id) ? `<button type="button" data-history-project="${d.facility}">시설 보기</button>` : ''}</article>`;
    }).join('') + `<section class="print-mode"><h4>인쇄 방식 선택</h4><p>목판은 판에 새긴 글, 금속활자는 따로 만든 글자를 조합해요. 진행 중인 작업은 시작한 방식으로 입고돼요.</p><button type="button" data-print="woodblock" ${S.count(s, 'woodblock') ? '' : 'disabled'}>목판 방식</button><button type="button" data-print="type" ${S.count(s, 'movableType') ? '' : 'disabled'}>금속활자 방식</button><p id="printModeLabel"></p></section>`;
  }
  window.SettlementHistoryUI = { markup, update, production };
})();

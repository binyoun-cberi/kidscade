/* Byeokrando first-voyage tutorial v2
 * Action-driven onboarding: rumor -> buy -> route -> sail -> arrive -> sell.
 * Kept outside the 5MB illustrated game document so tutorial iteration stays small and reversible.
 */
(() => {
  'use strict';
  if (window.__byeokrandoTutorialV2) return;
  window.__byeokrandoTutorialV2 = true;

  const B = window.__byeokrandoBridge;
  if (!B) return;

  const KEY = 'kidscade_byeokrando_tutorial_v2';
  const $ = id => document.getElementById(id);
  const NAV_KEYS = new Set([
    'KeyW','KeyA','KeyS','KeyD',
    'ArrowUp','ArrowDown','ArrowLeft','ArrowRight',
    'ShiftLeft','ShiftRight'
  ]);

  let running = false;
  let forceTutorial = false;
  let stepIndex = 0;
  let currentTarget = null;
  let tickTimer = 0;
  let movedDuringSail = false;
  let lastStateSignature = '';

  const style = document.createElement('style');
  style.textContent = `
#byeokTutorialShade{position:fixed;inset:0;z-index:238;background:rgba(5,4,3,.28);pointer-events:none;opacity:0;transition:opacity .18s}
#byeokTutorialShade.show{opacity:1}
#byeokTutorialFocus{position:fixed;z-index:239;display:none;border:3px solid #f3c45d;border-radius:9px;pointer-events:none;box-shadow:0 0 0 5px rgba(243,196,93,.18),0 0 0 9999px rgba(5,4,3,.38),0 0 28px rgba(255,204,94,.72);transition:left .15s,top .15s,width .15s,height .15s;animation:byeokTutPulse 1.2s ease-in-out infinite}
#byeokTutorialCard{position:fixed;z-index:241;width:min(350px,calc(100vw - 28px));padding:14px 15px 13px;border:1px solid #d1a34f;border-radius:10px;background:linear-gradient(145deg,#f3e3b7,#d4b874);color:#261b11;box-shadow:0 18px 54px #000b;font:700 12px/1.55 system-ui,-apple-system,"Noto Sans KR",sans-serif;display:none;pointer-events:auto}
#byeokTutorialCard.show{display:block}
#byeokTutorialCard .tutEyebrow{font:900 9px/1.2 system-ui;letter-spacing:.13em;color:#765226;text-transform:uppercase}
#byeokTutorialCard h3{margin:5px 0 7px;font:900 20px/1.2 Georgia,"Noto Serif KR",serif;color:#2d2115}
#byeokTutorialCard p{margin:0;color:#4a3825}
#byeokTutorialCard .tutHint{margin-top:8px;padding:8px 9px;border-radius:6px;background:rgba(71,48,27,.1);color:#5b4226;font-size:11px}
#byeokTutorialCard .tutProgress{height:4px;margin:11px 0 10px;border-radius:6px;background:#a88b5a55;overflow:hidden}
#byeokTutorialCard .tutProgress i{display:block;height:100%;background:#7b5529;transition:width .2s}
#byeokTutorialCard .tutActions{display:flex;justify-content:space-between;align-items:center;gap:8px}
#byeokTutorialCard button{border:0;border-radius:5px;padding:8px 11px;font-weight:900;cursor:pointer}
#byeokTutorialSkip{background:transparent;color:#735d3d;text-decoration:underline;padding-left:0!important}
#byeokTutorialNext{margin-left:auto;background:#342416;color:#f6e2b3}
#byeokTutorialAction{font-size:10px;color:#785d35}
#byeokTutorialMini{position:absolute;z-index:82;right:14px;bottom:97px;border:1px solid rgba(230,189,98,.65);border-radius:6px;padding:7px 9px;background:rgba(25,17,11,.88);color:#f2d68f;font:900 10px system-ui;box-shadow:0 5px 18px #0007;display:none;pointer-events:none}
@keyframes byeokTutPulse{0%,100%{filter:brightness(1)}50%{filter:brightness(1.28)}}
@media(max-width:700px){
 #byeokTutorialCard{font-size:11px}
 #byeokTutorialCard h3{font-size:17px}
 #byeokTutorialMini{right:8px;bottom:91px}
}
`;
  document.head.appendChild(style);

  const shade = document.createElement('div');
  shade.id = 'byeokTutorialShade';
  const focus = document.createElement('div');
  focus.id = 'byeokTutorialFocus';
  const card = document.createElement('div');
  card.id = 'byeokTutorialCard';
  card.innerHTML = `
    <div class="tutEyebrow">FIRST VOYAGE · 초보 상인 길잡이</div>
    <h3 id="byeokTutorialTitle"></h3>
    <p id="byeokTutorialText"></p>
    <div class="tutHint" id="byeokTutorialHint"></div>
    <div class="tutProgress"><i id="byeokTutorialProgress"></i></div>
    <div class="tutActions">
      <button id="byeokTutorialSkip" type="button">건너뛰기</button>
      <span id="byeokTutorialAction"></span>
      <button id="byeokTutorialNext" type="button">다음</button>
    </div>`;
  document.body.append(shade, focus, card);

  const mini = document.createElement('div');
  mini.id = 'byeokTutorialMini';
  mini.textContent = '첫 상행 실습 진행 중';
  $('app')?.appendChild(mini);

  function savedStatus() {
    try { return localStorage.getItem(KEY); } catch (_) { return null; }
  }
  function markStatus(value) {
    try { localStorage.setItem(KEY, value); } catch (_) {}
  }
  function state() { return B.getState?.(); }
  function persist() {
    try { B.persistState?.(false); } catch (_) {}
  }
  function setObjective(text) {
    const el = $('objectiveText');
    if (el) el.textContent = text;
  }
  function setLegacyTutorialDone() {
    const s = state();
    if (!s) return;
    s.tutorial = Math.max(3, Number(s.tutorial) || 0);
    persist();
  }
  function normalObjective() {
    const s = state();
    if (!s || s.mode !== 'port') return;
    setObjective(s.place === 'byeokrando'
      ? '시세를 비교해 화물을 준비하고, 세계지도에서 수익이 날 항로를 골라 출항하세요.'
      : '현재 항구의 시세·소문·의뢰를 확인하고 다음 교역을 준비하세요.');
  }

  function hotspotByText(...terms) {
    return () => [...document.querySelectorAll('#hotspots .hotspot')]
      .find(el => terms.some(t => el.textContent.includes(t))) || null;
  }
  function celadonBuy() {
    const card = [...document.querySelectorAll('#goodsGrid .card')]
      .find(el => el.querySelector('h3')?.textContent.includes('고려청자'));
    return card?.querySelector('.buy') || null;
  }
  function loadedCargoSell() {
    const cards = [...document.querySelectorAll('#goodsGrid .card')];
    const s = state();
    const goods = B.getGoods?.() || {};
    const loaded = Object.entries(s?.cargo || {}).find(([, qty]) => qty > 0)?.[0];
    if (loaded && goods[loaded]) {
      const named = cards.find(el => el.querySelector('h3')?.textContent.includes(goods[loaded].name));
      if (named) return named.querySelector('.sell');
    }
    const fallback = cards.find(el => /화물칸\s*[1-9]\d*개/.test(el.textContent));
    return fallback?.querySelector('.sell') || null;
  }
  function visible(el) {
    if (!el || !el.isConnected) return false;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  }

  const steps = [
    {
      id:'welcome', mode:'manual',
      title:'작은 상선으로 첫 장사를 해봅시다',
      text:'벽란도에서 정보를 얻고 고려청자를 산 뒤, 송나라 명주까지 직접 항해해 팔아보는 첫 상행 실습입니다.',
      hint:'설명을 읽기만 하는 튜토리얼이 아니라 실제 게임 조작으로 진행합니다.',
      objective:'첫 상행 실습을 시작합니다. 객주 → 교역 → 항해 → 판매까지 직접 해보세요.',
      next:'실습 시작'
    },
    {
      id:'tavern', mode:'click',
      title:'1. 먼저 객주에서 정보를 모으세요',
      text:'항구의 금빛 ‘벽란객주’ 라벨을 눌러 상인과 선원들의 이야기를 들어봅니다.',
      hint:'객주의 소문은 특정 항구·물품의 시세를 일정 기간 바꾸기도 합니다.',
      objective:'금빛 벽란객주 라벨을 눌러 시세 소문을 들어보세요.',
      target:hotspotByText('벽란객주','객주')
    },
    {
      id:'rumor', mode:'click',
      title:'2. 소문을 항해일지에 기록하세요',
      text:'‘술 한잔하며 소문 듣기’를 눌러 실제 시세 정보를 하나 확보합니다.',
      hint:'이번 실습의 목적지는 소문과 관계없이 명주로 고정해, 첫 거래 흐름부터 익힙니다.',
      objective:'객주에서 소문을 하나 들어보세요.',
      target:()=> $('drinkRumorBtn')
    },
    {
      id:'leave-tavern', mode:'click',
      title:'3. 항구로 돌아갑니다',
      text:'소문을 들었으면 객주를 나와 실제 화물을 준비할 차례입니다.',
      hint:'‘항구로 나가기’를 눌러 벽란도 항구 화면으로 돌아가세요.',
      objective:'객주를 나와 교역전으로 이동하세요.',
      target:()=> $('tavernSceneClose')
    },
    {
      id:'market', mode:'click',
      title:'4. 교역전으로 가세요',
      text:'벽란도는 고려청자·인삼·고려지를 비교적 싸게 살 수 있는 출발항입니다.',
      hint:'금빛 ‘교역전’ 라벨을 누르세요.',
      objective:'금빛 교역전 라벨을 눌러 첫 화물을 준비하세요.',
      target:hotspotByText('교역전','교역소','시장')
    },
    {
      id:'buy', mode:'click',
      title:'5. 고려청자 1개를 매입하세요',
      text:'벽란도에서 싼 고려청자를 사서 명주에서 더 높은 가격에 파는 기본 교역을 연습합니다.',
      hint:'가격 옆의 등락률과 아래 화물칸도 함께 확인해 보세요.',
      objective:'고려청자 1개를 구매해 청해호에 적재하세요.',
      target:celadonBuy
    },
    {
      id:'close-market', mode:'click',
      title:'6. 화물을 실었으면 시장을 닫으세요',
      text:'고려청자가 화물칸에 들어갔습니다. 이제 목적지를 정합니다.',
      hint:'교역소 창의 ‘닫기’를 누르세요.',
      objective:'교역소를 닫고 세계지도에서 명주를 목적지로 정하세요.',
      target:()=> document.querySelector('#marketModal [data-close="marketModal"]')
    },
    {
      id:'map', mode:'click',
      title:'7. 세계지도를 여세요',
      text:'항구마다 매입·판매 가격이 다릅니다. 장사는 지도를 보고 항로를 고르는 것부터 시작합니다.',
      hint:'화면 위쪽의 ‘세계지도’ 버튼을 누르세요.',
      objective:'세계지도를 열어 명주행 항로를 확인하세요.',
      target:()=> $('mapBtn')
    },
    {
      id:'destination', mode:'click',
      title:'8. 명주를 목적지로 설정하세요',
      text:'명주는 고려청자와 인삼의 판매가가 높은 송나라 국제항입니다. 첫 항해는 명주로 갑니다.',
      hint:'명주가 이미 선택되어 있습니다. ‘이 항구를 목적지로 설정’을 누르세요.',
      objective:'명주를 목적지로 설정하세요.',
      target:()=> $('setDestBtn')
    },
    {
      id:'dock', mode:'click',
      title:'9. 나루에서 출항을 준비하세요',
      text:'목적지를 정했으면 벽란도의 나루로 갑니다. 식량과 화물, 예상 항해일을 출항 전에 확인합니다.',
      hint:'금빛 ‘나루 / 출항’ 라벨을 누르세요.',
      objective:'나루 / 출항을 눌러 출항 준비 화면을 여세요.',
      target:hotspotByText('나루','출항','부두','항구')
    },
    {
      id:'depart', mode:'click',
      title:'10. 명주를 향해 출항하세요',
      text:'출항 준비 창에서 화물과 식량이 충분한지 확인한 뒤 실제 항해를 시작합니다.',
      hint:'‘출항’ 버튼을 누르세요.',
      objective:'명주행 출항 버튼을 누르세요.',
      target:()=> $('departBtn')
    },
    {
      id:'steer', mode:'keys',
      title:'11. 배를 직접 조종해 보세요',
      text:'W/S로 가감속, A/D로 조타합니다. Shift는 전속입니다. 화면의 금빛 목적지 화살표가 위를 향하도록 방향을 맞추세요.',
      hint:'W·A·S·D 또는 방향키를 한 번 조작하면 다음 안내로 넘어갑니다.',
      objective:'W/S 가감속 · A/D 조타. 금빛 화살표를 따라 명주로 항해하세요.',
      target:()=> $('sailActions')
    },
    {
      id:'sailing', mode:'wait-arrival',
      title:'12. 금빛 화살표를 따라 명주까지 항해하세요',
      text:'진행도 100%에 가까워지면 자동으로 입항합니다. 풍향과 속도, 항로 진행도를 보며 계속 조종하세요.',
      hint:'해적이 나타나면 Space 불화살, R 충각, B 백병전을 사용할 수 있습니다. 우선 목적지 도착이 목표입니다.',
      objective:'항로 진행도를 올려 명주에 입항하세요.',
      target:()=> $('courseGuide')
    },
    {
      id:'mingzhou-market', mode:'click',
      title:'13. 명주의 시박사로 가세요',
      text:'명주에 도착했습니다. 이제 싣고 온 고려청자를 현지 시세에 팔아 첫 상행을 완성합니다.',
      hint:'명주 항구의 금빛 ‘시박사’ 라벨을 누르세요.',
      objective:'명주의 시박사를 눌러 고려청자를 판매하세요.',
      target:hotspotByText('시박사','교역소','교역전','시장')
    },
    {
      id:'sell', mode:'click',
      title:'14. 싣고 온 화물을 판매하세요',
      text:'화물칸에 있는 고려청자의 ‘1개 판매’를 누르세요. 벽란도 매입가와 명주 판매가의 차이가 수익이 됩니다.',
      hint:'다음부터는 소문과 지도, 가격 등락을 비교해 자신만의 항로를 고르면 됩니다.',
      objective:'고려청자를 판매해 첫 상행을 마무리하세요.',
      target:loadedCargoSell
    },
    {
      id:'complete', mode:'complete',
      title:'첫 상행 완료!',
      text:'정보를 얻고 → 싸게 사고 → 항로를 정하고 → 직접 운송하고 → 비싸게 파는 벽란도 상행기의 핵심 흐름을 한 번 모두 해냈습니다.',
      hint:'이제 의뢰, 인재 영입, 조선소 개조, 창고·전장, 여러 항구의 시세를 자유롭게 활용할 수 있습니다.',
      objective:'첫 상행 완료. 이제 시세와 소문을 비교하며 자유롭게 상단을 키워보세요.',
      next:'자유 상행 시작'
    }
  ];

  function progressPct() {
    return Math.round((Math.min(stepIndex, steps.length - 1) / (steps.length - 1)) * 100);
  }

  function resolveTarget(step) {
    if (!step?.target) return null;
    try {
      const el = step.target();
      return visible(el) ? el : null;
    } catch (_) {
      return null;
    }
  }

  function positionCard(target) {
    if (!running) return;
    const margin = 14;
    const cw = Math.min(350, innerWidth - margin * 2);
    card.style.width = cw + 'px';

    if (!target) {
      card.style.left = Math.max(margin, (innerWidth - cw) / 2) + 'px';
      card.style.top = Math.max(margin, innerHeight * .5 - 150) + 'px';
      focus.style.display = 'none';
      return;
    }

    const r = target.getBoundingClientRect();
    const pad = 7;
    focus.style.display = 'block';
    focus.style.left = Math.max(4, r.left - pad) + 'px';
    focus.style.top = Math.max(4, r.top - pad) + 'px';
    focus.style.width = Math.min(innerWidth - 8, r.width + pad * 2) + 'px';
    focus.style.height = Math.min(innerHeight - 8, r.height + pad * 2) + 'px';

    const cardRect = card.getBoundingClientRect();
    const ch = Math.max(185, cardRect.height || 220);
    let left = Math.min(innerWidth - cw - margin, Math.max(margin, r.left + r.width / 2 - cw / 2));
    let top;
    if (r.bottom + 16 + ch <= innerHeight - margin) top = r.bottom + 16;
    else if (r.top - 16 - ch >= margin) top = r.top - 16 - ch;
    else top = Math.min(innerHeight - ch - margin, Math.max(margin, r.top + r.height / 2 - ch / 2));
    card.style.left = left + 'px';
    card.style.top = Math.max(margin, top) + 'px';
  }

  function renderStep() {
    if (!running) return;
    const step = steps[stepIndex];
    if (!step) return;

    currentTarget = resolveTarget(step);
    shade.classList.add('show');
    card.classList.add('show');
    mini.style.display = step.mode === 'wait-arrival' ? 'block' : 'none';

    $('byeokTutorialTitle').textContent = step.title;
    $('byeokTutorialText').textContent = step.text;
    $('byeokTutorialHint').textContent = step.hint || '';
    $('byeokTutorialHint').style.display = step.hint ? 'block' : 'none';
    $('byeokTutorialProgress').style.width = progressPct() + '%';
    setObjective(step.objective || step.text);

    const next = $('byeokTutorialNext');
    const action = $('byeokTutorialAction');
    if (step.mode === 'manual' || step.mode === 'complete') {
      next.style.display = 'block';
      next.textContent = step.next || (step.mode === 'complete' ? '완료' : '다음');
      action.textContent = '';
    } else {
      next.style.display = 'none';
      action.textContent = currentTarget
        ? (step.mode === 'keys' ? '직접 조작하세요' : step.mode === 'wait-arrival' ? '항해 중…' : '강조된 곳을 직접 누르세요')
        : '화면 준비 중…';
    }

    if (step.mode === 'complete') {
      markStatus('done');
      setLegacyTutorialDone();
      mini.style.display = 'none';
    }
    positionCard(currentTarget);
  }

  function advance() {
    if (!running) return;
    const step = steps[stepIndex];
    if (step?.mode === 'complete') return finishTutorial();
    stepIndex = Math.min(stepIndex + 1, steps.length - 1);
    if (steps[stepIndex]?.id === 'sailing') {
      setLegacyTutorialDone();
    }
    requestAnimationFrame(renderStep);
  }

  function finishTutorial() {
    markStatus('done');
    setLegacyTutorialDone();
    running = false;
    clearInterval(tickTimer);
    tickTimer = 0;
    shade.classList.remove('show');
    focus.style.display = 'none';
    card.classList.remove('show');
    mini.style.display = 'none';
    normalObjective();
    try { window.dispatchEvent(new CustomEvent('byeokrando-tutorial-finished')); } catch (_) {}
  }

  function skipTutorial() {
    markStatus('skipped');
    setLegacyTutorialDone();
    running = false;
    clearInterval(tickTimer);
    tickTimer = 0;
    shade.classList.remove('show');
    focus.style.display = 'none';
    card.classList.remove('show');
    mini.style.display = 'none';
    normalObjective();
  }

  function tick() {
    if (!running) return;
    const step = steps[stepIndex];
    if (!step) return;

    const nextTarget = resolveTarget(step);
    if (nextTarget !== currentTarget) {
      currentTarget = nextTarget;
      renderStep();
    } else {
      positionCard(currentTarget);
    }

    if (step.mode === 'wait-arrival') {
      const s = state();
      if (s?.mode === 'port' && s.place === 'mingzhou') {
        setTimeout(() => {
          if (running && steps[stepIndex]?.mode === 'wait-arrival') advance();
        }, 350);
      }
    }

    // Recover gracefully if the player arrives before the navigation-key event was observed.
    if (step.mode === 'keys') {
      const s = state();
      const sail = B.getSailState?.();
      if (s?.mode === 'sail' && (movedDuringSail || (sail?.progress || 0) > .008)) advance();
    }

    const s = state();
    const sig = s ? [s.mode,s.place,s.destination,s.tutorial,Object.values(s.cargo || {}).join(',')].join('|') : '';
    if (sig !== lastStateSignature) lastStateSignature = sig;
  }

  function startTutorial({forced=false} = {}) {
    if (running) return;
    const s = state();
    if (!s) return;
    if (!forced && savedStatus()) {
      setLegacyTutorialDone();
      normalObjective();
      return;
    }
    running = true;
    movedDuringSail = false;
    stepIndex = 0;
    s.tutorial = 0;
    clearInterval(tickTimer);
    tickTimer = setInterval(tick, 140);
    renderStep();
  }

  card.addEventListener('click', e => {
    if (e.target.id === 'byeokTutorialSkip') {
      skipTutorial();
      return;
    }
    if (e.target.id === 'byeokTutorialNext') {
      advance();
    }
  });

  document.addEventListener('click', e => {
    if (!running) return;
    const step = steps[stepIndex];
    if (step?.mode !== 'click' || !currentTarget) return;
    if (currentTarget === e.target || currentTarget.contains(e.target)) {
      setTimeout(() => {
        if (running && steps[stepIndex] === step) advance();
      }, 0);
    }
  });

  window.addEventListener('keydown', e => {
    if (!running) return;
    const step = steps[stepIndex];
    if (step?.mode !== 'keys' || !NAV_KEYS.has(e.code)) return;
    movedDuringSail = true;
    setTimeout(() => {
      if (running && steps[stepIndex] === step) advance();
    }, 0);
  });

  window.addEventListener('resize', () => running && positionCard(currentTarget), {passive:true});
  window.addEventListener('scroll', () => running && positionCard(currentTarget), {passive:true,capture:true});

  function installMenuEntry() {
    const menu = document.querySelector('#mainMenu .menuButtons');
    const newBtn = $('newGameBtn');
    if (!menu || !newBtn || $('tutorialStartBtn')) return;

    const btn = document.createElement('button');
    btn.className = 'menuBtn';
    btn.id = 'tutorialStartBtn';
    btn.type = 'button';
    btn.textContent = '5분 튜토리얼';
    btn.title = '새 게임으로 첫 상행 실습을 다시 시작합니다.';
    menu.insertBefore(btn, $('menuSettingsBtn') || null);

    btn.addEventListener('click', () => {
      forceTutorial = true;
      newBtn.click();
    });

    newBtn.addEventListener('click', () => {
      const forced = forceTutorial;
      forceTutorial = false;
      setTimeout(() => {
        if (forced || !savedStatus()) startTutorial({forced});
        else {
          setLegacyTutorialDone();
          normalObjective();
        }
      }, 120);
    });

    $('continueBtn')?.addEventListener('click', () => {
      setTimeout(() => {
        if (savedStatus()) {
          setLegacyTutorialDone();
          normalObjective();
        }
      }, 120);
    });
  }

  installMenuEntry();
  if (!savedStatus()) {
    const foot = document.querySelector('#mainMenu .menuFoot');
    if (foot) foot.textContent = '처음이라면 5분 튜토리얼을 추천합니다. 첫 거래를 실제 조작으로 한 번 끝까지 연습합니다.';
  }

  window.byeokrandoTutorialDebug = {
    key:KEY,
    steps,
    start:()=>startTutorial({forced:true}),
    skip:skipTutorial,
    status:savedStatus
  };
})();
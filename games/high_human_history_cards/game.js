(() => {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const board = $('#board');
  const ui = {
    era: $('#eraLabel'), day: $('#dayLabel'), food: $('#foodLabel'), pop: $('#popLabel'), meal: $('#mealLabel'),
    questList: $('#questList'), discoveries: $('#discoveries'), hint: $('#hintText'), goalTitle: $('#goalTitle'), goalText: $('#goalText'),
    toast: $('#toast'), explore: $('#exploreBtn')
  };

  const CARD = {
    person:{name:'사람',emoji:'👤',kind:'human',sub:'무엇이든 배울 수 있음'},
    hunter:{name:'사냥꾼',emoji:'🏹',kind:'human',sub:'사냥과 채집 가능'},
    forest:{name:'숲',emoji:'🌲',kind:'node',sub:'나무를 얻을 수 있음'},
    berryBush:{name:'열매 덤불',emoji:'🫐',kind:'node',sub:'먹을 열매가 자람'},
    stoneSource:{name:'돌무더기',emoji:'🪨',kind:'node',sub:'돌을 주울 수 있음'},
    grassland:{name:'마른 풀밭',emoji:'🌾',kind:'node',sub:'불쏘시개를 구할 수 있음'},
    deer:{name:'사슴',emoji:'🦌',kind:'node',sub:'사냥감 · 사냥하면 사라짐'},
    wood:{name:'나무',emoji:'🪵',kind:'item',sub:'도구와 불의 재료'},
    stone:{name:'돌',emoji:'🪨',kind:'item',sub:'단단한 생활 재료'},
    tinder:{name:'마른 풀',emoji:'🌾',kind:'item',sub:'불을 붙이기 좋음'},
    berry:{name:'열매',emoji:'🫐',kind:'food',sub:'식량 1'},
    handaxe:{name:'뗀석기 도끼',emoji:'🪓',kind:'item',sub:'사냥 기술을 열어 줌'},
    campfire:{name:'모닥불',emoji:'🔥',kind:'building',sub:'날고기를 익힐 수 있음'},
    rawMeat:{name:'날고기',emoji:'🥩',kind:'item',sub:'불에 익혀야 먹기 좋음'},
    hide:{name:'가죽',emoji:'🟫',kind:'item',sub:'거처의 재료'},
    cookedMeat:{name:'익힌 고기',emoji:'🍖',kind:'food',sub:'식량 1'},
    shelter:{name:'움막',emoji:'⛺',kind:'building',sub:'정착의 시작'},
    field:{name:'작은 밭',emoji:'🌱',kind:'node',sub:'사람이 돌보면 곡식 생산'},
    grain:{name:'곡식',emoji:'🌾',kind:'food',sub:'식량 1'},
    river:{name:'강가',emoji:'🏞️',kind:'node',sub:'사람이 물고기를 잡음'},
    fish:{name:'물고기',emoji:'🐟',kind:'food',sub:'식량 1'},
    goat:{name:'길들인 염소',emoji:'🐐',kind:'node',sub:'사람이 돌보면 젖 생산'},
    milk:{name:'염소젖',emoji:'🥛',kind:'food',sub:'식량 1'}
  };

  const state = {
    started:false, over:false, day:1, mealLeft:45, z:20, id:0, cards:new Map(),
    discoveries:new Set(), branch:null, branchCount:0, branchStartedAt:0,
    flags:{berry:false,handaxe:false,hunted:false,cooked:false,shelter:false},
    stats:{crafted:0,gathered:0,meals:0,discoveries:0},
    timers:[]
  };

  const branchInfo = {
    farm:{era:'신석기 전환기 · 농경', node:'field', product:'grain', name:'농경', emoji:'🌾', text:'들에 머물며 곡식을 반복해서 얻는 생활을 선택했습니다.'},
    fish:{era:'신석기 전환기 · 어로', node:'river', product:'fish', name:'어로', emoji:'🐟', text:'강가에 머물며 물고기를 잡는 생활을 선택했습니다.'},
    herd:{era:'신석기 전환기 · 목축', node:'goat', product:'milk', name:'목축', emoji:'🐐', text:'동물을 길들여 먹을거리를 얻는 생활을 선택했습니다.'}
  };

  const isWorker = (type) => type === 'person' || type === 'hunter';
  const pair = (a,b) => [a,b].sort().join('|');
  const edible = new Set(['berry','cookedMeat','grain','fish','milk']);

  const recipes = new Map([
    [pair('wood','stone'), {out:['handaxe'], name:'뗀석기 도끼', discovery:'돌을 나무 손잡이에 단단히 묶어 도구를 만들었습니다.'}],
    [pair('wood','tinder'), {out:['campfire'], name:'불 피우기', discovery:'마른 풀과 나무로 불을 안정적으로 피우기 시작했습니다.'}],
    [pair('person','handaxe'), {out:['hunter'], name:'사냥 기술', discovery:'도구를 든 사람이 사냥꾼 역할을 맡기 시작했습니다.'}],
    [pair('wood','hide'), {out:['shelter'], name:'움막', discovery:'나무와 가죽으로 머물 수 있는 거처를 만들었습니다.'}]
  ]);

  function resetState(){
    state.started = true; state.over = false; state.day = 1; state.mealLeft = 45; state.z = 20; state.id = 0;
    state.cards.clear(); state.discoveries.clear(); state.branch = null; state.branchCount = 0;
    state.flags = {berry:false,handaxe:false,hunted:false,cooked:false,shelter:false};
    state.stats = {crafted:0,gathered:0,meals:0,discoveries:0};
    state.timers.forEach(clearInterval); state.timers = [];
    board.innerHTML = '';
    $('#branchLayer').classList.add('hidden'); $('#resultLayer').classList.add('hidden'); $('#gameOverLayer').classList.add('hidden');
    ui.era.textContent = '구석기 시대';
    spawnInitial();
    renderAll();
    const mealTimer = setInterval(() => {
      if (!state.started || state.over) return;
      state.mealLeft -= 1;
      if (state.mealLeft <= 0) eatMeal();
      renderHud();
    }, 1000);
    state.timers.push(mealTimer);
  }

  function spawnInitial(){
    const w = Math.max(560, board.clientWidth), h = Math.max(360, board.clientHeight);
    const pts = [
      ['person',.15,.20],['person',.27,.28],['berry',.12,.58],['berry',.22,.67],['berry',.33,.60],['berry',.44,.69],['berry',.54,.62],['berry',.64,.70],
      ['forest',.52,.16],['berryBush',.68,.18],['stoneSource',.82,.28],['grassland',.72,.52],['deer',.47,.48],['deer',.84,.61]
    ];
    pts.forEach(([type,px,py]) => addCard(type, Math.min(w-130, w*px), Math.min(h-160, h*py), false));
  }

  function addCard(type, x, y, animate=true){
    const def = CARD[type]; if (!def) return null;
    const id = ++state.id;
    const el = document.createElement('div');
    el.className = 'card ' + def.kind + (animate ? ' newborn' : '');
    el.dataset.id = id;
    el.innerHTML = '<div class="workTag">진행 중…</div><div class="cardTop">'+def.emoji+'</div><div class="cardName">'+def.name+'</div><div class="cardSub">'+def.sub+'</div><div class="progress"></div>';
    board.appendChild(el);
    const card = {id,type,x:0,y:0,busy:false,el};
    state.cards.set(id, card);
    place(card, clamp(x,5,Math.max(5,board.clientWidth-118)), clamp(y,5,Math.max(5,board.clientHeight-148)));
    bindDrag(card);
    if (animate) onCreated(type);
    return card;
  }

  function removeCard(card){
    if (!card || !state.cards.has(card.id)) return;
    card.el.remove(); state.cards.delete(card.id);
  }

  function place(card,x,y){
    card.x=x; card.y=y; card.el.style.left=x+'px'; card.el.style.top=y+'px';
  }

  function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }

  function bindDrag(card){
    let ox=0,oy=0,drag=false;
    card.el.addEventListener('pointerdown', (e) => {
      if (!state.started || state.over || card.busy) return;
      drag=true; card.el.setPointerCapture(e.pointerId); card.el.classList.add('dragging');
      const r=card.el.getBoundingClientRect(); ox=e.clientX-r.left; oy=e.clientY-r.top;
      card.el.style.zIndex=++state.z; e.preventDefault();
    });
    card.el.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const br=board.getBoundingClientRect();
      place(card, clamp(e.clientX-br.left-ox,4,Math.max(4,br.width-card.el.offsetWidth-4)), clamp(e.clientY-br.top-oy,4,Math.max(4,br.height-card.el.offsetHeight-4)));
      e.preventDefault();
    });
    const end=(e)=>{
      if(!drag)return; drag=false; card.el.classList.remove('dragging');
      try{card.el.releasePointerCapture(e.pointerId)}catch(_){}
      const target=findDropTarget(card);
      if(target) resolvePair(card,target);
    };
    card.el.addEventListener('pointerup',end); card.el.addEventListener('pointercancel',end);
  }

  function findDropTarget(card){
    const r=card.el.getBoundingClientRect(), cx=r.left+r.width/2, cy=r.top+r.height/2;
    let best=null,bestDist=Infinity;
    for(const other of state.cards.values()){
      if(other.id===card.id || other.busy) continue;
      const q=other.el.getBoundingClientRect();
      if(cx>=q.left && cx<=q.right && cy>=q.top && cy<=q.bottom){
        const d=Math.hypot(cx-(q.left+q.width/2),cy-(q.top+q.height/2));
        if(d<bestDist){best=other;bestDist=d;}
      }
    }
    return best;
  }

  function resolvePair(a,b){
    if(a.busy||b.busy)return;
    const key=pair(a.type,b.type);
    const recipe=recipes.get(key);
    if(recipe){
      craft(a,b,recipe); return;
    }
    const worker = isWorker(a.type)?a:(isWorker(b.type)?b:null);
    const other = worker ? (worker.id===a.id?b:a) : null;
    if(worker && other){
      const action = workerAction(worker,other);
      if(action){runAction(worker,other,action);return;}
    }
    if(key===pair('rawMeat','campfire')){
      const fire=a.type==='campfire'?a:b, meat=a.type==='rawMeat'?a:b;
      runProcessing(fire,meat,{ms:1700,label:'고기 익히는 중',out:['cookedMeat','cookedMeat'],discovery:'불에 익힌 고기는 더 든든한 식량이 되었습니다.'}); return;
    }
    showToast('아직 이 조합으로는 할 수 있는 일이 없어요.');
    separate(a,b);
  }

  function workerAction(worker,node){
    const common={
      forest:{ms:1300,label:'나무 모으는 중',out:['wood']},
      berryBush:{ms:1050,label:'열매 따는 중',out:['berry']},
      stoneSource:{ms:1250,label:'돌 줍는 중',out:['stone']},
      grassland:{ms:950,label:'마른 풀 모으는 중',out:['tinder']}
    };
    if(common[node.type]) return common[node.type];
    if(node.type==='deer' && worker.type==='hunter') return {ms:2100,label:'사냥하는 중',out:['rawMeat','hide'],consumeNode:true,discovery:'도구와 역할 분담으로 큰 사냥감에서 고기와 가죽을 얻었습니다.'};
    if(state.branch==='farm' && node.type==='field') return {ms:1750,label:'밭 돌보는 중',out:['grain']};
    if(state.branch==='fish' && node.type==='river') return {ms:1750,label:'물고기 잡는 중',out:['fish']};
    if(state.branch==='herd' && node.type==='goat') return {ms:1750,label:'염소 돌보는 중',out:['milk']};
    if(node.type==='deer') showToast('사슴은 맨손으로 잡기 어려워요. 뗀석기 도구가 필요해요.');
    return null;
  }

  function runAction(worker,node,def){
    worker.busy=true; node.busy=true; markBusy(worker,def.label,def.ms); markBusy(node,def.label,def.ms);
    snapTogether(worker,node);
    setTimeout(()=>{
      if(state.over)return;
      worker.busy=false; worker.el.classList.remove('busy'); worker.el.querySelector('.workTag').textContent='진행 중…';
      if(def.consumeNode){removeCard(node);}else{node.busy=false;node.el.classList.remove('busy');node.el.querySelector('.workTag').textContent='진행 중…';}
      const bx=(worker.x+(def.consumeNode?0:node.x))/ (def.consumeNode?1:2);
      const by=(worker.y+(def.consumeNode?0:node.y))/ (def.consumeNode?1:2);
      def.out.forEach((t,i)=>addCard(t,bx+118+(i*22),by+(i*20)));
      state.stats.gathered+=def.out.length;
      if(def.discovery) discover(def.label,def.discovery);
      if(node.type==='deer') state.flags.hunted=true;
      separate(worker,node);
      renderAll(); checkMilestones();
    },def.ms);
  }

  function runProcessing(station,input,def){
    station.busy=true; input.busy=true; markBusy(station,def.label,def.ms); markBusy(input,def.label,def.ms); snapTogether(input,station);
    setTimeout(()=>{
      if(state.over)return;
      station.busy=false;station.el.classList.remove('busy');station.el.querySelector('.workTag').textContent='진행 중…';
      const x=station.x+112,y=station.y+15; removeCard(input);
      def.out.forEach((t,i)=>addCard(t,x+(i*18),y+(i*28)));
      discover('익혀 먹기',def.discovery); renderAll(); checkMilestones();
    },def.ms);
  }

  function craft(a,b,recipe){
    const x=(a.x+b.x)/2,y=(a.y+b.y)/2;
    removeCard(a);removeCard(b);
    recipe.out.forEach((t,i)=>addCard(t,x+i*18,y+i*18));
    state.stats.crafted++; discover(recipe.name,recipe.discovery);
    renderAll(); checkMilestones();
  }

  function markBusy(card,label,ms){
    card.el.classList.add('busy');card.el.querySelector('.workTag').textContent=label;
    const p=card.el.querySelector('.progress');p.style.transition='none';p.style.width='0';
    requestAnimationFrame(()=>requestAnimationFrame(()=>{p.style.transition='width '+ms+'ms linear';p.style.width='100%';}));
  }

  function snapTogether(a,b){ place(a,b.x+12,b.y+14); a.el.style.zIndex=++state.z; }
  function separate(a,b){
    if(!a || !state.cards.has(a.id))return;
    if(b && state.cards.has(b.id)){
      const nx=clamp(b.x+b.el.offsetWidth+14,5,Math.max(5,board.clientWidth-a.el.offsetWidth-5));
      const ny=clamp(b.y+20,5,Math.max(5,board.clientHeight-a.el.offsetHeight-5)); place(a,nx,ny);
    }
  }

  function onCreated(type){
    if(type==='berry')state.flags.berry=true;
    if(type==='handaxe')state.flags.handaxe=true;
    if(type==='cookedMeat')state.flags.cooked=true;
    if(type==='shelter')state.flags.shelter=true;
    if(state.branch && type===branchInfo[state.branch].product){
      state.branchCount++; if(state.branchCount>=3) finishPrototype();
    }
  }

  function discover(name,text){
    if(state.discoveries.has(name))return;
    state.discoveries.add(name);state.stats.discoveries++;
    showToast('💡 발견: '+name);
    try{window.KidscadeGame?.sound?.('correct')}catch(_){}
    renderDiscoveries();
  }

  function checkMilestones(){
    if(state.flags.berry && state.flags.handaxe && state.flags.hunted && state.flags.cooked && state.flags.shelter && !state.branch){
      setTimeout(()=>{if(!state.branch&&!state.over)$('#branchLayer').classList.remove('hidden');},500);
    }
  }

  function chooseBranch(key){
    const info=branchInfo[key]; if(!info)return;
    state.branch=key;state.branchCount=0;state.branchStartedAt=Date.now();ui.era.textContent=info.era;
    $('#branchLayer').classList.add('hidden');
    const x=Math.max(35,board.clientWidth*.58),y=Math.max(50,board.clientHeight*.25);
    addCard(info.node,clamp(x,10,board.clientWidth-125),clamp(y,10,board.clientHeight-155));
    discover(info.name+' 생활',info.text);
    showToast(info.emoji+' '+info.name+' 생활을 시작했습니다. 사람을 새 카드에 겹쳐 보세요.');
    renderAll();
  }

  function finishPrototype(){
    if(state.over)return; state.over=true;
    const info=branchInfo[state.branch];
    $('#resultEmoji').textContent=info.emoji+'🏕️';
    $('#resultTitle').textContent=info.name+' 중심의 작은 정착지';
    $('#resultText').textContent=info.text+' 같은 출발에서도 무엇을 먼저 활용하느냐에 따라 다른 생활사가 만들어질 수 있다는 것이 이번 프로토타입의 핵심입니다.';
    $('#resultStats').innerHTML='<div><span>살아남은 날</span><b>'+state.day+'일</b></div><div><span>발견</span><b>'+state.stats.discoveries+'개</b></div><div><span>생산한 카드</span><b>'+(state.stats.gathered+state.stats.crafted)+'개</b></div>';
    $('#resultLayer').classList.remove('hidden');
    try{window.KidscadeGame?.score?.(state.day*100+state.stats.discoveries*50);window.KidscadeGame?.gameOver?.({score:state.day*100+state.stats.discoveries*50})}catch(_){}
  }

  function eatMeal(){
    const people=[...state.cards.values()].filter(c=>isWorker(c.type));
    const foods=[...state.cards.values()].filter(c=>edible.has(c.type));
    if(foods.length<people.length){
      state.over=true; $('#gameOverLayer').classList.remove('hidden'); return;
    }
    foods.slice(0,people.length).forEach(removeCard);
    state.stats.meals++;state.day++;state.mealLeft=45;
    showToast('🍲 '+people.length+'개의 식량으로 모두가 한 끼를 먹었습니다.');
  }

  function foodCount(){return [...state.cards.values()].filter(c=>edible.has(c.type)).length;}
  function population(){return [...state.cards.values()].filter(c=>isWorker(c.type)).length;}

  function explore(){
    if(state.over)return;
    const foods=[...state.cards.values()].filter(c=>edible.has(c.type));
    if(!foods.length){showToast('탐색에 가져갈 식량이 1개 필요해요.');return;}
    removeCard(foods[0]);
    const pool=['deer','berryBush','forest','stoneSource','grassland'];
    const type=pool[Math.floor(Math.random()*pool.length)];
    const x=40+Math.random()*Math.max(60,board.clientWidth-180),y=45+Math.random()*Math.max(80,board.clientHeight-220);
    addCard(type,x,y);showToast('🧭 새로운 '+CARD[type].name+'을(를) 발견했습니다.');
    renderAll();
  }

  function tidy(){
    const cards=[...state.cards.values()].filter(c=>!c.busy);
    const cols=Math.max(3,Math.floor((board.clientWidth-20)/120));
    cards.forEach((c,i)=>{
      const col=i%cols,row=Math.floor(i/cols);
      place(c,10+col*118,10+row*150);
    });
  }

  function renderAll(){renderHud();renderQuests();renderDiscoveries();renderGoal();}
  function renderHud(){
    ui.day.textContent=state.day+'일';ui.food.textContent=foodCount();ui.pop.textContent=population();ui.meal.textContent=state.mealLeft+'초';
    ui.explore.disabled=foodCount()<1;
  }
  function renderQuests(){
    const qs=[
      ['berry','먹을 열매를 모은다',state.flags.berry],
      ['axe','나무와 돌로 뗀석기 도구를 만든다',state.flags.handaxe],
      ['hunt','도구를 이용해 사슴을 사냥한다',state.flags.hunted],
      ['cook','불을 피우고 고기를 익힌다',state.flags.cooked],
      ['home','나무와 가죽으로 움막을 만든다',state.flags.shelter]
    ];
    if(state.branch){
      const info=branchInfo[state.branch];qs.push(['branch',info.name+'으로 식량 3개 생산 ('+Math.min(3,state.branchCount)+'/3)',state.branchCount>=3]);
    }
    ui.questList.innerHTML=qs.map(q=>'<div class="quest '+(q[2]?'done':'')+'"><i>'+(q[2]?'✓':'·')+'</i><span>'+q[1]+'</span></div>').join('');
  }
  function renderDiscoveries(){
    const list=[...state.discoveries];
    ui.discoveries.innerHTML=list.length?list.map(x=>'<span class="discovery">'+x+'</span>').join(''):'<span class="discovery">아직 없음</span>';
  }
  function renderGoal(){
    if(!state.branch){
      ui.goalTitle.textContent='구석기에서 살아남기';
      ui.goalText.textContent='채집과 사냥, 불과 거처를 차례로 발견하면 정착 생활의 갈림길이 열립니다.';
      ui.hint.textContent=state.flags.handaxe?'뗀석기 도끼 + 사람 · 나무 + 마른 풀 · 나무 + 가죽':'나무 + 돌 · 나무 + 마른 풀 · 사람 + 자연 카드';
    }else{
      const info=branchInfo[state.branch];
      ui.goalTitle.textContent=info.name+' 생활 시험하기';
      ui.goalText.textContent='사람을 '+CARD[info.node].name+' 카드에 겹쳐 식량을 3개 생산해 보세요.';
      ui.hint.textContent='같은 출발이라도 농경·어로·목축 중 선택한 길에 따라 이후 문명이 달라집니다.';
    }
  }

  let toastTimer=null;
  function showToast(msg){
    ui.toast.textContent=msg;ui.toast.classList.add('show');clearTimeout(toastTimer);
    toastTimer=setTimeout(()=>ui.toast.classList.remove('show'),2200);
  }

  function closeLayer(id){$('#'+id)?.classList.add('hidden');}
  function start(){
    $('#startLayer').classList.add('hidden');resetState();
    try{window.KidscadeGame?.start?.()}catch(_){}
  }

  $('#startBtn').addEventListener('click',start);
  $('#restartBtn').addEventListener('click',resetState);
  $('#retryBtn').addEventListener('click',resetState);
  $('#exploreBtn').addEventListener('click',explore);
  $('#tidyBtn').addEventListener('click',tidy);
  $('#helpBtn').addEventListener('click',()=>$('#helpLayer').classList.remove('hidden'));
  document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>closeLayer(b.dataset.close)));
  document.querySelectorAll('[data-branch]').forEach(b=>b.addEventListener('click',()=>chooseBranch(b.dataset.branch)));
  window.addEventListener('resize',()=>{for(const c of state.cards.values())place(c,clamp(c.x,4,Math.max(4,board.clientWidth-c.el.offsetWidth-4)),clamp(c.y,4,Math.max(4,board.clientHeight-c.el.offsetHeight-4)));});
})();
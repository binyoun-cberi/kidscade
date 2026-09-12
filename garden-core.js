/* Kidscade garden: collection and housing. Existing wallets and avatar stay owned by index. */
(function (root) {
  'use strict';
  const KEY = 'kidscade_garden_v1';
  const COLS = 12, ROWS = 8;
  const animals = [
    ['hamster','햄스터','🐹','처음부터 함께해요',null,0],
    ['iguana','이구아나','🦎','처음부터 함께해요',null,0],
    ['fish','구피','🐟','처음부터 함께해요',null,0],
    ['dog','강아지','🐶','수학 게임 누적 3분','math',180],
    ['rabbit','토끼','🐰','국어 게임 누적 3분','korean',180],
    ['parrot','앵무새','🦜','외국어 게임 누적 3분','lang',180],
    ['turtle','거북이','🐢','상식 게임 누적 3분','trivia',180],
    ['cat','고양이','🐱','서로 다른 게임 4개 탐험','games',4],
    ['goat','염소','🐐','수학 게임 누적 12분','math',720],
    ['miniPig','미니돼지','🐷','국어 게임 누적 12분','korean',720],
    ['sugarGlider','슈가글라이더','🐿️','서로 다른 날 5일 탐험','days',5],
    ['neonTetra','네온테트라','🐠','외국어 게임 누적 10분','lang',600],
    ['platy','플래티','🐠','음악·예술 게임 누적 3분','music',180],
    ['cory','코리도라스','🐟','상식 게임 누적 10분','trivia',600],
    ['betta','베타','🐠','서로 다른 게임 10개 탐험','games',10]
  ].map(([id,name,icon,hint,track,goal])=>({id,name,icon,hint,track,goal}));
  const fishIds = ['fish','neonTetra','platy','cory','betta'];
  const land = animals.map(a=>a.id).filter(id=>!fishIds.includes(id));
  const facilities = {
    water:{name:'맑은 물 쉼터',icon:'💧',cost:80,w:1,h:1,action:'drink',users:land,desc:'다가와 고개를 숙이고 물을 마셔요.'},
    food:{name:'먹이 자리',icon:'🌾',cost:100,w:1,h:1,action:'feed',users:land,desc:'친구들이 모여 각자의 먹이를 먹어요.'},
    bed:{name:'포근한 잠자리',icon:'🛏️',cost:140,w:2,h:1,action:'sleep',users:land,desc:'눈을 감고 쉬어요. 여러 개 놓을 수 있어요.'},
    ball:{name:'공놀이 자리',icon:'⚽',cost:180,w:1,h:1,action:'play',users:['dog','cat','hamster','miniPig'],desc:'공을 톡톡 밀고 뒤따라가요.'},
    tunnel:{name:'숨바꼭질 터널',icon:'🕳️',cost:220,w:2,h:1,action:'tunnel',users:['rabbit','hamster','cat'],desc:'한쪽으로 들어가 반대쪽으로 나와요.'},
    tower:{name:'오르기 나무',icon:'🌳',cost:280,w:1,h:1,action:'climb',users:['cat','iguana','sugarGlider','parrot'],desc:'위로 올라갔다가 다시 내려와요.'},
    platform:{name:'통나무 발판',icon:'🪵',cost:160,w:2,h:1,action:'jump',users:['goat','rabbit','dog'],desc:'폴짝 뛰어올라 주변을 둘러봐요.'},
    wheel:{name:'빙글 쳇바퀴',icon:'🛞',cost:200,w:1,h:1,action:'wheel',users:['hamster'],desc:'햄스터가 올라가면 바퀴가 돌아요.'},
    pond:{name:'물고기 연못',icon:'🐟',cost:0,w:3,h:2,action:'swim',users:fishIds,desc:'수집한 물고기들이 함께 헤엄치는 기본 공간이에요.'}
  };
  const validAnimal = id => animals.some(a=>a.id===id);
  const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));
  const count = n=>Number.isFinite(Number(n))?Math.max(0,Math.floor(Number(n))):0;
  function overlap(a,b) { const x=facilities[a.kind],y=facilities[b.kind]; return a.x<b.x+y.w && a.x+x.w>b.x && a.y<b.y+y.h && a.y+x.h>b.y; }
  function canPlace(items,kind,x,y,except) {
    const f=facilities[kind];
    if(!f || !Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x+f.w>COLS||y+f.h>ROWS) return false;
    return !items.some(i=>i.id!==except && overlap({kind,x,y},i));
  }
  function normalize(raw,legacy={}) {
    raw=raw && typeof raw==='object'?raw:{};
    legacy=legacy && typeof legacy==='object'?legacy:{};
    const hasSave=raw.version===1;
    const owned=hasSave && Array.isArray(raw.owned)?raw.owned:['fish','hamster','iguana',...(Array.isArray(legacy.unlockedPets)?legacy.unlockedPets:[])];
    if(!hasSave && Array.isArray(legacy.fishTank?.fish)) owned.push(...legacy.fishTank.fish.map(id=>id==='guppy'?'fish':id));
    const state={version:1,owned:[...new Set(owned.filter(validAnimal))],placed:[],stock:{},seconds:{},games:[],days:[],origins:{},observed:[],target:'dog'};
    if(!state.owned.length) state.owned=['fish','hamster','iguana'];
    for(const k of ['math','korean','lang','trivia','music']) state.seconds[k]=count(raw.seconds?.[k]);
    state.games=[...new Set((Array.isArray(raw.games)?raw.games:[]).filter(x=>typeof x==='string').slice(0,1000))];
    state.days=[...new Set((Array.isArray(raw.days)?raw.days:[]).filter(x=>typeof x==='string' && /^\d{4}-\d{2}-\d{2}$/.test(x)))];
    state.observed=[...new Set((Array.isArray(raw.observed)?raw.observed:[]).filter(x=>typeof x==='string' && x.length<80))];
    state.target=validAnimal(raw.target)?raw.target:'dog';
    for(const a of state.owned) state.origins[a]=typeof raw.origins?.[a]==='string'?raw.origins[a].slice(0,140):hasSave?'나의 정원 친구':'기존에 함께하던 친구';
    for(const k of Object.keys(facilities)) state.stock[k]=Math.min(99,count(raw.stock?.[k]));
    const defaults=[{id:'pond',kind:'pond',x:8,y:0},{id:'water',kind:'water',x:2,y:1},{id:'food',kind:'food',x:4,y:4},{id:'bed',kind:'bed',x:8,y:6}];
    for(const i of hasSave && Array.isArray(raw.placed)?raw.placed:defaults) {
      if(!i || typeof i.id!=='string' || state.placed.some(p=>p.id===i.id) || !facilities[i.kind]) continue;
      if(i.kind==='pond' && state.placed.some(p=>p.kind==='pond')) continue;
      if(canPlace(state.placed,i.kind,i.x,i.y)) state.placed.push({id:i.id,kind:i.kind,x:i.x,y:i.y});
    }
    if(!state.placed.some(p=>p.kind==='pond')) {
      outer:for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++) if(canPlace(state.placed,'pond',x,y)){state.placed.push({id:'pond-recovered',kind:'pond',x,y});break outer;}
    }
    // Existing purchases remain in their old save; corresponding garden furniture is granted once.
    if(!hasSave) {
      const rooms=legacy.rooms||{},ham=legacy.hamsterRoom||{};
      state.stock.ball=Math.min(20,count(ham.toys)+count(rooms.dog?.toys)+count(rooms.cat?.toys));
      state.stock.wheel=Math.min(20,count(ham.wheels));
      state.stock.tunnel=Math.min(20,count(ham.tunnels)+count(rooms.rabbit?.tunnels)+count(rooms.cat?.tunnels));
      state.stock.tower=Math.min(20,count(rooms.cat?.towers)+count(legacy.iguanaRoom?.branches));
      state.stock.bed=Math.min(20,count(ham.houses)+count(rooms.dog?.kennels)+count(rooms.rabbit?.houses));
      state.stock.platform=Math.min(20,count(rooms.goat?.platforms));
    }
    return state;
  }
  function progress(s,a) { return a.track==='games'?s.games.length:a.track==='days'?s.days.length:count(s.seconds[a.track]); }
  function recordSession(s,{game,category,seconds,date}) {
    if(typeof game!=='string'||!game||!Number.isFinite(seconds)||seconds<30) return [];
    if(Object.hasOwn(s.seconds,category)) s.seconds[category]+=Math.floor(seconds);
    if(!s.games.includes(game)) s.games.push(game);
    if(typeof date==='string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && !s.days.includes(date)) s.days.push(date);
    const unlocked=[];
    for(const a of animals) if(!s.owned.includes(a.id) && progress(s,a)>=a.goal) {
      s.owned.push(a.id); s.origins[a.id]=a.hint+' 달성'; unlocked.push(a.id);
    }
    return unlocked;
  }
  function route(items,from,to) {
    const start={x:clamp(Math.floor(from.x),0,COLS-1),y:clamp(Math.floor(from.y),0,ROWS-1)};
    const end={x:clamp(Math.floor(to.x),0,COLS-1),y:clamp(Math.floor(to.y),0,ROWS-1)};
    const blocked=(x,y)=>items.some(i=>x>=i.x&&x<i.x+facilities[i.kind].w&&y>=i.y&&y<i.y+facilities[i.kind].h);
    if(blocked(end.x,end.y)) return [];
    const key=p=>p.x+','+p.y, queue=[start], seen=new Map([[key(start),null]]);
    for(let j=0;j<queue.length;j++) {
      const p=queue[j];
      if(key(p)===key(end)) {const path=[];let q=p;while(q){path.unshift({x:q.x+.5,y:q.y+.5});q=seen.get(key(q));}return path.slice(1);}
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const q={x:p.x+dx,y:p.y+dy};
        if(q.x<0||q.y<0||q.x>=COLS||q.y>=ROWS||seen.has(key(q))||blocked(q.x,q.y))continue;
        seen.set(key(q),p);queue.push(q);
      }
    }
    return [];
  }
  function reachablePlacement(items,kind,x,y,except) {
    if(!canPlace(items,kind,x,y,except))return false;
    const next=[...items.filter(i=>i.id!==except),{id:except||'candidate',kind,x,y}];
    const free=[];
    for(let yy=0;yy<ROWS;yy++)for(let xx=0;xx<COLS;xx++)if(!next.some(i=>xx>=i.x&&xx<i.x+facilities[i.kind].w&&yy>=i.y&&yy<i.y+facilities[i.kind].h))free.push({x:xx+.5,y:yy+.5});
    if(free.length<25)return false;
    const allowed=new Set(free.map(p=>Math.floor(p.x)+','+Math.floor(p.y)));
    const queue=[[Math.floor(free[0].x),Math.floor(free[0].y)]],seen=new Set([queue[0].join(',')]);
    for(let n=0;n<queue.length;n++)for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const p=[queue[n][0]+dx,queue[n][1]+dy],key=p.join(',');if(allowed.has(key)&&!seen.has(key)){seen.add(key);queue.push(p);}}
    return seen.size===free.length;
  }
  function localDay() {const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}

  function init(bridge) {
    const read=k=>{try{return JSON.parse(localStorage.getItem(k)||'null');}catch(_){return null;}};
    let state=normalize(read(KEY),read('kidscade_sook_canvas_pet'));
    let storageOK=true;
    function save(){try{localStorage.setItem(KEY,JSON.stringify(state));storageOK=true;return true;}catch(_){storageOK=false;bridge.toast('정원을 저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.');return false;}}
    save();
    const host=document.querySelector('[data-sook-panel="room"]');
    host.classList.add('garden-room');
    // Keep legacy nodes for wardrobe, mission, aquarium and save compatibility.
    [...host.children].forEach(e=>e.hidden=true);
    host.insertAdjacentHTML('beforeend',`<section class="garden-app" aria-label="나의 동물 정원">
      <header class="garden-heading"><div><strong>나의 동물 정원</strong><span id="garden-summary"></span></div><b id="garden-wallet"></b></header>
      <div class="garden-layout"><div class="garden-view"><canvas id="garden-canvas" width="1000" height="680" tabindex="0" aria-label="동물 정원. 시설을 선택한 뒤 방향키로 위치를 고르고 엔터로 설치하세요."></canvas>
        <div id="garden-live" role="status" aria-live="polite">친구들이 자유롭게 놀고 있어요.</div>
        <div class="garden-view-actions"><button type="button" id="garden-call">손 흔들기</button><button type="button" id="garden-edit" aria-pressed="false">시설 옮기기</button><button type="button" id="garden-cancel" hidden>배치 취소</button></div>
      </div><aside class="garden-dock"><nav aria-label="정원 메뉴"><button type="button" data-garden-tab="collection" aria-pressed="true">동물 도감</button><button type="button" data-garden-tab="build" aria-pressed="false">시설 설치</button><button type="button" data-garden-tab="diary" aria-pressed="false">관찰 기록</button></nav><div id="garden-panel"></div></aside></div>
      <footer>빈 곳을 누르면 내 캐릭터가 걸어가요. 동물을 누르면 지금 하는 일을 볼 수 있어요.</footer></section>`);
    document.querySelector('[data-sook-tab="room"]').textContent='🌳 나의 정원';
    document.querySelector('#pet-modal .sook-coach-header > span').textContent='🌱 나의 동물 정원';
    document.getElementById('pet-modal').setAttribute('aria-label','나의 동물 정원');
    const canvas=document.getElementById('garden-canvas'),ctx=canvas.getContext('2d');
    const panel=document.getElementById('garden-panel'),live=document.getElementById('garden-live');
    const preview=document.createElement('canvas');preview.width=320;preview.height=190;preview.className='garden-preview';preview.setAttribute('aria-hidden','true');
    document.getElementById('kc-pet-card')?.prepend(preview);
    const previewCtx=preview.getContext('2d');
    let tab='collection',editing=false,pending=null,cursor={x:4,y:3},drag=null;
    let actors=[],avatar={x:6.5,y:6.5,path:[]},avatarImage=null,svgSource='',clock=0,last=0,lastDraw=0,lastUI=0,lastPreview=0;
    const actionNames={idle:'쉬는 중',walk:'산책 중',feed:'먹이를 먹는 중',drink:'물을 마시는 중',sleep:'잠자는 중',play:'공놀이 중',tunnel:'숨바꼭질 중',climb:'나무에 오르는 중',jump:'발판 뛰기 중',wheel:'쳇바퀴 달리기 중',swim:'헤엄치는 중',hello:'인사하는 중'};
    function freeCell(){for(let tries=0;tries<150;tries++){const p={x:Math.floor(Math.random()*COLS)+.5,y:Math.floor(Math.random()*ROWS)+.5};if(!state.placed.some(i=>p.x>=i.x&&p.x<i.x+facilities[i.kind].w&&p.y>=i.y&&p.y<i.y+facilities[i.kind].h))return p;}return {x:.5,y:7.5};}
    function resetActors(){actors=state.owned.filter(id=>!fishIds.includes(id)).map((id,i)=>({id,...freeCell(),path:[],action:'idle',until:clock+1+i*.55,facility:null,phase:0,visits:{}}));avatar={...freeCell(),path:[]};}
    resetActors();
    function reload(){state=normalize(read(KEY),read('kidscade_sook_canvas_pet'));}
    function say(s){live.textContent=s;}
    function money(){document.getElementById('garden-wallet').textContent=`🌱 ${bridge.balance().toLocaleString()} 씨앗`;}
    function render(){
      money();document.getElementById('garden-summary').textContent=`${state.owned.length} / ${animals.length}종 · 시설 ${state.placed.length}개`;
      const title=document.getElementById('sidebar-pet-title');if(title)title.textContent=`나의 정원 · ${state.owned.length}종`;
      const sub=document.getElementById('sidebar-pet-sub');if(sub)sub.textContent='친구들이 함께 먹고 놀고 쉬어요';
      const talk=document.getElementById('sidebar-pet-talk');if(talk)talk.textContent=`다음 발견: ${animals.find(a=>a.id===state.target)?.name||'강아지'}`;
      const fill=document.getElementById('sidebar-pet-fill');if(fill)fill.style.width=`${state.owned.length/animals.length*100}%`;
      const open=document.getElementById('sidebar-pet-open');if(open)open.textContent='🌳 정원 들어가기';
      document.getElementById('sidebar-pet-avatar').textContent='🌳';
      document.getElementById('pet-widget-avatar').textContent='🌳';
      document.getElementById('pet-widget-badge').textContent=String(state.owned.length);
      document.getElementById('pet-widget-badge').style.display='block';
      document.getElementById('pet-widget-bubble').textContent='내 정원 구경하기';
      document.getElementById('garden-edit').setAttribute('aria-pressed',String(editing));
      document.getElementById('garden-edit').textContent=editing?'옮기기 마치기':'시설 옮기기';
      document.getElementById('garden-cancel').hidden=!pending;
      if(tab==='collection'){
        panel.innerHTML='<p class="garden-help">게임을 탐험하면 새 친구가 찾아와요. 30초 이상 한 게임만 기록돼요.</p>'+animals.map(a=>{
          const owned=state.owned.includes(a.id),p=progress(state,a),ratio=a.goal?Math.min(100,p/a.goal*100):100;
          const units=a.track==='games'?`${Math.min(p,a.goal)} / ${a.goal}개`:a.track==='days'?`${Math.min(p,a.goal)} / ${a.goal}일`:`${Math.min(a.goal,Math.floor(p/60)*60)/60} / ${a.goal/60}분`;
          return `<article class="garden-animal ${owned?'owned':''}"><div class="garden-animal-icon">${owned?a.icon:'?'}</div><div><strong>${a.name}</strong><small>${owned?'정원에서 함께 지내요':a.hint}</small>${owned?'':`<progress max="100" value="${ratio}" aria-label="${a.name} 발견 진행"></progress><small>${units}</small>`}</div><button type="button" data-animal="${a.id}">${owned?'찾기':state.target===a.id?'목표 ✓':'목표'}</button></article>`;
        }).join('');
        const target=animals.find(a=>a.id===state.target);
        if(target&&!state.owned.includes(target.id)){
          const box=document.createElement('div');box.className='garden-target';
          const text=document.createElement('p');text.className='garden-help';text.textContent=`다음 목표 · ${target.name}: ${target.hint}`;box.append(text);
          const category=['games','days'].includes(target.track)?null:target.track;
          for(const game of bridge.games(category)) {const b=document.createElement('button');b.type='button';b.textContent=game.title+' 시작';b.addEventListener('click',()=>bridge.play(game.id));box.append(b);}
          panel.prepend(box);
        }
      }else if(tab==='build'){
        panel.innerHTML='<p class="garden-help">시설 선택 → 빈 칸에 설치. 보관한 시설부터 사용해요. 길이 막히는 곳에는 놓을 수 없어요.</p>'+Object.entries(facilities).filter(([id])=>id!=='pond').map(([id,f])=>`<article class="garden-furniture"><strong>${f.icon} ${f.name}</strong><p>${f.desc}</p><small>${f.users.map(id=>animals.find(a=>a.id===id).name).join(' · ')}</small><button type="button" data-build="${id}" ${!state.stock[id]&&bridge.balance()<f.cost?'disabled':''}>${state.stock[id]?`보관함에서 설치 (${state.stock[id]}개)`:`${f.cost} 씨앗으로 설치`}</button></article>`).join('');
        if(pending?.id && pending.kind!=='pond') panel.insertAdjacentHTML('afterbegin','<button type="button" id="garden-store">선택한 시설 보관하기</button>');
      }else{
        panel.innerHTML=`<p class="garden-help">발견한 행동 ${state.observed.length}개. 시설을 바꿔 놓고 새로운 모습을 찾아보세요.</p>`;
        for(const entry of [...state.observed].reverse()){
          const [id,action]=entry.split(':');const a=animals.find(a=>a.id===id);if(!a||!actionNames[action])continue;
          const p=document.createElement('p');p.className='garden-note';p.textContent=`${a.icon} ${a.name} · ${actionNames[action]}`;panel.append(p);
        }
        if(!state.observed.length)panel.insertAdjacentHTML('beforeend','<p class="garden-help">물을 마시거나 시설에서 놀면 관찰 기록이 남아요.</p>');
      }
    }
    function observe(a){const id=a.id+':'+a.action;if(!state.observed.includes(id)){state.observed.push(id);save();if(tab==='diary')render();say(`${animals.find(x=>x.id===a.id).name}: ${actionNames[a.action]}. 관찰 기록에 남겼어요!`);}}
    function nearby(i){const f=facilities[i.kind],cells=[];for(let x=i.x;x<i.x+f.w;x++){cells.push({x:x+.5,y:i.y+f.h+.5},{x:x+.5,y:i.y-.5});}for(let y=i.y;y<i.y+f.h;y++){cells.push({x:i.x-.5,y:y+.5},{x:i.x+f.w+.5,y:y+.5});}return cells.filter(p=>p.x>0&&p.y>0&&p.x<COLS&&p.y<ROWS);}
    function choose(a){
      const used=new Set(actors.filter(b=>b!==a&&b.facility).map(b=>b.facility));
      const options=state.placed.filter(i=>facilities[i.kind].users.includes(a.id)&&!used.has(i.id));
      options.sort((p,q)=>(a.visits[p.kind]||0)-(a.visits[q.kind]||0)||Math.random()-.5);
      if(options.length && Math.random()<.85){
        for(const f of options){
          const paths=nearby(f).map(p=>({p,path:route(state.placed,a,p)})).filter(v=>v.path.length||Math.hypot(v.p.x-a.x,v.p.y-a.y)<.3).sort((p,q)=>p.path.length-q.path.length);
          if(paths.length){a.facility=f.id;a.path=paths[0].path;a.action='walk';a.until=clock+20;return;}
        }
      }
      a.facility=null;a.path=route(state.placed,a,freeCell());a.action='walk';a.until=clock+15;
    }
    function step(a,dt){
      if(a.path.length){const p=a.path[0],dx=p.x-a.x,dy=p.y-a.y,d=Math.hypot(dx,dy),speed=a.id==='turtle'?.6:a.id==='iguana'?.8:1.5;
        if(d<speed*dt){a.x=p.x;a.y=p.y;a.path.shift();}else{a.x+=dx/d*speed*dt;a.y+=dy/d*speed*dt;}a.facing=dx<-.01?-1:dx>.01?1:a.facing||1;return;}
      if(a.action==='walk'){
        const f=state.placed.find(i=>i.id===a.facility);a.action=f?facilities[f.kind].action:'idle';a.phase=clock;a.until=clock+(a.action==='sleep'?10:4+Math.random()*3);
        if(f){a.visits[f.kind]=(a.visits[f.kind]||0)+1;observe(a);}
      }
      if(clock>a.until)choose(a);
    }
    const project=p=>({x:60+p.x*73,y:120+p.y*61});
    function renderScene(c,width,height){
      c.save();c.scale(width/1000,height/680);
      bridge.background(c,1000,680,clock);
      // Grid is functional placement guidance; scenery and all animals reuse existing artwork.
      if(editing||pending){c.strokeStyle='rgba(12,73,49,.24)';c.lineWidth=1;for(let x=0;x<=COLS;x++){c.beginPath();c.moveTo(60+x*73,120);c.lineTo(60+x*73,608);c.stroke();}for(let y=0;y<=ROWS;y++){c.beginPath();c.moveTo(60,120+y*61);c.lineTo(936,120+y*61);c.stroke();}}
      const layers=[];
      for(const f of state.placed){const info=facilities[f.kind],pos=project({x:f.x+info.w/2,y:f.y+info.h/2});
        layers.push({y:pos.y,draw:()=>{bridge.facility(c,f.kind,pos.x,pos.y,clock,actors.some(a=>a.facility===f.id&&a.action!=='walk'));if(editing){c.fillStyle='#164b35';c.font='bold 15px sans-serif';c.textAlign='center';c.fillText(info.name,pos.x,pos.y+36);}}});
        if(f.kind==='pond')state.owned.filter(id=>fishIds.includes(id)).forEach((id,i)=>{const p={x:pos.x+Math.sin(clock*.5+i*2)*67,y:pos.y+Math.cos(clock*.6+i)*25};layers.push({y:pos.y+.1,draw:()=>bridge.animal(c,id,p.x,p.y,clock+i,'swim',.22,Math.cos(clock*.5+i*2)>0?1:-1)});});
      }
      for(const a of actors){let p=project(a),phase=clock-a.phase,alpha=1,scale=.28;
        const facility=state.placed.find(i=>i.id===a.facility);
        if(facility && a.action!=='walk'){
          const f=facilities[facility.kind],fp=project({x:facility.x+f.w/2,y:facility.y+f.h/2});
          const blend=clamp(Math.min(phase, a.until-clock)*2,0,1);
          const gap=['sleep','wheel','tunnel','climb','jump'].includes(a.action)?0:25;
          p={x:p.x+(fp.x-p.x)*blend,y:p.y+(fp.y+gap-p.y)*blend};
        }
        if(a.action==='walk')p.y-=Math.abs(Math.sin(clock*8))*3;
        if(a.action==='drink'||a.action==='feed')p.y+=Math.sin(clock*6)*3;
        if(a.action==='climb')p.y-=Math.sin(clamp(phase/(a.until-a.phase),0,1)*Math.PI)*65;
        if(a.action==='wheel')p.y-=10+Math.abs(Math.sin(phase*12))*3;
        if(a.action==='jump')p.y-=Math.abs(Math.sin(phase*3))*28;
        if(a.action==='tunnel'){p.x+=Math.sin(phase)*25;alpha=Math.max(.08,Math.abs(Math.cos(phase)));}
        if(a.action==='play')p.x+=Math.sin(phase*2)*18;
        if(a.action==='sleep')scale=.25;
        layers.push({y:p.y,draw:()=>{c.save();c.globalAlpha=alpha;bridge.animal(c,a.id,p.x,p.y,clock,a.action,scale,a.facing||1);c.restore();if(a.action==='hello'){c.fillStyle='#be185d';c.font='24px sans-serif';c.fillText('♥',p.x-8,p.y-60);}}});
      }
      const ap=project(avatar);layers.push({y:ap.y,draw:()=>{if(avatarImage)c.drawImage(avatarImage,ap.x-35,ap.y-105-(avatar.path.length?Math.abs(Math.sin(clock*8))*3:0),70,112);}});
      layers.sort((a,b)=>a.y-b.y).forEach(l=>l.draw());
      if(pending){const f=facilities[pending.kind],p=project(cursor),ok=reachablePlacement(state.placed,pending.kind,cursor.x,cursor.y,pending.id);c.fillStyle=ok?'rgba(37,99,235,.30)':'rgba(220,38,38,.35)';c.fillRect(p.x,p.y,f.w*73,f.h*61);c.strokeStyle=ok?'#1d4ed8':'#dc2626';c.lineWidth=3;c.strokeRect(p.x,p.y,f.w*73,f.h*61);}
      else if(editing){const p=project(cursor);c.strokeStyle='#1d4ed8';c.lineWidth=3;c.strokeRect(p.x,p.y,73,61);}
      c.restore();
    }
    function position(e){const r=canvas.getBoundingClientRect();return {x:clamp((e.clientX-r.left)/r.width*1000,0,999),y:clamp((e.clientY-r.top)/r.height*680,0,679)};}
    function cell(p){return {x:clamp(Math.floor((p.x-60)/73),0,COLS-1),y:clamp(Math.floor((p.y-120)/61),0,ROWS-1)};}
    function atCell(p){return state.placed.find(i=>p.x>=i.x&&p.x<i.x+facilities[i.kind].w&&p.y>=i.y&&p.y<i.y+facilities[i.kind].h);}
    function cancel(){pending=null;drag=null;render();say('배치를 취소했어요.');}
    function place(){
      if(!pending)return;
      reload();const p=pending,f=facilities[p.kind];
      if(!reachablePlacement(state.placed,p.kind,cursor.x,cursor.y,p.id)){say('겹치지 않고 길이 이어지는 빈 칸을 골라 주세요.');return;}
      const old=JSON.stringify(state);let paid=0;
      if(p.id){const item=state.placed.find(i=>i.id===p.id);if(!item){cancel();return;}item.x=cursor.x;item.y=cursor.y;}
      else{
        if(!storageOK){say('저장 공간을 확인한 뒤 다시 설치해 주세요.');return;}
        if(state.stock[p.kind])state.stock[p.kind]--;else{if(!bridge.spend(f.cost)){say('씨앗이 부족해요.');render();return;}paid=f.cost;}
        state.placed.push({id:'f-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),kind:p.kind,...cursor});
      }
      if(!save()){state=JSON.parse(old);if(paid)bridge.refund(paid);return;}
      pending=null;drag=null;resetActors();render();say(`${f.name} 설치 완료! 친구들이 찾아올 거예요.`);
    }
    canvas.addEventListener('pointerdown',e=>{
      const p=position(e);cursor=cell(p);canvas.focus();
      if(pending){place();return;}
      if(editing){const f=atCell(cursor);if(f){pending={id:f.id,kind:f.kind};drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);render();say(`${facilities[f.kind].name}: 끌어서 놓거나 새 위치를 눌러 주세요.`);}return;}
      const a=actors.find(a=>{const ap=project(a);return Math.hypot(p.x-ap.x,p.y-(ap.y-25))<42;});
      if(a){say(`${animals.find(x=>x.id===a.id).name} · ${actionNames[a.action]}`);return;}
      const target={x:cursor.x+.5,y:cursor.y+.5};avatar.path=route(state.placed,avatar,target);
    });
    canvas.addEventListener('pointermove',e=>{if(pending)cursor=cell(position(e));});
    canvas.addEventListener('pointerup',e=>{if(drag && Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>10)place();drag=null;});
    canvas.addEventListener('pointercancel',()=>{drag=null;});
    canvas.addEventListener('keydown',e=>{
      const dirs={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
      if(dirs[e.key]){e.preventDefault();cursor={x:clamp(cursor.x+dirs[e.key][0],0,COLS-1),y:clamp(cursor.y+dirs[e.key][1],0,ROWS-1)};if(!pending&&!editing)avatar.path=route(state.placed,avatar,{x:cursor.x+.5,y:cursor.y+.5});else{const item=atCell(cursor);say(`${cursor.y+1}행 ${cursor.x+1}열 · ${item?facilities[item.kind].name:'빈 칸'}`);}}
      if(e.key==='Enter'){e.preventDefault();if(pending)place();else if(editing){const f=atCell(cursor);if(f){pending={id:f.id,kind:f.kind};render();}}}
      if(e.key==='Escape'&&pending){e.preventDefault();e.stopPropagation();cancel();}
    });
    host.addEventListener('click',e=>{
      const b=e.target.closest('button');if(!b)return;
      if(b.dataset.gardenTab){tab=b.dataset.gardenTab;host.querySelectorAll('[data-garden-tab]').forEach(el=>el.setAttribute('aria-pressed',String(el===b)));render();}
      if(b.dataset.build){pending={kind:b.dataset.build};editing=true;render();say(`${facilities[pending.kind].name}: 빈 칸을 눌러 설치하세요. 설치할 때만 씨앗을 사용해요.`);canvas.focus();}
      if(b.dataset.animal){const id=b.dataset.animal,a=animals.find(a=>a.id===id);if(state.owned.includes(id)){const actor=actors.find(a=>a.id===id);if(actor){actor.path=[];actor.facility=null;actor.action='hello';actor.until=clock+3;}say(`${a.name} · ${state.origins[id]}`);}else{state.target=id;save();say(`다음 목표: ${a.hint}`);}render();}
      if(b.id==='garden-edit'){editing=!editing;pending=null;render();say(editing?'옮길 시설을 누르세요. 드래그하거나 방향키와 엔터로 옮길 수 있어요.':'친구들을 구경해 보세요.');}
      if(b.id==='garden-cancel')cancel();
      if(b.id==='garden-call'){actors.forEach(a=>{a.facility=null;a.path=route(state.placed,a,avatar);a.action='walk';a.until=clock+8;});say('친구들아, 이리 와!');}
      if(b.id==='garden-store'&&pending?.id){reload();const f=state.placed.find(i=>i.id===pending.id);if(f&&f.kind!=='pond'){const old=JSON.stringify(state);state.placed=state.placed.filter(i=>i.id!==f.id);state.stock[f.kind]++;if(!save()){state=JSON.parse(old);return;}pending=null;resetActors();render();say('보관함에 넣었어요. 다시 설치할 때 씨앗이 들지 않아요.');}}
    });
      const session=payload=>{reload();const found=recordSession(state,{...payload,date:localDay()});if(found.includes(state.target))state.target=animals.find(a=>!state.owned.includes(a.id))?.id||state.target;const saved=save();resetActors();render();if(!saved)return;if(found.length){bridge.toast(`${found.map(id=>animals.find(a=>a.id===id).name).join(', ')} 발견! 나의 정원에서 만나 보세요.`);say('새 친구가 정원에 도착했어요!');}else{const target=animals.find(a=>a.id===state.target);if(target&&!state.owned.includes(target.id))bridge.toast(`정원 탐험 기록 저장 · ${target.name}: ${target.hint}`);}};
    window.addEventListener('storage',e=>{if(e.key===KEY){reload();pending=null;resetActors();render();}if(e.key==='kidscade_coins')render();});
    function frame(now){
      requestAnimationFrame(frame);
      const visible=!document.hidden && !document.getElementById('pet-modal').classList.contains('hidden')&&host.classList.contains('active');
      const pr=preview.getBoundingClientRect(),miniVisible=!document.hidden&&pr.bottom>0&&pr.top<innerHeight;
      if(!visible&&!miniVisible){last=now;return;}
      if(now-lastDraw<(visible?33:120))return;lastDraw=now;
      const dt=last?Math.min(.15,(now-last)/1000):.03;last=now;clock+=dt;
      if(!editing&&!pending){actors.forEach(a=>step(a,dt));if(avatar.path.length){const p=avatar.path[0],dx=p.x-avatar.x,dy=p.y-avatar.y,d=Math.hypot(dx,dy);if(d<dt*2){avatar.x=p.x;avatar.y=p.y;avatar.path.shift();}else{avatar.x+=dx/d*dt*2;avatar.y+=dy/d*dt*2;}}}
      if(now-lastUI>1500){lastUI=now;money();const svg=bridge.avatar();if(svg&&svg!==svgSource){svgSource=svg;const image=new Image();image.onload=()=>{avatarImage=image;};image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);}}
      if(visible)renderScene(ctx,1000,680);
      if(miniVisible&&now-lastPreview>120){lastPreview=now;previewCtx.clearRect(0,0,320,190);renderScene(previewCtx,320,190);}
    }
    render();requestAnimationFrame(frame);
    return {session,refresh:render,openBuild:()=>{tab='build';host.querySelectorAll('[data-garden-tab]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.gardenTab===tab)));render();}};
  }
  const api={init,normalize,recordSession,canPlace,reachablePlacement,route,animals,facilities,KEY};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.KidscadeGarden=api;
})(typeof window==='undefined'?globalThis:window);

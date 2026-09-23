(()=>{
'use strict';

const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d',{alpha:false});
const W=1000,H=650,RIVER_X=525,RIVER_W=58;
const DPR_CAP=1.75;
const SHAPES=['circle','triangle','square','diamond'];
const LINE_DEFS=[
  {name:'1호선',color:'#46c7ff'},
  {name:'2호선',color:'#ff9b54'},
  {name:'3호선',color:'#6de59e'},
  {name:'4호선',color:'#d886ff'},
  {name:'5호선',color:'#ffd65d'}
];
const NAME_POOL=['새봄','한빛','푸른길','솔마루','별내','강빛','해오름','느티','샘터','달맞이','구름재','나래','도담','이음','마루','온새미','가람','여울','라온','초롱','누리','한결','미르','아람'];

const $=id=>document.getElementById(id);
const ui={
  menu:$('menu'),help:$('help'),upgrade:$('upgrade'),result:$('result'),
  start:$('startBtn'),tutorial:$('tutorialBtn'),closeHelp:$('closeHelpBtn'),
  retry:$('retryBtn'),menuBtn:$('menuBtn'),pause:$('pauseBtn'),speed:$('speedBtn'),sound:$('soundBtn'),helpBtn:$('helpBtn'),
  week:$('weekLabel'),delivered:$('deliveredLabel'),waiting:$('waitingLabel'),danger:$('dangerLabel'),
  notice:$('notice'),lineTools:$('lineTools'),trainTool:$('trainTool'),bridgeTool:$('bridgeTool'),trimTool:$('trimTool'),undo:$('undoBtn'),
  trainStock:$('trainStock'),bridgeStock:$('bridgeStock'),best:$('bestText'),choices:$('upgradeChoices'),
  resultTitle:$('resultTitle'),resultReason:$('resultReason'),resultDelivered:$('resultDelivered'),resultTime:$('resultTime'),resultStations:$('resultStations'),
  tutorialBubble:$('tutorialBubble'),tutorialTitle:$('tutorialTitle'),tutorialText:$('tutorialText'),tutorialSkip:$('tutorialSkip')
};

let cssW=innerWidth,cssH=innerHeight,scale=1,offX=0,offY=0,dpr=1;
let last=performance.now(),noticeTimer=0,soundOn=true;
let save={tutorialSeen:false,bestDelivered:0,bestSeconds:0};
let rng=Math.random;
let decor=[];
let undoStack=[];
let drag=null;
let pointer={x:0,y:0};
let selectedLine=0;
let pendingTrain=false;
let pendingTrim=false;
let tutorialStep=0;

const state={
  running:false,paused:false,upgradeOpen:false,gameOver:false,speed:1,
  time:0,delivered:0,stations:[],lines:[],unlockedLines:2,
  spareTrains:2,bridges:1,capacity:6,nextStationAt:42,nextUpgradeAt:75,
  spawnCarry:0,stationSeq:0,tutorialMode:false,week:1
};

function loadSave(){
  try{
    const api=window.KidscadeStorage;
    if(api) save=Object.assign(save,api.getJson('metroPlannerSave',save)||{});
  }catch(_){}
  refreshBest();
}
function persist(){
  try{window.KidscadeStorage?.setJson('metroPlannerSave',save)}catch(_){}
}
function refreshBest(){
  if(!save.bestDelivered){ui.best.textContent='첫 도시의 기록을 만들어 보세요.';return}
  ui.best.textContent='최고 기록 · '+save.bestDelivered+'명 수송 · '+formatTime(save.bestSeconds);
}

const audio={
  click:makePool('../../assets/audio/ui/kenney_interface/click_002.ogg',.28,3),
  confirm:makePool('../../assets/audio/ui/kenney_interface/confirmation_001.ogg',.34,3),
  error:makePool('../../assets/audio/ui/kenney_interface/error_002.ogg',.27,2),
  tick:makePool('../../assets/audio/ui/kenney_interface/tick_001.ogg',.18,3),
  success:makePool('../../assets/audio/sfx/success/cheer-yay-01.mp3',.22,2),
  fail:makePool('../../assets/audio/sfx/failure/fail-sting-01.mp3',.28,2)
};
function makePool(src,volume,n){
  return {i:0,a:Array.from({length:n},()=>{const a=new Audio(src);a.preload='auto';a.volume=volume;return a})};
}
function play(name,rate=1){
  if(!soundOn)return;
  const p=audio[name];if(!p)return;
  const a=p.a[p.i++%p.a.length];
  try{a.pause();a.currentTime=0;a.playbackRate=rate;a.play().catch(()=>{})}catch(_){}
}

function mulberry32(seed){
  let a=seed>>>0;
  return ()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296};
}
function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]]}
  return arr;
}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function lerp(a,b,t){return a+(b-a)*t}
function formatTime(sec){sec=Math.max(0,Math.floor(sec));return Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0')}

function resize(){
  cssW=innerWidth;cssH=innerHeight;dpr=Math.min(devicePixelRatio||1,DPR_CAP);
  canvas.width=Math.max(1,Math.round(cssW*dpr));canvas.height=Math.max(1,Math.round(cssH*dpr));
  canvas.style.width=cssW+'px';canvas.style.height=cssH+'px';
  scale=Math.min(cssW/W,cssH/H);offX=(cssW-W*scale)/2;offY=(cssH-H*scale)/2;
}
addEventListener('resize',resize,{passive:true});resize();

function worldPoint(ev){
  const r=canvas.getBoundingClientRect();
  return {x:(ev.clientX-r.left-offX)/scale,y:(ev.clientY-r.top-offY)/scale};
}

function resetState(tutorial){
  const seed=(Date.now()^(Math.random()*0xffffffff))>>>0;rng=mulberry32(seed);
  Object.assign(state,{running:true,paused:false,upgradeOpen:false,gameOver:false,speed:1,time:0,delivered:0,stations:[],lines:[],unlockedLines:2,spareTrains:2,bridges:1,capacity:6,nextStationAt:42,nextUpgradeAt:75,spawnCarry:0,stationSeq:0,tutorialMode:!!tutorial,week:1});
  selectedLine=0;pendingTrain=false;pendingTrim=false;undoStack=[];drag=null;tutorialStep=0;
  state.lines=LINE_DEFS.map((d,i)=>({id:i,name:d.name,color:d.color,stops:[],trains:[]}));
  const base=[
    [165,205,'circle'],[338,168,'triangle'],[270,405,'square'],[695,215,'diamond'],[790,414,'circle']
  ];
  base.forEach(v=>createStation(v[0],v[1],v[2],true));
  buildDecor();
  updateLineButtons();updateHud();
  ui.menu.classList.add('hidden');ui.result.classList.add('hidden');ui.upgrade.classList.add('hidden');ui.help.classList.add('hidden');
  ui.pause.textContent='⏸';ui.speed.textContent='×1';
  if(tutorial){startTutorial()}else{ui.tutorialBubble.classList.add('hidden');showNotice('노선을 골라 역과 역 사이를 드래그하세요.',2200)}
  last=performance.now();
}
function buildDecor(){
  decor=[];
  const r=mulberry32(918273);
  for(let i=0;i<95;i++){
    const x=35+r()*930,y=72+r()*500;
    if(Math.abs(x-RIVER_X)<RIVER_W*.8)continue;
    const w=8+r()*23,h=6+r()*18;
    decor.push({x,y,w,h,a:.025+r()*.035});
  }
}

function createStation(x,y,shape,initial=false){
  const id=state.stationSeq++;
  const s={id,x,y,shape:shape||SHAPES[Math.floor(rng()*SHAPES.length)],name:NAME_POOL[id%NAME_POOL.length]+'역',queue:[],danger:0,pulse:initial?0:1,demand:.78+rng()*.48};
  state.stations.push(s);return s;
}
function spawnStation(){
  if(state.stations.length>=16)return;
  let best=null;
  for(let tries=0;tries<100;tries++){
    const side=rng()<.5?-1:1;
    const x=side<0?75+rng()*390:590+rng()*335;
    const y=105+rng()*420;
    const p={x,y};
    let min=999;
    for(const s of state.stations)min=Math.min(min,dist(p,s));
    if(min>94){best=p;break}
  }
  if(!best)return;
  const counts=Object.fromEntries(SHAPES.map(sh=>[sh,state.stations.filter(s=>s.shape===sh).length]));
  const minCount=Math.min(...Object.values(counts));
  const pool=SHAPES.filter(sh=>counts[sh]<=minCount+1);
  const s=createStation(best.x,best.y,pool[Math.floor(rng()*pool.length)]);
  play('tick',1.08);showNotice('새 역 '+s.name+'이 생겼어요.',1500);
}
function stationById(id){return state.stations.find(s=>s.id===id)}
function lineById(id){return state.lines[id]}

function updateLineButtons(){
  ui.lineTools.innerHTML='';
  state.lines.forEach((line,i)=>{
    const b=document.createElement('button');
    b.type='button';b.className='tool lineTool'+(i===selectedLine&&!pendingTrain&&!pendingTrim?' active':'')+(i>=state.unlockedLines?' locked':'');
    b.style.setProperty('--line',line.color);
    b.innerHTML='<span>●</span><b>'+line.name+'</b><small>'+line.trains.length+'🚇</small>';
    b.disabled=i>=state.unlockedLines;
    b.addEventListener('click',()=>{
      play('click');
      if(pendingTrain){assignTrain(i);return}
      selectedLine=i;pendingTrain=false;pendingTrim=false;updateLineButtons();ui.trainTool.classList.remove('ready');ui.trimTool.classList.remove('ready');
      showNotice(line.name+' 선택 · 노선 끝에서 다른 역으로 드래그',1200);
    });
    ui.lineTools.appendChild(b);
  });
  ui.trainStock.textContent=state.spareTrains;
  ui.bridgeStock.textContent=state.bridges;
  ui.trainTool.classList.toggle('ready',pendingTrain);ui.trimTool.classList.toggle('ready',pendingTrim);
}
function updateHud(){
  state.week=Math.floor(state.time/75)+1;
  ui.week.textContent=state.week+'주차';
  ui.delivered.textContent=state.delivered+'명';
  const waiting=state.stations.reduce((n,s)=>n+s.queue.length,0);
  ui.waiting.textContent=waiting+'명';
  const hottest=state.stations.reduce((m,s)=>Math.max(m,s.danger),0);
  ui.danger.textContent=hottest<=0?'안정':Math.ceil(hottest)+'초';
  ui.danger.classList.toggle('hot',hottest>5);
  ui.trainStock.textContent=state.spareTrains;ui.bridgeStock.textContent=state.bridges;
}
function showNotice(text,ms=1300){
  ui.notice.textContent=text;ui.notice.classList.add('show');clearTimeout(noticeTimer);
  noticeTimer=setTimeout(()=>ui.notice.classList.remove('show'),ms);
}

function startTutorial(){
  state.tutorialMode=true;tutorialStep=0;
  ui.tutorialBubble.classList.remove('hidden');
  ui.tutorialTitle.textContent='첫 노선을 만들어요';
  ui.tutorialText.textContent='파란 1호선이 선택되어 있어요. 왼쪽의 원형역과 삼각역 사이를 손가락이나 마우스로 드래그해 보세요.';
}
function tutorialRouteDone(){
  if(!state.tutorialMode||tutorialStep!==0)return;
  tutorialStep=1;
  const a=state.stations[0],b=state.stations[1];
  a.queue.push({shape:b.shape,age:0});
  ui.tutorialTitle.textContent='승객이 기다리고 있어요';
  ui.tutorialText.textContent='역 옆 작은 ▲는 삼각형 역으로 가고 싶은 승객이에요. 열차가 도착하면 자동으로 타고 이동합니다.';
}
function tutorialDelivered(){
  if(!state.tutorialMode||tutorialStep!==1)return;
  tutorialStep=2;
  ui.tutorialTitle.textContent='이제 도시를 키워 보세요';
  ui.tutorialText.textContent='강을 건너는 노선에는 교량 1개가 필요해요. 75초마다 도시 지원도 받을 수 있습니다.';
  save.tutorialSeen=true;persist();
  setTimeout(()=>{if(tutorialStep===2){state.tutorialMode=false;ui.tutorialBubble.classList.add('hidden')}},5000);
}
ui.tutorialSkip.addEventListener('click',()=>{
  state.tutorialMode=false;save.tutorialSeen=true;persist();ui.tutorialBubble.classList.add('hidden');play('click');
});

function snapshot(){
  return {
    lines:state.lines.map(l=>({stops:l.stops.slice(),trains:l.trains.map(t=>Object.assign({},t,{passengers:t.passengers.map(p=>Object.assign({},p))}))})),
    spareTrains:state.spareTrains,bridges:state.bridges,unlockedLines:state.unlockedLines,capacity:state.capacity
  };
}
function pushUndo(){undoStack.push(snapshot());if(undoStack.length>14)undoStack.shift()}
function restore(snap){
  state.spareTrains=snap.spareTrains;state.bridges=snap.bridges;state.unlockedLines=snap.unlockedLines;state.capacity=snap.capacity;
  state.lines.forEach((l,i)=>{l.stops=snap.lines[i].stops.slice();l.trains=snap.lines[i].trains.map(t=>Object.assign({},t,{passengers:t.passengers.map(p=>Object.assign({},p))}))});
  updateLineButtons();showNotice('이전 노선 상태로 되돌렸어요.',1000);play('click');
}
ui.undo.addEventListener('click',()=>{if(!state.running||!undoStack.length){play('error');showNotice('되돌릴 변경이 없어요.');return}restore(undoStack.pop())});

function segmentCrossesRiver(a,b){
  const ax=a.x-RIVER_X,bx=b.x-RIVER_X;
  return ax===0||bx===0||ax*bx<0;
}
function canAddSegment(a,b,line){
  if(a.id===b.id)return {ok:false,msg:'같은 역끼리는 연결할 수 없어요.'};
  if(line.stops.includes(a.id)&&line.stops.includes(b.id))return {ok:false,msg:'이미 같은 노선에 있는 구간이에요.'};
  if(line.stops.length){
    const first=line.stops[0],last=line.stops[line.stops.length-1];
    if(a.id!==first&&a.id!==last&&b.id!==first&&b.id!==last)return {ok:false,msg:'노선의 끝에서 이어 주세요.'};
    const newId=line.stops.includes(a.id)?b.id:a.id;
    if(line.stops.includes(newId))return {ok:false,msg:'노선이 자기 자신을 다시 지나갈 수 없어요.'};
  }
  if(segmentCrossesRiver(a,b)&&state.bridges<=0)return {ok:false,msg:'강을 건널 교량이 부족해요.'};
  return {ok:true};
}
function addSegment(a,b){
  const line=lineById(selectedLine);if(!line||selectedLine>=state.unlockedLines)return;
  const check=canAddSegment(a,b,line);
  if(!check.ok){play('error');showNotice(check.msg);return}
  pushUndo();
  if(segmentCrossesRiver(a,b))state.bridges--;
  if(!line.stops.length){line.stops=[a.id,b.id]}
  else{
    const first=line.stops[0],last=line.stops[line.stops.length-1];
    if(a.id===first)line.stops.unshift(b.id);
    else if(a.id===last)line.stops.push(b.id);
    else if(b.id===first)line.stops.unshift(a.id);
    else if(b.id===last)line.stops.push(a.id);
  }
  resetLineTrains(line);
  if(!line.trains.length&&state.spareTrains>0){state.spareTrains--;line.trains.push(makeTrain(line.id,0))}
  updateLineButtons();play('confirm',1.06);showNotice(line.name+' 연결 완료',900);tutorialRouteDone();
}
function makeTrain(lineId,offset=0){
  return {lineId,stopIndex:0,dir:1,phase:'dwell',dwell:.55+offset,progress:0,nextIndex:1,passengers:[],prepared:false};
}
function resetLineTrains(line){
  const first=stationById(line.stops[0]);
  for(const t of line.trains){
    if(first&&t.passengers.length)first.queue.push(...t.passengers);
    t.passengers=[];t.stopIndex=0;t.dir=1;t.phase='dwell';t.dwell=.55;t.progress=0;t.nextIndex=Math.min(1,line.stops.length-1);t.prepared=false;
  }
}
function assignTrain(lineId){
  if(state.spareTrains<=0){pendingTrain=false;updateLineButtons();play('error');showNotice('남은 열차가 없어요.');return}
  const line=lineById(lineId);
  if(!line||line.stops.length<2){play('error');showNotice('먼저 두 역 이상을 연결해 주세요.');return}
  pushUndo();state.spareTrains--;line.trains.push(makeTrain(lineId,line.trains.length*.14));pendingTrain=false;updateLineButtons();play('confirm');showNotice(line.name+'에 열차를 추가했어요.',1200);
}
ui.trainTool.addEventListener('click',()=>{
  if(!state.running)return;
  if(state.spareTrains<=0){play('error');showNotice('도시 지원에서 열차를 더 받아야 해요.');return}
  pendingTrain=!pendingTrain;pendingTrim=false;updateLineButtons();play('click');showNotice(pendingTrain?'열차를 넣을 노선 색을 누르세요.':'열차 배치를 취소했어요.',1200);
});
ui.bridgeTool.addEventListener('click',()=>{play('click');showNotice('교량은 강을 건너는 새 구간에 자동으로 사용돼요. · '+state.bridges+'개 남음',1700)});
ui.trimTool.addEventListener('click',()=>{
  if(!state.running)return;
  pendingTrim=!pendingTrim;pendingTrain=false;updateLineButtons();play('click');
  showNotice(pendingTrim?'선택한 노선의 맨 끝 역을 눌러 구간을 철거하세요.':'노선 철거를 취소했어요.',1400);
});
function trimSelectedLineAt(station){
  const line=lineById(selectedLine);
  if(!line||line.stops.length<2){play('error');showNotice('줄일 노선이 없어요.');return}
  const firstId=line.stops[0],lastId=line.stops[line.stops.length-1];
  if(station.id!==firstId&&station.id!==lastId){play('error');showNotice('선택한 노선의 맨 끝 역을 눌러 주세요.');return}
  pushUndo();
  const first=stationById(firstId),last=stationById(lastId);
  let neighbor;
  if(station.id===firstId){neighbor=stationById(line.stops[1]);if(first&&neighbor&&segmentCrossesRiver(first,neighbor))state.bridges++;line.stops.shift()}
  else{neighbor=stationById(line.stops[line.stops.length-2]);if(last&&neighbor&&segmentCrossesRiver(last,neighbor))state.bridges++;line.stops.pop()}
  if(line.stops.length<2){
    const home=stationById(line.stops[0]);
    for(const t of line.trains){if(home&&t.passengers.length)home.queue.push(...t.passengers)}
    state.spareTrains+=line.trains.length;line.trains=[];line.stops=[];
  }else resetLineTrains(line);
  pendingTrim=false;updateLineButtons();play('confirm');showNotice(line.name+'의 끝 구간을 철거했어요.',1200);
}

function graphEdges(){
  const adj=new Map(state.stations.map(s=>[s.id,[]]));
  for(const line of state.lines){
    if(line.stops.length<2)continue;
    for(let i=0;i<line.stops.length-1;i++){
      const a=stationById(line.stops[i]),b=stationById(line.stops[i+1]);if(!a||!b)continue;
      const w=dist(a,b)/105;
      adj.get(a.id).push({to:b.id,line:line.id,w});adj.get(b.id).push({to:a.id,line:line.id,w});
    }
  }
  return adj;
}
function shortestPath(startId,targetShape){
  const start=stationById(startId);if(!start)return null;if(start.shape===targetShape)return [startId];
  const adj=graphEdges();
  const best=new Map(),prev=new Map(),todo=[];
  const startKey=startId+'|-1';best.set(startKey,0);todo.push({sid:startId,line:-1,cost:0,key:startKey});
  let found=null;
  while(todo.length){
    todo.sort((a,b)=>a.cost-b.cost);const cur=todo.shift();
    if(cur.cost!==best.get(cur.key))continue;
    const st=stationById(cur.sid);
    if(cur.sid!==startId&&st&&st.shape===targetShape){found=cur;break}
    for(const e of adj.get(cur.sid)||[]){
      const transfer=cur.line!==-1&&cur.line!==e.line ? .52 : 0;
      const cost=cur.cost+e.w+transfer;
      const key=e.to+'|'+e.line;
      if(cost<(best.get(key)??Infinity)){best.set(key,cost);prev.set(key,cur.key);todo.push({sid:e.to,line:e.line,cost,key})}
    }
  }
  if(!found)return null;
  const keys=[];let k=found.key;while(k){keys.push(k);k=prev.get(k)}keys.reverse();
  const ids=[];for(const key of keys){const id=Number(key.split('|')[0]);if(ids[ids.length-1]!==id)ids.push(id)}
  return ids;
}

function normalizedNext(line,t){
  if(line.stops.length<2)return null;
  let ni=t.stopIndex+t.dir;
  if(ni<0||ni>=line.stops.length){t.dir*=-1;ni=t.stopIndex+t.dir}
  return clamp(ni,0,line.stops.length-1);
}
function processStop(line,t){
  if(line.stops.length<2)return;
  const st=stationById(line.stops[t.stopIndex]);if(!st)return;
  const ni=normalizedNext(line,t);if(ni===null)return;
  const nextId=line.stops[ni];
  const keep=[];
  for(const p of t.passengers){
    if(st.shape===p.shape){state.delivered++;play('tick',1.22);tutorialDelivered();continue}
    const path=shortestPath(st.id,p.shape);
    if(path&&path[1]===nextId)keep.push(p);else st.queue.push(p);
  }
  t.passengers=keep;
  for(let i=0;i<st.queue.length&&t.passengers.length<state.capacity;){
    const p=st.queue[i];const path=shortestPath(st.id,p.shape);
    if(path&&path[1]===nextId){t.passengers.push(p);st.queue.splice(i,1)}else i++;
  }
  t.nextIndex=ni;
}
function updateTrain(line,t,dt){
  if(line.stops.length<2)return;
  t.stopIndex=clamp(t.stopIndex,0,line.stops.length-1);
  if(t.phase==='dwell'){
    if(!t.prepared){processStop(line,t);t.prepared=true}
    t.dwell-=dt;
    if(t.dwell<=0){t.phase='travel';t.progress=0}
    return;
  }
  const a=stationById(line.stops[t.stopIndex]),b=stationById(line.stops[t.nextIndex]);
  if(!a||!b){t.phase='dwell';t.dwell=.5;return}
  const d=Math.max(1,dist(a,b));t.progress+=92*dt/d;
  if(t.progress>=1){t.stopIndex=t.nextIndex;t.progress=0;t.phase='dwell';t.dwell=.62;t.prepared=false}
}
function spawnPassenger(){
  if(state.stations.length<2)return;
  const weighted=[];let total=0;
  for(const s of state.stations){total+=s.demand;weighted.push([s,total])}
  let n=rng()*total,origin=weighted[0][0];
  for(const row of weighted){if(n<=row[1]){origin=row[0];break}}
  const targets=[...new Set(state.stations.filter(s=>s.id!==origin.id&&s.shape!==origin.shape).map(s=>s.shape))];
  if(!targets.length)return;
  const shape=targets[Math.floor(rng()*targets.length)];
  if(origin.queue.length<18)origin.queue.push({shape,age:0});
}
function demandPerMinute(t){
  const m=t/60;return Math.min(38,6+1.5*m+.38*m*m);
}
function updateDemand(dt){
  if(state.tutorialMode&&tutorialStep===0)return;
  state.spawnCarry+=dt*demandPerMinute(state.time)/60;
  while(state.spawnCarry>=1){state.spawnCarry--;spawnPassenger()}
}
function updateCongestion(dt){
  for(const s of state.stations){
    for(const p of s.queue)p.age+=dt;
    if(s.queue.length>=8)s.danger+=dt;else s.danger=Math.max(0,s.danger-dt*1.75);
    s.pulse=Math.max(0,s.pulse-dt*1.2);
    if(s.danger>=14){endGame(s.name+'의 승강장이 너무 오래 붐볐어요.');return}
  }
}
function update(dt){
  state.time+=dt;
  updateDemand(dt);
  for(const line of state.lines)for(const t of line.trains)updateTrain(line,t,dt);
  updateCongestion(dt);if(state.gameOver)return;
  if(state.time>=state.nextStationAt&&state.stations.length<16){spawnStation();state.nextStationAt+=37+rng()*9}
  if(state.time>=state.nextUpgradeAt){state.nextUpgradeAt+=75;openUpgrade();return}
  updateHud();
}
function openUpgrade(){
  state.upgradeOpen=true;state.paused=true;ui.upgrade.classList.remove('hidden');play('success',1.12);
  const defs=[
    {id:'train',icon:'🚇',title:'열차 1대',text:'혼잡한 노선에 추가 열차를 배치할 수 있어요.'},
    {id:'line',icon:'🛤️',title:'새 노선',text:'새로운 색 노선을 하나 더 사용할 수 있어요.'},
    {id:'bridge',icon:'🌉',title:'교량 2개',text:'강을 건너는 노선을 두 구간 더 만들 수 있어요.'},
    {id:'capacity',icon:'🚃',title:'객차 확장',text:'모든 열차의 정원이 2명 늘어나요.'}
  ].filter(x=>x.id!=='line'||state.unlockedLines<LINE_DEFS.length).filter(x=>x.id!=='capacity'||state.capacity<10);
  shuffle(defs);const choices=defs.slice(0,Math.min(3,defs.length));
  ui.choices.innerHTML='';
  for(const d of choices){
    const b=document.createElement('button');b.type='button';b.className='upgradeCard';
    b.innerHTML='<span class="upIcon">'+d.icon+'</span><b>'+d.title+'</b><p>'+d.text+'</p>';
    b.addEventListener('click',()=>applyUpgrade(d.id));ui.choices.appendChild(b);
  }
}
function applyUpgrade(id){
  pushUndo();
  if(id==='train')state.spareTrains++;
  if(id==='line')state.unlockedLines=Math.min(LINE_DEFS.length,state.unlockedLines+1);
  if(id==='bridge')state.bridges+=2;
  if(id==='capacity')state.capacity=Math.min(10,state.capacity+2);
  state.upgradeOpen=false;state.paused=false;ui.upgrade.classList.add('hidden');updateLineButtons();play('confirm',1.06);showNotice('도시 지원이 적용됐어요.',1300);
}
function endGame(reason){
  if(state.gameOver)return;
  state.gameOver=true;state.running=false;state.paused=true;ui.result.classList.remove('hidden');play('fail');
  ui.resultReason.textContent=reason;ui.resultDelivered.textContent=state.delivered+'명';ui.resultTime.textContent=formatTime(state.time);ui.resultStations.textContent=state.stations.length+'개';
  const newBest=state.delivered>save.bestDelivered;
  if(newBest){save.bestDelivered=state.delivered;save.bestSeconds=Math.max(save.bestSeconds,Math.floor(state.time));ui.resultTitle.textContent='새 최고 기록!'}
  else ui.resultTitle.textContent='도시 운영 종료';
  persist();refreshBest();
}

function nearestStation(p,r=31){
  let best=null,bd=r;
  for(const s of state.stations){const d=dist(p,s);if(d<bd){best=s;bd=d}}
  return best;
}
function distancePointToSegment(p,a,b){
  const vx=b.x-a.x,vy=b.y-a.y,wx=p.x-a.x,wy=p.y-a.y;
  const c1=vx*wx+vy*wy,c2=vx*vx+vy*vy,t=c2?clamp(c1/c2,0,1):0;
  return Math.hypot(p.x-(a.x+vx*t),p.y-(a.y+vy*t));
}
function nearestLineAt(p){
  let best=null,bd=24;
  for(const line of state.lines.slice(0,state.unlockedLines)){
    for(let i=0;i<line.stops.length-1;i++){
      const a=stationById(line.stops[i]),b=stationById(line.stops[i+1]);if(!a||!b)continue;
      const d=distancePointToSegment(p,a,b);if(d<bd){best=line;bd=d}
    }
  }
  return best;
}
canvas.addEventListener('pointerdown',ev=>{
  if(!state.running||state.paused||state.gameOver)return;
  const p=worldPoint(ev);pointer=p;canvas.setPointerCapture?.(ev.pointerId);
  if(pendingTrain){const line=nearestLineAt(p);if(line)assignTrain(line.id);else{play('error');showNotice('열차를 넣을 노선을 눌러 주세요.')}return}
  const s=nearestStation(p);
  if(pendingTrim){if(s)trimSelectedLineAt(s);else{play('error');showNotice('노선 끝의 역을 눌러 주세요.')}return}
  if(s){drag={from:s,pointerId:ev.pointerId};play('click',1.06)}
});
canvas.addEventListener('pointermove',ev=>{pointer=worldPoint(ev)});
canvas.addEventListener('pointerup',ev=>{
  if(!state.running||state.paused||state.gameOver)return;
  const p=worldPoint(ev),to=nearestStation(p);pointer=p;
  if(drag){
    const from=drag.from;drag=null;
    if(to&&to.id!==from.id)addSegment(from,to);
    else if(to&&to.id===from.id){
      const used=state.lines.filter(l=>l.stops.includes(to.id)).map(l=>l.name).join(' · ')||'연결 없음';
      showNotice(to.name+' · 대기 '+to.queue.length+'명 · '+used,1700);
    }
  }else if(to){
    const used=state.lines.filter(l=>l.stops.includes(to.id)).map(l=>l.name).join(' · ')||'연결 없음';
    showNotice(to.name+' · 대기 '+to.queue.length+'명 · '+used,1700);
  }
});
canvas.addEventListener('pointercancel',()=>{drag=null});

function drawBackground(){
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#102434');g.addColorStop(1,'#0a1824');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='rgba(173,201,221,.055)';ctx.lineWidth=1;
  for(let x=55;x<W;x+=70){ctx.beginPath();ctx.moveTo(x,50);ctx.lineTo(x,H-38);ctx.stroke()}
  for(let y=76;y<H;y+=62){ctx.beginPath();ctx.moveTo(35,y);ctx.lineTo(W-35,y);ctx.stroke()}
  for(const b of decor){ctx.fillStyle='rgba(184,211,229,'+b.a+')';ctx.fillRect(b.x,b.y,b.w,b.h)}
  ctx.fillStyle='#12384f';ctx.beginPath();ctx.moveTo(RIVER_X-RIVER_W/2,0);
  for(let y=0;y<=H;y+=60)ctx.lineTo(RIVER_X-RIVER_W/2+Math.sin(y*.025)*9,y);
  for(let y=H;y>=0;y-=60)ctx.lineTo(RIVER_X+RIVER_W/2+Math.sin(y*.025+1.3)*9,y);
  ctx.closePath();ctx.fill();
  ctx.strokeStyle='rgba(86,184,224,.18)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(RIVER_X,0);for(let y=0;y<=H;y+=20)ctx.lineTo(RIVER_X+Math.sin(y*.03)*8,y);ctx.stroke();
}
function drawRoutes(){
  for(const line of state.lines){
    if(line.stops.length<2)continue;
    ctx.lineCap='round';ctx.lineJoin='round';
    ctx.strokeStyle='rgba(2,8,16,.72)';ctx.lineWidth=16;ctx.beginPath();
    line.stops.forEach((id,i)=>{const s=stationById(id);if(!s)return;if(i===0)ctx.moveTo(s.x,s.y);else ctx.lineTo(s.x,s.y)});ctx.stroke();
    ctx.strokeStyle=line.color;ctx.lineWidth=9;ctx.beginPath();
    line.stops.forEach((id,i)=>{const s=stationById(id);if(!s)return;if(i===0)ctx.moveTo(s.x,s.y);else ctx.lineTo(s.x,s.y)});ctx.stroke();
    for(let i=0;i<line.stops.length-1;i++){
      const a=stationById(line.stops[i]),b=stationById(line.stops[i+1]);if(a&&b&&segmentCrossesRiver(a,b))drawBridge(a,b);
    }
  }
}
function drawBridge(a,b){
  const t=(RIVER_X-a.x)/(b.x-a.x||1);const y=lerp(a.y,b.y,t);
  const ang=Math.atan2(b.y-a.y,b.x-a.x);
  ctx.save();ctx.translate(RIVER_X,y);ctx.rotate(ang);ctx.fillStyle='rgba(226,235,240,.78)';ctx.fillRect(-36,-9,72,18);ctx.fillStyle='rgba(25,39,49,.55)';
  for(let x=-28;x<=28;x+=14)ctx.fillRect(x,-9,3,18);ctx.restore();
}
function shapePath(shape,x,y,r){
  ctx.beginPath();
  if(shape==='circle'){ctx.arc(x,y,r,0,Math.PI*2);return}
  if(shape==='triangle'){ctx.moveTo(x,y-r);ctx.lineTo(x+r*.92,y+r*.72);ctx.lineTo(x-r*.92,y+r*.72);ctx.closePath();return}
  if(shape==='square'){ctx.rect(x-r*.78,y-r*.78,r*1.56,r*1.56);return}
  ctx.moveTo(x,y-r);ctx.lineTo(x+r,y);ctx.lineTo(x,y+r);ctx.lineTo(x-r,y);ctx.closePath();
}
function drawStations(){
  for(const s of state.stations){
    if(s.danger>0){
      ctx.strokeStyle=s.danger>8?'#ff6f68':'#ffb35c';ctx.lineWidth=5;ctx.beginPath();ctx.arc(s.x,s.y,29,-Math.PI/2,-Math.PI/2+Math.PI*2*(s.danger/14));ctx.stroke();
    }
    if(s.pulse>0){ctx.globalAlpha=s.pulse*.35;ctx.strokeStyle='#fff';ctx.lineWidth=4;ctx.beginPath();ctx.arc(s.x,s.y,24+(1-s.pulse)*22,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1}
    ctx.fillStyle='#f6fbff';ctx.strokeStyle='#07131f';ctx.lineWidth=4;shapePath(s.shape,s.x,s.y,15);ctx.fill();ctx.stroke();
    drawQueue(s);
  }
}
function drawQueue(s){
  const n=Math.min(s.queue.length,12);
  if(!n)return;
  const cols=6,startX=s.x-(Math.min(n,6)-1)*6,startY=s.y+27;
  for(let i=0;i<n;i++){
    const p=s.queue[i],x=startX+(i%cols)*12,y=startY+Math.floor(i/cols)*12;
    ctx.fillStyle=s.queue.length>=8?'#ffd0cd':'#dce9f5';ctx.strokeStyle='rgba(5,14,25,.9)';ctx.lineWidth=1.4;shapePath(p.shape,x,y,4.2);ctx.fill();ctx.stroke();
  }
  if(s.queue.length>12){ctx.fillStyle='#fff';ctx.font='800 9px system-ui';ctx.fillText('+'+(s.queue.length-12),s.x+37,s.y+39)}
}
function trainPosition(line,t){
  const a=stationById(line.stops[t.stopIndex]);if(!a)return null;
  if(t.phase!=='travel')return {x:a.x,y:a.y,ang:0};
  const b=stationById(line.stops[t.nextIndex]);if(!b)return {x:a.x,y:a.y,ang:0};
  return {x:lerp(a.x,b.x,t.progress),y:lerp(a.y,b.y,t.progress),ang:Math.atan2(b.y-a.y,b.x-a.x)};
}
function drawTrains(){
  for(const line of state.lines)for(const t of line.trains){
    const p=trainPosition(line,t);if(!p)continue;
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.ang);ctx.fillStyle='#07131f';roundRect(-16,-9,32,18,6);ctx.fill();ctx.fillStyle=line.color;roundRect(-13,-6,26,12,4);ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.9)';ctx.fillRect(-7,-3,5,4);ctx.fillRect(2,-3,5,4);
    if(t.passengers.length){ctx.fillStyle='#fff';ctx.font='900 8px system-ui';ctx.textAlign='center';ctx.fillText(String(t.passengers.length),0,3)}
    ctx.restore();
  }
}
function roundRect(x,y,w,h,r){
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
}
function drawPreview(){
  if(!drag)return;const a=drag.from,b=pointer,line=lineById(selectedLine);if(!a||!line)return;
  const target=nearestStation(b),end=target||b;const check=target?canAddSegment(a,target,line):{ok:true};
  ctx.save();ctx.setLineDash([12,9]);ctx.strokeStyle=check.ok?line.color:'#ff6f68';ctx.globalAlpha=.72;ctx.lineWidth=7;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(end.x,end.y);ctx.stroke();ctx.restore();
  if(target){ctx.strokeStyle=check.ok?'#fff':'#ff6f68';ctx.lineWidth=4;ctx.beginPath();ctx.arc(target.x,target.y,24,0,Math.PI*2);ctx.stroke()}
}
function render(){
  ctx.setTransform(dpr*scale,0,0,dpr*scale,dpr*offX,dpr*offY);
  drawBackground();drawRoutes();drawTrains();drawStations();drawPreview();
  ctx.setTransform(1,0,0,1,0,0);
}
function loop(now){
  requestAnimationFrame(loop);
  const raw=Math.min(.05,Math.max(0,(now-last)/1000));last=now;
  if(state.running&&!state.paused&&!state.gameOver)update(raw*state.speed);
  render();
}
requestAnimationFrame(loop);

ui.pause.addEventListener('click',()=>{
  if(!state.running||state.gameOver)return;
  if(state.upgradeOpen)return;
  state.paused=!state.paused;ui.pause.textContent=state.paused?'▶':'⏸';play('click');showNotice(state.paused?'일시정지':'다시 운영합니다.',900);
});
ui.speed.addEventListener('click',()=>{
  if(!state.running)return;state.speed=state.speed===1?2:1;ui.speed.textContent='×'+state.speed;play('click');showNotice(state.speed===2?'2배속':'1배속',700);
});
ui.sound.addEventListener('click',()=>{soundOn=!soundOn;ui.sound.textContent=soundOn?'🔊':'🔇';if(soundOn)play('click')});
ui.helpBtn.addEventListener('click',()=>{ui.help.classList.remove('hidden');if(state.running)state.paused=true;play('click')});
ui.closeHelp.addEventListener('click',()=>{ui.help.classList.add('hidden');if(state.running&&!state.upgradeOpen&&!state.gameOver)state.paused=false;play('click')});
ui.start.addEventListener('click',()=>{play('confirm');resetState(!save.tutorialSeen)});
ui.tutorial.addEventListener('click',()=>{play('confirm');resetState(true)});
ui.retry.addEventListener('click',()=>{play('confirm');resetState(false)});
ui.menuBtn.addEventListener('click',()=>{ui.result.classList.add('hidden');ui.menu.classList.remove('hidden');state.running=false;play('click')});

document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.running&&!state.gameOver){state.paused=true;ui.pause.textContent='▶'}});
addEventListener('keydown',ev=>{
  if(ev.code==='Space'&&state.running&&!state.upgradeOpen){ev.preventDefault();ui.pause.click()}
  if(ev.code==='Digit1'||ev.code==='Digit2'||ev.code==='Digit3'||ev.code==='Digit4'||ev.code==='Digit5'){
    const i=Number(ev.code.slice(-1))-1;if(i<state.unlockedLines){selectedLine=i;pendingTrain=false;pendingTrim=false;updateLineButtons();play('click')}
  }
});

loadSave();updateLineButtons();updateHud();render();
})();
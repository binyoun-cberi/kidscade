(()=>{
'use strict';

const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d',{alpha:false});
const W=1200,H=760,DPR_CAP=1.75;
const GAME_MIN_PER_SEC=18;
const REPORT_DAYS=3;
const TRANSFER_PENALTY=8;
const MAX_DEBT=150;
const TRAIN_CAPACITY=36;

const CITIES=[
 {id:'seoul',name:'서울',x:430,y:135,pop:10,jobs:10,industry:7,tourism:9,education:9,hub:10},
 {id:'incheon',name:'인천',x:345,y:155,pop:8,jobs:7,industry:8,tourism:5,education:5,hub:7},
 {id:'suwon',name:'수원',x:425,y:205,pop:8,jobs:8,industry:8,tourism:3,education:6,hub:7},
 {id:'chuncheon',name:'춘천',x:535,y:135,pop:4,jobs:4,industry:3,tourism:7,education:5,hub:4},
 {id:'wonju',name:'원주',x:555,y:220,pop:5,jobs:5,industry:5,tourism:4,education:5,hub:5},
 {id:'gangneung',name:'강릉',x:665,y:190,pop:4,jobs:3,industry:2,tourism:9,education:3,hub:4},
 {id:'cheonan',name:'천안',x:440,y:275,pop:6,jobs:6,industry:7,tourism:3,education:6,hub:7},
 {id:'cheongju',name:'청주',x:515,y:285,pop:6,jobs:6,industry:7,tourism:3,education:6,hub:6},
 {id:'daejeon',name:'대전',x:495,y:350,pop:7,jobs:7,industry:5,tourism:3,education:8,hub:9},
 {id:'jeonju',name:'전주',x:420,y:415,pop:5,jobs:5,industry:4,tourism:7,education:6,hub:5},
 {id:'daegu',name:'대구',x:595,y:420,pop:8,jobs:7,industry:7,tourism:5,education:6,hub:8},
 {id:'pohang',name:'포항',x:685,y:390,pop:5,jobs:5,industry:9,tourism:5,education:4,hub:5},
 {id:'gwangju',name:'광주',x:395,y:500,pop:7,jobs:7,industry:5,tourism:6,education:7,hub:7},
 {id:'mokpo',name:'목포',x:315,y:555,pop:4,jobs:3,industry:5,tourism:7,education:3,hub:4},
 {id:'suncheon',name:'순천',x:470,y:550,pop:4,jobs:4,industry:4,tourism:8,education:4,hub:4},
 {id:'changwon',name:'창원',x:565,y:555,pop:6,jobs:6,industry:9,tourism:4,education:4,hub:6},
 {id:'ulsan',name:'울산',x:670,y:500,pop:6,jobs:6,industry:10,tourism:4,education:3,hub:6},
 {id:'busan',name:'부산',x:640,y:575,pop:9,jobs:8,industry:9,tourism:8,education:6,hub:9}
];

const CORRIDOR_DEFS=[
 ['incheon','seoul',28,'metro',1.05],['seoul','suwon',35,'metro',1.12],['seoul','chuncheon',75,'hill',1.25],
 ['suwon','cheonan',62,'plain',1.00],['chuncheon','wonju',82,'mountain',1.48],['wonju','gangneung',95,'mountain',1.70],
 ['wonju','cheongju',92,'hill',1.28],['cheonan','cheongju',45,'plain',1.00],['cheonan','daejeon',68,'plain',1.02],
 ['cheongju','daejeon',42,'plain',1.00],['daejeon','jeonju',67,'hill',1.12],['daejeon','daegu',145,'hill',1.24],
 ['jeonju','gwangju',102,'plain',1.03],['gwangju','mokpo',80,'plain',1.02],['gwangju','suncheon',92,'hill',1.18],
 ['suncheon','changwon',115,'hill',1.25],['changwon','busan',50,'metro',1.10],['changwon','daegu',105,'hill',1.18],
 ['daegu','pohang',78,'hill',1.22],['daegu','ulsan',112,'hill',1.22],['ulsan','busan',72,'metro',1.12],
 ['daegu','busan',120,'hill',1.20],['cheongju','daegu',150,'mountain',1.42]
];
const CORRIDORS=CORRIDOR_DEFS.map((v,i)=>({
 id:'c'+i,a:v[0],b:v[1],km:v[2],terrain:v[3],mult:v[4],
 cost:Math.max(6,Math.round(v[2]*.115*v[4]))
}));

const LINE_DEFS=[
 {name:'1호선',color:'#66d9ff'},
 {name:'2호선',color:'#ff9d66'},
 {name:'3호선',color:'#72e59e'},
 {name:'4호선',color:'#cf8bff'},
 {name:'5호선',color:'#ffd866'}
];

const $=id=>document.getElementById(id);
const ui={
 menu:$('menu'),help:$('help'),report:$('monthReport'),result:$('result'),
 start:$('startBtn'),tutorial:$('tutorialBtn'),closeHelp:$('closeHelpBtn'),retry:$('retryBtn'),menuBtn:$('menuBtn'),
 pause:$('pauseBtn'),speed:$('speedBtn'),layer:$('layerBtn'),sound:$('soundBtn'),helpBtn:$('helpBtn'),
 date:$('dateLabel'),cash:$('cashLabel'),delivered:$('deliveredLabel'),wait:$('waitLabel'),access:$('accessLabel'),
 serviceList:$('serviceList'),monthProfit:$('monthProfitLabel'),notice:$('notice'),
 trackTool:$('trackTool'),lineTools:$('lineTools'),trainTool:$('trainTool'),trimTool:$('trimTool'),undo:$('undoBtn'),trainStock:$('trainStock'),
 detailEmpty:$('detailEmpty'),cityDetail:$('cityDetail'),serviceDetail:$('serviceDetail'),
 cityName:$('cityName'),cityPop:$('cityPop'),cityJobs:$('cityJobs'),cityIndustry:$('cityIndustry'),cityTourism:$('cityTourism'),
 cityWaiting:$('cityWaiting'),cityCrowding:$('cityCrowding'),cityTopDest:$('cityTopDest'),cityServices:$('cityServices'),
 serviceName:$('serviceName'),serviceStops:$('serviceStops'),serviceTrains:$('serviceTrains'),serviceHeadway:$('serviceHeadway'),serviceLoad:$('serviceLoad'),serviceProfit:$('serviceProfit'),
 income:$('incomeLabel'),expense:$('expenseLabel'),debt:$('debtLabel'),
 reportTitle:$('reportTitle'),reportDelivered:$('reportDelivered'),reportProfit:$('reportProfit'),reportAccess:$('reportAccess'),reportWait:$('reportWait'),reportChoices:$('reportChoices'),
 resultTitle:$('resultTitle'),resultReason:$('resultReason'),resultDelivered:$('resultDelivered'),resultTime:$('resultTime'),resultAccess:$('resultAccess'),
 tutorialBubble:$('tutorialBubble'),tutorialTitle:$('tutorialTitle'),tutorialText:$('tutorialText'),tutorialSkip:$('tutorialSkip')
};

let cssW=innerWidth,cssH=innerHeight,scale=1,offX=0,offY=0,dpr=1,last=performance.now();
let noticeTimer=0,soundOn=true,pointer={x:0,y:0},drag=null;
let mode='track',selectedLine=0,pendingTrim=false,selectedCityId=null,selectedServiceId=null;
let undoStack=[],routeCache=new Map(),networkDirty=true,panelRefresh=0;
let save={tutorialSeen:false,bestDelivered:0,bestAccess:0,bestMonths:0};

const state={
 running:false,paused:false,reportOpen:false,gameOver:false,speed:1,
 gameMin:360,day:1,month:1,nextReportDay:4,
 cash:220,debt:0,delivered:0,deliveredMonth:0,incomeMonth:0,lastMonthProfit:0,lastOperatingCost:0,
 spareTrains:3,unlockedLines:3,
 tracks:new Set(),services:[],trains:[],
 queues:new Map(),spawnCarry:0,tutorial:false,tutorialStep:0
};

const audio={
 click:makePool('../../assets/audio/ui/kenney_interface/click_002.ogg',.22,3),
 confirm:makePool('../../assets/audio/ui/kenney_interface/confirmation_001.ogg',.28,3),
 error:makePool('../../assets/audio/ui/kenney_interface/error_002.ogg',.23,2),
 tick:makePool('../../assets/audio/ui/kenney_interface/tick_001.ogg',.14,3),
 success:makePool('../../assets/audio/sfx/success/cheer-yay-01.mp3',.18,2),
 fail:makePool('../../assets/audio/sfx/failure/fail-sting-01.mp3',.24,2)
};
function makePool(src,volume,n){return {i:0,a:Array.from({length:n},()=>{const a=new Audio(src);a.preload='auto';a.volume=volume;return a})}}
function play(name,rate=1){if(!soundOn)return;const p=audio[name];if(!p)return;const a=p.a[p.i++%p.a.length];try{a.pause();a.currentTime=0;a.playbackRate=rate;a.play().catch(()=>{})}catch(_){}}

function city(id){return CITIES.find(c=>c.id===id)}
function corridorByCities(a,b){return CORRIDORS.find(c=>(c.a===a&&c.b===b)||(c.a===b&&c.b===a))}
function serviceById(id){return state.services.find(s=>s.id===id)}
function keyPair(a,b){return a<b?a+'|'+b:b+'|'+a}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function lerp(a,b,t){return a+(b-a)*t}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function money(v){const n=Math.round(v*10)/10;return (n>=0?'':'-')+Math.abs(n).toFixed(Math.abs(n)%1?1:0)+'억'}
function totalWaiting(id){const q=state.queues.get(id);if(!q)return 0;let n=0;for(const g of q.values())n+=g.count;return n}
function cityCapacity(c){return 18+c.pop*3+c.hub}
function crowding(c){return clamp(totalWaiting(c.id)/cityCapacity(c),0,1.5)}
function terrainName(t){return t==='mountain'?'산악':t==='hill'?'구릉':t==='metro'?'도심':'평야'}

function loadSave(){
 try{const api=window.KidscadeStorage;if(api)save=Object.assign(save,api.getJson('metroPlannerSave',save)||{})}catch(_){}
 refreshBest();
}
function persist(){try{window.KidscadeStorage?.setJson('metroPlannerSave',save)}catch(_){}}
function refreshBest(){
 const el=$('bestText');if(!el)return;
 if(!save.bestDelivered){el.textContent='첫 대한민국 철도망 기록을 만들어 보세요.';return}
 el.textContent='최고 기록 · '+save.bestDelivered+'명 수송 · 접근성 '+Math.round(save.bestAccess||0)+'% · '+(save.bestMonths||1)+'개월';
}

function resize(){
 cssW=innerWidth;cssH=innerHeight;dpr=Math.min(devicePixelRatio||1,DPR_CAP);
 canvas.width=Math.max(1,Math.round(cssW*dpr));canvas.height=Math.max(1,Math.round(cssH*dpr));
 canvas.style.width=cssW+'px';canvas.style.height=cssH+'px';
 scale=Math.min(cssW/W,cssH/H);offX=(cssW-W*scale)/2;offY=(cssH-H*scale)/2;
}
addEventListener('resize',resize,{passive:true});resize();
function worldPoint(ev){const r=canvas.getBoundingClientRect();return{x:(ev.clientX-r.left-offX)/scale,y:(ev.clientY-r.top-offY)/scale}}

function resetState(tutorial){
 Object.assign(state,{
  running:true,paused:false,reportOpen:false,gameOver:false,speed:1,
  gameMin:360,day:1,month:1,nextReportDay:4,cash:220,debt:0,delivered:0,deliveredMonth:0,incomeMonth:0,lastMonthProfit:0,lastOperatingCost:0,
  spareTrains:3,unlockedLines:3,tracks:new Set(),services:[],trains:[],queues:new Map(),spawnCarry:0,tutorial:!!tutorial,tutorialStep:0
 });
 CITIES.forEach(c=>state.queues.set(c.id,new Map()));
 state.services=LINE_DEFS.map((d,i)=>({id:i,name:d.name,color:d.color,stops:[],trainCount:0,revenueMonth:0,deliveredMonth:0,boardedMonth:0}));
 mode='track';selectedLine=0;pendingTrim=false;selectedCityId=null;selectedServiceId=null;undoStack=[];routeCache.clear();networkDirty=true;drag=null;
 ui.menu.classList.add('hidden');ui.help.classList.add('hidden');ui.report.classList.add('hidden');ui.result.classList.add('hidden');
 ui.pause.textContent='⏸';ui.speed.textContent='×1';ui.layer.textContent='기본';
 updateToolbar();updatePanels();updateHud();
 if(tutorial)startTutorial();else{ui.tutorialBubble.classList.add('hidden');showNotice('먼저 가까운 도시 사이에 선로를 건설하세요.',2200)}
 last=performance.now();
}

function startTutorial(){
 state.tutorial=true;state.tutorialStep=0;ui.tutorialBubble.classList.remove('hidden');
 ui.tutorialTitle.textContent='1. 서울과 수원을 연결해 보세요';
 ui.tutorialText.textContent='선로 건설이 선택되어 있습니다. 서울에서 수원까지 드래그하면 실제 선로가 만들어집니다.';
}
function tutorialTrackBuilt(a,b){
 if(!state.tutorial||state.tutorialStep!==0)return;
 if(!((a==='seoul'&&b==='suwon')||(a==='suwon'&&b==='seoul')))return;
 state.tutorialStep=1;selectedLine=0;mode='line';updateToolbar();
 ui.tutorialTitle.textContent='2. 1호선을 운행하세요';
 ui.tutorialText.textContent='이제 파란 1호선을 선택해 같은 서울-수원 구간을 다시 드래그하세요. 선로 위에 운행 노선이 생깁니다.';
}
function tutorialLineBuilt(){
 if(!state.tutorial||state.tutorialStep!==1)return;
 state.tutorialStep=2;
 ui.tutorialTitle.textContent='3. 승객과 배차를 지켜보세요';
 ui.tutorialText.textContent='첫 열차가 자동으로 배치됩니다. 승객은 목적지를 갖고 이동하고, 열차를 추가하면 배차가 짧아집니다.';
 save.tutorialSeen=true;persist();
 setTimeout(()=>{if(state.tutorialStep===2){state.tutorial=false;ui.tutorialBubble.classList.add('hidden')}},6500);
}
ui.tutorialSkip.addEventListener('click',()=>{state.tutorial=false;save.tutorialSeen=true;persist();ui.tutorialBubble.classList.add('hidden');play('click')});

function showNotice(text,ms=1500){ui.notice.textContent=text;ui.notice.classList.add('show');clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>ui.notice.classList.remove('show'),ms)}

function snapshot(){
 return {
  cash:state.cash,debt:state.debt,spareTrains:state.spareTrains,unlockedLines:state.unlockedLines,
  tracks:[...state.tracks],
  services:state.services.map(s=>({id:s.id,stops:s.stops.slice(),trainCount:s.trainCount})),
  trains:state.trains.map(t=>({...t,onboard:t.onboard.map(g=>({...g}))}))
 };
}
function pushUndo(){undoStack.push(snapshot());if(undoStack.length>18)undoStack.shift()}
function restore(s){
 state.cash=s.cash;state.debt=s.debt;state.spareTrains=s.spareTrains;state.unlockedLines=s.unlockedLines;state.tracks=new Set(s.tracks);
 for(const ss of s.services){const d=serviceById(ss.id);d.stops=ss.stops.slice();d.trainCount=ss.trainCount}
 state.trains=s.trains.map(t=>({...t,onboard:t.onboard.map(g=>({...g}))}));
 markNetworkDirty();updateToolbar();updatePanels();updateHud();showNotice('이전 철도망 상태로 되돌렸어요.');play('click');
}
ui.undo.addEventListener('click',()=>{if(!undoStack.length){play('error');showNotice('되돌릴 변경이 없어요.');return}restore(undoStack.pop())});

function trackCost(c){return c.cost}
function spend(amount,reason){
 state.cash-=amount;
 if(state.cash<0&&state.debt<MAX_DEBT){
  const loan=Math.min(50,MAX_DEBT-state.debt);state.debt+=loan;state.cash+=loan;showNotice('운영자금 '+loan+'억을 자동 대출했어요.',1800);
 }
 if(state.cash<-20&&state.debt>=MAX_DEBT)gameOver('부채 한도에 도달해 더 이상 철도망을 유지할 수 없습니다.');
 updateHud();
}
function buildTrack(aId,bId){
 const cor=corridorByCities(aId,bId);
 if(!cor){play('error');showNotice('이 두 도시는 바로 연결할 수 없어요. 인접한 도시를 이용하세요.');return false}
 const k=keyPair(aId,bId);if(state.tracks.has(k)){play('error');showNotice('이미 선로가 놓여 있어요.');return false}
 const cost=trackCost(cor);if(state.cash+Math.max(0,MAX_DEBT-state.debt)<cost){play('error');showNotice('건설 자금이 부족해요.');return false}
 pushUndo();state.tracks.add(k);spend(cost,'track');markNetworkDirty();play('confirm');
 showNotice(city(aId).name+'–'+city(bId).name+' 선로 완공 · '+terrainName(cor.terrain)+' · '+cost+'억',1800);
 tutorialTrackBuilt(aId,bId);return true;
}

function canExtendService(s,aId,bId){
 if(!state.tracks.has(keyPair(aId,bId)))return {ok:false,msg:'먼저 두 도시 사이에 선로를 건설해야 해요.'};
 if(aId===bId)return {ok:false,msg:'같은 도시끼리는 연결할 수 없어요.'};
 if(!s.stops.length)return {ok:true};
 const first=s.stops[0],last=s.stops[s.stops.length-1];
 const aIn=s.stops.includes(aId),bIn=s.stops.includes(bId);
 if(aIn&&bIn)return {ok:false,msg:'이미 이 노선에 포함된 구간이에요.'};
 if(aIn&&!bIn&&(aId===first||aId===last))return {ok:true,newId:bId,at:aId===first?'front':'back'};
 if(bIn&&!aIn&&(bId===first||bId===last))return {ok:true,newId:aId,at:bId===first?'front':'back'};
 return {ok:false,msg:'운행 노선의 맨 끝 도시에서 이어 주세요.'};
}
function addServiceSegment(aId,bId){
 const s=serviceById(selectedLine);if(!s||selectedLine>=state.unlockedLines)return false;
 const check=canExtendService(s,aId,bId);if(!check.ok){play('error');showNotice(check.msg);return false}
 pushUndo();
 if(!s.stops.length)s.stops=[aId,bId];
 else if(check.at==='front')s.stops.unshift(check.newId);
 else s.stops.push(check.newId);
 if(s.trainCount===0&&state.spareTrains>0){state.spareTrains--;s.trainCount=1;spawnTrainForService(s,true)}
 resetTrainsForService(s.id);markNetworkDirty();play('confirm');showNotice(s.name+' 운행 구간을 설정했어요.',1200);tutorialLineBuilt();updateToolbar();updatePanels();return true;
}
function trimServiceAt(cityId){
 const s=serviceById(selectedLine);if(!s||s.stops.length<2){play('error');showNotice('줄일 운행 노선이 없어요.');return}
 if(cityId!==s.stops[0]&&cityId!==s.stops[s.stops.length-1]){play('error');showNotice('노선의 맨 끝 도시를 눌러 주세요.');return}
 pushUndo();
 if(cityId===s.stops[0])s.stops.shift();else s.stops.pop();
 if(s.stops.length<2){
  s.stops=[];state.spareTrains+=s.trainCount;s.trainCount=0;state.trains=state.trains.filter(t=>t.serviceId!==s.id);
 }else resetTrainsForService(s.id);
 pendingTrim=false;markNetworkDirty();updateToolbar();updatePanels();play('confirm');showNotice(s.name+'의 끝 구간을 줄였어요.');
}
function addTrainToSelected(){
 const s=serviceById(selectedLine);
 if(!s||s.stops.length<2){play('error');showNotice('먼저 선택한 노선을 두 도시 이상 운행시켜 주세요.');return}
 if(state.spareTrains<=0){play('error');showNotice('남은 열차가 없어요. 월간 지원에서 열차를 확보하세요.');return}
 pushUndo();state.spareTrains--;s.trainCount++;spawnTrainForService(s,false);markNetworkDirty();updateToolbar();updatePanels();play('confirm');
 showNotice(s.name+' 열차 '+s.trainCount+'대 · 배차 약 '+Math.round(calculateHeadway(s))+'분');
}

function markNetworkDirty(){networkDirty=true;routeCache.clear()}
function serviceSegmentMinutes(aId,bId){
 const c=corridorByCities(aId,bId);if(!c)return 999;
 return Math.max(7,c.km/4.2);
}
function serviceCycleMinutes(s){
 if(s.stops.length<2)return 999;
 let one=0;for(let i=0;i<s.stops.length-1;i++)one+=serviceSegmentMinutes(s.stops[i],s.stops[i+1])+2;
 return one*2;
}
function calculateHeadway(s){if(!s||s.trainCount<=0||s.stops.length<2)return 999;return Math.max(5,serviceCycleMinutes(s)/s.trainCount)}
function buildRoutingAdj(){
 const adj=new Map(CITIES.map(c=>[c.id,[]]));
 for(const s of state.services){
  if(s.trainCount<=0||s.stops.length<2)continue;
  const head=calculateHeadway(s);
  for(let i=0;i<s.stops.length-1;i++){
   const a=s.stops[i],b=s.stops[i+1],travel=serviceSegmentMinutes(a,b);
   adj.get(a).push({to:b,serviceId:s.id,travel,headway:head});
   adj.get(b).push({to:a,serviceId:s.id,travel,headway:head});
  }
 }
 return adj;
}
function shortestRoute(from,to){
 if(from===to)return {time:0,legs:[]};
 const cacheKey=from+'>'+to;if(!networkDirty&&routeCache.has(cacheKey))return routeCache.get(cacheKey);
 const adj=buildRoutingAdj(),pq=[{city:from,line:-1,cost:0,legs:[]}],best=new Map();
 let answer=null;
 while(pq.length){
  pq.sort((a,b)=>a.cost-b.cost);const cur=pq.shift(),bk=cur.city+'@'+cur.line;
  if(best.has(bk)&&best.get(bk)<=cur.cost)continue;best.set(bk,cur.cost);
  if(cur.city===to){answer={time:cur.cost,legs:cur.legs};break}
  for(const e of adj.get(cur.city)||[]){
   const switching=cur.line!==-1&&cur.line!==e.serviceId;
   const wait=cur.line===e.serviceId?0:e.headway/2;
   const add=e.travel+wait+(switching?TRANSFER_PENALTY:0);
   const legs=cur.legs.concat([{from:cur.city,to:e.to,serviceId:e.serviceId}]);
   pq.push({city:e.to,line:e.serviceId,cost:cur.cost+add,legs});
  }
 }
 routeCache.set(cacheKey,answer);return answer;
}
function warmRouteCache(){
 routeCache.clear();
 for(const a of CITIES)for(const b of CITIES)if(a.id!==b.id)shortestRoute(a.id,b.id);
 networkDirty=false;
}
function nextLegFor(origin,dest){
 if(networkDirty)warmRouteCache();
 const r=shortestRoute(origin,dest);return r&&r.legs.length?r.legs[0]:null;
}
function nextServiceFor(origin,dest){const leg=nextLegFor(origin,dest);return leg?leg.serviceId:null}
function nextStopForTrain(t,s){
 let dir=t.dir,ni=t.stopIndex+dir;
 if(ni<0||ni>=s.stops.length){dir*=-1;ni=t.stopIndex+dir}
 return s.stops[ni]||null;
}
function calcAccessibility(){
 if(networkDirty)warmRouteCache();
 let ok=0,total=0;
 for(const a of CITIES)for(const b of CITIES)if(a.id!==b.id){total++;if(shortestRoute(a.id,b.id))ok++}
 return total?ok/total*100:0;
}

function addQueue(origin,dest,count,age=0){
 if(origin===dest||count<=0)return;
 const q=state.queues.get(origin);const g=q.get(dest)||{dest,count:0,age:0};const old=g.count;
 g.count+=count;g.age=(old*g.age+count*age)/Math.max(1,g.count);q.set(dest,g);
}
function pickWeighted(items,weightFn){
 let total=0;for(const x of items)total+=Math.max(0,weightFn(x));
 let r=Math.random()*total;for(const x of items){r-=Math.max(0,weightFn(x));if(r<=0)return x}return items[items.length-1];
}
function demandAttraction(c,timeHour){
 let a=c.pop*.55+c.jobs*.55+c.industry*.28+c.tourism*.25+c.education*.22+c.hub*.2;
 if(timeHour>=6&&timeHour<10)a+=c.jobs*.9+c.education*.45;
 if(timeHour>=17&&timeHour<21)a+=c.pop*.6+c.tourism*.35;
 if(timeHour>=10&&timeHour<17)a+=c.tourism*.25;
 return a;
}
function spawnDemand(){
 const hour=(state.gameMin/60)%24;
 const origin=pickWeighted(CITIES,c=>c.pop*.8+c.jobs*.15);
 const pool=CITIES.filter(c=>c.id!==origin.id);
 const dest=pickWeighted(pool,c=>{
  const d=dist(origin,c),distanceFactor=.55+Math.min(1.4,d/260);
  return demandAttraction(c,hour)*distanceFactor;
 });
 const monthFactor=1+(state.month-1)*.08;
 const count=Math.max(1,Math.round((1+Math.random()*2.2)*monthFactor));
 addQueue(origin.id,dest.id,count,0);
}
function ageQueues(gameDelta){
 for(const q of state.queues.values())for(const g of q.values())g.age+=gameDelta;
}

function spawnTrainForService(s,first){
 if(s.stops.length<2)return;
 const count=Math.max(1,s.trainCount);
 const idx=state.trains.filter(t=>t.serviceId===s.id).length;
 const frac=first?0:(idx/count);
 state.trains.push({id:'t'+Date.now()+Math.random(),serviceId:s.id,stopIndex:0,nextIndex:1,dir:1,phase:'travel',progress:frac,onboard:[],dwell:0});
}
function resetTrainsForService(serviceId){
 const s=serviceById(serviceId);
 const old=state.trains.filter(t=>t.serviceId===serviceId);
 for(const t of old){
  const stop=s&&s.stops.length?city(s.stops[Math.min(t.stopIndex,s.stops.length-1)]):null;
  if(stop)for(const g of t.onboard)addQueue(stop.id,g.dest,g.count,g.age);
 }
 state.trains=state.trains.filter(t=>t.serviceId!==serviceId);
 if(!s||s.stops.length<2||s.trainCount<=0)return;
 for(let i=0;i<s.trainCount;i++){
  const t={id:'t'+serviceId+'_'+i+'_'+Date.now(),serviceId,stopIndex:0,nextIndex:1,dir:1,phase:'travel',progress:i/Math.max(1,s.trainCount),onboard:[],dwell:0};
  state.trains.push(t);
 }
}
function serviceContainsAdjacent(s,a,b){
 for(let i=0;i<s.stops.length-1;i++)if((s.stops[i]===a&&s.stops[i+1]===b)||(s.stops[i]===b&&s.stops[i+1]===a))return true;
 return false;
}
function handleTrainAtStation(t,s,stopId){
 const cityObj=city(stopId),nextStop=nextStopForTrain(t,s);
 const kept=[];
 for(const g of t.onboard){
  if(g.dest===stopId){
   deliverPassengers(s,g.count,g.origin,g.dest);
  }else{
   const leg=nextLegFor(stopId,g.dest);
   if(leg&&leg.serviceId===s.id&&leg.to===nextStop)kept.push(g);else addQueue(stopId,g.dest,g.count,g.age);
  }
 }
 t.onboard=kept;
 let space=TRAIN_CAPACITY-t.onboard.reduce((n,g)=>n+g.count,0);
 if(space<=0)return;
 const q=state.queues.get(stopId);
 const entries=[...q.values()].sort((a,b)=>b.age-a.age);
 for(const g of entries){
  if(space<=0)break;
  const leg=nextLegFor(stopId,g.dest);
  if(!leg||leg.serviceId!==s.id||leg.to!==nextStop)continue;
  const take=Math.min(space,g.count);if(take<=0)continue;
  t.onboard.push({origin:stopId,dest:g.dest,count:take,age:g.age});g.count-=take;space-=take;s.boardedMonth+=take;
  if(g.count<=0)q.delete(g.dest);
 }
 if(cityObj&&crowding(cityObj)>1)showNotice(cityObj.name+'역이 매우 혼잡해요. 열차 증편이나 우회 노선을 검토하세요.',1100);
}
function deliverPassengers(s,count,origin,dest){
 const a=city(origin),b=city(dest),d=a&&b?dist(a,b):120;
 const fare=count*(.025+Math.min(.07,d/5000));
 state.delivered+=count;state.deliveredMonth+=count;state.incomeMonth+=fare;state.cash+=fare;s.revenueMonth+=fare;s.deliveredMonth+=count;
}
function updateTrains(gameDelta){
 for(const t of state.trains){
  const s=serviceById(t.serviceId);if(!s||s.stops.length<2)continue;
  if(t.phase==='dwell'){
   t.dwell-=gameDelta;if(t.dwell<=0){
    let ni=t.stopIndex+t.dir;if(ni<0||ni>=s.stops.length){t.dir*=-1;ni=t.stopIndex+t.dir}
    t.nextIndex=ni;t.progress=0;t.phase='travel';
   }
   continue;
  }
  const aId=s.stops[t.stopIndex],bId=s.stops[t.nextIndex],minutes=serviceSegmentMinutes(aId,bId);
  t.progress+=gameDelta/Math.max(1,minutes);
  if(t.progress>=1){
   t.stopIndex=t.nextIndex;t.progress=0;t.phase='dwell';t.dwell=6;
   handleTrainAtStation(t,s,s.stops[t.stopIndex]);
  }
 }
}
function trainPos(t){
 const s=serviceById(t.serviceId);if(!s||s.stops.length<2)return null;
 const a=city(s.stops[t.stopIndex]),b=city(s.stops[t.nextIndex]);if(!a||!b)return null;
 const p=t.phase==='travel'?clamp(t.progress,0,1):0;
 return {x:lerp(a.x,b.x,p),y:lerp(a.y,b.y,p),a,b,s};
}

function averageWait(){
 let n=0,sum=0;for(const q of state.queues.values())for(const g of q.values()){n+=g.count;sum+=g.count*g.age}
 return n?sum/n:0;
}
function operatingCost(){
 const activeTracks=state.tracks.size,trainCount=state.trains.length,activeServices=state.services.filter(s=>s.stops.length>=2&&s.trainCount>0).length;
 return activeTracks*.22+trainCount*.7+activeServices*.45+state.debt*.02;
}
function openMonthReport(){
 if(state.reportOpen||state.gameOver)return;
 state.reportOpen=true;state.paused=true;
 const op=operatingCost();state.lastOperatingCost=op;state.cash-=op;
 if(state.cash<0&&state.debt<MAX_DEBT){
  const loan=Math.min(50,MAX_DEBT-state.debt);state.debt+=loan;state.cash+=loan;showNotice('월말 운영자금 '+loan+'억을 대출했어요.',1500);
 }
 if(state.cash<-20&&state.debt>=MAX_DEBT){gameOver('대출 한도에 도달해 월 운영비를 감당할 수 없습니다.');return}
 const profit=state.incomeMonth-op;state.lastMonthProfit=profit;
 ui.reportTitle.textContent=state.month+'개월차 결산';
 ui.reportDelivered.textContent=state.deliveredMonth+'명';ui.reportProfit.textContent=money(profit);
 ui.reportAccess.textContent=Math.round(calcAccessibility())+'%';ui.reportWait.textContent=Math.round(averageWait())+'분';
 ui.reportChoices.innerHTML='';
 const choices=[
  {icon:'🚆',title:'열차 지원',desc:'예비 열차 2대를 받습니다.',apply:()=>{state.spareTrains+=2}},
  {icon:'💰',title:'운영 보조금',desc:'현금 30억을 지원받습니다.',apply:()=>{state.cash+=30}},
  {icon:'🗺',title:'노선권 확대',desc:state.unlockedLines<LINE_DEFS.length?'새 운행 노선 1개를 개방합니다.':'노선권이 모두 열렸습니다. 대신 20억을 받습니다.',apply:()=>{if(state.unlockedLines<LINE_DEFS.length)state.unlockedLines++;else state.cash+=20}}
 ];
 choices.forEach(ch=>{
  const b=document.createElement('button');b.className='upgradeCard';b.type='button';
  b.innerHTML='<span class="upIcon">'+ch.icon+'</span><b>'+ch.title+'</b><p>'+ch.desc+'</p>';
  b.addEventListener('click',()=>{ch.apply();finishMonthReport();play('confirm')});ui.reportChoices.appendChild(b);
 });
 ui.report.classList.remove('hidden');updateHud();
}
function finishMonthReport(){
 ui.report.classList.add('hidden');state.reportOpen=false;state.month++;state.nextReportDay+=REPORT_DAYS;state.deliveredMonth=0;state.incomeMonth=0;
 for(const s of state.services){s.revenueMonth=0;s.deliveredMonth=0;s.boardedMonth=0}
 state.paused=false;updateToolbar();updatePanels();updateHud();showNotice(state.month+'개월차 운영을 시작합니다.',1300);
 if(state.cash<-20&&state.debt>=MAX_DEBT)gameOver('대출 한도에 도달한 상태에서 운영 적자가 계속되었습니다.');
}
function gameOver(reason){
 if(state.gameOver)return;state.gameOver=true;state.paused=true;state.running=false;play('fail');
 const access=calcAccessibility();save.bestDelivered=Math.max(save.bestDelivered||0,state.delivered);
 save.bestAccess=Math.max(save.bestAccess||0,access);save.bestMonths=Math.max(save.bestMonths||0,state.month);persist();refreshBest();
 ui.resultReason.textContent=reason;ui.resultDelivered.textContent=state.delivered+'명';ui.resultTime.textContent=state.month+'개월';ui.resultAccess.textContent=Math.round(access)+'%';
 ui.result.classList.remove('hidden');
}

function update(dt){
 const real=dt*state.speed,gameDelta=real*GAME_MIN_PER_SEC;
 state.gameMin+=gameDelta;ageQueues(gameDelta);updateTrains(gameDelta);
 state.spawnCarry+=real*(1.05+(state.month-1)*.08);
 while(state.spawnCarry>=1){state.spawnCarry-=1;spawnDemand()}
 const total=state.gameMin;
 state.day=Math.floor((total-360)/1440)+1;
 if(state.day>=state.nextReportDay&&!state.reportOpen)openMonthReport();
 panelRefresh+=dt;
 if(panelRefresh>=.8){panelRefresh=0;updatePanels(true)}else updatePanels(false);
 updateHud();
}

function updateHud(){
 const mins=((state.gameMin%1440)+1440)%1440,h=Math.floor(mins/60),m=Math.floor(mins%60);
 ui.date.textContent=state.day+'일차 '+String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');
 ui.cash.textContent=money(state.cash);ui.delivered.textContent=state.delivered+'명';ui.wait.textContent=Math.round(averageWait())+'분';
 ui.access.textContent=Math.round(calcAccessibility())+'%';ui.monthProfit.textContent=money(state.lastMonthProfit);
 ui.income.textContent=money(state.incomeMonth);ui.expense.textContent=money(operatingCost());ui.debt.textContent=money(state.debt);ui.trainStock.textContent=state.spareTrains;
}
function updateToolbar(){
 ui.trackTool.classList.toggle('active',mode==='track');
 ui.trimTool.classList.toggle('ready',pendingTrim);
 ui.lineTools.innerHTML='';
 state.services.forEach((s,i)=>{
  const b=document.createElement('button');b.type='button';b.className='tool lineTool'+(mode==='line'&&selectedLine===i&&!pendingTrim?' active':'')+(i>=state.unlockedLines?' locked':'');
  b.style.setProperty('--line',s.color);b.disabled=i>=state.unlockedLines;
  b.innerHTML='<span>●</span><b>'+s.name+'</b><small>'+(s.stops.length>=2?(s.trainCount+'대 · '+Math.round(calculateHeadway(s))+'분'):'미운행')+'</small>';
  b.addEventListener('click',()=>{mode='line';selectedLine=i;pendingTrim=false;selectedServiceId=i;selectedCityId=null;play('click');updateToolbar();updatePanels();showNotice(s.name+' 선택 · 건설된 선로 위를 드래그하세요.',1000)});
  ui.lineTools.appendChild(b);
 });
 ui.trainStock.textContent=state.spareTrains;
}
function updatePanels(rebuildList=true){
 if(rebuildList){
  ui.serviceList.innerHTML='';
  state.services.filter((s,i)=>i<state.unlockedLines&&s.stops.length>=2).forEach(s=>{
   const card=document.createElement('button');card.type='button';card.className='serviceCard'+(selectedServiceId===s.id?' active':'');card.style.setProperty('--line',s.color);
   const load=serviceLoad(s),profit=s.revenueMonth-operatingShare(s);
   card.innerHTML='<div class="serviceTop"><span>'+s.name+'</span><span class="profit '+(profit>=0?'pos':'neg')+'">'+money(profit)+'</span></div>'+
    '<div class="serviceMeta"><span>🚆 '+s.trainCount+'대</span><span>배차 '+Math.round(calculateHeadway(s))+'분</span><span>이용 '+Math.round(load)+'%</span></div>'+
    '<div class="serviceStopsMini">'+s.stops.map(id=>city(id).name).join(' · ')+'</div>';
   card.addEventListener('click',()=>{selectedServiceId=s.id;selectedLine=s.id;selectedCityId=null;mode='line';pendingTrim=false;updateToolbar();updatePanels();play('click')});ui.serviceList.appendChild(card);
  });
  if(!ui.serviceList.children.length){const d=document.createElement('div');d.className='detailEmpty';d.textContent='아직 운행 중인 노선이 없습니다.';ui.serviceList.appendChild(d)}
 }
 ui.detailEmpty.classList.toggle('hidden',selectedCityId!==null||selectedServiceId!==null);
 ui.cityDetail.classList.toggle('hidden',selectedCityId===null);
 ui.serviceDetail.classList.toggle('hidden',selectedServiceId===null||selectedCityId!==null);
 if(selectedCityId!==null){
  const c=city(selectedCityId),q=state.queues.get(c.id),entries=[...q.values()].sort((a,b)=>b.count-a.count);
  ui.cityName.textContent=c.name;ui.cityPop.textContent=c.pop;ui.cityJobs.textContent=c.jobs;ui.cityIndustry.textContent=c.industry;ui.cityTourism.textContent=c.tourism;
  ui.cityWaiting.textContent=totalWaiting(c.id)+'명';ui.cityCrowding.textContent=Math.round(crowding(c)*100)+'%';
  ui.cityTopDest.textContent=entries.slice(0,3).map(g=>city(g.dest).name+' '+g.count).join(' · ')||'-';
  const sv=state.services.filter(s=>s.stops.includes(c.id)&&s.stops.length>=2).map(s=>s.name);ui.cityServices.textContent=sv.join(' · ')||'없음';
 }
 if(selectedServiceId!==null&&selectedCityId===null){
  const s=serviceById(selectedServiceId);if(s){
   ui.serviceName.textContent=s.name;ui.serviceStops.textContent=s.stops.map(id=>city(id).name).join(' → ')||'-';
   ui.serviceTrains.textContent=s.trainCount+'대';ui.serviceHeadway.textContent=s.trainCount?Math.round(calculateHeadway(s))+'분':'-';
   ui.serviceLoad.textContent=Math.round(serviceLoad(s))+'%';ui.serviceProfit.textContent=money(s.revenueMonth-operatingShare(s));
  }
 }
}
function operatingShare(s){return s.trainCount*.7+(s.stops.length>1?(s.stops.length-1)*.12:0)+.45}
function serviceLoad(s){
 if(!s.trainCount)return 0;
 const capacity=s.trainCount*TRAIN_CAPACITY;
 const onboard=state.trains.filter(t=>t.serviceId===s.id).reduce((n,t)=>n+t.onboard.reduce((m,g)=>m+g.count,0),0);
 return clamp(onboard/Math.max(1,capacity)*100,0,140);
}

const KOREA_SHAPE=[
 [370,88],[430,80],[495,92],[555,115],[610,150],[655,205],[700,270],[690,335],[720,395],[700,460],[675,520],[650,600],
 [600,635],[540,620],[500,585],[455,570],[405,585],[355,565],[315,525],[320,470],[350,430],[365,385],[350,335],[365,280],[340,225],[350,170]
];
function drawBackground(){
 ctx.fillStyle='#07110e';ctx.fillRect(0,0,W,H);
 ctx.save();ctx.beginPath();ctx.moveTo(KOREA_SHAPE[0][0],KOREA_SHAPE[0][1]);for(let i=1;i<KOREA_SHAPE.length;i++)ctx.lineTo(KOREA_SHAPE[i][0],KOREA_SHAPE[i][1]);ctx.closePath();
 ctx.fillStyle='#102219';ctx.fill();ctx.strokeStyle='rgba(150,205,173,.16)';ctx.lineWidth=2;ctx.stroke();ctx.clip();
 ctx.strokeStyle='rgba(144,180,157,.065)';ctx.lineWidth=1;
 [[360,250,690,280],[350,365,705,390],[365,475,680,500],[500,100,470,600],[575,120,550,610]].forEach(l=>{ctx.beginPath();ctx.moveTo(l[0],l[1]);ctx.lineTo(l[2],l[3]);ctx.stroke()});
 ctx.strokeStyle='rgba(128,176,145,.13)';ctx.lineWidth=4;ctx.setLineDash([6,10]);
 ctx.beginPath();ctx.moveTo(575,135);ctx.lineTo(610,235);ctx.lineTo(620,340);ctx.lineTo(635,445);ctx.stroke();ctx.setLineDash([]);
 ctx.fillStyle='rgba(185,205,190,.08)';ctx.font='800 18px system-ui';ctx.fillText('태백산맥',615,300);
 ctx.restore();
 ctx.fillStyle='rgba(132,166,146,.12)';ctx.font='800 12px system-ui';ctx.fillText('서해',260,360);ctx.fillText('동해',750,330);ctx.fillText('남해',520,675);
}
function drawTracks(){
 for(const c of CORRIDORS){
  const k=keyPair(c.a,c.b);if(!state.tracks.has(k))continue;
  const a=city(c.a),b=city(c.b);ctx.lineCap='round';
  ctx.strokeStyle='rgba(4,9,7,.95)';ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  ctx.strokeStyle='rgba(178,198,186,.45)';ctx.lineWidth=3;ctx.setLineDash([7,6]);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.setLineDash([]);
 }
}
function segmentServiceCount(a,b){return state.services.filter(s=>s.stops.length>=2&&serviceContainsAdjacent(s,a,b)).length}
function serviceOffset(s,a,b){
 const list=state.services.filter(x=>x.stops.length>=2&&serviceContainsAdjacent(x,a,b));const idx=list.findIndex(x=>x.id===s.id);return (idx-(list.length-1)/2)*5;
}
function drawServices(){
 for(const s of state.services){
  if(s.stops.length<2)continue;
  ctx.strokeStyle=s.color;ctx.lineWidth=5;ctx.lineCap='round';ctx.lineJoin='round';
  for(let i=0;i<s.stops.length-1;i++){
   const a=city(s.stops[i]),b=city(s.stops[i+1]),off=serviceOffset(s,a.id,b.id),dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;
   ctx.beginPath();ctx.moveTo(a.x+nx*off,a.y+ny*off);ctx.lineTo(b.x+nx*off,b.y+ny*off);ctx.stroke();
  }
 }
}
function drawDemandLayer(){
 if(ui.layer.textContent!=='수요')return;
 const flows=[];
 for(const c of CITIES){for(const g of state.queues.get(c.id).values())if(g.count>1)flows.push({from:c,to:city(g.dest),count:g.count})}
 flows.sort((a,b)=>b.count-a.count);
 for(const f of flows.slice(0,14)){
  ctx.strokeStyle='rgba(255,205,112,'+clamp(.12+f.count*.018,.16,.55)+')';ctx.lineWidth=clamp(1+f.count*.15,1.5,8);ctx.beginPath();ctx.moveTo(f.from.x,f.from.y);ctx.lineTo(f.to.x,f.to.y);ctx.stroke();
 }
}
function drawCities(){
 for(const c of CITIES){
  const q=totalWaiting(c.id),cr=crowding(c),served=state.services.some(s=>s.stops.includes(c.id)&&s.trainCount>0),tracked=[...state.tracks].some(k=>k.split('|').includes(c.id));
  if(ui.layer.textContent==='혼잡'&&cr>.15){ctx.beginPath();ctx.arc(c.x,c.y,18+cr*16,0,Math.PI*2);ctx.fillStyle=cr>.9?'rgba(255,100,90,.28)':'rgba(242,196,111,.18)';ctx.fill()}
  ctx.beginPath();ctx.arc(c.x,c.y,served?8:tracked?7:5,0,Math.PI*2);ctx.fillStyle=served?'#eef7f0':tracked?'#9fb4a8':'#60756a';ctx.fill();
  ctx.strokeStyle=served?'#15251d':'rgba(255,255,255,.2)';ctx.lineWidth=2;ctx.stroke();
  ctx.font='850 13px system-ui';ctx.textAlign='center';ctx.fillStyle=selectedCityId===c.id?'#baffd3':'#d8e7de';ctx.fillText(c.name,c.x,c.y-13);
  if(q>0){ctx.beginPath();ctx.arc(c.x+13,c.y+10,9,0,Math.PI*2);ctx.fillStyle=cr>.9?'#ff7f73':'#223d30';ctx.fill();ctx.fillStyle='#fff';ctx.font='900 9px system-ui';ctx.fillText(q>99?'99+':String(q),c.x+13,c.y+13)}
 }
}
function drawTrains(){
 for(const t of state.trains){const p=trainPos(t);if(!p)continue;ctx.save();ctx.translate(p.x,p.y);const ang=Math.atan2(p.b.y-p.a.y,p.b.x-p.a.x);ctx.rotate(ang);ctx.fillStyle=p.s.color;roundRect(-11,-6,22,12,3);ctx.fill();ctx.fillStyle='#f8fff9';ctx.fillRect(-6,-3,4,4);ctx.fillRect(2,-3,4,4);ctx.restore()}
}
function drawPreview(){
 if(!drag)return;const a=drag.from,b=pointer,target=nearestCity(b);if(!a)return;
 let color='#d8eee0',ok=true;
 if(target&&target.id!==a.id){
  if(mode==='track'){const cor=corridorByCities(a.id,target.id);ok=!!cor&&!state.tracks.has(keyPair(a.id,target.id));color=ok?'#d8eee0':'#ff8176'}
  else{const s=serviceById(selectedLine),check=canExtendService(s,a.id,target.id);ok=check.ok;color=ok?s.color:'#ff8176'}
 }
 ctx.save();ctx.setLineDash([10,8]);ctx.strokeStyle=color;ctx.globalAlpha=.8;ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(target?target.x:b.x,target?target.y:b.y);ctx.stroke();ctx.restore();
}
function drawFinanceLayer(){
 if(ui.layer.textContent!=='재정')return;
 for(const s of state.services){
  if(s.stops.length<2)continue;const p=s.revenueMonth-operatingShare(s),mid=city(s.stops[Math.floor(s.stops.length/2)]);
  ctx.fillStyle=p>=0?'rgba(121,239,166,.86)':'rgba(255,127,115,.86)';ctx.font='900 11px system-ui';ctx.textAlign='center';ctx.fillText((p>=0?'+':'')+money(p),mid.x,mid.y+28);
 }
}
function render(){
 ctx.setTransform(dpr*scale,0,0,dpr*scale,dpr*offX,dpr*offY);drawBackground();drawDemandLayer();drawTracks();drawServices();drawTrains();drawCities();drawFinanceLayer();drawPreview();ctx.setTransform(1,0,0,1,0,0);
}
function roundRect(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
function nearestCity(p){let best=null,bd=23;for(const c of CITIES){const d=dist(p,c);if(d<bd){best=c;bd=d}}return best}

canvas.addEventListener('pointerdown',ev=>{
 if(!state.running||state.paused||state.gameOver)return;const p=worldPoint(ev),c=nearestCity(p);pointer=p;if(!c)return;
 if(pendingTrim){trimServiceAt(c.id);return}
 drag={from:c,start:p};canvas.setPointerCapture?.(ev.pointerId);
});
canvas.addEventListener('pointermove',ev=>{pointer=worldPoint(ev)});
canvas.addEventListener('pointerup',ev=>{
 if(!drag)return;const p=worldPoint(ev),to=nearestCity(p),from=drag.from;drag=null;
 if(!to||to.id===from.id){selectCity(from.id);return}
 if(mode==='track')buildTrack(from.id,to.id);else addServiceSegment(from.id,to.id);
 updatePanels();updateHud();
});
canvas.addEventListener('pointercancel',()=>{drag=null});
function selectCity(id){selectedCityId=id;selectedServiceId=null;updatePanels();play('click')}

ui.trackTool.addEventListener('click',()=>{mode='track';pendingTrim=false;selectedServiceId=null;updateToolbar();showNotice('선로 건설 · 인접 도시 사이를 드래그하세요.');play('click')});
ui.trainTool.addEventListener('click',()=>addTrainToSelected());
ui.trimTool.addEventListener('click',()=>{pendingTrim=!pendingTrim;mode='line';updateToolbar();showNotice(pendingTrim?'선택한 노선의 맨 끝 도시를 누르세요.':'노선 줄이기를 취소했어요.');play('click')});
ui.pause.addEventListener('click',()=>{if(!state.running||state.reportOpen||state.gameOver)return;state.paused=!state.paused;ui.pause.textContent=state.paused?'▶':'⏸';play('click')});
ui.speed.addEventListener('click',()=>{if(!state.running)return;state.speed=state.speed===1?2:state.speed===2?4:1;ui.speed.textContent='×'+state.speed;showNotice(state.speed+'배속');play('click')});
ui.layer.addEventListener('click',()=>{const layers=['기본','수요','혼잡','재정'],i=layers.indexOf(ui.layer.textContent);ui.layer.textContent=layers[(i+1)%layers.length];play('click')});
ui.sound.addEventListener('click',()=>{soundOn=!soundOn;ui.sound.textContent=soundOn?'🔊':'🔇';if(soundOn)play('click')});
ui.helpBtn.addEventListener('click',()=>{ui.help.classList.remove('hidden');if(state.running)state.paused=true;play('click')});
ui.closeHelp.addEventListener('click',()=>{ui.help.classList.add('hidden');if(state.running&&!state.reportOpen&&!state.gameOver)state.paused=false;play('click')});
ui.start.addEventListener('click',()=>{play('confirm');resetState(!save.tutorialSeen)});
ui.tutorial.addEventListener('click',()=>{play('confirm');resetState(true)});
ui.retry.addEventListener('click',()=>{play('confirm');resetState(false)});
ui.menuBtn.addEventListener('click',()=>{ui.result.classList.add('hidden');ui.menu.classList.remove('hidden');state.running=false;play('click')});

document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.running&&!state.gameOver){state.paused=true;ui.pause.textContent='▶'}});
addEventListener('keydown',ev=>{
 if(ev.code==='Space'&&state.running&&!state.reportOpen){ev.preventDefault();ui.pause.click()}
 if(/^Digit[1-5]$/.test(ev.code)){const i=Number(ev.code.slice(-1))-1;if(i<state.unlockedLines){mode='line';selectedLine=i;selectedServiceId=i;selectedCityId=null;pendingTrim=false;updateToolbar();updatePanels();play('click')}}
});

function loop(now){
 requestAnimationFrame(loop);const raw=Math.min(.05,Math.max(0,(now-last)/1000));last=now;
 if(state.running&&!state.paused&&!state.gameOver&&!state.reportOpen)update(raw);
 render();
}
requestAnimationFrame(loop);
loadSave();updateToolbar();updatePanels();updateHud();render();

})();
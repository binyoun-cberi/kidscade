(()=>{
'use strict';

const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d',{alpha:false});
const W=1000,H=650,DPR_CAP=1.75,GAME_MIN_PER_SEC=8,REPORT_DAYS=5;
const $=id=>document.getElementById(id);

const CITIES=[
  {id:'incheon',name:'인천',x:390,y:145,pop:8,jobs:8,industry:8,tourism:5,education:5},
  {id:'seoul',name:'서울',x:455,y:125,pop:10,jobs:10,industry:7,tourism:9,education:9},
  {id:'suwon',name:'수원',x:465,y:190,pop:8,jobs:8,industry:8,tourism:3,education:6},
  {id:'chuncheon',name:'춘천',x:560,y:120,pop:4,jobs:4,industry:3,tourism:7,education:5},
  {id:'wonju',name:'원주',x:575,y:190,pop:5,jobs:5,industry:5,tourism:4,education:4},
  {id:'gangneung',name:'강릉',x:680,y:175,pop:4,jobs:3,industry:2,tourism:9,education:3},
  {id:'cheonan',name:'천안',x:470,y:250,pop:6,jobs:6,industry:7,tourism:3,education:6},
  {id:'cheongju',name:'청주',x:540,y:255,pop:6,jobs:6,industry:7,tourism:3,education:6},
  {id:'chungju',name:'충주',x:595,y:235,pop:4,jobs:4,industry:5,tourism:5,education:3},
  {id:'daejeon',name:'대전',x:515,y:315,pop:7,jobs:8,industry:5,tourism:3,education:8},
  {id:'jeonju',name:'전주',x:445,y:370,pop:5,jobs:5,industry:4,tourism:8,education:6},
  {id:'gumi',name:'구미',x:600,y:345,pop:4,jobs:5,industry:9,tourism:2,education:3},
  {id:'daegu',name:'대구',x:645,y:390,pop:8,jobs:8,industry:7,tourism:6,education:7},
  {id:'pohang',name:'포항',x:715,y:365,pop:5,jobs:5,industry:9,tourism:5,education:4},
  {id:'gwangju',name:'광주',x:405,y:455,pop:7,jobs:7,industry:5,tourism:6,education:7},
  {id:'mokpo',name:'목포',x:345,y:505,pop:4,jobs:3,industry:4,tourism:7,education:3},
  {id:'suncheon',name:'순천',x:480,y:505,pop:4,jobs:4,industry:4,tourism:8,education:3},
  {id:'yeosu',name:'여수',x:485,y:565,pop:4,jobs:4,industry:7,tourism:9,education:2},
  {id:'jinju',name:'진주',x:555,y:495,pop:4,jobs:4,industry:4,tourism:4,education:6},
  {id:'changwon',name:'창원',x:625,y:505,pop:6,jobs:6,industry:9,tourism:4,education:4},
  {id:'ulsan',name:'울산',x:705,y:450,pop:6,jobs:6,industry:10,tourism:3,education:3},
  {id:'busan',name:'부산',x:690,y:525,pop:9,jobs:9,industry:9,tourism:9,education:6}
].map(c=>({...c,waiting:{},unhappy:0,pulse:0}));

const CORRIDOR_DEFS=[
  ['incheon','seoul',28,'urban'],['seoul','suwon',32,'urban'],['seoul','chuncheon',75,'hill'],['seoul','wonju',88,'hill'],
  ['suwon','cheonan',62,'plain'],['chuncheon','wonju',82,'mountain'],['wonju','gangneung',115,'mountain'],['wonju','chungju',70,'hill'],
  ['cheonan','cheongju',42,'plain'],['cheonan','daejeon',68,'plain'],['cheongju','chungju',58,'hill'],['cheongju','daejeon',45,'plain'],
  ['chungju','gumi',105,'mountain'],['daejeon','jeonju',65,'hill'],['daejeon','gumi',95,'hill'],['jeonju','gwangju',90,'plain'],
  ['jeonju','suncheon',120,'hill'],['gwangju','mokpo',80,'plain'],['gwangju','suncheon',92,'plain'],['suncheon','yeosu',38,'coast'],
  ['suncheon','jinju',78,'hill'],['jinju','changwon',58,'plain'],['changwon','busan',45,'urban'],['gumi','daegu',40,'plain'],
  ['daegu','pohang',72,'hill'],['daegu','ulsan',78,'hill'],['daegu','busan',105,'hill'],['pohang','ulsan',62,'coast'],['ulsan','busan',55,'urban']
];
const TERRAIN={plain:{m:1,label:'평지'},urban:{m:1.22,label:'도심'},hill:{m:1.35,label:'구릉'},mountain:{m:1.7,label:'산악'},coast:{m:1.28,label:'해안'}};
const CORRIDORS=CORRIDOR_DEFS.map(([a,b,km,terrain])=>({a,b,km,terrain,cost:Math.round(km*.18*TERRAIN[terrain].m)}));
const SERVICES=[
  {id:0,color:'#65d5a1',base:'1번 노선'},
  {id:1,color:'#f0a45d',base:'2번 노선'},
  {id:2,color:'#7bb9ff',base:'3번 노선'},
  {id:3,color:'#d58cf2',base:'4번 노선'},
  {id:4,color:'#f2d067',base:'5번 노선'}
];
const KOREA_OUTLINE=[[405,78],[470,67],[535,77],[598,91],[655,119],[704,154],[727,208],[719,270],[739,329],[729,390],[750,454],[724,525],[684,574],[625,584],[566,565],[515,546],[457,558],[395,543],[343,510],[318,467],[334,414],[359,366],[382,314],[377,260],[367,207],[374,155]];

const ui={
  menu:$('menu'),help:$('help'),report:$('monthReport'),result:$('result'),start:$('startBtn'),tutorial:$('tutorialBtn'),closeHelp:$('closeHelpBtn'),retry:$('retryBtn'),menuBtn:$('menuBtn'),
  pause:$('pauseBtn'),speed:$('speedBtn'),layer:$('layerBtn'),sound:$('soundBtn'),helpBtn:$('helpBtn'),date:$('dateLabel'),cash:$('cashLabel'),delivered:$('deliveredLabel'),wait:$('waitLabel'),access:$('accessLabel'),
  notice:$('notice'),trackTool:$('trackTool'),lineTools:$('lineTools'),trainTool:$('trainTool'),trimTool:$('trimTool'),undo:$('undoBtn'),trainStock:$('trainStock'),best:$('bestText'),serviceList:$('serviceList'),monthProfit:$('monthProfitLabel'),
  detailEmpty:$('detailEmpty'),cityDetail:$('cityDetail'),serviceDetail:$('serviceDetail'),cityName:$('cityName'),cityPop:$('cityPop'),cityJobs:$('cityJobs'),cityIndustry:$('cityIndustry'),cityTourism:$('cityTourism'),cityWaiting:$('cityWaiting'),cityCrowding:$('cityCrowding'),cityTopDest:$('cityTopDest'),cityServices:$('cityServices'),
  serviceName:$('serviceName'),serviceStops:$('serviceStops'),serviceTrains:$('serviceTrains'),serviceHeadway:$('serviceHeadway'),serviceLoad:$('serviceLoad'),serviceProfit:$('serviceProfit'),income:$('incomeLabel'),expense:$('expenseLabel'),debt:$('debtLabel'),
  reportTitle:$('reportTitle'),reportDelivered:$('reportDelivered'),reportProfit:$('reportProfit'),reportAccess:$('reportAccess'),reportWait:$('reportWait'),reportChoices:$('reportChoices'),resultTitle:$('resultTitle'),resultReason:$('resultReason'),resultDelivered:$('resultDelivered'),resultTime:$('resultTime'),resultAccess:$('resultAccess'),
  tutorialBubble:$('tutorialBubble'),tutorialTitle:$('tutorialTitle'),tutorialText:$('tutorialText'),tutorialSkip:$('tutorialSkip')
};

let cssW=innerWidth,cssH=innerHeight,scale=1,offX=0,offY=0,dpr=1,last=performance.now(),noticeTimer=0,soundOn=true;
let pointer={x:0,y:0},drag=null,selectedService=0,mode='track',pendingTrim=false,tutorialStep=0,uiAccumulator=0;
let undoStack=[],routingCache=new Map();
let save={tutorialSeen:false,bestDelivered:0,bestAccess:0,bestDays:0};

const state={
  running:false,paused:false,reportOpen:false,gameOver:false,speed:1,layer:'기본',elapsed:0,delivered:0,lost:0,cash:220,debt:0,spareTrains:3,stationCapacity:70,
  builtTracks:new Set(),services:[],spawnCarry:0,nextReport:REPORT_DAYS*1440,month:1,monthIncome:0,monthExpense:0,constructionSpent:0,networkDirty:true,loanCooldown:0,tutorialMode:false,lastReportDelivered:0
};

const audio={
  click:makePool('../../assets/audio/ui/kenney_interface/click_002.ogg',.24,3),confirm:makePool('../../assets/audio/ui/kenney_interface/confirmation_001.ogg',.30,3),error:makePool('../../assets/audio/ui/kenney_interface/error_002.ogg',.25,2),tick:makePool('../../assets/audio/ui/kenney_interface/tick_001.ogg',.14,3),success:makePool('../../assets/audio/sfx/success/cheer-yay-01.mp3',.18,2),fail:makePool('../../assets/audio/sfx/failure/fail-sting-01.mp3',.25,2)
};
function makePool(src,volume,n){return {i:0,a:Array.from({length:n},()=>{const a=new Audio(src);a.preload='auto';a.volume=volume;return a})}}
function play(name,rate=1){if(!soundOn)return;const p=audio[name];if(!p)return;const a=p.a[p.i++%p.a.length];try{a.pause();a.currentTime=0;a.playbackRate=rate;a.play().catch(()=>{})}catch(_){}}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function lerp(a,b,t){return a+(b-a)*t}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function city(id){return CITIES.find(c=>c.id===id)}
function trackKey(a,b){return a<b?a+'|'+b:b+'|'+a}
function corridor(a,b){return CORRIDORS.find(c=>trackKey(c.a,c.b)===trackKey(a,b))||null}
function formatMoney(v){const n=Math.abs(v)<10?v.toFixed(1):Math.round(v).toString();return (v<0?'−':'')+n.replace('-','')+'억'}
function waitingCount(c){return Object.values(c.waiting).reduce((n,g)=>n+g.count,0)}
function totalWaiting(){return CITIES.reduce((n,c)=>n+waitingCount(c),0)}
function averageWait(){let count=0,age=0;for(const c of CITIES)for(const g of Object.values(c.waiting)){count+=g.count;age+=g.age}return count?age/count:0}
function addWaiting(c,dest,count,age=0){if(count<=0||dest===c.id)return;const g=c.waiting[dest]||(c.waiting[dest]={count:0,age:0});g.count+=count;g.age+=age}
function removeWaiting(c,dest,count){const g=c.waiting[dest];if(!g||count<=0)return 0;const take=Math.min(count,g.count),avg=g.count?g.age/g.count:0;g.count-=take;g.age=Math.max(0,g.age-avg*take);if(g.count<=0)delete c.waiting[dest];return take}
function loadSave(){try{if(window.KidscadeStorage)save=Object.assign(save,window.KidscadeStorage.getJson('metroPlannerSave',save)||{})}catch(_){}refreshBest()}
function persist(){try{window.KidscadeStorage?.setJson('metroPlannerSave',save)}catch(_){}}
function refreshBest(){if(!save.bestDelivered){ui.best.textContent='첫 대한민국 철도망의 기록을 만들어 보세요.';return}ui.best.textContent=`최고 기록 · ${save.bestDelivered}명 수송 · 접근성 ${save.bestAccess}% · ${save.bestDays}일`}

function resize(){cssW=innerWidth;cssH=innerHeight;dpr=Math.min(devicePixelRatio||1,DPR_CAP);canvas.width=Math.max(1,Math.round(cssW*dpr));canvas.height=Math.max(1,Math.round(cssH*dpr));canvas.style.width=cssW+'px';canvas.style.height=cssH+'px';scale=Math.min(cssW/W,cssH/H);offX=(cssW-W*scale)/2;offY=(cssH-H*scale)/2}
function worldPoint(ev){const r=canvas.getBoundingClientRect();return {x:(ev.clientX-r.left-offX)/scale,y:(ev.clientY-r.top-offY)/scale}}
addEventListener('resize',resize,{passive:true});resize();

function newService(def){return {id:def.id,color:def.color,base:def.base,name:def.base,stops:[],trains:[],revenue:0,expense:0,carried:0,peakLoad:0}}
function resetState(tutorial=false){
  Object.assign(state,{running:true,paused:false,reportOpen:false,gameOver:false,speed:1,layer:'기본',elapsed:0,delivered:0,lost:0,cash:220,debt:0,spareTrains:3,stationCapacity:70,builtTracks:new Set(),services:SERVICES.map(newService),spawnCarry:0,nextReport:REPORT_DAYS*1440,month:1,monthIncome:0,monthExpense:0,constructionSpent:0,networkDirty:true,loanCooldown:0,tutorialMode:!!tutorial,lastReportDelivered:0});
  for(const c of CITIES){c.waiting={};c.unhappy=0;c.pulse=0}
  routingCache.clear();undoStack=[];selectedService=0;mode='track';pendingTrim=false;drag=null;tutorialStep=0;
  ui.menu.classList.add('hidden');ui.result.classList.add('hidden');ui.report.classList.add('hidden');ui.help.classList.add('hidden');ui.pause.textContent='⏸';ui.speed.textContent='×1';ui.layer.textContent='기본';
  updateTools();updateAllUI();last=performance.now();
  if(tutorial)startTutorial();else{ui.tutorialBubble.classList.add('hidden');showNotice('🛤 선로 건설: 도시와 도시 사이를 드래그해 첫 철도를 놓아 보세요.',2400)}
}

function snapshot(){return {tracks:[...state.builtTracks],services:state.services.map(s=>({stops:[...s.stops],trainCount:s.trains.length,revenue:s.revenue,expense:s.expense,carried:s.carried})),cash:state.cash,spareTrains:state.spareTrains,constructionSpent:state.constructionSpent}}
function pushUndo(){undoStack.push(snapshot());if(undoStack.length>18)undoStack.shift()}
function restore(s){
  state.builtTracks=new Set(s.tracks);state.cash=s.cash;state.spareTrains=s.spareTrains;state.constructionSpent=s.constructionSpent;
  state.services.forEach((line,i)=>{const src=s.services[i];line.stops=[...src.stops];line.revenue=src.revenue;line.expense=src.expense;line.carried=src.carried;line.trains=[];for(let n=0;n<src.trainCount;n++)line.trains.push(makeTrain(line,n));updateServiceName(line)});
  for(const c of CITIES)c.waiting={};state.networkDirty=true;routingCache.clear();updateTools();updateAllUI();showNotice('이전 철도망 상태로 되돌렸어요.',1200);play('click')
}

function startTutorial(){state.tutorialMode=true;tutorialStep=0;ui.tutorialBubble.classList.remove('hidden');ui.tutorialTitle.textContent='① 선로부터 건설해요';ui.tutorialText.textContent='서울과 수원처럼 가까운 두 도시를 드래그해 선로를 건설하세요. 연한 점선은 건설 가능한 구간입니다.'}
function tutorialTrackDone(){if(!state.tutorialMode||tutorialStep!==0)return;tutorialStep=1;ui.tutorialTitle.textContent='② 이제 운행 노선을 만들어요';ui.tutorialText.textContent='아래의 색 노선 하나를 누른 뒤, 방금 만든 선로의 두 도시를 다시 드래그하세요. 선로와 운행 노선은 서로 다릅니다.'}
function tutorialServiceDone(){if(!state.tutorialMode||tutorialStep!==1)return;tutorialStep=2;ui.tutorialTitle.textContent='③ 열차와 승객을 지켜보세요';ui.tutorialText.textContent='노선에는 열차 1대가 자동 배치됩니다. 열차를 더 넣으면 배차가 짧아지고 승객 대기가 줄어듭니다.';setTimeout(()=>{if(state.tutorialMode&&tutorialStep===2){state.tutorialMode=false;save.tutorialSeen=true;persist();ui.tutorialBubble.classList.add('hidden');showNotice('튜토리얼 완료! 이제 대한민국 철도망을 확장해 보세요.',1800)}},6000)}
ui.tutorialSkip.addEventListener('click',()=>{state.tutorialMode=false;save.tutorialSeen=true;persist();ui.tutorialBubble.classList.add('hidden');play('click')});

function buildTrack(a,b){const cor=corridor(a.id,b.id);if(!cor){play('error');showNotice('이 두 도시는 직접 연결할 수 없어요. 가까운 도시를 거쳐 주세요.');return false}const key=trackKey(a.id,b.id);if(state.builtTracks.has(key)){play('error');showNotice('이미 선로가 건설된 구간이에요.');return false}if(state.cash<cor.cost){play('error');showNotice(`건설비 ${cor.cost}억이 필요해요. 현재 현금이 부족합니다.`);return false}pushUndo();state.builtTracks.add(key);state.cash-=cor.cost;state.constructionSpent+=cor.cost;a.pulse=b.pulse=1;play('confirm');showNotice(`${a.name}–${b.name} 선로 건설 · ${TERRAIN[cor.terrain].label} · ${cor.cost}억`,1500);tutorialTrackDone();updateAllUI();return true}
function canExtendService(a,b,line){if(!state.builtTracks.has(trackKey(a.id,b.id)))return {ok:false,msg:'먼저 두 도시 사이에 선로를 건설하세요.'};if(a.id===b.id)return {ok:false,msg:'같은 도시끼리는 연결할 수 없어요.'};if(line.stops.includes(a.id)&&line.stops.includes(b.id))return {ok:false,msg:'이미 이 노선에 포함된 구간이에요.'};if(!line.stops.length)return state.spareTrains>0?{ok:true}:{ok:false,msg:'새 노선을 시작할 남는 열차가 없어요.'};const first=line.stops[0],last=line.stops[line.stops.length-1];if(a.id!==first&&a.id!==last&&b.id!==first&&b.id!==last)return {ok:false,msg:'운행 노선의 맨 끝 도시에서 이어 주세요.'};const newId=line.stops.includes(a.id)?b.id:a.id;if(line.stops.includes(newId))return {ok:false,msg:'같은 도시를 한 노선에서 두 번 지날 수 없어요.'};return {ok:true}}
function addServiceSegment(a,b){const line=state.services[selectedService],check=canExtendService(a,b,line);if(!check.ok){play('error');showNotice(check.msg);return false}pushUndo();if(!line.stops.length){line.stops=[a.id,b.id];state.spareTrains--;line.trains.push(makeTrain(line,0))}else{const first=line.stops[0],last=line.stops[line.stops.length-1];if(a.id===first)line.stops.unshift(b.id);else if(a.id===last)line.stops.push(b.id);else if(b.id===first)line.stops.unshift(a.id);else if(b.id===last)line.stops.push(a.id);resetServiceTrains(line)}updateServiceName(line);state.networkDirty=true;a.pulse=b.pulse=1;play('confirm',1.05);showNotice(`${line.name} 운행 구간 설정 완료`,1200);tutorialServiceDone();updateTools();updateAllUI();return true}
function updateServiceName(line){if(line.stops.length>=2)line.name=`${city(line.stops[0]).name}-${city(line.stops[line.stops.length-1]).name}선`;else line.name=line.base}
function makeTrain(line,offset=0){return {serviceId:line.id,stopIndex:0,dir:1,phase:'dwell',dwell:2+offset*.5,progress:0,nextIndex:Math.min(1,line.stops.length-1),passengers:{},prepared:false}}
function passengerCount(t){return Object.values(t.passengers).reduce((a,b)=>a+b,0)}
function returnTrainPassengers(line,t){const home=city(line.stops[Math.min(t.stopIndex,line.stops.length-1)]||line.stops[0]);if(home)for(const [dest,count] of Object.entries(t.passengers))addWaiting(home,dest,count);t.passengers={}}
function resetServiceTrains(line){for(const t of line.trains){returnTrainPassengers(line,t);Object.assign(t,{stopIndex:0,dir:1,phase:'dwell',dwell:2,progress:0,nextIndex:Math.min(1,line.stops.length-1),prepared:false})}}
function addTrain(){const line=state.services[selectedService];if(!line||line.stops.length<2){play('error');showNotice('먼저 운행할 노선을 선택하거나 만들어 주세요.');return}if(state.spareTrains<=0){play('error');showNotice('남는 열차가 없어요. 월간 철도 지원에서 열차를 확보하세요.');return}pushUndo();state.spareTrains--;line.trains.push(makeTrain(line,line.trains.length));state.networkDirty=true;play('confirm');showNotice(`${line.name} 열차 추가 · 배차 ${serviceHeadway(line)}분`,1200);updateTools();updateAllUI()}
function trimServiceAt(c){const line=state.services[selectedService];if(!line||line.stops.length<2){play('error');showNotice('줄일 운행 노선이 없어요.');return}if(c.id!==line.stops[0]&&c.id!==line.stops[line.stops.length-1]){play('error');showNotice('선택한 노선의 맨 끝 도시를 눌러 주세요.');return}pushUndo();if(c.id===line.stops[0])line.stops.shift();else line.stops.pop();if(line.stops.length<2){for(const t of line.trains)returnTrainPassengers(line,t);state.spareTrains+=line.trains.length;line.trains=[];line.stops=[]}else resetServiceTrains(line);updateServiceName(line);state.networkDirty=true;pendingTrim=false;updateTools();updateAllUI();play('confirm');showNotice('운행 노선의 끝 구간을 줄였어요.',1100)}

function segmentMinutes(aId,bId){const cor=corridor(aId,bId);return cor?Math.max(6,cor.km/2.3):20}
function serviceCycleMinutes(line){if(line.stops.length<2)return Infinity;let oneWay=0;for(let i=0;i<line.stops.length-1;i++)oneWay+=segmentMinutes(line.stops[i],line.stops[i+1])+2;return Math.max(12,oneWay*2)}
function serviceHeadway(line){if(!line.trains.length||line.stops.length<2)return Infinity;return Math.max(6,Math.round(serviceCycleMinutes(line)/line.trains.length))}
function markNetworkDirty(){state.networkDirty=true}
function prepareRouting(){if(state.networkDirty){routingCache.clear();state.networkDirty=false}}
function servicesAt(cityId){return state.services.filter(s=>s.stops.includes(cityId)&&s.trains.length>0)}
function getRoute(origin,destination){
  if(origin===destination)return {total:0,firstService:null,firstNext:null};prepareRouting();const cacheKey=origin+'>'+destination;if(routingCache.has(cacheKey))return routingCache.get(cacheKey);
  const best=new Map(),prev=new Map(),todo=[];const startKey=origin+'|-1';best.set(startKey,0);todo.push({cityId:origin,lineId:-1,cost:0,key:startKey});let found=null;
  while(todo.length){todo.sort((a,b)=>a.cost-b.cost);const cur=todo.shift();if(cur.cost!==best.get(cur.key))continue;if(cur.cityId===destination&&cur.cityId!==origin){found=cur;break}
    for(const line of servicesAt(cur.cityId)){const idxs=[];line.stops.forEach((id,i)=>{if(id===cur.cityId)idxs.push(i)});for(const i of idxs){for(const ni of [i-1,i+1]){if(ni<0||ni>=line.stops.length)continue;const next=line.stops[ni];const boarding=cur.lineId===line.id?0:serviceHeadway(line)/2+(cur.lineId===-1?0:5);const cost=cur.cost+segmentMinutes(cur.cityId,next)+2+boarding;const key=next+'|'+line.id;if(cost<(best.get(key)??Infinity)){best.set(key,cost);prev.set(key,{prev:cur.key,serviceId:line.id,from:cur.cityId,to:next});todo.push({cityId:next,lineId:line.id,cost,key})}}}}
  }
  if(!found){routingCache.set(cacheKey,null);return null}
  const edges=[];let k=found.key;while(k!==startKey){const p=prev.get(k);if(!p)break;edges.push(p);k=p.prev}edges.reverse();const route={total:found.cost,firstService:edges[0]?.serviceId??null,firstNext:edges[0]?.to??null,transfers:edges.reduce((n,e,i)=>i&&e.serviceId!==edges[i-1].serviceId?n+1:n,0)};routingCache.set(cacheKey,route);return route
}

function normalizedNext(line,t){if(line.stops.length<2)return null;let ni=t.stopIndex+t.dir;if(ni<0||ni>=line.stops.length){t.dir*=-1;ni=t.stopIndex+t.dir}return clamp(ni,0,line.stops.length-1)}
function processStop(line,t){
  if(line.stops.length<2)return;const st=city(line.stops[t.stopIndex]);if(!st)return;const ni=normalizedNext(line,t);if(ni===null)return;const nextId=line.stops[ni];const keep={};
  for(const [dest,count] of Object.entries(t.passengers)){if(dest===st.id){deliverPassengers(line,count);continue}const route=getRoute(st.id,dest);if(route&&route.firstService===line.id&&route.firstNext===nextId)keep[dest]=(keep[dest]||0)+count;else addWaiting(st,dest,count)}t.passengers=keep;
  let capacity=48-passengerCount(t);if(capacity>0){const entries=Object.entries(st.waiting).sort((a,b)=>b[1].age/Math.max(1,b[1].count)-a[1].age/Math.max(1,a[1].count));for(const [dest,g] of entries){if(capacity<=0)break;const route=getRoute(st.id,dest);if(!route||route.firstService!==line.id||route.firstNext!==nextId)continue;const take=removeWaiting(st,dest,Math.min(capacity,g.count));if(take){t.passengers[dest]=(t.passengers[dest]||0)+take;capacity-=take}}}
  line.peakLoad=Math.max(line.peakLoad,Math.round(passengerCount(t)/48*100));t.nextIndex=ni
}
function deliverPassengers(line,count){state.delivered+=count;line.carried+=count;const revenue=count*.085;state.cash+=revenue;state.monthIncome+=revenue;line.revenue+=revenue;if(count>0&&Math.random()<.06)play('tick',1.16)}
function updateTrain(line,t,gameDelta){if(line.stops.length<2)return;t.stopIndex=clamp(t.stopIndex,0,line.stops.length-1);if(t.phase==='dwell'){if(!t.prepared){processStop(line,t);t.prepared=true}t.dwell-=gameDelta;if(t.dwell<=0){t.phase='travel';t.progress=0}return}const aId=line.stops[t.stopIndex],bId=line.stops[t.nextIndex];const mins=segmentMinutes(aId,bId);t.progress+=gameDelta/mins;if(t.progress>=1){t.stopIndex=t.nextIndex;t.progress=0;t.phase='dwell';t.dwell=2;t.prepared=false}}

function clockMinutes(){return (360+state.elapsed)%1440}
function timePhase(){const h=clockMinutes()/60;if(h>=6&&h<9)return 'morning';if(h>=9&&h<16)return 'day';if(h>=16&&h<20)return 'evening';if(h>=20&&h<23)return 'leisure';return 'night'}
function servedCityIds(){const s=new Set();for(const line of state.services)if(line.trains.length)for(const id of line.stops)s.add(id);return [...s]}
function weightedPick(rows){let total=0;for(const r of rows)total+=r.w;if(total<=0)return null;let x=Math.random()*total;for(const r of rows){x-=r.w;if(x<=0)return r.value}return rows[rows.length-1]?.value||null}
function spawnPassengerGroup(){const served=servedCityIds();if(served.length<2)return;const phase=timePhase();const origins=served.map(id=>{const c=city(id);let w=c.pop;if(phase==='evening')w=c.jobs*1.15+c.education*.3;if(phase==='day')w=c.pop*.6+c.jobs*.4;if(phase==='night')w=c.pop*.35;return {value:c,w}});const origin=weightedPick(origins);if(!origin)return;const targets=served.filter(id=>id!==origin.id).map(id=>{const c=city(id),d=Math.max(40,dist(origin,c));let attraction=c.pop*.45+c.jobs*.55;if(phase==='morning')attraction=c.jobs*1.2+c.education*.55;if(phase==='evening')attraction=c.pop*1.25;if(phase==='leisure')attraction=c.tourism*1.35+c.pop*.35;if(phase==='night')attraction=c.pop*.35+c.tourism*.25;return {value:c,w:attraction*(1/(.45+d/260))}});const dest=weightedPick(targets);if(!dest)return;const amount=1+(Math.random()<.32?1:0)+(Math.random()<.08?1:0);addWaiting(origin,dest.id,amount)}
function updateDemand(gameDelta){const served=servedCityIds().length;if(served<2)return;const phase=timePhase();const phaseM={morning:1.35,day:.86,evening:1.45,leisure:1.05,night:.24}[phase];const perHour=Math.max(3,served*2.2)*phaseM;state.spawnCarry+=gameDelta*perHour/60;while(state.spawnCarry>=1){state.spawnCarry--;spawnPassengerGroup()}}
function updateQueues(gameDelta){for(const c of CITIES){for(const g of Object.values(c.waiting))g.age+=gameDelta*g.count;c.pulse=Math.max(0,c.pulse-gameDelta/20);const waiting=waitingCount(c),overflow=Math.max(0,waiting-state.stationCapacity);if(overflow>0&&Math.random()<Math.min(.55,gameDelta/20)){let drop=Math.min(overflow,Math.max(1,Math.ceil(overflow*.08)));const groups=Object.entries(c.waiting).sort((a,b)=>b[1].count-a[1].count);for(const [dest,g] of groups){if(drop<=0)break;const n=removeWaiting(c,dest,Math.min(drop,g.count));drop-=n;state.lost+=n;c.unhappy+=n}}}}
function updateEconomy(gameDelta){let trainCount=0;for(const line of state.services)trainCount+=line.trains.length;const trainCost=trainCount*(1.15/1440)*gameDelta;const trackCost=state.builtTracks.size*(.24/1440)*gameDelta;const interest=state.debt*(.025/(REPORT_DAYS*1440))*gameDelta;const cost=trainCost+trackCost+interest;state.cash-=cost;state.monthExpense+=cost;for(const line of state.services)if(line.trains.length){const c=line.trains.length*(1.15/1440)*gameDelta;line.expense+=c}state.loanCooldown=Math.max(0,state.loanCooldown-gameDelta);if(state.cash<0&&state.debt<120&&state.loanCooldown<=0){state.cash+=30;state.debt+=30;state.loanCooldown=720;showNotice('현금 부족으로 긴급 운영대출 30억이 실행됐어요.',1800);play('error')}if(state.cash<-25&&state.debt>=120)endGame('부채 한도에 도달한 뒤 운영비를 감당하지 못했습니다.')}
function update(gameDelta){state.elapsed+=gameDelta;updateDemand(gameDelta);for(const line of state.services)for(const t of line.trains)updateTrain(line,t,gameDelta);updateQueues(gameDelta);updateEconomy(gameDelta);if(state.gameOver)return;if(state.elapsed>=state.nextReport){state.nextReport+=REPORT_DAYS*1440;openMonthReport()}uiAccumulator+=gameDelta;if(uiAccumulator>2){uiAccumulator=0;updateAllUI()}}

function accessibility(){const adj=new Map(CITIES.map(c=>[c.id,new Set()]));for(const line of state.services)if(line.trains.length)for(let i=0;i<line.stops.length-1;i++){adj.get(line.stops[i]).add(line.stops[i+1]);adj.get(line.stops[i+1]).add(line.stops[i])}const seen=new Set();let connectedPairs=0;for(const c of CITIES){if(seen.has(c.id))continue;const stack=[c.id];seen.add(c.id);let n=0;while(stack.length){const id=stack.pop();n++;for(const nx of adj.get(id))if(!seen.has(nx)){seen.add(nx);stack.push(nx)}}connectedPairs+=n*(n-1)}return Math.round(100*connectedPairs/(CITIES.length*(CITIES.length-1)))}
function serviceLoad(line){if(!line.trains.length)return 0;const live=line.trains.reduce((n,t)=>n+passengerCount(t),0)/(line.trains.length*48)*100;return Math.round(Math.max(live,line.peakLoad*.55))}
function monthProfit(){return state.monthIncome-state.monthExpense}
function updateAllUI(){updateHud();updateTools();updateServiceList();updateDetail()}
function updateHud(){const total=Math.floor(state.elapsed),day=Math.floor(total/1440)+1,clock=clockMinutes(),hh=Math.floor(clock/60),mm=Math.floor(clock%60);ui.date.textContent=`${day}일차 ${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;ui.cash.textContent=formatMoney(state.cash);ui.delivered.textContent=Math.floor(state.delivered)+'명';ui.wait.textContent=Math.round(averageWait())+'분';ui.access.textContent=accessibility()+'%';ui.monthProfit.textContent=(monthProfit()>=0?'+':'')+formatMoney(monthProfit());ui.monthProfit.style.color=monthProfit()<0?'#ff8c83':'#8ff0b4';ui.income.textContent=formatMoney(state.monthIncome);ui.expense.textContent=formatMoney(state.monthExpense);ui.debt.textContent=formatMoney(state.debt);ui.trainStock.textContent=state.spareTrains}
function updateTools(){ui.trackTool.classList.toggle('active',mode==='track');ui.trimTool.classList.toggle('ready',pendingTrim);ui.lineTools.innerHTML='';state.services.forEach((line,i)=>{const b=document.createElement('button');b.type='button';b.className='tool lineTool'+(mode==='service'&&selectedService===i&&!pendingTrim?' active':'');b.style.setProperty('--line',line.color);b.innerHTML=`<span>●</span><b>${line.stops.length?line.name:line.base}</b><small>${line.trains.length?serviceHeadway(line)+'분':'미개통'}</small>`;b.addEventListener('click',()=>selectService(i));ui.lineTools.appendChild(b)})}
function selectService(i){selectedService=i;mode='service';pendingTrim=false;play('click');updateTools();showServiceDetail(state.services[i]);showNotice(`${state.services[i].name} 선택 · 기존 선로 위에서 도시를 드래그하세요.`,1200)}
function updateServiceList(){ui.serviceList.innerHTML='';state.services.forEach((line,i)=>{const b=document.createElement('button');b.type='button';b.className='serviceCard'+(selectedService===i&&mode==='service'?' active':'');b.style.setProperty('--line',line.color);if(line.stops.length<2){b.innerHTML=`<div class="serviceTop"><span>${line.base}</span><span class="profit">미개통</span></div><div class="serviceMeta"><span>선로 위에 노선을 만드세요</span></div>`}else{const p=line.revenue-line.expense;b.innerHTML=`<div class="serviceTop"><span>${line.name}</span><span class="profit ${p<0?'neg':'pos'}">${p>=0?'+':''}${formatMoney(p)}</span></div><div class="serviceMeta"><span>열차 ${line.trains.length}대</span><span>배차 ${serviceHeadway(line)}분</span><span>이용률 ${serviceLoad(line)}%</span></div><div class="serviceStopsMini">${line.stops.map(id=>city(id).name).join(' › ')}</div>`}b.addEventListener('click',()=>{selectedService=i;mode='service';pendingTrim=false;updateTools();showServiceDetail(line);play('click')});ui.serviceList.appendChild(b)})}
function showCityDetail(c){ui.detailEmpty.classList.add('hidden');ui.serviceDetail.classList.add('hidden');ui.cityDetail.classList.remove('hidden');ui.cityName.textContent=c.name;ui.cityPop.textContent=c.pop;ui.cityJobs.textContent=c.jobs;ui.cityIndustry.textContent=c.industry;ui.cityTourism.textContent=c.tourism;const w=waitingCount(c);ui.cityWaiting.textContent=w+'명';ui.cityCrowding.textContent=Math.round(w/state.stationCapacity*100)+'%';const top=Object.entries(c.waiting).sort((a,b)=>b[1].count-a[1].count).slice(0,3).map(([id,g])=>`${city(id).name} ${g.count}`).join(' · ');ui.cityTopDest.textContent=top||'-';const lines=state.services.filter(s=>s.stops.includes(c.id)&&s.stops.length>1).map(s=>s.name);ui.cityServices.textContent=lines.join(' · ')||'없음';ui.cityDetail.dataset.id=c.id;delete ui.serviceDetail.dataset.id}
function showServiceDetail(line){ui.detailEmpty.classList.add('hidden');ui.cityDetail.classList.add('hidden');ui.serviceDetail.classList.remove('hidden');ui.serviceName.textContent=line.name;ui.serviceStops.textContent=line.stops.length?line.stops.map(id=>city(id).name).join(' → '):'미개통';ui.serviceTrains.textContent=line.trains.length+'대';ui.serviceHeadway.textContent=line.trains.length?serviceHeadway(line)+'분':'-';ui.serviceLoad.textContent=serviceLoad(line)+'%';const p=line.revenue-line.expense;ui.serviceProfit.textContent=(p>=0?'+':'')+formatMoney(p);ui.serviceProfit.style.color=p<0?'#ff8c83':'#8ff0b4';ui.serviceDetail.dataset.id=String(line.id);delete ui.cityDetail.dataset.id}
function updateDetail(){if(!ui.cityDetail.classList.contains('hidden')){const c=city(ui.cityDetail.dataset.id);if(c)showCityDetail(c)}else if(!ui.serviceDetail.classList.contains('hidden')){const line=state.services[Number(ui.serviceDetail.dataset.id)];if(line)showServiceDetail(line)}}
function showNotice(text,ms=1300){ui.notice.textContent=text;ui.notice.classList.add('show');clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>ui.notice.classList.remove('show'),ms)}

function openMonthReport(){if(state.reportOpen||state.gameOver)return;state.reportOpen=true;state.paused=true;ui.report.classList.remove('hidden');play('success',1.06);const p=monthProfit(),acc=accessibility(),month=state.month;ui.reportTitle.textContent=`${month}개월차 운영 보고`;ui.reportDelivered.textContent=(state.delivered-state.lastReportDelivered)+'명';ui.reportProfit.textContent=(p>=0?'+':'')+formatMoney(p);ui.reportAccess.textContent=acc+'%';ui.reportWait.textContent=Math.round(averageWait())+'분';const choices=[{id:'train',icon:'🚆',title:'열차 1대 지원',text:'혼잡한 노선의 배차를 줄일 수 있습니다.'},{id:'grant',icon:'🏗️',title:'지역 철도 지원 30억',text:'새 선로 건설에 사용할 현금을 지원받습니다.'},{id:'station',icon:'🏙️',title:'역사 확장',text:'모든 도시의 대기 수용량이 15명 늘어납니다.'}];ui.reportChoices.innerHTML='';for(const ch of choices){const b=document.createElement('button');b.type='button';b.className='upgradeCard';b.innerHTML=`<span class="upIcon">${ch.icon}</span><b>${ch.title}</b><p>${ch.text}</p>`;b.addEventListener('click',()=>applyReportChoice(ch.id));ui.reportChoices.appendChild(b)}}
function applyReportChoice(id){if(id==='train')state.spareTrains++;if(id==='grant')state.cash+=30;if(id==='station')state.stationCapacity+=15;state.month++;state.lastReportDelivered=state.delivered;state.monthIncome=0;state.monthExpense=0;for(const line of state.services){line.revenue=0;line.expense=0;line.carried=0;line.peakLoad=0}state.reportOpen=false;state.paused=false;ui.report.classList.add('hidden');play('confirm');showNotice('다음 달 철도 지원이 적용됐어요.',1200);updateAllUI()}
function endGame(reason){if(state.gameOver)return;state.gameOver=true;state.running=false;state.paused=true;ui.result.classList.remove('hidden');play('fail');const days=Math.floor(state.elapsed/1440)+1,acc=accessibility();ui.resultReason.textContent=reason;ui.resultDelivered.textContent=Math.floor(state.delivered)+'명';ui.resultTime.textContent=days+'일';ui.resultAccess.textContent=acc+'%';if(state.delivered>save.bestDelivered||acc>save.bestAccess){save.bestDelivered=Math.max(save.bestDelivered,Math.floor(state.delivered));save.bestAccess=Math.max(save.bestAccess,acc);save.bestDays=Math.max(save.bestDays,days);ui.resultTitle.textContent='새 운영 기록'}else ui.resultTitle.textContent='철도 운영 종료';persist();refreshBest()}

function nearestCity(p,r=25){let best=null,bd=r;for(const c of CITIES){const d=dist(p,c);if(d<bd){best=c;bd=d}}return best}
function pointSegmentDistance(p,a,b){const vx=b.x-a.x,vy=b.y-a.y,wx=p.x-a.x,wy=p.y-a.y,c1=vx*wx+vy*wy,c2=vx*vx+vy*vy,t=c2?clamp(c1/c2,0,1):0;return Math.hypot(p.x-(a.x+vx*t),p.y-(a.y+vy*t))}
function nearestServiceAt(p){let best=null,bd=16;for(const line of state.services){for(let i=0;i<line.stops.length-1;i++){const a=city(line.stops[i]),b=city(line.stops[i+1]),d=pointSegmentDistance(p,a,b);if(d<bd){best=line;bd=d}}}return best}
canvas.addEventListener('pointerdown',ev=>{if(!state.running||state.paused||state.gameOver)return;const p=worldPoint(ev);pointer=p;canvas.setPointerCapture?.(ev.pointerId);const c=nearestCity(p);if(pendingTrim){if(c)trimServiceAt(c);else{play('error');showNotice('노선 끝의 도시를 눌러 주세요.')}return}if(c){drag={from:c,pointerId:ev.pointerId};play('click',1.04);return}const line=nearestServiceAt(p);if(line){selectedService=line.id;mode='service';updateTools();showServiceDetail(line);play('click')}})
canvas.addEventListener('pointermove',ev=>{pointer=worldPoint(ev)})
canvas.addEventListener('pointerup',ev=>{if(!state.running||state.paused||state.gameOver)return;const p=worldPoint(ev),to=nearestCity(p);pointer=p;if(drag){const from=drag.from;drag=null;if(to&&to.id!==from.id){if(mode==='track')buildTrack(from,to);else addServiceSegment(from,to)}else if(to)showCityDetail(to)}else if(to)showCityDetail(to)})
canvas.addEventListener('pointercancel',()=>{drag=null})

function drawBackground(){ctx.fillStyle='#07100d';ctx.fillRect(0,0,W,H);const g=ctx.createRadialGradient(535,330,80,535,330,460);g.addColorStop(0,'#0e1c17');g.addColorStop(1,'#07100d');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.fillStyle='rgba(151,189,169,.12)';ctx.font='700 11px system-ui';ctx.fillText('서해',275,345);ctx.fillText('동해',795,300);ctx.fillText('남해',575,610);ctx.beginPath();KOREA_OUTLINE.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle='#0d1b16';ctx.fill();ctx.strokeStyle='rgba(137,174,154,.24)';ctx.lineWidth=2;ctx.stroke();ctx.strokeStyle='rgba(118,150,133,.09)';ctx.lineWidth=1;const borders=[[[405,210],[520,220],[650,205]],[[385,320],[520,315],[730,300]],[[370,430],[520,430],[735,410]],[[510,90],[500,545]],[[620,105],[600,560]]];for(const pts of borders){ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke()}drawMountains()}
function drawMountains(){ctx.fillStyle='rgba(127,158,140,.12)';for(let i=0;i<12;i++){const x=620+(i%3)*27,y=145+Math.floor(i/3)*70;ctx.beginPath();ctx.moveTo(x,y+11);ctx.lineTo(x+7,y);ctx.lineTo(x+14,y+11);ctx.closePath();ctx.fill()}ctx.fillStyle='rgba(134,166,148,.16)';ctx.font='700 8px system-ui';ctx.fillText('산악 지형',650,132)}
function drawCandidateCorridors(){if(mode!=='track')return;ctx.save();ctx.setLineDash([4,7]);ctx.lineWidth=1.3;for(const cor of CORRIDORS){const key=trackKey(cor.a,cor.b);if(state.builtTracks.has(key))continue;const a=city(cor.a),b=city(cor.b);ctx.strokeStyle=cor.terrain==='mountain'?'rgba(229,188,112,.19)':'rgba(153,188,169,.14)';ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}ctx.restore()}
function drawTracks(){for(const key of state.builtTracks){const [aId,bId]=key.split('|'),a=city(aId),b=city(bId);ctx.strokeStyle='#34483e';ctx.lineWidth=8;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.strokeStyle='#93aa9e';ctx.lineWidth=2;ctx.setLineDash([7,5]);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.setLineDash([])}}
function offsetSegment(a,b,offset){const dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy)||1,nx=-dy/l,ny=dx/l;return {a:{x:a.x+nx*offset,y:a.y+ny*offset},b:{x:b.x+nx*offset,y:b.y+ny*offset}}}
function drawServices(){for(const line of state.services){if(line.stops.length<2)continue;const profit=line.revenue-line.expense;for(let i=0;i<line.stops.length-1;i++){const a=city(line.stops[i]),b=city(line.stops[i+1]),o=(line.id-2)*2.4,seg=offsetSegment(a,b,o);ctx.lineCap='round';ctx.strokeStyle='rgba(3,8,6,.82)';ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(seg.a.x,seg.a.y);ctx.lineTo(seg.b.x,seg.b.y);ctx.stroke();ctx.strokeStyle=state.layer==='수익'?(profit<0?'#e7746e':'#72d89b'):line.color;ctx.lineWidth=5.5;ctx.beginPath();ctx.moveTo(seg.a.x,seg.a.y);ctx.lineTo(seg.b.x,seg.b.y);ctx.stroke()}}}
function drawDemandLayer(){if(state.layer!=='수요')return;ctx.save();for(const c of CITIES){const top=Object.entries(c.waiting).sort((a,b)=>b[1].count-a[1].count).slice(0,2);for(const [dest,g] of top){if(g.count<2)continue;const d=city(dest),alpha=clamp(g.count/35,.08,.34);ctx.strokeStyle=`rgba(242,196,111,${alpha})`;ctx.lineWidth=1+Math.min(5,g.count/8);ctx.beginPath();ctx.moveTo(c.x,c.y);const mx=(c.x+d.x)/2,my=(c.y+d.y)/2-25;ctx.quadraticCurveTo(mx,my,d.x,d.y);ctx.stroke()}}ctx.restore()}
function drawCities(){for(const c of CITIES){const w=waitingCount(c),served=state.services.some(s=>s.stops.includes(c.id)&&s.trains.length),tracked=[...state.builtTracks].some(k=>k.split('|').includes(c.id));if(state.layer==='혼잡'&&w>0){const ratio=clamp(w/state.stationCapacity,0,1.5);ctx.fillStyle=ratio>.85?'rgba(237,116,110,.19)':'rgba(242,196,111,.12)';ctx.beginPath();ctx.arc(c.x,c.y,22+ratio*18,0,Math.PI*2);ctx.fill()}if(c.pulse>0){ctx.globalAlpha=c.pulse*.35;ctx.strokeStyle='#d9ffe6';ctx.lineWidth=3;ctx.beginPath();ctx.arc(c.x,c.y,19+(1-c.pulse)*18,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1}ctx.fillStyle=served?'#dff8e8':tracked?'#a8c6b5':'#2a3a32';ctx.strokeStyle=served?'#07100d':'#789084';ctx.lineWidth=3;ctx.beginPath();ctx.arc(c.x,c.y,served?8:6,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle=served?'#dcebe2':'#82958a';ctx.font=`${served?'900':'750'} 10px system-ui`;ctx.textAlign='center';ctx.fillText(c.name,c.x,c.y-14);if(w>0){ctx.fillStyle=w>state.stationCapacity*.8?'#f29a91':'#d7e5dc';ctx.font='900 8px system-ui';ctx.fillText(String(w),c.x+15,c.y+4)}}ctx.textAlign='left'}
function trainPosition(line,t){const a=city(line.stops[t.stopIndex]);if(!a)return null;if(t.phase!=='travel')return {x:a.x,y:a.y,ang:0};const b=city(line.stops[t.nextIndex]);if(!b)return {x:a.x,y:a.y,ang:0};const o=(line.id-2)*2.4,seg=offsetSegment(a,b,o);return {x:lerp(seg.a.x,seg.b.x,t.progress),y:lerp(seg.a.y,seg.b.y,t.progress),ang:Math.atan2(seg.b.y-seg.a.y,seg.b.x-seg.a.x)}}
function drawTrains(){for(const line of state.services)for(const t of line.trains){const p=trainPosition(line,t);if(!p)continue;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.ang);ctx.fillStyle='#06100b';roundRect(-10,-6,20,12,3);ctx.fill();ctx.fillStyle=line.color;roundRect(-8,-4,16,8,2);ctx.fill();const n=passengerCount(t);if(n){ctx.rotate(-p.ang);ctx.fillStyle='#eff8f1';ctx.font='900 7px system-ui';ctx.textAlign='center';ctx.fillText(n,0,-8)}ctx.restore()}ctx.textAlign='left'}
function roundRect(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
function drawPreview(){if(!drag)return;const a=drag.from,to=nearestCity(pointer),end=to||pointer;let ok=true,msg='';if(to){if(mode==='track'){const cor=corridor(a.id,to.id);ok=!!cor&&!state.builtTracks.has(trackKey(a.id,to.id));msg=cor?`${TERRAIN[cor.terrain].label} · ${cor.cost}억`:'직접 연결 불가'}else{const check=canExtendService(a,to,state.services[selectedService]);ok=check.ok;msg=check.msg||state.services[selectedService].name}}ctx.save();ctx.setLineDash([10,7]);ctx.strokeStyle=ok?(mode==='track'?'#c6d8cd':state.services[selectedService].color):'#e7746e';ctx.globalAlpha=.8;ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(end.x,end.y);ctx.stroke();ctx.restore();if(to){ctx.strokeStyle=ok?'#dff8e8':'#e7746e';ctx.lineWidth=2;ctx.beginPath();ctx.arc(to.x,to.y,16,0,Math.PI*2);ctx.stroke();if(msg){ctx.fillStyle='rgba(4,12,8,.9)';roundRect((a.x+to.x)/2-43,(a.y+to.y)/2-26,86,20,4);ctx.fill();ctx.fillStyle='#dcebe2';ctx.font='800 8px system-ui';ctx.textAlign='center';ctx.fillText(msg,(a.x+to.x)/2,(a.y+to.y)/2-13);ctx.textAlign='left'}}}
function render(){ctx.setTransform(dpr*scale,0,0,dpr*scale,dpr*offX,dpr*offY);drawBackground();drawCandidateCorridors();drawTracks();drawDemandLayer();drawServices();drawTrains();drawCities();drawPreview();ctx.setTransform(1,0,0,1,0,0)}
function loop(now){requestAnimationFrame(loop);const raw=Math.min(.05,Math.max(0,(now-last)/1000));last=now;if(state.running&&!state.paused&&!state.gameOver)update(raw*GAME_MIN_PER_SEC*state.speed);render()}

ui.trackTool.addEventListener('click',()=>{mode='track';pendingTrim=false;play('click');updateTools();showNotice('선로 건설 모드 · 가까운 도시 사이를 드래그하세요.',1100)});
ui.trainTool.addEventListener('click',()=>{play('click');addTrain()});
ui.trimTool.addEventListener('click',()=>{if(!state.running)return;mode='service';pendingTrim=!pendingTrim;play('click');updateTools();showNotice(pendingTrim?'줄일 노선의 맨 끝 도시를 눌러 주세요.':'노선 줄이기를 취소했어요.',1100)});
ui.undo.addEventListener('click',()=>{if(!state.running||!undoStack.length){play('error');showNotice('되돌릴 변경이 없어요.');return}restore(undoStack.pop())});
ui.pause.addEventListener('click',()=>{if(!state.running||state.gameOver||state.reportOpen)return;state.paused=!state.paused;ui.pause.textContent=state.paused?'▶':'⏸';play('click');showNotice(state.paused?'일시정지':'운영 재개',700)});
ui.speed.addEventListener('click',()=>{if(!state.running)return;state.speed=state.speed===1?2:state.speed===2?4:1;ui.speed.textContent='×'+state.speed;play('click');showNotice(`${state.speed}배속`,650)});
ui.layer.addEventListener('click',()=>{const layers=['기본','수요','혼잡','수익'];state.layer=layers[(layers.indexOf(state.layer)+1)%layers.length];ui.layer.textContent=state.layer;play('click');showNotice(`${state.layer} 레이어`,700)});
ui.sound.addEventListener('click',()=>{soundOn=!soundOn;ui.sound.textContent=soundOn?'🔊':'🔇';if(soundOn)play('click')});
ui.helpBtn.addEventListener('click',()=>{ui.help.classList.remove('hidden');if(state.running)state.paused=true;play('click')});
ui.closeHelp.addEventListener('click',()=>{ui.help.classList.add('hidden');if(state.running&&!state.reportOpen&&!state.gameOver)state.paused=false;play('click')});
ui.start.addEventListener('click',()=>{play('confirm');resetState(!save.tutorialSeen)});ui.tutorial.addEventListener('click',()=>{play('confirm');resetState(true)});ui.retry.addEventListener('click',()=>{play('confirm');resetState(false)});ui.menuBtn.addEventListener('click',()=>{ui.result.classList.add('hidden');ui.menu.classList.remove('hidden');state.running=false;play('click')});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.running&&!state.gameOver){state.paused=true;ui.pause.textContent='▶'}});
addEventListener('keydown',ev=>{if(ev.code==='Space'&&state.running&&!state.reportOpen){ev.preventDefault();ui.pause.click()}if(ev.code==='KeyB'&&state.running)ui.trackTool.click();if(/^Digit[1-5]$/.test(ev.code)){const i=Number(ev.code.slice(-1))-1;selectService(i)}});

loadSave();state.services=SERVICES.map(newService);updateAllUI();requestAnimationFrame(loop);
})();

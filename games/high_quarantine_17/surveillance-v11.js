(()=>{
'use strict';
if(!window.Q17Outbreak)return;

const A='../../assets/game/characters/people/kenney-platformer-characters/';
const SPRITES={
 player:A+'player/poses/player-stand.png',
 female:A+'female/poses/female-stand.png',
 adventurer:A+'adventurer/poses/adventurer-stand.png',
 soldier:A+'soldier/poses/soldier-stand.png',
 zombie:A+'zombie/poses/zombie-stand.png'
};
const ZONES=[
 {id:'residential',name:'주거구역',desc:'숙소 · 의무막사',x1:7,x2:34,y1:25,y2:78},
 {id:'supply',name:'배급·작업구역',desc:'식량 · 식수 · 물자',x1:37,x2:67,y1:22,y2:78},
 {id:'gate',name:'경계구역',desc:'철책 · 초소 · 출입문',x1:71,x2:94,y1:23,y2:78}
];
const CAMP_OBSTACLES=[
 {x:6.8,y:10.2,w:19.3,h:22.6,label:'지휘소'},
 {x:25.2,y:16.3,w:5.0,h:6.7,label:'지휘소 장비 책상'},
 {x:30.4,y:9.6,w:21.9,h:24.5,label:'격리동'},
 {x:57.1,y:10.7,w:19.2,h:21.9,label:'보급창고'},
 {x:59.9,y:30.7,w:10.9,h:13.0,label:'보급 천막·적재물'},
 {x:47.4,y:69.3,w:9.6,h:13.3,label:'의무막사 텐트'},
 {x:12.3,y:58.1,w:9.6,h:8.9,label:'생존자 텐트'},
 {x:24.0,y:70.0,w:10.5,h:8.9,label:'생존자 텐트'},
 {x:80.2,y:17.6,w:4.0,h:15.2,label:'금속 쉘터'},
 {x:84.9,y:61.9,w:7.5,h:8.2,label:'구급차'},
 {x:87.0,y:74.4,w:9.2,h:10.0,label:'경찰차'},
 {x:74.8,y:84.1,w:9.6,h:10.7,label:'지원 밴'},
 {x:66.7,y:74.8,w:6.7,h:8.5,label:'바리케이드'}
];
const TASKS={
 residential:['침상 정리','휴식','의무막사 보조','세탁물 정리'],
 supply:['식량 배급','식수 운반','물자 정리','배급표 확인'],
 gate:['철책 순찰','출입 확인','무전 대기','경계 근무']
};
const ROLE_HOME=['supply','supply','residential','gate','supply','supply','gate','residential'];
const NAMES=['강서아','윤도현','박하린','김우진','정민서','오태윤','한예지','이준호'];
const ROLES=['배급 담당','시설 정비','의무 보조','경계 근무','조리 담당','물자 기록','통신 담당','환경 정리'];
const RESIDENT_SPRITES=['female','adventurer','player','soldier','female','player','adventurer','soldier'];
const SIM_MS=450;

let residents=[],threats=[],campLog=[],seq=0,residentSeq=1000,campCollapsed=false,globalIncident=null,currentView='station',campSeconds=0;

function esc(s){return String(s).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]})}
function rand(a){return a[Math.floor(Math.random()*a.length)]}
function bridge(){return window.Q17Bridge||null}
function zoneInfo(id){return ZONES.find(function(z){return z.id===id})||ZONES[0]}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function campBlockedAt(x,y,r){
 r=r||1.05;
 return CAMP_OBSTACLES.some(function(o){return x+r>o.x&&x-r<o.x+o.w&&y+r>o.y&&y-r<o.y+o.h})
}
function pointInZone(zone,pad){
 pad=pad||0;
 for(let n=0;n<28;n++){
  const p={x:zone.x1+pad+Math.random()*Math.max(1,zone.x2-zone.x1-pad*2),y:zone.y1+pad+Math.random()*Math.max(1,zone.y2-zone.y1-pad*2)};
  if(!campBlockedAt(p.x,p.y,1.1))return p
 }
 const cx=(zone.x1+zone.x2)/2,cy=(zone.y1+zone.y2)/2;
 for(let r=2;r<=18;r+=2)for(let i=0;i<12;i++){const a=i/12*Math.PI*2,x=clamp(cx+Math.cos(a)*r,5,95),y=clamp(cy+Math.sin(a)*r,18,83);if(!campBlockedAt(x,y,1.1))return{x,y}}
 return{x:cx,y:cy}
}
function zoneFromPos(x){
 if(x<35.5)return 'residential';
 if(x<69)return 'supply';
 return 'gate';
}
function dangerCount(){return threats.filter(function(t){return t.phase==='infected'||t.phase==='zombie'}).length+residents.filter(function(r){return r.status==='bitten'}).length}
function livingCount(){return residents.filter(function(r){return r.status!=='lost'&&r.status!=='zombie'}).length}
function safeCount(){return residents.filter(function(r){return r.status==='safe'}).length}
function spriteFor(key){return SPRITES[key]||SPRITES.player}
function addCampLog(text){
 campLog.unshift(text);if(campLog.length>18)campLog.length=18;renderLog();
}
function makeResident(name,i){
 const home=zoneInfo(ROLE_HOME[i]||'residential'),p=pointInZone(home,3);
 return{id:i+1,personId:'camp-base-'+(i+1),name:name,role:ROLES[i],sprite:RESIDENT_SPRITES[i],zone:home.id,status:'safe',task:rand(TASKS[home.id]),x:p.x,y:p.y,tx:p.x,ty:p.y,speed:3.3+Math.random()*.55,dir:1,turnMs:0,routineMs:1800+Math.random()*5000,home:home.id};
}
function resetCamp(){
 residents=NAMES.map(makeResident);threats=[];campLog=[];seq=0;residentSeq=1000;campCollapsed=false;globalIncident=null;campSeconds=0;
 addCampLog('CAMP-17 정상 운영 시작 · 생존자 '+residents.length+'명');
 renderAll();
}
function chooseRoutine(r){
 if(r.status!=='safe')return;
 let zid=r.home;
 const roll=Math.random();
 if(roll<.18)zid='residential';
 else if(roll<.34)zid='supply';
 else if(roll<.43)zid='gate';
 const z=zoneInfo(zid),p=pointInZone(z,3);
 r.zone=zid;r.task=rand(TASKS[zid]);r.tx=p.x;r.ty=p.y;r.routineMs=4500+Math.random()*8500;
}
function admissionHome(job){
 job=String(job||'');
 if(/경비|경찰|군인|보안|소방/.test(job))return'gate';
 if(/정비|배관|운송|창고|조리|기술|목수|연구|시설/.test(job))return'supply';
 return'residential'
}
function admitResident(p){
 p=p||{};const pid=p.personId||null;
 if(pid){
  const old=residents.find(function(r){return r.personId===pid});
  if(old)return old;
  if(threats.some(function(t){return t.personId===pid}))return null
 }
 const home=zoneInfo(admissionHome(p.job)),pos=pointInZone(home,3),id=pid||('camp-admit-'+(++residentSeq));
 const r={id:id,personId:pid||id,name:p.name||'신규 생존자',role:p.job||p.role||'신규 입소',sprite:p.sprite||'player',zone:home.id,status:'safe',task:'입소 등록',x:pos.x,y:pos.y,tx:pos.x,ty:pos.y,speed:3.25+Math.random()*.5,dir:1,turnMs:0,routineMs:1100+Math.random()*1800,home:home.id};
 residents.push(r);addCampLog('<b>'+esc(r.name)+'</b> CAMP-17 입소 · '+esc(r.role));chooseRoutine(r);renderAll();return r
}
function campLineBlocked(x1,y1,x2,y2){
 const d=Math.hypot(x2-x1,y2-y1),steps=Math.max(1,Math.ceil(d/1.35));
 for(let i=1;i<steps;i++){const t=i/steps;if(campBlockedAt(x1+(x2-x1)*t,y1+(y2-y1)*t,1.05))return true}
 return false
}
function campWaypoint(e,tx,ty){
 if(!campLineBlocked(e.x,e.y,tx,ty))return{x:tx,y:ty};
 const step=3,minX=4,maxX=96,minY=17,maxY=84;
 const gx=x=>Math.round((clamp(x,minX,maxX)-minX)/step),gy=y=>Math.round((clamp(y,minY,maxY)-minY)/step);
 const px=x=>minX+x*step,py=y=>minY+y*step,cols=gx(maxX)+1,rows=gy(maxY)+1;
 let start=[gx(e.x),gy(e.y)],goal=[gx(tx),gy(ty)];
 const key=(x,y)=>y*cols+x,free=(x,y)=>x>=0&&y>=0&&x<cols&&y<rows&&!campBlockedAt(px(x),py(y),1.2);
 const nearestFree=(cell,wx,wy)=>{
  if(free(cell[0],cell[1]))return cell;
  let best=null,bd=Infinity;
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)if(free(x,y)){const d=Math.hypot(px(x)-wx,py(y)-wy);if(d<bd){bd=d;best=[x,y]}}
  return best||cell
 };
 start=nearestFree(start,e.x,e.y);goal=nearestFree(goal,tx,ty);
 const q=[start],prev=new Map([[key(start[0],start[1]),null]]),dirs=[[1,0],[-1,0],[0,1],[0,-1]];
 let found=false;
 for(let qi=0;qi<q.length&&!found;qi++){
  const cur=q[qi];
  for(const d of dirs){
   const nx=cur[0]+d[0],ny=cur[1]+d[1],k=key(nx,ny);
   if(!free(nx,ny)||prev.has(k))continue;prev.set(k,cur);q.push([nx,ny]);if(nx===goal[0]&&ny===goal[1]){found=true;break}
  }
 }
 if(!prev.has(key(goal[0],goal[1])))return{x:tx,y:ty};
 let cur=goal,parent=prev.get(key(cur[0],cur[1]));
 while(parent&&!(parent[0]===start[0]&&parent[1]===start[1])){cur=parent;parent=prev.get(key(cur[0],cur[1]))}
 return{x:px(cur[0]),y:py(cur[1])}
}
function moveToward(e,tx,ty,speed,dt){
 const target=campWaypoint(e,tx,ty),dx=target.x-e.x,dy=target.y-e.y,d=Math.hypot(dx,dy);if(d<.15)return false;
 const step=Math.min(d,speed*dt),base=Math.atan2(dy,dx),offsets=[0,.38,-.38,.76,-.76,1.15,-1.15,1.57,-1.57];
 let best=null,bestD=Infinity;
 for(const off of offsets){
  const nx=clamp(e.x+Math.cos(base+off)*step,4,96),ny=clamp(e.y+Math.sin(base+off)*step,17,84);
  if(campBlockedAt(nx,ny,1.05))continue;
  const nd=Math.hypot(target.x-nx,target.y-ny)+Math.abs(off)*.08;
  if(nd<bestD){bestD=nd;best={x:nx,y:ny}}
 }
 if(!best)return false;
 e.dir=best.x>=e.x?1:-1;e.x=best.x;e.y=best.y;e.zone=zoneFromPos(e.x);return true
}
function fleeFrom(r,z,dt){
 const dx=r.x-z.x,dy=r.y-z.y,d=Math.hypot(dx,dy)||1;
 const tx=clamp(r.x+dx/d*12,5,95),ty=clamp(r.y+dy/d*10,18,83);
 r.task='위험 회피';return moveToward(r,tx,ty,r.speed*1.38,dt);
}
function nearestThreat(r){
 let best=null,bd=Infinity;
 threats.forEach(function(t){if(t.phase!=='zombie')return;const d=dist(r,t);if(d<bd){bd=d;best=t}});
 return{target:best,distance:bd};
}
function nearestVictim(t){
 let best=null,bd=Infinity;
 residents.forEach(function(r){
  if(r.status!=='safe')return;
  const d=dist(t,r);if(d<bd){bd=d;best=r}
 });
 return{target:best,distance:bd};
}
function biteResident(t,r){
 if(!r||r.status!=='safe'||(t.attackMs||0)>0)return;
 r.status='bitten';r.turnMs=9000;r.task='물림 · 변이 진행';t.attackMs=2600;
 addCampLog('<b>'+esc(r.name)+'</b> 물림 · 약 9초 후 변이 위험');
 const b=bridge();if(b)b.applyOutbreakResult({trustDelta:-1,scoreDelta:-35});
}
function convertResident(r){
 if(!r||r.status!=='bitten')return;
 r.status='zombie';r.task='변이 완료';
 threats.push({id:'r'+r.id,personId:r.personId||null,name:r.name,sprite:r.sprite,zone:r.zone,phase:'zombie',timerMs:0,attackMs:1200,source:'resident',x:r.x,y:r.y,tx:r.x,ty:r.y,dir:r.dir||1,speed:5.0});
 addCampLog('<b>'+esc(r.name)+'</b> 변이 완료 · '+zoneInfo(r.zone).name+' 내부 좀비 발생');
 const b=bridge();if(b)b.applyOutbreakResult({infectionDelta:2,trustDelta:-2,scoreDelta:-80});
}
function updateResidents(dt,ms){
 residents.forEach(function(r){
  if(r.status==='lost'||r.status==='zombie')return;
  if(r.status==='bitten'){
   r.turnMs-=ms;
   const threat=nearestThreat(r);
   if(threat.target&&threat.distance<13)fleeFrom(r,threat.target,dt);else moveToward(r,22,50,r.speed*.72,dt);
   if(r.turnMs<=0)convertResident(r);
   return;
  }
  const threat=nearestThreat(r);
  if(threat.target&&threat.distance<15){fleeFrom(r,threat.target,dt);return}
  r.routineMs-=ms;
  if(r.routineMs<=0||Math.hypot(r.tx-r.x,r.ty-r.y)<1)chooseRoutine(r);
  moveToward(r,r.tx,r.ty,r.speed,dt);
 });
}
function updateThreats(dt,ms){
 threats.forEach(function(t){
  t.attackMs=Math.max(0,(t.attackMs||0)-ms);
  if(t.phase==='infected'){
   t.timerMs-=ms;
   if(Math.hypot(t.tx-t.x,t.ty-t.y)<1){
    const p=pointInZone(zoneInfo('gate'),3);t.tx=p.x;t.ty=p.y;
   }
   moveToward(t,t.tx,t.ty,t.speed||2.3,dt);
   if(t.timerMs<=0){
    t.phase='zombie';t.speed=5.15;t.attackMs=900;
    addCampLog('<b>'+esc(t.name)+'</b> 경계구역에서 좀비화 · 캠프 내부 비상');
   }
   return;
  }
  if(t.phase!=='zombie')return;
  const victim=nearestVictim(t);
  if(!victim.target){
   if(Math.hypot((t.tx||t.x)-t.x,(t.ty||t.y)-t.y)<1){const p=pointInZone(zoneInfo('residential'),2);t.tx=p.x;t.ty=p.y}
   moveToward(t,t.tx||t.x,t.ty||t.y,t.speed||5,dt);return;
  }
  moveToward(t,victim.target.x,victim.target.y,t.speed||5,dt);
  if(victim.distance<3.0)biteResident(t,victim.target);
 });
}
function simulationStep(){
 if(window.Q17Outbreak.isCombatActive&&window.Q17Outbreak.isCombatActive())return;
 const dt=SIM_MS/1000;campSeconds+=dt;
 updateResidents(dt,SIM_MS);updateThreats(dt,SIM_MS);
 if(!campCollapsed&&livingCount()===0&&dangerCount()>0){
  campCollapsed=true;addCampLog('<b>CAMP-17 붕괴</b> · 생존자가 남지 않았습니다.');
  const b=bridge();if(b)b.applyOutbreakResult({infectionDelta:10,trustDelta:-10,scoreDelta:-500});
 }
 renderCamp();
}
function isolationTick(){
 if(window.Q17Outbreak.isCombatActive&&window.Q17Outbreak.isCombatActive())return;
 if(window.Q17Outbreak.tickIsolation)window.Q17Outbreak.tickIsolation();
 renderDock();
}
function onCampBreach(payload){
 const p={x:94,y:51};
 threats.push({id:'t'+(++seq),personId:payload.personId||null,name:payload.name||'미확인 감염자',sprite:payload.sprite||'player',zone:'gate',phase:'infected',timerMs:6200,attackMs:0,source:'intruder',x:p.x,y:p.y,tx:82+Math.random()*7,ty:38+Math.random()*25,dir:-1,speed:2.45});
 addCampLog('<b>'+esc(payload.name||'미확인 시민')+'</b> 감염 상태로 캠프 진입 · 경계초소에서 이상 행동');
 renderAll();flashDock('camp');
}
function registerGlobalOutbreak(info){
 globalIncident=Object.assign({},info||{});
 addCampLog('외곽 격리선 경보 · '+(globalIncident.severity||'감염자 집단')+' 발생');
 renderAll();flashDock('station');
}
function fieldResidentSelection(active,liveResidents){
 const anchors=active.concat(liveResidents.filter(function(r){return r.status==='bitten'}));
 const score=function(r){
  const dangerBonus=r.status==='bitten'?-10000:0;
  if(anchors.length){
   let d=Infinity;anchors.forEach(function(a){d=Math.min(d,Math.hypot((Number(r.x)||0)-(Number(a.x)||0),(Number(r.y)||0)-(Number(a.y)||0)))});
   return dangerBonus+d;
  }
  return dangerBonus+Math.hypot((Number(r.x)||0)-94,(Number(r.y)||0)-51);
 };
 return liveResidents.slice().sort(function(a,b){const d=score(a)-score(b);if(Math.abs(d)>.001)return d;return String(a.id).localeCompare(String(b.id))}).slice(0,12)
}
function responsePayload(){
 const active=threats.filter(function(t){return t.phase==='infected'||t.phase==='zombie'});
 const liveResidents=residents.filter(function(r){return r.status!=='lost'&&r.status!=='zombie'});
 const fieldResidents=fieldResidentSelection(active,liveResidents);
 return{
  name:active.length?active[0].name:'캠프 감염자',
  threatCount:Math.max(1,active.length),survivorCount:fieldResidents.length,totalResidentCount:liveResidents.length,
  residents:fieldResidents.map(function(r){return{id:r.id,personId:r.personId||null,name:r.name,role:r.role,status:r.status,sprite:r.sprite,x:r.x,y:r.y,dir:r.dir}}),
  threats:active.map(function(t){return{id:t.personId||t.id,personId:t.personId||null,name:t.name,phase:t.phase,sprite:t.sprite,x:t.x,y:t.y,dir:t.dir,source:t.source}})
 };
}
function applyCombatLosses(n,ids){
 const wanted=new Set((ids||[]).map(String));
 if(wanted.size){
  residents.forEach(function(r){if(wanted.has(String(r.id))&&(r.status==='safe'||r.status==='bitten')){r.status='lost';r.task='진압 중 사망';addCampLog('<b>'+esc(r.name)+'</b> 진압 과정에서 사망')}});
  return
 }
 let candidates=residents.filter(function(r){return r.status==='safe'||r.status==='bitten'});
 n=Math.min(Number(n)||0,candidates.length);
 for(let i=0;i<n;i++){
  const r=candidates.splice(Math.floor(Math.random()*candidates.length),1)[0];
  if(!r)break;r.status='lost';r.task='진압 중 사망';addCampLog('<b>'+esc(r.name)+'</b> 진압 과정에서 사망');
 }
}
function respondCamp(){
 if(!dangerCount())return;
 const btn=document.getElementById('q17CampRespond');if(btn)btn.disabled=true;
 const ok=window.Q17Outbreak.respondCamp&&window.Q17Outbreak.respondCamp(responsePayload(),function(result){
  if(result&&result.won){
   applyCombatLosses(result.losses||0,result.lostIds);threats=[];
   residents.forEach(function(r){
    if(r.status==='bitten'){r.status='safe';r.turnMs=0;r.task='응급 처치 후 안정';chooseRoutine(r)}
    else if(r.status==='zombie'){r.status='lost';r.task='진압 과정에서 제거됨'}
   });
   addCampLog('현장 진압 완료 · 캠프 내부 감염원 제거');
  }else{
   applyCombatLosses(result&&result.losses||0,result&&result.lostIds);addCampLog('현장 진압 실패 · 캠프 감염 상황 지속');
  }
  renderAll();
 });
 if(ok===false&&btn)btn.disabled=false;
}
function respondGlobal(){
 if(!globalIncident)return;
 const ok=window.Q17Outbreak.respondGlobal&&window.Q17Outbreak.respondGlobal(function(result){
  if(result&&result.won){addCampLog('외곽 격리선 진압 완료');globalIncident=null}
  else addCampLog('외곽 격리선 진압 실패');
  renderAll();
 });
 if(ok===false)return;
}
function entityStatus(e,isThreat){
 if(isThreat)return e.phase==='infected'?'감염 의심 · 변이 '+Math.max(0,Math.ceil(e.timerMs/1000))+'초':'좀비';
 if(e.status==='bitten')return '물림 · 변이 '+Math.max(0,Math.ceil(e.turnMs/1000))+'초';
 return e.status==='safe'?e.task:e.status;
}
function syncEntities(){
 const layer=document.getElementById('q17CampEntityLayer');if(!layer)return;
 const models=[];
 residents.forEach(function(r){if(r.status!=='lost'&&r.status!=='zombie')models.push({key:'r'+r.id,e:r,threat:false})});
 threats.forEach(function(t){models.push({key:'t'+t.id,e:t,threat:true})});
 const keep=new Set(models.map(function(m){return m.key}));
 Array.from(layer.children).forEach(function(n){if(!keep.has(n.dataset.key))n.remove()});
 models.forEach(function(m){
  let node=layer.querySelector('[data-key="'+m.key+'"]');
  if(!node){
   node=document.createElement('button');node.type='button';node.className='q17-map-entity';node.dataset.key=m.key;
   node.innerHTML='<span class="q17-map-bubble"></span><img alt=""><b></b><small></small>';layer.appendChild(node);
  }
  const e=m.e,status=entityStatus(e,m.threat);
  node.className='q17-map-entity '+(m.threat?'threat '+e.phase:e.status)+(e.dir<0?' face-left':'');
  node.style.left=e.x+'%';node.style.top=e.y+'%';
  const img=node.querySelector('img');img.src=spriteFor(m.threat&&e.phase==='zombie'?'zombie':e.sprite);
  node.querySelector('b').textContent=e.name;
  node.querySelector('small').textContent=status;
  const bubble=node.querySelector('.q17-map-bubble');
  bubble.textContent=m.threat?(e.phase==='zombie'?'!':'?'):(e.status==='bitten'?'!':'');
  bubble.hidden=!m.threat&&e.status!=='bitten';
  node.title=(m.threat?'위험 개체':e.role)+' · '+status;
 });
 const dangerZones=new Set();
 threats.filter(function(t){return t.phase==='zombie'}).forEach(function(t){dangerZones.add(zoneFromPos(t.x))});
 document.querySelectorAll('.q17-zone-mark').forEach(function(z){z.classList.toggle('danger',dangerZones.has(z.dataset.zone))});
}
function renderLog(){
 const log=document.getElementById('q17CampLog');if(log)log.innerHTML=campLog.length?campLog.map(function(x){return '• '+x}).join('<br>'):'• 캠프 기록 없음';
}
function renderCamp(){
 syncEntities();
 const safe=document.getElementById('q17CampSafe'),bitten=document.getElementById('q17CampBitten'),z=document.getElementById('q17CampZombie');
 if(safe)safe.textContent=safeCount();
 if(bitten)bitten.textContent=residents.filter(function(r){return r.status==='bitten'}).length;
 if(z)z.textContent=threats.filter(function(t){return t.phase==='zombie'}).length;
 const state=document.getElementById('q17CampState');if(state)state.textContent=campCollapsed?'붕괴':dangerCount()?'감염 경보':'정상 운영';
 const respond=document.getElementById('q17CampRespond');if(respond){respond.disabled=!dangerCount();respond.textContent=dangerCount()?'현장 출동 · 위험 '+dangerCount()+'건':'현장 출동 · 위험 없음'}
 const clock=document.getElementById('q17CampClock');if(clock){const s=Math.floor(campSeconds);clock.textContent=String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}
 renderLog();renderDock();
}
function renderDock(){
 const iso=window.Q17Outbreak.getIsolationSnapshot?window.Q17Outbreak.getIsolationSnapshot():[];
 const isoDanger=iso.filter(function(x){return x.status==='positive'||x.status==='turning'||x.status==='zombie'||x.status==='exposed'}).length;
 const campDanger=dangerCount();
 const ib=document.getElementById('q17ViewIsoBadge'),cb=document.getElementById('q17ViewCampBadge'),sb=document.getElementById('q17ViewStationBadge');
 if(ib){ib.textContent=isoDanger;ib.hidden=!isoDanger}
 if(cb){cb.textContent=campDanger;cb.hidden=!campDanger}
 if(sb){sb.textContent=globalIncident?'!':'';sb.hidden=!globalIncident}
 document.querySelectorAll('.q17-view-btn').forEach(function(b){b.classList.toggle('active',b.dataset.view===currentView)});
 const alert=document.getElementById('q17GlobalAlert');
 if(alert){
  alert.classList.toggle('show',!!globalIncident);
  if(globalIncident)document.getElementById('q17GlobalAlertText').textContent=(globalIncident.severity||'외곽 감염')+' · 감염률 '+globalIncident.infection+'% · 예상 '+globalIncident.count+'명';
 }
}
function renderAll(){renderCamp();renderDock()}
function closeViews(){
 const camp=document.getElementById('q17Camp');if(camp)camp.classList.remove('show');
 const iso=document.getElementById('q17Isolation');if(iso)iso.classList.remove('show');
}
function switchView(view){
 currentView=view;
 if(view==='station')closeViews();
 else if(view==='isolation'){
  const camp=document.getElementById('q17Camp');if(camp)camp.classList.remove('show');
  if(window.Q17Outbreak.openIsolation)window.Q17Outbreak.openIsolation();
 }else if(view==='camp'){
  const iso=document.getElementById('q17Isolation');if(iso)iso.classList.remove('show');
  document.getElementById('q17Camp').classList.add('show');renderCamp();
 }
 renderDock();
}
function flashDock(view){
 const b=document.querySelector('.q17-view-btn[data-view="'+view+'"]');if(!b)return;b.classList.remove('flash');void b.offsetWidth;b.classList.add('flash');
}
function inspectEntity(key){
 let e=null,type='';
 if(key&&key[0]==='r'){e=residents.find(function(r){return 'r'+r.id===key});type='생존자'}
 else{e=threats.find(function(t){return 't'+t.id===key});type='위험 개체'}
 const box=document.getElementById('q17CampFocus');if(!box||!e)return;
 box.classList.add('show');
 box.innerHTML='<b>'+esc(e.name)+'</b><span>'+type+' · '+esc(zoneInfo(zoneFromPos(e.x)).name)+'</span><small>'+esc(entityStatus(e,type==='위험 개체'))+(e.role?' · '+esc(e.role):'')+'</small>';
}

function mount(){
 const css=document.createElement('style');
 css.textContent=[
 '#q17ViewDock{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:255;display:flex;gap:6px;padding:6px;background:#070a0ddd;border:1px solid #4a555f;box-shadow:0 10px 35px #000b;backdrop-filter:blur(7px)}',
 '.q17-view-btn{position:relative;border:1px solid #4d5963;background:#1b2228;color:#dbe2e6;padding:9px 13px;font-size:11px;font-weight:900;cursor:pointer;min-width:96px}.q17-view-btn.active{background:#c1a84e;color:#171717;border-color:#d4bc60}.q17-view-btn.flash{animation:q17viewflash .65s ease 3}',
 '.q17-view-badge{position:absolute;right:3px;top:2px;min-width:17px;height:17px;border-radius:9px;background:#b83f46;color:#fff;font-size:9px;line-height:17px;text-align:center;font-style:normal}',
 '#q17Camp{position:fixed;inset:0;z-index:244;background:#050708e8;display:none;align-items:center;justify-content:center;padding:12px 12px 72px}#q17Camp.show{display:flex}',
 '.q17-camp-card{width:min(1220px,100%);max-height:92vh;overflow:auto;background:#10161b;border:1px solid #5d6872;box-shadow:0 25px 80px #000}',
 '.q17-camp-head{position:sticky;top:0;z-index:8;background:#1d252b;border-bottom:1px solid #46515a;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}.q17-camp-head h2{margin:0;font-size:16px}.q17-live{color:#ef7777;font-size:10px;font-weight:900;letter-spacing:.08em}.q17-live:before{content:"";display:inline-block;width:7px;height:7px;border-radius:50%;background:#e94f57;margin-right:5px;animation:q17live 1s infinite}',
 '.q17-camp-stats{display:flex;gap:7px;padding:8px 12px;background:#151c21;border-bottom:1px solid #313b43;flex-wrap:wrap}.q17-camp-stat{background:#0b1014;border:1px solid #34414a;padding:6px 10px;font-size:9px;color:#94a0a8}.q17-camp-stat b{display:block;color:#eef2f4;font-size:15px;margin-top:1px}',
 '.q17-camp-map-wrap{padding:10px 12px;overflow:auto}.q17-camp-map{position:relative;min-width:760px;width:100%;aspect-ratio:16/7.2;min-height:385px;overflow:hidden;border:1px solid #536158;background:linear-gradient(#1d2a2a 0 13%,#28342c 13% 74%,#1a211d 74% 100%);box-shadow:inset 0 0 55px #0009}',
 '.q17-camp-map:before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(0deg,#fff0 0 3px,#ffffff07 3px 4px);pointer-events:none;z-index:6}.q17-camp-map:after{content:"CAM-03  •  LIVE";position:absolute;right:10px;top:8px;color:#c8d2ce99;font:700 9px ui-monospace,monospace;letter-spacing:.12em;z-index:7}',
 '.q17-map-ground-road{position:absolute;left:3%;right:3%;top:57%;height:16%;background:#4b4e45;transform:skewY(-1deg);box-shadow:inset 0 2px #6e6d5e,inset 0 -2px #242722}.q17-map-ground-road:after{content:"";position:absolute;left:2%;right:2%;top:48%;height:2px;background:repeating-linear-gradient(90deg,#c2b35d 0 18px,transparent 18px 34px);opacity:.55}',
 '.q17-zone-mark{position:absolute;top:14%;bottom:9%;border:1px dashed #a5b5ab25;pointer-events:none;transition:.25s}.q17-zone-mark.residential{left:5%;width:31%}.q17-zone-mark.supply{left:36%;width:33%}.q17-zone-mark.gate{left:69%;right:4%}.q17-zone-mark.danger{border-color:#c34f5577;box-shadow:inset 0 0 45px #8f242633}.q17-zone-label{position:absolute;left:7px;top:7px;background:#08100dbb;border:1px solid #506057;color:#b9c9c0;padding:4px 6px;font-size:9px;font-weight:900}.q17-zone-label small{display:block;color:#77867f;font-size:7px;font-weight:600}',
 '.q17-tent{position:absolute;width:10%;height:19%;background:#6e6650;clip-path:polygon(50% 0,100% 100%,0 100%);filter:drop-shadow(0 8px 6px #0006)}.q17-tent:after{content:"";position:absolute;left:43%;bottom:0;width:15%;height:48%;background:#25251f}.q17-tent.t1{left:9%;top:25%}.q17-tent.t2{left:21%;top:29%;transform:scale(.9)}.q17-med{position:absolute;left:8%;top:52%;width:20%;height:14%;background:#8a8d7d;border:4px solid #4c514a;box-shadow:0 8px 12px #0005}.q17-med:before{content:"의무막사";position:absolute;left:8px;top:6px;font-size:8px;font-weight:900;color:#202622}.q17-med:after{content:"+";position:absolute;right:8px;top:0;color:#7d2327;font-size:28px;font-weight:1000}',
 '.q17-warehouse{position:absolute;left:41%;top:24%;width:19%;height:27%;background:#5f665f;border:5px solid #39413d;box-shadow:0 9px 14px #0006}.q17-warehouse:before{content:"배급 창고";position:absolute;left:8px;top:7px;color:#d3d6ce;font-size:9px;font-weight:900}.q17-warehouse:after{content:"";position:absolute;left:12%;right:12%;bottom:-14%;height:30%;background:repeating-linear-gradient(90deg,#71583d 0 16%,#8a6a46 16% 31%);border:2px solid #4d3d2f}.q17-water{position:absolute;left:61%;top:31%;width:5%;height:19%;border-radius:50% 50% 18% 18%;background:#53646c;border:3px solid #303c42;box-shadow:0 7px 9px #0005}.q17-water:after{content:"물";position:absolute;left:50%;top:34%;transform:translateX(-50%);font-size:8px;color:#c2d9e2;font-weight:900}',
 '.q17-fence{position:absolute;right:4%;top:18%;bottom:9%;width:2px;background:#747d76;box-shadow:-8px 0 #3c4540,8px 0 #3c4540}.q17-fence:after{content:"";position:absolute;right:-7px;top:0;width:17px;height:100%;background:repeating-linear-gradient(45deg,transparent 0 8px,#8f999033 8px 10px)}.q17-gatehouse{position:absolute;right:8%;top:24%;width:11%;height:25%;background:#515b56;border:4px solid #303934;box-shadow:0 8px 12px #0006}.q17-gatehouse:before{content:"경계초소";position:absolute;left:7px;top:7px;font-size:8px;font-weight:900;color:#d9dedb}.q17-tower{position:absolute;right:22%;top:18%;width:7%;height:34%;border-left:5px solid #5f665f;border-right:5px solid #5f665f}.q17-tower:before{content:"";position:absolute;left:-40%;top:0;width:180%;height:22%;background:#626c67;border:3px solid #373e3a}.q17-tower:after{content:"";position:absolute;left:47%;top:22%;bottom:0;width:3px;background:#7b837d;transform:rotate(16deg);transform-origin:top}',
 '.q17-crate{position:absolute;width:4.3%;height:9%;background:#6f573d;border:2px solid #3f3326;box-shadow:0 5px 8px #0005}.q17-crate.c1{left:40%;top:54%}.q17-crate.c2{left:46%;top:57%}.q17-crate.c3{left:63%;top:56%}',
 '#q17CampEntityLayer{position:absolute;inset:0;z-index:5}.q17-map-entity{position:absolute;width:62px;height:83px;transform:translate(-50%,-78%);background:transparent;border:0;color:#fff;padding:0;cursor:pointer;transition:left .44s linear,top .44s linear;filter:drop-shadow(0 6px 4px #0007)}.q17-map-entity img{display:block;height:57px;max-width:58px;margin:0 auto;object-fit:contain;transform-origin:50% 80%;animation:q17walk .78s ease-in-out infinite}.q17-map-entity.face-left img{transform:scaleX(-1)}.q17-map-entity b{display:block;margin-top:-1px;font-size:8px;text-shadow:0 1px 2px #000;background:#09100dc7;padding:1px 3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.q17-map-entity small{display:block;font-size:7px;color:#b4c0ba;background:#09100dc7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.q17-map-entity.bitten small,.q17-map-entity.infected small{color:#f0cd70}.q17-map-entity.zombie small{color:#ff868b}.q17-map-entity.threat{filter:drop-shadow(0 0 7px #a83238) drop-shadow(0 6px 4px #0008)}.q17-map-bubble{position:absolute;right:4px;top:0;z-index:2;width:18px;height:18px;line-height:18px;border-radius:50%;background:#b74349;color:#fff;font-size:10px;font-weight:1000;box-shadow:0 0 10px #b74349}',
 '.q17-camp-focus{position:absolute;left:10px;bottom:8px;z-index:7;display:none;background:#08100de8;border:1px solid #536158;padding:7px 9px;min-width:170px;pointer-events:none}.q17-camp-focus.show{display:block}.q17-camp-focus b,.q17-camp-focus span,.q17-camp-focus small{display:block}.q17-camp-focus span{font-size:8px;color:#96a59e}.q17-camp-focus small{font-size:8px;color:#d2dbd6;margin-top:2px}',
 '.q17-camp-bottom{display:grid;grid-template-columns:1fr auto;gap:10px;padding:0 12px 12px}.q17-camp-log{background:#090d10;border:1px solid #303941;padding:9px;max-height:96px;overflow:auto;font-size:9px;line-height:1.6;color:#aab4ba}.q17-camp-log b{color:#e8c65e}.q17-camp-actions{display:flex;align-items:stretch}.q17-camp-respond{border:1px solid #a64a50;background:#3b1a1e;color:#ffb0b4;padding:10px 14px;font-weight:950;cursor:pointer;min-width:170px}.q17-camp-respond:disabled{opacity:.38;cursor:not-allowed}',
 '#q17GlobalAlert{position:fixed;left:50%;bottom:72px;transform:translateX(-50%);z-index:254;display:none;align-items:center;gap:10px;background:#31191c;border:1px solid #98454b;color:#f5c0c2;padding:8px 10px;box-shadow:0 8px 25px #000a;font-size:10px}#q17GlobalAlert.show{display:flex}#q17GlobalAlert button{border:0;background:#d2b450;color:#171717;font-weight:900;padding:7px 10px;cursor:pointer}',
 '@keyframes q17viewflash{50%{box-shadow:0 0 22px #d94e5688;border-color:#e45e65}}@keyframes q17live{50%{opacity:.25}}@keyframes q17walk{50%{translate:0 -2px}}',
 '@media(max-width:760px){#q17ViewDock{bottom:6px;width:calc(100% - 12px)}.q17-view-btn{flex:1;min-width:0;padding:8px 5px;font-size:9px}.q17-camp-card{max-height:94vh}.q17-camp-map-wrap{padding:6px}.q17-camp-bottom{grid-template-columns:1fr}.q17-camp-respond{width:100%}#q17GlobalAlert{bottom:59px;max-width:calc(100% - 18px)}}'
 ].join('\n');
 document.head.appendChild(css);

 const dock=document.createElement('div');dock.id='q17ViewDock';
 dock.innerHTML='<button type="button" class="q17-view-btn active" data-view="station">검역소<em class="q17-view-badge" id="q17ViewStationBadge" hidden></em></button><button type="button" class="q17-view-btn" data-view="isolation">격리시설<em class="q17-view-badge" id="q17ViewIsoBadge" hidden></em></button><button type="button" class="q17-view-btn" data-view="camp">생존자 캠프<em class="q17-view-badge" id="q17ViewCampBadge" hidden></em></button>';
 dock.style.display='none';document.body.appendChild(dock);

 const camp=document.createElement('div');camp.id='q17Camp';
 camp.innerHTML='<div class="q17-camp-card"><div class="q17-camp-head"><div><h2>CAMP-17 생존자 캠프</h2><span class="q17-live">LIVE CCTV · MAP VIEW</span></div><div><small id="q17CampClock" style="color:#829089;margin-right:12px">00:00</small><b id="q17CampState">정상 운영</b></div></div><div class="q17-camp-stats"><div class="q17-camp-stat">안전<b id="q17CampSafe">0</b></div><div class="q17-camp-stat">물림<b id="q17CampBitten">0</b></div><div class="q17-camp-stat">좀비<b id="q17CampZombie">0</b></div><div class="q17-camp-stat">CCTV<b>실시간 추적</b></div></div><div class="q17-camp-map-wrap"><div class="q17-camp-map" id="q17CampMap"><div class="q17-map-ground-road"></div><div class="q17-zone-mark residential" data-zone="residential"><div class="q17-zone-label">주거구역<small>숙소 · 의무막사</small></div></div><div class="q17-zone-mark supply" data-zone="supply"><div class="q17-zone-label">배급·작업구역<small>식량 · 식수 · 물자</small></div></div><div class="q17-zone-mark gate" data-zone="gate"><div class="q17-zone-label">경계구역<small>철책 · 초소 · 출입문</small></div></div><div class="q17-tent t1"></div><div class="q17-tent t2"></div><div class="q17-med"></div><div class="q17-warehouse"></div><div class="q17-water"></div><div class="q17-crate c1"></div><div class="q17-crate c2"></div><div class="q17-crate c3"></div><div class="q17-tower"></div><div class="q17-gatehouse"></div><div class="q17-fence"></div><div id="q17CampEntityLayer"></div><div class="q17-camp-focus" id="q17CampFocus"></div></div></div><div class="q17-camp-bottom"><div class="q17-camp-log" id="q17CampLog"></div><div class="q17-camp-actions"><button type="button" class="q17-camp-respond" id="q17CampRespond">현장 출동 · 위험 없음</button></div></div></div>';
 document.body.appendChild(camp);

 const alert=document.createElement('div');alert.id='q17GlobalAlert';
 alert.innerHTML='<span id="q17GlobalAlertText"></span><button type="button" id="q17GlobalRespond">외곽 출동</button>';
 document.body.appendChild(alert);

 dock.addEventListener('click',function(e){const b=e.target.closest('.q17-view-btn');if(b)switchView(b.dataset.view)});
 document.getElementById('q17CampRespond').addEventListener('click',respondCamp);
 document.getElementById('q17GlobalRespond').addEventListener('click',respondGlobal);
 document.getElementById('q17CampEntityLayer').addEventListener('click',function(e){const n=e.target.closest('.q17-map-entity');if(n)inspectEntity(n.dataset.key)});
 camp.addEventListener('click',function(e){if(e.target===camp)switchView('station')});

 const oldIsoBtn=document.getElementById('q17IsoBtn');
 if(oldIsoBtn)oldIsoBtn.addEventListener('click',function(){currentView='isolation';renderDock()});
 const oldIsoClose=document.getElementById('q17IsoClose');
 if(oldIsoClose)oldIsoClose.addEventListener('click',function(){currentView='station';renderDock()});
 const iso=document.getElementById('q17Isolation');
 if(iso)iso.addEventListener('click',function(e){if(e.target===iso){currentView='station';renderDock()}});

 if(window.Q17Outbreak&&typeof window.Q17Outbreak.reset==='function'){
  const oldReset=window.Q17Outbreak.reset;
  window.Q17Outbreak.reset=function(){const v=oldReset.apply(this,arguments);resetCamp();return v};
 }
 const activate=function(){dock.style.display='flex';renderAll()};
 const startV2=document.getElementById('startBtnV2'),startLegacy=document.getElementById('startBtn');
 if(startV2)startV2.addEventListener('click',function(){setTimeout(activate,80)});
 else if(startLegacy)startLegacy.addEventListener('click',function(){setTimeout(activate,80)});
 else activate();

 resetCamp();
 setInterval(simulationStep,SIM_MS);
 setInterval(isolationTick,5000);
}
mount();

window.Q17Surveillance={
 onCampBreach:onCampBreach,
 admitResident:admitResident,
 registerGlobalOutbreak:registerGlobalOutbreak,
 openCamp:function(){switchView('camp')},
 switchView:switchView,
 snapshot:function(){return{residents:residents.map(function(r){return Object.assign({},r)}),threats:threats.map(function(t){return Object.assign({},t)}),globalIncident:globalIncident}}
};
})();
(()=>{'use strict';
if(!window.Q17Outbreak)return;

const api=window.Q17Outbreak;
const original={
 isCombatActive:api.isCombatActive?api.isCombatActive.bind(api):()=>false,
 respondCamp:api.respondCamp?api.respondCamp.bind(api):null,
 respondGlobal:api.respondGlobal?api.respondGlobal.bind(api):null,
 reset:api.reset?api.reset.bind(api):null
};
const ASSET='../../assets/game/characters/people/kenney-platformer-characters/';
const SPRITES={
 player:ASSET+'player/poses/player-stand.png',
 playerWalk1:ASSET+'player/poses/player-walk1.png',
 playerWalk2:ASSET+'player/poses/player-walk2.png',
 playerShoot:ASSET+'player/poses/player-action1.png',
 playerHurt:ASSET+'player/poses/player-hurt.png',
 zombie:ASSET+'zombie/poses/zombie-stand.png',
 zombieWalk1:ASSET+'zombie/poses/zombie-walk1.png',
 zombieWalk2:ASSET+'zombie/poses/zombie-walk2.png',
 zombieHurt:ASSET+'zombie/poses/zombie-hurt.png',
 female:ASSET+'female/poses/female-stand.png',
 adventurer:ASSET+'adventurer/poses/adventurer-stand.png',
 soldier:ASSET+'soldier/poses/soldier-stand.png'
};
const images={};
Object.keys(SPRITES).forEach(k=>{const i=new Image();i.src=SPRITES[k];images[k]=i;});
const avatarImage=new Image();let avatarReady=false;
function avatarSource(){
 try{
  const h=parent&&parent!==window&&parent.location.origin===location.origin?parent:window;
  let src=h.localStorage?.getItem('kidscade-avatar-studio-preview')||localStorage.getItem('kidscade-avatar-studio-preview')||'';
  if(!src&&typeof h.renderAvatarSVG==='function'){const svg=h.renderAvatarSVG();if(svg)src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)}
  return src||'../../assets/game/characters/kidscade-avatar-v3/school-starter/guest-default.png'
 }catch(_){return '../../assets/game/characters/kidscade-avatar-v3/school-starter/guest-default.png'}
}
function loadKidscadeAvatar(){avatarReady=false;avatarImage.onload=()=>avatarReady=true;avatarImage.onerror=()=>avatarReady=false;avatarImage.src=avatarSource()}
loadKidscadeAvatar();window.addEventListener('kidscade-avatar-change',loadKidscadeAvatar);

const style=document.createElement('style');
style.textContent=[
'#q17FieldMission{position:fixed;inset:0;z-index:370;background:#05090bef;display:none;align-items:center;justify-content:center;padding:10px;color:#e9eef0;font-family:system-ui,sans-serif}',
'#q17FieldMission.show{display:flex}',
'.q17-field-shell{width:min(1120px,100%);max-height:98dvh;background:#11171b;border:1px solid #53616a;box-shadow:0 24px 90px #000;display:flex;flex-direction:column;position:relative}',
'.q17-field-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 12px;background:#172027;border-bottom:1px solid #3b4850;flex-wrap:wrap}',
'.q17-field-title{font-weight:1000;letter-spacing:.04em}.q17-field-title small{display:block;color:#89969d;font-size:9px;margin-top:2px}',
'.q17-field-stats{display:flex;gap:10px;flex-wrap:wrap;font-size:11px}.q17-field-stats span{background:#0b1014;border:1px solid #344048;padding:5px 7px}.q17-field-stats b{color:#fff}',
'#q17FieldCanvas{width:100%;height:auto;aspect-ratio:16/9;display:block;background:#182328;touch-action:none;cursor:crosshair;image-rendering:pixelated}',
'.q17-field-help{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:7px 11px;font-size:10px;color:#98a4aa;background:#0d1216;border-top:1px solid #29343b}',
'.q17-field-mobile{display:none;grid-template-columns:1fr 1fr;gap:8px;padding:8px;background:#0b1013;border-top:1px solid #2d3940}.q17-field-pad,.q17-field-actions{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.q17-field-actions{grid-template-columns:repeat(2,1fr)}',
'.q17-field-mobile button,.q17-field-brief button{min-height:46px;border:1px solid #58656d;background:#202b32;color:#eff3f4;font-weight:900;border-radius:6px;touch-action:none}.q17-field-mobile button.active{background:#3b4c56;transform:translateY(1px)}',
'.q17-field-mobile .fire{background:#7f2d33;border-color:#bd5158}.q17-field-mobile .interact{background:#68572c;border-color:#aa9145}',
'.q17-field-brief{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:5;width:min(590px,88%);background:#091014f2;border:1px solid #697780;box-shadow:0 20px 70px #000;padding:18px 20px}',
'.q17-field-brief h2{margin:0 0 8px;color:#f0d36d}.q17-field-brief p{margin:7px 0;color:#c1c9cd;line-height:1.55;font-size:13px}.q17-field-brief .mission{background:#121d22;border-left:4px solid #c7aa4a;padding:8px 10px;color:#f3f0d7}.q17-field-brief .actions{display:flex;gap:8px;margin-top:13px}.q17-field-brief .start{background:#b99f43;color:#111;border:0;flex:1}.q17-field-brief .retreat{background:#25181a;border-color:#7c4146;color:#ffc1c4}',
'.q17-field-toast{position:absolute;left:50%;bottom:58px;transform:translateX(-50%);background:#081015e8;border:1px solid #52616a;padding:7px 11px;font-size:11px;font-weight:850;opacity:0;transition:.2s;pointer-events:none}.q17-field-toast.show{opacity:1}',
'@media(max-width:720px){#q17FieldMission{padding:0;align-items:flex-start}.q17-field-shell{width:100%;max-height:100dvh}.q17-field-head{padding:7px 8px}.q17-field-stats{gap:5px;font-size:9px}.q17-field-stats span{padding:3px 5px}.q17-field-help{display:none}.q17-field-mobile{display:grid}.q17-field-brief{top:39%;padding:14px}.q17-field-brief p{font-size:12px}}'
].join('\n');
document.head.appendChild(style);

const host=document.createElement('div');
host.id='q17FieldMission';
host.innerHTML='<div class="q17-field-shell"><div class="q17-field-head"><div class="q17-field-title" id="q17FieldTitle">CAMP-17 현장 출동<small id="q17FieldSub">검역 결과가 실제 현장 상황으로 이어집니다.</small></div><div class="q17-field-stats"><span>체력 <b id="q17FieldHp">100</b></span><span>탄약 <b id="q17FieldAmmo">12 / 36</b></span><span>부품 <b id="q17FieldScrap">0</b></span><span>위협 <b id="q17FieldThreat">0</b></span><span id="q17FieldSurvivorWrap">생존자 <b id="q17FieldSurvivor">0</b></span></div></div><canvas id="q17FieldCanvas" width="960" height="540"></canvas><div class="q17-field-help"><span>WASD/방향키 이동 · 마우스/터치 사격 · R 재장전 · E 상호작용</span><span>보급상자를 열어 탄약·의약품·부품을 확보하고 자동포탑을 재가동할 수 있습니다.</span></div><div class="q17-field-mobile"><div class="q17-field-pad"><span></span><button data-field-hold="up">▲</button><span></span><button data-field-hold="left">◀</button><button data-field-hold="down">▼</button><button data-field-hold="right">▶</button></div><div class="q17-field-actions"><button class="fire" id="q17FieldFire">사격</button><button id="q17FieldReload">재장전</button><button class="interact" id="q17FieldInteract">상호작용</button><button id="q17FieldRetreat">철수</button></div></div><div class="q17-field-brief" id="q17FieldBrief"><h2 id="q17FieldBriefTitle"></h2><p id="q17FieldBriefText"></p><div class="mission" id="q17FieldObjective"></div><div class="actions"><button class="start" id="q17FieldStart">출동 시작</button><button class="retreat" id="q17FieldBriefRetreat">현장 철수</button></div></div><div class="q17-field-toast" id="q17FieldToast"></div></div>';
document.body.appendChild(host);

const canvas=document.getElementById('q17FieldCanvas'),ctx=canvas.getContext('2d');
const ui={
 title:document.getElementById('q17FieldTitle'),sub:document.getElementById('q17FieldSub'),
 hp:document.getElementById('q17FieldHp'),ammo:document.getElementById('q17FieldAmmo'),
 scrap:document.getElementById('q17FieldScrap'),threat:document.getElementById('q17FieldThreat'),
 survivor:document.getElementById('q17FieldSurvivor'),survivorWrap:document.getElementById('q17FieldSurvivorWrap'),
 brief:document.getElementById('q17FieldBrief'),briefTitle:document.getElementById('q17FieldBriefTitle'),
 briefText:document.getElementById('q17FieldBriefText'),objective:document.getElementById('q17FieldObjective'),
 toast:document.getElementById('q17FieldToast')
};
const W=960,H=540;
const keys={};
const pointer={x:W*.65,y:H*.5,down:false};
let raf=0,last=0,toastTimer=0;
const state={
 active:false,started:false,mode:'camp',done:null,payload:null,
 player:null,zombies:[],bullets:[],survivors:[],pickups:[],crates:[],obstacles:[],
 turret:null,wave:0,waves:[],spawnQueue:0,spawnCd:0,wavePause:0,
 elapsed:0,losses:0,rescued:0,medCharges:1,shake:0,flash:0,
 zombieSeq:0,survivorSeq:0,pendingThreats:[],explicitCampThreats:false
};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function bridge(){return window.Q17Bridge&&typeof window.Q17Bridge.applyOutbreakResult==='function'?window.Q17Bridge:null}
function toast(msg){
 ui.toast.textContent=msg;ui.toast.classList.add('show');clearTimeout(toastTimer);
 toastTimer=setTimeout(()=>ui.toast.classList.remove('show'),1500);
}
function rectHitCircle(r,e,pad=0){
 const nx=clamp(e.x,r.x-pad,r.x+r.w+pad),ny=clamp(e.y,r.y-pad,r.y+r.h+pad);
 return Math.hypot(e.x-nx,e.y-ny)<e.r;
}
function blocked(e){
 return state.obstacles.some(o=>rectHitCircle(o,e,0));
}
function blockedAt(e,x,y){
 const ox=e.x,oy=e.y;e.x=x;e.y=y;const hit=blocked(e);e.x=ox;e.y=oy;return hit
}
function moveEntity(e,dx,dy){
 const ox=e.x,oy=e.y,nx=clamp(ox+dx,e.r+9,W-e.r-9),ny=clamp(oy+dy,e.r+9,H-e.r-9);
 if(!blockedAt(e,nx,ny)){e.x=nx;e.y=ny;return Math.hypot(e.x-ox,e.y-oy)}
 if(!blockedAt(e,nx,oy))e.x=nx;
 if(!blockedAt(e,e.x,ny))e.y=ny;
 return Math.hypot(e.x-ox,e.y-oy)
}
function moveTowardSmart(e,tx,ty,speed,dt){
 const dx=tx-e.x,dy=ty-e.y,d=Math.hypot(dx,dy);if(d<.1)return 0;
 const step=Math.min(d,speed*dt),base=Math.atan2(dy,dx),offsets=[0,.42,-.42,.82,-.82,1.18,-1.18,1.57,-1.57];
 let best=null,bestD=Infinity;
 for(const off of offsets){
  const nx=clamp(e.x+Math.cos(base+off)*step,e.r+9,W-e.r-9),ny=clamp(e.y+Math.sin(base+off)*step,e.r+9,H-e.r-9);
  if(blockedAt(e,nx,ny))continue;
  const nd=Math.hypot(tx-nx,ty-ny)+(Math.abs(off)*.12);
  if(nd<bestD){bestD=nd;best={x:nx,y:ny}}
 }
 if(!best)return 0;const moved=Math.hypot(best.x-e.x,best.y-e.y);e.x=best.x;e.y=best.y;return moved
}
function findWalkable(x,y,r=10){
 const probe={x:clamp(x,r+10,W-r-10),y:clamp(y,r+10,H-r-10),r};
 if(!blocked(probe))return{x:probe.x,y:probe.y};
 for(let radius=18;radius<=126;radius+=18){
  for(let i=0;i<16;i++){
   const a=i/16*Math.PI*2,nx=clamp(x+Math.cos(a)*radius,r+10,W-r-10),ny=clamp(y+Math.sin(a)*radius,r+10,H-r-10);
   probe.x=nx;probe.y=ny;if(!blocked(probe))return{x:nx,y:ny}
  }
 }
 return{x:460,y:274}
}
function segmentHitsRect(x1,y1,x2,y2,r,pad=2){
 const minX=r.x-pad,maxX=r.x+r.w+pad,minY=r.y-pad,maxY=r.y+r.h+pad;
 let t0=0,t1=1,dx=x2-x1,dy=y2-y1;
 const clip=(p,q)=>{if(Math.abs(p)<1e-9)return q>=0;const t=q/p;if(p<0){if(t>t1)return false;if(t>t0)t0=t}else{if(t<t0)return false;if(t<t1)t1=t}return true};
 return clip(-dx,x1-minX)&&clip(dx,maxX-x1)&&clip(-dy,y1-minY)&&clip(dy,maxY-y1)
}
function segmentBlocked(x1,y1,x2,y2){return state.obstacles.some(o=>segmentHitsRect(x1,y1,x2,y2,o,1))}
function addObstacle(x,y,w,h,label){state.obstacles.push({x,y,w,h,label});}
function makeMap(){
 state.obstacles=[];
 addObstacle(0,0,W,18,'북쪽 울타리');addObstacle(0,H-18,W,18,'남쪽 울타리');
 addObstacle(0,0,18,H,'서쪽 울타리');addObstacle(W-18,0,18,H,'동쪽 울타리');
 addObstacle(65,55,185,122,'지휘소');addObstacle(292,52,210,132,'격리동');
 addObstacle(548,58,184,118,'보급창고');addObstacle(455,374,92,72,'의무막사 텐트');
 addObstacle(118,314,92,48,'텐트');addObstacle(230,378,100,48,'텐트');
 addObstacle(770,70,38,132,'컨테이너');addObstacle(815,334,72,44,'차량');
 addObstacle(640,404,64,46,'바리케이드');
}
function resetMission(mode,payload,done){
 state.active=true;state.started=false;state.mode=mode;state.payload=payload||{};state.done=typeof done==='function'?done:null;
 state.zombies=[];state.bullets=[];state.survivors=[];state.pickups=[];state.crates=[];state.wave=0;state.spawnQueue=0;state.spawnCd=0;state.wavePause=0;
 state.elapsed=0;state.losses=0;state.rescued=0;state.medCharges=1;state.shake=0;state.flash=0;state.zombieSeq=0;state.survivorSeq=0;state.pendingThreats=[];state.explicitCampThreats=false;keys.mobileFire=false;pointer.down=false;
 makeMap();
 state.player={x:460,y:274,r:12,hp:100,maxHp:100,ammo:12,reserve:36,reload:0,shotCd:0,scrap:0,ifr:0,facing:1};
 state.turret={x:720,y:286,r:15,active:false,cooldown:0,range:190};
 state.crates=[
  {x:520,y:234,r:15,opened:false,loot:['ammo','scrap','scrap']},
  {x:746,y:446,r:15,opened:false,loot:['med','ammo','scrap']},
  {x:350,y:288,r:15,opened:false,loot:['ammo','scrap']}
 ];
 if(mode==='camp'){
  const sourceResidents=Array.isArray(state.payload.residents)?state.payload.residents.filter(r=>r&&r.status!=='lost'&&r.status!=='zombie').slice(0,8):[];
  const fallbackSpawns=[[118,248],[166,248],[214,248],[118,293],[166,293],[214,293],[262,293],[305,248]];
  const residentCount=sourceResidents.length||clamp(Number(state.payload.survivorCount)||5,3,8);
  for(let i=0;i<residentCount;i++){
   const src=sourceResidents[i]||{},rawX=sourceResidents.length?Number(src.x)*9.6:fallbackSpawns[i][0],rawY=sourceResidents.length?Number(src.y)*5.4:fallbackSpawns[i][1],p=findWalkable(rawX,rawY,10);
   state.survivors.push({id:String(src.id??(++state.survivorSeq)),name:src.name||('생존자 '+(i+1)),role:src.role||'',sourceStatus:src.status||'safe',x:p.x,y:p.y,r:10,hp:src.status==='bitten'?2:3,alive:true,rescued:false,phase:i*.8,sprite:src.sprite|| (i%2?'female':'adventurer'),escorted:false});
  }
  const sourceThreats=Array.isArray(state.payload.threats)?state.payload.threats.filter(Boolean):[];
  state.explicitCampThreats=sourceThreats.length>0;
  state.pendingThreats=sourceThreats.map((src,i)=>{const p=findWalkable(Number(src.x)*9.6,Number(src.y)*5.4,11);return{id:String(src.id??('camp'+i)),name:src.name||'캠프 감염자',x:p.x,y:p.y,phase:src.phase||'zombie'}})
  const t=clamp(Number(state.payload.threatCount)||Math.max(1,sourceThreats.length),1,8);
  state.waves=state.explicitCampThreats?[]:[t];
  ui.title.childNodes[0].nodeValue='CAMP-17 생존자 캠프 출동';
  ui.sub.textContent='감염자를 차단하고 주민을 지휘소 안전구역으로 유도하세요.';
  ui.briefTitle.textContent='생존자 캠프 감염 경보';
  ui.briefText.innerHTML='검역을 통과한 감염자가 캠프 안으로 들어왔습니다. 주민은 혼자 대피하지 못합니다. <b>가까이 붙어 호위</b>해야 안전구역으로 움직이며, 보급상자의 부품으로 자동포탑을 재가동할 수 있습니다.';
  ui.objective.textContent='목표 · 주민 곁에서 호위해 안전구역까지 대피 + 위협 제거';
 }else if(mode==='isolation'){
  state.player.x=390;state.player.y=238;state.waves=[Math.max(1,Number(state.payload.count)||1)];
  ui.title.childNodes[0].nodeValue='CAMP-17 격리동 직접 진입';
  ui.sub.textContent='격리동 앞마당 감염자를 제거하고 시설을 다시 확보하세요.';
  ui.briefTitle.textContent='격리동 내부 붕괴';
  ui.briefText.innerHTML='고위험 격리실에서 변이가 확인됐습니다. 격리동 전면을 확보하고 의무막사·보급창고를 활용해 남은 감염자를 제거하세요.';
  ui.objective.textContent='목표 · 격리동 감염자 전원 제거';
 }else if(mode==='patrol'){
  state.player.x=330;state.player.y=258;
  const inf=clamp(Number(state.payload.infection)||0,0,99);
  const base=clamp(4+Math.floor(inf/9),4,7);
  state.waves=[base,Math.max(3,base-1)];
  ui.title.childNodes[0].nodeValue='CAMP-17 정기 현장 순찰';
  ui.sub.textContent='검역이 안정적이어도 외곽 잔존 감염원을 직접 확인합니다.';
  ui.briefTitle.textContent='정기 순찰 · 잔존 감염원 수색';
  ui.briefText.innerHTML='검역선이 안정된 주에도 현장 위험은 남습니다. 짧은 2개 구역을 순찰하며 잔존 감염자를 제거하고 보급 상태를 점검하세요. <b>정확한 검역은 더 쉬운 순찰</b>로 이어집니다.';
  ui.objective.textContent='목표 · 2개 순찰 구역 확보';
 }else{
  state.player.x=280;state.player.y=258;state.waves=[5,6,7];
  ui.title.childNodes[0].nodeValue='CAMP-17 외곽 격리선 출동';
  ui.sub.textContent='동쪽 검문 게이트에서 밀려오는 감염자 웨이브를 저지하세요.';
  ui.briefTitle.textContent='외곽 격리선 붕괴';
  ui.briefText.innerHTML='도시 감염도가 임계치에 접근했습니다. 검문 게이트를 통해 들어오는 감염자들을 막고, 현장 부품으로 자동포탑을 살려 방어선을 유지하세요.';
  ui.objective.textContent='목표 · 3개 웨이브 방어';
 }
 ui.survivorWrap.style.display=mode==='camp'?'':'none';
 host.classList.add('show');ui.brief.style.display='block';updateHUD();draw();
 cancelAnimationFrame(raf);last=performance.now();raf=requestAnimationFrame(loop);
}
function spawnZombie(seed=null){
 let x,y;
 if(seed){x=seed.x;y=seed.y}else{
  const side=Math.random()<.78?'right':(Math.random()<.5?'top':'bottom');
  if(side==='right'){x=920;y=205+Math.random()*250}else if(side==='top'){x=540+Math.random()*340;y=28}else{x=620+Math.random()*280;y=510}
  const p=findWalkable(x,y,11);x=p.x;y=p.y
 }
 const elite=!seed&&state.wave>=2&&Math.random()<.22;
 state.zombies.push({id:seed?.id||('z'+(++state.zombieSeq)),name:seed?.name||'감염자',sourcePhase:seed?.phase||'zombie',x,y,r:11,hp:elite?4:2,speed:elite?48:55+Math.random()*8,attack:0,hit:0,phase:Math.random()*6.2,elite});
}
function startWave(){
 if(state.wave>=state.waves.length)return;
 state.spawnQueue=state.waves[state.wave];state.spawnCd=.15;state.wave++;
 toast('웨이브 '+state.wave+' / '+state.waves.length+' 접근');
}
function nearestTarget(z){
 let best=state.player,bd=dist(z,state.player);
 if(state.mode==='camp'){
  state.survivors.forEach(s=>{if(!s.alive||s.rescued)return;const d=dist(z,s);if(d<bd*1.75){best=s;bd=d}});
 }
 return best;
}
function updateSurvivors(dt){
 if(state.mode!=='camp')return;
 const safe={x:270,y:205};
 state.survivors.forEach((s,i)=>{
  if(!s.alive||s.rescued)return;
  const escortDistance=dist(state.player,s);
  if(escortDistance>145){s.escorted=false;return}
  s.escorted=true;
  const dx=safe.x-s.x,dy=safe.y-s.y,d=Math.hypot(dx,dy)||1;
  const threatened=state.zombies.some(z=>dist(z,s)<90);
  const speed=threatened?18:25;
  moveTowardSmart(s,safe.x,safe.y,speed,dt);
  if(Math.hypot(s.x-safe.x,s.y-safe.y)<28){s.rescued=true;state.rescued++;toast('호위 성공 · 생존자 안전구역 도착');}
 });
}
function updateZombies(dt){
 state.zombies.forEach(z=>{
  z.hit=Math.max(0,z.hit-dt);z.attack=Math.max(0,z.attack-dt);
  const target=nearestTarget(z),dx=target.x-z.x,dy=target.y-z.y,d=Math.hypot(dx,dy)||1;
  moveTowardSmart(z,target.x,target.y,z.speed,dt);
  if(dist(z,target)<z.r+target.r+4&&z.attack<=0){
   z.attack=.75;
   if(target===state.player){
    if(state.player.ifr<=0){state.player.hp-=z.elite?16:10;state.player.ifr=.55;state.flash=.35;state.shake=6;}
   }else{
    target.hp-=1;if(target.hp<=0){target.alive=false;state.losses++;toast('생존자 1명이 위험에 처했습니다.');}
   }
  }
 });
 state.zombies=state.zombies.filter(z=>z.hp>0);
}
function shootAt(x,y){
 const p=state.player;if(!state.active||!state.started||p.reload>0||p.shotCd>0)return;
 if(p.ammo<=0){startReload();return}
 const dx=x-p.x,dy=y-p.y,d=Math.hypot(dx,dy)||1;
 p.ammo--;p.shotCd=.16;p.facing=dx<0?-1:1;
 state.bullets.push({x:p.x,y:p.y,vx:dx/d*560,vy:dy/d*560,life:1.1});
 updateHUD();
}
function startReload(){
 const p=state.player;if(!state.active||!state.started||p.reload>0||p.ammo>=12||p.reserve<=0)return;
 p.reload=1.05;toast('재장전');
}
function updateBullets(dt){
 state.bullets.forEach(b=>{
  if(b.beam){b.life-=dt;return}
  const px=b.x,py=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
  if(b.x<0||b.y<0||b.x>W||b.y>H||segmentBlocked(px,py,b.x,b.y))b.life=0;
  for(const z of state.zombies){
   if(b.life<=0)break;
   if(Math.hypot(b.x-z.x,b.y-z.y)<z.r+4){
    z.hp--;z.hit=.12;b.life=0;
    if(z.hp<=0&&Math.random()<.38)state.pickups.push({x:z.x,y:z.y,r:8,type:Math.random()<.55?'scrap':'ammo'});
   }
  }
 });
 state.bullets=state.bullets.filter(b=>b.life>0);
}
function updatePickups(){
 const p=state.player;
 state.pickups=state.pickups.filter(it=>{
  if(dist(p,it)>p.r+it.r+6)return true;
  if(it.type==='ammo'){p.reserve=Math.min(72,p.reserve+8);toast('탄약 +8');}
  else if(it.type==='med'){p.hp=Math.min(p.maxHp,p.hp+25);toast('응급키트 · 체력 회복');}
  else{p.scrap++;toast('방어 부품 +1');}
  return false;
 });
}
function interact(){
 if(!state.active||!state.started)return;
 const p=state.player;
 const crate=state.crates.find(c=>!c.opened&&dist(p,c)<42);
 if(crate){
  crate.opened=true;crate.loot.forEach((type,i)=>state.pickups.push({x:crate.x+(i-1)*15,y:crate.y+22,r:8,type}));
  toast('보급상자를 열었습니다.');return;
 }
 if(dist(p,state.turret)<48&&!state.turret.active){
  if(p.scrap<3){toast('자동포탑 재가동에 부품 3개 필요');return}
  p.scrap-=3;state.turret.active=true;toast('자동포탑 재가동');updateHUD();return;
 }
 const med={x:610,y:330};
 if(Math.hypot(p.x-med.x,p.y-med.y)<58){
  if(state.medCharges<=0){toast('의무소 응급물품을 이미 사용했습니다.');return}
  state.medCharges--;p.hp=Math.min(100,p.hp+45);p.reserve=Math.min(72,p.reserve+12);toast('의무소 보급 · 체력/탄약 회복');updateHUD();return;
 }
 toast('가까운 상호작용 대상이 없습니다.');
}
function updateTurret(dt){
 const t=state.turret;t.cooldown=Math.max(0,t.cooldown-dt);if(!t.active||t.cooldown>0)return;
 let target=null,bd=t.range;
 state.zombies.forEach(z=>{const d=dist(t,z);if(d<bd&&!segmentBlocked(t.x,t.y,z.x,z.y)){bd=d;target=z}});
 if(target){target.hp-=1;target.hit=.12;t.cooldown=.46;state.bullets.push({x:t.x,y:t.y,vx:0,vy:0,life:.08,beam:true,tx:target.x,ty:target.y});}
}
function updatePlayer(dt){
 const p=state.player;p.ifr=Math.max(0,p.ifr-dt);p.shotCd=Math.max(0,p.shotCd-dt);
 if(p.reload>0){
  p.reload-=dt;if(p.reload<=0){const need=12-p.ammo,n=Math.min(need,p.reserve);p.ammo+=n;p.reserve-=n;updateHUD();}
 }
 let dx=0,dy=0;
 if(keys.a||keys.arrowleft)dx--;if(keys.d||keys.arrowright)dx++;
 if(keys.w||keys.arrowup)dy--;if(keys.s||keys.arrowdown)dy++;
 if(dx||dy){const d=Math.hypot(dx,dy);moveEntity(p,dx/d*125*dt,dy/d*125*dt);if(dx)p.facing=dx<0?-1:1;}
}
function missionComplete(){
 if(!(state.started&&state.wave>=state.waves.length&&state.spawnQueue<=0&&state.zombies.length===0&&state.wavePause<0))return false;
 if(state.mode==='camp'){
  const living=state.survivors.filter(s=>s.alive).length;
  if(living>0&&state.rescued<living)return false;
 }
 return true;
}
function update(dt){
 if(!state.active||!state.started)return;
 state.elapsed+=dt;state.flash=Math.max(0,state.flash-dt);state.shake=Math.max(0,state.shake-dt*10);
 updatePlayer(dt);
 if(pointer.down)shootAt(pointer.x,pointer.y);
 if(keys.mobileFire){let target=null,bd=9999;state.zombies.forEach(z=>{const d=dist(z,state.player);if(d<bd){bd=d;target=z}});if(target)shootAt(target.x,target.y);}
 updateSurvivors(dt);
 if(state.spawnQueue>0){
  state.spawnCd-=dt;if(state.spawnCd<=0){spawnZombie();state.spawnQueue--;state.spawnCd=.55+Math.random()*.35;}
 }else if(state.zombies.length===0){
  if(state.wave<state.waves.length){
   state.wavePause-=dt;if(state.wavePause<=0){state.wavePause=1.8;startWave();}
  }else state.wavePause-=dt;
 }
 updateZombies(dt);updateBullets(dt);updateTurret(dt);updatePickups();
 if(state.player.hp<=0){finish(false);return}
 if(state.mode==='camp'&&state.survivors.length&&state.survivors.every(s=>!s.alive||s.rescued)&&state.rescued===0){finish(false);return}
 if(missionComplete())finish(true);
 updateHUD();
}
function updateHUD(){
 const p=state.player;if(!p)return;
 ui.hp.textContent=Math.max(0,Math.ceil(p.hp));ui.ammo.textContent=p.ammo+' / '+p.reserve;ui.scrap.textContent=p.scrap;
 ui.threat.textContent=state.zombies.length+state.spawnQueue;
 if(state.mode==='camp')ui.survivor.textContent=(state.survivors.filter(s=>s.alive&&!s.rescued).length+state.rescued)+' · 안전 '+state.rescued;
}
function finish(won){
 if(!state.active)return;
 state.started=false;state.active=false;cancelAnimationFrame(raf);
 const mode=state.mode,losses=state.losses,done=state.done,b=bridge();
 host.classList.remove('show');pointer.down=false;
 if(mode==='camp'){
  if(b){
   if(won){const reduction=losses===0?4:Math.max(1,3-losses);b.applyOutbreakResult({won:true,infectionDelta:-reduction,trustDelta:-(losses*2),scoreDelta:Math.max(80,340-losses*70)});}
   else b.applyOutbreakResult({won:false,infectionDelta:5,trustDelta:-7,scoreDelta:-240});
  }
  if(done)setTimeout(()=>done({won,mode:'camp',losses,lostIds:state.survivors.filter(s=>!s.alive).map(s=>String(s.id)),rescuedIds:state.survivors.filter(s=>s.rescued).map(s=>String(s.id))}),120);
 }else if(mode==='patrol'){
  if(b)b.applyOutbreakResult(won?{won:true,infectionDelta:-2,trustDelta:1,scoreDelta:220}:{won:false,infectionDelta:3,trustDelta:-2,scoreDelta:-120});
  if(done)setTimeout(()=>done({won,mode:'patrol',losses:0}),120);
 }else if(mode==='outbreak'){
  if(b)b.applyOutbreakResult(won?{won:true,infectionDelta:-8,trustDelta:-1,scoreDelta:520}:{won:false,infectionDelta:8,trustDelta:-12,scoreDelta:-500,gameOver:true});
  if(done)setTimeout(()=>done({won,mode:'outbreak',losses:0}),120);
 }else if(typeof api.resolveIsolationField==='function')api.resolveIsolationField({won,losses});
}
function drawMap(){
 ctx.fillStyle='#17262a';ctx.fillRect(0,0,W,H);
 ctx.fillStyle='#29343a';ctx.fillRect(0,188,W,92);ctx.fillRect(360,0,82,H);
 ctx.fillStyle='#444640';ctx.fillRect(18,18,W-36,H-36);
 ctx.fillStyle='#26343a';ctx.fillRect(22,22,W-44,H-44);
 ctx.strokeStyle='#9d8e4d';ctx.lineWidth=3;ctx.setLineDash([16,13]);ctx.beginPath();ctx.moveTo(22,234);ctx.lineTo(W-22,234);ctx.stroke();ctx.setLineDash([]);
 const buildings=[
  [65,55,185,122,'지휘소','#33484e'],[292,52,210,132,'A/B 격리동','#3b454b'],
  [548,58,184,118,'보급창고','#4b4439'],[418,352,166,116,'의무막사','#3a4c45']
 ];
 buildings.forEach(b=>{ctx.fillStyle=b[5];ctx.fillRect(b[0],b[1],b[2],b[3]);ctx.strokeStyle='#77858b';ctx.lineWidth=3;ctx.strokeRect(b[0],b[1],b[2],b[3]);ctx.fillStyle='#d6dde0';ctx.font='700 12px system-ui';ctx.fillText(b[4],b[0]+9,b[1]+19);});
 ctx.fillStyle='#6e6650';[[118,314],[230,378]].forEach(p=>{ctx.beginPath();ctx.moveTo(p[0],p[1]+48);ctx.lineTo(p[0]+46,p[1]);ctx.lineTo(p[0]+92,p[1]+48);ctx.closePath();ctx.fill();});
 ctx.fillStyle='#c2a84c';ctx.font='800 11px system-ui';ctx.fillText('생존자 텐트',118,305);
 ctx.fillStyle='#2a3033';ctx.fillRect(770,70,38,132);ctx.fillStyle='#8c9aa0';ctx.fillRect(815,334,72,44);
 ctx.strokeStyle='#a45456';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(900,160);ctx.lineTo(900,340);ctx.stroke();ctx.fillStyle='#df8a8d';ctx.fillText('외곽 검문 게이트',814,155);
 ctx.fillStyle='#5d5946';ctx.fillRect(640,404,64,46);ctx.strokeStyle='#9c8a58';ctx.strokeRect(640,404,64,46);
 ctx.fillStyle='#7c3236';ctx.beginPath();ctx.arc(720,286,18,0,Math.PI*2);ctx.fill();ctx.fillStyle=state.turret.active?'#f2d162':'#6d7477';ctx.fillRect(711,277,18,18);
 if(state.turret.active){ctx.strokeStyle='#f2d16255';ctx.beginPath();ctx.arc(720,286,state.turret.range,0,Math.PI*2);ctx.stroke();}
 ctx.fillStyle='#b9c7c8';ctx.font='700 10px system-ui';ctx.fillText(state.turret.active?'자동포탑 ONLINE':'자동포탑 · E · 부품 3',671,314);
 ctx.fillStyle='#7ea0a5';ctx.beginPath();ctx.arc(610,330,16,0,Math.PI*2);ctx.fill();ctx.fillStyle='#e5eeee';ctx.fillText('의무소 E',588,309);
 ctx.fillStyle='#577e68';ctx.beginPath();ctx.arc(270,205,34,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#a6d2b2';ctx.stroke();ctx.fillStyle='#dff2e3';ctx.fillText('안전구역',241,209);
}
function drawCrates(){
 state.crates.forEach(c=>{if(c.opened)return;ctx.fillStyle='#8c673f';ctx.fillRect(c.x-13,c.y-12,26,24);ctx.strokeStyle='#d0a66e';ctx.strokeRect(c.x-13,c.y-12,26,24);ctx.beginPath();ctx.moveTo(c.x-13,c.y-12);ctx.lineTo(c.x+13,c.y+12);ctx.moveTo(c.x+13,c.y-12);ctx.lineTo(c.x-13,c.y+12);ctx.stroke();});
 state.pickups.forEach(it=>{ctx.fillStyle=it.type==='ammo'?'#d8c46b':it.type==='med'?'#d46b6b':'#88a9aa';ctx.beginPath();ctx.arc(it.x,it.y,it.r,0,Math.PI*2);ctx.fill();ctx.fillStyle='#142025';ctx.font='900 9px system-ui';ctx.textAlign='center';ctx.fillText(it.type==='ammo'?'A':it.type==='med'?'+':'⚙',it.x,it.y+3);ctx.textAlign='left';});
}
function drawSprite(name,e,scale=2.2){
 const im=images[name];if(im&&im.complete&&im.naturalWidth){
  const w=24*scale,h=32*scale;ctx.save();ctx.translate(e.x,e.y);if(e.facing<0)ctx.scale(-1,1);ctx.drawImage(im,-w/2,-h*.72,w,h);ctx.restore();
 }else{ctx.fillStyle=name==='zombie'?'#79865b':'#d9c79a';ctx.beginPath();ctx.arc(e.x,e.y,e.r,0,Math.PI*2);ctx.fill();}
}
function drawActors(t){
 state.survivors.forEach((s,i)=>{if(!s.alive||s.rescued)return;drawSprite(s.sprite,s,1.75);ctx.fillStyle='#b8e0c0';ctx.fillRect(s.x-14,s.y-28,28*Math.max(0,s.hp/3),3);});
 state.zombies.forEach((z,i)=>{const name=z.hit>0?'zombieHurt':(Math.floor(t/180+i)%2?'zombieWalk1':'zombieWalk2');drawSprite(name,z,z.elite?2.2:1.9);if(z.elite){ctx.strokeStyle='#d17678';ctx.beginPath();ctx.arc(z.x,z.y,16,0,Math.PI*2);ctx.stroke();}});
 const p=state.player;if(p){
  if(avatarReady&&avatarImage.naturalWidth){
   const w=62,h=62;ctx.save();ctx.translate(p.x,p.y);if(p.facing>0)ctx.scale(-1,1);if(p.ifr>0)ctx.globalAlpha=.55;ctx.drawImage(avatarImage,-w/2,-h*.80,w,h);ctx.restore();
  }else{let n=p.ifr>0?'playerHurt':(Math.floor(t/160)%2?'playerWalk1':'playerWalk2');drawSprite(n,p,2.1);}
  if(p.reload>0){ctx.fillStyle='#111b';ctx.fillRect(p.x-22,p.y-35,44,5);ctx.fillStyle='#dfc35f';ctx.fillRect(p.x-22,p.y-35,44*(1-p.reload/1.05),5);}
 }
}
function drawBullets(){
 state.bullets.forEach(b=>{if(b.beam){ctx.strokeStyle='#e8d46b';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(b.tx,b.ty);ctx.stroke();return}ctx.fillStyle='#fff2a8';ctx.beginPath();ctx.arc(b.x,b.y,3,0,Math.PI*2);ctx.fill();});
}
function draw(){
 if(window.Q17Field3D?.active){ctx.clearRect(0,0,W,H);return}
 ctx.save();const sx=state.shake?((Math.random()-.5)*state.shake):0,sy=state.shake?((Math.random()-.5)*state.shake):0;ctx.translate(sx,sy);
 drawMap();drawCrates();drawBullets();drawActors(performance.now());ctx.restore();
 if(state.flash>0){ctx.fillStyle='rgba(175,35,43,'+(state.flash*.45)+')';ctx.fillRect(0,0,W,H);}
 if(state.started){ctx.fillStyle='#071015c9';ctx.fillRect(12,12,245,28);ctx.fillStyle='#e4eaec';ctx.font='700 11px system-ui';ctx.fillText('웨이브 '+Math.max(1,state.wave)+' / '+state.waves.length+' · 남은 위협 '+(state.zombies.length+state.spawnQueue),22,30);}
}
function worldPoint(e){
 const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H};
}
function loop(t){
 if(!state.active)return;const dt=Math.min(.034,(t-last)/1000||0);last=t;update(dt);draw();raf=requestAnimationFrame(loop);
}
function start(){
 if(!state.active)return;state.started=true;ui.brief.style.display='none';
 if(state.mode==='camp'&&state.explicitCampThreats){
  state.pendingThreats.forEach(t=>spawnZombie(t));state.pendingThreats=[];state.wavePause=-1;
  toast('CCTV에서 확인된 위협 '+state.zombies.length+'명 현장 확인');
 }else{state.wavePause=.15;startWave()}
 last=performance.now();
}
document.getElementById('q17FieldStart').addEventListener('click',start);
document.getElementById('q17FieldBriefRetreat').addEventListener('click',()=>finish(false));
document.getElementById('q17FieldRetreat').addEventListener('click',()=>finish(false));
document.getElementById('q17FieldInteract').addEventListener('click',interact);
document.getElementById('q17FieldReload').addEventListener('click',startReload);
const fireBtn=document.getElementById('q17FieldFire');
fireBtn.addEventListener('pointerdown',e=>{e.preventDefault();keys.mobileFire=true;let target=null,bd=9999;state.zombies.forEach(z=>{const d=dist(z,state.player);if(d<bd){bd=d;target=z}});if(target)shootAt(target.x,target.y);});
['pointerup','pointercancel','pointerleave'].forEach(type=>fireBtn.addEventListener(type,()=>{keys.mobileFire=false;}));
window.addEventListener('keydown',e=>{
 if(!state.active)return;const k=e.key.toLowerCase();keys[k]=true;
 if(k==='r')startReload();if(k==='e')interact();if(e.code==='Space'){let target=null,bd=9999;state.zombies.forEach(z=>{const d=dist(z,state.player);if(d<bd){bd=d;target=z}});if(target)shootAt(target.x,target.y);e.preventDefault();}
});
window.addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false});
canvas.addEventListener('pointermove',e=>{const p=worldPoint(e);pointer.x=p.x;pointer.y=p.y;});
canvas.addEventListener('pointerdown',e=>{const p=worldPoint(e);pointer.x=p.x;pointer.y=p.y;pointer.down=true;shootAt(p.x,p.y);});
canvas.addEventListener('pointerup',()=>pointer.down=false);canvas.addEventListener('pointercancel',()=>pointer.down=false);canvas.addEventListener('pointerleave',()=>pointer.down=false);
function bindHold(btn,key){
 if(!btn)return;const on=e=>{e.preventDefault();keys[key]=true;btn.classList.add('active')};const off=e=>{e.preventDefault();keys[key]=false;btn.classList.remove('active')};
 btn.addEventListener('pointerdown',on);btn.addEventListener('pointerup',off);btn.addEventListener('pointercancel',off);btn.addEventListener('pointerleave',off);
}
document.querySelectorAll('[data-field-hold]').forEach(b=>bindHold(b,b.dataset.fieldHold==='up'?'w':b.dataset.fieldHold==='down'?'s':b.dataset.fieldHold==='left'?'a':'d'));

api.isCombatActive=function(){return state.active||original.isCombatActive()};
api.respondCamp=function(payload,done){if(state.active||original.isCombatActive())return false;resetMission('camp',payload,done);return true};
api.respondGlobal=function(done){if(state.active||original.isCombatActive())return false;resetMission('outbreak',{},done);return true};
api.respondPatrol=function(payload,done){if(state.active||original.isCombatActive())return false;resetMission('patrol',payload||{},done);return true};
api.reset=function(){if(state.active){state.active=false;state.started=false;host.classList.remove('show');cancelAnimationFrame(raf)};if(original.reset)return original.reset()};
const fightBtn=document.getElementById('q17FightRoom');
if(fightBtn)fightBtn.addEventListener('click',e=>{
 const snap=api.getIsolationSnapshot?api.getIsolationSnapshot():[];
 const count=snap.filter(x=>x.status==='zombie').length;if(!count)return;
 e.preventDefault();e.stopImmediatePropagation();const iso=document.getElementById('q17Isolation');if(iso)iso.classList.remove('show');
 resetMission('isolation',{count},null);
},true);

window.Q17Field3DBridge=Object.freeze({
 width:W,height:H,
 aimAt:(x,y,down=false)=>{
  pointer.x=clamp(Number(x)||0,0,W);pointer.y=clamp(Number(y)||0,0,H);pointer.down=!!down;
  if(down)shootAt(pointer.x,pointer.y)
 },
 setAim:(x,y)=>{pointer.x=clamp(Number(x)||0,0,W);pointer.y=clamp(Number(y)||0,0,H)},
 setFire:down=>{pointer.down=!!down},
 snapshot:()=>({
  active:state.active,started:state.started,mode:state.mode,
  elapsed:state.elapsed,wave:state.wave,waveCount:state.waves.length,spawnQueue:state.spawnQueue,
  shake:state.shake,flash:state.flash,
  player:state.player?{x:state.player.x,y:state.player.y,hp:state.player.hp,maxHp:state.player.maxHp,ammo:state.player.ammo,reserve:state.player.reserve,reload:state.player.reload,scrap:state.player.scrap,ifr:state.player.ifr,facing:state.player.facing}:null,
  zombies:state.zombies.map((z,i)=>({id:z.id??i,name:z.name||'',x:z.x,y:z.y,hp:z.hp,elite:!!z.elite,hit:z.hit||0,phase:z.phase||0,sourcePhase:z.sourcePhase||'zombie'})),
  survivors:state.survivors.map((s,i)=>({id:s.id??i,name:s.name||'',role:s.role||'',sourceStatus:s.sourceStatus||'safe',x:s.x,y:s.y,hp:s.hp,alive:s.alive,rescued:s.rescued,escorted:!!s.escorted,sprite:s.sprite})),
  bullets:state.bullets.map((b,i)=>({id:i,x:b.x,y:b.y,tx:b.tx,ty:b.ty,beam:!!b.beam,life:b.life})),
  pickups:state.pickups.map((p,i)=>({id:i,x:p.x,y:p.y,type:p.type})),
  crates:state.crates.map((q,i)=>({id:i,x:q.x,y:q.y,opened:q.opened})),
  turret:state.turret?{x:state.turret.x,y:state.turret.y,active:state.turret.active,range:state.turret.range}:null,
  medCharges:state.medCharges,rescued:state.rescued,losses:state.losses
 })
});

window.Q17FieldMission=Object.freeze({
 isActive:()=>state.active,
 startCamp:(payload,done)=>resetMission('camp',payload,done),
 startGlobal:done=>resetMission('outbreak',{},done),
 startPatrol:(payload,done)=>{if(state.active||original.isCombatActive())return false;resetMission('patrol',payload||{},done);return true;},
 startIsolation:count=>resetMission('isolation',{count},null)
});
})();
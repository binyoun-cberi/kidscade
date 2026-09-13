const $ = s=>document.querySelector(s);
const canvas=$('#world'), ctx=canvas.getContext('2d');
let SW=0,SH=0,W=1600,H=1000,dpr=1;
const worldSizes={
  home:{w:1500,h:1000},
  farm:{w:2200,h:1500},
  forest:{w:2500,h:1650},
  mine:{w:1900,h:1350},
  river:{w:2200,h:1450}
};
let camera={x:0,y:0,targetX:0,targetY:0,zoom:1,targetZoom:1};
let colliders=[];
let occluders=[];
const playerRadius=15;
let swimState={active:false,drainClock:0,splashClock:0};
let farmDoor={open:0,target:0};
let homeDoor={open:0,target:0};
let nodeHitFx={};
const animalActors={
  cow:{x:.79,y:.36,tx:.79,ty:.36,speed:22,wait:0},
  chicken:{x:.835,y:.42,tx:.835,ty:.42,speed:34,wait:0},
  pig:{x:.80,y:.52,tx:.80,ty:.52,speed:25,wait:0}
};

const sceneZooms={home:1.12,farm:0.92,forest:0.88,mine:1.0,river:0.9};

let scene='home';
let player={x:.5,y:.72,targetX:.5,targetY:.72,flip:1,bob:0,outfit:'green'};
let hotzones=[];

let renderQueue=[];
let gardenBridgeCache={stamp:0,snapshot:null};
let gardenPetActors=[];
const petYard={x:0,y:0,w:0,h:0,cols:12,rows:8};

function queueRenderable(baseY,draw,layer=0){
  renderQueue.push({baseY:Number(baseY)||0,layer:Number(layer)||0,draw});
}
function flushRenderQueue(){
  renderQueue.sort((a,b)=>(a.baseY-b.baseY)||(a.layer-b.layer));
  renderQueue.forEach(item=>item.draw());
}
function gardenApi(){
  try{return kidscadeHost().KidscadeGarden||null}catch(_){return null}
}
function refreshGardenWorld(force=false){
  const now=performance.now();
  if(!force&&gardenBridgeCache.snapshot&&now-gardenBridgeCache.stamp<1800)return gardenBridgeCache.snapshot;
  gardenBridgeCache={stamp:now,snapshot:gardenSnapshot()};
  syncGardenPetActors();
  return gardenBridgeCache.snapshot;
}
function gardenFreeCells(snap){
  const blocked=(x,y)=>(snap.placed||[]).some(i=>{
    const f=snap.facilities?.[i.kind];if(!f)return false;
    return x>=i.x&&x<i.x+f.w&&y>=i.y&&y<i.y+f.h;
  });
  const out=[];
  for(let y=0;y<8;y++)for(let x=0;x<12;x++)if(!blocked(x,y))out.push({x:x+.5,y:y+.5});
  return out;
}
function syncGardenPetActors(){
  const snap=gardenBridgeCache.snapshot||gardenSnapshot();
  const fish=new Set(window.KidscadePetArt?.fishIds||['fish','neonTetra','platy','cory','betta']);
  const ids=(snap.owned||[]).filter(id=>!fish.has(id));
  const old=new Map(gardenPetActors.map(a=>[a.id,a]));
  const free=gardenFreeCells(snap);
  gardenPetActors=ids.map((id,i)=>{
    if(old.has(id))return old.get(id);
    const p=free[i%Math.max(1,free.length)]||{x:.5,y:.5};
    return {id,gx:p.x,gy:p.y,path:[],wait:500+i*180,action:'idle',pendingAction:'idle',actionUntil:0,facing:i%2?1:-1};
  });
}
function gardenCellToWorld(gx,gy){
  return {x:petYard.x+(gx/12)*petYard.w,y:petYard.y+(gy/8)*petYard.h};
}
function chooseGardenPetDestination(a){
  const snap=refreshGardenWorld(),api=gardenApi(),free=gardenFreeCells(snap);
  let target=null,action='idle';
  const compatible=(snap.placed||[]).filter(p=>{
    const f=snap.facilities?.[p.kind];
    return f&&Array.isArray(f.users)&&f.users.includes(a.id);
  });
  if(compatible.length&&Math.random()<.72){
    const p=compatible[(Math.random()*compatible.length)|0],f=snap.facilities[p.kind];
    const cand=[];
    for(let x=p.x;x<p.x+f.w;x++)cand.push({x:x+.5,y:p.y-.5},{x:x+.5,y:p.y+f.h+.5});
    for(let y=p.y;y<p.y+f.h;y++)cand.push({x:p.x-.5,y:y+.5},{x:p.x+f.w+.5,y:y+.5});
    const keys=new Set(free.map(q=>`${q.x},${q.y}`));
    const valid=cand.filter(q=>q.x>=.5&&q.x<12&&q.y>=.5&&q.y<8&&keys.has(`${q.x},${q.y}`));
    if(valid.length)target=valid[(Math.random()*valid.length)|0];
    action=f.action||'idle';
  }
  if(!target){
    target=free[(Math.random()*Math.max(1,free.length))|0]||{x:a.gx,y:a.gy};
    action=Math.random()<.18?'play':'idle';
  }
  let path=[];
  try{if(api?.route)path=api.route(snap.placed||[],{x:a.gx,y:a.gy},target)||[]}catch(_){}
  if(!path.length)path=[target];
  a.path=path.map(q=>({x:q.x,y:q.y}));
  a.pendingAction=action;a.action='walk';
}
function updateGardenPets(dt){
  if(scene!=='farm')return;
  refreshGardenWorld();
  for(const a of gardenPetActors){
    const now=performance.now();
    if(a.path.length){
      const p=a.path[0],dx=p.x-a.gx,dy=p.y-a.gy,d=Math.hypot(dx,dy);
      if(d<.035){
        a.gx=p.x;a.gy=p.y;a.path.shift();
        if(!a.path.length){a.action=a.pendingAction||'idle';a.actionUntil=now+1400+Math.random()*2200;a.wait=700+Math.random()*1700}
      }else{
        const speed=(a.id==='turtle'?.44:a.id==='hamster'?.80:.60)*dt/1000;
        const step=Math.min(speed,d);a.gx+=dx/d*step;a.gy+=dy/d*step;a.facing=dx<0?-1:1;a.action='walk';
      }
    }else if(now<a.actionUntil){
      a.action=a.pendingAction||'idle';
    }else{
      a.action='idle';a.wait-=dt;if(a.wait<=0)chooseGardenPetDestination(a);
    }
  }
}


const AVATAR_PREVIEW_KEY='kidscade-avatar-studio-preview';
let avatarBridge={
  img:new Image(),
  ready:false,
  source:'',
  lastCapture:0,
  mode:'idle',
  usingLiveApi:false,
  label:'연결 대기'
};
avatarBridge.img.decoding='async';

function avatarApi(){
  const host=kidscadeHost();
  try{
    if(window.KidscadeAvatarShop?.renderPreviewFrame)return window.KidscadeAvatarShop;
  }catch(_){}
  try{
    if(host.KidscadeAvatarShop?.renderPreviewFrame)return host.KidscadeAvatarShop;
  }catch(_){}
  try{
    const frame=host.document?.getElementById('kidscade-avatar-studio-frame');
    const api=frame?.contentWindow?.KidscadeAvatarShop;
    if(api?.renderPreviewFrame)return api;
  }catch(_){}
  return null;
}
function avatarStoredPreview(){
  try{return localStorage.getItem(AVATAR_PREVIEW_KEY)||'';}catch(_){return ''}
}
function setAvatarImage(src,label='현재 Kidscade 아바타'){
  if(!src || src===avatarBridge.source)return false;
  avatarBridge.source=src;
  avatarBridge.img.onload=()=>{
    avatarBridge.ready=true;
    avatarBridge.label=label;
    updateAvatarStatus();
  };
  avatarBridge.img.onerror=()=>{
    avatarBridge.ready=false;
    avatarBridge.label='아바타 불러오기 실패';
    updateAvatarStatus();
  };
  avatarBridge.img.src=src;
  return true;
}
function updateAvatarStatus(){
  const el=$('#avatarStatus');
  if(!el)return;
  el.textContent=avatarBridge.ready
    ? (avatarBridge.usingLiveApi?'Deluxe 실시간 연동':'저장된 Deluxe 아바타')
    : 'Deluxe 아바타 연결 대기';
}
function refreshAvatarBridge(showMessage=false){
  const api=avatarApi();
  avatarBridge.usingLiveApi=!!api;
  let data='';
  try{
    if(api?.getPreviewDataURL)data=api.getPreviewDataURL()||'';
  }catch(_){}
  if(!data)data=avatarStoredPreview();
  if(data && data.startsWith('data:image')){
    setAvatarImage(data,api?'Deluxe 실시간 프리뷰':'저장된 Deluxe 프리뷰');
    if(showMessage)toast('현재 Kidscade 아바타 프리뷰를 다시 불러왔어요.');
  }else{
    avatarBridge.ready=false;
    avatarBridge.label='연결 대기';
    updateAvatarStatus();
    if(showMessage)toast('이 standalone 시험판에는 Kidscade 아바타 저장값이 없어요. 실제 Kidscade 안에서는 자동 연결됩니다.');
  }
}
function captureAvatarFrame(mode,now){
  const api=avatarApi();
  if(!api?.renderPreviewFrame)return;
  if(now-avatarBridge.lastCapture<95)return;
  avatarBridge.lastCapture=now;
  try{
    const data=api.renderPreviewFrame(mode,now/1000)||'';
    if(data && data.startsWith('data:image')){
      avatarBridge.usingLiveApi=true;
      setAvatarImage(data,'Deluxe 실시간 프레임');
    }
  }catch(_){}
}
window.addEventListener('storage',e=>{
  if(e.key===AVATAR_PREVIEW_KEY)refreshAvatarBridge(false);
});

let last=performance.now();


function kidscadeHost(){
  try{
    if(window.parent && window.parent!==window && window.parent.document)return window.parent;
  }catch(_){}
  return window;
}
function walletBalance(){
  const host=kidscadeHost();
  try{
    if(typeof host.getSeedBalance==='function'){
      const n=Number(host.getSeedBalance());
      if(Number.isFinite(n))return Math.max(0,Math.floor(n));
    }
  }catch(_){}
  try{
    const n=parseInt(localStorage.getItem('kidscade_coins')||'0',10);
    return Number.isFinite(n)?Math.max(0,n):0;
  }catch(_){return 0}
}
function walletChange(delta,reason='생활 월드'){
  delta=Math.trunc(Number(delta)||0);
  if(!delta)return true;
  const host=kidscadeHost();
  try{
    if(typeof host.changeSeeds==='function'){
      const result=host.changeSeeds(delta,reason,{toast:false});
      if(result===false)return false;
      updateHUD();
      return true;
    }
  }catch(_){}
  try{
    const before=walletBalance();
    if(delta<0 && before < -delta)return false;
    const after=Math.max(0,before+delta);
    localStorage.setItem('kidscade_coins',String(after));
    window.dispatchEvent(new CustomEvent('kidscade-seeds-change',{detail:{delta,balance:after,reason}}));
    updateHUD();
    return true;
  }catch(_){return false}
}
function gardenSnapshot(){
  const host=kidscadeHost();
  try{
    const api=host.KidscadeGarden;
    const key=api?.KEY||'kidscade_garden_v1';
    const raw=JSON.parse(localStorage.getItem(key)||'null');
    const legacy=JSON.parse(localStorage.getItem('kidscade_sook_canvas_pet')||'null');
    const state=api?.normalize?api.normalize(raw,legacy):(raw||{});
    const animals=Array.isArray(api?.animals)?api.animals:[];
    const facilities=api?.facilities||{};
    return {
      owned:Array.isArray(state?.owned)?state.owned.slice():[],
      placed:Array.isArray(state?.placed)?state.placed.map(x=>({...x})):[],
      stock:{...(state?.stock||{})},
      animals,
      facilities
    };
  }catch(_){
    return {owned:[],placed:[],stock:{},animals:[],facilities:{}};
  }
}
function gardenOwnedRows(){
  const snap=gardenSnapshot();
  return snap.owned.map(id=>{
    const a=snap.animals.find(x=>x.id===id);
    return {id,name:a?.name||id,icon:a?.icon||''};
  });
}
function gardenFacilityRows(){
  const snap=gardenSnapshot();
  return snap.placed.map(p=>{
    const f=snap.facilities[p.kind];
    return {id:p.id,kind:p.kind,name:f?.name||p.kind,icon:f?.icon||''};
  });
}
function requestCloseLifeWorld(){
  try{
    if(window.parent&&window.parent!==window){
      window.parent.postMessage({type:'kidscade-life-world-close'},location.origin);
      return;
    }
  }catch(_){}
  toast('실제 Kidscade에서는 생활 월드 화면이 닫힙니다.');
}

const defaultState = {
  day:1, energy:100, seeds:120,
  inv:{
    '감자':3,'당근':2,'양배추':1,'나무':8,'돌':6,'철광석':1,'버섯':0,'사과':0,
    '달걀':1,'우유':1,'물고기':0,'석탄':0,'구리광석':0,'딸기':0,
    '돌도끼':1,'돌곡괭이':1,'낚싯대':1,'감자수프':0
  },
  farm:{
    plots:[
      {crop:null,stage:0,water:0,fertilized:false,pest:false},
      {crop:null,stage:0,water:0,fertilized:false,pest:false},
      {crop:null,stage:0,water:0,fertilized:false,pest:false},
      {crop:null,stage:0,water:0,fertilized:false,pest:false}
    ],
    cow:{fed:false}, chicken:{fed:false}, pig:{fed:false}
  },
  recipes:['돌도끼','돌곡괭이','나무의자'],
  cookingRecipes:['감자수프','채소볶음'],
  furniture:['낡은침대'],
  placed:[
    {type:'낡은침대',x:.16,y:.48},
    {type:'작은상자',x:.74,y:.58}
  ],
  outfits:['초록작업복','빨간멜빵'],
  currentOutfit:'초록작업복',
  fishDex:{'피라미':false,'붕어':false,'메기':false,'쏘가리':false}
};
let state=loadState();
state.worldNodes=state.worldNodes||{};
state.farm=state.farm||{};
if(state.farm.waterCan==null)state.farm.waterCan=6;
if(state.farm.maxWater==null)state.farm.maxWater=6;
if(state.farm.scarecrow==null)state.farm.scarecrow=false;
if(state.farm.compostMadeToday==null)state.farm.compostMadeToday=false;
state.inv=state.inv||{};
for(const [k,v] of Object.entries({
  '잡초':0,'거름':0,'약초':0,'꿀':0,'곤충':0,'민물조개':0,'강돌':0,'보석원석':0,
  '곤충채집망':0,'철곡괭이':0,'버섯스튜':0,'생선구이':0
})){ if(state.inv[k]==null)state.inv[k]=v; }


function loadState(){
  try{ return Object.assign({},defaultState,JSON.parse(localStorage.getItem('kidscade_life_world_v1')||'{}')); }
  catch(e){ return structuredClone(defaultState); }
}
function saveState(){ localStorage.setItem('kidscade_life_world_v1',JSON.stringify(state)); updateHUD(); }
function updateHUD(){
  $('#dayText').textContent=state.day+'일차';
  $('#energyText').textContent=Math.round(state.energy);
  $('#seedText').textContent=walletBalance().toLocaleString();
  const wt=$('#waterText'),wm=$('#waterMaxText');
  if(wt)wt.textContent=state.farm.waterCan??0;
  if(wm)wm.textContent=state.farm.maxWater??6;
  $('#energyBox').classList.toggle('low',state.energy<=25);
}
function toast(msg){
  const t=$('#toast'); t.textContent=msg;t.classList.add('show');
  clearTimeout(t._timer); t._timer=setTimeout(()=>t.classList.remove('show'),1600);
}
function spendEnergy(n){
  if(state.energy<n){toast('⚡ 체력이 부족해요. 집에서 음식을 먹거나 쉬어 보세요.');return false}
  state.energy-=n;saveState();return true;
}
function addItem(name,n=1){state.inv[name]=(state.inv[name]||0)+n;saveState();}
function takeItem(name,n=1){
  if((state.inv[name]||0)<n)return false;
  state.inv[name]-=n;saveState();return true;
}
function hasItems(req){
  return Object.entries(req).every(([k,v])=>(state.inv[k]||0)>=v);
}
function consumeItems(req){
  if(!hasItems(req))return false;
  Object.entries(req).forEach(([k,v])=>state.inv[k]-=v);saveState();return true;
}
function fit(){
  const r=canvas.getBoundingClientRect();
  dpr=Math.min(devicePixelRatio||1,2);
  SW=r.width; SH=r.height;
  canvas.width=SW*dpr; canvas.height=SH*dpr;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  applyWorldSize(scene,false);
  camera.zoom=sceneZooms[scene]||1;
  camera.targetZoom=camera.zoom;
  snapCameraToPlayer();
  updateZoomHUD();
}
addEventListener('resize',fit);fit();


function openModal(html){
  $('#panel').innerHTML=html;$('#modal').classList.add('show');
}
function closeModal(){ $('#modal').classList.remove('show'); }
$('#modal').addEventListener('click',e=>{if(e.target.id==='modal')closeModal()});

function topRow(title){
  return `<div class="closeRow"><h2>${title}</h2><button class="closeBtn" onclick="closeModal()">닫기 ✕</button></div>`;
}


function openStyleNotes(){
  openModal(`${topRow('v11 아트 테스트 메모')}
    <div class="card">
      <b>이번 버전의 핵심</b>
      <p class="small">플레이어 캐릭터를 새로 그리지 않습니다. 현재 Kidscade Deluxe 아바타 프리뷰를 그대로 생활 월드가 받아 쓰는 구조를 시험합니다.</p>
    </div>
    <div class="grid">
      <div class="card"><b>플레이어</b><p class="small">Deluxe 아바타 PNG/프레임이 있으면 그대로 렌더링합니다. standalone에서 저장값이 없으면 중립적인 연결 대기 실루엣만 표시합니다.</p></div>
      <div class="card"><b>애니메이션</b><p class="small">걷기·대기는 가능하면 아틀리에의 renderPreviewFrame을 사용하고, 그 API가 없으면 저장된 프리뷰 이미지에 이동/바운스만 적용합니다.</p></div>
      <div class="card"><b>도구 행동</b><p class="small">캐릭터 외형은 건드리지 않고 도끼·곡괭이·물뿌리개 같은 도구 레이어를 바깥에 얹습니다.</p></div>
      <div class="card"><b>환경</b><p class="small">나무·바위·집·동물은 밝고 둥근 Kidscade Canvas 카툰 방향을 계속 시험합니다.</p></div>
    </div>
    <div class="log">이 파일은 실제 Kidscade와 병합하지 않은 독립 시험판이며, 저장 키도 별도로 사용합니다.</div>`);
}

function openInventory(){
  const items=Object.entries(state.inv).filter(([,n])=>n>0);
  const foods=Object.keys(foodEnergy).filter(k=>(state.inv[k]||0)>0);
  const pets=gardenOwnedRows();
  const facilities=gardenFacilityRows();

  openModal(`${topRow('가방')}
  <div class="grid">${items.map(([k,v])=>`
    <div class="card invItem">
      <span><b style="display:inline">${k}</b></span>
      <span class="badge">${v}</span>
    </div>`).join('')}</div>

  ${foods.length?`<div class="section"><b>먹을 수 있는 음식</b><div>${foods.map(f=>`<button class="actionBtn good" onclick="eatFood('${f}')">${f} (+${foodEnergy[f]} 체력)</button>`).join('')}</div></div>`:''}

  <div class="section">
    <b>기존 나의 정원에서 이어온 친구</b>
    <p class="small">정원 원본 세이브는 수정하지 않고 그대로 읽습니다.</p>
    <div class="slotRow">${pets.length?pets.map(p=>`<span class="slot">${p.icon||''} ${p.name}</span>`).join(''):'<span class="small">아직 불러온 친구가 없어요.</span>'}</div>
  </div>

  <div class="section">
    <b>기존 정원 시설</b>
    <div class="slotRow">${facilities.length?facilities.slice(0,12).map(f=>`<span class="slot">${f.icon||''} ${f.name}</span>`).join(''):'<span class="small">설치된 시설이 없어요.</span>'}</div>
  </div>

  <div class="section">
    <button class="actionBtn" onclick="sleepDay()">하루 마무리하고 푹 쉬기</button>
  </div>`);
}
function itemEmoji(k){
 const m={'감자':'🥔','당근':'🥕','양배추':'🥬','나무':'🪵','돌':'🪨','철광석':'⚙️','구리광석':'🟤','석탄':'⚫','버섯':'🍄','사과':'🍎','딸기':'🍓','달걀':'🥚','우유':'🥛','물고기':'🐟','돌도끼':'🪓','돌곡괭이':'⛏️','낚싯대':'🎣','감자수프':'🥣'};
 return m[k]||'📦';
}

const foodEnergy={
  '감자수프':35,
  '채소볶음':30,
  '버섯스튜':42,
  '생선구이':48
};

function eatFood(name){
  if((state.inv[name]||0)<=0)return toast('먹을 음식이 없어요.');
  const gain=foodEnergy[name]||25;
  state.inv[name]--;state.energy=Math.min(100,state.energy+gain);
  saveState();toast(`${name}을(를) 먹었어요. 체력 +${gain}`);openInventory();
}
function sleepDay(){
  state.day++;state.energy=100;
  const pestChance=state.farm.scarecrow?.12:.28;
  state.farm.plots.forEach(p=>{
    if(p.crop){
      if(p.water>0){
        const grow=p.fertilized?2:1;
        p.stage=Math.min(3,p.stage+grow);
        p.water=0;
        p.fertilized=false;
      }
      if(Math.random()<pestChance && p.stage<3)p.pest=true;
    }
  });
  state.farm.cow.fed=false;state.farm.chicken.fed=false;state.farm.pig.fed=false;
  state.farm.compostMadeToday=false;
  state.farm.waterCan=state.farm.maxWater;
  resetDailyWorldNodes();
  saveState();closeModal();
  toast(state.farm.scarecrow?'새로운 아침! 허수아비 덕분에 해충 위험도 줄었어요.':'새로운 아침! 자원과 농장 활동이 다시 준비됐어요.');
}

function simulateStudyReward(){
  toast('학습 보상은 Kidscade 본체 게임 기록에서 지급됩니다.');
}

/* ---------- hand-drawn canvas helpers ---------- */
function line(x1,y1,x2,y2,w=3,color='#24211e'){
  ctx.strokeStyle=color;ctx.lineWidth=w;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
}

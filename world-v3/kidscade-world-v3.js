import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const V2=window.KidscadeWorldV2||{};
const Storage=V2.Storage;
const Bridge=V2.Bridge;
const canvas=document.getElementById('world3d');
const loading=document.getElementById('loading');
const toastEl=document.getElementById('toast');
const promptEl=document.getElementById('prompt');
const zoneEl=document.getElementById('zone');
const statusEl=document.getElementById('status');
const panel=document.getElementById('panel');
const panelBody=document.getElementById('panelBody');

const ROOT='../assets/game/3d/';
const P={
  suburban:ROOT+'city/kenney-city-kit-suburban/',
  modular:ROOT+'buildings/kenney-modular-buildings/',
  nature:ROOT+'nature/kenney-nature-kit/',
  survival:ROOT+'survival/kenney-survival-kit/',
  furniture:ROOT+'interiors/kenney-furniture-kit/'
};
const ASSET={
  house:P.suburban+'building-type-a.glb',
  farmHouse:P.suburban+'building-type-g.glb',
  fence:P.suburban+'fence.glb',
  path:P.suburban+'path-stones-long.glb',
  tree:P.nature+'tree-default.glb',
  oak:P.nature+'tree-oak.glb',
  pine:P.nature+'tree-pine-round-a.glb',
  rockA:P.nature+'rock-large-a.glb',
  rockB:P.nature+'rock-large-b.glb',
  rockC:P.nature+'rock-large-c.glb',
  flower:P.nature+'flower-yellow-a.glb',
  workbench:P.survival+'workbench.glb',
  chest:P.survival+'chest.glb',
  wood:P.survival+'resource-wood.glb',
  stone:P.survival+'resource-stone.glb',
  bed:P.furniture+'bed-single.glb',
  sofa:P.furniture+'lounge-sofa.glb',
  desk:P.furniture+'desk.glb',
  bookcase:P.furniture+'bookcase-open.glb',
  table:P.furniture+'table.glb',
  fridge:P.furniture+'kitchen-fridge.glb',
  sink:P.furniture+'kitchen-sink.glb',
  cabinet:P.furniture+'kitchen-cabinet.glb',
  stove:P.furniture+'kitchen-stove.glb',
  rug:P.furniture+'rug-rectangle.glb',
  bridge:P.nature+'bridge-wood.glb',
  mushroom:P.nature+'mushroom-red-group.glb',
  logStack:P.nature+'log-stack.glb',
  campfire:P.survival+'campfire-pit.glb',
  petDog:'../assets/game/characters/pets/animal-dog.glb',
  petCat:'../assets/game/characters/pets/animal-cat.glb',
  petRabbit:'../assets/game/characters/pets/animal-bunny.glb',
  petParrot:'../assets/game/characters/pets/animal-parrot.glb',
  petPig:'../assets/game/characters/pets/animal-pig.glb'
};

const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,preserveDrawingBuffer:false,powerPreference:'high-performance'});
renderer.autoClear=true;
renderer.setClearColor(0xb9d8ee,1);
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.03;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;

const scene=new THREE.Scene();
scene.background=new THREE.Color(0xb9d8ee);
scene.fog=new THREE.Fog(0xb9d8ee,28,52);

const camera=new THREE.OrthographicCamera(-10,10,6,-6,.1,100);
camera.position.set(10,13,13);
camera.lookAt(0,0,0);

const hemi=new THREE.HemisphereLight(0xfff7e2,0x5d7b54,2.0);
scene.add(hemi);
const sun=new THREE.DirectionalLight(0xfff0cc,3.4);
sun.position.set(-10,18,11);
sun.castShadow=true;
sun.shadow.mapSize.set(1024,1024);
sun.shadow.camera.left=-22;sun.shadow.camera.right=22;sun.shadow.camera.top=22;sun.shadow.camera.bottom=-22;
scene.add(sun);

const outdoor=new THREE.Group(),indoor=new THREE.Group(),petLayer=new THREE.Group();
scene.add(outdoor,indoor,petLayer);indoor.visible=false;

const loader=new GLTFLoader();
const modelCache=new Map();
function loadGLB(url){
  if(modelCache.has(url))return modelCache.get(url);
  const p=new Promise((resolve,reject)=>loader.load(url,g=>resolve(g.scene),undefined,reject));
  modelCache.set(url,p);return p;
}
function prepModel(o){
  o.traverse(n=>{
    if(!n.isMesh)return;
    n.castShadow=true;n.receiveShadow=true;
    if(n.material){
      const src=Array.isArray(n.material)?n.material:[n.material];
      const mats=src.map(m=>{const c=m.clone();if('roughness'in c)c.roughness=Math.max(.52,c.roughness??.75);return c;});
      n.material=Array.isArray(n.material)?mats:mats[0];
    }
  });
  return o;
}
async function addModel(parent,url,{x=0,y=0,z=0,w=2,h=2,d=2,rot=0,name=''}={}){
  try{
    const base=await loadGLB(url),o=prepModel(base.clone(true));
    o.rotation.y=rot;o.position.set(x,y,z);o.name=name;
    o.updateMatrixWorld(true);
    const box=new THREE.Box3().setFromObject(o),size=box.getSize(new THREE.Vector3());
    const sx=w&&size.x?w/size.x:Infinity,sy=h&&size.y?h/size.y:Infinity,sz=d&&size.z?d/size.z:Infinity;
    const s=Math.min(sx,sy,sz);o.scale.multiplyScalar(Number.isFinite(s)?s:1);
    o.updateMatrixWorld(true);
    const box2=new THREE.Box3().setFromObject(o);
    o.position.y+=y-box2.min.y;
    parent.add(o);return o;
  }catch(err){console.warn('[World v3] model failed',url,err);return null}
}
function box(parent,x,z,w,d,h,color,y=0){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.88}));
  m.position.set(x,y+h/2,z);m.receiveShadow=true;m.castShadow=h>.15;parent.add(m);return m;
}
function plane(parent,x,z,w,d,color,y=.02){
  const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d),new THREE.MeshStandardMaterial({color,roughness:.95}));
  m.rotation.x=-Math.PI/2;m.position.set(x,y,z);m.receiveShadow=true;parent.add(m);return m;
}

const colliders={outdoor:[],indoor:[]};
const interactables={outdoor:[],indoor:[]};
function collider(mode,x,z,w,d){colliders[mode].push({x,z,w,d});}
function interact(mode,x,z,r,label,action){interactables[mode].push({x,z,r,label,action});}

let save=Storage?.load?.()||{player:{},inventory:{},progression:{energy:100,maxEnergy:100,tools:{},seeds:{potato:2,carrot:2,tomato:2},crops:{},food:{},fishDex:{}}};
function persist(){Storage?.save?.(save)}
function toast(text){
  toastEl.textContent=text;toastEl.classList.add('show');clearTimeout(toastEl.__t);
  toastEl.__t=setTimeout(()=>toastEl.classList.remove('show'),1600);
}
function openPanel(html){panelBody.innerHTML=html;panel.classList.add('open')}
function closePanel(){panel.classList.remove('open');canvas.focus()}
document.getElementById('panelClose').onclick=closePanel;
panel.addEventListener('pointerdown',e=>{if(e.target===panel)closePanel()});

function inv(){save.inventory=save.inventory||{};return save.inventory}
function prog(){
  save.progression=save.progression||{};
  const p=save.progression;
  p.energy=Number(p.energy??100);
  p.maxEnergy=Number(p.maxEnergy??100);
  p.tools=p.tools||{};
  p.seeds={potato:2,carrot:2,tomato:2,...(p.seeds||{})};
  p.crops=p.crops||{};
  p.food=p.food||{};
  p.fishDex=p.fishDex||{};
  const old=p.survival&&typeof p.survival==='object'?p.survival:{};
  p.survival={
    hunger:Number.isFinite(Number(old.hunger))?Math.max(0,Math.min(100,Number(old.hunger))):100,
    maxHunger:100,
    time:Number.isFinite(Number(old.time))?((Number(old.time)%1440)+1440)%1440:480,
    day:Math.max(1,Math.floor(Number(old.day)||1)),
    companion:typeof old.companion==='string'?old.companion:'',
    lastTick:Number(old.lastTick)||Date.now()
  };
  return p;
}
const itemName=k=>({
  wood:'목재',stone:'돌',iron:'철광석',potato:'감자',carrot:'당근',tomato:'토마토',
  fish:'물고기',bug:'곤충',mushroom:'버섯'
})[k]||k;

const FOOD_DEF={
  grilledFish:{name:'구운 생선',hunger:34,energy:10},
  bakedPotato:{name:'구운 감자',hunger:25,energy:6},
  veggieSoup:{name:'채소 수프',hunger:42,energy:12},
  mushroomSoup:{name:'버섯 수프',hunger:38,energy:10}
};
const RECIPES={
  grilledFish:{name:'구운 생선',req:{fish:1}},
  bakedPotato:{name:'구운 감자',req:{potato:1}},
  veggieSoup:{name:'채소 수프',req:{carrot:1,tomato:1}},
  mushroomSoup:{name:'버섯 수프',req:{mushroom:2}}
};

function inventoryPanel(){
  const items=Object.entries(inv()).filter(([,v])=>Number(v)>0);
  const food=Object.entries(prog().food).filter(([k,v])=>FOOD_DEF[k]&&Number(v)>0);
  openPanel(`<h2>보관함</h2>
    <h3>재료</h3><div class="grid">${items.length?items.map(([k,v])=>`<div class="item"><b>${itemName(k)}</b><div>${v}개</div></div>`).join(''):'<div class="item">아직 보관한 재료가 없어요.</div>'}</div>
    <h3>조리 음식</h3><div class="grid">${food.length?food.map(([k,v])=>`<div class="item"><b>${FOOD_DEF[k].name}</b><div>${v}개 · 허기 +${FOOD_DEF[k].hunger}</div><button data-eat="${k}">먹기</button></div>`).join(''):'<div class="item">아직 만든 음식이 없어요.</div>'}</div>`);
}
function workbenchPanel(){
  const p=prog(),i=inv(),tool=(key,name,req)=>{const have=Object.entries(req).every(([k,v])=>(i[k]||0)>=v);const owned=p.tools[key]?.dur>0;return `<div class="item"><b>${name}</b><div>${Object.entries(req).map(([k,v])=>itemName(k)+' '+v).join(' · ')}</div><button data-craft="${key}" ${have?'':'disabled'}>${owned?'수리/재제작':'제작'}</button></div>`;};
  openPanel(`<h2>3D 제작대</h2><div class="grid">${tool('axe','돌도끼',{wood:3,stone:2})}${tool('pick','돌곡괭이',{wood:2,stone:3})}</div><p style="font-size:12px">숲과 채석장에서 모은 자원으로 생존 도구를 만들어요.</p>`);
}
function cookingPanel(kind='stove'){
  const i=inv(),allowed=kind==='campfire'?['grilledFish','bakedPotato']:Object.keys(RECIPES);
  const cards=allowed.map(key=>{
    const r=RECIPES[key],have=Object.entries(r.req).every(([k,v])=>(i[k]||0)>=v);
    const req=Object.entries(r.req).map(([k,v])=>itemName(k)+' '+v).join(' · ');
    return `<div class="item"><b>${r.name}</b><div>${req}</div><button data-cook="${key}" ${have?'':'disabled'}>요리</button></div>`;
  }).join('');
  openPanel(`<h2>${kind==='campfire'?'야영지 모닥불':'우리 집 주방'}</h2><div class="grid">${cards}</div><p style="font-size:12px">음식은 허기를 채우고 체력도 조금 회복시켜요.</p>`);
}
function cookFood(key){
  const r=RECIPES[key],i=inv(),p=prog();if(!r)return;
  if(!Object.entries(r.req).every(([k,v])=>(i[k]||0)>=v)){toast('요리 재료가 부족해요.');return;}
  Object.entries(r.req).forEach(([k,v])=>i[k]=Math.max(0,(i[k]||0)-v));
  p.food[key]=(p.food[key]||0)+1;persist();setAvatarAction('smile',750);toast(r.name+' 완성!');updateStatus();
}
function eatFood(key){
  const p=prog(),f=FOOD_DEF[key];if(!f||(p.food[key]||0)<=0)return;
  p.food[key]--;p.survival.hunger=Math.min(p.survival.maxHunger,p.survival.hunger+f.hunger);
  p.energy=Math.min(p.maxEnergy,p.energy+f.energy);persist();setAvatarAction('smile',700);toast(f.name+'을(를) 먹었어요.');updateStatus();inventoryPanel();
}

panel.addEventListener('click',e=>{
  const craft=e.target.closest('[data-craft]');
  if(craft){
    const key=craft.dataset.craft,p=prog(),i=inv();
    const def=key==='axe'?{name:'돌도끼',req:{wood:3,stone:2},max:18}:{name:'돌곡괭이',req:{wood:2,stone:3},max:18};
    if(!Object.entries(def.req).every(([k,v])=>(i[k]||0)>=v)){toast('재료가 부족해요.');return;}
    Object.entries(def.req).forEach(([k,v])=>i[k]=Math.max(0,(i[k]||0)-v));
    p.tools[key]={dur:def.max,max:def.max,tier:'stone',craftedAt:Date.now()};persist();setAvatarAction('smile',750);toast(def.name+' 완성!');workbenchPanel();updateStatus();return;
  }
  const cook=e.target.closest('[data-cook]');if(cook){cookFood(cook.dataset.cook);cookingPanel(panel.dataset.cookKind||'stove');return;}
  const eat=e.target.closest('[data-eat]');if(eat){eatFood(eat.dataset.eat);return;}
});


const avatarCanvas=document.createElement('canvas');avatarCanvas.width=128;avatarCanvas.height=160;
const avatarCtx=avatarCanvas.getContext('2d');
const avatarTexture=new THREE.CanvasTexture(avatarCanvas);avatarTexture.colorSpace=THREE.SRGBColorSpace;
const avatarMaterial=new THREE.SpriteMaterial({map:avatarTexture,transparent:true,depthTest:true,depthWrite:false});
const avatar=new THREE.Sprite(avatarMaterial);avatar.scale.set(1.55,1.94,1);avatar.center.set(.5,.08);avatar.renderOrder=12;scene.add(avatar);
const shadow=new THREE.Mesh(new THREE.CircleGeometry(.55,28),new THREE.MeshBasicMaterial({color:0x233123,transparent:true,opacity:.22,depthWrite:false}));
shadow.rotation.x=-Math.PI/2;scene.add(shadow);
const avatarImg=new Image();avatarImg.decoding='async';
const avatarRuntimeFrame=document.getElementById('avatarRuntime');
let avatarFacing=1,lastAvatarFrame=0,lastAvatarSource='',avatarAction='',avatarActionUntil=0;
function drawFallbackAvatar(){
  avatarCtx.clearRect(0,0,128,160);avatarCtx.save();
  avatarCtx.fillStyle='#e0ba83';avatarCtx.beginPath();avatarCtx.arc(64,48,29,0,Math.PI*2);avatarCtx.fill();
  avatarCtx.fillStyle='#5b4733';avatarCtx.fillRect(39,75,50,55);avatarCtx.fillStyle='#f6f1dc';avatarCtx.fillRect(47,78,34,45);
  avatarCtx.restore();avatarTexture.needsUpdate=true;
}
function drawAvatarImage(){
  avatarCtx.clearRect(0,0,128,160);avatarCtx.save();
  if(avatarFacing<0){avatarCtx.translate(128,0);avatarCtx.scale(-1,1)}
  avatarCtx.drawImage(avatarImg,0,0,128,160);avatarCtx.restore();avatarTexture.needsUpdate=true;
}
avatarImg.onload=drawAvatarImage;avatarImg.onerror=drawFallbackAvatar;
function setAvatarSource(src,force=false){
  if(!src)return false;
  if(!force&&src===lastAvatarSource)return false;
  lastAvatarSource=src;avatarImg.src=src;return true;
}
function avatarApi(){
  try{
    const direct=avatarRuntimeFrame?.contentWindow?.KidscadeAvatarShop;
    if(direct?.renderPreviewFrame)return direct;
  }catch(_){}
  return Bridge?.avatarApi?.()||null;
}
function setAvatarAction(mode='smile',duration=650){
  avatarAction=mode;avatarActionUntil=performance.now()+duration;
}
function currentAvatarMode(now,moving){
  if(avatarAction&&now<avatarActionUntil)return avatarAction;
  if(avatarAction&&now>=avatarActionUntil)avatarAction='';
  return moving?'walk':'idle';
}
drawFallbackAvatar();setAvatarSource(Bridge?.readAvatarSource?.()||'',true);
avatarRuntimeFrame?.addEventListener('load',()=>{
  try{
    const api=avatarRuntimeFrame.contentWindow?.KidscadeAvatarShop;
    const src=api?.getPreviewDataURL?.()||Bridge?.readAvatarSource?.()||'';
    if(src)setAvatarSource(src,true);
  }catch(_){}
});
function updateAvatarFrame(now,moving){
  if(now-lastAvatarFrame<92)return;lastAvatarFrame=now;
  const mode=currentAvatarMode(now,moving),api=avatarApi();
  if(api){
    try{
      let s=api.renderPreviewFrame?.(mode,now/1000)||'';
      if(!s)s=api.getPreviewDataURL?.()||'';
      if(s?.startsWith('data:image'))setAvatarSource(s);
    }catch(_){}
  }else if(now%1600<110){
    setAvatarSource(Bridge?.readAvatarSource?.()||'',true);
  }
}
function applyAvatarMotion(now,moving){
  const action=currentAvatarMode(now,moving);
  let bob=0,sx=1,sy=1,shadowScale=1,shadowOpacity=.22;
  if(moving){
    const phase=now/112;
    const step=Math.abs(Math.sin(phase*Math.PI));
    bob=step*.115;sx=1+(1-step)*.018;sy=1-step*.035;shadowScale=1-step*.16;shadowOpacity=.22-step*.05;
  }else if(action==='smile'){
    const p=(now/180)%1;bob=Math.sin(p*Math.PI*2)*.035;sy=1.012;
  }else{
    const breathe=Math.sin(now/520)*.5+.5;
    bob=breathe*.018;sx=1+breathe*.006;sy=1-breathe*.004;shadowScale=1-breathe*.025;
  }
  avatar.position.y=.12+bob;
  avatar.scale.set(1.55*sx,1.94*sy,1);
  shadow.scale.set(shadowScale,shadowScale,shadowScale);
  shadow.material.opacity=shadowOpacity;
}

const keys=new Set();
addEventListener('keydown',e=>{
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','W','A','S','D'].includes(e.key)){keys.add(e.key.toLowerCase());e.preventDefault()}
  if((e.key==='e'||e.key==='E'||e.key===' ')&&!panel.classList.contains('open')){e.preventDefault();doInteract()}
  if(e.key==='Escape'){if(panel.classList.contains('open'))closePanel();else window.parent?.postMessage({type:'kidscade-life-world-close'},location.origin)}
});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
document.querySelectorAll('.mobile [data-key]').forEach(b=>{
  const k=b.dataset.key.toLowerCase();
  const down=e=>{e.preventDefault();keys.add(k)};const up=e=>{e.preventDefault();keys.delete(k)};
  b.addEventListener('pointerdown',down);b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('pointerleave',up);
});
document.getElementById('mobileInteract').onclick=doInteract;
document.getElementById('close').onclick=()=>window.parent?.postMessage({type:'kidscade-life-world-close'},location.origin);
document.getElementById('stable').onclick=()=>location.href='../world-v2/kidscade-world.html?v=8';

const LAYOUT_VERSION=2;
let mode='outdoor';
const savedLayout=Number(save.player?.v3Layout||0);
const player={
  x:savedLayout===LAYOUT_VERSION&&Number.isFinite(Number(save.player?.v3x))?Number(save.player.v3x):-8.4,
  z:savedLayout===LAYOUT_VERSION&&Number.isFinite(Number(save.player?.v3z))?Number(save.player.v3z):1.7,
  speed:5.1
};
function isBlocked(nx,nz){
  const bounds=mode==='outdoor'?{x1:-30,x2:30,z1:-22,z2:22}:{x1:-6.6,x2:6.6,z1:-4.7,z2:4.7};
  if(nx<bounds.x1||nx>bounds.x2||nz<bounds.z1||nz>bounds.z2)return true;
  return colliders[mode].some(c=>nx>c.x-c.w/2-.32&&nx<c.x+c.w/2+.32&&nz>c.z-c.d/2-.24&&nz<c.z+c.d/2+.24);
}
let near=null;
function nearestInteraction(){
  const list=interactables[mode];let best=null,bestD=999;
  for(const q of list){const d=Math.hypot(player.x-q.x,player.z-q.z);if(d<q.r&&d<bestD){best=q;bestD=d}}
  near=best;
  promptEl.textContent=best?((matchMedia('(max-width:760px)').matches?'행동':'E / Space')+' · '+best.label):'';
  promptEl.classList.toggle('show',!!best);
}
function doInteract(){if(near)near.action()}
function updateZone(){
  if(mode==='indoor'){zoneEl.textContent='우리 집 · 3D 실내';return;}
  const x=player.x,z=player.z;
  if(x<-8.5&&z>3.0)zoneEl.textContent='연못 · 휴식 구역';
  else if(x>10.5&&z>3.2)zoneEl.textContent='작업장 · 제작 구역';
  else if(x>4.2&&z>2.7)zoneEl.textContent='농장 · 작물 구역';
  else if(x<-5.5&&z<-.8)zoneEl.textContent='집 앞 · 마당';
  else zoneEl.textContent='마을길';
}
function setMode(next){
  mode=next;outdoor.visible=next==='outdoor';indoor.visible=next==='indoor';
  if(next==='indoor'){player.x=0;player.z=3.55;zoneEl.textContent='우리 집 · 3D 실내';toast('집 안으로 들어왔어요.')}
  else{player.x=-8.8;player.z=-1.55;zoneEl.textContent='집 앞 · 3D 마을';toast('집 밖으로 나왔어요.')}
  setAvatarAction('smile',520);near=null;
}
function spendTool(kind,item){
  const p=prog(),t=p.tools[item];
  if(!t||t.dur<=0){toast((item==='axe'?'도끼':'곡괭이')+'가 필요해요. 제작대에서 만들어 보세요.');return false}
  if(p.energy<=4){toast('체력이 부족해요. 집 침대에서 쉬어 보세요.');return false}
  t.dur--;p.energy=Math.max(0,p.energy-(kind==='wood'?4:5));const i=inv();i[kind]=(i[kind]||0)+1;persist();updateStatus();toast(item==='axe'?'목재 +1':'돌 +1');return true;
}
function sleep(){
  const p=prog();p.energy=p.maxEnergy||100;persist();updateStatus();toast('푹 쉬어서 체력이 회복됐어요.');
}
function fish(){
  const p=prog();if(p.energy<3){toast('체력이 부족해요.');return}
  p.energy=Math.max(0,p.energy-3);toast('낚시 중…');
  setTimeout(()=>{const i=inv();i.fish=(i.fish||0)+1;p.fishDex=p.fishDex||{};p.fishDex['3D 연못 물고기']=(p.fishDex['3D 연못 물고기']||0)+1;persist();setAvatarAction('smile',900);updateStatus();toast('물고기를 잡았어요! +1');},850);
}
function cropState(id,type){
  const p=prog();let s=p.crops[id];if(!s||typeof s!=='object')s=p.crops[id]={type,phase:'empty',plantedAt:0,readyAt:0};s.type=type;
  if(s.phase==='growing'&&Date.now()>=s.readyAt)s.phase='ripe';return s;
}
function cropAction(id,type,name){
  const p=prog(),s=cropState(id,type),i=inv();
  if(s.phase==='empty'){
    if((p.seeds[type]||0)<=0){toast(name+' 씨앗이 없어요.');return}
    p.seeds[type]--;s.phase='planted';s.plantedAt=Date.now();persist();toast(name+' 씨앗을 심었어요. 다시 행동해서 물을 주세요.');
  }else if(s.phase==='planted'){
    s.phase='growing';s.readyAt=Date.now()+35000;persist();toast(name+'에 물을 줬어요.');
  }else if(s.phase==='growing'){
    const sec=Math.max(1,Math.ceil((s.readyAt-Date.now())/1000));toast(name+' 성장 중 · '+sec+'초');
  }else{
    i[type]=(i[type]||0)+2;p.seeds[type]=(p.seeds[type]||0)+1;s.phase='empty';s.readyAt=0;persist();toast(name+' 수확 +2');updateStatus();
  }
  updateCropVisuals();
}

const cropVisual=[];
function makePlant(color){
  const g=new THREE.Group();
  const stem=new THREE.Mesh(new THREE.CylinderGeometry(.045,.055,.65,8),new THREE.MeshStandardMaterial({color:0x5d9b4e}));
  stem.position.y=.33;g.add(stem);
  for(const sx of [-.18,.18]){const leaf=new THREE.Mesh(new THREE.SphereGeometry(.16,10,8),new THREE.MeshStandardMaterial({color:0x70ac55}));leaf.scale.set(1.3,.45,.7);leaf.position.set(sx,.48,0);g.add(leaf)}
  const fruit=new THREE.Mesh(new THREE.SphereGeometry(.16,12,10),new THREE.MeshStandardMaterial({color}));fruit.position.y=.70;g.add(fruit);
  return g;
}
function updateCropVisuals(){
  cropVisual.forEach(v=>{
    const s=cropState(v.id,v.type);
    const scale=s.phase==='empty'?0:s.phase==='planted'?.3:s.phase==='growing'?.55:1;
    v.object.scale.setScalar(scale);
  });
}

function addColliderFor(modeName,x,z,w,d){collider(modeName,x,z,w,d)}
async function buildOutdoor(){
  // Base lawn and a clear path hierarchy: home -> village path -> farm/work zone.
  plane(outdoor,0,0,40,28,0x7caf63,0);
  box(outdoor,0,0,40,28,.22,0x6c9657,-.22);

  // Main east-west path and short branches.
  box(outdoor,0,.7,31,2.0,.10,0xd8c79c,.03);
  box(outdoor,-8.8,-2.2,2.1,6.0,.10,0xd8c79c,.03);
  box(outdoor,10.8,-2.5,2.1,5.5,.10,0xd8c79c,.03);
  box(outdoor,-10.8,4.0,1.8,5.8,.10,0xd8c79c,.03);
  box(outdoor,12.8,5.3,4.8,3.6,.10,0xbda873,.025);

  // Pond and a calmer resting/garden area on the west side.
  const pond=new THREE.Mesh(
    new THREE.CylinderGeometry(3.15,3.3,.13,48),
    new THREE.MeshStandardMaterial({color:0x67b5d3,roughness:.26,metalness:.03,transparent:true,opacity:.94})
  );
  pond.position.set(-12.4,.04,6.5);pond.receiveShadow=true;outdoor.add(pond);
  const pondRim=new THREE.Mesh(
    new THREE.RingGeometry(3.15,3.48,48),
    new THREE.MeshStandardMaterial({color:0xc9b887,roughness:.9,side:THREE.DoubleSide})
  );
  pondRim.rotation.x=-Math.PI/2;pondRim.position.set(-12.4,.115,6.5);outdoor.add(pondRim);

  // Home lot, farm house/barn, workshop.
  await Promise.all([
    addModel(outdoor,ASSET.house,{x:-8.8,z:-5.6,w:6.7,h:6.2,d:5.4,rot:Math.PI,name:'home3d'}),
    addModel(outdoor,ASSET.farmHouse,{x:10.8,z:-6.0,w:4.8,h:4.5,d:4.2,rot:Math.PI,name:'farmhouse3d'}),
    addModel(outdoor,ASSET.workbench,{x:13.6,z:5.5,w:2.0,h:1.5,d:1.3,rot:-.35,name:'workbench3d'}),
    addModel(outdoor,ASSET.chest,{x:11.8,z:5.7,w:1.3,h:1.0,d:1.0,rot:.15,name:'chest3d'})
  ]);
  addColliderFor('outdoor',-8.8,-5.6,5.8,4.4);
  addColliderFor('outdoor',10.8,-6.0,4.0,3.3);
  addColliderFor('outdoor',13.6,5.5,1.6,1.0);
  addColliderFor('outdoor',11.8,5.7,1.0,.8);
  interact('outdoor',-8.8,-2.45,1.8,'집에 들어가기',()=>setMode('indoor'));
  interact('outdoor',13.6,4.65,1.45,'제작대 사용하기',workbenchPanel);
  interact('outdoor',11.8,4.9,1.35,'보관 상자 보기',inventoryPanel);
  interact('outdoor',-10.8,6.1,2.0,'연못에서 낚시하기',()=>{setAvatarAction('smile',850);fish();});

  // Farm plots: one compact farm block, off the road.
  const types=[['potato','감자',0xc69b5b],['carrot','당근',0xe67e3a],['tomato','토마토',0xc95142]];
  types.forEach((v,i)=>{
    const x=5.8+i*2.8,z=4.55;
    box(outdoor,x,z,2.15,2.2,.18,0x8a5d3b,.02);
    for(let r=-1;r<=1;r++){const ridge=box(outdoor,x+r*.55,z,.28,1.9,.12,0x70472f,.20);ridge.castShadow=false}
    const plant=makePlant(v[2]);plant.position.set(x,.24,z);outdoor.add(plant);
    const id='work-crop-'+(i+1);cropVisual.push({id,type:v[0],object:plant});
    interact('outdoor',x,z,1.45,v[1]+' 밭 돌보기',()=>{setAvatarAction('smile',650);cropAction(id,v[0],v[1]);});
  });
  updateCropVisuals();

  // A light fence line visually separates farm from the walking path.
  for(const [x,z,rot] of [[5.0,2.95,0],[7.5,2.95,0],[10.0,2.95,0],[12.5,2.95,0],[4.5,5.3,Math.PI/2],[13.4,5.3,Math.PI/2]]){
    await addModel(outdoor,ASSET.fence,{x,z,w:2.3,h:1.0,d:.35,rot});
  }

  // Trees form a readable perimeter/woodland rather than random clutter.
  const treePos=[
    [-17,-9],[-14,-9],[-4,-9],[1,-9],[5,-9],[16,-9],
    [-18,-4],[-18,1],[-18,8],[-7,10],[-2,10],[2,10],[17,9],[17,3],[17,-3],
    [-14,1.5],[-4,6.8]
  ];
  const treeAssets=[ASSET.tree,ASSET.oak,ASSET.pine];
  for(let i=0;i<treePos.length;i++){
    const [x,z]=treePos[i];await addModel(outdoor,treeAssets[i%3],{x,z,w:2.4,h:3.8+(i%2)*.5,d:2.4,rot:(i%5)*.42});
    addColliderFor('outdoor',x,z,.7,.7);
    interact('outdoor',x,z,1.3,'나무 베기',()=>{if(spendTool('wood','axe'))setAvatarAction('smile',450);});
  }

  // Rocks are grouped as a small quarry near the eastern edge.
  const rocks=[[15.1,1.8],[16.0,4.1],[14.7,7.2],[-15.8,7.7]];
  const rockAssets=[ASSET.rockA,ASSET.rockB,ASSET.rockC];
  for(let i=0;i<rocks.length;i++){
    const [x,z]=rocks[i];await addModel(outdoor,rockAssets[i%3],{x,z,w:1.45,h:1.1,d:1.4,rot:i*.65});
    addColliderFor('outdoor',x,z,.82,.68);
    interact('outdoor',x,z,1.2,'바위 캐기',()=>{if(spendTool('stone','pick'))setAvatarAction('smile',450);});
  }

  // Home flower bed and pond-side flowers.
  for(const [x,z] of [[-5.2,-5.2],[-4.5,-4.7],[-5.4,-4.1],[-9.8,4.2],[-14.8,4.8],[-9.2,7.6]]){
    await addModel(outdoor,ASSET.flower,{x,z,w:.55,h:.5,d:.55,rot:0});
  }
}

async function buildIndoor(){
  // Open doll-house room with a clear entrance and three zones:
  // bedroom (left/back), living (left/front), kitchen+dining (right).
  box(indoor,0,0,14,10.5,.24,0xc8a36e,-.18);
  box(indoor,0,-5.25,14,.28,2.75,0xe8d9b4,0);
  box(indoor,-7,0,.28,10.5,2.75,0xe2d0a6,0);
  box(indoor,7,0,.28,10.5,2.75,0xe2d0a6,0);
  box(indoor,0,-5.05,14,.18,.18,0x9f7651,2.75);

  // Subtle floor zones make the layout easier to read without full walls.
  plane(indoor,-3.8,-2.7,5.4,4.5,0xd6b77f,.005);
  plane(indoor,-3.5,1.9,5.5,3.3,0xcfaa73,.006);
  plane(indoor,3.3,-1.8,6.0,6.0,0xdcc89b,.006);

  await Promise.all([
    // Bedroom
    addModel(indoor,ASSET.bed,{x:-5.2,z:-3.8,w:2.6,h:1.25,d:2.1,rot:Math.PI/2}),
    addModel(indoor,ASSET.desk,{x:-2.6,z:-3.75,w:2.0,h:1.4,d:1.2,rot:Math.PI}),
    addModel(indoor,ASSET.bookcase,{x:-5.7,z:-1.45,w:1.6,h:2.45,d:.78,rot:Math.PI/2}),
    // Living
    addModel(indoor,ASSET.rug,{x:-3.0,z:1.6,w:4.2,h:.10,d:2.8,rot:0}),
    addModel(indoor,ASSET.sofa,{x:-4.55,z:1.15,w:2.9,h:1.4,d:1.45,rot:Math.PI/2}),
    // Dining
    addModel(indoor,ASSET.table,{x:1.0,z:1.35,w:2.4,h:1.3,d:1.9,rot:0}),
    // Kitchen line
    addModel(indoor,ASSET.stove,{x:1.4,z:-4.0,w:1.3,h:1.45,d:1.1,rot:Math.PI}),
    addModel(indoor,ASSET.sink,{x:3.0,z:-4.0,w:1.55,h:1.3,d:1.0,rot:Math.PI}),
    addModel(indoor,ASSET.cabinet,{x:4.55,z:-4.0,w:1.55,h:1.3,d:1.0,rot:Math.PI}),
    addModel(indoor,ASSET.fridge,{x:5.9,z:-3.7,w:1.25,h:2.3,d:1.2,rot:Math.PI})
  ]);

  // Collisions leave a wide central route from door to every zone.
  addColliderFor('indoor',-5.2,-3.8,2.35,1.6);
  addColliderFor('indoor',-2.6,-3.75,1.8,.9);
  addColliderFor('indoor',-5.7,-1.45,.7,1.2);
  addColliderFor('indoor',-4.55,1.15,1.1,2.5);
  addColliderFor('indoor',1.0,1.35,2.0,1.5);
  addColliderFor('indoor',1.4,-4.0,1.1,.78);
  addColliderFor('indoor',3.0,-4.0,1.35,.78);
  addColliderFor('indoor',4.55,-4.0,1.35,.78);
  addColliderFor('indoor',5.9,-3.7,1.0,.9);

  interact('indoor',0,4.35,1.45,'밖으로 나가기',()=>setMode('outdoor'));
  interact('indoor',-5.2,-2.55,1.4,'침대에서 쉬기',()=>{setAvatarAction('smile',850);sleep();});
  interact('indoor',-4.0,2.3,1.35,'소파에 앉기',()=>{setAvatarAction('smile',700);toast('소파에서 편하게 쉬었어요.');});
  interact('indoor',-5.0,-.8,1.25,'책장 살펴보기',()=>{setAvatarAction('smile',600);toast('책이 가지런히 꽂혀 있어요.');});
  interact('indoor',5.4,-2.75,1.35,'냉장고 열기',inventoryPanel);
  interact('indoor',3.0,-2.9,1.25,'싱크대 사용하기',()=>{setAvatarAction('smile',650);toast('손을 깨끗이 씻었어요.');});
  interact('indoor',1.4,-2.9,1.25,'가스레인지 살펴보기',()=>{setAvatarAction('smile',650);toast('요리 시스템은 기존 저장과 연동해 이식 중이에요.');});
  interact('indoor',1.0,2.25,1.35,'식탁 살펴보기',()=>toast('식사와 요리를 이어갈 수 있는 식탁이에요.'));
}

function updateStatus(){
  const p=prog(),i=inv(),pct=Math.max(0,Math.min(100,(p.energy||0)/(p.maxEnergy||100)*100));
  const axe=p.tools.axe?.dur>0?`돌도끼 ${p.tools.axe.dur}`:'도끼 없음';
  const pick=p.tools.pick?.dur>0?`돌곡괭이 ${p.tools.pick.dur}`:'곡괭이 없음';
  statusEl.innerHTML=`<b>체력 ${Math.round(p.energy||0)}/${p.maxEnergy||100}</b><div class="energy"><i style="width:${pct}%"></i></div>${axe}<br>${pick}<br>목재 ${i.wood||0} · 돌 ${i.stone||0} · 물고기 ${i.fish||0}<hr style="border:0;border-top:1px solid rgba(255,255,255,.25)">씨앗 ${Bridge?.readSeeds?.()||0}`;
}

function resize(){
  const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);
  const aspect=w/Math.max(1,h),v=8.6;
  camera.top=v;camera.bottom=-v;camera.left=-v*aspect;camera.right=v*aspect;camera.updateProjectionMatrix();
}
addEventListener('resize',resize);resize();

let last=performance.now(),saveClock=0;
function tick(now){
  requestAnimationFrame(tick);
  const dt=Math.min(.05,(now-last)/1000);last=now;
  let dx=0,dz=0;
  if(keys.has('arrowleft')||keys.has('a'))dx-=1;
  if(keys.has('arrowright')||keys.has('d'))dx+=1;
  if(keys.has('arrowup')||keys.has('w'))dz-=1;
  if(keys.has('arrowdown')||keys.has('s'))dz+=1;
  const moving=!!(dx||dz);
  if(moving){
    const len=Math.hypot(dx,dz)||1;dx/=len;dz/=len;
    const nx=player.x+dx*player.speed*dt,nz=player.z+dz*player.speed*dt;
    if(!isBlocked(nx,player.z))player.x=nx;
    if(!isBlocked(player.x,nz))player.z=nz;
    if(dx){
      const nextFacing=dx<0?-1:1;
      if(nextFacing!==avatarFacing){avatarFacing=nextFacing;if(avatarImg.complete)drawAvatarImage();}
    }
  }
  avatar.position.x=player.x;avatar.position.z=player.z;
  shadow.position.set(player.x,.035,player.z+.08);
  updateAvatarFrame(now,moving);
  applyAvatarMotion(now,moving);

  const off=mode==='outdoor'?new THREE.Vector3(10.5,13.5,13.5):new THREE.Vector3(8.0,10.2,10.0);
  const target=new THREE.Vector3(player.x,0,player.z);
  camera.position.lerp(target.clone().add(off),1-Math.pow(.0015,dt));
  camera.lookAt(target.x,mode==='outdoor'?.2:.55,target.z);
  nearestInteraction();
  updateZone();

  saveClock+=dt;if(saveClock>1.4){saveClock=0;save.player=save.player||{};save.player.v3x=player.x;save.player.v3z=player.z;save.player.v3scene=mode;save.player.v3Layout=LAYOUT_VERSION;persist();}
  renderer.render(scene,camera);
}
async function init(){
  updateStatus();
  await Promise.all([buildOutdoor(),buildIndoor()]);
  const previous=save.player?.v3scene;
  if(previous==='indoor')setMode('indoor');
  else{mode='outdoor';outdoor.visible=true;indoor.visible=false;zoneEl.textContent='집 앞 · 3D 마을'}
  loading.classList.add('hide');
  canvas.focus();requestAnimationFrame(tick);
}
init().catch(err=>{console.error(err);loading.textContent='3D 월드를 불러오지 못했어요. 2D 안정판 버튼으로 돌아갈 수 있어요.'});

window.KidscadeWorldV3={version:3,resetInput(){keys.clear()},refresh(){save=Storage?.load?.()||save;setAvatarSource(Bridge?.readAvatarSource?.()||'');updateStatus()},setMode};

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
  rug:P.furniture+'rug-rectangle.glb'
};

const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
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

scene.add(new THREE.HemisphereLight(0xfff7e2,0x5d7b54,2.0));
const sun=new THREE.DirectionalLight(0xfff0cc,3.4);
sun.position.set(-10,18,11);
sun.castShadow=true;
sun.shadow.mapSize.set(1024,1024);
sun.shadow.camera.left=-22;sun.shadow.camera.right=22;sun.shadow.camera.top=22;sun.shadow.camera.bottom=-22;
scene.add(sun);

const outdoor=new THREE.Group(),indoor=new THREE.Group();
scene.add(outdoor,indoor);indoor.visible=false;

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
  save.progression.energy=Number(save.progression.energy??100);
  save.progression.maxEnergy=Number(save.progression.maxEnergy??100);
  save.progression.tools=save.progression.tools||{};
  save.progression.seeds={potato:2,carrot:2,tomato:2,...(save.progression.seeds||{})};
  save.progression.crops=save.progression.crops||{};
  save.progression.food=save.progression.food||{};
  save.progression.fishDex=save.progression.fishDex||{};
  return save.progression;
}
const itemName=k=>({wood:'목재',stone:'돌',iron:'철광석',potato:'감자',carrot:'당근',tomato:'토마토',fish:'물고기',bug:'곤충'})[k]||k;

function inventoryPanel(){
  const items=Object.entries(inv()).filter(([,v])=>Number(v)>0);
  openPanel(`<h2>보관함</h2><div class="grid">${items.length?items.map(([k,v])=>`<div class="item"><b>${itemName(k)}</b><div>${v}개</div></div>`).join(''):'<div class="item">아직 보관한 재료가 없어요.</div>'}</div>`);
}
function workbenchPanel(){
  const p=prog(),i=inv(),tool=(key,name,req)=>{const have=Object.entries(req).every(([k,v])=>(i[k]||0)>=v);const owned=p.tools[key]?.dur>0;return `<div class="item"><b>${name}</b><div>${Object.entries(req).map(([k,v])=>itemName(k)+' '+v).join(' · ')}</div><button data-craft="${key}" ${have?'':'disabled'}>${owned?'수리/재제작':'제작'}</button></div>`;};
  openPanel(`<h2>3D 제작대</h2><div class="grid">${tool('axe','돌도끼',{wood:3,stone:2})}${tool('pick','돌곡괭이',{wood:2,stone:3})}</div><p style="font-size:12px">기존 v2 저장과 같은 인벤토리·도구 상태를 사용합니다.</p>`);
}
panel.addEventListener('click',e=>{
  const b=e.target.closest('[data-craft]');if(!b)return;
  const key=b.dataset.craft,p=prog(),i=inv();
  const def=key==='axe'?{name:'돌도끼',req:{wood:3,stone:2},max:18}:{name:'돌곡괭이',req:{wood:2,stone:3},max:18};
  if(!Object.entries(def.req).every(([k,v])=>(i[k]||0)>=v)){toast('재료가 부족해요.');return;}
  Object.entries(def.req).forEach(([k,v])=>i[k]=Math.max(0,(i[k]||0)-v));
  p.tools[key]={dur:def.max,max:def.max,tier:'stone',craftedAt:Date.now()};persist();toast(def.name+' 완성!');workbenchPanel();updateStatus();
});

const avatarCanvas=document.createElement('canvas');avatarCanvas.width=128;avatarCanvas.height=160;
const avatarCtx=avatarCanvas.getContext('2d');
const avatarTexture=new THREE.CanvasTexture(avatarCanvas);avatarTexture.colorSpace=THREE.SRGBColorSpace;
const avatarMaterial=new THREE.SpriteMaterial({map:avatarTexture,transparent:true,depthTest:true,depthWrite:false});
const avatar=new THREE.Sprite(avatarMaterial);avatar.scale.set(1.55,1.94,1);avatar.center.set(.5,.08);avatar.renderOrder=12;scene.add(avatar);
const shadow=new THREE.Mesh(new THREE.CircleGeometry(.55,28),new THREE.MeshBasicMaterial({color:0x233123,transparent:true,opacity:.22,depthWrite:false}));
shadow.rotation.x=-Math.PI/2;scene.add(shadow);
const avatarImg=new Image();avatarImg.decoding='async';
let avatarFacing=1,lastAvatarFrame=0,lastAvatarSource='';
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
function setAvatarSource(src){if(!src||src===lastAvatarSource)return;lastAvatarSource=src;avatarImg.src=src}
drawFallbackAvatar();setAvatarSource(Bridge?.readAvatarSource?.()||'');
function updateAvatarFrame(now,moving){
  if(now-lastAvatarFrame<110)return;lastAvatarFrame=now;
  const api=Bridge?.avatarApi?.();
  if(api?.renderPreviewFrame){
    try{const s=api.renderPreviewFrame(moving?'walk':'idle',now/1000);if(s?.startsWith('data:image'))setAvatarSource(s);}catch(_){}
  }else if(now%2000<120)setAvatarSource(Bridge?.readAvatarSource?.()||'');
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

let mode='outdoor';
const player={x:Number(save.player?.v3x)||-7,z:Number(save.player?.v3z)||4,speed:5.1};
function isBlocked(nx,nz){
  const bounds=mode==='outdoor'?{x1:-18,x2:18,z1:-11,z2:11}:{x1:-6,x2:6,z1:-4.4,z2:4.6};
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
function setMode(next){
  mode=next;outdoor.visible=next==='outdoor';indoor.visible=next==='indoor';
  if(next==='indoor'){player.x=0;player.z=3.2;zoneEl.textContent='우리 집 · 3D 실내';toast('3D 집 안으로 들어왔어요.')}
  else{player.x=-7;player.z=4.4;zoneEl.textContent='집 앞 · 3D 마을';toast('집 밖으로 나왔어요.')}
  near=null;
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
  setTimeout(()=>{const i=inv();i.fish=(i.fish||0)+1;p.fishDex=p.fishDex||{};p.fishDex['3D 연못 물고기']=(p.fishDex['3D 연못 물고기']||0)+1;persist();updateStatus();toast('물고기를 잡았어요! +1');},850);
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
  plane(outdoor,0,0,38,25,0x78ad5f,0);
  box(outdoor,0,0,38,25,.22,0x6c9657,-.22);
  box(outdoor,-1.5,2.4,31,2.1,.12,0xd8c79c,.03);
  box(outdoor,-7,0,2.2,8,.12,0xd8c79c,.03);
  box(outdoor,7,3.3,2.2,9,.12,0xd8c79c,.03);
  const pond=new THREE.Mesh(new THREE.CylinderGeometry(3.2,3.35,.12,48),new THREE.MeshStandardMaterial({color:0x68b7d5,roughness:.25,metalness:.05,transparent:true,opacity:.93}));
  pond.position.set(-12,.04,7);outdoor.add(pond);

  await Promise.all([
    addModel(outdoor,ASSET.house,{x:-8.3,z:-3.3,w:6.8,h:6.4,d:5.5,rot:Math.PI,name:'home3d'}),
    addModel(outdoor,ASSET.farmHouse,{x:11.2,z:-5.8,w:4.8,h:4.6,d:4.4,rot:Math.PI,name:'farmhouse3d'}),
    addModel(outdoor,ASSET.workbench,{x:4.4,z:8.2,w:2.0,h:1.5,d:1.3,rot:-.45,name:'workbench3d'}),
    addModel(outdoor,ASSET.chest,{x:2.5,z:8.0,w:1.25,h:1.0,d:1.0,rot:.25,name:'chest3d'})
  ]);
  addColliderFor('outdoor',-8.3,-3.3,5.9,4.5);
  addColliderFor('outdoor',11.2,-5.8,4.1,3.4);
  addColliderFor('outdoor',4.4,8.2,1.6,1.0);
  addColliderFor('outdoor',2.5,8.0,1.0,.8);
  interact('outdoor',-8.3,-.35,2.0,'집에 들어가기',()=>setMode('indoor'));
  interact('outdoor',4.4,7.2,1.5,'제작대 사용하기',workbenchPanel);
  interact('outdoor',2.5,7.1,1.4,'보관 상자 보기',inventoryPanel);
  interact('outdoor',-10.5,6.5,2.1,'연못에서 낚시하기',fish);

  const treePos=[[-16,-7],[-13,-4],[-15,0],[-16,4],[-4,-8],[-1,-8],[3,-8],[7,-8],[15,-8],[16,-3],[15,2],[16,7],[-16,9],[-5,10],[0,10],[11,9]];
  const treeAssets=[ASSET.tree,ASSET.oak,ASSET.pine];
  for(let i=0;i<treePos.length;i++){
    const [x,z]=treePos[i];await addModel(outdoor,treeAssets[i%3],{x,z,w:2.5,h:4.0+(i%2)*.5,d:2.5,rot:(i%5)*.45});
    addColliderFor('outdoor',x,z,.7,.7);interact('outdoor',x,z,1.35,'나무 베기',()=>spendTool('wood','axe'));
  }
  const rocks=[[-3,7],[0,7.8],[13,5],[10,9],[-14,3.8]];
  const rockAssets=[ASSET.rockA,ASSET.rockB,ASSET.rockC];
  for(let i=0;i<rocks.length;i++){
    const [x,z]=rocks[i];await addModel(outdoor,rockAssets[i%3],{x,z,w:1.5,h:1.15,d:1.45,rot:i*.7});
    addColliderFor('outdoor',x,z,.85,.7);interact('outdoor',x,z,1.25,'바위 캐기',()=>spendTool('stone','pick'));
  }

  const types=[['potato','감자',0xc69b5b],['carrot','당근',0xe67e3a],['tomato','토마토',0xc95142]];
  types.forEach((v,i)=>{
    const x=6+i*2.7,z=2.1;
    box(outdoor,x,z,2.1,2.0,.18,0x8a5d3b,.02);
    for(let r=-1;r<=1;r++){const ridge=box(outdoor,x+r*.55,z,0.28,1.75,.12,0x70472f,.20);ridge.castShadow=false}
    const plant=makePlant(v[2]);plant.position.set(x,.24,z);outdoor.add(plant);
    const id='work-crop-'+(i+1);cropVisual.push({id,type:v[0],object:plant});
    interact('outdoor',x,z,1.45,v[1]+' 밭 돌보기',()=>cropAction(id,v[0],v[1]));
  });
  updateCropVisuals();

  for(const [x,z] of [[-11,-8],[-6,7],[8,-1],[12,2],[-2,-3],[4,5]]){
    await addModel(outdoor,ASSET.flower,{x,z,w:.55,h:.5,d:.55,rot:0});
  }
}

async function buildIndoor(){
  box(indoor,0,0,13,10,.24,0xc8a36e,-.18);
  box(indoor,0,-5,13,.28,2.7,0xe8d9b4,0);
  box(indoor,-6.5,0,.28,10,2.7,0xe2d0a6,0);
  box(indoor,6.5,0,.28,10,2.7,0xe2d0a6,0);
  const backMat=0x9f7651;
  box(indoor,0,-4.82,13,.18,.18,backMat,2.7);
  await Promise.all([
    addModel(indoor,ASSET.bed,{x:-4.6,z:-3.3,w:2.7,h:1.3,d:2.2,rot:Math.PI/2}),
    addModel(indoor,ASSET.desk,{x:-1.7,z:-3.5,w:2.2,h:1.45,d:1.25,rot:Math.PI}),
    addModel(indoor,ASSET.bookcase,{x:.8,z:-4.1,w:1.8,h:2.5,d:.8,rot:Math.PI}),
    addModel(indoor,ASSET.fridge,{x:4.9,z:-3.9,w:1.3,h:2.35,d:1.25,rot:Math.PI}),
    addModel(indoor,ASSET.sink,{x:3.15,z:-3.85,w:1.6,h:1.35,d:1.05,rot:Math.PI}),
    addModel(indoor,ASSET.stove,{x:1.75,z:-3.85,w:1.35,h:1.5,d:1.15,rot:Math.PI}),
    addModel(indoor,ASSET.cabinet,{x:4.1,z:-1.9,w:1.7,h:1.35,d:1.0,rot:Math.PI/2}),
    addModel(indoor,ASSET.sofa,{x:-3.8,z:1.1,w:3.0,h:1.45,d:1.5,rot:0}),
    addModel(indoor,ASSET.table,{x:-.4,z:.7,w:2.4,h:1.35,d:2.0,rot:0}),
    addModel(indoor,ASSET.rug,{x:-1.6,z:1.0,w:4.2,h:.12,d:3.1,rot:0})
  ]);
  addColliderFor('indoor',-4.6,-3.3,2.5,1.7);
  addColliderFor('indoor',-1.7,-3.5,2.0,1.0);
  addColliderFor('indoor',.8,-4.1,1.3,.65);
  addColliderFor('indoor',4.9,-3.9,1.1,.9);
  addColliderFor('indoor',3.15,-3.85,1.4,.8);
  addColliderFor('indoor',1.75,-3.85,1.15,.8);
  addColliderFor('indoor',-3.8,1.1,2.7,1.1);
  addColliderFor('indoor',-.4,.7,2.0,1.45);
  interact('indoor',0,4.0,1.5,'밖으로 나가기',()=>setMode('outdoor'));
  interact('indoor',-4.6,-2.1,1.45,'침대에서 쉬기',sleep);
  interact('indoor',-3.8,2.2,1.45,'소파에 앉기',()=>toast('3D 소파에서 잠깐 쉬었어요.'));
  interact('indoor',.8,-3.0,1.3,'책장 살펴보기',()=>toast('책이 가지런히 꽂혀 있어요.'));
  interact('indoor',4.9,-2.8,1.3,'냉장고 열기',inventoryPanel);
  interact('indoor',3.15,-2.8,1.3,'싱크대 사용하기',()=>toast('손을 깨끗이 씻었어요.'));
  interact('indoor',1.75,-2.75,1.3,'가스레인지 살펴보기',()=>toast('요리 시스템은 기존 저장과 연동해 이식 중이에요.'));
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
    if(dx)avatarFacing=dx<0?-1:1;
  }
  avatar.position.set(player.x,.12,player.z);
  shadow.position.set(player.x,.035,player.z+.08);
  updateAvatarFrame(now,moving);
  if(moving&&avatarImg.complete)drawAvatarImage();

  const off=mode==='outdoor'?new THREE.Vector3(10.5,13.5,13.5):new THREE.Vector3(8.0,10.2,10.0);
  const target=new THREE.Vector3(player.x,0,player.z);
  camera.position.lerp(target.clone().add(off),1-Math.pow(.0015,dt));
  camera.lookAt(target.x,mode==='outdoor'?.2:.55,target.z);
  nearestInteraction();

  saveClock+=dt;if(saveClock>1.4){saveClock=0;save.player=save.player||{};save.player.v3x=player.x;save.player.v3z=player.z;save.player.v3scene=mode;persist();}
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

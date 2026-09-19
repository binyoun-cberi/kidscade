import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {buildKidscadeCity} from './kidscade-world-city.js?v=12';
import {createTownEconomy} from './kidscade-world-economy.js?v=9';
import {createFurnishingSystem} from './kidscade-world-furnishing.js?v=4';
import {createWorldAudio} from './kidscade-world-audio.js?v=1';

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
const audioToggle=document.getElementById('audioToggle');
const worldAudio=createWorldAudio();
function syncAudioButton(){if(audioToggle)audioToggle.textContent=worldAudio.label()}
audioToggle?.addEventListener('click',()=>{worldAudio.toggle();syncAudioButton()});
addEventListener('pointerdown',()=>worldAudio.unlock(),{once:true});
addEventListener('keydown',()=>worldAudio.unlock(),{once:true});
syncAudioButton();

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
  signpost:P.survival+'signpost.glb',
  petDog:'../assets/game/characters/pets/animal-dog.glb',
  petCat:'../assets/game/characters/pets/animal-cat.glb',
  petBunny:'../assets/game/characters/pets/animal-bunny.glb',
  petParrot:'../assets/game/characters/pets/animal-parrot.glb',
  petPig:'../assets/game/characters/pets/animal-pig.glb',
  petFox:'../assets/game/characters/pets/animal-fox.glb',
  petDeer:'../assets/game/characters/pets/animal-deer.glb',
  petCow:'../assets/game/characters/pets/animal-cow.glb',
  petChick:'../assets/game/characters/pets/animal-chick.glb',
  petBeaver:'../assets/game/characters/pets/animal-beaver.glb',
  petFish:'../assets/game/characters/pets/animal-fish.glb'
};
const CUBE_PETS={
  dog:{name:'강아지',model:ASSET.petDog,perk:'이동 속도 +8%',region:'첫 친구',req:{}},
  cat:{name:'고양이',model:ASSET.petCat,perk:'밤 야외 피로 감소',region:'연못 근처',req:{fish:1}},
  bunny:{name:'토끼',model:ASSET.petBunny,perk:'작물 수확량 +1',region:'농장',req:{carrot:2}},
  pig:{name:'돼지',model:ASSET.petPig,perk:'음식 포만감 +15%',region:'농장',req:{potato:2}},
  cow:{name:'소',model:ASSET.petCow,perk:'허기가 조금 천천히 감소',region:'농장',req:{carrot:2,tomato:1}},
  chick:{name:'병아리',model:ASSET.petChick,perk:'수확할 때 씨앗을 하나 더 발견',region:'농장',req:{tomato:1}},
  fox:{name:'여우',model:ASSET.petFox,perk:'버섯 채집량 +1',region:'깊은 숲',req:{fish:1,mushroom:1}},
  deer:{name:'사슴',model:ASSET.petDeer,perk:'허기 감소 속도 -7%',region:'깊은 숲',req:{carrot:2,tomato:1}},
  parrot:{name:'앵무새',model:ASSET.petParrot,perk:'낚시 추가 획득 확률',region:'깊은 숲',req:{tomato:2}},
  beaver:{name:'비버',model:ASSET.petBeaver,perk:'벌목 목재 +1',region:'북쪽 강가',req:{wood:2,carrot:1}}
};
function companionId(){return prog().cubePets?.companion||'';}
function townPerks(){return prog().town?.perks||{};}

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
const gltfCache=new Map();
function loadGLTF(url){
  if(gltfCache.has(url))return gltfCache.get(url);
  const p=new Promise((resolve,reject)=>loader.load(url,resolve,undefined,reject));
  gltfCache.set(url,p);return p;
}
function loadGLB(url){return loadGLTF(url).then(g=>g.scene)}
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
function collider(mode,x,z,w,d){const c={x,z,w,d,enabled:true};colliders[mode].push(c);return c;}
function interact(mode,x,z,r,label,action){const q={x,z,r,label,action,enabled:true};interactables[mode].push(q);return q;}

let save=Storage?.load?.()||{player:{},inventory:{},progression:{energy:100,maxEnergy:100,tools:{},seeds:{potato:2,carrot:2,tomato:2},crops:{},food:{},fishDex:{}}};
function persist(){Storage?.save?.(save)}
function toast(text){
  toastEl.textContent=text;toastEl.classList.add('show');clearTimeout(toastEl.__t);
  toastEl.__t=setTimeout(()=>toastEl.classList.remove('show'),1600);
}
function openPanel(html){resetInput(true);panelBody.innerHTML=html;panel.classList.add('open')}
function closePanel(){resetInput(true);panel.classList.remove('open');canvas.focus()}
document.getElementById('panelClose').onclick=closePanel;
panel.addEventListener('pointerdown',e=>{if(e.target===panel)closePanel()});

function inv(){save.inventory=save.inventory||{};return save.inventory}
function prog(){
  save.progression=save.progression||{};
  const p=save.progression;
  p.energy=Number(p.energy??100);
  p.maxEnergy=Number(p.maxEnergy??100);
  p.tools=p.tools||{};
  p.seeds={potato:2,carrot:2,tomato:2,strawberry:1,corn:1,pumpkin:1,...(p.seeds||{})};
  p.crops=p.crops||{};
  p.food=p.food||{};
  p.fishDex=p.fishDex||{};
  const old=p.survival&&typeof p.survival==='object'?p.survival:{};
  p.survival={
    hunger:Number.isFinite(Number(old.hunger))?Math.max(0,Math.min(100,Number(old.hunger))):100,
    maxHunger:100,
    time:Number.isFinite(Number(old.time))?((Number(old.time)%1440)+1440)%1440:480,
    day:Math.max(1,Math.floor(Number(old.day)||1)),
    lastTick:Number(old.lastTick)||Date.now()
  };
  const rawPets=p.cubePets&&typeof p.cubePets==='object'?p.cubePets:{};
  const legacyCompanion={rabbit:'bunny',miniPig:'pig'}[old.companion]||old.companion||'';
  p.cubePets={
    version:1,
    owned:Array.isArray(rawPets.owned)?rawPets.owned.filter(id=>CUBE_PETS[id]):[],
    met:Array.isArray(rawPets.met)?rawPets.met.filter(id=>CUBE_PETS[id]):[],
    companion:CUBE_PETS[rawPets.companion]?rawPets.companion:(CUBE_PETS[legacyCompanion]?legacyCompanion:''),
    migratedLegacy:!!rawPets.migratedLegacy,
    products:rawPets.products&&typeof rawPets.products==='object'?rawPets.products:{}
  };
  p.starterKitClaimed=!!p.starterKitClaimed;
  p.starterHintSeen=!!p.starterHintSeen;
  p.groundPickups=p.groundPickups&&typeof p.groundPickups==='object'?p.groundPickups:{};
  const rawHousing=p.housing&&typeof p.housing==='object'?p.housing:{};
  p.housing={
    version:3,
    owned:rawHousing.owned&&typeof rawHousing.owned==='object'?rawHousing.owned:{},
    placed:Array.isArray(rawHousing.placed)?rawHousing.placed:[],
    starterGiftClaimed:!!rawHousing.starterGiftClaimed,
    defaultLayoutMigrated:!!rawHousing.defaultLayoutMigrated,
    functionalLayoutMigrated:!!rawHousing.functionalLayoutMigrated,
    nextId:Math.max(1,Math.floor(Number(rawHousing.nextId)||1))
  };
  return p;
}
const itemName=k=>({
  wood:'목재',stone:'돌',iron:'철광석',potato:'감자',carrot:'당근',tomato:'토마토',
  strawberry:'딸기',corn:'옥수수',pumpkin:'호박',milk:'우유',egg:'달걀',truffle:'트러플',
  fish:'물고기',bug:'곤충',mushroom:'버섯'
})[k]||k;

const FOOD_DEF={
  grilledFish:{name:'구운 생선',hunger:34,energy:10},
  bakedPotato:{name:'구운 감자',hunger:25,energy:6},
  veggieSoup:{name:'채소 수프',hunger:42,energy:12},
  mushroomSoup:{name:'버섯 수프',hunger:38,energy:10},
  cityLunch:{name:'도시락',hunger:46,energy:14},
  cafeToast:{name:'카페 토스트',hunger:28,energy:9}
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
  const p=prog(),i=inv();
  const tool=(key,name,req,owned)=>{const have=Object.entries(req).every(([k,v])=>(i[k]||0)>=v);return `<div class="item"><b>${name}</b><div>${Object.entries(req).map(([k,v])=>itemName(k)+' '+v).join(' · ')}</div><button data-craft="${key}" ${have?'':'disabled'}>${owned?'재제작':'제작'}</button></div>`;};
  const axeTier=p.tools.axe?.tier||'',pickTier=p.tools.pick?.tier||'';
  openPanel(`<h2>3D 제작대</h2>
    <p><b>현재 재료</b> · 목재 ${i.wood||0} · 돌 ${i.stone||0} · 철광석 ${i.iron||0}</p>
    <div class="grid">
      ${tool('axe','돌도끼',{wood:3,stone:2},axeTier==='stone')}
      ${tool('pick','돌곡괭이',{wood:2,stone:3},pickTier==='stone')}
      ${tool('axeIron','철도끼',{wood:2,iron:3},axeTier==='iron')}
      ${tool('pickIron','철곡괭이',{wood:2,iron:3},pickTier==='iron')}
    </div>
    <p style="font-size:12px">돌도끼+돌곡괭이를 둘 다 처음 만들려면 총 목재 5 · 돌 5가 필요해요. 집 주변의 떨어진 나뭇가지와 작은 돌은 도구 없이 주울 수 있고, 초보자 보급상자는 한 번만 사용할 수 있어요.</p>`);
}
function cookingPanel(kind='stove'){
  panel.dataset.cookKind=kind;
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
  p.food[key]=(p.food[key]||0)+1;persist();setAvatarAction('smile',750);worldAudio.sfx('success',.09);toast(r.name+' 완성!');updateStatus();
}
function eatFood(key){
  const p=prog(),f=FOOD_DEF[key];if(!f||(p.food[key]||0)<=0)return;
  p.food[key]--;const foodMul=companionId()==='pig'?1.15:1;
  p.survival.hunger=Math.min(p.survival.maxHunger,p.survival.hunger+f.hunger*foodMul);
  p.energy=Math.min(p.maxEnergy,p.energy+f.energy);persist();setAvatarAction('smile',700);toast(f.name+'을(를) 먹었어요.');updateStatus();inventoryPanel();
}

panel.addEventListener('click',e=>{
  const craft=e.target.closest('[data-craft]');
  if(craft){
    const key=craft.dataset.craft,p=prog(),i=inv();
    const defs={
      axe:{slot:'axe',name:'돌도끼',req:{wood:3,stone:2},max:18,tier:'stone'},
      pick:{slot:'pick',name:'돌곡괭이',req:{wood:2,stone:3},max:18,tier:'stone'},
      axeIron:{slot:'axe',name:'철도끼',req:{wood:2,iron:3},max:38,tier:'iron'},
      pickIron:{slot:'pick',name:'철곡괭이',req:{wood:2,iron:3},max:38,tier:'iron'}
    };
    const def=defs[key];if(!def)return;
    if(!Object.entries(def.req).every(([k,v])=>(i[k]||0)>=v)){toast('재료가 부족해요.');return;}
    Object.entries(def.req).forEach(([k,v])=>i[k]=Math.max(0,(i[k]||0)-v));
    p.tools[def.slot]={dur:def.max,max:def.max,tier:def.tier,craftedAt:Date.now()};persist();setAvatarAction('smile',750);worldAudio.sfx('success',.10);toast(def.name+' 완성!');workbenchPanel();updateStatus();return;
  }
  const cook=e.target.closest('[data-cook]');if(cook){cookFood(cook.dataset.cook);cookingPanel(panel.dataset.cookKind||'stove');return;}
  const eat=e.target.closest('[data-eat]');if(eat){eatFood(eat.dataset.eat);return;}
  const pet=e.target.closest('[data-pet]');if(pet&&CUBE_PETS[pet.dataset.pet]){prog().cubePets.companion=pet.dataset.pet;persist();toast(CUBE_PETS[pet.dataset.pet].name+'와 함께 다녀요!');petPanel();updateStatus();return;}
  const plant=e.target.closest('[data-plant]');if(plant){const [id,type]=plant.dataset.plant.split(':');plantCrop(id,type);return;}
  if(e.target.closest('[data-ranch-collect]')){collectRanchProducts();return;}
  if(furnishingSystem?.handlePanelClick?.(e))return;
  if(townEconomy?.handlePanelClick?.(e))return;
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
const MOVE_KEYS=new Set(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d']);
let inputNeedsRelease=false;
function resetInput(requireRelease=false){
  keys.clear();
  if(requireRelease)inputNeedsRelease=true;
}
const lastMove={x:0,z:1};
addEventListener('keydown',e=>{
  const key=e.key.toLowerCase();
  if(MOVE_KEYS.has(key)){
    e.preventDefault();
    if(inputNeedsRelease)return;
    keys.add(key);
  }
  if((e.key==='r'||e.key==='R')&&furnishingSystem?.isPlacing?.()){e.preventDefault();furnishingSystem.rotate();return;}
  if((e.key==='e'||e.key==='E'||e.key===' ')&&!panel.classList.contains('open')){e.preventDefault();doInteract()}
  if(e.key==='Escape'){
    if(furnishingSystem?.isPlacing?.()){e.preventDefault();furnishingSystem.cancel();}
    else if(panel.classList.contains('open'))closePanel();
    else window.parent?.postMessage({type:'kidscade-life-world-close'},location.origin);
  }
});
addEventListener('keyup',e=>{
  const key=e.key.toLowerCase();keys.delete(key);
  if(MOVE_KEYS.has(key))inputNeedsRelease=false;
});
addEventListener('blur',()=>resetInput(true));
addEventListener('pagehide',()=>resetInput(true));
document.addEventListener('visibilitychange',()=>{if(document.hidden)resetInput(true);});
addEventListener('pointerup',()=>{if(inputNeedsRelease)inputNeedsRelease=false;});
addEventListener('pointercancel',()=>resetInput(true));
document.querySelectorAll('.mobile [data-key]').forEach(b=>{
  const k=b.dataset.key.toLowerCase();
  const down=e=>{e.preventDefault();if(inputNeedsRelease)return;keys.add(k)};
  const up=e=>{e.preventDefault();keys.delete(k);inputNeedsRelease=false};
  b.addEventListener('pointerdown',down);b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('pointerleave',up);
});
document.getElementById('mobileInteract').onclick=doInteract;
document.getElementById('close').onclick=()=>window.parent?.postMessage({type:'kidscade-life-world-close'},location.origin);

const LAYOUT_VERSION=4;
let mode='outdoor';
const savedLayout=Number(save.player?.v3Layout||0);
const player={
  x:savedLayout===LAYOUT_VERSION&&Number.isFinite(Number(save.player?.v3x))?Number(save.player.v3x):-8.4,
  z:savedLayout===LAYOUT_VERSION&&Number.isFinite(Number(save.player?.v3z))?Number(save.player.v3z):1.7,
  speed:5.1
};
const TRAVEL_POINTS={
  home:{x:-8.8,z:-1.55,name:'집 앞'},
  forest:{x:-19.0,z:.7,name:'깊은 숲 입구'},
  quarry:{x:18.5,z:.7,name:'돌산 입구'},
  camp:{x:-1.6,z:15.2,name:'남쪽 야영지'},
  city:{x:0,z:23.6,name:'씨앗마을 중심가'},
  river:{x:0,z:-15.0,name:'북쪽 강가'}
};
function travelTo(id){
  const d=TRAVEL_POINTS[id];if(!d)return;
  if(mode!=='outdoor'){mode='outdoor';outdoor.visible=true;indoor.visible=false;}
  resetInput(true);player.x=d.x;player.z=d.z;near=null;panel.classList.remove('open');setAvatarAction('smile',450);
  toast('씨앗버스 도착 · '+d.name);
}
function claimStarterKit(){
  const p=prog(),i=inv();
  if(p.starterKitClaimed){toast('초보자 보급 상자는 이미 받았어요. 주변 나뭇가지와 작은 돌도 맨손으로 주울 수 있어요.');return;}
  p.starterKitClaimed=true;i.wood=(i.wood||0)+5;i.stone=(i.stone||0)+5;
  persist();setAvatarAction('smile',700);updateStatus();
  toast('초보자 보급: 목재 +5 · 돌 +5! 이제 돌도끼와 돌곡괭이를 만들 수 있어요.');
}
function showStarterHintOnce(){
  const p=prog(),i=inv();
  if(p.starterHintSeen)return;
  const hasAxe=(p.tools.axe?.dur||0)>0,hasPick=(p.tools.pick?.dur||0)>0;
  const enoughForBoth=(i.wood||0)>=5&&(i.stone||0)>=5;
  if(hasAxe&&hasPick||enoughForBoth){p.starterHintSeen=true;persist();return;}
  p.starterHintSeen=true;persist();
  setTimeout(()=>toast('첫 도구 만들기: 집 주변 나뭇가지·작은 돌을 맨손으로 줍거나, 집 앞 초보자 보급상자를 열어보세요.'),650);
}
function isBlocked(nx,nz){
  const bounds=mode==='outdoor'?{x1:-32,x2:32,z1:-30,z2:40}:{x1:-6.6,x2:6.6,z1:-4.7,z2:4.7};
  if(nx<bounds.x1||nx>bounds.x2||nz<bounds.z1||nz>bounds.z2)return true;
  if(mode==='outdoor'&&isProtectedRoute(nx,nz))return false;
  return colliders[mode].some(c=>c.enabled!==false&&nx>c.x-c.w/2-.32&&nx<c.x+c.w/2+.32&&nz>c.z-c.d/2-.24&&nz<c.z+c.d/2+.24);
}
let near=null;
function nearestInteraction(){
  const list=interactables[mode];let best=null,bestD=999;
  for(const q of list){if(q.enabled===false)continue;const d=Math.hypot(player.x-q.x,player.z-q.z);if(d<q.r&&d<bestD){best=q;bestD=d}}
  near=best;
  promptEl.textContent=best?((matchMedia('(max-width:760px)').matches?'행동':'E / Space')+' · '+best.label):'';
  promptEl.classList.toggle('show',!!best);
}
function doInteract(){if(furnishingSystem?.isPlacing?.()){furnishingSystem.confirm();return;}if(near)near.action()}
function updateZone(){
  if(mode==='indoor'){zoneEl.textContent='우리 집 · 안전 지역';return;}
  const x=player.x,z=player.z;
  if(z>20)zoneEl.textContent='씨앗마을 중심가 · 장보기·일·놀이';
  else if(x<-18)zoneEl.textContent='깊은 숲 · 목재·버섯';
  else if(x>18)zoneEl.textContent='돌산 · 돌·철광석';
  else if(z<-12)zoneEl.textContent='북쪽 강가 · 다리';
  else if(z>12)zoneEl.textContent='남쪽 야영지 · 모닥불';
  else if(x<-8.5&&z>3.0)zoneEl.textContent='연못 · 낚시터';
  else if(x>12.2&&z>5.2)zoneEl.textContent='작업장 · 제작 구역';
  else if(x>3.0&&x<12.2&&z>2.7&&z<8.6)zoneEl.textContent='농장 · 자유 재배 구역';
  else if(x<-5.5&&z<-.8)zoneEl.textContent='집 앞 · 마당';
  else zoneEl.textContent='마을길 · 안전 지역';
}
function setMode(next){
  resetInput(true);mode=next;outdoor.visible=next==='outdoor';indoor.visible=next==='indoor';
  if(next==='indoor'){player.x=0;player.z=3.55;zoneEl.textContent='우리 집 · 3D 실내';toast('집 안으로 들어왔어요.')}
  else{player.x=-8.8;player.z=-1.55;zoneEl.textContent='집 앞 · 3D 마을';toast('집 밖으로 나왔어요.')}
  setAvatarAction('smile',520);near=null;
}
function spendTool(kind,item){
  const p=prog(),t=p.tools[item];
  if(!t||t.dur<=0){toast((item==='axe'?'도끼':'곡괭이')+'가 필요해요. 제작대에서 만들어 보세요.');return false}
  if(p.energy<=4){toast('체력이 부족해요. 집 침대에서 쉬어 보세요.');return false}
  const iron=t.tier==='iron',petBonus=kind==='wood'&&companionId()==='beaver'?1:0,gain=(iron?2:1)+petBonus,cost=kind==='wood'?(iron?2.6:4):(iron?3.2:5);
  t.dur--;p.energy=Math.max(0,p.energy-cost);const i=inv();i[kind]=(i[kind]||0)+gain;persist();updateStatus();worldAudio.sfx('impact',.12);
  toast((kind==='wood'?'목재':'돌')+' +'+gain);return true;
}
function canPlaceFurniture(x,z,w,d,ignore=null){
  if(w<=0||d<=0)return x>-6.55&&x<6.55&&z>-4.75&&z<4.15;
  if(x-w/2<-6.55||x+w/2>6.55||z-d/2<-4.75||z+d/2>4.15)return false;
  if(z+d/2>3.05&&Math.abs(x)<1.45)return false;
  return !colliders.indoor.some(c=>c!==ignore&&c.enabled!==false&&Math.abs(x-c.x)<(w+c.w)/2+.12&&Math.abs(z-c.z)<(d+c.d)/2+.12);
}
function sleep(){
  const p=prog(),s=p.survival;
  p.energy=p.maxEnergy||100;
  s.hunger=Math.max(0,s.hunger-10);
  s.day+=1;s.time=420;
  persist();updateStatus();toast('아침까지 푹 쉬었어요. 체력이 회복됐어요.');
}
function fish(){
  const p=prog();if(p.energy<3){toast('체력이 부족해요.');return}
  p.energy=Math.max(0,p.energy-3);toast('낚시 중…');
  setTimeout(()=>{const i=inv(),bonus=companionId()==='parrot'&&Math.random()<.32?1:0,gain=1+bonus;i.fish=(i.fish||0)+gain;p.fishDex=p.fishDex||{};p.fishDex['3D 연못 물고기']=(p.fishDex['3D 연못 물고기']||0)+gain;persist();setAvatarAction('smile',900);updateStatus();worldAudio.sfx('pickup',.18);toast('물고기를 잡았어요! +'+gain);},850);
}
function mineIron(){
  const p=prog(),t=p.tools.pick;
  if(!t||t.dur<=0){toast('곡괭이가 필요해요.');return false;}
  if(p.energy<=6){toast('체력이 부족해요.');return false;}
  const gain=t.tier==='iron'?2:1,cost=t.tier==='iron'?4:6;
  t.dur--;p.energy=Math.max(0,p.energy-cost);const i=inv();i.iron=(i.iron||0)+gain;
  persist();setAvatarAction('smile',480);updateStatus();worldAudio.sfx('impact',.14);toast('철광석 +'+gain);return true;
}
const CROP_DEF={
  potato:{name:'감자',color:0xc69b5b,growMs:35000},
  carrot:{name:'당근',color:0xe67e3a,growMs:33000},
  tomato:{name:'토마토',color:0xc95142,growMs:38000},
  strawberry:{name:'딸기',color:0xe64949,growMs:36000},
  corn:{name:'옥수수',color:0xf0cb55,growMs:42000},
  pumpkin:{name:'호박',color:0xe98932,growMs:47000}
};
function cropState(id){
  const p=prog();let state=p.crops[id];
  if(!state||typeof state!=='object')state=p.crops[id]={type:'',phase:'empty',plantedAt:0,readyAt:0};
  if(state.phase==='growing'&&Date.now()>=state.readyAt)state.phase='ripe';
  if(!CROP_DEF[state.type]&&state.phase!=='empty'){state.type='';state.phase='empty';state.readyAt=0;}
  return state;
}
function cropChoicePanel(id){
  const p=prog();
  const cards=Object.entries(CROP_DEF).map(([type,d])=>'<div class="item"><b>'+d.name+'</b><div>씨앗 '+(p.seeds[type]||0)+'개</div><button data-plant="'+id+':'+type+'" '+((p.seeds[type]||0)>0?'':'disabled')+'>심기</button></div>').join('');
  openPanel('<h2>무엇을 심을까요?</h2><div class="grid">'+cards+'</div><p style="font-size:12px">빈 밭은 작물을 자유롭게 바꿔 심을 수 있어요.</p>');
}
function plantCrop(id,type){
  const def=CROP_DEF[type],p=prog(),state=cropState(id);if(!def||state.phase!=='empty')return;
  if((p.seeds[type]||0)<=0){toast(def.name+' 씨앗이 없어요.');return;}
  p.seeds[type]--;state.type=type;state.phase='planted';state.plantedAt=Date.now();state.readyAt=0;
  persist();closePanel();worldAudio.sfx('pickup',.11);toast(def.name+' 씨앗을 심었어요. 이제 물을 주세요.');updateCropVisuals();
}
function cropAction(id){
  const p=prog(),state=cropState(id),i=inv();
  if(state.phase==='empty'){cropChoicePanel(id);return;}
  const def=CROP_DEF[state.type];
  if(state.phase==='planted'){
    state.phase='growing';state.readyAt=Date.now()+def.growMs;persist();worldAudio.sfx('pickup',.09);toast(def.name+'에 물을 줬어요.');
  }else if(state.phase==='growing'){
    const sec=Math.max(1,Math.ceil((state.readyAt-Date.now())/1000));toast(def.name+' 성장 중 · '+sec+'초');
  }else{
    const gain=(companionId()==='bunny'?3:2)+(Number(townPerks().harvestBonus)||0),seedGain=companionId()==='chick'?2:1;
    i[state.type]=(i[state.type]||0)+gain;p.seeds[state.type]=(p.seeds[state.type]||0)+seedGain;
    state.type='';state.phase='empty';state.readyAt=0;state.plantedAt=0;persist();worldAudio.sfx('pickup',.20);toast(def.name+' 수확 +'+gain);updateStatus();
  }
  updateCropVisuals();
}
const cropVisual=[];
function makePlant(){
  const g=new THREE.Group();
  const stem=new THREE.Mesh(new THREE.CylinderGeometry(.045,.055,.65,8),new THREE.MeshStandardMaterial({color:0x5d9b4e}));
  stem.position.y=.33;g.add(stem);
  for(const sx of [-.18,.18]){const leaf=new THREE.Mesh(new THREE.SphereGeometry(.16,10,8),new THREE.MeshStandardMaterial({color:0x70ac55}));leaf.scale.set(1.3,.45,.7);leaf.position.set(sx,.48,0);g.add(leaf)}
  const material=new THREE.MeshStandardMaterial({color:0xffffff});
  const fruit=new THREE.Mesh(new THREE.SphereGeometry(.16,12,10),material);fruit.position.y=.70;g.add(fruit);g.userData.fruitMaterial=material;
  return g;
}
function updateCropVisuals(){
  cropVisual.forEach(v=>{
    const state=cropState(v.id),def=CROP_DEF[state.type];
    const scale=state.phase==='empty'?0:state.phase==='planted'?.3:state.phase==='growing'?.58:1;
    if(def)v.object.userData.fruitMaterial?.color.setHex(def.color);
    v.object.scale.setScalar(scale);
  });
}

function addColliderFor(modeName,x,z,w,d){collider(modeName,x,z,w,d)}
function isProtectedRoute(x,z){
  return x>-1.85&&x<1.85&&z>5.6&&z<29.1;
}
function addNatureCollider(x,z,w,d){
  if(isProtectedRoute(x,z))return null;
  return addColliderFor('outdoor',x,z,w,d);
}
const groundPickups=[];
const GROUND_PICKUP_RESPAWN_MS=45000;
function scheduleGroundPickup(actor,delay){
  clearTimeout(actor.timer);
  actor.ready=false;actor.object.visible=false;
  if(actor.interaction)actor.interaction.enabled=false;
  actor.timer=setTimeout(()=>{
    actor.ready=true;actor.object.visible=true;
    if(actor.interaction)actor.interaction.enabled=true;
    prog().groundPickups[actor.id]=0;persist();
  },Math.max(0,delay));
}
async function addGroundPickup(id,kind,x,z){
  const url=kind==='wood'?ASSET.wood:P.nature+'stone-small-a.glb';
  const object=await addModel(outdoor,url,{x,z,w:kind==='wood'?.8:.65,h:kind==='wood'?.48:.45,d:kind==='wood'?.65:.65,rot:(groundPickups.length*.71)%6.2,name:id});
  if(!object)return;
  const actor={id,kind,object,ready:true,interaction:null,timer:null};groundPickups.push(actor);
  actor.interaction=interact('outdoor',x,z,1.0,kind==='wood'?'떨어진 나뭇가지 줍기':'작은 돌 줍기',()=>{
    if(!actor.ready)return;
    const nextAt=Date.now()+GROUND_PICKUP_RESPAWN_MS;
    prog().groundPickups[id]=nextAt;
    const i=inv();i[kind]=(i[kind]||0)+1;persist();setAvatarAction('smile',380);updateStatus();worldAudio.sfx('pickup',.14);
    toast((kind==='wood'?'나뭇가지':'작은 돌')+' +1 · 도구 없이 주웠어요.');
    scheduleGroundPickup(actor,GROUND_PICKUP_RESPAWN_MS);
  });
  const nextAt=Number(prog().groundPickups[id]||0);
  const remain=nextAt-Date.now();
  if(remain>0)scheduleGroundPickup(actor,remain);
  else prog().groundPickups[id]=0;
}
async function buildOutdoor(){
  // Base lawn and a clear path hierarchy: home -> village path -> farm/work zone.
  plane(outdoor,0,5,82,96,0x7caf63,0);
  box(outdoor,0,5,82,96,.22,0x6c9657,-.22);

  // Distinct connected biomes around the safe home region.
  plane(outdoor,-24,0,12,44,0x4f8050,.015);       // deep forest
  plane(outdoor,24,0,12,44,0x8e8b73,.015);        // quarry
  plane(outdoor,0,17,34,9,0x91a95d,.017);         // camp meadow
  plane(outdoor,0,-19,34,5,0x6d9c69,.017);        // north riverbank
  const river=new THREE.Mesh(new THREE.PlaneGeometry(36,5.4),new THREE.MeshStandardMaterial({color:0x579fc1,roughness:.25,metalness:.03,transparent:true,opacity:.94}));
  river.rotation.x=-Math.PI/2;river.position.set(0,.035,-15.9);river.receiveShadow=true;outdoor.add(river);

  // Main village path plus routes out to the four survival regions.
  box(outdoor,0,.7,31,2.0,.10,0xd8c79c,.03);
  box(outdoor,-8.8,-2.2,2.1,6.0,.10,0xd8c79c,.03);
  box(outdoor,10.8,-2.5,2.1,5.5,.10,0xd8c79c,.03);
  box(outdoor,-10.8,4.0,1.8,5.8,.10,0xd8c79c,.03);
  box(outdoor,14.6,7.2,4.8,3.6,.10,0xbda873,.025);
  box(outdoor,-20.6,.7,10.5,1.8,.09,0xc6b88e,.03);
  box(outdoor,20.6,.7,10.5,1.8,.09,0xc6b88e,.03);
  // One obvious continuous road from the safe area to Seed Town.
  box(outdoor,0,17.25,3.0,22.5,.10,0xd0c297,.035);
  box(outdoor,0,-10.8,1.8,8.0,.09,0xc6b88e,.03);

  // Signposts make the connected regions discoverable without a map menu.
  await Promise.all([
    addModel(outdoor,ASSET.signpost,{x:-17.0,z:.0,w:.8,h:1.8,d:.8,rot:-Math.PI/2}),
    addModel(outdoor,ASSET.signpost,{x:17.0,z:.0,w:.8,h:1.8,d:.8,rot:Math.PI/2}),
    addModel(outdoor,ASSET.signpost,{x:.0,z:-11.1,w:.8,h:1.8,d:.8,rot:Math.PI}),
    addModel(outdoor,ASSET.signpost,{x:2.15,z:11.2,w:.8,h:1.8,d:.8,rot:0})
  ]);
  interact('outdoor',-17,0,1.2,'표지판 읽기',()=>toast('← 깊은 숲 · 목재와 버섯'));
  interact('outdoor',17,0,1.2,'표지판 읽기',()=>toast('→ 돌산 · 돌과 철광석'));
  interact('outdoor',0,-11.1,1.2,'표지판 읽기',()=>toast('↑ 북쪽 강가 · 나무다리'));
  interact('outdoor',2.15,11.2,1.2,'표지판 읽기',()=>toast('↓ 남쪽 야영지 · 씨앗마을'));

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

  // River is blocked except at the wooden bridge.
  collider('outdoor',-10,-15.9,16,5.0);
  collider('outdoor',10,-15.9,16,5.0);
  await addModel(outdoor,ASSET.bridge,{x:0,z:-15.9,w:4.2,h:.9,d:5.4,rot:Math.PI/2,name:'northBridge'});

  // Home lot, farm house/barn, workshop.
  await Promise.all([
    addModel(outdoor,ASSET.house,{x:-8.8,z:-5.6,w:6.7,h:6.2,d:5.4,rot:Math.PI,name:'home3d'}),
    addModel(outdoor,ASSET.farmHouse,{x:10.8,z:-6.0,w:4.8,h:4.5,d:4.2,rot:Math.PI,name:'farmhouse3d'}),
    addModel(outdoor,ASSET.workbench,{x:15.2,z:7.35,w:2.0,h:1.5,d:1.3,rot:-.2,name:'workbench3d'}),
    addModel(outdoor,ASSET.chest,{x:13.55,z:7.55,w:1.3,h:1.0,d:1.0,rot:.15,name:'chest3d'}),
    addModel(outdoor,ASSET.chest,{x:-4.3,z:-1.4,w:1.15,h:.9,d:.95,rot:-.15,name:'starter-crate'})
  ]);
  addColliderFor('outdoor',-8.8,-5.6,5.8,4.4);
  addColliderFor('outdoor',10.8,-6.0,4.0,3.3);
  addColliderFor('outdoor',15.2,7.35,1.6,1.0);
  addColliderFor('outdoor',13.55,7.55,1.0,.8);
  interact('outdoor',-8.8,-2.45,1.8,'집에 들어가기',()=>setMode('indoor'));
  interact('outdoor',15.2,6.45,1.45,'제작대 사용하기',workbenchPanel);
  interact('outdoor',13.55,6.75,1.35,'보관 상자 보기',inventoryPanel);
  interact('outdoor',-4.3,-1.4,1.3,'초보자 보급 상자 열기',claimStarterKit);
  await addModel(outdoor,ASSET.signpost,{x:-2.5,z:1.1,w:.72,h:1.55,d:.72,rot:.15,name:'starter-guide-sign'});
  interact('outdoor',-2.5,1.1,1.15,'초보자 안내 읽기',()=>{
    openPanel('<h2>처음 살아남기</h2><div class="grid"><div class="item"><b>1. 맨손 채집</b><div>집 주변의 나뭇가지와 작은 돌을 주워요.</div></div><div class="item"><b>2. 제작</b><div>목재 5 · 돌 5를 모으면 돌도끼와 돌곡괭이를 둘 다 만들 수 있어요.</div></div><div class="item"><b>3. 본격 채집</b><div>도끼로 나무를 베고 곡괭이로 바위를 캐요.</div></div></div><p style="font-size:12px">자원이 모자라면 집 앞 보급상자를 한 번 사용할 수 있어요.</p>');
  });
  interact('outdoor',-10.8,6.1,2.0,'연못에서 낚시하기',()=>{setAvatarAction('smile',850);fish();});

  // Starter loop: hand-pickable branches and pebbles prevent tool/resource deadlocks.
  await Promise.all([
    addGroundPickup('starter-wood-1','wood',-5.8,2.8),
    addGroundPickup('starter-wood-2','wood',-3.6,5.0),
    addGroundPickup('starter-wood-3','wood',1.8,3.1),
    addGroundPickup('starter-wood-4','wood',3.3,7.2),
    addGroundPickup('starter-wood-5','wood',-7.0,7.6),
    addGroundPickup('starter-wood-6','wood',9.1,8.8),
    addGroundPickup('starter-stone-1','stone',-1.2,4.7),
    addGroundPickup('starter-stone-2','stone',2.0,6.0),
    addGroundPickup('starter-stone-3','stone',5.0,8.0),
    addGroundPickup('starter-stone-4','stone',-5.1,8.4),
    addGroundPickup('starter-stone-5','stone',8.2,1.9),
    addGroundPickup('starter-stone-6','stone',-9.2,9.0)
  ]);

  // Six reusable plots: every empty plot can grow any unlocked crop.
  const plotPos=[[4.8,4.25],[7.4,4.25],[10.0,4.25],[4.8,7.0],[7.4,7.0],[10.0,7.0]];
  plotPos.forEach(([x,z],i)=>{
    box(outdoor,x,z,2.15,2.2,.18,0x8a5d3b,.02);
    for(let r=-1;r<=1;r++){const ridge=box(outdoor,x+r*.55,z,.28,1.9,.12,0x70472f,.20);ridge.castShadow=false}
    const plant=makePlant();plant.position.set(x,.24,z);outdoor.add(plant);
    const id='work-crop-'+(i+1);cropVisual.push({id,object:plant});
    interact('outdoor',x,z,1.35,'밭 살펴보기',()=>{setAvatarAction('smile',500);cropAction(id);});
  });
  updateCropVisuals();

  // Farm fence separates the six plots from the village path while leaving an entrance.
  for(const [x,z,rot] of [[4.3,2.75,0],[6.7,2.75,0],[9.1,2.75,0],[11.5,2.75,0],[3.25,4.9,Math.PI/2],[3.25,7.15,Math.PI/2],[11.55,4.9,Math.PI/2],[11.55,7.15,Math.PI/2]]){
    await addModel(outdoor,ASSET.fence,{x,z,w:2.2,h:.95,d:.33,rot});
  }

  // Trees form a readable perimeter/woodland rather than random clutter.
  const treePos=[
    [-17,-9],[-14,-9],[-4,-9],[1,-9],[5,-9],[16,-9],
    [-18,-4],[-18,1],[-18,8],[-7,10],[17,3],[17,-3],
    [-14,1.5],[-4,6.8]
  ];
  const treeAssets=[ASSET.tree,ASSET.oak,ASSET.pine];
  for(let i=0;i<treePos.length;i++){
    const [x,z]=treePos[i];await addModel(outdoor,treeAssets[i%3],{x,z,w:2.4,h:3.8+(i%2)*.5,d:2.4,rot:(i%5)*.42});
    addNatureCollider(x,z,.7,.7);
    interact('outdoor',x,z,1.3,'나무 베기',()=>{if(spendTool('wood','axe'))setAvatarAction('smile',450);});
  }

  // Rocks are grouped as a small quarry near the eastern edge.
  const rocks=[[15.1,1.8],[16.0,4.1],[14.7,7.2],[-15.8,7.7]];
  const rockAssets=[ASSET.rockA,ASSET.rockB,ASSET.rockC];
  for(let i=0;i<rocks.length;i++){
    const [x,z]=rocks[i];await addModel(outdoor,rockAssets[i%3],{x,z,w:1.45,h:1.1,d:1.4,rot:i*.65});
    addNatureCollider(x,z,.82,.68);
    interact('outdoor',x,z,1.2,'바위 캐기',()=>{if(spendTool('stone','pick'))setAvatarAction('smile',450);});
  }

  // Deep forest: denser timber, fallen logs and edible mushrooms.
  const forestTrees=[[-27,-10],[-24,-8],[-21,-11],[-28,-4],[-24,-2],[-21,2],[-28,6],[-24,9],[-21,12],[-27,16],[-22,18]];
  for(let i=0;i<forestTrees.length;i++){
    const [x,z]=forestTrees[i];await addModel(outdoor,treeAssets[(i+1)%3],{x,z,w:2.5,h:4.2+(i%3)*.25,d:2.5,rot:i*.37});
    addNatureCollider(x,z,.72,.72);interact('outdoor',x,z,1.3,'깊은 숲 나무 베기',()=>{if(spendTool('wood','axe'))setAvatarAction('smile',450);});
  }
  for(const [x,z] of [[-25,4],[-22,6.5],[-27,12],[-23,-5]]){
    await addModel(outdoor,ASSET.mushroom,{x,z,w:.75,h:.55,d:.7,rot:0});
    interact('outdoor',x,z,1.05,'버섯 채집하기',()=>{const i=inv(),gain=(companionId()==='fox'?2:1)+(Number(townPerks().mushroomBonus)||0);i.mushroom=(i.mushroom||0)+gain;prog().energy=Math.max(0,prog().energy-1);persist();toast('버섯 +'+gain);updateStatus();});
  }
  await addModel(outdoor,ASSET.logStack,{x:-24,z:14.8,w:2.4,h:1.1,d:1.2,rot:.2});

  // Quarry: concentrated stone and rarer iron ore.
  const quarryRocks=[[21,-8],[25,-10],[28,-6],[22,-2],[26,1],[28,5],[22,9],[26,12],[28,16]];
  for(let i=0;i<quarryRocks.length;i++){
    const [x,z]=quarryRocks[i];await addModel(outdoor,rockAssets[i%3],{x,z,w:1.7,h:1.25,d:1.6,rot:i*.51});
    addNatureCollider(x,z,.9,.75);
    if(i%3===1)interact('outdoor',x,z,1.25,'철광석 캐기',()=>mineIron());
    else interact('outdoor',x,z,1.25,'돌산 바위 캐기',()=>{if(spendTool('stone','pick'))setAvatarAction('smile',450);});
  }

  // Southern camp: a safe outdoor cooking/rest point for long trips.
  await addModel(outdoor,ASSET.campfire,{x:-3.2,z:16.7,w:1.7,h:.8,d:1.7,rot:0,name:'campfire'});
  const fireLight=new THREE.PointLight(0xff9b45,0,9,2);fireLight.position.set(-3.2,1.4,16.7);fireLight.userData.campfire=true;outdoor.add(fireLight);
  interact('outdoor',-3.2,16.7,1.55,'모닥불 사용하기',()=>cookingPanel('campfire'));
  interact('outdoor',-1.4,16.7,1.5,'야영지에서 쉬기',()=>{const p=prog();p.energy=Math.min(p.maxEnergy,p.energy+18);p.survival.hunger=Math.max(0,p.survival.hunger-4);persist();setAvatarAction('smile',750);toast('모닥불 곁에서 잠깐 쉬었어요.');updateStatus();});

  // Home flower bed and pond-side flowers.
  for(const [x,z] of [[-5.2,-5.2],[-4.5,-4.7],[-5.4,-4.1],[-9.8,4.2],[-14.8,4.8],[-9.2,7.6]]){
    await addModel(outdoor,ASSET.flower,{x,z,w:.55,h:.5,d:.55,rot:0});
  }

  await addModel(outdoor,ASSET.signpost,{x:2.25,z:20.65,w:.8,h:1.8,d:.8,rot:.15,name:'city-sign'});
  interact('outdoor',2.25,20.65,1.2,'도시 안내판 읽기',()=>toast('↓ 씨앗마을 · 상업가 · 광장 · 공공시설 · 버스정류장'));

  cityRuntime=await buildKidscadeCity({
    parent:outdoor,
    addModel,
    box,
    plane,
    interact,
    collider,
    loadGLB,
    loadGLTF,
    prepModel,
    actions:{
      resident:id=>townEconomy?.resident(id),
      shop:(kind,name)=>townEconomy?.shop(kind,name),
      jobs:()=>townEconomy?.jobs(),
      delivery:()=>townEconomy?.delivery(),
      talk:(id,name)=>townEconomy?.talk(id,name),
      arcade:()=>townEconomy?.arcade(),
      library:()=>townEconomy?.library(),
      clinic:()=>townEconomy?.clinic(),
      transport:()=>townEconomy?.transport(),
      bench:()=>townEconomy?.bench()
    },
    getGameTime:()=>prog().survival.time,
    getPlayerPosition:()=>({x:player.x,z:player.z})
  });
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
    // All home furniture, including bed and kitchen appliances, is restored by the furnishing system.
    addModel(indoor,ASSET.chest,{x:5.35,z:2.65,w:1.45,h:1.0,d:1.0,rot:Math.PI/2,name:'furniture-storage'})
  ]);

  // Collisions leave a wide central route from door to every zone.
  addColliderFor('indoor',5.35,2.65,1.05,.75);

  interact('indoor',0,4.35,1.45,'밖으로 나가기',()=>setMode('outdoor'));
  interact('indoor',5.35,2.65,1.35,'가구 창고 · 집 꾸미기',()=>furnishingSystem?.openCatalog?.());
}

function clockText(minutes){
  const m=Math.floor(((minutes%1440)+1440)%1440),h=Math.floor(m/60),mm=String(m%60).padStart(2,'0');
  return String(h).padStart(2,'0')+':'+mm;
}
function isNightTime(minutes){const h=((minutes%1440)+1440)%1440/60;return h<6||h>=20;}
const petActors=[];
const wildPetActors=[];
const PET_SLOTS=[[-15.1,-6.2],[-13.6,-6.25],[-12.1,-6.1],[-15.0,-5.15],[-13.5,-5.15],[-12.0,-5.05],[-14.7,-4.25],[-13.25,-4.25],[-11.8,-4.2],[-15.8,-5.7]];
const RANCH_SLOTS={bunny:[4.5,-6.9],pig:[6.25,-6.9],cow:[6.7,-5.15],chick:[4.55,-5.1]};
const RANCH_PRODUCTS={cow:{key:'milk',name:'우유',qty:1,cooldown:1},chick:{key:'egg',name:'달걀',qty:2,cooldown:1},pig:{key:'truffle',name:'트러플',qty:1,cooldown:2}};
const PET_SCALE={dog:.82,cat:.78,bunny:.72,pig:.88,cow:1.0,chick:.56,fox:.78,deer:.92,parrot:.64,beaver:.76};
const CITY_LIMITS={x1:-26,x2:26,z1:20,z2:40};
function isCityArea(x,z){return x>=CITY_LIMITS.x1&&x<=CITY_LIMITS.x2&&z>=CITY_LIMITS.z1&&z<=CITY_LIMITS.z2;}
const WILD_PETS={
  cat:{habitat:'pond',x:-8.65,z:6.45,roamX:.34,roamZ:.42},
  bunny:{habitat:'farm-pasture',x:4.55,z:-6.75,roamX:.28,roamZ:.24},
  pig:{habitat:'farm-pasture',x:6.15,z:-6.85,roamX:.26,roamZ:.22},
  cow:{habitat:'farm-pasture',x:6.65,z:-5.25,roamX:.22,roamZ:.20},
  chick:{habitat:'farm-pasture',x:4.55,z:-5.15,roamX:.30,roamZ:.26},
  fox:{habitat:'deep-forest',x:-24.5,z:3.2,roamX:.48,roamZ:.38},
  deer:{habitat:'deep-forest',x:-25.8,z:11.2,roamX:.52,roamZ:.42},
  parrot:{habitat:'deep-forest',x:-22.2,z:-4.0,roamX:.34,roamZ:.28},
  beaver:{habitat:'riverbank',x:2.5,z:-19.2,roamX:.42,roamZ:.24}
};
function petState(){return prog().cubePets}
function migrateLegacyCubePets(){
  const p=prog(),state=p.cubePets;if(state.migratedLegacy)return state;
  const mapped=new Set(state.owned||[]);
  const mapId=id=>({dog:'dog',cat:'cat',rabbit:'bunny',parrot:'parrot',miniPig:'pig'})[id]||'';
  try{
    const raw=JSON.parse(localStorage.getItem('kidscade_garden_v1')||'null');
    for(const id of Array.isArray(raw?.owned)?raw.owned:[]){const next=mapId(id);if(next)mapped.add(next)}
  }catch(_){}
  try{
    const raw=JSON.parse(localStorage.getItem('kidscade_sook_canvas_pet')||'null');
    for(const id of Array.isArray(raw?.unlockedPets)?raw.unlockedPets:[]){const next=mapId(id);if(next)mapped.add(next)}
  }catch(_){}
  mapped.add('dog');
  state.owned=[...mapped].filter(id=>CUBE_PETS[id]);
  state.met=[...new Set([...(state.met||[]),...state.owned])];
  if(!CUBE_PETS[state.companion]||!state.owned.includes(state.companion))state.companion='dog';
  state.migratedLegacy=true;
  if(p.survival&&Object.hasOwn(p.survival,'companion'))delete p.survival.companion;
  persist();return state;
}
async function makeCubePetObject(id){
  const def=CUBE_PETS[id];if(!def)return null;
  try{
    const base=await loadGLB(def.model),o=prepModel(base.clone(true));
    o.updateMatrixWorld(true);
    const box3=new THREE.Box3().setFromObject(o),size=box3.getSize(new THREE.Vector3()),max=Math.max(size.x,size.y,size.z)||1;
    o.scale.multiplyScalar((PET_SCALE[id]||.8)/max);o.updateMatrixWorld(true);
    const b=new THREE.Box3().setFromObject(o);o.position.y-=b.min.y;o.userData.groundY=o.position.y;
    return o;
  }catch(err){console.warn('[World v3] Cube Pet failed',id,err);return null}
}
function effectivePetReq(id){
  const req={...(CUBE_PETS[id]?.req||{})};
  if(Number(townPerks().petFriendBonus)>0){
    const first=Object.keys(req).find(k=>req[k]>0);
    if(first)req[first]=Math.max(0,req[first]-1);
  }
  return req;
}
function petReqText(id){
  const req=effectivePetReq(id),parts=Object.entries(req).filter(([,v])=>v>0).map(([k,v])=>itemName(k)+' '+v);
  return parts.length?parts.join(' · '):'첫 친구';
}
function canTame(id){
  const req=effectivePetReq(id),i=inv();return Object.entries(req).every(([k,v])=>(i[k]||0)>=v);
}
function payTame(id){
  const req=effectivePetReq(id),i=inv();Object.entries(req).forEach(([k,v])=>i[k]=Math.max(0,(i[k]||0)-v));
}
async function ensureOwnedPetActor(id){
  if(petActors.some(a=>a.id===id))return;
  const object=await makeCubePetObject(id);if(!object)return;
  const owned=petState().owned,slot=RANCH_SLOTS[id]||PET_SLOTS[Math.max(0,owned.indexOf(id))%PET_SLOTS.length];
  const groundY=Number(object.userData.groundY)||0;object.position.set(slot[0],groundY+.015,slot[1]);petLayer.add(object);
  petActors.push({id,object,homeX:slot[0],homeZ:slot[1],groundY,phase:petActors.length*.83,targetX:slot[0],targetZ:slot[1],nextDecision:0,moving:false,speed:.28+Math.random()*.12});
}
function ranchPanel(){
  const p=prog(),state=petState(),day=p.survival.day;
  const rows=Object.entries(RANCH_PRODUCTS).map(([id,d])=>{
    const owned=state.owned.includes(id),last=Number(state.products[id]??-999),ready=owned&&(day-last>=d.cooldown);
    return '<div class="item"><b>'+CUBE_PETS[id].name+' · '+d.name+'</b><div>'+(owned?(ready?'수확 가능':'다음 생산까지 기다리는 중'):'아직 목장에 없음')+'</div></div>';
  }).join('');
  const can=Object.entries(RANCH_PRODUCTS).some(([id,d])=>state.owned.includes(id)&&(day-Number(state.products[id]??-999)>=d.cooldown));
  openPanel('<h2>목장 생산물</h2><div class="grid">'+rows+'</div><button data-ranch-collect="1" '+(can?'':'disabled')+'>오늘 생산물 모으기</button><p style="font-size:12px">소는 우유, 병아리는 달걀, 돼지는 이틀마다 트러플을 가져다줘요.</p>');
}
function collectRanchProducts(){
  const p=prog(),state=petState(),day=p.survival.day,i=inv();const got=[];
  for(const [id,d] of Object.entries(RANCH_PRODUCTS)){
    if(!state.owned.includes(id))continue;
    const last=Number(state.products[id]??-999);if(day-last<d.cooldown)continue;
    i[d.key]=(i[d.key]||0)+d.qty;state.products[id]=day;got.push(d.name+' +'+d.qty);
  }
  if(!got.length){toast('오늘 모을 생산물이 아직 없어요.');ranchPanel();return;}
  persist();worldAudio.sfx('pickup',.20);toast(got.join(' · '));updateStatus();ranchPanel();
}
async function tamePet(id){
  const state=petState(),def=CUBE_PETS[id];if(!def)return;
  if(state.owned.includes(id)){toast(def.name+'은(는) 이미 우리 친구예요.');return;}
  if(!canTame(id)){toast(def.name+'에게 다가가려면 '+petReqText(id)+'이(가) 필요해요.');return;}
  payTame(id);state.owned.push(id);if(!state.met.includes(id))state.met.push(id);
  persist();await ensureOwnedPetActor(id);
  const wild=wildPetActors.find(a=>a.id===id);if(wild)wild.object.visible=false;
  setAvatarAction('smile',900);worldAudio.sfx('success',.13);toast(def.name+'과(와) 친구가 되었어요!');
  updateStatus();
}
function petPanel(){
  const state=petState(),selected=state.companion;
  const cards=state.owned.map(id=>{
    const def=CUBE_PETS[id];return `<div class="item"><b>${def.name}</b><div>${id===selected?'현재 동행 중':def.region+'에서 만난 친구'}</div><small>${def.perk}</small><br><button data-pet="${id}" ${id===selected?'disabled':''}>함께 다니기</button></div>`;
  }).join('');
  const undiscovered=Object.keys(CUBE_PETS).filter(id=>!state.owned.includes(id)).length;
  openPanel(`<h2>Cube Pets</h2><div class="grid">${cards}</div><p style="font-size:12px">정원은 없습니다. 월드를 탐험하다 야생 Cube Pet을 만나 필요한 먹이나 자원을 주면 친구가 됩니다. 아직 만나지 못한 친구 ${undiscovered}종.</p>`);
}
async function buildPets(){
  const state=migrateLegacyCubePets();

  // Owned Cube Pets live in a clearly marked yard beside the player home.
  for(const [x,z,rot] of [[-15.8,-7.2,0],[-13.6,-7.2,0],[-11.4,-7.2,0],[-15.9,-4.9,Math.PI/2],[-11.3,-4.9,Math.PI/2]]){
    await addModel(outdoor,ASSET.fence,{x,z,w:2.0,h:.85,d:.32,rot});
  }
  await addModel(outdoor,ASSET.signpost,{x:-16.6,z:-4.35,w:.7,h:1.45,d:.7,rot:.2,name:'pet-yard-sign'});
  interact('outdoor',-16.6,-4.35,1.35,'Cube Pets 마당 보기',petPanel);

  // The farm-side ranch is the permanent home for owned bunny/pig/cow/chick.
  for(const [x,z,rot] of [[4.25,-8.0,0],[6.55,-8.0,0],[3.15,-6.0,Math.PI/2],[8.0,-6.0,Math.PI/2],[4.15,-4.0,0],[7.15,-4.0,0]]){
    await addModel(outdoor,ASSET.fence,{x,z,w:2.15,h:.82,d:.30,rot});
  }
  await addModel(outdoor,ASSET.chest,{x:8.35,z:-3.55,w:1.1,h:.82,d:.9,rot:.1,name:'ranch-produce-crate'});
  await addModel(outdoor,ASSET.signpost,{x:6.65,z:-3.55,w:.7,h:1.45,d:.7,rot:.05,name:'ranch-sign'});
  interact('outdoor',7.15,-3.65,1.55,'목장 생산물 확인하기',ranchPanel);
  for(const id of state.owned)await ensureOwnedPetActor(id);

  for(const [id,pos] of Object.entries(WILD_PETS)){
    const object=await makeCubePetObject(id);if(!object)continue;
    const groundY=Number(object.userData.groundY)||0;object.position.set(pos.x,groundY+.015,pos.z);petLayer.add(object);
    const actor={id,object,x:pos.x,z:pos.z,groundY,habitat:pos.habitat,roamX:Math.max(.45,pos.roamX||.6),roamZ:Math.max(.4,pos.roamZ||.55),interaction:null,phase:wildPetActors.length*.91,targetX:pos.x,targetZ:pos.z,nextDecision:0,moving:false,speed:.22+Math.random()*.18};wildPetActors.push(actor);
    object.visible=!state.owned.includes(id);
    actor.interaction=interact('outdoor',pos.x,pos.z,1.25,(CUBE_PETS[id]?.name||id)+'에게 다가가기',()=>tamePet(id));
  }
}
function chooseAnimalTarget(a,now,roamX,roamZ){
  a.nextDecision=now+1200+Math.random()*2800;
  if(Math.random()<.32){a.moving=false;return;}
  a.targetX=a.x+(Math.random()*2-1)*roamX;
  a.targetZ=a.z+(Math.random()*2-1)*roamZ;
  if(isCityArea(a.targetX,a.targetZ)){a.targetX=a.x;a.targetZ=a.z;}
  a.moving=true;
}
function stepAnimal(a,now,dt,centerX,centerZ,roamX,roamZ){
  a.x=centerX;a.z=centerZ;
  if(now>=a.nextDecision)chooseAnimalTarget(a,now,roamX,roamZ);
  if(a.moving){
    const dx=a.targetX-a.object.position.x,dz=a.targetZ-a.object.position.z,d=Math.hypot(dx,dz);
    if(d<.07){a.moving=false;a.nextDecision=Math.min(a.nextDecision,now+450);}
    else{
      const step=Math.min(d,a.speed*dt);
      a.object.position.x+=dx/d*step;a.object.position.z+=dz/d*step;
      a.object.rotation.y=Math.atan2(dx,dz);
    }
  }else if(now+180>a.nextDecision){
    a.object.rotation.y+=Math.sin(now/420+a.phase)*.004;
  }
  const walkBob=a.moving?Math.abs(Math.sin(now/125+a.phase))*.018:0;
  a.object.position.y=a.groundY+.015+walkBob;
}
function updatePets(now,dt){
  const selected=companionId(),state=petState();
  for(const a of petActors){
    const companion=a.id===selected;
    a.object.visible=companion||mode==='outdoor';
    if(!a.object.visible)continue;
    if(companion){
      const side=avatarFacing<0?.75:-.75,tx=player.x+side,tz=player.z+.75;
      const dx=tx-a.object.position.x,dz=tz-a.object.position.z,d=Math.hypot(dx,dz);
      let walking=false;
      if(d>8){a.object.position.x=tx;a.object.position.z=tz;}
      else if(d>.55){const step=Math.min(d,dt*3.25);a.object.position.x+=dx/d*step;a.object.position.z+=dz/d*step;a.object.rotation.y=Math.atan2(dx,dz);walking=true;}
      a.object.position.y=a.groundY+.015+(walking?Math.abs(Math.sin(now/120+a.phase))*.024:0);
    }else{
      stepAnimal(a,now,dt,a.homeX,a.homeZ,.52,.38);
    }
  }
  for(const a of wildPetActors){
    a.object.visible=mode==='outdoor'&&!state.owned.includes(a.id);
    if(!a.object.visible)continue;
    stepAnimal(a,now,dt,a.x,a.z,a.roamX,a.roamZ);
    if(a.interaction){a.interaction.x=a.object.position.x;a.interaction.z=a.object.position.z;}
  }
}

function updateStatus(){
  const p=prog(),i=inv(),s=p.survival,t=townEconomy?.ensureState?.(p)||p.town||{coins:0,fun:0};
  const pct=Math.max(0,Math.min(100,(p.energy||0)/(p.maxEnergy||100)*100));
  const hunger=Math.max(0,Math.min(100,s.hunger||0));
  const fun=Math.max(0,Math.min(100,t.fun||0));
  const axe=p.tools.axe?.dur>0?`${p.tools.axe.tier==='iron'?'철도끼':'돌도끼'} ${p.tools.axe.dur}`:'도끼 없음';
  const pick=p.tools.pick?.dur>0?`${p.tools.pick.tier==='iron'?'철곡괭이':'돌곡괭이'} ${p.tools.pick.dur}`:'곡괭이 없음';
  const phase=isNightTime(s.time)?'밤':'낮';
  const petId=companionId(),pet=petId?(CUBE_PETS[petId]?.name||petId):'없음';
  statusEl.innerHTML=`<b>Day ${s.day} · ${clockText(s.time)} · ${phase}</b><br>
    체력 ${Math.round(p.energy||0)}/${p.maxEnergy||100}<div class="energy"><i style="width:${pct}%"></i></div>
    허기 ${Math.round(hunger)}/100<div class="energy"><i style="width:${hunger}%"></i></div>
    재미 ${Math.round(fun)}/100 · 코인 ${t.coins||0}<br>
    ${axe}<br>${pick}<br>목재 ${i.wood||0} · 돌 ${i.stone||0} · 철 ${i.iron||0}<br>
    동행 펫 ${pet}<hr style="border:0;border-top:1px solid rgba(255,255,255,.25)">씨앗 ${Bridge?.readSeeds?.()||0}`;
}

let survivalUiClock=0;
function updateSurvival(dt,moving){
  const p=prog(),s=p.survival;
  const prevTime=s.time;
  s.time+=dt*3;
  if(s.time>=1440){s.time-=1440;s.day+=1;toast('새로운 하루가 시작됐어요. Day '+s.day);}
  const night=isNightTime(s.time);
  const pet=companionId(),hungerMul=pet==='deer' ? .93 : pet==='cow' ? .96 : 1;
  s.hunger=Math.max(0,s.hunger-dt*(moving?.085:.055)*hungerMul);
  townEconomy?.tick?.(dt);
  if(s.hunger<=0)p.energy=Math.max(0,p.energy-dt*.55);
  if(night&&mode==='outdoor'){
    const nearFire=Math.hypot(player.x+3.2,player.z-16.7)<4.2;
    const nightMul=pet==='cat' ? .68 : 1;
    if(!nearFire)p.energy=Math.max(0,p.energy-dt*.04*nightMul);
  }
  const hour=s.time/60;
  const daylight=Math.max(.16,Math.min(1,Math.sin(((hour-5)/15)*Math.PI)));
  sun.intensity=.45+daylight*2.95;
  hemi.intensity=.55+daylight*1.45;
  const dayColor=new THREE.Color(0xb9d8ee),nightColor=new THREE.Color(0x17243d);
  const sky=nightColor.clone().lerp(dayColor,daylight);
  scene.background.copy(sky);scene.fog.color.copy(sky);renderer.setClearColor(sky,1);
  outdoor.traverse(o=>{if(o.isPointLight&&o.userData?.campfire)o.intensity=night?2.4:.35;});
  survivalUiClock+=dt;if(survivalUiClock>.45){survivalUiClock=0;updateStatus();}
}

function resize(){
  const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);
  const aspect=w/Math.max(1,h),v=8.6;
  camera.top=v;camera.bottom=-v;camera.left=-v*aspect;camera.right=v*aspect;camera.updateProjectionMatrix();
}
addEventListener('resize',resize);resize();

let townEconomy=null,cityRuntime=null,furnishingSystem=null;
let last=performance.now(),saveClock=0,wasInCity=false;
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
    lastMove.x=dx;lastMove.z=dz;
    const pet=companionId(),speedMul=pet==='dog'?1.08:1;
    const nx=player.x+dx*player.speed*speedMul*dt,nz=player.z+dz*player.speed*speedMul*dt;
    if(!isBlocked(nx,player.z))player.x=nx;
    if(!isBlocked(player.x,nz))player.z=nz;
    if(dx){
      const nextFacing=dx<0?-1:1;
      if(nextFacing!==avatarFacing){avatarFacing=nextFacing;if(avatarImg.complete)drawAvatarImage();}
    }
  }
  if(mode==='outdoor'){
    const nowInCity=isCityArea(player.x,player.z);
    if(nowInCity&&!wasInCity){resetInput(true);}
    wasInCity=nowInCity;
  }else wasInCity=false;
  avatar.position.x=player.x;avatar.position.z=player.z;
  shadow.position.set(player.x,.035,player.z+.08);
  updateAvatarFrame(now,moving);
  applyAvatarMotion(now,moving);
  updatePets(now,dt);
  furnishingSystem?.updatePreview?.();
  cityRuntime?.update?.(now,dt);

  const off=mode==='outdoor'?new THREE.Vector3(10.5,13.5,13.5):new THREE.Vector3(8.0,10.2,10.0);
  const target=new THREE.Vector3(player.x,0,player.z);
  camera.position.lerp(target.clone().add(off),1-Math.pow(.0015,dt));
  camera.lookAt(target.x,mode==='outdoor'?.2:.55,target.z);
  nearestInteraction();
  updateZone();
  updateSurvival(dt,moving);

  saveClock+=dt;if(saveClock>1.4){saveClock=0;save.player=save.player||{};save.player.v3x=player.x;save.player.v3z=player.z;save.player.v3scene=mode;save.player.v3Layout=LAYOUT_VERSION;persist();}
  renderer.clear(true,true,true);
  renderer.render(scene,camera);
}
async function init(){
  furnishingSystem=createFurnishingSystem({
    parent:indoor,addModel,interact,collider,prog,inv,persist,openPanel,closePanel,toast,setAvatarAction,itemName,
    getMode:()=>mode,
    getPlacementPose:()=>({x:player.x,z:player.z,dx:lastMove.x,dz:lastMove.z}),
    canPlace:canPlaceFurniture,
    useFurniture:key=>{
      if(key==='bedSingle'){setAvatarAction('smile',850);sleep();return;}
      if(key==='kitchenFridge'){inventoryPanel();return;}
      if(key==='kitchenStove'){setAvatarAction('smile',500);cookingPanel('stove');return;}
      if(key==='kitchenSink'){setAvatarAction('smile',650);toast('손을 깨끗이 씻었어요.');return;}
      if(key==='kitchenCabinet'){inventoryPanel();return;}
      if(key==='classicSofa'){setAvatarAction('smile',700);toast('소파에서 편하게 쉬었어요.');return;}
      if(key==='tallBookcase'){setAvatarAction('smile',600);toast('책이 가지런히 꽂혀 있어요.');return;}
      if(key==='diningTable'){toast('내가 원하는 곳에 놓은 식탁이에요. 식사 공간을 자유롭게 꾸며보세요.');return;}
      if(key==='classicDesk'){toast('책상에 앉아 오늘 할 일을 정리했어요.');return;}
      if(key==='television'||key==='taehoRetroTv'){
        const p=prog(),t=townEconomy?.ensureState?.(p)||p.town,funGain=key==='taehoRetroTv'?20:15,timeGain=key==='taehoRetroTv'?15:20;
        if(t){
          t.fun=Math.min(100,(t.fun||0)+funGain);
          const nextTime=p.survival.time+timeGain;if(nextTime>=1440)p.survival.day+=1;p.survival.time=nextTime%1440;
          p.survival.hunger=Math.max(0,p.survival.hunger-2);persist();updateStatus();
        }
        setAvatarAction('smile',900);toast((key==='taehoRetroTv'?'레트로 게임을':'TV를')+' 즐겼어요. 재미 +'+funGain);return;
      }
      if(key==='soraBookcase'){
        const p=prog(),t=townEconomy?.ensureState?.(p)||p.town;
        p.energy=Math.min(p.maxEnergy,p.energy+3);if(t)t.fun=Math.min(100,(t.fun||0)+6);
        persist();updateStatus();setAvatarAction('smile',650);toast('희귀 책을 읽었어요. 체력 +3 · 재미 +6');return;
      }
    }
  });
  townEconomy=createTownEconomy({prog,inv,openPanel,toast,persist,updateStatus,setAvatarAction,itemName,travel:travelTo,playSfx:(kind,volume)=>worldAudio.sfx(kind,volume)});
  townEconomy.ensureState(prog());
  updateStatus();
  await Promise.all([buildOutdoor(),buildIndoor()]);
  await furnishingSystem.restore();
  await buildPets();
  showStarterHintOnce();
  const previous=save.player?.v3scene;
  if(previous==='indoor')setMode('indoor');
  else{mode='outdoor';outdoor.visible=true;indoor.visible=false;zoneEl.textContent='집 앞 · 3D 마을';wasInCity=isCityArea(player.x,player.z)}
  loading.classList.add('hide');
  canvas.focus();requestAnimationFrame(tick);
}
init().catch(err=>{console.error(err);loading.textContent='3D 월드를 불러오지 못했어요. 새로고침 후 다시 시도해 주세요.'});

window.KidscadeWorldV3={version:3,resetInput(){resetInput(true)},refresh(){resetInput(true);save=Storage?.load?.()||save;setAvatarSource(Bridge?.readAvatarSource?.()||'');updateStatus()},pauseAudio(){worldAudio.stop()},resumeAudio(){worldAudio.unlock();syncAudioButton()},setMode};

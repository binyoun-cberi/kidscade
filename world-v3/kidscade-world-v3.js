import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {buildKidscadeCity} from './kidscade-world-city.js?v=15';
import {createTownEconomy} from './kidscade-world-economy.js?v=11';
import {createFurnishingSystem} from './kidscade-world-furnishing.js?v=5';
import {createWorldAudio} from './kidscade-world-audio.js?v=1';
import {WORLD_GRID,WORLD_BOUNDS,CITY_BOUNDS,ROAD_X,ROAD_Z,zoneAt,isCityArea,isTravelCorridor,footprintTouchesRoad} from './kidscade-world-grid.js?v=2';

const V2=window.KidscadeWorldV2||{};
const Storage=V2.Storage;
const Bridge=V2.Bridge;
const Meta=window.KidscadeSeedWorldMeta||null;
const canvas=document.getElementById('world3d');
const loading=document.getElementById('loading');
const toastEl=document.getElementById('toast');
const promptEl=document.getElementById('prompt');
const zoneEl=document.getElementById('zone');
const statusEl=document.getElementById('status');
const statusClockEl=document.getElementById('statusClock');
const statusPhaseEl=document.getElementById('statusPhase');
const coinCountEl=document.getElementById('coinCount');
const seedCountEl=document.getElementById('seedCount');
const funCountEl=document.getElementById('funCount');
const worldMailChip=document.getElementById('worldMailChip');
const worldTaskChip=document.getElementById('worldTaskChip');
const healthLiquid=document.getElementById('healthLiquid');
const hungerLiquid=document.getElementById('hungerLiquid');
const healthValue=document.getElementById('healthValue');
const hungerValue=document.getElementById('hungerValue');
const quickbar=document.getElementById('quickbar');
const petPicker=document.getElementById('petPicker');
const helpBtn=document.getElementById('helpBtn');
const axeQuick=document.getElementById('axeQuick');
const pickQuick=document.getElementById('pickQuick');
const axeDur=document.getElementById('axeDur');
const pickDur=document.getElementById('pickDur');
const petQuickIcon=document.getElementById('petQuickIcon');
const petQuickName=document.getElementById('petQuickName');
const panel=document.getElementById('panel');
const panelBody=document.getElementById('panelBody');
const audioToggle=document.getElementById('audioToggle');
const worldAudio=createWorldAudio();
function syncAudioButton(){if(audioToggle){audioToggle.textContent=worldAudio.isEnabled()?'🔊':'🔇';audioToggle.title=worldAudio.isEnabled()?'소리 끄기':'소리 켜기'}}
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
  bunny:{name:'토끼',model:ASSET.petBunny,perk:'작물 수확량 +1',region:'목장',req:{carrot:2}},
  pig:{name:'돼지',model:ASSET.petPig,perk:'음식 포만감 +15%',region:'목장',req:{potato:2}},
  cow:{name:'소',model:ASSET.petCow,perk:'허기가 조금 천천히 감소',region:'목장',req:{carrot:2,tomato:1}},
  chick:{name:'병아리',model:ASSET.petChick,perk:'수확할 때 씨앗을 하나 더 발견',region:'목장',req:{tomato:1}},
  fox:{name:'여우',model:ASSET.petFox,perk:'버섯 채집량 +1',region:'깊은 숲',req:{fish:1,mushroom:1}},
  deer:{name:'사슴',model:ASSET.petDeer,perk:'허기 감소 속도 -7%',region:'깊은 숲',req:{carrot:2,tomato:1}},
  parrot:{name:'앵무새',model:ASSET.petParrot,perk:'낚시 추가 획득 확률',region:'깊은 숲',req:{tomato:2}},
  beaver:{name:'비버',model:ASSET.petBeaver,perk:'벌목 목재 +1',region:'북쪽 강가',req:{wood:2,carrot:1}}
};
const CUBE_PET_ICONS={dog:'🐶',cat:'🐱',bunny:'🐰',pig:'🐷',cow:'🐮',chick:'🐥',fox:'🦊',deer:'🦌',parrot:'🦜',beaver:'🦫'};

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
function openPanel(html){resetInput(true);petPicker?.classList.remove('open');panelBody.innerHTML=html;panel.classList.add('open')}
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
  p.equippedTool=['hand','axe','pick'].includes(p.equippedTool)?p.equippedTool:'hand';
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
  const rawDev=p.development&&typeof p.development==='object'?p.development:{};
  const clampLevel=(value,min,max,fallback)=>{const n=Number(value);return Math.max(min,Math.min(max,Math.floor(Number.isFinite(n)?n:fallback)))};
  p.development={
    farmLevel:clampLevel(rawDev.farmLevel,1,5,1),
    fishingLevel:clampLevel(rawDev.fishingLevel,0,3,0),
    stoneMineLevel:clampLevel(rawDev.stoneMineLevel,1,3,1),
    ironMineLevel:clampLevel(rawDev.ironMineLevel,1,3,1),
    techLevel:clampLevel(rawDev.techLevel,1,3,1),
    orchardLevel:clampLevel(rawDev.orchardLevel,0,5,0),
    ranchLevel:clampLevel(rawDev.ranchLevel,0,4,0),
    waterLevel:clampLevel(rawDev.waterLevel,0,3,0),
    houseLevel:clampLevel(rawDev.houseLevel,1,3,1),
    carpenterLevel:clampLevel(rawDev.carpenterLevel,0,3,0)
  };
  const rawHousing=p.housing&&typeof p.housing==='object'?p.housing:{};
  p.housing={
    version:4,
    owned:rawHousing.owned&&typeof rawHousing.owned==='object'?rawHousing.owned:{},
    placed:Array.isArray(rawHousing.placed)?rawHousing.placed:[],
    starterGiftClaimed:!!rawHousing.starterGiftClaimed,
    defaultLayoutMigrated:!!rawHousing.defaultLayoutMigrated,
    functionalLayoutMigrated:!!rawHousing.functionalLayoutMigrated,
    nextId:Math.max(1,Math.floor(Number(rawHousing.nextId)||1))
  };
  const rawHome=p.homestead&&typeof p.homestead==='object'?p.homestead:{};
  const legacyComfort=!rawHome.initialized&&(p.housing.defaultLayoutMigrated||p.housing.functionalLayoutMigrated||p.housing.placed.some(v=>/^home-/.test(String(v?.id||''))));
  p.homestead={
    version:1,
    initialized:true,
    kitchenLevel:clampLevel(rawHome.kitchenLevel,0,2,legacyComfort?2:0),
    bedLevel:clampLevel(rawHome.bedLevel,0,2,legacyComfort?2:0),
    backpackLevel:clampLevel(rawHome.backpackLevel,1,4,legacyComfort?2:1),
    storageLevel:clampLevel(rawHome.storageLevel,1,4,legacyComfort?2:1),
    wardrobeBuilt:rawHome.wardrobeBuilt===true||legacyComfort,
    homeStorage:rawHome.homeStorage&&typeof rawHome.homeStorage==='object'?rawHome.homeStorage:{}
  };
  p.orchard=p.orchard&&typeof p.orchard==='object'?p.orchard:{};
  p.orchard.trees=p.orchard.trees&&typeof p.orchard.trees==='object'?p.orchard.trees:{};
  p.orchard.harvests=p.orchard.harvests&&typeof p.orchard.harvests==='object'?p.orchard.harvests:{};
  if(legacyComfort){
    p.development.waterLevel=Math.max(p.development.waterLevel,3);
    p.development.houseLevel=Math.max(p.development.houseLevel,3);
    p.development.carpenterLevel=Math.max(p.development.carpenterLevel,1);
    p.development.fishingLevel=Math.max(p.development.fishingLevel,1);
  }
  return p;
}
const itemName=k=>({
  wood:'목재',stone:'돌',iron:'철광석',copper:'구리',quartz:'석영',gold:'금',semiconductor:'반도체',
  water:'물',nails:'못',fabric:'천',glass:'유리',wire:'전선',paint:'페인트',
  potato:'감자',carrot:'당근',tomato:'토마토',strawberry:'딸기',corn:'옥수수',pumpkin:'호박',
  apple:'사과',pear:'배',peach:'복숭아',orange:'감귤',cherry:'체리',
  milk:'우유',egg:'달걀',truffle:'트러플',fish:'물고기',rareFish:'희귀 물고기',pearl:'진주',bug:'곤충',mushroom:'버섯'
})[k]||k;

const BACKPACK_SLOTS=[0,8,12,16,20];
const HOME_STORAGE_SLOTS=[0,10,20,32,48];
function carriedSlotCount(){
  const materialSlots=Object.values(inv()).filter(v=>Number(v)>0).length;
  const foodSlots=Object.values(prog().food||{}).filter(v=>Number(v)>0).length;
  return materialSlots+foodSlots;
}
function backpackCapacity(){return BACKPACK_SLOTS[prog().homestead.backpackLevel]||8}
function homeStorageCapacity(){return HOME_STORAGE_SLOTS[prog().homestead.storageLevel]||10}
function canCarryNewKey(key){
  if((inv()[key]||0)>0)return true;
  return carriedSlotCount()<backpackCapacity();
}
function addInventoryItem(key,qty=1,{silent=false}={}){
  qty=Math.max(0,Math.floor(Number(qty)||0));if(!qty)return 0;
  const i=inv();
  if(!canCarryNewKey(key)){if(!silent)toast('🎒 가방이 가득 찼어요. 집의 수납함에 물건을 넣어 보세요.');return 0;}
  i[key]=(i[key]||0)+qty;return qty;
}
function waterCarryLimit(){
  const l=devState().waterLevel;
  return l>=3?12:l>=2?8:l>=1?5:3;
}
function addWater(qty){
  const i=inv(),max=waterCarryLimit(),before=Number(i.water)||0;
  if(before<=0&&!canCarryNewKey('water')){toast('🎒 물을 담을 가방 칸이 없어요.');return 0;}
  i.water=Math.min(max,before+Math.max(0,Math.floor(Number(qty)||0)));
  return i.water-before;
}
function hasIndoorTap(){return devState().waterLevel>=3&&mode==='indoor'}
function useWater(amount=1){
  if(hasIndoorTap())return true;
  const i=inv(),need=Math.max(1,Math.floor(Number(amount)||1));
  if((i.water||0)<need){toast('💧 물이 부족해요. 강이나 우물에서 물을 떠오세요.');return false;}
  i.water-=need;return true;
}

function toolName(key,p=prog()){
  if(key==='hand')return '맨손';
  const t=p.tools[key];
  if(!t||t.dur<=0)return key==='axe'?'도끼 없음':'곡괭이 없음';
  return (t.tier==='iron'?'철':'돌')+(key==='axe'?'도끼':'곡괭이');
}
function toolSlotNumber(key){return key==='axe'?'2':key==='pick'?'3':'1'}
function normalizeEquippedTool(p=prog()){
  if((p.equippedTool==='axe'&&!(p.tools.axe?.dur>0))||(p.equippedTool==='pick'&&!(p.tools.pick?.dur>0)))p.equippedTool='hand';
  return p.equippedTool;
}
function setEquippedTool(key,{silent=false}={}){
  if(!['hand','axe','pick'].includes(key))return false;
  const p=prog();
  if(key!=='hand'&&!(p.tools[key]?.dur>0)){if(!silent)toast((key==='axe'?'도끼':'곡괭이')+'가 없어요. 제작대에서 먼저 만들어 보세요.');return false}
  p.equippedTool=key;persist();updateStatus();
  if(!silent)toast(toolName(key,p)+' 장착');
  return true;
}
function requireEquippedTool(key){
  const p=prog();
  if(p.equippedTool===key&&p.tools[key]?.dur>0)return true;
  toast(toolName(key,p)+'를 '+toolSlotNumber(key)+'번 슬롯에서 장착하세요.');
  return false;
}
function renderPetPicker(){
  if(!petPicker)return;
  const state=petState(),selected=state.companion;
  petPicker.innerHTML=state.owned.map(id=>{
    const def=CUBE_PETS[id];if(!def)return '';
    return '<button type="button" class="petChoice '+(id===selected?'active':'')+'" data-pet-quick="'+id+'" title="'+def.perk+'">'+(CUBE_PET_ICONS[id]||'🐾')+'<br><small>'+def.name+'</small></button>';
  }).join('')||'<span style="color:#fff;padding:10px">아직 동행 가능한 펫이 없어요.</span>';
}
function togglePetPicker(){
  if(!petPicker)return;
  renderPetPicker();petPicker.classList.toggle('open');
}
function helpPanel(){
  openPanel('<h2>❓ 씨앗 월드 도움말</h2>'+
    '<div class="helpGrid">'+
    '<div class="helpItem"><b>🚶 이동</b>WASD 또는 방향키로 움직여요.</div>'+
    '<div class="helpItem"><b>✨ 행동</b>E 또는 Space로 가까운 대상과 상호작용해요.</div>'+
    '<div class="helpItem"><b>🪓 도구</b>1 맨손 · 2 도끼 · 3 곡괭이. 나무와 광물은 맞는 도구를 장착해야 해요.</div>'+
    '<div class="helpItem"><b>🎒 가방</b>4번 슬롯에서 재료와 음식을 확인하고 먹을 수 있어요.</div>'+
    '<div class="helpItem"><b>🐾 Cube Pets</b>5번 슬롯에서 내가 만난 펫을 즉시 동행시킬 수 있어요.</div>'+
    '<div class="helpItem"><b>❤ 생존</b>왼쪽 구는 체력, 오른쪽 구는 허기예요. 음식과 휴식으로 관리해요.</div>'+
    '<div class="helpItem"><b>📬 바로가기</b>위쪽의 📬 택배와 📋 오늘 할 일을 어디서든 바로 눌러 확인할 수 있어요.</div>'+
    '<div class="helpItem"><b>🧰 직접 제작</b>농장 제작대에서 재료를 3×3 칸에 직접 놓아 도구·반도체·TV를 만들어요.</div>'+
    '<div class="helpItem"><b>🏗️ 마을 성장</b>씨앗으로 밭·낚시터·광산·기술 공방을 발전시키면 월드에서 실제로 가능한 일이 늘어나요.</div>'+
    '</div><p><b>현재 지역 이름</b>을 누르면 씨앗버스 지도가 열립니다. 자원 총량과 음식은 가방에서 확인하세요.</p>');
}
function activateQuickSlot(key){
  if(key==='hand'||key==='axe'||key==='pick'){setEquippedTool(key);return}
  if(key==='bag'){inventoryPanel();return}
  if(key==='pet'){togglePetPicker()}
}
quickbar?.addEventListener('click',e=>{const b=e.target.closest?.('[data-quick]');if(b&&!b.disabled)activateQuickSlot(b.dataset.quick)});
petPicker?.addEventListener('click',e=>{
  const b=e.target.closest?.('[data-pet-quick]');if(!b)return;
  const id=b.dataset.petQuick,state=petState();if(!state.owned.includes(id)||!CUBE_PETS[id])return;
  state.companion=id;persist();petPicker.classList.remove('open');setAvatarAction('smile',500);toast(CUBE_PETS[id].name+'와 함께 다녀요!');updateStatus();
});
helpBtn?.addEventListener('click',helpPanel);


const FARM_PLOT_COUNTS=[1,2,3,6,9];
const DEVELOPMENT_TRACKS={
  farm:{key:'farmLevel',icon:'🥕',name:'농장',max:5,costs:[20,35,70,120],effects:['밭 1칸','밭 2칸','밭 3칸','밭 6칸','밭 9칸']},
  fishing:{key:'fishingLevel',icon:'🎣',name:'낚시터',max:3,costs:[35,80],effects:['집 연못','강가 낚시터','해변 희귀 낚시']},
  stone:{key:'stoneMineLevel',icon:'🪨',name:'돌 광산',max:3,costs:[45,100],effects:['돌','석영 발견','석영 증가 · 금 소량']},
  iron:{key:'ironMineLevel',icon:'⛏️',name:'철 광산',max:3,costs:[55,120],effects:['철광석','구리 발견','구리 증가 · 금 발견']},
  tech:{key:'techLevel',icon:'⚙️',name:'기술 공방',max:3,costs:[80,160],effects:['기초 도구','반도체 제작','전자제품 · TV 제작']}
};
function devState(){return prog().development}
function farmPlotCount(){return FARM_PLOT_COUNTS[Math.max(0,Math.min(4,devState().farmLevel-1))]||1}
function villageStars(){
  const d=devState(),score=(d.farmLevel-1)+(d.fishingLevel-1)+(d.stoneMineLevel-1)+(d.ironMineLevel-1)+(d.techLevel-1);
  return Math.max(1,Math.min(5,1+Math.floor(score/3)));
}
function developmentRequirement(track,nextLevel){
  const d=devState();
  if(track==='tech'&&nextLevel===2&&(d.stoneMineLevel<2||d.ironMineLevel<2))return '돌 광산 2단계와 철 광산 2단계가 필요해요.';
  if(track==='tech'&&nextLevel===3&&(d.stoneMineLevel<3||d.ironMineLevel<3))return '돌 광산 3단계와 철 광산 3단계가 필요해요.';
  return '';
}
function developmentPanel(){
  const d=devState(),seeds=Bridge?.readSeeds?.()||0,stars=villageStars();
  const cards=Object.entries(DEVELOPMENT_TRACKS).map(([id,def])=>{
    const level=d[def.key],maxed=level>=def.max,next=Math.min(def.max,level+1),cost=maxed?0:def.costs[level-1],req=maxed?'':developmentRequirement(id,next);
    const button=maxed?'최대 단계':req?req:'🌱 '+cost+' 투자';
    return '<div class="item"><b>'+def.icon+' '+def.name+' '+level+'/'+def.max+'</b><div>'+def.effects[level-1]+'</div>'+
      (maxed?'':'<small>다음: '+def.effects[next-1]+'</small><br>')+
      '<button data-dev-upgrade="'+id+'" '+(maxed||req?'disabled':'')+'>'+button+'</button></div>';
  }).join('');
  openPanel('<h2>🏗️ 씨앗마을 성장 · '+ '⭐'.repeat(stars)+'</h2><p>게임에서 모은 씨앗을 마을에 투자하면 <b>실제로 할 수 있는 일과 월드의 규모</b>가 커져요. 보유 🌱 '+seeds+'</p><div class="grid">'+cards+'</div><p style="font-size:12px">광산을 발전시키면 희귀 광물이 나오고, 기술 공방을 발전시키면 그 광물로 반도체와 전자제품을 만들 수 있어요.</p>');
}
function upgradeDevelopment(track){
  const def=DEVELOPMENT_TRACKS[track],d=devState();if(!def)return;
  const level=d[def.key];if(level>=def.max)return;
  const next=level+1,req=developmentRequirement(track,next);if(req){toast(req);return;}
  const cost=def.costs[level-1]||0,spent=Bridge?.spendSeeds?.(cost,'씨앗 월드 성장 · '+def.name);
  if(!spent?.ok){toast('씨앗이 부족해요. 다른 게임을 플레이해서 씨앗을 모아보세요.');return;}
  d[def.key]=next;persist();updateFarmExpansionVisuals();updateStatus();worldAudio.sfx('success',.14);
  toast(def.icon+' '+def.name+' '+next+'단계! · '+def.effects[next-1]);developmentPanel();
}

const CRAFT_MATERIAL_ICONS={wood:'🪵',stone:'🪨',iron:'⬛',copper:'🟠',quartz:'💎',gold:'🟡',semiconductor:'💾'};
const GRID_RECIPES=[
  {id:'stoneAxe',name:'돌도끼',minTech:1,pattern:['stone','stone','', 'wood','wood','', '','wood',''],out:{kind:'tool',slot:'axe',tier:'stone',dur:18}},
  {id:'stonePick',name:'돌곡괭이',minTech:1,pattern:['stone','stone','stone', '','wood','', '','wood',''],out:{kind:'tool',slot:'pick',tier:'stone',dur:18}},
  {id:'ironAxe',name:'철도끼',minTech:1,pattern:['iron','iron','', 'iron','wood','', '','wood',''],out:{kind:'tool',slot:'axe',tier:'iron',dur:38}},
  {id:'ironPick',name:'철곡괭이',minTech:1,pattern:['iron','iron','iron', '','wood','', '','wood',''],out:{kind:'tool',slot:'pick',tier:'iron',dur:38}},
  {id:'semiconductor',name:'반도체',minTech:2,pattern:['quartz','copper','quartz', 'copper','iron','copper', 'quartz','copper','quartz'],out:{kind:'item',item:'semiconductor',qty:1}},
  {id:'television',name:'모던 TV',minTech:3,pattern:['iron','semiconductor','gold', 'wood','semiconductor','wood', 'wood','wood','wood'],out:{kind:'furniture',item:'television',qty:1}}
];
let craftGrid=Array(9).fill(''),craftSelected='wood';
function gridCounts(grid=craftGrid){const out={};for(const k of grid)if(k)out[k]=(out[k]||0)+1;return out}
function gridRecipe(){const key=craftGrid.join('|');return GRID_RECIPES.find(r=>r.pattern.join('|')===key)||null}
function gridMaterialButton(k,i){
  const have=Number(i[k]||0),used=gridCounts()[k]||0,sel=craftSelected===k?' style="outline:3px solid #f4c542"':'';
  return '<button data-craft-material="'+k+'"'+sel+' '+(have-used>0?'':'disabled')+'>'+(CRAFT_MATERIAL_ICONS[k]||'◼')+' '+itemName(k)+' '+Math.max(0,have-used)+'</button>';
}
function craftingRecipeBook(){
  const tech=devState().techLevel;
  const rows=GRID_RECIPES.map(r=>'<div class="item"><b>'+(r.minTech>tech?'🔒 ':'')+r.name+'</b><div style="font-size:11px">'+r.pattern.map(x=>x?(CRAFT_MATERIAL_ICONS[x]||itemName(x)):'·').reduce((a,x,i)=>a+x+((i%3===2)?'<br>':' '),'')+'</div><small>기술 '+r.minTech+'단계</small></div>').join('');
  openPanel('<h2>📖 3×3 조합법 책</h2><div class="grid">'+rows+'</div><button data-craft-back="1">제작대로 돌아가기</button>');
}
function craftGridPanel(){
  const i=inv(),recipe=gridRecipe(),tech=devState().techLevel;
  const mats=['wood','stone','iron','copper','quartz','gold','semiconductor'].filter(k=>(i[k]||0)>0||['wood','stone','iron'].includes(k));
  const cells=craftGrid.map((k,idx)=>'<button data-craft-cell="'+idx+'" style="width:58px;height:58px;font-size:24px;border:2px solid #776d4f;border-radius:8px;background:#fffdf1">'+(k?(CRAFT_MATERIAL_ICONS[k]||'◼'):'')+'</button>').join('');
  const result=recipe?(recipe.minTech>tech?'🔒 '+recipe.name+' · 기술 '+recipe.minTech+'단계 필요':'✅ '+recipe.name):'재료를 3×3 칸에 놓아 조합해 보세요.';
  openPanel('<h2>🧰 3×3 직접 제작대</h2><p>재료를 고른 뒤 칸을 눌러 직접 배치해요. 채운 칸을 다시 누르면 재료를 뺄 수 있어요.</p>'+
    '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">'+mats.map(k=>gridMaterialButton(k,i)).join('')+'</div>'+
    '<div style="display:grid;grid-template-columns:repeat(3,58px);gap:5px;justify-content:center;margin:10px 0">'+cells+'</div>'+
    '<div style="text-align:center;font-weight:1000;margin:8px 0">'+result+'</div>'+
    '<div style="display:flex;gap:7px;justify-content:center;flex-wrap:wrap"><button data-craft-grid="make" '+(!recipe||recipe.minTech>tech?'disabled':'')+'>🔨 제작</button><button data-craft-grid="clear">전부 빼기</button><button data-craft-book="1">📖 조합법 책</button></div>');
}
function performGridCraft(){
  const recipe=gridRecipe(),p=prog(),i=inv();if(!recipe){toast('완성되는 조합이 아니에요.');return;}
  if(devState().techLevel<recipe.minTech){toast('기술 공방 '+recipe.minTech+'단계가 필요해요.');return;}
  const need=gridCounts();
  if(!Object.entries(need).every(([k,v])=>(i[k]||0)>=v)){toast('재료가 부족해요.');return;}
  Object.entries(need).forEach(([k,v])=>i[k]=Math.max(0,(i[k]||0)-v));
  if(recipe.out.kind==='tool'){
    p.tools[recipe.out.slot]={dur:recipe.out.dur,max:recipe.out.dur,tier:recipe.out.tier,craftedAt:Date.now()};p.equippedTool=recipe.out.slot;
  }else if(recipe.out.kind==='item'){
    i[recipe.out.item]=(i[recipe.out.item]||0)+(recipe.out.qty||1);
  }else if(recipe.out.kind==='furniture'){
    p.housing.owned[recipe.out.item]=(p.housing.owned[recipe.out.item]||0)+(recipe.out.qty||1);
  }
  craftGrid=Array(9).fill('');persist();updateStatus();setAvatarAction('smile',700);worldAudio.sfx('success',.13);
  toast('🔨 '+recipe.name+' 제작 완료!');craftGridPanel();
}
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

function applyParcelReward(reward){
  if(!reward||typeof reward!=='object')return false;
  const p=prog(),i=inv(),town=townEconomy?.ensureState?.(p)||p.town;
  if(reward.kind==='resources'){
    for(const [key,qty] of Object.entries(reward.items||{}))i[key]=(i[key]||0)+Math.max(0,Number(qty)||0);
  }else if(reward.kind==='townCoins'){
    if(town)town.coins=(Number(town.coins)||0)+Math.max(0,Number(reward.amount)||0);
  }else if(reward.kind==='fun'){
    if(town)town.fun=Math.min(100,(Number(town.fun)||0)+Math.max(0,Number(reward.amount)||0));
  }else if(reward.kind==='seeds'){
    const result=Bridge?.earnSeeds?.(reward.amount||0,'오늘의 씨앗 생활');
    if(!result?.ok)return false;
  }else return false;
  persist();updateStatus();return true;
}
function rewardText(reward){
  if(!reward)return '선물';
  if(reward.kind==='resources')return Object.entries(reward.items||{}).map(([k,v])=>itemName(k)+' +'+v).join(' · ');
  if(reward.kind==='townCoins')return '마을 코인 +'+reward.amount;
  if(reward.kind==='fun')return '재미 +'+reward.amount;
  if(reward.kind==='seeds')return '씨앗 +'+reward.amount;
  return '선물';
}
function mailboxPanel(){
  const list=Meta?.pendingParcels?.()||[];
  const cards=list.map(parcel=>'<div class="item"><b>'+(parcel.icon||'📦')+' '+parcel.name+'</b><div>'+(parcel.title||'게임 도전')+'</div><small>'+rewardText(parcel.reward)+'</small><br><button data-world-parcel="'+parcel.id+'">선물 열기</button></div>').join('');
  openPanel('<h2>📬 게임 택배 우편함</h2><p>Kidscade 게임을 제대로 플레이하면 하루 한 번씩 그 게임의 선물이 여기 도착해요.</p><div class="grid">'+(cards||'<div class="item">지금은 새 택배가 없어요. 다른 Kidscade 게임을 플레이하고 돌아와 보세요!</div>')+'</div><p style="font-size:12px">게임을 할수록 트로피도 자동으로 수집됩니다.</p>');
}
function dailyLifePanel(){
  const state=Meta?.getState?.(),daily=state?.daily;
  const tasks=(daily?.tasks||[]).map(task=>{
    const done=(Number(task.progress)||0)>=(Number(task.goal)||1);
    return '<div class="item"><b>'+task.icon+' '+task.title+'</b><div>'+(done?'✅ 완료':Math.min(task.goal,task.progress||0)+' / '+task.goal)+'</div></div>';
  }).join('');
  const summary=Meta?.summary?.()||{dailyDone:0,dailyTotal:3};
  openPanel('<h2>📋 오늘의 씨앗 생활</h2><p>길게 숙제처럼 하지 않아도 돼요. 월드에서 자연스럽게 세 가지만 해보세요.</p><div class="grid">'+tasks+'</div><p><b>'+summary.dailyDone+'/'+summary.dailyTotal+' 완료</b> · 세 가지를 모두 하면 📬 우편함에 씨앗 30개 선물이 도착해요.</p>');
}
function trophyPanel(){
  const list=Meta?.trophies?.()||[];
  const cards=list.map(t=>'<div class="item"><b>'+(t.icon||'🏆')+' '+(t.title||t.game)+'</b><div>'+t.count+'회 플레이 · '+Math.max(1,Math.round((t.seconds||0)/60))+'분 기록</div></div>').join('');
  openPanel('<h2>🏆 나의 게임 트로피</h2><p>Kidscade에서 실제로 플레이한 게임들이 씨앗 월드의 수집 기록이 됩니다.</p><div class="grid">'+(cards||'<div class="item">아직 트로피가 없어요. Kidscade 게임을 30초 이상 플레이해 보세요.</div>')+'</div><p><b>수집 '+list.length+'종</b></p>');
}
function cosmeticShopPanel(){
  const state=Meta?.cosmeticState?.()||{owned:[],equipped:'',defs:[]},seeds=Bridge?.readSeeds?.()||0;
  const cards=state.defs.map(def=>{
    const owned=state.owned.includes(def.id),equipped=state.equipped===def.id;
    const action=owned?(equipped?'장착 중':'장착하기'):'🌱 '+def.price;
    return '<div class="item"><b>'+def.icon+' '+def.name+'</b><div>'+def.desc+'</div><small>보유 씨앗 '+seeds+'</small><br><button data-world-cosmetic="'+def.id+'" '+(equipped?'disabled':'')+'>'+action+'</button></div>';
  }).join('');
  openPanel('<h2>✨ 씨앗 꾸미기 상점</h2><p>다른 게임에서 번 <b>공용 씨앗</b>으로 월드 전용 꾸미기를 해금해요. 능력치는 오르지 않고 내 공간만 더 특별해집니다.</p><div class="grid">'+cards+'</div><button data-world-cosmetic-clear="1">오라 끄기</button>');
}
function worldMapPanel(){
  const rows=Object.entries(TRAVEL_POINTS).map(([id,d])=>'<button data-world-travel="'+id+'">'+d.name+'</button>').join(' ');
  openPanel('<h2>🗺️ 씨앗버스 빠른 이동</h2><p>큰 월드를 오래 걷지 않아도 돼요. 가고 싶은 구역을 바로 선택하세요.</p><div style="display:flex;gap:7px;flex-wrap:wrap">'+rows+'</div>');
}
function homeHubPanel(){
  const s=Meta?.summary?.()||{pendingMail:0,trophies:0,dailyDone:0,dailyTotal:3};
  openPanel('<h2>🌱 씨앗 생활 보드 · '+ '⭐'.repeat(villageStars())+'</h2><p>오늘 할 일과 Kidscade에서 가져온 보상을 여기서 한 번에 확인해요.</p>'+
    '<div class="grid">'+
    '<div class="item"><b>📬 게임 택배</b><div>도착 '+s.pendingMail+'개</div><button data-world-hub="mail">열기</button></div>'+
    '<div class="item"><b>📋 오늘 할 일</b><div>'+s.dailyDone+'/'+s.dailyTotal+' 완료</div><button data-world-hub="daily">보기</button></div>'+
    '<div class="item"><b>🏆 게임 트로피</b><div>'+s.trophies+'종 수집</div><button data-world-hub="trophy">보기</button></div>'+
    '<div class="item"><b>✨ 꾸미기 상점</b><div>게임에서 번 씨앗 사용</div><button data-world-hub="shop">보기</button></div>'+
    '<div class="item"><b>🏗️ 마을 성장</b><div>현재 '+ '⭐'.repeat(villageStars())+'</div><button data-world-hub="develop">투자하기</button></div>'+
    '<div class="item"><b>🗺️ 빠른 이동</b><div>씨앗버스로 바로 이동</div><button data-world-hub="map">지도</button></div>'+
    '</div>');
}
function syncCosmeticAura(){
  const state=Meta?.cosmeticState?.(),def=state?.defs?.find(v=>v.id===state.equipped);
  cosmeticAura.visible=!!def;
  if(def)cosmeticAura.material.color.setHex(Number(def.color)||0x75b84b);
}
function inventoryPanel(){
  const items=Object.entries(inv()).filter(([,v])=>Number(v)>0);
  const food=Object.entries(prog().food).filter(([k,v])=>FOOD_DEF[k]&&Number(v)>0);
  openPanel(`<h2>보관함</h2>
    <h3>재료</h3><div class="grid">${items.length?items.map(([k,v])=>`<div class="item"><b>${itemName(k)}</b><div>${v}개</div></div>`).join(''):'<div class="item">아직 보관한 재료가 없어요.</div>'}</div>
    <h3>조리 음식</h3><div class="grid">${food.length?food.map(([k,v])=>`<div class="item"><b>${FOOD_DEF[k].name}</b><div>${v}개 · 허기 +${FOOD_DEF[k].hunger}</div><button data-eat="${k}">먹기</button></div>`).join(''):'<div class="item">아직 만든 음식이 없어요.</div>'}</div>`);
}
function workbenchPanel(){craftGridPanel();}
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
  const parcelBtn=e.target.closest('[data-world-parcel]');
  if(parcelBtn){
    const id=parcelBtn.dataset.worldParcel,parcel=(Meta?.pendingParcels?.()||[]).find(p=>p.id===id);
    if(!parcel)return;
    if(!applyParcelReward(parcel.reward)){toast('선물을 받는 중 문제가 생겼어요.');return;}
    const claimed=Meta?.claimParcel?.(id);worldAudio.sfx('success',.13);toast((parcel.icon||'🎁')+' '+rewardText(parcel.reward)+' 받았어요!');
    updateStatus();mailboxPanel();
    if(claimed?.bonus)setTimeout(()=>toast('🎁 오늘 할 일 완료! 우편함에 씨앗 선물이 추가됐어요.'),500);
    return;
  }
  const hub=e.target.closest('[data-world-hub]');
  if(hub){({mail:mailboxPanel,daily:dailyLifePanel,trophy:trophyPanel,shop:cosmeticShopPanel,develop:developmentPanel,map:worldMapPanel}[hub.dataset.worldHub]||homeHubPanel)();return;}
  const travel=e.target.closest('[data-world-travel]');
  if(travel){closePanel();travelTo(travel.dataset.worldTravel);return;}
  const cosmetic=e.target.closest('[data-world-cosmetic]');
  if(cosmetic){
    const state=Meta?.cosmeticState?.(),def=state?.defs?.find(v=>v.id===cosmetic.dataset.worldCosmetic);if(!def)return;
    if(!state.owned.includes(def.id)){
      const spent=Bridge?.spendSeeds?.(def.price,'씨앗 월드 꾸미기 · '+def.name);
      if(!spent?.ok){toast('씨앗이 부족해요. 다른 게임을 플레이해서 씨앗을 모아보세요.');return;}
      Meta?.unlockCosmetic?.(def.id);
    }
    Meta?.equipCosmetic?.(def.id);syncCosmeticAura();updateStatus();worldAudio.sfx('purchase',.14);toast(def.name+' 장착!');cosmeticShopPanel();return;
  }
  if(e.target.closest('[data-world-cosmetic-clear]')){Meta?.equipCosmetic?.('');syncCosmeticAura();cosmeticShopPanel();return;}
  const devUpgrade=e.target.closest('[data-dev-upgrade]');if(devUpgrade){upgradeDevelopment(devUpgrade.dataset.devUpgrade);return;}
  const material=e.target.closest('[data-craft-material]');if(material){craftSelected=material.dataset.craftMaterial;craftGridPanel();return;}
  const cell=e.target.closest('[data-craft-cell]');if(cell){
    const idx=Number(cell.dataset.craftCell),current=craftGrid[idx];
    if(current){craftGrid[idx]='';craftGridPanel();return;}
    const counts=gridCounts(),available=Number(inv()[craftSelected]||0)-(counts[craftSelected]||0);
    if(available<=0){toast(itemName(craftSelected)+'이(가) 더 필요해요.');return;}
    craftGrid[idx]=craftSelected;craftGridPanel();return;
  }
  const gridAction=e.target.closest('[data-craft-grid]');if(gridAction){if(gridAction.dataset.craftGrid==='make')performGridCraft();else{craftGrid=Array(9).fill('');craftGridPanel();}return;}
  if(e.target.closest('[data-craft-book]')){craftingRecipeBook();return;}
  if(e.target.closest('[data-craft-back]')){craftGridPanel();return;}
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
    p.tools[def.slot]={dur:def.max,max:def.max,tier:def.tier,craftedAt:Date.now()};p.equippedTool=def.slot;persist();setAvatarAction('smile',750);worldAudio.sfx('success',.10);toast(def.name+' 완성! · 자동 장착');workbenchPanel();updateStatus();return;
  }
  const cook=e.target.closest('[data-cook]');if(cook){cookFood(cook.dataset.cook);cookingPanel(panel.dataset.cookKind||'stove');return;}
  const eat=e.target.closest('[data-eat]');if(eat){eatFood(eat.dataset.eat);return;}
  const pet=e.target.closest('[data-pet]');if(pet&&CUBE_PETS[pet.dataset.pet]){prog().cubePets.companion=pet.dataset.pet;persist();petPicker?.classList.remove('open');toast(CUBE_PETS[pet.dataset.pet].name+'와 함께 다녀요!');petPanel();updateStatus();return;}
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
const cosmeticAura=new THREE.Mesh(
  new THREE.RingGeometry(.64,.80,48),
  new THREE.MeshBasicMaterial({color:0x75b84b,transparent:true,opacity:.58,side:THREE.DoubleSide,depthWrite:false})
);
cosmeticAura.rotation.x=-Math.PI/2;cosmeticAura.position.y=.045;cosmeticAura.visible=false;scene.add(cosmeticAura);

const avatarImg=new Image();avatarImg.decoding='async';
const avatarRuntimeFrame=document.getElementById('avatarRuntime');
let avatarRuntimeGuardDoc=null;
function silenceAvatarRuntime(){
  let doc=null;try{doc=avatarRuntimeFrame?.contentDocument||null}catch(_){}
  if(!doc)return;
  if(avatarRuntimeGuardDoc!==doc){
    avatarRuntimeGuardDoc=doc;
    const stop=e=>{const m=e.target;if(!m||!/^(AUDIO|VIDEO)$/.test(m.tagName||''))return;try{m.muted=true;m.pause?.()}catch(_){}};
    doc.addEventListener('play',stop,true);doc.addEventListener('playing',stop,true);
  }
  doc.querySelectorAll('audio,video').forEach(m=>{try{m.muted=true;m.pause?.()}catch(_){}});
}
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
  avatarRuntimeGuardDoc=null;silenceAvatarRuntime();
  try{
    const api=avatarRuntimeFrame.contentWindow?.KidscadeAvatarShop;
    const src=api?.getPreviewDataURL?.()||Bridge?.readAvatarSource?.()||'';
    if(src)setAvatarSource(src,true);
  }catch(_){}
});
function updateAvatarFrame(now,moving){
  if(now-lastAvatarFrame<92)return;lastAvatarFrame=now;silenceAvatarRuntime();
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
  if(!panel.classList.contains('open')&&['1','2','3','4','5'].includes(e.key)){
    e.preventDefault();activateQuickSlot(({1:'hand',2:'axe',3:'pick',4:'bag',5:'pet'})[e.key]);return;
  }
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

const LAYOUT_VERSION=7;
let mode='outdoor';
const savedLayout=Number(save.player?.v3Layout||0);
const player={
  x:savedLayout===LAYOUT_VERSION&&Number.isFinite(Number(save.player?.v3x))?Number(save.player.v3x):-12,
  z:savedLayout===LAYOUT_VERSION&&Number.isFinite(Number(save.player?.v3z))?Number(save.player.v3z):2.0,
  speed:5.1
};
const TRAVEL_POINTS={
  home:{x:-12,z:2.0,name:'집 구역'},
  forest:{x:-30,z:0,name:'깊은 숲'},
  quarry:{x:30,z:0,name:'광산'},
  camp:{x:-36,z:18.0,name:'야영지'},
  city:{x:-12,z:18.0,name:'씨앗마을 상점가'},
  river:{x:-12,z:-18.0,name:'북쪽 강가'},
  ranch:{x:12,z:-18.0,name:'목장'},
  beach:{x:-36,z:-18.0,name:'해변가'}
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
  const bounds=mode==='outdoor'?WORLD_BOUNDS:{x1:-6.6,x2:6.6,z1:-4.7,z2:4.7};
  if(nx<bounds.x1+.25||nx>bounds.x2-.25||nz<bounds.z1+.25||nz>bounds.z2-.25)return true;
  if(mode==='outdoor'&&!zoneAt(nx,nz)&&!isTravelCorridor(nx,nz))return true;
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
let lastMetaZone='';
function updateZone(){
  if(mode==='indoor'){zoneEl.textContent='우리 집 · 안전 지역 · 🗺️';if(lastMetaZone!=='indoor'){lastMetaZone='indoor';Meta?.recordExplore?.('indoor');}return;}
  const cell=zoneAt(player.x,player.z),zoneId=cell?.id||cell?.key||cell?.name||'road';
  zoneEl.textContent=(cell?(cell.name+' · '+cell.hint):'구역 사이 길')+' · 🗺️';
  if(zoneId!==lastMetaZone){lastMetaZone=zoneId;Meta?.recordExplore?.(zoneId);}
}
zoneEl?.addEventListener('click',worldMapPanel);
worldMailChip?.addEventListener('click',mailboxPanel);
worldTaskChip?.addEventListener('click',dailyLifePanel);
function setMode(next){
  resetInput(true);mode=next;outdoor.visible=next==='outdoor';indoor.visible=next==='indoor';
  if(next==='indoor'){player.x=0;player.z=3.55;zoneEl.textContent='우리 집 · 3D 실내';toast('집 안으로 들어왔어요.')}
  else{player.x=-12;player.z=-1.8;zoneEl.textContent='집 구역 · 집·연못·펫 마당';toast('집 밖으로 나왔어요.')}
  setAvatarAction('smile',520);near=null;
}
function spendTool(kind,item){
  const p=prog(),t=p.tools[item];
  if(!t||t.dur<=0){toast((item==='axe'?'도끼':'곡괭이')+'가 필요해요. 제작대에서 만들어 보세요.');return false}
  if(!requireEquippedTool(item))return false;
  if(p.energy<=4){toast('체력이 부족해요. 집 침대에서 쉬어 보세요.');return false}
  const iron=t.tier==='iron',petBonus=kind==='wood'&&companionId()==='beaver'?1:0,gain=(iron?2:1)+petBonus,cost=kind==='wood'?(iron?2.6:4):(iron?3.2:5);
  t.dur--;p.energy=Math.max(0,p.energy-cost);const i=inv(),extras=[];i[kind]=(i[kind]||0)+gain;
  if(kind==='stone'){
    const level=devState().stoneMineLevel;
    if(level>=2&&Math.random()<(level>=3?.38:.22)){i.quartz=(i.quartz||0)+1;extras.push('석영 +1');}
    if(level>=3&&Math.random()<.06){i.gold=(i.gold||0)+1;extras.push('금 +1');}
  }
  persist();updateStatus();worldAudio.sfx('impact',.12);
  toast((kind==='wood'?'목재':'돌')+' +'+gain+(extras.length?' · '+extras.join(' · '):''));return true;
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
function fish(place='pond'){
  const p=prog(),d=devState(),required=place==='beach'?3:place==='river'?2:1;
  if(d.fishingLevel<required){toast('🎣 낚시터 '+required+'단계에서 이용할 수 있어요. 마을 성장 보드에서 확장해 보세요.');return}
  if(p.energy<3){toast('체력이 부족해요.');return}
  p.energy=Math.max(0,p.energy-3);toast(place==='beach'?'바닷가 낚시 중…':place==='river'?'강가 낚시 중…':'연못 낚시 중…');
  setTimeout(()=>{
    const i=inv(),bonus=companionId()==='parrot'&&Math.random()<.32?1:0,gain=1+bonus,extras=[];
    i.fish=(i.fish||0)+gain;p.fishDex=p.fishDex||{};
    const label=place==='beach'?'해변 물고기':place==='river'?'강가 물고기':'연못 물고기';
    p.fishDex[label]=(p.fishDex[label]||0)+gain;
    if(place==='river'&&Math.random()<.24){i.rareFish=(i.rareFish||0)+1;extras.push('희귀 물고기 +1');}
    if(place==='beach'){
      if(Math.random()<.32){i.rareFish=(i.rareFish||0)+1;extras.push('희귀 물고기 +1');}
      if(Math.random()<.16){i.pearl=(i.pearl||0)+1;extras.push('진주 +1');}
    }
    persist();setAvatarAction('smile',900);updateStatus();worldAudio.sfx('pickup',.18);
    toast('물고기 +'+gain+(extras.length?' · '+extras.join(' · '):''));
  },850);
}
function mineIron(){
  const p=prog(),t=p.tools.pick;
  if(!t||t.dur<=0){toast('곡괭이가 필요해요.');return false;}
  if(!requireEquippedTool('pick'))return false;
  if(p.energy<=6){toast('체력이 부족해요.');return false;}
  const level=devState().ironMineLevel,gain=(t.tier==='iron'?2:1)+(level>=3?1:0),cost=t.tier==='iron'?4:6,extras=[];
  t.dur--;p.energy=Math.max(0,p.energy-cost);const i=inv();i.iron=(i.iron||0)+gain;
  if(level>=2&&Math.random()<(level>=3?.42:.24)){i.copper=(i.copper||0)+1;extras.push('구리 +1');}
  if(level>=3&&Math.random()<.10){i.gold=(i.gold||0)+1;extras.push('금 +1');}
  persist();setAvatarAction('smile',480);updateStatus();worldAudio.sfx('impact',.14);
  toast('철광석 +'+gain+(extras.length?' · '+extras.join(' · '):''));return true;
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
    state.type='';state.phase='empty';state.readyAt=0;state.plantedAt=0;persist();Meta?.advanceTask?.('harvest',1);worldAudio.sfx('pickup',.20);toast(def.name+' 수확 +'+gain);updateStatus();
  }
  updateCropVisuals();
}
const cropVisual=[];
const farmPlotActors=[];
function updateFarmExpansionVisuals(){
  const unlocked=farmPlotCount();
  for(const a of farmPlotActors){const open=a.index<unlocked;a.group.visible=open;a.interaction.enabled=open;}
  updateCropVisuals();
}
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
function isPathClearance(x,z,w=0,d=0){return footprintTouchesRoad(x,z,w,d,.18)}
function addNatureCollider(x,z,w,d){
  if(footprintTouchesRoad(x,z,w,d,.18))return null;
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
  const point=(id,dx=0,dz=0)=>{const c=WORLD_GRID[id];return {x:c.cx+dx,z:c.cz+dz}};
  const addZoneSign=async(id,dx,dz,label,rot=0,action=null)=>{
    const p=point(id,dx,dz);
    await addModel(outdoor,ASSET.signpost,{x:p.x,z:p.z,w:.74,h:1.58,d:.74,rot,name:'zone-sign-'+id});
    interact('outdoor',p.x,p.z,1.1,action?'🏗️ 성장판 보기':'표지판 읽기',()=>action?action():toast(label));
  };

  // Road-first layout: 20m square land parcels sit BETWEEN 4m road gutters.
  box(outdoor,0,12,92,92,.24,0x617b54,-.34);
  for(const cell of Object.values(WORLD_GRID)){
    box(outdoor,cell.cx,cell.cz,20,20,.10,cell.color,-.10);
  }
  for(const x of ROAD_X)box(outdoor,x,12,4,92,.08,0xc8b98f,-.02);
  for(const z of ROAD_Z)box(outdoor,0,z,92,4,.08,0xc8b98f,-.02);

  // HOME square (-22..-2 / -10..10)
  {
    const h=point('home');
    const pond=new THREE.Mesh(new THREE.CylinderGeometry(3.0,3.14,.12,48),new THREE.MeshStandardMaterial({color:0x67b5d3,roughness:.26,metalness:.03,transparent:true,opacity:.94}));
    pond.position.set(h.x-4.0,.055,h.z+5.1);pond.receiveShadow=true;outdoor.add(pond);
    const rim=new THREE.Mesh(new THREE.RingGeometry(3.0,3.34,48),new THREE.MeshStandardMaterial({color:0xc9b887,roughness:.9,side:THREE.DoubleSide}));
    rim.rotation.x=-Math.PI/2;rim.position.set(h.x-4.0,.12,h.z+5.1);outdoor.add(rim);
    await Promise.all([
      addModel(outdoor,ASSET.house,{x:h.x,z:h.z-5.5,w:6.7,h:6.2,d:5.4,rot:Math.PI,name:'home3d'}),
      addModel(outdoor,ASSET.chest,{x:h.x+6.1,z:h.z-5.0,w:1.15,h:.9,d:.95,rot:-.15,name:'starter-crate'}),
      addModel(outdoor,ASSET.chest,{x:h.x+5.5,z:h.z-2.6,w:.9,h:.72,d:.72,rot:.05,name:'game-mailbox'}),
      addModel(outdoor,ASSET.signpost,{x:h.x+5.4,z:h.z+.2,w:.72,h:1.35,d:.7,rot:.03,name:'life-board'})
    ]);
    addColliderFor('outdoor',h.x,h.z-5.5,5.8,4.4);
    interact('outdoor',h.x,h.z-2.35,1.8,'집에 들어가기',()=>setMode('indoor'));
    interact('outdoor',h.x+6.1,h.z-5.0,1.3,'초보자 보급 상자 열기',claimStarterKit);
    interact('outdoor',h.x+5.5,h.z-2.6,1.25,'📬 게임 택배 우편함',mailboxPanel);
    interact('outdoor',h.x+5.4,h.z+.2,1.25,'🌱 씨앗 생활 보드',homeHubPanel);
    interact('outdoor',h.x-4.0,h.z+6.2,2.0,'연못에서 낚시하기',()=>{setAvatarAction('smile',850);fish('pond');});
    await addZoneSign('home',6.0,4.8,'집 구역 · 집 · 연못 · Cube Pets',.25);
    await Promise.all([
      addGroundPickup('starter-wood-1','wood',h.x-7.0,h.z+2.8),
      addGroundPickup('starter-wood-2','wood',h.x-3.2,h.z+1.8),
      addGroundPickup('starter-wood-3','wood',h.x+3.4,h.z+5.5),
      addGroundPickup('starter-wood-4','wood',h.x+6.2,h.z+7.0),
      addGroundPickup('starter-wood-5','wood',h.x-6.0,h.z+7.4),
      addGroundPickup('starter-wood-6','wood',h.x+5.8,h.z-7.2),
      addGroundPickup('starter-stone-1','stone',h.x-7.2,h.z+5.8),
      addGroundPickup('starter-stone-2','stone',h.x-1.5,h.z+7.7),
      addGroundPickup('starter-stone-3','stone',h.x+4.4,h.z+3.8),
      addGroundPickup('starter-stone-4','stone',h.x+6.7,h.z-6.8),
      addGroundPickup('starter-stone-5','stone',h.x-6.6,h.z-7.3),
      addGroundPickup('starter-stone-6','stone',h.x+1.2,h.z+7.9)
    ]);
  }

  // FARM square (2..22 / -10..10)
  {
    const f=point('farm');
    await Promise.all([
      addModel(outdoor,ASSET.farmHouse,{x:f.x,z:f.z-5.7,w:4.8,h:4.5,d:4.2,rot:Math.PI,name:'farmhouse3d'}),
      addModel(outdoor,ASSET.workbench,{x:f.x+6.2,z:f.z+6.5,w:2.0,h:1.5,d:1.3,rot:-.2,name:'workbench3d'}),
      addModel(outdoor,ASSET.chest,{x:f.x+4.1,z:f.z+6.9,w:1.3,h:1.0,d:1.0,rot:.15,name:'chest3d'})
    ]);
    addColliderFor('outdoor',f.x,f.z-5.7,4.0,3.3);
    addColliderFor('outdoor',f.x+6.2,f.z+6.5,1.6,1.0);
    addColliderFor('outdoor',f.x+4.1,f.z+6.9,1.0,.8);
    interact('outdoor',f.x+6.2,f.z+5.65,1.45,'제작대 사용하기',workbenchPanel);
    interact('outdoor',f.x+4.1,f.z+6.1,1.35,'보관 상자 보기',inventoryPanel);
    const plotPos=[
      [f.x-6.0,f.z+1.1],[f.x-3.35,f.z+1.1],[f.x-.7,f.z+1.1],
      [f.x-6.0,f.z+3.8],[f.x-3.35,f.z+3.8],[f.x-.7,f.z+3.8],
      [f.x-6.0,f.z+6.5],[f.x-3.35,f.z+6.5],[f.x-.7,f.z+6.5]
    ];
    plotPos.forEach(([x,z],i)=>{
      const group=new THREE.Group();outdoor.add(group);
      box(group,x,z,2.15,2.2,.18,0x8a5d3b,.02);
      for(let rr=-1;rr<=1;rr++){const ridge=box(group,x+rr*.55,z,.28,1.9,.12,0x70472f,.20);ridge.castShadow=false}
      const plant=makePlant();plant.position.set(x,.24,z);group.add(plant);
      const id='work-crop-'+(i+1);
      const interaction=interact('outdoor',x,z,1.35,'밭 '+(i+1)+' 살펴보기',()=>{setAvatarAction('smile',500);cropAction(id);});
      cropVisual.push({id,object:plant});farmPlotActors.push({index:i,group,interaction});
    });
    updateFarmExpansionVisuals();
    for(const [dx,dz,rot] of [[-7.3,1.3,0],[-4.8,1.3,0],[-2.3,1.3,0],[.2,1.3,0],[.9,3.6,Math.PI/2],[.9,6.0,Math.PI/2],[-7.9,3.7,Math.PI/2],[-7.9,6.1,Math.PI/2]]){
      await addModel(outdoor,ASSET.fence,{x:f.x+dx,z:f.z+dz,w:2.25,h:.9,d:.30,rot});
    }
    await addZoneSign('farm',6.7,-.7,'농장 · 확장형 밭 · 3×3 제작',Math.PI/2,developmentPanel);
  }

  // WATERFRONT square (-22..-2 / -34..-14)
  {
    const w=point('waterfront');
    const river=new THREE.Mesh(new THREE.PlaneGeometry(19.4,5.7),new THREE.MeshStandardMaterial({color:0x579fc1,roughness:.25,metalness:.03,transparent:true,opacity:.94}));
    river.rotation.x=-Math.PI/2;river.position.set(w.x,.06,w.z);river.receiveShadow=true;outdoor.add(river);
    collider('outdoor',w.x-6.0,w.z,7.0,5.1);collider('outdoor',w.x+6.0,w.z,7.0,5.1);
    await addModel(outdoor,ASSET.bridge,{x:w.x,z:w.z,w:4.2,h:.9,d:5.4,rot:Math.PI/2,name:'northBridge'});
    interact('outdoor',w.x+1.8,w.z-2.2,1.8,'강가 낚시터 이용하기',()=>{setAvatarAction('smile',850);fish('river');});
    await addZoneSign('waterfront',6.5,6.8,'북쪽 강가 · 2단계 낚시터 · 비버',0);
  }

  // BEACH square (-46..-26 / -34..-14)
  {
    const b=point('beach');
    const sea=new THREE.Mesh(new THREE.PlaneGeometry(19.5,5.2),new THREE.MeshStandardMaterial({color:0x62a8c9,roughness:.2,metalness:.02,transparent:true,opacity:.95}));
    sea.rotation.x=-Math.PI/2;sea.position.set(b.x,.055,b.z-7.0);sea.receiveShadow=true;outdoor.add(sea);
    box(outdoor,b.x,b.z-3.9,19.4,1.1,.04,0xe7d7a4,.005);
    interact('outdoor',b.x,b.z-4.4,2.0,'해변에서 낚시하기',()=>{setAvatarAction('smile',850);fish('beach');});
    await addModel(outdoor,ASSET.logStack,{x:b.x-5.8,z:b.z+5.8,w:2.2,h:1.0,d:1.15,rot:.25});
    await addZoneSign('beach',6.4,6.6,'해변가 · 낚시 · 해안',0);
  }

  // FOREST square (-46..-26 / -10..10)
  {
    const c=point('forest'),treeAssets=[ASSET.tree,ASSET.oak,ASSET.pine];
    const trees=[[-7,-7],[-3,-8],[4,-7],[-7,-3],[-3,-3],[5,-2],[-7,4],[-3,6],[5,5],[-6,8],[4,8]];
    for(let i=0;i<trees.length;i++){
      const [dx,dz]=trees[i],x=c.x+dx,z=c.z+dz;if(isPathClearance(x,z,2.5,2.5))continue;
      await addModel(outdoor,treeAssets[(i+1)%3],{x,z,w:2.5,h:4.2+(i%3)*.25,d:2.5,rot:i*.37});
      addNatureCollider(x,z,.72,.72);interact('outdoor',x,z,1.3,'깊은 숲 나무 베기',()=>{if(spendTool('wood','axe'))setAvatarAction('smile',450);});
    }
    for(const [dx,dz] of [[-6,2.8],[-2,4.8],[5,3.2],[-5,-5.2]]){
      const x=c.x+dx,z=c.z+dz;await addModel(outdoor,ASSET.mushroom,{x,z,w:.75,h:.55,d:.7,rot:0});
      interact('outdoor',x,z,1.05,'버섯 채집하기',()=>{const i=inv(),gain=(companionId()==='fox'?2:1)+(Number(townPerks().mushroomBonus)||0);i.mushroom=(i.mushroom||0)+gain;prog().energy=Math.max(0,prog().energy-1);persist();toast('버섯 +'+gain);updateStatus();});
    }
    await addModel(outdoor,ASSET.logStack,{x:c.x-5,z:c.z+7.2,w:2.4,h:1.1,d:1.2,rot:.2});
    await addZoneSign('forest',7.0,6.6,'깊은 숲 · 목재 · 버섯',Math.PI/2);
  }

  // QUARRY square (26..46 / -10..10)
  {
    const q=point('quarry'),rocks=[[-7,-6],[-3,-7],[2,-6],[6,-3],[-7,-1],[-2,2],[5,2],[-7,6],[0,7],[6,6]],rockAssets=[ASSET.rockA,ASSET.rockB,ASSET.rockC];
    for(let i=0;i<rocks.length;i++){
      const [dx,dz]=rocks[i],x=q.x+dx,z=q.z+dz;if(isPathClearance(x,z,1.7,1.6))continue;
      await addModel(outdoor,rockAssets[i%3],{x,z,w:1.7,h:1.25,d:1.6,rot:i*.51});addNatureCollider(x,z,.9,.75);
      if(i%3===1)interact('outdoor',x,z,1.25,'철광석 캐기',()=>mineIron());
      else interact('outdoor',x,z,1.25,'광산 바위 캐기',()=>{if(spendTool('stone','pick'))setAvatarAction('smile',450);});
    }
    await addZoneSign('quarry',-7.0,6.6,'광산 · 돌 · 철 · 희귀 광물',-Math.PI/2,developmentPanel);
  }

  // CAMP square (-46..-26 / 14..34)
  {
    const c=point('camp');
    await addModel(outdoor,ASSET.campfire,{x:c.x-1.5,z:c.z,w:1.7,h:.8,d:1.7,rot:0,name:'campfire'});
    const fireLight=new THREE.PointLight(0xff9b45,0,9,2);fireLight.position.set(c.x-1.5,1.4,c.z);fireLight.userData.campfire=true;outdoor.add(fireLight);
    interact('outdoor',c.x-1.5,c.z,1.55,'모닥불 사용하기',()=>cookingPanel('campfire'));
    interact('outdoor',c.x+1.3,c.z,1.5,'야영지에서 쉬기',()=>{const p=prog();p.energy=Math.min(p.maxEnergy,p.energy+18);p.survival.hunger=Math.max(0,p.survival.hunger-4);persist();setAvatarAction('smile',750);toast('모닥불 곁에서 잠깐 쉬었어요.');updateStatus();});
    for(const [dx,dz] of [[-7,-7],[-5,6],[6,-7],[7,6]])await addModel(outdoor,ASSET.pine,{x:c.x+dx,z:c.z+dz,w:2.4,h:4.0,d:2.4,rot:.2});
    await addZoneSign('camp',7.0,-6.5,'야영지 · 모닥불 · 휴식',Math.PI/2);
  }

  // Decorative home flowers stay well inside their parcel.
  {
    const h=point('home');
    for(const [dx,dz] of [[-7,-5],[-6.3,-4.4],[5.8,-5.0],[-1.8,7.4],[5.3,6.7]])await addModel(outdoor,ASSET.flower,{x:h.x+dx,z:h.z+dz,w:.55,h:.5,d:.55,rot:0});
  }

  cityRuntime=await buildKidscadeCity({
    parent:outdoor,addModel,box,plane,interact,collider,loadGLB,loadGLTF,prepModel,
    actions:{
      resident:id=>townEconomy?.resident(id),shop:(kind,name)=>townEconomy?.shop(kind,name),
      jobs:()=>townEconomy?.jobs(),delivery:()=>townEconomy?.delivery(),
      talk:(id,name)=>townEconomy?.talk(id,name),arcade:()=>townEconomy?.arcade(),
      library:()=>townEconomy?.library(),clinic:()=>townEconomy?.clinic(),
      transport:()=>townEconomy?.transport(),bench:()=>townEconomy?.bench()
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
const PET_SLOTS=[[-19.2,-7.0],[-17.8,-7.1],[-16.4,-7.0],[-19.0,-5.8],[-17.6,-5.8],[-16.2,-5.7],[-18.8,-4.6],[-17.4,-4.6],[-16.0,-4.5],[-20.1,-5.8]];
const RANCH_SLOTS={bunny:[6.0,-27.0],pig:[7.5,-22.0],cow:[17.0,-27.0],chick:[17.0,-21.5]};
const RANCH_PRODUCTS={cow:{key:'milk',name:'우유',qty:1,cooldown:1},chick:{key:'egg',name:'달걀',qty:2,cooldown:1},pig:{key:'truffle',name:'트러플',qty:1,cooldown:2}};
const PET_SCALE={dog:.82,cat:.78,bunny:.72,pig:.88,cow:1.0,chick:.56,fox:.78,deer:.92,parrot:.64,beaver:.76};
const WILD_PETS={
  cat:{habitat:'pond',x:-16.0,z:5.6,roamX:.34,roamZ:.38},
  bunny:{habitat:'ranch',x:6.0,z:-27.0,roamX:.42,roamZ:.36},
  pig:{habitat:'ranch',x:7.5,z:-22.0,roamX:.40,roamZ:.34},
  cow:{habitat:'ranch',x:17.0,z:-27.0,roamX:.36,roamZ:.32},
  chick:{habitat:'ranch',x:17.0,z:-21.5,roamX:.44,roamZ:.38},
  fox:{habitat:'deep-forest',x:-40.0,z:2.8,roamX:.55,roamZ:.44},
  deer:{habitat:'deep-forest',x:-32.0,z:6.2,roamX:.58,roamZ:.46},
  parrot:{habitat:'deep-forest',x:-39.0,z:-5.0,roamX:.40,roamZ:.34},
  beaver:{habitat:'waterfront',x:-6.0,z:-27.0,roamX:.46,roamZ:.28}
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
  persist();Meta?.advanceTask?.('harvest',1);worldAudio.sfx('pickup',.20);toast(got.join(' · '));updateStatus();ranchPanel();
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

  // Owned Cube Pets stay inside the west side of the HOME square, away from road gutters.
  for(const [x,z,rot] of [[-20.2,-8.2,0],[-18.0,-8.2,0],[-15.8,-8.2,0],[-20.7,-6.0,Math.PI/2],[-15.3,-6.0,Math.PI/2],[-20.2,-3.8,0],[-18.0,-3.8,0],[-15.8,-3.8,0]]){
    await addModel(outdoor,ASSET.fence,{x,z,w:2.0,h:.85,d:.32,rot});
  }
  await addModel(outdoor,ASSET.signpost,{x:-19.8,z:-2.9,w:.7,h:1.45,d:.7,rot:.2,name:'pet-yard-sign'});
  interact('outdoor',-19.8,-2.9,1.35,'Cube Pets 보기',petPanel);

  // Ranch square (x 2..22, z -34..-14); fences stay at least 2m away from road gutters.
  for(const [x,z,rot] of [[4.5,-31.5,0],[7.5,-31.5,0],[16.5,-31.5,0],[19.5,-31.5,0],[4.5,-16.5,0],[7.5,-16.5,0],[16.5,-16.5,0],[19.5,-16.5,0],[3.5,-28.5,Math.PI/2],[3.5,-19.5,Math.PI/2],[20.5,-28.5,Math.PI/2],[20.5,-19.5,Math.PI/2]]){
    await addModel(outdoor,ASSET.fence,{x,z,w:2.8,h:.82,d:.30,rot});
  }
  await addModel(outdoor,ASSET.chest,{x:18.5,z:-17.4,w:1.1,h:.82,d:.9,rot:.1,name:'ranch-produce-crate'});
  await addModel(outdoor,ASSET.signpost,{x:15.8,z:-17.2,w:.7,h:1.45,d:.7,rot:.05,name:'ranch-sign'});
  interact('outdoor',18.0,-17.7,1.7,'목장 생산물 확인하기',ranchPanel);
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
  const p=prog(),s=p.survival,t=townEconomy?.ensureState?.(p)||p.town||{coins:0,fun:0};
  const equipped=normalizeEquippedTool(p);
  const energy=Math.max(0,Math.min(p.maxEnergy||100,Number(p.energy)||0));
  const pct=Math.max(0,Math.min(100,energy/(p.maxEnergy||100)*100));
  const hunger=Math.max(0,Math.min(100,Number(s.hunger)||0));
  const fun=Math.max(0,Math.min(100,Number(t.fun)||0));
  const phase=isNightTime(s.time)?'밤':'낮';
  if(statusClockEl)statusClockEl.textContent='Day '+s.day+' · '+clockText(s.time);
  if(statusPhaseEl)statusPhaseEl.textContent=(phase==='밤'?'🌙 ':'☀ ') + phase;
  if(coinCountEl)coinCountEl.textContent='🪙 '+Math.round(Number(t.coins)||0);
  if(seedCountEl){seedCountEl.textContent='🌱 '+(Bridge?.readSeeds?.()||0);seedCountEl.title='씨앗마을 '+'⭐'.repeat(villageStars());}
  if(funCountEl)funCountEl.textContent='🙂 '+Math.round(fun);
  const meta=Meta?.summary?.()||{pendingMail:0,dailyDone:0,dailyTotal:3};
  if(worldMailChip)worldMailChip.textContent='📬 '+meta.pendingMail;
  if(worldTaskChip)worldTaskChip.textContent='📋 '+meta.dailyDone+'/'+meta.dailyTotal;
  if(healthLiquid)healthLiquid.style.height=pct+'%';
  if(hungerLiquid)hungerLiquid.style.height=hunger+'%';
  if(healthValue)healthValue.textContent=Math.round(energy);
  if(hungerValue)hungerValue.textContent=Math.round(hunger);

  const axe=p.tools.axe, pick=p.tools.pick;
  const axeOk=axe?.dur>0,pickOk=pick?.dur>0;
  if(axeQuick)axeQuick.textContent=axeOk?toolName('axe',p):'도끼 없음';
  if(pickQuick)pickQuick.textContent=pickOk?toolName('pick',p):'곡괭이 없음';
  if(axeDur)axeDur.style.width=(axeOk?Math.max(0,Math.min(100,axe.dur/Math.max(1,axe.max||axe.dur)*100)):0)+'%';
  if(pickDur)pickDur.style.width=(pickOk?Math.max(0,Math.min(100,pick.dur/Math.max(1,pick.max||pick.dur)*100)):0)+'%';
  const axeButton=quickbar?.querySelector('[data-quick="axe"]'),pickButton=quickbar?.querySelector('[data-quick="pick"]');
  if(axeButton)axeButton.disabled=!axeOk;
  if(pickButton)pickButton.disabled=!pickOk;
  quickbar?.querySelectorAll('[data-quick="hand"],[data-quick="axe"],[data-quick="pick"]').forEach(b=>b.classList.toggle('selected',b.dataset.quick===equipped));

  const petId=companionId(),pet=CUBE_PETS[petId];
  if(petQuickIcon)petQuickIcon.textContent=petId?(CUBE_PET_ICONS[petId]||'🐾'):'🐾';
  if(petQuickName)petQuickName.textContent=pet?.name||'펫';
  if(petPicker?.classList.contains('open'))renderPetPicker();
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
    const nearFire=Math.hypot(player.x+37.5,player.z-24)<4.2;
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
    // Crossing into Seed Town must be seamless. Focus-loss guards already handle stuck keys.
    wasInCity=isCityArea(player.x,player.z);
  }else wasInCity=false;
  avatar.position.x=player.x;avatar.position.z=player.z;
  shadow.position.set(player.x,.035,player.z+.08);
  cosmeticAura.position.set(player.x,.045,player.z+.04);
  cosmeticAura.rotation.z=now/1800;
  if(cosmeticAura.visible){const pulse=1+Math.sin(now/330)*.06;cosmeticAura.scale.setScalar(pulse);}
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
  syncCosmeticAura();
  updateStatus();
  await Promise.all([buildOutdoor(),buildIndoor()]);
  await furnishingSystem.restore();
  await buildPets();
  updateStatus();
  showStarterHintOnce();
  const previous=save.player?.v3scene;
  if(previous==='indoor')setMode('indoor');
  else{mode='outdoor';outdoor.visible=true;indoor.visible=false;zoneEl.textContent='집 앞 · 3D 마을';wasInCity=isCityArea(player.x,player.z)}
  loading.classList.add('hide');
  canvas.focus();requestAnimationFrame(tick);
}

window.addEventListener('kidscade-seed-world-meta-change',()=>{syncCosmeticAura();updateStatus();});
init().catch(err=>{console.error(err);loading.textContent='3D 월드를 불러오지 못했어요. 새로고침 후 다시 시도해 주세요.'});

window.KidscadeWorldV3={version:3,resetInput(){resetInput(true)},refresh(){resetInput(true);save=Storage?.load?.()||save;setAvatarSource(Bridge?.readAvatarSource?.()||'');syncCosmeticAura();updateCropVisuals();updateStatus()},pauseAudio(){worldAudio.stop()},resumeAudio(){worldAudio.unlock();syncAudioButton()},setMode};

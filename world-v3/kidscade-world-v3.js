import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
import {buildKidscadeCity} from './kidscade-world-city.js?v=30';
import {createDailyDirector} from './kidscade-world-daily.js?v=3';
import {createDailyLife} from './kidscade-world-daily-life.js?v=3';
import {buildVenueInteriors,VENUE_MODES,VENUE_INFO,VENUE_BOUNDS} from './kidscade-world-interiors.js?v=10';
import {createMuseumSystem} from './kidscade-world-museum.js?v=2';
import {createTownEconomy} from './kidscade-world-economy.js?v=23';
import {createFurnishingSystem} from './kidscade-world-furnishing.js?v=10';
import {buildHomeInterior,HOME_INTERIOR_LEVELS,homeInteriorCameraProfile} from './kidscade-world-interior-kit.js?v=2';
import {createWorldAudio} from './kidscade-world-audio.js?v=1';
import {WORLD_GRID,WORLD_BOUNDS,CITY_BOUNDS,ROAD_X,ROAD_Z,zoneAt,isCityArea,isTravelCorridor,footprintTouchesRoad} from './kidscade-world-grid.js?v=6';
import {buildWorldLandscape} from './kidscade-world-landscape.js?v=1';

const V2=window.KidscadeWorldV2||{};
const Storage=V2.Storage;
const Bridge=V2.Bridge;
const Meta=window.KidscadeSeedWorldMeta||null;
const HOMESTEAD_REWORK_VERSION=2;
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
const radialMenu=document.getElementById('radialMenu');
const radialContext=document.getElementById('radialContext');
const radialContextIcon=document.getElementById('radialContextIcon');
const radialContextLabel=document.getElementById('radialContextLabel');
const mobileInteractBtn=document.getElementById('mobileInteract');
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
  furniture:ROOT+'interiors/kenney-furniture-kit/',
  bakery:ROOT+'bakery/interior/'
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

const outdoor=new THREE.Group(),indoor=new THREE.Group(),venueLayer=new THREE.Group(),petLayer=new THREE.Group();
scene.add(outdoor,indoor,venueLayer,petLayer);indoor.visible=false;venueLayer.visible=false;

const loader=new GLTFLoader();
const fbxLoader=new FBXLoader();
const gltfCache=new Map();
const fbxCache=new Map();
function loadGLTF(url){
  if(gltfCache.has(url))return gltfCache.get(url);
  const p=new Promise((resolve,reject)=>loader.load(url,resolve,undefined,reject));
  gltfCache.set(url,p);return p;
}
function loadGLB(url){return loadGLTF(url).then(g=>g.scene)}
function loadFBX(url){
  if(fbxCache.has(url))return fbxCache.get(url);
  const p=new Promise((resolve,reject)=>fbxLoader.load(url,resolve,undefined,reject));
  fbxCache.set(url,p);return p;
}
function loadModelSource(url){
  return /\.fbx(?:$|\?)/i.test(url)?loadFBX(url):loadGLB(url);
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
    const base=await loadModelSource(url),o=prepModel(base.clone(true));
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
async function addFence(parent,x,z,rot=0,{length=2.25,thickness=.30,height=.9,name=''}={}){
  const vertical=Math.abs(Math.sin(rot))>.5;
  return addModel(parent,ASSET.fence,{x,z,w:vertical?thickness:length,h:height,d:vertical?length:thickness,rot,name});
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
for(const venueMode of Object.values(VENUE_MODES)){colliders[venueMode]=[];interactables[venueMode]=[]}
function collider(mode,x,z,w,d){const c={x,z,w,d,enabled:true};colliders[mode].push(c);return c;}
function interact(mode,x,z,r,label,action){const q={x,z,r,label,action,enabled:true};interactables[mode].push(q);return q;}

let save=Storage?.load?.()||{player:{},inventory:{},progression:{energy:100,maxEnergy:100,tools:{},seeds:{potato:2,carrot:2,tomato:2},crops:{},food:{},fishDex:{}}};
let museumRuntime=null;
function persist(){Storage?.save?.(save)}
function toast(text){
  toastEl.textContent=text;toastEl.classList.add('show');clearTimeout(toastEl.__t);
  toastEl.__t=setTimeout(()=>toastEl.classList.remove('show'),1600);
}
function openPanel(html){closeRadialMenu(false);resetInput(true);petPicker?.classList.remove('open');panelBody.innerHTML=html;panel.classList.add('open')}
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
  p.seeds={potato:2,carrot:2,tomato:2,strawberry:1,corn:1,pumpkin:1,beet:1,lettuce:1,mushroom:1,rice:1,watermelon:1,wheat:1,bamboo:1,berry:1,...(p.seeds||{})};
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
  p.homestead={
    version:2,
    reworkVersion:Math.max(0,Math.floor(Number(rawHome.reworkVersion)||0)),
    initialized:true,
    campfireBuilt:rawHome.campfireBuilt===true,
    kitchenLevel:clampLevel(rawHome.kitchenLevel,0,2,0),
    bedLevel:clampLevel(rawHome.bedLevel,0,2,0),
    backpackLevel:clampLevel(rawHome.backpackLevel,1,4,1),
    storageLevel:clampLevel(rawHome.storageLevel,1,4,1),
    wardrobeBuilt:rawHome.wardrobeBuilt===true,
    homeStorage:rawHome.homeStorage&&typeof rawHome.homeStorage==='object'?rawHome.homeStorage:{},
    homeFoodStorage:rawHome.homeFoodStorage&&typeof rawHome.homeFoodStorage==='object'?rawHome.homeFoodStorage:{},
    bookcaseReadDay:Math.max(0,Math.floor(Number(rawHome.bookcaseReadDay)||0))
  };
  p.orchard=p.orchard&&typeof p.orchard==='object'?p.orchard:{};
  p.orchard.trees=p.orchard.trees&&typeof p.orchard.trees==='object'?p.orchard.trees:{};
  p.orchard.harvests=p.orchard.harvests&&typeof p.orchard.harvests==='object'?p.orchard.harvests:{};

  // v3.22: old housing migrations used to auto-promote returning saves to a nearly finished home.
  // Rebase only the physical homestead once; keep seeds, coins, trophies, pets and town friendships intact.
  if(p.homestead.reworkVersion<HOMESTEAD_REWORK_VERSION){
    Object.assign(p.development,{
      farmLevel:1,fishingLevel:0,stoneMineLevel:1,ironMineLevel:1,techLevel:1,
      orchardLevel:0,ranchLevel:0,waterLevel:0,houseLevel:1,carpenterLevel:0
    });
    Object.assign(p.homestead,{
      reworkVersion:HOMESTEAD_REWORK_VERSION,campfireBuilt:false,kitchenLevel:0,bedLevel:0,
      backpackLevel:1,storageLevel:1,wardrobeBuilt:false
    });
    const progressionFurniture=new Set([
      'bedSingle','kitchenStove','kitchenSink','kitchenCabinet','kitchenFridge','homeDrawers','wardrobe',
      'classicDesk','tallBookcase','classicSofa','diningTable','rugRectangle','woodChair','sideTable',
      'pottedPlant','bookcase','coffeeTable','loungeChair','rugRound','floorLamp','teddy','television'
    ]);
    p.housing.placed=p.housing.placed.filter(v=>v&&!progressionFurniture.has(v.key));
    for(const key of progressionFurniture)delete p.housing.owned[key];
    // These flags now mean "do not resurrect the old furnished starter house".
    p.housing.defaultLayoutMigrated=true;
    p.housing.functionalLayoutMigrated=true;
    p.orchard.harvests={};
  }
  return p;
}
const itemName=k=>({
  wood:'목재',stone:'돌',iron:'철광석',copper:'구리',quartz:'석영',gold:'금',semiconductor:'반도체',
  water:'물',nails:'못',fabric:'천',glass:'유리',wire:'전선',paint:'페인트',
  potato:'감자',carrot:'당근',tomato:'토마토',strawberry:'딸기',corn:'옥수수',pumpkin:'호박',
  beet:'비트',lettuce:'상추',mushroom:'버섯',rice:'벼',watermelon:'수박',wheat:'밀',bamboo:'대나무',berry:'베리',
  apple:'사과',pear:'배',peach:'복숭아',orange:'감귤',cherry:'체리',
  milk:'우유',egg:'달걀',truffle:'트러플',fish:'물고기',rareFish:'희귀 물고기',pearl:'진주',shell:'조개껍데기',bug:'곤충',mushroom:'버섯'
})[k]||k;

const BACKPACK_SLOTS=[0,8,12,16,20];
const HOME_STORAGE_SLOTS=[0,10,20,32,48];
function carriedSlotCount(){
  const materialSlots=Object.values(inv()).filter(v=>Number(v)>0).length;
  const foodSlots=Object.values(prog().food||{}).filter(v=>Number(v)>0).length;
  return materialSlots+foodSlots;
}
function backpackCapacity(){return BACKPACK_SLOTS[prog().homestead.backpackLevel]||8}
function hasPlacedFurniture(key){return prog().housing?.placed?.some?.(v=>v?.key===key)||false}
function effectiveStorageLevel(){
  if(hasPlacedFurniture('kitchenCabinet'))return 3;
  if(hasPlacedFurniture('homeDrawers'))return 2;
  return 1;
}
function homeStorageCapacity(){return HOME_STORAGE_SLOTS[effectiveStorageLevel()]||10}
function canCarryNewKey(key){
  if((inv()[key]||0)>0)return true;
  return carriedSlotCount()<backpackCapacity();
}
function canCarryFoodKey(key){
  if((prog().food?.[key]||0)>0)return true;
  return carriedSlotCount()<backpackCapacity();
}
function addFoodItem(key,qty=1,{silent=false}={}){
  qty=Math.max(0,Math.floor(Number(qty)||0));if(!qty)return 0;
  const food=prog().food;
  if(!canCarryFoodKey(key)){if(!silent)toast('🎒 음식을 넣을 가방 칸이 없어요.');return 0;}
  food[key]=(food[key]||0)+qty;
  museumRuntime?.discoverItem?.(key,{kind:'food',day:prog().survival.day});
  return qty;
}
function addInventoryItem(key,qty=1,{silent=false,museumId='',location=''}={}){
  qty=Math.max(0,Math.floor(Number(qty)||0));if(!qty)return 0;
  const i=inv();
  if(!canCarryNewKey(key)){if(!silent)toast('🎒 가방이 가득 찼어요. 집의 수납함에 물건을 넣어 보세요.');return 0;}
  i[key]=(i[key]||0)+qty;
  if(museumId){
    const recorded=museumRuntime?.recordSpecimen?.(museumId,qty,{day:prog().survival.day,location});
    if(!recorded)museumRuntime?.discover?.(museumId,{day:prog().survival.day,location});
  }else museumRuntime?.discoverItem?.(key,{day:prog().survival.day});
  return qty;
}
function removeInventoryItem(key,qty=1){
  qty=Math.max(0,Math.floor(Number(qty)||0));if(!qty)return 0;
  const i=inv(),removed=Math.min(Math.max(0,Number(i[key])||0),qty);if(!removed)return 0;
  i[key]=Math.max(0,(Number(i[key])||0)-removed);museumRuntime?.consumeItem?.(key,removed);return removed;
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
function hasIndoorTap(){return devState().waterLevel>=3&&mode==='indoor'&&hasPlacedFurniture('kitchenSink')}
function useWater(amount=1){
  if(hasIndoorTap())return true;
  const i=inv(),need=Math.max(1,Math.floor(Number(amount)||1));
  if((i.water||0)<need){toast('💧 물이 부족해요. 강이나 우물에서 물을 떠오세요.');return false;}
  i.water-=need;return true;
}
function canCarryBundle(items){
  const i=inv(),newKeys=Object.entries(items||{}).filter(([k,v])=>Number(v)>0&&(i[k]||0)<=0).map(([k])=>k);
  return carriedSlotCount()+newKeys.length<=backpackCapacity();
}
function homeStorage(){return prog().homestead.homeStorage}
function homeStorageSlotCount(){return Object.values(homeStorage()).filter(v=>Number(v)>0).length}
function transferToHomeStorage(key){
  const i=inv(),s=homeStorage(),qty=Math.max(0,Math.floor(Number(i[key])||0));if(!qty)return;
  if((s[key]||0)<=0&&homeStorageSlotCount()>=homeStorageCapacity()){toast('집 수납공간도 가득 찼어요. 수납 가구를 더 만들어 보세요.');return;}
  s[key]=(s[key]||0)+qty;i[key]=0;persist();homeStoragePanel();
}
function transferFromHomeStorage(key){
  const i=inv(),s=homeStorage(),qty=Math.max(0,Math.floor(Number(s[key])||0));if(!qty)return;
  if((i[key]||0)<=0&&carriedSlotCount()>=backpackCapacity()){toast('🎒 가방에 빈 칸이 없어요.');return;}
  i[key]=(i[key]||0)+qty;s[key]=0;persist();homeStoragePanel();
}
function homeStoragePanel(){
  const i=inv(),s=homeStorage();
  const carried=Object.entries(i).filter(([,v])=>Number(v)>0);
  const stored=Object.entries(s).filter(([,v])=>Number(v)>0);
  openPanel('<h2>📦 집 수납</h2><p><b>가방 '+carriedSlotCount()+'/'+backpackCapacity()+'칸</b> · 집 수납 '+homeStorageSlotCount()+'/'+homeStorageCapacity()+'칸'+(effectiveStorageLevel()===1?' (임시 상자)':effectiveStorageLevel()===2?' (서랍장)':' (큰 수납장)')+'</p>'+
    '<h3>가방에서 넣기</h3><div class="grid">'+(carried.length?carried.map(([k,v])=>'<div class="item"><b>'+itemName(k)+'</b><div>'+v+'개</div><button data-store-in="'+k+'">전부 넣기</button></div>').join(''):'<div class="item">가방이 비어 있어요.</div>')+'</div>'+
    '<h3>집에서 꺼내기</h3><div class="grid">'+(stored.length?stored.map(([k,v])=>'<div class="item"><b>'+itemName(k)+'</b><div>'+v+'개</div><button data-store-out="'+k+'">전부 꺼내기</button></div>').join(''):'<div class="item">보관 중인 재료가 없어요.</div>')+'</div>'+
    '<p><button data-open-furniture="1">🪑 가구 창고 · 배치</button></p>');
}
function homeFoodStorage(){return prog().homestead.homeFoodStorage}
function homeFoodStoragePanel(){
  const bag=prog().food||{},cold=homeFoodStorage(),bagRows=Object.entries(bag).filter(([k,v])=>FOOD_DEF[k]&&Number(v)>0),coldRows=Object.entries(cold).filter(([k,v])=>FOOD_DEF[k]&&Number(v)>0);
  openPanel('<h2>🧊 냉장고</h2><p>조리한 음식을 집에 보관하면 가방 칸을 비울 수 있어요.</p>'+
    '<h3>가방 음식</h3><div class="grid">'+(bagRows.length?bagRows.map(([k,v])=>'<div class="item"><b>'+FOOD_DEF[k].name+'</b><div>'+v+'개</div><button data-food-store-in="'+k+'">냉장 보관</button></div>').join(''):'<div class="item">가방에 음식이 없어요.</div>')+'</div>'+
    '<h3>냉장 음식</h3><div class="grid">'+(coldRows.length?coldRows.map(([k,v])=>'<div class="item"><b>'+FOOD_DEF[k].name+'</b><div>'+v+'개</div><button data-food-store-out="'+k+'">가방으로 꺼내기</button></div>').join(''):'<div class="item">냉장고가 비어 있어요.</div>')+'</div>');
}
function moveFoodToFridge(key){
  const bag=prog().food,cold=homeFoodStorage(),qty=Math.max(0,Number(bag[key])||0);if(!qty)return;
  cold[key]=(cold[key]||0)+qty;bag[key]=0;persist();homeFoodStoragePanel();
}
function moveFoodFromFridge(key){
  const bag=prog().food,cold=homeFoodStorage(),qty=Math.max(0,Number(cold[key])||0);if(!qty)return;
  if((bag[key]||0)<=0&&carriedSlotCount()>=backpackCapacity()){toast('🎒 가방에 빈 칸이 없어요.');return;}
  bag[key]=(bag[key]||0)+qty;cold[key]=0;persist();homeFoodStoragePanel();
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
    '<div class="helpItem"><b>🧭 라디얼 메뉴</b>Q를 누르거나 Tab을 길게 눌러 열어요. 모바일은 행동 버튼을 짧게 누르면 행동, 길게 누르면 메뉴가 열려요.</div>'+
    '<div class="helpItem"><b>🪓 도구</b>1 맨손 · 2 도끼 · 3 곡괭이. 나무와 광물은 맞는 도구를 장착해야 해요.</div>'+
    '<div class="helpItem"><b>🎒 가방</b>4번 슬롯에서 재료와 음식을 확인하고 먹을 수 있어요.</div>'+
    '<div class="helpItem"><b>🐾 Cube Pets</b>5번 슬롯에서 내가 만난 펫을 즉시 동행시킬 수 있어요.</div>'+
    '<div class="helpItem"><b>❤ 생존</b>왼쪽 구는 체력, 오른쪽 구는 허기예요. 음식과 휴식으로 관리해요.</div>'+
    '<div class="helpItem"><b>📬 바로가기</b>위쪽의 📬 택배와 📋 오늘 할 일을 어디서든 바로 눌러 확인할 수 있어요.</div>'+
    '<div class="helpItem"><b>🧰 직접 제작</b>농장 제작대에서 재료를 3×3 칸에 직접 놓아 도구·반도체·TV를 만들어요.</div>'+
    '<div class="helpItem"><b>🏗️ 마을 성장</b>씨앗으로 밭·과수원·목장·낚시·광산·집을 키우면 월드의 모습과 생활이 달라져요.</div>'+
    '<div class="helpItem"><b>💧 물 생활</b>처음엔 강물을 들고 와요. 우물 → 펌프 → 집 수도 순서로 점점 편해집니다.</div>'+
    '<div class="helpItem"><b>🎒 수납</b>처음 가방은 8칸뿐이에요. 집 상자에 내려놓고 더 좋은 가방과 수납가구를 마련하세요.</div>'+
    '<div class="helpItem"><b>🪚 목수공방</b>마트 재료와 직접 모은 자원으로 침대·옷장·주방가구를 만들어 집에 배치해요.</div>'+
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
const ORCHARD_TREE_COUNTS=[0,1,2,4,6,9];
const RANCH_CAPACITY=[0,1,2,3,4];
const DEVELOPMENT_TRACKS={
  farm:{key:'farmLevel',icon:'🥕',name:'농장',group:'생산',max:5,costs:[0,20,35,70,120],effects:[null,'밭 1칸','밭 2칸','밭 3칸','밭 6칸','밭 9칸']},
  orchard:{key:'orchardLevel',icon:'🍎',name:'과수원',group:'생산',max:5,costs:[40,60,90,130,180],effects:['아직 없음','사과나무 1그루','사과·배 2그루','복숭아 포함 4그루','감귤 포함 6그루','체리 포함 9그루'],reqs:{0:{wood:4},1:{wood:4,nails:1},2:{wood:6,nails:2},3:{wood:8,nails:3},4:{wood:10,nails:4}}},
  ranch:{key:'ranchLevel',icon:'🐄',name:'목장',group:'생산',max:4,costs:[45,75,120,175],effects:['아직 없음','작은 우리 · 동물 1마리','목장 2마리','큰 축사 · 3마리','완성 목장 · 4마리'],reqs:{0:{wood:6,nails:2},1:{wood:8,nails:2},2:{wood:10,stone:4,nails:3},3:{wood:12,iron:3,nails:4}}},
  fishing:{key:'fishingLevel',icon:'🎣',name:'낚시터',group:'생산',max:3,costs:[30,55,90],effects:['낚시터 없음','집 연못','강가 낚시터','해변 희귀 낚시'],reqs:{0:{stone:2},1:{wood:4,nails:1},2:{wood:6,nails:2}}},
  water:{key:'waterLevel',icon:'💧',name:'물 생활',group:'생활',max:3,costs:[30,65,120],effects:['강물 직접 운반','집 앞 우물','수동 펌프','집 수도 연결'],reqs:{0:{stone:5,wood:4},1:{iron:3,nails:2},2:{copper:2,wire:2,glass:1}}},
  house:{key:'houseLevel',icon:'🏠',name:'우리 집',group:'생활',max:3,costs:[0,55,115],effects:[null,'단칸방','방 2개','큰 집 · 거실/주방'],reqs:{1:{wood:12,nails:4},2:{wood:20,stone:8,nails:8,glass:2}}},
  carpenter:{key:'carpenterLevel',icon:'🪚',name:'목수공방',group:'생활',max:3,costs:[45,90,150],effects:['공방 없음','기본 가구 제작','주방·수납 가구','고급 생활 가구'],reqs:{0:{wood:8,stone:4},1:{wood:8,nails:4,glass:1},2:{iron:4,wire:2,paint:2}}},
  stone:{key:'stoneMineLevel',icon:'🪨',name:'돌 광산',group:'자원·기술',max:3,costs:[0,45,100],effects:[null,'돌','석영 발견','석영 증가 · 금 소량']},
  iron:{key:'ironMineLevel',icon:'⛏️',name:'철 광산',group:'자원·기술',max:3,costs:[0,55,120],effects:[null,'철광석','구리 발견','구리 증가 · 금 발견']},
  tech:{key:'techLevel',icon:'⚙️',name:'기술 공방',group:'자원·기술',max:3,costs:[0,80,160],effects:[null,'기초 도구','반도체 제작','전자제품 · TV 제작']}
};
function devState(){return prog().development}
function farmPlotCount(){return FARM_PLOT_COUNTS[Math.max(0,Math.min(4,devState().farmLevel-1))]||1}
function orchardTreeCount(){return ORCHARD_TREE_COUNTS[Math.max(0,Math.min(5,devState().orchardLevel))]||0}
function ranchCapacity(){return RANCH_CAPACITY[Math.max(0,Math.min(4,devState().ranchLevel))]||0}
function developmentEffect(def,level){return def.effects[Math.max(0,Math.min(def.effects.length-1,level))]||'준비 중'}
function villageStars(){
  const d=devState();
  const score=(d.farmLevel-1)+d.fishingLevel+(d.stoneMineLevel-1)+(d.ironMineLevel-1)+(d.techLevel-1)+
    d.orchardLevel+d.ranchLevel+d.waterLevel+(d.houseLevel-1)+d.carpenterLevel;
  if(score>=22)return 5;if(score>=15)return 4;if(score>=9)return 3;if(score>=4)return 2;return 1;
}
function developmentRequirement(track,nextLevel){
  const d=devState();
  if(track==='tech'&&nextLevel===2&&(d.stoneMineLevel<2||d.ironMineLevel<2))return '돌 광산 2단계와 철 광산 2단계가 필요해요.';
  if(track==='tech'&&nextLevel===3&&(d.stoneMineLevel<3||d.ironMineLevel<3))return '돌 광산 3단계와 철 광산 3단계가 필요해요.';
  if(track==='water'&&nextLevel===3&&(d.houseLevel<2||d.carpenterLevel<2))return '집 2단계와 목수공방 2단계가 필요해요.';
  if(track==='carpenter'&&nextLevel>=2&&d.houseLevel<2)return '집을 2단계로 먼저 확장해야 해요.';
  return '';
}
function developmentMaterials(def,currentLevel){return def.reqs?.[currentLevel]||{}}
function developmentTrackDiscovered(id){
  const d=devState(),h=prog().homestead;
  if(['farm','water','house'].includes(id))return true;
  if(id==='carpenter')return h.campfireBuilt||d.waterLevel>=1||d.carpenterLevel>0;
  if(id==='stone'||id==='iron')return d.carpenterLevel>=1||d[id==='stone'?'stoneMineLevel':'ironMineLevel']>1;
  if(id==='orchard')return d.houseLevel>=2||d.orchardLevel>0;
  if(id==='ranch')return d.orchardLevel>=1||d.ranchLevel>0;
  if(id==='fishing')return d.ranchLevel>=1||d.fishingLevel>0;
  if(id==='tech')return (d.stoneMineLevel>=2&&d.ironMineLevel>=2)||d.techLevel>1;
  return false;
}
function developmentMaterialsText(req){
  const rows=Object.entries(req||{});return rows.length?rows.map(([k,v])=>itemName(k)+' '+v).join(' · '):'추가 재료 없음';
}
function hasDevelopmentMaterials(req){const i=inv();return Object.entries(req||{}).every(([k,v])=>(i[k]||0)>=v)}
function payDevelopmentMaterials(req){const i=inv();Object.entries(req||{}).forEach(([k,v])=>i[k]=Math.max(0,(i[k]||0)-v))}
function developmentPanel(){
  const d=devState(),seeds=Bridge?.readSeeds?.()||0,stars=villageStars();
  const groups=['생산','생활','자원·기술'].map(group=>{
    const cards=Object.entries(DEVELOPMENT_TRACKS).filter(([id,def])=>def.group===group&&developmentTrackDiscovered(id)).map(([id,def])=>{
      const level=d[def.key],maxed=level>=def.max,next=Math.min(def.max,level+1),cost=maxed?0:(def.costs[level]||0),req=maxed?{}:developmentMaterials(def,level),gate=maxed?'':developmentRequirement(id,next);
      const enough=hasDevelopmentMaterials(req),button=maxed?'최대 단계':gate?gate:(!enough?'재료 부족':'🌱 '+cost+' 투자');
      return '<div class="item"><b>'+def.icon+' '+def.name+' '+level+'/'+def.max+'</b><div>'+developmentEffect(def,level)+'</div>'+
        (maxed?'':'<small>다음: '+developmentEffect(def,next)+'<br>'+developmentMaterialsText(req)+'</small><br>')+
        '<button data-dev-upgrade="'+id+'" '+(maxed||gate||!enough?'disabled':'')+'>'+button+'</button></div>';
    }).join('');
    return cards?'<h3>'+group+'</h3><div class="grid">'+cards+'</div>':'';
  }).join('');
  openPanel('<h2>🏗️ 씨앗마을 성장 · '+ '⭐'.repeat(stars)+'</h2><p>지금 생활에서 자연스럽게 발견한 발전만 보여요. 새 시설은 개척을 이어가면 하나씩 나타납니다. · 보유 🌱 '+seeds+'</p>'+groups+'<p style="font-size:12px">처음부터 완성된 마을이 아니라, 불편한 생활을 하나씩 해결하며 월드가 실제로 커집니다.</p>');
}
function upgradeDevelopment(track){
  const def=DEVELOPMENT_TRACKS[track],d=devState();if(!def)return;
  const level=d[def.key];if(level>=def.max)return;
  const next=level+1,gate=developmentRequirement(track,next);if(gate){toast(gate);return;}
  const req=developmentMaterials(def,level);if(!hasDevelopmentMaterials(req)){toast('필요 재료: '+developmentMaterialsText(req));return;}
  const cost=def.costs[level]||0,spent=Bridge?.spendSeeds?.(cost,'씨앗 월드 성장 · '+def.name);
  if(!spent?.ok){toast('씨앗이 부족해요. 다른 게임을 플레이해서 씨앗을 모아보세요.');return;}
  payDevelopmentMaterials(req);d[def.key]=next;persist();
  updateFarmExpansionVisuals();updateOrchardVisuals?.();updateRanchExpansionVisuals?.();updateHomesteadVisuals?.();updateStatus();
  worldAudio.sfx('success',.14);toast(def.icon+' '+def.name+' '+next+'단계! · '+developmentEffect(def,next));developmentPanel();
}

const CRAFT_MATERIAL_ICONS={wood:'🪵',stone:'🪨',iron:'⬛',copper:'🟠',quartz:'💎',gold:'🟡',semiconductor:'💾'};
const GRID_RECIPES=[
  {id:'stoneAxe',name:'돌도끼',minTech:1,pattern:['stone','stone','', 'wood','wood','', '','wood',''],out:{kind:'tool',slot:'axe',tier:'stone',dur:18}},
  {id:'stonePick',name:'돌곡괭이',minTech:1,pattern:['stone','stone','stone', '','wood','', '','wood',''],out:{kind:'tool',slot:'pick',tier:'stone',dur:18}},
  {id:'ironAxe',name:'철도끼',minTech:1,pattern:['iron','iron','', 'iron','wood','', '','wood',''],out:{kind:'tool',slot:'axe',tier:'iron',dur:38}},
  {id:'ironPick',name:'철곡괭이',minTech:1,pattern:['iron','iron','iron', '','wood','', '','wood',''],out:{kind:'tool',slot:'pick',tier:'iron',dur:38}},
  {id:'semiconductor',name:'반도체',minTech:2,pattern:['quartz','copper','quartz', 'copper','iron','copper', 'quartz','copper','quartz'],out:{kind:'item',item:'semiconductor',qty:1}},
  {id:'television',name:'모던 TV',minTech:3,pattern:['iron','semiconductor','gold', 'wood','semiconductor','wood', 'wood','wood','wood'],out:{kind:'furniture',item:'television',qty:1}},
  {id:'homeCampfire',name:'집 앞 캠프파이어',minTech:1,pattern:['stone','','stone', '','wood','', 'stone','wood','stone'],out:{kind:'homestead',upgrade:'campfire'}}
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

  let outputOk=true;
  if(recipe.out.kind==='tool'){
    p.tools[recipe.out.slot]={dur:recipe.out.dur,max:recipe.out.dur,tier:recipe.out.tier,craftedAt:Date.now()};p.equippedTool=recipe.out.slot;
  }else if(recipe.out.kind==='item'){
    outputOk=!!addInventoryItem(recipe.out.item,recipe.out.qty||1,{silent:true});
  }else if(recipe.out.kind==='furniture'){
    p.housing.owned[recipe.out.item]=(p.housing.owned[recipe.out.item]||0)+(recipe.out.qty||1);
  }else if(recipe.out.kind==='homestead'&&recipe.out.upgrade==='campfire'){
    p.homestead.campfireBuilt=true;
  }
  if(!outputOk){
    for(const [k,v] of Object.entries(need))i[k]=(i[k]||0)+v;
    toast('🎒 완성품을 넣을 가방 칸이 없어요. 제작 재료는 돌려놓았어요.');
    craftGridPanel();return;
  }

  craftGrid=Array(9).fill('');persist();updateHomesteadVisuals();updateStatus();setAvatarAction('smile',700);worldAudio.sfx('success',.13);
  toast('🔨 '+recipe.name+' 제작 완료!');craftGridPanel();
}
const CARPENTER_RECIPES={
  bedSingle:{name:'나무 침대',level:1,req:{wood:8,nails:2,fabric:2},desc:'바닥 이불 대신 편하게 잘 수 있어요.'},
  homeDrawers:{name:'서랍장',level:1,req:{wood:6,nails:2},desc:'집 수납공간이 20칸으로 늘어요.'},
  woodChair:{name:'나무 의자',level:1,req:{wood:4,nails:1},desc:'첫 생활 가구예요.'},
  sideTable:{name:'작은 협탁',level:1,req:{wood:5,nails:1,paint:1},desc:'작은 방을 꾸미기 좋아요.'},
  wardrobe:{name:'옷장',level:2,req:{wood:10,nails:3,fabric:2},friend:'minji',friendNeed:3,desc:'집 안에서 바로 아바타 옷을 갈아입어요.'},
  kitchenCabinet:{name:'큰 수납장',level:2,req:{wood:8,nails:3,paint:1},friend:'junho',friendNeed:3,desc:'집 수납공간을 32칸으로 확장해요.'},
  kitchenStove:{name:'가스레인지',level:2,req:{iron:4,nails:2,glass:1},friend:'haneul',friendNeed:3,desc:'수프·오믈렛·과일요리까지 만들 수 있어요.'},
  kitchenSink:{name:'싱크대·수도꼭지',level:2,req:{wood:4,iron:2,nails:2,glass:1},friend:'junho',friendNeed:3,waterNeed:3,desc:'수도 3단계가 연결되면 집에서 바로 물을 써요.'},
  classicDesk:{name:'책상',level:2,req:{wood:8,nails:2,paint:1},desc:'넓어진 집의 생활 가구예요.'},
  diningTable:{name:'식탁',level:2,req:{wood:9,nails:2,paint:1},desc:'주방과 식사 공간을 꾸며요.'},
  classicSofa:{name:'소파',level:3,req:{wood:12,nails:4,fabric:4},friend:'minji',friendNeed:7,desc:'큰 집 거실용 고급 가구예요.'},
  kitchenFridge:{name:'냉장고',level:3,req:{iron:6,glass:2,wire:4,semiconductor:1},friend:'haneul',friendNeed:7,desc:'현대식 주방의 핵심 가구예요.'}
};
function carpenterFriendship(recipe){
  if(!recipe.friend)return {ok:true,text:''};
  const f=Number(townEconomy?.ensureState?.(prog())?.friendship?.[recipe.friend]||0);
  const name=townEconomy?.RESIDENTS?.[recipe.friend]?.name||recipe.friend;
  return {ok:f>=recipe.friendNeed,text:name+' 친밀도 ♥ '+recipe.friendNeed};
}
function carpenterPanel(){
  const level=devState().carpenterLevel;
  if(level<1){openPanel('<h2>🪚 목수공방 터</h2><p>아직 공방이 없어요. 씨앗 생활 보드의 <b>마을 성장</b>에서 목수공방을 세워 보세요.</p><button data-world-hub="develop">성장판 보기</button>');return;}
  const i=inv(),cards=Object.entries(CARPENTER_RECIPES).map(([key,r])=>{
    const friend=carpenterFriendship(r),waterOk=!r.waterNeed||devState().waterLevel>=r.waterNeed;
    const enough=Object.entries(r.req).every(([k,v])=>(i[k]||0)>=v),unlocked=level>=r.level&&friend.ok&&waterOk;
    const req=Object.entries(r.req).map(([k,v])=>itemName(k)+' '+v).join(' · ');
    const lock=level<r.level?'목수공방 '+r.level+'단계 필요':!friend.ok?friend.text:!waterOk?'수도 '+r.waterNeed+'단계 필요':'';
    return '<div class="item"><b>'+(unlocked?'':'🔒 ')+r.name+'</b><div>'+r.desc+'</div><small>'+req+(lock?'<br>'+lock:'')+'</small><br><button data-carpenter-craft="'+key+'" '+(unlocked&&enough?'':'disabled')+'>'+(unlocked?(enough?'제작':'재료 부족'):'잠김')+'</button></div>';
  }).join('');
  openPanel('<h2>🪚 목수공방 '+level+'단계</h2><p>목재·광물은 직접 모으고, <b>못·천·유리·전선·페인트는 씨앗마을 상점</b>에서 사서 생활 가구를 만들어요.</p><div class="grid">'+cards+'</div>');
}
function craftCarpenterFurniture(key){
  const r=CARPENTER_RECIPES[key],p=prog(),i=inv();if(!r)return;
  if(devState().carpenterLevel<r.level){toast('목수공방 단계가 부족해요.');return;}
  const friend=carpenterFriendship(r);if(!friend.ok){toast(friend.text+'이 필요해요.');return;}
  if(r.waterNeed&&devState().waterLevel<r.waterNeed){toast('수도 '+r.waterNeed+'단계가 필요해요.');return;}
  if(!Object.entries(r.req).every(([k,v])=>(i[k]||0)>=v)){toast('가구 재료가 부족해요.');return;}
  Object.entries(r.req).forEach(([k,v])=>i[k]=Math.max(0,(i[k]||0)-v));
  p.housing.owned[key]=(p.housing.owned[key]||0)+1;
  if(key==='homeDrawers')p.homestead.storageLevel=Math.max(2,p.homestead.storageLevel);
  if(key==='kitchenCabinet')p.homestead.storageLevel=Math.max(3,p.homestead.storageLevel);
  if(key==='wardrobe')p.homestead.wardrobeBuilt=true;
  if(key==='kitchenStove')p.homestead.kitchenLevel=Math.max(2,p.homestead.kitchenLevel);
  if(key==='bedSingle')p.homestead.bedLevel=Math.max(1,p.homestead.bedLevel);
  persist();updateHomesteadVisuals();setAvatarAction('smile',650);worldAudio.sfx('success',.12);toast('🪚 '+r.name+' 제작 완료! 집 가구 창고에 들어갔어요.');carpenterPanel();
}
const FOOD_DEF={
  grilledFish:{name:'구운 생선',hunger:34,energy:10},
  bakedPotato:{name:'구운 감자',hunger:25,energy:6},
  veggieSoup:{name:'채소 수프',hunger:42,energy:12},
  mushroomSoup:{name:'버섯 수프',hunger:38,energy:10},
  omelet:{name:'달걀 오믈렛',hunger:44,energy:13},
  fruitSalad:{name:'과일 샐러드',hunger:35,energy:10},
  cityLunch:{name:'도시락',hunger:46,energy:14},
  cafeToast:{name:'카페 토스트',hunger:28,energy:9}
};
const RECIPES={
  grilledFish:{name:'구운 생선',req:{fish:1}},
  bakedPotato:{name:'구운 감자',req:{potato:1}},
  veggieSoup:{name:'채소 수프',req:{carrot:1,tomato:1,water:1}},
  mushroomSoup:{name:'버섯 수프',req:{mushroom:2,water:1}},
  omelet:{name:'달걀 오믈렛',req:{egg:2,milk:1}},
  fruitSalad:{name:'과일 샐러드',req:{apple:1,pear:1,peach:1}}
};
function recipeHasIngredients(recipe,kind='stove'){
  const i=inv();return Object.entries(recipe.req).every(([k,v])=>k==='water'&&kind==='stove'&&hasIndoorTap()?true:(i[k]||0)>=v);
}
function consumeRecipeIngredients(recipe,kind='stove'){
  const i=inv(),consumed={};
  for(const [k,v] of Object.entries(recipe.req)){
    if(k==='water'&&kind==='stove'&&hasIndoorTap())continue;
    i[k]=Math.max(0,(i[k]||0)-v);consumed[k]=(consumed[k]||0)+v;
  }
  return consumed;
}
function restoreRecipeIngredients(consumed){
  const i=inv();for(const [k,v] of Object.entries(consumed||{}))i[k]=(i[k]||0)+v;
}


function applyParcelReward(reward){
  if(!reward||typeof reward!=='object')return false;
  const p=prog(),i=inv(),town=townEconomy?.ensureState?.(p)||p.town;
  if(reward.kind==='resources'){
    if(!canCarryBundle(reward.items||{})){toast('🎒 택배를 받으려면 가방을 조금 비워주세요.');return false;}
    for(const [key,qty] of Object.entries(reward.items||{}))addInventoryItem(key,qty,{silent:true});
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
function residentsPanel(){
  const residents=townEconomy?.RESIDENTS||{},town=townEconomy?.ensureState?.()||{},friendship=town.friendship||{};
  const cards=Object.entries(residents).map(([id,r])=>'<button class="item" type="button" data-radial-resident="'+id+'" style="text-align:left;cursor:pointer"><b>👤 '+r.name+'</b><div>'+r.role+'</div><small>친밀도 ♥ '+(friendship[id]||0)+'</small></button>').join('');
  openPanel('<h2>👥 씨앗 월드 사람들</h2><p>선생님과 학생의 친밀도·생활 퀘스트·전용 서비스를 한 곳에서 확인해요.</p><div class="grid">'+(cards||'<div class="item">아직 만날 수 있는 주민 정보가 없어요.</div>')+'</div>');
}
function radialLifePanel(){
  const inside=mode==='indoor';
  openPanel('<h2>🏠 생활</h2><p>집과 마을을 키우고 내 생활 공간을 관리해요.</p><div class="grid">'+
    '<button data-radial-life="hub">🌱 씨앗 생활 보드</button>'+
    '<button data-radial-life="develop">🏗️ 마을 성장</button>'+
    '<button data-radial-life="furniture" '+(inside?'':'disabled')+'>🪑 집 꾸미기'+(inside?'':' · 집 안에서')+'</button>'+
    '</div>');
}
function radialSettingsPanel(){
  openPanel('<h2>⚙️ 씨앗 월드 기타</h2><div class="grid">'+
    '<button data-radial-help="1">❓ 조작 도움말</button>'+
    '<button data-radial-audio="1">'+(worldAudio.isEnabled()?'🔊 소리 끄기':'🔇 소리 켜기')+'</button>'+
    '</div><p style="font-size:12px">라디얼 메뉴는 Q 또는 Tab 길게, 모바일에서는 행동 버튼 길게 누르기로 열 수 있어요.</p>');
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
function travelPointDiscovered(id){
  const d=devState();
  if(['home','farm','forest','quarry','river','camp','city','plaza','civic','transit','residential','residentialNorth','museum'].includes(id))return true;
  if(id==='orchard')return d.orchardLevel>0;
  if(id==='ranch')return d.ranchLevel>0;
  if(id==='beach')return d.fishingLevel>=3;
  return false;
}
const WORLD_MAP_META={
  beach:{icon:'🏖️',travel:'beach'},waterfront:{icon:'🌊',travel:'river'},ranch:{icon:'🐄',travel:'ranch'},orchard:{icon:'🍎',travel:'orchard'},
  forest:{icon:'🌲',travel:'forest'},home:{icon:'🏠',travel:'home'},farm:{icon:'🌾',travel:'farm'},quarry:{icon:'⛏️',travel:'quarry'},
  camp:{icon:'⛺',travel:'camp'},cityMarket:{icon:'🛍️',travel:'city'},cityLeisure:{icon:'🎪',travel:'plaza'},residentialSouth:{icon:'🏘️',travel:'residential'},
  museum:{icon:'🏛️',travel:'museum'},cityCivic:{icon:'📚',travel:'civic'},cityTransit:{icon:'🚌',travel:'transit'},residentialNorth:{icon:'🌳',travel:'residentialNorth'}
};
function worldMapPanel(){
  const current=mode==='outdoor'?zoneAt(player.x,player.z):null;
  const xs=[-36,-12,12,36],zs=[48,24,0,-24],cards=[];
  for(const z of zs)for(const x of xs){
    const cell=Object.values(WORLD_GRID).find(v=>v.cx===x&&v.cz===z);
    if(!cell){cards.push('<div style="min-height:76px;border-radius:12px;background:rgba(62,78,57,.12);border:1px dashed rgba(62,78,57,.18)"></div>');continue;}
    const meta=WORLD_MAP_META[cell.id]||{icon:'📍',travel:''},open=!meta.travel||travelPointDiscovered(meta.travel),here=current?.id===cell.id;
    const base='min-height:76px;padding:8px 5px;border-radius:12px;border:'+(here?'3px solid #e9a63a':'2px solid #65745d')+';background:'+(open?'#f8f0d1':'#d7d4c8')+';color:#2d392d;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;box-shadow:'+(here?'0 0 0 3px rgba(233,166,58,.20)':'none');
    const body='<span style="font-size:24px;line-height:1">'+(open?meta.icon:'❓')+'</span><b style="font-size:12px;line-height:1.15">'+(open?cell.name.replace('씨앗마을 · ',''):'미발견 지역')+'</b>'+(here?'<small style="font-weight:900;color:#b76f19">현재 위치</small>':'');
    cards.push(meta.travel&&open?'<button data-world-travel="'+meta.travel+'" style="'+base+';cursor:pointer">'+body+'</button>':'<div style="'+base+'">'+body+'</div>');
  }
  openPanel('<h2>🗺️ 씨앗 월드 지도</h2><p>월드의 실제 위치 관계를 그대로 보여줘요. 발견한 지역을 누르면 씨앗버스로 이동합니다.</p>'+
    '<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;max-width:660px;margin:10px auto">'+cards.join('')+'</div>'+
    '<p style="font-size:12px;text-align:center">위쪽은 마을 북쪽 · 아래쪽은 해변/강가 방향</p>');
}
function nextHomesteadGoal(){
  const p=prog(),d=devState(),h=p.homestead,i=inv();
  if((i.water||0)<=0&&d.waterLevel===0)return {icon:'💧',title:'강물 한 통 떠오기',text:'북쪽 강가에서 물을 떠와 첫 밭과 요리에 써보세요.'};
  if(!h.campfireBuilt)return {icon:'🔥',title:'집 앞 캠프파이어 만들기',text:'농장 3×3 제작대에서 돌과 목재를 직접 배치해 캠프파이어를 만드세요.'};
  if(!Object.values(p.crops||{}).some(v=>v&&v.phase&&v.phase!=='empty'))return {icon:'🥕',title:'첫 작물 키우기',text:'밭 1칸에 씨앗을 심고 가져온 물을 주세요.'};
  if(d.waterLevel<1)return {icon:'🪣',title:'우물 만들기',text:'강까지 왕복하지 않도록 집 앞 우물을 건설하세요.'};
  if(d.carpenterLevel<1)return {icon:'🪚',title:'목수공방 세우기',text:'생활 가구를 직접 만들 수 있는 목수공방을 열어보세요.'};
  if((p.housing.owned.bedSingle||0)<=0&&!hasPlacedFurniture('bedSingle'))return {icon:'🛏️',title:'나무 침대 만들기',text:'목수공방에서 첫 침대를 만들어 보세요.'};
  if(!hasPlacedFurniture('bedSingle'))return {icon:'🛏️',title:'침대를 집에 배치하기',text:'임시 수납상자에서 가구 창고를 열고 만든 침대를 실제 방에 놓으세요.'};
  if(d.houseLevel<2)return {icon:'🏠',title:'집을 두 칸으로 확장하기',text:'목재와 못을 모아 잠긴 옆방을 열어보세요.'};
  if(d.orchardLevel<1)return {icon:'🍎',title:'첫 과수원 만들기',text:'과수원 터를 열어 매일 다시 열리는 사과나무를 심으세요.'};
  if(d.ranchLevel<1)return {icon:'🐄',title:'작은 목장 만들기',text:'울타리를 세워 첫 목장 동물을 데려올 자리를 만드세요.'};
  if(d.fishingLevel<1)return {icon:'🎣',title:'집 연못 만들기',text:'집 근처에서도 낚시할 수 있도록 작은 연못을 조성하세요.'};
  if(d.waterLevel<2)return {icon:'🚰',title:'수동 펌프 설치하기',text:'우물물을 더 빠르게 채우는 수동 펌프로 발전하세요.'};
  if(d.houseLevel<3)return {icon:'🏡',title:'큰 집 만들기',text:'거실과 주방을 꾸밀 수 있도록 집을 마지막 단계로 넓히세요.'};
  if(d.waterLevel<3)return {icon:'🚿',title:'집까지 수도 연결하기',text:'구리·전선·유리를 준비해 수도를 집까지 끌어오세요.'};
  if(!p.housing.placed.some(v=>v.key==='kitchenSink'))return {icon:'🚰',title:'싱크대·수도꼭지 놓기',text:'목수공방에서 싱크대를 만들어 집에 배치하면 물 운반에서 해방돼요.'};
  if(d.techLevel<2)return {icon:'💾',title:'반도체 시대 열기',text:'광산을 발전시키고 기술 공방 2단계에서 반도체를 만들어보세요.'};
  if((p.housing.owned.television||0)<=0&&!hasPlacedFurniture('television'))return {icon:'📺',title:'내 손으로 TV 만들기',text:'반도체·금·철·목재를 조합해 모던 TV를 완성하세요.'};
  if(!hasPlacedFurniture('television'))return {icon:'📺',title:'TV를 거실에 놓기',text:'완성한 TV를 가구 창고에서 꺼내 넓어진 집에 직접 배치하세요.'};
  return {icon:'⭐',title:'내 방식대로 마을 키우기',text:'과수원·목장·농장·광산을 원하는 순서로 5성 마을까지 발전시켜 보세요.'};
}

function homeHubPanel(){
  const s=Meta?.summary?.()||{pendingMail:0,trophies:0,dailyDone:0,dailyTotal:3},goal=nextHomesteadGoal();
  openPanel('<h2>🌱 씨앗 생활 보드 · '+ '⭐'.repeat(villageStars())+'</h2><div class="item" style="margin-bottom:10px"><b>'+goal.icon+' 다음 개척 목표 · '+goal.title+'</b><div>'+goal.text+'</div></div><p>오늘 할 일과 Kidscade에서 가져온 보상을 여기서 한 번에 확인해요.</p>'+
    '<div class="grid">'+
    '<div class="item"><b>📬 게임 택배</b><div>도착 '+s.pendingMail+'개</div><button data-world-hub="mail">열기</button></div>'+
    '<div class="item"><b>📋 오늘 할 일</b><div>'+s.dailyDone+'/'+s.dailyTotal+' 완료</div><button data-world-hub="daily">보기</button></div>'+
    '<div class="item"><b>🏆 게임 트로피</b><div>'+s.trophies+'종 수집</div><button data-world-hub="trophy">보기</button></div>'+
    '<div class="item"><b>✨ 꾸미기 상점</b><div>게임에서 번 씨앗 사용</div><button data-world-hub="shop">보기</button></div>'+
    '<div class="item"><b>🏗️ 마을 성장</b><div>현재 '+ '⭐'.repeat(villageStars())+'</div><button data-world-hub="develop">투자하기</button></div>'+
    '<div class="item"><b>📖 자연도감</b><div>'+(museumRuntime?.summary?.().discovered||0)+'종 발견</div><button data-world-hub="catalog">보기</button></div>'+
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
  openPanel('<h2>🎒 내 가방 · '+carriedSlotCount()+'/'+backpackCapacity()+'칸</h2>'+
    '<p>같은 물건은 한 칸에 모여요. 가방이 가득 차면 집의 수납함에 내려놓아야 해요.</p>'+
    '<h3>재료</h3><div class="grid">'+(items.length?items.map(([k,v])=>'<div class="item"><b>'+itemName(k)+'</b><div>'+v+'개</div></div>').join(''):'<div class="item">가방이 비어 있어요.</div>')+'</div>'+
    '<h3>조리 음식</h3><div class="grid">'+(food.length?food.map(([k,v])=>'<div class="item"><b>'+FOOD_DEF[k].name+'</b><div>'+v+'개 · 허기 +'+FOOD_DEF[k].hunger+'</div><button data-eat="'+k+'">먹기</button></div>').join(''):'<div class="item">아직 만든 음식이 없어요.</div>')+'</div>'+
    '<p style="font-size:12px">집 수납은 집 안의 임시 상자·서랍장에서 관리할 수 있어요.</p>');
}
function workbenchPanel(){craftGridPanel();}
function cookingPanel(kind='stove'){
  panel.dataset.cookKind=kind;
  const i=inv(),allowed=kind==='campfire'?['grilledFish','bakedPotato']:Object.keys(RECIPES);
  const cards=allowed.map(key=>{
    const r=RECIPES[key],have=recipeHasIngredients(r,kind);
    const req=Object.entries(r.req).map(([k,v])=>itemName(k)+' '+v).join(' · ');
    return `<div class="item"><b>${r.name}</b><div>${req}</div><button data-cook="${key}" ${have?'':'disabled'}>요리</button></div>`;
  }).join('');
  openPanel(`<h2>${kind==='campfire'?'야영지 모닥불':'우리 집 주방'}</h2><div class="grid">${cards}</div><p style="font-size:12px">음식은 허기를 채우고 체력도 조금 회복시켜요.</p>`);
}
function cookFood(key){
  const r=RECIPES[key];if(!r)return;
  const kind=panel.dataset.cookKind||'stove';
  if(!recipeHasIngredients(r,kind)){toast('요리 재료나 물이 부족해요.');return;}
  const consumed=consumeRecipeIngredients(r,kind);
  if(!addFoodItem(key,1,{silent:true})){
    restoreRecipeIngredients(consumed);
    toast('🎒 완성된 음식을 넣을 가방 칸이 없어요. 재료는 그대로 돌려놓았어요.');
    return;
  }
  for(const [item,qty] of Object.entries(consumed))museumRuntime?.consumeItem?.(item,qty);
  persist();setAvatarAction('smile',750);worldAudio.sfx('success',.09);toast(r.name+' 완성!');updateStatus();
}
function eatFood(key){
  const p=prog(),f=FOOD_DEF[key];if(!f||(p.food[key]||0)<=0)return;
  p.food[key]--;const foodMul=companionId()==='pig'?1.15:1;
  p.survival.hunger=Math.min(p.survival.maxHunger,p.survival.hunger+f.hunger*foodMul);
  p.energy=Math.min(p.maxEnergy,p.energy+f.energy);persist();setAvatarAction('smile',700);toast(f.name+'을(를) 먹었어요.');updateStatus();inventoryPanel();
}

panel.addEventListener('click',e=>{
  const radialResident=e.target.closest('[data-radial-resident]');
  if(radialResident){townEconomy?.resident?.(radialResident.dataset.radialResident);return;}
  const radialLife=e.target.closest('[data-radial-life]');
  if(radialLife){
    const action=radialLife.dataset.radialLife;
    if(action==='hub')homeHubPanel();
    else if(action==='develop')developmentPanel();
    else if(action==='furniture'){
      if(mode!=='indoor'){toast('집 안에서 가구 창고를 열 수 있어요.');return;}
      closePanel();furnishingSystem?.openCatalog?.();
    }
    return;
  }
  if(e.target.closest('[data-radial-help]')){helpPanel();return;}
  if(e.target.closest('[data-radial-audio]')){worldAudio.toggle();syncAudioButton();radialSettingsPanel();return;}
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
  if(hub){({mail:mailboxPanel,daily:dailyLifePanel,trophy:trophyPanel,shop:cosmeticShopPanel,develop:developmentPanel,catalog:()=>museumRuntime?.catalogPanel?.(),map:worldMapPanel}[hub.dataset.worldHub]||homeHubPanel)();return;}
  if(e.target.closest('[data-museum-open-donate]')){museumRuntime?.donationPanel?.();return;}
  const museumDonate=e.target.closest('[data-museum-donate]');
  if(museumDonate){museumRuntime?.donate?.(museumDonate.dataset.museumDonate);venueInteriors?.syncMuseumDisplays?.();return;}
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
  const storeIn=e.target.closest('[data-store-in]');if(storeIn){transferToHomeStorage(storeIn.dataset.storeIn);return;}
  const storeOut=e.target.closest('[data-store-out]');if(storeOut){transferFromHomeStorage(storeOut.dataset.storeOut);return;}
  const foodIn=e.target.closest('[data-food-store-in]');if(foodIn){moveFoodToFridge(foodIn.dataset.foodStoreIn);return;}
  const foodOut=e.target.closest('[data-food-store-out]');if(foodOut){moveFoodFromFridge(foodOut.dataset.foodStoreOut);return;}
  if(e.target.closest('[data-open-furniture]')){furnishingSystem?.openCatalog?.();return;}
  const carpenterCraft=e.target.closest('[data-carpenter-craft]');if(carpenterCraft){craftCarpenterFurniture(carpenterCraft.dataset.carpenterCraft);return;}
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
  if(dailyLife?.handlePanelClick?.(e.target))return;
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
const PLAYER_GROUND_CLEARANCE=.014;
function applyAvatarMotion(now,moving,groundSurfaceY=0){
  const action=currentAvatarMode(now,moving);
  let bob=0,sx=1,sy=1,shadowScale=1,shadowOpacity=.22;
  if(moving){
    const phase=now/112;
    const step=Math.abs(Math.sin(phase*Math.PI));
    bob=step*.115;sx=1+(1-step)*.018;sy=1-step*.035;shadowScale=1-step*.16;shadowOpacity=.22-step*.05;
  }else if(action==='smile'){
    const p=(now/180)%1;bob=(Math.sin(p*Math.PI*2)*.5+.5)*.035;sy=1.012;
  }else{
    const breathe=Math.sin(now/520)*.5+.5;
    bob=breathe*.018;sx=1+breathe*.006;sy=1-breathe*.004;shadowScale=1-breathe*.025;
  }
  avatar.scale.set(1.55*sx,1.94*sy,1);
  // Sprite position is its custom center (.5,.08), not its feet. Derive the
  // center from the visible floor so the bottom pixel can never go underground.
  avatar.position.y=groundSurfaceY+avatar.scale.y*avatar.center.y+PLAYER_GROUND_CLEARANCE+bob;
  shadow.scale.set(shadowScale,shadowScale,shadowScale);
  shadow.material.opacity=shadowOpacity;
}

const keys=new Set();
const MOVE_KEYS=new Set(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d']);
let inputNeedsRelease=false;
let radialTabTimer=0,mobileInteractTimer=0,mobileInteractLong=false;
function resetInput(requireRelease=false){
  keys.clear();
  if(requireRelease)inputNeedsRelease=true;
}
const lastMove={x:0,z:1};
addEventListener('keydown',e=>{
  const key=e.key.toLowerCase();
  if(radialMenu?.classList.contains('open')){
    if(e.key==='Escape'||key==='q'){e.preventDefault();closeRadialMenu();return;}
    if(MOVE_KEYS.has(key)||e.key===' '||e.key==='e'||e.key==='E'){e.preventDefault();return;}
  }
  if(!panel.classList.contains('open')&&!furnishingSystem?.isPlacing?.()&&key==='q'){
    e.preventDefault();toggleRadialMenu();return;
  }
  if(!panel.classList.contains('open')&&!furnishingSystem?.isPlacing?.()&&e.key==='Tab'){
    e.preventDefault();
    if(!e.repeat&&!radialTabTimer)radialTabTimer=setTimeout(()=>{radialTabTimer=0;openRadialMenu();},280);
    return;
  }
  if(MOVE_KEYS.has(key)){
    e.preventDefault();
    if(inputNeedsRelease)return;
    keys.add(key);
  }
  if((e.key==='r'||e.key==='R')&&furnishingSystem?.isPlacing?.()){e.preventDefault();furnishingSystem.rotate();return;}
  if(!panel.classList.contains('open')&&!radialMenu?.classList.contains('open')&&['1','2','3','4','5'].includes(e.key)){
    e.preventDefault();activateQuickSlot(({1:'hand',2:'axe',3:'pick',4:'bag',5:'pet'})[e.key]);return;
  }
  if((e.key==='e'||e.key==='E'||e.key===' ')&&!panel.classList.contains('open')&&!radialMenu?.classList.contains('open')){e.preventDefault();doInteract()}
  if(e.key==='Escape'){
    if(furnishingSystem?.isPlacing?.()){e.preventDefault();furnishingSystem.cancel();}
    else if(panel.classList.contains('open'))closePanel();
    else window.parent?.postMessage({type:'kidscade-life-world-close'},location.origin);
  }
});
addEventListener('keyup',e=>{
  if(e.key==='Tab'&&radialTabTimer){e.preventDefault();clearTimeout(radialTabTimer);radialTabTimer=0;}
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
if(mobileInteractBtn){
  mobileInteractBtn.addEventListener('pointerdown',e=>{
    e.preventDefault();mobileInteractLong=false;clearTimeout(mobileInteractTimer);
    try{mobileInteractBtn.setPointerCapture?.(e.pointerId)}catch(_){}
    mobileInteractTimer=setTimeout(()=>{mobileInteractTimer=0;mobileInteractLong=true;openRadialMenu();},380);
  });
  mobileInteractBtn.addEventListener('pointerup',e=>{
    e.preventDefault();clearTimeout(mobileInteractTimer);mobileInteractTimer=0;
    try{mobileInteractBtn.releasePointerCapture?.(e.pointerId)}catch(_){}
    if(!mobileInteractLong&&!radialMenu?.classList.contains('open'))doInteract();
    mobileInteractLong=false;
  });
  mobileInteractBtn.addEventListener('pointercancel',()=>{clearTimeout(mobileInteractTimer);mobileInteractTimer=0;mobileInteractLong=false;});
}

const LAYOUT_VERSION=8;
let homePondGroup=null,homePondInteraction=null,homeWellGroup=null,homeWellInteraction=null,homePumpGroup=null,homePumpInteraction=null;
let homeCampfireObject=null,homeCampfireLight=null,homeCampfireInteraction=null,homeHouseObject=null,homeHouseBaseScale=null,homeHouseCollider=null;
let carpenterBuildingObject=null,carpenterInteraction=null,carpenterFoundation=null,carpenterCollider=null;
let starterBeddingGroup=null,starterBeddingInteraction=null;
let homeInteriorRuntime=null;
const orchardActors=[],ranchVisualActors=[];
let mode='outdoor';
let activeVenue='',venueReturn=null;
const VENUE_MODE_SET=new Set(Object.values(VENUE_MODES));
const VENUE_RETURN_POINTS={
  market:{x:-16.7,z:21.45},
  hardware:{x:-7.3,z:21.45},
  cafe:{x:7.3,z:21.45},
  museum:{x:-36,z:47.1},
  school:{x:-7.3,z:45.45}
};
function venueKindFromMode(value=mode){return Object.keys(VENUE_MODES).find(key=>VENUE_MODES[key]===value)||''}
const savedLayout=Number(save.player?.v3Layout||0);
const player={
  x:savedLayout===LAYOUT_VERSION&&Number.isFinite(Number(save.player?.v3x))?Number(save.player.v3x):-12,
  z:savedLayout===LAYOUT_VERSION&&Number.isFinite(Number(save.player?.v3z))?Number(save.player.v3z):2.0,
  speed:5.1
};
const TRAVEL_POINTS={
  home:{x:-12,z:2.0,name:'집 구역'},
  farm:{x:12,z:2.0,name:'농장'},
  forest:{x:-30,z:0,name:'깊은 숲'},
  quarry:{x:30,z:0,name:'광산'},
  camp:{x:-36,z:18.0,name:'야영지'},
  city:{x:-12,z:18.0,name:'씨앗마을 상점가'},
  plaza:{x:12,z:29.0,name:'씨앗마을 광장'},
  civic:{x:-12,z:40.0,name:'학교·도서관 거리'},
  transit:{x:12,z:40.0,name:'교통·보건 거리'},
  residential:{x:27.4,z:24.0,name:'햇살 주택가'},
  residentialNorth:{x:27.4,z:48.0,name:'별빛 주택가'},
  river:{x:-12,z:-18.0,name:'북쪽 강가'},
  ranch:{x:12,z:-18.0,name:'목장'},
  orchard:{x:36,z:-18.0,name:'과수원'},
  beach:{x:-36,z:-18.0,name:'해변가'},
  museum:{x:-36,z:52.0,name:'씨앗 자연박물관'},
  school:{x:-7.3,z:46.0,name:'씨앗학교'}
};
function outdoorGroundSurfaceYAt(x,z){
  let y=0;
  // Base world roads are 8 cm boxes starting at y=-.02, so their top is .06.
  if(ROAD_X.some(v=>Math.abs(x-v)<=2)||ROAD_Z.some(v=>Math.abs(z-v)<=2))y=.06;
  const cityY=Number(cityRuntime?.groundSurfaceYAt?.(x,z));
  if(Number.isFinite(cityY))y=Math.max(y,cityY);
  return y;
}
function currentGroundSurfaceYAt(x=player.x,z=player.z){
  if(mode==='outdoor')return outdoorGroundSurfaceYAt(x,z);
  if(mode==='indoor')return -.01; // home floor: 18 cm box centered at y=-.10
  if(VENUE_MODE_SET.has(mode))return .06; // venue floor top
  return 0;
}

function travelTo(id){
  const d=TRAVEL_POINTS[id];if(!d)return;
  if(mode!=='outdoor'){
    mode='outdoor';activeVenue='';outdoor.visible=true;indoor.visible=false;venueLayer.visible=false;venueInteriors?.hideAll?.();
  }
  resetInput(true);player.x=d.x;player.z=d.z;near=null;panel.classList.remove('open');setAvatarAction('smile',450);
  toast('씨앗버스 도착 · '+d.name);
}
const HOUSE_BOUNDS=[
  null,
  HOME_INTERIOR_LEVELS[1].bounds,
  HOME_INTERIOR_LEVELS[2].bounds,
  HOME_INTERIOR_LEVELS[3].bounds
];
function currentHouseBounds(){return HOUSE_BOUNDS[devState().houseLevel]||HOUSE_BOUNDS[1]}
function collectWater(source){
  const level=devState().waterLevel;
  if(source==='well'&&level<1){toast('먼저 우물을 만들어야 해요.');return}
  if(source==='pump'&&level<2){toast('수동 펌프를 먼저 설치해야 해요.');return}
  const amount=source==='river'?3:source==='well'?5:8,added=addWater(amount);
  if(!added){toast('💧 물통이 이미 가득 찼어요. · '+(inv().water||0)+'/'+waterCarryLimit());return}
  persist();updateStatus();worldAudio.sfx('pickup',.12);
  toast('💧 '+(source==='river'?'강물':source==='well'?'우물물':'펌프 물')+' +'+added+' · '+(inv().water||0)+'/'+waterCarryLimit());
}
function sleepOnFloor(){
  const p=prog(),s=p.survival;
  p.energy=Math.max(p.energy,Math.round((p.maxEnergy||100)*.72));
  s.hunger=Math.max(0,s.hunger-12);s.day+=1;s.time=420;
  persist();updateStatus();toast('바닥 이불에서 잤어요. 몸이 조금 뻐근하지만 아침이 됐어요.');
}
function updateHomesteadVisuals(){
  const d=devState(),h=prog().homestead;
  if(homePondGroup)homePondGroup.visible=d.fishingLevel>=1;
  if(homePondInteraction)homePondInteraction.enabled=d.fishingLevel>=1;
  if(homeWellGroup)homeWellGroup.visible=d.waterLevel>=1;
  if(homeWellInteraction)homeWellInteraction.enabled=d.waterLevel>=1;
  if(homePumpGroup)homePumpGroup.visible=d.waterLevel>=2;
  if(homePumpInteraction)homePumpInteraction.enabled=d.waterLevel>=2;
  if(homeCampfireObject)homeCampfireObject.visible=!!h.campfireBuilt;
  if(homeCampfireLight)homeCampfireLight.visible=!!h.campfireBuilt;
  if(homeCampfireInteraction)homeCampfireInteraction.enabled=!!h.campfireBuilt;
  const realBed=hasPlacedFurniture('bedSingle');
  if(starterBeddingGroup)starterBeddingGroup.visible=!realBed;
  if(starterBeddingInteraction)starterBeddingInteraction.enabled=!realBed;
  homeInteriorRuntime?.setLevel?.(d.houseLevel);
  if(homeHouseObject&&homeHouseBaseScale){
    const mul=d.houseLevel===1?.78:d.houseLevel===2?.90:1;
    homeHouseObject.scale.copy(homeHouseBaseScale).multiplyScalar(mul);
  }
  if(homeHouseCollider){
    const size=d.houseLevel===1?4.3:d.houseLevel===2?5.1:5.8;
    homeHouseCollider.w=size;homeHouseCollider.d=d.houseLevel===1?3.45:d.houseLevel===2?3.9:4.4;
  }
  const carpenterOpen=d.carpenterLevel>=1;
  if(carpenterBuildingObject)carpenterBuildingObject.visible=carpenterOpen;
  if(carpenterInteraction)carpenterInteraction.enabled=carpenterOpen;
  if(carpenterCollider)carpenterCollider.enabled=carpenterOpen;
  if(carpenterFoundation)carpenterFoundation.visible=!carpenterOpen;
}
function claimStarterKit(){
  const p=prog();
  if(p.starterKitClaimed){toast('초보자 보급 상자는 이미 받았어요. 주변 나뭇가지와 작은 돌도 맨손으로 주울 수 있어요.');return;}
  if(!canCarryBundle({wood:5,stone:5})){toast('🎒 초보자 보급품을 받을 가방 칸이 부족해요. 집 수납함에 물건을 내려놓고 다시 열어보세요.');return;}
  addInventoryItem('wood',5,{silent:true});addInventoryItem('stone',5,{silent:true});p.starterKitClaimed=true;
  persist();setAvatarAction('smile',700);updateStatus();
  toast('초보자 보급: 목재 +5 · 돌 +5! 이제 돌도끼와 돌곡괭이를 만들 수 있어요.');
}
function showStarterHintOnce(){
  const p=prog();if(p.starterHintSeen)return;
  p.starterHintSeen=true;persist();
  const goal=nextHomesteadGoal();
  setTimeout(()=>toast('첫 개척 목표 · '+goal.icon+' '+goal.title),650);
}
function isBlocked(nx,nz){
  const bounds=mode==='outdoor'?WORLD_BOUNDS:mode==='indoor'?currentHouseBounds():VENUE_BOUNDS;
  if(nx<bounds.x1+.25||nx>bounds.x2-.25||nz<bounds.z1+.25||nz>bounds.z2-.25)return true;
  if(mode==='outdoor'&&!zoneAt(nx,nz)&&!isTravelCorridor(nx,nz))return true;
  return (colliders[mode]||[]).some(c=>c.enabled!==false&&nx>c.x-c.w/2-.32&&nx<c.x+c.w/2+.32&&nz>c.z-c.d/2-.24&&nz<c.z+c.d/2+.24);
}
let near=null;
function nearestInteraction(){
  const list=interactables[mode]||[];let best=null,bestD=999;
  for(const q of list){if(q.enabled===false)continue;const d=Math.hypot(player.x-q.x,player.z-q.z);if(d<q.r&&d<bestD){best=q;bestD=d}}
  near=best;
  promptEl.textContent=best?((matchMedia('(max-width:760px)').matches?'행동':'E / Space')+' · '+best.label):'';
  const radialOpen=!!radialMenu?.classList.contains('open');
  promptEl.classList.toggle('show',!!best&&!radialOpen);
  if(radialOpen)syncRadialContext();
}
function doInteract(){if(furnishingSystem?.isPlacing?.()){furnishingSystem.confirm();return;}if(near)near.action()}

const RADIAL_ACTIONS={
  bag:inventoryPanel,
  map:worldMapPanel,
  tasks:dailyLifePanel,
  people:residentsPanel,
  pets:petPanel,
  life:radialLifePanel,
  catalog:()=>museumRuntime?.catalogPanel?.(),
  settings:radialSettingsPanel
};
function radialContextState(){
  if(furnishingSystem?.isPlacing?.())return {enabled:true,icon:'✓',label:'가구 놓기',action:()=>furnishingSystem.confirm()};
  if(near)return {enabled:true,icon:'✨',label:near.label||'행동',action:()=>near.action()};
  return {enabled:false,icon:'✨',label:'가까이 가서 행동',action:null};
}
function syncRadialContext(){
  if(!radialContext)return;
  const state=radialContextState();
  radialContext.disabled=!state.enabled;
  if(radialContextIcon)radialContextIcon.textContent=state.icon;
  if(radialContextLabel)radialContextLabel.textContent=state.label;
  radialContext.dataset.contextEnabled=state.enabled?'1':'0';
}
function openRadialMenu(){
  if(!radialMenu||panel.classList.contains('open'))return;
  keys.clear();petPicker?.classList.remove('open');promptEl.classList.remove('show');
  syncRadialContext();radialMenu.classList.add('open');radialMenu.setAttribute('aria-hidden','false');
  requestAnimationFrame(()=>radialContext?.focus?.({preventScroll:true}));
}
function closeRadialMenu(focus=true){
  if(radialTabTimer){clearTimeout(radialTabTimer);radialTabTimer=0;}
  if(!radialMenu)return;
  radialMenu.classList.remove('open');radialMenu.setAttribute('aria-hidden','true');
  if(focus)canvas.focus();
}
function toggleRadialMenu(){radialMenu?.classList.contains('open')?closeRadialMenu():openRadialMenu()}
radialMenu?.addEventListener('click',e=>{
  if(e.target===radialMenu){closeRadialMenu();return;}
  const item=e.target.closest?.('[data-radial-action]');
  if(item){
    const action=RADIAL_ACTIONS[item.dataset.radialAction];closeRadialMenu(false);if(action)action();return;
  }
  if(e.target.closest?.('[data-radial-context]')){
    const state=radialContextState();if(!state.enabled||!state.action)return;
    closeRadialMenu(false);state.action();
  }
});
let lastMetaZone='';
function updateZone(){
  if(mode==='indoor'){zoneEl.textContent='우리 집 · 안전 지역 · 🗺️';if(lastMetaZone!=='indoor'){lastMetaZone='indoor';Meta?.recordExplore?.('indoor');}return;}
  if(VENUE_MODE_SET.has(mode)){
    const kind=venueKindFromMode(mode),info=VENUE_INFO[kind];zoneEl.textContent=(info?.name||'씨앗마을 실내')+' · 실내';
    const metaKey='venue-'+kind;if(lastMetaZone!==metaKey){lastMetaZone=metaKey;Meta?.recordExplore?.(metaKey)}return;
  }
  const cell=zoneAt(player.x,player.z),zoneId=cell?.id||cell?.key||cell?.name||'road';
  zoneEl.textContent=(cell?(cell.name+' · '+cell.hint):'구역 사이 길')+' · 🗺️';
  if(zoneId!==lastMetaZone){lastMetaZone=zoneId;Meta?.recordExplore?.(zoneId);}
}
zoneEl?.addEventListener('click',worldMapPanel);
worldMailChip?.addEventListener('click',mailboxPanel);
worldTaskChip?.addEventListener('click',dailyLifePanel);
function setMode(next){
  resetInput(true);activeVenue='';venueReturn=null;mode=next;
  outdoor.visible=next==='outdoor';indoor.visible=next==='indoor';venueLayer.visible=false;venueInteriors?.hideAll?.();
  if(next==='indoor'){player.x=0;player.z=3.55;zoneEl.textContent='우리 집 · 3D 실내';toast('집 안으로 들어왔어요.')}
  else{player.x=-12;player.z=-1.8;zoneEl.textContent='집 구역 · 집·연못·펫 마당';toast('집 밖으로 나왔어요.')}
  setAvatarAction('smile',520);near=null;
}
function venueIsOpen(kind){
  const hours=townEconomy?.HOURS?.[kind];if(!hours)return true;
  const hour=((prog().survival.time%1440)+1440)%1440/60;return hour>=hours.open&&hour<hours.close;
}
function enterVenue(kind){
  const targetMode=VENUE_MODES[kind],info=VENUE_INFO[kind];if(!targetMode||!info||!venueInteriors)return;
  if(!venueIsOpen(kind)){townEconomy?.shop?.(kind,info.npc);return;}
  resetInput(true);panel.classList.remove('open');venueReturn={x:player.x,z:player.z+.55};activeVenue=kind;mode=targetMode;
  outdoor.visible=false;indoor.visible=false;venueLayer.visible=true;void venueInteriors.show(kind);
  player.x=0;player.z=3.05;near=null;zoneEl.textContent=info.name+' · 실내';setAvatarAction('smile',520);toast(info.name+' 안으로 들어왔어요.');
}
function exitVenue(){
  if(!VENUE_MODE_SET.has(mode))return;
  const kind=activeVenue||venueKindFromMode(mode),fallback=VENUE_RETURN_POINTS[kind]||{x:-12,z:18},dest=venueReturn||fallback;
  resetInput(true);panel.classList.remove('open');mode='outdoor';activeVenue='';venueReturn=null;
  outdoor.visible=true;indoor.visible=false;venueLayer.visible=false;venueInteriors?.hideAll?.();
  player.x=dest.x;player.z=dest.z;near=null;setAvatarAction('smile',520);toast('씨앗마을 거리로 나왔어요.');
}
function spendTool(kind,item){
  const p=prog(),t=p.tools[item];
  if(!t||t.dur<=0){toast((item==='axe'?'도끼':'곡괭이')+'가 필요해요. 제작대에서 만들어 보세요.');return false}
  if(!requireEquippedTool(item))return false;
  if(p.energy<=4){toast('체력이 부족해요. 집 침대에서 쉬어 보세요.');return false}
  const iron=t.tier==='iron',petBonus=kind==='wood'&&companionId()==='beaver'?1:0,gain=(iron?2:1)+petBonus,cost=kind==='wood'?(iron?2.6:4):(iron?3.2:5);
  if(!addInventoryItem(kind,gain))return false;
  t.dur--;p.energy=Math.max(0,p.energy-cost);const extras=[];
  if(kind==='stone'){
    const level=devState().stoneMineLevel;
    if(level>=2&&Math.random()<(level>=3?.38:.22)&&addInventoryItem('quartz',1,{silent:true}))extras.push('석영 +1');
    if(level>=3&&Math.random()<.06&&addInventoryItem('gold',1,{silent:true}))extras.push('금 +1');
  }
  persist();updateStatus();worldAudio.sfx('impact',.12);
  toast((kind==='wood'?'목재':'돌')+' +'+gain+(extras.length?' · '+extras.join(' · '):''));return true;
}
function canPlaceFurniture(x,z,w,d,ignore=null){
  const b=currentHouseBounds(),pad=.08;
  if(w<=0||d<=0)return x>b.x1+pad&&x<b.x2-pad&&z>b.z1+pad&&z<b.z2-pad;
  if(x-w/2<b.x1+pad||x+w/2>b.x2-pad||z-d/2<b.z1+pad||z+d/2>b.z2-pad)return false;
  if(z+d/2>Math.min(3.05,b.z2-.35)&&Math.abs(x)<1.45)return false;
  return !colliders.indoor.some(c=>c!==ignore&&c.enabled!==false&&Math.abs(x-c.x)<(w+c.w)/2+.12&&Math.abs(z-c.z)<(d+c.d)/2+.12);
}
function sleep(){
  const p=prog(),s=p.survival;
  p.energy=p.maxEnergy||100;
  s.hunger=Math.max(0,s.hunger-10);
  s.day+=1;s.time=420;
  persist();updateStatus();toast('아침까지 푹 쉬었어요. 체력이 회복됐어요.');
}
function restAtCamp(){
  const p=prog(),s=p.survival;
  if(s.hunger<4){toast('배가 너무 고파서 더 쉬어도 힘이 나지 않아요. 먼저 음식을 먹어보세요.');return false;}
  p.energy=Math.min(p.maxEnergy,p.energy+18);s.hunger=Math.max(0,s.hunger-4);
  const next=s.time+30;if(next>=1440)s.day+=1;s.time=next%1440;
  persist();setAvatarAction('smile',750);toast('모닥불 곁에서 30분 쉬었어요. 체력 +18 · 허기 -4');updateStatus();return true;
}
let fishingBusy=false;
function fish(place='pond'){
  const p=prog(),d=devState(),required=place==='beach'?3:place==='river'?2:1;
  if(fishingBusy){toast('🎣 이미 낚싯줄을 드리우고 있어요.');return}
  if(d.fishingLevel<required){toast('🎣 낚시터 '+required+'단계에서 이용할 수 있어요. 마을 성장 보드에서 확장해 보세요.');return}
  if(!canCarryNewKey('fish')){toast('🎒 물고기를 넣을 가방 칸이 없어요.');return}
  if(p.energy<3){toast('체력이 부족해요.');return}
  fishingBusy=true;p.energy=Math.max(0,p.energy-3);persist();updateStatus();
  toast(place==='beach'?'바닷가 낚시 중…':place==='river'?'강가 낚시 중…':'연못 낚시 중…');
  setTimeout(()=>{
    try{
      const bonus=companionId()==='parrot'&&Math.random()<.32?1:0,gain=1+bonus,extras=[];
      const added=addInventoryItem('fish',gain,{silent:true});
      if(!added){toast('🎒 낚는 사이 가방이 가득 찼어요. 물고기를 담지 못했어요.');return;}
      p.fishDex=p.fishDex||{};
      const label=place==='beach'?'해변 물고기':place==='river'?'강가 물고기':'연못 물고기';
      p.fishDex[label]=(p.fishDex[label]||0)+gain;
      const sizeBase=place==='beach'?24:place==='river'?16:9,sizeSpread=place==='beach'?54:place==='river'?36:22;
      const catchSize=Math.round((sizeBase+Math.random()*sizeSpread)*10)/10;
      museumRuntime?.recordSpecimen?.('fish:'+place,gain,{day:p.survival.day,location:place==='beach'?'해변가':place==='river'?'북쪽 강가':'집 연못',size:catchSize});
      if(place==='river'&&Math.random()<.24&&addInventoryItem('rareFish',1,{silent:true}))extras.push('희귀 물고기 +1');
      if(place==='beach'){
        if(Math.random()<.32&&addInventoryItem('rareFish',1,{silent:true}))extras.push('희귀 물고기 +1');
        if(Math.random()<.16&&addInventoryItem('pearl',1,{silent:true}))extras.push('진주 +1');
      }
      persist();setAvatarAction('smile',900);updateStatus();worldAudio.sfx('pickup',.18);
      toast('물고기 +'+gain+(extras.length?' · '+extras.join(' · '):''));
    }finally{fishingBusy=false}
  },850);
}
function mineIron(){
  const p=prog(),t=p.tools.pick;
  if(!t||t.dur<=0){toast('곡괭이가 필요해요.');return false;}
  if(!requireEquippedTool('pick'))return false;
  if(!canCarryNewKey('iron')){toast('🎒 철광석을 넣을 가방 칸이 없어요.');return false;}
  if(p.energy<=6){toast('체력이 부족해요.');return false;}
  const level=devState().ironMineLevel,gain=(t.tier==='iron'?2:1)+(level>=3?1:0),cost=t.tier==='iron'?4:6,extras=[];
  addInventoryItem('iron',gain,{silent:true});t.dur--;p.energy=Math.max(0,p.energy-cost);
  if(level>=2&&Math.random()<(level>=3?.42:.24)&&addInventoryItem('copper',1,{silent:true}))extras.push('구리 +1');
  if(level>=3&&Math.random()<.10&&addInventoryItem('gold',1,{silent:true}))extras.push('금 +1');
  persist();setAvatarAction('smile',480);updateStatus();worldAudio.sfx('impact',.14);
  toast('철광석 +'+gain+(extras.length?' · '+extras.join(' · '):''));return true;
}
const CROP_ASSET_ROOT='../assets/game/crops/FBX/';
const CROP_MODEL_FILES={
  carrot:['Carrot_1.fbx','Carrot_2.fbx','Carrot_3.fbx','Carrot_4.fbx'],
  tomato:['Tomato_1.fbx','Tomato_2.fbx','Tomato_3.fbx','Tomato_4.fbx'],
  corn:['Corn_1.fbx','Corn_2.fbx','Corn_3.fbx','Corn_4.fbx'],
  pumpkin:['Pumpkin_1.fbx','Pumpkin_2.fbx','Pumpkin_3.fbx','Pumpkin_4.fbx'],
  beet:['Beet_1.fbx','Beet_2.fbx','Beet_3.fbx','Beet_4.fbx'],
  lettuce:['Lettuce_1.fbx','Lettuce_2.fbx','Lettuce_3.fbx','Lettuce_4.fbx'],
  mushroom:['Mushroom_1.fbx','Mushroom_2.fbx','Mushroom_3.fbx','Mushroom_4.fbx'],
  rice:['Rice_1.fbx','Rice_2.fbx','Rice_3.fbx','Rice_4.fbx'],
  watermelon:['Watermelon_1.fbx','Watermelon_2.fbx','Watermelon_3.fbx','Watermelon_4.fbx'],
  wheat:['Wheat_1.fbx','Wheat_2.fbx','Wheat_3.fbx','Wheat_4.fbx'],
  bamboo:['Bamboo_1.fbx','Bamboo_2.fbx','Bamboo_3.fbx','Bamboo_4.fbx'],
  berry:['BushBerries_1.fbx','BushBerries_2.fbx','BushBerries_3.fbx','BushBerries_4.fbx']
};
const ORCHARD_MODEL_FILES={
  apple:{ripe:'Apple_Crop.fbx',harvested:'Apple_Harvested.fbx'},
  orange:{ripe:'Orange_Crop.fbx',harvested:'Orange_Harvested.fbx'}
};
const CROP_DEF={
  potato:{name:'감자',color:0xc69b5b,growMs:35000},
  carrot:{name:'당근',color:0xe67e3a,growMs:33000},
  tomato:{name:'토마토',color:0xc95142,growMs:38000},
  strawberry:{name:'딸기',color:0xe64949,growMs:36000},
  corn:{name:'옥수수',color:0xf0cb55,growMs:42000},
  pumpkin:{name:'호박',color:0xe98932,growMs:47000},
  beet:{name:'비트',color:0xb7355b,growMs:34000},
  lettuce:{name:'상추',color:0x70ad55,growMs:32000},
  mushroom:{name:'버섯',color:0xd9c6a2,growMs:30000},
  rice:{name:'벼',color:0xe4d176,growMs:44000},
  watermelon:{name:'수박',color:0x4e9857,growMs:48000},
  wheat:{name:'밀',color:0xd9b95d,growMs:41000},
  bamboo:{name:'대나무',color:0x5f9d57,growMs:46000},
  berry:{name:'베리',color:0x9d405f,growMs:39000}
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
    if(!useWater(1))return;
    state.phase='growing';state.readyAt=Date.now()+def.growMs;persist();worldAudio.sfx('pickup',.09);toast(def.name+'에 물을 줬어요. · 남은 물 '+(inv().water||0));
  }else if(state.phase==='growing'){
    const sec=Math.max(1,Math.ceil((state.readyAt-Date.now())/1000));toast(def.name+' 성장 중 · '+sec+'초');
  }else{
    const gain=(companionId()==='bunny'?3:2)+(Number(townPerks().harvestBonus)||0),seedGain=companionId()==='chick'?2:1;
    if(!addInventoryItem(state.type,gain,{museumId:'crop:'+state.type,location:'농장'}))return;
    p.seeds[state.type]=(p.seeds[state.type]||0)+seedGain;
    state.type='';state.phase='empty';state.readyAt=0;state.plantedAt=0;persist();Meta?.advanceTask?.('harvest',1);worldAudio.sfx('pickup',.20);toast(def.name+' 수확 +'+gain);updateStatus();
  }
  updateCropVisuals();
}
const cropVisual=[];
const farmPlotActors=[];
let cropAssetToken=0;
function updateFarmExpansionVisuals(){
  const unlocked=farmPlotCount();
  for(const a of farmPlotActors){const open=a.index<unlocked;a.group.visible=open;a.interaction.enabled=open;}
  updateCropVisuals();
}
function makePlant(){
  const g=new THREE.Group(),fallback=new THREE.Group();g.add(fallback);
  const stem=new THREE.Mesh(new THREE.CylinderGeometry(.045,.055,.65,8),new THREE.MeshStandardMaterial({color:0x5d9b4e}));
  stem.position.y=.33;fallback.add(stem);
  for(const sx of [-.18,.18]){const leaf=new THREE.Mesh(new THREE.SphereGeometry(.16,10,8),new THREE.MeshStandardMaterial({color:0x70ac55}));leaf.scale.set(1.3,.45,.7);leaf.position.set(sx,.48,0);fallback.add(leaf)}
  const material=new THREE.MeshStandardMaterial({color:0xffffff});
  const fruit=new THREE.Mesh(new THREE.SphereGeometry(.16,12,10),material);fruit.position.y=.70;fallback.add(fruit);
  g.userData.fallback=fallback;g.userData.fruitMaterial=material;g.userData.assetStages=[];g.userData.assetType='';g.userData.assetLoadingType='';g.userData.assetToken=0;
  return g;
}
function fitCropStages(models){
  const mature=models[models.length-1];mature.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(mature),size=box.getSize(new THREE.Vector3());
  const s=Math.min(size.x?1.35/size.x:1,size.y?1.18/size.y:1,size.z?1.35/size.z:1);
  for(const model of models){
    model.scale.multiplyScalar(Number.isFinite(s)?s:1);model.updateMatrixWorld(true);
    const b=new THREE.Box3().setFromObject(model),center=b.getCenter(new THREE.Vector3());
    model.position.x-=center.x;model.position.z-=center.z;model.position.y-=b.min.y;
    model.castShadow=true;model.visible=false;
  }
  return models;
}
async function ensureCropAsset(v,type){
  const files=CROP_MODEL_FILES[type];if(!files)return false;
  const data=v.object.userData;
  if(data.assetType===type&&data.assetStages?.length===4)return true;
  if(data.assetLoadingType===type)return false;
  const token=++cropAssetToken;data.assetToken=token;data.assetLoadingType=type;
  try{
    const bases=await Promise.all(files.map(file=>loadFBX(CROP_ASSET_ROOT+file)));
    if(data.assetToken!==token)return false;
    for(const old of data.assetStages||[])v.object.remove(old);
    const models=fitCropStages(bases.map(base=>prepModel(base.clone(true))));
    for(const model of models)v.object.add(model);
    data.assetStages=models;data.assetType=type;data.assetLoadingType='';data.fallback.visible=false;
    updateCropVisual(v);return true;
  }catch(err){
    if(data.assetToken===token){data.assetStages=[];data.assetType='';data.assetLoadingType='';data.fallback.visible=true}
    console.warn('[World v3] crop asset failed',type,err);return false;
  }
}
function cropStage(state,def){
  if(state.phase==='planted')return 1;
  if(state.phase==='ripe')return 4;
  if(state.phase!=='growing')return 0;
  const total=Math.max(1,def?.growMs||1),remain=Math.max(0,state.readyAt-Date.now()),progress=Math.max(0,Math.min(1,1-remain/total));
  return progress<.45?2:3;
}
function updateCropVisual(v){
  const state=cropState(v.id),def=CROP_DEF[state.type],data=v.object.userData;
  const hasAsset=!!(state.type&&data.assetType===state.type&&data.assetStages?.length===4);
  v.object.visible=state.phase!=='empty';
  if(state.phase==='empty'){for(const m of data.assetStages||[])m.visible=false;data.fallback.visible=false;return}
  if(def)data.fruitMaterial?.color.setHex(def.color);
  if(CROP_MODEL_FILES[state.type]&&!hasAsset)void ensureCropAsset(v,state.type);
  if(hasAsset){
    data.fallback.visible=false;
    const stage=cropStage(state,def);
    data.assetStages.forEach((m,i)=>m.visible=i===stage-1);
  }else{
    for(const m of data.assetStages||[])m.visible=false;
    data.fallback.visible=true;
    data.fallback.scale.setScalar(state.phase==='planted'?.30:state.phase==='growing'?.62:1);
  }
}
function updateCropVisuals(){cropVisual.forEach(updateCropVisual)}
setInterval(updateCropVisuals,1000);

const ORCHARD_FRUIT_SEQUENCE=['apple','pear','apple','peach','pear','orange','apple','cherry','peach'];
const ORCHARD_FRUIT_COLORS={apple:0xc83e3e,pear:0xb7c85a,peach:0xf09a7c,orange:0xf09a32,cherry:0xb51f3a};
function orchardFruitName(key){return itemName(key)}
function updateOrchardActorVisual(actor){
  if(!actor?.asset)return;
  const harvested=Number(prog().orchard.harvests[actor.id]||0)===prog().survival.day;
  actor.asset.ripe.visible=!harvested;actor.asset.harvested.visible=harvested;
}
function updateOrchardVisuals(){
  const count=orchardTreeCount();
  for(const actor of orchardActors){
    const open=actor.index<count;actor.group.visible=open;actor.interaction.enabled=open;
    updateOrchardActorVisual(actor);
  }
}
function harvestOrchardTree(actor){
  const p=prog(),day=p.survival.day,key=actor.fruit,last=Number(p.orchard.harvests[actor.id]||0);
  if(last===day){toast(orchardFruitName(key)+'나무는 오늘 이미 수확했어요.');return;}
  const gain=key==='cherry'?3:2;
  if(!addInventoryItem(key,gain))return;
  p.orchard.harvests[actor.id]=day;persist();Meta?.advanceTask?.('harvest',1);setAvatarAction('smile',650);worldAudio.sfx('pickup',.16);updateStatus();updateOrchardActorVisual(actor);
  toast('🍎 '+orchardFruitName(key)+' +'+gain+' · 내일 다시 열려요.');
}
function addFruitDots(group,color){
  const mat=new THREE.MeshStandardMaterial({color,roughness:.62});
  for(const [x,y,z] of [[-.45,2.15,.2],[.38,2.35,.12],[-.18,2.55,-.3],[.55,2.05,-.25]]){
    const fruit=new THREE.Mesh(new THREE.SphereGeometry(.12,10,8),mat);fruit.position.set(x,y,z);fruit.castShadow=true;group.add(fruit);
  }
}
function fitOrchardModel(base){
  const model=prepModel(base.clone(true));model.updateMatrixWorld(true);
  let box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3());
  const s=Math.min(size.x?2.35/size.x:1,size.y?3.9/size.y:1,size.z?2.35/size.z:1);
  model.scale.multiplyScalar(Number.isFinite(s)?s:1);model.updateMatrixWorld(true);
  box=new THREE.Box3().setFromObject(model);const center=box.getCenter(new THREE.Vector3());
  model.position.x-=center.x;model.position.z-=center.z;model.position.y-=box.min.y;
  return model;
}
async function attachOrchardAsset(actor){
  const files=ORCHARD_MODEL_FILES[actor.fruit];if(!files)return;
  try{
    const [ripeBase,harvestedBase]=await Promise.all([loadFBX(CROP_ASSET_ROOT+files.ripe),loadFBX(CROP_ASSET_ROOT+files.harvested)]);
    const ripe=fitOrchardModel(ripeBase),harvested=fitOrchardModel(harvestedBase);
    actor.group.add(ripe,harvested);actor.asset={ripe,harvested};actor.fallback.visible=false;updateOrchardActorVisual(actor);
  }catch(err){console.warn('[World v3] orchard asset failed',actor.fruit,err);actor.fallback.visible=true}
}

function addColliderFor(modeName,x,z,w,d){return collider(modeName,x,z,w,d)}
function isPathClearance(x,z,w=0,d=0){return footprintTouchesRoad(x,z,w,d,.18)}
function addNatureCollider(x,z,w,d){
  if(footprintTouchesRoad(x,z,w,d,.18))return null;
  return addColliderFor('outdoor',x,z,w,d);
}
const groundPickups=[];
const GROUND_PICKUP_RESPAWN_MS=45000;
const MUSHROOM_RESPAWN_MS=30000;
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
    if(!addInventoryItem(kind,1))return;
    const nextAt=Date.now()+GROUND_PICKUP_RESPAWN_MS;
    prog().groundPickups[id]=nextAt;
    persist();setAvatarAction('smile',380);updateStatus();worldAudio.sfx('pickup',.14);
    toast((kind==='wood'?'나뭇가지':'작은 돌')+' +1 · 도구 없이 주웠어요.');
    scheduleGroundPickup(actor,GROUND_PICKUP_RESPAWN_MS);
  });
  const nextAt=Number(prog().groundPickups[id]||0);
  const remain=nextAt-Date.now();
  if(remain>0)scheduleGroundPickup(actor,remain);
  else prog().groundPickups[id]=0;
}
async function addMushroomPatch(id,x,z){
  const object=await addModel(outdoor,ASSET.mushroom,{x,z,w:.75,h:.55,d:.7,rot:0,name:id});
  if(!object)return;
  const actor={id,kind:'mushroom',object,ready:true,interaction:null,timer:null};groundPickups.push(actor);
  actor.interaction=interact('outdoor',x,z,1.05,'버섯 채집하기',()=>{
    if(!actor.ready)return;
    const p=prog();if(p.energy<1){toast('체력이 부족해요.');return;}
    const gain=(companionId()==='fox'?2:1)+(Number(townPerks().mushroomBonus)||0);
    if(!addInventoryItem('mushroom',gain))return;
    p.energy=Math.max(0,p.energy-1);
    const nextAt=Date.now()+MUSHROOM_RESPAWN_MS;prog().groundPickups[id]=nextAt;
    persist();setAvatarAction('smile',380);toast('버섯 +'+gain+' · 이 자리는 잠시 쉬어가요.');updateStatus();worldAudio.sfx('pickup',.12);
    scheduleGroundPickup(actor,MUSHROOM_RESPAWN_MS);
  });
  const nextAt=Number(prog().groundPickups[id]||0),remain=nextAt-Date.now();
  if(remain>0)scheduleGroundPickup(actor,remain);else prog().groundPickups[id]=0;
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

  // Landscape v1 visually breaks the rigid parcel grid without changing movement/collision coordinates.
  await buildWorldLandscape({parent:outdoor,addModel,box,plane});

  // HOME square (-22..-2 / -10..10) — starts primitive and grows with the player.
  {
    const h=point('home');

    homePondGroup=new THREE.Group();outdoor.add(homePondGroup);
    const pond=new THREE.Mesh(new THREE.CylinderGeometry(3.0,3.14,.12,48),new THREE.MeshStandardMaterial({color:0x67b5d3,roughness:.26,metalness:.03,transparent:true,opacity:.94}));
    pond.position.set(h.x-4.0,.055,h.z+5.1);pond.receiveShadow=true;homePondGroup.add(pond);
    const rim=new THREE.Mesh(new THREE.RingGeometry(3.0,3.34,48),new THREE.MeshStandardMaterial({color:0xc9b887,roughness:.9,side:THREE.DoubleSide}));
    rim.rotation.x=-Math.PI/2;rim.position.set(h.x-4.0,.12,h.z+5.1);homePondGroup.add(rim);

    await Promise.all([
      addModel(outdoor,ASSET.house,{x:h.x,z:h.z-5.5,w:6.7,h:6.2,d:5.4,rot:Math.PI,name:'home3d'}),
      addModel(outdoor,ASSET.chest,{x:h.x+6.1,z:h.z-5.0,w:1.15,h:.9,d:.95,rot:-.15,name:'starter-crate'}),
      addModel(outdoor,ASSET.chest,{x:h.x+5.5,z:h.z-2.6,w:.9,h:.72,d:.72,rot:.05,name:'game-mailbox'}),
      addModel(outdoor,ASSET.signpost,{x:h.x+5.4,z:h.z+.2,w:.72,h:1.35,d:.7,rot:.03,name:'life-board'})
    ]);
    homeHouseObject=outdoor.getObjectByName('home3d')||null;
    homeHouseBaseScale=homeHouseObject?.scale?.clone?.()||null;
    homeHouseCollider=collider('outdoor',h.x,h.z-5.5,5.8,4.4);

    // A simple well and hand pump are built from primitives so their appearance can unlock instantly.
    homeWellGroup=new THREE.Group();outdoor.add(homeWellGroup);
    const wellBase=new THREE.Mesh(new THREE.CylinderGeometry(1.0,1.06,.70,24),new THREE.MeshStandardMaterial({color:0x8e8b7c,roughness:.92}));
    wellBase.position.set(h.x+2.1,.35,h.z+5.3);wellBase.castShadow=true;homeWellGroup.add(wellBase);
    const wellHole=new THREE.Mesh(new THREE.CylinderGeometry(.68,.68,.73,24),new THREE.MeshStandardMaterial({color:0x32495a,roughness:.65}));
    wellHole.position.set(h.x+2.1,.41,h.z+5.3);homeWellGroup.add(wellHole);
    const wellRoof=box(homeWellGroup,h.x+2.1,h.z+5.3,2.55,1.35,.16,0x7b513a,2.15);
    for(const sx of [-.9,.9])box(homeWellGroup,h.x+2.1+sx,h.z+5.3,.14,.14,1.9,0x6d5135,.65);

    homePumpGroup=new THREE.Group();outdoor.add(homePumpGroup);
    const pumpX=h.x+4.65,pumpZ=h.z+4.25;
    box(homePumpGroup,pumpX,pumpZ,.48,.48,1.55,0x54706e,.03);
    const pipe=new THREE.Mesh(new THREE.CylinderGeometry(.10,.10,.72,12),new THREE.MeshStandardMaterial({color:0x788b88,metalness:.30,roughness:.55}));
    pipe.rotation.z=Math.PI/2;pipe.position.set(pumpX+.30,1.18,pumpZ);homePumpGroup.add(pipe);
    box(homePumpGroup,pumpX+.10,pumpZ,.92,.16,.12,0x657c79,1.52);

    homeCampfireObject=await addModel(outdoor,ASSET.campfire,{x:h.x+3.2,z:h.z+7.2,w:1.55,h:.72,d:1.55,rot:0,name:'home-campfire'});
    homeCampfireLight=new THREE.PointLight(0xff9b45,0,7,2);homeCampfireLight.position.set(h.x+3.2,1.25,h.z+7.2);homeCampfireLight.userData.campfire=true;outdoor.add(homeCampfireLight);

    interact('outdoor',h.x,h.z-2.35,1.8,'집에 들어가기',()=>setMode('indoor'));
    interact('outdoor',h.x+6.1,h.z-5.0,1.3,'초보자 보급 상자 열기',claimStarterKit);
    interact('outdoor',h.x+5.5,h.z-2.6,1.25,'📬 게임 택배 우편함',mailboxPanel);
    interact('outdoor',h.x+5.4,h.z+.2,1.25,'🌱 씨앗 생활 보드',homeHubPanel);
    homePondInteraction=interact('outdoor',h.x-4.0,h.z+6.2,2.0,'집 연못에서 낚시하기',()=>{setAvatarAction('smile',850);fish('pond');});
    homeWellInteraction=interact('outdoor',h.x+2.1,h.z+5.3,1.35,'💧 우물에서 물 뜨기',()=>collectWater('well'));
    homePumpInteraction=interact('outdoor',h.x+4.65,h.z+4.25,1.25,'💧 수동 펌프로 물 채우기',()=>collectWater('pump'));
    homeCampfireInteraction=interact('outdoor',h.x+3.2,h.z+7.2,1.45,'🔥 집 앞 캠프파이어에서 요리하기',()=>cookingPanel('campfire'));
    await addZoneSign('home',6.0,4.8,'집 구역 · 단칸방에서 시작하는 생활 터전',.25,developmentPanel);

    await Promise.all([
      addGroundPickup('starter-wood-1','wood',h.x-8.0,h.z+2.2),
      addGroundPickup('starter-wood-2','wood',h.x-1.4,h.z+1.7),
      addGroundPickup('starter-wood-3','wood',h.x+6.7,h.z+2.6),
      addGroundPickup('starter-wood-4','wood',h.x+7.2,h.z+7.4),
      addGroundPickup('starter-wood-5','wood',h.x-8.2,h.z+7.5),
      addGroundPickup('starter-wood-6','wood',h.x+5.8,h.z-7.2),
      addGroundPickup('starter-stone-1','stone',h.x-8.4,h.z+5.0),
      addGroundPickup('starter-stone-2','stone',h.x+.2,h.z+8.1),
      addGroundPickup('starter-stone-3','stone',h.x+7.0,h.z+4.0),
      addGroundPickup('starter-stone-4','stone',h.x+6.7,h.z-6.8),
      addGroundPickup('starter-stone-5','stone',h.x-6.6,h.z-7.3),
      addGroundPickup('starter-stone-6','stone',h.x+.6,h.z+2.6)
    ]);
    updateHomesteadVisuals();
  }

  // FARM square (2..22 / -10..10)
  {
    const f=point('farm');
    await Promise.all([
      addModel(outdoor,ASSET.farmHouse,{x:f.x,z:f.z-5.7,w:4.8,h:4.5,d:4.2,rot:Math.PI,name:'farmhouse3d'}),
      addModel(outdoor,ASSET.workbench,{x:f.x+6.2,z:f.z+6.5,w:2.0,h:1.5,d:1.3,rot:-.2,name:'workbench3d'}),
      addModel(outdoor,ASSET.chest,{x:f.x+4.1,z:f.z+6.9,w:1.3,h:1.0,d:1.0,rot:.15,name:'chest3d'})
    ]);
    carpenterBuildingObject=outdoor.getObjectByName('farmhouse3d')||null;
    carpenterFoundation=box(outdoor,f.x,f.z-5.7,4.5,3.7,.16,0x8d7657,.015);
    carpenterCollider=addColliderFor('outdoor',f.x,f.z-5.7,4.0,3.3);
    if(carpenterCollider)carpenterCollider.enabled=devState().carpenterLevel>=1;
    addColliderFor('outdoor',f.x+6.2,f.z+6.5,1.6,1.0);
    addColliderFor('outdoor',f.x+4.1,f.z+6.9,1.0,.8);
    interact('outdoor',f.x+6.2,f.z+5.65,1.45,'3×3 제작대 사용하기',workbenchPanel);
    carpenterInteraction=interact('outdoor',f.x,f.z-3.25,1.65,'🪚 목수공방 이용하기',carpenterPanel);
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
    for(const [dx,dz,rot] of [
      [-6.0,-.35,0],[-3.5,-.35,0],[-1.0,-.35,0],
      [-6.0,7.95,0],[-3.5,7.95,0],[-1.0,7.95,0],
      [-7.55,1.3,Math.PI/2],[-7.55,3.9,Math.PI/2],[-7.55,6.5,Math.PI/2],
      [.75,1.3,Math.PI/2],[.75,3.9,Math.PI/2],[.75,6.5,Math.PI/2]
    ]){
      await addFence(outdoor,f.x+dx,f.z+dz,rot,{length:2.25,height:.9});
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
    interact('outdoor',w.x-4.4,w.z-2.25,1.65,'💧 강물 떠가기',()=>collectWater('river'));
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

  // ORCHARD square (26..46 / -34..-14) — empty land at first, then 1 → 9 fruit trees.
  {
    const o=point('orchard');
    const slots=[[-6,-5],[-2,-5],[2,-5],[6,-5],[-6,0],[-2,0],[2,0],[6,0],[0,5.5]];
    for(let idx=0;idx<slots.length;idx++){
      const [dx,dz]=slots[idx],group=new THREE.Group(),fallback=new THREE.Group();group.position.set(o.x+dx,0,o.z+dz);group.add(fallback);outdoor.add(group);
      await addModel(fallback,idx%3===0?ASSET.oak:ASSET.tree,{x:0,z:0,w:2.35,h:3.9,d:2.35,rot:idx*.39,name:'orchard-tree-'+idx});
      const fruit=ORCHARD_FRUIT_SEQUENCE[idx],color=ORCHARD_FRUIT_COLORS[fruit]||0xd94b45;addFruitDots(fallback,color);
      const interaction=interact('outdoor',o.x+dx,o.z+dz,1.35,orchardFruitName(fruit)+' 수확하기',()=>harvestOrchardTree(orchardActors[idx]));
      const actor={id:'orchard-'+idx,index:idx,fruit,group,fallback,asset:null,interaction};orchardActors.push(actor);void attachOrchardAsset(actor);
    }
    for(const [dx,dz,rot] of [[-7.8,-7.7,0],[-2.7,-7.7,0],[2.7,-7.7,0],[7.8,-7.7,0],[-7.8,7.7,0],[-2.7,7.7,0],[2.7,7.7,0],[7.8,7.7,0],[-8.7,-4.8,Math.PI/2],[-8.7,0,Math.PI/2],[-8.7,4.8,Math.PI/2],[8.7,-4.8,Math.PI/2],[8.7,0,Math.PI/2],[8.7,4.8,Math.PI/2]]){
      const fence=await addFence(outdoor,o.x+dx,o.z+dz,rot,{length:2.5,height:.82,name:'orchard-fence'});
      if(fence)orchardActors.push({id:'orchard-fence-'+dx+'-'+dz,index:0,fruit:'',group:fence,interaction:{enabled:false}});
    }
    await addZoneSign('orchard',6.8,6.7,'과수원 · 반복 수확 과일나무',0,developmentPanel);
    updateOrchardVisuals();
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
    let mushroomIndex=0;
    for(const [dx,dz] of [[-5,1.2],[-1,3.5],[7,2.8],[-5,-5.2]]){
      const x=c.x+dx,z=c.z+dz;await addMushroomPatch('forest-mushroom-'+mushroomIndex++,x,z);
    }
    await addModel(outdoor,ASSET.logStack,{x:c.x+.5,z:c.z+5.2,w:2.4,h:1.1,d:1.2,rot:.2});
    await addZoneSign('forest',7.0,-6.2,'깊은 숲 · 목재 · 버섯',Math.PI/2);
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
    await addZoneSign('quarry',-5.0,8.0,'광산 · 돌 · 철 · 희귀 광물',-Math.PI/2,developmentPanel);
  }

  // CAMP square (-46..-26 / 14..34)
  {
    const c=point('camp');
    await addModel(outdoor,ASSET.campfire,{x:c.x-1.5,z:c.z,w:1.7,h:.8,d:1.7,rot:0,name:'campfire'});
    const fireLight=new THREE.PointLight(0xff9b45,0,9,2);fireLight.position.set(c.x-1.5,1.4,c.z);fireLight.userData.campfire=true;outdoor.add(fireLight);
    interact('outdoor',c.x-1.5,c.z,1.55,'야영지 모닥불 살펴보기',()=>toast('여기는 탐험 중 쉬어가는 공용 모닥불이에요. 요리는 집 앞에 직접 캠프파이어를 만들어서 해보세요.'));
    interact('outdoor',c.x+1.3,c.z,1.5,'야영지에서 쉬기',restAtCamp);
    for(const [dx,dz] of [[-7,-7],[-5,6],[6,-7],[7,6]])await addModel(outdoor,ASSET.pine,{x:c.x+dx,z:c.z+dz,w:2.4,h:4.0,d:2.4,rot:.2});
    await addZoneSign('camp',7.2,0,'야영지 · 모닥불 · 휴식',Math.PI/2);
  }

  // Decorative home flowers stay well inside their parcel.
  {
    const h=point('home');
    for(const [dx,dz] of [[-7,-5],[-6.3,-4.4],[7.5,-1.0],[-8.3,.5],[7.8,6.0]])await addModel(outdoor,ASSET.flower,{x:h.x+dx,z:h.z+dz,w:.55,h:.5,d:.55,rot:0});
  }

  cityRuntime=await buildKidscadeCity({
    parent:outdoor,addModel,box,plane,interact,collider,loadGLB,loadGLTF,prepModel,
    actions:{
      resident:id=>townEconomy?.resident(id),shop:(kind,name)=>townEconomy?.shop(kind,name),
      jobs:()=>townEconomy?.jobs(),delivery:()=>townEconomy?.delivery(),
      talk:(id,name)=>townEconomy?.talk(id,name),arcade:()=>townEconomy?.arcade(),
      library:()=>townEconomy?.library(),clinic:()=>townEconomy?.clinic(),
      transport:()=>townEconomy?.transport(),bench:()=>townEconomy?.bench(),
      schoolYard:()=>townEconomy?.schoolYardPanel?.(),
      schoolBreakGame:id=>townEconomy?.schoolBreakGame?.(id),
      schoolFriends:()=>townEconomy?.schoolFriendPanel?.(),
      schoolLunch:()=>townEconomy?.schoolLunchPanel?.(),
      enterVenue:kind=>enterVenue(kind),
      dailyBoard:()=>dailyLife?.boardPanel?.(),dailyVisitor:()=>dailyLife?.visitorPanel?.()
    },
    getGameTime:()=>prog().survival.time,
    getPlayerPosition:()=>({x:player.x,z:player.z}),
    getDailyState:()=>dailyDirector?.state?.()||null
  });
}

async function buildIndoor(){
  // Interior Kit owns the architectural shell. Furniture remains a separate
  // persistent layer so existing x/z/rotation saves survive house upgrades.
  homeInteriorRuntime=await buildHomeInterior({parent:indoor,addModel});
  homeInteriorRuntime.setLevel(devState().houseLevel);

  // Fresh home: floor bedding and one temporary crate, no free functional furniture.
  starterBeddingGroup=new THREE.Group();indoor.add(starterBeddingGroup);
  const blanket=plane(starterBeddingGroup,0,-1.55,2.25,2.85,0x6f8db2,.026);
  const pillow=box(starterBeddingGroup,0,-2.42,1.25,.48,.16,0xe9e2d3,.03);
  blanket.receiveShadow=true;pillow.castShadow=true;

  await addModel(indoor,ASSET.chest,{x:2.55,z:1.85,w:1.35,h:.92,d:.95,rot:Math.PI/2,name:'starter-home-storage'});
  addColliderFor('indoor',2.55,1.85,.95,.72);

  interact('indoor',0,3.20,1.35,'밖으로 나가기',()=>setMode('outdoor'));
  starterBeddingInteraction=interact('indoor',0,-1.55,1.45,'🧺 바닥 이불에서 자기',sleepOnFloor);
  interact('indoor',2.55,1.85,1.35,'📦 임시 수납상자 열기',homeStoragePanel);

  updateHomesteadVisuals();
}
function clockText(minutes){
  const m=Math.floor(((minutes%1440)+1440)%1440),h=Math.floor(m/60),mm=String(m%60).padStart(2,'0');
  return String(h).padStart(2,'0')+':'+mm;
}
function isNightTime(minutes){const h=((minutes%1440)+1440)%1440/60;return h<6||h>=20;}
const petActors=[];
const wildPetActors=[];
const PET_SLOTS=[[-19.2,-7.0],[-17.8,-7.1],[-16.4,-7.0],[-19.0,-5.8],[-17.6,-5.8],[-16.2,-5.7],[-18.8,-4.6],[-17.4,-4.6],[-16.0,-4.5],[-20.1,-5.8]];
const RANCH_SLOTS={bunny:[8.0,-24.8],pig:[10.0,-22.5],cow:[13.0,-26.0],chick:[16.0,-21.0]};
const RANCH_PRODUCTS={cow:{key:'milk',name:'우유',qty:1,cooldown:1},chick:{key:'egg',name:'달걀',qty:2,cooldown:1},pig:{key:'truffle',name:'트러플',qty:1,cooldown:2}};
const RANCH_ANIMALS=['bunny','pig','cow','chick'];
let ranchProduceObject=null,ranchSignObject=null,ranchProduceInteraction=null;
function ranchResidentIds(){
  const owned=petState().owned||[],cap=ranchCapacity();
  return RANCH_ANIMALS.filter(id=>owned.includes(id)).slice(0,cap);
}
function ranchAnimalCount(){return ranchResidentIds().length}
function ownedPetHomeSlot(id){
  const owned=petState().owned||[];
  if(ranchResidentIds().includes(id)&&RANCH_SLOTS[id])return RANCH_SLOTS[id];
  return PET_SLOTS[Math.max(0,owned.indexOf(id))%PET_SLOTS.length];
}
function updateRanchExpansionVisuals(){
  const level=devState().ranchLevel;
  for(const actor of ranchVisualActors)actor.group.visible=actor.level===level;
  if(ranchProduceObject)ranchProduceObject.visible=level>0;
  if(ranchSignObject)ranchSignObject.visible=level>0;
  if(ranchProduceInteraction)ranchProduceInteraction.enabled=level>0;
  for(const actor of petActors){
    const slot=ownedPetHomeSlot(actor.id);
    if(actor.homeX===slot[0]&&actor.homeZ===slot[1])continue;
    actor.homeX=slot[0];actor.homeZ=slot[1];actor.targetX=slot[0];actor.targetZ=slot[1];actor.moving=false;
    if(actor.id!==companionId()){actor.object.position.x=slot[0];actor.object.position.z=slot[1];}
  }
}

const PET_SCALE={dog:.82,cat:.78,bunny:.72,pig:.88,cow:1.0,chick:.56,fox:.78,deer:.92,parrot:.64,beaver:.76};
const WILD_PETS={
  cat:{habitat:'pond',x:-16.0,z:5.6,roamX:.34,roamZ:.38},
  bunny:{habitat:'ranch',x:8.0,z:-24.8,roamX:.42,roamZ:.36},
  pig:{habitat:'ranch',x:10.0,z:-22.5,roamX:.40,roamZ:.34},
  cow:{habitat:'ranch',x:13.0,z:-26.0,roamX:.36,roamZ:.32},
  chick:{habitat:'ranch',x:16.0,z:-21.0,roamX:.44,roamZ:.38},
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
  const legacyRanchCount=RANCH_ANIMALS.filter(id=>state.owned.includes(id)).length;
  if((Number(p.homestead?.reworkVersion)||0)<2&&legacyRanchCount>0&&devState().ranchLevel<legacyRanchCount){
    devState().ranchLevel=Math.min(4,legacyRanchCount);
  }
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
  const req=effectivePetReq(id);Object.entries(req).forEach(([k,v])=>removeInventoryItem(k,v));
}
async function ensureOwnedPetActor(id){
  if(petActors.some(a=>a.id===id))return;
  const object=await makeCubePetObject(id);if(!object)return;
  const slot=ownedPetHomeSlot(id);
  const groundY=Number(object.userData.groundY)||0;object.position.set(slot[0],groundY+.015,slot[1]);petLayer.add(object);
  petActors.push({id,object,homeX:slot[0],homeZ:slot[1],groundY,phase:petActors.length*.83,targetX:slot[0],targetZ:slot[1],nextDecision:0,moving:false,speed:.28+Math.random()*.12});
}
function ranchPanel(){
  const p=prog(),state=petState(),day=p.survival.day,level=devState().ranchLevel,cap=ranchCapacity(),used=ranchAnimalCount();
  if(level<1){openPanel('<h2>🐄 목장 터</h2><p>아직 울타리도 축사도 없어요. 마을 성장에서 작은 목장을 먼저 만들어야 동물을 데려올 수 있어요.</p><button data-world-hub="develop">🏗️ 성장판 보기</button>');return;}
  const residents=new Set(ranchResidentIds());
  const rows=Object.entries(RANCH_PRODUCTS).map(([id,d])=>{
    const resident=residents.has(id),last=Number(state.products[id]??-999),ready=resident&&(day-last>=d.cooldown);
    return '<div class="item"><b>'+CUBE_PETS[id].name+' · '+d.name+'</b><div>'+(resident?(ready?'수확 가능':'다음 생산까지 기다리는 중'):(state.owned.includes(id)?'펫 마당에서 지내는 중':'아직 친구가 아님'))+'</div></div>';
  }).join('');
  const can=Object.entries(RANCH_PRODUCTS).some(([id,d])=>residents.has(id)&&(day-Number(state.products[id]??-999)>=d.cooldown));
  openPanel('<h2>🐄 목장 '+level+'단계 · '+used+'/'+cap+'마리</h2><p>목장을 키우면 울타리가 넓어지고 함께 살 수 있는 동물이 늘어나요.</p><div class="grid">'+rows+'</div><button data-ranch-collect="1" '+(can?'':'disabled')+'>오늘 생산물 모으기</button> <button data-world-hub="develop">🏗️ 목장 확장</button><p style="font-size:12px">우유·달걀·트러플은 요리하거나 씨앗마트에 팔아 다른 생활 재료를 살 수 있어요.</p>');
}
function collectRanchProducts(){
  const p=prog(),state=petState(),day=p.survival.day,i=inv();const got=[];
  const residents=new Set(ranchResidentIds());
  for(const [id,d] of Object.entries(RANCH_PRODUCTS)){
    if(!residents.has(id))continue;
    const last=Number(state.products[id]??-999);if(day-last<d.cooldown)continue;
    const added=addInventoryItem(d.key,d.qty,{silent:true});if(!added)continue;state.products[id]=day;got.push(d.name+' +'+d.qty);
  }
  if(!got.length){toast('오늘 모을 생산물이 아직 없어요.');ranchPanel();return;}
  persist();Meta?.advanceTask?.('harvest',1);worldAudio.sfx('pickup',.20);toast(got.join(' · '));updateStatus();ranchPanel();
}
async function tamePet(id){
  const state=petState(),def=CUBE_PETS[id];if(!def)return;
  if(state.owned.includes(id)){toast(def.name+'은(는) 이미 우리 친구예요.');return;}
  if(RANCH_ANIMALS.includes(id)){
    if(devState().ranchLevel<1){toast('🐄 먼저 목장을 만들어야 이 친구를 데려올 수 있어요.');return;}
    if(ranchAnimalCount()>=ranchCapacity()){toast('🐄 목장이 가득 찼어요. 목장을 더 크게 확장해 보세요.');return;}
  }
  if(!canTame(id)){toast(def.name+'에게 다가가려면 '+petReqText(id)+'이(가) 필요해요.');return;}
  payTame(id);state.owned.push(id);if(!state.met.includes(id))state.met.push(id);
  museumRuntime?.discover?.('pet:'+id,{day:prog().survival.day,location:def.region});
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
    await addFence(outdoor,x,z,rot,{length:2.0,thickness:.32,height:.85});
  }
  await addModel(outdoor,ASSET.signpost,{x:-19.8,z:-2.9,w:.7,h:1.45,d:.7,rot:.2,name:'pet-yard-sign'});
  interact('outdoor',-19.8,-2.9,1.35,'Cube Pets 보기',petPanel);

  // Ranch grows physically: each level swaps to a larger paddock boundary.
  const ranchLayouts={
    1:[[7.0,-27.5,0],[10.0,-27.5,0],[7.0,-20.5,0],[10.0,-20.5,0],[5.8,-25.2,Math.PI/2],[5.8,-22.8,Math.PI/2],[11.2,-25.2,Math.PI/2],[11.2,-22.8,Math.PI/2]],
    2:[[5.5,-29.0,0],[9.0,-29.0,0],[12.5,-29.0,0],[5.5,-19.0,0],[9.0,-19.0,0],[12.5,-19.0,0],[4.2,-26.0,Math.PI/2],[4.2,-22.0,Math.PI/2],[13.8,-26.0,Math.PI/2],[13.8,-22.0,Math.PI/2]],
    3:[[4.5,-30.5,0],[8.0,-30.5,0],[12.0,-30.5,0],[16.0,-30.5,0],[4.5,-17.5,0],[8.0,-17.5,0],[12.0,-17.5,0],[16.0,-17.5,0],[3.4,-27.0,Math.PI/2],[3.4,-21.0,Math.PI/2],[17.2,-27.0,Math.PI/2],[17.2,-21.0,Math.PI/2]],
    4:[[4.2,-31.5,0],[7.5,-31.5,0],[11.0,-31.5,0],[14.5,-31.5,0],[18.0,-31.5,0],[4.2,-16.5,0],[7.5,-16.5,0],[11.0,-16.5,0],[14.5,-16.5,0],[18.0,-16.5,0],[3.2,-28.0,Math.PI/2],[3.2,-23.5,Math.PI/2],[3.2,-19.0,Math.PI/2],[19.2,-28.0,Math.PI/2],[19.2,-23.5,Math.PI/2],[19.2,-19.0,Math.PI/2]]
  };
  for(const [level,parts] of Object.entries(ranchLayouts)){
    const group=new THREE.Group();outdoor.add(group);
    for(const [x,z,rot] of parts)await addFence(group,x,z,rot,{length:2.8,height:.82});
    const ground=plane(group,11.2,-24,Math.min(16,5+Number(level)*3),Math.min(14,5+Number(level)*2.4),0x91a95f,-.055);
    ranchVisualActors.push({level:Number(level),group});
  }
  ranchProduceObject=await addModel(outdoor,ASSET.chest,{x:18.5,z:-17.4,w:1.1,h:.82,d:.9,rot:.1,name:'ranch-produce-crate'});
  ranchSignObject=await addModel(outdoor,ASSET.signpost,{x:15.8,z:-17.2,w:.7,h:1.45,d:.7,rot:.05,name:'ranch-sign'});
  ranchProduceInteraction=interact('outdoor',18.0,-17.7,1.7,'목장 생산물 확인하기',ranchPanel);
  interact('outdoor',15.8,-17.2,1.35,'🏗️ 목장 성장 보기',developmentPanel);
  updateRanchExpansionVisuals();
  for(const id of state.owned)await ensureOwnedPetActor(id);

  for(const [id,pos] of Object.entries(WILD_PETS)){
    const object=await makeCubePetObject(id);if(!object)continue;
    const groundY=Number(object.userData.groundY)||0;object.position.set(pos.x,groundY+.015,pos.z);petLayer.add(object);
    const actor={id,object,x:pos.x,z:pos.z,groundY,habitat:pos.habitat,roamX:Math.max(.45,pos.roamX||.6),roamZ:Math.max(.4,pos.roamZ||.55),interaction:null,phase:wildPetActors.length*.91,targetX:pos.x,targetZ:pos.z,nextDecision:0,moving:false,speed:.22+Math.random()*.18};wildPetActors.push(actor);
    object.visible=!state.owned.includes(id)&&(pos.habitat!=='ranch'||RANCH_ANIMALS.indexOf(id)<ranchCapacity());
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
  const walkBob=a.moving?Math.abs(Math.sin(now/125+a.phase))*.018:0,surface=outdoorGroundSurfaceYAt(a.object.position.x,a.object.position.z);
  a.object.position.y=a.groundY+surface+.015+walkBob;
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
      const surface=currentGroundSurfaceYAt(a.object.position.x,a.object.position.z);
      a.object.position.y=a.groundY+surface+.015+(walking?Math.abs(Math.sin(now/120+a.phase))*.024:0);
    }else{
      stepAnimal(a,now,dt,a.homeX,a.homeZ,.52,.38);
    }
  }
  for(const a of wildPetActors){
    const ranchVisible=a.habitat!=='ranch'||RANCH_ANIMALS.indexOf(a.id)<ranchCapacity();
    a.object.visible=mode==='outdoor'&&!state.owned.includes(a.id)&&ranchVisible;
    if(a.interaction)a.interaction.enabled=a.object.visible;
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
  const weather=dailyDirector?.weather?.();
  if(statusClockEl){statusClockEl.textContent='Day '+s.day+' · '+clockText(s.time)+(weather?' · '+weather.icon:'');statusClockEl.title=dailyDirector?.summary?.()||'';}
  if(statusPhaseEl)statusPhaseEl.textContent=(phase==='밤'?'🌙 ':'☀ ') + phase+(weather?' · '+weather.label:'');
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
  // Night changes lighting and activity, but simply being outdoors no longer causes damage.
  // Survival pressure comes from hunger and work so the world can still feel like a life sim.
  if(night&&mode==='outdoor'&&pet==='cat'){
    s.hunger=Math.min(100,s.hunger+dt*.006);
  }
  const hour=s.time/60;
  const daylight=Math.max(.16,Math.min(1,Math.sin(((hour-5)/15)*Math.PI)));
  sun.intensity=.45+daylight*2.95;
  hemi.intensity=.55+daylight*1.45;
  const dayColor=new THREE.Color(0xb9d8ee),nightColor=new THREE.Color(0x17243d);
  if(dailyDirector)dailyDirector.applyLighting({daylight,dayColor,nightColor,sun,hemi,scene,renderer});
  else{
    const sky=nightColor.clone().lerp(dayColor,daylight);
    scene.background.copy(sky);scene.fog.color.copy(sky);renderer.setClearColor(sky,1);
  }
  outdoor.traverse(o=>{if(o.isPointLight&&o.userData?.campfire)o.intensity=night?2.4:.35;});
  survivalUiClock+=dt;if(survivalUiClock>.45){survivalUiClock=0;updateStatus();}
}

let cameraAspect=1,cameraHalfHeight=8.6;
function applyCameraProjection(v=cameraHalfHeight){
  camera.top=v;camera.bottom=-v;camera.left=-v*cameraAspect;camera.right=v*cameraAspect;camera.updateProjectionMatrix();
}
function resize(){
  const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);
  cameraAspect=w/Math.max(1,h);applyCameraProjection();
}
addEventListener('resize',resize);resize();

let townEconomy=null,cityRuntime=null,furnishingSystem=null,venueInteriors=null,dailyDirector=null,dailyLife=null;
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
  const groundSurfaceY=currentGroundSurfaceYAt(player.x,player.z);
  avatar.position.x=player.x;avatar.position.z=player.z;
  shadow.position.set(player.x,groundSurfaceY+.008,player.z+.08);
  cosmeticAura.position.set(player.x,groundSurfaceY+.014,player.z+.04);
  cosmeticAura.rotation.z=now/1800;
  if(cosmeticAura.visible){const pulse=1+Math.sin(now/330)*.06;cosmeticAura.scale.setScalar(pulse);}
  updateAvatarFrame(now,moving);
  applyAvatarMotion(now,moving,groundSurfaceY);
  updatePets(now,dt);
  furnishingSystem?.updatePreview?.();
  dailyDirector?.update?.(now,dt,player,prog().survival.day);
  dailyLife?.sync?.();
  cityRuntime?.update?.(now,dt);
  venueInteriors?.update?.(dt);

  const homeCamera=mode==='indoor'?homeInteriorCameraProfile(devState().houseLevel):null;
  const desiredView=mode==='outdoor'?8.6:homeCamera
    ?Math.max(homeCamera.viewHeight,homeCamera.fitHalfHeight||0,(homeCamera.fitHalfWidth||0)/Math.max(.52,cameraAspect))
    :6.7;
  const projectionBlend=1-Math.pow(.0025,dt);
  const nextView=THREE.MathUtils.lerp(cameraHalfHeight,desiredView,projectionBlend);
  if(Math.abs(nextView-cameraHalfHeight)>.001){cameraHalfHeight=nextView;applyCameraProjection();}

  let off,target,targetY;
  if(homeCamera){
    const follow=homeCamera.playerFollow;
    target=new THREE.Vector3(
      THREE.MathUtils.lerp(homeCamera.centerX,player.x,follow),
      0,
      THREE.MathUtils.lerp(homeCamera.centerZ,player.z,follow)
    );
    off=new THREE.Vector3(...homeCamera.offset);targetY=homeCamera.targetY;
  }else{
    off=mode==='outdoor'?new THREE.Vector3(10.5,13.5,13.5):new THREE.Vector3(8.0,10.2,10.0);
    target=new THREE.Vector3(player.x,0,player.z);targetY=mode==='outdoor'?.2:.55;
  }
  camera.position.lerp(target.clone().add(off),1-Math.pow(.0015,dt));
  camera.lookAt(target.x,targetY,target.z);
  if(homeCamera)homeInteriorRuntime?.updateCutaway?.(camera.position.x,camera.position.z);
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
    getRoomBounds:()=>currentHouseBounds(),
    canPlace:canPlaceFurniture,
    useFurniture:key=>{
      if(key==='bedSingle'){setAvatarAction('smile',850);sleep();return;}
      if(key==='kitchenFridge'){homeFoodStoragePanel();return;}
      if(key==='kitchenStove'){setAvatarAction('smile',500);cookingPanel('stove');return;}
      if(key==='kitchenSink'){
        if(devState().waterLevel<3){toast('수도가 아직 집까지 연결되지 않았어요.');return;}
        const added=addWater(waterCarryLimit());persist();setAvatarAction('smile',650);updateStatus();toast(added?'🚰 수도에서 물통을 가득 채웠어요.':'🚰 집에서 바로 물을 사용할 수 있어요.');return;
      }
      if(key==='kitchenCabinet'||key==='homeDrawers'){homeStoragePanel();return;}
      if(key==='wardrobe'){
        setAvatarAction('smile',650);
        window.parent?.postMessage({type:'kidscade:open-avatar-studio'},location.origin);
        return;
      }
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
        const p=prog(),t=townEconomy?.ensureState?.(p)||p.town,day=p.survival.day;
        if(p.homestead.bookcaseReadDay===day){toast('오늘은 이미 희귀 책을 충분히 읽었어요. 내일 다른 책을 펼쳐보세요.');return;}
        p.homestead.bookcaseReadDay=day;p.energy=Math.min(p.maxEnergy,p.energy+3);if(t)t.fun=Math.min(100,(t.fun||0)+6);
        persist();updateStatus();setAvatarAction('smile',650);toast('희귀 책을 읽었어요. 체력 +3 · 재미 +6');return;
      }
    }
  });
  townEconomy=createTownEconomy({
    prog,inv,openPanel,toast,persist,updateStatus,setAvatarAction,itemName,
    foodName:key=>FOOD_DEF[key]?.name||key,
    addInventoryItem,removeInventoryItem,canCarryNewKey,addFoodItem,canCarryFoodKey,canCarryBundle,
    travel:travelTo,playSfx:(kind,volume)=>worldAudio.sfx(kind,volume),
    enterVenue,getVenue:()=>activeVenue,
    getDailyState:()=>dailyDirector?.state?.()||prog().dailyWorld||null
  });
  townEconomy.ensureState(prog());
  museumRuntime=createMuseumSystem({
    prog,inv,persist,openPanel,toast,
    getDay:()=>prog().survival.day
  });
  museumRuntime.syncKnown();
  dailyDirector=createDailyDirector({
    parent:outdoor,prog,persist,
    onDayStart:state=>{
      const p=prog();let watered=0;
      if(state.weather==='rain'){
        for(const crop of Object.values(p.crops||{})){
          const def=CROP_DEF[crop?.type];
          if(crop?.phase!=='planted'||!def)continue;
          crop.phase='growing';crop.readyAt=Date.now()+def.growMs;watered++;
        }
        if(watered)updateCropVisuals();
      }
      dailyLife?.refreshDay?.(state);
      persist();updateStatus();
      const weather=dailyDirector?.weather?.();
      const extra=watered?' · 밭 '+watered+'칸에 빗물이 스며들었어요.':'';
      setTimeout(()=>toast((weather?.icon||'🌤️')+' 새로운 아침 · '+(weather?.label||'맑음')+extra),320);
    }
  });
  dailyLife=await createDailyLife({
    parent:outdoor,addModel,interact,prog,inv,persist,toast,openPanel,itemName,
    addInventoryItem,removeInventoryItem,canCarryNewKey,townEconomy,
    getDailyState:()=>dailyDirector?.state?.()||prog().dailyWorld||null,
    getDevelopment:devState,setAvatarAction,
    playSfx:(kind,volume)=>worldAudio.sfx(kind,volume)
  });
  // Persist one-time v3.22 starter-world migration before any later refresh/reload.
  persist();
  syncCosmeticAura();
  updateStatus();
  const venuePromise=buildVenueInteriors({
    parent:venueLayer,addModel,box,plane,interact,collider,loadGLTF,prepModel,
    actions:{
      shop:(kind,npc)=>townEconomy?.shop?.(kind,npc),
      resident:id=>townEconomy?.resident?.(id),
      cafeRest:()=>townEconomy?.cafeRest?.(),
      museumCatalog:()=>museumRuntime?.catalogPanel?.(),
      museumDonate:()=>museumRuntime?.donationPanel?.(),
      museumSummary:()=>museumRuntime?.summary?.(),
      schoolSchedule:()=>townEconomy?.schoolSchedule?.(),
      schoolClass:()=>townEconomy?.schoolClassPanel?.(),
      schoolBell:period=>{worldAudio.sfx('success',.07);toast('🔔 '+(period?.label||'다음 시간')+' · '+(period?.board||'수업이 바뀌었어요.'));},
      exitVenue
    },
    getGameTime:()=>prog().survival.time
  }).then(runtime=>{venueInteriors=runtime;return runtime});
  await Promise.all([buildOutdoor(),buildIndoor(),venuePromise]);
  await furnishingSystem.restore();
  await buildPets();
  updateHomesteadVisuals();updateFarmExpansionVisuals();updateOrchardVisuals();updateRanchExpansionVisuals();
  updateStatus();
  showStarterHintOnce();
  const previous=save.player?.v3scene;
  if(previous==='indoor')setMode('indoor');
  else if(VENUE_MODE_SET.has(previous)){
    const kind=venueKindFromMode(previous),dest=VENUE_RETURN_POINTS[kind]||{x:-12,z:18};
    mode='outdoor';activeVenue='';outdoor.visible=true;indoor.visible=false;venueLayer.visible=false;venueInteriors?.hideAll?.();
    player.x=dest.x;player.z=dest.z;zoneEl.textContent='씨앗마을 · 상점가';wasInCity=true;
  }else{mode='outdoor';outdoor.visible=true;indoor.visible=false;venueLayer.visible=false;zoneEl.textContent='집 앞 · 3D 마을';wasInCity=isCityArea(player.x,player.z)}
  loading.classList.add('hide');
  canvas.focus();requestAnimationFrame(tick);
}

window.addEventListener('kidscade-seed-world-meta-change',()=>{syncCosmeticAura();updateStatus();});
init().catch(err=>{console.error(err);loading.textContent='3D 월드를 불러오지 못했어요. 새로고침 후 다시 시도해 주세요.'});

window.KidscadeWorldV3={
  version:3,
  resetInput(){resetInput(true)},
  refresh(){resetInput(true);save=Storage?.load?.()||save;setAvatarSource(Bridge?.readAvatarSource?.()||'');syncCosmeticAura();updateFarmExpansionVisuals();updateOrchardVisuals();updateRanchExpansionVisuals();updateHomesteadVisuals();updateCropVisuals();updateStatus()},
  pauseAudio(){worldAudio.stop()},
  resumeAudio(){worldAudio.unlock();syncAudioButton()},
  setMode,
  groundAudit(){
    const surface=currentGroundSurfaceYAt(player.x,player.z);
    const playerBottom=avatar.position.y-avatar.scale.y*avatar.center.y;
    return {
      mode,
      player:{x:player.x,z:player.z,surface,bottom:playerBottom,clearance:playerBottom-surface},
      residents:cityRuntime?.groundAudit?.()||[],
      classroom:venueInteriors?.groundAudit?.()||[]
    };
  }
};

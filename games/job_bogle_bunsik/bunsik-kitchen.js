import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RestaurantEngine } from '../shared/restaurant-engine.js?v=1';

const FOOD=new URL('../../assets/game/food/',import.meta.url).href;
const PEOPLE=new URL('../../assets/game/characters/people/',import.meta.url).href;
const NPCS=new URL('../../assets/game/npcs/glTF/',import.meta.url).href;
const KITCHEN=new URL('../../assets/game/3d/interiors/charming-kitchen-set/',import.meta.url).href;
const SUSHI=new URL('../../assets/game/3d/interiors/modular-sushi-restaurant-kit/',import.meta.url).href;
const BAKERY=new URL('../../assets/game/3d/bakery/interior/',import.meta.url).href;
const BAKERY_BITS=new URL('../../assets/game/3d/bakery/restaurant-bits/',import.meta.url).href;
const MARKET=new URL('../../assets/game/shops/market/',import.meta.url).href;
const AVATAR_SHEET=new URL('../../assets/game/characters/kidscade-avatar-v3/school-starter/school-starter-sheet.png',import.meta.url).href;

const SHIFT_SECONDS=150;
const TARGET_REVENUE=5200;
const MAX_ORDERS=5;
const POT_COUNT=4;
const SAVE_KEY='bunsikTycoonProgressV1';
const EQUIPMENT={
 prepCounter:{name:'추가 조리대',price:900,min:2,max:3,category:'kitchen',icon:'🧺',desc:'재료를 잠깐 올려둘 공간 +1'},
 conveyor:{name:'컨베이어',price:1400,min:0,max:2,category:'automation',icon:'➡️',desc:'재료를 배치 방향으로 자동 이동'},
 grabber:{name:'Grabber',price:2200,min:0,max:1,category:'automation',icon:'🦾',desc:'뒤 조리대의 재료를 자동으로 집기'},
 smartGrabber:{name:'Smart Grabber',price:3400,min:0,max:1,requires:'grabber',category:'automation',icon:'🎯',desc:'지정한 재료만 골라 자동 운반'}
};
const UPGRADES={
 dishRack:{name:'대형 식기 선반',price:1300,min:0,max:1,minStars:1,category:'kitchen',icon:'🥣',desc:'영업 시작 깨끗한 그릇 3 → 5'},
 wideSink:{name:'넓은 싱크대',price:1800,min:0,max:1,minStars:1,category:'kitchen',icon:'🚰',desc:'설거지 시간이 1.45초 → 0.9초'},
 table3:{name:'3번 테이블',price:1500,min:0,max:1,minStars:1,category:'hall',icon:'🪑',desc:'홀 좌석 +1 · 동시 손님 증가'},
 table4:{name:'4번 테이블',price:2800,min:0,max:1,minStars:2,requires:'table3',category:'hall',icon:'🪑',desc:'홀 좌석 +1 · 바쁜 시간 대응'},
 hallStaff:{name:'홀 알바 고용',price:3800,min:0,max:1,minStars:2,requires:'table3',category:'staff',icon:'🙋',desc:'배식대 근처 완성 메뉴를 자동으로 서빙'},
 dishCart:{name:'퇴식 카트',price:4200,min:0,max:1,minStars:3,requires:'hallStaff',category:'hall',icon:'🛒',desc:'테이블의 빈 그릇을 실제로 싱크까지 자동 운반'},
 helperSkill1:{name:'주방 알바 숙련 1',price:2500,min:0,max:1,minStars:2,category:'staff',icon:'👨‍🍳',desc:'주방 알바 이동·판단 속도 증가'},
 helperSkill2:{name:'주방 알바 숙련 2',price:5000,min:0,max:1,minStars:3,requires:'helperSkill1',category:'staff',icon:'⚡',desc:'주방 알바가 더 빠르게 다음 일을 찾음'},
 menuPlus:{name:'토핑 메뉴 연구',price:3500,min:0,max:1,minStars:3,category:'menu',icon:'📖',desc:'계란 파 라면·치즈 파 라면 주문 해금'},
 hallExpansion:{name:'홀 확장 공사',price:8000,min:0,max:1,minStars:4,requires:'table4',category:'expansion',icon:'🏗️',desc:'공사 가림벽 철거 · 확장 구역과 5번 테이블 개방'},
 famousSign:{name:'동네 명물 간판',price:18000,min:0,max:1,minStars:5,requires:'hallExpansion',category:'expansion',icon:'🌟',desc:'가게 외관 변화 · 모든 메뉴 매출 +10%'}
};
const SHOP_ITEMS={...EQUIPMENT,...UPGRADES};
const SHOP_CATEGORY_LABELS={kitchen:'🍳 주방',automation:'⚙️ 자동화',hall:'🪑 홀',staff:'🧑‍🍳 직원',menu:'📖 메뉴',expansion:'🏗️ 확장'};
const REP_THRESHOLDS=[0,8,24,55,100];
const SMART_FILTERS=['noodle','soup','egg','green','cheese'];
const $=s=>document.querySelector(s);

const INGREDIENTS={
 water:{name:'물',icon:'💧'},
 noodle:{name:'면',icon:'🍜'},
 soup:{name:'스프',icon:'🟥'},
 egg:{name:'계란',icon:'🥚',model:'egg.glb'},
 green:{name:'대파',icon:'🌿',model:'leek.glb'},
 cheese:{name:'치즈',icon:'🧀',model:'cheese-cut.glb'}
};
const RECIPES=[
 {id:'egg',name:'계란 라면',need:['noodle','soup','egg'],price:900},
 {id:'green',name:'파 라면',need:['noodle','soup','green'],price:900},
 {id:'cheeseEgg',name:'치즈 계란 라면',need:['noodle','soup','egg','cheese'],price:1200},
 {id:'eggGreen',name:'계란 파 라면',need:['noodle','soup','egg','green'],price:1150,unlock:'menuPlus'},
 {id:'cheeseGreen',name:'치즈 파 라면',need:['noodle','soup','green','cheese'],price:1250,unlock:'menuPlus'}
];
const ACTION_NAMES={water:'물 붓기',noodle:'면 넣기',soup:'스프 넣기',egg:'계란 넣기',green:'대파 넣기',cheese:'치즈 넣기',plate:'그릇에 담기',discard:'냄비 비우기'};
const CUSTOMER_ICONS=['👧','👦','👩','🧑','👵','👨'];
const CUSTOMER_MODELS=[
 {root:PEOPLE,file:'character-female-b.glb'},{root:PEOPLE,file:'character-male-a.glb'},
 {root:NPCS,file:'Casual_Female.gltf'},{root:NPCS,file:'Casual_Male.gltf'},
 {root:NPCS,file:'OldClassy_Female.gltf'},{root:NPCS,file:'OldClassy_Male.gltf'},
 {root:NPCS,file:'Suit_Female.gltf'},{root:NPCS,file:'Suit_Male.gltf'}
];

const els={
 canvas:$('#gameCanvas'),orders:$('#orderStrip'),pots:$('#potStrip'),revenue:$('#revenue'),goal:$('#goal'),time:$('#time'),served:$('#served'),combo:$('#comboStat'),
 selected:$('#selectedAction'),trayBtn:$('#trayBtn'),trayText:$('#trayText'),trayQuality:$('#trayQuality'),dock:$('#actionDock'),
 tutorialBanner:$('#tutorialBanner'),tutorialText:$('#tutorialText'),discard:$('#discardBtn'),
 toast:$('#toast'),start:$('#startOverlay'),end:$('#endOverlay'),endTitle:$('#endTitle'),endText:$('#endText'),
 endRevenue:$('#endRevenue'),endServed:$('#endServed'),endPerfect:$('#endPerfect'),endRep:$('#endRep'),sound:$('#soundBtn'),bankCash:$('#bankCash'),shopCash:$('#shopCash'),shopRep:$('#shopRep'),shopTabs:$('#shopTabs'),equipmentShop:$('#equipmentShop'),repHud:$('#repHud'),repStars:$('#repStars'),
 prepBar:$('#prepBar'),openShop:$('#openShopBtn'),rotate:$('#rotateStationBtn'),smartFilter:$('#smartFilterBtn'),stationHint:$('#stationHint'),dishStatus:$('#dishStatus'),moveControls:$('#moveControls'),heldStatus:$('#heldStatus'),helper:$('#helperBtn'),taskPanel:$('#taskPanel'),taskList:$('#taskList'),taskProgress:$('#taskProgress')
};


function defaultProgress(){
 const owned={};for(const [key,info] of Object.entries(SHOP_ITEMS))owned[key]=info.min||0;
 return{version:3,cash:0,shifts:0,tutorialDone:false,reputation:0,satisfied:0,owned:{...owned,prepCounter:2},filters:{smartGrabberA:'noodle'},layout:{}}
}
function normalizeProgress(raw){
 const base=defaultProgress(),v=raw&&typeof raw==='object'?raw:{},layoutOk=Number(v.version)>=2;
 const out={version:3,cash:Math.max(0,Math.floor(Number(v.cash)||0)),shifts:Math.max(0,Math.floor(Number(v.shifts)||0)),tutorialDone:!!v.tutorialDone,reputation:Math.max(0,Math.floor(Number(v.reputation)||0)),satisfied:Math.max(0,Math.floor(Number(v.satisfied)||0)),owned:{},filters:{...base.filters,...(v.filters||{})},layout:layoutOk&&v.layout&&typeof v.layout==='object'?v.layout:{}};
 for(const [key,info] of Object.entries(SHOP_ITEMS)){
  const n=Math.floor(Number(v.owned?.[key]));
  out.owned[key]=Math.max(info.min||0,Math.min(info.max||1,Number.isFinite(n)?n:(base.owned[key]||0)))
 }
 if(!SMART_FILTERS.includes(out.filters.smartGrabberA))out.filters.smartGrabberA='noodle';
 return out
}
function loadProgress(){
 try{return normalizeProgress(window.KidscadeStorage?.getJson?.(SAVE_KEY,null))}catch(_){return defaultProgress()}
}
function saveProgress(){
 try{return Boolean(window.KidscadeStorage?.setJson?.(SAVE_KEY,progress))}catch(_){return false}
}
const progress=loadProgress();

function newPot(i){
 return{index:i,orderId:null,water:0,ingredients:[],sequence:[],heat:0,noodleTime:0,mistakes:0,burnt:false,plating:false};
}
let restaurant=null;
const state={
 running:false,phase:'idle',sound:true,nextOrder:1,spawnClock:0,last:0,raf:0,uiClock:0,selectedPot:null,tray:null,busy:false,closing:false,
 cleanPlates:3,dirtyPlates:0,washing:false,heldItem:null,helperUnlocked:false,helperEnabled:false,combo:0,maxCombo:0,
 tutorial:{active:true,step:0},discardArmedUntil:0,discardArmedPot:null,trayDiscardArmedUntil:0,heldDiscardArmedUntil:0,
 pots:Array.from({length:POT_COUNT},(_,i)=>newPot(i)),
 get time(){return restaurant?.shift.remaining??SHIFT_SECONDS},
 set time(value){if(restaurant)restaurant.shift.remaining=Math.max(0,Number(value)||0)},
 get revenue(){return restaurant?.economy.revenue??0},
 set revenue(value){if(restaurant)restaurant.economy.revenue=Math.max(0,Number(value)||0)},
 get served(){return restaurant?.economy.served??0},
 set served(value){if(restaurant)restaurant.economy.served=Math.max(0,Math.floor(Number(value)||0))},
 get perfect(){return restaurant?.economy.perfect??0},
 set perfect(value){if(restaurant)restaurant.economy.perfect=Math.max(0,Math.floor(Number(value)||0))},
 get missed(){return restaurant?.economy.missed??0},
 set missed(value){if(restaurant)restaurant.economy.missed=Math.max(0,Math.floor(Number(value)||0))},
 get orders(){return restaurant?.orders.items??[]},
 set orders(value){if(restaurant)restaurant.orders.replace(Array.isArray(value)?value:[])}
};

restaurant=new RestaurantEngine({
 items:Object.entries(INGREDIENTS).map(([id,item])=>({id,...item})),
 recipes:RECIPES,
 order:{
  maxOrders:MAX_ORDERS,
  basePatience:100,
  decayPerSecond:({context})=>.84+(Number(context?.served)||0)*.012
 },
 economy:{perfectQuality:90},
 shift:{duration:SHIFT_SECONDS,targetRevenue:TARGET_REVENUE},
 pricing:({recipe,quality,order})=>Math.max(200,Math.round((((recipe?.price||0)*(.48+.52*quality/100)+(order?.patience||0))*(hasUpgrade('famousSign')?1.10:1))*.01)*100)
});

window.__bunsikKitchenOwnAudio=true;
function sfx(key,opt={}){if(!state.sound)return;try{window.KidscadeAudio?.play?.(key,opt)}catch(_){}}
function money(n){return Math.max(0,Math.round(n)).toLocaleString('ko-KR')+'원'}
function hasUpgrade(key){return (progress.owned?.[key]||0)>0}
function reputationStars(points=progress.reputation){
 let stars=1;for(let i=1;i<REP_THRESHOLDS.length;i++)if(points>=REP_THRESHOLDS[i])stars=i+1;return stars
}
function reputationLabel(){return'★'.repeat(reputationStars())+'☆'.repeat(5-reputationStars())}
function availableRecipeIds(){
 return RECIPES.filter(r=>!r.unlock||hasUpgrade(r.unlock)).map(r=>r.id)
}
function addServeReputation(quality){
 const gain=quality>=90?2:quality>=76?1:0;if(quality>=58)progress.satisfied+=1;if(gain)progress.reputation+=gain;return gain
}
function toast(t,ms=1300){els.toast.textContent=t;els.toast.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>els.toast.classList.remove('show'),ms)}
function recipeById(id){return restaurant.recipes.get(id)}
function ingredientLabel(id){return INGREDIENTS[id]?.name||id}

class RamenKitchen3D{
 constructor(canvas){
  this.canvas=canvas;
  this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.65));
  this.renderer.outputColorSpace=THREE.SRGBColorSpace;
  this.renderer.shadowMap.enabled=true;
  this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
  this.renderer.toneMappingExposure=1.04;

  this.scene=new THREE.Scene();
  this.scene.background=new THREE.Color(0xf1d2aa);
  this.scene.fog=new THREE.Fog(0xf1d2aa,22,42);
  this.camera=new THREE.PerspectiveCamera(42,1,.1,80);
  this.loader=new GLTFLoader();
  this.cache=new Map();
  this.clock=0;
  this.pickables=[];
  this.potVisuals=[];
  this.customerHolders=[];
  this.customerXs=[-3.3,-1.1,1.1,3.3,0];
  this.hallSeats=[];this.hallTableGroups=[];this.customerStates=[];this.dishCartModel=null;this.dishCartQueue=[];this.dishCartTask=null;this.dishCartHome=new THREE.Vector3(-7.7,.02,-6.1);this.dishReturnPoint=new THREE.Vector3(-3.55,0,-4.35);this.hallExpansionLocked=null;this.hallExpansionOpen=null;this.hallEntrance=new THREE.Vector3(0,0,-15.15);this.hallDoor=null;this.hallDoorOpenUntil=0;this.hallSign=null;this.hallFamousSign=null;
  this.serviceGroup=null;this.serviceMeal=null;this.serviceHome=new THREE.Vector3(0,.92,5.25);
  this.cameraFocus=new THREE.Vector3(0,.9,.5);this.cameraGoal=new THREE.Vector3(0,10.5,10.8);this.hallFocusUntil=0;this.hallFocusSlot=null;
  this.raycaster=new THREE.Raycaster();
  this.pointer=new THREE.Vector2();
  this.layoutStations=[];this.stationPickables=[];this.dragLayout=null;this.selectedLayoutStation=null;
  this.player=null;this.playerRing=null;this.carryAnchor=null;this.carrySprite=null;this.moveKeys=new Set();this.nearestStation=null;this.dirtyPlateModels=[];this.staticBlockers=[];
  this.helper=null;this.helperCarryAnchor=null;this.helperCarry=null;this.helperTask=null;this.helperPath=[];this.helperThink=0;this.hallWorker=null;this.hallWorkerCarry=null;this.hallWorkerHome=new THREE.Vector3(2.6,0,-4.75);this.hallAutoHandoff=false;
  this.avatarSheetImage=null;this.avatarSheetPromise=null;

  this.makeLights();
  this.makeRoom();
  this.makeBurners();
  this.makeKitchenProps();
  this.makeDiningHall();
  this.makePlateupStations();
  this.makeCustomers();
  this.makeServiceStation();
  this.makePlayer();
  this.makeHelper();
  this.makeHallWorker();
  this.syncProgressUpgrades();
  this.resize();
  addEventListener('resize',()=>this.resize(),{passive:true});
  canvas.addEventListener('pointerdown',e=>this.pointerDown(e));
  canvas.addEventListener('pointermove',e=>this.pointerMove(e));
  canvas.addEventListener('pointerup',e=>this.pointerUp(e));
 }
 material(color,opt={}){return new THREE.MeshStandardMaterial({color,roughness:opt.roughness??.72,metalness:opt.metalness??0,transparent:!!opt.transparent,opacity:opt.opacity??1,emissive:opt.emissive??0x000000,emissiveIntensity:opt.emissiveIntensity??0})}
 box(w,h,d,color,x,y,z,opt={}){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),this.material(color,opt));m.position.set(x,y,z);m.castShadow=opt.castShadow!==false;m.receiveShadow=true;this.scene.add(m);return m}
 makeLights(){
  this.scene.add(new THREE.HemisphereLight(0xfff5dd,0x775541,2.2));
  const sun=new THREE.DirectionalLight(0xfff5df,3.1);sun.position.set(-5,11,8);sun.castShadow=true;sun.shadow.mapSize.set(1536,1536);sun.shadow.camera.left=-9;sun.shadow.camera.right=9;sun.shadow.camera.top=8;sun.shadow.camera.bottom=-8;this.scene.add(sun);
  const warm=new THREE.PointLight(0xffc26b,10,14,2);warm.position.set(0,5,-2.5);this.scene.add(warm);
 }
 makeRoom(){
  // v24: 기존 주방은 유지하고 카운터 뒤쪽으로 손님 홀을 확장한다.
  this.box(20.4,.3,21.6,0xc58d5b,0,-.18,-3.55);
  this.box(.24,3.5,21.6,0xe7d4bb,-10.08,1.55,-3.55);
  this.box(.24,3.5,21.6,0xe7d4bb,10.08,1.55,-3.55);

  // 뒤 벽 가운데 2.2m는 실제 출입문 자리로 비운다.
  this.box(9.1,3.5,.25,0xf5ead7,-5.65,1.55,-14.28);
  this.box(9.1,3.5,.25,0xf5ead7,5.65,1.55,-14.28);
  this.box(2.2,1.08,.25,0xf5ead7,0,2.96,-14.28);
  this.box(19.7,.58,.12,0xb93f35,0,.52,-14.08,{roughness:.7});
  this.box(5.4,1.15,.09,0x27383a,0,2.02,-14.02,{roughness:.5});
  this.box(4.7,.055,.09,0xf3d46e,0,2.36,-13.96);

  for(const x of[-6.4,0,6.4]){
   const lamp=new THREE.PointLight(0xffd28a,5.5,7.5,2);lamp.position.set(x,3.25,-.8);this.scene.add(lamp);
   const hallLamp=new THREE.PointLight(0xffdf9a,4.2,7.5,2);hallLamp.position.set(x,3.15,-9.2);this.scene.add(hallLamp);
  }

  const kitchenGrid=new THREE.GridHelper(19.2,18,0x94654a,0xe1bc91);kitchenGrid.position.set(0,.005,.35);kitchenGrid.scale.z=.7;kitchenGrid.material.transparent=true;kitchenGrid.material.opacity=.22;this.scene.add(kitchenGrid);
  const hallFloor=this.box(19.4,.045,8.6,0xd5ad78,0,.003,-9.45,{roughness:.9,castShadow:false});hallFloor.receiveShadow=true;
  const hallGrid=new THREE.GridHelper(18.6,16,0x9f7455,0xe7c89f);hallGrid.position.set(0,.03,-9.45);hallGrid.scale.z=.47;hallGrid.material.transparent=true;hallGrid.material.opacity=.14;this.scene.add(hallGrid);

  const doorPivot=this.hallDoor=new THREE.Group();doorPivot.position.set(-1.05,.02,-14.12);this.scene.add(doorPivot);
  this.loadModel(BAKERY,'door-modular.glb',2.35).then(o=>{if(o){o.position.x+=1.05;o.rotation.y=Math.PI;doorPivot.add(o)}});
  const mat=this.box(2.5,.035,1.15,0x86543d,0,.035,-13.35,{roughness:.9,castShadow:false});mat.receiveShadow=true;
  const porch=this.box(3.4,.08,1.65,0xa98a6c,0,-.03,-14.88,{roughness:.95,castShadow:false});porch.receiveShadow=true;
 }
 async loadModel(root,file,size){
  const key=root+file;
  try{
   let src=this.cache.get(key);
   if(!src){const gltf=await this.loader.loadAsync(key);src=gltf.scene;this.cache.set(key,src)}
   const obj=src.clone(true);obj.updateMatrixWorld(true);
   const b=new THREE.Box3().setFromObject(obj),sz=b.getSize(new THREE.Vector3());
   obj.scale.setScalar(size/(Math.max(sz.x,sz.y,sz.z)||1));obj.updateMatrixWorld(true);
   const b2=new THREE.Box3().setFromObject(obj),c=b2.getCenter(new THREE.Vector3());
   obj.position.set(-c.x,-b2.min.y,-c.z);
   obj.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true}});
   return obj;
  }catch(err){console.warn('[bunsik] asset fallback',file,err);return null}
 }
 placeModel(root,file,size,x,y,z,rot=0){
  const holder=new THREE.Group();holder.position.set(x,y,z);holder.rotation.y=rot;this.scene.add(holder);
  this.loadModel(root,file,size).then(o=>{if(o)holder.add(o)});
  return holder;
 }
 loadAvatarSheet(){
  if(this.avatarSheetImage?.complete&&this.avatarSheetImage.naturalWidth)return Promise.resolve(this.avatarSheetImage);
  if(this.avatarSheetPromise)return this.avatarSheetPromise;
  this.avatarSheetPromise=new Promise(resolve=>{
   const img=new Image();img.decoding='async';img.onload=()=>{this.avatarSheetImage=img;resolve(img)};img.onerror=()=>resolve(null);img.src=AVATAR_SHEET
  });
  return this.avatarSheetPromise
 }
 makeCuteCook(role='player'){
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
  const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.NearestFilter;texture.minFilter=THREE.NearestFilter;
  const material=new THREE.SpriteMaterial({map:texture,transparent:true,alphaTest:.025,depthWrite:false});
  const sprite=new THREE.Sprite(material);sprite.center.set(.5,.02);sprite.position.set(0,.02,0);sprite.scale.set(1.9,1.9,1);
  const look={role,canvas,ctx,texture,sprite,img:null,key:'',faceRight:false};
  this.loadAvatarSheet().then(img=>{look.img=img;this.paintCuteCook(look,false,false,true)});
  this.paintCuteCook(look,false,false,true);
  return look
 }
 paintCuteCook(look,moving=false,faceRight=false,force=false){
  if(!look)return;
  const frames=moving?[2,3,4,5]:[0,1],speed=moving?.14:.48,index=frames[Math.floor(this.clock/speed)%frames.length],key=index+':'+(faceRight?'R':'L');
  if(!force&&look.key===key)return;look.key=key;look.faceRight=faceRight;
  const {ctx,canvas,img}=look;ctx.clearRect(0,0,128,128);ctx.save();
  if(faceRight){ctx.translate(128,0);ctx.scale(-1,1)}
  if(img?.complete&&img.naturalWidth>=128*(index+1))ctx.drawImage(img,index*128,0,128,128,0,0,128,128);
  else{
   ctx.fillStyle='#f0b98d';ctx.fillRect(48,30,32,30);ctx.fillStyle='#3a2b28';ctx.fillRect(45,20,38,15);
   ctx.fillStyle=look.role==='player'?'#d95746':'#4d8ec7';ctx.fillRect(48,61,32,42);ctx.fillStyle='#f0b98d';ctx.fillRect(42,66,7,29);ctx.fillRect(79,66,7,29)
  }
  // 분식집 전용 픽셀 셰프 모자.
  ctx.fillStyle='#fffdf6';ctx.strokeStyle='#6f655d';ctx.lineWidth=2;
  ctx.beginPath();ctx.roundRect?.(39,8,50,20,7);ctx.fill();ctx.stroke();
  ctx.fillRect(44,22,40,9);ctx.strokeRect(44,22,40,9);
  // 앞치마가 멀리서도 보이도록 몸통 중앙을 단순한 색면으로 강조.
  const apron=look.role==='player'?'#d95343':look.role==='hall'?'#e5a83d':'#4b8fc7',trim=look.role==='player'?'#8f3028':look.role==='hall'?'#8f6120':'#285a83';
  ctx.fillStyle=apron;ctx.fillRect(49,72,31,30);ctx.fillStyle='#fff6df';ctx.fillRect(57,75,15,4);
  ctx.fillStyle=trim;ctx.fillRect(49,98,31,4);ctx.fillRect(62,69,4,6);
  ctx.restore();look.texture.needsUpdate=true
 }
 makeBurners(){
  const xs=[-3.15,-1.05,1.05,3.15],z=-.05;
  xs.forEach((x,i)=>{
   const root=new THREE.Group();root.position.set(x,0,z);this.scene.add(root);
   const counter=new THREE.Mesh(new THREE.BoxGeometry(1.58,.8,1.72),this.material(0x394447,{roughness:.52,metalness:.18}));counter.position.y=.39;counter.castShadow=true;counter.receiveShadow=true;root.add(counter);
   const top=new THREE.Mesh(new THREE.BoxGeometry(1.5,.13,1.64),this.material(0x202829,{roughness:.35,metalness:.45}));top.position.y=.84;root.add(top);
   const burner=new THREE.Mesh(new THREE.TorusGeometry(.47,.062,10,34),new THREE.MeshStandardMaterial({color:0x30383a,roughness:.35,metalness:.62,emissive:0xff5b25,emissiveIntensity:.08}));burner.rotation.x=Math.PI/2;burner.position.set(0,.93,.02);root.add(burner);
   const flame=new THREE.PointLight(0xff6a2b,0,2.7,2);flame.position.set(0,.98,.02);root.add(flame);

   const potGroup=new THREE.Group();potGroup.position.set(0,.99,.02);root.add(potGroup);
   const potBody=new THREE.Mesh(new THREE.CylinderGeometry(.58,.53,.43,28,1,true),this.material(0x69787b,{roughness:.32,metalness:.72}));potBody.position.y=.22;potGroup.add(potBody);
   const rim=new THREE.Mesh(new THREE.TorusGeometry(.57,.04,8,32),this.material(0xaab6b6,{roughness:.25,metalness:.8}));rim.rotation.x=Math.PI/2;rim.position.y=.44;potGroup.add(rim);
   const handle=new THREE.Mesh(new THREE.BoxGeometry(.48,.08,.11),this.material(0x343a3b,{roughness:.55}));handle.position.set(.78,.31,0);potGroup.add(handle);

   const liquid=new THREE.Mesh(new THREE.CylinderGeometry(.5,.5,.032,30),new THREE.MeshStandardMaterial({color:0x74cbe8,roughness:.28,transparent:true,opacity:.82,emissive:0x173843,emissiveIntensity:.08}));liquid.position.y=.425;liquid.visible=false;potGroup.add(liquid);
   const foodGroup=new THREE.Group();foodGroup.position.y=.46;potGroup.add(foodGroup);
   const noodleGroup=new THREE.Group();noodleGroup.position.y=.47;potGroup.add(noodleGroup);
   for(let n=0;n<4;n++){const noodle=new THREE.Mesh(new THREE.TorusGeometry(.2+n*.038,.021,5,24,Math.PI*1.62),new THREE.MeshStandardMaterial({color:0xf0ce69,roughness:.76}));noodle.rotation.x=Math.PI/2;noodle.rotation.z=n*.72;noodle.position.y=n*.012;noodleGroup.add(noodle)}
   noodleGroup.visible=false;

   const steam=new THREE.Group();steam.position.y=.61;potGroup.add(steam);
   for(let n=0;n<5;n++){const puff=new THREE.Mesh(new THREE.SphereGeometry(.08+n*.007,10,7),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.18,depthWrite:false}));puff.position.set((n-2)*.11,n*.12,(n%2-.5)*.1);steam.add(puff)}
   steam.visible=false;

   const selectRing=new THREE.Mesh(new THREE.RingGeometry(.67,.78,36),new THREE.MeshBasicMaterial({color:0xffe27b,transparent:true,opacity:.9,depthWrite:false}));selectRing.rotation.x=-Math.PI/2;selectRing.position.y=.88;root.add(selectRing);selectRing.visible=i===0;

   const pick=new THREE.Mesh(new THREE.CylinderGeometry(.78,.78,1.05,16),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));pick.position.y=1.18;pick.userData.potIndex=i;root.add(pick);this.pickables.push(pick);
   const actionTile=this.makeFloorActionTile('냄비 '+(i+1));actionTile.position.set(0,.027,1.28);root.add(actionTile);

   this.potVisuals.push({root,burner,flame,potGroup,liquid,foodGroup,noodleGroup,steam,selectRing,actionTile});
   this.placeModel(KITCHEN,'stove.glb',1.12,x,.02,z+.04,0);
  });
 } makeTextSprite(text){
  const c=document.createElement('canvas');c.width=256;c.height=80;const g=c.getContext('2d');g.fillStyle='rgba(49,36,28,.88)';g.beginPath();g.roundRect?.(18,12,220,52,18);g.fill();g.fillStyle='#fff8ec';g.font='900 26px system-ui';g.textAlign='center';g.textBaseline='middle';g.fillText(text,128,39);
  const tex=new THREE.CanvasTexture(c);const mat=new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false});const sp=new THREE.Sprite(mat);sp.scale.set(1.28,.4,1);return sp
 }
 roundedRectPath(g,x,y,w,h,r){
  const rr=Math.min(r,w/2,h/2);g.beginPath();g.moveTo(x+rr,y);g.lineTo(x+w-rr,y);g.quadraticCurveTo(x+w,y,x+w,y+rr);g.lineTo(x+w,y+h-rr);g.quadraticCurveTo(x+w,y+h,x+w-rr,y+h);g.lineTo(x+rr,y+h);g.quadraticCurveTo(x,y+h,x,y+h-rr);g.lineTo(x,y+rr);g.quadraticCurveTo(x,y,x+rr,y);g.closePath()
 }
 makeFloorActionTile(text,opt={}){
  const c=document.createElement('canvas');c.width=384;c.height=384;const g=c.getContext('2d');
  const active=opt.active!==false,fill=opt.fill||'rgba(255,247,210,.64)',line=opt.line||'rgba(108,80,45,.78)';
  this.roundedRectPath(g,24,24,336,336,58);g.fillStyle=fill;g.fill();
  g.save();g.setLineDash([20,14]);g.lineWidth=10;g.strokeStyle=line;this.roundedRectPath(g,28,28,328,328,54);g.stroke();g.restore();
  g.fillStyle=opt.textColor||'#4a392b';g.font='900 54px "Noto Sans KR",system-ui,sans-serif';g.textAlign='center';g.textBaseline='middle';
  const label=String(text||'').replace(' · 물/설거지','');g.fillText(label,192,192,290);
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=Math.min(4,this.renderer.capabilities.getMaxAnisotropy?.()||1);
  const mat=new THREE.MeshBasicMaterial({map:tex,transparent:true,opacity:active?.82:.42,depthWrite:false,side:THREE.DoubleSide});
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(opt.width||1.45,opt.height||1.45),mat);mesh.rotation.x=-Math.PI/2;mesh.position.y=.026;mesh.renderOrder=3;mesh.userData.floorLabel=text;return mesh
 }
 floorLabelForStation(id,label){
  if(id==='sink')return'싱크대';if(id==='noodleSource')return'면';if(id==='soupSource')return'스프';if(id==='fridge')return'토핑';
  if(id==='rack')return'접시';if(id.startsWith('prepCounter'))return label.replace('조리대 ','조리대 ');
  return label
 }
 actionOffsetForWorld(x,z){
  if(Math.abs(x)>6)return{x:x>0?-1.25:1.25,z:0};
  if(z<-1.55)return{x:0,z:1.22};
  if(z>4.25)return{x:0,z:-1.18};
  return{x:0,z:1.18}
 }
 attachStationFloorTile(holder,id,label){
  if(!holder)return null;
  const tile=this.makeFloorActionTile(this.floorLabelForStation(id,label));this.scene.add(tile);holder.userData.actionTile=tile;this.updateStationFloorTile(holder);return tile
 }
 updateStationFloorTile(holder){
  const tile=holder?.userData?.actionTile;if(!tile)return;
  const off=this.actionOffsetForWorld(holder.position.x,holder.position.z);
  tile.position.set(holder.position.x+off.x,.027,holder.position.z+off.z);
  tile.rotation.set(-Math.PI/2,0,0)
 }
 makeRoleFloorLabel(text,color='#f1c85c'){
  const c=document.createElement('canvas');c.width=384;c.height=128;const g=c.getContext('2d');
  this.roundedRectPath(g,18,16,348,96,34);g.fillStyle='rgba(48,38,31,.76)';g.fill();g.setLineDash([12,9]);g.lineWidth=5;g.strokeStyle=color;this.roundedRectPath(g,21,19,342,90,31);g.stroke();
  g.setLineDash([]);g.fillStyle='#fff9ed';g.font='900 48px "Noto Sans KR",system-ui,sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(text,192,64);
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const mat=new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,side:THREE.DoubleSide});
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1.15,.38),mat);mesh.rotation.x=-Math.PI/2;mesh.position.set(0,.032,.58);mesh.renderOrder=4;return mesh
 }
 makeKitchenProps(){
  this.placeModel(SUSHI,'table.glb',1.2,-8.35,.02,5.7,0);
  this.placeModel(SUSHI,'chair.glb',.82,-9.0,.02,5.7,Math.PI/2);
 }
 makeDiningHall(){
  const defs=[
   {tableNo:1,x:-4.65,z:-6.65,seatX:-4.65,seatZ:-5.55,rot:Math.PI},
   {tableNo:2,x:4.65,z:-6.65,seatX:4.65,seatZ:-5.55,rot:Math.PI},
   {tableNo:3,x:-4.65,z:-10.25,seatX:-4.65,seatZ:-9.15,rot:Math.PI,upgrade:'table3'},
   {tableNo:4,x:4.65,z:-10.25,seatX:4.65,seatZ:-9.15,rot:Math.PI,upgrade:'table4'},
   {tableNo:5,x:7.45,z:-10.35,seatX:7.45,seatZ:-9.25,rot:Math.PI,upgrade:'hallExpansion'}
  ];
  defs.forEach((d,i)=>{
   const group=new THREE.Group();group.position.set(d.x,0,d.z);this.scene.add(group);this.hallTableGroups.push(group);
   const rug=new THREE.Mesh(new THREE.BoxGeometry(3.05,.025,2.75),this.material(i%2?0xe8cba8:0xefd7b7,{roughness:.96}));rug.position.y=.024;rug.receiveShadow=true;group.add(rug);
   this.loadModel(SUSHI,'table.glb',1.55).then(o=>{if(o){o.position.y=.03;group.add(o);const box=new THREE.Box3().setFromObject(o),top=Math.max(.62,Math.min(1.18,box.max.y+.05));dishAnchor.position.y=top}});
   this.loadModel(SUSHI,'chair.glb',.92).then(o=>{if(o){o.position.set(0,.03,1.08);o.rotation.y=Math.PI;group.add(o)}});
   this.loadModel(SUSHI,'chair.glb',.92).then(o=>{if(o){o.position.set(0,.03,-1.08);group.add(o)}});
   const dishAnchor=new THREE.Group();dishAnchor.position.set(0,.86,0);group.add(dishAnchor);
   const enabled=!d.upgrade||hasUpgrade(d.upgrade);group.visible=enabled;
   this.hallSeats.push({slot:i,tableNo:d.tableNo,position:new THREE.Vector3(d.seatX,0,d.seatZ),tablePosition:new THREE.Vector3(d.x,0,d.z),rotation:d.rot,occupiedBy:null,upgrade:d.upgrade||null,enabled,dishAnchor,dishMode:'none',dishToken:0})
  });
  const aisle=this.box(2.2,.026,8.1,0xc99664,0,.028,-9.45,{roughness:.92,castShadow:false});aisle.receiveShadow=true;

  // 셀프 반납대: 퇴식 카트가 없을 때 손님이 직접 빈 그릇을 가져오는 곳.
  const returnBase=this.box(2.35,.72,.72,0x5a776e,-3.55,.36,-4.28,{roughness:.62});
  const returnTop=this.box(2.45,.08,.82,0xe0c28e,-3.55,.76,-4.28,{roughness:.48});
  const returnSign=this.makeTextSprite('그릇 반납');returnSign.position.set(-3.55,1.34,-4.22);returnSign.scale.set(1.25,.38,1);this.scene.add(returnSign);

  // 홀 확장 전에는 실제로 오른쪽 뒤 공간을 막아 둔다.
  this.hallExpansionLocked=new THREE.Group();this.scene.add(this.hallExpansionLocked);
  const blockedFloor=new THREE.Mesh(new THREE.BoxGeometry(3.25,.055,6.4),this.material(0x756f69,{roughness:.95}));blockedFloor.position.set(7.95,.055,-10.1);this.hallExpansionLocked.add(blockedFloor);
  const partition=new THREE.Mesh(new THREE.BoxGeometry(.18,2.35,6.35),this.material(0xb99a77,{roughness:.88}));partition.position.set(6.22,1.16,-10.05);this.hallExpansionLocked.add(partition);
  const board=this.makeTextSprite('🚧 확장 공사 예정');board.position.set(6.08,1.55,-8.25);board.scale.set(1.75,.5,1);this.hallExpansionLocked.add(board);

  this.hallExpansionOpen=new THREE.Group();this.scene.add(this.hallExpansionOpen);
  const openFloor=new THREE.Mesh(new THREE.BoxGeometry(3.25,.04,6.4),this.material(0xd8b17d,{roughness:.9}));openFloor.position.set(7.95,.045,-10.1);this.hallExpansionOpen.add(openFloor);
  const openLamp=new THREE.PointLight(0xffdf9a,3.4,5.5,2);openLamp.position.set(7.7,3.0,-10.1);this.hallExpansionOpen.add(openLamp);

  this.hallSign=this.makeTextSprite('어서오세요');this.hallSign.position.set(0,2.25,-13.82);this.hallSign.scale.set(1.7,.5,1);this.scene.add(this.hallSign);
  this.hallFamousSign=this.makeTextSprite('★ 동네 명물 분식집 ★');this.hallFamousSign.position.set(0,2.28,-13.8);this.hallFamousSign.scale.set(2.8,.62,1);this.scene.add(this.hallFamousSign);this.hallFamousSign.visible=hasUpgrade('famousSign');
  this.dishCartModel=this.placeModel(MARKET,'shopping-cart.glb',1.15,this.dishCartHome.x,this.dishCartHome.y,this.dishCartHome.z,Math.PI/2);this.dishCartModel.visible=hasUpgrade('dishCart');
  const cartLabel=this.makeRoleFloorLabel('퇴식 카트','#9ed6c4');cartLabel.position.set(0,.03,.72);cartLabel.scale.set(.78,.78,.78);this.dishCartModel.add(cartLabel)
 }
 setSeatDish(seat,mode='none'){
  if(!seat?.dishAnchor)return;seat.dishMode=mode;seat.dishToken=(seat.dishToken||0)+1;const token=seat.dishToken;
  while(seat.dishAnchor.children.length)seat.dishAnchor.remove(seat.dishAnchor.children[0]);
  if(mode==='none')return;
  const file=mode==='meal'?'ramen.glb':'plate.glb',scale=mode==='meal'?.66:.62;
  this.loadModel(SUSHI,file,scale).then(o=>{if(!o||seat.dishToken!==token||seat.dishMode!==mode)return;o.position.y=.02;seat.dishAnchor.add(o)})
 }
 setCustomerDishCarry(c,show){
  if(!c?.holder)return;
  const old=c.holder.getObjectByName('dirtyDishCarry');if(old)c.holder.remove(old);
  if(!show)return;
  const sp=this.makeItemSprite({kind:'dirty'});sp.name='dirtyDishCarry';sp.position.set(.28,1.16,.12);sp.scale.set(.52,.52,1);c.holder.add(sp)
 }
 queueDishCart(c){
  if(!c?.seat||!hasUpgrade('dishCart'))return;
  if(!this.dishCartQueue.includes(c.seat.slot))this.dishCartQueue.push(c.seat.slot)
 }
 syncProgressUpgrades(){
  this.hallSeats.forEach((seat,i)=>{
   const enabled=!seat.upgrade||hasUpgrade(seat.upgrade);seat.enabled=enabled;
   if(this.hallTableGroups[i])this.hallTableGroups[i].visible=enabled
  });
  if(this.hallWorker)this.hallWorker.visible=hasUpgrade('hallStaff');
  if(this.dishCartModel)this.dishCartModel.visible=hasUpgrade('dishCart');
  if(this.hallExpansionLocked)this.hallExpansionLocked.visible=!hasUpgrade('hallExpansion');
  if(this.hallExpansionOpen)this.hallExpansionOpen.visible=hasUpgrade('hallExpansion');
  if(this.hallSign)this.hallSign.visible=!hasUpgrade('famousSign');
  if(this.hallFamousSign)this.hallFamousSign.visible=hasUpgrade('famousSign')
 }
 makeLayoutStation(id,label,root,file,size,x,z,rot=0,radius=.82){
  const holder=new THREE.Group();holder.position.set(x,0,z);holder.rotation.y=rot;holder.userData.stationId=id;holder.userData.blockRadius=radius;this.scene.add(holder);
  const pick=new THREE.Mesh(new THREE.BoxGeometry(1.8,1.7,1.8),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));
  pick.position.y=.8;pick.userData.layoutStation=holder;holder.add(pick);this.stationPickables.push(pick);
  const ring=new THREE.Mesh(new THREE.RingGeometry(.72,.9,32),new THREE.MeshBasicMaterial({color:0x5bd0ff,transparent:true,opacity:.0,depthWrite:false}));
  ring.rotation.x=-Math.PI/2;ring.position.y=.02;holder.add(ring);holder.userData.ring=ring;
  this.attachStationFloorTile(holder,id,label);
  this.loadModel(root,file,size).then(o=>{if(o)holder.add(o)});
  this.layoutStations.push({id,label,group:holder});
  return holder
 }
 makePrepCounter(id,label,x,z,rot=0,equipmentIndex=0){
  const holder=this.makeLayoutStation(id,label,SUSHI,'counter-straight.glb',1.85,x,z,rot,.78);
  holder.userData.storageSlot=true;holder.userData.storedItem=null;holder.userData.equipmentKey='prepCounter';holder.userData.equipmentIndex=equipmentIndex;
  const anchor=new THREE.Group();anchor.position.set(0,1.15,0);holder.add(anchor);holder.userData.itemAnchor=anchor;
  return holder
 }
 makeItemSprite(item){
  const icon=item?.kind==='meal'?'🍜':item?.kind==='dirty'?'🍽️':(INGREDIENTS[item?.id]?.icon||'📦');
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const g=canvas.getContext('2d');
  g.fillStyle='rgba(255,249,232,.96)';g.beginPath();g.arc(64,64,48,0,Math.PI*2);g.fill();g.strokeStyle='rgba(73,52,36,.32)';g.lineWidth=5;g.stroke();
  g.font='68px system-ui';g.textAlign='center';g.textBaseline='middle';g.fillText(icon,64,67);
  const tex=new THREE.CanvasTexture(canvas),sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false}));
  sprite.scale.set(.72,.72,1);return sprite
 }
 syncCounterVisual(group){
  const anchor=group?.userData?.itemAnchor;if(!anchor)return;
  while(anchor.children.length){const n=anchor.children[0];anchor.remove(n);n.material?.map?.dispose?.();n.material?.dispose?.()}
  if(group.userData.storedItem)anchor.add(this.makeItemSprite(group.userData.storedItem))
 }
 clearPrepCounters(){
  this.layoutStations.filter(s=>s.group.userData.storageSlot).forEach(s=>{s.group.userData.storedItem=null;delete s.group.userData.reservedBy;s.group.userData.automationClock=0;this.syncCounterVisual(s.group)})
 }
 makeAutomationStation(id,label,type,x,z,dir=0,equipmentIndex=0){
  const equipmentKey=type==='smartGrabber'?'smartGrabber':type;
  const holder=new THREE.Group();holder.position.set(x,0,z);holder.rotation.y=dir*Math.PI/2;holder.userData.stationId=id;holder.userData.blockRadius=.62;holder.userData.storageSlot=true;holder.userData.storedItem=null;holder.userData.automationType=type;holder.userData.equipmentKey=equipmentKey;holder.userData.equipmentIndex=equipmentIndex;holder.userData.direction=dir;holder.userData.automationClock=0;if(type==='smartGrabber')holder.userData.filterId=progress.filters[id]||'noodle';this.scene.add(holder);
  const baseColor=type==='smartGrabber'?0x4d8c7b:type==='grabber'?0x5b7082:0x4d6570;
  const base=new THREE.Mesh(new THREE.BoxGeometry(1.25,.28,1.25),this.material(baseColor,{roughness:.38,metalness:.42}));base.position.y=.2;base.castShadow=true;base.receiveShadow=true;holder.add(base);
  for(let i=-1;i<=1;i++){const roller=new THREE.Mesh(new THREE.CylinderGeometry(.1,.1,1.02,12),this.material(0xc7d2d5,{roughness:.28,metalness:.65}));roller.rotation.z=Math.PI/2;roller.position.set(i*.34,.39,0);holder.add(roller)}
  if(type==='grabber'||type==='smartGrabber'){
   const armColor=type==='smartGrabber'?0x72dbb5:0xe9b84d;
   const arm=new THREE.Mesh(new THREE.BoxGeometry(.14,.18,.92),this.material(armColor,{roughness:.4,metalness:.18}));arm.position.set(0,.62,-.05);holder.add(arm);
   const claw=new THREE.Mesh(new THREE.BoxGeometry(.5,.14,.14),this.material(armColor,{roughness:.4,metalness:.18}));claw.position.set(0,.62,-.48);holder.add(claw)
  }
  const arrow=new THREE.ArrowHelper(new THREE.Vector3(0,0,-1),new THREE.Vector3(0,.72,.3),.72,0x8ce6ff,.22,.15);holder.add(arrow);holder.userData.directionArrow=arrow;
  const pick=new THREE.Mesh(new THREE.BoxGeometry(1.5,1.35,1.5),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));pick.position.y=.62;pick.userData.layoutStation=holder;holder.add(pick);this.stationPickables.push(pick);
  const ring=new THREE.Mesh(new THREE.RingGeometry(.58,.72,30),new THREE.MeshBasicMaterial({color:0x5bd0ff,transparent:true,opacity:0,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.y=.02;holder.add(ring);holder.userData.ring=ring;
  const anchor=new THREE.Group();anchor.position.set(0,.9,0);holder.add(anchor);holder.userData.itemAnchor=anchor;
  this.attachStationFloorTile(holder,id,label);
  this.layoutStations.push({id,label,group:holder});return holder
 }
 isEquipmentOwned(group){
  const key=group?.userData?.equipmentKey;if(!key)return true;
  return (progress.owned[key]||0)>(group.userData.equipmentIndex||0)
 }
 syncEquipmentVisibility(){
  this.layoutStations.forEach(s=>{
   const g=s.group,active=this.isEquipmentOwned(g);g.visible=active;
   const pick=this.stationPickables.find(p=>p.userData.layoutStation===g);if(pick)pick.visible=active;
   if(!active){g.userData.storedItem=null;delete g.userData.reservedBy;this.syncCounterVisual(g)}
  })
 }
 applySavedEquipmentState(){
  this.syncEquipmentVisibility();
  this.layoutStations.forEach(s=>{
   const g=s.group;if(!g.visible)return;
   const saved=progress.layout?.[s.id];if(saved){
    if(Number.isFinite(saved.x)&&Number.isFinite(saved.z))g.position.set(saved.x,0,saved.z);
    if(g.userData.automationType&&Number.isInteger(saved.dir)){g.userData.direction=((saved.dir%4)+4)%4;g.rotation.y=g.userData.direction*Math.PI/2}
   }
   if(g.userData.automationType==='smartGrabber'){
    const filter=progress.filters[s.id];if(SMART_FILTERS.includes(filter))g.userData.filterId=filter
   }
  })
 }
 snapshotEquipmentLayout(){
  const layout={};
  this.layoutStations.forEach(s=>{
   const g=s.group;if(!g.visible)return;
   layout[s.id]={x:Math.round(g.position.x*100)/100,z:Math.round(g.position.z*100)/100};
   if(g.userData.automationType)layout[s.id].dir=g.userData.direction||0
  });
  progress.layout=layout;
  this.layoutStations.filter(s=>s.group.userData.automationType==='smartGrabber').forEach(s=>{progress.filters[s.id]=s.group.userData.filterId||'noodle'});
  saveProgress()
 }
 findFreeEquipmentSpot(group){
  const spots=[
   {x:-5.8,z:-2.45},{x:5.8,z:-2.45},{x:-7.95,z:5.25},{x:7.95,z:5.25},
   {x:-3.15,z:-2.45},{x:-1.05,z:-2.45},{x:1.05,z:-2.45},{x:3.15,z:-2.45}
  ];
  return spots.find(p=>!this.layoutPlacementBlocked(group,p.x,p.z))||{x:7.95,z:5.25}
 }
 revealNewestEquipment(key){
  const candidates=this.layoutStations.filter(s=>s.group.userData.equipmentKey===key).sort((a,b)=>(a.group.userData.equipmentIndex||0)-(b.group.userData.equipmentIndex||0));
  const target=candidates.find(s=>(s.group.userData.equipmentIndex||0)===progress.owned[key]-1)?.group;if(!target)return null;
  target.visible=true;const pick=this.stationPickables.find(p=>p.userData.layoutStation===target);if(pick)pick.visible=true;
  const spot=this.findFreeEquipmentSpot(target);target.position.set(spot.x,0,spot.z);return target
 }

 rotateSelectedAutomation(){
  if(state.phase!=='prep')return false;
  const g=this.selectedLayoutStation;if(!g?.visible||!g?.userData?.automationType){toast('자동화 장비를 먼저 선택해 주세요',1300);return false}
  g.userData.direction=(g.userData.direction+1)%4;g.rotation.y=g.userData.direction*Math.PI/2;this.snapshotEquipmentLayout();
  toast(storageLabel(g)+' 방향 회전',900);return true
 }
 automationVector(group){
  return [{x:0,z:-1},{x:-1,z:0},{x:0,z:1},{x:1,z:0}][group?.userData?.direction||0]
 }
 findStorageInDirection(origin,sign=1,need='empty',predicate=null){
  const v=this.automationVector(origin);let best=null;
  for(const s of this.layoutStations){
   const g=s.group;if(g===origin||!g.visible||!g.userData.storageSlot||g.userData.reservedBy)continue;
   const item=g.userData.storedItem;if(need==='empty'&&item)continue;if(need==='filled'&&!item)continue;if(predicate&&!predicate(g,item))continue;
   const dx=g.position.x-origin.position.x,dz=g.position.z-origin.position.z,d=Math.hypot(dx,dz);if(d<.45||d>2.55)continue;
   const forward=(dx*v.x+dz*v.z)*sign,lateral=Math.abs(dx*v.z-dz*v.x);
   if(forward<=.35||lateral>.82)continue;
   if(!best||d<best.d)best={group:g,d}
  }
  return best?.group||null
 }
 findPotInDirection(origin,item){
  if(!item||item.kind!=='ingredient')return null;
  const v=this.automationVector(origin);let best=null;
  for(let i=0;i<activePotCount();i++){
   const root=this.potVisuals[i].root,dx=root.position.x-origin.position.x,dz=root.position.z-origin.position.z,d=Math.hypot(dx,dz);
   if(d<.5||d>2.65)continue;
   const forward=dx*v.x+dz*v.z,lateral=Math.abs(dx*v.z-dz*v.x);
   if(forward<=.35||lateral>.95||!this.helperCanDeliver(item.id,state.pots[i]))continue;
   if(!best||d<best.d)best={index:i,d}
  }
  return best?.index??null
 }
 transferAutomationItem(from,to){
  if(!from?.userData?.storedItem||!to?.userData?.storageSlot||to.userData.storedItem||to.userData.reservedBy)return false;
  to.userData.storedItem={...from.userData.storedItem};from.userData.storedItem=null;this.syncCounterVisual(from);this.syncCounterVisual(to);return true
 }
 updateAutomation(dt){
  if(state.phase!=='service'||state.tutorial.active)return;
  const autos=this.layoutStations.map(s=>s.group).filter(g=>g.visible&&g.userData.automationType);
  for(const g of autos){
   g.userData.automationClock=(g.userData.automationClock||0)-dt;if(g.userData.automationClock>0)continue;g.userData.automationClock=.72;
   if((g.userData.automationType==='grabber'||g.userData.automationType==='smartGrabber')&&!g.userData.storedItem){
    const source=this.findStorageInDirection(g,-1,'filled',(candidate,item)=>item?.kind==='ingredient'&&!candidate.userData.automationType&&candidate.userData.reservedBy!=='helper'&&(g.userData.automationType!=='smartGrabber'||item.id===g.userData.filterId));
    if(source)this.transferAutomationItem(source,g)
   }
   const item=g.userData.storedItem;if(!item)continue;
   const potIndex=this.findPotInDirection(g,item);
   if(potIndex!=null&&addToPot(potIndex,item.id,item.amount||1)){g.userData.storedItem=null;this.syncCounterVisual(g);sfx('collect.coin_drop',{volume:.06,rate:1.22,cooldownMs:80});continue}
   const target=this.findStorageInDirection(g,1,'empty');if(target)this.transferAutomationItem(g,target)
  }
 }
 makePlateupStations(){
  // 왼쪽 벽 = 재료존. 중앙과의 사이에 3칸 가까운 세로 통로를 남긴다.
  const sink=this.makeLayoutStation('sink','싱크 · 물/설거지',BAKERY_BITS,'kitchencounter-sink.glb',1.82,-8.15,-2.65,Math.PI/2,.78);
  this.makeLayoutStation('noodleSource','면 바구니',BAKERY,'basket-a.glb',.92,-8.2,-.55,0,.54);
  this.makeLayoutStation('soupSource','스프 바구니',BAKERY,'basket-b.glb',.92,-8.2,1.5,0,.54);
  this.makeLayoutStation('fridge','토핑 냉장고',BAKERY_BITS,'fridge-a.glb',1.82,-8.05,4.15,Math.PI,.78);

  // 오른쪽 벽 = 접시/조리대존. 중앙 통로는 비워 둔다.
  this.makeLayoutStation('rack','깨끗한 접시',BAKERY_BITS,'dishrack-plates.glb',1.28,8.15,-2.1,-Math.PI/2,.62);
  this.makePrepCounter('prepCounterA','조리대 A',8.05,.15,-Math.PI/2,0);
  this.makePrepCounter('prepCounterB','조리대 B',8.05,2.45,-Math.PI/2,1);
  this.makePrepCounter('prepCounterC','조리대 C',8.05,4.75,-Math.PI/2,2);

  // 자동화는 손님 쪽 '기계 레인'에만 기본 배치한다. 메인 보행 통로를 침범하지 않는다.
  this.makeAutomationStation('conveyorA','컨베이어 A','conveyor',-1.05,-2.45,2,0);
  this.makeAutomationStation('conveyorB','컨베이어 B','conveyor',1.05,-2.45,2,1);
  this.makeAutomationStation('grabberA','Grabber','grabber',-3.15,-2.45,2,0);
  this.makeAutomationStation('smartGrabberA','Smart Grabber','smartGrabber',3.15,-2.45,2,0);
  this.applySavedEquipmentState();

  const dirtyGroup=new THREE.Group();dirtyGroup.position.set(.1,1.0,.15);sink.add(dirtyGroup);
  this.loadModel(BAKERY_BITS,'plate-dirty.glb',.42).then(model=>{
   if(!model)return;
   for(let i=0;i<5;i++){const plate=model.clone(true);plate.position.set(0,i*.07,0);plate.visible=false;dirtyGroup.add(plate);this.dirtyPlateModels.push(plate)}
   this.syncDishVisuals()
  });
 } makePlayer(){
  const root=this.player=new THREE.Group();root.position.set(0,0,3.55);this.scene.add(root);
  const ring=this.playerRing=new THREE.Mesh(new THREE.RingGeometry(.42,.55,30),new THREE.MeshBasicMaterial({color:0xffe172,transparent:true,opacity:.9,depthWrite:false}));
  ring.rotation.x=-Math.PI/2;ring.position.y=.025;root.add(ring);
  const cute=this.makeCuteCook('player');root.add(cute.sprite);root.userData.cute=cute;root.userData.moving=false;root.userData.faceRight=false;
  const role=this.makeRoleFloorLabel('사장','#f0c65c');root.add(role);root.userData.roleLabel=role;
  this.carryAnchor=new THREE.Group();this.carryAnchor.position.set(.3,1.48,-.08);root.add(this.carryAnchor);
 }
 setCarryVisual(item){
  if(!this.carryAnchor)return;
  while(this.carryAnchor.children.length){const n=this.carryAnchor.children.pop();n.material?.map?.dispose?.();n.material?.dispose?.()}
  this.carrySprite=null;if(!item)return;
  const icon=item.kind==='meal'?'🍜':(INGREDIENTS[item.id]?.icon||'📦');
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const g=canvas.getContext('2d');
  g.fillStyle='rgba(255,248,230,.94)';g.beginPath();g.arc(64,64,48,0,Math.PI*2);g.fill();g.strokeStyle='rgba(70,48,34,.35)';g.lineWidth=5;g.stroke();
  g.font='68px system-ui';g.textAlign='center';g.textBaseline='middle';g.fillText(icon,64,67);
  const tex=new THREE.CanvasTexture(canvas),sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false}));sprite.scale.set(.72,.72,1);this.carryAnchor.add(sprite);this.carrySprite=sprite
 }
 makeHelper(){
  const root=this.helper=new THREE.Group();root.position.set(4.9,0,4.55);root.visible=false;this.scene.add(root);
  const ring=new THREE.Mesh(new THREE.RingGeometry(.36,.47,28),new THREE.MeshBasicMaterial({color:0x77c9ff,transparent:true,opacity:.82,depthWrite:false}));
  ring.rotation.x=-Math.PI/2;ring.position.y=.02;root.add(ring);
  const cute=this.makeCuteCook('helper');cute.sprite.scale.set(1.78,1.78,1);root.add(cute.sprite);root.userData.cute=cute;root.userData.moving=false;root.userData.faceRight=false;
  this.helperCarryAnchor=new THREE.Group();this.helperCarryAnchor.position.set(.28,1.42,-.08);root.add(this.helperCarryAnchor);
  const role=this.makeRoleFloorLabel('알바','#78c9ff');role.scale.set(.9,.9,.9);root.add(role);root.userData.roleLabel=role
 }
 makeHallWorker(){
  const root=this.hallWorker=new THREE.Group();root.position.copy(this.hallWorkerHome);root.visible=hasUpgrade('hallStaff');this.scene.add(root);
  const ring=new THREE.Mesh(new THREE.RingGeometry(.34,.45,28),new THREE.MeshBasicMaterial({color:0xf3bd54,transparent:true,opacity:.8,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.y=.02;root.add(ring);
  const cute=this.makeCuteCook('hall');cute.sprite.scale.set(1.72,1.72,1);root.add(cute.sprite);root.userData.cute=cute;root.userData.moving=false;root.userData.faceRight=false;
  const role=this.makeRoleFloorLabel('홀 알바','#f1bd55');role.scale.set(.92,.92,.92);root.add(role);
  this.hallWorkerCarry=new THREE.Group();this.hallWorkerCarry.position.set(.28,1.35,-.08);root.add(this.hallWorkerCarry)
 }
 setHallWorkerCarry(show){
  if(!this.hallWorkerCarry)return;
  while(this.hallWorkerCarry.children.length){const n=this.hallWorkerCarry.children[0];this.hallWorkerCarry.remove(n);n.material?.map?.dispose?.();n.material?.dispose?.()}
  if(show)this.hallWorkerCarry.add(this.makeItemSprite({kind:'meal'}))
 }
 animateHallWorkerServe(slot,onDone){
  const worker=this.hallWorker,guest=this.customerHolders[slot];if(!worker||!guest){onDone?.();return}
  worker.visible=true;worker.position.copy(this.hallWorkerHome);this.setHallWorkerCarry(true);
  const start=this.hallWorkerHome.clone(),end=new THREE.Vector3(guest.position.x,0,guest.position.z+.65),started=performance.now();
  const run=now=>{
   const t=Math.min(1,(now-started)/780),e=1-Math.pow(1-t,3),dx=end.x-start.x;
   worker.position.lerpVectors(start,end,e);worker.userData.moving=t<1;worker.userData.faceRight=dx>0;this.paintCuteCook(worker.userData.cute,t<1,dx>0);
   if(t<1){requestAnimationFrame(run);return}
   this.setHallWorkerCarry(false);if(this.serviceMeal)this.serviceMeal.visible=false;onDone?.();
   const backStart=worker.position.clone(),backAt=performance.now(),back=now2=>{
    const u=Math.min(1,(now2-backAt)/720),ee=u*u*(3-2*u);worker.position.lerpVectors(backStart,this.hallWorkerHome,ee);worker.userData.moving=u<1;worker.userData.faceRight=this.hallWorkerHome.x>backStart.x;this.paintCuteCook(worker.userData.cute,u<1,worker.userData.faceRight);
    if(u<1)requestAnimationFrame(back);else worker.visible=hasUpgrade('hallStaff')
   };requestAnimationFrame(back)
  };requestAnimationFrame(run)
 }
 dishCartSinkTarget(){
  const sink=this.layoutStations.find(s=>s.id==='sink')?.group;
  return sink?new THREE.Vector3(sink.position.x+1.05,.02,sink.position.z-.15):new THREE.Vector3(-7.1,.02,-2.8)
 }
 setDishCartCarry(show){
  if(!this.dishCartModel)return;
  const old=this.dishCartModel.getObjectByName('dishCartCarry');if(old)this.dishCartModel.remove(old);
  if(!show)return;
  const sp=this.makeItemSprite({kind:'dirty'});sp.name='dishCartCarry';sp.position.set(0,1.15,0);sp.scale.set(.5,.5,1);this.dishCartModel.add(sp)
 }
 updateDishCart(dt){
  const cart=this.dishCartModel;if(!cart)return;
  if(!hasUpgrade('dishCart')){cart.visible=false;this.dishCartQueue.length=0;this.dishCartTask=null;return}
  cart.visible=true;
  if(!this.dishCartTask){
   while(this.dishCartQueue.length){
    const slot=this.dishCartQueue.shift(),seat=this.hallSeats[slot];
    if(seat?.dirtyPending&&seat.dishMode==='dirty'){this.dishCartTask={slot,phase:'toTable'};break}
   }
   if(!this.dishCartTask)return
  }
  const task=this.dishCartTask,seat=this.hallSeats[task.slot];
  if(!seat){this.dishCartTask=null;return}
  const target=task.phase==='toTable'?new THREE.Vector3(seat.tablePosition.x,.02,seat.tablePosition.z+.82):task.phase==='toSink'?this.dishCartSinkTarget():this.dishCartHome;
  const dx=target.x-cart.position.x,dz=target.z-cart.position.z,d=Math.hypot(dx,dz),speed=3.15;
  if(d>.06){const step=Math.min(d,speed*dt);cart.position.x+=dx/d*step;cart.position.z+=dz/d*step;cart.rotation.y=Math.atan2(dx,dz);return}
  cart.position.x=target.x;cart.position.z=target.z;
  if(task.phase==='toTable'){
   this.setSeatDish(seat,'none');seat.dirtyPending=false;this.setDishCartCarry(true);task.phase='toSink';return
  }
  if(task.phase==='toSink'){
   this.setDishCartCarry(false);addDirtyPlate();task.phase='home';return
  }
  this.dishCartTask=null;cart.rotation.y=Math.PI/2
 }
 setHelperCarry(item){
  this.helperCarry=item?{...item}:null;
  if(!this.helperCarryAnchor)return;
  while(this.helperCarryAnchor.children.length){const n=this.helperCarryAnchor.children[0];this.helperCarryAnchor.remove(n);n.material?.map?.dispose?.();n.material?.dispose?.()}
  if(this.helperCarry)this.helperCarryAnchor.add(this.makeItemSprite(this.helperCarry))
 }
 releaseHelperReservation(){
  const counter=this.helperTask?.counter;if(counter?.userData?.reservedBy==='helper')delete counter.userData.reservedBy
 }
 resetHelper(){
  this.releaseHelperReservation();this.helperTask=null;this.helperPath=[];this.helperThink=0;this.setHelperCarry(null);
  if(this.helper){this.helper.position.set(4.9,0,4.55);this.helper.visible=false}
 }
 setHelperEnabled(on){
  state.helperEnabled=!!on&&state.helperUnlocked;
  if(this.helper)this.helper.visible=state.helperUnlocked;
  if(!state.helperEnabled&&this.helperTask){
   this.returnHelperCarry();this.releaseHelperReservation();this.helperTask=null;this.helperPath=[]
  }
 }
 helperCanDeliver(id,p){
  return !!id&&!state.tutorial.active&&!!p&&!p.burnt&&!p.plating&&contextActionsForPot(p).includes(id)
 }
 buildHelperPath(group,approach=1.42){
  if(!this.helper||!group)return[];
  const step=.5,minX=-8.8,maxX=8.8,minZ=-3.45,maxZ=5.95;
  const snap=v=>Math.round(v/step)*step,key=(x,z)=>x.toFixed(2)+','+z.toFixed(2);
  const start={x:snap(this.helper.position.x),z:snap(this.helper.position.z)},queue=[start],prev=new Map([[key(start.x,start.z),null]]),nodes=new Map([[key(start.x,start.z),start]]);
  let goalKey=null,head=0;
  while(head<queue.length&&head<900){
   const cur=queue[head++],ck=key(cur.x,cur.z);
   if(Math.hypot(cur.x-group.position.x,cur.z-group.position.z)<=approach){goalKey=ck;break}
   for(const [dx,dz] of [[step,0],[-step,0],[0,step],[0,-step]]){
    const x=Number((cur.x+dx).toFixed(2)),z=Number((cur.z+dz).toFixed(2)),k=key(x,z);
    if(x<minX||x>maxX||z<minZ||z>maxZ||prev.has(k))continue;
    if(this.isBlockedPosition(x,z,.26))continue;
    prev.set(k,ck);const node={x,z};nodes.set(k,node);queue.push(node)
   }
  }
  if(!goalKey)return[];
  const path=[];let k=goalKey;
  while(k&&k!==key(start.x,start.z)){const n=nodes.get(k);if(n)path.push(new THREE.Vector3(n.x,0,n.z));k=prev.get(k)}
  return path.reverse()
 }
 moveHelperPath(dt){
  if(!this.helperPath.length){if(this.helper)this.helper.userData.moving=false;return true}
  const target=this.helperPath[0],dx=target.x-this.helper.position.x,dz=target.z-this.helper.position.z,d=Math.hypot(dx,dz);
  this.helper.userData.moving=true;if(dx>0)this.helper.userData.faceRight=true;else if(dx<0)this.helper.userData.faceRight=false;
  if(d<.08){this.helper.position.set(target.x,0,target.z);this.helperPath.shift();if(!this.helperPath.length)this.helper.userData.moving=false;return this.helperPath.length===0}
  const speed=hasUpgrade('helperSkill2')?3.5:hasUpgrade('helperSkill1')?2.95:2.45,move=Math.min(d,speed*dt);this.helper.position.x+=dx/d*move;this.helper.position.z+=dz/d*move;this.helper.rotation.y=Math.atan2(dx,dz);return false
 }
 findHelperTask(){
  if(!state.helperEnabled||state.tutorial.active||this.helperTask||this.helperCarry)return false;
  let best=null;
  for(const station of this.layoutStations){
   const counter=station.group,item=counter.visible&&counter.userData.storageSlot&&!counter.userData.automationType&&counter.userData.storedItem;
   if(!item||item.kind!=='ingredient'||counter.userData.reservedBy)continue;
   for(let i=0;i<activePotCount();i++){
    const p=state.pots[i];if(!this.helperCanDeliver(item.id,p))continue;
    const score=Math.hypot(this.helper.position.x-counter.position.x,this.helper.position.z-counter.position.z)+Math.hypot(counter.position.x-this.potVisuals[i].root.position.x,counter.position.z-this.potVisuals[i].root.position.z);
    if(!best||score<best.score)best={counter,potIndex:i,itemId:item.id,score}
   }
  }
  if(!best)return false;
  best.counter.userData.reservedBy='helper';this.helperTask={...best,phase:'toCounter'};this.helperPath=this.buildHelperPath(best.counter,1.35);
  if(!this.helperPath.length){this.releaseHelperReservation();this.helperTask=null;return false}
  return true
 }
 returnHelperCarry(){
  if(!this.helperCarry)return false;
  const preferred=this.helperTask?.counter;
  const target=preferred?.visible&&!preferred.userData.storedItem?preferred:this.layoutStations.map(s=>s.group).find(g=>g.visible&&g.userData.storageSlot&&!g.userData.storedItem);
  if(target){target.userData.storedItem={...this.helperCarry};this.syncCounterVisual(target);this.setHelperCarry(null);return true}
  this.setHelperCarry(null);return false
 }
 updateHelper(dt){
  if(!state.helperUnlocked||!this.helper){return}
  this.helper.visible=true;
  if(!state.helperEnabled)return;
  this.helperThink-=dt;
  if(!this.helperTask&&!this.helperCarry&&this.helperThink<=0){this.helperThink=hasUpgrade('helperSkill2')?.16:hasUpgrade('helperSkill1')?.28:.45;this.findHelperTask()}
  const task=this.helperTask;if(!task)return;
  if(!this.helperPath.length){
   if(task.phase==='toCounter'){
    const stored=task.counter.userData.storedItem;
    if(!stored||stored.kind!=='ingredient'||stored.id!==task.itemId){this.releaseHelperReservation();this.helperTask=null;return}
    task.counter.userData.storedItem=null;delete task.counter.userData.reservedBy;this.syncCounterVisual(task.counter);this.setHelperCarry(stored);
    task.phase='toPot';this.helperPath=this.buildHelperPath(this.potVisuals[task.potIndex].root,1.48);
    if(!this.helperPath.length){this.returnHelperCarry();this.helperTask=null}
    return
   }
   if(task.phase==='toPot'){
    const p=state.pots[task.potIndex];
    if(this.helperCarry&&this.helperCanDeliver(this.helperCarry.id,p)){
     const id=this.helperCarry.id;if(addToPot(task.potIndex,id,this.helperCarry.amount||1)){this.setHelperCarry(null);sfx('collect.coin_drop',{volume:.07,rate:1.18,cooldownMs:80})}
    }else this.returnHelperCarry();
    this.helperTask=null;this.helperThink=hasUpgrade('helperSkill2')?.12:hasUpgrade('helperSkill1')?.22:.35;return
   }
  }
  this.moveHelperPath(dt)
 }
 setMoveKey(code,on){if(on)this.moveKeys.add(code);else this.moveKeys.delete(code)}
 updatePointer(e){
  const r=this.canvas.getBoundingClientRect();this.pointer.x=((e.clientX-r.left)/r.width)*2-1;this.pointer.y=-((e.clientY-r.top)/r.height)*2+1;this.raycaster.setFromCamera(this.pointer,this.camera)
 }
 pointerDown(e){
  if(state.phase!=='prep')return;
  this.updatePointer(e);
  const hit=this.raycaster.intersectObjects(this.stationPickables,false).find(h=>h.object.userData.layoutStation?.visible);if(!hit)return;
  this.dragLayout=hit.object.userData.layoutStation||null;this.selectedLayoutStation=this.dragLayout;renderSmartFilterButton();
  this.layoutStations.forEach(s=>{s.group.userData.ring.material.opacity=s.group===this.selectedLayoutStation?.userData?.layoutStation?.group?1:(s.group===this.selectedLayoutStation?1:0)});
  this.canvas.setPointerCapture?.(e.pointerId);document.body.classList.add('layout-dragging');e.preventDefault()
 }
 pointerMove(e){
  if(state.phase!=='prep'||!this.dragLayout)return;
  this.updatePointer(e);
  const p=new THREE.Vector3(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
  if(!this.raycaster.ray.intersectPlane(plane,p))return;
  const x=Math.max(-8.35,Math.min(8.35,Math.round(p.x*2)/2)),z=Math.max(-3.35,Math.min(5.55,Math.round(p.z*2)/2));
  if(!this.layoutPlacementBlocked(this.dragLayout,x,z))this.dragLayout.position.set(x,0,z);
 }
 protectedAisle(x,z,r=.7){
  // 약 1m 격자 두 칸(2m+)을 항상 비워 두는 십자형 메인 동선.
  const frontLane=z>1.25-r&&z<4.55+r&&x>-6.45-r&&x<6.45+r;
  const leftLane=x>-6.85-r&&x<-4.45+r&&z>-3.25-r&&z<5.15+r;
  const rightLane=x>4.45-r&&x<6.85+r&&z>-3.25-r&&z<5.15+r;
  return frontLane||leftLane||rightLane
 }
 layoutPlacementBlocked(holder,x,z){
  const r=holder.userData.blockRadius||.72;
  if(this.protectedAisle(x,z,r))return true;
  if(this.potVisuals.some(v=>Math.hypot(v.root.position.x-x,v.root.position.z-z)<r+.95))return true;
  if(this.layoutStations.some(s=>s.group!==holder&&s.group.visible&&Math.hypot(s.group.position.x-x,s.group.position.z-z)<r+(s.group.userData.blockRadius||.72)+.34))return true;
  if(this.serviceGroup&&Math.hypot(this.serviceGroup.position.x-x,this.serviceGroup.position.z-z)<r+1.05)return true;
  return this.staticBlockers.some(b=>Math.hypot(b.x-x,b.z-z)<r+b.r+.25)
 }
 isBlockedPosition(x,z,pr=.34){
  if(x<-8.9||x>8.9||z<-3.55||z>6.0)return true;
  if(this.potVisuals.some(v=>Math.hypot(v.root.position.x-x,v.root.position.z-z)<.84+pr))return true;
  if(this.layoutStations.some(s=>s.group.visible&&Math.hypot(s.group.position.x-x,s.group.position.z-z)<(s.group.userData.blockRadius||.72)+pr))return true;
  if(this.serviceGroup&&Math.hypot(this.serviceGroup.position.x-x,this.serviceGroup.position.z-z)<.82+pr)return true;
  return this.staticBlockers.some(b=>Math.hypot(b.x-x,b.z-z)<b.r+pr)
 }
 stationDistance(group){return this.player?Math.hypot(group.position.x-this.player.position.x,group.position.z-this.player.position.z):999}
 updatePlayer(dt){
  if(!this.player)return;
  const canMove=state.phase==='service';
  let dx=0,dz=0;
  if(canMove){
   if(this.moveKeys.has('KeyA')||this.moveKeys.has('ArrowLeft'))dx-=1;
   if(this.moveKeys.has('KeyD')||this.moveKeys.has('ArrowRight'))dx+=1;
   if(this.moveKeys.has('KeyW')||this.moveKeys.has('ArrowUp'))dz-=1;
   if(this.moveKeys.has('KeyS')||this.moveKeys.has('ArrowDown'))dz+=1;
  }
  this.player.userData.moving=!!(dx||dz);
  if(dx>0)this.player.userData.faceRight=true;else if(dx<0)this.player.userData.faceRight=false;
  if(dx||dz){
   const len=Math.hypot(dx,dz)||1,speed=3.35;dx/=len;dz/=len;
   const nx=this.player.position.x+dx*speed*dt,nz=this.player.position.z+dz*speed*dt;
   if(!this.isBlockedPosition(nx,this.player.position.z))this.player.position.x=nx;
   if(!this.isBlockedPosition(this.player.position.x,nz))this.player.position.z=nz;
   this.player.rotation.y=Math.atan2(dx,dz);
  }
  this.paintCuteCook(this.player.userData.cute,this.player.userData.moving,this.player.userData.faceRight);
  const candidates=[
   ...this.layoutStations.filter(s=>s.group.visible).map(s=>({type:s.id,label:s.label,group:s.group})),
   ...this.potVisuals.slice(0,activePotCount()).map((v,i)=>({type:'pot',label:'냄비 '+(i+1),group:v.root,potIndex:i})),
   ...(this.serviceGroup?[{type:'service',label:'배식대',group:this.serviceGroup}]:[])
  ];
  let nearest=null,best=1.55;
  candidates.forEach(item=>{const d=this.stationDistance(item.group);if(d<best){best=d;nearest=item}});
  this.nearestStation=nearest;
  if(hasUpgrade('hallStaff')&&state.heldItem?.kind==='meal'&&!state.busy&&this.serviceGroup){
   const d=this.stationDistance(this.serviceGroup);
   if(d<1.58&&!this.hallAutoHandoff){this.hallAutoHandoff=true;queueMicrotask(()=>{if(state.heldItem?.kind==='meal'&&!state.busy)serveHeldMeal()})}
   if(d>2.05)this.hallAutoHandoff=false
  }else this.hallAutoHandoff=false;
  this.layoutStations.forEach(s=>{
   const near=nearest?.group===s.group,tile=s.group.userData.actionTile;
   s.group.userData.ring.material.opacity=0;this.updateStationFloorTile(s.group);
   if(tile){tile.visible=s.group.visible;tile.material.opacity=near?.98:(state.phase==='prep'?.52:.68);tile.scale.setScalar(near?1.08:1)}
  });
  if(this.serviceGroup?.userData?.actionTile){const near=nearest?.group===this.serviceGroup,t=this.serviceGroup.userData.actionTile;t.material.opacity=near?.98:.68;t.scale.setScalar(near?1.08:1)}
  if(els.stationHint){
   if(state.phase==='prep')els.stationHint.textContent=this.selectedLayoutStation?.userData?.automationType?'자동화 장비 선택됨 · 드래그로 이동 / R 또는 회전 버튼으로 방향 변경':'가구를 드래그해 주방 동선을 바꿔 보세요';
   else if(!nearest)els.stationHint.textContent='WASD / 방향키로 가까이 가서 E로 상호작용';
   else if(nearest.type==='sink')els.stationHint.textContent=state.heldItem?'E · 같은 물이면 돌려놓기':(state.dirtyPlates?'E · 설거지':'E · 주전자에 물 2컵 받기');
   else if(nearest.type==='noodleSource')els.stationHint.textContent=state.heldItem?'E · 면이면 돌려놓기':'E · 면 들기';
   else if(nearest.type==='soupSource')els.stationHint.textContent=state.heldItem?'E · 스프면 돌려놓기':'E · 스프 들기';
   else if(nearest.type==='rack')els.stationHint.textContent='접시 선반 · 깨끗한 접시 '+state.cleanPlates+'개';
   else if(nearest.type==='fridge')els.stationHint.textContent=state.heldItem?'E · 토핑이면 돌려놓기':'E · 주문에 맞는 토핑 꺼내기';
   else if(nearest.group?.userData?.storageSlot){
    const stored=nearest.group.userData.storedItem,reserved=nearest.group.userData.reservedBy==='helper',label=storageLabel(nearest.group);
    els.stationHint.textContent=reserved?'알바생이 '+itemLabel(stored)+' 가지러 오는 중':state.heldItem?(stored?label+' 사용 중 · 먼저 집어가세요':'E · '+heldItemLabel()+' → '+label):(stored?'E · '+itemLabel(stored)+' 집기':'빈 '+label+' · 아이템을 둘 수 있어요')
   }
   else if(nearest.type==='service')els.stationHint.textContent=state.heldItem?.kind==='meal'?'E · '+state.heldItem.name+' 서빙':'배식대 · 완성 라면을 들고 오세요';
   else if(nearest.type==='pot')els.stationHint.textContent=state.heldItem?'E · '+heldItemLabel()+' 넣기':'E · 냄비 사용';
   else els.stationHint.textContent='E · '+nearest.label+' 사용';
  }
 }
 interactNearest(){
  if(state.phase!=='service')return;
  const n=this.nearestStation;if(!n){toast('가까운 설비로 이동해 주세요');return}
  if(n.type==='noodleSource'){
   if(returnHeldAtSource('noodle'))return;
   pickIngredient('noodle');return
  }
  if(n.type==='soupSource'){
   if(returnHeldAtSource('soup'))return;
   pickIngredient('soup');return
  }
  if(n.type==='fridge'){
   if(returnHeldAtSource(['egg','green','cheese']))return;
   pickIngredient(recommendedToppingIngredient());return
  }
  if(n.type==='sink'){
   if(returnHeldAtSource('water'))return;
   if(state.heldItem){toast('손이 차 있어요 · '+heldItemLabel()+'을 먼저 사용하거나 내려놓으세요');return}
   const expected=tutorialCarryExpected();
   if(expected==='water'){pickIngredient('water');return}
   if(state.dirtyPlates>0){washOnePlate();return}
   pickIngredient('water');return
  }
  if(n.type==='rack'){toast('깨끗한 그릇 '+state.cleanPlates+'개 · 완성 라면을 담을 때 자동으로 하나 사용해요',1500);return}
  if(n.group?.userData?.storageSlot){usePrepCounter(n.group);return}
  if(n.type==='pot'){
   this.setSelectedPot(n.potIndex);
   if(state.heldItem?.kind==='ingredient'){insertHeldIntoPot(n.potIndex);return}
   if(!state.heldItem&&canUseAction('plate')){platePot(n.potIndex);return}
   toast(nextInstruction(state.pots[n.potIndex]),1500);return
  }
  if(n.type==='service'){serveHeldMeal();return}
 }
 syncDishVisuals(){this.dirtyPlateModels.forEach((m,i)=>{m.visible=i<Math.min(5,state.dirtyPlates)})}
 makeCustomers(){
  this.customerXs.forEach((x,i)=>{
   const spec=CUSTOMER_MODELS[(i+progress.shifts*2)%CUSTOMER_MODELS.length],holder=new THREE.Group(),seat=this.hallSeats[i];
   holder.position.copy(this.hallEntrance);holder.visible=false;holder.userData.customerSlot=i;this.scene.add(holder);this.customerHolders.push(holder);
   const cs={slot:i,holder,seat,phase:'idle',orderId:null,path:[],walkClock:i*.7,mealMeta:null,eatRemaining:0,reviewRemaining:0};
   this.customerStates.push(cs);
   this.loadModel(spec.root,spec.file,1.65).then(o=>{if(o){o.rotation.y=Math.PI;holder.add(o);cs.model=o}});
  });
  // 주방과 홀 사이의 낮은 카운터. 홀의 손님 움직임이 주방에서 보이도록 상부는 열어 둔다.
  this.box(9.4,.86,1.0,0x416c62,0,.38,-3.62,{roughness:.58});
  this.box(9.5,.11,1.08,0xe4c489,0,.86,-3.62,{roughness:.5});
 }
 customerStateForOrder(orderId){return this.customerStates.find(c=>c.orderId===orderId)||null}
 resetCustomerForOrder(orderId){
  const c=this.customerStateForOrder(orderId);if(!c)return;
  if(c.seat?.occupiedBy===orderId)c.seat.occupiedBy=null;
  c.holder.userData.reactionToken=(c.holder.userData.reactionToken||0)+1;
  c.holder.children.filter(n=>n.userData?.customerFx).forEach(n=>c.holder.remove(n));
  this.setCustomerDishCarry(c,false);
  c.phase='idle';c.orderId=null;c.path.length=0;c.mealMeta=null;c.eatRemaining=0;c.reviewRemaining=0;c.holder.visible=false;c.holder.position.copy(this.hallEntrance);c.holder.position.y=0;c.holder.rotation.set(0,0,0);c.holder.scale.setScalar(1);c.holder.userData.seatedScaleY=1
 }
 resetCustomerHall(){
  this.hallSeats.forEach(seat=>{seat.occupiedBy=null;seat.dirtyPending=false;this.setSeatDish(seat,'none')});
  this.dishCartQueue.length=0;this.dishCartTask=null;this.setDishCartCarry(false);
  if(this.dishCartModel){this.dishCartModel.position.copy(this.dishCartHome);this.dishCartModel.rotation.y=Math.PI/2}
  this.customerStates.forEach(c=>{c.holder.userData.reactionToken=(c.holder.userData.reactionToken||0)+1;c.holder.children.filter(n=>n.userData?.customerFx).forEach(n=>c.holder.remove(n));this.setCustomerDishCarry(c,false);c.phase='idle';c.orderId=null;c.path.length=0;c.mealMeta=null;c.eatRemaining=0;c.reviewRemaining=0;c.holder.visible=false;c.holder.position.copy(this.hallEntrance);c.holder.position.y=0;c.holder.rotation.set(0,0,0);c.holder.scale.setScalar(1);c.holder.userData.seatedScaleY=1})
 }
 beginCustomerArrival(order){
  if(!order)return false;
  const c=this.customerStates[order.slot],seat=this.hallSeats[order.slot];if(!c||!seat||!seat.enabled||seat.dirtyPending)return false;
  if(c.orderId!=null&&c.orderId!==order.id)this.resetCustomerForOrder(c.orderId);
  seat.occupiedBy=order.id;c.seat=seat;c.orderId=order.id;c.walkClock=order.id*.41;c.mealMeta=null;
  const ahead=this.customerStates.filter(x=>x!==c&&(x.phase==='walking'||x.phase==='waiting')).length;c.wait=ahead*.55;c.phase=c.wait>0?'waiting':'walking';
  c.holder.visible=c.phase==='walking';c.holder.position.copy(this.hallEntrance);c.holder.position.y=0;c.holder.scale.setScalar(1);
  if(c.phase==='walking')this.hallDoorOpenUntil=Math.max(this.hallDoorOpenUntil,this.clock+1.25);
  const laneZ=seat.position.z+1.15;
  c.path=[
   new THREE.Vector3(0,0,-12.15),
   new THREE.Vector3(0,0,laneZ),
   new THREE.Vector3(seat.position.x,0,laneZ),
   seat.position.clone()
  ];
  order.paused=true;order.arriving=true;order.seated=false;order.tableNo=seat.tableNo;
  return true
 }
 seatCustomer(c){
  if(!c?.seat)return;
  c.phase='seated';c.path.length=0;c.holder.position.copy(c.seat.position);c.holder.position.y=-.22;c.holder.rotation.set(0,c.seat.rotation,0);c.holder.scale.set(1,.93,1);c.holder.userData.seatedScaleY=.93;
  const order=state.orders.find(o=>o.id===c.orderId);
  if(order){order.paused=false;order.arriving=false;order.seated=true}
  sfx('collect.coin_pickup',{volume:.08,rate:1.28,cooldownMs:120})
 }
 beginDining(orderId,meta={}){
  const c=this.customerStateForOrder(orderId);if(!c?.seat)return false;
  c.phase='eating';c.mealMeta={...meta};c.eatRemaining=6.4+(orderId%4)*1.05;c.reviewRemaining=0;
  c.holder.position.copy(c.seat.position);c.holder.position.y=-.22;c.holder.rotation.set(0,c.seat.rotation,0);c.holder.scale.set(1,.93,1);c.holder.userData.seatedScaleY=.93;
  this.setSeatDish(c.seat,'meal');return true
 }
 customerFeedback(meta={}){
  const q=Number(meta.quality)||0,t=Number(meta.noodleTime)||0;
  if(meta.burnt)return'😠 탄 냄새 나요!';
  if(q<38&&t>11.5)return'😠 면이 다 퍼졌잖아요!';
  if(q<38&&t>0&&t<8.2)return'😣 면이 너무 딱딱해요!';
  if(q<38)return'😠 이건 너무 아쉬워요!';
  if(q<58&&t>11.5)return'😕 면이 좀 퍼졌는데…';
  if(q<58&&t>0&&t<8.2)return'😕 면이 조금 설익었어요.';
  if(q<58)return'😕 국물 맛이 조금 아쉬워요.';
  if(q<76)return'🙂 괜찮네요.';
  if(q<90)return'😋 맛있어요!'+((meta.combo||0)>=2?' 🔥'+meta.combo:'');
  return'🤩 최고예요!'+((meta.combo||0)>=2?' 🔥'+meta.combo:'')
 }
 finishDining(c){
  if(!c?.seat||c.phase!=='eating')return;
  this.setSeatDish(c.seat,'dirty');c.phase='reviewing';c.reviewRemaining=2.0;this.hallFocusSlot=c.slot;this.hallFocusUntil=this.clock+1.9;
  const meta=c.mealMeta||{},text=this.customerFeedback(meta);
  this.customerCelebrate(c.slot,meta.quality||0,meta.combo||0,meta.earned||0,{text,burnt:!!meta.burnt});
  sfx((meta.quality||0)>=76?'success.cheer_yay':'failure.fail_sting',{volume:(meta.quality||0)>=76?.16:.11,cooldownMs:240})
 }
 beginReturnDish(c){
  if(!c?.seat)return;
  this.setSeatDish(c.seat,'none');this.setCustomerDishCarry(c,true);c.phase='returningDish';c.holder.position.y=0;c.holder.scale.setScalar(1);c.holder.userData.seatedScaleY=1;c.holder.rotation.z=0;
  const laneZ=c.seat.position.z+1.15;
  c.path=[
   new THREE.Vector3(c.seat.position.x,0,laneZ),
   new THREE.Vector3(0,0,laneZ),
   new THREE.Vector3(0,0,this.dishReturnPoint.z),
   this.dishReturnPoint.clone()
  ]
 }
 beginCustomerExit(c){
  if(!c)return;
  const fromReturn=c.phase==='returningDish'||Math.hypot(c.holder.position.x-this.dishReturnPoint.x,c.holder.position.z-this.dishReturnPoint.z)<.55;
  c.phase='leaving';c.holder.position.y=0;c.holder.scale.setScalar(1);c.holder.userData.seatedScaleY=1;c.holder.rotation.z=0;
  const z=c.holder.position.z,laneZ=c.seat?c.seat.position.z+1.15:z,path=[];
  if(fromReturn)path.push(new THREE.Vector3(0,0,z));
  else{
   if(c.seat)path.push(new THREE.Vector3(c.seat.position.x,0,laneZ));
   path.push(new THREE.Vector3(0,0,laneZ))
  }
  path.push(new THREE.Vector3(0,0,-12.15),this.hallEntrance.clone());c.path=path
 }
 moveCustomerPath(c,dt,speed=2.25){
  const target=c.path[0];if(!target)return true;
  const dx=target.x-c.holder.position.x,dz=target.z-c.holder.position.z,d=Math.hypot(dx,dz);
  if(d<.07){c.holder.position.x=target.x;c.holder.position.z=target.z;c.path.shift();return !c.path.length}
  const step=Math.min(d,speed*dt);c.holder.position.x+=dx/d*step;c.holder.position.z+=dz/d*step;
  c.walkClock+=dt*9;c.holder.position.y=Math.sin(c.walkClock)*.025;c.holder.rotation.y=Math.atan2(dx,dz);
  if(target.z<-11.5)this.hallDoorOpenUntil=Math.max(this.hallDoorOpenUntil,this.clock+1.2);
  return false
 }
 hasActiveDiningCustomers(){
  return this.customerStates.some(c=>['eating','reviewing','returningDish','leaving'].includes(c.phase))||!!this.dishCartTask||this.dishCartQueue.length>0
 }
 updateCustomerHall(dt){
  if(this.hallDoor){
   const open=this.clock<this.hallDoorOpenUntil,target=open?-1.08:0;
   this.hallDoor.rotation.y+=(target-this.hallDoor.rotation.y)*Math.min(1,dt*7.5)
  }
  for(const c of this.customerStates){
   if(c.phase==='waiting'){
    c.wait=Math.max(0,(c.wait||0)-dt);
    if(c.wait<=0){c.phase='walking';c.holder.visible=true;this.hallDoorOpenUntil=Math.max(this.hallDoorOpenUntil,this.clock+1.25)}
    else continue
   }
   if(c.phase==='walking'){
    if(this.moveCustomerPath(c,dt))this.seatCustomer(c);
    continue
   }
   if(c.phase==='eating'){
    c.eatRemaining=Math.max(0,c.eatRemaining-dt);c.walkClock+=dt*4.8;
    c.holder.rotation.z=Math.sin(c.walkClock)*.014;c.holder.position.y=-.22+Math.max(0,Math.sin(c.walkClock*1.35))*.018;
    if(c.eatRemaining<=0){c.holder.rotation.z=0;c.holder.position.y=-.22;this.finishDining(c)}
    continue
   }
   if(c.phase==='reviewing'){
    c.reviewRemaining=Math.max(0,c.reviewRemaining-dt);
    if(c.reviewRemaining<=0){
     if(hasUpgrade('dishCart')){c.seat.dirtyPending=true;this.queueDishCart(c);this.beginCustomerExit(c)}
     else this.beginReturnDish(c)
    }
    continue
   }
   if(c.phase==='returningDish'){
    if(this.moveCustomerPath(c,dt,2.35)){this.setCustomerDishCarry(c,false);addDirtyPlate();this.beginCustomerExit(c)}
    continue
   }
   if(c.phase==='leaving'){
    if(this.moveCustomerPath(c,dt,2.45)){const id=c.orderId;this.resetCustomerForOrder(id)}
   }
  }
 }
 makeServiceStation(){
  const base=this.serviceGroup=new THREE.Group();base.position.copy(this.serviceHome);this.scene.add(base);
  const pad=new THREE.Mesh(new THREE.BoxGeometry(2.25,.18,1.45),this.material(0xe6c58f,{roughness:.55}));pad.position.y=-.08;pad.castShadow=true;pad.receiveShadow=true;base.add(pad);
  this.loadModel(BAKERY,'serving-tray.glb',1.35).then(o=>{if(o){o.rotation.y=Math.PI/2;base.add(o)}});
  const meal=this.serviceMeal=new THREE.Group();meal.position.y=.12;meal.visible=false;base.add(meal);
  this.loadModel(SUSHI,'ramen.glb',.9).then(o=>{if(o){o.position.y=.02;meal.add(o)}});
  const actionTile=this.makeFloorActionTile('배식대');actionTile.position.set(0,.027,-1.18);base.add(actionTile);base.userData.actionTile=actionTile;
 }
 setTrayMeal(show){
  if(this.serviceMeal)this.serviceMeal.visible=!!show;
 }
 animatePlate(index,onDone){
  const v=this.potVisuals[index];if(!v){onDone?.();return}
  const pot=v.potGroup,startPos=pot.position.clone(),startRot=pot.rotation.clone(),started=performance.now();
  const run=now=>{
   const t=Math.min(1,(now-started)/820),up=Math.sin(Math.PI*t);
   pot.position.set(startPos.x+.72*up,startPos.y+.32*up,startPos.z-.18*up);
   pot.rotation.z=-.95*Math.sin(Math.PI*Math.min(1,t*1.25));
   if(t>.48&&this.serviceMeal)this.serviceMeal.visible=true;
   if(t<1){requestAnimationFrame(run);return}
   pot.position.copy(startPos);pot.rotation.copy(startRot);onDone?.();
  };
  requestAnimationFrame(run)
 }
 customerReact(slot,intensity=1){
  const h=this.customerHolders[slot];if(!h)return;const token=(h.userData.reactionToken||0)+1;h.userData.reactionToken=token;const baseY=h.position.y,baseSY=h.userData.seatedScaleY||1,started=performance.now();
  const run=now=>{if(h.userData.reactionToken!==token)return;const t=Math.min(1,(now-started)/780);h.position.y=baseY+Math.sin(t*Math.PI*5)*.13*intensity*(1-t);h.rotation.z=Math.sin(t*Math.PI*6)*.075*intensity*(1-t);const sc=1+Math.sin(Math.PI*Math.min(1,t*1.45))*.08*intensity;h.scale.set(sc,sc*baseSY,sc);if(t<1)requestAnimationFrame(run);else{h.position.y=baseY;h.rotation.z=0;h.scale.set(1,baseSY,1)}};
  requestAnimationFrame(run);return token
 }
 customerCelebrate(slot,quality,combo,earned,meta={}){
  const h=this.customerHolders[slot];if(!h)return;
  const perfect=quality>=90,positive=quality>=76,intensity=perfect?1.35:positive?1.05:.78,token=this.customerReact(slot,intensity);
  const text=meta.text||(perfect?'🤩 최고예요!'+(combo>=2?' 🔥'+combo:''):positive?'😋 맛있어요!'+(combo>=2?' 🔥'+combo:''):'😕 아쉬워요.');
  const bubble=this.makeTextSprite(text);bubble.userData.customerFx=true;bubble.position.set(0,2.15,.05);bubble.scale.set(perfect?1.75:1.58,perfect?.55:.5,1);h.add(bubble);
  const coins=new THREE.Group();coins.userData.customerFx=true;coins.position.set(0,1.35,.18);h.add(coins);
  const geo=new THREE.SphereGeometry(.055,8,6),mat=new THREE.MeshBasicMaterial({color:positive?0xf7c84b:0xd97b6e,transparent:true,opacity:1});
  if(positive)for(let i=0;i<8;i++){const m=new THREE.Mesh(geo,mat);m.userData.vx=(i-3.5)*.12;m.userData.vy=.7+(i%3)*.12;m.userData.phase=i*.7;coins.add(m)}
  const started=performance.now(),run=now=>{
   if(h.userData.reactionToken!==token){h.remove(bubble);h.remove(coins);geo.dispose();mat.dispose();return}
   const t=Math.min(1,(now-started)/1050);
   bubble.position.y=2.15+t*.55;bubble.material.opacity=1-t;
   coins.children.forEach((m,i)=>{m.position.x=m.userData.vx*t;m.position.y=m.userData.vy*t-1.05*t*t;m.position.z=Math.sin(m.userData.phase+t*6)*.15;m.scale.setScalar(1-t*.35)});
   mat.opacity=1-t;
   if(t<1){requestAnimationFrame(run);return}
   h.remove(bubble);bubble.material.map?.dispose?.();bubble.material.dispose?.();h.remove(coins);geo.dispose();mat.dispose()
  };requestAnimationFrame(run)
 }
 animateServe(slot,onDone){
  if(hasUpgrade('hallStaff')){this.animateHallWorkerServe(slot,onDone);return}
  if(!this.serviceGroup){onDone?.();return}
  const g=this.serviceGroup,start=this.serviceHome.clone(),guest=this.customerHolders[slot],end=new THREE.Vector3(guest?.position.x??(this.customerXs[slot]??0),.92,(guest?.position.z??-2.75)+.55),started=performance.now();
  const run=now=>{
   const t=Math.min(1,(now-started)/700),e=1-Math.pow(1-t,3);g.position.lerpVectors(start,end,e);g.position.y=.92+Math.sin(Math.PI*t)*.3;
   if(t<1){requestAnimationFrame(run);return}
   if(this.serviceMeal)this.serviceMeal.visible=false;
   setTimeout(()=>{g.position.copy(this.serviceHome);onDone?.()},180)
  };
  requestAnimationFrame(run)
 }
 addIngredientVisual(index,id){
  const v=this.potVisuals[index];if(!v)return;
  if(id==='noodle'){v.noodleGroup.visible=true;return}
  if(id==='soup')return;
  const info=INGREDIENTS[id];if(!info?.model)return;
  const offsets={egg:[-.18,.02],green:[.15,-.12],cheese:[.18,.15]};
  this.loadModel(FOOD,info.model,.28).then(o=>{
   if(!o)return;
   const pos=offsets[id]||[0,0];o.position.set(pos[0],.01,pos[1]);o.rotation.y=index*.45;v.foodGroup.add(o)
  });
 }
 clearPotVisual(index){
  const v=this.potVisuals[index];if(!v)return;
  v.noodleGroup.visible=false;while(v.foodGroup.children.length)v.foodGroup.remove(v.foodGroup.children[0])
 }
 setSelectedPot(index){
  if(index==null){state.selectedPot=null;this.potVisuals.forEach(v=>v.selectRing.visible=false);renderPotStrip();renderSelectedHelp();updateActionButtons();return}
  if(index>=activePotCount()){toast('조금 더 서빙하면 이 화구가 열려요');return}
  if(state.tutorial.active&&state.tutorial.step===0&&index!==0){toast('첫 그릇은 1번 냄비로 같이 만들어 봐요');return}
  if(state.selectedPot!==index){state.discardArmedUntil=0;state.discardArmedPot=null;els.discard.classList.remove('armed')}
  state.selectedPot=index;
  if(state.tutorial.active&&state.tutorial.step===0&&index===0)state.tutorial.step=1;
  if(state.phase==='service')ensurePotOrder(index);
  this.potVisuals.forEach((v,i)=>v.selectRing.visible=i===index);
  renderPotStrip();renderSelectedHelp();renderTutorial();updateActionButtons()
 }
 pointerUp(e){
  if(this.dragLayout){this.dragLayout=null;document.body.classList.remove('layout-dragging');this.snapshotEquipmentLayout();renderSmartFilterButton();return}
  if(!state.running||state.phase!=='service')return;
  this.updatePointer(e);
  const hit=this.raycaster.intersectObjects(this.pickables,false)[0];
  if(!hit)return;
  this.setSelectedPot(hit.object.userData.potIndex);
 }
 resize(){
  const w=this.canvas.clientWidth||innerWidth,h=this.canvas.clientHeight||innerHeight;
  this.renderer.setSize(w,h,false);this.camera.aspect=w/Math.max(1,h);this.updateCamera(0,true)
 }
 updateCamera(dt=0,immediate=false){
  const w=this.canvas.clientWidth||innerWidth,mobile=w<650,service=state.phase==='service'&&this.player;
  let fx=0,fz=.45,fy=.9,px=0,py=mobile?12.2:10.5,pz=mobile?12.6:11.2,targetFov=mobile?50:43;
  if(service){
   fx=Math.max(-5.85,Math.min(5.85,this.player.position.x));
   fz=Math.max(-1.9,Math.min(4.75,this.player.position.z))-.72;
   fy=.86;
   px=fx;py=mobile?7.0:6.05;pz=fz+(mobile?6.7:5.65);targetFov=mobile?44:35;
   if(this.clock<this.hallFocusUntil&&this.hallFocusSlot!=null){
    const guest=this.customerHolders[this.hallFocusSlot];
    if(guest?.visible){
     fx=Math.max(-5.6,Math.min(5.6,guest.position.x));fz=guest.position.z+.35;fy=.72;
     px=fx*.72;py=mobile?8.5:7.35;pz=fz+(mobile?8.8:7.55);targetFov=mobile?48:42
    }
   }
  }
  const a=immediate?1:1-Math.exp(-Math.max(0,dt)*5.2);
  this.cameraGoal.set(px,py,pz);this.cameraFocus.lerp(new THREE.Vector3(fx,fy,fz),a);this.camera.position.lerp(this.cameraGoal,a);
  this.camera.fov+= (targetFov-this.camera.fov)*a;this.camera.lookAt(this.cameraFocus);this.camera.updateProjectionMatrix()
 }
 update(dt){
  this.clock+=dt;
  this.updatePlayer(dt);
  this.updateHelper(dt);
  if(this.helper?.userData?.cute)this.paintCuteCook(this.helper.userData.cute,!!this.helper.userData.moving,!!this.helper.userData.faceRight);
  this.updateCustomerHall(dt);
  this.updateDishCart(dt);
  this.updateAutomation(dt);
  this.updateCamera(dt);
  state.pots.forEach((p,i)=>{
   const v=this.potVisuals[i];if(!v)return;
   const boiling=p.water>.05&&p.heat>=3.5&&!p.burnt;
   v.liquid.visible=p.water>.05;
   if(p.water>.05){
    const soup=p.ingredients.includes('soup');
    const color=p.burnt?0x4a281d:soup?0xd86b35:0x63c8e5;v.liquid.material.color.setHex(color);
    v.liquid.position.y=.47+Math.sin(this.clock*5+i)*.006;
   }
   v.noodleGroup.rotation.y+=boiling?dt*.55:0;
   v.steam.visible=boiling;
   if(boiling){
    v.steam.children.forEach((m,n)=>{m.position.y=.08+((this.clock*.42+n*.21)%1)*.72;m.position.x=(n-2)*.12+Math.sin(this.clock*1.7+n)*.06;m.material.opacity=.12+((n+1)%3)*.04});
   }
   const hot=p.water>.05||p.ingredients.length;v.burner.material.emissiveIntensity=hot?(p.burnt?.95:.42):.06;v.flame.intensity=hot?(p.burnt?4.8:2.2):0;
   if(p.burnt)v.flame.color.setHex(0xff2f1d);else v.flame.color.setHex(0xff6a2b);
   const locked=i>=activePotCount(),selected=i===state.selectedPot;
   if(v.actionTile){v.actionTile.visible=!locked;v.actionTile.material.opacity=selected?.98:.7;v.actionTile.scale.setScalar(selected?1.08:1)}
   if(locked){v.selectRing.visible=false;v.flame.intensity=0;v.burner.material.emissiveIntensity=.02;return}
   const tutorialTarget=state.tutorial.active&&state.tutorial.step===0&&i===0;
   const ideal=hasIngredient(p,'noodle')&&p.noodleTime>=8.2&&p.noodleTime<=11.5&&!p.burnt;
   const danger=p.burnt||p.noodleTime>14.2;
   v.selectRing.visible=selected||tutorialTarget;
   v.selectRing.material.color.setHex(danger?0xff594f:ideal?0x68df7a:0xffe27b);
   v.selectRing.material.opacity=(selected||tutorialTarget)?(.8+.16*Math.sin(this.clock*5)):.12;
   v.selectRing.scale.setScalar(tutorialTarget?1+.055*Math.sin(this.clock*5):ideal&&selected?1+.035*Math.sin(this.clock*7):1);
  });
  this.renderer.render(this.scene,this.camera)
 }
}

const kitchen=new RamenKitchen3D(els.canvas);


function itemLabel(item){
 if(!item)return'빈칸';
 if(item.kind==='meal')return item.name||'완성 라면';
 if(item.id==='water'&&(item.amount||1)>1)return'물 '+(item.amount||1)+'컵';
 return ingredientLabel(item.id)
}
function storageLabel(group){
 if(group?.userData?.automationType==='conveyor')return'컨베이어';
 if(group?.userData?.automationType==='grabber')return'Grabber';
 if(group?.userData?.automationType==='smartGrabber')return'Smart Grabber';
 return'조리대'
}
function heldItemLabel(){return itemLabel(state.heldItem)}
function usePrepCounter(group){
 if(!group?.userData?.storageSlot)return false;
 if(group.userData.reservedBy==='helper'){toast('알바생이 이 조리대 재료를 가지러 오는 중이에요',1300);return false}
 const held=state.heldItem,stored=group.userData.storedItem,label=storageLabel(group);
 if(held&&stored){toast(label+'가 이미 '+itemLabel(stored)+'으로 차 있어요',1400);return false}
 if(held&&!stored){
  group.userData.storedItem={...held};kitchen.syncCounterVisual(group);setHeldItem(null);
  sfx('collect.coin_drop',{volume:.11,rate:.9,cooldownMs:80});toast(itemLabel(group.userData.storedItem)+'을 '+label+'에 내려놓았어요',1200);return true
 }
 if(!held&&stored){
  const item={...stored};group.userData.storedItem=null;kitchen.syncCounterVisual(group);setHeldItem(item);
  sfx('collect.coin_pickup',{volume:.12,rate:1.02,cooldownMs:80});toast(itemLabel(item)+'을 '+label+'에서 집었어요',1200);return true
 }
 toast('빈 '+label+'예요 · 아이템을 내려놓을 수 있어요',1300);return false
}
function setHeldItem(item){
 state.heldItem=item?{...item}:null;kitchen.setCarryVisual(state.heldItem);renderHeldStatus();updateActionButtons()
}
function renderHeldStatus(){
 if(!els.heldStatus)return;
 const h=state.heldItem;
 els.heldStatus.classList.toggle('empty',!h);
 els.heldStatus.innerHTML=h?'<small>손에 든 것</small><b>'+(h.kind==='meal'?'🍜 '+h.name:(INGREDIENTS[h.id]?.icon||'📦')+' '+itemLabel(h))+'</b>':'<small>손에 든 것</small><b>빈손</b>'
}
function tutorialCarryExpected(){
 if(!state.tutorial.active)return null;
 return({0:'water',1:'water',2:'noodle',3:'soup',4:'egg'})[state.tutorial.step]||null
}
function recommendedToppingIngredient(){
 const expected=tutorialCarryExpected();if(['egg','green','cheese'].includes(expected))return expected;
 const p=state.selectedPot==null?null:state.pots[state.selectedPot];
 const wanted=p?contextActionsForPot(p).filter(id=>['egg','green','cheese'].includes(id)):[];
 if(wanted.length)return wanted[0];
 for(const o of state.orders){
  const r=recipeById(o.recipeId);if(!r)continue;
  const topping=r.need.find(id=>['egg','green','cheese'].includes(id));
  if(topping)return topping
 }
 return'egg'
}
function returnHeldAtSource(ids){
 const held=state.heldItem;if(!held||held.kind!=='ingredient')return false;
 const list=Array.isArray(ids)?ids:[ids];
 if(!list.includes(held.id))return false;
 const name=heldItemLabel();setHeldItem(null);toast(name+'을 제자리에 돌려놓았어요',1200);return true
}
function dropHeldItem(){
 const held=state.heldItem;if(!held)return false;
 const name=heldItemLabel();setHeldItem(null);state.heldDiscardArmedUntil=0;
 if(held.kind==='meal'){addDirtyPlate();toast(name+'을 버렸어요 · 그릇은 싱크로 갔어요',1500)}
 else toast(name+'을 제자리에 돌려놓았어요',1200);
 return true
}
function pickIngredient(id){
 if(!id||!INGREDIENTS[id])return;
 if(state.heldItem){toast('한 번에 하나만 들 수 있어요 · '+heldItemLabel()+'을 먼저 사용해 주세요');return}
 const amount=id==='water'?2:1;setHeldItem({kind:'ingredient',id,amount});sfx('collect.coin_pickup',{volume:.13,rate:1.05,cooldownMs:70});
 toast(INGREDIENTS[id].icon+' '+(id==='water'?'물 2컵을 주전자에 받았어요':ingredientLabel(id)+'을 들었어요')+' · 냄비로 가져가 E',1400)
}
function insertHeldIntoPot(index){
 const held=state.heldItem;if(!held||held.kind!=='ingredient')return false;
 const action=held.id,p=state.pots[index];
 if(!canUseAction(action)){toast(nextInstruction(p),1500);return false}
 const changed=addToPot(index,action,held.amount||1);
 if(!changed)return false;
 setHeldItem(null);advanceTutorialAfterAction(action,p);renderPotStrip();renderSelectedHelp();updateActionButtons();return true
}
function serveHeldMeal(){
 const held=state.heldItem;
 if(!held||held.kind!=='meal'){toast('완성된 라면을 들고 배식대로 와 주세요');return}
 const order=(held.orderId!=null&&state.orders.find(o=>o.id===held.orderId))||state.orders.find(o=>o.recipeId===held.recipeId);
 if(!order){toast('이 라면을 기다리는 손님이 없어요');return}
 state.tray={orderId:order.id,recipeId:held.recipeId,name:held.name,quality:held.quality,label:held.label,burnt:held.burnt,cookMeta:held.cookMeta,ready:true};
 setHeldItem(null);serveOrder(order.id)
}

function activePotCount(){return state.tutorial.active?2:state.served>=6?4:state.served>=3?3:2}
function potIndexForOrder(orderId){return state.pots.findIndex(p=>p.orderId===orderId)}
function orderForPot(p){return p?.orderId==null?null:(state.orders.find(o=>o.id===p.orderId)||null)}
function releaseOrderBinding(orderId){state.pots.forEach(p=>{if(p.orderId===orderId)p.orderId=null})}
function assignOrderToPot(index,orderId,announce=true){
 const p=state.pots[index],order=state.orders.find(o=>o.id===orderId);if(!p||!order||index>=activePotCount())return false;
 const other=potIndexForOrder(orderId);if(other>=0&&other!==index){if(announce)toast('이 주문은 이미 냄비 '+(other+1)+'에서 만들고 있어요');return false}
 const recipe=recipeById(order.recipeId);
 if(p.orderId!==orderId&&!potEmpty(p)){if(announce)toast('냄비 '+(index+1)+'은 이미 조리 중이에요');return false}
 if(p.ingredients.some(id=>!recipe.need.includes(id))){if(announce)toast('이 냄비 재료와 '+recipe.name+' 주문이 맞지 않아요');return false}
 p.orderId=orderId;if(announce)toast('🧾 주문 #'+String(order.id).padStart(3,'0')+' → 냄비 '+(index+1),1300);
 renderOrders();renderTaskPanel();return true
}
function ensurePotOrder(index){
 const p=state.pots[index];if(!p||orderForPot(p))return orderForPot(p);
 const candidate=state.orders.find(o=>potIndexForOrder(o.id)<0&&p.ingredients.every(id=>recipeById(o.recipeId)?.need.includes(id)));
 if(candidate){assignOrderToPot(index,candidate.id,false);return candidate}
 return null
}
function focusOrder(orderId){
 const bound=potIndexForOrder(orderId);
 if(bound>=0){kitchen.setSelectedPot(bound);toast('🧾 이 주문은 냄비 '+(bound+1)+'에서 조리 중이에요',1100);return}
 let index=state.selectedPot;
 if(index==null||index>=activePotCount()||!potEmpty(state.pots[index])||state.pots[index].orderId!=null)index=state.pots.findIndex((p,i)=>i<activePotCount()&&potEmpty(p)&&p.orderId==null);
 if(index<0){toast('빈 냄비가 없어요 · 하나를 먼저 비우거나 서빙해 주세요',1500);return}
 if(assignOrderToPot(index,orderId,false)){kitchen.setSelectedPot(index);toast('🧾 주문을 냄비 '+(index+1)+'에 붙였어요',1200)}
}
function resetPot(index,keepOrder=true){
 const orderId=keepOrder?state.pots[index]?.orderId:null;state.pots[index]=newPot(index);state.pots[index].orderId=orderId??null;kitchen.clearPotVisual(index);renderPotStrip();renderSelectedHelp();updateActionButtons()
}
function hasIngredient(p,id){return !!p&&p.ingredients.includes(id)}
function potEmpty(p){return !!p&&p.water<=.05&&!p.ingredients.length}
function tutorialExpectedAction(){
 if(!state.tutorial.active)return null;
 return({1:'water',2:'noodle',3:'soup',4:'egg',5:'plate'})[state.tutorial.step]||null
}
function tutorialMessage(){
 if(!state.tutorial.active)return'';
 const p=state.pots[0],held=state.heldItem;
 if(state.tutorial.step===0)return held?.id==='water'?'① 물 2컵을 들고 1번 냄비로 가서 E':'① 싱크대에서 주전자에 물 2컵을 받아 1번 냄비로 가져가요';
 if(state.tutorial.step===1)return held?.id==='water'?'① 물 2컵을 1번 냄비에 부어 주세요':'① 싱크대에서 물 2컵을 한 번에 받아 오세요';
 if(state.tutorial.step===2)return held?.id==='noodle'?'② 면을 들고 1번 냄비에서 E':'② 면 바구니로 가서 E로 면을 들고 와요';
 if(state.tutorial.step===3)return held?.id==='soup'?'③ 스프를 들고 냄비에서 E':'③ 스프 바구니에서 스프를 들고 냄비로 가져가요';
 if(state.tutorial.step===4)return held?.id==='egg'?'④ 계란을 들고 냄비에서 E':'④ 첫 주문은 계란 라면 · 토핑 냉장고에서 계란을 꺼내요';
 if(state.tutorial.step===5){
  if(p.noodleTime<5.5)return'⑤ 보글보글 끓는 동안 기다려요 · 아직 설익었어요';
  if(p.noodleTime<8.2)return'⑤ 조금만 더! “딱 좋아요”가 될 때를 기다려요';
  if(p.noodleTime<=11.5)return'⑤ 지금이 가장 맛있어요! 빈손으로 1번 냄비에서 E';
  return'⑤ 면이 퍼지기 시작했어요! 냄비에서 E로 바로 담아요'
 }
 if(state.tutorial.step===6)return'⑥ 완성 라면을 들고 배식대로 이동해 E로 서빙해요';
 return''
}
function taskPlan(){
 if(!state.running)return[];
 if(state.phase==='prep')return[{label:'주방 배치를 확인하고 “영업 시작” 누르기',done:false,current:true}];
 if(state.closing)return[{label:kitchen.hasActiveDiningCustomers()?'마감 정리 중 · 마지막 손님 퇴장과 그릇 회수를 기다리기':'오늘 영업 정산 중…',done:false,current:true}];
 if(state.tutorial.active){
  const labels=[
   '싱크대에서 물 2컵을 한 번에 받아 1번 냄비에 넣기',
   '면 바구니에서 면을 가져와 넣기',
   '스프 바구니에서 스프를 가져와 넣기',
   '토핑 냉장고에서 계란을 꺼내 넣기',
   '“딱 좋아요”일 때 라면을 그릇에 담기',
   '완성 라면을 배식대에서 서빙하기'
  ];
  const doneCount=state.tutorial.step<=1?0:Math.min(5,state.tutorial.step-1);
  return labels.map((label,i)=>({label,done:i<doneCount,current:i===Math.min(doneCount,5)}))
 }
 const selectedIndex=state.selectedPot!=null?state.selectedPot:state.pots.findIndex(p=>orderForPot(p));
 const p=selectedIndex>=0?state.pots[selectedIndex]:state.pots[0],boundOrder=orderForPot(p),compatible=boundOrder||compatibleOrderForPot(p),order=compatible||(!p||potEmpty(p)?state.orders.find(o=>potIndexForOrder(o.id)<0)||state.orders[0]||null:null),r=order&&recipeById(order.recipeId);
 if(!order&&p&&!potEmpty(p))return[{label:'이 냄비의 손님이 떠났어요 · 냄비 비우기',done:false,current:true,urgent:true},{label:'새 주문을 냄비에 다시 배정하기',done:false,current:false}];
 if(!order){
  const dining=kitchen.customerStates.filter(c=>['eating','reviewing','returningDish','leaving'].includes(c.phase)).length;
  return[{label:dining?'손님 '+dining+'명 식사 중 · 다음 주문을 준비하세요':'새 주문을 기다리는 중…',done:false,current:true}]
 }
 if(p?.burnt)return[{label:'탄 냄비 비우기',done:false,current:true,urgent:true},{label:'새 냄비로 주문 다시 시작하기',done:false,current:false}];
 if(state.cleanPlates<=0&&state.dirtyPlates>0)return[{label:'싱크대에서 더러운 그릇 설거지하기',done:false,current:true,urgent:true},{label:r.name+' 조리 계속하기',done:false,current:false}];
 const mealReady=(state.heldItem?.kind==='meal'&&((state.heldItem.orderId!=null&&state.heldItem.orderId===order.id)||(state.heldItem.orderId==null&&state.heldItem.recipeId===order.recipeId)))||(state.tray?.ready&&((state.tray.orderId!=null&&state.tray.orderId===order.id)||(state.tray.orderId==null&&state.tray.recipeId===order.recipeId)));
 const waterDone=mealReady||p.water>=2||p.ingredients.length>0;
 const noodleDone=mealReady||hasIngredient(p,'noodle');
 const soupDone=mealReady||hasIngredient(p,'soup');
 const toppings=(r?.need||[]).filter(id=>!['noodle','soup'].includes(id));
 const toppingDone=mealReady||toppings.every(id=>hasIngredient(p,id));
 const recipeReady=!mealReady&&!!identifyRecipe(p);
 const plateDone=mealReady;
 const toppingName=toppings.length?toppings.map(ingredientLabel).join(' + '):'토핑';
 const steps=[
  {label:'싱크대에서 물 2컵 받아 냄비에 넣기',done:waterDone},
  {label:'면 바구니에서 면 가져오기',done:noodleDone},
  {label:'스프 바구니에서 스프 가져오기',done:soupDone},
  {label:'토핑 냉장고에서 '+toppingName+' 넣기',done:toppingDone},
  {label:recipeReady&&p.noodleTime>11.5?'면이 퍼지기 전에 바로 그릇에 담기':'“딱 좋아요”일 때 그릇에 담기',done:plateDone,urgent:recipeReady&&p.noodleTime>11.5},
  {label:r.name+'을 배식대에서 서빙하기',done:false}
 ];
 let current=steps.findIndex(x=>!x.done);if(current<0)current=steps.length-1;
 steps.forEach((x,i)=>x.current=i===current);return steps
}
function renderTaskPanel(){
 if(!els.taskList)return;
 const steps=taskPlan(),done=steps.filter(x=>x.done).length,p=state.selectedPot!=null?state.pots[state.selectedPot]:null,o=orderForPot(p);
 els.taskProgress.textContent=o?'냄비 '+(state.selectedPot+1)+' · #'+String(o.id).padStart(3,'0'):(steps.length?done+'/'+steps.length:'');
 els.taskList.innerHTML=steps.map((x,i)=>'<li data-step="'+(i+1)+'" class="'+(x.done?'done ':(x.current?'current ':'')+(x.urgent?'urgent ':''))+'">'+x.label+'</li>').join('')
}
function renderTutorial(){
 const active=state.running&&state.phase==='service'&&state.tutorial.active;
 document.body.classList.toggle('tutorial-mode',active);
 els.tutorialBanner.classList.toggle('hidden',!active);
 if(active)els.tutorialText.textContent=tutorialMessage();
 renderTaskPanel()
}
function compatibleOrderForPot(p){
 const bound=orderForPot(p);
 if(bound){const r=recipeById(bound.recipeId);return r&&p.ingredients.every(id=>r.need.includes(id))?bound:null}
 return state.orders.find(o=>{
  if(potIndexForOrder(o.id)>=0)return false;
  const r=recipeById(o.recipeId);if(!r)return false;
  return p.ingredients.every(id=>r.need.includes(id))
 })||null
}
function recommendedActionsForPot(p){
 if(!p||p.burnt||state.tray)return[];
 if(potEmpty(p)||p.water<1.5&&!p.ingredients.length)return['water'];
 const out=[];
 if(!hasIngredient(p,'noodle'))out.push('noodle');
 if(!hasIngredient(p,'soup'))out.push('soup');
 if(out.length)return out;
 const recipe=identifyRecipe(p);
 if(recipe){
  if(p.noodleTime>=8.2)return['plate'];
  return[];
 }
 const order=compatibleOrderForPot(p),r=order&&recipeById(order.recipeId);
 if(r)return r.need.filter(id=>id!=='noodle'&&id!=='soup'&&!hasIngredient(p,id));
 return[]
}
function canUseAction(action){
 if(state.phase!=='service'||state.busy||state.tray)return false;
 if(state.selectedPot==null)return false;
 const p=state.pots[state.selectedPot];
 if(!p)return false;
 if(state.tutorial.active){
  if(state.selectedPot!==0)return false;
  const expected=tutorialExpectedAction();
  if(action!==expected)return false;
  if(action==='water')return p.water<2;
  if(action==='plate')return hasIngredient(p,'noodle')&&hasIngredient(p,'soup')&&!!identifyRecipe(p)&&p.noodleTime>=8.2&&!state.tray;
 }
 if(p.burnt)return false;
 if(action==='water')return p.water<3&&!p.ingredients.length;
 if(action==='noodle'||action==='soup')return p.water>=1.5&&!hasIngredient(p,action);
 if(action==='egg'||action==='green'||action==='cheese')return p.water>=1.5&&hasIngredient(p,'noodle')&&hasIngredient(p,'soup')&&!hasIngredient(p,action);
 if(action==='plate')return hasIngredient(p,'noodle')&&hasIngredient(p,'soup')&&!!identifyRecipe(p)&&p.noodleTime>=5.5&&!state.tray;
 return false
}
function renderDiscardButton(){
 const p=state.selectedPot==null?null:state.pots[state.selectedPot],trayReady=!!state.tray?.ready,held=state.heldItem;
 const heldCanDrop=!!held&&(held.kind==='ingredient'||!state.tutorial.active);
 const disabled=!state.running||state.busy||(!heldCanDrop&&(state.tutorial.active||(!trayReady&&(!p||potEmpty(p)))));
 els.discard.disabled=disabled;
 if(performance.now()>state.discardArmedUntil&&performance.now()>state.trayDiscardArmedUntil&&performance.now()>state.heldDiscardArmedUntil){
  els.discard.classList.remove('armed');
  els.discard.querySelector('b').textContent=held?(held.kind==='meal'?'라면 버리기':'재료 내려놓기'):trayReady?'쟁반 비우기':'냄비 비우기'
 }
}
function contextActionsForPot(p){
 if(!state.running||state.phase!=='service'||state.busy||state.tray||!p)return[];
 if(state.tutorial.active)return[tutorialExpectedAction()].filter(Boolean);
 if(potEmpty(p)||p.water<1.5&&!p.ingredients.length)return['water'];
 const basics=[];if(!hasIngredient(p,'noodle'))basics.push('noodle');if(!hasIngredient(p,'soup'))basics.push('soup');if(basics.length)return basics;
 const bound=orderForPot(p),target=bound&&recipeById(bound.recipeId);
 if(target){
  const missing=target.need.filter(id=>['egg','green','cheese'].includes(id)&&!hasIngredient(p,id));
  if(missing.length)return missing;
  const exact=identifyRecipe(p);return exact?.id===target.id&&p.noodleTime>=5.5?['plate']:[]
 }
 const recipe=identifyRecipe(p);if(recipe)return p.noodleTime>=5.5?['plate']:[];
 const order=compatibleOrderForPot(p),r=order&&recipeById(order.recipeId);
 if(r)return r.need.filter(id=>['egg','green','cheese'].includes(id)&&!hasIngredient(p,id));
 return['egg','green','cheese']
}
function updateActionButtons(){
 els.dock.innerHTML='';
 const n=kitchen?.nearestStation;
 const addSourceButton=(id,label=null)=>{
  const info=INGREDIENTS[id];if(!info)return;
  const btn=document.createElement('button');btn.type='button';btn.dataset.pick=id;btn.disabled=!!state.heldItem;
  btn.innerHTML='<span>'+info.icon+'</span><b>'+(label||info.name+' 들기')+'</b>';
  btn.addEventListener('click',()=>pickIngredient(id));els.dock.appendChild(btn)
 };
 if(state.phase!=='service'){
  const wait=document.createElement('span');wait.className='action-wait';wait.textContent='영업 전에는 주방 배치를 정리해요';els.dock.appendChild(wait)
 }else if(n?.group?.userData?.storageSlot){
  const stored=n.group.userData.storedItem,reserved=n.group.userData.reservedBy==='helper',btn=document.createElement('button');btn.type='button';
  const label=storageLabel(n.group);
  if(reserved){btn.disabled=true;btn.innerHTML='<span>👨‍🍳</span><b>알바생 예약</b>'}
  else if(state.heldItem&&stored){btn.disabled=true;btn.innerHTML='<span>↔</span><b>'+label+' 사용 중</b>'}
  else if(state.heldItem){btn.innerHTML='<span>↓</span><b>'+label+'에 내려놓기</b>';btn.addEventListener('click',()=>usePrepCounter(n.group))}
  else if(stored){btn.innerHTML='<span>↑</span><b>'+itemLabel(stored)+' 집기</b>';btn.addEventListener('click',()=>usePrepCounter(n.group))}
  else{btn.disabled=true;btn.innerHTML='<span>□</span><b>빈 '+label+'</b>'}
  els.dock.appendChild(btn)
 }else if(state.heldItem){
  const wait=document.createElement('span');wait.className='action-wait';wait.textContent=heldItemLabel()+'을 들고 있어요 · '+(state.heldItem.kind==='meal'?'배식대 또는 빈 조리대로 이동':'냄비 또는 빈 조리대로 이동');els.dock.appendChild(wait)
 }else if(n?.type==='noodleSource'){
  addSourceButton('noodle','면 들기');
 }else if(n?.type==='soupSource'){
  addSourceButton('soup','스프 들기');
 }else if(n?.type==='fridge'){
  const toppings=state.tutorial.active?['egg']:['egg','green','cheese'];toppings.forEach(id=>addSourceButton(id));
 }else if(n?.type==='sink'){
  addSourceButton('water','주전자에 물 2컵 받기');
  if(state.dirtyPlates>0){const wash=document.createElement('button');wash.type='button';wash.innerHTML='<span>🧼</span><b>설거지</b>';wash.addEventListener('click',washOnePlate);els.dock.appendChild(wash)}
 }else if(n?.type==='pot'){
  const p=state.pots[n.potIndex],ready=canUseAction('plate');
  if(ready){const plate=document.createElement('button');plate.type='button';plate.className='ready-now';plate.innerHTML='<span>🥣</span><b>라면 담기</b>';plate.addEventListener('click',()=>platePot(n.potIndex));els.dock.appendChild(plate)}
  else{const wait=document.createElement('span');wait.className='action-wait';wait.textContent=nextInstruction(p);els.dock.appendChild(wait)}
 }else if(n?.type==='service'){
  const wait=document.createElement('span');wait.className='action-wait';wait.textContent='완성 라면을 들고 와서 E로 서빙';els.dock.appendChild(wait)
 }else{
  const wait=document.createElement('span');wait.className='action-wait';wait.textContent='설비 가까이 이동하면 할 수 있는 행동이 나타나요';els.dock.appendChild(wait)
 }
 renderDiscardButton()
}
function nextInstruction(p){
 if(state.heldItem?.kind==='meal')return state.heldItem.name+'을 들고 배식대로 이동해 E로 서빙하세요';
 if(state.heldItem?.kind==='ingredient')return heldItemLabel()+'을 들고 있어요 · 사용할 냄비 가까이에서 E';
 if(state.tray)return'라면을 서빙하는 중이에요';
 if(!p)return'싱크·면 바구니·스프 바구니·토핑 냉장고에서 재료를 하나씩 가져오세요';
 if(p.burnt)return'탔어요 · 왼쪽 아래 “냄비 비우기”로 새로 시작하세요';
 if(potEmpty(p))return'싱크에서 물을 받아 이 냄비로 가져오세요';
 if(p.water<1.5&&!p.ingredients.length)return'싱크대에서 주전자에 물 2컵을 받아 오세요';
 if(!hasIngredient(p,'noodle')&&!hasIngredient(p,'soup'))return'면 바구니와 스프 바구니를 차례로 다녀오세요';
 if(!hasIngredient(p,'noodle'))return'면 바구니에서 면을 가져오세요';
 if(!hasIngredient(p,'soup'))return'스프 바구니에서 스프를 가져오세요';
 const bound=orderForPot(p),target=bound&&recipeById(bound.recipeId);
 if(target){
  const missing=target.need.filter(id=>['egg','green','cheese'].includes(id)&&!hasIngredient(p,id));
  if(missing.length)return target.name+' · '+missing.map(ingredientLabel).join(' + ')+'을 더 넣으세요';
  const exact=identifyRecipe(p);
  if(!exact||exact.id!==target.id)return target.name+' 주문과 재료가 달라요 · 냄비를 확인하세요'
 }
 const recipe=target||identifyRecipe(p);
 if(!recipe){
  const order=compatibleOrderForPot(p),r=order&&recipeById(order.recipeId);
  return r?'주문 확인 → '+r.name+'에 필요한 토핑을 넣으세요':'위 주문을 보고 계란·대파·치즈 중 토핑을 골라 주세요'
 }
 if(p.noodleTime<5.5)return recipe.name+' · 아직 설익었어요. 잠시 기다리세요';
 if(p.noodleTime<8.2)return recipe.name+' · 조금 더 끓이면 가장 맛있어요';
 if(p.noodleTime<=11.5)return'✅ '+recipe.name+' · 지금 “담기”를 누르세요!';
 if(p.noodleTime<=14.2)return'⚠ '+recipe.name+' · 퍼지고 있어요. 빨리 담으세요!';
 return'🚨 곧 타요! 바로 담으세요'
}
function addToPot(index,id,amount=1){
 const p=state.pots[index];
 if(id==='water'){
  if(p.water>=3){toast('물은 3컵까지 넣을 수 있어요');return false}
  const cups=Math.max(1,Number(amount)||1);p.water=Math.min(3,p.water+cups);p.sequence.push('water:'+cups);p.heat=0;sfx('collect.coin_drop',{volume:.12,rate:.8,cooldownMs:80});toast('냄비 '+(index+1)+' · 물 '+Math.round(p.water)+'컵');return true
 }
 if(hasIngredient(p,id)){toast(ingredientLabel(id)+'은 이미 들어 있어요');return false}
 if(p.burnt){toast('탄 냄비는 먼저 비워 주세요');return false}
 p.ingredients.push(id);p.sequence.push(id);kitchen.addIngredientVisual(index,id);sfx('collect.coin_pickup',{volume:.13,rate:1.05,cooldownMs:70});toast('냄비 '+(index+1)+' · '+ingredientLabel(id)+' 넣기');return true
}
function advanceTutorialAfterAction(action,p){
 if(!state.tutorial.active)return;
 if(state.tutorial.step===1&&action==='water'&&p.water>=2)state.tutorial.step=2;
 else if(state.tutorial.step===2&&action==='noodle'&&hasIngredient(p,'noodle'))state.tutorial.step=3;
 else if(state.tutorial.step===3&&action==='soup'&&hasIngredient(p,'soup'))state.tutorial.step=4;
 else if(state.tutorial.step===4&&action==='egg'&&hasIngredient(p,'egg'))state.tutorial.step=5;
 renderTutorial();updateActionButtons();renderSelectedHelp();renderPotStrip()
}
function potCondition(p){
 if(p.burnt)return'탔어요!';
 if(potEmpty(p))return'빈 냄비';
 if(!hasIngredient(p,'noodle'))return p.heat>=3.5?'물이 끓어요':'물 데우는 중';
 if(p.noodleTime<5.5)return'설익음';
 if(p.noodleTime<8.2)return'조금 더';
 if(p.noodleTime<=11.5)return'딱 좋아요!';
 if(p.noodleTime<=14.2)return'퍼지는 중';
 return'위험!'
}
function identifyRecipe(p){
 if(!p)return null;
 return restaurant.recipes.findExact(p.ingredients)
}
function qualityFor(p,recipe){
 let q=100;if(!recipe)q-=58;
 const waterTarget=2;q-=Math.abs(p.water-waterTarget)*18;
 const t=p.noodleTime;if(t<8.2)q-=(8.2-t)*8.5;else if(t>11.5)q-=(t-11.5)*8;
 q-=p.mistakes*12;if(!hasIngredient(p,'soup'))q-=25;if(p.burnt)q=Math.min(q,12);
 return Math.max(5,Math.min(100,Math.round(q)))
}
function qualityLabel(q,burnt=false){
 if(burnt)return'탔어요';if(q>=90)return'최고!';if(q>=76)return'맛있음';if(q>=58)return'괜찮음';if(q>=38)return'아쉬움';return'실패'
}
function platePot(index){
 if(state.heldItem){toast('손이 차 있어요 · '+heldItemLabel()+'을 먼저 사용해 주세요');return false}
 if(state.tray||state.busy){toast('배식 중이에요');return false}
 if(state.cleanPlates<=0){toast('깨끗한 그릇이 없어요 · 싱크에서 더러운 그릇을 씻어 주세요',1900);return false}
 const p=state.pots[index];if(!hasIngredient(p,'noodle')){toast('면이 들어간 라면만 담을 수 있어요');return false}
 const recipe=identifyRecipe(p);if(!recipe){toast('주문에 맞는 토핑을 확인해 주세요');return false}
 const boundOrder=orderForPot(p)||compatibleOrderForPot(p);if(boundOrder&&!p.orderId)p.orderId=boundOrder.id;
 if(boundOrder&&boundOrder.recipeId!==recipe.id){toast('냄비 '+(index+1)+'은 '+recipeById(boundOrder.recipeId).name+' 주문이에요',1600);return false}
 const quality=qualityFor(p,recipe),tutorialPlate=state.tutorial.active&&state.tutorial.step===5&&index===0,orderId=p.orderId,cookMeta={noodleTime:p.noodleTime,water:p.water,mistakes:p.mistakes,burnt:p.burnt};
 state.cleanPlates=Math.max(0,state.cleanPlates-1);updateDishHud();
 p.plating=true;state.busy=true;state.tray={orderId,recipeId:recipe.id,name:recipe.name,quality,label:qualityLabel(quality,p.burnt),burnt:p.burnt,cookMeta,ready:false};
 renderTray();renderOrders();renderSelectedHelp();updateActionButtons();toast('냄비를 기울여 그릇에 담는 중…',1200);
 kitchen.animatePlate(index,()=>{
  resetPot(index);state.busy=false;if(!state.tray)return;state.tray.ready=true;kitchen.setTrayMeal(false);
  const meal={kind:'meal',orderId:state.tray.orderId,recipeId:state.tray.recipeId,name:state.tray.name,quality:state.tray.quality,label:state.tray.label,burnt:state.tray.burnt,cookMeta:state.tray.cookMeta};state.tray=null;setHeldItem(meal);
  if(tutorialPlate)state.tutorial.step=6;
  renderTray();renderOrders();renderTutorial();renderSelectedHelp();updateActionButtons();sfx(quality>=75?'success.cheer_yay':'failure.fail_sting',{volume:.18,cooldownMs:250});
  toast(meal.name+' 완성! 직접 들고 배식대로 가져가세요',1900)
 });
 return true
}
function applyAction(index,action){
 if(!state.running||index==null)return false;
 if(!canUseAction(action)){
  if(state.tutorial.active)toast(tutorialMessage(),1500);
  else toast(nextInstruction(state.pots[index]),1500);
  return false
 }
 const p=state.pots[index];
 const changed=action==='plate'?platePot(index):addToPot(index,action,action==='water'?2:1);
 if(changed&&action!=='plate')advanceTutorialAfterAction(action,p);
 renderPotStrip();renderSelectedHelp();updateActionButtons();return changed
}
function handleAction(action){
 if(state.selectedPot==null){toast('먼저 조리할 냄비를 눌러 선택하세요',1600);return}
 applyAction(state.selectedPot,action)
}
function requestDiscard(){
 const now=performance.now();
 if(state.heldItem){
  if(state.heldItem.kind==='ingredient'){dropHeldItem();renderDiscardButton();return}
  if(state.tutorial.active){toast('첫 라면은 손님에게 서빙해 보세요');return}
  if(now>state.heldDiscardArmedUntil){state.heldDiscardArmedUntil=now+2200;els.discard.classList.add('armed');els.discard.querySelector('b').textContent='한 번 더 눌러 버리기';toast('완성 라면을 정말 버릴까요?',1400);return}
  dropHeldItem();renderDiscardButton();return
 }
 if(state.tutorial.active){toast('첫 라면은 같이 완성해 본 뒤 비우기를 사용할 수 있어요');return}
 if(state.tray?.ready){
  if(now>state.trayDiscardArmedUntil){state.trayDiscardArmedUntil=now+2400;els.discard.classList.add('armed');els.discard.querySelector('b').textContent='한 번 더 눌러 쟁반 비우기';toast('한 번 더 누르면 완성된 라면을 버려요',1600);return}
  state.trayDiscardArmedUntil=0;state.tray=null;kitchen.setTrayMeal(false);addDirtyPlate();renderTray();renderOrders();renderSelectedHelp();updateActionButtons();renderDiscardButton();toast('라면은 버렸지만 사용한 그릇은 싱크로 갔어요');return
 }
 if(state.selectedPot==null){toast('먼저 비울 냄비를 선택하세요');return}
 const p=state.pots[state.selectedPot];if(potEmpty(p)){toast('이미 빈 냄비예요');return}
 if(now>state.discardArmedUntil||state.discardArmedPot!==state.selectedPot){
  state.discardArmedUntil=now+2400;state.discardArmedPot=state.selectedPot;els.discard.classList.add('armed');els.discard.querySelector('b').textContent='한 번 더 눌러 정말 비우기';toast('실수 방지 · 같은 냄비를 한 번 더 확인해야 비워요',1800);return
 }
 const index=state.selectedPot;state.discardArmedUntil=0;state.discardArmedPot=null;resetPot(index);renderDiscardButton();sfx('collect.coin_drop',{volume:.1,rate:.72,cooldownMs:100});toast('냄비 '+(index+1)+'을 비웠어요')
}
function updatePots(dt){
 state.pots.forEach(p=>{
  if(p.plating)return;
  if(p.water>.05){p.heat+=dt;if(p.heat>=3.5){p.water=Math.max(0,p.water-dt*.021);if(hasIngredient(p,'noodle'))p.noodleTime+=dt}}
  else if(p.ingredients.length)p.heat+=dt*.25;
  if(hasIngredient(p,'noodle')&&(p.noodleTime>16.5||p.water<.16&&p.heat>4))p.burnt=true
 })
}
function potPrompt(p){
 if(p.burnt)return'🟥 탔어요 · 비우기';
 if(potEmpty(p))return'① 물을 부어 주세요';
 if(p.water<1.5&&!p.ingredients.length)return'💧 물을 한 번 더';
 if(!hasIngredient(p,'noodle')||!hasIngredient(p,'soup'))return'🍜 면·스프 넣기';
 if(!identifyRecipe(p))return'🥚 주문 토핑 넣기';
 if(p.noodleTime<8.2)return'⏳ 익는 중';
 if(p.noodleTime<=11.5)return'✅ 지금 담기!';
 if(p.noodleTime<=14.2)return'⚠ 빨리 담기!';
 return'🚨 곧 타요!'
}
function renderPotStrip(){
 els.pots.innerHTML='';
 state.pots.forEach((p,i)=>{
  const d=document.createElement('button');d.type='button';const locked=i>=activePotCount();
  const ideal=hasIngredient(p,'noodle')&&p.noodleTime>=8.2&&p.noodleTime<=11.5&&!p.burnt,danger=p.burnt||p.noodleTime>14.2;
  d.className='pot-tag'+(i===state.selectedPot?' active':'')+(ideal?' ready':'')+(danger?' danger':'')+(locked?' locked':'');
  d.textContent=locked?'🔒 화구 '+(i+1):(i+1)+' · '+potPrompt(p);d.disabled=locked;d.addEventListener('click',()=>kitchen.setSelectedPot(i));els.pots.appendChild(d)
 })
}
function renderSelectedHelp(){
 const p=state.selectedPot==null?null:state.pots[state.selectedPot];
 els.selected.textContent=nextInstruction(p);renderTaskPanel()
}
function unlockedSeatSlots(){
 return kitchen?.hallSeats?.filter(s=>s.enabled&&!s.occupiedBy&&!s.dirtyPending).map(s=>s.slot) || [0,1]
}
function makeOrder(forcedId=null){
 const used=new Set(state.orders.map(o=>o.slot)),slots=unlockedSeatSlots(),slot=slots.find(n=>!used.has(n));
 if(slot==null)return null;
 const ids=availableRecipeIds(),recipeId=forcedId||ids[Math.floor(Math.random()*ids.length)]||'egg';
 return restaurant.spawnOrder(recipeId,{slot,customer:CUSTOMER_ICONS[slot%CUSTOMER_ICONS.length]})
}
function spawnOrder(forcedId=null){
 if(!state.running||state.closing||state.orders.length>=MAX_ORDERS)return;
 const order=makeOrder(forcedId);if(!order)return;
 kitchen.beginCustomerArrival(order);
 if(state.tutorial.active&&!state.pots[0].orderId)assignOrderToPot(0,order.id,false);
 else if(state.selectedPot!=null&&state.selectedPot<activePotCount()&&potEmpty(state.pots[state.selectedPot])&&state.pots[state.selectedPot].orderId==null)assignOrderToPot(state.selectedPot,order.id,false);
 renderOrders();sfx('collect.coin_drop',{volume:.11,rate:1.12,cooldownMs:150})
}
function orderIngredientText(r){return r.need.map(id=>ingredientLabel(id)).join(' + ')}
function orderIngredientIcons(r){return r.need.map(id=>INGREDIENTS[id]?.icon||'').join(' ')}
const seenOrderTickets=new Set();
function orderWaitState(patience){
 const p=Math.max(0,Number(patience)||0);
 if(p<=32)return{key:'urgent',label:'급해요!',icon:'⚠'};
 if(p<=58)return{key:'hurry',label:'서둘러요',icon:'⏱'};
 return{key:'calm',label:'대기 중',icon:'•'}
}
function orderTicketRows(r){
 const rows=[['💧','물','2컵']];
 r.need.forEach(id=>rows.push([INGREDIENTS[id]?.icon||'·',ingredientLabel(id),'1']));
 return rows.map(([icon,name,count])=>'<div class="ticket-row"><span class="ticket-item"><i>'+icon+'</i>'+name+'</span><b>'+count+'</b></div>').join('')
}
function renderOrders(){
 els.orders.innerHTML='';
 state.orders.forEach(o=>{
  const r=recipeById(o.recipeId),d=document.createElement('button');d.type='button',potIndex=potIndexForOrder(o.id);
  const matching=(state.heldItem?.kind==='meal'&&((state.heldItem.orderId!=null&&state.heldItem.orderId===o.id)||(state.heldItem.orderId==null&&state.heldItem.recipeId===o.recipeId)))||(state.tray?.ready&&((state.tray.orderId!=null&&state.tray.orderId===o.id)||(state.tray.orderId==null&&state.tray.recipeId===o.recipeId)));
  const wait=orderWaitState(o.patience),fresh=!seenOrderTickets.has(o.id);seenOrderTickets.add(o.id);
  d.className='order-ticket '+wait.key+(potIndex>=0?' bound':'')+(matching?' waiting':'')+(fresh?' printing':'')+(state.tutorial.active&&state.tutorial.step===6&&o.recipeId==='egg'?' target':'');
  d.dataset.order=String(o.id);d.dataset.slot=String(o.slot);
  d.innerHTML=
   '<span class="ticket-tear ticket-tear-top" aria-hidden="true"></span>'+
   '<div class="ticket-head"><span class="ticket-brand">BOGLE ORDER</span><span class="ticket-no">#'+String(o.id).padStart(3,'0')+'</span></div>'+
   '<div class="ticket-customer"><span class="customer-face">'+o.customer+'</span><span><small>'+(o.tableNo?o.tableNo+'번 테이블':(Number(o.slot)+1)+'번 손님')+(o.arriving?' · 입장 중':'')+'</small><strong>'+r.name+'</strong></span></div>'+
   '<div class="ticket-assignment '+(potIndex>=0?'assigned':'')+'">'+(potIndex>=0?'🍳 냄비 '+(potIndex+1):'＋ 냄비에 배정')+'</div>'+
   '<div class="ticket-rule"></div>'+
   '<div class="ticket-items">'+orderTicketRows(r)+'</div>'+
   '<div class="ticket-rule dotted"></div>'+
   '<div class="ticket-route"><small>조리 힌트</small><b>물 → '+r.need.map(id=>ingredientLabel(id)).join(' → ')+'</b></div>'+
   '<div class="ticket-wait"><span>'+wait.icon+' '+wait.label+'</span><em>'+Math.max(0,Math.round(o.patience))+'%</em></div>'+
   '<div class="patience"><i style="transform:scaleX('+(Math.max(0,o.patience)/100)+')"></i></div>'+
   '<span class="ticket-stamp" aria-hidden="true">완료</span>'+
   '<span class="ticket-tear ticket-tear-bottom" aria-hidden="true"></span>';
  d.addEventListener('click',()=>{if(state.heldItem?.kind==='meal')toast('완성 라면을 들고 배식대에서 E를 눌러 주세요');else focusOrder(o.id)});
  els.orders.appendChild(d)
 });
 renderTaskPanel()
}
function renderTray(){
 els.trayBtn.classList.add('hidden')
}
function serveOrder(orderId){
 if(!state.running||state.busy)return;
 const order=state.orders.find(o=>o.id===orderId);if(!order)return;
 if(!state.tray?.ready){toast('먼저 라면을 그릇에 담아 쟁반에 올려 주세요');return}
 if(state.tray.recipeId!==order.recipeId){
  restaurant.orders.adjustPatience(order.id,-5);renderOrders();const wrong=els.orders.querySelector('[data-order="'+order.id+'"]');wrong?.classList.add('wrong');setTimeout(()=>wrong?.classList.remove('wrong'),320);
  sfx('failure.fail_sting',{volume:.16,cooldownMs:250});toast('앗, 이 손님은 '+recipeById(order.recipeId).name+' 주문이에요');return
 }
 const r=recipeById(order.recipeId),q=state.tray.quality,wasTutorial=state.tutorial.active&&state.tutorial.step===6,slot=order.slot;
 const quote=restaurant.quote(order.id,state.tray.recipeId,{quality:q}),earned=quote.earned,before=activePotCount();
 order.paused=true;state.busy=true;els.trayBtn.classList.add('hidden');updateActionButtons();toast('쟁반을 손님 앞으로 가져가는 중…',900);
 kitchen.animateServe(slot,()=>{
  const ticket=els.orders.querySelector('[data-order="'+order.id+'"]');
  const sale=restaurant.serve(orderId,r.id,{quality:q});
  if(!sale.ok){order.paused=false;state.busy=false;renderOrders();updateActionButtons();toast('주문 상태가 바뀌었어요 · 다시 확인해 주세요',1700);return}
  if(ticket){ticket.classList.add('served');ticket.setAttribute('aria-label',r.name+' 주문 완료')}
  const mealMeta={quality:q,label:state.tray?.label,burnt:!!state.tray?.burnt,...(state.tray?.cookMeta||{})};
  const streak=applyServeCombo(q),repGain=addServeReputation(q),totalEarned=earned+streak.bonus;releaseOrderBinding(order.id);pulseComboHud();
  kitchen.beginDining(order.id,{...mealMeta,combo:streak.combo,earned:totalEarned});
  state.tray=null;state.busy=false;
  const after=activePotCount();
  if(wasTutorial){
   state.tutorial.active=false;state.tutorial.step=7;state.spawnClock=0;unlockHelper();
   setTimeout(()=>{if(state.running&&!state.closing){spawnOrder();toast('알바생 합류! 조리대에 올린 재료를 필요한 냄비로 옮겨줘요',3000)}},1250)
  }
  renderTray();setTimeout(()=>renderOrders(),420);renderTutorial();renderPotStrip();renderSelectedHelp();updateActionButtons();updateHud();sfx(q>=90||streak.combo>=3?'success.cheer_yay':q>=76?'shop.purchase':'collect.coin_pickup',{volume:q>=90?.32:.25,cooldownMs:300});
  const comboText=streak.combo>=2?' · 🔥 '+streak.combo+'콤보'+(streak.bonus?' 보너스 +'+money(streak.bonus):''):'' ,repText=repGain?' · ⭐ 평판 +'+repGain:'';
  if(after>before)toast('🎉 새 화구 OPEN! 냄비 '+after+'개 · '+qualityLabel(q)+comboText,2400);
  else if(wasTutorial)toast('🎉 '+r.name+' 첫 서빙 성공! +'+money(totalEarned),1900);
  else toast((q>=90?'✨ PERFECT! ':q>=76?'😋 맛있음! ':'🍜 서빙! ')+ '+'+money(totalEarned)+comboText,2000)
 })
}

function renderSmartFilterButton(){
 if(!els.smartFilter)return;
 const g=kitchen?.selectedLayoutStation,show=state.phase==='prep'&&g?.visible&&g?.userData?.automationType==='smartGrabber';
 els.smartFilter.classList.toggle('hidden',!show);
 if(show)els.smartFilter.textContent='🎯 필터: '+ingredientLabel(g.userData.filterId||'noodle')
}
function cycleSmartFilter(){
 const g=kitchen?.selectedLayoutStation;if(state.phase!=='prep'||g?.userData?.automationType!=='smartGrabber')return;
 const current=SMART_FILTERS.indexOf(g.userData.filterId),next=SMART_FILTERS[(current+1+SMART_FILTERS.length)%SMART_FILTERS.length];
 g.userData.filterId=next;progress.filters[g.userData.stationId]=next;kitchen.snapshotEquipmentLayout();renderSmartFilterButton();toast('Smart Grabber · '+ingredientLabel(next)+'만 통과',1200)
}
let shopCategory='all',shopRenderSignature='';
function nextReputationTarget(){
 const stars=reputationStars();return stars>=5?null:REP_THRESHOLDS[stars]
}
function shopLockReason(key,info,count){
 if(count>=(info.max||1))return'구매 완료';
 const stars=reputationStars();
 if((info.minStars||1)>stars)return'★'.repeat(info.minStars)+' 평판 필요';
 if(info.requires&&!hasUpgrade(info.requires)&&(progress.owned[info.requires]||0)<(SHOP_ITEMS[info.requires]?.min||1))return SHOP_ITEMS[info.requires]?.name+' 먼저 필요';
 if(progress.cash<info.price)return'금고 잔액 부족';
 return''
}
function renderEquipmentShop(force=false){
 if(!els.equipmentShop)return;
 const sig=[shopCategory,progress.cash,progress.reputation,...Object.keys(SHOP_ITEMS).map(k=>progress.owned[k]||0)].join('|');
 if(!force&&sig===shopRenderSignature)return;shopRenderSignature=sig;
 const entries=Object.entries(SHOP_ITEMS).filter(([,info])=>shopCategory==='all'||info.category===shopCategory);
 const groups=new Map();
 entries.forEach(([key,info])=>{if(!groups.has(info.category))groups.set(info.category,[]);groups.get(info.category).push([key,info])});
 els.equipmentShop.innerHTML=[...groups].map(([cat,items])=>
  '<section class="shop-category"><h3>'+SHOP_CATEGORY_LABELS[cat]+'</h3><div class="shop-category-grid">'+items.map(([key,info])=>{
   const count=progress.owned[key]||0,max=info.max||1,reason=shopLockReason(key,info,count),owned=count>=max,locked=!!reason&&!owned;
   const countText=max>1?'<span class="count-badge">'+count+'/'+max+'</span>':(owned?'<span class="count-badge">✓</span>':'');
   return '<button type="button" class="shop-item '+(owned?'owned ':'')+(locked?'locked ':'')+'" data-buy="'+key+'" '+(reason?'disabled':'')+'>'+
    '<span>'+info.icon+'</span><b>'+info.name+'</b><small>'+info.desc+'</small><em>'+money(info.price)+'</em>'+countText+
    (reason?'<i class="shop-lock-reason">'+reason+'</i>':'')+'</button>'
  }).join('')+'</div></section>'
 ).join('');
}
function renderEconomyProgress(){
 if(els.bankCash)els.bankCash.textContent=money(progress.cash);
 if(els.shopCash)els.shopCash.textContent=money(progress.cash);
 const stars=reputationStars(),next=nextReputationTarget(),label=reputationLabel();
 if(els.repStars)els.repStars.textContent=String(stars);
 if(els.endRep)els.endRep.textContent=label;
 if(els.shopRep)els.shopRep.textContent=label+(next==null?' · 최고 평판!':' · 다음 별까지 '+Math.max(0,next-progress.reputation));
 renderEquipmentShop()
}
function purchaseEquipment(key){
 const info=SHOP_ITEMS[key];if(!info||state.phase!=='ended')return false;
 const count=progress.owned[key]||0,max=info.max||1,reason=shopLockReason(key,info,count);
 if(reason){toast(reason,1600);return false}
 progress.cash-=info.price;progress.owned[key]=count+1;
 if(EQUIPMENT[key]){
  const g=kitchen.revealNewestEquipment(key);if(g?.userData?.automationType==='smartGrabber')g.userData.filterId=progress.filters[g.userData.stationId]||'noodle'
 }
 kitchen.syncProgressUpgrades();kitchen.snapshotEquipmentLayout();saveProgress();shopRenderSignature='';renderEconomyProgress();
 sfx('shop.purchase',{volume:.24,cooldownMs:150});
 const effect=key==='table3'||key==='table4'?'홀에 새 테이블이 생겼어요!':key==='hallExpansion'?'홀 확장 완료 · 5번 테이블 OPEN!':key==='hallStaff'?'홀 알바가 출근했어요!':key==='menuPlus'?'새 라면 2종이 주문에 등장해요!':key==='famousSign'?'간판 교체 완료 · 매출 10% 보너스!':info.name+' 적용!';
 toast('🎉 '+effect,2100);return true
}

function renderHelperButton(){
 if(!els.helper)return;
 els.helper.classList.toggle('hidden',!state.helperUnlocked);
 els.helper.classList.toggle('active',state.helperEnabled);
 els.helper.textContent=state.helperEnabled?'👨‍🍳 ON':'👨‍🍳 OFF';
 els.helper.title=state.helperEnabled?'알바생 자동 운반 켜짐':'알바생 자동 운반 꺼짐'
}
function unlockHelper(){
 if(state.helperUnlocked)return;
 state.helperUnlocked=true;state.helperEnabled=true;progress.tutorialDone=true;saveProgress();kitchen.setHelperEnabled(true);renderHelperButton()
}

function updateDishHud(){
 if(!els.dishStatus)return;
 els.dishStatus.innerHTML='🥣 <b>'+state.cleanPlates+'</b><small>깨끗</small> · 🧼 <b>'+state.dirtyPlates+'</b><small>더러움</small>';
 kitchen?.syncDishVisuals?.()
}
function addDirtyPlate(){
 state.dirtyPlates+=1;updateDishHud();
 if(state.cleanPlates===0)toast('깨끗한 그릇이 없어요 · 싱크에서 E를 눌러 설거지!',1900)
}
function washOnePlate(){
 if(state.phase!=='service'||state.washing)return;
 if(state.dirtyPlates<=0){toast('씻을 그릇이 없어요');return}
 state.washing=true;sfx('collect.coin_drop',{volume:.1,rate:.68,cooldownMs:120});toast('🧼 그릇을 씻는 중…',1300);
 const sink=kitchen.layoutStations.find(s=>s.id==='sink')?.group?.userData?.ring;if(sink){sink.material.color.setHex(0x72d8ff);sink.material.opacity=1}
 setTimeout(()=>{
  if(!state.running)return;
  state.dirtyPlates=Math.max(0,state.dirtyPlates-1);state.cleanPlates+=1;state.washing=false;updateDishHud();
  sfx('success.cheer_yay',{volume:.13,cooldownMs:150});toast('깨끗한 그릇 +1',1200)
 },hasUpgrade('wideSink')?900:1450)
}
function updateOrders(dt){
 if(state.tutorial.active||state.closing)return;
 const {expiredOrders}=restaurant.tick(dt,{
  advanceShift:false,
  advanceOrders:true,
  advanceAutomation:false,
  context:{served:state.served}
 });
 if(expiredOrders.length){
  const affected=expiredOrders.map(o=>potIndexForOrder(o.id)).filter(i=>i>=0);
  expiredOrders.forEach(o=>{releaseOrderBinding(o.id);kitchen.resetCustomerForOrder(o.id)});
  affected.forEach(i=>ensurePotOrder(i));
  state.combo=0;sfx('failure.fail_sting',{volume:.16,cooldownMs:300});toast('기다리던 손님이 떠났어요 · 콤보가 끊겼어요',1500);renderOrders();renderTaskPanel();updateHud()
 }
}
function applyServeCombo(quality){
 if(quality>=76)state.combo+=1;else state.combo=0;
 state.maxCombo=Math.max(state.maxCombo,state.combo);
 const bonus=state.combo>=2?Math.min(300,(state.combo-1)*100):0;
 if(bonus)state.revenue+=bonus;
 return{combo:state.combo,bonus}
}
function pulseComboHud(){
 if(!els.combo||state.combo<2)return;els.combo.classList.remove('hot');void els.combo.offsetWidth;els.combo.classList.add('hot');clearTimeout(pulseComboHud.t);pulseComboHud.t=setTimeout(()=>els.combo?.classList.remove('hot'),420)
}
function updateHud(){
 els.revenue.textContent=money(state.revenue);els.goal.textContent=money(TARGET_REVENUE);els.time.textContent=Math.max(0,Math.ceil(state.time));els.served.textContent=state.served;
 if(els.combo){els.combo.classList.toggle('hidden',state.combo<2);const b=els.combo.querySelector('b');if(b)b.textContent=state.combo}
 renderEconomyProgress()
}
function beginClosingShift(){
 if(state.closing)return;state.closing=true;restaurant.stopShift();
 const remaining=[...state.orders];
 if(remaining.length){
  remaining.forEach(o=>{releaseOrderBinding(o.id);kitchen.resetCustomerForOrder(o.id)});
  state.missed+=remaining.length;restaurant.orders.replace([]);renderOrders();renderTaskPanel()
 }
 toast(kitchen.hasActiveDiningCustomers()?'🕘 주문 마감 · 식사 중 손님이 나가면 정산해요':'🕘 주문 마감 · 오늘 정산을 시작해요',2200)
}
function updateGame(dt){
 if(state.phase==='service'){
  if(!state.tutorial.active&&!state.closing){
   restaurant.tick(dt,{advanceShift:true,advanceOrders:false,advanceAutomation:false});
   state.spawnClock+=dt
  }
  updatePots(dt);updateOrders(dt);
  const spawnInterval=hasUpgrade('hallExpansion')?9.2:11;
  if(!state.tutorial.active&&!state.closing&&state.time>0&&state.spawnClock>=spawnInterval){state.spawnClock=0;spawnOrder()}
  if(state.time<=0&&!state.closing&&!state.busy)beginClosingShift();
  if(state.closing&&!state.busy&&!kitchen.hasActiveDiningCustomers())endShift()
 }
 state.uiClock+=dt;
 if(state.uiClock>=.13){state.uiClock=0;renderPotStrip();renderSelectedHelp();renderOrders();renderTutorial();updateActionButtons();updateHud();updateDishHud()}
}
function endShift(){
 if(!state.running)return;
 state.running=false;state.phase='ended';restaurant.stopShift();cancelAnimationFrame(state.raf);kitchen.snapshotEquipmentLayout();
 const earned=Math.max(0,Math.round(state.revenue));progress.cash+=earned;progress.shifts+=1;saveProgress();shopRenderSignature='';
 const win=state.revenue>=TARGET_REVENUE;
 els.endTitle.textContent=win?'오늘 목표 달성!':'오늘 영업 종료';
 els.endText.textContent=win?'마지막 손님까지 퇴장 완료! 오늘 매출이 금고에 적립됐어요. 다음 영업 전에 가게를 더 키워 보세요.':'마지막 손님까지 정리했어요. 번 돈은 그대로 금고에 적립됩니다.';
 els.endRevenue.textContent=money(state.revenue);els.endServed.textContent=String(state.served);els.endPerfect.textContent=String(state.perfect);els.end.classList.add('show');renderEconomyProgress();
 sfx(win?'success.victory_fanfare':'failure.fail_sting',{volume:.34,cooldownMs:900})
}
function loop(ts){
 if(!state.running)return;
 const dt=Math.min(.05,(ts-state.last)/1000||0);state.last=ts;updateGame(dt);kitchen.update(dt);
 if(state.running)state.raf=requestAnimationFrame(loop)
}
function resetGameState(){
 restaurant.reset({keepLayout:true});
 state.phase='prep';state.time=SHIFT_SECONDS;state.revenue=0;state.served=0;state.perfect=0;state.missed=0;state.orders=[];state.nextOrder=1;state.spawnClock=0;state.uiClock=0;state.tray=null;state.busy=false;state.closing=false;seenOrderTickets.clear();
 state.cleanPlates=hasUpgrade('dishRack')?5:3;state.dirtyPlates=0;state.washing=false;state.heldItem=null;state.combo=0;state.maxCombo=0;state.helperUnlocked=progress.tutorialDone;state.helperEnabled=progress.tutorialDone;kitchen.clearPrepCounters();kitchen.resetHelper();kitchen.syncEquipmentVisibility();kitchen.applySavedEquipmentState();
 state.selectedPot=null;state.tutorial={active:!progress.tutorialDone,step:progress.tutorialDone?7:0};state.discardArmedUntil=0;state.discardArmedPot=null;state.trayDiscardArmedUntil=0;state.heldDiscardArmedUntil=0;
 state.pots=Array.from({length:POT_COUNT},(_,i)=>newPot(i));kitchen.syncProgressUpgrades();kitchen.resetCustomerHall();
 for(let i=0;i<POT_COUNT;i++)kitchen.clearPotVisual(i);
 kitchen.setTrayMeal(false);kitchen.serviceGroup?.position.copy(kitchen.serviceHome);kitchen.setSelectedPot(null);kitchen.setCarryVisual(null);kitchen.selectedLayoutStation=null;kitchen.setHelperEnabled(state.helperEnabled);if(kitchen.player)kitchen.player.position.set(0,0,3.55);renderHeldStatus();renderHelperButton();renderSmartFilterButton();renderTray();renderPotStrip();renderSelectedHelp();renderTutorial();updateActionButtons();updateHud();updateDishHud()
}
function startGame(){
 resetGameState();state.running=true;state.last=performance.now();els.start.classList.remove('show');els.end.classList.remove('show');els.prepBar?.classList.remove('hidden');document.body.classList.add('layout-mode');renderEconomyProgress();
 toast(progress.shifts?'영업 전 준비 · 산 장비를 배치하고 자동화 방향을 맞춰 보세요':'첫 영업 준비 · 직접 움직이며 주방 흐름을 익혀 보세요',2700);state.raf=requestAnimationFrame(loop)
}
function beginService(){
 if(!state.running||state.phase!=='prep')return;
 kitchen.snapshotEquipmentLayout();state.phase='service';document.body.classList.remove('layout-mode');els.prepBar?.classList.add('hidden');renderSmartFilterButton();
 restaurant.startShift({duration:SHIFT_SECONDS,targetRevenue:TARGET_REVENUE});
 if(state.tutorial.active)spawnOrder('egg');else{spawnOrder();spawnOrder()}
 renderTutorial();updateActionButtons();updateDishHud();renderHeldStatus();
 toast(state.tutorial.active?'영업 시작! 재료를 하나씩 직접 들고 냄비와 배식대를 오가세요':'영업 시작! 알바생과 자동화 장비가 바로 작동해요',2600)
}

els.dock.addEventListener('click',e=>{
 const b=e.target.closest('[data-action]');if(!b||b.disabled)return;handleAction(b.dataset.action)
});
els.discard.addEventListener('click',requestDiscard);
let trayDrag=null;
function resetTrayDrag(){trayDrag=null;els.trayBtn.classList.remove('dragging');els.trayBtn.style.transform='';els.trayBtn.style.pointerEvents='auto'}
els.trayBtn.addEventListener('pointerdown',e=>{
 if(!state.tray?.ready||state.busy)return;e.preventDefault();trayDrag={x:e.clientX,y:e.clientY};els.trayBtn.classList.add('dragging');els.trayBtn.setPointerCapture?.(e.pointerId)
});
addEventListener('pointermove',e=>{if(!trayDrag)return;els.trayBtn.style.transform='translate('+(e.clientX-trayDrag.x)+'px,'+(e.clientY-trayDrag.y)+'px)'},{passive:true});
addEventListener('pointerup',e=>{
 if(!trayDrag)return;els.trayBtn.style.pointerEvents='none';const hit=document.elementFromPoint(e.clientX,e.clientY),order=hit?.closest?.('[data-order]');els.trayBtn.style.pointerEvents='auto';resetTrayDrag();
 if(order)serveOrder(Number(order.dataset.order));else toast('쟁반을 주문 영수증 위에 놓아 주세요',1400)
});
$('#startBtn').addEventListener('click',startGame);
$('#restartBtn').addEventListener('click',startGame);
els.openShop?.addEventListener('click',beginService);
els.rotate?.addEventListener('click',()=>kitchen.rotateSelectedAutomation());
els.smartFilter?.addEventListener('click',cycleSmartFilter);
els.equipmentShop?.addEventListener('click',e=>{const b=e.target.closest('[data-buy]');if(b&&!b.disabled)purchaseEquipment(b.dataset.buy)});
els.shopTabs?.addEventListener('click',e=>{
 const b=e.target.closest('[data-shop-category]');if(!b)return;shopCategory=b.dataset.shopCategory||'all';
 els.shopTabs.querySelectorAll('[data-shop-category]').forEach(x=>x.classList.toggle('active',x===b));shopRenderSignature='';renderEquipmentShop(true)
});
els.sound.addEventListener('click',()=>{state.sound=!state.sound;els.sound.textContent=state.sound?'♪':'×';if(state.sound)sfx('collect.coin_pickup',{volume:.12,cooldownMs:50})});
els.helper?.addEventListener('click',()=>{
 if(!state.helperUnlocked)return;
 kitchen.setHelperEnabled(!state.helperEnabled);renderHelperButton();toast(state.helperEnabled?'알바생 자동 운반 ON':'알바생 자동 운반 OFF',1200)
});

addEventListener('keydown',e=>{
 if(!state.running)return;
 if(e.code==='KeyR'&&state.phase==='prep'){e.preventDefault();kitchen.rotateSelectedAutomation();return}
 if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight'].includes(e.code)){kitchen.setMoveKey(e.code,true);e.preventDefault();return}
 if((e.code==='KeyE'||e.code==='Space')&&state.phase==='service'){e.preventDefault();kitchen.interactNearest();return}
 if(e.code==='Digit8'){e.preventDefault();requestDiscard();return}
});
addEventListener('keyup',e=>{if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight'].includes(e.code))kitchen.setMoveKey(e.code,false)});

els.moveControls?.querySelectorAll('[data-move]').forEach(btn=>{
 const code=btn.dataset.move;
 const down=e=>{e.preventDefault();kitchen.setMoveKey(code,true)};
 const up=e=>{e.preventDefault();kitchen.setMoveKey(code,false)};
 btn.addEventListener('pointerdown',down);btn.addEventListener('pointerup',up);btn.addEventListener('pointercancel',up);btn.addEventListener('pointerleave',up)
});
els.moveControls?.querySelector('[data-interact]')?.addEventListener('click',()=>kitchen.interactNearest());

kitchen.syncProgressUpgrades();updateHud();updateDishHud();renderHeldStatus();renderHelperButton();renderSmartFilterButton();renderEconomyProgress();renderTray();renderPotStrip();renderSelectedHelp();renderTutorial();updateActionButtons();kitchen.update(0);

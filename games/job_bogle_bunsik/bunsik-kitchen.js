import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RestaurantEngine } from '../shared/restaurant-engine.js?v=1';

const FOOD=new URL('../../assets/game/food/',import.meta.url).href;
const PEOPLE=new URL('../../assets/game/characters/people/',import.meta.url).href;
const KITCHEN=new URL('../../assets/game/3d/interiors/charming-kitchen-set/',import.meta.url).href;
const SUSHI=new URL('../../assets/game/3d/interiors/modular-sushi-restaurant-kit/',import.meta.url).href;
const BAKERY=new URL('../../assets/game/3d/bakery/interior/',import.meta.url).href;
const BAKERY_BITS=new URL('../../assets/game/3d/bakery/restaurant-bits/',import.meta.url).href;

const SHIFT_SECONDS=120;
const TARGET_REVENUE=6500;
const MAX_ORDERS=4;
const POT_COUNT=4;
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
 {id:'cheeseEgg',name:'치즈 계란 라면',need:['noodle','soup','egg','cheese'],price:1200}
];
const ACTION_NAMES={water:'물 붓기',noodle:'면 넣기',soup:'스프 넣기',egg:'계란 넣기',green:'대파 넣기',cheese:'치즈 넣기',plate:'그릇에 담기',discard:'냄비 비우기'};
const CUSTOMER_ICONS=['👧','👦','👩','🧑','👵','👨'];
const CUSTOMER_MODELS=['character-female-b.glb','character-male-a.glb','character-female-c.glb','character-male-b.glb'];

const els={
 canvas:$('#gameCanvas'),orders:$('#orderStrip'),pots:$('#potStrip'),revenue:$('#revenue'),goal:$('#goal'),time:$('#time'),served:$('#served'),
 selected:$('#selectedAction'),trayBtn:$('#trayBtn'),trayText:$('#trayText'),trayQuality:$('#trayQuality'),dock:$('#actionDock'),
 tutorialBanner:$('#tutorialBanner'),tutorialText:$('#tutorialText'),discard:$('#discardBtn'),
 toast:$('#toast'),start:$('#startOverlay'),end:$('#endOverlay'),endTitle:$('#endTitle'),endText:$('#endText'),
 endRevenue:$('#endRevenue'),endServed:$('#endServed'),endPerfect:$('#endPerfect'),sound:$('#soundBtn'),
 prepBar:$('#prepBar'),openShop:$('#openShopBtn'),stationHint:$('#stationHint'),dishStatus:$('#dishStatus'),moveControls:$('#moveControls'),heldStatus:$('#heldStatus')
};

function newPot(i){
 return{index:i,water:0,ingredients:[],sequence:[],heat:0,noodleTime:0,mistakes:0,burnt:false,plating:false};
}
let restaurant=null;
const state={
 running:false,phase:'idle',sound:true,nextOrder:1,spawnClock:0,last:0,raf:0,uiClock:0,selectedPot:null,tray:null,busy:false,
 cleanPlates:3,dirtyPlates:0,washing:false,heldItem:null,
 tutorial:{active:true,step:0},discardArmedUntil:0,discardArmedPot:null,trayDiscardArmedUntil:0,
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
 pricing:({recipe,quality,order})=>Math.max(200,Math.round(((recipe?.price||0)*(.48+.52*quality/100)+(order?.patience||0))*.01)*100)
});

window.__bunsikKitchenOwnAudio=true;
function sfx(key,opt={}){if(!state.sound)return;try{window.KidscadeAudio?.play?.(key,opt)}catch(_){}}
function money(n){return Math.max(0,Math.round(n)).toLocaleString('ko-KR')+'원'}
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
  this.scene.fog=new THREE.Fog(0xf1d2aa,18,34);
  this.camera=new THREE.PerspectiveCamera(42,1,.1,80);
  this.loader=new GLTFLoader();
  this.cache=new Map();
  this.clock=0;
  this.pickables=[];
  this.potVisuals=[];
  this.customerHolders=[];
  this.customerXs=[-3.3,-1.1,1.1,3.3];
  this.serviceGroup=null;this.serviceMeal=null;this.serviceHome=new THREE.Vector3(5.25,.92,2.65);
  this.raycaster=new THREE.Raycaster();
  this.pointer=new THREE.Vector2();
  this.layoutStations=[];this.stationPickables=[];this.dragLayout=null;this.selectedLayoutStation=null;
  this.player=null;this.playerRing=null;this.carryAnchor=null;this.carrySprite=null;this.moveKeys=new Set();this.nearestStation=null;this.dirtyPlateModels=[];

  this.makeLights();
  this.makeRoom();
  this.makeBurners();
  this.makeKitchenProps();
  this.makePlateupStations();
  this.makeCustomers();
  this.makeServiceStation();
  this.makePlayer();
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
  this.box(16.5,.3,11.8,0xc58d5b,0,-.18,.2);
  this.box(16.5,3.4,.25,0xf5ead7,0,1.5,-5.6);
  this.box(.24,3.4,11.8,0xe7d4bb,-8.12,1.5,.2);
  this.box(.24,3.4,11.8,0xe7d4bb,8.12,1.5,.2);
  this.box(15.8,.58,.12,0xb93f35,0,.52,-5.43);
  this.box(5.4,1.15,.09,0x27383a,0,2.02,-5.3,{roughness:.5});
  this.box(4.7,.055,.09,0xf3d46e,0,2.36,-5.22);
  for(const x of[-5.2,0,5.2]){
   const lamp=new THREE.PointLight(0xffd28a,5.5,7,2);lamp.position.set(x,3.2,-1.1);this.scene.add(lamp);
  }
  const floorGrid=new THREE.GridHelper(15.8,24,0x94654a,0xe1bc91);floorGrid.position.y=.005;floorGrid.scale.z=.72;floorGrid.material.transparent=true;floorGrid.material.opacity=.24;this.scene.add(floorGrid);
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
 makeBurners(){
  const xs=[-3.45,-1.15,1.15,3.45];
  xs.forEach((x,i)=>{
   const root=new THREE.Group();root.position.set(x,0,.75);this.scene.add(root);
   const counter=new THREE.Mesh(new THREE.BoxGeometry(2.0,.82,2.35),this.material(0x394447,{roughness:.52,metalness:.18}));counter.position.y=.4;counter.castShadow=true;counter.receiveShadow=true;root.add(counter);
   const top=new THREE.Mesh(new THREE.BoxGeometry(1.92,.14,2.24),this.material(0x202829,{roughness:.35,metalness:.45}));top.position.y=.87;root.add(top);
   const burner=new THREE.Mesh(new THREE.TorusGeometry(.55,.07,10,34),new THREE.MeshStandardMaterial({color:0x30383a,roughness:.35,metalness:.62,emissive:0xff5b25,emissiveIntensity:.08}));burner.rotation.x=Math.PI/2;burner.position.set(0,.96,.08);root.add(burner);
   const flame=new THREE.PointLight(0xff6a2b,0,3,2);flame.position.set(0,1.0,.08);root.add(flame);

   const potGroup=new THREE.Group();potGroup.position.set(0,1.02,.08);root.add(potGroup);
   const potBody=new THREE.Mesh(new THREE.CylinderGeometry(.68,.62,.48,28,1,true),this.material(0x69787b,{roughness:.32,metalness:.72}));potBody.position.y=.24;potGroup.add(potBody);
   const rim=new THREE.Mesh(new THREE.TorusGeometry(.67,.045,8,32),this.material(0xaab6b6,{roughness:.25,metalness:.8}));rim.rotation.x=Math.PI/2;rim.position.y=.49;potGroup.add(rim);
   const handle=new THREE.Mesh(new THREE.BoxGeometry(.58,.09,.12),this.material(0x343a3b,{roughness:.55}));handle.position.set(.91,.35,0);potGroup.add(handle);

   const liquid=new THREE.Mesh(new THREE.CylinderGeometry(.59,.59,.035,30),new THREE.MeshStandardMaterial({color:0x74cbe8,roughness:.28,transparent:true,opacity:.82,emissive:0x173843,emissiveIntensity:.08}));liquid.position.y=.47;liquid.visible=false;potGroup.add(liquid);
   const foodGroup=new THREE.Group();foodGroup.position.y=.505;potGroup.add(foodGroup);
   const noodleGroup=new THREE.Group();noodleGroup.position.y=.515;potGroup.add(noodleGroup);
   for(let n=0;n<4;n++){const noodle=new THREE.Mesh(new THREE.TorusGeometry(.24+n*.045,.023,5,24,Math.PI*1.62),new THREE.MeshStandardMaterial({color:0xf0ce69,roughness:.76}));noodle.rotation.x=Math.PI/2;noodle.rotation.z=n*.72;noodle.position.y=n*.013;noodleGroup.add(noodle)}
   noodleGroup.visible=false;

   const steam=new THREE.Group();steam.position.y=.68;potGroup.add(steam);
   for(let n=0;n<5;n++){const puff=new THREE.Mesh(new THREE.SphereGeometry(.09+n*.008,10,7),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.18,depthWrite:false}));puff.position.set((n-2)*.13,n*.13,(n%2-.5)*.12);steam.add(puff)}
   steam.visible=false;

   const selectRing=new THREE.Mesh(new THREE.RingGeometry(.82,.94,36),new THREE.MeshBasicMaterial({color:0xffe27b,transparent:true,opacity:.9,depthWrite:false}));selectRing.rotation.x=-Math.PI/2;selectRing.position.y=.94;root.add(selectRing);
   selectRing.visible=i===0;

   const pick=new THREE.Mesh(new THREE.CylinderGeometry(.95,.95,1.1,16),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));pick.position.y=1.25;pick.userData.potIndex=i;root.add(pick);this.pickables.push(pick);

   const tag=this.makeTextSprite('냄비 '+(i+1));tag.position.set(0,1.98,.1);root.add(tag);
   const lockTag=this.makeTextSprite('잠금');lockTag.position.set(0,2.02,.1);lockTag.visible=false;root.add(lockTag);

   this.potVisuals.push({root,burner,flame,potGroup,liquid,foodGroup,noodleGroup,steam,selectRing,tag,lockTag});
   this.placeModel(KITCHEN,'stove.glb',1.5,x,.04,1.1,0);
  });
 }
 makeTextSprite(text){
  const c=document.createElement('canvas');c.width=256;c.height=80;const g=c.getContext('2d');g.fillStyle='rgba(49,36,28,.88)';g.beginPath();g.roundRect?.(18,12,220,52,18);g.fill();g.fillStyle='#fff8ec';g.font='900 26px system-ui';g.textAlign='center';g.textBaseline='middle';g.fillText(text,128,39);
  const tex=new THREE.CanvasTexture(c);const mat=new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false});const sp=new THREE.Sprite(mat);sp.scale.set(1.6,.5,1);return sp
 }
 makeKitchenProps(){
  this.placeModel(SUSHI,'counter-straight.glb',2.2,6.35,.02,-1.8,-Math.PI/2);
  this.placeModel(SUSHI,'counter-straight.glb',2.2,6.35,.02,1.0,-Math.PI/2);
  this.placeModel(SUSHI,'table.glb',2.15,-5.0,.02,4.2,0);
  this.placeModel(SUSHI,'chair.glb',1.25,-6.15,.02,4.2,Math.PI/2);
  this.placeModel(SUSHI,'chair.glb',1.25,-3.85,.02,4.2,-Math.PI/2);
  this.placeModel(SUSHI,'bowl.glb',.48,5.8,.92,-1.8,0);
  this.placeModel(SUSHI,'plate.glb',.46,5.95,.92,1.0,0);
  this.placeModel(KITCHEN,'spatula.glb',.7,6.2,.92,1.6,.3);
 }
 makeLayoutStation(id,label,root,file,size,x,z,rot=0){
  const holder=new THREE.Group();holder.position.set(x,0,z);holder.rotation.y=rot;holder.userData.stationId=id;this.scene.add(holder);
  const pick=new THREE.Mesh(new THREE.BoxGeometry(1.8,1.7,1.8),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));
  pick.position.y=.8;pick.userData.layoutStation=holder;holder.add(pick);this.stationPickables.push(pick);
  const ring=new THREE.Mesh(new THREE.RingGeometry(.72,.9,32),new THREE.MeshBasicMaterial({color:0x5bd0ff,transparent:true,opacity:.0,depthWrite:false}));
  ring.rotation.x=-Math.PI/2;ring.position.y=.02;holder.add(ring);holder.userData.ring=ring;
  const tag=this.makeTextSprite(label);tag.position.set(0,1.8,0);tag.scale.set(1.25,.4,1);holder.add(tag);
  this.loadModel(root,file,size).then(o=>{if(o)holder.add(o)});
  this.layoutStations.push({id,label,group:holder});
  return holder
 }
 makePlateupStations(){
  const sink=this.makeLayoutStation('sink','싱크 · 설거지',BAKERY_BITS,'kitchencounter-sink.glb',2.05,-5.7,-1.7,Math.PI/2);
  this.makeLayoutStation('fridge','재료 냉장고',BAKERY_BITS,'fridge-a.glb',2.1,-5.85,2.4,Math.PI/2);
  this.makeLayoutStation('rack','깨끗한 접시',BAKERY_BITS,'dishrack-plates.glb',1.45,5.75,1.0,-Math.PI/2);
  const dirtyGroup=new THREE.Group();dirtyGroup.position.set(.1,1.0,.15);sink.add(dirtyGroup);
  this.loadModel(BAKERY_BITS,'plate-dirty.glb',.42).then(model=>{
   if(!model)return;
   for(let i=0;i<5;i++){const plate=model.clone(true);plate.position.set(0,i*.07,0);plate.visible=false;dirtyGroup.add(plate);this.dirtyPlateModels.push(plate)}
   this.syncDishVisuals()
  });
 }
 makePlayer(){
  const root=this.player=new THREE.Group();root.position.set(0,0,3.45);this.scene.add(root);
  const ring=this.playerRing=new THREE.Mesh(new THREE.RingGeometry(.38,.5,30),new THREE.MeshBasicMaterial({color:0xffe172,transparent:true,opacity:.9,depthWrite:false}));
  ring.rotation.x=-Math.PI/2;ring.position.y=.025;root.add(ring);
  const fallback=new THREE.Mesh(new THREE.CapsuleGeometry(.28,.72,5,10),this.material(0xe4634d,{roughness:.75}));fallback.position.y=.72;root.add(fallback);root.userData.fallback=fallback;
  this.carryAnchor=new THREE.Group();this.carryAnchor.position.set(0,1.72,-.12);root.add(this.carryAnchor);
  this.loadModel(PEOPLE,'character-female-b.glb',1.42).then(o=>{if(o){o.rotation.y=Math.PI;root.add(o);fallback.visible=false}});
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
 setMoveKey(code,on){if(on)this.moveKeys.add(code);else this.moveKeys.delete(code)}
 updatePointer(e){
  const r=this.canvas.getBoundingClientRect();this.pointer.x=((e.clientX-r.left)/r.width)*2-1;this.pointer.y=-((e.clientY-r.top)/r.height)*2+1;this.raycaster.setFromCamera(this.pointer,this.camera)
 }
 pointerDown(e){
  if(state.phase!=='prep')return;
  this.updatePointer(e);
  const hit=this.raycaster.intersectObjects(this.stationPickables,false)[0];if(!hit)return;
  this.dragLayout=hit.object.userData.layoutStation||null;this.selectedLayoutStation=this.dragLayout;
  this.layoutStations.forEach(s=>{s.group.userData.ring.material.opacity=s.group===this.selectedLayoutStation?.userData?.layoutStation?.group?1:(s.group===this.selectedLayoutStation?1:0)});
  this.canvas.setPointerCapture?.(e.pointerId);document.body.classList.add('layout-dragging');e.preventDefault()
 }
 pointerMove(e){
  if(state.phase!=='prep'||!this.dragLayout)return;
  this.updatePointer(e);
  const p=new THREE.Vector3(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
  if(!this.raycaster.ray.intersectPlane(plane,p))return;
  const x=Math.max(-6.2,Math.min(6.2,Math.round(p.x*2)/2)),z=Math.max(-2.25,Math.min(3.7,Math.round(p.z*2)/2));
  const blocked=this.potVisuals.some(v=>Math.hypot(v.root.position.x-x,v.root.position.z-z)<1.45)||
   this.layoutStations.some(s=>s.group!==this.dragLayout&&Math.hypot(s.group.position.x-x,s.group.position.z-z)<1.45)||
   (this.serviceGroup&&Math.hypot(this.serviceGroup.position.x-x,this.serviceGroup.position.z-z)<1.45);
  if(!blocked)this.dragLayout.position.set(x,0,z);
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
  if(dx||dz){
   const len=Math.hypot(dx,dz)||1,speed=3.25;dx/=len;dz/=len;
   this.player.position.x=Math.max(-7.15,Math.min(7.15,this.player.position.x+dx*speed*dt));
   this.player.position.z=Math.max(-2.85,Math.min(4.55,this.player.position.z+dz*speed*dt));
   this.player.rotation.y=Math.atan2(dx,dz);
  }
  const candidates=[
   ...this.layoutStations.map(s=>({type:s.id,label:s.label,group:s.group})),
   ...this.potVisuals.slice(0,activePotCount()).map((v,i)=>({type:'pot',label:'냄비 '+(i+1),group:v.root,potIndex:i})),
   ...(this.serviceGroup?[{type:'service',label:'배식대',group:this.serviceGroup}]:[])
  ];
  let nearest=null,best=1.55;
  candidates.forEach(item=>{const d=this.stationDistance(item.group);if(d<best){best=d;nearest=item}});
  this.nearestStation=nearest;
  this.layoutStations.forEach(s=>{s.group.userData.ring.material.opacity=state.phase==='prep' ? .55 : (nearest?.group===s.group ? .88 : 0)});
  if(els.stationHint){
   if(state.phase==='prep')els.stationHint.textContent='가구를 드래그해 주방 동선을 바꿔 보세요';
   else if(!nearest)els.stationHint.textContent='WASD / 방향키로 가까이 가서 E로 상호작용';
   else if(nearest.type==='sink')els.stationHint.textContent=state.heldItem?'E · 들고 있는 것을 유지':'E · 물 받기'+(state.dirtyPlates?' / 설거지는 아래 버튼':'');
   else if(nearest.type==='rack')els.stationHint.textContent='접시 선반 · 깨끗한 접시 '+state.cleanPlates+'개';
   else if(nearest.type==='fridge')els.stationHint.textContent=state.heldItem?'손이 차 있어요 · 먼저 냄비나 배식대로 이동':'E · 다음 추천 재료 꺼내기';
   else if(nearest.type==='service')els.stationHint.textContent=state.heldItem?.kind==='meal'?'E · '+state.heldItem.name+' 서빙':'배식대 · 완성 라면을 들고 오세요';
   else if(nearest.type==='pot')els.stationHint.textContent=state.heldItem?'E · '+heldItemLabel()+' 넣기':'E · 냄비 사용';
   else els.stationHint.textContent='E · '+nearest.label+' 사용';
  }
 }
 interactNearest(){
  if(state.phase!=='service')return;
  const n=this.nearestStation;if(!n){toast('가까운 설비로 이동해 주세요');return}
  if(n.type==='fridge'){pickIngredient(recommendedCarryIngredient());return}
  if(n.type==='sink'){
   if(state.heldItem){toast('손에 '+heldItemLabel()+'을 들고 있어요');return}
   pickIngredient('water');return
  }
  if(n.type==='rack'){toast('깨끗한 그릇 '+state.cleanPlates+'개 · 완성 라면을 담을 때 자동으로 하나 사용해요',1500);return}
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
   const file=CUSTOMER_MODELS[i%CUSTOMER_MODELS.length],holder=new THREE.Group();holder.position.set(x,0,-4.25);holder.rotation.y=0;this.scene.add(holder);this.customerHolders.push(holder);
   this.loadModel(PEOPLE,file,1.65).then(o=>{if(o){o.rotation.y=Math.PI;holder.add(o)}});
  });
  this.box(9.4,.86,1.0,0x416c62,0,.38,-3.62,{roughness:.58});
  this.box(9.5,.11,1.08,0xe4c489,0,.86,-3.62,{roughness:.5});
 }
 makeServiceStation(){
  const base=this.serviceGroup=new THREE.Group();base.position.copy(this.serviceHome);this.scene.add(base);
  const pad=new THREE.Mesh(new THREE.BoxGeometry(2.25,.18,1.45),this.material(0xe6c58f,{roughness:.55}));pad.position.y=-.08;pad.castShadow=true;pad.receiveShadow=true;base.add(pad);
  this.loadModel(BAKERY,'serving-tray.glb',1.35).then(o=>{if(o){o.rotation.y=Math.PI/2;base.add(o)}});
  const meal=this.serviceMeal=new THREE.Group();meal.position.y=.12;meal.visible=false;base.add(meal);
  this.loadModel(SUSHI,'ramen.glb',.9).then(o=>{if(o){o.position.y=.02;meal.add(o)}});
  const label=this.makeTextSprite('배식대');label.position.set(0,1.0,0);label.scale.set(1.25,.4,1);base.add(label);
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
 customerReact(slot){
  const h=this.customerHolders[slot];if(!h)return;const baseY=h.position.y,started=performance.now();
  const run=now=>{const t=Math.min(1,(now-started)/650);h.position.y=baseY+Math.sin(t*Math.PI*4)*.08*(1-t);h.rotation.z=Math.sin(t*Math.PI*5)*.05*(1-t);if(t<1)requestAnimationFrame(run);else{h.position.y=baseY;h.rotation.z=0}};
  requestAnimationFrame(run)
 }
 animateServe(slot,onDone){
  if(!this.serviceGroup){onDone?.();return}
  const g=this.serviceGroup,start=this.serviceHome.clone(),end=new THREE.Vector3(this.customerXs[slot]??0,.92,-2.75),started=performance.now();
  const run=now=>{
   const t=Math.min(1,(now-started)/700),e=1-Math.pow(1-t,3);g.position.lerpVectors(start,end,e);g.position.y=.92+Math.sin(Math.PI*t)*.3;
   if(t<1){requestAnimationFrame(run);return}
   this.customerReact(slot);if(this.serviceMeal)this.serviceMeal.visible=false;
   setTimeout(()=>{g.position.copy(this.serviceHome);onDone?.()},260)
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
  this.potVisuals.forEach((v,i)=>v.selectRing.visible=i===index);
  renderPotStrip();renderSelectedHelp();renderTutorial();updateActionButtons()
 }
 pointerUp(e){
  if(this.dragLayout){this.dragLayout=null;document.body.classList.remove('layout-dragging');return}
  if(!state.running||state.phase!=='service')return;
  this.updatePointer(e);
  const hit=this.raycaster.intersectObjects(this.pickables,false)[0];
  if(!hit)return;
  this.setSelectedPot(hit.object.userData.potIndex);
 }
 resize(){
  const w=this.canvas.clientWidth||innerWidth,h=this.canvas.clientHeight||innerHeight;
  this.renderer.setSize(w,h,false);this.camera.aspect=w/Math.max(1,h);this.camera.fov=w<650?50:w<900?43:38;
  this.camera.position.set(0,w<650?10.7:8.7,w<650?10.9:8.9);this.camera.lookAt(0,1.0,.45);this.camera.updateProjectionMatrix()
 }
 update(dt){
  this.clock+=dt;
  this.updatePlayer(dt);
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
   const locked=i>=activePotCount();v.lockTag.visible=locked;v.tag.visible=!locked;
   if(locked){v.selectRing.visible=false;v.flame.intensity=0;v.burner.material.emissiveIntensity=.02;return}
   const selected=i===state.selectedPot,tutorialTarget=state.tutorial.active&&state.tutorial.step===0&&i===0;
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


function heldItemLabel(){
 const h=state.heldItem;if(!h)return'빈손';
 return h.kind==='meal'?(h.name||'완성 라면'):ingredientLabel(h.id)
}
function setHeldItem(item){
 state.heldItem=item?{...item}:null;kitchen.setCarryVisual(state.heldItem);renderHeldStatus();updateActionButtons()
}
function renderHeldStatus(){
 if(!els.heldStatus)return;
 const h=state.heldItem;
 els.heldStatus.classList.toggle('empty',!h);
 els.heldStatus.innerHTML=h?'<small>손에 든 것</small><b>'+(h.kind==='meal'?'🍜 '+h.name:(INGREDIENTS[h.id]?.icon||'📦')+' '+ingredientLabel(h.id))+'</b>':'<small>손에 든 것</small><b>빈손</b>'
}
function tutorialCarryExpected(){
 if(!state.tutorial.active)return null;
 return({0:'water',1:'water',2:'noodle',3:'soup',4:'egg'})[state.tutorial.step]||null
}
function recommendedCarryIngredient(){
 const expected=tutorialCarryExpected();if(expected)return expected;
 const p=state.selectedPot==null?null:state.pots[state.selectedPot];
 if(!p)return'noodle';
 const actions=contextActionsForPot(p).filter(id=>id!=='plate');
 return actions[0]||'noodle'
}
function pickIngredient(id){
 if(!id||!INGREDIENTS[id])return;
 if(state.heldItem){toast('한 번에 하나만 들 수 있어요 · '+heldItemLabel()+'을 먼저 사용해 주세요');return}
 setHeldItem({kind:'ingredient',id});sfx('collect.coin_pickup',{volume:.13,rate:1.05,cooldownMs:70});
 toast(INGREDIENTS[id].icon+' '+ingredientLabel(id)+'을 들었어요 · 냄비로 가져가 E',1400)
}
function insertHeldIntoPot(index){
 const held=state.heldItem;if(!held||held.kind!=='ingredient')return false;
 const action=held.id,p=state.pots[index];
 if(!canUseAction(action)){toast(nextInstruction(p),1500);return false}
 const changed=addToPot(index,action);
 if(!changed)return false;
 setHeldItem(null);advanceTutorialAfterAction(action,p);renderPotStrip();renderSelectedHelp();updateActionButtons();return true
}
function serveHeldMeal(){
 const held=state.heldItem;
 if(!held||held.kind!=='meal'){toast('완성된 라면을 들고 배식대로 와 주세요');return}
 const order=state.orders.find(o=>o.recipeId===held.recipeId);
 if(!order){toast('이 라면을 기다리는 손님이 없어요');return}
 state.tray={recipeId:held.recipeId,name:held.name,quality:held.quality,label:held.label,burnt:held.burnt,ready:true};
 setHeldItem(null);serveOrder(order.id)
}

function activePotCount(){return state.tutorial.active?2:state.served>=6?4:state.served>=3?3:2}
function resetPot(index){
 state.pots[index]=newPot(index);kitchen.clearPotVisual(index);renderPotStrip();renderSelectedHelp();updateActionButtons()
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
 if(state.tutorial.step===0)return held?.id==='water'?'① 물을 들고 1번 냄비로 가서 E':'① 싱크로 가서 E로 물을 받아 1번 냄비에 가져가요';
 if(state.tutorial.step===1)return held?.id==='water'?'② 물 한 컵 더 · 1번 냄비에서 E':'② 싱크에서 물을 한 번 더 받아 1번 냄비로 가져가요';
 if(state.tutorial.step===2)return held?.id==='noodle'?'③ 면을 들고 1번 냄비에서 E':'③ 냉장고에서 E로 면을 꺼내 1번 냄비로 가져가요';
 if(state.tutorial.step===3)return held?.id==='soup'?'④ 스프를 들고 냄비에서 E':'④ 냉장고에서 스프를 꺼내 냄비로 가져가요';
 if(state.tutorial.step===4)return held?.id==='egg'?'⑤ 계란을 들고 냄비에서 E':'⑤ 첫 주문은 계란 라면 · 냉장고에서 계란을 꺼내요';
 if(state.tutorial.step===5){
  if(p.noodleTime<5.5)return'⑥ 보글보글 끓는 동안 기다려요 · 아직 설익었어요';
  if(p.noodleTime<8.2)return'⑥ 조금만 더! “딱 좋아요”가 될 때를 기다려요';
  if(p.noodleTime<=11.5)return'⑥ 지금이 가장 맛있어요! 빈손으로 1번 냄비에서 E';
  return'⑥ 면이 퍼지기 시작했어요! 냄비에서 E로 바로 담아요'
 }
 if(state.tutorial.step===6)return'⑦ 완성 라면을 들고 배식대로 이동해 E로 서빙해요';
 return''
}
function renderTutorial(){
 const active=state.running&&state.phase==='service'&&state.tutorial.active;
 document.body.classList.toggle('tutorial-mode',active);
 els.tutorialBanner.classList.toggle('hidden',!active);
 if(active)els.tutorialText.textContent=tutorialMessage()
}
function compatibleOrderForPot(p){
 return state.orders.find(o=>{
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
 const p=state.selectedPot==null?null:state.pots[state.selectedPot],trayReady=!!state.tray?.ready;
 const disabled=!state.running||state.busy||state.tutorial.active||(!trayReady&&(!p||potEmpty(p)));
 els.discard.disabled=disabled;
 if(performance.now()>state.discardArmedUntil&&performance.now()>state.trayDiscardArmedUntil){
  els.discard.classList.remove('armed');els.discard.querySelector('b').textContent=trayReady?'쟁반 비우기':'냄비 비우기'
 }
}
function contextActionsForPot(p){
 if(!state.running||state.phase!=='service'||state.busy||state.tray||!p)return[];
 if(state.tutorial.active)return[tutorialExpectedAction()].filter(Boolean);
 if(potEmpty(p)||p.water<1.5&&!p.ingredients.length)return['water'];
 const basics=[];if(!hasIngredient(p,'noodle'))basics.push('noodle');if(!hasIngredient(p,'soup'))basics.push('soup');if(basics.length)return basics;
 const recipe=identifyRecipe(p);if(recipe)return p.noodleTime>=5.5?['plate']:[];
 const toppings=new Set();
 state.orders.forEach(o=>{const r=recipeById(o.recipeId);if(r&&p.ingredients.every(id=>r.need.includes(id)))r.need.forEach(id=>{if(['egg','green','cheese'].includes(id)&&!hasIngredient(p,id))toppings.add(id)})});
 return toppings.size?[...toppings]:['egg','green','cheese']
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
 }else if(state.heldItem){
  const wait=document.createElement('span');wait.className='action-wait';wait.textContent=heldItemLabel()+'을 들고 있어요 · '+(state.heldItem.kind==='meal'?'배식대로 이동':'냄비로 이동');els.dock.appendChild(wait)
 }else if(n?.type==='fridge'){
  ['noodle','soup','egg','green','cheese'].forEach(id=>addSourceButton(id));
 }else if(n?.type==='sink'){
  addSourceButton('water','물 한 컵 받기');
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
 if(!p)return'냉장고·싱크에서 재료를 하나 들고 냄비로 가져가세요';
 if(p.burnt)return'탔어요 · 왼쪽 아래 “선택 냄비 비우기”로 새로 시작하세요';
 if(potEmpty(p))return'물 버튼을 두 번 눌러 2컵을 맞추세요';
 if(p.water<1.5&&!p.ingredients.length)return'물을 한 번 더 넣어 2컵 가까이 맞추세요';
 if(!hasIngredient(p,'noodle')&&!hasIngredient(p,'soup'))return'면과 스프 버튼을 눌러 주세요';
 if(!hasIngredient(p,'noodle'))return'면 버튼을 눌러 주세요';
 if(!hasIngredient(p,'soup'))return'스프 버튼을 눌러 주세요';
 const recipe=identifyRecipe(p);
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
function addToPot(index,id){
 const p=state.pots[index];
 if(id==='water'){
  if(p.water>=3){toast('물은 3컵까지 넣을 수 있어요');return false}
  p.water=Math.min(3,p.water+1);p.sequence.push('water');p.heat=0;sfx('collect.coin_drop',{volume:.12,rate:.8,cooldownMs:80});toast('냄비 '+(index+1)+' · 물 '+Math.round(p.water)+'컵');return true
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
 const waterTarget=1.75;q-=Math.abs(p.water-waterTarget)*18;
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
 const quality=qualityFor(p,recipe),tutorialPlate=state.tutorial.active&&state.tutorial.step===5&&index===0;
 state.cleanPlates=Math.max(0,state.cleanPlates-1);updateDishHud();
 p.plating=true;state.busy=true;state.tray={recipeId:recipe.id,name:recipe.name,quality,label:qualityLabel(quality,p.burnt),burnt:p.burnt,ready:false};
 renderTray();renderOrders();renderSelectedHelp();updateActionButtons();toast('냄비를 기울여 그릇에 담는 중…',1200);
 kitchen.animatePlate(index,()=>{
  resetPot(index);state.busy=false;if(!state.tray)return;state.tray.ready=true;kitchen.setTrayMeal(false);
  const meal={kind:'meal',recipeId:state.tray.recipeId,name:state.tray.name,quality:state.tray.quality,label:state.tray.label,burnt:state.tray.burnt};state.tray=null;setHeldItem(meal);
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
 const changed=action==='plate'?platePot(index):addToPot(index,action);
 if(changed&&action!=='plate')advanceTutorialAfterAction(action,p);
 renderPotStrip();renderSelectedHelp();updateActionButtons();return changed
}
function handleAction(action){
 if(state.selectedPot==null){toast('먼저 조리할 냄비를 눌러 선택하세요',1600);return}
 applyAction(state.selectedPot,action)
}
function requestDiscard(){
 if(state.tutorial.active){toast('첫 라면은 같이 완성해 본 뒤 비우기를 사용할 수 있어요');return}
 const now=performance.now();
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
 els.selected.textContent=nextInstruction(p)
}
function makeOrder(forcedId=null){
 const used=new Set(state.orders.map(o=>o.slot));
 const slot=[0,1,2,3].find(n=>!used.has(n))??0;
 return restaurant.spawnOrder(forcedId,{slot,customer:CUSTOMER_ICONS[slot%CUSTOMER_ICONS.length]})
}
function spawnOrder(forcedId=null){
 if(!state.running||state.orders.length>=MAX_ORDERS)return;
 const order=makeOrder(forcedId);if(!order)return;
 renderOrders();sfx('collect.coin_drop',{volume:.11,rate:1.12,cooldownMs:150})
}
function orderIngredientText(r){return r.need.map(id=>ingredientLabel(id)).join(' + ')}
function orderIngredientIcons(r){return r.need.map(id=>INGREDIENTS[id]?.icon||'').join(' ')}
function renderOrders(){
 els.orders.innerHTML='';const lefts=[25,41.5,58.5,75];
 state.orders.forEach(o=>{
  const r=recipeById(o.recipeId),d=document.createElement('button');d.type='button';const matching=(state.heldItem?.kind==='meal'&&state.heldItem.recipeId===o.recipeId)||(state.tray?.ready&&state.tray.recipeId===o.recipeId);
  d.className='order-bubble'+(matching?' waiting':'')+(state.tutorial.active&&state.tutorial.step===6&&o.recipeId==='egg'?' target':'');d.dataset.order=String(o.id);d.style.setProperty('--left',(lefts[o.slot]||50)+'%');
  d.innerHTML='<div class="order-main"><span class="customer-face">'+o.customer+'</span><span><b>'+r.name+'</b><span class="recipe-icons">'+orderIngredientIcons(r)+'</span></span></div><div class="patience"><i style="transform:scaleX('+(Math.max(0,o.patience)/100)+')"></i></div>';
  d.addEventListener('click',()=>toast(state.heldItem?.kind==='meal'?'완성 라면을 들고 배식대에서 E를 눌러 주세요':'이 손님은 '+r.name+'을 기다리고 있어요',1300));els.orders.appendChild(d)
 })
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
  const sale=restaurant.serve(orderId,r.id,{quality:q});
  if(!sale.ok){order.paused=false;state.busy=false;renderOrders();updateActionButtons();toast('주문 상태가 바뀌었어요 · 다시 확인해 주세요',1700);return}
  state.tray=null;state.busy=false;setTimeout(()=>{if(state.running)addDirtyPlate()},1050);
  const after=activePotCount();
  if(wasTutorial){
   state.tutorial.active=false;state.tutorial.step=7;state.spawnClock=0;
   setTimeout(()=>{if(state.running){spawnOrder();spawnOrder();toast('이제 자유 영업! 손님을 보고 냄비에서 바로 요리해요',2200)}},650)
  }else setTimeout(()=>{if(state.running)spawnOrder()},700);
  renderTray();renderOrders();renderTutorial();renderPotStrip();renderSelectedHelp();updateActionButtons();updateHud();sfx(q>=82?'shop.purchase':'collect.coin_pickup',{volume:.25,cooldownMs:300});
  if(after>before)toast('새 화구가 열렸어요! 이제 냄비 '+after+'개를 쓸 수 있어요',2200);
  else if(wasTutorial)toast(r.name+' 첫 서빙 성공! +'+money(earned),1800);else toast(r.name+' 서빙 · '+qualityLabel(q)+' · +'+money(earned),1700)
 })
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
 },1450)
}
function updateOrders(dt){
 if(state.tutorial.active)return;
 const {expiredOrders}=restaurant.tick(dt,{
  advanceShift:false,
  advanceOrders:true,
  advanceAutomation:false,
  context:{served:state.served}
 });
 if(expiredOrders.length){sfx('failure.fail_sting',{volume:.16,cooldownMs:300});toast('기다리던 손님이 떠났어요',1400);renderOrders()}
}
function updateHud(){
 els.revenue.textContent=money(state.revenue);els.goal.textContent=money(TARGET_REVENUE);els.time.textContent=Math.max(0,Math.ceil(state.time));els.served.textContent=state.served
}
function updateGame(dt){
 if(state.phase==='service'){
  if(!state.tutorial.active){
   restaurant.tick(dt,{advanceShift:true,advanceOrders:false,advanceAutomation:false});
   state.spawnClock+=dt
  }
  updatePots(dt);updateOrders(dt);
  if(!state.tutorial.active&&state.spawnClock>=11){state.spawnClock=0;spawnOrder()}
  if(state.time<=0)endShift()
 }
 state.uiClock+=dt;
 if(state.uiClock>=.13){state.uiClock=0;renderPotStrip();renderSelectedHelp();renderOrders();renderTutorial();updateActionButtons();updateHud();updateDishHud()}
}
function endShift(){
 if(!state.running)return;
 state.running=false;state.phase='ended';restaurant.stopShift();cancelAnimationFrame(state.raf);
 const win=state.revenue>=TARGET_REVENUE;
 els.endTitle.textContent=win?'오늘 목표 달성!':'조금만 더 팔면 돼요!';
 els.endText.textContent=win?'여러 냄비의 타이밍을 잘 맞춰 오늘 매출 목표를 넘겼어요.':'냄비를 동시에 돌리되, 면이 가장 맛있는 순간을 놓치지 않는 게 핵심이에요.';
 els.endRevenue.textContent=money(state.revenue);els.endServed.textContent=String(state.served);els.endPerfect.textContent=String(state.perfect);els.end.classList.add('show');
 sfx(win?'success.victory_fanfare':'failure.fail_sting',{volume:.34,cooldownMs:900})
}
function loop(ts){
 if(!state.running)return;
 const dt=Math.min(.05,(ts-state.last)/1000||0);state.last=ts;updateGame(dt);kitchen.update(dt);
 if(state.running)state.raf=requestAnimationFrame(loop)
}
function resetGameState(){
 restaurant.reset({keepLayout:true});
 state.phase='prep';state.time=SHIFT_SECONDS;state.revenue=0;state.served=0;state.perfect=0;state.missed=0;state.orders=[];state.nextOrder=1;state.spawnClock=0;state.uiClock=0;state.tray=null;state.busy=false;
 state.cleanPlates=3;state.dirtyPlates=0;state.washing=false;state.heldItem=null;
 state.selectedPot=null;state.tutorial={active:true,step:0};state.discardArmedUntil=0;state.discardArmedPot=null;state.trayDiscardArmedUntil=0;
 state.pots=Array.from({length:POT_COUNT},(_,i)=>newPot(i));
 for(let i=0;i<POT_COUNT;i++)kitchen.clearPotVisual(i);
 kitchen.setTrayMeal(false);kitchen.serviceGroup?.position.copy(kitchen.serviceHome);kitchen.setSelectedPot(null);kitchen.setCarryVisual(null);if(kitchen.player)kitchen.player.position.set(0,0,3.45);renderHeldStatus();renderTray();renderPotStrip();renderSelectedHelp();renderTutorial();updateActionButtons();updateHud();updateDishHud()
}
function startGame(){
 resetGameState();state.running=true;state.last=performance.now();els.start.classList.remove('show');els.end.classList.remove('show');els.prepBar?.classList.remove('hidden');document.body.classList.add('layout-mode');
 toast('영업 전 준비 · 싱크, 냉장고, 접시대를 드래그해 동선을 만들어 보세요',2500);state.raf=requestAnimationFrame(loop)
}
function beginService(){
 if(!state.running||state.phase!=='prep')return;
 state.phase='service';document.body.classList.remove('layout-mode');els.prepBar?.classList.add('hidden');
 restaurant.startShift({duration:SHIFT_SECONDS,targetRevenue:TARGET_REVENUE});spawnOrder('egg');renderTutorial();updateActionButtons();updateDishHud();renderHeldStatus();
 toast('영업 시작! 재료를 하나씩 직접 들고 냄비와 배식대를 오가세요',2600)
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
 if(order)serveOrder(Number(order.dataset.order));else toast('쟁반을 주문 말풍선 위에 놓아 주세요',1400)
});
$('#startBtn').addEventListener('click',startGame);
$('#restartBtn').addEventListener('click',startGame);
els.openShop?.addEventListener('click',beginService);
els.sound.addEventListener('click',()=>{state.sound=!state.sound;els.sound.textContent=state.sound?'♪':'×';if(state.sound)sfx('collect.coin_pickup',{volume:.12,cooldownMs:50})});

addEventListener('keydown',e=>{
 if(!state.running)return;
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

updateHud();updateDishHud();renderHeldStatus();renderTray();renderPotStrip();renderSelectedHelp();renderTutorial();updateActionButtons();kitchen.update(0);

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const FOOD=new URL('../../assets/game/food/',import.meta.url).href;
const PEOPLE=new URL('../../assets/game/characters/people/',import.meta.url).href;
const KITCHEN=new URL('../../assets/game/3d/interiors/charming-kitchen-set/',import.meta.url).href;
const SUSHI=new URL('../../assets/game/3d/interiors/modular-sushi-restaurant-kit/',import.meta.url).href;
const BAKERY=new URL('../../assets/game/3d/bakery/interior/',import.meta.url).href;

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
 endRevenue:$('#endRevenue'),endServed:$('#endServed'),endPerfect:$('#endPerfect'),sound:$('#soundBtn')
};

function newPot(i){
 return{index:i,water:0,ingredients:[],sequence:[],heat:0,noodleTime:0,mistakes:0,burnt:false,plating:false};
}
const state={
 running:false,time:SHIFT_SECONDS,revenue:0,served:0,perfect:0,missed:0,sound:true,
 orders:[],nextOrder:1,spawnClock:0,last:0,raf:0,uiClock:0,selectedPot:null,tray:null,busy:false,
 tutorial:{active:true,step:0},discardArmedUntil:0,discardArmedPot:null,trayDiscardArmedUntil:0,
 pots:Array.from({length:POT_COUNT},(_,i)=>newPot(i))
};

window.__bunsikKitchenOwnAudio=true;
function sfx(key,opt={}){if(!state.sound)return;try{window.KidscadeAudio?.play?.(key,opt)}catch(_){}}
function money(n){return Math.max(0,Math.round(n)).toLocaleString('ko-KR')+'원'}
function toast(t,ms=1300){els.toast.textContent=t;els.toast.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>els.toast.classList.remove('show'),ms)}
function recipeById(id){return RECIPES.find(r=>r.id===id)||null}
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

  this.makeLights();
  this.makeRoom();
  this.makeBurners();
  this.makeKitchenProps();
  this.makeCustomers();
  this.makeServiceStation();
  this.resize();
  addEventListener('resize',()=>this.resize(),{passive:true});
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
  this.placeModel(SUSHI,'counter-sink.glb',2.2,-6.25,.02,-1.8,Math.PI/2);
  this.placeModel(SUSHI,'can-fridge.glb',2.45,-6.45,.02,2.65,Math.PI/2);
  this.placeModel(SUSHI,'counter-straight.glb',2.2,6.35,.02,-1.8,-Math.PI/2);
  this.placeModel(SUSHI,'counter-straight.glb',2.2,6.35,.02,1.0,-Math.PI/2);
  this.placeModel(SUSHI,'table.glb',2.15,-5.0,.02,4.2,0);
  this.placeModel(SUSHI,'chair.glb',1.25,-6.15,.02,4.2,Math.PI/2);
  this.placeModel(SUSHI,'chair.glb',1.25,-3.85,.02,4.2,-Math.PI/2);
  this.placeModel(SUSHI,'bowl.glb',.48,5.8,.92,-1.8,0);
  this.placeModel(SUSHI,'plate.glb',.46,5.95,.92,1.0,0);
  this.placeModel(KITCHEN,'spatula.glb',.7,6.2,.92,1.6,.3);
 }
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
   pot.position.set(startPos.x+(t<.58?1.05*t:1.05*(1-t)),startPos.y+.32*up,startPos.z-.18*up);
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
  if(!state.running)return;
  const r=this.canvas.getBoundingClientRect();this.pointer.x=((e.clientX-r.left)/r.width)*2-1;this.pointer.y=-((e.clientY-r.top)/r.height)*2+1;
  this.raycaster.setFromCamera(this.pointer,this.camera);
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
 const p=state.pots[0];
 if(state.tutorial.step===0)return'① 먼저 1번 냄비를 눌러 주세요';
 if(state.tutorial.step===1)return p.water<1?'② 아래의 물 버튼을 두 번 눌러 주세요 · 첫 번째 컵':'② 좋아요! 물을 한 번 더 눌러 2컵을 맞춰요';
 if(state.tutorial.step===2)return'③ 이제 면 버튼을 눌러 주세요';
 if(state.tutorial.step===3)return'④ 스프 버튼을 눌러 국물을 만들어요';
 if(state.tutorial.step===4)return'⑤ 첫 주문은 계란 라면이에요 · 계란을 넣어 주세요';
 if(state.tutorial.step===5){
  if(p.noodleTime<5.5)return'⑥ 보글보글 끓는 동안 기다려요 · 아직 설익었어요';
  if(p.noodleTime<8.2)return'⑥ 조금만 더! “딱 좋아요”가 될 때를 기다려요';
  if(p.noodleTime<=11.5)return'⑥ 지금이 가장 맛있어요! 초록색 “담기”를 눌러 주세요';
  return'⑥ 면이 퍼지기 시작했어요! 바로 “담기”를 눌러 주세요'
 }
 if(state.tutorial.step===6)return'⑦ 완성! 오른쪽 아래 쟁반을 계란 라면 손님에게 끌어다 주세요';
 return''
}
function renderTutorial(){
 const active=state.running&&state.tutorial.active;
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
 if(state.busy||state.tray)return false;
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
 if(!state.running||state.busy||state.tray||!p)return[];
 if(state.tutorial.active)return[tutorialExpectedAction()].filter(Boolean);
 if(potEmpty(p)||p.water<1.5&&!p.ingredients.length)return['water'];
 const basics=[];if(!hasIngredient(p,'noodle'))basics.push('noodle');if(!hasIngredient(p,'soup'))basics.push('soup');if(basics.length)return basics;
 const recipe=identifyRecipe(p);if(recipe)return p.noodleTime>=5.5?['plate']:[];
 const toppings=new Set();
 state.orders.forEach(o=>{const r=recipeById(o.recipeId);if(r&&p.ingredients.every(id=>r.need.includes(id)))r.need.forEach(id=>{if(['egg','green','cheese'].includes(id)&&!hasIngredient(p,id))toppings.add(id)})});
 return toppings.size?[...toppings]:['egg','green','cheese']
}
function updateActionButtons(){
 const p=state.selectedPot==null?null:state.pots[state.selectedPot],actions=contextActionsForPot(p);
 els.dock.innerHTML='';
 actions.forEach(action=>{
  const btn=document.createElement('button');btn.type='button';btn.dataset.action=action;
  const info=INGREDIENTS[action]||{icon:action==='plate'?'🥣':'•',name:ACTION_NAMES[action]||action};
  btn.innerHTML='<span>'+info.icon+'</span><b>'+(action==='plate'?'그릇에 담기':info.name)+'</b>';
  const enabled=canUseAction(action);btn.disabled=!enabled;btn.classList.toggle('recommended',enabled);btn.classList.toggle('ready-now',enabled&&action==='plate'&&p&&p.noodleTime>=8.2&&p.noodleTime<=11.5);els.dock.appendChild(btn)
 });
 if(!actions.length){
  const wait=document.createElement('span');wait.className='action-wait';
  wait.textContent=state.tray?(state.tray.ready?'쟁반을 손님에게 끌어다 주세요':'그릇에 담는 중…'):state.busy?'잠깐만요…':!p?'냄비를 눌러 주세요':identifyRecipe(p)&&p.noodleTime<5.5?'보글보글 익는 중…':'주문을 보고 다음 재료를 골라요';els.dock.appendChild(wait)
 }
 renderDiscardButton()
}
function nextInstruction(p){
 if(state.tray)return state.tray.ready?'완성된 '+state.tray.name+' 쟁반을 기다리는 손님에게 끌어다 주세요':'냄비에서 그릇으로 라면을 담는 중이에요';
 if(!p)return'먼저 냄비 하나를 눌러 선택하세요';
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
 const unique=[...new Set(p.ingredients)].sort();
 return RECIPES.find(r=>[...r.need].sort().join('|')===unique.join('|'))||null
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
 if(state.tray||state.busy){toast('배식대가 사용 중이에요');return false}
 const p=state.pots[index];if(!hasIngredient(p,'noodle')){toast('면이 들어간 라면만 담을 수 있어요');return false}
 const recipe=identifyRecipe(p);if(!recipe){toast('주문에 맞는 토핑을 확인해 주세요');return false}
 const quality=qualityFor(p,recipe),tutorialPlate=state.tutorial.active&&state.tutorial.step===5&&index===0;
 p.plating=true;state.busy=true;state.tray={recipeId:recipe.id,name:recipe.name,quality,label:qualityLabel(quality,p.burnt),burnt:p.burnt,ready:false};
 renderTray();renderOrders();renderSelectedHelp();updateActionButtons();toast('냄비를 기울여 그릇에 담는 중…',1200);
 kitchen.animatePlate(index,()=>{
  resetPot(index);state.busy=false;if(!state.tray)return;state.tray.ready=true;kitchen.setTrayMeal(true);
  if(tutorialPlate)state.tutorial.step=6;
  renderTray();renderOrders();renderTutorial();renderSelectedHelp();updateActionButtons();sfx(quality>=75?'success.cheer_yay':'failure.fail_sting',{volume:.18,cooldownMs:250});
  toast(state.tray.name+' 완성! 쟁반을 손님에게 끌어다 주세요',1900)
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
  state.trayDiscardArmedUntil=0;state.tray=null;kitchen.setTrayMeal(false);renderTray();renderOrders();renderSelectedHelp();updateActionButtons();renderDiscardButton();toast('쟁반을 비웠어요');return
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
 const recipe=forcedId?recipeById(forcedId):RECIPES[Math.floor(Math.random()*RECIPES.length)],used=new Set(state.orders.map(o=>o.slot));
 const slot=[0,1,2,3].find(n=>!used.has(n))??0;
 return{id:state.nextOrder++,recipeId:recipe.id,patience:100,slot,customer:CUSTOMER_ICONS[slot%CUSTOMER_ICONS.length]}
}
function spawnOrder(forcedId=null){
 if(!state.running||state.orders.length>=MAX_ORDERS)return;
 state.orders.push(makeOrder(forcedId));renderOrders();sfx('collect.coin_drop',{volume:.11,rate:1.12,cooldownMs:150})
}
function orderIngredientText(r){return r.need.map(id=>ingredientLabel(id)).join(' + ')}
function orderIngredientIcons(r){return r.need.map(id=>INGREDIENTS[id]?.icon||'').join(' ')}
function renderOrders(){
 els.orders.innerHTML='';const lefts=[25,41.5,58.5,75];
 state.orders.forEach(o=>{
  const r=recipeById(o.recipeId),d=document.createElement('button');d.type='button';const matching=state.tray?.ready&&state.tray.recipeId===o.recipeId;
  d.className='order-bubble'+(matching?' waiting':'')+(state.tutorial.active&&state.tutorial.step===6&&o.recipeId==='egg'?' target':'');d.dataset.order=String(o.id);d.style.setProperty('--left',(lefts[o.slot]||50)+'%');
  d.innerHTML='<div class="order-main"><span class="customer-face">'+o.customer+'</span><span><b>'+r.name+'</b><span class="recipe-icons">'+orderIngredientIcons(r)+'</span></span></div><div class="patience"><i style="transform:scaleX('+(Math.max(0,o.patience)/100)+')"></i></div>';
  d.addEventListener('click',()=>toast(state.tray?.ready?'오른쪽 아래 쟁반을 이 손님에게 끌어다 주세요':'이 손님은 '+r.name+'을 기다리고 있어요',1300));els.orders.appendChild(d)
 })
}
function renderTray(){
 if(!state.tray||!state.tray.ready){els.trayBtn.classList.add('hidden');return}
 els.trayBtn.classList.remove('hidden');els.trayText.textContent=state.tray.name;els.trayQuality.textContent=state.tray.label+' · 손님에게 끌기'
}
function serveOrder(orderId){
 if(!state.running||state.busy)return;
 const order=state.orders.find(o=>o.id===orderId);if(!order)return;
 if(!state.tray?.ready){toast('먼저 라면을 그릇에 담아 쟁반에 올려 주세요');return}
 if(state.tray.recipeId!==order.recipeId){
  order.patience=Math.max(0,order.patience-5);renderOrders();const wrong=els.orders.querySelector('[data-order="'+order.id+'"]');wrong?.classList.add('wrong');setTimeout(()=>wrong?.classList.remove('wrong'),320);
  sfx('failure.fail_sting',{volume:.16,cooldownMs:250});toast('앗, 이 손님은 '+recipeById(order.recipeId).name+' 주문이에요');return
 }
 const r=recipeById(order.recipeId),q=state.tray.quality,wasTutorial=state.tutorial.active&&state.tutorial.step===6,slot=order.slot;
 const earned=Math.max(200,Math.round((r.price*(.48+.52*q/100)+order.patience)*.01)*100),before=activePotCount();
 state.busy=true;els.trayBtn.classList.add('hidden');updateActionButtons();toast('쟁반을 손님 앞으로 가져가는 중…',900);
 kitchen.animateServe(slot,()=>{
  state.revenue+=earned;state.served++;if(q>=90)state.perfect++;state.orders=state.orders.filter(o=>o.id!==orderId);state.tray=null;state.busy=false;
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
function updateOrders(dt){
 if(state.tutorial.active)return;
 let changed=false;state.orders.forEach(o=>{o.patience-=dt*(.84+state.served*.012)});
 const expired=state.orders.filter(o=>o.patience<=0);
 if(expired.length){state.missed+=expired.length;state.orders=state.orders.filter(o=>o.patience>0);changed=true;sfx('failure.fail_sting',{volume:.16,cooldownMs:300});toast('기다리던 손님이 떠났어요',1400)}
 if(changed)renderOrders()
}
function updateHud(){
 els.revenue.textContent=money(state.revenue);els.goal.textContent=money(TARGET_REVENUE);els.time.textContent=Math.max(0,Math.ceil(state.time));els.served.textContent=state.served
}
function updateGame(dt){
 if(!state.tutorial.active){state.time-=dt;state.spawnClock+=dt}
 state.uiClock+=dt;updatePots(dt);updateOrders(dt);
 if(!state.tutorial.active&&state.spawnClock>=11){state.spawnClock=0;spawnOrder()}
 if(state.uiClock>=.13){state.uiClock=0;renderPotStrip();renderSelectedHelp();renderOrders();renderTutorial();updateActionButtons();updateHud()}
 if(state.time<=0)endShift()
}
function endShift(){
 if(!state.running)return;
 state.running=false;cancelAnimationFrame(state.raf);
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
 state.time=SHIFT_SECONDS;state.revenue=0;state.served=0;state.perfect=0;state.missed=0;state.orders=[];state.nextOrder=1;state.spawnClock=0;state.uiClock=0;state.tray=null;state.busy=false;
 state.selectedPot=null;state.tutorial={active:true,step:0};state.discardArmedUntil=0;state.discardArmedPot=null;state.trayDiscardArmedUntil=0;
 state.pots=Array.from({length:POT_COUNT},(_,i)=>newPot(i));
 for(let i=0;i<POT_COUNT;i++)kitchen.clearPotVisual(i);
 kitchen.setTrayMeal(false);kitchen.serviceGroup?.position.copy(kitchen.serviceHome);kitchen.setSelectedPot(null);renderTray();renderPotStrip();renderSelectedHelp();renderTutorial();updateActionButtons();updateHud()
}
function startGame(){
 resetGameState();state.running=true;state.last=performance.now();els.start.classList.remove('show');els.end.classList.remove('show');
 spawnOrder('egg');renderTutorial();updateActionButtons();toast('첫 그릇은 같이 해볼게요 · 1번 냄비를 눌러 주세요',2200);state.raf=requestAnimationFrame(loop)
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
els.sound.addEventListener('click',()=>{state.sound=!state.sound;els.sound.textContent=state.sound?'♪':'×';if(state.sound)sfx('collect.coin_pickup',{volume:.12,cooldownMs:50})});

addEventListener('keydown',e=>{
 if(!state.running)return;
 const actionKeys={Digit1:'water',Digit2:'noodle',Digit3:'soup',Digit4:'egg',Digit5:'green',Digit6:'cheese',Digit7:'plate'};
 if(actionKeys[e.code]){e.preventDefault();handleAction(actionKeys[e.code]);return}
 if(e.code==='Digit8'){e.preventDefault();requestDiscard();return}
 const potKeys={KeyQ:0,KeyW:1,KeyE:2,KeyR:3};
 if(Object.prototype.hasOwnProperty.call(potKeys,e.code)){e.preventDefault();kitchen.setSelectedPot(potKeys[e.code])}
});

updateHud();renderTray();renderPotStrip();renderSelectedHelp();renderTutorial();updateActionButtons();kitchen.update(0);

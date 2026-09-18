import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const FOOD=new URL('../../assets/game/food/',import.meta.url).href;
const PEOPLE=new URL('../../assets/game/characters/people/',import.meta.url).href;
const KITCHEN=new URL('../../assets/game/3d/interiors/charming-kitchen-set/',import.meta.url).href;
const SUSHI=new URL('../../assets/game/3d/interiors/modular-sushi-restaurant-kit/',import.meta.url).href;

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
 toast:$('#toast'),start:$('#startOverlay'),end:$('#endOverlay'),endTitle:$('#endTitle'),endText:$('#endText'),
 endRevenue:$('#endRevenue'),endServed:$('#endServed'),endPerfect:$('#endPerfect'),sound:$('#soundBtn')
};

function newPot(i){
 return{index:i,water:0,ingredients:[],sequence:[],heat:0,noodleTime:0,mistakes:0,burnt:false};
}
const state={
 running:false,time:SHIFT_SECONDS,revenue:0,served:0,perfect:0,missed:0,sound:true,
 orders:[],nextOrder:1,spawnClock:0,last:0,raf:0,uiClock:0,action:'water',selectedPot:0,tray:null,
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
  this.raycaster=new THREE.Raycaster();
  this.pointer=new THREE.Vector2();

  this.makeLights();
  this.makeRoom();
  this.makeBurners();
  this.makeKitchenProps();
  this.makeCustomers();
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

   this.potVisuals.push({root,burner,flame,potGroup,liquid,foodGroup,noodleGroup,steam,selectRing});
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
  const xs=[-3.3,-1.1,1.1,3.3];
  CUSTOMER_MODELS.forEach((file,i)=>{
   const holder=new THREE.Group();holder.position.set(xs[i],0,-4.25);holder.rotation.y=0;this.scene.add(holder);
   this.loadModel(PEOPLE,file,1.65).then(o=>{if(o){o.rotation.y=Math.PI;holder.add(o)}});
  });
  this.box(9.4,.86,1.0,0x416c62,0,.38,-3.62,{roughness:.58});
  this.box(9.5,.11,1.08,0xe4c489,0,.86,-3.62,{roughness:.5});
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
  state.selectedPot=index;
  this.potVisuals.forEach((v,i)=>v.selectRing.visible=i===index);
  renderPotStrip();renderSelectedHelp()
 }
 pointerUp(e){
  if(!state.running)return;
  const r=this.canvas.getBoundingClientRect();this.pointer.x=((e.clientX-r.left)/r.width)*2-1;this.pointer.y=-((e.clientY-r.top)/r.height)*2+1;
  this.raycaster.setFromCamera(this.pointer,this.camera);
  const hit=this.raycaster.intersectObjects(this.pickables,false)[0];
  if(!hit)return;
  const index=hit.object.userData.potIndex;
  this.setSelectedPot(index);
  if(state.action)applyAction(index,state.action);
 }
 resize(){
  const w=this.canvas.clientWidth||innerWidth,h=this.canvas.clientHeight||innerHeight;
  this.renderer.setSize(w,h,false);this.camera.aspect=w/Math.max(1,h);this.camera.fov=w<650?53:w<900?47:42;
  this.camera.position.set(0,w<650?12.8:11.1,w<650?13.1:11.2);this.camera.lookAt(0,.75,.2);this.camera.updateProjectionMatrix()
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
   v.selectRing.material.opacity=i===state.selectedPot?.95:.18;
  });
  this.renderer.render(this.scene,this.camera)
 }
}

const kitchen=new RamenKitchen3D(els.canvas);

function resetPot(index){
 state.pots[index]=newPot(index);kitchen.clearPotVisual(index);renderPotStrip();renderSelectedHelp()
}
function hasIngredient(p,id){return p.ingredients.includes(id)}
function addToPot(index,id){
 const p=state.pots[index];
 if(id==='water'){
  if(p.water>=3){toast('물은 3컵까지 넣을 수 있어요');return}
  if(p.ingredients.length)p.mistakes++;
  p.water=Math.min(3,p.water+1);p.sequence.push('water');p.heat=0;sfx('collect.coin_drop',{volume:.12,rate:.8,cooldownMs:80});toast('냄비 '+(index+1)+'에 물 1컵');return
 }
 if(hasIngredient(p,id)){toast(ingredientLabel(id)+'은 이미 들어 있어요');return}
 if(p.burnt){toast('탄 냄비는 먼저 비워 주세요');return}
 if(p.water<.45)p.mistakes++;
 if(id!=='noodle'&&id!=='soup'&&!hasIngredient(p,'noodle'))p.mistakes++;
 p.ingredients.push(id);p.sequence.push(id);kitchen.addIngredientVisual(index,id);sfx('collect.coin_pickup',{volume:.13,rate:1.05,cooldownMs:70});toast('냄비 '+(index+1)+' · '+ingredientLabel(id)+' 넣기')
}
function potCondition(p){
 if(p.burnt)return'탔어요!';
 if(p.water<=.05&&!p.ingredients.length)return'빈 냄비';
 if(!hasIngredient(p,'noodle'))return p.heat>=3.5?'물이 끓어요':'물 데우는 중';
 if(p.noodleTime<5.5)return'설익음';
 if(p.noodleTime<8.2)return'조금 더';
 if(p.noodleTime<=11.5)return'딱 좋아요!';
 if(p.noodleTime<=14.2)return'퍼지는 중';
 return'위험!'
}
function identifyRecipe(p){
 const unique=[...new Set(p.ingredients)].sort();
 return RECIPES.find(r=>[...r.need].sort().join('|')===unique.join('|'))||null
}
function qualityFor(p,recipe){
 let q=100;
 if(!recipe)q-=58;
 const waterTarget=1.75;q-=Math.abs(p.water-waterTarget)*18;
 const t=p.noodleTime;
 if(t<8.2)q-=(8.2-t)*8.5;
 else if(t>11.5)q-=(t-11.5)*8;
 q-=p.mistakes*12;
 if(!hasIngredient(p,'soup'))q-=25;
 if(p.burnt)q=Math.min(q,12);
 return Math.max(5,Math.min(100,Math.round(q)))
}
function qualityLabel(q,burnt=false){
 if(burnt)return'탔어요';
 if(q>=90)return'최고!';
 if(q>=76)return'맛있음';
 if(q>=58)return'괜찮음';
 if(q>=38)return'아쉬움';
 return'실패'
}
function platePot(index){
 if(state.tray){toast('서빙 쟁반이 차 있어요. 주문부터 서빙해 주세요');return}
 const p=state.pots[index];
 if(!hasIngredient(p,'noodle')){toast('면이 들어간 라면만 담을 수 있어요');return}
 const recipe=identifyRecipe(p),quality=qualityFor(p,recipe);
 state.tray={recipeId:recipe?.id||null,name:recipe?.name||'수상한 라면',quality,label:qualityLabel(quality,p.burnt),burnt:p.burnt};
 resetPot(index);renderTray();renderOrders();sfx(quality>=75?'success.cheer_yay':'failure.fail_sting',{volume:.18,cooldownMs:250});
 toast(state.tray.name+' · '+state.tray.label+'! 주문 카드를 눌러 서빙하세요',1800)
}
function applyAction(index,action){
 if(!state.running)return;
 if(action==='plate'){platePot(index);return}
 if(action==='discard'){const p=state.pots[index];if(p.water<=.05&&!p.ingredients.length){toast('이미 빈 냄비예요');return}resetPot(index);sfx('collect.coin_drop',{volume:.1,rate:.72,cooldownMs:100});toast('냄비 '+(index+1)+'을 비웠어요');return}
 addToPot(index,action);renderPotStrip();renderSelectedHelp()
}
function selectAction(action){
 state.action=action;
 els.dock.querySelectorAll('[data-action]').forEach(b=>b.classList.toggle('active',b.dataset.action===action));
 renderSelectedHelp()
}
function updatePots(dt){
 state.pots.forEach(p=>{
  if(p.water>.05){
   p.heat+=dt;
   if(p.heat>=3.5){
    p.water=Math.max(0,p.water-dt*.021);
    if(hasIngredient(p,'noodle'))p.noodleTime+=dt;
   }
  }else if(p.ingredients.length){p.heat+=dt*.25}
  if(hasIngredient(p,'noodle')&&(p.noodleTime>16.5||p.water<.16&&p.heat>4))p.burnt=true
 })
}
function renderPotStrip(){
 els.pots.innerHTML='';
 state.pots.forEach((p,i)=>{
  const d=document.createElement('div');d.className='pot-chip'+(i===state.selectedPot?' active':'');
  const recipe=identifyRecipe(p);const cond=potCondition(p);const pct=Math.max(0,Math.min(100,p.noodleTime/15*100));
  const ingredients=p.ingredients.length?p.ingredients.map(id=>INGREDIENTS[id]?.icon||'').join(''):'';
  d.innerHTML='<b>'+(i+1)+'번 냄비 · '+cond+'</b><small>물 '+p.water.toFixed(1)+'컵 '+ingredients+(recipe?' · '+recipe.name:'')+'</small><div class="mini"><i style="width:'+pct+'%"></i></div>';
  els.pots.appendChild(d)
 })
}
function renderSelectedHelp(){
 const p=state.pots[state.selectedPot],action=ACTION_NAMES[state.action]||'냄비 보기';
 els.selected.textContent=(state.selectedPot+1)+'번 냄비 · '+action+' · '+potCondition(p)
}
function makeOrder(){
 const recipe=RECIPES[Math.floor(Math.random()*RECIPES.length)];
 return{id:state.nextOrder++,recipeId:recipe.id,patience:100,customer:CUSTOMER_ICONS[(state.nextOrder-2)%CUSTOMER_ICONS.length]}
}
function spawnOrder(){
 if(!state.running||state.orders.length>=MAX_ORDERS)return;
 state.orders.push(makeOrder());renderOrders();sfx('collect.coin_drop',{volume:.11,rate:1.12,cooldownMs:150})
}
function orderIngredientText(r){return r.need.map(id=>INGREDIENTS[id]?.name||id).join(' + ')}
function renderOrders(){
 els.orders.innerHTML='';
 state.orders.forEach(o=>{
  const r=recipeById(o.recipeId),d=document.createElement('button');d.type='button';d.className='order-card'+(state.tray?.recipeId===o.recipeId?' match':'');d.dataset.order=String(o.id);
  d.innerHTML='<div class="customer"><span class="avatar">'+o.customer+'</span><div><b>'+r.name+'</b><p>'+orderIngredientText(r)+'</p></div></div><div class="order-bar"><span style="transform:scaleX('+(Math.max(0,o.patience)/100)+')"></span></div>';
  d.addEventListener('click',()=>serveOrder(o.id));els.orders.appendChild(d)
 })
}
function renderTray(){
 if(!state.tray){
  els.trayBtn.classList.add('empty');els.trayText.textContent='비어 있음';els.trayQuality.textContent='완성한 라면을 담아 주세요';return
 }
 els.trayBtn.classList.remove('empty');els.trayText.textContent=state.tray.name;els.trayQuality.textContent=state.tray.label+' · 같은 주문을 눌러 서빙'
}
function serveOrder(orderId){
 if(!state.running)return;
 const order=state.orders.find(o=>o.id===orderId);if(!order)return;
 if(!state.tray){toast('먼저 라면을 그릇에 담아 주세요');return}
 if(state.tray.recipeId!==order.recipeId){
  order.patience=Math.max(0,order.patience-8);renderOrders();sfx('failure.fail_sting',{volume:.16,cooldownMs:250});toast('주문이 달라요! '+recipeById(order.recipeId).name+' 손님이에요');return
 }
 const r=recipeById(order.recipeId),q=state.tray.quality;
 const earned=Math.max(200,Math.round((r.price*(.48+.52*q/100)+order.patience)*.01)*100);
 state.revenue+=earned;state.served++;if(q>=90)state.perfect++;
 state.orders=state.orders.filter(o=>o.id!==orderId);state.tray=null;
 renderTray();renderOrders();updateHud();sfx(q>=82?'shop.purchase':'collect.coin_pickup',{volume:.25,cooldownMs:300});
 toast(r.name+' 서빙 · '+qualityLabel(q)+' · +'+money(earned),1700);
 setTimeout(()=>{if(state.running)spawnOrder()},700)
}
function updateOrders(dt){
 let changed=false;
 state.orders.forEach(o=>{o.patience-=dt*(.84+state.served*.012)});
 const expired=state.orders.filter(o=>o.patience<=0);
 if(expired.length){
  state.missed+=expired.length;state.orders=state.orders.filter(o=>o.patience>0);changed=true;sfx('failure.fail_sting',{volume:.16,cooldownMs:300});toast('기다리던 손님이 떠났어요',1400)
 }
 if(changed)renderOrders()
}
function updateHud(){
 els.revenue.textContent=money(state.revenue);els.goal.textContent=money(TARGET_REVENUE);els.time.textContent=Math.max(0,Math.ceil(state.time));els.served.textContent=state.served
}
function updateGame(dt){
 state.time-=dt;state.spawnClock+=dt;state.uiClock+=dt;
 updatePots(dt);updateOrders(dt);
 if(state.spawnClock>=11){state.spawnClock=0;spawnOrder()}
 if(state.uiClock>=.16){state.uiClock=0;renderPotStrip();renderSelectedHelp();renderOrders();updateHud()}
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
 state.time=SHIFT_SECONDS;state.revenue=0;state.served=0;state.perfect=0;state.missed=0;state.orders=[];state.nextOrder=1;state.spawnClock=0;state.uiClock=0;state.tray=null;state.selectedPot=0;state.action='water';
 state.pots=Array.from({length:POT_COUNT},(_,i)=>newPot(i));
 for(let i=0;i<POT_COUNT;i++)kitchen.clearPotVisual(i);
 kitchen.setSelectedPot(0);renderTray();renderPotStrip();renderSelectedHelp();updateHud();selectAction('water')
}
function startGame(){
 resetGameState();state.running=true;state.last=performance.now();els.start.classList.remove('show');els.end.classList.remove('show');spawnOrder();spawnOrder();toast('물 2컵부터 시작해 보세요!',1600);state.raf=requestAnimationFrame(loop)
}

els.dock.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b)return;selectAction(b.dataset.action)});
els.trayBtn.addEventListener('click',()=>{if(!state.tray){toast('완성한 라면을 먼저 담아 주세요');return}state.tray=null;renderTray();renderOrders();sfx('collect.coin_drop',{volume:.1,rate:.75,cooldownMs:100});toast('쟁반의 음식을 버렸어요')});
$('#startBtn').addEventListener('click',startGame);
$('#restartBtn').addEventListener('click',startGame);
els.sound.addEventListener('click',()=>{state.sound=!state.sound;els.sound.textContent=state.sound?'♪':'×';if(state.sound)sfx('collect.coin_pickup',{volume:.12,cooldownMs:50})});

addEventListener('keydown',e=>{
 if(!state.running)return;
 const actionKeys={Digit1:'water',Digit2:'noodle',Digit3:'soup',Digit4:'egg',Digit5:'green',Digit6:'cheese',Digit7:'plate',Digit8:'discard'};
 if(actionKeys[e.code]){e.preventDefault();selectAction(actionKeys[e.code]);return}
 const potKeys={KeyQ:0,KeyW:1,KeyE:2,KeyR:3};
 if(Object.prototype.hasOwnProperty.call(potKeys,e.code)){e.preventDefault();const i=potKeys[e.code];kitchen.setSelectedPot(i);if(state.action)applyAction(i,state.action)}
});

updateHud();renderTray();renderPotStrip();renderSelectedHelp();selectAction('water');kitchen.update(0);

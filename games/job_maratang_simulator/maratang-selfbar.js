import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const FOOD = new URL('../../assets/game/food/', import.meta.url).href;
const MAX_PORTIONS = 12;
const CAMPAIGN_DAYS = 5;
const BASE_CUSTOMERS = 5;
const PRICE_PER_100G = 1900;
const START_CASH = 12000;
const BASE_STOCK = 7;
const UPGRADES = {
  fridge:{name:'냉장고 확장',base:3200,max:4},
  burner:{name:'화력 강화',base:3600,max:4},
  service:{name:'서비스 교육',base:3000,max:4},
  marketing:{name:'지역 홍보',base:4200,max:3}
};

const INGREDIENTS = [
  {id:'cabbage', name:'양배추', model:'cabbage.glb', cost:180, weight:55, size:.78},
  {id:'broccoli', name:'브로콜리', model:'broccoli.glb', cost:240, weight:45, size:.70},
  {id:'carrot', name:'당근', model:'carrot.glb', cost:160, weight:40, size:.72},
  {id:'mushroom', name:'버섯', model:'mushroom.glb', cost:300, weight:45, size:.66},
  {id:'sausage', name:'소시지', model:'sausage.glb', cost:420, weight:50, size:.68},
  {id:'meat', name:'소고기', model:'meat-raw.glb', cost:650, weight:60, size:.66},
  {id:'corn', name:'옥수수', model:'corn.glb', cost:260, weight:65, size:.72},
  {id:'leek', name:'대파', model:'leek.glb', cost:140, weight:35, size:.80},
  {id:'onion', name:'양파', model:'onion.glb', cost:170, weight:50, size:.68}
];

const ORDERS = [
  {title:'버섯 좋아하는 단골', must:{mushroom:2,cabbage:1}, avoid:['sausage'], spice:1, budget:7200,minWeight:190,maxWeight:330,patienceRate:.95,
   text:'버섯은 두 번, 양배추도 넣고 소시지는 빼 주세요. 1단계로 부탁해요.'},
  {title:'든든하게 먹는 직장인', must:{meat:1,sausage:1,corn:1}, avoid:['broccoli'], spice:2, budget:9000,minWeight:250,maxWeight:420,patienceRate:1.18,
   text:'소고기, 소시지, 옥수수는 꼭 넣어 주세요. 브로콜리는 빼고 2단계요. 시간이 많지 않아요.'},
  {title:'채소 위주 손님', must:{cabbage:1,broccoli:1,carrot:1,leek:1}, avoid:['meat'], spice:0, budget:6500,minWeight:200,maxWeight:350,patienceRate:.9,
   text:'채소를 골고루 담고 소고기는 빼 주세요. 안 맵게 부탁해요.'},
  {title:'얼큰한 마라 마니아', must:{meat:1,mushroom:1,onion:1}, avoid:['corn'], spice:3, budget:8500,minWeight:210,maxWeight:360,patienceRate:1.0,
   text:'소고기, 버섯, 양파를 넣고 옥수수는 빼 주세요. 3단계로 얼큰하게요.'},
  {title:'가볍게 먹는 학생', must:{carrot:1,corn:1,leek:1}, avoid:['sausage'], spice:1, budget:6000,minWeight:170,maxWeight:290,patienceRate:1.08,
   text:'당근, 옥수수, 대파를 담고 소시지는 빼 주세요. 1단계로 가볍게 먹을게요.'},
  {title:'고기와 채소 반반', must:{meat:1,cabbage:1,broccoli:1}, avoid:['onion'], spice:2, budget:8200,minWeight:210,maxWeight:370,patienceRate:.92,
   text:'소고기와 양배추, 브로콜리를 넣고 양파는 빼 주세요. 2단계로 부탁해요.'},
  {title:'양 많이 먹는 손님', must:{meat:1,sausage:1,cabbage:1,corn:1}, avoid:['carrot'], spice:2, budget:9800,minWeight:310,maxWeight:470,patienceRate:.88,
   text:'오늘은 든든하게 먹을래요. 소고기, 소시지, 양배추, 옥수수 넣고 당근은 빼 주세요.'},
  {title:'가격에 민감한 손님', must:{cabbage:1,mushroom:1,leek:1}, avoid:['meat','sausage'], spice:1, budget:5600,minWeight:170,maxWeight:270,patienceRate:1.05,
   text:'비싸지 않게 양배추, 버섯, 대파로 부탁해요. 고기랑 소시지는 빼 주세요.'},
  {title:'채소 듬뿍 손님', must:{broccoli:1,carrot:1,onion:1,corn:1}, avoid:['sausage'], spice:0, budget:7600,minWeight:230,maxWeight:390,patienceRate:.96,
   text:'브로콜리, 당근, 양파, 옥수수로 채소 듬뿍 담아 주세요. 소시지는 빼고 안 맵게요.'},
  {title:'매운맛 도전 손님', must:{meat:1,mushroom:1,leek:1}, avoid:['cabbage'], spice:3, budget:8400,minWeight:210,maxWeight:360,patienceRate:1.12,
   text:'소고기, 버섯, 대파 넣고 양배추는 빼 주세요. 맵기는 3단계로 도전할게요.'}
]

const $ = s => document.querySelector(s);
const els = {
  canvas: $('#scene'), labels: $('#ingredientLabels'), orderTitle: $('#orderTitle'), orderText: $('#orderText'),
  patienceFill: $('#patienceFill'), weight: $('#weight'), cost: $('#cost'), served: $('#served'), day:$('#day'), cash:$('#cash'),
  reputation:$('#reputation'), dayTarget:$('#dayTarget'), queue:$('#queue'),
  dragTip: $('#dragTip'), shoppingActions: $('#shoppingActions'), spiceDock: $('#spiceDock'),
  spiceOptions: $('#spiceOptions'), cookDock: $('#cookDock'), cookFill: $('#cookFill'), cookText: $('#cookText'),
  serveBtn: $('#serveBtn'), startOverlay: $('#startOverlay'), resultOverlay: $('#resultOverlay'),
  resultKicker: $('#resultKicker'), resultTitle: $('#resultTitle'), resultScore: $('#resultScore'),
  resultText: $('#resultText'), nextBtn: $('#nextBtn'), toast: $('#toast'), soundBtn: $('#soundBtn'), startBtn: $('#startBtn'),
  manageOverlay:$('#manageOverlay'), manageTitle:$('#manageTitle'), manageSummary:$('#manageSummary'), stockRows:$('#stockRows'),
  restockAllBtn:$('#restockAllBtn'), nextDayBtn:$('#nextDayBtn')
};

const state = {
  score:0, served:0, day:1, dayServed:0, dayTarget:BASE_CUSTOMERS, queue:0,
  cash:START_CASH, reputation:50, bowl:[], spice:null, order:null, phase:'idle',
  patience:100, patienceTimer:null, cookTimer:null, cookProgress:0, readyAt:0,
  sound:true, dragging:false, completed:false, customerSettled:false,
  dayRevenue:0, dayCogs:0, dayWaste:0, dayWalkouts:0,
  stock:Object.fromEntries(INGREDIENTS.map(i=>[i.id,BASE_STOCK])),
  upgrades:{fridge:0,burner:0,service:0,marketing:0}
};

const ingredientById = id => INGREDIENTS.find(x=>x.id===id);
const bowlWeight = () => state.bowl.reduce((sum,id)=>sum+(ingredientById(id)?.weight||0),0);
const bowlCost = () => Math.max(0,Math.round((bowlWeight()/100*PRICE_PER_100G)/100)*100);
const bowlIngredientCost = () => state.bowl.reduce((sum,id)=>sum+(ingredientById(id)?.cost||0),0);
const stockCapacity = () => BASE_STOCK + state.upgrades.fridge*3;
const customersForDay = () => BASE_CUSTOMERS + Math.min(2,state.day-1) + state.upgrades.marketing;
const countInBowl = id => state.bowl.filter(x=>x===id).length;
const shuffle = a => {
  const out=[...a];
  for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]]}
  return out;
};

function sfx(key, options={}) {
  if(!state.sound) return;
  try { window.KidscadeAudio?.play?.(key, options); } catch(_) {}
}
function toast(text) {
  els.toast.textContent=text;
  els.toast.classList.add('show');
  clearTimeout(toast.t);
  toast.t=setTimeout(()=>els.toast.classList.remove('show'),1300);
}
function updateStockUI(){
  for(const ing of INGREDIENTS){
    const label=els.labels.querySelector(`[data-id="${ing.id}"]`);
    const left=state.stock[ing.id]??0;
    if(label){label.textContent=ing.name+' · '+left;label.classList.toggle('out',left<=0)}
  }
  scene?.refreshStockVisuals?.();
}
function updateReadout() {
  els.weight.textContent=bowlWeight();
  els.cost.textContent=bowlCost().toLocaleString();
  els.served.textContent=state.dayServed;
  els.day.textContent=state.day;
  els.cash.textContent='₩'+Math.max(0,Math.round(state.cash)).toLocaleString();
  els.reputation.textContent=Math.round(state.reputation);
  els.dayTarget.textContent=state.dayTarget;
  els.queue.textContent=state.queue;
  updateStockUI();
}
function setPhase(phase) {
  state.phase=phase;
  const shopping=phase==='shopping';
  els.shoppingActions.hidden=!shopping;
  els.spiceDock.hidden=phase!=='spice';
  els.cookDock.hidden=!(phase==='cooking'||phase==='ready');
  els.labels.style.display=shopping?'block':'none';
  els.dragTip.classList.toggle('hidden',!shopping);
  scene.setMode(phase);
}
function setOrder(order) {
  state.order=order;
  els.orderTitle.textContent=order.title;
  els.orderText.textContent=order.text+` · 권장 ${order.minWeight}~${order.maxWeight}g · 예산 ${order.budget.toLocaleString()}원`;
  state.patience=100;state.customerSettled=false;
  els.patienceFill.style.transform='scaleX(1)';
}
function startPatience() {
  clearInterval(state.patienceTimer);
  state.patienceTimer=setInterval(()=>{
    if(state.phase==='idle'||state.completed||state.customerSettled)return;
    const serviceBonus=Math.max(.48,1-state.upgrades.service*.12);
    const queuePressure=1+state.queue*.035;
    const rate=.7*(state.order?.patienceRate||1)*serviceBonus*queuePressure;
    state.patience=Math.max(0,state.patience-rate);
    els.patienceFill.style.transform=`scaleX(${state.patience/100})`;
    if(state.patience<=0)customerLeaves();
  },500);
}
function stopPatience(){clearInterval(state.patienceTimer);state.patienceTimer=null}

class SelfBarScene {
  constructor(canvas) {
    this.canvas=canvas;
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled=true;
    this.scene=new THREE.Scene();
    this.scene.background=new THREE.Color(0xe4c7a6);
    this.camera=new THREE.PerspectiveCamera(38,1,.1,100);
    this.camera.position.set(0,7.3,9.8);
    this.camera.lookAt(0,.4,0);
    this.loader=new GLTFLoader();
    this.cache=new Map();
    this.raycaster=new THREE.Raycaster();
    this.pointer=new THREE.Vector2();
    this.dragPlane=new THREE.Plane(new THREE.Vector3(0,1,0),-.85);
    this.dragObject=null;
    this.dragId=null;
    this.dragStart=null;
    this.bowlCenter=new THREE.Vector3(0,.45,2.65);
    this.labelAnchors=new Map();
    this.displayItems=new Map();
    this.bowlItems=[];
    this.mode='idle';
    this.time=0;
    this.makeLights();
    this.makeCounter();
    this.makeShelf();
    this.makeBowl();
    this.makePot();
    this.bindPointer();
    this.resize();
    addEventListener('resize',()=>this.resize(),{passive:true});
    this.animate();
  }
  makeLights(){
    this.scene.add(new THREE.HemisphereLight(0xfff3df,0x6b4a33,2.2));
    const key=new THREE.DirectionalLight(0xffffff,3.4);
    key.position.set(-4,8,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);
    this.scene.add(key);
    const warm=new THREE.PointLight(0xffb76b,16,18,2);warm.position.set(5,5,-2);this.scene.add(warm);
  }
  makeCounter(){
    const counter=new THREE.Mesh(new THREE.BoxGeometry(10, .45, 7.2),new THREE.MeshStandardMaterial({color:0xb98358,roughness:.78}));
    counter.position.set(0,-.35,.35);counter.receiveShadow=true;this.scene.add(counter);
    const back=new THREE.Mesh(new THREE.BoxGeometry(10,3.3,.22),new THREE.MeshStandardMaterial({color:0xede0ce,roughness:.9}));
    back.position.set(0,1.25,-3.15);this.scene.add(back);
  }
  makeShelf(){
    this.shelfGroup=new THREE.Group();this.scene.add(this.shelfGroup);
    const positions=[
      [-3.2,-1.85],[-1.6,-1.85],[0,-1.85],[1.6,-1.85],[3.2,-1.85],
      [-2.4,-.35],[-.8,-.35],[.8,-.35],[2.4,-.35]
    ];
    INGREDIENTS.forEach((ing,i)=>{
      const [x,z]=positions[i];
      const tray=new THREE.Mesh(new THREE.BoxGeometry(1.42,.22,1.05),new THREE.MeshStandardMaterial({color:0x71503a,roughness:.75,metalness:.05}));
      tray.position.set(x,-.02,z);tray.receiveShadow=true;tray.userData.ingredientId=ing.id;this.shelfGroup.add(tray);
      const inner=new THREE.Mesh(new THREE.BoxGeometry(1.23,.12,.88),new THREE.MeshStandardMaterial({color:0xe5d1b8,roughness:.9}));
      inner.position.set(x,.13,z);inner.userData.ingredientId=ing.id;this.shelfGroup.add(inner);
      const anchor=new THREE.Object3D();anchor.position.set(x,.85,z+.1);this.shelfGroup.add(anchor);this.labelAnchors.set(ing.id,anchor);
      this.loadIngredientDisplay(ing,x,z);
    });
  }
  async loadIngredientDisplay(ing,x,z){
    const obj=await this.cloneModel(ing.model,ing.size);
    obj.position.set(x,.34,z);obj.rotation.y=(Math.random()-.5)*.5;
    this.markIngredient(obj,ing.id);
    this.displayItems.set(ing.id,obj);obj.visible=(state.stock[ing.id]??0)>0;
    this.shelfGroup.add(obj);
  }
  refreshStockVisuals(){
    for(const [id,obj] of this.displayItems)obj.visible=(state.stock[id]??0)>0;
  }
  async cloneModel(file,size=.7){
    let source=this.cache.get(file);
    if(!source){
      const gltf=await this.loader.loadAsync(FOOD+file);
      source=gltf.scene;this.cache.set(file,source);
    }
    const obj=source.clone(true);
    const box=new THREE.Box3().setFromObject(obj);
    const dims=new THREE.Vector3();box.getSize(dims);
    const max=Math.max(dims.x,dims.y,dims.z)||1;
    const s=size/max;obj.scale.setScalar(s);
    const after=new THREE.Box3().setFromObject(obj);
    const center=new THREE.Vector3();after.getCenter(center);
    obj.position.sub(center);
    obj.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true}});
    return obj;
  }
  markIngredient(obj,id){obj.userData.ingredientId=id;obj.traverse(n=>{n.userData.ingredientId=id})}
  async makeBowl(){
    this.bowlRoot=new THREE.Group();this.bowlRoot.position.copy(this.bowlCenter);this.scene.add(this.bowlRoot);
    this.bowlContents=new THREE.Group();this.bowlContents.position.y=.25;this.bowlRoot.add(this.bowlContents);
    const hit=new THREE.Mesh(new THREE.CylinderGeometry(1.08,1.08,.22,32),new THREE.MeshBasicMaterial({transparent:true,opacity:.001,depthWrite:false}));
    hit.position.y=.22;hit.userData.bowlHit=true;this.bowlRoot.add(hit);this.bowlHit=hit;
    const bowl=await this.cloneModel('bowl.glb',2.35);bowl.rotation.x=.04;this.bowlRoot.add(bowl);
  }
  async makePot(){
    this.potRoot=new THREE.Group();this.potRoot.position.set(0,.15,1.6);this.potRoot.visible=false;this.scene.add(this.potRoot);
    const pot=await this.cloneModel('pot-stew.glb',2.8);this.potRoot.add(pot);
    this.steam=[];
    const mat=new THREE.MeshStandardMaterial({color:0xffffff,transparent:true,opacity:.28,roughness:1});
    for(let i=0;i<10;i++){
      const puff=new THREE.Mesh(new THREE.SphereGeometry(.11+Math.random()*.08,12,8),mat.clone());
      puff.position.set((Math.random()-.5)*.9,.55+Math.random()*1.5,(Math.random()-.5)*.55);
      puff.userData.speed=.35+Math.random()*.5;this.potRoot.add(puff);this.steam.push(puff);
    }
  }
  bindPointer(){
    this.canvas.addEventListener('pointerdown',e=>this.pointerDown(e));
    this.canvas.addEventListener('pointermove',e=>this.pointerMove(e));
    this.canvas.addEventListener('pointerup',e=>this.pointerUp(e));
    this.canvas.addEventListener('pointercancel',e=>this.pointerUp(e));
  }
  setPointer(e){
    const r=this.canvas.getBoundingClientRect();
    this.pointer.x=((e.clientX-r.left)/r.width)*2-1;
    this.pointer.y=-((e.clientY-r.top)/r.height)*2+1;
  }
  getIngredientHit(){
    this.raycaster.setFromCamera(this.pointer,this.camera);
    const hits=this.raycaster.intersectObjects(this.shelfGroup.children,true);
    for(const h of hits){if(h.object.userData.ingredientId)return h.object.userData.ingredientId}
    return null;
  }
  async pointerDown(e){
    if(state.phase!=='shopping')return;
    this.setPointer(e);
    const id=this.getIngredientHit();if(!id)return;
    e.preventDefault();this.canvas.setPointerCapture?.(e.pointerId);
    this.dragId=id;this.dragStart={x:e.clientX,y:e.clientY};state.dragging=true;this.canvas.classList.add('dragging');
    const ing=ingredientById(id);
    this.dragObject=await this.cloneModel(ing.model,ing.size*.85);
    this.markIngredient(this.dragObject,id);this.scene.add(this.dragObject);
    this.pointerMove(e);
    els.dragTip.classList.add('hidden');
  }
  pointerMove(e){
    if(!this.dragObject)return;
    this.setPointer(e);this.raycaster.setFromCamera(this.pointer,this.camera);
    const p=new THREE.Vector3();
    if(this.raycaster.ray.intersectPlane(this.dragPlane,p)){this.dragObject.position.copy(p);this.dragObject.position.y=.86}
    const near=this.isPointerOverBowl();
    if(this.bowlRoot)this.bowlRoot.scale.setScalar(near?1.08:1);
  }
  isPointerOverBowl(){
    const p=this.bowlCenter.clone().project(this.camera);
    return Math.hypot(this.pointer.x-p.x,this.pointer.y-p.y)<.25;
  }
  pointerUp(e){
    if(!this.dragObject)return;
    this.setPointer(e);
    const accepted=this.isPointerOverBowl();
    const obj=this.dragObject;this.dragObject=null;this.scene.remove(obj);
    if(this.bowlRoot)this.bowlRoot.scale.setScalar(1);
    const id=this.dragId;this.dragId=null;state.dragging=false;this.canvas.classList.remove('dragging');
    if(accepted)addIngredient(id);
    else els.dragTip.classList.remove('hidden');
  }
  async addBowlItem(id){
    const ing=ingredientById(id);
    const obj=await this.cloneModel(ing.model,.46);
    const angle=Math.random()*Math.PI*2, radius=Math.random()*.55;
    obj.position.set(Math.cos(angle)*radius,.75+Math.random()*.15,Math.sin(angle)*radius);
    obj.rotation.set(Math.random()*.5,Math.random()*Math.PI*2,Math.random()*.45);
    this.bowlContents.add(obj);this.bowlItems.push(obj);
    const target=.3+Math.random()*.12;
    const start=performance.now();
    const drop=now=>{
      const t=Math.min(1,(now-start)/240);
      obj.position.y=.75+(target-.75)*(1-Math.pow(1-t,2));
      if(t<1)requestAnimationFrame(drop);
    };requestAnimationFrame(drop);
  }
  removeLastBowlItem(){
    const obj=this.bowlItems.pop();if(obj)obj.removeFromParent();
  }
  clearBowl(){
    this.bowlItems.forEach(o=>o.removeFromParent());this.bowlItems=[];
  }
  setMode(mode){
    this.mode=mode;
    if(this.shelfGroup)this.shelfGroup.visible=mode==='shopping'||mode==='spice';
    if(this.bowlRoot)this.bowlRoot.visible=mode==='shopping'||mode==='spice';
    if(this.potRoot)this.potRoot.visible=mode==='cooking'||mode==='ready';
  }
  updateLabels(){
    const rect=this.canvas.getBoundingClientRect();
    for(const [id,anchor] of this.labelAnchors){
      const el=els.labels.querySelector(`[data-id="${id}"]`);if(!el)continue;
      const p=new THREE.Vector3();anchor.getWorldPosition(p);p.project(this.camera);
      el.style.left=((p.x+1)*.5*rect.width)+'px';
      el.style.top=((-p.y+1)*.5*rect.height)+'px';
      el.style.opacity=(p.z<1&&state.phase==='shopping')?'1':'0';
    }
  }
  resize(){
    const w=this.canvas.clientWidth||innerWidth,h=this.canvas.clientHeight||innerHeight;
    this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();
    if(w<620){this.camera.position.set(0,8.2,10.8);this.camera.fov=44}else{this.camera.position.set(0,7.3,9.8);this.camera.fov=38}
    this.camera.updateProjectionMatrix();this.camera.lookAt(0,.35,0);
  }
  animate(){
    requestAnimationFrame(()=>this.animate());
    const dt=.016;this.time+=dt;
    if(this.potRoot?.visible){
      this.steam.forEach((p,i)=>{
        p.position.y+=p.userData.speed*dt;
        p.position.x+=Math.sin(this.time*2+i)*.0018;
        if(p.position.y>2.15){p.position.y=.55;p.position.x=(Math.random()-.5)*.9;p.position.z=(Math.random()-.5)*.55}
        p.material.opacity=.16+.12*Math.sin(this.time*2+i)*.5+.06;
      });
    }
    this.updateLabels();
    this.renderer.render(this.scene,this.camera);
  }
}

function makeLabels(){
  els.labels.innerHTML='';
  INGREDIENTS.forEach(ing=>{
    const d=document.createElement('div');d.className='ingredient-label';d.dataset.id=ing.id;d.textContent=ing.name;els.labels.appendChild(d);
  });
}
function addIngredient(id){
  if(state.phase!=='shopping')return;
  if(state.bowl.length>=MAX_PORTIONS)return toast('그릇이 가득 찼어요');
  if((state.stock[id]||0)<=0)return toast((ingredientById(id)?.name||'재료')+' 품절!');
  state.stock[id]--;state.bowl.push(id);scene.addBowlItem(id);updateReadout();
  const ing=ingredientById(id);toast(ing.name+' 담기 · 재고 '+state.stock[id]);sfx('collect.coin_pickup',{volume:.2,rate:1.08,rateJitter:.03,cooldownMs:60});
}
function undo(){
  if(state.phase!=='shopping'||!state.bowl.length)return;
  const id=state.bowl.pop();state.stock[id]=(state.stock[id]||0)+1;scene.removeLastBowlItem();updateReadout();toast((ingredientById(id)?.name||'재료')+' 빼기');
}
function clearBowl(){
  if(state.phase!=='shopping')return;
  for(const id of state.bowl)state.stock[id]=(state.stock[id]||0)+1;
  state.bowl=[];scene.clearBowl();updateReadout();toast('그릇을 비웠어요');
}
function checkout(){
  if(state.phase!=='shopping')return;
  if(!state.bowl.length)return toast('재료를 먼저 담아 주세요');
  state.spice=null;renderSpiceOptions();setPhase('spice');
}
function renderSpiceOptions(){
  els.spiceOptions.innerHTML='';
  ['0','1','2','3'].forEach((n,i)=>{
    const b=document.createElement('button');b.type='button';b.className='spice-choice';b.textContent=n+'단계';
    b.addEventListener('click',()=>{
      state.spice=i;els.spiceOptions.querySelectorAll('button').forEach(x=>x.classList.toggle('selected',x===b));
      sfx('collect.coin_pickup',{volume:.12,rate:1.24,cooldownMs:80});
    });els.spiceOptions.appendChild(b);
  });
}
function backToBar(){if(state.phase==='spice')setPhase('shopping')}
function startCook(){
  if(state.phase!=='spice')return;
  if(state.spice===null)return toast('맵기를 골라 주세요');
  setPhase('cooking');state.cookProgress=0;state.readyAt=0;els.cookFill.style.width='0%';els.serveBtn.hidden=true;els.cookText.textContent='보글보글 끓이는 중';
  clearInterval(state.cookTimer);
  const speed=1+state.upgrades.burner*.25;
  state.cookTimer=setInterval(()=>{
    state.cookProgress=Math.min(100,state.cookProgress+4*speed);
    els.cookFill.style.width=state.cookProgress+'%';
    if(state.cookProgress>=100){
      clearInterval(state.cookTimer);state.cookTimer=null;state.readyAt=performance.now();setPhase('ready');
      els.cookText.textContent='완성됐어요 · 바로 서빙하세요';els.serveBtn.hidden=false;
      sfx('success.cheer_yay',{volume:.28,cooldownMs:500});
    }
  },100);
}
function evaluate(){
  const o=state.order;let points=40;const good=[],bad=[];
  for(const [id,need] of Object.entries(o.must)){
    const have=countInBowl(id);
    if(have>=need){points+=need*15;good.push(ingredientById(id).name)}
    else{points-=(need-have)*25;bad.push(ingredientById(id).name+' 부족')}
  }
  for(const id of o.avoid){
    const have=countInBowl(id);
    if(have>0){points-=30+Math.max(0,have-1)*8;bad.push(ingredientById(id).name+' 제외 실패')}
  }
  const required=new Set(Object.keys(o.must));
  const extras=state.bowl.filter(id=>!required.has(id)&&!o.avoid.includes(id)).length;
  if(extras>1){points-=(extras-1)*4;bad.push('불필요한 재료가 많음')}
  const weight=bowlWeight();
  if(weight>=o.minWeight&&weight<=o.maxWeight){points+=18;good.push('양 맞춤')}
  else{
    const gap=weight<o.minWeight?o.minWeight-weight:weight-o.maxWeight;
    points-=Math.min(28,8+Math.ceil(gap/40)*4);bad.push(weight<o.minWeight?'양 부족':'양 과다');
  }
  const price=bowlCost(),over=price-o.budget;
  if(over<=0){points+=12}else{points-=Math.min(35,Math.ceil(over/500)*7);bad.push('예산 초과')}
  const spiceDiff=Math.abs((state.spice??0)-o.spice);
  if(spiceDiff===0){points+=15;good.push('맵기 맞춤')}else{points-=spiceDiff*12;bad.push('맵기 차이')}
  const readyWait=state.readyAt?Math.max(0,(performance.now()-state.readyAt)/1000):0;
  if(readyWait>7){points-=Math.min(18,Math.round((readyWait-7)*2));bad.push('서빙 지연')}
  points+=Math.round(state.patience/10);
  points=Math.max(0,Math.min(150,Math.round(points)));
  return{points,good,bad,weight,price,cogs:bowlIngredientCost()};
}
function settleCustomer(result){
  const payRate=result.points>=90?1:result.points>=60?.85:.6;
  const baseRevenue=Math.max(0,Math.round(result.price*payRate/100)*100);
  const tip=result.points>=115?Math.round((result.price*.08*(state.patience/100))/100)*100:result.points>=95?300:0;
  const revenue=baseRevenue+tip;
  const repDelta=result.points>=115?3:result.points>=90?1:result.points<60?-3:0;
  state.cash+=revenue;state.dayRevenue+=revenue;state.dayCogs+=result.cogs;
  state.reputation=Math.max(0,Math.min(100,state.reputation+repDelta));
  return{revenue,tip,repDelta,profit:revenue-result.cogs};
}
function serve(){
  if(state.phase!=='ready'||state.customerSettled)return;
  state.customerSettled=true;const result=evaluate(),money=settleCustomer(result);
  state.score+=result.points;state.served++;state.dayServed++;state.queue=Math.max(0,state.dayTarget-state.dayServed-1);
  updateReadout();stopPatience();setPhase('idle');
  const great=result.points>=115, okay=result.points>=80;
  els.resultKicker.textContent=`DAY ${state.day} · 손님 ${state.dayServed} / ${state.dayTarget}`;
  els.resultTitle.textContent=great?'단골이 생길 것 같아요':okay?'맛있게 먹었어요':'불만이 조금 있어요';
  els.resultScore.textContent=result.points;
  const goodText=result.good.length?'잘한 점: '+result.good.join(', '):'';
  const badText=result.bad.length?' · '+result.bad.join(', '):'';
  els.resultText.textContent=`${goodText}${badText} · 결제 ₩${money.revenue.toLocaleString()} (팁 ₩${money.tip.toLocaleString()}) · 이익 ₩${Math.max(0,money.profit).toLocaleString()}`;
  els.nextBtn.textContent=state.dayServed>=state.dayTarget?'오늘 영업 마감':'다음 손님';
  els.resultOverlay.classList.add('show');
  sfx(great?'success.cheer_yay':okay?'shop.purchase':'failure.fail_sting',{volume:.3,cooldownMs:500});
}
function customerLeaves(){
  if(state.customerSettled||state.phase==='idle')return;
  state.customerSettled=true;stopPatience();clearInterval(state.cookTimer);state.cookTimer=null;
  const waste=bowlIngredientCost();state.dayWaste+=waste;state.dayWalkouts++;state.served++;state.dayServed++;
  state.reputation=Math.max(0,state.reputation-5);state.queue=Math.max(0,state.dayTarget-state.dayServed-1);setPhase('idle');updateReadout();
  els.resultKicker.textContent=`DAY ${state.day} · 손님 이탈`;
  els.resultTitle.textContent='기다리다 돌아갔어요';
  els.resultScore.textContent='0';
  els.resultText.textContent=`평판 -5 · 담아 둔 재료 ₩${waste.toLocaleString()}어치는 폐기되었습니다. 대기 손님을 더 빨리 처리해야 해요.`;
  els.nextBtn.textContent=state.dayServed>=state.dayTarget?'오늘 영업 마감':'다음 손님';
  els.resultOverlay.classList.add('show');sfx('failure.fail_sting',{volume:.34,cooldownMs:500});
}
function next(){
  if(state.completed){location.reload();return}
  els.resultOverlay.classList.remove('show');
  if(state.dayServed>=state.dayTarget)return finishDay();
  beginCustomer();
}
function upgradeCost(key){
  const u=UPGRADES[key],lv=state.upgrades[key]||0;
  return Math.round((u.base*(1+lv*.68))/100)*100;
}
function restockIngredient(id,amount=3){
  const ing=ingredientById(id),cap=stockCapacity(),gap=Math.max(0,cap-(state.stock[id]||0)),qty=Math.min(amount,gap);
  if(!qty)return toast(ing.name+' 재고가 가득 찼어요');
  const cost=ing.cost*qty;
  if(state.cash<cost)return toast('현금이 부족해요 · 필요 ₩'+cost.toLocaleString());
  state.cash-=cost;state.stock[id]=(state.stock[id]||0)+qty;renderManagement();updateReadout();sfx('shop.purchase',{volume:.2,cooldownMs:120});
}
function restockAll(){
  const cap=stockCapacity();
  const need=INGREDIENTS.map(ing=>({ing,qty:Math.max(0,cap-(state.stock[ing.id]||0))}));
  const cost=need.reduce((sum,x)=>sum+x.ing.cost*x.qty,0);
  if(!cost)return toast('모든 재고가 가득 찼어요');
  if(state.cash<cost)return toast('전체 보충 비용 ₩'+cost.toLocaleString()+'이 필요해요');
  state.cash-=cost;for(const {ing,qty} of need)state.stock[ing.id]+=qty;
  renderManagement();updateReadout();sfx('shop.purchase',{volume:.28,cooldownMs:120});
}
function buyUpgrade(key){
  const u=UPGRADES[key],lv=state.upgrades[key]||0;if(lv>=u.max)return toast('최대 단계예요');
  const cost=upgradeCost(key);if(state.cash<cost)return toast('현금이 부족해요 · 필요 ₩'+cost.toLocaleString());
  state.cash-=cost;state.upgrades[key]++;renderManagement();updateReadout();sfx('shop.purchase',{volume:.3,cooldownMs:120});
}
function renderManagement(){
  const profit=state.dayRevenue-state.dayCogs-state.dayWaste;
  els.manageTitle.textContent=`${state.day}일차 결산`;
  els.manageSummary.innerHTML=`<div><span>매출</span><b>₩${state.dayRevenue.toLocaleString()}</b></div><div><span>재료원가</span><b>₩${state.dayCogs.toLocaleString()}</b></div><div><span>폐기손실</span><b>₩${state.dayWaste.toLocaleString()}</b></div><div><span>영업이익</span><b>₩${profit.toLocaleString()}</b></div><div><span>평판</span><b>${Math.round(state.reputation)}</b></div><div><span>이탈 손님</span><b>${state.dayWalkouts}</b></div>`;
  const cap=stockCapacity();els.stockRows.innerHTML='';
  for(const ing of INGREDIENTS){
    const row=document.createElement('div');row.className='stock-row';
    const qty=Math.min(3,Math.max(0,cap-(state.stock[ing.id]||0))),cost=qty*ing.cost;
    row.innerHTML=`<span>${ing.name}</span><b>${state.stock[ing.id]||0} / ${cap}</b><button type="button" ${qty?'':'disabled'}>+${qty||0} · ₩${cost.toLocaleString()}</button>`;
    row.querySelector('button').addEventListener('click',()=>restockIngredient(ing.id,3));els.stockRows.appendChild(row);
  }
  for(const [key,u] of Object.entries(UPGRADES)){
    const lv=state.upgrades[key],el=document.getElementById(key+'Cost');
    if(el)el.textContent=lv>=u.max?'MAX':`Lv.${lv} → ${lv+1} · ₩${upgradeCost(key).toLocaleString()}`;
    const btn=document.querySelector(`[data-upgrade="${key}"]`);if(btn)btn.disabled=lv>=u.max;
  }
  updateReadout();
}
function finishCampaign(){
  state.completed=true;stopPatience();setPhase('idle');
  const rating=state.reputation>=75?'동네 인기 맛집':state.reputation>=55?'안정적인 마라탕집':'다시 손봐야 할 가게';
  els.resultKicker.textContent='5일 타이쿤 결과';els.resultTitle.textContent=rating;
  els.resultScore.textContent=Math.round(state.cash);els.resultText.textContent=`최종 현금 ₩${Math.round(state.cash).toLocaleString()} · 평판 ${Math.round(state.reputation)} · 총 손님 ${state.served}명`;
  els.nextBtn.textContent='새 가게 시작';els.resultOverlay.classList.add('show');sfx('success.victory_fanfare',{volume:.42,cooldownMs:1200});
}
function finishDay(){
  stopPatience();setPhase('idle');
  if(state.day>=CAMPAIGN_DAYS)return finishCampaign();
  renderManagement();els.manageOverlay.classList.add('show');
}
function startNextDay(){
  els.manageOverlay.classList.remove('show');state.day++;state.dayServed=0;state.dayRevenue=0;state.dayCogs=0;state.dayWaste=0;state.dayWalkouts=0;
  state.dayTarget=customersForDay();state._orderDeck=shuffle(ORDERS);updateReadout();beginCustomer();
}
function beginCustomer(){
  state.bowl=[];state.spice=null;state.cookProgress=0;state.readyAt=0;scene.clearBowl();
  if(!state._orderDeck||!state._orderDeck.length)state._orderDeck=shuffle(ORDERS);
  const order=state._orderDeck.pop();state.queue=Math.max(0,state.dayTarget-state.dayServed-1);setOrder(order);updateReadout();setPhase('shopping');startPatience();
}
function startGame(){
  state.score=0;state.served=0;state.day=1;state.dayServed=0;state.cash=START_CASH;state.reputation=50;state.completed=false;
  state.dayRevenue=0;state.dayCogs=0;state.dayWaste=0;state.dayWalkouts=0;state.upgrades={fridge:0,burner:0,service:0,marketing:0};
  state.stock=Object.fromEntries(INGREDIENTS.map(i=>[i.id,BASE_STOCK]));state.dayTarget=customersForDay();state._orderDeck=shuffle(ORDERS);
  els.startOverlay.classList.remove('show');updateReadout();beginCustomer();
}

makeLabels();
let scene;
try {
  scene = new SelfBarScene(els.canvas);
} catch (error) {
  console.error('[maratang-selfbar] 3D scene init failed', error);
  els.startBtn.textContent='3D 준비 실패 · 새로고침';
  els.startBtn.disabled=true;
}
els.startBtn.addEventListener('click',()=>{
  if(!scene)return;
  startGame();
});
$('#undoBtn').addEventListener('click',undo);
$('#clearBtn').addEventListener('click',clearBowl);
$('#checkoutBtn').addEventListener('click',checkout);
$('#backToBarBtn').addEventListener('click',backToBar);
$('#cookBtn').addEventListener('click',startCook);
els.serveBtn.addEventListener('click',serve);
els.nextBtn.addEventListener('click',next);
els.soundBtn.addEventListener('click',()=>{
  state.sound=!state.sound;els.soundBtn.textContent=state.sound?'SOUND ON':'SOUND OFF';
});
updateReadout();
setPhase('idle');

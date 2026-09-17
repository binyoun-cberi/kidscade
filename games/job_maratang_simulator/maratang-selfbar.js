import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const FOOD = new URL('../../assets/game/food/', import.meta.url).href;
const MAX_PORTIONS = 12;
const TOTAL_CUSTOMERS = 5;

const INGREDIENTS = [
  {id:'cabbage', name:'양배추', model:'cabbage.glb', price:900, weight:55, size:.78},
  {id:'broccoli', name:'브로콜리', model:'broccoli.glb', price:1100, weight:45, size:.70},
  {id:'carrot', name:'당근', model:'carrot.glb', price:700, weight:40, size:.72},
  {id:'mushroom', name:'버섯', model:'mushroom.glb', price:1200, weight:45, size:.66},
  {id:'sausage', name:'소시지', model:'sausage.glb', price:1600, weight:50, size:.68},
  {id:'meat', name:'소고기', model:'meat-raw.glb', price:2300, weight:60, size:.66},
  {id:'corn', name:'옥수수', model:'corn.glb', price:1300, weight:65, size:.72},
  {id:'leek', name:'대파', model:'leek.glb', price:800, weight:35, size:.80},
  {id:'onion', name:'양파', model:'onion.glb', price:900, weight:50, size:.68}
];

const ORDERS = [
  {title:'버섯 좋아하는 손님', must:{mushroom:2,cabbage:1}, avoid:['sausage'], spice:1, budget:7200,
   text:'버섯은 두 번, 양배추도 넣고 소시지는 빼 주세요. 1단계, 7,200원 안쪽으로요.'},
  {title:'든든하게 먹고 싶은 손님', must:{meat:1,sausage:1,corn:1}, avoid:['broccoli'], spice:2, budget:9000,
   text:'소고기, 소시지, 옥수수는 꼭 넣어 주세요. 브로콜리는 빼고 2단계로 부탁해요.'},
  {title:'채소 위주 손님', must:{cabbage:1,broccoli:1,carrot:1,leek:1}, avoid:['meat'], spice:0, budget:6500,
   text:'채소를 골고루 담고 소고기는 빼 주세요. 안 맵게, 6,500원 안쪽이면 좋아요.'},
  {title:'얼큰한 마라탕 손님', must:{meat:1,mushroom:1,onion:1}, avoid:['corn'], spice:3, budget:8500,
   text:'소고기, 버섯, 양파를 넣고 옥수수는 빼 주세요. 3단계로 얼큰하게요.'},
  {title:'가볍게 먹는 손님', must:{carrot:1,corn:1,leek:1}, avoid:['sausage'], spice:1, budget:6000,
   text:'당근, 옥수수, 대파를 담고 소시지는 빼 주세요. 1단계로 가볍게 먹을게요.'},
  {title:'고기와 채소 반반', must:{meat:1,cabbage:1,broccoli:1}, avoid:['onion'], spice:2, budget:8200,
   text:'소고기와 양배추, 브로콜리를 넣고 양파는 빼 주세요. 2단계로 부탁해요.'}
];

const $ = s => document.querySelector(s);
const els = {
  canvas: $('#scene'), labels: $('#ingredientLabels'), orderTitle: $('#orderTitle'), orderText: $('#orderText'),
  patienceFill: $('#patienceFill'), weight: $('#weight'), cost: $('#cost'), served: $('#served'), score: $('#score'),
  dragTip: $('#dragTip'), shoppingActions: $('#shoppingActions'), spiceDock: $('#spiceDock'),
  spiceOptions: $('#spiceOptions'), cookDock: $('#cookDock'), cookFill: $('#cookFill'), cookText: $('#cookText'),
  serveBtn: $('#serveBtn'), startOverlay: $('#startOverlay'), resultOverlay: $('#resultOverlay'),
  resultKicker: $('#resultKicker'), resultTitle: $('#resultTitle'), resultScore: $('#resultScore'),
  resultText: $('#resultText'), nextBtn: $('#nextBtn'), toast: $('#toast'), soundBtn: $('#soundBtn')
};

const state = {
  score:0, served:0, bowl:[], spice:null, order:null, phase:'idle',
  patience:100, patienceTimer:null, cookTimer:null, cookProgress:0,
  sound:true, dragging:false, completed:false
};

const ingredientById = id => INGREDIENTS.find(x=>x.id===id);
const bowlCost = () => state.bowl.reduce((sum,id)=>sum+(ingredientById(id)?.price||0),0);
const bowlWeight = () => state.bowl.reduce((sum,id)=>sum+(ingredientById(id)?.weight||0),0);
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
function updateReadout() {
  els.weight.textContent=bowlWeight();
  els.cost.textContent=bowlCost().toLocaleString();
  els.served.textContent=state.served;
  els.score.textContent=state.score;
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
  els.orderText.textContent=order.text;
  state.patience=100;
  els.patienceFill.style.transform='scaleX(1)';
}
function startPatience() {
  clearInterval(state.patienceTimer);
  state.patienceTimer=setInterval(()=>{
    if(state.phase==='idle'||state.completed)return;
    state.patience=Math.max(0,state.patience-.7);
    els.patienceFill.style.transform=`scaleX(${state.patience/100})`;
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
    this.shelfGroup.add(obj);
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
  state.bowl.push(id);scene.addBowlItem(id);updateReadout();
  const ing=ingredientById(id);toast(ing.name+' 담기');sfx('collect.coin_pickup',{volume:.2,rate:1.08,rateJitter:.03,cooldownMs:60});
}
function undo(){
  if(state.phase!=='shopping'||!state.bowl.length)return;
  const id=state.bowl.pop();scene.removeLastBowlItem();updateReadout();toast((ingredientById(id)?.name||'재료')+' 빼기');
}
function clearBowl(){
  if(state.phase!=='shopping')return;
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
  setPhase('cooking');state.cookProgress=0;els.cookFill.style.width='0%';els.serveBtn.hidden=true;els.cookText.textContent='보글보글 끓이는 중';
  clearInterval(state.cookTimer);
  state.cookTimer=setInterval(()=>{
    state.cookProgress=Math.min(100,state.cookProgress+4);
    els.cookFill.style.width=state.cookProgress+'%';
    if(state.cookProgress>=100){
      clearInterval(state.cookTimer);state.cookTimer=null;setPhase('ready');
      els.cookText.textContent='완성됐어요';els.serveBtn.hidden=false;
      sfx('success.cheer_yay',{volume:.28,cooldownMs:500});
    }
  },100);
}
function evaluate(){
  const o=state.order;let points=100;const good=[],bad=[];
  for(const [id,need] of Object.entries(o.must)){
    const have=countInBowl(id);
    if(have>=need){points+=need*7;good.push(ingredientById(id).name)}
    else{points-=(need-have)*18;bad.push(ingredientById(id).name+' 부족')}
  }
  for(const id of o.avoid){
    if(countInBowl(id)>0){points-=22;bad.push(ingredientById(id).name+' 제외 실패')}
  }
  const over=bowlCost()-o.budget;
  if(over<=0){points+=10}else{points-=Math.min(30,Math.ceil(over/500)*5);bad.push('예산 초과')}
  const spiceDiff=Math.abs((state.spice??0)-o.spice);
  if(spiceDiff===0)points+=14;else{points-=spiceDiff*9;bad.push('맵기 차이')}
  points+=Math.round(state.patience/12);
  points=Math.max(0,Math.min(150,Math.round(points)));
  return{points,good,bad};
}
function serve(){
  if(state.phase!=='ready')return;
  const result=evaluate();state.score+=result.points;state.served++;updateReadout();stopPatience();
  const great=result.points>=110, okay=result.points>=80;
  els.resultKicker.textContent=`손님 ${state.served} / ${TOTAL_CUSTOMERS}`;
  els.resultTitle.textContent=great?'아주 만족했어요':okay?'맛있게 먹었어요':'조금 아쉬웠어요';
  els.resultScore.textContent=result.points;
  const goodText=result.good.length?'잘 맞춘 재료: '+result.good.join(', '):'';
  const badText=result.bad.length?' · '+result.bad.join(', '):'';
  els.resultText.textContent=(goodText+badText)||'주문을 잘 맞췄어요.';
  els.nextBtn.textContent=state.served>=TOTAL_CUSTOMERS?'영업 결과 보기':'다음 손님';
  els.resultOverlay.classList.add('show');
  sfx(great?'success.cheer_yay':okay?'shop.purchase':'failure.fail_sting',{volume:.3,cooldownMs:500});
}
function next(){
  if(state.completed){location.reload();return}
  els.resultOverlay.classList.remove('show');
  if(state.served>=TOTAL_CUSTOMERS)return finishDay();
  beginCustomer();
}
function finishDay(){
  state.completed=true;stopPatience();setPhase('idle');
  els.resultKicker.textContent='오늘 영업 끝';
  els.resultTitle.textContent=state.score>=560?'마라탕집 대성공':state.score>=430?'손님들이 또 올 것 같아요':'내일은 더 잘할 수 있어요';
  els.resultScore.textContent=state.score;
  els.resultText.textContent=`손님 ${TOTAL_CUSTOMERS}명의 주문을 모두 마쳤어요.`;
  els.nextBtn.textContent='다시 영업하기';
  els.resultOverlay.classList.add('show');
  sfx('success.victory_fanfare',{volume:.42,cooldownMs:1200});
}
function beginCustomer(){
  state.bowl=[];state.spice=null;state.cookProgress=0;scene.clearBowl();
  const used=state._orderDeck ||= shuffle(ORDERS);
  if(!used.length)state._orderDeck=shuffle(ORDERS);
  const order=state._orderDeck.pop();setOrder(order);updateReadout();setPhase('shopping');startPatience();
}
function startGame(){
  state.score=0;state.served=0;state.completed=false;state._orderDeck=shuffle(ORDERS);
  els.startOverlay.classList.remove('show');updateReadout();beginCustomer();
}

makeLabels();
const scene = new SelfBarScene(els.canvas);
els.startBtn.addEventListener('click',startGame);
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

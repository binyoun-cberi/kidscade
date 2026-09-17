import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const FOOD=new URL('../../assets/game/food/',import.meta.url).href;
const PEOPLE=new URL('../../assets/game/characters/people/',import.meta.url).href;
const SHIFT_SECONDS=120, MAX_ORDERS=4;
const $=s=>document.querySelector(s);
const els={canvas:$('#gameCanvas'),orders:$('#orderStrip'),labels:$('#stationLabels'),time:$('#time'),score:$('#score'),served:$('#served'),held:$('#heldText'),prompt:$('#prompt'),start:$('#startOverlay'),end:$('#endOverlay'),endTitle:$('#endTitle'),endText:$('#endText'),toast:$('#toast'),action:$('#actionBtn'),sound:$('#soundBtn')};

const ITEMS={
 noodle:{name:'라면 면',kind:'proc'}, egg:{name:'계란',model:'egg.glb'}, green:{name:'대파',model:'leek.glb'}, cheese:{name:'치즈',model:'cheese-cut.glb'},
 ricecake:{name:'떡',kind:'ricecake'}, fishcake:{name:'어묵',kind:'fishcake'},
 corndog:{name:'핫도그',model:'corn-dog.glb'}, kimbap:{name:'김밥',model:'maki-vegetable.glb'}, dumpling:{name:'만두',model:'dim-sum.glb'}
};
const RECIPES=[
 {type:'ramen',name:'계란 라면',need:['noodle','egg']},{type:'ramen',name:'파 라면',need:['noodle','green']},{type:'ramen',name:'치즈 계란 라면',need:['noodle','egg','cheese']},
 {type:'tteok',name:'기본 떡볶이',need:['ricecake','fishcake']},{type:'tteok',name:'계란 떡볶이',need:['ricecake','fishcake','egg']},{type:'tteok',name:'치즈 떡볶이',need:['ricecake','fishcake','cheese']},
 {type:'side',name:'핫도그',need:['corndog']},{type:'side',name:'김밥',need:['kimbap']},{type:'side',name:'만두',need:['dumpling']}
];
const STATION_META={
 ramen:{name:'라면 냄비',duration:6.2,grace:5.2,accept:['noodle','egg','green','cheese']},
 tteok:{name:'떡볶이 팬',duration:7.0,grace:5.0,accept:['ricecake','fishcake','egg','cheese']},
 side:{name:'사이드 조리대',duration:4.5,grace:4.5,accept:['corndog','kimbap','dumpling']}
};
const state={running:false,time:SHIFT_SECONDS,score:0,served:0,sound:true,held:null,orders:[],nextId:1,spawn:0,uiClock:0,last:0,keys:{},joy:{x:0,y:0},raf:0};
const stations={
 ramen:{type:'ramen',orderId:null,items:[],phase:'idle',progress:0,readyTime:0},
 tteok:{type:'tteok',orderId:null,items:[],phase:'idle',progress:0,readyTime:0},
 side:{type:'side',orderId:null,items:[],phase:'idle',progress:0,readyTime:0}
};
window.__bunsikKitchenOwnAudio=true;
function sfx(key,opt={}){if(!state.sound)return;try{window.KidscadeAudio?.play?.(key,opt)}catch(_){}}
function toast(t){els.toast.textContent=t;els.toast.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>els.toast.classList.remove('show'),1100)}
function shuffle(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b}
function nameItem(id){return ITEMS[id]?.name||id}
function orderById(id){return state.orders.find(o=>o.id===id)}
function setHeld(v){state.held=v;els.held.textContent=!v?'빈손':v.kind==='dish'?v.name:nameItem(v.id);kitchen.setCarry(v)}
function updateHud(){els.time.textContent=Math.max(0,Math.ceil(state.time));els.score.textContent=state.score;els.served.textContent=state.served}
function makeOrder(){
 const r=RECIPES[Math.floor(Math.random()*RECIPES.length)];
 return{id:state.nextId++,type:r.type,name:r.name,need:[...r.need],patience:100,assigned:false};
}
function spawnOrder(){if(state.orders.length>=MAX_ORDERS||state.time<=0)return;state.orders.push(makeOrder());renderOrders();sfx('collect.coin_drop',{volume:.12,rate:1.1,cooldownMs:120})}
function renderOrders(){
 els.orders.innerHTML='';
 state.orders.forEach(o=>{const d=document.createElement('div');d.className='order-card'+(o.assigned?' assigned':'');d.innerHTML=`<b>${o.name}</b><p>${o.need.map(nameItem).join(' + ')}</p><div class="order-bar"><span style="transform:scaleX(${Math.max(0,o.patience)/100})"></span></div>`;els.orders.appendChild(d)});
}
function stationOrder(type){return state.orders.find(o=>o.type===type&&!o.assigned)||null}
function scoreDish(dish,order){
 let pts=100;const got=[...dish.items],need=[...order.need];
 need.forEach(id=>{const i=got.indexOf(id);if(i>=0)got.splice(i,1);else pts-=28});
 pts-=got.length*18;if(dish.burnt)pts-=45;pts+=Math.round(order.patience/8);
 return Math.max(10,Math.min(140,pts));
}

class Kitchen3D{
 constructor(canvas){
  this.canvas=canvas;this.renderer=new THREE.WebGLRenderer({canvas,antialias:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.shadowMap.enabled=true;
  this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0xe9cfaa);this.camera=new THREE.PerspectiveCamera(40,1,.1,80);this.loader=new GLTFLoader();this.cache=new Map();
  this.player=new THREE.Group();this.scene.add(this.player);this.player.position.set(0,0,2.2);this.playerRadius=.42;this.carryAnchor=new THREE.Group();this.carryAnchor.position.set(0,1.25,.46);this.player.add(this.carryAnchor);
  this.interactables=[];this.labelAnchors=[];this.colliders=[];this.stationGroups={};this.time=0;this.makeLights();this.makeRoom();this.makeWorld();this.loadPlayer();this.resize();addEventListener('resize',()=>this.resize(),{passive:true});
 }
 makeLights(){this.scene.add(new THREE.HemisphereLight(0xfff3dd,0x745039,2.4));const d=new THREE.DirectionalLight(0xffffff,3.1);d.position.set(-5,9,7);d.castShadow=true;d.shadow.mapSize.set(1024,1024);this.scene.add(d)}
 box(w,h,d,color,x,y,z){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.82}));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;this.scene.add(m);return m}
 makeRoom(){this.box(15.8,.3,11.2,0xc79d70,0,-.15,0);this.box(15.8,2.9,.22,0xf1e4ce,0,1.3,-5.5);this.box(.22,2.9,11.2,0xe6d3ba,-7.8,1.3,0);this.box(.22,2.9,11.2,0xe6d3ba,7.8,1.3,0)}
 addCollider(x,z,w,d){this.colliders.push({x,z,w,d})}
 async model(file,size){let src=this.cache.get(file);if(!src){const g=await this.loader.loadAsync(FOOD+file);src=g.scene;this.cache.set(file,src)}const o=src.clone(true);const b=new THREE.Box3().setFromObject(o),s=new THREE.Vector3();b.getSize(s);o.scale.setScalar(size/(Math.max(s.x,s.y,s.z)||1));const b2=new THREE.Box3().setFromObject(o),c=new THREE.Vector3();b2.getCenter(c);o.position.sub(c);o.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true}});return o}
 procItem(id,size=.5){
  const g=new THREE.Group();
  if(id==='noodle'){for(let i=0;i<6;i++){const m=new THREE.Mesh(new THREE.TorusGeometry(.18+i*.012,.025,6,18,Math.PI*1.5),new THREE.MeshStandardMaterial({color:0xf0cf69}));m.rotation.x=Math.PI/2;m.position.y=i*.025;g.add(m)}}
  else if(id==='ricecake'){for(let i=0;i<5;i++){const m=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,.3,10),new THREE.MeshStandardMaterial({color:0xfff4dc}));m.rotation.z=Math.PI/2;m.position.set((i-2)*.09,(i%2)*.06,0);g.add(m)}}
  else if(id==='fishcake'){const m=new THREE.Mesh(new THREE.BoxGeometry(.48,.05,.34),new THREE.MeshStandardMaterial({color:0xe7a85d}));m.rotation.y=.2;g.add(m)}
  g.scale.setScalar(size/.5);g.traverse(n=>{if(n.isMesh)n.castShadow=true});return g
 }
 async itemObject(id,size=.55){const it=ITEMS[id];return it.model?await this.model(it.model,size):this.procItem(id,size)}
 addInteract(id,type,name,x,z,extra={}){
  const a=new THREE.Object3D();a.position.set(x,.7,z);this.scene.add(a);const it={id,type,name,x,z,anchor:a,...extra};this.interactables.push(it);this.labelAnchors.push(it);return it
 }
 makeWorld(){
  // ingredient wall: each tray is independently reachable
  const sources=[
   ['noodle','면',-6.65,-3.8],['ricecake','떡',-6.65,-2.85],['fishcake','어묵',-6.65,-1.9],
   ['egg','계란',-6.65,-.65],['cheese','치즈',-6.65,.3],['green','대파',-6.65,1.25],
   ['corndog','핫도그',-6.65,2.45],['kimbap','김밥',-6.65,3.4],['dumpling','만두',-6.65,4.35]
  ];
  sources.forEach(([id,name,x,z])=>{this.box(1.35,.75,.75,0x7b5940,x,.22,z);this.addInteract('src-'+id,'source',name,x+.75,z,{item:id});this.itemObject(id,.48).then(o=>{o.position.set(x,.82,z);this.scene.add(o)})});
  this.addCollider(-6.65,.25,1.45,9.7);

  // fridge visual
  this.box(1.15,2.15,1.0,0xdde8e8,-7.0,1.0,.3);

  const defs=[
   ['ramen','라면 냄비',5.8,-2.75,'pot-stew.glb',0xc96e50],
   ['tteok','떡볶이 팬',5.8,0,'frying-pan.glb',0xb74d43],
   ['side','사이드 조리대',5.8,2.75,'plate-deep.glb',0xd3a85e]
  ];
  defs.forEach(([type,name,x,z,file,color])=>{
   this.box(2.0,.9,1.5,color,x,.3,z);this.addCollider(x,z,2.05,1.55);this.addInteract('station-'+type,'station',name,x-1.25,z,{station:type});
   const g=new THREE.Group();g.position.set(x,.95,z);this.scene.add(g);this.stationGroups[type]=g;this.model(file,1.05).then(o=>g.add(o));
  });
  // serving counter and bin
  this.box(3.3,.9,1.0,0x5d8b68,0,.3,-4.85);this.addCollider(0,-4.85,3.35,1.05);this.addInteract('serve','serve','서빙대',0,-4.05);
  this.box(1.0,.8,1.0,0x5c6764,6.4,.25,4.35);this.addCollider(6.4,4.35,1.05,1.05);this.addInteract('trash','trash','쓰레기통',5.75,4.35);
 }
 async loadPlayer(){
  try{const g=await this.loader.loadAsync(PEOPLE+'character-female-a.glb');const o=g.scene;const b=new THREE.Box3().setFromObject(o),s=new THREE.Vector3();b.getSize(s);o.scale.setScalar(1.65/(s.y||1));const b2=new THREE.Box3().setFromObject(o),c=new THREE.Vector3();b2.getCenter(c);o.position.set(-c.x,-b2.min.y,-c.z);o.traverse(n=>{if(n.isMesh)n.castShadow=true});this.player.add(o)}catch(_){this.boxPlayer()}
 }
 boxPlayer(){const g=new THREE.Group();const body=new THREE.Mesh(new THREE.CylinderGeometry(.28,.34,.85,10),new THREE.MeshStandardMaterial({color:0xf0a267}));body.position.y=.65;const head=new THREE.Mesh(new THREE.SphereGeometry(.25,12,8),new THREE.MeshStandardMaterial({color:0xf4c7a1}));head.position.y=1.25;g.add(body,head);this.player.add(g)}
 setCarry(v){while(this.carryAnchor.children.length)this.carryAnchor.remove(this.carryAnchor.children[0]);if(!v)return;const id=v.kind==='dish'?(v.type==='ramen'?'noodle':v.type==='tteok'?'ricecake':v.items[0]):v.id;this.itemObject(id,.38).then(o=>{o.rotation.x=-.25;this.carryAnchor.add(o)})}
 canMove(x,z){if(x<-7.15||x>7.15||z<-5.0||z>5.0)return false;return !this.colliders.some(r=>Math.abs(x-r.x)<r.w/2+this.playerRadius&&Math.abs(z-r.z)<r.d/2+this.playerRadius)}
 move(dx,dz,dt){const len=Math.hypot(dx,dz);if(len<.05)return false;dx/=len;dz/=len;const speed=3.45, nx=this.player.position.x+dx*speed*dt,nz=this.player.position.z+dz*speed*dt;if(this.canMove(nx,this.player.position.z))this.player.position.x=nx;if(this.canMove(this.player.position.x,nz))this.player.position.z=nz;this.player.rotation.y=Math.atan2(dx,dz);return true}
 nearest(){let best=null,dist=1.55;for(const it of this.interactables){const d=Math.hypot(this.player.position.x-it.x,this.player.position.z-it.z);if(d<dist){dist=d;best=it}}return best}
 setStationLook(type,phase,ratio=0){const g=this.stationGroups[type];if(!g)return;g.rotation.y+=phase==='cooking'?.01:0;g.scale.setScalar(phase==='ready'?1.05:1);g.position.y=phase==='burnt'?.08*Math.sin(this.time*8):0}
 worldToScreen(obj){const r=this.canvas.getBoundingClientRect(),p=new THREE.Vector3();obj.getWorldPosition(p);p.project(this.camera);return{x:(p.x+1)*.5*r.width,y:(-p.y+1)*.5*r.height,visible:p.z<1}}
 resize(){const w=this.canvas.clientWidth||innerWidth,h=this.canvas.clientHeight||innerHeight;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.fov=w<650?56:42;this.camera.position.set(0,w<650?14.5:12.8,w<650?13.5:11.5);this.camera.lookAt(0,0,0);this.camera.updateProjectionMatrix()}
 render(){this.time+=.016;for(const [k,s] of Object.entries(stations))this.setStationLook(k,s.phase,s.progress);this.renderer.render(this.scene,this.camera)}
}

const kitchen=new Kitchen3D(els.canvas);
function createLabels(){els.labels.innerHTML='';kitchen.labelAnchors.forEach(it=>{const d=document.createElement('div');d.className='world-label';d.dataset.id=it.id;d.textContent=it.name;els.labels.appendChild(d)})}
setTimeout(createLabels,0);
function updateLabels(){kitchen.labelAnchors.forEach(it=>{const d=els.labels.querySelector(`[data-id="${it.id}"]`);if(!d)return;const p=kitchen.worldToScreen(it.anchor);d.style.left=p.x+'px';d.style.top=p.y+'px';d.style.opacity=p.visible?'1':'0';if(it.type==='station'){const s=stations[it.station];d.classList.toggle('hot',s.phase==='ready'||s.phase==='burnt');d.textContent=STATION_META[it.station].name+(s.phase==='cooking'?' · 조리중':s.phase==='ready'?' · 완성!':s.phase==='burnt'?' · 탔어요':'')}})}

function promptFor(it){
 if(!it)return'주방을 돌아다니며 주문을 처리하세요';
 if(it.type==='source')return state.held?'손이 가득 찼어요':`E · ${nameItem(it.item)} 집기`;
 if(it.type==='trash')return state.held?'E · 들고 있는 것 버리기':'쓰레기통';
 if(it.type==='serve')return state.held?.kind==='dish'?'E · 음식 서빙':'완성된 음식을 가져오세요';
 const s=stations[it.station],meta=STATION_META[it.station];
 if(state.held&&state.held.kind==='item')return meta.accept.includes(state.held.id)?`E · ${nameItem(state.held.id)} 넣기`:'이 재료는 여기서 쓰지 않아요';
 if(state.held)return'손에 든 음식을 먼저 처리하세요';
 if(s.phase==='prep')return s.items.length?'E · 조리 시작':'재료를 가져오세요';
 if(s.phase==='cooking')return `${meta.name} 조리 중 ${Math.round(s.progress*100)}%`;
 if(s.phase==='ready')return'E · 완성 음식 들기';
 if(s.phase==='burnt')return'E · 탄 음식 들기';
 return `${meta.name} · 재료를 가져오세요`;
}
function assignOrder(type){const o=stationOrder(type);if(!o)return null;o.assigned=true;renderOrders();return o}
function stationInteract(type){
 const s=stations[type],meta=STATION_META[type];
 if(state.held?.kind==='item'){
  if(!meta.accept.includes(state.held.id))return toast('이 조리대 재료가 아니에요');
  if(s.phase==='idle'){const o=assignOrder(type);if(!o)return toast('이 조리대 주문이 아직 없어요');s.orderId=o.id;s.phase='prep';s.items=[]}
  if(s.phase!=='prep')return toast('지금은 재료를 넣을 수 없어요');
  s.items.push(state.held.id);toast(nameItem(state.held.id)+' 넣기');setHeld(null);sfx('collect.coin_drop',{volume:.18,cooldownMs:80});return;
 }
 if(state.held)return;
 if(s.phase==='prep'){if(!s.items.length)return; s.phase='cooking';s.progress=0;s.readyTime=0;sfx('combat.impact_heavy',{volume:.13,rate:1.35,cooldownMs:150});toast(meta.name+' 조리 시작');return}
 if(s.phase==='ready'||s.phase==='burnt'){
  const o=orderById(s.orderId);if(!o){resetStation(type);return}
  setHeld({kind:'dish',type,name:o.name,orderId:o.id,items:[...s.items],burnt:s.phase==='burnt'});resetStation(type);sfx('collect.coin_pickup',{volume:.19,cooldownMs:80});return
 }
}
function resetStation(type){const s=stations[type];s.orderId=null;s.items=[];s.phase='idle';s.progress=0;s.readyTime=0}
function interact(){
 if(!state.running)return;const it=kitchen.nearest();if(!it)return;
 if(it.type==='source'){if(state.held)return toast('한 번에 하나만 들 수 있어요');setHeld({kind:'item',id:it.item});sfx('collect.coin_pickup',{volume:.17,cooldownMs:70});return}
 if(it.type==='trash'){if(!state.held)return;setHeld(null);sfx('collect.coin_drop',{volume:.14,rate:.8,cooldownMs:100});toast('버렸어요');return}
 if(it.type==='station')return stationInteract(it.station);
 if(it.type==='serve'){
  if(state.held?.kind!=='dish')return toast('완성된 음식을 가져오세요');
  const dish=state.held,o=orderById(dish.orderId);if(!o){setHeld(null);return}
  const pts=scoreDish(dish,o);state.score+=pts;state.served++;state.orders=state.orders.filter(x=>x.id!==o.id);setHeld(null);updateHud();renderOrders();
  sfx(pts>=95?'shop.purchase':'failure.fail_sting',{volume:.28,cooldownMs:350});toast(`${o.name} 서빙 +${pts}점`);return
 }
}
function updateStations(dt){
 for(const [type,s] of Object.entries(stations)){
  const meta=STATION_META[type];
  if(s.phase==='cooking'){s.progress+=dt/meta.duration;if(s.progress>=1){s.progress=1;s.phase='ready';s.readyTime=0;sfx('success.cheer_yay',{volume:.2,cooldownMs:350});toast(meta.name+' 완성!')}}
  else if(s.phase==='ready'){s.readyTime+=dt;if(s.readyTime>=meta.grace){s.phase='burnt';sfx('failure.fail_sting',{volume:.18,cooldownMs:400});toast(meta.name+' 음식이 탔어요')}}
 }
}
function updateOrders(dt){let changed=false;for(const o of state.orders){o.patience-=dt*1.25;if(o.patience<=0){o.patience=0;const station=Object.values(stations).find(s=>s.orderId===o.id);if(station){station.orderId=null;station.items=[];station.phase='idle';station.progress=0}changed=true;sfx('failure.fail_sting',{volume:.14,cooldownMs:350})}}if(changed){state.orders=state.orders.filter(o=>o.patience>0);renderOrders()}}
function endShift(){state.running=false;cancelAnimationFrame(state.raf);const title=state.score>=750?'분식집 에이스':state.score>=500?'바쁜 주방 해결사':'다음 영업은 더 빨라질 거예요';els.endTitle.textContent=title;els.endText.textContent=`총 ${state.served}개 주문을 서빙하고 ${state.score}점을 얻었어요.`;$('#endOverlay').classList.add('show');sfx('success.victory_fanfare',{volume:.38,cooldownMs:1000})}
function loop(ts){if(!state.running)return;const dt=Math.min(.05,(ts-state.last)/1000||0);state.last=ts;state.time-=dt;state.spawn+=dt;state.uiClock+=dt;if(state.spawn>12&&state.orders.length<MAX_ORDERS){state.spawn=0;spawnOrder()}updateOrders(dt);updateStations(dt);if(state.uiClock>=.18){state.uiClock=0;renderOrders()}
 const dx=(state.keys.KeyD?1:0)-(state.keys.KeyA?1:0)+state.joy.x,dz=(state.keys.KeyS?1:0)-(state.keys.KeyW?1:0)+state.joy.y;kitchen.move(dx,dz,dt);kitchen.render();updateLabels();els.prompt.textContent=promptFor(kitchen.nearest());els.action.textContent=kitchen.nearest()?'행동':'…';updateHud();if(state.time<=0)return endShift();state.raf=requestAnimationFrame(loop)}
function startGame(){state.running=true;state.time=SHIFT_SECONDS;state.score=0;state.served=0;state.orders=[];state.spawn=0;state.uiClock=0;state.last=performance.now();setHeld(null);Object.keys(stations).forEach(resetStation);els.start.classList.remove('show');spawnOrder();spawnOrder();updateHud();state.raf=requestAnimationFrame(loop)}

addEventListener('keydown',e=>{state.keys[e.code]=true;if(e.code==='KeyE'){e.preventDefault();interact()}});
addEventListener('keyup',e=>{state.keys[e.code]=false});
els.action.addEventListener('pointerdown',e=>{e.preventDefault();interact()});
$('#startBtn').addEventListener('click',startGame);$('#restartBtn').addEventListener('click',()=>location.reload());
els.sound.addEventListener('click',()=>{state.sound=!state.sound;els.sound.textContent=state.sound?'SOUND ON':'SOUND OFF'});

const joy=$('#joystick'),knob=$('#stickKnob');let joyPointer=null;
function joyMove(e){const r=joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=e.clientX-cx,dy=e.clientY-cy,max=r.width*.32,len=Math.hypot(dx,dy)||1,k=Math.min(1,max/len),x=dx*k,y=dy*k;knob.style.transform=`translate(${x}px,${y}px)`;state.joy.x=x/max;state.joy.y=y/max}
joy.addEventListener('pointerdown',e=>{joyPointer=e.pointerId;joy.setPointerCapture?.(e.pointerId);joyMove(e)});
joy.addEventListener('pointermove',e=>{if(e.pointerId===joyPointer)joyMove(e)});
function joyEnd(e){if(e.pointerId!==joyPointer)return;joyPointer=null;state.joy.x=state.joy.y=0;knob.style.transform='translate(0,0)'}
joy.addEventListener('pointerup',joyEnd);joy.addEventListener('pointercancel',joyEnd);
updateHud();kitchen.render();updateLabels();

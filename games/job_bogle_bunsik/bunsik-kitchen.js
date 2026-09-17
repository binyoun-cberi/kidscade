import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const FOOD=new URL('../../assets/game/food/',import.meta.url).href;
const PEOPLE=new URL('../../assets/game/characters/people/',import.meta.url).href;
const SHIFT_SECONDS=120, MAX_ORDERS=4;
const $=s=>document.querySelector(s);
const hashText=s=>{let h=2166136261;for(const ch of String(s||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
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
  this.canvas=canvas;this.renderer=new THREE.WebGLRenderer({canvas,antialias:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.08;
  this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0xd8c09c);this.scene.fog=new THREE.Fog(0xd8c09c,19,31);this.camera=new THREE.PerspectiveCamera(42,1,.1,80);this.loader=new GLTFLoader();this.cache=new Map();
  this.player=new THREE.Group();this.scene.add(this.player);this.player.position.set(0,0,2.0);this.playerRadius=.42;this.playerVisual=new THREE.Group();this.player.add(this.playerVisual);this.carryAnchor=new THREE.Group();this.carryAnchor.position.set(0,1.32,.5);this.player.add(this.carryAnchor);
  this.playerMixer=null;this.playerClips=[];this.playerAction=null;this.playerMoving=false;this.hasWalkClip=false;
  this.playerRing=new THREE.Mesh(new THREE.RingGeometry(.38,.52,32),new THREE.MeshBasicMaterial({color:0xfff0a8,transparent:true,opacity:.92,depthWrite:false}));this.playerRing.rotation.x=-Math.PI/2;this.playerRing.position.y=.018;this.scene.add(this.playerRing);
  this.focusRing=new THREE.Mesh(new THREE.RingGeometry(.52,.69,36),new THREE.MeshBasicMaterial({color:0x7fe8ff,transparent:true,opacity:.86,depthWrite:false}));this.focusRing.rotation.x=-Math.PI/2;this.focusRing.position.y=.025;this.focusRing.visible=false;this.scene.add(this.focusRing);
  this.interactables=[];this.labelAnchors=[];this.colliders=[];this.stationGroups={};this.stationLights={};this.time=0;this.makeLights();this.makeRoom();this.makeWorld();this.loadPlayer();this.resize();addEventListener('resize',()=>this.resize(),{passive:true});
 }
 makeLights(){
  this.scene.add(new THREE.HemisphereLight(0xfff0d8,0x5e4436,2.15));
  const d=new THREE.DirectionalLight(0xfff7e7,3.35);d.position.set(-5,9,7);d.castShadow=true;d.shadow.mapSize.set(2048,2048);d.shadow.camera.left=-9;d.shadow.camera.right=9;d.shadow.camera.top=7;d.shadow.camera.bottom=-7;this.scene.add(d);
  const warm=new THREE.PointLight(0xffc46b,12,10,2);warm.position.set(0,4.2,-3.5);this.scene.add(warm);
  const prep=new THREE.PointLight(0xa9ddff,9,8,2);prep.position.set(-5.6,3,0);this.scene.add(prep);
 }
 box(w,h,d,color,x,y,z,rough=.78){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:rough}));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;this.scene.add(m);return m}
 makeRoom(){
  this.box(15.8,.28,11.2,0xb97f55,0,-.16,0);
  const grid=new THREE.GridHelper(15.4,22,0x8e6248,0xd9b78f);grid.position.y=.006;grid.scale.z=.72;grid.material.transparent=true;grid.material.opacity=.38;this.scene.add(grid);
  this.box(15.8,3.05,.22,0xf5ead7,0,1.38,-5.5);this.box(.22,3.05,11.2,0xe8d7bf,-7.8,1.38,0);this.box(.22,3.05,11.2,0xe8d7bf,7.8,1.38,0);
  this.box(15.2,.72,.08,0x315b5c,0,.55,-5.34,.62);
  this.box(5.1,1.15,.09,0x26343a,0,1.92,-5.22,.7);
  this.box(4.65,.06,.09,0xf0d275,0,2.26,-5.14,.4);
  for(const x of [-5.2,0,5.2]){const lamp=new THREE.PointLight(0xffd38a,6,6,2);lamp.position.set(x,3.15,-.8);this.scene.add(lamp);const shade=new THREE.Mesh(new THREE.CylinderGeometry(.18,.34,.24,16),new THREE.MeshStandardMaterial({color:0x343a3c,roughness:.55}));shade.position.set(x,2.95,-.8);this.scene.add(shade)}
  this.box(2.4,.035,7.8,0x875b42,0,.012,.25,.9);
  this.box(1.75,.04,7.5,0xd3b37b,-4.95,.015,.25,.9);
  this.box(1.75,.04,7.5,0xd98663,4.95,.015,.25,.9);
 }
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
  const sources=[
   ['noodle','면',-6.45,-3.8],['ricecake','떡',-6.45,-2.85],['fishcake','어묵',-6.45,-1.9],
   ['egg','계란',-6.45,-.65],['cheese','치즈',-6.45,.3],['green','대파',-6.45,1.25],
   ['corndog','핫도그',-6.45,2.45],['kimbap','김밥',-6.45,3.4],['dumpling','만두',-6.45,4.35]
  ];
  this.box(1.65,.18,9.65,0x2f3437,-6.45,.63,.25,.48);
  sources.forEach(([id,name,x,z],i)=>{
    const base=i<3?0x80573f:i<6?0x52716b:0x8c6246;
    this.box(1.42,.66,.78,base,x,.24,z);this.box(1.46,.07,.82,0xe8d0a8,x,.61,z,.6);
    this.addInteract('src-'+id,'source',name,x+.82,z,{item:id});
    this.itemObject(id,.5).then(o=>{o.position.set(x,.88,z);o.rotation.y=(i%3-1)*.18;this.scene.add(o)});
  });
  this.addCollider(-6.45,.25,1.62,9.75);
  this.box(1.34,2.18,1.08,0xd7e5e3,-6.55,1.04,.35,.45);this.box(.78,.04,.035,0x51666a,-6.09,1.12,.91,.35);this.box(.08,.5,.05,0x697a7c,-6.0,1.05,.93,.3);

  const defs=[
   ['ramen','라면 냄비',5.6,-2.75,'pot-stew.glb',0xe06c50,0xffb26f],
   ['tteok','떡볶이 팬',5.6,0,'frying-pan.glb',0xd74e43,0xff7d6c],
   ['side','사이드 조리대',5.6,2.75,'plate-deep.glb',0xe0aa4e,0xffdf84]
  ];
  defs.forEach(([type,name,x,z,file,color,lightColor])=>{
   this.box(2.22,.82,1.64,0x3b4142,x,.31,z,.58);this.box(2.16,.22,1.58,color,x,.78,z,.62);this.box(2.0,.06,1.42,0xf4dfbd,x,.93,z,.5);
   this.addCollider(x,z,2.25,1.65);this.addInteract('station-'+type,'station',name,x-1.37,z,{station:type});
   const g=new THREE.Group();g.position.set(x,1.15,z);this.scene.add(g);this.stationGroups[type]=g;this.model(file,1.08).then(o=>g.add(o));
   const lamp=new THREE.PointLight(lightColor,5.2,4.3,2);lamp.position.set(x,2.2,z);this.scene.add(lamp);this.stationLights[type]=lamp;
  });

  this.box(3.8,.84,1.12,0x365f57,0,.3,-4.72,.58);this.box(3.86,.12,1.18,0xe7c78e,0,.78,-4.72,.55);this.addCollider(0,-4.72,3.9,1.2);this.addInteract('serve','serve','서빙대',0,-3.95);
  for(const x of [-1.15,0,1.15])this.box(.72,.05,.62,0xf8eee0,x,.87,-4.62,.45);
  this.box(1.05,.82,1.05,0x4f5e59,6.35,.27,4.18,.72);this.box(1.08,.09,1.08,0x2e3734,6.35,.72,4.18,.5);this.addCollider(6.35,4.18,1.1,1.1);this.addInteract('trash','trash','쓰레기통',5.68,4.18);
 }
 async loadPlayer(){
  try{
   const g=await this.loader.loadAsync(PEOPLE+'character-female-a.glb'),o=g.scene;
   const palette=[0xc94f45,0x263844,0xf0c9a7,0xf6ead8,0x6f8f7a];
   o.traverse((n,i)=>{if(!n.isMesh)return;const mats=Array.isArray(n.material)?n.material:[n.material];const recolored=mats.map((m,j)=>{const q=m.clone();if(q.color)q.color.setHex(palette[hashText((n.name||'worker')+i+'-'+j)%palette.length]);if('roughness'in q)q.roughness=Math.max(.48,q.roughness??.65);n.castShadow=true;n.receiveShadow=true;return q});n.material=Array.isArray(n.material)?recolored:recolored[0]});
   const b=new THREE.Box3().setFromObject(o),s=new THREE.Vector3();b.getSize(s);o.scale.setScalar(1.78/(s.y||1));const b2=new THREE.Box3().setFromObject(o),center=new THREE.Vector3();b2.getCenter(center);o.position.set(-center.x,-b2.min.y,-center.z);
   this.playerVisual.add(o);this.playerClips=g.animations||[];this.playerMixer=this.playerClips.length?new THREE.AnimationMixer(o):null;this.hasWalkClip=this.playerClips.some(clip=>/walk|run/i.test(clip.name));this.playPlayerAnim('idle');
  }catch(err){console.warn('[bunsik] player asset fallback',err);this.boxPlayer()}
 }
 playPlayerAnim(kind){
  if(!this.playerMixer||!this.playerClips.length)return false;
  const pattern=kind==='walk'?/walk|run/i:/idle|stand/i;
  const clip=this.playerClips.find(x=>pattern.test(x.name))||(kind==='idle'?this.playerClips[0]:null);
  if(!clip)return false;if(this.playerAction?.getClip()===clip)return true;
  this.playerAction?.fadeOut(.1);const action=this.playerMixer.clipAction(clip);action.reset().enabled=true;action.setEffectiveWeight(1);action.fadeIn(.1);action.setLoop(THREE.LoopRepeat,Infinity);action.play();this.playerAction=action;return true
 }
 setPlayerMoving(moving){if(this.playerMoving===moving)return;this.playerMoving=moving;this.playPlayerAnim(moving?'walk':'idle')}
 boxPlayer(){const g=new THREE.Group();const body=new THREE.Mesh(new THREE.CylinderGeometry(.28,.34,.85,10),new THREE.MeshStandardMaterial({color:0xc94f45}));body.position.y=.65;const apron=new THREE.Mesh(new THREE.BoxGeometry(.48,.52,.12),new THREE.MeshStandardMaterial({color:0xf5ead8}));apron.position.set(0,.67,.29);const head=new THREE.Mesh(new THREE.SphereGeometry(.25,12,8),new THREE.MeshStandardMaterial({color:0xf0c9a7}));head.position.y=1.25;g.add(body,apron,head);this.playerVisual.add(g)}
 setCarry(v){while(this.carryAnchor.children.length)this.carryAnchor.remove(this.carryAnchor.children[0]);if(!v)return;const id=v.kind==='dish'?(v.type==='ramen'?'noodle':v.type==='tteok'?'ricecake':v.items[0]):v.id;this.itemObject(id,.38).then(o=>{o.rotation.x=-.25;this.carryAnchor.add(o)})}
 canMove(x,z){if(x<-7.0||x>7.0||z<-4.95||z>4.95)return false;return !this.colliders.some(r=>Math.abs(x-r.x)<r.w/2+this.playerRadius&&Math.abs(z-r.z)<r.d/2+this.playerRadius)}
 move(dx,dz,dt){const len=Math.hypot(dx,dz);if(len<.05){this.setPlayerMoving(false);return false}this.setPlayerMoving(true);dx/=len;dz/=len;const speed=3.55,nx=this.player.position.x+dx*speed*dt,nz=this.player.position.z+dz*speed*dt;if(this.canMove(nx,this.player.position.z))this.player.position.x=nx;if(this.canMove(this.player.position.x,nz))this.player.position.z=nz;this.player.rotation.y=Math.atan2(dx,dz);return true}
 nearest(){let best=null,dist=1.55;for(const it of this.interactables){const d=Math.hypot(this.player.position.x-it.x,this.player.position.z-it.z);if(d<dist){dist=d;best=it}}return best}
 setStationLook(type,phase,ratio=0){const g=this.stationGroups[type];if(!g)return;g.rotation.y+=phase==='cooking'?.01:0;g.scale.setScalar(phase==='ready'?1.08:1);g.position.y=phase==='burnt'?.08*Math.sin(this.time*8):0;const lamp=this.stationLights[type];if(lamp){lamp.intensity=phase==='ready'?11:phase==='burnt'?8:phase==='cooking'?7:4.8;lamp.color.setHex(phase==='burnt'?0xff3c38:phase==='ready'?0x7dff9c:0xffc06a)}}
 worldToScreen(obj){const r=this.canvas.getBoundingClientRect(),p=new THREE.Vector3();obj.getWorldPosition(p);p.project(this.camera);return{x:(p.x+1)*.5*r.width,y:(-p.y+1)*.5*r.height,visible:p.z<1}}
 setFocus(it){if(!it){this.focusRing.visible=false;return}this.focusRing.visible=true;this.focusRing.position.set(it.x,.03,it.z);this.focusRing.material.color.setHex(it.type==='station'?0xffd166:it.type==='serve'?0x7dff9c:0x7fe8ff)}
 resize(){const w=this.canvas.clientWidth||innerWidth,h=this.canvas.clientHeight||innerHeight;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.fov=w<650?56:44;this.camera.position.set(0,w<650?13.0:10.9,w<650?12.1:10.4);this.camera.lookAt(0,.3,-.15);this.camera.updateProjectionMatrix()}
 render(dt=.016){this.time+=dt;this.playerMixer?.update(dt);if(!this.playerMixer||!this.hasWalkClip){this.playerVisual.position.y=this.playerMoving?Math.abs(Math.sin(this.time*10))*.055:Math.sin(this.time*2.2)*.008;this.playerVisual.rotation.z=this.playerMoving?Math.sin(this.time*10)*.025:0}else{this.playerVisual.position.y=0;this.playerVisual.rotation.z=0}this.playerRing.position.x=this.player.position.x;this.playerRing.position.z=this.player.position.z;this.playerRing.material.opacity=.72+.2*Math.sin(this.time*5);for(const [k,s] of Object.entries(stations))this.setStationLook(k,s.phase,s.progress);this.renderer.render(this.scene,this.camera)}
}

const kitchen=new Kitchen3D(els.canvas);
function createLabels(){els.labels.innerHTML='';kitchen.labelAnchors.forEach(it=>{const d=document.createElement('div');d.className='world-label '+it.type;d.dataset.id=it.id;d.textContent=it.name;els.labels.appendChild(d)})}
setTimeout(createLabels,0);
function updateLabels(focus=null){kitchen.labelAnchors.forEach(it=>{const d=els.labels.querySelector(`[data-id="${it.id}"]`);if(!d)return;const p=kitchen.worldToScreen(it.anchor);d.style.left=p.x+'px';d.style.top=p.y+'px';d.style.opacity=p.visible?'1':'0';d.classList.toggle('near',focus?.id===it.id);if(it.type==='station'){const s=stations[it.station];d.classList.toggle('hot',s.phase==='ready'||s.phase==='burnt');d.textContent=STATION_META[it.station].name+(s.phase==='cooking'?` · ${Math.round(s.progress*100)}%`:s.phase==='ready'?' · 완성!':s.phase==='burnt'?' · 탔어요':'')}})}

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
 const dx=(state.keys.KeyD?1:0)-(state.keys.KeyA?1:0)+state.joy.x,dz=(state.keys.KeyS?1:0)-(state.keys.KeyW?1:0)+state.joy.y;kitchen.move(dx,dz,dt);const focus=kitchen.nearest();kitchen.setFocus(focus);kitchen.render(dt);updateLabels(focus);els.prompt.textContent=promptFor(focus);els.action.textContent=focus?'행동':'…';updateHud();if(state.time<=0)return endShift();state.raf=requestAnimationFrame(loop)}
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

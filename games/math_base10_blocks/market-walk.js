import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const $=s=>document.querySelector(s);
const fmt=n=>Math.round(n).toLocaleString('ko-KR')+'원';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const shuffle=a=>[...a].sort(()=>Math.random()-.5);
const sum=a=>a.reduce((x,y)=>x+y,0);
const ROOT='../../assets/game/';
const FOOD=ROOT+'food/';
const MARKET=ROOT+'shops/market/';
const PEOPLE=ROOT+'characters/people/';

const ZONES={
 produce:{name:'과일 · 채소',color:'#69a65c'},
 bakery:{name:'빵 · 간식',color:'#d18a52'},
 pantry:{name:'식품 · 과자',color:'#6c8db0'},
 chilled:{name:'냉장 · 냉동',color:'#69a8b0'},
 drinks:{name:'음료',color:'#b66f72'}
};
const PRODUCTS=[
 {id:'apple',name:'사과',price:1200,model:'apple.glb',zone:'produce',pos:[-7.5,-6.8],pal:[0xc94f48,0x77a34b]},
 {id:'banana',name:'바나나',price:1800,model:'banana.glb',zone:'produce',pos:[-5.8,-6.8],pal:[0xf0c945,0x78a052]},
 {id:'carrot',name:'당근',price:900,model:'carrot.glb',zone:'produce',pos:[-7.5,-4.9],pal:[0xe47735,0x579553]},
 {id:'broccoli',name:'브로콜리',price:1600,model:'broccoli.glb',zone:'produce',pos:[-5.8,-4.9],pal:[0x3f7c47,0x78a953]},
 {id:'grapes',name:'포도',price:4500,model:'grapes.glb',zone:'produce',pos:[-7.5,-3.0],pal:[0x69528d,0x8d67a3]},
 {id:'corn',name:'옥수수',price:2200,model:'corn.glb',zone:'produce',pos:[-5.8,-3.0],pal:[0xf0c746,0x5f914c]},
 {id:'bread',name:'식빵',price:2300,model:'bread.glb',zone:'bakery',pos:[6.2,-6.8],pal:[0xc98748,0xe0b979]},
 {id:'donut',name:'도넛',price:1400,model:'donut.glb',zone:'bakery',pos:[7.9,-6.8],pal:[0xd88999,0x8f513d]},
 {id:'muffin',name:'머핀',price:2100,model:'muffin.glb',zone:'bakery',pos:[6.2,-4.9],pal:[0xb87748,0xe5bc7a]},
 {id:'cupcake',name:'컵케이크',price:2400,model:'cupcake.glb',zone:'bakery',pos:[7.9,-4.9],pal:[0xd98b9d,0x8c5a48]},
 {id:'chocolate',name:'초콜릿',price:1700,model:'chocolate.glb',zone:'pantry',pos:[-2.8,-4.1],pal:[0x6f3d2c,0x9a6046]},
 {id:'cookie',name:'쿠키',price:1500,model:'cookie.glb',zone:'pantry',pos:[-2.8,-.8],pal:[0xc98b4b,0x8a5735]},
 {id:'sandwich',name:'샌드위치',price:3500,model:'sandwich.glb',zone:'pantry',pos:[0,-4.1],pal:[0xe0b978,0x5f9a59]},
 {id:'pizza',name:'피자',price:6900,model:'pizza.glb',zone:'chilled',pos:[2.8,-4.1],pal:[0xe0a657,0xd45144]},
 {id:'cheese',name:'치즈',price:3200,model:'cheese.glb',zone:'chilled',pos:[2.8,-.8],pal:[0xf0c64c,0xe3a83d]},
 {id:'sodaCan',name:'탄산음료 캔',price:1100,model:'soda-can.glb',zone:'drinks',pos:[-2.8,2.5],pal:[0x4379b8,0xe74f4f]},
 {id:'sodaBottle',name:'탄산음료',price:1900,model:'soda-bottle.glb',zone:'drinks',pos:[0,2.5],pal:[0x4e8bb6,0xd95d55]},
 {id:'carton',name:'우유',price:2600,model:'carton.glb',zone:'chilled',pos:[2.8,2.5],pal:[0xece7d8,0x6694ad]}
];
const CFG={
 easy:{count:3,labelRange:8.5,beacon:true,budgetPad:[3000,5000],name:'천천히'},
 normal:{count:5,labelRange:4.8,beacon:false,budgetPad:[4000,7000],name:'동네 장보기'},
 challenge:{count:6,labelRange:2.8,beacon:false,budgetPad:[3000,6000],name:'장보기 달인'}
};
const PLAYER_MODELS=['character-female-a.glb','character-male-a.glb','character-female-b.glb','character-male-b.glb'];

const ui={
 progress:$('#progressStat'),budget:$('#budgetStat'),basket:$('#basketStat'),list:$('#shoppingList'),missionSub:$('#missionSub'),zoneHint:$('#zoneHint'),modeBadge:$('#modeBadge'),phase:$('#phaseChip'),labels:$('#productLabels'),toast:$('#toast'),sound:$('#soundBtn'),
 interactDock:$('#interactDock'),interactIcon:$('#interactIcon'),interactTitle:$('#interactTitle'),interactSub:$('#interactSub'),interactBtn:$('#interactBtn'),touchInteract:$('#touchInteract'),
 checkout:$('#checkoutPanel'),checkoutGuide:$('#checkoutGuide'),scanStat:$('#scanStat'),checkoutTotal:$('#checkoutTotal'),checkoutPaid:$('#checkoutPaid'),checkoutChange:$('#checkoutChange'),scanItems:$('#scanItems'),cashOptions:$('#cashOptions'),changeOptions:$('#changeOptions'),changeEquation:$('#changeEquation'),paySection:$('#paySection'),changeSection:$('#changeSection'),closeCheckout:$('#closeCheckout'),backToShopping:$('#backToShopping'),finishCheckout:$('#finishCheckout'),
 start:$('#startModal'),loadFill:$('#loadFill'),loadText:$('#loadText'),result:$('#resultModal'),resultTitle:$('#resultTitle'),resultText:$('#resultText'),resultItems:$('#resultItems'),resultSpent:$('#resultSpent'),resultRemain:$('#resultRemain'),modeBtn:$('#modeBtn'),replay:$('#replayBtn'),
 joystick:$('#joystick'),stick:$('#stick')
};

let audioCtx;
let state={phase:'loading',mode:'normal',running:false,sound:true,list:[],basket:[],budget:0,mistakes:0,checkoutMistakes:0,scanned:new Set(),paid:0,changeAnswer:null};
try{state.sound=JSON.parse(localStorage.getItem('mart-walk-sound')??'true')!==false}catch(_){}
ui.sound.textContent=state.sound?'🔊':'🔇';

function tone(type){
 if(!state.sound)return;
 try{
  audioCtx=audioCtx||new(window.AudioContext||window.webkitAudioContext)();audioCtx.resume();
  const o=audioCtx.createOscillator(),g=audioCtx.createGain(),t=audioCtx.currentTime;
  const f={pick:520,scan:920,cash:430,good:690,bad:165,start:335}[type]||300;
  o.type=type==='scan'?'square':type==='bad'?'sawtooth':'triangle';o.frequency.setValueAtTime(f,t);
  if(type==='good'||type==='scan')o.frequency.exponentialRampToValueAtTime(f*1.35,t+.1);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.045,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+.16);
  o.connect(g).connect(audioCtx.destination);o.start(t);o.stop(t+.18);
 }catch(_){}
}
function toast(msg,bad=false){ui.toast.textContent=msg;ui.toast.className='toast '+(bad?'bad ':'')+'show';clearTimeout(toast.t);toast.t=setTimeout(()=>ui.toast.className='toast',1100)}

const canvas=$('#scene');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.9;
const scene=new THREE.Scene();scene.background=new THREE.Color(0xc8dbc7);scene.fog=new THREE.Fog(0xc8dbc7,18,38);
const camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.1,90);
scene.add(new THREE.HemisphereLight(0xf8fff0,0x58675c,1.45));
const sun=new THREE.DirectionalLight(0xfff1d3,2.1);sun.position.set(-7,12,8);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-14;sun.shadow.camera.right=14;sun.shadow.camera.top=14;sun.shadow.camera.bottom=-14;scene.add(sun);
const fill=new THREE.DirectionalLight(0xd7efff,.6);fill.position.set(8,6,-8);scene.add(fill);

const loader=new GLTFLoader(),cache=new Map(),world=new THREE.Group(),productGroup=new THREE.Group(),playerGroup=new THREE.Group(),fxGroup=new THREE.Group();
scene.add(world,productGroup,playerGroup,fxGroup);
const productViews=new Map(),colliders=[];
let player=null,playerMixer=null,playerAction=null,cart=null,lastDir=new THREE.Vector3(0,0,-1),nearest=null,checkoutRoot=null;
const keys={};const touch={x:0,y:0,active:false,pointer:null};

function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
async function asset(url){if(!cache.has(url))cache.set(url,loader.loadAsync(url));return cache.get(url)}
function recolor(root,palette){
 root.traverse(o=>{if(!o.isMesh)return;const arr=Array.isArray(o.material)?o.material:[o.material];const made=arr.map((m,i)=>{const n=m.clone();if(palette&&palette.length&&n.color)n.color.setHex(palette[hash((o.name||'mesh')+i)%palette.length]);if('roughness'in n)n.roughness=Math.max(.5,n.roughness??.7);return n});o.material=Array.isArray(o.material)?made:made[0];o.castShadow=true;o.receiveShadow=true});
}
async function fitted(url,size=1,palette=null,animated=false){
 const g=await asset(url),clone=animated?SkeletonUtils.clone(g.scene):g.scene.clone(true),wrap=new THREE.Group();wrap.add(clone);recolor(clone,palette);
 let box3=new THREE.Box3().setFromObject(clone),sz=new THREE.Vector3();box3.getSize(sz);clone.scale.multiplyScalar(size/(Math.max(sz.x,sz.y,sz.z)||1));
 box3=new THREE.Box3().setFromObject(clone);const c=box3.getCenter(new THREE.Vector3());clone.position.x-=c.x;clone.position.z-=c.z;clone.position.y-=box3.min.y;
 return{root:wrap,clips:g.animations||[]};
}
function box(size,pos,color,rough=.88,parent=world){
 const m=new THREE.Mesh(new THREE.BoxGeometry(...size),new THREE.MeshStandardMaterial({color,roughness:rough}));m.position.set(...pos);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
function addCollider(x,z,w,d){colliders.push({x,z,w,d})}
function canStand(x,z){
 if(x<-9.7||x>9.7||z<-9.1||z>8.3)return false;
 for(const c of colliders)if(Math.abs(x-c.x)<c.w/2+.38&&Math.abs(z-c.z)<c.d/2+.38)return false;
 return true;
}
function sign(text,pos,scale=1,color='#2f7d60'){
 const c=document.createElement('canvas');c.width=512;c.height=150;const x=c.getContext('2d');x.fillStyle='#fff8e9';x.fillRect(0,0,512,150);x.fillStyle=color;x.fillRect(0,0,512,23);x.fillStyle='#173b31';x.font='900 48px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(text,256,86);
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true}));sp.position.set(...pos);sp.scale.set(4.1*scale,1.2*scale,1);world.add(sp);return sp;
}
async function addMarket(name,size,pos,rot=0,palette=null){
 try{const a=await fitted(MARKET+name+'.glb',size,palette);a.root.position.set(...pos);a.root.rotation.y=rot;world.add(a.root);return a.root}catch(e){console.warn('market asset failed',name,e);return null}
}

async function buildStore(){
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(21,19),new THREE.MeshStandardMaterial({color:0xd4d0bd,roughness:.98}));floor.rotation.x=-Math.PI/2;floor.position.z=-.4;floor.receiveShadow=true;world.add(floor);
 const grid=new THREE.GridHelper(21,21,0x9aa99a,0xb8b7aa);grid.position.y=.008;grid.position.z=-.4;grid.material.opacity=.13;grid.material.transparent=true;world.add(grid);
 box([21,.35,.35],[0,.18,-9.4],0xe9dfc8);box([.35,.35,18.5],[-10.25,.18,-.25],0xe9dfc8);box([.35,.35,18.5],[10.25,.18,-.25],0xe9dfc8);
 sign('우리 동네 마트',[0,4.5,-9.15],1.15,'#2f7d60');
 sign('과일 · 채소',[-6.65,3.05,-8.7],.62,'#69a65c');sign('빵 · 간식',[6.9,3.05,-8.7],.62,'#d18a52');sign('식품',[0,3.3,-5.9],.48,'#6c8db0');sign('냉장 · 냉동',[4.15,3.3,-2.6],.5,'#69a8b0');sign('음료',[-1.4,3.3,4.2],.48,'#b66f72');sign('셀프 계산',[-7.25,3.1,7.4],.55,'#2f7d60');

 const tasks=[];
 tasks.push(addMarket('display-fruit',2.3,[-6.65,0,-6.0],0,[0x54864f,0xd85b50,0xe7bd48,0xd58b43]));
 tasks.push(addMarket('display-fruit',2.3,[-6.65,0,-3.9],0,[0x54864f,0xd85b50,0xe7bd48,0xd58b43]));
 tasks.push(addMarket('display-bread',2.3,[7.0,0,-6.0],0,[0x8c6948,0xd59a58,0xf0d2a1]));
 tasks.push(addMarket('display-bread',2.3,[7.0,0,-3.9],0,[0x8c6948,0xd59a58,0xf0d2a1]));
 addCollider(-6.65,-5.0,3.1,5.2);addCollider(7,-5.0,3.1,5.2);

 const aisleXs=[-2.8,0,2.8];
 for(let i=0;i<aisleXs.length;i++){
  const x=aisleXs[i],type=i===1?'shelf-bags':'shelf-boxes';
  tasks.push(addMarket(type,3.0,[x,0,-2.5],Math.PI/2,i===0?[0x487961,0xd69b4a,0xca5c4f]:i===1?[0x436f95,0xefb24f,0xd8655b]:[0x4d7d8d,0xe1b154,0xc7655b]));
  tasks.push(addMarket(type,3.0,[x,0,.8],Math.PI/2,i===0?[0x487961,0xd69b4a,0xca5c4f]:i===1?[0x436f95,0xefb24f,0xd8655b]:[0x4d7d8d,0xe1b154,0xc7655b]));
  tasks.push(addMarket('shelf-end',1.7,[x,0,-4.45],0,[0x5a796b,0xe0bb66]));
  tasks.push(addMarket('shelf-end',1.7,[x,0,2.75],Math.PI,[0x5a796b,0xe0bb66]));
  addCollider(x,-2.5,1.65,2.7);addCollider(x,.8,1.65,2.7);
 }
 tasks.push(addMarket('freezers-standing',3.2,[7.8,0,.25],Math.PI/2,[0xd9e8e8,0x6f9aad,0xf7fbf7]));addCollider(7.8,.25,1.7,5.6);
 tasks.push(addMarket('freezer',2.6,[4.9,0,4.9],0,[0xd9e8e8,0x6f9aad,0xf7fbf7]));addCollider(4.9,4.9,4.2,1.5);
 tasks.push(addMarket('shopping-basket',1.1,[7.6,0,6.6],-.3,[0xe16f4c,0x365d50]));
 tasks.push(addMarket('shopping-cart',1.6,[8.5,0,6.5],-.45,[0x477b9a,0xc8d5d3,0x444e52]));

 box([4.3,.8,1.65],[-7.25,.45,5.9],0x356a55);box([4.3,.12,1.7],[-7.25,.91,5.9],0x173b31,.6);addCollider(-7.25,5.9,4.3,1.65);
 checkoutRoot=await addMarket('cash-register',1.55,[-6.3,.96,5.65],Math.PI,[0x2d5147,0x3c3d3d,0xe78a4f]);
 await Promise.allSettled(tasks);
}

async function buildProductViews(){
 for(const p of PRODUCTS){
  let root;
  try{root=(await fitted(FOOD+p.model,.72,p.pal)).root}catch(_){root=new THREE.Group();root.add(new THREE.Mesh(new THREE.SphereGeometry(.28,12,9),new THREE.MeshStandardMaterial({color:p.pal[0]})))}
  root.position.set(p.pos[0],.58,p.pos[1]);root.rotation.y=(hash(p.id)%628)/100;root.userData.productId=p.id;root.traverse(o=>{if(o.isMesh)o.userData.productId=p.id});productGroup.add(root);
  const pedestal=box([.72,.54,.72],[p.pos[0],.27,p.pos[1]],0xf2e6c9,.82,productGroup);pedestal.userData.productId=p.id;
  const label=document.createElement('button');label.className='productTag';label.innerHTML=p.name+'<small>'+fmt(p.price)+'</small>';label.onclick=()=>tryPick(p.id);ui.labels.appendChild(label);
  productViews.set(p.id,{root,label,p});
 }
}

async function buildPlayer(){
 const file=PLAYER_MODELS[Math.floor(Math.random()*PLAYER_MODELS.length)];
 let a;try{a=await fitted(PEOPLE+file,1.65,null,true)}catch(_){a={root:new THREE.Group(),clips:[]}}
 player=a.root;player.position.set(7.0,0,7.0);playerGroup.add(player);playerMixer=new THREE.AnimationMixer(player);player.clips=a.clips||[];
 try{cart=(await fitted(MARKET+'shopping-cart.glb',1.25,[0x477b9a,0xc8d5d3,0x444e52])).root;cart.position.set(7.8,0,7.4);playerGroup.add(cart)}catch(_){}
 setPlayerAnim('idle');
}
function setPlayerAnim(name){
 if(!playerMixer||!player||!player.clips)return;const clip=player.clips.find(c=>c.name===name);if(!clip)return;if(playerAction&&playerAction.getClip()===clip)return;
 playerAction?.fadeOut(.12);const a=playerMixer.clipAction(clip);a.reset().fadeIn(.12).play();playerAction=a;
}
function moveInput(){
 let x=0,z=0;if(keys.KeyA||keys.ArrowLeft)x-=1;if(keys.KeyD||keys.ArrowRight)x+=1;if(keys.KeyW||keys.ArrowUp)z-=1;if(keys.KeyS||keys.ArrowDown)z+=1;
 if(touch.active){x+=touch.x;z+=touch.y}
 const v=new THREE.Vector3(x,0,z);if(v.lengthSq()>1)v.normalize();return v;
}
function updatePlayer(dt){
 if(!state.running||state.phase!=='shopping'||!player)return;
 const v=moveInput(),moving=v.lengthSq()>.01;
 if(moving){
  v.normalize();lastDir.lerp(v,.18).normalize();const speed=4.2,candidate=player.position.clone().addScaledVector(v,speed*dt);
  if(canStand(candidate.x,player.position.z))player.position.x=candidate.x;
  if(canStand(player.position.x,candidate.z))player.position.z=candidate.z;
  player.rotation.y=Math.atan2(lastDir.x,lastDir.z);setPlayerAnim('walk');
 }else setPlayerAnim('idle');
 if(cart){
  const behind=player.position.clone().addScaledVector(lastDir,-.95);behind.x+=.25*lastDir.z;behind.z-=.25*lastDir.x;
  cart.position.lerp(new THREE.Vector3(behind.x,0,behind.z),Math.min(1,dt*7));cart.rotation.y=Math.atan2(lastDir.x,lastDir.z);
 }
}
function updateCamera(dt){
 if(!player)return;const target=player.position.clone();const desired=new THREE.Vector3(target.x,6.7,target.z+7.6);camera.position.lerp(desired,Math.min(1,dt*3.4));camera.lookAt(target.x,1.0,target.z-1.4);
}

function pickMission(mode){
 const count=CFG[mode].count,byZone={};for(const p of PRODUCTS)(byZone[p.zone]??=[]).push(p);
 const zones=shuffle(Object.keys(byZone));const picked=[];for(const z of zones){if(picked.length>=count)break;picked.push(shuffle(byZone[z])[0])}
 for(const p of shuffle(PRODUCTS))if(picked.length<count&&!picked.some(x=>x.id===p.id))picked.push(p);
 state.list=picked;state.basket=[];state.scanned=new Set();state.paid=0;state.changeAnswer=null;state.mistakes=0;state.checkoutMistakes=0;
 const total=sum(picked.map(p=>p.price)),pad=CFG[mode].budgetPad;state.budget=Math.ceil((total+pad[0]+Math.random()*(pad[1]-pad[0]))/1000)*1000;
}
function renderMission(){
 const ids=new Set(state.basket.map(p=>p.id));ui.list.innerHTML=state.list.map(p=>'<div class="listItem '+(ids.has(p.id)?'done':'')+'" style="--zone:'+ZONES[p.zone].color+'"><span class="dot"></span><div><b>'+(ids.has(p.id)?'✓ ':'')+p.name+'</b><small>'+ZONES[p.zone].name+'</small></div><strong>'+fmt(p.price)+'</strong></div>').join('');
 ui.progress.textContent=state.basket.length+' / '+state.list.length;ui.budget.textContent=fmt(state.budget);ui.basket.textContent=fmt(sum(state.basket.map(p=>p.price)));
 ui.modeBadge.textContent=CFG[state.mode].name;
 if(state.basket.length===state.list.length){ui.missionSub.textContent='목록을 모두 담았어요! 셀프 계산대로 가세요.';ui.zoneHint.textContent='초록색 셀프 계산대는 입구 왼쪽에 있어요.';ui.phase.textContent='② 셀프 계산대로 이동'}
 else{ui.missionSub.textContent='목록에 있는 물건을 직접 찾아 카트에 담으세요.';ui.zoneHint.textContent='천장 구역 간판을 보고 통로를 찾아가세요.';ui.phase.textContent='① 매장에서 장보기'}
}
function targetIds(){return new Set(state.list.map(p=>p.id))}
function nearestProduct(){
 if(!player)return null;let best=null,dist=999;for(const p of PRODUCTS){const d=Math.hypot(player.position.x-p.pos[0],player.position.z-p.pos[1]);if(d<dist){dist=d;best=p}}return best?{p:best,d:dist}:null;
}
function atCheckout(){return player&&Math.hypot(player.position.x+7.25,player.position.z-7.0)<2.25}
function updateInteraction(){
 if(state.phase!=='shopping'){nearest=null;return}
 const all=state.basket.length===state.list.length;
 if(atCheckout()){
  nearest={type:'checkout'};ui.interactIcon.textContent='🧾';ui.interactTitle.textContent=all?'셀프 계산 시작':'아직 살 물건이 남았어요';ui.interactSub.textContent=all?'E / Space 또는 버튼을 눌러 계산해요.':'장보기 목록을 먼저 모두 채워 주세요.';ui.interactBtn.textContent='계산';ui.touchInteract.textContent='계산';ui.interactBtn.disabled=!all;return;
 }
 const n=nearestProduct(),wanted=n&&targetIds().has(n.p.id),already=n&&state.basket.some(x=>x.id===n.p.id);
 if(n&&n.d<1.6){
  nearest={type:'product',p:n.p};ui.interactIcon.textContent=wanted?'🛒':'🏷️';ui.interactTitle.textContent=n.p.name+' · '+fmt(n.p.price);ui.interactSub.textContent=already?'이미 카트에 담았어요.':wanted?'장보기 목록에 있는 물건이에요.':'목록에는 없는 물건이에요.';ui.interactBtn.textContent='담기';ui.touchInteract.textContent='담기';ui.interactBtn.disabled=already;return;
 }
 nearest=null;ui.interactIcon.textContent='🛒';ui.interactTitle.textContent=all?'셀프 계산대로 가세요':'매장을 둘러보세요';ui.interactSub.textContent=all?'입구 왼쪽 초록색 계산대':'WASD / 방향키로 이동';ui.interactBtn.textContent='담기';ui.touchInteract.textContent='담기';ui.interactBtn.disabled=true;
}
function tryPick(id){
 if(state.phase!=='shopping'||!player)return;const p=PRODUCTS.find(x=>x.id===id);if(!p)return;const d=Math.hypot(player.position.x-p.pos[0],player.position.z-p.pos[1]);
 if(d>1.7)return toast('조금 더 가까이 가서 담아 주세요.',true);
 if(state.basket.some(x=>x.id===id))return toast('이미 카트에 담았어요.');
 if(!state.list.some(x=>x.id===id)){state.mistakes++;tone('bad');return toast('장보기 목록에는 없는 물건이에요.',true)}
 state.basket.push(p);tone('pick');toast(p.name+'을(를) 카트에 담았어요!');const v=productViews.get(id);if(v)v.label.classList.add('done');renderMission();pulse(p.pos[0],p.pos[1]);
}
function interact(){
 if(state.phase!=='shopping'||!nearest)return;
 if(nearest.type==='checkout'){if(state.basket.length===state.list.length)openCheckout();else toast('장보기 목록을 먼저 모두 채워 주세요.',true)}
 else if(nearest.type==='product')tryPick(nearest.p.id);
}
function pulse(x,z){
 const ring=new THREE.Mesh(new THREE.RingGeometry(.18,.27,24),new THREE.MeshBasicMaterial({color:0x77e09a,transparent:true,opacity:.95,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.set(x,.03,z);fxGroup.add(ring);const start=performance.now();
 const go=now=>{const t=clamp((now-start)/430,0,1);ring.scale.setScalar(1+t*5);ring.material.opacity=1-t;if(t<1)requestAnimationFrame(go);else ring.removeFromParent()};requestAnimationFrame(go);
}

function openCheckout(){
 state.phase='checkout';state.running=false;state.scanned=new Set();state.paid=0;state.changeAnswer=null;ui.checkout.classList.add('show');ui.checkout.setAttribute('aria-hidden','false');ui.phase.textContent='③ 셀프 계산 중';renderCheckout();tone('scan');
}
function closeCheckout(){
 if(state.phase==='done')return;state.phase='shopping';state.running=true;ui.checkout.classList.remove('show');ui.checkout.setAttribute('aria-hidden','true');renderMission();
}
function checkoutTotal(){return sum(state.basket.filter(p=>state.scanned.has(p.id)).map(p=>p.price))}
function renderCheckout(){
 const allScanned=state.scanned.size===state.basket.length,total=checkoutTotal();
 ui.scanStat.textContent=state.scanned.size+' / '+state.basket.length;ui.checkoutTotal.textContent=fmt(total);ui.checkoutPaid.textContent=state.paid?fmt(state.paid):'-';ui.checkoutChange.textContent=state.paid&&allScanned?'?':'-';
 ui.scanItems.innerHTML=state.basket.map(p=>'<button class="scanItem '+(state.scanned.has(p.id)?'scanned':'')+'" data-scan="'+p.id+'"><span><b>'+(state.scanned.has(p.id)?'✓ ':'')+p.name+'</b><small>'+ZONES[p.zone].name+'</small></span><strong>'+fmt(p.price)+'</strong></button>').join('');
 ui.paySection.classList.toggle('locked',!allScanned);ui.changeSection.classList.toggle('locked',!state.paid);
 ui.checkoutGuide.textContent=!allScanned?'장바구니 상품을 하나씩 눌러 스캔하세요.':!state.paid?'합계를 확인하고 넣을 현금을 선택하세요.':'낸 돈에서 합계를 빼고 거스름돈을 골라 보세요.';
 if(allScanned){
  const opts=[5000,10000,20000,50000].filter(v=>v>=total);if(!opts.length)opts.push(50000);
  const show=[...new Set(opts.slice(0,3))];ui.cashOptions.innerHTML=show.map(v=>'<button class="cashBtn '+(state.paid===v?'selected':'')+'" data-cash="'+v+'">'+fmt(v)+'</button>').join('');
 }else ui.cashOptions.innerHTML='<button class="cashBtn" disabled>상품을 먼저 모두 스캔하세요</button>';
 if(state.paid){
  const change=state.paid-total,step=state.mode==='easy'?1000:500;let vals=[change,Math.max(0,change-step),change+step];if(change===0)vals=[0,500,1000];vals=shuffle([...new Set(vals)]).slice(0,3);
  ui.changeEquation.textContent=state.paid.toLocaleString()+' − '+total.toLocaleString()+' = ?';
  ui.changeOptions.innerHTML=vals.map(v=>'<button class="changeBtn '+(state.changeAnswer===v?'selected':'')+'" data-change="'+v+'">'+fmt(v)+'</button>').join('');
 }else{ui.changeEquation.textContent='낸 돈 − 합계 = ?';ui.changeOptions.innerHTML='<button class="changeBtn" disabled>현금을 먼저 넣어 주세요</button>'}
 ui.finishCheckout.disabled=!(state.paid&&state.changeAnswer!==null);
}
function scanItem(id){if(state.phase!=='checkout'||state.scanned.has(id))return;state.scanned.add(id);tone('scan');renderCheckout()}
function chooseCash(v){if(state.scanned.size!==state.basket.length)return;state.paid=v;state.changeAnswer=null;tone('cash');renderCheckout()}
function chooseChange(v){if(!state.paid)return;state.changeAnswer=v;tone('cash');renderCheckout()}
function finishCheckout(){
 const total=checkoutTotal(),target=state.paid-total;if(state.changeAnswer!==target){state.checkoutMistakes++;tone('bad');toast(state.changeAnswer<target?fmt(target-state.changeAnswer)+' 더 받아야 해요.':fmt(state.changeAnswer-target)+' 너무 많아요.',true);return}
 tone('good');ui.checkoutChange.textContent=fmt(target);ui.checkoutGuide.textContent='정답! 영수증이 나왔어요.';setTimeout(completeMission,500);
}
function completeMission(){
 state.phase='done';state.running=false;ui.checkout.classList.remove('show');const spent=sum(state.basket.map(p=>p.price)),remain=state.budget-spent;
 const score=Math.max(100,1000-state.mistakes*80-state.checkoutMistakes*120);let best=score;try{const k='mart-walk-best-'+state.mode+'-v3';best=Math.max(score,+(localStorage.getItem(k)||0));localStorage.setItem(k,best)}catch(_){}
 ui.resultTitle.textContent=state.checkoutMistakes===0&&state.mistakes===0?'완벽한 장보기!':'장보기 완료!';
 ui.resultText.innerHTML='직접 매장을 돌아다니며 <b>'+state.basket.length+'개</b> 물건을 찾고 셀프 계산까지 마쳤어요.<br>이번 점수 <b>'+score+'점</b> · 최고 기록 <b>'+best+'점</b>';
 ui.resultItems.textContent=state.basket.length+'개';ui.resultSpent.textContent=fmt(spent);ui.resultRemain.textContent=fmt(remain);ui.result.classList.remove('hidden');ui.phase.textContent='장보기 완료';
}

async function start(mode){
 state.mode=mode;pickMission(mode);state.phase='shopping';state.running=true;ui.start.classList.add('hidden');ui.result.classList.add('hidden');
 if(player){player.position.set(7,0,7);lastDir.set(0,0,-1)}if(cart)cart.position.set(7.8,0,7.4);
 for(const v of productViews.values())v.label.classList.remove('done');
 renderMission();tone('start');
}
async function preload(){
 const critical=[MARKET+'cash-register.glb',MARKET+'shopping-cart.glb',MARKET+'display-fruit.glb',MARKET+'display-bread.glb',MARKET+'shelf-boxes.glb',MARKET+'freezers-standing.glb',...PRODUCTS.map(p=>FOOD+p.model),...PLAYER_MODELS.map(p=>PEOPLE+p)];
 let done=0;const unique=[...new Set(critical)];await Promise.all(unique.map(async u=>{try{await asset(u)}catch(e){console.warn('preload failed',u,e)}finally{done++;const pct=Math.round(done/unique.length*100);ui.loadFill.style.width=pct+'%';ui.loadText.textContent='3D 마트 준비 중… '+pct+'%'}}));
 await buildStore();await buildProductViews();await buildPlayer();ui.loadFill.style.width='100%';ui.loadText.textContent='준비 완료! 장보기 난이도를 골라 주세요.';document.querySelectorAll('.mode').forEach(b=>b.disabled=false);state.phase='ready';ui.phase.textContent='난이도를 선택해 장보기를 시작하세요';
}

function updateProductLabels(){
 if(!player)return;const wanted=targetIds(),cfg=CFG[state.mode]||CFG.normal;
 for(const [id,v] of productViews){
  const d=Math.hypot(player.position.x-v.p.pos[0],player.position.z-v.p.pos[1]),target=wanted.has(id)&&!state.basket.some(x=>x.id===id),show=state.phase==='shopping'&&(d<cfg.labelRange||(cfg.beacon&&target));
  v.label.style.display=show?'block':'none';v.label.classList.toggle('target',target);
  if(!show)continue;const w=new THREE.Vector3();v.root.getWorldPosition(w);w.y+=.9;w.project(camera);if(w.z>1){v.label.style.display='none';continue}v.label.style.left=(w.x*.5+.5)*innerWidth+'px';v.label.style.top=(-w.y*.5+.5)*innerHeight+'px';
 }
}
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false);renderer.setPixelRatio(Math.min(devicePixelRatio,1.65))}
window.addEventListener('resize',resize);resize();
window.addEventListener('keydown',e=>{keys[e.code]=true;if((e.code==='Space'||e.code==='KeyE')&&state.phase==='shopping'){e.preventDefault();interact()}if(e.code==='Escape'&&state.phase==='checkout')closeCheckout()});
window.addEventListener('keyup',e=>{keys[e.code]=false});
ui.interactBtn.onclick=interact;ui.touchInteract.onclick=interact;ui.sound.onclick=()=>{state.sound=!state.sound;ui.sound.textContent=state.sound?'🔊':'🔇';try{localStorage.setItem('mart-walk-sound',JSON.stringify(state.sound))}catch(_){}if(state.sound)tone('cash')};
ui.scanItems.onclick=e=>{const b=e.target.closest('[data-scan]');if(b)scanItem(b.dataset.scan)};
ui.cashOptions.onclick=e=>{const b=e.target.closest('[data-cash]');if(b)chooseCash(+b.dataset.cash)};
ui.changeOptions.onclick=e=>{const b=e.target.closest('[data-change]');if(b)chooseChange(+b.dataset.change)};
ui.closeCheckout.onclick=closeCheckout;ui.backToShopping.onclick=closeCheckout;ui.finishCheckout.onclick=finishCheckout;
document.querySelectorAll('.mode').forEach(b=>b.onclick=()=>start(b.dataset.mode));ui.modeBtn.onclick=()=>{ui.result.classList.add('hidden');ui.start.classList.remove('hidden')};ui.replay.onclick=()=>start(state.mode);

function setStick(e){
 const r=ui.joystick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx0=e.clientX-cx,dy0=e.clientY-cy,max=r.width*.34,len=Math.hypot(dx0,dy0)||1,s=Math.min(1,max/len),dx=dx0*s,dy=dy0*s;ui.stick.style.transform='translate(calc(-50% + '+dx+'px),calc(-50% + '+dy+'px))';touch.x=dx/max;touch.y=dy/max;
}
ui.joystick.addEventListener('pointerdown',e=>{touch.active=true;touch.pointer=e.pointerId;ui.joystick.setPointerCapture(e.pointerId);setStick(e)});
ui.joystick.addEventListener('pointermove',e=>{if(touch.active&&e.pointerId===touch.pointer)setStick(e)});
function endStick(e){if(e.pointerId!==touch.pointer)return;touch.active=false;touch.x=touch.y=0;touch.pointer=null;ui.stick.style.transform='translate(-50%,-50%)'}
ui.joystick.addEventListener('pointerup',endStick);ui.joystick.addEventListener('pointercancel',endStick);

const clock=new THREE.Clock();
function animate(){
 requestAnimationFrame(animate);const dt=Math.min(.05,clock.getDelta());if(playerMixer)playerMixer.update(dt);updatePlayer(dt);updateCamera(dt);updateInteraction();updateProductLabels();
 for(const [id,v] of productViews){if(state.phase==='shopping'&&!state.basket.some(x=>x.id===id))v.root.rotation.y+=dt*.18}
 renderer.render(scene,camera);
}
requestAnimationFrame(animate);
preload().catch(err=>{console.error(err);ui.loadText.textContent='3D 에셋을 불러오지 못했어요. 새로고침해 주세요.';ui.phase.textContent='마트 로딩 오류'});
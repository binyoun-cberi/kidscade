import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const FOOD=new URL('../../assets/game/food/',import.meta.url).href;
const SHIFT_SECONDS=90;
const MAX_QUEUE=5;
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];

const stationMeta={
  ramen:{label:'라면',verb:'끓이기',duration:5.4,grace:5.2,base:'noodle',allowed:['noodle','egg','green','cheese']},
  tteok:{label:'떡볶이',verb:'볶기',duration:6.0,grace:5.0,base:'ricecake',allowed:['ricecake','fishcake','egg','cheese']},
  side:{label:'사이드',verb:'준비',duration:4.0,grace:4.2,base:null,allowed:['corndog','kimbap','dumpling']}
};

const orderTemplates=[
  {type:'ramen',name:'계란 라면',face:'🍜',target:['noodle','egg'],desc:'면 + 계란, 깔끔하게 부탁해요.'},
  {type:'ramen',name:'파 송송 라면',face:'🌿',target:['noodle','green'],desc:'면에 파 듬뿍! 계란은 빼 주세요.'},
  {type:'ramen',name:'치즈 계란 라면',face:'🧀',target:['noodle','egg','cheese'],desc:'계란과 치즈가 들어간 진한 라면.'},
  {type:'ramen',name:'분식집 풀옵션 라면',face:'🔥',target:['noodle','egg','green','cheese'],desc:'면, 계란, 파, 치즈 전부 넣어 주세요!'},
  {type:'tteok',name:'기본 떡볶이',face:'🌶️',target:['ricecake','fishcake'],desc:'떡과 어묵으로 정석 떡볶이.'},
  {type:'tteok',name:'계란 떡볶이',face:'🥚',target:['ricecake','fishcake','egg'],desc:'떡, 어묵에 계란도 하나 부탁해요.'},
  {type:'tteok',name:'치즈 떡볶이',face:'🧀',target:['ricecake','fishcake','cheese'],desc:'치즈가 쭉 늘어나는 떡볶이!'},
  {type:'tteok',name:'치즈 계란 떡볶이',face:'😋',target:['ricecake','fishcake','egg','cheese'],desc:'계란과 치즈 둘 다 넣어 주세요.'},
  {type:'side',name:'핫도그',face:'🌭',target:['corndog'],desc:'바삭한 핫도그 하나 주세요.'},
  {type:'side',name:'김밥',face:'🍙',target:['kimbap'],desc:'먹기 좋은 김밥 한 줄 부탁해요.'},
  {type:'side',name:'만두',face:'🥟',target:['dumpling'],desc:'노릇한 만두 한 접시 주세요.'}
];

const state={running:false,time:SHIFT_SECONDS,score:0,served:0,combo:0,bestCombo:0,missed:0,queue:[],nextId:1,spawnClock:0,uiClock:0,lastTs:0,raf:0};
const stations={
  ramen:{type:'ramen',order:null,chosen:new Set(),phase:'idle',progress:0,readyClock:0},
  tteok:{type:'tteok',order:null,chosen:new Set(),phase:'idle',progress:0,readyClock:0},
  side:{type:'side',order:null,chosen:new Set(),phase:'idle',progress:0,readyClock:0}
};

function sfx(key,options={}){try{window.KidscadeAudio?.play?.(key,options)}catch(_){}}
function toast(text,type='info'){const el=$('#toast');el.textContent=text;el.className=`toast ${type} show`;clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.className=`toast ${type}`,1600)}
function sceneToast(text){const el=$('#sceneToast');el.textContent=text;clearTimeout(sceneToast.timer);sceneToast.timer=setTimeout(()=>{if(state.running)el.textContent='세 조리대의 진행 상태를 동시에 확인하세요.'},1700)}
function openModal(html){$('#modal').innerHTML=html;$('#modalBack').classList.add('show')}
function closeModal(){$('#modalBack').classList.remove('show')}
$('#modalBack').addEventListener('click',e=>{if(e.target.id==='modalBack')closeModal()});

function createOrder(){
  const t=orderTemplates[Math.floor(Math.random()*orderTemplates.length)];
  return {...t,id:`order-${state.nextId++}`,patience:100};
}
function fillQueue(target=4){while(state.queue.length<Math.min(target,MAX_QUEUE))state.queue.push(createOrder())}
function targetText(order){return order.target.map(item=>itemLabel(item)).join(' + ')}
function itemLabel(item){return ({noodle:'면',egg:'계란',green:'파',cheese:'치즈',ricecake:'떡',fishcake:'어묵',corndog:'핫도그',kimbap:'김밥',dumpling:'만두'})[item]||item}
function typeLabel(type){return ({ramen:'라면',tteok:'떡볶이',side:'사이드'})[type]||type}

function renderQueue(){
  const root=$('#queueList');root.innerHTML='';$('#queueCount').textContent=state.queue.length;
  if(!state.queue.length){root.innerHTML='<div class="queueTip" style="margin:0">새 주문을 기다리는 중...</div>';return}
  state.queue.forEach(order=>{
    const b=document.createElement('button');b.className=`queueCard ${order.patience<38?'urgent':''}`;
    b.innerHTML=`<span class="queueType">${typeLabel(order.type)}</span><b>${order.face} ${order.name}</b><div class="desc">${order.desc}</div><div class="qbar"><span style="width:${order.patience}%"></span></div>`;
    b.onclick=()=>assignOrder(order.id);
    root.appendChild(b);
  });
}

function assignOrder(id){
  if(!state.running)return;
  const idx=state.queue.findIndex(o=>o.id===id);if(idx<0)return;
  const order=state.queue[idx],st=stations[order.type];
  if(st.order){toast(`${stationMeta[order.type].label} 조리대가 아직 바빠요.`,'bad');return}
  state.queue.splice(idx,1);st.order=order;st.chosen.clear();st.phase='prep';st.progress=0;st.readyClock=0;
  sfx('collect.coin_pickup',{volume:.2,rate:1.13,cooldownMs:80});
  renderQueue();renderStation(order.type);kitchenScene.setStation(order.type,st);sceneToast(`${order.name} 주문을 ${stationMeta[order.type].label} 조리대에 배정했어요.`);
}

function renderStation(type){
  const st=stations[type],meta=stationMeta[type],card=$(`.stationCard[data-station="${type}"]`),stateEl=$(`#${type}State`),ticket=$(`#${type}Ticket`),progress=$(`#${type}Progress`);
  card.classList.toggle('active',!!st.order&&st.phase!=='ready'&&st.phase!=='burnt');card.classList.toggle('ready',st.phase==='ready');card.classList.toggle('burnt',st.phase==='burnt');
  const label={idle:'비어 있음',prep:'재료 준비',cooking:'조리 중',ready:'지금 서빙!',burnt:'타버림'}[st.phase]||st.phase;stateEl.textContent=label;
  ticket.innerHTML=st.order?`<b>${st.order.face} ${st.order.name}</b><br>목표: ${targetText(st.order)} · 인내도 ${Math.round(st.order.patience)}%`:`${meta.label} 주문을 배정하세요.`;
  const buttons=$$(`#${type}Controls button`);buttons.forEach(btn=>{const item=btn.dataset.item;btn.classList.toggle('on',st.chosen.has(item));btn.disabled=!st.order||st.phase!=='prep'});
  const cook=$(`[data-action="cook"][data-station="${type}"]`),serve=$(`[data-action="serve"][data-station="${type}"]`);cook.disabled=!st.order||st.phase!=='prep';serve.disabled=!st.order||!['ready','burnt'].includes(st.phase);
  let pct=0;if(st.phase==='cooking')pct=st.progress*100;else if(st.phase==='ready')pct=Math.max(0,100-(st.readyClock/meta.grace)*100);else if(st.phase==='burnt')pct=100;
  progress.style.width=`${pct}%`;progress.style.background=st.phase==='burnt'?'#d84c3e':st.phase==='ready'?'linear-gradient(90deg,#52b76b,#bfe56d)':'linear-gradient(90deg,#5ab96c,#f0c64f,#e25745)';
}
function renderAllStations(){Object.keys(stations).forEach(renderStation)}

function toggleIngredient(type,item){
  const st=stations[type];if(!st.order||st.phase!=='prep')return;
  if(type==='side')st.chosen.clear();
  if(st.chosen.has(item))st.chosen.delete(item);else st.chosen.add(item);
  sfx(st.chosen.has(item)?'collect.coin_pickup':'collect.coin_drop',{volume:.15,rate:1.16,cooldownMs:60});
  renderStation(type);kitchenScene.setStation(type,st);
}

function canCook(st){
  const meta=stationMeta[st.type];
  if(st.type==='side')return st.chosen.size===1;
  return st.chosen.has(meta.base);
}
function startCooking(type){
  const st=stations[type],meta=stationMeta[type];if(!st.order||st.phase!=='prep')return;
  if(!canCook(st)){toast(type==='side'?'사이드 메뉴를 하나 골라 주세요.':`${itemLabel(meta.base)}을 먼저 넣어 주세요.`,'bad');return}
  st.phase='cooking';st.progress=0;st.readyClock=0;sfx('combat.impact_heavy',{volume:.13,rate:1.5,cooldownMs:100});renderStation(type);kitchenScene.setStation(type,st);sceneToast(`${meta.label} 조리 시작! 다른 조리대도 확인하세요.`)
}

function compareRecipe(order,chosen){
  const target=new Set(order.target);let missing=0,extra=0;for(const x of target)if(!chosen.has(x))missing++;for(const x of chosen)if(!target.has(x))extra++;return{missing,extra,exact:missing===0&&extra===0};
}
function serveStation(type){
  const st=stations[type];if(!st.order||!['ready','burnt'].includes(st.phase))return;
  const result=compareRecipe(st.order,st.chosen);let points=100-result.missing*22-result.extra*13+Math.round(st.order.patience*.18);
  if(st.phase==='burnt')points-=48;else points+=Math.max(0,Math.round((1-st.readyClock/stationMeta[type].grace)*12));
  points=Math.max(0,Math.min(130,points));
  const good=points>=82;
  if(good){state.combo++;state.bestCombo=Math.max(state.bestCombo,state.combo);points+=Math.min(20,(state.combo-1)*3);sfx('shop.purchase',{volume:.38});setTimeout(()=>sfx('success.cheer_yay',{volume:.28}),100)}else{state.combo=0;sfx('failure.fail_sting',{volume:.34})}
  state.score+=points;state.served++;
  addHistory(`${st.order.name} · ${points}점${st.phase==='burnt'?' · 너무 오래 조리함':''}`,good);
  kitchenScene.celebrate(type,good);toast(good?'맛있게 나갔어요!':'주문과 조금 달랐어요.',good?'good':'bad');
  clearStation(type);renderStats();
}

function clearStation(type){const st=stations[type];st.order=null;st.chosen.clear();st.phase='idle';st.progress=0;st.readyClock=0;renderStation(type);kitchenScene.setStation(type,st)}
function failOrder(order,source='queue'){
  state.score=Math.max(0,state.score-25);state.combo=0;state.missed++;sfx('failure.fail_sting',{volume:.28,cooldownMs:250});addHistory(`${order.name} · 너무 오래 기다려 떠났어요.`,false);
  if(source!=='queue')clearStation(source);renderStats();
}
function addHistory(text,good){const root=$('#history'),item=document.createElement('div');item.className=`historyItem ${good?'good':'bad'}`;item.textContent=text;root.prepend(item);while(root.children.length>6)root.lastElementChild.remove()}

function renderStats(){
  $('#score').textContent=state.score;$('#served').textContent=state.served;$('#combo').textContent=state.combo;$('#timeLabel').textContent=Math.max(0,Math.ceil(state.time));$('#timeFill').style.width=`${Math.max(0,state.time/SHIFT_SECONDS*100)}%`;
  const all=[...state.queue,...Object.values(stations).map(s=>s.order).filter(Boolean)];const urgent=all.sort((a,b)=>a.patience-b.patience)[0];
  if(urgent){$('#rushFace').textContent=urgent.face;$('#rushName').textContent=urgent.name;$('#rushText').textContent=urgent.patience<35?'많이 기다렸어요. 우선 처리하세요!':`${typeLabel(urgent.type)} 주문 · ${targetText(urgent)}`;$('#lowestPatience').textContent=`${Math.round(urgent.patience)}%`;$('#patienceFill').style.width=`${urgent.patience}%`}else{$('#rushFace').textContent='🙂';$('#rushName').textContent='대기 손님 없음';$('#rushText').textContent='조리대 정리할 시간이에요.';$('#lowestPatience').textContent='100%';$('#patienceFill').style.width='100%'}
}

function updateGame(dt){
  if(!state.running)return;
  state.time=Math.max(0,state.time-dt);state.spawnClock+=dt;state.uiClock+=dt;
  if(state.spawnClock>=4.5){state.spawnClock=0;if(state.queue.length<MAX_QUEUE){state.queue.push(createOrder());renderQueue();sfx('collect.coin_drop',{volume:.1,rate:1.35,cooldownMs:120})}}
  for(let i=state.queue.length-1;i>=0;i--){const o=state.queue[i];o.patience-=dt*1.15;if(o.patience<=0){state.queue.splice(i,1);failOrder(o,'queue');renderQueue()}}
  for(const [type,st] of Object.entries(stations)){
    if(!st.order)continue;st.order.patience-=dt*.72;
    if(st.order.patience<=0){const o=st.order;failOrder(o,type);toast('손님이 기다리다 떠났어요.','bad');continue}
    if(st.phase==='cooking'){
      st.progress=Math.min(1,st.progress+dt/stationMeta[type].duration);
      if(st.progress>=1){st.phase='ready';st.readyClock=0;sfx('success.cheer_yay',{volume:.16,rate:1.2,cooldownMs:160});sceneToast(`${stationMeta[type].label} 완성! 지금 서빙하면 좋아요.`);kitchenScene.setStation(type,st)}
      renderStation(type);
    }else if(st.phase==='ready'){
      st.readyClock+=dt;if(st.readyClock>=stationMeta[type].grace){st.phase='burnt';sfx('failure.fail_sting',{volume:.18,cooldownMs:240});sceneToast(`${stationMeta[type].label}이 너무 오래 조리됐어요!`);kitchenScene.setStation(type,st)}renderStation(type)
    }
  }
  if(state.uiClock>=.25){state.uiClock=0;renderQueue();for(const [type,st] of Object.entries(stations)){if(st.order&&st.phase==='prep')renderStation(type)}}
  renderStats();
  if(state.time<=0)endShift();
}

function loop(ts){const dt=Math.min(.08,(ts-state.lastTs)/1000||0);state.lastTs=ts;updateGame(dt);state.raf=requestAnimationFrame(loop)}

function resetGame(){
  state.time=SHIFT_SECONDS;state.score=0;state.served=0;state.combo=0;state.bestCombo=0;state.missed=0;state.queue=[];state.nextId=1;state.spawnClock=0;state.uiClock=0;$('#history').innerHTML='';
  Object.keys(stations).forEach(clearStation);fillQueue(4);renderQueue();renderAllStations();renderStats();kitchenScene.reset();
}
function startGame(){resetGame();state.running=true;$('#startScreen').classList.remove('active');$('#gameScreen').classList.add('active');sfx('shop.register_open',{volume:.32});toast('영업 시작! 주문을 조리대에 배정하세요.','good');state.lastTs=performance.now()}
function endShift(){
  if(!state.running)return;state.running=false;
  const rank=state.score>=1150?'분식집 마스터':state.score>=850?'동네 인기 사장님':state.score>=550?'능숙한 분식 요리사':'오늘도 성장한 신입 사장님';
  sfx('success.victory_fanfare',{volume:.5});
  openModal(`<div class="modalTop"><div><h2>오늘 영업 종료!</h2><p>${rank}</p></div><button class="modalBtn primary" id="againBtn">다시 영업</button></div><div class="resultGrid"><div class="resultBox"><div>최종 점수</div><div class="scoreBig">${state.score}</div></div><div class="resultBox"><div>서빙 성공</div><div class="scoreBig">${state.served}</div></div><div class="resultBox"><b>최고 콤보</b><p>${state.bestCombo}회 연속 만족</p></div><div class="resultBox"><b>놓친 주문</b><p>${state.missed}건</p></div></div>`);
  $('#againBtn').onclick=()=>{closeModal();startGame()};
}
function help(){openModal(`<div class="modalTop"><div><h2>게임 방법</h2><p>주문 배정 → 재료 선택 → 조리 → 완성 즉시 서빙</p></div><button class="modalBtn" id="helpClose">닫기</button></div><div class="resultGrid"><div class="resultBox"><b>1. 주문 배정</b><p>왼쪽 주문을 누르면 종류에 맞는 빈 조리대로 이동합니다.</p></div><div class="resultBox"><b>2. 재료 맞추기</b><p>주문에 필요한 재료만 선택하세요. 빠진 재료와 불필요한 재료는 감점됩니다.</p></div><div class="resultBox"><b>3. 동시에 조리</b><p>라면, 떡볶이, 사이드는 각각 따로 조리되므로 다른 조리대를 계속 확인해야 합니다.</p></div><div class="resultBox"><b>4. 완성 타이밍</b><p>완성된 뒤 너무 오래 두면 타서 크게 감점됩니다.</p></div></div>`);$('#helpClose').onclick=closeModal}

$$('.ingredientBtns button').forEach(btn=>btn.onclick=()=>toggleIngredient(btn.closest('.stationCard').dataset.station,btn.dataset.item));
$$('[data-action="cook"]').forEach(btn=>btn.onclick=()=>startCooking(btn.dataset.station));
$$('[data-action="serve"]').forEach(btn=>btn.onclick=()=>serveStation(btn.dataset.station));
$('#startBtn').onclick=startGame;$('#helpBtn').onclick=help;$('#demoBtn').onclick=()=>toast('예: 치즈 계란 라면 → 면·계란·치즈 선택 후 끓이기!','info');

class BunsikScene{
  constructor(canvas,preview=false){this.canvas=canvas;this.preview=preview;this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(39,1,.1,100);this.camera.position.set(0,7.4,11.5);this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.shadowMap.enabled=true;this.loader=new GLTFLoader();this.cache=new Map();this.stationGroups={ramen:new THREE.Group(),tteok:new THREE.Group(),side:new THREE.Group()};this.tokens={ramen:0,tteok:0,side:0};this.stationX={ramen:-3.25,tteok:0,side:3.25};this.phaseLights={};this.steam=[];this.clock=new THREE.Clock();this.makeWorld();this.resize();new ResizeObserver(()=>this.resize()).observe(canvas.parentElement);this.animate()}
  makeWorld(){this.scene.add(new THREE.HemisphereLight(0xfff3dd,0x5a4437,2));const d=new THREE.DirectionalLight(0xffffff,2.5);d.position.set(4,8,5);d.castShadow=true;this.scene.add(d);const floor=new THREE.Mesh(new THREE.PlaneGeometry(14,10),new THREE.MeshStandardMaterial({color:0xd6a477,roughness:.85}));floor.rotation.x=-Math.PI/2;floor.position.y=-.76;floor.receiveShadow=true;this.scene.add(floor);for(const [type,x] of Object.entries(this.stationX)){const counter=new THREE.Mesh(new THREE.BoxGeometry(2.75,.55,3.25),new THREE.MeshStandardMaterial({color:type==='side'?0xb77949:0x9a603f,roughness:.72}));counter.position.set(x,-.35,0);counter.castShadow=true;counter.receiveShadow=true;this.scene.add(counter);this.stationGroups[type].position.x=x;this.scene.add(this.stationGroups[type]);const light=new THREE.PointLight(0xffb36b,0,4.3);light.position.set(x,2.2,.2);this.phaseLights[type]=light;this.scene.add(light);for(let i=0;i<6;i++){const p=new THREE.Mesh(new THREE.SphereGeometry(.055,7,7),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0}));p.userData={station:type,offset:i*.31,baseX:x+(Math.random()-.5)*.65,baseZ:(Math.random()-.5)*.6};this.steam.push(p);this.scene.add(p)}}this.loadStatic();this.camera.lookAt(0,.7,0)}
  async loadStatic(){const tasks=[['ramen','pot-stew.glb',2.4],['tteok','frying-pan.glb',2.65],['side','plate.glb',2.05]];for(const [type,file,size] of tasks){try{const o=await this.load(file);this.normalize(o,size);o.position.set(this.stationX[type],.2,0);if(type==='tteok')o.rotation.y=-.45;o.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true}});this.scene.add(o)}catch(_){this.fallbackVessel(type)}}for(const [file,x,z,r] of [['cooking-spoon.glb',-1.55,-1.25,-.4],['chopstick.glb',1.45,-1.1,.8]]){try{const o=await this.load(file);this.normalize(o,1.35);o.position.set(x,.2,z);o.rotation.set(0,r,.4);this.scene.add(o)}catch(_){}}}
  fallbackVessel(type){const x=this.stationX[type];if(type==='side'){const p=new THREE.Mesh(new THREE.CylinderGeometry(1.05,1.05,.13,40),new THREE.MeshStandardMaterial({color:0xf1ede6,roughness:.5}));p.position.set(x,.24,0);this.scene.add(p);return}const body=new THREE.Mesh(new THREE.CylinderGeometry(1.08,.92,.68,40),new THREE.MeshStandardMaterial({color:0x444b52,metalness:.5,roughness:.35}));body.position.set(x,.2,0);this.scene.add(body)}
  async load(name){if(this.cache.has(name))return this.cache.get(name).clone(true);const obj=await new Promise((res,rej)=>this.loader.load(FOOD+name,g=>res(g.scene),undefined,rej));this.cache.set(name,obj);return obj.clone(true)}
  normalize(obj,target=1){const box=new THREE.Box3().setFromObject(obj),size=new THREE.Vector3();box.getSize(size);const max=Math.max(size.x,size.y,size.z)||1;obj.scale.setScalar(target/max);box.setFromObject(obj);const c=new THREE.Vector3();box.getCenter(c);obj.position.sub(c)}
  clearGroup(type){const g=this.stationGroups[type];while(g.children.length){const c=g.children.pop();c.traverse?.(n=>{if(n.geometry&&!n.userData.keep)n.geometry.dispose?.()})}}
  material(color){return new THREE.MeshStandardMaterial({color,roughness:.68})}
  proc(item){const g=new THREE.Group();if(item==='noodle'){for(let i=0;i<4;i++){const m=new THREE.Mesh(new THREE.TorusGeometry(.48+i*.05,.045,6,24,Math.PI*1.65),this.material(0xf3ca55));m.rotation.x=Math.PI/2;m.rotation.z=i*.65;m.position.y=i*.045;g.add(m)}}else if(item==='ricecake'){for(let i=0;i<7;i++){const m=new THREE.Mesh(new THREE.CapsuleGeometry(.1,.48,4,8),this.material(0xf4ded0));m.rotation.z=Math.PI/2;m.rotation.y=i*.62;m.position.set((i%3-1)*.28,.05,Math.floor(i/3)*.24-.22);g.add(m)}}else if(item==='fishcake'){for(let i=0;i<4;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(.45,.08,.34),this.material(0xe6ad54));m.rotation.y=i*.55;m.position.set((i%2-.5)*.35,.05,(Math.floor(i/2)-.5)*.32);g.add(m)}}else if(item==='cheese'){const m=new THREE.Mesh(new THREE.BoxGeometry(.92,.06,.75),this.material(0xf1cc4f));m.rotation.y=.2;g.add(m)}else if(item==='kimbap'){for(let i=0;i<6;i++){const m=new THREE.Mesh(new THREE.CylinderGeometry(.18,.18,.15,18),this.material(0x1f2d27));m.rotation.x=Math.PI/2;m.position.set((i%3-1)*.4,.12,(Math.floor(i/3)-.5)*.38);const core=new THREE.Mesh(new THREE.CylinderGeometry(.1,.1,.155,14),this.material(0xf2d05b));core.rotation.x=Math.PI/2;core.position.copy(m.position);g.add(m,core)}}else if(item==='dumpling'){for(let i=0;i<5;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(.22,14,9,0,Math.PI*2,0,Math.PI*.58),this.material(0xf1d1a2));m.scale.z=.72;m.position.set((i%3-1)*.38,.08,(Math.floor(i/3)-.4)*.4);g.add(m)}}return g}
  async objectFor(item){try{if(item==='egg'){const o=await this.load('egg-cooked.glb');this.normalize(o,.7);return o}if(item==='green'){const o=await this.load('leek.glb');this.normalize(o,.65);return o}if(item==='corndog'){const o=await this.load('corn-dog.glb');this.normalize(o,1.15);return o}}catch(_){}return this.proc(item)}
  async setStation(type,st){const token=++this.tokens[type];this.clearGroup(type);this.phaseLights[type].intensity=st.phase==='burnt'?2.6:st.phase==='ready'?1.7:st.phase==='cooking'?1.1:0;const items=[...st.chosen];for(let i=0;i<items.length;i++){const obj=await this.objectFor(items[i]);if(token!==this.tokens[type])return;const a=(i/items.length)*Math.PI*2+(i*.33),r=type==='side'?.48:.55;obj.position.set(Math.cos(a)*r,.72+(i%2)*.08,Math.sin(a)*r);obj.rotation.y=a;obj.userData.baseY=obj.position.y;this.stationGroups[type].add(obj)}if(st.phase==='burnt')this.stationGroups[type].traverse(n=>{if(n.isMesh&&n.material?.color)n.material.color.multiplyScalar(.48)})}
  celebrate(type,good){const light=this.phaseLights[type];light.color.setHex(good?0x80ff8d:0xff5c45);light.intensity=3;setTimeout(()=>{light.intensity=0},400)}
  reset(){for(const type of Object.keys(this.stationGroups)){this.tokens[type]++;this.clearGroup(type);this.phaseLights[type].intensity=0}}
  resize(){const p=this.canvas.parentElement,w=Math.max(1,p.clientWidth),h=Math.max(1,p.clientHeight);this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix()}
  animate(){requestAnimationFrame(()=>this.animate());const t=this.clock.getElapsedTime();for(const [type,g] of Object.entries(this.stationGroups)){g.children.forEach((o,i)=>{o.position.y=(o.userData.baseY||.72)+Math.sin(t*2.2+i)*.025;o.rotation.y+=.0025})}for(const p of this.steam){const st=stations[p.userData.station],active=this.preview||st?.phase==='cooking'||st?.phase==='ready';if(!active){p.material.opacity=0;continue}const speed=1.4;p.position.y=.7+((t*speed+p.userData.offset)%2.2);p.position.x=p.userData.baseX+Math.sin(t*1.4+p.userData.offset)*.09;p.position.z=p.userData.baseZ;p.material.opacity=Math.max(0,.34-(p.position.y-.7)*.13)}this.renderer.render(this.scene,this.camera)}
}

const kitchenScene=new BunsikScene($('#kitchenCanvas'));
const previewScene=new BunsikScene($('#previewCanvas'),true);
const fakeR={type:'ramen',order:{},chosen:new Set(['noodle','egg','green']),phase:'cooking',progress:.5,readyClock:0};
const fakeT={type:'tteok',order:{},chosen:new Set(['ricecake','fishcake','egg']),phase:'ready',progress:1,readyClock:0};
const fakeS={type:'side',order:{},chosen:new Set(['corndog']),phase:'prep',progress:0,readyClock:0};
previewScene.setStation('ramen',fakeR);previewScene.setStation('tteok',fakeT);previewScene.setStation('side',fakeS);

renderAllStations();renderQueue();renderStats();
state.raf=requestAnimationFrame(loop);

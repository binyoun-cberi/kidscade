import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const FOOD='../../assets/game/food/';
const PEOPLE='../../assets/game/characters/people/';
const MAX_PORTIONS=12;

const ingredients=[
  {id:'cabbage',name:'양배추',emoji:'🥬',price:900,weight:60,model:'cabbage.glb'},
  {id:'bokchoy',name:'청경채',emoji:'🥗',price:1100,weight:55,model:'leek.glb'},
  {id:'bean',name:'숙주',emoji:'🌱',price:700,weight:50,proc:'bean'},
  {id:'mushroom',name:'버섯',emoji:'🍄',price:1200,weight:45,model:'mushroom.glb'},
  {id:'tofu',name:'두부',emoji:'⬜',price:1000,weight:65,proc:'tofu'},
  {id:'sausage',name:'소시지',emoji:'🌭',price:1600,weight:50,model:'sausage.glb'},
  {id:'meat',name:'소고기',emoji:'🥩',price:2200,weight:55,model:'meat-raw.glb'},
  {id:'ricecake',name:'분모자',emoji:'🍥',price:1700,weight:70,proc:'ricecake'},
  {id:'noodle',name:'옥수수면',emoji:'🍜',price:1500,weight:60,proc:'noodle'},
  {id:'fishcake',name:'유부',emoji:'🟨',price:1300,weight:40,proc:'fishcake'}
];

const orderPool=[
  {name:'매운맛 도전자',face:'🔥',customer:'character-male-a.glb',must:['meat','mushroom','ricecake'],avoid:['tofu'],spice:3,budget:7000,desc:'고기와 버섯, 분모자는 꼭! 아주 맵게 부탁해요.'},
  {name:'채소 듬뿍 손님',face:'🥬',customer:'character-female-a.glb',must:['cabbage','bokchoy','bean'],avoid:['sausage'],spice:1,budget:5000,desc:'채소 위주로 가볍고 순하게 먹고 싶어요.'},
  {name:'분모자 러버',face:'🍥',customer:'character-female-b.glb',must:['ricecake','sausage'],avoid:['bean'],spice:2,budget:6500,desc:'쫀득한 분모자와 소시지가 꼭 필요해요.'},
  {name:'두부 마니아',face:'⬜',customer:'character-male-b.glb',must:['tofu','mushroom'],avoid:['meat'],spice:1,budget:5200,desc:'두부와 버섯이 주인공이면 좋겠어요.'},
  {name:'얼큰한 직장인',face:'💼',customer:'character-male-c.glb',must:['meat','noodle'],avoid:['bokchoy'],spice:2,budget:7200,desc:'고기랑 면 있는 얼큰한 한 그릇 주세요.'},
  {name:'첫 마라탕 입문자',face:'🙂',customer:'character-female-c.glb',must:['sausage','tofu'],avoid:['mushroom'],spice:0,budget:5000,desc:'처음이라 안 맵고 무난하게 부탁해요.'},
  {name:'버섯 애호가',face:'🍄',customer:'character-female-d.glb',must:['mushroom','mushroom','cabbage'],avoid:['fishcake'],spice:2,budget:6000,desc:'버섯 듬뿍! 정말 두 번 넣어 주세요.'},
  {name:'든든한 학생',face:'🎒',customer:'character-male-d.glb',must:['meat','sausage','noodle'],avoid:['bean'],spice:2,budget:8500,desc:'배부르게 먹고 싶어요. 고기, 소시지, 면 필수!'}
];

const spiceMeta=['0단계 순한맛','1단계 보통맛','2단계 얼큰맛','3단계 화끈맛'];
const $=s=>document.querySelector(s);
const state={score:0,served:0,total:6,orders:[],selected:null,bowl:[],spice:null,cooking:false,cooked:false,progress:0,cookTimer:null,waitTimer:null,streak:0,bestStreak:0};
const getIng=id=>ingredients.find(x=>x.id===id);
const count=(list,id)=>list.filter(x=>x===id).length;
const cost=()=>state.bowl.reduce((sum,id)=>sum+(getIng(id)?.price||0),0);
const weight=()=>state.bowl.reduce((sum,id)=>sum+(getIng(id)?.weight||0),0);

function sfx(key,options={}){try{window.KidscadeAudio?.play?.(key,options)}catch(_){}}
function toast(text,type='info'){const t=$('#toast');t.textContent=text;t.className=`toast ${type} show`;clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.className=`toast ${type}`,1700)}
function openModal(html){$('#modal').innerHTML=html;$('#modalBack').classList.add('show')}
function closeModal(){$('#modalBack').classList.remove('show')}
$('#modalBack').addEventListener('click',e=>{if(e.target.id==='modalBack')closeModal()});
function shuffle(a){return [...a].sort(()=>Math.random()-.5)}
function summarize(ids){const c={};ids.forEach(id=>c[id]=(c[id]||0)+1);return Object.entries(c).map(([id,n])=>`${getIng(id)?.name||id}${n>1?'x'+n:''}`).join(', ')}
function selectedOrder(){return state.orders.find(x=>x.id===state.selected)||null}

function makeOrders(){
  state.orders=shuffle(orderPool).slice(0,state.total).map((o,i)=>({...o,id:`o${i}`,done:false,wait:100}));
}

function renderOrders(){
  const root=$('#orderGrid');root.innerHTML='';
  state.orders.forEach(o=>{
    const b=document.createElement('button');
    b.className=`order ${state.selected===o.id?'active':''} ${o.done?'done':''}`;
    b.disabled=o.done;
    b.innerHTML=`<b>${o.name}</b><span class="wait ${o.wait<45?'low':''}">대기 ${Math.round(o.wait)}%</span><div class="desc">${o.desc}</div><div class="chips"><span class="chip good">필수 ${summarize(o.must)}</span><span class="chip bad">빼기 ${summarize(o.avoid)||'없음'}</span><span class="chip">${spiceMeta[o.spice]}</span><span class="chip">₩${o.budget.toLocaleString()}</span></div>`;
    b.onclick=()=>selectOrder(o.id);
    root.appendChild(b);
  });
}

function remainingNeeds(o){
  if(!o)return[];
  const have={};state.bowl.forEach(id=>have[id]=(have[id]||0)+1);
  const need={};o.must.forEach(id=>need[id]=(need[id]||0)+1);
  return Object.entries(need).map(([id,n])=>({id,n,have:have[id]||0,done:(have[id]||0)>=n}));
}

function renderFocus(){
  const o=selectedOrder();
  if(!o){$('#customerFace').textContent='🍲';$('#focusName').textContent='주문을 선택해 주세요';$('#focusText').textContent='왼쪽 주문 카드 중 하나를 고르면 손님이 조리대 앞에 나타납니다.';$('#focusNeed').innerHTML='';$('#patienceFill').style.width='0%';$('#patienceValue').textContent='-';return}
  $('#customerFace').textContent=o.face;
  $('#focusName').textContent=o.name;
  $('#focusText').textContent=`${spiceMeta[o.spice]} · 예산 ₩${o.budget.toLocaleString()} · 빼기 ${summarize(o.avoid)||'없음'}`;
  $('#focusNeed').innerHTML=remainingNeeds(o).map(x=>`<span class="need ${x.done?'done':''}">${getIng(x.id).name} ${Math.min(x.have,x.n)}/${x.n}</span>`).join('');
  $('#patienceFill').style.width=`${o.wait}%`;
  $('#patienceValue').textContent=`${Math.round(o.wait)}%`;
}

function renderIngredients(){
  const root=$('#ingredientGrid');root.innerHTML='';
  ingredients.forEach(i=>{
    const n=count(state.bowl,i.id),b=document.createElement('button');
    b.className=`ing ${n?'has':''}`;b.draggable=true;b.dataset.id=i.id;
    b.innerHTML=`<div class="emoji">${i.emoji}</div><div class="name">${i.name}</div><div class="meta">₩${i.price.toLocaleString()} · ${i.weight}g</div><div class="count ${n?'hot':''}">담은 수 ${n}</div>`;
    b.onclick=()=>addIngredient(i.id);
    b.ondragstart=e=>{e.dataTransfer.setData('text/plain',i.id);e.dataTransfer.effectAllowed='copy'};
    root.appendChild(b);
  });
}

function renderSpice(){
  const root=$('#spiceRow');root.innerHTML='';
  spiceMeta.forEach((label,i)=>{
    const b=document.createElement('button');b.className=`spice ${state.spice===i?'active':''}`;b.textContent=label;
    b.onclick=()=>{state.spice=i;sfx('collect.coin_pickup',{volume:.15,rate:1.25,cooldownMs:80});renderSpice();updateSummary();three.setSpice(i)};
    root.appendChild(b);
  });
}

function updateSummary(){
  const o=selectedOrder();
  $('#score').textContent=state.score;$('#served').textContent=state.served;$('#orderName').textContent=o?.name||'없음';$('#cost').textContent=cost().toLocaleString();$('#weight').textContent=weight();$('#spiceText').textContent=state.spice===null?'미선택':spiceMeta[state.spice];$('#itemCount').textContent=state.bowl.length;$('#combo').textContent=state.streak?`${state.streak} 연속 만족`:'정확하게 만들면 콤보!';
  $('#hint').textContent=!o?'주문을 선택해 주세요.':!state.bowl.length?'필수 재료를 확인하고 담아 주세요.':state.spice===null?'맵기를 선택해 주세요.':!state.cooked?'끓이기를 시작해 주세요.':'완성! 서빙할 수 있어요.';
  renderFocus();
}

function selectOrder(id){
  if(state.cooking)return toast('조리 중에는 주문을 바꿀 수 없어요.','bad');
  state.selected=id;state.bowl=[];state.spice=null;resetCook();
  renderOrders();renderIngredients();renderSpice();updateSummary();
  three.setIngredients([]);three.setSpice(1);three.setCustomer(selectedOrder());
}

function addIngredient(id){
  if(!state.selected)return toast('먼저 주문을 선택해 주세요.','bad');
  if(state.cooking)return toast('끓이는 중에는 재료를 바꿀 수 없어요.','bad');
  if(state.bowl.length>=MAX_PORTIONS)return toast(`한 그릇에는 최대 ${MAX_PORTIONS}번만 담을 수 있어요.`,'bad');
  state.bowl.push(id);
  sfx('collect.coin_pickup',{volume:.22,rate:1.08,rateJitter:.03,cooldownMs:55});
  renderIngredients();updateSummary();three.setIngredients(state.bowl,{dropLast:true});
}

function undoIngredient(){
  if(state.cooking||!state.bowl.length)return;
  state.bowl.pop();sfx('collect.coin_drop',{volume:.15,rate:1.15,cooldownMs:70});
  renderIngredients();updateSummary();three.setIngredients(state.bowl);
}

function clearBowl(){
  if(state.cooking)return toast('조리 중에는 그릇을 비울 수 없어요.','bad');
  state.bowl=[];state.spice=null;resetCook();renderIngredients();renderSpice();updateSummary();three.setIngredients([]);three.setSpice(1);
}

function resetCook(){
  if(state.cookTimer)clearInterval(state.cookTimer);state.cookTimer=null;state.cooking=false;state.cooked=false;state.progress=0;$('#cookFill').style.width='0%';three?.setCooking(false);
}

function startCook(){
  if(!state.selected)return toast('주문을 먼저 골라 주세요.','bad');
  if(!state.bowl.length)return toast('재료를 담아 주세요.','bad');
  if(state.spice===null)return toast('맵기를 골라 주세요.','bad');
  if(state.cooking||state.cooked)return;
  state.cooking=true;three.setCooking(true);sfx('combat.impact_heavy',{volume:.12,rate:1.45,cooldownMs:100});
  state.cookTimer=setInterval(()=>{
    state.progress=Math.min(100,state.progress+4);$('#cookFill').style.width=`${state.progress}%`;
    if(state.progress>=100){clearInterval(state.cookTimer);state.cookTimer=null;state.cooking=false;state.cooked=true;three.setCooking(false);three.pulseReady();sfx('success.cheer_yay',{volume:.4});toast('보글보글 완성! 이제 서빙하세요.','good');updateSummary()}
  },90);
  updateSummary();
}

function evaluate(o){
  let score=100,bonus=0,detail=[];const bc={},rc={};state.bowl.forEach(id=>bc[id]=(bc[id]||0)+1);o.must.forEach(id=>rc[id]=(rc[id]||0)+1);
  for(const [id,n] of Object.entries(rc)){const got=bc[id]||0;if(got>=n){bonus+=8;detail.push({good:true,text:`${getIng(id).name} 충족 +8`})}else{const p=(n-got)*12;score-=p;detail.push({good:false,text:`${getIng(id).name} 부족 -${p}`})}}
  for(const id of o.avoid){if(bc[id]){score-=14;detail.push({good:false,text:`빼 달라는 ${getIng(id).name} 포함 -14`})}}
  const over=cost()-o.budget;if(over<=0){bonus+=12;detail.push({good:true,text:'예산 안에서 완성 +12'})}else{const p=Math.min(24,Math.ceil(over/500)*4);score-=p;detail.push({good:false,text:`예산 초과 -${p}`})}
  const diff=Math.abs((state.spice??0)-o.spice);if(diff===0){bonus+=14;detail.push({good:true,text:'맵기 완벽 +14'})}else if(diff===1){bonus+=4;detail.push({good:true,text:'맵기 거의 맞음 +4'})}else{score-=diff*8;detail.push({good:false,text:`맵기 차이 -${diff*8}`})}
  const w=weight();if(w>=150&&w<=340){bonus+=6;detail.push({good:true,text:'적당한 양 +6'})}else{score-=8;detail.push({good:false,text:'양이 너무 적거나 많음 -8'})}
  const waitBonus=Math.round(o.wait/10);bonus+=waitBonus;detail.push({good:waitBonus>=6,text:`대기시간 보너스 +${waitBonus}`});
  score=Math.max(0,Math.min(150,score+bonus));const rank=score>=125?'S':score>=105?'A':score>=85?'B':score>=65?'C':'D';return{score,rank,detail};
}

function serve(){
  const o=selectedOrder();if(!o)return toast('주문을 선택해 주세요.','bad');if(!state.cooked)return toast('아직 조리가 끝나지 않았어요.','bad');
  const r=evaluate(o);state.score+=r.score;state.served++;o.done=true;
  const happy=r.score>=85;if(r.score>=105)state.streak++;else state.streak=0;state.bestStreak=Math.max(state.bestStreak,state.streak);
  three.reactCustomer(happy);three.servePulse(happy);
  if(happy){sfx('shop.purchase',{volume:.43});setTimeout(()=>sfx('success.cheer_yay',{volume:.34}),120)}else{sfx('failure.fail_sting',{volume:.45})}
  openModal(`<div class="modalTop"><div style="display:flex;gap:10px;align-items:center"><div class="grade">${r.rank}</div><div><h2 style="margin:0">${o.name} 서빙 결과</h2><div class="pill" style="display:inline-block;margin-top:7px">${happy?'만족한 손님':'조금 아쉬운 손님'}</div></div></div><button class="btn small" id="resultClose">다음 손님</button></div><div class="resultGrid"><div class="resultBox"><div>획득 점수</div><div class="scoreBig">${r.score}</div><div style="font-size:11px;color:var(--sub);font-weight:800;margin-top:6px">₩${cost().toLocaleString()} · ${weight()}g · 콤보 ${state.streak}</div></div><div class="resultBox"><b>세부 평가</b><ul>${r.detail.map(x=>`<li class="${x.good?'resultGood':'resultBad'}">${x.text}</li>`).join('')}</ul></div></div>`);
  $('#resultClose').onclick=()=>{closeModal();afterServe()};updateSummary();
}

function afterServe(){
  if(state.served>=state.total)return endDay();
  const next=state.orders.find(x=>!x.done);state.selected=next?.id||null;state.bowl=[];state.spice=null;resetCook();renderOrders();renderIngredients();renderSpice();updateSummary();three.setIngredients([]);three.setSpice(1);three.setCustomer(selectedOrder());
}

function endDay(){
  if(state.waitTimer)clearInterval(state.waitTimer);state.waitTimer=null;
  const title=state.score>=720?'전설의 마라 장인':state.score>=600?'인기 맛집 사장님':state.score>=480?'든든한 신입 사장님':'수련 중인 조리사';sfx('success.victory_fanfare',{volume:.55});
  openModal(`<div class="modalTop"><div><h2 style="margin:0">오늘 영업 종료!</h2><div class="pill" style="display:inline-block;margin-top:7px">${title}</div></div><button class="btn small primary" id="again">다시 영업</button></div><div class="resultGrid"><div class="resultBox"><div>최종 점수</div><div class="scoreBig">${state.score}</div></div><div class="resultBox"><div>최고 만족 콤보</div><div class="scoreBig">${state.bestStreak}</div></div></div>`);
  $('#again').onclick=()=>{closeModal();startGame()};
}

function tickPatience(){
  const activeId=state.selected;
  state.orders.forEach(o=>{if(o.done)return;const loss=o.id===activeId?.id?.toString()?0.35:o.id===activeId?0.35:1;o.wait=Math.max(20,o.wait-loss)});
  renderOrders();renderFocus();
}

function startGame(){
  state.score=0;state.served=0;state.selected=null;state.bowl=[];state.spice=null;state.streak=0;state.bestStreak=0;resetCook();makeOrders();$('#start').classList.remove('active');$('#game').classList.add('active');selectOrder(state.orders[0].id);sfx('shop.register_open',{volume:.35});toast('영업 시작! 첫 손님이 기다리고 있어요.','good');if(state.waitTimer)clearInterval(state.waitTimer);state.waitTimer=setInterval(tickPatience,1600);
}

function help(){
  openModal(`<div class="modalTop"><div><h2 style="margin:0">게임 방법</h2><p style="margin:5px 0;color:var(--sub);font-weight:800">주문 → 재료 → 맵기 → 끓이기 → 서빙</p></div><button class="btn small" id="helpClose">닫기</button></div><div class="resultGrid"><div class="resultBox"><b>재료 고르기</b><ul><li>재료 카드를 클릭하거나 3D 냄비로 드래그합니다.</li><li>같은 재료를 두 번 이상 담을 수도 있습니다.</li><li>냄비에는 최대 ${MAX_PORTIONS}번까지 담을 수 있습니다.</li></ul></div><div class="resultBox"><b>점수 기준</b><ul><li>필수 재료·금지 재료·예산·맵기·양·대기시간을 모두 봅니다.</li><li>105점 이상이면 만족 콤보가 이어집니다.</li></ul></div></div>`);$('#helpClose').onclick=closeModal;
}

$('#startBtn').onclick=startGame;$('#sampleBtn').onclick=()=>toast('예: 고기·버섯·분모자 / 3단계 / 두부 빼기','info');$('#help').onclick=help;$('#cookBtn').onclick=startCook;$('#serveBtn').onclick=serve;$('#undoBtn').onclick=undoIngredient;$('#clearBtn').onclick=clearBowl;$('#cookBtnMobile').onclick=startCook;$('#serveBtnMobile').onclick=serve;
const stage=$('#stage');stage.ondragover=e=>{e.preventDefault();stage.classList.add('dragover')};stage.ondragleave=()=>stage.classList.remove('dragover');stage.ondrop=e=>{e.preventDefault();stage.classList.remove('dragover');const id=e.dataTransfer.getData('text/plain');if(getIng(id))addIngredient(id)};

class MaratangScene{
  constructor(canvas,{preview=false}={}){
    this.canvas=canvas;this.preview=preview;this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(37,1,.1,100);this.camera.position.set(preview?0:.25,5.55,preview?8.4:9.25);this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.shadowMap.enabled=true;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;this.loader=new GLTFLoader();this.cache=new Map();this.clock=new THREE.Clock();this.spice=1;this.cooking=false;this.renderToken=0;this.customerToken=0;this.readyUntil=0;this.reactionUntil=0;this.reactionGood=true;
    this.potRoot=new THREE.Group();this.potRoot.position.x=preview?0:-.82;this.foodGroup=new THREE.Group();this.potRoot.add(this.foodGroup);this.customerRoot=new THREE.Group();this.customerRoot.position.set(2.55,-.15,-1.15);this.scene.add(this.potRoot,this.customerRoot);this.steam=[];this.bubbles=[];this.makeWorld();this.resize();new ResizeObserver(()=>this.resize()).observe(canvas.parentElement);this.animate();
  }
  makeWorld(){
    this.scene.add(new THREE.HemisphereLight(0xfff5e8,0x5a3c31,2.0));const d=new THREE.DirectionalLight(0xffffff,2.5);d.position.set(5,8,6);d.castShadow=true;this.scene.add(d);const fill=new THREE.PointLight(0xff8d6e,1.15,16);fill.position.set(-4,3,5);this.scene.add(fill);
    const floor=new THREE.Mesh(new THREE.CylinderGeometry(5.5,5.7,.45,48),new THREE.MeshStandardMaterial({color:0x9b5a36,roughness:.72}));floor.position.y=-.52;floor.receiveShadow=true;this.scene.add(floor);
    if(!this.preview){const back=new THREE.Mesh(new THREE.PlaneGeometry(12,6),new THREE.MeshStandardMaterial({color:0xffeadf,roughness:1}));back.position.set(0,2.4,-3.2);this.scene.add(back);const counter=new THREE.Mesh(new THREE.BoxGeometry(3.2,.45,1.25),new THREE.MeshStandardMaterial({color:0x6b3829,roughness:.7}));counter.position.set(2.55,.02,-.15);counter.receiveShadow=true;this.scene.add(counter)}
    this.broth=new THREE.Mesh(new THREE.CylinderGeometry(2.13,2.13,.15,64),new THREE.MeshStandardMaterial({color:0xe66b42,roughness:.3,metalness:.03,emissive:0x4d0d05,emissiveIntensity:.08}));this.broth.position.y=.82;this.potRoot.add(this.broth);
    this.loadPath(FOOD+'pot.glb').then(obj=>{this.normalizeCentered(obj,5.2);obj.position.y=-.1;obj.traverse(x=>{if(x.isMesh){x.castShadow=true;x.receiveShadow=true}});this.potRoot.add(obj)}).catch(()=>this.makeFallbackPot());
    this.loadPath(FOOD+'cooking-spoon.glb').then(obj=>{this.normalizeCentered(obj,1.65);obj.position.set(2.25,1.05,-.25);obj.rotation.set(.15,0,-.5);this.potRoot.add(obj)}).catch(()=>{});
    this.loadPath(FOOD+'chopstick.glb').then(obj=>{this.normalizeCentered(obj,1.7);obj.position.set(-2.1,1.0,.35);obj.rotation.set(.2,.5,.65);this.potRoot.add(obj)}).catch(()=>{});
    for(let i=0;i<14;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(.07,8,8),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.12}));m.position.set((Math.random()-.5)*2.1,.95+Math.random()*.25,(Math.random()-.5)*2);m.userData.base=m.position.clone();this.steam.push(m);this.potRoot.add(m)}
    for(let i=0;i<16;i++){const b=new THREE.Mesh(new THREE.SphereGeometry(.055+Math.random()*.035,8,6),new THREE.MeshStandardMaterial({color:0xffc38e,transparent:true,opacity:.65,roughness:.15}));const a=Math.random()*Math.PI*2,r=Math.sqrt(Math.random())*1.75;b.position.set(Math.cos(a)*r,.91,Math.sin(a)*r);b.userData.phase=Math.random()*10;this.bubbles.push(b);this.potRoot.add(b)}
    this.camera.lookAt(0,.75,0);
  }
  makeFallbackPot(){const body=new THREE.Mesh(new THREE.CylinderGeometry(2.55,2.2,1.7,48,1,true),new THREE.MeshStandardMaterial({color:0x5c6670,metalness:.62,roughness:.3,side:THREE.DoubleSide}));body.position.y=.05;this.potRoot.add(body);const rim=new THREE.Mesh(new THREE.TorusGeometry(2.55,.13,12,64),new THREE.MeshStandardMaterial({color:0xaeb7bf,metalness:.8,roughness:.2}));rim.rotation.x=Math.PI/2;rim.position.y=.87;this.potRoot.add(rim)}
  async loadPath(url){let p=this.cache.get(url);if(!p){p=new Promise((resolve,reject)=>this.loader.load(url,g=>resolve(g.scene),undefined,reject));this.cache.set(url,p)}const base=await p;return base.clone(true)}
  normalizeCentered(obj,target=.8){obj.updateMatrixWorld(true);let box=new THREE.Box3().setFromObject(obj),size=new THREE.Vector3();box.getSize(size);const scale=target/(Math.max(size.x,size.y,size.z)||1);obj.scale.multiplyScalar(scale);obj.updateMatrixWorld(true);box=new THREE.Box3().setFromObject(obj);const center=new THREE.Vector3();box.getCenter(center);obj.position.x-=center.x;obj.position.y-=center.y;obj.position.z-=center.z}
  normalizeGround(obj,targetHeight=3){obj.updateMatrixWorld(true);let box=new THREE.Box3().setFromObject(obj),size=new THREE.Vector3();box.getSize(size);const scale=targetHeight/(size.y||1);obj.scale.multiplyScalar(scale);obj.updateMatrixWorld(true);box=new THREE.Box3().setFromObject(obj);const center=new THREE.Vector3();box.getCenter(center);obj.position.x-=center.x;obj.position.z-=center.z;obj.position.y-=box.min.y}
  proc(type){const g=new THREE.Group(),mat=c=>new THREE.MeshStandardMaterial({color:c,roughness:.7});if(type==='tofu'){for(let i=0;i<2;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(.55,.34,.55),mat(0xf8e2b9));m.position.x=(i-.5)*.4;g.add(m)}}else if(type==='fishcake'){for(let i=0;i<2;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(.65,.12,.45),mat(0xf0bf5d));m.rotation.y=i*.7;g.add(m)}}else if(type==='ricecake'){for(let i=0;i<3;i++){const m=new THREE.Mesh(new THREE.CapsuleGeometry(.13,.7,5,8),mat(0xf7e2cf));m.rotation.z=Math.PI/2;m.rotation.y=i*.55;m.position.set((i-1)*.22,0,(i%2)*.18);g.add(m)}}else if(type==='noodle'){for(let i=0;i<4;i++){const m=new THREE.Mesh(new THREE.TorusGeometry(.32+i*.045,.045,6,22,Math.PI*1.5),mat(0xf2c24d));m.rotation.x=Math.PI/2;m.rotation.z=i*.55;m.position.y=i*.05;g.add(m)}}else{for(let i=0;i<5;i++){const stem=new THREE.Mesh(new THREE.CylinderGeometry(.025,.03,.55,6),mat(0xf3eee1));stem.rotation.z=(i-2)*.18;stem.position.x=(i-2)*.1;const leaf=new THREE.Mesh(new THREE.SphereGeometry(.1,8,6),mat(0xbadf79));leaf.scale.set(1.4,.5,1);leaf.position.set(stem.position.x,.3,0);g.add(stem,leaf)}}g.traverse(x=>{if(x.isMesh)x.castShadow=true});return g}
  setSpice(level){this.spice=level;const colors=[0xf3bd7c,0xee9459,0xe76a3e,0xcf3d2f];this.broth.material.color.setHex(colors[level??1]);this.broth.material.emissiveIntensity=.04+(level??1)*.035}
  setCooking(v){this.cooking=v}
  pulseReady(){this.readyUntil=this.clock.getElapsedTime()+1.0}
  servePulse(good){this.readyUntil=this.clock.getElapsedTime()+.7;this.reactionGood=good}
  reactCustomer(good){this.reactionGood=good;this.reactionUntil=this.clock.getElapsedTime()+1.1}
  async setCustomer(order){if(this.preview)return;const token=++this.customerToken;while(this.customerRoot.children.length)this.customerRoot.remove(this.customerRoot.children[0]);if(!order)return;try{const obj=await this.loadPath(PEOPLE+order.customer);if(token!==this.customerToken)return;this.normalizeGround(obj,3.15);obj.rotation.y=-.08;obj.traverse(x=>{if(x.isMesh)x.castShadow=true});this.customerRoot.add(obj)}catch(_){}}
  async setIngredients(ids,{dropLast=false}={}){const token=++this.renderToken;const shown=ids.slice(-MAX_PORTIONS);const loaded=await Promise.all(shown.map(async(id)=>{const ing=getIng(id);try{const obj=ing.model?await this.loadPath(FOOD+ing.model):this.proc(ing.proc);if(ing.model)this.normalizeCentered(obj,.82);return obj}catch(_){return this.proc(ing.proc||'tofu')}}));if(token!==this.renderToken)return;while(this.foodGroup.children.length)this.foodGroup.remove(this.foodGroup.children[0]);loaded.forEach((obj,i)=>{const a=(i/Math.max(1,loaded.length))*Math.PI*2+(i%2)*.38,r=.38+.32*(i%4);const targetY=1.0+(i%2)*.08;obj.position.set(Math.cos(a)*r,targetY,Math.sin(a)*r);obj.rotation.y=a+Math.PI/2;obj.userData.baseY=targetY;if(dropLast&&i===loaded.length-1){obj.position.y=targetY+2.2;obj.userData.dropStart=performance.now()}this.foodGroup.add(obj)})}
  resize(){const p=this.canvas.parentElement,w=Math.max(1,p.clientWidth),h=Math.max(1,p.clientHeight);this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix()}
  animate(){requestAnimationFrame(()=>this.animate());const t=this.clock.getElapsedTime(),now=performance.now();this.foodGroup.children.forEach((o,i)=>{const target=o.userData.baseY||1;if(o.userData.dropStart){const p=Math.min(1,(now-o.userData.dropStart)/360),ease=1-Math.pow(1-p,3);o.position.y=target+(1-ease)*2.2;if(p>=1){o.userData.dropStart=0;o.position.y=target}}else{o.position.y=target+Math.sin(t*2+i)*.035}o.rotation.y+=.0025});this.steam.forEach((s,i)=>{const speed=this.cooking?1.8:.35;const phase=(t*speed+i*.37)%2.2;s.position.y=.95+phase;s.material.opacity=this.cooking?Math.max(0,.5-phase*.2):.055;s.position.x=s.userData.base.x+Math.sin(t+i)*.08});this.bubbles.forEach((b,i)=>{const power=this.cooking?1:.25,phase=Math.sin(t*(4.5+power*3)+b.userData.phase);const sc=.55+(phase+1)*.25*power;b.scale.setScalar(sc);b.position.y=.91+Math.max(0,phase)*.045*power;b.material.opacity=.2+.5*power});const pulse=t<this.readyUntil?1+Math.sin(t*22)*.018:1;this.potRoot.scale.setScalar(pulse);if(this.customerRoot.children.length){if(t<this.reactionUntil){const k=Math.max(0,(this.reactionUntil-t)/1.1);this.customerRoot.position.y=-.15+(this.reactionGood?Math.abs(Math.sin(t*11))*.18*k:0);this.customerRoot.rotation.z=this.reactionGood?Math.sin(t*9)*.035*k:-.08*k}else{this.customerRoot.position.y=-.15;this.customerRoot.rotation.z=0}}this.broth.rotation.y=t*.14;this.renderer.render(this.scene,this.camera)}
}

const three=new MaratangScene($('#three'));
const preview=new MaratangScene($('#previewCanvas'),{preview:true});preview.setSpice(3);preview.setIngredients(['cabbage','mushroom','sausage','meat','ricecake']);
renderIngredients();renderSpice();updateSummary();

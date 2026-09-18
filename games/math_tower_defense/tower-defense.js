/* Kidscade Divisor Tower Defense 3D - clean rebuild v1 */
(function(){
'use strict';

const THREE=window.THREE,GLTFLoader=window.GLTFLoader;
if(!THREE||!GLTFLoader) throw new Error('Three.js runtime is not ready');

const $=id=>document.getElementById(id);
const canvas=$('world'),assetStatus=$('assetStatus');
const GRID_W=16,GRID_H=10,CELL=1.05;
const TOWERS={
  SUB1:{id:'SUB1',name:'-1 마무리 포탑',short:'−1',cost:80,unlock:1,range:2.1,cool:.45,color:'#fb7185',model:'sub',op:'-1'},
  DIV2:{id:'DIV2',name:'÷2 레일건',short:'÷2',cost:150,unlock:1,range:2.25,cool:.85,color:'#38bdf8',model:'div2',op:'÷2',value:2},
  DIV3:{id:'DIV3',name:'÷3 플라즈마',short:'÷3',cost:210,unlock:2,range:2.25,cool:.95,color:'#22c55e',model:'div3',op:'÷3',value:3},
  ADD1:{id:'ADD1',name:'+1 EMP',short:'+1',cost:120,unlock:3,range:2.0,cool:1.05,color:'#fbbf24',model:'add',op:'+1'},
  DIV5:{id:'DIV5',name:'÷5 미사일',short:'÷5',cost:320,unlock:5,range:2.35,cool:1.05,color:'#a78bfa',model:'div5',op:'÷5',value:5}
};
const WAVES=[
  {nums:[2,3,4],count:6,mission:'÷2로 짝수를 줄이고, -1로 마지막 1을 마무리하세요.'},
  {nums:[6,8,9],count:8,mission:'÷3이 열렸습니다. 9와 6을 빠르게 줄여 보세요.'},
  {nums:[5,7,11],count:8,mission:'+1로 소수·홀수를 바꾼 뒤 나누기 타워로 연결하세요.'},
  {nums:[10,12,15,18],count:10,mission:'÷2와 ÷3을 섞어 여러 번 나누세요.'},
  {nums:[20,25,30],count:10,mission:'÷5가 열렸습니다. 큰 수를 먼저 작게 줄여 보세요.'},
  {nums:[13,14,21,27],count:11,mission:'소수는 +1 또는 -1로 바꾸고 합성수는 나누세요.'},
  {nums:[24,28,35,40],count:12,mission:'길 초반에는 나누기, 코어 앞에는 -1을 추천합니다.'},
  {nums:[17,19,23,29],count:12,mission:'소수 러시입니다. +1과 -1을 함께 사용하세요.'}
];
const PATH=(()=>{
  const a=[],add=(x,y)=>{const l=a[a.length-1];if(!l||l.x!==x||l.y!==y)a.push({x,y})};
  for(let x=0;x<=4;x++)add(x,5);for(let y=5;y>=2;y--)add(4,y);for(let x=4;x<=11;x++)add(x,2);for(let y=2;y<=8;y++)add(11,y);for(let x=11;x<=15;x++)add(x,8);return a
})();
const PATH_SET=new Set(PATH.map(p=>p.x+','+p.y));
const RECOMMENDED=[{id:'DIV2',x:6,y:4},{id:'SUB1',x:13,y:7},{id:'SUB1',x:3,y:6}];

const runtimeBase=(()=>{try{return new URL('.',document.currentScript?.src||location.href)}catch(_){return new URL('.',location.href)}})();
const MODEL_ROOT=new URL('../../assets/game/3d/',runtimeBase);
const modelUrl=p=>new URL(p,MODEL_ROOT).href;
const MODELS={
  sub:modelUrl('weapons/scifi-turrets/gatelng-gun-turret.glb'),
  div2:modelUrl('weapons/scifi-turrets/rail-gun-turret.glb'),
  div3:modelUrl('weapons/scifi-turrets/plasma-turret.glb'),
  add:modelUrl('weapons/scifi-turrets/emp-turret.glb'),
  div5:modelUrl('weapons/scifi-turrets/missile-turret.glb'),
  blob:modelUrl('characters/monsters/ultimate-monsters-bundle/green-blob.glb'),
  spiky:modelUrl('characters/monsters/ultimate-monsters-bundle/green-spiky-blob.glb'),
  golem:modelUrl('characters/monsters/ultimate-monsters-bundle/goleling.glb'),
  evolved:modelUrl('characters/monsters/ultimate-monsters-bundle/goleling-evolved.glb'),
  ghost:modelUrl('characters/monsters/ultimate-monsters-bundle/ghost-skull.glb'),
  orc:modelUrl('characters/monsters/ultimate-monsters-bundle/orc-enemy.glb'),
  mushroom:modelUrl('characters/monsters/ultimate-monsters-bundle/mushroom-king.glb')
};

let scene,camera,renderer,loader,clock,battlefield,towerGroup,enemyGroup,fxGroup,ui3dGroup,core;
let hoverTile,rangeRing,raycaster,mouse,groundPlane;
const modelCache=new Map(),towerNodes=new Map(),enemyNodes=new Map();
let started=false,assetsLoading=false,audioCtx=null,soundOn=true,toastTimer=0,selectedTower=null,selectedBuilt=null,hoverCell=null;

const state={
  wave:1,money:520,lives:20,maxLives:20,kills:0,best:parseInt(localStorage.getItem('numTD_best')||'1',10),
  towers:[],enemies:[],spawnQueue:[],spawnTimer:0,waveActive:false,paused:false,speed:1,
  beams:[],texts:[],particles:[],gameOver:false,autoUsed:false
};

function isPrime(n){if(n<=1)return false;if(n<=3)return true;if(n%2===0||n%3===0)return false;for(let i=5;i*i<=n;i+=6)if(n%i===0||n%(i+2)===0)return false;return true}
function waveConfig(){if(state.wave<=WAVES.length)return WAVES[state.wave-1];const start=10+state.wave*3;return{nums:[start,start+2,start+5,start+8],count:Math.min(18,10+state.wave),mission:'복합 웨이브입니다. 나누기 타워로 줄이고 -1로 마무리하세요.'}}
function cellWorld(x,y,h=0){return new THREE.Vector3((x-(GRID_W-1)/2)*CELL,h,(y-(GRID_H-1)/2)*CELL)}
function isPath(x,y){return PATH_SET.has(x+','+y)}
function towerAt(x,y){return state.towers.find(t=>t.x===x&&t.y===y)}
function colorHex(css){return parseInt(css.slice(1),16)}
function initAudio(){if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume()}
function tone(freq,dur=.06,type='sine',gain=.025){if(!soundOn)return;initAudio();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(.0001,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(gain,audioCtx.currentTime+.01);g.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+dur);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+dur+.02)}
const sfx={click:()=>tone(430,.05,'square'),build:()=>tone(650,.08,'triangle',.035),shoot:()=>tone(880,.035,'square',.016),hit:()=>tone(210,.08,'sawtooth',.025),clear:()=>{tone(523,.12,'triangle',.04);setTimeout(()=>tone(784,.14,'triangle',.04),90)}};

function box(w,h,d,color,rough=.85){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:rough,metalness:.04}));m.castShadow=true;m.receiveShadow=true;return m}
function ring(radius,color,opacity=.35){const m=new THREE.Mesh(new THREE.RingGeometry(Math.max(.02,radius-.045),radius,48),new THREE.MeshBasicMaterial({color,transparent:true,opacity,side:THREE.DoubleSide,depthWrite:false}));m.rotation.x=-Math.PI/2;return m}
function normalize(obj,target=1){obj.updateMatrixWorld(true);let b=new THREE.Box3().setFromObject(obj),s=b.getSize(new THREE.Vector3()),base=Math.max(s.x,s.y,s.z)||1;obj.scale.multiplyScalar(target/base);obj.updateMatrixWorld(true);b=new THREE.Box3().setFromObject(obj);const c=b.getCenter(new THREE.Vector3());obj.position.x-=c.x;obj.position.z-=c.z;obj.position.y-=b.min.y;return obj}
function prep(obj){obj.traverse(n=>{if(!n.isMesh)return;n.castShadow=true;n.receiveShadow=true;if(n.material){const a=Array.isArray(n.material)?n.material:[n.material];const b=a.map(src=>{const m=src.clone();m.roughness=Math.max(.42,m.roughness??.7);m.metalness=Math.min(.28,m.metalness??0);m.needsUpdate=true;return m});n.material=Array.isArray(n.material)?b:b[0]}});return obj}
function cloneModel(key,target=1){const g=modelCache.get(key);if(!g)return null;return normalize(prep(g.scene.clone(true)),target)}
function loadModel(key,url,timeout=8000){return new Promise(resolve=>{let done=false;const finish=v=>{if(done)return;done=true;resolve(v)};const timer=setTimeout(()=>finish(null),timeout);loader.load(url,g=>{clearTimeout(timer);modelCache.set(key,g);finish(g)},undefined,()=>{clearTimeout(timer);finish(null)})})}

function textSprite(text,sub='',color='#ffffff',scale=1){
  const c=document.createElement('canvas');c.width=256;c.height=128;const x=c.getContext('2d');
  x.fillStyle='rgba(3,9,20,.9)';x.fillRect(10,10,236,108);x.strokeStyle=color;x.lineWidth=6;x.strokeRect(10,10,236,108);
  x.fillStyle='#fff';x.textAlign='center';x.textBaseline='middle';x.font='900 52px system-ui';x.fillText(String(text),128,57);
  if(sub){x.fillStyle=color;x.font='900 18px system-ui';x.fillText(sub,128,96)}
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false}));s.scale.set(1.3*scale,.65*scale,1);s.renderOrder=40;return s
}
function opSprite(text,color){return textSprite(text,'',color,.62)}

function initThree(){
  scene=new THREE.Scene();scene.background=new THREE.Color(0x040915);scene.fog=new THREE.Fog(0x040915,18,38);
  camera=new THREE.PerspectiveCamera(44,innerWidth/innerHeight,.05,70);
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));renderer.setSize(innerWidth,innerHeight,false);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
  scene.add(new THREE.HemisphereLight(0xbfe9ff,0x08111d,2.4));const sun=new THREE.DirectionalLight(0xffffff,3);sun.position.set(-9,16,10);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-14;sun.shadow.camera.right=14;sun.shadow.camera.top=14;sun.shadow.camera.bottom=-14;scene.add(sun);const rim=new THREE.DirectionalLight(0x7c3aed,.9);rim.position.set(9,7,-8);scene.add(rim);
  battlefield=new THREE.Group();towerGroup=new THREE.Group();enemyGroup=new THREE.Group();fxGroup=new THREE.Group();ui3dGroup=new THREE.Group();scene.add(battlefield,towerGroup,enemyGroup,fxGroup,ui3dGroup);
  loader=new GLTFLoader();clock=new THREE.Clock();raycaster=new THREE.Raycaster();mouse=new THREE.Vector2();groundPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
  buildBoard();resize();addEventListener('resize',resize);
  canvas.addEventListener('pointermove',onPointerMove);canvas.addEventListener('pointerleave',()=>{hoverCell=null;syncSelection()});canvas.addEventListener('pointerdown',onPointerDown);
  loadAssets();
  requestAnimationFrame(loop);
}
function resize(){
  renderer.setSize(innerWidth,innerHeight,false);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));camera.aspect=innerWidth/Math.max(1,innerHeight);
  const portrait=innerHeight>innerWidth*1.15;camera.fov=portrait?48:43;camera.updateProjectionMatrix();
  if(portrait)camera.position.set(10.8,18.5,17.2);else camera.position.set(11.5,14.2,13.7);
  camera.lookAt(0,.25,.35)
}

function buildBoard(){
  const ground=box(GRID_W*CELL+.9,.14,GRID_H*CELL+.9,0x07111f,.98);ground.position.y=-.09;battlefield.add(ground);
  for(let y=0;y<GRID_H;y++)for(let x=0;x<GRID_W;x++){
    const path=isPath(x,y),tile=box(CELL*.93,path?.13:.07,CELL*.93,path?0x123653:((x+y)%2?0x0a1728:0x0d1e31),.9);const p=cellWorld(x,y,path?.035:.005);tile.position.copy(p);battlefield.add(tile);
  }
  const railMat=new THREE.LineBasicMaterial({color:0x38bdf8,transparent:true,opacity:.55}),pts=PATH.map(p=>cellWorld(p.x,p.y,.12)),line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),railMat);battlefield.add(line);
  for(let x=0;x<=GRID_W;x++){const g=box(.012,.014,GRID_H*CELL,0x153450);g.position.set((x-GRID_W/2)*CELL,.052,0);battlefield.add(g)}
  for(let y=0;y<=GRID_H;y++){const g=box(GRID_W*CELL,.014,.012,0x153450);g.position.set(0,.052,(y-GRID_H/2)*CELL);battlefield.add(g)}
  const start=PATH[0],portal=new THREE.Group(),r1=ring(.45,0x67e8f9,.9),r2=ring(.29,0xffffff,.38);r1.position.y=.12;r2.position.y=.13;portal.add(r1,r2);portal.position.copy(cellWorld(start.x,start.y,0));battlefield.add(portal);
  const end=PATH[PATH.length-1];core=new THREE.Group();const base=new THREE.Mesh(new THREE.CylinderGeometry(.48,.6,.28,8),new THREE.MeshStandardMaterial({color:0x164b72,roughness:.4,metalness:.24}));base.position.y=.15;const orb=new THREE.Mesh(new THREE.IcosahedronGeometry(.34,1),new THREE.MeshStandardMaterial({color:0x38bdf8,emissive:0x0ea5e9,emissiveIntensity:1.6,roughness:.2}));orb.position.y=.68;const cr= new THREE.Mesh(new THREE.TorusGeometry(.49,.045,10,36),new THREE.MeshBasicMaterial({color:0x67e8f9}));cr.rotation.x=Math.PI/2;cr.position.y=.56;core.add(base,orb,cr);core.userData={orb,ring:cr};core.position.copy(cellWorld(end.x,end.y,0));battlefield.add(core);
  hoverTile=box(CELL*.88,.04,CELL*.88,0x22c55e);hoverTile.material.transparent=true;hoverTile.material.opacity=.3;hoverTile.visible=false;ui3dGroup.add(hoverTile);rangeRing=ring(1,0xffffff,.16);rangeRing.visible=false;ui3dGroup.add(rangeRing)
}

async function loadAssets(){
  if(assetsLoading)return;assetsLoading=true;assetStatus.textContent='3D 모델 불러오는 중…';
  const results=await Promise.allSettled(Object.entries(MODELS).map(([k,u])=>loadModel(k,u)));
  assetStatus.textContent='3D 모델 준비 완료';
  setTimeout(()=>assetStatus.style.opacity='.35',1800);
  for(const [t,n] of [...towerNodes]){towerGroup.remove(n);towerNodes.delete(t)}
  for(const [e,n] of [...enemyNodes]){enemyGroup.remove(n);enemyNodes.delete(e)}
}

function enemyKey(value){
  if(value>=35)return 'orc';if(value>=25)return 'evolved';if(isPrime(value))return 'ghost';if(value%5===0)return 'golem';if(value%3===0)return 'spiky';if(value%2===0)return 'blob';return 'mushroom'
}
function makeEnemyNode(e){
  const root=new THREE.Group(),key=enemyKey(e.max),model=cloneModel(key,key==='orc'?1.05:key==='evolved'?1:.8);
  if(model)root.add(model);else{const m=new THREE.Mesh(new THREE.IcosahedronGeometry(.34,1),new THREE.MeshStandardMaterial({color:colorHex(enemyColor(e.hp)),emissive:0x07111f}));m.position.y=.36;root.add(m)}
  const halo=ring(.43,colorHex(enemyColor(e.hp)),.44);halo.position.y=.03;root.add(halo);root.userData.halo=halo;
  const label=textSprite(e.hp,isPrime(e.hp)?'소수':'',enemyColor(e.hp),.95);label.position.y=1.13;root.add(label);root.userData.label=label;root.userData.hp=e.hp;
  enemyGroup.add(root);enemyNodes.set(e,root);return root
}
function refreshEnemyLabel(e,node){
  if(node.userData.hp===e.hp)return;const old=node.userData.label;if(old){node.remove(old);old.material.map?.dispose();old.material.dispose()}
  const label=textSprite(e.hp,isPrime(e.hp)?'소수':'',enemyColor(e.hp),.95);label.position.y=1.13;node.add(label);node.userData.label=label;node.userData.hp=e.hp;node.userData.halo.material.color.setHex(colorHex(enemyColor(e.hp)))
}
function makeTowerNode(t){
  const root=new THREE.Group(),def=TOWERS[t.id],base=new THREE.Mesh(new THREE.CylinderGeometry(.42,.52,.2,10),new THREE.MeshStandardMaterial({color:0x14283d,roughness:.45,metalness:.25}));base.position.y=.11;root.add(base);
  const rr=ring(.48,colorHex(def.color),.6);rr.position.y=.21;root.add(rr);
  const model=cloneModel(def.model,1.02);if(model){model.position.y=.21;root.add(model);root.userData.model=model}else{const f=box(.46,.58,.46,colorHex(def.color),.4);f.position.y=.51;root.add(f)}
  const label=opSprite(def.short,def.color);label.position.y=1.25;root.add(label);towerGroup.add(root);towerNodes.set(t,root);return root
}
function enemyColor(n){if(isPrime(n))return '#fb7185';if(n%5===0)return '#a78bfa';if(n%3===0)return '#22c55e';if(n%2===0)return '#38bdf8';return '#e2e8f0'}

function pointerCell(ev){
  const r=canvas.getBoundingClientRect();mouse.x=((ev.clientX-r.left)/r.width)*2-1;mouse.y=-((ev.clientY-r.top)/r.height)*2+1;raycaster.setFromCamera(mouse,camera);const pt=new THREE.Vector3();if(!raycaster.ray.intersectPlane(groundPlane,pt))return null;
  return{x:Math.round(pt.x/CELL+(GRID_W-1)/2),y:Math.round(pt.z/CELL+(GRID_H-1)/2)}
}
function validCell(p){return p&&p.x>=0&&p.y>=0&&p.x<GRID_W&&p.y<GRID_H}
function onPointerMove(e){if(!started)return;const p=pointerCell(e);hoverCell=validCell(p)?p:null;syncSelection()}
function onPointerDown(e){if(!started||state.gameOver)return;initAudio();const p=pointerCell(e);if(!validCell(p))return;const t=towerAt(p.x,p.y);if(t){selectedBuilt=t;selectedTower=null;syncDeck();syncSelectedPanel();syncSelection();return}if(selectedTower)placeTower(selectedTower,p.x,p.y);else{selectedBuilt=null;syncSelectedPanel();syncSelection()}}

function canHit(t,e){
  if(e.hp<=0)return false;if(t.id==='SUB1')return true;if(t.id==='ADD1')return e.hp>1&&(isPrime(e.hp)||e.hp%2===1)&&e.hp<80;if(t.id.startsWith('DIV'))return e.hp>1&&e.hp%TOWERS[t.id].value===0;return false
}
function placeTower(id,x,y){
  const def=TOWERS[id];if(state.wave<def.unlock)return toast(def.unlock+'웨이브부터 사용할 수 있어요.');if(isPath(x,y))return toast('길 위에는 설치할 수 없어요.');if(towerAt(x,y))return toast('이미 타워가 있어요.');if(state.money<def.cost)return toast('자원이 부족해요.');
  const t={id,x,y,level:0,coolLeft:0,range:def.range,cool:def.cool,cost:def.cost};state.money-=def.cost;state.towers.push(t);selectedBuilt=t;selectedTower=null;sfx.build();syncHUD();syncDeck();syncSelectedPanel();syncSelection()
}
function upgradeCost(t){return Math.floor(TOWERS[t.id].cost*(.75+.6*t.level))}
function sellValue(t){let total=TOWERS[t.id].cost;for(let i=0;i<t.level;i++)total+=Math.floor(TOWERS[t.id].cost*(.75+.6*i));return Math.floor(total*.75)}
function upgradeTower(){
  const t=selectedBuilt;if(!t)return;const cost=upgradeCost(t);if(t.level>=4)return toast('최대 강화입니다.');if(state.money<cost)return toast('자원이 부족해요.');
  state.money-=cost;t.level++;t.cool=Math.max(.18,t.cool*.78);t.range+=.12;sfx.build();syncHUD();syncSelectedPanel();syncSelection()
}
function sellTower(){
  const t=selectedBuilt;if(!t)return;state.money+=sellValue(t);state.towers=state.towers.filter(x=>x!==t);const n=towerNodes.get(t);if(n)towerGroup.remove(n);towerNodes.delete(t);selectedBuilt=null;sfx.click();syncHUD();syncSelectedPanel();syncSelection()
}

function spawnEnemy(value){
  const p=PATH[0],e={id:Math.random().toString(36).slice(2),hp:value,max:value,seg:0,pos:cellWorld(p.x,p.y,.08),speed:.8+Math.min(.35,state.wave*.025),flash:0};state.enemies.push(e)
}
function applyTower(t,e){
  const def=TOWERS[t.id],before=e.hp;let label='';
  if(t.id==='SUB1'){e.hp-=1;label=before+'−1='+e.hp}
  else if(t.id==='ADD1'){e.hp+=1;label=before+'+1='+e.hp}
  else{e.hp=Math.floor(e.hp/def.value);label=before+'÷'+def.value+'='+e.hp}
  e.flash=.16;const tp=cellWorld(t.x,t.y,.7);state.beams.push({a:tp,b:e.pos.clone().setY(.62),color:def.color,life:.14});state.texts.push({pos:e.pos.clone().add(new THREE.Vector3(0,1.35,0)),text:label,color:def.color,life:.9});feed(label,def.color);sfx.shoot();if(e.hp<=0)destroyEnemy(e,before)
}
function destroyEnemy(e,prev){
  const reward=Math.max(6,Math.min(90,prev*6));state.money+=reward;state.kills++;state.enemies=state.enemies.filter(x=>x!==e);const n=enemyNodes.get(e);if(n){enemyGroup.remove(n);enemyNodes.delete(e)}state.texts.push({pos:e.pos.clone().add(new THREE.Vector3(0,1.0,0)),text:'+'+reward,color:'#22c55e',life:.8});burst(e.pos,enemyColor(prev));syncHUD()
}
function burst(pos,color){for(let i=0;i<8;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(.045,6,6),new THREE.MeshBasicMaterial({color:colorHex(color)}));m.position.copy(pos).add(new THREE.Vector3(0,.45,0));fxGroup.add(m);state.particles.push({mesh:m,vel:new THREE.Vector3((Math.random()-.5)*2.4,1+Math.random()*2,(Math.random()-.5)*2.4),life:.4+Math.random()*.35})}}

function startWave(){
  if(state.waveActive||state.gameOver)return;const cfg=waveConfig();state.waveActive=true;state.spawnQueue=[];for(let i=0;i<cfg.count;i++)state.spawnQueue.push(cfg.nums[i%cfg.nums.length]);state.spawnTimer=.35;sfx.click();$('startWaveBtn').disabled=true;syncHUD()
}
function waveClear(){
  state.waveActive=false;const bonus=120+state.wave*35;state.money+=bonus;state.wave++;if(state.wave>state.best){state.best=state.wave;localStorage.setItem('numTD_best',String(state.best))}sfx.clear();toast('방어 성공! +'+bonus+' 자원');syncHUD();syncDeck();$('startWaveBtn').disabled=false
}
function loseCore(e){
  const dmg=Math.max(1,Math.ceil(e.hp/4));state.lives-=dmg;const n=enemyNodes.get(e);if(n){enemyGroup.remove(n);enemyNodes.delete(e)}state.enemies=state.enemies.filter(x=>x!==e);core.userData.orb.scale.setScalar(1.3);setTimeout(()=>core.userData.orb.scale.setScalar(1),150);sfx.hit();if(state.lives<=0)gameOver();syncHUD()
}
function gameOver(){
  state.gameOver=true;state.waveActive=false;state.paused=true;const result='도달 웨이브 '+state.wave+' · 처치 '+state.kills+'마리';$('resultText').textContent=result;$('gameOverScreen').classList.add('show')
}

function update(dt){
  if(!started||state.paused||state.gameOver)return;const sim=dt*state.speed;
  state.beams.forEach(b=>b.life-=sim);state.beams=state.beams.filter(b=>b.life>0);state.texts.forEach(t=>{t.pos.y+=.45*sim;t.life-=sim});state.texts=state.texts.filter(t=>t.life>0);
  for(let i=state.particles.length-1;i>=0;i--){const p=state.particles[i];p.life-=sim;p.vel.y-=4.4*sim;p.mesh.position.addScaledVector(p.vel,sim);if(p.life<=0){fxGroup.remove(p.mesh);state.particles.splice(i,1)}}
  if(!state.waveActive)return;
  if(state.spawnQueue.length){state.spawnTimer-=sim;if(state.spawnTimer<=0){spawnEnemy(state.spawnQueue.shift());state.spawnTimer=.8*Math.max(.38,1-state.wave*.035)}}
  for(let i=state.enemies.length-1;i>=0;i--){const e=state.enemies[i],next=PATH[e.seg+1];if(!next){loseCore(e);continue}const target=cellWorld(next.x,next.y,.08),delta=target.clone().sub(e.pos),dist=delta.length(),step=e.speed*sim;if(dist<=step){e.pos.copy(target);e.seg++}else e.pos.addScaledVector(delta.normalize(),step);if(e.flash>0)e.flash-=sim}
  for(const t of state.towers){t.coolLeft-=sim;if(t.coolLeft>0)continue;const tp=cellWorld(t.x,t.y,0);let target=null,best=-1;for(const e of state.enemies){if(!canHit(t,e))continue;const d=tp.distanceTo(e.pos);if(d<=t.range*CELL){const progress=e.seg;if(progress>best){best=progress;target=e}}}if(target){applyTower(t,target);t.coolLeft=t.cool}}
  if(state.waveActive&&!state.spawnQueue.length&&!state.enemies.length)waveClear()
}

function sync3D(dt,time){
  const liveT=new Set(state.towers);for(const [t,n] of [...towerNodes])if(!liveT.has(t)){towerGroup.remove(n);towerNodes.delete(t)}
  for(const t of state.towers){let n=towerNodes.get(t)||makeTowerNode(t);n.position.copy(cellWorld(t.x,t.y,.07));n.scale.setScalar(1+t.level*.055);const beam=state.beams.find(b=>b.a.distanceTo(cellWorld(t.x,t.y,.7))<.1);if(beam){const d=beam.b.clone().sub(n.position);if(d.lengthSq()>.01)n.rotation.y=Math.atan2(d.x,d.z)}}
  const liveE=new Set(state.enemies);for(const [e,n] of [...enemyNodes])if(!liveE.has(e)){enemyGroup.remove(n);enemyNodes.delete(e)}
  for(const e of state.enemies){let n=enemyNodes.get(e)||makeEnemyNode(e);n.position.copy(e.pos);refreshEnemyLabel(e,n);const next=PATH[Math.min(e.seg+1,PATH.length-1)],tp=cellWorld(next.x,next.y,0),d=tp.clone().sub(e.pos);if(d.lengthSq()>.01)n.rotation.y=Math.atan2(d.x,d.z);n.position.y=.08+Math.sin(time*4+e.seg)*.035;if(e.flash>0)n.scale.setScalar(1.12);else n.scale.lerp(new THREE.Vector3(1,1,1),.25)}
  while(fxGroup.children.length>state.particles.length)fxGroup.remove(fxGroup.children[fxGroup.children.length-1]);
  for(const b of state.beams){const geom=new THREE.BufferGeometry().setFromPoints([b.a,b.b]),line=new THREE.Line(geom,new THREE.LineBasicMaterial({color:b.color,transparent:true,opacity:Math.min(1,b.life/.12)}));fxGroup.add(line)}
  // transient lines are removed next frame; particle meshes are re-added if needed
  for(const p of state.particles)if(p.mesh.parent!==fxGroup)fxGroup.add(p.mesh);
  for(const t of state.texts){if(!t.sprite){t.sprite=textSprite(t.text,'',t.color,.62);ui3dGroup.add(t.sprite)}t.sprite.position.copy(t.pos);t.sprite.material.opacity=Math.min(1,t.life*2)}
  for(const child of [...ui3dGroup.children]){if(child===hoverTile||child===rangeRing)continue;const found=state.texts.some(t=>t.sprite===child);if(!found){ui3dGroup.remove(child);child.material?.map?.dispose();child.material?.dispose()}}
  if(core){const pct=Math.max(0,state.lives/state.maxLives);core.userData.orb.material.color.setHSL(.52*pct,.9,.55);core.userData.orb.material.emissiveIntensity=.7+1.7*pct;core.userData.ring.rotation.z=time*.8;core.userData.orb.rotation.y=time*.7}
  syncSelection()
}

function syncSelection(){
  if(hoverCell&&selectedTower){hoverTile.visible=true;hoverTile.position.copy(cellWorld(hoverCell.x,hoverCell.y,.075));const blocked=isPath(hoverCell.x,hoverCell.y)||towerAt(hoverCell.x,hoverCell.y)||state.money<TOWERS[selectedTower].cost;hoverTile.material.color.setHex(blocked?0xfb7185:0x22c55e)}else hoverTile.visible=false;
  const t=selectedBuilt||(selectedTower&&hoverCell?{...TOWERS[selectedTower],x:hoverCell.x,y:hoverCell.y}:null);if(t){rangeRing.visible=true;rangeRing.position.copy(cellWorld(t.x,t.y,.06));const r=t.range*CELL;rangeRing.scale.set(r,r,r);rangeRing.material.color.set(t.color||TOWERS[t.id]?.color||'#fff')}else rangeRing.visible=false
}
function loop(){
  requestAnimationFrame(loop);const dt=Math.min(.05,clock.getDelta()),time=performance.now()/1000;update(dt);sync3D(dt,time);
  // remove one-frame beam lines while retaining particles
  for(const child of [...fxGroup.children])if(child.type==='Line')fxGroup.remove(child);
  renderer.render(scene,camera)
}

function syncHUD(){
  $('waveValue').textContent=state.wave;$('moneyValue').textContent=state.money;$('coreValue').textContent=state.lives+'/'+state.maxLives;$('killValue').textContent=state.kills;
  const cfg=waveConfig();$('enemyPreview').textContent=cfg.nums.join(' · ');$('enemyCount').textContent=cfg.count+'마리';$('waveMission').textContent=cfg.mission;$('missionLine').textContent=state.waveActive?'전투 중 · 계산식을 확인하세요':'추천 배치 → 웨이브 시작 → 계산 확인';$('startWaveBtn').disabled=state.waveActive||state.gameOver
}
function syncDeck(){
  document.querySelectorAll('.towerCard[data-tower]').forEach(btn=>{const d=TOWERS[btn.dataset.tower],locked=state.wave<d.unlock;btn.classList.toggle('locked',locked);btn.classList.toggle('selected',selectedTower===d.id);btn.disabled=locked;const cost=btn.querySelector('small');if(cost)cost.textContent=d.cost});
  $('autoBtn').style.display=(state.wave===1&&!state.autoUsed&&!state.waveActive)?'block':'none'
}
function syncSelectedPanel(){
  const p=$('selectedPanel');if(!selectedBuilt){p.classList.add('hidden');return}const d=TOWERS[selectedBuilt.id];p.classList.remove('hidden');$('selectedType').textContent=d.short+' 포탑';$('selectedName').textContent=d.name;$('selectedLevel').textContent='Lv.'+(selectedBuilt.level+1);$('upgradeBtn').textContent='강화 '+upgradeCost(selectedBuilt);$('sellBtn').textContent='판매 '+sellValue(selectedBuilt)
}
function feed(text,color){const wrap=$('calcFeed'),el=document.createElement('div');el.className='calcItem';el.textContent=text;el.style.borderColor=color;wrap.prepend(el);while(wrap.children.length>4)wrap.lastChild.remove();setTimeout(()=>el.remove(),900)}
function toast(msg){const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),1200)}
function autoBuild(){
  if(state.wave!==1||state.autoUsed||state.waveActive)return;for(const p of RECOMMENDED){const d=TOWERS[p.id];if(state.money>=d.cost&&!towerAt(p.x,p.y)){state.money-=d.cost;state.towers.push({id:p.id,x:p.x,y:p.y,level:0,coolLeft:0,range:d.range,cool:d.cool,cost:d.cost})}}state.autoUsed=true;sfx.build();toast('추천 배치 완료');syncHUD();syncDeck()
}
function resetGame(){
  for(const n of towerNodes.values())towerGroup.remove(n);for(const n of enemyNodes.values())enemyGroup.remove(n);towerNodes.clear();enemyNodes.clear();state.wave=1;state.money=520;state.lives=20;state.kills=0;state.towers=[];state.enemies=[];state.spawnQueue=[];state.spawnTimer=0;state.waveActive=false;state.paused=false;state.speed=1;state.gameOver=false;state.autoUsed=false;state.beams=[];state.texts=[];state.particles=[];selectedTower=null;selectedBuilt=null;syncHUD();syncDeck();syncSelectedPanel();$('speedBtn').textContent='1배속';$('pauseBtn').textContent='⏸'
}

document.querySelectorAll('.towerCard[data-tower]').forEach(btn=>btn.addEventListener('click',()=>{initAudio();const d=TOWERS[btn.dataset.tower];if(state.wave<d.unlock)return;selectedTower=selectedTower===d.id?null:d.id;selectedBuilt=null;sfx.click();syncDeck();syncSelectedPanel();syncSelection()}));
$('autoBtn').addEventListener('click',autoBuild);$('startWaveBtn').addEventListener('click',startWave);
$('upgradeBtn').addEventListener('click',upgradeTower);$('sellBtn').addEventListener('click',sellTower);$('closeSelectedBtn').addEventListener('click',()=>{selectedBuilt=null;syncSelectedPanel();syncSelection()});
$('pauseBtn').addEventListener('click',()=>{state.paused=!state.paused;$('pauseBtn').textContent=state.paused?'▶':'⏸'});
$('speedBtn').addEventListener('click',()=>{state.speed=state.speed===1?2:state.speed===2?4:1;$('speedBtn').textContent=state.speed+'배속'});
$('soundBtn').addEventListener('click',()=>{soundOn=!soundOn;$('soundBtn').textContent=soundOn?'🔊':'🔇'});
$('startGameBtn').addEventListener('click',()=>{initAudio();started=true;$('startScreen').classList.remove('show');syncHUD();syncDeck();toast('타워를 골라 빈 칸에 설치하세요.')});
$('restartBtn').addEventListener('click',()=>{$('gameOverScreen').classList.remove('show');started=true;resetGame()});

initThree();syncHUD();syncDeck();syncSelectedPanel();
})();
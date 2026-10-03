/* Kidscade Zombie vs Divisor Turrets 3D - outbreak rebuild v11 */
(function(){
'use strict';

const THREE=window.THREE,GLTFLoader=window.GLTFLoader,FBXLoader=window.FBXLoader;
if(!THREE||!GLTFLoader||!FBXLoader) throw new Error('Three.js runtime is not ready');

const $=id=>document.getElementById(id);
const canvas=$('world'),assetStatus=$('assetStatus');
const GRID_W=16,GRID_H=10,CELL=1.05;
const GAME_SPEEDS=[1,2,4,8,16],MAX_SIM_STEP=.05;
const TOWERS={
  SUB1:{id:'SUB1',name:'−1 교정기',short:'−1',cost:90,unlock:3,range:2.05,cool:.62,color:'#fb7185',models:['subA','subB'],op:'-1'},
  DIV2:{id:'DIV2',name:'÷2 속사 터렛',short:'÷2',cost:145,unlock:1,range:2.3,cool:.68,color:'#38bdf8',models:['div2A','div2B'],op:'÷2',value:2},
  DIV3:{id:'DIV3',name:'÷3 기어 캐논',short:'÷3',cost:205,unlock:2,range:2.35,cool:.82,color:'#22c55e',models:['div3A','div3B'],op:'÷3',value:3},
  ADD1:{id:'ADD1',name:'+1 변환기',short:'+1',cost:115,unlock:3,range:2.0,cool:.9,color:'#fbbf24',models:['addA','addB'],op:'+1'},
  DIV5:{id:'DIV5',name:'÷5 중포 터렛',short:'÷5',cost:295,unlock:4,range:2.5,cool:1.0,color:'#a78bfa',models:['div5A','div5B'],op:'÷5',value:5}
};
const WAVES=[
  {nums:[2,4,8,16],count:7,mission:'첫 감염체는 모두 2의 거듭제곱입니다. ÷2만으로 숫자를 1까지 분해하세요.'},
  {nums:[6,9,12,18],count:8,mission:'÷3 기어 캐논이 열렸습니다. 9·12·18의 약수를 골라 연쇄 분해하세요.'},
  {nums:[7,11,13],count:8,mission:'소수 감염 경보! ±1 교정기로 지금 해금된 2·3의 배수로 바꾼 뒤 분해하세요.'},
  {nums:[10,15,20,25,30],count:9,mission:'÷5 중포가 열렸습니다. 큰 수를 빠르게 작은 인수로 쪼개세요.'},
  {nums:[18,24,30,36,45],count:10,mission:'FACTOR CHAIN을 노리세요. 여러 약수 터렛이 이어질수록 강해집니다.'},
  {nums:[14,21,27,35,49],count:11,mission:'나눈 뒤 7 같은 소수가 다시 남습니다. 길 후반에도 교정기→나눗셈 2차 방어선을 이어 보세요.'},
  {nums:[17,19,23,29],count:12,mission:'소수 러시입니다. 교정기 위치와 나눗셈 터렛의 사거리를 연결하세요.'},
  {nums:[48,60,72,90,120],count:12,mission:'대형 감염체 러시! 약수 연쇄로 숫자 갑옷을 1까지 완전히 분해하세요.'}
];
const PATH=(()=>{
  const a=[],add=(x,y)=>{const l=a[a.length-1];if(!l||l.x!==x||l.y!==y)a.push({x,y})};
  for(let x=0;x<=4;x++)add(x,5);for(let y=5;y>=2;y--)add(4,y);for(let x=4;x<=11;x++)add(x,2);for(let y=2;y<=8;y++)add(11,y);for(let x=11;x<=15;x++)add(x,8);return a
})();
const PATH_SET=new Set(PATH.map(p=>p.x+','+p.y));
const RECOMMENDED=[{id:'DIV2',x:3,y:6},{id:'DIV2',x:6,y:4}];

const runtimeBase=(()=>{try{return new URL('.',document.currentScript?.src||location.href)}catch(_){return new URL('.',location.href)}})();
const GAME_ROOT=new URL('../../assets/game/',runtimeBase);
const MODEL_ROOT=new URL('3d/',GAME_ROOT);
const modelUrl=p=>new URL(p,MODEL_ROOT).href;
const gameUrl=p=>new URL(p,GAME_ROOT).href;
const BGM_URL=new URL('../../assets/audio/incoming/newmusical/sergequadrado-cool-hip-hop-loop-275527.mp3',runtimeBase).href;
const MODELS={
  subA:gameUrl('turrets/FBX/Gun_2.fbx'),
  subB:gameUrl('turrets/FBX/Gun_9.fbx'),
  div2A:gameUrl('turrets/FBX/Gun_4.fbx'),
  div2B:gameUrl('turrets/FBX/Gun_10.fbx'),
  div3A:gameUrl('turrets/FBX/GearCannon_1.fbx'),
  div3B:gameUrl('turrets/FBX/Laser_2.fbx'),
  addA:gameUrl('turrets/FBX/Teleporter2.fbx'),
  addB:gameUrl('turrets/FBX/Teleporter5.fbx'),
  div5A:gameUrl('turrets/FBX/Cannon_3.fbx'),
  div5B:gameUrl('turrets/FBX/Cannon_7.fbx'),
  zombieMale:gameUrl('npcs/glTF/Zombie_Male.gltf'),
  zombieFemale:gameUrl('npcs/glTF/Zombie_Female.gltf'),
  soldier:gameUrl('npcs/glTF/Soldier_Male.gltf'),
  doctor:gameUrl('npcs/glTF/Doctor_Female_Young.gltf'),
  building1:gameUrl('buildings/Models with Materials/FBX/1Story_Sign_Mat.fbx'),
  building2:gameUrl('buildings/Models with Materials/FBX/2Story_Balcony_Mat.fbx'),
  building3:gameUrl('buildings/Models with Materials/FBX/2Story_GableRoof_Mat.fbx'),
  building4:gameUrl('buildings/Models with Materials/FBX/3Story_Small_Mat.fbx'),
  building5:gameUrl('buildings/Models with Materials/FBX/4Story_Mat.fbx'),
  building6:gameUrl('buildings/Models with Materials/FBX/6Story_Stack_Mat.fbx'),
  cityLight:modelUrl('city/kenney-city-kit-roads/light-square.glb'),
  treeDefault:modelUrl('nature/kenney-nature-kit/tree-default.glb'),
  treeDetailed:modelUrl('nature/kenney-nature-kit/tree-detailed.glb'),
  treeOak:modelUrl('nature/kenney-nature-kit/tree-oak.glb'),
  pine:modelUrl('nature/kenney-nature-kit/tree-pine-round-a.glb'),
  bush:modelUrl('nature/kenney-nature-kit/plant-bush.glb'),
  grass:modelUrl('nature/kenney-nature-kit/grass.glb'),
  flower:modelUrl('nature/kenney-nature-kit/flower-yellow-a.glb')
};

let scene,camera,renderer,loader,fbxLoader,clock,battlefield,decorGroup,skyGroup,towerGroup,enemyGroup,fxGroup,ui3dGroup,core;
let hoverTile,rangeRing,raycaster,mouse,groundPlane;
const modelCache=new Map(),towerNodes=new Map(),enemyNodes=new Map(),enemyMixers=new Map(),decorCells=new Map(),tileMeshes=new Map();
let started=false,assetsLoading=false,audioCtx=null,bgm=null,soundOn=true,toastTimer=0,selectedTower=null,selectedBuilt=null,hoverCell=null,impactShake=0;
let pointerStart=null,pointerDragged=false,cameraYaw=.69,cameraPitch=.59,cameraDistance=21.5,pinchStart=null;
const activePointers=new Map();

function readBest(){try{return Math.max(1,parseInt(localStorage.getItem('numTD_best')||'1',10)||1)}catch(_){return 1}}
const state={
  wave:1,money:520,lives:20,maxLives:20,kills:0,best:readBest(),
  towers:[],enemies:[],spawnQueue:[],spawnTimer:0,waveActive:false,paused:false,speed:1,
  beams:[],texts:[],particles:[],gameOver:false,autoUsed:false,residualHintShown:false
};

function isPrime(n){if(n<=1)return false;if(n<=3)return true;if(n%2===0||n%3===0)return false;for(let i=5;i*i<=n;i+=6)if(n%i===0||n%(i+2)===0)return false;return true}
function waveConfig(){if(state.wave<=WAVES.length)return WAVES[state.wave-1];const start=10+state.wave*3;return{nums:[start,start+2,start+5,start+8],count:Math.min(18,10+state.wave),mission:'복합 감염 웨이브입니다. 약수 터렛으로 줄이고, 남은 소수는 ±1 교정기로 다시 분해 경로에 연결하세요.'}}
function cellWorld(x,y,h=0){return new THREE.Vector3((x-(GRID_W-1)/2)*CELL,h,(y-(GRID_H-1)/2)*CELL)}
function isPath(x,y){return PATH_SET.has(x+','+y)}
function towerAt(x,y){return state.towers.find(t=>t.x===x&&t.y===y)}
function colorHex(css){return parseInt(css.slice(1),16)}
function initAudio(){if(audioCtx)return audioCtx;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;try{audioCtx=new AC();if(audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});return audioCtx}catch(_){audioCtx=null;return null}}
function tone(freq,dur=.06,type='sine',gain=.025){if(!soundOn)return;const ctx=initAudio();if(!ctx)return;const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(.0001,ctx.currentTime);g.gain.exponentialRampToValueAtTime(gain,ctx.currentTime+.01);g.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+dur);o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+dur+.02)}
const sfx={click:()=>tone(430,.05,'square'),build:()=>tone(650,.08,'triangle',.035),shoot:()=>tone(880,.035,'square',.016),hit:()=>tone(210,.08,'sawtooth',.025),clear:()=>{tone(523,.12,'triangle',.04);setTimeout(()=>tone(784,.14,'triangle',.04),90)}};
function ensureBgm(){
  if(bgm)return bgm;
  try{
    bgm=new Audio(BGM_URL);bgm.loop=true;bgm.preload='auto';bgm.volume=.14;
    bgm.addEventListener('error',()=>console.warn('[MathTD] BGM load failed',BGM_URL));
  }catch(_){bgm=null}
  return bgm
}
function syncBgm(){
  const music=ensureBgm();if(!music)return;
  const shouldPlay=started&&soundOn&&!state.paused&&!state.gameOver&&!document.hidden;
  if(shouldPlay){const p=music.play();if(p?.catch)p.catch(()=>{})}
  else music.pause()
}

function box(w,h,d,color,rough=.85){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:rough,metalness:.04}));m.castShadow=true;m.receiveShadow=true;return m}
function ring(radius,color,opacity=.35){const m=new THREE.Mesh(new THREE.RingGeometry(Math.max(.02,radius-.045),radius,48),new THREE.MeshBasicMaterial({color,transparent:true,opacity,side:THREE.DoubleSide,depthWrite:false}));m.rotation.x=-Math.PI/2;return m}
function roundRectPath(ctx,x,y,w,h,r){
  ctx.beginPath();
  if(typeof ctx.roundRect==='function'){ctx.roundRect(x,y,w,h,r);return}
  const rr=Math.min(r,w/2,h/2);ctx.moveTo(x+rr,y);ctx.lineTo(x+w-rr,y);ctx.quadraticCurveTo(x+w,y,x+w,y+rr);ctx.lineTo(x+w,y+h-rr);ctx.quadraticCurveTo(x+w,y+h,x+w-rr,y+h);ctx.lineTo(x+rr,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-rr);ctx.lineTo(x,y+rr);ctx.quadraticCurveTo(x,y,x+rr,y)
}
function normalize(obj,target=1){obj.updateMatrixWorld(true);let b=new THREE.Box3().setFromObject(obj),s=b.getSize(new THREE.Vector3()),base=Math.max(s.x,s.y,s.z)||1;obj.scale.multiplyScalar(target/base);obj.updateMatrixWorld(true);b=new THREE.Box3().setFromObject(obj);const c=b.getCenter(new THREE.Vector3());obj.position.x-=c.x;obj.position.z-=c.z;obj.position.y-=b.min.y;return obj}
function prep(obj){obj.traverse(n=>{if(!n.isMesh)return;n.castShadow=true;n.receiveShadow=true;if(n.material){const a=Array.isArray(n.material)?n.material:[n.material];const b=a.map(src=>{const m=src.clone();m.roughness=Math.max(.42,m.roughness??.7);m.metalness=Math.min(.28,m.metalness??0);m.needsUpdate=true;return m});n.material=Array.isArray(n.material)?b:b[0]}});return obj}
function cloneModel(key,target=1){const g=modelCache.get(key);if(!g)return null;const src=window.SkeletonUtils?.clone?window.SkeletonUtils.clone(g.scene):g.scene.clone(true);return normalize(prep(src),target)}
function loadModel(key,url,timeout=9000){return new Promise(resolve=>{let done=false;const finish=v=>{if(done)return;done=true;resolve(v)};const timer=setTimeout(()=>finish(null),timeout),isFbx=/\.fbx(?:$|\?)/i.test(url),active=isFbx?fbxLoader:loader;active.load(url,obj=>{clearTimeout(timer);const g=isFbx?{scene:obj,animations:obj.animations||[]}:obj;modelCache.set(key,g);finish(g)},undefined,()=>{clearTimeout(timer);finish(null)})})}

function textSprite(text,sub='',color='#ffffff',scale=1){
  const c=document.createElement('canvas');c.width=192;c.height=96;const x=c.getContext('2d');
  x.fillStyle='rgba(3,9,20,.88)';roundRectPath(x,8,8,176,80,18);x.fill();x.strokeStyle=color;x.lineWidth=4;x.stroke();
  x.fillStyle='#fff';x.textAlign='center';x.textBaseline='middle';x.font='900 42px system-ui';x.fillText(String(text),96,43);
  if(sub){x.fillStyle=color;x.font='900 15px system-ui';x.fillText(sub,96,72)}
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false}));s.scale.set(.98*scale,.49*scale,1);s.renderOrder=40;return s
}
function calcSprite(text,color){
  const c=document.createElement('canvas');c.width=256;c.height=80;const x=c.getContext('2d');
  x.fillStyle='rgba(2,8,18,.86)';roundRectPath(x,8,8,240,64,18);x.fill();x.strokeStyle=color;x.lineWidth=4;x.stroke();
  x.fillStyle='#fff';x.font='900 30px system-ui';x.textAlign='center';x.textBaseline='middle';x.fillText(text,128,41);
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false}));s.scale.set(1.05,.33,1);s.renderOrder=45;return s
}
function opSprite(text,color){return textSprite(text,'',color,.54)}

function initThree(){
  scene=new THREE.Scene();
  scene.background=new THREE.Color(0x71808d);
  scene.fog=new THREE.Fog(0x7f8b93,20,55);
  camera=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,.05,80);
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));
  renderer.setSize(innerWidth,innerHeight,false);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.04;

  scene.add(new THREE.HemisphereLight(0xdde8ef,0x303a36,1.85));
  const sun=new THREE.DirectionalLight(0xffddb8,2.45);sun.position.set(-10,18,9);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-16;sun.shadow.camera.right=16;sun.shadow.camera.top=16;sun.shadow.camera.bottom=-16;scene.add(sun);
  const fill=new THREE.DirectionalLight(0xbfe9ff,.62);fill.position.set(10,8,-12);scene.add(fill);

  battlefield=new THREE.Group();decorGroup=new THREE.Group();skyGroup=new THREE.Group();towerGroup=new THREE.Group();enemyGroup=new THREE.Group();fxGroup=new THREE.Group();ui3dGroup=new THREE.Group();
  scene.add(skyGroup,battlefield,decorGroup,towerGroup,enemyGroup,fxGroup,ui3dGroup);

  loader=new GLTFLoader();fbxLoader=new FBXLoader();clock=new THREE.Clock();raycaster=new THREE.Raycaster();mouse=new THREE.Vector2();groundPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
  buildBoard();resize();setCameraHome();
  addEventListener('resize',resize);
  canvas.addEventListener('pointermove',onPointerMove);
  canvas.addEventListener('pointerleave',()=>{if(!activePointers.size){pointerStart=null;pointerDragged=false;hoverCell=null;syncSelection()}});
  canvas.addEventListener('pointerdown',onPointerDown);
  canvas.addEventListener('pointerup',onPointerUp);
  canvas.addEventListener('pointercancel',onPointerCancel);
  canvas.addEventListener('wheel',onWheel,{passive:false});
  canvas.addEventListener('contextmenu',e=>e.preventDefault());

  loadAssets();
  requestAnimationFrame(loop);
}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function resize(){
  renderer.setSize(innerWidth,innerHeight,false);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));camera.aspect=innerWidth/Math.max(1,innerHeight);
  const portrait=innerHeight>innerWidth*1.15;camera.fov=portrait?48:40;camera.updateProjectionMatrix();
  cameraDistance=clamp(cameraDistance,portrait?13:10,portrait?29:27);updateCameraTransform();
}
function updateCameraTransform(){
  const cp=Math.cos(cameraPitch),sp=Math.sin(cameraPitch),sy=Math.sin(cameraYaw),cy=Math.cos(cameraYaw);
  camera.position.set(sy*cp*cameraDistance,.42+sp*cameraDistance,cy*cp*cameraDistance);
  camera.lookAt(0,.42,0);
}
function setCameraHome(){
  const portrait=innerHeight>innerWidth*1.15;
  cameraYaw=portrait?.52:.69;cameraPitch=portrait?.67:.59;cameraDistance=portrait?25.5:21.5;
  updateCameraTransform();
}
function pointerDistance(){
  const pts=[...activePointers.values()];if(pts.length<2)return 0;
  return Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y)
}

function buildBoard(){
  const parkBase=box(GRID_W*CELL+3.2,.34,GRID_H*CELL+3.2,0x3f4a46,.98);parkBase.position.y=-.28;battlefield.add(parkBase);
  const plaza=box(GRID_W*CELL+1.18,.11,GRID_H*CELL+1.18,0x68747a,.98);plaza.position.y=-.055;battlefield.add(plaza);

  for(let y=0;y<GRID_H;y++)for(let x=0;x<GRID_W;x++){
    const path=isPath(x,y),tone=((x+y)&1);
    const color=path?0x414b52:(tone?0x59645e:0x626d66);
    const tile=box(CELL*.92,path?.12:.07,CELL*.92,color,.94);
    tile.position.copy(cellWorld(x,y,path?.035:.005));battlefield.add(tile);tileMeshes.set(x+','+y,tile);
  }

  const routeMat=new THREE.LineBasicMaterial({color:0xf6c453,transparent:true,opacity:.92}),pts=PATH.map(p=>cellWorld(p.x,p.y,.118)),route=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),routeMat);battlefield.add(route);
  for(let i=1;i<PATH.length-1;i+=2){
    const p=PATH[i],marker=box(.13,.018,.13,0xeefcff,.7);marker.position.copy(cellWorld(p.x,p.y,.116));marker.rotation.y=Math.PI/4;battlefield.add(marker)
  }

  const curb=0xe4ece2,w=GRID_W*CELL+1.32,d=GRID_H*CELL+1.32;
  for(const [x,z,cw,cd] of [[0,-d/2,w,.12],[0,d/2,w,.12],[-w/2,0,.12,d],[w/2,0,.12,d]]){
    const edge=box(cw,.13,cd,curb,.86);edge.position.set(x,.03,z);battlefield.add(edge)
  }

  const start=PATH[0],portal=new THREE.Group(),r1=ring(.5,0x38bdf8,.72),r2=ring(.31,0xffffff,.34);r1.position.y=.13;r2.position.y=.14;portal.add(r1,r2);portal.position.copy(cellWorld(start.x,start.y,0));battlefield.add(portal);
  const startPost=box(.12,.6,.12,0xf4f7f0,.72);startPost.position.copy(cellWorld(start.x,start.y,.3));startPost.position.x-=.42;battlefield.add(startPost);

  const end=PATH[PATH.length-1];core=new THREE.Group();
  const base=new THREE.Mesh(new THREE.CylinderGeometry(.58,.72,.3,10),new THREE.MeshStandardMaterial({color:0xe1e8df,roughness:.6,metalness:.08}));base.position.y=.15;core.add(base);
  for(let i=0;i<3;i++){const arm=box(.1,.74,.1,0x55746f,.52);arm.position.set(Math.cos(i*Math.PI*2/3)*.42,.52,Math.sin(i*Math.PI*2/3)*.42);arm.rotation.z=Math.sin(i*Math.PI*2/3)*.16;core.add(arm)}
  const orb=new THREE.Mesh(new THREE.IcosahedronGeometry(.26,2),new THREE.MeshStandardMaterial({color:0x2dd4bf,emissive:0x0f9b8e,emissiveIntensity:.95,roughness:.18,metalness:.04}));orb.position.y=.7;core.add(orb);
  const cr=new THREE.Mesh(new THREE.TorusGeometry(.51,.032,10,40),new THREE.MeshBasicMaterial({color:0x5eead4,transparent:true,opacity:.7}));cr.rotation.x=Math.PI/2;cr.position.y=.64;core.add(cr);
  const cr2=new THREE.Mesh(new THREE.TorusGeometry(.37,.024,8,32),new THREE.MeshBasicMaterial({color:0x38bdf8,transparent:true,opacity:.54}));cr2.rotation.z=Math.PI/2;cr2.position.y=.7;core.add(cr2);
  core.userData={orb,ring:cr,ring2:cr2};core.position.copy(cellWorld(end.x,end.y,0));battlefield.add(core);

  hoverTile=box(CELL*.88,.04,CELL*.88,0x22c55e);hoverTile.material.transparent=true;hoverTile.material.opacity=.32;hoverTile.visible=false;ui3dGroup.add(hoverTile);
  rangeRing=ring(1,0xffffff,.11);rangeRing.visible=false;ui3dGroup.add(rangeRing)
}


function clear3DGroup(g){while(g.children.length)g.remove(g.children[g.children.length-1])}
function setDecorBuilt(x,y,built){const cell=decorCells.get(x+','+y);if(!cell)return;cell.userData.built=built;const active=document.body.classList.contains('build-mode');if(cell.userData.prop)cell.userData.prop.visible=!built&&!active}
function applyBuildMode(active){
  document.body.classList.toggle('build-mode',active);
  for(const [key,cell] of decorCells){const [x,y]=key.split(',').map(Number),built=Boolean(towerAt(x,y));cell.userData.built=built;if(cell.userData.prop)cell.userData.prop.visible=!built&&!active}
  for(const [key,tile] of tileMeshes){const [x,y]=key.split(',').map(Number);if(isPath(x,y))continue;const built=Boolean(towerAt(x,y));tile.material.emissive?.setHex(active?(built?0x4b8063:0x2d9a63):0x000000);tile.material.emissiveIntensity=active?(built?.1:.34):0}
}
function makeDecorProp(key,target,x,y,rotation=0){
  const o=cloneModel(key,target);if(!o)return null;o.position.set(x,0,y);o.rotation.y=rotation;return o
}
function makeParkBench(rotation=0){
  const g=new THREE.Group(),wood=0xa87043,metal=0x5f6f68;
  const seat=box(.62,.08,.24,wood,.78);seat.position.y=.22;g.add(seat);
  const back=box(.62,.28,.07,wood,.78);back.position.set(0,.39,.1);back.rotation.x=-.08;g.add(back);
  for(const x of[-.22,.22]){const leg=box(.07,.22,.07,metal,.7);leg.position.set(x,.11,0);g.add(leg)}
  g.rotation.y=rotation;return g
}
function makeFlowerPatch(rotation=0){
  const g=new THREE.Group();
  for(const [dx,dz,s] of [[-.12,0,.22],[.1,.08,.19],[.04,-.12,.17]]){
    const f=cloneModel('flower',s);if(f){f.position.set(dx,0,dz);f.rotation.y=rotation+dx*5;g.add(f)}
  }
  return g.children.length?g:null
}
function rebuildBoardDecor(){
  clear3DGroup(decorGroup);decorCells.clear();
  const treeDefault=new Set(['0,0','3,0','7,0','12,0','15,0','0,3','15,4','0,9','5,9','10,9','15,9']);
  const treeOak=new Set(['1,1','9,0','14,1','1,8','8,9','14,9']);
  const pineCells=new Set(['0,7','15,2','2,9','13,9']);
  const lightCells=new Set(['3,4','5,3','10,3','10,6','12,7','14,7']);
  const benchCells=new Set(['2,4','7,3','9,7','13,6']);
  const bushCells=new Set(['2,1','5,1','13,2','1,6','6,7','9,5','12,5','14,5','4,8']);
  const flowerCells=new Set(['4,1','8,1','13,1','1,4','6,5','8,6','12,4','14,6','6,8']);
  for(let y=0;y<GRID_H;y++)for(let x=0;x<GRID_W;x++){
    if(isPath(x,y))continue;
    const key=x+','+y,g=new THREE.Group(),pos=cellWorld(x,y,.07);g.position.copy(pos);
    let prop=null,rot=((x*3+y*5)%4)*Math.PI/2;
    if(treeDefault.has(key))prop=makeDecorProp('treeDefault',.82,0,0,rot);
    else if(treeOak.has(key))prop=makeDecorProp('treeOak',.88,0,0,rot);
    else if(pineCells.has(key))prop=makeDecorProp('pine',.76,0,0,rot);
    else if(lightCells.has(key))prop=makeDecorProp('cityLight',.72,.18,0,rot);
    else if(benchCells.has(key))prop=makeParkBench(rot);
    else if(bushCells.has(key))prop=makeDecorProp('bush',.46,0,0,rot);
    else if(flowerCells.has(key))prop=makeFlowerPatch(rot);
    else if((x*5+y*7)%19===0)prop=makeDecorProp('grass',.28,0,0,rot);
    if(prop){g.add(prop)}
    g.userData={prop,built:false};decorCells.set(key,g);decorGroup.add(g)
  }
  applyBuildMode(Boolean(selectedTower))
}
function makeCloud(x,y,z,scale=1){
  const g=new THREE.Group(),mat=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.78,depthWrite:false});
  for(const [dx,dy,dz,s] of [[0,0,0,1],[.65,.06,.05,.7],[-.62,.02,.08,.72],[.16,.26,-.02,.64]]){
    const m=new THREE.Mesh(new THREE.SphereGeometry(.72*s,14,10),mat);m.position.set(dx,dy,dz);m.scale.y=.62;g.add(m)
  }
  g.position.set(x,y,z);g.scale.setScalar(scale);return g
}
function rebuildSkyWorld(){
  clear3DGroup(skyGroup);
  const lawn=box(48,.38,36,0x76ae67,.99);lawn.position.y=-.58;skyGroup.add(lawn);
  const rearWalk=box(38,.06,2.4,0xd9dfd6,.98);rearWalk.position.set(0,-.34,-11.7);skyGroup.add(rearWalk);
  const rearRoad=box(40,.05,3.1,0x73848b,.96);rearRoad.position.set(0,-.37,-14.25);skyGroup.add(rearRoad);
  for(let x=-18;x<=18;x+=2.4){const stripe=box(1.05,.012,.08,0xeaf0e8,.9);stripe.position.set(x,-.335,-14.25);skyGroup.add(stripe)}

  const buildingKeys=['building1','building2','building3','building4','building5','building6'];
  for(let i=0;i<24;i++){
    const a=i/24*Math.PI*2,r=23.5+(i%3)*1.5,key=buildingKeys[i%buildingKeys.length],target=2.8+(i%6)*.34;
    const b=cloneModel(key,target);
    if(b){b.position.set(Math.cos(a)*r,-.34,Math.sin(a)*r);b.rotation.y=-a+Math.PI/2;skyGroup.add(b)}
    else{const fallback=box(1.7,2.4+(i%6)*.5,1.5,0x667078,.88);fallback.position.set(Math.cos(a)*r,.9,Math.sin(a)*r);fallback.rotation.y=-a;skyGroup.add(fallback)}
  }
  const endPos=cellWorld(PATH[PATH.length-1].x,PATH[PATH.length-1].y,0);
  const shelter=cloneModel('building3',3.2);if(shelter){shelter.position.set(endPos.x+2.0,-.34,endPos.z+1.1);shelter.rotation.y=-Math.PI/2;skyGroup.add(shelter)}
  for(const [key,dx,dz,rot] of [['soldier',1.05,.7,-Math.PI/2],['doctor',1.35,-.55,-Math.PI/2]]){const npc=cloneModel(key,1.05);if(npc){npc.position.set(endPos.x+dx,-.01,endPos.z+dz);npc.rotation.y=rot;skyGroup.add(npc)}}

  const outerTrees=[[-12,-8,'treeDetailed'],[-9,-10,'treeOak'],[-5,-10.6,'treeDefault'],[5,-10.5,'treeOak'],[9,-9.4,'treeDetailed'],[12,-7.5,'treeDefault'],[-13,2,'treeOak'],[13,1,'treeDetailed'],[-12,8,'treeDefault'],[-7,10,'treeOak'],[7,10,'treeDetailed'],[12,8,'treeDefault']];
  for(const [x,z,key] of outerTrees){const t=cloneModel(key,.95);if(t){t.position.set(x,-.34,z);t.rotation.y=(x-z)*.17;skyGroup.add(t)}}

  skyGroup.add(makeCloud(-13,10,-10,1.5),makeCloud(9,12,-15,1.25),makeCloud(15,9,4,1.05),makeCloud(-14,11,9,1.18));
}


async function loadAssets(){
  if(assetsLoading)return;assetsLoading=true;assetStatus.textContent='전투 모델 불러오는 중…';
  const priority=['subA','div2A','div3A','addA','div5A','zombieMale','zombieFemale','cityLight','treeDefault','treeDetailed','treeOak','pine','bush','grass','flower'];
  await Promise.allSettled(priority.map(k=>loadModel(k,MODELS[k])));
  rebuildBoardDecor();
  for(const [t,n] of [...towerNodes]){towerGroup.remove(n);towerNodes.delete(t)}
  for(const [e,n] of [...enemyNodes]){enemyGroup.remove(n);enemyNodes.delete(e);enemyMixers.get(e)?.stopAllAction();enemyMixers.delete(e)}
  assetStatus.textContent='전투 모델 준비 완료 · 도시 불러오는 중…';
  const rest=Object.keys(MODELS).filter(k=>!priority.includes(k));
  await Promise.allSettled(rest.map(k=>loadModel(k,MODELS[k])));
  rebuildBoardDecor();rebuildSkyWorld();
  for(const [t,n] of [...towerNodes]){towerGroup.remove(n);towerNodes.delete(t)}
  assetStatus.textContent='좀비 도시 에셋 준비 완료';
  setTimeout(()=>assetStatus.style.opacity='.35',1800)
}

function zombieKey(e){return e.variant==='female'?'zombieFemale':'zombieMale'}
function zombieScale(e){return e.kind==='brute'?1.2:e.kind==='runner'?.86:1}
function makeEnemyNode(e){
  const root=new THREE.Group(),key=zombieKey(e),model=cloneModel(key,zombieScale(e));
  if(model){
    root.add(model);root.userData.model=model;
    const gltf=modelCache.get(key);if(gltf?.animations?.length){const mixer=new THREE.AnimationMixer(model),clip=gltf.animations.find(a=>/walk|run/i.test(a.name))||gltf.animations.find(a=>/idle/i.test(a.name))||gltf.animations[0];if(clip)mixer.clipAction(clip).play();enemyMixers.set(e,mixer)}
  }else{
    const body=box(.42,.82,.3,0x71885b,.74);body.position.y=.43;body.rotation.z=.08;root.add(body)
  }
  const halo=ring(e.kind==='brute'?.52:.43,colorHex(enemyColor(e.hp)),.5);halo.position.y=.03;root.add(halo);root.userData.halo=halo;
  const tag=isPrime(e.hp)?'소수 감염':e.kind==='brute'?'대형 감염':'';
  const label=textSprite(e.hp,tag,enemyColor(e.hp),e.kind==='brute'?.82:.72);label.position.set(e.labelSide*.06,1.12+e.labelLane*.09,0);root.add(label);root.userData.label=label;root.userData.hp=e.hp;
  enemyGroup.add(root);enemyNodes.set(e,root);return root
}
function refreshEnemyLabel(e,node){
  if(node.userData.hp===e.hp)return;const old=node.userData.label;if(old){node.remove(old);old.material.map?.dispose();old.material.dispose()}
  const tag=isPrime(e.hp)?'소수 감염':e.kind==='brute'?'대형 감염':'';
  const label=textSprite(e.hp,tag,enemyColor(e.hp),e.kind==='brute'?.82:.72);label.position.set(e.labelSide*.06,1.12+e.labelLane*.09,0);node.add(label);node.userData.label=label;node.userData.hp=e.hp;node.userData.halo.material.color.setHex(colorHex(enemyColor(e.hp)))
}
function towerVisualKey(t){const def=TOWERS[t.id],i=t.level>=2?1:0;return def.models[Math.min(i,def.models.length-1)]}
function makeTowerNode(t){
  const root=new THREE.Group(),def=TOWERS[t.id],base=new THREE.Mesh(new THREE.CylinderGeometry(.42,.52,.2,10),new THREE.MeshStandardMaterial({color:0x555f63,roughness:.62,metalness:.14}));base.position.y=.11;root.add(base);
  const rr=ring(.48,colorHex(def.color),.65);rr.position.y=.21;root.add(rr);
  const visual=towerVisualKey(t),model=cloneModel(visual,1.18);if(model){model.position.y=.21;root.add(model);root.userData.model=model}else{const f=box(.46,.58,.46,colorHex(def.color),.4);f.position.y=.51;root.add(f)}
  const label=opSprite(def.short,def.color);label.position.y=1.18;root.add(label);root.userData.visual=visual;towerGroup.add(root);towerNodes.set(t,root);return root
}
function enemyColor(n){if(isPrime(n))return '#fb7185';if(n%5===0)return '#a78bfa';if(n%3===0)return '#22c55e';if(n%2===0)return '#38bdf8';return '#e2e8f0'}

function pointerCell(ev){
  const r=canvas.getBoundingClientRect();mouse.x=((ev.clientX-r.left)/r.width)*2-1;mouse.y=-((ev.clientY-r.top)/r.height)*2+1;raycaster.setFromCamera(mouse,camera);const pt=new THREE.Vector3();if(!raycaster.ray.intersectPlane(groundPlane,pt))return null;
  return{x:Math.round(pt.x/CELL+(GRID_W-1)/2),y:Math.round(pt.z/CELL+(GRID_H-1)/2)}
}
function validCell(p){return p&&p.x>=0&&p.y>=0&&p.x<GRID_W&&p.y<GRID_H}
function onPointerDown(e){
  if(!started||state.gameOver)return;initAudio();
  canvas.setPointerCapture?.(e.pointerId);
  activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(activePointers.size===1){
    pointerStart={id:e.pointerId,x:e.clientX,y:e.clientY,time:performance.now(),yaw:cameraYaw,pitch:cameraPitch};pointerDragged=false
  }else{
    pointerDragged=true;pinchStart={distance:Math.max(1,pointerDistance()),cameraDistance};hoverCell=null;syncSelection()
  }
}
function onPointerMove(e){
  if(!started)return;
  if(activePointers.has(e.pointerId))activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(activePointers.size>=2){
    if(!pinchStart)pinchStart={distance:Math.max(1,pointerDistance()),cameraDistance};
    const d=Math.max(1,pointerDistance());cameraDistance=clamp(pinchStart.cameraDistance*(pinchStart.distance/d),10,29);
    pointerDragged=true;document.body.classList.add('camera-used');hoverCell=null;updateCameraTransform();syncSelection();return
  }
  if(pointerStart&&pointerStart.id===e.pointerId){
    const dx=e.clientX-pointerStart.x,dy=e.clientY-pointerStart.y;
    if(Math.hypot(dx,dy)>7){
      pointerDragged=true;cameraYaw=pointerStart.yaw-dx*.007;cameraPitch=clamp(pointerStart.pitch-dy*.005,.42,1.18);
      document.body.classList.add('camera-used');hoverCell=null;updateCameraTransform();syncSelection();return
    }
  }
  if(e.pointerType!=='mouse'||pointerDragged)return;
  const p=pointerCell(e);hoverCell=validCell(p)?p:null;syncSelection()
}
function finishPointer(e){
  activePointers.delete(e.pointerId);try{if(canvas.hasPointerCapture?.(e.pointerId))canvas.releasePointerCapture(e.pointerId)}catch(_){}
  if(activePointers.size<2)pinchStart=null
}
function onPointerUp(e){
  if(!started||state.gameOver){finishPointer(e);pointerStart=null;pointerDragged=false;return}
  const tap=pointerStart&&pointerStart.id===e.pointerId&&!pointerDragged&&Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)<=7&&performance.now()-pointerStart.time<650;
  finishPointer(e);pointerStart=null;pointerDragged=false;if(!tap)return;
  const p=pointerCell(e);if(!validCell(p))return;const t=towerAt(p.x,p.y);
  if(t){selectedBuilt=t;selectedTower=null;syncDeck();syncSelectedPanel();syncSelection();return}
  if(selectedTower)placeTower(selectedTower,p.x,p.y);else{selectedBuilt=null;syncSelectedPanel();syncSelection()}
}
function onPointerCancel(e){finishPointer(e);pointerStart=null;pointerDragged=false;pinchStart=null}
function onWheel(e){
  if(!started||state.gameOver)return;e.preventDefault();cameraDistance=clamp(cameraDistance+e.deltaY*.012,10,29);
  document.body.classList.add('camera-used');updateCameraTransform()
}


function unlockedDivisors(){const out=[2];if(state.wave>=TOWERS.DIV3.unlock)out.push(3);if(state.wave>=TOWERS.DIV5.unlock)out.push(5);return out}
function hasUnlockedDivisor(n){return n>1&&unlockedDivisors().some(v=>n%v===0)}
function fullyReducibleNow(n){
  if(n<1)return false;
  let rest=n;
  for(const v of unlockedDivisors())while(rest>1&&rest%v===0)rest/=v;
  return rest===1
}
function canHit(t,e){
  if(e.hp<=1)return false;
  if(t.id==='SUB1')return e.hp>2&&!hasUnlockedDivisor(e.hp)&&fullyReducibleNow(e.hp-1);
  if(t.id==='ADD1')return e.hp>2&&!hasUnlockedDivisor(e.hp)&&fullyReducibleNow(e.hp+1);
  if(t.id.startsWith('DIV'))return state.wave>=TOWERS[t.id].unlock&&e.hp%TOWERS[t.id].value===0;
  return false
}
function placeTower(id,x,y){
  const def=TOWERS[id];if(state.wave<def.unlock)return toast(def.unlock+'웨이브부터 사용할 수 있어요.');if(isPath(x,y))return toast('길 위에는 설치할 수 없어요.');if(towerAt(x,y))return toast('이미 타워가 있어요.');if(state.money<def.cost)return toast('자원이 부족해요.');
  const t={id,x,y,level:0,coolLeft:0,range:def.range,cool:def.cool,cost:def.cost};state.money-=def.cost;state.towers.push(t);setDecorBuilt(x,y,true);selectedBuilt=t;selectedTower=null;applyBuildMode(false);sfx.build();syncHUD();syncDeck();syncSelectedPanel();syncSelection()
}
function upgradeCost(t){return Math.floor(TOWERS[t.id].cost*(.75+.6*t.level))}
function sellValue(t){let total=TOWERS[t.id].cost;for(let i=0;i<t.level;i++)total+=Math.floor(TOWERS[t.id].cost*(.75+.6*i));return Math.floor(total*.75)}
function upgradeTower(){
  const t=selectedBuilt;if(!t)return;const cost=upgradeCost(t);if(t.level>=4)return toast('최대 강화입니다.');if(state.money<cost)return toast('자원이 부족해요.');
  state.money-=cost;t.level++;t.cool=Math.max(.18,t.cool*.78);t.range+=.12;const old=towerNodes.get(t);if(old){towerGroup.remove(old);towerNodes.delete(t)}sfx.build();syncHUD();syncSelectedPanel();syncSelection()
}
function sellTower(){
  const t=selectedBuilt;if(!t)return;state.money+=sellValue(t);state.towers=state.towers.filter(x=>x!==t);const n=towerNodes.get(t);if(n)towerGroup.remove(n);towerNodes.delete(t);setDecorBuilt(t.x,t.y,false);selectedBuilt=null;sfx.click();syncHUD();syncSelectedPanel();syncSelection()
}

function spawnEnemy(value){
  const p=PATH[0],slot=state.enemies.length,kind=value>=60?'brute':value<=10?'runner':isPrime(value)?'prime':'walker';
  const baseSpeed=kind==='runner'?1.02:kind==='brute'?.64:.8;
  const e={id:Math.random().toString(36).slice(2),hp:value,max:value,seg:0,pos:cellWorld(p.x,p.y,.08),speed:baseSpeed+Math.min(.28,state.wave*.022),flash:0,labelLane:slot%3,labelSide:slot%2?1:-1,variant:slot%2?'female':'male',kind,chain:0};state.enemies.push(e)
}
function applyTower(t,e){
  const def=TOWERS[t.id],before=e.hp;let label='',factor=false;
  if(t.id==='SUB1'){e.hp-=1;label=before+'−1='+e.hp;e.chain=0}
  else if(t.id==='ADD1'){e.hp+=1;label=before+'+1='+e.hp;e.chain=0}
  else{e.hp=before/def.value;label=before+'÷'+def.value+'='+e.hp;e.chain=(e.chain||0)+1;factor=true;
    if(e.hp>5&&isPrime(e.hp)&&!state.residualHintShown){state.residualHintShown=true;setTimeout(()=>toast(e.hp+' 같은 소수가 남았어요. 길 뒤쪽에도 ±1 교정기와 나눗셈 터렛을 이어 두세요.'),120)}}
  e.flash=.2;impactShake=Math.max(impactShake,.12);const tp=cellWorld(t.x,t.y,.72);state.beams.push({a:tp,b:e.pos.clone().setY(.58),color:def.color,life:.16,id:t.id});state.texts.push({pos:e.pos.clone().add(new THREE.Vector3(e.labelSide*.12,1.34+e.labelLane*.05,0)),text:label,color:def.color,life:.72});
  if(factor&&e.chain>=2)state.texts.push({pos:e.pos.clone().add(new THREE.Vector3(-e.labelSide*.16,1.62,0)),text:'FACTOR ×'+e.chain,color:'#fde68a',life:.82});
  hitBurst(e.pos,def.color);feed(label,def.color);sfx.shoot();if(e.hp===1)purifyEnemy(e)
}
function purifyEnemy(e){
  const reward=Math.max(8,Math.min(40,8+Math.ceil(Math.log2(e.max+1))*3+(e.chain||0)*2));state.money+=reward;state.kills++;state.enemies=state.enemies.filter(x=>x!==e);const n=enemyNodes.get(e);if(n){enemyGroup.remove(n);enemyNodes.delete(e)}enemyMixers.get(e)?.stopAllAction();enemyMixers.delete(e);
  state.texts.push({pos:e.pos.clone().add(new THREE.Vector3(0,1.05,0)),text:'완전 분해! +'+reward,color:'#86efac',life:1.0});burst(e.pos,'#86efac');syncHUD()
}
function hitBurst(pos,color){for(let i=0;i<4;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(.035,6,6),new THREE.MeshBasicMaterial({color:colorHex(color)}));m.position.copy(pos).add(new THREE.Vector3(0,.52,0));fxGroup.add(m);state.particles.push({mesh:m,vel:new THREE.Vector3((Math.random()-.5)*1.6,.7+Math.random()*1.4,(Math.random()-.5)*1.6),life:.2+Math.random()*.18})}}
function burst(pos,color){impactShake=Math.max(impactShake,.22);for(let i=0;i<10;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(.045,6,6),new THREE.MeshBasicMaterial({color:colorHex(color)}));m.position.copy(pos).add(new THREE.Vector3(0,.45,0));fxGroup.add(m);state.particles.push({mesh:m,vel:new THREE.Vector3((Math.random()-.5)*2.4,1+Math.random()*2,(Math.random()-.5)*2.4),life:.4+Math.random()*.35})}}

function startWave(){
  if(state.waveActive||state.gameOver)return;const cfg=waveConfig();state.waveActive=true;state.spawnQueue=[];for(let i=0;i<cfg.count;i++)state.spawnQueue.push(cfg.nums[i%cfg.nums.length]);state.spawnTimer=.35;sfx.click();$('startWaveBtn').disabled=true;syncHUD()
}
function waveClear(){
  state.waveActive=false;const bonus=70+state.wave*18;state.money+=bonus;state.wave++;if(state.wave>state.best){state.best=state.wave;try{localStorage.setItem('numTD_best',String(state.best))}catch(_){}}sfx.clear();toast('감염 웨이브 정화 완료! +'+bonus+' 자원');syncHUD();syncDeck();$('startWaveBtn').disabled=false
}
function loseCore(e){
  const dmg=Math.max(1,Math.ceil(e.hp/5));state.lives-=dmg;const n=enemyNodes.get(e);if(n){enemyGroup.remove(n);enemyNodes.delete(e)}enemyMixers.get(e)?.stopAllAction();enemyMixers.delete(e);state.enemies=state.enemies.filter(x=>x!==e);core.userData.orb.scale.setScalar(1.3);setTimeout(()=>core.userData.orb.scale.setScalar(1),150);sfx.hit();if(state.lives<=0)gameOver();syncHUD()
}
function gameOver(){
  state.gameOver=true;state.waveActive=false;state.paused=true;syncBgm();const result='도달 웨이브 '+state.wave+' · 정화 '+state.kills+'마리';$('resultText').textContent=result;$('gameOverScreen').classList.add('show')
}

function update(dt){
  if(!started||state.paused||state.gameOver)return;const sim=dt;
  state.beams.forEach(b=>b.life-=sim);state.beams=state.beams.filter(b=>b.life>0);state.texts.forEach(t=>{t.pos.y+=.45*sim;t.life-=sim});state.texts=state.texts.filter(t=>t.life>0);
  for(let i=state.particles.length-1;i>=0;i--){const p=state.particles[i];p.life-=sim;p.vel.y-=4.4*sim;p.mesh.position.addScaledVector(p.vel,sim);if(p.life<=0){fxGroup.remove(p.mesh);state.particles.splice(i,1)}}
  if(!state.waveActive)return;
  if(state.spawnQueue.length){state.spawnTimer-=sim;if(state.spawnTimer<=0){spawnEnemy(state.spawnQueue.shift());state.spawnTimer=1.02*Math.max(.55,1-state.wave*.028)}}
  for(let i=state.enemies.length-1;i>=0;i--){const e=state.enemies[i],next=PATH[e.seg+1];if(!next){loseCore(e);continue}const target=cellWorld(next.x,next.y,.08),delta=target.clone().sub(e.pos),dist=delta.length(),step=e.speed*sim;if(dist<=step){e.pos.copy(target);e.seg++}else e.pos.addScaledVector(delta.normalize(),step);if(e.flash>0)e.flash-=sim}
  for(const t of state.towers){t.coolLeft-=sim;if(t.coolLeft>0)continue;const tp=cellWorld(t.x,t.y,0);let target=null,best=-1;for(const e of state.enemies){if(!canHit(t,e))continue;const d=tp.distanceTo(e.pos);if(d<=t.range*CELL){const progress=e.seg;if(progress>best){best=progress;target=e}}}if(target){applyTower(t,target);t.coolLeft=t.cool}}
  if(state.waveActive&&!state.spawnQueue.length&&!state.enemies.length)waveClear()
}

function sync3D(dt,time){
  const liveT=new Set(state.towers);for(const [t,n] of [...towerNodes])if(!liveT.has(t)){towerGroup.remove(n);towerNodes.delete(t)}
  for(const t of state.towers){let n=towerNodes.get(t)||makeTowerNode(t);if(n.userData.visual!==towerVisualKey(t)){towerGroup.remove(n);towerNodes.delete(t);n=makeTowerNode(t)}n.position.copy(cellWorld(t.x,t.y,.07));n.scale.setScalar(1+t.level*.035);const beam=state.beams.find(b=>b.a.distanceTo(cellWorld(t.x,t.y,.7))<.1);if(beam){const d=beam.b.clone().sub(n.position);if(d.lengthSq()>.01)n.rotation.y=Math.atan2(d.x,d.z)}}
  const liveE=new Set(state.enemies);for(const [e,n] of [...enemyNodes])if(!liveE.has(e)){enemyGroup.remove(n);enemyNodes.delete(e);enemyMixers.get(e)?.stopAllAction();enemyMixers.delete(e)}
  for(const e of state.enemies){let n=enemyNodes.get(e)||makeEnemyNode(e);n.position.copy(e.pos);refreshEnemyLabel(e,n);const next=PATH[Math.min(e.seg+1,PATH.length-1)],tp=cellWorld(next.x,next.y,0),d=tp.clone().sub(e.pos);if(d.lengthSq()>.01)n.rotation.y=Math.atan2(d.x,d.z);n.position.y=.08+Math.sin(time*4+e.seg)*.035;if(n.userData.model){n.userData.model.position.y=Math.abs(Math.sin(time*5+e.seg))*.025;n.userData.model.rotation.z=Math.sin(time*3.4+e.seg)*.035}if(e.flash>0)n.scale.setScalar(1.12);else n.scale.lerp(new THREE.Vector3(1,1,1),.25);enemyMixers.get(e)?.update(dt*Math.max(.7,state.speed*.8))}
  for(const child of [...fxGroup.children])if(child.userData?.beam){fxGroup.remove(child);child.geometry?.dispose();child.material?.dispose()}
  for(const b of state.beams){
    const mid=b.a.clone().add(b.b).multiplyScalar(.5),len=b.a.distanceTo(b.b),thick=b.id==='DIV2'?.045:b.id==='DIV5'?.055:.032;
    const beam=new THREE.Mesh(new THREE.CylinderGeometry(thick,thick,len,8),new THREE.MeshBasicMaterial({color:b.color,transparent:true,opacity:Math.min(1,b.life/.12)}));
    beam.position.copy(mid);beam.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.b.clone().sub(b.a).normalize());beam.userData.beam=true;fxGroup.add(beam)
  }
  for(const p of state.particles)if(p.mesh.parent!==fxGroup)fxGroup.add(p.mesh);
  for(const t of state.texts){if(!t.sprite){t.sprite=calcSprite(t.text,t.color);ui3dGroup.add(t.sprite)}t.sprite.position.copy(t.pos);t.sprite.material.opacity=Math.min(1,t.life*2)}
  for(const child of [...ui3dGroup.children]){if(child===hoverTile||child===rangeRing)continue;const found=state.texts.some(t=>t.sprite===child);if(!found){ui3dGroup.remove(child);child.material?.map?.dispose();child.material?.dispose()}}
  if(core){const pct=Math.max(0,state.lives/state.maxLives);core.userData.orb.material.color.setHSL(.52*pct,.85,.5);core.userData.orb.material.emissiveIntensity=.65+1.35*pct;core.userData.ring.rotation.z=time*.8;core.userData.ring2.rotation.x=time*.55;core.userData.ring2.rotation.y=time*.8;core.userData.orb.rotation.y=time*.7;core.userData.orb.scale.setScalar(1+Math.sin(time*3)*.035)}
  impactShake=Math.max(0,impactShake-dt*1.8);
  syncSelection()
}

function syncSelection(){
  if(hoverCell&&selectedTower){hoverTile.visible=true;hoverTile.position.copy(cellWorld(hoverCell.x,hoverCell.y,.075));const blocked=isPath(hoverCell.x,hoverCell.y)||towerAt(hoverCell.x,hoverCell.y)||state.money<TOWERS[selectedTower].cost;hoverTile.material.color.setHex(blocked?0xfb7185:0x22c55e)}else hoverTile.visible=false;
  const t=selectedBuilt||(selectedTower&&hoverCell?{...TOWERS[selectedTower],x:hoverCell.x,y:hoverCell.y}:null);if(t){rangeRing.visible=true;rangeRing.position.copy(cellWorld(t.x,t.y,.06));const r=t.range*CELL;rangeRing.scale.set(r,r,r);rangeRing.material.color.set(t.color||TOWERS[t.id]?.color||'#fff')}else rangeRing.visible=false
}
function loop(){
  requestAnimationFrame(loop);const dt=Math.min(.05,clock.getDelta()),time=performance.now()/1000;
  const scaledDt=dt*state.speed,steps=Math.max(1,Math.ceil(scaledDt/MAX_SIM_STEP)),simStep=scaledDt/steps;
  for(let i=0;i<steps;i++)update(simStep);
  sync3D(dt,time);
  const bx=camera.position.x,by=camera.position.y,bz=camera.position.z;
  if(impactShake>0){const n=impactShake*.11;camera.position.x+= (Math.random()-.5)*n;camera.position.y+=(Math.random()-.5)*n;camera.position.z+=(Math.random()-.5)*n}
  renderer.render(scene,camera);
  camera.position.set(bx,by,bz)
}


function syncHUD(){
  $('waveValue').textContent=state.wave;$('moneyValue').textContent=state.money;$('coreValue').textContent=state.lives+'/'+state.maxLives;$('killValue').textContent=state.kills;
  const cfg=waveConfig();$('enemyPreview').textContent=cfg.nums.join(' · ');$('enemyCount').textContent=cfg.count+' 감염체';$('waveMission').textContent=cfg.mission;$('missionLine').textContent=state.waveActive?'좀비 접근 중 · 약수 연쇄를 확인하세요':'터렛 배치 → 숫자 분해 → 대피소 방어';$('startWaveBtn').disabled=state.waveActive||state.gameOver;$('startWaveBtn').textContent=state.waveActive?'전투 진행 중':'▶ WAVE '+state.wave+' 시작'
}
function syncDeck(){
  document.querySelectorAll('.towerCard[data-tower]').forEach(btn=>{const d=TOWERS[btn.dataset.tower],locked=state.wave<d.unlock;btn.classList.toggle('locked',locked);btn.classList.toggle('selected',selectedTower===d.id);btn.disabled=locked;const cost=btn.querySelector('small');if(cost)cost.textContent=d.cost});
  $('autoBtn').style.display=(state.wave===1&&!state.autoUsed&&!state.waveActive)?'block':'none';
  const hint=$('buildHint');
  if(hint){
    if(selectedTower==='SUB1'||selectedTower==='ADD1')hint.textContent='교정기 → 나눗셈 순서가 핵심! 길 앞쪽에서 소수를 바꾸고, 후반에도 잔여 소수용 교정기를 이어 보세요.';
    else if(selectedTower?.startsWith('DIV'))hint.textContent='나눗셈 터렛은 교정기 뒤에 이어 두면 FACTOR CHAIN이 길어집니다.';
    else hint.textContent='① 약수 터렛 선택 → ② 도로 주변 설치 → ③ 감염 웨이브 시작';
  }
  applyBuildMode(Boolean(selectedTower))
}
function syncSelectedPanel(){
  const p=$('selectedPanel');if(!selectedBuilt){p.classList.add('hidden');return}const d=TOWERS[selectedBuilt.id];p.classList.remove('hidden');$('selectedType').textContent=d.short+' 포탑';$('selectedName').textContent=d.name;$('selectedLevel').textContent='Lv.'+(selectedBuilt.level+1);$('upgradeBtn').textContent='강화 '+upgradeCost(selectedBuilt);$('sellBtn').textContent='판매 '+sellValue(selectedBuilt)
}
function feed(text,color){const wrap=$('calcFeed'),el=document.createElement('div');el.className='calcItem';el.textContent=text;el.style.borderColor=color;wrap.prepend(el);while(wrap.children.length>4)wrap.lastChild.remove();setTimeout(()=>el.remove(),900)}
function toast(msg){const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),1200)}
function autoBuild(){
  if(state.wave!==1||state.autoUsed||state.waveActive)return;for(const p of RECOMMENDED){const d=TOWERS[p.id];if(state.wave>=d.unlock&&state.money>=d.cost&&!towerAt(p.x,p.y)){state.money-=d.cost;state.towers.push({id:p.id,x:p.x,y:p.y,level:0,coolLeft:0,range:d.range,cool:d.cool,cost:d.cost});setDecorBuilt(p.x,p.y,true)}}state.autoUsed=true;sfx.build();toast('추천 배치 완료');syncHUD();syncDeck()
}
function resetGame(){
  for(const n of towerNodes.values())towerGroup.remove(n);for(const n of enemyNodes.values())enemyGroup.remove(n);for(const m of enemyMixers.values())m.stopAllAction();towerNodes.clear();enemyNodes.clear();enemyMixers.clear();
  for(const child of [...fxGroup.children]){fxGroup.remove(child);child.geometry?.dispose();child.material?.dispose()}
  for(const child of [...ui3dGroup.children]){if(child===hoverTile||child===rangeRing)continue;ui3dGroup.remove(child);child.material?.map?.dispose();child.material?.dispose()}
  state.wave=1;state.money=520;state.lives=20;state.kills=0;state.towers=[];state.enemies=[];state.spawnQueue=[];state.spawnTimer=0;state.waveActive=false;state.paused=false;state.speed=1;state.gameOver=false;state.autoUsed=false;state.residualHintShown=false;state.beams=[];state.texts=[];state.particles=[];selectedTower=null;selectedBuilt=null;hoverCell=null;hoverTile.visible=false;rangeRing.visible=false;for(const [key] of decorCells){const [x,y]=key.split(',').map(Number);setDecorBuilt(x,y,false)}applyBuildMode(false);syncHUD();syncDeck();syncSelectedPanel();setGameSpeed(1);$('pauseBtn').textContent='⏸';syncBgm()
}

document.querySelectorAll('.towerCard[data-tower]').forEach(btn=>btn.addEventListener('click',()=>{initAudio();const d=TOWERS[btn.dataset.tower];if(state.wave<d.unlock)return;selectedTower=selectedTower===d.id?null:d.id;selectedBuilt=null;sfx.click();syncDeck();syncSelectedPanel();syncSelection()}));
$('autoBtn').addEventListener('click',autoBuild);$('startWaveBtn').addEventListener('click',startWave);
$('upgradeBtn').addEventListener('click',upgradeTower);$('sellBtn').addEventListener('click',sellTower);$('closeSelectedBtn').addEventListener('click',()=>{selectedBuilt=null;syncSelectedPanel();syncSelection()});
$('pauseBtn').addEventListener('click',()=>{state.paused=!state.paused;$('pauseBtn').textContent=state.paused?'▶':'⏸';syncBgm()});
function setGameSpeed(speed){
  const next=GAME_SPEEDS.includes(Number(speed))?Number(speed):1;
  state.speed=next;
  const btn=$('speedBtn'),menu=$('speedMenu'),control=btn?.closest('.speedControl');
  if(btn){btn.textContent=next+'배속 ▾';btn.setAttribute('aria-expanded','false')}
  if(menu)menu.querySelectorAll('[data-speed]').forEach(item=>item.classList.toggle('active',Number(item.dataset.speed)===next));
  control?.classList.remove('open');
}
$('speedBtn').addEventListener('click',event=>{
  event.stopPropagation();
  const control=$('speedBtn').closest('.speedControl'),open=!control.classList.contains('open');
  control.classList.toggle('open',open);$('speedBtn').setAttribute('aria-expanded',String(open));
});
$('speedMenu').addEventListener('click',event=>{
  const option=event.target.closest('[data-speed]');if(!option)return;
  event.stopPropagation();setGameSpeed(option.dataset.speed);sfx.click();toast(option.dataset.speed+'배속으로 변경');
});
document.addEventListener('click',()=>{
  const btn=$('speedBtn'),control=btn?.closest('.speedControl');control?.classList.remove('open');btn?.setAttribute('aria-expanded','false');
});
$('cameraResetBtn')?.addEventListener('click',()=>{setCameraHome();toast('기본 시점으로 돌아왔어요.')});
$('soundBtn').addEventListener('click',()=>{soundOn=!soundOn;$('soundBtn').textContent=soundOn?'🔊':'🔇';syncBgm()});
$('startGameBtn').addEventListener('click',()=>{initAudio();started=true;$('startScreen').classList.remove('show');syncHUD();syncDeck();syncBgm();toast('약수 터렛을 골라 도로 주변에 설치하세요.')});
$('restartBtn').addEventListener('click',()=>{$('gameOverScreen').classList.remove('show');started=true;resetGame()});
document.addEventListener('visibilitychange',syncBgm);

try{initThree();syncHUD();syncDeck();syncSelectedPanel();document.body.dataset.gameReady='1'}catch(err){console.error('[MathTD] boot failed',err);assetStatus.textContent='3D 전장 초기화 오류';assetStatus.style.opacity='1';$('startGameBtn').disabled=true;$('startGameBtn').textContent='3D 전장 오류'}
})();
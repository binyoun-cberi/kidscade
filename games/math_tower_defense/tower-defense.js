/* Kidscade Divisor Tower Defense 3D - clean rebuild v1 */
(function(){
'use strict';

const THREE=window.THREE,GLTFLoader=window.GLTFLoader,OrbitControls=window.OrbitControls;
if(!THREE||!GLTFLoader||!OrbitControls) throw new Error('Three.js runtime is not ready');

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
  mushroom:modelUrl('characters/monsters/ultimate-monsters-bundle/mushroom-king.glb'),
  cityLight:modelUrl('city/kenney-city-kit-roads/light-square.glb'),
  treeDefault:modelUrl('nature/kenney-nature-kit/tree-default.glb'),
  treeDetailed:modelUrl('nature/kenney-nature-kit/tree-detailed.glb'),
  treeOak:modelUrl('nature/kenney-nature-kit/tree-oak.glb'),
  pine:modelUrl('nature/kenney-nature-kit/tree-pine-round-a.glb'),
  bush:modelUrl('nature/kenney-nature-kit/plant-bush.glb'),
  grass:modelUrl('nature/kenney-nature-kit/grass.glb'),
  flower:modelUrl('nature/kenney-nature-kit/flower-yellow-a.glb'),
  rockA:modelUrl('nature/kenney-nature-kit/rock-large-a.glb'),
  rockB:modelUrl('nature/kenney-nature-kit/rock-large-b.glb')
};

let scene,camera,controls,renderer,loader,clock,battlefield,decorGroup,skyGroup,towerGroup,enemyGroup,fxGroup,ui3dGroup,core;
let hoverTile,rangeRing,raycaster,mouse,groundPlane;
const modelCache=new Map(),towerNodes=new Map(),enemyNodes=new Map(),enemyMixers=new Map(),decorCells=new Map(),tileMeshes=new Map();
let started=false,assetsLoading=false,audioCtx=null,soundOn=true,toastTimer=0,selectedTower=null,selectedBuilt=null,hoverCell=null,impactShake=0;
let pointerStart=null,pointerDragged=false,cameraHomeSet=false;

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
function cloneModel(key,target=1){const g=modelCache.get(key);if(!g)return null;const src=window.SkeletonUtils?.clone?window.SkeletonUtils.clone(g.scene):g.scene.clone(true);return normalize(prep(src),target)}
function loadModel(key,url,timeout=8000){return new Promise(resolve=>{let done=false;const finish=v=>{if(done)return;done=true;resolve(v)};const timer=setTimeout(()=>finish(null),timeout);loader.load(url,g=>{clearTimeout(timer);modelCache.set(key,g);finish(g)},undefined,()=>{clearTimeout(timer);finish(null)})})}

function textSprite(text,sub='',color='#ffffff',scale=1){
  const c=document.createElement('canvas');c.width=192;c.height=96;const x=c.getContext('2d');
  x.fillStyle='rgba(3,9,20,.88)';x.beginPath();x.roundRect(8,8,176,80,18);x.fill();x.strokeStyle=color;x.lineWidth=4;x.stroke();
  x.fillStyle='#fff';x.textAlign='center';x.textBaseline='middle';x.font='900 42px system-ui';x.fillText(String(text),96,43);
  if(sub){x.fillStyle=color;x.font='900 15px system-ui';x.fillText(sub,96,72)}
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false}));s.scale.set(.98*scale,.49*scale,1);s.renderOrder=40;return s
}
function calcSprite(text,color){
  const c=document.createElement('canvas');c.width=256;c.height=80;const x=c.getContext('2d');
  x.fillStyle='rgba(2,8,18,.86)';x.beginPath();x.roundRect(8,8,240,64,18);x.fill();x.strokeStyle=color;x.lineWidth=4;x.stroke();
  x.fillStyle='#fff';x.font='900 30px system-ui';x.textAlign='center';x.textBaseline='middle';x.fillText(text,128,41);
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false}));s.scale.set(1.05,.33,1);s.renderOrder=45;return s
}
function opSprite(text,color){return textSprite(text,'',color,.54)}

function initThree(){
  scene=new THREE.Scene();
  scene.background=new THREE.Color(0xcfeeff);
  scene.fog=new THREE.Fog(0xdcefff,22,58);
  camera=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,.05,80);
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));
  renderer.setSize(innerWidth,innerHeight,false);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.04;

  scene.add(new THREE.HemisphereLight(0xf5fbff,0x6d955c,2.35));
  const sun=new THREE.DirectionalLight(0xfff4d6,3.15);sun.position.set(-10,18,9);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-16;sun.shadow.camera.right=16;sun.shadow.camera.top=16;sun.shadow.camera.bottom=-16;scene.add(sun);
  const fill=new THREE.DirectionalLight(0xbfe9ff,.62);fill.position.set(10,8,-12);scene.add(fill);

  battlefield=new THREE.Group();decorGroup=new THREE.Group();skyGroup=new THREE.Group();towerGroup=new THREE.Group();enemyGroup=new THREE.Group();fxGroup=new THREE.Group();ui3dGroup=new THREE.Group();
  scene.add(skyGroup,battlefield,decorGroup,towerGroup,enemyGroup,fxGroup,ui3dGroup);

  loader=new GLTFLoader();clock=new THREE.Clock();raycaster=new THREE.Raycaster();mouse=new THREE.Vector2();groundPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
  controls=new OrbitControls(camera,canvas);
  controls.enableDamping=true;controls.dampingFactor=.075;controls.enablePan=false;
  controls.rotateSpeed=.62;controls.zoomSpeed=.82;controls.minDistance=9.5;controls.maxDistance=27;
  controls.minPolarAngle=.5;controls.maxPolarAngle=1.22;
  controls.target.set(0,.42,0);
  controls.mouseButtons.LEFT=THREE.MOUSE.ROTATE;controls.mouseButtons.MIDDLE=THREE.MOUSE.DOLLY;controls.mouseButtons.RIGHT=THREE.MOUSE.ROTATE;
  controls.touches.ONE=THREE.TOUCH.ROTATE;controls.touches.TWO=THREE.TOUCH.DOLLY_ROTATE;

  buildBoard();resize();setCameraHome();
  addEventListener('resize',resize);
  canvas.addEventListener('pointermove',onPointerMove);
  canvas.addEventListener('pointerleave',()=>{pointerStart=null;pointerDragged=false;hoverCell=null;syncSelection()});
  canvas.addEventListener('pointerdown',onPointerDown);
  canvas.addEventListener('pointerup',onPointerUp);
  canvas.addEventListener('pointercancel',()=>{pointerStart=null;pointerDragged=false});
  controls.addEventListener('start',()=>{document.body.classList.add('camera-used');hoverCell=null;syncSelection()});

  loadAssets();
  requestAnimationFrame(loop);
}
function resize(){
  renderer.setSize(innerWidth,innerHeight,false);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));camera.aspect=innerWidth/Math.max(1,innerHeight);
  const portrait=innerHeight>innerWidth*1.15;camera.fov=portrait?48:40;camera.updateProjectionMatrix();
}
function setCameraHome(){
  const portrait=innerHeight>innerWidth*1.15;
  camera.position.set(portrait?10.2:11.8,portrait?16.8:12.6,portrait?18.0:14.2);
  controls.target.set(0,.42,0);controls.update();cameraHomeSet=true;
}

function buildBoard(){
  const parkBase=box(GRID_W*CELL+3.2,.34,GRID_H*CELL+3.2,0x6da861,.98);parkBase.position.y=-.28;battlefield.add(parkBase);
  const plaza=box(GRID_W*CELL+1.18,.11,GRID_H*CELL+1.18,0xc7d4c2,.98);plaza.position.y=-.055;battlefield.add(plaza);

  for(let y=0;y<GRID_H;y++)for(let x=0;x<GRID_W;x++){
    const path=isPath(x,y),tone=((x+y)&1);
    const color=path?0x6f9aae:(tone?0x7dbb67:0x86c66e);
    const tile=box(CELL*.92,path?.12:.07,CELL*.92,color,.94);
    tile.position.copy(cellWorld(x,y,path?.035:.005));battlefield.add(tile);tileMeshes.set(x+','+y,tile);
  }

  const routeMat=new THREE.LineBasicMaterial({color:0xe9fbff,transparent:true,opacity:.78}),pts=PATH.map(p=>cellWorld(p.x,p.y,.118)),route=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),routeMat);battlefield.add(route);
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
  const orb=new THREE.Mesh(new THREE.IcosahedronGeometry(.26,2),new THREE.MeshStandardMaterial({color:0x2dd4bf,emissive:0x0f9b8e,emissiveIntensity=.95,roughness:.18,metalness:.04}));orb.position.y=.7;core.add(orb);
  const cr=new THREE.Mesh(new THREE.TorusGeometry(.51,.032,10,40),new THREE.MeshBasicMaterial({color:0x5eead4,transparent:true,opacity:.7}));cr.rotation.x=Math.PI/2;cr.position.y=.64;core.add(cr);
  const cr2=new THREE.Mesh(new THREE.TorusGeometry(.37,.024,8,32),new THREE.MeshBasicMaterial({color:0x38bdf8,transparent:true,opacity:.54}));cr2.rotation.z=Math.PI/2;cr2.position.y=.7;core.add(cr2);
  core.userData={orb,ring:cr,ring2:cr2};core.position.copy(cellWorld(end.x,end.y,0));battlefield.add(core);

  hoverTile=box(CELL*.88,.04,CELL*.88,0x22c55e);hoverTile.material.transparent=true;hoverTile.material.opacity=.32;hoverTile.visible=false;ui3dGroup.add(hoverTile);
  rangeRing=ring(1,0xffffff,.11);rangeRing.visible=false;ui3dGroup.add(rangeRing)
}


function seededCell


function seededCell(x,y){let n=(x*92837111+y*689287499+1376312589)>>>0;n^=n<<13;n^=n>>>17;n^=n<<5;return (n>>>0)/4294967295}
function clear3DGroup(g){while(g.children.length)g.remove(g.children[g.children.length-1])}
function setDecorBuilt(x,y,built){const cell=decorCells.get(x+','+y);if(!cell)return;cell.userData.built=built;const active=document.body.classList.contains('build-mode');if(cell.userData.prop)cell.userData.prop.visible=!built&&!active}
function applyBuildMode(active){
  document.body.classList.toggle('build-mode',active);
  for(const [key,cell] of decorCells){const [x,y]=key.split(',').map(Number),built=Boolean(towerAt(x,y));cell.userData.built=built;if(cell.userData.prop)cell.userData.prop.visible=!built&&!active}
  for(const [key,tile] of tileMeshes){const [x,y]=key.split(',').map(Number);if(isPath(x,y))continue;const built=Boolean(towerAt(x,y));tile.material.emissive?.setHex(active?(built?0x102a44:0x06394a):0x000000);tile.material.emissiveIntensity=active?(built?.18:.5):0}
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

  const skylineColors=[0xd7e3e5,0xc6d8dc,0xb9ced3,0xe3e7df,0xaec5cc];
  for(let i=0;i<24;i++){
    const a=i/24*Math.PI*2,r=24+(i%3)*1.4,h=2.2+(i%7)*.58,w=1.45+(i%4)*.3,d=1.35+((i+2)%4)*.28;
    const b=box(w,h,d,skylineColors[i%skylineColors.length],.88);b.position.set(Math.cos(a)*r,h/2-.28,Math.sin(a)*r);b.rotation.y=-a;skyGroup.add(b);
    const roof=box(w*.72,.12,d*.72,0x8fa6a9,.85);roof.position.set(b.position.x,h-.17,b.position.z);roof.rotation.y=b.rotation.y;skyGroup.add(roof)
  }

  const outerTrees=[[-12,-8,'treeDetailed'],[-9,-10,'treeOak'],[-5,-10.6,'treeDefault'],[5,-10.5,'treeOak'],[9,-9.4,'treeDetailed'],[12,-7.5,'treeDefault'],[-13,2,'treeOak'],[13,1,'treeDetailed'],[-12,8,'treeDefault'],[-7,10,'treeOak'],[7,10,'treeDetailed'],[12,8,'treeDefault']];
  for(const [x,z,key] of outerTrees){const t=cloneModel(key,.95);if(t){t.position.set(x,-.34,z);t.rotation.y=(x-z)*.17;skyGroup.add(t)}}

  skyGroup.add(makeCloud(-13,10,-10,1.5),makeCloud(9,12,-15,1.25),makeCloud(15,9,4,1.05),makeCloud(-14,11,9,1.18));
}


async function loadAssets(){
  if(assetsLoading)return;assetsLoading=true;assetStatus.textContent='3D 모델 불러오는 중…';
  const results=await Promise.allSettled(Object.entries(MODELS).map(([k,u])=>loadModel(k,u)));
  assetStatus.textContent='3D 모델 준비 완료';
  setTimeout(()=>assetStatus.style.opacity='.35',1800);
  rebuildBoardDecor();rebuildSkyWorld();
  for(const [t,n] of [...towerNodes]){towerGroup.remove(n);towerNodes.delete(t)}
  for(const [e,n] of [...enemyNodes]){enemyGroup.remove(n);enemyNodes.delete(e);enemyMixers.get(e)?.stopAllAction();enemyMixers.delete(e)}
}

function enemyKey(value){
  if(value>=35)return 'orc';if(value>=25)return 'evolved';if(isPrime(value))return 'ghost';if(value%5===0)return 'golem';if(value%3===0)return 'spiky';if(value%2===0)return 'blob';return 'mushroom'
}
function makeEnemyNode(e){
  const root=new THREE.Group(),key=enemyKey(e.max),model=cloneModel(key,key==='orc'?1.22:key==='evolved'?1.12:.94);
  if(model){root.add(model);root.userData.model=model;const gltf=modelCache.get(key);if(gltf?.animations?.length){const mixer=new THREE.AnimationMixer(model),clip=gltf.animations.find(a=>/walk|run/i.test(a.name))||gltf.animations.find(a=>/idle/i.test(a.name))||gltf.animations[0];if(clip)mixer.clipAction(clip).play();enemyMixers.set(e,mixer)}}else{const m=new THREE.Mesh(new THREE.IcosahedronGeometry(.34,1),new THREE.MeshStandardMaterial({color:colorHex(enemyColor(e.hp)),emissive:0x07111f}));m.position.y=.36;root.add(m)}
  const halo=ring(.43,colorHex(enemyColor(e.hp)),.44);halo.position.y=.03;root.add(halo);root.userData.halo=halo;
  const label=textSprite(e.hp,isPrime(e.hp)?'소수':'',enemyColor(e.hp),.72);label.position.set(e.labelSide*.06,1.08+e.labelLane*.09,0);root.add(label);root.userData.label=label;root.userData.hp=e.hp;
  enemyGroup.add(root);enemyNodes.set(e,root);return root
}
function refreshEnemyLabel(e,node){
  if(node.userData.hp===e.hp)return;const old=node.userData.label;if(old){node.remove(old);old.material.map?.dispose();old.material.dispose()}
  const label=textSprite(e.hp,isPrime(e.hp)?'소수':'',enemyColor(e.hp),.72);label.position.set(e.labelSide*.06,1.08+e.labelLane*.09,0);node.add(label);node.userData.label=label;node.userData.hp=e.hp;node.userData.halo.material.color.setHex(colorHex(enemyColor(e.hp)))
}
function makeTowerNode(t){
  const root=new THREE.Group(),def=TOWERS[t.id],base=new THREE.Mesh(new THREE.CylinderGeometry(.42,.52,.2,10),new THREE.MeshStandardMaterial({color:0x14283d,roughness:.45,metalness:.25}));base.position.y=.11;root.add(base);
  const rr=ring(.48,colorHex(def.color),.6);rr.position.y=.21;root.add(rr);
  const model=cloneModel(def.model,1.18);if(model){model.position.y=.21;root.add(model);root.userData.model=model}else{const f=box(.46,.58,.46,colorHex(def.color),.4);f.position.y=.51;root.add(f)}
  const label=opSprite(def.short,def.color);label.position.y=1.18;root.add(label);towerGroup.add(root);towerNodes.set(t,root);return root
}
function enemyColor(n){if(isPrime(n))return '#fb7185';if(n%5===0)return '#a78bfa';if(n%3===0)return '#22c55e';if(n%2===0)return '#38bdf8';return '#e2e8f0'}

function pointerCell(ev){
  const r=canvas.getBoundingClientRect();mouse.x=((ev.clientX-r.left)/r.width)*2-1;mouse.y=-((ev.clientY-r.top)/r.height)*2+1;raycaster.setFromCamera(mouse,camera);const pt=new THREE.Vector3();if(!raycaster.ray.intersectPlane(groundPlane,pt))return null;
  return{x:Math.round(pt.x/CELL+(GRID_W-1)/2),y:Math.round(pt.z/CELL+(GRID_H-1)/2)}
}
function validCell(p){return p&&p.x>=0&&p.y>=0&&p.x<GRID_W&&p.y<GRID_H}
function onPointerDown(e){
  if(!started||state.gameOver)return;initAudio();
  pointerStart={id:e.pointerId,x:e.clientX,y:e.clientY,time:performance.now()};pointerDragged=false
}
function onPointerMove(e){
  if(!started)return;
  if(pointerStart&&pointerStart.id===e.pointerId){
    if(Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)>7){pointerDragged=true;hoverCell=null;syncSelection();return}
  }
  if(e.pointerType!=='mouse'||pointerDragged)return;
  const p=pointerCell(e);hoverCell=validCell(p)?p:null;syncSelection()
}
function onPointerUp(e){
  if(!started||state.gameOver){pointerStart=null;pointerDragged=false;return}
  const tap=pointerStart&&pointerStart.id===e.pointerId&&!pointerDragged&&Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)<=7&&performance.now()-pointerStart.time<650;
  pointerStart=null;pointerDragged=false;if(!tap)return;
  const p=pointerCell(e);if(!validCell(p))return;const t=towerAt(p.x,p.y);
  if(t){selectedBuilt=t;selectedTower=null;syncDeck();syncSelectedPanel();syncSelection();return}
  if(selectedTower)placeTower(selectedTower,p.x,p.y);else{selectedBuilt=null;syncSelectedPanel();syncSelection()}
}


function canHit(t,e){
  if(e.hp<=0)return false;if(t.id==='SUB1')return true;if(t.id==='ADD1')return e.hp>1&&(isPrime(e.hp)||e.hp%2===1)&&e.hp<80;if(t.id.startsWith('DIV'))return e.hp>1&&e.hp%TOWERS[t.id].value===0;return false
}
function placeTower(id,x,y){
  const def=TOWERS[id];if(state.wave<def.unlock)return toast(def.unlock+'웨이브부터 사용할 수 있어요.');if(isPath(x,y))return toast('길 위에는 설치할 수 없어요.');if(towerAt(x,y))return toast('이미 타워가 있어요.');if(state.money<def.cost)return toast('자원이 부족해요.');
  const t={id,x,y,level:0,coolLeft:0,range:def.range,cool:def.cool,cost:def.cost};state.money-=def.cost;state.towers.push(t);setDecorBuilt(x,y,true);selectedBuilt=t;selectedTower=null;applyBuildMode(false);sfx.build();syncHUD();syncDeck();syncSelectedPanel();syncSelection()
}
function upgradeCost(t){return Math.floor(TOWERS[t.id].cost*(.75+.6*t.level))}
function sellValue(t){let total=TOWERS[t.id].cost;for(let i=0;i<t.level;i++)total+=Math.floor(TOWERS[t.id].cost*(.75+.6*i));return Math.floor(total*.75)}
function upgradeTower(){
  const t=selectedBuilt;if(!t)return;const cost=upgradeCost(t);if(t.level>=4)return toast('최대 강화입니다.');if(state.money<cost)return toast('자원이 부족해요.');
  state.money-=cost;t.level++;t.cool=Math.max(.18,t.cool*.78);t.range+=.12;sfx.build();syncHUD();syncSelectedPanel();syncSelection()
}
function sellTower(){
  const t=selectedBuilt;if(!t)return;state.money+=sellValue(t);state.towers=state.towers.filter(x=>x!==t);const n=towerNodes.get(t);if(n)towerGroup.remove(n);towerNodes.delete(t);setDecorBuilt(t.x,t.y,false);selectedBuilt=null;sfx.click();syncHUD();syncSelectedPanel();syncSelection()
}

function spawnEnemy(value){
  const p=PATH[0],slot=state.enemies.length,e={id:Math.random().toString(36).slice(2),hp:value,max:value,seg:0,pos:cellWorld(p.x,p.y,.08),speed:.8+Math.min(.35,state.wave*.025),flash:0,labelLane:slot%3,labelSide:slot%2?1:-1};state.enemies.push(e)
}
function applyTower(t,e){
  const def=TOWERS[t.id],before=e.hp;let label='';
  if(t.id==='SUB1'){e.hp-=1;label=before+'−1='+e.hp}
  else if(t.id==='ADD1'){e.hp+=1;label=before+'+1='+e.hp}
  else{e.hp=Math.floor(e.hp/def.value);label=before+'÷'+def.value+'='+e.hp}
  e.flash=.2;impactShake=Math.max(impactShake,.12);const tp=cellWorld(t.x,t.y,.72);state.beams.push({a:tp,b:e.pos.clone().setY(.58),color:def.color,life:.16,id:t.id});state.texts.push({pos:e.pos.clone().add(new THREE.Vector3(e.labelSide*.12,1.34+e.labelLane*.05,0)),text:label,color:def.color,life:.72});hitBurst(e.pos,def.color);feed(label,def.color);sfx.shoot();if(e.hp<=0)destroyEnemy(e,before)
}
function destroyEnemy(e,prev){
  const reward=Math.max(6,Math.min(90,prev*6));state.money+=reward;state.kills++;state.enemies=state.enemies.filter(x=>x!==e);const n=enemyNodes.get(e);if(n){enemyGroup.remove(n);enemyNodes.delete(e)}enemyMixers.get(e)?.stopAllAction();enemyMixers.delete(e);state.texts.push({pos:e.pos.clone().add(new THREE.Vector3(0,1.0,0)),text:'+'+reward,color:'#22c55e',life:.8});burst(e.pos,enemyColor(prev));syncHUD()
}
function hitBurst(pos,color){for(let i=0;i<4;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(.035,6,6),new THREE.MeshBasicMaterial({color:colorHex(color)}));m.position.copy(pos).add(new THREE.Vector3(0,.52,0));fxGroup.add(m);state.particles.push({mesh:m,vel:new THREE.Vector3((Math.random()-.5)*1.6,.7+Math.random()*1.4,(Math.random()-.5)*1.6),life:.2+Math.random()*.18})}}
function burst(pos,color){impactShake=Math.max(impactShake,.22);for(let i=0;i<10;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(.045,6,6),new THREE.MeshBasicMaterial({color:colorHex(color)}));m.position.copy(pos).add(new THREE.Vector3(0,.45,0));fxGroup.add(m);state.particles.push({mesh:m,vel:new THREE.Vector3((Math.random()-.5)*2.4,1+Math.random()*2,(Math.random()-.5)*2.4),life:.4+Math.random()*.35})}}

function startWave(){
  if(state.waveActive||state.gameOver)return;const cfg=waveConfig();state.waveActive=true;state.spawnQueue=[];for(let i=0;i<cfg.count;i++)state.spawnQueue.push(cfg.nums[i%cfg.nums.length]);state.spawnTimer=.35;sfx.click();$('startWaveBtn').disabled=true;syncHUD()
}
function waveClear(){
  state.waveActive=false;const bonus=120+state.wave*35;state.money+=bonus;state.wave++;if(state.wave>state.best){state.best=state.wave;localStorage.setItem('numTD_best',String(state.best))}sfx.clear();toast('방어 성공! +'+bonus+' 자원');syncHUD();syncDeck();$('startWaveBtn').disabled=false
}
function loseCore(e){
  const dmg=Math.max(1,Math.ceil(e.hp/4));state.lives-=dmg;const n=enemyNodes.get(e);if(n){enemyGroup.remove(n);enemyNodes.delete(e)}enemyMixers.get(e)?.stopAllAction();enemyMixers.delete(e);state.enemies=state.enemies.filter(x=>x!==e);core.userData.orb.scale.setScalar(1.3);setTimeout(()=>core.userData.orb.scale.setScalar(1),150);sfx.hit();if(state.lives<=0)gameOver();syncHUD()
}
function gameOver(){
  state.gameOver=true;state.waveActive=false;state.paused=true;const result='도달 웨이브 '+state.wave+' · 처치 '+state.kills+'마리';$('resultText').textContent=result;$('gameOverScreen').classList.add('show')
}

function update(dt){
  if(!started||state.paused||state.gameOver)return;const sim=dt*state.speed;
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
  for(const t of state.towers){let n=towerNodes.get(t)||makeTowerNode(t);n.position.copy(cellWorld(t.x,t.y,.07));n.scale.setScalar(1+t.level*.055);const beam=state.beams.find(b=>b.a.distanceTo(cellWorld(t.x,t.y,.7))<.1);if(beam){const d=beam.b.clone().sub(n.position);if(d.lengthSq()>.01)n.rotation.y=Math.atan2(d.x,d.z)}}
  const liveE=new Set(state.enemies);for(const [e,n] of [...enemyNodes])if(!liveE.has(e)){enemyGroup.remove(n);enemyNodes.delete(e);enemyMixers.get(e)?.stopAllAction();enemyMixers.delete(e)}
  for(const e of state.enemies){let n=enemyNodes.get(e)||makeEnemyNode(e);n.position.copy(e.pos);refreshEnemyLabel(e,n);const next=PATH[Math.min(e.seg+1,PATH.length-1)],tp=cellWorld(next.x,next.y,0),d=tp.clone().sub(e.pos);if(d.lengthSq()>.01)n.rotation.y=Math.atan2(d.x,d.z);n.position.y=.08+Math.sin(time*4+e.seg)*.035;if(e.flash>0)n.scale.setScalar(1.12);else n.scale.lerp(new THREE.Vector3(1,1,1),.25);enemyMixers.get(e)?.update(dt*Math.max(.7,state.speed*.8))}
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
  requestAnimationFrame(loop);const dt=Math.min(.05,clock.getDelta()),time=performance.now()/1000;update(dt);sync3D(dt,time);controls?.update();
  const bx=camera.position.x,by=camera.position.y,bz=camera.position.z;
  if(impactShake>0){const n=impactShake*.11;camera.position.x+= (Math.random()-.5)*n;camera.position.y+=(Math.random()-.5)*n;camera.position.z+=(Math.random()-.5)*n}
  renderer.render(scene,camera);
  camera.position.set(bx,by,bz)
}


function syncHUD(){
  $('waveValue').textContent=state.wave;$('moneyValue').textContent=state.money;$('coreValue').textContent=state.lives+'/'+state.maxLives;$('killValue').textContent=state.kills;
  const cfg=waveConfig();$('enemyPreview').textContent=cfg.nums.join(' · ');$('enemyCount').textContent=cfg.count+'마리';$('waveMission').textContent=cfg.mission;$('missionLine').textContent=state.waveActive?'전투 중 · 계산식을 확인하세요':'추천 배치 → 웨이브 시작 → 계산 확인';$('startWaveBtn').disabled=state.waveActive||state.gameOver;$('startWaveBtn').textContent=state.waveActive?'전투 진행 중':'▶ WAVE '+state.wave+' 시작'
}
function syncDeck(){
  document.querySelectorAll('.towerCard[data-tower]').forEach(btn=>{const d=TOWERS[btn.dataset.tower],locked=state.wave<d.unlock;btn.classList.toggle('locked',locked);btn.classList.toggle('selected',selectedTower===d.id);btn.disabled=locked;const cost=btn.querySelector('small');if(cost)cost.textContent=d.cost});
  $('autoBtn').style.display=(state.wave===1&&!state.autoUsed&&!state.waveActive)?'block':'none';
  applyBuildMode(Boolean(selectedTower))
}
function syncSelectedPanel(){
  const p=$('selectedPanel');if(!selectedBuilt){p.classList.add('hidden');return}const d=TOWERS[selectedBuilt.id];p.classList.remove('hidden');$('selectedType').textContent=d.short+' 포탑';$('selectedName').textContent=d.name;$('selectedLevel').textContent='Lv.'+(selectedBuilt.level+1);$('upgradeBtn').textContent='강화 '+upgradeCost(selectedBuilt);$('sellBtn').textContent='판매 '+sellValue(selectedBuilt)
}
function feed(text,color){const wrap=$('calcFeed'),el=document.createElement('div');el.className='calcItem';el.textContent=text;el.style.borderColor=color;wrap.prepend(el);while(wrap.children.length>4)wrap.lastChild.remove();setTimeout(()=>el.remove(),900)}
function toast(msg){const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),1200)}
function autoBuild(){
  if(state.wave!==1||state.autoUsed||state.waveActive)return;for(const p of RECOMMENDED){const d=TOWERS[p.id];if(state.money>=d.cost&&!towerAt(p.x,p.y)){state.money-=d.cost;state.towers.push({id:p.id,x:p.x,y:p.y,level:0,coolLeft:0,range:d.range,cool:d.cool,cost:d.cost});setDecorBuilt(p.x,p.y,true)}}state.autoUsed=true;sfx.build();toast('추천 배치 완료');syncHUD();syncDeck()
}
function resetGame(){
  for(const n of towerNodes.values())towerGroup.remove(n);for(const n of enemyNodes.values())enemyGroup.remove(n);for(const m of enemyMixers.values())m.stopAllAction();towerNodes.clear();enemyNodes.clear();enemyMixers.clear();
  for(const child of [...fxGroup.children]){fxGroup.remove(child);child.geometry?.dispose();child.material?.dispose()}
  for(const child of [...ui3dGroup.children]){if(child===hoverTile||child===rangeRing)continue;ui3dGroup.remove(child);child.material?.map?.dispose();child.material?.dispose()}
  state.wave=1;state.money=520;state.lives=20;state.kills=0;state.towers=[];state.enemies=[];state.spawnQueue=[];state.spawnTimer=0;state.waveActive=false;state.paused=false;state.speed=1;state.gameOver=false;state.autoUsed=false;state.beams=[];state.texts=[];state.particles=[];selectedTower=null;selectedBuilt=null;hoverCell=null;hoverTile.visible=false;rangeRing.visible=false;for(const [key] of decorCells){const [x,y]=key.split(',').map(Number);setDecorBuilt(x,y,false)}applyBuildMode(false);syncHUD();syncDeck();syncSelectedPanel();$('speedBtn').textContent='1배속';$('pauseBtn').textContent='⏸'
}

document.querySelectorAll('.towerCard[data-tower]').forEach(btn=>btn.addEventListener('click',()=>{initAudio();const d=TOWERS[btn.dataset.tower];if(state.wave<d.unlock)return;selectedTower=selectedTower===d.id?null:d.id;selectedBuilt=null;sfx.click();syncDeck();syncSelectedPanel();syncSelection()}));
$('autoBtn').addEventListener('click',autoBuild);$('startWaveBtn').addEventListener('click',startWave);
$('upgradeBtn').addEventListener('click',upgradeTower);$('sellBtn').addEventListener('click',sellTower);$('closeSelectedBtn').addEventListener('click',()=>{selectedBuilt=null;syncSelectedPanel();syncSelection()});
$('pauseBtn').addEventListener('click',()=>{state.paused=!state.paused;$('pauseBtn').textContent=state.paused?'▶':'⏸'});
$('speedBtn').addEventListener('click',()=>{state.speed=state.speed===1?2:state.speed===2?4:1;$('speedBtn').textContent=state.speed+'배속'});
$('cameraResetBtn')?.addEventListener('click',()=>{setCameraHome();toast('기본 시점으로 돌아왔어요.')});
$('soundBtn').addEventListener('click',()=>{soundOn=!soundOn;$('soundBtn').textContent=soundOn?'🔊':'🔇'});
$('startGameBtn').addEventListener('click',()=>{initAudio();started=true;$('startScreen').classList.remove('show');syncHUD();syncDeck();toast('타워를 골라 빈 칸에 설치하세요.')});
$('restartBtn').addEventListener('click',()=>{$('gameOverScreen').classList.remove('show');started=true;resetGame()});

initThree();syncHUD();syncDeck();syncSelectedPanel();
})();
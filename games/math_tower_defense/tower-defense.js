/* Kidscade Zombie vs Divisor Turrets 3D - sci-fi arsenal visual pass v16 */
(function(){
'use strict';

const THREE=window.THREE,GLTFLoader=window.GLTFLoader,FBXLoader=window.FBXLoader;
if(!THREE||!GLTFLoader||!FBXLoader) throw new Error('Three.js runtime is not ready');

const $=id=>document.getElementById(id);
const canvas=$('world'),assetStatus=$('assetStatus');
const GRID_W=16,GRID_H=10,CELL=1.05;
const GAME_SPEEDS=[1,2,4,8,16],MAX_SIM_STEP=.05;
const TOWERS={
  SUB1:{id:'SUB1',name:'−1 EMP 교정기',short:'−1',cost:90,unlock:3,range:2.05,cool:.62,turnSpeed:5.2,projectileSpeed:7.0,color:'#fb7185',models:['emp'],visualSteps:[0],visualNames:['EMP FIELD'],op:'-1',projectile:'emp'},
  DIV2:{id:'DIV2',name:'÷2 속사 계열',short:'÷2',cost:145,unlock:1,range:2.3,cool:.68,turnSpeed:7.2,projectileSpeed:10.5,color:'#38bdf8',models:['gatling','gunCannon','flame'],visualSteps:[0,1,3],visualNames:['GATLING','GUN CANNON','FLAME ARRAY'],op:'÷2',value:2,projectile:'tracer'},
  DIV3:{id:'DIV3',name:'÷3 에너지 계열',short:'÷3',cost:205,unlock:2,range:2.35,cool:.82,turnSpeed:4.4,projectileSpeed:6.4,color:'#22c55e',models:['hive','lightning','plasma'],visualSteps:[0,2,4],visualNames:['HIVE','LIGHTNING','PLASMA'],op:'÷3',value:3,projectile:'plasma'},
  ADD1:{id:'ADD1',name:'+1 실드 변환기',short:'+1',cost:115,unlock:3,range:2.0,cool:.9,turnSpeed:5.6,projectileSpeed:7.4,color:'#fbbf24',models:['shield'],visualSteps:[0],visualNames:['SHIELD FIELD'],op:'+1',projectile:'boost'},
  DIV5:{id:'DIV5',name:'÷5 중화기',short:'÷5',cost:295,unlock:4,range:2.5,cool:1.0,turnSpeed:3.6,projectileSpeed:5.2,color:'#a78bfa',models:['gunCannon','missile','plasma','railGun'],visualSteps:[0,1,2,3],visualNames:['CANNON','MISSILE','PLASMA','RAIL GUN'],op:'÷5',value:5,projectile:'heavy'}
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
  emp:modelUrl('weapons/scifi-turrets/emp-turret.glb'),
  flame:modelUrl('weapons/scifi-turrets/flamethrower-turret.glb'),
  gatling:modelUrl('weapons/scifi-turrets/gatelng-gun-turret.glb'),
  gunCannon:modelUrl('weapons/scifi-turrets/gun-cannon-turret.glb'),
  hive:modelUrl('weapons/scifi-turrets/hive-turret.glb'),
  lightning:modelUrl('weapons/scifi-turrets/lighting-turret.glb'),
  missile:modelUrl('weapons/scifi-turrets/missile-turret.glb'),
  plasma:modelUrl('weapons/scifi-turrets/plasma-turret.glb'),
  railGun:modelUrl('weapons/scifi-turrets/rail-gun-turret.glb'),
  shield:modelUrl('weapons/scifi-turrets/shield-turret.glb'),
  zombieClassic:gameUrl('zombie/FBX/Zombie.fbx'),
  zombieSmooth:gameUrl('zombie/FBX/ZombieSmooth.fbx'),
  civilianMale:gameUrl('npcs/glTF/Casual_Male.gltf'),
  civilianFemale:gameUrl('npcs/glTF/Casual_Female.gltf'),
  soldier:gameUrl('npcs/glTF/Soldier_Male.gltf'),
  doctor:gameUrl('npcs/glTF/Doctor_Female_Young.gltf'),
  building1:gameUrl('buildings/Models with Materials/FBX/1Story_Sign_Mat.fbx'),
  building2:gameUrl('buildings/Models with Materials/FBX/2Story_Balcony_Mat.fbx'),
  building3:gameUrl('buildings/Models with Materials/FBX/2Story_GableRoof_Mat.fbx'),
  building4:gameUrl('buildings/Models with Materials/FBX/3Story_Small_Mat.fbx'),
  building5:gameUrl('buildings/Models with Materials/FBX/4Story_Mat.fbx'),
  building6:gameUrl('buildings/Models with Materials/FBX/6Story_Stack_Mat.fbx'),
  cityLight:modelUrl('city/kenney-city-kit-roads/light-square.glb'),
  trafficLight:modelUrl('city/kenney-city-kit-roads/traffic-light.glb'),
  cone:modelUrl('city/kenney-city-kit-roads/construction-cone.glb'),
  barrier:modelUrl('city/kenney-city-kit-roads/construction-barrier.glb'),
  fence:modelUrl('city/kenney-city-kit-roads/construction-fence.glb'),
  dumpster:modelUrl('city/kenney-city-kit-roads/dumpster.glb'),
  ambulance:modelUrl('vehicles/kenney-car-kit/ambulance.glb'),
  hydrant:modelUrl('city/poly-pizza-city-pack/fire-hydrant.glb'),
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
let pointerStart=null,pointerDragged=false;

function readBest(){try{return Math.max(1,parseInt(localStorage.getItem('numTD_best')||'1',10)||1)}catch(_){return 1}}
const state={
  wave:1,money:520,lives:20,maxLives:20,kills:0,best:readBest(),
  towers:[],enemies:[],spawnQueue:[],spawnTimer:0,waveActive:false,paused:false,speed:1,
  beams:[],projectiles:[],texts:[],particles:[],gameOver:false,autoUsed:false,residualHintShown:false
};

function isPrime(n){if(n<=1)return false;if(n<=3)return true;if(n%2===0||n%3===0)return false;for(let i=5;i*i<=n;i+=6)if(n%i===0||n%(i+2)===0)return false;return true}
function waveConfig(){if(state.wave<=WAVES.length)return WAVES[state.wave-1];const start=10+state.wave*3;return{nums:[start,start+2,start+5,start+8],count:Math.min(18,10+state.wave),mission:'복합 감염 웨이브입니다. 약수 터렛으로 줄이고, 남은 소수는 ±1 교정기로 다시 분해 경로에 연결하세요.'}}
function cellWorld(x,y,h=0){return new THREE.Vector3((x-(GRID_W-1)/2)*CELL,h,(y-(GRID_H-1)/2)*CELL)}
function isPath(x,y){return PATH_SET.has(x+','+y)}
function towerAt(x,y){return state.towers.find(t=>t.x===x&&t.y===y)}
function colorHex(css){return parseInt(css.slice(1),16)}
function shortestAngle(from,to){return Math.atan2(Math.sin(to-from),Math.cos(to-from))}
function turnToward(from,to,maxStep){const d=shortestAngle(from,to);return from+Math.max(-maxStep,Math.min(maxStep,d))}
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
function tintCharacter(obj,tint){
  const main=new THREE.Color(tint),skin=new THREE.Color(0xf2c6a0),dark=new THREE.Color(0x26323b),light=new THREE.Color(0xe8eef2);
  obj.traverse(n=>{
    if(!n.isMesh||!n.material)return;
    const list=Array.isArray(n.material)?n.material:[n.material];
    const next=list.map((src,i)=>{
      const m=src.clone(),name=((m.name||'')+' '+(n.name||'')).toLowerCase();
      const c=/skin|face|head|hand/.test(name)?skin:/hair|shoe|boot/.test(name)?dark:/pant|trouser|leg/.test(name)?dark:/white|doctor/.test(name)?light:(i%3===1?light:main);
      if(m.color)m.color.copy(c);
      m.roughness=Math.max(.58,m.roughness??.72);m.metalness=Math.min(.08,m.metalness??0);m.needsUpdate=true;return m
    });
    n.material=Array.isArray(n.material)?next:next[0]
  });
  return obj
}

const ZOMBIE_PALETTES=Object.freeze({
  zombieClassic:{skin:0x79a94f,shirt:0x8f3f46,pants:0x334155,boots:0x18212a,stain:0x5c2b31},
  zombieSmooth:{skin:0x6f9f55,shirt:0x6b3f72,pants:0x2f3b49,boots:0x171d24,stain:0x4b2836}
});
function colorizeZombieModel(obj,key){
  const palette=ZOMBIE_PALETTES[key]||ZOMBIE_PALETTES.zombieClassic;
  obj.traverse(n=>{
    if(!n.isMesh||!n.geometry||!n.material)return;
    const geometry=n.geometry,position=geometry.getAttribute?.('position');
    if(!position)return;
    geometry.computeBoundingBox?.();
    const box3=geometry.boundingBox;if(!box3)return;
    const min=box3.min,max=box3.max,height=Math.max(.0001,max.y-min.y),width=Math.max(.0001,max.x-min.x),cx=(min.x+max.x)*.5;
    const colors=new Float32Array(position.count*3);
    const skin=new THREE.Color(palette.skin),shirt=new THREE.Color(palette.shirt),pants=new THREE.Color(palette.pants),boots=new THREE.Color(palette.boots),stain=new THREE.Color(palette.stain);
    const c=new THREE.Color();
    for(let i=0;i<position.count;i++){
      const y=(position.getY(i)-min.y)/height,x=Math.abs(position.getX(i)-cx)/(width*.5);
      if(y>.79)c.copy(skin);
      else if(y>.43)c.copy(x>.58?skin:shirt);
      else if(y>.13)c.copy(pants);
      else c.copy(boots);
      if(y>.47&&y<.74&&x<.34&&((i*17)%29)<4)c.lerp(stain,.52);
      colors[i*3]=c.r;colors[i*3+1]=c.g;colors[i*3+2]=c.b
    }
    geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
    const list=Array.isArray(n.material)?n.material:[n.material];
    const next=list.map(src=>{
      const m=src.clone();
      if(m.color)m.color.setHex(0xffffff);
      m.vertexColors=true;
      if('map' in m&&!m.map)m.map=null;
      m.roughness=Math.max(.62,m.roughness??.72);
      m.metalness=Math.min(.04,m.metalness??0);
      m.needsUpdate=true;
      return m
    });
    n.material=Array.isArray(n.material)?next:next[0]
  });
  return obj
}
function cloneModel(key,target=1){const g=modelCache.get(key);if(!g)return null;const src=window.SkeletonUtils?.clone?window.SkeletonUtils.clone(g.scene):g.scene.clone(true);return normalize(prep(src),target)}
function loadModel(key,url,timeout=9000){return new Promise(resolve=>{let done=false;const finish=v=>{if(done)return;done=true;resolve(v)};const timer=setTimeout(()=>finish(null),timeout),isFbx=/\.fbx(?:$|\?)/i.test(url),active=isFbx?fbxLoader:loader;active.load(url,obj=>{clearTimeout(timer);const g=isFbx?{scene:obj,animations:obj.animations||[]}:obj;if(key==='zombieClassic'||key==='zombieSmooth')colorizeZombieModel(g.scene,key);modelCache.set(key,g);finish(g)},undefined,()=>{clearTimeout(timer);finish(null)})})}

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
  scene.background=new THREE.Color(0x637781);
  scene.fog=new THREE.Fog(0x6f8188,19,48);
  camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,80);
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));
  renderer.setSize(innerWidth,innerHeight,false);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;

  scene.add(new THREE.HemisphereLight(0xdde8ef,0x303a36,1.85));
  const sun=new THREE.DirectionalLight(0xffddb8,2.45);sun.position.set(-10,18,9);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-16;sun.shadow.camera.right=16;sun.shadow.camera.top=16;sun.shadow.camera.bottom=-16;scene.add(sun);
  const fill=new THREE.DirectionalLight(0xbfe9ff,.62);fill.position.set(10,8,-12);scene.add(fill);

  battlefield=new THREE.Group();decorGroup=new THREE.Group();skyGroup=new THREE.Group();towerGroup=new THREE.Group();enemyGroup=new THREE.Group();fxGroup=new THREE.Group();ui3dGroup=new THREE.Group();
  scene.add(skyGroup,battlefield,decorGroup,towerGroup,enemyGroup,fxGroup,ui3dGroup);

  loader=new GLTFLoader();fbxLoader=new FBXLoader();clock=new THREE.Clock();raycaster=new THREE.Raycaster();mouse=new THREE.Vector2();groundPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
  buildBoard();resize();
  addEventListener('resize',resize);
  canvas.addEventListener('pointermove',onPointerMove);
  canvas.addEventListener('pointerleave',()=>{pointerStart=null;pointerDragged=false;hoverCell=null;syncSelection()});
  canvas.addEventListener('pointerdown',onPointerDown);
  canvas.addEventListener('pointerup',onPointerUp);
  canvas.addEventListener('pointercancel',onPointerCancel);
  canvas.addEventListener('contextmenu',e=>e.preventDefault());

  loadAssets();
  requestAnimationFrame(loop);
}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
let portraitBoard=false;
function setWorldOrientation(portrait){
  portraitBoard=portrait;
  document.body.classList.toggle('portrait-board',portrait);
  const angle=portrait?Math.PI/2:0;
  for(const g of [skyGroup,battlefield,decorGroup,towerGroup,enemyGroup,fxGroup,ui3dGroup])if(g)g.rotation.y=angle
}
function resize(){
  renderer.setSize(innerWidth,innerHeight,false);
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));
  fitTopDownCamera();
}
function fitTopDownCamera(){
  const aspect=Math.max(.34,innerWidth/Math.max(1,innerHeight)),portrait=innerWidth<=700&&innerHeight>innerWidth*1.16;
  const boardWidth=GRID_W*CELL+3.6,boardDepth=GRID_H*CELL+3.6;
  setWorldOrientation(portrait);
  const displayWidth=portrait?boardDepth:boardWidth,displayDepth=portrait?boardWidth:boardDepth;
  const margin=portrait?1.12:(innerWidth<=700?1.2:1.15);
  const halfHeight=Math.max(displayDepth*.5,displayWidth/(2*aspect))*margin;
  const halfWidth=halfHeight*aspect;
  camera.left=-halfWidth;camera.right=halfWidth;camera.top=halfHeight;camera.bottom=-halfHeight;
  camera.near=.1;camera.far=60;
  camera.position.set(0,28,.001);
  camera.up.set(0,0,-1);
  camera.lookAt(0,0,0);
  camera.updateProjectionMatrix();
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
  const lawn=box(30,.38,22,0x6d9369,.99);lawn.position.y=-.58;skyGroup.add(lawn);

  // Roads and pavements deliberately sit just outside the playable block so they stay visible from the fixed camera.
  const roadColor=0x4f5e64,walkColor=0xcbd3cf,lineColor=0xe9d46d;
  for(const z of[-7.35,7.35]){
    const walk=box(25,.06,1.0,walkColor,.98);walk.position.set(0,-.35,z+(z<0?.95:-.95));skyGroup.add(walk);
    const road=box(25,.05,2.05,roadColor,.97);road.position.set(0,-.38,z);skyGroup.add(road);
    for(let x=-11;x<=11;x+=2.2){const stripe=box(.9,.012,.07,lineColor,.92);stripe.position.set(x,-.345,z);skyGroup.add(stripe)}
  }
  for(const x of[-10.85,10.85]){
    const walk=box(1.0,.06,13.2,walkColor,.98);walk.position.set(x+(x<0?.95:-.95),-.35,0);skyGroup.add(walk);
    const road=box(2.0,.05,13.2,roadColor,.97);road.position.set(x,-.38,0);skyGroup.add(road)
  }

  const buildingKeys=['building1','building2','building3','building4','building5','building6'];
  const lots=[
    [-11.85,-5.5,Math.PI/2],[-11.9,-2.0,Math.PI/2],[-11.9,2.0,Math.PI/2],[-11.85,5.35,Math.PI/2],
    [11.85,-5.35,-Math.PI/2],[11.9,-1.8,-Math.PI/2],[11.9,1.9,-Math.PI/2],[11.85,5.25,-Math.PI/2],
    [-7.8,-8.25,0],[-3.0,-8.2,0],[3.0,-8.2,0],[7.8,-8.25,0]
  ];
  lots.forEach(([x,z,rot],i)=>{
    const key=buildingKeys[i%buildingKeys.length],target=2.15+(i%4)*.18,b=cloneModel(key,target);
    if(b){b.position.set(x,-.34,z);b.rotation.y=rot;skyGroup.add(b)}
    else{const fallback=box(1.65,2.2+(i%4)*.32,1.45,0x667078,.88);fallback.position.set(x,.75,z);fallback.rotation.y=rot;skyGroup.add(fallback)}
  });

  const endPos=cellWorld(PATH[PATH.length-1].x,PATH[PATH.length-1].y,0);
  const shelter=cloneModel('building3',2.7);if(shelter){shelter.position.set(endPos.x+1.85,-.34,endPos.z+.95);shelter.rotation.y=-Math.PI/2;skyGroup.add(shelter)}
  const shelterPeople=[
    ['soldier',.95,.62,-Math.PI/2,0x3b82f6],['doctor,',1.2,-.48,-Math.PI/2,0xf472b6],
    ['civilianMale',2.0,.28,-Math.PI/2,0xf59e0b],['civilianFemale',1.9,-.82,-Math.PI/2,0x22c55e]
  ];
  for(const row of shelterPeople){
    const [rawKey,dx,dz,rot,tint]=row,key=String(rawKey).replace(',',''),npc=cloneModel(key,1.0);
    if(npc){tintCharacter(npc,tint);npc.position.set(endPos.x+dx,-.01,endPos.z+dz);npc.rotation.y=rot;skyGroup.add(npc)}
  }

  const outerTrees=[[-9.1,-6.1,'treeDetailed'],[-6.8,-6.35,'treeOak'],[-4.6,-6.25,'treeDefault'],[4.8,-6.25,'treeOak'],[7.0,-6.3,'treeDetailed'],[9.15,-6.0,'treeDefault'],[-9.2,5.9,'treeOak'],[9.15,5.9,'treeDetailed']];
  for(const [x,z,key] of outerTrees){const t=cloneModel(key,.78);if(t){t.position.set(x,-.34,z);t.rotation.y=(x-z)*.17;skyGroup.add(t)}}

  const placeStreet=(key,target,x,z,rot=0)=>{
    const prop=cloneModel(key,target);if(!prop)return;prop.position.set(x,-.08,z);prop.rotation.y=rot;skyGroup.add(prop)
  };
  placeStreet('ambulance',1.9,9.65,4.7,-Math.PI/2);
  placeStreet('trafficLight',1.05,-9.7,-5.55,Math.PI/2);
  placeStreet('trafficLight',1.05,9.7,-5.55,-Math.PI/2);
  placeStreet('dumpster',1.0,-9.7,4.85,.15);
  placeStreet('hydrant',.62,9.55,-3.25,-.2);
  for(const [x,z,r] of [[-9.55,.1,.2],[-9.55,.72,-.12],[-9.4,1.32,.08]])placeStreet('cone',.36,x,z,r);
  for(const [x,z,r] of [[9.55,2.65,Math.PI/2],[9.55,3.65,Math.PI/2]])placeStreet('barrier',1.05,x,z,r);
  for(const z of[1.7,2.65,3.6,4.55])placeStreet('fence',.96,9.92,z,Math.PI/2);

  // Quarantine hazard posts make the board edge read as an intentional defended block.
  for(const [x,z] of [[-9.55,-5.9],[-3.2,-5.9],[3.2,-5.9],[9.55,-5.9],[-9.55,5.9],[9.55,5.9]]){
    const post=box(.16,.44,.16,0xf3c84b,.6);post.position.set(x,-.08,z);skyGroup.add(post)
  }
}


async function loadAssets(){
  if(assetsLoading)return;assetsLoading=true;assetStatus.textContent='전투 모델 불러오는 중…';
  const priority=['emp','gatling','hive','shield','gunCannon','zombieClassic','zombieSmooth','cityLight','treeDefault','treeDetailed','treeOak','pine','bush','grass','flower'];
  await Promise.allSettled(priority.map(k=>loadModel(k,MODELS[k])));
  rebuildBoardDecor();
  for(const [t,n] of [...towerNodes]){towerGroup.remove(n);towerNodes.delete(t)}
  for(const [e,n] of [...enemyNodes]){enemyGroup.remove(n);enemyNodes.delete(e);enemyMixers.get(e)?.stopAllAction();enemyMixers.delete(e)}
  assetStatus.textContent='기본 포탑 준비 완료 · 진화형 무기와 도시 소품 불러오는 중…';
  const rest=Object.keys(MODELS).filter(k=>!priority.includes(k));
  await Promise.allSettled(rest.map(k=>loadModel(k,MODELS[k])));
  rebuildBoardDecor();rebuildSkyWorld();
  for(const [t,n] of [...towerNodes]){towerGroup.remove(n);towerNodes.delete(t)}
  assetStatus.textContent='SF 포탑 10종 · 감염 도시 에셋 준비 완료';
  setTimeout(()=>assetStatus.style.opacity='.35',1800)
}

function zombieKey(e){return e.kind==='brute'?'zombieSmooth':'zombieClassic'}
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
  const label=textSprite(e.hp,tag,enemyColor(e.hp),e.kind==='brute'?.82:.72);label.position.set(e.labelSide*.06,.92,-.56-e.labelLane*.11);root.add(label);root.userData.label=label;root.userData.hp=e.hp;
  enemyGroup.add(root);enemyNodes.set(e,root);return root
}
function refreshEnemyLabel(e,node){
  if(node.userData.hp===e.hp)return;const old=node.userData.label;if(old){node.remove(old);old.material.map?.dispose();old.material.dispose()}
  const tag=isPrime(e.hp)?'소수 감염':e.kind==='brute'?'대형 감염':'';
  const label=textSprite(e.hp,tag,enemyColor(e.hp),e.kind==='brute'?.82:.72);label.position.set(e.labelSide*.06,.92,-.56-e.labelLane*.11);node.add(label);node.userData.label=label;node.userData.hp=e.hp;node.userData.halo.material.color.setHex(colorHex(enemyColor(e.hp)))
}
function towerVisualIndex(t){
  const def=TOWERS[t.id],steps=def.visualSteps||def.models.map((_,i)=>i);let index=0;
  for(let i=0;i<steps.length;i++)if(t.level>=steps[i])index=i;
  return Math.min(index,def.models.length-1)
}
function towerVisualKey(t){const def=TOWERS[t.id];return def.models[towerVisualIndex(t)]}
function towerVisualName(t){const def=TOWERS[t.id],i=towerVisualIndex(t);return def.visualNames?.[i]||String(def.models[i]||'TURRET').toUpperCase()}
function nextTowerEvolution(t){
  const def=TOWERS[t.id],current=towerVisualIndex(t),steps=def.visualSteps||[];
  for(let i=current+1;i<steps.length;i++)if(steps[i]===t.level+1)return def.visualNames?.[i]||def.models[i];
  return ''
}
function makeTowerNode(t){
  const root=new THREE.Group(),def=TOWERS[t.id],base=new THREE.Mesh(new THREE.CylinderGeometry(.43,.54,.2,12),new THREE.MeshStandardMaterial({color:0x34444b,roughness:.5,metalness:.22}));base.position.y=.11;root.add(base);
  const rr=ring(.49,colorHex(def.color),.7);rr.position.y=.215;root.add(rr);
  const visual=towerVisualKey(t),model=cloneModel(visual,1.15);if(model){model.position.y=.21;root.add(model);root.userData.model=model}else{const f=box(.46,.58,.46,colorHex(def.color),.4);f.position.y=.51;root.add(f)}
  const levelCount=Math.min(5,t.level+1);
  for(let i=0;i<levelCount;i++){
    const a=-Math.PI*.72+i*(Math.PI*1.44/4),lamp=new THREE.Mesh(new THREE.SphereGeometry(.035,7,6),new THREE.MeshStandardMaterial({color:colorHex(def.color),emissive:colorHex(def.color),emissiveIntensity:1.5,roughness:.2}));
    lamp.position.set(Math.cos(a)*.37,.245,Math.sin(a)*.37);root.add(lamp)
  }
  const label=opSprite(def.short,def.color);label.position.set(0,1.12,-.72);label.scale.multiplyScalar(.9);root.add(label);root.userData.visual=visual;root.userData.weaponName=towerVisualName(t);towerGroup.add(root);towerNodes.set(t,root);return root
}
function enemyColor(n){if(isPrime(n))return '#fb7185';if(n%5===0)return '#a78bfa';if(n%3===0)return '#22c55e';if(n%2===0)return '#38bdf8';return '#e2e8f0'}

function pointerCell(ev){
  const r=canvas.getBoundingClientRect();mouse.x=((ev.clientX-r.left)/r.width)*2-1;mouse.y=-((ev.clientY-r.top)/r.height)*2+1;raycaster.setFromCamera(mouse,camera);const pt=new THREE.Vector3();if(!raycaster.ray.intersectPlane(groundPlane,pt))return null;
  const boardX=portraitBoard?-pt.z:pt.x,boardZ=portraitBoard?pt.x:pt.z;
  return{x:Math.round(boardX/CELL+(GRID_W-1)/2),y:Math.round(boardZ/CELL+(GRID_H-1)/2)}
}
function validCell(p){return p&&p.x>=0&&p.y>=0&&p.x<GRID_W&&p.y<GRID_H}
function onPointerDown(e){
  if(!started||state.gameOver)return;initAudio();
  canvas.setPointerCapture?.(e.pointerId);
  pointerStart={id:e.pointerId,x:e.clientX,y:e.clientY,time:performance.now()};pointerDragged=false
}
function onPointerMove(e){
  if(!started)return;
  if(pointerStart&&pointerStart.id===e.pointerId&&Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)>10)pointerDragged=true;
  if(e.pointerType!=='mouse'||pointerDragged)return;
  const p=pointerCell(e);hoverCell=validCell(p)?p:null;syncSelection()
}
function finishPointer(e){
  try{if(canvas.hasPointerCapture?.(e.pointerId))canvas.releasePointerCapture(e.pointerId)}catch(_){}
}
function onPointerUp(e){
  if(!started||state.gameOver){finishPointer(e);pointerStart=null;pointerDragged=false;return}
  const tap=pointerStart&&pointerStart.id===e.pointerId&&!pointerDragged&&Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)<=7&&performance.now()-pointerStart.time<650;
  finishPointer(e);pointerStart=null;pointerDragged=false;if(!tap)return;
  const p=pointerCell(e);if(!validCell(p))return;const t=towerAt(p.x,p.y);
  if(t){selectedBuilt=t;selectedTower=null;syncDeck();syncSelectedPanel();syncSelection();return}
  if(selectedTower)placeTower(selectedTower,p.x,p.y);else{selectedBuilt=null;syncSelectedPanel();syncSelection()}
}
function onPointerCancel(e){finishPointer(e);pointerStart=null;pointerDragged=false}


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
  const t={id,x,y,level:0,coolLeft:0,range:def.range,cool:def.cool,cost:def.cost,aimY:0,recoil:0};state.money-=def.cost;state.towers.push(t);setDecorBuilt(x,y,true);selectedBuilt=t;selectedTower=null;applyBuildMode(false);sfx.build();syncHUD();syncDeck();syncSelectedPanel();syncSelection()
}
function upgradeCost(t){return Math.floor(TOWERS[t.id].cost*(.75+.6*t.level))}
function sellValue(t){let total=TOWERS[t.id].cost;for(let i=0;i<t.level;i++)total+=Math.floor(TOWERS[t.id].cost*(.75+.6*i));return Math.floor(total*.75)}
function upgradeTower(){
  const t=selectedBuilt;if(!t)return;const cost=upgradeCost(t);if(t.level>=4)return toast('최대 강화입니다.');if(state.money<cost)return toast('자원이 부족해요.');
  const beforeVisual=towerVisualName(t);state.money-=cost;t.level++;t.cool=Math.max(.18,t.cool*.78);t.range+=.12;const afterVisual=towerVisualName(t),old=towerNodes.get(t);if(old){towerGroup.remove(old);towerNodes.delete(t)}
  sfx.build();if(beforeVisual!==afterVisual){burst(cellWorld(t.x,t.y,.18),TOWERS[t.id].color);toast(beforeVisual+' → '+afterVisual+' 포탑 진화!')}syncHUD();syncSelectedPanel();syncSelection()
}
function sellTower(){
  const t=selectedBuilt;if(!t)return;state.money+=sellValue(t);state.towers=state.towers.filter(x=>x!==t);const n=towerNodes.get(t);if(n)towerGroup.remove(n);towerNodes.delete(t);setDecorBuilt(t.x,t.y,false);selectedBuilt=null;sfx.click();syncHUD();syncSelectedPanel();syncSelection()
}

function spawnEnemy(value){
  const p=PATH[0],slot=state.enemies.length,kind=value>=60?'brute':value<=10?'runner':isPrime(value)?'prime':'walker';
  const baseSpeed=kind==='runner'?1.02:kind==='brute'?.64:.8;
  const e={id:Math.random().toString(36).slice(2),hp:value,max:value,seg:0,pos:cellWorld(p.x,p.y,.08),speed:baseSpeed+Math.min(.28,state.wave*.022),flash:0,labelLane:slot%3,labelSide:slot%2?1:-1,variant:slot%2?'female':'male',kind,chain:0};state.enemies.push(e)
}
function findTowerTarget(t){
  const tp=cellWorld(t.x,t.y,0);let target=null,best=-1,bestDist=Infinity;
  for(const e of state.enemies){
    if(!canHit(t,e))continue;
    const d=tp.distanceTo(e.pos);
    if(d>t.range*CELL)continue;
    const progress=e.seg;
    if(progress>best||(progress===best&&d<bestDist)){best=progress;bestDist=d;target=e}
  }
  return target
}
function removeProjectile(p){
  if(p.mesh?.parent)fxGroup.remove(p.mesh);
  p.mesh?.geometry?.dispose();p.mesh?.material?.dispose()
}
function projectileMesh(def,id){
  const color=colorHex(def.color),style=def.projectile||'orb',mat=new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:1.15,roughness:.2,metalness:.08});
  if(style==='heavy')return new THREE.Mesh(new THREE.OctahedronGeometry(.105,0),mat);
  if(style==='plasma')return new THREE.Mesh(new THREE.IcosahedronGeometry(.082,1),mat);
  if(style==='tracer')return new THREE.Mesh(new THREE.SphereGeometry(.052,8,8),mat);
  if(style==='emp')return new THREE.Mesh(new THREE.TorusGeometry(.075,.024,7,18),mat);
  if(style==='boost')return new THREE.Mesh(new THREE.OctahedronGeometry(.07,0),mat);
  return new THREE.Mesh(new THREE.SphereGeometry(.06,8,8),mat)
}
function muzzleSparks(pos,color){
  for(let i=0;i<3;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(.026,5,5),new THREE.MeshBasicMaterial({color:colorHex(color)}));m.position.copy(pos);fxGroup.add(m);state.particles.push({mesh:m,vel:new THREE.Vector3((Math.random()-.5)*.8,.45+Math.random()*.55,(Math.random()-.5)*.8),life:.12+Math.random()*.08})}
}
function launchProjectile(t,e){
  const def=TOWERS[t.id],start=cellWorld(t.x,t.y,.72),mesh=projectileMesh(def,t.id);
  mesh.position.copy(start);fxGroup.add(mesh);
  state.projectiles.push({mesh,target:e,tower:t,speed:def.projectileSpeed||7,life:1.4,color:def.color,id:t.id});
  muzzleSparks(start,def.color);t.recoil=1;sfx.shoot()
}
function updateProjectiles(sim){
  for(let i=state.projectiles.length-1;i>=0;i--){
    const p=state.projectiles[i],e=p.target;
    p.life-=sim;
    if(p.life<=0||!state.enemies.includes(e)){removeProjectile(p);state.projectiles.splice(i,1);continue}
    const target=e.pos.clone().setY(.58),from=p.mesh.position.clone(),delta=target.clone().sub(from),dist=delta.length(),step=p.speed*sim;
    if(dist<=step){
      p.mesh.position.copy(target);state.beams.push({a:from,b:target.clone(),color:p.color,life:.07,id:p.id});
      if(canHit(p.tower,e))applyTower(p.tower,e);else{hitBurst(e.pos,p.color);sfx.hit()}
      removeProjectile(p);state.projectiles.splice(i,1);continue
    }
    p.mesh.position.addScaledVector(delta.normalize(),step);
    state.beams.push({a:from,b:p.mesh.position.clone(),color:p.color,life:.055,id:p.id})
  }
}
function applyTower(t,e){
  const def=TOWERS[t.id],before=e.hp;let label='',factor=false;
  if(t.id==='SUB1'){e.hp-=1;label=before+'−1='+e.hp;e.chain=0}
  else if(t.id==='ADD1'){e.hp+=1;label=before+'+1='+e.hp;e.chain=0}
  else{e.hp=before/def.value;label=before+'÷'+def.value+'='+e.hp;e.chain=(e.chain||0)+1;factor=true;
    if(e.hp>5&&isPrime(e.hp)&&!state.residualHintShown){state.residualHintShown=true;setTimeout(()=>toast(e.hp+' 같은 소수가 남았어요. 길 뒤쪽에도 ±1 교정기와 나눗셈 터렛을 이어 두세요.'),120)}}
  e.flash=.24;impactShake=Math.max(impactShake,.12);state.texts.push({pos:e.pos.clone().add(new THREE.Vector3(e.labelSide*.18,.9,-.42-e.labelLane*.06)),text:label,color:def.color,life:.72});
  if(factor&&e.chain>=2)state.texts.push({pos:e.pos.clone().add(new THREE.Vector3(-e.labelSide*.18,.95,-.68)),text:'FACTOR ×'+e.chain,color:'#fde68a',life:.82});
  hitBurst(e.pos,def.color);feed(label,def.color);sfx.hit();if(e.hp===1)purifyEnemy(e)
}
function purifyEnemy(e){
  const reward=Math.max(8,Math.min(40,8+Math.ceil(Math.log2(e.max+1))*3+(e.chain||0)*2));state.money+=reward;state.kills++;state.enemies=state.enemies.filter(x=>x!==e);const n=enemyNodes.get(e);if(n){enemyGroup.remove(n);enemyNodes.delete(e)}enemyMixers.get(e)?.stopAllAction();enemyMixers.delete(e);
  state.texts.push({pos:e.pos.clone().add(new THREE.Vector3(0,.9,-.52)),text:'완전 분해! +'+reward,color:'#86efac',life:1.0});burst(e.pos,'#86efac');syncHUD()
}
function hitBurst(pos,color){for(let i=0;i<4;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(.035,6,6),new THREE.MeshBasicMaterial({color:colorHex(color)}));m.position.copy(pos).add(new THREE.Vector3(0,.52,0));fxGroup.add(m);state.particles.push({mesh:m,vel:new THREE.Vector3((Math.random()-.5)*1.6,.7+Math.random()*1.4,(Math.random()-.5)*1.6),life:.2+Math.random()*.18})}}
function burst(pos,color){impactShake=Math.max(impactShake,.22);for(let i=0;i<10;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(.045,6,6),new THREE.MeshBasicMaterial({color:colorHex(color)}));m.position.copy(pos).add(new THREE.Vector3(0,.45,0));fxGroup.add(m);state.particles.push({mesh:m,vel:new THREE.Vector3((Math.random()-.5)*2.4,1+Math.random()*2,(Math.random()-.5)*2.4),life:.4+Math.random()*.35})}}

function startWave(){
  if(state.waveActive||state.gameOver)return;const cfg=waveConfig();state.waveActive=true;state.spawnQueue=[];for(let i=0;i<cfg.count;i++)state.spawnQueue.push(cfg.nums[i%cfg.nums.length]);state.spawnTimer=.35;document.body.classList.add('wave-live');sfx.click();$('startWaveBtn').disabled=true;syncHUD()
}
function waveClear(){
  state.waveActive=false;document.body.classList.remove('wave-live');const bonus=70+state.wave*18;state.money+=bonus;state.wave++;if(state.wave>state.best){state.best=state.wave;try{localStorage.setItem('numTD_best',String(state.best))}catch(_){}}
  const unlocked=Object.values(TOWERS).filter(d=>d.unlock===state.wave).map(d=>d.name);sfx.clear();toast('감염 웨이브 정화! +'+bonus+' 자원'+(unlocked.length?' · 신규 '+unlocked.join(' / '):''));syncHUD();syncDeck();$('startWaveBtn').disabled=false
}
function loseCore(e){
  const dmg=Math.max(1,Math.ceil(e.hp/5));state.lives-=dmg;const n=enemyNodes.get(e);if(n){enemyGroup.remove(n);enemyNodes.delete(e)}enemyMixers.get(e)?.stopAllAction();enemyMixers.delete(e);state.enemies=state.enemies.filter(x=>x!==e);core.userData.orb.scale.setScalar(1.3);setTimeout(()=>core.userData.orb.scale.setScalar(1),150);sfx.hit();if(state.lives<=0)gameOver();syncHUD()
}
function gameOver(){
  state.gameOver=true;state.waveActive=false;document.body.classList.remove('wave-live');state.paused=true;syncBgm();const result='도달 웨이브 '+state.wave+' · 정화 '+state.kills+'마리';$('resultText').textContent=result;$('gameOverScreen').classList.add('show')
}

function update(dt){
  if(!started||state.paused||state.gameOver)return;const sim=dt;
  state.beams.forEach(b=>b.life-=sim);state.beams=state.beams.filter(b=>b.life>0);state.texts.forEach(t=>{t.pos.z-=.45*sim;t.life-=sim});state.texts=state.texts.filter(t=>t.life>0);
  for(let i=state.particles.length-1;i>=0;i--){const p=state.particles[i];p.life-=sim;p.vel.y-=4.4*sim;p.mesh.position.addScaledVector(p.vel,sim);if(p.life<=0){fxGroup.remove(p.mesh);state.particles.splice(i,1)}}
  updateProjectiles(sim);
  if(!state.waveActive)return;
  if(state.spawnQueue.length){state.spawnTimer-=sim;if(state.spawnTimer<=0){spawnEnemy(state.spawnQueue.shift());state.spawnTimer=1.02*Math.max(.55,1-state.wave*.028)}}
  for(let i=state.enemies.length-1;i>=0;i--){const e=state.enemies[i],next=PATH[e.seg+1];if(!next){loseCore(e);continue}const target=cellWorld(next.x,next.y,.08),delta=target.clone().sub(e.pos),dist=delta.length(),step=e.speed*sim;if(dist<=step){e.pos.copy(target);e.seg++}else e.pos.addScaledVector(delta.normalize(),step);if(e.flash>0)e.flash-=sim}
  for(const t of state.towers){
    t.coolLeft-=sim;t.recoil=Math.max(0,(t.recoil||0)-sim*7.5);
    const target=findTowerTarget(t);if(!target)continue;
    const tp=cellWorld(t.x,t.y,0),d=target.pos.clone().sub(tp),wanted=Math.atan2(d.x,d.z),def=TOWERS[t.id];
    t.aimY=turnToward(Number.isFinite(t.aimY)?t.aimY:0,wanted,(def.turnSpeed||5)*sim);
    if(t.coolLeft>0||Math.abs(shortestAngle(t.aimY,wanted))>.085)continue;
    launchProjectile(t,target);t.coolLeft=t.cool
  }
  if(state.waveActive&&!state.spawnQueue.length&&!state.enemies.length)waveClear()
}

function sync3D(dt,time){
  const liveT=new Set(state.towers);for(const [t,n] of [...towerNodes])if(!liveT.has(t)){towerGroup.remove(n);towerNodes.delete(t)}
  for(const t of state.towers){
    let n=towerNodes.get(t)||makeTowerNode(t);
    if(n.userData.visual!==towerVisualKey(t)){towerGroup.remove(n);towerNodes.delete(t);n=makeTowerNode(t)}
    n.position.copy(cellWorld(t.x,t.y,.07));n.scale.setScalar(1+t.level*.035);n.rotation.y=Number.isFinite(t.aimY)?t.aimY:0;
    if(n.userData.model)n.userData.model.position.z=-(t.recoil||0)*.075
  }
  const liveE=new Set(state.enemies);for(const [e,n] of [...enemyNodes])if(!liveE.has(e)){enemyGroup.remove(n);enemyNodes.delete(e);enemyMixers.get(e)?.stopAllAction();enemyMixers.delete(e)}
  for(const e of state.enemies){let n=enemyNodes.get(e)||makeEnemyNode(e);n.position.copy(e.pos);refreshEnemyLabel(e,n);const next=PATH[Math.min(e.seg+1,PATH.length-1)],tp=cellWorld(next.x,next.y,0),d=tp.clone().sub(e.pos);if(d.lengthSq()>.01){const wanted=Math.atan2(d.x,d.z);n.rotation.y=turnToward(n.rotation.y,wanted,dt*(e.kind==='runner'?7.5:5.2))}n.position.y=.08+Math.sin(time*4+e.seg)*.035;const hit=e.flash>0?Math.min(1,e.flash/.24):0;if(n.userData.model){n.userData.model.position.y=Math.abs(Math.sin(time*5+e.seg))*.025;n.userData.model.rotation.z=Math.sin(time*3.4+e.seg)*.035+hit*e.labelSide*.1;n.userData.model.rotation.x=hit*.08}n.scale.lerp(new THREE.Vector3(1+hit*.08,1-hit*.03,1+hit*.08),.32);enemyMixers.get(e)?.update(dt*Math.max(.7,state.speed*.8))}
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
  if(impactShake>0){const n=impactShake*.08;camera.position.x+=(Math.random()-.5)*n;camera.position.z+=(Math.random()-.5)*n}
  renderer.render(scene,camera);
  camera.position.set(bx,by,bz)
}


function syncHUD(){
  $('waveValue').textContent=state.wave;$('moneyValue').textContent=state.money;$('coreValue').textContent=state.lives+'/'+state.maxLives;$('killValue').textContent=state.kills;
  const cfg=waveConfig(),threat=Math.min(5,1+Math.floor((state.wave-1)/2));$('enemyPreview').textContent=cfg.nums.join(' · ');$('enemyCount').textContent=cfg.count+' 감염체';$('waveMission').textContent=cfg.mission;$('threatLevel').textContent='위협도 '+threat;$('missionLine').textContent=state.waveActive?'감염체 접근 중 · FACTOR CHAIN 가동':'포탑 배치 → 숫자 분해 → 대피소 방어';$('startWaveBtn').disabled=state.waveActive||state.gameOver;$('startWaveBtn').textContent=state.waveActive?'● 방어 작전 진행 중':'▶ WAVE '+state.wave+' 시작'
}
function syncDeck(){
  document.querySelectorAll('.towerCard[data-tower]').forEach(btn=>{const d=TOWERS[btn.dataset.tower],locked=state.wave<d.unlock;btn.classList.toggle('locked',locked);btn.classList.toggle('selected',selectedTower===d.id);btn.disabled=locked;const cost=btn.querySelector('.costValue');if(cost)cost.textContent=d.cost});
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
  const p=$('selectedPanel');if(!selectedBuilt){p.classList.add('hidden');return}const d=TOWERS[selectedBuilt.id],next=nextTowerEvolution(selectedBuilt);
  p.classList.remove('hidden');$('selectedType').textContent=d.short+' 포탑';$('selectedName').textContent=d.name;$('selectedLevel').textContent='Lv.'+(selectedBuilt.level+1);$('selectedWeapon').textContent=towerVisualName(selectedBuilt);
  $('upgradeBtn').textContent=selectedBuilt.level>=4?'최대 강화':('강화 '+upgradeCost(selectedBuilt)+(next?' → '+next:''));$('sellBtn').textContent='판매 '+sellValue(selectedBuilt)
}
function feed(text,color){const wrap=$('calcFeed'),el=document.createElement('div');el.className='calcItem';el.textContent=text;el.style.borderColor=color;wrap.prepend(el);while(wrap.children.length>4)wrap.lastChild.remove();setTimeout(()=>el.remove(),900)}
function toast(msg){const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),1200)}
function autoBuild(){
  if(state.wave!==1||state.autoUsed||state.waveActive)return;for(const p of RECOMMENDED){const d=TOWERS[p.id];if(state.wave>=d.unlock&&state.money>=d.cost&&!towerAt(p.x,p.y)){state.money-=d.cost;state.towers.push({id:p.id,x:p.x,y:p.y,level:0,coolLeft:0,range:d.range,cool:d.cool,cost:d.cost,aimY:0,recoil:0});setDecorBuilt(p.x,p.y,true)}}state.autoUsed=true;sfx.build();toast('추천 배치 완료');syncHUD();syncDeck()
}
function resetGame(){
  for(const n of towerNodes.values())towerGroup.remove(n);for(const n of enemyNodes.values())enemyGroup.remove(n);for(const m of enemyMixers.values())m.stopAllAction();towerNodes.clear();enemyNodes.clear();enemyMixers.clear();
  for(const child of [...fxGroup.children]){fxGroup.remove(child);child.geometry?.dispose();child.material?.dispose()}
  for(const child of [...ui3dGroup.children]){if(child===hoverTile||child===rangeRing)continue;ui3dGroup.remove(child);child.material?.map?.dispose();child.material?.dispose()}
  document.body.classList.remove('wave-live');state.wave=1;state.money=520;state.lives=20;state.kills=0;state.towers=[];state.enemies=[];state.spawnQueue=[];state.spawnTimer=0;state.waveActive=false;state.paused=false;state.speed=1;state.gameOver=false;state.autoUsed=false;state.residualHintShown=false;state.beams=[];state.projectiles=[];state.texts=[];state.particles=[];selectedTower=null;selectedBuilt=null;hoverCell=null;hoverTile.visible=false;rangeRing.visible=false;for(const [key] of decorCells){const [x,y]=key.split(',').map(Number);setDecorBuilt(x,y,false)}applyBuildMode(false);syncHUD();syncDeck();syncSelectedPanel();setGameSpeed(1);$('pauseBtn').textContent='⏸';syncBgm()
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
$('soundBtn').addEventListener('click',()=>{soundOn=!soundOn;$('soundBtn').textContent=soundOn?'🔊':'🔇';syncBgm()});
$('startGameBtn').addEventListener('click',()=>{initAudio();started=true;$('startScreen').classList.remove('show');syncHUD();syncDeck();syncBgm();toast('약수 터렛을 골라 도로 주변에 설치하세요.')});
$('restartBtn').addEventListener('click',()=>{$('gameOverScreen').classList.remove('show');started=true;resetGame()});
document.addEventListener('visibilitychange',syncBgm);

try{initThree();syncHUD();syncDeck();syncSelectedPanel();document.body.dataset.gameReady='1'}catch(err){console.error('[MathTD] boot failed',err);assetStatus.textContent='3D 전장 초기화 오류';assetStatus.style.opacity='1';$('startGameBtn').disabled=true;$('startGameBtn').textContent='3D 전장 오류'}
})();
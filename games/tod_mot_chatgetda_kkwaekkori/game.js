import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import { STAGES, COLORS, BLOCK_PITCH, makeTown, getBlockCenter, getRoutePosition, movePeople, getClue } from './sim.mjs';

const $ = id => document.getElementById(id);
const ROOT = '../../assets/game/';
const MODEL = {
  buildings: ['a','b','c','d','f','g','h','i','k','m','n','p'].map(name => `${ROOT}3d/city/kenney-city-kit-suburban/building-type-${name}.glb`),
  parkTree: `${ROOT}3d/nature/kenney-nature-kit/tree-default.glb`,
  shopTree: `${ROOT}3d/city/kenney-city-kit-suburban/tree-small.glb`,
  bench: `${ROOT}3d/interiors/kenney-furniture-kit/bench.glb`,
  cars: [ `${ROOT}3d/vehicles/kenney-car-kit/sedan.glb`, `${ROOT}3d/vehicles/kenney-car-kit/taxi.glb`, `${ROOT}3d/vehicles/kenney-car-kit/van.glb` ],
  people: ['female','male'].flatMap(type => 'abcdef'.split('').map(letter => `${ROOT}characters/people/character-${type}-${letter}.glb`))
};
const loader = new GLTFLoader();
const modelCache = new Map();
const colors = { grass: 0x92bf8e, road: 0x82979a, concrete: 0xe9dcc1, sky: 0xc4e6e9, white: 0xfff7e6 };
const flat = color => new THREE.MeshStandardMaterial({color,roughness:0.85});
const scene = new THREE.Scene();
scene.background = new THREE.Color(colors.sky);
scene.fog = new THREE.Fog(colors.sky, 52, 130);
scene.add(new THREE.HemisphereLight(0xfffce9, 0x7eaf9d, 2.4));
const sun = new THREE.DirectionalLight(0xfff0ce, 2.6);
sun.position.set(-12, 21, 13);
scene.add(sun);
const canvas = $('town');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.55));
const camera = new THREE.OrthographicCamera(-10,10,10,-10,0.1,200);
const cameraLook = new THREE.Vector3();
const cameraOffset = new THREE.Vector3(11,17,20);
const scenery = new THREE.Group(), citizens = new THREE.Group(), movingCars = new THREE.Group(), marker = new THREE.Group();
scene.add(scenery,citizens,movingCars,marker);
let town = null, viewSize = 21, initialViewSize = 21, worldSerial = 0, currentTarget = 0, found = [], hintLevel = 0;
let active = false, zoomTouchDist = 0, tapStart = null, lastFrame = performance.now(), lastToast = 0;
const pointerPositions = new Map();
const citizenMeshes = new Map();
const cars = [];
const mixers = [];
const SAVE_KEY = window.KidscadeGame?.storageKey?.('tod_mot_chatgetda_kkwaekkori','session') || 'kidscade_game_v1:tod_mot_chatgetda_kkwaekkori:session';

function loadGLB(url) {
  if (!modelCache.has(url)) modelCache.set(url,new Promise(resolve => loader.load(url, resolve, undefined, () => resolve(null))));
  return modelCache.get(url);
}
function owned(mesh) {mesh.userData.procedural = true;return mesh}
function disposeProcedural(root) {
  root.traverse?.(object => {
    if(!object.isMesh||!object.userData.procedural)return;
    object.geometry.dispose();
    if(Array.isArray(object.material))object.material.forEach(material=>material.dispose());
    else object.material?.dispose();
  });
}
function normalizedModel(gltf, longest = 2.5) {
  if (!gltf) return null;
  const object = cloneSkeleton(gltf.scene);
  object.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(object);
  const dimension = box.getSize(new THREE.Vector3());
  object.scale.multiplyScalar(longest / (Math.max(dimension.x,dimension.y,dimension.z) || 1));
  object.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  object.position.set(-center.x,-box.min.y,-center.z);
  return object;
}
function modelIn(group, url, longest, fallback, parent, revision) {
  group.add(fallback);
  loadGLB(url).then(gltf => {
    if (!gltf || worldSerial !== revision || !parent.parent) return;
    const model = normalizedModel(gltf,longest);
    if (!model) return;
    group.remove(fallback);
    disposeProcedural(fallback);
    group.add(model);
  });
}
function cube(x,y,z,color) {return owned(new THREE.Mesh(new THREE.BoxGeometry(x,y,z),flat(color)));}
function cylinder(top,bottom,height,color,sides=9) {return owned(new THREE.Mesh(new THREE.CylinderGeometry(top,bottom,height,sides),flat(color)));}
function ball(radius,color) {return owned(new THREE.Mesh(new THREE.SphereGeometry(radius,10,8),flat(color)));}
function addPart(parent, mesh, x, y, z) {mesh.position.set(x,y,z); parent.add(mesh);return mesh;}

function buildingFallback(block) {
  const g = new THREE.Group();
  const palette = [0xd7a58a,0x96b7d6,0xf6c875,0xa6bf97,0xe6aaaf];
  const color = palette[(block.col+block.row*2)%palette.length];
  addPart(g,cube(2.1,1.5,2,color),0,.75,0);
  const roof = addPart(g,owned(new THREE.Mesh(new THREE.ConeGeometry(1.54,.85,4),flat(0xba7a65))),0,1.9,0);
  roof.rotation.y = Math.PI/4;
  addPart(g,cube(.65,.92,.12,0x765e54),0,.46,1.01);
  return g;
}
function treeFallback() {
  const g=new THREE.Group();
  addPart(g,cylinder(.1,.13,.65,0x997656),0,.35,0);
  addPart(g,owned(new THREE.Mesh(new THREE.ConeGeometry(.56,1.1,7),flat(0x5ca16b))),0,1.03,0);
  return g;
}
function placeObject(url, center, longest, fallback, revision) {
  const pivot = new THREE.Group();
  pivot.position.set(center.x,0,center.z);
  scenery.add(pivot);
  modelIn(pivot,url,longest,fallback,pivot,revision);
  return pivot;
}
function generateWorld() {
  for(const group of [scenery,citizens,movingCars,marker])disposeProcedural(group);
  scenery.clear();citizens.clear();movingCars.clear();marker.clear();citizenMeshes.clear();cars.length=0;
  mixers.length=0;
  if (!town) return;
  const revision=++worldSerial;
  const {cols,rows}=town.config;
  const width=cols*BLOCK_PITCH+1,depth=rows*BLOCK_PITCH+1;
  const base=cube(width,.25,depth,0x8fbd93);base.position.y=-.17;scenery.add(base);
  // Lane ribbons are deliberately between blocks; residents always walk on the inner sidewalk.
  for (let col=0;col<cols-1;col++) {
    const x=(col+.5-(cols-1)/2)*BLOCK_PITCH;
    addPart(scenery,cube(.65,.028,depth,colors.road),x,.003,0);
  }
  for (let row=0;row<rows-1;row++) {
    const z=(row+.5-(rows-1)/2)*BLOCK_PITCH;
    addPart(scenery,cube(width,.028,.65,colors.road),0,.007,z);
  }
  for (let i=0;i<town.blocks.length;i++) {
    const block=town.blocks[i],center=getBlockCenter(block,town.config);
    const parcel=addPart(scenery,cube(4.53,.035,4.53,block.kind==='park'?0xa6c987:colors.concrete),center.x,.03,center.z);
    parcel.userData.block=block.id;
    if(block.kind==='park'||block.kind==='plaza') {
      addPart(scenery,cube(2.05,.05,.9,block.kind==='park'?0xe7d5ac:0xdabf9c),center.x,.073,center.z);
      const tree=placeObject(MODEL.parkTree,{x:center.x-1,z:center.z-.7},1.55,treeFallback(),revision);tree.rotation.y=i*.9;
      const bench=placeObject(MODEL.bench,{x:center.x+.75,z:center.z+.35},1.02,cube(.92,.3,.45,0x977452),revision);bench.rotation.y=i*.55;
      if(block.kind==='plaza')addPart(scenery,ball(.35,0x7ec4d7),center.x,.4,center.z);
    } else {
      const fallback=buildingFallback(block);
      const style=MODEL.buildings[(i+(block.kind==='bakery'?3:block.kind==='school'?6:0))%MODEL.buildings.length];
      const shop=placeObject(style,center,block.kind==='school'?2.9:2.55,fallback,revision);
      shop.rotation.y=(i%4)*Math.PI/2;
      if(i%2===0) {
        const corner={x:center.x+1.1,z:center.z-1.1};
        const tree=placeObject(MODEL.shopTree,corner,1.23,treeFallback(),revision);
        tree.rotation.y=i;
      }
    }
  }
  for(const person of town.people) {
    const holder=new THREE.Group();
    const body=new THREE.Group();
    const appearance=new THREE.Group();
    holder.add(body,appearance);
    citizens.add(holder);
    citizenMeshes.set(person.id,{holder,body,appearance,person});
    makeCitizenAppearance(person,body,appearance,revision);
  }
  if(rows>1) {
    for(let i=0;i<Math.min(3,Math.max(1,Math.floor(cols/2)));i++) {
      const holder=new THREE.Group();movingCars.add(holder);
      const fallback=cube(1.05,.38,.62,[0x4e99d2,0xebc25d,0xe17e85][i]);fallback.position.y=.23;
      modelIn(holder,MODEL.cars[i],1.25,fallback,holder,revision);
      const z=(-((rows-1)/2)+.5)*BLOCK_PITCH;
      cars.push({holder,z,phase:i*.33,direction:i%2?-1:1,speed:.9+i*.16,width});
    }
  }
  const markerRing=owned(new THREE.Mesh(new THREE.TorusGeometry(.47,.042,8,32),new THREE.MeshBasicMaterial({color:0xffcc57,transparent:true,opacity:.93,depthTest:false})));
  markerRing.rotation.x=-Math.PI/2;markerRing.renderOrder=10;markerRing.name='hint-ring';markerRing.visible=false;marker.add(markerRing);
  positionEverything(0);
}

function makeCitizenAppearance(person,body,appearance,revision) {
  const shirt=COLORS[person.clothingColor].hex;
  const skin=[0xffd1a7,0xe7ac81,0xc98c69,0x8a624e][person.skin];
  const hair=[0x47352c,0x302b36,0x775039,0xbaa16b][person.hair];
  const fallback=new THREE.Group();
  addPart(fallback,ball(.25,skin),0,.91,0);
  addPart(fallback,ball(.245,hair),0,1.075,-.03).scale.set(1,.32,1);
  addPart(fallback,ball(.22,shirt),0,.51,0).scale.set(1,1.25,.77);
  for(const side of [-1,1]) {
    addPart(fallback,cylinder(.082,.083,.28,0x576681),side*.12,.22,0);
    addPart(fallback,ball(.085,skin),side*.30,.55,.005);
    addPart(fallback,cube(.16,.10,.21,0x5d5a60),side*.12,.071,.04);
  }
  body.add(fallback);
  // Reuse the town's actual animated-capable people GLBs; the colorful hat/bag stay on top.
  loadGLB(MODEL.people[person.modelVariant]).then(gltf=>{
    if(!gltf||worldSerial!==revision||!body.parent)return;
    const model=normalizedModel(gltf,1.1);
    if(model){
      body.remove(fallback);disposeProcedural(fallback);body.add(model);
      const clip=gltf.animations?.find(animation=>/walk/i.test(animation.name));
      if(clip){const mixer=new THREE.AnimationMixer(model);mixer.clipAction(clip).play();mixers.push({mixer,person})}
    }
  });
  const hatColor=COLORS[person.hatColor].hex;
  const bagColor=COLORS[person.bagColor].hex;
  if(person.hatStyle===2) {
    addPart(appearance,owned(new THREE.Mesh(new THREE.ConeGeometry(.25,.33,10),flat(hatColor))),0,1.25,0);
    addPart(appearance,ball(.095,0xfff6e4),0,1.44,0);
  } else {
    const crown=addPart(appearance,ball(.268,hatColor),0,1.185,0);
    crown.scale.set(1,.48,1);
    if(person.hatStyle===0)addPart(appearance,cube(.31,.045,.22,hatColor),0,1.13,.22);
    else addPart(appearance,cylinder(.33,.33,.055,hatColor,16),0,1.13,0);
  }
  addPart(appearance,cube(.32,.44,.20,bagColor),0,.55,-.25);
  for(const side of [-1,1])addPart(appearance,cube(.045,.44,.045,0xffffff),side*.12,.61,-.26);
}

function positionEverything(dt) {
  if(!town)return;
  movePeople(town,dt);
  for(const p of town.people) {
    const mesh=citizenMeshes.get(p.id);
    if(!mesh)continue;
    const pos=getRoutePosition(p,town.config);
    mesh.holder.position.set(pos.x,0.08,pos.z);
    const eps=.012*p.direction,next=getRoutePosition({...p,progress:p.progress+eps},town.config);
    mesh.holder.rotation.y=Math.atan2(next.x-pos.x,next.z-pos.z);
    mesh.body.position.y=p.action==='walk'?Math.abs(Math.sin(performance.now()*.006+p.modelVariant))*0.022:0;
    mesh.body.rotation.z=p.action==='wave'?Math.sin(performance.now()*.008)*.06:0;
  }
  for(const car of cars) {
    car.phase=(car.phase+dt*car.speed/car.width)%1;
    car.holder.position.set((car.phase-.5)*car.width*car.direction,.10,car.z);
    car.holder.rotation.y=car.direction>0?Math.PI/2:-Math.PI/2;
  }
  const ring=marker.getObjectByName('hint-ring');
  if(ring){
    const target=getTarget();
    ring.visible=active&&hintLevel>=3&&!!target;
    if(target){const pos=getRoutePosition(target,town.config);ring.position.set(pos.x,.12+Math.sin(performance.now()*.005)*.045,pos.z)}
  }
}

function getTarget(){return town?.people.find(p=>p.id===town.order[currentTarget])||null}
function setClue(){
  const clue=getClue(getTarget());
  if(!clue)return;
  $('clueTitle').textContent=clue.title;
  $('clueText').textContent='같은 모자와 가방을 찾아봐!';
  $('hatName').textContent=clue.hatShape==='beanie'?'털모자':clue.hatShape==='brim'?'벙거지':'모자';
  $('hatIcon').textContent=clue.hatShape==='brim'?'👒':clue.hatShape==='beanie'?'🧶':'🧢';
  $('hatColor').style.background=clue.hat.hex;
  $('bagColor').style.background=clue.bag.hex;
  $('progress').textContent=`찾은 친구 ${found.length} / ${town.config.targets}`;
  $('hintText').textContent='';hintLevel=0;
}
function announceClue(){
  const clue=getClue(getTarget());
  if(!clue)return;
  if('speechSynthesis' in window){
    speechSynthesis.cancel();
    const utterance=new SpeechSynthesisUtterance(clue.subtitle);
    utterance.lang='ko-KR';utterance.rate=.88;
    speechSynthesis.speak(utterance);
  }else showToast(clue.subtitle);
}
function getSeed(){return (Date.now() + Math.floor(Math.random()*999999))>>>0}
function startTown(stage,seed=getSeed(),restored=[]) {
  if(!STAGES[stage])return;
  town=makeTown(stage,seed);found=[...new Set(restored.filter(id=>town.order.includes(id)))];
  currentTarget=found.length;
  active=currentTarget<town.config.targets;
  initialViewSize=0;
  cameraLook.set(0,0,0);
  $('districtLabel').textContent=town.config.label;
  $('start').classList.add('hidden');$('finish').classList.add('hidden');
  resize();resetView();generateWorld();
  if(active){setClue();save();}
  else finishRound();
}
function save(){
  if(!town)return;
  try{localStorage.setItem(SAVE_KEY,JSON.stringify({stage:town.stageName,seed:town.seed,found,updatedAt:Date.now()}))}catch(_){}
}
function showToast(message){
  $('toast').textContent=message;
  $('toast').classList.add('show');
  clearTimeout(lastToast);
  lastToast=setTimeout(()=>$('toast').classList.remove('show'),2200);
}
function pick(clientX,clientY) {
  if(!active)return;
  const rect=canvas.getBoundingClientRect();
  let nearest=null,best=31*31;
  for(const person of town.people){
    if(found.includes(person.id))continue;
    const holder=citizenMeshes.get(person.id)?.holder;
    if(!holder)continue;
    const projected=holder.position.clone().add(new THREE.Vector3(0,1.04,0)).project(camera);
    if(projected.z< -1||projected.z>1)continue;
    const x=rect.left+(projected.x+1)*rect.width/2;
    const y=rect.top+(1-projected.y)*rect.height/2;
    const distance=(x-clientX)**2+(y-clientY)**2;
    if(distance<best){best=distance;nearest=person}
  }
  if(!nearest)return;
  if(nearest.id!==town.order[currentTarget]){
    showToast('앗, 이 친구는 아니에요! 다시 찾아볼까요?');
    try{window.KidscadeGame?.sound?.('click')}catch(_){}
    return;
  }
  found.push(nearest.id);currentTarget++;
  showToast('🎉 찾았다! 정말 잘했어!');
  try{window.KidscadeGame?.sound?.('success');window.KidscadeGame?.milestone?.('person_found',{found:found.length,stage:town.stageName})}catch(_){}
  if(currentTarget>=town.config.targets){finishRound()}
  else setClue();
  save();
}
function finishRound(){
  active=false;
  if(!town)return;
  $('finishTitle').textContent='못 찾겠다 꾀꼬리? 다 찾았다!';
  $('finishText').textContent=`${town.config.label}에서 친구 ${town.config.targets}명을 전부 찾았어요. 대단해요!`;
  $('finish').classList.remove('hidden');
  $('progress').textContent=`찾은 친구 ${town.config.targets} / ${town.config.targets}`;
  try{window.KidscadeGame?.gameOver?.({success:true,score:town.config.targets,stage:town.stageName})}catch(_){}
  save();
}
function hint(){
  if(!active)return;
  hintLevel=Math.min(3,hintLevel+1);
  const person=getTarget();
  if(!person)return;
  if(hintLevel===1)$('hintText').textContent=`📍 ${getClue(person).place}`;
  else if(hintLevel===2){
    $('hintText').textContent='👀 친구가 있는 거리로 화면을 옮겼어요.';
    const center=getBlockCenter(person.block,town.config);cameraLook.x=center.x;cameraLook.z=center.z;
    viewSize=Math.max(9,Math.min(viewSize,12));resize();updateCamera();
  }else $('hintText').textContent='✨ 반짝이는 동그라미를 살펴봐요!';
  try{window.KidscadeGame?.sound?.('click')}catch(_){}
}

function updateCamera(){camera.position.copy(cameraLook).add(cameraOffset);camera.lookAt(cameraLook)}
function resize(){
  const rect=canvas.getBoundingClientRect();
  const width=Math.max(1,rect.width),height=Math.max(1,rect.height),aspect=width/height;
  if(town&&!initialViewSize){
    const worldWidth=town.config.cols*BLOCK_PITCH+1,worldDepth=town.config.rows*BLOCK_PITCH+1;
    // A fitted isometric view for each stage, including portrait layouts.
    initialViewSize=Math.max(13,worldDepth*.85+worldWidth*.34,worldWidth*.84/aspect);
    viewSize=initialViewSize;
  }
  camera.left=-viewSize*aspect/2;camera.right=viewSize*aspect/2;
  camera.top=viewSize/2;camera.bottom=-viewSize/2;
  camera.updateProjectionMatrix();renderer.setSize(width,height,false);
  updateCamera();
}
function resetView(){if(!town)return;cameraLook.set(0,0,0);viewSize=initialViewSize;resize()}
function zoom(factor){
  if(!town)return;
  viewSize=THREE.MathUtils.clamp(viewSize*factor,7,Math.max(initialViewSize*1.25,11));resize();
}
function pan(dx,dy){
  const rect=canvas.getBoundingClientRect();
  const right=new THREE.Vector3().setFromMatrixColumn(camera.matrix,0);
  const up=new THREE.Vector3().setFromMatrixColumn(camera.matrix,1);
  cameraLook.addScaledVector(right,-dx*viewSize/Math.max(1,rect.height));
  cameraLook.addScaledVector(up,dy*viewSize/Math.max(1,rect.height));
  cameraLook.y=0;
  const limitX=(town.config.cols*BLOCK_PITCH)/2,limitZ=(town.config.rows*BLOCK_PITCH)/2;
  cameraLook.x=THREE.MathUtils.clamp(cameraLook.x,-limitX,limitX);
  cameraLook.z=THREE.MathUtils.clamp(cameraLook.z,-limitZ,limitZ);
  updateCamera();
}
canvas.addEventListener('pointerdown',event=>{
  canvas.setPointerCapture(event.pointerId);
  pointerPositions.set(event.pointerId,{x:event.clientX,y:event.clientY});
  if(pointerPositions.size===1)tapStart={id:event.pointerId,x:event.clientX,y:event.clientY,lastX:event.clientX,lastY:event.clientY,moved:false};
  else if(tapStart)tapStart.moved=true;
});
canvas.addEventListener('pointermove',event=>{
  if(!pointerPositions.has(event.pointerId))return;
  pointerPositions.set(event.pointerId,{x:event.clientX,y:event.clientY});
  if(pointerPositions.size===2){
    const [a,b]=[...pointerPositions.values()];const distance=Math.hypot(a.x-b.x,a.y-b.y);
    if(zoomTouchDist)zoom(zoomTouchDist/distance);
    zoomTouchDist=distance;if(tapStart)tapStart.moved=true;return;
  }
  if(tapStart?.id===event.pointerId){
    if(Math.hypot(event.clientX-tapStart.x,event.clientY-tapStart.y)>8)tapStart.moved=true;
    if(tapStart.moved&&town)pan(event.clientX-tapStart.lastX,event.clientY-tapStart.lastY);
    tapStart.lastX=event.clientX;tapStart.lastY=event.clientY;
  }
});
function releasePointer(event,canceled=false){
  const tap=!canceled&&pointerPositions.size===1&&tapStart?.id===event.pointerId&&!tapStart.moved;
  pointerPositions.delete(event.pointerId);zoomTouchDist=0;
  if(tap)pick(event.clientX,event.clientY);
  if(event.pointerId===tapStart?.id)tapStart=null;
}
canvas.addEventListener('pointerup',event=>releasePointer(event));
canvas.addEventListener('pointercancel',event=>releasePointer(event,true));
canvas.addEventListener('wheel',event=>{event.preventDefault();zoom(event.deltaY>0?1.11:.9)},{passive:false});
$('zoomIn').addEventListener('click',()=>zoom(.82));
$('zoomOut').addEventListener('click',()=>zoom(1.22));
$('resetViewBtn').addEventListener('click',resetView);
$('hintBtn').addEventListener('click',hint);
$('speakBtn').addEventListener('click',announceClue);
$('menuBtn').addEventListener('click',()=>{$('finish').classList.add('hidden');$('start').classList.remove('hidden')});
document.querySelectorAll('[data-stage]').forEach(button=>button.addEventListener('click',()=>startTown(button.dataset.stage)));
$('againBtn').addEventListener('click',()=>startTown(town.stageName));
$('otherStageBtn').addEventListener('click',()=>{$('finish').classList.add('hidden');$('start').classList.remove('hidden')});
window.addEventListener('resize',resize);

function animate(now){
  requestAnimationFrame(animate);
  const dt=Math.min(.05,Math.max(0,(now-lastFrame)/1000));lastFrame=now;
  if(town&&$('start').classList.contains('hidden')&&active){
    positionEverything(dt);
    for(const entry of mixers){entry.mixer.timeScale=entry.person.action==='walk'?1:0;entry.mixer.update(dt)}
  }
  renderer.render(scene,camera);
}
updateCamera();resize();requestAnimationFrame(animate);
// Resuming is safe because the seed reconstructs all resident appearances and target order.
try{
  const saved=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');
  if(saved?.stage&&STAGES[saved.stage]&&Number.isFinite(saved.seed)&&Array.isArray(saved.found)&&saved.found.length<STAGES[saved.stage].targets){
    const resume=document.createElement('button');resume.type='button';resume.className='resumeButton';
    resume.textContent='↩ 이어서 찾기';
    resume.style.cssText='border:0;border-radius:13px;padding:12px;background:#dff3e4;color:#347453;font-weight:900;margin-top:12px;';
    resume.addEventListener('click',()=>startTown(saved.stage,saved.seed,saved.found));
    document.querySelector('.stageList').after(resume);
  }
}catch(_){}

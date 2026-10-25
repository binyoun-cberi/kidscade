import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import { STAGES, DIFFICULTIES, WORLD_VERSION, CHALLENGE, getChallengeSettings, COLORS, ACTIVITIES, BLOCK_PITCH, makeTown, selectTargets, signature, getComparison, getBlockCenter, getRoutePosition, movePeople, getClue } from './sim.mjs?v=3';

const $ = id => document.getElementById(id);
const ROOT = '../../assets/game/';
const MODEL = {
  buildings: ['a','b','c','d','f','g','h','i','k','m','n','p'].map(name => `${ROOT}3d/city/kenney-city-kit-suburban/building-type-${name}.glb`),
  parkTree: `${ROOT}3d/nature/kenney-nature-kit/tree-default.glb`,
  shopTree: `${ROOT}3d/city/kenney-city-kit-suburban/tree-small.glb`,
  bench: `${ROOT}3d/city/poly-pizza-city-pack/bench.glb`,
  cars: [ `${ROOT}3d/vehicles/kenney-car-kit/sedan.glb`, `${ROOT}3d/vehicles/kenney-car-kit/taxi.glb`, `${ROOT}3d/vehicles/kenney-car-kit/van.glb` ],
  people: ['female','male'].flatMap(type => 'abcdef'.split('').map(letter => `${ROOT}characters/people/character-${type}-${letter}.glb`))
};
const CITY = `${ROOT}3d/city/poly-pizza-city-pack/`;
const STREET = `${ROOT}3d/city/kenney-city-kit-roads/`;
const FOOD = `${ROOT}3d/food/ultimate-food-pack/`;
const BREADS=['bread','croissant','donut'].map(name=>`${FOOD}${name}.glb`);
const DISTRICT_MODELS = {
  market:['building-red-corner','pizza-corner'], bakery:['pizza-corner','building-red'],
  school:['building-green'], home:['brown-building'], plaza:['big-building']
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
const occluders = [];
const citizenAssets = new Map();
const readyAssets = new Map();
const loweredBuildings = new Map();
let loading=false, celebration=null, roundPrevious=[];
let mode='explore',challengeLevel=1,timeRemaining=CHALLENGE.seconds,challengeBest=0,lastWrongClick=0;
const recentLooks=[];
let seeThrough = false, previewActor = null, previewMixer = null;
const previewCanvas = $('targetPreview');
const previewRenderer = new THREE.WebGLRenderer({canvas:previewCanvas,antialias:true,alpha:true});
previewRenderer.setPixelRatio(Math.min(devicePixelRatio||1,1.55));
previewRenderer.outputColorSpace=THREE.SRGBColorSpace;
const previewScene=new THREE.Scene();
previewScene.add(new THREE.HemisphereLight(0xfffce9,0x7eaf9d,2.4));
const previewSun=new THREE.DirectionalLight(0xfff0ce,2.6);previewSun.position.set(-3,5,6);previewScene.add(previewSun);
const previewCamera=new THREE.PerspectiveCamera(33,1,.1,30);
previewCamera.position.set(1.7,1.5,3.6);previewCamera.lookAt(0,.72,0);

const SAVE_KEY = window.KidscadeGame?.storageKey?.('tod_mot_chatgetda_kkwaekkori','session') || 'kidscade_game_v1:tod_mot_chatgetda_kkwaekkori:session';
const BEST_KEY = window.KidscadeGame?.storageKey?.('tod_mot_chatgetda_kkwaekkori','arcade-best') || 'kidscade_game_v1:tod_mot_chatgetda_kkwaekkori:arcade-best';
try{challengeBest=Math.max(0,Number(localStorage.getItem(BEST_KEY))||0)}catch(_){}
function showChallengeHud(){
  $('challengeHud').classList.toggle('hidden',mode!=='challenge');
  $('progress').classList.toggle('hidden',mode==='challenge');
  $('hintBtn').classList.toggle('hidden',mode==='challenge');
  if(mode==='challenge'){
    $('challengeStage').textContent=`${challengeLevel}단계 · ${town?.people.length||0}명`;
    $('challengeBest').textContent=`최고 ${challengeBest}단계`;
    $('challengeTimer').textContent=`${Math.ceil(timeRemaining)}초`;
    $('challengeTimer').classList.toggle('urgent',timeRemaining<=5);
  }
}
function finishChallenge(){
  if(mode!=='challenge'||!active)return;
  active=false;celebration=null;
  $('finishTitle').textContent='연속 찾기 도전 완료!';
  $('finishText').textContent=`${Math.max(0,challengeLevel-1)}단계 성공 · 최고 기록 ${challengeBest}단계! 다시 도전할까요?`;
  $('finish').classList.remove('hidden');
  try{window.KidscadeGame?.gameOver?.({success:false,score:Math.max(0,challengeLevel-1),stage:'challenge'})}catch(_){}
}
function completeChallengeStage(){
  challengeBest=Math.max(challengeBest,challengeLevel);
  try{localStorage.setItem(BEST_KEY,String(challengeBest))}catch(_){}
  startChallenge(challengeLevel+1);
}
function startChallenge(level=1){
  const settings=getChallengeSettings(level);
  return startTown(settings.stageName,getSeed(),[],'easy',[],settings);
}

function loadGLB(url) {
  if (!modelCache.has(url)) modelCache.set(url,new Promise(resolve => {
    let settled=false;
    const finish=value=>{if(settled)return;settled=true;clearTimeout(timeout);resolve(value);};
    const timeout=setTimeout(()=>finish(null),20000);
    loader.load(url,finish,undefined,()=>finish(null));
  }));
  return modelCache.get(url);
}
function owned(mesh) {mesh.userData.procedural = true;return mesh}
function disposeProcedural(root) {
  root.traverse?.(object => {
    if(!object.isMesh)return;
    if(object.userData.ownedMaterial){for(const m of Array.isArray(object.material)?object.material:[object.material])m.dispose();}
    if(!object.userData.procedural)return;
    object.geometry.dispose();
    if(Array.isArray(object.material))object.material.forEach(material=>material.dispose());
    else object.material?.dispose();
  });
}
function normalizedModel(gltf, longest = 2.5, footprint = null) {
  if (!gltf) return null;
  const object = cloneSkeleton(gltf.scene);
  object.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(object);
  const dimension = box.getSize(new THREE.Vector3());
  const scale=footprint ? Math.min(footprint/Math.max(dimension.x,dimension.z),longest/Math.max(.001,dimension.y)) : longest/(Math.max(dimension.x,dimension.y,dimension.z)||1);
  object.scale.multiplyScalar(scale);
  object.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  object.position.set(-center.x,-box.min.y,-center.z);
  return object;
}
function removeOccluder(root){
  root.traverse(o=>{if(!o.isMesh)return;const i=occluders.indexOf(o);if(i>=0)occluders.splice(i,1);});
}
function modelIn(group, url, longest, fallback, parent, revision) {
  group.add(fallback);
  loadGLB(url).then(gltf => {
    if (!gltf || worldSerial !== revision || !parent.parent || !group.parent) return;
    const model = normalizedModel(gltf,longest,group.userData.footprint);
    if (!model) return;
    if(group.userData.occluder)removeOccluder(fallback);
    group.remove(fallback);
    disposeProcedural(fallback);
    group.add(model);
    if(group.userData.occluder)registerOccluder(model);
    const source=citizenMeshes.get(getTarget()?.id);
    if(source&&(source.holder===parent||source.holder===parent.parent))refreshPreview();
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
  addPart(g,cube(1.62,1.5,1.62,color),0,.75,0);
  const roof = addPart(g,owned(new THREE.Mesh(new THREE.ConeGeometry(1.06,.65,4),flat(0xba7a65))),0,1.81,0);
  roof.rotation.y = Math.PI/4;
  addPart(g,cube(.46,.92,.12,0x765e54),0,.46,.83);
  return g;
}
function treeFallback() {
  const g=new THREE.Group();
  addPart(g,cylinder(.1,.13,.65,0x997656),0,.35,0);
  addPart(g,owned(new THREE.Mesh(new THREE.ConeGeometry(.56,1.1,7),flat(0x5ca16b))),0,1.03,0);
  return g;
}
function smallFallback(url){
  if(/tree|bush|flower|planter/.test(url))return treeFallback();
  const g=new THREE.Group();
  if(/light-/.test(url)){
    addPart(g,cylinder(.05,.07,1.4,0x748a79),0,.7,0);
    addPart(g,ball(.17,0xffebaa),.15,1.35,0);
  }else if(/bus-stop/.test(url)){
    addPart(g,cube(.68,.09,.5,0x6c91a2),0,1.16,0);
    for(const x of [-.27,.27])addPart(g,cube(.06,1.15,.07,0x69828b),x,.58,0);
  }else if(/bicycle/.test(url)){
    for(const x of [-.26,.26]){const wheel=owned(new THREE.Mesh(new THREE.TorusGeometry(.18,.035,6,12),flat(0x606f70)));wheel.position.set(x,.2,0);g.add(wheel);}
    addPart(g,cube(.5,.035,.05,0x75a5b1),0,.34,0);
  }else if(/mailbox/.test(url)){
    addPart(g,cube(.34,.3,.25,0xe4a65b),0,.53,0);addPart(g,cube(.08,.5,.08,0x806b5e),0,.25,0);
  }else{addPart(g,cylinder(.22,.23,.46,0x8da8a0),0,.23,0);}
  return g;
}
function placeObject(url, center, longest, fallback, revision, footprint = null, occluder = false) {
  const pivot = new THREE.Group();
  pivot.position.set(center.x,0,center.z);
  scenery.add(pivot);
  pivot.userData.footprint=footprint;pivot.userData.occluder=occluder;
  modelIn(pivot,url,longest,fallback,pivot,revision);
  if(occluder)registerOccluder(fallback);
  return pivot;
}
function generateWorld() {
  for(const group of [scenery,citizens,movingCars,marker])disposeProcedural(group);
  scenery.clear();citizens.clear();movingCars.clear();marker.clear();citizenMeshes.clear();cars.length=0;
  mixers.length=0;occluders.length=0;citizenAssets.clear();loweredBuildings.clear();clearPreview();
  if (!town) return;
  const revision=++worldSerial;
  const {cols,rows}=town.config;
  const width=cols*BLOCK_PITCH+1,depth=rows*BLOCK_PITCH+1;
  const base=cube(width,.25,depth,0x8fbd93);base.position.y=-.17;scenery.add(base);
  // Lane ribbons are deliberately between blocks; residents always walk on the inner sidewalk.
  for (let col=0;col<cols-1;col++) {
    const x=(col+.5-(cols-1)/2)*BLOCK_PITCH;
    addPart(scenery,cube(1.35,.028,depth,colors.road),x,.003,0);
  }
  for (let row=0;row<rows-1;row++) {
    const z=(row+.5-(rows-1)/2)*BLOCK_PITCH;
    addPart(scenery,cube(width,.028,1.35,colors.road),0,.007,z);
  }
  for (let i=0;i<town.blocks.length;i++) {
    const block=town.blocks[i],center=getBlockCenter(block,town.config);
    const parcel=addPart(scenery,cube(5.6,.035,5.6,block.kind==='park'?0xa6c987:colors.concrete),center.x,.03,center.z);
    parcel.userData.block=block.id;
    // A 2.6-wide building envelope leaves the 1.88 sidewalk loop clear.
    const local=(url,x,z,size,footprint=null,blocksView=false)=>placeObject(url,{x:center.x+x,z:center.z+z},size,smallFallback(url),revision,footprint,blocksView);
    if(block.kind==='park') {
      addPart(scenery,cube(2.8,.06,2.8,0x8fbd75),center.x,.08,center.z);
      local(MODEL.parkTree,-.8,-.7,1.6,.9,true);
      local(`${CITY}flower-pot.glb`,.8,-.8,.55,.5);
      local(MODEL.bench,.45,.65,1.1);
      local(`${CITY}bicycle.glb`,-.7,.7,.9);
    } else if(block.kind==='stop') {
      local(`${CITY}bus-stop.glb`,0,-.35,2.25,2.6,true);
      local(`${CITY}bus-stop-sign.glb`,-1.7,-.1,1.25);
      local(`${CITY}trash-can.glb`,1.8,-.1,.65);
      addPart(scenery,cube(4.7,.025,.18,0xf6d16c),center.x,.07,center.z+2.72);
    } else {
      const variants=DISTRICT_MODELS[block.kind];
      const url=town.stageName==='small'&&block.kind==='home' ? MODEL.buildings[i%MODEL.buildings.length] : `${CITY}${variants[Math.floor(i/6)%variants.length]}.glb`;
      const height=block.kind==='plaza'?4.6:block.kind==='home'?3.3:2.7;
      const building=placeObject(url,{x:center.x-.95,z:center.z-.25},height,buildingFallback(block),revision,1.65,true);
      building.rotation.y=0;
      const neighbor=block.kind==='home'?MODEL.buildings[(i+3)%MODEL.buildings.length]:`${CITY}${variants[(Math.floor(i/6)+1)%variants.length]}.glb`;
      placeObject(neighbor,{x:center.x+1.05,z:center.z-.25},Math.min(height,2.8),buildingFallback(block),revision,1.7,true);
      // Distinct, low storefront details sit inside each parcel, never in the pedestrian loop.
      if(block.kind==='market'||block.kind==='bakery') {
        // A stocked counter belongs to the storefront, clear of all activity bays.
        const counter=new THREE.Group();counter.position.set(center.x,.62,center.z+1.06);scenery.add(counter);
        addPart(counter,cube(2.35,.14,.44,0xe7bd85),0,0,0);
        for(let bread=0;bread<3;bread++){
          const tray=new THREE.Group();tray.position.set((bread-1)*.7,.08,0);counter.add(tray);
          modelIn(tray,BREADS[bread],.3,cube(.25,.12,.18,0xc48d55),counter,revision);
        }
        local(`${CITY}flower-pot.glb`,2,-.6,.65);
      } else if(block.kind==='school') {
        local(`${CITY}bicycle.glb`,1.05,1.02,.75);
        local(`${CITY}planter-and-bushes.glb`,-.75,1.08,.85);
      } else if(block.kind==='home') {
        local(`${CITY}mailbox.glb`,1.08,1.05,.6);
        local(`${ROOT}3d/city/kenney-city-kit-suburban/planter.glb`,-.9,1.08,.65);
      } else {
        local(`${CITY}bus-stop.glb`,.25,1.05,.9);
        local(`${CITY}bus-stop-sign.glb`,-1.08,1.05,.7);
      }
    }
    // Street lamps and zebra crossings give the connected streets a human scale.
    if(block.col<cols-1&&block.row<rows-1){
      local(`${STREET}light-curved.glb`,2.3,1.35,1.65);
      for(let stripe=0;stripe<4;stripe++)addPart(scenery,cube(.19,.025,1.1,0xfff7e6),center.x+1.98+stripe*.27,.05,center.z+2.6);
    }
  }

  for(const person of town.people) {
    const holder=new THREE.Group();
    const body=new THREE.Group();
    const appearance=new THREE.Group();
    holder.add(body,appearance);
    citizens.add(holder);
    holder.userData.citizenId=person.id;
    citizenMeshes.set(person.id,{holder,body,appearance,person,activity:person.activity});
    makeCitizenAppearance(person,body,appearance,revision);
  }
  if(rows>1) {
    for(let i=0;i<Math.min(3,Math.max(1,Math.floor(cols/2)));i++) {
      const holder=new THREE.Group();movingCars.add(holder);
      const fallback=cube(1.05,.38,.62,[0x4e99d2,0xebc25d,0xe17e85][i]);fallback.position.y=.23;
      modelIn(holder,MODEL.cars[i],1.25,fallback,holder,revision);
      const roadRow=i%Math.max(1,rows-1);
      const z=(roadRow+.5-(rows-1)/2)*BLOCK_PITCH+(i%2?.25:-.25);
      cars.push({holder,z,phase:i*.33,direction:i%2?-1:1,speed:.9+i*.16,width});
    }
    const stop=town.blocks.find(b=>b.kind==='stop');
    if(stop){
      const c=getBlockCenter(stop,town.config),holder=new THREE.Group();movingCars.add(holder);
      modelIn(holder,`${CITY}bus.glb`,2.5,cube(2.3,.75,.85,0xf0cc65),holder,revision);
      cars.push({holder,z:c.z+3.5,stopX:c.x,phase:0,bus:true,width});
    }
  }
  const markerRing=owned(new THREE.Mesh(new THREE.TorusGeometry(.47,.042,8,32),new THREE.MeshBasicMaterial({color:0xffcc57,transparent:true,opacity:.93,depthTest:false})));
  markerRing.rotation.x=-Math.PI/2;markerRing.renderOrder=10;markerRing.name='hint-ring';markerRing.visible=false;marker.add(markerRing);
  positionEverything(0);
  for(const p of town.people)if(p.found)addFoundMarker(citizenMeshes.get(p.id).holder);
  refreshPreview();
}

function makeCitizenAppearance(person,body,appearance,revision) {
  const shirt=COLORS[person.modelVariant%3].hex;
  const skin=[0xffd1a7,0xe7ac81,0xc98c69,0x8a624e][person.modelVariant%4];
  const hair=[0x47352c,0x302b36,0x775039,0xbaa16b][person.modelVariant%4];
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
  // One complete character asset: no fixed hats or backpacks intersecting the model.
  loadGLB(MODEL.people[person.modelVariant]).then(gltf=>{
    if(!gltf||worldSerial!==revision||!body.parent)return;
    const model=normalizedModel(gltf,1.35,1.8);
    if(model){
      body.remove(fallback);disposeProcedural(fallback);body.add(model);
      const clipName=ACTIVITIES.find(a=>a.id===person.activity).clip;
      const clip=gltf.animations?.find(animation=>animation.name===clipName);
      if(clip){const mixer=new THREE.AnimationMixer(model);mixer.clipAction(clip).play();mixers.push({mixer,person,clipName});}
      citizenAssets.set(person.id,gltf);
      if(getTarget()?.id===person.id)refreshPreview();
    }
  });
  buildActivityProps(person,appearance,revision);
}
function buildActivityProps(person,appearance,revision){
  disposeProcedural(appearance);appearance.clear();
  const prop=new THREE.Group();prop.name='activity-prop';appearance.add(prop);
  const color=COLORS[person.propVariant].hex;
  if(person.activity==='read'||person.activity==='map'){
    prop.position.set(0,.74,.34);
    const book=addPart(prop,cube(.42,.055,.29,color),0,0,0);book.rotation.x=-.25;
    addPart(book,cube(.37,.018,.26,0xfff6dd),0,.037,0);
    if(person.activity==='map'){
      addPart(book,cube(.025,.02,.23,0x79b3a6),-.09,.053,0);
      addPart(book,cube(.30,.02,.025,0x79b3a6),0,.053,.03);
    }
  } else if(['browse','deliver','eat'].includes(person.activity)){
    prop.position.set(person.activity==='eat'?-.26:0,.74,.36);
    if(person.activity==='deliver')addPart(prop,cube(.56,.045,.35,0xf4e3bf),0,-.02,0);
    modelIn(prop,BREADS[person.propVariant],.33,cube(.26,.14,.2,0xc48d55),appearance,revision);
  } else if(person.activity==='ball') {
    prop.position.set(0,.25,.38);prop.add(ball(.17,color));
    addPart(prop,cube(.25,.035,.04,0xfff9e5),0,.14,0);
  } else if(person.activity==='sit') {
    const bench=new THREE.Group();bench.position.set(0,0,-.08);appearance.add(bench);
    modelIn(bench,MODEL.bench,1.05,cube(1,.4,.4,0x977452),appearance,revision);
    addPart(prop,cube(.48,.065,.32,color),0,.43,.02);
  } else if(person.activity==='wait'){
    prop.position.set(-.37,0,.12);
    addPart(prop,cube(.28,.37,.23,color),0,.20,0);
    const handle=owned(new THREE.Mesh(new THREE.TorusGeometry(.075,.018,6,12),flat(color)));
    addPart(prop,handle,0,.43,0);
  } else if(person.activity==='wave'){
    prop.position.set(-.34,1.03,.06);
    addPart(prop,cube(.25,.23,.025,color),0,0,0);
  }
}

function clearPreview(){
  if(previewActor){disposeProcedural(previewActor);previewScene.remove(previewActor);}
  previewMixer?.stopAllAction();previewMixer=null;previewActor=null;
}
function refreshPreview(){
  clearPreview();
  const source=citizenMeshes.get(getTarget()?.id);
  if(!source)return;
  // Clone the complete resident, including their actual prop/bench, into an independent scene.
  previewActor=cloneSkeleton(source.holder);
  previewActor.position.set(0,0,0);previewActor.rotation.set(0,-.3,0);previewScene.add(previewActor);
  // Procedural geometry/material must not be shared with a disposable preview.
  previewActor.traverse(o=>{if(o.isMesh&&o.userData.procedural){o.geometry=o.geometry.clone();o.material=o.material.clone();}});
  const gltf=citizenAssets.get(source.person.id);
  const clip=gltf?.animations.find(a=>a.name===ACTIVITIES.find(a=>a.id===source.person.activity).clip);
  if(clip){previewMixer=new THREE.AnimationMixer(previewActor.children[0].children[0]);previewMixer.clipAction(clip).play();}
}
function registerOccluder(root){
  root.traverse(o=>{
    if(!o.isMesh)return;
    o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();
    o.userData.ownedMaterial=true;
    occluders.push(o);
  });
  applyVisibility();
}
function applyVisibility(){
  for(const mesh of occluders)for(const mat of Array.isArray(mesh.material)?mesh.material:[mesh.material]){
    mat.transparent=seeThrough;mat.opacity=seeThrough ? .16 : 1;mat.depthWrite=!seeThrough;
  }
}
function animateActivity(actor,person,now){
  const prop=actor.getObjectByName('activity-prop');
  if(prop&&person.activity==='ball')prop.position.y=.22+Math.abs(Math.sin(person.elapsed*3))*(celebration?.id===person.id ? .65 : .45);
  if(prop&&person.activity==='eat'){prop.position.y=.82+Math.sin(person.elapsed*1.5)*.13;prop.rotation.z=Math.sin(person.elapsed*1.5)*.12;}
  if(prop&&person.activity==='wave'){prop.rotation.z=Math.sin(person.elapsed*5)*.35;}
  if(prop&&person.activity==='browse')prop.rotation.y=Math.sin(person.elapsed)*.18;
}

function positionEverything(dt) {
  if(!town)return;
  movePeople(town,dt);
  for(const p of town.people) {
    const mesh=citizenMeshes.get(p.id);
    if(!mesh)continue;
    if(mesh.activity!==p.activity){
      mesh.activity=p.activity;buildActivityProps(p,mesh.appearance,worldSerial);
      const entry=mixers.find(e=>e.person.id===p.id),gltf=citizenAssets.get(p.id);
      const clipName=ACTIVITIES.find(a=>a.id===p.activity).clip;
      const clip=gltf?.animations.find(a=>a.name===clipName);
      if(entry&&clip){entry.mixer.stopAllAction();entry.mixer.clipAction(clip).play();entry.clipName=clipName;}
    }
    const pos=getRoutePosition(p,town.config);
    if(dt===0)mesh.holder.position.set(pos.x,.08,pos.z);
    else mesh.holder.position.lerp(new THREE.Vector3(pos.x,.08,pos.z),1-Math.exp(-5*dt));
    const walking=p.slot===1&&p.activity==='deliver';
    const facing=walking?(Math.cos(p.elapsed*.47*(p.challengeSpeed||1)+p.phase)>=0?Math.PI/2:-Math.PI/2):0;
    mesh.holder.rotation.y=THREE.MathUtils.lerp(mesh.holder.rotation.y,facing,dt===0?1:Math.min(1,dt*6));
    if(celebration?.id===p.id){mesh.body.rotation.z=Math.sin(p.elapsed*12)*.07;}
    else mesh.body.rotation.z=0;
    animateActivity(mesh.holder,p);
  }
  for(const car of cars) {
    if(car.bus){
      car.phase=(car.phase+dt)%40;
      const entry=-car.width/2-2,exit=car.width/2+2;
      const x=car.phase<10 ? entry+(car.stopX-entry)*car.phase/10:car.phase<20?car.stopX:car.stopX+(exit-car.stopX)*(car.phase-20)/20;
      car.holder.position.set(x,.10,car.z);car.holder.rotation.y=Math.PI/2;continue;
    }
    car.phase=(car.phase+dt*car.speed/car.width)%1;
    car.holder.position.set((car.phase-.5)*car.width*car.direction,.10,car.z);
    car.holder.rotation.y=car.direction>0?Math.PI/2:-Math.PI/2;
  }
  for(const [root,until] of loweredBuildings){if(performance.now()>until){root.scale.y=1;loweredBuildings.delete(root);}}
  const ring=marker.getObjectByName('hint-ring');
  if(ring){
    const target=getTarget();
    ring.visible=active&&hintLevel>=3&&!!target;
    if(target){const pos=citizenMeshes.get(target.id)?.holder?.position;if(pos)ring.position.set(pos.x,.12+Math.sin(performance.now()*.005)*.045,pos.z)}
  }
}

function getTarget(){return town?.people.find(p=>p.id===town.order[currentTarget])||null}
function setClue(){
  const clue=getClue(getTarget(),town.difficulty);
  if(!clue)return;
  $('clueTitle').textContent=clue.title;
  $('clueText').textContent=DIFFICULTIES[town.difficulty].description;
  refreshPreview();
  $('progress').textContent=`찾은 친구 ${found.length} / ${town.order.length}`;
  $('foundStamps').textContent='🌟'.repeat(found.length);
  $('hintText').textContent='';hintLevel=0;
}
function announceClue(){
  const clue=getClue(getTarget(),town.difficulty);
  if(!clue)return;
  if('speechSynthesis' in window){
    speechSynthesis.cancel();
    const utterance=new SpeechSynthesisUtterance(clue.subtitle);
    utterance.lang='ko-KR';utterance.rate=.88;
    speechSynthesis.speak(utterance);
  }else showToast(clue.subtitle);
}
function getSeed(){return (Date.now() + Math.floor(Math.random()*999999))>>>0}
async function startTown(stage,seed=getSeed(),restored=[],difficulty=$('difficulty').value,previous=null,challenge=null) {
  if(!STAGES[stage]||loading)return;
  loading=true;active=false;celebration=null;
  mode=challenge?'challenge':'explore';
  if(challenge){challengeLevel=challenge.level;timeRemaining=challenge.seconds}
  showChallengeHud();
  $('startStatus').textContent='친구들이 외출 준비를 하고 있어요…';
  document.querySelectorAll('[data-stage],#quickStart').forEach(b=>b.disabled=true);
  try {
  town=makeTown(stage,seed,difficulty,false,challenge);
  // Only fully loaded models/props with the required pose may become a clue.
  const urls=[...MODEL.people,...BREADS,MODEL.bench];
  for(const url of urls)if(readyAssets.has(url)&&!readyAssets.get(url))modelCache.delete(url);
  const loaded=await Promise.all(urls.map(loadGLB));
  urls.forEach((url,i)=>readyAssets.set(url,loaded[i]));
  const eligible=town.people.filter(person=>{
    const gltf=readyAssets.get(MODEL.people[person.modelVariant]),a=ACTIVITIES.find(a=>a.id===person.activity);
    return gltf?.animations?.some(c=>c.name===a.clip)&&(!['browse','deliver','eat'].includes(person.activity)||readyAssets.get(BREADS[person.propVariant]))&&(person.activity!=='sit'||readyAssets.get(MODEL.bench));
  }).map(p=>p.id);
  roundPrevious=previous||[...recentLooks];
  selectTargets(town,eligible,roundPrevious);
  if(!town.order.length){$('startStatus').textContent='친구들을 불러오지 못했어요. 잠시 후 다시 골라 주세요.';return;}
  found=[];for(const id of town.order){if(!restored.includes(id))break;found.push(id);}
  for(const person of town.people)person.found=found.includes(person.id);
  currentTarget=found.length;
  active=currentTarget<town.order.length;
  initialViewSize=0;
  cameraLook.set(0,0,0);
  $('districtLabel').textContent=mode==='challenge'? `연속 찾기 · ${challengeLevel}단계` : `${town.config.label} · ${DIFFICULTIES[town.difficulty].name}`;
  showChallengeHud();
  $('difficulty').value=town.difficulty;
  $('start').classList.add('hidden');$('finish').classList.add('hidden');
  resize();resetView();generateWorld();
  // Start close enough to distinguish a face. The whole-town button remains available.
  const first=getBlockCenter(town.blocks[0],town.config);cameraLook.set(first.x,0,first.z+1);
  viewSize=Math.min(13.5,Math.max(8,canvas.getBoundingClientRect().height*.025));resize();
  if(active){setClue();save();}
  else finishRound();
  $('startStatus').textContent='';
  }catch(error){$('start').classList.remove('hidden');$('startStatus').textContent='마을을 준비하지 못했어요. 다시 골라 주세요.';console.error(error);}
  finally{loading=false;document.querySelectorAll('[data-stage],#quickStart').forEach(b=>b.disabled=false);}
}
function save(){
  if(!town||mode==='challenge')return;
  try{localStorage.setItem(SAVE_KEY,JSON.stringify({version:WORLD_VERSION,stage:town.stageName,seed:town.seed,difficulty:town.difficulty,previous:roundPrevious,found,complete:found.length>=town.order.length,updatedAt:Date.now()}))}catch(_){}
}
function showToast(message){
  $('toast').textContent=message;
  $('toast').classList.add('show');
  clearTimeout(lastToast);
  lastToast=setTimeout(()=>$('toast').classList.remove('show'),2200);
}
function pick(clientX,clientY) {
  if(!active||celebration||loading)return;
  scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
  const rect=canvas.getBoundingClientRect();
  const ndc=new THREE.Vector2((clientX-rect.left)/Math.max(1,rect.width)*2-1,1-(clientY-rect.top)/Math.max(1,rect.height)*2);
  const ray=new THREE.Raycaster();ray.setFromCamera(ndc,camera);
  const obstruction=seeThrough?null:ray.intersectObjects(occluders,false)[0];
  let nearest=null;
  // Pick the *visible surface* of the actual resident first.
  // Screen-proximity remains a forgiving fallback for small touch targets.
  for(const hit of ray.intersectObjects(citizens.children,true)){
    if(obstruction&&obstruction.distance<hit.distance-.06)break;
    let node=hit.object;
    while(node&&node.parent!==citizens)node=node.parent;
    const id=node?.userData?.citizenId;
    if(id&&!found.includes(id)){nearest=town.people.find(p=>p.id===id);break;}
  }
  if(!nearest){
    let best=35*35;
    for(const person of town.people){
      if(found.includes(person.id))continue;
      const holder=citizenMeshes.get(person.id)?.holder;
      if(!holder)continue;
      for(const height of [.35,.77,1.1]){
        const point=holder.position.clone().add(new THREE.Vector3(0,height,0));
        const projected=point.clone().project(camera);
        if(projected.z < -1||projected.z > 1)continue;
        const x=rect.left+(projected.x+1)*rect.width/2;
        const y=rect.top+(1-projected.y)*rect.height/2;
        const distance=(x-clientX)**2+(y-clientY)**2;
        if(distance>=best)continue;
        if(obstruction&&obstruction.distance<ray.ray.origin.distanceTo(point)-.12)continue;
        best=distance;nearest=person;
      }
    }
  }
  if(!nearest){
    const hit=obstruction||ray.intersectObjects(occluders,false)[0];
    if(hit){let root=hit.object;while(root.parent&&!root.userData.occluder)root=root.parent;if(root.userData.occluder){root.scale.y=.18;loweredBuildings.set(root,performance.now()+6000);showToast('건물을 잠깐 낮췄어요. 뒤쪽도 살펴봐!');}}
    return;
  }
  if(nearest.id!==town.order[currentTarget]){
    if(mode==='challenge'){
      if(performance.now()-lastWrongClick<350)return;
      lastWrongClick=performance.now();
      timeRemaining=Math.max(0,timeRemaining-CHALLENGE.wrongPenalty);
      showChallengeHud();
      showToast(`다른 친구예요! ${CHALLENGE.wrongPenalty}초가 줄었어요.`);
      if(timeRemaining<=0)finishChallenge();
    }else showToast(getComparison(getTarget(),nearest));
    try{window.KidscadeGame?.sound?.('click')}catch(_){}
    return;
  }
  nearest.found=true;found.push(nearest.id);
  recentLooks.push(signature(nearest));if(recentLooks.length>20)recentLooks.shift();
  celebration={id:nearest.id,remaining:1.4};addFoundMarker(citizenMeshes.get(nearest.id).holder);
  $('foundStamps').textContent='🌟'.repeat(found.length);
  $('progress').textContent=`찾은 친구 ${found.length} / ${town.order.length}`;
  showToast('🎉 찾았다! 정말 잘했어!');
  try{window.KidscadeGame?.sound?.('success');window.KidscadeGame?.milestone?.('person_found',{found:found.length,stage:town.stageName})}catch(_){}
  save();
}
function addFoundMarker(holder){
  if(holder.getObjectByName('found-marker'))return;
  const ring=owned(new THREE.Mesh(new THREE.TorusGeometry(.37,.035,6,24),flat(0xf2cb53)));
  ring.name='found-marker';ring.rotation.x=-Math.PI/2;ring.position.y=.03;holder.add(ring);
}
function finishRound(){
  active=false;
  if(!town)return;
  if(mode==='challenge'){completeChallengeStage();return;}
  $('finishTitle').textContent='못 찾겠다 꾀꼬리? 다 찾았다!';
  $('finishText').textContent=`${town.config.label}에서 친구 ${town.order.length}명을 전부 찾았어요. 대단해요!`;
  $('finish').classList.remove('hidden');
  $('progress').textContent=`찾은 친구 ${town.order.length} / ${town.order.length}`;
  try{window.KidscadeGame?.gameOver?.({success:true,score:town.order.length,stage:town.stageName})}catch(_){}
  save();
}
function hint(){
  if(!active||celebration||mode==='challenge')return;
  hintLevel=Math.min(3,hintLevel+1);
  const person=getTarget();
  if(!person)return;
  if(hintLevel===1)$('hintText').textContent=`📍 ${getClue(person).place}`;
  else if(hintLevel===2){
    $('hintText').textContent='👀 친구가 있는 거리로 화면을 옮겼어요.';
    const center=getBlockCenter(person.block,town.config);cameraLook.x=center.x;cameraLook.z=center.z+1;
    viewSize=10;resize();updateCamera();
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
  const previewRect=previewCanvas.getBoundingClientRect();
  previewRenderer.setSize(Math.max(1,previewRect.width),Math.max(1,previewRect.height),false);
  previewCamera.aspect=Math.max(1,previewRect.width)/Math.max(1,previewRect.height);previewCamera.updateProjectionMatrix();
  updateCamera();
}
function resetView(){if(!town)return;cameraOffset.set(11,17,20);cameraLook.set(0,0,0);viewSize=initialViewSize;resize()}
function zoom(factor){
  if(!town)return;
  viewSize=THREE.MathUtils.clamp(viewSize*factor,7,Math.max(initialViewSize*1.25,11));resize();
}
function pan(dx,dy){
  if(!town)return;
  // Drag the ground itself, rather than guessing screen-up vectors.
  // This continues to work correctly after a 90-degree camera rotation.
  camera.updateMatrixWorld(true);
  const rect=canvas.getBoundingClientRect();
  const cx=rect.width/2,cy=rect.height/2;
  const ground=(x,y)=>{
    const ray=new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(x/Math.max(1,rect.width)*2-1,1-y/Math.max(1,rect.height)*2),camera);
    return ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),new THREE.Vector3());
  };
  const before=ground(cx,cy),after=ground(cx+dx,cy+dy);
  if(!before||!after)return;
  cameraLook.add(before.sub(after));cameraLook.y=0;
  const limitX=town.config.cols*BLOCK_PITCH/2,limitZ=town.config.rows*BLOCK_PITCH/2;
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
let previewDrag=null;
previewCanvas.addEventListener('pointerdown',event=>{previewDrag=event.clientX;previewCanvas.setPointerCapture(event.pointerId);});
previewCanvas.addEventListener('pointermove',event=>{if(previewDrag===null||!previewActor)return;previewActor.rotation.y+=(event.clientX-previewDrag)*.018;previewDrag=event.clientX;});
for(const event of ['pointerup','pointercancel'])previewCanvas.addEventListener(event,()=>{previewDrag=null;});
$('rotateLeft').addEventListener('click',()=>{cameraOffset.applyAxisAngle(new THREE.Vector3(0,1,0),Math.PI/2);updateCamera();});
$('rotateRight').addEventListener('click',()=>{cameraOffset.applyAxisAngle(new THREE.Vector3(0,1,0),-Math.PI/2);updateCamera();});
$('seeThrough').addEventListener('click',()=>{seeThrough=!seeThrough;$('seeThrough').setAttribute('aria-pressed',String(seeThrough));applyVisibility();});
$('zoomIn').addEventListener('click',()=>zoom(.82));
$('zoomOut').addEventListener('click',()=>zoom(1.22));
$('resetViewBtn').addEventListener('click',resetView);
$('hintBtn').addEventListener('click',hint);
$('speakBtn').addEventListener('click',announceClue);
$('menuBtn').addEventListener('click',()=>{$('finish').classList.add('hidden');$('start').classList.remove('hidden')});
document.querySelectorAll('[data-stage]').forEach(button=>button.addEventListener('click',()=>startTown(button.dataset.stage)));
$('quickStart').addEventListener('click',()=>startTown('small',getSeed(),[],'easy'));
$('challengeStart').addEventListener('click',()=>startChallenge());
$('againBtn').addEventListener('click',()=>mode==='challenge'?startChallenge():startTown(town.stageName,getSeed(),[],town.difficulty));
$('otherStageBtn').addEventListener('click',()=>{$('finish').classList.add('hidden');$('start').classList.remove('hidden')});
window.addEventListener('resize',resize);

function animate(now){
  requestAnimationFrame(animate);
  const dt=Math.min(.05,Math.max(0,(now-lastFrame)/1000));lastFrame=now;
  if(town&&$('start').classList.contains('hidden')&&active){
    if(mode==='challenge'&&!celebration){
      timeRemaining=Math.max(0,timeRemaining-dt);
      showChallengeHud();
      if(timeRemaining<=0){finishChallenge();renderer.render(scene,camera);previewRenderer.render(previewScene,previewCamera);return;}
    }
    positionEverything(dt);
    for(const entry of mixers)entry.mixer.setTime(entry.person.elapsed);
    const target=getTarget();
    if(previewActor&&target){animateActivity(previewActor,target);previewMixer?.setTime(target.elapsed);}
    if(celebration){
      celebration.remaining-=dt;
      if(celebration.remaining<=0){celebration=null;currentTarget=found.length;if(currentTarget>=town.order.length)finishRound();else setClue();}
    }
  }
  renderer.render(scene,camera);
  previewRenderer.render(previewScene,previewCamera);
}
updateCamera();resize();requestAnimationFrame(animate);
// Resuming is safe because the seed reconstructs all resident appearances and target order.
try{
  const saved=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');
  if(saved?.version===WORLD_VERSION&&!saved.complete&&saved?.stage&&STAGES[saved.stage]&&Number.isFinite(saved.seed)&&Array.isArray(saved.found)&&saved.found.length<STAGES[saved.stage].targets){
    const resume=document.createElement('button');resume.type='button';resume.className='resumeButton';
    resume.textContent='↩ 이어서 찾기';
    resume.style.cssText='border:0;border-radius:13px;padding:12px;background:#dff3e4;color:#347453;font-weight:900;margin-top:12px;';
    resume.addEventListener('click',()=>startTown(saved.stage,saved.seed,saved.found,saved.difficulty,saved.previous||[]));
    document.querySelector('.stageList').after(resume);
  }
}catch(_){}

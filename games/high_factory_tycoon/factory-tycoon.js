import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const $=id=>document.getElementById(id);
const ui={
  shipped:$('shipped'),cash:$('cash'),perMinute:$('perMinute'),waste:$('waste'),mapBadge:$('mapBadge'),
  orders:$('orders'),orderList:$('orderList'),collapseOrders:$('collapseOrders'),
  challengeBtn:$('challengeBtn'),challengeTitle:$('challengeTitle'),challengeProgress:$('challengeProgress'),
  moveBtn:$('moveBtn'),analysisBtn:$('analysisBtn'),bookBtn:$('bookBtn'),pauseBtn:$('pauseBtn'),speedBtn:$('speedBtn'),rotateBtn:$('rotateBtn'),helpBtn:$('helpBtn'),
  analysisLegend:$('analysisLegend'),toast:$('toast'),toolbar:$('toolbar'),
  undoBtn:$('undoBtn'),redoBtn:$('redoBtn'),saveBtn:$('saveBtn'),
  intro:$('intro'),newBtn:$('newBtn'),continueBtn:$('continueBtn'),tutorialBtn:$('tutorialBtn'),
  help:$('help'),closeHelpBtn:$('closeHelpBtn'),book:$('book'),bookList:$('bookList'),closeBookBtn:$('closeBookBtn'),
  tutorialCoach:$('tutorialCoach'),tutorialStep:$('tutorialStep'),tutorialTitle:$('tutorialTitle'),tutorialText:$('tutorialText'),tutorialNext:$('tutorialNext'),tutorialSkip:$('tutorialSkip'),
  discover:$('discover'),discoverLayers:$('discoverLayers'),discoverText:$('discoverText'),discoverName:$('discoverName'),discoverSave:$('discoverSave')
};

const DIRS=[{x:1,y:0},{x:0,y:1},{x:-1,y:0},{x:0,y:-1}];
const DIR_ANGLE=[-Math.PI/2,0,Math.PI/2,Math.PI];
const DIR_LABELS=['오른쪽','아래','왼쪽','위'];
const ROTATABLE_TYPES=new Set(['belt','splitter','merger','cross','assembler','slicer','pan','toaster','packer']);
const BELT_TYPES=new Set(['belt','splitter','merger','cross']);
const ALL_DIRS=[0,1,2,3];
const CELL=1.18,TICK=1/20;
const MAP_PRESETS={
  small:{label:'소',cols:28,rows:18,view:16,minView:10,maxItems:160,supplies:['bread','cheese','ham','tomato'],ships:1},
  medium:{label:'중',cols:44,rows:28,view:20,minView:11,maxItems:260,supplies:['bread','cheese','ham','tomato','lettuce','egg'],ships:2},
  large:{label:'대',cols:64,rows:40,view:24,minView:12,maxItems:360,supplies:['bread','cheese','ham','tomato','lettuce','egg','bacon_raw'],ships:3}
};
const SUPPLY_DEFS={
  bread:{label:'식빵',color:0xeac486},cheese:{label:'치즈',color:0xf7d94c},ham:{label:'햄',color:0xd78673},
  tomato:{label:'토마토',color:0xe5544d},lettuce:{label:'양상추',color:0x74bd69},egg:{label:'달걀',color:0xf4efe0},
  bacon_raw:{label:'베이컨',color:0xd47b73}
};
let mapSize='small',selectedMapSize='small',COLS=28,ROWS=18,SUPPLIERS=[],SHIPS=[],FIXED=new Set();
function configureWorldData(size='small'){
  const preset=MAP_PRESETS[size]||MAP_PRESETS.small;
  mapSize=MAP_PRESETS[size]?size:'small';COLS=preset.cols;ROWS=preset.rows;
  SUPPLIERS=preset.supplies.map((id,i)=>({x:1,y:Math.round((i+1)*ROWS/(preset.supplies.length+1)),id,label:SUPPLY_DEFS[id].label,color:SUPPLY_DEFS[id].color}));
  SHIPS=Array.from({length:preset.ships},(_,i)=>({x:COLS-2,y:Math.round((i+1)*ROWS/(preset.ships+1))}));
  FIXED=new Set([...SUPPLIERS,...SHIPS].map(p=>p.x+','+p.y));
}
configureWorldData('small');
function maxItems(){return MAP_PRESETS[mapSize]?.maxItems||360}
const INGREDIENTS={
  bread:{label:'식빵',value:18,color:0xe8bd78,model:'../../assets/game/3d/bakery/baked-goods/bread-slice.glb'},
  toast:{label:'토스트',value:24,color:0xc98b48,model:'../../assets/game/3d/bakery/baked-goods/bread-slice.glb',tint:0xb96e34},
  cheese:{label:'치즈',value:24,color:0xf2d74d,model:'../../assets/game/food/cheese-cut.glb'},
  ham:{label:'햄',value:28,color:0xd88678,model:'../../assets/game/food/meat-cooked.glb'},
  tomato:{label:'토마토',value:16,color:0xe7554e,model:'../../assets/game/food/tomato.glb'},
  tomato_slice:{label:'토마토 조각',value:20,color:0xe7554e,model:'../../assets/game/food/tomato-slice.glb'},
  lettuce:{label:'양상추',value:17,color:0x77bd69,model:'../../assets/game/food/cabbage.glb'},
  egg:{label:'달걀',value:16,color:0xf2eee1,model:'../../assets/game/food/egg.glb'},
  egg_cooked:{label:'달걀 프라이',value:25,color:0xf2eee1,model:'../../assets/game/food/egg-cooked.glb'},
  bacon_raw:{label:'생베이컨',value:23,color:0xd47b73,model:'../../assets/game/food/bacon-raw.glb'},
  bacon:{label:'베이컨',value:31,color:0xbc695f,model:'../../assets/game/food/bacon.glb'}
};
const RECIPES=[
  {name:'치즈 샌드위치',layers:['bread','cheese','bread'],mult:1.35},
  {name:'햄 토마토 샌드',layers:['bread','ham','tomato_slice','bread'],mult:1.5},
  {name:'햄치즈 샌드위치',layers:['bread','ham','cheese','bread'],mult:1.55},
  {name:'BLT 스타일',layers:['bread','bacon','lettuce','tomato_slice','bread'],mult:1.8},
  {name:'에그 토스트',layers:['toast','egg_cooked','cheese','toast'],mult:2.0},
  {name:'더블 치즈',layers:['bread','cheese','cheese','ham','bread'],mult:1.7},
  {name:'아침 든든 샌드',layers:['toast','bacon','egg_cooked','cheese','toast'],mult:2.15}
];
const MACHINE={
  assembler:{name:'조립기',color:0xe69455,time:.72},
  slicer:{name:'슬라이서',color:0x7fb4d6,time:.85},
  pan:{name:'팬',color:0x4b5360,time:1.2},
  toaster:{name:'토스터',color:0xc87555,time:1.05},
  packer:{name:'포장기',color:0x8b77bc,time:.62}
};

const MODEL_KEYS=Object.keys(INGREDIENTS);

let scene,camera,renderer,raycaster,floor,gridHelper,loader;
let staticGroup,itemGroup,effectGroup,fixedGroup,previewGroup;
let beltMesh,arrowMesh;
let models=new Map();
let blueprint=new Map(),items=[],effects=[],machineStates=new Map();
let itemSeq=1,spawnClock=0,gameTime=0,orderClock=0,saveClock=0,analysisClock=0;
let running=false,paused=false,speed=1,selectedTool='belt',rotation=0,rotateArmed=false,analysis=false;
let stats={shipped:0,cash:0,waste:0,shipTimes:[],discoveries:{}};
let orders=[],challengeIndex=0;
let undoStack=[],redoStack=[];
let pendingDiscovery=null,toastTimer=0,activeSlot=1,tutorialMode=false,tutorialStepIndex=0;
let cameraTarget=new THREE.Vector3(0,0,0),viewSize=MAP_PRESETS.small.view;
let activePointers=new Map(),dragBuild=null,panGesture=null,lastFrame=performance.now(),acc=0;
let hoverCell=null,previewPath=[];
let cellHeat=new Map();

const loaderAudio={
  click:makeAudio('../../assets/audio/ui/kenney_interface/click_002.ogg',.22),
  ok:makeAudio('../../assets/audio/ui/kenney_interface/confirmation_001.ogg',.25),
  error:makeAudio('../../assets/audio/ui/kenney_interface/error_002.ogg',.20),
  slice:makeAudio('../../assets/audio/sfx/bakery/bread-slice-01.mp3',.18)
};

function makeAudio(src,volume){const a=new Audio(src);a.preload='auto';a.volume=volume;return a}
function sound(name){
  const src=loaderAudio[name];if(!src)return;
  try{const a=src.cloneNode();a.volume=src.volume;a.play().catch(()=>{})}catch(_){}
}
function key(x,y){return x+','+y}
function inBounds(x,y){return x>=0&&y>=0&&x<COLS&&y<ROWS}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function rotRight(d){return (d+1)%4}
function rotLeft(d){return (d+3)%4}
function dirBetween(a,b){
  const dx=b.x-a.x,dy=b.y-a.y;
  if(Math.abs(dx)>Math.abs(dy))return dx>=0?0:2;
  return dy>=0?1:3;
}
function money(v){return '₩'+Math.floor(v).toLocaleString('ko-KR')}
const reportedAchievements=new Set();
function reportAchievement(slot,detail={}){
  if(reportedAchievements.has(slot))return;
  reportedAchievements.add(slot);
  try{window.KidscadeGame?.achievement?.('high_factory_tycoon.'+slot,detail);window.KidscadeGame?.milestone?.('achievement_'+slot,{uniqueKey:slot,...detail})}catch(_){}
}
function showToast(text,ms=1300){
  ui.toast.textContent=text;ui.toast.classList.add('show');clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>ui.toast.classList.remove('show'),ms);
}
function clonePlain(v){return JSON.parse(JSON.stringify(v))}
function cellWorld(x,y){return new THREE.Vector3((x-COLS/2+.5)*CELL,0,(y-ROWS/2+.5)*CELL)}
function payloadLabel(p){return p.layers.map(l=>INGREDIENTS[l.id]?.label||l.id).join(' + ')}
function signature(p){return p.layers.map(l=>l.id).join('>')}

function initThree(){
  scene=new THREE.Scene();
  scene.background=new THREE.Color(0x172128);
  scene.fog=new THREE.FogExp2(0x172128,.012);
  camera=new THREE.OrthographicCamera(-20,20,12,-12,-100,180);
  camera.position.set(28,42,34);
  camera.lookAt(cameraTarget);
  renderer=new THREE.WebGLRenderer({canvas:$('game'),antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.05;
  scene.add(new THREE.HemisphereLight(0xe9f5ff,0x3b4738,2.05));
  const sun=new THREE.DirectionalLight(0xffe9bd,2.4);sun.position.set(-24,38,18);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);scene.add(sun);

  buildWorldSurface();

  staticGroup=new THREE.Group();itemGroup=new THREE.Group();effectGroup=new THREE.Group();fixedGroup=new THREE.Group();previewGroup=new THREE.Group();
  scene.add(staticGroup,itemGroup,effectGroup,fixedGroup,previewGroup);
  raycaster=new THREE.Raycaster();loader=new GLTFLoader();
  buildFixedVisuals();resize();
  addEventListener('resize',resize,{passive:true});
  Promise.all(MODEL_KEYS.map(loadIngredientModel)).then(()=>{buildFixedVisuals();refreshAllItemViews()});
}

function buildWorldSurface(){
  if(!scene)return;
  if(floor){
    scene.remove(floor);floor.geometry?.dispose?.();floor.material?.dispose?.();
  }
  if(gridHelper){
    scene.remove(gridHelper);gridHelper.geometry?.dispose?.();gridHelper.material?.dispose?.();
  }
  const floorMat=new THREE.MeshStandardMaterial({color:0x27323a,roughness:.92,metalness:.02});
  floor=new THREE.Mesh(new THREE.PlaneGeometry(COLS*CELL,ROWS*CELL),floorMat);
  floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);

  const pts=[],halfW=COLS*CELL/2,halfH=ROWS*CELL/2;
  for(let x=0;x<=COLS;x++){
    const wx=-halfW+x*CELL;pts.push(new THREE.Vector3(wx,.012,-halfH),new THREE.Vector3(wx,.012,halfH));
  }
  for(let y=0;y<=ROWS;y++){
    const wz=-halfH+y*CELL;pts.push(new THREE.Vector3(-halfW,.012,wz),new THREE.Vector3(halfW,.012,wz));
  }
  const gridGeo=new THREE.BufferGeometry().setFromPoints(pts);
  const gridMat=new THREE.LineBasicMaterial({color:0x46545d,transparent:true,opacity:.34});
  gridHelper=new THREE.LineSegments(gridGeo,gridMat);scene.add(gridHelper);
  if(fixedGroup)buildFixedVisuals();
}
function applyMapSize(size,{resetView=true}={}){
  configureWorldData(size);
  selectedMapSize=mapSize;
  if(resetView){
    cameraTarget.set(0,0,0);
    viewSize=MAP_PRESETS[mapSize].view;
  }
  if(scene)buildWorldSurface();
  if(ui.mapBadge)ui.mapBadge.textContent=MAP_PRESETS[mapSize].label;
  refreshSizeButtons();
  if(renderer&&camera)resize();
}
function clampCameraTarget(){
  const xLimit=Math.max(0,COLS*CELL/2-CELL*1.5),zLimit=Math.max(0,ROWS*CELL/2-CELL*1.5);
  cameraTarget.x=clamp(cameraTarget.x,-xLimit,xLimit);
  cameraTarget.z=clamp(cameraTarget.z,-zLimit,zLimit);
}

async function loadIngredientModel(id){
  const def=INGREDIENTS[id];if(!def?.model||models.has(id))return;
  return new Promise(resolve=>loader.load(def.model,g=>{
    const root=g.scene;
    root.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;if(n.material)n.material=n.material.clone()}});
    normalizeModel(root,.68);
    if(def.tint)root.traverse(n=>{if(n.isMesh&&n.material?.color)n.material.color.setHex(def.tint)});
    models.set(id,root);resolve();
  },undefined,()=>resolve()));
}
function normalizeModel(obj,target=.7){
  obj.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(obj),size=box.getSize(new THREE.Vector3());
  const s=Math.max(size.x,size.y,size.z)||1;obj.scale.multiplyScalar(target/s);obj.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(obj),c=b.getCenter(new THREE.Vector3());
  obj.position.x-=c.x;obj.position.z-=c.z;obj.position.y-=b.min.y;return obj;
}
function cloneModel(id){
  const m=models.get(id);
  if(m)return m.clone(true);
  const def=INGREDIENTS[id]||{color:0xffffff};
  const geo=id.includes('bread')||id==='toast'||id==='cheese'||id==='ham'||id.includes('bacon')
    ?new THREE.BoxGeometry(.56,.12,.46):new THREE.SphereGeometry(.26,12,8);
  const mesh=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:def.color,roughness:.78}));
  mesh.castShadow=true;return mesh;
}
function makePayloadView(payload){
  const g=new THREE.Group();
  const layers=payload.layers.slice(0,9);
  if(layers.length===1){
    const m=cloneModel(layers[0].id);m.scale.multiplyScalar(.72);g.add(m);
  }else{
    layers.forEach((layer,i)=>{
      const m=cloneModel(layer.id);m.scale.multiplyScalar(.56);
      m.position.y=i*.105;
      if(i%2)m.rotation.y=.08;
      g.add(m);
    });
  }
  if(payload.packaged){
    const box=new THREE.Mesh(new THREE.BoxGeometry(.72,.5,.62),new THREE.MeshStandardMaterial({color:0xf0dfbf,transparent:true,opacity:.7,roughness:.9}));
    box.position.y=.25;g.add(box);
  }
  return g;
}
function buildFixedVisuals(){
  fixedGroup.clear();
  const baseGeo=new THREE.BoxGeometry(CELL*.92,.25,CELL*.92);
  for(const s of SUPPLIERS){
    const p=cellWorld(s.x,s.y),g=new THREE.Group();g.position.copy(p);
    const base=new THREE.Mesh(baseGeo,new THREE.MeshStandardMaterial({color:0x3d4850,roughness:.75,metalness:.1}));base.position.y=.13;base.castShadow=true;base.receiveShadow=true;g.add(base);
    const chute=new THREE.Mesh(new THREE.BoxGeometry(.58,.34,.58),new THREE.MeshStandardMaterial({color:s.color,roughness:.7}));chute.position.set(0,.36,0);g.add(chute);
    const model=cloneModel(s.id);model.position.y=.52;model.scale.multiplyScalar(.65);g.add(model);
    fixedGroup.add(g);
  }
  for(const s of SHIPS){
    const p=cellWorld(s.x,s.y),g=new THREE.Group();g.position.copy(p);
    const dock=new THREE.Mesh(new THREE.BoxGeometry(CELL*.98,.2,CELL*.98),new THREE.MeshStandardMaterial({color:0x3d6d59,roughness:.75}));dock.position.y=.1;g.add(dock);
    const crate=new THREE.Mesh(new THREE.BoxGeometry(.7,.55,.7),new THREE.MeshStandardMaterial({color:0xb88855,roughness:.9}));crate.position.y=.46;g.add(crate);
    const marker=new THREE.Mesh(new THREE.ConeGeometry(.16,.38,3),new THREE.MeshStandardMaterial({color:0x79e7a6,emissive:0x183924}));marker.rotation.z=-Math.PI/2;marker.position.set(-.32,.85,0);g.add(marker);
    fixedGroup.add(g);
  }
}
const BELT_CENTER_GEO=new THREE.BoxGeometry(CELL*.44,.12,CELL*.44);
const BELT_ARM_X_GEO=new THREE.BoxGeometry(CELL*.60,.12,CELL*.44);
const BELT_ARM_Z_GEO=new THREE.BoxGeometry(CELL*.44,.12,CELL*.60);
const BELT_ARROW_GEO=new THREE.ConeGeometry(.13,.36,3);
const BELT_MAT=new THREE.MeshStandardMaterial({color:0x69747a,roughness:.72,metalness:.16});
const BELT_OK_MAT=new THREE.MeshStandardMaterial({color:0x67b88d,roughness:.72,metalness:.12});
const BELT_WARN_MAT=new THREE.MeshStandardMaterial({color:0xc6a553,roughness:.72,metalness:.12});
const BELT_BAD_MAT=new THREE.MeshStandardMaterial({color:0xc86a68,roughness:.72,metalness:.12});
const BELT_ARROW_MAT=new THREE.MeshStandardMaterial({color:0xffc65e,roughness:.7,emissive:0x3c2505});
const GHOST_OK_MAT=new THREE.MeshStandardMaterial({color:0x6fe2ff,transparent:true,opacity:.42,roughness:.6,metalness:.05,depthWrite:false});
const GHOST_BAD_MAT=new THREE.MeshStandardMaterial({color:0xff6f6f,transparent:true,opacity:.48,roughness:.6,metalness:.05,depthWrite:false});
const GHOST_ARROW_MAT=new THREE.MeshStandardMaterial({color:0xffffff,emissive:0x315e68,transparent:true,opacity:.82,depthWrite:false});
const MACHINE_TOP_MAT=new THREE.MeshStandardMaterial({color:0x222b31,roughness:.55,metalness:.22});
const MACHINE_INDICATOR_MAT=new THREE.MeshStandardMaterial({color:0xffd174,emissive:0x3b2508});
const machineBaseMats=new Map();

function oppositeDir(d){return (d+2)%4}
function cellFromMap(map,x,y){return fixedAt(x,y)||map.get(key(x,y))||null}
function outgoingDirs(cell){
  if(!cell)return [];
  if(cell.type==='supplier')return [0];
  if(cell.type==='ship')return [];
  if(cell.type==='cross')return ALL_DIRS;
  if(cell.type==='splitter')return [cell.dir??0,rotRight(cell.dir??0)];
  if(cell.dir!==undefined)return [cell.dir];
  return [];
}
function beltConnections(x,y,c,map=blueprint){
  if(c.type==='cross')return ALL_DIRS.slice();
  const dirs=new Set();
  const d=Number.isInteger(c.dir)?c.dir:0;
  if(c.type==='splitter'){
    dirs.add(oppositeDir(d));dirs.add(d);dirs.add(rotRight(d));
  }else if(c.type==='merger'){
    dirs.add(oppositeDir(d));dirs.add(rotLeft(d));dirs.add(d);
  }else dirs.add(d);

  for(const nd of ALL_DIRS){
    const v=DIRS[nd],n=cellFromMap(map,x+v.x,y+v.y);
    if(!n)continue;
    if(outgoingDirs(c).includes(nd))dirs.add(nd);
    if(outgoingDirs(n).includes(oppositeDir(nd)))dirs.add(nd);
  }
  if(c.type==='belt'&&dirs.size===1)dirs.add(oppositeDir(d));
  return [...dirs].sort((a,b)=>a-b);
}
function beltMaterial(x,y,ghost,valid){
  if(ghost)return valid?GHOST_OK_MAT:GHOST_BAD_MAT;
  if(!analysis)return BELT_MAT;
  const h=cellHeat.get(key(x,y))||0;
  return h>1.6?BELT_BAD_MAT:h>.55?BELT_WARN_MAT:BELT_OK_MAT;
}
function makeDirectionArrow(dir,ghost=false){
  const arrow=new THREE.Mesh(BELT_ARROW_GEO,ghost?GHOST_ARROW_MAT:BELT_ARROW_MAT);
  const target=new THREE.Vector3(DIRS[dir].x,0,DIRS[dir].y).normalize();
  arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),target);
  arrow.position.y=.23;
  return arrow;
}
function makeBeltTile(x,y,c,map=blueprint,{ghost=false,valid=true}={}){
  const g=new THREE.Group();g.position.copy(cellWorld(x,y));
  const mat=beltMaterial(x,y,ghost,valid),connections=beltConnections(x,y,c,map);
  const center=new THREE.Mesh(BELT_CENTER_GEO,mat);center.position.y=.09;center.castShadow=!ghost;center.receiveShadow=!ghost;g.add(center);
  for(const d of connections){
    const horizontal=d===0||d===2;
    const arm=new THREE.Mesh(horizontal?BELT_ARM_X_GEO:BELT_ARM_Z_GEO,mat);
    arm.position.set(DIRS[d].x*CELL*.255,.09,DIRS[d].y*CELL*.255);
    arm.castShadow=!ghost;arm.receiveShadow=!ghost;g.add(arm);
  }
  const dir=Number.isInteger(c.dir)?c.dir:0;
  g.add(makeDirectionArrow(dir,ghost));
  if(c.type!=='belt'){
    const hubColor=c.type==='splitter'?0xe5a84f:c.type==='merger'?0x69a9d1:0x9a7bd4;
    const hubMat=ghost?(valid?GHOST_OK_MAT:GHOST_BAD_MAT):new THREE.MeshStandardMaterial({color:hubColor,roughness:.55,metalness:.12});
    const hub=new THREE.Mesh(new THREE.CylinderGeometry(.16,.16,.08,12),hubMat);hub.position.y=.17;g.add(hub);
  }
  return g;
}
function machineBaseMaterial(type){
  if(!machineBaseMats.has(type))machineBaseMats.set(type,new THREE.MeshStandardMaterial({color:MACHINE[type].color,roughness:.68,metalness:.08}));
  return machineBaseMats.get(type);
}
function makeMachineVisual(type,dir,{ghost=false,valid=true}={}){
  const g=new THREE.Group();g.rotation.y=-dir*Math.PI/2;
  const baseMat=ghost?(valid?GHOST_OK_MAT:GHOST_BAD_MAT):machineBaseMaterial(type);
  const topMat=ghost?(valid?GHOST_OK_MAT:GHOST_BAD_MAT):MACHINE_TOP_MAT;
  const indicatorMat=ghost?GHOST_ARROW_MAT:MACHINE_INDICATOR_MAT;
  const base=new THREE.Mesh(new THREE.BoxGeometry(CELL*.88,.48,CELL*.88),baseMat);
  base.position.y=.25;base.castShadow=!ghost;base.receiveShadow=!ghost;g.add(base);
  const topGeo=type==='pan'?new THREE.CylinderGeometry(.34,.4,.13,16):type==='assembler'?new THREE.CylinderGeometry(.18,.28,.48,8):new THREE.BoxGeometry(.48,.24,.55);
  const top=new THREE.Mesh(topGeo,topMat);top.position.y=.58;g.add(top);
  const indicator=new THREE.Mesh(new THREE.ConeGeometry(.12,.32,3),indicatorMat);
  indicator.rotation.z=-Math.PI/2;indicator.position.set(.34,.73,0);g.add(indicator);
  return g;
}
function beltPathCells(a,b,defaultDir=rotation){
  if(!a||!b)return [];
  const cells=[{x:a.x,y:a.y},...manhattanCells(a,b)];
  return cells.map((c,i)=>{
    let dir=defaultDir;
    if(i<cells.length-1)dir=dirBetween(c,cells[i+1]);
    else if(i>0)dir=dirBetween(cells[i-1],c);
    return {...c,dir};
  });
}
function previewMapFor(entries){
  const map=new Map(blueprint);
  for(const e of entries){
    if(!inBounds(e.x,e.y)||FIXED.has(key(e.x,e.y)))continue;
    map.set(key(e.x,e.y),{type:'belt',dir:e.dir,toggle:false});
  }
  return map;
}
function canPreviewBeltAt(x,y){
  if(!inBounds(x,y)||FIXED.has(key(x,y)))return false;
  const old=blueprint.get(key(x,y));
  return !old||BELT_TYPES.has(old.type);
}
function applyBeltPath(entries){
  if(!entries.length)return false;
  const before=JSON.stringify(snapshotBlueprint());
  if(entries.length===1){
    const e=entries[0],k=key(e.x,e.y);
    if(inBounds(e.x,e.y)&&!FIXED.has(k)&&!blueprint.has(k))blueprint.set(k,{type:'belt',dir:e.dir,toggle:false});
  }else{
    for(let i=1;i<entries.length;i++)addBeltStep(entries[i-1],entries[i]);
  }
  return JSON.stringify(snapshotBlueprint())!==before;
}
function makeEraseGhost(x,y){
  const valid=!!blueprint.get(key(x,y));
  const mat=valid?GHOST_BAD_MAT:GHOST_OK_MAT;
  const m=new THREE.Mesh(new THREE.BoxGeometry(CELL*.88,.08,CELL*.88),mat);
  m.position.copy(cellWorld(x,y));m.position.y=.08;return m;
}
function rebuildPreviewVisuals(){
  if(!previewGroup)return;
  previewGroup.clear();
  if(!running||selectedTool==='move'||!hoverCell)return;

  if(rotateArmed){
    const existing=blueprint.get(key(hoverCell.x,hoverCell.y));
    if(existing&&ROTATABLE_TYPES.has(existing.type)){
      const next={...existing,dir:rotRight(Number.isInteger(existing.dir)?existing.dir:0)};
      const valid=true;
      if(BELT_TYPES.has(next.type)){
        const map=new Map(blueprint);map.set(key(hoverCell.x,hoverCell.y),next);
        previewGroup.add(makeBeltTile(hoverCell.x,hoverCell.y,next,map,{ghost:true,valid}));
      }else if(MACHINE[next.type]){
        const g=makeMachineVisual(next.type,next.dir,{ghost:true,valid});g.position.copy(cellWorld(hoverCell.x,hoverCell.y));previewGroup.add(g);
      }
      return;
    }
  }

  if((dragBuild&&dragBuild.tool==='belt')||selectedTool==='belt'){
    const entries=dragBuild?.tool==='belt'?previewPath:beltPathCells(hoverCell,hoverCell,rotation);
    const map=previewMapFor(entries);
    for(const e of entries){
      if(FIXED.has(key(e.x,e.y)))continue;
      previewGroup.add(makeBeltTile(e.x,e.y,{type:'belt',dir:e.dir,toggle:false},map,{ghost:true,valid:canPreviewBeltAt(e.x,e.y)}));
    }
    return;
  }

  const c=dragBuild?.pending?dragBuild.last:hoverCell;
  const tool=dragBuild?.pending?dragBuild.tool:selectedTool;
  const dir=dragBuild?.pending?dragBuild.dir:rotation;
  if(!c)return;
  if(tool==='erase'){previewGroup.add(makeEraseGhost(c.x,c.y));return}
  const valid=inBounds(c.x,c.y)&&!FIXED.has(key(c.x,c.y));
  if(BELT_TYPES.has(tool)){
    const temp={type:tool,dir,toggle:false},map=new Map(blueprint);map.set(key(c.x,c.y),temp);
    previewGroup.add(makeBeltTile(c.x,c.y,temp,map,{ghost:true,valid}));
  }else if(MACHINE[tool]){
    const g=makeMachineVisual(tool,dir,{ghost:true,valid});g.position.copy(cellWorld(c.x,c.y));previewGroup.add(g);
  }
}

function rebuildFactoryVisuals(){
  staticGroup.clear();
  for(const [k,c] of blueprint){
    const [x,y]=k.split(',').map(Number);
    if(BELT_TYPES.has(c.type))staticGroup.add(makeBeltTile(x,y,c,blueprint));
    else if(MACHINE[c.type]){
      const g=makeMachineVisual(c.type,c.dir);g.position.copy(cellWorld(x,y));staticGroup.add(g);
    }
  }
  rebuildPreviewVisuals();
}
function refreshAllItemViews(){for(const it of items){if(it.view)itemGroup.remove(it.view);it.view=makePayloadView(it.payload);itemGroup.add(it.view)}}

function syncProjection(){
  if(!camera)return;
  const aspect=innerWidth/Math.max(1,innerHeight);
  camera.left=-viewSize*aspect/2;camera.right=viewSize*aspect/2;camera.top=viewSize/2;camera.bottom=-viewSize/2;
  camera.updateProjectionMatrix();updateCamera();
}
function resize(){
  if(!renderer||!camera)return;
  renderer.setSize(innerWidth,innerHeight,false);syncProjection();
}
function updateCamera(){
  clampCameraTarget();
  camera.position.set(cameraTarget.x+viewSize*.72,viewSize*.92,cameraTarget.z+viewSize*.82);
  camera.lookAt(cameraTarget.x,0,cameraTarget.z);
  camera.updateMatrixWorld();
}
function screenToCell(clientX,clientY){
  const rect=renderer.domElement.getBoundingClientRect();
  const ndc=new THREE.Vector2((clientX-rect.left)/rect.width*2-1,-((clientY-rect.top)/rect.height)*2+1);
  raycaster.setFromCamera(ndc,camera);
  const hit=raycaster.intersectObject(floor,false)[0];if(!hit)return null;
  const x=Math.floor(hit.point.x/CELL+COLS/2),y=Math.floor(hit.point.z/CELL+ROWS/2);
  return inBounds(x,y)?{x,y}:null;
}
function snapshotBlueprint(){return Array.from(blueprint.entries()).map(([k,v])=>[k,{type:v.type,dir:v.dir,toggle:!!v.toggle}])}
function pushUndo(){
  undoStack.push(snapshotBlueprint());if(undoStack.length>24)undoStack.shift();redoStack.length=0;syncUndo();
}
function restoreBlueprint(snap){
  blueprint=new Map((snap||[]).map(([k,v])=>[k,{...v}]));
  items.forEach(removeItemView);items=[];machineStates.clear();rebuildFactoryVisuals();syncUndo();saveGame(false);
}
function undo(){if(!undoStack.length){sound('error');showToast('되돌릴 변경이 없어요.');return}redoStack.push(snapshotBlueprint());restoreBlueprint(undoStack.pop());sound('click')}
function redo(){if(!redoStack.length){sound('error');showToast('다시 실행할 변경이 없어요.');return}undoStack.push(snapshotBlueprint());restoreBlueprint(redoStack.pop());sound('click')}
function syncUndo(){ui.undoBtn.disabled=!undoStack.length;ui.redoBtn.disabled=!redoStack.length}

function setCell(x,y,type,dir=rotation){
  if(!inBounds(x,y)||FIXED.has(key(x,y)))return false;
  const k=key(x,y);
  if(type==='erase'){if(blueprint.delete(k)){machineStates.delete(k);return true}return false}
  blueprint.set(k,{type,dir,toggle:false});machineStates.delete(k);return true;
}
function rotatePlacedCell(x,y){
  const cell=blueprint.get(key(x,y));
  if(!cell||!ROTATABLE_TYPES.has(cell.type))return false;
  cell.dir=rotRight(Number.isInteger(cell.dir)?cell.dir:0);
  rotation=cell.dir;
  return true;
}
function disarmRotate(){rotateArmed=false;ui.rotateBtn.classList.remove('active')}
function addBeltStep(a,b){
  if(!a||!b)return;
  const d=dirBetween(a,b);
  if(!FIXED.has(key(a.x,a.y))){
    const old=blueprint.get(key(a.x,a.y));
    if(!old||['belt','splitter','merger','cross'].includes(old.type))blueprint.set(key(a.x,a.y),{type:'belt',dir:d,toggle:false});
  }
  if(!FIXED.has(key(b.x,b.y))){
    const old=blueprint.get(key(b.x,b.y));
    if(!old)blueprint.set(key(b.x,b.y),{type:'belt',dir:d,toggle:false});
    else if(old.type==='belt')old.dir=d;
  }
}
function manhattanCells(a,b){
  const out=[];let x=a.x,y=a.y;
  while(x!==b.x){x+=Math.sign(b.x-x);out.push({x,y})}
  while(y!==b.y){y+=Math.sign(b.y-y);out.push({x,y})}
  return out;
}

function pointerDown(ev){
  activePointers.set(ev.pointerId,{x:ev.clientX,y:ev.clientY,type:ev.pointerType,button:ev.button});
  renderer.domElement.setPointerCapture?.(ev.pointerId);
  if(ev.pointerType==='touch'&&activePointers.size>=2){beginTouchPan();dragBuild=null;previewPath=[];hoverCell=null;rebuildPreviewVisuals();return}
  if(ev.button===1||ev.button===2){hoverCell=null;previewPath=[];rebuildPreviewVisuals();beginDragPan(ev);return}
  if(ev.button!==0)return;
  if(selectedTool==='move'){hoverCell=null;rebuildPreviewVisuals();beginDragPan(ev);return}
  const c=screenToCell(ev.clientX,ev.clientY);if(!c)return;
  hoverCell=c;

  if(rotateArmed){
    const existing=blueprint.get(key(c.x,c.y));
    if(existing&&ROTATABLE_TYPES.has(existing.type)){
      pushUndo();rotatePlacedCell(c.x,c.y);disarmRotate();rebuildFactoryVisuals();saveGame(false);sound('click');syncUndo();
      showToast('설치물 회전 · '+DIR_LABELS[existing.dir]+' 방향');
      return;
    }
    disarmRotate();
  }

  if(selectedTool==='belt'){
    dragBuild={tool:'belt',start:c,last:c,dir:rotation,changed:false};
    previewPath=beltPathCells(c,c,rotation);rebuildPreviewVisuals();return;
  }
  if(selectedTool==='erase'){
    pushUndo();dragBuild={tool:'erase',last:c,changed:false};
    dragBuild.changed=setCell(c.x,c.y,'erase')||dragBuild.changed;
    rebuildFactoryVisuals();return;
  }

  dragBuild={tool:selectedTool,start:c,last:c,dir:rotation,pending:true,changed:false};
  rebuildPreviewVisuals();
}
function pointerMove(ev){
  const p=activePointers.get(ev.pointerId);if(p){p.x=ev.clientX;p.y=ev.clientY}
  if(panGesture){updatePanGesture();return}
  const c=screenToCell(ev.clientX,ev.clientY);
  hoverCell=c;
  if(!dragBuild){rebuildPreviewVisuals();return}
  if(!c){rebuildPreviewVisuals();return}

  if(dragBuild.tool==='belt'){
    dragBuild.last=c;
    previewPath=beltPathCells(dragBuild.start,c,dragBuild.dir);
    rebuildPreviewVisuals();return;
  }
  if(dragBuild.pending){
    dragBuild.last=c;rebuildPreviewVisuals();return;
  }
  if(dragBuild.tool==='erase'){
    if(dragBuild.last&&c.x===dragBuild.last.x&&c.y===dragBuild.last.y){rebuildPreviewVisuals();return}
    dragBuild.changed=setCell(c.x,c.y,'erase')||dragBuild.changed;
    dragBuild.last=c;rebuildFactoryVisuals();
  }
}
function pointerUp(ev){
  activePointers.delete(ev.pointerId);
  if(panGesture){
    if(panGesture.mode==='touch'&&activePointers.size>=2){beginTouchPan();return}
    endPanGesture();return;
  }
  if(!dragBuild){rebuildPreviewVisuals();return}

  const build=dragBuild;dragBuild=null;
  if(build.tool==='belt'){
    const entries=previewPath;previewPath=[];
    pushUndo();
    const changed=applyBeltPath(entries);
    if(changed){rebuildFactoryVisuals();saveGame(false);sound('click')}
    else{undoStack.pop();syncUndo();rebuildPreviewVisuals()}
    return;
  }
  if(build.pending){
    pushUndo();
    const c=build.last,changed=c?setCell(c.x,c.y,build.tool,build.dir):false;
    if(changed){rebuildFactoryVisuals();saveGame(false);sound('click')}
    else{undoStack.pop();syncUndo();rebuildPreviewVisuals()}
    return;
  }
  if(build.tool==='erase'){
    if(build.changed){saveGame(false);sound('click')}else{undoStack.pop();syncUndo()}
    rebuildPreviewVisuals();
  }
}
function pointerLeave(){
  if(activePointers.size)return;
  hoverCell=null;previewPath=[];rebuildPreviewVisuals();
}
function beginTouchPan(){
  const pts=[...activePointers.values()].slice(0,2);
  if(pts.length<2)return;
  panGesture={mode:'touch',cx:(pts[0].x+pts[1].x)/2,cy:(pts[0].y+pts[1].y)/2,dist:Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y),target:cameraTarget.clone(),view:viewSize};
  document.body.classList.add('draggingView');
}
function beginDragPan(ev){
  panGesture={mode:'drag',cx:ev.clientX,cy:ev.clientY,target:cameraTarget.clone(),view:viewSize,pointerId:ev.pointerId};
  document.body.classList.add('draggingView');
}
function endPanGesture(){
  panGesture=null;document.body.classList.remove('draggingView');
  if(tutorialMode&&tutorialStepIndex===0)showToast('좋아요! 이제 원하는 곳을 자세히 볼 수 있어요.',1500);
}
function panTarget(base,dx,dy,view){
  camera.updateMatrixWorld();
  const right=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion);right.y=0;if(right.lengthSq()<.001)right.set(1,0,0);right.normalize();
  const up=new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion);up.y=0;if(up.lengthSq()<.001)up.set(0,0,-1);up.normalize();
  const scale=view/Math.max(1,innerHeight);
  return base.clone().addScaledVector(right,-dx*scale).addScaledVector(up,dy*scale);
}
function updatePanGesture(){
  if(!panGesture)return;
  if(panGesture.mode==='touch'){
    const pts=[...activePointers.values()].slice(0,2);if(pts.length<2)return;
    const cx=(pts[0].x+pts[1].x)/2,cy=(pts[0].y+pts[1].y)/2,dist=Math.max(20,Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y));
    cameraTarget.copy(panTarget(panGesture.target,cx-panGesture.cx,cy-panGesture.cy,panGesture.view));
    const preset=MAP_PRESETS[mapSize];viewSize=clamp(panGesture.view*(panGesture.dist/dist),preset.minView,60);syncProjection();
  }else{
    const p=activePointers.get(panGesture.pointerId);if(!p)return;
    cameraTarget.copy(panTarget(panGesture.target,p.x-panGesture.cx,p.y-panGesture.cy,panGesture.view));updateCamera();
  }
}
function wheel(ev){
  ev.preventDefault();
  const preset=MAP_PRESETS[mapSize];viewSize=clamp(viewSize*(ev.deltaY>0?1.1:.9),preset.minView,60);syncProjection();
}
rendererEventsSetup();
function rendererEventsSetup(){
  const c=$('game');
  c.addEventListener('pointerdown',pointerDown);
  c.addEventListener('pointermove',pointerMove);
  c.addEventListener('pointerup',pointerUp);
  c.addEventListener('pointercancel',pointerUp);
  c.addEventListener('pointerleave',pointerLeave);
  c.addEventListener('wheel',wheel,{passive:false});
  c.addEventListener('contextmenu',e=>e.preventDefault());
}

function spawnItem(x,y,dir,payload,fromMachine=false){
  if(items.length>=maxItems())return null;
  if(items.some(i=>i.x===x&&i.y===y))return null;
  const it={id:itemSeq++,x,y,dir,progress:fromMachine?0:.02,payload:clonePlain(payload),wait:0,view:makePayloadView(payload)};
  itemGroup.add(it.view);items.push(it);return it;
}
function removeItemView(it){if(it?.view)itemGroup.remove(it.view)}
function discardItem(it){
  stats.waste++;
  if(it.view){itemGroup.remove(it.view);effectGroup.add(it.view);const p=cellWorld(it.x,it.y);it.view.position.set(p.x,.55,p.z);effects.push({view:it.view,t:0,vx:(Math.random()-.5)*.8,vz:(Math.random()-.5)*.8})}
  it.dead=true;
}
function isOccupied(x,y,ignore=null){return items.some(i=>!i.dead&&i!==ignore&&i.x===x&&i.y===y)}
function fixedAt(x,y){
  const s=SUPPLIERS.find(p=>p.x===x&&p.y===y);if(s)return {type:'supplier',...s};
  const sh=SHIPS.find(p=>p.x===x&&p.y===y);if(sh)return {type:'ship',...sh};
  return null;
}
function cellAt(x,y){return fixedAt(x,y)||blueprint.get(key(x,y))||null}
function machineState(x,y){
  const k=key(x,y);let s=machineStates.get(k);if(!s){s={base:null,top:null,busy:null,timer:0};machineStates.set(k,s)}return s;
}
function acceptedMachine(cell,item,inDir,x,y){
  const st=machineState(x,y),type=cell.type;
  if(type==='assembler'){
    const role=inDir===cell.dir?'base':inDir===rotRight(cell.dir)?'top':null;
    if(!role||st[role]||st.busy)return false;
    st[role]=clonePlain(item.payload);
    if(st.base&&st.top&&!st.busy){
      st.busy={layers:[...st.base.layers,...st.top.layers],packaged:false};
      st.base=null;st.top=null;st.timer=MACHINE.assembler.time;
      sound('ok');
    }
    return true;
  }
  if(st.busy||st.timer>0||isOccupied(x,y))return false;
  let p=clonePlain(item.payload);
  if(type==='slicer'){
    p.layers=p.layers.map(l=>({id:l.id==='tomato'?'tomato_slice':l.id,state:'sliced'}));sound('slice');
  }else if(type==='pan'){
    p.layers=p.layers.map(l=>({id:l.id==='egg'?'egg_cooked':l.id==='bacon_raw'?'bacon':l.id,state:'cooked'}));
  }else if(type==='toaster'){
    p.layers=p.layers.map(l=>({id:l.id==='bread'?'toast':l.id,state:'toasted'}));
  }else if(type==='packer'){p.packaged=true}
  st.busy=p;st.timer=MACHINE[type].time;return true;
}
function tickMachines(dt){
  for(const [k,c] of blueprint){
    if(!MACHINE[c.type])continue;
    const [x,y]=k.split(',').map(Number),st=machineState(x,y);
    if(st.timer>0)st.timer-=dt;
    if(st.busy&&st.timer<=0&&!isOccupied(x,y)){
      const out=spawnItem(x,y,c.dir,st.busy,true);
      if(out){st.busy=null;st.timer=0}
    }
  }
}
function visualOutDir(cell,it){
  if(!cell)return it.dir;
  if(cell.type==='splitter')return cell.toggle?rotRight(cell.dir):cell.dir;
  if(cell.type==='cross')return it.dir;
  if(cell.dir!==undefined)return cell.dir;
  return it.dir;
}
function takeOutDir(cell,it){return visualOutDir(cell,it)}
function markSplitUsed(cell){if(cell?.type==='splitter')cell.toggle=!cell.toggle}
function tryAdvance(it){
  const current=cellAt(it.x,it.y),d=takeOutDir(current,it),v=DIRS[d],nx=it.x+v.x,ny=it.y+v.y;
  if(!inBounds(nx,ny)){discardItem(it);markSplitUsed(current);return true}
  const target=cellAt(nx,ny);
  if(!target){discardItem(it);markSplitUsed(current);return true}
  if(target.type==='supplier')return false;
  if(target.type==='ship'){shipItem(it);it.dead=true;removeItemView(it);markSplitUsed(current);return true}
  if(MACHINE[target.type]){
    if(acceptedMachine(target,it,d,nx,ny)){it.dead=true;removeItemView(it);markSplitUsed(current);return true}
    return false;
  }
  if(isOccupied(nx,ny,it))return false;
  it.x=nx;it.y=ny;it.progress=0;it.wait=0;
  if(target.type==='cross')it.dir=d;else if(target.dir!==undefined)it.dir=target.dir;else it.dir=d;
  markSplitUsed(current);return true;
}
function tickItems(dt){
  cellHeat.clear();
  for(const it of items){
    if(it.dead)continue;
    it.progress+=dt*1.25;
    if(it.progress<1)continue;
    if(tryAdvance(it)){it.wait=0}else{it.progress=1;it.wait+=dt;cellHeat.set(key(it.x,it.y),Math.max(cellHeat.get(key(it.x,it.y))||0,it.wait))}
  }
  items=items.filter(i=>!i.dead);
}
function tickSuppliers(dt){
  spawnClock+=dt;if(spawnClock<1.45)return;spawnClock=0;
  for(const s of SUPPLIERS){
    if(items.length>=maxItems())break;
    if(!isOccupied(s.x,s.y))spawnItem(s.x,s.y,0,{layers:[{id:s.id,state:'raw'}],packaged:false});
  }
}
function sellValue(payload){
  if(!payload.layers.length)return 0;
  let base=payload.layers.reduce((n,l)=>n+(INGREDIENTS[l.id]?.value||10),0);
  if(payload.layers.length===1)base*=.18;
  else base*=1+.08*Math.min(8,payload.layers.length-1);
  if(payload.packaged)base*=1.15;
  const sig=signature(payload),match=orders.find(o=>o.layers.join('>')===sig);
  if(match)base*=match.mult;
  return Math.round(base);
}
function shipItem(it){
  const value=sellValue(it.payload);stats.shipped++;if(stats.shipped===1)reportAchievement('first_shipment',{value});stats.cash+=value;stats.shipTimes.push(gameTime);stats.shipTimes=stats.shipTimes.filter(t=>gameTime-t<=60);
  if(it.payload.layers.length>=3){
    const sig=signature(it.payload);
    if(!stats.discoveries[sig]&&!pendingDiscovery){
      pendingDiscovery={sig,payload:clonePlain(it.payload),value};
      openDiscovery(pendingDiscovery);
    }
  }
  if(stats.shipped%8===0)sound('ok');checkChallenge();updateHud();
}
function openDiscovery(d){
  paused=true;ui.pauseBtn.textContent='▶';
  ui.discoverLayers.textContent=d.payload.layers.length+'단 샌드위치 발견!';
  ui.discoverText.textContent=payloadLabel(d.payload)+' · 기본 판매 '+money(d.value);
  ui.discoverName.value='';ui.discover.classList.remove('hidden');setTimeout(()=>ui.discoverName.focus(),50);
}
function saveDiscovery(){
  if(!pendingDiscovery)return;
  const name=ui.discoverName.value.trim()||('나만의 샌드위치 '+(Object.keys(stats.discoveries).length+1));
  stats.discoveries[pendingDiscovery.sig]={name,layers:pendingDiscovery.payload.layers,value:pendingDiscovery.value};
  reportAchievement('inventor',{layers:stats.discoveries[pendingDiscovery.sig].layers.length});
  if(Object.keys(stats.discoveries).length>=3)reportAchievement('discoveries_3',{discoveries:Object.keys(stats.discoveries).length});
  pendingDiscovery=null;ui.discover.classList.add('hidden');paused=false;ui.pauseBtn.textContent='Ⅱ';sound('ok');saveGame(false);showToast('도감에 저장했어요: '+name,1800);
}
function tickOrders(dt){orderClock+=dt;if(orderClock>=180){orderClock=0;pickOrders();showToast('인기 메뉴가 바뀌었어요!',1800)}}
function rawSourceFor(id){
  if(id==='toast')return 'bread';
  if(id==='tomato_slice')return 'tomato';
  if(id==='egg_cooked')return 'egg';
  if(id==='bacon')return 'bacon_raw';
  return id;
}
function recipeAvailable(recipe){
  const available=new Set(SUPPLIERS.map(s=>s.id));
  return recipe.layers.every(id=>available.has(rawSourceFor(id)));
}
function pickOrders(){
  const pool=RECIPES.filter(recipeAvailable);
  const shuffled=[...pool].sort(()=>Math.random()-.5);orders=shuffled.slice(0,Math.min(3,shuffled.length));renderOrders();
}
function renderOrders(){
  ui.orderList.innerHTML='';
  for(const o of orders){
    const div=document.createElement('div');div.className='orderCard';
    div.innerHTML='<div class="row"><b>'+o.name+'</b><strong>×'+o.mult.toFixed(1)+'</strong></div><small>'+o.layers.map(id=>INGREDIENTS[id]?.label||id).join(' · ')+'</small>';
    ui.orderList.appendChild(div);
  }
}
const CHALLENGES=[
  {name:'분당 10개 생산',progress:()=>stats.shipTimes.length,target:10},
  {name:'샌드위치 3종 발견',progress:()=>Object.keys(stats.discoveries).length,target:3},
  {name:'폐기 없이 30개 출고',progress:()=>Math.max(0,stats.shipped-(window.__wasteBaseShip||0)),target:30,reset:()=>{window.__wasteBase=stats.waste;window.__wasteBaseShip=stats.shipped}},
  {name:'분당 20개 생산',progress:()=>stats.shipTimes.length,target:20}
];
function checkChallenge(){
  const c=CHALLENGES[challengeIndex%CHALLENGES.length];
  if(c.name.includes('폐기')&&stats.waste>(window.__wasteBase??stats.waste)){window.__wasteBase=stats.waste;window.__wasteBaseShip=stats.shipped}
  const p=c.progress();ui.challengeTitle.textContent=c.name;ui.challengeProgress.textContent=Math.min(p,c.target)+' / '+c.target;
  if(p>=c.target){
    if(c.name==='분당 10개 생산')reportAchievement('rate_10',{perMinute:p});
    if(c.name==='폐기 없이 30개 출고')reportAchievement('zero_waste_30',{shipped:p,waste:stats.waste});
    if(c.name==='분당 20개 생산')reportAchievement('rate_20',{perMinute:p});
    showToast('도전 성공! '+c.name,2200);challengeIndex=(challengeIndex+1)%CHALLENGES.length;CHALLENGES[challengeIndex]?.reset?.();setTimeout(checkChallenge,700)
  }
}
function tickEffects(dt){
  for(const e of effects){e.t+=dt;e.view.position.x+=e.vx*dt;e.view.position.z+=e.vz*dt;e.view.position.y-=2.8*dt;e.view.rotation.y+=dt*3}
  effects=effects.filter(e=>{if(e.t>1){effectGroup.remove(e.view);return false}return true});
}
function updateItemViews(){
  for(const it of items){
    if(!it.view)continue;
    const c=cellAt(it.x,it.y),d=visualOutDir(c||{dir:it.dir},it),v=DIRS[d],p=cellWorld(it.x,it.y);
    const t=clamp(it.progress,0,1);it.view.position.set(p.x+v.x*CELL*(t-.5),.34,p.z+v.y*CELL*(t-.5));it.view.rotation.y=-d*Math.PI/2;
  }
}
function updateHud(){
  stats.shipTimes=stats.shipTimes.filter(t=>gameTime-t<=60);
  ui.shipped.textContent=stats.shipped.toLocaleString('ko-KR');ui.cash.textContent=money(stats.cash);ui.perMinute.textContent=stats.shipTimes.length.toFixed(1);ui.waste.textContent=stats.waste.toLocaleString('ko-KR');
  ui.mapBadge.textContent=MAP_PRESETS[mapSize].label;checkChallenge();
}
function simulate(dt){
  if(!running||paused)return;
  gameTime+=dt;tickSuppliers(dt);tickMachines(dt);tickItems(dt);tickOrders(dt);tickEffects(dt);saveClock+=dt;analysisClock+=dt;
  if(saveClock>=10){saveClock=0;saveGame(false)}
  if(analysis&&analysisClock>=1){analysisClock=0;rebuildFactoryVisuals()}
  updateHud();
}
function frame(now){
  requestAnimationFrame(frame);
  const dt=Math.min(.06,(now-lastFrame)/1000||.016);lastFrame=now;
  if(running&&!paused){acc+=dt*speed;while(acc>=TICK){simulate(TICK);acc-=TICK}}else tickEffects(dt);
  updateItemViews();renderer.render(scene,camera);
}

function saveKey(slot=activeSlot){return window.KidscadeGame?.storageKey?.('high_factory_tycoon','slot'+slot)||['kidscade','game','v1:high_factory_tycoon:slot'+slot].join('_')}
function serialize(){
  return {version:2,mapSize,blueprint:snapshotBlueprint(),stats,gameTime,challengeIndex,camera:{x:cameraTarget.x,z:cameraTarget.z,view:viewSize},savedAt:Date.now()};
}
function saveGame(notify=true){
  try{window.KidscadeStorage?.setJson(saveKey(),serialize());refreshSlots();if(notify){sound('ok');showToast('공장 '+activeSlot+'을 저장했어요.')}}catch(_){if(notify)showToast('저장하지 못했어요.')}
}
function readSave(slot=activeSlot){try{return window.KidscadeStorage?.getJson(saveKey(slot),null)||null}catch(_){return null}}
function hasSave(slot=activeSlot){return !!readSave(slot)}
function loadGame(){
  try{
    const s=readSave();if(!s)return false;
    const loadedSize=MAP_PRESETS[s.mapSize]?s.mapSize:'large';
    applyMapSize(loadedSize,{resetView:false});
    blueprint=new Map((s.blueprint||[]).map(([k,v])=>[k,{...v}]));
    stats=Object.assign({shipped:0,cash:0,waste:0,shipTimes:[],discoveries:{}},s.stats||{});stats.shipTimes=[];
    gameTime=Number(s.gameTime)||0;challengeIndex=Number(s.challengeIndex)||0;
    const preset=MAP_PRESETS[mapSize];
    cameraTarget.set(Number(s.camera?.x)||0,0,Number(s.camera?.z)||0);
    viewSize=clamp(Number(s.camera?.view)||preset.view,preset.minView,60);
    items.forEach(removeItemView);items=[];machineStates.clear();pickOrders();rebuildFactoryVisuals();resize();return true;
  }catch(_){return false}
}
function newGame(size=selectedMapSize){
  applyMapSize(size);
  blueprint.clear();items.forEach(removeItemView);items=[];machineStates.clear();effects=[];stats={shipped:0,cash:0,waste:0,shipTimes:[],discoveries:{}};gameTime=0;challengeIndex=0;undoStack=[];redoStack=[];
  cameraTarget.set(0,0,0);viewSize=MAP_PRESETS[mapSize].view;pickOrders();rebuildFactoryVisuals();resize();syncUndo();CHALLENGES[0].reset?.();saveGame(false);
}
function startGame(load,tutorial=false){
  tutorialMode=!!tutorial;
  if(load&&!loadGame())newGame(selectedMapSize);else if(!load)newGame(tutorial?'small':selectedMapSize);
  ui.intro.classList.add('hidden');running=true;paused=false;ui.pauseBtn.textContent='Ⅱ';window.KidscadeGame?.start?.();updateHud();
  if(tutorialMode)beginTutorialCoach();else ui.tutorialCoach.classList.add('hidden');
  showToast('공장 '+activeSlot+' · '+MAP_PRESETS[mapSize].label+'형 맵 · 재료 공급 시작!',1700);
}
function togglePause(){
  paused=!paused;ui.pauseBtn.textContent=paused?'▶':'Ⅱ';
  if(paused)window.KidscadeGame?.pause?.();else window.KidscadeGame?.resume?.();
}
function setTool(t){
  selectedTool=t;dragBuild=null;previewPath=[];
  disarmRotate();
  document.querySelectorAll('.tool').forEach(b=>b.classList.toggle('active',b.dataset.tool===t));
  document.body.classList.toggle('moveMode',t==='move');ui.moveBtn.classList.toggle('active',t==='move');
  rebuildPreviewVisuals();sound('click');
}
function rotateTool(){
  rotation=(rotation+1)%4;rotateArmed=true;ui.rotateBtn.classList.add('active');rebuildPreviewVisuals();sound('click');
  showToast(DIR_LABELS[rotation]+' 방향 · 설치 전 모양을 확인하고, 설치물을 누르면 90° 회전');
}
function toggleAnalysis(){analysis=!analysis;ui.analysisBtn.classList.toggle('active',analysis);ui.analysisLegend.classList.toggle('hidden',!analysis);rebuildFactoryVisuals();showToast(analysis?'막힌 흐름을 색으로 표시해요.':'분석 보기를 껐어요.')}
function cycleSpeed(){speed=speed===1?2:speed===2?4:1;ui.speedBtn.textContent='×'+speed;sound('click')}
function setContinueVisibility(){
  const saved=readSave();
  ui.continueBtn.disabled=!saved;
  const label=saved?(MAP_PRESETS[saved.mapSize]?.label||'대'):null;
  ui.continueBtn.textContent=saved?'공장 '+activeSlot+' 이어하기 · '+label:'공장 '+activeSlot+' · 저장 없음';
}
function refreshSlots(){
  document.querySelectorAll('.slot').forEach(b=>{
    const n=Number(b.dataset.slot),saved=readSave(n);b.classList.toggle('active',n===activeSlot);b.classList.toggle('saved',!!saved);
    b.title=saved?'저장된 맵: '+(MAP_PRESETS[saved.mapSize]?.label||'대')+'형':'비어 있는 저장 슬롯';
  });
  setContinueVisibility();
}
function refreshSizeButtons(){
  document.querySelectorAll('.sizeCard').forEach(b=>b.classList.toggle('active',b.dataset.size===selectedMapSize));
  if(ui.tutorialBtn)ui.tutorialBtn.textContent=selectedMapSize==='small'?'소형 튜토리얼':'소형으로 튜토리얼';
}
function selectMapSize(size){
  if(!MAP_PRESETS[size])return;
  selectedMapSize=size;refreshSizeButtons();sound('click');
}
function selectSlot(n){activeSlot=clamp(Number(n)||1,1,3);refreshSlots();sound('click')}
const TUTORIAL_STEPS=[
  {title:'공장을 둘러봐요',text:'오른쪽 위의 ✋ 이동을 누르고 화면을 잡아 끌어 보세요. 큰 공장에서도 원하는 곳을 자세히 볼 수 있어요.',tool:'move'},
  {title:'컨베이어를 그어요',text:'벨트 도구로 왼쪽의 식빵 공급기에서 오른쪽으로 길을 그어 보세요. 손가락을 떼기 전까지 이어집니다.',tool:'belt'},
  {title:'재료를 가공해요',text:'토마토 라인에 🔪 자르기를 놓으면 토마토 조각으로 바뀝니다. 기계의 화살표 방향도 확인해 보세요.',tool:'slicer'},
  {title:'샌드위치를 쌓아요',text:'🥪 조립기는 앞에서 온 음식 위에 옆에서 온 재료를 올립니다. 빵과 치즈를 서로 다른 입력으로 연결해 보세요.',tool:'assembler'},
  {title:'출고장까지 보내요',text:'완성품을 오른쪽 초록 출고장까지 연결하면 돈과 출고 수가 올라갑니다. 이제 자유롭게 공장을 넓혀 보세요.',tool:'belt'}
];
function beginTutorialCoach(){
  tutorialStepIndex=0;ui.tutorialCoach.classList.remove('hidden');renderTutorialStep();
}
function renderTutorialStep(){
  const step=TUTORIAL_STEPS[tutorialStepIndex];if(!step){finishTutorial();return}
  ui.tutorialStep.textContent='튜토리얼 '+(tutorialStepIndex+1)+' / '+TUTORIAL_STEPS.length;
  ui.tutorialTitle.textContent=step.title;ui.tutorialText.textContent=step.text;
  ui.tutorialNext.textContent=tutorialStepIndex===TUTORIAL_STEPS.length-1?'자유롭게 만들기':'다음';
  if(step.tool)setTool(step.tool);
}
function nextTutorial(){tutorialStepIndex++;if(tutorialStepIndex>=TUTORIAL_STEPS.length)finishTutorial();else renderTutorialStep()}
function finishTutorial(){
  tutorialMode=false;ui.tutorialCoach.classList.add('hidden');setTool('belt');saveGame(false);showToast('튜토리얼 완료! 이제 마음대로 만들어 보세요.',1900);
}
function startSmallTutorial(){
  if(hasSave()&&!confirm('공장 '+activeSlot+'의 저장 내용을 소형 튜토리얼 공장으로 덮어쓸까요?'))return;
  selectedMapSize='small';refreshSizeButtons();startGame(false,true);
}

function openBook(){
  renderBook();ui.book.classList.remove('hidden');paused=true;ui.pauseBtn.textContent='▶';
}
function closeBook(){ui.book.classList.add('hidden');paused=false;ui.pauseBtn.textContent='Ⅱ'}
function renderBook(){
  const entries=Object.values(stats.discoveries||{});
  ui.bookList.innerHTML='';
  if(!entries.length){ui.bookList.innerHTML='<div class="bookEmpty">아직 발견한 샌드위치가 없어요.<br>재료를 3층 이상 쌓아 출고해 보세요.</div>';return}
  entries.sort((a,b)=>(a.name||'').localeCompare(b.name||'','ko'));
  for(const d of entries){
    const div=document.createElement('div');div.className='bookEntry';
    const layers=(d.layers||[]).map(l=>INGREDIENTS[l.id]?.label||l.id).join(' · ');
    div.innerHTML='<b>'+escapeHtml(d.name||'이름 없는 샌드위치')+'</b><small>'+escapeHtml(layers)+'</small><em>발견 가격 '+money(d.value||0)+'</em>';
    ui.bookList.appendChild(div);
  }
}
function escapeHtml(v){return String(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}

document.querySelectorAll('.tool').forEach(b=>b.addEventListener('click',()=>setTool(b.dataset.tool)));
document.querySelectorAll('.sizeCard').forEach(b=>b.addEventListener('click',()=>selectMapSize(b.dataset.size)));
ui.undoBtn.addEventListener('click',undo);ui.redoBtn.addEventListener('click',redo);ui.saveBtn.addEventListener('click',()=>saveGame(true));
ui.moveBtn.addEventListener('click',()=>setTool(selectedTool==='move'?'belt':'move'));
ui.rotateBtn.addEventListener('click',rotateTool);ui.analysisBtn.addEventListener('click',toggleAnalysis);ui.bookBtn.addEventListener('click',openBook);ui.speedBtn.addEventListener('click',cycleSpeed);ui.pauseBtn.addEventListener('click',togglePause);
ui.helpBtn.addEventListener('click',()=>{ui.help.classList.remove('hidden');paused=true;ui.pauseBtn.textContent='▶'});
ui.closeHelpBtn.addEventListener('click',()=>{ui.help.classList.add('hidden');paused=false;ui.pauseBtn.textContent='Ⅱ'});
ui.closeBookBtn.addEventListener('click',closeBook);
ui.collapseOrders.addEventListener('click',()=>{ui.orders.classList.toggle('collapsed');ui.collapseOrders.textContent=ui.orders.classList.contains('collapsed')?'›':'‹'});
document.querySelectorAll('.slot').forEach(b=>b.addEventListener('click',()=>selectSlot(b.dataset.slot)));
ui.tutorialBtn.addEventListener('click',startSmallTutorial);
ui.tutorialNext.addEventListener('click',nextTutorial);ui.tutorialSkip.addEventListener('click',finishTutorial);
ui.newBtn.addEventListener('click',()=>{
  if(hasSave()&&!confirm('공장 '+activeSlot+'의 저장 내용을 새 공장으로 덮어쓸까요?'))return;
  startGame(false,false);
});
ui.continueBtn.addEventListener('click',()=>{if(hasSave())startGame(true,false)});
ui.discoverSave.addEventListener('click',saveDiscovery);ui.discoverName.addEventListener('keydown',e=>{if(e.key==='Enter')saveDiscovery()});
ui.challengeBtn.addEventListener('click',()=>showToast('선택 도전은 공장 운영을 막지 않아요.',1600));
addEventListener('keydown',e=>{
  if(e.target?.tagName==='INPUT')return;
  if(e.code==='Space'){e.preventDefault();togglePause()}
  if(e.key==='r'||e.key==='R')rotateTool();
  if(e.key==='m'||e.key==='M')setTool(selectedTool==='move'?'belt':'move');
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();undo()}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();redo()}
  if(e.key==='1')setTool('belt');if(e.key==='2')setTool('assembler');if(e.key==='0')setTool('erase');
});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&running)saveGame(false)});
addEventListener('beforeunload',()=>{if(running)saveGame(false)});
window.KidscadeGame?.registerPauseHandlers?.({pause:()=>{paused=true;ui.pauseBtn.textContent='▶'},resume:()=>{paused=false;ui.pauseBtn.textContent='Ⅱ'}});

initThree();pickOrders();refreshSizeButtons();refreshSlots();syncUndo();updateHud();requestAnimationFrame(frame);

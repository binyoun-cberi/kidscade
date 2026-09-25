import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const $=id=>document.getElementById(id);
const ui={
  shipped:$('shipped'),cash:$('cash'),perMinute:$('perMinute'),waste:$('waste'),
  orders:$('orders'),orderList:$('orderList'),collapseOrders:$('collapseOrders'),
  challengeBtn:$('challengeBtn'),challengeTitle:$('challengeTitle'),challengeProgress:$('challengeProgress'),
  analysisBtn:$('analysisBtn'),bookBtn:$('bookBtn'),pauseBtn:$('pauseBtn'),speedBtn:$('speedBtn'),rotateBtn:$('rotateBtn'),helpBtn:$('helpBtn'),
  analysisLegend:$('analysisLegend'),toast:$('toast'),toolbar:$('toolbar'),
  undoBtn:$('undoBtn'),redoBtn:$('redoBtn'),saveBtn:$('saveBtn'),
  intro:$('intro'),newBtn:$('newBtn'),continueBtn:$('continueBtn'),
  help:$('help'),closeHelpBtn:$('closeHelpBtn'),book:$('book'),bookList:$('bookList'),closeBookBtn:$('closeBookBtn'),
  discover:$('discover'),discoverLayers:$('discoverLayers'),discoverText:$('discoverText'),discoverName:$('discoverName'),discoverSave:$('discoverSave')
};

const DIRS=[{x:1,y:0},{x:0,y:1},{x:-1,y:0},{x:0,y:-1}];
const DIR_ANGLE=[-Math.PI/2,Math.PI,Math.PI/2,0];
const COLS=64,ROWS=40,CELL=1.18,MAX_ITEMS=360,TICK=1/20;
const SUPPLIERS=[
  {x:1,y:4,id:'bread',label:'식빵',color:0xeac486},
  {x:1,y:9,id:'cheese',label:'치즈',color:0xf7d94c},
  {x:1,y:14,id:'ham',label:'햄',color:0xd78673},
  {x:1,y:19,id:'tomato',label:'토마토',color:0xe5544d},
  {x:1,y:24,id:'lettuce',label:'양상추',color:0x74bd69},
  {x:1,y:29,id:'egg',label:'달걀',color:0xf4efe0},
  {x:1,y:34,id:'bacon_raw',label:'베이컨',color:0xd47b73}
];
const SHIPS=[{x:62,y:9},{x:62,y:19},{x:62,y:29}];
const FIXED=new Set([...SUPPLIERS,...SHIPS].map(p=>key(p.x,p.y)));
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
const SAVE_BASE='kidscade_game_v1:high_factory_tycoon:slot';
const MODEL_KEYS=Object.keys(INGREDIENTS);

let scene,camera,renderer,raycaster,floor,loader;
let staticGroup,itemGroup,effectGroup,fixedGroup;
let beltMesh,arrowMesh;
let models=new Map();
let blueprint=new Map(),items=[],effects=[],machineStates=new Map();
let itemSeq=1,spawnClock=0,gameTime=0,orderClock=0,saveClock=0,analysisClock=0;
let running=false,paused=false,speed=1,selectedTool='belt',rotation=0,analysis=false;
let stats={shipped:0,cash:0,waste:0,shipTimes:[],discoveries:{}};
let orders=[],challengeIndex=0;
let undoStack=[],redoStack=[];
let pendingDiscovery=null,toastTimer=0,activeSlot=1;
let cameraTarget=new THREE.Vector3(0,0,0),viewSize=34;
let activePointers=new Map(),dragBuild=null,panGesture=null,lastFrame=performance.now(),acc=0;
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

  const floorMat=new THREE.MeshStandardMaterial({color:0x27323a,roughness:.92,metalness:.02});
  floor=new THREE.Mesh(new THREE.PlaneGeometry(COLS*CELL,ROWS*CELL),floorMat);
  floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
  const grid=new THREE.GridHelper(Math.max(COLS,ROWS)*CELL,Math.max(COLS,ROWS),0x51616b,0x36434a);
  grid.position.y=.012;scene.add(grid);

  staticGroup=new THREE.Group();itemGroup=new THREE.Group();effectGroup=new THREE.Group();fixedGroup=new THREE.Group();
  scene.add(staticGroup,itemGroup,effectGroup,fixedGroup);
  raycaster=new THREE.Raycaster();loader=new GLTFLoader();
  buildFixedVisuals();resize();
  addEventListener('resize',resize,{passive:true});
  Promise.all(MODEL_KEYS.map(loadIngredientModel)).then(()=>{buildFixedVisuals();refreshAllItemViews()});
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
function rebuildFactoryVisuals(){
  staticGroup.clear();
  const belts=[];
  for(const [k,c] of blueprint)if(['belt','splitter','merger','cross'].includes(c.type)){const [x,y]=k.split(',').map(Number);belts.push({x,y,c})}
  const beltGeo=new THREE.BoxGeometry(CELL*.9,.12,CELL*.78);
  const beltMat=new THREE.MeshStandardMaterial({color:0x69747a,roughness:.72,metalness:.16});
  beltMesh=new THREE.InstancedMesh(beltGeo,beltMat,Math.max(1,belts.length));beltMesh.castShadow=true;beltMesh.receiveShadow=true;
  beltMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const arrowGeo=new THREE.ConeGeometry(.13,.36,3);
  const arrowMat=new THREE.MeshStandardMaterial({color:0xffc65e,roughness:.7,emissive:0x3c2505});
  arrowMesh=new THREE.InstancedMesh(arrowGeo,arrowMat,Math.max(1,belts.length));arrowMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const dummy=new THREE.Object3D(),color=new THREE.Color();
  belts.forEach((b,i)=>{
    const p=cellWorld(b.x,b.y);dummy.position.set(p.x,.09,p.z);dummy.rotation.set(0,-b.c.dir*Math.PI/2,0);dummy.updateMatrix();beltMesh.setMatrixAt(i,dummy.matrix);
    if(analysis){
      const h=cellHeat.get(key(b.x,b.y))||0;color.setHex(h>1.6?0xff6767:h>.55?0xffd166:0x74df9d);beltMesh.setColorAt(i,color);
    }
    dummy.position.set(p.x,.22,p.z);dummy.rotation.set(Math.PI/2,0,DIR_ANGLE[b.c.dir]);dummy.updateMatrix();arrowMesh.setMatrixAt(i,dummy.matrix);
  });
  if(analysis&&beltMesh.instanceColor)beltMesh.instanceColor.needsUpdate=true;
  staticGroup.add(beltMesh,arrowMesh);

  for(const [k,c] of blueprint){
    if(!MACHINE[c.type])continue;
    const [x,y]=k.split(',').map(Number),p=cellWorld(x,y),g=new THREE.Group();g.position.copy(p);g.rotation.y=-c.dir*Math.PI/2;
    const def=MACHINE[c.type];
    const base=new THREE.Mesh(new THREE.BoxGeometry(CELL*.88,.48,CELL*.88),new THREE.MeshStandardMaterial({color:def.color,roughness:.68,metalness:.08}));
    base.position.y=.25;base.castShadow=true;base.receiveShadow=true;g.add(base);
    const topGeo=c.type==='pan'?new THREE.CylinderGeometry(.34,.4,.13,16):c.type==='assembler'?new THREE.CylinderGeometry(.18,.28,.48,8):new THREE.BoxGeometry(.48,.24,.55);
    const top=new THREE.Mesh(topGeo,new THREE.MeshStandardMaterial({color:0x222b31,roughness:.55,metalness:.22}));
    top.position.y=.58;g.add(top);
    const indicator=new THREE.Mesh(new THREE.ConeGeometry(.12,.32,3),new THREE.MeshStandardMaterial({color:0xffd174,emissive:0x3b2508}));
    indicator.rotation.z=-Math.PI/2;indicator.position.set(.34,.73,0);g.add(indicator);
    staticGroup.add(g);
  }
}
function refreshAllItemViews(){for(const it of items){if(it.view)itemGroup.remove(it.view);it.view=makePayloadView(it.payload);itemGroup.add(it.view)}}

function resize(){
  if(!renderer||!camera)return;
  const w=innerWidth,h=innerHeight,aspect=w/Math.max(1,h);
  renderer.setSize(w,h,false);
  camera.left=-viewSize*aspect/2;camera.right=viewSize*aspect/2;camera.top=viewSize/2;camera.bottom=-viewSize/2;camera.updateProjectionMatrix();
  updateCamera();
}
function updateCamera(){
  camera.position.set(cameraTarget.x+viewSize*.72,viewSize*.92,cameraTarget.z+viewSize*.82);
  camera.lookAt(cameraTarget.x,0,cameraTarget.z);
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
  if(ev.pointerType==='touch'&&activePointers.size>=2){beginTouchPan();dragBuild=null;return}
  if(ev.button===1||ev.button===2){beginMousePan(ev);return}
  if(ev.button!==0)return;
  const c=screenToCell(ev.clientX,ev.clientY);if(!c)return;
  if(selectedTool==='belt'||selectedTool==='erase'){
    pushUndo();dragBuild={tool:selectedTool,last:c,changed:false};
    if(selectedTool==='erase')dragBuild.changed=setCell(c.x,c.y,'erase')||dragBuild.changed;
    else if(!FIXED.has(key(c.x,c.y))){const old=blueprint.get(key(c.x,c.y));if(!old){blueprint.set(key(c.x,c.y),{type:'belt',dir:rotation,toggle:false});dragBuild.changed=true}}
    rebuildFactoryVisuals();
  }else{
    pushUndo();
    const changed=setCell(c.x,c.y,selectedTool,rotation);
    if(changed){rebuildFactoryVisuals();saveGame(false);sound('click')}
    else undoStack.pop();
    syncUndo();
  }
}
function pointerMove(ev){
  const p=activePointers.get(ev.pointerId);if(p){p.x=ev.clientX;p.y=ev.clientY}
  if(panGesture){updatePanGesture();return}
  if(!dragBuild)return;
  const c=screenToCell(ev.clientX,ev.clientY);if(!c||!dragBuild.last)return;
  if(c.x===dragBuild.last.x&&c.y===dragBuild.last.y)return;
  const path=manhattanCells(dragBuild.last,c);let prev=dragBuild.last;
  for(const step of path){
    if(dragBuild.tool==='erase')dragBuild.changed=setCell(step.x,step.y,'erase')||dragBuild.changed;
    else{addBeltStep(prev,step);dragBuild.changed=true}
    prev=step;
  }
  dragBuild.last=c;rebuildFactoryVisuals();
}
function pointerUp(ev){
  activePointers.delete(ev.pointerId);
  if(panGesture){if(activePointers.size<2)panGesture=null;return}
  if(dragBuild){
    if(dragBuild.changed){saveGame(false);sound('click')}else{undoStack.pop();syncUndo()}
    dragBuild=null;
  }
}
function beginTouchPan(){
  const pts=[...activePointers.values()].slice(0,2);
  if(pts.length<2)return;
  panGesture={mode:'touch',cx:(pts[0].x+pts[1].x)/2,cy:(pts[0].y+pts[1].y)/2,dist:Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y),target:cameraTarget.clone(),view:viewSize};
}
function beginMousePan(ev){panGesture={mode:'mouse',cx:ev.clientX,cy:ev.clientY,target:cameraTarget.clone(),view:viewSize,pointerId:ev.pointerId}}
function updatePanGesture(){
  if(!panGesture)return;
  if(panGesture.mode==='touch'){
    const pts=[...activePointers.values()].slice(0,2);if(pts.length<2)return;
    const cx=(pts[0].x+pts[1].x)/2,cy=(pts[0].y+pts[1].y)/2,dist=Math.max(20,Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y));
    const scale=panGesture.view/Math.max(1,innerHeight);
    cameraTarget.x=panGesture.target.x-(cx-panGesture.cx)*scale*1.35;
    cameraTarget.z=panGesture.target.z-(cy-panGesture.cy)*scale*1.35;
    viewSize=clamp(panGesture.view*(panGesture.dist/dist),18,62);resize();
  }else{
    const p=activePointers.get(panGesture.pointerId);if(!p)return;
    const scale=viewSize/Math.max(1,innerHeight);
    cameraTarget.x=panGesture.target.x-(p.x-panGesture.cx)*scale*1.3;
    cameraTarget.z=panGesture.target.z-(p.y-panGesture.cy)*scale*1.3;updateCamera();
  }
}
function wheel(ev){ev.preventDefault();viewSize=clamp(viewSize*(ev.deltaY>0?1.1:.9),18,62);resize()}
rendererEventsSetup();
function rendererEventsSetup(){
  const c=$('game');
  c.addEventListener('pointerdown',pointerDown);
  c.addEventListener('pointermove',pointerMove);
  c.addEventListener('pointerup',pointerUp);
  c.addEventListener('pointercancel',pointerUp);
  c.addEventListener('wheel',wheel,{passive:false});
  c.addEventListener('contextmenu',e=>e.preventDefault());
}

function spawnItem(x,y,dir,payload,fromMachine=false){
  if(items.length>=MAX_ITEMS)return null;
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
    if(items.length>=MAX_ITEMS)break;
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
  const value=sellValue(it.payload);stats.shipped++;stats.cash+=value;stats.shipTimes.push(gameTime);stats.shipTimes=stats.shipTimes.filter(t=>gameTime-t<=60);
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
  pendingDiscovery=null;ui.discover.classList.add('hidden');paused=false;ui.pauseBtn.textContent='Ⅱ';sound('ok');saveGame(false);showToast('도감에 저장했어요: '+name,1800);
}
function tickOrders(dt){orderClock+=dt;if(orderClock>=180){orderClock=0;pickOrders();showToast('인기 메뉴가 바뀌었어요!',1800)}}
function pickOrders(){
  const shuffled=[...RECIPES].sort(()=>Math.random()-.5);orders=shuffled.slice(0,3);renderOrders();
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
  if(p>=c.target){showToast('도전 성공! '+c.name,2200);challengeIndex=(challengeIndex+1)%CHALLENGES.length;CHALLENGES[challengeIndex]?.reset?.();setTimeout(checkChallenge,700)}
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
  ui.shipped.textContent=stats.shipped.toLocaleString('ko-KR');ui.cash.textContent=money(stats.cash);ui.perMinute.textContent=stats.shipTimes.length.toFixed(1);ui.waste.textContent=stats.waste.toLocaleString('ko-KR');checkChallenge();
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

function saveKey(slot=activeSlot){return SAVE_BASE+slot}
function serialize(){
  return {version:1,blueprint:snapshotBlueprint(),stats,gameTime,challengeIndex,camera:{x:cameraTarget.x,z:cameraTarget.z,view:viewSize},savedAt:Date.now()};
}
function saveGame(notify=true){
  try{window.KidscadeStorage?.setJson(saveKey(),serialize());refreshSlots();if(notify){sound('ok');showToast('공장 '+activeSlot+'을 저장했어요.')}}catch(_){if(notify)showToast('저장하지 못했어요.')}
}
function hasSave(slot=activeSlot){try{return !!window.KidscadeStorage?.getJson(saveKey(slot),null)}catch(_){return false}}
function loadGame(){
  try{
    const s=window.KidscadeStorage?.getJson(saveKey(),null);if(!s)return false;
    blueprint=new Map((s.blueprint||[]).map(([k,v])=>[k,{...v}]));
    stats=Object.assign({shipped:0,cash:0,waste:0,shipTimes:[],discoveries:{}},s.stats||{});stats.shipTimes=[];
    gameTime=Number(s.gameTime)||0;challengeIndex=Number(s.challengeIndex)||0;
    cameraTarget.set(Number(s.camera?.x)||0,0,Number(s.camera?.z)||0);viewSize=clamp(Number(s.camera?.view)||34,18,62);
    items.forEach(removeItemView);items=[];machineStates.clear();rebuildFactoryVisuals();resize();return true;
  }catch(_){return false}
}
function newGame(){
  blueprint.clear();items.forEach(removeItemView);items=[];machineStates.clear();effects=[];stats={shipped:0,cash:0,waste:0,shipTimes:[],discoveries:{}};gameTime=0;challengeIndex=0;undoStack=[];redoStack=[];cameraTarget.set(0,0,0);viewSize=34;pickOrders();rebuildFactoryVisuals();resize();syncUndo();CHALLENGES[0].reset?.();saveGame(false);
}
function startGame(load){
  if(load&&!loadGame())newGame();else if(!load)newGame();
  ui.intro.classList.add('hidden');running=true;paused=false;ui.pauseBtn.textContent='Ⅱ';window.KidscadeGame?.start?.();updateHud();showToast('공장 '+activeSlot+' · 재료 공급기가 움직이기 시작했어요.',1700);
}
function togglePause(){
  paused=!paused;ui.pauseBtn.textContent=paused?'▶':'Ⅱ';
  if(paused)window.KidscadeGame?.pause?.();else window.KidscadeGame?.resume?.();
}
function setTool(t){
  selectedTool=t;document.querySelectorAll('.tool').forEach(b=>b.classList.toggle('active',b.dataset.tool===t));sound('click');
}
function rotateTool(){rotation=(rotation+1)%4;sound('click');showToast(['오른쪽','아래','왼쪽','위'][rotation]+' 방향')}
function toggleAnalysis(){analysis=!analysis;ui.analysisBtn.classList.toggle('active',analysis);ui.analysisLegend.classList.toggle('hidden',!analysis);rebuildFactoryVisuals();showToast(analysis?'막힌 흐름을 색으로 표시해요.':'분석 보기를 껐어요.')}
function cycleSpeed(){speed=speed===1?2:speed===2?4:1;ui.speedBtn.textContent='×'+speed;sound('click')}
function setContinueVisibility(){ui.continueBtn.disabled=!hasSave();ui.continueBtn.textContent=hasSave()?'공장 '+activeSlot+' 이어하기':'공장 '+activeSlot+' · 저장 없음'}
function refreshSlots(){
  document.querySelectorAll('.slot').forEach(b=>{
    const n=Number(b.dataset.slot);b.classList.toggle('active',n===activeSlot);b.classList.toggle('saved',hasSave(n));
  });
  setContinueVisibility();
}
function selectSlot(n){activeSlot=clamp(Number(n)||1,1,3);refreshSlots();sound('click')}
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
ui.undoBtn.addEventListener('click',undo);ui.redoBtn.addEventListener('click',redo);ui.saveBtn.addEventListener('click',()=>saveGame(true));
ui.rotateBtn.addEventListener('click',rotateTool);ui.analysisBtn.addEventListener('click',toggleAnalysis);ui.bookBtn.addEventListener('click',openBook);ui.speedBtn.addEventListener('click',cycleSpeed);ui.pauseBtn.addEventListener('click',togglePause);
ui.helpBtn.addEventListener('click',()=>{ui.help.classList.remove('hidden');paused=true;ui.pauseBtn.textContent='▶'});
ui.closeHelpBtn.addEventListener('click',()=>{ui.help.classList.add('hidden');paused=false;ui.pauseBtn.textContent='Ⅱ'});
ui.closeBookBtn.addEventListener('click',closeBook);
ui.collapseOrders.addEventListener('click',()=>{ui.orders.classList.toggle('collapsed');ui.collapseOrders.textContent=ui.orders.classList.contains('collapsed')?'›':'‹'});
document.querySelectorAll('.slot').forEach(b=>b.addEventListener('click',()=>selectSlot(b.dataset.slot)));
ui.newBtn.addEventListener('click',()=>{
  if(hasSave()&&!confirm('공장 '+activeSlot+'의 저장 내용을 새 공장으로 덮어쓸까요?'))return;
  startGame(false);
});
ui.continueBtn.addEventListener('click',()=>{if(hasSave())startGame(true)});
ui.discoverSave.addEventListener('click',saveDiscovery);ui.discoverName.addEventListener('keydown',e=>{if(e.key==='Enter')saveDiscovery()});
ui.challengeBtn.addEventListener('click',()=>showToast('선택 도전은 공장 운영을 막지 않아요.',1600));
addEventListener('keydown',e=>{
  if(e.target?.tagName==='INPUT')return;
  if(e.code==='Space'){e.preventDefault();togglePause()}
  if(e.key==='r'||e.key==='R')rotateTool();
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();undo()}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();redo()}
  if(e.key==='1')setTool('belt');if(e.key==='2')setTool('assembler');if(e.key==='0')setTool('erase');
});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&running)saveGame(false)});
addEventListener('beforeunload',()=>{if(running)saveGame(false)});
window.KidscadeGame?.registerPauseHandlers?.({pause:()=>{paused=true;ui.pauseBtn.textContent='▶'},resume:()=>{paused=false;ui.pauseBtn.textContent='Ⅱ'}});

initThree();pickOrders();refreshSlots();syncUndo();updateHud();requestAnimationFrame(frame);

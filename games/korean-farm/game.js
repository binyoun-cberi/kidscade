import * as THREE from 'three';
import {loadModel,loadFarmCropStage,assetReport,FARM_MODELS} from './assets.js';
import {createFarmerAnimator} from './animation/farmer-animator.js';
import {FieldEffects} from './animation/field-effects.js';
import {buildSolnaeriVillage} from './rendering/village-scene.js';
import {VILLAGE_COLLIDERS} from './rendering/village-layout.mjs';
import {createRicePlantingGrid} from './rendering/rice-planting-grid.js';
import {createFieldWorkGrid} from './rendering/field-work-grid.js';
import {createFieldStatusMarkers} from './rendering/field-status-markers.js';
import {createHarvestCargo} from './rendering/harvest-cargo.js';
import {createVillagePeople} from './rendering/village-people.js';
import {createFarmWeather} from './rendering/farm-weather.js';
import {greetNeighbor} from './farming/village-people.mjs';
import {festivalActivity,playFestivalActivity} from './farming/festival-activities.mjs';
import {villageRoutine,villageClock} from './rendering/village-routines.mjs';
import {fieldStatusIndicators} from './farming/field-status.mjs';
import {nextFarmObjective} from './farming/farm-objectives.mjs';
import {WORK_STRIPS,PATCH_ACTIONS,workStripPosition,nextWorkStrip,completedWorkStrips} from './farming/field-work.mjs';
import {TRANSPLANT_COUNT,seedlingCount,seedlingPosition,seedlingAtPoint,nextEmptySeedling,canPlantSeedling,plantSeedling} from './farming/rice-transplant.mjs';
import {createFarmActionFlow,actionContactPoint,actionApproachPoint} from './interactions/action-flow.mjs';
import {sampleStroke,uniqueStrokeTargets} from './interactions/work-gesture.mjs';
import {cameraRelativeInput,farmerHeading,rotateToward,walkPlayer,shouldTurnBeforeWalk,nearestWalkablePoint,planNavigationRoute,LOOK_SPEED} from './interactions/navigation.mjs';
import {FIELD_DEFS,plotById,distanceToPlot} from './world.mjs';
import {createFarmState,restoreFarmState,CROPS,FARM_UPGRADES,purchaseFarmUpgrade,calendar,weatherForDay,fieldById,visualStage,fieldCondition,fieldCareAdvice,applyFarmAction,canApplyFarmAction,setSluiceOpening,applyFarmStrip,canWorkFieldStrip,scoopCompostBatch,advanceFarmDay,restUntilFarmNeedsAttention,basketCount,cargoCapacity,toggleFarmCart,loadHarvestBasket,unloadHarvestBasket,sellBasketProduce,buyFarmSupply,currentDeliveryOrder,fulfillBasketDeliveryOrder,seasonalFestival,fulfillSeasonalFestival,tomorrowForecast} from './farming/farm-sim.mjs';

const $=id=>document.getElementById(id);
const SAVE_KEY=window.KidscadeGame?.storageKey?.('korean_farm','farm')||'kidscade_game_v1:korean_farm:farm';
const bounds=21.7;
const state=loadSave();
let scene,renderer,camera,raycaster,ground,farmer,farmerAvatar,farmerAnimator,fieldEffects,villageScene=null,villagePeople=null,harvestCargo=null,farmWeather=null;
let last=0,raf=0,paused=false,disposed=false,loading=true,noticeTimer=0;
let camTarget=new THREE.Vector3(state.player.x,0,state.player.z);
let viewAngle=state.camera.angle,farmerFacingTarget=0;
let moveGoal=null,moveRoute=[],navigationStall=0;
const keys=new Set();
const joystick={x:0,y:0,id:null};
const pointers=new Map();
let pinchDistance=0,downPosition=null,dragPath=[],gestureQueue=[],gestureTimer=0,gateDrag=null;
const plotMeshes=new Map(),plotHits=[],plantingHits=[],fieldWorkHits=[],gateHits=[],sluices=new Map(),plotOrigins=new Map(),visited=new Set(state.seenPlots||[]);
const obstacles=VILLAGE_COLLIDERS;
const models=new Map();
const farmFlow=createFarmActionFlow();
let plantingMode=false,selectedSeedling=0;
let fieldWorkMode=false,workAction=null,selectedStrip=0,workFinished=false;
const worldHits=[],worldStations=new Map();
let pendingStation=null,worldAction=null,marketAccess=false;
let restMode='tomorrow';
const gateTargets=new Map();
const actions={till:'괭이질',plant:'심기',water:'물주기',gate:'물꼬',weed:'김매기',fertilize:'거름주기',harvest:'수확'};

function clearMovement(){moveGoal=null;moveRoute=[];navigationStall=0}
function clearGesture(){gestureQueue=[];clearTimeout(gestureTimer);gestureTimer=0}
function queueMovement(destination){
  const route=planNavigationRoute(state.player,destination,obstacles,bounds);
  if(!route){
    clearMovement();pendingStation=null;farmFlow.cancelApproach();
    toast('이동할 수 있는 길을 찾지 못했어요. 다른 곳에서 다시 시도해 주세요.');
    return false;
  }
  clearMovement();moveGoal=route.shift();moveRoute=route;
  return true;
}

const formatWon=n=>Math.max(0,Math.round(n)).toLocaleString('ko-KR')+'원';
function refreshCargoVisual(){
  harvestCargo?.setStorage(state.inventory);
  harvestCargo?.setCart(state.transport?.cartAttached,state.upgrades?.cart);
  harvestCargo?.setCarrying(state.cargo);
  harvestCargo?.setCompost(state.inventory.fertilizer);
  if($('cargoBadge')){
    const count=basketCount(state),cart=state.transport?.cartAttached;
    $('cargoBadge').classList.toggle('hidden',count===0&&!cart);
    $('cargoBadge').textContent=(cart?'🛒 손수레':'🧺 바구니')+' '+count+' / '+cargoCapacity(state);
  }
}

function loadSave(){
  try{
    const raw=window.KidscadeStorage?.getJson?.(SAVE_KEY,null)??JSON.parse(localStorage.getItem(SAVE_KEY)||'null');
    return restoreFarmState(raw);
  }catch{return createFarmState()}
}
function save(silent=false){
  try{
    state.player.x=+state.player.x.toFixed(3);state.player.z=+state.player.z.toFixed(3);
    state.seenPlots=[...visited];
    const ok=window.KidscadeStorage?.setJson?.(SAVE_KEY,state)??(localStorage.setItem(SAVE_KEY,JSON.stringify(state)),true);
    if(!silent)toast(ok?'농장 탐방 기록을 저장했어요.':'이 브라우저에서는 저장할 수 없어요.');
    return ok;
  }catch{if(!silent)toast('저장 공간을 확인해 주세요.');return false}
}
function toast(message){
  const el=$('notification');el.textContent=message;el.classList.add('show');clearTimeout(noticeTimer);
  noticeTimer=setTimeout(()=>el.classList.remove('show'),3000);
}
function rectMesh(w,h,d,color,opacity=1){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),
    new THREE.MeshStandardMaterial({color,roughness:.94,transparent:opacity<1,opacity,depthWrite:opacity===1}));
  m.receiveShadow=true;return m;
}
function addRect(w,h,d,color,x,y,z,opacity=1,parent=scene){
  const m=rectMesh(w,h,d,color,opacity);m.position.set(x,y,z);parent.add(m);return m;
}
function addDisk(radius,color,x,y,z){
  const m=new THREE.Mesh(new THREE.CircleGeometry(radius,16),
    new THREE.MeshBasicMaterial({color,transparent:true,opacity:.7,depthWrite:false}));
  m.rotation.x=-Math.PI/2;m.position.set(x,y,z);scene.add(m);return m;
}
function init3D(){
  renderer=new THREE.WebGLRenderer({canvas:$('farm'),antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.06;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  scene=new THREE.Scene();scene.background=new THREE.Color(0xbedcd5);
  scene.fog=new THREE.Fog(0xbedcd5,46,98);
  camera=new THREE.OrthographicCamera(-12,12,8,-8,.1,160);
  raycaster=new THREE.Raycaster();
  scene.add(new THREE.HemisphereLight(0xfff5e2,0x6c9879,1.25));
  const sun=new THREE.DirectionalLight(0xfff0c9,1.65);sun.position.set(-14,26,-10);
  sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
  sun.shadow.camera.left=-29;sun.shadow.camera.right=29;sun.shadow.camera.top=29;sun.shadow.camera.bottom=-29;
  sun.shadow.bias=-.00025;scene.add(sun);
  farmWeather=createFarmWeather(scene,sun);farmWeather.setWeather(state.weather);
  addRect(48,.28,48,0x8fba74,0,-.14,0);
  // Countryside lane, stream and dikes. Thin mesh overlays keep selection reliable.
  addRect(47,.04,3.15,0xc5ad85,0,.045,10.3);
  addRect(4.4,.05,22,0xcbb387,0,.05,-2.2);
  addRect(4,.05,18,0xcab388,17.8,.05,7.3);
  addRect(1.65,.065,30,0x6caaaf,-17.5,.10,-3);
  addRect(.24,.16,31,0xb6a77d,-18.45,.13,-3);
  addRect(.24,.16,31,0xb6a77d,-16.55,.13,-3);
  addRect(3.6,.05,2.7,0xad8c62,-17.6,.17,8.5);
  // Farm trail branches.
  addRect(1.25,.04,15,0xd6bb8e,3.5,.08,-3.2);
  addRect(14,.04,1.3,0xd6bb8e,9,.08,4.3);
  addRect(5,.05,2,0xd6bb8e,9,.09,-9.5);
  // Around the paddies: a visible dike and separate water-controlled blocks.
  addRect(11.9,.28,.38,0x9aaf73,-10.75,.13,-7.45);
  addRect(11.9,.28,.38,0x9aaf73,-10.75,.13,1.4);
  addRect(.38,.28,9.25,0x9aaf73,-15.1,.13,-3.1);
  addRect(.38,.28,9.25,0x9aaf73,-6.45,.13,-3.1);
  // The timber gate is now part of the dedicated irrigation-village scene.
  // River and pond extensions add landscape depth without costly simulation.
  addRect(2.9,.05,3.7,0x6eacae,-17.5,.12,13.7);
  addRect(5,.045,3,0x76b4a5,15,.075,15.8);
  for(let i=0;i<6;i++)addRect(3,.16,.26,0xba9871,-17.5,.23,7.5+i*.4);
  buildFields();
  villageScene=buildSolnaeriVillage(scene);
  villagePeople=createVillagePeople(scene);
  villagePeople.setFestival(seasonalFestival(state));
  buildWorldStations();
  farmer=new THREE.Group();farmer.position.set(state.player.x,0,state.player.z);scene.add(farmer);
  farmerAnimator=createFarmerAnimator();
  farmerAnimator.setUpgrades(state.upgrades);
  farmerAvatar=farmerAnimator.root;farmer.add(farmerAvatar);
  harvestCargo=createHarvestCargo(scene,farmer);refreshCargoVisual();
  for(const plot of FIELD_DEFS)harvestCargo.setField(plot,fieldById(state,plot.id));
  fieldEffects=new FieldEffects(scene);
  camera.position.set(16,20,20);resize();
  window.addEventListener('resize',resize);
}
function buildWorldStations(){
  const addStation=(key,label,position,stand,size)=>{
    const target=new THREE.Mesh(new THREE.BoxGeometry(size[0],size[1],size[2]),
      new THREE.MeshBasicMaterial({transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));
    target.position.set(position.x,position.y,position.z);target.userData.worldStation=key;target.userData.label=label;
    scene.add(target);worldHits.push(target);worldStations.set(key,{target,position,stand});
  };
  addStation('market','장터',{x:8.5,y:1.05,z:14},{x:8.5,z:15.25},[2.8,2.1,1.45]);
  // The shopkeeper is a real alternate hit target for the SAME market. A tap
  // on the resident or the sign must work; the character is not just scenery.
  const merchantHit=new THREE.Mesh(new THREE.BoxGeometry(1.3,3,.95),
    new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));
  merchantHit.position.set(9.8,1.5,15.3);
  merchantHit.userData.worldStation='market';merchantHit.userData.label='순옥 아주머니';
  scene.add(merchantHit);worldHits.push(merchantHit);
  addStation('barn','농산물 창고',{x:18,y:1.1,z:-10.4},{x:18,z:-9.5},[2.9,2.1,1.35]);
  addStation('neighbor','영수 할아버지',{x:2.8,y:1.5,z:13.4},{x:2.8,z:12.45},[1.9,3,1.45]);
  addStation('festival','행사 도우미 소담',{x:-1.1,y:1.5,z:15.4},{x:-1.1,z:14.3},[1.75,3,1.2]);
  const mound=new THREE.Group();mound.position.set(4.2,0,-11.35);scene.add(mound);
  for(const [x,y,z,s] of [[-.25,.22,0,.42],[.12,.28,-.06,.48],[.37,.18,.08,.34]]){
    const heap=new THREE.Mesh(new THREE.IcosahedronGeometry(s,1),new THREE.MeshStandardMaterial({color:0x745336,roughness:1}));
    heap.position.set(x,y,z);heap.scale.y=.72;heap.castShadow=true;mound.add(heap);
  }
  addStation('compost','거름 더미',{x:4.2,y:.42,z:-11.35},{x:4.2,z:-10.35},[1.5,1.1,1.25]);
  addRect(1.15,.045,.72,0x8d8067,9.9,.055,-10.02);
  addStation('home','집',{x:9.9,y:1.15,z:-10.82},{x:9.9,z:-10.05},[1.2,1.8,.55]);
}
function requestStation(key){
  const station=worldStations.get(key);if(!station)return;
  if(farmFlow.busy||farmerAnimator?.busy){toast('하던 작업을 마친 뒤 이동해 주세요.');return}
  pendingStation=key;keys.clear();
  refreshCargoVisual();
  if(Math.hypot(state.player.x-station.stand.x,state.player.z-station.stand.z)<.42){clearMovement();arriveAtStation();return}
  if(queueMovement(station.stand))toast(station.target.userData.label+'으로 걸어가요.');
}
function arriveAtStation(){
  const key=pendingStation;pendingStation=null;if(!key)return;
  refreshCargoVisual();
  const station=worldStations.get(key);
  if(station)farmerFacingTarget=farmerHeading(station.position.x-state.player.x,station.position.z-state.player.z);
  if(key==='market'){marketAccess=true;openBag();return}
  if(key==='barn'){openBarn();return}
  if(key==='neighbor'){openNeighbor();return}
  if(key==='festival'){openSeasonFestival();return}
  if(key==='compost'){
    if(state.inventory.fertilizer>=10||state.compostStock<=0){const result=scoopCompostBatch(state);toast(result.message);refreshHud();save(true);return}
    worldAction='scoop';if(!farmerAnimator?.trigger('scoop')){worldAction=null;toast('삽을 사용할 수 없어요.')}
  }else if(key==='home'){
    offerRestChoices();
  }
}
function handleWorldAnimation(feedback){
  if(!worldAction)return;
  if(feedback?.impact===worldAction){
    if(worldAction==='scoop'){const result=scoopCompostBatch(state);toast(result.message);refreshHud();refreshCargoVisual();save(true)}
    else if(worldAction==='sleep')advanceFarmDayAfterRest(restMode);
  }
  if(!feedback?.working)worldAction=null;
}
function buildFields(){
  for(const plot of FIELD_DEFS){
    const rice=plot.kind==='rice';
    const group=new THREE.Group();group.position.set(plot.x,0,plot.z);scene.add(group);
    const bed=addRect(plot.w,.20,plot.d,rice?0x92764f:0x836544,0,.085,0,1,group);
    let waterMesh=null;
    if(rice){
      waterMesh=addRect(plot.w-.18,.035,plot.d-.18,0x6daebf,0,.205,0,.68,group);
      addRect(plot.w+.2,.26,.13,0x8d9f5d,0,.185,-plot.d/2,1,group);
      addRect(plot.w+.2,.26,.13,0x8d9f5d,0,.185,plot.d/2,1,group);
    }else{
      for(let row=-1;row<=1;row++)addRect(plot.w-.35,.09,.5,0x715036,0,.25,row*.95,1,group);
    }
    const target=new THREE.Mesh(new THREE.PlaneGeometry(plot.w,plot.d),new THREE.MeshBasicMaterial({visible:false,side:THREE.DoubleSide}));
    target.rotation.x=-Math.PI/2;target.position.y=.4;target.userData.plotId=plot.id;group.add(target);plotHits.push(target);
    const cropLayer=new THREE.Group();group.add(cropLayer);
    const planting=rice?createRicePlantingGrid(plot):null;
    if(planting){group.add(planting.group);plantingHits.push(...planting.targets)}
    const work=createFieldWorkGrid(plot);group.add(work.group);fieldWorkHits.push(...work.targets);
    const record={group,cropLayer,planting,work,target,plot,bed,waterMesh,stage:null,generation:0};
    record.statusMarkers=createFieldStatusMarkers(plot);scene.add(record.statusMarkers.group);
    if(rice)sluices.set(plot.id,createSluice(plot));
    plotMeshes.set(plot.id,record);
    syncFieldVisual(plot.id,true);
  }
}
function createSluice(plot){
  const position={x:plot.x,z:plot.z+plot.d/2+.28};
  const stand={x:position.x,z:position.z};
  const group=new THREE.Group();group.name='rice-field-sluice-'+plot.id;
  group.position.set(position.x,0,position.z);scene.add(group);
  for(const x of [-.38,.38]){
    const post=rectMesh(.12,.88,.14,0x74563c);post.position.set(x,.46,0);post.castShadow=true;group.add(post);
  }
  const lintel=rectMesh(.96,.13,.16,0x9d774e);lintel.position.set(0,.9,0);group.add(lintel);
  const board=rectMesh(.66,.52,.12,0x8a6744);board.position.set(0,.48,.03);board.castShadow=true;group.add(board);
  const handle=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.52,8),
    new THREE.MeshStandardMaterial({color:0xb69b69,roughness:.86}));
  handle.rotation.z=Math.PI/2;handle.position.set(0,1.04,.08);group.add(handle);
  const stream=rectMesh(.54,.025,.8,0x8ad3d0,.72);
  stream.position.set(0,.245,.38);stream.visible=false;group.add(stream);
  const target=new THREE.Mesh(new THREE.BoxGeometry(1.15,1.35,.95),
    new THREE.MeshBasicMaterial({visible:false,side:THREE.DoubleSide}));
  target.position.set(0,.7,0);target.userData.plotId=plot.id;group.add(target);gateHits.push(target);
  return {group,board,handle,stream,position,stand};
}
function setSluiceVisual(plotId,opening){
  const sluice=sluices.get(plotId);if(!sluice)return;
  const level=typeof opening==='number'?opening:(opening?2:0);
  sluice.board.rotation.x=-.52*level;
  sluice.handle.position.y=1.04+level*.11;
  sluice.stream.visible=level>0;
  sluice.stream.scale.x=level===1?.60:1;
  sluice.board.material.color.setHex(state.upgrades?.channel?(level?0x71a9a7:0x6694a1):(level?0xb79255:0x8a6744));
}
function clearGroup(group){
  // Geometry and textures belong to cached shared assets. Only private, cloned
  // materials from normalise() are disposed when crop stages are replaced.
  const materials=new Set();
  for(const child of [...group.children]){
    child.traverse?.(mesh=>{
      if(!mesh.isMesh)return;
      for(const mat of Array.isArray(mesh.material)?mesh.material:[mesh.material]){
        if(mat)materials.add(mat);
      }
    });
    group.remove(child);
  }
  for(const material of materials)material.dispose?.();
}
function fallbackCrop(kind){
  const root=new THREE.Group(),color=kind==='corn'?0x53983d:0x5d9d52;
  const mesh=new THREE.Mesh(new THREE.ConeGeometry(kind==='corn'?.13:.09,kind==='corn'?1.25:.35,6),
    new THREE.MeshStandardMaterial({color,roughness:1}));
  mesh.position.y=kind==='corn'?.64:.18;root.add(mesh);return root;
}
function syncFieldVisual(id,force=false){
  const field=fieldById(state,id),record=plotMeshes.get(id);
  if(!field||!record)return;
  if(record.waterMesh){
    record.waterMesh.visible=field.waterDepthCm>.1;
    record.waterMesh.position.y=.195+field.waterDepthCm*.014;
    record.waterMesh.material.opacity=Math.min(.85,.18+field.waterDepthCm*.105);
  }
  record.bed.material.color.setHex(field.tilled?0x755b41:0x9b805b);
  if(field.kind!=='rice')record.bed.material.color.setHex(field.moisture<.25?0x957551:0x72543c);
  const plantingAvailable=field.kind==='rice'&&!field.planted&&field.tilled&&state.inventory.seedRice>0;
  record.planting?.refresh(field,plantingMode&&state.selected===id?selectedSeedling:-1,plantingMode&&state.selected===id,plantingAvailable);
  record.work?.refresh(field,fieldWorkMode&&state.selected===id?workAction:null,
    fieldWorkMode&&state.selected===id?selectedStrip:-1);
  record.statusMarkers?.update(fieldStatusIndicators(field));
  harvestCargo?.setField(record.plot,field);
  if(field.kind==='rice')setSluiceVisual(id,field.gateLevel??(field.gateOpen?2:0));
  record.cropLayer.children.forEach(plant=>{
    if(plant.userData.stripIndex!=null)plant.visible=!field.work?.harvested?.[plant.userData.stripIndex];
  });
  const stage=visualStage(field);
  if(force||stage!==record.stage){
    record.stage=stage;
    drawCrops(id);
  }
}
async function drawCrops(id){
  const plot=plotById(id),record=plotMeshes.get(id),field=fieldById(state,id);
  if(!record||!field)return;
  const stage=visualStage(field),generation=++record.generation;
  if(stage===0){clearGroup(record.cropLayer);plotOrigins.set(id,'경작 중인 작물 없음');return}
  const resource=await loadFarmCropStage(plot.kind,stage);
  if(disposed||record.generation!==generation)return;
  clearGroup(record.cropLayer);
  plotOrigins.set(id,resource.object?resource.origin:'임시 모형');
  const crop=resource.object||fallbackCrop(plot.kind);
  const cols=plot.kind==='rice'?5:3,rows=5;
  for(let x=0;x<cols;x++)for(let z=0;z<rows;z++){
    // Static copies are sufficient for the first farming loop; source GLB is cached.
    const model=crop.clone(true);
    model.position.x+=(x-(cols-1)/2)*(plot.w/(cols+.35));
    model.position.z+=(z-(rows-1)/2)*(plot.d/(rows+.35));
    model.position.y+=plot.kind==='rice'?.22:.26;
    if(plot.kind==='rice')model.scale.multiplyScalar(1.12);
    model.rotation.y=(x*3+z)*.36;
    model.userData.stripIndex=z;model.visible=!field.work?.harvested?.[z];
    record.cropLayer.add(model);
  }
  if(state.selected===id&&!$('inspector').classList.contains('hidden'))updateInspector();
}
function updateEnvironmentAnimation(dt,elapsed){
  fieldEffects?.update(dt);
  for(const record of plotMeshes.values()){
    const f=fieldById(state,record.plot.id);
    if(record.waterMesh?.visible){
      record.waterMesh.position.y=.195+f.waterDepthCm*.014+Math.sin(elapsed*2.7+record.plot.x)*.005;
    }
    if(!f?.planted)continue;
    const swaying=Math.min(1,Math.max(.2,f.growth))*.045;
    record.cropLayer.children.forEach((plant,i)=>{
      plant.rotation.z=Math.sin(elapsed*1.8+i*.61+record.plot.x*.2)*swaying;
      plant.rotation.x=Math.sin(elapsed*1.5+i*.43+record.plot.z*.22)*swaying*.7;
    });
  }
}
function fallbackStructure(kind){
  const root=new THREE.Group();
  const body=addRect(kind==='barn'?3:4,kind==='barn'?1.8:2.5,kind==='barn'?2.5:3.3,kind==='barn'?0x9f7455:0xe8d9b9,0,1.25,0,1,root);
  const roof=new THREE.Mesh(new THREE.ConeGeometry(kind==='barn'?2.5:3.1,1.5,4),new THREE.MeshStandardMaterial({color:0x6c6955,roughness:1}));
  roof.rotation.y=Math.PI/4;roof.position.y=3.1;root.add(roof);return root;
}
async function placeModel(key,x,z,turn=0){
  const group=new THREE.Group();group.position.set(x,0,z);group.rotation.y=turn;scene.add(group);
  const model=await loadModel(key);
  if(disposed)return;
  group.add(model||fallbackStructure(key));
  models.set(key+'@'+x+','+z,model?'loaded':'fallback');
}
async function populate(){
  const jobs=[
    placeModel('well',1.6,-13,.4),
    placeModel('hoe',7.1,-9.8,-.8),placeModel('wateringCan',8,-9.8,0)
  ];
  const trees=[[-20,-18],[-15,-19],[-8,-18],[0,-20],[5,-19],[19,-20],[-21,17],[-12,18],[-4,20],[6,19],[19,19],[-21,3]];
  trees.forEach(([x,z],i)=>jobs.push(placeModel(i%4===0?'pine':'tree',x,z,i*.73)));
  [[-3,-14],[-2,-16],[20,1],[18,5]].forEach(([x,z],i)=>jobs.push(placeModel('treeFall',x,z,i*.5)));
  await Promise.allSettled(jobs);
}
function resize(){
  if(!renderer)return;
  const rect=renderer.domElement.getBoundingClientRect();const w=Math.max(1,rect.width),h=Math.max(1,rect.height);
  const aspect=w/h;const v=state.camera.zoom;
  camera.left=-v*aspect/2;camera.right=v*aspect/2;camera.top=v/2;camera.bottom=-v/2;camera.updateProjectionMatrix();
  renderer.setSize(w,h,false);
}
function setZoom(v){state.camera.zoom=Math.max(15,Math.min(36,v));resize()}
function refreshCamera(dt){
  camTarget.lerp(new THREE.Vector3(state.player.x,0,state.player.z),Math.min(1,dt*5));
  viewAngle=rotateToward(viewAngle,state.camera.angle,dt,LOOK_SPEED);
  const a=viewAngle,v=state.camera.zoom;
  // Keep the farmer visible to the left of the inspector on desktop, without
  // changing touch target positions or walking direction.
  const inspecting=!$('inspector').classList.contains('hidden');
  const framing=inspecting&&window.innerWidth>920?2.1:0;
  const aimX=camTarget.x+Math.cos(a)*framing,aimZ=camTarget.z-Math.sin(a)*framing;
  camera.position.set(aimX+Math.sin(a)*v*.83,v*.82,aimZ+Math.cos(a)*v*.83);
  // Raise the player into the unobstructed upper viewport while the phone's
  // bottom inspector sheet is open; retain the normal angle during exploration.
  const targetY=inspecting&&window.innerWidth<=700?-1.65:.5;
  camera.lookAt(aimX,targetY,aimZ);
}
function isBlocked(x,z){
  return obstacles.some(q=>Math.abs(x-q.x)<q.w/2+.45&&Math.abs(z-q.z)<q.d/2+.45);
}
function move(dt,elapsed){
  if(farmerAnimator?.busy||!$('modal').classList.contains('hidden'))return false;
  const manual=cameraRelativeInput(keys,joystick,viewAngle);
  let direction={x:manual.x,z:manual.z},goalDistance=null;
  if(manual.active){
    clearMovement();if(pendingStation){pendingStation=null}
  }else if(moveGoal){
    const dx=moveGoal.x-state.player.x,dz=moveGoal.z-state.player.z;
    goalDistance=Math.hypot(dx,dz);
    if(goalDistance<.34){
      if(moveRoute.length){moveGoal=moveRoute.shift();navigationStall=0}
      else{clearMovement();if(pendingStation)arriveAtStation()}
      return false;
    }
    else direction={x:dx/goalDistance,z:dz/goalDistance};
  }
  // Resolve collisions first, then face the direction the farmer can actually
  // travel. Sliding along a wall can differ from the requested diagonal input.
  const result=walkPlayer(state.player,direction,dt,{goalDistance,bounds,obstacles,
    speedMultiplier:state.transport?.cartAttached ? .78 : 1});
  if(moveGoal&&result.blocked){
    navigationStall+=dt;
    if(navigationStall>1.8){
      clearMovement();pendingStation=null;farmFlow.cancelApproach();
      toast('길이 막혀 이동을 멈췄어요. 다른 곳에서 다시 시도해 주세요.');
      refreshFarmControls();return false;
    }
  }else navigationStall=0;
  const stepX=result.x-state.player.x,stepZ=result.z-state.player.z;
  const travelled=Math.hypot(stepX,stepZ);
  if(travelled>.001){
    farmerFacingTarget=farmerHeading(stepX,stepZ);
    // Wait until the body is nearly aligned; a broad angle makes the farmer
    // visibly sidestep or walk backward during sharp turns.
    if(shouldTurnBeforeWalk(farmer.rotation.y,farmerFacingTarget))return false;
  }
  state.player.x=result.x;state.player.z=result.z;
  if(travelled>.001)harvestCargo?.rollCart(travelled);
  if(marketAccess&&!pendingStation&&Math.hypot(state.player.x-8.5,state.player.z-15.25)>3)marketAccess=false;
  farmer.position.set(state.player.x,0,state.player.z);
  if(!$('inspector').classList.contains('hidden')){
    const plot=plotById(state.selected);
    if(plot)$('approachBtn').classList.toggle('hidden',distanceToPlot(state.player,plot)<=5);
  }
  return result.moving;
}
function refreshWorkStatus(){
  const job=farmFlow.active,root=$('workStatus');
  if(!job){root.classList.add('hidden');return}
  root.classList.remove('hidden');
  const p=job.phase;
  $('workTitle').textContent=p==='approach'?'논밭으로 걸어가는 중…':
    (actions[job.action]||'농사')+(p==='ready'?' 준비 중…':' 하는 중…');
  $('workFill').style.width=(p==='approach'?14:p==='ready'?28:
    30+Math.round((farmerAnimator?.progress||0)*70))+'%';
}
function render(now){
  if(disposed)return;raf=requestAnimationFrame(render);
  const dt=last?Math.min(.20,(now-last)/1000):0;last=now;
  const overlayShown=!$('modal').classList.contains('hidden');
  const moving=!paused&&!loading&&!overlayShown?move(dt,now/1000):false;
  if(!paused&&!loading&&!overlayShown){
    farmer.rotation.y=rotateToward(farmer.rotation.y,farmerFacingTarget,dt||.016);
    const feedback=farmerAnimator?.update(dt||.016,{moving,time:now/1000});
    handleWorldAnimation(feedback);
    const event=farmFlow.tick(dt||.016,state.player,{
      impact:Boolean(feedback?.impact),working:Boolean(feedback?.working)
    });
    if(event)handleFarmFlowEvent(event);
    refreshWorkStatus();
    updateEnvironmentAnimation(dt||.016,now/1000);
    villagePeople?.update(dt||.016,now/1000,state.player,state.minute);
    farmWeather?.update(dt||.016,state.player);
  }
  refreshCamera(dt||.016);renderer.render(scene,camera);
}
function canvasPosition(e){
  const rect=$('farm').getBoundingClientRect();
  return new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);
}
function inspectAt(e){
  raycaster.setFromCamera(canvasPosition(e),camera);
  if(fieldWorkMode){
    const strips=raycaster.intersectObjects(fieldWorkHits,false)
      .filter(h=>h.object.userData.plotId===state.selected);
    if(strips.length){runFieldStrip(strips[0].object.userData.stripIndex);return}
    toast('지금 작업 중인 논밭의 표시된 구역을 선택해 주세요.');return;
  }
  const cells=raycaster.intersectObjects(plantingHits,false);
  if(cells.length){
    const cell=cells[0].object,field=fieldById(state,cell.userData.plotId);
    if(field?.kind==='rice'&&!field.planted&&field.tilled){
      state.selected=cell.userData.plotId;
      if(!plantingMode)enterPlantingMode();
      if(plantingMode)runSeedlingPlant(cell.userData.cellIndex);
      return;
    }
  }
  if(plantingMode){
    // Tiny visual rings are hard to hit on a phone. Let the entire selected
    // paddy accept a tap and resolve it to the nearest of the 25 positions.
    const plot=plotById(state.selected),point=new THREE.Vector3();
    const plantingPlane=new THREE.Plane(new THREE.Vector3(0,1,0),-.29);
    if(plot&&raycaster.ray.intersectPlane(plantingPlane,point)&&
       Math.abs(point.x-plot.x)<=plot.w/2&&Math.abs(point.z-plot.z)<=plot.d/2){
      const index=seedlingAtPoint(plot,point);
      if(index>=0){runSeedlingPlant(index);return}
    }
    toast('모내기 중이에요. 논의 빈자리를 눌러 주세요.');return;
  }
  const stationHit=raycaster.intersectObjects(worldHits,false)[0];
  if(stationHit){requestStation(stationHit.object.userData.worldStation);return}
  const gate=raycaster.intersectObjects(gateHits,false)[0];
  if(gate){activateSluice(gate.object.userData.plotId);return}
  const hits=raycaster.intersectObjects(plotHits,false);
  if(hits.length){
    $('moreTools').classList.add('hidden');$('moreBtn').setAttribute('aria-expanded','false');
    chooseField(hits[0].object.userData.plotId);return;
  }
  $('moreTools').classList.add('hidden');$('moreBtn').setAttribute('aria-expanded','false');
  const p=new THREE.Vector3();
  if(raycaster.ray.intersectPlane(ground,p)){
    const x=Math.max(-bounds,Math.min(bounds,p.x)),z=Math.max(-bounds,Math.min(bounds,p.z));
    if(!isBlocked(x,z)){
      if(farmFlow.cancelApproach())toast('이동하던 농사 작업을 취소했어요.');
      if(!farmFlow.busy)queueMovement({x,z});
    }
  }
}
function harvestSwipeTargets(path){
  if(path.length<2||(!fieldWorkMode&&!plantingMode))return [];
  const plot=plotById(state.selected),field=fieldById(state,state.selected);
  if(!plot||!field)return [];
  const sample=sampleStroke(path),result=[];
  for(const point of sample){
    raycaster.setFromCamera(canvasPosition({clientX:point.x,clientY:point.y}),camera);
    if(fieldWorkMode){
      const hit=raycaster.intersectObjects(fieldWorkHits,false).find(h=>h.object.userData.plotId===plot.id);
      if(hit)result.push(hit.object.userData.stripIndex);
    }else{
      const contact=new THREE.Vector3(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),-.29);
      if(raycaster.ray.intersectPlane(plane,contact)&&
        Math.abs(contact.x-plot.x)<=plot.w/2&&Math.abs(contact.z-plot.z)<=plot.d/2){
        const index=seedlingAtPoint(plot,contact);
        if(index>=0)result.push(index);
      }
    }
  }
  return uniqueStrokeTargets(result).filter(index=>fieldWorkMode?
    canWorkFieldStrip(state,plot.id,workAction,index).ok:
    canPlantSeedling(state,plot.id,index).ok);
}
function continueGesture(){
  if(farmFlow.busy)return;
  while(gestureQueue.length){
    const {mode,index}=gestureQueue.shift(),field=fieldById(state,state.selected),plot=plotById(state.selected);
    if(!field||!plot)return clearGesture();
    const valid=mode==='work'?fieldWorkMode&&canWorkFieldStrip(state,plot.id,workAction,index).ok:
      plantingMode&&canPlantSeedling(state,plot.id,index).ok;
    if(!valid)continue;
    if(mode==='work')runFieldStrip(index);else runSeedlingPlant(index);
    break;
  }
}
function startGesture(indices){
  if(!indices.length)return;
  const mode=fieldWorkMode?'work':'plant';
  // Let a deliberate new swipe replace the previous unexecuted rows.
  gestureQueue=indices.map(index=>({mode,index}));
  if(!farmFlow.busy)continueGesture();
}
function activateSluice(id,desiredLevel=null){
  const plot=plotById(id),sluice=sluices.get(id);
  if(!plot||!sluice)return;
  if(farmFlow.busy){toast('먼저 하던 농사 작업을 마쳐 주세요.');return}
  const current=fieldById(state,id);
  if(desiredLevel!=null&&desiredLevel===(current.gateLevel??(current.gateOpen?2:0))){
    toast('물꼬가 이미 그 위치에 있어요.');setSluiceVisual(id,desiredLevel);return;
  }
  const check=canApplyFarmAction(state,id,'gate');
  if(!check.ok){toast(check.message);return}
  gateTargets.clear();
  if(desiredLevel!=null)gateTargets.set(id,desiredLevel);
  state.selected=id;
  const request=farmFlow.request({action:'gate',plot,position:state.player,goal:sluice.stand});
  if(request.type!=='queued'){toast(request.message||'물꼬를 만질 수 없어요.');return}
  keys.clear();
  if(request.phase==='approach'){
    if(queueMovement(request.goal))toast(plot.label+' 수문으로 걸어가 물길을 조절해요.');
  }else clearMovement();
  refreshFarmControls();
}
function chooseField(id){
  const plot=plotById(id);if(!plot)return;
  clearGesture();
  if(plantingMode)exitPlantingMode();
  if(fieldWorkMode)exitFieldWorkMode();
  if(farmFlow.busy){toast('지금 하던 작업을 먼저 마쳐 주세요.');return}
  state.selected=id;
  if(plot.kind==='rice'){
    visited.add(id);state.seenPlots=[...visited];state.visits=visited.size;
    if(visited.size===4)window.KidscadeGame?.milestone?.('farm_preview_inspected',{value:4,uniqueKey:'four-rice-fields'});
  }
  if(distanceToPlot(state.player,plot)>5)toast('논밭을 선택했어요. 작업 버튼을 누르면 자동으로 걸어가요.');
  updateInspector();$('inspector').classList.remove('hidden');refreshObjective();save(true);
}
function refreshHud(){
  const c=calendar(state.day);
  const weatherLabels={sunny:['☀','맑음'],cloudy:['☁','흐림'],rain:['☂','비'],storm:['☔','강한 비']};
  const w=weatherLabels[state.weather]||weatherLabels.sunny;
  $('weatherIcon').textContent=w[0];
  $('dayLabel').textContent=c.season+' '+c.seasonDay+'일 · '+w[1]+' · '+villageClock(state.minute);
  $('energyLabel').textContent='기운 '+Math.round(state.energy);
  $('moneyLabel').textContent=formatWon(state.money);
  const festival=seasonalFestival(state);
  $('festivalNotice').classList.toggle('hidden',!festival.open||festival.completed);
  $('festivalNotice').textContent='🎏 '+festival.title+' · '+festival.daysLeft+'일 남음';
}
function refreshObjective(){
  const goal=nextFarmObjective(state,visited.size);
  $('objectiveTitle').textContent=goal.title;
  $('progressBar').style.width=(goal.completed/goal.total*100)+'%';
  $('progressText').textContent=goal.intro?'첫 농사 '+goal.completed+' / '+goal.total:'나의 솔내리 농장 · 첫걸음 완료';
  $('objective').classList.toggle('complete',!goal.intro);
  $('objective').querySelector('p').textContent=goal.description;
  $('guideRice').textContent=goal.label+' →';
}
function progressBarRow(label,value,description){
  const div=document.createElement('div');div.className='metric-row';
  const name=document.createElement('div');name.className='metric-label';
  const title=document.createElement('span');title.textContent=label;
  const count=document.createElement('strong');count.textContent=description;
  name.append(title,count);
  const track=document.createElement('div');track.className='metric-track';
  const fill=document.createElement('i');fill.style.width=Math.round(Math.min(1,Math.max(0,value))*100)+'%';
  track.append(fill);div.append(name,track);return div;
}
function updateInspector(){
  const plot=plotById(state.selected),f=fieldById(state,state.selected);
  if(!plot||!f)return;
  $('fieldKind').textContent=f.kind==='rice'?'물대는 논':'마른 밭';
  $('fieldName').textContent=plot.label;
  $('fieldStatus').textContent=farmFlow.busy?
    (farmFlow.active.phase==='approach'?'농부가 걸어가고 있어요':'농사 작업 중이에요'):fieldCondition(f);
  $('fieldInfo').textContent=(f.kind==='rice'&&!f.planted&&seedlingCount(f)>0?
    '모내기 '+seedlingCount(f)+' / 25포기 · 밝은 자리에 모를 꽂아 보세요.':f.planted?
    CROPS[f.crop].name+' · '+Math.round(f.growth*100)+'% 자람'+(f.kind==='rice'?' · 논물 '+f.waterDepthCm.toFixed(1)+'cm'+(f.gateOpen?' (물꼬 열림)':' (물꼬 닫힘)'):''):
    (f.tilled?'땅을 갈아 놓았어요. 다음 작물을 심을 수 있어요.':'수확을 마친 땅이에요. 괭이질로 다시 준비해 보세요.'))+
    (f.kind==='rice'?' · 수문을 위아래로 끌어 물길을 조절해요(닫기·반쯤·활짝). 누르거나 E를 눌러도 작동해요.':'');
  $('fieldLearning').textContent=fieldCareAdvice(f);
  const metrics=$('fieldMetrics');metrics.replaceChildren();
  metrics.append(
    progressBarRow('성장',f.growth,f.planted?Math.round(f.growth*100)+'%':'작물 없음'),
    progressBarRow('흙의 수분',f.moisture,Math.round(f.moisture*100)+'%'),
    progressBarRow('양분',f.nitrogen,Math.round(f.nitrogen*100)+'%'),
    progressBarRow('잡초',f.weeds,Math.round(f.weeds*100)+'%'),
    progressBarRow('건강',f.health,Math.round(f.health*100)+'%')
  );
  for(const btn of $('actionButtons').querySelectorAll('button[data-action]')){
    const a=btn.dataset.action;
    btn.classList.toggle('special',a==='harvest'&&f.planted&&f.growth>=.999);
    btn.hidden=a==='gate'||(a==='water'&&f.kind==='rice');
    btn.disabled=farmFlow.busy||(a==='till'&&f.planted)||(a==='plant'&&(f.planted||!f.tilled||!(f.kind==='rice'&&seedlingCount(f)>0)&&!state.inventory[{rice:'seedRice',carrot:'seedCarrot',corn:'seedCorn'}[f.crop]]))||
      (a==='harvest'&&(!f.planted||f.growth<.999))||(a==='fertilize'&&!state.inventory.fertilizer);
    if(PATCH_ACTIONS.includes(a)){
      const next=nextWorkStrip(f,a);
      btn.disabled=farmFlow.busy||next<0||!canWorkFieldStrip(state,plot.id,a,next).ok;
    }
    if(a==='plant')btn.textContent=f.kind==='rice'?'🌱 모내기 시작':'씨앗 심기';
  }
  const far=distanceToPlot(state.player,plot)>5;
  $('approachBtn').classList.toggle('hidden',!far);
  $('assetOrigin').textContent='3D 모델: '+(plotOrigins.get(plot.id)||'모델을 불러오는 중');
}
function goToSelectedField(){
  const p=plotById(state.selected);if(!p)return;
  if(farmFlow.busy){toast('지금 하던 작업을 마친 뒤 이동할 수 있어요.');return}
  if(queueMovement(actionApproachPoint(p,state.player)))toast(p.label+' 쪽으로 걸어갑니다.');
}
function refreshFarmControls(){
  if(!$('inspector').classList.contains('hidden'))updateInspector();
}
function refreshPlantingHud(){
  const f=fieldById(state,state.selected);
  if(!f||!plantingMode)return;
  const count=seedlingCount(f);
  $('seedlingProgress').textContent='모내기 '+count+' / '+TRANSPLANT_COUNT;
  $('seedlingFill').style.width=(count/TRANSPLANT_COUNT*100)+'%';
  $('seedlingSupplies').textContent='모종 '+state.inventory.seedRice+'묶음 · 기운 '+Math.round(state.energy);
  $('plantingHint').textContent=farmFlow.busy?'농부가 모를 심는 중이에요…':
    count===0?'빈자리를 누르거나 한 줄을 쓸어 모를 심어 보세요.':'다음 빈자리를 누르거나 손가락으로 쓸어 보세요.';
  for(const def of FIELD_DEFS)if(def.kind==='rice'){
    const record=plotMeshes.get(def.id),field=fieldById(state,def.id);
    const active=plantingMode&&def.id===state.selected;
    record?.planting?.refresh(field,active?selectedSeedling:-1,active,
      !field.planted&&field.tilled&&state.inventory.seedRice>0);
  }
}
function enterPlantingMode(){
  const plot=plotById(state.selected),f=fieldById(state,state.selected);
  if(!plot||f?.kind!=='rice')return;
  if(f.planted||!f.tilled){toast('먼저 논의 상태를 확인하고 흙을 준비해 주세요.');return}
  const first=nextEmptySeedling(f);
  if(first<0){toast('모내기를 모두 마쳤어요.');return}
  const result=canPlantSeedling(state,plot.id,first);
  if(!result.ok){toast(result.message);return}
  plantingMode=true;selectedSeedling=first;
  $('inspector').classList.add('hidden');
  $('plantingHud').classList.remove('hidden');
  $('moreTools').classList.add('hidden');
  refreshPlantingHud();
  toast('논의 빈자리를 누르거나 한 줄을 쓸어 모를 심어요.');
}
function exitPlantingMode(){
  clearGesture();
  plantingMode=false;$('plantingHud').classList.add('hidden');
  if(farmFlow.cancelApproach())clearMovement();
  for(const def of FIELD_DEFS)if(def.kind==='rice'){
    const f=fieldById(state,def.id);const rec=plotMeshes.get(def.id);rec?.planting?.refresh(f,-1,false,!f.planted&&f.tilled&&state.inventory.seedRice>0);
  }
  // Finishing 25 seedlings should not strand players on an empty scene:
  // bring back the same field controls for water gates, care and next steps.
  if($('modal').classList.contains('hidden')){
    updateInspector();$('inspector').classList.remove('hidden');
  }
}
function runSeedlingPlant(index=selectedSeedling){
  if(!plantingMode||farmFlow.busy)return;
  const plot=plotById(state.selected),f=fieldById(state,state.selected);
  if(!plot||!f||f.kind!=='rice')return;
  const i=nextEmptySeedling(f,index);
  if(i<0){exitPlantingMode();return}
  const check=canPlantSeedling(state,plot.id,i);
  if(!check.ok){toast(check.message);refreshPlantingHud();return}
  selectedSeedling=i;
  const point=seedlingPosition(plot,i);
  // The farmer steps between seedlings and bends to the marked place.
  const goal={x:point.x,z:point.z+.39};
  const req=farmFlow.request({action:'plant',plot,position:state.player,goal,cellIndex:i});
  if(req.type!=='queued')return;
  keys.clear();if(req.phase==='approach')queueMovement(req.goal);else clearMovement();
  refreshPlantingHud();
}
function refreshFieldWorkHud(){
  if(!fieldWorkMode||!workAction)return;
  const f=fieldById(state,state.selected),plot=plotById(state.selected);
  if(!f||!plot)return;
  const count=workFinished?WORK_STRIPS:completedWorkStrips(f,workAction);
  const labels={till:['괭이질','갈아 놓은 땅'],water:['물주기','물을 준 땅'],
    weed:['김매기','잡초를 뽑은 땅'],fertilize:['퇴비 뿌리기','거름을 준 땅'],harvest:['낫질·수확','거둔 땅']};
  $('workToolName').textContent=labels[workAction][0]+' · '+plot.label;
  $('workStripProgress').textContent=count+' / '+WORK_STRIPS+'구역';
  $('workStripFill').style.width=(count/WORK_STRIPS*100)+'%';
  $('workStripEnergy').textContent='기운 '+Math.round(state.energy);
  const index=nextWorkStrip(f,workAction,selectedStrip);
  const check=index>=0?canWorkFieldStrip(state,plot.id,workAction,index):{ok:false,message:'이 작업을 모두 마쳤어요.'};
  $('workStripHint').textContent=farmFlow.busy?'농부가 '+(labels[workAction][0])+' 하는 중이에요…':
    !check.ok?check.message:'밝은 구역을 누르거나 논밭을 한 줄로 쓸어 작업하세요.';
  plotMeshes.get(plot.id)?.work?.refresh(f,workAction,selectedStrip);
}
function enterFieldWorkMode(action){
  const plot=plotById(state.selected),f=fieldById(state,state.selected);
  if(!plot||!f||!PATCH_ACTIONS.includes(action)||farmFlow.busy)return;
  const first=nextWorkStrip(f,action);
  const check=first>=0?canWorkFieldStrip(state,plot.id,action,first):{ok:false,message:'이 작업은 이미 끝났어요.'};
  if(!check.ok){toast(check.message);return}
  fieldWorkMode=true;workAction=action;selectedStrip=first;workFinished=false;
  $('inspector').classList.add('hidden');$('fieldWorkHud').classList.remove('hidden');
  $('moreTools').classList.add('hidden');refreshFieldWorkHud();
  toast('밝은 구역을 누르거나 한 줄로 쓸어 작업하세요.');
}
function exitFieldWorkMode(){
  clearGesture();
  fieldWorkMode=false;workAction=null;workFinished=false;
  $('fieldWorkHud').classList.add('hidden');
  if(farmFlow.cancelApproach())clearMovement();
  for(const p of FIELD_DEFS)plotMeshes.get(p.id)?.work?.refresh(fieldById(state,p.id));
  if(!$('modal').classList.contains('hidden'))return;
  updateInspector();$('inspector').classList.remove('hidden');
}
function runFieldStrip(index=selectedStrip){
  if(!fieldWorkMode||farmFlow.busy||!workAction)return;
  const plot=plotById(state.selected),f=fieldById(state,state.selected);
  if(!plot||!f)return;
  const i=nextWorkStrip(f,workAction,index);
  if(i<0){exitFieldWorkMode();return}
  const can=canWorkFieldStrip(state,plot.id,workAction,i);
  if(!can.ok){toast(can.message);refreshFieldWorkHud();return}
  selectedStrip=i;
  const point=workStripPosition(plot,i);
  const goal={x:point.x,z:point.z+.42};
  const req=farmFlow.request({action:workAction,plot,position:state.player,goal,cellIndex:i});
  if(req.type!=='queued')return;
  keys.clear();if(req.phase==='approach')queueMovement(req.goal);else clearMovement();refreshFieldWorkHud();
}
function handleFarmFlowEvent(event){
  const plot=plotById(event.fieldId);
  if(event.type==='timeout'){
    clearMovement();toast('길을 찾지 못했어요. 가까이에서 다시 시도해 주세요.');
    refreshFarmControls();return;
  }
  if(!plot)return;
  if(event.type==='start'){
    clearMovement();
    const contact=event.action==='gate'?sluices.get(plot.id)?.position:
      event.cellIndex==null?plot:event.action==='plant'?
        seedlingPosition(plot,event.cellIndex):workStripPosition(plot,event.cellIndex);
    farmerFacingTarget=farmerHeading(contact.x-state.player.x,contact.z-state.player.z);
    if(!farmerAnimator?.trigger(event.action)){
      farmFlow.reset();toast('농기구를 사용할 수 없어요.');refreshFarmControls();
    }
    return;
  }
  if(event.type==='impact'){
    // All crop, soil, inventory, and energy changes happen only at tool contact.
    const stripWork=event.cellIndex!=null&&PATCH_ACTIONS.includes(event.action);
    const result=event.action==='gate'&&gateTargets.has(plot.id)?
      setSluiceOpening(state,plot.id,gateTargets.get(plot.id)):
      stripWork?applyFarmStrip(state,plot.id,event.action,event.cellIndex):
      event.action==='plant'&&event.cellIndex!=null?
        plantSeedling(state,plot.id,event.cellIndex):applyFarmAction(state,plot.id,event.action);
    if(event.action==='gate')gateTargets.delete(plot.id);
    toast(result.message);
    if(result.ok){
      fieldEffects?.emit(event.action,event.action==='gate'?sluices.get(plot.id)?.position:
        event.cellIndex==null?actionContactPoint(plot,state.player):event.action==='plant'?
          seedlingPosition(plot,event.cellIndex):workStripPosition(plot,event.cellIndex));
      syncFieldVisual(plot.id);
      if(event.action==='harvest'||event.action==='fertilize')refreshCargoVisual();
      if(stripWork){
        selectedStrip=nextWorkStrip(fieldById(state,plot.id),event.action);
        workFinished=Boolean(result.complete);
            refreshFieldWorkHud();
      }else if(event.cellIndex!=null){
        selectedSeedling=nextEmptySeedling(fieldById(state,plot.id));
        
        refreshPlantingHud();
      }
      refreshHud();refreshObjective();save(true);
      if(event.action==='harvest'&&state.stats.harvests===1)
        window.KidscadeGame?.milestone?.('first_harvest',{value:result.quantity,uniqueKey:'first_harvest'});
      if(event.action==='plant')
        window.KidscadeGame?.milestone?.('first_sowing',{value:1,uniqueKey:'first_sowing'});
      if(event.action==='gate')
        window.KidscadeGame?.milestone?.('first_irrigation',{value:1,uniqueKey:'first_irrigation'});
    }
    refreshFarmControls();return;
  }
  if(event.type==='complete'){
    refreshFarmControls();
    if(PATCH_ACTIONS.includes(event.action)&&event.cellIndex!=null&&fieldWorkMode){
      if(workFinished){exitFieldWorkMode();toast(event.action==='harvest'?'다섯 구역 수확 완료! 수확물이 창고에 들어갔어요.':'다섯 구역 작업을 모두 마쳤어요.')}
      else{refreshFieldWorkHud();gestureTimer=setTimeout(continueGesture,110)}
      return;
    }
    if(event.action==='plant'&&event.cellIndex!=null&&plantingMode){
      const f=fieldById(state,plot.id);
      if(f?.planted){exitPlantingMode();toast('모내기 완료! 논에 모 25포기가 자리를 잡았어요.')}
      else{refreshPlantingHud();gestureTimer=setTimeout(continueGesture,110)}
    }
  }
}
function doFarmAction(action){
  if(PATCH_ACTIONS.includes(action)){
    if(farmFlow.busy){toast('먼저 하던 농사를 마쳐 주세요.');return}
    enterFieldWorkMode(action);return;
  }
  const selectedField=fieldById(state,state.selected);
  if(action==='plant'&&selectedField?.kind==='rice'){
    if(farmFlow.busy){toast('먼저 하던 농사를 마쳐 주세요.');return}
    enterPlantingMode();return;
  }
  const plot=plotById(state.selected);
  if(!plot)return;
  if(farmFlow.busy){toast('먼저 시작한 농사 작업을 마쳐 주세요.');return}
  const validity=canApplyFarmAction(state,plot.id,action);
  if(!validity.ok){toast(validity.message);return}
  const request=farmFlow.request({action,plot,position:state.player});
  if(request.type!=='queued'){toast(request.message||'지금은 작업할 수 없어요.');return}
  keys.clear();
  if(request.phase==='approach'){
    if(queueMovement(request.goal))toast(plot.label+'에 다가가 '+(actions[action]||'농사 작업')+'를 시작할게요.');
  }else clearMovement();
  refreshFarmControls();
}
function offerRestChoices(){
  const root=document.createElement('div');root.className='rest-choices';
  const intro=document.createElement('p');intro.textContent='집에 돌아왔어요. 다음 날까지 쉴까요, 논밭에 변화가 생길 때까지 쉴까요?';root.append(intro);
  const forecast=tomorrowForecast(state),forecastBox=document.createElement('p');
  forecastBox.className='farm-forecast';forecastBox.textContent='📅 내일 '+forecast.season+' '+forecast.seasonDay+'일 · '+weatherName(forecast.weather)+' — '+forecast.advice;
  root.append(forecastBox);
  for(const [mode,label,description] of [
    ['tomorrow','하루 쉬고 일어나기','하룻밤을 보내고 작물 상태를 확인해요.'],
    ['attention','작물에 변화가 있을 때까지','최대 4일, 성장 단계가 바뀌거나 돌봄이 필요하면 일어나요.']]){
    const button=document.createElement('button');button.type='button';button.className='rest-option';
    button.innerHTML='<strong></strong><small></small>';
    button.querySelector('strong').textContent=label;button.querySelector('small').textContent=description;
    button.onclick=()=>{
      $('modal').classList.add('hidden');restMode=mode;worldAction='sleep';
      if(!farmerAnimator?.trigger('sleep')){worldAction=null;toast('지금은 쉴 수 없어요.')}
    };
    root.append(button);
  }
  showModal('농가에서 쉬어가기',root);
}
function advanceFarmDayAfterRest(mode='tomorrow'){
  if(farmFlow.busy){toast('농사 작업을 마친 다음 하루를 보내 주세요.');return}
  const report=mode==='attention'?restUntilFarmNeedsAttention(state):advanceFarmDay(state);
  villagePeople?.setFestival(seasonalFestival(state));
  farmWeather?.setWeather(state.weather);
  for(const plot of FIELD_DEFS)syncFieldVisual(plot.id);
  refreshHud();refreshObjective();
  if(!$('inspector').classList.contains('hidden'))updateInspector();
  if(fieldWorkMode)refreshFieldWorkHud();
  toast(report.message);save(true);
  showMorningReport(report);
  if(state.day>=2)window.KidscadeGame?.milestone?.('first_farm_day',{uniqueKey:'day-two',value:2});
}
function showMorningReport(report){
  const c=calendar(state.day),root=document.createElement('div');root.className='day-report';
  const summary=document.createElement('div');summary.className='day-weather';
  const weather={sunny:'☀️ 맑음',cloudy:'☁️ 흐림',rain:'🌧️ 비',storm:'⛈️ 강한 비'};
  summary.textContent=c.year+'년 '+c.season+' '+c.seasonDay+'일 · '+weather[state.weather]+
    ((report.daysPassed||1)>1?' · '+report.daysPassed+'일 경과':'');root.append(summary);
  const message=document.createElement('p');message.textContent=report.message;root.append(message);
  if(state.weather==='storm'||state.weather==='rain'){
    const impact=document.createElement('p');impact.className='farm-weather-impact';
    impact.textContent=state.weather==='storm'?'⚠️ 강한 비로 논물이 불어나고 잡초가 빨리 자랐어요. 수문과 물 높이를 확인하세요.':
      '🌧️ 비가 내려 토양이 촉촉해졌어요. 오늘의 물주기가 필요한지 먼저 살펴보세요.';
    root.append(impact);
  }
  if(report.festival?.type==='opens'||seasonalFestival(state).open&&!seasonalFestival(state).completed){
    const festival=seasonalFestival(state),notice=document.createElement('section');notice.className='festival-day-note';
    notice.textContent='🎏 '+festival.title+' 진행 중! '+CROPS[festival.produce].name+' '+festival.count+'개를 싣고 마을길의 소담이를 찾아가 보세요. ('+festival.daysLeft+'일 남음)';
    const visit=document.createElement('button');visit.type='button';visit.textContent='행사 장소로 가기 →';
    visit.onclick=()=>{$('modal').classList.add('hidden');requestStation('festival')};notice.append(visit);root.append(notice);
  }
  if(report.festival?.type==='closes'){
    const missed=document.createElement('p');missed.className='farm-weather-impact';
    missed.textContent='이번 계절의 마을 행사가 끝났어요. 다음 계절 7일에 새로운 행사가 열려요.';root.append(missed);
  }
  const changed=report.changes.filter(item=>item.ready||item.warning||item.to>item.from);
  if(changed.length){
    const heading=document.createElement('strong');heading.textContent='밤사이 논밭에서 생긴 일';root.append(heading);
    const ul=document.createElement('ul');
    changed.slice(0,5).forEach(change=>{
      const li=document.createElement('li');li.textContent=(plotById(change.fieldId)?.label||'논밭')+' · '+
        (change.ready?'수확할 때예요!':change.warning?'작물이 힘들어해요.': '작물이 한 단계 자랐어요.');ul.append(li);
    });root.append(ul);
  }
  const goal=nextFarmObjective(state,visited.size),next=document.createElement('p');
  next.textContent='오늘의 목표: '+goal.description;root.append(next);
  const tomorrow=document.createElement('p');tomorrow.className='farm-forecast';
  const forecast=tomorrowForecast(state);tomorrow.textContent='내일 예보 · '+weatherName(forecast.weather)+' — '+forecast.advice;root.append(tomorrow);
  const button=document.createElement('button');button.type='button';button.textContent='농사 시작하기';
  button.onclick=()=>$('modal').classList.add('hidden');root.append(button);
  showModal('새로운 아침',root);
}
function weatherName(weather){
  return {sunny:'☀️ 맑음',cloudy:'☁️ 흐림',rain:'🌧️ 비',storm:'⛈️ 강한 비'}[weather]||'맑음';
}
function openForecast(){
  const forecast=tomorrowForecast(state),festival=seasonalFestival(state);
  const root=document.createElement('div');root.className='forecast-panel';
  const today=document.createElement('p');today.textContent='오늘 · '+weatherName(state.weather);
  const next=document.createElement('p');next.className='farm-forecast';
  next.textContent='내일 · '+forecast.season+' '+forecast.seasonDay+'일 · '+weatherName(forecast.weather)+'\n'+forecast.advice;
  const day=document.createElement('p');day.textContent=festival.completed?'이번 계절의 마을 행사를 이미 도왔어요.':
    festival.open?festival.title+'가 열렸어요. 남은 기간 '+festival.daysLeft+'일.':
    festival.startsIn?festival.title+'까지 '+festival.startsIn+'일 남았어요.':'다음 계절 7일에 새로운 행사가 열려요.';
  const button=document.createElement('button');button.type='button';button.textContent='소담이에게 마을 행사 물어보기 →';
  button.onclick=()=>{$('modal').classList.add('hidden');requestStation('festival')};
  root.append(today,next,day,button);showModal('솔내리 날씨와 마을 소식',root);
}
function openBarn(){
  const el=document.createElement('div');el.className='farm-bag';
  const count=basketCount(state),heading=document.createElement('p');
  const attached=Boolean(state.transport?.cartAttached),capacity=cargoCapacity(state);
  heading.className='bag-note';heading.textContent=(attached?'손수레 ':'바구니 ')+count+' / '+capacity+'개 · 수확물을 싣고 마을길로 직접 옮겨요.';el.append(heading);
  const cartChoice=document.createElement('section');cartChoice.className='cart-choice';
  const cartTitle=document.createElement('strong');cartTitle.textContent='🛒 우리 농장 손수레';
  const cartInfo=document.createElement('p');cartInfo.textContent=state.upgrades.cart?
    (attached?'손수레를 끌고 있어요. 적재량은 60개, 걸음은 조금 느려져요.':'손수레를 끌면 작물을 한 번에 60개까지 옮길 수 있어요.'):
    '장터에서 손수레를 마련하면 수확물을 한 번에 더 많이 옮길 수 있어요.';
  const cartButton=document.createElement('button');cartButton.type='button';
  cartButton.textContent=attached?'손수레 세워 두기':'손수레 끌기';cartButton.disabled=!state.upgrades.cart||(attached&&count>0);
  cartButton.onclick=()=>{
    const result=toggleFarmCart(state);toast(result.message);
    if(result.ok){refreshCargoVisual();refreshObjective();save(true)}
    openBarn();
  };
  cartChoice.append(cartTitle,cartInfo,cartButton);el.append(cartChoice);
  const section=document.createElement('div');section.className='bag-items';
  for(const [crop,info] of Object.entries(CROPS)){
    const row=document.createElement('div');row.className='bag-item';
    const name=document.createElement('span');name.textContent=info.name+' · 창고 '+state.inventory[crop]+'개';
    const loaded=document.createElement('strong');loaded.textContent=(attached?'수레 ':'바구니 ')+state.cargo[crop]+'개';
    const button=document.createElement('button');button.type='button';button.textContent=attached?'손수레에 싣기':'바구니에 담기';
    button.disabled=state.inventory[crop]===0||count>=capacity;
    button.onclick=()=>{
      const result=loadHarvestBasket(state,crop);toast(result.message);refreshCargoVisual();refreshObjective();save(true);openBarn();
    };row.append(name,loaded,button);section.append(row);
  }
  const unload=document.createElement('button');unload.type='button';unload.textContent=(attached?'손수레':'바구니')+'의 작물을 창고에 내려놓기';
  unload.disabled=count===0;
  unload.onclick=()=>{const result=unloadHarvestBasket(state);toast(result.message);refreshCargoVisual();refreshObjective();save(true);openBarn()};
  const market=document.createElement('button');market.type='button';market.className='sell-btn';
  market.textContent='장터 또는 이웃에게 가져가기 →';market.disabled=count===0;
  market.onclick=()=>{$('modal').classList.add('hidden');requestStation('market')};
  const neighbor=document.createElement('button');neighbor.type='button';neighbor.className='barn-link';
  neighbor.textContent='영수 할아버지의 부탁 들어주기 →';neighbor.disabled=count===0;
  neighbor.onclick=()=>{$('modal').classList.add('hidden');requestStation('neighbor')};
  el.append(section,unload,market,neighbor);showModal('농산물 창고 · 싣고 옮기기',el);
}
function openNeighbor(){
  const conversation=greetNeighbor(state);
  if(conversation.firstToday){refreshHud();save(true)}
  const root=document.createElement('div');root.className='neighbor-dialogue';
  const portrait=document.createElement('div');portrait.className='neighbor-intro';
  const face=document.createElement('div');face.className='neighbor-avatar';face.textContent='👨🏻‍🌾';
  const intro=document.createElement('div');
  const name=document.createElement('strong');name.textContent='영수 할아버지';
  const greeting=document.createElement('p');greeting.textContent='“'+conversation.greeting+'”';
  intro.append(name,greeting);portrait.append(face,intro);
  const tip=document.createElement('p');tip.className='neighbor-tip';tip.textContent='🌱 “'+conversation.advice+'”';
  const friendship=document.createElement('p');friendship.className='neighbor-friendship';
  friendship.textContent='우리 사이 '+ '♥'.repeat(conversation.friendship)+'♡'.repeat(5-conversation.friendship)+
    (conversation.gift?' · 당근 씨앗 2봉지를 받았어요!':'');
  const whereabouts=document.createElement('p');whereabouts.className='neighbor-routine';
  whereabouts.textContent='지금 할아버지는 '+villageRoutine('neighbor',state.minute).label+'이에요.';
  root.append(portrait,tip,friendship,whereabouts);
  const order=currentDeliveryOrder(state);
  const request=document.createElement('section');request.className='delivery-card';
  const title=document.createElement('strong');title.textContent='할아버지의 마을 부탁';request.append(title);
  const description=document.createElement('p');
  if(order){
    description.textContent=order.description+' '+CROPS[order.produce].name+' '+order.count+'개를 직접 가져다주세요. 보상 '+formatWon(order.reward);
    const present=document.createElement('p');present.className='neighbor-stock';
    present.textContent='지금 싣고 온 '+CROPS[order.produce].name+' '+(state.cargo[order.produce]||0)+' / '+order.count+'개';
    const give=document.createElement('button');give.type='button';give.textContent='직접 수확물 건네기';
    give.disabled=(state.cargo[order.produce]||0)<order.count;
    give.onclick=()=>{
      const result=fulfillBasketDeliveryOrder(state);toast(result.message);
      if(result.ok&&state.stats.deliveries===1)window.KidscadeGame?.milestone?.('first_village_delivery',{uniqueKey:'first_delivery',value:result.reward});
      refreshCargoVisual();refreshHud();refreshObjective();save(true);openNeighbor();
    };
    request.append(description,present,give);
    if(give.disabled){
      const load=document.createElement('button');load.type='button';load.className='request-barn';
      load.textContent='창고에서 수확물 가져오기 →';
      load.onclick=()=>{$('modal').classList.add('hidden');requestStation('barn')};request.append(load);
    }
  }else description.textContent='오늘은 마을 부탁을 모두 마쳤구나! 다음 날 다시 찾아오렴.';
  if(!order)request.append(description);
  root.append(request);showModal('솔내리 이웃 이야기',root);
}
function openSeasonFestival(){
  const event=seasonalFestival(state),root=document.createElement('div');root.className='festival-dialogue';
  const intro=document.createElement('section');intro.className='festival-intro';
  const header=document.createElement('strong');header.textContent='🎏 '+event.title+' · 마을 행사 도우미 소담';
  const story=document.createElement('p');story.textContent=event.story;
  intro.append(header,story);
  const routine=document.createElement('p');routine.className='neighbor-routine';
  routine.textContent='소담의 하루 · '+villageRoutine('festival',state.minute).label;
  intro.append(routine);root.append(intro);
  const status=document.createElement('p');status.className='festival-status';
  if(event.completed)status.textContent='이번 계절의 나눔을 마쳤어요. 다음 계절 장날에도 놀러 오세요!';
  else if(!event.open)status.textContent=event.startsIn?'행사는 '+event.startsIn+'일 후에 열려요. 필요한 물건을 미리 모아 두세요.':'이번 계절의 마을 행사는 끝났어요.';
  else status.textContent='행사가 열려 있어요! 앞으로 '+event.daysLeft+'일 안에 도착해 주세요.';
  root.append(status);
  const order=document.createElement('section');order.className='festival-order';
  const amount=document.createElement('strong');amount.textContent=CROPS[event.produce].name+' '+event.count+'개 직접 가져오기';
  const available=document.createElement('p');available.textContent='가져온 수확물 '+(state.cargo[event.produce]||0)+' / '+event.count+'개 · 보상 '+formatWon(event.reward)+' + 씨앗 '+event.seedCount+'묶음';
  const deliver=document.createElement('button');deliver.type='button';deliver.textContent='소담이에게 수확물 건네기';
  deliver.disabled=!event.open||event.completed||(state.cargo[event.produce]||0)<event.count;
  deliver.onclick=()=>{
    const result=fulfillSeasonalFestival(state);toast(result.message);
    if(result.ok){
      villagePeople?.setFestival(seasonalFestival(state));
      villagePeople?.celebrate();
      refreshCargoVisual();refreshHud();refreshObjective();save(true);
    }
    openSeasonFestival();
  };
  order.append(amount,available,deliver);
  if(!event.completed){
    const barn=document.createElement('button');barn.type='button';barn.className='barn-link';
    barn.textContent='창고에서 '+CROPS[event.produce].name+' 준비하기 →';
    barn.onclick=()=>{$('modal').classList.add('hidden');requestStation('barn')};order.append(barn);
  }
  root.append(order);
  const experience=festivalActivity(state),activityBox=document.createElement('section');
  activityBox.className='festival-activity';
  const activityTitle=document.createElement('strong');activityTitle.textContent='마을 체험 · '+experience.title;
  const activityDescription=document.createElement('p');
  activityDescription.textContent=experience.instructions+' · 체험 완료 보상 120원 (계절당 한 번)';
  activityBox.append(activityTitle,activityDescription);
  const progress=document.createElement('p');progress.className='festival-activity-progress';
  progress.textContent=experience.completed?'체험 완료! 다음 계절에 다시 참여해요.':
    '진행 '+experience.progress+' / '+experience.total;
  activityBox.append(progress);
  if(!experience.delivered||!experience.open){
    const hint=document.createElement('p');
    hint.textContent=experience.delivered?'이번 계절 행사가 열릴 때 체험할 수 있어요.':
      '수확물을 직접 납품한 다음 체험 활동을 시작할 수 있어요.';
    activityBox.append(hint);
  }else if(!experience.completed){
    const prompt=document.createElement('p');prompt.className='festival-activity-prompt';
    prompt.textContent=experience.prompt;activityBox.append(prompt);
    const choices=document.createElement('div');choices.className='festival-activity-choices';
    for(const option of experience.options){
      const button=document.createElement('button');button.type='button';
      button.textContent=option.label+(option.used?' · '+option.used+'번 완료':'');
      button.disabled=option.disabled;
      button.onclick=()=>{
        const result=playFestivalActivity(state,option.id);toast(result.message);
        if(result.ok){refreshHud();save(true)}
        if(result.completed){villagePeople?.celebrate()}
        openSeasonFestival();
      };
      choices.append(button);
    }
    activityBox.append(choices);
  }
  root.append(activityBox);showModal('솔내리의 계절 행사',root);
}
function openBag(){
  if(!marketAccess){toast('장터 판매대까지 걸어가 주세요.');return}
  if(farmFlow.busy){toast('농사 작업을 마친 뒤 창고를 열어 주세요.');return}
  const el=document.createElement('div');el.className='farm-bag';
  const stock=document.createElement('div');stock.className='bag-items';
  const names={rice:'쌀',carrot:'당근',corn:'옥수수',seedRice:'볍씨·모',seedCarrot:'당근 씨앗',seedCorn:'옥수수 씨앗',fertilizer:'퇴비'};
  const prices={seedRice:100,seedCarrot:60,seedCorn:80};
  for(const [key,label] of Object.entries(names)){
    const row=document.createElement('div');row.className='bag-item';
    const name=document.createElement('span');name.textContent=label;
    const quantity=document.createElement('strong');quantity.textContent='× '+(Object.hasOwn(CROPS,key)?state.cargo[key]:state.inventory[key]);
    row.append(name,quantity);
    if(prices[key]){
      const button=document.createElement('button');button.type='button';
      button.textContent='구매 '+formatWon(prices[key]);button.disabled=state.money<prices[key];
      button.onclick=()=>{
        const result=buyFarmSupply(state,key,1);
        toast(result.message);refreshHud();save(true);openBag();
      };
      row.append(button);
    }
    stock.append(row);
  }
  const order=currentDeliveryOrder(state);
  const delivery=document.createElement('section');delivery.className='delivery-card';
  const deliveryTitle=document.createElement('strong');deliveryTitle.textContent='마을의 부탁';
  const deliveryText=document.createElement('p');
  const deliveryBtn=document.createElement('button');deliveryBtn.type='button';
  if(order){
    deliveryText.textContent=order.description+' ('+CROPS[order.produce].name+' '+order.count+'개 · 보상 '+formatWon(order.reward)+')';
    deliveryBtn.textContent='영수 할아버지에게 가져가기 →';
    deliveryBtn.onclick=()=>{$('modal').classList.add('hidden');requestStation('neighbor')};
  }else{
    deliveryText.textContent='오늘의 부탁을 모두 마쳤어요. 내일 새로운 주문이 들어와요.';
    deliveryBtn.textContent='오늘은 납품 완료';deliveryBtn.disabled=true;
  }
  delivery.append(deliveryTitle,deliveryText,deliveryBtn);
  const note=document.createElement('p');note.className='bag-note';
  note.textContent='직접 운반한 작물만 팔 수 있어요. 마을 부탁은 이웃에게 직접 건네주세요. 창고에 남은 것은 안전해요.';
  const sale=document.createElement('button');sale.className='sell-btn';sale.type='button';
  const total=Object.keys(CROPS).reduce((acc,key)=>acc+state.cargo[key]*CROPS[key].price,0);
  sale.textContent=(state.transport?.cartAttached?'손수레':'바구니')+' 수확물 판매 · '+formatWon(total);sale.disabled=total===0;
  sale.onclick=()=>{
    const result=sellBasketProduce(state);toast(result.message);refreshCargoVisual();refreshHud();refreshObjective();save(true);openBag();
    if(result.ok&&state.stats.sales===1)window.KidscadeGame?.milestone?.('first_crop_sale',{uniqueKey:'first_sale',value:result.total});
  };
  const upgrades=document.createElement('section');upgrades.className='farm-upgrades';
  const upgradeTitle=document.createElement('strong');upgradeTitle.textContent='우리 농장 발전시키기';upgrades.append(upgradeTitle);
  for(const [key,item] of Object.entries(FARM_UPGRADES)){
    const row=document.createElement('div');row.className='farm-upgrade';
    const info=document.createElement('div'),title=document.createElement('strong'),description=document.createElement('p');
    title.textContent=item.name;description.textContent=item.description;info.append(title,description);
    const button=document.createElement('button');button.type='button';
    const owned=state.upgrades[key];
    button.textContent=owned?'개선 완료':formatWon(item.price);
    if(!owned&&state.stats.sales<1)button.textContent='첫 판매 후';
    button.disabled=owned||state.money<item.price||state.stats.sales<1;
    button.onclick=()=>{
      const result=purchaseFarmUpgrade(state,key);toast(result.message);
      if(result.ok){
        farmerAnimator?.setUpgrades(state.upgrades);
        if(key==='channel')for(const field of FIELD_DEFS)if(field.kind==='rice')syncFieldVisual(field.id);
        refreshHud();refreshObjective();save(true);openBag();
      }
    };
    row.append(info,button);upgrades.append(row);
  }
  if(basketCount(state)===0){
    const goBarn=document.createElement('button');goBarn.type='button';goBarn.className='barn-link';
    goBarn.textContent='바구니가 비었어요 · 창고에서 수확물 가져오기 →';
    goBarn.onclick=()=>{$('modal').classList.add('hidden');requestStation('barn')};
    el.append(goBarn);
  }
  el.append(delivery,stock,sale,note,upgrades);
  showModal('솔내리 장터 · 판매와 농기구',el);
}
function showModal(title,inner){
  keys.clear();joystick.x=0;joystick.y=0;
  $('modalTitle').textContent=title;$('modalContents').replaceChildren();
  if(typeof inner==='string')$('modalContents').textContent=inner;
  else $('modalContents').append(inner);
  $('modal').classList.remove('hidden');
}
function help(){
  const info=document.createElement('div');info.innerHTML='<p><b>PC</b> · WASD 또는 방향키로 이동합니다. 바닥을 클릭하면 그곳으로 걸어가요. 논을 클릭하면 작물 상태를 볼 수 있어요.</p><p><b>카메라</b> · 마우스 휠로 확대·축소, Q/E 또는 회전 버튼으로 시점을 돌려요.</p><p><b>휴대폰·태블릿</b> · 왼쪽 조이스틱으로 이동하고 손가락으로 논을 선택해요. 두 손가락으로 확대·축소해요.</p><p><b>농사</b> · 논의 작은 원으로 물·양분·잡초·수확 상태를 살펴보세요. 모내기는 빈자리를 누르거나 스페이스·엔터로 진행해요. 수문을 위로 끌면 물이 많이 흐르고 아래로 끌면 닫혀요.</p><p><b>날씨</b> · 위쪽의 예보 버튼으로 다음 날 날씨를 확인해요. 비가 많이 올 때는 논 수문을 닫아 넘침에 대비하세요.</p><p><b>수확물</b> · 창고에서 바구니에 싣고 장터로 가져가요. 첫 판매 뒤 손수레를 사면 창고에서 끌고 나와 60개까지 옮길 수 있어요. 손수레는 천천히 움직여요.</p><p><b>마을 사람</b> · 영수 할아버지에게 납품하고 소담이의 계절 행사에도 참여해 보세요. 매 계절 7~13일에 행사가 열리고, 가져온 수확물로 이웃을 도울 수 있어요.</p><p><b>참고</b> · 벼 생육과 날씨는 교육용 간략 계산 모델이에요.</p>';
  showModal('솔내리에서 움직이는 법',info);
}
function showQa(){
  const list=document.createElement('div');list.className='qa-list';
  const explanation=document.createElement('p');
  explanation.textContent='로드 성공과 정상 색칠은 다를 수 있어요. 모델의 텍스처·정점색·재질색을 자동 진단하고, 중성색 벼 재질만 제한적으로 보정해요. 실제 화면 확인은 여전히 필요해요.';
  list.append(explanation);
  const actorNote=document.createElement('div');actorNote.className='qa-entry';
  const actorTitle=document.createElement('strong');actorTitle.textContent='농부 캐릭터 · 절차적 관절 모델';
  const actorText=document.createElement('small');actorText.textContent='피부·머리카락·의상·장화·밀짚모자 색상을 개별 재질로 지정했으며, 농사 동작 7종을 적용했어요.';
  actorNote.append(actorTitle,actorText);list.append(actorNote);
  if(villageScene){
    const entry=document.createElement('div');entry.className='qa-entry';
    const heading=document.createElement('strong');heading.textContent='솔내리 농촌 풍경 · 로우폴리 현장 구성';
    const detail=document.createElement('small');
    const v=villageScene.stats;
    detail.textContent='구역 '+v.areas+'곳 · 메쉬 '+v.meshes+'개 · 묶음 렌더링 '+v.instanced+'종 · 한글 안내판 '+v.signs+'개';
    const note=document.createElement('small');note.textContent='농가·창고·장독대·고추 건조대·농수로·장터를 색상 지정 재질로 그렸어요. 실제 색감은 PC·모바일 캡처에서 다시 확인해 주세요.';
    entry.append(heading,detail,note);list.append(entry);
  }
  for(const [name,record] of assetReport){
    const e=document.createElement('div');e.className='qa-entry';
    const b=document.createElement('strong');b.textContent=(record.status==='loaded'?'로드 성공 · ':'로드 실패 · ')+record.kind;
    const s=document.createElement('small');s.textContent=name.replace('../../assets/','assets/');
    e.append(b,s);
    if(record.colors){
      const c=record.colors,info=document.createElement('small');
      info.textContent='메시 '+c.meshes+'개 · 재질 '+c.materials+'개 · 텍스처 '+c.textured+' · 정점색 '+c.vertexColor+' · 직접색 '+c.painted+' · 중성 무텍스처 '+c.neutralUntextured+' · 자동 보정 '+(record.repainted||0);
      e.append(info);
      if(c.missingMaterial||c.neutralUntextured>(record.repainted||0)){
        const warn=document.createElement('div');warn.className='qa-warn';
        warn.textContent='확인 필요: 색 정보가 부족할 수 있는 재질 '+Math.max(0,c.neutralUntextured-(record.repainted||0))+'개';
        e.append(warn);
      }
    }
    if(record.message){const w=document.createElement('div');w.className='qa-warn';w.textContent=record.message;e.append(w)}
    list.append(e);
  }
  for(const [id,origin] of plotOrigins){
    const e=document.createElement('div');e.className='qa-entry';e.textContent=plotById(id).label+' · '+origin;list.append(e);
  }
  if(!assetReport.size){const p=document.createElement('p');p.textContent='아직 로드된 모델 기록이 없어요.';list.append(p)}
  showModal('농장 에셋 로딩 검수',list);
}
function bindControls(){
  window.addEventListener('keydown',e=>{
    const key=e.key.toLowerCase();
    // Do not drive a farmer while a dialog or text control has keyboard focus.
    const target=e.target;
    if(target?.closest?.('input,textarea,select,[contenteditable="true"]'))return;
    if(!$('modal').classList.contains('hidden')&&key!=='escape')return;if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(key))e.preventDefault();
    keys.add(key);
    if(farmFlow.busy&&farmFlow.active.phase==='approach'&&['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(key)){
      farmFlow.cancelApproach();clearMovement();toast('직접 걷기를 시작해 농사 작업을 취소했어요.');refreshFarmControls();
    }
    if(e.repeat)return;
    if(key==='q')state.camera.angle-=Math.PI/6;
    if(key==='e'){
      let nearest=null,best=1.7;
      for(const [id,sluice] of sluices){const d=Math.hypot(state.player.x-sluice.position.x,state.player.z-sluice.position.z);
        if(d<best){best=d;nearest=id}}
      if(nearest)activateSluice(nearest);
      else{let station=null,distance=2.2;for(const [key,s] of worldStations){const d=Math.hypot(state.player.x-s.stand.x,state.player.z-s.stand.z);if(d<distance){distance=d;station=key}}
        if(station)requestStation(station);else state.camera.angle+=Math.PI/6}
    }
    if(key==='escape'){
      if(plantingMode)exitPlantingMode();
      if(fieldWorkMode)exitFieldWorkMode();
      $('moreTools').classList.add('hidden');$('moreBtn').setAttribute('aria-expanded','false');
      keys.clear();
      if(farmFlow.cancelApproach()){clearMovement();toast('이동하던 농사 작업을 취소했어요.');refreshFarmControls()}
      $('modal').classList.add('hidden');$('inspector').classList.add('hidden')
    }
    if((key===' '||key==='enter')&&plantingMode&&!e.repeat){e.preventDefault();runSeedlingPlant()}
    if((key===' '||key==='enter')&&fieldWorkMode&&!e.repeat){e.preventDefault();runFieldStrip()}
    if(key==='f'){let near=null,d=4;for(const p of FIELD_DEFS){const z=distanceToPlot(state.player,p);if(z<d){d=z;near=p}}if(near)chooseField(near.id)}
  });
  window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur',()=>keys.clear());
  $('farm').addEventListener('wheel',e=>{e.preventDefault();setZoom(state.camera.zoom+(e.deltaY>0?2:-2))},{passive:false});
  $('farm').addEventListener('pointerdown',e=>{
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size===1){
      downPosition={x:e.clientX,y:e.clientY,id:e.pointerId};dragPath=[{x:e.clientX,y:e.clientY}];
      if(!fieldWorkMode&&!plantingMode){
        raycaster.setFromCamera(canvasPosition(e),camera);
        const hit=raycaster.intersectObjects(gateHits,false)[0];
        if(hit)gateDrag={id:e.pointerId,plotId:hit.object.userData.plotId,startY:e.clientY};
      }
    }else{
      if(gateDrag){const f=fieldById(state,gateDrag.plotId);setSluiceVisual(gateDrag.plotId,f.gateLevel);gateDrag=null}
      downPosition=null;dragPath=[];const pts=[...pointers.values()];pinchDistance=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y)
    }
  });
  $('farm').addEventListener('pointermove',e=>{
    if(!pointers.has(e.pointerId))return;
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size===1&&downPosition?.id===e.pointerId&&dragPath.length<110)
      dragPath.push({x:e.clientX,y:e.clientY});
    if(gateDrag?.id===e.pointerId){
      const delta=gateDrag.startY-e.clientY;
      if(Math.abs(delta)>15)setSluiceVisual(gateDrag.plotId,delta>0?2:0);
    }
    if(pointers.size>=2){const pts=[...pointers.values()],dist=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);
      if(pinchDistance)setZoom(state.camera.zoom+(pinchDistance-dist)*.035);
      pinchDistance=dist;downPosition=null;dragPath=[];
    }
  });
  $('farm').addEventListener('pointerup',e=>{
    pointers.delete(e.pointerId);if(!pointers.size)pinchDistance=0;
    if(gateDrag?.id===e.pointerId){
      const target=gateDrag.plotId,delta=gateDrag.startY-e.clientY;
      const f=fieldById(state,target);
      setSluiceVisual(target,f.gateLevel);
      activateSluice(target,Math.abs(delta)>15?(delta>0?2:0):
        ((f.gateLevel??(f.gateOpen?2:0))+1)%3);
      gateDrag=null;
    }else if(downPosition?.id===e.pointerId){
      if(Math.hypot(e.clientX-downPosition.x,e.clientY-downPosition.y)<13)inspectAt(e);
      else if(fieldWorkMode||plantingMode){
        dragPath.push({x:e.clientX,y:e.clientY});startGesture(harvestSwipeTargets(dragPath));
      }
    }
    downPosition=null;dragPath=[];
  });
  $('farm').addEventListener('pointercancel',e=>{
    pointers.delete(e.pointerId);downPosition=null;dragPath=[];pinchDistance=0;
    if(gateDrag?.id===e.pointerId){const f=fieldById(state,gateDrag.plotId);setSluiceVisual(gateDrag.plotId,f.gateLevel);gateDrag=null}
  });
  $('zoomIn').onclick=()=>setZoom(state.camera.zoom-2);$('zoomOut').onclick=()=>setZoom(state.camera.zoom+2);
  $('turnLeft').onclick=()=>state.camera.angle-=Math.PI/6;
  $('turnRight').onclick=()=>state.camera.angle+=Math.PI/6;
  $('moreBtn').onclick=()=>{
    const hidden=$('moreTools').classList.toggle('hidden');
    $('moreBtn').setAttribute('aria-expanded',String(!hidden));
  };
  $('moreTools').addEventListener('click',e=>{
    if(e.target.closest('button')){
      $('moreTools').classList.add('hidden');
      $('moreBtn').setAttribute('aria-expanded','false');
    }
  });
  $('help').onclick=help;
  $('qaBtn').hidden=!(location.hostname==='localhost'||location.hostname==='127.0.0.1'||new URLSearchParams(location.search).has('farmQa'));
  $('qaBtn').onclick=showQa;
  $('focusFarm').onclick=()=>{if(farmFlow.busy&&!farmFlow.cancelApproach()){toast('작업이 끝나면 마을길로 돌아갈 수 있어요.');return}
    if(queueMovement({x:0,z:9})){ $('inspector').classList.add('hidden');toast('마을길로 걸어가요.') }};
  $('saveBtn').onclick=()=>save();
  $('closeInspect').onclick=()=>$('inspector').classList.add('hidden');
  $('modalClose').onclick=()=>$('modal').classList.add('hidden');
  $('modal').addEventListener('click',e=>{if(e.target===$('modal'))$('modal').classList.add('hidden')});
  $('exitPlanting').onclick=exitPlantingMode;
  $('exitFieldWork').onclick=exitFieldWorkMode;
  $('actionButtons').addEventListener('click',e=>{
    const button=e.target.closest('button[data-action]');
    if(button&&!button.disabled)doFarmAction(button.dataset.action);
  });
  $('approachBtn').onclick=goToSelectedField;
  $('sleepBtn').onclick=()=>requestStation('home');
  $('guideRice').onclick=()=>{
    const goal=nextFarmObjective(state,visited.size);
    if(['market','barn','home','neighbor','festival'].includes(goal.kind))requestStation(goal.kind);
    else if(goal.kind==='field'){
      chooseField(goal.target);
      if(goal.title!=='논밭을 둘러봐요')goToSelectedField();
    }
  };
  $('nearFieldBtn').onclick=()=>{
    let selected=null,best=6;
    for(const plot of FIELD_DEFS){const dist=distanceToPlot(state.player,plot);
      if(dist<best){best=dist;selected=plot}}
    if(selected)chooseField(selected.id);else toast('논밭 가까이에서 살펴보기를 눌러 주세요.');
  };

  $('neighborBtn').onclick=()=>requestStation('neighbor');
  $('festivalBtn').onclick=()=>requestStation('festival');
  $('festivalNotice').onclick=()=>requestStation('festival');
  $('forecastBtn').onclick=openForecast;
  $('bagBtn').onclick=()=>requestStation('market');
  $('barnBtn').onclick=()=>requestStation('barn');
  const stick=$('joystick'),knob=stick.querySelector('.joystick-knob');
  const resetStick=()=>{joystick.x=0;joystick.y=0;joystick.id=null;knob.style.transform='translate(0,0)'};
  const readStick=e=>{
    if(farmFlow.cancelApproach()){clearMovement();toast('직접 이동해 농사 작업을 취소했어요.');refreshFarmControls()}
    const r=stick.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2);
    const dist=Math.max(1,Math.hypot(dx,dy)),max=r.width*.34,scale=Math.min(1,max/dist);
    joystick.x=dx*scale/max;joystick.y=dy*scale/max;
    knob.style.transform='translate('+dx*scale+'px,'+dy*scale+'px)';
  };
  stick.addEventListener('pointerdown',e=>{e.preventDefault();$('inspector').classList.add('hidden');joystick.id=e.pointerId;stick.setPointerCapture(e.pointerId);readStick(e)});
  stick.addEventListener('pointermove',e=>{if(joystick.id===e.pointerId)readStick(e)});
  stick.addEventListener('pointerup',resetStick);stick.addEventListener('pointercancel',resetStick);
  window.addEventListener('pagehide',()=>save(true));
  window.KidscadeGame?.registerPauseHandlers?.({pause:()=>paused=true,resume:()=>paused=false});
  window.KidscadeGame?.registerCleanup?.(()=>{clearGesture();farmFlow.reset();save(true);disposed=true;cancelAnimationFrame(raf);fieldEffects?.clear();harvestCargo?.dispose();villagePeople?.dispose();farmWeather?.dispose();for(const r of plotMeshes.values()){r.planting?.dispose();r.work?.dispose();r.statusMarkers?.dispose?.()}villageScene?.dispose();renderer?.dispose()});
}
async function main(){
  const safeStart=nearestWalkablePoint(state.player,obstacles,bounds);
  if(safeStart){state.player.x=safeStart.x;state.player.z=safeStart.z;camTarget.set(safeStart.x,0,safeStart.z)}
  else{state.player.x=-5;state.player.z=3;camTarget.set(-5,0,3)}
  init3D();ground=new THREE.Plane(new THREE.Vector3(0,1,0),-.15);
  bindControls();
  refreshHud();refreshObjective();updateInspector();
  raf=requestAnimationFrame(render);
  await populate();
  loading=false;$('loading').classList.add('hidden');
  window.KidscadeGame?.start?.({source:'farm-simulation-pr2'});
  if(!state.stats.harvests)toast('논을 살펴보고, 네 번째 논에서 첫 수확을 시작해 보세요.');
}
main().catch(e=>{
  const webgl=/webgl|webglrenderer|context/i.test(String(e?.message||e));
  $('loading').classList.add('failed');
  $('loadingTitle').textContent=webgl?'3D 화면을 시작할 수 없어요':'농장을 불러오지 못했어요';
  $('loadingText').textContent=webgl?'이 브라우저에서 3D 그래픽 기능을 사용할 수 없어요.':'농장 자료를 불러오는 중 문제가 생겼어요.';
  $('loadingDetail').textContent=webgl?
    '브라우저의 하드웨어 가속을 확인하거나 다른 브라우저에서 열어 보세요. 학교 기기나 원격 브라우저에서는 3D 기능이 제한될 수 있어요.':
    '인터넷 연결을 확인하고 다시 시도해 주세요. 이미 저장한 농사 기록은 그대로 유지돼요.';
  $('loadingDetail').classList.remove('hidden');
  $('retryLoad').classList.remove('hidden');
  $('retryLoad').onclick=()=>window.location.reload();
  console.error('[Korean Farm]',e);
});

import * as THREE from 'three';
import {loadModel,loadFarmCropStage,assetReport,FARM_MODELS} from './assets.js';
import {createFarmerAnimator} from './animation/farmer-animator.js';
import {FieldEffects} from './animation/field-effects.js';
import {buildSolnaeriVillage} from './rendering/village-scene.js';
import {VILLAGE_COLLIDERS} from './rendering/village-layout.mjs';
import {createRicePlantingGrid} from './rendering/rice-planting-grid.js';
import {createFieldWorkGrid} from './rendering/field-work-grid.js';
import {WORK_STRIPS,PATCH_ACTIONS,workStripPosition,nextWorkStrip,completedWorkStrips} from './farming/field-work.mjs';
import {TRANSPLANT_COUNT,seedlingCount,seedlingPosition,nextEmptySeedling,canPlantSeedling,plantSeedling} from './farming/rice-transplant.mjs';
import {createFarmActionFlow,actionContactPoint,actionApproachPoint} from './interactions/action-flow.mjs';
import {cameraRelativeInput,farmerHeading,rotateToward,walkPlayer,shouldTurnBeforeWalk,LOOK_SPEED} from './interactions/navigation.mjs';
import {FIELD_DEFS,plotById,distanceToPlot} from './world.mjs';
import {createFarmState,restoreFarmState,CROPS,calendar,fieldById,visualStage,fieldCondition,applyFarmAction,canApplyFarmAction,applyFarmStrip,canWorkFieldStrip,advanceFarmDay,sellAllProduce,buyFarmSupply} from './farming/farm-sim.mjs';

const $=id=>document.getElementById(id);
const SAVE_KEY=window.KidscadeGame?.storageKey?.('korean_farm','farm')||'kidscade_game_v1:korean_farm:farm';
const bounds=21.7;
const state=loadSave();
let scene,renderer,camera,raycaster,ground,farmer,farmerAvatar,farmerAnimator,fieldEffects,villageScene=null;
let last=0,raf=0,paused=false,disposed=false,loading=true,noticeTimer=0;
let camTarget=new THREE.Vector3(state.player.x,0,state.player.z);
let viewAngle=state.camera.angle,farmerFacingTarget=0;
let moveGoal=null;
const keys=new Set();
const joystick={x:0,y:0,id:null};
const pointers=new Map();
let pinchDistance=0,downPosition=null;
const plotMeshes=new Map(),plotHits=[],plantingHits=[],fieldWorkHits=[],plotOrigins=new Map(),visited=new Set(state.seenPlots||[]);
const obstacles=VILLAGE_COLLIDERS;
const models=new Map();
const farmFlow=createFarmActionFlow();
let plantingMode=false,selectedSeedling=0,plantHeld=false,plantPointerAction=false;
let fieldWorkMode=false,workAction=null,selectedStrip=0,workHeld=false,workPointerAction=false,workFinished=false;
const actions={till:'괭이질',plant:'심기',water:'물주기',gate:'물꼬',weed:'김매기',fertilize:'거름주기',harvest:'수확'};

const formatWon=n=>Math.max(0,Math.round(n)).toLocaleString('ko-KR')+'원';

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
  farmer=new THREE.Group();farmer.position.set(state.player.x,0,state.player.z);scene.add(farmer);
  farmerAnimator=createFarmerAnimator();
  farmerAvatar=farmerAnimator.root;farmer.add(farmerAvatar);
  fieldEffects=new FieldEffects(scene);
  camera.position.set(16,20,20);resize();
  window.addEventListener('resize',resize);
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
    plotMeshes.set(plot.id,{group,cropLayer,planting,work,target,plot,bed,waterMesh,stage:null,generation:0});
    syncFieldVisual(plot.id,true);
  }
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
  record.planting?.refresh(field,plantingMode&&state.selected===id?selectedSeedling:-1,plantingMode&&state.selected===id);
  record.work?.refresh(field,fieldWorkMode&&state.selected===id?workAction:null,
    fieldWorkMode&&state.selected===id?selectedStrip:-1);
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
    moveGoal=null;
  }else if(moveGoal){
    const dx=moveGoal.x-state.player.x,dz=moveGoal.z-state.player.z;
    goalDistance=Math.hypot(dx,dz);
    if(goalDistance<.28){moveGoal=null;goalDistance=null}
    else direction={x:dx/goalDistance,z:dz/goalDistance};
  }
  // Face the travel direction BEFORE walking. A 180° reversal must turn
  // in place briefly; otherwise forward input looks like walking backward.
  const wantsMove=Math.hypot(direction.x,direction.z)>.05;
  if(wantsMove){
    farmerFacingTarget=farmerHeading(direction.x,direction.z);
    if(shouldTurnBeforeWalk(farmer.rotation.y,farmerFacingTarget))return false;
  }
  const result=walkPlayer(state.player,direction,dt,{goalDistance,bounds,obstacles});
  state.player.x=result.x;state.player.z=result.z;
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
  const dt=last?Math.min(.07,(now-last)/1000):0;last=now;
  const overlayShown=!$('modal').classList.contains('hidden');
  const moving=!paused&&!loading&&!overlayShown?move(dt,now/1000):false;
  if(!paused&&!loading&&!overlayShown){
    farmer.rotation.y=rotateToward(farmer.rotation.y,farmerFacingTarget,dt||.016);
    const feedback=farmerAnimator?.update(dt||.016,{moving,time:now/1000});
    const event=farmFlow.tick(dt||.016,state.player,{
      impact:Boolean(feedback?.impact),working:Boolean(feedback?.working)
    });
    if(event)handleFarmFlowEvent(event);
    refreshWorkStatus();
    updateEnvironmentAnimation(dt||.016,now/1000);
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
  if(plantingMode){
    const cells=raycaster.intersectObjects(plantingHits,false).filter(h=>h.object.userData.plotId===state.selected);
    if(cells.length){runSeedlingPlant(cells[0].object.userData.cellIndex);return}
  }
  const hits=raycaster.intersectObjects(plotHits,false);
  if(plantingMode){toast('모내기 중이에요. 논의 밝은 자리를 선택해 주세요.');return}
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
      if(!farmFlow.busy)moveGoal={x,z};
    }
  }
}
function chooseField(id){
  const plot=plotById(id);if(!plot)return;
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
  $('dayLabel').textContent=c.season+' '+c.seasonDay+'일 · '+w[1];
  $('energyLabel').textContent='기운 '+Math.round(state.energy);
  $('moneyLabel').textContent=formatWon(state.money);
}
function refreshObjective(){
  const steps=[visited.size>=1,state.stats.harvests>=1,state.stats.sales>=1];
  const done=steps.filter(Boolean).length;
  $('progressBar').style.width=done/3*100+'%';
  $('progressText').textContent='첫 논 확인 → 수확 → 판매 · '+done+' / 3';
  $('objective').classList.toggle('complete',done===3);
  const target=$('objective').querySelector('p');
  target.textContent=done===3?'첫 수확과 판매를 마쳤어요! 이제 원하는 작물을 기르며 농장을 꾸려 보세요.':
    !steps[0]?'논을 눌러 작물의 상태를 살펴보세요.':
    !steps[1]?'네 번째 논에는 익은 벼가 있어요. 가까이 가서 수확해 보세요.':'가방에서 첫 수확물을 팔아 보세요.';
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
  $('fieldInfo').textContent=f.kind==='rice'&&!f.planted&&seedlingCount(f)>0?
    '모내기 '+seedlingCount(f)+' / 25포기 · 밝은 자리에 모를 꽂아 보세요.':f.planted?
    CROPS[f.crop].name+' · '+Math.round(f.growth*100)+'% 자람'+(f.kind==='rice'?' · 논물 '+f.waterDepthCm.toFixed(1)+'cm'+(f.gateOpen?' (물꼬 열림)':' (물꼬 닫힘)'):''):
    (f.tilled?'땅을 갈아 놓았어요. 다음 작물을 심을 수 있어요.':'수확을 마친 땅이에요. 괭이질로 다시 준비해 보세요.');
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
    btn.classList.toggle('active',a==='gate'&&f.gateOpen);
    btn.hidden=(a==='water'&&f.kind==='rice')||(a==='gate'&&f.kind!=='rice');
    btn.disabled=farmFlow.busy||(a==='till'&&f.planted)||(a==='plant'&&(f.planted||!f.tilled||!(f.kind==='rice'&&seedlingCount(f)>0)&&!state.inventory[{rice:'seedRice',carrot:'seedCarrot',corn:'seedCorn'}[f.crop]]))||
      (a==='harvest'&&(!f.planted||f.growth<.999))||(a==='fertilize'&&!state.inventory.fertilizer);
    if(PATCH_ACTIONS.includes(a)){
      const next=nextWorkStrip(f,a);
      btn.disabled=farmFlow.busy||next<0||!canWorkFieldStrip(state,plot.id,a,next).ok;
    }
    if(a==='gate')btn.textContent=f.gateOpen?'물꼬 닫기':'물꼬 열기';
    if(a==='plant')btn.textContent=f.kind==='rice'?'🌱 모내기 시작':'씨앗 심기';
  }
  const far=distanceToPlot(state.player,plot)>5;
  $('approachBtn').classList.toggle('hidden',!far);
  $('assetOrigin').textContent='3D 모델: '+(plotOrigins.get(plot.id)||'모델을 불러오는 중');
}
function goToSelectedField(){
  const p=plotById(state.selected);if(!p)return;
  if(farmFlow.busy){toast('지금 하던 작업을 마친 뒤 이동할 수 있어요.');return}
  moveGoal=actionApproachPoint(p,state.player);
  toast(p.label+' 쪽으로 걸어갑니다.');
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
    count===0?'밝은 칸을 선택하고 모를 심으세요.':'초록색 칸은 심었어요. 다음 빈 칸에 도전하세요.';
  // Keep the held action button enabled during movement so touch release is never lost.
  $('plantOne').disabled=count===TRANSPLANT_COUNT||state.energy<1;
  const grid=$('seedlingGrid');
  for(const el of grid.querySelectorAll('[data-cell]')){
    const i=Number(el.dataset.cell),filled=!!f.transplants?.[i];
    el.classList.toggle('planted',filled);el.classList.toggle('chosen',!filled&&i===selectedSeedling);
    el.textContent=filled?'🌱':'·';el.disabled=filled||farmFlow.busy;
    el.setAttribute('aria-label',(i+1)+'번째 자리 '+(filled?'심음':'빈 자리'));
  }
  for(const def of FIELD_DEFS)if(def.kind==='rice'){
    const record=plotMeshes.get(def.id);
    record?.planting?.refresh(fieldById(state,def.id),selectedSeedling,
      plantingMode&&def.id===state.selected);
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
  plantingMode=true;plantHeld=false;selectedSeedling=first;
  $('inspector').classList.add('hidden');
  $('plantingHud').classList.remove('hidden');
  $('moreTools').classList.add('hidden');
  refreshPlantingHud();
  toast('모를 한 포기씩 심어요. 심기 버튼을 길게 누르면 계속 심어요.');
}
function exitPlantingMode(){
  plantHeld=false;plantingMode=false;$('plantingHud').classList.add('hidden');
  if(farmFlow.cancelApproach())moveGoal=null;
  for(const def of FIELD_DEFS)if(def.kind==='rice'){
    const rec=plotMeshes.get(def.id);rec?.planting?.refresh(fieldById(state,def.id),-1,false);
  }
}
function runSeedlingPlant(index=selectedSeedling){
  if(!plantingMode||farmFlow.busy)return;
  const plot=plotById(state.selected),f=fieldById(state,state.selected);
  if(!plot||!f||f.kind!=='rice')return;
  const i=nextEmptySeedling(f,index);
  if(i<0){exitPlantingMode();return}
  const check=canPlantSeedling(state,plot.id,i);
  if(!check.ok){plantHeld=false;toast(check.message);refreshPlantingHud();return}
  selectedSeedling=i;
  const point=seedlingPosition(plot,i);
  // The farmer steps between seedlings and bends to the marked place.
  const goal={x:point.x,z:point.z+.39};
  const req=farmFlow.request({action:'plant',plot,position:state.player,goal,cellIndex:i});
  if(req.type!=='queued')return;
  keys.clear();moveGoal=req.phase==='approach'?req.goal:null;
  refreshPlantingHud();
}
function refreshFieldWorkHud(){
  if(!fieldWorkMode||!workAction)return;
  const f=fieldById(state,state.selected),plot=plotById(state.selected);
  if(!f||!plot)return;
  const count=completedWorkStrips(f,workAction);
  const labels={till:['괭이질','갈아 놓은 땅'],water:['물주기','물을 준 땅'],
    weed:['김매기','잡초를 뽑은 땅'],harvest:['낫질·수확','거둔 땅']};
  $('workToolName').textContent=labels[workAction][0]+' · '+plot.label;
  $('workStripProgress').textContent=count+' / '+WORK_STRIPS+'구역';
  $('workStripFill').style.width=(count/WORK_STRIPS*100)+'%';
  $('workStripEnergy').textContent='기운 '+Math.round(state.energy);
  const index=nextWorkStrip(f,workAction,selectedStrip);
  const check=index>=0?canWorkFieldStrip(state,plot.id,workAction,index):{ok:false,message:'이 작업을 모두 마쳤어요.'};
  $('workStripHint').textContent=farmFlow.busy?'농부가 '+(labels[workAction][0])+' 하는 중이에요…':
    !check.ok?check.message:'밝은 구역을 눌러 작업하거나 아래 버튼을 길게 눌러 이어 하세요.';
  $('workOne').disabled=index<0||(!check.ok&&!farmFlow.busy);
  const done=workAction==='till'?'tilled':workAction==='water'?'watered':
    workAction==='weed'?'weeded':'harvested';
  for(const b of $('workStripGrid').querySelectorAll('button[data-strip]')){
    const n=Number(b.dataset.strip),finished=!!f.work?.[done]?.[n];
    const ready=!finished&&canWorkFieldStrip(state,plot.id,workAction,n).ok;
    b.classList.toggle('done',finished);
    b.classList.toggle('chosen',!finished&&n===selectedStrip);
    b.textContent=finished?'✓':String(n+1);
    b.setAttribute('aria-label',(n+1)+'번째 구역 '+(finished?'완료':'남음'));
    b.disabled=finished||farmFlow.busy||!ready;
  }
  plotMeshes.get(plot.id)?.work?.refresh(f,workAction,selectedStrip);
}
function enterFieldWorkMode(action){
  const plot=plotById(state.selected),f=fieldById(state,state.selected);
  if(!plot||!f||!PATCH_ACTIONS.includes(action)||farmFlow.busy)return;
  const first=nextWorkStrip(f,action);
  const check=first>=0?canWorkFieldStrip(state,plot.id,action,first):{ok:false,message:'이 작업은 이미 끝났어요.'};
  if(!check.ok){toast(check.message);return}
  fieldWorkMode=true;workAction=action;selectedStrip=first;workHeld=false;workFinished=false;
  $('inspector').classList.add('hidden');$('fieldWorkHud').classList.remove('hidden');
  $('moreTools').classList.add('hidden');refreshFieldWorkHud();
  toast('농부가 선택한 구역으로 걸어가 도구를 사용할 거예요.');
}
function exitFieldWorkMode(){
  workHeld=false;fieldWorkMode=false;workAction=null;workFinished=false;
  $('fieldWorkHud').classList.add('hidden');
  if(farmFlow.cancelApproach())moveGoal=null;
  for(const p of FIELD_DEFS)plotMeshes.get(p.id)?.work?.refresh(fieldById(state,p.id));
}
function runFieldStrip(index=selectedStrip){
  if(!fieldWorkMode||farmFlow.busy||!workAction)return;
  const plot=plotById(state.selected),f=fieldById(state,state.selected);
  if(!plot||!f)return;
  const i=nextWorkStrip(f,workAction,index);
  if(i<0){exitFieldWorkMode();return}
  const can=canWorkFieldStrip(state,plot.id,workAction,i);
  if(!can.ok){workHeld=false;toast(can.message);refreshFieldWorkHud();return}
  selectedStrip=i;
  const point=workStripPosition(plot,i);
  const goal={x:point.x,z:point.z+.42};
  const req=farmFlow.request({action:workAction,plot,position:state.player,goal,cellIndex:i});
  if(req.type!=='queued')return;
  keys.clear();moveGoal=req.phase==='approach'?req.goal:null;refreshFieldWorkHud();
}
function handleFarmFlowEvent(event){
  const plot=plotById(event.fieldId);
  if(event.type==='timeout'){
    moveGoal=null;toast('길을 찾지 못했어요. 가까이에서 다시 시도해 주세요.');
    refreshFarmControls();return;
  }
  if(!plot)return;
  if(event.type==='start'){
    moveGoal=null;
    const contact=event.cellIndex==null?plot:seedlingPosition(plot,event.cellIndex);
    farmerFacingTarget=farmerHeading(contact.x-state.player.x,contact.z-state.player.z);
    if(!farmerAnimator?.trigger(event.action)){
      farmFlow.reset();toast('농기구를 사용할 수 없어요.');refreshFarmControls();
    }
    return;
  }
  if(event.type==='impact'){
    // All crop, soil, inventory, and energy changes happen only at tool contact.
    const result=event.action==='plant'&&event.cellIndex!=null?
      plantSeedling(state,plot.id,event.cellIndex):applyFarmAction(state,plot.id,event.action);
    toast(result.message);
    if(result.ok){
      fieldEffects?.emit(event.action,event.cellIndex==null?
        actionContactPoint(plot,state.player):seedlingPosition(plot,event.cellIndex));
      syncFieldVisual(plot.id);
      if(event.cellIndex!=null){
        selectedSeedling=nextEmptySeedling(fieldById(state,plot.id));
        if(result.complete)plantHeld=false;
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
    if(event.action==='plant'&&event.cellIndex!=null&&plantingMode){
      const f=fieldById(state,plot.id);
      if(f?.planted){exitPlantingMode();toast('모내기 완료! 논에 모 25포기가 자리를 잡았어요.')}
      else if(plantHeld){runSeedlingPlant(nextEmptySeedling(f))}
      else refreshPlantingHud();
    }
  }
}
function doFarmAction(action){
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
    moveGoal=request.goal;toast(plot.label+'에 다가가 '+(actions[action]||'농사 작업')+'를 시작할게요.');
  }else moveGoal=null;
  refreshFarmControls();
}
function sleepFarmDay(){
  if(farmFlow.busy){toast('농사 작업을 마친 다음 하루를 보내 주세요.');return}
  if(distanceToPlot(state.player,{x:0,z:9,w:6,d:5})>6){
    // Day advancement stays intentionally accessible on mobile while the starter house
    // is still a visual-only scene prop; do not trap the player behind collision.
  }
  const report=advanceFarmDay(state);
  for(const plot of FIELD_DEFS)syncFieldVisual(plot.id);
  refreshHud();refreshObjective();
  if(!$('inspector').classList.contains('hidden'))updateInspector();
  toast(report.message);save(true);
  if(state.day===2)window.KidscadeGame?.milestone?.('first_farm_day',{uniqueKey:'day-two',value:2});
}
function openBag(){
  if(farmFlow.busy){toast('농사 작업을 마친 뒤 창고를 열어 주세요.');return}
  const el=document.createElement('div');el.className='farm-bag';
  const stock=document.createElement('div');stock.className='bag-items';
  const names={rice:'쌀',carrot:'당근',corn:'옥수수',seedRice:'볍씨·모',seedCarrot:'당근 씨앗',seedCorn:'옥수수 씨앗',fertilizer:'퇴비'};
  const prices={seedRice:100,seedCarrot:60,seedCorn:80,fertilizer:130};
  for(const [key,label] of Object.entries(names)){
    const row=document.createElement('div');row.className='bag-item';
    const name=document.createElement('span');name.textContent=label;
    const quantity=document.createElement('strong');quantity.textContent='× '+(state.inventory[key]||0);
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
  const note=document.createElement('p');note.className='bag-note';
  note.textContent='수확물은 이곳에서 판매하고, 씨앗과 퇴비를 구입할 수 있어요. 시장 가격은 첫 버전의 고정값이에요.';
  const sale=document.createElement('button');sale.className='sell-btn';sale.type='button';
  const total=Object.keys(CROPS).reduce((acc,key)=>acc+state.inventory[key]*CROPS[key].price,0);
  sale.textContent='수확물 모두 판매 · '+formatWon(total);sale.disabled=total===0;
  sale.onclick=()=>{
    const result=sellAllProduce(state);toast(result.message);refreshHud();refreshObjective();save(true);openBag();
    if(result.ok&&state.stats.sales===1)window.KidscadeGame?.milestone?.('first_crop_sale',{uniqueKey:'first_sale',value:result.total});
  };
  el.append(note,stock,sale);
  showModal('농장 창고와 장터',el);
}
function showModal(title,inner){
  keys.clear();joystick.x=0;joystick.y=0;
  $('modalTitle').textContent=title;$('modalContents').replaceChildren();
  if(typeof inner==='string')$('modalContents').textContent=inner;
  else $('modalContents').append(inner);
  $('modal').classList.remove('hidden');
}
function help(){
  const info=document.createElement('div');info.innerHTML='<p><b>PC</b> · WASD 또는 방향키로 이동합니다. 바닥을 클릭하면 그곳으로 걸어가요. 논을 클릭하면 벼 성장 단계를 살펴볼 수 있어요.</p><p><b>카메라</b> · 마우스 휠로 확대·축소, Q/E 또는 회전 버튼으로 시점을 돌려요.</p><p><b>휴대폰·태블릿</b> · 왼쪽 조이스틱으로 이동하고 손가락으로 논을 선택해요. 두 손가락으로 확대·축소할 수 있어요.</p><p><b>농사</b> · 논밭을 선택한 뒤 가까이 이동해 괭이질, 모내기, 물주기, 물꼬 관리, 거름주기, 수확을 할 수 있어요. 하루 보내기로 작물을 성장시키고, 수확물·판매 메뉴에서 거래해요.</p><p><b>참고</b> · 벼 생육과 날씨는 교육용 간략 계산 모델이에요. 실제 농업 통계에 맞춘 정밀 보정은 추후 진행합니다.</p>';
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
      farmFlow.cancelApproach();moveGoal=null;toast('직접 걷기를 시작해 농사 작업을 취소했어요.');refreshFarmControls();
    }
    if(e.repeat)return;
    if(key==='q')state.camera.angle-=Math.PI/6;
    if(key==='e')state.camera.angle+=Math.PI/6;
    if(key==='escape'){
      if(plantingMode)exitPlantingMode();
      $('moreTools').classList.add('hidden');$('moreBtn').setAttribute('aria-expanded','false');
      keys.clear();
      if(farmFlow.cancelApproach()){moveGoal=null;toast('이동하던 농사 작업을 취소했어요.');refreshFarmControls()}
      $('modal').classList.add('hidden');$('inspector').classList.add('hidden')
    }
    if((key===' '||key==='enter')&&plantingMode&&!e.repeat){e.preventDefault();runSeedlingPlant()}
    if(key==='f'){let near=null,d=4;for(const p of FIELD_DEFS){const z=distanceToPlot(state.player,p);if(z<d){d=z;near=p}}if(near)chooseField(near.id)}
  });
  window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur',()=>keys.clear());
  $('farm').addEventListener('wheel',e=>{e.preventDefault();setZoom(state.camera.zoom+(e.deltaY>0?2:-2))},{passive:false});
  $('farm').addEventListener('pointerdown',e=>{
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size===1)downPosition={x:e.clientX,y:e.clientY,id:e.pointerId};
    else{downPosition=null;const pts=[...pointers.values()];pinchDistance=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y)}
  });
  $('farm').addEventListener('pointermove',e=>{
    if(!pointers.has(e.pointerId))return;
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size>=2){const pts=[...pointers.values()],dist=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);
      if(pinchDistance)setZoom(state.camera.zoom+(pinchDistance-dist)*.035);
      pinchDistance=dist;downPosition=null;
    }
  });
  $('farm').addEventListener('pointerup',e=>{
    pointers.delete(e.pointerId);if(!pointers.size)pinchDistance=0;
    if(downPosition?.id===e.pointerId&&Math.hypot(e.clientX-downPosition.x,e.clientY-downPosition.y)<13)inspectAt(e);
    downPosition=null;
  });
  $('farm').addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);downPosition=null;pinchDistance=0});
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
  $('help').onclick=help;$('qaBtn').onclick=showQa;
  $('focusFarm').onclick=()=>{if(farmFlow.busy&&!farmFlow.cancelApproach()){toast('작업이 끝나면 마을길로 돌아갈 수 있어요.');return}
    moveGoal={x:0,z:9};$('inspector').classList.add('hidden');toast('마을길로 걸어가요.')};
  $('saveBtn').onclick=()=>save();
  $('closeInspect').onclick=()=>$('inspector').classList.add('hidden');
  $('modalClose').onclick=()=>$('modal').classList.add('hidden');
  $('modal').addEventListener('click',e=>{if(e.target===$('modal'))$('modal').classList.add('hidden')});
  const grid=$('seedlingGrid');
  for(let i=0;i<TRANSPLANT_COUNT;i++){
    const b=document.createElement('button');b.type='button';b.dataset.cell=String(i);
    b.setAttribute('aria-label',(i+1)+'번째 자리');b.textContent='·';grid.append(b);
  }
  grid.addEventListener('click',e=>{
    const b=e.target.closest('button[data-cell]');
    if(b&&!b.disabled)runSeedlingPlant(Number(b.dataset.cell));
  });
  $('exitPlanting').onclick=exitPlantingMode;
  const plantButton=$('plantOne');
  plantButton.addEventListener('pointerdown',e=>{
    if(e.button!==0||plantButton.disabled)return;
    e.preventDefault();plantPointerAction=true;plantHeld=true;
    try{plantButton.setPointerCapture(e.pointerId)}catch{}
    runSeedlingPlant();
  });
  const stopPlant=()=>{plantHeld=false};
  plantButton.addEventListener('pointerup',stopPlant);
  plantButton.addEventListener('pointercancel',stopPlant);
  window.addEventListener('pointerup',stopPlant);
  plantButton.addEventListener('click',()=>{
    if(plantPointerAction){plantPointerAction=false;return}
    runSeedlingPlant();
  });
  $('actionButtons').addEventListener('click',e=>{
    const button=e.target.closest('button[data-action]');
    if(button&&!button.disabled)doFarmAction(button.dataset.action);
  });
  $('approachBtn').onclick=goToSelectedField;
  $('sleepBtn').onclick=sleepFarmDay;
  $('guideRice').onclick=()=>{
    chooseField('rice-1');
    const f=fieldById(state,'rice-1');
    if(!f.planted&&f.tilled)enterPlantingMode();
    else{goToSelectedField();toast('이 논은 이미 모내기를 마쳤어요. 다른 논의 수확도 해 보세요.')}
  };
  $('nearFieldBtn').onclick=()=>{
    let selected=null,best=6;
    for(const plot of FIELD_DEFS){const dist=distanceToPlot(state.player,plot);
      if(dist<best){best=dist;selected=plot}}
    if(selected)chooseField(selected.id);else toast('논밭 가까이에서 살펴보기를 눌러 주세요.');
  };

  $('bagBtn').onclick=openBag;
  const stick=$('joystick'),knob=stick.querySelector('.joystick-knob');
  const resetStick=()=>{joystick.x=0;joystick.y=0;joystick.id=null;knob.style.transform='translate(0,0)'};
  const readStick=e=>{
    if(farmFlow.cancelApproach()){moveGoal=null;toast('직접 이동해 농사 작업을 취소했어요.');refreshFarmControls()}
    const r=stick.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2);
    const dist=Math.max(1,Math.hypot(dx,dy)),max=r.width*.34,scale=Math.min(1,max/dist);
    joystick.x=dx*scale/max;joystick.y=dy*scale/max;
    knob.style.transform='translate('+dx*scale+'px,'+dy*scale+'px)';
  };
  stick.addEventListener('pointerdown',e=>{e.preventDefault();joystick.id=e.pointerId;stick.setPointerCapture(e.pointerId);readStick(e)});
  stick.addEventListener('pointermove',e=>{if(joystick.id===e.pointerId)readStick(e)});
  stick.addEventListener('pointerup',resetStick);stick.addEventListener('pointercancel',resetStick);
  window.addEventListener('pagehide',()=>save(true));
  window.KidscadeGame?.registerPauseHandlers?.({pause:()=>paused=true,resume:()=>paused=false});
  window.KidscadeGame?.registerCleanup?.(()=>{farmFlow.reset();save(true);disposed=true;cancelAnimationFrame(raf);fieldEffects?.clear();for(const r of plotMeshes.values())r.planting?.dispose();villageScene?.dispose();renderer?.dispose()});
}
async function main(){
  init3D();ground=new THREE.Plane(new THREE.Vector3(0,1,0),-.15);
  bindControls();
  refreshHud();refreshObjective();updateInspector();
  raf=requestAnimationFrame(render);
  await populate();
  loading=false;$('loading').classList.add('hidden');
  window.KidscadeGame?.start?.({source:'farm-simulation-pr2'});
  if(!state.stats.harvests)toast('첫 번째 논에서 모내기를 체험하고, 네 번째 논에서는 익은 벼를 수확해 보세요.');
}
main().catch(e=>{
  $('loadingText').textContent='농장을 불러오지 못했어요. 다시 열어 주세요.';
  console.error('[Korean Farm]',e);
});

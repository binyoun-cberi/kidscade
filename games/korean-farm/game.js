import * as THREE from 'three';
import {loadModel,loadRiceStage,assetReport,FARM_MODELS} from './assets.js';
import {FIELD_DEFS,plotById,distanceToPlot} from './world.mjs';
import {createFarmState,restoreFarmState,CROPS,calendar,fieldById,visualStage,fieldCondition,applyFarmAction,advanceFarmDay,sellAllProduce} from './farming/farm-sim.mjs';

const $=id=>document.getElementById(id);
const SAVE_KEY=window.KidscadeGame?.storageKey?.('korean_farm','farm')||'kidscade_game_v1:korean_farm:farm';
const bounds=21.7;
const state=loadSave();
let scene,renderer,camera,raycaster,ground,farmer,farmerAvatar;
let last=0,raf=0,paused=false,disposed=false,loading=true,noticeTimer=0;
let camTarget=new THREE.Vector3(state.player.x,0,state.player.z);
let moveGoal=null;
const keys=new Set();
const joystick={x:0,y:0,id:null};
const pointers=new Map();
let pinchDistance=0,downPosition=null;
const plotMeshes=new Map(),plotHits=[],plotOrigins=new Map(),visited=new Set(state.seenPlots||[]);
const obstacles=[{x:10.1,z:-13,w:6,d:5},{x:18,z:-12,w:3.6,d:3.5}];
const models=new Map();
const actions={till:'괭이질',plant:'심기',water:'물주기',gate:'물꼬',weed:'김매기',fertilize:'거름주기',harvest:'수확'};
const farmFx=[];
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
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  scene=new THREE.Scene();scene.background=new THREE.Color(0xbedcd5);
  scene.fog=new THREE.Fog(0xbedcd5,46,98);
  camera=new THREE.OrthographicCamera(-12,12,8,-8,.1,160);
  raycaster=new THREE.Raycaster();
  scene.add(new THREE.HemisphereLight(0xfff5e2,0x6c9879,2.15));
  const sun=new THREE.DirectionalLight(0xfff0c9,2.45);sun.position.set(-14,26,-10);
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
  // Water gate at the connecting stream.
  addRect(1.1,.5,.36,0x8b673c,-16.5,.35,-3.2);
  addRect(.13,.85,.13,0xb89560,-16.8,.55,-3.2);
  addRect(.13,.85,.13,0xb89560,-16.15,.55,-3.2);
  // River and pond extensions add landscape depth without costly simulation.
  addRect(2.9,.05,3.7,0x6eacae,-17.5,.12,13.7);
  addRect(5,.045,3,0x76b4a5,15,.075,15.8);
  for(let i=0;i<6;i++)addRect(3,.16,.26,0xba9871,-17.5,.23,7.5+i*.4);
  buildFields();
  farmer=new THREE.Group();farmer.position.set(state.player.x,0,state.player.z);scene.add(farmer);
  farmerAvatar=makeFallbackFarmer();farmer.add(farmerAvatar);
  camera.position.set(16,20,20);resize();
  window.addEventListener('resize',resize);
}
function makeFallbackFarmer(){
  const g=new THREE.Group();
  const body=addRect(.52,.77,.32,0x5b7ea1,0,.93,0,1,g);
  const legs=addRect(.41,.48,.28,0x4b5d52,0,.3,0,1,g);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.26,12,8),new THREE.MeshStandardMaterial({color:0xe6b78d}));
  head.position.y=1.52;g.add(head);return g;
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
    plotMeshes.set(plot.id,{group,cropLayer,target,plot,bed,waterMesh,stage:null,generation:0});
    syncFieldVisual(plot.id,true);
  }
}
function clearGroup(group){for(const child of [...group.children])group.remove(child)}
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
  const resource=plot.kind==='rice'?await loadRiceStage(stage):
    {object:await loadModel(plot.kind),origin:'공용 Kenney GLB'};
  if(disposed||record.generation!==generation)return;
  clearGroup(record.cropLayer);
  plotOrigins.set(id,resource.object?resource.origin:'임시 모형');
  const crop=resource.object||fallbackCrop(plot.kind);
  const cols=3,rows=plot.kind==='rice'?3:2;
  for(let x=0;x<cols;x++)for(let z=0;z<rows;z++){
    // Static copies are sufficient for the first farming loop; source GLB is cached.
    const model=crop.clone(true);
    model.position.x+=(x-(cols-1)/2)*(plot.w/(cols+.3));
    model.position.z+=(z-(rows-1)/2)*(plot.d/(rows+.3));
    model.position.y+=plot.kind==='rice'?.22:.26;
    model.rotation.y=(x*3+z)*.36;
    record.cropLayer.add(model);
  }
  if(state.selected===id&&!$('inspector').classList.contains('hidden'))updateInspector();
}
function animateFarmAction(plot,color=0xf4e0a4){
  if(!plot)return;
  const mesh=new THREE.Mesh(new THREE.RingGeometry(.42,.58,24),new THREE.MeshBasicMaterial({
    color,transparent:true,opacity:.88,side:THREE.DoubleSide,depthWrite:false
  }));
  mesh.rotation.x=-Math.PI/2;mesh.position.set(plot.x,.44,plot.z);scene.add(mesh);
  farmFx.push({mesh,remaining:.72});
}
function animateEffects(dt){
  for(let i=farmFx.length-1;i>=0;i--){
    const fx=farmFx[i];fx.remaining-=dt;fx.mesh.scale.multiplyScalar(1+dt*2.2);
    fx.mesh.material.opacity=Math.max(0,fx.remaining/.72)*.75;
    if(fx.remaining<=0){scene.remove(fx.mesh);fx.mesh.geometry.dispose();fx.mesh.material.dispose();farmFx.splice(i,1)}
  }
}
function addFarmSigns(){
  // Road signs and farming landmarks are geometric placeholders in PR 1.
  addRect(.12,1.15,.12,0x6e5338,2.2,.57,11.4);
  addRect(1.85,.68,.08,0xe5d4ab,2.2,1.27,11.4);
  const sign=labelTexture('솔내리 농장');const plane=new THREE.Mesh(new THREE.PlaneGeometry(1.72,.52),new THREE.MeshBasicMaterial({map:sign,transparent:true,side:THREE.DoubleSide}));
  plane.position.set(2.2,1.26,11.49);scene.add(plane);
}
function labelTexture(text){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=160;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#e8d9b3';ctx.fillRect(0,0,512,160);
  ctx.fillStyle='#426148';ctx.textAlign='center';ctx.font='bold 65px sans-serif';ctx.fillText(text,256,108);
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;return tex;
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
  addFarmSigns();
  const jobs=[
    placeModel('farmhouse',10.1,-13,.6),placeModel('barn',18,-12,-.25),placeModel('well',1.6,-13,.4),
    placeModel('hoe',7.1,-9.8,-.8),placeModel('wateringCan',8,-9.8,0)
  ];
  const trees=[[-20,-18],[-15,-19],[-8,-18],[0,-20],[5,-19],[19,-20],[-21,17],[-12,18],[-4,20],[6,19],[19,19],[-21,3]];
  trees.forEach(([x,z],i)=>jobs.push(placeModel(i%4===0?'pine':'tree',x,z,i*.73)));
  [[-3,-14],[-2,-16],[20,1],[18,5]].forEach(([x,z],i)=>jobs.push(placeModel('treeFall',x,z,i*.5)));
  jobs.push(loadModel('farmer').then(o=>{
    if(!o||disposed)return;farmer.clear();farmerAvatar=o;farmer.add(farmerAvatar);models.set('farmer','loaded');
  }));
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
  const a=state.camera.angle,v=state.camera.zoom;
  camera.position.set(camTarget.x+Math.sin(a)*v*.83,v*.82,camTarget.z+Math.cos(a)*v*.83);
  camera.lookAt(camTarget.x,0,camTarget.z);
}
function isBlocked(x,z){
  return obstacles.some(q=>Math.abs(x-q.x)<q.w/2+.45&&Math.abs(z-q.z)<q.d/2+.45);
}
function move(dt,elapsed){
  let vx=0,vz=0;
  if(keys.has('w')||keys.has('arrowup'))vz-=1;
  if(keys.has('s')||keys.has('arrowdown'))vz+=1;
  if(keys.has('a')||keys.has('arrowleft'))vx-=1;
  if(keys.has('d')||keys.has('arrowright'))vx+=1;
  vx+=joystick.x;vz+=joystick.y;
  if(vx||vz){
    moveGoal=null;
    // Camera-relative movement remains intuitive after orbiting.
    const screenX=vx,screenZ=vz,a=state.camera.angle;
    vx=screenX*Math.cos(a)+screenZ*Math.sin(a);
    vz=-screenX*Math.sin(a)+screenZ*Math.cos(a);
  }else if(moveGoal){
    const dx=moveGoal.x-state.player.x,dz=moveGoal.z-state.player.z,d=Math.hypot(dx,dz);
    if(d<.28)moveGoal=null;
    else{vx=dx/d;vz=dz/d}
  }
  let moving=false;
  const d=Math.hypot(vx,vz);
  if(d>.01){
    vx/=Math.max(1,d);vz/=Math.max(1,d);
    const velocity=4.7*dt;
    const x=Math.max(-bounds,Math.min(bounds,state.player.x+vx*velocity));
    const z=Math.max(-bounds,Math.min(bounds,state.player.z+vz*velocity));
    if(!isBlocked(x,state.player.z))state.player.x=x;
    if(!isBlocked(state.player.x,z))state.player.z=z;
    moving=true;
    farmer.rotation.y=Math.atan2(vx,-vz);
  }
  farmer.position.set(state.player.x,moving?Math.abs(Math.sin(elapsed*9))*.045:0,state.player.z);
  if(farmerAvatar)farmerAvatar.rotation.z=moving?Math.sin(elapsed*11)*.022:0;
}
function render(now){
  if(disposed)return;raf=requestAnimationFrame(render);
  const dt=last?Math.min(.07,(now-last)/1000):0;last=now;
  if(!paused&&!loading)move(dt,now/1000);
  animateEffects(dt||.016);
  refreshCamera(dt||.016);renderer.render(scene,camera);
}
function canvasPosition(e){
  const rect=$('farm').getBoundingClientRect();
  return new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);
}
function inspectAt(e){
  raycaster.setFromCamera(canvasPosition(e),camera);
  const hits=raycaster.intersectObjects(plotHits,false);
  if(hits.length){
    chooseField(hits[0].object.userData.plotId);return;
  }
  const p=new THREE.Vector3();
  if(raycaster.ray.intersectPlane(ground,p)){
    const x=Math.max(-bounds,Math.min(bounds,p.x)),z=Math.max(-bounds,Math.min(bounds,p.z));
    if(!isBlocked(x,z))moveGoal={x,z};
  }
}
function chooseField(id){
  const plot=plotById(id);if(!plot)return;
  state.selected=id;
  if(plot.kind==='rice'){
    visited.add(id);state.seenPlots=[...visited];state.visits=visited.size;
    $('progressText').textContent='살펴본 논 '+visited.size+' / 4';
    $('progressBar').style.width=visited.size/4*100+'%';
    if(visited.size===4)window.KidscadeGame?.milestone?.('farm_preview_inspected',{value:4,uniqueKey:'four-rice-fields'});
  }
  if(distanceToPlot(state.player,plot)>5)toast('선택한 논이 멀어요. 길을 따라 가까이 이동할 수도 있어요.');
  updateInspector();$('inspector').classList.remove('hidden');save(true);
}
function updateInspector(){
  const p=plotById(state.selected);if(!p)return;
  $('fieldKind').textContent=p.kind==='rice'?'논 살펴보기':'텃밭 살펴보기';
  $('fieldName').textContent=p.label;
  $('stagePanel').classList.toggle('hidden',p.kind!=='rice');
  if(p.kind==='rice'){
    const st=plotStage(state,p.id),detail=RICE_STAGES[st-1];
    $('fieldInfo').textContent=detail.name+' · '+detail.detail;
    $('stageLabel').textContent=st+' / 4';
    $('stageButtons').querySelectorAll('button').forEach(el=>el.classList.toggle('active',Number(el.dataset.stage)===st));
  }else $('fieldInfo').textContent=p.kind==='carrot'?'당근의 잎과 뿌리를 살펴볼 수 있어요.':'옥수수의 높은 줄기와 이삭을 살펴볼 수 있어요.';
  $('assetOrigin').textContent='현재 표시: '+(plotOrigins.get(p.id)||'모델을 불러오는 중');
}
function showModal(title,inner){
  $('modalTitle').textContent=title;$('modalContents').replaceChildren();
  if(typeof inner==='string')$('modalContents').textContent=inner;
  else $('modalContents').append(inner);
  $('modal').classList.remove('hidden');
}
function help(){
  const info=document.createElement('div');info.innerHTML='<p><b>PC</b> · WASD 또는 방향키로 이동합니다. 바닥을 클릭하면 그곳으로 걸어가요. 논을 클릭하면 벼 성장 단계를 살펴볼 수 있어요.</p><p><b>카메라</b> · 마우스 휠로 확대·축소, Q/E 또는 회전 버튼으로 시점을 돌려요.</p><p><b>휴대폰·태블릿</b> · 왼쪽 조이스틱으로 이동하고 손가락으로 논을 선택해요. 두 손가락으로 확대·축소할 수 있어요.</p><p><b>참고</b> · 현재는 3D 농장/성장 모델 검수용 첫 번째 시제품이에요. 파종·물 관리·판매 시스템은 아직 구현하지 않았어요.</p>';
  showModal('솔내리에서 움직이는 법',info);
}
function showQa(){
  const list=document.createElement('div');list.className='qa-list';
  const explanation=document.createElement('p');explanation.textContent='이 목록은 파일 로드 성공 여부를 확인하는 도구예요. 모델의 색·크기·동작을 사람이 직접 확인해야 최종 검수로 인정해요.';list.append(explanation);
  for(const [name,record] of assetReport){
    const e=document.createElement('div');e.className='qa-entry';
    const b=document.createElement('strong');b.textContent=(record.status==='loaded'?'로드 성공 · ':'로드 실패 · ')+record.kind;
    const s=document.createElement('small');s.textContent=name.replace('../../assets/','assets/');
    e.append(b,s);if(record.message){const w=document.createElement('div');w.className='qa-warn';w.textContent=record.message;e.append(w)}
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
    const key=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(key))e.preventDefault();
    keys.add(key);
    if(e.repeat)return;
    if(key==='q')state.camera.angle-=Math.PI/6;
    if(key==='e')state.camera.angle+=Math.PI/6;
    if(key==='escape'){$('modal').classList.add('hidden');$('inspector').classList.add('hidden')}
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
  $('turnLeft').onclick=()=>state.camera.angle+=Math.PI/4;
  $('help').onclick=help;$('qaBtn').onclick=showQa;
  $('focusFarm').onclick=()=>{moveGoal={x:0,z:9};$('inspector').classList.add('hidden')};
  $('saveBtn').onclick=()=>save();
  $('closeInspect').onclick=()=>$('inspector').classList.add('hidden');
  $('modalClose').onclick=()=>$('modal').classList.add('hidden');
  $('modal').addEventListener('click',e=>{if(e.target===$('modal'))$('modal').classList.add('hidden')});
  $('stageButtons').addEventListener('click',e=>{
    const btn=e.target.closest('button[data-stage]');if(!btn)return;
    if(setPreviewStage(state,state.selected,Number(btn.dataset.stage))){
      updateInspector();drawCrops(state.selected);save(true);
    }
  });
  const stick=$('joystick'),knob=stick.querySelector('.joystick-knob');
  const resetStick=()=>{joystick.x=0;joystick.y=0;joystick.id=null;knob.style.transform='translate(0,0)'};
  const readStick=e=>{
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
  window.KidscadeGame?.registerCleanup?.(()=>{save(true);disposed=true;cancelAnimationFrame(raf);renderer?.dispose()});
}
async function main(){
  init3D();ground=new THREE.Plane(new THREE.Vector3(0,1,0),-.15);
  bindControls();
  $('progressText').textContent='살펴본 논 '+visited.size+' / 4';$('progressBar').style.width=visited.size/4*100+'%';
  raf=requestAnimationFrame(render);
  await populate();
  loading=false;$('loading').classList.add('hidden');
  window.KidscadeGame?.start?.({source:'farm-prototype'});
  if(visited.size===0)toast('WASD 또는 왼쪽 조이스틱으로 움직여 보세요.');
}
main().catch(e=>{
  $('loadingText').textContent='농장을 불러오지 못했어요. 다시 열어 주세요.';
  console.error('[Korean Farm]',e);
});

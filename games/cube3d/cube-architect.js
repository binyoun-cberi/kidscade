(()=>{
'use strict';

class SimpleOrbit {
  constructor(camera, dom, target){
    this.camera=camera;this.dom=dom;this.target=(target||new THREE.Vector3()).clone();
    this.minDistance=2;this.maxDistance=40;this.maxPolarAngle=Math.PI*.49;this.enabled=true;
    this.dragging=false;this.moved=false;this.last={x:0,y:0};
    this.onDown=e=>{if(!this.enabled||e.button!==0)return;this.dragging=true;this.moved=false;this.last={x:e.clientX,y:e.clientY}};
    this.onMove=e=>{if(!this.enabled||!this.dragging)return;const dx=e.clientX-this.last.x,dy=e.clientY-this.last.y;if(Math.abs(dx)+Math.abs(dy)>1)this.moved=true;this.last={x:e.clientX,y:e.clientY};this.theta-=dx*.008;this.phi=THREE.MathUtils.clamp(this.phi+dy*.008,.12,this.maxPolarAngle);this.updatePosition()};
    this.onUp=()=>{this.dragging=false};
    this.onWheel=e=>{if(!this.enabled)return;this.radius=THREE.MathUtils.clamp(this.radius*(e.deltaY>0?1.09:.92),this.minDistance,this.maxDistance);this.updatePosition()};
    dom.addEventListener('pointerdown',this.onDown);window.addEventListener('pointermove',this.onMove);window.addEventListener('pointerup',this.onUp);dom.addEventListener('wheel',this.onWheel,{passive:true});
    this.syncFromCamera();
  }
  syncFromCamera(){const v=this.camera.position.clone().sub(this.target);this.radius=Math.max(.01,v.length());this.theta=Math.atan2(v.x,v.z);this.phi=Math.acos(THREE.MathUtils.clamp(v.y/this.radius,-1,1));this.updatePosition()}
  updatePosition(){this.radius=THREE.MathUtils.clamp(this.radius,this.minDistance,this.maxDistance);this.phi=THREE.MathUtils.clamp(this.phi,.12,this.maxPolarAngle);const sp=Math.sin(this.phi);this.camera.position.set(this.target.x+this.radius*sp*Math.sin(this.theta),this.target.y+this.radius*Math.cos(this.phi),this.target.z+this.radius*sp*Math.cos(this.theta));this.camera.lookAt(this.target)}
  update(){if(this.enabled)this.camera.lookAt(this.target)}
  dispose(){this.dom.removeEventListener('pointerdown',this.onDown);window.removeEventListener('pointermove',this.onMove);window.removeEventListener('pointerup',this.onUp);this.dom.removeEventListener('wheel',this.onWheel)}
}

const $ = (id) => document.getElementById(id);
const canvas = $('gameCanvas');
let renderer = null;
let loopStarted = false;

let scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera(55,innerWidth/innerHeight,.05,220);
let orbit = null;
let mode = 'home';
let pointerDown = null;
let pointerDragged = false;
let mobileModeEnabled=typeof canvas.requestPointerLock!=='function'||
  (typeof window.matchMedia==='function'&&window.matchMedia('(pointer: coarse)').matches);
let mobileMove={x:0,y:0};
let mobileLookPointerId=null,mobileLookLast=null,mobileJoyPointerId=null;
let mobileUtilityOpen=false;
let survivalInventoryTab='bag';
let firstJourney={phase:'idle',plan:null},journeyMarker=null,journeyUiAt=0;
let buildingWorks=[],worksOpen=false,projectGuide='';
let lifePanelOpen=false,lifePanelMode='',lifePanelTargetKey='',lifeCreatureTarget=null,survivalHome=null,trackedTarget=null;
let seatedFurniture=null,tamedCreatures={},tamingProgress={},petSerial=0;
const experience=window.CubeArchitectExperience;
let jumpQueuedUntil=0,lastGroundedAt=-Infinity,overlapSeconds=0;
const FREE_JUMP_SPEED=6.4;
let mobileRadialPointerId=null,mobileRadialTimer=0,mobileRadialOpen=false,mobileRadialSelected='';
let mobileRadialCenter={x:0,y:0},mobileRadialPressedAt=0;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let toastTimer = null;
let audioCtx = null;

function warmAudio(){
  try{
    if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();
    if(audioCtx.state==='suspended')audioCtx.resume();
    return audioCtx;
  }catch(_){return null}
}
function sfx(kind){
  try{
    const ctx=warmAudio();if(!ctx)return;
    const t=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();
    o.connect(g);g.connect(ctx.destination);
    if(kind==='place'){o.type='triangle';o.frequency.setValueAtTime(260,t);o.frequency.exponentialRampToValueAtTime(170,t+.08)}
    else if(kind==='break'){o.type='square';o.frequency.setValueAtTime(150,t);o.frequency.exponentialRampToValueAtTime(80,t+.09)}
    else if(kind==='mine'){o.type='triangle';o.frequency.setValueAtTime(190,t);o.frequency.exponentialRampToValueAtTime(125,t+.05)}
    else if(kind==='hit'){o.type='square';o.frequency.setValueAtTime(120,t);o.frequency.exponentialRampToValueAtTime(72,t+.07)}
    else if(kind==='warn'){o.type='sawtooth';o.frequency.setValueAtTime(330,t);o.frequency.exponentialRampToValueAtTime(250,t+.11)}
    else if(kind==='pickup'){o.type='sine';o.frequency.setValueAtTime(660,t);o.frequency.setValueAtTime(880,t+.055)}
    else if(kind==='good'){o.type='sine';o.frequency.setValueAtTime(520,t);o.frequency.setValueAtTime(780,t+.09)}
    else{o.type='sine';o.frequency.setValueAtTime(210,t);o.frequency.setValueAtTime(180,t+.08)}
    const quiet=kind==='mine'||kind==='warn'||kind==='pickup',short=kind==='mine'||kind==='hit';
    g.gain.setValueAtTime(quiet?.032:.055,t);g.gain.exponentialRampToValueAtTime(.0001,t+(short?.09:.16));
    o.start(t);o.stop(t+(short?.1:.18));
  }catch(e){}
}
function noiseBurst(duration=.08,gain=.012,cutoff=1200){
  try{
    if(!audioCtx||audioCtx.state!=='running')return;
    const ctx=audioCtx,t=ctx.currentTime,len=Math.max(1,Math.floor(ctx.sampleRate*duration));
    const buffer=ctx.createBuffer(1,len,ctx.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<len;i++)data[i]=(Math.random()*2-1)*(1-i/len);
    const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),g=ctx.createGain();
    filter.type='lowpass';filter.frequency.setValueAtTime(cutoff,t);
    g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    src.buffer=buffer;src.connect(filter);filter.connect(g);g.connect(ctx.destination);src.start(t);src.stop(t+duration);
  }catch(_){}
}
function stepSfx(type,land=false){
  if(!audioCtx||audioCtx.state!=='running')return;
  const soft=['grass','dirt','flower','leaves','pineLeaves'].includes(type);
  const sandy=['sand','redSand','gravel'].includes(type);
  const snowy=['snow','snowBrick'].includes(type);
  const woody=['log','pineLog','planks','workbench','door','roof','stairs','slab','woolMat'].includes(type);
  if(soft)noiseBurst(land?.09:.055,land?.016:.008,760);
  else if(sandy)noiseBurst(land?.1:.065,land?.018:.009,520);
  else if(snowy)noiseBurst(land?.11:.075,land?.014:.007,430);
  else{
    try{
      const ctx=audioCtx,t=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();
      o.type=woody?'triangle':'square';
      const base=woody?210:145;o.frequency.setValueAtTime(base+(land?18:0),t);o.frequency.exponentialRampToValueAtTime(base*.68,t+(land?.075:.045));
      g.gain.setValueAtTime(land?.028:.014,t);g.gain.exponentialRampToValueAtTime(.0001,t+(land?.1:.06));
      o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+(land?.11:.07));
    }catch(_){}
  }
}
function ambientSfx(kind){
  if(!audioCtx||audioCtx.state!=='running')return;
  if(kind==='rain')return noiseBurst(.42,.0055,2800);
  if(kind==='storm')return noiseBurst(.55,.009,1450);
  if(kind==='wind')return noiseBurst(.46,.0045,620);
  if(kind==='fire')return noiseBurst(.12,.008,3600);
  try{
    const ctx=audioCtx,t=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();
    if(kind==='birds'){o.type='sine';o.frequency.setValueAtTime(1180,t);o.frequency.exponentialRampToValueAtTime(1680,t+.12)}
    else if(kind==='marsh'){o.type='sine';o.frequency.setValueAtTime(260,t);o.frequency.exponentialRampToValueAtTime(190,t+.16)}
    else return;
    g.gain.setValueAtTime(.006,t);g.gain.exponentialRampToValueAtTime(.0001,t+.22);
    o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+.24);
  }catch(_){}
}
function toast(msg){
  const el=$('toast');el.textContent=msg;el.classList.add('show');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2200);
}
function setVisible(id,on){$(id).classList.toggle('hidden',!on)}
function modeTitle(title,sub){$('modeTitle').innerHTML='<b>'+title+'</b><small>'+sub+'</small>'}
function cleanScene(bg){
  if(orbit){orbit.dispose();orbit=null}
  scene = new THREE.Scene();
  scene.background = new THREE.Color(bg||0xcce8ff);
  scene.fog = null;
  scene.add(new THREE.HemisphereLight(0xffffff,0x69728c,1.35));
  const sun=new THREE.DirectionalLight(0xffffff,1.25);sun.position.set(10,18,9);sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);scene.add(sun);
}
function makeOrbit(target){
  orbit=new SimpleOrbit(camera,canvas,target||new THREE.Vector3());
}
function ensureRenderer(){
  if(renderer)return renderer;
  try{
    renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,mobileModeEnabled?1.5:2));
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    resize();
    return renderer;
  }catch(err){
    renderer=null;
    throw new Error('3D 화면을 시작하지 못했습니다. 브라우저의 WebGL 설정을 확인해 주세요. '+(err?.message||err));
  }
}
function ensureLoop(){if(loopStarted)return;loopStarted=true;last=performance.now();requestAnimationFrame(animate)}
function clearModeUi(){
  tutorialFinish(false);clearCampMarker();clearJourneyMarker();
  worksOpen=false;lifePanelOpen=false;$('buildingWorksPanel')?.classList.add('hidden');$('lifePanel')?.classList.add('hidden');$('journeyCard')?.classList.add('hidden');
  $('actionWorks')?.classList.add('hidden');
  ['challengePanel','challengeFlyHud','netPanel','freeHud','dungeonHud','mobileControls','blueprintModal','resultCard','tutorial'].forEach(id=>setVisible(id,false));
  blueprintModalOpen=false;
  resetMobileInput();
  $('underwaterOverlay')?.classList.remove('active');
  $('topbar').classList.add('hidden');
  $('homeScreen').classList.add('hidden');
  document.body.classList.remove('simple-survival','survival-more');
  $('actionCheck').classList.add('hidden');
  $('actionNext').classList.add('hidden');
  $('actionSave').classList.add('hidden');
  $('actionXray').classList.add('hidden');
  $('actionAvatar')?.classList.add('hidden');
  $('actionView')?.classList.add('hidden');
}
function showHome(){
  if(mode==='free')saveFreeWorld();
  if(mode==='challenge'&&restorationSession)restorationSession=null;
  if(mode==='dungeon')dungeonSession=null;
  if(document.pointerLockElement===canvas)document.exitPointerLock?.();
  ensureRenderer();ensureLoop();mode='home';clearModeUi();$('homeScreen').classList.remove('hidden');
  cleanScene(0xd6efff);camera.position.set(8,7,9);camera.lookAt(0,1,0);
  const g=new THREE.GridHelper(16,16,0xffffff,0xb7cbe0);scene.add(g);
  const mats=[0x5a67f2,0x23b7a4,0xf6c453,0xe9798f,0x7e69d7];
  for(let i=0;i<18;i++){
    const m=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:mats[i%mats.length],roughness:.72}));
    m.position.set((i%6)-2.5,.5+Math.floor(i/6),-1.5+((i*3)%5)*.45);m.rotation.y=(i%2)*.1;scene.add(m);
  }
  makeOrbit(new THREE.Vector3(0,1,0));
}
function enterMode(next){
  if(mode==='free')saveFreeWorld();
  ensureRenderer();ensureLoop();clearModeUi();$('topbar').classList.remove('hidden');mode=next;
  if(document.pointerLockElement===canvas) document.exitPointerLock?.();
  if(next==='challenge') initChallenge();
  if(next==='dungeon') initDungeon();
  if(next==='net') initNet();
  if(next==='free'||next==='creative'){
    gameFreeMode=next==='creative'?'creative':'survival';
    mode='free';initFree();
  }
}
$('homeBtn').addEventListener('click',showHome);

function roundedRect(ctx,x,y,w,h,r){
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
}

/* ---------------- 설계도 챌린지 ---------------- */
const blockGeo=new THREE.BoxGeometry(.96,.96,.96);
const edgeGeo=new THREE.EdgesGeometry(blockGeo);
const challengeMat=new THREE.MeshStandardMaterial({color:0xf2d19a,roughness:.78});
let CHALLENGE_SIZE=18,CHALLENGE_HALF=CHALLENGE_SIZE/2,CHALLENGE_MAX_Y=13;
let challengeShapeMode='cube',challengeTool='build',challengeSelected=null,challengeOverlay=null,challengeSelectedElement=0;
let challengeTint='#ff7043',blueprintAngle='iso',blueprintModalOpen=false;
let challengeBlocks=new Map(),challengeMeshes=[],challengePlane=null,challengeGhost=null,targetGhosts=[],missionIndex=0;
let challengeYaw=0,challengePitch=0,challengeKeys={},challengeDifficulty='easy';

function makeChallengeShape(build){
  const map=new Map();
  const add=(x,y,z)=>map.set(challengeKey(x,y,z),[x,y,z]);
  const box=(x0,z0,w,d,h,y0=0)=>{
    for(let x=x0;x<x0+w;x++)for(let z=z0;z<z0+d;z++)for(let y=y0;y<y0+h;y++)add(x,y,z);
  };
  const remove=(x,y,z)=>map.delete(challengeKey(x,y,z));
  build({add,box,remove});
  return Array.from(map.values());
}
const challengeMissionSets={
  easy:[
    {name:'교과서 1 · 기본 직육면체',kind:'교과서형',tip:'가로 4칸, 세로 3칸, 높이 2칸의 기본 직육면체예요.',blocks:makeChallengeShape(({box})=>box(2,2,4,3,2))},
    {name:'교과서 2 · 2층 직육면체',kind:'교과서형',tip:'아래층의 크기와 위층이 시작되는 위치를 비교해 보세요.',blocks:makeChallengeShape(({box})=>{box(2,2,5,3,1);box(3,2,3,3,2,1)})},
    {name:'교과서 3 · 계단 모양',kind:'교과서형',tip:'높이가 1칸, 2칸, 3칸으로 한 단계씩 올라가요.',blocks:makeChallengeShape(({box})=>{box(2,2,1,3,1);box(3,2,1,3,2);box(4,2,1,3,3)})},
    {name:'교과서 4 · ㄱ자 건물',kind:'교과서형',tip:'위에서 보았을 때 ㄱ자가 되도록 두 직육면체가 만나요.',blocks:makeChallengeShape(({box})=>{box(2,2,5,2,2);box(2,4,2,3,2)})},
    {name:'교과서 5 · 문이 있는 다리',kind:'교과서형',tip:'양쪽 기둥의 높이가 같고, 위쪽 직육면체가 두 기둥을 연결해요.',blocks:makeChallengeShape(({box})=>{box(2,2,1,3,4);box(6,2,1,3,4);box(3,2,3,3,1,3)})},
    {name:'교과서 6 · 높이가 다른 두 건물',kind:'교과서형',tip:'같은 바닥 위에 높이가 다른 두 덩어리가 붙어 있어요.',blocks:makeChallengeShape(({box})=>{box(2,2,5,3,1);box(2,2,2,3,3,1);box(5,2,2,3,2,1)})}
  ],
  hard:window.CubeArchitectLandmarks()
};
function activeChallengeMissions(){return challengeMissionSets[challengeDifficulty]}
function currentChallengeMission(){return activeChallengeMissions()[missionIndex]}
function updateChallengeDifficultyUI(){
  $('challengeEasy')?.classList.toggle('active',challengeDifficulty==='easy');
  $('challengeHard')?.classList.toggle('active',challengeDifficulty==='hard');
  const total=activeChallengeMissions().length;
  if(restorationSession){
    const poi=poiRules.poiById(restorationSession.poiId);
    if($('challengeCourseLabel'))$('challengeCourseLabel').textContent='던전 최심부 · '+poi.name+' 설계실';
    modeTitle('고대 설계실',poi.name+' · '+poi.tech.label+' 해금');
  }else{
    if($('challengeCourseLabel'))$('challengeCourseLabel').textContent=(challengeDifficulty==='easy'?'쉬움 · 교과서형 ':'어려움 · 랜드마크형 ')+(missionIndex+1)+'/'+total;
    modeTitle('설계도 챌린지',challengeDifficulty==='easy'?'쉬움 · 교과서 겨냥도':'어려움 · 랜드마크 복원');
  }
}
function setChallengeDifficulty(level){
  if(restorationSession)return;
  if(level===challengeDifficulty)return;
  challengeDifficulty=level;missionIndex=0;
  // The hard course has its own 32×32 building area and 28-cell height.
  enterMode('challenge');
}
function challengeKey(x,y,z){return x+','+y+','+z}
function challengeDims(){
  if(challengeShapeMode==='cube')return [1,1,1];
  return [$('challengeDimX').value,$('challengeDimY').value,$('challengeDimZ').value]
    .map(n=>THREE.MathUtils.clamp(Math.round(Number(n)||1),1,8));
}
function addChallengeCuboid(x,y,z,dims=[1,1,1],quiet=false){
  const [dx,dy,dz]=dims;
  for(let a=x;a<x+dx;a++)for(let b=y;b<y+dy;b++)for(let c=z;c<z+dz;c++){
    if(a<0||a>=CHALLENGE_SIZE||c<0||c>=CHALLENGE_SIZE||b<0||b>CHALLENGE_MAX_Y)return false;
    if(challengeBlocks.has(challengeKey(a,b,c)))return false;
  }
  const geo=new THREE.BoxGeometry(dx-.04,dy-.04,dz-.04);
  const faceColors=Array(6).fill('#f2d19a');
  const mesh=new THREE.Mesh(geo,faceColors.map(color=>new THREE.MeshStandardMaterial({color,roughness:.77})));
  mesh.position.set(x-CHALLENGE_HALF+dx/2,y+dy/2,z-CHALLENGE_HALF+dz/2);
  mesh.castShadow=true;mesh.receiveShadow=true;
  const members=[];
  for(let a=x;a<x+dx;a++)for(let b=y;b<y+dy;b++)for(let c=z;c<z+dz;c++){
    const k=challengeKey(a,b,c);members.push(k);challengeBlocks.set(k,mesh);
  }
  mesh.userData={cx:x,cy:y,cz:z,challenge:true,dims:dims.slice(),members,
    faceColors,edgeColors:Array(12).fill(null),vertexColors:Array(8).fill(null)};
  const border=new THREE.LineSegments(new THREE.EdgesGeometry(geo),
    new THREE.LineBasicMaterial({color:0x8b633c,transparent:true,opacity:.57}));
  mesh.add(border);
  scene.add(mesh);challengeMeshes.push(mesh);
  if(!quiet){sfx('place');tutorialSignal('challenge-place')}return true;
}
function addChallengeBlock(x,y,z,quiet){return addChallengeCuboid(x,y,z,[1,1,1],quiet)}
function clearChallengeOverlay(){
  if(challengeOverlay){scene.remove(challengeOverlay);challengeOverlay=null}
}
function removeChallengeBlock(mesh){
  if(!mesh?.userData?.challenge)return;
  for(const key of mesh.userData.members)challengeBlocks.delete(key);
  scene.remove(mesh);challengeMeshes=challengeMeshes.filter(item=>item!==mesh);
  if(challengeSelected===mesh){challengeSelected=null;clearChallengeOverlay();updateChallengeEditor()}
  sfx('break');tutorialSignal('challenge-break');
}
function clearChallenge(){
  challengeMeshes.forEach(m=>scene.remove(m));challengeMeshes=[];challengeBlocks.clear();
  challengeSelected=null;clearChallengeOverlay();clearTargetGhosts();
  $('resultCard').classList.add('hidden');updateChallengeEditor();updateChallengeStats();
}
function updateChallengeStats(){
  const mission=currentChallengeMission(),hard=challengeDifficulty==='hard';
  let placed=challengeBlocks.size,target=mission.blocks.length;
  if(hard){
    const user=normalizedShape(Array.from(challengeBlocks.keys(),key=>key.split(',').map(Number))).points;
    placed=projectionSet(user,'top').size+projectionSet(user,'front').size+projectionSet(user,'side').size;
    target=projectionSet(mission.blocks,'top').size+
      projectionSet(mission.blocks,'front').size+projectionSet(mission.blocks,'side').size;
  }
  $('placedCount').textContent=placed;$('targetCount').textContent=target;
  $('placedCount').parentElement.querySelector('span').textContent=hard?'내 투영 칸':'놓은 블록';
  $('targetCount').parentElement.querySelector('span').textContent=hard?'설계 투영 칸':'설계 규모';
  const maxY=Math.max(0,...Array.from(challengeBlocks.values()).map(m=>m.userData.cy+1));$('heightCount').textContent=maxY;
}
function setChallengeTool(tool){
  challengeTool=tool;challengeSelectedElement=0;updateChallengeEditor();drawChallengeSelection();
  updateChallengeGhost();
}
function selectLookedChallengePiece(){
  const hit=challengeCenterHit(12);
  if(!hit?.object?.userData?.challenge){toast('편집할 정육면체나 직육면체를 십자선으로 가리켜 주세요.');return}
  challengeSelected=hit.object;
  updateChallengeEditor();drawChallengeSelection();
  toast('도형 선택: '+challengeSelected.userData.dims.join('×')+' · 면 6개, 모서리 12개, 꼭짓점 8개');
  if(document.pointerLockElement===canvas)document.exitPointerLock?.();
}
function applyChallengeElement(index){
  if(!challengeSelected||!challengeMeshes.includes(challengeSelected)){toast('먼저 도형을 선택해 주세요.');return}
  const data=challengeSelected.userData;challengeSelectedElement=index;
  if(challengeTool==='face'){
    data.faceColors[index]=challengeTint;
    challengeSelected.material[index].color.set(challengeTint);
  }else if(challengeTool==='edge')data.edgeColors[index]=challengeTint;
  else if(challengeTool==='vertex')data.vertexColors[index]=challengeTint;
  updateChallengeEditor();drawChallengeSelection();sfx('place');
}
function paintLookedChallengeFace(){
  const hit=challengeCenterHit(12);
  if(!hit?.object?.userData?.challenge||!hit.face){toast('색칠할 면을 십자선으로 가리켜 주세요.');return}
  challengeSelected=hit.object;
  setChallengeTool('face');
  applyChallengeElement(THREE.MathUtils.clamp(hit.face.materialIndex??0,0,5));
}
function updateChallengeEditor(){
  for(const [id,tool] of [['challengeToolBuild','build'],['challengeToolFace','face'],
    ['challengeToolEdge','edge'],['challengeToolVertex','vertex']])
    $(id).classList.toggle('active',challengeTool===tool);
  $('challengeBuildOptions').classList.toggle('hidden',challengeTool!=='build');
  $('challengeDetailOptions').classList.toggle('hidden',challengeTool==='build');
  $('challengeCube').classList.toggle('active',challengeShapeMode==='cube');
  $('challengeCuboid').classList.toggle('active',challengeShapeMode==='cuboid');
  $('challengeDims').classList.toggle('hidden',challengeShapeMode!=='cuboid');
  $('challengeColor').value=challengeTint;
  const selected=challengeSelected&&challengeMeshes.includes(challengeSelected)?challengeSelected:null;
  $('challengeSelectedName').textContent=selected?
    '선택: '+selected.userData.dims.join('×')+' · 면 6 / 모서리 12 / 꼭짓점 8':'선택한 도형 없음';
  const choices=$('challengeElementChoices');choices.innerHTML='';
  if(challengeTool==='build')return;
  const names=challengeTool==='face'?['오른쪽','왼쪽','위','아래','앞','뒤']:
    challengeTool==='edge'?CUBOID_TOPOLOGY.edges.map(edge=>edge.join('')):CUBOID_TOPOLOGY.vertices.map(v=>v.id);
  const colors=selected?.userData[challengeTool==='face'?'faceColors':challengeTool==='edge'?'edgeColors':'vertexColors']||[];
  names.forEach((name,i)=>{
    const b=document.createElement('button');
    b.type='button';b.className=challengeSelectedElement===i?'active':'';
    const color=colors[i]||'#dce2eb';
    const chip=document.createElement('i');chip.style.background=color;b.appendChild(chip);
    b.appendChild(document.createTextNode(name));b.onclick=()=>applyChallengeElement(i);
    choices.appendChild(b);
  });
}
function drawChallengeSelection(){
  clearChallengeOverlay();
  if(!challengeSelected||!challengeMeshes.includes(challengeSelected)||challengeTool==='build')return;
  const piece=challengeSelected,data=piece.userData,[dx,dy,dz]=data.dims;
  const group=new THREE.Group(),verts=new Map();
  for(const v of CUBOID_TOPOLOGY.vertices)
    verts.set(v.id,new THREE.Vector3(piece.position.x+v.s[0]*dx/2,
      piece.position.y+v.s[1]*dy/2,piece.position.z+v.s[2]*dz/2));
  if(challengeTool==='edge'){
    CUBOID_TOPOLOGY.edges.forEach(([a,b],i)=>{
      const c=data.edgeColors[i]||(i===challengeSelectedElement?'#f49b46':'#bbc5d4');
      const geometry=new THREE.BufferGeometry().setFromPoints([verts.get(a),verts.get(b)]);
      const line=new THREE.Line(geometry,new THREE.LineBasicMaterial({
        color:c,transparent:true,opacity:data.edgeColors[i]||i===challengeSelectedElement?1:.62,depthTest:false
      }));
      line.renderOrder=45;group.add(line);
    });
  }else if(challengeTool==='vertex'){
    CUBOID_TOPOLOGY.vertices.forEach((v,i)=>{
      const color=data.vertexColors[i]||(i===challengeSelectedElement?'#f49b46':'#b6c1d3');
      const dot=new THREE.Mesh(new THREE.SphereGeometry(.12,10,8),
        new THREE.MeshBasicMaterial({color,depthTest:false,transparent:true,
          opacity:data.vertexColors[i]||i===challengeSelectedElement?1:.68}));
      dot.position.copy(verts.get(v.id));dot.renderOrder=46;group.add(dot);
    });
  }else{
    const outline=new THREE.LineSegments(new THREE.EdgesGeometry(piece.geometry),
      new THREE.LineBasicMaterial({color:0x5967ee,depthTest:false}));
    outline.position.copy(piece.position);outline.renderOrder=44;group.add(outline);
  }
  challengeOverlay=group;scene.add(group);
}
function toggleBlueprintModal(open){
  blueprintModalOpen=!!open;
  $('blueprintModal').classList.toggle('hidden',!blueprintModalOpen);
  if(blueprintModalOpen){
    $('blueprintModalTitle').textContent=currentChallengeMission().name+' · '+$('blueprintView').selectedOptions[0].text;
    if(document.pointerLockElement===canvas)document.exitPointerLock?.();
    renderBlueprint($('blueprintLargeCanvas'),blueprintAngle);
  }
}
function shadedHex(hex,shade=1){
  const n=parseInt((hex||'#d7c09a').replace('#',''),16);
  return '#'+[16,8,0].map(shift=>Math.min(255,Math.max(0,Math.round(((n>>shift)&255)*shade)))
    .toString(16).padStart(2,'0')).join('');
}
function renderBlueprint(canvas,angle='iso'){
  const ctx=canvas.getContext('2d'),m=currentChallengeMission(),hard=challengeDifficulty==='hard';
  const w=canvas.width,h=canvas.height,blocks=m.blocks;
  ctx.clearRect(0,0,w,h);ctx.fillStyle=hard?'#f5f0ff':'#ebf6ff';ctx.fillRect(0,0,w,h);
  ctx.strokeStyle=hard?'rgba(107,80,160,.10)':'rgba(74,110,150,.10)';ctx.lineWidth=1;
  for(let x=0;x<w;x+=24){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke()}
  for(let y=0;y<h;y+=24){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}
  const lookup=m._blockSet||(m._blockSet=new Set(blocks.map(p=>challengeKey(...p))));
  const labelH=h>450?85:62,margin=w>500?26:13;
  const baseColor=p=>hard?(m.colors?.[challengeKey(...p)]||'#ddc9a8'):'#edc88f';
  function header(){
    ctx.fillStyle='#283349';ctx.font='900 '+(w>500?24:15)+'px system-ui';
    ctx.fillText(m.name,margin,w>500?34:22);
    ctx.fillStyle=hard?'#7b60a2':'#65758b';ctx.font='800 '+(w>500?14:10)+'px system-ui';
    ctx.fillText(angle==='iso'?'겨냥도 · 외부에서 보이는 면':angle==='front'?'정면도 · 추가 힌트':
      angle==='side'?'측면도 · 추가 힌트':'윗면도 · 추가 힌트',margin,w>500?59:41);
  }
  if(angle!=='iso'){
    const chosen=new Map();
    // Furthest surface in the chosen viewing direction wins per projected cell.
    for(const p of blocks){
      const [x,y,z]=p;
      const coords=angle==='top'?[x,z,y,[0,1,0]]:
        angle==='front'?[x,-y,z,[0,0,1]]:[z,-y,x,[1,0,0]];
      const [a,b,depth,dir]=coords,k=a+','+b;
      if(lookup.has(challengeKey(x+dir[0],y+dir[1],z+dir[2])))continue;
      if(!chosen.has(k)||chosen.get(k).depth<depth)chosen.set(k,{a,b,depth,p});
    }
    const cells=[...chosen.values()];
    if(cells.length){
      const minX=Math.min(...cells.map(c=>c.a)),maxX=Math.max(...cells.map(c=>c.a));
      const minY=Math.min(...cells.map(c=>c.b)),maxY=Math.max(...cells.map(c=>c.b));
      const unit=Math.min(w>500?34:22,(w-2*margin)/(maxX-minX+1),
        (h-labelH-margin)/(maxY-minY+1));
      const ox=(w-(maxX-minX+1)*unit)/2,oy=labelH+(h-labelH-(maxY-minY+1)*unit)/2;
      for(const c of cells){
        ctx.fillStyle=shadedHex(baseColor(c.p),angle==='top'?1.06:angle==='side'?.78:.92);
        const px=ox+(c.a-minX)*unit,py=oy+(c.b-minY)*unit;
        ctx.fillRect(px,py,unit,unit);
        if(unit>=7){ctx.strokeStyle='rgba(48,57,75,.42)';ctx.lineWidth=w>500?1.2:.7;ctx.strokeRect(px,py,unit,unit)}
      }
    }
  }else{
    const faces=[];
    const cubes=blocks.slice().sort((a,b)=>(a[0]+a[2]+a[1])-(b[0]+b[2]+b[1]));
    for(const p of cubes){
      const [x,y,z]=p,sx=x-z,sy=(x+z)*.5-y;
      if(!lookup.has(challengeKey(x,y+1,z)))faces.push({kind:'top',pts:[[sx,sy-1],[sx+1,sy-.5],[sx,sy],[sx-1,sy-.5]],p});
      if(!lookup.has(challengeKey(x,y,z+1)))faces.push({kind:'left',pts:[[sx-1,sy-.5],[sx,sy],[sx,sy+1],[sx-1,sy+.5]],p});
      if(!lookup.has(challengeKey(x+1,y,z)))faces.push({kind:'right',pts:[[sx+1,sy-.5],[sx,sy],[sx,sy+1],[sx+1,sy+.5]],p});
    }
    const pts=faces.flatMap(f=>f.pts);
    if(pts.length){
      const minX=Math.min(...pts.map(p=>p[0])),maxX=Math.max(...pts.map(p=>p[0]));
      const minY=Math.min(...pts.map(p=>p[1])),maxY=Math.max(...pts.map(p=>p[1]));
      const unit=Math.min(w>500?30:23,(w-2*margin)/Math.max(1,maxX-minX),
        (h-labelH-margin)/Math.max(1,maxY-minY));
      const ox=w/2-(minX+maxX)*unit/2,oy=labelH+(h-labelH)/2-(minY+maxY)*unit/2;
      for(const f of faces){
        const shade=f.kind==='top'?1.09:f.kind==='left'?.75:.90;
        const fill=hard?shadedHex(baseColor(f.p),shade):
          (f.kind==='top'?'#fff1c5':f.kind==='left'?'#dcae72':'#efc98d');
        ctx.beginPath();ctx.moveTo(ox+f.pts[0][0]*unit,oy+f.pts[0][1]*unit);
        for(let i=1;i<f.pts.length;i++)ctx.lineTo(ox+f.pts[i][0]*unit,oy+f.pts[i][1]*unit);
        ctx.closePath();ctx.fillStyle=fill;ctx.fill();
        ctx.strokeStyle=hard?'rgba(69,62,80,.65)':'#4b5b72';
        ctx.lineWidth=Math.max(.52,unit/24);ctx.stroke();
      }
    }
  }
  header();
}
function drawBlueprint(){
  const m=currentChallengeMission();renderBlueprint($('blueprintCanvas'),blueprintAngle);
  if(blueprintModalOpen){
    $('blueprintModalTitle').textContent=m.name+' · '+$('blueprintView').selectedOptions[0].text;
    renderBlueprint($('blueprintLargeCanvas'),blueprintAngle);
  }
  $('missionName').textContent=m.name;$('missionTip').textContent=m.tip;
  updateChallengeDifficultyUI();updateChallengeStats();
}

function restorationKeep(role,x,y,z){
  const baseRate=role==='base'?.94:role==='body'?.78:
    (role==='tower'||role==='arch')?.64:
    (role==='roof'||role==='dome'||role==='spire')?.55:.38;
  const name=currentChallengeMission()?.name||'';
  const balance=name.includes('타워 브리지')?-.08:
    name.includes('앙코르와트')?-.035:
    (name.includes('사그라다 파밀리아')||name.includes('히메지성'))?.04:
    (name.includes('타지마할')||name.includes('에펠탑'))?.02:0;
  const rate=Math.max(.08,Math.min(.985,baseRate+balance));
  // Landmark-specific damage keeps the remaining work near 8–10 meaningful cuboid placements.
  const gx=Math.floor(x/4),gy=Math.floor(y/3),gz=Math.floor(z/4);
  return hash2(gx*17+gy*5,gz*19-gy*3)<rate;
}
function decomposeVoxelSet(points){
  const remaining=new Set(points.map(p=>challengeKey(...p))),boxes=[];
  const sorted=()=>[...remaining].map(k=>k.split(',').map(Number))
    .sort((a,b)=>a[1]-b[1]||a[2]-b[2]||a[0]-b[0]);
  while(remaining.size){
    const [x0,y0,z0]=sorted()[0];
    let dx=1,dz=1,dy=1;
    while(remaining.has(challengeKey(x0+dx,y0,z0)))dx++;
    outerZ:while(true){
      for(let x=x0;x<x0+dx;x++)
        if(!remaining.has(challengeKey(x,y0,z0+dz)))break outerZ;
      dz++;
    }
    outerY:while(true){
      for(let x=x0;x<x0+dx;x++)for(let z=z0;z<z0+dz;z++)
        if(!remaining.has(challengeKey(x,y0+dy,z)))break outerY;
      dy++;
    }
    boxes.push([x0,y0,z0,dx,dy,dz]);
    for(let x=x0;x<x0+dx;x++)for(let y=y0;y<y0+dy;y++)for(let z=z0;z<z0+dz;z++)
      remaining.delete(challengeKey(x,y,z));
  }
  return boxes;
}
function seedRestorationChallenge(){
  if(!restorationSession)return;
  const mission=currentChallengeMission(),kept=[];
  for(const p of mission.blocks){
    const role=mission.roles?.[challengeKey(...p)]||'body';
    if(restorationKeep(role,...p))kept.push(p);
  }
  for(const [x,y,z,dx,dy,dz] of decomposeVoxelSet(kept))
    addChallengeCuboid(x,y,z,[dx,dy,dz],true);
  const targetSet=new Set(mission.blocks.map(p=>challengeKey(...p)));
  const outer=mission.blocks.filter(p=>isOuterVoxel(targetSet,p));
  const keptSet=new Set(kept.map(p=>challengeKey(...p)));
  restorationSession.seedPercent=Math.round(
    outer.filter(p=>keptSet.has(challengeKey(...p))).length/Math.max(1,outer.length)*100);
}
function initChallenge(){
  if(restorationSession){challengeDifficulty='hard';missionIndex=restorationSession.missionIndex}
  setVisible('challengePanel',true);setVisible('challengeFlyHud',true);$('actionCheck').classList.remove('hidden');$('actionNext').classList.remove('hidden');
  CHALLENGE_SIZE=challengeDifficulty==='hard'?32:18;
  CHALLENGE_HALF=CHALLENGE_SIZE/2;CHALLENGE_MAX_Y=challengeDifficulty==='hard'?27:13;
  cleanScene(0xeaf6ff);
  camera.position.set(1.5,3.1,6);camera.rotation.order='YXZ';challengeYaw=.25;challengePitch=-.50;challengeKeys={};updateChallengeCamera();
  const planeMat=new THREE.MeshBasicMaterial({transparent:true,opacity:0,side:THREE.DoubleSide});
  challengePlane=new THREE.Mesh(new THREE.PlaneGeometry(CHALLENGE_SIZE,CHALLENGE_SIZE),planeMat);challengePlane.rotation.x=-Math.PI/2;challengePlane.position.y=.001;challengePlane.userData.base=true;scene.add(challengePlane);
  const grid=new THREE.GridHelper(CHALLENGE_SIZE,CHALLENGE_SIZE,0x5269c7,0xa9c2da);grid.position.y=.01;scene.add(grid);
  challengeGhost=new THREE.Mesh(blockGeo,new THREE.MeshBasicMaterial({color:0x5a67f2,transparent:true,opacity:.3,depthWrite:false}));challengeGhost.visible=false;scene.add(challengeGhost);
  challengeBlocks=new Map();challengeMeshes=[];targetGhosts=[];challengeSelected=null;challengeShapeMode='cube';challengeTool='build';challengeSelectedElement=0;
  if(restorationSession)seedRestorationChallenge();
  $('blueprintView').value='iso';blueprintAngle='iso';updateChallengeEditor();
  updateChallengeDifficultyUI();drawBlueprint();
  if(restorationSession){
    $('missionTip').textContent='설계실의 손상된 축소 모형이 '+restorationSession.seedPercent+
      '%까지 남아 있어요. 외형 85% 이상으로 완성해 건축 원리를 해독하세요. '+currentChallengeMission().tip;
  }
  $('challengeEasy').disabled=!!restorationSession;$('challengeHard').disabled=!!restorationSession;
  $('challengeEasy').onclick=()=>setChallengeDifficulty('easy');$('challengeHard').onclick=()=>setChallengeDifficulty('hard');
  $('actionCheck').textContent='검사하기';$('actionCheck').disabled=false;$('actionCheck').onclick=checkChallenge;
  if(restorationSession){
    $('actionNext').textContent='월드로 돌아가기';$('actionNext').onclick=returnFromRestoration;
    $('mobileNext').textContent='귀환';
  }else{
    $('mobileNext').textContent='다음';
    $('actionNext').textContent='다음 미션';
    $('actionNext').onclick=()=>{missionIndex=(missionIndex+1)%activeChallengeMissions().length;clearChallenge();drawBlueprint()};
  }
  $('clearChallenge').onclick=clearChallenge;$('hintChallenge').onclick=()=>{$('blueprintView').value='top';blueprintAngle='top';drawBlueprint();toast('윗면도를 열었어요. '+currentChallengeMission().tip)};
  $('blueprintView').onchange=e=>{blueprintAngle=e.target.value;drawBlueprint()};
  $('blueprintZoom').onclick=()=>toggleBlueprintModal(true);
  $('blueprintClose').onclick=()=>toggleBlueprintModal(false);
  $('challengeCube').onclick=()=>{challengeShapeMode='cube';updateChallengeEditor()};
  $('challengeCuboid').onclick=()=>{challengeShapeMode='cuboid';updateChallengeEditor()};
  [['challengeToolBuild','build'],['challengeToolFace','face'],['challengeToolEdge','edge'],['challengeToolVertex','vertex']]
    .forEach(([id,name])=>$(id).onclick=()=>setChallengeTool(name));
  $('challengeSelect').onclick=selectLookedChallengePiece;
  $('challengeColor').oninput=e=>{challengeTint=e.target.value};
  configureMobileMode('challenge');$('challengeLockNotice').onclick=()=>{tutorialSignal('start-control');requestGamePointerLock()};
  showTutorial('challenge');
}
function challengeCenterHit(max=8){
  raycaster.setFromCamera(new THREE.Vector2(0,0),camera);
  const hit=raycaster.intersectObjects(challengeMeshes.concat([challengePlane]),false)[0]||null;
  return hit&&hit.distance<=max?hit:null;
}
function challengePlaceTarget(hit){
  if(!hit)return null;
  if(hit.object===challengePlane)
    return {x:Math.floor(hit.point.x+CHALLENGE_HALF),y:0,z:Math.floor(hit.point.z+CHALLENGE_HALF)};
  const n=hit.face?.normal;
  if(!n)return null;
  const p=hit.point.clone().addScaledVector(n,.53);
  return {x:Math.floor(p.x+CHALLENGE_HALF),y:Math.floor(p.y),z:Math.floor(p.z+CHALLENGE_HALF)};
}
function updateChallengeGhost(){
  if(!challengeGhost)return;
  const hit=challengeCenterHit(),p=challengePlaceTarget(hit),dims=challengeDims();
  const valid=p&&p.x>=0&&p.x+dims[0]<=CHALLENGE_SIZE&&p.z>=0&&p.z+dims[2]<=CHALLENGE_SIZE&&
    p.y>=0&&p.y+dims[1]-1<=CHALLENGE_MAX_Y;
  let available=!!valid;
  if(available)for(let a=p.x;a<p.x+dims[0];a++)for(let b=p.y;b<p.y+dims[1];b++)
    for(let c=p.z;c<p.z+dims[2];c++)if(challengeBlocks.has(challengeKey(a,b,c)))available=false;
  challengeGhost.visible=available&&challengeTool==='build';
  if(available){
    const prior=challengeGhost.userData.dims||[];
    if(dims.some((d,i)=>d!==prior[i])){
      challengeGhost.geometry.dispose();challengeGhost.geometry=new THREE.BoxGeometry(dims[0]-.04,dims[1]-.04,dims[2]-.04);
      challengeGhost.userData.dims=dims.slice();
    }
    challengeGhost.position.set(p.x-CHALLENGE_HALF+dims[0]/2,p.y+dims[1]/2,p.z-CHALLENGE_HALF+dims[2]/2);
  }
}
function clearTargetGhosts(){targetGhosts.forEach(m=>scene.remove(m));targetGhosts=[]}
function normalizedShape(points){
  if(!points.length)return {keys:new Set(),min:[0,0,0],points:[]};
  const minX=Math.min(...points.map(p=>p[0])),minY=Math.min(...points.map(p=>p[1])),minZ=Math.min(...points.map(p=>p[2]));
  const norm=points.map(p=>[p[0]-minX,p[1]-minY,p[2]-minZ]);
  return {keys:new Set(norm.map(p=>challengeKey(...p))),min:[minX,minY,minZ],points:norm};
}
function rotateShapeY(points,turn){
  let out=points.map(p=>p.slice());
  for(let t=0;t<turn;t++)out=out.map(([x,y,z])=>[-z,y,x]);
  return normalizedShape(out).points;
}
function projectionSet(points,view){
  const result=new Set();
  for(const [x,y,z] of points)
    result.add(view==='top'?x+','+z:view==='front'?x+','+y:z+','+y);
  return result;
}
function overlapScore(a,b){
  if(!a.size&&!b.size)return 100;
  let matching=0;for(const key of a)if(b.has(key))matching++;
  return Math.round(matching/Math.max(1,a.size+b.size-matching)*100);
}
function bestChallengeMatch(){
  const userPoints=Array.from(challengeBlocks.keys(),key=>key.split(',').map(Number));
  const user=normalizedShape(userPoints),mission=currentChallengeMission(),targetRaw=mission.blocks;
  const hard=challengeDifficulty==='hard',views=['top','front','side'];
  const userProjections=hard?views.map(view=>projectionSet(user.points,view)):null;
  let best={common:0,union:Infinity,score:-1,target:null,targetKeys:new Set(),user,turn:0,views:[]};
  for(let turn=0;turn<4;turn++){
    const target=normalizedShape(rotateShapeY(targetRaw,turn));
    let common=0;for(const key of user.keys)if(target.keys.has(key))common++;
    const union=new Set([...user.keys,...target.keys]).size;
    const viewScores=hard?views.map((view,i)=>overlapScore(userProjections[i],projectionSet(target.points,view))):[];
    const score=hard?Math.round(viewScores.reduce((a,b)=>a+b,0)/viewScores.length):
      (union?Math.round(common/union*100):0);
    if(score>best.score||(score===best.score&&common>best.common))
      best={common,union,score,target,targetKeys:target.keys,user,turn,views:viewScores};
  }
  return best;
}
function isOuterVoxel(set,p){
  const [x,y,z]=p;
  return [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]
    .some(d=>!set.has(challengeKey(x+d[0],y+d[1],z+d[2])));
}
function checkChallenge(){
  clearTargetGhosts();
  const match=bestChallengeMatch(),hard=challengeDifficulty==='hard';
  let restorationScore=null;
  if(restorationSession&&hard){
    const outer=match.target.points.filter(p=>isOuterVoxel(match.targetKeys,p));
    const common=outer.filter(p=>match.user.keys.has(challengeKey(...p))).length;
    restorationScore=Math.round(common/Math.max(1,outer.length)*100);
  }
  const shownScore=restorationScore===null?match.score:restorationScore;
  $('resultCard').classList.remove('hidden');$('resultScore').textContent=shownScore+'%';
  if(!match.user.keys.size){
    $('resultText').textContent='아직 건축한 블록이 없어요. 설계도를 보고 첫 직육면체부터 만들어 보세요.';
    return;
  }
  const origin=match.user.min;
  const completed=restorationSession?restorationScore>=85:(hard?match.score>=85:match.score===100);
  if(!completed){
    if(!hard){
      // Do not overwrite any painted face. Error indications are separate outlines.
      let shown=0;
      for(const mesh of challengeMeshes){
        if(shown>=65)break;
        if(mesh.userData.members.every(k=>{
          const [x,y,z]=k.split(',').map(Number);
          return match.targetKeys.has(challengeKey(x-origin[0],y-origin[1],z-origin[2]));
        }))continue;
        const outline=new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry),
          new THREE.LineBasicMaterial({color:0xe76b71,depthTest:false}));
        outline.position.copy(mesh.position);outline.renderOrder=25;scene.add(outline);targetGhosts.push(outline);shown++;
      }
    }
    // Draw only a sample of missing outside blocks to avoid thousands of overlapping lines.
    const missing=match.target.points.filter(p=>!match.user.keys.has(challengeKey(...p))&&
      isOuterVoxel(match.targetKeys,p));
    const stride=Math.max(1,Math.ceil(missing.length/170));
    for(let i=0;i<missing.length;i+=stride){
      const [x,y,z]=missing[i],ghost=new THREE.Mesh(blockGeo,
        new THREE.MeshBasicMaterial({color:0x5a67f2,wireframe:true,transparent:true,opacity:.72}));
      ghost.position.set(origin[0]+x-CHALLENGE_HALF+.5,origin[1]+y+.5,
        origin[2]+z-CHALLENGE_HALF+.5);
      scene.add(ghost);targetGhosts.push(ghost);
    }
  }
  if(hard){
    const [top,front,side]=match.views;
    const groups={base:['기단',0,0],body:['본체',0,0],tower:['탑',0,0],roof:['지붕',0,0],detail:['장식',0,0]};
    const raw=currentChallengeMission();
    for(let i=0;i<raw.blocks.length;i++){
      const role=raw.roles?.[challengeKey(...raw.blocks[i])];
      const category=role==='base'?'base':role==='tower'||role==='spire'?'tower':
        role==='roof'||role==='dome'?'roof':role==='detail'||role==='arch'||role==='window'?'detail':'body';
      const p=match.target.points[i];
      if(!isOuterVoxel(match.targetKeys,p))continue;
      groups[category][1]++;
      if(match.user.keys.has(challengeKey(...p)))groups[category][2]++;
    }
    const sections=Object.values(groups).filter(g=>g[1]).map(g=>
      g[0]+' '+Math.round(g[2]/g[1]*100)+'%').join(' · ');
    $('resultText').innerHTML=
      (restorationSession?'<b>설계 해독도 '+restorationScore+'%</b><br>':'')+
      '윗면 <b>'+top+'%</b> · 정면 <b>'+front+'%</b> · 측면 <b>'+side+'%</b><br>'+
      '<small>주요 부위 참고: '+sections+'</small><br>'+
      (completed?'설계 해독 완료! 85% 이상이면 통과해요.':
      restorationSession?'축소 모형의 부족한 바깥 구조를 더 완성해 보세요.':
      '세 방향의 외형을 비교해요. 파란 선은 아직 부족한 바깥 구조의 일부예요.')+
      '<br>보이지 않는 내부와 면 색칠은 외형 점수에서 제외합니다.';
  }else{
    const targetCount=match.target.points.length,userCount=match.user.keys.size;
    $('resultText').innerHTML=match.score===100?
      '위치와 바닥 방향이 달라도 같은 입체도형이면 정답이에요.':
      '같은 블록 '+match.common+'개 · 부족한 블록 '+Math.max(0,targetCount-match.common)+
      '개 · 다른 블록 '+Math.max(0,userCount-match.common)+'개<br>파란 선을 보고 모양을 다시 확인하세요.';
  }
  if(!completed){
    const correction=experience.nextCorrection(match.target.points,Array.from(match.user.keys,k=>k.split(',').map(Number)),hard);
    const tip=document.createElement('p');tip.className='next-correction';
    tip.textContent=correction?correction.text:'가장 덜 맞는 방향부터 살펴보자.';
    if(!correction)tip.textContent='세 방향의 모양을 다시 비교해 보자.';
    $('resultText').prepend(tip);
    if(correction){
      const [x,y,z]=correction.point;
      const focus=new THREE.Mesh(blockGeo,new THREE.MeshBasicMaterial({color:correction.kind==='add'?0x5a67f2:0xe76b71,wireframe:true,transparent:true,opacity:1,depthTest:false}));
      focus.position.set(origin[0]+x-CHALLENGE_HALF+.5,origin[1]+y+.5,origin[2]+z-CHALLENGE_HALF+.5);focus.renderOrder=30;scene.add(focus);targetGhosts.push(focus);
      const detail=document.createElement('details'),summary=document.createElement('summary');summary.textContent='전체 힌트 보기';
      const content=document.createElement('div');while($('resultText').lastChild&&$('resultText').lastChild!==tip)content.prepend($('resultText').lastChild);
      detail.append(summary,content);$('resultText').append(detail);
      for(const ghost of targetGhosts)if(ghost!==focus)ghost.visible=false;
      detail.addEventListener('toggle',()=>{for(const ghost of targetGhosts)if(ghost!==focus)ghost.visible=detail.open});
    }
  }
  if(completed){
    toast(hard?'설계실 해독 완료! 85% 기준을 넘었어요.':'설계도 복원 성공! 위치와 방향은 채점하지 않았어요.');
    if(restorationSession)markRestorationSuccess(restorationScore);
    sfx('good');reportResult(restorationSession?'survival-landmark':'challenge',match.score,true);
  }else{
    toast(hard?'세 방향의 외형을 비교했어요. 색칠은 별도 꾸미기예요.':'부족한 부분을 확인해 보세요.');sfx('bad');
  }
}
function updateChallengeCamera(){
  camera.rotation.order='YXZ';camera.rotation.y=challengeYaw;camera.rotation.x=challengePitch;
}
function updateChallengeFly(dt){
  const speed=(challengeKeys.ControlLeft||challengeKeys.ControlRight)?10:(challengeDifficulty==='hard'?7.4:5.2);
  const forward=new THREE.Vector3(Math.sin(challengeYaw),0,Math.cos(challengeYaw));
  const right=new THREE.Vector3(Math.cos(challengeYaw),0,-Math.sin(challengeYaw));
  const move=new THREE.Vector3();
  if(challengeKeys.KeyW||challengeKeys.ArrowUp)move.addScaledVector(forward,-1);
  if(challengeKeys.KeyS||challengeKeys.ArrowDown)move.add(forward);
  if(challengeKeys.KeyA||challengeKeys.ArrowLeft)move.addScaledVector(right,-1);
  if(challengeKeys.KeyD||challengeKeys.ArrowRight)move.add(right);
  if(mobileModeEnabled){move.addScaledVector(forward,mobileMove.y);move.addScaledVector(right,mobileMove.x)}
  if(move.lengthSq())camera.position.add(move.normalize().multiplyScalar(speed*dt));
  if(challengeKeys.Space)camera.position.y+=speed*dt;
  if(challengeKeys.ShiftLeft||challengeKeys.ShiftRight)camera.position.y-=speed*dt;
  const limit=CHALLENGE_HALF+3;
  camera.position.x=THREE.MathUtils.clamp(camera.position.x,-limit,limit);
  camera.position.z=THREE.MathUtils.clamp(camera.position.z,-limit,limit);
  camera.position.y=THREE.MathUtils.clamp(camera.position.y,.7,CHALLENGE_MAX_Y+5);
  updateChallengeCamera();updateChallengeGhost();
}

/* ---------------- 전개도 연구실 ---------------- */
const symbols=['☀️','🌳','⭐','🚪','❤️','⚽'];
const faceNames=['오른쪽','왼쪽','위','아래','앞','뒤'];
let netBox=null,netTarget=[],netAssigned=[],selectedSymbol='☀️',foldPieces=[];
const NET_FACE_CORNERS=[
  ['G','F','B','C'], // right  (+X)
  ['E','H','D','A'], // left   (-X)
  ['E','F','G','H'], // top    (+Y)
  ['D','C','B','A'], // bottom (-Y)
  ['H','G','C','D'], // front  (+Z)
  ['F','E','A','B']  // back   (-Z)
];
const NET_VARIANTS=[
  {layout:[[1,1],[3,1],[0,0],[0,2],[0,1],[2,1]],rot:[0,0,0,0,0,0],cols:4,rows:3},
  {layout:[[1,2],[1,4],[0,1],[1,3],[0,2],[0,0]],rot:[0,2,0,3,0,2],cols:2,rows:5},
  {layout:[[2,1],[0,0],[1,0],[1,2],[1,1],[3,1]],rot:[0,1,0,0,0,0],cols:4,rows:3},
  {layout:[[2,2],[0,1],[1,1],[1,3],[1,2],[0,0]],rot:[0,1,0,0,0,1],cols:3,rows:4},
  {layout:[[2,2],[0,0],[1,1],[2,3],[1,2],[1,0]],rot:[0,2,0,3,0,2],cols:3,rows:4},
  {layout:[[2,2],[0,3],[1,1],[1,3],[1,2],[1,0]],rot:[0,3,0,0,0,2],cols:3,rows:4},
  {layout:[[2,2],[0,1],[1,1],[2,3],[1,2],[0,0]],rot:[0,1,0,3,0,1],cols:3,rows:4},
  {layout:[[2,2],[0,0],[1,1],[1,3],[1,2],[1,0]],rot:[0,2,0,0,0,2],cols:3,rows:4},
  {layout:[[2,3],[0,0],[1,2],[1,0],[1,3],[1,1]],rot:[0,3,0,0,0,2],cols:3,rows:4},
  {layout:[[2,2],[0,2],[1,1],[1,3],[1,2],[1,0]],rot:[0,0,0,0,0,2],cols:3,rows:4},
  {layout:[[2,2],[0,1],[1,1],[1,3],[1,2],[1,0]],rot:[0,1,0,0,0,2],cols:3,rows:4}
];
let netVariantIndex=0,NET_LAYOUT=NET_VARIANTS[0].layout,NET_ROTATIONS=NET_VARIANTS[0].rot;
function setNetVariant(index){
  netVariantIndex=((index%NET_VARIANTS.length)+NET_VARIANTS.length)%NET_VARIANTS.length;
  const v=NET_VARIANTS[netVariantIndex];NET_LAYOUT=v.layout;NET_ROTATIONS=v.rot;
}
function chooseNetVariant(){
  const jump=1+Math.floor(Math.random()*(NET_VARIANTS.length-1));
  setNetVariant(netVariantIndex+jump);
}
function netFaceCorners(face){
  const base=NET_FACE_CORNERS[face],r=((NET_ROTATIONS[face]||0)%4+4)%4;
  return r?base.slice(4-r).concat(base.slice(0,4-r)):base.slice();
}
const NET_SIDES=['윗쪽','오른쪽','아랫쪽','왼쪽'];
const NET_CORNER_NAMES=['왼쪽 위','오른쪽 위','오른쪽 아래','왼쪽 아래'];
const NET_EDGE_CORNERS=[[0,1],[1,2],[3,2],[0,3]];
let netQuizMode='decorate',netQuiz=null,netQuizChoice=null,netQuizRevealed=false;
let netQuizAnswered=0,netQuizCorrect=0,netQuizProof=null,foldNonce=0;
function netEdgeData(){
  const result=[];
  for(let f=0;f<6;f++)for(let side=0;side<4;side++){
    const faceCorners=netFaceCorners(f);
    const corners=NET_EDGE_CORNERS[side].map(c=>faceCorners[c]);
    result.push({face:f,side,vertices:corners,edgeKey:corners.slice().sort().join('')});
  }
  return result;
}
function flatNetNeighbors(a,b){
  const x=NET_LAYOUT[a.face][0],y=NET_LAYOUT[a.face][1],xx=NET_LAYOUT[b.face][0],yy=NET_LAYOUT[b.face][1];
  const dx=[0,1,0,-1],dy=[-1,0,1,0];
  return xx===x+dx[a.side]&&yy===y+dy[a.side];
}
function netChoiceLabel(item,kind){
  if(kind==='face')return faceNames[item];
  if(kind==='edge')return faceNames[item.face]+' 면의 '+NET_SIDES[item.side]+' 모서리';
  return faceNames[item.face]+' 면의 '+NET_CORNER_NAMES[item.corner]+' 점';
}
function makeNetQuiz(kind){
  if(kind==='face'){
    const source=Math.floor(Math.random()*6),opposite=source%2===0?source+1:source-1;
    const distractors=shuffle([0,1,2,3,4,5].filter(i=>i!==source&&i!==opposite)).slice(0,3);
    return {kind,source,correct:opposite,options:shuffle([opposite,...distractors]),
      prompt:faceNames[source]+' 면과 평행한 면은 어느 면일까요?',
      explanation:faceNames[source]+' 면과 '+faceNames[opposite]+' 면은 서로 마주 보고 평행해요.'};
  }
  if(kind==='edge'){
    const all=netEdgeData();
    const cuts=all.filter(a=>all.some(b=>b.face!==a.face&&b.edgeKey===a.edgeKey&&!flatNetNeighbors(a,b)));
    const source=cuts[Math.floor(Math.random()*cuts.length)];
    const mate=all.find(b=>b.face!==source.face&&b.edgeKey===source.edgeKey);
    const distractors=shuffle(all.filter(a=>a!==source&&a!==mate&&a.face!==source.face)).slice(0,3);
    return {kind,source,correct:mate,options:shuffle([mate,...distractors]),
      prompt:netChoiceLabel(source,kind)+'와 전개도를 접었을 때 겹치는 모서리는?',
      explanation:netChoiceLabel(source,kind)+'와 '+netChoiceLabel(mate,kind)+
        '는 접으면 하나의 모서리('+source.edgeKey+')가 돼요.',
      proofEdge:source.vertices};
  }
  const corners=[];
  for(let f=0;f<6;f++)for(let corner=0;corner<4;corner++){
    const [col,row]=NET_LAYOUT[f],dc=[0,1,1,0][corner],dr=[0,0,1,1][corner];
    corners.push({face:f,corner,vertex:netFaceCorners(f)[corner],xy:[col+dc,row+dr].join(',')});
  }
  const eligible=corners.filter(a=>corners.some(b=>b.face!==a.face&&b.vertex===a.vertex&&b.xy!==a.xy));
  const source=eligible[Math.floor(Math.random()*eligible.length)];
  const mates=corners.filter(b=>b.face!==source.face&&b.vertex===source.vertex&&b.xy!==source.xy);
  const mate=mates[Math.floor(Math.random()*mates.length)];
  const distractors=shuffle(corners.filter(b=>b.vertex!==source.vertex&&b.face!==source.face)).slice(0,3);
  return {kind,source,correct:mate,options:shuffle([mate,...distractors]),
    prompt:netChoiceLabel(source,kind)+'과 접었을 때 같은 꼭짓점이 되는 점은?',
    explanation:netChoiceLabel(source,kind)+'과 '+netChoiceLabel(mate,kind)+
      '은 접으면 꼭짓점 '+source.vertex+'에서 만나요.',proofVertex:source.vertex};
}
function setNetQuizMode(kind){
  netQuizMode=kind;netQuizAnswered=0;netQuizCorrect=0;netQuizChoice=null;netQuizRevealed=false;
  document.querySelectorAll('[data-net-mode]').forEach(b=>b.classList.toggle('active',b.dataset.netMode===kind));
  const decorate=kind==='decorate';
  ['netDecorateInstructions','stickerPalette','selectedFace','netQuizCard'].forEach(id=>{
    $(id).classList.toggle('hidden',id==='netQuizCard'?decorate:!decorate);
  });
  $('resultCard').classList.add('hidden');
  clearNetProof();
  if(decorate){netQuiz=null;buildNetBoard();return}
  nextNetQuiz();
}
function clearNetProof(){
  if(netQuizProof){scene.remove(netQuizProof);netQuizProof=null}
}
function nextNetQuiz(){
  foldNonce++;
  foldPieces.forEach(piece=>scene.remove(piece));foldPieces=[];if(netBox)netBox.visible=true;
  chooseNetVariant();
  clearNetProof();netQuiz=makeNetQuiz(netQuizMode);netQuizChoice=null;netQuizRevealed=false;
  $('resultCard').classList.add('hidden');
  $('netQuizStatus').textContent='문제 '+(netQuizAnswered+1)+' · 지금까지 '+netQuizCorrect+'/'+netQuizAnswered+' 정답';
  $('netQuizPrompt').textContent=netQuiz.prompt;$('netQuizFeedback').classList.add('hidden');
  const box=$('netQuizOptions');box.innerHTML='';
  netQuiz.options.forEach((option,i)=>{
    const b=document.createElement('button');b.type='button';b.textContent=(i+1)+'. '+netChoiceLabel(option,netQuizMode);
    b.onclick=()=>{if(netQuizRevealed)return;netQuizChoice=option;
      Array.from(box.children).forEach(el=>el.classList.remove('active'));b.classList.add('active')};
    box.appendChild(b);
  });
  buildNetBoard();
  $('netMission').textContent=netQuizMode==='face'?'마주 보는 면의 평행 관계를 생각해 보세요.':
    netQuizMode==='edge'?'평면에서 떨어져 있는 두 모서리가 접으면 어디서 만날까요?':
      '서로 떨어져 그려진 점들이 접으면 같은 꼭짓점이 될 수 있어요.';
}
function checkNetQuiz(){
  if(!netQuiz||netQuizChoice===null){toast('먼저 답을 하나 선택해 주세요.');return}
  if(netQuizRevealed)return;
  netQuizRevealed=true;netQuizAnswered++;
  const correct=netQuizChoice===netQuiz.correct;if(correct)netQuizCorrect++;
  const options=$('netQuizOptions').children;
  Array.from(options).forEach((el,i)=>{
    if(netQuiz.options[i]===netQuiz.correct)el.classList.add('correct');
    else if(netQuiz.options[i]===netQuizChoice)el.classList.add('wrong');
  });
  $('netQuizStatus').textContent='지금까지 '+netQuizCorrect+'/'+netQuizAnswered+' 정답';
  $('netQuizFeedback').textContent=(correct?'정답! ':'다시 생각해 보세요. 정답은 '+
    netChoiceLabel(netQuiz.correct,netQuizMode)+'이에요. ')+netQuiz.explanation;
  $('netQuizFeedback').classList.remove('hidden');
  $('resultCard').classList.remove('hidden');$('resultScore').textContent=correct?'정답':'확인';
  $('resultText').textContent=netQuiz.explanation;
  if(correct){sfx('good');reportResult('net-'+netQuizMode,100,true)}else sfx('bad');
  foldPreview();
}
function showNetProof(){
  clearNetProof();if(!netQuizRevealed||!netQuiz)return;
  const g=new THREE.Group();
  if(netQuiz.kind==='face'){
    const f=netQuiz.source,o=netQuiz.correct;
    const mats=Array.from({length:6},(_,i)=>new THREE.MeshBasicMaterial({
      color:i===f?0x4fd49e:i===o?0x668bff:0xffffff,
      transparent:true,opacity:i===f||i===o?.32:0,depthWrite:false,side:THREE.DoubleSide
    }));
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(2.83,1.93,1.58),mats);mesh.renderOrder=20;g.add(mesh);
  }else{
    const names=netQuiz.kind==='edge'?netQuiz.proofEdge:[netQuiz.proofVertex];
    const points=names.map(name=>{
      const v=CUBOID_TOPOLOGY.vertices.find(item=>item.id===name);
      return new THREE.Vector3(v.s[0]*1.4,v.s[1]*.95,v.s[2]*.775);
    });
    if(netQuiz.kind==='edge'){
      const geometry=new THREE.BufferGeometry().setFromPoints(points);
      const line=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:0xf04b73,linewidth:4,depthTest:false}));
      line.renderOrder=25;g.add(line);
    }else{
      const dot=new THREE.Mesh(new THREE.SphereGeometry(.16,12,10),
        new THREE.MeshBasicMaterial({color:0xf04b73,depthTest:false}));
      dot.position.copy(points[0]);dot.renderOrder=25;g.add(dot);
    }
  }
  netQuizProof=g;scene.add(g);
}
function symbolMaterial(symbol,bg){
  const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.fillStyle=bg||'#ffffff';x.fillRect(0,0,256,256);
  x.strokeStyle='#cbd2df';x.lineWidth=10;x.strokeRect(5,5,246,246);x.font='118px "Apple Color Emoji","Segoe UI Emoji",sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(symbol||'',128,132);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return new THREE.MeshStandardMaterial({map:t,roughness:.72});
}
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function initNet(){
  modeTitle('전개도 연구실','2D 전개도 → 3D 관계 찾기');
  setVisible('netPanel',true);$('actionCheck').classList.remove('hidden');$('actionNext').classList.remove('hidden');
  foldNonce++;foldPieces=[];netQuizMode='decorate';netQuiz=null;netQuizAnswered=0;netQuizCorrect=0;netQuizChoice=null;netQuizRevealed=false;
  chooseNetVariant();
  cleanScene(0xfff5dc);netQuizProof=null;camera.position.set(5,4.2,6);camera.lookAt(0,0,0);makeOrbit(new THREE.Vector3(0,0,0));orbit.minDistance=4;orbit.maxDistance=10;
  netTarget=shuffle(symbols);netAssigned=['','','','','',''];selectedSymbol=netTarget[0];buildNetBoard();buildPalette();
  netBox=new THREE.Mesh(new THREE.BoxGeometry(2.8,1.9,1.55),netAssigned.map(s=>symbolMaterial(s,'#ffffff')));netBox.castShadow=true;netBox.receiveShadow=true;netBox.userData.netbox=true;scene.add(netBox);
  const floor=new THREE.Mesh(new THREE.CircleGeometry(4.5,64),new THREE.MeshStandardMaterial({color:0xf0dfb7,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-1.15;floor.receiveShadow=true;scene.add(floor);
  $('actionCheck').onclick=checkNet;
  $('actionNext').onclick=()=>netQuizMode==='decorate'?initNet():nextNetQuiz();
  $('foldNet').onclick=foldPreview;
  document.querySelectorAll('[data-net-mode]').forEach(btn=>{
    btn.onclick=()=>setNetQuizMode(btn.dataset.netMode);
    btn.classList.toggle('active',btn.dataset.netMode==='decorate');
  });
  ['netDecorateInstructions','stickerPalette','selectedFace'].forEach(id=>$(id).classList.remove('hidden'));
  $('netQuizCard').classList.add('hidden');
  $('resultCard').classList.add('hidden');showTutorial('net');
}
function buildNetBoard(){
  const variant=NET_VARIANTS[netVariantIndex],board=$('netBoard');
  if(board){
    board.style.gridTemplateColumns='repeat('+variant.cols+',56px)';
    board.style.gridTemplateRows='repeat('+variant.rows+',44px)';
  }
  document.querySelectorAll('.net-face').forEach(el=>{
    const f=Number(el.dataset.face),pos=NET_LAYOUT[f];
    el.style.gridColumn=String(pos[0]+1);el.style.gridRow=String(pos[1]+1);
    el.textContent=netQuizMode==='decorate'?netTarget[f]:faceNames[f];
    el.classList.remove('quiz-target');el.removeAttribute('data-quiz-edge');
    if(netQuizMode!=='decorate'&&netQuiz?.source?.face===f){
      el.classList.add('quiz-target');
      if(netQuizMode==='edge')el.dataset.quizEdge=['top','right','bottom','left'][netQuiz.source.side];
      if(netQuizMode==='vertex'){
        const dot=document.createElement('span');dot.className='net-corner-mark';
        dot.dataset.corner=String(netQuiz.source.corner);el.appendChild(dot);
      }
    }
    if(netQuizMode==='face'&&netQuiz?.source===f)el.classList.add('quiz-target');
  });
  if(netQuizMode==='decorate')$('netMission').textContent='11가지 정육면체 전개도 중 하나예요. 그림이 직육면체의 어느 면으로 오는지 찾아 배치하세요.';
}
function buildPalette(){
  const p=$('stickerPalette');p.innerHTML='';
  netTarget.forEach(s=>{const b=document.createElement('button');b.className='sticker'+(s===selectedSymbol?' active':'');b.textContent=s;b.onclick=()=>{selectedSymbol=s;tutorialSignal('net-sticker');buildPalette()};p.appendChild(b)});
}
function netHit(ev){
  const rect=canvas.getBoundingClientRect();mouse.x=((ev.clientX-rect.left)/rect.width)*2-1;mouse.y=-((ev.clientY-rect.top)/rect.height)*2+1;
  raycaster.setFromCamera(mouse,camera);return raycaster.intersectObject(netBox,false)[0]||null;
}
function assignNetFace(hit){
  if(netQuizMode!=='decorate'||!hit||!hit.face)return;const idx=hit.face.materialIndex;netAssigned[idx]=selectedSymbol;
  netBox.material[idx].dispose();netBox.material[idx]=symbolMaterial(selectedSymbol,'#ffffff');netBox.material.needsUpdate=true;sfx('place');tutorialSignal('net-assign');
  $('selectedFace').textContent=faceNames[idx]+' 면 ← '+selectedSymbol;
}
function checkNet(){
  if(netQuizMode!=='decorate'){checkNetQuiz();return}
  let good=0;for(let i=0;i<6;i++)if(netAssigned[i]===netTarget[i])good++;
  $('resultCard').classList.remove('hidden');$('resultScore').textContent=good+'/6';
  const wrong=[];for(let i=0;i<6;i++)if(netAssigned[i]!==netTarget[i])wrong.push(faceNames[i]);
  $('resultText').innerHTML=good===6?'여섯 면의 위치를 모두 맞혔어요. <b>접어 보기</b>로 확인해 보세요.':'다시 볼 면: <b>'+wrong.join(', ')+'</b><br>직육면체를 돌려가며 전개도의 연결 관계를 따라가 보세요.';
  if(good===6){toast('전개도 복원 성공! 실제로 접히는 모습을 확인해 보세요.');sfx('good');reportResult('net',100,true)}
  else{sfx('bad');toast('몇 면의 위치가 달라요. 전개도의 붙어 있는 면을 따라가 보세요.')}
}
function foldPreview(){
  if(!netBox)return;const ticket=++foldNonce;
  foldPieces.forEach(x=>scene.remove(x));foldPieces=[];clearNetProof();netBox.visible=false;
  const xs=NET_LAYOUT.map(p=>p[0]),ys=NET_LAYOUT.map(p=>p[1]);
  const cx=(Math.min(...xs)+Math.max(...xs))/2,cy=(Math.min(...ys)+Math.max(...ys))/2;
  const starts=NET_LAYOUT.map(([col,row])=>new THREE.Vector3((col-cx)*2.75,(cy-row)*1.95,0));
  const ends=[new THREE.Vector3(1.41,0,0),new THREE.Vector3(-1.41,0,0),new THREE.Vector3(0,.96,0),new THREE.Vector3(0,-.96,0),new THREE.Vector3(0,0,.79),new THREE.Vector3(0,0,-.79)];
  const rots=[
    new THREE.Euler(0,Math.PI/2,0),new THREE.Euler(0,-Math.PI/2,0),new THREE.Euler(-Math.PI/2,0,0),new THREE.Euler(Math.PI/2,0,0),new THREE.Euler(0,0,0),new THREE.Euler(0,Math.PI,0)
  ];
  for(let i=0;i<6;i++){
    const g=new THREE.PlaneGeometry(i<2?1.55:2.8,(i===2||i===3)?1.55:1.9),m=symbolMaterial(netTarget[i],'#ffffff'),p=new THREE.Mesh(g,m);
    p.position.copy(starts[i]);p.userData.start=starts[i].clone();p.userData.end=ends[i].clone();p.userData.rot=rots[i];scene.add(p);foldPieces.push(p);
  }
  const start=performance.now();function step(now){
    if(ticket!==foldNonce)return;
    const q=Math.min(1,(now-start)/1250),e=1-Math.pow(1-q,3);
    foldPieces.forEach(p=>{p.position.lerpVectors(p.userData.start,p.userData.end,e);p.rotation.set(p.userData.rot.x*e,p.userData.rot.y*e,p.userData.rot.z*e)});
    if(q<1)requestAnimationFrame(step);else setTimeout(()=>{
      if(ticket!==foldNonce)return;
      foldPieces.forEach(x=>scene.remove(x));foldPieces=[];netBox.visible=true;
      if(netQuizMode!=='decorate')showNetProof();
    },550);
  }requestAnimationFrame(step);toast('전개도의 면들이 3D 위치로 접히고 있어요.');
}

/* ---------------- 아키텍트 월드: 살아있는 복셀 샌드박스 ---------------- */
const BLOCK_DEFS={
  snow:{name:'눈',icon:'❄',color:0xe8eff5,category:'자연',solid:true},
  flower:{name:'들꽃',icon:'🌸',color:0xe68fbb,category:'자연',solid:false,special:'flower'},
  sandstone:{name:'사암',icon:'▤',color:0xd6b477,category:'건축',solid:true},
  snowBrick:{name:'눈 벽돌',icon:'▦',color:0xd9e9f1,category:'건축',solid:true},
  reedMat:{name:'갈대 장식',icon:'▧',color:0xa6ad6d,category:'건축',solid:true},
  flowerDye:{name:'꽃 안료',icon:'🎨',color:0xe75aab,category:'실험',solid:false,hidden:true},
  cactusDye:{name:'선인장 안료',icon:'🎨',color:0x67a74a,category:'실험',solid:false,hidden:true},
  blueprintFragment:{name:'설계도 조각',icon:'📜',color:0x8d7ce8,category:'기능',solid:false,hidden:true},
  redSand:{name:'붉은 모래',icon:'🟧',color:0xb76e46,category:'자연',solid:true,gravity:true},
  gravel:{name:'자갈',icon:'▥',color:0x85817d,category:'자연',solid:true,gravity:true},
  pineLog:{name:'소나무 원목',icon:'🪵',color:0x64513b,category:'자연',solid:true,flammable:true},
  pineLeaves:{name:'침엽수 잎',icon:'🌲',color:0x31624a,category:'자연',solid:true,flammable:true,transparent:true,opacity:.86},
  cactus:{name:'선인장',icon:'🌵',color:0x477a42,category:'자연',solid:true},
  reed:{name:'갈대',icon:'🌾',color:0x9cab64,category:'자연',solid:false,special:'reed'},
  workbench:{name:'제작대',icon:'🛠',color:0x9b744b,category:'기능',solid:true},
  hand:{name:'맨손',icon:'✊',color:0x8fa3b7,category:'기능',solid:false,hidden:true},
  sticks:{name:'막대',icon:'╱',color:0x9b744b,category:'기능',solid:false,hidden:true},
  woodPick:{name:'나무 곡괭이',icon:'⛏',color:0xad906c,category:'기능',solid:false,hidden:true},
  stonePick:{name:'돌 곡괭이',icon:'⛏',color:0x818c92,category:'기능',solid:false,hidden:true},
  ironPick:{name:'철 곡괭이',icon:'⛏',color:0xcbd4db,category:'기능',solid:false,hidden:true},
  woodSword:{name:'나무 검',icon:'🗡',color:0xb88b5b,category:'기능',solid:false,hidden:true},
  stoneSword:{name:'돌 검',icon:'🗡',color:0x87919a,category:'기능',solid:false,hidden:true},
  ironSword:{name:'철 검',icon:'🗡',color:0xcbd4db,category:'기능',solid:false,hidden:true},
  paddedHelmet:{name:'양털 모자',icon:'🪖',color:0xe9e3dc,category:'기능',solid:false,hidden:true},
  paddedChest:{name:'양털 보호복',icon:'🦺',color:0xe4ded5,category:'기능',solid:false,hidden:true},
  paddedLegs:{name:'양털 보호바지',icon:'👖',color:0xddd7cf,category:'기능',solid:false,hidden:true},
  paddedBoots:{name:'양털 보호신발',icon:'🥾',color:0xd6cfc5,category:'기능',solid:false,hidden:true},
  woodShield:{name:'나무 방패',icon:'🛡',color:0x9b744b,category:'기능',solid:false,hidden:true},
  ironHelmet:{name:'철 투구',icon:'🪖',color:0xcbd4db,category:'기능',solid:false,hidden:true},
  ironChest:{name:'철 흉갑',icon:'🦺',color:0xbfc8cf,category:'기능',solid:false,hidden:true},
  ironLegs:{name:'철 각반',icon:'👖',color:0xb4bdc5,category:'기능',solid:false,hidden:true},
  ironBoots:{name:'철 장화',icon:'🥾',color:0xaab4bd,category:'기능',solid:false,hidden:true},
  ironShield:{name:'철 방패',icon:'🛡',color:0xbec8d0,category:'기능',solid:false,hidden:true},
  wildBerry:{name:'산딸기',icon:'🫐',color:0xb1476b,category:'자연',solid:false,hidden:true},
  egg:{name:'달걀',icon:'🥚',color:0xf5e8c7,category:'자연',solid:false,hidden:true},
  cookedEgg:{name:'구운 달걀',icon:'🍳',color:0xf2c85f,category:'자연',solid:false,hidden:true},
  wool:{name:'양털',icon:'☁',color:0xf1eee7,category:'자연',solid:false,hidden:true},
  woolMat:{name:'양털 쿠션 블록',icon:'▦',color:0xe9e3dc,category:'건축',solid:true},
  wheatSeed:{name:'밀 씨앗',icon:'🌾',color:0xb8a85a,category:'자연',solid:false,hidden:true},
  wheat:{name:'밀',icon:'🌾',color:0xd7b84f,category:'자연',solid:false,hidden:true},
  carrot:{name:'당근',icon:'🥕',color:0xe88932,category:'자연',solid:false,hidden:true},
  potato:{name:'감자',icon:'🥔',color:0xb89161,category:'자연',solid:false,hidden:true},
  bread:{name:'빵',icon:'🍞',color:0xd89d54,category:'자연',solid:false,hidden:true},
  cookedPotato:{name:'구운 감자',icon:'🥔',color:0xc99b5e,category:'자연',solid:false,hidden:true},
  chest:{name:'나무 상자',icon:'📦',color:0x98653d,category:'기능',solid:true,flammable:true,special:'chest'},
  bed:{name:'양털 침대',icon:'🛏',color:0xd7d1c9,category:'기능',solid:true,flammable:true,special:'bed'},
  mapBoard:{name:'탐험 지도판',icon:'🗺',color:0x6fa4b8,category:'기능',solid:true,flammable:true,special:'mapBoard'},
  displayStand:{name:'기념품 전시대',icon:'🏛',color:0xa69076,category:'기능',solid:true,special:'displayStand'},
  chair:{name:'나무 의자',icon:'🪑',color:0x9b744b,category:'건축',solid:false,flammable:true,special:'chair'},
  desk:{name:'나무 책상',icon:'▰',color:0x9b744b,category:'건축',solid:true,flammable:true,special:'desk'},
  bookshelf:{name:'탐험 책장',icon:'📚',color:0x835d43,category:'건축',solid:true,flammable:true,special:'bookshelf'},
  sign:{name:'나무 표지판',icon:'✎',color:0xa9784d,category:'기능',solid:false,flammable:true,special:'sign'},
  sofa:{name:'거실 소파',icon:'🛋',color:0x5588a0,category:'가구',solid:false,flammable:true,special:'seat'},
  bench:{name:'정원 벤치',icon:'🪑',color:0x916743,category:'가구',solid:false,flammable:true,special:'seat'},
  coffeeTable:{name:'작은 탁자',icon:'▰',color:0xb38a55,category:'가구',solid:true,flammable:true,special:'furnishing'},
  floorLamp:{name:'스탠드 조명',icon:'💡',color:0xf8db86,category:'가구',solid:false,special:'lamp'},
  rug:{name:'원형 러그',icon:'◯',color:0xd36f89,category:'가구',solid:false,flammable:true,special:'rug'},
  crate:{name:'화물 상자',icon:'📦',color:0x99633b,category:'생존',solid:true,flammable:true,special:'chest'},
  campfire:{name:'모닥불 시설',icon:'🔥',color:0xc5773c,category:'생존',solid:false,special:'campfire'},
  fence:{name:'나무 울타리',icon:'▥',color:0xa67b4e,category:'생존',solid:true,flammable:true,special:'fence'},
  tent:{name:'야영 천막',icon:'⛺',color:0x9cb494,category:'생존',solid:true,flammable:true,special:'tent'},
  bedroll:{name:'야영 침낭',icon:'▱',color:0x77a295,category:'생존',solid:false,flammable:true,special:'bedroll'},
  tilledSoil:{name:'밭',icon:'▤',color:0x6f4932,category:'자연',solid:true,special:'farmland'},
  wheatCrop:{name:'자라는 밀',icon:'🌾',color:0xb9a34d,category:'자연',solid:false,special:'crop'},
  carrotCrop:{name:'자라는 당근',icon:'🥕',color:0x6fa948,category:'자연',solid:false,special:'crop'},
  potatoCrop:{name:'자라는 감자',icon:'🥔',color:0x739c4d,category:'자연',solid:false,special:'crop'},

  grass:{name:'잔디',icon:'🌱',color:0x69b85f,category:'자연',solid:true},
  dirt:{name:'흙',icon:'🟫',color:0x8b6043,category:'자연',solid:true},
  stone:{name:'돌',icon:'🪨',color:0x89919d,category:'자연',solid:true},
  smoothStone:{name:'매끈한 돌',icon:'▰',color:0xaab0b9,category:'건축',solid:true},
  sand:{name:'모래',icon:'🟨',color:0xe4c978,category:'자연',solid:true,gravity:true},
  clay:{name:'점토',icon:'◼',color:0x9ca9b4,category:'자연',solid:true},
  ironOre:{name:'철광석',icon:'⛏',color:0x8a817a,category:'자연',solid:true},
  log:{name:'원목',icon:'🪵',color:0x8c603d,category:'자연',solid:true,flammable:true},
  leaves:{name:'나뭇잎',icon:'🍃',color:0x4f9c55,category:'자연',solid:true,flammable:true,transparent:true,opacity:.82},
  sapling:{name:'묘목',icon:'🌿',color:0x55a65b,category:'자연',solid:false,special:'sapling'},
  planks:{name:'나무 판자',icon:'▤',color:0xb98554,category:'건축',solid:true,flammable:true},
  brick:{name:'벽돌',icon:'🧱',color:0xb96757,category:'건축',solid:true},
  glass:{name:'유리',icon:'◇',color:0xbdefff,category:'건축',solid:true,transparent:true,opacity:.32},
  glassPane:{name:'유리판',icon:'▯',color:0xc9f3ff,category:'건축',solid:true,transparent:true,opacity:.3,special:'pane'},
  windowFrame:{name:'창문틀',icon:'▦',color:0x8f6747,category:'건축',solid:true,transparent:true,special:'window'},
  slab:{name:'반블록',icon:'▂',color:0xb7a28d,category:'건축',solid:true,special:'slab'},
  stairs:{name:'계단',icon:'▟',color:0xa98260,category:'건축',solid:true,special:'stairs'},
  roof:{name:'경사지붕',icon:'⌂',color:0xb95353,category:'건축',solid:true,special:'roof'},
  cuboid:{name:'직육면체',icon:'▭',color:0xf2c86d,category:'도형',solid:true,special:'cuboid'},
  cuboidPart:{name:'직육면체 내부',color:0xf2c86d,category:'도형',solid:true,hidden:true,special:'cuboidPart'},
  obsidian:{name:'흑요석',icon:'◆',color:0x342c4a,category:'건축',solid:true},
  ironBlock:{name:'철 블록',icon:'▣',color:0xbec6cc,category:'건축',solid:true,metal:true},
  charcoal:{name:'숯',icon:'●',color:0x2f3338,category:'실험',solid:true},
  door:{name:'나무문',icon:'🚪',color:0x9a673f,category:'기능',solid:true,flammable:true,special:'door'},
  doorTop:{name:'문 윗부분',color:0x9a673f,category:'기능',solid:true,special:'doorTop',hidden:true},
  torch:{name:'횃불',icon:'🔦',color:0xf0b34e,category:'기능',solid:false,special:'torch'},
  furnace:{name:'화로',icon:'♨',color:0x62676e,category:'기능',solid:true,special:'furnace'},
  water:{name:'물',icon:'💧',color:0x4f9fea,category:'실험',solid:false,liquid:true,transparent:true,opacity:.48},
  lava:{name:'용암',icon:'🔥',color:0xff6f35,category:'실험',solid:false,liquid:true,transparent:true,opacity:.72,emissive:true},
  fire:{name:'불',icon:'🔥',color:0xff8c38,category:'실험',solid:false,transparent:true,special:'fire'},
  bedrock:{name:'기반암',icon:'⬛',color:0x34383f,category:'자연',solid:true,unbreakable:true}
};
const PLACEABLE_TYPES=['flower','sandstone','snowBrick','reedMat','woolMat','snow','redSand','gravel','pineLog','pineLeaves','cactus','reed','workbench','chest','bed','mapBoard','displayStand','chair','desk','bookshelf','sign','sofa','bench','coffeeTable','floorLamp','rug','crate','campfire','fence','tent','bedroll','grass','dirt','stone','smoothStone','sand','clay','ironOre','log','leaves','sapling','planks','brick','glass','glassPane','windowFrame','slab','stairs','roof','cuboid','obsidian','ironBlock','charcoal','door','torch','furnace','water','lava','fire'];
const FURNISHING_ASSET_TYPES=new Set(['chair','desk','bookshelf','bed','chest','workbench','sofa','bench','coffeeTable','floorLamp','rug','crate','campfire','fence','tent','bedroll']);
const CAMP_STRUCTURE_TYPES=new Set(['sofa','bench','coffeeTable','floorLamp','rug','crate','campfire','fence','tent','bedroll']);
const FARM_PLANT_TYPES=['wheatSeed','carrot','potato'];
const FARM_CROP_TYPES=['wheatCrop','carrotCrop','potatoCrop'];
const CROP_MATURE_AGE=24;
const CROP_MATURE_SECONDS=150;
const HOTBAR_TOOL_TYPES=['woodPick','stonePick','ironPick','woodSword','stoneSword','ironSword'];
const SURVIVAL_GEAR_DEFS={
  paddedHelmet:{slot:'head',defense:.04,tier:1},paddedChest:{slot:'chest',defense:.10,tier:1},
  paddedLegs:{slot:'legs',defense:.07,tier:1},paddedBoots:{slot:'feet',defense:.04,tier:1},
  woodShield:{slot:'shield',defense:.12,tier:1},
  ironHelmet:{slot:'head',defense:.08,tier:2},ironChest:{slot:'chest',defense:.18,tier:2},
  ironLegs:{slot:'legs',defense:.13,tier:2},ironBoots:{slot:'feet',defense:.08,tier:2},
  ironShield:{slot:'shield',defense:.20,tier:2}
};
const SURVIVAL_GEAR_TYPES=Object.keys(SURVIVAL_GEAR_DEFS);
const CONSUMABLE_TYPES={
  wildBerry:{heal:1,label:'산딸기'},
  cookedEgg:{heal:2,label:'구운 달걀'},
  bread:{heal:2,label:'빵'},
  cookedPotato:{heal:2,label:'구운 감자'}
};
const WORLD_HALF=96,WORLD_MIN_Y=-6,WORLD_MAX_Y=48,SEA_LEVEL=0;
const WORLD_VIEW_RADIUS=mobileModeEnabled?21:30;
let streamCenterX=Infinity,streamCenterZ=Infinity;
let gameFreeMode='survival',survivalBag={},survivalStage=0,freePhysicsY=0,legacyWorld=false,savedFreePosition=null,visitedBiomes=new Set();
let survivalEquipment={head:'',chest:'',legs:'',feet:'',shield:''},survivalDamageCarry=0;
let survivalStats={},survivalFinished=false,survivalAdventureDone=new Set(),survivalExposure=0,survivalTimeAcc=0,firstNightStarted=false;
let discoveredLandmarks=new Set(),restoredLandmarks=new Set(),unlockedTech=new Set();
let nearLandmarkPoi=null,restorationSession=null,dungeonSession=null;
let dungeonYaw=0,dungeonPitch=0,dungeonKeys={},dungeonTargets=[],dungeonGates=[];
let dungeonPuzzleGroups=new Map(),dungeonNetVisuals=[],dungeonFoldNonce=0;
let firstDuskWarned=false,nightShelterNotice=false,lastEmergencyReturn=-120000;
let worldChunkIndex=new Map(),worldChunksGenerated=new Set(),worldChunkGenerationDepth=0;
const WORLD_CHUNK_SIZE=16;
function worldChunkKey(x,z){
  return Math.floor(x/WORLD_CHUNK_SIZE)+','+Math.floor(z/WORLD_CHUNK_SIZE);
}
const voxelRuntime=window.CubeArchitectVoxel||null;
function newSurvivalStats(){
  return {harvestedWood:0,harvestedStone:0,crafted:{},placed:{},placedBlocks:0,
    cuboids:[],shelterBuilt:false,paintedFaces:[],smelted:{},biomes:[],found:[],restored:[],
    foraged:{},hunted:{},foodsEaten:0};
}
function trackSurvival(action,type,n=1){
  if(gameFreeMode!=='survival')return;
  if(action==='harvest'){
    if(type==='log'||type==='pineLog')survivalStats.harvestedWood+=n;
    if(type==='stone')survivalStats.harvestedStone+=n;
  }else if(action==='craft'||action==='place'||action==='smelt'){
    const field=action==='craft'?'crafted':action==='place'?'placed':'smelted';
    survivalStats[field][type]=(survivalStats[field][type]||0)+n;
    if(action==='place')survivalStats.placedBlocks++;
  }else if(action==='cuboid'){
    const dims=String(type).split('x').map(Number).sort((a,b)=>a-b).join('x');
    if(dims&&!survivalStats.cuboids.includes(dims))survivalStats.cuboids.push(dims);
  }else if(action==='paint'){
    const id=String(type);if(!survivalStats.paintedFaces.includes(id))survivalStats.paintedFaces.push(id);
  }else if(action==='biome'){
    if(!survivalStats.biomes.includes(type))survivalStats.biomes.push(type);
  }else if(action==='find'){
    if(!survivalStats.found.includes(type))survivalStats.found.push(type);
  }else if(action==='restore'){
    if(!survivalStats.restored.includes(type))survivalStats.restored.push(type);
  }else if(action==='forage'||action==='hunt'){
    const field=action==='forage'?'foraged':'hunted';
    survivalStats[field]=survivalStats[field]||{};
    survivalStats[field][type]=(survivalStats[field][type]||0)+n;
  }else if(action==='eat'){
    survivalStats.foodsEaten=(survivalStats.foodsEaten||0)+n;
  }
  advanceSurvival();tutorialRefreshProgress();
}

const worldRules=window.CubeArchitectWorld;
const poiRules=window.CubeArchitectPOI;
function recipeTech(recipeId){
  for(const poi of poiRules.POIS)if((poi.tech.recipes||[]).includes(recipeId))return poi.tech.id;
  return null;
}
function recipeUnlocked(recipeId){
  const tech=recipeTech(recipeId);
  return !tech||unlockedTech.has(tech)||gameFreeMode==='creative';
}
function survivalCuboidMax(){
  return gameFreeMode==='creative'?8:(unlockedTech.has('largeCuboid')?6:(survivalAdventureDone.has('geometry')?4:3));
}
function landmarkPoiBaseY(poi){
  const [ox,oz]=poi.origin,[w,,d]=poi.compact.size;
  let top=-Infinity;
  for(let x=ox;x<ox+w;x++)for(let z=oz;z<oz+d;z++)top=Math.max(top,terrainHeight(x,z));
  return Math.min(WORLD_MAX_Y-poi.compact.size[1]-1,top+1);
}
function setLandmarkPoiBlocks(poi,full=true,onlyChunk=null){
  const baseY=landmarkPoiBaseY(poi),[ox,oz]=poi.origin;
  // v19: overworld landmarks are always intact. Dungeon progress changes activation, not the silhouette.
  const blocks=poi.compact.fullShell;
  for(const v of blocks){
    const x=ox+v.p[0],y=baseY+v.p[1],z=oz+v.p[2];
    if(!inWorld(x,y,z))continue;
    if(onlyChunk&&worldChunkKey(x,z)!==onlyChunk)continue;
    if(v.p[1]===0){
      const ground=terrainHeight(x,z);
      for(let fy=ground+1;fy<baseY;fy++)
        setRawBlock(x,fy,z,{type:v.type==='redSand'?'redSand':'stone',
          landmarkPoi:poi.id,landmarkRole:'foundation',natural:true,protectedPoi:true});
    }
    setRawBlock(x,y,z,{type:v.type,landmarkPoi:poi.id,landmarkRole:v.role,natural:true,protectedPoi:true});
  }
}
function generateLandmarkPoiChunk(cx,cz){
  if(gameFreeMode!=='survival')return;
  const chunk=cx+','+cz;
  for(const poi of poiRules.poisForChunk(cx,cz,WORLD_CHUNK_SIZE))
    setLandmarkPoiBlocks(poi,true,chunk);
}
function rebuildLandmarkPoi(poi){
  const keys=[];
  for(const [key,data] of worldData)if(data?.landmarkPoi===poi.id)keys.push(key);
  for(const key of keys){const [x,y,z]=parseWorldKey(key);setRawBlock(x,y,z,null);removeWorldMesh(key)}
  const [ox,oz]=poi.origin,[w,,d]=poi.compact.size;
  const minCX=Math.floor(ox/WORLD_CHUNK_SIZE),maxCX=Math.floor((ox+w)/WORLD_CHUNK_SIZE);
  const minCZ=Math.floor(oz/WORLD_CHUNK_SIZE),maxCZ=Math.floor((oz+d)/WORLD_CHUNK_SIZE);
  for(let cx=minCX;cx<=maxCX;cx++)for(let cz=minCZ;cz<=maxCZ;cz++)
    if(worldChunksGenerated.has(cx+','+cz))setLandmarkPoiBlocks(poi,true,cx+','+cz);
  streamWorldMeshes(true);
}
function applyRestoredLandmarksToLoadedWorld(){
  for(const id of restoredLandmarks){
    const poi=poiRules.poiById(id);if(!poi)continue;
    const remove=[];
    for(const [key,data] of worldData)if(data?.landmarkPoi===id)remove.push(key);
    for(const key of remove){const [x,y,z]=parseWorldKey(key);setRawBlock(x,y,z,null)}
    const [ox,oz]=poi.origin,[w,,d]=poi.compact.size;
    const minCX=Math.floor(ox/WORLD_CHUNK_SIZE),maxCX=Math.floor((ox+w)/WORLD_CHUNK_SIZE);
    const minCZ=Math.floor(oz/WORLD_CHUNK_SIZE),maxCZ=Math.floor((oz+d)/WORLD_CHUNK_SIZE);
    for(let cx=minCX;cx<=maxCX;cx++)for(let cz=minCZ;cz<=maxCZ;cz++)
      if(worldChunksGenerated.has(cx+','+cz))setLandmarkPoiBlocks(poi,true,cx+','+cz);
  }
}
function completeLandmarkPoi(id){
  const poi=poiRules.poiById(id);if(!poi||restoredLandmarks.has(id))return;
  // Keep the old save-field name for backward compatibility; it now means dungeon cleared.
  restoredLandmarks.add(id);discoveredLandmarks.add(id);unlockedTech.add(poi.tech.id);refreshBookshelfMeshes();
  for(const [type,n] of Object.entries(poi.tech.reward||{}))addToBag(type,n);
  trackSurvival('restore',id);
  refreshRecipeDiscoveries(true);
  buildInventory();updateFreeMission();saveFreeWorld();
  toast(poi.name+' 던전 클리어 · '+poi.tech.label+' 해금! 전시대에서 기념품도 꺼내 볼 수 있어요.');
}
function returnFromRestoration(){
  const session=restorationSession;
  restorationSession=null;
  if(session?.completed){
    dungeonSession=null;
    enterMode('free');
    completeLandmarkPoi(session.poiId);
    return;
  }
  if(session?.fromDungeon&&dungeonSession){enterMode('dungeon');return}
  enterMode('free');
}
function openLandmarkRestoration(poi){openLandmarkDungeon(poi)}
function markRestorationSuccess(score){
  if(!restorationSession||restorationSession.completed)return;
  restorationSession.completed=true;
  const poi=poiRules.poiById(restorationSession.poiId);
  $('actionNext').textContent='보상 받고 월드로 돌아가기';
  $('resultText').innerHTML+='<br><b>'+poi.tech.label+'</b> 기술을 해금할 수 있어요.';
}

const DUNGEON_THEMES={
  marble:{bg:0x101b2a,floor:0xe7edf2,wall:0xcbd8e1,accent:0x7fe7ff},
  cathedral:{bg:0x151827,floor:0xc9bfae,wall:0x8d7a72,accent:0xffc875},
  iron:{bg:0x101419,floor:0x59636c,wall:0x303942,accent:0x9ee7ff},
  bridge:{bg:0x111a24,floor:0x765b50,wall:0x924e45,accent:0x73cfff},
  castle:{bg:0x111820,floor:0xd8dde0,wall:0xb8c0c5,accent:0xf1b55b},
  jungle:{bg:0x101b16,floor:0x6e7450,wall:0x8c8060,accent:0x9fe36b}
};
const DUNGEON_SPECS={
  taj:{
    objectives:['대칭의 홀 · 좌우 반사경을 모두 깨워 중앙 봉인을 푸세요.','빛의 회랑 · 거울을 왼쪽 → 오른쪽 → 가운데 순서로 작동시키세요.','구조 판별실 · 타지마할의 정면 구조를 가장 잘 설명하는 설계석을 고르세요.','최심부 설계실 · 선택한 구조를 겨냥도로 복원하세요.'],
    seals:['왼쪽 반사경 조사','오른쪽 반사경 조사'],mirrors:['왼쪽 거울 작동','가운데 거울 작동','오른쪽 거울 작동'],
    order:['left','right','center'],hint:'왼쪽 → 오른쪽 → 가운데 순서예요.',portal:'타지마할 설계실 입장',
    structure:{prompt:'타지마할 정면의 핵심 구조는?',correct:'symmetry',options:[
      ['asymmetry','한쪽으로 치우친 비대칭 구조'],['symmetry','중앙 돔을 기준으로 한 좌우 대칭 구조'],['flat','높낮이가 거의 없는 평면 구조']]}
  },
  sagrada:{
    objectives:['쌍둥이 종탑 · 양쪽 종을 울려 중앙 첨탑의 문을 여세요.','첨탑의 합창 · 낮은 종 → 높은 종 → 중앙 종 순서로 울리세요.','구조 판별실 · 여러 첨탑의 높이 관계를 읽고 맞는 설계석을 고르세요.','최상층 설계실 · 첨탑 구조를 겨냥도로 복원하세요.'],
    seals:['서쪽 종탑 울리기','동쪽 종탑 울리기'],mirrors:['낮은 종 울리기','중앙 종 울리기','높은 종 울리기'],
    order:['left','right','center'],hint:'낮은 종 → 높은 종 → 중앙 종 순서예요.',portal:'성당 설계실 입장',
    structure:{prompt:'사그라다 파밀리아 모형의 높이 관계는?',correct:'centerTall',options:[
      ['equal','모든 탑의 높이가 같다'],['centerTall','중앙 첨탑이 주변 첨탑보다 높다'],['outerTall','바깥 탑만 가장 높다']]}
  },
  eiffel:{
    objectives:['기계실 · 좌우 발전기를 모두 켜 승강기를 복구하세요.','철골 제어층 · 세 제어기를 모두 연결해 상층 전원을 복구하세요.','구조 판별실 · 에펠탑 실루엣의 변화를 읽고 맞는 설계석을 고르세요.','정상 설계실 · 철골 구조를 겨냥도로 복원하세요.'],
    seals:['서쪽 발전기 가동','동쪽 발전기 가동'],mirrors:['서쪽 제어기 연결','중앙 제어기 연결','동쪽 제어기 연결'],
    order:null,hint:'세 제어기는 순서와 상관없이 모두 연결하면 돼요.',portal:'정상 설계실 입장',
    structure:{prompt:'에펠탑은 위로 갈수록 어떻게 변할까요?',correct:'taper',options:[
      ['wideTop','위로 갈수록 더 넓어진다'],['taper','위로 갈수록 폭이 좁아진다'],['sameWidth','아래부터 위까지 폭이 같다']]}
  },
  towerBridge:{
    objectives:['교량 제어실 · 양쪽 수압 장치를 모두 켜세요.','개폐교 제어 · 좌우 밸브의 압력을 맞춘 뒤 중앙 밸브를 작동시키세요.','구조 판별실 · 두 탑과 연결 통로의 관계를 읽고 맞는 설계석을 고르세요.','중앙 기관실 · 다리 구조를 겨냥도로 복원하세요.'],
    seals:['서쪽 수압 장치','동쪽 수압 장치'],mirrors:['왼쪽 밸브 조작','가운데 밸브 조작','오른쪽 밸브 조작'],
    order:['left','right','center'],hint:'좌우 밸브를 먼저 맞춘 뒤 가운데 밸브예요.',portal:'중앙 기관실 입장',
    structure:{prompt:'타워 브리지의 핵심 실루엣은?',correct:'twin',options:[
      ['single','하나의 중앙탑만 있는 구조'],['twin','두 탑 사이를 상부 통로가 잇는 구조'],['ring','원형 탑이 고리처럼 이어진 구조']]}
  },
  himeji:{
    objectives:['성문 · 좌우 샤치호코 봉인을 찾아 해제하세요.','백로성 회랑 · 오른쪽 → 왼쪽 → 가운데 문장을 맞추세요.','구조 판별실 · 천수의 지붕이 쌓이는 방식을 읽고 맞는 설계석을 고르세요.','천수각 설계실 · 겹지붕 구조를 겨냥도로 복원하세요.'],
    seals:['서쪽 성문 봉인','동쪽 성문 봉인'],mirrors:['왼쪽 문장 맞추기','가운데 문장 맞추기','오른쪽 문장 맞추기'],
    order:['right','left','center'],hint:'오른쪽 → 왼쪽 → 가운데 순서예요.',portal:'천수각 설계실 입장',
    structure:{prompt:'히메지성 모형의 지붕은 어떻게 보이나요?',correct:'layered',options:[
      ['flat','한 장의 평평한 지붕'],['layered','높이가 달라지며 여러 겹으로 쌓인 지붕'],['roofless','지붕 없이 벽만 높은 구조']]}
  },
  angkor:{
    objectives:['수호자의 회랑 · 양쪽 수호상을 깨워 석문을 여세요.','고대 문양 · 가운데 → 왼쪽 → 오른쪽 룬을 밟으세요.','구조 판별실 · 중앙탑과 주변 탑의 배치를 읽고 맞는 설계석을 고르세요.','중앙 성소 · 석조 건축을 겨냥도로 복원하세요.'],
    seals:['서쪽 수호상 깨우기','동쪽 수호상 깨우기'],mirrors:['왼쪽 룬 활성화','가운데 룬 활성화','오른쪽 룬 활성화'],
    order:['center','left','right'],hint:'가운데 → 왼쪽 → 오른쪽 순서예요.',portal:'중앙 성소 설계실 입장',
    structure:{prompt:'앙코르와트의 중심부 배치는?',correct:'five',options:[
      ['line','탑들이 한 줄로만 늘어선다'],['five','높은 중앙탑과 주변 네 탑이 대칭을 이룬다'],['random','탑의 위치에 규칙이 없다']]}
  }
};
function dungeonSpec(poi){return DUNGEON_SPECS[poi?.id]||DUNGEON_SPECS.taj}

const DUNGEON_SHRINE_OBJECTIVES=[
  '그림자 겨냥도 · 중앙 블록 장치의 모양을 바꿔 위·정면·옆면 그림자를 모두 맞추세요.',
  '입체 설계실 · 벽의 겨냥도를 보고 중앙 장치의 블록을 정확한 위치에 놓으세요.',
  '전개도 접기 · 바닥의 세 전개도 중 실제 정육면체로 접히는 것을 찾아 직접 작동시키세요.',
  '설계 핵심 회수 · 마지막 장치를 조사해 랜드마크의 건축 기술을 가져가세요.'
];
const DUNGEON_VOXEL_VARIANTS=[
  {
    shadow:{
      target:[[0,0,0],[1,0,0],[2,0,0],[1,1,0],[1,0,1]],
      allowed:[[0,0,0],[1,0,0],[2,0,0],[0,0,1],[1,0,1],[2,0,1],[0,1,0],[1,1,0],[2,1,0],[1,1,1]],
      initial:[[0,0,0],[1,0,0],[2,0,0],[0,0,1],[1,1,1]]
    },
    build:{
      target:[[0,0,0],[1,0,0],[2,0,0],[0,1,0],[2,1,0],[1,1,1]],
      allowed:[[0,0,0],[1,0,0],[2,0,0],[0,0,1],[1,0,1],[2,0,1],[0,1,0],[1,1,0],[2,1,0],[1,1,1]],
      initial:[[0,0,0],[1,0,0],[2,0,0],[1,1,0],[1,0,1]]
    }
  },
  {
    shadow:{
      target:[[0,0,0],[0,0,1],[1,0,1],[2,0,1],[2,1,1]],
      allowed:[[0,0,0],[1,0,0],[2,0,0],[0,0,1],[1,0,1],[2,0,1],[0,1,0],[1,1,0],[2,1,1],[1,1,1]],
      initial:[[0,0,0],[1,0,0],[0,0,1],[1,0,1],[1,1,1]]
    },
    build:{
      target:[[0,0,0],[0,0,1],[1,0,1],[2,0,1],[0,1,0],[2,1,1]],
      allowed:[[0,0,0],[1,0,0],[2,0,0],[0,0,1],[1,0,1],[2,0,1],[0,1,0],[1,1,0],[2,1,1],[1,1,1]],
      initial:[[0,0,0],[0,0,1],[1,0,1],[2,0,1],[1,1,0]]
    }
  },
  {
    shadow:{
      target:[[0,0,0],[1,0,0],[1,0,1],[2,0,1],[0,1,0],[2,1,1]],
      allowed:[[0,0,0],[1,0,0],[2,0,0],[0,0,1],[1,0,1],[2,0,1],[0,1,0],[1,1,0],[2,1,1],[1,1,1]],
      initial:[[0,0,0],[1,0,0],[2,0,0],[1,0,1],[1,1,1]]
    },
    build:{
      target:[[0,0,0],[1,0,0],[1,0,1],[2,0,1],[0,1,0],[1,1,1],[2,1,1]],
      allowed:[[0,0,0],[1,0,0],[2,0,0],[0,0,1],[1,0,1],[2,0,1],[0,1,0],[1,1,0],[2,1,1],[1,1,1]],
      initial:[[0,0,0],[1,0,0],[1,0,1],[2,0,1],[1,1,0],[2,1,1]]
    }
  }
];
const DUNGEON_INVALID_NETS=[
  [[0,0],[1,0],[0,1],[1,1],[0,2],[1,2]],
  [[0,0],[1,0],[0,1],[1,1],[2,1],[2,2]]
];
function dungeonShrineVariant(poi){
  const seed=Number.isFinite(poi?.missionIndex)?poi.missionIndex:
    ['taj','sagrada','eiffel','towerBridge','himeji','angkor'].indexOf(poi?.id);
  return DUNGEON_VOXEL_VARIANTS[((seed||0)%DUNGEON_VOXEL_VARIANTS.length+
    DUNGEON_VOXEL_VARIANTS.length)%DUNGEON_VOXEL_VARIANTS.length];
}
function dungeonNetChoices(poi){
  const seed=Number.isFinite(poi?.missionIndex)?poi.missionIndex:0;
  const correctIndex=((seed%3)+3)%3;
  const valid=NET_VARIANTS[(seed+3)%NET_VARIANTS.length].layout.map(p=>p.slice());
  const layouts=[DUNGEON_INVALID_NETS[0].map(p=>p.slice()),DUNGEON_INVALID_NETS[1].map(p=>p.slice())];
  layouts.splice(correctIndex,0,valid);
  return layouts.slice(0,3).map((layout,index)=>({layout,valid:index===correctIndex}));
}
function dungeonVoxelKey(p){return p.join(',')}
function dungeonVoxelPoints(stage){
  const raw=dungeonSession?.puzzleState?.[stage]||[];
  return raw.map(k=>String(k).split(',').map(Number));
}
function dungeonVoxelDefinition(poi,stage){
  const variant=dungeonShrineVariant(poi);return stage===0?variant.shadow:variant.build;
}
function dungeonSetVoxel(stage,key,on){
  if(!dungeonSession)return;
  dungeonSession.puzzleState=dungeonSession.puzzleState||{};
  const set=new Set(dungeonSession.puzzleState[stage]||[]);
  if(on)set.add(key);else set.delete(key);
  dungeonSession.puzzleState[stage]=[...set];
}
function dungeonMaterial(color,emissive=0){
  return new THREE.MeshStandardMaterial({color,roughness:.72,metalness:.04,emissive,emissiveIntensity:emissive?0.35:0});
}
function addDungeonBox(x,y,z,w,h,d,color,userData=null){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),dungeonMaterial(color));
  m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;
  if(userData)Object.assign(m.userData,userData);
  scene.add(m);return m;
}
function glowDungeonTarget(mesh,on){
  if(!mesh?.material)return;
  mesh.material.emissive.setHex(on?0x49d8ff:0x000000);
  mesh.material.emissiveIntensity=on?.9:0;
}
function addDungeonTarget(id,kind,x,z,color,label){
  const base=addDungeonBox(x,.55,z,1.15,1.1,1.15,color,{dungeonTarget:true,targetId:id,targetKind:kind,label});
  const orb=new THREE.Mesh(new THREE.OctahedronGeometry(.38,0),dungeonMaterial(color));
  orb.position.set(x,1.48,z);orb.userData={dungeonTarget:true,targetId:id,targetKind:kind,label,base};
  scene.add(orb);dungeonTargets.push(orb);
  return orb;
}
function dungeonColorCss(color){return '#'+Number(color||0xffffff).toString(16).padStart(6,'0')}
function addDungeonCanvasPanel(z,title,draw){
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=320;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#0b1524';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='#e9f5ff';ctx.font='900 34px "Pretendard","Noto Sans KR",sans-serif';ctx.textAlign='center';ctx.fillText(title,384,45);
  draw(ctx,canvas);
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
  const mat=new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide,toneMapped:false});
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(6.1,2.55),mat);mesh.position.set(0,2.45,z);scene.add(mesh);return mesh;
}
function drawDungeonProjection(ctx,points,view,x,y,w,h,label,color='#7fe7ff'){
  const cells=[...projectionSet(points,view)].map(k=>k.split(',').map(Number));
  const xs=cells.map(p=>p[0]),ys=cells.map(p=>p[1]);
  const minX=Math.min(...xs,0),maxX=Math.max(...xs,0),minY=Math.min(...ys,0),maxY=Math.max(...ys,0);
  const cols=Math.max(1,maxX-minX+1),rows=Math.max(1,maxY-minY+1),cell=Math.min(w/cols,h/rows);
  const ox=x+(w-cols*cell)/2,oy=y+(h-rows*cell)/2;
  ctx.fillStyle='#a9bad0';ctx.font='800 20px "Pretendard","Noto Sans KR",sans-serif';ctx.textAlign='center';ctx.fillText(label,x+w/2,y-10);
  ctx.strokeStyle='rgba(255,255,255,.18)';ctx.lineWidth=2;
  for(let cx=0;cx<cols;cx++)for(let cy=0;cy<rows;cy++)ctx.strokeRect(ox+cx*cell,oy+cy*cell,cell,cell);
  ctx.fillStyle=color;
  for(const [a,b] of cells){
    const gx=a-minX,gy=maxY-b;
    ctx.fillRect(ox+gx*cell+3,oy+gy*cell+3,cell-6,cell-6);
  }
}
function addDungeonProjectionPanel(target,z,color){
  return addDungeonCanvasPanel(z,'3면 그림자 겨냥도',(ctx)=>{
    const c=dungeonColorCss(color);
    drawDungeonProjection(ctx,target,'top',54,105,190,150,'위에서',c);
    drawDungeonProjection(ctx,target,'front',289,105,190,150,'앞에서',c);
    drawDungeonProjection(ctx,target,'side',524,105,190,150,'옆에서',c);
  });
}
function addDungeonIsometricPanel(target,z,color){
  return addDungeonCanvasPanel(z,'겨냥도를 보고 똑같이 쌓기',(ctx)=>{
    const c=dungeonColorCss(color),sorted=target.slice().sort((a,b)=>(a[1]+a[2]+a[0])-(b[1]+b[2]+b[0]));
    const ox=384,oy=225,sx=42,sy=22,vy=43;
    for(const [x,y,z0] of sorted){
      const px=ox+(x-z0)*sx,py=oy+(x+z0)*sy-y*vy;
      ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(px,py-sy);ctx.lineTo(px+sx,py);ctx.lineTo(px,py+sy);ctx.lineTo(px-sx,py);ctx.closePath();ctx.fill();
      ctx.fillStyle='rgba(0,0,0,.20)';ctx.beginPath();ctx.moveTo(px-sx,py);ctx.lineTo(px,py+sy);ctx.lineTo(px,py+sy+vy);ctx.lineTo(px-sx,py+vy);ctx.closePath();ctx.fill();
      ctx.fillStyle='rgba(255,255,255,.18)';ctx.beginPath();ctx.moveTo(px+sx,py);ctx.lineTo(px,py+sy);ctx.lineTo(px,py+sy+vy);ctx.lineTo(px+sx,py+vy);ctx.closePath();ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,.65)';ctx.lineWidth=2;ctx.strokeRect(px-sx,py,2*sx,vy);
    }
    ctx.fillStyle='#b8c8dc';ctx.font='700 20px "Pretendard","Noto Sans KR",sans-serif';ctx.fillText('블록 수 '+target.length+'개 · 위치까지 정확히 맞추세요.',384,290);
  });
}
function dungeonVoxelLabel([x,y,z]){
  return (x===0?'왼쪽':x===1?'가운데':'오른쪽')+' · '+(y===0?'아래':'위')+' · '+(z===0?'앞':'뒤')+' 블록';
}
function dungeonVoxelRoomZ(stage){return stage===0?4.2:-8.4}
function renderDungeonVoxelPuzzle(stage,theme){
  const poi=poiRules.poiById(dungeonSession?.poiId);if(!poi)return;
  const def=dungeonVoxelDefinition(poi,stage),active=new Set(dungeonSession?.puzzleState?.[stage]||[]);
  const old=dungeonPuzzleGroups.get(stage);if(old)scene.remove(old);
  dungeonTargets=dungeonTargets.filter(t=>!(t.userData.targetKind==='shrineCell'&&t.userData.puzzleStage===stage));
  const group=new THREE.Group(),centerZ=dungeonVoxelRoomZ(stage);
  for(const p of def.allowed){
    const key=dungeonVoxelKey(p),on=active.has(key),mesh=new THREE.Mesh(
      new THREE.BoxGeometry(.76,.76,.76),
      on?dungeonMaterial(theme.accent,theme.accent):new THREE.MeshBasicMaterial({color:theme.accent,wireframe:true,transparent:true,opacity:.24})
    );
    mesh.position.set((p[0]-1)*.86,.48+p[1]*.86,centerZ+(p[2]-.5)*.86);
    mesh.userData={
      dungeonTarget:true,targetKind:'shrineCell',targetId:'cell-'+stage+'-'+key,
      puzzleStage:stage,voxelKey:key,label:dungeonVoxelLabel(p)+(on?' 빼기':' 넣기')
    };
    group.add(mesh);dungeonTargets.push(mesh);
  }
  scene.add(group);dungeonPuzzleGroups.set(stage,group);
}
function addDungeonVoxelControls(stage,def,theme){
  const z=dungeonVoxelRoomZ(stage);
  addDungeonBox(0,.08,z,3.8,.16,2.6,theme.wall);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.55,.045,8,40),new THREE.MeshBasicMaterial({color:theme.accent,transparent:true,opacity:.72}));
  ring.rotation.x=-Math.PI/2;ring.position.set(0,.19,z);scene.add(ring);
  renderDungeonVoxelPuzzle(stage,theme);
}
function dungeonShadowScores(poi){
  const def=dungeonVoxelDefinition(poi,0),active=dungeonVoxelPoints(0);
  return ['top','front','side'].map(view=>overlapScore(projectionSet(active,view),projectionSet(def.target,view)));
}
function dungeonBuildStats(poi){
  const def=dungeonVoxelDefinition(poi,1),active=new Set(dungeonSession?.puzzleState?.[1]||[]),target=new Set(def.target.map(dungeonVoxelKey));
  let common=0;for(const key of active)if(target.has(key))common++;
  return {common,active:active.size,target:target.size,done:active.size===target.size&&common===target.size};
}
function dungeonPuzzleStatusText(poi,stage){
  if(stage===0){
    const [top,front,side]=dungeonShadowScores(poi);
    return '그림자 일치 · 위 '+top+'% · 앞 '+front+'% · 옆 '+side+'%';
  }
  if(stage===1){
    const s=dungeonBuildStats(poi);return '정확한 블록 '+s.common+'/'+s.target+' · 현재 블록 '+s.active+'개';
  }
  if(stage===2)return dungeonSession?.netAnimating?'전개도가 접히는 중…':'세 전개도를 걸어 다니며 조사하고, 실제로 접어 보세요.';
  return '모든 수학 장치 해독 완료 · 설계 핵심을 회수하세요.';
}
function completeDungeonVoxelStage(stage,poi){
  if(stage===0){
    const scores=dungeonShadowScores(poi);
    if(!scores.every(v=>v===100))return false;
    dungeonSession.stage=1;if(dungeonGates[0])dungeonGates[0].visible=false;
    toast('세 방향의 그림자가 모두 맞았어요! 다음 설계실이 열렸습니다.');sfx('good');updateDungeonHud();return true;
  }
  if(stage===1){
    const stats=dungeonBuildStats(poi);if(!stats.done)return false;
    dungeonSession.stage=2;if(dungeonGates[1])dungeonGates[1].visible=false;
    toast('겨냥도와 같은 입체를 완성했어요! 전개도 방이 열렸습니다.');sfx('good');updateDungeonHud();return true;
  }
  return false;
}
function addDungeonNetCandidates(poi,theme){
  dungeonNetVisuals=[];const choices=dungeonNetChoices(poi),xs=[-4.2,0,4.2],z=-19.0,scale=.48;
  choices.forEach((choice,index)=>{
    const group=new THREE.Group(),cols=choice.layout.map(p=>p[0]),rows=choice.layout.map(p=>p[1]);
    const cx=(Math.min(...cols)+Math.max(...cols))/2,cy=(Math.min(...rows)+Math.max(...rows))/2;
    choice.layout.forEach(([col,row],face)=>{
      const tile=new THREE.Mesh(new THREE.BoxGeometry(.62,.07,.62),dungeonMaterial(theme.accent));
      tile.position.set(xs[index]+(col-cx)*scale,.08,z+(row-cy)*scale);
      tile.userData.face=face;group.add(tile);
    });
    scene.add(group);dungeonNetVisuals.push({group,tiles:[...group.children],valid:choice.valid,x:xs[index],z});
    const t=addDungeonTarget('net-'+index,'shrineNet',xs[index],-16.4,theme.accent,'전개도 '+(index+1)+' 접어 보기');
    t.userData.netIndex=index;
  });
}
function animateDungeonNetChoice(index){
  if(!dungeonSession||dungeonSession.stage!==2||dungeonSession.netAnimating)return;
  const visual=dungeonNetVisuals[index];if(!visual)return;
  dungeonSession.netAnimating=true;updateDungeonHud();const ticket=++dungeonFoldNonce;
  const starts=visual.tiles.map(t=>({p:t.position.clone(),r:t.rotation.clone()}));
  const ends=[
    new THREE.Vector3(visual.x+.34,1.25,visual.z),new THREE.Vector3(visual.x-.34,1.25,visual.z),
    new THREE.Vector3(visual.x,1.59,visual.z),new THREE.Vector3(visual.x,.91,visual.z),
    new THREE.Vector3(visual.x,1.25,visual.z+.34),new THREE.Vector3(visual.x,1.25,visual.z-.34)
  ];
  if(!visual.valid)ends[5]=ends[4].clone();
  const rots=[
    new THREE.Euler(0,0,Math.PI/2),new THREE.Euler(0,0,-Math.PI/2),
    new THREE.Euler(0,0,0),new THREE.Euler(Math.PI,0,0),
    new THREE.Euler(Math.PI/2,0,0),new THREE.Euler(-Math.PI/2,0,0)
  ];
  const start=performance.now();
  function fold(now){
    if(ticket!==dungeonFoldNonce||!dungeonSession)return;
    const q=Math.min(1,(now-start)/900),e=1-Math.pow(1-q,3);
    visual.tiles.forEach((tile,i)=>{
      tile.position.lerpVectors(starts[i].p,ends[i],e);
      tile.rotation.set(rots[i].x*e,rots[i].y*e,rots[i].z*e);
    });
    if(q<1){requestAnimationFrame(fold);return}
    if(visual.valid){
      dungeonSession.netAnimating=false;dungeonSession.stage=3;if(dungeonGates[2])dungeonGates[2].visible=false;
      const portal=dungeonTargets.find(t=>t.userData.targetKind==='shrinePortal');
      if(portal){glowDungeonTarget(portal,true);glowDungeonTarget(portal.userData.base,true)}
      toast('전개도가 정확히 정육면체로 접혔어요! 마지막 설계 핵심이 열렸습니다.');sfx('good');updateDungeonHud();return;
    }
    toast('접는 도중 면이 겹쳤어요. 다른 전개도를 시험해 보세요.');sfx('bad');
    const back=performance.now();
    function unfold(now2){
      if(ticket!==dungeonFoldNonce||!dungeonSession)return;
      const q2=Math.min(1,(now2-back)/520),e2=1-Math.pow(1-q2,3);
      visual.tiles.forEach((tile,i)=>{
        tile.position.lerpVectors(ends[i],starts[i].p,e2);
        tile.rotation.set(rots[i].x*(1-e2),rots[i].y*(1-e2),rots[i].z*(1-e2));
      });
      if(q2<1)requestAnimationFrame(unfold);else{dungeonSession.netAnimating=false;updateDungeonHud()}
    }
    setTimeout(()=>requestAnimationFrame(unfold),260);
  }
  requestAnimationFrame(fold);
}
function buildShrineDungeonPuzzles(poi,theme){
  dungeonPuzzleGroups=new Map();dungeonNetVisuals=[];dungeonFoldNonce++;
  const variant=dungeonShrineVariant(poi);
  addDungeonProjectionPanel(variant.shadow.target,.55,theme.accent);
  addDungeonVoxelControls(0,variant.shadow,theme);
  dungeonGate(-1.2,theme.wall);
  addDungeonIsometricPanel(variant.build.target,-12.75,theme.accent);
  addDungeonVoxelControls(1,variant.build,theme);
  dungeonGate(-14.2,theme.wall);
  addDungeonNetCandidates(poi,theme);
  dungeonGate(-22.1,theme.wall);
  const portal=addDungeonTarget('shrine-reward','shrinePortal',0,-25.2,theme.accent,'설계 핵심 회수');
  glowDungeonTarget(portal,false);glowDungeonTarget(portal.userData.base,false);
  return portal;
}
function completeDungeonShrine(){
  if(!dungeonSession||dungeonSession.stage<3)return;
  const poi=poiRules.poiById(dungeonSession.poiId);if(!poi)return;
  const id=poi.id;dungeonSession=null;dungeonFoldNonce++;
  enterMode('free');
  if(!restoredLandmarks.has(id))completeLandmarkPoi(id);
  reportResult('survival-landmark',100,true);
}
function dungeonGate(z,color){
  const gate=addDungeonBox(0,2.25,z,11.8,4.5,.35,color,{dungeonGate:true});
  dungeonGates.push(gate);return gate;
}
function updateDungeonCamera(){
  camera.rotation.order='YXZ';camera.rotation.y=dungeonYaw;camera.rotation.x=dungeonPitch;
}
function updateDungeonHud(){
  if(!dungeonSession)return;
  const poi=poiRules.poiById(dungeonSession.poiId);if(!poi)return;
  const stage=dungeonSession.stage||0,spec=dungeonSpec(poi),shrine=!!dungeonSession.shrineVersion;
  $('dungeonTitle').textContent=poi.name+' · '+poi.dungeon.title;
  $('dungeonProgress').textContent=(stage+1)+'/4';
  $('dungeonObjective').textContent=shrine?(DUNGEON_SHRINE_OBJECTIVES[stage]||DUNGEON_SHRINE_OBJECTIVES[3]):
    (spec.objectives[stage]||spec.objectives[2]);
  if($('dungeonPuzzleStatus')){
    $('dungeonPuzzleStatus').classList.toggle('hidden',!shrine);
    if(shrine)$('dungeonPuzzleStatus').textContent=dungeonPuzzleStatusText(poi,stage);
  }
  const near=nearestDungeonTarget(2.4);
  $('dungeonPrompt').classList.toggle('hidden',!near);
  if(near)$('dungeonPrompt').textContent='E · '+near.userData.label;
}
function nearestDungeonTarget(max=2.4){
  if(!dungeonSession)return null;
  return dungeonTargets.map(m=>({m,d:camera.position.distanceTo(m.position)}))
    .filter(v=>v.d<=max).sort((a,b)=>a.d-b.d)[0]?.m||null;
}
function dungeonInteract(){
  const target=nearestDungeonTarget(2.6);
  if(!target){toast('조사할 장치에 조금 더 가까이 가 보세요.');return}
  const data=target.userData,stage=dungeonSession.stage||0;
  if(data.targetKind==='shrineVoxel'||data.targetKind==='shrineCell'){
    if(data.puzzleStage!==stage){toast('지금 방의 수학 장치부터 해결해 보세요.');return}
    const poi=poiRules.poiById(dungeonSession.poiId),theme=DUNGEON_THEMES[poi?.dungeon?.theme]||DUNGEON_THEMES.marble;
    const active=new Set(dungeonSession.puzzleState?.[stage]||[]),on=!active.has(data.voxelKey);
    dungeonSetVoxel(stage,data.voxelKey,on);renderDungeonVoxelPuzzle(stage,theme);sfx('place');
    completeDungeonVoxelStage(stage,poi);updateDungeonHud();return;
  }
  if(data.targetKind==='shrineNet'){
    if(stage!==2){toast('앞쪽 퍼즐부터 해결해야 이 장치를 사용할 수 있어요.');return}
    animateDungeonNetChoice(data.netIndex);return;
  }
  if(data.targetKind==='shrinePortal'){
    if(stage<3){toast('세 개의 수학 퍼즐을 모두 해결해야 설계 핵심이 열려요.');return}
    completeDungeonShrine();return;
  }
  if(data.targetKind==='seal'&&stage===0){
    const active=dungeonSession.seals||(dungeonSession.seals=[]);
    if(!active.includes(data.targetId)){active.push(data.targetId);glowDungeonTarget(target,true);glowDungeonTarget(data.base,true);sfx('good')}
    if(active.length>=2){
      dungeonSession.stage=1;if(dungeonGates[0])dungeonGates[0].visible=false;
      toast('대칭 봉인이 풀렸어요. 빛의 회랑이 열립니다.');
    }else toast('반대편의 봉인 장치도 찾아보세요.');
    updateDungeonHud();return;
  }
  if(data.targetKind==='mirror'&&stage===1){
    const poi=poiRules.poiById(dungeonSession.poiId),spec=dungeonSpec(poi);
    const seq=dungeonSession.mirrors||(dungeonSession.mirrors=[]);
    if(seq.includes(data.targetId)){toast('이미 작동한 장치예요.');return}
    if(Array.isArray(spec.order)){
      const expected=spec.order[seq.length];
      if(data.targetId!==expected){
        seq.length=0;
        dungeonTargets.filter(m=>m.userData.targetKind==='mirror').forEach(m=>{glowDungeonTarget(m,false);glowDungeonTarget(m.userData.base,false)});
        toast('순서가 끊겼어요. '+spec.hint);sfx('bad');return;
      }
    }
    seq.push(data.targetId);glowDungeonTarget(target,true);glowDungeonTarget(data.base,true);sfx('good');
    if(seq.length===3){
      dungeonSession.stage=2;if(dungeonGates[1])dungeonGates[1].visible=false;
      toast('장치가 모두 연결됐어요. 이제 건축 구조를 읽어 설계석을 고르세요.');
    }
    updateDungeonHud();return;
  }
  if(data.targetKind==='structure'&&stage===2){
    const poi=poiRules.poiById(dungeonSession.poiId),spec=dungeonSpec(poi);
    if(data.targetId!==spec.structure.correct){
      toast('구조를 다시 관찰해 보세요. '+spec.structure.prompt);sfx('bad');return;
    }
    dungeonSession.structure=data.targetId;dungeonSession.stage=3;
    glowDungeonTarget(target,true);glowDungeonTarget(data.base,true);
    if(dungeonGates[2])dungeonGates[2].visible=false;
    const portal=dungeonTargets.find(m=>m.userData.targetKind==='portal');
    if(portal){glowDungeonTarget(portal,true);glowDungeonTarget(portal.userData.base,true)}
    toast('구조 해독 성공! 이제 최심부 겨냥도를 복원할 수 있어요.');sfx('good');updateDungeonHud();return;
  }
  if(data.targetKind==='portal'&&stage>=3){openDungeonBlueprint();return}
  toast('아직 이 장치를 사용할 수 없어요.');
}
function buildLandmarkDungeonScene(poi){
  const theme=DUNGEON_THEMES[poi.dungeon?.theme]||DUNGEON_THEMES.marble;
  cleanScene(theme.bg);scene.fog=new THREE.Fog(theme.bg,18,48);
  const floor=new THREE.Mesh(new THREE.BoxGeometry(14,.35,40),dungeonMaterial(theme.floor));
  floor.position.set(0,-.18,-8);floor.receiveShadow=true;scene.add(floor);
  addDungeonBox(-7,2.4,-8,.45,4.8,40,theme.wall);
  addDungeonBox(7,2.4,-8,.45,4.8,40,theme.wall);
  addDungeonBox(0,4.8,-8,14,.35,40,theme.wall);
  addDungeonBox(0,2.4,12,14,4.8,.45,theme.wall);
  addDungeonBox(0,2.4,-28,14,4.8,.45,theme.wall);
  for(const z of [7,2,-7,-12,-20,-25]){
    addDungeonBox(-5.5,1.5,z,.7,3,.7,theme.accent);
    addDungeonBox(5.5,1.5,z,.7,3,.7,theme.accent);
  }
  dungeonTargets=[];dungeonGates=[];
  const spec=dungeonSpec(poi);
  const portal=dungeonSession?.shrineVersion?buildShrineDungeonPuzzles(poi,theme):
    addDungeonTarget('blueprint','portal',0,-25.2,theme.accent,spec.portal);
  if(!dungeonSession?.shrineVersion){
    addDungeonTarget('left','seal',-3.2,3,theme.accent,spec.seals[0]);
    addDungeonTarget('right','seal',3.2,3,theme.accent,spec.seals[1]);
    dungeonGate(-1.2,theme.wall);
    addDungeonTarget('left','mirror',-3.1,-8,theme.accent,spec.mirrors[0]);
    addDungeonTarget('center','mirror',0,-10.5,theme.accent,spec.mirrors[1]);
    addDungeonTarget('right','mirror',3.1,-8,theme.accent,spec.mirrors[2]);
    dungeonGate(-14.2,theme.wall);
    spec.structure.options.forEach((option,i)=>{
      const x=[-3.8,0,3.8][i];
      addDungeonTarget(option[0],'structure',x,-18.3,theme.accent,option[1]);
    });
    dungeonGate(-22.1,theme.wall);
  }
  // Landmark-specific silhouettes make the same three-room rules read as different places.
  if(poi.id==='taj'){
    for(const x of [-4.3,4.3])for(const z of [5,-5,-17])addDungeonBox(x,2,z,.55,4,.55,theme.wall);
    addDungeonBox(0,4.15,-22,5.5,.35,3.5,theme.accent);
  }else if(poi.id==='sagrada'){
    for(const x of [-4.8,-2.4,2.4,4.8])addDungeonBox(x,3.2,-9,.5,6.4,.5,theme.accent);
    addDungeonBox(0,5.5,-21,4.5,1,1.2,theme.wall);
  }else if(poi.id==='eiffel'){
    for(const z of [5,-5,-17,-24]){addDungeonBox(-4.4,2,z,.38,4,6,theme.accent);addDungeonBox(4.4,2,z,.38,4,6,theme.accent)}
  }else if(poi.id==='towerBridge'){
    addDungeonBox(-5.2,.08,-9,2.4,.12,28,0x4b9bd8);addDungeonBox(5.2,.08,-9,2.4,.12,28,0x4b9bd8);
    addDungeonBox(0,3.4,-21,8,.5,.8,theme.accent);
  }else if(poi.id==='himeji'){
    for(const [x,z] of [[-2.7,-4],[2.7,-9],[-2.7,-15],[2.7,-20]])addDungeonBox(x,1.5,z,5.5,3,.25,theme.wall);
    addDungeonBox(0,4,-23,6,.4,3,0xf2f4f5);
  }else if(poi.id==='angkor'){
    for(const [x,z] of [[-4.6,4],[4.6,4],[-4.6,-8],[4.6,-8],[-4.6,-20],[4.6,-20]])addDungeonBox(x,1.4,z,1.4,2.8,1.4,theme.wall);
    addDungeonBox(0,.08,-19,8,.12,4,0x607d45);
  }
  if((dungeonSession.stage||0)<3){glowDungeonTarget(portal,false);glowDungeonTarget(portal.userData.base,false)}
  else if(dungeonSession?.shrineVersion){glowDungeonTarget(portal,true);glowDungeonTarget(portal.userData.base,true)}
  if((dungeonSession.stage||0)>=1&&dungeonGates[0])dungeonGates[0].visible=false;
  if((dungeonSession.stage||0)>=2&&dungeonGates[1])dungeonGates[1].visible=false;
  if((dungeonSession.stage||0)>=3&&dungeonGates[2])dungeonGates[2].visible=false;
  if(dungeonSession.structure){
    const m=dungeonTargets.find(t=>t.userData.targetKind==='structure'&&t.userData.targetId===dungeonSession.structure);
    if(m){glowDungeonTarget(m,true);glowDungeonTarget(m.userData.base,true)}
  }
  for(const id of dungeonSession.seals||[]){
    const m=dungeonTargets.find(t=>t.userData.targetKind==='seal'&&t.userData.targetId===id);
    if(m){glowDungeonTarget(m,true);glowDungeonTarget(m.userData.base,true)}
  }
  for(const id of dungeonSession.mirrors||[]){
    const m=dungeonTargets.find(t=>t.userData.targetKind==='mirror'&&t.userData.targetId===id);
    if(m){glowDungeonTarget(m,true);glowDungeonTarget(m.userData.base,true)}
  }
}
function initDungeon(){
  const poi=dungeonSession&&poiRules.poiById(dungeonSession.poiId);
  if(!poi){dungeonSession=null;enterMode('free');return}
  modeTitle(dungeonSession?.shrineVersion?'랜드마크 수학 사당':'랜드마크 던전',poi.name+' · '+poi.dungeon.title);
  setVisible('dungeonHud',true);
  $('actionNext').classList.remove('hidden');$('actionNext').textContent='월드로 귀환';$('actionNext').onclick=returnFromDungeon;
  $('actionCheck').classList.remove('hidden');$('actionCheck').textContent='조사하기';$('actionCheck').disabled=false;$('actionCheck').onclick=dungeonInteract;
  buildLandmarkDungeonScene(poi);
  camera.position.set(0,1.65,10);dungeonYaw=0;dungeonPitch=0;dungeonKeys={};updateDungeonCamera();
  configureMobileMode('dungeon');updateDungeonHud();
  if(!mobileModeEnabled)toast(dungeonSession?.shrineVersion?
    'WASD로 퍼즐 방을 걸어 다니고 · E로 블록 장치를 직접 바꿔 보세요.':
    'WASD로 탐험 · 마우스로 시점 · E로 장치 조사');
}
function openLandmarkDungeon(poi){
  if(!poi||gameFreeMode!=='survival')return;
  saveFreeWorld();
  const variant=dungeonShrineVariant(poi);
  dungeonSession={
    poiId:poi.id,stage:0,seals:[],mirrors:[],structure:null,shrineVersion:1,netAnimating:false,
    puzzleState:{
      0:variant.shadow.initial.map(dungeonVoxelKey),
      1:variant.build.initial.map(dungeonVoxelKey)
    }
  };
  enterMode('dungeon');
}
function returnFromDungeon(){
  dungeonFoldNonce++;dungeonSession=null;enterMode('free');
}
function openDungeonBlueprint(){
  if(!dungeonSession)return;
  const poi=poiRules.poiById(dungeonSession.poiId);if(!poi)return;
  challengeDifficulty='hard';missionIndex=poi.missionIndex;
  restorationSession={poiId:poi.id,missionIndex:poi.missionIndex,completed:false,fromDungeon:true};
  enterMode('challenge');
}
function updateDungeon(dt){
  if(!dungeonSession)return;
  const speed=(dungeonKeys.ControlLeft||dungeonKeys.ControlRight)?6.5:4.2;
  const forward=new THREE.Vector3(Math.sin(dungeonYaw),0,Math.cos(dungeonYaw));
  const right=new THREE.Vector3(Math.cos(dungeonYaw),0,-Math.sin(dungeonYaw));
  const move=new THREE.Vector3();
  if(dungeonKeys.KeyW||dungeonKeys.ArrowUp)move.addScaledVector(forward,-1);
  if(dungeonKeys.KeyS||dungeonKeys.ArrowDown)move.add(forward);
  if(dungeonKeys.KeyA||dungeonKeys.ArrowLeft)move.addScaledVector(right,-1);
  if(dungeonKeys.KeyD||dungeonKeys.ArrowRight)move.add(right);
  if(mobileModeEnabled){move.addScaledVector(forward,mobileMove.y);move.addScaledVector(right,mobileMove.x)}
  if(move.lengthSq())camera.position.add(move.normalize().multiplyScalar(speed*dt));
  const stage=dungeonSession.stage||0,minZ=stage>=3?-27:stage>=2?-21.4:stage>=1?-13.5:-.4;
  camera.position.x=THREE.MathUtils.clamp(camera.position.x,-6.1,6.1);
  camera.position.z=THREE.MathUtils.clamp(camera.position.z,minZ,10.6);
  camera.position.y=1.65;updateDungeonCamera();updateDungeonHud();
}
const FACE_NAMES=['오른쪽','왼쪽','위','아래','앞','뒤'];
const FACE_IDS=['R','L','U','D','F','B'];
const CUBOID_TOPOLOGY={
  vertices:[
    {id:'A',s:[-1,-1,-1]},{id:'B',s:[1,-1,-1]},{id:'C',s:[1,-1,1]},{id:'D',s:[-1,-1,1]},
    {id:'E',s:[-1,1,-1]},{id:'F',s:[1,1,-1]},{id:'G',s:[1,1,1]},{id:'H',s:[-1,1,1]}
  ],
  edges:[['A','B'],['B','C'],['C','D'],['D','A'],['E','F'],['F','G'],['G','H'],['H','E'],['A','E'],['B','F'],['C','G'],['D','H']],
  faces:[
    {id:'R',vertices:['B','C','G','F'],parallel:'L'},
    {id:'L',vertices:['A','D','H','E'],parallel:'R'},
    {id:'U',vertices:['E','F','G','H'],parallel:'D'},
    {id:'D',vertices:['A','B','C','D'],parallel:'U'},
    {id:'F',vertices:['D','C','G','H'],parallel:'B'},
    {id:'B',vertices:['A','B','F','E'],parallel:'F'}
  ]
};
const DEFAULT_FACE_COLORS=['#ef5350','#42a5f5','#ffee58','#8d6e63','#66bb6a','#ab47bc'];
const freeCubeGeo=new THREE.BoxGeometry(1,1,1);
const breakParticleGeo=new THREE.BoxGeometry(.12,.12,.12);
const fluidGeo=new THREE.BoxGeometry(1,.84,1);
function fluidHeight(data){
  if(!data||!blockDef(data).liquid)return 0;
  if(data.naturalSea)return .84;
  const level=THREE.MathUtils.clamp(Math.round(Number(data.level)||4),1,4);
  return [.34,.50,.67,.84][level-1];
}
const doorGeo=new THREE.BoxGeometry(.14,1.92,.9);
const slabGeo=new THREE.BoxGeometry(1,.5,1);
const paneGeo=new THREE.BoxGeometry(.12,.92,1);
const torchGeo=new THREE.CylinderGeometry(.065,.09,.58,7);
const saplingGeo=new THREE.ConeGeometry(.36,.82,6);
const fireGeo=new THREE.ConeGeometry(.38,.82,7);
function makeRoofGeometry(){
  const v=new Float32Array([
    -.5,-.5,-.5, .5,-.5,-.5,  .5,-.5,.5, -.5,-.5,.5,
     0,.5,-.5,   0,.5,.5
  ]);
  const idx=[0,1,2,0,2,3, 0,4,1, 3,2,5, 0,3,5,0,5,4, 1,4,5,1,5,2];
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(v,3));g.setIndex(idx);g.computeVertexNormals();return g;
}
const roofGeo=makeRoofGeometry();
const leafCubeGeo=new THREE.BoxGeometry(.94,.94,.94);
const grassTuftGeo=new THREE.PlaneGeometry(.09,.3);
const materialCache=new Map(),pixelTextureCache=new Map(),blockVisualMaterialCache=new Map();
let cubeWorldBlockAtlas=null,cubeWorldBlockAtlasReady=false;
const CUBE_WORLD_PIXEL_TILES={
  dirt:[.4,0],stone:[.4,.2],snow:[.8,0],snowTop:[.2,.2],
  leaves:[.2,.6],pineLeaves:[.2,.6],planks:[.2,.4],
  grassSide:[.6,0],grassTop:[0,.6],
  logSide:[0,.4],pineLogSide:[0,.4],logTop:[.2,.8],pineLogTop:[.2,.8]
};
function cubeWorldPixelKind(kind){
  if(kind.startsWith('grassSide'))return 'grassSide';
  if(kind.startsWith('grassTop'))return 'grassTop';
  return kind;
}
function cubeWorldAtlasTexture(kind){
  const tile=CUBE_WORLD_PIXEL_TILES[cubeWorldPixelKind(kind)];
  if(!cubeWorldBlockAtlasReady||!cubeWorldBlockAtlas||!tile)return null;
  const tex=cubeWorldBlockAtlas.clone();
  const inset=.0025,span=.195;
  tex.offset.set(tile[0]+inset,tile[1]+inset);tex.repeat.set(span,span);
  tex.wrapS=tex.wrapT=THREE.ClampToEdgeWrapping;
  tex.flipY=false;tex.magFilter=THREE.NearestFilter;tex.minFilter=THREE.NearestFilter;
  tex.generateMipmaps=false;
  if('colorSpace' in tex&&THREE.SRGBColorSpace)tex.colorSpace=THREE.SRGBColorSpace;
  tex.needsUpdate=true;return tex;
}
function loadCubeWorldBlockAtlas(){
  if(!THREE.TextureLoader)return;
  new THREE.TextureLoader().load('../../assets/game/cube world/Blocks_PixelArt.png',tex=>{
    tex.flipY=false;tex.magFilter=THREE.NearestFilter;tex.minFilter=THREE.NearestFilter;
    tex.generateMipmaps=false;
    if('colorSpace' in tex&&THREE.SRGBColorSpace)tex.colorSpace=THREE.SRGBColorSpace;
    tex.needsUpdate=true;cubeWorldBlockAtlas=tex;cubeWorldBlockAtlasReady=true;
    pixelTextureCache.clear();blockVisualMaterialCache.clear();
    for(const key of [...materialCache.keys()])if(key.startsWith('px:')||
      ['dirt','stone','snow','leaves','pineLeaves','planks','log','pineLog','grass'].includes(key))materialCache.delete(key);
    if(mode==='free')rebuildAllWorldMeshes();
  },undefined,err=>console.warn('[Cube Architect Cube World atlas]',err));
}
loadCubeWorldBlockAtlas();
let worldData=new Map(),worldMeshMap=new Map(),worldEdits=new Map(),worldInteractables=[],freeMeshes=[];
let worldChunkMeshMap=new Map(),worldChunkDecorMap=new Map(),dirtyWorldChunks=new Set(),chunkRemeshQueued=false;
let collectibles=[],collected=new Set(),selectedHotbarSlot=0,selectedType='grass';
let hotbarTypes=['grass','dirt','stone','sand','log','planks','glass','door','water'];
let yaw=0,pitch=0,freeVelocityY=0,onGround=true,freeKeys={},xray=false,nearRuin=false,lastFreeSave=0;
let freeSaveDirty=false,freeSaveDueAt=0,freeStepHop=0;
let miningHeld=false,miningSource='',miningKey='',miningProgress=0,miningDurationNow=0,miningBeat=.25;
let miningCrackOverlay=null,miningCrackKey='';
let freePlacementGhost=null,freePlacementGhostKey='';
let pendingPlayerStrikes=[],freeHitStopUntil=0;
let inventoryBatchDepth=0,selectedCraftRecipeId=null,survivalCraftCategory='전체',craftingBusy=false;
let discoveredResources=new Set(),discoveredRecipeIds=new Set(),unreadRecipeIds=new Set();
let footstepDistanceAcc=0,lastFootstepX=null,lastFootstepZ=null,ambientAudioClock=0;
let freeFlying=false,inventoryOpen=false,furnaceOpen=false,freeSimAccum=0,freeSimTick=0,dayTime=.28,freeHemi=null,freeSun=null,lastChemToast=0;
let freeFluidKind='',lastEnvironmentDamage=0,survivalBreath=100,lastDrownDamage=0,freeFallPeakY=0;
let freeViewMode='third',freeAvatarRoot=null,freeAvatarSignature='',freeAvatarSyncAt=0,freeAvatarFacingRight=false;
let freeAvatarAction='',freeAvatarActionStartedAt=0,freeAvatarActionUntil=0,freeAvatarDefeated=false,freeAvatarReturnAt=0,freeViewBeforeDefeat=null;
const FREE_AVATAR_ACTION_MS={attack:410,hurt:285,dead:930,pickup:450,sit:680};
const FREE_AVATAR_ACTION_PRIORITY={pickup:1,sit:1,attack:2,hurt:3,dead:4};
let freeHeldToolRoot=null,freeHeldToolKey='',freeHeldToolToken=0;
let currentCuboidSpec={dims:[2,1,1],faceColors:DEFAULT_FACE_COLORS.slice()};
let mathLensMode=0,mathOverlayGroup=null,facePaintColor='#ff7043';
let freeSelectedShapeKey=null,freeElementMode='edge',freeElementColor='#ff7043';
let weather='clear',weatherTimer=18,rainSystem=null,rainPositions=null,lightningFlash=0;
let critters=[],critterClock=0;
let wildCreatures=[],creatureInteractables=[],survivalHealth=5,healthRegenClock=0,lastCreatureDamage=0,lastCreatureAttackAt=0;
let seenCreatureKinds=new Set(),lastCreatureHintAt=0,creatureDefeats={},creatureForageAt={},survivalWorldTime=0,creatureSpawnClock=0,creatureSpawnSerial=0,nextEliteSpawnCheckAt=0;
const TAME_RULES={
  chicken:{food:'wheatSeed',need:3,label:'밀 씨앗'},
  sheep:{food:'wheat',need:2,label:'밀'},
  cat:{food:'cookedEgg',need:2,label:'구운 달걀'},
  dog:{food:'bread',need:2,label:'빵'}
};

let miniPoiCatalog=null;
const MINI_POI_VARIANTS={
  meadow:[
    {id:'meadow-camp',kind:'camp',label:'초원의 작은 야영지',color:0xf6c85f,reward:{sticks:3,wheatSeed:2}},
    {id:'meadow-well',kind:'well',label:'오래된 돌우물',color:0x75cfff,reward:{clay:2}}
  ],
  forest:[
    {id:'forest-camp',kind:'oldCamp',label:'숲속 버려진 야영지',color:0xffa86b,reward:{charcoal:1}},
    {id:'forest-stump',kind:'fallenTree',label:'거대한 고목 쉼터',color:0x7fd17c,reward:{planks:3,carrot:2}}
  ],
  pine:[
    {id:'pine-watch',kind:'watchPost',label:'침엽수림 감시대',color:0x8ac9ff,reward:{torch:2,potato:2}},
    {id:'pine-cairn',kind:'cairn',label:'소나무 숲 돌무더기 표식',color:0xb9c4cf,reward:{stone:3}}
  ],
  snow:[
    {id:'snow-station',kind:'snowStation',label:'설원의 작은 관측소',color:0xd8f1ff,reward:{snowBrick:2}},
    {id:'snow-marker',kind:'iceMarker',label:'얼음빛 탐험 표식',color:0x91dbff,reward:{glass:1}}
  ],
  desert:[
    {id:'desert-oasis',kind:'oasis',label:'사막의 작은 오아시스',color:0x67dfcf,reward:{cactusDye:1}},
    {id:'desert-fossil',kind:'fossil',label:'모래 속 화석 발굴지',color:0xf4d48b,reward:{sandstone:2}}
  ],
  badlands:[
    {id:'badlands-mine',kind:'minerCamp',label:'협곡의 광부 야영지',color:0xff9d74,reward:{ironOre:2}},
    {id:'badlands-arch',kind:'stoneArch',label:'붉은 협곡 돌문',color:0xdc8a62,reward:{redSand:3}}
  ],
  marsh:[
    {id:'marsh-walk',kind:'boardwalk',label:'습지의 낡은 나무다리',color:0x9bd6a4,reward:{reedMat:1}},
    {id:'marsh-shrine',kind:'reedShrine',label:'갈대 사이 작은 제단',color:0x82c6a0,reward:{clay:2}}
  ],
  flowers:[
    {id:'flowers-garden',kind:'flowerGarden',label:'야생화 작은 화원',color:0xff93c7,reward:{flowerDye:1}},
    {id:'flowers-picnic',kind:'picnic',label:'꽃밭의 소풍 쉼터',color:0xffd37b,reward:{flower:3}}
  ]
};
const FURNACE_RECIPES=[
  {input:'sand',output:'glass',label:'모래 → 유리',note:'모래를 높은 온도로 가열하면 유리 재료가 됩니다.'},
  {input:'log',output:'charcoal',label:'원목 → 숯',note:'산소가 적은 상태에서 목재를 가열하는 변화를 단순화한 실험입니다.'},
  {input:'clay',output:'brick',label:'점토 → 벽돌',note:'점토를 가열해 단단한 건축 재료로 바꿉니다.'},
  {input:'ironOre',output:'ironBlock',label:'철광석 → 철',note:'게임에서는 제련 과정을 간단히 표현합니다.'},
  {input:'stone',output:'smoothStone',label:'돌 → 매끈한 돌',note:'가열·가공된 건축용 돌을 표현합니다.'},
  {input:'egg',output:'cookedEgg',label:'달걀 → 구운 달걀',note:'동물에게서 얻은 식재료를 익혀 회복 음식으로 만듭니다.'},
  {input:'potato',output:'cookedPotato',label:'감자 → 구운 감자',note:'거점에서 기른 감자를 익혀 탐험용 회복 음식으로 만듭니다.'}
];

function freeAvatarApi(){return window.CubeArchitectAvatar||null}
function refreshFreeAvatar(force=false){
  if(mode!=='free'&&!force)return;
  const api=freeAvatarApi();if(!api)return;
  const equipment=api.readEquipment(),sig=api.signature(equipment);
  if(!force&&freeAvatarRoot&&sig===freeAvatarSignature)return;
  if(freeAvatarRoot?.parent)freeAvatarRoot.parent.remove(freeAvatarRoot);
  freeAvatarRoot=api.create(equipment);freeAvatarSignature=sig;
  freeAvatarRoot.visible=freeViewMode==='third';
  scene.add(freeAvatarRoot);
}
function updateFreeViewButtons(){
  const third=freeViewMode==='third';
  const current=third?'3인칭':'1인칭',next=third?'1인칭':'3인칭';
  if($('actionView')){
    $('actionView').textContent='시점 · '+current;
    $('actionView').setAttribute('aria-label','현재 '+current+' 시점. 누르면 '+next+'으로 전환');
    $('actionView').title='현재 '+current+' · 클릭하거나 V를 눌러 '+next+'으로 전환';
  }
  if($('mobileView')){
    $('mobileView').textContent=current;
    $('mobileView').setAttribute('aria-label','현재 '+current+' 시점. 누르면 '+next+'으로 전환');
  }
}
function setFreeView(next,announce=true){
  const normalized=next==='first'?'first':'third';
  const changed=freeViewMode!==normalized;
  freeViewMode=normalized;
  if(freeAvatarRoot)freeAvatarRoot.visible=freeViewMode==='third';
  updateFreeViewButtons();
  if(announce){
    toast(freeViewMode==='third'?'3인칭 · 내 캐릭터를 보며 탐험해요.':'1인칭 · 정밀하게 건축해요.');
    if(changed)tutorialSignal('free-view-toggle');
  }
}
function cycleFreeView(){if(mode==='free')setFreeView(freeViewMode==='third'?'first':'third')}
function openAvatarCustomizer(){
  if(mode!=='free')return;
  if(document.pointerLockElement===canvas)document.exitPointerLock?.();
  try{
    const h=parent&&parent!==window&&parent.location.origin===location.origin?parent:null;
    const button=h?.document?.getElementById('avatar-open-btn');
    if(button){button.click();toast('키즈케이드 캐릭터 아틀리에를 열었어요.');return}
  }catch(_){}
  const win=window.open('../../avatar-studio.html','kidscadeAvatarStudio');
  if(win)toast('캐릭터 아틀리에에서 꾸민 모습이 자동으로 연결돼요.');
  else toast('팝업이 차단되었어요. 메인 화면의 ‘꾸미기’를 이용해 주세요.');
}
function thirdPersonCameraPoint(eye,desired){
  const delta=desired.clone().sub(eye),steps=12;
  let safe=eye.clone();
  for(let i=1;i<=steps;i++){
    const p=eye.clone().addScaledVector(delta,i/steps);
    const x=blockCoordFromWorld(p.x),y=Math.floor(p.y),z=blockCoordFromWorld(p.z);
    if(isSolidData(getBlock(x,y,z),x,y,z))break;
    safe=p;
  }
  return safe;
}
function triggerFreeAvatarAction(kind,duration=FREE_AVATAR_ACTION_MS[kind]||360,now=performance.now()){
  if(!kind)return;
  const currentActive=freeAvatarAction&&now<freeAvatarActionUntil;
  if(currentActive&&(FREE_AVATAR_ACTION_PRIORITY[freeAvatarAction]||0)>(FREE_AVATAR_ACTION_PRIORITY[kind]||0))return;
  freeAvatarAction=kind;freeAvatarActionStartedAt=now;freeAvatarActionUntil=now+Math.max(80,duration);
}
function freeAvatarActionAt(now){
  if(!freeAvatarAction)return null;
  if(now>=freeAvatarActionUntil&&!freeAvatarDefeated){
    freeAvatarAction='';freeAvatarActionStartedAt=0;freeAvatarActionUntil=0;return null;
  }
  return {kind:freeAvatarAction,elapsedMs:Math.max(0,now-freeAvatarActionStartedAt)};
}
function prepareFreeAvatar(now){
  const api=freeAvatarApi();if(!api)return;
  if(now>=freeAvatarSyncAt){
    freeAvatarSyncAt=now+1200;
    const sig=api.signature(api.readEquipment());
    if(!freeAvatarRoot||sig!==freeAvatarSignature)refreshFreeAvatar(true);
  }
  if(!freeAvatarRoot)return;
  const moving=!!(freeKeys.KeyW||freeKeys.KeyS||freeKeys.KeyA||freeKeys.KeyD||
    freeKeys.ArrowUp||freeKeys.ArrowDown||freeKeys.ArrowLeft||freeKeys.ArrowRight||
    Math.hypot(mobileMove.x,mobileMove.y)>.12);
  const leftHeld=!!(freeKeys.KeyA||freeKeys.ArrowLeft),rightHeld=!!(freeKeys.KeyD||freeKeys.ArrowRight);
  if(leftHeld!==rightHeld)freeAvatarFacingRight=rightHeld;
  else if(mobileMove.x>.18)freeAvatarFacingRight=true;
  else if(mobileMove.x<-.18)freeAvatarFacingRight=false;
  const stepLift=freeStepHop>0?Math.sin((1-freeStepHop)*Math.PI)*.1:0;
  const avatarEyeY=seatedFurniture?freePhysicsY:camera.position.y;
  freeAvatarRoot.position.set(camera.position.x,avatarEyeY-1.62+stepLift,camera.position.z);
  freeAvatarRoot.rotation.y=yaw;
  // Base sprites face left. Mirror only when travelling right and keep the last facing while idle/attacking.
  freeAvatarRoot.scale.x=freeAvatarFacingRight?-1:1;
  freeAvatarRoot.visible=freeViewMode==='third';
  const motion=freeFluidKind?'swim':freeFlying?'air':onGround?'ground':'air';
  api.animate(freeAvatarRoot,now,moving,onGround||freeFlying,motion,freeAvatarActionAt(now),survivalCombatAppearance());
}
function freeLookVector(){
  return new THREE.Vector3(0,0,-1).applyEuler(new THREE.Euler(pitch,yaw,0,'YXZ')).normalize();
}
function desiredHeldTool(){
  return HOTBAR_TOOL_TYPES.includes(selectedType)?selectedType:'';
}
function syncFreeHeldTool(){
  const key=desiredHeldTool(),api=window.CubeArchitectWorldAssets;
  if(key===freeHeldToolKey&&freeHeldToolRoot?.parent===scene)return;
  const token=++freeHeldToolToken,targetScene=scene;
  if(freeHeldToolRoot?.parent)freeHeldToolRoot.parent.remove(freeHeldToolRoot);
  freeHeldToolRoot=null;freeHeldToolKey=key;
  if(!key||!api?.loadTool)return;
  api.loadTool(key).then(model=>{
    if(token!==freeHeldToolToken||mode!=='free'||scene!==targetScene||desiredHeldTool()!==key)return;
    freeHeldToolRoot=model;
    freeHeldToolRoot.userData={...freeHeldToolRoot.userData,worldDecorative:true,heldTool:true};
    targetScene.add(freeHeldToolRoot);
  }).catch(err=>console.warn('[Cube Architect held tool]',key,err));
}
function updateFreeHeldTool(now){
  syncFreeHeldTool();
  if(!freeHeldToolRoot)return;
  const visible=mode==='free'&&freeViewMode==='first'&&!!desiredHeldTool();
  freeHeldToolRoot.visible=visible;if(!visible)return;
  camera.updateMatrixWorld(true);
  const forward=freeLookVector();
  const right=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0).normalize();
  const up=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,1).normalize();
  const attackAge=now-lastCreatureAttackAt;
  const attackSwing=attackAge>=0&&attackAge<280?Math.sin((attackAge/280)*Math.PI)*.22:0;
  const swing=miningHeld?Math.sin(now*.018)*.08:attackSwing;
  freeHeldToolRoot.position.copy(camera.position)
    .addScaledVector(forward,.72+swing*.2)
    .addScaledVector(right,.34)
    .addScaledVector(up,-.34-Math.abs(swing)*.16);
  freeHeldToolRoot.quaternion.copy(camera.quaternion);
  freeHeldToolRoot.rotateZ(-.58+swing);
  freeHeldToolRoot.rotateY(-.38);
  freeHeldToolRoot.rotateX(.08);
}
function thirdPersonCameraPosition(eye=camera.position){
  const look=freeLookVector(),thirdPersonDistance=mobileModeEnabled?5.2:5.8;
  const desired=eye.clone().addScaledVector(look,-thirdPersonDistance);desired.y+=.9;
  return thirdPersonCameraPoint(eye,desired);
}
function setFreeInteractionRay(maxFromPlayer=6.5){
  const eye=camera.position.clone(),dir=freeLookVector();
  if(freeViewMode==='third')raycaster.set(thirdPersonCameraPosition(eye),dir);
  else raycaster.set(eye,dir);
  return {eye,maxFromPlayer};
}
function withinPlayerReach(hit,eye,max){
  return !!(hit&&hit.point&&hit.point.distanceTo(eye)<=max+.08);
}
function renderFreeScene(now){
  prepareFreeAvatar(now);
  updateFreeHeldTool(now);
  updateFreePlacementGhost();
  if(freeViewMode!=='third'){renderer.render(scene,camera);return}
  const savedPos=camera.position.clone(),savedQuat=camera.quaternion.clone();
  camera.position.copy(thirdPersonCameraPosition(savedPos));
  camera.rotation.order='YXZ';camera.rotation.y=yaw;camera.rotation.x=pitch;camera.rotation.z=0;
  renderer.render(scene,camera);
  camera.position.copy(savedPos);camera.quaternion.copy(savedQuat);
}
function worldKey(x,y,z){return x+','+y+','+z}
function parseWorldKey(key){return key.split(',').map(Number)}
function inWorld(x,y,z){return x>=-WORLD_HALF&&x<WORLD_HALF&&z>=-WORLD_HALF&&z<WORLD_HALF&&y>=WORLD_MIN_Y&&y<=WORLD_MAX_Y}
function cloneBlockData(data){return data?JSON.parse(JSON.stringify(data)):null}
function blockDef(dataOrType){const type=typeof dataOrType==='string'?dataOrType:dataOrType?.type;return BLOCK_DEFS[type]||BLOCK_DEFS.stone}
function isTransparentData(data){const d=blockDef(data);return !!(d.transparent||d.liquid||d.special)}
function isOccluder(data){const d=blockDef(data);return !!(data&&d.solid&&!d.transparent&&!d.special)}
function pixelRng(seed){
  let n=(seed|0)||1;
  return ()=>{n=(Math.imul(n,1664525)+1013904223)|0;return ((n>>>0)/4294967296)};
}
function pixelTexture(kind,variant=0){
  const key=kind+':'+variant;if(pixelTextureCache.has(key))return pixelTextureCache.get(key);
  const packed=cubeWorldAtlasTexture(kind);
  if(packed){pixelTextureCache.set(key,packed);return packed}
  const canvas=document.createElement('canvas');canvas.width=canvas.height=16;
  const ctx=canvas.getContext('2d',{alpha:true});ctx.imageSmoothingEnabled=false;
  const seed=[...key].reduce((a,ch)=>Math.imul(a^ch.charCodeAt(0),16777619),2166136261);
  const rnd=pixelRng(seed);
  const palettes={
    dirt:['#765039','#885d40','#9a6c4b','#694630'],
    stone:['#7d858d','#9199a1','#69727a','#a0a7ad'],
    sand:['#d8bd6f','#e6cc82','#c9a95d','#f0da94'],
    redSand:['#aa6542','#bd754d','#92553b','#cf8659'],
    gravel:['#777573','#918d87','#656464','#aaa39a'],
    snow:['#eaf2f6','#dce9ef','#f7fbfd','#cbdde7'],
    clay:['#909fa9','#a7b3ba','#7f8f9a','#bcc5ca'],
    bedrock:['#2d3238','#3d434a','#22272c','#50565c'],
    ironOre:['#7e858b','#949aa0','#686f75','#ac866d'],
    planks:['#aa7749','#bb8958','#96653f','#cf9b66'],
    leaves:['#448e4b','#56a95a','#34733d','#72bb68'],
    pineLeaves:['#2b5842','#386b4e','#214b38','#4a7b59'],
    grassTop:['#5ea955','#70ba60','#4c9348','#86c66d'],
    grassTopPine:['#4d8e4b','#5d9d55','#3f7942','#70ac60'],
    grassTopMarsh:['#668f4c','#789f57','#506f43','#8aae67'],
    grassTopFlowers:['#69b65d','#7cc76b','#54a052','#93d37a'],
    grassSide:['#80583d','#936447','#6f4a34','#a37350'],
    grassSidePine:['#80583d','#936447','#6f4a34','#a37350'],
    grassSideMarsh:['#705642','#84654b','#604836','#98775a'],
    grassSideFlowers:['#80583d','#936447','#6f4a34','#a37350'],
    logSide:['#7c5234','#93633d','#65432e','#aa7447'],
    pineLogSide:['#584936','#675641','#493c2e','#7a664c'],
    logTop:['#a8784d','#bb8c5d','#8d603f','#d0a36d'],
    pineLogTop:['#79664d','#8b7657','#64543f','#a08a68']
  };
  const p=palettes[kind]||['#888','#999','#777','#aaa'];
  const base=p[variant%Math.min(2,p.length)]||p[0];
  ctx.clearRect(0,0,16,16);ctx.fillStyle=base;ctx.fillRect(0,0,16,16);
  const dot=(x,y,color,w=1,h=1)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h)};
  if(kind.startsWith('grassSide')){
    for(let i=0;i<52;i++)dot(Math.floor(rnd()*16),4+Math.floor(rnd()*12),p[1+Math.floor(rnd()*(p.length-1))]);
    const greens=kind==='grassSidePine'?palettes.grassTopPine:
      kind==='grassSideMarsh'?palettes.grassTopMarsh:
      kind==='grassSideFlowers'?palettes.grassTopFlowers:palettes.grassTop;
    ctx.fillStyle=greens[variant%2];ctx.fillRect(0,0,16,4);
    for(let x=0;x<16;x++)if(rnd()>.38)dot(x,3+Math.floor(rnd()*4),greens[2+Math.floor(rnd()*2)],1,1+Math.floor(rnd()*2));
  }else if(kind==='logSide'||kind==='pineLogSide'||kind==='planks'){
    for(let x=1;x<16;x+=3+Math.floor(rnd()*2)){
      ctx.fillStyle=p[2];ctx.fillRect(x,0,1,16);
      if(rnd()>.45){ctx.fillStyle=p[3];ctx.fillRect(Math.min(15,x+1),Math.floor(rnd()*11),1,3+Math.floor(rnd()*4))}
    }
    for(let i=0;i<8;i++)dot(Math.floor(rnd()*16),Math.floor(rnd()*16),p[3],2,1);
  }else if(kind==='logTop'||kind==='pineLogTop'){
    ctx.fillStyle=p[1];ctx.fillRect(1,1,14,14);
    ctx.strokeStyle=p[2];ctx.lineWidth=1;
    for(const inset of [3,6])ctx.strokeRect(inset,inset,16-inset*2,16-inset*2);
    dot(7,7,p[2],2,2);
    for(let i=0;i<8;i++)dot(2+Math.floor(rnd()*12),2+Math.floor(rnd()*12),p[3]);
  }else if(kind==='leaves'||kind==='pineLeaves'){
    for(let i=0;i<75;i++){
      const x=Math.floor(rnd()*16),y=Math.floor(rnd()*16);
      if(rnd()<.16)ctx.clearRect(x,y,1+(rnd()>.75?1:0),1);
      else dot(x,y,p[1+Math.floor(rnd()*(p.length-1))],1+(rnd()>.88?1:0),1);
    }
    for(let i=0;i<10;i++)dot(Math.floor(rnd()*15),Math.floor(rnd()*15),p[3],2,1);
  }else if(kind.startsWith('grassTop')){
    for(let i=0;i<74;i++){
      const x=Math.floor(rnd()*16),y=Math.floor(rnd()*16);
      dot(x,y,p[1+Math.floor(rnd()*(p.length-1))],rnd()>.86?2:1,1);
    }
    for(let i=0;i<8;i++){const x=Math.floor(rnd()*16),y=Math.floor(rnd()*16);dot(x,y,p[3],1,2)}
  }else if(kind==='stone'){
    for(let i=0;i<42;i++)dot(Math.floor(rnd()*16),Math.floor(rnd()*16),p[1+Math.floor(rnd()*3)]);
    ctx.strokeStyle=p[2];ctx.lineWidth=1;
    for(let i=0;i<3;i++){let x=Math.floor(rnd()*12),y=Math.floor(rnd()*12);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+2,y+1);ctx.lineTo(x+3,y+3);ctx.stroke()}
  }else if(kind==='gravel'){
    for(let i=0;i<58;i++){const x=Math.floor(rnd()*16),y=Math.floor(rnd()*16),sz=rnd()>.75?2:1;dot(x,y,p[1+Math.floor(rnd()*3)],sz,sz)}
  }else if(kind==='ironOre'){
    for(let i=0;i<36;i++)dot(Math.floor(rnd()*16),Math.floor(rnd()*16),palettes.stone[1+Math.floor(rnd()*3)]);
    for(let i=0;i<12;i++){const x=Math.floor(rnd()*15),y=Math.floor(rnd()*15);dot(x,y,p[3],rnd()>.6?2:1,rnd()>.7?2:1)}
  }else{
    for(let i=0;i<48;i++){
      const x=Math.floor(rnd()*16),y=Math.floor(rnd()*16),color=p[1+Math.floor(rnd()*(p.length-1))];
      dot(x,y,color,rnd()>.9?2:1,1);
    }
  }
  const texture=new THREE.CanvasTexture(canvas);
  texture.magFilter=THREE.NearestFilter;texture.minFilter=THREE.NearestFilter;
  texture.generateMipmaps=false;
  if('colorSpace' in texture&&THREE.SRGBColorSpace)texture.colorSpace=THREE.SRGBColorSpace;
  texture.needsUpdate=true;pixelTextureCache.set(key,texture);return texture;
}
function pixelMaterial(kind,variant=0,opts={}){
  const key='px:'+kind+':'+variant+':'+JSON.stringify(opts);
  if(materialCache.has(key))return materialCache.get(key);
  const leaf=kind==='leaves'||kind==='pineLeaves';
  const m=new THREE.MeshStandardMaterial({
    color:0xffffff,map:pixelTexture(kind,variant),roughness:opts.roughness??.92,
    metalness:0,transparent:leaf,opacity:leaf?.97:1,alphaTest:leaf?.28:0,
    depthWrite:true,side:leaf?THREE.DoubleSide:THREE.FrontSide
  });
  materialCache.set(key,m);return m;
}
function blockVisualMaterial(type,x=0,z=0){
  const variant=Math.floor(hash2(x*13+17,z*19-23)*3);
  const biome=type==='grass'?(worldRules?.region?.(x,z)||'meadow'):'';
  const key=type+':'+variant+':'+biome;if(blockVisualMaterialCache.has(key))return blockVisualMaterialCache.get(key);
  let m;
  if(type==='grass'){
    const suffix=biome==='pine'?'Pine':biome==='marsh'?'Marsh':biome==='flowers'?'Flowers':'';
    const side=pixelMaterial('grassSide'+suffix,variant),top=pixelMaterial('grassTop'+suffix,variant),bottom=pixelMaterial('dirt',variant);
    m=[side,side,top,bottom,side,side];
  }else if(type==='log'||type==='pineLog'){
    const pine=type==='pineLog',side=pixelMaterial(pine?'pineLogSide':'logSide',variant),end=pixelMaterial(pine?'pineLogTop':'logTop',variant);
    m=[side,side,end,end,side,side];
  }else if(type==='snow'){
    const side=pixelMaterial('snow',variant),top=pixelMaterial('snowTop',variant),bottom=pixelMaterial('dirt',variant);
    m=[side,side,top,bottom,side,side];
  }else if(['dirt','stone','sand','redSand','gravel','clay','ironOre','bedrock','leaves','pineLeaves','planks'].includes(type)){
    m=pixelMaterial(type,variant);
  }else m=materialFor(type);
  blockVisualMaterialCache.set(key,m);return m;
}
function materialFor(type){
  if(materialCache.has(type))return materialCache.get(type);
  if(['dirt','stone','sand','redSand','gravel','snow','clay','ironOre','bedrock','leaves','pineLeaves','planks'].includes(type)){
    const textured=pixelMaterial(type,0);materialCache.set(type,textured);return textured;
  }
  if(type==='log'||type==='pineLog'){
    const textured=pixelMaterial(type==='pineLog'?'pineLogSide':'logSide',0);materialCache.set(type,textured);return textured;
  }
  if(type==='grass'){
    const textured=pixelMaterial('grassTop',0);materialCache.set(type,textured);return textured;
  }
  const d=blockDef(type);
  const m=new THREE.MeshStandardMaterial({
    color:d.color||0xffffff,roughness:type==='glass'?.18:.86,metalness:type==='glass'?.05:0,
    transparent:!!d.transparent,opacity:d.opacity??1,depthWrite:!(d.transparent||d.liquid),
    emissive:d.emissive?(d.color||0):0x000000,emissiveIntensity:d.emissive?.45:0
  });
  materialCache.set(type,m);return m;
}
function terrainHeight(x,z){
  const h=worldRules.height(x,z);
  if(!legacyWorld)return h;
  const dist=Math.hypot(x,z),old=THREE.MathUtils.clamp(Math.floor(
    1.9+Math.sin(x*.31)*.9+Math.cos(z*.27)*.75+
    Math.sin((x+z)*.18)*.45-Math.max(0,dist-10)*.36-(dist>14?1.4:0)
  ),-2,3);
  const blend=THREE.MathUtils.clamp((dist-14)/9,0,1);
  return Math.round(old*(1-blend)+h*blend);
}
function currentBiome(x,z){return worldRules.biomeAt(x,z)}
function hash2(x,z){
  const v=Math.sin(x*127.1+z*311.7)*43758.5453;
  return v-Math.floor(v);
}
function setRawBlock(x,y,z,data){
  if(!inWorld(x,y,z))return false;
  const key=worldKey(x,y,z),chunk=worldChunkKey(x,z);
  if(data){
    worldData.set(key,data);
    if(!worldChunkIndex.has(chunk))worldChunkIndex.set(chunk,new Set());
    worldChunkIndex.get(chunk).add(key);
  }else{
    worldData.delete(key);
    const bucket=worldChunkIndex.get(chunk);
    if(bucket){bucket.delete(key);if(!bucket.size)worldChunkIndex.delete(chunk)}
  }
  return true;
}
function getBlock(x,y,z){
  if(!inWorld(x,y,z))return null;
  const chunk=worldChunkKey(x,z);
  if(worldChunkGenerationDepth===0&&!worldChunksGenerated.has(chunk))
    generateWorldChunk(Math.floor(x/WORLD_CHUNK_SIZE),Math.floor(z/WORLD_CHUNK_SIZE));
  return worldData.get(worldKey(x,y,z))||null;
}
function isSolidData(data,x,y,z){
  if(!data)return false;
  if(data.type==='doorTop'){
    const base=getBlock(x,y-1,z);return !!(base&&base.type==='door'&&!base.open);
  }
  if(data.type==='door')return !data.open;
  return !!blockDef(data).solid;
}
function getHighestSolidY(x,z,maxY=WORLD_MAX_Y){
  for(let y=Math.min(WORLD_MAX_Y,Math.floor(maxY));y>=WORLD_MIN_Y;y--){
    const d=getBlock(Math.round(x),y,Math.round(z));
    if(isSolidData(d,Math.round(x),y,Math.round(z)))return y;
  }
  return WORLD_MIN_Y;
}
function visibleAt(x,y,z,data){
  if(!data||blockDef(data).hidden)return false;
  const d=blockDef(data);
  if(d.transparent||d.liquid||d.special)return true;
  const dirs=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
  return dirs.some(v=>!isOccluder(getBlock(x+v[0],y+v[1],z+v[2])));
}
function isChunkRenderableData(data){
  if(!voxelRuntime||!data)return false;
  const d=blockDef(data);
  if(d.hidden||d.special||d.liquid||data.faceColors||data.edgeColors||data.vertexColors)return false;
  if(data.type==='leaves'||data.type==='pineLeaves')return true;
  return !!(d.solid&&!d.transparent);
}
function chunkFaceOccluded(data,neighbor){
  if(!neighbor)return false;
  if((data.type==='leaves'||data.type==='pineLeaves')&&neighbor.type===data.type)return true;
  if(neighbor.type==='cuboid'||neighbor.type==='cuboidPart')return true;
  const d=blockDef(neighbor);
  return !!(d.solid&&!d.transparent&&!d.special);
}
function chunkMaterialForFace(data,x,z,faceIndex){
  const mat=blockVisualMaterial(data.type,x,z);
  return Array.isArray(mat)?(mat[faceIndex]||mat[0]):mat;
}
function chunkTouchesRenderRange(cx,cz){
  if(!Number.isFinite(streamCenterX)||!Number.isFinite(streamCenterZ))return false;
  const minX=cx*WORLD_CHUNK_SIZE-.5,maxX=(cx+1)*WORLD_CHUNK_SIZE-.5;
  const minZ=cz*WORLD_CHUNK_SIZE-.5,maxZ=(cz+1)*WORLD_CHUNK_SIZE-.5;
  return !(maxX<streamCenterX-WORLD_VIEW_RADIUS||minX>streamCenterX+WORLD_VIEW_RADIUS||
    maxZ<streamCenterZ-WORLD_VIEW_RADIUS||minZ>streamCenterZ+WORLD_VIEW_RADIUS);
}
function removeWorldChunkRender(chunk){
  const meshes=worldChunkMeshMap.get(chunk)||[];
  for(const mesh of meshes){scene.remove(mesh);mesh.geometry?.dispose?.()}
  worldChunkMeshMap.delete(chunk);
  const decor=worldChunkDecorMap.get(chunk)||[];
  for(const obj of decor)scene.remove(obj);
  worldChunkDecorMap.delete(chunk);
  worldInteractables=worldInteractables.filter(m=>m.userData?.worldChunkKey!==chunk);
  freeMeshes=freeMeshes.filter(m=>m.userData?.worldChunkKey!==chunk);
}
function chunkRecords(chunk){
  const keys=worldChunkIndex.get(chunk);if(!keys)return [];
  const records=[];
  for(const key of keys){
    const data=worldData.get(key);if(!data)continue;
    const [x,y,z]=parseWorldKey(key);records.push({x,y,z,data});
  }
  return records;
}
function cubeWorldDecorSpec(kind,x,z){
  const roll=hash2(x*53+17,z*47-23);
  if(kind==='flowers'){
    if(roll>.994)return ['bush',.92];
    if(roll>.978)return [hash2(x*7,z*11)>.5?'flowers1':'flowers2',.9];
    if(roll>.966)return ['grassBig',.86];
  }else if(kind==='meadow'){
    if(roll>.994)return ['bush',.9];
    if(roll>.979)return ['grassBig',.84];
  }else if(kind==='forest'){
    if(roll>.995)return ['rock2',.9];
    if(roll>.982)return ['bush',.9];
    if(roll>.969)return ['mushroom',.82];
  }else if(kind==='pine'){
    if(roll>.995)return ['rock1',.9];
    if(roll>.982)return ['mushroom',.82];
    if(roll>.971)return ['bush',.86];
  }else if(kind==='marsh'){
    if(roll>.994)return ['bamboo',.88];
    if(roll>.981)return ['bambooSmall',.86];
    if(roll>.967)return [hash2(x*17,z*19)>.5?'plant2':'plant3',.84];
  }else if(kind==='desert'){
    if(roll>.998)return ['crystalSmall',.8];
    if(roll>.986)return [hash2(x*5,z*13)>.5?'rock1':'rock2',.92];
  }else if(kind==='badlands'){
    if(roll>.997)return [hash2(x*11,z*5)>.72?'crystalBig':'crystalSmall',.9];
    if(roll>.982)return [hash2(x*5,z*13)>.5?'rock1':'rock2',.95];
  }else if(kind==='snow'){
    if(roll>.998)return ['crystalSmall',.78];
    if(roll>.988)return ['rock1',.86];
  }
  return null;
}
function buildChunkCubeWorldDecor(chunk,records,built){
  const api=window.CubeArchitectWorldAssets;if(!api?.loadProp)return;
  const placements=[];
  for(const {x,y,z,data} of records){
    if(placements.length>=10)break;
    if(!data?.natural||!['grass','sand','redSand','snow'].includes(data.type))continue;
    if(worldData.get(worldKey(x,y+1,z)))continue;
    if(gameFreeMode==='survival'&&poiRules.isLandmarkClearZone?.(x,z,1))continue;
    const spec=cubeWorldDecorSpec(worldRules.region(x,z),x,z);if(!spec)continue;
    placements.push({key:spec[0],scale:spec[1],x,y:y+1,z,rot:hash2(x*29-3,z*31+5)*Math.PI*2});
  }
  if(!placements.length)return;
  const group=new THREE.Group();
  group.name='CubeWorldDecor_'+chunk;
  group.userData={worldDecorative:true,worldChunkDecor:true,worldChunkKey:chunk,cubeWorldDecor:true};
  scene.add(group);built.push(group);
  for(const p of placements){
    api.loadProp(p.key).then(model=>{
      if(group.parent!==scene)return;
      model.position.set(p.x,p.y,p.z);model.rotation.y=p.rot;model.scale.multiplyScalar(p.scale);
      model.userData={...model.userData,worldDecorative:true,worldChunkDecor:true,worldChunkKey:chunk};
      group.add(model);
    }).catch(err=>console.warn('[Cube Architect Cube World prop]',p.key,err));
  }
}

function buildChunkGrassInstances(chunk,records){
  if(!voxelRuntime||!THREE.InstancedMesh)return;
  const perVariant=[[],[],[]];
  const positions=[[-.2,.02,-.12,.08],[.15,0,.13,-.35],[.02,.05,-.03,.55],[.24,.015,-.2,1.05],[-.11,.035,.2,-.9]];
  for(const {x,y,z,data} of records){
    if(data.type!=='grass'||!data.natural||!isChunkRenderableData(data))continue;
    if(worldData.get(worldKey(x,y+1,z))||hash2(x*31+7,z*37-9)<.73)continue;
    const variant=Math.floor(hash2(x*7-3,z*11+5)*3);
    for(const [px,py,pz,rot] of positions)
      perVariant[variant].push([x+px,y+1.12+py,z+pz,rot,(hash2((x+px)*17,(z+pz)*19)-.5)*.2]);
  }
  const built=[];
  for(let variant=0;variant<perVariant.length;variant++){
    const items=perVariant[variant];if(!items.length)continue;
    const inst=new THREE.InstancedMesh(grassTuftGeo,grassTuftMaterial(variant),items.length);
    const dummy=new THREE.Object3D();
    items.forEach((item,i)=>{
      dummy.position.set(item[0],item[1],item[2]);dummy.rotation.set(0,item[3],item[4]);dummy.updateMatrix();
      inst.setMatrixAt(i,dummy.matrix);
    });
    inst.instanceMatrix.needsUpdate=true;inst.castShadow=false;inst.receiveShadow=false;
    inst.userData={worldDecorative:true,worldChunkDecor:true,worldChunkKey:chunk};scene.add(inst);built.push(inst);
  }
  buildChunkCubeWorldDecor(chunk,records,built);
  worldChunkDecorMap.set(chunk,built);
}
function rebuildWorldChunkMesh(cx,cz){
  if(!voxelRuntime)return;
  const chunk=cx+','+cz;removeWorldChunkRender(chunk);
  if(!chunkTouchesRenderRange(cx,cz))return;
  const records=chunkRecords(chunk);
  const meshes=voxelRuntime.buildChunkMeshes({
    THREE,cx,cz,size:WORLD_CHUNK_SIZE,records,
    getBlock:(x,y,z)=>worldData.get(worldKey(x,y,z))||null,
    isRenderable:isChunkRenderableData,isFaceOccluded:chunkFaceOccluded,
    materialForFace:chunkMaterialForFace
  });
  worldChunkMeshMap.set(chunk,meshes);
  for(const mesh of meshes){scene.add(mesh);worldInteractables.push(mesh);freeMeshes.push(mesh)}
  buildChunkGrassInstances(chunk,records);
}
function ensureWorldChunkMesh(cx,cz){
  const chunk=cx+','+cz;if(!voxelRuntime||worldChunkMeshMap.has(chunk))return false;
  rebuildWorldChunkMesh(cx,cz);return true;
}
function flushDirtyWorldChunks(){
  chunkRemeshQueued=false;
  if(mode!=='free'){dirtyWorldChunks.clear();return}
  const chunks=[...dirtyWorldChunks];dirtyWorldChunks.clear();
  for(const chunk of chunks){
    const [cx,cz]=chunk.split(',').map(Number);
    if(chunkTouchesRenderRange(cx,cz))rebuildWorldChunkMesh(cx,cz);
  }
}
function queueWorldChunkRemesh(x,z){
  if(!voxelRuntime)return;
  dirtyWorldChunks.add(worldChunkKey(x,z));
  if(chunkRemeshQueued)return;
  chunkRemeshQueued=true;Promise.resolve().then(flushDirtyWorldChunks);
}
function forEachActiveWorldBlock(fn){
  const centerX=Number.isFinite(streamCenterX)?streamCenterX:Math.round(camera.position.x);
  const centerZ=Number.isFinite(streamCenterZ)?streamCenterZ:Math.round(camera.position.z);
  const minX=Math.floor((centerX-WORLD_VIEW_RADIUS)/WORLD_CHUNK_SIZE);
  const maxX=Math.floor((centerX+WORLD_VIEW_RADIUS)/WORLD_CHUNK_SIZE);
  const minZ=Math.floor((centerZ-WORLD_VIEW_RADIUS)/WORLD_CHUNK_SIZE);
  const maxZ=Math.floor((centerZ+WORLD_VIEW_RADIUS)/WORLD_CHUNK_SIZE);
  for(let cx=minX;cx<=maxX;cx++)for(let cz=minZ;cz<=maxZ;cz++){
    const keys=worldChunkIndex.get(cx+','+cz);if(!keys)continue;
    for(const key of keys){
      const data=worldData.get(key);if(!data)continue;
      const [x,y,z]=parseWorldKey(key);if(!inRenderRange(x,z))continue;
      fn(key,data,x,y,z);
    }
  }
}
function removeWorldMesh(key){
  const root=worldMeshMap.get(key);if(!root)return;
  scene.remove(root);worldMeshMap.delete(key);
  worldInteractables=worldInteractables.filter(x=>x.userData?.worldKey!==key);
  freeMeshes=freeMeshes.filter(x=>x.userData?.worldKey!==key);
}
function assignWorldUserData(obj,key,x,y,z,type,extra={}){
  obj.userData={...obj.userData,worldBlock:true,worldKey:key,gx:x,gy:y,gz:z,type,...extra};
}
function registerWorldObject(root,key,x,y,z,type){
  root.traverse?.(o=>{
    if(o.isMesh&&!o.userData?.worldDecorative){
      assignWorldUserData(o,key,x,y,z,type,root.userData||{});worldInteractables.push(o);freeMeshes.push(o)
    }
  });
  if(root.isMesh&&!root.userData?.worldDecorative){
    assignWorldUserData(root,key,x,y,z,type,root.userData||{});
    if(!worldInteractables.includes(root))worldInteractables.push(root);
    if(!freeMeshes.includes(root))freeMeshes.push(root)
  }
}
function faceMaterials(colors){
  const cs=(colors&&colors.length===6?colors:DEFAULT_FACE_COLORS);
  return cs.map(c=>new THREE.MeshStandardMaterial({color:new THREE.Color(c),roughness:.72,transparent:false}));
}
function makeStairObject(mat,facing=0){
  const g=new THREE.Group(),bottom=new THREE.Mesh(new THREE.BoxGeometry(1,.5,1),mat),top=new THREE.Mesh(new THREE.BoxGeometry(1,.5,.5),mat);
  bottom.position.y=-.25;top.position.set(0,.25,.25);g.add(bottom,top);g.rotation.y=(facing||0)*Math.PI/2;return g;
}
function makeWindowObject(){
  const g=new THREE.Group(),wood=materialFor('planks'),glass=materialFor('glass');
  const bars=[new THREE.Mesh(new THREE.BoxGeometry(.1,1,.1),wood),new THREE.Mesh(new THREE.BoxGeometry(.1,1,.1),wood),
    new THREE.Mesh(new THREE.BoxGeometry(.1,.1,1),wood),new THREE.Mesh(new THREE.BoxGeometry(.1,.1,1),wood)];
  bars[0].position.z=-.45;bars[1].position.z=.45;bars[2].position.y=.45;bars[3].position.y=-.45;
  const pane=new THREE.Mesh(new THREE.BoxGeometry(.06,.82,.82),glass);g.add(...bars,pane);return g;
}
function makeFurnaceObject(facing=0){
  const mats=[materialFor('stone'),materialFor('stone'),materialFor('stone'),materialFor('stone'),materialFor('stone'),materialFor('stone')];
  const front=new THREE.MeshStandardMaterial({color:0x31353b,roughness:.92,emissive:0xff6a28,emissiveIntensity:.05});
  mats[4]=front;const m=new THREE.Mesh(freeCubeGeo,mats);m.rotation.y=(facing||0)*Math.PI/2;return m;
}
function makeChestObject(facing=0){
  const g=new THREE.Group(),wood=materialFor('planks');
  const base=new THREE.Mesh(new THREE.BoxGeometry(.9,.58,.78),wood);base.position.y=-.08;
  const lid=new THREE.Mesh(new THREE.BoxGeometry(.94,.22,.82),wood);lid.position.y=.34;
  const latch=new THREE.Mesh(new THREE.BoxGeometry(.12,.18,.05),new THREE.MeshStandardMaterial({color:0xd7b56d,roughness:.6}));
  latch.position.set(0,.12,-.42);g.add(base,lid,latch);g.rotation.y=(facing||0)*Math.PI/2;return g;
}
function makeBedObject(facing=0){
  const g=new THREE.Group(),wood=materialFor('planks'),cloth=materialFor('woolMat');
  const frame=new THREE.Mesh(new THREE.BoxGeometry(.92,.16,.96),wood);frame.position.y=-.28;
  const mattress=new THREE.Mesh(new THREE.BoxGeometry(.86,.25,.9),cloth);mattress.position.y=-.08;
  const pillow=new THREE.Mesh(new THREE.BoxGeometry(.62,.14,.28),new THREE.MeshStandardMaterial({color:0xf6f3ee,roughness:.9}));
  pillow.position.set(0,.08,.26);g.add(frame,mattress,pillow);g.rotation.y=(facing||0)*Math.PI/2;return g;
}
function makeMapBoardObject(facing=0){
  const g=new THREE.Group(),wood=materialFor('planks');
  const post=new THREE.Mesh(new THREE.BoxGeometry(.14,.86,.14),wood);post.position.y=-.02;
  const board=new THREE.Mesh(new THREE.BoxGeometry(.88,.58,.12),wood);board.position.y=.3;
  const map=new THREE.Mesh(new THREE.PlaneGeometry(.68,.4),new THREE.MeshBasicMaterial({color:0x8fc7c9,side:THREE.DoubleSide}));
  map.position.set(0,.3,-.066);map.rotation.y=Math.PI;g.add(post,board,map);g.rotation.y=(facing||0)*Math.PI/2;return g;
}
function trophyColor(id){return ({taj:0xeaf4f5,sagrada:0xe6b76b,eiffel:0x8fa1ad,towerBridge:0x72b9df,himeji:0xf2f2ef,angkor:0x849b5d}[id]||0xc8b28d)}
function makeDisplayStandObject(trophy=''){
  const g=new THREE.Group(),base=new THREE.Mesh(new THREE.CylinderGeometry(.36,.42,.44,8),materialFor('smoothStone'));
  base.position.y=-.25;g.add(base);
  if(trophy){
    const color=trophyColor(trophy),mat=new THREE.MeshStandardMaterial({color,roughness:.65,metalness:trophy==='eiffel'?.25:0});
    let art;
    if(trophy==='eiffel')art=new THREE.Mesh(new THREE.ConeGeometry(.18,.72,4),mat);
    else if(trophy==='towerBridge'){art=new THREE.Group();const a=new THREE.Mesh(new THREE.BoxGeometry(.14,.55,.14),mat),b=a.clone(),bridge=new THREE.Mesh(new THREE.BoxGeometry(.58,.12,.14),mat);a.position.x=-.22;b.position.x=.22;bridge.position.y=.08;art.add(a,b,bridge)}
    else if(trophy==='sagrada')art=new THREE.Mesh(new THREE.CylinderGeometry(.13,.22,.64,6),mat);
    else if(trophy==='taj')art=new THREE.Mesh(new THREE.SphereGeometry(.28,10,6,0,Math.PI*2,0,Math.PI/2),mat);
    else art=new THREE.Mesh(new THREE.BoxGeometry(.5,.42,.5),mat);
    art.position.y=.25;g.add(art);
  }
  return g;
}

function makeChairObject(facing=0){
  const g=new THREE.Group(),wood=materialFor('planks');
  const seat=new THREE.Mesh(new THREE.BoxGeometry(.72,.14,.72),wood);seat.position.y=-.02;g.add(seat);
  const back=new THREE.Mesh(new THREE.BoxGeometry(.72,.74,.12),wood);back.position.set(0,.34,.31);g.add(back);
  for(const x of [-.27,.27])for(const z of [-.27,.27]){
    const leg=new THREE.Mesh(new THREE.BoxGeometry(.11,.58,.11),wood);leg.position.set(x,-.34,z);g.add(leg);
  }
  g.rotation.y=(facing||0)*Math.PI/2;return g;
}
function makeDeskObject(facing=0,decor=''){
  const g=new THREE.Group(),wood=materialFor('planks');
  const top=new THREE.Mesh(new THREE.BoxGeometry(.96,.16,.7),wood);top.position.y=.18;g.add(top);
  for(const x of [-.37,.37])for(const z of [-.25,.25]){
    const leg=new THREE.Mesh(new THREE.BoxGeometry(.12,.72,.12),wood);leg.position.set(x,-.23,z);g.add(leg);
  }
  const drawer=new THREE.Mesh(new THREE.BoxGeometry(.34,.22,.58),new THREE.MeshStandardMaterial({color:0x855d3c,roughness:.88}));
  drawer.position.set(.25,.02,0);g.add(drawer);
  const prop=new THREE.Group();prop.position.set(-.16,.31,0);
  if(decor==='notes'){
    const paper=new THREE.Mesh(new THREE.BoxGeometry(.42,.025,.32),new THREE.MeshStandardMaterial({color:0xf1ead8,roughness:.95}));
    const book=new THREE.Mesh(new THREE.BoxGeometry(.28,.05,.22),new THREE.MeshStandardMaterial({color:0x5b78b5,roughness:.85}));
    book.position.set(.08,.045,-.02);prop.add(paper,book);
  }else if(decor==='flower'){
    const pot=new THREE.Mesh(new THREE.CylinderGeometry(.1,.13,.18,8),new THREE.MeshStandardMaterial({color:0xa96242,roughness:.9}));
    const stem=new THREE.Mesh(new THREE.BoxGeometry(.035,.22,.035),new THREE.MeshStandardMaterial({color:0x4e9b53,roughness:.9}));
    const bloom=new THREE.Mesh(new THREE.SphereGeometry(.09,8,6),new THREE.MeshStandardMaterial({color:0xe68fbb,roughness:.85}));
    pot.position.y=.08;stem.position.y=.25;bloom.position.y=.38;prop.add(pot,stem,bloom);
  }else if(decor==='lamp'){
    const stem=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.32,8),new THREE.MeshStandardMaterial({color:0x60656b,metalness:.25,roughness:.55}));
    const shade=new THREE.Mesh(new THREE.ConeGeometry(.14,.18,10,1,true),new THREE.MeshStandardMaterial({color:0xf0b34e,emissive:0xff9e35,emissiveIntensity:.35,side:THREE.DoubleSide}));
    stem.position.y=.18;shade.position.y=.4;prop.add(stem,shade);
  }else if(decor.startsWith('trophy:')){
    const id=decor.slice(7),tiny=makeDisplayStandObject(id);tiny.scale.setScalar(.38);tiny.position.y=.18;prop.add(tiny);
  }
  g.add(prop);g.rotation.y=(facing||0)*Math.PI/2;return g;
}
function explorationCollectionProgress(){
  const creatureTotal=Math.max(1,Object.keys(window.CubeArchitectCreatures?.SPECIES||{}).length);
  const biomeTotal=Math.max(1,Object.keys(worldRules.BIOMES||{}).length);
  const landmarkTotal=Math.max(1,(poiRules.POIS||poiRules.ALL||[]).length||6);
  const found=seenCreatureKinds.size+visitedBiomes.size+restoredLandmarks.size,total=creatureTotal+biomeTotal+landmarkTotal;
  return THREE.MathUtils.clamp(found/total,0,1);
}
function refreshBookshelfMeshes(){
  if(mode!=='free')return;
  for(const [key,data] of worldData){
    if(data?.type!=='bookshelf')continue;
    const [x,y,z]=parseWorldKey(key);if(inRenderRange(x,z))refreshBlockMesh(x,y,z);
  }
}
function makeBookshelfObject(facing=0,fill=0){
  const g=new THREE.Group(),wood=materialFor('planks'),dark=new THREE.MeshStandardMaterial({color:0x6f4e38,roughness:.9});
  const back=new THREE.Mesh(new THREE.BoxGeometry(.88,.96,.12),dark);back.position.z=.37;g.add(back);
  for(const x of [-.41,.41]){const side=new THREE.Mesh(new THREE.BoxGeometry(.12,.98,.76),wood);side.position.x=x;g.add(side)}
  for(const y of [-.42,0,.42]){const shelf=new THREE.Mesh(new THREE.BoxGeometry(.88,.1,.76),wood);shelf.position.y=y;g.add(shelf)}
  const colors=[0x5b78b5,0xb85f59,0xd0a84e,0x5f9c68,0x8c6bb1],count=Math.max(0,Math.min(10,Math.round(fill*10)));
  for(let n=0;n<count;n++){
    const row=Math.floor(n/5),i=n%5;
    const book=new THREE.Mesh(new THREE.BoxGeometry(.1,.28+.04*((i+row)%2),.32),
      new THREE.MeshStandardMaterial({color:colors[(i+row)%colors.length],roughness:.86}));
    book.position.set(-.28+i*.14,-.2+row*.43,.08);g.add(book);
  }
  g.rotation.y=(facing||0)*Math.PI/2;return g;
}
function cleanSignText(value){
  return String(value||'').replace(/[\r\t]/g,' ').split('\n').slice(0,2).map(s=>s.slice(0,12)).join('\n').slice(0,24);
}
function makeSignTexture(text=''){
  const c=document.createElement('canvas');c.width=512;c.height=256;const ctx=c.getContext('2d');
  ctx.fillStyle='#b98554';ctx.fillRect(0,0,c.width,c.height);ctx.strokeStyle='#754c2d';ctx.lineWidth=18;ctx.strokeRect(9,9,c.width-18,c.height-18);
  ctx.fillStyle='#2d2118';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='800 54px Pretendard, Noto Sans KR, sans-serif';
  const lines=(cleanSignText(text)||'표지판').split('\n');lines.forEach((line,i)=>ctx.fillText(line,256,lines.length===1?128:86+i*84,450));
  const tex=new THREE.CanvasTexture(c);if('colorSpace' in tex&&THREE.SRGBColorSpace)tex.colorSpace=THREE.SRGBColorSpace;return tex;
}
function makeSignObject(facing=0,text=''){
  const g=new THREE.Group(),wood=materialFor('planks');
  const post=new THREE.Mesh(new THREE.BoxGeometry(.11,.72,.11),wood);post.position.y=-.14;g.add(post);
  const board=new THREE.Mesh(new THREE.BoxGeometry(.9,.55,.1),wood);board.position.y=.28;g.add(board);
  const front=new THREE.Mesh(new THREE.PlaneGeometry(.78,.43),new THREE.MeshBasicMaterial({map:makeSignTexture(text),side:THREE.DoubleSide,toneMapped:false}));
  front.position.set(0,.28,-.056);front.rotation.y=Math.PI;g.add(front);g.rotation.y=(facing||0)*Math.PI/2;return g;
}
function makeCropObject(type,age=0){
  const g=new THREE.Group(),stage=Math.max(0,Math.min(3,Math.floor((Number(age)||0)/(CROP_MATURE_AGE/4))));
  const color=type==='wheatCrop'?(stage>=3?0xd9bd55:0x79a94d):type==='carrotCrop'?0x62a34f:0x709a4d;
  const mat=new THREE.MeshStandardMaterial({color,roughness:.9,side:THREE.DoubleSide});
  const h=.18+stage*.13;
  for(const x of [-.22,0,.22]){const stem=new THREE.Mesh(new THREE.BoxGeometry(.06,h,.06),mat);stem.position.set(x,h/2,0);g.add(stem)}
  if(stage>=3&&type==='wheatCrop'){
    const grain=new THREE.Mesh(new THREE.BoxGeometry(.5,.1,.12),new THREE.MeshStandardMaterial({color:0xe4c762,roughness:.9}));
    grain.position.y=h+.02;g.add(grain);
  }
  return g;
}
function grassTuftMaterial(variant=0){
  const key='grassTuft:'+variant;if(materialCache.has(key))return materialCache.get(key);
  const colors=[0x68ad57,0x78bc61,0x4f9849];
  const m=new THREE.MeshStandardMaterial({color:colors[variant%colors.length],roughness:.95,side:THREE.DoubleSide});
  materialCache.set(key,m);return m;
}
function decorateGrassTop(root,x,y,z,data){
  if(!data?.natural||getBlock(x,y+1,z)||hash2(x*31+7,z*37-9)<.73)return;
  const variant=Math.floor(hash2(x*7-3,z*11+5)*3),mat=grassTuftMaterial(variant);
  const positions=[[-.2,.02,-.12,.08],[.15,0,.13,-.35],[.02,.05,-.03,.55],[.24,.015,-.2,1.05],[-.11,.035,.2,-.9]];
  for(const [px,py,pz,rot] of positions){
    const blade=new THREE.Mesh(grassTuftGeo,mat);
    blade.position.set(px,.62+py,pz);blade.rotation.y=rot;blade.rotation.z=(hash2((x+px)*17,(z+pz)*19)-.5)*.2;
    blade.userData.worldDecorative=true;root.add(blade);
  }
}
// Real models decorate the same voxel coordinate. Physics, saves and item recipes remain voxel authoritative.
function makeFurnishingFallback(type,data){
  const root=new THREE.Group(),info=blockDef(type);
  const material=new THREE.MeshStandardMaterial({color:info.color||0xa9835c,roughness:.83});
  const flat=['rug','bedroll','campfire'].includes(type),tall=['floorLamp','tent'].includes(type);
  const shape=new THREE.Mesh(new THREE.BoxGeometry(flat?.82:.79,flat?.09:tall?.94:.72,flat?.82:.79),material);
  shape.position.y=flat?-.44:tall?-.03:-.14;root.add(shape);
  root.rotation.y=(data.facing||0)*Math.PI/2;
  return root;
}
function addFurnishingEffect(root,type,data){
  if(type==='floorLamp'&&data.lit!==false){
    const light=new THREE.PointLight(0xffdfad,.85,6,2);light.position.set(0,.48,0);
    light.userData.persistentWorldEffect=true;root.add(light);
  }
  if(type==='campfire'&&data.lit!==false){
    const flame=new THREE.Mesh(
      new THREE.ConeGeometry(.15,.37,8),
      new THREE.MeshStandardMaterial({color:0xff8e36,emissive:0xff531d,emissiveIntensity:1.15,transparent:true,opacity:.92}));
    flame.position.set(0,-.17,0);flame.userData.worldDecorative=true;
    flame.userData.persistentWorldEffect=true;root.add(flame);
    const light=new THREE.PointLight(0xff873e,1.05,6.5,2);
    light.position.set(0,.1,0);light.userData.persistentWorldEffect=true;root.add(light);
  }
}
function hydrateFurnishingGLB(root,key,x,y,z,type,data){
  const api=window.CubeArchitectWorldAssets;
  if(!FURNISHING_ASSET_TYPES.has(type)||!api?.PLACEMENT_SPECS?.[type]||!api.loadPlacement)return;
  const oldChildren=root.children.slice();
  api.loadPlacement(type).then(model=>{
    // The player may mine or unload this cell before the model finishes.
    if(worldMeshMap.get(key)!==root||getBlock(x,y,z)?.type!==type)return;
    model.rotation.y=0;root.add(model);
    if(root.isMesh){
      if(Array.isArray(root.material))root.material=root.material.map(m=>{const c=m.clone();c.visible=false;return c});
      else if(root.material){root.material=root.material.clone();root.material.visible=false}
    }
    oldChildren.forEach((child,i)=>{
      if(child.userData?.persistentWorldEffect)return;
      // Keep player-written desktop decorations and collection books visible.
      if(type==='desk'&&i===oldChildren.length-1)return;
      if(type==='bookshelf'&&i>=6)return;
      child.visible=false;
    });
    registerWorldObject(model,key,x,y,z,type);
  }).catch(err=>console.warn('[Cube Architect furnishing fallback]',type,err));
}
function makeWorldMesh(x,y,z,data){
  const d=blockDef(data),type=data.type,key=worldKey(x,y,z);if(d.hidden||isChunkRenderableData(data))return null;
  let root;
  if(type==='door'){
    root=new THREE.Mesh(doorGeo,materialFor('door'));root.position.set(x,y+1,z);
    const facing=(data.facing||0)*Math.PI/2;root.rotation.y=facing+(data.open?Math.PI/2:0);
  }else if(type==='torch'){
    root=new THREE.Mesh(torchGeo,materialFor('torch'));root.position.set(x,y+.34,z);
    const light=new THREE.PointLight(0xffb45e,1.25,7,2);light.position.y=.42;root.add(light);
  }else if(type==='chest'){
    root=makeChestObject(data.facing||0);root.position.set(x,y+.5,z);
  }else if(type==='bed'){
    root=makeBedObject(data.facing||0);root.position.set(x,y+.5,z);
  }else if(type==='mapBoard'){
    root=makeMapBoardObject(data.facing||0);root.position.set(x,y+.5,z);
  }else if(type==='displayStand'){
    root=makeDisplayStandObject(data.trophy||'');root.position.set(x,y+.5,z);
  }else if(type==='chair'){
    root=makeChairObject(data.facing||0);root.position.set(x,y+.5,z);
  }else if(type==='desk'){
    root=makeDeskObject(data.facing||0,data.decor||'');root.position.set(x,y+.5,z);
  }else if(type==='bookshelf'){
    root=makeBookshelfObject(data.facing||0,explorationCollectionProgress());root.position.set(x,y+.5,z);
  }else if(type==='sign'){
    root=makeSignObject(data.facing||0,data.text||'');root.position.set(x,y+.5,z);
  }else if(type==='workbench'||CAMP_STRUCTURE_TYPES.has(type)){
    root=makeFurnishingFallback(type,data);root.position.set(x,y+.5,z);
  }else if(type==='tilledSoil'){
    root=new THREE.Mesh(new THREE.BoxGeometry(1,.88,1),new THREE.MeshStandardMaterial({color:0x6f4932,roughness:1}));root.position.set(x,y+.44,z);
  }else if(FARM_CROP_TYPES.includes(type)){
    root=makeCropObject(type,data.age||0);root.position.set(x,y,z);
  }else if(type==='sapling'||type==='reed'||type==='flower'){
    root=new THREE.Mesh(saplingGeo,materialFor(type));root.position.set(x,y+.41,z);
  }else if(type==='fire'){
    root=new THREE.Mesh(fireGeo,new THREE.MeshStandardMaterial({color:0xff8c32,emissive:0xff4b18,emissiveIntensity:1.15,transparent:true,opacity:.84,roughness:.5}));
    root.position.set(x,y+.42,z);const light=new THREE.PointLight(0xff692c,1.4,6,2);light.position.y=.35;root.add(light);
  }else if(type==='water'||type==='lava'){
    const h=fluidHeight(data);
    root=new THREE.Mesh(fluidGeo,materialFor(type));root.scale.y=h/.84;root.position.set(x,y+h/2,z);
  }else if(type==='slab'){
    root=new THREE.Mesh(slabGeo,materialFor('planks'));root.position.set(x,y+.25,z);
  }else if(type==='glassPane'){
    root=new THREE.Mesh(paneGeo,materialFor('glass'));root.position.set(x,y+.5,z);root.rotation.y=(data.facing||0)*Math.PI/2;
  }else if(type==='windowFrame'){
    root=makeWindowObject();root.position.set(x,y+.5,z);root.rotation.y=(data.facing||0)*Math.PI/2;
  }else if(type==='stairs'){
    root=makeStairObject(materialFor('planks'),data.facing||0);root.position.set(x,y+.5,z);
  }else if(type==='roof'){
    root=new THREE.Mesh(roofGeo,materialFor('roof'));root.position.set(x,y+.5,z);root.rotation.y=(data.facing||0)*Math.PI/2;
  }else if(type==='furnace'){
    root=makeFurnaceObject(data.facing||0);root.position.set(x,y+.5,z);
  }else if(type==='cuboid'){
    const dims=data.dims||[1,1,1],geo=new THREE.BoxGeometry(dims[0],dims[1],dims[2]);
    root=new THREE.Mesh(geo,faceMaterials(data.faceColors));root.position.set(x+(dims[0]-1)/2,y+dims[1]/2,z+(dims[2]-1)/2);
    root.userData={shapeKind:'cuboid',dims:dims.slice(),faceIds:FACE_IDS.slice(),topology:CUBOID_TOPOLOGY};
  }else{
    const geo=(type==='leaves'||type==='pineLeaves')?leafCubeGeo:freeCubeGeo;
    root=new THREE.Mesh(geo,data.faceColors?faceMaterials(data.faceColors):blockVisualMaterial(type,x,z));root.position.set(x,y+.5,z);
    root.userData={shapeKind:'cuboid',dims:[1,1,1],faceIds:FACE_IDS.slice(),topology:CUBOID_TOPOLOGY};
    if(type==='grass')decorateGrassTop(root,x,y,z,data);
    if(type==='leaves'||type==='pineLeaves'){
      const v=.96+hash2(x*19+y*7,z*23-y*3)*.05;
      root.scale.set(v,.95+hash2(x*5,z*13)*.06,v);
    }
  }
  const casts=!(type==='water'||type==='glass'||type==='glassPane'||type==='leaves'||type==='pineLeaves'||type==='fire'||type==='windowFrame');
  root.castShadow=casts;root.receiveShadow=true;
  root.traverse?.(o=>{if(o.isMesh&&!o.userData?.worldDecorative){o.castShadow=casts;o.receiveShadow=true}});
  scene.add(root);worldMeshMap.set(key,root);registerWorldObject(root,key,x,y,z,type);
  if(FURNISHING_ASSET_TYPES.has(type)){
    addFurnishingEffect(root,type,data);
    hydrateFurnishingGLB(root,key,x,y,z,type,data);
  }
  return root;
}
function refreshBlockMesh(x,y,z){
  const key=worldKey(x,y,z);
  if(!inRenderRange(x,z)){if(worldMeshMap.has(key))removeWorldMesh(key);return}
  removeWorldMesh(key);
  const data=getBlock(x,y,z);
  if(data&&!isChunkRenderableData(data)&&visibleAt(x,y,z,data))makeWorldMesh(x,y,z,data);
  queueWorldChunkRemesh(x,z);
}
function refreshAround(x,y,z){
  [[0,0,0],[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]].forEach(v=>refreshBlockMesh(x+v[0],y+v[1],z+v[2]));
}
function markEdit(x,y,z,data){worldEdits.set(worldKey(x,y,z),cloneBlockData(data))}
function setWorldBlock(x,y,z,data,record=true){
  if(!inWorld(x,y,z))return false;
  setRawBlock(x,y,z,data);if(record)markEdit(x,y,z,data);refreshAround(x,y,z);return true;
}
function removeCuboidAt(ax,ay,az,record=true){
  const anchor=getBlock(ax,ay,az);if(!anchor||anchor.type!=='cuboid')return false;
  const dims=anchor.dims||[1,1,1];
  removeWorldMesh(worldKey(ax,ay,az));
  for(let dx=0;dx<dims[0];dx++)for(let dy=0;dy<dims[1];dy++)for(let dz=0;dz<dims[2];dz++){
    const x=ax+dx,y=ay+dy,z=az+dz;setRawBlock(x,y,z,null);if(record)markEdit(x,y,z,null);
  }
  for(let dx=0;dx<dims[0];dx++)for(let dz=0;dz<dims[2];dz++)
    cleanupUnsupportedAt(ax+dx,ay+dims[1],az+dz,record);
  for(let dx=-1;dx<=dims[0];dx++)for(let dy=-1;dy<=dims[1];dy++)for(let dz=-1;dz<=dims[2];dz++){
    if(dx>=0&&dx<dims[0]&&dy>=0&&dy<dims[1]&&dz>=0&&dz<dims[2])continue;
    refreshBlockMesh(ax+dx,ay+dy,az+dz);
  }
  return true;
}
function removeWorldBlockData(x,y,z,record=true){
  const data=getBlock(x,y,z);if(!data||blockDef(data).unbreakable)return false;
  if(data.type==='cuboidPart'){
    const a=data.anchor||[x,y,z];return removeCuboidAt(a[0],a[1],a[2],record);
  }
  if(data.type==='cuboid')return removeCuboidAt(x,y,z,record);
  if(data.type==='doorTop')return removeWorldBlockData(x,y-1,z,record);
  if(data.type==='door'){
    setRawBlock(x,y,z,null);setRawBlock(x,y+1,z,null);
    if(record){markEdit(x,y,z,null);markEdit(x,y+1,z,null)}
    refreshAround(x,y,z);refreshAround(x,y+1,z);cleanupUnsupportedAt(x,y+2,z,record);return true;
  }
  setRawBlock(x,y,z,null);if(record)markEdit(x,y,z,null);refreshAround(x,y,z);
  cleanupUnsupportedAt(x,y+1,z,record);return true;
}
function inRenderRange(x,z){
  return Math.abs(x-streamCenterX)<=WORLD_VIEW_RADIUS&&Math.abs(z-streamCenterZ)<=WORLD_VIEW_RADIUS;
}
function streamWorldMeshes(force=false){
  const cx=Math.round(camera.position.x),cz=Math.round(camera.position.z);
  if(!force&&Math.abs(cx-streamCenterX)<7&&Math.abs(cz-streamCenterZ)<7)return;
  streamCenterX=cx;streamCenterZ=cz;
  const stale=new Set();
  for(const [key,mesh] of worldMeshMap){
    const [x,,z]=parseWorldKey(key);
    if(!inRenderRange(x,z)){scene.remove(mesh);worldMeshMap.delete(key);stale.add(key)}
  }
  if(stale.size){
    worldInteractables=worldInteractables.filter(m=>!stale.has(m.userData.worldKey));
    freeMeshes=freeMeshes.filter(m=>!stale.has(m.userData.worldKey));
  }
  for(const chunk of [...worldChunkMeshMap.keys()]){
    const [bx,bz]=chunk.split(',').map(Number);
    if(!chunkTouchesRenderRange(bx,bz))removeWorldChunkRender(chunk);
  }
  const minX=Math.floor((cx-WORLD_VIEW_RADIUS)/WORLD_CHUNK_SIZE);
  const maxX=Math.floor((cx+WORLD_VIEW_RADIUS)/WORLD_CHUNK_SIZE);
  const minZ=Math.floor((cz-WORLD_VIEW_RADIUS)/WORLD_CHUNK_SIZE);
  const maxZ=Math.floor((cz+WORLD_VIEW_RADIUS)/WORLD_CHUNK_SIZE);
  for(let bx=minX;bx<=maxX;bx++)for(let bz=minZ;bz<=maxZ;bz++){
    const chunk=bx+','+bz,wasGenerated=worldChunksGenerated.has(chunk);
    generateWorldChunk(bx,bz);
    const madeChunk=ensureWorldChunkMesh(bx,bz);
    if(!wasGenerated||madeChunk){
      for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const neighbor=(bx+dx)+','+(bz+dz);
        if(worldChunkMeshMap.has(neighbor))rebuildWorldChunkMesh(bx+dx,bz+dz);
      }
    }
    const keys=worldChunkIndex.get(chunk);
    if(!keys)continue;
    for(const key of keys){
      if(worldMeshMap.has(key))continue;
      const [x,y,z]=parseWorldKey(key);
      if(!inRenderRange(x,z))continue;
      const data=worldData.get(key);
      if(data&&!isChunkRenderableData(data)&&visibleAt(x,y,z,data))makeWorldMesh(x,y,z,data);
    }
  }
}
function rebuildAllWorldMeshes(){
  for(const mesh of worldMeshMap.values())scene.remove(mesh);
  for(const chunk of [...worldChunkMeshMap.keys()])removeWorldChunkRender(chunk);
  worldMeshMap=new Map();worldChunkMeshMap=new Map();worldChunkDecorMap=new Map();
  dirtyWorldChunks.clear();chunkRemeshQueued=false;worldInteractables=[];freeMeshes=[];
  streamCenterX=Infinity;streamCenterZ=Infinity;streamWorldMeshes(true);
}
function growTree(x,baseY,z,record,kind='forest'){
  const conifer=kind==='pine'||kind==='snow';
  // Minecraft-like scale: a 1.8-block player should read as clearly smaller than normal trees.
  const height=(conifer?7:5)+Math.floor(hash2(x+11,z-7)*3);
  const bark=conifer?'pineLog':'log',foliage=conifer?'pineLeaves':'leaves';
  for(let i=0;i<height;i++){
    const d={type:bark,natural:!record};if(record)setWorldBlock(x,baseY+i,z,d,true);else setRawBlock(x,baseY+i,z,d);
  }
  const top=baseY+height-1;
  for(let dy=-2;dy<=1;dy++)for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){
    const range=conifer?(dy===-2?2:dy===-1?1:0):dy===-2?0:dy===1?1:2;
    if(Math.abs(dx)+Math.abs(dz)>range+1)continue;
    const px=x+dx,py=top+dy+1,pz=z+dz;
    if(!inWorld(px,py,pz)||getBlock(px,py,pz))continue;
    const d={type:foliage,natural:!record};if(record)setWorldBlock(px,py,pz,d,true);else setRawBlock(px,py,pz,d);
  }
}
function miniPoiLocalCoord(v){return ((v%WORLD_CHUNK_SIZE)+WORLD_CHUNK_SIZE)%WORLD_CHUNK_SIZE}
function miniPoiSpotOk(x,z,biome,used=[],relaxed=false){
  if(!inWorld(x,1,z)||worldRules.region(x,z)!==biome)return false;
  const lx=miniPoiLocalCoord(x),lz=miniPoiLocalCoord(z);
  if(lx<4||lx>11||lz<4||lz>11)return false;
  if(poiRules.isLandmarkClearZone?.(x,z,relaxed?4:7))return false;
  if(used.some(p=>Math.hypot(p.x-x,p.z-z)<(relaxed?12:15)))return false;
  const samples=[[0,0],[2,0],[-2,0],[0,2],[0,-2],[2,2],[-2,-2]];
  const heights=samples.map(([dx,dz])=>terrainHeight(x+dx,z+dz));
  if(Math.min(...heights)<SEA_LEVEL||Math.max(...heights)-Math.min(...heights)>(relaxed?2:1))return false;
  return relaxed||samples.every(([dx,dz])=>worldRules.region(x+dx,z+dz)===biome);
}
function buildMiniPoiCatalog(){
  if(miniPoiCatalog)return miniPoiCatalog;
  const centers={};
  for(const [x,z,biome] of worldRules.CENTERS||[])(centers[biome]||(centers[biome]=[])).push([x,z]);
  miniPoiCatalog=[];
  const biomeOrder=Object.keys(MINI_POI_VARIANTS);
  biomeOrder.forEach((biome,biomeIndex)=>{
    const variants=MINI_POI_VARIANTS[biome]||[],used=[];
    variants.forEach((variant,slot)=>{
      const centerList=centers[biome]||[[0,0]],base=centerList[slot%centerList.length]||centerList[0];
      let chosen=null;
      const radii=biome==='meadow'?[8,11,14,16]:[15,20,25,30,35];
      for(const radius of radii){
        for(let i=0;i<32&&!chosen;i++){
          const angle=((i+slot*9+biomeIndex*5)%32)/32*Math.PI*2;
          const x=Math.round(base[0]+Math.cos(angle)*radius),z=Math.round(base[1]+Math.sin(angle)*radius);
          if(miniPoiSpotOk(x,z,biome,used))chosen={x,z};
        }
        if(chosen)break;
      }
      if(!chosen){
        let best=null,bestScore=Infinity;
        for(let x=-WORLD_HALF+6;x<WORLD_HALF-6;x+=4)for(let z=-WORLD_HALF+6;z<WORLD_HALF-6;z+=4){
          if(!miniPoiSpotOk(x,z,biome,used))continue;
          const score=Math.hypot(x-base[0],z-base[1])+hash2(x*17+slot,z*23+biomeIndex)*4;
          if(score<bestScore){bestScore=score;best={x,z}}
        }
        chosen=best;
      }
      if(!chosen){
        let best=null,bestScore=Infinity;
        for(let x=-WORLD_HALF+6;x<WORLD_HALF-6;x+=2)for(let z=-WORLD_HALF+6;z<WORLD_HALF-6;z+=2){
          if(!miniPoiSpotOk(x,z,biome,used,true))continue;
          const score=Math.hypot(x-base[0],z-base[1]);
          if(score<bestScore){bestScore=score;best={x,z}}
        }
        chosen=best;
      }
      if(!chosen)return;
      const y=terrainHeight(chosen.x,chosen.z)+1;
      const entry={...variant,biome,slot,x:chosen.x,y,z:chosen.z,chunk:worldChunkKey(chosen.x,chosen.z)};
      used.push(entry);miniPoiCatalog.push(entry);
    });
  });
  return miniPoiCatalog;
}
function miniPoiPut(spec,dx,dy,dz,type,extra={}){
  const x=spec.x+dx,y=spec.y+dy,z=spec.z+dz;if(!inWorld(x,y,z))return;
  setRawBlock(x,y,z,{type,natural:true,miniPoi:spec.id,...extra});
}
function clearMiniPoiPlants(spec,r=4,h=10){
  const plants=new Set(['log','pineLog','leaves','pineLeaves','flower','reed','cactus','sapling']);
  for(let dx=-r;dx<=r;dx++)for(let dz=-r;dz<=r;dz++)for(let dy=0;dy<=h;dy++){
    const x=spec.x+dx,y=spec.y+dy,z=spec.z+dz,d=worldData.get(worldKey(x,y,z));
    if(d&&plants.has(d.type))setRawBlock(x,y,z,null);
  }
}
function stampMiniPoi(spec){
  clearMiniPoiPlants(spec);
  const put=(dx,dy,dz,type,extra)=>miniPoiPut(spec,dx,dy,dz,type,extra);
  const line=(x1,z1,x2,z2,y,type)=>{
    const steps=Math.max(Math.abs(x2-x1),Math.abs(z2-z1));
    for(let i=0;i<=steps;i++)put(Math.round(x1+(x2-x1)*i/Math.max(1,steps)),y,Math.round(z1+(z2-z1)*i/Math.max(1,steps)),type);
  };
  switch(spec.kind){
    case 'camp':
      put(-2,0,-1,'log');put(2,0,-1,'log');put(0,0,0,'stone');put(0,1,0,'torch');
      put(-2,0,2,'planks');put(-1,0,2,'planks');put(1,0,2,'planks');put(2,0,2,'planks');break;
    case 'well':
      for(const [dx,dz] of [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]])put(dx,0,dz,'stone');
      put(0,0,0,'water',{level:4});put(-1,1,0,'log');put(1,1,0,'log');put(-1,2,0,'planks');put(0,2,0,'planks');put(1,2,0,'planks');break;
    case 'oldCamp':
      line(-2,-2,2,-2,0,'planks');put(-2,0,0,'log');put(2,0,0,'log');put(0,0,1,'stone');put(0,1,1,'torch');
      put(-2,1,-2,'log');put(2,1,-2,'log');put(-2,2,-2,'planks');put(-1,2,-2,'planks');put(0,2,-2,'planks');put(1,2,-2,'planks');put(2,2,-2,'planks');break;
    case 'fallenTree':
      line(-3,0,3,0,0,'log');put(-2,1,0,'log');put(2,1,0,'log');put(0,0,1,'planks');put(1,0,1,'planks');break;
    case 'watchPost':
      for(const [dx,dz] of [[-1,-1],[1,-1],[-1,1],[1,1]]){put(dx,0,dz,'pineLog');put(dx,1,dz,'pineLog')}
      for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)put(dx,2,dz,'planks');
      put(0,3,0,'torch');put(0,0,2,'stairs',{facing:0});break;
    case 'cairn':
      put(0,0,0,'stone');put(1,0,0,'stone');put(-1,0,0,'stone');put(0,0,1,'stone');put(0,0,-1,'stone');
      put(0,1,0,'smoothStone');put(0,2,0,'stone');break;
    case 'snowStation':
      for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)if(Math.abs(dx)===2||Math.abs(dz)===2)put(dx,0,dz,'snowBrick');
      for(const [dx,dz] of [[-2,-2],[2,-2],[-2,2],[2,2]])put(dx,1,dz,'snowBrick');
      line(-2,-2,2,-2,2,'snowBrick');put(0,1,-2,'glassPane',{facing:0});put(0,0,0,'planks');put(0,1,0,'torch');break;
    case 'iceMarker':
      put(0,0,0,'snowBrick');put(0,1,0,'glass');put(0,2,0,'glass');put(0,3,0,'snowBrick');
      put(1,0,0,'snow');put(-1,0,0,'snow');put(0,0,1,'snow');put(0,0,-1,'snow');break;
    case 'oasis':
      for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){
        const edge=Math.abs(dx)===2||Math.abs(dz)===2;put(dx,0,dz,edge?'sandstone':'water',edge?{}:{level:4});
      }
      put(3,0,0,'cactus');put(3,1,0,'cactus');put(-3,0,1,'planks');put(-2,0,1,'planks');break;
    case 'fossil':
      line(-3,0,0,0,0,'sandstone');
      for(const x of [-2,-1,0,1,2]){put(x,1,0,'sandstone');if(Math.abs(x)<=1)put(x,2,0,'sandstone')}
      put(-2,0,1,'sand');put(2,0,-1,'sand');break;
    case 'minerCamp':
      line(-2,-2,2,-2,0,'planks');put(-2,0,0,'log');put(2,0,0,'log');put(0,0,1,'ironOre');put(1,0,1,'stone');
      put(-2,1,-2,'log');put(2,1,-2,'log');put(0,1,-2,'torch');break;
    case 'stoneArch':
      for(let y=0;y<4;y++){put(-2,y,0,'brick');put(2,y,0,'brick')}
      line(-2,0,2,0,4,'brick');put(-1,3,0,'brick');put(1,3,0,'brick');break;
    case 'boardwalk':
      line(-3,0,3,0,0,'planks');line(-3,1,3,1,0,'planks');
      put(-3,1,0,'torch');put(3,1,1,'torch');put(-2,0,-1,'reed');put(2,0,2,'reed');break;
    case 'reedShrine':
      for(const [dx,dz] of [[-1,-1],[1,-1],[-1,1],[1,1]])put(dx,0,dz,'clay');
      put(0,0,0,'smoothStone');put(0,1,0,'torch');put(-2,0,0,'reed');put(2,0,0,'reed');put(0,0,-2,'reed');put(0,0,2,'reed');break;
    case 'flowerGarden':
      for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)if((Math.abs(dx)+Math.abs(dz))%2===0)put(dx,0,dz,'flower');
      put(-2,0,3,'planks');put(-1,0,3,'planks');put(0,0,3,'planks');put(1,0,3,'planks');put(2,0,3,'planks');break;
    case 'picnic':
      put(-1,0,0,'planks');put(0,0,0,'planks');put(1,0,0,'planks');put(0,1,0,'woolMat');
      put(-2,0,2,'flower');put(2,0,2,'flower');put(-2,0,-2,'flower');put(2,0,-2,'flower');break;
  }
}
function generateMiniPoiChunk(cx,cz){
  const chunk=cx+','+cz;
  for(const spec of buildMiniPoiCatalog())if(spec.chunk===chunk)stampMiniPoi(spec);
}
function nearestUncollectedMiniPoi(x,z,maxDistance=18){
  let best=null;
  for(const spec of buildMiniPoiCatalog()){
    if(collected.has('mini:'+spec.id))continue;
    const dist=Math.hypot(x-spec.x,z-spec.z);
    if(dist<=maxDistance&&(!best||dist<best.dist))best={...spec,dist};
  }
  return best;
}
function addCollectible(id,x,y,z,color,label,meta={}){
  const m=new THREE.Mesh(new THREE.OctahedronGeometry(.45),
    new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.42,roughness:.3}));
  m.position.set(x,y,z);m.userData={collectible:id,label,baseY:y,...meta};m.castShadow=true;
  scene.add(m);collectibles.push(m);
}
function generateWorldChunk(cx,cz){
  const chunk=cx+','+cz;
  if(worldChunksGenerated.has(chunk))return;
  const minX=cx*WORLD_CHUNK_SIZE,minZ=cz*WORLD_CHUNK_SIZE;
  if(minX>=WORLD_HALF||minZ>=WORLD_HALF||
    minX+WORLD_CHUNK_SIZE<=-WORLD_HALF||minZ+WORLD_CHUNK_SIZE<=-WORLD_HALF)return;
  worldChunksGenerated.add(chunk);worldChunkGenerationDepth++;
  try{
    const heights=new Map();
    for(let x=Math.max(-WORLD_HALF,minX);x<Math.min(WORLD_HALF,minX+WORLD_CHUNK_SIZE);x++)
      for(let z=Math.max(-WORLD_HALF,minZ);z<Math.min(WORLD_HALF,minZ+WORLD_CHUNK_SIZE);z++){
        const h=terrainHeight(x,z),id=worldRules.region(x,z),biome=worldRules.BIOMES[id];
        heights.set(x+','+z,h);
        for(let y=WORLD_MIN_Y;y<=h;y++){
          let type;
          if(y===WORLD_MIN_Y)type='bedrock';
          else if(y<=h-3)type=y<4&&hash2(x*3+y,z*5-y)>.945?'ironOre':
            id==='badlands'&&y>1?'redSand':hash2(x+y*7,z-y*11)>.965?'gravel':'stone';
          else if(y<h)type=biome.sub;
          else type=biome.ground;
          // Preserve leaves of neighboring chunks above the ground.
          setRawBlock(x,y,z,{type,natural:true});
        }
        if(h<SEA_LEVEL)for(let y=h+1;y<=SEA_LEVEL;y++)
          setRawBlock(x,y,z,{type:'water',level:4,naturalSea:true,natural:true});
      }
    for(let x=Math.max(-WORLD_HALF+3,minX);x<Math.min(WORLD_HALF-3,minX+WORLD_CHUNK_SIZE);x++)
      for(let z=Math.max(-WORLD_HALF+3,minZ);z<Math.min(WORLD_HALF-3,minZ+WORLD_CHUNK_SIZE);z++){
        const h=heights.get(x+','+z),kind=worldRules.region(x,z),b=worldRules.BIOMES[kind];
        const r=Math.hypot(x,z),roll=hash2(x*13+7,z*17-11);
        if(r<4||getBlock(x,h+1,z)||h<0)continue;
        // Keep a readable silhouette and approach path around landmark POIs.
        if(gameFreeMode==='survival'&&poiRules.isLandmarkClearZone?.(x,z,2))continue;
        if(kind==='flowers'&&roll>.74){
          setRawBlock(x,h+1,z,{type:'flower',natural:true});
        }else if(kind==='desert'||kind==='badlands'){
          if(roll>.985&&getBlock(x,h,z)?.type!=='water')
            for(let y=1;y<=2+Math.floor(hash2(x,z)*2);y++)
              setRawBlock(x,h+y,z,{type:'cactus',natural:true});
        }else if(kind==='marsh'){
          if(roll>.987)growTree(x,h+1,z,false,'forest');
          else if(roll>.966)
            for(let y=1;y<=2;y++)setRawBlock(x,h+y,z,{type:'reed',natural:true});
        }else if(roll>1-b.trees&&!(x%3===0&&z%3===0)){
          growTree(x,h+1,z,false,kind==='pine'||kind==='snow'?'pine':'forest');
        }
      }
    generateMiniPoiChunk(cx,cz);
    generateLandmarkPoiChunk(cx,cz);
    // Save files store only changes. Reapply those changes after natural terrain and POIs.
    if(worldEdits?.size)for(const [key,change] of worldEdits){
      const [x,y,z]=parseWorldKey(key);
      if(worldChunkKey(x,z)===chunk)setRawBlock(x,y,z,change);
    }
  }finally{worldChunkGenerationDepth--}
}
function buildFreeWorld(){
  worldData=new Map();worldMeshMap=new Map();worldEdits=new Map();
  worldChunkMeshMap=new Map();worldChunkDecorMap=new Map();dirtyWorldChunks=new Set();chunkRemeshQueued=false;
  worldChunkIndex=new Map();worldChunksGenerated=new Set();worldChunkGenerationDepth=0;
  const radius=WORLD_VIEW_RADIUS+5;
  const xMin=Math.floor(-radius/WORLD_CHUNK_SIZE),xMax=Math.floor(radius/WORLD_CHUNK_SIZE);
  const zMin=Math.floor((5-radius)/WORLD_CHUNK_SIZE);
  const zMax=Math.floor((5+radius)/WORLD_CHUNK_SIZE);
  for(let cx=xMin;cx<=xMax;cx++)for(let cz=zMin;cz<=zMax;cz++)
    generateWorldChunk(cx,cz);
  // Always provide a few nearby trees even when procedural vegetation is sparse.
  for(const [x,z] of [[6,3],[-6,4],[5,-6]]){
    const y=terrainHeight(x,z);
    if(y>=0&&!getBlock(x,y+1,z))growTree(x,y+1,z,false,'forest');
  }
  // Small discovery sites keep the long walks between landmarks interesting.
  for(const spec of buildMiniPoiCatalog()){
    addCollectible('mini:'+spec.id,spec.x,spec.y+2.15,spec.z,spec.color,spec.label,{
      miniPoi:true,reward:spec.reward,biome:spec.biome
    });
  }
  const ruinY=Math.max(terrainHeight(10,10),terrainHeight(8,8))+1;
  [[8,0,8,'stone'],[8,1,8,'brick'],[8,2,8,'brick'],[12,0,8,'stone'],
   [12,1,8,'brick'],[12,2,8,'brick'],[9,2,8,'brick'],[10,2,8,'brick'],
   [11,2,8,'brick'],[8,0,11,'stone'],[12,0,11,'stone'],[10,0,11,'obsidian']]
    .forEach(v=>setRawBlock(v[0],ruinY+v[1],v[2],{type:v[3],ruin:true,natural:true}));
  if(gameFreeMode==='creative'){
    const ws=worldRules.WORLD_SCALE||1;
    const discoveries=[
      ['bp1',Math.round(-27*ws),Math.round(-9*ws),0x6f72ff,'숲의 설계도 조각'],
      ['c1',Math.round(32*ws),Math.round(-28*ws),0xffd65a,'사막의 색 결정'],
      ['bp2',Math.round(-5*ws),Math.round(-44*ws),0x6f72ff,'설원의 설계도 조각'],
      ['c2',Math.round(5*ws),Math.round(39*ws),0xff79a8,'습지의 색 결정'],
      ['bp3',Math.round(43*ws),Math.round(23*ws),0x6f72ff,'협곡의 설계도 조각']
    ];
    for(const [id,x,z,color,label] of discoveries)
      addCollectible(id,x,terrainHeight(x,z)+1.8,z,color,label);
  }
  freeHemi=scene.children.find(o=>o.isHemisphereLight)||null;
  freeSun=scene.children.find(o=>o.isDirectionalLight)||null;
}
function initFree(){
  const survival=gameFreeMode==='survival';
  clearCampMarker();survivalCamp={version:1,completed:[],dismissed:false,finished:false,baseline:null,prepared:false};
  modeTitle(survival?'생존 탐험':'크리에이티브 월드',
    survival?'나무 채집 → 제작 → 새로운 바이옴 탐험':'모든 건축 재료 · 비행 · 물질 실험');
  setVisible('freeHud',true);$('actionSave').classList.remove('hidden');
  $('actionAvatar')?.classList.toggle('hidden',mobileModeEnabled);
  $('actionView')?.classList.toggle('hidden',mobileModeEnabled);
  $('actionXray').classList.toggle('hidden',survival);
  cleanScene(0x9bd7ff);scene.fog=new THREE.Fog(0x9bd7ff,30,68);
  camera.rotation.order='YXZ';yaw=Math.PI;pitch=0;
  collectibles=[];collected=new Set();xray=false;freeVelocityY=0;onGround=true;freeFlying=false;
  jumpQueuedUntil=0;lastGroundedAt=-Infinity;overlapSeconds=0;mobileUtilityOpen=false;survivalInventoryTab='bag';
  inventoryOpen=false;furnaceOpen=false;lifePanelOpen=false;lifePanelMode='';lifePanelTargetKey='';lifeCreatureTarget=null;seatedFurniture=null;freeSimAccum=0;freeSimTick=0;mathLensMode=0;
  freeSaveDirty=false;freeSaveDueAt=0;freeStepHop=0;miningHeld=false;miningSource='';miningKey='';miningProgress=0;
  miningCrackOverlay=null;miningCrackKey='';freePlacementGhost=null;freePlacementGhostKey='';pendingPlayerStrikes=[];freeHitStopUntil=0;
  selectedCraftRecipeId=null;survivalCraftCategory='전체';craftingBusy=false;inventoryBatchDepth=0;resetMiningFeedback();
  discoveredResources=new Set();discoveredRecipeIds=new Set();unreadRecipeIds=new Set();
  footstepDistanceAcc=0;lastFootstepX=null;lastFootstepZ=null;ambientAudioClock=0;
  freeSelectedShapeKey=null;weather='clear';weatherTimer=18;critters=[];
  freeAvatarFacingRight=false;
  freeAvatarAction='';freeAvatarActionStartedAt=0;freeAvatarActionUntil=0;freeAvatarDefeated=false;freeAvatarReturnAt=0;freeViewBeforeDefeat=null;
  survivalBag={};survivalStage=0;survivalAdventureDone=new Set();survivalHome=null;trackedTarget=null;savedFreePosition=null;visitedBiomes=new Set();
  firstJourney={phase:'idle',plan:null};buildingWorks=[];projectGuide='';journeyUiAt=0;
  survivalStats=newSurvivalStats();survivalFinished=false;survivalExposure=0;survivalHealth=5;healthRegenClock=0;lastCreatureDamage=0;lastCreatureAttackAt=0;
  freeFluidKind='';lastEnvironmentDamage=0;survivalBreath=100;lastDrownDamage=0;freeFallPeakY=0;
  seenCreatureKinds=new Set();lastCreatureHintAt=0;creatureDefeats={};creatureForageAt={};tamedCreatures={};tamingProgress={};petSerial=0;survivalWorldTime=0;creatureSpawnClock=0;creatureSpawnSerial=0;nextEliteSpawnCheckAt=0;dayTime=.28;
  survivalTimeAcc=0;firstNightStarted=false;firstDuskWarned=false;nightShelterNotice=false;
  discoveredLandmarks=new Set();restoredLandmarks=new Set();unlockedTech=new Set();nearLandmarkPoi=null;
  selectedHotbarSlot=0;
  hotbarTypes=survival?['hand',null,null,null,null,null,null,null,null]:
    ['grass','dirt','stone','sand','log','planks','glass','door','water'];
  let previous=null,storedCreative=null;
  try{
    if(!survival){
      storedCreative=window.KidscadeStorage?.getJson('cubeArchitectWorldSaveV4_creative',null);
      if(!storedCreative)previous=window.KidscadeStorage?.getJson('cubeArchitectWorldSaveV3',null)||
        window.KidscadeStorage?.getJson('cubeArchitectWorldSaveV2',null);
    }
  }catch(_){}
  legacyWorld=!!(storedCreative?.legacyTerrain||previous);
  buildFreeWorld();if(gameFreeMode==='survival'){survivalEquipment={head:'',chest:'',legs:'',feet:'',shield:''};survivalDamageCarry=0}
  loadFreeWorld();prepareSurvivalCamp();
  const ground=getHighestSolidY(0,5,10);
  const spawn=savedFreePosition&&savedFreePosition.length===3?savedFreePosition:
    [0,ground+1+1.62,5];
  camera.position.set(
    THREE.MathUtils.clamp(spawn[0],-WORLD_HALF+1,WORLD_HALF-1),
    THREE.MathUtils.clamp(spawn[1],WORLD_MIN_Y+1.7,WORLD_MAX_Y+8),
    THREE.MathUtils.clamp(spawn[2],-WORLD_HALF+1,WORLD_HALF-1)
  );
  freePhysicsY=camera.position.y;freeFallPeakY=freePhysicsY;
  freeAvatarRoot=null;freeAvatarSignature='';freeAvatarSyncAt=0;
  freeHeldToolRoot=null;freeHeldToolKey='';freeHeldToolToken++;
  setFreeView('third',false);refreshFreeAvatar(true);
  applyRestoredLandmarksToLoadedWorld();
  rebuildAllWorldMeshes();
  buildHotbar();buildInventory();setupShapeWorkbench();buildFurnaceRecipes();
  $('actionXray').classList.remove('hidden');
  setupWeather();spawnCritters();updateCreatureHealthUi();updateFreeMission();
  $('actionSave').onclick=()=>{saveFreeWorld();toast('월드를 저장했어요.')};
  $('actionWorks').classList.toggle('hidden',mobileModeEnabled);$('actionWorks').onclick=()=>toggleBuildingWorks(true);
  $('mobileWorks').onclick=()=>toggleBuildingWorks(true);
  $('worksClose').onclick=()=>toggleBuildingWorks(false);$('worksCapture').onclick=captureBuildingWork;
  $('journeyStart').onclick=startFirstJourney;$('journeyHelp').onclick=helpFirstJourney;
  $('journeySkip').onclick=()=>{firstJourney.phase='skip';clearJourneyMarker();markFreeWorldDirty(300);updateFirstJourney()};
  document.querySelectorAll('[data-building-idea]').forEach(b=>b.onclick=()=>{
    projectGuide=b.dataset.buildingIdea;$('workName').value=projectGuide;toggleBuildingWorks(false);
    toast(projectGuide==='작은 집'?'바닥을 깔고 벽과 지붕을 만들어 보자.':projectGuide==='다리'?'양쪽 길을 이어 사람이 건널 수 있게 만들어 보자.':'문과 창문이 있는 나만의 비밀 기지를 만들어 보자.');
  });
  $('actionAvatar').onclick=openAvatarCustomizer;$('actionView').onclick=cycleFreeView;updateFreeViewButtons();
  $('actionXray').textContent='수학 렌즈';$('actionXray').onclick=toggleXray;
  $('blockInventory').classList.add('hidden');$('furnacePanel').classList.add('hidden');$('lifePanel')?.classList.add('hidden');
  $('mathLensBadge').classList.add('hidden');
  configureMobileMode('free');
  $('lockNotice').onclick=()=>{if(!inventoryOpen&&!furnaceOpen&&!lifePanelOpen){tutorialSignal('start-control');requestGamePointerLock()}};
  $('survivalReturn').onclick=emergencyReturn;
  if($('craftDiscoveryNotice'))$('craftDiscoveryNotice').onclick=()=>{survivalInventoryTab='craft';toggleInventory(true)};
  renderSurvivalSafety(null);
  $('inventoryClose').onclick=()=>toggleInventory(false);
  document.querySelectorAll('[data-bag-tab]').forEach(b=>b.onclick=()=>setSurvivalInventoryTab(b.dataset.bagTab));
  $('mobileEscape').onclick=()=>escapeFreeOverlap(true);
  $('actionEscape').onclick=()=>escapeFreeOverlap(true);
  $('actionMore').onclick=()=>{mobileUtilityOpen=!mobileUtilityOpen;updateSimpleSurvivalUi();$('actionMore').textContent=mobileUtilityOpen?'접기':'더보기'};
  $('furnaceClose').onclick=()=>toggleFurnace(false);
  if($('lifePanelClose'))$('lifePanelClose').onclick=()=>closeLifePanel();
  if($('trackingStop'))$('trackingStop').onclick=stopTrackedTarget;
  document.querySelectorAll('[data-inv-cat]').forEach(b=>b.onclick=()=>buildInventory(b.dataset.invCat));
  showTutorial('free');
}
function bagCount(type){return Math.max(0,Number(survivalBag[type])||0)}
function gearDef(type){return SURVIVAL_GEAR_DEFS[type]||null}
function survivalProtection(){
  return Math.min(.65,Object.values(survivalEquipment||{}).reduce((sum,type)=>sum+(gearDef(type)?.defense||0),0));
}
function survivalCombatAppearance(){
  if(gameFreeMode!=='survival')return null;
  return {
    head:survivalEquipment.head||'',chest:survivalEquipment.chest||'',legs:survivalEquipment.legs||'',
    feet:survivalEquipment.feet||'',shield:survivalEquipment.shield||'',
    weapon:HOTBAR_TOOL_TYPES.includes(selectedType)?selectedType:''
  };
}
function equippedGearLabel(slot){
  const type=survivalEquipment?.[slot]||'';
  return type?blockDef(type).name:'비어 있음';
}
function equipSurvivalGear(type,announce=true){
  const def=gearDef(type);if(!def||bagCount(type)<1)return false;
  survivalEquipment={...survivalEquipment,[def.slot]:type};
  survivalDamageCarry=Math.min(survivalDamageCarry,.99);
  if(announce)toast(blockDef(type).name+' 장착 · 방어 '+Math.round(survivalProtection()*100)+'%');
  updateSurvivalEquipmentUi();updateCreatureHealthUi();markFreeWorldDirty(250);return true;
}
function unequipSurvivalGear(slot){
  if(!survivalEquipment?.[slot])return;
  survivalEquipment={...survivalEquipment,[slot]:''};
  updateSurvivalEquipmentUi();updateCreatureHealthUi();markFreeWorldDirty(250);
}
function maybeEquipCraftedGear(type){
  const def=gearDef(type);if(!def)return false;
  const current=survivalEquipment?.[def.slot]||'',cur=gearDef(current);
  if(!current||def.tier>(cur?.tier||0)){equipSurvivalGear(type,false);return true}
  return false;
}
function updateSurvivalEquipmentUi(){
  const root=$('survivalEquipmentPanel');if(!root)return;
  root.classList.toggle('hidden',gameFreeMode!=='survival');
  const protection=Math.round(survivalProtection()*100);
  const value=$('survivalArmorValue');if(value)value.textContent='방어 '+protection+'%';
  root.querySelectorAll('[data-gear-slot]').forEach(button=>{
    const slot=button.dataset.gearSlot,type=survivalEquipment?.[slot]||'';
    button.classList.toggle('equipped',!!type);
    const name=button.querySelector('b'),sub=button.querySelector('small');
    if(name)name.textContent=type?blockDef(type).name:({head:'머리',chest:'몸통',legs:'다리',feet:'신발',shield:'방패'}[slot]||slot);
    if(sub)sub.textContent=type?'눌러서 벗기':'비어 있음';
    button.onclick=()=>{if(type){unequipSurvivalGear(slot);buildInventory('전체')}};
  });
  const hud=$('survivalArmor');if(hud){
    hud.classList.toggle('hidden',gameFreeMode!=='survival');
    hud.textContent='🛡 '+protection+'%';
    hud.title='장비 방어율 '+protection+'%';
  }
}
function hasWorkbench(){
  const x=Math.round(camera.position.x),z=Math.round(camera.position.z);
  for(let dx=-3;dx<=3;dx++)for(let dz=-3;dz<=3;dz++)
    for(let dy=-2;dy<=2;dy++)
      if(getBlock(x+dx,Math.floor(freePhysicsY-1.62)+dy,z+dz)?.type==='workbench')return true;
  return false;
}
function pulseSurvivalQuest(){
  const card=$('freeMission');if(!card)return;
  card.classList.remove('quest-complete');void card.offsetWidth;card.classList.add('quest-complete');
  setTimeout(()=>card.classList.remove('quest-complete'),760);
}
function survivalAdventureGoals(){return worldRules.GOALS.filter(g=>g.kind==='adventure')}
function survivalGoalDone(goal){
  return worldRules.goalProgress(goal,survivalStats)>=goal.need;
}
function syncSurvivalAdventureState(announce=false){
  const adventures=survivalAdventureGoals(),newly=[];
  for(const goal of adventures){
    if(survivalGoalDone(goal)&&!survivalAdventureDone.has(goal.id)){
      survivalAdventureDone.add(goal.id);newly.push(goal);
    }
  }
  // Keep the old numeric field only as a save/backward-compatibility summary.
  const completedAll=worldRules.GOALS.filter(survivalGoalDone).length;
  survivalStage=Math.max(0,Math.min(worldRules.GOALS.length-1,completedAll));
  const wasFinished=survivalFinished;
  survivalFinished=adventures.length>0&&adventures.every(g=>survivalAdventureDone.has(g.id));
  if(announce&&newly.length){
    const goal=newly[newly.length-1];
    toast('추천 모험 달성 · '+goal.title+(goal.rewardLabel?' · 보상: '+goal.rewardLabel:''));
    pulseSurvivalQuest();sfx('good');
  }
  if(announce&&!wasFinished&&survivalFinished){
    toast('추천 모험 도감 완성! 이제 하고 싶은 대로 계속 살아가면 돼요.');
    reportResult('free-survival',100,true);
  }
  return newly.length>0||(!wasFinished&&survivalFinished);
}
function advanceSurvival(){
  if(gameFreeMode!=='survival')return;
  const discovered=refreshRecipeDiscoveries(true);
  const progressed=syncSurvivalAdventureState(true);
  if(discovered.length&&!progressed)toast('새 제작법 '+discovered.length+'개 발견 · 가방에서 확인해 보세요.');
  if(progressed||discovered.length)saveFreeWorld();
  $('actionXray').classList.remove('hidden');
  configureMobileMode('free');updateFreeMission();
}
function putOnHotbar(type){
  if(gameFreeMode==='survival'){
    if(type==='hand'){selectedHotbarSlot=0;selectedType='hand';buildHotbar();return}
    const existing=hotbarTypes.indexOf(type);
    if(existing>=1)selectedHotbarSlot=existing;
    else{
      const vacant=hotbarTypes.findIndex((item,i)=>i>0&&!item);
      if(vacant>=0)selectedHotbarSlot=vacant;
      else if(selectedHotbarSlot===0)selectedHotbarSlot=1;
      hotbarTypes[selectedHotbarSlot]=type;
    }
  }else hotbarTypes[selectedHotbarSlot]=type;
  selectedType=type;buildHotbar();updateFreeMission();
}
function addToBag(type,n=1){
  if(gameFreeMode!=='survival'||!type)return;
  const first=bagCount(type)===0;
  survivalBag[type]=bagCount(type)+n;
  if(first){discoveredResources.add(type);refreshRecipeDiscoveries(true)}
  if(first&&(PLACEABLE_TYPES.includes(type)||HOTBAR_TOOL_TYPES.includes(type))&&!hotbarTypes.includes(type)){
    const empty=hotbarTypes.findIndex((item,i)=>i>0&&!item);
    if(empty>=0)hotbarTypes[empty]=type;
  }
  advanceSurvival();
  if(inventoryBatchDepth===0){
    buildHotbar();
    if(inventoryOpen)buildInventory();
  }
  tutorialRefreshProgress();
}
function consumeBag(type,n=1){
  if(bagCount(type)<n)return false;
  survivalBag[type]-=n;
  if(inventoryOpen&&inventoryBatchDepth===0)buildInventory();
  tutorialRefreshProgress();return true;
}
function consumeFood(type){
  const food=CONSUMABLE_TYPES[type];
  if(!food||bagCount(type)<1)return false;
  if(survivalHealth>=5){toast('지금은 생명이 가득해요. 필요할 때 먹어 보세요.');return false}
  consumeBag(type,1);
  survivalHealth=Math.min(5,survivalHealth+food.heal);
  healthRegenClock=0;trackSurvival('eat',type,1);updateCreatureHealthUi();
  buildHotbar();if(inventoryOpen)buildInventory('전체');markFreeWorldDirty(350);
  toast(food.label+'을(를) 먹고 생명 '+food.heal+'칸을 회복했어요.');sfx('good');return true;
}
function recipeDiscoveryClues(recipe){
  const keys=Object.keys(recipe.needs||{}),specific=keys.filter(k=>!['sticks','planks'].includes(k));
  return specific.length?specific:keys;
}
function pulseCraftDiscovery(){
  const el=$('craftDiscoveryNotice');if(!el)return;
  el.classList.remove('discovery-pop');void el.offsetWidth;el.classList.add('discovery-pop');
  setTimeout(()=>el.classList.remove('discovery-pop'),720);
}
function updateCraftDiscoveryHud(){
  const unread=[...unreadRecipeIds].filter(id=>discoveredRecipeIds.has(id)).length;
  const notice=$('craftDiscoveryNotice');
  if(notice){
    notice.classList.toggle('hidden',gameFreeMode!=='survival'||unread===0);
    notice.textContent=unread?('새 제작법 '+unread+' · E로 확인'):'';
  }
  const summary=$('craftDiscoverySummary');
  if(summary)summary.textContent='발견한 제작법 '+discoveredRecipeIds.size+' / '+worldRules.RECIPES.length+
    (unread?' · NEW '+unread:'');
}
function refreshRecipeDiscoveries(markUnread=true){
  if(gameFreeMode!=='survival')return [];
  const added=[];
  for(const recipe of worldRules.RECIPES){
    if(!recipeUnlocked(recipe.id)||discoveredRecipeIds.has(recipe.id))continue;
    const clues=recipeDiscoveryClues(recipe);
    if(!clues.some(type=>discoveredResources.has(type)||bagCount(type)>0))continue;
    discoveredRecipeIds.add(recipe.id);if(markUnread)unreadRecipeIds.add(recipe.id);added.push(recipe);
  }
  if(added.length&&markUnread){pulseCraftDiscovery();markFreeWorldDirty(700)}
  updateCraftDiscoveryHud();return added;
}
function markRecipeSeen(id){
  if(!id||!unreadRecipeIds.has(id))return;
  unreadRecipeIds.delete(id);updateCraftDiscoveryHud();markFreeWorldDirty(500);
}
function recipePossible(recipe){
  return (!recipe.bench||hasWorkbench())&&
    Object.entries(recipe.needs).every(([item,amount])=>bagCount(item)>=amount);
}
function recipeCategory(recipe){
  if(['workbench','woodPick','stonePick','ironPick','woodSword','stoneSword','ironSword','furnace',...SURVIVAL_GEAR_TYPES].includes(recipe.id))return '도구';
  const type=Object.keys(recipe.gives||{})[0],cat=blockDef(type).category;
  if(['건축','기능','도형'].includes(cat))return '건축';
  return '재료';
}
function visibleSurvivalRecipes(){
  const biomeRecipes={flowerDye:'flowers',reedMat:'marsh',sandstone:'desert',
    snowBrick:'snow',cactusDye:'desert'};
  return worldRules.RECIPES.filter(r=>(!campActive()||['planks','sticks','workbench','woodPick'].includes(r.id))&&discoveredRecipeIds.has(r.id)&&recipeUnlocked(r.id)&&
    (!['workbench','woodPick','stonePick','ironPick','woodSword','stoneSword','ironSword',...SURVIVAL_GEAR_TYPES].includes(r.id)||!bagCount(r.id))&&
    (!biomeRecipes[r.id]||visitedBiomes.has(biomeRecipes[r.id])||
      Object.keys(r.needs).some(item=>bagCount(item)>0)))
    .sort((a,b)=>Number(recipePossible(b))-Number(recipePossible(a))||a.stage-b.stage);
}
function renderCraftTabs(recipes){
  const root=$('survivalCraftTabs');if(!root)return;
  root.innerHTML='';
  for(const cat of ['전체','도구','건축','재료']){
    const count=cat==='전체'?recipes.length:recipes.filter(r=>recipeCategory(r)===cat).length;
    if(cat!=='전체'&&!count)continue;
    const b=document.createElement('button');b.type='button';b.className=survivalCraftCategory===cat?'active':'';
    b.textContent=cat+(count?' '+count:'');
    b.onclick=()=>{survivalCraftCategory=cat;selectedCraftRecipeId=null;buildInventory('전체')};
    root.appendChild(b);
  }
}
function craftNeedHint(recipe){
  if(recipe.bench&&!hasWorkbench())return '제작대 가까이로 가 보자.';
  const missing=Object.entries(recipe.needs).find(([type,n])=>bagCount(type)<n);
  if(!missing)return '다시 한번 만들어 보자.';
  const [type,n]=missing,amount=n-bagCount(type);
  const hints={log:'나무를 캐 보자.',planks:'원목으로 판자를 만들어 보자.',sticks:'판자로 막대를 만들어 보자.',stone:'곡괭이로 돌을 캐 보자.',glass:'화로에 모래를 넣어 보자.',ironBlock:'화로에 철광석을 넣어 보자.'};
  return blockDef(type).name+' '+amount+'개가 더 필요해. '+(hints[type]||'주변을 탐험해 보자.');
}
function showCraftSource(recipe){
  const missing=Object.entries(recipe.needs).find(([type,n])=>bagCount(type)<n);
  if(recipe.bench&&!hasWorkbench()){
    const p=campNearest(['workbench']);if(p){toggleInventory(false);showJourneyMarker(p);toast('노란 테두리의 제작대로 가 보자.')}return;
  }
  if(!missing)return;
  const type=missing[0],sub=worldRules.RECIPES.find(r=>r.id!==recipe.id&&r.gives[type]);
  if(sub&&visibleSurvivalRecipes().some(r=>r.id===sub.id)){survivalCraftCategory='전체';selectedCraftRecipeId=sub.id;buildInventory();return}
  const p=campNearest(type==='log'?['log','pineLog']:[type]);
  if(p){toggleInventory(false);showJourneyMarker(p);toast('노란 테두리에서 '+blockDef(type).name+'을 구해 보자.')}
}
function renderCraftDetail(recipe){
  const root=$('survivalCraftDetail');if(!root)return;
  root.classList.remove('crafting');
  if(!recipe){
    root.innerHTML='<div class="craft-detail-empty">제작법을 선택하면 필요한 재료와 결과를 여기에서 볼 수 있어요.</div>';return;
  }
  const [resultType,resultCount]=Object.entries(recipe.gives)[0],result=blockDef(resultType);
  const isNew=unreadRecipeIds.has(recipe.id);
  const hex='#'+(result.color||0xd9e2ec).toString(16).padStart(6,'0');
  const ingredients=Object.entries(recipe.needs).map(([type,need])=>{
    const d=blockDef(type),have=bagCount(type),ready=have>=need,ih='#'+(d.color||0xdddddd).toString(16).padStart(6,'0');
    return '<div class="craft-ingredient '+(ready?'ready':'')+'"><i style="--ing-swatch:'+ih+'">'+(d.icon||'▣')+
      '</i><b>'+d.name+'</b><span>'+have+' / '+need+'</span></div>';
  }).join('');
  const possible=recipePossible(recipe),benchReady=!recipe.bench||hasWorkbench();
  root.innerHTML='<div class="craft-result"><div class="craft-result-icon" style="--craft-swatch:'+hex+'">'+(result.icon||'▣')+
    '</div><div class="craft-result-copy"><b>'+recipe.name+(isNew?'<span class="craft-new-chip">NEW</span>':'')+
    '</b><small>'+result.name+' '+resultCount+'개가 가방에 들어갑니다.</small></div></div>'+
    '<div class="craft-ingredients">'+ingredients+'</div>'+
    '<div class="craft-bench-note">'+(recipe.bench?(benchReady?'✓ 제작대 가까이에 있어요':'제작대 가까이에서 만들 수 있어요.'):'여기서 바로 만들 수 있어요')+'</div>'+
    '<button id="craftSelectedButton" type="button" '+(possible?'':'disabled')+'>'+(possible?'만들기':'재료를 더 모아야 해요')+'</button>';
  const button=$('craftSelectedButton');if(button)button.onclick=()=>craftSurvival(recipe);
  if(!possible){const help=document.createElement('button');help.type='button';help.className='craft-help';help.textContent='어디서 구할까?';help.onclick=()=>{toast(craftNeedHint(recipe));showCraftSource(recipe)};root.appendChild(help)}
}
function craftSurvival(recipe){
  if(craftingBusy)return;
  markRecipeSeen(recipe.id);
  if(gameFreeMode!=='survival'||!recipePossible(recipe)){
    toast(craftNeedHint(recipe));return;
  }
  craftingBusy=true;
  const detail=$('survivalCraftDetail'),button=$('craftSelectedButton');
  detail?.classList.add('crafting');if(button){button.disabled=true;button.textContent='제작 중…'}
  sfx('mine');
  setTimeout(()=>{
    inventoryBatchDepth++;
    try{
      for(const [type,amount] of Object.entries(recipe.needs))consumeBag(type,amount);
      for(const [type,amount] of Object.entries(recipe.gives))addToBag(type,amount);
    }finally{inventoryBatchDepth=Math.max(0,inventoryBatchDepth-1)}
    if(recipe.id==='flowerDye'){$('facePaintColor').value='#e75aab';facePaintColor='#e75aab'}
    if(recipe.id==='cactusDye'){$('facePaintColor').value='#67a74a';facePaintColor='#67a74a'}
    trackSurvival('craft',recipe.id);
    if(HOTBAR_TOOL_TYPES.includes(recipe.id))putOnHotbar(recipe.id);
    const autoEquipped=maybeEquipCraftedGear(recipe.id);
    craftingBusy=false;buildHotbar();buildInventory('전체');updateSurvivalEquipmentUi();markFreeWorldDirty(450);
    toast(recipe.name+' 제작 완료!'+(HOTBAR_TOOL_TYPES.includes(recipe.id)?' 아래 물건 칸에서 바로 쓸 수 있어요.':
      autoEquipped?' 더 좋은 장비라서 바로 착용했어요.':
      recipe.id.endsWith('Dye')?' 새로운 색을 면 색칠에 선택했어요.':''));
    sfx('good');
  },420);
}
function blockButtonMarkup(type,index){
  const d=blockDef(type||'hand'),hex='#'+(d.color||0xffffff).toString(16).padStart(6,'0');
  const name=!type?'빈 칸':type==='cuboid'?('직육면체 '+currentCuboidSpec.dims.join('×')):d.name;
  const count=gameFreeMode==='survival'&&type&&type!=='hand'?
    '<small class="hot-count">'+bagCount(type)+'</small>':'';
  return '<span>'+(index||'')+'</span><i style="--swatch:'+hex+'">'+(type?d.icon||'':'')+'</i><em>'+name+'</em>'+count;
}
function buildHotbar(){
  const h=$('hotbar');h.innerHTML='';
  hotbarTypes.forEach((type,i)=>{
    const b=document.createElement('button');
    b.className='hot-slot'+(i===selectedHotbarSlot?' active':'');
    b.classList.toggle('empty-slot',!type);
    b.innerHTML=blockButtonMarkup(type,i+1);b.title=type?blockDef(type).name:'빈 칸';
    b.onclick=()=>{selectedHotbarSlot=i;selectedType=hotbarTypes[i]||'hand';buildHotbar();updateFreeMission()};
    h.appendChild(b);
  });
  selectedType=hotbarTypes[selectedHotbarSlot]||'hand';
}
function buildInventory(category='전체'){
  const grid=$('inventoryGrid');if(!grid)return;grid.innerHTML='';
  const survival=gameFreeMode==='survival';
  $('blockInventory').classList.toggle('survival-inventory',survival);
  $('simpleBagTabs')?.classList.toggle('hidden',!survival);
  setSurvivalInventoryTab(survivalInventoryTab);
  $('inventoryTitle').textContent=survival?'가방 · 제작':'건축 인벤토리';
  $('inventorySubtitle').textContent=survival?'지금 얻은 재료와 만들 수 있는 물건만 보여요.':
    '선택한 재료가 현재 핫바 칸에 들어갑니다.';
  $('survivalCraftPanel').classList.toggle('hidden',!survival);
  $('survivalBagHeader')?.classList.toggle('hidden',!survival);
  $('shapeWorkbench').classList.toggle('hidden',survival?
    campActive()||!hasWorkbench():!(category==='도형'||category==='전체'));
  $('inventoryNote').textContent=survival?
    '제작대를 설치하면 도형과 장비 제작이 열려요. 방어구·방패는 가방에서 눌러 장착하고, 검·곡괭이는 핫바에서 사용해요.':
    '물·모래·불과 식물은 서로 다른 물리·화학적 성질을 갖고 있어요.';
  if(survival){
    const resources=Object.entries(survivalBag).filter(([type,n])=>n>0)
      .sort((a,b)=>a[0].localeCompare(b[0]));
    for(const [type,n] of resources){
      const d=blockDef(type),b=document.createElement('button');
      b.className='inventory-item';const hex='#'+(d.color||0xffffff).toString(16).padStart(6,'0');
      const edible=!!CONSUMABLE_TYPES[type],gear=gearDef(type),equipped=gear&&survivalEquipment?.[gear.slot]===type;
      b.classList.toggle('equipped-gear',!!equipped);
      b.innerHTML='<i style="--swatch:'+hex+'">'+(d.icon||'▣')+'</i><b>'+d.name+'</b><small>보유 '+n+'개'+
        (edible?' · 눌러서 먹기':gear?(equipped?' · 장착 중':' · 눌러서 장착'):'')+'</small>';
      if(edible)b.onclick=()=>consumeFood(type);
      else if(gear)b.onclick=()=>{equipSurvivalGear(type);buildInventory('전체')};
      else if(PLACEABLE_TYPES.includes(type)||HOTBAR_TOOL_TYPES.includes(type)||FARM_PLANT_TYPES.includes(type))b.onclick=()=>{putOnHotbar(type);toast(d.name+'을(를) 핫바에 넣었어요.')};
      else b.disabled=true;
      grid.appendChild(b);
    }
    if(!resources.length)grid.textContent='가방이 비어 있어요. 먼저 주변의 나무를 채집해 보세요.';
    updateSurvivalEquipmentUi();
    const list=$('survivalCraftList');list.innerHTML='';
    const visible=visibleSurvivalRecipes();updateCraftDiscoveryHud();
    const discoverySummary=$('craftDiscoverySummary');
    if(discoverySummary)discoverySummary.textContent='발견한 제작법 '+discoveredRecipeIds.size+' / '+worldRules.RECIPES.length+
      (unreadRecipeIds.size?' · NEW '+unreadRecipeIds.size:'');
    if(!['전체','도구','건축','재료'].includes(survivalCraftCategory))survivalCraftCategory='전체';
    renderCraftTabs(visible);
    const filtered=survivalCraftCategory==='전체'?visible:visible.filter(r=>recipeCategory(r)===survivalCraftCategory);
    if(!filtered.some(r=>r.id===selectedCraftRecipeId))selectedCraftRecipeId=(filtered.find(recipePossible)||filtered[0])?.id||null;
    for(const recipe of filtered){
      const b=document.createElement('button'),possible=recipePossible(recipe);
      const [resultType]=Object.keys(recipe.gives),result=blockDef(resultType),hex='#'+(result.color||0xdbe4ef).toString(16).padStart(6,'0');
      const isNew=unreadRecipeIds.has(recipe.id);
      b.className='survival-recipe'+(possible?' can-craft':'')+(recipe.id===selectedCraftRecipeId?' selected':'')+(isNew?' new-recipe':'');
      b.dataset.recipeId=recipe.id;
      const costs=Object.entries(recipe.needs).map(([type,n])=>blockDef(type).name+' '+bagCount(type)+'/'+n).join(' · ');
      b.innerHTML='<span class="recipe-icon" style="--recipe-swatch:'+hex+'">'+(result.icon||'▣')+'</span>'+
        '<span class="recipe-copy"><b>'+recipe.name+'</b><small>'+costs+(recipe.bench?' · 제작대':'')+'</small></span>'+
        '<span class="recipe-state">'+(isNew?'NEW':possible?'제작 가능':'재료 부족')+'</span>';
      b.onclick=()=>{markRecipeSeen(recipe.id);selectedCraftRecipeId=recipe.id;buildInventory('전체')};list.appendChild(b);
    }
    renderCraftDetail(filtered.find(r=>r.id===selectedCraftRecipeId)||null);
    $('survivalCraftHint').textContent=!visible.length?
      '새 재료를 처음 얻으면 관련 제작법이 이곳에 발견됩니다.':
      hasWorkbench()?'제작대 근처예요. 새 재료를 모으면 만들 수 있는 것이 더 늘어나요.':
      '새 재료를 모아 제작법을 발견하세요. 제작대가 필요한 물건은 가까이에서 만들 수 있어요.';
    const techLabels=poiRules.POIS.filter(p=>unlockedTech.has(p.tech.id)).map(p=>p.tech.label);
    $('survivalTechs').textContent=techLabels.length?
      '설계도 기술 · '+techLabels.join(' · '):
      '설계도 기술 · 랜드마크 폐허를 복원하면 고급 건축이 열려요.';
    tutorialRefreshProgress();return;
  }
  document.querySelectorAll('[data-inv-cat]').forEach(b=>
    b.classList.toggle('active',b.dataset.invCat===category));
  PLACEABLE_TYPES.filter(type=>category==='전체'||blockDef(type).category===category).forEach(type=>{
    const d=blockDef(type),b=document.createElement('button');
    b.className='inventory-item';
    b.innerHTML='<i style="--swatch:#'+(d.color||0xffffff).toString(16).padStart(6,'0')+'">'+(d.icon||'')+'</i><b>'+d.name+'</b><small>'+d.category+'</small>';
    b.onclick=()=>{hotbarTypes[selectedHotbarSlot]=type;selectedType=type;buildHotbar();
      toast(d.name+'을(를) '+(selectedHotbarSlot+1)+'번 칸에 넣었어요.')};
    grid.appendChild(b);
  });
}
function resumeFreePointerLock(){
  if(mobileModeEnabled||mode!=='free'||typeof canvas.requestPointerLock!=='function')return;
  try{
    const p=canvas.requestPointerLock();
    if(p&&typeof p.catch==='function')p.catch(()=>{$('lockNotice')?.classList.remove('hidden')});
  }catch(_){$('lockNotice')?.classList.remove('hidden')}
}
function toggleInventory(force){
  if(force!==false&&worksOpen)toggleBuildingWorks(false);
  if(force!==false&&lifePanelOpen)closeLifePanel();
  const wasOpen=inventoryOpen;
  inventoryOpen=typeof force==='boolean'?force:!inventoryOpen;
  if(inventoryOpen){
    stopMining();
    if(furnaceOpen)toggleFurnace(false);
  }
  $('blockInventory').classList.toggle('hidden',!inventoryOpen);
  if(inventoryOpen){
    if(campActive()&&campStep()?.action==='craft')survivalInventoryTab='craft';
    if(document.pointerLockElement===canvas)document.exitPointerLock();
    buildInventory('전체');tutorialSignal('inventory-open');
  }
  $('lockNotice').classList.toggle('hidden',inventoryOpen||furnaceOpen||document.pointerLockElement===canvas);
  if(wasOpen&&!inventoryOpen&&!mobileModeEnabled&&mode==='free')resumeFreePointerLock();
}
function nearestUnrestoredLandmark(x,z){
  return poiRules.POIS.filter(p=>!restoredLandmarks.has(p.id))
    .map(p=>({...p,distance:Math.round(Math.hypot(x-p.center[0],z-p.center[1]))}))
    .sort((a,b)=>a.distance-b.distance)[0]||null;
}
function updateFreeMission(){
  updateCraftDiscoveryHud();
  const bx=Math.round(camera.position.x),bz=Math.round(camera.position.z);
  const region=worldRules.region(bx,bz),biome=worldRules.BIOMES[region];
  $('biomeState').textContent=biome.name;
  if(!visitedBiomes.has(region)){
    const alreadyExplored=visitedBiomes.size>0;
    visitedBiomes.add(region);ambientAudioClock=0;refreshBookshelfMeshes();
    if(gameFreeMode==='survival')trackSurvival('biome',region);
    if(alreadyExplored){
      const hint=worldRules.BIOME_REWARDS[region];
      toast('새로운 바이옴 발견 · '+biome.name+'! '+hint.hint);saveFreeWorld();
    }
  }
  nearLandmarkPoi=null;
  if(gameFreeMode==='survival'){
    const close=poiRules.poiAt(bx,bz,46);
    if(close&&close.distance<=close.radius+9){
      if(!discoveredLandmarks.has(close.id)){
        discoveredLandmarks.add(close.id);
        trackSurvival('find','landmark:'+close.id);
        toast('랜드마크 발견 · '+close.name+'! 원하면 바로 안쪽을 탐험할 수 있어요.');
        saveFreeWorld();
      }
      if(close.distance<=close.radius+3)nearLandmarkPoi=close;
    }
  }
  const canRestore=gameFreeMode==='survival'&&nearLandmarkPoi&&!restoredLandmarks.has(nearLandmarkPoi.id);
  $('actionCheck').classList.toggle('hidden',!canRestore);
  if(canRestore){
    $('actionCheck').textContent='던전 입장';
    $('actionCheck').disabled=false;
    $('actionCheck').onclick=()=>openLandmarkDungeon(nearLandmarkPoi);
  }
  if(mobileModeEnabled){
    $('mobileCheck').classList.toggle('hidden',!canRestore);
    $('mobileCheck').textContent=canRestore?'던전':'검사';
  }
  const chosen=blockDef(selectedType||'hand').name;
  if(gameFreeMode==='survival'){
    const adventures=survivalAdventureGoals();
    const done=adventures.filter(g=>survivalAdventureDone.has(g.id)||survivalGoalDone(g)).length;
    const pending=adventures.filter(g=>!survivalAdventureDone.has(g.id)&&!survivalGoalDone(g));
    $('freeQuestTitle').textContent=survivalFinished?'자유 생존 · 추천 모험 완료':'자유 생존 · 원하는 대로';
    $('freeQuestDescription').textContent=survivalFinished?
      '추천 모험은 모두 해봤어요. 이제 집을 짓거나 탐험하거나 원하는 놀이를 계속해 보세요.':
      (pending.length?'추천: '+pending.slice(0,3).map(g=>g.title).join(' · ')+' · 안 해도 괜찮아요.':
      '집을 짓거나 멀리 떠나거나 원하는 것을 만들어 보세요.');
    $('adventureCount').textContent='추천 '+done+'/'+adventures.length;
    $('adventureBar').style.width=(adventures.length?Math.round(done/adventures.length*100):0)+'%';
    $('freeState').textContent='생존 · '+(freeFluidKind==='water'?'수영 · ':freeFluidKind==='lava'?'용암 · ':'')+chosen;
    $('freeHint').textContent=canRestore?'Q · 랜드마크 던전 입장':
      'E 가방·제작 · F 생물 상호작용 · V 시점 · P 면 색칠 · X 수학 렌즈';
  }else{
    const total=5,done=collected.size;
    $('freeQuestTitle').textContent='월드 탐험 기록';
    $('freeQuestDescription').textContent='서로 다른 바이옴에서 설계도 조각과 색 결정을 찾아보세요.';
    $('adventureCount').textContent=done+'/'+total;
    $('adventureBar').style.width=(done/total*100)+'%';
    $('freeState').textContent=(freeFlying?'비행':freeFluidKind==='water'?'수영':freeFluidKind==='lava'?'용암':'걷기')+' · '+chosen;
    $('freeHint').textContent=nearRuin?'Q 폐허 설계도 · E 가방 · F 비행 · V 시점':
      'E 가방 · F 비행 · V 시점 · R 복사 · P 색칠 · X 수학 렌즈';
  }
  if(mobileModeEnabled&&gameFreeMode==='survival')$('freeHint').textContent=canRestore?'가까운 랜드마크에서 행동 버튼을 눌러 들어갈 수 있어요.':'가운데 +로 바라보고 행동 버튼을 눌러 보세요.';
  renderExplorationHint();updateTrackingGuide();
  if(campActive())renderCampQuest(campStep());
}
function nearbyWorldInteractables(eye,max=6.5){
  const reach=max+1.25,ey=eye.y;
  return worldInteractables.filter(mesh=>{
    const u=mesh.userData;
    if(u?.worldChunkMesh){
      const dx=eye.x<u.minX?u.minX-eye.x:eye.x>u.maxX?eye.x-u.maxX:0;
      const dz=eye.z<u.minZ?u.minZ-eye.z:eye.z>u.maxZ?eye.z-u.maxZ:0;
      return dx<=reach&&dz<=reach;
    }
    return u?.worldBlock&&Math.abs((u.gx??9999)-eye.x)<=reach&&
      Math.abs((u.gz??9999)-eye.z)<=reach&&Math.abs((u.gy??9999)-ey)<=reach+2;
  });
}
function freeCenterHit(max=6.5){
  const {eye,maxFromPlayer}=setFreeInteractionRay(max);
  const hits=raycaster.intersectObjects(nearbyWorldInteractables(eye,maxFromPlayer),false);
  const hit=hits.find(h=>withinPlayerReach(h,eye,maxFromPlayer))||null;
  return hit&&voxelRuntime?.resolveHit?voxelRuntime.resolveHit(hit):hit;
}

function pickTier(type=selectedType){
  return type==='ironPick'?3:type==='stonePick'?2:type==='woodPick'?1:0;
}
function miningSeconds(data){
  let type=data?.type||'stone';
  if(type==='doorTop')type='door';
  if(type==='cuboidPart')type='cuboid';
  const tier=pickTier();
  if(['flower','reed','sapling','fire','leaves','pineLeaves'].includes(type))return .2;
  if(['dirt','grass','sand','redSand','snow','gravel','clay','cactus'].includes(type))return .4;
  if(['log','pineLog'].includes(type))return .76;
  if(['planks','door','roof','stairs','slab','workbench','windowFrame','reedMat'].includes(type))return .54;
  if(type==='ironOre')return tier>=3?.62:tier>=2?1.02:1.28;
  if(type==='obsidian')return tier>=3?1.35:2.1;
  if(['stone','smoothStone','brick','furnace','sandstone','snowBrick','ironBlock'].includes(type))
    return tier>=3?.42:tier>=2?.62:tier>=1?.88:1.22;
  return tier?.38:.52;
}
function clearMiningCrack(){
  if(miningCrackOverlay?.parent)miningCrackOverlay.parent.remove(miningCrackOverlay);
  miningCrackOverlay=null;miningCrackKey='';
}
function resetMiningFeedback(){
  const ui=$('miningProgress'),cross=$('crosshair');
  if(ui){ui.classList.add('hidden');ui.querySelector('i').style.width='0%'}
  cross?.classList.remove('mining','mining-stage-2','mining-stage-3');clearMiningCrack();
}
function updateMiningCrack(target,p){
  if(!scene||!target?.u)return;
  if(!miningCrackOverlay||miningCrackKey!==target.key){
    clearMiningCrack();miningCrackKey=target.key;
    const group=new THREE.Group(),edge=new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1.012,1.012,1.012)),
      new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.28,depthTest:true})
    );
    group.add(edge);
    const crackMat=new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.18,depthTest:true});
    const pts=[
      [-.5,.5,.506],[0,.08,.506],[.5,.34,.506],
      [-.5,-.25,.506],[-.05,.08,.506],[.32,-.5,.506],
      [.506,.5,-.38],[.506,.08,.02],[.506,.42,.5]
    ].map(v=>new THREE.Vector3(...v));
    const cracks=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts),crackMat);
    group.add(cracks);group.userData={edge,cracks};
    group.position.set(target.u.gx,target.u.gy+.5,target.u.gz);scene.add(group);miningCrackOverlay=group;
  }
  const stage=p>=.68?0xff8a6b:p>=.34?0xf6c85f:0xffffff;
  miningCrackOverlay.userData.edge.material.color.setHex(stage);
  miningCrackOverlay.userData.cracks.material.color.setHex(stage);
  miningCrackOverlay.userData.edge.material.opacity=.28+p*.42;
  miningCrackOverlay.userData.cracks.material.opacity=.18+p*.68;
  miningCrackOverlay.scale.setScalar(1+Math.sin(performance.now()*.03)*.004*p);
}
function updateMiningFeedback(target,p){
  const ui=$('miningProgress'),cross=$('crosshair');if(!ui)return;
  const pct=Math.round(THREE.MathUtils.clamp(p,0,1)*100);
  ui.classList.remove('hidden');ui.querySelector('i').style.width=pct+'%';
  ui.querySelector('span').textContent=blockDef(target.data).name+' 채집 '+pct+'%';
  cross?.classList.add('mining');
  cross?.classList.toggle('mining-stage-2',p>=.34);
  cross?.classList.toggle('mining-stage-3',p>=.68);
  updateMiningCrack(target,p);
}
function miningTargetData(hit){
  if(!hit?.object?.userData?.worldBlock)return null;
  const u=hit.object.userData,data=getBlock(u.gx,u.gy,u.gz);if(!data)return null;
  return {u,data,key:u.worldKey||worldKey(u.gx,u.gy,u.gz)};
}
function canMineTarget(hit,notify=true){
  const target=miningTargetData(hit);if(!target)return null;
  const {u,data}=target;
  if(blockDef(data).unbreakable){if(notify)toast('기반암은 부술 수 없어요.');return null}
  if(data.protectedPoi){
    const poi=poiRules.poiById(data.landmarkPoi);
    if(notify)toast((poi?.name||'랜드마크')+'은 탐험 유적이에요. 던전과 설계실을 이용하세요.');
    return null;
  }
  let type=data.type==='doorTop'?'door':data.type;
  if(type==='cuboidPart'){
    const anchor=getBlock(...(data.anchor||[u.gx,u.gy,u.gz]));type=anchor?.type||type;
  }
  const required=worldRules.toolNeeded(type);
  if(gameFreeMode==='survival'&&required&&pickTier(selectedType)<pickTier(required)){
    if(notify){
      const own=HOTBAR_TOOL_TYPES.some(tool=>bagCount(tool)>0&&pickTier(tool)>=pickTier(required));
      toast(own?blockDef(required).name+' 이상을 핫바에서 선택해 주세요.':
        blockDef(required).name+' 이상을 만들어야 '+blockDef(type).name+'을(를) 캘 수 있어요.');
    }
    return null;
  }
  return target;
}
function startMining(source='mouse'){
  if(mode!=='free'||inventoryOpen||furnaceOpen)return;
  if(gameFreeMode!=='survival'){
    const hit=freeCenterHit(6);if(hit)breakFreeBlock(hit);return;
  }
  const hit=freeCenterHit(6);if(!canMineTarget(hit,true))return;
  miningHeld=true;miningSource=source;miningKey='';miningProgress=0;miningBeat=.25;
  if(source==='mobile')$('mobileBreak')?.classList.add('holding');
}
function stopMining(){
  miningHeld=false;miningSource='';miningKey='';miningProgress=0;miningDurationNow=0;miningBeat=.25;
  $('mobileBreak')?.classList.remove('holding');resetMiningFeedback();
}
function spawnPickupVisual(type,x,y,z,count=1){
  if(!scene||!type)return;
  const targetScene=scene,d=blockDef(type),mat=new THREE.MeshStandardMaterial({
    color:d.color||0xf0d36b,roughness:.58,metalness:.02,emissive:d.emissive?(d.color||0):0x000000,emissiveIntensity:d.emissive?.2:0
  });
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(.24,.24,.24),mat);
  mesh.position.set(x,y+.62,z);mesh.rotation.set(.35,.3,0);mesh.renderOrder=7;targetScene.add(mesh);
  const start=mesh.position.clone(),started=performance.now(),duration=430;
  const tick=now=>{
    if(scene!==targetScene||!mesh.parent){mesh.parent?.remove(mesh);return}
    const p=Math.min(1,(now-started)/duration),ease=p*p*(3-2*p);
    const target=new THREE.Vector3(camera.position.x,camera.position.y-.2,camera.position.z);
    mesh.position.lerpVectors(start,target,ease);mesh.position.y+=Math.sin(p*Math.PI)*.42;
    mesh.rotation.x+=.16;mesh.rotation.y+=.22;mesh.scale.setScalar(Math.max(.12,1-p*.7));
    if(p<1)requestAnimationFrame(tick);
    else{mesh.parent?.remove(mesh);mat.dispose();mesh.geometry.dispose();sfx('pickup')}
  };
  requestAnimationFrame(tick);
}
function spawnCombatHitParticles(root,power=1){
  if(!scene||!root)return;
  const targetScene=scene,group=new THREE.Group(),pieces=[];
  group.position.copy(root.position);group.position.y+=.78;
  const mat=new THREE.MeshBasicMaterial({color:power>=3?0xffd166:0xffffff,transparent:true,opacity:.9});
  for(let i=0;i<6;i++){
    const shard=new THREE.Mesh(new THREE.BoxGeometry(.09,.09,.09),mat);
    const a=i*Math.PI/3+(i%2)*.2;shard.userData.vel=new THREE.Vector3(Math.cos(a)*(1.2+power*.12),.55+Math.random()*.9,Math.sin(a)*(1.2+power*.12));
    group.add(shard);pieces.push(shard);
  }
  targetScene.add(group);const started=performance.now();
  const tick=now=>{
    const dt=.016,p=Math.min(1,(now-started)/220);
    for(const shard of pieces){shard.userData.vel.y-=4.5*dt;shard.position.addScaledVector(shard.userData.vel,dt);shard.scale.setScalar(1-p*.75)}
    if(scene===targetScene&&p<1)requestAnimationFrame(tick);
    else{group.parent?.remove(group);mat.dispose();pieces.forEach(v=>v.geometry.dispose())}
  };
  requestAnimationFrame(tick);
}
function spawnBreakParticles(x,y,z,type){
  if(!scene)return;
  const group=new THREE.Group(),mat=materialFor(type),pieces=[];
  for(let i=0;i<6;i++){
    const m=new THREE.Mesh(breakParticleGeo,mat);
    const a=i*Math.PI/3+Math.random()*.35;
    m.position.set(x+(Math.random()-.5)*.32,y+.48+(Math.random()-.5)*.28,z+(Math.random()-.5)*.32);
    m.userData.vel=new THREE.Vector3(Math.cos(a)*(1.1+Math.random()*.6),1.2+Math.random()*.7,Math.sin(a)*(1.1+Math.random()*.6));
    group.add(m);pieces.push(m);
  }
  scene.add(group);const started=performance.now();
  const tick=now=>{
    const dt=.016;
    for(const m of pieces){m.userData.vel.y-=5*dt;m.position.addScaledVector(m.userData.vel,dt);m.scale.setScalar(Math.max(.15,1-(now-started)/330))}
    if(now-started<330)requestAnimationFrame(tick);else scene.remove(group);
  };
  requestAnimationFrame(tick);
}
function updateMining(dt){
  if(!miningHeld||mode!=='free'||gameFreeMode!=='survival'||inventoryOpen||furnaceOpen)return;
  const hit=freeCenterHit(6),target=canMineTarget(hit,false);
  if(!target){miningKey='';miningProgress=0;resetMiningFeedback();return}
  if(target.key!==miningKey){
    miningKey=target.key;miningProgress=0;miningDurationNow=miningSeconds(target.data);miningBeat=.25;
  }
  miningProgress+=dt/Math.max(.12,miningDurationNow);
  updateMiningFeedback(target,miningProgress);
  if(miningProgress>=miningBeat&&miningBeat<1){sfx('mine');miningBeat+=.25}
  if(miningProgress>=1){
    const completed=hit;
    miningKey='';miningProgress=0;miningDurationNow=0;miningBeat=.25;resetMiningFeedback();
    const oneShot=miningSource==='radial';
    breakFreeBlock(completed);
    if(oneShot)stopMining();
  }
}
function placementTarget(hit){
  if(!hit||!hit.face||!hit.object.userData?.worldBlock)return null;
  const n=hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
  return {
    x:blockCoordFromWorld(hit.point.x+n.x*.56),
    y:Math.floor(hit.point.y+n.y*.56),
    z:blockCoordFromWorld(hit.point.z+n.z*.56)
  };
}
function facingFromYaw(){return ((Math.round(yaw/(Math.PI/2))%4)+4)%4}
function clearFreePlacementGhost(){
  if(freePlacementGhost?.parent)freePlacementGhost.parent.remove(freePlacementGhost);
  if(freePlacementGhost){
    freePlacementGhost.traverse?.(o=>{
      o.geometry?.dispose?.();
      if(Array.isArray(o.material))o.material.forEach(m=>m?.dispose?.());else o.material?.dispose?.();
    });
  }
  freePlacementGhost=null;freePlacementGhostKey='';
}
function placementCellReplaceable(occupied,type){
  if(!occupied)return true;
  const d=blockDef(type),canDisplaceFluid=blockDef(occupied).liquid&&d.solid&&!['door','cuboid'].includes(type);
  const canReplaceFragile=['fire','flower','reed','sapling','torch'].includes(occupied.type)&&
    (d.solid||['water','lava'].includes(type));
  return !!(canDisplaceFluid||canReplaceFragile);
}
function placementPreviewValid(type,p){
  const farmItem=FARM_PLANT_TYPES.includes(type);
  if(!p||!inWorld(p.x,p.y,p.z)||(!PLACEABLE_TYPES.includes(type)&&!farmItem))return false;
  if(farmItem){
    if(gameFreeMode==='survival'&&bagCount(type)<1)return false;
    if(getBlock(p.x,p.y,p.z))return false;
    const below=getBlock(p.x,p.y-1,p.z);
    return !!below&&['grass','dirt','tilledSoil'].includes(below.type);
  }
  if(Math.hypot(camera.position.x-p.x,camera.position.z-p.z)<.82&&
    p.y>=Math.floor(freePhysicsY-1.65)&&p.y<=Math.floor(freePhysicsY))return false;
  if(!placementSupportValid(type,p.x,p.y,p.z))return false;
  if(type==='cuboid'){
    const dims=currentCuboidSpec.dims;
    if(gameFreeMode==='survival'&&(!hasWorkbench()||bagCount('planks')<dims.reduce((a,b)=>a*b,1)))return false;
    for(let dx=0;dx<dims[0];dx++)for(let dy=0;dy<dims[1];dy++)for(let dz=0;dz<dims[2];dz++)
      if(!inWorld(p.x+dx,p.y+dy,p.z+dz)||getBlock(p.x+dx,p.y+dy,p.z+dz))return false;
    return true;
  }
  if(type==='door'&&(p.y>=WORLD_MAX_Y||getBlock(p.x,p.y+1,p.z)))return false;
  if(!placementCellReplaceable(getBlock(p.x,p.y,p.z),type))return false;
  if(gameFreeMode==='survival'&&bagCount(type)<1)return false;
  return true;
}
function buildFreePlacementGhost(type,p,valid,facing){
  const group=new THREE.Group(),good=valid?0x64e0bf:0xff746f;
  let dims=[.96,.96,.96],offset=[0,.5,0];
  if(type==='cuboid'){
    const d=currentCuboidSpec.dims;dims=[d[0]*.96,d[1]*.96,d[2]*.96];offset=[(d[0]-1)/2,d[1]/2,(d[2]-1)/2];
  }else if(FARM_PLANT_TYPES.includes(type)){dims=[.44,.12,.44];offset=[0,.08,0]
  }else if(type==='door'){dims=facing%2===0?[.82,1.92,.18]:[.18,1.92,.82];offset=[0,1,0]}
  else if(type==='slab'){dims=[.96,.48,.96];offset=[0,.25,0]}
  else if(['glassPane','windowFrame'].includes(type)){dims=facing%2===0?[.18,.96,.96]:[.96,.96,.18];offset=[0,.5,0]}
  const geo=new THREE.BoxGeometry(...dims),mat=new THREE.MeshBasicMaterial({
    color:good,transparent:true,opacity:valid?.18:.13,depthWrite:false,side:THREE.DoubleSide
  });
  const box=new THREE.Mesh(geo,mat);group.add(box);
  const edges=new THREE.LineSegments(new THREE.EdgesGeometry(geo),new THREE.LineBasicMaterial({
    color:good,transparent:true,opacity:valid?.78:.88,depthWrite:false
  }));group.add(edges);
  group.position.set(p.x+offset[0],p.y+offset[1],p.z+offset[2]);
  if(['stairs','roof','door','windowFrame','glassPane','furnace','workbench','chest','bed','mapBoard','displayStand','chair','desk','bookshelf','sign'].includes(type)){
    const dirs=[[0,0,1],[1,0,0],[0,0,-1],[-1,0,0]],dir=new THREE.Vector3(...dirs[facing]);
    const arrow=new THREE.ArrowHelper(dir,new THREE.Vector3(0,dims[1]/2+.12,0),.55,good,.18,.12);
    group.add(arrow);
  }
  group.userData.worldDecorative=true;return group;
}
function updateFreePlacementGhost(){
  if(mode!=='free'||inventoryOpen||furnaceOpen||lifePanelOpen||freeAvatarDefeated||(!PLACEABLE_TYPES.includes(selectedType)&&!FARM_PLANT_TYPES.includes(selectedType))){
    clearFreePlacementGhost();return;
  }
  const hit=freeCenterHit(6);
  if(!hit||['door','furnace','workbench'].includes(hit.object.userData?.type)){clearFreePlacementGhost();return}
  const p=placementTarget(hit);if(!p){clearFreePlacementGhost();return}
  const facing=facingFromYaw(),valid=placementPreviewValid(selectedType,p);
  const dims=selectedType==='cuboid'?currentCuboidSpec.dims.join('x'):'';
  const key=[selectedType,p.x,p.y,p.z,facing,dims,valid?1:0].join('|');
  if(key===freePlacementGhostKey&&freePlacementGhost?.parent===scene)return;
  clearFreePlacementGhost();freePlacementGhostKey=key;
  freePlacementGhost=buildFreePlacementGhost(selectedType,p,valid,facing);scene.add(freePlacementGhost);
}
function fullSupportBelow(x,y,z){
  const below=getBlock(x,y-1,z),top=collisionTopForData(below,x,y-1,z,x,z);
  return top!==null&&top>=y-.02;
}
function placementSupportValid(type,x,y,z){
  const below=getBlock(x,y-1,z),belowType=below?.type||'';
  if(type==='sapling'||type==='flower')return ['grass','dirt'].includes(belowType);
  if(type==='reed')return ['grass','dirt','clay','sand'].includes(belowType);
  if(type==='cactus')return ['sand','redSand','cactus'].includes(belowType);
  if(FARM_CROP_TYPES.includes(type))return belowType==='tilledSoil';
  if(type==='door'||type==='torch'||type==='fire')return fullSupportBelow(x,y,z);
  if(['chest','bed','mapBoard','displayStand','chair','desk','bookshelf','sign',...CAMP_STRUCTURE_TYPES].includes(type))return fullSupportBelow(x,y,z);
  return true;
}
function placementSupportError(type,p){
  if(placementSupportValid(type,p.x,p.y,p.z))return '';
  if(type==='sapling'||type==='flower')return '흙이나 잔디 위에 놓아 주세요.';
  if(type==='reed')return '흙·잔디·점토·모래처럼 자연 바닥 위에 놓아 주세요.';
  if(type==='cactus')return '선인장은 모래나 붉은 모래 위에 놓아 주세요.';
  if(type==='door')return '문은 단단한 바닥 위에 세워야 해요.';
  if(type==='torch')return '횃불은 단단한 바닥 위에 놓아 주세요.';
  if(type==='fire')return '불은 단단한 바닥 위에서만 붙일 수 있어요.';
  if(['chest','bed','mapBoard','displayStand','chair','desk','bookshelf','sign',...CAMP_STRUCTURE_TYPES].includes(type))return '가구와 캠프 시설은 단단한 바닥 위에 놓아 주세요.';
  return '이 블록을 놓을 바닥을 확인해 주세요.';
}
function cleanupUnsupportedAt(x,y,z,record=true){
  const data=getBlock(x,y,z);if(!data||data.type==='doorTop')return false;
  if(!['sapling','flower','reed','cactus','torch','fire','door',...FARM_CROP_TYPES].includes(data.type))return false;
  if(placementSupportValid(data.type,x,y,z))return false;
  return removeWorldBlockData(x,y,z,record);
}
function placeCustomCuboid(p){
  const dims=currentCuboidSpec.dims.map(v=>THREE.MathUtils.clamp(Math.round(v),1,survivalCuboidMax()));
  for(let dx=0;dx<dims[0];dx++)for(let dy=0;dy<dims[1];dy++)for(let dz=0;dz<dims[2];dz++){
    const x=p.x+dx,y=p.y+dy,z=p.z+dz;if(!inWorld(x,y,z)||getBlock(x,y,z)){toast('직육면체가 들어갈 공간이 부족해요.');return false}
  }
  const anchor={type:'cuboid',dims:dims.slice(),faceColors:currentCuboidSpec.faceColors.slice(),playerBuilt:true};
  setRawBlock(p.x,p.y,p.z,anchor);markEdit(p.x,p.y,p.z,anchor);
  for(let dx=0;dx<dims[0];dx++)for(let dy=0;dy<dims[1];dy++)for(let dz=0;dz<dims[2];dz++){
    if(dx===0&&dy===0&&dz===0)continue;const data={type:'cuboidPart',anchor:[p.x,p.y,p.z],playerBuilt:true};
    setRawBlock(p.x+dx,p.y+dy,p.z+dz,data);markEdit(p.x+dx,p.y+dy,p.z+dz,data);
  }
  refreshBlockMesh(p.x,p.y,p.z);
  for(let dx=-1;dx<=dims[0];dx++)for(let dy=-1;dy<=dims[1];dy++)for(let dz=-1;dz<=dims[2];dz++){
    if(dx>=0&&dx<dims[0]&&dy>=0&&dy<dims[1]&&dz>=0&&dz<dims[2])continue;
    refreshBlockMesh(p.x+dx,p.y+dy,p.z+dz);
  }
  return true;
}

function cropForPlant(type){return type==='wheatSeed'?'wheatCrop':type==='carrot'?'carrotCrop':type==='potato'?'potatoCrop':''}
function plantFarmItem(hit){
  if(!hit||gameFreeMode!=='survival'||!FARM_PLANT_TYPES.includes(selectedType))return false;
  const p=placementTarget(hit);if(!p||!inWorld(p.x,p.y,p.z)){toast('심을 곳을 조금 더 가까이 바라보세요.');return true}
  if(getBlock(p.x,p.y,p.z)){toast('씨앗을 심을 위쪽 한 칸을 비워 주세요.');return true}
  const below=getBlock(p.x,p.y-1,p.z);
  if(!below||!['grass','dirt','tilledSoil'].includes(below.type)){toast('흙이나 잔디 위에 심을 수 있어요.');return true}
  if(bagCount(selectedType)<1){toast(blockDef(selectedType).name+'이(가) 더 필요해요.');return true}
  if(below.type!=='tilledSoil')setWorldBlock(p.x,p.y-1,p.z,{type:'tilledSoil',playerBuilt:true},true);
  const crop=cropForPlant(selectedType);
  setWorldBlock(p.x,p.y,p.z,{type:crop,age:0,plantedAt:survivalWorldTime,lastGrowAt:survivalWorldTime,lastGrowReal:Date.now()/1000,playerBuilt:true},true);
  consumeBag(selectedType,1);buildHotbar();sfx('place');toast(blockDef(selectedType).name+'을(를) 심었어요. 비나 시간이 작물을 키워 줘요.');markFreeWorldDirty(300);return true;
}
function harvestCrop(x,y,z,data){
  if(!data||!FARM_CROP_TYPES.includes(data.type))return false;
  const mature=(Number(data.age)||0)>=CROP_MATURE_AGE;
  const plant=data.type==='wheatCrop'?'wheatSeed':data.type==='carrotCrop'?'carrot':'potato';
  removeWorldBlockData(x,y,z,true);
  if(data.type==='wheatCrop'){
    addToBag('wheatSeed',mature?2:1);if(mature)addToBag('wheat',2);
  }else addToBag(plant,mature?2+(hash2(x+freeSimTick,z)>.55?1:0):1);
  spawnPickupVisual(plant,x,y+.4,z,mature?2:1);triggerFreeAvatarAction('pickup');sfx('pickup');
  toast(mature?(data.type==='wheatCrop'?'밀을 수확했어요!':'잘 자란 '+blockDef(plant).name+'을(를) 수확했어요!'):'아직 덜 자란 작물을 다시 챙겼어요.');
  markFreeWorldDirty(250);return true;
}

function petRecordForRoot(root){return root?.userData?.petId?tamedCreatures[root.userData.petId]||null:null}
function petDisplayName(root){const record=petRecordForRoot(root);return record?.name||root?.userData?.spec?.name||'동물'}
function creatureForageKey(root){
  const u=root?.userData;return u?.petId?'pet:'+u.petId:(u?.spec?.id||'');
}

function makePetNameSprite(name){
  const c=document.createElement('canvas');c.width=256;c.height=64;const ctx=c.getContext('2d');
  ctx.fillStyle='rgba(10,20,32,.78)';ctx.beginPath();ctx.roundRect?.(4,4,248,56,16);if(ctx.roundRect)ctx.fill();else ctx.fillRect(4,4,248,56);
  ctx.fillStyle='#ffffff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='800 30px Pretendard, Noto Sans KR, sans-serif';ctx.fillText(String(name||'친구').slice(0,10),128,32,228);
  const tex=new THREE.CanvasTexture(c);if('colorSpace' in tex&&THREE.SRGBColorSpace)tex.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:true,toneMapped:false}));sprite.scale.set(1.7,.42,1);sprite.position.y=1.75;sprite.userData.petNameTag=true;return sprite;
}
function refreshPetNameTag(root){
  if(!root)return;const old=root.children.find(c=>c.userData?.petNameTag);if(old){root.remove(old);old.material?.map?.dispose?.();old.material?.dispose?.()}
  if(root.userData?.petId)root.add(makePetNameSprite(petDisplayName(root)));
}
function finiteNumber(value,fallback=0){const n=Number(value);return Number.isFinite(n)?n:fallback}
function syncTamedCreaturePositions(){
  for(const root of wildCreatures){
    const record=petRecordForRoot(root);if(!record||root.userData.dead)continue;
    record.x=finiteNumber(root.position.x,0);record.z=finiteNumber(root.position.z,0);
    if(record.mode==='stay'){record.homeX=finiteNumber(root.userData.homeX,record.x);record.homeZ=finiteNumber(root.userData.homeZ,record.z)}
  }
}
function restoreTamedCreatures(){
  for(const record of Object.values(tamedCreatures||{})){
    const spec=window.CubeArchitectCreatures?.SPECIES?.[record.species];if(!spec||!TAME_RULES[record.species])continue;
    const x=THREE.MathUtils.clamp(finiteNumber(record.x,0),-WORLD_HALF+2,WORLD_HALF-2),z=THREE.MathUtils.clamp(finiteNumber(record.z,5),-WORLD_HALF+2,WORLD_HALF-2);
    const root=placeWildCreature(record.species,x,z);if(!root)continue;
    root.userData.petId=record.id;root.userData.tameProgress=TAME_RULES[record.species].need;
    root.userData.homeX=finiteNumber(record.homeX,x);root.userData.homeZ=finiteNumber(record.homeZ,z);
    refreshPetNameTag(root);
  }
}

function petCatchupPosition(root){
  const record=petRecordForRoot(root);if(!record)return null;
  let salt=0;for(const ch of record.id||'pet')salt=(salt*31+ch.charCodeAt(0))>>>0;
  const baseSide=((salt%9)-4)*.12;
  const candidates=[];
  for(const distance of [1.8,2.4,3.0])for(const side of [baseSide,baseSide+.7,baseSide-.7]){
    const x=camera.position.x+Math.sin(yaw)*distance+Math.cos(yaw)*side;
    const z=camera.position.z+Math.cos(yaw)*distance-Math.sin(yaw)*side;
    if(!inWorld(Math.round(x),0,Math.round(z)))continue;
    const y=creatureGroundY(x,z,freePhysicsY-1.62);
    if(Math.abs(y-(freePhysicsY-1.62))>1.35)continue;
    const cx=Math.round(x),cz=Math.round(z),feet=getBlock(cx,Math.floor(y),cz),support=getBlock(cx,Math.floor(y)-1,cz);
    const bodyA=getBlock(cx,Math.floor(y+.08),cz),bodyB=getBlock(cx,Math.floor(y+.78),cz);
    const occupied=isSolidData(bodyA,cx,Math.floor(y+.08),cz)||isSolidData(bodyB,cx,Math.floor(y+.78),cz);
    const danger=[feet?.type,support?.type,bodyA?.type,bodyB?.type].some(type=>['water','lava','fire','cactus'].includes(type));
    if(!danger&&!occupied)candidates.push({x,y,z});
  }
  return candidates[0]||null;
}
function openCreatureLifePanel(root){
  if(!root?.userData||root.userData.dead)return false;
  const panel=$('lifePanel');if(!panel)return false;
  stopMining();if(inventoryOpen){inventoryOpen=false;$('blockInventory').classList.add('hidden')}
  if(furnaceOpen){furnaceOpen=false;$('furnacePanel').classList.add('hidden')}
  if(worksOpen){worksOpen=false;$('buildingWorksPanel').classList.add('hidden')}
  lifePanelOpen=true;lifePanelMode='pet';lifePanelTargetKey='';lifeCreatureTarget=root;
  if(document.pointerLockElement===canvas)document.exitPointerLock?.();panel.classList.remove('hidden');renderLifePanel();return true;
}
function collectCreatureForage(root){
  const u=root?.userData,spec=u?.spec,forage=spec?.forage;if(!root||u.dead||!forage)return false;
  const forageKey=creatureForageKey(root),readyAt=Math.max(0,Number(creatureForageAt[forageKey])||0);
  if(survivalWorldTime<readyAt){toast(petDisplayName(root)+'에게 다시 다가가려면 '+Math.ceil(readyAt-survivalWorldTime)+'초 정도 기다려 주세요.');return true}
  let total=0;for(const [type,n] of Object.entries(forage.reward||{})){addToBag(type,n);spawnPickupVisual(type,root.position.x,root.position.y+.25,root.position.z,n);total+=n}
  creatureForageAt[forageKey]=survivalWorldTime+Math.max(20,Number(forage.cooldown)||60);trackSurvival('forage',spec.id,Math.max(1,total));
  triggerFreeAvatarAction('pickup',FREE_AVATAR_ACTION_MS.pickup);toast(petDisplayName(root)+'에게서 '+(forage.label||'재료')+'을(를) 얻었어요.');sfx('good');markFreeWorldDirty(350);return true;
}
function feedTameTarget(){
  const root=lifeCreatureTarget,u=root?.userData,spec=u?.spec,rule=TAME_RULES[spec?.id];if(!root||u.dead||!rule)return;
  if(u.petId){toast(petDisplayName(root)+'은(는) 이미 우리 친구예요.');return}
  if(bagCount(rule.food)<1){toast(blockDef(rule.food).name+'이(가) 필요해요.');return}
  consumeBag(rule.food,1);u.tameProgress=Math.min(rule.need,(Number(u.tameProgress)||Number(tamingProgress[spec.id])||0)+1);tamingProgress[spec.id]=u.tameProgress;sfx('good');
  if(u.tameProgress>=rule.need){
    const id='pet-'+spec.id+'-'+Date.now().toString(36)+'-'+(++petSerial);
    tamedCreatures[id]={id,species:spec.id,name:spec.name,mode:'follow',x:root.position.x,z:root.position.z,homeX:root.position.x,homeZ:root.position.z};
    delete tamingProgress[spec.id];u.petId=id;u.homeX=root.position.x;u.homeZ=root.position.z;refreshPetNameTag(root);
    toast(spec.name+'이(가) 마음을 열었어요! 이제 따라다녀요.');
  }else toast(spec.name+'에게 '+blockDef(rule.food).name+'을(를) 줬어요 · '+u.tameProgress+' / '+rule.need);
  buildHotbar();renderLifePanel();saveFreeWorld();
}
function setPetName(root,value){
  const record=petRecordForRoot(root);if(!record)return;record.name=String(value||record.name||root.userData.spec.name).trim().slice(0,10)||root.userData.spec.name;
  refreshPetNameTag(root);saveFreeWorld();
}
function setPetMode(root,modeName){
  const record=petRecordForRoot(root);if(!record)return;record.mode=modeName==='stay'?'stay':'follow';
  if(record.mode==='stay'){record.homeX=root.position.x;record.homeZ=root.position.z;root.userData.homeX=record.homeX;root.userData.homeZ=record.homeZ}
  toast(record.name+(record.mode==='stay'?' · 여기에서 기다려요.':' · 다시 따라와요.'));renderLifePanel();saveFreeWorld();
}
function useChair(x,y,z){
  const data=getBlock(x,y,z);if(!data||!['chair','sofa','bench'].includes(data.type))return false;
  camera.position.set(x,y+1.62,z);freePhysicsY=camera.position.y;freeVelocityY=0;onGround=true;
  yaw=((data.facing||0)%4)*Math.PI/2;seatedFurniture=worldKey(x,y,z);triggerFreeAvatarAction('sit',1000000000);
  toast('의자에 앉았어요. 움직이면 일어나요.');return true;
}
function leaveChair(){
  if(!seatedFurniture)return;seatedFurniture=null;
  if(freeAvatarAction==='sit'){freeAvatarAction='';freeAvatarActionStartedAt=0;freeAvatarActionUntil=0}
}
function saveSignText(){
  const target=lifeTargetData();if(!target||target.data.type!=='sign')return;
  const value=cleanSignText($('lifeSignText')?.value||'');setWorldBlock(...target.p,{...target.data,text:value},true);toast(value?'표지판에 글을 적었어요.':'표지판 글을 지웠어요.');renderLifePanel();saveFreeWorld();
}
function setDeskDecor(value){
  const target=lifeTargetData();if(!target||target.data.type!=='desk')return;
  const decor=String(value||'').slice(0,48);setWorldBlock(...target.p,{...target.data,decor},true);
  const labels={'':'비움',notes:'탐험 노트',flower:'작은 화분',lamp:'작은 랜턴'};
  const label=decor.startsWith('trophy:')?(poiRules.poiById(decor.slice(7))?.name||'랜드마크')+' 기념품':labels[decor]||'소품';
  toast('책상 위에 '+label+'을(를) 놓았어요.');renderLifePanel();saveFreeWorld();
}
function lifeTargetData(){
  if(!lifePanelTargetKey)return null;const p=parseWorldKey(lifePanelTargetKey),data=getBlock(...p);
  return data?{p,data}:null;
}
function openLifePanel(modeName,x,y,z){
  const panel=$('lifePanel');if(!panel)return;
  stopMining();
  if(inventoryOpen){inventoryOpen=false;$('blockInventory').classList.add('hidden')}
  if(furnaceOpen){furnaceOpen=false;$('furnacePanel').classList.add('hidden')}
  if(worksOpen){worksOpen=false;$('buildingWorksPanel').classList.add('hidden')}
  lifePanelOpen=true;lifePanelMode=modeName;lifePanelTargetKey=worldKey(x,y,z);
  if(document.pointerLockElement===canvas)document.exitPointerLock?.();
  panel.classList.remove('hidden');renderLifePanel();
}
function closeLifePanel(){
  if(!lifePanelOpen)return;
  lifePanelOpen=false;lifePanelMode='';lifePanelTargetKey='';lifeCreatureTarget=null;$('lifePanel')?.classList.add('hidden');
  $('lockNotice')?.classList.toggle('hidden',mobileModeEnabled||document.pointerLockElement===canvas);
  if(!mobileModeEnabled&&mode==='free')resumeFreePointerLock();
}
function chestMove(type,toChest,all=true){
  const target=lifeTargetData();if(!target||!['chest','crate'].includes(target.data.type))return;
  const items={...(target.data.items||{})};
  if(toChest){
    const amount=all?bagCount(type):Math.min(1,bagCount(type));if(amount<1)return;
    const equipped=Object.values(survivalEquipment||{}).includes(type);
    if(equipped&&bagCount(type)<=amount){toast('장착 중인 장비는 벗은 뒤 상자에 넣어 주세요.');return}
    survivalBag[type]=Math.max(0,bagCount(type)-amount);items[type]=(Number(items[type])||0)+amount;
  }else{
    const have=Math.max(0,Number(items[type])||0),amount=all?have:Math.min(1,have);if(amount<1)return;
    items[type]=have-amount;if(items[type]<=0)delete items[type];survivalBag[type]=bagCount(type)+amount;discoveredResources.add(type);
  }
  setWorldBlock(...target.p,{...target.data,items},true);refreshRecipeDiscoveries(true);buildHotbar();renderLifePanel();markFreeWorldDirty(250);
}
function chestDepositAll(){
  const target=lifeTargetData();if(!target||target.data.type!=='chest')return;
  const items={...(target.data.items||{})},equipped=new Set(Object.values(survivalEquipment||{}).filter(Boolean));
  for(const [type,n0] of Object.entries(survivalBag)){
    const n=Math.max(0,Number(n0)||0);if(!n||equipped.has(type))continue;
    items[type]=(Number(items[type])||0)+n;survivalBag[type]=0;
  }
  setWorldBlock(...target.p,{...target.data,items},true);buildHotbar();renderLifePanel();markFreeWorldDirty(250);
}
function setChestLabel(value){
  const target=lifeTargetData();if(!target||target.data.type!=='chest')return;
  setWorldBlock(...target.p,{...target.data,label:String(value||'').slice(0,18)},true);markFreeWorldDirty(250);
}
function mapTargetButton(target){
  const b=document.createElement('button');b.type='button';b.className='life-map-target';
  const active=trackedTarget&&trackedTarget.kind===target.kind&&trackedTarget.id===target.id;
  b.innerHTML='<b>'+target.label+'</b><small>'+(active?'추적 중':'눌러서 추적')+'</small>';
  b.onclick=()=>{trackedTarget={...target};renderLifePanel();updateTrackingGuide();updateFreeMission();saveFreeWorld();toast(target.label+'을(를) 추적해요.')};return b;
}
function renderLifePanel(){
  const title=$('lifePanelTitle'),body=$('lifePanelBody');if(!title||!body)return;body.replaceChildren();
  if(lifePanelMode==='pet'){
    const root=lifeCreatureTarget,u=root?.userData,spec=u?.spec;if(!root||u?.dead||!spec){closeLifePanel();return}
    const rule=TAME_RULES[spec.id],record=petRecordForRoot(root);title.textContent=record?(record.name+' · 나의 동물'):('길들이기 · '+spec.name);
    const card=document.createElement('div');card.className='life-pet-card';
    if(record){
      const input=document.createElement('input');input.className='life-name';input.maxLength=10;input.value=record.name;input.placeholder='동물 이름';
      input.onchange=()=>{setPetName(root,input.value);title.textContent=petDisplayName(root)+' · 나의 동물'};
      const status=document.createElement('p');status.textContent='상태 · '+(record.mode==='stay'?'여기에서 기다리는 중':'나를 따라오는 중');
      const actions=document.createElement('div');actions.className='life-actions';
      const follow=document.createElement('button');follow.type='button';follow.textContent='따라와';follow.disabled=record.mode==='follow';follow.onclick=()=>setPetMode(root,'follow');
      const stay=document.createElement('button');stay.type='button';stay.textContent='여기 있어';stay.disabled=record.mode==='stay';stay.onclick=()=>setPetMode(root,'stay');
      actions.append(follow,stay);card.append(input,status,actions);
    }else{
      const progress=Math.max(0,Number(u.tameProgress)||Number(tamingProgress[spec.id])||0),food=blockDef(rule.food);
      const p=document.createElement('p');p.textContent=spec.name+'이(가) 좋아하는 '+food.name+'을(를) 몇 번 나누면 친해질 수 있어요.';
      const meter=document.createElement('div');meter.className='life-pet-progress';meter.innerHTML='<span style="width:'+Math.round(progress/rule.need*100)+'%"></span>';
      const count=document.createElement('small');count.textContent='친밀감 '+progress+' / '+rule.need+' · 가방의 '+food.name+' '+bagCount(rule.food)+'개';
      const feed=document.createElement('button');feed.type='button';feed.textContent=food.name+' 1개 주기';feed.disabled=bagCount(rule.food)<1;feed.onclick=feedTameTarget;
      card.append(p,meter,count,feed);
    }
    if(spec.forage){
      const forage=document.createElement('button');forage.type='button';forage.className='life-secondary';
      const forageKey=creatureForageKey(root),readyAt=Math.max(0,Number(creatureForageAt[forageKey])||0),left=Math.max(0,Math.ceil(readyAt-survivalWorldTime));
      forage.textContent=left?((spec.forage.label||'재료')+' · '+left+'초 뒤'):(spec.forage.label||'재료')+' 얻기';forage.disabled=left>0;
      forage.onclick=()=>{collectCreatureForage(root);renderLifePanel()};card.append(forage);
    }
    body.append(card);return;
  }
  if(lifePanelMode==='sign'){
    const target=lifeTargetData();if(!target||target.data.type!=='sign'){closeLifePanel();return}
    title.textContent='표지판 쓰기';const p=document.createElement('p');p.textContent='두 줄까지 적을 수 있어요. 집·방·창고에 이름을 붙여 보세요.';
    const area=document.createElement('textarea');area.id='lifeSignText';area.className='life-sign-text';area.maxLength=24;area.rows=2;area.value=target.data.text||'';area.placeholder='예: 나의 비밀기지';
    const save=document.createElement('button');save.type='button';save.className='life-primary';save.textContent='표지판 저장';save.onclick=saveSignText;body.append(p,area,save);return;
  }
  if(lifePanelMode==='desk'){
    const target=lifeTargetData();if(!target||target.data.type!=='desk'){closeLifePanel();return}
    title.textContent='책상 꾸미기';const intro=document.createElement('p');intro.textContent='발견한 것에 따라 책상 위 소품이 늘어나요. 마음에 드는 하나를 올려 보세요.';body.append(intro);
    const actions=document.createElement('div');actions.className='life-actions';
    const options=[['','비우기'],['notes','탐험 노트']];
    if(discoveredResources.has('flower')||bagCount('flower')>0)options.push(['flower','작은 화분']);
    if(discoveredResources.has('torch')||bagCount('torch')>0)options.push(['lamp','작은 랜턴']);
    for(const id of restoredLandmarks){const poi=poiRules.poiById(id);if(poi)options.push(['trophy:'+id,poi.name+' 기념품'])}
    for(const [value,label] of options){
      const b=document.createElement('button');b.type='button';b.textContent=(target.data.decor||'')===value?'✓ '+label:label;b.onclick=()=>setDeskDecor(value);actions.append(b);
    }
    body.append(actions);return;
  }
  if(lifePanelMode==='library'){
    title.textContent='탐험 책장';const wrap=document.createElement('div');wrap.className='life-library';
    const rows=[
      ['발견한 생물',seenCreatureKinds.size,Object.keys(window.CubeArchitectCreatures?.SPECIES||{}).length,[...seenCreatureKinds].map(id=>window.CubeArchitectCreatures?.SPECIES?.[id]?.name||id)],
      ['발견한 지역',visitedBiomes.size,Object.keys(worldRules.BIOMES||{}).length,[...visitedBiomes].map(id=>worldRules.BIOMES[id]?.name||id)],
      ['랜드마크 기록',restoredLandmarks.size,(poiRules.POIS||poiRules.ALL||[]).length||6,[...restoredLandmarks].map(id=>poiRules.poiById(id)?.name||id)]
    ];
    for(const [label,n,total,names] of rows){
      const section=document.createElement('section');section.innerHTML='<b>'+label+' · '+n+' / '+total+'</b><small>'+(names.length?names.join(' · '):'아직 기록이 없어요.')+'</small>';wrap.append(section);
    }
    body.append(wrap);return;
  }
  if(lifePanelMode==='chest'){
    const target=lifeTargetData();if(!target||target.data.type!=='chest'){closeLifePanel();return}
    title.textContent=target.data.label||'나무 상자';
    const label=document.createElement('input');label.className='life-name';label.maxLength=18;label.value=target.data.label||'';
    label.placeholder='상자 이름';label.onchange=()=>{setChestLabel(label.value);title.textContent=label.value||'나무 상자'};
    const controls=document.createElement('div');controls.className='life-actions';
    const all=document.createElement('button');all.textContent='가방 재료 모두 넣기';all.onclick=chestDepositAll;controls.append(all);
    const cols=document.createElement('div');cols.className='life-storage-columns';
    const bag=document.createElement('div'),chest=document.createElement('div');bag.innerHTML='<h4>내 가방</h4>';chest.innerHTML='<h4>상자</h4>';
    for(const [type,n] of Object.entries(survivalBag).filter(([,n])=>Number(n)>0)){
      const b=document.createElement('button');b.className='life-item';b.textContent=(blockDef(type).icon||'▣')+' '+blockDef(type).name+' ×'+n+' →';b.onclick=()=>chestMove(type,true,true);bag.append(b);
    }
    const items=target.data.items||{};
    for(const [type,n] of Object.entries(items).filter(([,n])=>Number(n)>0)){
      const b=document.createElement('button');b.className='life-item';b.textContent='← '+(blockDef(type).icon||'▣')+' '+blockDef(type).name+' ×'+n;b.onclick=()=>chestMove(type,false,true);chest.append(b);
    }
    if(!bag.querySelector('.life-item'))bag.append(Object.assign(document.createElement('small'),{textContent:'가방이 비어 있어요.'}));
    if(!chest.querySelector('.life-item'))chest.append(Object.assign(document.createElement('small'),{textContent:'아직 넣은 물건이 없어요.'}));
    cols.append(bag,chest);body.append(label,controls,cols);return;
  }
  if(lifePanelMode==='map'){
    title.textContent='탐험 지도판';
    const intro=document.createElement('p');intro.textContent='직접 발견한 지역과 랜드마크만 기록돼요. 원하는 곳을 추적할 수 있어요.';body.append(intro);
    if(trackedTarget){
      const active=document.createElement('div');active.className='life-tracked';active.textContent='현재 추적 · '+trackedTarget.label;
      const stop=document.createElement('button');stop.textContent='추적 그만하기';stop.onclick=()=>{trackedTarget=null;renderLifePanel();updateTrackingGuide();updateFreeMission();saveFreeWorld()};active.append(stop);body.append(active);
    }
    const sections=[['발견한 지역',[]],['발견한 장소',[]],['발견한 랜드마크',[]]];
    for(const biomeId of visitedBiomes){
      const center=(worldRules.CENTERS||[]).find(c=>c[2]===biomeId);if(!center)continue;
      sections[0][1].push({kind:'biome',id:biomeId,label:worldRules.BIOMES[biomeId]?.name||biomeId,x:center[0],z:center[1]});
    }
    for(const spec of buildMiniPoiCatalog()){
      if(collected.has('mini:'+spec.id))sections[1][1].push({kind:'mini',id:spec.id,label:spec.label,x:spec.x,z:spec.z});
    }
    for(const id of discoveredLandmarks){
      const poi=poiRules.poiById(id);if(poi)sections[2][1].push({kind:'landmark',id,label:poi.name,x:poi.center[0],z:poi.center[1]});
    }
    for(const [name,targets] of sections){
      const box=document.createElement('section');box.className='life-map-section';const h=document.createElement('h4');h.textContent=name;box.append(h);
      if(!targets.length)box.append(Object.assign(document.createElement('small'),{textContent:'아직 기록이 없어요.'}));
      else targets.forEach(t=>box.append(mapTargetButton(t)));
      body.append(box);
    }return;
  }
}
function useBed(x,y,z){
  if(gameFreeMode!=='survival')return false;
  const shelter=worldRules.shelterAt(getBlock,x,y,z);
  if(!shelter.sheltered){toast('침대는 지붕과 벽이 있는 거점 안에서 사용해 주세요.');return true}
  const data=getBlock(x,y,z),f=((data?.facing||0)%4+4)%4;
  const around=[[0,-1],[1,0],[0,1],[-1,0]],ordered=[around[f],...around.filter((_,i)=>i!==f)];
  let pos=null;
  for(const [dx,dz] of ordered){
    const sx=x+dx,sz=z+dz;
    if(!isSolidData(getBlock(sx,y,sz),sx,y,sz)&&!isSolidData(getBlock(sx,y+1,sz),sx,y+1,sz)&&
      isSolidData(getBlock(sx,y-1,sz),sx,y-1,sz)){pos=[sx,y+1.62,sz];break}
  }
  if(!pos)pos=[x,y+1.62,z];
  survivalHome={bed:[x,y,z],position:pos};
  const night=dayTime>=.74||dayTime<.18;
  if(night){dayTime=.28;survivalExposure=Math.min(15,survivalExposure);survivalHealth=Math.min(5,survivalHealth+1);toast('푹 쉬고 아침이 되었어요. 이 침대가 귀환 지점이에요.');}
  else toast('이 침대를 내 귀환 지점으로 정했어요. 밤에는 여기서 아침까지 쉴 수 있어요.');
  triggerFreeAvatarAction('sit');saveFreeWorld();return true;
}
function useDisplayStand(x,y,z){
  const data=getBlock(x,y,z);if(!data||data.type!=='displayStand')return false;
  const options=['',...restoredLandmarks];if(options.length===1){toast('랜드마크 던전을 클리어하면 기념품을 전시할 수 있어요.');return true}
  const i=options.indexOf(data.trophy||''),next=options[(i+1+options.length)%options.length];
  setWorldBlock(x,y,z,{...data,trophy:next},true);
  const poi=next?poiRules.poiById(next):null;toast(next?(poi?.name||'랜드마크')+' 기념품을 전시했어요.':'전시대를 비웠어요.');saveFreeWorld();return true;
}
function interactLifeBlock(type,x,y,z){
  if(type==='chest'||type==='crate'){openLifePanel('chest',x,y,z);return true}
  if(type==='bed')return useBed(x,y,z);
  if(type==='mapBoard'){openLifePanel('map',x,y,z);return true}
  if(type==='displayStand')return useDisplayStand(x,y,z);
  if(['chair','sofa','bench'].includes(type))return useChair(x,y,z);
  if(type==='floorLamp'||type==='campfire'){
    const d=getBlock(x,y,z);if(!d)return false;
    const next=d.lit===false;
    setWorldBlock(x,y,z,{...d,lit:next},true);
    toast((type==='campfire'?'모닥불':'조명')+(next?'을 켰어요.':'을 껐어요.'));
    saveFreeWorld();return true;
  }
  if(type==='bedroll'){
    if(gameFreeMode!=='survival')return false;
    const night=dayTime>=.74||dayTime<.18;
    if(!night){toast('침낭은 밤에 쉬는 데 사용할 수 있어요.');return true}
    if(['storm','rain'].includes(weather)){toast('비바람이 심해요. 지붕 있는 거점에서 쉬세요.');return true}
    dayTime=.28;survivalExposure=Math.min(20,survivalExposure);
    toast('침낭에서 쉬고 아침이 되었어요.');triggerFreeAvatarAction('sit');saveFreeWorld();return true;
  }
  if(type==='sign'){openLifePanel('sign',x,y,z);return true}
  if(type==='desk'){openLifePanel('desk',x,y,z);return true}
  if(type==='bookshelf'){openLifePanel('library',x,y,z);return true}
  return false;
}
function placeFreeBlock(hit){
  if(!hit){toast('놓을 곳을 조금 더 가까이에서 바라보자.');return;}
  const hitType=hit.object.userData.type,u=hit.object.userData;
  if(hitType==='door'){toggleDoorAt(u.gx,u.gy,u.gz);return}
  if(hitType==='furnace'){toggleFurnace(true);return}
  if(hitType==='workbench'){survivalInventoryTab='craft';toggleInventory(true);return}
  if(typeof interactLifeBlock==='function'&&interactLifeBlock(hitType,u.gx,u.gy,u.gz))return;
  if(typeof FARM_PLANT_TYPES!=='undefined'&&FARM_PLANT_TYPES.includes(selectedType)){plantFarmItem(hit);return}
  if(!PLACEABLE_TYPES.includes(selectedType)){
    toast('가방에서 놓을 물건을 먼저 골라 보자.');return;
  }
  const p=placementTarget(hit);
  if(!p||!inWorld(p.x,p.y,p.z)){toast('이곳에는 놓을 수 없어. 가까운 바닥을 골라 보자.');return;}
  const occupied=getBlock(p.x,p.y,p.z),selectedDef=blockDef(selectedType);
  const canDisplaceFluid=occupied&&blockDef(occupied).liquid&&selectedDef.solid&&
    !['door','cuboid'].includes(selectedType);
  const canReplaceFragile=occupied&&['fire','flower','reed','sapling','torch'].includes(occupied.type)&&
    (selectedDef.solid||['water','lava'].includes(selectedType));
  const replaceable=!!(canDisplaceFluid||canReplaceFragile);
  if(occupied&&!replaceable){toast('여기는 이미 채워져 있어. 빈 곳에 놓아 보자.');return}
  if(Math.hypot(camera.position.x-p.x,camera.position.z-p.z)<.82&&
    p.y>=Math.floor(freePhysicsY-1.65)&&p.y<=Math.floor(freePhysicsY)){toast('내가 서 있는 곳이야. 한 걸음 옆으로 가 보자.');return}
  if((selectedType==='floorLamp'||selectedType==='tent')&&getBlock(p.x,p.y+1,p.z)){
    toast('높은 가구와 천막 위에는 한 칸 이상 여유가 필요해요.');return;
  }
  const supportError=placementSupportError(selectedType,p);
  if(supportError){toast(supportError);return}
  const survival=gameFreeMode==='survival';
  if(survival){
    if(selectedType==='cuboid'){
      const volume=currentCuboidSpec.dims.reduce((a,b)=>a*b,1);
      if(!hasWorkbench()||bagCount('planks')<volume){
        toast('제작대와 판자 '+volume+'개가 필요해요.');return;
      }
    }else if(bagCount(selectedType)<1){
      toast(blockDef(selectedType).name+'이(가) 더 필요해요.');return;
    }
  }
  const facing=facingFromYaw();
  if(replaceable)removeWorldBlockData(p.x,p.y,p.z,true);
  if(selectedType==='cuboid'){
    if(!placeCustomCuboid(p))return;
  }else if(selectedType==='door'){
    if(p.y>=WORLD_MAX_Y||getBlock(p.x,p.y+1,p.z)){
      toast('문을 놓으려면 위쪽 두 칸이 비어 있어야 해요.');return;
    }
    setWorldBlock(p.x,p.y,p.z,{type:'door',open:false,facing,playerBuilt:true},true);
    setWorldBlock(p.x,p.y+1,p.z,{type:'doorTop',baseY:p.y,playerBuilt:true},true);
  }else if(selectedType==='water'||selectedType==='lava'){
    setWorldBlock(p.x,p.y,p.z,{type:selectedType,level:4,playerBuilt:true},true);
    reactFluidsNear(p.x,p.y,p.z);
  }else if(selectedType==='fire'){
    setWorldBlock(p.x,p.y,p.z,{type:'fire',age:0,playerBuilt:true},true);
  }else if(selectedType==='sapling'){
    setWorldBlock(p.x,p.y,p.z,{type:'sapling',age:0,playerBuilt:true},true);
  }else if(['stairs','roof','windowFrame','glassPane','furnace','workbench','chest','bed','mapBoard','displayStand','chair','desk','bookshelf','sign',...CAMP_STRUCTURE_TYPES].includes(selectedType)){
    setWorldBlock(p.x,p.y,p.z,{type:selectedType,facing,playerBuilt:true},true);
  }else setWorldBlock(p.x,p.y,p.z,{type:selectedType,playerBuilt:true},true);
  if(survival){
    if(selectedType==='cuboid'){
      const count=currentCuboidSpec.dims.reduce((a,b)=>a*b,1);consumeBag('planks',count);
    }else consumeBag(selectedType,1);
    trackSurvival('place',selectedType);
    if(selectedType==='cuboid')trackSurvival('cuboid',currentCuboidSpec.dims.join('x'));
    buildHotbar();updateFreeMission();
  }
  sfx('place');tutorialSignal('free-place');markFreeWorldDirty();
}
function breakFreeBlock(hit){
  if(!hit||!hit.object.userData.worldBlock)return;
  const {gx:x,gy:y,gz:z}=hit.object.userData;
  const data=getBlock(x,y,z);
  if(!data||blockDef(data).unbreakable){toast('기반암은 부술 수 없어요.');return}
  if(['chair','sofa','bench'].includes(data.type)&&seatedFurniture===worldKey(x,y,z))leaveChair();
  if(FARM_CROP_TYPES.includes(data.type)){harvestCrop(x,y,z,data);return}
  if(['chest','crate'].includes(data.type)&&data.items&&gameFreeMode==='survival'){
    inventoryBatchDepth++;
    for(const [type,n] of Object.entries(data.items))if((Number(n)||0)>0)addToBag(type,Number(n)||0);
    inventoryBatchDepth--;buildHotbar();toast('상자 안의 물건도 가방으로 챙겼어요.');
  }
  if(data.type==='bed'&&survivalHome?.bed?.join(',')===[x,y,z].join(','))survivalHome=null;
  if(data.protectedPoi){
    const poi=poiRules.poiById(data.landmarkPoi);
    toast((poi?.name||'랜드마크')+'은 탐험 유적이에요. 가까이 가서 복원 설계도를 이용하세요.');
    return;
  }
  const survival=gameFreeMode==='survival';
  let type=data.type==='doorTop'?'door':data.type;
  if(type==='cuboidPart'){
    const anchor=getBlock(...(data.anchor||[x,y,z]));type=anchor?.type||type;
  }
  if(survival){
    const required=worldRules.toolNeeded(type);
    if(required&&pickTier(selectedType)<pickTier(required)){
      toast(blockDef(required).name+' 이상을 핫바에서 선택해 주세요.');
      return;
    }
  }
  const resource=type==='cuboid'?'planks':worldRules.dropFor(type);
  const volume=type==='cuboid'?(data.dims||[1,1,1]).reduce((a,b)=>a*b,1):1;
  let pickupVisualType='',pickupVisualCount=1;
  if(removeWorldBlockData(x,y,z,true)){
    if(survival&&resource&&!['water','lava','fire','doorTop','cuboidPart'].includes(resource)){
      if(type!=='leaves'&&type!=='pineLeaves'){
        addToBag(resource,volume);pickupVisualType=resource;pickupVisualCount=volume;
        trackSurvival('harvest',type,volume);
      }else{
        const roll=hash2(x*7+y,z*11-y),biomeId=worldRules.region(x,z);
        if((biomeId==='forest'||biomeId==='flowers')&&roll>.86){
          addToBag('wildBerry',1);pickupVisualType='wildBerry';trackSurvival('forage','wildBerry',1);
          toast('나뭇잎 사이에서 산딸기를 찾았어요!');
        }else if(roll>.72){addToBag('sapling',1);pickupVisualType='sapling'}
      }
    }
    if(survival&&data.natural&&type==='grass'){
      const biomeId=worldRules.region(x,z),roll=hash2(x*29+freeSimTick,z*31-freeSimTick);
      if(['meadow','flowers'].includes(biomeId)&&roll>.78){addToBag('wheatSeed',1);spawnPickupVisual('wheatSeed',x,y+.7,z,1);toast('풀 사이에서 밀 씨앗을 찾았어요!')}
      else if(biomeId==='forest'&&roll>.88){addToBag('carrot',1);spawnPickupVisual('carrot',x,y+.7,z,1);toast('숲 가장자리에서 야생 당근을 찾았어요!')}
      else if(biomeId==='pine'&&roll>.88){addToBag('potato',1);spawnPickupVisual('potato',x,y+.7,z,1);toast('흙 속에서 작은 감자를 찾았어요!')}
    }
    const nearby=[[1,0,0],[-1,0,0],[0,1,0],[0,0,1],[0,0,-1]]
      .map(v=>getBlock(x+v[0],y+v[1],z+v[2]))
      .find(d=>d?.type==='water');
    if(nearby&&!getBlock(x,y,z))
      setWorldBlock(x,y,z,{type:'water',level:Math.max(2,nearby.level||3),flow:true},true);
    spawnBreakParticles(x,y,z,type);
    if(pickupVisualType)spawnPickupVisual(pickupVisualType,x,y,z,pickupVisualCount);
    if(survival&&pickupVisualType)triggerFreeAvatarAction('pickup');
    sfx('break');tutorialSignal('free-break');updateFreeMission();markFreeWorldDirty();
    return true;
  }
  return false;
}
function toggleDoorAt(x,y,z){
  let data=getBlock(x,y,z);if(data?.type==='doorTop'){y-=1;data=getBlock(x,y,z)}
  if(!data||data.type!=='door')return false;
  data={...data,open:!data.open};setWorldBlock(x,y,z,data,true);refreshBlockMesh(x,y+1,z);
  if(data.open)cleanupUnsupportedAt(x,y+2,z,true);
  sfx('place');toast(data.open?'문을 열었어요.':'문을 닫았어요.');markFreeWorldDirty();return true;
}
function pickTargetBlock(){
  const hit=freeCenterHit();if(!hit)return;let type=hit.object.userData.type,data=getBlock(hit.object.userData.gx,hit.object.userData.gy,hit.object.userData.gz);
  if(type==='doorTop')type='door';
  if(type==='cuboid'&&data){currentCuboidSpec={dims:(data.dims||[1,1,1]).slice(),faceColors:(data.faceColors||DEFAULT_FACE_COLORS).slice()};syncShapeWorkbench()}
  if(!PLACEABLE_TYPES.includes(type))return;
  hotbarTypes[selectedHotbarSlot]=type;selectedType=type;buildHotbar();toast(blockDef(type).name+'을(를) 선택했어요.');
}
function setupShapeWorkbench(){
  syncShapeWorkbench();
  $('freeSelectShape').onclick=selectFreeGeometry;
  $('freeEdgeMode').onclick=()=>{freeElementMode='edge';updateFreeGeometryEditor()};
  $('freeVertexMode').onclick=()=>{freeElementMode='vertex';updateFreeGeometryEditor()};
  $('freeElementColor').oninput=e=>{freeElementColor=e.target.value};
  updateFreeGeometryEditor();
  $('shapeToHotbar').onclick=()=>{
    const limit=survivalCuboidMax();
    const dims=[$('shapeW').value,$('shapeH').value,$('shapeD').value]
      .map(v=>THREE.MathUtils.clamp(parseInt(v)||1,1,limit));
    const faceColors=Array.from({length:6},(_,i)=>$('faceColor'+i).value||DEFAULT_FACE_COLORS[i]);
    currentCuboidSpec={dims,faceColors};putOnHotbar('cuboid');toast('직육면체 '+dims.join('×')+'를 '+(selectedHotbarSlot+1)+'번 칸에 담았어요.');tutorialRefreshProgress();
  };
  $('facePaintColor').oninput=e=>{facePaintColor=e.target.value};
}
function syncShapeWorkbench(){
  if(!$('shapeW'))return;
  const max=survivalCuboidMax();
  for(const id of ['shapeW','shapeH','shapeD'])$(id).max=String(max);
  $('shapeW').value=Math.min(max,currentCuboidSpec.dims[0]);
  $('shapeH').value=Math.min(max,currentCuboidSpec.dims[1]);
  $('shapeD').value=Math.min(max,currentCuboidSpec.dims[2]);
  currentCuboidSpec.faceColors.forEach((c,i)=>{if($('faceColor'+i))$('faceColor'+i).value=c});
  $('facePaintColor').value=facePaintColor;
}
function selectFreeGeometry(){
  const hit=freeCenterHit(9);
  if(!hit?.object?.userData?.shapeKind||hit.object.userData.shapeKind!=='cuboid'){
    toast('정육면체나 직육면체를 십자선으로 가리킨 뒤 선택해 주세요.');return;
  }
  const u=hit.object.userData;freeSelectedShapeKey=worldKey(u.gx,u.gy,u.gz);
  updateFreeGeometryEditor();toast('도형을 선택했어요. 모서리나 꼭짓점에 색을 지정해 보세요.');
}
function updateFreeGeometryEditor(){
  $('freeEdgeMode').classList.toggle('active',freeElementMode==='edge');
  $('freeVertexMode').classList.toggle('active',freeElementMode==='vertex');
  $('freeElementColor').value=freeElementColor;
  const data=freeSelectedShapeKey?worldData.get(freeSelectedShapeKey):null;
  $('freeSelectedShape').textContent=data?'선택: '+(data.type==='cuboid'?(data.dims||[1,1,1]).join('×'):'1×1×1'):
    '선택한 도형 없음';
  const root=$('freeElementChoices');root.innerHTML='';
  const names=freeElementMode==='edge'?CUBOID_TOPOLOGY.edges.map(e=>e.join('')):
    CUBOID_TOPOLOGY.vertices.map(v=>v.id);
  const colors=data?.[freeElementMode==='edge'?'edgeColors':'vertexColors']||[];
  names.forEach((name,i)=>{
    const b=document.createElement('button');b.type='button';
    const chip=document.createElement('i');chip.style.background=colors[i]||'#cbd5e1';
    b.appendChild(chip);b.appendChild(document.createTextNode(name));
    b.onclick=()=>applyFreeGeometryColor(i);root.appendChild(b);
  });
}
function applyFreeGeometryColor(index){
  if(!freeSelectedShapeKey||!worldData.has(freeSelectedShapeKey)){
    toast('먼저 바라보는 도형을 선택해 주세요.');return;
  }
  const p=parseWorldKey(freeSelectedShapeKey),data=worldData.get(freeSelectedShapeKey);
  const field=freeElementMode==='edge'?'edgeColors':'vertexColors',total=freeElementMode==='edge'?12:8;
  const colors=Array.isArray(data[field])?data[field].slice():Array(total).fill(null);
  colors[index]=freeElementColor;setWorldBlock(...p,{...data,[field]:colors},true);
  clearMathOverlay();updateFreeGeometryEditor();saveFreeWorld();sfx('place');
}
function paintLookedFace(){
  const hit=freeCenterHit();if(!hit||hit.face?.materialIndex==null||hit.object.userData.shapeKind!=='cuboid'){toast('정육면체나 직육면체의 한 면을 바라보세요.');return}
  const x=hit.object.userData.gx,y=hit.object.userData.gy,z=hit.object.userData.gz,data=getBlock(x,y,z);if(!data)return;
  const fi=THREE.MathUtils.clamp(hit.face.materialIndex,0,5),base='#'+(blockDef(data).color||0xffffff).toString(16).padStart(6,'0');
  const colors=(data.faceColors||Array(6).fill(base)).slice();colors[fi]=facePaintColor;data.faceColors=colors;
  setWorldBlock(x,y,z,{...data,faceColors:colors},true);
  if(data.type==='cuboid')trackSurvival('paint',worldKey(x,y,z)+':'+fi);
  toast(FACE_NAMES[fi]+' 면을 '+facePaintColor+' 색으로 칠했어요.');sfx('place');saveFreeWorld();
}
function clearMathOverlay(){
  if(mathOverlayGroup){scene.remove(mathOverlayGroup);mathOverlayGroup=null}updateMathOverlay.lastSig='';
}
function shapeInfoFromHit(hit){
  if(!hit||hit.object.userData.shapeKind!=='cuboid')return null;
  const x=hit.object.userData.gx,y=hit.object.userData.gy,z=hit.object.userData.gz,data=getBlock(x,y,z);if(!data)return null;
  const dims=data.type==='cuboid'?(data.dims||[1,1,1]):[1,1,1];
  return {x,y,z,dims,data,faceIndex:THREE.MathUtils.clamp(hit.face?.materialIndex??4,0,5)};
}
function buildTopologyOverlay(info){
  clearMathOverlay();if(!info||mathLensMode===0)return;
  const g=new THREE.Group(),[w,h,d]=info.dims,cx=info.x+(w-1)/2,cy=info.y+h/2,cz=info.z+(d-1)/2;
  const vm=new Map();for(const v of CUBOID_TOPOLOGY.vertices)vm.set(v.id,new THREE.Vector3(cx+v.s[0]*w/2,cy+v.s[1]*h/2,cz+v.s[2]*d/2));
  if(mathLensMode===1){
    CUBOID_TOPOLOGY.edges.forEach(([a,b],i)=>{
      const p=vm.get(a),q=vm.get(b),geo=new THREE.BufferGeometry().setFromPoints([p,q]);
      const color=info.data.edgeColors?.[i]||'#ffe45c';
      const line=new THREE.LineSegments(geo,new THREE.LineBasicMaterial({color,depthTest:false}));
      line.renderOrder=20;g.add(line);
    });
    $('mathLensBadge').textContent='수학 렌즈 · 모서리 12개 (저장된 강조 색 포함)';
  }else if(mathLensMode===2){
    CUBOID_TOPOLOGY.vertices.forEach((v,i)=>{
      const color=info.data.vertexColors?.[i]||'#ff5f76';
      const dot=new THREE.Mesh(new THREE.SphereGeometry(.11,8,6),
        new THREE.MeshBasicMaterial({color,depthTest:false}));
      dot.position.copy(vm.get(v.id));dot.renderOrder=21;g.add(dot);
    });
    $('mathLensBadge').textContent='수학 렌즈 · 꼭짓점 A~H (저장된 강조 색 포함)';
  }else if(mathLensMode===3){
    const fi=info.faceIndex,opp=fi%2===0?fi+1:fi-1,geo=new THREE.BoxGeometry(w+.025,h+.025,d+.025);
    const mats=Array.from({length:6},(_,i)=>new THREE.MeshBasicMaterial({color:i===fi?0x59e391:(i===opp?0x6ea8ff:0xffffff),transparent:true,opacity:i===fi?.34:(i===opp?.22:0),depthWrite:false,side:THREE.DoubleSide}));
    const box=new THREE.Mesh(geo,mats);box.position.set(cx,cy,cz);box.renderOrder=19;g.add(box);
    $('mathLensBadge').textContent='수학 렌즈 · '+FACE_NAMES[fi]+' ↔ '+FACE_NAMES[opp]+' : 서로 평행';
  }
  mathOverlayGroup=g;scene.add(g);$('mathLensBadge').classList.remove('hidden');
}
function updateMathOverlay(){
  if(mathLensMode===0){if(mathOverlayGroup)clearMathOverlay();$('mathLensBadge').classList.add('hidden');return}
  const hit=freeCenterHit(),info=shapeInfoFromHit(hit);
  if(!info){if(mathOverlayGroup)clearMathOverlay();$('mathLensBadge').textContent='수학 렌즈 · 정육면체/직육면체를 바라보세요';$('mathLensBadge').classList.remove('hidden');return}
  const sig=[mathLensMode,info.x,info.y,info.z,info.faceIndex,...info.dims].join(':');if(sig!==updateMathOverlay.lastSig){buildTopologyOverlay(info);updateMathOverlay.lastSig=sig}
}
function toggleXray(){
  mathLensMode=(mathLensMode+1)%4;clearMathOverlay();
  const names=['수학 렌즈','모서리 보기','꼭짓점 보기','평행한 면 보기'];$('actionXray').textContent=names[mathLensMode];
  if(mathLensMode===0){$('mathLensBadge').classList.add('hidden');toast('수학 렌즈를 껐어요.')}
  else toast(names[mathLensMode]+' · 바라보는 정육면체/직육면체를 분석합니다.');
}
function buildFurnaceRecipes(){
  const box=$('furnaceRecipes');box.innerHTML='';
  FURNACE_RECIPES.forEach(recipe=>{
    const b=document.createElement('button');b.className='furnace-recipe';
    b.innerHTML='<b>'+recipe.label+'</b><small>'+recipe.note+(gameFreeMode==='survival'?' · 연료: 원목 또는 숯 1개':'')+'</small>';
    b.onclick=()=>runFurnace(recipe);box.appendChild(b);
  });
}
function toggleFurnace(force){
  const wasOpen=furnaceOpen;
  furnaceOpen=typeof force==='boolean'?force:!furnaceOpen;
  if(furnaceOpen){
    stopMining();
    if(lifePanelOpen){lifePanelOpen=false;$('lifePanel')?.classList.add('hidden')}
    if(inventoryOpen){inventoryOpen=false;$('blockInventory').classList.add('hidden')}
  }
  $('furnacePanel').classList.toggle('hidden',!furnaceOpen);
  if(furnaceOpen&&gameFreeMode==='survival'&&$('furnaceMessage'))
    $('furnaceMessage').textContent='어떤 재료든 한 번 가공하면 목표가 진행돼요. 연료로 원목 또는 숯 1개가 필요해요.';
  if(furnaceOpen&&document.pointerLockElement===canvas)document.exitPointerLock();
  $('lockNotice').classList.toggle('hidden',furnaceOpen||inventoryOpen||document.pointerLockElement===canvas);
  if(wasOpen&&!furnaceOpen&&!inventoryOpen&&!mobileModeEnabled&&mode==='free')resumeFreePointerLock();
}
function runFurnace(recipe){
  if(runFurnace.busy)return;
  const survival=gameFreeMode==='survival';
  if(survival){
    if(bagCount(recipe.input)<1){toast(blockDef(recipe.input).name+'이(가) 필요해요.');return}
    if(bagCount('charcoal')<1&&
      bagCount('log')<(recipe.input==='log'?2:1)){
      toast('불을 피울 원목이나 숯이 필요해요.');return;
    }
    consumeBag(recipe.input,1);
    consumeBag(bagCount('charcoal')?'charcoal':'log',1);
  }
  runFurnace.busy=true;
  $('furnaceMessage').textContent=blockDef(recipe.input).name+'을(를) 가열하는 중…';
  $('furnaceProgress').querySelector('i').style.width='0%';
  const start=performance.now(),duration=1800;
  const tick=()=>{
    const p=Math.min(1,(performance.now()-start)/duration);
    $('furnaceProgress').querySelector('i').style.width=(p*100)+'%';
    if(p<1)requestAnimationFrame(tick);
    else{
      if(survival){addToBag(recipe.output,1);trackSurvival('smelt',recipe.output)}
      else {hotbarTypes[selectedHotbarSlot]=recipe.output;selectedType=recipe.output;buildHotbar()}
      $('furnaceMessage').textContent=blockDef(recipe.output).name+
        ' 생성! '+(survival?'가방에 넣었어요.':'현재 핫바 칸에 넣었습니다.');
      toast(recipe.label+' · 물질 변화 완료');sfx('good');
      runFurnace.busy=false;saveFreeWorld();
    }
  };
  requestAnimationFrame(tick);
}
function markFreeWorldDirty(delay=1200){
  if(mode!=='free')return;
  freeSaveDirty=true;
  freeSaveDueAt=performance.now()+Math.max(250,delay);
}
function saveFreeWorld(){
  if(mode!=='free')return;
  syncTamedCreaturePositions();
  const data={version:15,worldMode:gameFreeMode,edits:Array.from(worldEdits.entries()),
    collected:Array.from(collected),hotbar:hotbarTypes,selected:selectedHotbarSlot,
    dayTime,cuboidSpec:currentCuboidSpec,facePaintColor,campLesson:{...survivalCamp},
    firstJourney,buildingWorks,projectGuide,survivalHome,trackedTarget,
    position:[camera.position.x,freePhysicsY,camera.position.z],
    bag:survivalBag,stage:survivalStage,adventures:[...survivalAdventureDone],legacyTerrain:legacyWorld,visitedBiomes:[...visitedBiomes],
    discoveredResources:[...discoveredResources],discoveredRecipes:[...discoveredRecipeIds],unreadRecipes:[...unreadRecipeIds],
    stats:survivalStats,finished:survivalFinished,exposure:survivalExposure,
    firstNightStarted,health:survivalHealth,worldTime:survivalWorldTime,
    equipment:{...survivalEquipment},damageCarry:survivalDamageCarry,
    creatureDefeats:{...creatureDefeats},creatureForageAt:{...creatureForageAt},
    pets:Object.values(tamedCreatures),tamingProgress:{...tamingProgress},seenCreatures:[...seenCreatureKinds],nextEliteSpawnCheckAt,
    discoveredLandmarks:[...discoveredLandmarks],restoredLandmarks:[...restoredLandmarks],
    unlockedTech:[...unlockedTech]};
  try{
    if(window.KidscadeStorage?.setJson('cubeArchitectWorldSaveV4_'+gameFreeMode,data)){
      lastFreeSave=performance.now();freeSaveDirty=false;freeSaveDueAt=0;return true;
    }
  }catch(e){console.warn('[Cube Architect save]',e)}
  return false;
}
function loadFreeWorld(){
  worldEdits=new Map();
  try{
    let data=window.KidscadeStorage?.getJson('cubeArchitectWorldSaveV4_'+gameFreeMode,null);
    if(!data&&gameFreeMode==='creative')
      data=window.KidscadeStorage?.getJson('cubeArchitectWorldSaveV3',null)||
        window.KidscadeStorage?.getJson('cubeArchitectWorldSaveV2',null);
    if(data){
      firstJourney=experience.readJourney(data.firstJourney);buildingWorks=experience.readWorks(data.buildingWorks);
      projectGuide=typeof data.projectGuide==='string'?data.projectGuide.slice(0,30):'';
      legacyWorld=!!(data.legacyTerrain||(data.version||0)<4);
      collected=new Set(data.collected||[]);
      visitedBiomes=new Set(data.visitedBiomes||[]);
      if(Array.isArray(data.hotbar)&&data.hotbar.length===9)hotbarTypes=data.hotbar;
      selectedHotbarSlot=Math.max(0,Math.min(8,data.selected||0));
      dayTime=Number.isFinite(data.dayTime)?data.dayTime:.28;
      if(data.cuboidSpec?.dims&&data.cuboidSpec?.faceColors)currentCuboidSpec=data.cuboidSpec;
      if(data.facePaintColor)facePaintColor=data.facePaintColor;
      if(Array.isArray(data.position)&&data.position.length===3&&data.position.every(Number.isFinite))
        savedFreePosition=data.position;
      if(gameFreeMode==='survival'){
        if(data.campLesson?.version===1){
          const saved=data.campLesson;survivalCamp={version:1,completed:Array.isArray(saved.completed)?saved.completed.filter(id=>window.CubeArchitectCamp.STEPS.some(s=>s.id===id)):[],dismissed:!!saved.dismissed,finished:!!saved.finished,baseline:saved.baseline||null,prepared:!!saved.prepared,site:Array.isArray(saved.site)&&saved.site.length===3&&saved.site.every(Number.isFinite)?saved.site:null};
        }
        survivalBag=data.bag&&typeof data.bag==='object'?data.bag:{};
        const home=data.survivalHome;
        survivalHome=home&&Array.isArray(home.bed)&&home.bed.length===3&&Array.isArray(home.position)&&home.position.length===3&&home.position.every(Number.isFinite)?
          {bed:home.bed.map(Number),position:home.position.map(Number)}:null;
        const track=data.trackedTarget;
        trackedTarget=track&&typeof track==='object'&&Number.isFinite(track.x)&&Number.isFinite(track.z)&&typeof track.label==='string'?
          {kind:String(track.kind||''),id:String(track.id||''),label:track.label.slice(0,40),x:Number(track.x),z:Number(track.z)}:null;
        survivalAdventureDone=new Set(Array.isArray(data.adventures)?data.adventures:[]);
        discoveredResources=new Set(Array.isArray(data.discoveredResources)?data.discoveredResources:[]);
        discoveredRecipeIds=new Set(Array.isArray(data.discoveredRecipes)?data.discoveredRecipes:[]);
        unreadRecipeIds=new Set(Array.isArray(data.unreadRecipes)?data.unreadRecipes:[]);
        for(const [type,n] of Object.entries(survivalBag))if((Number(n)||0)>0)discoveredResources.add(type);
        discoveredLandmarks=new Set(data.discoveredLandmarks||[]);
        restoredLandmarks=new Set(data.restoredLandmarks||[]);
        unlockedTech=new Set(data.unlockedTech||[]);
        for(const id of restoredLandmarks){
          const poi=poiRules.poiById(id);if(poi)unlockedTech.add(poi.tech.id);
        }
        if(data.stats){
          const savedStage=Math.max(0,Math.min(worldRules.GOALS.length-1,Number(data.stage)||0));
          survivalStats={...newSurvivalStats(),...data.stats,
            crafted:{...(data.stats.crafted||{})},
            placed:{...(data.stats.placed||{})},smelted:{...(data.stats.smelted||{})},
            cuboids:Array.isArray(data.stats.cuboids)?data.stats.cuboids:
              ((data.stats.placed?.cuboid||0)>0?['1x1x2']:[]),
            shelterBuilt:typeof data.stats.shelterBuilt==='boolean'?data.stats.shelterBuilt:savedStage>=6,
            paintedFaces:Array.isArray(data.stats.paintedFaces)?data.stats.paintedFaces:[],
            biomes:[...visitedBiomes],found:[...collected],
            restored:Array.isArray(data.stats.restored)?data.stats.restored:[...restoredLandmarks]};
          // Preserve late-game unlocks; recalculate early goals from successful actions.
          survivalStage=savedStage;
          if(savedStage<6){
            survivalStage=0;
            while(survivalStage<6&&worldRules.goalProgress(worldRules.GOALS[survivalStage],survivalStats)>=worldRules.GOALS[survivalStage].need)survivalStage++;
          }
          survivalFinished=!!data.finished;
        }else{
          const oldStage=Math.max(0,Math.min(6,Number(data.stage)||0));
          survivalStage=[0,1,2,3,5,7,8][oldStage];
          survivalStats={...newSurvivalStats(),
            harvestedWood:oldStage>=1?3:bagCount('log'),
            harvestedStone:oldStage>=5?8:bagCount('stone'),
            crafted:{planks:oldStage>=2?1:0,
              woodPick:oldStage>=4?1:0},
            placed:{workbench:oldStage>=3?1:0,
              furnace:oldStage>=6?1:0},
            placedBlocks:oldStage>=4?6:0,
            shelterBuilt:oldStage>=5,
            smelted:{glass:oldStage>=6?1:0},
            biomes:[...visitedBiomes],found:[...collected],restored:[...restoredLandmarks]};
        }
        survivalExposure=Math.max(0,Math.min(100,Number(data.exposure)||0));
        survivalHealth=Math.max(1,Math.min(5,Number(data.health)||5));
        const savedEquipment=data.equipment&&typeof data.equipment==='object'?data.equipment:{};
        survivalEquipment={head:'',chest:'',legs:'',feet:'',shield:'',...savedEquipment};
        for(const slot of ['head','chest','legs','feet','shield']){
          const type=survivalEquipment[slot];
          if(!gearDef(type)||gearDef(type).slot!==slot||bagCount(type)<1)survivalEquipment[slot]='';
        }
        survivalDamageCarry=Math.max(0,Math.min(.999,Number(data.damageCarry)||0));
        survivalWorldTime=Math.max(0,Number(data.worldTime)||0);
        creatureDefeats=data.creatureDefeats&&typeof data.creatureDefeats==='object'?{...data.creatureDefeats}:{};
        creatureForageAt=data.creatureForageAt&&typeof data.creatureForageAt==='object'?{...data.creatureForageAt}:{};
        tamingProgress={};if(data.tamingProgress&&typeof data.tamingProgress==='object')for(const [species,value] of Object.entries(data.tamingProgress)){
          const rule=TAME_RULES[species],n=Math.max(0,Math.floor(Number(value)||0));if(rule&&n>0&&n<rule.need)tamingProgress[species]=n;
        }
        tamedCreatures={};if(Array.isArray(data.pets))for(const raw of data.pets){
          if(!raw||!TAME_RULES[raw.species])continue;const id=String(raw.id||'').slice(0,64);if(!id)continue;
          tamedCreatures[id]={id,species:raw.species,name:String(raw.name||window.CubeArchitectCreatures?.SPECIES?.[raw.species]?.name||'친구').slice(0,10),
            mode:raw.mode==='stay'?'stay':'follow',x:Number(raw.x)||0,z:Number(raw.z)||5,homeX:Number(raw.homeX)||Number(raw.x)||0,homeZ:Number(raw.homeZ)||Number(raw.z)||5};
        }
        seenCreatureKinds=new Set(Array.isArray(data.seenCreatures)?data.seenCreatures:[]);
        nextEliteSpawnCheckAt=Math.max(survivalWorldTime,Number(data.nextEliteSpawnCheckAt)||0);
        firstNightStarted=!!data.firstNightStarted;
        if((survivalStats.harvestedWood||0)>0)discoveredResources.add('log');
        if((survivalStats.harvestedStone||0)>0)discoveredResources.add('stone');
        for(const [id,n] of Object.entries(survivalStats.crafted||{}))if((Number(n)||0)>0){
          const recipe=worldRules.RECIPES.find(r=>r.id===id);if(recipe)for(const type of Object.keys(recipe.gives||{}))discoveredResources.add(type);
        }
        for(const [type,n] of Object.entries(survivalStats.placed||{}))if((Number(n)||0)>0)discoveredResources.add(type);
        for(const [type,n] of Object.entries(survivalStats.smelted||{}))if((Number(n)||0)>0)discoveredResources.add(type);
        refreshRecipeDiscoveries(false);syncSurvivalAdventureState(false);updateCraftDiscoveryHud();
      }
      for(const [key,value] of data.edits||[]){
        const [x,y,z]=parseWorldKey(key);
        if(!inWorld(x,y,z))continue;
        worldEdits.set(key,value);setRawBlock(x,y,z,value);
      }
    }else if(gameFreeMode==='creative'){
      const old=window.KidscadeStorage?.getJson('cubeArchitectWorldSave',null);
      if(old?.blocks){
        const map=['grass','log','stone','sand','glass','brick'];
        for(const v of old.blocks){
          const data={type:map[v[3]]||'planks',playerBuilt:true};
          setRawBlock(v[0],v[1],v[2],data);markEdit(v[0],v[1],v[2],data);
        }
        collected=new Set(old.collected||[]);
      }
    }
    collectibles.forEach(m=>{
      if(collected.has(m.userData.collectible)){scene.remove(m);m.userData.gone=true}
    });
  }catch(e){console.warn('[Cube Architect load]',e)}
}
function reactFluidsNear(x,y,z){
  const here=getBlock(x,y,z);if(!here||!(here.type==='water'||here.type==='lava'))return;
  const other=here.type==='water'?'lava':'water',dirs=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
  for(const v of dirs){
    const nx=x+v[0],ny=y+v[1],nz=z+v[2],n=getBlock(nx,ny,nz);if(n?.type!==other)continue;
    const lavaPos=here.type==='lava'?[x,y,z]:[nx,ny,nz],lava=getBlock(...lavaPos);
    const result=(lava?.level||0)>=4&&(here.level||n.level||0)>=4?'obsidian':'stone';
    setWorldBlock(lavaPos[0],lavaPos[1],lavaPos[2],{type:result,formedBy:'water+lava'},true);
    const now=performance.now();if(now-lastChemToast>1800){toast(result==='obsidian'?'물과 용암이 만나 흑요석이 되었어요!':'물과 용암이 만나 돌이 되었어요!');lastChemToast=now}
    return;
  }
}
function simulateSand(){
  const moves=[];
  forEachActiveWorldBlock((key,d,x,y,z)=>{
    if(!(d.type==='sand'||d.type==='redSand'||d.type==='gravel')||y<=WORLD_MIN_Y+1)return;
    const below=getBlock(x,y-1,z);if(!below||blockDef(below).liquid||below.type==='fire')moves.push([x,y,z]);
  });
  moves.slice(0,40).forEach(([x,y,z])=>{const d=getBlock(x,y,z);if(!d||!blockDef(d).gravity||getBlock(x,y-1,z)&&!blockDef(getBlock(x,y-1,z)).liquid)return;removeWorldBlockData(x,y,z,true);setWorldBlock(x,y-1,z,{...d,falling:true},true)});
}
function flowInto(x,y,z,type,level){
  if(!inWorld(x,y,z)||level<=0)return false;const at=getBlock(x,y,z);
  if(at){
    if((type==='water'&&at.type==='lava')||(type==='lava'&&at.type==='water')){setWorldBlock(x,y,z,{type:level>=4&&(at.level||0)>=4?'obsidian':'stone',formedBy:'water+lava'},true);return true}
    if(['fire','flower','reed','sapling','torch'].includes(at.type)){
      removeWorldBlockData(x,y,z,true);
    }else return false;
  }
  setWorldBlock(x,y,z,{type,level,flow:true},true);reactFluidsNear(x,y,z);return true;
}
function openDoorCell(x,y,z,data=getBlock(x,y,z)){
  if(data?.type==='door')return !!data.open;
  if(data?.type==='doorTop'){
    const base=getBlock(x,Number.isFinite(data.baseY)?data.baseY:y-1,z);
    return !!(base?.type==='door'&&base.open);
  }
  return false;
}
function flowLiquidStep(x,y,z,type,level,dx,dy,dz){
  let tx=x+dx,ty=y+dy,tz=z+dz,steps=0;
  while(steps<2&&openDoorCell(tx,ty,tz)){
    tx+=dx;ty+=dy;tz+=dz;steps++;
  }
  return flowInto(tx,ty,tz,type,level);
}
function simulateLiquids(){
  const liquids=[];
  forEachActiveWorldBlock((key,d)=>{if((d.type==='water'||d.type==='lava')&&!d.naturalSea)liquids.push([key,d])});
  for(const [key,d] of liquids.slice(0,90)){
    const [x,y,z]=parseWorldKey(key),level=d.level||1;if(!getBlock(x,y,z))continue;
    const below=getBlock(x,y-1,z);
    if((!below||openDoorCell(x,y-1,z,below))&&y>WORLD_MIN_Y+1){
      flowLiquidStep(x,y,z,d.type,Math.max(level,2),0,-1,0);continue
    }
    if(level<=1)continue;if(d.type==='lava'&&freeSimTick%2)continue;
    const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
    for(let i=0;i<dirs.length;i++){
      const v=dirs[(i+freeSimTick)%4];flowLiquidStep(x,y,z,d.type,level-1,v[0],0,v[1]);
    }
  }
}
function hasNearbyLog(x,y,z,r=4){
  for(let dx=-r;dx<=r;dx++)for(let dy=-r;dy<=r;dy++)for(let dz=-r;dz<=r;dz++){
    if(Math.abs(dx)+Math.abs(dy)+Math.abs(dz)>r+2)continue;if(['log','pineLog'].includes(getBlock(x+dx,y+dy,z+dz)?.type))return true;
  }return false;
}
function simulatePlants(){
  const dirt=[],grass=[],leaves=[],saplings=[],crops=[];
  forEachActiveWorldBlock((key,d)=>{
    if(d.type==='dirt')dirt.push(key);else if(d.type==='grass')grass.push(key);
    else if(d.type==='leaves'||d.type==='pineLeaves')leaves.push(key);
    else if(d.type==='sapling')saplings.push(key);else if(FARM_CROP_TYPES.includes(d.type))crops.push(key);
  });
  grass.slice(0,80).forEach(key=>{const [x,y,z]=parseWorldKey(key),above=getBlock(x,y+1,z);if(above&&isOccluder(above)&&hash2(x+freeSimTick,z)<.08)setWorldBlock(x,y,z,{type:'dirt',natural:true},true)});
  for(let i=0;i<Math.min(18,dirt.length);i++){
    const key=dirt[(i*13+freeSimTick*7)%dirt.length],[x,y,z]=parseWorldKey(key);if(getBlock(x,y+1,z))continue;
    const near=[[1,0],[-1,0],[0,1],[0,-1]].some(v=>getBlock(x+v[0],y,z+v[1])?.type==='grass');
    const growThreshold=(weather==='rain'||weather==='storm')?.58:.72;
    if(near&&hash2(x+freeSimTick*.1,z-freeSimTick*.2)>growThreshold)setWorldBlock(x,y,z,{type:'grass',natural:true},true);
  }
  for(const key of leaves.slice(0,50)){
    const [x,y,z]=parseWorldKey(key),d=getBlock(x,y,z);if(!d)continue;
    if(d.playerBuilt||hasNearbyLog(x,y,z)){d.decay=0;continue}
    d.decay=(d.decay||0)+1;if(d.decay>5&&hash2(x+freeSimTick,z)>.48)removeWorldBlockData(x,y,z,true);
  }
  for(const key of saplings){
    const [x,y,z]=parseWorldKey(key),d=getBlock(x,y,z);if(!d)continue;d.age=(d.age||0)+((weather==='rain'||weather==='storm')?2:1);
    if(d.age>26&&!getBlock(x,y+1,z)&&!getBlock(x,y+2,z)&&!getBlock(x,y+3,z)){removeWorldBlockData(x,y,z,true);growTree(x,y,z,true);toast('묘목이 나무로 자랐어요.')}
  }
  for(const key of crops){
    const [x,y,z]=parseWorldKey(key),d=getBlock(x,y,z);if(!d)continue;
    const now=Math.max(0,survivalWorldTime),age=Math.max(0,Number(d.age)||0);
    const oldStage=Math.floor(Math.min(CROP_MATURE_AGE,age)/(CROP_MATURE_AGE/4));
    let wet=weather==='rain'||weather==='storm';
    if(!wet)for(let dx=-2;dx<=2&&!wet;dx++)for(let dz=-2;dz<=2&&!wet;dz++)if(getBlock(x+dx,y-1,z+dz)?.type==='water')wet=true;
    const last=Number.isFinite(Number(d.lastGrowAt))?Number(d.lastGrowAt):now;
    const realNow=Date.now()/1000,lastReal=Number.isFinite(Number(d.lastGrowReal))?Number(d.lastGrowReal):realNow;
    const worldElapsed=Math.max(0,now-last),realElapsed=Math.max(0,realNow-lastReal);
    const elapsed=Math.max(worldElapsed,realElapsed),rate=CROP_MATURE_AGE/CROP_MATURE_SECONDS;
    d.age=Math.min(CROP_MATURE_AGE,age+elapsed*rate*(wet?1.6:1));
    d.lastGrowAt=now;d.lastGrowReal=realNow;
    if(!Number.isFinite(Number(d.plantedAt)))d.plantedAt=Math.max(0,now-(d.age/rate));
    const newStage=Math.floor(Math.min(CROP_MATURE_AGE,d.age)/(CROP_MATURE_AGE/4));
    if(newStage!==oldStage||elapsed>=5||d.age>=CROP_MATURE_AGE){worldEdits.set(key,cloneBlockData(d));refreshBlockMesh(x,y,z);markFreeWorldDirty(900)}
  }
}
function simulateFire(){
  const fires=[];forEachActiveWorldBlock((key,d)=>{if(d?.type==='fire')fires.push(key)});
  const dirs=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
  for(const key of fires.slice(0,40)){
    const [x,y,z]=parseWorldKey(key),d=getBlock(x,y,z);if(!d)continue;
    if(dirs.some(v=>getBlock(x+v[0],y+v[1],z+v[2])?.type==='water')){removeWorldBlockData(x,y,z,true);continue}
    d.age=(d.age||0)+1;if(d.age>10){removeWorldBlockData(x,y,z,true);continue}
    const candidates=dirs.map(v=>[x+v[0],y+v[1],z+v[2]]).filter(p=>blockDef(getBlock(...p)).flammable);
    if(candidates.length&&hash2(x+freeSimTick,y+z)>.55){
      const p=candidates[freeSimTick%candidates.length];removeWorldBlockData(...p,true);setWorldBlock(p[0],p[1],p[2],{type:'fire',age:0,spread:true},true);
    }
  }
}
function simulateWorld(){
  freeSimTick++;simulateSand();simulateLiquids();simulateFire();if(freeSimTick%2===0)simulatePlants();
}
function updateDayNight(dt){
  const cycle=gameFreeMode==='survival'&&!firstNightStarted?780:420;
  dayTime=(dayTime+dt/cycle)%1;
  if(gameFreeMode==='survival'){
    if(dayTime>=.73&&!firstDuskWarned){
      firstDuskWarned=true;
      toast('해가 지고 있어요. 지붕과 벽이 있는 곳에서 밤을 보내 보세요.');
    }
    if(dayTime>=.82&&!firstNightStarted)firstNightStarted=true;
    if(dayTime>.3&&dayTime<.5)firstDuskWarned=false;
  }
  const sun=Math.max(.08,Math.sin(dayTime*Math.PI*2-Math.PI/2)*.5+.5),night=1-sun;
  const sky=new THREE.Color().setRGB(.10+.50*sun,.16+.62*sun,.28+.68*sun);
  scene.background.copy(sky);if(scene.fog)scene.fog.color.copy(sky);
  if(freeHemi)freeHemi.intensity=.28+1.15*sun;if(freeSun)freeSun.intensity=.12+1.25*sun;
  renderer.toneMappingExposure=.62+.48*sun;
  $('worldClock').textContent=dayTime<.2?'새벽':dayTime<.45?'아침':dayTime<.7?'낮':dayTime<.82?'저녁':'밤';
}
function setupWeather(){
  const count=520;rainPositions=new Float32Array(count*3);
  for(let i=0;i<count;i++){rainPositions[i*3]=(Math.random()-.5)*28;rainPositions[i*3+1]=Math.random()*22+3;rainPositions[i*3+2]=(Math.random()-.5)*28}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(rainPositions,3));
  rainSystem=new THREE.Points(geo,new THREE.PointsMaterial({color:0xbfdcff,size:.055,transparent:true,opacity:.72,depthWrite:false}));
  rainSystem.visible=false;scene.add(rainSystem);setWeather('clear',false);
}
function setWeather(next,announce=true){
  weather=next;weatherTimer=32+Math.random()*36;ambientAudioClock=0;
  if(rainSystem)rainSystem.visible=next==='rain'||next==='storm';
  const labels={clear:'맑음',rain:'비',fog:'안개',storm:'폭풍'};$('weatherState').textContent=labels[next]||next;
  if(scene.fog){scene.fog.near=next==='fog'?5:(next==='rain'||next==='storm'?12:24);scene.fog.far=next==='fog'?24:(next==='rain'?39:(next==='storm'?32:52))}
  if(announce)toast('날씨 변화 · '+(labels[next]||next));
}
function cycleWeather(){
  const states=['clear','rain','fog','storm'],i=states.indexOf(weather);setWeather(states[(i+1)%states.length]);
}
function updateWeather(dt,t){
  weatherTimer-=dt;if(weatherTimer<=0){
    const r=Math.random();setWeather(r<.48?'clear':r<.7?'rain':r<.86?'fog':'storm');
  }
  if(rainSystem?.visible){
    const a=rainSystem.geometry.attributes.position;
    for(let i=0;i<a.count;i++){
      let x=a.getX(i),y=a.getY(i),z=a.getZ(i);y-=dt*(weather==='storm'?21:15);x+=dt*(weather==='storm'?1.8:.45);
      if(y<camera.position.y-7){x=camera.position.x+(Math.random()-.5)*28;y=camera.position.y+10+Math.random()*13;z=camera.position.z+(Math.random()-.5)*28}
      if(Math.abs(x-camera.position.x)>17)x=camera.position.x+(Math.random()-.5)*26;if(Math.abs(z-camera.position.z)>17)z=camera.position.z+(Math.random()-.5)*26;
      a.setXYZ(i,x,y,z);
    }a.needsUpdate=true;
  }
  if(weather==='storm'&&Math.random()<dt*.075){lightningFlash=.13;sfx('bad')}
  if(lightningFlash>0){lightningFlash-=dt;renderer.toneMappingExposure=1.55}
  const night=dayTime>.76||dayTime<.16;
  critters.forEach(c=>{if(c.userData.kind==='firefly')c.visible=night&&!['storm'].includes(weather)});
}
function critterMaterial(color,emissive=0){return new THREE.MeshStandardMaterial({color,roughness:.85,emissive:emissive||0,emissiveIntensity:emissive?.8:0})}
function createRabbit(x,z){
  const g=new THREE.Group(),fur=critterMaterial(0xd9d1c7),pink=critterMaterial(0xf0a8b8);
  const body=new THREE.Mesh(new THREE.BoxGeometry(.62,.42,.42),fur),head=new THREE.Mesh(new THREE.BoxGeometry(.34,.34,.34),fur);
  body.position.y=.28;head.position.set(0,.42,-.36);
  const e1=new THREE.Mesh(new THREE.BoxGeometry(.1,.38,.1),pink),e2=e1.clone();e1.position.set(-.1,.72,-.37);e2.position.set(.1,.72,-.37);
  g.add(body,head,e1,e2);g.position.set(x,creatureGroundY(x,z,terrainHeight(x,z)+1),z);g.userData={kind:'rabbit',homeX:x,homeZ:z,dir:Math.random()*Math.PI,speed:.45+.25*Math.random(),turn:1+Math.random()*3};scene.add(g);return g;
}
function createBird(x,z,index){
  const g=new THREE.Group(),body=new THREE.Mesh(new THREE.BoxGeometry(.42,.25,.5),critterMaterial(index%2?0x5f87b8:0xb46f57));
  const wingMat=critterMaterial(index%2?0xdbe8f5:0xe9c39e),w1=new THREE.Mesh(new THREE.BoxGeometry(.55,.06,.28),wingMat),w2=w1.clone();
  w1.position.x=-.42;w2.position.x=.42;g.add(body,w1,w2);g.position.set(x,getHighestSolidY(x,z)+5+Math.random()*2,z);g.userData={baseY:g.position.y,kind:'bird',angle:Math.random()*Math.PI*2,radius:4+Math.random()*5,speed:.24+.14*Math.random(),wing1:w1,wing2:w2,centerX:x,centerZ:z};scene.add(g);return g;
}
function createFirefly(x,z,index){
  const g=new THREE.Group(),m=new THREE.Mesh(new THREE.SphereGeometry(.08,7,6),critterMaterial(0xffe761,0xffd938));g.add(m);
  const light=new THREE.PointLight(0xffdf55,.48,2.6,2);g.add(light);g.position.set(x,getHighestSolidY(x,z)+1.8+Math.random()*2,z);g.userData={baseY:g.position.y,kind:'firefly',phase:index*.9+Math.random()*3};scene.add(g);return g;
}
function spawnCritters(){
  critters.forEach(c=>scene.remove(c));critters=[];
  const ws=worldRules.WORLD_SCALE||1;
  [[-7,-7],[-10,4],[7,10],[11,-5],[-28,-12],[-35,-34],[-3,-39],[7,36],[29,-24]]
    .forEach(p=>critters.push(createRabbit(Math.round(p[0]*ws),Math.round(p[1]*ws))));
  [[-6,2],[7,-8],[3,11],[-26,-7],[30,-26],[4,36]]
    .forEach((p,i)=>critters.push(createBird(Math.round(p[0]*ws),Math.round(p[1]*ws),i)));
  for(let i=0;i<7;i++)critters.push(createFirefly(Math.round((-9+i*3)*ws),Math.round((-2+(i%3)*4)*ws),i));
  for(let i=0;i<5;i++)critters.push(createFirefly(Math.round((1+i*2)*ws),Math.round((34+(i%3)*2)*ws),i+8));
  spawnWildCreatures();
}

function biomeCenter(id,index=0){
  const rows=(worldRules.CENTERS||[]).filter(v=>v[2]===id);
  return rows[Math.min(index,Math.max(0,rows.length-1))]||[0,0,id];
}
function registerCreatureMeshes(root){
  creatureInteractables=creatureInteractables.filter(m=>m.userData?.creatureRoot!==root);
  root.traverse?.(o=>{
    if(!o.isMesh)return;
    o.userData={...o.userData,creaturePart:true,creatureRoot:root};
    creatureInteractables.push(o);
  });
}
function creatureGroundY(x,z,fromY=terrainHeight(Math.round(x),Math.round(z))+1){
  const cx=blockCoordFromWorld(x),cz=blockCoordFromWorld(z),start=Math.min(WORLD_MAX_Y,Math.floor(fromY+1.2));
  const bottom=Math.max(WORLD_MIN_Y,Math.floor(fromY-3));
  for(let y=start;y>=bottom;y--){
    const d=getBlock(cx,y,cz),top=collisionTopForData(d,cx,y,cz,x,z);
    if(top!==null)return top;
  }
  return terrainHeight(cx,cz)+1;
}
function placeWildCreature(id,x,z){
  const api=window.CubeArchitectCreatures,root=api?.create?.(id);if(!root)return null;
  const u=root.userData;
  u.homeX=x;u.homeZ=z;u.baseY=terrainHeight(x,z)+1;
  if(TAME_RULES[id])u.tameProgress=Math.max(0,Math.min(TAME_RULES[id].need,Number(tamingProgress[id])||0));
  root.position.set(x,u.baseY,z);
  scene.add(root);wildCreatures.push(root);registerCreatureMeshes(root);return root;
}
function despawnWildCreature(root){
  if(!root)return;
  scene.remove(root);
  creatureInteractables=creatureInteractables.filter(m=>m.userData?.creatureRoot!==root);
  wildCreatures=wildCreatures.filter(c=>c!==root);
}
function creatureRosterForBiome(biome,night,includeElite=false){
  const specs=Object.values(window.CubeArchitectCreatures?.SPECIES||{});
  return specs.filter(spec=>spec.biomes?.includes(biome)&&
    (!spec.nocturnal||night)&&(includeElite||!spec.elite)&&
    (!spec.elite||(!campActive()&&survivalWorldTime>=180))&&creatureRespawnReady(spec));
}
function creatureRespawnReady(spec){
  const last=Number(creatureDefeats[spec.id]);
  return !Number.isFinite(last)||survivalWorldTime-last>=(spec.respawn||60);
}
function creatureSpeciesCount(id){
  return wildCreatures.filter(c=>!c.userData.dead&&!c.userData.petId&&c.userData.species===id).length;
}
function spawnCreatureFromSpec(spec,biome){
  for(let tries=0;tries<14;tries++){
    const angle=Math.random()*Math.PI*2,dist=18+Math.random()*13;
    const x=Math.round(camera.position.x+Math.sin(angle)*dist),z=Math.round(camera.position.z+Math.cos(angle)*dist);
    if(!inWorld(x,0,z)||worldRules.region(x,z)!==biome||poiRules.isLandmarkClearZone?.(x,z,3))continue;
    const ground=terrainHeight(x,z),fluid=getBlock(x,ground+1,z)?.type;
    if((ground<SEA_LEVEL-1||fluid==='water')&&!['frog','slime'].includes(spec.id))continue;
    const root=placeWildCreature(spec.id,x,z);if(!root)continue;
    root.userData.spawnId=spec.id+':'+(++creatureSpawnSerial);
    if(spec.elite)root.userData.needsAssembly=true;
    return true;
  }
  return false;
}
function spawnDynamicCreature(){
  if(gameFreeMode!=='survival')return false;
  const night=dayTime>=.82||dayTime<.16,biome=worldRules.region(camera.position.x,camera.position.z);
  const roster=creatureRosterForBiome(biome,night,false)
    .filter(spec=>creatureSpeciesCount(spec.id)<(spec.spawnCap||1));
  if(!roster.length)return false;
  const spec=roster[Math.floor(Math.random()*roster.length)];
  return spawnCreatureFromSpec(spec,biome);
}
function tryRareEliteSpawn(){
  const biome=worldRules.region(camera.position.x,camera.position.z);
  if(biome!=='badlands'||campActive()||survivalWorldTime<180||survivalWorldTime<nextEliteSpawnCheckAt)return false;
  nextEliteSpawnCheckAt=survivalWorldTime+45+Math.random()*30;
  const spec=window.CubeArchitectCreatures?.SPECIES?.cubeGolem;
  if(!spec||!creatureRespawnReady(spec)||creatureSpeciesCount(spec.id)>=1||Math.random()>=.12)return false;
  return spawnCreatureFromSpec(spec,biome);
}
function maintainWildCreatures(force=false){
  if(gameFreeMode!=='survival')return;
  const max=mobileModeEnabled?5:7,normalTarget=mobileModeEnabled?4:6;
  for(const root of [...wildCreatures]){
    const dist=Math.hypot(root.position.x-camera.position.x,root.position.z-camera.position.z);
    if(root.userData.dead||(!root.userData.petId&&dist>56))despawnWildCreature(root);
  }
  const normalCount=()=>wildCreatures.filter(c=>!c.userData.petId&&!c.userData.spec?.elite).length;
  const wildCount=()=>wildCreatures.filter(c=>!c.userData.petId).length;
  let budget=force?normalTarget:2;
  while(normalCount()<normalTarget&&wildCount()<max&&budget-->0)spawnDynamicCreature();
  if(wildCount()<max)tryRareEliteSpawn();
}
function spawnWildCreatures(){
  for(const c of [...wildCreatures])despawnWildCreature(c);
  wildCreatures=[];creatureInteractables=[];creatureSpawnClock=0;
  if(gameFreeMode!=='survival')return;
  restoreTamedCreatures();maintainWildCreatures(true);
}
function startCubeGolemAssembly(root){
  const u=root?.userData;if(!u||u.species!=='cubeGolem'||u.assembling)return;
  u.assembling=true;u.assemblyStart=performance.now();u.assemblyDuration=1500;
  const group=new THREE.Group(),m=materialFor('stone');
  const targets=[
    [-.28,.25,0],[.28,.25,0],[-.28,.62,0],[.28,.62,0],
    [0,.92,0],[-.46,1.02,0],[.46,1.02,0],[0,1.35,0],
    [-.18,1.62,0],[.18,1.62,0]
  ];
  targets.forEach((target,i)=>{
    const shard=new THREE.Mesh(new THREE.BoxGeometry(.26,.26,.26),m);
    const a=i*2.399+Math.random()*.4,r=1.8+(i%3)*.48;
    shard.position.set(Math.sin(a)*r,.08+(i%4)*.13,Math.cos(a)*r);
    shard.userData.from=shard.position.clone();shard.userData.to=new THREE.Vector3(...target);
    shard.castShadow=true;group.add(shard);
  });
  u.assemblyGroup=group;root.add(group);if(u.visual)u.visual.visible=false;
}
function updateCubeGolemAssembly(root,t){
  const u=root.userData;if(!u.assembling)return false;
  const q=THREE.MathUtils.clamp((t-u.assemblyStart)/u.assemblyDuration,0,1),e=1-Math.pow(1-q,3);
  u.assemblyGroup?.children.forEach((shard,i)=>{
    shard.position.lerpVectors(shard.userData.from,shard.userData.to,e);
    shard.rotation.x+=.07;shard.rotation.y+=.09+(i%2)*.02;
  });
  if(q>=1){
    if(u.assemblyGroup){root.remove(u.assemblyGroup);u.assemblyGroup=null}
    u.assembling=false;if(u.visual)u.visual.visible=true;
    if(Math.hypot(root.position.x-camera.position.x,root.position.z-camera.position.z)<12)
      toast('큐브 골렘이 주변 블록을 모아 몸을 완성했어요!');
  }
  return u.assembling;
}
async function upgradeWildCreatureAsset(root){
  const u=root?.userData,spec=u?.spec,loader=window.CubeArchitectCreatureAssets;
  if(!root||!spec?.asset||!loader?.load||u.assetPending||u.assetReady)return;
  u.assetPending=true;
  try{
    const model=await loader.load(spec.asset);
    if(!root.parent||u.dead)return;
    if(u.visual)root.remove(u.visual);
    u.visual=model;model.visible=!u.assembling;root.add(model);u.assetReady=true;registerCreatureMeshes(root);
  }catch(e){console.warn('[Cube Architect creature asset]',spec.asset,e)}
  finally{u.assetPending=false}
}
function upgradeWildCreatureAssets(){
  wildCreatures.filter(root=>Math.hypot(root.position.x-camera.position.x,root.position.z-camera.position.z)<=42)
    .forEach(upgradeWildCreatureAsset);
}
window.addEventListener('cube-architect-world-assets-ready',()=>{if(mode==='free')rebuildAllWorldMeshes()});
window.addEventListener('cube-architect-creature-assets-ready',upgradeWildCreatureAssets);

function nearestCreatureLight(x,z,r=7){
  const cx=Math.round(x),cz=Math.round(z),cy=Math.floor(creatureGroundY(x,z));
  let best=null,bestD=Infinity;
  for(let dx=-r;dx<=r;dx++)for(let dz=-r;dz<=r;dz++){
    const d2=dx*dx+dz*dz;if(d2>r*r||d2>=bestD)continue;
    for(let dy=-1;dy<=3;dy++){
      const t=getBlock(cx+dx,cy+dy,cz+dz)?.type;
      if(t==='torch'||t==='fire'||t==='lava'){
        best={x:cx+dx,z:cz+dz,type:t};bestD=d2;break;
      }
    }
  }
  return best;
}
function supportDataBelow(wx,feetY,wz,maxDrop=1.4){
  const x=blockCoordFromWorld(wx),z=blockCoordFromWorld(wz);
  const start=Math.min(WORLD_MAX_Y,Math.floor(feetY+.08)),bottom=Math.max(WORLD_MIN_Y,Math.floor(feetY-maxDrop));
  let best=null,bestTop=-Infinity;
  for(let y=start;y>=bottom;y--){
    const data=getBlock(x,y,z),top=collisionTopForData(data,x,y,z,wx,wz);
    if(top!==null&&top<=feetY+.14&&top>bestTop){best={data,top,x,y,z};bestTop=top}
  }
  return best;
}
function playerStandingMaterial(){
  return supportDataBelow(camera.position.x,freePhysicsY-1.62,camera.position.z)?.data?.type||'';
}
function creatureStandingMaterial(root){
  return supportDataBelow(root.position.x,root.position.y,root.position.z)?.data?.type||'';
}
function creatureHint(spec){
  const hints={
    deer:'사슴은 가까이 다가가면 도망가요.',
    fox:'숲여우는 침엽수림을 빠르게 돌아다녀요.',
    snowFox:'설원여우는 눈밭에서 멀리 떨어져 움직이지 않아요.',
    frog:'개구리는 습지에서 폴짝이며 돌아다녀요.',
    camel:'낙타는 사막을 천천히 돌아다녀요. 가까이 가면 놀라서 거리를 둡니다.',
    shadowBug:'그림자 벌레는 밤에 나타나지만 횃불과 불빛을 싫어해요.',
    slime:'늪 슬라임은 모래·자갈 위에서는 움직임이 둔해져요.',
    burrower:'모래잠복충은 모래에서 강해요. 돌·판자 바닥 위로 올라가면 물러나요.',
    cubeGolem:'큐브 골렘은 강하지만 두 칸 높이 벽과 문으로 길을 막을 수 있어요.'
  };
  return hints[spec.id]||spec.name;
}
function walkCreature(root,dir,speed,dt,allowWater=false){
  const nx=root.position.x+Math.sin(dir)*speed*dt,nz=root.position.z+Math.cos(dir)*speed*dt;
  if(!inWorld(Math.round(nx),0,Math.round(nz)))return false;
  const nextY=creatureGroundY(nx,nz,root.position.y),dy=Math.abs(nextY-root.position.y);
  const cx=Math.round(nx),cz=Math.round(nz),feetCell=getBlock(cx,Math.floor(nextY),cz);
  const supportCell=getBlock(cx,Math.floor(nextY)-1,cz);
  const danger=[feetCell?.type,supportCell?.type].some(type=>['lava','fire','cactus'].includes(type));
  if(dy>1.15||danger||(!allowWater&&feetCell?.type==='water'))return false;
  root.position.x=nx;root.position.z=nz;root.position.y=nextY;root.rotation.y=dir+Math.PI;return true;
}
function walkCreatureWithDetour(root,dir,speed,dt,allowWater,t){
  const u=root.userData;
  if(u.detourUntil>t&&Number.isFinite(u.detourDir)&&walkCreature(root,u.detourDir,speed,dt,allowWater))return true;
  if(walkCreature(root,dir,speed,dt,allowWater)){
    u.detourUntil=0;u.detourDir=null;return true;
  }
  const side=u.detourSide||((Math.random()<.5)?1:-1);
  const tries=[dir+side*Math.PI/2,dir-side*Math.PI/2,dir+side*Math.PI/4,dir-side*Math.PI/4];
  for(const candidate of tries){
    if(!walkCreature(root,candidate,speed*.94,dt,allowWater))continue;
    u.detourSide=side;u.detourDir=candidate;u.detourUntil=t+650;return true;
  }
  u.detourSide=-side;u.detourUntil=t+260;return false;
}
function safeReturnEyeY(){return groundTopBelow(0,WORLD_MAX_Y+1.62,5)+1.62}
function updateCreatureHealthUi(){
  const el=$('survivalHealth');if(!el)return;
  el.classList.toggle('hidden',gameFreeMode!=='survival');
  el.textContent='♥'.repeat(Math.max(0,survivalHealth))+'♡'.repeat(Math.max(0,5-survivalHealth));
  el.title='생명 '+survivalHealth+'/5 · 방어 '+Math.round(survivalProtection()*100)+'%';
  updateSurvivalEquipmentUi();
}
function beginFreeAvatarDefeat(now=performance.now()){
  if(freeAvatarDefeated)return;
  freeAvatarDefeated=true;freeAvatarReturnAt=now+FREE_AVATAR_ACTION_MS.dead;
  freeViewBeforeDefeat=freeViewMode;
  stopMining();resetMobileInput();
  if(freeViewMode!=='third')setFreeView('third',false);
  triggerFreeAvatarAction('dead',FREE_AVATAR_ACTION_MS.dead,now);
}
function survivalReturnPoint(){
  const p=survivalHome?.position,b=survivalHome?.bed;
  if(Array.isArray(p)&&p.length===3&&p.every(Number.isFinite)&&Array.isArray(b)&&b.length===3){
    const bed=getBlock(...b);if(bed?.type==='bed')return p;survivalHome=null;
  }
  return [0,safeReturnEyeY(),5];
}
function returnAfterCreatureDefeat(){
  const p=survivalReturnPoint();camera.position.set(p[0],p[1],p[2]);freePhysicsY=camera.position.y;
  freeVelocityY=0;onGround=true;survivalHealth=5;survivalDamageCarry=0;healthRegenClock=0;survivalBreath=100;freeFallPeakY=freePhysicsY;
  freeAvatarDefeated=false;freeAvatarReturnAt=0;freeAvatarAction='';freeAvatarActionStartedAt=0;freeAvatarActionUntil=0;
  const restoreView=freeViewBeforeDefeat;freeViewBeforeDefeat=null;
  if(restoreView&&restoreView!==freeViewMode)setFreeView(restoreView,false);
  streamWorldMeshes(true);
  toast(survivalHome?'기절해서 내 침대로 돌아왔어요. 가방의 재료는 그대로예요.':'기절해서 시작 지점으로 돌아왔어요. 가방의 재료는 그대로예요.');
  updateCreatureHealthUi();updateBreathUi(false);saveFreeWorld();
}
function damageByCreature(root,t){
  if(campActive()||gameFreeMode!=='survival'||freeAvatarDefeated||t-lastCreatureDamage<1250||root.userData.dead||root.userData.assembling)return;
  lastCreatureDamage=t;healthRegenClock=0;root.userData.attackUntil=t+420;freeHitStopUntil=Math.max(freeHitStopUntil,t+50);
  const rawAmount=Math.max(1,root.userData.spec.damage||1),protection=survivalProtection();
  survivalDamageCarry+=rawAmount*(1-protection);
  const amount=Math.floor(survivalDamageCarry+1e-6);
  if(amount>0){survivalDamageCarry=Math.max(0,survivalDamageCarry-amount);survivalHealth=Math.max(0,survivalHealth-amount)}
  const dx=camera.position.x-root.position.x,dz=camera.position.z-root.position.z,len=Math.hypot(dx,dz)||1;
  const push=.62;moveFreeHorizontal(dx/len*push,dz/len*push);
  toast(amount>0?
    root.userData.spec.name+'에게 공격받았어요! · 방어 '+Math.round(protection*100)+'% · '+('♥'.repeat(survivalHealth)||'생명 0'):
    '🛡 장비가 '+root.userData.spec.name+'의 공격을 막았어요!');
  const hud=$('freeHud');hud?.classList.add('player-hurt');setTimeout(()=>hud?.classList.remove('player-hurt'),180);
  updateCreatureHealthUi();
  if(survivalHealth<=0)beginFreeAvatarDefeat(t);
  else triggerFreeAvatarAction('hurt',FREE_AVATAR_ACTION_MS.hurt,t);
}
function creatureRayHit(max=2.35){
  if(!creatureInteractables.length)return null;
  const {eye,maxFromPlayer}=setFreeInteractionRay(max);
  const creature=raycaster.intersectObjects(creatureInteractables,false)
    .find(h=>withinPlayerReach(h,eye,maxFromPlayer))||null;
  if(!creature)return null;
  const wall=raycaster.intersectObjects(worldInteractables,false)[0]||null;
  return wall&&wall.distance<creature.distance-.08?null:creature;
}
function creatureReward(root){
  for(const [type,n] of Object.entries(root.userData.spec.reward||{})){
    addToBag(type,n);spawnPickupVisual(type,root.position.x,root.position.y+.2,root.position.z,n);
  }
}
function queuePlayerStrike(root,power,now){
  pendingPlayerStrikes.push({root,power,at:now+135,expire:now+430});
}
function applyPlayerStrike(strike,t){
  const root=strike?.root,u=root?.userData;
  if(!root||!root.parent||!u||u.dead||u.assembling)return;
  const dist=Math.hypot(root.position.x-camera.position.x,root.position.z-camera.position.z);
  if(dist>3.05)return;
  u.hp-=strike.power;u.hurtUntil=t+300;u.knockbackUntil=t+230;
  u.knockDir=Math.atan2(root.position.x-camera.position.x,root.position.z-camera.position.z);
  root.scale.setScalar(1.08);spawnCombatHitParticles(root,strike.power);sfx('hit');freeHitStopUntil=Math.max(freeHitStopUntil,t+42);
  const cross=$('crosshair');cross?.classList.add('hit-confirm');setTimeout(()=>cross?.classList.remove('hit-confirm'),120);
  if(u.hp>0){toast(u.spec.name+' · '+u.hp+'/'+u.maxHp+' · 명중!');return}
  u.dead=true;creatureDefeats[u.spec.id]=survivalWorldTime;creatureReward(root);trackSurvival('hunt',u.spec.id,1);
  despawnWildCreature(root);
  toast(u.spec.name+'을(를) 물리쳤어요! 건축 재료를 얻었어요.');sfx('good');saveFreeWorld();
}
function updatePendingPlayerStrikes(t){
  if(!pendingPlayerStrikes.length)return;
  const keep=[];
  for(const strike of pendingPlayerStrikes){
    if(t>=strike.at)applyPlayerStrike(strike,t);
    else if(t<strike.expire)keep.push(strike);
  }
  pendingPlayerStrikes=keep;
}
function updateCreatureAttack(root,t,dist,allowed=true){
  const u=root.userData,range=.92+(u.spec.elite?.22:0);
  if(u.attackWindupAt){
    if(t>=u.attackWindupAt){
      u.attackWindupAt=0;
      if(allowed&&dist<=range+.12)damageByCreature(root,t);
    }
    return;
  }
  if(allowed&&dist<range&&t-lastCreatureDamage>=1250&&!freeAvatarDefeated){
    u.attackWindupAt=t+320;u.attackUntil=t+520;sfx('warn');
  }
}
function interactWildCreature(){
  if(gameFreeMode!=='survival')return false;
  const hit=creatureRayHit(2.9);if(!hit)return false;
  const root=hit.object.userData.creatureRoot,u=root?.userData;if(!root||u.dead)return false;
  const spec=u.spec;
  if(spec.kind==='hostile'){toast(spec.name+'은(는) 위험한 생물이에요. 좌클릭으로 방어하거나 거리를 두세요.');return true}
  if(TAME_RULES[spec.id])return openCreatureLifePanel(root);
  if(spec.forage)return collectCreatureForage(root);
  u.dir=Math.atan2(root.position.x-camera.position.x,root.position.z-camera.position.z);u.turn=.2;
  toast('생물 관찰 · '+creatureHint(spec));return true;
}
function hitWildCreature(){
  if(gameFreeMode!=='survival')return false;
  const hit=creatureRayHit();if(!hit)return false;
  const root=hit.object.userData.creatureRoot,u=root?.userData;if(!root||u.dead)return false;
  const now=performance.now();
  if(u.spec.kind!=='hostile'){
    if(u.petId){toast(petDisplayName(root)+'이(가) 깜짝 놀랐어요.');return true}
    u.dir=Math.atan2(root.position.x-camera.position.x,root.position.z-camera.position.z);
    u.turn=.1;toast(u.spec.name+'이(가) 놀라서 도망갔어요.');return true;
  }
  if(u.assembling){toast('큐브 골렘이 몸을 조립하는 중이에요!');return true}
  const tool=selectedType||'hand',sword=tool.endsWith('Sword');
  if(now-lastCreatureAttackAt<(sword?360:480))return true;
  lastCreatureAttackAt=now;triggerFreeAvatarAction('attack',FREE_AVATAR_ACTION_MS.attack,now);
  const power=tool==='ironSword'?4:tool==='stoneSword'?3:tool==='woodSword'?2:
    tool==='ironPick'?2:(u.spec.id==='cubeGolem'&&tool==='stonePick'?2:1);
  queuePlayerStrike(root,power,now);return true;
}
function updateWildCreatures(dt,t){
  if(gameFreeMode!=='survival')return;
  updatePendingPlayerStrikes(t);
  survivalWorldTime+=dt;creatureSpawnClock+=dt;
  if(creatureSpawnClock>2.5){creatureSpawnClock=0;maintainWildCreatures(false)}
  const night=dayTime>=.82||dayTime<.16,standing=playerStandingMaterial();
  if(survivalHealth>=5)healthRegenClock=0;
  else{
    healthRegenClock+=dt;
    if(healthRegenClock>28&&(dayTime>=.16&&dayTime<.82)){
      survivalHealth++;healthRegenClock=0;updateCreatureHealthUi();
    }
  }
  for(const root of [...wildCreatures]){
    const u=root.userData;if(u.dead||!root.parent)continue;
    const spec=u.spec;let dx=camera.position.x-root.position.x,dz=camera.position.z-root.position.z,dist=Math.hypot(dx,dz);
    const pet=petRecordForRoot(root);
    if(pet?.mode==='stay'&&dist>WORLD_VIEW_RADIUS+6){root.visible=false;continue}
    if(pet?.mode==='follow'&&dist>24){
      const catchup=petCatchupPosition(root);
      if(catchup){
        root.position.set(catchup.x,catchup.y,catchup.z);
        dx=camera.position.x-catchup.x;dz=camera.position.z-catchup.z;dist=Math.hypot(dx,dz);
      }
    }
    if(dist>42&&!pet){root.visible=false;continue}
    if(u.needsAssembly){
      if(dist>=16){root.visible=false;continue}
      u.needsAssembly=false;startCubeGolemAssembly(root);
    }
    upgradeWildCreatureAsset(root);
    if(dist<7&&!seenCreatureKinds.has(spec.id)&&t-lastCreatureHintAt>2400){
      seenCreatureKinds.add(spec.id);lastCreatureHintAt=t;refreshBookshelfMeshes();toast('생물 발견 · '+spec.name+' · '+creatureHint(spec));
    }
    const active=spec.kind!=='hostile'||(spec.id==='shadowBug'?night:true);
    root.visible=active;
    if(!active)continue;
    root.position.y=creatureGroundY(root.position.x,root.position.z,root.position.y);
    if(updateCubeGolemAssembly(root,t)){
      window.CubeArchitectCreatureAssets?.update?.(u.visual,dt,'idle');
      continue;
    }
    u.turn-=dt;
    if(u.turn<=0){u.turn=1.1+Math.random()*2.6;u.dir+=(Math.random()-.5)*1.9}
    let dir=u.dir,speed=spec.speed,animState='move';
    if(u.knockbackUntil>t){
      dir=u.knockDir;speed=3.9;
    }else if(pet){
      if(pet.mode==='follow'){
        if(dist>2.15){dir=Math.atan2(dx,dz);speed=Math.max(.68,spec.speed*1.35)}
        else {speed=0;animState='idle'}
      }else{
        const homeDist=Math.hypot(root.position.x-(pet.homeX??u.homeX),root.position.z-(pet.homeZ??u.homeZ));
        if(homeDist>2.6){dir=Math.atan2((pet.homeX??u.homeX)-root.position.x,(pet.homeZ??u.homeZ)-root.position.z);speed=Math.max(.32,spec.speed*.72)}
        else speed*=.42;
      }
    }else if(spec.kind==='passive'){
      if(dist<5){dir=Math.atan2(-dx,-dz);speed*=1.65}
      else if(Math.hypot(root.position.x-u.homeX,root.position.z-u.homeZ)>spec.radius){
        dir=Math.atan2(u.homeX-root.position.x,u.homeZ-root.position.z);
      }
      if(spec.id==='frog'){
        const hop=Math.max(0,Math.sin(t*.008+u.phase));u.visual.position.y=hop*.18;
        speed*=.75+.65*hop;animState='hop';
      }
    }else{
      if(spec.id==='shadowBug'&&t>=(u.nextLightScanAt||0)){u.nextLightScanAt=t+280;u.lightSource=nearestCreatureLight(root.position.x,root.position.z,7)} const lightSource=spec.id==='shadowBug'?u.lightSource:null; const torchFear=!!lightSource;
      const hardGround=spec.id==='burrower'&&!['sand','redSand'].includes(standing);
      if(torchFear){
        dir=Math.atan2(root.position.x-lightSource.x,root.position.z-lightSource.z);speed*=1.72;
      }else if(hardGround){
        dir=Math.atan2(-dx,-dz);speed*=1.55;
      }else if(dist<spec.radius+3&&(!spec.elite||(!campActive()&&survivalWorldTime>=180))){
        dir=Math.atan2(dx,dz);speed*=1.55;
      }else if(Math.hypot(root.position.x-u.homeX,root.position.z-u.homeZ)>spec.radius){
        dir=Math.atan2(u.homeX-root.position.x,u.homeZ-root.position.z);
      }
      if(spec.id==='slime'){
        const bob=Math.abs(Math.sin(t*.006+u.phase));u.visual.scale.y=.82+bob*.25;u.visual.scale.x=u.visual.scale.z=1.08-bob*.08;
        if(['sand','gravel','redSand'].includes(creatureStandingMaterial(root)))speed*=.62;
      }
      if(spec.id==='burrower')u.visual.position.y=Math.sin(t*.01+u.phase)*.09;
      updateCreatureAttack(root,t,dist,!torchFear&&!hardGround);
      if(u.attackUntil>t||u.attackWindupAt>t)animState='attack';
    }
    u.dir=dir;
    if(speed>0&&!walkCreatureWithDetour(root,dir,speed,dt,spec.id==='frog'||spec.id==='slime',t))u.dir+=Math.PI*.55;
    if(u.hurtUntil<t&&root.scale.x!==1)root.scale.setScalar(1);
    window.CubeArchitectCreatureAssets?.update?.(u.visual,dt,animState);
  }
}
function updateCritters(dt,t){
  critterClock+=dt;
  for(const c of critters){
    if(Math.hypot(c.position.x-camera.position.x,c.position.z-camera.position.z)>38)continue;
    const u=c.userData;
    if(u.kind==='rabbit'){
      u.turn-=dt;if(u.turn<=0){u.turn=1.4+Math.random()*3.2;u.dir+=(Math.random()-.5)*2.2}
      if(weather==='storm')u.speed=.28;
      const nx=c.position.x+Math.sin(u.dir)*u.speed*dt,nz=c.position.z+Math.cos(u.dir)*u.speed*dt;
      if(Math.abs(nx-u.homeX)>7||Math.abs(nz-u.homeZ)>7||
        !inWorld(Math.round(nx),0,Math.round(nz))){
        u.dir+=Math.PI*.7;continue;
      }
      const nextY=creatureGroundY(nx,nz,c.position.y),cx=Math.round(nx),cz=Math.round(nz);
      const feetCell=getBlock(cx,Math.floor(nextY),cz),supportCell=getBlock(cx,Math.floor(nextY)-1,cz);
      const danger=[feetCell?.type,supportCell?.type].some(type=>['water','lava','fire','cactus'].includes(type));
      if(Math.abs(nextY-c.position.y)>1.15||danger){u.dir+=Math.PI*.7;continue}
      c.position.x=nx;c.position.z=nz;c.position.y=nextY;c.rotation.y=u.dir+Math.PI;
    }else if(u.kind==='bird'){
      u.angle+=dt*u.speed*(weather==='storm'?.6:1);c.position.x=u.centerX+Math.sin(u.angle)*u.radius;c.position.z=u.centerZ+Math.cos(u.angle)*u.radius;
      c.position.y=u.baseY+Math.sin(t*.0015+u.angle)*1.2+(weather==='rain'?-1:0);c.rotation.y=u.angle;const flap=Math.sin(t*.014)*.35;u.wing1.rotation.z=flap;u.wing2.rotation.z=-flap;
    }else if(u.kind==='firefly'){
      c.position.y=u.baseY+Math.sin(t*.002+u.phase)*.65;c.position.x+=Math.sin(t*.001+u.phase)*dt*.12;c.position.z+=Math.cos(t*.0012+u.phase)*dt*.12;
    }
  }
}

function checkCollectibles(t){
  for(const m of collectibles){
    if(m.userData.gone)continue;
    m.rotation.y+=.02;
    m.position.y=m.userData.baseY+Math.sin(t*.002+m.position.x)*.12;
    const dx=camera.position.x-m.position.x,dz=camera.position.z-m.position.z,dist=Math.hypot(dx,dz);
    if(m.userData.miniPoi){
      m.visible=dist<=WORLD_VIEW_RADIUS+5;
      if(!m.visible)continue;
    }
    if(dist<1.65&&Math.abs(freePhysicsY-m.position.y)<2.8){
      const foundAt=m.position.clone();
      m.userData.gone=true;scene.remove(m);
      const id=m.userData.collectible;collected.add(id);
      if(gameFreeMode==='survival'){
        const prizes={bp1:{roof:2},bp2:{snowBrick:2},bp3:{sandstone:2},
          c1:{cactusDye:2},c2:{flowerDye:2}};
        const reward=m.userData.reward&&typeof m.userData.reward==='object'?m.userData.reward:(prizes[id]||{blueprintFragment:1});
        for(const [type,n] of Object.entries(reward)){
          addToBag(type,n);spawnPickupVisual(type,foundAt.x,foundAt.y,foundAt.z,n);
        }
        trackSurvival('find',id);
      }
      triggerFreeAvatarAction('pickup',FREE_AVATAR_ACTION_MS.pickup,t);
      toast((m.userData.miniPoi?'발견지 탐색 완료 · ':'')+m.userData.label+' · 보상을 가방에 넣었어요.');
      sfx('good');updateFreeMission();saveFreeWorld();
      const classicFound=['bp1','bp2','bp3','c1','c2'].filter(key=>collected.has(key)).length;
      if(gameFreeMode==='creative'&&classicFound===5){
        toast('세계의 다섯 발견물을 모두 찾았어요!');
        reportResult('free-exploration',100,true);
      }
    }
  }
  nearRuin=Math.hypot(camera.position.x-10,camera.position.z-9.5)<3.3;
  updateFreeMission();
}
function blockCoordFromWorld(v){return Math.floor(v+.5)}
function stairHighHalf(data,x,z,wx,wz){
  const facing=((data?.facing||0)%4+4)%4,dx=wx-x,dz=wz-z;
  return facing===0?dz>=0:facing===1?dx>=0:facing===2?dz<=0:dx<=0;
}
function collisionTopForData(data,x,y,z,wx=x,wz=z){
  if(!isSolidData(data,x,y,z))return null;
  if(data.type==='slab')return y+.5;
  if(data.type==='bed')return y+.45;
  if(data.type==='tilledSoil')return y+.88;
  if(data.type==='displayStand')return y+.75;
  if(data.type==='stairs')return y+(stairHighHalf(data,x,z,wx,wz)?1:.5);
  if(data.type==='roof'){
    const facing=((data.facing||0)%4+4)%4;
    const across=(facing%2===0)?Math.abs(wx-x):Math.abs(wz-z);
    return y+Math.max(.04,1-Math.min(.5,across)*2);
  }
  return y+1;
}
function thinBlockContains(data,x,z,wx,wz){
  const type=data?.type;
  if(!['door','glassPane','windowFrame'].includes(type))return true;
  const facing=((data.facing||0)%4+4)%4;
  const across=facing%2===0?Math.abs(wx-x):Math.abs(wz-z);
  const along=facing%2===0?Math.abs(wz-z):Math.abs(wx-x);
  const halfThickness=type==='door'?.09:.075;
  return across<=halfThickness&&along<=.5;
}
function pointHitsWorldBlock(wx,wy,wz){
  const x=blockCoordFromWorld(wx),y=Math.floor(wy),z=blockCoordFromWorld(wz),data=getBlock(x,y,z);
  if(!data)return false;
  let collisionData=data;
  if(data.type==='doorTop')collisionData=getBlock(x,y-1,z)||data;
  if(!thinBlockContains(collisionData,x,z,wx,wz))return false;
  const top=collisionTopForData(data,x,y,z,wx,wz);
  return top!==null&&wy<top-.002;
}
function playerCollidesAt(px,eyeY,pz){
  const r=.27,feet=eyeY-1.62;
  for(const ox of [-r,0,r])for(const oz of [-r,0,r])for(let sy=feet+.04;sy<=eyeY-.10;sy+=.2)
    if(pointHitsWorldBlock(px+ox,sy,pz+oz))return true;
  return false;
}
function groundTopBelow(px,eyeY,pz){
  const r=.22,feet=eyeY-1.62,samples=[[0,0],[-r,-r],[-r,r],[r,-r],[r,r]];
  let best=WORLD_MIN_Y+1;
  for(const [ox,oz] of samples){
    const wx=px+ox,wz=pz+oz,x=blockCoordFromWorld(wx),z=blockCoordFromWorld(wz);
    for(let y=Math.min(WORLD_MAX_Y,Math.floor(feet+.16));y>=WORLD_MIN_Y;y--){
      const data=getBlock(x,y,z),top=collisionTopForData(data,x,y,z,wx,wz);
      if(top!==null&&top<=feet+.18){best=Math.max(best,top);break}
    }
  }
  return best;
}
function stepHeightAt(px,eyeY,pz,maxStep=.56){
  const r=.27,feet=eyeY-1.62;
  let needed=0;
  for(const ox of [-r,r])for(const oz of [-r,r]){
    const wx=px+ox,wz=pz+oz,x=blockCoordFromWorld(wx),z=blockCoordFromWorld(wz),y=Math.floor(feet+.08);
    const data=getBlock(x,y,z),top=collisionTopForData(data,x,y,z,wx,wz);
    if(top!==null&&top>feet+.03)needed=Math.max(needed,top-feet);
  }
  return needed>0&&needed<=maxStep?needed:0;
}
function playerEnvironmentState(px=camera.position.x,eyeY=freePhysicsY,pz=camera.position.z){
  const r=.30,feet=eyeY-1.62,state={water:false,lava:false,fire:false,cactus:false,headUnderWater:false};
  for(const ox of [-r,0,r])for(const oz of [-r,0,r])for(const sy of [feet+.08,feet+.62,eyeY-.16]){
    const x=blockCoordFromWorld(px+ox),y=Math.floor(sy),z=blockCoordFromWorld(pz+oz),cell=getBlock(x,y,z),type=cell?.type;
    if(type==='water'&&sy<y+fluidHeight(cell))state.water=true;
    else if(type==='lava'&&sy<y+fluidHeight(cell))state.lava=true;
    else if(type==='fire')state.fire=true;
    else if(type==='cactus')state.cactus=true;
  }
  const headY=eyeY-.16,hx=blockCoordFromWorld(px),hy=Math.floor(headY),hz=blockCoordFromWorld(pz);
  const headBlock=getBlock(hx,hy,hz);
  state.headUnderWater=headBlock?.type==='water'&&headY<hy+fluidHeight(headBlock);
  return state;
}
function damageByEnvironment(state,t){
  if(campActive())return false;
  if(gameFreeMode!=='survival'||freeAvatarDefeated)return false;
  const kind=state.lava?'용암':state.fire?'불':state.cactus?'선인장':'';
  if(!kind)return false;
  const cooldown=state.lava?700:1050;if(t-lastEnvironmentDamage<cooldown)return false;
  lastEnvironmentDamage=t;healthRegenClock=0;
  survivalHealth=Math.max(0,survivalHealth-(state.lava?2:1));
  toast(kind+(state.lava?'에 들어갔어요! 빨리 빠져나오세요.':'에 닿았어요!')+' '+('♥'.repeat(survivalHealth)||'생명 0'));
  sfx('bad');updateCreatureHealthUi();
  if(survivalHealth<=0){beginFreeAvatarDefeat(t);return true}
  triggerFreeAvatarAction('hurt',FREE_AVATAR_ACTION_MS.hurt,t);return false;
}
function updateUnderwaterVisual(underwater){
  const overlay=$('underwaterOverlay');if(!overlay)return;
  overlay.classList.toggle('active',!!underwater&&mode==='free');
}
function updateBreathUi(underwater){
  const bar=$('breathBar'),fill=$('breathFill');if(!bar||!fill)return;
  const show=gameFreeMode==='survival'&&(underwater||survivalBreath<99.5);
  bar.classList.toggle('hidden',!show);fill.style.width=Math.round(survivalBreath)+'%';
  bar.setAttribute('aria-valuenow',String(Math.round(survivalBreath)));
  if(underwater&&$('survivalSafety')){
    $('survivalSafety').classList.remove('hidden');
    $('survivalSafety').textContent=survivalBreath<=30?'물속 · 숨이 얼마 안 남았어요':'물속 · 숨 참는 중';
  }
}
function updateBreath(state,dt,t){
  if(campActive()){survivalBreath=100;updateBreathUi(false);return false}
  updateUnderwaterVisual(state.headUnderWater);
  if(gameFreeMode!=='survival'){survivalBreath=100;updateBreathUi(false);return false}
  if(state.headUnderWater){
    survivalBreath=Math.max(0,survivalBreath-dt*9);
    if(survivalBreath<=0&&t-lastDrownDamage>=1400){
      lastDrownDamage=t;healthRegenClock=0;survivalHealth=Math.max(0,survivalHealth-1);
      toast('숨이 부족해요! 물 위로 올라가세요. '+('♥'.repeat(survivalHealth)||'생명 0'));
      sfx('bad');updateCreatureHealthUi();
      if(survivalHealth<=0){beginFreeAvatarDefeat(t);return true}
      triggerFreeAvatarAction('hurt',FREE_AVATAR_ACTION_MS.hurt,t);
    }
  }else survivalBreath=Math.min(100,survivalBreath+dt*34);
  updateBreathUi(state.headUnderWater);return false;
}
function damageByFall(distance){
  if(campActive())return false;
  if(gameFreeMode!=='survival'||distance<=4.25)return false;
  const amount=Math.min(4,Math.max(1,Math.floor((distance-4.25)/3)+1));
  healthRegenClock=0;survivalHealth=Math.max(0,survivalHealth-amount);
  toast('높은 곳에서 떨어졌어요! -'+amount+'♥ · '+('♥'.repeat(survivalHealth)||'생명 0'));
  sfx('bad');updateCreatureHealthUi();
  const now=performance.now();
  if(survivalHealth<=0){beginFreeAvatarDefeat(now);return true}
  triggerFreeAvatarAction('hurt',FREE_AVATAR_ACTION_MS.hurt,now);return false;
}
function queueFreeJump(){jumpQueuedUntil=performance.now()+160}
function safeFreeSpot(x,eye,z){
  const ground=groundTopBelow(x,eye,z),y=ground+1.62;
  if(ground<=WORLD_MIN_Y+1||Math.abs(y-eye)>2.1||playerCollidesAt(x,y,z))return null;
  const env=playerEnvironmentState(x,y,z);
  if(env.water||env.lava||env.fire||env.cactus)return null;
  return {x,y,z};
}
function escapeFreeOverlap(manual=false){
  if(mode!=='free'||freeAvatarDefeated)return false;
  const x=camera.position.x,z=camera.position.z,eye=freePhysicsY;
  let spot=null;
  search: for(const radius of [.35,.7,1.1,1.6,2.2,3.2,4.5]){
    for(const lift of [0,.5,1,2])for(let i=0;i<16;i++){
      const angle=i*Math.PI/8,nx=x+Math.cos(angle)*radius,nz=z+Math.sin(angle)*radius;
      if(Math.abs(nx)>WORLD_HALF-.7||Math.abs(nz)>WORLD_HALF-.7)continue;
      spot=safeFreeSpot(nx,eye+lift,nz);if(spot)break search;
    }
    if(spot)break;
  }
  if(!spot){if(manual)toast('가까운 빈자리를 찾지 못했어. 주변 블록을 하나 캐 보자.');return false}
  stopMining();camera.position.set(spot.x,spot.y,spot.z);freePhysicsY=spot.y;
  freeVelocityY=0;freeFallPeakY=spot.y;onGround=true;
  overlapSeconds=0;jumpQueuedUntil=0;lastGroundedAt=performance.now();
  if(manual)toast('여기서 다시 걸어 보자.');
  return true;
}
function moveFreeHorizontal(dx,dz){
  if(!dx&&!dz)return;
  // Only half-height geometry may auto-step. Full cubes now require an actual jump.
  let stepped=false;
  const tryAxis=(nextX,nextZ,axis)=>{
    if(!playerCollidesAt(nextX,camera.position.y,nextZ)){
      camera.position[axis]=axis==='x'?nextX:nextZ;return true;
    }
    if(!onGround||stepped)return false;
    const step=stepHeightAt(nextX,camera.position.y,nextZ);
    if(step<=0||playerCollidesAt(nextX,camera.position.y+step,nextZ))return false;
    camera.position.y+=step;camera.position[axis]=axis==='x'?nextX:nextZ;
    stepped=true;freeVelocityY=0;freeStepHop=1;return true;
  };
  tryAxis(camera.position.x+dx,camera.position.z,'x');
  tryAxis(camera.position.x,camera.position.z+dz,'z');
}
function nearestUndiscoveredRegion(x,z){
  const seen=new Set(visitedBiomes);
  const centers=(worldRules.CENTERS||[]).filter(([, ,id])=>id!=='meadow');
  return centers.filter(([, ,id])=>!seen.has(id))
    .map(([cx,cz,id])=>({cx,cz,id,dist:Math.round(Math.hypot(cx-x,cz-z))}))
    .sort((a,b)=>a.dist-b.dist)[0]||null;
}
function stopTrackedTarget(){
  if(!trackedTarget)return false;
  const label=trackedTarget.label||'목표';trackedTarget=null;updateTrackingGuide();updateFreeMission();saveFreeWorld();
  toast(label+' 추적을 끝냈어요.');return true;
}
function updateTrackingGuide(){
  const root=$('trackingGuide');if(!root)return;
  const active=mode==='free'&&gameFreeMode==='survival'&&trackedTarget&&
    Number.isFinite(trackedTarget.x)&&Number.isFinite(trackedTarget.z)&&!campActive();
  root.classList.toggle('hidden',!active);if(!active)return;
  const dx=trackedTarget.x-camera.position.x,dz=trackedTarget.z-camera.position.z;
  const dist=Math.max(0,Math.round(Math.hypot(dx,dz))),len=Math.max(.001,Math.hypot(dx,dz));
  const tx=dx/len,tz=dz/len,lookX=-Math.sin(yaw),lookZ=-Math.cos(yaw);
  const relative=Math.atan2(lookX*tz-lookZ*tx,lookX*tx+lookZ*tz),arrived=dist<=4;
  const arrow=$('trackingArrow'),label=$('trackingLabel'),stop=$('trackingStop');
  if(arrow)arrow.style.transform='rotate('+relative+'rad)';
  if(label)label.textContent=arrived?'도착 · '+trackedTarget.label:trackedTarget.label+' · '+dist+'칸';
  if(stop)stop.textContent=arrived?'도착 · 추적 끝':'추적 취소';
  root.classList.toggle('arrived',arrived);
}
function renderExplorationHint(){
  if(gameFreeMode!=='survival'){
    $('explorationHint').classList.add('hidden');return;
  }
  const show=!campActive()&&(survivalCamp.finished||survivalCamp.dismissed);
  $('explorationHint').classList.toggle('hidden',!show);
  if(!show)return;
  const x=Math.round(camera.position.x),z=Math.round(camera.position.z);
  if(trackedTarget&&Number.isFinite(trackedTarget.x)&&Number.isFinite(trackedTarget.z)){
    const dx=trackedTarget.x-x,dz=trackedTarget.z-z,dist=Math.round(Math.hypot(dx,dz));
    const direction=(dz<-4?'북':dz>4?'남':'')+(dx>4?'동':dx<-4?'서':'');
    $('explorationHint').textContent=dist<=4?'추적 목표 도착 · '+trackedTarget.label+' · 위의 「도착 · 추적 끝」을 눌러 마칠 수 있어요.':
      '추적 중 · '+trackedTarget.label+' · '+(direction||'근처')+'쪽 약 '+dist+'칸';
    return;
  }
  if(nearLandmarkPoi){
    if(restoredLandmarks.has(nearLandmarkPoi.id))
      $('explorationHint').textContent='탐험 기록 · '+nearLandmarkPoi.name+' 던전 클리어 · '+nearLandmarkPoi.tech.label;
    else $('explorationHint').textContent='발견 · '+nearLandmarkPoi.name+' · 원하면 Q/던전 입장으로 바로 탐험할 수 있어요.';
    return;
  }
  const smallPoi=nearestUncollectedMiniPoi(x,z,18);
  if(smallPoi){
    const dx=smallPoi.x-x,dz=smallPoi.z-z;
    const direction=(dz<-4?'북':dz>4?'남':'')+(dx>4?'동':dx<-4?'서':'');
    $('explorationHint').textContent='추천 탐험 · '+smallPoi.label+' · '+(direction||'바로 근처')+'쪽 '+Math.max(1,Math.round(smallPoi.dist))+'칸';
    return;
  }
  if(discoveredLandmarks.size){
    const landmark=nearestUnrestoredLandmark(x,z);
    if(landmark){
      const dx=landmark.center[0]-x,dz=landmark.center[1]-z;
      const direction=(dz<-5?'북':dz>5?'남':'')+(dx>5?'동':dx<-5?'서':'');
      $('explorationHint').textContent='추천 탐험 · '+landmark.name+' · '+(direction||'근처')+'쪽 약 '+landmark.distance+'칸 · 보상 '+landmark.tech.label;
      return;
    }
  }
  const target=nearestUndiscoveredRegion(x,z);
  if(!target){
    $('explorationHint').textContent='8개 바이옴을 모두 발견했어요. 이제도 원하는 곳을 자유롭게 돌아다녀 보세요.';
    return;
  }
  const dx=target.cx-x,dz=target.cz-z;
  const directions=(dz< -5?'북':dz>5?'남':'')+(dx>5?'동':dx< -5?'서':'');
  const info=worldRules.BIOME_REWARDS[target.id];
  $('explorationHint').textContent='추천 탐험 · '+worldRules.BIOMES[target.id].name+
    ' · '+(directions||'근처')+'쪽 약 '+target.dist+'칸 · '+blockDef(info.resource).name;
}
function renderSurvivalSafety(shelter){
  if(gameFreeMode!=='survival'){
    $('survivalHealth')?.classList.add('hidden');
    $('survivalSafety').classList.add('hidden');
    $('exposureBar').classList.add('hidden');
    $('survivalReturn').classList.add('hidden');
    return;
  }
  updateCreatureHealthUi();
  const night=dayTime>=.82||dayTime<.16;
  const danger=survivalExposure>=70;
  $('survivalSafety').classList.remove('hidden');
  $('survivalSafety').textContent=shelter?.sheltered?'거점 안 · 안전':
    survivalExposure>=85?'매우 추움 · 귀환 가능':
    danger?'추위 심함':survivalExposure>=30?'추위 주의':
    night?'밤 · 야외':weather==='rain'||weather==='storm'?'비 · 야외':'안전함';
  $('exposureBar').classList.toggle('hidden',survivalExposure<1);
  $('exposureFill').style.width=Math.round(survivalExposure)+'%';
  $('exposureBar').setAttribute('aria-valuenow',String(Math.round(survivalExposure)));
  $('survivalReturn').classList.toggle('hidden',survivalExposure<85||
    performance.now()-lastEmergencyReturn<90000);
}
function emergencyReturn(){
  if(gameFreeMode!=='survival'||survivalExposure<85||
    performance.now()-lastEmergencyReturn<90000)return;
  const p=survivalReturnPoint();camera.position.set(p[0],p[1],p[2]);
  freePhysicsY=camera.position.y;
  freeVelocityY=0;onGround=true;survivalExposure=15;survivalBreath=100;freeFallPeakY=freePhysicsY;
  lastEmergencyReturn=performance.now();streamWorldMeshes(true);
  toast(survivalHome?'추위를 피해 내 침대로 귀환했어요.':'시작 지점으로 귀환했어요. 재료는 잃지 않아요. 지붕과 벽을 지어 보세요.');
  renderSurvivalSafety(null);saveFreeWorld();
}
function groundSurfaceType(){
  const feet=freePhysicsY-1.62,x=blockCoordFromWorld(camera.position.x),z=blockCoordFromWorld(camera.position.z);
  for(let y=Math.floor(feet-.03);y>=Math.max(WORLD_MIN_Y,Math.floor(feet)-2);y--){
    const d=getBlock(x,y,z);if(d&&isSolidData(d,x,y,z))return d.type;
  }
  return worldRules.BIOMES[worldRules.region(x,z)]?.ground||'grass';
}
function updateFootstepAudio(){
  const x=camera.position.x,z=camera.position.z;
  if(lastFootstepX===null||lastFootstepZ===null){lastFootstepX=x;lastFootstepZ=z;return}
  const dist=Math.hypot(x-lastFootstepX,z-lastFootstepZ);
  lastFootstepX=x;lastFootstepZ=z;
  if(dist>3){footstepDistanceAcc=0;return}
  if(freeFlying){footstepDistanceAcc=0;return}
  if(freeFluidKind){
    footstepDistanceAcc+=dist;
    if(footstepDistanceAcc>=1.35){
      footstepDistanceAcc%=1.35;
      noiseBurst(.07,freeFluidKind==='lava'?.006:.008,freeFluidKind==='lava'?520:1800);
    }
    return;
  }
  if(!onGround){footstepDistanceAcc=0;return}
  footstepDistanceAcc+=dist;
  const stride=(freeKeys.ControlLeft||freeKeys.ControlRight)?1.12:1.42;
  if(footstepDistanceAcc>=stride){
    footstepDistanceAcc%=stride;stepSfx(groundSurfaceType(),false);
  }
}
function nearAmbientHeat(){
  const px=Math.round(camera.position.x),pz=Math.round(camera.position.z),py=Math.floor(freePhysicsY-1.62);
  for(let dx=-4;dx<=4;dx++)for(let dz=-4;dz<=4;dz++){
    if(dx*dx+dz*dz>18)continue;
    for(let dy=0;dy<=3;dy++){
      const type=getBlock(px+dx,py+dy,pz+dz)?.type;
      if(type==='fire'||type==='furnace'||type==='torch'||(type==='campfire'&&getBlock(px+dx,py+dy,pz+dz)?.lit!==false))return true;
    }
  }
  return false;
}
function updateAmbientAudio(dt,t){
  if(!audioCtx||audioCtx.state!=='running'||inventoryOpen||furnaceOpen||lifePanelOpen)return;
  ambientAudioClock-=dt;if(ambientAudioClock>0)return;
  const biome=worldRules.region(Math.round(camera.position.x),Math.round(camera.position.z));
  const night=dayTime>=.82||dayTime<.16;
  if(weather==='storm'){ambientSfx('storm');ambientAudioClock=1.45;return}
  if(weather==='rain'){ambientSfx('rain');ambientAudioClock=1.95;return}
  if(nearAmbientHeat()){ambientSfx('fire');ambientAudioClock=2.25;return}
  if(['snow','desert','badlands'].includes(biome)){ambientSfx('wind');ambientAudioClock=4.8;return}
  if(biome==='marsh'){ambientSfx('marsh');ambientAudioClock=night?3.8:5.2;return}
  if(!night&&['meadow','forest','pine','flowers'].includes(biome)){ambientSfx('birds');ambientAudioClock=5.5;return}
  ambientAudioClock=4.2;
}
function updateSurvivalEnvironment(dt){
  if(gameFreeMode!=='survival')return;
  survivalTimeAcc+=dt;
  if(campActive())survivalTimeAcc=.5;
  if(survivalTimeAcc<.5)return;
  const delta=campActive()?0:survivalTimeAcc;survivalTimeAcc=0;
  const biomeId=worldRules.region(Math.round(camera.position.x),Math.round(camera.position.z));
  const night=dayTime>=.82||dayTime<.16,storm=weather==='storm';
  const feet=freePhysicsY-1.62;
  const shelter=worldRules.shelterAt(getBlock,camera.position.x,feet,camera.position.z);
  const px=Math.round(camera.position.x),pz=Math.round(camera.position.z),py=Math.floor(feet);
  let lit=false;
  for(let dx=-3;dx<=3&&!lit;dx++)for(let dz=-3;dz<=3&&!lit;dz++)
    if(dx*dx+dz*dz<=10)for(let dy=0;dy<=3;dy++){
      const d=getBlock(px+dx,py+dy,pz+dz);
      if(d&&(d.type==='torch'||d.type==='furnace'||d.type==='fire'||(d.type==='campfire'&&d.lit!==false))){
        lit=true;break;
      }
    }
  const before=survivalExposure;
  survivalExposure=worldRules.exposureStep(survivalExposure,delta,{
    night,storm,rain:weather==='rain',cold:biomeId==='snow',sheltered:shelter.sheltered,lit
  });
  if(shelter.playerBuilt&&!survivalStats.shelterBuilt){
    survivalStats.shelterBuilt=true;
    toast('거점 완성! 직접 만든 지붕과 벽이 실제로 몸을 보호해요.');
    advanceSurvival();tutorialRefreshProgress();
  }
  if(shelter.sheltered&&night&&!nightShelterNotice){
    nightShelterNotice=true;toast('내가 지은 거점이 밤의 추위를 막아 주고 있어요.');
  }
  if(!night)nightShelterNotice=false;
  if(before<35&&survivalExposure>=35)toast('추위가 느껴져요. 지붕을 찾거나 횃불 가까이 가 보세요.');
  if(before<75&&survivalExposure>=75)toast('많이 추워요. 거점에 들어가거나 귀환할 수 있어요.');
  renderSurvivalSafety(shelter);
}
function updateFree(dt,t){
  updateCampLesson(t);
  if(t<freeHitStopUntil){
    updateDayNight(0);updateWeather(0,t);updateMathOverlay();return;
  }
  if(freeAvatarDefeated){
    stopMining();updateDayNight(0);updateWeather(0,t);updateMathOverlay();
    camera.rotation.y=yaw;camera.rotation.x=pitch;
    if(t>=freeAvatarReturnAt)returnAfterCreatureDefeat();
    return;
  }
  // Pause the world while young players are reading recipes or using the furnace.
  // Life panels pause the simulation so a wild animal cannot walk away while a child is feeding or naming it.
  if(inventoryOpen||furnaceOpen||worksOpen||lifePanelOpen){
    updateDayNight(0);updateWeather(0,t);updateMathOverlay();
    updateUnderwaterVisual(playerEnvironmentState(camera.position.x,freePhysicsY,camera.position.z).headUnderWater);return;
  }
  const lessonSafe=campActive();
  updateDayNight(lessonSafe?0:dt);updateWeather(lessonSafe?0:dt,t);updateCritters(dt,t);updateWildCreatures(dt,t);updateMathOverlay();
  updateSurvivalEnvironment(lessonSafe?0:dt);updateMining(dt);updateAmbientAudio(dt,t);
  freeStepHop=Math.max(0,freeStepHop-dt*6.2);
  freeSimAccum+=dt;
  if(freeSimAccum>.55){freeSimAccum=0;simulateWorld()}
  const displayEye=camera.position.y;
  // Physics and visual camera heights are intentionally separate.
  camera.position.y=freePhysicsY;
  const environment=playerEnvironmentState(camera.position.x,freePhysicsY,camera.position.z);
  const previousFluid=freeFluidKind;
  freeFluidKind=environment.lava?'lava':environment.water?'water':'';
  if(mobileModeEnabled&&previousFluid!==freeFluidKind)refreshMobileFly();
  if(damageByEnvironment(environment,t))return;
  if(updateBreath(environment,dt,t))return;
  const fluidSpeed=freeFluidKind==='water'?.58:freeFluidKind==='lava'?.35:1;
  const speed=((freeKeys.ControlLeft||freeKeys.ControlRight)?6.6:4.0)*
    (gameFreeMode==='survival'&&survivalExposure>=70?.83:1)*fluidSpeed;
  const forward=new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw));
  const right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
  const move=new THREE.Vector3();
  if(seatedFurniture&&(freeKeys.KeyW||freeKeys.KeyS||freeKeys.KeyA||freeKeys.KeyD||freeKeys.ArrowUp||freeKeys.ArrowDown||freeKeys.ArrowLeft||freeKeys.ArrowRight||freeKeys.Space||Math.hypot(mobileMove.x,mobileMove.y)>.12))leaveChair();
  if(mobileModeEnabled){
    const magnitude=Math.min(1,Math.hypot(mobileMove.x,mobileMove.y));
    if(magnitude>.12){
      const analog=(magnitude-.12)/.88;
      move.addScaledVector(forward,mobileMove.y/magnitude);
      move.addScaledVector(right,mobileMove.x/magnitude);
      if(move.lengthSq()>0)move.normalize().multiplyScalar(speed*dt*analog);
    }
  }else{
    if(freeKeys.KeyW||freeKeys.ArrowUp)move.addScaledVector(forward,-1);
    if(freeKeys.KeyS||freeKeys.ArrowDown)move.add(forward);
    if(freeKeys.KeyA||freeKeys.ArrowLeft)move.addScaledVector(right,-1);
    if(freeKeys.KeyD||freeKeys.ArrowRight)move.add(right);
    if(move.lengthSq()>0)move.normalize().multiplyScalar(speed*dt);
  }
  let landedThisFrame=false;
  if(freeFlying&&gameFreeMode==='creative'){
    camera.position.add(move);
    if(freeKeys.Space)camera.position.y+=speed*dt;
    if(freeKeys.ShiftLeft||freeKeys.ShiftRight)camera.position.y-=speed*dt;
    freeVelocityY=0;onGround=false;freeFallPeakY=camera.position.y;
  }else{
    const physicsSteps=Math.max(1,Math.ceil(dt/.008));
    const motionDt=dt/physicsSteps;
    for(let physicsStep=0;physicsStep<physicsSteps;physicsStep++){
    if(onGround)lastGroundedAt=t;
    if(!freeFluidKind&&jumpQueuedUntil>=t&&(onGround||t-lastGroundedAt<=100)){
      freeVelocityY=FREE_JUMP_SPEED;onGround=false;jumpQueuedUntil=0;lastGroundedAt=-Infinity;
    }
    moveFreeHorizontal(move.x/physicsSteps,move.z/physicsSteps);
    const wasGrounded=onGround;
    if(freeFluidKind){
      freeFallPeakY=camera.position.y;
      const swimUp=!!freeKeys.Space,swimDown=!!(freeKeys.ShiftLeft||freeKeys.ShiftRight);
      freeVelocityY+=(swimUp?8.4:0)*motionDt-(swimDown?6.2:0)*motionDt-2.6*motionDt;
      freeVelocityY=THREE.MathUtils.clamp(freeVelocityY,-2.5,3.4);
    }else{
      if(wasGrounded)freeFallPeakY=camera.position.y;
      else freeFallPeakY=Math.max(freeFallPeakY,camera.position.y);
      freeVelocityY-=14*motionDt;
    }
    let nextY=camera.position.y+freeVelocityY*motionDt;
    if(freeVelocityY<=0){
      const ground=groundTopBelow(camera.position.x,camera.position.y,camera.position.z);
      if(nextY-1.62<=ground){
        nextY=ground+1.62;freeVelocityY=0;
        if(!wasGrounded&&!freeFluidKind&&damageByFall(Math.max(0,freeFallPeakY-nextY)))return;
        landedThisFrame=!wasGrounded&&!freeFluidKind;
        onGround=true;freeFallPeakY=nextY;
      }else onGround=false;
    }else if(playerCollidesAt(camera.position.x,nextY,camera.position.z)){
      freeVelocityY=0;nextY=camera.position.y;
    }else onGround=false;
    camera.position.y=nextY;
    }
  }
  camera.position.x=THREE.MathUtils.clamp(camera.position.x,-WORLD_HALF+.7,WORLD_HALF-.7);
  camera.position.z=THREE.MathUtils.clamp(camera.position.z,-WORLD_HALF+.7,WORLD_HALF-.7);
  camera.position.y=THREE.MathUtils.clamp(camera.position.y,WORLD_MIN_Y+1.7,WORLD_MAX_Y+8);
  freePhysicsY=camera.position.y;
  if(!freeFlying&&playerCollidesAt(camera.position.x,freePhysicsY,camera.position.z)){
    overlapSeconds+=dt;
    if(overlapSeconds>.18&&!escapeFreeOverlap())overlapSeconds=-.5;
  }else overlapSeconds=0;
  updateSimpleSurvivalUi();
  if(t-journeyUiAt>200){journeyUiAt=t;updateFirstJourney()}
  if(landedThisFrame)stepSfx(groundSurfaceType(),true);
  if(freeFlying&&gameFreeMode==='creative')camera.position.y=freePhysicsY;
  else{
    const targetEye=freePhysicsY-(seatedFurniture?.5:0),delta=targetEye-displayEye;
    const maxChange=(delta>=0?4.5:5.1)*Math.min(dt,.055);
    camera.position.y=displayEye+THREE.MathUtils.clamp(delta,-maxChange,maxChange);
    if(Math.abs(targetEye-camera.position.y)<.008)camera.position.y=targetEye;
  }
  camera.rotation.y=yaw;camera.rotation.x=pitch;
  updateFootstepAudio();
  streamWorldMeshes();
  checkCollectibles(t);updateTrackingGuide();
}

/* Pointer-lock is optional. Safari on iPhone uses touch-look and these controls. */
function resetMobileInput(){
  if(miningSource==='mobile'||miningSource==='radial')stopMining();
  closeMobileActionRadial();
  mobileMove.x=0;mobileMove.y=0;mobileLookPointerId=null;mobileLookLast=null;mobileJoyPointerId=null;
  if($('mobileJoystickKnob'))$('mobileJoystickKnob').style.transform='translate(-50%,-50%)';
  if(typeof challengeKeys!=='undefined'){challengeKeys.Space=false;challengeKeys.ShiftLeft=false}
  if(typeof freeKeys!=='undefined'){freeKeys.Space=false;freeKeys.ShiftLeft=false}
}
function configureMobileMode(target){
  const active=mobileModeEnabled&&(target==='challenge'||target==='free'||target==='dungeon');
  if(target!=='free')mobileUtilityOpen=false;
  setVisible('mobileControls',active);
  $('mobileControls').classList.toggle('challenge-mobile',active&&target==='challenge');
  $('mobileControls').classList.toggle('free-mobile',active&&target==='free');
  $('mobileControls').classList.toggle('dungeon-mobile',active&&target==='dungeon');
  $('mobileInventory').classList.toggle('hidden',target!=='free');
  $('mobileView').classList.toggle('hidden',target!=='free'||(gameFreeMode==='survival'&&!mobileUtilityOpen));
  $('mobileInteract')?.classList.toggle('hidden',target!=='free'||gameFreeMode!=='survival');
  $('mobileMore').classList.toggle('hidden',target!=='free');
  $('mobileTutorial').classList.toggle('hidden',!active||(target==='free'&&gameFreeMode==='survival'&&!mobileUtilityOpen));
  $('mobileEscape')?.classList.toggle('hidden',target!=='free'||gameFreeMode!=='survival'||!mobileUtilityOpen);
  $('mobileMore').textContent=mobileUtilityOpen?'접기':'더보기';
  $('mobileAvatar').classList.toggle('hidden',target!=='free'||!mobileUtilityOpen);
  $('mobileWorks').classList.toggle('hidden',target!=='free'||!mobileUtilityOpen);
  $('mobileFly').classList.toggle('hidden',target!=='free'||gameFreeMode==='survival');
  const poiRestore=target==='free'&&gameFreeMode==='survival'&&nearLandmarkPoi&&!restoredLandmarks.has(nearLandmarkPoi.id);
  $('mobileCheck').classList.toggle('hidden',target!=='challenge'&&!poiRestore&&target!=='dungeon');
  $('mobileCheck').textContent=target==='dungeon'?'조사':poiRestore?'던전':'검사';
  $('mobileSelect').classList.toggle('hidden',target!=='challenge');
  $('mobileNext').classList.toggle('hidden',target!=='challenge'&&target!=='dungeon');
  if(target==='dungeon')$('mobileNext').textContent='귀환';
  $('mobileCopy').classList.toggle('hidden',target!=='free'||gameFreeMode==='survival'||!mobileUtilityOpen);
  $('mobileWeather').classList.toggle('hidden',target!=='free'||gameFreeMode==='survival'||!mobileUtilityOpen);
  const geometryTools=target==='free'&&mobileUtilityOpen;
  $('mobilePaint').classList.toggle('hidden',!geometryTools);
  $('mobileLens').classList.toggle('hidden',!geometryTools);
  const survivalActionHub=target==='free'&&gameFreeMode==='survival';
  $('mobileBreak').classList.toggle('hidden',target==='dungeon'||survivalActionHub);
  if(target!=='dungeon')$('mobileBreak').textContent=survivalActionHub?'채집':'파괴';
  $('mobilePlace').classList.toggle('hidden',target==='dungeon'||survivalActionHub);
  $('mobileUp').classList.toggle('hidden',target==='dungeon');
  $('mobileDown').classList.toggle('hidden',target==='dungeon');
  $('challengeLockNotice').classList.toggle('hidden',active||target!=='challenge');
  $('lockNotice').classList.toggle('hidden',active||target!=='free'||inventoryOpen||furnaceOpen||lifePanelOpen);
  if(target==='free'){refreshMobileFly();updateFreeViewButtons();updateSimpleSurvivalUi()}
}
function enableMobileFallback(){
  mobileModeEnabled=true;configureMobileMode(mode);
  toast('이 브라우저에서는 마우스 고정 대신 터치·화면 조작을 사용해요.');
}
function requestGamePointerLock(){
  warmAudio();
  if(mode!=='challenge'&&mode!=='free'&&mode!=='dungeon')return;
  if(mobileModeEnabled){configureMobileMode(mode);return}
  if(typeof canvas.requestPointerLock!=='function'){enableMobileFallback();return}
  try{
    const result=canvas.requestPointerLock();
    if(result&&typeof result.catch==='function')result.catch(()=>enableMobileFallback());
  }catch(e){enableMobileFallback()}
}
function refreshMobileFly(){
  if(mode!=='free')return;
  $('mobileFly').textContent=freeFlying?'걷기':'비행';
  const swimming=!!freeFluidKind&&!freeFlying;
  $('mobileDown').classList.toggle('hidden',!freeFlying&&!swimming);
  const upHint=$('mobileUp')?.querySelector('small');if(upHint)upHint.textContent=swimming?'수영 위':freeFlying?'상승':'점프';
}
function mobileBlockAction(action){
  if(mode==='free'&&freeAvatarDefeated)return;
  if(mode==='challenge'){
    const hit=challengeCenterHit(12);
    if(action==='break'&&hit?.object.userData.challenge)removeChallengeBlock(hit.object);
    if(action==='place'){
      if(challengeTool==='face')paintLookedChallengeFace();
      else if(challengeTool==='edge'||challengeTool==='vertex')selectLookedChallengePiece();
      else{const p=challengePlaceTarget(hit);if(p&&!addChallengeCuboid(p.x,p.y,p.z,challengeDims()))toast('도형이 들어갈 공간을 확인해 보세요.')}
    }
    updateChallengeStats();updateChallengeGhost();return;
  }
  if(mode==='free'&&!inventoryOpen&&!furnaceOpen&&!lifePanelOpen){
    const hit=freeCenterHit(6);
    if(action==='break'){
      if(hitWildCreature())return;
      if(gameFreeMode==='survival')startMining('mobile');
      else breakFreeBlock(hit);
    }
    if(action==='place')placeFreeBlock(hit);
  }
}
function mobileSpecialUseTarget(){
  if(mode!=='free'||gameFreeMode!=='survival')return false;
  const hit=freeCenterHit(6),u=hit?.object?.userData||{},type=u.type;
  if(type==='door'||type==='doorTop'){
    if(toggleDoorAt(u.gx,u.gy,u.gz))return true;
  }
  if(type==='furnace'){toggleFurnace(true);return true}
  if(type==='workbench'){survivalInventoryTab='craft';toggleInventory(true);return true}
  if(interactLifeBlock(type,u.gx,u.gy,u.gz))return true
  if(nearLandmarkPoi&&!restoredLandmarks.has(nearLandmarkPoi.id)){
    openLandmarkDungeon(nearLandmarkPoi);return true;
  }
  return false;
}
function mobileObserveTarget(){
  if(mode!=='free'||gameFreeMode!=='survival')return false;
  if(interactWildCreature())return true;
  const hit=freeCenterHit(6),u=hit?.object?.userData;
  if(u?.worldBlock){
    const data=getBlock(u.gx,u.gy,u.gz);
    if(data){
      const need=worldRules.toolNeeded(data.type),extra=need?' · '+blockDef(need).name+' 필요':'';
      toast('관찰 · '+blockDef(data).name+extra);return true;
    }
  }
  if(nearLandmarkPoi){toast('관찰 · '+nearLandmarkPoi.name+' · 가까이 가면 던전을 조사할 수 있어요.');return true}
  toast('관찰할 생물이나 블록을 가운데 +로 바라보세요.');return false;
}
function mobileOneShotHarvest(){
  if(mode!=='free'||gameFreeMode!=='survival')return false;
  if(hitWildCreature())return true;
  const hit=freeCenterHit(6);
  if(!canMineTarget(hit,true))return false;
  startMining('radial');return !!miningHeld;
}
function mobilePlaceAction(){
  if(mode!=='free'||gameFreeMode!=='survival')return false;
  const hit=freeCenterHit(6);
  if(!hit){toast('설치할 면을 가운데 +로 바라보세요.');return false}
  if(!PLACEABLE_TYPES.includes(selectedType)&&!FARM_PLANT_TYPES.includes(selectedType)){
    toast('먼저 가방이나 핫바에서 설치하거나 심을 재료를 골라 주세요.');return false;
  }
  placeFreeBlock(hit);return true;
}
function executeMobileRadialAction(action){
  if(mode!=='free'||gameFreeMode!=='survival')return false;
  let ok=false;
  if(action==='observe')ok=mobileObserveTarget();
  else if(action==='use'){
    ok=mobileSpecialUseTarget();
    if(!ok)toast('문·제작대·화로·의자·표지판·동물처럼 사용할 대상을 바라보세요.');
  }else if(action==='harvest')ok=mobileOneShotHarvest();
  else if(action==='place')ok=mobilePlaceAction();
  tutorialSignal('mobile-radial-'+action);
  return ok;
}
function clearJourneyMarker(){
  if(journeyMarker){scene.remove(journeyMarker);journeyMarker.geometry?.dispose();journeyMarker.material?.dispose();journeyMarker=null}
}
function showJourneyMarker(p){
  if(!p)return;
  if(!journeyMarker){journeyMarker=new THREE.Mesh(new THREE.BoxGeometry(1.04,1.04,1.04),new THREE.MeshBasicMaterial({color:0xffda69,wireframe:true,depthTest:false}));journeyMarker.renderOrder=30;scene.add(journeyMarker)}
  journeyMarker.position.set(p[0],p[1]+.5,p[2]);journeyMarker.visible=true;
}
function startFirstJourney(){
  if(firstJourney.phase!=='idle')return;
  const plan=experience.bridgePlan((x,z)=>getHighestSolidY(x,z,10),getBlock);
  if(!plan){toast('주변에 다리를 놓을 빈자리가 부족해. 자유롭게 탐험해도 괜찮아.');return}
  // Add only empty anchor cells. Never flatten terrain or replace a student's work.
  if(plan.anchors.some(p=>getBlock(...p)))return;
  for(const p of plan.anchors)setWorldBlock(...p,{type:'planks',journeyAnchor:true},true);
  firstJourney={phase:'build',plan};markFreeWorldDirty(300);updateFirstJourney();helpFirstJourney();
}
function helpFirstJourney(){
  if(!firstJourney.plan)return;
  if(firstJourney.phase==='cross'){showJourneyMarker(firstJourney.plan.anchors[1]);toast('다리 위로 올라가 반대편까지 걸어 보자.');return}
  if(bagCount('planks')){putOnHotbar('planks');toggleInventory(false);toast('노란 테두리 옆면을 보고 판자를 놓아 보자.');return}
  const recipe=worldRules.RECIPES.find(r=>r.id==='planks');survivalInventoryTab='craft';survivalCraftCategory='전체';selectedCraftRecipeId=recipe.id;toggleInventory(true);toast(craftNeedHint(recipe));
}
function updateFirstJourney(){
  const card=$('journeyCard');if(!card)return;
  const campReady=typeof survivalCamp==='undefined'||survivalCamp.finished||survivalCamp.dismissed;
  const available=mode==='free'&&gameFreeMode==='survival'&&!campActive()&&campReady&&!['done','skip'].includes(firstJourney.phase);
  card.classList.toggle('hidden',!available);if(!available)return;
  const idle=firstJourney.phase==='idle';$('journeyStart').classList.toggle('hidden',!idle);$('journeyHelp').classList.toggle('hidden',idle);
  $('journeyTitle').textContent=idle?'추천 탐험 · 작은 다리':'추천 탐험 · 길을 이어 보자';
  if(idle){$('journeyText').textContent='원하면 판자 세 칸으로 다리를 만들고 건너가 보자. 선물도 기다리고 있어!';return}
  const plan=firstJourney.plan;
  if(!plan)return;
  const ready=experience.bridgeReady(plan,getBlock);
  if(!ready){firstJourney.phase='build';const missing=plan.cells.find(p=>getBlock(...p)?.type!=='planks'||!getBlock(...p)?.playerBuilt);showJourneyMarker(missing);
    const n=plan.cells.filter(p=>getBlock(...p)?.type==='planks'&&getBlock(...p)?.playerBuilt).length;
    const distance=Math.round(Math.hypot(camera.position.x-plan.anchors[0][0],camera.position.z-plan.anchors[0][2]));
    $('journeyText').textContent=distance>5?'노란 테두리까지 '+distance+'칸. 다리의 시작점을 찾아보자.':'판자 '+n+' / 3 · 노란 테두리에 한 칸씩 이어 놓아 보자.';return;
  }
  if(firstJourney.phase!=='cross'){firstJourney.phase='cross';markFreeWorldDirty(300)}
  showJourneyMarker(plan.anchors[1]);$('journeyText').textContent='길이 이어졌어! 점프로 올라가 반대편까지 건너 보자.';
  const [x,y,z]=plan.end;
  if(Math.hypot(camera.position.x-x,camera.position.z-z)<.65&&Math.abs(freePhysicsY-1.62-y)<.2){
    firstJourney.phase='done';clearJourneyMarker();
    addToBag('planks',4);addToBag('roof',2);sfx('good');toast('첫 다리 완성! 판자 4개와 지붕 2개를 받았어.');
    markFreeWorldDirty(300);saveFreeWorld();card.classList.add('hidden');
  }
}
function toggleBuildingWorks(open){
  worksOpen=!!open;
  if(worksOpen){stopMining();if(lifePanelOpen){lifePanelOpen=false;$('lifePanel')?.classList.add('hidden')}if(inventoryOpen)toggleInventory(false);if(furnaceOpen)toggleFurnace(false);if(document.pointerLockElement===canvas)document.exitPointerLock();renderBuildingWorks()}
  $('buildingWorksPanel').classList.toggle('hidden',!worksOpen);
  if(!worksOpen&&!mobileModeEnabled&&mode==='free')resumeFreePointerLock();
}
function renderBuildingWorks(){
  const gallery=$('worksGallery');gallery.replaceChildren();
  if(!buildingWorks.length){const empty=document.createElement('p');empty.textContent='첫 작품을 사진으로 남겨 보자.';gallery.append(empty)}
  for(const work of [...buildingWorks].reverse()){
    const figure=document.createElement('figure'),img=document.createElement('img'),name=document.createElement('figcaption');
    img.src=work.photo;img.alt=work.name;name.textContent=work.name;figure.append(img,name);gallery.append(figure);
  }
  $('workName').value=projectGuide||'나의 건축물';
}
function captureBuildingWork(){
  if(mode!=='free'||!renderer)return;
  const name=($('workName').value.trim()||'나의 건축물').slice(0,30);
  try{
    renderFreeScene(performance.now());
    const thumb=document.createElement('canvas');thumb.width=320;thumb.height=180;
    const ctx=thumb.getContext('2d');ctx.drawImage(canvas,0,0,320,180);
    const photo=thumb.toDataURL('image/jpeg',.65);
    if(photo.length>90000)throw new Error('photo too large');
    const previousWorks=buildingWorks;
    buildingWorks=experience.readWorks([...buildingWorks,{name,photo,date:new Date().toISOString()}]);
    projectGuide=name;if(!saveFreeWorld()){buildingWorks=previousWorks;throw new Error('save failed')}renderBuildingWorks();toast('작품 사진을 남겼어! 최근 여섯 작품을 볼 수 있어.');
  }catch(_){toast('사진을 남기지 못했어. 잠시 뒤 다시 눌러 보자.')}
}

function updateSimpleSurvivalUi(){
  const survival=mode==='free'&&gameFreeMode==='survival';
  document.body.classList.toggle('simple-survival',survival);
  document.body.classList.toggle('survival-more',survival&&mobileUtilityOpen);
  if(!survival)return;
  const hub=$('mobileInteract');
  if(hub&&mobileModeEnabled&&!mobileRadialOpen&&performance.now()-(hub._labelAt||0)>150){
    hub._labelAt=performance.now();
    const u=freeCenterHit(6)?.object?.userData||{};
    const creature=creatureRayHit(2.9),creatureRoot=creature?.object?.userData?.creatureRoot,cu=creatureRoot?.userData;
    const hostile=cu?.spec?.kind==='hostile',tameable=!!TAME_RULES[cu?.spec?.id];
    const name=creature?(hostile?'공격':cu?.petId?'돌보기':tameable?'길들이기':'인사'):['door','doorTop'].includes(u.type)?'열기':u.type==='workbench'?'만들기':u.type==='furnace'?'굽기':u.type==='chest'?'상자':u.type==='bed'?'침대':u.type==='mapBoard'?'지도':u.type==='displayStand'?'전시':['chair','sofa','bench'].includes(u.type)?'앉기':u.type==='campfire'?'모닥불':u.type==='floorLamp'?'조명':u.type==='bedroll'?'쉬기':u.type==='crate'?'상자':u.type==='sign'?'쓰기':u.type==='bookshelf'?'책장':
      FARM_PLANT_TYPES.includes(selectedType)?'심기':PLACEABLE_TYPES.includes(selectedType)&&selectedType!=='hand'?'놓기':'캐기';
    const label=hub.querySelector('b');if(label&&label.textContent!==name)label.textContent=name;
  }
  const jump=$('mobileUp'),jumpHint=jump?.querySelector('small');if(jumpHint&&!freeFlying&&!freeFluidKind&&jumpHint.textContent!=='점프')jumpHint.textContent='점프';
}
function setSurvivalInventoryTab(tab){
  survivalInventoryTab=tab==='craft'?'craft':'bag';
  const panel=$('blockInventory');if(!panel)return;
  panel.dataset.bagTab=survivalInventoryTab;
  panel.querySelectorAll('[data-bag-tab]').forEach(b=>b.classList.toggle('active',b.dataset.bagTab===survivalInventoryTab));
}
function mobileDefaultAction(){
  if(mode!=='free'||gameFreeMode!=='survival')return;
  const creature=creatureRayHit(2.9);
  if(creature){
    const root=creature.object.userData.creatureRoot;
    if(root?.userData?.spec?.kind==='hostile')hitWildCreature();
    else interactWildCreature();
    return;
  }
  if(mobileSpecialUseTarget())return;
  const hit=freeCenterHit(6);
  if(hit&&(PLACEABLE_TYPES.includes(selectedType)||FARM_PLANT_TYPES.includes(selectedType))&&selectedType!=='hand'){
    placeFreeBlock(hit);return;
  }
  if(hit&&canMineTarget(hit,false)){mobileOneShotHarvest();return}
  toast('행동 버튼을 꾹 누르면 관찰·사용·채집·설치를 골라 쓸 수 있어요.');
}
function positionMobileActionRadial(){
  const radial=$('mobileActionRadial'),button=$('mobileInteract'),controls=$('mobileControls');
  if(!radial||!button||!controls)return;
  const br=button.getBoundingClientRect(),cr=controls.getBoundingClientRect();
  const x=br.left-cr.left+br.width/2,y=br.top-cr.top+br.height/2;
  radial.style.left=x+'px';radial.style.top=y+'px';
  mobileRadialCenter={x:br.left+br.width/2,y:br.top+br.height/2};
}
function setMobileRadialSelection(action){
  if(mobileRadialSelected===action)return;
  mobileRadialSelected=action||'';
  document.querySelectorAll('#mobileActionRadial [data-radial-action]').forEach(el=>
    el.classList.toggle('selected',el.dataset.radialAction===mobileRadialSelected));
  if(action)try{navigator.vibrate?.(8)}catch(_){}
}
function updateMobileRadialSelection(clientX,clientY){
  if(!mobileRadialOpen)return;
  const dx=clientX-mobileRadialCenter.x,dy=clientY-mobileRadialCenter.y,dist=Math.hypot(dx,dy);
  if(dist<27){setMobileRadialSelection('');return}
  if(Math.abs(dx)>Math.abs(dy))setMobileRadialSelection(dx>0?'use':'place');
  else setMobileRadialSelection(dy>0?'harvest':'observe');
}
function openMobileActionRadial(){
  if(mobileRadialOpen||mode!=='free'||gameFreeMode!=='survival')return;
  mobileRadialOpen=true;positionMobileActionRadial();setMobileRadialSelection('');
  $('mobileActionRadial').classList.remove('hidden');$('mobileControls').classList.add('radial-open');
  $('mobileInteract').classList.add('radial-held');$('mobileInteract').setAttribute('aria-expanded','true');
  try{navigator.vibrate?.(14)}catch(_){}
  tutorialSignal('mobile-radial-open');
}
function closeMobileActionRadial(){
  clearTimeout(mobileRadialTimer);mobileRadialTimer=0;
  mobileRadialOpen=false;mobileRadialSelected='';
  $('mobileActionRadial')?.classList.add('hidden');$('mobileControls')?.classList.remove('radial-open');
  $('mobileInteract')?.classList.remove('radial-held');$('mobileInteract')?.setAttribute('aria-expanded','false');
  document.querySelectorAll('#mobileActionRadial [data-radial-action]').forEach(el=>el.classList.remove('selected'));
}
function initMobileActionRadial(){
  const button=$('mobileInteract');if(!button)return;
  button.addEventListener('pointerdown',ev=>{
    if(!mobileModeEnabled||mode!=='free'||gameFreeMode!=='survival')return;
    warmAudio();ev.preventDefault();ev.stopPropagation();
    mobileRadialPointerId=ev.pointerId;mobileRadialPressedAt=performance.now();
    const br=button.getBoundingClientRect();mobileRadialCenter={x:br.left+br.width/2,y:br.top+br.height/2};
    button.setPointerCapture?.(ev.pointerId);button.classList.add('pressed');
    clearTimeout(mobileRadialTimer);mobileRadialTimer=setTimeout(openMobileActionRadial,310);
  });
  button.addEventListener('pointermove',ev=>{
    if(ev.pointerId!==mobileRadialPointerId)return;
    ev.preventDefault();ev.stopPropagation();
    if(mobileRadialOpen)updateMobileRadialSelection(ev.clientX,ev.clientY);
  });
  const finish=ev=>{
    if(ev.pointerId!==mobileRadialPointerId)return;
    ev.preventDefault();ev.stopPropagation();
    clearTimeout(mobileRadialTimer);mobileRadialTimer=0;
    const wasOpen=mobileRadialOpen,chosen=mobileRadialSelected;
    mobileRadialPointerId=null;button.classList.remove('pressed');
    closeMobileActionRadial();
    if(wasOpen){if(chosen)executeMobileRadialAction(chosen)}
    else mobileDefaultAction();
  };
  button.addEventListener('pointerup',finish);
  button.addEventListener('pointercancel',ev=>{
    if(ev.pointerId!==mobileRadialPointerId)return;
    mobileRadialPointerId=null;button.classList.remove('pressed');closeMobileActionRadial();
  });
  button.addEventListener('lostpointercapture',ev=>{
    if(ev.pointerId===mobileRadialPointerId){mobileRadialPointerId=null;button.classList.remove('pressed');closeMobileActionRadial()}
  });
}
function initMobileControls(){
  const joystick=$('mobileJoystick'),knob=$('mobileJoystickKnob');
  function setJoystick(ev){
    const r=joystick.getBoundingClientRect(),radius=Math.max(1,r.width*.5-25);
    let dx=ev.clientX-(r.left+r.width*.5),dy=ev.clientY-(r.top+r.height*.5);
    const len=Math.hypot(dx,dy);if(len>radius){dx*=radius/len;dy*=radius/len}
    mobileMove={x:dx/radius,y:dy/radius};
    knob.style.transform='translate(calc(-50% + '+dx+'px),calc(-50% + '+dy+'px))';
  }
  joystick.addEventListener('pointerdown',ev=>{
    if(!mobileModeEnabled)return;warmAudio();ev.preventDefault();mobileJoyPointerId=ev.pointerId;
    joystick.setPointerCapture?.(ev.pointerId);setJoystick(ev);
  });
  joystick.addEventListener('pointermove',ev=>{
    if(ev.pointerId===mobileJoyPointerId){ev.preventDefault();setJoystick(ev)}
  });
  const stopJoy=ev=>{if(ev.pointerId!==mobileJoyPointerId)return;mobileJoyPointerId=null;mobileMove={x:0,y:0};knob.style.transform='translate(-50%,-50%)'};
  joystick.addEventListener('pointerup',stopJoy);
  joystick.addEventListener('pointercancel',stopJoy);
  joystick.addEventListener('lostpointercapture',stopJoy);
  function tap(id,cb){
    $(id).addEventListener('pointerdown',ev=>{
      warmAudio();ev.preventDefault();ev.stopPropagation();if(mobileModeEnabled)cb();
    });
  }
  const mobileBreakBtn=$('mobileBreak');
  mobileBreakBtn.addEventListener('pointerdown',ev=>{
    if(!mobileModeEnabled)return;warmAudio();ev.preventDefault();ev.stopPropagation();
    mobileBreakBtn.setPointerCapture?.(ev.pointerId);mobileBlockAction('break');
  });
  const releaseBreak=()=>{if(miningSource==='mobile')stopMining()};
  mobileBreakBtn.addEventListener('pointerup',releaseBreak);
  mobileBreakBtn.addEventListener('pointercancel',releaseBreak);
  mobileBreakBtn.addEventListener('lostpointercapture',releaseBreak);
  tap('mobilePlace',()=>mobileBlockAction('place'));
  tap('mobileCheck',()=>{
    if(mode==='challenge')checkChallenge();
    else if(mode==='dungeon')dungeonInteract();
    else if(mode==='free'&&gameFreeMode==='survival'&&nearLandmarkPoi&&!restoredLandmarks.has(nearLandmarkPoi.id))
      openLandmarkDungeon(nearLandmarkPoi);
  });
  tap('mobileSelect',()=>{if(mode==='challenge')selectLookedChallengePiece()});
  tap('mobileNext',()=>{
    if(mode==='dungeon'){returnFromDungeon();return}
    if(mode==='challenge'){
      if(restorationSession)returnFromRestoration();
      else{missionIndex=(missionIndex+1)%activeChallengeMissions().length;clearChallenge();drawBlueprint()}
    }
  });
  tap('mobileCopy',()=>{if(mode==='free')pickTargetBlock()});
  tap('mobileWeather',()=>{if(mode==='free')cycleWeather()});
  tap('mobileInventory',()=>{if(mode==='free')toggleInventory()});
  initMobileActionRadial();
  tap('mobileView',()=>{if(mode==='free')cycleFreeView()});
  tap('mobileTutorial',()=>showTutorial(mode==='free'?'free':mode,true));
  tap('mobileMore',()=>{if(mode==='free'){mobileUtilityOpen=!mobileUtilityOpen;configureMobileMode('free')}});
  tap('mobileAvatar',()=>{if(mode==='free')openAvatarCustomizer()});
  tap('mobilePaint',()=>{if(mode==='free')paintLookedFace()});
  tap('mobileLens',()=>{if(mode==='free')toggleXray()});
  tap('mobileFly',()=>{
    if(mode!=='free'||gameFreeMode==='survival')return;
    freeFlying=!freeFlying;freeVelocityY=0;refreshMobileFly();updateFreeMission();
    toast(freeFlying?'비행 모드 · 상승/하강 버튼 사용':'걷기 모드 · 점프 버튼 사용');
  });
  function heightButton(id,key){
    const b=$(id);
    b.addEventListener('pointerdown',ev=>{
      if(!mobileModeEnabled)return;warmAudio();ev.preventDefault();ev.stopPropagation();
      b.setPointerCapture?.(ev.pointerId);b.classList.add('pressed');
      if(mode==='challenge')challengeKeys[key]=true;
      else if(mode==='free'){
        const fluid=playerEnvironmentState(camera.position.x,freePhysicsY,camera.position.z);
        if(key==='Space'&&!freeFlying&&!fluid.water&&!fluid.lava){queueFreeJump()}
        else freeKeys[key]=true;
      }
    });
    const release=()=>{b.classList.remove('pressed');challengeKeys[key]=false;freeKeys[key]=false};
    b.addEventListener('pointerup',release);b.addEventListener('pointercancel',release);b.addEventListener('lostpointercapture',release);
  }
  heightButton('mobileUp','Space');heightButton('mobileDown','ShiftLeft');
}
initMobileControls();

/* ---------------- 공통 입력 / 안내 ---------------- */
let tutorialState=null,tutorialFocusEl=null;
let survivalCamp={version:1,completed:[],dismissed:false,finished:false,baseline:null,prepared:false};
let campMarker=null,campMarkerKey='',campTickAt=0,campWalkStart=null,campHelpTarget=null;
const campNearestCache=new Map();
function campActive(){return mode==='free'&&gameFreeMode==='survival'&&tutorialState?.camp===true}
function campShelterPlan(){
  const [x,y,z]=survivalCamp.site||[-3,3,3];
  return window.CubeArchitectCamp.SHELTER.map(p=>[p[0]+x+3,p[1]+y-3,p[2]+z-3]);
}
function chooseCampSite(){
  if(survivalCamp.site)return;
  for(let radius=0;radius<=8;radius++)for(let x=-3-radius;x<=-3+radius;x++)for(let z=3-radius;z<=3+radius;z++){
    if(radius&&Math.max(Math.abs(x+3),Math.abs(z-3))!==radius)continue;
    const y=getHighestSolidY(x,z,10)+1;
    if(y<1||y>5)continue;
    const candidate=window.CubeArchitectCamp.SHELTER.map(p=>[p[0]+x+3,p[1]+y-3,p[2]+z-3]);
    if(candidate.every(p=>!getBlock(...p))&&!getBlock(x,y,z)&&!getBlock(x,y+1,z)&&
      getBlock(x-1,y-1,z)&&getBlock(x,y-1,z-1)&&!getBlock(x,y,z+1)){
      survivalCamp.site=[x,y,z];return;
    }
  }
  survivalCamp.site=[-3,3,3];
}
function campShelterComplete(){
  return campShelterPlan().every(p=>{
    const d=getBlock(...p);return !!(d?.playerBuilt&&worldRules.shelterBlock(d));
  });
}
function clearCampMarker(){
  if(campMarker){campMarker.parent?.remove(campMarker);campMarker.geometry.dispose();campMarker.material.dispose()}
  campMarker=null;campMarkerKey='';
}
function prepareSurvivalCamp(){
  if(gameFreeMode!=='survival'||savedFreePosition||worldEdits.size)return;
  for(let x=-5;x<=4;x++)for(let z=0;z<=6;z++){
    for(let y=3;y<=8;y++){setRawBlock(x,y,z,null);markEdit(x,y,z,null)}
    const floor={type:'grass',natural:true};setRawBlock(x,2,z,floor);markEdit(x,2,z,floor);
  }
  for(let y=3;y<=6;y++){
    const log={type:'log',natural:true};setRawBlock(6,y,3,log);markEdit(6,y,3,log);
  }
  for(const x of [3,4,5]){
    const d={type:'stone',natural:true};setRawBlock(x,3,0,d);markEdit(x,3,0,d);
  }
  survivalCamp.prepared=true;
}
function campNearest(types){
  const cacheKey=types.join(','),cached=campNearestCache.get(cacheKey);
  if(cached&&types.includes(getBlock(...cached)?.type)&&Math.hypot(cached[0]-camera.position.x,cached[2]-camera.position.z)<12)return cached;
  let nearest=null,score=Infinity;
  for(const [key,d] of worldData){
    if(!types.includes(d?.type)||d.protectedPoi)continue;
    const p=parseWorldKey(key);
    if(types.includes('stone')&&![[0,1,0],[1,0,0],[-1,0,0],[0,0,1],[0,0,-1]].some(v=>{
      const neighbor=worldData.get(worldKey(p[0]+v[0],p[1]+v[1],p[2]+v[2]));return !neighbor||!blockDef(neighbor).solid;
    }))continue;
    const dist=Math.hypot(p[0]-camera.position.x,p[2]-camera.position.z)+Math.abs(p[1]-(freePhysicsY-1.62))*.3;
    if(dist<score){score=dist;nearest=p}
  }
  if(nearest)campNearestCache.set(cacheKey,nearest);return nearest;
}
function campStep(){return campActive()?tutorialState.steps[tutorialState.index]:null}
function campContext(){
  return {stats:survivalStats,bag:survivalBag,inventoryOpen,bagOpened:survivalCamp.completed.includes('bag'),
    moved:campWalkStart?Math.hypot(camera.position.x-campWalkStart[0],camera.position.z-campWalkStart[1]):0,
    atWalkTarget:Math.hypot(camera.position.x-3,camera.position.z-5)<.9,
    walked:survivalStage>0,shelterComplete:campShelterComplete(),baseline:survivalCamp.baseline};
}
function campTarget(step){
  if(campHelpTarget)return campHelpTarget;
  if(!step||step.independent)return null;
  if(step.id==='walk')return [3,3,5];
  if(step.id==='wood')return campNearest(['log','pineLog']);
  if(step.id==='stone')return campNearest(['stone']);
  if(step.id==='benchPlace')return survivalCamp.prepared&&!getBlock(2,3,3)?[2,3,3]:null;
  if(step.id==='shelter')return campShelterPlan().find(p=>{
    const d=getBlock(...p);return !(d?.playerBuilt&&worldRules.shelterBlock(d));
  })||null;
  if(step.id==='inside')return survivalCamp.site||[-3,3,3];
  if(step.recipe&&window.CubeArchitectWorld.RECIPES.find(r=>r.id===step.recipe)?.bench&&!hasWorkbench())
    return campNearest(['workbench']);
  return null;
}
function updateCampMarker(step){
  const p=campTarget(step);
  if(!p||inventoryOpen){clearCampMarker();return}
  const ring=step.action==='walk'||step.action==='inside';
  const key=p.join(',')+(ring?'ring':'box');
  if(key!==campMarkerKey||campMarker?.parent!==scene){
    clearCampMarker();campMarkerKey=key;
    const geometry=ring?new THREE.RingGeometry(.5,.7,32):new THREE.BoxGeometry(1.05,1.05,1.05);
    const material=new THREE.MeshBasicMaterial({color:0xffd54f,transparent:true,opacity:.8,
      wireframe:!ring,side:THREE.DoubleSide,depthTest:false,depthWrite:false});
    campMarker=new THREE.Mesh(geometry,material);campMarker.renderOrder=99;
    campMarker.userData.worldDecorative=true;
    campMarker.position.set(p[0],ring?p[1]+.025:p[1]+.5,p[2]);
    if(ring)campMarker.rotation.x=-Math.PI/2;
    scene.add(campMarker);
  }
}
function campInstruction(step){
  const mobile=mobileModeEnabled;
  if(step.id==='walk')return mobile?'왼쪽 동그라미로 움직여 보자. 화면을 밀면 주변을 볼 수 있어.':'화면을 누르고 W·A·S·D로 움직여 보자. 마우스로 주변을 볼 수 있어.';
  if(step.id==='bag')return mobile?'위쪽 가방 버튼을 눌러 보자.':'E를 눌러 가방을 열어 보자.';
  if(step.recipe){
    const recipe=worldRules.RECIPES.find(r=>r.id===step.recipe);
    if(recipe?.bench&&!hasWorkbench())return '제작대 가까이로 가 보자.';
    const missing=Object.entries(recipe?.needs||{}).find(([type,n])=>bagCount(type)<n);
    if(missing)return blockDef(missing[0]).name+' '+(missing[1]-bagCount(missing[0]))+'개가 더 필요해. '+(mobile?'도움 받기를 눌러 보자.':'H를 눌러 도움을 받아 보자.');
    if(!inventoryOpen)return mobile?'가방을 열고 '+recipe.name+'를 골라 보자.':'E로 가방을 열고 '+recipe.name+'를 골라 보자.';
    return recipe.name+'를 고른 뒤 만들기를 눌러 보자.';
  }
  if(step.action==='harvest'){
    if(inventoryOpen)return mobile?'가방을 닫고 나무나 돌을 바라보자.':'E로 가방을 닫고 나무나 돌을 바라보자.';
    if(step.type==='stone'&&pickTier(selectedType)<pickTier('woodPick'))return '아래 물건 칸에서 곡괭이를 골라 보자.';
    if(step.type==='log'&&PLACEABLE_TYPES.includes(selectedType))return '아래 물건 칸에서 맨손을 골라 보자.';
    return mobile?'가운데 +를 맞추고 행동 버튼을 한 번 눌러 보자.':'가운데 +를 맞추고 마우스 왼쪽 버튼을 꾹 눌러 보자.';
  }
  if(step.action==='place'||step.action==='shelter'){
    if(inventoryOpen)return mobile?'놓을 물건을 고르고 가방을 닫아 보자.':'놓을 물건을 고르고 E로 가방을 닫아 보자.';
    if(step.action==='shelter'&&!['planks','dirt'].includes(selectedType))return '아래 물건 칸에서 판자나 흙을 골라 보자.';
    if(step.action==='place'&&selectedType!==step.type)return '아래 물건 칸에서 '+blockDef(step.type).name+'를 골라 보자.';
    if(!bagCount(selectedType))return '재료가 다 떨어졌네. '+(mobile?'도움 받기를 눌러 보자.':'H를 눌러 도움을 받아 보자.');
    if(step.independent)return mobile?'놓고 싶은 곳을 보고 행동 버튼을 눌러 보자.':'놓고 싶은 곳을 보고 마우스 오른쪽 버튼을 눌러 보자.';
    return mobile?'노란 테두리 옆면이나 바닥을 보고 행동 버튼을 눌러 보자.':'노란 테두리 옆면이나 바닥을 보고 마우스 오른쪽 버튼을 눌러 보자.';
  }
  return step.text;
}
function campLiveStatus(step){
  if(step.id==='wood')return '원목 '+Math.min(3,survivalStats.harvestedWood||0)+' / 3';
  if(step.id==='shelter')return '쉼터 '+campShelterPlan().filter(p=>getBlock(...p)?.playerBuilt&&worldRules.shelterBlock(getBlock(...p))).length+' / 6';
  return '';
}
function campFocus(step){
  if(step.recipe&&inventoryOpen)return '[data-recipe-id="'+step.recipe+'"]';
  if(step.id==='bag'||step.recipe)return mobileModeEnabled?'#mobileInventory':null;
  if(step.action==='walk')return mobileModeEnabled?'#mobileJoystick':null;
  if(step.action==='harvest'||step.action==='place'||step.action==='shelter')
    return mobileModeEnabled?'#mobileInteract':null;
  return null;
}
function renderCampStep(){
  const step=campStep();if(!step)return;
  const intro=step.id==='welcome'||step.id==='done';
  const root=$('tutorial');root.classList.add('camp');root.classList.remove('hidden');root.classList.toggle('coach',!intro);
  $('tutorialProgress').textContent=intro?'첫 생존':Math.min(7,step.chapter)+' / 7';
  $('tutorialBody').innerHTML='<h2>'+step.title+'</h2><p>'+step.text+'</p>'+
    (intro?'':'<div class="tutorial-do" id="campInstruction">'+campInstruction(step)+'</div>')+
    (campLiveStatus(step)?'<div class="tutorial-live-status" id="tutorialLiveStatus">'+campLiveStatus(step)+'</div>':'');
  $('tutorialSkip').textContent='혼자 해 볼게요';
  $('tutorialSkip').onclick=()=>{survivalCamp.dismissed=true;tutorialFinish(false);markFreeWorldDirty(300);updateFreeMission()};
  $('tutorialBack').style.visibility=intro?'hidden':'visible';$('tutorialBack').disabled=false;
  $('tutorialBack').textContent='캠프로 돌아가기';$('tutorialBack').onclick=()=>{
    toggleInventory(false);camera.position.set(0,safeReturnEyeY(),5);freePhysicsY=camera.position.y;
    freeVelocityY=0;freeFallPeakY=freePhysicsY;stopMining();markFreeWorldDirty(300);
  };
  $('tutorialClose').disabled=false;$('tutorialClose').textContent=intro?(step.id==='done'?'탐험하러 가기':'함께 시작하기'):'도움 받기';
  $('tutorialClose').onclick=()=>{
    if(step.id==='done'){survivalCamp.finished=true;survivalCamp.dismissed=false;tutorialFinish(false);markFreeWorldDirty(300);updateFreeMission();return}
    if(step.id==='welcome'){tutorialState.index++;renderTutorialStep();return}
    campHelp(step);
  };
  tutorialClearFocus();const target=tutorialTarget(campFocus(step));
  if(target){target.classList.add('tutorial-focus');tutorialFocusEl=target}
  updateCampMarker(step);renderCampQuest(step);
  syncCampInventory(step);
}
function syncCampInventory(step){
  $('tutorial').classList.toggle('camp-inventory',inventoryOpen);
  const hint=$('campInventoryHint');if(!hint)return;
  hint.classList.toggle('hidden',!inventoryOpen||!campActive());
  if(inventoryOpen&&step){
    $('campInventoryText').textContent=step.title+' · '+campInstruction(step);
    $('campInventoryHelp').onclick=()=>campHelp(campStep());
  }
}
function renderCampQuest(step){
  if(!step)return;
  $('freeQuestTitle').textContent='첫 생존 · '+step.title;
  $('freeQuestDescription').textContent=step.text;
  $('adventureCount').textContent=step.id==='done'?'완료':Math.min(7,step.chapter||1)+' / 7';
  $('adventureBar').style.width=(step.id==='done'?100:Math.max(0,(step.chapter||1)-1)/7*100)+'%';
  $('freeHint').textContent=step.id==='welcome'?'차근차근 함께 해 보자.':campInstruction(step);
  $('freeMission').classList.add('camp-quest');
  $('explorationHint').classList.add('hidden');
}
function campHelp(step){
  campHelpTarget=null;
  if(step.recipe){
    let recipe=worldRules.RECIPES.find(r=>r.id===step.recipe);
    if(recipe.bench&&!hasWorkbench()){
      if(!campNearest(['workbench'])){
        if(bagCount('workbench')){putOnHotbar('workbench');toggleInventory(false);toast('제작대를 먼저 다시 놓아 보자.');return}
        recipe=worldRules.RECIPES.find(r=>r.id==='workbench');
      }else{toggleInventory(false);campHelpTarget=campNearest(['workbench']);toast('노란 테두리의 제작대 가까이로 가 보자.');updateCampMarker(step);return}
    }
    const missing=Object.entries(recipe.needs).find(([type,n])=>bagCount(type)<n);
    if(missing?.[0]==='planks'||missing?.[0]==='sticks')recipe=worldRules.RECIPES.find(r=>r.id===missing[0]);
    if(Object.keys(recipe.needs).includes('log')&&!bagCount('log')){
      toggleInventory(false);putOnHotbar('hand');campHelpTarget=campNearest(['log','pineLog']);
      toast('노란 테두리의 나무에서 원목을 더 얻어 보자.');updateCampMarker(step);return;
    }
    survivalCraftCategory='전체';selectedCraftRecipeId=recipe.id;survivalInventoryTab='craft';toggleInventory(true);
    const button=tutorialTarget('[data-recipe-id="'+recipe.id+'"]');tutorialClearFocus();
    if(button){button.classList.add('tutorial-focus');tutorialFocusEl=button;button.scrollIntoView({block:'nearest'})}
    toast(recipe.name+'를 골랐어. 재료를 확인하고 만들어 보자.');return;
  }
  if(step.action==='harvest'){putOnHotbar(step.type==='stone'?'woodPick':'hand');toggleInventory(false);campHelpTarget=campNearest(step.type==='stone'?['stone']:['log','pineLog'])}
  if(step.action==='place'||step.action==='shelter'){
    const type=step.action==='shelter'?(bagCount('planks')?'planks':bagCount('dirt')?'dirt':'planks'):step.type;
    if(!bagCount(type)){
      if(type==='planks'||type==='workbench'){campHelp({recipe:type});return}
    }
    putOnHotbar(type);toggleInventory(false);
  }
  if(step.id==='bag')toggleInventory(true);
  updateCampMarker(step);toast(campInstruction(step));
}
function updateCampLesson(t){
  if(!campActive()||t<campTickAt)return;campTickAt=t+200;
  tutorialRefreshProgress();const step=campStep();if(!step)return;
  const instruction=$('campInstruction');if(instruction)instruction.textContent=campInstruction(step);
  const status=$('tutorialLiveStatus');if(status)status.textContent=campLiveStatus(step);
  updateCampMarker(step);renderCampQuest(step);
  syncCampInventory(step);
}
function showSurvivalCamp(force=false){
  if(!force&&(survivalCamp.dismissed||survivalCamp.finished))return;
  tutorialFinish(false);campWalkStart=[camera.position.x,camera.position.z];campHelpTarget=null;campNearestCache.clear();
  chooseCampSite();
  const steps=window.CubeArchitectCamp.STEPS.map((step,i)=>({...step,chapter:i<1?1:i<2?2:i<5?3:i<6?4:i<10?5:i<12?6:7}));
  const resume=survivalCamp.completed.length>0||survivalStage>0;
  tutorialState={camp:true,kind:'free',index:0,steps:resume?steps:[{id:'welcome',title:'함께 첫 집을 지어 보자',text:'나무를 모으고, 곡괭이를 만들고, 작은 쉼터를 지어 보자. 연습하는 동안은 안전해.',chapter:1},...steps]};
  survivalCamp.dismissed=false;
  dayTime=.35;setWeather('clear',false);
  if(survivalCamp.finished){tutorialState.steps=steps.filter(s=>s.id==='done')}
  renderTutorialStep();tutorialRefreshProgress();
}

function tutorialRefreshProgress(){
  if(!tutorialState)return;
  if(campActive()){
    let changed=false;
    while(tutorialState.index<tutorialState.steps.length-1){
      const step=campStep();
      if(step.independent&&!survivalCamp.baseline)survivalCamp.baseline=window.CubeArchitectCamp.snapshot(survivalStats);
      if(!survivalCamp.completed.includes(step.id)&&!window.CubeArchitectCamp.satisfied(step.id,campContext()))break;
      if(!survivalCamp.completed.includes(step.id))survivalCamp.completed.push(step.id);
      tutorialState.index++;campHelpTarget=null;changed=true;
    }
    if(changed){sfx('good');renderTutorialStep();markFreeWorldDirty(350)}
    return;
  }

}
function tutorialSignal(action){
  if(!tutorialState)return;
  const step=tutorialState.steps[tutorialState.index];
  if(!step)return;
  if(step.wait===action){
    tutorialState.index=Math.min(tutorialState.index+1,tutorialState.steps.length-1);
    renderTutorialStep();return;
  }
  tutorialRefreshProgress();
}
function tutorialTarget(selector){
  if(!selector)return null;
  const el=document.querySelector(selector);
  if(!el||el.classList.contains('hidden'))return null;
  return el;
}
function tutorialClearFocus(){
  if(tutorialFocusEl){tutorialFocusEl.classList.remove('tutorial-focus');tutorialFocusEl=null}
}
function tutorialFinish(save=true){
  if(!tutorialState)return;
  tutorialClearFocus();clearCampMarker();
  $('freeMission').classList.remove('camp-quest');
  $('tutorial').classList.remove('camp','camp-inventory');$('campInventoryHint')?.classList.add('hidden');
  $('tutorialBack').textContent='이전';$('tutorialSkip').textContent='건너뛰기';
  $('tutorial').classList.add('hidden');$('tutorial').classList.remove('coach');
  if(save){try{localStorage.setItem(tutorialState.once,'1')}catch(_){}}
  tutorialState=null;
}
function tutorialSteps(kind){
  const mobile=mobileModeEnabled;
  const desktopControl=kind==='challenge'?'#challengeLockNotice':'#lockNotice';
  if(kind==='challenge')return[
    {title:'블록 하나를 직접 쌓아 볼 거예요',text:'설명만 읽고 끝내지 않습니다. 먼저 블록을 설치하고 부수는 것까지 직접 성공해 봐요.',do:'아래의 시작하기를 누르면 한 단계씩 안내합니다.'},
    {title:'1. 화면 조종 시작',target:mobile?'#mobileJoystick':desktopControl,text:mobile?'왼쪽 원형 스틱으로 움직이고, 빈 화면을 손가락으로 밀면 보는 방향이 바뀝니다.':'게임 화면을 눌러 마우스를 잡습니다. 가운데 +가 내가 보고 있는 곳이에요.',do:mobile?'스틱과 화면 드래그를 한 번씩 해 보세요.':'“화면을 클릭해 비행 건축 시작”을 눌러 보세요.',wait:mobile?null:'start-control'},
    {title:'2. 블록 설치 — 가장 중요!',target:mobile?'#mobilePlace':'#gameCanvas',text:mobile?'가운데 +를 바닥에 맞춘 뒤 오른쪽의 설치 버튼을 누릅니다.':'가운데 +를 바닥에 맞추세요. 반투명 블록이 보이는 곳에서 마우스 오른쪽 버튼을 누릅니다.',do:'블록이 실제로 1개 생겨야 다음 단계로 넘어갑니다.',wait:'challenge-place'},
    {title:'3. 방금 블록 부수기',target:mobile?'#mobileBreak':'#gameCanvas',text:mobile?'가운데 +를 방금 만든 블록에 맞추고 파괴를 누르세요.':'가운데 +를 방금 만든 블록에 맞추고 마우스 왼쪽 버튼을 누르세요.',do:'블록이 실제로 없어지면 성공입니다.',wait:'challenge-break'},
    {title:'4. 설계도 보는 방향',target:'#blueprintView',text:'겨냥도가 어렵다면 정면도·측면도·윗면도로 바꿔 볼 수 있어요.',do:'막혔을 때는 특히 “윗면도 · 힌트”가 도움이 됩니다.'},
    {title:'5. 정육면체 / 직육면체',target:'#challengeCuboid',text:'정육면체 한 칸만 쌓는 것이 어렵다면 직육면체를 골라 여러 칸을 한 번에 만들 수 있어요.',do:'직육면체를 누르면 가로·높이·세로 값을 정할 수 있습니다.'},
    {title:'6. 면 · 선 · 점 편집',target:'#challengeToolFace',text:'건축 옆의 면·선·점 버튼은 도형의 구성 요소를 직접 확인하는 수학 도구예요.',do:'처음에는 “건축”만 사용해도 됩니다. 익숙해진 뒤 써도 돼요.'},
    {title:'7. 힌트',target:'#hintChallenge',text:'어디에 쌓아야 할지 모르겠으면 힌트 버튼을 누르세요.',do:'정답을 바로 주는 대신, 보기 쉬운 방향으로 설계도를 바꿔 줍니다.'},
    {title:'8. 검사하기',target:mobile?'#mobileCheck':'#actionCheck',text:'조금 쌓았다면 검사하기로 현재 모양이 얼마나 비슷한지 확인할 수 있어요.',do:'틀려도 괜찮아요. 틀린 곳을 보고 다시 고치면 됩니다.'},
    {title:'9. 다음 미션',target:mobile?'#mobileNext':'#actionNext',text:'한 문제를 끝냈거나 다른 모양을 연습하고 싶을 때 다음 미션으로 넘어갑니다.',do:'상단의 “튜토리얼” 버튼을 누르면 이 안내를 언제든 다시 볼 수 있어요.'},
    {title:'튜토리얼 완료!',text:'이제 최소한 “보기 → 설치 → 파괴 → 힌트 → 검사” 순서는 혼자 할 수 있어요.',do:'처음에는 블록 1개만 정확하게 놓는 것부터 시작해도 충분합니다.'}
  ];
  if(kind==='net')return[
    {title:'전개도 연구실 사용법',text:'그림을 고르고, 3D 직육면체의 면에 붙이고, 실제로 접어 확인하는 순서입니다.',do:'한 단계씩 직접 해 봐요.'},
    {title:'1. 붙일 그림 고르기',target:'#stickerPalette',text:'아래 그림 중 하나를 먼저 선택합니다.',do:'그림 하나를 눌러 보세요.',wait:'net-sticker'},
    {title:'2. 3D 면에 붙이기',target:'#gameCanvas',text:'오른쪽 3D 직육면체를 돌려 보고 원하는 면을 클릭하세요.',do:'선택한 그림이 실제 면에 붙어야 다음으로 넘어갑니다.',wait:'net-assign'},
    {title:'3. 접어 보기',target:'#foldNet',text:'전개도가 실제로 어떻게 접히는지 애니메이션으로 확인할 수 있어요.',do:'“접어 보기”를 눌러 확인해 보세요.'},
    {title:'4. 다른 수학 활동',target:'[data-net-mode="face"]',text:'면 관계, 모서리, 꼭짓점 탭은 기본 그림 배치에 익숙해진 뒤 도전하면 됩니다.',do:'처음 하는 학생은 “그림 배치”부터 시작하세요.'},
    {title:'5. 검사와 다음',target:'#actionCheck',text:'검사하기로 답을 확인하고, 다음 버튼으로 새 전개도로 바꿉니다.',do:'상단 튜토리얼 버튼으로 언제든 다시 볼 수 있어요.'}
  ];
  if(kind==='free')return[
    {title:'크리에이티브 건축 연습',text:'여기서는 재료가 무한이라 바로 설치 연습을 할 수 있어요. 블록 하나를 직접 놓고 부수는 데서 시작합니다.',do:'실패해도 아무 손해가 없습니다.'},
    {title:'1. 이동하고 바라보기',target:mobile?'#mobileJoystick':'#lockNotice',text:mobile?'왼쪽 스틱으로 이동하고 화면을 밀어 시점을 돌립니다.':'게임 화면을 눌러 마우스를 잡고 WASD로 이동합니다.',do:mobile?'바닥이 잘 보이게 시점을 내려 보세요.':'가운데 +가 바닥을 가리키게 해 보세요.',wait:mobile?null:'start-control'},
    {title:'2. 핫바에서 블록 고르기',target:'#hotbar',text:'아래 핫바에서 원하는 블록을 고릅니다. 데스크톱은 숫자 1~9로도 바꿀 수 있어요.',do:'처음에는 평범한 건축 블록을 하나 골라 보세요.'},
    {title:'3. 블록 설치',target:mobile?'#mobilePlace':'#gameCanvas',text:mobile?'가운데 +를 바닥에 맞추고 설치를 누르세요.':'가운데 +를 바닥에 맞추고 마우스 오른쪽 버튼을 누르세요.',do:'실제로 블록 하나가 생겨야 다음 단계로 넘어갑니다.',wait:'free-place'},
    {title:'4. 블록 파괴',target:mobile?'#mobileBreak':'#gameCanvas',text:mobile?'방금 만든 블록을 바라보고 파괴를 누르세요.':'방금 만든 블록을 바라보고 마우스 왼쪽 버튼을 누르세요.',do:'실제로 없어지면 성공입니다.',wait:'free-break'},
    {title:'5. 가방 · 모든 재료',target:mobile?'#mobileInventory':'#freeHint',text:mobile?'가방 버튼에서 모든 건축 재료를 찾을 수 있습니다.':'E를 누르면 모든 건축 재료와 직육면체 제작대를 볼 수 있습니다.',do:'원하는 재료를 핫바에 넣어 보세요.'},
    {title:'6. 비행',target:mobile?'#mobileFly':'#freeHint',text:mobile?'비행 버튼으로 걷기와 비행을 바꿉니다.':'F를 누르면 걷기/비행이 바뀝니다.',do:'높은 건물을 지을 때 비행이 편합니다.'},
    {title:'7. 1인칭 ↔ 3인칭 시점',target:mobile?'#mobileView':'#actionView',text:'3인칭은 내 캐릭터와 주변 공간을 함께 보기 좋고, 1인칭은 블록 면을 정확히 조준하기 좋아요. 버튼 글자는 “현재 시점”입니다.',do:mobile?'위의 시점 버튼을 한 번 눌러 실제로 바꿔 보세요.':'V 키를 한 번 누르거나 상단 “시점 · 3인칭/1인칭” 버튼을 눌러 실제로 바꿔 보세요.',wait:'free-view-toggle'},
    {title:'8. 색칠 · 수학 렌즈',target:mobile?'#mobileMore':'#actionXray',text:mobile?'도구 버튼에서 면 색칠과 수학 기능을 사용할 수 있어요.':'P는 면 색칠, X는 수학 렌즈입니다.',do:'건축에 익숙해진 뒤 하나씩 사용하면 됩니다.'},
    {title:'크리에이티브 조작 완료',text:'블록 선택 → 설치 → 파괴와 시점 전환이 되면 기본 건축은 성공입니다.',do:'상단 튜토리얼 버튼으로 언제든 다시 연습할 수 있어요.'}
  ];
  return[{title:'튜토리얼',text:'이 모드의 기본 기능을 화면에서 직접 확인해 보세요.',do:'상단 튜토리얼 버튼으로 다시 볼 수 있습니다.'}];
}
function renderTutorialStep(){
  if(!tutorialState)return;
  if(campActive()){renderCampStep();return}
  tutorialClearFocus();
  const step=tutorialState.steps[tutorialState.index],total=tutorialState.steps.length;
  const isIntro=tutorialState.index===0;
  $('tutorial').classList.remove('hidden');$('tutorial').classList.toggle('coach',!isIntro);
  $('tutorialProgress').textContent=(tutorialState.index+1)+' / '+total;
  $('tutorialBody').innerHTML=
    '<div class="tutorial-step-kicker">'+(isIntro?'처음 조작 연습':'직접 해보기')+'</div>'+
    '<h2>'+step.title+'</h2><p>'+step.text+'</p>'+
    (step.do?'<div class="tutorial-do">'+step.do+'</div>':'')+
    (step.wait?'<div class="tutorial-tip">안내대로 해 보면 다음 활동이 열려요.</div>':'');
  const target=tutorialTarget(step.target);
  if(target){target.classList.add('tutorial-focus');tutorialFocusEl=target}
  $('tutorialBack').disabled=tutorialState.index===0;
  $('tutorialBack').style.visibility=tutorialState.index===0?'hidden':'visible';
  const last=tutorialState.index===total-1;
  const conditionDone=false;
  $('tutorialClose').disabled=!!step.wait&&!conditionDone;
  $('tutorialClose').textContent=step.wait?(conditionDone?'완료 · 다음':'직접 성공해 보세요'):last?'완료':'다음';
  $('tutorialClose').onclick=()=>{if(last)tutorialFinish(true);else{tutorialState.index++;renderTutorialStep()}};
  $('tutorialBack').onclick=()=>{tutorialState.index=Math.max(0,tutorialState.index-1);renderTutorialStep()};
  $('tutorialSkip').onclick=()=>tutorialFinish(true);
}
function showTutorial(kind,force=false){
  if(kind==='free'&&gameFreeMode==='survival'){showSurvivalCamp(force);return}
  const once='cubeArchitectGuidedTutorial_v5_'+kind+
    (kind==='free'?'_'+gameFreeMode:'')+(mobileModeEnabled?'_touch':'_desktop');
  try{if(!force&&localStorage.getItem(once))return}catch(_){}
  tutorialFinish(false);
  tutorialState={kind,once,index:0,steps:tutorialSteps(kind)};
  renderTutorialStep();
}
$('actionTutorial')?.addEventListener('click',()=>showTutorial(mode==='free'?'free':mode,true));
window.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('pointerdown',e=>{
  pointerDown={x:e.clientX,y:e.clientY,button:e.button};pointerDragged=false;
  if(mobileModeEnabled&&(mode==='challenge'||mode==='free'||mode==='dungeon')){
    e.preventDefault();mobileLookPointerId=e.pointerId;mobileLookLast={x:e.clientX,y:e.clientY};
    canvas.setPointerCapture?.(e.pointerId);
  }
});
canvas.addEventListener('pointermove',e=>{
  if(mobileModeEnabled&&(mode==='challenge'||mode==='free'||mode==='dungeon')&&mobileLookPointerId===e.pointerId&&mobileLookLast){
    e.preventDefault();
    const dx=e.clientX-mobileLookLast.x,dy=e.clientY-mobileLookLast.y;
    mobileLookLast={x:e.clientX,y:e.clientY};
    if(mode==='challenge'){
      challengeYaw-=dx*.0029;challengePitch=THREE.MathUtils.clamp(challengePitch-dy*.0029,-1.45,1.45);
      updateChallengeCamera();updateChallengeGhost();
    }else if(mode==='dungeon'){
      dungeonYaw-=dx*.0029;dungeonPitch=THREE.MathUtils.clamp(dungeonPitch-dy*.0029,-1.25,1.25);updateDungeonCamera();
    }else{
      yaw-=dx*.0029;pitch=THREE.MathUtils.clamp(pitch-dy*.0029,-1.35,1.35);
      camera.rotation.y=yaw;camera.rotation.x=pitch;
    }
  }
  if(pointerDown&&(Math.abs(e.clientX-pointerDown.x)>5||Math.abs(e.clientY-pointerDown.y)>5))pointerDragged=true;
});
canvas.addEventListener('pointerup',e=>{
  if(e.pointerId===mobileLookPointerId){mobileLookPointerId=null;mobileLookLast=null}
  if(pointerDragged){pointerDown=null;return}
  if(mode==='net'&&e.button===0){assignNetFace(netHit(e))}
  pointerDown=null;
});
canvas.addEventListener('pointercancel',e=>{
  if(e.pointerId===mobileLookPointerId){mobileLookPointerId=null;mobileLookLast=null}
  pointerDown=null;
});
canvas.addEventListener('mousedown',e=>{
  if(document.pointerLockElement!==canvas)return;
  if(mode==='challenge'){
    const hit=challengeCenterHit(12);
    if(e.button===0){
      if(challengeTool==='face')paintLookedChallengeFace();
      else if(challengeTool==='edge'||challengeTool==='vertex')selectLookedChallengePiece();
      else if(hit?.object.userData.challenge)removeChallengeBlock(hit.object);
    }
    if(e.button===2){
      if(challengeTool==='face')paintLookedChallengeFace();
      else if(challengeTool==='edge'||challengeTool==='vertex')selectLookedChallengePiece();
      else{const p=challengePlaceTarget(hit);if(p&&!addChallengeCuboid(p.x,p.y,p.z,challengeDims()))toast('공간이 부족하거나 다른 도형과 겹쳐요.')}
    }
    updateChallengeStats();updateChallengeGhost();return;
  }
  if(mode==='free'){
    if(freeAvatarDefeated)return;
    const hit=freeCenterHit(6);
    if(e.button===0){
      if(hitWildCreature())return;
      if(gameFreeMode==='survival')startMining('mouse');
      else breakFreeBlock(hit);
    }
    if(e.button===2)placeFreeBlock(hit);
  }
});
window.addEventListener('mouseup',e=>{if(e.button===0&&miningSource==='mouse')stopMining()});
canvas.addEventListener('click',()=>{if(!mobileModeEnabled&&(mode==='free'||mode==='challenge'||mode==='dungeon')&&document.pointerLockElement!==canvas&&($('tutorial').classList.contains('hidden')||campActive())&&!(mode==='free'&&(inventoryOpen||furnaceOpen||lifePanelOpen)))requestGamePointerLock()});
document.addEventListener('pointerlockchange',()=>{
  if(mode==='free'&&document.pointerLockElement!==canvas&&miningSource==='mouse')stopMining();
  if(mode==='free')$('lockNotice').classList.toggle('hidden',mobileModeEnabled||inventoryOpen||furnaceOpen||lifePanelOpen||document.pointerLockElement===canvas);
  if(mode==='challenge')$('challengeLockNotice').classList.toggle('hidden',mobileModeEnabled||document.pointerLockElement===canvas);
  if(mode==='dungeon')$('dungeonPrompt').classList.toggle('hidden',document.pointerLockElement!==canvas&&!mobileModeEnabled);
});
document.addEventListener('mousemove',e=>{
  if(document.pointerLockElement!==canvas)return;
  if(mode==='challenge'){challengeYaw-=e.movementX*.0023;challengePitch-=e.movementY*.0023;challengePitch=THREE.MathUtils.clamp(challengePitch,-1.45,1.45);updateChallengeCamera();return}
  if(mode==='dungeon'){dungeonYaw-=e.movementX*.0023;dungeonPitch-=e.movementY*.0023;dungeonPitch=THREE.MathUtils.clamp(dungeonPitch,-1.25,1.25);updateDungeonCamera();return}
  if(mode==='free'){yaw-=e.movementX*.0023;pitch-=e.movementY*.0023;pitch=THREE.MathUtils.clamp(pitch,-1.35,1.35)}
});
document.addEventListener('keydown',e=>{
  if(mode==='dungeon'){
    dungeonKeys[e.code]=true;
    if(e.code==='KeyE'||e.code==='KeyQ'){e.preventDefault();dungeonInteract()}
    if(e.code==='Escape'){returnFromDungeon();return}
    return;
  }
  if(mode==='challenge'){
    challengeKeys[e.code]=true;
    if(e.code==='Space'||e.code==='ShiftLeft'||e.code==='ShiftRight')e.preventDefault();
    if(e.code==='KeyC')checkChallenge();
    if(e.code==='KeyH'){$('blueprintView').value='top';blueprintAngle='top';drawBlueprint()}
    if(e.code==='KeyG')selectLookedChallengePiece();
    if(e.code==='KeyP')paintLookedChallengeFace();
    if(e.code==='KeyB')setChallengeTool('build');
    if(e.code==='KeyN'&&!restorationSession){missionIndex=(missionIndex+1)%activeChallengeMissions().length;clearChallenge();drawBlueprint()}
    return;
  }
  if(mode!=='free')return;
  if(freeAvatarDefeated){e.preventDefault();return}
  if(lifePanelOpen){if(e.code==='Escape'||e.code==='KeyE'){e.preventDefault();closeLifePanel()}return}
  if(worksOpen){if(e.code==='Escape')toggleBuildingWorks(false);return}
  if(e.code==='KeyH'&&campActive()){e.preventDefault();campHelp(campStep());return}
  if(e.code==='KeyE'){e.preventDefault();if(furnaceOpen)toggleFurnace(false);else toggleInventory();return}
  if(e.code==='Escape'&&(inventoryOpen||furnaceOpen)){if(inventoryOpen)toggleInventory(false);if(furnaceOpen)toggleFurnace(false);return}
  if(inventoryOpen||furnaceOpen)return;
  freeKeys[e.code]=true;
  if(e.code==='Space'&&!freeFlying){
    const fluid=playerEnvironmentState(camera.position.x,freePhysicsY,camera.position.z);
    if(fluid.water||fluid.lava)e.preventDefault();
    else if(!e.repeat){queueFreeJump();e.preventDefault()}
  }
  if(/^Digit[1-9]$/.test(e.code)){
    stopMining();selectedHotbarSlot=Number(e.code.slice(-1))-1;selectedType=hotbarTypes[selectedHotbarSlot]||'hand';buildHotbar();updateFreeMission();
  }
  if(e.code==='KeyF'&&gameFreeMode==='survival'){e.preventDefault();if(!interactWildCreature())toast('가까운 평화 생물을 십자선으로 바라보고 F를 눌러 보세요.');return}
  if(e.code==='KeyF'&&gameFreeMode==='creative'){freeFlying=!freeFlying;freeVelocityY=0;toast(freeFlying?'크리에이티브 비행 ON · Space 상승 / Shift 하강':'비행 OFF · 다시 지면의 물리를 따릅니다.');refreshMobileFly();updateFreeMission()}
  if(e.code==='KeyR'&&gameFreeMode==='creative')pickTargetBlock();
  if(e.code==='KeyP')paintLookedFace();
  if(e.code==='KeyX')toggleXray();
  if(e.code==='KeyT'&&gameFreeMode==='creative')cycleWeather();
  if(e.code==='KeyV'){cycleFreeView();return}
  if(e.code==='KeyQ'&&gameFreeMode==='survival'&&nearLandmarkPoi&&!restoredLandmarks.has(nearLandmarkPoi.id)){
    openLandmarkDungeon(nearLandmarkPoi);return;
  }
  if(e.code==='KeyQ'&&gameFreeMode==='creative'&&nearRuin){
    toast('폐허에서 발견한 겨냥도를 복원해 보세요.');missionIndex=3;setTimeout(()=>enterMode('challenge'),450)
  }
});
document.addEventListener('keyup',e=>{challengeKeys[e.code]=false;freeKeys[e.code]=false;dungeonKeys[e.code]=false});
window.addEventListener('blur',()=>{stopMining();resetMobileInput();challengeKeys={};freeKeys={};dungeonKeys={}});
function reportResult(kind,score,cleared){
  try{parent.postMessage({type:'kidscade-result',game:'큐브 아키텍트',mode:kind,score:score,cleared:cleared},'*')}catch(e){}
  if(!cleared)return;
  try{
    if(kind==='challenge'){
      KidscadeGame?.achievement?.('cube3d.first_blueprint');
      if(Number(score)>=100)KidscadeGame?.achievement?.('cube3d.perfect_blueprint');
    }
    if(String(kind).startsWith('net')){
      KidscadeGame?.achievement?.('cube3d.first_net');
      KidscadeGame?.achievementIncrement?.('cube3d.net_master',1);
    }
    if(kind==='survival-landmark')KidscadeGame?.achievement?.('cube3d.landmark_restorer');
    if(kind==='free-survival')KidscadeGame?.achievement?.('cube3d.survival_complete');
  }catch(_){}
}
function resize(){
  const w=innerWidth,h=innerHeight;if(renderer)renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
}
window.addEventListener('resize',resize);
let last=performance.now();
function persistFreeWorldOnExit(){
  if(mode==='free')saveFreeWorld();
}
window.addEventListener('pagehide',persistFreeWorldOnExit);
window.addEventListener('beforeunload',persistFreeWorldOnExit);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')persistFreeWorldOnExit()});

function animate(now){
  requestAnimationFrame(animate);
  if(window.CubeArchitectExternalPause){last=now;return}
  const dt=Math.min(.04,(now-last)/1000);last=now;
  if(orbit)orbit.update();
  if(mode==='challenge')updateChallengeFly(dt);
  if(mode==='dungeon')updateDungeon(dt);
  if(mode==='free'){
    updateFree(dt,now);
    if(freeSaveDirty){
      if(now>=freeSaveDueAt)saveFreeWorld();
    }else if(now-lastFreeSave>30000)saveFreeWorld();
  }
  if(renderer){
    if(mode==='free')renderFreeScene(now);
    else renderer.render(scene,camera);
  }
}
window.CubeArchitectReady=true;
window.CubeArchitect={enterMode,showHome};

})();

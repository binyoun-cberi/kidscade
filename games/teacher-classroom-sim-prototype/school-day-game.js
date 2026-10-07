import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import {
  AI_RULES,STUDENT_PROFILES,createStudentRuntime,resetFocusForLesson,updateLessonFocus,helpFocus,
  resetSocialForRecess,recoverSocial,drainSocial,conflictProbability,clamp
} from './student-ai.mjs?v=68';
import {SCHOOL_SPACES,DAY_STEPS,PERIODS} from './school-day.mjs?v=68';
import {
  preferenceFor,preferenceMultiplier,preferenceIcon,
  createDailyEnvironment,createDailyHealth,healthRecoveryMultiplier,tickHealth,nextHealthAction,
  beginSafetyRecord,tickSafetyRecord,unsafeAccidentChance,buildPairs,
  friendshipKey,friendshipInfo,addFriendship,friendshipConflictDuration,
  friendshipSelfReconcileChance,friendshipChatterChance,
  SAFETY_RULES,GROUP_RULES,FRIENDSHIP_RULES
} from './student-life.mjs?v=68';
import {
  CAMPAIGN_DAYS,EXAM_DAYS,GRADE_ORDER,
  createCampaignState,normalizeCampaignState,examNumberForDay,nextExamInfo,
  gradeIndex,learningGain,addLearning,conductExam,latestExam,targetReachedCount
} from './school-campaign.mjs?v=69';

const $=id=>document.getElementById(id);
const ui={
  app:$('app'),canvas:$('game'),phase:$('phaseLabel'),clock:$('clock'),timer:$('phaseTimer'),
  classState:$('classState'),studentStrip:$('studentStrip'),dayStrip:$('dayStrip'),campaignStatus:$('campaignStatus'),
  guideKicker:$('guideKicker'),guideTitle:$('guideTitle'),guideText:$('guideText'),
  toast:$('toast'),action:$('actionButton'),actionIcon:$('actionIcon'),actionLabel:$('actionLabel'),
  intro:$('intro'),start:$('startButton'),help:$('help'),helpButton:$('helpButton'),
  closeHelp:$('closeHelpButton'),end:$('endPanel'),summary:$('summary'),restart:$('restartButton'),
  endEyebrow:$('endEyebrow'),endTitle:$('endTitle'),examResults:$('examResults'),
  assetError:$('assetError'),joy:$('joystick'),joyKnob:$('joyKnob'),
  bell:$('bellAudio'),talk:$('talkAudio'),fight:$('fightAudio')
};

const renderer=new THREE.WebGLRenderer({canvas:ui.canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.65));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.04;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;

const scene=new THREE.Scene();
scene.background=new THREE.Color(0xbfdcf0);
scene.fog=new THREE.Fog(0xbfdcf0,18,38);
const camera=new THREE.PerspectiveCamera(50,1,.1,80);
const clock3d=new THREE.Clock();

const world=new THREE.Group();scene.add(world);
const roomRoot=new THREE.Group();world.add(roomRoot);
const actorRoot=new THREE.Group();world.add(actorRoot);
const fxRoot=new THREE.Group();world.add(fxRoot);

scene.add(new THREE.HemisphereLight(0xf6fbff,0x78654f,2.25));
const sun=new THREE.DirectionalLight(0xffffff,2.35);
sun.position.set(-6,12,8);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
sun.shadow.camera.left=-12;sun.shadow.camera.right=12;sun.shadow.camera.top=10;sun.shadow.camera.bottom=-12;
scene.add(sun);
const fill=new THREE.DirectionalLight(0xcde8ff,.8);fill.position.set(7,6,-8);scene.add(fill);

const ROOM={minX:-7.2,maxX:7.2,minZ:-5,maxZ:5};
const DOOR_POINT=new THREE.Vector3(6.55,0,-3.55);
const ENTRY_POINT=new THREE.Vector3(5.85,0,-3.0);
const COLORS={
  minsu:'#e58b5a',jiwoo:'#65a79c',seoyeon:'#9d8bc5',taeho:'#e7bd55',
  junho:'#d26f67',arin:'#69a8c2',teacher:'#4b79d1'
};

let furnitureRoot=new THREE.Group();roomRoot.add(furnitureRoot);
let decoRoot=new THREE.Group();roomRoot.add(decoRoot);
let boardMesh=null;
let teachingMarker=null;
let doorMarker=null;
let spaceBuildSerial=0;
let activeSpace=SCHOOL_SPACES.classroom;
let activeSeats=activeSpace.seats.map(p=>new THREE.Vector3(p.x,0,p.z));
let obstacleRects=activeSpace.obstacles.map(o=>({...o}));

let started=false,paused=false;
let stepIndex=0,currentStep=DAY_STEPS[0],stepTime=0;
let schoolMinute=9*60;
let interactionScan=0,pairScan=0,currentAction={type:'none'};
let toastTimer=0,playerGestureTimer=0;
const CHARACTER_ROOT='../../assets/game/npcs/glTF/';
const CHARACTER_VISUALS=Object.freeze({
  teacher:{file:'Suit_Female.gltf',height:1.68},
  minsu:{file:'Casual_Male.gltf',height:1.36},
  jiwoo:{file:'Casual_Female.gltf',height:1.33},
  seoyeon:{file:'Casual2_Female.gltf',height:1.38},
  taeho:{file:'Casual2_Male.gltf',height:1.39},
  junho:{file:'Casual3_Male.gltf',height:1.41},
  arin:{file:'Casual3_Female.gltf',height:1.32},
  nurse:{file:'Doctor_Female_Young.gltf',height:1.66}
});
const characterCache=new Map();
let player=null,students=[],pairs=[],relations=new Set();
let friendships=new Map();
let lessonChats=[];
let chatterScanTimer=0;
let chatterCooldowns=new Map();
let fightsThisSocial=0;
let lessonElapsed=0;
let teamPairs=[];
let teamActive=false;
let teamCheckTimer=0;
let lessonAccidents=0;
const CAMPAIGN_STORAGE_KEY='kidscade_teacher_campaign_v1';
let campaign=loadCampaign();
let dayFinished=false;
let environment=createDailyEnvironment();
let stats={
  focusHelps:0,conflictsMediated:0,fightsSeparated:0,missedFights:0,
  offTaskStarts:0,peacefulSocial:0,periodsCompleted:0,spacesVisited:new Set(['classroom']),
  healthChecks:0,nurseVisits:0,earlyDismissals:0,classroomRests:0,accidents:0,safetyMisses:0,teamConflicts:0,
  friendshipLevelUps:0,selfReconciles:0,lessonChats:0,chatsStopped:0
};
const keys=new Set();
const joy={active:false,id:null,x:0,y:0};

function loadCampaign(){
  let raw=null;
  try{raw=JSON.parse(localStorage.getItem(CAMPAIGN_STORAGE_KEY)||'null')}catch(_){}
  let state=normalizeCampaignState(raw,STUDENT_PROFILES.map(s=>s.id));
  if(state.dayComplete){
    if(state.day<CAMPAIGN_DAYS){
      state.day++;
      state.dayComplete=false;
      state.finalSuccess=null;
    }else{
      state=createCampaignState(STUDENT_PROFILES.map(s=>s.id));
    }
    try{localStorage.setItem(CAMPAIGN_STORAGE_KEY,JSON.stringify(state))}catch(_){}
  }
  return state;
}
function saveCampaign(){
  try{localStorage.setItem(CAMPAIGN_STORAGE_KEY,JSON.stringify(campaign))}catch(_){}
}
function resetCampaign(){
  campaign=createCampaignState(STUDENT_PROFILES.map(s=>s.id));
  try{localStorage.removeItem(CAMPAIGN_STORAGE_KEY)}catch(_){}
}
function campaignGradeGoalText(){
  const latest=latestExam(campaign);
  if(!latest)return '📝 1차 시험에서 현재 등급을 확인해요';
  const reached=targetReachedCount(campaign);
  return '🎯 목표 달성 '+reached+'/6 · 전원 한 단계 상승';
}
function updateCampaignStatus(){
  if(!ui.campaignStatus)return;
  const exam=nextExamInfo(campaign.day);
  const when=exam.daysAway===0?'오늘 '+exam.examNumber+'차 시험':exam.examNumber+'차 시험 D-'+exam.daysAway;
  ui.campaignStatus.innerHTML='<strong>📅 '+campaign.day+'/'+CAMPAIGN_DAYS+'일차</strong> · '+when+'<br>'+campaignGradeGoalText();
}
function currentGradeLabel(id){
  const latest=latestExam(campaign);
  if(!latest)return '';
  const row=latest.rows.find(r=>r.id===id);
  const target=campaign.targetGrades?.[id];
  if(!row||!target)return '';
  return row.grade+'→'+target;
}

function mat(color,rough=.82){return new THREE.MeshStandardMaterial({color,roughness:rough,metalness:0})}
function box(w,h,d,color){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));
  m.castShadow=true;m.receiveShadow=true;return m;
}
function plane(w,h,color){
  const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat(color));
  m.receiveShadow=true;return m;
}
function addLine(x,z,w,d,color=0xf5f7f8){
  const m=box(w,.018,d,color);m.position.set(x,.012,z);decoRoot.add(m);return m;
}
function clearGroup(group){while(group.children.length)group.remove(group.children[0])}

function makeTextPlane(text,w=800,h=180,color='#f7f3d1',bg='#355d4f'){
  const c=document.createElement('canvas');c.width=w;c.height=h;
  const ctx=c.getContext('2d');
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
  const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:tex}));
  m.userData={canvas:c,ctx,texture:tex,color,bg};
  writeTextPlane(m,text);return m;
}
function writeTextPlane(mesh,text){
  if(!mesh?.userData?.ctx)return;
  const {canvas:c,ctx,texture,color,bg}=mesh.userData;
  ctx.fillStyle=bg;ctx.fillRect(0,0,c.width,c.height);
  ctx.fillStyle=color;ctx.font='900 68px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(text,c.width/2,c.height/2);texture.needsUpdate=true;
}
function updateBoard(text){writeTextPlane(boardMesh,text)}

const assetCache=new Map();
async function loadAssetTemplate(url){
  if(assetCache.has(url))return assetCache.get(url);
  const promise=new GLTFLoader().loadAsync(url).then(g=>g.scene);
  assetCache.set(url,promise);return promise;
}
function normalizeStatic(root,targetSize){
  root.updateMatrixWorld(true);
  let b=new THREE.Box3().setFromObject(root),size=b.getSize(new THREE.Vector3());
  const max=Math.max(size.x,size.y,size.z)||1;
  root.scale.multiplyScalar(targetSize/max);root.updateMatrixWorld(true);
  b=new THREE.Box3().setFromObject(root);
  const center=b.getCenter(new THREE.Vector3());
  root.position.x-=center.x;root.position.z-=center.z;root.position.y-=b.min.y;
}
function placeAsset(url,{x=0,y=0,z=0,size=1,rot=0,fallback=[.8,.5,.8,0x8c9aa5],parent=null}={}){
  const host=parent||furnitureRoot;
  const placeholder=box(fallback[0],fallback[1],fallback[2],fallback[3]);
  placeholder.position.set(x,y+fallback[1]/2,z);placeholder.rotation.y=rot;host.add(placeholder);
  const serial=spaceBuildSerial;
  loadAssetTemplate(url).then(template=>{
    if(serial!==spaceBuildSerial||!placeholder.parent)return;
    const model=template.clone(true);normalizeStatic(model,size);
    model.position.set(x,y,z);model.rotation.y=rot;
    model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
    host.add(model);host.remove(placeholder);
  }).catch(err=>console.warn('[TeacherSim] asset fallback kept',url,err));
}

function addWalls(space){
  const floor=box(15,.18,10.8,space.floor);floor.position.y=-.12;roomRoot.add(floor);
  const back=box(15,3.7,.18,space.wall);back.position.set(0,1.75,-5.35);roomRoot.add(back);
  const left=box(.18,3.7,10.8,space.wall);left.position.set(-7.55,1.75,0);roomRoot.add(left);
  const right=box(.18,3.7,10.8,space.wall);right.position.set(7.55,1.75,0);roomRoot.add(right);

  const frame=box(6.55,2.18,.09,0x8f6848);frame.position.set(0,2.15,-5.24);roomRoot.add(frame);
  const board=box(6.2,1.9,.14,Number.parseInt(space.accent.slice(1),16));board.position.set(0,2.15,-5.10);roomRoot.add(board);
  boardMesh=makeTextPlane(space.name,760,180,'#f7f3d1',space.accent);
  boardMesh.scale.set(4.8,1.15,1);boardMesh.position.set(0,2.15,-5.0);roomRoot.add(boardMesh);

  const door=box(.16,2.6,1.75,0x9b704f);door.position.set(7.43,1.3,-3.55);roomRoot.add(door);
  const doorSign=makeTextPlane('이동',250,120,'#ffffff','#5b4635');
  doorSign.scale.set(.72,.34,1);doorSign.rotation.y=-Math.PI/2;doorSign.position.set(7.33,1.65,-3.55);roomRoot.add(doorSign);

  teachingMarker=new THREE.Mesh(new THREE.RingGeometry(.42,.62,36),new THREE.MeshBasicMaterial({color:0xffdf78,transparent:true,opacity:.78,side:THREE.DoubleSide}));
  teachingMarker.rotation.x=-Math.PI/2;teachingMarker.position.set(space.teachingPoint.x,.03,space.teachingPoint.z);roomRoot.add(teachingMarker);

  doorMarker=new THREE.Mesh(new THREE.RingGeometry(.46,.68,36),new THREE.MeshBasicMaterial({color:0x7dd3fc,transparent:true,opacity:.84,side:THREE.DoubleSide}));
  doorMarker.rotation.x=-Math.PI/2;doorMarker.position.copy(DOOR_POINT);doorMarker.position.y=.03;doorMarker.visible=false;roomRoot.add(doorMarker);
}
function addClassroom(space){
  const deskUrl='../../assets/game/3d/interiors/kenney-furniture-kit/desk.glb';
  const chairUrl='../../assets/game/3d/interiors/kenney-furniture-kit/chair-desk.glb';
  const bookUrl='../../assets/game/3d/interiors/kenney-furniture-kit/bookcase-open.glb';
  const screenUrl='../../assets/game/3d/interiors/kenney-furniture-kit/computer-screen.glb';
  for(let i=0;i<space.seats.length;i++){
    const s=space.seats[i],deskZ=i<3?-2.4:0;
    placeAsset(deskUrl,{x:s.x,z:deskZ,size:1.38,rot:Math.PI,fallback:[1.4,.65,.78,0xc99761]});
    placeAsset(chairUrl,{x:s.x,z:s.z-.30,size:.74,rot:Math.PI,fallback:[.64,.55,.62,0x5c8eb0]});
  }
  placeAsset(bookUrl,{x:-6.25,z:-3.9,size:1.8,rot:Math.PI/2,fallback:[1.2,1.55,.55,0x967555]});
  placeAsset(screenUrl,{x:4.75,y:.78,z:3.25,size:.68,rot:Math.PI,fallback:[.7,.5,.15,0x3b4855]});
  const desk=box(2.2,.72,1.05,0x8b623f);desk.position.set(4.75,.36,3.35);furnitureRoot.add(desk);
  const rug=plane(3.7,2.0,0x9ac2b6);rug.rotation.x=-Math.PI/2;rug.position.set(-4.8,.002,3.35);decoRoot.add(rug);
}
function addGym(){
  for(let z=-3;z<=3;z+=2)addLine(0,z,12.4,.05);
  addLine(0,0,.05,8.5);
  const circle=new THREE.Mesh(new THREE.RingGeometry(1.15,1.21,48),new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide}));
  circle.rotation.x=-Math.PI/2;circle.position.y=.02;decoRoot.add(circle);
  const benchUrl='../../assets/game/3d/interiors/kenney-furniture-kit/bench.glb';
  placeAsset(benchUrl,{x:-6.1,z:3.5,size:1.9,rot:Math.PI/2,fallback:[1.8,.48,.55,0x54768a]});
  placeAsset(benchUrl,{x:6.1,z:3.5,size:1.9,rot:-Math.PI/2,fallback:[1.8,.48,.55,0x54768a]});
  const pole=box(.16,2.4,.16,0x5b6671);pole.position.set(0,1.2,-4.6);decoRoot.add(pole);
  const back=box(1.9,1.1,.12,0xeaf3f8);back.position.set(0,2.45,-4.45);decoRoot.add(back);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(.42,.055,10,28),mat(0xe8792e,.55));rim.rotation.x=Math.PI/2;rim.position.set(0,2.1,-4.0);decoRoot.add(rim);
  const ballUrl='../../assets/game/platformer/props/ball.glb';
  for(const [x,z] of [[-4.8,2.5],[-4.1,2.75],[-3.4,2.5]])placeAsset(ballUrl,{x,z,size:.48,fallback:[.42,.42,.42,0xe38b3c],parent:decoRoot});
}
function addScience(space){
  const tableUrl='../../assets/game/3d/interiors/kenney-furniture-kit/table.glb';
  const stoolUrl='../../assets/game/3d/interiors/kenney-furniture-kit/stool-bar-square.glb';
  const sinkUrl='../../assets/game/3d/interiors/kenney-furniture-kit/kitchen-sink.glb';
  for(const o of space.obstacles.slice(0,4))placeAsset(tableUrl,{x:o.x,z:o.z,size:2.25,fallback:[o.hx*1.8,.7,o.hz*1.55,0x6b837d]});
  for(const s of space.seats)placeAsset(stoolUrl,{x:s.x,z:s.z-.28,size:.62,fallback:[.42,.55,.42,0x4f6f69]});
  placeAsset(sinkUrl,{x:5.8,z:-3.9,size:1.45,rot:-Math.PI/2,fallback:[1.55,.9,.68,0x879b96]});
  for(const [x,z,c] of [[-2.8,-2.1,0x64b5f6],[-2.3,-2.1,0xf6c85f],[2.3,-2.1,0xd77ac8],[2.8,-2.1,0x63c59c]]){
    const tube=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,.5,12),new THREE.MeshStandardMaterial({color:c,roughness:.35,transparent:true,opacity:.82}));
    tube.position.set(x,.95,z);decoRoot.add(tube);
  }
}
function addCafeteria(space){
  const tableUrl='../../assets/game/3d/bakery/interior/table-round-a.glb';
  const chairUrl='../../assets/game/3d/bakery/interior/chair.glb';
  const counterUrl='../../assets/game/3d/bakery/interior/counter-table.glb';
  const trayUrl='../../assets/game/3d/bakery/interior/serving-tray.glb';
  const foodUrl='../../assets/game/3d/bakery/restaurant-bits/food-dinner.glb';
  for(const o of space.obstacles.slice(0,3))placeAsset(tableUrl,{x:o.x,z:o.z,size:2.05,fallback:[2.0,.68,1.25,0xb8895d]});
  for(const s of space.seats)placeAsset(chairUrl,{x:s.x,z:s.z-.30,size:.68,fallback:[.56,.58,.56,0x78909c]});
  placeAsset(counterUrl,{x:5.75,z:-3.8,size:2.0,rot:-Math.PI/2,fallback:[2.0,.9,.85,0xb47c4e]});
  for(const [x,z] of [[-3,-1.45],[1.6,-1.45],[-.7,1.25]])placeAsset(trayUrl,{x,y:.72,z,size:.58,fallback:[.62,.08,.42,0xb0bec5],parent:decoRoot});
  placeAsset(foodUrl,{x:5.45,y:.92,z:-3.8,size:.55,fallback:[.5,.22,.4,0x8fba65],parent:decoRoot});
}
function addArt(space){
  const tableUrl='../../assets/game/3d/interiors/kenney-furniture-kit/table.glb';
  const stoolUrl='../../assets/game/3d/interiors/kenney-furniture-kit/stool-bar.glb';
  const bookUrl='../../assets/game/3d/interiors/kenney-furniture-kit/bookcase-open-low.glb';
  for(const o of space.obstacles.slice(0,4))placeAsset(tableUrl,{x:o.x,z:o.z,size:2.2,fallback:[o.hx*1.85,.7,o.hz*1.55,0xc18e68]});
  for(const s of space.seats)placeAsset(stoolUrl,{x:s.x,z:s.z-.28,size:.62,fallback:[.45,.55,.45,0x7290a0]});
  placeAsset(bookUrl,{x:-6.1,z:-3.9,size:1.55,rot:Math.PI/2,fallback:[1.25,1.0,.5,0x916f59]});
  const colors=[0xee6b6e,0xf5c65c,0x63b38b,0x5b91d8,0xa276c8,0xf08aa8];
  colors.forEach((c,i)=>{
    const jar=new THREE.Mesh(new THREE.CylinderGeometry(.11,.13,.28,12),mat(c,.5));jar.position.set(-2.8+i*1.1,.86,-2.05);decoRoot.add(jar);
  });
  for(const x of [-4.9,4.9]){
    const canvas=box(1.1,1.25,.08,0xf9f1df);canvas.position.set(x,1.25,3.6);canvas.rotation.y=x<0?.25:-.25;decoRoot.add(canvas);
    const leg=box(.08,1.7,.08,0x8f6848);leg.position.set(x,.85,3.75);decoRoot.add(leg);
  }
}
function addComputer(space){
  const deskUrl='../../assets/game/3d/interiors/kenney-furniture-kit/desk.glb';
  const chairUrl='../../assets/game/3d/interiors/kenney-furniture-kit/chair-desk.glb';
  const screenUrl='../../assets/game/3d/interiors/kenney-furniture-kit/computer-screen.glb';
  const keyUrl='../../assets/game/3d/interiors/kenney-furniture-kit/computer-keyboard.glb';
  const mouseUrl='../../assets/game/3d/interiors/kenney-furniture-kit/computer-mouse.glb';
  for(let i=0;i<space.seats.length;i++){
    const s=space.seats[i],o=space.obstacles[i];
    placeAsset(deskUrl,{x:o.x,z:o.z,size:1.45,fallback:[1.45,.64,.78,0x69798a]});
    placeAsset(chairUrl,{x:s.x,z:s.z-.28,size:.7,rot:Math.PI,fallback:[.62,.55,.6,0x4f6b83]});
    placeAsset(screenUrl,{x:o.x,y:.72,z:o.z-.05,size:.55,rot:Math.PI,fallback:[.5,.38,.12,0x293b4c],parent:decoRoot});
    placeAsset(keyUrl,{x:o.x,y:.72,z:o.z+.23,size:.38,rot:Math.PI,fallback:[.38,.05,.15,0x3a4650],parent:decoRoot});
    if(i<3)placeAsset(mouseUrl,{x:o.x+.38,y:.72,z:o.z+.22,size:.16,rot:Math.PI,fallback:[.12,.06,.16,0x3a4650],parent:decoRoot});
  }
}
function buildSpace(spaceId){
  const space=SCHOOL_SPACES[spaceId]||SCHOOL_SPACES.classroom;
  activeSpace=space;activeSeats=space.seats.map(p=>new THREE.Vector3(p.x,0,p.z));
  obstacleRects=space.obstacles.map(o=>({...o}));
  stats.spacesVisited.add(space.id);
  spaceBuildSerial++;
  clearGroup(roomRoot);
  furnitureRoot=new THREE.Group();decoRoot=new THREE.Group();
  roomRoot.add(furnitureRoot,decoRoot);
  addWalls(space);
  if(space.id==='classroom')addClassroom(space);
  else if(space.id==='gym')addGym(space);
  else if(space.id==='science')addScience(space);
  else if(space.id==='cafeteria')addCafeteria(space);
  else if(space.id==='art')addArt(space);
  else if(space.id==='computer')addComputer(space);
  scene.fog.color.set(space.wall);scene.background.set(space.id==='gym'?0xc7e4ee:0xc4dcea);
}

function inPlaceCharacterClip(source){
  if(!source)return null;
  const clip=source.clone?source.clone():source;
  if(clip?.tracks){
    clip.tracks=clip.tracks.filter(track=>!/(^|[./])(?:root|bone)\.position$/i.test(String(track.name||'')));
  }
  return clip;
}
function normalizeCharacterModel(model,height){
  model.updateMatrixWorld(true);
  let bounds=new THREE.Box3().setFromObject(model);
  const size=bounds.getSize(new THREE.Vector3());
  const baseHeight=Math.max(.001,size.y||Math.max(size.x,size.z)||1);
  model.scale.multiplyScalar((Number(height)||1.4)/baseHeight);
  model.updateMatrixWorld(true);
  bounds=new THREE.Box3().setFromObject(model);
  const center=bounds.getCenter(new THREE.Vector3());
  model.position.x-=center.x;
  model.position.z-=center.z;
  model.position.y-=bounds.min.y;
  model.updateMatrixWorld(true);
}
function loadCharacterAsset(file){
  if(!characterCache.has(file)){
    const url=CHARACTER_ROOT+file;
    characterCache.set(file,new GLTFLoader().loadAsync(url));
  }
  return characterCache.get(file);
}
function makeFallbackPerson(height,color){
  const root=new THREE.Group();
  const body=box(.42,height*.56,.30,color);
  body.position.y=height*.47;root.add(body);
  const head=new THREE.Mesh(
    new THREE.SphereGeometry(height*.14,14,10),
    new THREE.MeshStandardMaterial({color:0xe5b98d,roughness:.9})
  );
  head.position.y=height*.83;head.castShadow=true;root.add(head);
  return root;
}
function pickCharacterClips(gltf){
  const clips=Array.isArray(gltf?.animations)?gltf.animations:[];
  const idle=inPlaceCharacterClip(clips.find(c=>/idle|stand/i.test(c.name))||clips[0]||null);
  const walk=inPlaceCharacterClip(clips.find(c=>/walk|run/i.test(c.name))||idle);
  const gesture=inPlaceCharacterClip(
    clips.find(c=>/push|attack|punch|hit|wave|talk|gesture|point/i.test(c.name))||idle
  );
  return {idle,walk,push:gesture};
}
async function makeActor(kind,profile,index,pos){
  const visual=kind==='teacher'?CHARACTER_VISUALS.teacher:(CHARACTER_VISUALS[profile?.id]||CHARACTER_VISUALS.minsu);
  let model=null,clips={idle:null,walk:null,push:null},usingFallback=false;
  try{
    const gltf=await loadCharacterAsset(visual.file);
    model=cloneSkeleton(gltf.scene);
    normalizeCharacterModel(model,visual.height);
    model.traverse(o=>{
      if(o.isMesh){o.castShadow=true;o.receiveShadow=true}
      if(o.isSkinnedMesh)o.frustumCulled=false;
    });
    clips=pickCharacterClips(gltf);
  }catch(err){
    console.warn('[TeacherSim] character asset fallback',visual.file,err);
    model=makeFallbackPerson(visual.height,kind==='teacher'?0x4b79d1:Number.parseInt(String(COLORS[profile?.id]||'#78909c').slice(1),16));
    usingFallback=true;
  }

  const root=new THREE.Group();
  root.position.copy(pos);
  root.add(model);
  actorRoot.add(root);
  const mixer=usingFallback?{update(){},clipAction(){return null}}:new THREE.AnimationMixer(model);
  const actor={
    root,model,mixer,clips,action:null,anim:'',target:pos.clone(),
    speed:kind==='teacher'?3.2:1.15,kind,navGoal:'',navPath:[],
    visualId:kind==='teacher'?'teacher':profile?.id,usingFallback
  };
  playAnim(actor,'idle');
  return actor;
}
function playAnim(actor,name){
  if(actor.anim===name)return;
  const clip=actor.clips?.[name]||actor.clips?.idle;
  if(!clip){actor.anim=name;return}
  const next=actor.mixer.clipAction(clip);
  if(!next){actor.anim=name;return}
  if(actor.action&&actor.action!==next)actor.action.fadeOut(.1);
  next.reset().setLoop(THREE.LoopRepeat,Infinity).fadeIn(.1).play();
  actor.action=next;actor.anim=name;
}
function faceDirection(actor,dx,dz){
  if(Math.abs(dx)+Math.abs(dz)>.001)actor.root.rotation.y=Math.atan2(dx,dz);
}
async function createActors(){
  player=await makeActor('teacher',null,0,new THREE.Vector3(0,0,3.3));
  const healthToday=createDailyHealth(STUDENT_PROFILES);
  const built=await Promise.all(STUDENT_PROFILES.map(async (profile,i)=>{
    const runtime=createStudentRuntime(profile),seat=activeSeats[i]||new THREE.Vector3();
    const actor=await makeActor('student',profile,i,seat.clone());
    return {
      runtime,actor,seat:seat.clone(),wander:null,bubble:null,
      health:healthToday[i],healthAction:null,
      safetyRecord:null,accident:null,teamId:-1
    };
  }));
  students=built;
}

function isBlockedWithPadding(x,z,pad){
  if(x<ROOM.minX+.22+pad||x>ROOM.maxX-.22-pad||z<ROOM.minZ+.22+pad||z>ROOM.maxZ-.22-pad)return true;
  for(const r of obstacleRects)if(Math.abs(x-r.x)<r.hx+pad&&Math.abs(z-r.z)<r.hz+pad)return true;
  return false;
}
function isBlocked(x,z){return isBlockedWithPadding(x,z,.25)}
function isStudentBlocked(x,z){return isBlockedWithPadding(x,z,.08)}
function distance2D(a,b){return Math.hypot(a.x-b.x,a.z-b.z)}
function randomOpenPoint(){
  for(let i=0;i<50;i++){const x=-5.8+Math.random()*11.6,z=-3.8+Math.random()*7.4;if(!isStudentBlocked(x,z))return new THREE.Vector3(x,0,z)}
  return new THREE.Vector3(0,0,2.5);
}
function segmentHitsRect(a,b,minX,maxX,minZ,maxZ){
  const dx=b.x-a.x,dz=b.z-a.z;let tMin=0,tMax=1;
  for(const [start,delta,min,max] of [[a.x,dx,minX,maxX],[a.z,dz,minZ,maxZ]]){
    if(Math.abs(delta)<1e-8){if(start<=min||start>=max)return false;continue;}
    let t1=(min-start)/delta,t2=(max-start)/delta;if(t1>t2){const tmp=t1;t1=t2;t2=tmp}
    tMin=Math.max(tMin,t1);tMax=Math.min(tMax,t2);if(tMin>tMax)return false;
  }
  return tMax>=0&&tMin<=1;
}
function studentSegmentClear(a,b){
  const pad=.08;if(isStudentBlocked(a.x,a.z)||isStudentBlocked(b.x,b.z))return false;
  for(const r of obstacleRects)if(segmentHitsRect(a,b,r.x-r.hx-pad,r.x+r.hx+pad,r.z-r.hz-pad,r.z+r.hz+pad))return false;
  return true;
}
const NAV_STEP=.42,NAV_MIN_X=ROOM.minX+.36,NAV_MIN_Z=ROOM.minZ+.36;
const NAV_COLS=Math.floor((ROOM.maxX-ROOM.minX-.72)/NAV_STEP)+1,NAV_ROWS=Math.floor((ROOM.maxZ-ROOM.minZ-.72)/NAV_STEP)+1;
function navCell(ix,iz){return new THREE.Vector3(NAV_MIN_X+ix*NAV_STEP,0,NAV_MIN_Z+iz*NAV_STEP)}
function navKey(ix,iz){return ix+','+iz}
function pointToNavCell(point){return {ix:clamp(Math.round((point.x-NAV_MIN_X)/NAV_STEP),0,NAV_COLS-1),iz:clamp(Math.round((point.z-NAV_MIN_Z)/NAV_STEP),0,NAV_ROWS-1)}}
function nearestConnectedNavCell(point){
  const base=pointToNavCell(point);
  for(let radius=0;radius<=10;radius++)for(let dz=-radius;dz<=radius;dz++)for(let dx=-radius;dx<=radius;dx++){
    if(radius&&Math.abs(dx)!==radius&&Math.abs(dz)!==radius)continue;
    const ix=base.ix+dx,iz=base.iz+dz;if(ix<0||iz<0||ix>=NAV_COLS||iz>=NAV_ROWS)continue;
    const p=navCell(ix,iz);if(!isStudentBlocked(p.x,p.z)&&studentSegmentClear(point,p))return {ix,iz};
  }
  return null;
}
function simplifyStudentPath(points,start,target){
  if(!points.length)return [target.clone()];
  const all=[start.clone(),...points,target.clone()],out=[];let anchor=all[0];
  for(let i=1;i<all.length-1;i++){
    const a=all[i].clone().sub(anchor),b=all[i+1].clone().sub(all[i]);a.y=b.y=0;
    if(Math.abs(a.x*b.z-a.z*b.x)>.001){out.push(all[i].clone());anchor=all[i]}
  }
  out.push(target.clone());return out;
}
function findStudentPath(start,target){
  if(!isStudentBlocked(target.x,target.z)&&studentSegmentClear(start,target))return [target.clone()];
  const s=nearestConnectedNavCell(start),g=nearestConnectedNavCell(target);if(!s||!g)return [];
  const startKey=navKey(s.ix,s.iz),goalKey=navKey(g.ix,g.iz),queue=[s],came=new Map([[startKey,null]]);let head=0;
  const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
  while(head<queue.length&&queue.length<2400){
    const cur=queue[head++],key=navKey(cur.ix,cur.iz);if(key===goalKey)break;const curPoint=navCell(cur.ix,cur.iz);
    for(const [dx,dz] of dirs){
      const ix=cur.ix+dx,iz=cur.iz+dz,nk=navKey(ix,iz);if(ix<0||iz<0||ix>=NAV_COLS||iz>=NAV_ROWS||came.has(nk))continue;
      const p=navCell(ix,iz);if(isStudentBlocked(p.x,p.z)||!studentSegmentClear(curPoint,p))continue;
      came.set(nk,key);queue.push({ix,iz});
    }
  }
  if(!came.has(goalKey))return [];
  const cells=[];let key=goalKey;while(key&&key!==startKey){const [ix,iz]=key.split(',').map(Number);cells.push(navCell(ix,iz));key=came.get(key)}
  cells.reverse();const route=simplifyStudentPath(cells,start,target);let prev=start;
  for(const p of route){if(!studentSegmentClear(prev,p))return [...cells,target.clone()];prev=p}
  return route;
}
function moveActorToward(actor,target,dt,speed){
  let waypoint=target;
  if(actor.kind==='student'){
    const goalKey=target.x.toFixed(2)+','+target.z.toFixed(2);
    if(actor.navGoal!==goalKey||!Array.isArray(actor.navPath)){actor.navGoal=goalKey;actor.navPath=findStudentPath(actor.root.position,target)}
    while(actor.navPath.length&&distance2D(actor.root.position,actor.navPath[0])<.09)actor.navPath.shift();
    if(!actor.navPath.length&&distance2D(actor.root.position,target)>.12){actor.navGoal='';playAnim(actor,'idle');return false}
    waypoint=actor.navPath[0]||target;
  }
  const dx=waypoint.x-actor.root.position.x,dz=waypoint.z-actor.root.position.z,d=Math.hypot(dx,dz);
  if(d<.06){playAnim(actor,'idle');return distance2D(actor.root.position,target)<.1}
  const step=Math.min(d,(speed||actor.speed)*dt),nx=actor.root.position.x+dx/d*step,nz=actor.root.position.z+dz/d*step;
  const blocked=actor.kind==='student'?isStudentBlocked(nx,nz):isBlocked(nx,nz);
  if(!blocked){actor.root.position.x=nx;actor.root.position.z=nz}else if(actor.kind==='student'){actor.navGoal='';actor.navPath=[]}
  faceDirection(actor,dx,dz);playAnim(actor,'walk');return distance2D(actor.root.position,target)<.1;
}

function showToast(text){ui.toast.textContent=text;ui.toast.classList.add('show');toastTimer=2.0}
function playAudio(el,volume=.7){try{el.volume=volume;el.currentTime=0;el.play().catch(()=>{})}catch(_){}}
function setTalk(on){try{ui.talk.volume=.14;if(on)ui.talk.play().catch(()=>{});else ui.talk.pause()}catch(_){}}
function setGuide(kicker,title,text){ui.guideKicker.textContent=kicker;ui.guideTitle.textContent=title;ui.guideText.textContent=text}
function fmt(sec){sec=Math.max(0,Math.ceil(sec));return Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0')}
function updateClock(){
  const total=Math.round(schoolMinute);ui.clock.textContent=String(Math.floor(total/60)).padStart(2,'0')+':'+String(total%60).padStart(2,'0');
}
function activePeriod(){
  if(currentStep.period)return currentStep.period;
  const next=DAY_STEPS.slice(stepIndex+1).find(s=>s.period);if(currentStep.kind==='transition'&&next)return next.period;
  const prev=DAY_STEPS.slice(0,stepIndex+1).reverse().find(s=>s.period);return prev?.period||1;
}
function updateDayStrip(){
  const p=activePeriod();
  ui.dayStrip.innerHTML=PERIODS.map(item=>'<span class="'+(item.period===p?'active ':'')+(item.period< p?'done':'')+'"><i>'+item.icon+'</i><b>'+item.period+'</b><small>'+item.subject+'</small></span>').join('');
}
function friendInfo(a,b){return friendshipInfo(friendships,a.runtime.id,b.runtime.id)}
function gainFriendship(a,b,amount,{announce=false}={}){
  const before=friendInfo(a,b);
  const after=addFriendship(friendships,a.runtime.id,b.runtime.id,amount);
  if(after.level>before.level){
    stats.friendshipLevelUps++;
    if(announce)showToast('💛 '+a.runtime.name+' · '+b.runtime.name+' 친분 Lv.'+after.level);
  }
  return after;
}
function friendConflictMeta(a,b){
  const info=friendInfo(a,b);
  return {
    level:info.level,
    selfReconcile:Math.random()<friendshipSelfReconcileChance(info.level),
    selfReconcileAt:friendshipConflictDuration(AI_RULES.conflictSeconds,info.level)
  };
}
function currentPeriodNumber(){return activePeriod()}
function isStudentPresent(s){
  if(s.health?.dismissed)return false;
  const awayUntil=s.health?.awayUntilPeriod||0;
  return !(awayUntil&&currentPeriodNumber()<awayUntil);
}
function isStudentResting(s){
  const until=s.health?.restUntilPeriod||0;
  return !!until&&currentPeriodNumber()<until;
}
function studentCanParticipate(s){return isStudentPresent(s)&&!isStudentResting(s)}
function syncStudentPresence(){
  students.forEach(s=>{
    const present=isStudentPresent(s);
    s.actor.root.visible=present;
    if(present&&s.health?.awayUntilPeriod&&currentPeriodNumber()>=s.health.awayUntilPeriod){
      s.health.awayUntilPeriod=0;
      if(s.health.state!=='healthy'){
        s.health.state='mild';
        s.health.checked=false;
        s.health.revealed=false;
        s.health.symptomTimer=42+Math.random()*28;
      }
    }
    if(s.health?.restUntilPeriod&&currentPeriodNumber()>=s.health.restUntilPeriod){
      s.health.restUntilPeriod=0;s.health.resting=false;s.health.checked=false;s.healthAction=null;
      if(s.health.state==='mild'){
        s.health.state='healthy';s.health.revealed=false;s.health.symptom=null;s.health.symptomTimer=Infinity;
      }else if(s.health.state==='sick'){
        s.health.state='mild';s.health.revealed=true;
        s.health.symptom={id:'recovering',label:'아직 몸이 완전히 낫지 않았어요'};
      }
    }
    if(present&&s.accident)showBubble(s,'⚠️','health');
    else if(present&&s.health?.revealed&&s.health.state!=='healthy')showBubble(s,'🤒','health');
  });
}
function focusRatio(s){return clamp(s.runtime.focus/Math.max(1,s.runtime.focusMax),0,1)}
function socialRatio(s){return clamp(s.runtime.social/Math.max(1,s.runtime.socialMax),0,1)}
function healthIcon(s){
  if(s.health?.dismissed)return '🏠';
  if(!isStudentPresent(s))return '🏥';
  if(s.accident)return '⚠️';
  if(s.health?.revealed&&s.health.state!=='healthy')return '🤒';
  return '';
}
function activeLessonStudents(){return students.filter(studentCanParticipate)}
function updateHud(){
  const space=SCHOOL_SPACES[currentStep.location]||activeSpace;
  ui.phase.parentElement?.querySelector('small')?.replaceChildren(document.createTextNode(space.icon+' '+space.name+' · 월요일'));
  ui.phase.textContent=currentStep.period?currentStep.period+'교시 · '+currentStep.subject:(currentStep.title||'학교생활');
  if(currentStep.kind==='lesson'||currentStep.kind==='social')ui.timer.textContent=(currentStep.kind==='lesson'?'수업 ':'')+fmt(stepTime);
  else if(currentStep.kind==='prep')ui.timer.textContent='수업 시작 위치로 이동';
  else if(currentStep.kind==='transition')ui.timer.textContent='출입문으로 이동';
  else ui.timer.textContent='하교!';
  updateClock();

  const off=students.filter(s=>studentCanParticipate(s)&&s.runtime.mode==='offtask').length;
  const accident=students.some(s=>s.accident&&isStudentPresent(s));
  const sick=students.some(s=>isStudentPresent(s)&&s.health?.revealed&&s.health.state!=='healthy'&&!s.health.checked);
  const conflict=pairs.some(p=>p.state==='fight')?'싸움 발생':pairs.some(p=>p.state==='conflict')?'갈등 발생':null;
  ui.classState.textContent=accident?'사고 확인 필요':sick?'건강 확인 필요':conflict||(off>=3?'산만함':off?'조금 산만':'차분함');
  ui.studentStrip.innerHTML=students.map(s=>{
    let cls='',icon='🙂';
    const pair=pairs.find(p=>p.a===s||p.b===s);
    if(s.runtime.mode==='offtask'){cls='offtask';icon='😶‍🌫️'}
    if(pair?.state==='conflict'){cls='conflict';icon='💬'}
    if(pair?.state==='fight'){cls='fight';icon='💥'}
    const hIcon=healthIcon(s);if(hIcon){icon=hIcon;cls+=' health'}
    if(!isStudentPresent(s))cls+=' away';
    if(isStudentResting(s))cls+=' resting';
    const pref=currentStep.kind==='lesson'?preferenceFor(s.runtime.id,currentStep.subject):'neutral';
    const prefMark=currentStep.kind==='lesson'?preferenceIcon(pref):'';
    const f=Math.round(focusRatio(s)*100),so=Math.round(socialRatio(s)*100);
    return '<div class="studentChip '+cls+'"><i class="face">'+icon+'</i><span class="studentName">'+s.runtime.name+'</span>'+
      (prefMark?'<em class="pref">'+prefMark+'</em>':'')+
      '<span class="meters"><b class="focusMeter" style="width:'+f+'%"></b><b class="socialMeter" style="width:'+so+'%"></b></span></div>';
  }).join('');
  updateDayStrip();
}

function hideAllBubbles(){students.forEach(hideBubble)}
function setStudentsToStations(){
  students.forEach((s,i)=>{s.seat=(activeSeats[i]||randomOpenPoint()).clone();s.actor.target=s.seat.clone();s.actor.navGoal='';s.actor.navPath=[];s.wander=null});
}
function placeActorsAtEntry(){
  if(!player)return;
  player.root.position.copy(ENTRY_POINT);player.root.rotation.y=-Math.PI/2;
  students.forEach((s,i)=>{
    let p=new THREE.Vector3(5.7,0,-2.2+i*.78);
    if(isStudentBlocked(p.x,p.z))p=randomOpenPoint();
    s.actor.root.position.copy(p);s.actor.navGoal='';s.actor.navPath=[];hideBubble(s);
  });
  setStudentsToStations();
}
function transitionToSpace(spaceId){
  buildSpace(spaceId);placeActorsAtEntry();showToast((SCHOOL_SPACES[spaceId]?.icon||'🏫')+' '+(SCHOOL_SPACES[spaceId]?.name||'다음 장소')+'에 도착!');
}

function enterStep(index,{spaceChanged=false}={}){
  stepIndex=clamp(index,0,DAY_STEPS.length-1);currentStep=DAY_STEPS[stepIndex];stepTime=currentStep.duration||0;
  pairs=[];teamPairs=[];lessonChats=[];chatterScanTimer=.5;chatterCooldowns.clear();
  teamActive=false;teamCheckTimer=0;lessonElapsed=0;lessonAccidents=0;
  hideAllBubbles();setTalk(false);fightsThisSocial=0;
  if(currentStep.location!==activeSpace.id){
    transitionToSpace(currentStep.location);spaceChanged=true;
  }
  syncStudentPresence();
  if(teachingMarker)teachingMarker.visible=currentStep.kind==='prep';
  if(doorMarker)doorMarker.visible=currentStep.kind==='transition';

  if(currentStep.kind==='prep'){
    setStudentsToStations();
    students.forEach(s=>{
      if(!isStudentPresent(s))return;
      s.runtime.mode='focused';
      s.actor.target=isStudentResting(s)?safeSeparatedTarget(-1):s.seat.clone();
    });
    updateBoard(currentStep.board||currentStep.subject);
    setGuide('수업 준비',currentStep.subject+' 수업 시작 위치로 이동',activeSpace.id==='gym'?'체육관 앞쪽 표시로 가세요.':'앞쪽 노란 표시로 가세요.');
  }else if(currentStep.kind==='lesson'){
    setStudentsToStations();
    students.forEach(s=>{
      if(!studentCanParticipate(s))return;
      resetFocusForLesson(s.runtime);s.actor.target=s.seat.clone();
      s.safetyRecord=currentStep.safetyRequired?beginSafetyRecord(s,currentStep.period):null;
      s.accident=null;
    });
    if(currentStep.teamActivity){
      teamPairs=buildPairs(activeLessonStudents());
      teamPairs.forEach((team,i)=>team.forEach(s=>s.teamId=i));
    }
    updateBoard(currentStep.board||currentStep.subject);
    const extra=currentStep.safetyRequired?' 안전교육을 놓치는 학생도 살펴보세요.':'';
    setGuide(currentStep.period+'교시 · '+currentStep.subject,'학생들을 살펴보세요','딴짓하는 학생에게 직접 다가가 도와주세요.'+extra);
    playAudio(ui.bell,.5);
  }else if(currentStep.kind==='social'){
    pairScan=.4;resetSocialScene();
    updateBoard(currentStep.title||'쉬는 시간');setTalk(true);
    setGuide(currentStep.lunch?'점심시간':'쉬는 시간',currentStep.lunch?'먹고 쉬며 친구들과 어울려요':'학생들이 스스로 어울립니다','말다툼이 생기면 가까이 가서 중재하세요.');
    playAudio(ui.bell,.45);
  }else if(currentStep.kind==='transition'){
    students.forEach((s,i)=>{
      if(!isStudentPresent(s))return;
      s.runtime.mode='solo';
      s.actor.target=isStudentResting(s)?safeSeparatedTarget(-1):new THREE.Vector3(5.25,0,-1.9+i*.65);
    });
    const next=SCHOOL_SPACES[currentStep.nextLocation];
    updateBoard((next?.icon||'➡️')+' '+(next?.name||'다음 장소'));
    setGuide('장소 이동',currentStep.title,'오른쪽 출입문까지 직접 걸어가세요.');
  }else if(currentStep.kind==='done'){
    finishDay();
  }
  updateHud();
}
function advanceStep(){enterStep(stepIndex+1)}

function offTaskWander(s){
  const base=s.seat;
  for(let i=0;i<14;i++){
    const angle=Math.random()*Math.PI*2,r=.38+Math.random()*.58;
    const candidate=new THREE.Vector3(base.x+Math.cos(angle)*r,0,base.z+Math.sin(angle)*r);
    if(!isStudentBlocked(candidate.x,candidate.z)){s.wander=candidate;return}
  }
  s.wander=base.clone();
}
function revealHealthIfNeeded(s,dt){
  if(!studentCanParticipate(s))return;
  if(tickHealth(s.health,dt,{active:true})){
    showBubble(s,'🤒','health');
    showToast(s.runtime.name+'가 몸이 안 좋아 보여요.');
  }
}
function healthStatusText(s){
  if(s.accident)return s.accident.label;
  return s.health?.symptom?.label||'몸이 좋지 않아요';
}
function createSafetyAccident(s){
  if(!s||s.accident||lessonAccidents>=SAFETY_RULES.maxAccidentsPerLesson)return;
  lessonAccidents++;stats.accidents++;
  const label=currentStep.subject==='체육'
    ? (Math.random()<.5?'활동 중 넘어졌어요':'공에 맞아 아파해요')
    : (Math.random()<.5?'실험 도구를 떨어뜨렸어요':'실험 중 손을 다쳤어요');
  s.accident={subject:currentStep.subject,label};
  if(s.health.state==='healthy')s.health.state='mild';
  s.health.revealed=true;s.health.checked=false;
  s.health.symptom={id:'accident',label};
  s.runtime.mode='offtask';s.runtime.focus=Math.min(s.runtime.focus,s.runtime.focusMax*.08);
  showBubble(s,'⚠️','health');
  showToast('⚠️ '+s.runtime.name+'에게 사고가 났어요!');
}
function configureFriendConflict(pair){
  const meta=friendConflictMeta(pair.a,pair.b);
  pair.friendLevel=meta.level;
  pair.duration=friendshipConflictDuration(AI_RULES.conflictSeconds,meta.level);
  pair.selfReconcile=meta.selfReconcile;
  pair.selfReconcileAt=meta.selfReconcileAt;
  pair.fightChance=.30*Math.max(.45,1-meta.level*.11);
  return pair;
}
function selfReconcilePair(pair){
  relations.delete(relationKey(pair.a,pair.b));
  stats.selfReconciles++;
  gainFriendship(pair.a,pair.b,.35);
  for(const s of [pair.a,pair.b]){
    s.runtime.social=Math.min(s.runtime.socialMax,s.runtime.social+s.runtime.socialMax*.14);
    hideBubble(s);
    if(pair.source==='team'&&studentCanParticipate(s))s.actor.target=s.seat.clone();
  }
  pairs=pairs.filter(p=>p!==pair);
  if(pair.source!=='team'){
    for(const s of [pair.a,pair.b]){
      s.runtime.mode='solo';s.runtime.cooldown=3+Math.random()*2;s.actor.target=randomOpenPoint();
    }
  }
  showToast('💛 '+pair.a.runtime.name+'와 '+pair.b.runtime.name+'가 스스로 화해했어요.');
}
function coolOffTeamConflict(pair){
  pairs=pairs.filter(p=>p!==pair);
  for(const s of [pair.a,pair.b]){
    hideBubble(s);
    if(studentCanParticipate(s))s.actor.target=s.seat.clone();
  }
}
function beginTeamConflict(a,b){
  if(!a||!b||pairs.some(p=>(p.a===a&&p.b===b)||(p.a===b&&p.b===a)))return;
  const pair=configureFriendConflict({a,b,state:'conflict',time:0,source:'team'});
  pairs.push(pair);relations.add(relationKey(a,b));stats.teamConflicts++;
  showBubble(a,'!','conflict');showBubble(b,'!','conflict');
  const lv=pair.friendLevel?' · 친분 Lv.'+pair.friendLevel:'';
  showToast(a.runtime.name+'와 '+b.runtime.name+' 모둠에서 갈등이 생겼어요.'+lv);
}
function updateTeamActivity(dt){
  if(!currentStep.teamActivity)return;
  const startAt=(currentStep.duration||1)*(currentStep.teamStartRatio||.5);
  if(!teamActive&&lessonElapsed>=startAt){
    teamActive=true;teamCheckTimer=.5;
    showToast('🤝 모둠 활동 시작!');
  }
  if(!teamActive)return;

  for(const team of teamPairs){
    for(const s of team){
      if(!studentCanParticipate(s))continue;
      const conflict=pairs.some(p=>p.source==='team'&&(p.a===s||p.b===s)&&p.state==='conflict');
      drainSocial(s.runtime,dt,GROUP_RULES.socialDrainMultiplier*(conflict?1.35:1));
    }
  }

  for(const pair of pairs.filter(p=>p.source==='team'&&p.state==='conflict').slice()){
    pair.time+=dt;
    if(pair.selfReconcile&&pair.time>=pair.selfReconcileAt){selfReconcilePair(pair);continue}
    if(pair.time>=pair.duration){coolOffTeamConflict(pair)}
  }

  teamCheckTimer-=dt;
  if(teamCheckTimer>0)return;
  teamCheckTimer=GROUP_RULES.conflictCheckEverySeconds;
  for(const [a,b] of teamPairs){
    if(!studentCanParticipate(a)||!studentCanParticipate(b))continue;
    if(pairs.some(p=>(p.a===a&&p.b===b)||(p.a===b&&p.b===a)))continue;
    if(socialConflictCount()>=AI_RULES.maxConcurrentConflicts)break;
    const unresolved=relations.has(relationKey(a,b));
    const teacherNear=teacherNearStudent(a)||teacherNearStudent(b);
    const base=conflictProbability(a.runtime,b.runtime,{teacherNear,relationActive:false});
    const chance=unresolved?GROUP_RULES.unresolvedConflictChance:base*GROUP_RULES.tiredConflictChanceMultiplier;
    if(Math.random()<chance){beginTeamConflict(a,b);break}
    gainFriendship(a,b,FRIENDSHIP_RULES.teamInteractionGain);
  }
}
function updateSafety(dt){
  if(!currentStep.safetyRequired)return;
  const inBriefing=lessonElapsed>=SAFETY_RULES.briefingStartSeconds&&lessonElapsed<SAFETY_RULES.briefingStartSeconds+SAFETY_RULES.briefingDurationSeconds;
  if(inBriefing){
    setGuide('안전교육 중','안전수칙을 잘 듣고 있는지 살펴보세요','집중이 떨어진 학생에게 가까이 가서 관심을 주세요.');
  }
  for(const s of activeLessonStudents()){
    const blocked=s.runtime.mode==='offtask'||pairs.some(p=>p.state==='conflict'&&(p.a===s||p.b===s));
    const evt=tickSafetyRecord(s,dt,{lessonElapsed,focusRatio:focusRatio(s),blocked});
    if(inBriefing&&focusRatio(s)<SAFETY_RULES.distractedFocusRatio&&!s.accident&&!(s.health?.revealed&&s.health.state!=='healthy')){
      showBubble(s,'👀','');
    }
    if(evt==='safety-heard'&&s.bubble?.textContent==='👀')hideBubble(s);
    if(evt==='safety-missed'){
      stats.safetyMisses++;
      showBubble(s,'⚠️','');
      showToast(s.runtime.name+'가 안전수칙을 놓쳤어요. 다시 알려줄 수 있어요.');
    }
    if(s.safetyRecord?.finished&&!s.safetyRecord.heard&&!s.accident&&lessonElapsed>SAFETY_RULES.briefingStartSeconds+SAFETY_RULES.briefingDurationSeconds+5){
      if(Math.random()<unsafeAccidentChance(dt,{safetyHeard:false,focusRatio:focusRatio(s)}))createSafetyAccident(s);
    }
  }
}
function chatForStudent(s){return lessonChats.find(chat=>chat.a===s||chat.b===s)||null}
function refreshStudentBubbleState(s){
  if(!s||!isStudentPresent(s))return hideBubble(s);
  if(s.accident)return showBubble(s,'⚠️','health');
  if(s.health?.revealed&&s.health.state!=='healthy')return showBubble(s,'🤒','health');
  const conflict=pairs.find(p=>p.state==='conflict'&&(p.a===s||p.b===s));
  if(conflict)return showBubble(s,'!','conflict');
  if(s.safetyRecord?.finished&&!s.safetyRecord.heard)return showBubble(s,'⚠️','');
  if(s.runtime.mode==='offtask')return showBubble(s,'…','');
  hideBubble(s);
}
function startLessonChat(a,b){
  const range=FRIENDSHIP_RULES.chatterDurationSeconds;
  const chat={
    a,b,time:0,
    duration:range[0]+Math.random()*(range[1]-range[0]),
    key:friendshipKey(a.runtime.id,b.runtime.id),
    level:friendInfo(a,b).level
  };
  lessonChats.push(chat);stats.lessonChats++;
  showBubble(a,'😄','chat');showBubble(b,'😄','chat');
  showToast('😄 '+a.runtime.name+'와 '+b.runtime.name+'가 수업 중 장난을 시작했어요. · 친분 Lv.'+chat.level);
}
function stopLessonChat(chat,{teacher=false,natural=false}={}){
  if(!chat)return;
  lessonChats=lessonChats.filter(x=>x!==chat);
  chatterCooldowns.set(chat.key,FRIENDSHIP_RULES.chatterCooldownSeconds);
  if(natural)gainFriendship(chat.a,chat.b,FRIENDSHIP_RULES.lessonChatterGain);
  if(teacher){stats.chatsStopped++;showToast('🤫 둘이 다시 수업에 집중해요.')}
  refreshStudentBubbleState(chat.a);refreshStudentBubbleState(chat.b);
}
function updateLessonChatter(dt){
  for(const [key,value] of [...chatterCooldowns]){
    const next=value-dt;
    if(next<=0)chatterCooldowns.delete(key);else chatterCooldowns.set(key,next);
  }

  for(const chat of lessonChats.slice()){
    chat.time+=dt;
    const invalid=!studentCanParticipate(chat.a)||!studentCanParticipate(chat.b)||
      pairs.some(p=>p.state==='conflict'&&(p.a===chat.a||p.b===chat.a||p.a===chat.b||p.b===chat.b));
    if(invalid){stopLessonChat(chat);continue}
    faceDirection(chat.a.actor,chat.b.actor.root.position.x-chat.a.actor.root.position.x,chat.b.actor.root.position.z-chat.a.actor.root.position.z);
    faceDirection(chat.b.actor,chat.a.actor.root.position.x-chat.b.actor.root.position.x,chat.a.actor.root.position.z-chat.b.actor.root.position.z);
    if(chat.time>=chat.duration)stopLessonChat(chat,{natural:true});
  }

  chatterScanTimer-=dt;
  if(chatterScanTimer>0||lessonChats.length||teamActive)return;
  chatterScanTimer=FRIENDSHIP_RULES.chatterCheckSeconds;

  const active=activeLessonStudents().filter(s=>!s.accident&&!(s.health?.revealed&&s.health.state!=='healthy'));
  const candidates=[];
  for(let i=0;i<active.length;i++)for(let j=i+1;j<active.length;j++){
    const a=active[i],b=active[j],info=friendInfo(a,b);
    if(info.level<FRIENDSHIP_RULES.chatterMinLevel)continue;
    const key=friendshipKey(a.runtime.id,b.runtime.id);
    if(chatterCooldowns.has(key))continue;
    if(distance2D(a.actor.root.position,b.actor.root.position)>FRIENDSHIP_RULES.chatterDistance)continue;
    if(focusRatio(a)>FRIENDSHIP_RULES.chatterFocusRatio&&focusRatio(b)>FRIENDSHIP_RULES.chatterFocusRatio)continue;
    if(pairs.some(p=>(p.a===a||p.b===a||p.a===b||p.b===b)&&p.state==='conflict'))continue;
    candidates.push({a,b,level:info.level});
  }
  candidates.sort((x,y)=>y.level-x.level);
  for(const candidate of candidates){
    if(Math.random()<friendshipChatterChance(candidate.level)){startLessonChat(candidate.a,candidate.b);break}
  }
}
function updateLesson(dt){
  stepTime-=dt;schoolMinute+=dt*.36;lessonElapsed+=dt;
  for(const s of students){
    if(!studentCanParticipate(s))continue;
    revealHealthIfNeeded(s,dt);
    const was=s.runtime.mode;
    const chat=chatForStudent(s);
    const chatterDrain=chat?1.22:1;
    if(chat)drainSocial(s.runtime,dt,.18);
    const drainMultiplier=(currentStep.focusDrain||1)*preferenceMultiplier(s.runtime.id,currentStep.subject)*chatterDrain;
    const recoveryMultiplier=healthRecoveryMultiplier(s.health);
    const evt=updateLessonFocus(s.runtime,dt,{teacherNear:teacherNearStudent(s),drainMultiplier,recoveryMultiplier});
    if(evt==='offtask-start'){
      stats.offTaskStarts++;offTaskWander(s);
      if(!s.accident&&!(s.health?.revealed&&s.health.state!=='healthy'))showBubble(s,'…','');
    }
    if(evt==='focused-return'){
      s.wander=null;
      if(!s.accident&&!(s.health?.revealed&&s.health.state!=='healthy')&&!(s.safetyRecord?.finished&&!s.safetyRecord.heard))hideBubble(s);
    }
    if(s.runtime.mode==='offtask'){
      if(chat){
        s.wander=null;moveActorToward(s.actor,s.seat,dt,.6);
      }else{
        if(!s.wander||distance2D(s.actor.root.position,s.wander)<.08)offTaskWander(s);
        moveActorToward(s.actor,s.wander,dt,activeSpace.id==='gym'?.58:.42);
      }
    }else{
      moveActorToward(s.actor,s.seat,dt,.72);
      if(was==='offtask'&&!chat&&!s.accident&&!(s.health?.revealed&&s.health.state!=='healthy')&&!(s.safetyRecord?.finished&&!s.safetyRecord.heard))hideBubble(s);
    }
  }
  updateLessonChatter(dt);
  updateTeamActivity(dt);
  updateSafety(dt);
  if(stepTime<=0){stats.periodsCompleted++;advanceStep()}
}

function freeStudents(){return students.filter(s=>studentCanParticipate(s)&&!pairs.some(p=>p.a===s||p.b===s)&&s.runtime.cooldown<=0)}
function socialConflictCount(){return pairs.filter(p=>p.state==='conflict'||p.state==='fight').length}
function relationKey(a,b){return [a.runtime.id,b.runtime.id].sort().join('|')}
function resetSocialScene(){
  students.forEach(s=>{
    if(!isStudentPresent(s))return;
    resetSocialForRecess(s.runtime);
    s.runtime.mode='solo';s.runtime.cooldown=Math.random()*2;
    s.actor.target=isStudentResting(s)?safeSeparatedTarget(-1):randomOpenPoint();
    s.actor.navGoal='';s.actor.navPath=[];
  });
}
function socialMeetingTargets(){
  for(let i=0;i<20;i++){
    const center=randomOpenPoint(),angle=Math.random()*Math.PI,side=new THREE.Vector3(.48,0,0).applyAxisAngle(new THREE.Vector3(0,1,0),angle);
    const pa=center.clone().add(side),pb=center.clone().sub(side);
    if(!isStudentBlocked(pa.x,pa.z)&&!isStudentBlocked(pb.x,pb.z))return {pa,pb};
  }
  return {pa:randomOpenPoint(),pb:randomOpenPoint()};
}
function startPair(a,b){
  const targets=socialMeetingTargets();a.actor.target=targets.pa;b.actor.target=targets.pb;
  a.runtime.mode='social';b.runtime.mode='social';
  const min=AI_RULES.socialInteractionSeconds[0],max=AI_RULES.socialInteractionSeconds[1];
  pairs.push({a,b,state:'social',time:0,duration:min+Math.random()*(max-min)});
}
function releasePair(pair,cooldown=3){
  pairs=pairs.filter(p=>p!==pair);
  for(const s of [pair.a,pair.b]){s.runtime.mode='solo';s.runtime.cooldown=cooldown+Math.random()*2;s.actor.target=randomOpenPoint();hideBubble(s)}
}
function beginConflict(pair){
  pair.state='conflict';pair.time=0;configureFriendConflict(pair);pair.a.runtime.mode=pair.b.runtime.mode='conflict';
  relations.add(relationKey(pair.a,pair.b));showBubble(pair.a,'!','conflict');showBubble(pair.b,'!','conflict');
}
function beginFight(pair){
  pair.state='fight';pair.time=0;pair.duration=AI_RULES.fightSeconds;fightsThisSocial++;pair.a.runtime.mode=pair.b.runtime.mode='fight';
  showBubble(pair.a,'💥','fight');showBubble(pair.b,'💥','fight');playAnim(pair.a.actor,'push');playAnim(pair.b.actor,'push');playAudio(ui.fight,.42);
}
function safeSeparatedTarget(side){
  const p=new THREE.Vector3(side<0?-5.6:5.6,0,2.8);return isStudentBlocked(p.x,p.z)?randomOpenPoint():p;
}
function sendFightApart(pair){
  [pair.a,pair.b].forEach((s,i)=>{s.runtime.cooldown=AI_RULES.separatedCooldownSeconds;s.runtime.mode='solo';s.actor.target=safeSeparatedTarget(i===0?-1:1);hideBubble(s)});
  pairs=pairs.filter(p=>p!==pair);
}
function mediatePair(pair){
  relations.delete(relationKey(pair.a,pair.b));
  if(pair.source==='team'){
    [pair.a,pair.b].forEach(s=>{
      s.runtime.social=Math.min(s.runtime.socialMax,s.runtime.social+s.runtime.socialMax*.22);
      s.runtime.cooldown=AI_RULES.conflictCooldownSeconds;
      if(studentCanParticipate(s))s.actor.target=s.seat.clone();
      hideBubble(s);
    });
    pairs=pairs.filter(p=>p!==pair);stats.conflictsMediated++;
    showToast('모둠 갈등을 풀었어요. 다시 활동할 수 있어요.');
    return;
  }
  [pair.a,pair.b].forEach((s,i)=>{s.runtime.social=Math.min(s.runtime.socialMax,s.runtime.social+s.runtime.socialMax*.28);s.runtime.cooldown=AI_RULES.conflictCooldownSeconds;s.runtime.mode='solo';s.actor.target=safeSeparatedTarget(i===0?-1:1);hideBubble(s)});
  pairs=pairs.filter(p=>p!==pair);stats.conflictsMediated++;showToast('둘이 진정했어요.');
}
function separateFight(pair){sendFightApart(pair);stats.fightsSeparated++;showToast('둘을 떨어뜨렸어요. 잠깐 쉬게 해주세요.')}
function autoResolveFight(pair){sendFightApart(pair);stats.missedFights++;showToast('다른 선생님이 와서 싸움을 말렸어요.')}
function updateSocial(dt){
  stepTime-=dt;schoolMinute+=dt*.36;pairScan-=dt;
  students.forEach(s=>{
    if(!isStudentPresent(s))return;
    if(isStudentResting(s)){
      recoverSocial(s.runtime,dt,1.3);
      s.runtime.focus=Math.min(s.runtime.focusMax,s.runtime.focus+s.runtime.focusRecovery*healthRecoveryMultiplier(s.health)*.45*dt);
      moveActorToward(s.actor,s.actor.target,dt,.55);
      return;
    }
    revealHealthIfNeeded(s,dt);
    if(!pairs.some(p=>p.a===s||p.b===s)){
      recoverSocial(s.runtime,dt,1);
      s.runtime.focus=Math.min(s.runtime.focusMax,s.runtime.focus+s.runtime.focusRecovery*healthRecoveryMultiplier(s.health)*.18*dt);
      if(distance2D(s.actor.root.position,s.actor.target)<.12)s.actor.target=randomOpenPoint();
      moveActorToward(s.actor,s.actor.target,dt,.76);
    }
  });
  for(const pair of pairs.slice()){
    const meet=distance2D(pair.a.actor.root.position,pair.a.actor.target)<.16&&distance2D(pair.b.actor.root.position,pair.b.actor.target)<.16;
    moveActorToward(pair.a.actor,pair.a.actor.target,dt,.82);moveActorToward(pair.b.actor,pair.b.actor.target,dt,.82);
    if(!meet)continue;
    pair.time+=dt;
    faceDirection(pair.a.actor,pair.b.actor.root.position.x-pair.a.actor.root.position.x,pair.b.actor.root.position.z-pair.a.actor.root.position.z);
    faceDirection(pair.b.actor,pair.a.actor.root.position.x-pair.b.actor.root.position.x,pair.a.actor.root.position.z-pair.b.actor.root.position.z);
    if(pair.state==='social'){
      drainSocial(pair.a.runtime,dt,currentStep.lunch?.8:1);drainSocial(pair.b.runtime,dt,currentStep.lunch?.8:1);
      if(pair.time>=pair.duration){
        const near=distance2D(player.root.position,pair.a.actor.root.position)<2.8||distance2D(player.root.position,pair.b.actor.root.position)<2.8;
        const chance=conflictProbability(pair.a.runtime,pair.b.runtime,{teacherNear:near,relationActive:relations.has(relationKey(pair.a,pair.b))});
        if(socialConflictCount()<AI_RULES.maxConcurrentConflicts&&Math.random()<chance)beginConflict(pair);
        else{
          stats.peacefulSocial++;
          gainFriendship(pair.a,pair.b,FRIENDSHIP_RULES.peacefulInteractionGain,{announce:true});
          releasePair(pair,2.5);
        }
      }
    }else if(pair.state==='conflict'){
      drainSocial(pair.a.runtime,dt,.45);drainSocial(pair.b.runtime,dt,.45);
      if(pair.selfReconcile&&pair.time>=pair.selfReconcileAt){selfReconcilePair(pair);continue}
      if(pair.time>=pair.duration){
        if(fightsThisSocial<AI_RULES.maxFightsPerRecess&&Math.random()<(pair.fightChance??.30))beginFight(pair);
        else releasePair(pair,AI_RULES.conflictCooldownSeconds);
      }
    }else if(pair.state==='fight'){
      playAnim(pair.a.actor,'push');playAnim(pair.b.actor,'push');if(pair.time>=pair.duration)autoResolveFight(pair);
    }
  }
  if(pairScan<=0){
    pairScan=1.1+Math.random()*.8;
    if(pairs.length<AI_RULES.maxConcurrentSocialPairs){
      const free=freeStudents();
      if(free.length>=2&&Math.random()<(currentStep.lunch?.82:.72)){
        const a=free[(Math.random()*free.length)|0],rest=free.filter(s=>s!==a),b=rest[(Math.random()*rest.length)|0];startPair(a,b);
      }
    }
  }
  if(stepTime<=0)advanceStep();
}

function showBubble(s,text,cls){
  if(!s.bubble){s.bubble=document.createElement('div');s.bubble.className='statusBubble';ui.app.appendChild(s.bubble)}
  s.bubble.textContent=text;s.bubble.className='statusBubble '+(cls||'');s.bubble.style.display='block';
}
function hideBubble(s){if(s.bubble)s.bubble.style.display='none'}
function updateBubbles(){
  const v=new THREE.Vector3();
  students.forEach(s=>{if(!s.bubble||s.bubble.style.display==='none')return;v.copy(s.actor.root.position);v.y=1.55;v.project(camera);
    s.bubble.style.left=((v.x*.5+.5)*innerWidth)+'px';s.bubble.style.top=((-v.y*.5+.5)*innerHeight)+'px';s.bubble.style.opacity=v.z<1?'1':'0';
  });
}
function teacherNearStudent(s){return distance2D(player.root.position,s.actor.root.position)<=AI_RULES.teacherNearDistance}

function setAction(icon,label,ready){ui.actionIcon.textContent=icon;ui.actionLabel.textContent=label;ui.action.classList.toggle('ready',!!ready)}
function scanAction(){
  if(!player){currentAction={type:'none'};return}
  if(currentStep.kind==='prep'){
    const point=new THREE.Vector3(activeSpace.teachingPoint.x,0,activeSpace.teachingPoint.z);
    if(distance2D(player.root.position,point)<1.7){currentAction={type:'startLesson'};setAction('▶',currentStep.subject+' 시작',true);return}
  }
  if(currentStep.kind==='transition'){
    if(distance2D(player.root.position,DOOR_POINT)<1.55){const next=SCHOOL_SPACES[currentStep.nextLocation];currentAction={type:'moveNext'};setAction('🚪',(next?.name||'다음 장소')+' 이동',true);return}
  }

  const healthTarget=students
    .filter(s=>isStudentPresent(s)&&(s.accident||(s.health?.revealed&&s.health.state!=='healthy'))&&distance2D(player.root.position,s.actor.root.position)<2.45)
    .sort((a,b)=>distance2D(player.root.position,a.actor.root.position)-distance2D(player.root.position,b.actor.root.position))[0];
  if(healthTarget){
    if(!healthTarget.health.checked){
      currentAction={type:'healthCheck',student:healthTarget};setAction('🩺',healthTarget.runtime.name+' 상태 확인',true);return;
    }
    if(healthTarget.healthAction){
      currentAction={type:'healthDecision',student:healthTarget,decision:healthTarget.healthAction};
      setAction(healthTarget.healthAction.icon,healthTarget.healthAction.label,true);return;
    }
  }

  const pair=pairs.filter(p=>p.state==='conflict'||p.state==='fight').sort((a,b)=>{
    const da=Math.min(distance2D(player.root.position,a.a.actor.root.position),distance2D(player.root.position,a.b.actor.root.position));
    const db=Math.min(distance2D(player.root.position,b.a.actor.root.position),distance2D(player.root.position,b.b.actor.root.position));return da-db;
  })[0];
  if(pair){
    const d=Math.min(distance2D(player.root.position,pair.a.actor.root.position),distance2D(player.root.position,pair.b.actor.root.position));
    if(d<2.75){currentAction={type:pair.state==='fight'?'separate':'mediate',pair};setAction(pair.state==='fight'?'🫱':'💬',pair.state==='fight'?'둘 떼어놓기':'중재하기',true);return}
  }

  if(currentStep.kind==='lesson'){
    const unsafe=students.filter(s=>studentCanParticipate(s)&&s.safetyRecord?.finished&&!s.safetyRecord.heard&&!s.accident&&distance2D(player.root.position,s.actor.root.position)<2.35)
      .sort((a,b)=>distance2D(player.root.position,a.actor.root.position)-distance2D(player.root.position,b.actor.root.position))[0];
    if(unsafe){currentAction={type:'safetyReview',student:unsafe};setAction('🦺',unsafe.runtime.name+' 안전수칙 다시',true);return}

    const chat=lessonChats.slice().sort((a,b)=>{
      const da=Math.min(distance2D(player.root.position,a.a.actor.root.position),distance2D(player.root.position,a.b.actor.root.position));
      const db=Math.min(distance2D(player.root.position,b.a.actor.root.position),distance2D(player.root.position,b.b.actor.root.position));return da-db;
    })[0];
    if(chat){
      const d=Math.min(distance2D(player.root.position,chat.a.actor.root.position),distance2D(player.root.position,chat.b.actor.root.position));
      if(d<2.65){currentAction={type:'quietFriends',chat};setAction('🤫','조용히 시키기',true);return}
    }

    const briefing=currentStep.safetyRequired&&lessonElapsed>=SAFETY_RULES.briefingStartSeconds&&lessonElapsed<SAFETY_RULES.briefingStartSeconds+SAFETY_RULES.briefingDurationSeconds;
    const near=students.filter(s=>studentCanParticipate(s)&&(s.runtime.mode==='offtask'||(briefing&&focusRatio(s)<SAFETY_RULES.distractedFocusRatio))&&distance2D(player.root.position,s.actor.root.position)<2.35)
      .sort((a,b)=>distance2D(player.root.position,a.actor.root.position)-distance2D(player.root.position,b.actor.root.position))[0];
    if(near){currentAction={type:'focus',student:near};setAction('👀',near.runtime.name+' 집중 도와주기',true);return}
  }

  currentAction={type:'none'};setAction('✋','살펴보기',false);
}
function updateGuideByAction(){
  if(currentAction.type==='focus')setGuide(currentStep.subject+' 수업',currentAction.student.runtime.name+'의 집중이 떨어졌어요','가까이 왔어요. 행동 버튼으로 관심을 주세요.');
  else if(currentAction.type==='mediate')setGuide(currentAction.pair?.source==='team'?'모둠 활동':'갈등 상황','두 학생이 부딪히고 있어요','가까이에서 중재하면 갈등 관계가 풀립니다.');
  else if(currentAction.type==='separate')setGuide('갈등 상황','싸움이 났어요!','둘을 먼저 떼어놓으세요.');
  else if(currentAction.type==='healthCheck')setGuide('건강 확인',currentAction.student.runtime.name+'의 상태가 이상해 보여요','가까이에서 상태를 확인하세요.');
  else if(currentAction.type==='healthDecision')setGuide('건강 조치',healthStatusText(currentAction.student),'상황에 맞는 조치를 해주세요.');
  else if(currentAction.type==='safetyReview')setGuide('안전교육',currentAction.student.runtime.name+'가 안전수칙을 놓쳤어요','가까이에서 안전수칙을 다시 알려주세요.');
  else if(currentAction.type==='quietFriends')setGuide('수업 중 친구 장난',currentAction.chat.a.runtime.name+'와 '+currentAction.chat.b.runtime.name+'가 떠들고 있어요','친한 친구끼리도 지금은 수업에 집중하도록 조용히 알려주세요.');
}
function removeStudentFromActivePairs(s){
  for(const chat of lessonChats.filter(x=>x.a===s||x.b===s))stopLessonChat(chat);
  pairs=pairs.filter(p=>{
    const hit=p.a===s||p.b===s;
    if(hit){
      const other=p.a===s?p.b:p.a;
      if(p.source!=='team'){
        s.runtime.mode='solo';
        if(other){other.runtime.mode='solo';other.runtime.cooldown=Math.max(other.runtime.cooldown||0,2)}
      }
      if(other&&!other.accident&&!(other.health?.revealed&&other.health.state!=='healthy'))hideBubble(other);
    }
    return !hit;
  });
}
function checkStudentHealth(s){
  s.health.checked=true;stats.healthChecks++;
  s.healthAction=nextHealthAction(s.health,environment,currentPeriodNumber());
  let detail=healthStatusText(s)+'. ';
  if(!environment.nurseAvailable)detail+='보건교사는 출장 중이에요. ';
  if(!s.health.parentAvailable)detail+='보호자는 지금 집에 없어요. ';
  showToast(detail+s.healthAction.label+'가 필요해요.');
}
function applyHealthDecision(s,decision){
  if(!s||!decision)return;
  removeStudentFromActivePairs(s);
  s.accident=null;s.healthAction=null;hideBubble(s);
  if(decision.type==='dismiss'){
    s.health.dismissed=true;s.actor.root.visible=false;stats.earlyDismissals++;
    showToast(s.runtime.name+'가 보호자와 조퇴했어요.');
  }else if(decision.type==='nurse'){
    s.health.awayUntilPeriod=decision.awayUntilPeriod||currentPeriodNumber()+1;s.actor.root.visible=false;stats.nurseVisits++;
    showToast(s.runtime.name+'가 보건실에서 쉬어요.');
  }else if(decision.type==='rest'){
    s.health.resting=true;s.health.restUntilPeriod=currentPeriodNumber()+1;s.actor.target=safeSeparatedTarget(-1);stats.classroomRests++;
    showToast('보건교사도 보호자도 어려워서 '+s.runtime.name+'를 조용한 곳에서 쉬게 했어요.');
  }
}
function useAction(){
  if(!started||paused)return;
  if(currentAction.type==='startLesson'){advanceStep();return}
  if(currentAction.type==='moveNext'){
    transitionToSpace(currentStep.nextLocation);enterStep(stepIndex+1,{spaceChanged:true});return;
  }
  if(currentAction.type==='healthCheck'){checkStudentHealth(currentAction.student);playerGestureTimer=.45;playAnim(player,'push');return}
  if(currentAction.type==='healthDecision'){applyHealthDecision(currentAction.student,currentAction.decision);playerGestureTimer=.5;playAnim(player,'push');return}
  if(currentAction.type==='safetyReview'){
    const s=currentAction.student;s.safetyRecord.heard=true;s.safetyRecord.finished=true;
    if(!s.accident&&!(s.health?.revealed&&s.health.state!=='healthy'))hideBubble(s);
    playerGestureTimer=.45;playAnim(player,'push');showToast(s.runtime.name+'에게 안전수칙을 다시 알려줬어요.');return;
  }
  if(currentAction.type==='quietFriends'){
    stopLessonChat(currentAction.chat,{teacher:true});playerGestureTimer=.45;playAnim(player,'push');return;
  }
  if(currentAction.type==='focus'){
    const s=currentAction.student;helpFocus(s.runtime);stats.focusHelps++;s.wander=null;s.actor.target=s.seat.clone();playerGestureTimer=.5;playAnim(player,'push');
    if(!s.accident&&!(s.health?.revealed&&s.health.state!=='healthy')&&!(s.safetyRecord?.finished&&!s.safetyRecord.heard))hideBubble(s);
    showToast(s.runtime.name+'에게 관심을 줬어요.');return;
  }
  if(currentAction.type==='mediate'){mediatePair(currentAction.pair);playerGestureTimer=.5;playAnim(player,'push');return}
  if(currentAction.type==='separate'){separateFight(currentAction.pair);playerGestureTimer=.65;playAnim(player,'push');return}
  showToast(currentStep.kind==='transition'?'출입문 가까이 가 보세요.':'필요한 학생 가까이 가 보세요.');
}

function updatePlayer(dt){
  if(playerGestureTimer>0){playerGestureTimer=Math.max(0,playerGestureTimer-dt);playAnim(player,'push');return}
  let x=0,z=0;
  if(keys.has('KeyA')||keys.has('ArrowLeft'))x-=1;if(keys.has('KeyD')||keys.has('ArrowRight'))x+=1;
  if(keys.has('KeyW')||keys.has('ArrowUp'))z-=1;if(keys.has('KeyS')||keys.has('ArrowDown'))z+=1;
  x+=joy.x;z+=joy.y;const len=Math.hypot(x,z);
  if(len>.08){
    x/=Math.max(1,len);z/=Math.max(1,len);
    const nx=player.root.position.x+x*player.speed*dt,nz=player.root.position.z+z*player.speed*dt;
    if(!isBlocked(nx,player.root.position.z))player.root.position.x=nx;if(!isBlocked(player.root.position.x,nz))player.root.position.z=nz;
    faceDirection(player,x,z);playAnim(player,'walk');
  }else playAnim(player,'idle');
}
function updateStudentsIdle(dt){students.forEach(s=>moveActorToward(s.actor,s.actor.target,dt,.72))}
function updateCamera(dt){
  const desired=new THREE.Vector3(player.root.position.x,7.75,player.root.position.z+8.4);
  camera.position.lerp(desired,1-Math.pow(.001,dt));const look=player.root.position.clone();look.y=.7;look.z-=1;camera.lookAt(look);
}
function updateMarkers(t){
  if(teachingMarker?.visible){const s=1+Math.sin(t*4)*.08;teachingMarker.scale.setScalar(s)}
  if(doorMarker?.visible){const s=1+Math.sin(t*5)*.09;doorMarker.scale.setScalar(s)}
}

function finishDay(){
  setTalk(false);pairs=[];playAudio(ui.bell,.55);updateBoard('오늘도 수고했어요!');
  if(teachingMarker)teachingMarker.visible=false;if(doorMarker)doorMarker.visible=false;
  ui.summary.innerHTML=
    '<div><strong>'+stats.periodsCompleted+'/6</strong><span>마친 수업</span></div>'+
    '<div><strong>'+stats.focusHelps+'</strong><span>집중 도움</span></div>'+
    '<div><strong>'+stats.conflictsMediated+'</strong><span>갈등 중재</span></div>'+
    '<div><strong>'+stats.healthChecks+'</strong><span>건강 확인</span></div>'+
    '<div><strong>'+stats.accidents+'</strong><span>안전 사고</span></div>'+
    '<div><strong>'+stats.safetyMisses+'</strong><span>놓친 안전교육</span></div>'+
    '<div><strong>'+stats.nurseVisits+'</strong><span>보건실 이용</span></div>'+
    '<div><strong>'+stats.earlyDismissals+'</strong><span>조퇴</span></div>'+
    '<div><strong>'+stats.teamConflicts+'</strong><span>모둠 갈등</span></div>'+
    '<div><strong>'+stats.selfReconciles+'</strong><span>친구끼리 화해</span></div>'+
    '<div><strong>'+stats.chatsStopped+'</strong><span>수업 장난 정리</span></div>';
  ui.end.classList.remove('hidden');
}

function setupInput(){
  addEventListener('keydown',e=>{keys.add(e.code);if((e.code==='Space'||e.code==='KeyE')&&!e.repeat){e.preventDefault();useAction()}});
  addEventListener('keyup',e=>keys.delete(e.code));ui.action.addEventListener('pointerdown',e=>{e.preventDefault();useAction()});
  const moveJoy=e=>{
    const r=ui.joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let dx=e.clientX-cx,dy=e.clientY-cy;
    const max=r.width*.31,d=Math.hypot(dx,dy)||1;if(d>max){dx=dx/d*max;dy=dy/d*max}
    joy.x=dx/max;joy.y=dy/max;ui.joyKnob.style.transform='translate('+dx+'px,'+dy+'px)';
  };
  ui.joy.addEventListener('pointerdown',e=>{joy.active=true;joy.id=e.pointerId;ui.joy.setPointerCapture?.(e.pointerId);moveJoy(e)});
  ui.joy.addEventListener('pointermove',e=>{if(joy.active&&e.pointerId===joy.id)moveJoy(e)});
  const release=e=>{if(e.pointerId!==joy.id)return;joy.active=false;joy.id=null;joy.x=joy.y=0;ui.joyKnob.style.transform='translate(0,0)'};
  ui.joy.addEventListener('pointerup',release);ui.joy.addEventListener('pointercancel',release);
}
function resize(){renderer.setSize(Math.max(1,innerWidth),Math.max(1,innerHeight),false);camera.aspect=innerWidth/Math.max(1,innerHeight);camera.updateProjectionMatrix()}
addEventListener('resize',resize);resize();

ui.restart.addEventListener('click',()=>location.reload());
ui.helpButton.addEventListener('click',()=>{paused=true;ui.help.classList.remove('hidden')});
ui.closeHelp.addEventListener('click',()=>{ui.help.classList.add('hidden');paused=false;clock3d.getDelta()});

async function boot(){
  buildSpace('classroom');setupInput();updateDayStrip();
  ui.start.disabled=true;ui.start.textContent='학교 준비 중…';
  try{await createActors()}catch(err){
    console.error('[TeacherSim] character load failed',err);ui.intro.classList.add('hidden');ui.assetError.classList.remove('hidden');return;
  }
  enterStep(0);ui.start.disabled=false;ui.start.textContent='등교하기';
  ui.start.addEventListener('click',()=>{started=true;ui.intro.classList.add('hidden');clock3d.getDelta()});
  camera.position.set(0,7.7,11.6);camera.lookAt(0,.7,-.5);requestAnimationFrame(loop);
}
function loop(now){
  requestAnimationFrame(loop);const dt=Math.min(.05,clock3d.getDelta());
  if(player){
    player.mixer.update(dt);students.forEach(s=>s.actor.mixer.update(dt));
    if(started&&!paused&&currentStep.kind!=='done'){
      updatePlayer(dt);
      if(currentStep.kind==='lesson')updateLesson(dt);
      else if(currentStep.kind==='social')updateSocial(dt);
      else updateStudentsIdle(dt);
      interactionScan-=dt;if(interactionScan<=0){interactionScan=.12;scanAction();updateGuideByAction()}
      updateCamera(dt);updateHud();
    }else updateCamera(dt);
  }
  if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)ui.toast.classList.remove('show')}
  updateMarkers((now||0)/1000);updateBubbles();renderer.render(scene,camera);
}
boot();

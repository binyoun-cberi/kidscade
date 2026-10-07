import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import {
  AI_RULES,STUDENT_PROFILES,createStudentRuntime,resetFocusForLesson,updateLessonFocus,helpFocus,
  resetSocialForRecess,recoverSocial,drainSocial,conflictProbability,clamp
} from './student-ai.mjs';

const $=id=>document.getElementById(id);
const ui={
  app:$('app'),canvas:$('game'),phase:$('phaseLabel'),clock:$('clock'),timer:$('phaseTimer'),
  classState:$('classState'),studentStrip:$('studentStrip'),guideKicker:$('guideKicker'),
  guideTitle:$('guideTitle'),guideText:$('guideText'),toast:$('toast'),action:$('actionButton'),
  actionIcon:$('actionIcon'),actionLabel:$('actionLabel'),intro:$('intro'),start:$('startButton'),
  help:$('help'),helpButton:$('helpButton'),closeHelp:$('closeHelpButton'),end:$('endPanel'),
  summary:$('summary'),restart:$('restartButton'),assetError:$('assetError'),joy:$('joystick'),joyKnob:$('joyKnob'),
  bell:$('bellAudio'),talk:$('talkAudio'),fight:$('fightAudio')
};

const renderer=new THREE.WebGLRenderer({canvas:ui.canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.05;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;

const scene=new THREE.Scene();
scene.background=new THREE.Color(0xbfdcf0);
scene.fog=new THREE.Fog(0xbfdcf0,18,34);
const camera=new THREE.PerspectiveCamera(50,1,.1,60);
const clock3d=new THREE.Clock();
const world=new THREE.Group();
scene.add(world);

scene.add(new THREE.HemisphereLight(0xf6fbff,0x78654f,2.25));
const sun=new THREE.DirectionalLight(0xffffff,2.4);
sun.position.set(-6,12,8);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
sun.shadow.camera.left=-12;sun.shadow.camera.right=12;sun.shadow.camera.top=10;sun.shadow.camera.bottom=-12;
scene.add(sun);
const fill=new THREE.DirectionalLight(0xcde8ff,.85);fill.position.set(7,6,-8);scene.add(fill);

const COLORS={
  minsu:'#e58b5a',jiwoo:'#65a79c',seoyeon:'#9d8bc5',taeho:'#e7bd55',junho:'#d26f67',arin:'#69a8c2',
  teacher:'#4b79d1'
};
const ROOM={minX:-7.2,maxX:7.2,minZ:-5.0,maxZ:5.0};
const seatDefs=[
  {x:-3.2,z:-2.25},{x:0,z:-2.25},{x:3.2,z:-2.25},
  {x:-3.2,z:.15},{x:0,z:.15},{x:3.2,z:.15}
];
const deskRects=seatDefs.map(s=>({x:s.x,z:s.z-.15,hx:.72,hz:.58}));
const boardPoint=new THREE.Vector3(0,0,-4.15);
const furnitureRoot=new THREE.Group();world.add(furnitureRoot);
const actorRoot=new THREE.Group();world.add(actorRoot);
const decoRoot=new THREE.Group();world.add(decoRoot);

let started=false;
let paused=false;
let phase='prep1';
let phaseTime=0;
let elapsedSchoolSeconds=0;
let interactionScan=0;
let pairScan=0;
let currentAction={type:'none'};
let toastTimer=0;
let chibiTemplate=null;
let chibiAnimations=[];
let player=null;
let students=[];
let pairs=[];
let relations=new Set();
let fightsThisRecess=0;
let playerGestureTimer=0;
let stats={focusHelps:0,conflictsMediated:0,fightsSeparated:0,missedFights:0,offTaskStarts:0,peacefulSocial:0};
const keys=new Set();
const joy={active:false,id:null,x:0,y:0};

function mat(color,rough=.82){
  return new THREE.MeshStandardMaterial({color,roughness:rough,metalness:0});
}
function box(w,h,d,color){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));
  m.castShadow=true;m.receiveShadow=true;return m;
}
function plane(w,h,color){
  const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat(color));
  m.receiveShadow=true;return m;
}
function addRoom(){
  const floor=box(15,.18,10.8,0xc8a77d);floor.position.y=-.12;world.add(floor);
  const back=box(15,3.7,.18,0xf1ead9);back.position.set(0,1.75,-5.35);world.add(back);
  const left=box(.18,3.7,10.8,0xe6efe9);left.position.set(-7.55,1.75,0);world.add(left);
  const right=left.clone();right.position.x=7.55;world.add(right);

  const board=box(6.2,1.9,.14,0x355d4f);board.position.set(0,2.15,-5.18);world.add(board);
  const frame=box(6.55,2.18,.09,0x8f6848);frame.position.set(0,2.15,-5.24);world.add(frame);frame.renderOrder=-1;
  board.position.z=-5.10;
  const boardText=makeTextPlane('1교시 준비',760,190,'#f7f3d1','#355d4f');
  boardText.scale.set(4.8,1.2,1);boardText.position.set(0,2.15,-5.0);world.add(boardText);

  const teacherDesk=box(2.1,.78,.9,0x8b623f);teacherDesk.position.set(4.75,.39,3.35);world.add(teacherDesk);
  const cabinet=box(1.7,1.6,.52,0x967555);cabinet.position.set(-6.35,.8,-3.9);world.add(cabinet);

  for(const s of seatDefs){
    const fallback=box(1.35,.65,.75,0xc99761);fallback.position.set(s.x,.32,s.z-.15);fallback.userData.fallbackDesk=true;furnitureRoot.add(fallback);
    const chair=box(.64,.55,.62,0x5c8eb0);chair.position.set(s.x,.28,s.z+.62);chair.userData.fallbackChair=true;furnitureRoot.add(chair);
  }

  const rug=plane(4.1,2.2,0x9ac2b6);rug.rotation.x=-Math.PI/2;rug.position.set(-4.7,.002,3.35);world.add(rug);
  for(let i=0;i<5;i++){
    const p=box(.28,.28,.28,[0xf2cc61,0x78a6d1,0xe38d72,0x78b18a,0xb292c9][i]);
    p.position.set(-5.8+i*.55,.15,3.35+(i%2?-.3:.3));decoRoot.add(p);
  }
}
function makeTextPlane(text,w,h,color,bg){
  const c=document.createElement('canvas');c.width=w;c.height=h;
  const ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
  ctx.fillStyle=color;ctx.font='900 72px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,w/2,h/2);
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
  const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:tex,transparent:false}));
  m.userData.canvas=c;m.userData.ctx=ctx;m.userData.texture=tex;return m;
}
function updateBoard(text){
  const m=world.children.find(o=>o.userData&&o.userData.canvas);
  if(!m)return;
  const c=m.userData.canvas,ctx=m.userData.ctx;
  ctx.fillStyle='#355d4f';ctx.fillRect(0,0,c.width,c.height);
  ctx.fillStyle='#f7f3d1';ctx.font='900 72px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,c.width/2,c.height/2);
  m.userData.texture.needsUpdate=true;
}

const furnitureCache=new Map();
async function loadFurniture(url){
  if(furnitureCache.has(url))return furnitureCache.get(url);
  const p=new GLTFLoader().loadAsync(url).then(g=>g.scene);
  furnitureCache.set(url,p);return p;
}
function normalizeStatic(root,target){
  root.updateMatrixWorld(true);
  let b=new THREE.Box3().setFromObject(root);
  const size=b.getSize(new THREE.Vector3());
  const max=Math.max(size.x,size.y,size.z)||1;
  root.scale.multiplyScalar(target/max);
  root.updateMatrixWorld(true);
  b=new THREE.Box3().setFromObject(root);
  const center=b.getCenter(new THREE.Vector3());
  root.position.x-=center.x;root.position.z-=center.z;root.position.y-=b.min.y;
}
async function applyRealFurniture(){
  try{
    const deskUrl='../../assets/game/3d/interiors/kenney-furniture-kit/desk.glb';
    const chairUrl='../../assets/game/3d/interiors/kenney-furniture-kit/chair-desk.glb';
    const bookUrl='../../assets/game/3d/interiors/kenney-furniture-kit/bookcase-open.glb';
    const screenUrl='../../assets/game/3d/interiors/kenney-furniture-kit/computer-screen.glb';
    const [deskT,chairT,bookT,screenT]=await Promise.all([loadFurniture(deskUrl),loadFurniture(chairUrl),loadFurniture(bookUrl),loadFurniture(screenUrl)]);
    furnitureRoot.children.filter(o=>o.userData.fallbackDesk||o.userData.fallbackChair).forEach(o=>o.visible=false);
    for(const s of seatDefs){
      const d=deskT.clone(true);normalizeStatic(d,1.42);d.position.set(s.x,0,s.z-.2);d.rotation.y=Math.PI;furnitureRoot.add(d);
      const c=chairT.clone(true);normalizeStatic(c,.78);c.position.set(s.x,0,s.z+.64);c.rotation.y=Math.PI;furnitureRoot.add(c);
    }
    const b=bookT.clone(true);normalizeStatic(b,1.85);b.position.set(-6.35,0,-3.9);b.rotation.y=Math.PI/2;furnitureRoot.add(b);
    const scr=screenT.clone(true);normalizeStatic(scr,.72);scr.position.set(4.75,.78,3.28);scr.rotation.y=Math.PI;furnitureRoot.add(scr);
  }catch(err){
    console.warn('[TeacherSim] Furniture asset pass kept procedural room fallback.',err);
  }
}

const BASE_NODES=['character_low','eyelashes','eyes','tooth'];
const HAIRS=['hairone','hairT','hairtail','hairtailknight','hairvariant','hairvariant.001'];
const TOGGLES=['amorarm','amorplastron','armorceinturethighs','armorhelmet','armorknees','armorlegs','armorshoe','armorskirt','armorthigh','bag','bottes','bottesgreen','ceinture','chemise','greenoutfit','greenoutfitbelt','greenoutfitneckless','hairone','hairT','hairtail','hairtailknight','hairvariant','hairvariant.001','hat','ninjassuit','ninjassuitmask','ninjassuitshoe','ninjassuitthigh','ninjasuitshort','pants','shirt','shoe','skirt'];
function setVisible(root,name,visible){const o=root.getObjectByName(name);if(o)o.visible=visible}
function setOutfit(root,kind,hair,index,color){
  BASE_NODES.forEach(n=>setVisible(root,n,true));
  TOGGLES.forEach(n=>setVisible(root,n,false));
  HAIRS.forEach(n=>setVisible(root,n,false));
  if(hair)setVisible(root,hair,true);
  if(kind==='teacher'){
    ['chemise','pants','shoe'].forEach(n=>setVisible(root,n,true));
  }else{
    ['shirt','shoe'].forEach(n=>setVisible(root,n,true));
    setVisible(root,index%2===0?'pants':'skirt',true);
    if(index===3||index===5)setVisible(root,'bag',true);
  }
  ['shirt','chemise'].forEach(name=>{
    const obj=root.getObjectByName(name);
    if(!obj)return;
    obj.traverse(m=>{
      if(!m.isMesh)return;
      if(Array.isArray(m.material))m.material=m.material.map(x=>{const y=x.clone();if(y.color)y.color.set(color);return y});
      else if(m.material){m.material=m.material.clone();if(m.material.color)m.material.color.set(color)}
    });
  });
}
function visibleBounds(root){
  root.updateMatrixWorld(true);
  const out=new THREE.Box3();let any=false;
  root.traverse(o=>{
    if(!o.visible||!o.isMesh||!o.geometry)return;
    if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();
    if(!o.geometry.boundingBox)return;
    out.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));any=true;
  });
  return any?out:null;
}
function normalizeChibi(root){
  root.updateMatrixWorld(true);
  const body=root.getObjectByName('character_low');
  let b=null;
  if(body&&body.geometry){
    if(!body.geometry.boundingBox)body.geometry.computeBoundingBox();
    if(body.geometry.boundingBox)b=body.geometry.boundingBox.clone().applyMatrix4(body.matrixWorld);
  }
  if(!b||b.isEmpty())b=visibleBounds(root);
  if(!b||b.isEmpty())throw new Error('Chibi bounds unavailable');
  const h=b.getSize(new THREE.Vector3()).y||1;
  root.scale.setScalar(1.08/h);root.updateMatrixWorld(true);
  b=visibleBounds(root);
  const center=b.getCenter(new THREE.Vector3());
  root.position.x-=center.x;root.position.z-=center.z;root.position.y-=b.min.y;
  root.updateMatrixWorld(true);
}
async function loadChibiTemplate(){
  const url='../../assets/game/chibi/ChibiCharactersV1.2/ChibiCharacters/glb/allinonepr.glb?v=20261007-chibi12';
  const gltf=await new GLTFLoader().loadAsync(url);
  chibiTemplate=gltf.scene;
  chibiAnimations=gltf.animations||[];
  setOutfit(chibiTemplate,'student','hairvariant',0,'#6f93c2');
  normalizeChibi(chibiTemplate);
  chibiTemplate.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false}});
}
function clipFor(kind){
  const names=kind==='walk'?['anim_walk','walkanim_']:kind==='push'?['anim_push','pushanim_']:['anim_iddle','iddleanim_','anim_iddle.001','iddle.001anim_'];
  return names.map(n=>chibiAnimations.find(c=>c.name===n)).find(Boolean)||chibiAnimations[0]||null;
}
function makeActor(kind,profile,index,pos){
  const model=cloneSkeleton(chibiTemplate);
  setOutfit(model,kind,profile&&profile.hair||'hairone',index,kind==='teacher'?COLORS.teacher:COLORS[profile.id]);
  model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false}});
  const root=new THREE.Group();root.position.copy(pos);root.add(model);actorRoot.add(root);
  const mixer=new THREE.AnimationMixer(model);
  const actor={root,model,mixer,action:null,anim:'',target:pos.clone(),speed:kind==='teacher'?3.15:1.15,kind};
  playAnim(actor,'idle');
  return actor;
}
function playAnim(actor,name,once=false){
  if(actor.anim===name&&!once)return;
  const clip=clipFor(name);if(!clip)return;
  const next=actor.mixer.clipAction(clip);
  if(actor.action&&actor.action!==next)actor.action.fadeOut(.1);
  next.reset().setLoop(once?THREE.LoopOnce:THREE.LoopRepeat,once?1:Infinity);next.clampWhenFinished=once;next.fadeIn(.1).play();
  actor.action=next;actor.anim=name;
}
function faceDirection(actor,dx,dz){
  if(Math.abs(dx)+Math.abs(dz)<.001)return;
  actor.root.rotation.y=Math.atan2(dx,dz);
}
function createActors(){
  player=makeActor('teacher',{hair:'hairone'},0,new THREE.Vector3(0,0,3.35));
  students=STUDENT_PROFILES.map((profile,i)=>{
    const runtime=createStudentRuntime(profile);
    const seat=seatDefs[i];
    const actor=makeActor('student',profile,i,new THREE.Vector3(seat.x,0,seat.z+.62));
    return {runtime,actor,seat:new THREE.Vector3(seat.x,0,seat.z+.62),wander:null,bubble:null};
  });
}
function isBlockedWithPadding(x,z,pad){
  if(x<ROOM.minX+.22+pad||x>ROOM.maxX-.22-pad||z<ROOM.minZ+.22+pad||z>ROOM.maxZ-.22-pad)return true;
  for(const r of deskRects)if(Math.abs(x-r.x)<r.hx+pad&&Math.abs(z-r.z)<r.hz+pad)return true;
  if(Math.abs(x-4.75)<1.05+pad&&Math.abs(z-3.35)<.58+pad)return true;
  return false;
}
function isBlocked(x,z){return isBlockedWithPadding(x,z,.25)}
function isStudentBlocked(x,z){return isBlockedWithPadding(x,z,.08)}
function randomOpenPoint(){
  for(let i=0;i<36;i++){
    const x=-5.8+Math.random()*11.6,z=-3.8+Math.random()*7.4;
    if(!isStudentBlocked(x,z))return new THREE.Vector3(x,0,z);
  }
  return new THREE.Vector3(0,0,2.5);
}

const NAV_STEP=.42;
const NAV_MIN_X=ROOM.minX+.36;
const NAV_MIN_Z=ROOM.minZ+.36;
const NAV_COLS=Math.floor((ROOM.maxX-ROOM.minX-.72)/NAV_STEP)+1;
const NAV_ROWS=Math.floor((ROOM.maxZ-ROOM.minZ-.72)/NAV_STEP)+1;
function navCell(ix,iz){return new THREE.Vector3(NAV_MIN_X+ix*NAV_STEP,0,NAV_MIN_Z+iz*NAV_STEP)}
function navKey(ix,iz){return ix+','+iz}
function pointToNavCell(point){
  return {
    ix:clamp(Math.round((point.x-NAV_MIN_X)/NAV_STEP),0,NAV_COLS-1),
    iz:clamp(Math.round((point.z-NAV_MIN_Z)/NAV_STEP),0,NAV_ROWS-1)
  };
}
function studentSegmentClear(a,b,step=.07){
  const distance=distance2D(a,b);
  const samples=Math.max(1,Math.ceil(distance/step));
  for(let i=1;i<=samples;i++){
    const t=i/samples;
    const x=THREE.MathUtils.lerp(a.x,b.x,t),z=THREE.MathUtils.lerp(a.z,b.z,t);
    if(isStudentBlocked(x,z))return false;
  }
  return true;
}
function nearestConnectedNavCell(point){
  const base=pointToNavCell(point);
  for(let radius=0;radius<=9;radius++){
    for(let dz=-radius;dz<=radius;dz++){
      for(let dx=-radius;dx<=radius;dx++){
        if(radius&&Math.abs(dx)!==radius&&Math.abs(dz)!==radius)continue;
        const ix=base.ix+dx,iz=base.iz+dz;
        if(ix<0||iz<0||ix>=NAV_COLS||iz>=NAV_ROWS)continue;
        const p=navCell(ix,iz);
        if(!isStudentBlocked(p.x,p.z)&&studentSegmentClear(point,p))return {ix,iz};
      }
    }
  }
  return null;
}
function simplifyStudentPath(points,start,target){
  if(!points.length)return [target.clone()];
  const all=[start.clone(),...points,target.clone()];
  const out=[];
  let anchor=all[0];
  for(let i=1;i<all.length-1;i++){
    const a=all[i].clone().sub(anchor);a.y=0;
    const b=all[i+1].clone().sub(all[i]);b.y=0;
    const cross=Math.abs(a.x*b.z-a.z*b.x);
    if(cross>.001){out.push(all[i].clone());anchor=all[i];}
  }
  out.push(target.clone());
  return out;
}
function findStudentPath(start,target){
  if(!isStudentBlocked(target.x,target.z)&&studentSegmentClear(start,target))return [target.clone()];
  const s=nearestConnectedNavCell(start),g=nearestConnectedNavCell(target);
  if(!s||!g)return [];
  const startKey=navKey(s.ix,s.iz),goalKey=navKey(g.ix,g.iz);
  const queue=[s],came=new Map([[startKey,null]]);let head=0;
  const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
  while(head<queue.length&&queue.length<2200){
    const cur=queue[head++],key=navKey(cur.ix,cur.iz);
    if(key===goalKey)break;
    const curPoint=navCell(cur.ix,cur.iz);
    for(const [dx,dz] of dirs){
      const ix=cur.ix+dx,iz=cur.iz+dz,nk=navKey(ix,iz);
      if(ix<0||iz<0||ix>=NAV_COLS||iz>=NAV_ROWS||came.has(nk))continue;
      const p=navCell(ix,iz);
      if(isStudentBlocked(p.x,p.z)||!studentSegmentClear(curPoint,p))continue;
      came.set(nk,key);queue.push({ix,iz});
    }
  }
  if(!came.has(goalKey))return [];
  const cells=[];let key=goalKey;
  while(key&&key!==startKey){
    const [ix,iz]=key.split(',').map(Number);cells.push(navCell(ix,iz));key=came.get(key);
  }
  cells.reverse();
  const route=simplifyStudentPath(cells,start,target);
  for(let i=0,prev=start;i<route.length;i++){
    if(!studentSegmentClear(prev,route[i]))return cells.length?[...cells,target.clone()]:[];
    prev=route[i];
  }
  return route;
}
function moveActorToward(actor,target,dt,speed){
  let waypoint=target;
  if(actor.kind==='student'){
    const goalKey=target.x.toFixed(2)+','+target.z.toFixed(2);
    if(actor.navGoal!==goalKey||!Array.isArray(actor.navPath)){
      actor.navGoal=goalKey;
      actor.navPath=findStudentPath(actor.root.position,target);
    }
    while(actor.navPath.length&&distance2D(actor.root.position,actor.navPath[0])<.09)actor.navPath.shift();
    if(!actor.navPath.length&&distance2D(actor.root.position,target)>.12){
      actor.navGoal='';
      playAnim(actor,'idle');
      return false;
    }
    waypoint=actor.navPath[0]||target;
  }
  const dx=waypoint.x-actor.root.position.x,dz=waypoint.z-actor.root.position.z;
  const d=Math.hypot(dx,dz);
  if(d<.06){playAnim(actor,'idle');return distance2D(actor.root.position,target)<.1}
  const step=Math.min(d,(speed||actor.speed)*dt);
  const nx=actor.root.position.x+dx/d*step,nz=actor.root.position.z+dz/d*step;
  const blocked=actor.kind==='student'?isStudentBlocked(nx,nz):isBlocked(nx,nz);
  if(!blocked){
    actor.root.position.x=nx;actor.root.position.z=nz;
  }else if(actor.kind==='student'){
    actor.navGoal='';actor.navPath=[];
  }
  faceDirection(actor,dx,dz);playAnim(actor,'walk');
  return distance2D(actor.root.position,target)<.1;
}
function distance2D(a,b){return Math.hypot(a.x-b.x,a.z-b.z)}

function showToast(text){
  ui.toast.textContent=text;ui.toast.classList.add('show');toastTimer=2.0;
}
function playAudio(el,volume=.7){
  try{el.volume=volume;el.currentTime=0;el.play().catch(()=>{})}catch(_){}
}
function setTalk(on){
  try{
    ui.talk.volume=.16;
    if(on)ui.talk.play().catch(()=>{});
    else ui.talk.pause();
  }catch(_){}
}
function phaseName(){
  if(phase==='prep1')return '1교시 준비';
  if(phase==='lesson1')return '1교시 · 수학';
  if(phase==='recess')return '쉬는 시간';
  if(phase==='prep2')return '2교시 준비';
  if(phase==='lesson2')return '2교시 · 국어';
  return '오늘 수업 끝';
}
function fmt(sec){sec=Math.max(0,Math.ceil(sec));return Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0')}
function updateClock(){
  const total=9*60+Math.floor(elapsedSchoolSeconds/60);
  ui.clock.textContent=String(Math.floor(total/60)).padStart(2,'0')+':'+String(total%60).padStart(2,'0');
}
function updateHud(){
  ui.phase.textContent=phaseName();updateClock();
  if(phase==='lesson1'||phase==='lesson2')ui.timer.textContent='수업 '+fmt(phaseTime);
  else if(phase==='recess')ui.timer.textContent='쉬는 시간 '+fmt(phaseTime);
  else if(phase==='prep1'||phase==='prep2')ui.timer.textContent='칠판 앞에서 시작';
  else ui.timer.textContent='수고했어요';

  const off=students.filter(s=>s.runtime.mode==='offtask').length;
  const conflict=pairs.some(p=>p.state==='fight')?'싸움 발생':pairs.some(p=>p.state==='conflict')?'말다툼':null;
  ui.classState.textContent=conflict||(off>=3?'산만함':off?'조금 산만':'차분함');

  ui.studentStrip.innerHTML=students.map(s=>{
    let cls='',icon='🙂';
    if(s.runtime.mode==='offtask'){cls='offtask';icon='😶‍🌫️'}
    const pair=pairs.find(p=>p.a===s||p.b===s);
    if(pair&&pair.state==='conflict'){cls='conflict';icon='💬'}
    if(pair&&pair.state==='fight'){cls='fight';icon='💥'}
    return '<div class="studentChip '+cls+'"><i>'+icon+'</i><span>'+s.runtime.name+'</span></div>';
  }).join('');
}
function setGuide(kicker,title,text){
  ui.guideKicker.textContent=kicker;ui.guideTitle.textContent=title;ui.guideText.textContent=text;
}
function relationKey(a,b){return [a.runtime.id,b.runtime.id].sort().join('|')}
function teacherNearStudent(s){return distance2D(player.root.position,s.actor.root.position)<=AI_RULES.teacherNearDistance}

function startLesson(which){
  phase=which===1?'lesson1':'lesson2';phaseTime=which===1?180:150;
  pairs=[];relations.clear();setTalk(false);
  students.forEach(s=>{resetFocusForLesson(s.runtime);s.actor.target=s.seat.clone();s.wander=null});
  updateBoard(which===1?'수학 · 같이 풀어보기':'국어 · 중심 내용 찾기');
  playAudio(ui.bell,.55);
  setGuide('수업 중','학생 행동을 살펴보세요','딴짓하는 학생 가까이 가면 도와줄 수 있어요.');
}
function startRecess(){
  phase='recess';phaseTime=90;pairs=[];relations.clear();fightsThisRecess=0;pairScan=.5;
  students.forEach(s=>{resetSocialForRecess(s.runtime);s.runtime.mode='solo';s.runtime.cooldown=Math.random()*2;s.actor.target=randomOpenPoint()});
  updateBoard('쉬는 시간');playAudio(ui.bell,.55);setTalk(true);
  setGuide('쉬는 시간','학생들이 스스로 어울립니다','말다툼이 보이면 가까이 가서 중재하세요.');
}
function startPrep2(){
  phase='prep2';phaseTime=0;pairs=[];relations.clear();setTalk(false);
  students.forEach(s=>{s.runtime.mode='focused';s.actor.target=s.seat.clone()});
  updateBoard('2교시 준비');
  setGuide('2교시 준비','칠판 앞으로 이동','칠판 가까이에서 행동 버튼을 누르면 국어 수업이 시작돼요.');
  playAudio(ui.bell,.55);
}
function finishDay(){
  phase='done';setTalk(false);pairs=[];playAudio(ui.bell,.55);updateBoard('오늘도 수고했어요!');
  ui.summary.innerHTML=
    '<div><strong>'+stats.focusHelps+'</strong><span>집중 도와준 횟수</span></div>'+
    '<div><strong>'+stats.conflictsMediated+'</strong><span>말다툼 중재</span></div>'+
    '<div><strong>'+stats.fightsSeparated+'</strong><span>직접 싸움 분리</span></div>'+
    '<div><strong>'+stats.missedFights+'</strong><span>놓친 싸움</span></div>'+
    '<div><strong>'+stats.peacefulSocial+'</strong><span>평화로운 어울림</span></div>';
  ui.end.classList.remove('hidden');
}

function offTaskWander(s){
  const base=s.seat;
  for(let i=0;i<12;i++){
    const angle=Math.random()*Math.PI*2,r=.38+Math.random()*.5;
    const candidate=new THREE.Vector3(base.x+Math.cos(angle)*r,0,base.z+Math.sin(angle)*r);
    if(!isStudentBlocked(candidate.x,candidate.z)){s.wander=candidate;return;}
  }
  s.wander=base.clone();
}
function updateLesson(dt){
  phaseTime-=dt;elapsedSchoolSeconds+=dt;
  students.forEach(s=>{
    const was=s.runtime.mode;
    const evt=updateLessonFocus(s.runtime,dt,{teacherNear:teacherNearStudent(s)});
    if(evt==='offtask-start'){stats.offTaskStarts++;offTaskWander(s);showBubble(s,'…','');}
    if(evt==='focused-return'){s.wander=null;hideBubble(s)}
    if(s.runtime.mode==='offtask'){
      if(!s.wander||distance2D(s.actor.root.position,s.wander)<.08)offTaskWander(s);
      moveActorToward(s.actor,s.wander,dt,.42);
    }else{
      moveActorToward(s.actor,s.seat,dt,.65);
      if(was==='offtask')hideBubble(s);
    }
  });
  if(phaseTime<=0){
    if(phase==='lesson1')startRecess();
    else finishDay();
  }
}

function freeStudents(){return students.filter(s=>!pairs.some(p=>p.a===s||p.b===s)&&s.runtime.cooldown<=0)}
function socialConflictCount(){return pairs.filter(p=>p.state==='conflict'||p.state==='fight').length}
function socialMeetingTargets(a,b){
  const midpoint=a.actor.root.position.clone().add(b.actor.root.position).multiplyScalar(.5);
  for(let i=0;i<18;i++){
    const center=i===0?midpoint.clone():randomOpenPoint();
    center.x=clamp(center.x,-5.6,5.6);center.z=clamp(center.z,-3.5,3.7);
    const angle=Math.random()*Math.PI;
    const side=new THREE.Vector3(.48,0,0).applyAxisAngle(new THREE.Vector3(0,1,0),angle);
    const pa=center.clone().add(side),pb=center.clone().sub(side);
    if(!isStudentBlocked(pa.x,pa.z)&&!isStudentBlocked(pb.x,pb.z))return {pa,pb};
  }
  return {pa:randomOpenPoint(),pb:randomOpenPoint()};
}
function startPair(a,b){
  const targets=socialMeetingTargets(a,b);
  a.actor.target=targets.pa;b.actor.target=targets.pb;
  a.runtime.mode='social';b.runtime.mode='social';
  pairs.push({a,b,state:'social',time:0,duration:AI_RULES.socialInteractionSeconds[0]+Math.random()*(AI_RULES.socialInteractionSeconds[1]-AI_RULES.socialInteractionSeconds[0])});
}
function releasePair(pair,cooldown=3){
  pairs=pairs.filter(p=>p!==pair);
  for(const s of [pair.a,pair.b]){
    s.runtime.mode='solo';s.runtime.cooldown=cooldown+Math.random()*2;s.actor.target=randomOpenPoint();hideBubble(s);
  }
}
function beginConflict(pair){
  pair.state='conflict';pair.time=0;pair.duration=AI_RULES.conflictSeconds;
  pair.a.runtime.mode='conflict';pair.b.runtime.mode='conflict';
  relations.add(relationKey(pair.a,pair.b));
  showBubble(pair.a,'!','conflict');showBubble(pair.b,'!','conflict');
}
function beginFight(pair){
  pair.state='fight';pair.time=0;pair.duration=AI_RULES.fightSeconds;fightsThisRecess++;
  pair.a.runtime.mode='fight';pair.b.runtime.mode='fight';
  showBubble(pair.a,'💥','fight');showBubble(pair.b,'💥','fight');
  playAnim(pair.a.actor,'push');playAnim(pair.b.actor,'push');playAudio(ui.fight,.45);
}
function mediatePair(pair){
  relations.delete(relationKey(pair.a,pair.b));
  [pair.a,pair.b].forEach((s,i)=>{
    s.runtime.social=Math.min(s.runtime.socialMax,s.runtime.social+s.runtime.socialMax*.28);
    s.runtime.cooldown=AI_RULES.conflictCooldownSeconds;
    s.runtime.mode='solo';
    s.actor.target=new THREE.Vector3(i===0?-4.8:4.8,0,2.8+(i*.5));
    hideBubble(s);
  });
  pairs=pairs.filter(p=>p!==pair);stats.conflictsMediated++;showToast('둘이 진정했어요.');
}
function sendFightApart(pair){
  [pair.a,pair.b].forEach((s,i)=>{
    s.runtime.cooldown=AI_RULES.separatedCooldownSeconds;
    s.runtime.mode='solo';
    s.actor.target=new THREE.Vector3(i===0?-5.6:5.6,0,3.4);hideBubble(s);
  });
  pairs=pairs.filter(p=>p!==pair);
}
function separateFight(pair){
  sendFightApart(pair);stats.fightsSeparated++;showToast('둘을 떨어뜨렸어요. 잠깐 쉬게 해주세요.');
}
function autoResolveFight(pair){
  sendFightApart(pair);stats.missedFights++;
  showToast('옆반 선생님이 와서 싸움을 말렸어요.');
}
function updateRecess(dt){
  phaseTime-=dt;elapsedSchoolSeconds+=dt;pairScan-=dt;
  students.forEach(s=>{
    if(!pairs.some(p=>p.a===s||p.b===s)){
      recoverSocial(s.runtime,dt,1);
      if(distance2D(s.actor.root.position,s.actor.target)<.12)s.actor.target=randomOpenPoint();
      moveActorToward(s.actor,s.actor.target,dt,.72);
    }
  });

  for(const pair of pairs.slice()){
    const meet=distance2D(pair.a.actor.root.position,pair.a.actor.target)<.16&&distance2D(pair.b.actor.root.position,pair.b.actor.target)<.16;
    moveActorToward(pair.a.actor,pair.a.actor.target,dt,.78);
    moveActorToward(pair.b.actor,pair.b.actor.target,dt,.78);
    if(meet){
      pair.time+=dt;
      faceDirection(pair.a.actor,pair.b.actor.root.position.x-pair.a.actor.root.position.x,pair.b.actor.root.position.z-pair.a.actor.root.position.z);
      faceDirection(pair.b.actor,pair.a.actor.root.position.x-pair.b.actor.root.position.x,pair.a.actor.root.position.z-pair.b.actor.root.position.z);
      if(pair.state==='social'){
        drainSocial(pair.a.runtime,dt);drainSocial(pair.b.runtime,dt);
        if(pair.time>=pair.duration){
          const teacherNear=distance2D(player.root.position,pair.a.actor.root.position)<2.8||distance2D(player.root.position,pair.b.actor.root.position)<2.8;
          const relationActive=relations.has(relationKey(pair.a,pair.b));
          const chance=conflictProbability(pair.a.runtime,pair.b.runtime,{teacherNear,relationActive});
          if(socialConflictCount()<AI_RULES.maxConcurrentConflicts&&Math.random()<chance)beginConflict(pair);
          else{stats.peacefulSocial++;releasePair(pair,2.5)}
        }
      }else if(pair.state==='conflict'){
        drainSocial(pair.a.runtime,dt,.45);drainSocial(pair.b.runtime,dt,.45);
        if(pair.time>=pair.duration){
          if(fightsThisRecess<AI_RULES.maxFightsPerRecess&&Math.random()<.30)beginFight(pair);
          else releasePair(pair,AI_RULES.conflictCooldownSeconds);
        }
      }else if(pair.state==='fight'){
        playAnim(pair.a.actor,'push');playAnim(pair.b.actor,'push');
        if(pair.time>=pair.duration)autoResolveFight(pair);
      }
    }
  }

  if(pairScan<=0){
    pairScan=1.1+Math.random()*.8;
    if(pairs.length<AI_RULES.maxConcurrentSocialPairs){
      const free=freeStudents();
      if(free.length>=2&&Math.random()<.72){
        const a=free[(Math.random()*free.length)|0];
        const rest=free.filter(s=>s!==a);
        const b=rest[(Math.random()*rest.length)|0];
        startPair(a,b);
      }
    }
  }
  if(phaseTime<=0)startPrep2();
}

function showBubble(s,text,cls){
  if(!s.bubble){
    s.bubble=document.createElement('div');s.bubble.className='statusBubble';ui.app.appendChild(s.bubble);
  }
  s.bubble.textContent=text;s.bubble.className='statusBubble '+(cls||'');s.bubble.style.display='block';
}
function hideBubble(s){if(s.bubble)s.bubble.style.display='none'}
function updateBubbles(){
  const v=new THREE.Vector3();
  students.forEach(s=>{
    if(!s.bubble||s.bubble.style.display==='none')return;
    v.copy(s.actor.root.position);v.y=1.55;v.project(camera);
    const x=(v.x*.5+.5)*innerWidth,y=(-v.y*.5+.5)*innerHeight;
    s.bubble.style.left=x+'px';s.bubble.style.top=y+'px';
    s.bubble.style.opacity=v.z<1?'1':'0';
  });
}

function scanAction(){
  if(!player){currentAction={type:'none'};return}
  if(phase==='prep1'||phase==='prep2'){
    if(distance2D(player.root.position,boardPoint)<1.9){
      currentAction={type:'startLesson'};setAction('▶','수업 시작',true);
      setGuide('수업 준비','칠판에서 수업 시작','준비됐으면 행동 버튼!');
      return;
    }
    currentAction={type:'none'};setAction('✋','살펴보기',false);return;
  }
  if(phase==='lesson1'||phase==='lesson2'){
    const near=students.filter(s=>s.runtime.mode==='offtask'&&distance2D(player.root.position,s.actor.root.position)<2.35)
      .sort((a,b)=>distance2D(player.root.position,a.actor.root.position)-distance2D(player.root.position,b.actor.root.position))[0];
    if(near){currentAction={type:'focus',student:near};setAction('👀',near.runtime.name+' 집중 도와주기',true);return}
  }
  if(phase==='recess'){
    const pair=pairs.filter(p=>p.state==='conflict'||p.state==='fight').sort((a,b)=>{
      const da=Math.min(distance2D(player.root.position,a.a.actor.root.position),distance2D(player.root.position,a.b.actor.root.position));
      const db=Math.min(distance2D(player.root.position,b.a.actor.root.position),distance2D(player.root.position,b.b.actor.root.position));
      return da-db;
    })[0];
    if(pair){
      const d=Math.min(distance2D(player.root.position,pair.a.actor.root.position),distance2D(player.root.position,pair.b.actor.root.position));
      if(d<2.75){
        currentAction={type:pair.state==='fight'?'separate':'mediate',pair};
        setAction(pair.state==='fight'?'🫱':'💬',pair.state==='fight'?'둘 떼어놓기':'중재하기',true);return;
      }
    }
  }
  currentAction={type:'none'};setAction('✋','살펴보기',false);
}
function setAction(icon,label,ready){
  ui.actionIcon.textContent=icon;ui.actionLabel.textContent=label;ui.action.classList.toggle('ready',!!ready);
}
function useAction(){
  if(!started||paused)return;
  if(currentAction.type==='startLesson'){startLesson(phase==='prep1'?1:2);return}
  if(currentAction.type==='focus'){
    const s=currentAction.student;helpFocus(s.runtime);stats.focusHelps++;s.wander=null;s.actor.target=s.seat.clone();
    playerGestureTimer=.5;playAnim(player,'push');showToast(s.runtime.name+'에게 관심을 줬어요.');hideBubble(s);return;
  }
  if(currentAction.type==='mediate'){mediatePair(currentAction.pair);playerGestureTimer=.5;playAnim(player,'push');return}
  if(currentAction.type==='separate'){separateFight(currentAction.pair);playerGestureTimer=.65;playAnim(player,'push');return}
  showToast(phase==='recess'?'학생들을 조금 더 살펴보세요.':'필요한 학생 가까이 가 보세요.');
}
function updatePlayer(dt){
  if(playerGestureTimer>0){playerGestureTimer=Math.max(0,playerGestureTimer-dt);playAnim(player,'push');return}
  let x=0,z=0;
  if(keys.has('KeyA')||keys.has('ArrowLeft'))x-=1;
  if(keys.has('KeyD')||keys.has('ArrowRight'))x+=1;
  if(keys.has('KeyW')||keys.has('ArrowUp'))z-=1;
  if(keys.has('KeyS')||keys.has('ArrowDown'))z+=1;
  x+=joy.x;z+=joy.y;
  const len=Math.hypot(x,z);
  if(len>.08){
    x/=Math.max(1,len);z/=Math.max(1,len);
    const nx=player.root.position.x+x*player.speed*dt,nz=player.root.position.z+z*player.speed*dt;
    if(!isBlocked(nx,player.root.position.z))player.root.position.x=nx;
    if(!isBlocked(player.root.position.x,nz))player.root.position.z=nz;
    faceDirection(player,x,z);playAnim(player,'walk');
  }else playAnim(player,'idle');
}

function updateCamera(dt){
  const desired=new THREE.Vector3(player.root.position.x,7.7,player.root.position.z+8.3);
  camera.position.lerp(desired,1-Math.pow(.001,dt));
  const look=player.root.position.clone();look.y=.7;look.z-=1.0;camera.lookAt(look);
}
function updateGuideByAction(){
  if(currentAction.type==='focus')setGuide('수업 중',currentAction.student.runtime.name+'가 딴짓 중','가까이 왔어요. 행동 버튼으로 관심을 주세요.');
  else if(currentAction.type==='mediate')setGuide('쉬는 시간','말다툼이 생겼어요','가까이에서 중재하면 갈등이 풀립니다.');
  else if(currentAction.type==='separate')setGuide('쉬는 시간','싸움이 났어요!','둘을 먼저 떼어놓으세요.');
}

function setupInput(){
  addEventListener('keydown',e=>{keys.add(e.code);if((e.code==='Space'||e.code==='KeyE')&&!e.repeat){e.preventDefault();useAction()}});
  addEventListener('keyup',e=>keys.delete(e.code));
  ui.action.addEventListener('pointerdown',e=>{e.preventDefault();useAction()});
  const base=ui.joy.getBoundingClientRect;
  const moveJoy=e=>{
    const r=ui.joy.getBoundingClientRect();const cx=r.left+r.width/2,cy=r.top+r.height/2;
    let dx=e.clientX-cx,dy=e.clientY-cy;const max=r.width*.31;const d=Math.hypot(dx,dy)||1;
    if(d>max){dx=dx/d*max;dy=dy/d*max}
    joy.x=dx/max;joy.y=dy/max;ui.joyKnob.style.transform='translate('+dx+'px,'+dy+'px)';
  };
  ui.joy.addEventListener('pointerdown',e=>{joy.active=true;joy.id=e.pointerId;ui.joy.setPointerCapture?.(e.pointerId);moveJoy(e)});
  ui.joy.addEventListener('pointermove',e=>{if(joy.active&&e.pointerId===joy.id)moveJoy(e)});
  const release=e=>{if(e.pointerId!==joy.id)return;joy.active=false;joy.id=null;joy.x=joy.y=0;ui.joyKnob.style.transform='translate(0,0)'};
  ui.joy.addEventListener('pointerup',release);ui.joy.addEventListener('pointercancel',release);
}

function resize(){
  const w=Math.max(1,innerWidth),h=Math.max(1,innerHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
}
addEventListener('resize',resize);resize();

function resetAll(){
  location.reload();
}
ui.restart.addEventListener('click',resetAll);
ui.helpButton.addEventListener('click',()=>{paused=true;ui.help.classList.remove('hidden')});
ui.closeHelp.addEventListener('click',()=>{ui.help.classList.add('hidden');paused=false;clock3d.getDelta()});

async function boot(){
  addRoom();applyRealFurniture();setupInput();
  ui.start.disabled=true;ui.start.textContent='교실 준비 중…';
  try{
    await loadChibiTemplate();createActors();
  }catch(err){
    console.error('[TeacherSim] Chibi load failed',err);ui.intro.classList.add('hidden');ui.assetError.classList.remove('hidden');return;
  }
  ui.start.disabled=false;ui.start.textContent='교실 들어가기';
  ui.start.addEventListener('click',()=>{
    started=true;ui.intro.classList.add('hidden');setGuide('1교시 준비','칠판 앞으로 이동','가까이 가면 수업 시작 버튼이 나타나요.');clock3d.getDelta();
  });
  camera.position.set(0,7.7,11.6);camera.lookAt(0,.7,-.5);
  requestAnimationFrame(loop);
}
function loop(){
  requestAnimationFrame(loop);
  const dt=Math.min(.05,clock3d.getDelta());
  if(player){
    player.mixer.update(dt);students.forEach(s=>s.actor.mixer.update(dt));
    if(started&&!paused&&phase!=='done'){
      updatePlayer(dt);
      if(phase==='lesson1'||phase==='lesson2')updateLesson(dt);
      else if(phase==='recess')updateRecess(dt);
      else students.forEach(s=>moveActorToward(s.actor,s.seat,dt,.7));
      interactionScan-=dt;if(interactionScan<=0){interactionScan=.12;scanAction();updateGuideByAction()}
      updateCamera(dt);updateHud();
    }else if(player)updateCamera(dt);
  }
  if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)ui.toast.classList.remove('show')}
  updateBubbles();renderer.render(scene,camera);
}
boot();

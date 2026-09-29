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
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let toastTimer = null;
let audioCtx = null;

function sfx(kind){
  try{
    if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
    if(audioCtx.state==='suspended') audioCtx.resume();
    const t=audioCtx.currentTime,o=audioCtx.createOscillator(),g=audioCtx.createGain();
    o.connect(g);g.connect(audioCtx.destination);
    if(kind==='place'){o.type='triangle';o.frequency.setValueAtTime(260,t);o.frequency.exponentialRampToValueAtTime(170,t+.08)}
    else if(kind==='break'){o.type='square';o.frequency.setValueAtTime(150,t);o.frequency.exponentialRampToValueAtTime(80,t+.09)}
    else if(kind==='good'){o.type='sine';o.frequency.setValueAtTime(520,t);o.frequency.setValueAtTime(780,t+.09)}
    else{o.type='sine';o.frequency.setValueAtTime(210,t);o.frequency.setValueAtTime(180,t+.08)}
    g.gain.setValueAtTime(.055,t);g.gain.exponentialRampToValueAtTime(.0001,t+.16);
    o.start(t);o.stop(t+.18);
  }catch(e){}
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
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
  ['challengePanel','challengeFlyHud','netPanel','freeHud','resultCard','tutorial'].forEach(id=>setVisible(id,false));
  $('topbar').classList.add('hidden');
  $('homeScreen').classList.add('hidden');
  $('actionCheck').classList.add('hidden');
  $('actionNext').classList.add('hidden');
  $('actionSave').classList.add('hidden');
  $('actionXray').classList.add('hidden');
}
function showHome(){
  if(document.pointerLockElement===canvas)document.exitPointerLock();
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
  ensureRenderer();ensureLoop();clearModeUi();$('topbar').classList.remove('hidden');mode=next;
  if(document.pointerLockElement===canvas) document.exitPointerLock();
  if(next==='challenge') initChallenge();
  if(next==='net') initNet();
  if(next==='free') initFree();
}
$('homeBtn').addEventListener('click',showHome);

function roundedRect(ctx,x,y,w,h,r){
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
}

/* ---------------- 설계도 챌린지 ---------------- */
const blockGeo=new THREE.BoxGeometry(.96,.96,.96);
const edgeGeo=new THREE.EdgesGeometry(blockGeo);
const challengeMat=new THREE.MeshStandardMaterial({color:0xf2d19a,roughness:.78});
const CHALLENGE_SIZE=16,CHALLENGE_HALF=CHALLENGE_SIZE/2,CHALLENGE_MAX_Y=11;
let challengeBlocks=new Map(),challengeMeshes=[],challengePlane=null,challengeGhost=null,targetGhosts=[],missionIndex=0;
let challengeYaw=0,challengePitch=0,challengeKeys={};
function addCuboid(arr,x0,z0,w,d,h){
  for(let x=x0;x<x0+w;x++)for(let z=z0;z<z0+d;z++)for(let y=0;y<h;y++)arr.push([x,y,z]);
}
const challengeMissions=(()=>{
  const a=[];
  let b=[];addCuboid(b,1,1,3,2,2);a.push({name:'작은 도서관',tip:'가로·세로·높이를 먼저 살펴보세요.',blocks:b});
  b=[];addCuboid(b,1,1,4,2,1);addCuboid(b,2,1,2,2,2);a.push({name:'계단형 전시관',tip:'높이가 달라지는 곳을 찾아보세요.',blocks:b});
  b=[];addCuboid(b,1,1,4,3,1);addCuboid(b,1,1,1,3,3);a.push({name:'L자 전망대',tip:'보이는 모서리가 어디에서 꺾이는지 보세요.',blocks:b});
  b=[];addCuboid(b,1,1,4,1,3);addCuboid(b,1,2,1,2,3);addCuboid(b,4,2,1,2,2);a.push({name:'큐브 게이트',tip:'앞쪽 기둥과 뒤쪽 기둥의 높이를 비교하세요.',blocks:b});
  return a;
})();
function challengeKey(x,y,z){return x+','+y+','+z}
function addChallengeBlock(x,y,z,quiet){
  if(x<0||x>=CHALLENGE_SIZE||z<0||z>=CHALLENGE_SIZE||y<0||y>CHALLENGE_MAX_Y)return false;
  const key=challengeKey(x,y,z);if(challengeBlocks.has(key))return false;
  const mesh=new THREE.Mesh(blockGeo,challengeMat.clone());mesh.position.set(x-CHALLENGE_HALF+.5,y+.5,z-CHALLENGE_HALF+.5);mesh.castShadow=true;mesh.receiveShadow=true;
  mesh.userData={cx:x,cy:y,cz:z,challenge:true};const line=new THREE.LineSegments(edgeGeo,new THREE.LineBasicMaterial({color:0x8b633c,transparent:true,opacity:.6}));mesh.add(line);
  scene.add(mesh);challengeBlocks.set(key,mesh);challengeMeshes.push(mesh);if(!quiet)sfx('place');return true;
}
function removeChallengeBlock(mesh){
  const d=mesh.userData;
  scene.remove(mesh);challengeBlocks.delete(challengeKey(d.cx,d.cy,d.cz));challengeMeshes=challengeMeshes.filter(x=>x!==mesh);sfx('break');
}
function clearChallenge(){
  challengeMeshes.forEach(m=>scene.remove(m));challengeMeshes=[];challengeBlocks.clear();clearTargetGhosts();$('resultCard').classList.add('hidden');updateChallengeStats();
}
function updateChallengeStats(){
  const target=challengeMissions[missionIndex].blocks.length;$('placedCount').textContent=challengeBlocks.size;$('targetCount').textContent=target;
  const maxY=Math.max(0,...Array.from(challengeBlocks.values()).map(m=>m.userData.cy+1));$('heightCount').textContent=maxY;
}
function drawBlueprint(){
  const c=$('blueprintCanvas'),ctx=c.getContext('2d'),m=challengeMissions[missionIndex];ctx.clearRect(0,0,c.width,c.height);
  ctx.fillStyle='#eaf5ff';ctx.fillRect(0,0,c.width,c.height);
  ctx.strokeStyle='rgba(74,110,150,.12)';ctx.lineWidth=1;
  for(let x=0;x<c.width;x+=20){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,c.height);ctx.stroke()}
  for(let y=0;y<c.height;y+=20){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(c.width,y);ctx.stroke()}
  const unit=24,faces=m.blocks.slice().sort((a,b)=>(a[0]+a[2]+a[1])-(b[0]+b[2]+b[1]));
  const pts=faces.map(v=>[(v[0]-v[2])*unit,(v[0]+v[2])*unit*.5-v[1]*unit]);
  let minX=Math.min(...pts.map(p=>p[0]))-unit,maxX=Math.max(...pts.map(p=>p[0]))+unit,minY=Math.min(...pts.map(p=>p[1]))-unit,maxY=Math.max(...pts.map(p=>p[1]))+unit;
  const ox=c.width/2-(minX+maxX)/2,oy=c.height/2-(minY+maxY)/2+8;
  function poly(points,fill){
    ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle='#34445d';ctx.lineWidth=1.15;ctx.stroke();
  }
  faces.forEach(v=>{
    const X=ox+(v[0]-v[2])*unit,Y=oy+(v[0]+v[2])*unit*.5-v[1]*unit;
    poly([[X,Y-unit],[X+unit,Y-unit*.5],[X,Y],[X-unit,Y-unit*.5]],'#fff2c8');
    poly([[X-unit,Y-unit*.5],[X,Y],[X,Y+unit],[X-unit,Y+unit*.5]],'#dcae72');
    poly([[X+unit,Y-unit*.5],[X,Y],[X,Y+unit],[X+unit,Y+unit*.5]],'#efc98d');
  });
  ctx.fillStyle='#24344d';ctx.font='900 18px system-ui';ctx.fillText(m.name,14,24);
  ctx.font='700 11px system-ui';ctx.fillStyle='#60708a';ctx.fillText('겨냥도를 보고 가장 닮은 건축물을 만들어 보세요.',14,43);
  $('missionName').textContent=m.name;$('missionTip').textContent=m.tip;
}
function initChallenge(){
  modeTitle('설계도 챌린지','겨냥도 → 3D 크리에이티브 건축');
  setVisible('challengePanel',true);setVisible('challengeFlyHud',true);$('actionCheck').classList.remove('hidden');$('actionNext').classList.remove('hidden');
  cleanScene(0xeaf6ff);
  camera.position.set(5.5,4.5,7.5);camera.rotation.order='YXZ';challengeYaw=.55;challengePitch=-.28;challengeKeys={};updateChallengeCamera();
  const planeMat=new THREE.MeshBasicMaterial({transparent:true,opacity:0,side:THREE.DoubleSide});
  challengePlane=new THREE.Mesh(new THREE.PlaneGeometry(CHALLENGE_SIZE,CHALLENGE_SIZE),planeMat);challengePlane.rotation.x=-Math.PI/2;challengePlane.position.y=.001;challengePlane.userData.base=true;scene.add(challengePlane);
  const grid=new THREE.GridHelper(CHALLENGE_SIZE,CHALLENGE_SIZE,0x5269c7,0xa9c2da);grid.position.y=.01;scene.add(grid);
  challengeGhost=new THREE.Mesh(blockGeo,new THREE.MeshBasicMaterial({color:0x5a67f2,transparent:true,opacity:.3,depthWrite:false}));challengeGhost.visible=false;scene.add(challengeGhost);
  challengeBlocks=new Map();challengeMeshes=[];targetGhosts=[];drawBlueprint();updateChallengeStats();
  $('actionCheck').onclick=checkChallenge;$('actionNext').onclick=()=>{missionIndex=(missionIndex+1)%challengeMissions.length;clearChallenge();drawBlueprint()};
  $('clearChallenge').onclick=clearChallenge;$('hintChallenge').onclick=()=>toast(challengeMissions[missionIndex].tip);
  $('challengeLockNotice').classList.remove('hidden');$('challengeLockNotice').onclick=()=>canvas.requestPointerLock();
  showTutorial('challenge');
}
function challengeCenterHit(max=8){
  raycaster.setFromCamera(new THREE.Vector2(0,0),camera);
  const hit=raycaster.intersectObjects(challengeMeshes.concat([challengePlane]),false)[0]||null;
  return hit&&hit.distance<=max?hit:null;
}
function challengePlaceTarget(hit){
  if(!hit)return null;
  if(hit.object===challengePlane){
    return {x:Math.floor(hit.point.x+CHALLENGE_HALF),y:0,z:Math.floor(hit.point.z+CHALLENGE_HALF)};
  }
  const d=hit.object.userData,n=hit.face&&hit.face.normal;if(!n)return null;
  return {x:d.cx+Math.round(n.x),y:d.cy+Math.round(n.y),z:d.cz+Math.round(n.z)};
}
function updateChallengeGhost(){
  if(!challengeGhost)return;
  const hit=challengeCenterHit(),p=challengePlaceTarget(hit);
  if(p&&p.x>=0&&p.x<CHALLENGE_SIZE&&p.z>=0&&p.z<CHALLENGE_SIZE&&p.y>=0&&p.y<=CHALLENGE_MAX_Y&&!challengeBlocks.has(challengeKey(p.x,p.y,p.z))){
    challengeGhost.position.set(p.x-CHALLENGE_HALF+.5,p.y+.5,p.z-CHALLENGE_HALF+.5);challengeGhost.visible=true;
  }else challengeGhost.visible=false;
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
function bestChallengeMatch(){
  const userPoints=Array.from(challengeBlocks.values()).map(m=>[m.userData.cx,m.userData.cy,m.userData.cz]);
  const user=normalizedShape(userPoints);
  const targetRaw=challengeMissions[missionIndex].blocks.map(p=>p.slice());
  let best={common:0,union:Infinity,score:0,target:null,targetKeys:new Set(),user:user,turn:0};
  for(let turn=0;turn<4;turn++){
    const target=normalizedShape(rotateShapeY(targetRaw,turn));
    let common=0;user.keys.forEach(k=>{if(target.keys.has(k))common++});
    const union=new Set([...user.keys,...target.keys]).size;
    const score=union?Math.round(common/union*100):0;
    if(score>best.score||(score===best.score&&union<best.union))best={common,union,score,target,targetKeys:target.keys,user,turn};
  }
  return best;
}
function checkChallenge(){
  clearTargetGhosts();
  const match=bestChallengeMatch(),userPoints=Array.from(challengeBlocks.values()).map(m=>[m.userData.cx,m.userData.cy,m.userData.cz]);
  const origin=match.user.min;
  challengeMeshes.forEach(m=>{
    const k=challengeKey(m.userData.cx-origin[0],m.userData.cy-origin[1],m.userData.cz-origin[2]);
    m.material.color.set(match.targetKeys.has(k)?0x56bd91:0xf08a80);
  });
  match.target.points.forEach(p=>{
    const k=challengeKey(...p);if(match.user.keys.has(k))return;
    const gx=origin[0]+p[0],gy=origin[1]+p[1],gz=origin[2]+p[2];
    const g=new THREE.Mesh(blockGeo,new THREE.MeshBasicMaterial({color:0x5a67f2,wireframe:true,transparent:true,opacity:.82}));
    g.position.set(gx-CHALLENGE_HALF+.5,gy+.5,gz-CHALLENGE_HALF+.5);scene.add(g);targetGhosts.push(g);
  });
  const targetCount=match.target.points.length,userCount=userPoints.length,missing=Math.max(0,targetCount-match.common),extra=Math.max(0,userCount-match.common);
  $('resultCard').classList.remove('hidden');$('resultScore').textContent=match.score+'%';
  $('resultText').innerHTML=match.score===100
    ? '건물을 <b>어디에 지었는지는 상관없어요.</b><br>모양과 블록 배치가 설계도와 같습니다.'
    : '같은 모양 블록 <b>'+match.common+'</b>개 · 더 필요한 블록 <b>'+missing+'</b>개 · 다른 블록 <b>'+extra+'</b>개<br>파란 선은 <b>내 건축물 위치에 맞춰</b> 겹쳐 보여 줍니다.';
  if(match.score===100){toast('정답! 위치와 방향이 달라도 같은 건축물이면 인정합니다.');sfx('good');reportResult('challenge',100,true)}
  else{toast('위치는 채점하지 않아요. 모양이 다른 부분만 확인해 보세요.');sfx('bad')}
}
function updateChallengeCamera(){
  camera.rotation.order='YXZ';camera.rotation.y=challengeYaw;camera.rotation.x=challengePitch;
}
function updateChallengeFly(dt){
  const speed=(challengeKeys.ControlLeft||challengeKeys.ControlRight)?8.5:5.2;
  const forward=new THREE.Vector3(Math.sin(challengeYaw),0,Math.cos(challengeYaw));
  const right=new THREE.Vector3(Math.cos(challengeYaw),0,-Math.sin(challengeYaw));
  const move=new THREE.Vector3();
  if(challengeKeys.KeyW||challengeKeys.ArrowUp)move.addScaledVector(forward,-1);
  if(challengeKeys.KeyS||challengeKeys.ArrowDown)move.add(forward);
  if(challengeKeys.KeyA||challengeKeys.ArrowLeft)move.addScaledVector(right,-1);
  if(challengeKeys.KeyD||challengeKeys.ArrowRight)move.add(right);
  if(move.lengthSq())camera.position.add(move.normalize().multiplyScalar(speed*dt));
  if(challengeKeys.Space)camera.position.y+=speed*dt;
  if(challengeKeys.ShiftLeft||challengeKeys.ShiftRight)camera.position.y-=speed*dt;
  camera.position.x=THREE.MathUtils.clamp(camera.position.x,-13,13);
  camera.position.z=THREE.MathUtils.clamp(camera.position.z,-13,13);
  camera.position.y=THREE.MathUtils.clamp(camera.position.y,.7,14);
  updateChallengeCamera();updateChallengeGhost();
}

/* ---------------- 전개도 연구실 ---------------- */
const symbols=['☀️','🌳','⭐','🚪','❤️','⚽'];
const faceNames=['오른쪽','왼쪽','위','아래','앞','뒤'];
let netBox=null,netTarget=[],netAssigned=[],selectedSymbol='☀️',foldPieces=[];
function symbolMaterial(symbol,bg){
  const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.fillStyle=bg||'#ffffff';x.fillRect(0,0,256,256);
  x.strokeStyle='#cbd2df';x.lineWidth=10;x.strokeRect(5,5,246,246);x.font='118px "Apple Color Emoji","Segoe UI Emoji",sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(symbol||'',128,132);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return new THREE.MeshStandardMaterial({map:t,roughness:.72});
}
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function initNet(){
  modeTitle('전개도 연구실','2D 전개도 → 3D 면 찾기');
  setVisible('netPanel',true);$('actionCheck').classList.remove('hidden');$('actionNext').classList.remove('hidden');
  cleanScene(0xfff5dc);camera.position.set(5,4.2,6);camera.lookAt(0,0,0);makeOrbit(new THREE.Vector3(0,0,0));orbit.minDistance=4;orbit.maxDistance=10;
  netTarget=shuffle(symbols);netAssigned=['','','','','',''];selectedSymbol=netTarget[0];buildNetBoard();buildPalette();
  netBox=new THREE.Mesh(new THREE.BoxGeometry(2.8,1.9,1.55),netAssigned.map(s=>symbolMaterial(s,'#ffffff')));netBox.castShadow=true;netBox.receiveShadow=true;netBox.userData.netbox=true;scene.add(netBox);
  const floor=new THREE.Mesh(new THREE.CircleGeometry(4.5,64),new THREE.MeshStandardMaterial({color:0xf0dfb7,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-1.15;floor.receiveShadow=true;scene.add(floor);
  $('actionCheck').onclick=checkNet;$('actionNext').onclick=()=>initNet();$('foldNet').onclick=foldPreview;
  $('resultCard').classList.add('hidden');showTutorial('net');
}
function buildNetBoard(){
  document.querySelectorAll('.net-face').forEach(el=>{const f=Number(el.dataset.face);el.textContent=netTarget[f]});
  $('netMission').textContent='전개도의 그림이 직육면체의 어느 면으로 오는지 찾아 배치하세요.';
}
function buildPalette(){
  const p=$('stickerPalette');p.innerHTML='';
  netTarget.forEach(s=>{const b=document.createElement('button');b.className='sticker'+(s===selectedSymbol?' active':'');b.textContent=s;b.onclick=()=>{selectedSymbol=s;buildPalette()};p.appendChild(b)});
}
function netHit(ev){
  const rect=canvas.getBoundingClientRect();mouse.x=((ev.clientX-rect.left)/rect.width)*2-1;mouse.y=-((ev.clientY-rect.top)/rect.height)*2+1;
  raycaster.setFromCamera(mouse,camera);return raycaster.intersectObject(netBox,false)[0]||null;
}
function assignNetFace(hit){
  if(!hit||!hit.face)return;const idx=hit.face.materialIndex;netAssigned[idx]=selectedSymbol;
  netBox.material[idx].dispose();netBox.material[idx]=symbolMaterial(selectedSymbol,'#ffffff');netBox.material.needsUpdate=true;sfx('place');
  $('selectedFace').textContent=faceNames[idx]+' 면 ← '+selectedSymbol;
}
function checkNet(){
  let good=0;for(let i=0;i<6;i++)if(netAssigned[i]===netTarget[i])good++;
  $('resultCard').classList.remove('hidden');$('resultScore').textContent=good+'/6';
  const wrong=[];for(let i=0;i<6;i++)if(netAssigned[i]!==netTarget[i])wrong.push(faceNames[i]);
  $('resultText').innerHTML=good===6?'여섯 면의 위치를 모두 맞혔어요. <b>접어 보기</b>로 확인해 보세요.':'다시 볼 면: <b>'+wrong.join(', ')+'</b><br>직육면체를 돌려가며 전개도의 연결 관계를 따라가 보세요.';
  if(good===6){toast('전개도 복원 성공! 실제로 접히는 모습을 확인해 보세요.');sfx('good');reportResult('net',100,true)}
  else{sfx('bad');toast('몇 면의 위치가 달라요. 전개도의 붙어 있는 면을 따라가 보세요.')}
}
function foldPreview(){
  if(!netBox)return;foldPieces.forEach(x=>scene.remove(x));foldPieces=[];netBox.visible=false;
  const starts=[new THREE.Vector3(2.6,0,0),new THREE.Vector3(-2.6,0,0),new THREE.Vector3(0,1.85,0),new THREE.Vector3(0,-1.85,0),new THREE.Vector3(0,0,0),new THREE.Vector3(5.2,0,0)];
  const ends=[new THREE.Vector3(1.41,0,0),new THREE.Vector3(-1.41,0,0),new THREE.Vector3(0,.96,0),new THREE.Vector3(0,-.96,0),new THREE.Vector3(0,0,.79),new THREE.Vector3(0,0,-.79)];
  const rots=[
    new THREE.Euler(0,Math.PI/2,0),new THREE.Euler(0,-Math.PI/2,0),new THREE.Euler(-Math.PI/2,0,0),new THREE.Euler(Math.PI/2,0,0),new THREE.Euler(0,0,0),new THREE.Euler(0,Math.PI,0)
  ];
  for(let i=0;i<6;i++){
    const g=new THREE.PlaneGeometry(i<2?1.55:2.8,(i===2||i===3)?1.55:1.9),m=symbolMaterial(netTarget[i],'#ffffff'),p=new THREE.Mesh(g,m);
    p.position.copy(starts[i]);p.userData.start=starts[i].clone();p.userData.end=ends[i].clone();p.userData.rot=rots[i];scene.add(p);foldPieces.push(p);
  }
  const start=performance.now();function step(now){
    const q=Math.min(1,(now-start)/1250),e=1-Math.pow(1-q,3);
    foldPieces.forEach(p=>{p.position.lerpVectors(p.userData.start,p.userData.end,e);p.rotation.set(p.userData.rot.x*e,p.userData.rot.y*e,p.userData.rot.z*e)});
    if(q<1)requestAnimationFrame(step);else setTimeout(()=>{foldPieces.forEach(x=>scene.remove(x));foldPieces=[];netBox.visible=true},900);
  }requestAnimationFrame(step);toast('전개도의 면들이 3D 위치로 접히고 있어요.');
}

/* ---------------- 아키텍트 월드: 살아있는 복셀 샌드박스 ---------------- */
const BLOCK_DEFS={
  grass:{name:'잔디',icon:'🌱',color:0x69b85f,category:'자연',solid:true},
  dirt:{name:'흙',icon:'🟫',color:0x8b6043,category:'자연',solid:true},
  stone:{name:'돌',icon:'🪨',color:0x89919d,category:'자연',solid:true},
  sand:{name:'모래',icon:'🟨',color:0xe4c978,category:'자연',solid:true,gravity:true},
  log:{name:'원목',icon:'🪵',color:0x8c603d,category:'자연',solid:true,flammable:true},
  leaves:{name:'나뭇잎',icon:'🍃',color:0x4f9c55,category:'자연',solid:true,flammable:true,transparent:true,opacity:.82},
  sapling:{name:'묘목',icon:'🌿',color:0x55a65b,category:'자연',solid:false,special:'sapling'},
  planks:{name:'나무 판자',icon:'▤',color:0xb98554,category:'건축',solid:true,flammable:true},
  brick:{name:'벽돌',icon:'🧱',color:0xb96757,category:'건축',solid:true},
  glass:{name:'유리',icon:'◇',color:0xbdefff,category:'건축',solid:true,transparent:true,opacity:.32},
  obsidian:{name:'흑요석',icon:'◆',color:0x342c4a,category:'건축',solid:true},
  door:{name:'나무문',icon:'🚪',color:0x9a673f,category:'기능',solid:true,flammable:true,special:'door'},
  doorTop:{name:'문 윗부분',color:0x9a673f,category:'기능',solid:true,special:'doorTop',hidden:true},
  torch:{name:'횃불',icon:'🔦',color:0xf0b34e,category:'기능',solid:false,special:'torch'},
  water:{name:'물',icon:'💧',color:0x4f9fea,category:'실험',solid:false,liquid:true,transparent:true,opacity:.48},
  lava:{name:'용암',icon:'🔥',color:0xff6f35,category:'실험',solid:false,liquid:true,transparent:true,opacity:.72,emissive:true},
  fire:{name:'불',icon:'🔥',color:0xff8c38,category:'실험',solid:false,transparent:true,special:'fire'},
  bedrock:{name:'기반암',icon:'⬛',color:0x34383f,category:'자연',solid:true,unbreakable:true}
};
const PLACEABLE_TYPES=['grass','dirt','stone','sand','log','leaves','sapling','planks','brick','glass','obsidian','door','torch','water','lava','fire'];
const WORLD_HALF=16,WORLD_MIN_Y=-5,WORLD_MAX_Y=16,SEA_LEVEL=0;
const freeCubeGeo=new THREE.BoxGeometry(1,1,1);
const fluidGeo=new THREE.BoxGeometry(1,.84,1);
const doorGeo=new THREE.BoxGeometry(.14,1.92,.9);
const torchGeo=new THREE.CylinderGeometry(.065,.09,.58,7);
const saplingGeo=new THREE.ConeGeometry(.36,.82,6);
const fireGeo=new THREE.ConeGeometry(.38,.82,7);
const materialCache=new Map();
let worldData=new Map(),worldMeshMap=new Map(),worldEdits=new Map(),worldInteractables=[],freeMeshes=[];
let collectibles=[],collected=new Set(),selectedHotbarSlot=0,selectedType='grass';
let hotbarTypes=['grass','dirt','stone','sand','log','planks','glass','door','water'];
let yaw=0,pitch=0,freeVelocityY=0,onGround=true,freeKeys={},xray=false,nearRuin=false,lastFreeSave=0;
let freeFlying=false,inventoryOpen=false,freeSimAccum=0,freeSimTick=0,dayTime=.28,freeHemi=null,freeSun=null,lastChemToast=0;

function worldKey(x,y,z){return x+','+y+','+z}
function parseWorldKey(key){return key.split(',').map(Number)}
function inWorld(x,y,z){return x>=-WORLD_HALF&&x<WORLD_HALF&&z>=-WORLD_HALF&&z<WORLD_HALF&&y>=WORLD_MIN_Y&&y<=WORLD_MAX_Y}
function cloneBlockData(data){return data?JSON.parse(JSON.stringify(data)):null}
function blockDef(dataOrType){const type=typeof dataOrType==='string'?dataOrType:dataOrType?.type;return BLOCK_DEFS[type]||BLOCK_DEFS.stone}
function isTransparentData(data){const d=blockDef(data);return !!(d.transparent||d.liquid||d.special)}
function isOccluder(data){const d=blockDef(data);return !!(data&&d.solid&&!d.transparent&&!d.special)}
function materialFor(type){
  if(materialCache.has(type))return materialCache.get(type);
  const d=blockDef(type);
  const m=new THREE.MeshStandardMaterial({
    color:d.color||0xffffff,roughness:type==='glass'?.18:.86,metalness:type==='glass'?.05:0,
    transparent:!!d.transparent,opacity:d.opacity??1,depthWrite:!(d.transparent||d.liquid),
    emissive:d.emissive?(d.color||0):0x000000,emissiveIntensity:d.emissive?.45:0
  });
  materialCache.set(type,m);return m;
}
function terrainHeight(x,z){
  const dist=Math.hypot(x,z);
  let h=1.9+Math.sin(x*.31)*.9+Math.cos(z*.27)*.75+Math.sin((x+z)*.18)*.45-Math.max(0,dist-10)*.36;
  if(dist>14)h-=1.4;
  return THREE.MathUtils.clamp(Math.floor(h),-2,3);
}
function hash2(x,z){
  const v=Math.sin(x*127.1+z*311.7)*43758.5453;
  return v-Math.floor(v);
}
function setRawBlock(x,y,z,data){
  if(!inWorld(x,y,z))return false;
  if(data)worldData.set(worldKey(x,y,z),data);else worldData.delete(worldKey(x,y,z));
  return true;
}
function getBlock(x,y,z){return worldData.get(worldKey(x,y,z))||null}
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
function removeWorldMesh(key){
  const mesh=worldMeshMap.get(key);if(!mesh)return;
  scene.remove(mesh);worldMeshMap.delete(key);
  worldInteractables=worldInteractables.filter(x=>x!==mesh);
  freeMeshes=freeMeshes.filter(x=>x!==mesh);
}
function makeWorldMesh(x,y,z,data){
  const d=blockDef(data),type=data.type;
  if(d.hidden)return null;
  let mesh;
  if(type==='door'){
    mesh=new THREE.Mesh(doorGeo,materialFor('door'));
    mesh.position.set(x,y+1,z);
    const facing=(data.facing||0)*Math.PI/2;
    mesh.rotation.y=facing+(data.open?Math.PI/2:0);
  }else if(type==='torch'){
    mesh=new THREE.Mesh(torchGeo,materialFor('torch'));mesh.position.set(x,y+.34,z);
    const light=new THREE.PointLight(0xffb45e,1.25,7,2);light.position.y=.42;mesh.add(light);
  }else if(type==='sapling'){
    mesh=new THREE.Mesh(saplingGeo,materialFor('sapling'));mesh.position.set(x,y+.41,z);
  }else if(type==='fire'){
    mesh=new THREE.Mesh(fireGeo,new THREE.MeshStandardMaterial({color:0xff8c32,emissive:0xff4b18,emissiveIntensity:1.15,transparent:true,opacity:.84,roughness:.5}));
    mesh.position.set(x,y+.42,z);
    const light=new THREE.PointLight(0xff692c,1.4,6,2);light.position.y=.35;mesh.add(light);
  }else if(type==='water'||type==='lava'){
    mesh=new THREE.Mesh(fluidGeo,materialFor(type));mesh.position.set(x,y+.42,z);
  }else{
    mesh=new THREE.Mesh(freeCubeGeo,materialFor(type));mesh.position.set(x,y+.5,z);
  }
  mesh.castShadow=!(type==='water'||type==='glass'||type==='leaves'||type==='fire');
  mesh.receiveShadow=true;mesh.userData={worldBlock:true,gx:x,gy:y,gz:z,type:type};
  scene.add(mesh);worldMeshMap.set(worldKey(x,y,z),mesh);worldInteractables.push(mesh);freeMeshes.push(mesh);
  return mesh;
}
function refreshBlockMesh(x,y,z){
  const key=worldKey(x,y,z);removeWorldMesh(key);
  const data=getBlock(x,y,z);if(data&&visibleAt(x,y,z,data))makeWorldMesh(x,y,z,data);
}
function refreshAround(x,y,z){
  [[0,0,0],[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]].forEach(v=>refreshBlockMesh(x+v[0],y+v[1],z+v[2]));
}
function markEdit(x,y,z,data){worldEdits.set(worldKey(x,y,z),cloneBlockData(data))}
function setWorldBlock(x,y,z,data,record=true){
  if(!inWorld(x,y,z))return false;
  setRawBlock(x,y,z,data);if(record)markEdit(x,y,z,data);refreshAround(x,y,z);return true;
}
function removeWorldBlockData(x,y,z,record=true){
  const data=getBlock(x,y,z);if(!data||blockDef(data).unbreakable)return false;
  if(data.type==='doorTop')return removeWorldBlockData(x,y-1,z,record);
  if(data.type==='door'){
    setRawBlock(x,y,z,null);setRawBlock(x,y+1,z,null);
    if(record){markEdit(x,y,z,null);markEdit(x,y+1,z,null)}
    refreshAround(x,y,z);refreshAround(x,y+1,z);return true;
  }
  setRawBlock(x,y,z,null);if(record)markEdit(x,y,z,null);refreshAround(x,y,z);return true;
}
function rebuildAllWorldMeshes(){
  Array.from(worldMeshMap.keys()).forEach(removeWorldMesh);
  worldMeshMap=new Map();worldInteractables=[];freeMeshes=[];
  for(const [key,data] of worldData){const [x,y,z]=parseWorldKey(key);if(visibleAt(x,y,z,data))makeWorldMesh(x,y,z,data)}
}
function growTree(x,baseY,z,record){
  const height=3+(hash2(x+11,z-7)>.62?1:0);
  for(let i=0;i<height;i++){
    const d={type:'log',natural:!record};if(record)setWorldBlock(x,baseY+i,z,d,true);else setRawBlock(x,baseY+i,z,d);
  }
  const top=baseY+height-1;
  for(let dy=-1;dy<=1;dy++)for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){
    if(Math.abs(dx)+Math.abs(dz)+(dy===1?1:0)>3)continue;
    const px=x+dx,py=top+dy+1,pz=z+dz;if(!inWorld(px,py,pz)||getBlock(px,py,pz))continue;
    const d={type:'leaves',natural:!record};if(record)setWorldBlock(px,py,pz,d,true);else setRawBlock(px,py,pz,d);
  }
}
function buildFreeWorld(){
  worldData=new Map();worldMeshMap=new Map();worldEdits=new Map();
  for(let x=-WORLD_HALF;x<WORLD_HALF;x++)for(let z=-WORLD_HALF;z<WORLD_HALF;z++){
    const h=terrainHeight(x,z),dist=Math.hypot(x,z);
    for(let y=WORLD_MIN_Y;y<=h;y++){
      let type;
      if(y===WORLD_MIN_Y)type='bedrock';
      else if(y<=h-3)type='stone';
      else if(y<h)type=(h<=SEA_LEVEL?'sand':'dirt');
      else type=(h<=SEA_LEVEL||dist>12.5?'sand':'grass');
      setRawBlock(x,y,z,{type,natural:true});
    }
    if(h<SEA_LEVEL)for(let y=h+1;y<=SEA_LEVEL;y++)setRawBlock(x,y,z,{type:'water',level:4,naturalSea:true,natural:true});
  }
  for(let x=-13;x<=13;x++)for(let z=-13;z<=13;z++){
    const h=terrainHeight(x,z),dist=Math.hypot(x,z);
    if(dist<4||dist>12||x>6&&z>6)continue;
    if(getBlock(x,h,z)?.type==='grass'&&hash2(x,z)>.935)growTree(x,h+1,z,false);
  }
  const ruinY=Math.max(terrainHeight(10,10),terrainHeight(8,8))+1;
  [[8,0,8,'stone'],[8,1,8,'brick'],[8,2,8,'brick'],[12,0,8,'stone'],[12,1,8,'brick'],[12,2,8,'brick'],
   [9,2,8,'brick'],[10,2,8,'brick'],[11,2,8,'brick'],[8,0,11,'stone'],[12,0,11,'stone'],[10,0,11,'obsidian']].forEach(v=>setRawBlock(v[0],ruinY+v[1],v[2],{type:v[3],ruin:true,natural:true}));
  addCollectible('bp1',-12,terrainHeight(-12,-11)+1.0,-11,0x6f72ff,'설계도 조각');
  addCollectible('c1',13,terrainHeight(13,-12)+1.1,-12,0xffd65a,'색 결정');
  addCollectible('bp2',-14,terrainHeight(-14,12)+1.0,12,0x6f72ff,'설계도 조각');
  addCollectible('c2',14,terrainHeight(14,7)+1.1,7,0xff79a8,'색 결정');
  addCollectible('bp3',3,terrainHeight(3,-14)+1.0,-14,0x6f72ff,'설계도 조각');
  freeHemi=scene.children.find(o=>o.isHemisphereLight)||null;
  freeSun=scene.children.find(o=>o.isDirectionalLight)||null;
}
function addCollectible(id,x,y,z,color,label){
  const m=new THREE.Mesh(new THREE.OctahedronGeometry(.45),new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.42,roughness:.3}));
  m.position.set(x,y,z);m.userData={collectible:id,label,baseY:y};m.castShadow=true;scene.add(m);collectibles.push(m);
}
function initFree(){
  modeTitle('아키텍트 월드','살아있는 복셀 세계 · 탐험 · 건축 · 실험');
  setVisible('freeHud',true);$('actionSave').classList.remove('hidden');$('actionXray').classList.remove('hidden');
  cleanScene(0x9bd7ff);scene.fog=new THREE.Fog(0x9bd7ff,24,52);camera.rotation.order='YXZ';yaw=Math.PI;pitch=0;
  collectibles=[];collected=new Set();xray=false;freeVelocityY=0;onGround=true;freeFlying=false;inventoryOpen=false;freeSimAccum=0;freeSimTick=0;
  buildFreeWorld();loadFreeWorld();rebuildAllWorldMeshes();buildHotbar();buildInventory();updateFreeMission();
  const spawnZ=6,ground=getHighestSolidY(0,spawnZ,8);camera.position.set(0,ground+1+1.65,spawnZ);
  $('actionSave').onclick=()=>{saveFreeWorld();toast('아키텍트 월드를 저장했어요.')};
  $('actionXray').onclick=toggleXray;
  $('lockNotice').classList.remove('hidden');$('lockNotice').onclick=()=>{if(!inventoryOpen)canvas.requestPointerLock()};
  $('inventoryClose').onclick=()=>toggleInventory(false);
  document.querySelectorAll('[data-inv-cat]').forEach(b=>b.onclick=()=>buildInventory(b.dataset.invCat));
  showTutorial('free');
}
function blockButtonMarkup(type,index){
  const d=blockDef(type),hex='#'+(d.color||0xffffff).toString(16).padStart(6,'0');
  return '<span>'+(index||'')+'</span><i style="--swatch:'+hex+'">'+(d.icon||'')+'</i><em>'+d.name+'</em>';
}
function buildHotbar(){
  const h=$('hotbar');h.innerHTML='';
  hotbarTypes.forEach((type,i)=>{
    const b=document.createElement('button');b.className='hot-slot'+(i===selectedHotbarSlot?' active':'');
    b.innerHTML=blockButtonMarkup(type,i+1);b.title=blockDef(type).name;
    b.onclick=()=>{selectedHotbarSlot=i;selectedType=hotbarTypes[i];buildHotbar();updateFreeMission()};h.appendChild(b);
  });
  selectedType=hotbarTypes[selectedHotbarSlot]||'grass';
}
function buildInventory(category='전체'){
  const grid=$('inventoryGrid');if(!grid)return;grid.innerHTML='';
  document.querySelectorAll('[data-inv-cat]').forEach(b=>b.classList.toggle('active',b.dataset.invCat===category));
  PLACEABLE_TYPES.filter(type=>category==='전체'||blockDef(type).category===category).forEach(type=>{
    const d=blockDef(type),b=document.createElement('button');b.className='inventory-item';
    b.innerHTML='<i style="--swatch:#'+(d.color||0xffffff).toString(16).padStart(6,'0')+'">'+(d.icon||'')+'</i><b>'+d.name+'</b><small>'+d.category+'</small>';
    b.onclick=()=>{hotbarTypes[selectedHotbarSlot]=type;selectedType=type;buildHotbar();toast(d.name+'을(를) '+(selectedHotbarSlot+1)+'번 칸에 넣었어요.')};grid.appendChild(b);
  });
}
function toggleInventory(force){
  inventoryOpen=typeof force==='boolean'?force:!inventoryOpen;
  $('blockInventory').classList.toggle('hidden',!inventoryOpen);
  if(inventoryOpen){if(document.pointerLockElement===canvas)document.exitPointerLock();buildInventory('전체')}
}
function updateFreeMission(){
  const total=5,done=collected.size;$('adventureCount').textContent=done+'/'+total;$('adventureBar').style.width=(done/total*100)+'%';
  const chosen=blockDef(selectedType).name,flight=freeFlying?'비행 ON':'걷기';
  $('freeState').textContent=flight+' · '+chosen;
  $('freeHint').textContent=nearRuin?'Q 폐허 설계도 · E 인벤토리 · F 비행':'E 인벤토리 · F 비행 · R 바라보는 블록 복사 · X 구조 보기';
}
function freeCenterHit(max=6.5){
  raycaster.setFromCamera(new THREE.Vector2(0,0),camera);
  const hits=raycaster.intersectObjects(worldInteractables,false);return hits.find(h=>h.distance<=max)||null;
}
function placementTarget(hit){
  if(!hit||!hit.face)return null;
  const d=hit.object.userData,n=hit.face.normal;if(!d.worldBlock)return null;
  return {x:d.gx+Math.round(n.x),y:d.gy+Math.round(n.y),z:d.gz+Math.round(n.z)};
}
function placeFreeBlock(hit){
  if(!hit)return;
  if(hit.object.userData.type==='door'){toggleDoorAt(hit.object.userData.gx,hit.object.userData.gy,hit.object.userData.gz);return}
  const p=placementTarget(hit);if(!p||!inWorld(p.x,p.y,p.z)||getBlock(p.x,p.y,p.z))return;
  if(Math.hypot(camera.position.x-p.x,camera.position.z-p.z)<.82&&p.y>=Math.floor(camera.position.y-1.65)&&p.y<=Math.floor(camera.position.y))return;
  if(selectedType==='door'){
    if(p.y>=WORLD_MAX_Y||getBlock(p.x,p.y+1,p.z)){toast('문을 놓으려면 위쪽 두 칸이 비어 있어야 해요.');return}
    const facing=((Math.round(yaw/(Math.PI/2))%4)+4)%4;
    setWorldBlock(p.x,p.y,p.z,{type:'door',open:false,facing,playerBuilt:true},true);
    setWorldBlock(p.x,p.y+1,p.z,{type:'doorTop',baseY:p.y,playerBuilt:true},true);
  }else if(selectedType==='water'||selectedType==='lava'){
    setWorldBlock(p.x,p.y,p.z,{type:selectedType,level:4,playerBuilt:true},true);reactFluidsNear(p.x,p.y,p.z);
  }else if(selectedType==='fire'){
    setWorldBlock(p.x,p.y,p.z,{type:'fire',age:0,playerBuilt:true},true);
  }else if(selectedType==='sapling'){
    setWorldBlock(p.x,p.y,p.z,{type:'sapling',age:0,playerBuilt:true},true);
  }else setWorldBlock(p.x,p.y,p.z,{type:selectedType,playerBuilt:true},true);
  sfx('place');saveFreeWorld();
}
function breakFreeBlock(hit){
  if(!hit||!hit.object.userData.worldBlock)return;
  const {gx:x,gy:y,gz:z}=hit.object.userData,data=getBlock(x,y,z);if(!data||blockDef(data).unbreakable){toast('기반암은 부술 수 없어요.');return}
  if(removeWorldBlockData(x,y,z,true)){
    const neighborWater=[[1,0,0],[-1,0,0],[0,1,0],[0,0,1],[0,0,-1]].map(v=>getBlock(x+v[0],y+v[1],z+v[2])).find(d=>d?.type==='water');
    if(neighborWater&&!getBlock(x,y,z))setWorldBlock(x,y,z,{type:'water',level:Math.max(2,neighborWater.level||3),flow:true},true);
    sfx('break');saveFreeWorld();
  }
}
function toggleDoorAt(x,y,z){
  let data=getBlock(x,y,z);if(data?.type==='doorTop'){y-=1;data=getBlock(x,y,z)}
  if(!data||data.type!=='door')return false;
  data={...data,open:!data.open};setWorldBlock(x,y,z,data,true);refreshBlockMesh(x,y+1,z);sfx('place');toast(data.open?'문을 열었어요.':'문을 닫았어요.');return true;
}
function pickTargetBlock(){
  const hit=freeCenterHit();if(!hit)return;let type=hit.object.userData.type;
  if(type==='doorTop')type='door';if(!PLACEABLE_TYPES.includes(type))return;
  hotbarTypes[selectedHotbarSlot]=type;selectedType=type;buildHotbar();toast(blockDef(type).name+'을(를) 선택했어요.');
}
function toggleXray(){
  xray=!xray;
  for(const mesh of freeMeshes){
    if(!mesh.material||Array.isArray(mesh.material))continue;
    const type=mesh.userData.type;if(type==='water'||type==='lava'||type==='fire')continue;
    mesh.material.wireframe=xray;
  }
  $('actionXray').textContent=xray?'구조 보기 ON':'구조 보기';toast(xray?'블록의 구조선을 표시합니다.':'일반 월드 화면으로 돌아왔어요.');
}
function saveFreeWorld(){
  if(mode!=='free')return;
  const data={version:2,edits:Array.from(worldEdits.entries()),collected:Array.from(collected),hotbar:hotbarTypes,selected:selectedHotbarSlot,dayTime};
  try{if(window.KidscadeStorage?.setJson('cubeArchitectWorldSaveV2',data))lastFreeSave=performance.now()}catch(e){}
}
function loadFreeWorld(){
  worldEdits=new Map();
  try{
    const d=window.KidscadeStorage?.getJson('cubeArchitectWorldSaveV2',null);
    if(d){
      collected=new Set(d.collected||[]);hotbarTypes=Array.isArray(d.hotbar)&&d.hotbar.length===9?d.hotbar:hotbarTypes;
      selectedHotbarSlot=Math.max(0,Math.min(8,d.selected||0));dayTime=Number.isFinite(d.dayTime)?d.dayTime:.28;
      for(const [key,value] of d.edits||[]){worldEdits.set(key,value);const [x,y,z]=parseWorldKey(key);setRawBlock(x,y,z,value)}
    }else{
      const old=window.KidscadeStorage?.getJson('cubeArchitectWorldSave',null);
      if(old?.blocks){
        const map=['grass','log','stone','sand','glass','brick'];
        for(const v of old.blocks){const data={type:map[v[3]]||'planks',playerBuilt:true};setRawBlock(v[0],v[1],v[2],data);markEdit(v[0],v[1],v[2],data)}
        collected=new Set(old.collected||[]);
      }
    }
    collectibles.forEach(m=>{if(collected.has(m.userData.collectible)){scene.remove(m);m.userData.gone=true}})
  }catch(e){console.warn('[Cube Architect save]',e)}
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
  for(const [key,d] of worldData){
    if(d.type!=='sand')continue;const [x,y,z]=parseWorldKey(key);if(y<=WORLD_MIN_Y+1)continue;
    const below=getBlock(x,y-1,z);if(!below||blockDef(below).liquid||below.type==='fire')moves.push([x,y,z]);
  }
  moves.slice(0,40).forEach(([x,y,z])=>{const d=getBlock(x,y,z);if(!d||d.type!=='sand'||getBlock(x,y-1,z)&&!blockDef(getBlock(x,y-1,z)).liquid)return;removeWorldBlockData(x,y,z,true);setWorldBlock(x,y-1,z,{...d,falling:true},true)});
}
function flowInto(x,y,z,type,level){
  if(!inWorld(x,y,z)||level<=0)return false;const at=getBlock(x,y,z);
  if(at){
    if((type==='water'&&at.type==='lava')||(type==='lava'&&at.type==='water')){setWorldBlock(x,y,z,{type:level>=4&&(at.level||0)>=4?'obsidian':'stone',formedBy:'water+lava'},true);return true}
    return false;
  }
  setWorldBlock(x,y,z,{type,level,flow:true},true);reactFluidsNear(x,y,z);return true;
}
function simulateLiquids(){
  const liquids=[];
  for(const [key,d] of worldData)if((d.type==='water'||d.type==='lava')&&!d.naturalSea)liquids.push([key,d]);
  for(const [key,d] of liquids.slice(0,90)){
    const [x,y,z]=parseWorldKey(key),level=d.level||1;if(!getBlock(x,y,z))continue;
    if(!getBlock(x,y-1,z)&&y>WORLD_MIN_Y+1){flowInto(x,y-1,z,d.type,Math.max(level,2));continue}
    if(level<=1)continue;if(d.type==='lava'&&freeSimTick%2)continue;
    const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
    for(let i=0;i<dirs.length;i++){
      const v=dirs[(i+freeSimTick)%4];flowInto(x+v[0],y,z+v[1],d.type,level-1);
    }
  }
}
function hasNearbyLog(x,y,z,r=4){
  for(let dx=-r;dx<=r;dx++)for(let dy=-r;dy<=r;dy++)for(let dz=-r;dz<=r;dz++){
    if(Math.abs(dx)+Math.abs(dy)+Math.abs(dz)>r+2)continue;if(getBlock(x+dx,y+dy,z+dz)?.type==='log')return true;
  }return false;
}
function simulatePlants(){
  const dirt=[],grass=[],leaves=[],saplings=[];
  for(const [key,d] of worldData){
    if(d.type==='dirt')dirt.push(key);else if(d.type==='grass')grass.push(key);else if(d.type==='leaves')leaves.push(key);else if(d.type==='sapling')saplings.push(key);
  }
  grass.slice(0,80).forEach(key=>{const [x,y,z]=parseWorldKey(key),above=getBlock(x,y+1,z);if(above&&isOccluder(above)&&hash2(x+freeSimTick,z)<.08)setWorldBlock(x,y,z,{type:'dirt',natural:true},true)});
  for(let i=0;i<Math.min(18,dirt.length);i++){
    const key=dirt[(i*13+freeSimTick*7)%dirt.length],[x,y,z]=parseWorldKey(key);if(getBlock(x,y+1,z))continue;
    const near=[[1,0],[-1,0],[0,1],[0,-1]].some(v=>getBlock(x+v[0],y,z+v[1])?.type==='grass');
    if(near&&hash2(x+freeSimTick*.1,z-freeSimTick*.2)>.72)setWorldBlock(x,y,z,{type:'grass',natural:true},true);
  }
  for(const key of leaves.slice(0,50)){
    const [x,y,z]=parseWorldKey(key),d=getBlock(x,y,z);if(!d)continue;
    if(hasNearbyLog(x,y,z)){d.decay=0;continue}d.decay=(d.decay||0)+1;if(d.decay>5&&hash2(x+freeSimTick,z)>.48)removeWorldBlockData(x,y,z,true);
  }
  for(const key of saplings){
    const [x,y,z]=parseWorldKey(key),d=getBlock(x,y,z);if(!d)continue;d.age=(d.age||0)+1;
    if(d.age>26&&!getBlock(x,y+1,z)&&!getBlock(x,y+2,z)&&!getBlock(x,y+3,z)){removeWorldBlockData(x,y,z,true);growTree(x,y,z,true);toast('묘목이 나무로 자랐어요.')}
  }
}
function simulateFire(){
  const fires=[];for(const [key,d] of worldData)if(d.type==='fire')fires.push(key);
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
  dayTime=(dayTime+dt/150)%1;
  const sun=Math.max(.08,Math.sin(dayTime*Math.PI*2-Math.PI/2)*.5+.5),night=1-sun;
  const sky=new THREE.Color().setRGB(.10+.50*sun,.16+.62*sun,.28+.68*sun);
  scene.background.copy(sky);if(scene.fog)scene.fog.color.copy(sky);
  if(freeHemi)freeHemi.intensity=.28+1.15*sun;if(freeSun)freeSun.intensity=.12+1.25*sun;
  renderer.toneMappingExposure=.62+.48*sun;
  $('worldClock').textContent=dayTime<.2?'새벽':dayTime<.45?'아침':dayTime<.7?'낮':dayTime<.82?'저녁':'밤';
}
function checkCollectibles(t){
  collectibles.forEach(m=>{if(m.userData.gone)return;m.rotation.y+=.02;m.position.y=m.userData.baseY+Math.sin(t*.002+m.position.x)*.12;
    if(camera.position.distanceTo(m.position)<1.35){m.userData.gone=true;scene.remove(m);collected.add(m.userData.collectible);
      toast(m.userData.label+' 발견!');sfx('good');updateFreeMission();saveFreeWorld();
      if(collected.size===5){toast('섬의 탐험 목표를 모두 찾았어요!');reportResult('free',100,true)}
    }
  });
  nearRuin=Math.hypot(camera.position.x-10,camera.position.z-9.5)<3.3;updateFreeMission();
}
function blockCoordFromWorld(v){return Math.floor(v+.5)}
function playerCollidesAt(px,eyeY,pz){
  const r=.27,feet=eyeY-1.62;
  for(const ox of [-r,r])for(const oz of [-r,r])for(const sy of [feet+.08,feet+.82,eyeY-.12]){
    const x=blockCoordFromWorld(px+ox),y=Math.floor(sy),z=blockCoordFromWorld(pz+oz);
    if(isSolidData(getBlock(x,y,z),x,y,z))return true;
  }return false;
}
function groundTopBelow(px,eyeY,pz){
  const x=blockCoordFromWorld(px),z=blockCoordFromWorld(pz),feet=eyeY-1.62;
  for(let y=Math.min(WORLD_MAX_Y,Math.floor(feet+.15));y>=WORLD_MIN_Y;y--)if(isSolidData(getBlock(x,y,z),x,y,z))return y+1;
  return WORLD_MIN_Y+1;
}
function moveFreeHorizontal(dx,dz){
  if(!dx&&!dz)return;
  let nx=camera.position.x+dx;
  if(!playerCollidesAt(nx,camera.position.y,camera.position.z))camera.position.x=nx;
  else if(onGround&&!playerCollidesAt(nx,camera.position.y+1,camera.position.z)){camera.position.y+=1;camera.position.x=nx}
  let nz=camera.position.z+dz;
  if(!playerCollidesAt(camera.position.x,camera.position.y,nz))camera.position.z=nz;
  else if(onGround&&!playerCollidesAt(camera.position.x,camera.position.y+1,nz)){camera.position.y+=1;camera.position.z=nz}
}
function updateFree(dt,t){
  updateDayNight(dt);freeSimAccum+=dt;if(freeSimAccum>.48){freeSimAccum=0;simulateWorld()}
  if(inventoryOpen){checkCollectibles(t);return}
  const speed=(freeKeys.ControlLeft||freeKeys.ControlRight)?6.6:4.0;
  const forward=new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw)),right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw)),move=new THREE.Vector3();
  if(freeKeys.KeyW||freeKeys.ArrowUp)move.addScaledVector(forward,-1);
  if(freeKeys.KeyS||freeKeys.ArrowDown)move.add(forward);
  if(freeKeys.KeyA||freeKeys.ArrowLeft)move.addScaledVector(right,-1);
  if(freeKeys.KeyD||freeKeys.ArrowRight)move.add(right);
  if(move.lengthSq()>0)move.normalize().multiplyScalar(speed*dt);
  if(freeFlying){
    camera.position.add(move);if(freeKeys.Space)camera.position.y+=speed*dt;if(freeKeys.ShiftLeft||freeKeys.ShiftRight)camera.position.y-=speed*dt;
    freeVelocityY=0;onGround=false;
  }else{
    moveFreeHorizontal(move.x,move.z);freeVelocityY-=14*dt;let nextY=camera.position.y+freeVelocityY*dt;
    if(freeVelocityY<=0){
      const ground=groundTopBelow(camera.position.x,nextY,camera.position.z);
      if(nextY-1.62<=ground){nextY=ground+1.62;freeVelocityY=0;onGround=true}else onGround=false;
    }else if(playerCollidesAt(camera.position.x,nextY,camera.position.z)){freeVelocityY=0;nextY=camera.position.y}
    camera.position.y=nextY;
  }
  camera.position.x=THREE.MathUtils.clamp(camera.position.x,-WORLD_HALF+.7,WORLD_HALF-.7);
  camera.position.z=THREE.MathUtils.clamp(camera.position.z,-WORLD_HALF+.7,WORLD_HALF-.7);
  camera.position.y=THREE.MathUtils.clamp(camera.position.y,WORLD_MIN_Y+1.7,WORLD_MAX_Y+8);
  camera.rotation.y=yaw;camera.rotation.x=pitch;checkCollectibles(t);
}


/* ---------------- 공통 입력 / 안내 ---------------- */
function showTutorial(kind){
  const once='cubeArchitectTutorial_'+kind+(kind==='free'?'_v2':'');try{if(localStorage.getItem(once))return}catch(_){};
  let html='';
  if(kind==='challenge')html='<h2>설계도 챌린지 · 크리에이티브 비행</h2><p>겨냥도를 보며 플레이어가 직접 날아다니고 블록을 설치해 건축하세요. 건물의 위치는 채점하지 않습니다.</p><div class="keys"><div class="keyrow"><b>WASD + 마우스</b>날아다니며 보기</div><div class="keyrow"><b>Space / Shift</b>위로 / 아래로</div><div class="keyrow"><b>좌 / 우클릭</b>파괴 / 설치</div><div class="keyrow"><b>C / H / N</b>검사 / 힌트 / 다음</div></div>';
  if(kind==='net')html='<h2>전개도 연구실</h2><p>전개도 여섯 면의 그림이 흰 직육면체의 어느 면으로 오는지 생각해 보세요.</p><div class="keys"><div class="keyrow"><b>그림 선택</b>붙일 그림 고르기</div><div class="keyrow"><b>면 클릭</b>그림 붙이기</div><div class="keyrow"><b>드래그</b>직육면체 돌리기</div><div class="keyrow"><b>접어 보기</b>3D 위치 확인</div></div>';
  if(kind==='free')html='<h2>아키텍트 월드 · 살아있는 복셀 세계</h2><p>땅과 나무도 모두 블록입니다. 직접 파고, 짓고, 물·용암·불·모래와 식물의 변화를 실험해 보세요.</p><div class="keys"><div class="keyrow"><b>WASD / Space</b>이동 / 점프</div><div class="keyrow"><b>좌 / 우클릭</b>블록 파괴 / 설치·문 열기</div><div class="keyrow"><b>1~9 / E</b>핫바 선택 / 인벤토리</div><div class="keyrow"><b>F / R / X</b>비행 / 블록 복사 / 구조 보기</div><div class="keyrow"><b>물 + 용암</b>돌·흑요석 생성</div><div class="keyrow"><b>불 + 나무</b>연소와 확산</div></div>';
  $('tutorialBody').innerHTML=html;$('tutorial').classList.remove('hidden');$('tutorialClose').onclick=()=>{$('tutorial').classList.add('hidden');try{localStorage.setItem(once,'1')}catch(_){}};
}
window.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('pointerdown',e=>{pointerDown={x:e.clientX,y:e.clientY,button:e.button};pointerDragged=false});
canvas.addEventListener('pointermove',e=>{
  if(pointerDown&&(Math.abs(e.clientX-pointerDown.x)>5||Math.abs(e.clientY-pointerDown.y)>5))pointerDragged=true;
});
canvas.addEventListener('pointerup',e=>{
  if(pointerDragged){pointerDown=null;return}
  if(mode==='net'&&e.button===0){assignNetFace(netHit(e))}
  pointerDown=null;
});
canvas.addEventListener('mousedown',e=>{
  if(document.pointerLockElement!==canvas)return;
  if(mode==='challenge'){
    const hit=challengeCenterHit(8);
    if(e.button===0&&hit&&hit.object.userData.challenge)removeChallengeBlock(hit.object);
    if(e.button===2){const p=challengePlaceTarget(hit);if(p)addChallengeBlock(p.x,p.y,p.z)}
    updateChallengeStats();updateChallengeGhost();return;
  }
  if(mode==='free'){const hit=freeCenterHit(6);if(e.button===0)breakFreeBlock(hit);if(e.button===2)placeFreeBlock(hit)}
});
canvas.addEventListener('click',()=>{if((mode==='free'||mode==='challenge')&&document.pointerLockElement!==canvas&&$('tutorial').classList.contains('hidden')&&!(mode==='free'&&inventoryOpen))canvas.requestPointerLock()});
document.addEventListener('pointerlockchange',()=>{
  if(mode==='free')$('lockNotice').classList.toggle('hidden',inventoryOpen||document.pointerLockElement===canvas);
  if(mode==='challenge')$('challengeLockNotice').classList.toggle('hidden',document.pointerLockElement===canvas);
});
document.addEventListener('mousemove',e=>{
  if(document.pointerLockElement!==canvas)return;
  if(mode==='challenge'){challengeYaw-=e.movementX*.0023;challengePitch-=e.movementY*.0023;challengePitch=THREE.MathUtils.clamp(challengePitch,-1.45,1.45);updateChallengeCamera();return}
  if(mode==='free'){yaw-=e.movementX*.0023;pitch-=e.movementY*.0023;pitch=THREE.MathUtils.clamp(pitch,-1.35,1.35)}
});
document.addEventListener('keydown',e=>{
  if(mode==='challenge'){
    challengeKeys[e.code]=true;
    if(e.code==='Space'||e.code==='ShiftLeft'||e.code==='ShiftRight')e.preventDefault();
    if(e.code==='KeyC')checkChallenge();
    if(e.code==='KeyH')toast(challengeMissions[missionIndex].tip);
    if(e.code==='KeyN'){missionIndex=(missionIndex+1)%challengeMissions.length;clearChallenge();drawBlueprint()}
    return;
  }
  if(mode!=='free')return;
  if(e.code==='KeyE'){e.preventDefault();toggleInventory();return}
  if(e.code==='Escape'&&inventoryOpen){toggleInventory(false);return}
  if(inventoryOpen)return;
  freeKeys[e.code]=true;
  if(e.code==='Space'&&!freeFlying&&onGround){freeVelocityY=5.2;onGround=false;e.preventDefault()}
  if(/^Digit[1-9]$/.test(e.code)){
    selectedHotbarSlot=Number(e.code.slice(-1))-1;selectedType=hotbarTypes[selectedHotbarSlot];buildHotbar();updateFreeMission();
  }
  if(e.code==='KeyF'){freeFlying=!freeFlying;freeVelocityY=0;toast(freeFlying?'크리에이티브 비행 ON · Space 상승 / Shift 하강':'비행 OFF · 다시 지면의 물리를 따릅니다.');updateFreeMission()}
  if(e.code==='KeyR')pickTargetBlock();
  if(e.code==='KeyX')toggleXray();
  if(e.code==='KeyQ'&&nearRuin){toast('폐허에서 발견한 겨냥도를 복원해 보세요.');missionIndex=3;setTimeout(()=>enterMode('challenge'),450)}
});
document.addEventListener('keyup',e=>{challengeKeys[e.code]=false;freeKeys[e.code]=false});
function reportResult(kind,score,cleared){
  try{parent.postMessage({type:'kidscade-result',game:'큐브 아키텍트',mode:kind,score:score,cleared:cleared},'*')}catch(e){}
}
function resize(){
  const w=innerWidth,h=innerHeight;if(renderer)renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
}
window.addEventListener('resize',resize);
let last=performance.now();
function animate(now){
  requestAnimationFrame(animate);const dt=Math.min(.04,(now-last)/1000);last=now;if(orbit)orbit.update();if(mode==='challenge')updateChallengeFly(dt);if(mode==='free')updateFree(dt,now);if(renderer)renderer.render(scene,camera);
}
window.CubeArchitectReady=true;
window.CubeArchitect={enterMode,showHome};

})();


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
  ['challengePanel','netPanel','freeHud','resultCard','tutorial'].forEach(id=>setVisible(id,false));
  $('topbar').classList.add('hidden');
  $('homeScreen').classList.add('hidden');
  $('actionCheck').classList.add('hidden');
  $('actionNext').classList.add('hidden');
  $('actionSave').classList.add('hidden');
  $('actionXray').classList.add('hidden');
}
function showHome(){
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
let challengeBlocks=new Map(),challengeMeshes=[],challengePlane=null,challengeGhost=null,targetGhosts=[],missionIndex=0;
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
  if(x<0||x>5||z<0||z>5||y<0||y>4)return false;
  const key=challengeKey(x,y,z);if(challengeBlocks.has(key))return false;
  if(y>0&&!challengeBlocks.has(challengeKey(x,y-1,z))){if(!quiet)toast('공중에는 바로 놓을 수 없어요. 아래 블록부터 쌓아보세요.');return false}
  const mesh=new THREE.Mesh(blockGeo,challengeMat.clone());mesh.position.set(x-2.5,y+.5,z-2.5);mesh.castShadow=true;mesh.receiveShadow=true;
  mesh.userData={cx:x,cy:y,cz:z,challenge:true};const line=new THREE.LineSegments(edgeGeo,new THREE.LineBasicMaterial({color:0x8b633c,transparent:true,opacity:.6}));mesh.add(line);
  scene.add(mesh);challengeBlocks.set(key,mesh);challengeMeshes.push(mesh);if(!quiet)sfx('place');return true;
}
function removeChallengeBlock(mesh){
  const d=mesh.userData;
  if(challengeBlocks.has(challengeKey(d.cx,d.cy+1,d.cz))){toast('위에 있는 블록부터 치워야 해요.');return}
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
  modeTitle('설계도 챌린지','겨냥도 → 3D 건축');
  setVisible('challengePanel',true);$('actionCheck').classList.remove('hidden');$('actionNext').classList.remove('hidden');
  cleanScene(0xeaf6ff);camera.position.set(7,6.5,8);camera.lookAt(0,1.5,0);makeOrbit(new THREE.Vector3(0,1.4,0));
  const planeMat=new THREE.MeshBasicMaterial({transparent:true,opacity:0,side:THREE.DoubleSide});
  challengePlane=new THREE.Mesh(new THREE.PlaneGeometry(6,6),planeMat);challengePlane.rotation.x=-Math.PI/2;challengePlane.position.y=.001;challengePlane.userData.base=true;scene.add(challengePlane);
  const grid=new THREE.GridHelper(6,6,0x5c6fb0,0xb7cbe1);grid.position.y=.01;scene.add(grid);
  challengeGhost=new THREE.Mesh(blockGeo,new THREE.MeshBasicMaterial({color:0x5a67f2,transparent:true,opacity:.28}));challengeGhost.visible=false;scene.add(challengeGhost);
  challengeBlocks=new Map();challengeMeshes=[];targetGhosts=[];drawBlueprint();updateChallengeStats();
  $('actionCheck').onclick=checkChallenge;$('actionNext').onclick=()=>{missionIndex=(missionIndex+1)%challengeMissions.length;clearChallenge();drawBlueprint()};
  $('clearChallenge').onclick=clearChallenge;$('hintChallenge').onclick=()=>toast(challengeMissions[missionIndex].tip);
  showTutorial('challenge');
}
function challengeHit(ev){
  const rect=canvas.getBoundingClientRect();mouse.x=((ev.clientX-rect.left)/rect.width)*2-1;mouse.y=-((ev.clientY-rect.top)/rect.height)*2+1;
  raycaster.setFromCamera(mouse,camera);return raycaster.intersectObjects(challengeMeshes.concat([challengePlane]),false)[0]||null;
}
function challengePlaceTarget(hit){
  if(!hit)return null;
  if(hit.object===challengePlane){
    return {x:Math.floor(hit.point.x+3),y:0,z:Math.floor(hit.point.z+3)};
  }
  const d=hit.object.userData,n=hit.face.normal;return {x:d.cx+Math.round(n.x),y:d.cy+Math.round(n.y),z:d.cz+Math.round(n.z)};
}
function clearTargetGhosts(){targetGhosts.forEach(m=>scene.remove(m));targetGhosts=[]}
function checkChallenge(){
  clearTargetGhosts();
  const targetSet=new Set(challengeMissions[missionIndex].blocks.map(v=>challengeKey(v[0],v[1],v[2])));
  const userSet=new Set(challengeBlocks.keys());let common=0;userSet.forEach(k=>{if(targetSet.has(k))common++});
  const union=new Set([...targetSet,...userSet]).size;const score=union?Math.round(common/union*100):0;
  challengeMeshes.forEach(m=>{const k=challengeKey(m.userData.cx,m.userData.cy,m.userData.cz);m.material.color.set(targetSet.has(k)?0x56bd91:0xf08a80)});
  targetSet.forEach(k=>{if(userSet.has(k))return;const a=k.split(',').map(Number),g=new THREE.Mesh(blockGeo,new THREE.MeshBasicMaterial({color:0x5a67f2,wireframe:true,transparent:true,opacity:.8}));g.position.set(a[0]-2.5,a[1]+.5,a[2]-2.5);scene.add(g);targetGhosts.push(g)});
  const missing=targetSet.size-common,extra=userSet.size-common;$('resultCard').classList.remove('hidden');$('resultScore').textContent=score+'%';
  $('resultText').innerHTML='같은 위치 <b>'+common+'</b>개 · 더 필요한 블록 <b>'+missing+'</b>개 · 다른 위치 블록 <b>'+extra+'</b>개<br>파란 선은 아직 필요한 위치예요.';
  if(score===100){toast('설계도 완벽 복원! 다음 설계도로 가도 좋아요.');sfx('good');reportResult('challenge',100,true)}
  else{toast('정답을 겹쳐 봤어요. 다른 부분을 고쳐보세요.');sfx('bad')}
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

/* ---------------- 자유 건축 월드 ---------------- */
const freeMaterials=[
  {name:'잔디',color:0x6fbd63},{name:'나무',color:0xa97449},{name:'돌',color:0x8e98a7},
  {name:'모래',color:0xe7ca79},{name:'하늘',color:0x66b7e8},{name:'분홍',color:0xe889aa}
];
const freeCubeGeo=new THREE.BoxGeometry(1,1,1);
let freeBlocks=new Map(),freeMeshes=[],worldInteractables=[],collectibles=[],collected=new Set(),unlocked=3,selectedMaterial=0;
let yaw=0,pitch=0,freeVelocityY=0,onGround=true,freeKeys={},xray=false,nearRuin=false,lastFreeSave=0;
function worldKey(x,y,z){return x+','+y+','+z}
function freeMat(i){return new THREE.MeshStandardMaterial({color:freeMaterials[i].color,roughness:.86,transparent:true,opacity:1})}
function addFreeBlock(x,y,z,matIndex,opts){
  const key=worldKey(x,y,z);if(freeBlocks.has(key)&&!(opts&&opts.scenery))return null;
  const mesh=new THREE.Mesh(freeCubeGeo,freeMat(matIndex));mesh.position.set(x,y+.5,z);mesh.castShadow=true;mesh.receiveShadow=true;
  mesh.userData={gx:x,gy:y,gz:z,matIndex:matIndex,playerBuilt:!!(opts&&opts.playerBuilt),breakable:!!(opts&&opts.breakable),scenery:!!(opts&&opts.scenery)};
  scene.add(mesh);worldInteractables.push(mesh);
  if(mesh.userData.playerBuilt){freeBlocks.set(key,mesh);freeMeshes.push(mesh)}
  return mesh;
}
function initFree(){
  modeTitle('아키텍트 월드','탐험 · 수집 · 자유 건축');
  setVisible('freeHud',true);$('actionSave').classList.remove('hidden');$('actionXray').classList.remove('hidden');
  cleanScene(0x9bd7ff);scene.fog=new THREE.Fog(0x9bd7ff,26,58);camera.position.set(0,1.65,7);camera.rotation.order='YXZ';yaw=Math.PI;pitch=0;
  freeBlocks=new Map();freeMeshes=[];worldInteractables=[];collectibles=[];collected=new Set();unlocked=3;xray=false;freeVelocityY=0;onGround=true;
  buildFreeWorld();loadFreeWorld();buildHotbar();updateFreeMission();
  $('actionSave').onclick=()=>{saveFreeWorld();toast('아키텍트 월드를 저장했어요.')};
  $('actionXray').onclick=toggleXray;
  $('lockNotice').classList.remove('hidden');$('lockNotice').onclick=()=>canvas.requestPointerLock();
  showTutorial('free');
}
function buildFreeWorld(){
  const groundMat=new THREE.MeshStandardMaterial({color:0x72b963,roughness:1});
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(44,44,22,22),groundMat);ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;ground.userData.ground=true;scene.add(ground);worldInteractables.push(ground);
  const sand=new THREE.Mesh(new THREE.PlaneGeometry(13,12),new THREE.MeshStandardMaterial({color:0xe5c778,roughness:1}));sand.rotation.x=-Math.PI/2;sand.position.set(13,.012,-11);scene.add(sand);
  const stone=new THREE.Mesh(new THREE.PlaneGeometry(11,10),new THREE.MeshStandardMaterial({color:0x9aa3ab,roughness:1}));stone.rotation.x=-Math.PI/2;stone.position.set(-14,.014,12);scene.add(stone);
  const grid=new THREE.GridHelper(44,44,0xffffff,0xffffff);grid.material.opacity=.11;grid.material.transparent=true;grid.position.y=.02;scene.add(grid);
  const trunkMat=new THREE.MeshStandardMaterial({color:0x8f633f,roughness:1}),leafMat=new THREE.MeshStandardMaterial({color:0x4f9a55,roughness:1});
  [[-10,-8],[-14,-4],[-8,-14],[11,9],[15,6],[8,14]].forEach(p=>{
    const tr=new THREE.Mesh(new THREE.BoxGeometry(.75,2.6,.75),trunkMat);tr.position.set(p[0],1.3,p[1]);scene.add(tr);
    for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){if(Math.abs(dx)+Math.abs(dz)>1)continue;const l=new THREE.Mesh(new THREE.BoxGeometry(1.4,1.2,1.4),leafMat);l.position.set(p[0]+dx*.8,3,p[1]+dz*.8);scene.add(l)}
  });
  const ruinMat=new THREE.MeshStandardMaterial({color:0xb9b0a1,roughness:.95});
  [[8,0,8],[8,1,8],[8,2,8],[12,0,8],[12,1,8],[12,2,8],[9,2,8],[10,2,8],[11,2,8],[8,0,11],[12,0,11]].forEach(v=>{const m=new THREE.Mesh(freeCubeGeo,ruinMat);m.position.set(v[0],v[1]+.5,v[2]);m.castShadow=true;m.receiveShadow=true;m.userData.ruin=true;scene.add(m)});
  const sign=new THREE.Mesh(new THREE.BoxGeometry(2.8,1.3,.2),new THREE.MeshStandardMaterial({color:0x5a4635}));sign.position.set(10,1.6,8.6);scene.add(sign);
  addCollectible('bp1',-12,.7,-11,0x6f72ff,'설계도 조각');
  addCollectible('c1',13,.8,-12,0xffd65a,'색 결정');
  addCollectible('bp2',-15,.7,13,0x6f72ff,'설계도 조각');
  addCollectible('c2',15,.8,8,0xff79a8,'색 결정');
  addCollectible('bp3',3,.7,-16,0x6f72ff,'설계도 조각');
}
function addCollectible(id,x,y,z,color,label){
  const m=new THREE.Mesh(new THREE.OctahedronGeometry(.48),new THREE.MeshStandardMaterial({color:color,emissive:color,emissiveIntensity:.4,roughness:.35}));
  m.position.set(x,y,z);m.userData={collectible:id,label:label,baseY:y};m.castShadow=true;scene.add(m);collectibles.push(m);
}
function buildHotbar(){
  const h=$('hotbar');h.innerHTML='';
  freeMaterials.forEach((m,i)=>{const b=document.createElement('button');b.className='hot-slot'+(i===selectedMaterial?' active':'');b.style.setProperty('--swatch','#'+m.color.toString(16).padStart(6,'0'));
    b.innerHTML='<span>'+(i+1)+'</span><i></i>';b.title=i<unlocked?m.name:m.name+' (탐험해서 해금)';
    b.onclick=()=>{if(i>=unlocked){toast('색 결정을 찾아 이 재료를 해금해 보세요.');return}selectedMaterial=i;buildHotbar()};h.appendChild(b)});
}
function updateFreeMission(){
  const total=5,done=collected.size;$('adventureCount').textContent=done+'/'+total;$('adventureBar').style.width=(done/total*100)+'%';
  $('freeHint').textContent=nearRuin?'E : 폐허의 설계도 챌린지 열기':'좌클릭 파괴 · 우클릭 설치 · R 색칠 · X 구조 보기';
}
function freeCenterHit(max){
  raycaster.setFromCamera(new THREE.Vector2(0,0),camera);const hits=raycaster.intersectObjects(worldInteractables,false);return hits.find(h=>h.distance<=(max||6))||null;
}
function placeFreeBlock(hit){
  if(!hit)return;
  let x,y,z;
  if(hit.object.userData.ground){x=Math.round(hit.point.x);z=Math.round(hit.point.z);y=0}
  else{
    const d=hit.object.userData,n=hit.face&&hit.face.normal;if(d.gx===undefined||!n)return;
    x=d.gx+Math.round(n.x);y=d.gy+Math.round(n.y);z=d.gz+Math.round(n.z);
  }
  if(Math.abs(x)>21||Math.abs(z)>21||y<0||y>12)return;
  if(Math.hypot(camera.position.x-x,camera.position.z-z)<1.1&&y<2){toast('내가 서 있는 자리에는 놓을 수 없어요.');return}
  if(addFreeBlock(x,y,z,selectedMaterial,{playerBuilt:true,breakable:true})){sfx('place');saveFreeWorld()}
}
function breakFreeBlock(hit){
  if(!hit||!hit.object.userData.playerBuilt)return;const d=hit.object.userData,k=worldKey(d.gx,d.gy,d.gz);
  scene.remove(hit.object);worldInteractables=worldInteractables.filter(x=>x!==hit.object);freeMeshes=freeMeshes.filter(x=>x!==hit.object);freeBlocks.delete(k);sfx('break');saveFreeWorld();
}
function paintTarget(){
  if(mode!=='free')return;const hit=freeCenterHit(6);if(!hit||!hit.object.userData.playerBuilt){toast('색칠할 내가 만든 블록을 바라보세요.');return}
  const m=hit.object;const d=m.userData;m.material.dispose();m.material=freeMat(selectedMaterial);d.matIndex=selectedMaterial;sfx('place');saveFreeWorld();toast(freeMaterials[selectedMaterial].name+' 색으로 칠했어요.');
}
function toggleXray(){
  xray=!xray;freeMeshes.forEach(m=>{m.material.wireframe=xray;m.material.opacity=xray?.35:1;m.material.transparent=xray});
  $('actionXray').textContent=xray?'구조 보기 ON':'구조 보기';toast(xray?'장식을 숨기고 블록 구조를 살펴봅니다.':'일반 건축 화면으로 돌아왔어요.');
}
function saveFreeWorld(){
  if(mode!=='free')return;
  const data={blocks:freeMeshes.map(m=>[m.userData.gx,m.userData.gy,m.userData.gz,m.userData.matIndex]),collected:Array.from(collected),unlocked:unlocked};
  try{if(window.KidscadeStorage?.setJson('cubeArchitectWorldSave',data))lastFreeSave=performance.now()}catch(e){}
}
function loadFreeWorld(){
  try{
    let d=window.KidscadeStorage?.getJson('cubeArchitectWorldSave',null);
    if(!d){
      const legacyKey='cubeArchitect'+'WorldV1';const legacyRaw=localStorage.getItem(legacyKey);
      if(legacyRaw){
        d=JSON.parse(legacyRaw);
        window.KidscadeStorage?.setJson('cubeArchitectWorldSave',d);
        localStorage.removeItem(legacyKey);
      }
    }
    if(!d)return;
    unlocked=Math.max(3,Math.min(6,d.unlocked||3));collected=new Set(d.collected||[]);
    (d.blocks||[]).forEach(v=>addFreeBlock(v[0],v[1],v[2],v[3],{playerBuilt:true,breakable:true}));
    collectibles.forEach(m=>{if(collected.has(m.userData.collectible)){scene.remove(m);m.userData.gone=true}})
  }catch(e){}
}
function checkCollectibles(t){
  collectibles.forEach(m=>{if(m.userData.gone)return;m.rotation.y+=.02;m.position.y=m.userData.baseY+Math.sin(t*.002+m.position.x)*.12;
    if(camera.position.distanceTo(m.position)<1.35){m.userData.gone=true;scene.remove(m);collected.add(m.userData.collectible);
      if(m.userData.collectible[0]==='c'){unlocked=Math.min(6,unlocked+1);buildHotbar();toast('색 결정 발견! 새 건축 재료가 열렸어요.')}
      else toast('설계도 조각 발견! 건축학교의 새로운 아이디어를 얻었어요.');
      sfx('good');updateFreeMission();saveFreeWorld();
      if(collected.size===5){toast('탐험 목표 완료! 이제 마음껏 건축하거나 폐허 미션에 도전하세요.');reportResult('free',100,true)}
    }
  });
  nearRuin=Math.hypot(camera.position.x-10,camera.position.z-9.5)<3.3;updateFreeMission();
}
function updateFree(dt,t){
  const speed=freeKeys.ShiftLeft||freeKeys.ShiftRight?6.2:3.8;
  const forward=new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw)),right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw)),move=new THREE.Vector3();
  if(freeKeys.KeyW||freeKeys.ArrowUp)move.addScaledVector(forward,-1);
  if(freeKeys.KeyS||freeKeys.ArrowDown)move.add(forward);
  if(freeKeys.KeyA||freeKeys.ArrowLeft)move.addScaledVector(right,-1);
  if(freeKeys.KeyD||freeKeys.ArrowRight)move.add(right);
  if(move.lengthSq()>0){move.normalize().multiplyScalar(speed*dt);camera.position.add(move)}
  camera.position.x=THREE.MathUtils.clamp(camera.position.x,-21,21);camera.position.z=THREE.MathUtils.clamp(camera.position.z,-21,21);
  freeVelocityY-=13*dt;camera.position.y+=freeVelocityY*dt;if(camera.position.y<=1.65){camera.position.y=1.65;freeVelocityY=0;onGround=true}
  camera.rotation.y=yaw;camera.rotation.x=pitch;checkCollectibles(t);
}

/* ---------------- 공통 입력 / 안내 ---------------- */
function showTutorial(kind){
  const once='cubeArchitectTutorial_'+kind;try{if(localStorage.getItem(once))return}catch(_){};
  let html='';
  if(kind==='challenge')html='<h2>설계도 챌린지</h2><p>왼쪽 겨냥도를 관찰하고 오른쪽 3D 공간에 블록을 쌓아 최대한 닮게 만들어 보세요.</p><div class="keys"><div class="keyrow"><b>좌클릭</b>블록 놓기</div><div class="keyrow"><b>우클릭</b>블록 치우기</div><div class="keyrow"><b>드래그</b>건축물 돌려보기</div><div class="keyrow"><b>검사</b>정답과 겹쳐보기</div></div>';
  if(kind==='net')html='<h2>전개도 연구실</h2><p>전개도 여섯 면의 그림이 흰 직육면체의 어느 면으로 오는지 생각해 보세요.</p><div class="keys"><div class="keyrow"><b>그림 선택</b>붙일 그림 고르기</div><div class="keyrow"><b>면 클릭</b>그림 붙이기</div><div class="keyrow"><b>드래그</b>직육면체 돌리기</div><div class="keyrow"><b>접어 보기</b>3D 위치 확인</div></div>';
  if(kind==='free')html='<h2>아키텍트 월드</h2><p>작은 큐브 섬을 탐험하고 재료를 발견하면서 자유롭게 건축하세요. 수학 미션은 선택입니다.</p><div class="keys"><div class="keyrow"><b>WASD</b>걷기</div><div class="keyrow"><b>Space</b>점프</div><div class="keyrow"><b>좌/우클릭</b>파괴 / 설치</div><div class="keyrow"><b>1~6 / R / X</b>재료 / 색칠 / 구조 보기</div></div>';
  $('tutorialBody').innerHTML=html;$('tutorial').classList.remove('hidden');$('tutorialClose').onclick=()=>{$('tutorial').classList.add('hidden');try{localStorage.setItem(once,'1')}catch(_){}};
}
window.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('pointerdown',e=>{pointerDown={x:e.clientX,y:e.clientY,button:e.button};pointerDragged=false});
canvas.addEventListener('pointermove',e=>{
  if(pointerDown&&(Math.abs(e.clientX-pointerDown.x)>5||Math.abs(e.clientY-pointerDown.y)>5))pointerDragged=true;
  if(mode==='challenge'&&challengeGhost){
    const h=challengeHit(e),p=challengePlaceTarget(h);if(p&&p.x>=0&&p.x<=5&&p.z>=0&&p.z<=5&&p.y>=0&&p.y<=4){challengeGhost.position.set(p.x-2.5,p.y+.5,p.z-2.5);challengeGhost.visible=true}else challengeGhost.visible=false;
  }
});
canvas.addEventListener('pointerup',e=>{
  if(pointerDragged){pointerDown=null;return}
  if(mode==='challenge'){const h=challengeHit(e);if(e.button===2&&h&&h.object.userData.challenge)removeChallengeBlock(h.object);else if(e.button===0){const p=challengePlaceTarget(h);if(p)addChallengeBlock(p.x,p.y,p.z)}updateChallengeStats()}
  else if(mode==='net'&&e.button===0){assignNetFace(netHit(e))}
  pointerDown=null;
});
canvas.addEventListener('mousedown',e=>{
  if(mode!=='free'||document.pointerLockElement!==canvas)return;const hit=freeCenterHit(6);if(e.button===0)breakFreeBlock(hit);if(e.button===2)placeFreeBlock(hit);
});
canvas.addEventListener('click',()=>{if(mode==='free'&&document.pointerLockElement!==canvas&&$('tutorial').classList.contains('hidden'))canvas.requestPointerLock()});
document.addEventListener('pointerlockchange',()=>{if(mode==='free')$('lockNotice').classList.toggle('hidden',document.pointerLockElement===canvas)});
document.addEventListener('mousemove',e=>{if(mode!=='free'||document.pointerLockElement!==canvas)return;yaw-=e.movementX*.0023;pitch-=e.movementY*.0023;pitch=THREE.MathUtils.clamp(pitch,-1.35,1.35)});
document.addEventListener('keydown',e=>{
  freeKeys[e.code]=true;if(mode!=='free')return;
  if(e.code==='Space'&&onGround){freeVelocityY=5.2;onGround=false;e.preventDefault()}
  if(/^Digit[1-6]$/.test(e.code)){const i=Number(e.code.slice(-1))-1;if(i<unlocked){selectedMaterial=i;buildHotbar()}}
  if(e.code==='KeyR')paintTarget();if(e.code==='KeyX')toggleXray();
  if(e.code==='KeyE'&&nearRuin){toast('폐허에서 발견한 겨냥도를 복원해 보세요.');missionIndex=3;setTimeout(()=>enterMode('challenge'),450)}
});
document.addEventListener('keyup',e=>{freeKeys[e.code]=false});
function reportResult(kind,score,cleared){
  try{parent.postMessage({type:'kidscade-result',game:'큐브 아키텍트',mode:kind,score:score,cleared:cleared},'*')}catch(e){}
}
function resize(){
  const w=innerWidth,h=innerHeight;if(renderer)renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
}
window.addEventListener('resize',resize);
let last=performance.now();
function animate(now){
  requestAnimationFrame(animate);const dt=Math.min(.04,(now-last)/1000);last=now;if(orbit)orbit.update();if(mode==='free')updateFree(dt,now);if(renderer)renderer.render(scene,camera);
}
window.CubeArchitectReady=true;
window.CubeArchitect={enterMode,showHome};

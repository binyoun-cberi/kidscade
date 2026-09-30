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
  ['challengePanel','challengeFlyHud','netPanel','freeHud','mobileControls','blueprintModal','resultCard','tutorial'].forEach(id=>setVisible(id,false));
  blueprintModalOpen=false;
  resetMobileInput();
  $('topbar').classList.add('hidden');
  $('homeScreen').classList.add('hidden');
  $('actionCheck').classList.add('hidden');
  $('actionNext').classList.add('hidden');
  $('actionSave').classList.add('hidden');
  $('actionXray').classList.add('hidden');
}
function showHome(){
  if(mode==='free')saveFreeWorld();
  if(mode==='challenge'&&restorationSession)restorationSession=null;
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
    if($('challengeCourseLabel'))$('challengeCourseLabel').textContent='생존 원정 · '+poi.name+' 복원';
    modeTitle('랜드마크 복원',poi.name+' · '+poi.tech.label+' 해금');
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
  if(!quiet)sfx('place');return true;
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
  sfx('break');
}
function clearChallenge(){
  challengeMeshes.forEach(m=>scene.remove(m));challengeMeshes=[];challengeBlocks.clear();
  challengeSelected=null;clearChallengeOverlay();clearTargetGhosts();
  $('resultCard').classList.add('hidden');updateChallengeEditor();updateChallengeStats();
}
function updateChallengeStats(){
  const target=currentChallengeMission().blocks.length;$('placedCount').textContent=challengeBlocks.size;$('targetCount').textContent=target;
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
  const rate=role==='base'?.96:role==='body'?.76:
    (role==='tower'||role==='arch')?.58:
    (role==='roof'||role==='dome'||role==='spire')?.42:.22;
  return hash2(x*17+y*5,z*19-y*3)<rate;
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
    $('missionTip').textContent='폐허의 남은 구조는 이미 배치되어 있어요. '+restorationSession.seedPercent+
      '%에서 시작해 외형 85% 이상을 복원하세요. '+currentChallengeMission().tip;
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
  configureMobileMode('challenge');$('challengeLockNotice').onclick=requestGamePointerLock;
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
      (restorationSession?'<b>폐허 복원도 '+restorationScore+'%</b><br>':'')+
      '윗면 <b>'+top+'%</b> · 정면 <b>'+front+'%</b> · 측면 <b>'+side+'%</b><br>'+
      '<small>주요 부위 참고: '+sections+'</small><br>'+
      (completed?'외형 복원 완료! 85% 이상이면 통과해요.':
      restorationSession?'현재 남아 있는 폐허에 부족한 바깥 구조를 더 복원해 보세요.':
      '세 방향의 외형을 비교해요. 파란 선은 아직 부족한 바깥 구조의 일부예요.')+
      '<br>보이지 않는 내부와 면 색칠은 외형 점수에서 제외합니다.';
  }else{
    const targetCount=match.target.points.length,userCount=match.user.keys.size;
    $('resultText').innerHTML=match.score===100?
      '위치와 바닥 방향이 달라도 같은 입체도형이면 정답이에요.':
      '같은 블록 '+match.common+'개 · 부족한 블록 '+Math.max(0,targetCount-match.common)+
      '개 · 다른 블록 '+Math.max(0,userCount-match.common)+'개<br>파란 선을 보고 모양을 다시 확인하세요.';
  }
  if(completed){
    toast(hard?'랜드마크 외형 복원 완료! 85% 기준을 넘었어요.':'설계도 복원 성공! 위치와 방향은 채점하지 않았어요.');
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
const NET_LAYOUT=[[2,1],[0,1],[1,0],[1,2],[1,1],[3,1]];
const NET_SIDES=['윗쪽','오른쪽','아랫쪽','왼쪽'];
const NET_CORNER_NAMES=['왼쪽 위','오른쪽 위','오른쪽 아래','왼쪽 아래'];
const NET_EDGE_CORNERS=[[0,1],[1,2],[3,2],[0,3]];
let netQuizMode='decorate',netQuiz=null,netQuizChoice=null,netQuizRevealed=false;
let netQuizAnswered=0,netQuizCorrect=0,netQuizProof=null,foldNonce=0;
function netEdgeData(){
  const result=[];
  for(let f=0;f<6;f++)for(let side=0;side<4;side++){
    const corners=NET_EDGE_CORNERS[side].map(c=>NET_FACE_CORNERS[f][c]);
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
    corners.push({face:f,corner,vertex:NET_FACE_CORNERS[f][corner],xy:[col+dc,row+dr].join(',')});
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
  document.querySelectorAll('.net-face').forEach(el=>{
    const f=Number(el.dataset.face);
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
  if(netQuizMode==='decorate')$('netMission').textContent='전개도의 그림이 직육면체의 어느 면으로 오는지 찾아 배치하세요.';
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
  if(netQuizMode!=='decorate'||!hit||!hit.face)return;const idx=hit.face.materialIndex;netAssigned[idx]=selectedSymbol;
  netBox.material[idx].dispose();netBox.material[idx]=symbolMaterial(selectedSymbol,'#ffffff');netBox.material.needsUpdate=true;sfx('place');
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
const PLACEABLE_TYPES=['flower','sandstone','snowBrick','reedMat','snow','redSand','gravel','pineLog','pineLeaves','cactus','reed','workbench','grass','dirt','stone','smoothStone','sand','clay','ironOre','log','leaves','sapling','planks','brick','glass','glassPane','windowFrame','slab','stairs','roof','cuboid','obsidian','ironBlock','charcoal','door','torch','furnace','water','lava','fire'];
const WORLD_HALF=64,WORLD_MIN_Y=-6,WORLD_MAX_Y=34,SEA_LEVEL=0;
const WORLD_VIEW_RADIUS=mobileModeEnabled?19:26;
let streamCenterX=Infinity,streamCenterZ=Infinity;
let gameFreeMode='survival',survivalBag={},survivalStage=0,freePhysicsY=0,legacyWorld=false,savedFreePosition=null,visitedBiomes=new Set();
let survivalStats={},survivalFinished=false,survivalExposure=0,survivalTimeAcc=0,firstNightStarted=false;
let discoveredLandmarks=new Set(),restoredLandmarks=new Set(),unlockedTech=new Set();
let nearLandmarkPoi=null,restorationSession=null;
let firstDuskWarned=false,nightShelterNotice=false,lastEmergencyReturn=-120000;
let worldChunkIndex=new Map(),worldChunksGenerated=new Set(),worldChunkGenerationDepth=0;
const WORLD_CHUNK_SIZE=16;
function worldChunkKey(x,z){
  return Math.floor(x/WORLD_CHUNK_SIZE)+','+Math.floor(z/WORLD_CHUNK_SIZE);
}
function newSurvivalStats(){
  return {harvestedWood:0,harvestedStone:0,crafted:{},placed:{},placedBlocks:0,
    paintedFaces:[],smelted:{},biomes:[],found:[],restored:[]};
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
  }else if(action==='paint'){
    const id=String(type);if(!survivalStats.paintedFaces.includes(id))survivalStats.paintedFaces.push(id);
  }else if(action==='biome'){
    if(!survivalStats.biomes.includes(type))survivalStats.biomes.push(type);
  }else if(action==='find'){
    if(!survivalStats.found.includes(type))survivalStats.found.push(type);
  }else if(action==='restore'){
    if(!survivalStats.restored.includes(type))survivalStats.restored.push(type);
  }
  advanceSurvival();
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
  return gameFreeMode==='creative'?8:(unlockedTech.has('largeCuboid')?6:3);
}
function landmarkPoiBaseY(poi){
  const [ox,oz]=poi.origin,[w,,d]=poi.compact.size;
  let top=-Infinity;
  for(let x=ox;x<ox+w;x++)for(let z=oz;z<oz+d;z++)top=Math.max(top,terrainHeight(x,z));
  return Math.min(WORLD_MAX_Y-poi.compact.size[1]-1,top+1);
}
function setLandmarkPoiBlocks(poi,full=false,onlyChunk=null){
  const baseY=landmarkPoiBaseY(poi),[ox,oz]=poi.origin;
  const blocks=full?poi.compact.fullShell:poi.compact.blocks;
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
  const chunk=cx+','+cz;
  for(const poi of poiRules.poisForChunk(cx,cz,WORLD_CHUNK_SIZE))
    setLandmarkPoiBlocks(poi,restoredLandmarks.has(poi.id),chunk);
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
  restoredLandmarks.add(id);discoveredLandmarks.add(id);unlockedTech.add(poi.tech.id);
  for(const [type,n] of Object.entries(poi.tech.reward||{}))addToBag(type,n);
  trackSurvival('restore',id);
  rebuildLandmarkPoi(poi);
  buildInventory();updateFreeMission();saveFreeWorld();
  toast(poi.name+' 복원 완료 · '+poi.tech.label+' 해금!');
}
function returnFromRestoration(){
  const session=restorationSession;
  restorationSession=null;
  enterMode('free');
  if(session?.completed)completeLandmarkPoi(session.poiId);
}
function openLandmarkRestoration(poi){
  if(!poi||gameFreeMode!=='survival')return;
  saveFreeWorld();
  challengeDifficulty='hard';missionIndex=poi.missionIndex;
  restorationSession={poiId:poi.id,missionIndex:poi.missionIndex,completed:false};
  enterMode('challenge');
}
function markRestorationSuccess(score){
  if(!restorationSession||restorationSession.completed)return;
  restorationSession.completed=true;
  const poi=poiRules.poiById(restorationSession.poiId);
  $('actionNext').textContent='보상 받고 월드로 돌아가기';
  $('resultText').innerHTML+='<br><b>'+poi.tech.label+'</b> 기술을 해금할 수 있어요.';
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
const fluidGeo=new THREE.BoxGeometry(1,.84,1);
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
const materialCache=new Map();
let worldData=new Map(),worldMeshMap=new Map(),worldEdits=new Map(),worldInteractables=[],freeMeshes=[];
let collectibles=[],collected=new Set(),selectedHotbarSlot=0,selectedType='grass';
let hotbarTypes=['grass','dirt','stone','sand','log','planks','glass','door','water'];
let yaw=0,pitch=0,freeVelocityY=0,onGround=true,freeKeys={},xray=false,nearRuin=false,lastFreeSave=0;
let freeFlying=false,inventoryOpen=false,furnaceOpen=false,freeSimAccum=0,freeSimTick=0,dayTime=.28,freeHemi=null,freeSun=null,lastChemToast=0;
let currentCuboidSpec={dims:[2,1,1],faceColors:DEFAULT_FACE_COLORS.slice()};
let mathLensMode=0,mathOverlayGroup=null,facePaintColor='#ff7043';
let freeSelectedShapeKey=null,freeElementMode='edge',freeElementColor='#ff7043';
let weather='clear',weatherTimer=18,rainSystem=null,rainPositions=null,lightningFlash=0;
let critters=[],critterClock=0;
const FURNACE_RECIPES=[
  {input:'sand',output:'glass',label:'모래 → 유리',note:'모래를 높은 온도로 가열하면 유리 재료가 됩니다.'},
  {input:'log',output:'charcoal',label:'원목 → 숯',note:'산소가 적은 상태에서 목재를 가열하는 변화를 단순화한 실험입니다.'},
  {input:'clay',output:'brick',label:'점토 → 벽돌',note:'점토를 가열해 단단한 건축 재료로 바꿉니다.'},
  {input:'ironOre',output:'ironBlock',label:'철광석 → 철',note:'게임에서는 제련 과정을 간단히 표현합니다.'},
  {input:'stone',output:'smoothStone',label:'돌 → 매끈한 돌',note:'가열·가공된 건축용 돌을 표현합니다.'}
];

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
    if(o.isMesh){assignWorldUserData(o,key,x,y,z,type,root.userData||{});worldInteractables.push(o);freeMeshes.push(o)}
  });
  if(root.isMesh){assignWorldUserData(root,key,x,y,z,type,root.userData||{});if(!worldInteractables.includes(root))worldInteractables.push(root);if(!freeMeshes.includes(root))freeMeshes.push(root)}
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
function makeWorldMesh(x,y,z,data){
  const d=blockDef(data),type=data.type,key=worldKey(x,y,z);if(d.hidden)return null;
  let root;
  if(type==='door'){
    root=new THREE.Mesh(doorGeo,materialFor('door'));root.position.set(x,y+1,z);
    const facing=(data.facing||0)*Math.PI/2;root.rotation.y=facing+(data.open?Math.PI/2:0);
  }else if(type==='torch'){
    root=new THREE.Mesh(torchGeo,materialFor('torch'));root.position.set(x,y+.34,z);
    const light=new THREE.PointLight(0xffb45e,1.25,7,2);light.position.y=.42;root.add(light);
  }else if(type==='sapling'||type==='reed'||type==='flower'){
    root=new THREE.Mesh(saplingGeo,materialFor(type));root.position.set(x,y+.41,z);
  }else if(type==='fire'){
    root=new THREE.Mesh(fireGeo,new THREE.MeshStandardMaterial({color:0xff8c32,emissive:0xff4b18,emissiveIntensity:1.15,transparent:true,opacity:.84,roughness:.5}));
    root.position.set(x,y+.42,z);const light=new THREE.PointLight(0xff692c,1.4,6,2);light.position.y=.35;root.add(light);
  }else if(type==='water'||type==='lava'){
    root=new THREE.Mesh(fluidGeo,materialFor(type));root.position.set(x,y+.42,z);
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
    root=new THREE.Mesh(freeCubeGeo,data.faceColors?faceMaterials(data.faceColors):materialFor(type));root.position.set(x,y+.5,z);
    root.userData={shapeKind:'cuboid',dims:[1,1,1],faceIds:FACE_IDS.slice(),topology:CUBOID_TOPOLOGY};
  }
  root.castShadow=!(type==='water'||type==='glass'||type==='glassPane'||type==='leaves'||type==='fire'||type==='windowFrame');
  root.receiveShadow=true;scene.add(root);worldMeshMap.set(key,root);registerWorldObject(root,key,x,y,z,type);return root;
}
function refreshBlockMesh(x,y,z){
  const key=worldKey(x,y,z);
  if(!inRenderRange(x,z)){if(worldMeshMap.has(key))removeWorldMesh(key);return}
  removeWorldMesh(key);
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
function removeCuboidAt(ax,ay,az,record=true){
  const anchor=getBlock(ax,ay,az);if(!anchor||anchor.type!=='cuboid')return false;
  const dims=anchor.dims||[1,1,1];
  removeWorldMesh(worldKey(ax,ay,az));
  for(let dx=0;dx<dims[0];dx++)for(let dy=0;dy<dims[1];dy++)for(let dz=0;dz<dims[2];dz++){
    const x=ax+dx,y=ay+dy,z=az+dz;setRawBlock(x,y,z,null);if(record)markEdit(x,y,z,null);
  }
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
    refreshAround(x,y,z);refreshAround(x,y+1,z);return true;
  }
  setRawBlock(x,y,z,null);if(record)markEdit(x,y,z,null);refreshAround(x,y,z);return true;
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
  const minX=Math.floor((cx-WORLD_VIEW_RADIUS)/WORLD_CHUNK_SIZE);
  const maxX=Math.floor((cx+WORLD_VIEW_RADIUS)/WORLD_CHUNK_SIZE);
  const minZ=Math.floor((cz-WORLD_VIEW_RADIUS)/WORLD_CHUNK_SIZE);
  const maxZ=Math.floor((cz+WORLD_VIEW_RADIUS)/WORLD_CHUNK_SIZE);
  for(let bx=minX;bx<=maxX;bx++)for(let bz=minZ;bz<=maxZ;bz++){
    generateWorldChunk(bx,bz);
    const keys=worldChunkIndex.get(bx+','+bz);
    if(!keys)continue;
    for(const key of keys){
      if(worldMeshMap.has(key))continue;
      const [x,y,z]=parseWorldKey(key);
      if(!inRenderRange(x,z))continue;
      const data=worldData.get(key);
      if(data&&visibleAt(x,y,z,data))makeWorldMesh(x,y,z,data);
    }
  }
}
function rebuildAllWorldMeshes(){
  // The world data covers 128×128 cells, but only nearby blocks have 3D meshes.
  for(const mesh of worldMeshMap.values())scene.remove(mesh);
  worldMeshMap=new Map();worldInteractables=[];freeMeshes=[];
  streamCenterX=Infinity;streamCenterZ=Infinity;streamWorldMeshes(true);
}
function growTree(x,baseY,z,record,kind='forest'){
  const conifer=kind==='pine'||kind==='snow';
  const height=(conifer?5:3)+(hash2(x+11,z-7)>.62?1:0);
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
function addCollectible(id,x,y,z,color,label){
  const m=new THREE.Mesh(new THREE.OctahedronGeometry(.45),
    new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.42,roughness:.3}));
  m.position.set(x,y,z);m.userData={collectible:id,label,baseY:y};m.castShadow=true;
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
        if(kind==='flowers'&&roll>.74){
          setRawBlock(x,h+1,z,{type:'flower',natural:true});
        }else if(kind==='desert'||kind==='badlands'){
          if(roll>.985&&getBlock(x,h,z)?.type!=='water')
            for(let y=1;y<=2+Math.floor(hash2(x,z)*2);y++)
              setRawBlock(x,h+y,z,{type:'cactus',natural:true});
        }else if(kind==='marsh'){
          if(roll>.966)
            for(let y=1;y<=2;y++)setRawBlock(x,h+y,z,{type:'reed',natural:true});
          else if(roll>.987)growTree(x,h+1,z,false,'forest');
        }else if(roll>1-b.trees&&!(x%3===0&&z%3===0)){
          growTree(x,h+1,z,false,kind==='pine'||kind==='snow'?'pine':'forest');
        }
      }
    generateLandmarkPoiChunk(cx,cz);
    // Save files store only changes. Reapply those changes after natural terrain and POIs.
    if(worldEdits?.size)for(const [key,change] of worldEdits){
      const [x,y,z]=parseWorldKey(key);
      if(worldChunkKey(x,z)===chunk)setRawBlock(x,y,z,change);
    }
  }finally{worldChunkGenerationDepth--}
}
function addCollectible(id,x,y,z,color,label){
  const m=new THREE.Mesh(new THREE.OctahedronGeometry(.45),
    new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.42,roughness:.3}));
  m.position.set(x,y,z);m.userData={collectible:id,label,baseY:y};m.castShadow=true;
  scene.add(m);collectibles.push(m);
}
function buildFreeWorld(){
  worldData=new Map();worldMeshMap=new Map();worldEdits=new Map();
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
  const ruinY=Math.max(terrainHeight(10,10),terrainHeight(8,8))+1;
  [[8,0,8,'stone'],[8,1,8,'brick'],[8,2,8,'brick'],[12,0,8,'stone'],
   [12,1,8,'brick'],[12,2,8,'brick'],[9,2,8,'brick'],[10,2,8,'brick'],
   [11,2,8,'brick'],[8,0,11,'stone'],[12,0,11,'stone'],[10,0,11,'obsidian']]
    .forEach(v=>setRawBlock(v[0],ruinY+v[1],v[2],{type:v[3],ruin:true,natural:true}));
  const discoveries=[
    ['bp1',-27,-9,0x6f72ff,'숲의 설계도 조각'],
    ['c1',32,-28,0xffd65a,'사막의 색 결정'],
    ['bp2',-5,-44,0x6f72ff,'설원의 설계도 조각'],
    ['c2',5,39,0xff79a8,'습지의 색 결정'],
    ['bp3',43,23,0x6f72ff,'협곡의 설계도 조각']
  ];
  for(const [id,x,z,color,label] of discoveries)
    addCollectible(id,x,terrainHeight(x,z)+1.8,z,color,label);
  freeHemi=scene.children.find(o=>o.isHemisphereLight)||null;
  freeSun=scene.children.find(o=>o.isDirectionalLight)||null;
}
function initFree(){
  const survival=gameFreeMode==='survival';
  modeTitle(survival?'생존 탐험':'크리에이티브 월드',
    survival?'나무 채집 → 제작 → 새로운 바이옴 탐험':'모든 건축 재료 · 비행 · 물질 실험');
  setVisible('freeHud',true);$('actionSave').classList.remove('hidden');
  $('actionXray').classList.toggle('hidden',survival);
  cleanScene(0x9bd7ff);scene.fog=new THREE.Fog(0x9bd7ff,24,52);
  camera.rotation.order='YXZ';yaw=Math.PI;pitch=0;
  collectibles=[];collected=new Set();xray=false;freeVelocityY=0;onGround=true;freeFlying=false;
  inventoryOpen=false;furnaceOpen=false;freeSimAccum=0;freeSimTick=0;mathLensMode=0;
  freeSelectedShapeKey=null;weather='clear';weatherTimer=18;critters=[];
  survivalBag={};survivalStage=0;savedFreePosition=null;visitedBiomes=new Set();
  survivalStats=newSurvivalStats();survivalFinished=false;survivalExposure=0;dayTime=.28;
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
  buildFreeWorld();loadFreeWorld();
  const ground=getHighestSolidY(0,5,10);
  const spawn=savedFreePosition&&savedFreePosition.length===3?savedFreePosition:
    [0,ground+1+1.62,5];
  camera.position.set(
    THREE.MathUtils.clamp(spawn[0],-WORLD_HALF+1,WORLD_HALF-1),
    THREE.MathUtils.clamp(spawn[1],WORLD_MIN_Y+1.7,WORLD_MAX_Y+8),
    THREE.MathUtils.clamp(spawn[2],-WORLD_HALF+1,WORLD_HALF-1)
  );
  freePhysicsY=camera.position.y;
  applyRestoredLandmarksToLoadedWorld();
  rebuildAllWorldMeshes();
  buildHotbar();buildInventory();setupShapeWorkbench();buildFurnaceRecipes();
  $('actionXray').classList.toggle('hidden',survival&&survivalStage<3);
  setupWeather();spawnCritters();updateFreeMission();
  $('actionSave').onclick=()=>{saveFreeWorld();toast('아키텍트 월드를 저장했어요.')};
  $('actionXray').textContent='수학 렌즈';$('actionXray').onclick=toggleXray;
  $('blockInventory').classList.add('hidden');$('furnacePanel').classList.add('hidden');
  $('mathLensBadge').classList.add('hidden');
  configureMobileMode('free');
  $('lockNotice').onclick=()=>{if(!inventoryOpen&&!furnaceOpen)requestGamePointerLock()};
  $('survivalReturn').onclick=emergencyReturn;
  renderSurvivalSafety(null);
  $('inventoryClose').onclick=()=>toggleInventory(false);
  $('furnaceClose').onclick=()=>toggleFurnace(false);
  document.querySelectorAll('[data-inv-cat]').forEach(b=>b.onclick=()=>buildInventory(b.dataset.invCat));
  showTutorial('free');
}
function bagCount(type){return Math.max(0,Number(survivalBag[type])||0)}
function hasWorkbench(){
  const x=Math.round(camera.position.x),z=Math.round(camera.position.z);
  for(let dx=-3;dx<=3;dx++)for(let dz=-3;dz<=3;dz++)
    for(let dy=-2;dy<=2;dy++)
      if(getBlock(x+dx,Math.floor(freePhysicsY-1.62)+dy,z+dz)?.type==='workbench')return true;
  return false;
}
function advanceSurvival(){
  if(gameFreeMode!=='survival'||survivalFinished)return;
  let progressed=false;
  while(survivalStage<worldRules.GOALS.length-1&&
    worldRules.goalProgress(worldRules.GOALS[survivalStage],survivalStats)>=
      worldRules.GOALS[survivalStage].need){
    survivalStage++;progressed=true;
  }
  if(survivalStage===worldRules.GOALS.length-1&&
    worldRules.goalProgress(worldRules.GOALS[survivalStage],survivalStats)>=
      worldRules.GOALS[survivalStage].need){
    survivalFinished=true;progressed=true;
    toast('생존 원정 완료! 이제 자유롭게 더 탐험하고 건축해 보세요.');
    reportResult('free-survival',100,true);
  }else if(progressed)toast('새로운 목표 · '+worldRules.GOALS[survivalStage].title);
  if(progressed){sfx('good');saveFreeWorld()}
  $('actionXray').classList.toggle('hidden',survivalStage<3);
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
  if(first&&PLACEABLE_TYPES.includes(type)&&!hotbarTypes.includes(type)){
    const empty=hotbarTypes.findIndex((item,i)=>i>0&&!item);
    if(empty>=0)hotbarTypes[empty]=type;
  }
  advanceSurvival();buildHotbar();
  if(inventoryOpen)buildInventory();
}
function consumeBag(type,n=1){
  if(bagCount(type)<n)return false;
  survivalBag[type]-=n;
  if(inventoryOpen)buildInventory();
  return true;
}
function recipePossible(recipe){
  return (!recipe.bench||hasWorkbench())&&
    Object.entries(recipe.needs).every(([item,amount])=>bagCount(item)>=amount);
}
function craftSurvival(recipe){
  if(gameFreeMode!=='survival'||!recipePossible(recipe)){
    toast('재료가 부족하거나 제작대가 필요해요.');return;
  }
  for(const [type,amount] of Object.entries(recipe.needs))consumeBag(type,amount);
  for(const [type,amount] of Object.entries(recipe.gives))addToBag(type,amount);
  if(recipe.id==='flowerDye'){$('facePaintColor').value='#e75aab';facePaintColor='#e75aab'}
  if(recipe.id==='cactusDye'){$('facePaintColor').value='#67a74a';facePaintColor='#67a74a'}
  trackSurvival('craft',recipe.id);
  buildInventory();saveFreeWorld();
  toast(recipe.name+' 제작 완료!'+
    (recipe.id.endsWith('Dye')?' 새로운 색을 면 색칠에 선택했어요.':''));
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
  $('inventoryTitle').textContent=survival?'가방 · 제작':'건축 인벤토리';
  $('inventorySubtitle').textContent=survival?'지금 얻은 재료와 만들 수 있는 물건만 보여요.':
    '선택한 재료가 현재 핫바 칸에 들어갑니다.';
  $('survivalCraftPanel').classList.toggle('hidden',!survival);
  $('shapeWorkbench').classList.toggle('hidden',survival?
    survivalStage<3||!hasWorkbench():!(category==='도형'||category==='전체'));
  $('inventoryNote').textContent=survival?
    '나무에서 시작해 차례대로 제작해 보세요. 제작대를 얻으면 도형 편집 기능도 열려요.':
    '물·모래·불과 식물은 서로 다른 물리·화학적 성질을 갖고 있어요.';
  if(survival){
    const resources=Object.entries(survivalBag).filter(([type,n])=>n>0)
      .sort((a,b)=>a[0].localeCompare(b[0]));
    for(const [type,n] of resources){
      const d=blockDef(type),b=document.createElement('button');
      b.className='inventory-item';const hex='#'+(d.color||0xffffff).toString(16).padStart(6,'0');
      b.innerHTML='<i style="--swatch:'+hex+'">'+(d.icon||'▣')+'</i><b>'+d.name+'</b><small>보유 '+n+'개</small>';
      if(PLACEABLE_TYPES.includes(type))b.onclick=()=>{putOnHotbar(type);toast(d.name+'을(를) 핫바에 넣었어요.')};
      else b.disabled=true;
      grid.appendChild(b);
    }
    if(!resources.length)grid.textContent='가방이 비어 있어요. 먼저 주변의 나무를 채집해 보세요.';
    const list=$('survivalCraftList');list.innerHTML='';
    const biomeRecipes={flowerDye:'flowers',reedMat:'marsh',sandstone:'desert',
      snowBrick:'snow',cactusDye:'desert'};
    const visible=worldRules.RECIPES.filter(r=>r.stage<=survivalStage&&recipeUnlocked(r.id)&&
      (!['workbench','woodPick','stonePick','ironPick'].includes(r.id)||!bagCount(r.id))&&
      (!biomeRecipes[r.id]||visitedBiomes.has(biomeRecipes[r.id])||
        Object.keys(r.needs).some(item=>bagCount(item)>0)))
      .sort((a,b)=>Number(recipePossible(b))-Number(recipePossible(a))||a.stage-b.stage);
    for(const recipe of visible){
      const b=document.createElement('button'),possible=recipePossible(recipe);
      b.className='survival-recipe'+(possible?' can-craft':'');
      b.disabled=!possible;
      const costs=Object.entries(recipe.needs).map(([type,n])=>blockDef(type).name+' '+bagCount(type)+'/'+n).join(' · ');
      b.innerHTML=recipe.name+'<small>'+costs+
        (recipe.bench?' · 제작대 필요':'')+'</small>';
      b.onclick=()=>craftSurvival(recipe);list.appendChild(b);
    }
    $('survivalCraftHint').textContent=hasWorkbench()?
      '제작대 근처예요. 재료가 모이면 제작 버튼이 활성화돼요.':
      '가방에 든 제작대를 땅에 설치하고 가까이 다가가세요.';
    const techLabels=poiRules.POIS.filter(p=>unlockedTech.has(p.tech.id)).map(p=>p.tech.label);
    $('survivalTechs').textContent=techLabels.length?
      '설계도 기술 · '+techLabels.join(' · '):
      '설계도 기술 · 랜드마크 폐허를 복원하면 고급 건축이 열려요.';
    return;
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
function toggleInventory(force){
  inventoryOpen=typeof force==='boolean'?force:!inventoryOpen;
  if(inventoryOpen&&furnaceOpen)toggleFurnace(false);
  $('blockInventory').classList.toggle('hidden',!inventoryOpen);
  if(inventoryOpen){if(document.pointerLockElement===canvas)document.exitPointerLock();buildInventory('전체')}
  $('lockNotice').classList.toggle('hidden',inventoryOpen||furnaceOpen||document.pointerLockElement===canvas);
}
function nearestUnrestoredLandmark(x,z){
  return poiRules.POIS.filter(p=>!restoredLandmarks.has(p.id))
    .map(p=>({...p,distance:Math.round(Math.hypot(x-p.center[0],z-p.center[1]))}))
    .sort((a,b)=>a.distance-b.distance)[0]||null;
}
function updateFreeMission(){
  const bx=Math.round(camera.position.x),bz=Math.round(camera.position.z);
  const region=worldRules.region(bx,bz),biome=worldRules.BIOMES[region];
  $('biomeState').textContent=biome.name;
  if(!visitedBiomes.has(region)){
    const alreadyExplored=visitedBiomes.size>0;
    visitedBiomes.add(region);
    if(gameFreeMode==='survival')trackSurvival('biome',region);
    if(alreadyExplored){
      const hint=worldRules.BIOME_REWARDS[region];
      toast('새로운 바이옴 발견 · '+biome.name+'! '+hint.hint);saveFreeWorld();
    }
  }
  nearLandmarkPoi=null;
  if(gameFreeMode==='survival'){
    const close=poiRules.poiAt(bx,bz,30);
    if(close&&close.distance<=close.radius+9){
      if(!discoveredLandmarks.has(close.id)){
        discoveredLandmarks.add(close.id);
        toast('랜드마크 발견 · '+close.name+'! 폐허의 겨냥도를 복원할 수 있어요.');
        saveFreeWorld();
      }
      if(close.distance<=close.radius+3)nearLandmarkPoi=close;
    }
  }
  const canRestore=gameFreeMode==='survival'&&nearLandmarkPoi&&!restoredLandmarks.has(nearLandmarkPoi.id);
  $('actionCheck').classList.toggle('hidden',!canRestore);
  if(canRestore){
    $('actionCheck').textContent='복원 설계도';
    $('actionCheck').disabled=false;
    $('actionCheck').onclick=()=>openLandmarkRestoration(nearLandmarkPoi);
  }
  if(mobileModeEnabled){
    $('mobileCheck').classList.toggle('hidden',!canRestore);
    $('mobileCheck').textContent=canRestore?'복원':'검사';
  }
  const chosen=blockDef(selectedType||'hand').name;
  if(gameFreeMode==='survival'){
    const goal=worldRules.GOALS[survivalStage];
    const progress=survivalFinished?goal.need:worldRules.goalProgress(goal,survivalStats);
    $('freeQuestTitle').textContent=survivalFinished?'생존 원정 완료 · 자유 탐험':goal.title;
    $('freeQuestDescription').textContent=survivalFinished?
      '복원한 랜드마크와 해금된 건축 기술로 월드를 계속 발전시켜 보세요.':goal.description;
    $('adventureCount').textContent=survivalFinished?'완료':
      progress+'/'+goal.need+' · '+(survivalStage+1)+'/'+worldRules.GOALS.length;
    $('adventureBar').style.width=(survivalFinished?100:Math.round(progress/goal.need*100))+'%';
    $('freeState').textContent='생존 · '+chosen;
    $('freeHint').textContent=canRestore?'Q · 랜드마크 복원 설계도':
      survivalStage<3?'좌클릭 채집 · E 가방·제작 · Space 점프':
      '좌클릭 채집 · E 제작·도형 편집 · P 면 색칠 · X 수학 렌즈';
  }else{
    const total=5,done=collected.size;
    $('freeQuestTitle').textContent='월드 탐험 기록';
    $('freeQuestDescription').textContent='서로 다른 바이옴에서 설계도 조각과 색 결정을 찾아보세요.';
    $('adventureCount').textContent=done+'/'+total;
    $('adventureBar').style.width=(done/total*100)+'%';
    $('freeState').textContent=(freeFlying?'비행':'걷기')+' · '+chosen;
    $('freeHint').textContent=nearRuin?'Q 폐허 설계도 · E 가방 · F 비행':
      'E 가방 · F 비행 · R 복사 · P 면 색칠 · X 수학 렌즈';
  }
  renderExplorationHint();
}
function freeCenterHit(max=6.5){
  raycaster.setFromCamera(new THREE.Vector2(0,0),camera);
  const hits=raycaster.intersectObjects(worldInteractables,false);return hits.find(h=>h.distance<=max)||null;
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
function placeFreeBlock(hit){
  if(!hit)return;
  const hitType=hit.object.userData.type;
  if(hitType==='door'){toggleDoorAt(hit.object.userData.gx,hit.object.userData.gy,hit.object.userData.gz);return}
  if(hitType==='furnace'){toggleFurnace(true);return}
  if(hitType==='workbench'){toggleInventory(true);return}
  if(gameFreeMode==='survival'&&(!selectedType||selectedType==='hand'||
    ['woodPick','stonePick','ironPick','sticks'].includes(selectedType))){
    toast('E를 눌러 가방에서 설치할 재료를 골라 보세요.');return;
  }
  const p=placementTarget(hit);
  if(!p||!inWorld(p.x,p.y,p.z)||getBlock(p.x,p.y,p.z))return;
  if(Math.hypot(camera.position.x-p.x,camera.position.z-p.z)<.82&&
    p.y>=Math.floor(freePhysicsY-1.65)&&p.y<=Math.floor(freePhysicsY))return;
  const survival=gameFreeMode==='survival';
  if(survival){
    if(selectedType==='cuboid'){
      const volume=currentCuboidSpec.dims.reduce((a,b)=>a*b,1);
      if(survivalStage<3||!hasWorkbench()||bagCount('planks')<volume){
        toast('제작대와 판자 '+volume+'개가 필요해요.');return;
      }
    }else if(bagCount(selectedType)<1){
      toast(blockDef(selectedType).name+'이(가) 부족해요.');return;
    }
  }
  const facing=facingFromYaw();
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
  }else if(['stairs','roof','windowFrame','glassPane','furnace','workbench'].includes(selectedType)){
    setWorldBlock(p.x,p.y,p.z,{type:selectedType,facing,playerBuilt:true},true);
  }else setWorldBlock(p.x,p.y,p.z,{type:selectedType,playerBuilt:true},true);
  if(survival){
    if(selectedType==='cuboid'){
      const count=currentCuboidSpec.dims.reduce((a,b)=>a*b,1);consumeBag('planks',count);
    }else consumeBag(selectedType,1);
    trackSurvival('place',selectedType);
    buildHotbar();updateFreeMission();
  }
  sfx('place');saveFreeWorld();
}
function breakFreeBlock(hit){
  if(!hit||!hit.object.userData.worldBlock)return;
  const {gx:x,gy:y,gz:z}=hit.object.userData;
  const data=getBlock(x,y,z);
  if(!data||blockDef(data).unbreakable){toast('기반암은 부술 수 없어요.');return}
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
    if(required&&!bagCount(required)){
      toast(blockDef(required).name+'이(가) 있어야 '+blockDef(type).name+'을(를) 캘 수 있어요.');
      return;
    }
  }
  const resource=type==='cuboid'?'planks':worldRules.dropFor(type);
  const volume=type==='cuboid'?(data.dims||[1,1,1]).reduce((a,b)=>a*b,1):1;
  if(removeWorldBlockData(x,y,z,true)){
    if(survival&&resource&&!['water','lava','fire','doorTop','cuboidPart'].includes(resource)){
      if(type!=='leaves'&&type!=='pineLeaves'){
        addToBag(resource,volume);
        trackSurvival('harvest',type,volume);
      }else if(hash2(x*7+y,z*11-y)>.72)addToBag('sapling',1);
    }
    const nearby=[[1,0,0],[-1,0,0],[0,1,0],[0,0,1],[0,0,-1]]
      .map(v=>getBlock(x+v[0],y+v[1],z+v[2]))
      .find(d=>d?.type==='water');
    if(nearby&&!getBlock(x,y,z))
      setWorldBlock(x,y,z,{type:'water',level:Math.max(2,nearby.level||3),flow:true},true);
    sfx('break');updateFreeMission();saveFreeWorld();
  }
}
function toggleDoorAt(x,y,z){
  let data=getBlock(x,y,z);if(data?.type==='doorTop'){y-=1;data=getBlock(x,y,z)}
  if(!data||data.type!=='door')return false;
  data={...data,open:!data.open};setWorldBlock(x,y,z,data,true);refreshBlockMesh(x,y+1,z);sfx('place');toast(data.open?'문을 열었어요.':'문을 닫았어요.');return true;
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
    currentCuboidSpec={dims,faceColors};putOnHotbar('cuboid');toast('직육면체 '+dims.join('×')+'를 '+(selectedHotbarSlot+1)+'번 칸에 담았어요.');
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
  FURNACE_RECIPES.forEach(recipe=>{const b=document.createElement('button');b.className='furnace-recipe';b.innerHTML='<b>'+recipe.label+'</b><small>'+recipe.note+'</small>';b.onclick=()=>runFurnace(recipe);box.appendChild(b)});
}
function toggleFurnace(force){
  furnaceOpen=typeof force==='boolean'?force:!furnaceOpen;
  if(furnaceOpen&&inventoryOpen){inventoryOpen=false;$('blockInventory').classList.add('hidden')}
  $('furnacePanel').classList.toggle('hidden',!furnaceOpen);
  if(furnaceOpen&&document.pointerLockElement===canvas)document.exitPointerLock();
  $('lockNotice').classList.toggle('hidden',furnaceOpen||inventoryOpen||document.pointerLockElement===canvas);
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
function saveFreeWorld(){
  if(mode!=='free')return;
  const data={version:5,worldMode:gameFreeMode,edits:Array.from(worldEdits.entries()),
    collected:Array.from(collected),hotbar:hotbarTypes,selected:selectedHotbarSlot,
    dayTime,cuboidSpec:currentCuboidSpec,facePaintColor,
    position:[camera.position.x,freePhysicsY,camera.position.z],
    bag:survivalBag,stage:survivalStage,legacyTerrain:legacyWorld,visitedBiomes:[...visitedBiomes],
    stats:survivalStats,finished:survivalFinished,exposure:survivalExposure,
    firstNightStarted,dayTime,
    discoveredLandmarks:[...discoveredLandmarks],restoredLandmarks:[...restoredLandmarks],
    unlockedTech:[...unlockedTech]};
  try{
    if(window.KidscadeStorage?.setJson('cubeArchitectWorldSaveV4_'+gameFreeMode,data))
      lastFreeSave=performance.now();
  }catch(e){console.warn('[Cube Architect save]',e)}
}
function loadFreeWorld(){
  worldEdits=new Map();
  try{
    let data=window.KidscadeStorage?.getJson('cubeArchitectWorldSaveV4_'+gameFreeMode,null);
    if(!data&&gameFreeMode==='creative')
      data=window.KidscadeStorage?.getJson('cubeArchitectWorldSaveV3',null)||
        window.KidscadeStorage?.getJson('cubeArchitectWorldSaveV2',null);
    if(data){
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
        survivalBag=data.bag&&typeof data.bag==='object'?data.bag:{};
        discoveredLandmarks=new Set(data.discoveredLandmarks||[]);
        restoredLandmarks=new Set(data.restoredLandmarks||[]);
        unlockedTech=new Set(data.unlockedTech||[]);
        for(const id of restoredLandmarks){
          const poi=poiRules.poiById(id);if(poi)unlockedTech.add(poi.tech.id);
        }
        if(data.stats){
          survivalStats={...newSurvivalStats(),...data.stats,
            crafted:{...(data.stats.crafted||{})},
            placed:{...(data.stats.placed||{})},smelted:{...(data.stats.smelted||{})},
            paintedFaces:Array.isArray(data.stats.paintedFaces)?data.stats.paintedFaces:[],
            biomes:[...visitedBiomes],found:[...collected],
            restored:Array.isArray(data.stats.restored)?data.stats.restored:[...restoredLandmarks]};
          survivalStage=Math.max(0,Math.min(worldRules.GOALS.length-1,Number(data.stage)||0));
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
            smelted:{glass:oldStage>=6?1:0},
            biomes:[...visitedBiomes],found:[...collected],restored:[...restoredLandmarks]};
        }
        survivalExposure=Math.max(0,Math.min(100,Number(data.exposure)||0));
        firstNightStarted=!!data.firstNightStarted;
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
  for(const key of worldMeshMap.keys()){
    const d=worldData.get(key);if(!d||!(d.type==='sand'||d.type==='redSand'||d.type==='gravel'))continue;const [x,y,z]=parseWorldKey(key);if(y<=WORLD_MIN_Y+1)continue;
    const below=getBlock(x,y-1,z);if(!below||blockDef(below).liquid||below.type==='fire')moves.push([x,y,z]);
  }
  moves.slice(0,40).forEach(([x,y,z])=>{const d=getBlock(x,y,z);if(!d||!blockDef(d).gravity||getBlock(x,y-1,z)&&!blockDef(getBlock(x,y-1,z)).liquid)return;removeWorldBlockData(x,y,z,true);setWorldBlock(x,y-1,z,{...d,falling:true},true)});
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
  for(const key of worldMeshMap.keys()){const d=worldData.get(key);if(d&&(d.type==='water'||d.type==='lava')&&!d.naturalSea)liquids.push([key,d])}
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
    if(Math.abs(dx)+Math.abs(dy)+Math.abs(dz)>r+2)continue;if(['log','pineLog'].includes(getBlock(x+dx,y+dy,z+dz)?.type))return true;
  }return false;
}
function simulatePlants(){
  const dirt=[],grass=[],leaves=[],saplings=[];
  for(const key of worldMeshMap.keys()){
    const d=worldData.get(key);if(!d)continue;
    if(d.type==='dirt')dirt.push(key);else if(d.type==='grass')grass.push(key);
    else if(d.type==='leaves'||d.type==='pineLeaves')leaves.push(key);
    else if(d.type==='sapling')saplings.push(key);
  }
  grass.slice(0,80).forEach(key=>{const [x,y,z]=parseWorldKey(key),above=getBlock(x,y+1,z);if(above&&isOccluder(above)&&hash2(x+freeSimTick,z)<.08)setWorldBlock(x,y,z,{type:'dirt',natural:true},true)});
  for(let i=0;i<Math.min(18,dirt.length);i++){
    const key=dirt[(i*13+freeSimTick*7)%dirt.length],[x,y,z]=parseWorldKey(key);if(getBlock(x,y+1,z))continue;
    const near=[[1,0],[-1,0],[0,1],[0,-1]].some(v=>getBlock(x+v[0],y,z+v[1])?.type==='grass');
    const growThreshold=(weather==='rain'||weather==='storm')?.58:.72;
    if(near&&hash2(x+freeSimTick*.1,z-freeSimTick*.2)>growThreshold)setWorldBlock(x,y,z,{type:'grass',natural:true},true);
  }
  for(const key of leaves.slice(0,50)){
    const [x,y,z]=parseWorldKey(key),d=getBlock(x,y,z);if(!d)continue;
    if(hasNearbyLog(x,y,z)){d.decay=0;continue}d.decay=(d.decay||0)+1;if(d.decay>5&&hash2(x+freeSimTick,z)>.48)removeWorldBlockData(x,y,z,true);
  }
  for(const key of saplings){
    const [x,y,z]=parseWorldKey(key),d=getBlock(x,y,z);if(!d)continue;d.age=(d.age||0)+((weather==='rain'||weather==='storm')?2:1);
    if(d.age>26&&!getBlock(x,y+1,z)&&!getBlock(x,y+2,z)&&!getBlock(x,y+3,z)){removeWorldBlockData(x,y,z,true);growTree(x,y,z,true);toast('묘목이 나무로 자랐어요.')}
  }
}
function simulateFire(){
  const fires=[];for(const key of worldMeshMap.keys()){const d=worldData.get(key);if(d?.type==='fire')fires.push(key)}
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
  weather=next;weatherTimer=32+Math.random()*36;
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
  g.add(body,head,e1,e2);g.position.set(x,getHighestSolidY(x,z,8)+1,z);g.userData={kind:'rabbit',homeX:x,homeZ:z,dir:Math.random()*Math.PI,speed:.45+.25*Math.random(),turn:1+Math.random()*3};scene.add(g);return g;
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
  [[-7,-7],[-10,4],[7,10],[11,-5],[-28,-12],[-35,-34],[-3,-39],[7,36],[29,-24]]
    .forEach(p=>critters.push(createRabbit(p[0],p[1])));
  [[-6,2],[7,-8],[3,11],[-26,-7],[30,-26],[4,36]]
    .forEach((p,i)=>critters.push(createBird(p[0],p[1],i)));
  for(let i=0;i<7;i++)critters.push(createFirefly(-9+i*3,-2+(i%3)*4,i));
  for(let i=0;i<5;i++)critters.push(createFirefly(1+i*2,34+(i%3)*2,i+8));
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
        !inWorld(Math.round(nx),0,Math.round(nz))||
        terrainHeight(Math.round(nx),Math.round(nz))<0){
        u.dir+=Math.PI*.7;continue;
      }
      c.position.x=nx;c.position.z=nz;
      c.position.y=getHighestSolidY(nx,nz)+1;c.rotation.y=u.dir+Math.PI;
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
    const dx=camera.position.x-m.position.x,dz=camera.position.z-m.position.z;
    if(Math.hypot(dx,dz)<1.65&&Math.abs(freePhysicsY-m.position.y)<2.8){
      m.userData.gone=true;scene.remove(m);
      const id=m.userData.collectible;collected.add(id);
      if(gameFreeMode==='survival'){
        const prizes={bp1:{roof:2},bp2:{snowBrick:2},bp3:{sandstone:2},
          c1:{cactusDye:2},c2:{flowerDye:2}};
        for(const [type,n] of Object.entries(prizes[id]||{blueprintFragment:1}))
          addToBag(type,n);
        trackSurvival('find',id);
      }
      toast(m.userData.label+' 발견! 건축 보상을 가방에 넣었어요.');
      sfx('good');updateFreeMission();saveFreeWorld();
      if(collected.size===5){
        toast('세계의 다섯 발견물을 모두 찾았어요!');
        reportResult('free-exploration',100,true);
      }
    }
  }
  nearRuin=Math.hypot(camera.position.x-10,camera.position.z-9.5)<3.3;
  updateFreeMission();
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
  // A diagonal move must not step the player upward twice in one frame.
  let stepped=false;
  const nx=camera.position.x+dx;
  if(!playerCollidesAt(nx,camera.position.y,camera.position.z))camera.position.x=nx;
  else if(onGround&&!stepped&&
    !playerCollidesAt(nx,camera.position.y+1,camera.position.z)){
    camera.position.y+=1;camera.position.x=nx;stepped=true;freeVelocityY=0;
  }
  const nz=camera.position.z+dz;
  if(!playerCollidesAt(camera.position.x,camera.position.y,nz))camera.position.z=nz;
  else if(onGround&&!stepped&&
    !playerCollidesAt(camera.position.x,camera.position.y+1,nz)){
    camera.position.y+=1;camera.position.z=nz;freeVelocityY=0;
  }
}
function nearestUndiscoveredRegion(x,z){
  const seen=new Set(visitedBiomes),centers=[
    [-27,-9,'forest'],[-41,-38,'pine'],[-5,-44,'snow'],[32,-28,'desert'],
    [43,23,'badlands'],[5,39,'marsh'],[-34,30,'flowers']
  ];
  return centers.filter(([, ,id])=>!seen.has(id))
    .map(([cx,cz,id])=>({cx,cz,id,dist:Math.round(Math.hypot(cx-x,cz-z))}))
    .sort((a,b)=>a.dist-b.dist)[0]||null;
}
function renderExplorationHint(){
  if(gameFreeMode!=='survival'){
    $('explorationHint').classList.add('hidden');return;
  }
  const show=survivalStage>=4;
  $('explorationHint').classList.toggle('hidden',!show);
  if(!show)return;
  const x=Math.round(camera.position.x),z=Math.round(camera.position.z);
  if(nearLandmarkPoi){
    if(restoredLandmarks.has(nearLandmarkPoi.id))
      $('explorationHint').textContent='복원 완료 · '+nearLandmarkPoi.name+' · '+nearLandmarkPoi.tech.label;
    else $('explorationHint').textContent='발견 · '+nearLandmarkPoi.name+
      ' · Q 또는 상단의 ‘복원 설계도’를 눌러 도전';
    return;
  }
  const landmark=nearestUnrestoredLandmark(x,z);
  if(landmark&&survivalStage>=5){
    const dx=landmark.center[0]-x,dz=landmark.center[1]-z;
    const direction=(dz<-5?'북':dz>5?'남':'')+(dx>5?'동':dx<-5?'서':'');
    const known=discoveredLandmarks.has(landmark.id);
    $('explorationHint').textContent=(known?landmark.name:'멀리서 특이한 건축 흔적')+
      ' · '+(direction||'근처')+'쪽 약 '+landmark.distance+'칸'+
      (known?' · 복원 보상 '+landmark.tech.label:'');
    return;
  }
  const target=nearestUndiscoveredRegion(x,z);
  if(!target){
    $('explorationHint').textContent='8개 바이옴을 모두 발견했어요. 이제 랜드마크 흔적을 찾아보세요.';
    return;
  }
  const dx=target.cx-x,dz=target.cz-z;
  const directions=(dz< -5?'북':dz>5?'남':'')+(dx>5?'동':dx< -5?'서':'');
  const info=worldRules.BIOME_REWARDS[target.id];
  $('explorationHint').textContent='다음 지역: '+worldRules.BIOMES[target.id].name+
    ' · '+(directions||'근처')+'쪽 약 '+target.dist+'칸 · '+blockDef(info.resource).name;
}
function renderSurvivalSafety(shelter){
  if(gameFreeMode!=='survival'){
    $('survivalSafety').classList.add('hidden');
    $('exposureBar').classList.add('hidden');
    $('survivalReturn').classList.add('hidden');
    return;
  }
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
  camera.position.set(0,terrainHeight(0,5)+2.62,5);
  freePhysicsY=camera.position.y;
  freeVelocityY=0;onGround=true;survivalExposure=15;
  lastEmergencyReturn=performance.now();streamWorldMeshes(true);
  toast('시작 지점으로 귀환했어요. 재료는 잃지 않아요. 지붕과 벽을 지어 보세요.');
  renderSurvivalSafety(null);saveFreeWorld();
}
function updateSurvivalEnvironment(dt){
  if(gameFreeMode!=='survival')return;
  survivalTimeAcc+=dt;
  if(survivalTimeAcc<.5)return;
  const delta=survivalTimeAcc;survivalTimeAcc=0;
  const biomeId=worldRules.region(Math.round(camera.position.x),Math.round(camera.position.z));
  const night=dayTime>=.82||dayTime<.16,storm=weather==='storm';
  const feet=freePhysicsY-1.62;
  const shelter=worldRules.shelterAt(getBlock,camera.position.x,feet,camera.position.z);
  const px=Math.round(camera.position.x),pz=Math.round(camera.position.z),py=Math.floor(feet);
  let lit=false;
  for(let dx=-3;dx<=3&&!lit;dx++)for(let dz=-3;dz<=3&&!lit;dz++)
    if(dx*dx+dz*dz<=10)for(let dy=0;dy<=3;dy++){
      const d=getBlock(px+dx,py+dy,pz+dz);
      if(d&&(d.type==='torch'||d.type==='furnace'||d.type==='fire')){
        lit=true;break;
      }
    }
  const before=survivalExposure;
  survivalExposure=worldRules.exposureStep(survivalExposure,delta,{
    night,storm,rain:weather==='rain',cold:biomeId==='snow',sheltered:shelter.sheltered,lit
  });
  if(shelter.sheltered&&night&&!nightShelterNotice){
    nightShelterNotice=true;toast('내가 지은 거점이 밤의 추위를 막아 주고 있어요.');
  }
  if(!night)nightShelterNotice=false;
  if(before<35&&survivalExposure>=35)toast('추위가 느껴져요. 지붕을 찾거나 횃불 가까이 가 보세요.');
  if(before<75&&survivalExposure>=75)toast('많이 추워요. 거점에 들어가거나 귀환할 수 있어요.');
  renderSurvivalSafety(shelter);
}
function updateFree(dt,t){
  // Pause the world while young players are reading recipes or using the furnace.
  if(inventoryOpen||furnaceOpen){
    updateDayNight(0);updateWeather(0,t);updateMathOverlay();return;
  }
  updateDayNight(dt);updateWeather(dt,t);updateCritters(dt,t);updateMathOverlay();
  updateSurvivalEnvironment(dt);
  freeSimAccum+=dt;
  if(freeSimAccum>.55){freeSimAccum=0;simulateWorld()}
  const displayEye=camera.position.y;
  // Physics and visual camera heights are intentionally separate. A one-cell
  // step is immediate for collision, gradual for the player's view.
  camera.position.y=freePhysicsY;
  const speed=((freeKeys.ControlLeft||freeKeys.ControlRight)?6.6:4.0)*
    (gameFreeMode==='survival'&&survivalExposure>=70?.83:1);
  const forward=new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw));
  const right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
  const move=new THREE.Vector3();
  if(freeKeys.KeyW||freeKeys.ArrowUp)move.addScaledVector(forward,-1);
  if(freeKeys.KeyS||freeKeys.ArrowDown)move.add(forward);
  if(freeKeys.KeyA||freeKeys.ArrowLeft)move.addScaledVector(right,-1);
  if(freeKeys.KeyD||freeKeys.ArrowRight)move.add(right);
  if(mobileModeEnabled){
    move.addScaledVector(forward,mobileMove.y);
    move.addScaledVector(right,mobileMove.x);
  }
  if(move.lengthSq()>0)move.normalize().multiplyScalar(speed*dt);
  if(freeFlying&&gameFreeMode==='creative'){
    camera.position.add(move);
    if(freeKeys.Space)camera.position.y+=speed*dt;
    if(freeKeys.ShiftLeft||freeKeys.ShiftRight)camera.position.y-=speed*dt;
    freeVelocityY=0;onGround=false;
  }else{
    moveFreeHorizontal(move.x,move.z);
    freeVelocityY-=14*dt;
    let nextY=camera.position.y+freeVelocityY*dt;
    if(freeVelocityY<=0){
      const ground=groundTopBelow(camera.position.x,nextY,camera.position.z);
      if(nextY-1.62<=ground){
        nextY=ground+1.62;freeVelocityY=0;onGround=true;
      }else onGround=false;
    }else if(playerCollidesAt(camera.position.x,nextY,camera.position.z)){
      freeVelocityY=0;nextY=camera.position.y;
    }
    camera.position.y=nextY;
  }
  camera.position.x=THREE.MathUtils.clamp(camera.position.x,-WORLD_HALF+.7,WORLD_HALF-.7);
  camera.position.z=THREE.MathUtils.clamp(camera.position.z,-WORLD_HALF+.7,WORLD_HALF-.7);
  camera.position.y=THREE.MathUtils.clamp(camera.position.y,WORLD_MIN_Y+1.7,WORLD_MAX_Y+8);
  freePhysicsY=camera.position.y;
  if(freeFlying&&gameFreeMode==='creative')camera.position.y=freePhysicsY;
  else{
    const delta=freePhysicsY-displayEye;
    const maxChange=(delta>=0?4.5:5.1)*Math.min(dt,.055);
    camera.position.y=displayEye+THREE.MathUtils.clamp(delta,-maxChange,maxChange);
    if(Math.abs(freePhysicsY-camera.position.y)<.008)camera.position.y=freePhysicsY;
  }
  camera.rotation.y=yaw;camera.rotation.x=pitch;
  streamWorldMeshes();
  checkCollectibles(t);
}

/* Pointer-lock is optional. Safari on iPhone uses touch-look and these controls. */
function resetMobileInput(){
  mobileMove.x=0;mobileMove.y=0;mobileLookPointerId=null;mobileLookLast=null;mobileJoyPointerId=null;
  if($('mobileJoystickKnob'))$('mobileJoystickKnob').style.transform='translate(-50%,-50%)';
  if(typeof challengeKeys!=='undefined'){challengeKeys.Space=false;challengeKeys.ShiftLeft=false}
  if(typeof freeKeys!=='undefined'){freeKeys.Space=false;freeKeys.ShiftLeft=false}
}
function configureMobileMode(target){
  const active=mobileModeEnabled&&(target==='challenge'||target==='free');
  setVisible('mobileControls',active);
  $('mobileControls').classList.toggle('challenge-mobile',active&&target==='challenge');
  $('mobileControls').classList.toggle('free-mobile',active&&target==='free');
  $('mobileInventory').classList.toggle('hidden',target!=='free');
  $('mobileFly').classList.toggle('hidden',target!=='free'||gameFreeMode==='survival');
  const poiRestore=target==='free'&&gameFreeMode==='survival'&&nearLandmarkPoi&&!restoredLandmarks.has(nearLandmarkPoi.id);
  $('mobileCheck').classList.toggle('hidden',target!=='challenge'&&!poiRestore);
  $('mobileCheck').textContent=poiRestore?'복원':'검사';
  $('mobileSelect').classList.toggle('hidden',target!=='challenge');
  $('mobileNext').classList.toggle('hidden',target!=='challenge');
  $('mobileCopy').classList.toggle('hidden',target!=='free'||gameFreeMode==='survival');
  $('mobileWeather').classList.toggle('hidden',target!=='free'||gameFreeMode==='survival');
  $('mobilePaint').classList.toggle('hidden',target!=='free'||(gameFreeMode==='survival'&&survivalStage<3));
  $('mobileLens').classList.toggle('hidden',target!=='free'||(gameFreeMode==='survival'&&survivalStage<3));
  $('challengeLockNotice').classList.toggle('hidden',active||target!=='challenge');
  $('lockNotice').classList.toggle('hidden',active||target!=='free'||inventoryOpen||furnaceOpen);
  if(target==='free')refreshMobileFly();
}
function enableMobileFallback(){
  mobileModeEnabled=true;configureMobileMode(mode);
  toast('이 브라우저에서는 마우스 고정 대신 터치·화면 조작을 사용해요.');
}
function requestGamePointerLock(){
  if(mode!=='challenge'&&mode!=='free')return;
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
  $('mobileDown').classList.toggle('hidden',!freeFlying);
  $('mobileUp').querySelector('small').textContent=freeFlying?'상승':'점프';
}
function mobileBlockAction(action){
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
  if(mode==='free'&&!inventoryOpen&&!furnaceOpen){
    const hit=freeCenterHit(6);
    if(action==='break')breakFreeBlock(hit);
    if(action==='place')placeFreeBlock(hit);
  }
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
    if(!mobileModeEnabled)return;ev.preventDefault();mobileJoyPointerId=ev.pointerId;
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
      ev.preventDefault();ev.stopPropagation();if(mobileModeEnabled)cb();
    });
  }
  tap('mobileBreak',()=>mobileBlockAction('break'));
  tap('mobilePlace',()=>mobileBlockAction('place'));
  tap('mobileCheck',()=>{
    if(mode==='challenge')checkChallenge();
    else if(mode==='free'&&gameFreeMode==='survival'&&nearLandmarkPoi&&!restoredLandmarks.has(nearLandmarkPoi.id))
      openLandmarkRestoration(nearLandmarkPoi);
  });
  tap('mobileSelect',()=>{if(mode==='challenge')selectLookedChallengePiece()});
  tap('mobileNext',()=>{if(mode==='challenge'){
    if(restorationSession)returnFromRestoration();
    else{missionIndex=(missionIndex+1)%activeChallengeMissions().length;clearChallenge();drawBlueprint()}
  }});
  tap('mobileCopy',()=>{if(mode==='free')pickTargetBlock()});
  tap('mobileWeather',()=>{if(mode==='free')cycleWeather()});
  tap('mobileInventory',()=>{if(mode==='free')toggleInventory()});
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
      if(!mobileModeEnabled)return;ev.preventDefault();ev.stopPropagation();
      b.setPointerCapture?.(ev.pointerId);b.classList.add('pressed');
      if(mode==='challenge')challengeKeys[key]=true;
      else if(mode==='free'){
        if(key==='Space'&&!freeFlying&&onGround){freeVelocityY=5.2;onGround=false}
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
function showTutorial(kind){
  const once='cubeArchitectTutorial_'+kind+
    (kind==='free'?'_'+gameFreeMode+(mobileModeEnabled?'_touch_v17':'_v17'):
      (mobileModeEnabled?'_touch_v1':''));try{if(localStorage.getItem(once))return}catch(_){};
  let html='';
  if(kind==='challenge')html='<h2>설계도 챌린지 · 쉬움/어려움</h2><p>쉬움은 교과서형 직육면체, 어려움은 타지마할·사그라다 파밀리아 같은 랜드마크를 단순화한 겨냥도입니다. 위치와 바닥 방향은 채점하지 않습니다.</p><div class="keys"><div class="keyrow"><b>WASD + 마우스</b>날아다니며 보기</div><div class="keyrow"><b>Space / Shift</b>위로 / 아래로</div><div class="keyrow"><b>좌 / 우클릭</b>파괴 / 설치</div><div class="keyrow"><b>C / H / N</b>검사 / 힌트 / 다음</div></div>';
  if(kind==='net')html='<h2>전개도 연구실</h2><p>전개도 여섯 면의 그림이 흰 직육면체의 어느 면으로 오는지 생각해 보세요.</p><div class="keys"><div class="keyrow"><b>그림 선택</b>붙일 그림 고르기</div><div class="keyrow"><b>면 클릭</b>그림 붙이기</div><div class="keyrow"><b>드래그</b>직육면체 돌리기</div><div class="keyrow"><b>접어 보기</b>3D 위치 확인</div></div>';
  if(kind==='free')html='<h2>아키텍트 월드 · 살아있는 복셀 세계</h2><p>정육면체와 직육면체를 함께 쓰고, 각 면을 따로 칠하며 날씨와 생태·물질 변화를 관찰할 수 있습니다.</p><div class="keys"><div class="keyrow"><b>WASD / Space</b>이동 / 점프</div><div class="keyrow"><b>좌 / 우클릭</b>파괴 / 설치·문·화로</div><div class="keyrow"><b>1~9 / E</b>핫바 / 건축 인벤토리</div><div class="keyrow"><b>F / R</b>비행 / 바라보는 블록 복사</div><div class="keyrow"><b>P</b>바라보는 한 면만 색칠</div><div class="keyrow"><b>X</b>모서리 → 꼭짓점 → 평행면 수학 렌즈</div><div class="keyrow"><b>T</b>날씨 바꾸기</div><div class="keyrow"><b>물·불·화로</b>흐름·연소·물질 변화 실험</div></div>';
  if(kind==='free'&&gameFreeMode==='survival'){
    html='<h2>생존 탐험 · 첫날</h2><p>지금은 맨손뿐이에요. 근처 나무를 파괴해 원목 3개를 모으고 E를 눌러 판자를 만들어 보세요. 제작대·곡괭이·화로는 재료를 얻으면 하나씩 열려요.</p>'+
      '<div class="keys"><div class="keyrow"><b>WASD / Space</b>걷기 / 점프</div>'+
      '<div class="keyrow"><b>좌클릭</b>바라보는 블록 채집</div>'+
      '<div class="keyrow"><b>E</b>가방 · 지금 만들 수 있는 물건</div>'+
      '<div class="keyrow"><b>1~9 / 우클릭</b>획득한 재료 선택 / 설치</div>'+
      '<div class="keyrow"><b>목표</b>나무 → 판자 → 제작대 → 곡괭이</div></div>';
  }
  if(mobileModeEnabled&&kind==='challenge'){
    html='<h2>설계도 챌린지 · 모바일 조작</h2><p>화면을 밀어 보는 방향을 바꾸고 왼쪽 원형 스틱으로 움직이세요. 오른쪽 버튼으로 블록을 설치·파괴합니다. 건물의 위치는 채점하지 않아요.</p><div class="keys"><div class="keyrow"><b>왼쪽 스틱</b>앞뒤좌우 이동</div><div class="keyrow"><b>화면 드래그</b>시점 돌리기</div><div class="keyrow"><b>↑ / ↓</b>상승 / 하강</div><div class="keyrow"><b>설치 / 파괴</b>십자선이 가리키는 곳에 건축</div><div class="keyrow"><b>검사 / 다음</b>채점 / 다음 설계도</div></div>';
  }
  if(mobileModeEnabled&&kind==='free'&&gameFreeMode==='survival'){
    html='<h2>생존 탐험 · 모바일 첫날</h2><p>왼쪽 스틱으로 가까운 나무에 다가가세요. 화면을 밀어 시점을 돌리고 파괴 버튼으로 원목을 채집합니다. 가방에서 판자와 제작대를 만들어 보세요.</p>'+
      '<div class="keys"><div class="keyrow"><b>왼쪽 스틱</b>이동</div>'+
      '<div class="keyrow"><b>화면 드래그</b>시점 회전</div>'+
      '<div class="keyrow"><b>파괴 / 설치</b>채집 / 핫바 블록 설치</div>'+
      '<div class="keyrow"><b>가방</b>획득한 재료와 제작법</div>'+
      '<div class="keyrow"><b>점프</b>지형 올라가기</div></div>';
  }else if(mobileModeEnabled&&kind==='free'){
    html='<h2>크리에이티브 월드 · 모바일</h2><p>모든 재료를 자유롭게 쓰고 날아다닐 수 있어요. 핫바를 좌우로 넘겨 재료를 선택하세요.</p>'+
      '<div class="keys"><div class="keyrow"><b>왼쪽 스틱 / 드래그</b>이동 / 시점</div>'+
      '<div class="keyrow"><b>설치 / 파괴</b>블록 건축</div>'+
      '<div class="keyrow"><b>비행 / 가방</b>이동 방식 / 모든 재료</div>'+
      '<div class="keyrow"><b>색칠 / 수학</b>여섯 면 / 모서리·꼭짓점</div></div>';
  }
  $('tutorialBody').innerHTML=html;$('tutorial').classList.remove('hidden');$('tutorialClose').onclick=()=>{$('tutorial').classList.add('hidden');try{localStorage.setItem(once,'1')}catch(_){}};
}
window.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('pointerdown',e=>{
  pointerDown={x:e.clientX,y:e.clientY,button:e.button};pointerDragged=false;
  if(mobileModeEnabled&&(mode==='challenge'||mode==='free')){
    e.preventDefault();mobileLookPointerId=e.pointerId;mobileLookLast={x:e.clientX,y:e.clientY};
    canvas.setPointerCapture?.(e.pointerId);
  }
});
canvas.addEventListener('pointermove',e=>{
  if(mobileModeEnabled&&(mode==='challenge'||mode==='free')&&mobileLookPointerId===e.pointerId&&mobileLookLast){
    e.preventDefault();
    const dx=e.clientX-mobileLookLast.x,dy=e.clientY-mobileLookLast.y;
    mobileLookLast={x:e.clientX,y:e.clientY};
    if(mode==='challenge'){
      challengeYaw-=dx*.004;challengePitch=THREE.MathUtils.clamp(challengePitch-dy*.004,-1.45,1.45);
      updateChallengeCamera();updateChallengeGhost();
    }else{
      yaw-=dx*.004;pitch=THREE.MathUtils.clamp(pitch-dy*.004,-1.35,1.35);
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
  if(mode==='free'){const hit=freeCenterHit(6);if(e.button===0)breakFreeBlock(hit);if(e.button===2)placeFreeBlock(hit)}
});
canvas.addEventListener('click',()=>{if(!mobileModeEnabled&&(mode==='free'||mode==='challenge')&&document.pointerLockElement!==canvas&&$('tutorial').classList.contains('hidden')&&!(mode==='free'&&(inventoryOpen||furnaceOpen)))requestGamePointerLock()});
document.addEventListener('pointerlockchange',()=>{
  if(mode==='free')$('lockNotice').classList.toggle('hidden',mobileModeEnabled||inventoryOpen||furnaceOpen||document.pointerLockElement===canvas);
  if(mode==='challenge')$('challengeLockNotice').classList.toggle('hidden',mobileModeEnabled||document.pointerLockElement===canvas);
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
    if(e.code==='KeyH'){$('blueprintView').value='top';blueprintAngle='top';drawBlueprint()}
    if(e.code==='KeyG')selectLookedChallengePiece();
    if(e.code==='KeyP')paintLookedChallengeFace();
    if(e.code==='KeyB')setChallengeTool('build');
    if(e.code==='KeyN'&&!restorationSession){missionIndex=(missionIndex+1)%activeChallengeMissions().length;clearChallenge();drawBlueprint()}
    return;
  }
  if(mode!=='free')return;
  if(e.code==='KeyE'){e.preventDefault();if(furnaceOpen)toggleFurnace(false);else toggleInventory();return}
  if(e.code==='Escape'&&(inventoryOpen||furnaceOpen)){if(inventoryOpen)toggleInventory(false);if(furnaceOpen)toggleFurnace(false);return}
  if(inventoryOpen||furnaceOpen)return;
  freeKeys[e.code]=true;
  if(e.code==='Space'&&!freeFlying&&onGround){freeVelocityY=5.2;onGround=false;e.preventDefault()}
  if(/^Digit[1-9]$/.test(e.code)){
    selectedHotbarSlot=Number(e.code.slice(-1))-1;selectedType=hotbarTypes[selectedHotbarSlot];buildHotbar();updateFreeMission();
  }
  if(e.code==='KeyF'&&gameFreeMode==='creative'){freeFlying=!freeFlying;freeVelocityY=0;toast(freeFlying?'크리에이티브 비행 ON · Space 상승 / Shift 하강':'비행 OFF · 다시 지면의 물리를 따릅니다.');refreshMobileFly();updateFreeMission()}
  if(e.code==='KeyR'&&gameFreeMode==='creative')pickTargetBlock();
  if(e.code==='KeyP'&&(gameFreeMode==='creative'||survivalStage>=3))paintLookedFace();
  if(e.code==='KeyX'&&(gameFreeMode==='creative'||survivalStage>=3))toggleXray();
  if(e.code==='KeyT'&&gameFreeMode==='creative')cycleWeather();
  if(e.code==='KeyQ'&&gameFreeMode==='survival'&&nearLandmarkPoi&&!restoredLandmarks.has(nearLandmarkPoi.id)){
    openLandmarkRestoration(nearLandmarkPoi);return;
  }
  if(e.code==='KeyQ'&&gameFreeMode==='creative'&&nearRuin){
    toast('폐허에서 발견한 겨냥도를 복원해 보세요.');missionIndex=3;setTimeout(()=>enterMode('challenge'),450)
  }
});
document.addEventListener('keyup',e=>{challengeKeys[e.code]=false;freeKeys[e.code]=false});
window.addEventListener('blur',()=>{resetMobileInput();challengeKeys={};freeKeys={}});
function reportResult(kind,score,cleared){
  try{parent.postMessage({type:'kidscade-result',game:'큐브 아키텍트',mode:kind,score:score,cleared:cleared},'*')}catch(e){}
}
function resize(){
  const w=innerWidth,h=innerHeight;if(renderer)renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
}
window.addEventListener('resize',resize);
let last=performance.now();
function animate(now){
  requestAnimationFrame(animate);
  const dt=Math.min(.04,(now-last)/1000);last=now;
  if(orbit)orbit.update();
  if(mode==='challenge')updateChallengeFly(dt);
  if(mode==='free'){
    updateFree(dt,now);
    if(now-lastFreeSave>30000)saveFreeWorld();
  }
  if(renderer)renderer.render(scene,camera);
}
window.CubeArchitectReady=true;
window.CubeArchitect={enterMode,showHome};

})();

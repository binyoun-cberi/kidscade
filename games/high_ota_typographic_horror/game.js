import * as THREE from 'three';

const R = window.OtaRules;
if (!R) throw new Error('OtaRules is missing');
const el = id => document.getElementById(id);
const canvas = el('scene');
const hud = { objective:el('objective'), stage:el('stage'), prompt:el('prompt'),
  message:el('message'), danger:el('danger'), noise:el('static'), action:el('action') };
const overlays = { intro:el('intro'), fix:el('fixPanel'), ending:el('ending') };
const state = R.initialState();
const player = { x:0, z:4.8, yaw:0, pitch:0, moving:false };
const keys = new Set();
let started = false, muted = false, failed = false, elapsed = 0, lastFrame = 0;
let messageEnd = 0, stepsUntil = 0, monsterReveal = false, lookPointer = null;
let joystickPointer = null, joystick = { x:0, y:0 }, mobileRun = false;
let doorMesh, doorWord, personWord, monsterWord, enemyGroup;
let currentInteraction = null;
const touchDevice = matchMedia('(pointer:coarse)').matches;
let audioCtx = null;

const renderer = new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, touchDevice ? 1.4 : 1.75));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.setClearColor(0x050608);
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050608);
scene.fog = new THREE.FogExp2(0x050608, .020);
const camera = new THREE.PerspectiveCamera(75, 1, .08, 65);
camera.rotation.order = 'YXZ';

const textMaterials = new Map();
const unitPlane = new THREE.PlaneGeometry(1, 1);
const stamps = new Map();
const wallMat = new THREE.MeshBasicMaterial({color:0x0a0f16});
const floorMat = new THREE.MeshBasicMaterial({color:0x0b1018});
const propMat = new THREE.MeshBasicMaterial({color:0x111924});
const trimMat = new THREE.MeshBasicMaterial({color:0x1b2632});
const warnMat = new THREE.MeshBasicMaterial({color:0x28171d});

function material(word, color) {
  const key = word + '|' + color;
  if (textMaterials.has(key)) return textMaterials.get(key);
  const c = document.createElement('canvas'); c.width = 512; c.height = 200;
  const cx = c.getContext('2d');
  cx.clearRect(0,0,c.width,c.height);
  cx.textAlign = 'center'; cx.textBaseline = 'middle';
  let fontSize = 126;
  cx.font = '900 ' + fontSize + 'px "Noto Sans KR","Malgun Gothic",system-ui,sans-serif';
  const measured = cx.measureText(word).width;
  if (measured > 478) fontSize *= 478 / measured;
  cx.font = '900 ' + fontSize + 'px "Noto Sans KR","Malgun Gothic",system-ui,sans-serif';
  cx.fillStyle = color; cx.fillText(word, 256, 102);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  const mat = new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.DoubleSide,
    depthWrite:false,alphaTest:.07, fog:true, toneMapped:false});
  textMaterials.set(key, mat);
  return mat;
}
function label(word, color, x,y,z, rx=0,ry=0, w=1,h=.55) {
  const mesh = new THREE.Mesh(unitPlane,material(word,color));
  mesh.position.set(x,y,z); mesh.rotation.set(rx,ry,0); mesh.scale.set(w,h,1);
  mesh.renderOrder = 1;
  scene.add(mesh); return mesh;
}
function stamp(word,color,x,y,z,rx,ry,w,h) {
  const key = word + '|' + color;
  if (!stamps.has(key)) stamps.set(key,{word,color,entries:[]});
  stamps.get(key).entries.push({x,y,z,rx,ry,w,h});
}
function buildStamps() {
  const dummy = new THREE.Object3D();
  for (const batch of stamps.values()) {
    const mesh = new THREE.InstancedMesh(unitPlane,material(batch.word,batch.color),batch.entries.length);
    batch.entries.forEach((s,i) => {
      dummy.position.set(s.x,s.y,s.z); dummy.rotation.set(s.rx,s.ry,0);
      dummy.scale.set(s.w,s.h,1); dummy.updateMatrix(); mesh.setMatrixAt(i,dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere(); mesh.renderOrder = 1; scene.add(mesh);
  }
}
function box(w,h,d,x,y,z,mat) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
  mesh.position.set(x,y,z); scene.add(mesh); return mesh;
}
function scenery() {
  box(6.9,.12,45,0,-.12,-15.15,floorMat);
  box(.22,3.26,45,-3.38,1.61,-15.15,wallMat);
  box(.22,3.26,45,3.38,1.61,-15.15,wallMat);
  box(6.9,.12,45,0,3.27,-15.15,wallMat);
  box(6.9,3.26,.2,0,1.61,7.05,wallMat);
  box(6.9,3.26,.2,0,1.61,-37.55,wallMat);
  // The final barrier remains solid in the world rules until its name is repaired.
  box(2.25,3.26,.24,-2.32,1.61,-30.15,wallMat);
  box(2.25,3.26,.24,2.32,1.61,-30.15,wallMat);
  box(2.4,.54,.2,0,2.99,-30.15,wallMat);
  doorMesh = box(2.38,2.69,.17,0,1.37,-30.15,warnMat);
  doorWord = label('벽','#e66a77',0,1.65,-30.037,0,0,1.32,.89);
  label('출구','#e8d7ad',0,2.4,-35.5,0,0,1.7,.78);
  label('기록 종료','#8c9dab',0,1.6,-37.37,0,0,2.5,.65);
  for (let z=5.8;z>-36.8;z-=1.5) {
    for (let y=.52;y<3.04;y+=.79) {
      stamp('벽','#a3adb9',-3.245,y,z,0,Math.PI/2,.68,.44);
      stamp('벽','#929ca9',3.245,y,z,0,-Math.PI/2,.68,.44);
    }
  }
  for (let z=5.5;z>-36.6;z-=1.65) {
    for (let x=-2.55;x<2.9;x+=1.35) {
      stamp('바닥','#87929f',x,.014,z,-Math.PI/2,0,1.03,.50);
    }
  }
  for (let z=5.5;z>-36.4;z-=2.1) {
    for (let x=-2.25;x<2.7;x+=1.48) stamp('천장','#757e8d',x,3.19,z,Math.PI/2,0,1.05,.48);
  }
  for (let x=-2.6;x<=2.7;x+=1.38) {
    for (let y=.65;y<3;y+=.78) {
      stamp('벽','#8995a2',x,y,6.91,0,0,.65,.48);
      stamp('벽','#8e99a7',x,y,-37.40,0,0,.65,.48);
    }
  }
  // Just enough invisible architecture to communicate a space without normal 3D assets.
  for (let z=3.8;z>-35;z-=5.8) {
    box(.035,3.18,.045,-3.22,1.59,z,trimMat);
    box(.035,3.18,.045,3.22,1.59,z,trimMat);
    box(6.65,.04,.08,0,3.11,z,trimMat);
  }
  // Management station: legible computer/desk names and a clickable record.
  box(1.6,.13,1.15,-2.15,.92,2.04,propMat);
  box(.08,.89,.08,-2.75,.45,2.55,trimMat);
  box(.08,.89,.08,-1.53,.45,2.55,trimMat);
  box(.9,.76,.1,-2.15,1.50,1.94,trimMat);
  label('컴퓨터','#e3d2a0',-2.13,1.7,2.005,0,0,1.15,.47);
  label('책상','#aa9f94',-2.15,1.00,2.06,-Math.PI/2,0,1.1,.52);
  label('기록','#d7b786',-1.02,1.65,1.20,0,0,.90,.52);
  // A first harmless typographical anomaly before the hostile encounter.
  label('의ㅈㅏ','#8b8590',-3.23,1.3,-5.5,0,Math.PI/2,1.18,.62);
  label('아무것도 없다','#666771',3.23,1.9,-8,0,-Math.PI/2,2.0,.50);
  // Lockers are decorative word shapes, while rules control where one can hide.
  R.LOCKERS.forEach((loc,i) => {
    box(.56,2.35,1.05,loc.x>0?3.07:-3.07,1.16,loc.z,propMat);
    const forwardZ = loc.z + .62;
    label('사물함','#c5bda8',loc.x,2.08,forwardZ,0,0,1.21,.57);
    label('숨기','#c9a774',loc.x,1.4,forwardZ+.012,0,0,.9,.48);
    if(i===0) label('발소리','#747b83',3.23,2.43,-18.0,0,-Math.PI/2,1.38,.62);
  });
  personWord = label('사람','#afb7c1',0,1.7,-17.3,0,0,1.1,.60);
  monsterWord = label('무언가','#d65368',0,1.7,-17.29,0,0,1.86,.82);
  monsterWord.visible = false;
  label('문이었던 것','#a9a0a2',-2.70,1.82,-29.2,0,Math.PI/2,1.5,.55);
  label('벽이 아니다','#b5a5a9',2.70,1.82,-29.2,0,-Math.PI/2,1.65,.55);
  buildStamps();
  enemyGroup = new THREE.Group(); scene.add(enemyGroup);
  [['사람','#9499a4',0,2.15,1.0,.43],['무언가','#f16b7c',0,1.58,1.85,.75],
    ['사람사람','#ae3a52',-.28,1.04,1.8,.50],['무언가','#ca4e62',.11,.58,1.55,.52],
    ['발소리','#b2a5ac',0,.17,1.15,.42]].forEach(v=>{
    const m = new THREE.Mesh(unitPlane,material(v[0],v[1]));
    m.position.set(v[2],v[3],0);m.scale.set(v[4],v[5],1);
    enemyGroup.add(m);
  });
  enemyGroup.visible = false;
}
scenery();

function announce(text, red=false, seconds=3.6) {
  hud.message.textContent=text; hud.message.classList.toggle('red',red);
  hud.message.classList.add('show'); messageEnd=elapsed+seconds;
}
function tone(freq, duration=.10, kind='sine', volume=.035) {
  if (!audioCtx || muted) return;
  const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();
  osc.type=kind;osc.frequency.value=freq;
  gain.gain.setValueAtTime(Math.max(.0001,volume),audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+duration);
  osc.connect(gain);gain.connect(audioCtx.destination);
  osc.start();osc.stop(audioCtx.currentTime+duration+.005);
}
function audioStart() {
  try { const C=window.AudioContext||window.webkitAudioContext;
    if(C){audioCtx=audioCtx||new C();audioCtx.resume().catch(()=>{});}
  } catch (_) {}
}
function shock() {tone(86,.46,'sawtooth',.095);tone(43,.72,'sine',.080);}
function updateStage(stage,old) {
  if (stage === old) return;
  hud.objective.textContent=R.objective(state);
  if(stage==='chase') {
    monsterReveal=true;personWord.visible=false;monsterWord.visible=true;
    shock();announce('뒤를 돌아보지 마세요. 달리세요.',true,4.4);
    hud.stage.textContent='경고 · 이름 불명의 존재 감지';
  } else if(stage==='hiding') {
    document.body.classList.add('hidden-in-locker');
    tone(120,.22,'triangle',.05);announce('쉿. 가만히 기다리세요.',false,2.3);
    hud.stage.textContent='사물함 내부 · 숨소리를 죽이세요';
  } else if(stage==='door') {
    announce('발소리가 멀어졌습니다.',false,2.9);
    hud.stage.textContent='복구해야 할 이름: 벽';
  } else if(stage==='exit') {
    scene.remove(doorMesh);doorMesh.geometry.dispose();
    scene.remove(doorWord);
    doorWord=label('문','#d6cfbc',0,2.55,-30.028,0,0,1.6,.55);
    announce('현실이 다시 열렸습니다.',false,3.0);tone(523,.25,'sine',.07);
    hud.stage.textContent='기록보관소 · 탈출 통로 열림';
    try{window.KidscadeGame?.milestone?.('ota_door_fixed',{uniqueKey:'ota-prologue'});}catch(_){}
  } else if(stage==='lost') {
    finish(false);
  } else if(stage==='won') {
    finish(true);
  }
}
function syncStage(before) {updateStage(state.stage,before);}
function interact() {
  if(!started || failed || !overlays.fix.classList.contains('closed')) return;
  const action=R.getInteraction(state,player);
  if(!action) return;
  const before=state.stage;
  if(action.type==='console') {
    if(R.inspectConsole(state,player)) {
      announce('복도의 사람을 확인하십시오.',false,3.8);
      hud.stage.textContent='문서 01 · 사물의 이름은 사실이어야 한다';
      tone(330,.09,'triangle');tone(440,.20,'triangle');
    }
  } else if(action.type==='hide') {
    if(R.enterLocker(state,player)) {
      player.moving=false;
      if(document.pointerLockElement===canvas) document.exitPointerLock?.();
    }
  } else if(action.type==='leave') {
    if(R.leaveLocker(state)) {
      document.body.classList.remove('hidden-in-locker');
      announce('이제 문을 찾으세요.',false,2.2);
    }
  } else if(action.type==='repair') {
    overlays.fix.classList.remove('closed');
    if(document.pointerLockElement===canvas)document.exitPointerLock?.();
  }
  syncStage(before);
}
function finish(won) {
  if(failed) return;
  failed=true;
  if(document.pointerLockElement===canvas) document.exitPointerLock?.();
  overlays.ending.classList.remove('closed');
  el('endingSub').textContent=won?'제0기록보관소 / 생존':'기록 파손 / 이름 없음';
  el('endingTitle').textContent=won?'당신의 이름이 남았습니다':'당신의 이름이 지워졌습니다';
  el('endingText').textContent=won
    ? '첫 번째 기록을 복구하고 탈출했습니다. 경과 시간 '+Math.round(state.time)+'초 · 잘못된 수정 '+state.mistakes+'회'
    : '복도의 존재에게 붙잡혔습니다. 사물함에 몸을 숨긴 뒤 발소리가 사라질 때까지 기다리세요.';
  try {window.KidscadeGame?.result?.({scope:'stage',status:won?'completed':'failed',
    outcome:won?'clear':'fail',id:'ota-prologue',score:won?Math.max(100,1000-Math.floor(state.time)*3-state.mistakes*80):0,
    seconds:Math.round(state.time),mistakes:state.mistakes});}catch(_){}
}
function updatePrompt() {
  currentInteraction=R.getInteraction(state,player);
  hud.prompt.classList.toggle('show',!!currentInteraction&&!failed);
  hud.prompt.innerHTML=currentInteraction
    ? '<strong>E</strong> / 조사 — '+currentInteraction.label : '';
  hud.action.textContent=currentInteraction?currentInteraction.label:'조사';
}
function setCamera() {
  camera.position.set(player.x,state.hidden?1.5:1.65+(player.moving?.018*Math.sin(elapsed*11):0),player.z);
  camera.rotation.set(player.pitch,player.yaw,0);
}
function tryMove(dx,dz) {
  const nx=player.x+dx,nz=player.z+dz;
  if(R.canMove(state,nx,player.z))player.x=nx;
  if(R.canMove(state,player.x,nz))player.z=nz;
}
function update(dt) {
  elapsed+=dt;
  const before=state.stage;
  if(!state.hidden && state.stage!=='won' && state.stage!=='lost') {
    const f=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)
      -(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-joystick.y;
    const side=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)
      -(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+joystick.x;
    const len=Math.hypot(f,side),isRun=keys.has('ShiftLeft')||keys.has('ShiftRight')||mobileRun;
    player.moving=len>.06;
    if(player.moving) {
      const speed=isRun?4.85:2.67;
      const ff=f/Math.max(1,len),ss=side/Math.max(1,len);
      tryMove((-Math.sin(player.yaw)*ff+Math.cos(player.yaw)*ss)*speed*dt,
        (-Math.cos(player.yaw)*ff-Math.sin(player.yaw)*ss)*speed*dt);
      stepsUntil-=dt;
      if(stepsUntil<=0){tone(isRun?105:73,.055,'triangle',isRun?.024:.013);stepsUntil=isRun?.23:.43;}
    } else stepsUntil=0;
  }
  R.triggerMonster(state,player);
  R.stepEnemy(state,dt,player);
  if(state.stage==='exit')R.tryFinish(state,player);
  syncStage(before);
  if(messageEnd<elapsed)hud.message.classList.remove('show');
  if(state.monster.active) {
    enemyGroup.visible=true;
    enemyGroup.position.set(state.monster.x,0,state.monster.z);
    enemyGroup.lookAt(camera.position.x,1.4,camera.position.z);
    enemyGroup.position.y=Math.sin(elapsed*5)*.07;
    enemyGroup.children[1].position.x=Math.sin(elapsed*14)*.07;
    const d=R.distance(player,state.monster);
    const pulse=(Math.sin(elapsed*7)+1)*.09;
    hud.danger.style.opacity=String(Math.min(.82,Math.max(.08,1-d/11)+pulse));
    hud.noise.style.opacity=String(Math.min(.45,Math.max(0,1-d/8)*.33));
    if(d<5 && Math.floor(elapsed*2.1)!==Math.floor((elapsed-dt)*2.1))tone(57,.12,'sine',.065);
  } else {
    enemyGroup.visible=false;hud.danger.style.opacity='0';
    hud.noise.style.opacity=state.stage==='hiding'?'0.07':'0';
  }
  setCamera();updatePrompt();
}
function look(dx,dy) {
  if(state.hidden || !overlays.fix.classList.contains('closed'))return;
  player.yaw-=dx*.0036;
  player.pitch=Math.max(-.76,Math.min(.76,player.pitch-dy*.0031));
}
function animate(now) {
  requestAnimationFrame(animate);
  const dt=Math.min(.05,Math.max(0,(now-lastFrame)/1000||0));lastFrame=now;
  if(started && !failed && document.visibilityState!=='hidden' && overlays.fix.classList.contains('closed'))update(dt);
  else setCamera();
  renderer.render(scene,camera);
}
function resize() {
  const w=window.innerWidth,h=window.innerHeight;
  renderer.setSize(w,h,false);camera.aspect=w/Math.max(1,h);camera.updateProjectionMatrix();
}
window.addEventListener('resize',resize);
document.addEventListener('visibilitychange',()=>{lastFrame=performance.now();});
function begin() {
  overlays.intro.classList.add('closed');started=true;audioStart();
  try{window.KidscadeGame?.start?.();}catch(_){}
  announce('컴퓨터 기록부터 확인하세요.',false,3.2);
  if(!touchDevice)canvas.requestPointerLock?.().catch?.(()=>{});
}
el('start').addEventListener('click',begin);
el('replay').addEventListener('click',()=>location.reload());
el('mute').addEventListener('click',()=>{
  muted=!muted;el('mute').textContent=muted?'소리 꺼짐':'소리 켜짐';
});
document.addEventListener('keydown',e=>{
  if(['KeyW','KeyA','KeyS','KeyD','ShiftLeft','ShiftRight','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();
  keys.add(e.code);
  if(e.code==='KeyE'&&!e.repeat)interact();
});
document.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>{keys.clear();mobileRun=false;joystick.x=0;joystick.y=0;el('knob').style.transform='translate(0,0)';});
document.addEventListener('mousemove',e=>{
  if(document.pointerLockElement===canvas&&started&&!failed)look(e.movementX,e.movementY);
});
canvas.addEventListener('pointerdown',e=>{
  if(!started||failed)return;
  if(e.pointerType==='mouse') {
    if(document.pointerLockElement!==canvas)canvas.requestPointerLock?.().catch?.(()=>{});
  }else{lookPointer={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);}
});
canvas.addEventListener('pointermove',e=>{
  if(lookPointer?.id!==e.pointerId)return;
  look(e.clientX-lookPointer.x,e.clientY-lookPointer.y);
  lookPointer.x=e.clientX;lookPointer.y=e.clientY;
});
function stopLook(e){if(lookPointer?.id===e.pointerId)lookPointer=null;}
canvas.addEventListener('pointerup',stopLook);canvas.addEventListener('pointercancel',stopLook);
const stick=el('stick'),knob=el('knob');
function moveStick(e) {
  const r=stick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
  const radius=r.width*.35,dx=e.clientX-cx,dy=e.clientY-cy;
  const m=Math.max(1,Math.hypot(dx,dy)/radius);
  joystick.x=dx/(radius*m);joystick.y=dy/(radius*m);
  knob.style.transform='translate('+(joystick.x*radius)+'px,'+(joystick.y*radius)+'px)';
}
stick.addEventListener('pointerdown',e=>{joystickPointer=e.pointerId;stick.setPointerCapture(e.pointerId);moveStick(e);});
stick.addEventListener('pointermove',e=>{if(joystickPointer===e.pointerId)moveStick(e);});
function endStick(e) {
  if(joystickPointer!==e.pointerId)return;
  joystickPointer=null;joystick.x=0;joystick.y=0;knob.style.transform='translate(0,0)';
}
stick.addEventListener('pointerup',endStick);stick.addEventListener('pointercancel',endStick);
el('action').addEventListener('click',interact);
const run=el('run');
run.addEventListener('pointerdown',e=>{mobileRun=true;run.setPointerCapture(e.pointerId);});
run.addEventListener('pointerup',()=>{mobileRun=false;});
run.addEventListener('pointercancel',()=>{mobileRun=false;});
for(const choice of el('choices').querySelectorAll('button')) {
  choice.addEventListener('click',()=>{
    const before=state.stage;
    if(R.repairDoor(state,choice.dataset.word,player)) {
      overlays.fix.classList.add('closed');syncStage(before);
      el('fixFeedback').textContent='주변의 기록을 기억하세요.';
    } else {
      el('fixFeedback').textContent='틀렸습니다. 벽이 가로막고 있습니다.';
      tone(150,.21,'sawtooth',.042);
    }
  });
}
window.OtaDebug = Object.freeze({
  snapshot:()=>({stage:state.stage,doorFixed:state.doorFixed,hidden:state.hidden,
    monster:{...state.monster},player:{x:player.x,z:player.z},mistakes:state.mistakes})
});
resize();setCamera();requestAnimationFrame(animate);

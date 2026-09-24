import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const approach=(v,target,amount)=>v<target?Math.min(target,v+amount):Math.max(target,v-amount);
const deg=r=>r*180/Math.PI;
const rad=d=>d*Math.PI/180;
const normAngle=a=>Math.atan2(Math.sin(a),Math.cos(a));

const ui={
  canvas:document.querySelector('#game'),
  start:document.querySelector('#start'),result:document.querySelector('#result'),
  startBtn:document.querySelector('#startBtn'),retryBtn:document.querySelector('#retryBtn'),
  examMode:document.querySelector('#examMode'),score:document.querySelector('#score'),
  instruction:document.querySelector('#instruction'),subInstruction:document.querySelector('#subInstruction'),
  speed:document.querySelector('#speed'),rpm:document.querySelector('#rpm'),gearReadout:document.querySelector('#gearReadout'),
  lampLeft:document.querySelector('#lampLeft'),lampRight:document.querySelector('#lampRight'),lampBrake:document.querySelector('#lampBrake'),
  mirrorLeft:document.querySelector('#mirrorLeft'),mirrorRight:document.querySelector('#mirrorRight'),
  steeringPad:document.querySelector('#steeringPad'),steeringWheel:document.querySelector('#steeringWheel'),steerKnob:document.querySelector('#steerKnob'),
  signalLeft:document.querySelector('#signalLeft'),signalRight:document.querySelector('#signalRight'),
  ignition:document.querySelector('#ignition'),seatbelt:document.querySelector('#seatbelt'),parkingBrake:document.querySelector('#parkingBrake'),
  autoGate:document.querySelector('#autoGate'),manualGate:document.querySelector('#manualGate'),
  autoKnob:document.querySelector('#autoKnob'),manualKnob:document.querySelector('#manualKnob'),
  clutchPedal:document.querySelector('#clutchPedal'),brakePedal:document.querySelector('#brakePedal'),throttlePedal:document.querySelector('#throttlePedal'),
  toast:document.querySelector('#toast'),
  resultTitle:document.querySelector('#resultTitle'),finalScore:document.querySelector('#finalScore'),resultRows:document.querySelector('#resultRows')
};

let license='auto',mode='practice',gameState='menu',stage='PREP',score=100;
let scene,renderer,camera,leftMirrorCamera,rightMirrorCamera,loader,clock;
let signalRedMat,signalGreenMat,signalGreen=false;
let lastTime=performance.now(),accumulator=0,gameTime=0,toastTimer=0;
let holdTimer=0,stallTimer=0,offroadTimer=0,emergencyTimer=0;
let hillStopped=false,accelOk=false,emergencyTriggered=false,parkingComplete=false,parkingReverseSeen=false;
let deductions=[];
let headYaw=0,headPitch=0,lookPointer=null,lookLastX=0,lookLastY=0;
const keys=new Set();

const touch={steer:0,throttle:0,brake:0,clutch:0};
const pedalPointers={throttle:null,brake:null,clutch:null};

const car={
  x:0,z:73,y:0,yaw:0,pitch:0,speed:0,
  steeringWheel:0,wheelAngle:0,
  engine:false,rpm:0,gear:'P',
  parkingBrake:true,seatbelt:false,signal:0
};

const audio={ctx:null,engine:null,gain:null};
function initAudio(){
  if(audio.ctx){audio.ctx.resume?.();return}
  try{
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
    audio.ctx=new AC();audio.engine=audio.ctx.createOscillator();audio.gain=audio.ctx.createGain();
    audio.engine.type='sawtooth';audio.engine.frequency.value=45;audio.gain.gain.value=.0001;
    audio.engine.connect(audio.gain).connect(audio.ctx.destination);audio.engine.start();
  }catch(_){}
}
function beep(freq=760,dur=.1,vol=.05){
  if(!audio.ctx)return;
  const o=audio.ctx.createOscillator(),g=audio.ctx.createGain(),t=audio.ctx.currentTime;
  o.type='square';o.frequency.value=freq;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  o.connect(g).connect(audio.ctx.destination);o.start(t);o.stop(t+dur+.02);
}
function updateAudio(){
  if(!audio.ctx||!audio.engine||!audio.gain)return;
  const t=audio.ctx.currentTime;
  audio.engine.frequency.setTargetAtTime(car.engine?45+car.rpm*.035:28,t,.05);
  audio.gain.gain.setTargetAtTime(gameState==='playing'&&car.engine?.018+.012*clamp(car.rpm/4000,0,1):.0001,t,.07);
}

function showToast(text,tone='normal',seconds=1.8){
  ui.toast.textContent=text;ui.toast.className='show'+(tone==='normal'?'':' '+tone);toastTimer=seconds;
}
function setInstruction(main,sub=''){
  ui.instruction.textContent=main;ui.subInstruction.textContent=sub;
}
function addDeduction(label,points){
  if(mode!=='exam'){showToast(label,'warn');beep(520,.08,.035);return}
  score=Math.max(0,score-points);deductions.push({label,points});ui.score.textContent=score;
  showToast('감점되었습니다.','danger',1.5);beep(260,.18,.07);
}
function finishRun(){
  if(gameState!=='playing')return;
  gameState='result';car.speed=0;
  const passed=mode==='practice'||score>=80;
  ui.resultTitle.textContent=mode==='practice'?'연습 완료':passed?'합격':'불합격';
  ui.finalScore.textContent=mode==='practice'?'코스 완주':score+'점';
  ui.resultRows.innerHTML='';
  if(mode==='practice'){
    for(const t of ['경사로 정차','신호교차로 우회전','T자 후진주차','가속구간','급정지']){
      const row=document.createElement('div');row.className='result-row';row.innerHTML='<b>'+t+'</b><span>연습 완료</span>';ui.resultRows.append(row);
    }
  }else if(deductions.length){
    for(const d of deductions){const row=document.createElement('div');row.className='result-row';row.innerHTML='<b>'+d.label+'</b><span>-'+d.points+'점</span>';ui.resultRows.append(row)}
  }else{
    const row=document.createElement('div');row.className='result-row';row.innerHTML='<b>감점 없음</b><span>완벽한 주행</span>';ui.resultRows.append(row);
  }
  ui.result.classList.add('show');beep(passed?880:220,.35,.07);
  try{localStorage.setItem('driverLicenseBest',String(Math.max(Number(localStorage.getItem('driverLicenseBest')||0),score)))}catch(_){}
}

function groundHeight(x,z){
  if(Math.abs(x)>5)return 0;
  if(z<=60&&z>=50)return (60-z)*.2;
  if(z<50&&z>=40)return (z-40)*.2;
  return 0;
}
function groundDz(x,z){
  if(Math.abs(x)>5)return 0;
  if(z<=60&&z>=50)return -.2;
  if(z<50&&z>=40)return .2;
  return 0;
}
function isOnRoad(x,z){
  const vertical=Math.abs(x)<=4.55&&z>=14&&z<=82;
  const horizontal=Math.abs(z-20)<=4.7&&x>=-5&&x<=120;
  const parking=x>=35&&x<=49&&z>=24&&z<=42;
  const connector=x>=37&&x<=47&&z>=20&&z<=27;
  return vertical||horizontal||parking||connector;
}
function currentDirection(){
  if(license==='auto')return car.gear==='D'?1:car.gear==='R'?-1:0;
  return car.gear===-1?-1:(Number(car.gear)>0?1:0);
}
function gearText(){return license==='auto'?String(car.gear):(car.gear===-1?'R':car.gear===0?'N':String(car.gear))}
function resetCar(){
  Object.assign(car,{x:0,z:73,y:0,yaw:0,pitch:0,speed:0,steeringWheel:0,wheelAngle:0,engine:false,rpm:0,gear:license==='auto'?'P':0,parkingBrake:true,seatbelt:false,signal:0});
  touch.steer=touch.throttle=touch.brake=touch.clutch=0;
  gameTime=0;holdTimer=stallTimer=offroadTimer=emergencyTimer=0;
  hillStopped=accelOk=emergencyTriggered=parkingComplete=parkingReverseSeen=false;car._redPenalized=false;car._rightPenalized=false;car._emergencyPenalized=false;score=100;deductions=[];stage='PREP';
  headYaw=headPitch=0;ui.score.textContent=mode==='exam'?'100':'연습';
  updateControlVisibility();updateGearVisual();updateButtonVisuals();
}
function startGame(){
  initAudio();gameState='playing';resetCar();ui.start.classList.remove('show');ui.result.classList.remove('show');
  ui.examMode.textContent=(license==='auto'?'2종 자동':'1종 보통')+' · '+(mode==='exam'?'기능시험':'연습');
  setInstruction('안전띠를 매고 시동을 거세요.',license==='auto'?'브레이크를 밟고 D에 놓은 뒤 주차브레이크를 해제합니다.':'클러치를 밟고 1단에 넣은 뒤 주차브레이크를 해제합니다.');
  showToast('운전석 준비 완료');
}
function selectOptions(){
  document.querySelectorAll('[data-license]').forEach(btn=>btn.addEventListener('click',()=>{
    license=btn.dataset.license;document.querySelectorAll('[data-license]').forEach(b=>b.classList.toggle('selected',b===btn));
  }));
  document.querySelectorAll('[data-mode]').forEach(btn=>btn.addEventListener('click',()=>{
    mode=btn.dataset.mode;document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('selected',b===btn));
  }));
  ui.startBtn.addEventListener('click',startGame);
  ui.retryBtn.addEventListener('click',()=>{ui.result.classList.remove('show');ui.start.classList.add('show');gameState='menu'});
}

function makeBox(w,h,d,color,x,y,z,rough=.86){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:rough}));
  m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);return m;
}
function makeFlat(w,d,color,x,z,y=.035){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,.07,d),new THREE.MeshStandardMaterial({color,roughness:.98}));
  m.position.set(x,y,z);m.receiveShadow=true;scene.add(m);return m;
}
function makeRoadSegment(w,d,x,z,y,rx=0){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,.18,d),new THREE.MeshStandardMaterial({color:0x4d5559,roughness:1}));
  m.position.set(x,y,z);m.rotation.x=rx;m.receiveShadow=true;scene.add(m);return m;
}
function line(w,d,x,z,color=0xf1ead4,y=.14){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,.025,d),new THREE.MeshBasicMaterial({color}));
  m.position.set(x,y,z);scene.add(m);return m;
}
function textSprite(text,color='#ffffff',bg='rgba(17,28,34,.86)'){
  const c=document.createElement('canvas');c.width=512;c.height=160;const x=c.getContext('2d');
  x.fillStyle=bg;x.fillRect(8,15,496,130);x.strokeStyle='rgba(255,255,255,.6)';x.lineWidth=6;x.strokeRect(8,15,496,130);
  x.fillStyle=color;x.font='900 54px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(text,256,80);
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true}));s.scale.set(5.2,1.62,1);return s;
}
function addSign(text,x,z,rotation=0){
  const post=makeBox(.12,1.8,.12,0x5c666a,x,.9,z);post.castShadow=false;
  const s=textSprite(text);s.position.set(x,2.15,z);scene.add(s);return s;
}
function buildCourse(){
  const grass=new THREE.Mesh(new THREE.PlaneGeometry(260,190),new THREE.MeshStandardMaterial({color:0x6da768,roughness:1}));
  grass.rotation.x=-Math.PI/2;grass.receiveShadow=true;scene.add(grass);

  makeRoadSegment(9,22,0,71,0);
  const ang=Math.atan(.2);
  makeRoadSegment(9,10,0,55,1,-ang);
  makeRoadSegment(9,10,0,45,1,ang);
  makeRoadSegment(9,26,0,27,0);
  makeRoadSegment(120,9,57.5,20,0);
  makeFlat(14,19,0x565e61,42,33,.05);
  makeFlat(12,6,0x565e61,42,26,.05);

  for(let z=78;z>=18;z-=8){if(z<61&&z>39)continue;line(.15,3.7,-.2,z,0xe2d061,.14)}
  for(let x=8;x<=116;x+=8)line(3.8,.15,x,20,0xe2d061,.14);
  line(9,.34,0,29,0xffffff,.16);
  line(.34,9,58,20,0xffffff,.16);
  line(.34,9,88,20,0xffffff,.16);
  line(.34,9,108,20,0xffffff,.16);

  const white=0xffffff;
  line(12,.22,42,25.4,white,.16);line(12,.22,42,40.5,white,.16);
  line(.22,15,36.1,33,white,.16);line(.22,15,47.9,33,white,.16);
  line(.22,12,39.2,33,white,.17);line(.22,12,44.8,33,white,.17);line(5.8,.22,42,38.7,white,.17);

  for(let z=64;z<=80;z+=4){makeBox(.25,.35,.25,0xf07c34,-5.2,.18,z).rotation.y=Math.PI/4;makeBox(.25,.35,.25,0xf07c34,5.2,.18,z).rotation.y=Math.PI/4}
  for(let x=32;x<=51;x+=3){makeBox(.24,.34,.24,0xf07c34,x,.17,42.7).rotation.y=Math.PI/4}

  addSign('경사로',-6.8,55);addSign('신호 우회전',-6.8,31);addSign('T자 주차',42,44);
  addSign('20km/h 이상',70,26);addSign('급정지',95,26);addSign('종료',112,26);

  const pole=makeBox(.18,4,.18,0x3a4347,4.6,2,25.6);pole.castShadow=false;
  const housing=makeBox(.85,1.8,.55,0x202628,4.6,3.55,25.6);
  signalRedMat=new THREE.MeshStandardMaterial({color:0x501818,emissive:0x240000});
  signalGreenMat=new THREE.MeshStandardMaterial({color:0x17431f,emissive:0x001e08});
  const red=new THREE.Mesh(new THREE.SphereGeometry(.23,16,12),signalRedMat);red.position.set(4.6,3.9,25.25);scene.add(red);
  const green=new THREE.Mesh(new THREE.SphereGeometry(.23,16,12),signalGreenMat);green.position.set(4.6,3.25,25.25);scene.add(green);

  const stopMark=textSprite('정지선','#ffffff','rgba(180,34,34,.88)');stopMark.position.set(-6,1.15,29);stopMark.scale.set(3.2,1,1);scene.add(stopMark);
  const parkArrow=textSprite('후진 →','#ffffff','rgba(38,97,122,.88)');parkArrow.position.set(42,1.25,27);parkArrow.scale.set(3.4,1.05,1);scene.add(parkArrow);

  for(const [x,z] of [[-16,72],[-18,45],[-18,18],[15,33],[28,49],[58,47],[82,45],[105,45],[123,18],[75,-6],[27,-10]]){
    const trunk=makeBox(.38,2.2,.38,0x78543d,x,1.1,z);trunk.castShadow=false;
    const crown=new THREE.Mesh(new THREE.SphereGeometry(1.55,10,8),new THREE.MeshStandardMaterial({color:0x4d8b55,roughness:1}));crown.position.set(x,3,z);crown.castShadow=true;scene.add(crown);
  }
  for(const [x,z,c] of [[-12,8,0xd7c09e],[20,51,0xbfcde2],[55,57,0xe2bbb5],[92,56,0xc9d3b0],[118,50,0xd8c7e5]]){
    makeBox(10,5.5,9,c,x,2.75,z);const roof=makeBox(10.7,.8,9.7,0x554c48,x,5.9,z);roof.rotation.y=.02;
  }
}
async function loadDecorAssets(){
  const base='../../assets/game/3d/vehicles/kenney-car-kit/';
  const load=(file,pos,scale=1,rot=0)=>new Promise(resolve=>{
    loader.load(base+file,g=>{
      const root=g.scene;root.position.set(pos[0],pos[1],pos[2]);root.scale.setScalar(scale);root.rotation.y=rot;
      root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});scene.add(root);resolve(true)
    },undefined,()=>resolve(false));
  });
  await Promise.all([
    load('sedan.glb',[-10,0,17],1.05,Math.PI/2),
    load('taxi.glb',[79,0,31],1.05,Math.PI),
    load('suv.glb',[102,0,8],1.05,0)
  ]);
}
function initScene(){
  scene=new THREE.Scene();scene.background=new THREE.Color(0x9bc8df);scene.fog=new THREE.Fog(0x9bc8df,85,190);
  renderer=new THREE.WebGLRenderer({canvas:ui.canvas,antialias:true,powerPreference:'high-performance'});
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  camera=new THREE.PerspectiveCamera(63,innerWidth/Math.max(1,innerHeight),.05,240);
  leftMirrorCamera=new THREE.PerspectiveCamera(55,2,.05,180);rightMirrorCamera=new THREE.PerspectiveCamera(55,2,.05,180);
  scene.add(new THREE.HemisphereLight(0xdff5ff,0x536f45,2.1));
  const sun=new THREE.DirectionalLight(0xffefcf,2.25);sun.position.set(35,58,20);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-90;sun.shadow.camera.right=130;sun.shadow.camera.top=90;sun.shadow.camera.bottom=-90;scene.add(sun);
  buildCourse();loader=new GLTFLoader();loadDecorAssets();resize();
}

function updateSignal(){
  signalGreen=(gameTime%10)>=4;
  if(signalRedMat){signalRedMat.color.set(signalGreen?0x381717:0xff3232);signalRedMat.emissive.set(signalGreen?0x170000:0xff1414);signalRedMat.emissiveIntensity=signalGreen?.3:1.5}
  if(signalGreenMat){signalGreenMat.color.set(signalGreen?0x2bea57:0x173e1d);signalGreenMat.emissive.set(signalGreen?0x16ff46:0x001407);signalGreenMat.emissiveIntensity=signalGreen?1.4:.25}
}

function inputState(){
  const steerKey=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0);
  return{
    steer:steerKey||touch.steer,
    throttle:Math.max(touch.throttle,keys.has('KeyW')||keys.has('ArrowUp')?1:0),
    brake:Math.max(touch.brake,keys.has('KeyS')||keys.has('ArrowDown')?1:0),
    clutch:Math.max(touch.clutch,keys.has('KeyC')?1:0)
  };
}
function physicsStep(dt){
  if(gameState!=='playing')return;
  gameTime+=dt;updateSignal();
  const inp=inputState();

  car.steeringWheel=clamp(car.steeringWheel+inp.steer*270*dt,-540,540);
  if(Math.abs(inp.steer)<.04&&Math.abs(car.speed)>.5)car.steeringWheel=approach(car.steeringWheel,0,Math.abs(car.speed)*5.5*dt);
  car.wheelAngle=rad(car.steeringWheel/540*35);

  const dir=currentDirection();
  let drive=0;
  if(car.engine&&dir){
    if(license==='auto'){
      const creep=inp.throttle<.04&&inp.brake<.04?.58*(1-clamp(Math.abs(car.speed)/1.75,0,1)):0;
      drive=(inp.throttle*4.3+creep)*dir;
      const target=800+Math.abs(car.speed)*260+inp.throttle*2100;
      car.rpm=lerp(car.rpm,clamp(target,760,4300),clamp(dt*4,0,1));
    }else{
      const clutchEngage=1-inp.clutch;
      const g=Math.abs(Number(car.gear));const power=[0,4.6,3.8,3.25,2.8,2.45][g]||3.4;
      drive=(inp.throttle*power+.5*Math.max(0,clutchEngage-.55))*clutchEngage*dir;
      const ratio=[0,3.4,2.15,1.55,1.2,1][g]||3.1;
      const wheelRpm=Math.abs(car.speed)*ratio*310;
      const target=clutchEngage>.22?Math.max(700,wheelRpm):800+inp.throttle*2600;
      car.rpm=lerp(car.rpm,clamp(target,0,4800),clamp(dt*5,0,1));
      if(car.gear!==0&&clutchEngage>.86&&Math.abs(car.speed)<.45&&inp.throttle<.14){
        stallTimer+=dt;if(stallTimer>.55){car.engine=false;car.rpm=0;stallTimer=0;showToast('시동이 꺼졌습니다.','warn');beep(170,.25,.06)}
      }else stallTimer=0;
    }
  }else car.rpm=lerp(car.rpm,car.engine?800:0,clamp(dt*4,0,1));

  const forwardZ=-Math.cos(car.yaw),dydz=groundDz(car.x,car.z),gradeAlong=dydz*forwardZ;
  const gravity=-9.81*gradeAlong;
  let accel=drive+gravity;
  if(car.parkingBrake)car.speed=approach(car.speed,0,9*dt);
  else if(inp.brake>.01)car.speed=approach(car.speed,0,(1.4+inp.brake*7.5)*dt);
  else{
    car.speed+=accel*dt;
    const drag=(.09+Math.abs(car.speed)*.045)*dt;car.speed=approach(car.speed,0,drag);
  }
  if(!dir&&Math.abs(gradeAlong)>.03&&!car.parkingBrake&&inp.brake<.05)car.speed+=gravity*dt;
  car.speed=clamp(car.speed,-5.5,12.5);
  if(Math.abs(car.speed)<.015)car.speed=0;

  if(Math.abs(car.speed)>.02){
    car.yaw=normAngle(car.yaw+(car.speed/2.62)*Math.tan(car.wheelAngle)*dt);
    car.x+=Math.sin(car.yaw)*car.speed*dt;
    car.z-=Math.cos(car.yaw)*car.speed*dt;
  }
  car.y=groundHeight(car.x,car.z);
  car.pitch=Math.atan(groundDz(car.x,car.z)*(-Math.cos(car.yaw)));

  if(!isOnRoad(car.x,car.z)&&Math.abs(car.speed)>.7){
    offroadTimer+=dt;if(offroadTimer>1.3){addDeduction('차로 이탈',5);offroadTimer=-2}
  }else offroadTimer=Math.max(0,offroadTimer-dt*2);
  if(offroadTimer<0){offroadTimer+=dt;if(offroadTimer>=0)offroadTimer=0}

  examStep(dt,inp);
  updateAudio();
}

function readyGear(){return license==='auto'?car.gear==='D':car.gear===1}
function examStep(dt,inp){
  const kmh=Math.abs(car.speed)*3.6;
  if(stage==='PREP'){
    if(car.seatbelt&&car.engine&&readyGear()&&!car.parkingBrake){
      stage='START';setInstruction('좌측 방향지시등을 켜고 출발하세요.','경사로 정지선까지 천천히 이동합니다.');beep(680,.08,.03);
    }
    return;
  }
  if(stage==='START'&&kmh>2&&car.z<70){
    if(car.signal!==-1)addDeduction('출발 방향지시등 미사용',5);
    stage='HILL';setInstruction('경사로 정지선에 정확히 멈추세요.','정지 후 뒤로 밀리지 않게 다시 출발합니다.');
    return;
  }
  if(stage==='HILL'){
    if(car.z<56&&car.z>52&&kmh<.8){
      holdTimer+=dt;if(holdTimer>1.1&&!hillStopped){hillStopped=true;showToast('경사로 정지 확인');beep(760,.09,.04);setInstruction('신호 교차로까지 진행하세요.','정지선 앞에서 신호를 확인하고 우회전합니다.')}
    }else if(!hillStopped)holdTimer=0;
    if(car.z<51&&!hillStopped){hillStopped=true;addDeduction('경사로 정지 불이행',10);setInstruction('신호 교차로까지 진행하세요.','정지선 앞에서 신호를 확인하고 우회전합니다.')}
    if(car.z<37){stage='INTERSECTION';holdTimer=0}
    return;
  }
  if(stage==='INTERSECTION'){
    const light=signalGreen?'초록불':'빨간불';
    setInstruction('교차로에서 우회전하세요.','현재 신호: '+light+' · 우측 방향지시등을 사용하세요.');
    if(car.z<28.6&&car.x<3.5){
      if(!signalGreen&&!car._redPenalized){car._redPenalized=true;addDeduction('신호 위반',10)}
      if(car.signal!==1&&!car._rightPenalized){car._rightPenalized=true;addDeduction('우회전 방향지시등 미사용',5)}
    }
    if(car.x>7&&Math.abs(car.z-20)<7){
      stage='PARK';setInstruction('T자 주차 구역에 후진 주차하세요.','후진기어를 사용해 오른쪽 주차칸 안에 차를 넣고 완전히 정지합니다.');showToast('다음 과제: T자 주차');
    }
    return;
  }
  if(stage==='PARK'){
    const inParkingArea=car.x>36&&car.x<48&&car.z>25&&car.z<41;
    const inBay=car.x>39.2&&car.x<44.8&&car.z>28&&car.z<38.8&&Math.abs(Math.sin(car.yaw))<.62;
    if(inParkingArea&&currentDirection()===-1&&Math.abs(car.speed)>.25)parkingReverseSeen=true;
    if(inBay&&parkingReverseSeen&&kmh<.7){
      holdTimer+=dt;if(holdTimer>1.1){parkingComplete=true;stage='PARK_EXIT';holdTimer=0;showToast('주차 확인 완료');beep(820,.12,.04);setInstruction('주차 구역에서 나와 오른쪽으로 진행하세요.','가속구간에서는 20km/h 이상 속도를 냅니다.')}
    }else holdTimer=0;
    if(mode==='exam'&&car.x>66&&!parkingComplete){parkingComplete=true;addDeduction('T자 주차 미완료',10);stage='ACCEL';setInstruction('가속구간에서 20km/h 이상 주행하세요.','흰색 시작선을 지난 뒤 충분히 가속합니다.')}
    return;
  }
  if(stage==='PARK_EXIT'){
    if(car.z<25.2&&car.x>47&&Math.cos(car.yaw-.5*Math.PI)>.45){
      stage='ACCEL';setInstruction('가속구간에서 20km/h 이상 주행하세요.','흰색 시작선을 지난 뒤 충분히 가속합니다.');
    }
    return;
  }
  if(stage==='ACCEL'){
    if(car.x>59&&car.x<88&&kmh>=20)accelOk=true;
    if(car.x>88){
      if(!accelOk)addDeduction('가속구간 속도 미달',10);
      stage='EMERGENCY';setInstruction('앞쪽 급정지 구간에 대비하세요.','경고음이 울리면 즉시 안전하게 정지합니다.');
    }
    return;
  }
  if(stage==='EMERGENCY'){
    if(car.x>92&&!emergencyTriggered){
      emergencyTriggered=true;emergencyTimer=0;beep(1100,.12,.09);setTimeout(()=>beep(1100,.12,.09),170);setInstruction('급정지!','브레이크를 밟아 정지선 전에 완전히 멈추세요.');
    }
    if(emergencyTriggered){
      emergencyTimer+=dt;
      if(kmh<.8&&car.x<103){
        stage='FINISH';showToast('급정지 성공');setInstruction('종료선으로 이동해 정차하세요.','정차 후 주차브레이크·기어·시동까지 마무리합니다.');
      }else if((car.x>=103||emergencyTimer>5)&&!car._emergencyPenalized){
        car._emergencyPenalized=true;addDeduction('급정지 실패',10);stage='FINISH';setInstruction('종료선으로 이동해 정차하세요.','정차 후 주차브레이크·기어·시동까지 마무리합니다.');
      }
    }
    return;
  }
  if(stage==='FINISH'){
    if(car.x>109&&kmh<.8){
      stage='SECURE';setInstruction('시험을 마무리하세요.',license==='auto'?'P 기어 · 주차브레이크 · 시동 OFF':'중립 N · 주차브레이크 · 시동 OFF');
      showToast('차량을 안전하게 종료하세요.');
    }
    return;
  }
  if(stage==='SECURE'){
    const gearOk=license==='auto'?car.gear==='P':car.gear===0;
    if(gearOk&&car.parkingBrake&&!car.engine)finishRun();
  }
}

function updateCamera(dt){
  if(lookPointer===null){headYaw=approach(headYaw,0,.18*dt);headPitch=approach(headPitch,0,.1*dt)}
  const fx=Math.sin(car.yaw),fz=-Math.cos(car.yaw),rx=Math.cos(car.yaw),rz=Math.sin(car.yaw);
  camera.position.set(car.x-rx*.32-fx*.15,car.y+1.43,car.z-rz*.32-fz*.15);
  camera.rotation.order='YXZ';camera.rotation.y=car.yaw+headYaw;camera.rotation.x=car.pitch+headPitch;camera.rotation.z=0;

  const backYaw=car.yaw+Math.PI;
  const bx=Math.sin(backYaw),bz=-Math.cos(backYaw);
  for(const [cam,side,out] of [[leftMirrorCamera,-1,.22],[rightMirrorCamera,1,-.22]]){
    cam.position.set(car.x+rx*.7*side-fx*.2,car.y+1.42,car.z+rz*.7*side-fz*.2);
    cam.rotation.order='YXZ';cam.rotation.y=backYaw+out*side;cam.rotation.x=.02;cam.rotation.z=0;
  }
}
function render(){
  renderer.setScissorTest(false);renderer.setViewport(0,0,innerWidth,innerHeight);renderer.render(scene,camera);
  if(gameState==='menu')return;
  const drawMirror=(el,cam)=>{
    const r=el.getBoundingClientRect();if(r.width<8||r.height<8)return;
    const x=r.left+6,y=innerHeight-r.bottom+6,w=Math.max(1,r.width-12),h=Math.max(1,r.height-12);
    cam.aspect=w/h;cam.updateProjectionMatrix();
    renderer.setScissorTest(true);renderer.setScissor(x,y,w,h);renderer.setViewport(x,y,w,h);renderer.render(scene,cam);
  };
  drawMirror(ui.mirrorLeft,leftMirrorCamera);drawMirror(ui.mirrorRight,rightMirrorCamera);
  renderer.setScissorTest(false);renderer.setViewport(0,0,innerWidth,innerHeight);
}
function updateHUD(){
  const inp=inputState(),kmh=Math.abs(car.speed)*3.6;
  ui.speed.textContent=Math.round(kmh);ui.rpm.textContent=Math.round(car.rpm/50)*50;ui.gearReadout.textContent=gearText();
  ui.steeringWheel.style.transform='rotate('+car.steeringWheel+'deg)';
  ui.lampLeft.classList.toggle('on',car.signal===-1);ui.lampRight.classList.toggle('on',car.signal===1);ui.lampBrake.classList.toggle('on',inp.brake>.08||car.parkingBrake);
  ui.signalLeft.classList.toggle('active',car.signal===-1);ui.signalRight.classList.toggle('active',car.signal===1);
  ui.ignition.classList.toggle('active',car.engine);ui.seatbelt.classList.toggle('active',car.seatbelt);ui.parkingBrake.classList.toggle('active',car.parkingBrake);
  for(const [kind,v] of [['throttle',inp.throttle],['brake',inp.brake],['clutch',inp.clutch]]){
    const wrap=kind==='throttle'?ui.throttlePedal:kind==='brake'?ui.brakePedal:ui.clutchPedal;
    const p=wrap.querySelector('.pedal'),meter=wrap.querySelector('.pedal-meter i');if(!p||!meter)continue;
    p.style.transform='perspective(150px) rotateX('+(v*14)+'deg) translateY('+(v*5)+'px)';meter.style.width=(v*100)+'%';
  }
  updateGearVisual();
}

function loop(now){
  const frame=clamp((now-lastTime)/1000,0,.05);lastTime=now;accumulator+=frame;
  let steps=0;while(accumulator>=1/60&&steps<4){physicsStep(1/60);accumulator-=1/60;steps++}
  if(toastTimer>0){toastTimer-=frame;if(toastTimer<=0)ui.toast.className=''}
  updateCamera(frame);updateHUD();render();requestAnimationFrame(loop);
}

function toggleSignal(dir){car.signal=car.signal===dir?0:dir;beep(600,.035,.018)}
function toggleIgnition(){
  if(car.engine){car.engine=false;car.rpm=0;showToast('시동 OFF');return}
  if(license==='manual'&&inputState().clutch<.55&&car.gear!==0){showToast('클러치를 밟고 시동을 거세요.','warn');return}
  car.engine=true;car.rpm=800;showToast('시동 ON');beep(380,.12,.035);
}
function setAutoGear(g){
  if(license!=='auto')return;
  if((car.gear==='P'||g==='P'||(car.gear==='D'&&g==='R')||(car.gear==='R'&&g==='D'))&&inputState().brake<.22){showToast('브레이크를 밟고 기어를 바꾸세요.','warn');beep(190,.08,.04);return false}
  if(Math.abs(car.speed)>.8&&((car.gear==='D'&&g==='R')||(car.gear==='R'&&g==='D')||g==='P')){showToast('완전히 정차한 뒤 변속하세요.','warn');return false}
  car.gear=g;beep(500,.04,.025);return true;
}
function setManualGear(g){
  if(license!=='manual')return;
  if(g!==0&&inputState().clutch<.62){showToast('클러치를 더 밟으세요.','warn');beep(150,.14,.05);return false}
  if(g===-1&&Math.abs(car.speed)>.7){showToast('정차 후 후진기어를 넣으세요.','warn');return false}
  car.gear=g;beep(480,.04,.025);return true;
}
function updateGearVisual(){
  if(license==='auto'){
    const order=['P','R','N','D'],idx=Math.max(0,order.indexOf(car.gear));const h=ui.autoGate.clientHeight||154;
    ui.autoKnob.style.left='50%';ui.autoKnob.style.top=(17+idx*(h-34)/3)+'px';
    ui.autoGate.querySelectorAll('span').forEach(s=>s.classList.toggle('active',s.dataset.gear===car.gear));
  }else{
    const map={1:[20,18],2:[20,82],3:[50,18],4:[50,82],5:[80,18],'-1':[80,82],0:[50,50]},p=map[String(car.gear)]||map[0];
    ui.manualKnob.style.left=p[0]+'%';ui.manualKnob.style.top=p[1]+'%';
  }
}
function updateControlVisibility(){
  const manual=license==='manual';ui.autoGate.classList.toggle('hidden',manual);ui.manualGate.classList.toggle('hidden',!manual);ui.clutchPedal.classList.toggle('hidden',!manual);
}
function updateButtonVisuals(){ui.parkingBrake.classList.toggle('active',car.parkingBrake);ui.seatbelt.classList.toggle('active',car.seatbelt);ui.ignition.classList.toggle('active',car.engine)}

function installSteering(){
  const el=ui.steeringPad;let pointer=null;
  const update=e=>{const r=el.getBoundingClientRect(),cx=r.left+r.width/2;touch.steer=clamp((e.clientX-cx)/(r.width*.28),-1,1);ui.steerKnob.style.transform='translate(calc(-50% + '+(touch.steer*24)+'px),-50%)';e.preventDefault()};
  el.addEventListener('pointerdown',e=>{if(pointer!==null)return;pointer=e.pointerId;try{el.setPointerCapture(pointer)}catch(_){}update(e)});
  el.addEventListener('pointermove',e=>{if(e.pointerId===pointer)update(e)});
  const end=e=>{if(e.pointerId!==pointer)return;pointer=null;touch.steer=0;ui.steerKnob.style.transform='translate(-50%,-50%)'};
  ['pointerup','pointercancel','lostpointercapture'].forEach(t=>el.addEventListener(t,end));
}
function installPedal(wrap,kind){
  const update=e=>{const r=wrap.getBoundingClientRect();touch[kind]=clamp((e.clientY-r.top)/Math.max(1,r.height*.85),0,1);e.preventDefault()};
  wrap.addEventListener('pointerdown',e=>{if(pedalPointers[kind]!==null)return;pedalPointers[kind]=e.pointerId;try{wrap.setPointerCapture(e.pointerId)}catch(_){}update(e)});
  wrap.addEventListener('pointermove',e=>{if(e.pointerId===pedalPointers[kind])update(e)});
  const end=e=>{if(e.pointerId!==pedalPointers[kind])return;pedalPointers[kind]=null;touch[kind]=0};
  ['pointerup','pointercancel','lostpointercapture'].forEach(t=>wrap.addEventListener(t,end));
}
function installAutoGate(){
  let pointer=null;
  const update=e=>{const r=ui.autoGate.getBoundingClientRect(),y=clamp(e.clientY-r.top,17,r.height-17);ui.autoKnob.style.top=y+'px';e.preventDefault()};
  ui.autoGate.addEventListener('pointerdown',e=>{if(pointer!==null)return;pointer=e.pointerId;try{ui.autoGate.setPointerCapture(pointer)}catch(_){}update(e)});
  ui.autoGate.addEventListener('pointermove',e=>{if(e.pointerId===pointer)update(e)});
  const end=e=>{if(e.pointerId!==pointer)return;const r=ui.autoGate.getBoundingClientRect(),n=clamp((e.clientY-r.top)/r.height,0,1),idx=Math.round(n*3),g=['P','R','N','D'][idx];pointer=null;setAutoGear(g);updateGearVisual()};
  ['pointerup','pointercancel','lostpointercapture'].forEach(t=>ui.autoGate.addEventListener(t,end));
}
function installManualGate(){
  let pointer=null;
  const update=e=>{const r=ui.manualGate.getBoundingClientRect(),x=clamp(e.clientX-r.left,18,r.width-18),y=clamp(e.clientY-r.top,18,r.height-18);ui.manualKnob.style.left=x+'px';ui.manualKnob.style.top=y+'px';e.preventDefault()};
  ui.manualGate.addEventListener('pointerdown',e=>{if(pointer!==null)return;pointer=e.pointerId;try{ui.manualGate.setPointerCapture(pointer)}catch(_){}update(e)});
  ui.manualGate.addEventListener('pointermove',e=>{if(e.pointerId===pointer)update(e)});
  const end=e=>{if(e.pointerId!==pointer)return;const r=ui.manualGate.getBoundingClientRect(),nx=clamp((e.clientX-r.left)/r.width,0,1),ny=clamp((e.clientY-r.top)/r.height,0,1);pointer=null;
    let g=0;if(ny<.38||ny>.62){const col=nx<.34?0:nx>.66?2:1;g=(ny<.5?[[1,3,5],[2,4,-1]][0][col]:[[1,3,5],[2,4,-1]][1][col])}
    setManualGear(g);updateGearVisual();
  };
  ['pointerup','pointercancel','lostpointercapture'].forEach(t=>ui.manualGate.addEventListener(t,end));
}
function installLook(){
  ui.canvas.addEventListener('pointerdown',e=>{if(lookPointer!==null)return;lookPointer=e.pointerId;lookLastX=e.clientX;lookLastY=e.clientY;try{ui.canvas.setPointerCapture(e.pointerId)}catch(_){}});
  ui.canvas.addEventListener('pointermove',e=>{if(e.pointerId!==lookPointer)return;const dx=e.clientX-lookLastX,dy=e.clientY-lookLastY;lookLastX=e.clientX;lookLastY=e.clientY;headYaw=clamp(headYaw-dx*.005,-.78,.78);headPitch=clamp(headPitch-dy*.0035,-.12,.18)});
  const end=e=>{if(e.pointerId===lookPointer)lookPointer=null};['pointerup','pointercancel','lostpointercapture'].forEach(t=>ui.canvas.addEventListener(t,end));
}
function installControls(){
  installSteering();installPedal(ui.throttlePedal,'throttle');installPedal(ui.brakePedal,'brake');installPedal(ui.clutchPedal,'clutch');installAutoGate();installManualGate();installLook();
  ui.signalLeft.addEventListener('click',()=>toggleSignal(-1));ui.signalRight.addEventListener('click',()=>toggleSignal(1));
  ui.ignition.addEventListener('click',toggleIgnition);ui.seatbelt.addEventListener('click',()=>{car.seatbelt=!car.seatbelt;showToast(car.seatbelt?'안전띠 착용':'안전띠 해제');beep(660,.04,.02)});
  ui.parkingBrake.addEventListener('click',()=>{if(Math.abs(car.speed)>1){showToast('정차 후 주차브레이크를 조작하세요.','warn');return}car.parkingBrake=!car.parkingBrake;beep(420,.05,.025)});
  addEventListener('keydown',e=>{
    const allow=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyC'];if(allow.includes(e.code)){keys.add(e.code);if(e.code.startsWith('Arrow'))e.preventDefault();return}
    if(e.repeat)return;
    if(e.code==='KeyQ')toggleSignal(-1);else if(e.code==='KeyE')toggleSignal(1);else if(e.code==='KeyI')toggleIgnition();else if(e.code==='KeyB')car.parkingBrake=!car.parkingBrake;
    else if(license==='auto'&&['KeyP','KeyR','KeyN'].includes(e.code))setAutoGear(e.code.slice(3));
    else if(license==='auto'&&e.code==='KeyX')setAutoGear('D');
    else if(license==='manual'&&/^Digit[1-5]$/.test(e.code))setManualGear(Number(e.code.slice(5)));
    else if(license==='manual'&&e.code==='KeyR')setManualGear(-1);else if(license==='manual'&&e.code==='KeyN')setManualGear(0);
  });
  addEventListener('keyup',e=>keys.delete(e.code));
  addEventListener('blur',()=>{keys.clear();touch.steer=touch.throttle=touch.brake=touch.clutch=0});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();touch.steer=touch.throttle=touch.brake=touch.clutch=0}});
}
function resize(){
  if(!renderer)return;const w=innerWidth,h=Math.max(1,innerHeight);renderer.setSize(w,h,false);renderer.setPixelRatio(Math.min(devicePixelRatio||1,matchMedia('(pointer:coarse)').matches?1.35:1.7));
  camera.aspect=w/h;camera.updateProjectionMatrix();
}
addEventListener('resize',resize);

selectOptions();initScene();installControls();resetCar();clock=new THREE.Clock();
requestAnimationFrame(loop);

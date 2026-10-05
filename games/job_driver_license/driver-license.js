import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { shared3DPath, shared3DCanUse } from '../../assets/game/manifest/shared-community-3d.js';
import { prepareShared3DObject, shared3DShouldLoad } from '../../assets/game/manifest/shared-community-3d-runtime.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const approach=(v,target,amount)=>v<target?Math.min(target,v+amount):Math.max(target,v-amount);
const deg=r=>r*180/Math.PI;
const rad=d=>d*Math.PI/180;
const normAngle=a=>Math.atan2(Math.sin(a),Math.cos(a));
const sharedCoarse=matchMedia?.('(pointer: coarse)')?.matches||navigator.maxTouchPoints>0;

const ui={
  canvas:document.querySelector('#game'),
  start:document.querySelector('#start'),result:document.querySelector('#result'),
  startBtn:document.querySelector('#startBtn'),retryBtn:document.querySelector('#retryBtn'),
  examMode:document.querySelector('#examMode'),score:document.querySelector('#score'),
  instruction:document.querySelector('#instruction'),subInstruction:document.querySelector('#subInstruction'),
  examinerPanel:document.querySelector('#examinerPanel'),examinerState:document.querySelector('#examinerState'),examinerText:document.querySelector('#examinerText'),
  speed:document.querySelector('#speed'),rpm:document.querySelector('#rpm'),gearReadout:document.querySelector('#gearReadout'),
  lampLeft:document.querySelector('#lampLeft'),lampRight:document.querySelector('#lampRight'),lampBrake:document.querySelector('#lampBrake'),
  mirrorLeft:document.querySelector('#mirrorLeft'),mirrorRight:document.querySelector('#mirrorRight'),backupCamera:document.querySelector('#backupCamera'),
  steeringPad:document.querySelector('#steeringPad'),steeringWheel:document.querySelector('#steeringWheel'),steerKnob:document.querySelector('#steerKnob'),
  signalLeft:document.querySelector('#signalLeft'),signalRight:document.querySelector('#signalRight'),
  ignition:document.querySelector('#ignition'),seatbelt:document.querySelector('#seatbelt'),parkingBrake:document.querySelector('#parkingBrake'),hazard:document.querySelector('#hazard'),
  headlight:document.querySelector('#headlight'),wiper:document.querySelector('#wiper'),
  autoGate:document.querySelector('#autoGate'),manualGate:document.querySelector('#manualGate'),
  autoKnob:document.querySelector('#autoKnob'),manualKnob:document.querySelector('#manualKnob'),
  clutchPedal:document.querySelector('#clutchPedal'),brakePedal:document.querySelector('#brakePedal'),throttlePedal:document.querySelector('#throttlePedal'),
  toast:document.querySelector('#toast'),
  resultTitle:document.querySelector('#resultTitle'),finalScore:document.querySelector('#finalScore'),resultRows:document.querySelector('#resultRows')
};

let license='auto',mode='practice',gameState='menu',stage='PREP',score=100;
let scene,renderer,camera,leftMirrorCamera,rightMirrorCamera,backupCamera,loader,clock;
let backupGuideLeft,backupGuideRight;
let sunLight,sunTarget,visualWorld,hoodGroup;
const visualModels=new Map(),fallbackVisuals=[];
const SHARED_VISUAL_IDS=Object.freeze({
  sharedTreeA:'nature.commonTreeA',
  sharedTreeB:'nature.commonTreeB',
  sharedPineA:'nature.pineTreeA',
  sharedGrass:'nature.grass'
});
const VISUAL_MODELS={
  tree:'../../assets/game/3d/nature/kenney-nature-kit/tree-default.glb',
  oak:'../../assets/game/3d/nature/kenney-nature-kit/tree-oak.glb',
  pine:'../../assets/game/3d/nature/kenney-nature-kit/tree-pine-round-a.glb',
  trafficLight:'../../assets/game/3d/city/kenney-city-kit-roads/traffic-light.glb',
  cone:'../../assets/game/3d/city/kenney-city-kit-roads/construction-cone.glb',
  barrier:'../../assets/game/3d/city/kenney-city-kit-roads/construction-barrier.glb',
  streetLight:'../../assets/game/3d/city/kenney-city-kit-roads/light-square.glb',
  stopSign:'../../assets/game/3d/city/kenney-city-kit-roads/road-sign-stop.glb',
  warningSign:'../../assets/game/3d/city/kenney-city-kit-roads/road-sign-warning.glb',
  fence:'../../assets/game/3d/city/kenney-city-kit-roads/construction-fence.glb',
  campusA:'../../assets/game/3d/city/kenney-city-kit-suburban/building-type-a.glb',
  campusB:'../../assets/game/3d/city/kenney-city-kit-suburban/building-type-b.glb',
  bigBuilding:'../../assets/game/3d/city/poly-pizza-city-pack/big-building.glb',
  bench:'../../assets/game/3d/city/poly-pizza-city-pack/bench.glb',
  planter:'../../assets/game/3d/city/poly-pizza-city-pack/planter-and-bushes.glb',
  sedan:'../../assets/game/3d/vehicles/kenney-car-kit/sedan.glb',
  suv:'../../assets/game/3d/vehicles/kenney-car-kit/suv.glb',
  hatch:'../../assets/game/3d/vehicles/kenney-car-kit/hatchback-sports.glb',
  van:'../../assets/game/3d/vehicles/kenney-car-kit/van.glb',
  sharedTreeA:shared3DPath('nature.commonTreeA','../../'),
  sharedTreeB:shared3DPath('nature.commonTreeB','../../'),
  sharedPineA:shared3DPath('nature.pineTreeA','../../'),
  sharedGrass:shared3DPath('nature.grass','../../')
};
const CAMPUS_BUILDINGS=[
  {key:'campusA',x:-16,z:70,size:12,rot:Math.PI/2,label:'운전면허시험장'},
  {key:'campusB',x:-16,z:48,size:10,rot:Math.PI/2,label:'안전교육동'},
  {key:'bigBuilding',x:70,z:53,size:11,rot:Math.PI,label:'차량관리동'}
];
const WAITING_CARS=[
  ['sedan',14,77,Math.PI/2],['hatch',14,71,Math.PI/2],['suv',14,65,Math.PI/2],
  ['van',21,77,Math.PI/2],['sedan',21,71,Math.PI/2],['hatch',21,65,Math.PI/2]
];
const CAMPUS_TREES=[
  [-28,79],[-28,58],[-28,34],[32,59],[92,59],[126,44],[126,4],[78,3],[30,3]
];
let signalRedMat,signalGreenMat,signalGreen=false,parkingSensorLine=null;
let lastTime=performance.now(),accumulator=0,gameTime=0,toastTimer=0;
let holdTimer=0,stallTimer=0,offroadTimer=0,emergencyTimer=0;
let hillStopped=false,accelOk=false,emergencyTriggered=false,parkingComplete=false,parkingReverseSeen=false,parkingSensorSeen=false,emergencyBrakeSeen=false;
let deductions=[];
let sectionResults={controls:'pending',hill:'pending',intersection:'pending',parking:'pending',acceleration:'pending',emergency:'pending'};
let mirrorFrame=0;
const obstacles=[];
let collisionCooldown=0;
let lastCollisionId='';
let headYaw=0,headPitch=0,lookPointer=null,lookLastX=0,lookLastY=0;
const keys=new Set();

const EXAM_RULES={
  passScore:80,startLimit:30,hillStopSeconds:3,hillWarnRollback:.5,hillFailRollback:1,
  hillExitLimit:30,parkingLimit:120,intersectionWarn:20,intersectionFail:30,
  emergencyStopLimit:2,emergencyHazardLimit:3,overspeedKmh:20,overspeedGrace:3
};
let examEvents=[];
let runStats={collisions:0,cones:0,offroad:0,gearChanges:0,maxSpeed:0,parking:null};
let examiner={disqualified:false,reason:'',stageStartedAt:0,startAt:0,hillStopZ:null,hillRollback:0,hillWarned:false,
  parkingBrakeHold:0,overspeedTimer:0,overspeedTicks:0,intersectionWarned:false,finishSignalChecked:false,
  emergencyStopTime:null,emergencyHazardTime:null,emergencyHazardToggleAt:null,emergencyStopPenalized:false,emergencyHazardPenalized:false,
  emergencyEarlyHazardPenalized:false,hazardDrivePenalized:false};
const CONTROL_TASK_POOL=[
  {kind:'headlight',label:'전조등',command:'전조등을 켜십시오.'},
  {kind:'wiper',label:'와이퍼',command:'와이퍼를 작동하십시오.'},
  {kind:'signalLeft',label:'좌측 방향지시등',command:'좌측 방향지시등을 켜십시오.'},
  {kind:'signalRight',label:'우측 방향지시등',command:'우측 방향지시등을 켜십시오.'}
];
let controlCheck={tasks:[],index:0,complete:false};

const touch={steer:0,throttle:0,brake:0,clutch:0};
const pedalPointers={throttle:null,brake:null,clutch:null};

const car={
  x:0,z:73,y:0,yaw:0,pitch:0,speed:0,
  steeringWheel:0,wheelAngle:0,
  engine:false,rpm:0,gear:'P',
  parkingBrake:true,seatbelt:false,signal:0,hazard:false,headlight:false,wiper:false
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
  ui.instruction.textContent=main;
  // 기능시험에서는 공략 설명을 숨기고 시험 음성 수준의 지시만 남깁니다.
  ui.subInstruction.textContent=(mode==='exam'&&gameState==='playing')?'':sub;
}
function recordEvent(kind,label,data={}){
  examEvents.push({t:Math.round(gameTime*10)/10,kind,label,...data});
  if(examEvents.length>120)examEvents.shift();
}
function examinerSay(text,state='판정 중',tone='normal'){
  if(ui.examinerText)ui.examinerText.textContent=text;
  if(ui.examinerState)ui.examinerState.textContent=state;
  if(ui.examinerPanel)ui.examinerPanel.className='glass examiner-'+tone;
}
function examinerStage(name,text){
  examiner.stageStartedAt=gameTime;
  recordEvent('stage',name);
  examinerSay(text,name,'normal');
}
function disqualify(reason){
  if(mode!=='exam'||examiner.disqualified||gameState!=='playing')return false;
  examiner.disqualified=true;examiner.reason=reason;recordEvent('disqualify',reason);
  examinerSay(reason,'실격','danger');showToast('실격 · '+reason,'danger',2.8);beep(160,.45,.09);
  finishRun();return true;
}
function addDeduction(label,points){
  recordEvent('fault',label,{points:mode==='exam'?points:0});
  if(mode!=='exam'){showToast(label,'warn');beep(520,.08,.035);return}
  score=Math.max(0,score-points);deductions.push({label,points});ui.score.textContent=score;
  examinerSay(label+' -'+points+'점','감점','warn');
  showToast(label+' -'+points+'점','danger',1.7);beep(260,.18,.07);
}
function finishRun(){
  if(gameState!=='playing')return;
  gameState='result';car.speed=0;
  const passed=mode==='practice'||(!examiner.disqualified&&score>=EXAM_RULES.passScore);
  ui.resultTitle.textContent=mode==='practice'?'연습 완료':examiner.disqualified?'실격':passed?'합격':'불합격';
  ui.finalScore.textContent=mode==='practice'?'코스 완주':examiner.disqualified?'실격 · '+score+'점':score+'점';
  ui.resultRows.innerHTML='';
  const sectionLabels={controls:'운전장치 조작',hill:'경사로 정차',intersection:'신호교차로',parking:'T자 후진주차',acceleration:'가속구간',emergency:'급정지'};
  for(const key of Object.keys(sectionLabels)){
    const state=sectionResults[key];
    const row=document.createElement('div');row.className='result-row';
    row.innerHTML='<b>'+sectionLabels[key]+'</b><span>'+(state==='ok'?'완료':state==='miss'?'미완료':'확인 없음')+'</span>';
    ui.resultRows.append(row);
  }
  if(mode==='exam'&&examiner.disqualified){
    const row=document.createElement('div');row.className='result-row result-disqualify';row.innerHTML='<b>실격 사유</b><span>'+examiner.reason+'</span>';ui.resultRows.append(row);
  }
  if(mode==='exam'&&deductions.length){
    for(const d of deductions){const row=document.createElement('div');row.className='result-row';row.innerHTML='<b>'+d.label+'</b><span>-'+d.points+'점</span>';ui.resultRows.append(row)}
  }
  const summary=[
    ['최고 속도',Math.round(runStats.maxSpeed)+' km/h'],
    ['접촉 기록',runStats.collisions+'회 · 콘 '+runStats.cones+'회'],
    ['차로 이탈',runStats.offroad+'회']
  ];
  if(runStats.parking){
    summary.push(['주차 정렬','좌우 '+runStats.parking.lat.toFixed(2)+'m · 각도 '+runStats.parking.angle.toFixed(1)+'°']);
  }
  for(const [label,value] of summary){
    const row=document.createElement('div');row.className='result-row result-summary';row.innerHTML='<b>'+label+'</b><span>'+value+'</span>';ui.resultRows.append(row);
  }
  ui.result.classList.add('show');beep(passed?880:220,.35,.07);
  if(mode==='exam'){
    try{
      let best=window.KidscadeStorage?.getInt('driverLicenseBest',0)||0;
      const legacyKey='driverLicense'+'Best';const legacy=Number(localStorage.getItem(legacyKey)||0);
      best=Math.max(best,legacy,score);
      window.KidscadeStorage?.setRaw('driverLicenseBest',String(best));
      if(legacy) localStorage.removeItem(legacyKey);
    }catch(_){}
    try{window.KidscadeGame?.result?.({scope:'mission',status:passed?'completed':'failed',outcome:passed?'clear':'fail',score,passed,license,disqualified:examiner.disqualified,reason:examiner.reason});}catch(_){}
  }else{
    try{window.KidscadeGame?.result?.({scope:'session',status:'completed',practice:true,license});}catch(_){}
  }
}

function groundHeight(x,z){
  if(Math.abs(x)>5)return 0;
  if(z<=60&&z>=50)return (60-z)*.1;
  if(z<50&&z>=40)return (z-40)*.1;
  return 0;
}
function groundDz(x,z){
  if(Math.abs(x)>5)return 0;
  if(z<=60&&z>=50)return -.1;
  if(z<50&&z>=40)return .1;
  return 0;
}
function isOnRoad(x,z){
  const vertical=Math.abs(x)<=4.55&&z>=14&&z<=82;
  const horizontal=Math.abs(z-20)<=4.7&&x>=-5&&x<=120;
  const returnLane=Math.abs(x-110)<=4.55&&z>=18&&z<=74;
  const parking=x>=35&&x<=49&&z>=24&&z<=42;
  const connector=x>=37&&x<=47&&z>=20&&z<=27;
  return vertical||horizontal||returnLane||parking||connector;
}
function carCorners(){
  const halfW=.9,halfL=2.15;
  const fx=Math.sin(car.yaw),fz=-Math.cos(car.yaw),rx=Math.cos(car.yaw),rz=Math.sin(car.yaw);
  return [
    {x:car.x+fx*halfL+rx*halfW,z:car.z+fz*halfL+rz*halfW},
    {x:car.x+fx*halfL-rx*halfW,z:car.z+fz*halfL-rz*halfW},
    {x:car.x-fx*halfL+rx*halfW,z:car.z-fz*halfL+rz*halfW},
    {x:car.x-fx*halfL-rx*halfW,z:car.z-fz*halfL-rz*halfW}
  ];
}
function footprintInside(minX,maxX,minZ,maxZ){
  return carCorners().every(p=>p.x>=minX&&p.x<=maxX&&p.z>=minZ&&p.z<=maxZ);
}
function parkingMetrics(){
  const cx=42,cz=33.4;
  const to0=Math.abs(normAngle(car.yaw)),toPi=Math.abs(normAngle(car.yaw-Math.PI));
  return{lat:Math.abs(car.x-cx),long:Math.abs(car.z-cz),angle:deg(Math.min(to0,toPi))};
}

function addCircleObstacle(id,x,z,r,options={}){
  const o={id,type:'circle',x,z,r,solid:options.solid!==false,kind:options.kind||'solid',mesh:options.mesh||null,hit:false};
  obstacles.push(o);return o;
}
function addBoxObstacle(id,x,z,w,d,options={}){
  const o={id,type:'box',x,z,w,d,solid:options.solid!==false,kind:options.kind||'solid',mesh:options.mesh||null,hit:false};
  obstacles.push(o);return o;
}
function carRect(){
  return{cx:car.x,cz:car.z,hw:.9,hl:2.15,angle:car.yaw};
}
function rectCorners2D(r){
  const s=Math.sin(r.angle),c=Math.cos(r.angle);
  const ax={x:c,z:s},az={x:s,z:-c},pts=[];
  for(const sx of [-1,1])for(const sz of [-1,1])pts.push({
    x:r.cx+sx*r.hw*ax.x+sz*r.hl*az.x,
    z:r.cz+sx*r.hw*ax.z+sz*r.hl*az.z
  });
  return pts;
}
function rectAxes2D(r){
  const s=Math.sin(r.angle),c=Math.cos(r.angle);
  return[{x:c,z:s},{x:s,z:-c}];
}
function projectionRange2D(points,axis){
  let min=Infinity,max=-Infinity;
  for(const p of points){const d=p.x*axis.x+p.z*axis.z;if(d<min)min=d;if(d>max)max=d}
  return[min,max];
}
function rectsIntersectSAT(a,b){
  const ap=rectCorners2D(a),bp=rectCorners2D(b);
  for(const axis of [...rectAxes2D(a),...rectAxes2D(b)]){
    const [amin,amax]=projectionRange2D(ap,axis),[bmin,bmax]=projectionRange2D(bp,axis);
    if(amax<bmin||bmax<amin)return false;
  }
  return true;
}
function circleHitsCar(o){
  const dx=o.x-car.x,dz=o.z-car.z;
  const fx=Math.sin(car.yaw),fz=-Math.cos(car.yaw),rx=Math.cos(car.yaw),rz=Math.sin(car.yaw);
  const localF=dx*fx+dz*fz,localR=dx*rx+dz*rz;
  const qF=clamp(localF,-2.15,2.15),qR=clamp(localR,-.9,.9);
  const df=localF-qF,dr=localR-qR;
  return df*df+dr*dr<=o.r*o.r;
}
function boxHitsCar(o){
  return rectsIntersectSAT(carRect(),{cx:o.x,cz:o.z,hw:o.w/2,hl:o.d/2,angle:0});
}
function findCollision(){
  for(const o of obstacles){
    if(!o.solid)continue;
    const hit=o.type==='circle'?circleHitsCar(o):boxHitsCar(o);
    if(hit)return o;
  }
  return null;
}
function handleCollision(o,prev){
  const impact=Math.abs(car.speed);
  if(o.kind==='cone'){
    o.solid=false;o.hit=true;runStats.cones++;recordEvent('contact','안전콘 접촉',{impact});
    if(o.mesh){o.mesh.rotation.z=Math.PI*.48;o.mesh.position.y=.12}
    car.speed*=.68;
    showToast('콘에 닿았습니다.','warn',1.2);
    if(collisionCooldown<=0){addDeduction('안전시설 접촉',5);collisionCooldown=1.2}
    return;
  }
  car.x=prev.x;car.z=prev.z;car.yaw=prev.yaw;
  car.speed=0;
  if(impact>.18){
    runStats.collisions++;recordEvent('collision','장애물 충돌',{impact});
    showToast('충돌했습니다.','danger',1.2);beep(120,.12,.06);
    if(mode==='exam'){disqualify('안전사고 발생');return}
    if(collisionCooldown<=0||lastCollisionId!==o.id){
      addDeduction('장애물 충돌',10);collisionCooldown=1.5;lastCollisionId=o.id;
    }
  }
}
function currentDirection(){
  if(license==='auto')return car.gear==='D'?1:car.gear==='R'?-1:0;
  return car.gear===-1?-1:(Number(car.gear)>0?1:0);
}
function gearText(){return license==='auto'?String(car.gear):(car.gear===-1?'R':car.gear===0?'N':String(car.gear))}
function prepareControlCheck(){
  const pool=[...CONTROL_TASK_POOL];
  for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]]}
  controlCheck={tasks:pool.slice(0,2),index:0,complete:mode!=='exam'};
  sectionResults.controls=mode==='exam'?'pending':'ok';
}
function expectedControlTask(){return controlCheck.tasks[controlCheck.index]||null}
function verifyControlAction(kind){
  if(mode!=='exam'||gameState!=='playing'||stage!=='PREP'||controlCheck.complete||!car.seatbelt)return;
  const expected=expectedControlTask();if(!expected)return;
  if(kind!==expected.kind){
    addDeduction('운전장치 조작 오류',5);
    examinerSay('지시된 장치를 다시 확인하세요.','운전장치','warn');
    return;
  }
  controlCheck.index++;
  recordEvent('control-check',expected.label);
  beep(840,.08,.035);
  if(controlCheck.index>=controlCheck.tasks.length){
    controlCheck.complete=true;sectionResults.controls='ok';
    examinerSay('운전장치 조작 확인 완료','운전장치','ok');
    showToast('운전장치 조작 완료');
  }else{
    const next=expectedControlTask();
    examinerSay(next.command,'운전장치','normal');
    showToast('다음 지시를 확인하세요.');
  }
}
function resetCar(){
  Object.assign(car,{x:0,z:73,y:0,yaw:0,pitch:0,steeringWheel:0,wheelAngle:0,speed:0,engine:false,rpm:0,gear:license==='auto'?'P':0,parkingBrake:true,seatbelt:false,signal:0,hazard:false,headlight:false,wiper:false});
  touch.steer=touch.throttle=touch.brake=touch.clutch=0;
  gameTime=0;holdTimer=stallTimer=offroadTimer=emergencyTimer=collisionCooldown=0;lastCollisionId='';
  hillStopped=accelOk=emergencyTriggered=parkingComplete=parkingReverseSeen=parkingSensorSeen=emergencyBrakeSeen=false;car._redPenalized=false;car._rightPenalized=false;car._emergencyPenalized=false;score=100;deductions=[];examEvents=[];runStats={collisions:0,cones:0,offroad:0,gearChanges:0,maxSpeed:0,parking:null};examiner={disqualified:false,reason:'',stageStartedAt:0,startAt:0,hillStopZ:null,hillRollback:0,hillWarned:false,parkingBrakeHold:0,overspeedTimer:0,overspeedTicks:0,intersectionWarned:false,finishSignalChecked:false,emergencyStopTime:null,emergencyHazardTime:null,emergencyHazardToggleAt:null,emergencyStopPenalized:false,emergencyHazardPenalized:false,emergencyEarlyHazardPenalized:false,hazardDrivePenalized:false};sectionResults={controls:'pending',hill:'pending',intersection:'pending',parking:'pending',acceleration:'pending',emergency:'pending'};stage='PREP';prepareControlCheck();
  headYaw=headPitch=0;ui.score.textContent=mode==='exam'?'100':'연습';
  examinerSay(mode==='exam'?'안전띠 착용 후 안내되는 운전장치 2가지를 조작하십시오.':'감점 없이 조작을 익혀 보세요.',mode==='exam'?'승차 확인':'연습 코치');
  updateControlVisibility();updateGearVisual();updateButtonVisuals();
}
function requestGameFullscreen(){
  try{
    const coarse=matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>0;
    if(!coarse)return;
    const host=(window.parent&&window.parent!==window&&window.parent.document)
      ? window.parent.document.getElementById('game-modal')
      : document.documentElement;
    if(!host)return;
    const hostDoc=host.ownerDocument||document;
    if(hostDoc.fullscreenElement||hostDoc.webkitFullscreenElement)return;
    const fn=host.requestFullscreen||host.webkitRequestFullscreen;
    if(!fn)return;
    const result=fn.call(host);
    result?.catch?.(()=>{});
  }catch(_){}
}
function startGame(){
  requestGameFullscreen();
  initAudio();gameState='playing';resetCar();ui.start.classList.remove('show');ui.result.classList.remove('show');
  if(parkingSensorLine?.material?.color)parkingSensorLine.material.color.set(mode==='practice'?0x46d9ff:0xffffff);
  try{window.KidscadeGame?.start?.({license,mode});}catch(_){}
  ui.examMode.textContent=(license==='auto'?'2종 자동':'1종 보통')+' · '+(mode==='exam'?'기능시험':'연습');
  setInstruction('먼저 안전띠를 매세요.','연습 순서: 안전띠 → 시동 → 기어 → 주차브레이크 해제');
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

function registerFallback(obj,key=''){
  if(obj){
    obj.userData.fallbackFor=key;
    fallbackVisuals.push(obj);
  }
  return obj;
}
function clearVisualWorld(){
  if(visualWorld){scene.remove(visualWorld);visualWorld.traverse(o=>{if(o.geometry)o.geometry.dispose?.()});}
  visualWorld=new THREE.Group();visualWorld.name='driverLicenseVisualWorld';scene.add(visualWorld);
}
function styleVisualModel(obj){
  obj.traverse(n=>{
    if(!n.isMesh||!n.material)return;
    n.castShadow=true;n.receiveShadow=true;
    const mats=Array.isArray(n.material)?n.material:[n.material];
    const styled=mats.map(src=>{
      const m=src.clone();
      if('roughness' in m)m.roughness=Math.max(.42,m.roughness??.72);
      if('metalness' in m)m.metalness=Math.min(.22,m.metalness??.05);
      m.needsUpdate=true;return m;
    });
    n.material=Array.isArray(n.material)?styled:styled[0];
  });
  return obj;
}
function normalizeVisualModel(obj,target=1){
  obj.updateMatrixWorld(true);
  let box=new THREE.Box3().setFromObject(obj),size=box.getSize(new THREE.Vector3());
  let base=Math.max(size.x,size.y,size.z);if(!Number.isFinite(base)||base<=0)base=1;
  obj.scale.multiplyScalar(target/base);obj.updateMatrixWorld(true);
  box=new THREE.Box3().setFromObject(obj);
  const center=box.getCenter(new THREE.Vector3());
  obj.position.x-=center.x;obj.position.z-=center.z;obj.position.y-=box.min.y;
  return obj;
}
function loadVisualModel(key,url){
  if(!url)return Promise.resolve(false);
  const sharedId=SHARED_VISUAL_IDS[key];
  if(sharedId&&(!shared3DCanUse(sharedId)||!shared3DShouldLoad(sharedId,{coarse:sharedCoarse})))return Promise.resolve(false);
  return new Promise(resolve=>{
    loader.load(url,g=>{visualModels.set(key,g.scene);resolve(true)},undefined,()=>resolve(false));
  });
}
function cloneVisual(key,target=1){
  const src=visualModels.get(key);if(!src)return null;
  const sharedId=SHARED_VISUAL_IDS[key];
  if(sharedId)return prepareShared3DObject(src.clone(true),sharedId,target,{shadows:key!=='sharedGrass'});
  return normalizeVisualModel(styleVisualModel(src.clone(true)),target);
}
function placeVisual(key,target,x,z,rot=0,y=.04,parent=visualWorld){
  const obj=cloneVisual(key,target);if(!obj)return null;
  obj.position.set(x,y,z);obj.rotation.y=rot;
  if(key==='fence'){
    obj.traverse(n=>{if(n.isMesh){n.castShadow=false;n.receiveShadow=false}});
  }
  parent?.add(obj);return obj;
}
function makeSidewalk(w,d,x,z){
  const mat=new THREE.MeshStandardMaterial({color:0xcfc8af,roughness:.94});
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,.12,d),mat);m.position.set(x,.08,z);m.receiveShadow=true;scene.add(m);return m;
}
function makeEnhancedRoad(w,d,x,z,y=0,rx=0,axis='z'){
  const road=makeRoadSegment(w,d,x,z,y,rx);
  const curb=.42;
  if(Math.abs(rx)<.001){
    if(axis==='z'){
      makeSidewalk(curb,d,x-w/2-curb/2,z);makeSidewalk(curb,d,x+w/2+curb/2,z);
    }else{
      makeSidewalk(w,curb,x,z-d/2-curb/2);makeSidewalk(w,curb,x,z+d/2+curb/2);
    }
  }
  return road;
}
function makeParkingLot(w,d,x,z){
  makeFlat(w,d,0x666d70,x,z,.055);
  const left=x-w/2+2.2,right=x+w/2-2.2,top=z+d/2-2.2,bottom=z-d/2+2.2;
  for(let px=left;px<=right+.01;px+=4.6){
    line(.11,d-3.2,px,z,0xf7f4df,.145);
  }
  line(w-2,.11,x,top,0xf7f4df,.145);line(w-2,.11,x,bottom,0xf7f4df,.145);
}
function makeCrosswalk(cx,cz,axis='z'){
  for(let i=-3;i<=3;i++){
    if(axis==='z') makeFlat(6.6,.38,0xf4f2e8,cx,cz+i*.72,.17);
    else makeFlat(.38,6.6,0xf4f2e8,cx+i*.72,cz,.17);
  }
}
function makeGroundLabel(text,x,z,w=5.6,h=1.7,rotation=0,bg='rgba(26,45,54,.78)',fg='#ffffff'){
  const c=document.createElement('canvas');c.width=512;c.height=160;const q=c.getContext('2d');
  q.fillStyle=bg;q.fillRect(0,0,c.width,c.height);
  q.strokeStyle='rgba(255,255,255,.5)';q.lineWidth=10;q.strokeRect(7,7,c.width-14,c.height-14);
  q.fillStyle=fg;q.font='900 62px sans-serif';q.textAlign='center';q.textBaseline='middle';q.fillText(text,256,82);
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
  const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false}));
  m.rotation.x=-Math.PI/2;m.rotation.z=rotation;m.position.set(x,.205,z);scene.add(m);return m;
}
function createFallbackTree(x,z,key='tree'){
  const g=new THREE.Group();
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.18,.25,1.7,8),new THREE.MeshStandardMaterial({color:0x76533b,roughness:1}));
  trunk.position.y=.85;const crown=new THREE.Mesh(new THREE.DodecahedronGeometry(1.12,0),new THREE.MeshStandardMaterial({color:0x4d8b55,roughness:1}));crown.position.y=2.15;
  g.add(trunk,crown);g.position.set(x,0,z);g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});scene.add(g);return registerFallback(g,key);
}
function createFallbackVehicle(x,z,rot=0,key='sedan'){
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.BoxGeometry(1.75,.62,3.8),new THREE.MeshStandardMaterial({color:0xd9e1e6,roughness:.48,metalness:.08}));
  body.position.y=.48;
  const cabin=new THREE.Mesh(new THREE.BoxGeometry(1.48,.58,1.8),new THREE.MeshStandardMaterial({color:0x7295a5,roughness:.32,metalness:.05}));
  cabin.position.set(0,.96,-.15);
  const tireMat=new THREE.MeshStandardMaterial({color:0x20272a,roughness:.9});
  for(const x of [-.92,.92])for(const z of [-1.25,1.25]){
    const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.3,.3,.18,12),tireMat);
    wheel.rotation.z=Math.PI/2;wheel.position.set(x,.3,z);g.add(wheel);
  }
  g.add(body,cabin);g.position.set(x,0,z);g.rotation.y=rot;
  g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
  scene.add(g);return registerFallback(g,key);
}
function createFallbackBuilding(x,z,color,w=10,d=9,h=5.5,key='campusA'){
  const g=new THREE.Group(),body=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.8}));
  body.position.y=h/2;g.add(body);
  const roof=new THREE.Mesh(new THREE.BoxGeometry(w*1.03,.35,d*1.03),new THREE.MeshStandardMaterial({color:0x48555b,roughness:.88}));roof.position.y=h+.18;g.add(roof);
  const glass=new THREE.MeshStandardMaterial({color:0x8fc5d7,roughness:.28,metalness:.05,emissive:0x16313c,emissiveIntensity:.12});
  for(let i=-1;i<=1;i++){const win=new THREE.Mesh(new THREE.BoxGeometry(1.2,.7,.03),glass);win.position.set(i*2.1,h*.58,d/2+.02);g.add(win)}
  g.position.set(x,0,z);g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});scene.add(g);return registerFallback(g,key);
}
function buildHood(){
  hoodGroup=new THREE.Group();hoodGroup.name='driverHood';
  const hoodMat=new THREE.MeshStandardMaterial({color:0xe7ecef,roughness:.34,metalness:.14});
  const darkMat=new THREE.MeshStandardMaterial({color:0x151d21,roughness:.72});
  const hood=new THREE.Mesh(new THREE.BoxGeometry(1.72,.16,1.95),hoodMat);hood.position.set(0,-.72,-1.95);hood.rotation.x=rad(5);
  const edge=new THREE.Mesh(new THREE.BoxGeometry(1.92,.065,.08),darkMat);edge.position.set(0,-.31,-1.15);
  for(const o of [hood,edge]){o.layers.set(2);o.castShadow=false;o.receiveShadow=true;hoodGroup.add(o)}
  camera.add(hoodGroup);camera.layers.enable(2);scene.add(camera);
}
function updateShadowFocus(){
  if(!sunLight||!sunTarget)return;
  sunTarget.position.set(car.x,0,car.z);sunLight.position.set(car.x-18,28,car.z+14);
  sunTarget.updateMatrixWorld();sunLight.target=sunTarget;
}
async function loadDecorAssets(){
  await Promise.all(Object.entries(VISUAL_MODELS).map(([k,u])=>loadVisualModel(k,u)));
  rebuildVisualEnvironment();
}
function rebuildVisualEnvironment(){
  clearVisualWorld();
  // GLB별 로딩 성공 여부를 보고 해당 fallback만 숨깁니다.
  // 일부 모델 하나가 실패해도 콘/건물/나무가 투명 장애물이 되지 않습니다.
  for(const o of fallbackVisuals){
    const key=o.userData?.fallbackFor;
    o.visible=!key||!visualModels.has(key);
  }

  // 시험장 중심부는 Kenney 계열 건물·차량으로 통일하고 자연물은 외곽에만 둡니다.
  for(let i=0;i<CAMPUS_TREES.length;i++){
    const [x,z]=CAMPUS_TREES[i];
    const key=i%3===0?'tree':i%3===1?'oak':'pine';
    placeVisual(key,4.2+(i%2)*.45,x,z,(i*.73)%Math.PI);
  }
  for(const [key,x,z,size,rot] of [
    ['sharedTreeA',-29,68,4.3,.3],['sharedTreeB',35,60,4.4,1.1],
    ['sharedPineA',101,58,4.8,.8],['sharedGrass',121,35,1.15,.2]
  ]) placeVisual(key,size,x,z,rot);

  for(const b of CAMPUS_BUILDINGS){
    const obj=placeVisual(b.key,b.size,b.x,b.z,b.rot);
    if(obj){
      const label=textSprite(b.label,'#f8fbff','rgba(18,61,78,.92)');
      label.position.set(b.x,4.2,b.z-5.2);label.scale.set(6.2,1.9,1);visualWorld.add(label);
    }
  }

  // 대기장은 '주변에 실제 시험차량이 있다'는 느낌을 주되 움직이지 않아 성능 부담이 작습니다.
  for(const [key,x,z,rot] of WAITING_CARS) placeVisual(key,4.05,x,z,rot);
  const waitingSign=textSprite('시험차량 대기','#ffffff','rgba(25,86,111,.92)');
  waitingSign.position.set(17.5,2.2,83);waitingSign.scale.set(5.8,1.6,1);visualWorld.add(waitingSign);

  // 외곽 펜스. 출입구 쪽은 비워 두어 폐쇄된 공사장이 아니라 시험장 캠퍼스로 보이게 합니다.
  for(let x=-22;x<=124;x+=7){
    if(x>-5&&x<28)continue;
    placeVisual('fence',6.2,x,86,0);
    placeVisual('fence',6.2,x,7,0);
  }
  for(let z=14;z<=79;z+=7){
    placeVisual('fence',6.2,-25,z,Math.PI/2);
    placeVisual('fence',6.2,130,z,Math.PI/2);
  }

  const tl=placeVisual('trafficLight',4.7,4.8,25.8,Math.PI);
  placeVisual('stopSign',2.8,-5.8,30.2,Math.PI/2);
  placeVisual('warningSign',2.7,56,26,-Math.PI/2);
  placeVisual('warningSign',2.7,91,26,-Math.PI/2);

  for(const [x,z,r] of [[14,13,0],[14,27,Math.PI],[34,13,0],[34,27,Math.PI],[74,13,0],[74,27,Math.PI],[110,13,0],[110,27,Math.PI],[-8,78,0],[-8,58,0]]){
    placeVisual('streetLight',5.2,x,z,r);
  }
  for(const [x,z,r] of [[32,42.7,0],[35,42.7,0],[38,42.7,0],[41,42.7,0],[44,42.7,0],[47,42.7,0],[50,42.7,0]]){
    const c=placeVisual('cone',.75,x,z,r);const ob=obstacles.find(o=>o.id==='parkCone'+x);if(ob&&c)ob.mesh=c;
  }
  for(let z=64;z<=80;z+=4){
    const l=placeVisual('cone',.75,-5.2,z,0),r=placeVisual('cone',.75,5.2,z,0);
    const lo=obstacles.find(o=>o.id==='coneL'+z),ro=obstacles.find(o=>o.id==='coneR'+z);if(lo&&l)lo.mesh=l;if(ro&&r)ro.mesh=r;
  }
  for(const [x,z,r] of [[36,43.5,0],[48,43.5,0],[89,14,Math.PI/2],[89,26,Math.PI/2]]){
    placeVisual('barrier',1.65,x,z,r);
  }

  // 본관 앞 대기·휴식 요소는 최소한으로만 사용합니다.
  for(const [x,z,r] of [[-8,73,Math.PI/2],[-8,66,Math.PI/2]]) placeVisual('bench',1.7,x,z,r);
  for(const [x,z,r] of [[-8,76,0],[-8,63,0],[27,82,0]]) placeVisual('planter',1.6,x,z,r);

  if(tl)recordEvent('visual','시험장 캠퍼스 에셋 로드');
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
  obstacles.length=0;fallbackVisuals.length=0;
  const grass=new THREE.Mesh(new THREE.PlaneGeometry(260,190),new THREE.MeshStandardMaterial({color:0x78a96b,roughness:1}));
  grass.rotation.x=-Math.PI/2;grass.receiveShadow=true;scene.add(grass);

  // 실제 판정 좌표는 유지하면서 주변을 '시험장 캠퍼스'처럼 읽히도록 재구성합니다.
  makeEnhancedRoad(9,22,0,71,0,0,'z');
  const ang=Math.atan(.1);
  makeRoadSegment(9,10,0,55,1,-ang);
  makeRoadSegment(9,10,0,45,1,ang);
  makeEnhancedRoad(9,26,0,27,0,0,'z');
  makeEnhancedRoad(120,9,57.5,20,0,0,'x');
  // 돌발 과제 뒤에는 우측 끝에서 다시 북쪽 종료장으로 올라오는 반환 차로가 이어집니다.
  makeEnhancedRoad(9,52,110,46,0,0,'z');
  makeFlat(14,19,0x626a6e,42,33,.06);makeFlat(12,6,0x626a6e,42,26,.06);

  // 본관 옆 시험차량 대기장.
  makeParkingLot(18,24,17.5,70.5);

  // 주행 코스 가장자리와 중앙선을 분명하게 해 초행 플레이에서도 동선이 읽히게 합니다.
  for(let z=78;z>=18;z-=8){if(z<61&&z>39)continue;line(.13,3.7,-.2,z,0xe3c85a,.14)}
  for(let x=8;x<=116;x+=8)line(3.8,.13,x,20,0xe3c85a,.14);
  line(.11,20,-3.95,71,0xffffff,.155);line(.11,20,3.95,71,0xffffff,.155);
  line(.11,24,-3.95,27,0xffffff,.155);line(.11,24,3.95,27,0xffffff,.155);
  line(105,.11,55.5,16.15,0xffffff,.155);line(105,.11,55.5,23.85,0xffffff,.155);
  line(.11,48,106.15,47,0xffffff,.155);line(.11,48,113.85,47,0xffffff,.155);
  for(let z=28;z<=68;z+=8)line(.13,3.7,110,z,0xe3c85a,.14);

  line(9,.32,0,54,0xffffff,.18);line(9,.32,0,29,0xffffff,.16);
  line(.32,9,58,20,0xffffff,.16);line(.32,9,88,20,0xffffff,.16);
  line(.32,9,103,20,0xffe9a6,.18);line(.32,9,108,20,0xffffff,.16);
  makeCrosswalk(0,25.6,'z');

  const white=0xffffff;
  line(12,.18,42,25.4,white,.16);line(12,.18,42,40.5,white,.16);
  line(.18,15,36.1,33,white,.16);line(.18,15,47.9,33,white,.16);
  line(.18,12,39.2,33,white,.17);line(.18,12,44.8,33,white,.17);line(5.8,.18,42,38.7,white,.17);
  parkingSensorLine=line(5.45,.24,42,36.6,0xffffff,.185);

  // 떠 있는 설명판보다 실제 노면표시를 중심으로 코스를 읽게 합니다.
  makeGroundLabel('출발',0,77,4.6,1.45,0,'rgba(21,86,112,.84)');
  makeGroundLabel('경사로',0,60.2,5.1,1.35,0,'rgba(56,84,70,.82)');
  makeGroundLabel('정지',0,32,4.2,1.35,0,'rgba(153,48,48,.84)');
  makeGroundLabel('T 주차',42,27.2,5.0,1.35,Math.PI/2,'rgba(35,91,119,.82)');
  makeGroundLabel('20 km/h',70,20,6.2,1.35,Math.PI/2,'rgba(44,78,92,.82)');
  makeGroundLabel('돌발',96,20,4.7,1.35,Math.PI/2,'rgba(151,65,39,.84)');
  makeGroundLabel('종료장 ↑',106,20,5.4,1.35,Math.PI/2,'rgba(48,98,65,.84)');
  line(9,.42,110,65,0xffffff,.20);
  makeGroundLabel('종료',110,69,4.5,1.35,0,'rgba(48,98,65,.84)');

  const makeConeFallback=(id,x,z)=>{
    const mesh=new THREE.Mesh(new THREE.ConeGeometry(.28,.58,12),new THREE.MeshStandardMaterial({color:0xf47b20,roughness:.9}));
    mesh.position.set(x,.29,z);mesh.castShadow=true;scene.add(mesh);registerFallback(mesh,'cone');
    addCircleObstacle(id,x,z,.34,{kind:'cone',mesh});return mesh;
  };
  for(let z=64;z<=80;z+=4){makeConeFallback('coneL'+z,-5.2,z);makeConeFallback('coneR'+z,5.2,z)}
  for(let x=32;x<=50;x+=3)makeConeFallback('parkCone'+x,x,42.7);

  addSign('KIDSCADE 운전면허시험장',-8,81);
  addSign('경사로',-6.8,55);addSign('T자 주차',42,44);
  addSign('가속구간',70,26);addSign('급정지',95,26);addSign('종료장',117,55);

  const pole=makeBox(.16,4,.16,0x303a3f,4.6,2,25.6);registerFallback(pole,'trafficLight');addCircleObstacle('signalPole',4.6,25.6,.3);
  const housing=makeBox(.76,1.65,.48,0x1c2428,4.6,3.5,25.6);registerFallback(housing,'trafficLight');
  signalRedMat=new THREE.MeshStandardMaterial({color:0x501818,emissive:0x240000});
  signalGreenMat=new THREE.MeshStandardMaterial({color:0x17431f,emissive:0x001e08});
  const red=new THREE.Mesh(new THREE.SphereGeometry(.19,16,12),signalRedMat);red.position.set(4.6,3.82,25.31);scene.add(red);
  const green=new THREE.Mesh(new THREE.SphereGeometry(.19,16,12),signalGreenMat);green.position.set(4.6,3.2,25.31);scene.add(green);

  const stopMark=textSprite('정지선','#ffffff','rgba(180,34,34,.88)');stopMark.position.set(-6,1.15,29);stopMark.scale.set(3.2,1,1);scene.add(stopMark);
  const parkArrow=textSprite('후진 →','#ffffff','rgba(38,97,122,.88)');parkArrow.position.set(42,1.25,27);parkArrow.scale.set(3.4,1.05,1);scene.add(parkArrow);

  let treeN=0;
  for(const [x,z] of CAMPUS_TREES){
    const treeKey=treeN%3===0?'tree':treeN%3===1?'oak':'pine';
    createFallbackTree(x,z,treeKey);addCircleObstacle('tree'+(++treeN),x,z,.7);
  }

  let buildingN=0;
  for(const b of CAMPUS_BUILDINGS){
    const color=buildingN===0?0x7c9baa:buildingN===1?0x879b82:0x8c879b;
    createFallbackBuilding(b.x,b.z,color,10.5,8.5,5.6,b.key);
    addBoxObstacle('campusBuilding'+(++buildingN),b.x,b.z,11,9);
  }
  let carN=0;
  for(const [key,x,z,rot] of WAITING_CARS){
    createFallbackVehicle(x,z,rot,key);
    addCircleObstacle('waitingCar'+(++carN),x,z,1.55);
  }
}
function initBackupGuides(){
  const makeGuide=()=>{
    const g=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]);
    const line=new THREE.Line(g,new THREE.LineBasicMaterial({color:0xffd85a,transparent:true,opacity:.92}));
    line.layers.set(1);scene.add(line);return line;
  };
  backupGuideLeft=makeGuide();backupGuideRight=makeGuide();
}
function updateBackupGuide(){
  if(!backupGuideLeft||!backupGuideRight)return;
  const active=gameState==='playing'&&currentDirection()===-1;
  backupGuideLeft.visible=backupGuideRight.visible=active;
  if(!active)return;
  const fx=Math.sin(car.yaw),fz=-Math.cos(car.yaw);
  let x=car.x-fx*1.5,z=car.z-fz*1.5,theta=car.yaw;
  const left=[],right=[],ds=.2,steps=24,half=.72;
  for(let i=0;i<=steps;i++){
    const rx=Math.cos(theta),rz=Math.sin(theta),y=groundHeight(x,z)+.075;
    left.push(new THREE.Vector3(x+rx*half,y,z+rz*half));
    right.push(new THREE.Vector3(x-rx*half,y,z-rz*half));
    theta=normAngle(theta-Math.tan(car.wheelAngle)/2.62*ds);
    x-=Math.sin(theta)*ds;z+=Math.cos(theta)*ds;
  }
  backupGuideLeft.geometry.setFromPoints(left);
  backupGuideRight.geometry.setFromPoints(right);
}

function initScene(){
  scene=new THREE.Scene();scene.background=new THREE.Color(0x86c8e4);scene.fog=new THREE.Fog(0x86c8e4,28,92);
  renderer=new THREE.WebGLRenderer({canvas:ui.canvas,antialias:true,powerPreference:'high-performance'});
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  camera=new THREE.PerspectiveCamera(54,innerWidth/Math.max(1,innerHeight),.05,180);
  leftMirrorCamera=new THREE.PerspectiveCamera(52,2,.05,130);rightMirrorCamera=new THREE.PerspectiveCamera(52,2,.05,130);
  backupCamera=new THREE.PerspectiveCamera(58,1.62,.05,110);backupCamera.layers.enable(1);
  scene.add(new THREE.HemisphereLight(0xeaf8ff,0x476448,2.25));
  sunTarget=new THREE.Object3D();scene.add(sunTarget);
  sunLight=new THREE.DirectionalLight(0xfff1cf,3.15);sunLight.position.set(-18,28,14);sunLight.castShadow=true;sunLight.target=sunTarget;
  sunLight.shadow.mapSize.set(2048,2048);sunLight.shadow.camera.left=-23;sunLight.shadow.camera.right=23;sunLight.shadow.camera.top=23;sunLight.shadow.camera.bottom=-23;sunLight.shadow.camera.near=1;sunLight.shadow.camera.far=70;scene.add(sunLight);
  const fill=new THREE.DirectionalLight(0x91c9ff,.68);fill.position.set(14,10,-18);scene.add(fill);
  loader=new GLTFLoader();buildCourse();initBackupGuides();buildHood();loadDecorAssets();resize();
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
  if(inp.throttle>.15&&toastTimer<=0){
    if(!car.engine)showToast('시동이 꺼져 있습니다.','warn',1.2);
    else if(!currentDirection())showToast(license==='auto'?'D 또는 R 기어를 선택하세요.':'주행 기어를 선택하세요.','warn',1.2);
    else if(car.parkingBrake)showToast('주차브레이크가 걸려 있습니다.','warn',1.2);
  }

  const steerSpeedKmh=Math.abs(car.speed)*3.6;
  const steerLimit=lerp(500,265,clamp(steerSpeedKmh/38,0,1));
  const rawSteer=Math.abs(inp.steer)<.025?0:inp.steer;
  const shapedSteer=Math.sign(rawSteer)*Math.pow(Math.abs(rawSteer),1.18);
  const steerTarget=shapedSteer*steerLimit;
  const steerRate=Math.abs(rawSteer)>.025?1650:2100;
  car.steeringWheel=approach(car.steeringWheel,steerTarget,steerRate*dt);
  car.steeringWheel=clamp(car.steeringWheel,-steerLimit,steerLimit);
  car.wheelAngle=rad(car.steeringWheel/15);

  const dir=currentDirection();
  let drive=0,manualClutchEngage=0;
  if(car.engine&&dir){
    if(license==='auto'){
      const along=car.speed*dir;
      const throttleCurve=Math.pow(inp.throttle,1.18);
      drive=throttleCurve*2.15*dir;
      if(inp.throttle<.04&&inp.brake<.04){
        const creepTarget=1.05;
        if(along<creepTarget-.05)car.speed=approach(car.speed,creepTarget*dir,.72*dt);
        else if(along>creepTarget+.08)car.speed=approach(car.speed,creepTarget*dir,.82*dt);
      }
      const target=800+Math.abs(car.speed)*230+inp.throttle*1850;
      car.rpm=lerp(car.rpm,clamp(target,760,3800),clamp(dt*4.5,0,1));
    }else{
      manualClutchEngage=1-inp.clutch;
      const g=Math.abs(Number(car.gear));const power=[0,3.2,2.7,2.35,2.05,1.8][g]||2.5;
      const gearCap=[0,4.8,8.2,11.2,13.8,16][g]||11.2;
      const torqueFade=clamp((gearCap-Math.abs(car.speed))/1.15,0,1);
      drive=inp.throttle*power*manualClutchEngage*dir*torqueFade;
      if(inp.throttle<.04&&manualClutchEngage>.5)car.speed=approach(car.speed,0,(.38+.06*g)*dt);
      const ratio=[0,3.4,2.15,1.55,1.2,1][g]||3.1;
      const wheelRpm=Math.abs(car.speed)*ratio*300;
      const freeRpm=800+inp.throttle*2850;
      const coupledRpm=Math.max(650,wheelRpm);
      const target=lerp(freeRpm,coupledRpm,manualClutchEngage);
      car.rpm=lerp(car.rpm,clamp(target,0,4500),clamp(dt*5,0,1));
      if(car.gear!==0&&manualClutchEngage>.86&&Math.abs(car.speed)<.42&&inp.throttle<.12){
        stallTimer+=dt;if(stallTimer>.62){car.engine=false;car.rpm=0;stallTimer=0;showToast('시동이 꺼졌습니다.','warn');recordEvent('fault','시동 꺼짐');beep(170,.25,.06)}
      }else stallTimer=0;
    }
  }else{
    car.rpm=lerp(car.rpm,car.engine?800:0,clamp(dt*4,0,1));
    if(!dir&&!car.parkingBrake&&inp.brake<.02)car.speed=approach(car.speed,0,.2*dt);
  }

  const forwardZ=-Math.cos(car.yaw),dydz=groundDz(car.x,car.z),gradeAlong=dydz*forwardZ;
  const gravity=-9.81*gradeAlong;
  const transmissionLocked=license==='auto'&&car.gear==='P';
  const accel=drive+gravity;
  if(transmissionLocked){
    car.speed=approach(car.speed,0,14*dt);
  }else if(car.parkingBrake){
    car.speed=approach(car.speed,0,8.5*dt);
  }else if(inp.brake>.01){
    car.speed=approach(car.speed,0,(1.6+inp.brake*5.6)*dt);
  }else{
    car.speed+=accel*dt;
    if(inp.throttle>=.04)car.speed=approach(car.speed,0,.08*dt);
  }
  if(!dir&&!transmissionLocked&&Math.abs(gradeAlong)>.03&&!car.parkingBrake&&inp.brake<.05)car.speed+=gravity*dt;
  const maxForward=license==='auto'?9:10.5,maxReverse=3.6;
  car.speed=clamp(car.speed,-maxReverse,maxForward);
  if(Math.abs(car.speed)<.002)car.speed=0;
  runStats.maxSpeed=Math.max(runStats.maxSpeed,Math.abs(car.speed)*3.6);

  if(collisionCooldown>0)collisionCooldown=Math.max(0,collisionCooldown-dt);
  const prevPose={x:car.x,z:car.z,yaw:car.yaw};
  if(Math.abs(car.speed)>.02){
    car.yaw=normAngle(car.yaw+(car.speed/2.62)*Math.tan(car.wheelAngle)*dt);
    car.x+=Math.sin(car.yaw)*car.speed*dt;
    car.z-=Math.cos(car.yaw)*car.speed*dt;
    const hit=findCollision();
    if(hit)handleCollision(hit,prevPose);
  }
  car.y=groundHeight(car.x,car.z);
  car.pitch=Math.atan(groundDz(car.x,car.z)*(-Math.cos(car.yaw)));

  const roadCorners=carCorners().filter(p=>isOnRoad(p.x,p.z)).length;
  if(roadCorners<=1&&Math.abs(car.speed)>.7){
    offroadTimer+=dt;if(offroadTimer>1.3){runStats.offroad++;addDeduction('차로 이탈',5);offroadTimer=-2}
  }else offroadTimer=Math.max(0,offroadTimer-dt*2);
  if(offroadTimer<0){offroadTimer+=dt;if(offroadTimer>=0)offroadTimer=0}

  examinerMonitor(dt,inp,roadCorners);
  if(gameState==='playing')examStep(dt,inp);
  updateAudio();
}

function examinerMonitor(dt,inp,roadCorners){
  if(gameState!=='playing')return;
  const kmh=Math.abs(car.speed)*3.6;
  if(mode==='exam'){
    if(stage!=='PREP'&&!car.seatbelt){disqualify('안전띠 미착용');return}
    if(stage==='START'&&gameTime-examiner.startAt>EXAM_RULES.startLimit){disqualify('출발 지시 후 30초 이내 미출발');return}
    if(stage!=='ACCEL'&&stage!=='PREP'&&stage!=='SECURE'&&kmh>EXAM_RULES.overspeedKmh){
      examiner.overspeedTimer+=dt;
      if(examiner.overspeedTimer>=EXAM_RULES.overspeedGrace){
        examiner.overspeedTimer=0;examiner.overspeedTicks++;addDeduction('제한속도 20km/h 초과',3);
      }
    }else examiner.overspeedTimer=Math.max(0,examiner.overspeedTimer-dt*2);
    if(roadCorners===0&&Math.abs(car.speed)>.5){
      car._fullOffroad=(car._fullOffroad||0)+dt;
      if(car._fullOffroad>.65){disqualify('코스 완전 이탈');return}
    }else car._fullOffroad=0;
  }
}
function readyGear(){return license==='auto'?car.gear==='D':car.gear===1}
function examStep(dt,inp){
  const kmh=Math.abs(car.speed)*3.6;
  if(stage==='PREP'){
    if(!car.seatbelt){
      setInstruction('먼저 안전띠를 매세요.','아래의 벨트 버튼을 눌러 착용합니다.');
      return;
    }
    if(mode==='exam'&&!controlCheck.complete){
      const task=expectedControlTask();
      if(task){
        setInstruction('운전장치 조작 · '+task.command,'');
        examinerSay(task.command,'운전장치','normal');
      }
      return;
    }
    if(!car.engine){
      setInstruction(mode==='exam'?'시동을 거십시오.':'시동을 거세요.','시동 버튼을 눌러 엔진을 켭니다.');
      return;
    }
    if(!readyGear()){
      setInstruction(
        mode==='exam'?(license==='auto'?'주행 기어로 변속하십시오.':'출발 기어로 변속하십시오.'):(license==='auto'?'브레이크를 밟고 D에 놓으세요.':'클러치를 끝까지 밟고 1단에 넣으세요.'),
        license==='auto'?'기어봉을 아래쪽 D까지 내립니다.':'왼쪽 클러치를 밟은 채 H형 기어봉을 1단으로 옮깁니다.'
      );
      return;
    }
    if(car.parkingBrake){
      setInstruction(mode==='exam'?'주차브레이크를 해제하십시오.':'주차브레이크를 해제하세요.','지금은 주차브레이크가 걸려 있어 D여도 차가 움직이지 않습니다.');
      return;
    }
    stage='START';examiner.startAt=gameTime;examinerStage('출발','좌측 방향지시등을 확인하고 30초 안에 출발하세요.');
    setInstruction(mode==='exam'?'출발하십시오.':'좌측 방향지시등을 켜고 출발하세요.','브레이크에서 발을 떼면 차가 천천히 움직입니다.');
    showToast('출발 준비 완료');
    beep(680,.08,.03);
    return;
  }
  if(stage==='START'&&kmh>2&&car.z<70){
    if(car.signal!==-1)addDeduction('출발 방향지시등 미사용',5);
    stage='HILL';examinerStage('경사로','정지구간에서 3초 이상 정차하고 뒤로 밀리지 않게 출발하세요.');setInstruction(mode==='exam'?'경사로 정지구간 과제를 실시하십시오.':'경사로 정지선에 정확히 멈추세요.',license==='manual'?'클러치와 브레이크로 3초 정지한 뒤 반클러치와 가속으로 출발합니다.':'3초 정지 후 뒤로 밀리지 않게 다시 출발합니다.');
    return;
  }
  if(stage==='HILL'){
    if(car.z<56&&car.z>52&&kmh<.8){
      holdTimer+=dt;if(holdTimer>=EXAM_RULES.hillStopSeconds&&!hillStopped){
        hillStopped=true;examiner.hillStopZ=car.z;examiner.stageStartedAt=gameTime;sectionResults.hill='ok';
        examinerSay('3초 정지 확인. 후방 밀림을 확인합니다.','경사로','ok');showToast('경사로 3초 정지 확인');beep(760,.09,.04);
        setInstruction(mode==='exam'?'경사로에서 출발하십시오.':'경사로에서 출발하세요.','뒤로 50cm 이상 밀리면 감점, 1m 이상은 실격입니다.');
      }
    }else if(!hillStopped)holdTimer=0;
    if(hillStopped&&examiner.hillStopZ!==null){
      examiner.hillRollback=Math.max(examiner.hillRollback,car.z-examiner.hillStopZ);
      if(examiner.hillRollback>=EXAM_RULES.hillWarnRollback&&!examiner.hillWarned){
        examiner.hillWarned=true;addDeduction('경사로 50cm 이상 밀림',10);
      }
      if(examiner.hillRollback>=EXAM_RULES.hillFailRollback){disqualify('경사로 1m 이상 후방 밀림');return}
      if(gameTime-examiner.stageStartedAt>EXAM_RULES.hillExitLimit){disqualify('경사로 정지 후 30초 이내 미통과');return}
    }
    if(car.z<51&&!hillStopped){
      sectionResults.hill='miss';
      if(mode==='exam'){disqualify('경사로 정지구간 미이행');return}
      hillStopped=true;addDeduction('경사로 정지 불이행',10);
    }
    if(car.z<37){stage='INTERSECTION';holdTimer=0;examinerStage('신호교차로','신호와 정지선을 확인하고 우측 방향지시등을 사용하세요.');}
    return;
  }
  if(stage==='INTERSECTION'){
    const light=signalGreen?'초록불':'빨간불';
    setInstruction(mode==='exam'?'신호교차로를 통과하십시오.':'교차로에서 우회전하세요.','현재 신호: '+light+' · 우측 방향지시등을 사용하세요.');
    const frontZ=car.z-Math.cos(car.yaw)*2.15;
    if(frontZ<29&&car.x<3.5){
      if(!signalGreen&&!car._redPenalized){
        car._redPenalized=true;sectionResults.intersection='miss';
        if(mode==='exam'){disqualify('신호위반 또는 정지선 침범');return}
        addDeduction('신호 위반',10);
      }
      if(car.signal!==1&&!car._rightPenalized){car._rightPenalized=true;sectionResults.intersection='miss';addDeduction('우회전 방향지시등 지연',5)}
    }
    const intersectionElapsed=gameTime-examiner.stageStartedAt;
    if(intersectionElapsed>EXAM_RULES.intersectionWarn&&!examiner.intersectionWarned){examiner.intersectionWarned=true;addDeduction('교차로 통과 지연',5)}
    if(mode==='exam'&&intersectionElapsed>EXAM_RULES.intersectionFail){disqualify('교차로에서 30초 이상 정체');return}
    if(car.x>7&&Math.abs(car.z-20)<7){
      if(sectionResults.intersection==='pending')sectionResults.intersection='ok';
      stage='PARK';examinerStage('직각주차','2분 안에 후진 진입하여 확인선을 통과한 뒤 정차하십시오.');setInstruction(mode==='exam'?'직각주차 과제를 실시하십시오.':'T자 주차 구역에 후진 주차하세요.','후진 진입 → 파란 확인선 감지 → 완전 정차 → 주차브레이크 1초 → 출차');showToast('다음 과제: T자 주차');
    }
    return;
  }
  if(stage==='PARK'){
    const inParkingArea=car.x>36&&car.x<48&&car.z>25&&car.z<41;
    const inBay=footprintInside(39.2,44.8,28,38.8)&&Math.abs(Math.sin(car.yaw))<.35;
    if(inParkingArea&&currentDirection()===-1&&Math.abs(car.speed)>.25)parkingReverseSeen=true;
    const corners=carCorners();
    const checkLineReached=parkingReverseSeen&&currentDirection()===-1&&
      corners.some(p=>p.x>=39.2&&p.x<=44.8&&p.z>=36.55);
    if(checkLineReached&&!parkingSensorSeen){
      parkingSensorSeen=true;
      recordEvent('section','T자 주차 확인선 감지');
      examinerSay('확인선 감지. 정차 후 주차브레이크를 작동하십시오.','직각주차','ok');
      showToast('삐— 확인선 감지','normal',1.2);beep(920,.12,.05);
    }
    if(gameTime-examiner.stageStartedAt>EXAM_RULES.parkingLimit&&!parkingComplete){
      sectionResults.parking='miss';addDeduction('직각주차 제한시간 초과',10);examiner.stageStartedAt=gameTime+9999;
    }
    if(inBay&&parkingReverseSeen&&parkingSensorSeen&&kmh<.7){
      if(car.parkingBrake)examiner.parkingBrakeHold+=dt;else examiner.parkingBrakeHold=0;
      if(examiner.parkingBrakeHold>=1){
        parkingComplete=true;sectionResults.parking='ok';stage='PARK_EXIT';holdTimer=0;
        runStats.parking=parkingMetrics();recordEvent('section','T자 주차 완료',runStats.parking);
        const quality=runStats.parking.lat<.35&&runStats.parking.angle<4?'정렬이 매우 좋습니다.':runStats.parking.lat<.65&&runStats.parking.angle<8?'안정적으로 들어왔습니다.':'주차 완료 · 정렬을 조금 더 다듬어 보세요.';
        examinerSay('주차 확인 완료. 주차브레이크를 해제하고 출차하세요.','직각주차','ok');
        showToast(quality);beep(820,.12,.04);setInstruction('주차브레이크를 해제하고 출차하세요.','가속구간에서는 20km/h 이상 속도를 냅니다.');
      }else setInstruction('주차 위치 확인 중','완전히 멈춘 뒤 주차브레이크를 1초 이상 작동하세요.');
    }else{
      examiner.parkingBrakeHold=0;
      if(inBay&&parkingReverseSeen&&!parkingSensorSeen) setInstruction(mode==='exam'?'확인선까지 후진하십시오.':'조금 더 후진해 파란 확인선을 감지하세요.','파란 확인선이 감지된 뒤 정차합니다.');
    }
    if(car.x>66&&!parkingComplete){
      sectionResults.parking='miss';
      if(mode==='exam'){disqualify('직각주차 코스 미이행');return}
      parkingComplete=true;addDeduction('T자 주차 미완료',10);stage='ACCEL';
    }
    return;
  }
  if(stage==='PARK_EXIT'){
    if((car.z<25.2&&car.x>47&&Math.cos(car.yaw-.5*Math.PI)>.45)||car.x>66){
      stage='ACCEL';examinerStage('가속구간',license==='manual'?'20km/h 이상과 2단 이상 변속을 확인합니다.':'표지판 이후 20km/h 이상 가속을 확인합니다.');setInstruction(mode==='exam'?'가속구간 과제를 실시하십시오.':'가속구간에서 20km/h 이상 주행하세요.',license==='manual'?'1단에서 출발한 뒤 2단 이상으로 변속해 가속합니다.':'흰색 시작선을 지난 뒤 충분히 가속합니다.');
    }
    return;
  }
  if(stage==='ACCEL'){
    const manualShiftOk=license!=='manual'||Number(car.gear)>=2;
    if(car.x>59&&car.x<88&&kmh>=20&&manualShiftOk){accelOk=true;sectionResults.acceleration='ok';}
    if(car.x>88){
      if(!accelOk){sectionResults.acceleration='miss';addDeduction(license==='manual'?'가속구간 속도·변속 미이행':'가속구간 속도 미달',10);}
      stage='EMERGENCY';examinerStage('돌발','돌발 신호에 대비하십시오.');setInstruction(mode==='exam'?'돌발 신호에 대비하십시오.':'앞쪽 급정지 구간에 대비하세요.','경고음이 울리면 2초 안에 정지하고, 정지한 뒤 3초 안에 비상등을 켭니다.');
    }
    return;
  }
  if(stage==='EMERGENCY'){
    if(car.x>92&&!emergencyTriggered){
      emergencyTriggered=true;emergencyTimer=0;emergencyBrakeSeen=false;examiner.emergencyStopTime=null;examiner.emergencyHazardTime=null;examiner.emergencyHazardToggleAt=null;
      if(car.hazard&&!examiner.emergencyEarlyHazardPenalized){
        examiner.emergencyEarlyHazardPenalized=true;sectionResults.emergency='miss';addDeduction('돌발 전 비상등 조작',5);
      }
      beep(1100,.12,.09);setTimeout(()=>beep(1100,.12,.09),170);examinerSay('돌발! 2초 이내 정지','돌발','danger');setInstruction('급정지!','2초 안에 정지한 뒤 3초 안에 비상등을 켜세요.');
    }
    if(emergencyTriggered){
      emergencyTimer+=dt;
      if(inp.brake>.35)emergencyBrakeSeen=true;
      if(kmh<.8&&examiner.emergencyStopTime===null){
        examiner.emergencyStopTime=emergencyTimer;
        examinerSay('정지 확인. 3초 안에 비상등을 켜십시오.','돌발','warn');
      }
      if(examiner.emergencyStopTime!==null&&car.hazard&&examiner.emergencyHazardTime===null&&
        examiner.emergencyHazardToggleAt!==null&&examiner.emergencyHazardToggleAt>=examiner.emergencyStopTime){
        examiner.emergencyHazardTime=examiner.emergencyHazardToggleAt-examiner.emergencyStopTime;
      }
      if(emergencyTimer>EXAM_RULES.emergencyStopLimit&&examiner.emergencyStopTime===null&&!examiner.emergencyStopPenalized){
        examiner.emergencyStopPenalized=true;sectionResults.emergency='miss';addDeduction('돌발 2초 이내 정지 실패',10);
      }
      const hazardElapsed=examiner.emergencyStopTime===null?0:emergencyTimer-examiner.emergencyStopTime;
      if(examiner.emergencyStopTime!==null&&hazardElapsed>EXAM_RULES.emergencyHazardLimit&&examiner.emergencyHazardTime===null&&!examiner.emergencyHazardPenalized){
        examiner.emergencyHazardPenalized=true;sectionResults.emergency='miss';addDeduction('정지 후 3초 이내 비상등 조작 실패',10);
      }
      const evaluated=examiner.emergencyStopTime!==null&&hazardElapsed>EXAM_RULES.emergencyHazardLimit+.15;
      if(evaluated){
        if(sectionResults.emergency==='pending')sectionResults.emergency='ok';
        stage='FINISH';examinerStage('종료','비상등을 끄고 앞쪽 반환 차로에서 우측 방향지시등을 켠 뒤 종료장으로 이동하십시오.');
        showToast(sectionResults.emergency==='ok'?'돌발 과제 완료':'돌발 과제 감점');
        setInstruction(mode==='exam'?'종료장으로 이동하십시오.':'비상등을 끄고 반환 차로로 우회전해 종료장으로 이동하세요.','우측 방향지시등 → 반환 차로 진입 → 흰 종료선 뒤 정차');
      }
      if(car.x>=103&&!car._emergencyPenalized){
        car._emergencyPenalized=true;sectionResults.emergency='miss';addDeduction('급정지선 초과',10);
      }
    }
    return;
  }
  if(stage==='FINISH'){
    if(car.hazard&&car.x>104&&!examiner.hazardDrivePenalized){
      examiner.hazardDrivePenalized=true;addDeduction('돌발 후 비상등 미해제',5);
    }
    if(car.x>106&&car.z<27&&!examiner.finishSignalChecked){
      examiner.finishSignalChecked=true;
      if(car.signal!==1)addDeduction('종료장 우측 방향지시등 미사용',5);
    }
    const inFinishZone=Math.abs(car.x-110)<3.8&&car.z>65&&car.z<72;
    if(inFinishZone&&kmh<.8){
      stage='SECURE';examinerStage('종료조작','차량을 안전한 종료 상태로 만드십시오.');setInstruction(mode==='exam'?'종료 조작을 실시하십시오.':'시험을 마무리하세요.',license==='auto'?'P 기어 · 주차브레이크 · 시동 OFF':'중립 N · 주차브레이크 · 시동 OFF');
      showToast('종료장 도착 · 차량을 안전하게 종료하세요.');
    }
    return;
  }
  if(stage==='SECURE'){
    const gearOk=license==='auto'?car.gear==='P':car.gear===0;
    if(gearOk&&car.parkingBrake&&!car.engine)finishRun();
  }
}

function updateCamera(dt){
  updateShadowFocus();
  if(lookPointer===null){headYaw=approach(headYaw,0,.18*dt);headPitch=approach(headPitch,0,.1*dt)}
  const fx=Math.sin(car.yaw),fz=-Math.cos(car.yaw),rx=Math.cos(car.yaw),rz=Math.sin(car.yaw);
  camera.position.set(car.x-rx*.32-fx*.15,car.y+1.43,car.z-rz*.32-fz*.15);
  camera.rotation.order='YXZ';camera.rotation.y=-car.yaw+headYaw;camera.rotation.x=car.pitch+headPitch;camera.rotation.z=0;

  const backYaw=-car.yaw+Math.PI;
  const bx=Math.sin(backYaw),bz=-Math.cos(backYaw);
  for(const [cam,side,out] of [[leftMirrorCamera,-1,.22],[rightMirrorCamera,1,-.22]]){
    cam.position.set(car.x+rx*.7*side-fx*.2,car.y+1.42,car.z+rz*.7*side-fz*.2);
    cam.rotation.order='YXZ';cam.rotation.y=backYaw+out*side;cam.rotation.x=.02;cam.rotation.z=0;
  }
  backupCamera.position.set(car.x-fx*1.72,car.y+1.02,car.z-fz*1.72);
  backupCamera.rotation.order='YXZ';backupCamera.rotation.y=backYaw;backupCamera.rotation.x=-.24;backupCamera.rotation.z=0;
}
function render(){
  renderer.setScissorTest(false);renderer.setViewport(0,0,innerWidth,innerHeight);renderer.render(scene,camera);
  if(gameState==='menu')return;
  const drawInset=(el,cam)=>{
    if(!el)return;
    const r=el.getBoundingClientRect();if(r.width<8||r.height<8)return;
    const x=r.left+6,y=innerHeight-r.bottom+6,w=Math.max(1,r.width-12),h=Math.max(1,r.height-12);
    cam.aspect=w/h;cam.updateProjectionMatrix();
    renderer.setScissorTest(true);renderer.setScissor(x,y,w,h);renderer.setViewport(x,y,w,h);renderer.render(scene,cam);
  };
  drawInset(ui.mirrorLeft,leftMirrorCamera);drawInset(ui.mirrorRight,rightMirrorCamera);
  const reverseActive=gameState==='playing'&&currentDirection()===-1;
  ui.backupCamera?.classList.toggle('show',reverseActive);
  if(reverseActive)drawInset(ui.backupCamera,backupCamera);
  renderer.setScissorTest(false);renderer.setViewport(0,0,innerWidth,innerHeight);
}
function updateHUD(){
  const inp=inputState(),kmh=Math.abs(car.speed)*3.6;
  ui.speed.textContent=Math.round(kmh);ui.rpm.textContent=Math.round(car.rpm/50)*50;ui.gearReadout.textContent=gearText();
  ui.steeringWheel.style.transform='rotate('+car.steeringWheel+'deg)';
  ui.lampLeft.classList.toggle('on',car.signal===-1||car.hazard);ui.lampRight.classList.toggle('on',car.signal===1||car.hazard);ui.lampBrake.classList.toggle('on',inp.brake>.08||car.parkingBrake);
  ui.signalLeft.classList.toggle('active',car.signal===-1);ui.signalRight.classList.toggle('active',car.signal===1);
  ui.ignition.classList.toggle('active',car.engine);
  ui.seatbelt.classList.toggle('active',car.seatbelt);
  ui.parkingBrake.classList.toggle('parking-on',car.parkingBrake);
  ui.parkingBrake.classList.toggle('parking-off',!car.parkingBrake);
  ui.hazard?.classList.toggle('active',car.hazard);
  ui.headlight?.classList.toggle('active',car.headlight);
  ui.wiper?.classList.toggle('active',car.wiper);
  ui.ignition.textContent=car.engine?'시동 ON':'시동';
  ui.seatbelt.textContent=car.seatbelt?'벨트 완료':'벨트';
  ui.parkingBrake.textContent=car.parkingBrake?'주차 ON':'주차 해제';
  for(const [kind,v] of [['throttle',inp.throttle],['brake',inp.brake],['clutch',inp.clutch]]){
    const wrap=kind==='throttle'?ui.throttlePedal:kind==='brake'?ui.brakePedal:ui.clutchPedal;
    const p=wrap.querySelector('.pedal'),meter=wrap.querySelector('.pedal-meter i');if(!p||!meter)continue;
    p.style.transform='perspective(150px) rotateX('+(v*14)+'deg) translateY('+(v*5)+'px)';meter.style.width=(v*100)+'%';
  }
  updateBackupGuide();updateGearVisual();
}

function loop(now){
  const frame=clamp((now-lastTime)/1000,0,.05);lastTime=now;accumulator+=frame;
  let steps=0;while(accumulator>=1/60&&steps<4){physicsStep(1/60);accumulator-=1/60;steps++}
  if(toastTimer>0){toastTimer-=frame;if(toastTimer<=0)ui.toast.className=''}
  updateCamera(frame);updateHUD();render();requestAnimationFrame(loop);
}

function toggleSignal(dir){
  if(car.hazard)car.hazard=false;
  car.signal=car.signal===dir?0:dir;
  if(car.signal===dir)verifyControlAction(dir<0?'signalLeft':'signalRight');
  beep(600,.035,.018);
}
function toggleHeadlight(){
  car.headlight=!car.headlight;recordEvent('control',car.headlight?'전조등 ON':'전조등 OFF');
  showToast(car.headlight?'전조등 ON':'전조등 OFF','normal',.7);beep(car.headlight?700:480,.04,.02);
  if(car.headlight)verifyControlAction('headlight');updateButtonVisuals();
}
function toggleWiper(){
  car.wiper=!car.wiper;recordEvent('control',car.wiper?'와이퍼 ON':'와이퍼 OFF');
  showToast(car.wiper?'와이퍼 작동':'와이퍼 정지','normal',.7);beep(car.wiper?640:460,.04,.02);
  if(car.wiper)verifyControlAction('wiper');updateButtonVisuals();
}
function toggleHazard(){
  car.hazard=!car.hazard;if(car.hazard)car.signal=0;
  if(stage==='EMERGENCY'&&emergencyTriggered&&car.hazard){
    examiner.emergencyHazardToggleAt=emergencyTimer;
    if(examiner.emergencyStopTime===null&&!examiner.emergencyEarlyHazardPenalized){
      examiner.emergencyEarlyHazardPenalized=true;sectionResults.emergency='miss';addDeduction('정지 전 비상등 조작',5);
    }
  }
  recordEvent('control',car.hazard?'비상등 ON':'비상등 OFF');showToast(car.hazard?'비상등 ON':'비상등 OFF',car.hazard?'warn':'normal',.8);beep(car.hazard?720:520,.05,.025);
}
function toggleIgnition(){
  if(car.engine){car.engine=false;car.rpm=0;showToast('시동 OFF');return}
  if(license==='manual'&&inputState().clutch<.55&&car.gear!==0){showToast('클러치를 밟고 시동을 거세요.','warn');return}
  car.engine=true;car.rpm=800;showToast('시동 ON');beep(380,.12,.035);
}
function setAutoGear(g){
  if(license!=='auto')return;
  if((car.gear==='P'||g==='P'||(car.gear==='D'&&g==='R')||(car.gear==='R'&&g==='D'))&&inputState().brake<.22){showToast('브레이크를 밟고 기어를 바꾸세요.','warn');beep(190,.08,.04);return false}
  if(Math.abs(car.speed)>.25&&((car.gear==='D'&&g==='R')||(car.gear==='R'&&g==='D')||g==='P')){showToast('완전히 정차한 뒤 변속하세요.','warn');return false}
  if(car.gear!==g){runStats.gearChanges++;recordEvent('gear','기어 '+g)}car.gear=g;beep(500,.04,.025);return true;
}
function setManualGear(g){
  if(license!=='manual')return false;
  const inp=inputState();
  if(g!==0&&inp.clutch<.62){showToast('클러치를 끝까지 밟고 변속하세요.','warn');beep(150,.14,.05);return false}
  if(g===-1&&Math.abs(car.speed)>.25){showToast('완전히 정차한 뒤 후진기어를 넣으세요.','warn');return false}
  if(g>0&&car.speed<-.25){showToast('정차한 뒤 전진기어를 넣으세요.','warn');return false}
  if(car.gear!==g){runStats.gearChanges++;recordEvent('gear','기어 '+(g===-1?'R':g===0?'N':g))}car.gear=g;
  const label=g===-1?'후진 R':g===0?'중립 N':g+'단';
  showToast(label+' 변속',g===0?'normal':'normal',.8);
  beep(480,.04,.025);return true;
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
function updateButtonVisuals(){
  ui.seatbelt.classList.toggle('active',car.seatbelt);
  ui.ignition.classList.toggle('active',car.engine);
  ui.parkingBrake.classList.toggle('parking-on',car.parkingBrake);
  ui.parkingBrake.classList.toggle('parking-off',!car.parkingBrake);
  ui.hazard?.classList.toggle('active',car.hazard);
  ui.headlight?.classList.toggle('active',car.headlight);
  ui.wiper?.classList.toggle('active',car.wiper);
  ui.ignition.textContent=car.engine?'시동 ON':'시동';
  ui.seatbelt.textContent=car.seatbelt?'벨트 완료':'벨트';
  ui.parkingBrake.textContent=car.parkingBrake?'주차 ON':'주차 해제';
}

function installSteering(){
  const el=ui.steeringPad;let pointer=null;
  const update=e=>{const r=el.getBoundingClientRect(),cx=r.left+r.width/2;touch.steer=clamp((e.clientX-cx)/(r.width*.28),-1,1);ui.steerKnob.style.transform='translate(calc(-50% + '+(touch.steer*24)+'px),-50%)';e.preventDefault()};
  el.addEventListener('pointerdown',e=>{if(pointer!==null)return;pointer=e.pointerId;try{el.setPointerCapture(pointer)}catch(_){}update(e)});
  el.addEventListener('pointermove',e=>{if(e.pointerId===pointer)update(e)});
  const end=e=>{if(e.pointerId!==pointer)return;pointer=null;touch.steer=0;ui.steerKnob.style.transform='translate(-50%,-50%)'};
  ['pointerup','pointercancel','lostpointercapture'].forEach(t=>el.addEventListener(t,end));
}
function installPedal(wrap,kind){
  let startY=0;
  const update=e=>{
    const r=wrap.getBoundingClientRect(),travel=Math.max(44,r.height*.72);
    const up=Math.max(0,startY-e.clientY);
    touch[kind]=clamp(1-up/travel,0,1);
    e.preventDefault();
  };
  wrap.addEventListener('pointerdown',e=>{
    if(pedalPointers[kind]!==null)return;
    pedalPointers[kind]=e.pointerId;startY=e.clientY;touch[kind]=1;
    try{wrap.setPointerCapture(e.pointerId)}catch(_){}
    e.preventDefault();
  });
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
  ui.signalLeft.addEventListener('click',()=>toggleSignal(-1));ui.signalRight.addEventListener('click',()=>toggleSignal(1));ui.hazard?.addEventListener('click',toggleHazard);
  ui.headlight?.addEventListener('click',toggleHeadlight);ui.wiper?.addEventListener('click',toggleWiper);
  ui.ignition.addEventListener('click',toggleIgnition);ui.seatbelt.addEventListener('click',()=>{
    car.seatbelt=!car.seatbelt;
    showToast(car.seatbelt?'안전띠 착용':'안전띠 해제');
    if(!car.seatbelt&&gameState==='playing'){
      if(mode==='exam')disqualify('시험 중 안전띠 해제');
      else if(stage!=='PREP')addDeduction('주행 중 안전띠 해제',5);
    }
    beep(660,.04,.02);
  });
  ui.parkingBrake.addEventListener('click',()=>{
    if(Math.abs(car.speed)>1){showToast('정차 후 주차브레이크를 조작하세요.','warn');return}
    car.parkingBrake=!car.parkingBrake;
    showToast(car.parkingBrake?'주차브레이크가 걸렸습니다.':'주차브레이크를 해제했습니다.');
    beep(car.parkingBrake?330:560,.07,.03);
    updateButtonVisuals();
  });
  addEventListener('keydown',e=>{
    const allow=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyC'];if(allow.includes(e.code)){keys.add(e.code);if(e.code.startsWith('Arrow'))e.preventDefault();return}
    if(e.repeat)return;
    if(e.code==='KeyQ')toggleSignal(-1);else if(e.code==='KeyE')toggleSignal(1);else if(e.code==='KeyH')toggleHazard();else if(e.code==='KeyI')toggleIgnition();else if(e.code==='KeyB'){if(Math.abs(car.speed)<=.5){car.parkingBrake=!car.parkingBrake;updateButtonVisuals();}}
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
window.visualViewport?.addEventListener('resize',resize);
window.visualViewport?.addEventListener('scroll',resize);
document.addEventListener('fullscreenchange',resize);
document.addEventListener('webkitfullscreenchange',resize);

selectOptions();initScene();installControls();resetCar();clock=new THREE.Clock();
try{
  window.KidscadeGame?.registerPauseHandlers?.({
    pause(){if(gameState==='playing')gameState='paused'},
    resume(){if(gameState==='paused'){gameState='playing';lastTime=performance.now();accumulator=0}}
  });
}catch(_){}
requestAnimationFrame(loop);

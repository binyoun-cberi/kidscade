import * as THREE from 'three';

const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const approach=(v,t,rate,dt)=>v+(t-v)*(1-Math.exp(-rate*dt));
const canvas=$('game');

const ui={
  playerHp:$('playerHp'),playerHpText:$('playerHpText'),enemyHp:$('enemyHp'),enemyHpText:$('enemyHpText'),
  enemyName:$('enemyName'),stageLabel:$('stageLabel'),timeState:$('timeState'),timeScale:$('timeScale'),
  incomingTitle:$('incomingTitle'),incomingHint:$('incomingHint'),coach:$('coach'),impact:$('impact'),
  xrayBtn:$('xrayBtn'),resetBtn:$('resetBtn'),helpBtn:$('helpBtn'),leftArmState:$('leftArmState'),rightArmState:$('rightArmState'),
  coreLock:$('coreLock'),legLock:$('legLock'),resultCard:$('resultCard'),resultIcon:$('resultIcon'),resultTitle:$('resultTitle'),
  resultText:$('resultText'),scienceText:$('scienceText'),nextBtn:$('nextBtn'),tutorial:$('tutorial'),tutorialStart:$('tutorialStart')
};

const STAGES=[
  {name:'팔의 길항근',enemy:'기본 복서',hp:70,attacks:['leftStraight','rightStraight'],telegraph:.30,strike:.18,recover:.34,damage:18,feint:0},
  {name:'몸통 회피',enemy:'훅 복서',hp:90,attacks:['leftStraight','rightStraight','leftHook','rightHook'],telegraph:.26,strike:.16,recover:.30,damage:20,feint:0},
  {name:'온몸 카운터',enemy:'페인트 복서',hp:110,attacks:['leftStraight','rightStraight','leftHook','rightHook'],telegraph:.22,strike:.145,recover:.27,damage:23,feint:.38}
];

const MUSCLES={
  leftBiceps:{key:'q',unlock:0,label:'왼팔 상완이두근'},
  leftTriceps:{key:'w',unlock:0,label:'왼팔 상완삼두근'},
  rightBiceps:{key:'e',unlock:0,label:'오른팔 상완이두근'},
  rightTriceps:{key:'r',unlock:0,label:'오른팔 상완삼두근'},
  leftOblique:{key:'a',unlock:1,label:'왼쪽 복사근'},
  rightOblique:{key:'d',unlock:1,label:'오른쪽 복사근'},
  abs:{key:'s',unlock:1,label:'복근'},
  legs:{key:'f',unlock:2,label:'대퇴사두근·둔근'}
};
const keyToMuscle=Object.fromEntries(Object.entries(MUSCLES).map(([id,m])=>[m.key,id]));
const pressed=Object.fromEntries(Object.keys(MUSCLES).map(k=>[k,false]));
const activation=Object.fromEntries(Object.keys(MUSCLES).map(k=>[k,0]));
const buttons=[...document.querySelectorAll('.muscle')];

const state={
  stage:0,running:false,xray:true,playerHp:100,enemyHp:70,worldScale:0,impactBoost:0,last:performance.now(),
  pose:{leftFlex:.55,rightFlex:.55,lean:0,crouch:0,twist:0,drive:0},
  prevPose:{leftFlex:.55,rightFlex:.55,lean:0,crouch:0,twist:0,drive:0},
  arms:{left:{cocked:false,cooldown:0},right:{cocked:false,cooldown:0}},
  enemy:{phase:'telegraph',t:.32,attack:'rightStraight',shownAttack:'rightStraight',resolved:false,feint:false,switched:false,counter:false},
  stats:{hits:0,counters:0,guards:0,dodges:0,taken:0,coContract:0},
  impactTimer:0
};

const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;

const scene=new THREE.Scene();
scene.background=new THREE.Color(0xcbd9df);
scene.fog=new THREE.Fog(0xcbd9df,8,18);
const camera=new THREE.PerspectiveCamera(44,1,.1,50);
camera.position.set(4.2,3.05,5.1);
camera.lookAt(0,1.35,0);

scene.add(new THREE.HemisphereLight(0xf5fbff,0x52636d,1.8));
const keyLight=new THREE.DirectionalLight(0xffffff,2.2);keyLight.position.set(3,6,4);keyLight.castShadow=true;keyLight.shadow.mapSize.set(1024,1024);scene.add(keyLight);
const rimLight=new THREE.DirectionalLight(0xffd9bf,1.0);rimLight.position.set(-4,3,-4);scene.add(rimLight);

const floor=new THREE.Mesh(new THREE.CircleGeometry(5.3,64),new THREE.MeshStandardMaterial({color:0xeaf0f2,roughness:.88}));
floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
for(let r=1.3;r<=3.9;r+=1.3){
  const ring=new THREE.Mesh(new THREE.RingGeometry(r,r+.018,96),new THREE.MeshBasicMaterial({color:0x9bb0ba,transparent:true,opacity:.45,side:THREE.DoubleSide}));
  ring.rotation.x=-Math.PI/2;ring.position.y=.006;scene.add(ring);
}
for(const x of [-3.8,3.8]){
  const post=new THREE.Mesh(new THREE.CylinderGeometry(.07,.08,2.2,16),new THREE.MeshStandardMaterial({color:0x6e8591,roughness:.7}));
  post.position.set(x,1.1,-.2);scene.add(post);
}

const cylGeo=new THREE.CylinderGeometry(1,1,1,18);
const sphereGeo=new THREE.SphereGeometry(1,20,14);
const torsoGeo=new THREE.BoxGeometry(1,1,1);

function mat(color,opts={}){return new THREE.MeshStandardMaterial({color,roughness:opts.roughness??.6,metalness:0,transparent:Boolean(opts.transparent),opacity:opts.opacity??1,emissive:opts.emissive??0x000000,emissiveIntensity:opts.emissiveIntensity??0})}
function mesh(geo,material,parent){const m=new THREE.Mesh(geo,material);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
function setSegment(m,a,b,r=.1){
  const A=new THREE.Vector3(a.x,a.y,a.z),B=new THREE.Vector3(b.x,b.y,b.z),d=B.clone().sub(A),len=Math.max(.001,d.length());
  m.position.copy(A.add(B).multiplyScalar(.5));
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());
  m.scale.set(r,len,r);
}
function setOrb(m,p,sx,sy,sz){m.position.set(p.x,p.y,p.z);m.scale.set(sx,sy,sz)}

function createFighter(kind){
  const root=new THREE.Group();scene.add(root);
  const player=kind==='player';
  const base=player?0x397fbd:0xc95656,skin=player?0xe7b38b:0xd99b79;
  const skinMats=[mat(base),mat(base),mat(skin),mat(skin),mat(skin),mat(skin),mat(0x273743)];
  const torso=mesh(torsoGeo,skinMats[0],root),pelvis=mesh(torsoGeo,skinMats[1],root),head=mesh(sphereGeo,skinMats[2],root);
  const limbNames=['lUpper','lFore','rUpper','rFore','lThigh','lShin','rThigh','rShin'];
  const limbs={};for(const n of limbNames)limbs[n]=mesh(cylGeo,skinMats[n.includes('Thigh')||n.includes('Shin')?1:3],root);
  const gloves={left:mesh(sphereGeo,mat(player?0x2b6ba8:0xb33434),root),right:mesh(sphereGeo,mat(player?0x2b6ba8:0xb33434),root)};
  const boneMat=mat(0xeef8fb,{roughness:.8}),bones={};
  for(const n of limbNames){bones[n]=mesh(cylGeo,boneMat.clone(),root);bones[n].visible=false}
  const jointMat=mat(0xf5fcff),joints=[];
  for(let i=0;i<8;i++){const j=mesh(sphereGeo,jointMat.clone(),root);j.visible=false;joints.push(j)}
  const muscleColors={biceps:0xf3a61f,triceps:0xef5550,core:0x8767d7,abs:0x4c9f70,legs:0x2f8fa8};
  const muscle={};
  for(const id of ['leftBiceps','leftTriceps','rightBiceps','rightTriceps']){
    muscle[id]=mesh(cylGeo,mat(id.includes('Biceps')?muscleColors.biceps:muscleColors.triceps,{transparent:true,opacity:.9,emissive:id.includes('Biceps')?muscleColors.biceps:muscleColors.triceps}),root);
  }
  muscle.leftOblique=mesh(torsoGeo,mat(muscleColors.core,{transparent:true,opacity:.82,emissive:muscleColors.core}),root);
  muscle.rightOblique=mesh(torsoGeo,mat(muscleColors.core,{transparent:true,opacity:.82,emissive:muscleColors.core}),root);
  muscle.abs=mesh(torsoGeo,mat(muscleColors.abs,{transparent:true,opacity:.82,emissive:muscleColors.abs}),root);
  muscle.legsLeft=mesh(cylGeo,mat(muscleColors.legs,{transparent:true,opacity:.86,emissive:muscleColors.legs}),root);
  muscle.legsRight=mesh(cylGeo,mat(muscleColors.legs,{transparent:true,opacity:.86,emissive:muscleColors.legs}),root);
  return{root,torso,pelvis,head,limbs,gloves,bones,joints,muscle,skinMats,lastKin:null,flash:0};
}
const playerVisual=createFighter('player'),enemyVisual=createFighter('enemy');
playerVisual.root.position.z=.82;enemyVisual.root.position.z=-.82;

function rotXZ(x,z,a){const c=Math.cos(a),s=Math.sin(a);return{x:x*c-z*s,z:x*s+z*c}}
function computeKinematics(p,facing=-1){
  const crouch=p.crouch,lean=p.lean,tw=p.twist*facing,drive=p.drive;
  const hipY=.88-crouch*.28;
  const torsoCenter={x:lean*.18,y:1.39-crouch*.31,z:facing*drive*.08};
  const shoulderBaseY=1.70-crouch*.32;
  const head={x:lean*.42,y:2.07-crouch*.44,z:facing*(.02+drive*.07)};
  const hipL={x:-.19+lean*.08,y:hipY,z:0},hipR={x:.19+lean*.08,y:hipY,z:0};
  const kneeZ=facing*.22*crouch;
  const kneeL={x:-.2+lean*.06,y:.48-crouch*.08,z:kneeZ},kneeR={x:.2+lean*.06,y:.48-crouch*.08,z:kneeZ};
  const ankleL={x:-.22,y:.08,z:0},ankleR={x:.22,y:.08,z:0};
  function arm(side,flex){
    const sign=side==='left'?-1:1;
    const shRot=rotXZ(sign*.36,0,tw);
    const shoulder={x:shRot.x+lean*.18,y:shoulderBaseY,z:shRot.z+facing*drive*.08};
    const t=1-flex;
    const guard=rotXZ(sign*.18,facing*.18,tw*.55);
    const ext=rotXZ(sign*.27,facing*(1.45+drive*.16),tw*.8);
    const elbowGuard=rotXZ(sign*.56,facing*.09,tw*.65);
    const elbowExt=rotXZ(sign*.42,facing*.76,tw*.78);
    const hand={x:lerp(guard.x,ext.x,t)+lean*.15,y:lerp(1.92-crouch*.30,1.72-crouch*.26,t),z:lerp(guard.z,ext.z,t)};
    const elbow={x:lerp(elbowGuard.x,elbowExt.x,t)+lean*.16,y:lerp(1.43-crouch*.30,1.66-crouch*.27,t),z:lerp(elbowGuard.z,elbowExt.z,t)};
    return{shoulder,elbow,hand};
  }
  return{torsoCenter,head,hipL,hipR,kneeL,kneeR,ankleL,ankleR,left:arm('left',p.leftFlex),right:arm('right',p.rightFlex)};
}

function updateFighter(v,p,facing,acts={}){
  const k=computeKinematics(p,facing);v.lastKin=k;
  v.torso.position.set(k.torsoCenter.x,k.torsoCenter.y,k.torsoCenter.z);v.torso.scale.set(.68,.82,.38);v.torso.rotation.set(-p.crouch*.18,p.twist*facing,p.lean*.22);
  v.pelvis.position.set(p.lean*.09,.91-p.crouch*.28,0);v.pelvis.scale.set(.62,.27,.34);v.pelvis.rotation.y=p.twist*facing*.35;
  setOrb(v.head,k.head,.23,.25,.22);
  const segs=[
    ['lUpper',k.left.shoulder,k.left.elbow,.13],['lFore',k.left.elbow,k.left.hand,.115],['rUpper',k.right.shoulder,k.right.elbow,.13],['rFore',k.right.elbow,k.right.hand,.115],
    ['lThigh',k.hipL,k.kneeL,.15],['lShin',k.kneeL,k.ankleL,.12],['rThigh',k.hipR,k.kneeR,.15],['rShin',k.kneeR,k.ankleR,.12]
  ];
  for(const [n,a,b,r] of segs){setSegment(v.limbs[n],a,b,r);setSegment(v.bones[n],a,b,r*.34)}
  setOrb(v.gloves.left,k.left.hand,.17,.15,.18);setOrb(v.gloves.right,k.right.hand,.17,.15,.18);
  const jointPts=[k.left.shoulder,k.left.elbow,k.right.shoulder,k.right.elbow,k.hipL,k.kneeL,k.hipR,k.kneeR];
  jointPts.forEach((p0,i)=>setOrb(v.joints[i],p0,.06,.06,.06));
  setSegment(v.muscle.leftBiceps,k.left.shoulder,k.left.elbow,.085*(1+(acts.leftBiceps||0)*.45));
  setSegment(v.muscle.leftTriceps,k.left.shoulder,k.left.elbow,.075*(1+(acts.leftTriceps||0)*.45));
  setSegment(v.muscle.rightBiceps,k.right.shoulder,k.right.elbow,.085*(1+(acts.rightBiceps||0)*.45));
  setSegment(v.muscle.rightTriceps,k.right.shoulder,k.right.elbow,.075*(1+(acts.rightTriceps||0)*.45));
  v.muscle.leftBiceps.position.x-=.035;v.muscle.leftTriceps.position.x+=.035;v.muscle.rightBiceps.position.x+=.035;v.muscle.rightTriceps.position.x-=.035;
  v.muscle.leftOblique.position.set(k.torsoCenter.x-.26,k.torsoCenter.y-.02,k.torsoCenter.z+facing*.12);v.muscle.leftOblique.scale.set(.13,.48,.10);
  v.muscle.rightOblique.position.set(k.torsoCenter.x+.26,k.torsoCenter.y-.02,k.torsoCenter.z+facing*.12);v.muscle.rightOblique.scale.set(.13,.48,.10);
  v.muscle.abs.position.set(k.torsoCenter.x,k.torsoCenter.y-.03,k.torsoCenter.z+facing*.20);v.muscle.abs.scale.set(.23,.52,.08);
  setSegment(v.muscle.legsLeft,k.hipL,k.kneeL,.095*(1+(acts.legs||0)*.35));setSegment(v.muscle.legsRight,k.hipR,k.kneeR,.095*(1+(acts.legs||0)*.35));
  updateMuscleMaterials(v,acts);
}
function updateMuscleMaterials(v,acts){
  const ids=['leftBiceps','leftTriceps','rightBiceps','rightTriceps','leftOblique','rightOblique','abs'];
  for(const id of ids){const a=acts[id]||0,m=v.muscle[id];m.visible=state.xray||a>.06;m.material.emissiveIntensity=.15+a*1.5;m.material.opacity=state.xray?.88:.72}
  for(const id of ['legsLeft','legsRight']){const m=v.muscle[id];m.visible=state.xray||(acts.legs||0)>.06;m.material.emissiveIntensity=.15+(acts.legs||0)*1.5}
}
function applyXray(){
  for(const v of [playerVisual,enemyVisual]){
    v.skinMats.forEach(m=>{m.transparent=state.xray;m.opacity=state.xray?.23:1;m.depthWrite=!state.xray;m.needsUpdate=true});
    Object.values(v.bones).forEach(m=>m.visible=state.xray);
    v.joints.forEach(m=>m.visible=state.xray);
  }
  ui.xrayBtn.classList.toggle('on',state.xray);ui.xrayBtn.setAttribute('aria-pressed',state.xray?'true':'false');
}
applyXray();

const trajectory=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),new THREE.LineBasicMaterial({color:0xe33d3d,transparent:true,opacity:.68}));
scene.add(trajectory);
const targetMarker=new THREE.Mesh(new THREE.SphereGeometry(.28,18,12),new THREE.MeshBasicMaterial({color:0xff5a52,wireframe:true,transparent:true,opacity:.45}));
scene.add(targetMarker);

function attackInfo(id){
  const side=id.startsWith('left')?'left':'right',hook=id.includes('Hook');
  return{side,hook,name:(side==='left'?'왼손 ':'오른손 ')+(hook?'훅':'스트레이트')};
}
function activeStage(){return STAGES[state.stage]}
function chooseAttack(except=''){
  const arr=activeStage().attacks.filter(x=>x!==except);return arr[Math.floor(Math.random()*arr.length)]||activeStage().attacks[0];
}
function beginAttack(){
  const cfg=activeStage(),actual=chooseAttack(state.enemy.attack),feint=Math.random()<cfg.feint;
  const fake=feint?chooseAttack(actual):actual;
  state.enemy={phase:'telegraph',t:.30,attack:actual,shownAttack:fake,resolved:false,feint,switched:false,counter:false};
  syncIncoming();
}
function syncIncoming(){
  const a=attackInfo(state.enemy.shownAttack);
  ui.incomingTitle.textContent=(state.enemy.feint&&!state.enemy.switched?'? ':'')+a.name;
  ui.incomingHint.textContent=state.stage===0?'이두근으로 팔을 굽혀 주먹을 막아 보세요.':a.hook?'복근으로 숙이거나 복사근으로 몸통을 피하세요.':'가드하거나 몸통을 옆으로 피하세요.';
}
function enemyPose(){
  const e=state.enemy,a=attackInfo(e.shownAttack);let strike=0,twist=0,crouch=0,lean=0;
  if(e.phase==='telegraph')strike=0;
  else if(e.phase==='strike')strike=Math.sin(clamp(e.t,0,1)*Math.PI/2);
  else if(e.phase==='recover')strike=1-clamp(e.t,0,1);
  const leftFlex=a.side==='left'?lerp(.88,.04,strike):.78;
  const rightFlex=a.side==='right'?lerp(.88,.04,strike):.78;
  if(a.hook){twist=(a.side==='left'?-1:1)*.42*strike;lean=(a.side==='left'?-1:1)*.08*strike}
  return{leftFlex,rightFlex,lean,crouch,twist,drive:.08*strike};
}
function worldPos(root,p){return new THREE.Vector3(p.x+root.position.x,p.y+root.position.y,p.z+root.position.z)}

function updateTrajectory(){
  if(!enemyVisual.lastKin||!playerVisual.lastKin)return;
  const a=attackInfo(state.enemy.shownAttack),hand=enemyVisual.lastKin[a.side].hand,target=playerVisual.lastKin.head;
  const hp=worldPos(enemyVisual.root,hand),tp=worldPos(playerVisual.root,target);
  trajectory.geometry.setFromPoints([hp,tp]);trajectory.material.opacity=state.enemy.phase==='strike'?.86:.45;
  targetMarker.position.copy(tp);targetMarker.scale.setScalar(a.hook?1.12:.9);
}

function setPressed(id,on){
  const meta=MUSCLES[id];if(!meta||meta.unlock>state.stage||(!state.running&&on))return;
  pressed[id]=Boolean(on);
  syncButtons();
}
function syncButtons(){
  for(const b of buttons){
    const id=b.dataset.muscle,meta=MUSCLES[id],locked=meta.unlock>state.stage;
    b.classList.toggle('locked',locked);b.disabled=locked;b.classList.toggle('active',!locked&&pressed[id]);
    b.setAttribute('aria-pressed',pressed[id]?'true':'false');
    const em=b.querySelector('em');if(em)em.style.width=Math.round((activation[id]||0)*100)+'%';
  }
  ui.coreLock.textContent=state.stage>=1?'사용 가능':'2단계 해금';ui.legLock.textContent=state.stage>=2?'사용 가능':'3단계 해금';
}
buttons.forEach(b=>{
  const id=b.dataset.muscle;
  b.addEventListener('pointerdown',e=>{if(b.disabled)return;e.preventDefault();b.setPointerCapture?.(e.pointerId);setPressed(id,true);ensureAudio()});
  const up=e=>{e.preventDefault();setPressed(id,false)};
  b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('lostpointercapture',()=>setPressed(id,false));
});
window.addEventListener('keydown',e=>{const id=keyToMuscle[e.key.toLowerCase()];if(!id||e.repeat)return;e.preventDefault();setPressed(id,true);ensureAudio()});
window.addEventListener('keyup',e=>{const id=keyToMuscle[e.key.toLowerCase()];if(!id)return;e.preventDefault();setPressed(id,false)});

let audio=null;
function ensureAudio(){if(!audio)try{audio=new (window.AudioContext||window.webkitAudioContext)()}catch(_){}}
function tone(freq=.0,dur=.06,type='sine',gain=.045){
  if(!audio||!freq)return;const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(gain,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+dur);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+dur);
}
function flashImpact(text,good=true){
  ui.impact.textContent=text;ui.impact.classList.add('show');ui.impact.style.color=good?'#fff4b0':'#ffd0d0';clearTimeout(state.impactTimer);state.impactTimer=setTimeout(()=>ui.impact.classList.remove('show'),430);
}

function poseTargets(){
  const p=state.pose;
  const lb=activation.leftBiceps,lt=activation.leftTriceps,rb=activation.rightBiceps,rt=activation.rightTriceps;
  function armTarget(b,t,current){
    if(Math.min(b,t)>.56&&Math.abs(b-t)<.25)return current;
    if(b>t+.08)return .94;if(t>b+.08)return .04;return .55;
  }
  return{
    leftFlex:armTarget(lb,lt,p.leftFlex),rightFlex:armTarget(rb,rt,p.rightFlex),
    lean:clamp((activation.rightOblique-activation.leftOblique)*.58,-.58,.58),
    crouch:activation.abs*.75,
    twist:clamp((activation.rightOblique-activation.leftOblique)*.42,-.42,.42),
    drive:activation.legs*.58
  };
}
function updatePlayer(realDt){
  for(const id of Object.keys(activation))activation[id]=approach(activation[id],pressed[id]?1:0,pressed[id]?8:5.5,realDt);
  state.prevPose={...state.pose};
  const t=poseTargets();
  const leftCo=Math.min(activation.leftBiceps,activation.leftTriceps),rightCo=Math.min(activation.rightBiceps,activation.rightTriceps);
  const leftRate=leftCo>.5?2.0:6.0,rightRate=rightCo>.5?2.0:6.0;
  state.pose.leftFlex=approach(state.pose.leftFlex,t.leftFlex,leftRate,realDt);
  state.pose.rightFlex=approach(state.pose.rightFlex,t.rightFlex,rightRate,realDt);
  state.pose.lean=approach(state.pose.lean,t.lean,5.0,realDt);
  state.pose.crouch=approach(state.pose.crouch,t.crouch,5.0,realDt);
  state.pose.twist=approach(state.pose.twist,t.twist,5.2,realDt);
  state.pose.drive=approach(state.pose.drive,t.drive,5.5,realDt);
  if(leftCo>.55||rightCo>.55)state.stats.coContract+=realDt;
  const d=
    Math.abs(state.pose.leftFlex-state.prevPose.leftFlex)*2.1+
    Math.abs(state.pose.rightFlex-state.prevPose.rightFlex)*2.1+
    Math.abs(state.pose.lean-state.prevPose.lean)*2.6+
    Math.abs(state.pose.crouch-state.prevPose.crouch)*2.5+
    Math.abs(state.pose.twist-state.prevPose.twist)*1.8+
    Math.abs(state.pose.drive-state.prevPose.drive)*2.0;
  const speed=realDt>0?d/realDt:0;
  state.worldScale=state.impactBoost>0?1:(speed<.035?0:clamp(speed*.24,.08,1));
  state.impactBoost=Math.max(0,state.impactBoost-realDt);
  state.arms.left.cooldown=Math.max(0,state.arms.left.cooldown-realDt);state.arms.right.cooldown=Math.max(0,state.arms.right.cooldown-realDt);
  checkPunch('left',realDt);checkPunch('right',realDt);
}
function checkPunch(side,dt){
  const flex=state.pose[side+'Flex'],prev=state.prevPose[side+'Flex'],arm=state.arms[side];
  if(flex>.72)arm.cocked=true;
  const speed=(prev-flex)/Math.max(.001,dt);
  const tri=activation[side+'Triceps'];
  if(arm.cocked&&arm.cooldown<=0&&prev>.22&&flex<.16&&speed>.72&&tri>.3){
    arm.cocked=false;arm.cooldown=.36;resolvePlayerPunch(side,speed);
  }
}
function resolvePlayerPunch(side,speed){
  if(!playerVisual.lastKin||!enemyVisual.lastKin)return;
  const hand=worldPos(playerVisual.root,playerVisual.lastKin[side].hand),head=worldPos(enemyVisual.root,enemyVisual.lastKin.head);
  const dist=hand.distanceTo(head);
  if(dist>.78){flashImpact('헛스윙',false);tone(180,.05,'sine',.025);return}
  const counter=state.enemy.phase==='recover'&&state.enemy.counter;
  const twistBonus=Math.abs(state.pose.twist)>.2?4:0,driveBonus=state.pose.drive>.25?5:0;
  let damage=(counter?26:14)+twistBonus+driveBonus+Math.min(4,Math.max(0,speed-1));
  if(!counter&&state.enemy.phase==='telegraph')damage*=.65;
  damage=Math.round(damage);state.enemyHp=Math.max(0,state.enemyHp-damage);state.stats.hits++;if(counter)state.stats.counters++;
  state.impactBoost=.16;enemyVisual.flash=.18;flashImpact(counter?'⚡ COUNTER '+damage:'퍽! '+damage,true);tone(counter?95:125,.08,'square',.06);
  ui.coach.textContent=counter?'좋아요! 방어 뒤 열린 틈을 바로 공격했어요.':'팔을 굽혀 장전한 뒤 삼두근으로 빠르게 폈어요.';
  ui.coach.className='coach '+(counter?'counter':'good');
  if(state.enemyHp<=0)finishStage(true);
}

function resolveEnemyAttack(){
  const a=attackInfo(state.enemy.attack);
  const guardFlex=a.side==='left'?state.pose.rightFlex:state.pose.leftFlex;
  const guarded=guardFlex>.73;
  const dodged=a.hook?(state.pose.crouch>.43||Math.abs(state.pose.lean)>.37):(state.pose.crouch>.52||Math.abs(state.pose.lean)>.30);
  state.enemy.counter=false;
  if(dodged){
    state.stats.dodges++;state.enemy.counter=true;flashImpact('회피!',true);tone(420,.06,'sine',.035);ui.coach.textContent='공격이 빗나갔어요. 지금이 카운터 기회!';ui.coach.className='coach counter';
  }else if(guarded){
    state.stats.guards++;state.enemy.counter=true;
    const chip=a.hook&&state.stage>0?5:0;if(chip){state.playerHp=Math.max(0,state.playerHp-chip)}
    flashImpact(chip?'가드 -5':'가드!',true);tone(260,.05,'triangle',.04);ui.coach.textContent='이두근으로 팔꿈치를 굽혀 얼굴 앞에 가드를 만들었어요. 카운터!';ui.coach.className='coach counter';
  }else{
    const dmg=activeStage().damage;state.playerHp=Math.max(0,state.playerHp-dmg);state.stats.taken++;state.impactBoost=.12;playerVisual.flash=.16;
    flashImpact('-'+dmg,false);tone(70,.12,'sawtooth',.055);ui.coach.textContent=state.stage===0?'공격하는 쪽 반대 팔의 이두근을 수축해 얼굴 앞을 막아 보세요.':'복사근으로 옆으로 피하거나 복근으로 몸을 낮출 수도 있어요.';ui.coach.className='coach';
    if(state.playerHp<=0){finishStage(false);return}
  }
  syncHud();
}

function updateEnemy(worldDt){
  if(!state.running||worldDt<=0)return;
  const cfg=activeStage(),e=state.enemy;
  if(e.phase==='telegraph'){
    e.t+=worldDt/cfg.telegraph;
    if(e.feint&&!e.switched&&e.t>.58){e.switched=true;e.shownAttack=e.attack;syncIncoming();flashImpact('페인트!',false);tone(220,.04,'square',.025)}
    if(e.t>=1){e.phase='strike';e.t=0;e.resolved=false}
  }else if(e.phase==='strike'){
    e.t+=worldDt/cfg.strike;
    if(!e.resolved&&e.t>=.73){e.resolved=true;resolveEnemyAttack()}
    if(e.t>=1){e.phase='recover';e.t=0}
  }else if(e.phase==='recover'){
    e.t+=worldDt/cfg.recover;
    if(e.t>=1)beginAttack();
  }
}

function syncArmLabels(){
  function text(side){
    const flex=state.pose[side+'Flex'],b=activation[side+'Biceps'],t=activation[side+'Triceps'];
    if(b>.55&&t>.55)return'동시 수축';
    if(flex>.72)return'가드';
    if(flex<.18)return'펴짐';
    return'중립';
  }
  ui.leftArmState.textContent=text('left');ui.rightArmState.textContent=text('right');
}
function syncHud(){
  const cfg=activeStage();ui.playerHp.style.width=state.playerHp+'%';ui.playerHpText.textContent=Math.round(state.playerHp);
  ui.enemyHp.style.width=(state.enemyHp/cfg.hp*100)+'%';ui.enemyHpText.textContent=Math.round(state.enemyHp);ui.enemyName.textContent=cfg.enemy;
  ui.stageLabel.textContent=(state.stage+1)+' · '+cfg.name;ui.timeScale.textContent=Math.round(state.worldScale*100)+'%';
  ui.timeState.textContent=state.worldScale===0?'세계 정지':'몸이 움직이는 중';ui.timeState.parentElement.classList.toggle('moving',state.worldScale>0);
  syncArmLabels();syncButtons();
}
function finishStage(won){
  state.running=false;Object.keys(pressed).forEach(k=>pressed[k]=false);state.worldScale=0;syncButtons();
  ui.resultCard.classList.remove('hidden');
  if(won){
    ui.resultIcon.textContent=state.stage===2?'🏆':'🥊';ui.resultTitle.textContent=state.stage===2?'온몸 전투 완료!':'상대 제압!';
    ui.resultText.textContent='적중 '+state.stats.hits+' · 가드 '+state.stats.guards+' · 회피 '+state.stats.dodges+' · 카운터 '+state.stats.counters;
    ui.scienceText.textContent=state.stage===0?'상완이두근이 팔꿈치를 굽히고 상완삼두근이 펴는 길항 작용을 이용해 가드와 펀치를 만들었습니다.':state.stage===1?'복사근과 복근을 더해 몸통을 기울이고 낮추며 공격 궤도에서 벗어났습니다. 팔만 움직일 때보다 선택지가 늘었습니다.':'팔·몸통·다리 근육군을 함께 사용했습니다. 실제 움직임은 훨씬 많은 근육과 관절이 협력하지만, 여러 근육이 함께 힘과 방향을 만든다는 원리는 같습니다.';
    ui.nextBtn.textContent=state.stage===2?'처음부터 다시':'다음 상대';
  }else{
    ui.resultIcon.textContent='💫';ui.resultTitle.textContent='다시 자세를 만들어 봐요';ui.resultText.textContent='피격 '+state.stats.taken+'회 · 가드 '+state.stats.guards+'회 · 회피 '+state.stats.dodges+'회';
    ui.scienceText.textContent='세계는 내 몸이 움직이는 동안에만 흐릅니다. 공격 궤적을 보고 어떤 관절을 먼저 움직일지 결정한 뒤 천천히 자세를 만들어 보세요.';
    ui.nextBtn.textContent='이 상대 다시';
  }
  ui.nextBtn.dataset.win=won?'1':'0';
}
function resetStage(){
  const cfg=activeStage();state.playerHp=100;state.enemyHp=cfg.hp;state.running=true;state.worldScale=0;state.impactBoost=0;
  state.pose={leftFlex:.55,rightFlex:.55,lean:0,crouch:0,twist:0,drive:0};state.prevPose={...state.pose};
  state.arms={left:{cocked:false,cooldown:0},right:{cocked:false,cooldown:0}};
  state.stats={hits:0,counters:0,guards:0,dodges:0,taken:0,coContract:0};
  for(const k of Object.keys(pressed)){pressed[k]=false;activation[k]=0}
  ui.resultCard.classList.add('hidden');ui.coach.className='coach';
  ui.coach.textContent=state.stage===0?'Q/E 이두근으로 팔을 굽혀 보세요. 몸이 움직이는 동안에만 상대도 움직입니다.':state.stage===1?'A/D 복사근과 S 복근이 열렸어요. 훅은 막기보다 피하면 더 안전합니다.':'F로 다리를 밀어 펀치 힘을 보태세요. 페인트 뒤 진짜 공격 방향도 확인하세요.';
  beginAttack();syncHud();
}
ui.nextBtn.addEventListener('click',()=>{
  const won=ui.nextBtn.dataset.win==='1';
  if(won){state.stage=state.stage===2?0:state.stage+1}
  resetStage();
});
ui.resetBtn.addEventListener('click',resetStage);
ui.xrayBtn.addEventListener('click',()=>{state.xray=!state.xray;applyXray()});
ui.helpBtn.addEventListener('click',()=>{ui.tutorial.classList.remove('hidden');state.running=false;state.worldScale=0;Object.keys(pressed).forEach(k=>pressed[k]=false);syncButtons()});
ui.tutorialStart.addEventListener('click',()=>{ui.tutorial.classList.add('hidden');state.running=true;state.last=performance.now();try{localStorage.setItem('kidscade_body_slow3d_tutorial','1')}catch(_){};ensureAudio()});

function resize(){
  const rect=canvas.getBoundingClientRect(),w=Math.max(1,rect.width),h=Math.max(1,rect.height);
  renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(canvas);resize();

function tick(now){
  const realDt=Math.min(.04,Math.max(.001,(now-state.last)/1000));state.last=now;
  if(state.running){
    updatePlayer(realDt);
    updateEnemy(realDt*state.worldScale);
  }
  updateFighter(playerVisual,state.pose,-1,activation);
  const ep=enemyPose();updateFighter(enemyVisual,ep,1,{});
  if(playerVisual.flash>0)playerVisual.flash=Math.max(0,playerVisual.flash-realDt);
  if(enemyVisual.flash>0)enemyVisual.flash=Math.max(0,enemyVisual.flash-realDt);
  playerVisual.head.material.emissive.setHex(playerVisual.flash>0?0x7d1f1f:0x000000);playerVisual.head.material.emissiveIntensity=playerVisual.flash>0?1.2:0;
  enemyVisual.head.material.emissive.setHex(enemyVisual.flash>0?0xffb14e:0x000000);enemyVisual.head.material.emissiveIntensity=enemyVisual.flash>0?1.4:0;
  updateTrajectory();syncHud();
  const sway=state.pose.lean*.22;camera.position.x=approach(camera.position.x,4.2+sway,3,realDt);camera.lookAt(state.pose.lean*.12,1.34,0);
  renderer.render(scene,camera);requestAnimationFrame(tick);
}

let seen=false;try{seen=localStorage.getItem('kidscade_body_slow3d_tutorial')==='1'}catch(_){}
if(!seen)ui.tutorial.classList.remove('hidden');
resetStage();
if(!seen)state.running=false;
applyXray();requestAnimationFrame(tick);

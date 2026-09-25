import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const rand=(a,b)=>a+Math.random()*(b-a);
const choose=a=>a[(Math.random()*a.length)|0];
const LANES=[-2.55,0,2.55];
const SCORE_KEY='swipeFractionScore';
const RANK_KEY='swipeFractionRank';
const SETTINGS_KEY='fractionDash3dSettings_v1';

const ASSET={
  runner:'../../assets/game/characters/people/character-female-a.glb',
  gates:[
    '../../assets/game/platformer/gates/arch_blue.glb',
    '../../assets/game/platformer/gates/arch_green.glb',
    '../../assets/game/platformer/gates/arch_red.glb'
  ],
  tallArch:'../../assets/game/platformer/gates/arch_tall_blue.glb',
  barrier:'../../assets/game/platformer/obstacles/barrier_2x1x1_red.glb',
  cone:'../../assets/game/platformer/obstacles/cone_yellow.glb',
  tree:'../../assets/game/3d/nature/kenney-nature-kit/tree-default.glb',
  oak:'../../assets/game/3d/nature/kenney-nature-kit/tree-oak.glb',
  lamp:'../../assets/game/3d/city/kenney-city-kit-roads/light-square.glb',
  suv:'../../assets/game/3d/vehicles/kenney-car-kit/suv.glb',
  train:'../../assets/game/3d/rail/kenney-train-kit/train-locomotive-a.glb',
  carriage:'../../assets/game/3d/rail/kenney-train-kit/train-carriage-container-blue.glb'
};

const ui={
  loading:$('loading'),loadingText:$('loadingText'),menu:$('menuOverlay'),result:$('resultOverlay'),
  start:$('startBtn'),restart:$('restartBtn'),home:$('homeBtn'),sound:$('soundBtn'),
  hud:$('hud'),question:$('questionBox'),questionText:$('questionText'),questionHint:$('questionHint'),
  hearts:$('hearts'),score:$('score'),distance:$('distance'),combo:$('combo'),level:$('level'),
  feedback:$('feedback'),feedbackBig:$('feedbackBig'),feedbackSmall:$('feedbackSmall'),
  finalScore:$('finalScore'),finalAccuracy:$('finalAccuracy'),finalCombo:$('finalCombo'),finalDistance:$('finalDistance'),best:$('bestScoreMenu'),finalBest:$('finalBest')
};

let settings={sound:true};
try{settings={...settings,...JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')}}catch{}
let bestScore=Number(localStorage.getItem(SCORE_KEY)||0);
function saveSettings(){try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings))}catch{}ui.sound.textContent=settings.sound?'🔊 소리 켜짐':'🔇 소리 꺼짐'}
saveSettings();

let audioCtx=null;
function tone(kind){
  if(!settings.sound)return;
  try{
    audioCtx??=new(window.AudioContext||window.webkitAudioContext)();
    audioCtx.resume();
    const map={
      move:[330,410,.045,'triangle'],jump:[360,620,.12,'sine'],slide:[240,150,.09,'triangle'],
      good:[620,1080,.16,'sine'],bad:[180,95,.22,'sawtooth'],hit:[110,55,.26,'square'],start:[440,760,.15,'triangle']
    };
    const [a,b,d,type]=map[kind]||map.move,t=audioCtx.currentTime,o=audioCtx.createOscillator(),g=audioCtx.createGain();
    o.type=type;o.frequency.setValueAtTime(a,t);o.frequency.exponentialRampToValueAtTime(Math.max(35,b),t+d);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.045,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+d);
    o.connect(g).connect(audioCtx.destination);o.start(t);o.stop(t+d+.02);
  }catch{}
}

let renderer;
try{renderer=new THREE.WebGLRenderer({canvas:$('scene'),antialias:true,powerPreference:'high-performance'})}
catch(err){ui.loadingText.textContent='이 기기에서 3D 화면을 시작하지 못했어요.';throw err}
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.08;

const scene=new THREE.Scene();
scene.background=new THREE.Color(0x8bd3ef);
scene.fog=new THREE.Fog(0x8bd3ef,28,82);
const camera=new THREE.PerspectiveCamera(52,innerWidth/innerHeight,.1,140);
camera.position.set(0,4.8,10.7);
camera.lookAt(0,1.2,-10);
const hemi=new THREE.HemisphereLight(0xf7fbff,0x496858,1.7);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xfff3d1,2.2);sun.position.set(-8,13,7);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-12;sun.shadow.camera.right=12;sun.shadow.camera.top=12;sun.shadow.camera.bottom=-12;scene.add(sun);

const world=new THREE.Group(),moving=new THREE.Group(),decor=new THREE.Group(),actorLayer=new THREE.Group();
scene.add(world,moving,decor,actorLayer);
const loader=new GLTFLoader(),cache=new Map();

async function loadGLTF(url,timeout=9000){
  if(cache.has(url))return cache.get(url);
  const p=new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('timeout '+url)),timeout);
    loader.load(url,g=>{clearTimeout(timer);resolve(g)},undefined,e=>{clearTimeout(timer);reject(e)});
  });
  cache.set(url,p);
  try{return await p}catch(e){cache.delete(url);throw e}
}
function prep(root){
  root.traverse(o=>{
    if(o.isMesh){
      o.castShadow=true;o.receiveShadow=true;
      if(o.material){if(Array.isArray(o.material))o.material=o.material.map(m=>m.clone());else o.material=o.material.clone()}
    }
  });
  return root;
}
async function fitted(url,target=2){
  const g=await loadGLTF(url),obj=prep(g.scene.clone(true));
  let box=new THREE.Box3().setFromObject(obj),size=new THREE.Vector3();box.getSize(size);
  obj.scale.multiplyScalar(target/(Math.max(size.x,size.y,size.z)||1));
  box=new THREE.Box3().setFromObject(obj);
  const c=box.getCenter(new THREE.Vector3());
  obj.position.x-=c.x;obj.position.z-=c.z;obj.position.y-=box.min.y;
  const wrap=new THREE.Group();wrap.add(obj);
  return{root:wrap,clips:g.animations||[]};
}
function inPlaceClip(src){
  if(!src)return null;
  const clip=src.clone?src.clone():src;
  if(clip?.tracks)clip.tracks=clip.tracks.filter(t=>!/^root\.position$/i.test(t.name));
  return clip;
}

const roadMat=new THREE.MeshStandardMaterial({color:0x26374a,roughness:.92});
const sidewalkMat=new THREE.MeshStandardMaterial({color:0xd8dde2,roughness:.95});
const curbMat=new THREE.MeshStandardMaterial({color:0xf4c84a,roughness:.8});
const laneMat=new THREE.MeshStandardMaterial({color:0xf7f3df,emissive:0x615b33,emissiveIntensity:.08});
const road=new THREE.Mesh(new THREE.PlaneGeometry(9.6,110),roadMat);road.rotation.x=-Math.PI/2;road.position.set(0,0,-42);road.receiveShadow=true;world.add(road);
for(const sx of[-1,1]){
  const walk=new THREE.Mesh(new THREE.BoxGeometry(3.2,.18,110),sidewalkMat);walk.position.set(sx*6.35,.05,-42);walk.receiveShadow=true;world.add(walk);
  const curb=new THREE.Mesh(new THREE.BoxGeometry(.18,.24,110),curbMat);curb.position.set(sx*4.9,.11,-42);world.add(curb);
}
const dashes=[];
for(let z=-92;z<10;z+=6)for(const x of[-1.28,1.28]){
  const m=new THREE.Mesh(new THREE.BoxGeometry(.10,.025,2.6),laneMat);m.position.set(x,.025,z);world.add(m);dashes.push(m);
}
const skylineMat=[0x78909c,0x657a8b,0x8396a4,0x5f7180].map(c=>new THREE.MeshStandardMaterial({color:c,roughness:1}));
const buildings=[];
for(let i=0;i<28;i++){
  const side=i%2?-1:1,h=rand(4,11),w=rand(3,5),d=rand(3,6);
  const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),choose(skylineMat));
  b.position.set(side*rand(9,15),h/2-0.05,-6-i*4.1);
  b.receiveShadow=true;decor.add(b);buildings.push(b);
  const band=new THREE.Mesh(new THREE.BoxGeometry(w*1.01,.18,d*1.01),new THREE.MeshStandardMaterial({color:0xf6d466,emissive:0xb88300,emissiveIntensity:.15}));
  band.position.set(b.position.x,h*.62,b.position.z);decor.add(band);buildings.push(band);
}

const staticDecor=[];
async function addDecorAssets(){
  const defs=[
    [ASSET.tree,2.2,-6.2],[ASSET.oak,2.4,6.3],[ASSET.lamp,2.4,-5.35],[ASSET.lamp,2.4,5.35]
  ];
  for(let row=0;row<7;row++){
    for(const [url,size,x] of defs){
      try{
        const {root}=await fitted(url,size);root.position.set(x,0,-12-row*12+(url===ASSET.lamp?3:0));
        if(x>0)root.rotation.y=Math.PI;decor.add(root);staticDecor.push(root);
      }catch(e){console.warn('decor asset failed',url,e)}
    }
  }
}

let runner=null,runnerMixer=null,runnerAction=null,runnerClips=[];
function fallbackRunner(){
  const g=new THREE.Group(),skin=new THREE.MeshStandardMaterial({color:0xf0c69e}),shirt=new THREE.MeshStandardMaterial({color:0x22c4d6}),dark=new THREE.MeshStandardMaterial({color:0x293446});
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(.32,.75,5,9),shirt);body.position.y=1.15;g.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.30,16,12),skin);head.position.y=1.95;g.add(head);
  for(const s of[-1,1]){
    const leg=new THREE.Mesh(new THREE.CapsuleGeometry(.09,.55,4,8),dark);leg.position.set(.17*s,.48,0);g.add(leg);
    const arm=new THREE.Mesh(new THREE.CapsuleGeometry(.075,.48,4,8),skin);arm.position.set(.43*s,1.22,0);arm.rotation.z=.28*s;g.add(arm);
  }
  g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return g;
}
async function createRunner(){
  try{
    const g=await loadGLTF(ASSET.runner),obj=prep(g.scene);
    let box=new THREE.Box3().setFromObject(obj),size=new THREE.Vector3();box.getSize(size);
    obj.scale.multiplyScalar(1.75/(size.y||1));box=new THREE.Box3().setFromObject(obj);
    const c=box.getCenter(new THREE.Vector3());obj.position.x-=c.x;obj.position.z-=c.z;obj.position.y-=box.min.y;
    runner=new THREE.Group();runner.add(obj);runnerClips=g.animations||[];
    if(runnerClips.length)runnerMixer=new THREE.AnimationMixer(obj);
  }catch(e){console.warn('runner asset fallback',e);runner=fallbackRunner()}
  runner.rotation.y=Math.PI;runner.position.set(0,.02,3.15);actorLayer.add(runner);playAnim('idle');
}
function playAnim(kind,once=false){
  if(!runnerMixer)return;
  const names=kind==='run'?['sprint','run','walk']:kind==='idle'?['idle','stand']:kind==='jump'?['jump','sprint']:kind==='hit'?['hit','damage','idle']:['idle'];
  const src=runnerClips.find(c=>names.some(n=>c.name.toLowerCase().includes(n)))||runnerClips[0];
  if(!src)return;
  const clip=kind==='run'?inPlaceClip(src):src;
  if(runnerAction&&runnerAction.getClip().name===clip.name&&!once)return;
  runnerAction?.fadeOut(.10);
  const a=runnerMixer.clipAction(clip);a.reset().fadeIn(.10);
  if(once){a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true}else a.setLoop(THREE.LoopRepeat,Infinity);
  a.play();runnerAction=a;
}

function roundRect(c,x,y,w,h,r){c.beginPath();c.roundRect(x,y,w,h,r)}
function makeLabel(text,theme='number'){
  const c=document.createElement('canvas');c.width=512;c.height=300;const x=c.getContext('2d');
  x.clearRect(0,0,c.width,c.height);x.fillStyle='rgba(5,16,35,.90)';roundRect(x,20,18,472,264,34);x.fill();x.strokeStyle=theme==='equal'?'#fde047':'#67e8f9';x.lineWidth=10;roundRect(x,20,18,472,264,34);x.stroke();
  x.fillStyle='#fff';x.textAlign='center';x.textBaseline='middle';
  if(text.includes('/')){
    const [n,d]=text.split('/');x.font='900 86px system-ui';x.fillText(n,256,91);x.fillRect(168,143,176,9);x.fillText(d,256,215);
  }else{x.font='1000 112px system-ui';x.fillText(text,256,151)}
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:true}));
  sp.scale.set(3.05,1.78,1);return sp;
}
function fallbackArch(color){
  const mat=new THREE.MeshStandardMaterial({color,roughness:.62,metalness:.05}),g=new THREE.Group();
  for(const x of[-.92,.92]){const p=new THREE.Mesh(new THREE.BoxGeometry(.34,2.55,.38),mat);p.position.set(x,1.27,0);g.add(p)}
  const top=new THREE.Mesh(new THREE.BoxGeometry(2.18,.38,.38),mat);top.position.set(0,2.38,0);g.add(top);return g;
}
async function makeGateAsset(url,index){
  try{return (await fitted(url,2.85)).root}catch{return fallbackArch([0x2ba8cf,0x52b86c,0xe65b62][index])}
}
function fallbackBlock(kind){
  if(kind==='barrier'){const m=new THREE.Mesh(new THREE.BoxGeometry(1.65,.78,.5),new THREE.MeshStandardMaterial({color:0xe6554e}));m.position.y=.39;return m}
  const m=new THREE.Mesh(new THREE.BoxGeometry(1.6,1.45,2.6),new THREE.MeshStandardMaterial({color:kind==='train'?0x3e77a6:0xe8b44a}));m.position.y=.73;return m;
}

let gateLoading=false,obstacleLoading=false,runToken=0;
const game={
  state:'menu',score:0,lives:3,combo:0,bestCombo:0,distance:0,correct:0,answered:0,
  lane:1,targetLane:1,jumpY:0,jumpV:0,onGround:true,slideT:0,invuln:0,speed:10.2,
  gate:null,obstacles:[],nextGate:95,nextObstacle:18,slowT:0
};

function difficulty(){return game.distance<500?1:game.distance<1350?2:3}
function levelText(){return difficulty()===1?'LEVEL 1 · 워밍업':difficulty()===2?'LEVEL 2 · 스피드업':'LEVEL 3 · 초근접 비교'}
function generateQuestion(){
  const lv=difficulty(),dens=lv===1?[2,4,5,10]:lv===2?[4,5,8,10,20,25]:[8,10,20,25,40,50,100];
  let den=choose(dens),num=1+((Math.random()*(den-1))|0),fv=num/den,dv,ds;
  const equal=Math.random()<(lv===1?.18:.13);
  if(equal){dv=fv;ds=Number(fv.toFixed(3)).toString()}
  else{
    let tries=0;
    do{
      dv=lv===1?(1+((Math.random()*9)|0))/10:(1+((Math.random()*98)|0))/100;
      tries++;
    }while(tries<50&&(Math.abs(dv-fv)<(lv===1?.10:lv===2?.035:.012)||dv===fv));
    ds=Number(dv.toFixed(2)).toString();
  }
  let left={str:num+'/'+den,val:fv},right={str:ds,val:dv};if(Math.random()<.5)[left,right]=[right,left];
  const answer=Math.abs(left.val-right.val)<1e-9?1:left.val>right.val?0:2;
  const symbol=answer===1?'=':answer===0?'>':'<';
  return{left,right,answer,explain:left.str+' = '+left.val.toFixed(2)+'  '+symbol+'  '+right.str+' = '+right.val.toFixed(2)};
}
async function spawnGate(){
  if(game.gate||gateLoading)return;
  gateLoading=true;const token=runToken;
  const q=generateQuestion(),group=new THREE.Group();group.position.z=-58;moving.add(group);
  try{
    const gates=await Promise.all(ASSET.gates.map((u,i)=>makeGateAsset(u,i)));
    if(token!==runToken||game.state!=='running'){group.removeFromParent();return}
    for(let i=0;i<3;i++){
      const g=gates[i];g.position.x=LANES[i];group.add(g);
      const label=makeLabel(i===0?q.left.str:i===1?'=':q.right.str,i===1?'equal':'number');label.position.set(LANES[i],3.15,.12);group.add(label);
    }
    game.gate={group,q,resolved:false};
    ui.questionText.textContent=q.left.str+'  VS  '+q.right.str;ui.questionHint.textContent='같으면 가운데 = 게이트';ui.question.classList.add('show');
    game.obstacles.forEach(o=>{if(o.root.position.z<-10){o.root.removeFromParent();o.dead=true}});
    game.nextGate=game.distance+rand(235,285);
  }finally{gateLoading=false}
}
async function buildObstacle(kind,lane){
  let root;
  try{
    const url=kind==='barrier'?ASSET.barrier:kind==='train'?ASSET.train:kind==='suv'?ASSET.suv:ASSET.tallArch;
    root=(await fitted(url,kind==='train'?4.25:kind==='suv'?2.7:kind==='slide'?2.7:1.55)).root;
  }catch{root=fallbackBlock(kind)}
  if(kind==='slide'){
    const panel=new THREE.Mesh(new THREE.BoxGeometry(1.55,.32,.25),new THREE.MeshStandardMaterial({color:0xf59e0b,emissive:0x7c3c00,emissiveIntensity:.12}));
    panel.position.set(0,1.25,0);root.add(panel);
  }
  root.position.set(LANES[lane],0,-58);moving.add(root);return{root,lane,kind,hit:false,dead:false};
}
async function spawnObstacle(){
  if(obstacleLoading)return;
  if(game.gate&&game.gate.group.position.z<-2){game.nextObstacle=game.distance+12;return}
  obstacleLoading=true;const token=runToken;
  try{
    const lane=(Math.random()*3)|0,r=Math.random();
    const kind=r<.42?'barrier':r<.66?'suv':r<.84?'slide':'train';
    const o=await buildObstacle(kind,lane);
    if(token!==runToken||game.state!=='running'){o.root.removeFromParent();return}
    game.obstacles.push(o);
    game.nextObstacle=game.distance+rand(difficulty()===1?34:25,difficulty()===3?44:52);
  }finally{obstacleLoading=false}
}
function showFeedback(ok,text){
  ui.feedback.className='feedback '+(ok?'good':'bad')+' show';ui.feedbackBig.textContent=ok?(game.combo>=5?'GREAT COMBO!':'PERFECT!'):'아깝다!';ui.feedbackSmall.textContent=text;
  clearTimeout(showFeedback.t);showFeedback.t=setTimeout(()=>ui.feedback.classList.remove('show'),850);
}
function updateHud(){
  ui.hearts.textContent='♥'.repeat(game.lives)+'♡'.repeat(3-game.lives);ui.score.textContent=Math.max(0,Math.round(game.score)).toLocaleString();
  ui.distance.textContent=Math.round(game.distance)+'m';ui.combo.textContent='COMBO '+game.combo;ui.level.textContent=levelText();
}
function moveLane(dir){
  if(game.state!=='running')return;const n=clamp(game.targetLane+dir,0,2);if(n!==game.targetLane){game.targetLane=n;tone('move')}
}
function jump(){
  if(game.state!=='running'||!game.onGround||game.slideT>0)return;game.jumpV=7.0;game.onGround=false;tone('jump');playAnim('jump',true);
}
function slide(){
  if(game.state!=='running'||!game.onGround||game.slideT>0)return;game.slideT=.72;tone('slide');
}
function hitObstacle(o){
  if(o.hit||game.invuln>0)return;
  let safe=false;if(o.kind==='barrier')safe=game.jumpY>.72;if(o.kind==='slide')safe=game.slideT>0;
  if(safe)return;
  o.hit=true;game.lives--;game.combo=0;game.invuln=1.3;game.slowT=1.0;game.score=Math.max(0,game.score-40);tone('hit');playAnim('hit',true);showFeedback(false,o.kind==='train'?'기차는 옆 레인으로 피하세요!':o.kind==='slide'?'아래로 스와이프해서 슬라이드!':'장애물을 피하세요!');
  updateHud();if(game.lives<=0)setTimeout(endGame,420);
}
function resolveGate(){
  const g=game.gate;if(!g||g.resolved)return;g.resolved=true;game.answered++;
  const ok=game.targetLane===g.q.answer;
  if(ok){game.correct++;game.combo++;game.bestCombo=Math.max(game.bestCombo,game.combo);const mult=1+Math.min(3,Math.floor((game.combo-1)/4));game.score+=100*mult;tone('good');showFeedback(true,g.q.explain)}
  else{game.combo=0;game.score=Math.max(0,game.score-55);game.slowT=1.2;tone('bad');showFeedback(false,g.q.explain)}
  ui.question.classList.remove('show');updateHud();
}
function clearRunObjects(){
  runToken++;gateLoading=false;obstacleLoading=false;
  if(game.gate){game.gate.group.removeFromParent();game.gate=null}
  game.obstacles.forEach(o=>o.root.removeFromParent());game.obstacles.length=0;
}
function startGame(){
  clearRunObjects();game.state='running';game.score=0;game.lives=3;game.combo=0;game.bestCombo=0;game.distance=0;game.correct=0;game.answered=0;game.lane=1;game.targetLane=1;game.jumpY=0;game.jumpV=0;game.onGround=true;game.slideT=0;game.invuln=0;game.speed=10.2;game.nextGate=85;game.nextObstacle=18;game.slowT=0;
  runner.position.set(0,.02,3.15);runner.scale.setScalar(1);playAnim('run');ui.menu.classList.add('hidden');ui.result.classList.add('hidden');ui.hud.classList.remove('hidden');ui.question.classList.remove('show');tone('start');updateHud();
}
function endGame(){
  if(game.state!=='running')return;game.state='finished';playAnim('idle');ui.hud.classList.add('hidden');ui.question.classList.remove('show');
  bestScore=Math.max(bestScore,Math.round(game.score));localStorage.setItem(SCORE_KEY,bestScore);
  const rank=bestScore<800?'브론즈':bestScore<1800?'실버':bestScore<3200?'골드':bestScore<5000?'플래티넘':'다이아몬드';localStorage.setItem(RANK_KEY,rank);
  ui.finalScore.textContent=Math.round(game.score).toLocaleString();ui.finalAccuracy.textContent=(game.answered?Math.round(game.correct/game.answered*100):0)+'%';ui.finalCombo.textContent=game.bestCombo;ui.finalDistance.textContent=Math.round(game.distance)+'m';ui.best.textContent=bestScore.toLocaleString();ui.finalBest.textContent=bestScore.toLocaleString();ui.result.classList.remove('hidden');
}
function leaveGame(){
  try{if(parent&&parent!==window){parent.postMessage({type:'kidscade:exit-game'},'*');return}}catch{}
  location.href='../../index.html';
}

function update(dt,now){
  runnerMixer?.update(dt);
  if(game.state!=='running'){
    if(runner&&!runnerMixer)runner.rotation.z=Math.sin(now*.002)*.01;
    return;
  }
  const targetSpeed=(difficulty()===1?10.2:difficulty()===2?12.0:13.8)+Math.min(2.5,game.distance/900);
  if(game.slowT>0){game.slowT-=dt;game.speed=lerp(game.speed,targetSpeed*.64,.08)}else game.speed=lerp(game.speed,targetSpeed,.025);
  game.distance+=game.speed*dt*.78;game.score+=game.speed*dt*.22;
  if(game.invuln>0)game.invuln-=dt;if(game.slideT>0)game.slideT=Math.max(0,game.slideT-dt);
  game.lane=lerp(game.lane,game.targetLane,1-Math.pow(.0008,dt));
  runner.position.x=lerp(runner.position.x,LANES[game.targetLane],1-Math.pow(.0002,dt));
  if(!game.onGround){game.jumpV-=17.2*dt;game.jumpY+=game.jumpV*dt;if(game.jumpY<=0){game.jumpY=0;game.jumpV=0;game.onGround=true;playAnim('run')}}
  runner.position.y=.02+game.jumpY;
  const slideScale=game.slideT>0?.57:1;runner.scale.y=lerp(runner.scale.y,slideScale,1-Math.pow(.0005,dt));
  camera.position.x=lerp(camera.position.x,runner.position.x*.16,1-Math.pow(.02,dt));camera.position.y=lerp(camera.position.y,4.8+game.jumpY*.08,1-Math.pow(.02,dt));camera.lookAt(runner.position.x*.08,1.12,-10);
  for(const d of dashes){d.position.z+=game.speed*dt;if(d.position.z>11)d.position.z-=102}
  for(const b of buildings){b.position.z+=game.speed*dt*.32;if(b.position.z>16)b.position.z-=118}
  for(const a of staticDecor){a.position.z+=game.speed*dt*.55;if(a.position.z>13)a.position.z-=84}
  if(game.distance>=game.nextGate&&!game.gate)spawnGate().catch(console.warn);
  if(game.distance>=game.nextObstacle)spawnObstacle().catch(console.warn);
  if(game.gate){
    game.gate.group.position.z+=game.speed*dt;
    if(!game.gate.resolved&&game.gate.group.position.z>2.35)resolveGate();
    if(game.gate.group.position.z>12){game.gate.group.removeFromParent();game.gate=null}
  }
  for(const o of game.obstacles){
    if(o.dead)continue;o.root.position.z+=game.speed*dt;
    if(!o.hit&&o.lane===game.targetLane&&o.root.position.z>2.2&&o.root.position.z<4.2)hitObstacle(o);
    if(o.root.position.z>12){o.root.removeFromParent();o.dead=true}
  }
  game.obstacles=game.obstacles.filter(o=>!o.dead);updateHud();
}

let last=performance.now();
function loop(now){requestAnimationFrame(loop);const dt=Math.min(.045,(now-last)/1000||0);last=now;update(dt,now);renderer.render(scene,camera)}
requestAnimationFrame(loop);

function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75))}
addEventListener('resize',resize);resize();
addEventListener('keydown',e=>{
  if(['ArrowLeft','KeyA'].includes(e.code)){e.preventDefault();moveLane(-1)}
  if(['ArrowRight','KeyD'].includes(e.code)){e.preventDefault();moveLane(1)}
  if(['ArrowUp','KeyW','Space'].includes(e.code)){e.preventDefault();jump()}
  if(['ArrowDown','KeyS'].includes(e.code)){e.preventDefault();slide()}
},{passive:false});
let touch=null;
$('scene').addEventListener('pointerdown',e=>{if(game.state==='running')touch={x:e.clientX,y:e.clientY}});
$('scene').addEventListener('pointerup',e=>{
  if(!touch)return;const dx=e.clientX-touch.x,dy=e.clientY-touch.y,ax=Math.abs(dx),ay=Math.abs(dy);touch=null;if(Math.max(ax,ay)<24)return;
  if(ax>ay)moveLane(dx<0?-1:1);else dy<0?jump():slide();
});
$('leftBtn').onclick=()=>moveLane(-1);$('rightBtn').onclick=()=>moveLane(1);$('jumpBtn').onclick=jump;$('slideBtn').onclick=slide;
ui.start.onclick=startGame;ui.restart.onclick=startGame;ui.home.onclick=leaveGame;ui.sound.onclick=()=>{settings.sound=!settings.sound;saveSettings();if(settings.sound)tone('move')};

async function warm(){
  const urls=[...ASSET.gates,ASSET.tallArch,ASSET.barrier,ASSET.cone,ASSET.tree,ASSET.oak,ASSET.lamp,ASSET.suv,ASSET.train,ASSET.carriage];
  const run=()=>Promise.allSettled(urls.map(u=>loadGLTF(u))).then(rs=>rs.forEach((r,i)=>{if(r.status==='rejected')console.warn('asset preload failed',urls[i],r.reason)}));
  if('requestIdleCallback'in window)requestIdleCallback(run,{timeout:1600});else setTimeout(run,120);
}
async function boot(){
  ui.loadingText.textContent='3D 러너와 도시 에셋을 불러오는 중…';
  await createRunner();await addDecorAssets();ui.best.textContent=bestScore.toLocaleString();
  ui.loading.classList.add('hide');setTimeout(()=>ui.loading.remove(),280);warm();
}
boot().catch(err=>{
  console.error(err);
  if(!runner){runner=fallbackRunner();runner.rotation.y=Math.PI;runner.position.set(0,.02,3.15);actorLayer.add(runner)}
  ui.loading.classList.add('hide');setTimeout(()=>ui.loading.remove(),280);
});

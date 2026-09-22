import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {WORD_BANK,DISTRACTOR_WORDS} from './word-blaster-data.js';

const $=id=>document.getElementById(id);
const canvas=$('game');
const ui={
  emoji:$('emoji'),meaning:$('meaning'),spell:$('spell'),round:$('round'),score:$('score'),
  timer:$('timer'),hint:$('hint'),message:$('message'),bossTag:$('bossTag'),mobileFire:$('mobileFire'),
  startOverlay:$('startOverlay'),startBtn:$('startBtn'),endOverlay:$('endOverlay'),endIcon:$('endIcon'),
  endTitle:$('endTitle'),endText:$('endText'),resultScore:$('resultScore'),resultWords:$('resultWords'),
  resultNoHint:$('resultNoHint'),retryBtn:$('retryBtn')
};

const ROOT='../../';
const WB3D=ROOT+'assets/game/3d/word-blaster/';
const NATURE=ROOT+'assets/game/3d/nature/kenney-nature-kit/';
const MONSTERS=ROOT+'assets/game/3d/characters/monsters/ultimate-monsters-bundle/';
const RAYGUN=ROOT+'assets/game/2d/platformer-art/expansions/request/raygun-big.png';\nconst SCORE_KEY='kidscade_language_v3_word_blaster_best';

const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;

const scene=new THREE.Scene();
scene.background=new THREE.Color(0x91d9ff);
scene.fog=new THREE.Fog(0x91d9ff,28,70);
const camera=new THREE.PerspectiveCamera(72,1,.08,130);
camera.rotation.order='YXZ';
scene.add(camera);

scene.add(new THREE.HemisphereLight(0xf0fbff,0x779654,2.1));
const sun=new THREE.DirectionalLight(0xfff3d0,2.2);
sun.position.set(-14,20,9);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);scene.add(sun);

const world=new THREE.Group(),targetsRoot=new THREE.Group(),fxRoot=new THREE.Group();
scene.add(world,targetsRoot,fxRoot);
const loader=new GLTFLoader(),raycaster=new THREE.Raycaster(),clock=new THREE.Clock();
raycaster.far=70;

const state={
  ready:false,running:false,boss:false,round:0,score:0,noHint:0,completed:[],current:null,
  progress:0,targetSeq:[],targetIndex:0,bossStep:0,bossPicks:[],usedHint:false,time:20,totalTime:20,
  yaw:0,pitch:-.04,player:new THREE.Vector3(0,1.7,5.5),keys:new Set(),lastShot:0,recoil:0,
  targets:[],hitTargets:[],fx:[],gameToken:0,mobileAim:false,lastTouch:null
};
const assets={drone:null,blaster:null,cloud:null,platform:null,tree:null,flower:null,rock:null,dragon:null,raygun:null};
const COLORS=['#ff7569','#55bde8','#7e72db','#ffb84f','#5bc98a','#ee78b8','#42b9aa'];

function isCoarse(){return matchMedia('(pointer:coarse)').matches||innerWidth<800}
function cloneStatic(obj){const c=obj.clone(true);c.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true}});return c}
function normalize(obj,target=1){
  const b=new THREE.Box3().setFromObject(obj),s=b.getSize(new THREE.Vector3()),m=Math.max(s.x,s.y,s.z,.001);
  obj.scale.multiplyScalar(target/m);
  const b2=new THREE.Box3().setFromObject(obj),c=b2.getCenter(new THREE.Vector3());
  obj.position.x-=c.x;obj.position.z-=c.z;obj.position.y-=b2.min.y;return obj;
}
async function loadModel(path){try{return (await loader.loadAsync(path)).scene}catch(_){return null}}
async function loadTexture(path){try{const t=await new THREE.TextureLoader().loadAsync(path);t.colorSpace=THREE.SRGBColorSpace;return t}catch(_){return null}}

let audioCtx=null;
function tone(freq=500,duration=.08,type='sine',gain=.035){
  try{
    audioCtx??=new (window.AudioContext||window.webkitAudioContext)();
    if(audioCtx.state==='suspended')audioCtx.resume();
    const o=audioCtx.createOscillator(),g=audioCtx.createGain(),now=audioCtx.currentTime;
    o.type=type;o.frequency.setValueAtTime(freq,now);o.frequency.exponentialRampToValueAtTime(Math.max(80,freq*.72),now+duration);
    g.gain.setValueAtTime(gain,now);g.gain.exponentialRampToValueAtTime(.0001,now+duration);
    o.connect(g);g.connect(audioCtx.destination);o.start(now);o.stop(now+duration);
  }catch(_){}
}
function sfx(kind){
  if(kind==='shot')tone(660,.06,'square',.025);
  else if(kind==='hit')tone(880,.09,'sine',.04);
  else if(kind==='wrong')tone(180,.12,'sawtooth',.025);
  else if(kind==='clear'){tone(660,.12,'sine',.045);setTimeout(()=>tone(980,.14,'sine',.04),85)}
}

async function prepareAssets(){
  ui.startBtn.disabled=true;ui.startBtn.textContent='불러오는 중...';
  const [drone,blaster,cloud,platform,tree,flower,rock,dragon,raygun]=await Promise.all([
    loadModel(WB3D+'letter-drone.glb'),loadModel(WB3D+'blaster.glb'),loadModel(WB3D+'cloud.glb'),loadModel(WB3D+'platform-large-grass.glb'),
    loadModel(NATURE+'tree-default.glb'),loadModel(NATURE+'flower-yellow-a.glb'),loadModel(NATURE+'rock-small-a.glb'),
    loadModel(MONSTERS+'dragon.glb'),loadTexture(RAYGUN)
  ]);
  Object.assign(assets,{drone,blaster,cloud,platform,tree,flower,rock,dragon,raygun});
  buildWorld();mountWeapon();state.ready=true;ui.startBtn.disabled=false;ui.startBtn.textContent='게임 시작';
}

function proceduralCloud(){
  const g=new THREE.Group(),mat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:1});
  [[0,0,0,1.3],[1.2,.1,0,1],[-1.15,.05,0,.9],[.15,.6,0,.9]].forEach(([x,y,z,s])=>{const m=new THREE.Mesh(new THREE.SphereGeometry(s,12,8),mat);m.position.set(x,y,z);g.add(m)});
  return g;
}
function buildWorld(){
  world.clear();
  const base=new THREE.Mesh(new THREE.CylinderGeometry(19,22,1.55,48),new THREE.MeshStandardMaterial({color:0x77ad55,roughness:.98}));
  base.position.y=-.8;base.receiveShadow=true;world.add(base);
  if(assets.platform){const p=cloneStatic(assets.platform);p.scale.setScalar(7.2);p.position.y=-.03;world.add(p)}
  const rim=new THREE.Mesh(new THREE.TorusGeometry(18.5,.18,.18,64),new THREE.MeshStandardMaterial({color:0xf1d78c,roughness:.8}));
  rim.rotation.x=Math.PI/2;rim.position.y=.12;world.add(rim);
  for(let i=0;i<12;i++){
    if(!assets.tree)break;const a=i/12*Math.PI*2+.16*(i%2),r=14.2+(i%3)*1.15;
    const t=normalize(cloneStatic(assets.tree),2.7+(i%4)*.18);t.position.set(Math.cos(a)*r,0,Math.sin(a)*r);t.rotation.y=a;world.add(t);
  }
  for(let i=0;i<22;i++){
    if(!assets.flower)break;const a=(i*2.399)% (Math.PI*2),r=5+(i%8)*1.25;
    const f=normalize(cloneStatic(assets.flower),.38+(i%3)*.08);f.position.set(Math.cos(a)*r,0,Math.sin(a)*r);f.rotation.y=a;world.add(f);
  }
  for(let i=0;i<7;i++){
    if(!assets.rock)break;const a=i/7*Math.PI*2+.5,r=9+(i%3)*2;
    const o=normalize(cloneStatic(assets.rock),.8+(i%2)*.25);o.position.set(Math.cos(a)*r,0,Math.sin(a)*r);o.rotation.y=a;world.add(o);
  }
  for(let i=0;i<15;i++){
    const c=assets.cloud?normalize(cloneStatic(assets.cloud),4+(i%5)*.6):proceduralCloud();
    const a=i/15*Math.PI*2,r=27+(i%4)*5;c.position.set(Math.cos(a)*r,9+(i%5)*2.5,Math.sin(a)*r);c.scale.y*=.62;
    c.userData.cloud={phase:a,radius:r,speed:.018+.003*(i%5)};world.add(c);
  }
}

let weapon=null;
function mountWeapon(){
  if(weapon)camera.remove(weapon);weapon=new THREE.Group();camera.add(weapon);
  if(assets.blaster){
    const b=normalize(cloneStatic(assets.blaster),1.0);b.rotation.set(-.08,Math.PI,.02);b.position.set(.35,-.34,-.58);weapon.add(b);
  }else if(assets.raygun){
    const s=new THREE.Sprite(new THREE.SpriteMaterial({map:assets.raygun,transparent:true,depthTest:false,depthWrite:false}));
    s.scale.set(.7,.7,1);s.position.set(.34,-.32,-.72);weapon.add(s);
  }else{
    const b=new THREE.Mesh(new THREE.BoxGeometry(.2,.18,.72),new THREE.MeshStandardMaterial({color:0xff784f,roughness:.55}));b.position.set(.34,-.34,-.7);weapon.add(b);
  }
}

function roundRect(ctx,x,y,w,h,r){r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
function makeLabel(text,kind='letter'){
  const c=document.createElement('canvas');c.width=kind==='word'?512:256;c.height=192;const x=c.getContext('2d');
  x.fillStyle='rgba(255,255,255,.97)';roundRect(x,8,8,c.width-16,c.height-16,38);x.fill();
  x.lineWidth=12;x.strokeStyle=COLORS[(Math.random()*COLORS.length)|0];roundRect(x,8,8,c.width-16,c.height-16,38);x.stroke();
  x.fillStyle='#17324d';x.textAlign='center';x.textBaseline='middle';x.font='900 '+(kind==='word'?72:122)+'px Arial,sans-serif';x.fillText(text,c.width/2,c.height/2+4,c.width-34);
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.minFilter=THREE.LinearFilter;
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false}));s.scale.set(kind==='word'?3.8:2.3,kind==='word'?1.42:1.7,1);return s;
}
function makeProceduralDrone(){
  const g=new THREE.Group(),body=new THREE.Mesh(new THREE.SphereGeometry(.48,16,12),new THREE.MeshStandardMaterial({color:0x7d89a6,roughness:.45,metalness:.1}));
  body.position.y=.1;g.add(body);
  const eyeMat=new THREE.MeshBasicMaterial({color:0x8ee9ff});[-.18,.18].forEach(x=>{const e=new THREE.Mesh(new THREE.SphereGeometry(.065,8,6),eyeMat);e.position.set(x,.18,.43);g.add(e)});
  const wingMat=new THREE.MeshStandardMaterial({color:0xdde7ef,roughness:.55});[-1,1].forEach(side=>{const w=new THREE.Mesh(new THREE.BoxGeometry(.52,.08,.24),wingMat);w.position.set(side*.58,.08,0);w.rotation.z=side*.18;g.add(w)});
  return g;
}
function makeDrone(label,kind='letter',slot=0){
  const g=new THREE.Group();
  if(assets.drone){
    const d=normalize(cloneStatic(assets.drone),1.35);d.traverse(n=>{const nm=(n.name||'').toLowerCase();if(nm.includes('blaster-left')||nm.includes('blaster-right'))n.visible=false});d.position.y=-.55;g.add(d);
  }else{const d=makeProceduralDrone();d.position.y=-.35;g.add(d)}
  const badge=makeLabel(label,kind);badge.position.y=kind==='word'?1.08:.92;g.add(badge);
  const hit=new THREE.Mesh(new THREE.SphereGeometry(kind==='word'?1.85:1.25,10,8),new THREE.MeshBasicMaterial({transparent:true,opacity:.001,depthWrite:false}));
  hit.position.y=.62;g.add(hit);
  const t={group:g,label,kind,hit,slot,phase:Math.random()*Math.PI*2,speed:.16+Math.random()*.12,radius:8.5+Math.random()*7,height:3.2+Math.random()*5,wobble:0,dead:false};
  hit.userData.target=t;state.targets.push(t);state.hitTargets.push(hit);targetsRoot.add(g);return t;
}
function clearTargets(){
  for(const t of state.targets){t.group.traverse(n=>{if(n.material?.map?.isCanvasTexture)n.material.map.dispose()});targetsRoot.remove(t.group)}
  state.targets.length=0;state.hitTargets.length=0;
}
function positionTargets(time){
  const n=Math.max(1,state.targets.length);
  state.targets.forEach((t,i)=>{
    if(t.dead)return;const a=(i/n)*Math.PI*2+t.phase+time*t.speed*(i%2?1:-1),r=t.radius+Math.sin(time*.45+t.phase)*1.35;
    t.group.position.set(Math.cos(a)*r,t.height+Math.sin(time*1.35+t.phase)*.65,Math.sin(a)*r);
    t.group.lookAt(camera.position.x,t.group.position.y,camera.position.z);
    if(t.wobble>0){t.wobble=Math.max(0,t.wobble-.035);t.group.rotation.z=Math.sin(time*30)*t.wobble*.35}
  });
}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[a[i],a[j]]=[a[j],a[i]]}return a}
function pickSession(){return shuffle([...WORD_BANK]).slice(0,10)}
let rounds=[];

function startGame(){
  if(!state.ready)return;state.gameToken++;state.running=true;state.boss=false;state.round=0;state.score=0;state.noHint=0;state.completed=[];state.bossStep=0;
  state.player.set(0,1.7,5.5);state.yaw=0;state.pitch=-.04;rounds=pickSession();ui.startOverlay.classList.add('hidden');ui.endOverlay.classList.add('hidden');ui.bossTag.classList.remove('show');
  nextWord();if(!isCoarse())canvas.requestPointerLock?.();
}
function nextWord(){
  if(state.round>=rounds.length){startBoss();return}
  state.boss=false;state.current=rounds[state.round];state.progress=0;state.targetIndex=0;state.targetSeq=[...state.current.en];state.usedHint=false;state.time=state.totalTime=20;clearTargets();
  const pool=[...state.current.en],letters='ABCDEFGHIJKLMNOPQRSTUVWXYZ';while(pool.length<12)pool.push(letters[(Math.random()*letters.length)|0]);
  shuffle(pool).forEach((ch,i)=>makeDrone(ch,'letter',i));ui.emoji.textContent=state.current.emoji;ui.meaning.textContent=state.current.ko;ui.round.textContent=(state.round+1)+' / '+rounds.length;ui.hint.textContent=state.current.en;ui.hint.classList.remove('show');ui.bossTag.classList.remove('show');updateSpell();updateScore();showMessage(state.round?'다음 단어!':'철자 순서대로 맞혀요!',700);
}
function updateSpell(){
  const done=state.boss?state.targetIndex:state.progress;
  ui.spell.innerHTML=state.targetSeq.map((x,i)=>i<done?'<span class="done">'+x+'</span>':'<span class="blank">'+(state.boss?'___':'_')+'</span>').join(' ');
}
function updateScore(){ui.score.textContent=state.score.toLocaleString('ko-KR')}
function showMessage(text,ms=550){ui.message.textContent=text;ui.message.classList.add('show');clearTimeout(showMessage.t);showMessage.t=setTimeout(()=>ui.message.classList.remove('show'),ms)}

function acceptTarget(t){
  const idx=state.boss?state.targetIndex:state.progress,expected=state.targetSeq[idx];
  if(t.label!==expected){state.time=Math.max(.05,state.time-.75);t.wobble=1;sfx('wrong');showMessage('앗! '+expected+'를 찾아봐!',650);return}
  t.dead=true;t.group.visible=false;state.hitTargets=state.hitTargets.filter(h=>h!==t.hit);state.score+=(state.usedHint?100:160)+Math.floor(state.time*4);sfx('hit');burst(t.group.position);updateScore();
  if(state.boss){state.targetIndex++;updateSpell();if(state.targetIndex>=state.targetSeq.length)completeBossSentence();else showMessage('좋아요!',380)}
  else{state.progress++;updateSpell();if(state.progress>=state.targetSeq.length)completeWord();else showMessage(state.targetSeq[state.progress]+'를 찾아요!',430)}
}
function completeWord(){
  state.running=false;if(!state.usedHint)state.noHint++;state.completed.push(state.current);state.score+=state.usedHint?250:450;sfx('clear');updateScore();showMessage(state.current.en+' 완성!',850);
  const token=state.gameToken;setTimeout(()=>{if(token!==state.gameToken)return;state.round++;state.running=true;nextWord()},900);
}
function failGame(){state.running=false;document.exitPointerLock?.();showEnd(false,'시간 안에 '+(state.boss?'문장':state.current.en)+'을 완성하지 못했어요.')}

let dragon=null;
function mountDragon(){
  if(dragon)world.remove(dragon);dragon=new THREE.Group();
  if(assets.dragon){const d=normalize(cloneStatic(assets.dragon),5.7);d.rotation.y=Math.PI;dragon.add(d)}
  else dragon.add(new THREE.Mesh(new THREE.SphereGeometry(2,20,14),new THREE.MeshStandardMaterial({color:0x8264c7})));
  dragon.position.set(0,5,-17);world.add(dragon);
}
function pickBossWords(){
  const done=state.completed.length?state.completed:rounds,idx=[done.length-1,Math.floor(done.length/2),1],out=[];
  for(const i of idx){const w=done[Math.max(0,Math.min(done.length-1,i))];if(w&&!out.includes(w))out.push(w)}
  while(out.length<3)out.push(done[out.length%done.length]);return out.slice(0,3);
}
function startBoss(){state.boss=true;state.bossStep=0;state.bossPicks=pickBossWords();clearTargets();mountDragon();showMessage('문장 보스 등장!',1000);setTimeout(()=>{if(state.boss)startBossSentence()},850)}
function startBossSentence(){
  state.running=true;const w=state.bossPicks[state.bossStep];state.current=w;state.targetSeq=[...w.boss];state.targetIndex=0;state.usedHint=false;state.time=state.totalTime=25;clearTargets();
  const pool=[...state.targetSeq],extra=DISTRACTOR_WORDS.filter(x=>!pool.includes(x));while(pool.length<Math.max(8,state.targetSeq.length+4))pool.push(extra[(Math.random()*extra.length)|0]);
  shuffle(pool).forEach((x,i)=>makeDrone(x,'word',i));ui.emoji.textContent='🐉';ui.meaning.textContent=w.bossKo;ui.round.textContent='BOSS '+(state.bossStep+1)+' / 3';ui.hint.textContent=w.boss.join(' ');ui.hint.classList.remove('show');ui.bossTag.textContent='BOSS · 문장 '+(state.bossStep+1)+' / 3';ui.bossTag.classList.add('show');updateSpell();
}
function completeBossSentence(){
  state.running=false;state.score+=800+(state.usedHint?0:350);sfx('clear');updateScore();showMessage(state.targetSeq.join(' ')+'!',1000);if(dragon)dragon.userData.pulse=1;
  const token=state.gameToken;setTimeout(()=>{if(token!==state.gameToken)return;state.bossStep++;if(state.bossStep>=3){document.exitPointerLock?.();showEnd(true,'세 문장을 모두 완성했어요!')}else startBossSentence()},1050);
}
function showEnd(win,text){
  clearTargets();state.running=false;ui.endOverlay.classList.remove('hidden');ui.endIcon.textContent=win?'🏆':'💫';ui.endTitle.textContent=win?'MISSION CLEAR!':'다시 도전!';ui.endText.textContent=text;
  ui.resultScore.textContent=state.score.toLocaleString('ko-KR');ui.resultWords.textContent=state.completed.length;ui.resultNoHint.textContent=state.noHint;
  let oldBest=0;try{oldBest=window.KidscadeStorage?.getInt?.(SCORE_KEY,0)||0}catch(_){}\n  const best=Math.max(oldBest,state.score);try{window.KidscadeStorage?.setRaw?.(SCORE_KEY,best)}catch(_){}
}

function burst(pos){
  for(let i=0;i<7;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(.055,6,4),new THREE.MeshBasicMaterial({color:new THREE.Color(COLORS[i%COLORS.length])}));m.position.copy(pos);fxRoot.add(m);state.fx.push({obj:m,life:.45,v:new THREE.Vector3((Math.random()-.5)*3,Math.random()*2.6,(Math.random()-.5)*3)})}
}
function shoot(){
  if(!state.running)return;const now=performance.now();if(now-state.lastShot<165)return;state.lastShot=now;state.recoil=1;sfx('shot');
  raycaster.setFromCamera(new THREE.Vector2(0,0),camera);const hits=raycaster.intersectObjects(state.hitTargets,false);if(hits.length){const t=hits[0].object.userData.target;if(t&&!t.dead)acceptTarget(t)}
}
function updateMovement(dt){
  const f=new THREE.Vector3(-Math.sin(state.yaw),0,-Math.cos(state.yaw)),r=new THREE.Vector3(Math.cos(state.yaw),0,-Math.sin(state.yaw)),v=new THREE.Vector3();
  if(state.keys.has('KeyW'))v.add(f);if(state.keys.has('KeyS'))v.sub(f);if(state.keys.has('KeyD'))v.add(r);if(state.keys.has('KeyA'))v.sub(r);
  if(v.lengthSq()){v.normalize().multiplyScalar(3.2*dt);state.player.add(v);const d=Math.hypot(state.player.x,state.player.z);if(d>8.3){state.player.x*=8.3/d;state.player.z*=8.3/d}}
  camera.position.lerp(state.player,.3);camera.rotation.set(state.pitch,state.yaw,0);
  if(weapon){state.recoil=Math.max(0,state.recoil-dt*7);weapon.position.z=state.recoil*.11;weapon.rotation.x=-state.recoil*.04}
}
function updateWorld(time,dt){
  for(const c of world.children){if(c.userData.cloud){const d=c.userData.cloud;d.phase+=d.speed*dt;c.position.x=Math.cos(d.phase)*d.radius;c.position.z=Math.sin(d.phase)*d.radius}}
  if(dragon){dragon.position.y=5+Math.sin(time*1.6)*.4;dragon.rotation.y=Math.PI+Math.sin(time*.45)*.2;if(dragon.userData.pulse>0){dragon.userData.pulse=Math.max(0,dragon.userData.pulse-dt*2.5);dragon.scale.setScalar(1+dragon.userData.pulse*.14)}else dragon.scale.setScalar(1)}
}
function updateFx(dt){
  for(let i=state.fx.length-1;i>=0;i--){const f=state.fx[i];f.life-=dt;f.v.y-=3*dt;f.obj.position.addScaledVector(f.v,dt);f.obj.scale.setScalar(Math.max(.1,f.life/.45));if(f.life<=0){fxRoot.remove(f.obj);f.obj.geometry.dispose();f.obj.material.dispose();state.fx.splice(i,1)}}
}
function updateTimer(dt){
  if(!state.running)return;state.time-=dt;const reveal=state.boss?7:5;if(state.time<=reveal&&!state.usedHint){state.usedHint=true;ui.hint.classList.add('show');showMessage('힌트 공개!',520)}
  ui.timer.style.transform='scaleX('+Math.max(0,state.time/state.totalTime)+')';if(state.time<=0)failGame();
}
function loop(){
  requestAnimationFrame(loop);const dt=Math.min(.05,clock.getDelta()),time=clock.elapsedTime;updateMovement(dt);positionTargets(time);updateWorld(time,dt);updateFx(dt);updateTimer(dt);renderer.render(scene,camera);
}
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()}
addEventListener('resize',resize);resize();
addEventListener('keydown',e=>{state.keys.add(e.code);if(e.code==='Space'){e.preventDefault();shoot()}});
addEventListener('keyup',e=>state.keys.delete(e.code));
canvas.addEventListener('click',()=>{if(!isCoarse()&&document.pointerLockElement!==canvas){canvas.requestPointerLock?.();return}shoot()});
document.addEventListener('mousemove',e=>{if(document.pointerLockElement!==canvas)return;state.yaw-=e.movementX*.0022;state.pitch=THREE.MathUtils.clamp(state.pitch-e.movementY*.0022,-1.16,.82)});
canvas.addEventListener('pointerdown',e=>{if(!isCoarse())return;state.mobileAim=true;state.lastTouch={x:e.clientX,y:e.clientY};canvas.setPointerCapture?.(e.pointerId)});
canvas.addEventListener('pointermove',e=>{if(!state.mobileAim||!state.lastTouch||!isCoarse())return;const dx=e.clientX-state.lastTouch.x,dy=e.clientY-state.lastTouch.y;state.yaw-=dx*.005;state.pitch=THREE.MathUtils.clamp(state.pitch-dy*.005,-1.16,.82);state.lastTouch={x:e.clientX,y:e.clientY}});
canvas.addEventListener('pointerup',()=>{state.mobileAim=false;state.lastTouch=null});
ui.mobileFire.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();shoot()});
ui.startBtn.addEventListener('click',startGame);ui.retryBtn.addEventListener('click',()=>{ui.endOverlay.classList.add('hidden');startGame()});
document.addEventListener('visibilitychange',()=>{if(document.hidden)state.keys.clear()});

prepareAssets().catch(err=>{console.error(err);buildWorld();mountWeapon();state.ready=true;ui.startBtn.disabled=false;ui.startBtn.textContent='게임 시작'});
loop();

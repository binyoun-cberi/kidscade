import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const $=id=>document.getElementById(id);
const canvas=$('game');
const ui={
  hud:$('hud'),mobile:$('mobile'),timer:$('timer'),cleanPct:$('cleanPct'),score:$('score'),combo:$('combo'),
  roomPanel:$('roomPanel'),message:$('message'),mission:$('mission'),tutorialCard:$('tutorialCard'),
  tutorialStep:$('tutorialStep'),tutorialText:$('tutorialText'),tutorialSkip:$('tutorialSkip'),tutorialDone:$('tutorialDone'),
  startOverlay:$('startOverlay'),tutorialBtn:$('tutorialBtn'),startBtn:$('startBtn'),
  endOverlay:$('endOverlay'),endIcon:$('endIcon'),endTitle:$('endTitle'),endText:$('endText'),
  resultClean:$('resultClean'),resultCount:$('resultCount'),resultCombo:$('resultCombo'),
  retryBtn:$('retryBtn'),menuBtn:$('menuBtn'),fireBtn:$('fireBtn')
};

const ROOT='../../';
const FURN=ROOT+'assets/game/3d/interiors/kenney-furniture-kit/';
const FOOD=ROOT+'assets/game/food/';
const CHAR=ROOT+'assets/game/3d/characters/monsters/ultimate-monsters-bundle/';
const BLASTER=ROOT+'assets/game/3d/word-blaster/blaster.glb';
const SCORE_KEY='cleanupSquadBestScore';

const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.1;

const scene=new THREE.Scene();
scene.background=new THREE.Color(0xc7eff7);
scene.fog=new THREE.Fog(0xc7eff7,34,68);
const camera=new THREE.PerspectiveCamera(76,1,.08,100);
camera.rotation.order='YXZ';
scene.add(camera);

scene.add(new THREE.HemisphereLight(0xf5fdff,0x758c7d,2.25));
const sun=new THREE.DirectionalLight(0xfff7dc,2.2);
sun.position.set(-12,20,8);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-26;sun.shadow.camera.right=26;sun.shadow.camera.top=24;sun.shadow.camera.bottom=-24;scene.add(sun);

const world=new THREE.Group(),dirtRoot=new THREE.Group(),fxRoot=new THREE.Group(),villainRoot=new THREE.Group();
scene.add(world,dirtRoot,fxRoot,villainRoot);
const loader=new GLTFLoader(),raycaster=new THREE.Raycaster(),clock=new THREE.Clock();
raycaster.far=38;

const assets={};
const dirt=[],hitTargets=[],fx=[],colliders=[];
const state={
  ready:false,mode:'menu',running:false,time:240,totalTime:240,score:0,cleaned:0,totalSpawned:0,
  combo:1,bestCombo:1,lastCleanAt:0,yaw:0,pitch:.05,player:new THREE.Vector3(0,1.7,6.5),
  keys:new Set(),lastShot:0,recoil:0,cameraKick:0,kickSide:0,firing:false,weapon:'water',bombReadyAt:0,lastTouch:null,mobileAim:false,tutorialStep:0,tutorialStart:new THREE.Vector3(),
  missionToken:0,roomCleanBonus:new Set(),tutorialAdvancePending:false
};
const WEAPONS={
  water:{id:'water',name:'물줄기',icon:'💦',color:0x48dff2,fireLabel:'물줄기!',interval:68},
  foam:{id:'foam',name:'거품 분사기',icon:'🫧',color:0xe9ffff,fireLabel:'거품!',interval:145},
  bomb:{id:'bomb',name:'비누폭탄',icon:'🧼',color:0xffd86e,fireLabel:'폭탄!',interval:300},
  vacuum:{id:'vacuum',name:'강력흡입청소기',icon:'🌪️',color:0x9b8cff,fireLabel:'흡입!',interval:72}
};
const zones=[
  {id:'c1',name:'1반 교실',x1:-16,x2:-1,z1:-11,z2:-2.5},
  {id:'c2',name:'2반 교실',x1:1,x2:16,z1:-11,z2:-2.5},
  {id:'caf',name:'급식실',x1:-16,x2:-1,z1:2.5,z2:11},
  {id:'bath',name:'화장실',x1:1,x2:16,z1:2.5,z2:11},
  {id:'hall',name:'복도',x1:-17,x2:17,z1:-2.5,z2:2.5}
];

const villain={
  group:new THREE.Group(),hit:null,route:[],routeIndex:0,stunned:0,dropClock:1.15,speed:4.15
};
villainRoot.add(villain.group);

function isCoarse(){return matchMedia('(pointer:coarse)').matches||innerWidth<800}
function mat(color,extra={}){return new THREE.MeshStandardMaterial({color,roughness:.78,metalness:.02,...extra})}
function box(w,h,d,color,x=0,y=0,z=0){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;return m
}
function cloneStatic(obj){const c=obj.clone(true);c.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true}});return c}
function normalize(obj,target=1){
  const b=new THREE.Box3().setFromObject(obj),s=b.getSize(new THREE.Vector3()),m=Math.max(s.x,s.y,s.z,.001);
  obj.scale.multiplyScalar(target/m);const b2=new THREE.Box3().setFromObject(obj),c=b2.getCenter(new THREE.Vector3());
  obj.position.x-=c.x;obj.position.z-=c.z;obj.position.y-=b2.min.y;return obj
}
async function loadModel(path){try{return (await loader.loadAsync(path)).scene}catch(_){return null}}
function zoneFor(x,z){return zones.find(q=>x>=q.x1&&x<=q.x2&&z>=q.z1&&z<=q.z2)?.id||'hall'}
function rand(a,b){return a+Math.random()*(b-a)}
function choice(a){return a[(Math.random()*a.length)|0]}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function addCollider(x,z,w,d,pad=.2){colliders.push({x1:x-w/2-pad,x2:x+w/2+pad,z1:z-d/2-pad,z2:z+d/2+pad})}
function addSolid(m,w,d){world.add(m);addCollider(m.position.x,m.position.z,w,d)}

let audioCtx=null;
function tone(freq=500,duration=.08,type='sine',gain=.03){
  try{audioCtx??=new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();
    const o=audioCtx.createOscillator(),g=audioCtx.createGain(),now=audioCtx.currentTime;
    o.type=type;o.frequency.setValueAtTime(freq,now);o.frequency.exponentialRampToValueAtTime(Math.max(90,freq*.72),now+duration);
    g.gain.setValueAtTime(gain,now);g.gain.exponentialRampToValueAtTime(.0001,now+duration);o.connect(g);g.connect(audioCtx.destination);o.start(now);o.stop(now+duration);
  }catch(_){}
}
function sfx(k){if(k==='shot')tone(520,.07,'square',.022);else if(k==='clean')tone(880,.09,'sine',.034);else if(k==='combo')tone(1180,.11,'sine',.038);else if(k==='stun')tone(210,.18,'sawtooth',.026);else if(k==='clear'){tone(660,.12,'sine',.04);setTimeout(()=>tone(980,.15,'sine',.035),90)}}

function showMessage(text,ms=650){ui.message.textContent=text;ui.message.classList.add('show');clearTimeout(showMessage.t);showMessage.t=setTimeout(()=>ui.message.classList.remove('show'),ms)}
function setMission(text){ui.mission.textContent=text}

async function prepare(){
  ui.startBtn.disabled=true;ui.tutorialBtn.disabled=true;ui.startBtn.textContent='학교 준비 중...';
  const entries={
    blaster:BLASTER,ninja:CHAR+'ninja.glb',desk:FURN+'desk.glb',chair:FURN+'chair-desk.glb',
    trashcan:FURN+'trashcan.glb',bookcase:FURN+'bookcase-open.glb',sink:FURN+'bathroom-sink-square.glb',
    toilet:FURN+'toilet-square.glb',table:FURN+'table.glb',
    can:FOOD+'soda-can.glb',bottle:FOOD+'soda-bottle.glb',banana:FOOD+'banana.glb',bag:FOOD+'bag.glb',pizza:FOOD+'pizza-box.glb'
  };
  const vals=await Promise.all(Object.entries(entries).map(async([k,p])=>[k,await loadModel(p)]));
  for(const [k,v] of vals)assets[k]=v;
  buildSchool();buildVillain();mountWeapon();state.ready=true;
  ui.startBtn.disabled=false;ui.tutorialBtn.disabled=false;ui.startBtn.textContent='⚡ 바로 시작';
}

function floorTile(x,z,w,d,color){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,.16,d),mat(color));m.position.set(x,-.08,z);m.receiveShadow=true;world.add(m)
}
function wall(x,z,w,d,h=3.25,color=0xf5fbfa){
  const m=box(w,h,d,color,x,h/2,z);addSolid(m,w,d);return m
}
function addLabel(text,x,y,z,rotY=0){
  const c=document.createElement('canvas');c.width=512;c.height=128;const g=c.getContext('2d');
  g.fillStyle='#ffffff';g.fillRect(0,0,512,128);g.fillStyle='#15495b';g.font='900 58px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(text,256,66);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true}));s.scale.set(4.6,1.15,1);s.position.set(x,y,z);if(rotY)s.material.rotation=rotY;world.add(s)
}
function modelOrBox(key,size,color){
  if(assets[key])return normalize(cloneStatic(assets[key]),size);
  return box(size,size*.65,size*.65,color)
}
function placeProp(key,size,x,z,rot=0,color=0x8aa6af,solid=false){
  const o=modelOrBox(key,size,color);o.position.set(x,0,z);o.rotation.y=rot;world.add(o);
  if(solid){const b=new THREE.Box3().setFromObject(o),s=b.getSize(new THREE.Vector3());addCollider(x,z,Math.max(.5,s.x),Math.max(.5,s.z),.08)}
  return o
}
function buildSchool(){
  world.clear();colliders.length=0;
  floorTile(0,0,35,5,0xe3f2f0);floorTile(-8.5,-6.75,16,8.5,0xf3e6c9);floorTile(8.5,-6.75,16,8.5,0xe0e9f8);
  floorTile(-8.5,6.75,16,8.5,0xf5e0d6);floorTile(8.5,6.75,16,8.5,0xe0f0ea);
  wall(0,-11.1,35,.35);wall(0,11.1,35,.35);wall(-17.3,0,.35,22.4);wall(17.3,0,.35,22.4);
  wall(0,-6.75,.24,8.4,3.1,0xd9e4ec);wall(0,6.75,.24,8.4,3.1,0xd9e4ec);
  [[-16,-2.55,4.5,.22],[-8.5,-2.55,5,.22],[-1.8,-2.55,3.5,.22],[1.8,-2.55,3.5,.22],[8.5,-2.55,5,.22],[16,-2.55,4.5,.22],
   [-16,2.55,4.5,.22],[-8.5,2.55,5,.22],[-1.8,2.55,3.5,.22],[1.8,2.55,3.5,.22],[8.5,2.55,5,.22],[16,2.55,4.5,.22]]
    .forEach(v=>wall(v[0],v[1],v[2],v[3],3.05,0xf2f7f4));
  addLabel('1반 교실',-8,2.65,-2.25);addLabel('2반 교실',8,2.65,-2.25);addLabel('급식실',-8,2.65,2.25);addLabel('화장실',8,2.65,2.25);
  for(const rx of[-13,-9,-5])for(const rz of[-8.7,-5.8]){placeProp('desk',1.45,rx,rz,0,0x9f7657,true);placeProp('chair',.9,rx,rz+1.1,Math.PI,0x6b8da5,true)}
  for(const rx of[4.5,8.5,12.5])for(const rz of[-8.7,-5.8]){placeProp('desk',1.45,rx,rz,0,0x9f7657,true);placeProp('chair',.9,rx,rz+1.1,Math.PI,0x6b8da5,true)}
  placeProp('bookcase',2,-14.8,-4.1,Math.PI/2,0x8e6f53,true);placeProp('bookcase',2,14.8,-4.1,-Math.PI/2,0x8e6f53,true);
  for(const rx of[-13,-8,-3]){placeProp('table',2.4,rx,6.2,0,0xb18260,true);placeProp('table',2.4,rx,9,0,0xb18260,true)}
  placeProp('trashcan',1.05,-15.2,3.6,0,0x537b72,true);placeProp('trashcan',1.05,-1.7,9.5,0,0x537b72,true);
  for(const p of[[4.2,9],[9,9],[13.6,9]])placeProp('toilet',1.25,p[0],p[1],Math.PI,0xdde7e7,true);
  for(const p of[[4.2,4],[9,4],[13.6,4]])placeProp('sink',1.25,p[0],p[1],0,0xdde7e7,true);
  for(let x=-14;x<=14;x+=4){const lamp=new THREE.PointLight(0xeafcff,1.8,9);lamp.position.set(x,3.1,0);world.add(lamp)}
}

let weapon;
function mountWeapon(){
  if(weapon)camera.remove(weapon);weapon=new THREE.Group();camera.add(weapon);
  const cfg=WEAPONS[state.weapon]||WEAPONS.water;
  const b=modelOrBox('blaster',state.weapon==='vacuum'?.74:.63,cfg.color);b.rotation.set(-.06,Math.PI,.02);b.position.set(.5,-.46,-.9);
  b.traverse(n=>{if(n.isMesh&&n.material){const multi=Array.isArray(n.material),mats=multi?n.material:[n.material];const recolored=mats.map(src=>{const m=src.clone();if(!m.map)m.color.lerp(new THREE.Color(cfg.color),.62);m.roughness=Math.max(.42,m.roughness??.6);return m});n.material=multi?recolored:recolored[0]}});
  weapon.add(b);
  if(state.weapon==='water'){
    const tank=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,.32,12),new THREE.MeshStandardMaterial({color:0x9af8ff,transparent:true,opacity:.88,roughness:.18}));
    tank.rotation.z=Math.PI/2;tank.position.set(.42,-.31,-.74);weapon.add(tank)
  }else if(state.weapon==='foam'){
    const chamber=new THREE.Mesh(new THREE.SphereGeometry(.14,14,10),new THREE.MeshStandardMaterial({color:0xffffff,emissive:0xbbefff,emissiveIntensity:.28,roughness:.2}));
    chamber.position.set(.42,-.3,-.72);weapon.add(chamber)
  }else if(state.weapon==='bomb'){
    const can=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.28,14),new THREE.MeshStandardMaterial({color:0xffdd72,roughness:.45}));
    can.rotation.z=Math.PI/2;can.position.set(.41,-.31,-.72);weapon.add(can)
  }else{
    const nozzle=new THREE.Mesh(new THREE.CylinderGeometry(.16,.24,.44,16),new THREE.MeshStandardMaterial({color:0x544b80,roughness:.6}));
    nozzle.rotation.x=Math.PI/2;nozzle.position.set(.43,-.37,-1.03);weapon.add(nozzle)
  }
}
function setWeapon(id,quiet=false){
  if(!WEAPONS[id]||state.weapon===id)return;
  state.weapon=id;state.firing=false;mountWeapon();updateWeaponUI();
  if(!quiet)showMessage(WEAPONS[id].icon+' '+WEAPONS[id].name+' 장착!',520)
}
function updateWeaponUI(){
  const now=performance.now();
  document.querySelectorAll('.weaponBtn').forEach(btn=>{
    btn.classList.toggle('active',btn.dataset.weapon===state.weapon);
    btn.classList.toggle('cooling',btn.dataset.weapon==='bomb'&&now<state.bombReadyAt)
  });
  const cfg=WEAPONS[state.weapon]||WEAPONS.water;
  ui.fireBtn.textContent=cfg.icon+' '+cfg.fireLabel;
}

function buildVillain(){
  villain.group.clear();
  const body=modelOrBox('ninja',2.1,0x2a2c35);body.rotation.y=Math.PI;villain.group.add(body);
  const sack=new THREE.Mesh(new THREE.SphereGeometry(.55,14,10),mat(0x58644c));sack.scale.set(1,.78,.85);sack.position.set(0,1.2,.5);villain.group.add(sack);
  villain.hit=new THREE.Mesh(new THREE.CapsuleGeometry(.48,1.15,5,10),new THREE.MeshBasicMaterial({transparent:true,opacity:.001,depthWrite:false}));
  villain.hit.position.y=1.08;villain.hit.userData.villain=true;villain.group.add(villain.hit);
  villain.route=[
    new THREE.Vector3(-14,0,0),new THREE.Vector3(-10,0,-1),new THREE.Vector3(-10,0,-6.5),new THREE.Vector3(-4,0,-6.5),
    new THREE.Vector3(-3,0,-1),new THREE.Vector3(8,0,0),new THREE.Vector3(8,0,-6.5),new THREE.Vector3(14,0,-6.5),
    new THREE.Vector3(13,0,0),new THREE.Vector3(12,0,6.5),new THREE.Vector3(5,0,6.5),new THREE.Vector3(3,0,0),
    new THREE.Vector3(-8,0,0),new THREE.Vector3(-8,0,6.5),new THREE.Vector3(-14,0,6.5)
  ];
  resetVillain()
}
function resetVillain(){
  villain.group.visible=true;villain.group.position.set(-13,0,0);villain.routeIndex=1;villain.stunned=0;villain.dropClock=1.05;villain.group.rotation.set(0,0,0)
}

const trashDefs=[
  {key:'can',label:'캔',size:.52},{key:'bottle',label:'병',size:.62},{key:'banana',label:'바나나 껍질',size:.62},
  {key:'bag',label:'봉투',size:.7},{key:'pizza',label:'피자 상자',size:.9},{key:'paper',label:'종이뭉치',size:.55}
];
function proceduralTrash(def){
  if(def.key==='paper'){const g=new THREE.Group();for(let i=0;i<4;i++){const p=box(.6,.025,.45,0xf5f1dc);p.position.set((i%2-.5)*.08,.025+i*.035,(i%3-1)*.045);p.rotation.y=(i-1.5)*.15;g.add(p)}return g}
  return modelOrBox(def.key,def.size,0xd2ba7d)
}
function addDirtRecord(rec){
  dirt.push(rec);if(rec.hit){rec.hit.userData.dirt=rec;hitTargets.push(rec.hit)}
  if(state.mode!=='tutorial')state.totalSpawned++
}
function spawnTrash(x,z,def=choice(trashDefs),tutorial=false){
  const g=new THREE.Group(),model=proceduralTrash(def);model.rotation.set(rand(-.1,.1),rand(0,Math.PI*2),rand(-.1,.1));g.add(model);
  const hit=new THREE.Mesh(new THREE.SphereGeometry(Math.max(.35,def.size*.6),10,7),new THREE.MeshBasicMaterial({transparent:true,opacity:.001,depthWrite:false}));
  hit.position.y=Math.max(.28,def.size*.34);g.add(hit);g.position.set(x,0,z);dirtRoot.add(g);
  const rec={kind:'trash',group:g,hit,hp:1,maxHp:1,label:def.label,zone:zoneFor(x,z),dead:false,tutorial};
  addDirtRecord(rec);return rec
}
function spawnStain(x,z,tutorial=false,special=false){
  const r=special?.48:rand(.55,1.05),geo=new THREE.CircleGeometry(r,24),material=new THREE.MeshStandardMaterial({color:special?0x7f5b39:choice([0x875b3d,0x755945,0x73906b,0x9a744e]),roughness:1,transparent:true,opacity:.72,depthWrite:false});
  const m=new THREE.Mesh(geo,material);m.rotation.x=-Math.PI/2;m.position.set(x,.012,z);dirtRoot.add(m);
  const rec={kind:special?'gum':'stain',group:m,hit:m,hp:special?5:3,maxHp:special?5:3,label:special?'껌':'얼룩',zone:zoneFor(x,z),dead:false,tutorial};
  addDirtRecord(rec);return rec
}
function clearDirt(){
  for(const d of dirt){dirtRoot.remove(d.group);if(d.group.geometry)d.group.geometry.dispose?.()}
  dirt.length=0;hitTargets.length=0
}
function randomPoint(zone){
  const q=choice(zone==='all'?zones:zones.filter(z=>z.id===zone));return [rand(q.x1+.8,q.x2-.8),rand(q.z1+.7,q.z2-.7)]
}
function messBurst(x,z,count=9,spread=2.4,tutorial=false){
  for(let i=0;i<count;i++){
    const a=Math.random()*Math.PI*2,r=Math.sqrt(Math.random())*spread;
    const px=clamp(x+Math.cos(a)*r,-16.2,16.2),pz=clamp(z+Math.sin(a)*r,-10.4,10.4);
    if(Math.random()<.72)spawnStain(px,pz,tutorial,false);
    else spawnTrash(px,pz,choice(trashDefs),tutorial)
  }
}
function initialMess(){
  clearDirt();
  for(const z of zones){
    const cx=(z.x1+z.x2)/2,cz=(z.z1+z.z2)/2;
    messBurst(cx+rand(-2,2),cz+rand(-1.5,1.5),z.id==='hall'?22:26,z.id==='hall'?5.8:4.4)
  }
}
function dropVillainTrash(){
  const active=dirt.filter(d=>!d.dead).length;
  if(state.mode!=='game'||villain.stunned>0||active>240)return;
  const p=villain.group.position;
  messBurst(p.x,p.z,(Math.random()*5|0)+7,rand(1.7,2.8));
  if(Math.random()<.35)showMessage(choice(['우르르 쏟아졌다!','악당이 또 왕창 버렸어요!','저쪽이 순식간에 더러워졌어요!']),420)
}

function resetStats(){
  state.score=0;state.cleaned=0;state.totalSpawned=0;state.combo=1;state.bestCombo=1;state.lastCleanAt=0;state.time=state.totalTime=240;state.roomCleanBonus.clear();
  updateHud()
}
function startGame(){
  if(!state.ready)return;state.missionToken++;state.mode='game';state.running=true;state.weapon='water';state.bombReadyAt=0;mountWeapon();updateWeaponUI();resetStats();initialMess();resetVillain();
  state.player.set(0,1.7,1);state.yaw=0;state.pitch=.04;ui.startOverlay.classList.add('hidden');ui.endOverlay.classList.add('hidden');ui.hud.classList.remove('hidden');ui.tutorialCard.classList.add('hidden');
  ui.mobile.classList.toggle('hidden',!isCoarse());setMission('청소총을 누른 채 바닥을 넓게 쓸어 주세요! 악당은 계속 오염을 왕창 뿌립니다. 청소율 90%가 목표예요.');
  showMessage('청소 특공대 출동!',900);if(!isCoarse())canvas.requestPointerLock?.()
}
function startTutorial(){
  if(!state.ready)return;state.missionToken++;state.mode='tutorial';state.running=true;state.weapon='water';state.bombReadyAt=0;mountWeapon();updateWeaponUI();resetStats();clearDirt();resetVillain();villain.group.visible=false;
  state.player.set(0,1.7,1);state.yaw=0;state.pitch=.04;state.tutorialStart.copy(state.player);state.tutorialStep=0;
  ui.startOverlay.classList.add('hidden');ui.endOverlay.classList.add('hidden');ui.hud.classList.remove('hidden');ui.tutorialCard.classList.remove('hidden');ui.tutorialDone.classList.add('hidden');
  ui.mobile.classList.toggle('hidden',!isCoarse());setMission('연습 중에는 시간이 줄지 않아요. 하나씩 직접 해보면 돼요.');renderTutorial();
  if(!isCoarse())canvas.requestPointerLock?.()
}
function renderTutorial(){
  const s=state.tutorialStep;ui.tutorialStep.textContent='연습 '+Math.min(6,s+1)+' / 6';
  if(s===0){setWeapon('water',true);ui.tutorialText.textContent='WASD 또는 왼쪽 방향 버튼으로 조금 움직여 보세요.'}
  if(s===1){setWeapon('water',true);ui.tutorialText.textContent='💦 물줄기: 버튼을 누른 채 바닥을 좌우로 훑어 넓게 씻어 보세요.';if(!dirt.some(d=>d.tutorial&&!d.dead))messBurst(0,-3.4,10,1.45,true)}
  if(s===2){setWeapon('foam',true);ui.tutorialText.textContent='🫧 거품: 바닥에 거품을 뿌리면 잠시 남아서 얼룩을 계속 녹여요.';if(!dirt.some(d=>d.tutorial&&!d.dead))for(let i=0;i<10;i++)spawnStain(rand(-1.7,1.7),rand(-4.6,-2.6),true,false)}
  if(s===3){setWeapon('bomb',true);state.bombReadyAt=0;ui.tutorialText.textContent='🧼 비누폭탄: 더러운 곳 한가운데에 한 발! 넓은 범위를 한꺼번에 날려 버려요.';if(!dirt.some(d=>d.tutorial&&!d.dead))messBurst(0,-3.8,18,2.1,true)}
  if(s===4){setWeapon('vacuum',true);ui.tutorialText.textContent='🌪️ 강력흡입: 캔·병·봉투 같은 쓰레기 더미를 바라보고 누르면 여러 개가 동시에 빨려 와요.';if(!dirt.some(d=>d.tutorial&&!d.dead)){for(let i=0;i<13;i++)spawnTrash(rand(-2.1,2.1),rand(-5,-2.5),choice(trashDefs),true)}}
  if(s===5){setWeapon('water',true);ui.tutorialText.textContent='마지막! 빠르게 돌아다니는 악당에게 청소 장비를 맞혀 잠시 투기를 멈춰 보세요.';villain.group.visible=true;villain.group.position.set(0,0,-4.8);villain.stunned=0}
  if(s>=6){ui.tutorialStep.textContent='연습 완료!';ui.tutorialText.textContent='준비 끝! 물줄기·거품·비누폭탄·강력흡입을 바꿔 쓰며 학교 전체를 쓸어버리세요.';ui.tutorialDone.classList.remove('hidden');villain.group.visible=false;sfx('clear')}
}
function queueTutorialAdvance(expectedStep,delay=260){
  if(state.mode!=='tutorial'||state.tutorialStep!==expectedStep||state.tutorialAdvancePending)return;
  state.tutorialAdvancePending=true;
  setTimeout(()=>{if(state.mode==='tutorial'&&state.tutorialStep===expectedStep){state.tutorialStep++;clearDirt();state.tutorialAdvancePending=false;renderTutorial()}else state.tutorialAdvancePending=false},delay)
}
function advanceTutorial(){
  state.tutorialAdvancePending=false;state.tutorialStep++;clearDirt();renderTutorial()
}
function tutorialCheckMovement(){
  if(state.mode==='tutorial'&&state.tutorialStep===0&&state.player.distanceTo(state.tutorialStart)>1.5){showMessage('좋아요! 이제 청소해 볼까요?',700);advanceTutorial()}
}

function cleanRecord(rec,point,quiet=false){
  if(!rec||rec.dead)return;
  if(rec.kind==='trash'){
    rec.dead=true;rec.hit.visible=false;const start=rec.group.position.clone(),target=camera.position.clone();rec.suck={t:0,start,target};state.cleaned++;rewardClean(rec,100);if(!quiet)sfx('clean');
    if(state.mode==='tutorial'&&state.tutorialStep===1&&dirt.filter(d=>d.tutorial&&!d.dead).length<=2)queueTutorialAdvance(1)
  }else{
    rec.hp--;rec.group.scale.multiplyScalar(rec.kind==='gum'?.88:.82);rec.group.material.opacity=Math.max(.2,.72*(rec.hp/rec.maxHp));burst(point,0x79eeff,4);
    if(rec.hp<=0){rec.dead=true;state.cleaned++;rewardClean(rec,rec.kind==='gum'?180:130);if(!quiet)sfx('clean');fadeRemove(rec);
      if(state.mode==='tutorial'&&state.tutorialStep===2&&dirt.filter(d=>d.tutorial&&!d.dead).length<=3)queueTutorialAdvance(2)
    }else if(!quiet)showMessage(rec.kind==='gum'?'껌은 조금 더 문질러야 해요!':'얼룩이 옅어지고 있어요!',380)
  }
}
function rewardClean(rec,base){
  const now=performance.now();state.combo=now-state.lastCleanAt<4200?state.combo+1:1;state.lastCleanAt=now;state.bestCombo=Math.max(state.bestCombo,state.combo);
  state.score+=base+Math.min(250,(state.combo-1)*12);if(state.combo>1&&state.combo%5===0){sfx('combo');showMessage('CLEAN COMBO ×'+state.combo+'!',520)}
  updateHud();checkRoomBonus(rec.zone)
}
function fadeRemove(rec){const o=rec.group;fx.push({kind:'fade',obj:o,life:.28,total:.28,rec})}
function burst(pos,color=0x65e6ff,count=7){
  for(let i=0;i<count;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(.045,6,4),new THREE.MeshBasicMaterial({color}));m.position.copy(pos);fxRoot.add(m);fx.push({kind:'particle',obj:m,life:.4,total:.4,v:new THREE.Vector3(rand(-1.8,1.8),rand(.5,2.2),rand(-1.8,1.8))})}
}
function projectile(to){
  const from=new THREE.Vector3();camera.getWorldPosition(from);const dir=new THREE.Vector3();camera.getWorldDirection(dir);from.add(dir.multiplyScalar(.75)).add(new THREE.Vector3(.25,-.18,0));
  const m=new THREE.Mesh(new THREE.SphereGeometry(.07,8,6),new THREE.MeshBasicMaterial({color:0x6ff6ff}));m.position.copy(from);fxRoot.add(m);fx.push({kind:'projectile',obj:m,life:.13,total:.13,from:from.clone(),to:to.clone()})
}
function aimImpact(){
  raycaster.setFromCamera(new THREE.Vector2(0,0),camera);
  const targets=[...hitTargets.filter(x=>x.visible!==false)];if(villain.group.visible&&villain.hit)targets.push(villain.hit);
  const hits=raycaster.intersectObjects(targets,false);
  if(hits.length)return {point:hits[0].point.clone(),object:hits[0].object};
  const floorPoint=new THREE.Vector3(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),-.02);
  if(raycaster.ray.intersectPlane(plane,floorPoint)&&floorPoint.distanceTo(camera.position)<=16)return {point:floorPoint,object:null};
  return {point:camera.position.clone().add(new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion).multiplyScalar(11)),object:null}
}
function sprayClean(center,radius=1.8,filter=null,hits=1){
  let touched=0;
  for(const rec of dirt.filter(d=>!d.dead)){
    if(filter&&!filter(rec))continue;
    const p=rec.group.position,dx=p.x-center.x,dz=p.z-center.z;
    if(dx*dx+dz*dz<=radius*radius){
      for(let n=0;n<hits&&!rec.dead;n++)cleanRecord(rec,center,true);
      touched++
    }
  }
  return touched
}
function streamFx(to,color=0x6ff6ff,count=7,size=.055){
  const from=new THREE.Vector3();camera.getWorldPosition(from);const dir=new THREE.Vector3();camera.getWorldDirection(dir);from.add(dir.multiplyScalar(.72)).add(new THREE.Vector3(.22,-.18,0));
  for(let i=0;i<count;i++){
    const target=to.clone().add(new THREE.Vector3(rand(-.14,.14),rand(-.04,.18),rand(-.14,.14)));
    const m=new THREE.Mesh(new THREE.SphereGeometry(size,7,5),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.9}));
    m.position.copy(from);fxRoot.add(m);fx.push({kind:'projectile',obj:m,life:.11+i*.006,total:.11+i*.006,from:from.clone(),to:target})
  }
}
function spawnFoamField(center){
  const geo=new THREE.CircleGeometry(2.05,24),material=new THREE.MeshBasicMaterial({color:0xe9ffff,transparent:true,opacity:.32,depthWrite:false});
  const m=new THREE.Mesh(geo,material);m.rotation.x=-Math.PI/2;m.position.set(center.x,.025,center.z);fxRoot.add(m);
  fx.push({kind:'foamField',obj:m,life:2.65,total:2.65,center:new THREE.Vector3(center.x,0,center.z),tick:0})
}
function waterShot(impact){
  state.recoil=Math.min(1.55,state.recoil+.72);state.cameraKick=Math.min(.065,state.cameraKick+.013);state.kickSide+=(Math.random()-.5)*.009;
  streamFx(impact.point,0x55eaff,8,.05);const touched=sprayClean(impact.point,1.9,null,1);
  burst(impact.point,0x79eeff,touched?Math.min(12,4+touched):3);if(impact.object?.userData.villain)stunVillain()
}
function foamShot(impact){
  state.recoil=Math.min(1.35,state.recoil+.52);state.cameraKick=Math.min(.05,state.cameraKick+.008);
  streamFx(impact.point,0xf2ffff,5,.11);spawnFoamField(impact.point);sprayClean(impact.point,1.35,rec=>rec.kind!=='trash',1);
  burst(impact.point,0xffffff,7);if(impact.object?.userData.villain)stunVillain()
}
function soapBomb(impact,now){
  if(now<state.bombReadyAt){showMessage('비누폭탄 충전 중!',300);return}
  state.bombReadyAt=now+3400;state.firing=false;state.recoil=1.8;state.cameraKick=Math.min(.11,state.cameraKick+.06);
  streamFx(impact.point,0xffdd72,1,.18);
  const touched=sprayClean(impact.point,4.5,null,5);
  const ring=new THREE.Mesh(new THREE.RingGeometry(.25,4.4,40),new THREE.MeshBasicMaterial({color:0xffffdd,transparent:true,opacity:.75,side:THREE.DoubleSide,depthWrite:false}));
  ring.rotation.x=-Math.PI/2;ring.position.set(impact.point.x,.035,impact.point.z);fxRoot.add(ring);fx.push({kind:'soapRing',obj:ring,life:.48,total:.48});
  burst(impact.point,0xfff3a0,Math.min(28,12+touched));tone(160,.18,'square',.035);setTimeout(()=>tone(720,.18,'sine',.03),60);
  if(villain.group.visible&&villain.group.position.distanceTo(impact.point)<4.7)stunVillain();
  if(state.mode==='tutorial'&&state.tutorialStep===3)queueTutorialAdvance(3,520)
}
function vacuumShot(){
  const origin=camera.position.clone(),forward=new THREE.Vector3();camera.getWorldDirection(forward);forward.y=0;forward.normalize();
  let sucked=0;
  for(const rec of dirt.filter(d=>!d.dead&&d.kind==='trash')){
    const delta=rec.group.position.clone().sub(origin);delta.y=0;const dist=delta.length();if(dist<.2||dist>9.2)continue;
    delta.normalize();if(delta.dot(forward)<.66)continue;
    cleanRecord(rec,origin,true);sucked++
  }
  state.recoil=Math.min(1.15,state.recoil+.22);state.cameraKick=Math.max(-.03,state.cameraKick-.006);
  if(sucked){tone(250,.055,'sawtooth',.018);showMessage('쑤우욱! ×'+sucked,260)}
  if(state.mode==='tutorial'&&state.tutorialStep===4&&dirt.filter(d=>d.tutorial&&!d.dead).length<=2)queueTutorialAdvance(4,380)
}
function shoot(){
  if(!state.running)return;const cfg=WEAPONS[state.weapon]||WEAPONS.water,now=performance.now();if(now-state.lastShot<cfg.interval)return;state.lastShot=now;sfx('shot');
  if(state.weapon==='vacuum'){vacuumShot();return}
  const impact=aimImpact();
  if(state.weapon==='water')waterShot(impact);
  else if(state.weapon==='foam')foamShot(impact);
  else soapBomb(impact,now)
}
function stunVillain(){
  if(villain.stunned>1.2)return;villain.stunned=3.2;sfx('stun');burst(villain.group.position.clone().add(new THREE.Vector3(0,1.4,0)),0xffee72,9);showMessage('악당 멈춤! 3초 동안 투기 금지!',700);
  if(state.mode==='game'){state.score+=75;updateHud()}
  if(state.mode==='tutorial'&&state.tutorialStep===5)queueTutorialAdvance(5,450)
}

function cleanliness(){
  if(state.mode==='tutorial')return state.tutorialStep>=4?100:0;
  const active=dirt.filter(d=>!d.dead).length,total=Math.max(1,state.totalSpawned);return clamp(Math.round((1-active/total)*100),0,100)
}
function updateHud(){
  ui.score.textContent=state.score.toLocaleString('ko-KR');ui.combo.textContent='COMBO ×'+state.combo;ui.cleanPct.textContent=cleanliness()+'%';
  const sec=Math.max(0,Math.ceil(state.time));ui.timer.textContent=String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');
  renderRooms();updateWeaponUI()
}
function renderRooms(){
  if(state.mode==='tutorial'){ui.roomPanel.innerHTML='<div style="font-weight:1000;margin-bottom:3px">🎓 연습장</div><div>기본 조작을 하나씩 익히는 중이에요.</div>';return}
  const active=dirt.filter(d=>!d.dead),rows=zones.map(z=>{const n=active.filter(d=>d.zone===z.id).length,cls=n<=2?'ok':n<=6?'warn':'bad',mark=n<=2?'🟢':n<=6?'🟡':'🔴';return '<div class="room"><span>'+mark+' '+z.name+'</span><span class="'+cls+'">'+n+'</span></div>'}).join('');
  ui.roomPanel.innerHTML='<div style="font-weight:1000;margin-bottom:3px">🏫 남은 오염</div>'+rows
}
function checkRoomBonus(zone){
  if(state.mode!=='game'||state.roomCleanBonus.has(zone))return;const left=dirt.filter(d=>!d.dead&&d.zone===zone).length;
  if(left===0){state.roomCleanBonus.add(zone);state.score+=500;showMessage((zones.find(z=>z.id===zone)?.name||'구역')+' 완벽 청소! +500',900);sfx('clear')}
}

function endGame(forceWin=false){
  if(state.mode!=='game')return;state.running=false;document.exitPointerLock?.();const pct=cleanliness(),win=forceWin||pct>=85;
  state.mode='end';ui.endOverlay.classList.remove('hidden');ui.mobile.classList.add('hidden');ui.endIcon.textContent=win?'🏆':'🧽';ui.endTitle.textContent=win?'학교가 반짝반짝!':'조금만 더 청소!';
  ui.endText.textContent=win?'청소 특공대 임무 성공! 학교가 다시 깨끗해졌어요.':'악당이 꽤 많이 어질렀네요. 다시 출동하면 더 깨끗하게 만들 수 있어요.';
  ui.resultClean.textContent=pct+'%';ui.resultCount.textContent=state.cleaned;ui.resultCombo.textContent=state.bestCombo;
  let old=0;try{old=window.KidscadeStorage?.getInt?.(SCORE_KEY,0)||0}catch(_){};if(state.score>old){try{window.KidscadeStorage?.setRaw?.(SCORE_KEY,state.score)}catch(_){}}
}
function goMenu(){
  state.running=false;state.mode='menu';clearDirt();resetVillain();document.exitPointerLock?.();ui.hud.classList.add('hidden');ui.mobile.classList.add('hidden');ui.endOverlay.classList.add('hidden');ui.startOverlay.classList.remove('hidden')
}

function canStand(x,z){
  if(x<-16.75||x>16.75||z<-10.55||z>10.55)return false;
  const r=.34;return !colliders.some(c=>x+r>c.x1&&x-r<c.x2&&z+r>c.z1&&z-r<c.z2)
}
function updateMovement(dt){
  const f=new THREE.Vector3(-Math.sin(state.yaw),0,-Math.cos(state.yaw)),r=new THREE.Vector3(Math.cos(state.yaw),0,-Math.sin(state.yaw)),v=new THREE.Vector3();
  if(state.keys.has('KeyW'))v.add(f);if(state.keys.has('KeyS'))v.sub(f);if(state.keys.has('KeyD'))v.add(r);if(state.keys.has('KeyA'))v.sub(r);
  if(v.lengthSq()){v.normalize().multiplyScalar(4.2*dt);const nx=state.player.x+v.x,nz=state.player.z+v.z;if(canStand(nx,state.player.z))state.player.x=nx;if(canStand(state.player.x,nz))state.player.z=nz}
  state.cameraKick=Math.max(0,state.cameraKick-dt*.22);state.kickSide*=Math.pow(.025,dt);
  camera.position.lerp(state.player,.38);camera.rotation.set(state.pitch+state.cameraKick,state.yaw+state.kickSide,0);
  if(weapon){state.recoil=Math.max(0,state.recoil-dt*7.2);weapon.position.z=state.recoil*.12;weapon.position.y=-state.recoil*.025;weapon.rotation.x=-state.recoil*.07;weapon.rotation.z=state.recoil*.018}
  tutorialCheckMovement()
}
function updateVillain(dt,time){
  if(!villain.group.visible)return;
  if(villain.stunned>0){villain.stunned=Math.max(0,villain.stunned-dt);villain.group.rotation.z=Math.sin(time*16)*.08*(villain.stunned>0?1:0);return}
  villain.group.rotation.z*=.82;
  if(state.mode==='tutorial')return;
  const target=villain.route[villain.routeIndex],pos=villain.group.position,dir=target.clone().sub(pos);dir.y=0;
  if(dir.length()<.45){villain.routeIndex=(villain.routeIndex+1)%villain.route.length}else{
    dir.normalize();pos.addScaledVector(dir,villain.speed*dt);villain.group.rotation.y=Math.atan2(dir.x,dir.z)+Math.PI;villain.group.position.y=Math.abs(Math.sin(time*8))*.035
  }
  villain.dropClock-=dt;if(villain.dropClock<=0){villain.dropClock=rand(1.05,1.65);dropVillainTrash()}
}
function updateDirt(dt){
  for(const d of dirt){if(d.suck){d.suck.t=Math.min(1,d.suck.t+dt*4.5);const t=d.suck.t,e=1-Math.pow(1-t,3);d.group.position.lerpVectors(d.suck.start,camera.position,e);d.group.scale.setScalar(1-e*.9);if(t>=1){dirtRoot.remove(d.group);d.suck=null}}}
}
function updateFx(dt){
  for(let i=fx.length-1;i>=0;i--){const f=fx[i];f.life-=dt;const t=1-Math.max(0,f.life)/f.total;
    if(f.kind==='particle'){f.v.y-=3*dt;f.obj.position.addScaledVector(f.v,dt);f.obj.scale.setScalar(Math.max(.1,1-t))}
    else if(f.kind==='projectile')f.obj.position.lerpVectors(f.from,f.to,Math.min(1,t));
    else if(f.kind==='foamField'){
      f.tick-=dt;if(f.tick<=0){f.tick=.22;sprayClean(f.center,2.05,rec=>rec.kind!=='trash',1)}
      f.obj.material.opacity=Math.max(0,.32*(1-t));f.obj.scale.setScalar(1+t*.18)
    }
    else if(f.kind==='soapRing'){f.obj.material.opacity=Math.max(0,.75*(1-t));f.obj.scale.setScalar(.7+t*.55)}
    else if(f.kind==='fade'){f.obj.scale.setScalar(Math.max(.05,1-t));if(f.obj.material)f.obj.material.opacity=Math.max(0,1-t)}
    if(f.life<=0){if(f.kind==='fade')dirtRoot.remove(f.obj);else fxRoot.remove(f.obj);if(f.obj.geometry&&f.kind!=='fade')f.obj.geometry.dispose?.();if(f.obj.material&&f.kind!=='fade')f.obj.material.dispose?.();fx.splice(i,1)}
  }
}
function updateGame(dt){
  if(state.mode!=='game'||!state.running)return;state.time-=dt;if(performance.now()-state.lastCleanAt>4200)state.combo=1;
  if(cleanliness()>=90&&state.cleaned>=70){state.score+=Math.ceil(state.time)*10;updateHud();showMessage('청소율 90% 달성!',750);endGame(true);return}
  if(state.time<=0){state.time=0;updateHud();endGame(false);return}
}
function loop(){
  requestAnimationFrame(loop);const dt=Math.min(.045,clock.getDelta()),time=clock.elapsedTime;
  if(state.running){if(state.firing)shoot();updateMovement(dt);updateVillain(dt,time);updateDirt(dt);updateFx(dt);updateGame(dt);updateHud()}
  renderer.render(scene,camera)
}

function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}
addEventListener('resize',resize);resize();

document.addEventListener('keydown',e=>{
  if(['KeyW','KeyA','KeyS','KeyD'].includes(e.code)){state.keys.add(e.code);e.preventDefault()}
  const pick={Digit1:'water',Digit2:'foam',Digit3:'bomb',Digit4:'vacuum'}[e.code];if(pick){setWeapon(pick);e.preventDefault()}
});
document.addEventListener('keyup',e=>state.keys.delete(e.code));
document.addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas&&state.running){state.yaw-=e.movementX*.0023;state.pitch=clamp(state.pitch-e.movementY*.002,-1.18,1.18)}});
canvas.addEventListener('mousedown',e=>{if(e.button!==0||!state.running)return;if(!isCoarse()&&document.pointerLockElement!==canvas){canvas.requestPointerLock?.();return}state.firing=true;shoot()});
document.addEventListener('mouseup',e=>{if(e.button===0)state.firing=false});
canvas.addEventListener('click',()=>{if(state.running&&!isCoarse()&&document.pointerLockElement!==canvas)canvas.requestPointerLock?.()});

let lookTouch=null;
canvas.addEventListener('touchstart',e=>{if(!state.running)return;for(const t of e.changedTouches){if(t.clientX>innerWidth*.4&&!lookTouch){lookTouch={id:t.identifier,x:t.clientX,y:t.clientY}}}}, {passive:false});
canvas.addEventListener('touchmove',e=>{if(!lookTouch)return;for(const t of e.changedTouches){if(t.identifier===lookTouch.id){const dx=t.clientX-lookTouch.x,dy=t.clientY-lookTouch.y;state.yaw-=dx*.006;state.pitch=clamp(state.pitch-dy*.005,-1.18,1.18);lookTouch.x=t.clientX;lookTouch.y=t.clientY;e.preventDefault()}}},{passive:false});
canvas.addEventListener('touchend',e=>{for(const t of e.changedTouches)if(lookTouch&&t.identifier===lookTouch.id)lookTouch=null});

for(const b of document.querySelectorAll('.padBtn')){const key=b.dataset.key;const on=e=>{e.preventDefault();state.keys.add(key)},off=e=>{e.preventDefault();state.keys.delete(key)};b.addEventListener('pointerdown',on);b.addEventListener('pointerup',off);b.addEventListener('pointercancel',off);b.addEventListener('pointerleave',off)}
document.querySelectorAll('.weaponBtn').forEach(btn=>btn.addEventListener('pointerdown',e=>{e.preventDefault();setWeapon(btn.dataset.weapon)}));
ui.fireBtn.addEventListener('pointerdown',e=>{e.preventDefault();state.firing=true;shoot()});
ui.fireBtn.addEventListener('pointerup',e=>{e.preventDefault();state.firing=false});
ui.fireBtn.addEventListener('pointercancel',()=>state.firing=false);
ui.fireBtn.addEventListener('pointerleave',()=>state.firing=false);
ui.startBtn.addEventListener('click',startGame);ui.tutorialBtn.addEventListener('click',startTutorial);ui.tutorialSkip.addEventListener('click',startGame);ui.tutorialDone.addEventListener('click',startGame);
ui.retryBtn.addEventListener('click',startGame);ui.menuBtn.addEventListener('click',goMenu);

prepare();loop();

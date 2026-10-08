import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';

const $=id=>document.getElementById(id);
const ui={canvas:$('game'),intro:$('intro'),end:$('end'),endTitle:$('endTitle'),endText:$('endText'),
  mission:$('mission'),detail:$('detail'),progress:$('progress'),health:$('health'),battery:$('battery'),
  time:$('time'),toast:$('toast'),action:$('action'),actionText:$('actionText'),joy:$('joystick'),knob:$('knob'),
  map:$('minimap'),help:$('help'),flash:$('flash'),gaze:$('gaze'),gazeValue:$('gazeValue')};
const scene=new THREE.Scene();scene.background=new THREE.Color(0x090f19);scene.fog=new THREE.FogExp2(0x090f19,.019);
const renderer=new THREE.WebGLRenderer({canvas:ui.canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.32;
const camera=new THREE.PerspectiveCamera(60,innerWidth/innerHeight,.1,90);
scene.add(new THREE.HemisphereLight(0xa3bbef,0x202a2d,1.55));
const moon=new THREE.DirectionalLight(0x9eb1da,1.35);moon.position.set(-7,13,8);scene.add(moon);
const hallLight=new THREE.PointLight(0xb1c6e2,19,21,2);hallLight.position.set(0,3.1,0);scene.add(hallLight);
const officeLight=new THREE.PointLight(0xffcd81,13,12,2);officeLight.position.set(0,3,9);scene.add(officeLight);
const westLight=new THREE.PointLight(0x95aed2,9,16,2);westLight.position.set(-10,3,-9);scene.add(westLight);
const eastLight=new THREE.PointLight(0xb5d3e3,8,16,2);eastLight.position.set(10,3,-9);scene.add(eastLight);
const torchTarget=new THREE.Object3D();scene.add(torchTarget);
const torch=new THREE.SpotLight(0xeaf2ff,23,18,.53,.47,1.3);torch.target=torchTarget;scene.add(torch);

const loader=new GLTFLoader(),assetCache=new Map();
const FURN='../../assets/game/3d/interiors/kenney-furniture-kit/';
const MAN='../../assets/game/npcs/glTF/Casual_Male.gltf';
const MONSTER='../../assets/game/3d/characters/monsters/ultimate-monsters-bundle/ghost.glb';
const AUDIO='../../assets/kidscade_folklore_night_guard_renamed_assets/';
const LIMITS={x1:-18,x2:18,z1:-15,z2:13},walls=[],furniture=[],glowThings=[],mixers=[];
const keys=new Set(),joy={x:0,y:0},player={x:0,z:9,yaw:Math.PI,root:new THREE.Group(),model:null};
const maiden={x:12,z:-10,root:new THREE.Group(),speed:1.2,charge:0,attacks:0};
const disturbed=[],stageNames=['','3개의 장난 찾기','처녀귀신 관찰','2층 봉인진 가동','관리실로 귀환'];
let started=false,ended=false,paused=false,stage=1,fixes=0,hp=3,power=100,flashOn=true,elapsed=0;
let viewYaw=0,turnPointer=null,prevX=0,last=performance.now(),hudClock=0,miniClock=0,toastSeconds=0;
let invulnerable=0,ghostWaiting=0,maidenVisible=false;
const forward=new THREE.Vector3(),modelTime=new THREE.Clock();
scene.add(player.root,maiden.root);

function mat(color,roughness=.94){return new THREE.MeshStandardMaterial({color,roughness});}
const materials={floor:mat(0x415568),corridor:mat(0x394657),wall:mat(0x7c8995),skirt:mat(0x273646),
  desk:mat(0x765c4d),white:mat(0xced9df),red:mat(0x9b394e),glass:mat(0x7bc8d0)};
function cube(parent,x,y,z,w,h,d,material){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);
  m.receiveShadow=false;parent.add(m);return m;
}
function ground(x,z,w,d,c){cube(scene,x,-.13,z,w,.26,d,mat(c));}
function wall(x,z,w,d){
  cube(scene,x,1.56,z,w,3.12,d,materials.wall);
  cube(scene,x,.19,z,w,.38,d,materials.skirt);
  walls.push({x,z,hx:w/2,hz:d/2});
}
function wallSplit(z,parts){for(const [x,w] of parts)wall(x,z,w,.29);}
function collides(x,z,rect,r=.34){return Math.abs(x-rect.x)<rect.hx+r&&Math.abs(z-rect.z)<rect.hz+r;}
function onFloor(x,z){
  return (x>-17.7&&x<17.7&&z>-3.04&&z<4.7)||
  (x>-16.8&&x<-4.2&&z>-14.8&&z< -2.86)||
  (x>4.2&&x<16.8&&z>-14.8&&z< -2.86)||
  (x>-4.75&&x<4.75&&z>4.4&&z<12.75);
}
function canWalk(x,z){return onFloor(x,z)&&!walls.some(w=>collides(x,z,w))&&!furniture.some(o=>collides(x,z,o));}
function placeFurniture(file,x,z,height,rot=0,boxSize=null){
  if(boxSize)furniture.push({x,z,hx:boxSize[0]/2,hz:boxSize[1]/2});
  const host=new THREE.Group();host.position.set(x,0,z);host.rotation.y=rot;scene.add(host);
  cube(host,0,.35,0,boxSize?boxSize[0]*.85:.5,.68,boxSize?boxSize[1]*.85:.5,materials.desk);
  loadTemplate(FURN+file).then(g=>{
    host.clear();const mesh=g.clone(true);normalize(mesh,height);host.add(mesh);
  }).catch(()=>{});return host;
}
function normalize(root,height){
  root.updateMatrixWorld(true);let b=new THREE.Box3().setFromObject(root),s=b.getSize(new THREE.Vector3());
  root.scale.multiplyScalar(height/(s.y||1));root.updateMatrixWorld(true);
  b=new THREE.Box3().setFromObject(root);const center=b.getCenter(new THREE.Vector3());
  root.position.x-=center.x;root.position.y-=b.min.y;root.position.z-=center.z;
}
function loadTemplate(url){
  if(!assetCache.has(url))assetCache.set(url,loader.loadAsync(url));
  return assetCache.get(url).then(g=>g.scene);
}
function addLabel(text,x,z,color=0xb9dfe9){
  const c=document.createElement('canvas');c.width=512;c.height=96;
  const ctx=c.getContext('2d');ctx.clearRect(0,0,512,96);ctx.font='bold 40px sans-serif';ctx.textAlign='center';
  ctx.fillStyle='#071019';ctx.fillText(text,258,59);ctx.fillStyle='#'+color.toString(16).padStart(6,'0');ctx.fillText(text,256,56);
  const texture=new THREE.CanvasTexture(c),p=new THREE.Mesh(new THREE.PlaneGeometry(4.2,.79),new THREE.MeshBasicMaterial({map:texture,transparent:true,side:THREE.DoubleSide,depthWrite:false}));
  p.position.set(x,2.65,z);scene.add(p);
}
function createMark(x,z,color){
  const holder=new THREE.Group();holder.position.set(x,.06,z);scene.add(holder);
  const m=new THREE.Mesh(new THREE.RingGeometry(.55,.69,36),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,transparent:true,opacity:.9}));
  m.rotation.x=-Math.PI/2;holder.add(m);
  const orb=new THREE.Mesh(new THREE.IcosahedronGeometry(.14,0),new THREE.MeshBasicMaterial({color}));
  orb.position.y=.85;holder.add(orb);glowThings.push({holder,orb});
  return holder;
}
function createRoom(){
  ground(0,.8,36,7.4,0x344455);
  ground(-10.5,-9,13,12,0x51515c);ground(10.5,-9,13,12,0x44555b);
  ground(0,8.75,10,8.5,0x5c4d45);
  // Three rooms connect through deliberate gaps in the corridor walls.
  wall(-10.5,-15,13,.29);
  wall(10.5,-15,13,.29);
  wall(-17,-9,.29,12);wall(-4,-9,.29,12);
  wall(4,-9,.29,12);wall(17,-9,.29,12);
  wallSplit(-3,[[-14.25,5.5],[-6.55,5.1],[6.55,5.1],[14.25,5.5]]);
  wall(0,-3,8,.29);
  wall(-18,.7,.29,7.6);wall(18,.7,.29,7.6);
  wallSplit(4.5,[[-10,16],[10,16]]);
  wall(-5,8.8,.29,8.6);wall(5,8.8,.29,8.6);wall(0,13,10,.29);
  addLabel('6-1 교실',-10.2,-14.68);addLabel('과학실',10.2,-14.68);addLabel('관리실',0,12.66,0xffd09a);
  // Interior furniture uses approved Kenney furniture models already found in the site.
  for(const z of [-11.5,-7.9]){
    for(const x of [-14,-10,-6.1])placeFurniture('desk.glb',x,z,.83,Math.PI,[1.30,.67]);
    for(const x of [6.1,10,14])placeFurniture('table.glb',x,z,.82,0,[1.3,.75]);
  }
  placeFurniture('bookcase-open.glb',-16.1,-5.1,1.95,Math.PI/2,[.6,.5]);
  placeFurniture('bookcase-open.glb',16,-5.1,1.95,-Math.PI/2,[.6,.5]);
  placeFurniture('table.glb',-2.7,10.9,.85,Math.PI,[1.2,.6]);
  const officeMonitor=placeFurniture('computer-screen.glb',-2.7,10.9,.58,Math.PI);
  officeMonitor.position.y=.75;
  placeFurniture('chair-desk.glb',-2.7,11.85,.77,Math.PI);
  const chalk=mat(0x253c38),board=cube(scene,-10.5,1.85,-14.79,5.7,1.3,.08,chalk);
  cube(scene,10.5,1.9,-14.79,5.5,1.3,.06,mat(0x394e5d));
  for(const x of [-13,-8,-3,3,8,13]) {
    const strip=cube(scene,x,3.18,-2.95,2.4,.12,.12,mat(0xc4c5b6));strip.material.emissive=new THREE.Color(0x727b88);strip.material.emissiveIntensity=.3;
  }
  const door1=createMark(-10.25,-2.8,0x86c5d4),door2=createMark(10.25,-2.8,0x86c5d4),officeDoor=createMark(0,4.85,0xf5c47d);
  [door1,door2,officeDoor].forEach(m=>{m.scale.setScalar(.38);m.userData.decorative=true;});
}
createRoom();

function humanoidFallback(){
  const group=new THREE.Group();cube(group,0,.94,0,.48,.9,.28,mat(0x6b8295));
  const head=new THREE.Mesh(new THREE.SphereGeometry(.25,12,10),mat(0xc7ad9b));head.position.y=1.64;group.add(head);
  cube(group,-.15,.37,0,.14,.72,.16,mat(0x263544));
  cube(group,.15,.37,0,.14,.72,.16,mat(0x263544));return group;
}
player.model=humanoidFallback();player.root.add(player.model);
loader.loadAsync(MAN).then(gltf=>{
  const model=cloneSkeleton(gltf.scene);normalize(model,1.7);player.root.remove(player.model);player.model=model;player.root.add(model);
  const clips=gltf.animations||[],idle=clips.find(c=>/idle|stand/i.test(c.name))||clips[0],walk=clips.find(c=>/walk/i.test(c.name));
  if(idle||walk){
    const mixer=new THREE.AnimationMixer(model);
    const stripMotion=c=>c&&new THREE.AnimationClip(c.name,c.duration,c.tracks.filter(t=>!/(?:hips|root|armature)\.position/i.test(t.name)));
    const ia=idle?mixer.clipAction(stripMotion(idle)):null,wa=walk?mixer.clipAction(stripMotion(walk)):null;
    if(ia)ia.play();if(wa){wa.play();wa.setEffectiveWeight(0);}
    player.animation={mixer,idle:ia,walk:wa};mixers.push(mixer);
  }
}).catch(()=>{});
function makeGhostFallback(){
  const g=new THREE.Group();
  const sheet=new THREE.Mesh(new THREE.ConeGeometry(.64,2.1,18,1,true),new THREE.MeshStandardMaterial({color:0xe3efff,transparent:true,opacity:.68,side:THREE.DoubleSide,emissive:0x80a4be,emissiveIntensity:.45}));
  sheet.position.y=1.15;g.add(sheet);
  const h=new THREE.Mesh(new THREE.SphereGeometry(.33,14,12),new THREE.MeshBasicMaterial({color:0xb3c7cf}));h.position.y=2.22;g.add(h);return g;
}
const ghostAura=new THREE.PointLight(0xd6e4ff,8,7,2);maiden.root.add(ghostAura);ghostAura.position.y=1.7;
let ghostModel=makeGhostFallback();maiden.root.add(ghostModel);
loader.loadAsync(MONSTER).then(gltf=>{
  maiden.root.remove(ghostModel);const root=cloneSkeleton(gltf.scene);normalize(root,2.3);
  root.traverse(node=>{if(node.isMesh){node.material=Array.isArray(node.material)?node.material.map(m=>m.clone()):node.material.clone();const ms=Array.isArray(node.material)?node.material:[node.material];for(const m of ms){m.transparent=true;m.opacity=.88;m.emissive=new THREE.Color(0x284a73);m.emissiveIntensity=.8;}}});
  ghostModel=root;maiden.root.add(root);
  const clip=(gltf.animations||[]).find(c=>/idle|float/i.test(c.name))||(gltf.animations||[])[0];
  if(clip){const mix=new THREE.AnimationMixer(root);mix.clipAction(clip).play();mixers.push(mix);}
}).catch(()=>{});
maiden.root.visible=false;
const fixPositions=[[-13.4,-6.0],[-8.2,-5.8],[-12.6,-12.65]];
const fixLabels=['거꾸로 놓인 화분','공중에 뜬 책','움직이는 시계'];
for(let i=0;i<3;i++){
  const [x,z]=fixPositions[i],marker=createMark(x,z,0xf3b96f);
  const object=new THREE.Group();object.position.set(x,1.15,z);scene.add(object);
  if(i===0){
    const pot=new THREE.Mesh(new THREE.CylinderGeometry(.3,.19,.47,10),mat(0xac6d4f));pot.rotation.z=2.1;object.add(pot);
    cube(object,.18,.35,0,.15,.44,.14,mat(0x69917a));
  }else if(i===1){
    const book=cube(object,0,0,0,.64,.09,.45,mat(0xc1c7df));book.rotation.z=.32;
  }else{
    const clock=new THREE.Mesh(new THREE.CylinderGeometry(.32,.32,.07,24),mat(0xd4cba6));
    clock.rotation.x=Math.PI/2;object.add(clock);
    cube(object,0,0,.055,.07,.45,.035,mat(0x4a4150));
  }
  disturbed.push({x,z,object,marker,done:false,name:fixLabels[i],phase:i*2.1});
}
const trickCircle=createMark(-10.3,-6.0,0xf5bd72);trickCircle.visible=false;
const maidenCircle=createMark(12.5,-6,0xc5a1f8);maidenCircle.visible=false;
const exitCircle=createMark(0,10.35,0x82dabe);exitCircle.visible=false;

function dist(a,b){return Math.hypot(a.x-b.x,a.z-b.z);}
function showToast(message){ui.toast.textContent=message;ui.toast.classList.add('show');toastSeconds=3.5;}
function sfx(file,volume=.27){
  try{const a=new Audio(AUDIO+file);a.volume=volume;a.play().catch(()=>{});}catch(_){}
}
const bgm=new Audio(AUDIO+'amb_scary_night.mp3');bgm.loop=true;bgm.volume=.09;
function setStage(next){
  stage=next;
  trickCircle.visible=stage===1&&fixes===3;
  maidenCircle.visible=stage===3;exitCircle.visible=stage===4;
  maiden.root.visible=stage===2;
  if(stage===2){maiden.x=12;maiden.z=-10;maiden.charge=0;ghostWaiting=3.4;
    showToast('과학실에서 흰 형체가 발견됐어요. 시선을 돌리지 마세요!');sfx('amb_scary_music_box.mp3',.24);}
  if(stage===3){maiden.root.visible=false;showToast('처녀귀신이 물러났어요. 과학실의 봉인진을 찾아가세요.');sfx('sfx_horror_sting_01.mp3',.20);}
  if(stage===4)showToast('두 괴이를 봉인했어요. 관리실로 돌아가 사건을 보고하세요.');
  updateHud();
}
function nearAction(){
  if(stage===1){
    for(let i=0;i<disturbed.length;i++){const o=disturbed[i];if(!o.done&&dist(o,player)<1.95)return {type:'fix',i,text:o.name+' 바로잡기'};}
    if(fixes===3&&dist(player,{x:-10.3,z:-6})<2.15)return {type:'trick',text:'도깨비 봉인하기'};
  }
  if(stage===3&&dist(player,{x:12.5,z:-6})<2.2)return {type:'maiden',text:'처녀귀신 봉인하기'};
  if(stage===4&&dist(player,{x:0,z:10.35})<2.3)return {type:'report',text:'퇴마 보고서 제출'};
  return null;
}
function act(){
  if(!started||paused||ended)return;
  const item=nearAction();if(!item){showToast('주변에 조사하거나 조작할 물건이 없어요.');return;}
  if(item.type==='fix'){
    const obj=disturbed[item.i];obj.done=true;obj.object.visible=false;obj.marker.visible=false;fixes++;sfx('sfx_child_giggle.mp3',.13);
    showToast('이상현상을 바로잡았어요 · '+fixes+'/3');
    if(fixes===3){trickCircle.visible=true;showToast('세 가지 장난 해결! 교실 중앙의 주황색 봉인진으로 가세요.');}
  }else if(item.type==='trick'){sfx('sfx_school_alarm_bell.mp3',.18);setStage(2);}
  else if(item.type==='maiden'){sfx('sfx_school_alarm_bell.mp3',.18);setStage(4);}
  else if(item.type==='report')finish(true);
}
function finish(ok){
  ended=true;started=false;bgm.pause();const score=ok?Math.max(200,1000-Math.round(elapsed)*2-maiden.attacks*90):0;
  ui.endTitle.textContent=ok?'퇴마 성공 · 학교의 평화를 되찾았어요!':'퇴마 실패 · 학교에서 쫓겨났어요';
  ui.endText.textContent=ok?'도깨비의 장난 3개 복구와 처녀귀신 봉인을 완료했어요. 소요 시간 '+Math.floor(elapsed/60)+'분 '+Math.floor(elapsed%60)+'초.':'괴이에게 너무 가까이 접근했어요. 시선을 유지하며 거리를 확보해 보세요.';
  ui.end.classList.remove('hidden');
  window.KidscadeGame?.result?.({scope:'mission',status:ok?'completed':'failed',outcome:ok?'clear':'fail',score,cleared:ok,timeSeconds:Math.round(elapsed)});
}
function reset(){
  fixes=0;hp=3;power=100;flashOn=true;elapsed=0;stage=1;ended=false;paused=false;started=true;
  viewYaw=0;player.x=0;player.z=9;maiden.attacks=0;maiden.charge=0;invulnerable=0;ghostWaiting=0;
  disturbed.forEach(o=>{o.done=false;o.object.visible=true;o.marker.visible=true;});
  trickCircle.visible=false;maidenCircle.visible=false;exitCircle.visible=false;maiden.root.visible=false;
  ui.intro.classList.add('hidden');ui.end.classList.add('hidden');ui.help.classList.add('hidden');
  bgm.currentTime=0;bgm.play().catch(()=>{});sfx('sfx_school_alarm_bell.mp3',.12);
  window.KidscadeGame?.start?.({mode:'prototype',ghosts:['dokkaebi','maiden']});showToast('관리실에서 출발하세요. 서쪽 6-1 교실부터 조사합니다.');updateHud();
}
function updateHud(){
  const titles={1:'도깨비 조사 · 6-1 교실',2:'처녀귀신 관찰 · 과학실',3:'처녀귀신 봉인 · 과학실',4:'관리실로 귀환'};
  const details={
    1:fixes===3?'모든 장난을 해결했어요. 주황색 봉인진을 작동하세요.':'6-1 교실에서 비정상적인 물건을 찾아 제자리에 돌려놓으세요. ('+fixes+'/3)',
    2:'카메라 중앙에 처녀귀신을 두고 계속 바라보세요. 가까이 오면 위험합니다.',
    3:'과학실 안쪽 보라색 봉인진으로 이동해 봉인을 완료하세요.',
    4:'관리실의 초록색 보고 지점에서 퇴마 결과를 제출하세요.'
  };
  ui.mission.textContent=titles[stage]||stageNames[stage];
  ui.detail.textContent=details[stage]||'';
  const done=stage===1?fixes/3*.5:stage===2?.50+maiden.charge/4.2*.2:stage===3?.75:.90;
  ui.progress.style.width=(Math.min(1,done)*100)+'%';
  ui.health.textContent='♥'.repeat(hp)+'♡'.repeat(3-hp);
  ui.battery.textContent=Math.floor(power)+'%';ui.flash.textContent=flashOn?'손전등 켜짐 [F]':'손전등 꺼짐 [F]';
  ui.gaze.classList.toggle('hidden',stage!==2);ui.gazeValue.style.width=(Math.max(0,maiden.charge)/4.2*100)+'%';
  const action=nearAction();ui.action.disabled=!action;
  ui.actionText.textContent=action?action.text:'가까이에서 조사 [E]';
}
function updateGhost(dt){
  if(stage!==2)return;
  maiden.root.position.set(maiden.x,.12+Math.sin(elapsed*2.8)*.12,maiden.z);
  if(ghostWaiting>0){ghostWaiting-=dt;return;}
  const gx=maiden.x-player.x,gz=maiden.z-player.z,d=Math.hypot(gx,gz);
  forward.set(-Math.sin(viewYaw),0,-Math.cos(viewYaw));
  const watched=d<12&&d>0.01&&(forward.x*gx+forward.z*gz)/d>.92;
  maiden.root.rotation.y=Math.atan2(-gx,-gz);
  if(watched){maiden.charge=Math.min(4.2,maiden.charge+dt);if(maiden.charge>=4.2){setStage(3);return;}}
  else{
    maiden.charge=Math.max(0,maiden.charge-dt*.11);
    let target={x:player.x,z:player.z};
    const gEast=maiden.z< -3.15&&maiden.x>4.05,pEast=player.z< -3.15&&player.x>4.05;
    const gWest=maiden.z< -3.15&&maiden.x< -4.05,pWest=player.z< -3.15&&player.x< -4.05;
    const gOffice=maiden.z>4.55&&Math.abs(maiden.x)<5,pOffice=player.z>4.55&&Math.abs(player.x)<5;
    if(gEast&&!pEast)target={x:10.25,z:.45};
    else if(gWest&&!pWest)target={x:-10.25,z:.45};
    else if(gOffice&&!pOffice)target={x:0,z:2.65};
    else if(!gEast&&!gWest&&!gOffice&&pEast)target=Math.abs(maiden.x-10.25)>1.1||maiden.z>1.2?{x:10.25,z:.45}:{x:10.25,z:-4.45};
    else if(!gEast&&!gWest&&!gOffice&&pWest)target=Math.abs(maiden.x+10.25)>1.1||maiden.z>1.2?{x:-10.25,z:.45}:{x:-10.25,z:-4.45};
    else if(!gEast&&!gWest&&!gOffice&&pOffice)target=Math.abs(maiden.x)>1.1?{x:0,z:2.65}:{x:0,z:6.25};
    const dx=target.x-maiden.x,dz=target.z-maiden.z,len=Math.hypot(dx,dz);
    if(len>.12){const step=Math.min(len,maiden.speed*dt);maiden.x+=dx/len*step;maiden.z+=dz/len*step;}
  }
  const actual=Math.hypot(maiden.x-player.x,maiden.z-player.z);
  if(actual<1.18&&invulnerable<=0){
    hp--;maiden.attacks++;invulnerable=2.5;player.x=0;player.z=9;
    maiden.x=12;maiden.z=-10;ghostWaiting=4;maiden.charge=Math.max(0,maiden.charge-1.25);
    sfx('sfx_scream_01.mp3',.25);
    if(hp<=0){finish(false);return;}
    showToast('처녀귀신에게 붙잡혔어요! 관리실에서 다시 시작합니다.');
  }
}
function updatePlayer(dt){
  let f=(keys.has('w')||keys.has('arrowup')?1:0)-(keys.has('s')||keys.has('arrowdown')?1:0)-joy.y;
  let r=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0)+joy.x;
  const mag=Math.hypot(f,r);if(mag>1){f/=mag;r/=mag;}
  const run=keys.has('shift')&&mag>.1;
  const speed=run?5.0:3.25;
  const fx=-Math.sin(viewYaw),fz=-Math.cos(viewYaw),rx=Math.cos(viewYaw),rz=-Math.sin(viewYaw);
  const vx=(fx*f+rx*r)*speed*dt,vz=(fz*f+rz*r)*speed*dt;
  if(canWalk(player.x+vx,player.z))player.x+=vx;
  if(canWalk(player.x,player.z+vz))player.z+=vz;
  if(mag>.07)player.yaw=Math.atan2(-(fx*f+rx*r),-(fz*f+rz*r));
  player.root.position.set(player.x,invulnerable>0&&Math.floor(elapsed*10)%2===0?-.03:0,player.z);
  player.root.rotation.y=player.yaw;
  const anim=player.animation;
  if(anim){if(anim.walk)anim.walk.setEffectiveWeight(Math.min(1,mag));if(anim.idle)anim.idle.setEffectiveWeight(1-Math.min(1,mag));}
}
function updateCamera(dt){
  const fx=-Math.sin(viewYaw),fz=-Math.cos(viewYaw);
  const desired=new THREE.Vector3(player.x-fx*8.5,6.1,player.z-fz*8.5);
  camera.position.lerp(desired,Math.min(1,dt*8));camera.lookAt(player.x+fx*1.4,1.15,player.z+fz*1.4);
  torch.position.set(player.x,1.85,player.z);torchTarget.position.set(player.x+fx*4,1.30,player.z+fz*4);
  torch.intensity=flashOn&&power>0?23:0;
}
function updateProps(dt){
  for(const [i,o] of disturbed.entries())if(!o.done){
    o.object.rotation.y+=dt*(i===2?1.8:.7);
    o.object.position.y=1.2+Math.sin(elapsed*2.5+o.phase)*.20;
  }
  for(const m of glowThings){
    m.orb.position.y=.75+Math.sin(elapsed*2.3+m.holder.position.x)*.14;
    m.holder.rotation.y+=dt*.25;
  }
  westLight.intensity=8.5+Math.sin(elapsed*4)*.55;
  eastLight.intensity=stage>=2?6.8+Math.sin(elapsed*8)*1.3:8;
}
function drawMap(){
  const ctx=ui.map.getContext('2d'),w=ui.map.width,h=ui.map.height;
  ctx.clearRect(0,0,w,h);ctx.fillStyle='#08131bea';ctx.fillRect(0,0,w,h);
  const tx=x=>(x+19)/38*w,tz=z=>(z+16)/30*h;
  for(const rect of [{x:-17,z:-15,w:13,h:12},{x:4,z:-15,w:13,h:12},{x:-18,z:-3,w:36,h:7.5},{x:-5,z:4.5,w:10,h:8.5}]){
    ctx.fillStyle='#38495b';ctx.fillRect(tx(rect.x),tz(rect.z),rect.w/38*w,rect.h/30*h);
    ctx.strokeStyle='#809ba76a';ctx.strokeRect(tx(rect.x),tz(rect.z),rect.w/38*w,rect.h/30*h);
  }
  const marker=(x,z,c,r=3)=>{ctx.fillStyle=c;ctx.beginPath();ctx.arc(tx(x),tz(z),r,0,Math.PI*2);ctx.fill();};
  if(stage===1){for(const item of disturbed)if(!item.done)marker(item.x,item.z,'#f5b869',2.5);if(fixes===3)marker(-10.3,-6,'#ffc86f',4);}
  if(stage===3)marker(12.5,-6,'#ca99ff',4);
  if(stage===4)marker(0,10.35,'#79e0bd',4);
  marker(player.x,player.z,'#7ddaf4',4);
  ctx.strokeStyle='#7ddaf4';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(tx(player.x),tz(player.z));ctx.lineTo(tx(player.x)-Math.sin(viewYaw)*9,tz(player.z)-Math.cos(viewYaw)*9);ctx.stroke();
}
function loop(now){
  requestAnimationFrame(loop);const dt=Math.min(.045,Math.max(0,(now-last)/1000));last=now;
  if(started&&!paused&&!ended){
    elapsed+=dt;invulnerable=Math.max(0,invulnerable-dt);
    if(flashOn)power=Math.max(0,power-dt*.95);else power=Math.min(100,power+dt*2.8);
    if(power===0)flashOn=false;
    updatePlayer(dt);updateGhost(dt);updateProps(dt);
    for(const mixer of mixers)mixer.update(dt);
    hudClock+=dt;miniClock+=dt;
    if(hudClock>.12){updateHud();hudClock=0;}
    if(miniClock>.25){drawMap();miniClock=0;}
    if(toastSeconds>0){toastSeconds-=dt;if(toastSeconds<=0)ui.toast.classList.remove('show');}
  }
  updateCamera(dt);ui.time.textContent=String(Math.floor(elapsed/60)).padStart(2,'0')+':'+String(Math.floor(elapsed%60)).padStart(2,'0');
  renderer.render(scene,camera);
}
requestAnimationFrame(loop);
function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}
addEventListener('resize',resize);
document.addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' ','shift'].includes(k))e.preventDefault();
  keys.add(k);if(e.repeat)return;
  if(k==='e'||k===' ')act();
  if(k==='f'&&started){flashOn=!flashOn;updateHud();}
  if(k==='escape'&&started){paused=!paused;ui.help.classList.toggle('hidden',!paused);}
});
document.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
addEventListener('blur',()=>{keys.clear();joy.x=joy.y=0;ui.knob.style.transform='translate(0,0)';});
ui.canvas.addEventListener('pointerdown',e=>{turnPointer=e.pointerId;prevX=e.clientX;ui.canvas.setPointerCapture(e.pointerId);});
ui.canvas.addEventListener('pointermove',e=>{
  if(turnPointer!==e.pointerId||!started||paused)return;
  viewYaw+=Math.max(-55,Math.min(55,e.clientX-prevX))*.0064;prevX=e.clientX;
});
for(const evt of ['pointerup','pointercancel'])ui.canvas.addEventListener(evt,e=>{if(turnPointer===e.pointerId)turnPointer=null;});
let joyPointer=null;
function setJoy(e){const b=ui.joy.getBoundingClientRect(),x=e.clientX-(b.left+b.width/2),y=e.clientY-(b.top+b.height/2);
  const n=Math.hypot(x,y)||1,scale=Math.min(1,47/n);joy.x=x*scale/47;joy.y=y*scale/47;
  ui.knob.style.transform='translate('+(joy.x*47)+'px,'+(joy.y*47)+'px)';
}
ui.joy.addEventListener('pointerdown',e=>{joyPointer=e.pointerId;ui.joy.setPointerCapture(e.pointerId);setJoy(e);});
ui.joy.addEventListener('pointermove',e=>{if(joyPointer===e.pointerId)setJoy(e);});
for(const evt of ['pointerup','pointercancel'])ui.joy.addEventListener(evt,e=>{if(joyPointer===e.pointerId){joyPointer=null;joy.x=joy.y=0;ui.knob.style.transform='translate(0,0)';}});
ui.action.addEventListener('click',act);
$('start').addEventListener('click',reset);
$('retry').addEventListener('click',reset);
$('helpButton').addEventListener('click',()=>{paused=true;ui.help.classList.remove('hidden');});
$('closeHelp').addEventListener('click',()=>{paused=false;ui.help.classList.add('hidden');});
ui.flash.addEventListener('click',()=>{if(started){flashOn=!flashOn;updateHud();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&started){paused=true;ui.help.classList.remove('hidden');bgm.pause();}else if(started&&!paused){bgm.play().catch(()=>{});}});
updateHud();drawMap();

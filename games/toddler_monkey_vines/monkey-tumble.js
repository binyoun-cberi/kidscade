import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const COLORS=[
  {name:'빨강',hex:0xff6767,css:'#ff6767',dot:'🔴'},
  {name:'노랑',hex:0xffd552,css:'#ffd552',dot:'🟡'},
  {name:'초록',hex:0x5dce76,css:'#5dce76',dot:'🟢'},
  {name:'파랑',hex:0x5aabff,css:'#5aabff',dot:'🔵'}
];
const PLAYER_ICONS=['🐵','🦊','🐼','🐰'];
const PLAYER_COLORS=['#70c97b','#ff9f62','#7898ff','#bf82f4'];
const ASSET={
  monkey:new URL('../../assets/game/characters/pets/animal-monkey.glb',import.meta.url).href,
  banana:new URL('../../assets/game/food/banana.glb',import.meta.url).href,
  palm:new URL('../../assets/game/3d/nature/kenney-nature-kit/tree-palm.glb',import.meta.url).href,
  bush:new URL('../../assets/game/3d/nature/kenney-nature-kit/plant-bush.glb',import.meta.url).href
};

const state={
  mode:'solo',playerCount:1,current:0,turn:1,soloTurn:0,picked:null,ready:false,moving:false,over:false,
  sound:true,voice:true,players:[],rods:[],monkeys:[],pulling:null,boardRotation:0,lastTime:0,session:0
};
const sceneState={renderer:null,scene:null,camera:null,root:null,tower:null,rodRoot:null,monkeyRoot:null,decorRoot:null,raycaster:new THREE.Raycaster(),pointer:new THREE.Vector2(),hitMeshes:[],models:{},clock:new THREE.Clock()};
let audio=null;

function show(el){el&&el.classList.remove('hidden')}
function hide(el){el&&el.classList.add('hidden')}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function rand(a,b){return a+Math.random()*(b-a)}
function easeOut(t){return 1-Math.pow(1-t,3)}
function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('show'),1500)}
function tone(freq,d=.08,vol=.035){if(!state.sound)return;try{audio||(audio=new (window.AudioContext||window.webkitAudioContext)());if(audio.state==='suspended')audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.value=freq;g.gain.value=vol;o.connect(g);g.connect(audio.destination);o.start();g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+d);o.stop(audio.currentTime+d+.03)}catch(_){ }}
function tumbleSound(){if(!state.sound)return;tone(230,.09,.04);setTimeout(()=>tone(180,.08,.03),90);setTimeout(()=>tone(320,.12,.025),175)}
function speak(msg){if(!state.voice||!('speechSynthesis' in window))return;try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(msg);u.lang='ko-KR';u.rate=.9;u.pitch=1.08;speechSynthesis.speak(u)}catch(_){ }}

function makeFallbackMonkey(){
  const g=new THREE.Group();
  const brown=new THREE.MeshStandardMaterial({color:0x9b5f34,roughness:.5});
  const tan=new THREE.MeshStandardMaterial({color:0xf0bf86,roughness:.48});
  const cream=new THREE.MeshStandardMaterial({color:0xfff4df,roughness:.38});
  const dark=new THREE.MeshStandardMaterial({color:0x241d18,roughness:.32});
  const body=new THREE.Mesh(new THREE.SphereGeometry(.23,24,18),brown);body.scale.set(.84,1.12,.72);body.position.y=.29;g.add(body);
  const belly=new THREE.Mesh(new THREE.SphereGeometry(.145,20,14),tan);belly.scale.set(.82,1.08,.42);belly.position.set(0,.30,.145);g.add(belly);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.215,24,18),brown);head.position.y=.64;g.add(head);
  const face=new THREE.Mesh(new THREE.SphereGeometry(.145,20,14),tan);face.scale.set(.92,.86,.48);face.position.set(0,.63,.16);g.add(face);
  const muzzle=new THREE.Mesh(new THREE.SphereGeometry(.095,18,12),cream);muzzle.scale.set(1.12,.75,.42);muzzle.position.set(0,.585,.245);g.add(muzzle);
  for(const sx of [-1,1]){
    const ear=new THREE.Mesh(new THREE.SphereGeometry(.077,16,12),tan);ear.position.set(.19*sx,.66,0);g.add(ear);
    const eyeWhite=new THREE.Mesh(new THREE.SphereGeometry(.041,14,10),cream);eyeWhite.position.set(.061*sx,.675,.245);g.add(eyeWhite);
    const pupil=new THREE.Mesh(new THREE.SphereGeometry(.019,12,8),dark);pupil.position.set(.062*sx,.675,.278);g.add(pupil);
    const arm=new THREE.Mesh(new THREE.CapsuleGeometry(.036,.23,5,10),brown);arm.rotation.z=sx*.72;arm.position.set(.18*sx,.35,.01);g.add(arm);
    const leg=new THREE.Mesh(new THREE.CapsuleGeometry(.041,.20,5,10),brown);leg.rotation.z=sx*.38;leg.position.set(.11*sx,.06,.01);g.add(leg);
  }
  const nose=new THREE.Mesh(new THREE.SphereGeometry(.018,10,8),dark);nose.scale.set(1.35,.8,.75);nose.position.set(0,.61,.292);g.add(nose);
  const tail=new THREE.Mesh(new THREE.TorusGeometry(.22,.027,10,24,Math.PI*1.55),brown);tail.rotation.set(Math.PI/2,0,.44);tail.position.set(.22,.29,-.04);g.add(tail);
  g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
  return g;
}

function normalizeModel(root,targetHeight){
  const wrap=new THREE.Group();
  root.updateMatrixWorld(true);
  let box=new THREE.Box3().setFromObject(root),size=new THREE.Vector3();box.getSize(size);
  const scale=targetHeight/Math.max(.001,size.y);
  root.scale.multiplyScalar(scale);root.updateMatrixWorld(true);
  box=new THREE.Box3().setFromObject(root);
  const cx=(box.min.x+box.max.x)/2,cz=(box.min.z+box.max.z)/2;
  root.position.x-=cx;root.position.z-=cz;root.position.y-=box.min.y;
  root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material){o.material=o.material.clone();if('roughness' in o.material)o.material.roughness=Math.max(.45,o.material.roughness||0)}}});
  wrap.add(root);return wrap;
}
function loadModel(url,height){
  return new Promise(resolve=>{
    new GLTFLoader().load(url,g=>resolve(normalizeModel(g.scene,height)),undefined,()=>resolve(null));
  });
}
function cloneModel(proto){return proto?SkeletonUtils.clone(proto):null}

function initScene(){
  const canvas=$('#board3d');
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(3,window.devicePixelRatio||1));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.18;
  const scene=new THREE.Scene();scene.fog=null;
  const camera=new THREE.PerspectiveCamera(30,1,.1,40);camera.position.set(6.1,5.5,7.1);camera.lookAt(0,2.9,0);
  scene.add(new THREE.HemisphereLight(0xffffff,0x87a06f,2.35));
  const sun=new THREE.DirectionalLight(0xffffff,3.15);sun.position.set(4.8,9.2,6.2);sun.castShadow=true;sun.shadow.mapSize.set(1536,1536);sun.shadow.camera.left=-8;sun.shadow.camera.right=8;sun.shadow.camera.top=8;sun.shadow.camera.bottom=-8;scene.add(sun);
  const fill=new THREE.DirectionalLight(0xfff1cf,1.15);fill.position.set(-6,4,3);scene.add(fill);
  const ground=new THREE.Mesh(new THREE.CircleGeometry(9,64),new THREE.MeshStandardMaterial({color:0xb3df8f,roughness:1}));
  ground.rotation.x=-Math.PI/2;ground.position.y=0;ground.receiveShadow=true;scene.add(ground);
  const root=new THREE.Group(),tower=new THREE.Group(),rodRoot=new THREE.Group(),monkeyRoot=new THREE.Group(),decorRoot=new THREE.Group();
  root.add(tower,rodRoot,monkeyRoot);scene.add(root,decorRoot);
  sceneState.renderer=renderer;sceneState.scene=scene;sceneState.camera=camera;sceneState.root=root;sceneState.tower=tower;sceneState.rodRoot=rodRoot;sceneState.monkeyRoot=monkeyRoot;sceneState.decorRoot=decorRoot;
  buildTower();
  resize();
  window.addEventListener('resize',resize);
  canvas.addEventListener('pointerdown',onPointer);
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  requestAnimationFrame(loop);
}
function buildTower(){
  const g=sceneState.tower;g.clear();
  const baseMat=new THREE.MeshStandardMaterial({color:0x9c6946,roughness:.82});
  const rimMat=new THREE.MeshStandardMaterial({color:0xf1f5ea,roughness:.42});
  const base=new THREE.Mesh(new THREE.CylinderGeometry(2.25,2.38,.48,40),baseMat);base.position.y=.28;base.castShadow=true;base.receiveShadow=true;g.add(base);
  const tray=new THREE.Mesh(new THREE.CylinderGeometry(2.02,2.14,.18,40),new THREE.MeshStandardMaterial({color:0xf4d574,roughness:.62}));tray.position.y=.58;tray.receiveShadow=true;g.add(tray);
  const wallMat=new THREE.MeshPhysicalMaterial({color:0xffffff,transparent:true,opacity:.07,roughness:.04,metalness:0,transmission:.92,thickness:.02,clearcoat:1,clearcoatRoughness:.06,side:THREE.DoubleSide,depthWrite:false});
  const wall=new THREE.Mesh(new THREE.CylinderGeometry(1.78,1.78,5.0,64,1,true),wallMat);wall.position.y=3.08;g.add(wall);
  for(const y of [.62,1.9,3.1,4.3,5.58]){
    const ring=new THREE.Mesh(new THREE.TorusGeometry(1.79,.075,10,48),rimMat);ring.rotation.x=Math.PI/2;ring.position.y=y;ring.castShadow=true;g.add(ring);
  }
  for(let i=0;i<6;i++){
    const a=i/6*Math.PI*2;const p=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,4.9,8),rimMat);p.position.set(Math.cos(a)*1.78,3.08,Math.sin(a)*1.78);p.castShadow=true;g.add(p);
  }
  const crownMat=new THREE.MeshStandardMaterial({color:0x74c66c,roughness:.72});
  for(let i=0;i<6;i++){
    const a=i/6*Math.PI*2,leaf=new THREE.Mesh(new THREE.SphereGeometry(.28,12,9),crownMat);
    leaf.scale.set(1.15,.32,.58);leaf.position.set(Math.cos(a)*1.45,5.62,Math.sin(a)*1.45);leaf.rotation.y=-a;leaf.castShadow=true;g.add(leaf);
  }
}
async function loadAssets(){
  const results=await Promise.all([
    loadModel(ASSET.banana,.28),
    loadModel(ASSET.palm,3.8),
    loadModel(ASSET.bush,.8)
  ]);
  sceneState.models.monkey=makeFallbackMonkey();
  sceneState.models.banana=results[0];
  sceneState.models.palm=results[1];
  sceneState.models.bush=results[2];
  buildDecor();
  $('#assetState').textContent='선명한 장난감형 원숭이 말 사용 중';
}
function buildDecor(){
  const d=sceneState.decorRoot;d.clear();
  const palm=sceneState.models.palm,bush=sceneState.models.bush,banana=sceneState.models.banana;
  if(palm){
    [[-4.2,0,-2.2,.82],[4.3,0,-2.4,.78]].forEach((p,i)=>{const o=cloneModel(palm);o.position.set(p[0],p[1],p[2]);o.scale.multiplyScalar(p[3]);o.rotation.y=i*1.9;d.add(o)});
  }
  if(bush){
    [[-3.0,0,1.6],[3.0,0,1.5]].forEach((p,i)=>{const o=cloneModel(bush);o.position.set(p[0],0,p[2]);o.rotation.y=i;d.add(o)});
  }
  if(banana){
    for(let i=0;i<4;i++){const o=cloneModel(banana);const a=i/4*Math.PI*2+.3;o.position.set(Math.cos(a)*2.85,.05,Math.sin(a)*2.85);o.rotation.set(0,a,Math.sin(a)*.4);d.add(o)}
  }
}

function clearRound(){
  sceneState.rodRoot.clear();sceneState.monkeyRoot.clear();sceneState.hitMeshes=[];state.rods=[];state.monkeys=[];state.pulling=null;
}
function makeRod(id,y,angle,color){
  const dir=new THREE.Vector3(Math.cos(angle),0,Math.sin(angle));
  const group=new THREE.Group();group.position.y=y;
  const mat=new THREE.MeshStandardMaterial({color:COLORS[color].hex,roughness:.28,metalness:.04,emissive:COLORS[color].hex,emissiveIntensity:0});
  const geom=new THREE.CylinderGeometry(.082,.082,4.8,16);
  const mesh=new THREE.Mesh(geom,mat);mesh.castShadow=true;
  const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),dir.clone().normalize());mesh.quaternion.copy(q);
  const hit=new THREE.Mesh(new THREE.CylinderGeometry(.18,.18,4.95,10),new THREE.MeshBasicMaterial({transparent:true,opacity:.001,depthWrite:false}));
  hit.quaternion.copy(q);hit.userData.rodId=id;group.add(mesh,hit);
  sceneState.rodRoot.add(group);sceneState.hitMeshes.push(hit);
  return{id,y,angle,color,dir,group,mesh,hit,out:false,pullT:0,pullSign:id%2?1:-1};
}
function buildRods(){
  const levels=[1.05,1.30,1.56,1.82,2.08,2.34,2.61,2.88,3.15,3.42,3.69,3.96,4.23,4.50,4.77,5.03,5.28];
  let id=0;
  for(let i=0;i<levels.length;i++){
    const count=i%3===1?2:1;
    for(let k=0;k<count;k++){
      const angle=((i*41+k*73)%180)*Math.PI/180+rand(-.07,.07);
      state.rods.push(makeRod(id++,levels[i]+k*.025,angle,(i+k)%4));
    }
  }
}
function distanceToRodXZ(monkey,rod){
  const dx=monkey.x,dz=monkey.z,ux=rod.dir.x,uz=rod.dir.z;
  const projection=dx*ux+dz*uz;
  if(Math.abs(projection)>1.85)return 99;
  return Math.abs(dx*(-uz)+dz*ux);
}
function findSupport(monkey,belowY){
  let best=null;
  for(const rod of state.rods){
    if(rod.out||rod.y>=belowY-.10)continue;
    const d=distanceToRodXZ(monkey,rod);
    if(d>.34)continue;
    if(!best||rod.y>best.y)best=rod;
  }
  return best;
}
function makeMonkeyObject(){
  const o=cloneModel(sceneState.models.monkey)||makeFallbackMonkey();
  o.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true}});
  return o;
}
function buildMonkeys(){
  const preferred=state.rods.filter((_,i)=>i>4);
  const count=16;
  for(let i=0;i<count;i++){
    const rod=preferred[(i*5+3)%preferred.length];
    const along=((i%5)-2)*.29+rand(-.08,.08);
    const perp=rand(-.07,.07);
    const px=rod.dir.x*along-rod.dir.z*perp,pz=rod.dir.z*along+rod.dir.x*perp;
    const obj=makeMonkeyObject();obj.position.set(px,rod.y+.08,pz);obj.rotation.y=-rod.angle+rand(-.35,.35);obj.rotation.z=rand(-.11,.11);
    sceneState.monkeyRoot.add(obj);
    state.monkeys.push({id:i,x:px,z:pz,y:rod.y+.08,targetY:rod.y+.08,vy:0,supportId:rod.id,fallen:false,ground:false,obj,wobble:Math.random()*Math.PI*2});
  }
}
function scatterGround(monkey){
  const a=Math.atan2(monkey.z,monkey.x)+rand(-.5,.5),r=rand(1.05,1.55);
  monkey.groundX=Math.cos(a)*r;monkey.groundZ=Math.sin(a)*r;
}
function resetRound(){
  state.session++;state.current=0;state.turn=1;state.soloTurn=0;state.picked=null;state.ready=false;state.moving=false;state.over=false;state.boardRotation=0;
  state.players=Array.from({length:state.playerCount},(_,i)=>({name:(i+1)+'번 친구',fallen:0,icon:PLAYER_ICONS[i],color:PLAYER_COLORS[i]}));
  clearRound();buildRods();buildMonkeys();sceneState.root.rotation.y=0;
  setOrb(null);$('#mission').textContent='색을 뽑아 볼까요?';$('#help').textContent='버튼을 누르면 색깔이 나와요.';updateUI();
}
function setOrb(color){
  const orb=$('#orb');orb.style.background=color==null?'#e7eee5':COLORS[color].css;orb.textContent=color==null?'🎨':COLORS[color].dot;
}
function startGame(mode,count){
  state.mode=mode;state.playerCount=count;hide($('#menu'));show($('#game'));hide($('#result'));resetRound();
  setTimeout(()=>speak(mode==='solo'?'색 뽑기 버튼을 눌러 보세요.':'첫 번째 친구 차례예요.'),250);
}
function chooseColor(){
  if(state.moving||state.over||state.ready)return;
  const available=[...new Set(state.rods.filter(r=>!r.out).map(r=>r.color))];
  if(!available.length){finish();return}
  state.picked=available[Math.floor(Math.random()*available.length)];state.ready=true;setOrb(state.picked);
  const orb=$('#orb');orb.classList.remove('spin');void orb.offsetWidth;orb.classList.add('spin');
  $('#mission').textContent=COLORS[state.picked].name+' 막대!';
  $('#help').textContent=COLORS[state.picked].name+' 막대를 하나 톡 눌러 빼요.';
  tone(620,.09,.035);speak(COLORS[state.picked].name+' 막대를 찾아서 눌러 보세요.');updateRodHighlights();updateUI();
}
function updateRodHighlights(){
  for(const rod of state.rods){
    const chosen=state.ready&&!rod.out&&rod.color===state.picked;
    rod.mesh.material.emissiveIntensity=chosen ? .38 : 0;
    rod.mesh.material.opacity=state.ready&&!chosen ? .62 : 1;
    rod.mesh.material.transparent=state.ready&&!chosen;
  }
}
function pullRod(rod){
  if(!state.ready||state.moving||state.over||rod.out)return;
  if(rod.color!==state.picked){tone(160,.11,.035);toast(COLORS[state.picked].name+' 막대를 찾아보세요!');return}
  state.ready=false;state.moving=true;rod.out=true;rod.pullT=.001;state.pulling=rod;tumbleSound();
  let fell=0;
  for(const m of state.monkeys){
    if(m.fallen||m.supportId!==rod.id)continue;
    const support=findSupport(m,m.y+.02);
    if(support){m.supportId=support.id;m.targetY=support.y+.08;m.vy=0}
    else{m.supportId=null;m.targetY=.64;m.vy=0;m.fallen=true;scatterGround(m);fell++}
  }
  if(fell)state.players[state.current].fallen+=fell;
  updateRodHighlights();updateUI();
  const token=state.session;
  setTimeout(()=>{if(token===state.session)afterPull(fell)},900);
}
function afterPull(count){
  state.moving=false;state.pulling=null;
  if(count){
    const b=$('#burst');b.innerHTML='원숭이 <b>× '+count+'</b>';b.classList.remove('show');void b.offsetWidth;b.classList.add('show');
    tone(430,.11,.03);speak(count===1?'한 마리 떨어졌어요.':count+'마리 떨어졌어요.');
  }else{speak('아무도 안 떨어졌어요. 잘했어요!')}
  if(state.mode==='solo'){
    state.soloTurn++;
    if(state.soloTurn>=10||state.monkeys.every(m=>m.fallen)){updateUI();setTimeout(finish,650);return}
  }else{
    if(state.monkeys.every(m=>m.fallen)||state.rods.every(r=>r.out)){updateUI();setTimeout(finish,650);return}
    state.current=(state.current+1)%state.playerCount;state.turn++;speak((state.current+1)+'번 친구 차례예요.');
  }
  state.picked=null;setOrb(null);$('#mission').textContent='다음 색을 뽑아요';$('#help').textContent='색 뽑기 버튼을 눌러요.';updateUI();
}
function updateUI(){
  $('#turnNo').textContent=state.mode==='solo'?'TURN '+Math.min(10,state.soloTurn+1)+' / 10':'TURN '+state.turn;
  $('#turnLabel').textContent=state.mode==='solo'?'🌟 혼자 도전':(state.players[state.current]?.icon||'🐵')+' '+(state.current+1)+'번 친구 차례';
  $('#turnDot').style.background=state.mode==='solo'?'#70ca78':(state.players[state.current]?.color||'#70ca78');
  const list=$('#playerList');list.classList.toggle('hidden',state.mode==='solo');
  list.innerHTML=state.mode==='solo'?'':state.players.map((p,i)=>'<div class="player '+(i===state.current?'active':'')+'"><div class="av">'+p.icon+'</div><div><b>'+p.name+'</b><small>'+(i===state.current?'지금 내 차례!':'기다리는 중')+'</small></div><div class="score">🐒 '+p.fallen+'</div></div>').join('');
  $('#stats').classList.toggle('hidden',state.mode!=='solo');
  $('#safe').textContent=state.monkeys.filter(m=>!m.fallen).length;
  $('#left').textContent=Math.max(0,10-state.soloTurn);
  $('#spin').disabled=state.ready||state.moving||state.over;
}
function finish(){
  if(state.over)return;state.over=true;state.ready=false;state.moving=false;$('#spin').disabled=true;
  let html='';
  if(state.mode==='solo'){
    const safe=state.monkeys.filter(m=>!m.fallen).length,stars=safe>=10?3:safe>=7?2:safe>=4?1:0;
    html='<div class="trophy">'+(stars===3?'🏆':'🌟')+'</div><h2>혼자 도전 끝!</h2><div class="stars">'+('⭐'.repeat(stars))+('☆'.repeat(3-stars))+'</div><p>타워에 <b>'+safe+'마리</b>를 남겼어요.</p>';
    speak('게임 끝! '+safe+'마리가 남았어요.');
  }else{
    const ranking=state.players.map(p=>({...p})).sort((a,b)=>a.fallen-b.fallen),best=ranking[0].fallen,winners=ranking.filter(p=>p.fallen===best);
    html='<div class="trophy">🏆</div><h2>'+(winners.length>1?'사이좋게 공동 1등!':winners[0].name+' 승리!')+'</h2><p>떨어뜨린 원숭이가 적을수록 좋아요.</p>'+ranking.map((p,i)=>'<div class="rank"><span>'+(i===0?'🥇':i===1?'🥈':i===2?'🥉':'🌿')+'</span><span>'+p.icon+' '+p.name+'</span><strong>🐒 '+p.fallen+'</strong></div>').join('');
    speak(winners.length>1?'공동 일등이에요!':winners[0].name+'이 이겼어요!');
  }
  $('#resultIn').innerHTML=html+'<button class="primary" id="again">한 번 더!</button><button class="secondary" id="rhome">처음 화면</button>';
  show($('#result'));$('#again').onclick=()=>{hide($('#result'));resetRound()};$('#rhome').onclick=home;
}
function home(){
  state.session++;state.over=true;hide($('#game'));hide($('#result'));show($('#menu'));if('speechSynthesis'in window)speechSynthesis.cancel();
}
function rotateBoard(){
  state.boardRotation+=Math.PI/4;tone(360,.05,.02);
}
function onPointer(e){
  if(!state.ready||state.moving||state.over)return;
  const rect=e.currentTarget.getBoundingClientRect();
  sceneState.pointer.x=((e.clientX-rect.left)/rect.width)*2-1;sceneState.pointer.y=-((e.clientY-rect.top)/rect.height)*2+1;
  sceneState.raycaster.setFromCamera(sceneState.pointer,sceneState.camera);
  const hits=sceneState.raycaster.intersectObjects(sceneState.hitMeshes,false);
  if(!hits.length)return;
  const id=hits[0].object.userData.rodId,rod=state.rods.find(r=>r.id===id);if(rod)pullRod(rod);
}
function resize(){
  const canvas=$('#board3d'),stage=canvas.parentElement,rect=stage.getBoundingClientRect();
  if(!rect.width||!rect.height)return;
  sceneState.renderer.setSize(rect.width,rect.height,false);sceneState.camera.aspect=rect.width/rect.height;sceneState.camera.updateProjectionMatrix();
}
function animateRods(dt,time){
  for(const rod of state.rods){
    if(rod.out&&rod.pullT<1){
      rod.pullT=Math.min(1,rod.pullT+dt*1.65);
      const d=easeOut(rod.pullT)*4.6*rod.pullSign;rod.group.position.set(rod.dir.x*d,rod.y,rod.dir.z*d);
      if(rod.pullT>=1){rod.group.visible=false;rod.hit.visible=false}
    }
    if(state.ready&&!rod.out&&rod.color===state.picked){
      const pulse=.25+.18*(Math.sin(time*.006+rod.id)+1);rod.mesh.material.emissiveIntensity=pulse;
    }
  }
}
function animateMonkeys(dt,time){
  for(const m of state.monkeys){
    if(m.y>m.targetY+.006){
      m.vy+=dt*5.8;m.y=Math.max(m.targetY,m.y-m.vy*dt);
      if(m.y<=m.targetY+.006){m.y=m.targetY;m.vy=0;if(m.fallen)m.ground=true}
    }
    if(m.fallen&&m.ground){
      m.x+=(m.groundX-m.x)*Math.min(1,dt*4);m.z+=(m.groundZ-m.z)*Math.min(1,dt*4);
      m.obj.rotation.z+=(1.18-m.obj.rotation.z)*Math.min(1,dt*4);
    }else{
      m.obj.rotation.z+=Math.sin(time*.002+m.wobble)*dt*.015;
    }
    m.obj.position.set(m.x,m.y,m.z);
  }
}
function loop(t){
  const dt=Math.min(.04,(t-state.lastTime)/1000||.016);state.lastTime=t;
  sceneState.root.rotation.y+=(state.boardRotation-sceneState.root.rotation.y)*Math.min(1,dt*5);
  animateRods(dt,t);animateMonkeys(dt,t);
  sceneState.renderer.render(sceneState.scene,sceneState.camera);requestAnimationFrame(loop);
}

function wireUI(){
  $('#solo').onclick=()=>startGame('solo',1);
  $('#friends').onclick=()=>show($('#setup'));
  $('#cancelSetup').onclick=()=>hide($('#setup'));
  $$('#choice button').forEach(b=>b.onclick=()=>{$$('#choice button').forEach(q=>q.classList.remove('on'));b.classList.add('on')});
  $('#startFriends').onclick=()=>{const n=Number($('#choice .on').dataset.n);hide($('#setup'));startGame('local',n)};
  $('#rules').onclick=()=>show($('#ruleBox'));$('#closeRules').onclick=()=>hide($('#ruleBox'));
  $('#spin').onclick=chooseColor;$('#home').onclick=home;$('#restart').onclick=()=>{if(confirm('처음부터 다시 할까요?'))resetRound()};$('#rotate').onclick=rotateBoard;
  function toggleSound(){state.sound=!state.sound;$('#sound').textContent=state.sound?'🎵':'🔇';$('#menuSound').textContent=state.sound?'🎵 소리 켜짐':'🔇 소리 꺼짐'}
  $('#sound').onclick=toggleSound;$('#menuSound').onclick=toggleSound;
  $('#voice').onclick=()=>{state.voice=!state.voice;$('#voice').textContent=state.voice?'🔊 읽어주기 켜짐':'🔇 읽어주기 꺼짐';if(!state.voice&&'speechSynthesis' in window)speechSynthesis.cancel()};
}

async function boot(){
  wireUI();initScene();
  await loadAssets();
  resetRound();
  hide($('#loading'));
}
boot().catch(err=>{console.error(err);$('#loadingText').textContent='3D 보드를 준비하지 못했어요. 새로고침해 주세요.'});

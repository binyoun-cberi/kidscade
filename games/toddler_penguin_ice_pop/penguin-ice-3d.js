import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const DIRS=[[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]],R=4;
const HEX_R=.52,ICE_H=.28,STEP_X=Math.sqrt(3)*HEX_R,STEP_Z=1.5*HEX_R;
const ASSET={penguin:new URL('../../assets/game/characters/pets/animal-penguin.glb',import.meta.url).href};
const state={tiles:[],tileMap:new Map(),mode:'solo',turns:0,colorHits:0,countRounds:0,countLeft:0,targetColor:null,players:[],currentPlayer:0,locked:false,over:false,sound:true,voice:true,hintId:null,boardRotTarget:0,penguinFalling:false,wobbleUntil:0};
const S={renderer:null,scene:null,camera:null,boardRoot:null,tileRoot:null,penguinRoot:null,penguin:null,hammer:null,raycaster:new THREE.Raycaster(),pointer:new THREE.Vector2(),hitMeshes:[],ripples:[],last:0};
let audio=null;

const key=(q,r)=>q+','+r,dist=t=>Math.max(Math.abs(t.q),Math.abs(t.r),Math.abs(-t.q-t.r));
const show=e=>e&&e.classList.remove('hidden'),hide=e=>e&&e.classList.add('hidden');
function toast(text){const e=$('#toast');e.textContent=text;e.classList.add('show');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('show'),1350)}
function tone(f=440,d=.08,type='sine',delay=0,vol=.04){if(!state.sound)return;try{audio||(audio=new(window.AudioContext||window.webkitAudioContext)());if(audio.state==='suspended')audio.resume();const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime+delay;o.type=type;o.frequency.value=f;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g).connect(audio.destination);o.start(t);o.stop(t+d+.03)}catch(_){ }}
function sound(kind){if(kind==='hit'){tone(270,.05,'triangle');tone(760,.07,'sine',.045)}if(kind==='drop'){tone(230,.08,'triangle');tone(170,.14,'triangle',.07)}if(kind==='warn'){tone(350,.08);tone(285,.12,'sine',.08)}if(kind==='splash'){tone(180,.12,'sine');tone(120,.18,'triangle',.08)}if(kind==='win')[523,659,784,1047].forEach((f,i)=>tone(f,.15,'sine',i*.09));if(kind==='lose')[310,245,185].forEach((f,i)=>tone(f,.15,'triangle',i*.1))}
function speak(text){if(!state.voice||!('speechSynthesis'in window))return;try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='ko-KR';u.rate=.9;u.pitch=1.05;speechSynthesis.speak(u)}catch(_){ }}
function confetti(n=40){const host=$('#confetti'),cols=['#67ccec','#ffd766','#70d7a1','#ff8e72'];host.innerHTML='';for(let i=0;i<n;i++){const e=document.createElement('i');e.style.left=Math.random()*100+'vw';e.style.background=cols[i%cols.length];e.style.setProperty('--dx',(Math.random()*180-90)+'px');e.style.animationDelay=Math.random()*.25+'s';host.appendChild(e)}setTimeout(()=>host.innerHTML='',1600)}
function hitText(text){const e=$('#hitText');e.textContent=text;e.classList.remove('show');void e.offsetWidth;e.classList.add('show')}

function makeToyPenguin(){
  const g=new THREE.Group(),black=new THREE.MeshStandardMaterial({color:0x1d2930,roughness:.48}),white=new THREE.MeshStandardMaterial({color:0xf8fbfb,roughness:.4}),orange=new THREE.MeshStandardMaterial({color:0xf2a13b,roughness:.5}),dark=new THREE.MeshStandardMaterial({color:0x111820,roughness:.35});
  const body=new THREE.Mesh(new THREE.SphereGeometry(.39,28,20),black);body.scale.set(.82,1.18,.78);body.position.y=.49;g.add(body);
  const belly=new THREE.Mesh(new THREE.SphereGeometry(.29,24,18),white);belly.scale.set(.78,1.12,.38);belly.position.set(0,.47,.29);g.add(belly);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.31,26,18),black);head.position.y=.98;g.add(head);
  const face=new THREE.Mesh(new THREE.SphereGeometry(.21,22,16),white);face.scale.set(.9,.75,.35);face.position.set(0,.99,.255);g.add(face);
  const beak=new THREE.Mesh(new THREE.ConeGeometry(.085,.22,4),orange);beak.rotation.x=Math.PI/2;beak.rotation.z=Math.PI/4;beak.position.set(0,.92,.46);g.add(beak);
  for(const sx of [-1,1]){const eye=new THREE.Mesh(new THREE.SphereGeometry(.027,12,8),dark);eye.position.set(.078*sx,1.04,.438);g.add(eye);const wing=new THREE.Mesh(new THREE.CapsuleGeometry(.055,.38,5,10),black);wing.rotation.z=sx*.7;wing.position.set(.32*sx,.52,.02);g.add(wing);const foot=new THREE.Mesh(new THREE.SphereGeometry(.11,16,10),orange);foot.scale.set(1.35,.35,.8);foot.position.set(.13*sx,.055,.10);g.add(foot)}
  g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return g;
}
function normalizeModel(root,height=1.3){
  root.updateMatrixWorld(true);let box=new THREE.Box3().setFromObject(root),size=new THREE.Vector3();box.getSize(size);root.scale.multiplyScalar(height/Math.max(.001,size.y));root.updateMatrixWorld(true);box=new THREE.Box3().setFromObject(root);const cx=(box.min.x+box.max.x)/2,cz=(box.min.z+box.max.z)/2;root.position.x-=cx;root.position.z-=cz;root.position.y-=box.min.y;root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material){o.material=o.material.clone();if('roughness'in o.material)o.material.roughness=Math.max(.38,o.material.roughness||0)}}});const wrap=new THREE.Group();wrap.add(root);return wrap;
}
function loadPenguin(){return new Promise(resolve=>new GLTFLoader().load(ASSET.penguin,g=>resolve(normalizeModel(g.scene,1.28)),undefined,()=>resolve(null)))}

function init3D(){
  const canvas=$('#ice3d'),renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(2.7,window.devicePixelRatio||1));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.16;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,1,.1,40);camera.position.set(7.2,8.3,8.7);camera.lookAt(0,.05,0);
  scene.add(new THREE.HemisphereLight(0xffffff,0x6faac0,2.25));const sun=new THREE.DirectionalLight(0xffffff,3.1);sun.position.set(5,10,6);sun.castShadow=true;sun.shadow.mapSize.set(1536,1536);sun.shadow.camera.left=-8;sun.shadow.camera.right=8;sun.shadow.camera.top=8;sun.shadow.camera.bottom=-8;scene.add(sun);const fill=new THREE.DirectionalLight(0xbcefff,1.1);fill.position.set(-6,5,-2);scene.add(fill);
  const water=new THREE.Mesh(new THREE.CircleGeometry(8,72),new THREE.MeshPhysicalMaterial({color:0x4bb9de,roughness:.2,metalness:0,transparent:true,opacity:.86,clearcoat:1,clearcoatRoughness:.12}));water.rotation.x=-Math.PI/2;water.position.y=-.72;water.receiveShadow=true;scene.add(water);
  const tray=new THREE.Mesh(new THREE.CylinderGeometry(5.05,5.2,.22,64),new THREE.MeshStandardMaterial({color:0xeafaff,roughness:.5,transparent:true,opacity:.94}));tray.position.y=-.42;tray.receiveShadow=true;scene.add(tray);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(5.08,.12,12,72),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.32}));rim.rotation.x=Math.PI/2;rim.position.y=-.27;rim.castShadow=true;scene.add(rim);
  const boardRoot=new THREE.Group(),tileRoot=new THREE.Group(),penguinRoot=new THREE.Group();boardRoot.add(tileRoot,penguinRoot);scene.add(boardRoot);
  const hammer=buildHammer();boardRoot.add(hammer);
  S.renderer=renderer;S.scene=scene;S.camera=camera;S.boardRoot=boardRoot;S.tileRoot=tileRoot;S.penguinRoot=penguinRoot;S.hammer=hammer;
  canvas.addEventListener('pointerdown',onPointer);canvas.addEventListener('contextmenu',e=>e.preventDefault());window.addEventListener('resize',resize3D);resize3D();requestAnimationFrame(loop);
}
function buildHammer(){
  const g=new THREE.Group();g.visible=false;
  const handleMat=new THREE.MeshStandardMaterial({color:0xf0b45a,roughness:.5}),headMat=new THREE.MeshStandardMaterial({color:0x4f7d91,roughness:.3,metalness:.12});
  const handle=new THREE.Mesh(new THREE.CylinderGeometry(.055,.065,1.15,12),handleMat);handle.position.y=.54;handle.castShadow=true;g.add(handle);
  const head=new THREE.Mesh(new THREE.BoxGeometry(.55,.24,.26),headMat);head.position.y=1.08;head.castShadow=true;g.add(head);g.userData.anim=null;return g;
}
function resize3D(){const stage=$('#boardStage'),r=stage.getBoundingClientRect();if(!r.width||!r.height)return;S.renderer.setSize(r.width,r.height,false);S.camera.aspect=r.width/r.height;S.camera.updateProjectionMatrix()}

function makeBoard(){
  state.tiles=[];state.tileMap.clear();let id=0;
  for(let q=-R;q<=R;q++)for(let r=-R;r<=R;r++){const s=-q-r;if(Math.max(Math.abs(q),Math.abs(r),Math.abs(s))<=R){const t={id:id++,q,r,color:Math.random()<.5?'white':'blue',alive:true,dropping:false,dropT:0,dropDelay:0,mesh:null};state.tiles.push(t);state.tileMap.set(key(q,r),t)}}
  const center=state.tileMap.get('0,0');center.color='white';const alive=state.tiles.filter(t=>t.id!==center.id),blue=alive.filter(t=>t.color==='blue').length;if(blue<28)alive.filter(t=>t.color==='white').slice(0,28-blue).forEach(t=>t.color='blue');if(blue>32)alive.filter(t=>t.color==='blue').slice(0,blue-32).forEach(t=>t.color='white');
}
function tileWorld(t){return{x:(t.q+t.r*.5)*STEP_X,z:t.r*STEP_Z}}
function tileMaterial(color){
  return new THREE.MeshPhysicalMaterial({color:color==='blue'?0x73d5f1:0xeafaff,roughness:.17,metalness:0,transparent:true,opacity:.94,clearcoat:1,clearcoatRoughness:.05,emissive:color==='blue'?0x1b6782:0x6aa6b9,emissiveIntensity:.03});
}
function rebuildTiles3D(){
  S.tileRoot.clear();S.hitMeshes=[];
  const geo=new THREE.CylinderGeometry(HEX_R,HEX_R,ICE_H,6,1,false);geo.rotateY(Math.PI/6);
  for(const t of state.tiles){const p=tileWorld(t),m=new THREE.Mesh(geo,tileMaterial(t.color));m.position.set(p.x,0,p.z);m.castShadow=true;m.receiveShadow=true;m.userData.tileId=t.id;t.mesh=m;if(!t.alive)m.visible=false;S.tileRoot.add(m);S.hitMeshes.push(m)}
}
function neighbors(t){return DIRS.map(([q,r])=>state.tileMap.get(key(t.q+q,t.r+r))).filter(Boolean)}
function edgeConnected(){const seen=new Set(),stack=state.tiles.filter(t=>t.alive&&dist(t)===R);stack.forEach(t=>seen.add(t.id));while(stack.length){const t=stack.pop();for(const n of neighbors(t))if(n.alive&&!seen.has(n.id)){seen.add(n.id);stack.push(n)}}return seen}
function supportState(){const c=state.tileMap.get('0,0');if(!c?.alive)return{count:0,missing:6,adjacentPairs:3,doom:true,ratio:0};const ring=DIRS.map(([q,r])=>!!state.tileMap.get(key(q,r))?.alive),count=ring.filter(Boolean).length,missing=ring.map((v,i)=>v?-1:i).filter(i=>i>=0);let adjacentPairs=0;for(let i=0;i<missing.length;i++)for(let j=i+1;j<missing.length;j++)if(Math.abs(missing[i]-missing[j])===1||Math.abs(missing[i]-missing[j])===5)adjacentPairs++;return{count,missing:6-count,adjacentPairs,doom:count<=3||(count===4&&adjacentPairs>=1),ratio:count/6}}
function stabilityLabel(s){if(s.count>=6)return'아주 안전해요';if(s.count===5)return'조금 흔들려요';if(s.count===4)return s.adjacentPairs?'위험해요!':'조심해요';return'곧 퐁당!'}

function renderPlayers(){const host=$('#players');if(state.mode!=='friends'){host.innerHTML='';return}host.innerHTML=state.players.map((p,i)=>'<div class="player '+(i===state.currentPlayer?'active':'')+'"><span class="avatar">'+p.e+'</span><div><b>'+p.name+'</b><small>'+(i===state.currentPlayer?'지금 차례':'기다리는 중')+'</small></div><span class="score">🧊 '+p.hits+'</span></div>').join('')}
function renderMission(){let title='얼음을 하나 골라요',desc='바깥쪽부터 천천히 깨면 더 안전해요.',badge='🧊',cls='',prog='';if(state.mode==='solo')prog=state.turns+' / 12';if(state.mode==='color'){title=state.targetColor==='blue'?'파란 얼음을 찾아요':'하얀 얼음을 찾아요';desc='같은 색 얼음 하나를 골라 톡!';badge=state.targetColor==='blue'?'🔵':'⚪';cls=state.targetColor==='blue'?'blue':'';prog=state.colorHits+' / 10'}if(state.mode==='count'){title='얼음 '+state.countLeft+'개 더 깨요';desc=(state.countRounds+1)+'번째 수 세기 미션';badge=String(state.countLeft);prog=state.countRounds+' / 6'}if(state.mode==='friends'){title=(state.players[state.currentPlayer]?.e||'🐧')+' '+(state.players[state.currentPlayer]?.name||'')+' 차례';desc='얼음 하나를 골라요. 퐁당 만든 친구가 져요.';badge='👆';prog=state.turns+'턴'}$('#missionTitle').textContent=title;$('#missionDesc').textContent=desc;$('#targetBadge').textContent=badge;$('#targetBadge').className='targetBadge '+cls;$('#progressPill').textContent=prog;$('#turnTitle').textContent=state.mode==='friends'?(state.players[state.currentPlayer]?.name||'')+' 차례':'펭귄을 지켜 주세요!';$('#turnSub').textContent=title}
function renderStatus(){const s=supportState();$('#aliveCount').textContent=state.tiles.filter(t=>t.alive).length;$('#centerSupport').textContent=s.count+' / 6';$('#stabilityText').textContent=stabilityLabel(s);$('#meterFill').style.width=(s.ratio*100)+'%';renderPlayers();renderMission();updateHighlights()}
function updateHighlights(){for(const t of state.tiles){if(!t.mesh||!t.alive)continue;const hint=state.hintId===t.id,target=state.mode==='color'&&t.color===state.targetColor;t.mesh.material.emissiveIntensity=hint ? .65 : (target ? .12 : .03);t.mesh.scale.setScalar(hint?1.08:1)}}
function newColorTarget(){const alive=state.tiles.filter(t=>t.alive&&!(t.q===0&&t.r===0)),colors=[...new Set(alive.map(t=>t.color))];state.targetColor=colors[Math.floor(Math.random()*colors.length)]||'blue'}

function resetPenguin(){state.penguinFalling=false;state.wobbleUntil=0;if(S.penguin){S.penguin.position.set(0,ICE_H/2+.02,0);S.penguin.rotation.set(0,0,0);S.penguin.scale.setScalar(1);S.penguin.visible=true}}
function start(mode,n=1){
  state.mode=mode;state.turns=0;state.colorHits=0;state.countRounds=0;state.countLeft=0;state.targetColor=null;state.currentPlayer=0;state.over=false;state.locked=false;state.hintId=null;state.boardRotTarget=0;S.boardRoot.rotation.y=0;makeBoard();rebuildTiles3D();const es=['🐰','🐻','🐼','🦊'];state.players=mode==='friends'?Array.from({length:n},(_,i)=>({e:es[i],name:(i+1)+'번 친구',hits:0})):[];if(mode==='color')newColorTarget();if(mode==='count')state.countLeft=1+Math.floor(Math.random()*3);resetPenguin();hide($('#menu'));show($('#game'));hide($('#result'));renderStatus();setTimeout(()=>speak(mode==='friends'?'첫 번째 친구부터 시작해요.':'얼음을 하나 골라 볼까요?'),180)
}
function animateHammerAt(t,done){
  const p=tileWorld(t),h=S.hammer;h.visible=true;h.position.set(p.x+.45,1.35,p.z+.35);h.rotation.set(.2,0,-1.05);h.userData.anim={t:0,done};
}
function markDrop(t,delay=0){if(!t.mesh)return;t.dropping=true;t.dropT=0;t.dropDelay=delay;t.mesh.visible=true}
function hitTile(t){
  if(state.over||state.locked||!t.alive)return;if(t.q===0&&t.r===0){toast('펭귄이 서 있는 얼음이에요!');speak('펭귄 아래 얼음은 직접 깰 수 없어요.');return}if(state.mode==='color'&&t.color!==state.targetColor){toast(state.targetColor==='blue'?'파란 얼음을 찾아요!':'하얀 얼음을 찾아요!');tone(170,.1,'triangle');return}
  state.locked=true;state.hintId=null;animateHammerAt(t,()=>{sound('hit');hitText('쨍!');setTimeout(()=>breakTile(t),90)});updateHighlights();
}
function breakTile(t){
  t.alive=false;markDrop(t,0);state.turns++;if(state.mode==='friends')state.players[state.currentPlayer].hits++;if(state.mode==='color')state.colorHits++;if(state.mode==='count')state.countLeft--;
  const seen=edgeConnected(),cascaded=[];for(const x of state.tiles)if(x.alive&&!seen.has(x.id)){x.alive=false;cascaded.push(x)}cascaded.forEach((x,i)=>markDrop(x,.05+i*.025));if(cascaded.length){sound('drop');toast('우수수! 얼음 '+cascaded.length+'개가 떨어졌어요')}
  const s=supportState();renderStatus();if(s.doom){failPenguin();return}if(s.count<=5){state.wobbleUntil=performance.now()+700;sound('warn');if(s.count===4)toast('위험해요! 가운데가 많이 비었어요')}setTimeout(advanceMode,360);
}
function advanceMode(){if(state.mode==='solo'&&state.turns>=12){finishSuccess('12번 동안 펭귄을 지켰어요!');return}if(state.mode==='color'){if(state.colorHits>=10){finishSuccess('색깔 미션 10번 성공!');return}newColorTarget()}if(state.mode==='count'&&state.countLeft<=0){state.countRounds++;if(state.countRounds>=6){finishSuccess('수 세기 미션 6번 성공!');return}state.countLeft=1+Math.floor(Math.random()*3);toast('다음 수 세기 미션!')}if(state.mode==='friends')state.currentPlayer=(state.currentPlayer+1)%state.players.length;state.locked=false;renderStatus()}
function splashRipple(){for(let i=0;i<3;i++){const mat=new THREE.MeshBasicMaterial({color:0xd9f8ff,transparent:true,opacity:.7,side:THREE.DoubleSide}),ring=new THREE.Mesh(new THREE.TorusGeometry(.38,.035,8,36),mat);ring.rotation.x=Math.PI/2;ring.position.set(0,-.57,0);ring.scale.setScalar(.7);S.scene.add(ring);S.ripples.push({mesh:ring,t:-i*.16})}}
function failPenguin(){state.over=true;state.locked=true;state.penguinFalling=true;sound('lose');speak('퐁당! 펭귄이 물에 빠졌어요.');setTimeout(()=>{sound('splash');splashRipple();if(state.mode==='friends'){const loser=state.players[state.currentPlayer],survivors=state.players.filter((_,i)=>i!==state.currentPlayer);result('<div class="big">🐧💦</div><h2>'+loser.name+'이 퐁당!</h2><p>'+loser.name+'이 펭귄을 빠뜨렸어요.<br>나머지 친구들은 이번 판 성공!</p>'+survivors.map(p=>'<div class="rank"><span>'+p.e+'</span><span>'+p.name+'</span><strong>통과!</strong></div>').join(''))}else result('<div class="big">🐧💦</div><h2>펭귄이 퐁당!</h2><div class="stars">☆☆☆</div><p>가운데 얼음이 너무 많이 비었어요.<br>바깥쪽 얼음부터 천천히 깨며 다시 도전해 볼까요?</p>')},850)}
function finishSuccess(text){state.over=true;state.locked=true;sound('win');confetti(48);speak('성공! 펭귄을 지켰어요!');result('<div class="big">🏆</div><h2>펭귄을 지켰어요!</h2><div class="stars">⭐⭐⭐</div><p>'+text+'</p>')}
function result(body){$('#resultIn').innerHTML=body+'<button class="primary" id="againBtn">한 번 더!</button><button class="secondary" id="resultHome">처음 화면</button>';show($('#result'));$('#againBtn').onclick=()=>{hide($('#result'));start(state.mode,state.players.length||1)};$('#resultHome').onclick=home}
function home(){state.over=true;state.locked=true;hide($('#game'));hide($('#result'));show($('#menu'));if('speechSynthesis'in window)speechSynthesis.cancel()}
function hint(){if(state.over||state.locked)return;const alive=state.tiles.filter(t=>t.alive&&!(t.q===0&&t.r===0)&&(state.mode!=='color'||t.color===state.targetColor));if(!alive.length)return;alive.sort((a,b)=>{const sa=dist(a)*2+neighbors(a).filter(n=>n.alive).length,sb=dist(b)*2+neighbors(b).filter(n=>n.alive).length;return sb-sa});state.hintId=alive[0].id;updateHighlights();toast('이 얼음은 비교적 안전해 보여요 💡');setTimeout(()=>{state.hintId=null;updateHighlights()},2200)}

function onPointer(e){
  if(state.over||state.locked)return;const r=e.currentTarget.getBoundingClientRect();S.pointer.x=((e.clientX-r.left)/r.width)*2-1;S.pointer.y=-((e.clientY-r.top)/r.height)*2+1;S.raycaster.setFromCamera(S.pointer,S.camera);const hits=S.raycaster.intersectObjects(S.hitMeshes.filter(m=>m.visible),false);const hit=hits.find(h=>state.tiles.find(x=>x.id===h.object.userData.tileId)?.alive);if(!hit)return;const t=state.tiles.find(x=>x.id===hit.object.userData.tileId);if(t)hitTile(t)
}
function loop(now){
  const dt=Math.min(.04,(now-S.last)/1000||.016);S.last=now;S.boardRoot.rotation.y+=(state.boardRotTarget-S.boardRoot.rotation.y)*Math.min(1,dt*5);
  for(const t of state.tiles){if(!t.mesh||!t.dropping)continue;if(t.dropDelay>0){t.dropDelay-=dt;continue}t.dropT+=dt;t.mesh.position.y-=dt*(1.7+t.dropT*5);t.mesh.rotation.x+=dt*1.8;t.mesh.rotation.z+=dt*.9;t.mesh.material.opacity=Math.max(0,.94-t.dropT*.8);if(t.dropT>1.15){t.dropping=false;t.mesh.visible=false}}
  const h=S.hammer,a=h?.userData.anim;if(a){a.t+=dt;const p=Math.min(1,a.t/.32);h.rotation.z=-1.05+Math.sin(p*Math.PI)*1.38;if(p>=1){const done=a.done;h.userData.anim=null;h.visible=false;if(done)done()}}
  if(S.penguin){if(state.penguinFalling){S.penguin.position.y-=dt*2.6;S.penguin.rotation.z+=dt*2.8;S.penguin.scale.multiplyScalar(Math.max(.97,1-dt*.18));if(S.penguin.position.y<-.75)S.penguin.visible=false}else if(now<state.wobbleUntil){S.penguin.rotation.z=Math.sin(now*.035)*.16}else S.penguin.rotation.z*=Math.max(0,1-dt*8)}
  for(let i=S.ripples.length-1;i>=0;i--){const r=S.ripples[i];r.t+=dt;if(r.t<0)continue;r.mesh.scale.setScalar(.7+r.t*3);r.mesh.material.opacity=Math.max(0,.7-r.t*.75);if(r.t>1){S.scene.remove(r.mesh);S.ripples.splice(i,1)}}
  S.renderer.render(S.scene,S.camera);requestAnimationFrame(loop)
}

function wireUI(){
  $$('.mode').forEach(b=>b.onclick=()=>b.dataset.mode==='friends'?show($('#setup')):start(b.dataset.mode));
  $$('#playerChoice button').forEach(b=>b.onclick=()=>{$$('#playerChoice button').forEach(x=>x.classList.remove('on'));b.classList.add('on')});
  $('#startFriends').onclick=()=>{const n=Number($('#playerChoice .on').dataset.n);hide($('#setup'));start('friends',n)};$('#cancelSetup').onclick=()=>hide($('#setup'));
  $('#homeBtn').onclick=home;$('#restartBtn').onclick=()=>start(state.mode,state.players.length||1);$('#rotateViewBtn').onclick=()=>{state.boardRotTarget+=Math.PI/3;tone(390,.05,'sine',0,.02)};
  $('#rulesBtn').onclick=()=>show($('#rules'));$('#closeRules').onclick=()=>hide($('#rules'));$('#hintBtn').onclick=hint;
  function toggleSound(){state.sound=!state.sound;$('#soundBtn').textContent=state.sound?'🎵 소리 켜짐':'🔇 소리 꺼짐';$('#soundGameBtn').textContent=state.sound?'🎵 소리':'🔇 소리'}$('#soundBtn').onclick=toggleSound;$('#soundGameBtn').onclick=toggleSound;
  $('#voiceBtn').onclick=()=>{state.voice=!state.voice;$('#voiceBtn').textContent=state.voice?'🔊 읽어주기 켜짐':'🔇 읽어주기 꺼짐';if(!state.voice&&'speechSynthesis'in window)speechSynthesis.cancel()}
}
async function boot(){wireUI();init3D();const model=await loadPenguin();S.penguin=model||makeToyPenguin();S.penguinRoot.add(S.penguin);$('#assetState').textContent=model?'3D 펭귄 에셋 연결됨':'장난감형 펭귄 말 사용 중';makeBoard();rebuildTiles3D();resetPenguin();renderStatus();hide($('#loading'))}
boot().catch(err=>{console.error(err);$('#loadingText').textContent='3D 얼음판을 준비하지 못했어요. 새로고침해 주세요.'});

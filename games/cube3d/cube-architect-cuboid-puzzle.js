(()=>{
'use strict';

const ROOT_ID='cuboidPuzzleMode';
const SEEN_KEY='cubeArchitectCuboidPuzzleSeen_v1';
const WORLD_DOWN=new THREE.Vector3(0,-1,0);
const BEAM_LENGTH=7.2;
const SHAPES={
  L:[[-1.35,.95],[-.7,.95],[0,.95],[.7,.95],[.7,.35],[.7,-.3],[.7,-.95]],
  U:[[-1.25,.95],[-1.25,.35],[-1.25,-.25],[-.65,-.85],[0,-.85],[.65,-.85],[1.25,-.25],[1.25,.35],[1.25,.95]]
};
const FACE_NORMALS={
  '+z':[0,0,1],'-z':[0,0,-1],
  '+x':[1,0,0],'-x':[-1,0,0],
  '+y':[0,1,0],'-y':[0,-1,0]
};
const COMMANDS={
  forward:{axis:[1,0,0],dir:1,label:'앞으로'},
  back:{axis:[1,0,0],dir:-1,label:'뒤로'},
  left:{axis:[0,0,1],dir:1,label:'왼쪽'},
  right:{axis:[0,0,1],dir:-1,label:'오른쪽'}
};
const LEVELS=[
  {
    title:'1 · ㄱ자 홈',
    subtitle:'한 번 굴려 장치를 움직여 보세요.',
    size:[4.8,3.6,4.1],par:1,
    hint:'레이저 장치가 홈의 가로 부분을 따라 움직이려면, 직육면체를 오른쪽으로 굴려 보세요.',
    solution:['right'],
    emitters:[{face:'+z',shape:'L',start:0,color:0x56d9ff}]
  },
  {
    title:'2 · ㄷ자 홈',
    subtitle:'모서리를 돌아 끝까지 보내 보세요.',
    size:[5.0,3.8,4.2],par:2,
    hint:'ㄷ자 홈은 한 번 굴려서는 끝까지 가지 않아요. 같은 방향으로 한 번 더 굴리면 중력 방향이 다시 바뀝니다.',
    solution:['right','right'],
    emitters:[{face:'+z',shape:'U',start:4,color:0x7fffb3}]
  },
  {
    title:'3 · 두 면을 함께',
    subtitle:'앞면과 옆면의 장치를 동시에 생각해 보세요.',
    size:[5.2,3.8,4.4],par:3,
    hint:'앞면 장치만 보지 말고 오른쪽 면의 ㄱ자 홈도 함께 살펴보세요. 서로 다른 면은 같은 중력을 다르게 느껴요.',
    solution:['right','forward','left'],
    emitters:[
      {face:'+z',shape:'U',start:4,color:0x62d7ff},
      {face:'+x',shape:'L',start:3,color:0xffd166}
    ]
  },
  {
    title:'4 · 세 방향 중력',
    subtitle:'세 장치의 움직임을 한꺼번에 예측해 보세요.',
    size:[5.4,4.0,4.6],par:4,
    hint:'먼저 앞뒤로 굴려 세로 방향 중력을 만들고, 그다음 좌우 굴리기를 섞어 보세요.',
    solution:['forward','right','back','right'],
    emitters:[
      {face:'+z',shape:'U',start:4,color:0x67e8f9},
      {face:'+x',shape:'L',start:2,color:0xfbbf24},
      {face:'-x',shape:'U',start:2,color:0xc084fc}
    ]
  },
  {
    title:'5 · 빛의 왕관',
    subtitle:'네 면의 레이저를 모두 켜 보세요.',
    size:[5.6,4.1,4.7],par:5,
    hint:'한 장치를 맞췄다고 멈추지 마세요. 다음 굴리기에서 다른 홈의 장치가 어디로 미끄러질지 먼저 떠올려 보세요.',
    solution:['right','forward','left','forward','right'],
    emitters:[
      {face:'+z',shape:'U',start:4,color:0x38bdf8},
      {face:'-z',shape:'L',start:0,color:0x34d399},
      {face:'+x',shape:'U',start:0,color:0xfbbf24},
      {face:'-x',shape:'L',start:0,color:0xf472b6}
    ]
  }
];

let root=null,canvas=null,renderer=null,scene=null,camera=null,cubeGroup=null;
let active=false,raf=0,last=0,levelIndex=0,moves=0,busy=false,solved=false;
let orientation=new THREE.Quaternion(),rotateAnim=null;
let emitters=[],receivers=[];
let view={yaw:-.72,pitch:.43,dist:11.6};
let drag=null,audioCtx=null,resizeBound=false;

function el(id){return document.getElementById(id)}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function vec(a){return new THREE.Vector3(a[0],a[1],a[2])}
function normalFor(face){return vec(FACE_NORMALS[face])}

function facePoint(face,u,v,size,offset=.055){
  const w=size[0],h=size[1],d=size[2];
  if(face==='+z')return new THREE.Vector3(u,v,d/2+offset);
  if(face==='-z')return new THREE.Vector3(-u,v,-d/2-offset);
  if(face==='+x')return new THREE.Vector3(w/2+offset,v,-u);
  if(face==='-x')return new THREE.Vector3(-w/2-offset,v,u);
  if(face==='+y')return new THREE.Vector3(u,h/2+offset,-v);
  return new THREE.Vector3(u,-h/2-offset,v);
}
function trackFor(cfg,size){
  return SHAPES[cfg.shape].map(function(p){return facePoint(cfg.face,p[0],p[1],size)});
}
function commandQuat(cmd){
  const c=COMMANDS[cmd],q=new THREE.Quaternion();
  q.setFromAxisAngle(vec(c.axis),c.dir*Math.PI/2);
  return q;
}
function gravityLocal(q){
  return WORLD_DOWN.clone().applyQuaternion(q.clone().invert()).normalize();
}
function settleRoute(track,start,q){
  const g=gravityLocal(q),route=[start];
  let index=start,guard=0;
  while(guard++<24){
    const cur=track[index];
    let best=index,bestScore=1e-5;
    [index-1,index+1].forEach(function(next){
      if(next<0||next>=track.length)return;
      const score=track[next].clone().sub(cur).dot(g);
      if(score>bestScore){bestScore=score;best=next}
    });
    if(best===index)break;
    index=best;route.push(index);
  }
  return route;
}
function simulateGoal(level){
  let q=new THREE.Quaternion();
  const tracks=level.emitters.map(function(cfg){return trackFor(cfg,level.size)});
  const indices=level.emitters.map(function(cfg){return cfg.start});
  level.solution.forEach(function(cmd){
    q.premultiply(commandQuat(cmd)).normalize();
    tracks.forEach(function(track,i){
      const route=settleRoute(track,indices[i],q);
      indices[i]=route[route.length-1];
    });
  });
  return level.emitters.map(function(cfg,i){
    const p=tracks[i][indices[i]].clone().applyQuaternion(q);
    const dir=normalFor(cfg.face).applyQuaternion(q).normalize();
    return {position:p,direction:dir,index:indices[i]};
  });
}

function sfx(kind){
  try{
    if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();
    if(audioCtx.state==='suspended')audioCtx.resume();
    const t=audioCtx.currentTime,o=audioCtx.createOscillator(),g=audioCtx.createGain();
    o.connect(g);g.connect(audioCtx.destination);
    if(kind==='roll'){o.type='triangle';o.frequency.setValueAtTime(180,t);o.frequency.exponentialRampToValueAtTime(110,t+.18)}
    else if(kind==='slide'){o.type='sine';o.frequency.setValueAtTime(420,t);o.frequency.exponentialRampToValueAtTime(260,t+.14)}
    else if(kind==='light'){o.type='sine';o.frequency.setValueAtTime(680,t);o.frequency.setValueAtTime(920,t+.08)}
    else{o.type='sine';o.frequency.setValueAtTime(520,t);o.frequency.setValueAtTime(760,t+.08);o.frequency.setValueAtTime(1040,t+.16)}
    g.gain.setValueAtTime(.045,t);g.gain.exponentialRampToValueAtTime(.0001,t+(kind==='solve'?.3:.2));
    o.start(t);o.stop(t+(kind==='solve'?.32:.22));
  }catch(_){}
}

function createRoot(){
  if(root)return;
  root=document.createElement('section');
  root.id=ROOT_ID;
  root.className='ca-cp-root hidden';
  root.innerHTML=[
    '<canvas id="cuboidPuzzleCanvas" class="ca-cp-canvas" aria-label="직육면체 중력 레이저 퍼즐"></canvas>',
    '<header class="ca-cp-top">',
      '<button id="cuboidPuzzleHome" class="ca-cp-icon" type="button" aria-label="큐브 아키텍트 시작 화면">⌂</button>',
      '<div class="ca-cp-heading"><b>직육면체 퍼즐</b><small>굴리면 중력이 바뀌고, 레이저 장치가 홈을 따라 움직여요.</small></div>',
      '<div class="ca-cp-stats">',
        '<span><small>단계</small><b id="cuboidPuzzleStage">1 / 5</b></span>',
        '<span><small>굴린 횟수</small><b id="cuboidPuzzleMoves">0</b></span>',
        '<span><small>목표</small><b id="cuboidPuzzlePar">1회</b></span>',
      '</div>',
    '</header>',
    '<aside class="ca-cp-guide">',
      '<div class="ca-cp-kicker">5학년 수학 · 직육면체</div>',
      '<h2 id="cuboidPuzzleTitle">ㄱ자 홈</h2>',
      '<p id="cuboidPuzzleSubtitle"></p>',
      '<div class="ca-cp-light-row"><span>켜진 표적</span><b id="cuboidPuzzleLights">0 / 1</b></div>',
      '<div class="ca-cp-light-meter"><i id="cuboidPuzzleLightFill"></i></div>',
      '<div id="cuboidPuzzleMessage" class="ca-cp-message">화살표를 눌러 직육면체를 굴려 보세요.</div>',
      '<div class="ca-cp-guide-actions">',
        '<button id="cuboidPuzzleHint" type="button">힌트</button>',
        '<button id="cuboidPuzzleReset" type="button">처음 상태</button>',
      '</div>',
    '</aside>',
    '<div class="ca-cp-turnpad" aria-label="직육면체 굴리기">',
      '<button class="ca-cp-turn ca-cp-up" data-cuboid-turn="forward" type="button"><b>↑</b><small>앞으로</small></button>',
      '<button class="ca-cp-turn ca-cp-left" data-cuboid-turn="left" type="button"><b>←</b><small>왼쪽</small></button>',
      '<div class="ca-cp-turn-center">90°<small>씩 굴리기</small></div>',
      '<button class="ca-cp-turn ca-cp-right" data-cuboid-turn="right" type="button"><b>→</b><small>오른쪽</small></button>',
      '<button class="ca-cp-turn ca-cp-down" data-cuboid-turn="back" type="button"><b>↓</b><small>뒤로</small></button>',
    '</div>',
    '<div class="ca-cp-viewtip">화면 드래그 · 둘러보기 <span>│</span> 화살표/WASD · 직육면체 굴리기 <span>│</span> R · 처음 상태</div>',
    '<section id="cuboidPuzzleResult" class="ca-cp-result hidden" role="dialog" aria-live="polite">',
      '<div class="ca-cp-result-card">',
        '<div class="ca-cp-result-icon">✦</div>',
        '<h2 id="cuboidPuzzleResultTitle">모든 빛이 연결됐어요!</h2>',
        '<p id="cuboidPuzzleResultText"></p>',
        '<div class="ca-cp-result-actions"><button id="cuboidPuzzleRetry" type="button">다시 해보기</button><button id="cuboidPuzzleNext" type="button">다음 단계</button></div>',
      '</div>',
    '</section>',
    '<section id="cuboidPuzzleHelp" class="ca-cp-help hidden" role="dialog" aria-live="polite">',
      '<div class="ca-cp-help-card">',
        '<div class="ca-cp-help-icon">💡</div>',
        '<h2>빛을 모두 연결해 보자!</h2>',
        '<p><b>1.</b> 직육면체를 90°씩 굴려요.<br><b>2.</b> 레이저 장치는 중력 때문에 ㄱ자·ㄷ자 홈 안에서 미끄러져요.<br><b>3.</b> 모든 레이저가 빛 표적에 닿으면 성공!</p>',
        '<button id="cuboidPuzzleStart" type="button">시작하기</button>',
      '</div>',
    '</section>'
  ].join('');
  (el('app')||document.body).appendChild(root);
  canvas=el('cuboidPuzzleCanvas');
  renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;

  el('cuboidPuzzleHome').addEventListener('click',exit);
  el('cuboidPuzzleReset').addEventListener('click',function(){startLevel(levelIndex)});
  el('cuboidPuzzleRetry').addEventListener('click',function(){startLevel(levelIndex)});
  el('cuboidPuzzleNext').addEventListener('click',function(){
    if(levelIndex>=LEVELS.length-1)startLevel(0);
    else startLevel(levelIndex+1);
  });
  el('cuboidPuzzleHint').addEventListener('click',showHint);
  el('cuboidPuzzleStart').addEventListener('click',function(){
    el('cuboidPuzzleHelp').classList.add('hidden');
    try{localStorage.setItem(SEEN_KEY,'1')}catch(_){}
  });
  root.querySelectorAll('[data-cuboid-turn]').forEach(function(btn){
    btn.addEventListener('click',function(){turn(btn.dataset.cuboidTurn)});
  });

  canvas.addEventListener('pointerdown',function(e){
    drag={id:e.pointerId,x:e.clientX,y:e.clientY,yaw:view.yaw,pitch:view.pitch};
    canvas.setPointerCapture?.(e.pointerId);
  });
  canvas.addEventListener('pointermove',function(e){
    if(!drag||drag.id!==e.pointerId)return;
    const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    view.yaw=drag.yaw-dx*.0065;
    view.pitch=clamp(drag.pitch+dy*.0055,.08,1.22);
    updateCamera();
  });
  function endDrag(e){if(drag&&drag.id===e.pointerId)drag=null}
  canvas.addEventListener('pointerup',endDrag);
  canvas.addEventListener('pointercancel',endDrag);
  canvas.addEventListener('wheel',function(e){
    e.preventDefault();
    view.dist=clamp(view.dist*(e.deltaY>0?1.08:.92),7.2,16);
    updateCamera();
  },{passive:false});
  window.addEventListener('keydown',onKey,{passive:false});
  if(!resizeBound){window.addEventListener('resize',resize);resizeBound=true}
}

function onKey(e){
  if(!active)return;
  const key=e.key.toLowerCase();
  let cmd='';
  if(key==='arrowup'||key==='w')cmd='forward';
  else if(key==='arrowdown'||key==='s')cmd='back';
  else if(key==='arrowleft'||key==='a')cmd='left';
  else if(key==='arrowright'||key==='d')cmd='right';
  else if(key==='r'){e.preventDefault();startLevel(levelIndex);return}
  else if(key==='h'){e.preventDefault();showHint();return}
  if(cmd){e.preventDefault();turn(cmd)}
}

function resize(){
  if(!renderer||!canvas)return;
  const w=Math.max(1,root.clientWidth||innerWidth),h=Math.max(1,root.clientHeight||innerHeight);
  renderer.setSize(w,h,false);
  if(camera){camera.aspect=w/h;camera.updateProjectionMatrix()}
}
function updateCamera(){
  if(!camera)return;
  const cp=Math.cos(view.pitch),sp=Math.sin(view.pitch);
  camera.position.set(
    Math.sin(view.yaw)*cp*view.dist,
    sp*view.dist+1.0,
    Math.cos(view.yaw)*cp*view.dist
  );
  camera.lookAt(0,0,0);
}
function addBaseScene(){
  scene=new THREE.Scene();
  scene.background=new THREE.Color(0x07111f);
  scene.fog=new THREE.Fog(0x07111f,16,38);
  camera=new THREE.PerspectiveCamera(48,1,.05,80);
  updateCamera();

  const hemi=new THREE.HemisphereLight(0xbde7ff,0x1a2130,1.6);scene.add(hemi);
  const key=new THREE.DirectionalLight(0xffffff,2.1);key.position.set(7,11,8);key.castShadow=true;key.shadow.mapSize.set(1024,1024);scene.add(key);
  const rim=new THREE.PointLight(0x4cc9ff,26,18,2);rim.position.set(-7,4,-6);scene.add(rim);
  const warm=new THREE.PointLight(0xffc857,18,16,2);warm.position.set(6,-2,7);scene.add(warm);

  const floor=new THREE.Mesh(new THREE.CircleGeometry(11,64),new THREE.MeshStandardMaterial({color:0x0d1c2c,roughness:.88,metalness:.08}));
  floor.rotation.x=-Math.PI/2;floor.position.y=-4.2;floor.receiveShadow=true;scene.add(floor);
  const grid=new THREE.GridHelper(20,20,0x284861,0x162a3e);grid.position.y=-4.18;scene.add(grid);

  const starGeo=new THREE.BufferGeometry();
  const stars=[];
  for(let i=0;i<180;i++){
    const a=Math.random()*Math.PI*2,r=10+Math.random()*20,y=-1+Math.random()*15;
    stars.push(Math.cos(a)*r,y,Math.sin(a)*r);
  }
  starGeo.setAttribute('position',new THREE.Float32BufferAttribute(stars,3));
  const starMat=new THREE.PointsMaterial({color:0x8ecfff,size:.05,transparent:true,opacity:.7});
  scene.add(new THREE.Points(starGeo,starMat));
}

function makeCuboid(level){
  cubeGroup=new THREE.Group();scene.add(cubeGroup);
  const size=level.size;
  const faceColors=[0x1c3448,0x172c3f,0x24445a,0x132639,0x1f3b50,0x192f43];
  const mats=faceColors.map(function(c){return new THREE.MeshStandardMaterial({color:c,metalness:.55,roughness:.46})});
  const body=new THREE.Mesh(new THREE.BoxGeometry(size[0],size[1],size[2]),mats);
  body.castShadow=true;body.receiveShadow=true;cubeGroup.add(body);
  const edges=new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(size[0]+.025,size[1]+.025,size[2]+.025)),
    new THREE.LineBasicMaterial({color:0x76e4ff,transparent:true,opacity:.72})
  );
  cubeGroup.add(edges);

  const cornerMat=new THREE.MeshStandardMaterial({color:0x6bdcff,emissive:0x0b7d9c,emissiveIntensity:.65,metalness:.6,roughness:.32});
  const corners=[
    [-1,-1,-1],[-1,-1,1],[-1,1,-1],[-1,1,1],[1,-1,-1],[1,-1,1],[1,1,-1],[1,1,1]
  ];
  corners.forEach(function(s){
    const m=new THREE.Mesh(new THREE.SphereGeometry(.085,10,8),cornerMat);
    m.position.set(s[0]*size[0]/2,s[1]*size[1]/2,s[2]*size[2]/2);cubeGroup.add(m);
  });
}

function addTrack(track,color){
  const grooveMat=new THREE.MeshStandardMaterial({color:0x05090e,metalness:.72,roughness:.42});
  const glowMat=new THREE.MeshStandardMaterial({color:color,emissive:color,emissiveIntensity:.28,metalness:.25,roughness:.35});
  for(let i=0;i<track.length-1;i++){
    addSegment(track[i],track[i+1],.105,grooveMat);
    addSegment(track[i],track[i+1],.032,glowMat);
  }
  track.forEach(function(p){
    const node=new THREE.Mesh(new THREE.SphereGeometry(.115,12,10),grooveMat);node.position.copy(p);cubeGroup.add(node);
    const dot=new THREE.Mesh(new THREE.SphereGeometry(.037,9,7),glowMat);dot.position.copy(p);cubeGroup.add(dot);
  });
}
function addSegment(a,b,r,material){
  const d=b.clone().sub(a),len=d.length();
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,len,10),material);
  mesh.position.copy(a).add(b).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize());
  cubeGroup.add(mesh);return mesh;
}
function makeEmitter(cfg,track){
  addTrack(track,cfg.color);
  const normal=normalFor(cfg.face);
  const g=new THREE.Group();
  const shell=new THREE.Mesh(
    new THREE.SphereGeometry(.22,18,14),
    new THREE.MeshStandardMaterial({color:0xeaf8ff,metalness:.75,roughness:.2,emissive:cfg.color,emissiveIntensity:.42})
  );
  shell.castShadow=true;g.add(shell);
  const lens=new THREE.Mesh(
    new THREE.SphereGeometry(.105,14,10),
    new THREE.MeshStandardMaterial({color:cfg.color,emissive:cfg.color,emissiveIntensity:2.2,roughness:.18})
  );
  lens.position.copy(normal).multiplyScalar(.12);g.add(lens);
  g.position.copy(track[cfg.start]);cubeGroup.add(g);

  const beamMat=new THREE.MeshBasicMaterial({color:cfg.color,transparent:true,opacity:.55,depthWrite:false,blending:THREE.AdditiveBlending});
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(.035,.055,BEAM_LENGTH,10,1,true),beamMat);
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),normal);
  cubeGroup.add(beam);

  const e={cfg:cfg,track:track,index:cfg.start,mesh:g,beam:beam,normal:normal,slide:null,wasHit:false};
  updateEmitterVisual(e);
  return e;
}
function updateEmitterVisual(e){
  const p=e.mesh.position;
  e.beam.position.copy(p).addScaledVector(e.normal,BEAM_LENGTH/2+.12);
}
function makeReceiver(goal,color,index){
  const pos=goal.position.clone().addScaledVector(goal.direction,BEAM_LENGTH-.45);
  const g=new THREE.Group();g.position.copy(pos);
  g.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),goal.direction.clone().normalize());
  const ringMat=new THREE.MeshStandardMaterial({color:0x33465c,metalness:.75,roughness:.3,emissive:0x07111f,emissiveIntensity:.2});
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.38,.09,12,30),ringMat);g.add(ring);
  const coreMat=new THREE.MeshStandardMaterial({color:0x13283d,emissive:0x07111f,emissiveIntensity:.2,roughness:.35});
  const core=new THREE.Mesh(new THREE.CircleGeometry(.25,28),coreMat);core.position.z=.012;g.add(core);
  const halo=new THREE.Mesh(new THREE.RingGeometry(.46,.58,32),new THREE.MeshBasicMaterial({color:color,transparent:true,opacity:.1,side:THREE.DoubleSide,depthWrite:false}));
  halo.position.z=-.01;g.add(halo);
  scene.add(g);
  return {group:g,ring:ring,core:core,halo:halo,position:pos,color:color,index:index,hit:false};
}

function startLevel(index){
  levelIndex=(index+LEVELS.length)%LEVELS.length;
  moves=0;busy=false;solved=false;rotateAnim=null;orientation.identity();emitters=[];receivers=[];
  addBaseScene();
  const level=LEVELS[levelIndex];
  makeCuboid(level);
  cubeGroup.quaternion.copy(orientation);

  level.emitters.forEach(function(cfg){
    const track=trackFor(cfg,level.size);
    emitters.push(makeEmitter(cfg,track));
  });
  const goals=simulateGoal(level);
  goals.forEach(function(goal,i){receivers.push(makeReceiver(goal,level.emitters[i].color,i))});

  el('cuboidPuzzleStage').textContent=(levelIndex+1)+' / '+LEVELS.length;
  el('cuboidPuzzleMoves').textContent='0';
  el('cuboidPuzzlePar').textContent=level.par+'회';
  el('cuboidPuzzleTitle').textContent=level.title;
  el('cuboidPuzzleSubtitle').textContent=level.subtitle;
  el('cuboidPuzzleMessage').textContent='직육면체를 굴리면 중력이 바뀌어요. 홈 속 장치의 다음 위치를 예상해 보세요.';
  el('cuboidPuzzleResult').classList.add('hidden');
  el('cuboidPuzzleNext').textContent=levelIndex===LEVELS.length-1?'처음부터':'다음 단계';
  updateHits(true);
  resize();updateCamera();
}
function showHint(){
  const level=LEVELS[levelIndex];
  el('cuboidPuzzleMessage').textContent='힌트 · '+level.hint;
  sfx('light');
}

function turn(cmd){
  if(!active||busy||solved||!COMMANDS[cmd])return;
  busy=true;moves++;
  el('cuboidPuzzleMoves').textContent=String(moves);
  el('cuboidPuzzleMessage').textContent=COMMANDS[cmd].label+'으로 90° 굴리는 중… 장치가 어디로 미끄러질까요?';
  const from=orientation.clone();
  const to=orientation.clone().premultiply(commandQuat(cmd)).normalize();
  rotateAnim={from:from,to:to,t:0,duration:.42};
  sfx('roll');
}
function beginSlides(){
  let any=false;
  emitters.forEach(function(e){
    const route=settleRoute(e.track,e.index,orientation);
    const queue=route.slice(1);
    if(queue.length){
      any=true;
      e.slide={queue:queue,from:e.mesh.position.clone(),to:e.track[queue[0]].clone(),t:0,duration:.15};
    }else e.slide=null;
  });
  if(any)sfx('slide');
  else finishTurn();
}
function updateSlides(dt){
  let any=false;
  emitters.forEach(function(e){
    const s=e.slide;if(!s)return;
    any=true;s.t+=dt;
    const k=clamp(s.t/s.duration,0,1);
    const smooth=k*k*(3-2*k);
    e.mesh.position.lerpVectors(s.from,s.to,smooth);updateEmitterVisual(e);
    if(k>=1){
      e.index=s.queue.shift();
      e.mesh.position.copy(e.track[e.index]);updateEmitterVisual(e);
      if(s.queue.length){
        s.from=e.mesh.position.clone();s.to=e.track[s.queue[0]].clone();s.t=0;
      }else e.slide=null;
    }
  });
  if(any&&!emitters.some(function(e){return !!e.slide}))finishTurn();
}
function finishTurn(){
  busy=false;
  const lit=updateHits(false);
  if(!solved)el('cuboidPuzzleMessage').textContent=lit?lit+'개의 표적이 켜졌어요. 나머지 레이저도 맞춰 보세요.':'아직 빛이 맞지 않아요. 홈의 낮은 쪽으로 장치가 움직인 모습을 살펴보세요.';
}

function emitterPose(e){
  const p=e.mesh.position.clone();
  cubeGroup.localToWorld(p);
  const dir=e.normal.clone().applyQuaternion(cubeGroup.quaternion).normalize();
  return {position:p,direction:dir};
}
function updateHits(initial){
  let lit=0;
  emitters.forEach(function(e,i){
    const pose=emitterPose(e),receiver=receivers[i];
    const to=receiver.position.clone().sub(pose.position);
    const forward=to.dot(pose.direction);
    const side=to.clone().addScaledVector(pose.direction,-forward).length();
    const hit=forward>.4&&side<.19;
    receiver.hit=hit;
    e.beam.material.opacity=hit?.95:.46;
    receiver.ring.material.color.setHex(hit?e.cfg.color:0x33465c);
    receiver.ring.material.emissive.setHex(hit?e.cfg.color:0x07111f);
    receiver.ring.material.emissiveIntensity=hit?1.5:.2;
    receiver.core.material.color.setHex(hit?0xeaffff:0x13283d);
    receiver.core.material.emissive.setHex(hit?e.cfg.color:0x07111f);
    receiver.core.material.emissiveIntensity=hit?2.4:.2;
    receiver.halo.material.opacity=hit?.48:.1;
    if(hit)lit++;
    if(hit&&!e.wasHit&&!initial)sfx('light');
    e.wasHit=hit;
  });
  el('cuboidPuzzleLights').textContent=lit+' / '+emitters.length;
  el('cuboidPuzzleLightFill').style.width=(emitters.length?lit/emitters.length*100:0)+'%';
  if(!initial&&lit===emitters.length&&!solved&&!busy)completeLevel();
  return lit;
}
function completeLevel(){
  solved=true;sfx('solve');
  const level=LEVELS[levelIndex],diff=moves-level.par;
  let grade='';
  if(diff<=0)grade='목표 횟수로 해결했어요!';
  else if(diff<=2)grade='아주 가까운 횟수로 해결했어요!';
  else grade='끝까지 공간을 돌려 보며 해결했어요!';
  el('cuboidPuzzleResultTitle').textContent='모든 빛이 연결됐어요!';
  el('cuboidPuzzleResultText').textContent=grade+' · '+moves+'번 굴림';
  el('cuboidPuzzleResult').classList.remove('hidden');
  el('cuboidPuzzleMessage').textContent='성공! 모든 레이저가 빛 표적에 닿았어요.';
}

function animate(now){
  if(!active)return;
  const dt=Math.min(.05,Math.max(0,(now-last)/1000||0));last=now;
  if(rotateAnim){
    rotateAnim.t+=dt;
    const k=clamp(rotateAnim.t/rotateAnim.duration,0,1);
    const smooth=k*k*(3-2*k);
    cubeGroup.quaternion.copy(rotateAnim.from).slerp(rotateAnim.to,smooth);
    if(k>=1){
      orientation.copy(rotateAnim.to).normalize();
      cubeGroup.quaternion.copy(orientation);
      rotateAnim=null;beginSlides();
    }
  }else if(busy){
    updateSlides(dt);
  }
  receivers.forEach(function(r,i){
    if(!r.hit)return;
    const pulse=1+Math.sin(now*.006+i)*.045;
    r.group.scale.setScalar(pulse);
  });
  renderer.render(scene,camera);
  raf=requestAnimationFrame(animate);
}

function enter(){
  if(typeof THREE==='undefined')throw new Error('3D 엔진을 불러오지 못했어요.');
  createRoot();
  el('homeScreen')?.classList.add('hidden');
  el('topbar')?.classList.add('hidden');
  root.classList.remove('hidden');
  document.body.classList.add('cuboid-puzzle-active');
  active=true;last=performance.now();
  startLevel(0);
  let seen=false;try{seen=localStorage.getItem(SEEN_KEY)==='1'}catch(_){}
  el('cuboidPuzzleHelp').classList.toggle('hidden',seen);
  cancelAnimationFrame(raf);raf=requestAnimationFrame(animate);
}
function exit(){
  active=false;busy=false;solved=false;cancelAnimationFrame(raf);
  if(root)root.classList.add('hidden');
  document.body.classList.remove('cuboid-puzzle-active');
  el('homeScreen')?.classList.remove('hidden');
}

window.CubeArchitectCuboidPuzzle={enter:enter,exit:exit,LEVELS:LEVELS,simulateGoal:simulateGoal};
})();
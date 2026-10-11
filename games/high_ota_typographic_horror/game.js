import * as THREE from 'three';

const R = window.OtaRules;
const C3 = window.OtaChapter3;
const G = window.OtaGuide;
const X = window.OtaCorrector;
const L = window.OtaLiteracy;
if (!R || !C3 || !G || !X || !L) throw new Error('Ota chapter or guidance rules are missing');
const el = id => document.getElementById(id);
const canvas = el('scene');
const hud = { objective:el('objective'), stage:el('stage'), prompt:el('prompt'),
  message:el('message'), danger:el('danger'), noise:el('static'), action:el('action'),
  echo:el('echoWarning'), echoFill:el('echoFill'), echoText:el('echoText'),
  gaze:el('gazeWarning'), gazeFill:el('gazeFill'), gazeText:el('gazeText'),
  clue:el('clueStatus'), records:el('recordStatus'),help:el('help'),hintBox:el('hintBox'),
  corrector:el('correctorWarning'),correctorText:el('correctorText'),
  literacy:el('literacyStatus'),pollution:el('pollutionFill') };
const overlays = { intro:el('intro'), fix:el('fixPanel'), correction:el('correctionPanel'), ending:el('ending') };
const state = R.initialState();
const literacy=L.create();state.literacy=literacy;
const literacyMeshes=new Map();let activeCorrection=null;
const repairEffects=[];
let apparitionAnchor=null,apparitionNumber=-1;
const corrector=X.create();
let soundPulse=0, lastCorrectorSound=0;
const player = { x:0, z:4.8, yaw:0, pitch:0, moving:false };
const keys = new Set();
let started = false, muted = false, failed = false, elapsed = 0, lastFrame = 0;
let messageEnd = 0, stepsUntil = 0, monsterReveal = false, lookPointer = null;
let joystickPointer = null, joystick = { x:0, y:0 }, mobileRun = false;
let corridorMesh, corridorWord, doorMesh, doorWord, personWord, monsterWord, enemyGroup;
const correctorGlyphs=[];
let echoMark, echoWasActive=false; const shiftingWords=[];
let currentInteraction = null;
const chapterVisual = {officeSeal:null,officeWord:null,finalSeal:null,finalWord:null,
  watcher:null,watcherText:null,officeRecord:null,archiveRecord:null,glimpseLetters:[],
  anomaly:null,anomalyChanged:false};
const CHECKPOINT_KEY='kidscade-ota-v3-checkpoint';
let lastGazeAwake=false,lastGlimpses=0;
let hintScope='',hintLevel=0,hintScopeSince=0,hintVisibleUntil=0;
const touchDevice = matchMedia('(pointer:coarse)').matches;
let audioCtx = null;

const renderer = new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, touchDevice ? 1.4 : 1.75));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.setClearColor(0x000000);
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.FogExp2(0x000000, .024);
const camera = new THREE.PerspectiveCamera(75, 1, .08, 65);
camera.rotation.order = 'YXZ';

const textMaterials = new Map();
const unitPlane = new THREE.PlaneGeometry(1, 1);
// Black-on-black surfaces preserve collision and occlusion without visible borders.
// There is no starfield: only names floating in what feels like endless darkness.
const wallMat = new THREE.MeshBasicMaterial({color:0x000000});
const floorMat = new THREE.MeshBasicMaterial({color:0x000000});
const propMat = new THREE.MeshBasicMaterial({color:0x030204});
const warnMat = new THREE.MeshBasicMaterial({color:0x0e0206});

function material(word, color) {
  const key = word + '|' + color;
  if (textMaterials.has(key)) return textMaterials.get(key);
  const c = document.createElement('canvas'); c.width = 512; c.height = 200;
  const cx = c.getContext('2d');
  cx.clearRect(0,0,c.width,c.height);
  cx.textAlign = 'center'; cx.textBaseline = 'middle';
  let fontSize = 126;
  cx.font = '900 ' + fontSize + 'px "Noto Sans CJK KR","Noto Sans KR","NanumGothic","Malgun Gothic",sans-serif';
  const measured = cx.measureText(word).width;
  if (measured > 478) fontSize *= 478 / measured;
  cx.font = '900 ' + fontSize + 'px "Noto Sans CJK KR","Noto Sans KR","NanumGothic","Malgun Gothic",sans-serif';
  cx.fillStyle = color; cx.fillText(word, 256, 102);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  const mat = new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.DoubleSide,
    depthWrite:false,alphaTest:.07, fog:true, toneMapped:false});
  textMaterials.set(key, mat);
  return mat;
}
function label(word, color, x,y,z, rx=0,ry=0, w=1,h=.55) {
  const mesh = new THREE.Mesh(unitPlane,material(word,color));
  mesh.position.set(x,y,z); mesh.rotation.set(rx,ry,0); mesh.scale.set(w,h,1);
  mesh.renderOrder = 1;
  scene.add(mesh); return mesh;
}
// A few words are intermittently overwritten by something unseen.
const hauntedWords = [];
function hauntedLabel(word, color, altered, x,y,z, rx=0,ry=0,w=1,h=.55) {
  const mesh = label(word,color,x,y,z,rx,ry,w,h);
  const ghost = new THREE.Mesh(unitPlane,material(altered,'#ff3654'));
  ghost.position.copy(mesh.position);
  ghost.rotation.copy(mesh.rotation);
  ghost.scale.copy(mesh.scale);
  ghost.translateZ(.025);
  ghost.renderOrder = 2;
  ghost.visible = false;
  scene.add(ghost);
  hauntedWords.push({mesh,ghost,word,color,altered,x,y,z});
  return mesh;
}
function updateHauntedWords(time,threat,finalEscape=false) {
  hauntedWords.forEach((entry,i) => {
    // Short asynchronous bursts, like damaged text being rewritten in place.
    // Glitches propagate through nearby names when the unseen corrector passes.
    const proximity=threat?Math.max(0,1-Math.hypot(threat.x-entry.x,threat.z-entry.z)/9):0;
    const threshold=.954-proximity*.31-(finalEscape?.12:0);
    const burst=Math.sin(time*(1.24+(i%5)*.13)+i*2.37)>threshold;
    const flicker=burst&&Math.sin(time*79+i*11.3)>-.26;
    entry.mesh.material = material(flicker?entry.altered:entry.word,
      flicker?'#f34a60':entry.color);
    entry.mesh.position.set(entry.x+(flicker?Math.sin(time*137+i)*.072:0),
      entry.y+(flicker?Math.cos(time*91+i)*.024:0),entry.z);
    entry.ghost.visible = flicker && Math.sin(time*121+i*1.7)>.05;
    if(entry.ghost.visible){
      entry.ghost.position.copy(entry.mesh.position);
      entry.ghost.translateZ(.025);
      entry.ghost.position.x+=.085;
    }
  });
}
function box(w,h,d,x,y,z,mat) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
  mesh.position.set(x,y,z); scene.add(mesh); return mesh;
}
function scenery() {
  box(6.9,.12,45,0,-.12,-15.15,floorMat);
  box(.22,3.26,45,-3.38,1.61,-15.15,wallMat);
  box(.22,3.26,45,3.38,1.61,-15.15,wallMat);
  box(6.9,.12,45,0,3.27,-15.15,wallMat);
  box(6.9,3.26,.2,0,1.61,7.05,wallMat);
  // The old dead-end becomes the hub; two side doorways connect real rooms.
  box(6.9,.12,30,0,-.12,-52.6,floorMat);
  box(6.9,.12,30,0,3.27,-52.6,wallMat);
  box(6.9,3.26,.2,0,1.61,-67.55,wallMat);
  for(const x of [-3.38,3.38]){
    box(.22,3.26,6.8,x,1.61,-40.9,wallMat);
    box(.22,3.26,18.1,x,1.61,-58.5,wallMat);
  }
  // This corridor only opens when its meaning is restored.
  box(2.18,3.26,.22,-2.36,1.61,-25.85,wallMat);
  box(2.18,3.26,.22,2.36,1.61,-25.85,wallMat);
  box(2.50,.54,.20,0,2.99,-25.85,wallMat);
  corridorMesh = box(2.50,2.69,.17,0,1.37,-25.85,warnMat);
  corridorWord = label('막힘','#e86d7f',0,1.68,-25.72,0,0,2.1,.82);
  hauntedLabel('기록 02','#b59a85','기록 00',-3.22,2.65,-23.6,0,Math.PI/2,1.45,.52);
  hauntedLabel('이어진 곳','#9d9ba5','끊어진 곳',-3.22,1.95,-23.9,0,Math.PI/2,1.6,.58);
  hauntedLabel('달리지 마세요','#c98290','달려',3.22,1.98,-26.8,0,-Math.PI/2,1.78,.56);
  for(let i=0;i<9;i++){
    const x=-1.95+(i%3)*1.95,y=.62+Math.floor(i/3)*.9;
    const mesh=label(i%3===0?'끊김':i%3===1?'이름':'????',
      i%3===0?'#a94d65':'#8c8093',x,y,-25.57,0,0,1.25,.42);
    shiftingWords.push({mesh,x,y});
  }
  echoMark=label('뒤','#ef5365',0,1.72,-28.3,0,0,2.5,1.6);
  echoMark.visible=false;
  // The final barrier remains solid in the world rules until its name is repaired.
  box(2.25,3.26,.24,-2.32,1.61,-30.15,wallMat);
  box(2.25,3.26,.24,2.32,1.61,-30.15,wallMat);
  box(2.4,.54,.2,0,2.99,-30.15,wallMat);
  doorMesh = box(2.38,2.69,.17,0,1.37,-30.15,warnMat);
  doorWord = label('벽','#e66a77',0,1.65,-30.037,0,0,1.32,.89);
  label('제2구역','#e8d7ad',0,2.4,-35.5,0,0,1.7,.78);
  label('좌: 사무실     우: 서고','#afc9c9',0,1.55,-38.6,0,0,3.6,.55);
  // No repeated surface words or visible rectangular corridor frames.
  // Management station: legible computer/desk names and a clickable record.
  box(1.6,.13,1.15,-2.15,.92,2.04,propMat);
  box(.08,.89,.08,-2.75,.45,2.55,propMat);
  box(.08,.89,.08,-1.53,.45,2.55,propMat);
  box(.9,.76,.1,-2.15,1.50,1.94,propMat);
  label('컴퓨터','#e3d2a0',-2.13,1.7,2.005,0,0,1.15,.47);
  label('기록','#d7b786',-1.02,1.65,1.20,0,0,.90,.52);
  // A first harmless typographical anomaly before the hostile encounter.
  hauntedLabel('의ㅈㅏ','#b3a8b2','의자',-3.23,1.3,-5.5,0,Math.PI/2,1.18,.62);
  hauntedLabel('아무것도 없다','#99919e','여기 있다',3.23,1.9,-8,0,-Math.PI/2,2.0,.50);
  // Lockers are decorative word shapes, while rules control where one can hide.
  R.LOCKERS.forEach((loc,i) => {
    box(.56,2.35,1.05,loc.x>0?3.07:-3.07,1.16,loc.z,propMat);
    const forwardZ = loc.z + .62;
    label('사물함','#c5bda8',loc.x,2.08,forwardZ,0,0,1.21,.57);
    label('숨기','#c9a774',loc.x,1.4,forwardZ+.012,0,0,.9,.48);
    if(i===0) label('발소리','#747b83',3.23,2.43,-18.0,0,-Math.PI/2,1.38,.62);
  });
  personWord = label('사람','#afb7c1',0,1.7,-17.3,0,0,1.1,.60);
  monsterWord = label('무언가','#d65368',0,1.7,-17.29,0,0,1.86,.82);
  monsterWord.visible = false;
  hauntedLabel('문이었던 것','#bba8b0','벽이었던 것',-2.70,1.82,-29.2,0,Math.PI/2,1.5,.55);
  hauntedLabel('벽이 아니다','#b5a5a9','벽이다',2.70,1.82,-29.2,0,-Math.PI/2,1.65,.55);
  buildChapterThreeRooms();
  enemyGroup = new THREE.Group();scene.add(enemyGroup);
  // No ordinary monster model: the five-metre silhouette is entirely text.
  const body=[
    ['사람','#bbafb8',0,4.68,0,1.26,.65],
    ['없음','#854250',-.48,4.23,.05,1.20,.60],
    ['누구','#6e5661',.52,4.22,.03,1.17,.54],
    ['무언가','#f06478',0,3.65,.11,2.78,.91],
    ['이름','#95838d',-.68,2.99,.1,1.42,.73],
    ['삭제됨','#d34159',.63,2.88,.1,1.48,.69],
    ['기억','#73636e',0,2.33,.11,2.04,.62],
    ['사라져','#9d4659',-1.56,3.18,-.08,1.62,.57],
    ['나를 봐','#8c5762',1.60,3.22,-.07,1.62,.57],
    ['뒤','#a15c69',-1.93,2.48,0,.82,.52],
    ['기록','#9b4452',1.91,2.43,0,1.20,.58],
    ['이름 없음','#8f7781',-.59,1.77,.05,1.48,.59],
    ['사람','#9d6476',.61,1.70,.05,1.33,.56],
    ['ㄴㅏ','#7b4154',-.70,1.05,0,1.12,.52],
    ['없음','#a04b61',.72,1.03,0,1.20,.56],
    ['삭제','#783949',-.70,.48,0,.98,.46],
    ['나','#cd4d62',.71,.47,0,.78,.43]
  ];
  body.forEach(([word,color,x,y,z,w,h])=>{
    const m=new THREE.Mesh(unitPlane,material(word,color));
    m.position.set(x,y,z);m.scale.set(w,h,1);m.renderOrder=2;
    m.userData={word,color,x,y};enemyGroup.add(m);correctorGlyphs.push(m);
  });
  enemyGroup.visible=false;
}

function buildChapterThreeRooms(){
  for(const [side,title] of [[-1,'뒤틀린 사무실'],[1,'이름 없는 서고']]){
    const cx=side*9.35;
    box(12.3,.12,16.7,cx,-.12,-47.2,floorMat);
    box(12.3,.12,16.7,cx,3.27,-47.2,wallMat);
    box(.2,3.24,16.7,side*15.52,1.6,-47.2,wallMat);
    for(const z of [-55.6,-38.85])box(12.3,3.2,.2,cx,1.6,z,wallMat);
    label(title,'#d6d0ba',cx,2.52,-55.47,0,0,3.5,.6);
    label(side<0?'사물은 거짓 이름을 가진다':'너무 오래 읽지 마라',
      '#b8c2cc',cx,1.68,-55.44,0,0,3.7,.50);
  }
  // Distinct light-toned typography identifies the two sides of the hub.
  label('← 사무실', '#f3c895', -1.55, 2.55, -42.0, 0, 0, 2.55, .7);
  label('서고 →', '#a8d5f0', 1.55, 2.55, -42.0, 0, 0, 2.55, .7);
  label('기록 두 개를 찾으세요', '#bed1db', 0, 1.76, -56.3, 0, 0, 3.2, .62);
  label('사무실','#ddcaaf',-3.25,2.5,-45.8,0,Math.PI/2,1.35,.6);
  label('서고','#ddcaaf',3.25,2.5,-45.8,0,-Math.PI/2,1.3,.6);
  label('사무실 · 책상을 다시 부르세요','#f1c991',-7.6,2.63,-39.05,0,0,4.2,.7);
  label('기록 A ←','#f1c991',-8.9,1.65,-51.6,0,0,2.35,.53);
  // The office is organized into a few islands of word-furniture rather than blank surfaces.
  for(const [x,z,name] of [[-5.8,-42.2,'서류'],[-8.4,-52.7,'책상'],[-13.4,-43.4,'의자']]){
    box(1.15,.68,.70,x,.36,z,propMat);
    // Labelled faces on three axes make the desk a volume of words, not a textureless block.
    label(name,'#f2d9b8',x,1.05,z+.43,0,0,1.46,.65);
    hauntedLabel('정리되지 않음','#a7a0a6','삭제됨',x,1.71,z+.45,0,0,1.8,.50);
  }
  for(let i=0;i<4;i++){
    label(i%2?'이름을 고치세요':'책상은 어디에', '#d2bca2',-8.8,.65+i*.52,-55.44,0,0,3.3,.51);
  }
  // The left room is separated by a name-driven wall, with a physically openable passage.
  box(.18,3.25,7.5,-11,1.62,-43.25,wallMat);
  box(.18,3.25,5.45,-11,1.62,-52.85,wallMat);
  box(.18,.56,3.3,-11,3.00,-48.65,wallMat);
  chapterVisual.officeSeal=box(.18,2.70,3.3,-11,1.36,-48.65,warnMat);
  chapterVisual.officeWord=label('벽','#e47682',-10.83,1.62,-48.65,0,Math.PI/2,1.55,.77);
  hauntedLabel('여기에 있었던 것은 책상','#d8b58e','벽',-8.6,1.8,-40.0,0,0,3.0,.53);
  box(1.8,.72,.9,-13.5,.40,-52.0,propMat);
  chapterVisual.officeRecord=label('기록 A','#eac58c',-13.0,1.38,-51,0,Math.PI/2,1.65,.58);
  hauntedLabel('누군가는 벽이라고 적었다','#b0a0a4','누군가 이름을 지웠다',-14.8,2.02,-49,0,Math.PI/2,2.2,.6);
  // Archive shelves are present as words, not impassable invisible props.
  for(const [x,z] of [[6,-42],[6,-53],[14,-42],[14,-53]]){
    box(.22,2.35,2.4,x,1.2,z,propMat);
    // Word-spines form recognizable shelves even when normal textures are absent.
    for(let j=0;j<4;j++){
      label(['서가','자료','기록','삭제'][j],j===3?'#d68c9d':'#a7c7de',x, .48+j*.49,z+1.23,0,0,.79,.37);
      label(['서','자','기','삭'][j],'#b9cddd',x+.14,.48+j*.49,z,0,Math.PI/2,.75,.37);
    }
  }
  for(let i=0;i<4;i++){
    label(i%2===0?'읽지 마세요':'눈을 돌려요','#8cb3cd',9.3,.64+i*.56,-55.45,0,0,2.1,.44);
  }
  label('쳐다보지 마십시오','#d48e97',8.6,2.55,-40,0,0,3.2,.58);
  label('기록 B →','#a8d5f0',10.0,1.75,-54.99,0,0,2.4,.6);
  chapterVisual.archiveRecord=label('봉인 B','#ed8fa8',12.8,1.32,-51,0,0,1.75,.58);
  label('잠깐 보고 고개를 돌리세요','#b7cce1',12.4,2.65,-54.98,0,0,3.5,.62);
  // Cipher letters materialize above the watcher, one for each controlled glance.
  ['나','를','봐'].forEach((word,i)=>{
    const mesh=label('□','#927981',9.4+i*1.10,2.88,-44.53,0,0,1.04,.70);
    chapterVisual.glimpseLetters.push({mesh,word});
  });
  // The watcher is layered text so it is distinguishable from the static wall glyphs.
  chapterVisual.watcher=label('사람','#e4dae1',10.5,1.7,-44.5,0,0,1.8,1.0);
  hauntedLabel('보지 마', '#b8808e','나를 봐', 12.8, 2.15, -42.6, 0, 0, 2.0, .65);
  chapterVisual.watcherText=label('나를 봐','#f07181',10.5,2.43,-44.5,0,0,2.0,.57);
  chapterVisual.watcherText.visible=false;
  // Central archive opens only after both records are found.
  box(2.2,3.26,.23,-2.35,1.63,-58.65,wallMat);
  box(2.2,3.26,.23,2.35,1.63,-58.65,wallMat);
  box(2.55,.54,.2,0,3,-58.65,wallMat);
  chapterVisual.finalSeal=box(2.52,2.72,.19,0,1.36,-58.65,warnMat);
  chapterVisual.finalWord=label('봉인','#d66c7a',0,1.73,-58.52,0,0,2,.91);
  label('기록 0 / 모든 이름의 시작','#c7d9e9',0,2.32,-63.1,0,0,4,.66);
  for(let j=0;j<6;j++){
    label(j%2?'이름':'기억','#b6a8be',-2.0+j*.78,.88,-65.35,0,0,.74,.5);
  }
  hauntedLabel('나','#eee5e3','없음',0,1.45,-65.5,0,0,1.2,1);
  hauntedLabel('내 이름','#aaa0a8','이름 없음',-1.0,1.89,-60.7,0,0,1.48,.58);
  hauntedLabel('기억','#ab979f','삭제',1.0,2.3,-62.1,0,0,1.2,.53);
  const shelter=label('숨기','#c7b4a3',X.SHELTER.x,1.62,X.SHELTER.z,0,0,1.4,.65);
  shelter.lookAt(0,1.6,-48);
  chapterVisual.anomaly=label('의자','#a3b1be',-7.2,1.38,-41,0,0,1.43,.66);
}
function syncChapterVisuals(){
  const c=C3.ensure(state);
  if(c.officeFixed){
    chapterVisual.officeSeal.visible=false;
    chapterVisual.officeWord.visible=false;
  }
  if(c.finalFixed){
    chapterVisual.finalSeal.visible=false;
    chapterVisual.finalWord.visible=false;
  }
  chapterVisual.officeRecord.visible=!c.records.office;
  chapterVisual.archiveRecord.visible=!c.records.archive;
  chapterVisual.archiveRecord.material=material(c.cipher.fragments>=3?'기록 B':'봉인 B',c.cipher.fragments>=3?'#f3d39b':'#ed8fa8');
  chapterVisual.glimpseLetters.forEach(({mesh,word},i)=>{
    mesh.material=material(c.cipher.fragments>i?word:'□',c.cipher.fragments>i?'#f4d7cc':'#927981');
    mesh.visible=!c.records.archive;
  });
  if(state.doorFixed){
    doorMesh.visible=false;doorWord.visible=false;
  }
  if(state.corridorFixed){
    corridorMesh.visible=false;corridorWord.visible=false;
    shiftingWords.forEach(v=>{v.mesh.visible=false;});
  }
}
function saveChapterCheckpoint(){
  const data=C3.makeCheckpoint(state);
  if(!data)return;
  data.literacy=L.checkpoint(literacy);
  try{sessionStorage.setItem(CHECKPOINT_KEY,JSON.stringify(data));}catch(_){}
}
function syncLiteracyVisuals(){
  const available=new Set(literacy.items.map(item=>item.uid));
  for(const [uid,visual] of literacyMeshes){
    if(available.has(uid))continue;
    scene.remove(visual.word);scene.remove(visual.hint);
    visual.base.dispose();visual.hot.dispose();visual.hintMaterial.dispose();
    literacyMeshes.delete(uid);
  }
  for(const item of literacy.items){
    if(literacyMeshes.has(item.uid))continue;
    const q=L.question(item);
    const word=label(q.wrong,item.kind==='core'?'#e79ca8':'#d07183',
      item.x,1.62,item.z,0,0,2.55,.77);
    const hint=label(item.kind==='core'?'핵심 오타 · 조사':'새 오류 · 조사',
      item.kind==='core'?'#cfc3b2':'#a296a0',item.x,2.21,item.z,0,0,1.65,.40);
    const base=word.material.clone(),hot=material(q.wrong,'#f15b76').clone();
    const hintMaterial=hint.material.clone();
    word.material=base;hint.material=hintMaterial;
    literacyMeshes.set(item.uid,{word,hint,item,base,hot,hintMaterial});
  }
}
function startRepairEffect(item,q){
  // Broken syllables converge into a readable corrected word.
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const chars=[...q.correct.replace(/\s/g,'')].slice(0,10);
  const shards=reduce?[]:chars.map((char,i)=>{
    const m=label(char,i%2?'#f2b78e':'#f57389',item.x,1.59,item.z+.12,0,0,.42,.46);
    m.userData={offset:(i-(chars.length-1)/2)*.27,fromX:Math.sin(i*3.7)*.75,fromY:Math.cos(i*4.1)*.53};
    return m;
  });
  const result=label(q.correct,'#aeecca',item.x,1.73,item.z+.1,0,0,2.45,.73);
  result.visible=reduce;
  repairEffects.push({t:0,x:item.x,z:item.z,result,shards,reduce});
}
function updateRepairEffects(dt){
  for(let i=repairEffects.length-1;i>=0;i--){
    const fx=repairEffects[i];fx.t+=dt;
    const converge=Math.min(1,fx.t/.54);
    for(const shard of fx.shards){
      const {offset,fromX,fromY}=shard.userData;
      shard.position.set(fx.x+fromX*(1-converge)+offset*converge,
        1.73+fromY*(1-converge)+Math.sin(converge*Math.PI)*.09,fx.z+.12);
      shard.scale.setScalar(.42*(1-Math.max(0,(fx.t-.50)/.22)));
      shard.lookAt(camera.position);
      shard.visible=fx.t<.69;
    }
    fx.result.visible=fx.t>=.48||fx.reduce;
    fx.result.position.y=1.73+(fx.t>.65?(fx.t-.65)*.12:0);
    fx.result.scale.set(2.45*Math.min(1,Math.max(.08,(fx.t-.44)/.22)),.73,1);
    fx.result.lookAt(camera.position);
    if(fx.t>=1.45){
      for(const shard of fx.shards)scene.remove(shard);
      scene.remove(fx.result);repairEffects.splice(i,1);
    }
  }
}
function updateLiteracyHud(){
  const visible=state.stage==='explore';
  hud.literacy.classList.toggle('show',visible);
  hud.literacy.classList.toggle('danger',literacy.contamination>=65);
  hud.literacy.firstChild.textContent='핵심 교정 '+literacy.coreDone+'/5 · 오염 '+Math.round(literacy.contamination)+'%';
  hud.pollution.style.width=Math.round(literacy.contamination)+'%';
}
function openCorrection(item){
  activeCorrection=item.uid;
  const q=L.question(item);
  el('correctionType').textContent=(item.kind==='core'?'핵심 기록':'발견한 오류')+' · '+q.kind;
  el('correctionTitle').textContent=q.wrong;
  el('correctionContext').textContent=q.context+' — 올바르게 고치세요.';
  el('correctionFeedback').textContent='틀려도 바로 위험해지지 않아요. 다시 생각해 보세요.';
  const offset=(Number(item.uid.split('-').pop())||0)%4;
  el('correctionChoices').querySelectorAll('button').forEach((button,i)=>{
    button.textContent=q.choices[(i+offset)%4];
    button.dataset.answer=q.choices[(i+offset)%4];
    button.disabled=false;
  });
  overlays.correction.classList.remove('closed');
  if(document.pointerLockElement===canvas)document.exitPointerLock?.();
}
function closeCorrection(){
  overlays.correction.classList.add('closed');
  activeCorrection=null;
}
function loadChapterCheckpoint(){
  try{const raw=sessionStorage.getItem(CHECKPOINT_KEY);return raw?JSON.parse(raw):null;}catch(_){return null;}
}
function respawnAtCheckpoint(){
  const data=loadChapterCheckpoint();
  if(!C3.restore(state,data))return false;
  L.restore(literacy,data.literacy);
  Object.assign(player,{x:C3.START.x,z:C3.START.z,yaw:0,pitch:0,moving:false});
  failed=false;X.reset(corrector);soundPulse=0;closeCorrection();
  for(const fx of repairEffects){fx.shards.forEach(m=>scene.remove(m));scene.remove(fx.result);}
  repairEffects.length=0;apparitionAnchor=null;apparitionNumber=-1;
  overlays.ending.classList.add('closed');overlays.fix.classList.add('closed');
  document.body.classList.remove('hidden-in-locker');
  hud.objective.textContent=C3.objective(state);
  hud.stage.textContent='기록이 저장된 마지막 지점';
  hud.echo.classList.remove('show');hud.danger.style.opacity='0';
  chapterVisual.watcher.visible=true;chapterVisual.watcherText.visible=false;
  lastGlimpses=0;lastGazeAwake=false;hud.gaze.classList.remove('show');
  hintScope='';hintLevel=0;hideHint();
  syncChapterVisuals();syncLiteracyVisuals();updateLiteracyHud();
  announce('기록이 복원되었습니다. 핵심 교정 '+literacy.coreDone+'/5',false,3);
  return true;
}

scenery();

function hideHint(){
  hintVisibleUntil=0;hud.hintBox.classList.remove('show');
}
function syncHintScope(){
  const key=G.scope(state,player);
  if(key!==hintScope){
    hintScope=key;hintLevel=0;hintScopeSince=elapsed;hideHint();
  }
  hud.help.classList.toggle('suggested',started&&!failed&&hintLevel===0&&elapsed-hintScopeSince>=30);
  if(hintVisibleUntil>0&&elapsed>hintVisibleUntil)hideHint();
}
function showHint(){
  if(!started||failed||!overlays.fix.classList.contains('closed')||!overlays.correction.classList.contains('closed'))return;
  syncHintScope();
  hintLevel=Math.min(3,hintLevel+1);
  el('hintLevel').textContent='도움말 '+hintLevel+'/3';
  el('hintBody').textContent=G.hint(state,player,hintLevel);
  hintVisibleUntil=elapsed+11;
  hud.hintBox.classList.add('show');
  hud.help.classList.remove('suggested');
}
hud.help.addEventListener('click',showHint);

function announce(text, red=false, seconds=3.6) {
  hud.message.textContent=text; hud.message.classList.toggle('red',red);
  hud.message.classList.add('show'); messageEnd=elapsed+seconds;
}
function tone(freq, duration=.10, kind='sine', volume=.035) {
  if (!audioCtx || muted) return;
  const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();
  osc.type=kind;osc.frequency.value=freq;
  gain.gain.setValueAtTime(Math.max(.0001,volume),audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+duration);
  osc.connect(gain);gain.connect(audioCtx.destination);
  osc.start();osc.stop(audioCtx.currentTime+duration+.005);
}
function audioStart() {
  try { const C=window.AudioContext||window.webkitAudioContext;
    if(C){audioCtx=audioCtx||new C();audioCtx.resume().catch(()=>{});}
  } catch (_) {}
}
function shock() {tone(86,.46,'sawtooth',.095);tone(43,.72,'sine',.080);}
function updateStage(stage,old) {
  if (stage === old) return;
  hud.objective.textContent=state.stage==='explore'||state.stage==='final'?C3.objective(state):R.objective(state);
  if(stage==='chase') {
    monsterReveal=true;personWord.visible=false;monsterWord.visible=true;
    shock();announce('도망쳐! 달려서 사물함에 숨으세요.',true,4.4);
    hud.stage.textContent='경고 · 이름 불명의 존재 감지';
  } else if(stage==='hiding') {
    document.body.classList.add('hidden-in-locker');
    tone(120,.22,'triangle',.05);announce('쉿. 가만히 기다리세요.',false,2.3);
    hud.stage.textContent='사물함 내부 · 숨소리를 죽이세요';
  } else if(stage==='distortion') {
    announce('발소리가 멀어졌습니다. 붉은 이름을 고쳐 길을 복구하세요.',false,3.8);
    hud.stage.textContent='기록 02 · 복도의 명칭 오류';
  } else if(stage==='door') {
    scene.remove(corridorMesh); corridorMesh.geometry.dispose();
    scene.remove(corridorWord);
    corridorWord=label('통로','#b9d7cd',0,2.54,-25.715,0,0,1.68,.56);
    shiftingWords.forEach(entry=>{entry.mesh.visible=false;});
    shock(); announce('뒤. 뒤. 뒤. 빨간 글자가 보이면 뛰지 마세요.',true,4.5);
    hud.stage.textContent='기록 03 · 뒤에 있는 것은 뛰는 소리를 듣습니다';
    try{window.KidscadeGame?.milestone?.('ota_corridor_fixed',{uniqueKey:'ota-corridor'});}catch(_){};
  } else if(stage==='exit') {
    scene.remove(doorMesh);doorMesh.geometry.dispose();
    scene.remove(doorWord);
    doorWord=label('문','#d6cfbc',0,2.55,-30.028,0,0,1.6,.55);
    announce('문이 열렸습니다. 달리지 말고 다음 구역으로 이동하세요.',false,4.0);tone(523,.25,'sine',.07);
    hud.stage.textContent='기록보관소 · 탈출 통로 열림';
    try{window.KidscadeGame?.milestone?.('ota_door_fixed',{uniqueKey:'ota-prologue'});}catch(_){}
  } else if(stage==='explore'){
    X.reset(corrector);apparitionAnchor=null;apparitionNumber=-1;
    C3.ensure(state).checkpoint=true;
    syncLiteracyVisuals();updateLiteracyHud();saveChapterCheckpoint();
    announce('잘못된 기록을 발견하면 조사해 고치세요. 핵심 교정 5개가 필요합니다.',false,5.0);
    hud.stage.textContent='제2구역 · 이름을 잃어버린 방들';
    syncChapterVisuals();
  } else if(stage==='final'){
    X.beginFinal(corrector);
    chapterVisual.finalSeal.visible=false;
    chapterVisual.finalWord.visible=false;
    saveChapterCheckpoint();
    announce('뒤에서 이름을 지우고 있어요! 「나」를 향해 달리세요.',true,4.5);
    hud.stage.textContent='기록 0 · 당신의 이름';
  } else if(stage==='lost') {
    finish(false);
  } else if(stage==='won') {
    finish(true);
  }
}
function syncStage(before) {updateStage(state.stage,before);}
function interact() {
  if(!started || failed || !overlays.fix.classList.contains('closed')||!overlays.correction.classList.contains('closed')) return;
  const nearShelter=state.stage==='explore'&&R.distance(player,X.SHELTER)<1.7;
  if(corrector.hidden){
    X.leave(corrector);document.body.classList.remove('hidden-in-locker');
    announce('은신처에서 나왔습니다. 주변의 글자를 살피세요.',false,2.3);
    return;
  }
  if(nearShelter){
    if(X.enter(corrector,player)){
      player.moving=false;
      document.body.classList.add('hidden-in-locker');
      if(document.pointerLockElement===canvas)document.exitPointerLock?.();
      announce('쉿. 지직거리는 소리가 멀어질 때까지 기다리세요.',false,3);
    }else announce('너무 가까워요. 교정자와 거리를 벌리세요.',true,2.1);
    return;
  }
  const nearbyError=state.stage==='explore'?L.nearest(literacy,player):null;
  const action=R.getInteraction(state,player)||C3.interaction(state,player)
    ||(nearbyError?{type:'literacy',label:'틀린 기록 교정',uid:nearbyError.uid}:null);
  if(!action) return;
  if(state.stage==='explore')soundPulse=1.35;
  const before=state.stage;
  if(action.type==='console') {
    if(R.inspectConsole(state,player)) {
      announce('복도 안쪽의 이상한 「사람」을 확인하세요.',false,3.8);
      hud.stage.textContent='문서 01 · 사물의 이름은 사실이어야 한다';
      tone(330,.09,'triangle');tone(440,.20,'triangle');
    }
  } else if(action.type==='hide') {
    if(R.enterLocker(state,player)) {
      player.moving=false;
      if(document.pointerLockElement===canvas) document.exitPointerLock?.();
    }
  } else if(action.type==='leave') {
    if(R.leaveLocker(state)) {
      document.body.classList.remove('hidden-in-locker');
      announce('복도가 막혔어요. 붉은 「막힘」의 이름을 바로잡으세요.',false,3.0);
    }
  } else if(action.type==='literacy'){
    const item=literacy.items.find(i=>i.uid===action.uid);
    if(item)openCorrection(item);
  } else if(action.type==='coreNeeded'){
    announce('핵심 오타 기록을 '+(5-literacy.coreDone)+'개 더 고쳐야 합니다.',false,3.6);
  } else if(action.type==='archiveCipher'){
    announce('기록이 봉인되어 있습니다. 「사람」을 잠깐 읽고, 반드시 시선을 돌리세요.',false,4.2);
    tone(190,.20,'triangle',.035);
  } else if(action.type==='officeRecord'||action.type==='archiveRecord'){
    const which=action.type==='officeRecord'?'office':'archive';
    if(C3.collect(state,which,player)){
      syncChapterVisuals();saveChapterCheckpoint();
      announce(which==='office'?'기록 A: 벽이라고 적힌 것은 책상이었다.':'기록 B: 사람이라고 적힌 것은 따라 읽는 자였다.',false,4.8);
      tone(530,.26,'triangle',.055);
      hud.objective.textContent=C3.objective(state);
      hud.records.textContent='기록 '+(+C3.ensure(state).records.office+ +C3.ensure(state).records.archive)+'/2';
      hud.stage.textContent=C3.both(state)?'핵심 교정 '+literacy.coreDone+'/5 완료 후 중앙 기록실로':'다른 방에서도 기록을 찾으세요';
    }
  } else if(['repair','corridor','office','final'].includes(action.type)) {
    openPuzzle(action.type);
    overlays.fix.classList.remove('closed');
    if(document.pointerLockElement===canvas)document.exitPointerLock?.();
  }
  syncStage(before);
}
function openPuzzle(type) {
  const corridor=type==='corridor';
  el('fixTitle').textContent=type==='office'?'벽이 된 책상':type==='final'?'잊혀진 이름':corridor?'이 복도는 이름을 잃었습니다.':'출구의 이름이 틀렸습니다.';
  el('redWord').textContent=type==='final'?'□□□':type==='office'?'벽':corridor?'막힘':'벽';
  el('fixQuestion').textContent=type==='office'?'기록을 보세요. 사람이 책상 옆에 앉았다는 문장이 남아 있습니다. 원래 사물은 무엇일까요?'
    :type==='final'?'두 기록을 모두 모았습니다. 당신을 존재하게 만드는 것은 무엇일까요?'
    :corridor?'이곳은 두 구역을 이어 주는 곳입니다. 올바른 이름을 선택하세요.'
    :'열고 닫아서 지나갈 수 있는 것은 무엇인가요?';
  const words=type==='office'?['의자','책상','벽']:type==='final'?['기억','거짓','공백']
    :corridor?['벽','통로','창문']:['벽','문','창문'];
  el('choices').querySelectorAll('button').forEach((button,i)=>{
    button.dataset.word=words[i];button.textContent=words[i];
  });
  el('fixFeedback').textContent='주변의 단어를 읽고, 잘못된 이름을 바로잡으세요.';
  overlays.fix.dataset.puzzle=type;
}
function finish(won) {
  if(failed) return;
  failed=true;
  if(document.pointerLockElement===canvas) document.exitPointerLock?.();
  overlays.ending.classList.remove('closed');
  el('endingSub').textContent=won?'제0기록보관소 / 생존':'기록 파손 / 이름 없음';
  el('endingTitle').textContent=won?'당신의 이름이 남았습니다':'당신의 이름이 지워졌습니다';
  const failure=won?null:G.failure(state);
  el('endingText').textContent=won
    ? '기록 A·B와 핵심 오타 '+literacy.coreDone+'/5개를 복구했습니다. 학습 교정 '+literacy.corrected+'회 · 경과 '+Math.round(state.time)+'초'
    : failure.title+' '+failure.detail;
  el('respawn').hidden=!(!won&&Boolean(loadChapterCheckpoint()));
  try {window.KidscadeGame?.result?.({scope:'stage',status:won?'completed':'failed',
    outcome:won?'clear':'fail',id:'ota-prologue',score:won?Math.max(100,1000-Math.floor(state.time)*3-state.mistakes*80):0,
    seconds:Math.round(state.time),mistakes:state.mistakes+literacy.mistakes,corrected:literacy.corrected});}catch(_){}
}
function updatePrompt() {
  const nearbyError=state.stage==='explore'?L.nearest(literacy,player):null;
  currentInteraction=corrector.hidden?{type:'leaveCorrector',label:'은신처에서 나오기'}
    :state.stage==='explore'&&R.distance(player,X.SHELTER)<1.7
      ?{type:'hideCorrector',label:'어둠 속에 숨기'}
      :R.getInteraction(state,player)||C3.interaction(state,player)
        ||(nearbyError?{type:'literacy',label:'틀린 기록 교정',uid:nearbyError.uid}:null);
  hud.prompt.classList.toggle('show',!!currentInteraction&&!failed);
  hud.prompt.innerHTML=currentInteraction
    ? '<strong>E</strong> / 조사 — '+currentInteraction.label : '';
  hud.action.textContent=currentInteraction?currentInteraction.label:'조사';
}
function setCamera() {
  camera.position.set(player.x,state.hidden?1.5:1.65+(player.moving?.018*Math.sin(elapsed*11):0),player.z);
  camera.rotation.set(player.pitch,player.yaw,0);
}
function tryMove(dx,dz) {
  // Resolve in short increments so a low-frame-rate sprint cannot tunnel through word walls.
  const steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dz))/.12));
  for(let i=0;i<steps;i++){
    const nx=player.x+dx/steps,nz=player.z+dz/steps;
    if(player.z< -37.4?C3.canMove(state,nx,player.z):R.canMove(state,nx,player.z))player.x=nx;
    if(nz< -37.4?C3.canMove(state,player.x,nz):R.canMove(state,player.x,nz))player.z=nz;
  }
}
function update(dt) {
  elapsed+=dt;
  const before=state.stage;
  let running=false;
  if(!state.hidden && !corrector.hidden && state.stage!=='won' && state.stage!=='lost') {
    const f=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)
      -(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-joystick.y;
    const side=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)
      -(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+joystick.x;
    const len=Math.hypot(f,side),isRun=keys.has('ShiftLeft')||keys.has('ShiftRight')||mobileRun;
    player.moving=len>.06; running=player.moving&&isRun;
    if(player.moving) {
      const speed=isRun?4.85:2.67;
      const ff=f/Math.max(1,len),ss=side/Math.max(1,len);
      tryMove((-Math.sin(player.yaw)*ff+Math.cos(player.yaw)*ss)*speed*dt,
        (-Math.cos(player.yaw)*ff-Math.sin(player.yaw)*ss)*speed*dt);
      stepsUntil-=dt;
      if(stepsUntil<=0){tone(isRun?105:73,.055,'triangle',isRun?.024:.013);stepsUntil=isRun?.23:.43;}
    } else stepsUntil=0;
  }
  if(corrector.hidden)player.moving=false;
  R.triggerMonster(state,player);
  R.stepEnemy(state,dt,player);
  R.stepEcho(state,dt,{moving:player.moving,running});
  if(state.stage==='exit')C3.startChapter(state,player);
  if(state.stage==='final')C3.finish(state,player);
  if(state.stage==='explore'){
    const gaze=C3.stepWatcher(state,dt,player,player.yaw,player.pitch);
    if(gaze.awake && !lastGazeAwake){shock();announce('읽지 마. 뛰어!',true,3);}
    lastGazeAwake=gaze.awake;
    const c=C3.ensure(state);
    if(c.cipher.fragments>lastGlimpses){
      tone(422+c.cipher.fragments*90,.17,'sine',.060);
      announce('글자 조각 '+c.cipher.fragments+'/3 — 이제 시선을 돌리세요.',false,2.4);
      syncChapterVisuals();
    }
    lastGlimpses=c.cipher.fragments;
    const watcher=C3.ensure(state).watcher;
    chapterVisual.watcher.position.set(watcher.x,1.7,watcher.z);
    chapterVisual.watcher.lookAt(camera.position);
    chapterVisual.watcherText.position.set(watcher.x,2.43,watcher.z);
    chapterVisual.watcherText.lookAt(camera.position);
    chapterVisual.watcherText.visible=gaze.awake||gaze.focus>35;
    chapterVisual.watcher.material=material(gaze.awake?'나나나':'사람',gaze.awake?'#f47485':'#e4dae1');
    const inArchive=C3.inArchive(player)&&!c.records.archive;
    hud.gaze.classList.toggle('show',inArchive || gaze.awake);
    hud.gaze.classList.toggle('active',gaze.awake || gaze.focus>75);
    hud.gazeFill.style.width=Math.round(gaze.focus)+'%';
    hud.gazeText.textContent=gaze.awake?'발각! 달려서 서고를 벗어나세요'
      :c.cipher.fragments>=3?'해독 완료 · 기록 B를 확보하세요'
      :c.cipher.mustLookAway?'시선을 돌려야 다음 글자를 읽을 수 있어요'
      :gaze.looking?'글자를 읽는 중… 오래 보면 위험해요'
      :'「사람」을 잠깐 보고 시선을 돌리세요';
    hud.clue.textContent='해독 '+c.cipher.fragments+'/3';
    hud.records.textContent='기록 '+(+C3.ensure(state).records.office+ +C3.ensure(state).records.archive)+'/2';
  }else{
    hud.gaze.classList.remove('show');hud.gaze.classList.remove('active');lastGazeAwake=false;
  }
  if(state.stage==='explore'){
    const events=L.step(literacy,dt);
    if(events.spawned)tone(270,.055,'square',.017);
    if(events.awakened){shock();announce('오류가 너무 많이 쌓였습니다. 교정자가 깨어납니다!',true,4.5);}
    if(events.calmed)announce('기록이 안정되었습니다. 교정자가 사라집니다.',false,3.3);
    syncLiteracyVisuals();updateLiteracyHud();
  }
  if(state.stage==='explore'||state.stage==='final'){
    soundPulse=Math.max(0,soundPulse-dt);
    // The archive is protected ONLY while its separate gaze puzzle is unresolved.
    const archiveClear=C3.ensure(state).records.archive;
    const archiveOpen=archiveClear;
    const safe=state.stage==='explore'&&C3.inArchive(player)&&!archiveClear;
    const report=X.step(corrector,dt,player,{
      stage:state.stage,safe,archiveOpen,awakened:literacy.awakened,moving:player.moving,running,noise:soundPulse>0,
      passable:(x,z)=>(archiveClear||x<=3.03)&&C3.canMove(state,x,z)
    });
    if(report.caught){
      state.stage='lost';state.lossReason='corrector';state.losses++;
    }
    if(!corrector.hidden&&!state.hidden)document.body.classList.remove('hidden-in-locker');
  }
  syncStage(before);
  if(messageEnd<elapsed)hud.message.classList.remove('show');
  if(state.stage==='explore'){
    const odd=elapsed>0 && Math.floor(elapsed/8)%2===1;
    if(odd!==chapterVisual.anomalyChanged && !C3.ensure(state).records.office){
      chapterVisual.anomalyChanged=odd;
      chapterVisual.anomaly.material=material(odd?'사람':'의자',odd?'#dc8191':'#a3b1be');
    }
  }
  const corruptorSource=state.monster.active?state.monster
    :corrector.phase!=='dormant'?corrector:null;
  updateHauntedWords(elapsed,corruptorSource,state.stage==='final');
  updateRepairEffects(dt);
  if(state.stage==='explore'){
    // Show one clear nearby learning target; distant record text fades away.
    const nearest=L.nearest(literacy,player,9);
    for(const {word,hint,item,base,hot,hintMaterial} of literacyMeshes.values()){
      const dist=R.distance(player,item);
      const fade=Math.max(0,Math.min(1,(10-dist)/4));
      const emphasis=nearest&&nearest.uid!==item.uid&&dist<6?.32:1;
      const beat=Math.sin(elapsed*(1.6+literacy.contamination*.015)+item.age*.4);
      word.position.y=1.62+beat*.025;
      word.material=literacy.contamination>=40&&beat>.75?hot:base;
      word.material.opacity=fade*emphasis;
      word.visible=fade*emphasis>.04;
      word.lookAt(camera.position);
      hint.visible=dist<4.7&&(!nearest||nearest.uid===item.uid);
      hintMaterial.opacity=Math.min(1,(4.7-dist)/1.6);
      hint.lookAt(camera.position);
    }
    const focused=nearest&&R.distance(player,nearest)<4.2?nearest:null;
    hauntedWords.forEach(entry=>{
      if(entry.z< -38&&entry.z> -57&&focused&&
        Math.hypot(entry.x-focused.x,entry.z-focused.z)<3.1){
        entry.mesh.visible=false;entry.ghost.visible=false;
      }else entry.mesh.visible=true;
    });
  }
  shiftingWords.forEach((entry,i)=>{
    if(entry.mesh.visible){
      entry.mesh.position.x=entry.x+Math.sin(elapsed*(2.8+i*.13)+i)*.13;
      entry.mesh.position.y=entry.y+Math.sin(elapsed*4.1+i*3)*.045;
    }
  });
  const echoActive=state.echo.active && !failed;
  if(echoActive!==echoWasActive){
    echoWasActive=echoActive;
    if(echoActive){tone(62,.45,'sawtooth',.045);tone(89,.25,'triangle',.03);}
  }
  hud.echo.classList.toggle('show',state.stage==='door'||state.stage==='exit');
  hud.echo.classList.toggle('active',echoActive);
  hud.echoText.textContent=echoActive?'뒤에 있다 — 달리지 마세요':'조용히 이동하세요';
  hud.echoFill.style.width=Math.round(state.echo.alert)+'%';
  echoMark.visible=echoActive;
  if(echoActive){
    echoMark.position.set(Math.max(-1.6,Math.min(1.6,player.x)),1.85,player.z+3.3);
    echoMark.lookAt(camera.position);
    echoMark.scale.x=2.5+Math.sin(elapsed*9)*.25;
    if(Math.floor(elapsed*2.2)!==Math.floor((elapsed-dt)*2.2))tone(71,.075,'sawtooth',.025+state.echo.alert*.0003);
  }
  const prologue=state.monster.active;
  const stalking=corrector.phase!=='dormant'&&!failed;
  const threat=prologue?state.monster:stalking?corrector:null;
  const distance=threat?R.distance(player,threat):Infinity;
  // Non-lethal silhouette: careful students can still experience the horror.
  // This is a scripted echo, not an omniscient second monster.
  const chapterTime=literacy.time;
  const apparitionWindow=state.stage==='explore'&&!threat
    ?(chapterTime>=19&&chapterTime<23?0:
      chapterTime>=77&&chapterTime<81&&literacy.contamination>=18?1:-1)
    :-1;
  const mirage=apparitionWindow>=0;
  if(mirage&&apparitionNumber!==apparitionWindow){
    apparitionNumber=apparitionWindow;
    apparitionAnchor={x:Math.max(-13,Math.min(14,player.x-Math.sin(player.yaw)*9)),
      z:Math.max(-54,Math.min(-40,player.z-Math.cos(player.yaw)*9))};
    tone(93,.29,'sawtooth',.018);
    announce('멀리서 누군가 기록의 이름을 지우고 있습니다.',false,3);
  }
  if(!mirage)apparitionAnchor=null;
  enemyGroup.visible=Boolean(threat||mirage);
  if(threat||mirage){
    const locus=threat||apparitionAnchor;
    enemyGroup.position.set(locus.x,Math.sin(elapsed*1.8)*.035,locus.z);
    enemyGroup.scale.setScalar(mirage?.76:1);
    enemyGroup.lookAt(camera.position.x,2.4,camera.position.z);
    correctorGlyphs.forEach((m,i)=>{
      const glitch=Math.sin(elapsed*(29+i*2.15)+i*5.3)>.91;
      m.visible=!mirage||i%3!==1;
      m.position.x=m.userData.x+(glitch?Math.sin(elapsed*121+i)*.12:Math.sin(elapsed*1.8+i)*.014);
      m.position.y=m.userData.y+(glitch?Math.cos(elapsed*84+i)*.075:0);
      m.material=material(glitch?(i%3===0?'없음':m.userData.word):m.userData.word,
        mirage?'#756671':glitch?'#ff3654':m.userData.color);
    });
    const near=Math.max(0,1-distance/11);
    hud.danger.style.opacity=mirage?'.07':String(Math.min(.78,near*.48+(prologue?Math.sin(elapsed*7)*.09:0)));
    hud.noise.style.opacity=mirage?'.06':String(Math.min(.38,near*.22));
    if(threat&&distance<10&&elapsed-lastCorrectorSound>Math.max(.60,2.0-distance*.12)){
      lastCorrectorSound=elapsed;
      tone(distance<4?64:95,.17,'sawtooth',distance<4?.026:.010);
      tone(180+Math.round(distance*17),.045,'square',.006);
    }
  } else {
    hud.danger.style.opacity=echoActive?String(.18+state.echo.alert/155):'0';
    hud.noise.style.opacity=echoActive?String(.18+state.echo.alert/270):state.stage==='hiding'?'0.07':'0';
  }
  const approaching=stalking&&!corrector.hidden&&distance<11;
  hud.corrector.classList.toggle('show',approaching||corrector.hidden||mirage);
  hud.corrector.classList.toggle('alert',approaching&&distance<4.1);
  const signal=mirage?'교정자의 잔상입니다. 아직 추격하지 않습니다'
    :corrector.hidden?'숨은 상태 · 소리가 멀어질 때까지 기다리세요'
    :corrector.phase==='final'?'뒤에서 이름을 지우고 있습니다 — 앞으로 이동!'
    :corrector.phase==='chase'?'교정자가 찾았습니다 — 시야를 벗어나세요'
    :corrector.phase==='search'?'주변에서 이름을 찾고 있습니다'
    :distance<7?'지직… 단어가 바뀌고 있습니다':'멀리서 글자가 지워지고 있습니다';
  if(hud.correctorText.textContent!==signal)hud.correctorText.textContent=signal;
  setCamera();updatePrompt();syncHintScope();
}
function look(dx,dy) {
  if(state.hidden || !overlays.fix.classList.contains('closed')||!overlays.correction.classList.contains('closed'))return;
  player.yaw-=dx*.0036;
  player.pitch=Math.max(-.76,Math.min(.76,player.pitch-dy*.0031));
}
function animate(now) {
  requestAnimationFrame(animate);
  const dt=Math.min(.1,Math.max(0,(now-lastFrame)/1000||0));lastFrame=now;
  if(started && !failed && document.visibilityState!=='hidden' && overlays.fix.classList.contains('closed')&&overlays.correction.classList.contains('closed'))update(dt);
  else setCamera();
  renderer.render(scene,camera);
}
function resize() {
  const w=window.innerWidth,h=window.innerHeight;
  renderer.setSize(w,h,false);camera.aspect=w/Math.max(1,h);camera.updateProjectionMatrix();
}
window.addEventListener('resize',resize);
document.addEventListener('visibilitychange',()=>{lastFrame=performance.now();});
function begin() {
  overlays.intro.classList.add('closed');started=true;audioStart();
  hud.help.hidden=false;syncHintScope();
  try{window.KidscadeGame?.start?.();}catch(_){}
  announce('컴퓨터 기록부터 확인하세요.',false,3.2);
  if(!touchDevice)canvas.requestPointerLock?.().catch?.(()=>{});
}
el('start').addEventListener('click',()=>{
  try{sessionStorage.removeItem(CHECKPOINT_KEY);}catch(_){}
  begin();
});
el('resume').hidden=!loadChapterCheckpoint();
el('resume').addEventListener('click',()=>{begin();respawnAtCheckpoint();});
el('replay').addEventListener('click',()=>{try{sessionStorage.removeItem(CHECKPOINT_KEY);}catch(_){}location.reload();});
el('respawn').addEventListener('click',()=>{if(!respawnAtCheckpoint())location.reload();});
el('mute').addEventListener('click',()=>{
  muted=!muted;el('mute').textContent=muted?'소리 꺼짐':'소리 켜짐';
});
document.addEventListener('keydown',e=>{
  if(['KeyW','KeyA','KeyS','KeyD','ShiftLeft','ShiftRight','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();
  keys.add(e.code);
  if(e.code==='KeyH'&&!e.repeat){e.preventDefault();showHint();}
  if(e.code==='KeyE'&&!e.repeat)interact();
});
document.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>{keys.clear();mobileRun=false;joystick.x=0;joystick.y=0;el('knob').style.transform='translate(0,0)';});
document.addEventListener('mousemove',e=>{
  if(document.pointerLockElement===canvas&&started&&!failed)look(e.movementX,e.movementY);
});
canvas.addEventListener('pointerdown',e=>{
  if(!started||failed)return;
  if(e.pointerType==='mouse') {
    if(document.pointerLockElement!==canvas)canvas.requestPointerLock?.().catch?.(()=>{});
  }else{lookPointer={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);}
});
canvas.addEventListener('pointermove',e=>{
  if(lookPointer?.id!==e.pointerId)return;
  look(e.clientX-lookPointer.x,e.clientY-lookPointer.y);
  lookPointer.x=e.clientX;lookPointer.y=e.clientY;
});
function stopLook(e){if(lookPointer?.id===e.pointerId)lookPointer=null;}
canvas.addEventListener('pointerup',stopLook);canvas.addEventListener('pointercancel',stopLook);
const stick=el('stick'),knob=el('knob');
function moveStick(e) {
  const r=stick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
  const radius=r.width*.35,dx=e.clientX-cx,dy=e.clientY-cy;
  const m=Math.max(1,Math.hypot(dx,dy)/radius);
  joystick.x=dx/(radius*m);joystick.y=dy/(radius*m);
  knob.style.transform='translate('+(joystick.x*radius)+'px,'+(joystick.y*radius)+'px)';
}
stick.addEventListener('pointerdown',e=>{joystickPointer=e.pointerId;stick.setPointerCapture(e.pointerId);moveStick(e);});
stick.addEventListener('pointermove',e=>{if(joystickPointer===e.pointerId)moveStick(e);});
function endStick(e) {
  if(joystickPointer!==e.pointerId)return;
  joystickPointer=null;joystick.x=0;joystick.y=0;knob.style.transform='translate(0,0)';
}
stick.addEventListener('pointerup',endStick);stick.addEventListener('pointercancel',endStick);
el('action').addEventListener('click',interact);
const run=el('run');
run.addEventListener('pointerdown',e=>{mobileRun=true;run.setPointerCapture(e.pointerId);});
run.addEventListener('pointerup',()=>{mobileRun=false;});
run.addEventListener('pointercancel',()=>{mobileRun=false;});
for(const choice of el('choices').querySelectorAll('button')) {
  choice.addEventListener('click',()=>{
    const before=state.stage;
    const type=overlays.fix.dataset.puzzle;
    const correct=type==='corridor'?R.repairCorridor(state,choice.dataset.word,player)
      :type==='office'?C3.repairOffice(state,choice.dataset.word,player)
      :type==='final'?C3.repairFinal(state,choice.dataset.word,player)
      :R.repairDoor(state,choice.dataset.word,player);
    if(correct) {
      overlays.fix.classList.add('closed');syncStage(before);syncChapterVisuals();saveChapterCheckpoint();
      if(type==='office'){announce('벽이 책상으로 돌아왔습니다. 안쪽에서 기록을 찾으세요.',false,3.5);hud.stage.textContent='사무실 · 기록 A 탐색';}
      el('fixFeedback').textContent='주변의 기록을 기억하세요.';
    } else {
      el('fixFeedback').textContent=type==='office'?'틀렸어요. 이 방에서 사람이 옆에 앉아 있던 사물을 찾아보세요.'
        :type==='final'?'틀렸어요. 두 기록을 읽으며 잊힌 이름을 생각해 보세요.'
        :type==='corridor'?'틀렸어요. 두 장소를 이어 주는 길의 이름을 생각해 보세요.'
        :'틀렸어요. 열고 닫아 지나갈 수 있는 것은 무엇일까요?';
      tone(150,.21,'sawtooth',.042);
    }
  });
}
el('correctionClose').addEventListener('click',closeCorrection);
el('correctionChoices').querySelectorAll('button').forEach(button=>{
  button.addEventListener('click',()=>{
    if(!activeCorrection)return;
    const result=L.correct(literacy,activeCorrection,button.dataset.answer);
    if(!result.ok){
      if(result.reason==='wrong'){
        el('correctionFeedback').textContent=result.hint;
        tone(180,.13,'triangle',.021);
      }else closeCorrection();
      updateLiteracyHud();
      return;
    }
    closeCorrection();startRepairEffect(result.item,result.question);
    syncLiteracyVisuals();updateLiteracyHud();
    hud.objective.textContent=C3.objective(state);
    saveChapterCheckpoint();
    tone(392,.12,'triangle',.047);
    tone(523,.22,'triangle',.048);tone(784,.28,'sine',.042);
    announce((result.item.kind==='core'?'핵심 기록 '+literacy.coreDone+'/5 복구! ':'오타 교정 성공! ')+result.question.explain,false,3.9);
    if(result.completed&&C3.both(state))
      announce('핵심 기록 5개 복구 완료! 중앙 기록실로 이동하세요.',false,4.0);
    try{window.KidscadeGame?.milestone?.('ota_literacy_'+literacy.coreDone,{uniqueKey:'ota-literacy-'+literacy.coreDone});}catch(_){}
  });
});
window.OtaDebug = Object.freeze({
  snapshot:()=>({stage:state.stage,corridorFixed:state.corridorFixed,doorFixed:state.doorFixed,hidden:state.hidden,
    guidance:{scope:hintScope,level:hintLevel},chapter3:JSON.parse(JSON.stringify(C3.ensure(state))),echo:{...state.echo},monster:{...state.monster},
    corrector:{phase:corrector.phase,x:corrector.x,z:corrector.z,hidden:corrector.hidden,grace:corrector.grace},
    literacy:{coreDone:literacy.coreDone,corrected:literacy.corrected,contamination:literacy.contamination,awakened:literacy.awakened,items:literacy.items.map(i=>({uid:i.uid,x:i.x,z:i.z,bankIndex:i.bankIndex,kind:i.kind}))},
    visuals:{nearbyWords:[...literacyMeshes.values()].filter(v=>v.word.visible).length,
      nearbyHints:[...literacyMeshes.values()].filter(v=>v.hint.visible).length,repairs:repairEffects.length},
    player:{x:player.x,z:player.z,yaw:player.yaw,pitch:player.pitch},mistakes:state.mistakes}),
  // Browser QA may aim the camera to verify gaze rules, but cannot edit game progress.
  aimForVisualAudit:(yaw,pitch)=>{
    if(!new URLSearchParams(location.search).has('visual-audit'))return false;
    player.yaw=Number(yaw)||0;player.pitch=Number(pitch)||0;return true;
  }
});
resize();setCamera();requestAnimationFrame(animate);

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { shared3DPath, shared3DIsApproved } from '../../assets/game/manifest/shared-community-3d.js';

const $=id=>document.getElementById(id);
const ui={
  phaseName:$('phaseName'),ecoPoints:$('ecoPoints'),energyRate:$('energyRate'),carbonRate:$('carbonRate'),restoreRate:$('restoreRate'),waterRate:$('waterRate'),bioRate:$('bioRate'),
  mission:$('mission'),missionKicker:$('missionKicker'),missionTitle:$('missionTitle'),missionText:$('missionText'),objectives:$('objectives'),speciesRow:$('speciesRow'),
  missionCollapse:$('missionCollapse'),windViewBtn:$('windViewBtn'),sunViewBtn:$('sunViewBtn'),geoViewBtn:$('geoViewBtn'),pollutionViewBtn:$('pollutionViewBtn'),homeViewBtn:$('homeViewBtn'),helpBtn:$('helpBtn'),
  mapLegend:$('mapLegend'),tileInfo:$('tileInfo'),toast:$('toast'),toolbar:$('toolbar'),undoBtn:$('undoBtn'),saveBtn:$('saveBtn'),
  intro:$('intro'),tutorialBtn:$('tutorialBtn'),newBtn:$('newBtn'),continueBtn:$('continueBtn'),
  tutorialCoach:$('tutorialCoach'),tutorialStep:$('tutorialStep'),tutorialTitle:$('tutorialTitle'),tutorialText:$('tutorialText'),tutorialNext:$('tutorialNext'),tutorialSkip:$('tutorialSkip'),
  help:$('help'),closeHelpBtn:$('closeHelpBtn'),result:$('result'),resultText:$('resultText'),resultScore:$('resultScore'),resultRestore:$('resultRestore'),resultSpecies:$('resultSpecies'),
  resultAgain:$('resultAgain'),resultObserve:$('resultObserve')
};

const COLS=18,ROWS=14,CELL=1.18;
const PHASES=[
  {name:'1 · 되살리기',title:'죽은 땅을 깨워요',text:'풍력 발전기로 전력을 만들고 정화기로 오염된 토양과 강을 되살리세요.'},
  {name:'2 · 다양하게 만들기',title:'한 가지 초원으로는 부족해요',text:'습지·숲·꽃초원을 골고루 만들어 서로 다른 생물이 살 자리를 마련하세요.'},
  {name:'3 · 야생의 귀환',title:'동물들이 돌아올 조건을 만들어요',text:'서식 조건이 맞으면 동물은 직접 데려오지 않아도 스스로 돌아옵니다.'},
  {name:'4 · 흔적 없이 철수',title:'이제 인간의 흔적을 걷어내요',text:'깨끗한 강에 회수선을 보내 주변 시설을 전부 회수하세요. 건물 0개가 최종 목표입니다.'}
];
const TOOL={
  inspect:{label:'살펴보기',cost:0,radius:0},
  wind:{label:'풍력 발전기',cost:20,radius:4.7,power:26},
  solar:{label:'태양광 발전소',cost:18,radius:4.2,power:22},
  geothermal:{label:'지열 발전소',cost:28,radius:5.5,power:38},
  nuclear:{label:'원자력 발전소',cost:55,radius:8.2,power:78},
  coal:{label:'화력 발전소',cost:12,radius:7.0,power:65,harmful:true},
  carfactory:{label:'자동차 공장',cost:16,radius:0,harmful:true,demand:12},
  landfill:{label:'쓰레기 매립지',cost:6,radius:2.8,harmful:true},
  quarry:{label:'채석장',cost:10,radius:2.4,harmful:true},
  parking:{label:'대형 주차장',cost:7,radius:2.2,harmful:true},
  channel:{label:'콘크리트 하천',cost:10,radius:2.4,harmful:true},
  lawn:{label:'잔디공원',cost:9,radius:2.1,harmful:true},
  plantation:{label:'단일수종 조림',cost:10,radius:2.2,harmful:true},
  purifier:{label:'토양 정화기',cost:18,radius:2.65},
  waterfilter:{label:'하천 정화기',cost:22,radius:3.25},
  wetland:{label:'습지 씨앗',cost:16,radius:1.85,phase:2},
  forest:{label:'숲 묘목장',cost:16,radius:1.8,phase:2},
  meadow:{label:'꽃초원 씨앗',cost:14,radius:1.9,phase:2},
  recycler:{label:'회수선',cost:0,radius:9.2,phase:4}
};
const SCENARIOS={
  valley:{name:'마른 강의 골짜기',riverWidth:1,waterPollution:.72,landPollution:.68,windBias:.05},
  marsh:{name:'검은 물 습지',riverWidth:2,waterPollution:.94,landPollution:.62,windBias:-.03},
  dust:{name:'먼지 평원',riverWidth:1,waterPollution:.66,landPollution:.88,windBias:.12}
};
const SPECIES={
  bee:{icon:'🐝',name:'야생벌'},frog:{icon:'🐸',name:'개구리'},deer:{icon:'🦌',name:'고라니'},otter:{icon:'🦦',name:'수달'}
};
const COST_REFUND=.35;
const POWER_TYPES=new Set(['wind','solar','geothermal','nuclear','coal']);
const ECO_DEMAND={purifier:8,waterfilter:10,wetland:3,forest:3,meadow:3,carfactory:12};

let scene,camera,renderer,raycaster;
let groundGroup,decorGroup,buildingGroup,animalGroup,effectGroup,previewGroup;
let tiles=[],tileMeshes=[],buildings=[],animals=[];
let selectedTool='inspect',selectedScenario='valley',phase=1,ecoPoints=130,seed=1;
let analysisMode='none',running=false,completed=false;
let cameraTarget=new THREE.Vector3(0,0,0),viewSize=17;
let hoverTile=null,previewRing=null,lastAction=null;
let rng=Math.random,tutorialIndex=-1,tutorialMode=false;
let drag={active:false,id:null,x:0,y:0,moved:false},pointers=new Map();
let toastTimer=0,saveTimer=0,elapsed=0,builtCount=0,ecologyClock=0;
let ecosystem=makeEcosystem();
const sharedLoader=new GLTFLoader(),sharedCache=new Map(),sharedPending=new Map();
const SHARED=id=>shared3DPath(id,'../../');
function normalizeShared(o,target){
  const b=new THREE.Box3().setFromObject(o),size=b.getSize(new THREE.Vector3()),mx=Math.max(size.x,size.y,size.z)||1;
  o.scale.multiplyScalar(target/mx);
  const b2=new THREE.Box3().setFromObject(o),center=b2.getCenter(new THREE.Vector3());
  o.position.x-=center.x;o.position.z-=center.z;o.position.y-=b2.min.y;
  o.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true}});
  return o;
}
function sharedModel(id,target=1){
  if(!shared3DIsApproved(id))return Promise.resolve(null);
  const url=SHARED(id);if(!url)return Promise.resolve(null);
  if(sharedCache.has(url))return Promise.resolve(normalizeShared(sharedCache.get(url).clone(true),target));
  if(!sharedPending.has(url))sharedPending.set(url,new Promise(resolve=>sharedLoader.load(url,g=>{sharedCache.set(url,g.scene);resolve(g.scene)},undefined,()=>resolve(null))));
  return sharedPending.get(url).then(base=>base?normalizeShared(base.clone(true),target):null);
}
function addSharedBiomeVisual(t){
  if(analysisMode!=='none')return;
  const rev=t.decor.userData.rev,valid=biome=>t.decor.userData.rev===rev&&analysisMode==='none'&&t.biome===biome;
  if(t.kind==='rock'){
    const id=noise(t.x,t.z)>.5?'nature.mossyRockA':'nature.rock';
    sharedModel(id,.72).then(o=>{if(!o||t.decor.userData.rev!==rev||analysisMode!=='none')return;o.rotation.y=noise(t.z,t.x)*Math.PI*2;t.decor.add(o)});
    return;
  }
  if(t.biome==='forest'){
    const ids=noise(t.x,t.z)>.5?['nature.commonTreeA','nature.pineTreeA']:['nature.commonTreeB','nature.pineTreeB'];
    Promise.all(ids.map((id,i)=>sharedModel(id,i?.72:.86))).then(list=>{if(!valid('forest'))return;list.filter(Boolean).forEach((o,i)=>{o.position.set(i?.20:-.18,0,i?-.12:.12);o.rotation.y=noise(t.x+i,t.z-i)*Math.PI*2;t.decor.add(o)})});
  }else if(t.biome==='plantation'){
    sharedModel('nature.pineTreeA',.76).then(base=>{if(!base||!valid('plantation'))return;[-.24,0,.24].forEach(x=>{const o=base.clone(true);o.position.x=x;o.scale.multiplyScalar(.62);t.decor.add(o)})});
  }else if(t.biome==='wetland'){
    sharedModel('nature.plant',.46).then(o=>{if(o&&valid('wetland')){o.rotation.y=noise(t.x,t.z)*Math.PI*2;t.decor.add(o)}});
  }else if(t.biome==='meadow'){
    sharedModel('nature.grass',.42).then(o=>{if(o&&valid('meadow')){o.position.z=.08;o.rotation.y=noise(t.x,t.z)*Math.PI*2;t.decor.add(o)}});
  }else if(t.biome==='grass'&&noise(t.x,t.z)>.72){
    sharedModel('nature.grass',.32).then(o=>{if(o&&valid('grass'))t.decor.add(o)});
  }
}
function makeEcosystem(input={}){
  return {
    carbon:Number(input.carbon||0),waste:Number(input.waste||0),industryProfit:Number(input.industryProfit||0),
    habitatStress:Number(input.habitatStress||0),waterStress:Number(input.waterStress||0),
    populations:{bee:0,frog:0,deer:0,otter:0,...(input.populations||{})},
    discovered:{...(input.discovered||{})}
  };
}
const windRotors=[];
const SAVE_KEY=window.KidscadeGame?.storageKey?.('high_ecopolis','world')||'kidscade_game_v1:high_ecopolis:world';
const BEST_KEY='kidscade_game_v1:high_ecopolis:best';

function mulberry32(a){return function(){let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function dist(a,b){return Math.hypot(a.x-b.x,a.z-b.z)}
function tileAt(x,z){return x<0||z<0||x>=COLS||z>=ROWS?null:tiles[z*COLS+x]}
function worldPos(t){return new THREE.Vector3((t.x-(COLS-1)/2)*CELL,0,(t.z-(ROWS-1)/2)*CELL)}
function nearWater(t,cleanOnly=false,range=1.5){
  return tiles.some(o=>o.kind==='water'&&(!cleanOnly||o.pollution<.25)&&dist(t,o)<=range);
}
function windAt(t){
  const edge=Math.abs(t.x-(COLS-1)/2)/(COLS/2);
  const ridge=(Math.sin((t.x+seed%17)*.63)+Math.cos((t.z+seed%13)*.49)+2)/4;
  const scenario=SCENARIOS[selectedScenario]||SCENARIOS.valley;
  return clamp(.34+edge*.28+ridge*.36+scenario.windBias,0,1);
}
function sunAt(t){
  const south=1-t.z/(ROWS-1);
  const texture=(Math.sin((t.x+seed%23)*.51)+Math.cos((t.z+seed%11)*.67)+2)/4;
  return clamp(.36+south*.28+texture*.34,0,1);
}
function geothermalAt(t){
  const h1=Math.hypot(t.x-(3+seed%5),t.z-(2+(seed>>3)%5));
  const h2=Math.hypot(t.x-(COLS-4-(seed%4)),t.z-(ROWS-4-((seed>>4)%4)));
  return clamp(Math.max(1-h1/5.2,1-h2/4.8)+.08*noise(t.x,t.z),0,1);
}
function pct(n,d){return d?Math.round(n/d*100):0}

function initThree(){
  scene=new THREE.Scene();
  scene.background=new THREE.Color(0xb9d9ca);
  scene.fog=new THREE.Fog(0xb9d9ca,18,38);
  camera=new THREE.OrthographicCamera(-12,12,8,-8,.1,100);
  camera.position.set(13,16,14);camera.lookAt(0,0,0);
  renderer=new THREE.WebGLRenderer({canvas:$('game'),antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  raycaster=new THREE.Raycaster();

  scene.add(new THREE.HemisphereLight(0xeafff4,0x486553,2.15));
  const sun=new THREE.DirectionalLight(0xfff2d2,2.45);sun.position.set(-10,18,8);sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-20;sun.shadow.camera.right=20;sun.shadow.camera.top=20;sun.shadow.camera.bottom=-20;scene.add(sun);

  groundGroup=new THREE.Group();decorGroup=new THREE.Group();buildingGroup=new THREE.Group();animalGroup=new THREE.Group();effectGroup=new THREE.Group();previewGroup=new THREE.Group();
  scene.add(groundGroup,decorGroup,buildingGroup,animalGroup,effectGroup,previewGroup);
  const base=new THREE.Mesh(new THREE.CylinderGeometry(15,17,1.1,6),new THREE.MeshStandardMaterial({color:0x6c8e72,roughness:1}));
  base.position.y=-.75;base.scale.z=.78;base.receiveShadow=true;scene.add(base);
  previewRing=new THREE.Mesh(new THREE.RingGeometry(.83,.92,44),new THREE.MeshBasicMaterial({color:0xbfffb4,transparent:true,opacity:.65,side:THREE.DoubleSide,depthWrite:false}));
  previewRing.rotation.x=-Math.PI/2;previewRing.visible=false;previewGroup.add(previewRing);
  resize();
}
function resize(){
  const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);
  const aspect=w/h;camera.left=-viewSize*aspect/2;camera.right=viewSize*aspect/2;camera.top=viewSize/2;camera.bottom=-viewSize/2;camera.updateProjectionMatrix();
}
addEventListener('resize',resize);

const geo={
  tile:new THREE.BoxGeometry(CELL*.96,.22,CELL*.96),
  trunk:new THREE.CylinderGeometry(.07,.09,.42,6), crown:new THREE.ConeGeometry(.27,.65,7),
  flower:new THREE.SphereGeometry(.055,7,5),reed:new THREE.CylinderGeometry(.025,.035,.42,5),
  mast:new THREE.CylinderGeometry(.06,.1,1.8,8),hub:new THREE.SphereGeometry(.13,10,8),blade:new THREE.BoxGeometry(.07,.78,.04),
  box:new THREE.BoxGeometry(.62,.48,.62),pipe:new THREE.CylinderGeometry(.08,.08,.58,8),
  animalBody:new THREE.SphereGeometry(.22,10,8),animalHead:new THREE.SphereGeometry(.14,9,7)
};
const mat={
  soil:new THREE.MeshStandardMaterial({color:0x81725a,roughness:1}),grass:new THREE.MeshStandardMaterial({color:0x69a95f,roughness:1}),
  water:new THREE.MeshStandardMaterial({color:0x506f72,roughness:.55,metalness:.08}),cleanWater:new THREE.MeshStandardMaterial({color:0x5bb7c2,roughness:.35}),
  rock:new THREE.MeshStandardMaterial({color:0x77786e,roughness:1}),wetland:new THREE.MeshStandardMaterial({color:0x729e67,roughness:1}),
  forest:new THREE.MeshStandardMaterial({color:0x3d8154,roughness:1}),meadow:new THREE.MeshStandardMaterial({color:0x8dbf64,roughness:1}),
  trunk:new THREE.MeshStandardMaterial({color:0x77543b}),leaf:new THREE.MeshStandardMaterial({color:0x3c8f55}),dead:new THREE.MeshStandardMaterial({color:0x5e5146}),
  white:new THREE.MeshStandardMaterial({color:0xeaf1ec,metalness:.15,roughness:.55}),green:new THREE.MeshStandardMaterial({color:0x62d18b,roughness:.5}),
  blue:new THREE.MeshStandardMaterial({color:0x58aeca,roughness:.45}),yellow:new THREE.MeshStandardMaterial({color:0xf0d364}),dark:new THREE.MeshStandardMaterial({color:0x334640,roughness:.6}),
  flower:new THREE.MeshStandardMaterial({color:0xf0d96a}),pink:new THREE.MeshStandardMaterial({color:0xf08ba1}),animal:new THREE.MeshStandardMaterial({color:0xc99562,roughness:.8})
};

function clearGroup(g){while(g.children.length)g.remove(g.children[0])}
function generateWorld(worldSeed=Math.floor(Math.random()*1e9)){
  seed=worldSeed;rng=mulberry32(seed);tiles=[];tileMeshes=[];buildings=[];animals=[];windRotors.length=0;
  clearGroup(groundGroup);clearGroup(decorGroup);clearGroup(buildingGroup);clearGroup(animalGroup);clearGroup(effectGroup);
  const sc=SCENARIOS[selectedScenario]||SCENARIOS.valley;
  const riverPhase=rng()*Math.PI*2;
  for(let z=0;z<ROWS;z++)for(let x=0;x<COLS;x++){
    const center=(ROWS-1)/2+Math.sin(x*.56+riverPhase)*1.55+Math.sin(x*.19+riverPhase*.5)*.8;
    const water=Math.abs(z-center)<=sc.riverWidth+.15*Math.sin(x*.8);
    const edgeRock=!water&&(x<2||x>COLS-3||z<2||z>ROWS-3)&&rng()<.28;
    const t={x,z,kind:water?'water':edgeRock?'rock':'land',biome:water?'water':'barren',pollution:water?clamp(sc.waterPollution+(rng()-.5)*.16,0,1):edgeRock?0:clamp(sc.landPollution+(rng()-.5)*.25,0,1),moisture:water?1:0,mesh:null,decor:new THREE.Group()};
    tiles.push(t);
  }
  for(const t of tiles)if(t.kind==='land')t.moisture=nearWater(t,false,1.8)?.8:clamp(.25+rng()*.25,0,1);
  tiles.forEach(createTileMesh);
  refreshAllTiles();
  resetCamera();
  updateUI();
}

function createTileMesh(t){
  const p=worldPos(t);let height=t.kind==='rock'?.42:t.kind==='water'?.08:.22;
  const m=new THREE.Mesh(geo.tile,(t.kind==='water'?mat.water:t.kind==='rock'?mat.rock:mat.soil).clone());
  m.position.set(p.x,t.kind==='water'?-.08:height*.05,p.z);
  if(t.kind==='rock')m.scale.y=2.4;
  m.receiveShadow=true;m.castShadow=t.kind==='rock';m.userData.tile=t;groundGroup.add(m);tileMeshes.push(m);t.mesh=m;
  decorGroup.add(t.decor);
}
function refreshAllTiles(){tiles.forEach(refreshTileVisual)}
function refreshTileVisual(t){
  let hex=0x81725a;
  if(t.kind==='water'){
    const c=new THREE.Color(0x5bb7c2).lerp(new THREE.Color(0x4b514d),clamp(t.pollution,0,1));hex=c.getHex();
  }
  else if(t.kind==='rock')hex=0x77786e;
  else {
    const base=t.biome==='grass'?0x69a95f:t.biome==='wetland'?0x729e67:t.biome==='forest'?0x3d8154:t.biome==='meadow'?0x8dbf64:t.biome==='lawn'?0x76b95b:t.biome==='plantation'?0x4f8c50:t.biome==='paved'?0x686d70:0x81725a;
    const c=new THREE.Color(base),dirty=new THREE.Color(0x6d5f4f);c.lerp(dirty,t.pollution*.48);hex=c.getHex();
  }
  if(analysisMode==='wind'&&t.kind!=='water'){
    const c=new THREE.Color(0x273d5a).lerp(new THREE.Color(0xa8efff),windAt(t));hex=c.getHex();
  }
  if(analysisMode==='sun'&&t.kind!=='water'){
    const c=new THREE.Color(0x4b5360).lerp(new THREE.Color(0xffe87a),sunAt(t));hex=c.getHex();
  }
  if(analysisMode==='geo'&&t.kind!=='water'){
    const c=new THREE.Color(0x39424b).lerp(new THREE.Color(0xff8c58),geothermalAt(t));hex=c.getHex();
  }
  if(analysisMode==='pollution'&&t.kind!=='rock'){
    const c=new THREE.Color(0x4fc988).lerp(new THREE.Color(0xb74f46),t.pollution);hex=c.getHex();
  }
  t.mesh.material.color.setHex(hex);
  rebuildDecor(t);
}
function rebuildDecor(t){
  clearGroup(t.decor);t.decor.userData.rev=(t.decor.userData.rev||0)+1;const p=worldPos(t);t.decor.position.set(p.x,.12,p.z);
  if(analysisMode!=='none')return;
  if(t.kind==='land'&&t.biome==='barren'&&t.pollution>.55){
    const stick=new THREE.Mesh(new THREE.CylinderGeometry(.025,.04,.38,5),mat.dead);stick.rotation.z=.45;stick.position.set((noise(t.x,t.z)-.5)*.45,.18,(noise(t.z,t.x)-.5)*.45);t.decor.add(stick);
  }
  if(t.biome==='forest'){
    const g=treeModel();g.scale.setScalar(.52);g.position.set(-.12,0,.08);t.decor.add(g);
  }else if(t.biome==='plantation'){
    for(let i=-1;i<=1;i++){const g=treeModel();g.scale.setScalar(.42);g.position.set(i*.25,0,0);t.decor.add(g)}
  }else if(t.biome==='lawn'){
    for(let i=0;i<3;i++){const blade=new THREE.Mesh(new THREE.BoxGeometry(.03,.13,.03),mat.leaf);blade.position.set((i-1)*.18,.06,0);t.decor.add(blade)}
  }else if(t.biome==='paved'){
    const slab=new THREE.Mesh(new THREE.BoxGeometry(.82,.035,.82),mat.dark);slab.position.y=.04;t.decor.add(slab);
  }else if(t.biome==='meadow'){
    for(let i=0;i<3;i++){const stem=new THREE.Mesh(geo.reed,mat.leaf);stem.scale.y=.35;stem.position.set((noise(t.x+i,t.z)-.5)*.65,.08,(noise(t.z+i,t.x)-.5)*.65);const f=new THREE.Mesh(geo.flower,i%2?mat.flower:mat.pink);f.position.set(stem.position.x,.18,stem.position.z);t.decor.add(stem,f)}
  }else if(t.biome==='wetland'){
    for(let i=0;i<3;i++){const r=new THREE.Mesh(geo.reed,mat.leaf);r.position.set((noise(t.x+i,t.z)-.5)*.55,.18,(noise(t.z,t.x+i)-.5)*.55);r.scale.y=.58;t.decor.add(r)}
  }
  addSharedBiomeVisual(t);
}
function noise(a,b){const x=Math.sin((a*12.9898+b*78.233+seed*.001))*43758.5453;return x-Math.floor(x)}
function treeModel(){
  const g=new THREE.Group(),tr=new THREE.Mesh(geo.trunk,mat.trunk),cr=new THREE.Mesh(geo.crown,mat.leaf);tr.position.y=.2;cr.position.y=.68;tr.castShadow=cr.castShadow=true;g.add(tr,cr);return g;
}

function buildModel(type,t){
  const g=new THREE.Group(),p=worldPos(t);g.position.set(p.x,.2,p.z);g.userData.type=type;
  if(type==='wind'){
    const mast=new THREE.Mesh(geo.mast,mat.white);mast.position.y=.9;const hub=new THREE.Mesh(geo.hub,mat.dark);hub.position.set(0,1.62,0);const rotor=new THREE.Group();rotor.position.set(0,1.62,.08);
    for(let i=0;i<3;i++){const b=new THREE.Mesh(geo.blade,mat.white);b.position.y=.38;b.rotation.z=.06;const arm=new THREE.Group();arm.rotation.z=i*Math.PI*2/3;arm.add(b);rotor.add(arm)}
    const powerRing=new THREE.Mesh(new THREE.RingGeometry(TOOL.wind.radius*CELL*.98,TOOL.wind.radius*CELL,64),new THREE.MeshBasicMaterial({color:0xbdf6ff,transparent:true,opacity:.11,side:THREE.DoubleSide,depthWrite:false}));
    powerRing.rotation.x=-Math.PI/2;powerRing.position.y=-.12;windRotors.push(rotor);g.add(mast,hub,rotor,powerRing);
  }else if(type==='solar'){
    const base=new THREE.Mesh(new THREE.BoxGeometry(.75,.12,.65),mat.dark);base.position.y=.12;
    for(let i=-1;i<=1;i+=2){const panel=new THREE.Mesh(new THREE.BoxGeometry(.34,.035,.7),mat.blue);panel.position.set(i*.2,.36,0);panel.rotation.x=-.35;g.add(panel)}g.add(base);
  }else if(type==='geothermal'){
    const base=new THREE.Mesh(new THREE.CylinderGeometry(.36,.45,.24,10),mat.dark);base.position.y=.12;
    const pipe1=new THREE.Mesh(geo.pipe,mat.white),pipe2=new THREE.Mesh(geo.pipe,mat.white);pipe1.position.set(-.13,.48,0);pipe2.position.set(.13,.48,0);g.add(base,pipe1,pipe2);
  }else if(type==='nuclear'){
    const base=new THREE.Mesh(new THREE.BoxGeometry(.9,.22,.72),mat.white);base.position.y=.12;
    for(const x of [-.22,.22]){const tower=new THREE.Mesh(new THREE.CylinderGeometry(.18,.27,.72,12),mat.white);tower.position.set(x,.55,0);g.add(tower)}g.add(base);
  }else if(type==='coal'){
    const base=new THREE.Mesh(new THREE.BoxGeometry(.9,.5,.72),mat.dark);base.position.y=.25;
    for(const x of [-.23,.23]){const stack=new THREE.Mesh(new THREE.CylinderGeometry(.08,.1,.85,8),mat.trunk);stack.position.set(x,.82,0);g.add(stack)}g.add(base);
  }else if(type==='carfactory'){
    const base=new THREE.Mesh(new THREE.BoxGeometry(1.0,.48,.82),mat.dark);base.position.y=.24;
    const roof=new THREE.Mesh(new THREE.BoxGeometry(.9,.08,.72),mat.blue);roof.position.y=.52;g.add(base,roof);
  }else if(type==='landfill'){
    const pit=new THREE.Mesh(new THREE.BoxGeometry(.95,.18,.82),mat.dark);pit.position.y=.08;
    for(let i=0;i<4;i++){const bag=new THREE.Mesh(new THREE.SphereGeometry(.11,7,5),i%2?mat.yellow:mat.trunk);bag.scale.y=.65;bag.position.set((i%2-.5)*.36,.23,(Math.floor(i/2)-.5)*.3);g.add(bag)}g.add(pit);
  }else if(type==='quarry'){
    const pit=new THREE.Mesh(new THREE.CylinderGeometry(.46,.3,.2,10),mat.rock);pit.position.y=.02;
    for(let i=0;i<3;i++){const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(.15,0),mat.rock);rock.position.set((i-1)*.22,.2,(i%2)*.18-.08);g.add(rock)}g.add(pit);
  }else if(type==='parking'){
    const slab=new THREE.Mesh(new THREE.BoxGeometry(1.0,.08,.86),mat.dark);slab.position.y=.04;
    for(const x of [-.3,0,.3]){const line=new THREE.Mesh(new THREE.BoxGeometry(.025,.012,.72),mat.white);line.position.set(x,.09,0);g.add(line)}g.add(slab);
  }else if(type==='channel'){
    const wall1=new THREE.Mesh(new THREE.BoxGeometry(.95,.18,.12),mat.white),wall2=wall1.clone();wall1.position.set(0,.09,-.34);wall2.position.set(0,.09,.34);g.add(wall1,wall2);
  }else if(type==='lawn'){
    const pad=new THREE.Mesh(new THREE.CylinderGeometry(.46,.46,.09,18),mat.green);pad.position.y=.05;g.add(pad);
  }else if(type==='plantation'){
    for(const x of [-.25,0,.25]){const tr=treeModel();tr.scale.setScalar(.65);tr.position.set(x,.05,0);g.add(tr)}
  }else if(type==='purifier'){
    const box=new THREE.Mesh(geo.box,mat.green);box.position.y=.27;const chimney=new THREE.Mesh(geo.pipe,mat.white);chimney.position.set(.18,.7,.12);g.add(box,chimney);
  }else if(type==='waterfilter'){
    const box=new THREE.Mesh(geo.box,mat.blue);box.position.y=.27;const pipe=new THREE.Mesh(geo.pipe,mat.dark);pipe.rotation.z=Math.PI/2;pipe.position.set(.35,.25,0);g.add(box,pipe);
  }else if(type==='wetland'||type==='forest'||type==='meadow'){
    const pad=new THREE.Mesh(new THREE.CylinderGeometry(.4,.46,.2,8),type==='wetland'?mat.blue:type==='forest'?mat.green:mat.yellow);pad.position.y=.1;g.add(pad);
    if(type==='forest'){const tr=treeModel();tr.scale.setScalar(.7);tr.position.y=.2;g.add(tr)}
    else if(type==='wetland'){for(let i=-1;i<=1;i++){const r=new THREE.Mesh(geo.reed,mat.leaf);r.position.set(i*.12,.32,0);g.add(r)}}
    else{for(let i=-1;i<=1;i++){const f=new THREE.Mesh(geo.flower,i?mat.flower:mat.pink);f.position.set(i*.15,.3,0);g.add(f)}}
  }else if(type==='recycler'){
    const hull=new THREE.Mesh(new THREE.BoxGeometry(.9,.25,.48),mat.blue);hull.position.y=.1;const cabin=new THREE.Mesh(new THREE.BoxGeometry(.38,.28,.32),mat.white);cabin.position.set(-.1,.34,0);g.add(hull,cabin);
  }
  g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});buildingGroup.add(g);return g;
}
function generatorOutput(b){
  const def=TOOL[b.type]||{};if(!POWER_TYPES.has(b.type))return 0;
  const t=tileAt(b.x,b.z);if(!t)return 0;
  if(b.type==='wind')return def.power*(.72+.28*windAt(t));
  if(b.type==='solar')return def.power*(.6+.4*sunAt(t));
  if(b.type==='geothermal')return def.power*(.75+.25*geothermalAt(t));
  return def.power||0;
}
function generatorRadius(b){
  const t=tileAt(b.x,b.z),def=TOOL[b.type]||{};
  if(b.type==='wind')return def.radius*(.88+.22*windAt(t));
  return def.radius||0;
}
function powered(t){return buildings.some(b=>POWER_TYPES.has(b.type)&&generatorOutput(b)>0&&dist(t,b)<=generatorRadius(b))}
function energySummary(){
  const supply=buildings.reduce((s,b)=>s+generatorOutput(b),0);
  const demand=buildings.reduce((s,b)=>s+(ECO_DEMAND[b.type]||0),0);
  return {supply:Math.round(supply),demand,net:Math.round(supply-demand)};
}
function hasBuilding(t){return buildings.some(b=>b.x===t.x&&b.z===t.z)}
function placementReason(type,t){
  const def=TOOL[type];if(!t)return '지도 안쪽을 선택하세요.';
  if(def?.phase&&phase<def.phase)return '아직 잠긴 도구예요.';
  if(type!=='inspect'&&ecoPoints<(def?.cost||0))return '에코 포인트가 부족해요.';
  if(type==='inspect')return '';
  if(type==='recycler'){
    if(phase<4)return '동물들이 돌아온 뒤에 철수할 수 있어요.';
    if(t.kind!=='water'||t.pollution>=.25)return '회수선은 깨끗해진 강에만 띄울 수 있어요.';
    return '';
  }
  if(t.kind!=='land')return t.kind==='rock'?'바위 지형에는 설치할 수 없어요.':'물 위에는 설치할 수 없어요.';
  if(hasBuilding(t))return '이미 시설이 있는 칸이에요.';
  if(type==='wind'&&windAt(t)<.35)return '바람이 너무 약해요. 🌬 지도를 확인하세요.';
  if(type==='solar'&&sunAt(t)<.5)return '햇빛이 부족해요. ☀️ 지도를 확인하세요.';
  if(type==='geothermal'&&geothermalAt(t)<.62)return '지열이 약한 곳이에요. ♨️ 지도를 확인하세요.';
  if(type==='nuclear'&&!nearWater(t,false,2.3))return '원자력 발전소는 냉각수를 확보할 수 있는 물가 가까이에 지어야 해요.';
  if(type==='channel'&&!nearWater(t,false,1.35))return '하천 바로 옆에서만 정비할 수 있어요.';
  if(type==='lawn'&&t.biome==='barren')return '잔디공원은 이미 정화된 땅에 조성해야 해요.';
  if(type==='plantation'&&t.biome==='barren')return '조림지는 이미 정화된 땅에 조성해야 해요.';
  if(['purifier','waterfilter','wetland','forest','meadow','carfactory'].includes(type)&&!powered(t))return '발전소의 전력 범위 밖이에요.';
  if(type==='waterfilter'&&!nearWater(t,false,1.6))return '강가에 붙여 설치해야 해요.';
  if(['wetland','forest','meadow'].includes(type)&&t.biome!=='grass')return '먼저 토양을 정화해 초원으로 만들어야 해요.';
  if(type==='wetland'&&!nearWater(t,true,1.7))return '깨끗한 물가의 초원에서만 습지를 만들 수 있어요.';
  if(type==='forest'&&nearWater(t,true,1.05))return '물 바로 옆은 습지에 더 알맞아요. 숲은 조금 떨어진 초원을 골라보세요.';
  return '';
}
function placeTool(type,t,loading=false){
  if(type==='inspect'){showTileInfo(t);return false}
  if(type==='recycler'){if(!loading)return launchRecycler(t);return false}
  const reason=placementReason(type,t);if(reason&&!loading){toast(reason,'bad');sdkSound('wrong');return false}
  const def=TOOL[type];const before=loading?null:snapshot();
  if(!loading){ecoPoints-=def.cost;builtCount++;lastAction=before}
  const b={type,x:t.x,z:t.z,mesh:buildModel(type,t)};buildings.push(b);
  if(!loading){
    if(type==='purifier')purifyLand(t,def.radius);
    if(type==='waterfilter')purifyWater(t,def.radius);
    if(type==='wetland')seedBiome(t,'wetland',def.radius);
    if(type==='forest')seedBiome(t,'forest',def.radius);
    if(type==='meadow')seedBiome(t,'meadow',def.radius);
    if(type==='coal'){ecosystem.carbon+=8;polluteAround(t,2.8,.10);toast('전력은 크게 늘었지만 탄소와 주변 오염이 시작됐어요.','bad',3300)}
    if(type==='carfactory'){ecosystem.carbon+=4;polluteAround(t,2.1,.06);toast('공장은 수익을 내지만 주변 생태계에 부담을 줍니다.','bad',3300)}
    if(type==='landfill'){ecoPoints+=10;ecosystem.habitatStress+=8;polluteAround(t,2.8,.13);toast('처리 예산 +10P. 하지만 땅과 물로 오염이 번지기 시작합니다.','bad',3300)}
    if(type==='quarry'){ecoPoints+=8;ecosystem.habitatStress+=12;scarLand(t,2.0);toast('자원 판매 +8P. 주변 서식지가 깎여 나갔어요.','bad',3300)}
    if(type==='parking'){ecoPoints+=6;ecosystem.habitatStress+=10;ecosystem.carbon+=3;paveLand(t,1.7);toast('개발 수익 +6P. 흙이 포장되어 빗물이 스며들 곳이 줄었어요.','bad',3300)}
    if(type==='channel'){ecoPoints+=4;concreteChannel(t,2.2);ecosystem.habitatStress+=12;toast('물이 금방 정리됐지만 습지와 물가 서식처가 사라졌어요.','bad',3400)}
    if(type==='lawn'){quickGreen(t,'lawn',2.0);ecosystem.waterStress+=10;ecosystem.habitatStress+=6;toast('금방 초록색이 됐지만 먹이와 숨을 곳이 적은 잔디밭이에요.','bad',3400)}
    if(type==='plantation'){quickGreen(t,'plantation',2.0);ecosystem.carbon=Math.max(0,ecosystem.carbon-5);ecosystem.habitatStress+=8;toast('나무가 빠르게 늘었지만 한 종류뿐이라 다양한 생물이 살기 어렵습니다.','bad',3400)}
    if(type==='nuclear'){ecosystem.waste+=4;toast('큰 저탄소 전력을 확보했어요. 사용후 연료 관리 부담도 생깁니다.','good',3200)}
    pulse(t,type==='waterfilter'?0x6cd8f0:POWER_TYPES.has(type)?0xe9fff2:(['coal','carfactory','landfill','quarry','parking','channel'].includes(type)?0xff806d:0x9cf29c),def.radius||1.2);
    sdkSound('click');checkProgress();saveGame();updateUI();
  }
  return true;
}
function purifyLand(center,r){
  let changed=0;
  tiles.forEach(t=>{if(t.kind==='land'&&dist(t,center)<=r&&t.kind!=='rock'){const was=t.biome!=='barren'&&t.pollution<.25;t.pollution=Math.min(t.pollution,.08);if(t.biome==='barren')t.biome='grass';if(!was)changed++;refreshTileVisual(t)}});
  ecoPoints+=changed*2;toast('토양 '+changed+'칸이 살아났어요 · +'+changed*2+'P','good');
}
function purifyWater(center,r){
  let water=0,bank=0;
  tiles.forEach(t=>{const d=dist(t,center);if(t.kind==='water'&&d<=r){const was=t.pollution<.25;t.pollution=Math.min(t.pollution,.06);if(!was)water++;refreshTileVisual(t)}
    else if(t.kind==='land'&&d<=r*.65){const old=t.pollution;t.pollution=Math.min(t.pollution,.24);if(t.biome==='barren'&&t.pollution<.25)t.biome='grass';if(old>=.25&&t.pollution<.25)bank++;refreshTileVisual(t)}
  });
  const gain=water*2+bank;ecoPoints+=gain;toast('강 '+water+'칸과 둔치를 정화했어요 · +'+gain+'P','good');
}
function seedBiome(center,biome,r){
  let changed=0;
  tiles.forEach(t=>{if(t.kind==='land'&&t.biome==='grass'&&t.pollution<.25&&dist(t,center)<=r){
    if(biome==='wetland'&&!nearWater(t,true,1.75))return;
    if(biome==='forest'&&nearWater(t,true,.95))return;
    t.biome=biome;t.pollution=Math.min(t.pollution,.05);changed++;refreshTileVisual(t)
  }});
  ecoPoints+=changed;toast((biome==='forest'?'숲':biome==='wetland'?'습지':'꽃초원')+' '+changed+'칸이 생겼어요 · +'+changed+'P','good');
}
function scarLand(center,r){
  tiles.forEach(t=>{if(t.kind!=='land'||dist(t,center)>r)return;t.biome='barren';t.pollution=clamp(t.pollution+.08,0,1);refreshTileVisual(t)});
}
function paveLand(center,r){
  tiles.forEach(t=>{if(t.kind!=='land'||dist(t,center)>r)return;t.biome='paved';t.pollution=clamp(t.pollution+.04,0,1);t.moisture=Math.max(0,t.moisture-.45);refreshTileVisual(t)});
}
function quickGreen(center,biome,r){
  tiles.forEach(t=>{if(t.kind!=='land'||dist(t,center)>r||t.pollution>=.35)return;t.biome=biome;refreshTileVisual(t)});
}
function concreteChannel(center,r){
  tiles.forEach(t=>{if(dist(t,center)>r)return;
    if(t.kind==='water'){t.pollution=Math.max(0,t.pollution-.28)}
    if(t.kind==='land'&&t.biome==='wetland')t.biome='grass';
    refreshTileVisual(t);
  });
  ecosystem.populations.frog=Math.max(0,ecosystem.populations.frog-14);
  ecosystem.populations.otter=Math.max(0,ecosystem.populations.otter-12);
}
function polluteAround(center,r,amount){
  tiles.forEach(t=>{const d=dist(t,center);if(d>r||t.kind==='rock')return;const factor=1-d/r;
    t.pollution=clamp(t.pollution+amount*factor,0,1);
    if(t.kind==='land'&&t.pollution>.55&&['forest','wetland','meadow'].includes(t.biome))t.biome='grass';
    if(t.kind==='land'&&t.pollution>.78)t.biome='barren';
    refreshTileVisual(t);
  });
}
function removeSpecies(species){
  const gone=animals.filter(a=>a.species===species);gone.forEach(a=>animalGroup.remove(a.mesh));animals=animals.filter(a=>a.species!==species);
  if(gone.length)toast(SPECIES[species].icon+' '+SPECIES[species].name+'이(가) 서식지를 떠났어요.','bad',3000);
}
function ecologyTick(){
  const byType=type=>buildings.filter(b=>b.type===type);
  byType('coal').forEach(b=>{const t=tileAt(b.x,b.z);ecosystem.carbon+=1.9;ecoPoints+=1;polluteAround(t,2.8,.018)});
  byType('carfactory').forEach(b=>{const t=tileAt(b.x,b.z);if(powered(t)){ecosystem.carbon+=1.15;ecosystem.industryProfit+=3;ecoPoints+=3;polluteAround(t,2.25,.013)}});
  byType('landfill').forEach(b=>{ecoPoints+=1;ecosystem.habitatStress+=.7;polluteAround(tileAt(b.x,b.z),2.8,.012)});
  byType('quarry').forEach(b=>{ecoPoints+=2;ecosystem.habitatStress+=.9;scarLand(tileAt(b.x,b.z),1.25)});
  byType('parking').forEach(b=>{ecoPoints+=1;ecosystem.carbon+=.45;ecosystem.habitatStress+=.65;ecosystem.waterStress+=.35});
  byType('channel').forEach(()=>{ecosystem.habitatStress+=.45});
  byType('lawn').forEach(()=>{ecosystem.waterStress+=.85;ecosystem.habitatStress+=.28});
  byType('plantation').forEach(()=>{ecosystem.carbon=Math.max(0,ecosystem.carbon-.22);ecosystem.habitatStress+=.32});
  ecosystem.waste+=byType('nuclear').length*.06;
  const forest=tiles.filter(t=>t.biome==='forest'&&t.pollution<.25).length;
  const wetland=tiles.filter(t=>t.biome==='wetland'&&t.pollution<.25).length;
  const meadow=tiles.filter(t=>t.biome==='meadow'&&t.pollution<.25).length;
  ecosystem.carbon=Math.max(0,ecosystem.carbon-forest*.035);
  ecosystem.habitatStress=Math.max(0,ecosystem.habitatStress-forest*.012-wetland*.018-meadow*.008);
  ecosystem.waterStress=Math.max(0,ecosystem.waterStress-wetland*.025);
  tiles.forEach(t=>{if(t.kind==='land'&&t.pollution<.25&&!['barren','paved'].includes(t.biome))t.pollution=Math.max(0,t.pollution-.003)});
  updateSpecies();checkProgress(false);updateUI();
}
function launchRecycler(t){
  const reason=placementReason('recycler',t);if(reason){toast(reason,'bad');return false}
  const before=snapshot();lastAction=before;const p=worldPos(t);pulse(t,0x72d9ff,TOOL.recycler.radius);
  const caught=buildings.filter(b=>Math.hypot(b.x-t.x,b.z-t.z)<=TOOL.recycler.radius);
  if(!caught.length){toast('이곳에서는 회수할 시설이 없어요. 다른 강 구간을 골라보세요.','bad');return false}
  caught.forEach(b=>{buildingGroup.remove(b.mesh);const idx=windRotors.findIndex(r=>b.mesh.children.includes(r));if(idx>=0)windRotors.splice(idx,1)});
  buildings=buildings.filter(b=>!caught.includes(b));
  const refund=Math.round(caught.reduce((s,b)=>s+(TOOL[b.type]?.cost||0),0)*COST_REFUND);ecoPoints+=refund;
  toast('회수선이 시설 '+caught.length+'개를 걷어냈어요'+(refund?' · +'+refund+'P':''),'good');sdkSound('correct');
  saveGame();updateUI();if(buildings.length===0)tryCompleteGame();return true;
}
function pulse(t,color,r){
  const p=worldPos(t),ring=new THREE.Mesh(new THREE.RingGeometry(.2,.28,48),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false}));
  ring.rotation.x=-Math.PI/2;ring.position.set(p.x,.35,p.z);ring.userData.life=1;ring.userData.radius=r;effectGroup.add(ring);
}

function counts(){
  const land=tiles.filter(t=>t.kind==='land'),water=tiles.filter(t=>t.kind==='water');
  const restored=land.filter(t=>t.pollution<.25&&!['barren','paved'].includes(t.biome)).length,clean=water.filter(t=>t.pollution<.25).length;
  const forest=land.filter(t=>t.biome==='forest').length,wetland=land.filter(t=>t.biome==='wetland').length,meadow=land.filter(t=>t.biome==='meadow').length;
  return {land:land.length,water:water.length,restored,clean,restorePct:pct(restored,land.length),waterPct:pct(clean,water.length),forestPct:pct(forest,land.length),wetlandPct:pct(wetland,land.length),meadowPct:pct(meadow,land.length)};
}
function returnedSpeciesCount(){
  return Object.values(ecosystem.populations).filter(v=>v>=8).length;
}
function updateSpecies(){
  const c=counts(),pop=ecosystem.populations;
  const living=tiles.filter(t=>t.kind!=='rock'),avgPollution=living.reduce((s,t)=>s+t.pollution,0)/Math.max(1,living.length);
  const habitat=ecosystem.habitatStress,waterStress=ecosystem.waterStress;
  const target={
    bee:clamp(c.meadowPct*4.2-ecosystem.carbon*.23-avgPollution*28-habitat*.28-waterStress*.10,0,100),
    frog:clamp(c.wetlandPct*4+c.waterPct*.32-ecosystem.carbon*.10-avgPollution*30-habitat*.18-waterStress*.35,0,100),
    deer:clamp(c.forestPct*4+c.restorePct*.20-ecosystem.carbon*.20-avgPollution*24-habitat*.38,0,100),
    otter:clamp(c.waterPct*.48+c.wetlandPct*2+pop.frog*.18-ecosystem.carbon*.24-avgPollution*35-habitat*.18-waterStress*.28,0,100)
  };
  for(const species of Object.keys(SPECIES)){
    const delta=clamp(target[species]-pop[species],-4,4);
    pop[species]=clamp(pop[species]+delta,0,100);
    const visible=animals.some(a=>a.species===species);
    if(pop[species]>=8&&!visible)spawnAnimal(species);
    if(pop[species]<4&&visible)removeSpecies(species);
  }
}
function spawnAnimal(species,loadingPos=null){
  const habitat=species==='bee'?'meadow':species==='frog'?'wetland':species==='deer'?'forest':'water';
  const options=tiles.filter(t=>(habitat==='water'?t.kind==='water'&&t.pollution<.25:t.biome===habitat));
  if(!options.length)return;
  const t=loadingPos?tileAt(loadingPos.x,loadingPos.z):options[Math.floor(rng()*options.length)];
  const p=worldPos(t),g=animalModel(species);g.position.set(p.x,.48,p.z);animalGroup.add(g);
  animals.push({species,x:t.x,z:t.z,mesh:g,phase:rng()*Math.PI*2});
  if(!loadingPos&&!ecosystem.discovered[species]){ecosystem.discovered[species]=true;ecoPoints+=12;toast(SPECIES[species].icon+' '+SPECIES[species].name+'이(가) 돌아왔어요! · +12P','good');sdkSound('correct')}
}
function animalModel(species){
  const g=new THREE.Group();
  if(species==='bee'){
    const body=new THREE.Mesh(new THREE.SphereGeometry(.13,8,6),mat.yellow);body.scale.set(1.4,.8,.8);g.add(body);
    const wingMat=new THREE.MeshStandardMaterial({color:0xdff7ff,transparent:true,opacity:.75});for(const s of [-1,1]){const w=new THREE.Mesh(new THREE.SphereGeometry(.1,8,5),wingMat);w.scale.set(.45,.2,1);w.position.set(0,.1,s*.13);g.add(w)}
  }else{
    const body=new THREE.Mesh(geo.animalBody,species==='frog'?mat.green:species==='otter'?mat.trunk:mat.animal);body.scale.set(1.3,.7,.7);const head=new THREE.Mesh(geo.animalHead,body.material);head.position.set(.28,.09,0);g.add(body,head);
    if(species==='deer'){for(const s of [-1,1]){const leg=new THREE.Mesh(new THREE.CylinderGeometry(.025,.03,.32,5),mat.trunk);leg.position.set(s*.15,-.2,0);g.add(leg)}}
  }
  g.traverse(o=>{if(o.isMesh)o.castShadow=true});return g;
}
function checkProgress(announce=true){
  const c=counts();
  if(phase===1&&c.restorePct>=50&&c.waterPct>=55){phase=2;if(announce)unlockToast('2단계 시작! 이제 초원을 여러 생태계로 나눠보세요.')}
  if(phase===2&&c.forestPct>=10&&c.wetlandPct>=8&&c.meadowPct>=8){phase=3;if(announce)unlockToast('3단계 시작! 조건이 맞는 동물들이 스스로 돌아옵니다.')}
  if(phase>=2)updateSpecies();
  if(phase===3&&returnedSpeciesCount()>=4){phase=4;if(announce)unlockToast('마지막 단계! 이제 시설을 모두 회수하고 자연만 남기세요.')}
  updateUI();
}
function unlockToast(msg){toast(msg,'good',3800);sdkSound('success');saveGame()}

function updateUI(){
  const c=counts(),energy=energySummary();ui.phaseName.textContent=PHASES[phase-1].name;ui.ecoPoints.textContent=ecoPoints;
  ui.energyRate.textContent=energy.supply+' / '+energy.demand+' ⚡';ui.carbonRate.textContent=Math.round(ecosystem.carbon);
  ui.carbonRate.classList.toggle('warning',ecosystem.carbon>=45&&ecosystem.carbon<85);ui.carbonRate.classList.toggle('danger',ecosystem.carbon>=85);
  ui.restoreRate.textContent=c.restorePct+'%';ui.waterRate.textContent=c.waterPct+'%';ui.bioRate.textContent=returnedSpeciesCount()+'/4';
  ui.missionKicker.textContent='PHASE '+phase;ui.missionTitle.textContent=PHASES[phase-1].title;ui.missionText.textContent=PHASES[phase-1].text;
  const objs=phase===1?[
    ['땅 복원',c.restorePct,50,'%'],['깨끗한 물',c.waterPct,55,'%']
  ]:phase===2?[
    ['숲',c.forestPct,10,'%'],['습지',c.wetlandPct,8,'%'],['꽃초원',c.meadowPct,8,'%']
  ]:phase===3?[
    ['돌아온 동물',animals.length,4,'종'],['깨끗한 물',c.waterPct,70,'%']
  ]:[['남은 시설',Math.max(0,buildings.length),0,'개',true]];
  ui.objectives.innerHTML=objs.map(o=>{
    const current=o[1],goal=o[2],reverse=o[4];const done=reverse?current<=goal:current>=goal;const width=reverse?(done?100:Math.max(5,100-current*10)):clamp(current/goal*100,0,100);
    return '<div class="objective"><div class="objectiveTop"><span>'+(done?'✓ ':'')+o[0]+'</span><b>'+current+o[3]+' / '+goal+o[3]+'</b></div><div class="bar"><i style="width:'+width+'%"></i></div></div>'
  }).join('');
  ui.speciesRow.innerHTML=Object.entries(SPECIES).map(([id,s])=>{const p=Math.round(ecosystem.populations[id]||0),found=p>=8;return '<div class="species '+(found?'found':'')+'" title="'+s.name+' 개체수 '+p+'"><span>'+(found?s.icon:'？')+'</span><small>'+p+'</small></div>'}).join('');
  document.querySelectorAll('.tool').forEach(btn=>{
    const def=TOOL[btn.dataset.tool];const locked=def?.phase&&phase<def.phase;btn.classList.toggle('locked',!!locked);btn.disabled=!!locked;btn.classList.toggle('active',btn.dataset.tool===selectedTool);
  });
  if(TOOL[selectedTool]?.phase&&phase<TOOL[selectedTool].phase)selectTool('inspect');
}
function showTileInfo(t){
  if(!t){ui.tileInfo.classList.add('hidden');return}
  const wind=Math.round(windAt(t)*100),sun=Math.round(sunAt(t)*100),geo=Math.round(geothermalAt(t)*100),bld=buildings.find(b=>b.x===t.x&&b.z===t.z);
  const biome=t.kind==='water'?(t.pollution<.25?'깨끗한 강':'오염된 강'):t.kind==='rock'?'바위':({barren:'메마른 땅',grass:'초원',wetland:'습지',forest:'숲',meadow:'꽃초원',lawn:'잔디밭',plantation:'단일수종 조림지',paved:'포장지'}[t.biome]||t.biome);
  ui.tileInfo.innerHTML='<b>'+biome+'</b><br>오염 '+Math.round(t.pollution*100)+'% · 바람 '+wind+'% · 햇빛 '+sun+'% · 지열 '+geo+'%'+(bld?'<br>시설: '+TOOL[bld.type].label:'')+(powered(t)?'<br>⚡ 전력 범위 안':'');
  ui.tileInfo.classList.remove('hidden');
}
function selectTool(type){
  if(!TOOL[type])return;if(TOOL[type].phase&&phase<TOOL[type].phase)return;
  selectedTool=type;document.querySelectorAll('.tool').forEach(b=>b.classList.toggle('active',b.dataset.tool===type));updatePreview();
}
function toggleAnalysis(mode){
  analysisMode=analysisMode===mode?'none':mode;ui.windViewBtn.classList.toggle('active',analysisMode==='wind');ui.sunViewBtn.classList.toggle('active',analysisMode==='sun');ui.geoViewBtn.classList.toggle('active',analysisMode==='geo');ui.pollutionViewBtn.classList.toggle('active',analysisMode==='pollution');
  ui.mapLegend.classList.toggle('hidden',analysisMode==='none');
  ui.mapLegend.innerHTML=analysisMode==='wind'?'<b>🌬 바람 지도</b> 어두움 = 약함 · 밝음 = 강함':analysisMode==='sun'?'<b>☀️ 햇빛 지도</b> 어두움 = 약함 · 밝음 = 강함':analysisMode==='geo'?'<b>♨️ 지열 지도</b> 어두움 = 약함 · 주황 = 강함':'<b>☣ 오염 지도</b> 초록 = 깨끗 · 붉음 = 오염';
  refreshAllTiles();
}
function updatePreview(){
  if(!hoverTile||selectedTool==='inspect'){previewRing.visible=false;return}
  const def=TOOL[selectedTool];previewRing.visible=true;const p=worldPos(hoverTile);previewRing.position.set(p.x,.37,p.z);const scale=Math.max(.55,def.radius*CELL);previewRing.scale.set(scale,scale,scale);
  previewRing.material.color.setHex(placementReason(selectedTool,hoverTile)?0xff806d:0xbfffb4);
}

function resetCamera(){cameraTarget.set(0,0,0);viewSize=17;applyCamera()}
function applyCamera(){
  camera.position.set(cameraTarget.x+13,cameraTarget.y+16,cameraTarget.z+14);camera.lookAt(cameraTarget);resize();
}
function screenRay(clientX,clientY){
  const rect=renderer.domElement.getBoundingClientRect(),mouse=new THREE.Vector2((clientX-rect.left)/rect.width*2-1,-((clientY-rect.top)/rect.height)*2+1);raycaster.setFromCamera(mouse,camera);return raycaster.intersectObjects(tileMeshes,false)[0]||null;
}
function hoverAt(x,y){const hit=screenRay(x,y);hoverTile=hit?.object?.userData?.tile||null;updatePreview();if(selectedTool==='inspect'&&hoverTile)showTileInfo(hoverTile)}
function handleTap(x,y){const hit=screenRay(x,y),t=hit?.object?.userData?.tile;if(!t)return;placeTool(selectedTool,t)}
function panBy(dx,dy){
  const scale=viewSize/Math.max(500,innerHeight);const right=new THREE.Vector3().setFromMatrixColumn(camera.matrix,0),up=new THREE.Vector3().setFromMatrixColumn(camera.matrix,1);
  cameraTarget.addScaledVector(right,-dx*scale);cameraTarget.addScaledVector(up,dy*scale);cameraTarget.y=0;cameraTarget.x=clamp(cameraTarget.x,-7,7);cameraTarget.z=clamp(cameraTarget.z,-5.5,5.5);applyCamera();
}
renderer.domElement.addEventListener('pointerdown',e=>{renderer.domElement.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===1)drag={active:true,id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};});
renderer.domElement.addEventListener('pointermove',e=>{
  if(pointers.has(e.pointerId))pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===2){const ps=[...pointers.values()];const d=Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y);if(renderer.domElement._pinch){const delta=d-renderer.domElement._pinch;viewSize=clamp(viewSize-delta*.018,10,25);resize()}renderer.domElement._pinch=d;return}
  if(drag.active&&e.pointerId===drag.id){const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>3)drag.moved=true;if(drag.moved)panBy(dx,dy);drag.x=e.clientX;drag.y=e.clientY}
  else hoverAt(e.clientX,e.clientY);
});
renderer.domElement.addEventListener('pointerup',e=>{const wasTap=drag.active&&e.pointerId===drag.id&&!drag.moved;if(wasTap)handleTap(e.clientX,e.clientY);pointers.delete(e.pointerId);renderer.domElement._pinch=null;if(e.pointerId===drag.id)drag.active=false;});
renderer.domElement.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);drag.active=false;renderer.domElement._pinch=null});
renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();viewSize=clamp(viewSize+Math.sign(e.deltaY)*1.1,10,25);resize()},{passive:false});
renderer.domElement.addEventListener('pointerleave',()=>{hoverTile=null;previewRing.visible=false;if(selectedTool==='inspect')ui.tileInfo.classList.add('hidden')});

function toast(msg,type='good',ms=2400){clearTimeout(toastTimer);ui.toast.textContent=msg;ui.toast.style.borderColor=type==='bad'?'rgba(255,122,110,.6)':'rgba(129,230,164,.5)';ui.toast.classList.add('showToast');toastTimer=setTimeout(()=>ui.toast.classList.remove('showToast'),ms)}
function sdkSound(name){try{window.KidscadeGame?.sound?.(name)}catch(e){}}
function sdkStart(){try{window.KidscadeGame?.start?.()}catch(e){}}
function snapshot(){return {phase,ecoPoints,builtCount,ecosystem:{...ecosystem,populations:{...ecosystem.populations},discovered:{...ecosystem.discovered}},tiles:tiles.map(t=>({x:t.x,z:t.z,kind:t.kind,biome:t.biome,pollution:t.pollution,moisture:t.moisture})),buildings:buildings.map(b=>({type:b.type,x:b.x,z:b.z})),animals:animals.map(a=>({species:a.species,x:a.x,z:a.z}))}}
function restoreSnapshot(s){
  if(!s)return;phase=s.phase||1;ecoPoints=s.ecoPoints??130;builtCount=s.builtCount||0;ecosystem=makeEcosystem(s.ecosystem);
  if(Array.isArray(s.tiles)&&s.tiles.length===tiles.length)s.tiles.forEach((d,i)=>{tiles[i].biome=d.biome;tiles[i].pollution=d.pollution;tiles[i].moisture=d.moisture;refreshTileVisual(tiles[i])});
  buildings.slice().forEach(b=>buildingGroup.remove(b.mesh));buildings=[];windRotors.length=0;(s.buildings||[]).forEach(b=>{const t=tileAt(b.x,b.z);if(t)placeTool(b.type,t,true)});
  clearGroup(animalGroup);animals=[];(s.animals||[]).forEach(a=>spawnAnimal(a.species,{x:a.x,z:a.z}));updateUI();
}
function serialize(){return {version:2,scenario:selectedScenario,seed,phase,ecoPoints,builtCount,elapsed,ecosystem:{...ecosystem},camera:{x:cameraTarget.x,z:cameraTarget.z,view:viewSize},tiles:tiles.map(t=>({biome:t.biome,pollution:+t.pollution.toFixed(3),moisture:+t.moisture.toFixed(3)})),buildings:buildings.map(b=>({type:b.type,x:b.x,z:b.z})),animals:animals.map(a=>({species:a.species,x:a.x,z:a.z})),savedAt:Date.now()}}
function saveGame(){
  if(!running||completed)return;try{localStorage.setItem(SAVE_KEY,JSON.stringify(serialize()));ui.saveBtn.textContent='저장됨';setTimeout(()=>ui.saveBtn.textContent='저장',900)}catch(e){}
}
function loadGame(){
  let s;try{s=JSON.parse(localStorage.getItem(SAVE_KEY)||'null')}catch(e){}if(!s||![1,2].includes(s.version))return false;
  selectedScenario=SCENARIOS[s.scenario]?s.scenario:'valley';phase=s.phase||1;ecoPoints=s.ecoPoints??130;builtCount=s.builtCount||0;elapsed=s.elapsed||0;ecosystem={carbon:0,waste:0,industryProfit:0,...(s.ecosystem||{})};generateWorld(s.seed||1);
  if(Array.isArray(s.tiles)&&s.tiles.length===tiles.length)s.tiles.forEach((d,i)=>{tiles[i].biome=d.biome;tiles[i].pollution=d.pollution;tiles[i].moisture=d.moisture;refreshTileVisual(tiles[i])});
  (s.buildings||[]).forEach(b=>{const t=tileAt(b.x,b.z);if(t)placeTool(b.type,t,true)});
  (s.animals||[]).forEach(a=>spawnAnimal(a.species,{x:a.x,z:a.z}));updateSpecies();
  if(s.camera){cameraTarget.x=s.camera.x||0;cameraTarget.z=s.camera.z||0;viewSize=s.camera.view||17;applyCamera()}
  updateUI();return true;
}
function undo(){
  if(!lastAction){toast('되돌릴 건설이 없어요.');return}
  const s=lastAction;lastAction=null;restoreSnapshot(s);saveGame();toast('마지막 건설을 되돌렸어요.');
}
function tryCompleteGame(){
  const c=counts();
  if(buildings.length>0)return false;
  if(returnedSpeciesCount()<4||ecosystem.carbon>=65||ecosystem.habitatStress>=45||ecosystem.waterStress>=35||c.restorePct<60||c.waterPct<70){
    toast('시설은 모두 회수했지만 생태계가 아직 안정되지 않았어요. 탄소·물·야생동물을 회복시키세요.','bad',3600);
    return false;
  }
  completeGame();return true;
}
function completeGame(){
  if(completed)return;completed=true;running=false;const c=counts();const efficiency=Math.max(0,260-builtCount*6),score=Math.round(c.restorePct*18+c.waterPct*10+returnedSpeciesCount()*500+ecoPoints*2+efficiency-ecosystem.waste*3-ecosystem.carbon*4-ecosystem.habitatStress*3-ecosystem.waterStress*2);
  let best=0;try{best=Number(localStorage.getItem(BEST_KEY)||0);if(score>best)localStorage.setItem(BEST_KEY,String(score));localStorage.removeItem(SAVE_KEY)}catch(e){}
  ui.resultScore.textContent=score.toLocaleString();ui.resultRestore.textContent=c.restorePct+'%';ui.resultSpecies.textContent=returnedSpeciesCount()+'종';
  ui.resultText.textContent=SCENARIOS[selectedScenario].name+'에 시설을 하나도 남기지 않았습니다. '+(score>best?'새 최고 기록이에요!':'최고 기록 '+Math.max(best,score).toLocaleString()+'점');
  ui.result.classList.remove('hidden');sdkSound('success');try{window.KidscadeGame?.gameOver?.({score,completed:true,restored:c.restorePct,species:returnedSpeciesCount()})}catch(e){}
}
function beginNew(tutorial=false){
  selectedScenario=document.querySelector('.scenario.active')?.dataset.scenario||'valley';phase=1;ecoPoints=130;builtCount=0;elapsed=0;ecosystem=makeEcosystem();ecologyClock=0;completed=false;lastAction=null;tutorialMode=tutorial;tutorialIndex=tutorial?0:-1;
  generateWorld();ui.intro.classList.add('hidden');ui.result.classList.add('hidden');running=true;sdkStart();selectTool('inspect');checkProgress();saveGame();if(tutorial)showTutorial();else ui.tutorialCoach.classList.add('hidden');
}
function continueGame(){
  ui.intro.classList.add('hidden');ui.result.classList.add('hidden');completed=false;running=true;if(!loadGame()){ui.intro.classList.remove('hidden');running=false;toast('저장된 복원 지역이 없어요.','bad');return}sdkStart();toast('저장된 지역을 이어서 복원합니다.')}
function showTutorial(){
  const steps=[
    ['발전소도 장소를 골라요','🌬·☀️·♨️ 지도를 바꿔 보세요. 풍력·태양광·지열은 좋은 입지에서만 설치할 수 있고 원자력은 냉각수를 위해 물가가 필요해요.'],
    ['초록색이라고 모두 정답은 아니에요','화력·공장뿐 아니라 매립지, 채석장, 주차장도 결과를 살펴보세요. 잔디공원과 단일수종 조림은 빠르게 초록색이 되지만 진짜 다양한 생태계와는 다릅니다.'],
    ['오염된 땅을 되살려요','토양 정화기를 풍력 발전기 근처에 설치하세요. 갈색 땅이 초록 초원으로 바뀝니다.'],
    ['강도 함께 살려요','하천 정화기는 강 바로 옆에 세웁니다. 파랗고 깨끗한 물이 늘어나야 다음 단계로 갈 수 있어요.'],
    ['생태계는 다양해야 해요','2단계가 열리면 초원을 숲·습지·꽃초원으로 나누세요. 한 종류만 가득한 곳보다 다양한 곳에 더 많은 동물이 삽니다.'],
    ['마지막 목표를 기억해요','동물 4종이 돌아오면 회수선이 열립니다. 마지막에는 내가 세운 시설을 0개로 만들고 자연만 남겨야 해요.']
  ];tutorialIndex=clamp(tutorialIndex,0,steps.length-1);ui.tutorialStep.textContent='튜토리얼 '+(tutorialIndex+1)+' / '+steps.length;ui.tutorialTitle.textContent=steps[tutorialIndex][0];ui.tutorialText.textContent=steps[tutorialIndex][1];ui.tutorialCoach.classList.remove('hidden');
}
function nextTutorial(){tutorialIndex++;if(tutorialIndex>=6){ui.tutorialCoach.classList.add('hidden');tutorialMode=false;return}showTutorial()}

document.querySelectorAll('.tool').forEach(btn=>btn.addEventListener('click',()=>selectTool(btn.dataset.tool)));
document.querySelectorAll('.scenario').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.scenario').forEach(b=>b.classList.remove('active'));btn.classList.add('active')}));
ui.newBtn.addEventListener('click',()=>beginNew(false));ui.tutorialBtn.addEventListener('click',()=>beginNew(true));ui.continueBtn.addEventListener('click',continueGame);
ui.windViewBtn.addEventListener('click',()=>toggleAnalysis('wind'));ui.sunViewBtn.addEventListener('click',()=>toggleAnalysis('sun'));ui.geoViewBtn.addEventListener('click',()=>toggleAnalysis('geo'));ui.pollutionViewBtn.addEventListener('click',()=>toggleAnalysis('pollution'));ui.homeViewBtn.addEventListener('click',resetCamera);
ui.helpBtn.addEventListener('click',()=>ui.help.classList.remove('hidden'));ui.closeHelpBtn.addEventListener('click',()=>ui.help.classList.add('hidden'));
ui.missionCollapse.addEventListener('click',()=>ui.mission.classList.toggle('collapsed'));ui.undoBtn.addEventListener('click',undo);ui.saveBtn.addEventListener('click',saveGame);
ui.tutorialNext.addEventListener('click',nextTutorial);ui.tutorialSkip.addEventListener('click',()=>{tutorialMode=false;ui.tutorialCoach.classList.add('hidden')});
ui.resultAgain.addEventListener('click',()=>{ui.result.classList.add('hidden');ui.intro.classList.remove('hidden')});ui.resultObserve.addEventListener('click',()=>ui.result.classList.add('hidden'));
addEventListener('keydown',e=>{
  if(e.key>='1'&&e.key<='9'){const order=['inspect','wind','solar','geothermal','nuclear','coal','purifier','waterfilter','recycler'];selectTool(order[Number(e.key)-1])}
  if(e.key==='Escape')selectTool('inspect');if(e.key.toLowerCase()==='h')ui.help.classList.remove('hidden');
});
addEventListener('beforeunload',()=>{if(running)saveGame()});

function animate(now){
  requestAnimationFrame(animate);const dt=Math.min(.05,(now-(animate.last||now))/1000);animate.last=now;
  if(running){elapsed+=dt;saveTimer+=dt;ecologyClock+=dt;if(ecologyClock>3){ecologyClock=0;ecologyTick();if(phase===4&&buildings.length===0)tryCompleteGame()}if(saveTimer>20){saveTimer=0;saveGame()}}
  windRotors.forEach((r,i)=>r.rotation.z+=dt*(2.2+i%3*.18));
  animals.forEach((a,i)=>{a.phase+=dt*(1+i*.08);a.mesh.position.y=.46+Math.sin(a.phase*2)*.035;a.mesh.rotation.y=Math.sin(a.phase*.45)*.25});
  [...effectGroup.children].forEach(o=>{o.userData.life-=dt*.7;o.scale.multiplyScalar(1+dt*1.2);o.material.opacity=o.userData.life*.75;if(o.userData.life<=0)effectGroup.remove(o)});
  renderer.render(scene,camera);
}
initThree();generateWorld(123456);ui.continueBtn.disabled=!localStorage.getItem(SAVE_KEY);ui.continueBtn.style.opacity=ui.continueBtn.disabled?.35:1;updateUI();requestAnimationFrame(animate);

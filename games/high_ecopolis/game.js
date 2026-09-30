import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import { shared3DPath, shared3DIsApproved } from '../../assets/game/manifest/shared-community-3d.js';

const $=id=>document.getElementById(id);
const ui={
  phaseName:$('phaseName'),ecoPoints:$('ecoPoints'),energyRate:$('energyRate'),carbonRate:$('carbonRate'),restoreRate:$('restoreRate'),waterRate:$('waterRate'),bioRate:$('bioRate'),
  dayRate:$('dayRate'),visitorRate:$('visitorRate'),servedRate:$('servedRate'),reputationRate:$('reputationRate'),cashflowRate:$('cashflowRate'),pathRate:$('pathRate'),cityStyleRate:$('cityStyleRate'),guestMood:$('guestMood'),thoughtList:$('thoughtList'),scenarioObjectives:$('scenarioObjectives'),
  mission:$('mission'),missionKicker:$('missionKicker'),missionTitle:$('missionTitle'),missionText:$('missionText'),objectives:$('objectives'),speciesRow:$('speciesRow'),
  nextActionCard:$('nextActionCard'),nextActionIcon:$('nextActionIcon'),nextActionTitle:$('nextActionTitle'),nextActionText:$('nextActionText'),
  missionCollapse:$('missionCollapse'),windViewBtn:$('windViewBtn'),sunViewBtn:$('sunViewBtn'),geoViewBtn:$('geoViewBtn'),pollutionViewBtn:$('pollutionViewBtn'),homeViewBtn:$('homeViewBtn'),helpBtn:$('helpBtn'),
  mapLegend:$('mapLegend'),tileInfo:$('tileInfo'),toast:$('toast'),toolbar:$('toolbar'),undoBtn:$('undoBtn'),saveBtn:$('saveBtn'),
  toolScroller:$('toolScroller'),toolPrev:$('toolPrev'),toolNext:$('toolNext'),toolPageLabel:$('toolPageLabel'),toolCategoryBar:$('toolCategoryBar'),
  tycoonBar:$('tycoonBar'),guestPanel:$('guestPanel'),
  intro:$('intro'),tutorialBtn:$('tutorialBtn'),newBtn:$('newBtn'),continueBtn:$('continueBtn'),
  tutorialCoach:$('tutorialCoach'),tutorialStep:$('tutorialStep'),tutorialTitle:$('tutorialTitle'),tutorialText:$('tutorialText'),tutorialNext:$('tutorialNext'),tutorialSkip:$('tutorialSkip'),
  help:$('help'),closeHelpBtn:$('closeHelpBtn'),result:$('result'),resultText:$('resultText'),resultScore:$('resultScore'),resultRestore:$('resultRestore'),resultSpecies:$('resultSpecies'),
  resultAgain:$('resultAgain'),resultObserve:$('resultObserve')
};

const COLS=24,ROWS=18,CELL=1.05;
const PHASES=[
  {name:'1 · 되살리기',title:'전기 → 땅 → 강, 세 가지만 해봐요',text:'발전소 1개, 토양 정화기 1개, 하천 정화기 1개를 차례로 설치하세요.'},
  {name:'2 · 생태계 만들기',title:'숲·습지·꽃초원을 하나씩 만들어요',text:'정화된 초원에 세 종류의 서식지를 하나씩 만들어 보세요.'},
  {name:'3 · 생태공원 운영',title:'길을 잇고 방문객을 맞아요',text:'지도 가장자리에서 방문자센터까지 길을 연결하고 방문객 10명을 맞으면 됩니다.'},
  {name:'4 · 흔적 없이 철수',title:'마지막에는 우리가 만든 것을 걷어내요',text:'깨끗한 강에 회수선을 보내 시설과 길을 모두 회수하세요.'}
];
const TOOL={
  inspect:{label:'살펴보기',cost:0,radius:0},
  trail:{label:'자연 탐방로',cost:1,radius:0,phase:2,path:true},
  boardwalk:{label:'습지 데크길',cost:2,radius:0,phase:2,path:true},
  pavedwalk:{label:'포장 산책로',cost:1,radius:0,phase:2,path:true},
  wind:{label:'풍력 발전기',cost:20,radius:6.0,power:26},
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
  visitorcenter:{label:'생태 방문자센터',cost:24,radius:0,phase:2,appeal:16},
  observatory:{label:'야생동물 관찰대',cost:16,radius:0,phase:2,appeal:12},
  researchstation:{label:'생태 연구소',cost:28,radius:0,phase:2,appeal:10},
  ecocafe:{label:'로컬 푸드 카페',cost:14,radius:0,phase:2,appeal:8},
  bench:{label:'쉼터 벤치',cost:4,radius:0,phase:2,appeal:3},
  signpost:{label:'탐방 안내판',cost:3,radius:0,phase:2,appeal:2},
  lamp:{label:'저전력 가로등',cost:5,radius:0,phase:2,appeal:2},
  purifier:{label:'토양 정화기',cost:18,radius:3.4},
  waterfilter:{label:'하천 정화기',cost:22,radius:4.1},
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
const ECO_DEMAND={purifier:8,waterfilter:10,wetland:3,forest:3,meadow:3,carfactory:12,visitorcenter:4,researchstation:5,ecocafe:5,lamp:1};
const PATH_TYPES=new Set(['trail','boardwalk','pavedwalk']);
const TOOL_CATEGORY={
  inspect:'restore',purifier:'restore',waterfilter:'restore',wetland:'restore',forest:'restore',meadow:'restore',recycler:'restore',
  trail:'path',boardwalk:'path',pavedwalk:'path',bench:'path',signpost:'path',lamp:'path',
  visitorcenter:'operate',observatory:'operate',researchstation:'operate',ecocafe:'operate',
  wind:'energy',solar:'energy',geothermal:'energy',nuclear:'energy',
  coal:'develop',carfactory:'develop',landfill:'develop',quarry:'develop',parking:'develop',channel:'develop',lawn:'develop',plantation:'develop'
};
const TOOL_CATEGORY_LABEL={restore:'복원',path:'길·공원',operate:'운영',energy:'에너지',develop:'개발'};
const PATH_SPEED={trail:.9,boardwalk:1,pavedwalk:1.35};
const PATH_CAPACITY={trail:2,boardwalk:3,pavedwalk:5};
const AMENITY_TYPES=new Set(['bench','signpost','lamp']);
const UPKEEP={wind:.6,solar:.4,geothermal:1,nuclear:2.5,coal:2,carfactory:2,landfill:1.2,quarry:1.4,parking:.5,channel:.7,lawn:1.1,plantation:.6,purifier:.8,waterfilter:.9,visitorcenter:1.4,observatory:.6,researchstation:2,ecocafe:1.2,bench:.08,signpost:.04,lamp:.18};
const VISITOR_TYPES={
  family:{name:'가족',icon:'👨‍👩‍👧',speed:.78},
  student:{name:'학생',icon:'🎒',speed:.86},
  researcher:{name:'연구자',icon:'🔬',speed:.72},
  birder:{name:'탐조객',icon:'🔭',speed:.68}
};
const TYCOON_SCENARIOS={
  valley:{title:'균형 있는 생태관광지',deadline:90},
  marsh:{title:'습지를 지키는 관광지',deadline:100},
  dust:{title:'사막화 지역의 재생',deadline:110}
};

let scene,camera,renderer,raycaster;
let groundGroup,decorGroup,pathGroup,buildingGroup,animalGroup,visitorGroup,effectGroup,previewGroup;
let tiles=[],tileMeshes=[],buildings=[],animals=[],visitors=[];
let selectedTool='inspect',selectedScenario='valley',phase=1,ecoPoints=130,seed=1;
let analysisMode='none',running=false,completed=false;
let cameraTarget=new THREE.Vector3(0,0,0),viewSize=22;
let hoverTile=null,previewRing=null,lastAction=null;
let rng=Math.random,tutorialIndex=-1,tutorialMode=false;
let drag={active:false,id:null,x:0,y:0,moved:false},pointers=new Map();
let toastTimer=0,saveTimer=0,elapsed=0,builtCount=0,ecologyClock=0,economyClock=0,visitorSpawnClock=0;
let simSpeed=1,lastGuideKey='',activeToolCategory='restore';
let ecosystem=makeEcosystem();
const sharedLoader=new GLTFLoader(),sharedCache=new Map(),sharedPending=new Map();
const SHARED=id=>shared3DPath(id,'../../');
const GAME_ASSET_ROOT='../../assets/game/';
const ASSET=p=>GAME_ASSET_ROOT+p;
const ECO_ASSET={
  trail:ASSET('3d/nature/kenney-nature-kit/ground-path-straight.glb'),
  trailEnd:ASSET('3d/nature/kenney-nature-kit/ground-path-end.glb'),
  trailBend:ASSET('3d/nature/kenney-nature-kit/ground-path-bend.glb'),
  trailSplit:ASSET('3d/nature/kenney-nature-kit/ground-path-split.glb'),
  trailCross:ASSET('3d/nature/kenney-nature-kit/ground-path-cross.glb'),
  boardwalk:ASSET('3d/nature/kenney-nature-kit/path-wood.glb'),
  boardwalkEnd:ASSET('3d/nature/kenney-nature-kit/path-wood-end.glb'),
  boardwalkBend:ASSET('3d/nature/kenney-nature-kit/path-wood-corner.glb'),
  pavedwalk:ASSET('3d/city/kenney-city-kit-roads/road-straight.glb'),
  pavedwalkEnd:ASSET('3d/city/kenney-city-kit-roads/road-end.glb'),
  pavedwalkBend:ASSET('3d/city/kenney-city-kit-roads/road-bend.glb'),
  pavedwalkSplit:ASSET('3d/city/kenney-city-kit-roads/road-intersection.glb'),
  pavedwalkCross:ASSET('3d/city/kenney-city-kit-roads/road-crossroad.glb'),
  visitorcenter:ASSET('3d/city/kenney-city-kit-suburban/building-type-f.glb'),
  observatory:ASSET('3d/survival/kenney-survival-kit/structure-canvas.glb'),
  researchstation:ASSET('3d/city/kenney-city-kit-suburban/building-type-h.glb'),
  ecocafe:ASSET('3d/city/kenney-city-kit-suburban/building-type-d.glb'),
  bench:ASSET('3d/interiors/kenney-furniture-kit/bench.glb'),
  signpost:ASSET('3d/survival/kenney-survival-kit/signpost.glb'),
  lamp:ASSET('3d/city/kenney-city-kit-roads/light-square.glb'),
  factoryBuilding:ASSET('3d/city/poly-pizza-city-pack/big-building.glb'),
  dumpster:ASSET('3d/city/kenney-city-kit-roads/dumpster.glb'),
  constructionFence:ASSET('3d/city/kenney-city-kit-roads/construction-fence.glb'),
  powerPole:ASSET('3d/city/kenney-city-kit-roads/electricity-pole.glb'),
  parkingSurface:ASSET('3d/city/kenney-city-kit-roads/road-square.glb'),
  visitor:{family:ASSET('characters/people/character-female-b.glb'),student:ASSET('characters/people/character-male-a.glb'),researcher:ASSET('characters/people/character-female-c.glb'),birder:ASSET('characters/people/character-male-d.glb')}
};
const localGltfCache=new Map(),localGltfPending=new Map();
function loadLocalGLTF(url){
  if(localGltfCache.has(url))return Promise.resolve(localGltfCache.get(url));
  if(!localGltfPending.has(url))localGltfPending.set(url,new Promise(resolve=>sharedLoader.load(url,g=>{localGltfCache.set(url,g);resolve(g)},undefined,()=>resolve(null))));
  return localGltfPending.get(url);
}
function normalizeLocal(o,target=1){
  o.updateMatrixWorld(true);let b=new THREE.Box3().setFromObject(o),size=b.getSize(new THREE.Vector3()),mx=Math.max(size.x,size.y,size.z)||1;
  o.scale.multiplyScalar(target/mx);o.updateMatrixWorld(true);b=new THREE.Box3().setFromObject(o);
  const center=b.getCenter(new THREE.Vector3());o.position.x-=center.x;o.position.z-=center.z;o.position.y-=b.min.y;
  o.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;if(n.isSkinnedMesh)n.frustumCulled=false}});return o;
}
function localModel(url,target=1,skeleton=false){return loadLocalGLTF(url).then(g=>g?normalizeLocal(skeleton?cloneSkeleton(g.scene):g.scene.clone(true),target):null)}
function attachLocalAsset(group,url,target=1,{y=0,rot=0}={}){
  const rev=(group.userData.assetRev||0)+1;group.userData.assetRev=rev;
  localModel(url,target).then(o=>{if(!o||group.userData.assetRev!==rev)return;o.position.y+=y;o.rotation.y=rot;group.add(o)});
}
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
function biomeVigor(t){
  const local=1-clamp(t.pollution,0,1),habitat=1-clamp(ecosystem.habitatStress/140,0,.72),water=1-clamp(ecosystem.waterStress/160,0,.58);
  const biomeBoost=t.biome==='wetland'?water:t.biome==='forest'?habitat:(habitat+water)*.5;
  return clamp(local*.62+biomeBoost*.38,0,1);
}
function vigorBand(t){const v=biomeVigor(t);return v>.72?2:v>.42?1:0}
function refreshLivingDecor(){
  if(analysisMode!=='none')return;
  for(const t of tiles){
    if(t.kind==='rock'||['forest','wetland','meadow','grass','plantation'].includes(t.biome)){
      const band=vigorBand(t);
      if(t.decor.userData.vigorBand!==band)rebuildDecor(t);
    }
  }
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
    const band=vigorBand(t),mix=noise(t.x,t.z)>.5?['nature.commonTreeA','nature.pineTreeA','nature.commonTreeB']:['nature.commonTreeB','nature.pineTreeB','nature.pineTreeA'];
    const count=band===2?3:band===1?2:1;
    Promise.all(mix.slice(0,count).map((id,i)=>sharedModel(id,i===0?.82:i===1?.66:.52))).then(list=>{
      if(!valid('forest'))return;
      const spots=[[-.18,.14],[.20,-.13],[.04,.25]];
      list.filter(Boolean).forEach((o,i)=>{o.position.set(spots[i][0],0,spots[i][1]);o.rotation.y=noise(t.x+i,t.z-i)*Math.PI*2;t.decor.add(o)})
    });
  }else if(t.biome==='plantation'){
    sharedModel('nature.pineTreeA',.76).then(base=>{if(!base||!valid('plantation'))return;[-.24,0,.24].forEach(x=>{const o=base.clone(true);o.position.x=x;o.scale.multiplyScalar(.62);o.rotation.y=0;t.decor.add(o)})});
  }else if(t.biome==='wetland'){
    const count=vigorBand(t)===2?2:1;
    Promise.all(Array.from({length:count},(_,i)=>sharedModel('nature.plant',i?.34:.46))).then(list=>{if(!valid('wetland'))return;list.filter(Boolean).forEach((o,i)=>{o.position.set(i?.2:-.12,0,i?.12:-.08);o.rotation.y=noise(t.x+i,t.z)*Math.PI*2;t.decor.add(o)})});
  }else if(t.biome==='meadow'){
    const count=vigorBand(t)===2?2:1;
    Promise.all(Array.from({length:count},(_,i)=>sharedModel('nature.grass',i?.30:.42))).then(list=>{if(!valid('meadow'))return;list.filter(Boolean).forEach((o,i)=>{o.position.set(i?.18:-.1,0,i?.12:.08);o.rotation.y=noise(t.x,t.z+i)*Math.PI*2;t.decor.add(o)})});
  }else if(t.biome==='grass'&&noise(t.x,t.z)>(vigorBand(t)===2?.55:.72)){
    sharedModel('nature.grass',.32).then(o=>{if(o&&valid('grass'))t.decor.add(o)});
  }
}
function makeEcosystem(input={}){
  return {
    carbon:Number(input.carbon||0),waste:Number(input.waste||0),industryProfit:Number(input.industryProfit||0),
    habitatStress:Number(input.habitatStress||0),waterStress:Number(input.waterStress||0),
    reputation:Number(input.reputation??50),visitorsServed:Number(input.visitorsServed||0),day:Number(input.day||1),
    tourismRevenue:Number(input.tourismRevenue||0),maintenanceSpent:Number(input.maintenanceSpent||0),
    lastIncome:Number(input.lastIncome||0),lastExpense:Number(input.lastExpense||0),lastCashflow:Number(input.lastCashflow||0),
    thoughts:Array.isArray(input.thoughts)?input.thoughts.slice(0,6):[],
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
  scene.fog=new THREE.Fog(0xb9d9ca,24,52);
  camera=new THREE.OrthographicCamera(-12,12,8,-8,.1,100);
  camera.position.set(13,16,14);camera.lookAt(0,0,0);
  renderer=new THREE.WebGLRenderer({canvas:$('game'),antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  raycaster=new THREE.Raycaster();

  scene.add(new THREE.HemisphereLight(0xeafff4,0x486553,2.15));
  const sun=new THREE.DirectionalLight(0xfff2d2,2.45);sun.position.set(-10,18,8);sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-28;sun.shadow.camera.right=28;sun.shadow.camera.top=28;sun.shadow.camera.bottom=-28;scene.add(sun);

  groundGroup=new THREE.Group();decorGroup=new THREE.Group();pathGroup=new THREE.Group();buildingGroup=new THREE.Group();animalGroup=new THREE.Group();visitorGroup=new THREE.Group();effectGroup=new THREE.Group();previewGroup=new THREE.Group();
  scene.add(groundGroup,decorGroup,pathGroup,buildingGroup,animalGroup,visitorGroup,effectGroup,previewGroup);
  const base=new THREE.Mesh(new THREE.CylinderGeometry(20,22,1.1,6),new THREE.MeshStandardMaterial({color:0x6c8e72,roughness:1}));
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
  seed=worldSeed;rng=mulberry32(seed);tiles=[];tileMeshes=[];buildings=[];animals=[];visitors=[];windRotors.length=0;
  clearGroup(groundGroup);clearGroup(decorGroup);clearGroup(pathGroup);clearGroup(buildingGroup);clearGroup(animalGroup);clearGroup(visitorGroup);clearGroup(effectGroup);
  const sc=SCENARIOS[selectedScenario]||SCENARIOS.valley;
  const riverPhase=rng()*Math.PI*2;
  for(let z=0;z<ROWS;z++)for(let x=0;x<COLS;x++){
    const center=(ROWS-1)/2+Math.sin(x*.56+riverPhase)*1.55+Math.sin(x*.19+riverPhase*.5)*.8;
    const water=Math.abs(z-center)<=sc.riverWidth+.15*Math.sin(x*.8);
    const edgeRock=!water&&(x<2||x>COLS-3||z<2||z>ROWS-3)&&rng()<.28;
    const t={x,z,kind:water?'water':edgeRock?'rock':'land',biome:water?'water':'barren',pollution:water?clamp(sc.waterPollution+(rng()-.5)*.16,0,1):edgeRock?0:clamp(sc.landPollution+(rng()-.5)*.25,0,1),moisture:water?1:0,path:null,mesh:null,decor:new THREE.Group(),pathVisual:new THREE.Group()};
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
  decorGroup.add(t.decor);t.pathVisual.position.set(p.x,.15,p.z);pathGroup.add(t.pathVisual);
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
  clearGroup(t.decor);t.decor.userData.rev=(t.decor.userData.rev||0)+1;t.decor.userData.vigorBand=vigorBand(t);const p=worldPos(t);t.decor.position.set(p.x,.12,p.z);
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

function pathNeighbors(t){return [[0,-1,'n'],[1,0,'e'],[0,1,'s'],[-1,0,'w']].map(([dx,dz,key])=>({tile:tileAt(t.x+dx,t.z+dz),key})).filter(o=>o.tile?.path)}
function pathCount(){return tiles.filter(t=>t.path).length}
function humanFootprintCount(){return buildings.length+pathCount()}
function pathMask(t){
  const keys=new Set(pathNeighbors(t).map(o=>o.key));return {n:keys.has('n'),e:keys.has('e'),s:keys.has('s'),w:keys.has('w')};
}
function pathShape(t){
  const m=pathMask(t),dirs=['n','e','s','w'].filter(k=>m[k]),count=dirs.length;
  if(count<=1)return {shape:'end',dirs,rot:dirs[0]==='e'?Math.PI/2:dirs[0]==='s'?Math.PI:dirs[0]==='w'?-Math.PI/2:0};
  if(count===2){
    if((m.n&&m.s)||(m.e&&m.w))return {shape:'straight',dirs,rot:m.e&&m.w?Math.PI/2:0};
    if(m.n&&m.e)return {shape:'bend',dirs,rot:0};
    if(m.e&&m.s)return {shape:'bend',dirs,rot:Math.PI/2};
    if(m.s&&m.w)return {shape:'bend',dirs,rot:Math.PI};
    return {shape:'bend',dirs,rot:-Math.PI/2};
  }
  if(count===3){
    const missing=!m.s?'s':!m.w?'w':!m.n?'n':'e';
    return {shape:'split',dirs,rot:missing==='s'?0:missing==='w'?Math.PI/2:missing==='n'?Math.PI:-Math.PI/2};
  }
  return {shape:'cross',dirs,rot:0};
}
function pathAsset(kind,shape){
  if(kind==='trail')return ECO_ASSET[shape==='end'?'trailEnd':shape==='bend'?'trailBend':shape==='split'?'trailSplit':shape==='cross'?'trailCross':'trail'];
  if(kind==='boardwalk')return ECO_ASSET[shape==='end'?'boardwalkEnd':shape==='bend'?'boardwalkBend':'boardwalk'];
  return ECO_ASSET[shape==='end'?'pavedwalkEnd':shape==='bend'?'pavedwalkBend':shape==='split'?'pavedwalkSplit':shape==='cross'?'pavedwalkCross':'pavedwalk'];
}
function renderPathTile(t){
  if(!t?.pathVisual)return;clearGroup(t.pathVisual);t.pathVisual.userData.assetRev=(t.pathVisual.userData.assetRev||0)+1;if(!t.path)return;
  const kind=t.path,shape=pathShape(t),m=pathMask(t),y=t.kind==='water'?.12:.04;
  const material=kind==='trail'?new THREE.MeshStandardMaterial({color:0xb49a68,roughness:1}):kind==='boardwalk'?new THREE.MeshStandardMaterial({color:0x956c45,roughness:.92}):new THREE.MeshStandardMaterial({color:0x8f9496,roughness:.9});
  const center=new THREE.Mesh(new THREE.BoxGeometry(CELL*.34,.038,CELL*.34),material);center.position.y=y;center.receiveShadow=true;t.pathVisual.add(center);
  const arm=(dx,dz)=>{
    const horizontal=dx!==0,mesh=new THREE.Mesh(new THREE.BoxGeometry(horizontal?CELL*.42:CELL*.30,.038,horizontal?CELL*.30:CELL*.42),material);
    mesh.position.set(dx*CELL*.25,y,dz*CELL*.25);mesh.receiveShadow=true;t.pathVisual.add(mesh);
  };
  if(m.n)arm(0,-1);if(m.e)arm(1,0);if(m.s)arm(0,1);if(m.w)arm(-1,0);
  const url=pathAsset(kind,shape.shape),rev=t.pathVisual.userData.assetRev;
  localModel(url,kind==='pavedwalk'?.9:kind==='boardwalk'?.76:.72).then(o=>{
    if(!o||t.pathVisual.userData.assetRev!==rev||t.path!==kind)return;o.rotation.y=shape.rot;o.position.y+=t.kind==='water'?.15:.055;t.pathVisual.add(o);
  });
}
function refreshPathNeighborhood(t){[t,tileAt(t.x+1,t.z),tileAt(t.x-1,t.z),tileAt(t.x,t.z+1),tileAt(t.x,t.z-1)].filter(Boolean).forEach(renderPathTile)}
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
    const poleAnchor=new THREE.Group();poleAnchor.position.set(.34,.02,-.16);g.add(poleAnchor);attachLocalAsset(poleAnchor,ECO_ASSET.powerPole,.72);
  }else if(type==='carfactory'){
    const base=new THREE.Mesh(new THREE.BoxGeometry(1.0,.18,.82),mat.dark);base.position.y=.09;g.add(base);
    attachLocalAsset(g,ECO_ASSET.factoryBuilding,1.05,{y:.12});
  }else if(type==='landfill'){
    const pit=new THREE.Mesh(new THREE.BoxGeometry(.95,.18,.82),mat.dark);pit.position.y=.08;g.add(pit);
    attachLocalAsset(g,ECO_ASSET.dumpster,.58,{y:.12});
  }else if(type==='quarry'){
    const pit=new THREE.Mesh(new THREE.CylinderGeometry(.46,.3,.2,10),mat.rock);pit.position.y=.02;
    for(let i=0;i<3;i++){const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(.15,0),mat.rock);rock.position.set((i-1)*.22,.2,(i%2)*.18-.08);g.add(rock)}g.add(pit);
    const fenceAnchor=new THREE.Group();fenceAnchor.position.set(0,.02,-.32);g.add(fenceAnchor);attachLocalAsset(fenceAnchor,ECO_ASSET.constructionFence,.72);
  }else if(type==='parking'){
    const slab=new THREE.Mesh(new THREE.BoxGeometry(1.0,.06,.86),mat.dark);slab.position.y=.03;g.add(slab);
    attachLocalAsset(g,ECO_ASSET.parkingSurface,.86,{y:.05});
  }else if(type==='channel'){
    const wall1=new THREE.Mesh(new THREE.BoxGeometry(.95,.18,.12),mat.white),wall2=wall1.clone();wall1.position.set(0,.09,-.34);wall2.position.set(0,.09,.34);g.add(wall1,wall2);
  }else if(type==='lawn'){
    const pad=new THREE.Mesh(new THREE.CylinderGeometry(.46,.46,.09,18),mat.green);pad.position.y=.05;g.add(pad);
  }else if(type==='plantation'){
    for(const x of [-.25,0,.25]){const tr=treeModel();tr.scale.setScalar(.65);tr.position.set(x,.05,0);g.add(tr)}
  }else if(['visitorcenter','observatory','researchstation','ecocafe','bench','signpost','lamp'].includes(type)){
    const pad=new THREE.Mesh(new THREE.CylinderGeometry(.42,.46,.08,10),type==='lamp'?mat.yellow:type==='bench'||type==='signpost'?mat.trunk:mat.green);pad.position.y=.04;g.add(pad);
    const targets={visitorcenter:1.05,observatory:.95,researchstation:1.05,ecocafe:1.0,bench:.62,signpost:.62,lamp:.9};
    attachLocalAsset(g,ECO_ASSET[type],targets[type]||.8,{y:.08});
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
  if(type!=='inspect'&&ecoPoints<(def?.cost||0))return '복원 예산이 부족해요.';
  if(type==='inspect')return '';
  if(PATH_TYPES.has(type)){
    if(t.kind==='rock')return '바위 지형에는 길을 놓을 수 없어요.';
    if(type!=='boardwalk'&&t.kind==='water')return '물 위에는 습지 데크길을 사용하세요.';
    if(t.path)return '이미 길이 있는 칸이에요.';
    if(hasBuilding(t))return '시설이 있는 칸에는 길을 놓을 수 없어요.';
    return '';
  }
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
  if(['visitorcenter','observatory','researchstation','ecocafe'].includes(type)&&!['grass','forest','meadow','wetland'].includes(t.biome))return '방문객 시설은 먼저 복원된 땅에 설치하세요.';
  if(['visitorcenter','researchstation','ecocafe'].includes(type)&&!powered(t))return '이 시설은 전력이 연결된 곳에 설치해야 해요.';
  if(AMENITY_TYPES.has(type)&&!t.path)return '벤치·안내판·가로등은 길 위에 설치하세요.';
  if(type==='lamp'&&!powered(t))return '가로등은 전력 범위 안의 길에 설치하세요.';
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
  if(PATH_TYPES.has(type)){
    if(!loading){ecoPoints-=def.cost;builtCount++;lastAction=before}
    t.path=type;refreshPathNeighborhood(t);
    if(!loading){
      if(type==='pavedwalk'){ecosystem.habitatStress+=.65;ecosystem.waterStress+=.35}
      if(type==='trail'&&t.biome==='wetland')ecosystem.habitatStress+=.45;
      if(type==='boardwalk'&&(t.kind==='water'||t.biome==='wetland'))ecosystem.habitatStress=Math.max(0,ecosystem.habitatStress-.08);
      sdkSound('click');saveGame();updateUI();
    }
    return true;
  }
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
function visitorWalkable(t){return !!t?.path}
function visitorEntryTiles(){return tiles.filter(t=>t.path&&(t.x===0||t.z===0||t.x===COLS-1||t.z===ROWS-1))}
function adjacentPathTiles(t){return [[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dz])=>tileAt(t.x+dx,t.z+dz)).filter(n=>n?.path)}
function facilityAccessTiles(b){const t=tileAt(b.x,b.z);return t?adjacentPathTiles(t):[]}
function naturalPathDestinations(biome){return tiles.filter(t=>t.path&&[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dz])=>tileAt(t.x+dx,t.z+dz)?.biome===biome))}
function visitorDestinations(type){
  const out=[],preferred=type==='family'?['visitorcenter','ecocafe','observatory']:type==='student'?['visitorcenter','researchstation','observatory']:type==='researcher'?['researchstation','observatory']:['observatory','visitorcenter'];
  preferred.forEach(kind=>buildings.filter(b=>b.type===kind).forEach(b=>facilityAccessTiles(b).forEach(t=>out.push(t))));
  const biomes=type==='birder'?['forest','meadow','wetland']:type==='researcher'?['wetland','forest','meadow']:['meadow','forest','wetland'];
  biomes.forEach(biome=>naturalPathDestinations(biome).slice(0,10).forEach(t=>out.push(t)));return [...new Set(out)];
}
function findVisitorPath(start,goal){
  if(!start||!goal)return[];if(start===goal)return[goal];const key=t=>t.x+','+t.z,q=[start],came=new Map([[key(start),null]]);
  for(let qi=0;qi<q.length;qi++){const cur=q[qi];if(cur===goal)break;for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const n=tileAt(cur.x+dx,cur.z+dz);if(!visitorWalkable(n)||came.has(key(n)))continue;came.set(key(n),cur);q.push(n)}}
  if(!came.has(key(goal)))return[];const path=[];for(let cur=goal;cur&&cur!==start;cur=came.get(key(cur)))path.push(cur);return path.reverse();
}
function connectedVisitorCenter(){const entries=visitorEntryTiles();if(!entries.length)return false;return buildings.filter(b=>b.type==='visitorcenter').some(b=>facilityAccessTiles(b).some(access=>entries.some(e=>e===access||findVisitorPath(e,access).length)))}
function pathCrowd(t){return visitors.filter(v=>v.tile===t).length}
function pathTravelFactor(t){const kind=t?.path||'trail',cap=PATH_CAPACITY[kind]||2,crowd=pathCrowd(t);return (PATH_SPEED[kind]||1)*(crowd>cap?Math.max(.42,cap/crowd):1)}
function visitorModel(type){
  const g=new THREE.Group(),palette={family:0xf0b86e,student:0x6ea9e8,researcher:0xd8e0e7,birder:0x7dc58b},fallback=new THREE.Group(),bodyMat=new THREE.MeshStandardMaterial({color:palette[type]||0xd8d8d8,roughness:.8});
  const body=new THREE.Mesh(new THREE.CylinderGeometry(.09,.12,.34,7),bodyMat),head=new THREE.Mesh(new THREE.SphereGeometry(.095,8,6),mat.white);
  body.position.y=.2;head.position.y=.47;fallback.add(body,head);g.add(fallback);g.scale.setScalar(.82);g.userData.fallback=fallback;return g;
}
function attachVisitorAsset(v){
  const url=ECO_ASSET.visitor[v.type];loadLocalGLTF(url).then(gltf=>{
    if(!gltf||!visitors.includes(v))return;const model=normalizeLocal(cloneSkeleton(gltf.scene),.72);v.mesh.userData.fallback.visible=false;v.mesh.add(model);
    const clips=Array.isArray(gltf.animations)?gltf.animations:[],src=clips.find(c=>/walk|run/i.test(c.name))||clips.find(c=>/idle|stand/i.test(c.name))||clips[0];
    if(src){const clip=src.clone();clip.tracks=clip.tracks.filter(tr=>!/^root\.position$/i.test(tr.name));v.mixer=new THREE.AnimationMixer(model);v.mixer.clipAction(clip).play()}
  });
}
function pickVisitorType(){
  const pool=buildings.some(b=>b.type==='researchstation')?['family','student','researcher','birder']:['family','student','birder'];
  return pool[Math.floor(rng()*pool.length)];
}
function targetVisitorCount(){
  if(!connectedVisitorCenter()||phase>=4)return 0;
  const c=counts(),attractions=buildings.filter(b=>['visitorcenter','observatory','researchstation','ecocafe','bench','signpost'].includes(b.type)).length;
  return clamp(Math.round(2+ecosystem.reputation*.14+c.restorePct*.04+returnedSpeciesCount()*2+attractions*1.5-ecosystem.habitatStress*.05),0,28);
}
function spawnVisitor(){
  const entries=visitorEntryTiles();if(!entries.length)return;
  const type=pickVisitorType(),start=entries[Math.floor(rng()*entries.length)],destinations=visitorDestinations(type);
  if(!destinations.length)return;
  const dest=destinations[Math.floor(rng()*destinations.length)],path=findVisitorPath(start,dest);if(!path.length)return;
  const mesh=visitorModel(type),p=worldPos(start);mesh.position.set(p.x,.34,p.z);visitorGroup.add(mesh);
  const v={type,mesh,tile:start,path,pathIndex:0,happiness:60,targetHappiness:60,age:0,maxAge:38+rng()*34,thoughtCooldown:2+rng()*5,mixer:null};visitors.push(v);attachVisitorAsset(v);
}
function removeVisitor(v,served=true){
  visitorGroup.remove(v.mesh);visitors=visitors.filter(x=>x!==v);if(served)ecosystem.visitorsServed++;
}
function localVisitorThought(v,t){
  const near=buildings.filter(b=>dist(t,b)<=2.4).map(b=>b.type),pop=ecosystem.populations,crowd=pathCrowd(t),cap=PATH_CAPACITY[t.path]||2;
  if(crowd>cap+1)return['길이 너무 붐벼서 천천히 가야 해.','bad'];
  if(near.includes('coal'))return['공기가 조금 매캐해.','bad'];
  if(near.includes('landfill'))return['여기서는 냄새가 나…','bad'];
  if(near.includes('parking'))return['주차는 편한데 땅이 너무 뜨거워 보여.','bad'];
  if(near.includes('channel'))return['강은 반듯한데 생물이 잘 안 보여.','bad'];
  if(t.biome==='lawn')return['깔끔한 잔디인데 벌이나 나비는 별로 없네.','neutral'];
  if(t.biome==='plantation')return['나무는 많은데 전부 비슷하게 생겼어.','neutral'];
  if(t.biome==='meadow'&&pop.bee>18)return['꽃 사이에 벌이 정말 많아!','good'];
  if(t.biome==='wetland'&&pop.frog>18)return['개구리 소리가 들려!','good'];
  if(near.includes('observatory')&&returnedSpeciesCount()>=2)return['관찰대에서 야생동물을 봤어!','good'];
  if(near.includes('researchstation'))return['여기서는 생태계를 직접 연구하네.','good'];
  if(near.includes('bench'))return['잠깐 앉아서 쉬어 갈 수 있어서 좋아.','good'];
  if(near.includes('signpost'))return['안내판이 있어서 어디로 갈지 알겠어.','good'];
  if(cityDiversityScore()>=60)return['구역마다 분위기가 달라서 둘러보는 재미가 있어!','good'];
  if(near.includes('ecocafe'))return['걷고 나니 먹을 곳이 있어서 좋다.','good'];
  if(ecosystem.carbon>70)return['경치는 좋은데 공기 상태가 걱정돼.','bad'];
  if(ecosystem.habitatStress>55)return['자연이 너무 잘게 끊겨 있는 느낌이야.','bad'];
  return[t.pollution<.2?'공기가 맑고 걷기 좋아.':'조금 더 깨끗해지면 좋겠어.',t.pollution<.2?'good':'neutral'];
}
function pushThought(v,text,mood){
  const item={icon:VISITOR_TYPES[v.type]?.icon||'👤',who:VISITOR_TYPES[v.type]?.name||'방문객',text,mood,day:ecosystem.day};
  ecosystem.thoughts.unshift(item);ecosystem.thoughts=ecosystem.thoughts.slice(0,6);
}
function evaluateVisitor(v,t){
  const c=counts(),localPollution=t?.pollution||0;
  let target=48+c.restorePct*.18+c.waterPct*.12+returnedSpeciesCount()*5-localPollution*35-ecosystem.carbon*.09-ecosystem.habitatStress*.12-ecosystem.waterStress*.08;
  if(buildings.some(b=>b.type==='observatory'&&dist(t,b)<=2.5))target+=8;
  if(buildings.some(b=>b.type==='ecocafe'&&dist(t,b)<=2.5))target+=5;
  if(buildings.some(b=>b.type==='bench'&&dist(t,b)<=1.7))target+=4;
  if(buildings.some(b=>b.type==='signpost'&&dist(t,b)<=1.7))target+=2;
  if(t.path==='trail')target+=2;if(t.path==='boardwalk'&&(nearWater(t,false,1.3)||t.kind==='water'))target+=4;
  v.targetHappiness=clamp(target,5,100);
  const [text,mood]=localVisitorThought(v,t);pushThought(v,text,mood);
}
function chooseNextVisitorPath(v){
  const destinations=visitorDestinations(v.type);if(!destinations.length){removeVisitor(v);return}
  const dest=destinations[Math.floor(rng()*destinations.length)],path=findVisitorPath(v.tile,dest);
  if(path.length){v.path=path;v.pathIndex=0}else removeVisitor(v);
}
function animateVisitors(dt){
  for(const v of [...visitors]){
    v.age+=dt;v.thoughtCooldown-=dt;v.happiness+=(v.targetHappiness-v.happiness)*Math.min(1,dt*.5);v.mixer?.update(dt);
    if(v.age>v.maxAge){removeVisitor(v);continue}
    const next=v.path[v.pathIndex];if(!next){evaluateVisitor(v,v.tile);chooseNextVisitorPath(v);continue}
    const p=worldPos(next),dx=p.x-v.mesh.position.x,dz=p.z-v.mesh.position.z,d=Math.hypot(dx,dz),step=(VISITOR_TYPES[v.type]?.speed||.75)*pathTravelFactor(next)*dt;
    if(d<=step+.02){v.mesh.position.x=p.x;v.mesh.position.z=p.z;v.tile=next;v.pathIndex++;if(v.thoughtCooldown<=0){evaluateVisitor(v,next);v.thoughtCooldown=5+rng()*7}}
    else{v.mesh.position.x+=dx/d*step;v.mesh.position.z+=dz/d*step;v.mesh.rotation.y=Math.atan2(dx,dz)}
  }
}
function scenarioGoals(){
  const c=counts(),s=selectedScenario;
  if(s==='marsh')return[
    ['깨끗한 물',c.waterPct,78,'%',false],
    ['수달 개체수',Math.round(ecosystem.populations.otter),24,'',false],
    ['누적 방문',ecosystem.visitorsServed,70,'명',false],
    ['평판',Math.round(ecosystem.reputation),65,'',false]
  ];
  if(s==='dust')return[
    ['땅 복원',c.restorePct,70,'%',false],
    ['탄소 부담',Math.round(ecosystem.carbon),45,'',true],
    ['누적 방문',ecosystem.visitorsServed,90,'명',false],
    ['평판',Math.round(ecosystem.reputation),70,'',false]
  ];
  return[
    ['돌아온 동물',returnedSpeciesCount(),3,'종',false],
    ['누적 방문',ecosystem.visitorsServed,80,'명',false],
    ['평판',Math.round(ecosystem.reputation),70,'',false],
    ['서식지 부담',Math.round(ecosystem.habitatStress),40,'',true]
  ];
}
function scenarioGoalMet(){return scenarioGoals().every(g=>g[4]?g[1]<=g[2]:g[1]>=g[2])}
function cityDiversityScore(){
  const score=[
    new Set(buildings.filter(b=>POWER_TYPES.has(b.type)).map(b=>b.type)).size*5,
    new Set(tiles.filter(t=>['forest','wetland','meadow','lawn','plantation'].includes(t.biome)).map(t=>t.biome)).size*5,
    new Set(tiles.filter(t=>t.path).map(t=>t.path)).size*6,
    new Set(buildings.filter(b=>['visitorcenter','observatory','researchstation','ecocafe'].includes(b.type)).map(b=>b.type)).size*5,
    new Set(buildings.filter(b=>AMENITY_TYPES.has(b.type)).map(b=>b.type)).size*4,
    new Set(buildings.filter(b=>['coal','carfactory','landfill','quarry','parking','channel'].includes(b.type)).map(b=>b.type)).size*2
  ].reduce((a,b)=>a+b,0);
  return clamp(Math.round(score),0,100);
}
function economyTick(){
  ecosystem.day++;
  const industry=buildings.reduce((s,b)=>s+({coal:1,carfactory:3,landfill:1,quarry:2,parking:1}[b.type]||0),0);
  const diversity=cityDiversityScore(),tourism=visitors.length*.22+buildings.filter(b=>b.type==='ecocafe').length*Math.min(18,visitors.length)*.07+diversity*.015;
  const research=buildings.filter(b=>b.type==='researchstation').length*(1+returnedSpeciesCount()*.55);
  const income=industry+tourism+research,expense=buildings.reduce((s,b)=>s+(UPKEEP[b.type]||0),0);
  const flow=income-expense;ecoPoints+=flow;
  ecosystem.lastIncome=income;ecosystem.lastExpense=expense;ecosystem.lastCashflow=flow;ecosystem.tourismRevenue+=tourism;ecosystem.maintenanceSpent+=expense;
  const avg=visitors.length?visitors.reduce((s,v)=>s+v.happiness,0)/visitors.length:55;
  const c=counts(),target=clamp(18+c.restorePct*.28+c.waterPct*.16+returnedSpeciesCount()*6+avg*.22+diversity*.12-ecosystem.carbon*.08-ecosystem.habitatStress*.13-ecosystem.waterStress*.08,0,100);
  ecosystem.reputation+=(target-ecosystem.reputation)*.18;
  if(visitors.length>20){ecosystem.habitatStress+=(visitors.length-20)*.018;ecosystem.waterStress+=(visitors.length-20)*.008}
  const paved=tiles.filter(t=>t.path==='pavedwalk').length,deck=tiles.filter(t=>t.path==='boardwalk').length;
  ecosystem.waterStress+=paved*.004;ecosystem.habitatStress+=paved*.003;ecosystem.habitatStress=Math.max(0,ecosystem.habitatStress-deck*.001);
  const cfg=TYCOON_SCENARIOS[selectedScenario];
  if(ecosystem.day===cfg.deadline&&!scenarioGoalMet())toast('운영 목표 기한에 도달했어요. 계속 개선해서 목표를 달성할 수 있습니다.','bad',3800);
}
function ecologyTick(){
  const byType=type=>buildings.filter(b=>b.type===type);
  byType('coal').forEach(b=>{const t=tileAt(b.x,b.z);ecosystem.carbon+=1.9;polluteAround(t,2.8,.018)});
  byType('carfactory').forEach(b=>{const t=tileAt(b.x,b.z);if(powered(t)){ecosystem.carbon+=1.15;ecosystem.industryProfit+=3;polluteAround(t,2.25,.013)}});
  byType('landfill').forEach(b=>{ecosystem.habitatStress+=.7;polluteAround(tileAt(b.x,b.z),2.8,.012)});
  byType('quarry').forEach(b=>{ecosystem.habitatStress+=.9;scarLand(tileAt(b.x,b.z),1.25)});
  byType('parking').forEach(b=>{ecosystem.carbon+=.45;ecosystem.habitatStress+=.65;ecosystem.waterStress+=.35});
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
  updateSpecies();refreshLivingDecor();checkProgress(true);updateUI();
}
function launchRecycler(t){
  const reason=placementReason('recycler',t);if(reason){toast(reason,'bad');return false}
  const before=snapshot();lastAction=before;const p=worldPos(t);pulse(t,0x72d9ff,TOOL.recycler.radius);
  const caught=buildings.filter(b=>Math.hypot(b.x-t.x,b.z-t.z)<=TOOL.recycler.radius),caughtPaths=tiles.filter(o=>o.path&&Math.hypot(o.x-t.x,o.z-t.z)<=TOOL.recycler.radius);
  if(!caught.length&&!caughtPaths.length){toast('이곳에서는 회수할 시설이나 길이 없어요. 다른 강 구간을 골라보세요.','bad');return false}
  caught.forEach(b=>{buildingGroup.remove(b.mesh);const idx=windRotors.findIndex(r=>b.mesh.children.includes(r));if(idx>=0)windRotors.splice(idx,1)});
  buildings=buildings.filter(b=>!caught.includes(b));
  const pathRefund=caughtPaths.reduce((s,o)=>s+(TOOL[o.path]?.cost||0),0);caughtPaths.forEach(o=>{o.path=null;refreshPathNeighborhood(o)});
  const refund=Math.round((caught.reduce((s,b)=>s+(TOOL[b.type]?.cost||0),0)+pathRefund)*COST_REFUND);ecoPoints+=refund;
  toast('회수선이 시설 '+caught.length+'개와 길 '+caughtPaths.length+'칸을 걷어냈어요'+(refund?' · +'+refund+'P':''),'good');sdkSound('correct');
  saveGame();updateUI();if(humanFootprintCount()===0)tryCompleteGame();return true;
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
    const current=animals.filter(a=>a.species===species).length;
    const desired=pop[species]<8?0:clamp(1+Math.floor((pop[species]-8)/24),1,4);
    if(pop[species]<4&&current)removeSpecies(species);
    else if(current<desired)for(let i=current;i<desired;i++)spawnAnimal(species);
    else if(current>desired){
      const extra=animals.filter(a=>a.species===species).slice(desired);
      extra.forEach(a=>animalGroup.remove(a.mesh));
      animals=animals.filter(a=>!extra.includes(a));
    }
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
function hasType(type){return buildings.some(b=>b.type===type)}
function phaseChecklist(){
  if(phase===1)return [
    ['발전소 세우기',buildings.some(b=>POWER_TYPES.has(b.type))?1:0,1,'개'],
    ['토양 정화하기',hasType('purifier')?1:0,1,'번'],
    ['강 정화하기',hasType('waterfilter')?1:0,1,'번']
  ];
  if(phase===2)return [
    ['숲 만들기',hasType('forest')?1:0,1,'곳'],
    ['습지 만들기',hasType('wetland')?1:0,1,'곳'],
    ['꽃초원 만들기',hasType('meadow')?1:0,1,'곳']
  ];
  if(phase===3)return [
    ['길 3칸 이상',pathCount(),3,'칸'],
    ['방문자센터',hasType('visitorcenter')?1:0,1,'개'],
    ['누적 방문객',ecosystem.visitorsServed,10,'명']
  ];
  return [['남은 시설·길',humanFootprintCount(),0,'개',true]];
}
function currentGuide(){
  if(phase===1){
    if(!buildings.some(b=>POWER_TYPES.has(b.type)))return {key:'p1-power',tool:'wind',icon:'⚡',title:'1. 발전소를 하나 세워요',text:'풍력 발전기를 누르고 바람이 있는 땅에 놓아 보세요.'};
    if(!hasType('purifier'))return {key:'p1-land',tool:'purifier',icon:'🌱',title:'2. 토양 정화기를 세워요',text:'발전소 가까운 갈색 땅에 놓으세요. 주변 땅이 초록색으로 바뀝니다.'};
    if(!hasType('waterfilter'))return {key:'p1-water',tool:'waterfilter',icon:'💧',title:'3. 하천 정화기를 세워요',text:'발전소 전력 범위 안에서 강 바로 옆 땅에 놓으세요. 이것만 하면 2단계가 열립니다.'};
  }
  if(phase===2){
    if(!hasType('forest'))return {key:'p2-forest',tool:'forest',icon:'🌲',title:'숲을 하나 만들어요',text:'초록색으로 정화된 땅에 숲 묘목장을 놓으세요.'};
    if(!hasType('wetland'))return {key:'p2-wetland',tool:'wetland',icon:'🪷',title:'습지를 하나 만들어요',text:'깨끗한 강 가까이의 초원에 습지 씨앗을 놓으세요.'};
    if(!hasType('meadow'))return {key:'p2-meadow',tool:'meadow',icon:'🌼',title:'꽃초원을 하나 만들어요',text:'남은 초원에 꽃초원 씨앗을 놓으면 다음 단계가 열립니다.'};
  }
  if(phase===3){
    if(pathCount()<3)return {key:'p3-path',tool:'trail',icon:'🥾',title:'길을 3칸 이상 이어 보세요',text:'자연 탐방로를 지도 가장자리에서 안쪽으로 이어 주세요.'};
    if(!hasType('visitorcenter'))return {key:'p3-center',tool:'visitorcenter',icon:'🏡',title:'방문자센터를 세워요',text:'길 바로 옆의 복원된 땅에 방문자센터를 세우세요.'};
    if(!connectedVisitorCenter())return {key:'p3-connect',tool:'trail',icon:'🔗',title:'입구와 방문자센터를 길로 연결해요',text:'지도 가장자리 길과 방문자센터 옆 길이 끊기지 않게 이어 주세요.'};
    if(ecosystem.visitorsServed<10)return {key:'p3-visitors',tool:'observatory',icon:'👥',title:'방문객 10명을 맞아요',text:'사람들이 길을 따라 들어옵니다. 2×나 3× 속도로 기다리거나 관찰대를 더해 보세요.'};
  }
  return {key:'p4-recycle',tool:'recycler',icon:'♻️',title:'시설과 길을 모두 회수해요',text:'깨끗한 강에 회수선을 띄우면 주변 시설과 길을 한꺼번에 걷어냅니다.'};
}
function updateGuidedUI(){
  ui.nextActionCard.classList.toggle('uiHidden',!tutorialMode);
  document.querySelectorAll('.tool').forEach(btn=>btn.classList.remove('recommended'));
  if(!tutorialMode)return;
  const guide=currentGuide();
  ui.nextActionIcon.textContent=guide.icon;ui.nextActionTitle.textContent=guide.title;ui.nextActionText.textContent=guide.text;ui.nextActionCard.dataset.tool=guide.tool;
  document.querySelectorAll('.tool').forEach(btn=>btn.classList.toggle('recommended',btn.dataset.tool===guide.tool));
  if(guide.key!==lastGuideKey){lastGuideKey=guide.key;const b=document.querySelector('.tool[data-tool="'+guide.tool+'"]');if(b&&!b.classList.contains('contextHidden'))b.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'})}
}
function updateToolVisibility(){
  document.querySelectorAll('[data-toolcat]').forEach(b=>b.classList.toggle('active',b.dataset.toolcat===activeToolCategory));
  ui.toolCategoryBar.classList.toggle('uiHidden',tutorialMode);
  document.querySelectorAll('.tool').forEach(btn=>{
    const type=btn.dataset.tool,def=TOOL[type],locked=type==='recycler'?phase<4:(tutorialMode&&def?.phase&&phase<def.phase);
    const tutorialShow=!tutorialMode||type==='inspect'||type===currentGuide().tool||(['wind','solar','geothermal','purifier','waterfilter'].includes(type)&&phase===1)||(['forest','wetland','meadow'].includes(type)&&phase===2)||(['trail','boardwalk','pavedwalk','visitorcenter'].includes(type)&&phase===3);
    const categoryShow=tutorialMode||TOOL_CATEGORY[type]===activeToolCategory;
    btn.classList.toggle('contextHidden',!tutorialShow||!categoryShow);btn.classList.toggle('locked',!!locked);btn.disabled=!!locked;
  });
  ui.toolPageLabel.textContent=tutorialMode?'튜토리얼 도구':(TOOL_CATEGORY_LABEL[activeToolCategory]||'건설')+' 도구';
}
function checkProgress(announce=true){
  const c=counts();
  if(phase===1&&buildings.some(b=>POWER_TYPES.has(b.type))&&hasType('purifier')&&hasType('waterfilter')){
    phase=2;showAdvancedTools=false;if(announce)unlockToast('좋아요! 2단계가 열렸어요. 이제 숲·습지·꽃초원을 하나씩 만들어 봐요.')
  }
  if(phase===2&&hasType('forest')&&hasType('wetland')&&hasType('meadow')){
    phase=3;showAdvancedTools=false;if(announce)unlockToast('3단계 시작! 이제 길을 연결하고 방문객을 맞아 봐요.')
  }
  if(phase>=2)updateSpecies();
  if(phase===3&&pathCount()>=3&&hasType('visitorcenter')&&connectedVisitorCenter()&&ecosystem.visitorsServed>=10){
    phase=4;showAdvancedTools=false;if(announce)unlockToast('운영 성공! 마지막에는 시설과 길을 모두 회수하면 돼요.')
  }
  updateUI();
}
function unlockToast(msg){toast(msg,'good',3800);sdkSound('success');saveGame()}

function updateUI(){
  const c=counts(),energy=energySummary();ui.phaseName.textContent=tutorialMode?PHASES[phase-1].name:(phase>=4?'철수 가능':'자유 운영');ui.ecoPoints.textContent=(Math.round(ecoPoints*10)/10).toFixed(Number.isInteger(Math.round(ecoPoints*10)/10)?0:1);
  ui.energyRate.textContent=energy.supply+' / '+energy.demand+' ⚡';ui.carbonRate.textContent=Math.round(ecosystem.carbon);
  ui.carbonRate.classList.toggle('warning',ecosystem.carbon>=45&&ecosystem.carbon<85);ui.carbonRate.classList.toggle('danger',ecosystem.carbon>=85);
  ui.restoreRate.textContent=c.restorePct+'%';ui.waterRate.textContent=c.waterPct+'%';ui.bioRate.textContent=returnedSpeciesCount()+'/4';
  const cfg=TYCOON_SCENARIOS[selectedScenario]||TYCOON_SCENARIOS.valley;
  ui.dayRate.textContent=ecosystem.day+' / '+cfg.deadline+'일';ui.visitorRate.textContent=visitors.length+'명';ui.servedRate.textContent=ecosystem.visitorsServed+'명';ui.pathRate.textContent=pathCount()+'칸';ui.cityStyleRate.textContent=cityDiversityScore();
  ui.reputationRate.textContent=Math.round(ecosystem.reputation);ui.cashflowRate.textContent=(ecosystem.lastCashflow>=0?'+':'')+ecosystem.lastCashflow.toFixed(1)+'P';
  ui.cashflowRate.classList.toggle('danger',ecosystem.lastCashflow<0);ui.reputationRate.classList.toggle('warning',ecosystem.reputation<55);
  document.querySelectorAll('[data-speed]').forEach(b=>b.classList.toggle('active',Number(b.dataset.speed)===simSpeed));
  ui.mission.classList.toggle('uiHidden',!tutorialMode);ui.missionKicker.textContent='단계 '+phase+' / 4';ui.missionTitle.textContent=PHASES[phase-1].title;ui.missionText.textContent=PHASES[phase-1].text;
  const objs=phaseChecklist(),scenario=scenarioGoals();
  ui.tycoonBar.classList.toggle('uiHidden',phase<3);ui.guestPanel.classList.toggle('uiHidden',phase<3);
  document.querySelector('.scenarioGoalTitle')?.classList.toggle('uiHidden',phase<3);ui.scenarioObjectives.classList.toggle('uiHidden',phase<3);
  ui.carbonRate.closest('.stat')?.classList.toggle('uiHidden',phase<3);ui.bioRate.closest('.stat')?.classList.toggle('uiHidden',phase<2);
  ui.scenarioObjectives.innerHTML=scenario.map(o=>{const done=o[4]?o[1]<=o[2]:o[1]>=o[2];return '<div class="miniGoal '+(done?'done':'')+'"><span>'+(done?'✓ ':'')+o[0]+'</span><b>'+o[1]+o[3]+' / '+o[2]+o[3]+'</b></div>'}).join('');
  const thoughts=ecosystem.thoughts||[];
  ui.thoughtList.innerHTML=thoughts.length?thoughts.map(x=>'<div class="thought '+x.mood+'"><span>'+x.icon+'</span><p><b>'+x.who+'</b>'+x.text+'</p></div>').join(''):'<p class="emptyThought">방문자센터를 세우면 사람들이 찾아옵니다.</p>';
  const avgMood=visitors.length?visitors.reduce((s,v)=>s+v.happiness,0)/visitors.length:60;ui.guestMood.textContent=avgMood>=75?'😄':avgMood>=55?'🙂':avgMood>=35?'😐':'😟';
  ui.objectives.innerHTML=objs.map(o=>{
    const current=o[1],goal=o[2],reverse=o[4];const done=reverse?current<=goal:current>=goal;const width=reverse?(done?100:Math.max(5,100-current*10)):clamp(current/goal*100,0,100);
    return '<div class="objective"><div class="objectiveTop"><span>'+(done?'✓ ':'')+o[0]+'</span><b>'+current+o[3]+' / '+goal+o[3]+'</b></div><div class="bar"><i style="width:'+width+'%"></i></div></div>'
  }).join('');
  ui.speciesRow.innerHTML=Object.entries(SPECIES).map(([id,s])=>{const p=Math.round(ecosystem.populations[id]||0),found=p>=8;return '<div class="species '+(found?'found':'')+'" title="'+s.name+' 개체수 '+p+'"><span>'+(found?s.icon:'？')+'</span><small>'+p+'</small></div>'}).join('');
  document.querySelectorAll('.tool').forEach(btn=>{
    const def=TOOL[btn.dataset.tool];const locked=btn.dataset.tool==='recycler'?phase<4:(tutorialMode&&def?.phase&&phase<def.phase);btn.classList.toggle('locked',!!locked);btn.disabled=!!locked;btn.classList.toggle('active',btn.dataset.tool===selectedTool);
  });
  updateToolVisibility();updateGuidedUI();
  if(TOOL[selectedTool]?.phase&&phase<TOOL[selectedTool].phase)selectTool('inspect');
}
function showTileInfo(t){
  if(!t){ui.tileInfo.classList.add('hidden');return}
  const wind=Math.round(windAt(t)*100),sun=Math.round(sunAt(t)*100),geo=Math.round(geothermalAt(t)*100),bld=buildings.find(b=>b.x===t.x&&b.z===t.z);
  const biome=t.kind==='water'?(t.pollution<.25?'깨끗한 강':'오염된 강'):t.kind==='rock'?'바위':({barren:'메마른 땅',grass:'초원',wetland:'습지',forest:'숲',meadow:'꽃초원',lawn:'잔디밭',plantation:'단일수종 조림지',paved:'포장지'}[t.biome]||t.biome);
  ui.tileInfo.innerHTML='<b>'+biome+'</b><br>오염 '+Math.round(t.pollution*100)+'% · 바람 '+wind+'% · 햇빛 '+sun+'% · 지열 '+geo+'%'+(t.path?'<br>길: '+TOOL[t.path].label+' · 혼잡 '+pathCrowd(t)+'/'+(PATH_CAPACITY[t.path]||2):'')+(bld?'<br>시설: '+TOOL[bld.type].label:'')+(powered(t)?'<br>⚡ 전력 범위 안':'');
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

function resetCamera(){cameraTarget.set(0,0,0);viewSize=22;applyCamera()}
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
  cameraTarget.addScaledVector(right,-dx*scale);cameraTarget.addScaledVector(up,dy*scale);cameraTarget.y=0;cameraTarget.x=clamp(cameraTarget.x,-COLS*CELL*.34,COLS*CELL*.34);cameraTarget.z=clamp(cameraTarget.z,-ROWS*CELL*.34,ROWS*CELL*.34);applyCamera();
}
function bindRendererEvents(){
  const canvas=renderer?.domElement;
  if(!canvas||canvas.dataset.ecopolisBound==='1')return;
  canvas.dataset.ecopolisBound='1';
  canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===1)drag={active:true,id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};});
  canvas.addEventListener('pointermove',e=>{
    if(pointers.has(e.pointerId))pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size===2){const ps=[...pointers.values()];const d=Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y);if(canvas._pinch){const delta=d-canvas._pinch;viewSize=clamp(viewSize-delta*.018,11,30);resize()}canvas._pinch=d;return}
    if(drag.active&&e.pointerId===drag.id){const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>3)drag.moved=true;if(drag.moved)panBy(dx,dy);drag.x=e.clientX;drag.y=e.clientY}
    else hoverAt(e.clientX,e.clientY);
  });
  canvas.addEventListener('pointerup',e=>{const wasTap=drag.active&&e.pointerId===drag.id&&!drag.moved;if(wasTap)handleTap(e.clientX,e.clientY);pointers.delete(e.pointerId);canvas._pinch=null;if(e.pointerId===drag.id)drag.active=false;});
  canvas.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);drag.active=false;canvas._pinch=null});
  canvas.addEventListener('wheel',e=>{e.preventDefault();viewSize=clamp(viewSize+Math.sign(e.deltaY)*1.1,11,30);resize()},{passive:false});
  canvas.addEventListener('pointerleave',()=>{hoverTile=null;previewRing.visible=false;if(selectedTool==='inspect')ui.tileInfo.classList.add('hidden')});
}

function toast(msg,type='good',ms=2400){clearTimeout(toastTimer);ui.toast.textContent=msg;ui.toast.style.borderColor=type==='bad'?'rgba(255,122,110,.6)':'rgba(129,230,164,.5)';ui.toast.classList.add('showToast');toastTimer=setTimeout(()=>ui.toast.classList.remove('showToast'),ms)}
function sdkSound(name){try{window.KidscadeGame?.sound?.(name)}catch(e){}}
function sdkStart(){try{window.KidscadeGame?.start?.()}catch(e){}}
function snapshot(){return {phase,ecoPoints,builtCount,ecosystem:{...ecosystem,populations:{...ecosystem.populations},discovered:{...ecosystem.discovered}},tiles:tiles.map(t=>({x:t.x,z:t.z,kind:t.kind,biome:t.biome,pollution:t.pollution,moisture:t.moisture,path:t.path})),buildings:buildings.map(b=>({type:b.type,x:b.x,z:b.z})),animals:animals.map(a=>({species:a.species,x:a.x,z:a.z}))}}
function restoreSnapshot(s){
  if(!s)return;phase=s.phase||1;ecoPoints=s.ecoPoints??130;builtCount=s.builtCount||0;ecosystem=makeEcosystem(s.ecosystem);clearGroup(visitorGroup);visitors=[];
  if(Array.isArray(s.tiles)&&s.tiles.length===tiles.length)s.tiles.forEach((d,i)=>{tiles[i].biome=d.biome;tiles[i].pollution=d.pollution;tiles[i].moisture=d.moisture;tiles[i].path=d.path||null;refreshTileVisual(tiles[i]);renderPathTile(tiles[i])});
  buildings.slice().forEach(b=>buildingGroup.remove(b.mesh));buildings=[];windRotors.length=0;(s.buildings||[]).forEach(b=>{const t=tileAt(b.x,b.z);if(t)placeTool(b.type,t,true)});
  clearGroup(animalGroup);animals=[];(s.animals||[]).forEach(a=>spawnAnimal(a.species,{x:a.x,z:a.z}));updateUI();
}
function serialize(){return {version:3,scenario:selectedScenario,seed,phase,ecoPoints,builtCount,elapsed,simSpeed,ecosystem:{...ecosystem,populations:{...ecosystem.populations},discovered:{...ecosystem.discovered}},camera:{x:cameraTarget.x,z:cameraTarget.z,view:viewSize},tiles:tiles.map(t=>({biome:t.biome,pollution:+t.pollution.toFixed(3),moisture:+t.moisture.toFixed(3),path:t.path||null})),buildings:buildings.map(b=>({type:b.type,x:b.x,z:b.z})),animals:animals.map(a=>({species:a.species,x:a.x,z:a.z})),savedAt:Date.now()}}
function saveGame(){
  if(!running||completed)return;try{localStorage.setItem(SAVE_KEY,JSON.stringify(serialize()));ui.saveBtn.textContent='저장됨';setTimeout(()=>ui.saveBtn.textContent='저장',900)}catch(e){}
}
function loadGame(){
  let s;try{s=JSON.parse(localStorage.getItem(SAVE_KEY)||'null')}catch(e){}if(!s||![1,2,3].includes(s.version))return false;
  selectedScenario=SCENARIOS[s.scenario]?s.scenario:'valley';phase=s.phase||1;ecoPoints=s.ecoPoints??130;builtCount=s.builtCount||0;elapsed=s.elapsed||0;simSpeed=Number.isFinite(s.simSpeed)?s.simSpeed:1;ecosystem=makeEcosystem(s.ecosystem);generateWorld(s.seed||1);
  if(Array.isArray(s.tiles)&&s.tiles.length===tiles.length)s.tiles.forEach((d,i)=>{tiles[i].biome=d.biome;tiles[i].pollution=d.pollution;tiles[i].moisture=d.moisture;tiles[i].path=d.path||null;refreshTileVisual(tiles[i]);renderPathTile(tiles[i])});
  (s.buildings||[]).forEach(b=>{const t=tileAt(b.x,b.z);if(t)placeTool(b.type,t,true)});
  (s.animals||[]).forEach(a=>spawnAnimal(a.species,{x:a.x,z:a.z}));updateSpecies();
  if(s.camera){cameraTarget.x=s.camera.x||0;cameraTarget.z=s.camera.z||0;viewSize=s.camera.view||17;applyCamera()}
  updateUI();return true;
}
function undo(){
  if(!lastAction){toast('되돌릴 건설이 없어요.');return}
  const s=lastAction;lastAction=null;restoreSnapshot(s);saveGame();toast('마지막 건설을 되돌렸어요.');
}
function tryCompleteGame(){if(humanFootprintCount()>0)return false;completeGame();return true;}
function completeGame(){
  if(completed)return;completed=true;running=false;const c=counts();const efficiency=Math.max(0,260-builtCount*6),score=Math.round(c.restorePct*18+c.waterPct*10+returnedSpeciesCount()*500+ecoPoints*2+efficiency-ecosystem.waste*3-ecosystem.carbon*4-ecosystem.habitatStress*3-ecosystem.waterStress*2);
  let best=0;try{best=Number(localStorage.getItem(BEST_KEY)||0);if(score>best)localStorage.setItem(BEST_KEY,String(score));localStorage.removeItem(SAVE_KEY)}catch(e){}
  ui.resultScore.textContent=score.toLocaleString();ui.resultRestore.textContent=c.restorePct+'%';ui.resultSpecies.textContent=returnedSpeciesCount()+'종';
  ui.resultText.textContent=SCENARIOS[selectedScenario].name+'에 시설과 길을 하나도 남기지 않았습니다. '+(score>best?'새 최고 기록이에요!':'최고 기록 '+Math.max(best,score).toLocaleString()+'점');
  ui.result.classList.remove('hidden');sdkSound('success');try{window.KidscadeGame?.gameOver?.({score,completed:true,restored:c.restorePct,species:returnedSpeciesCount()})}catch(e){}
}
function beginNew(tutorial=false){
  selectedScenario=document.querySelector('.scenario.active')?.dataset.scenario||'valley';phase=tutorial?1:3;ecoPoints=tutorial?160:220;builtCount=0;elapsed=0;ecosystem=makeEcosystem();ecologyClock=0;economyClock=0;visitorSpawnClock=0;simSpeed=1;activeToolCategory='restore';lastGuideKey='';completed=false;lastAction=null;tutorialMode=tutorial;tutorialIndex=tutorial?0:-1;
  generateWorld();ui.intro.classList.add('hidden');ui.result.classList.add('hidden');running=true;sdkStart();selectTool('inspect');checkProgress();saveGame();if(tutorial)showTutorial();else ui.tutorialCoach.classList.add('hidden');
}
function continueGame(){
  tutorialMode=false;activeToolCategory='restore';ui.intro.classList.add('hidden');ui.result.classList.add('hidden');completed=false;running=true;if(!loadGame()){ui.intro.classList.remove('hidden');running=false;toast('저장된 복원 지역이 없어요.','bad');return}sdkStart();toast('저장된 지역을 이어서 복원합니다.')}
function showTutorial(){
  const steps=[
    ['발전소도 장소를 골라요','🌬·☀️·♨️ 지도를 바꿔 보세요. 풍력·태양광·지열은 좋은 입지에서만 설치할 수 있고 원자력은 냉각수를 위해 물가가 필요해요.'],
    ['초록색이라고 모두 정답은 아니에요','화력·공장뿐 아니라 매립지, 채석장, 주차장도 결과를 살펴보세요. 잔디공원과 단일수종 조림은 빠르게 초록색이 되지만 진짜 다양한 생태계와는 다릅니다.'],
    ['오염된 땅을 되살려요','토양 정화기를 풍력 발전기 근처에 설치하세요. 갈색 땅이 초록 초원으로 바뀝니다.'],
    ['강도 함께 살려요','하천 정화기는 강 바로 옆에 세웁니다. 파랗고 깨끗한 물이 늘어나야 다음 단계로 갈 수 있어요.'],
    ['길부터 연결해요','2단계부터 자연 탐방로·습지 데크길·포장 산책로를 놓을 수 있어요. 방문객은 지도 가장자리와 방문자센터가 길로 연결되어야 들어옵니다.'],
    ['이제 운영을 시작해요','방문자센터와 관찰대도 지어 보세요. 길의 종류와 혼잡, 벤치·안내판까지 방문객 만족에 영향을 줍니다.'],
    ['마지막 목표를 기억해요','동물 4종과 지역 운영 목표를 달성하면 회수선이 열립니다. 마지막에는 시설과 길을 모두 걷어내 자연만 남겨야 해요.']
  ];tutorialIndex=clamp(tutorialIndex,0,steps.length-1);ui.tutorialStep.textContent='튜토리얼 '+(tutorialIndex+1)+' / '+steps.length;ui.tutorialTitle.textContent=steps[tutorialIndex][0];ui.tutorialText.textContent=steps[tutorialIndex][1];ui.tutorialCoach.classList.remove('hidden');
}
function nextTutorial(){tutorialIndex++;if(tutorialIndex>=7){ui.tutorialCoach.classList.add('hidden');tutorialMode=false;return}showTutorial()}

document.querySelectorAll('.tool').forEach(btn=>btn.addEventListener('click',()=>selectTool(btn.dataset.tool)));
document.querySelectorAll('.scenario').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.scenario').forEach(b=>b.classList.remove('active'));btn.classList.add('active')}));
ui.newBtn.addEventListener('click',()=>beginNew(false));ui.tutorialBtn.addEventListener('click',()=>beginNew(true));ui.continueBtn.addEventListener('click',continueGame);
ui.windViewBtn.addEventListener('click',()=>toggleAnalysis('wind'));ui.sunViewBtn.addEventListener('click',()=>toggleAnalysis('sun'));ui.geoViewBtn.addEventListener('click',()=>toggleAnalysis('geo'));ui.pollutionViewBtn.addEventListener('click',()=>toggleAnalysis('pollution'));ui.homeViewBtn.addEventListener('click',resetCamera);
ui.helpBtn.addEventListener('click',()=>ui.help.classList.remove('hidden'));ui.closeHelpBtn.addEventListener('click',()=>ui.help.classList.add('hidden'));
ui.missionCollapse.addEventListener('click',()=>ui.mission.classList.toggle('collapsed'));ui.undoBtn.addEventListener('click',undo);ui.saveBtn.addEventListener('click',saveGame);
ui.nextActionCard.addEventListener('click',()=>{const tool=ui.nextActionCard.dataset.tool;if(tool){selectTool(tool);document.querySelector('.tool[data-tool="'+tool+'"]')?.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'})}});
document.querySelectorAll('[data-toolcat]').forEach(btn=>btn.addEventListener('click',()=>{activeToolCategory=btn.dataset.toolcat;ui.toolScroller.scrollTo({left:0,behavior:'smooth'});updateUI()}));
const scrollTools=dir=>ui.toolScroller.scrollBy({left:dir*Math.max(420,ui.toolScroller.clientWidth*.82),behavior:'smooth'});
ui.toolPrev.addEventListener('click',()=>scrollTools(-1));ui.toolNext.addEventListener('click',()=>scrollTools(1));
ui.tutorialNext.addEventListener('click',nextTutorial);ui.tutorialSkip.addEventListener('click',()=>{tutorialMode=false;ui.tutorialCoach.classList.add('hidden')});
ui.resultAgain.addEventListener('click',()=>{ui.result.classList.add('hidden');ui.intro.classList.remove('hidden')});ui.resultObserve.addEventListener('click',()=>ui.result.classList.add('hidden'));
document.querySelectorAll('[data-speed]').forEach(btn=>btn.addEventListener('click',()=>{simSpeed=Number(btn.dataset.speed);document.querySelectorAll('[data-speed]').forEach(b=>b.classList.toggle('active',b===btn));toast(simSpeed===0?'운영을 일시정지했어요.':simSpeed+'배속으로 운영합니다.')}));
addEventListener('keydown',e=>{
  if(e.key>='1'&&e.key<='9'){const order=['inspect','wind','solar','geothermal','nuclear','coal','purifier','waterfilter','recycler'];selectTool(order[Number(e.key)-1])}
  if(e.key==='Escape')selectTool('inspect');if(e.key.toLowerCase()==='h')ui.help.classList.remove('hidden');
});
addEventListener('beforeunload',()=>{if(running)saveGame()});

function animate(now){
  requestAnimationFrame(animate);const dt=Math.min(.05,(now-(animate.last||now))/1000);animate.last=now;
  const simDt=running?dt*simSpeed:0;
  if(running){elapsed+=simDt;saveTimer+=dt;ecologyClock+=simDt;economyClock+=simDt;visitorSpawnClock+=simDt;
    if(visitorSpawnClock>1.4){visitorSpawnClock=0;const target=targetVisitorCount();if(visitors.length<target)spawnVisitor();else if(visitors.length>target&&visitors.length)removeVisitor(visitors[0],false)}
    if(ecologyClock>3){ecologyClock=0;ecologyTick();if(phase===4&&humanFootprintCount()===0)tryCompleteGame()}
    if(economyClock>5){economyClock=0;if(phase>=3)economyTick();checkProgress(true);updateUI()}
    if(saveTimer>20){saveTimer=0;saveGame()}}
  windRotors.forEach((r,i)=>r.rotation.z+=dt*(2.2+i%3*.18)*simSpeed);
  animals.forEach((a,i)=>{a.phase+=simDt*(1+i*.08);a.mesh.position.y=.46+Math.sin(a.phase*2)*.035;a.mesh.rotation.y=Math.sin(a.phase*.45)*.25});
  animateVisitors(simDt);
  [...effectGroup.children].forEach(o=>{o.userData.life-=dt*.7;o.scale.multiplyScalar(1+dt*1.2);o.material.opacity=o.userData.life*.75;if(o.userData.life<=0)effectGroup.remove(o)});
  renderer.render(scene,camera);
}
initThree();bindRendererEvents();generateWorld(123456);ui.continueBtn.disabled=!localStorage.getItem(SAVE_KEY);ui.continueBtn.style.opacity=ui.continueBtn.disabled?.35:1;updateUI();requestAnimationFrame(animate);

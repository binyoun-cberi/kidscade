import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { shared3DPath, shared3DIsApproved, shared3DCanUse, shared3DProfile, shared3DRepairPreset } from '../../assets/game/manifest/shared-community-3d.js';

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), damp=(a,b,k,dt)=>a+(b-a)*(1-Math.exp(-k*dt));
const SAVE='kidscade_game_v1:high_apocalypse_survival:save';
const KNOW='kidscade_game_v1:high_apocalypse_survival:knowledge';
const DAY_SECONDS=360, CAMP=new THREE.Vector3(0,0,8), CITY_CENTER=new THREE.Vector3(52,0,-40), RUINS=CITY_CENTER.clone(), MARKET_POS=new THREE.Vector3(43,0,-35), CLINIC_POS=new THREE.Vector3(61,0,-35), GARAGE_POS=new THREE.Vector3(43,0,-51), POWER_STATION=new THREE.Vector3(59,0,-50), CRATE_POS=new THREE.Vector3(38.5,0,-31), WASTE_POS=new THREE.Vector3(64,0,-51), SURVIVOR_POS=new THREE.Vector3(54,0,-39), RIVER_X=30, BRIDGE_Z=-27;
const RESIDENTS={
 taeho:{name:'태호',icon:'🧑‍🔧',color:0x6ea4d9,field:SURVIVOR_POS.clone(),camp:new THREE.Vector3(3,0,10),preferred:'technician'},
 mira:{name:'미라',icon:'🧑‍🌾',color:0xc88b62,field:new THREE.Vector3(-31,0,27),camp:new THREE.Vector3(-3,0,10),preferred:'gatherer'},
 junseo:{name:'준서',icon:'🧑‍⚕️',color:0x8c79c6,field:new THREE.Vector3(57,0,-25),camp:new THREE.Vector3(0,0,13),preferred:'medic'}
};
const ART={
 people:'../../assets/game/characters/people/',
 city:'../../assets/game/3d/city/poly-pizza-city-pack/',
 roads:'../../assets/game/3d/city/kenney-city-kit-roads/',
 cars:'../../assets/game/3d/vehicles/kenney-car-kit/',
 nature:'../../assets/game/3d/nature/kenney-nature-kit/',
 suburban:'../../assets/game/3d/city/kenney-city-kit-suburban/',
 buildings:'../../assets/game/3d/buildings/kenney-building-kit/'
};
const SHARED=id=>shared3DPath(id,'../../');
const SHARED_MATERIAL_PRESETS=Object.freeze({
  schoolBus:{
    body:0xd9a928,glass:0x6a8fa0,tire:0x25292b,metal:0x7f898c,light:0xffdf86,trim:0x2f3436
  },
  ruinedHouse:{
    body:0xa95843,wall:0xa95843,roof:0x34383c,wood:0x68452f,glass:0x557984,trim:0xd2c4a7,metal:0x747d80
  }
});
function materialRole(name=''){
  const n=String(name).toLowerCase();
  if(/glass|window|windshield|windscreen/.test(n))return'glass';
  if(/tire|tyre|wheel|rubber/.test(n))return'tire';
  if(/light|lamp|headlight|taillight/.test(n))return'light';
  if(/roof|shingle|tile/.test(n))return'roof';
  if(/wall|brick|plaster|facade|house/.test(n))return'wall';
  if(/wood|door|frame|beam|bark/.test(n))return'wood';
  if(/metal|bumper|axle|pipe|rim/.test(n))return'metal';
  if(/trim|border|step/.test(n))return'trim';
  return'body';
}
function recolorShared(o,presetName){
  const p=SHARED_MATERIAL_PRESETS[presetName];if(!p)return o;
  const fallbackRoles=presetName==='schoolBus'?['body','glass','tire','metal','light','trim']:['wall','roof','wood','glass','trim','metal'];
  const slotRoles=new Map();let nextSlot=0;
  o.traverse(n=>{
    if(!n.isMesh)return;
    const original=Array.isArray(n.material)?n.material:[n.material];
    const next=original.map(m=>{
      const q=m?.clone?.()||new THREE.MeshStandardMaterial();
      const label=(n.name||'')+' '+(m?.name||''),semantic=materialRole(label);
      const meaningful=/glass|window|windshield|windscreen|tire|tyre|wheel|rubber|light|lamp|headlight|taillight|roof|shingle|tile|wall|brick|plaster|facade|house|wood|door|frame|beam|bark|metal|bumper|axle|pipe|rim|trim|border|step/i.test(label);
      const key=m?.uuid||label;
      if(!slotRoles.has(key))slotRoles.set(key,fallbackRoles[Math.min(nextSlot++,fallbackRoles.length-1)]);
      const role=meaningful?semantic:slotRoles.get(key);
      if(q.color)q.color.setHex(p[role]??p.body??0x8c8c8c);
      if(!q.map){q.roughness=role==='glass'?.28:role==='metal'?.52:.78;q.metalness=role==='metal'?.28:0}
      if(role==='glass'){q.transparent=true;q.opacity=.72;q.depthWrite=false}
      return q
    });
    n.material=Array.isArray(n.material)?next:next[0]
  });
  return o
}
const AVATAR_PREVIEW_KEY='kidscade-avatar-studio-preview';
function kidscadeHost(){try{if(parent&&parent!==window&&parent.location.origin===location.origin)return parent}catch(_){}return window}
function safeGet(fn,f=''){try{return fn()}catch(_){return f}}
function currentAvatarSource(){
 const h=kidscadeHost();
 const saved=safeGet(()=>localStorage.getItem(AVATAR_PREVIEW_KEY),'')||safeGet(()=>h.localStorage.getItem(AVATAR_PREVIEW_KEY),'');
 if(saved&&saved.startsWith('data:image'))return saved;
 const apis=[safeGet(()=>window.KidscadeAvatarShop,null),safeGet(()=>h.KidscadeAvatarShop,null),safeGet(()=>h.document?.getElementById('kidscade-avatar-studio-frame')?.contentWindow?.KidscadeAvatarShop,null)];
 const api=apis.find(v=>v&&typeof v.renderPreviewFrame==='function');
 const frame=safeGet(()=>api?.renderPreviewFrame?.('idle',0),'');
 if(frame&&frame.startsWith('data:image'))return frame;
 const svg=safeGet(()=>typeof h.renderAvatarSVG==='function'?h.renderAvatarSVG():'','');
 if(!svg)return '';
 const embedded=(svg.match(/<image[^>]+href=["']([^"']+)["']/i)||[])[1];
 if(embedded&&embedded.startsWith('data:image'))return embedded;
 return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
const ITEMS={
  wood:['목재','🪵'],stone:['돌','🪨'],dirtyWater:['강물','🫗'],chemWater:['공장 오염수','☣️'],cleanWater:['깨끗한 물','💧'],
  food:['통조림','🥫'],potato:['감자','🥔'],cookedPotato:['구운 감자','🍠'],spoiledFood:['상한 음식','🤢'],cloth:['천','🧵'],
  scrap:['고철','⚙️'],battery:['배터리','🔋'],flashlight:['손전등','🔦'],axe:['돌도끼','🪓']
};
const BUILD={
  campfire:{name:'모닥불',icon:'🔥',cost:{wood:3,stone:4},model:'campfire-pit.glb',radius:1.2},
  shelter:{name:'간이 쉼터',icon:'⛺',cost:{wood:8,stone:4},model:'structure.glb',radius:2.2},
  workbench:{name:'작업대',icon:'🛠️',cost:{wood:5,stone:2},model:'workbench.glb',radius:1.2},
  farm:{name:'작은 텃밭',icon:'🌱',cost:{wood:4,stone:1},model:'patch-grass-large.glb',radius:2.4},
  cooler:{name:'냉장 보관함',icon:'🧊',cost:{wood:2,scrap:3,battery:1},model:'chest.glb',radius:1.3},
  purifier:{name:'전기 정수기',icon:'🚰',cost:{cloth:2,scrap:2,stone:2},model:'barrel.glb',radius:1.3},
  storehouse:{name:'공동창고',icon:'📦',cost:{wood:6,scrap:2},model:'chest.glb',radius:1.6}
};
const ROAD_NODES={
 camp:{x:0,z:8}, forest:{x:-12,z:8}, schoolRoad:{x:16,z:8}, mainCross:{x:16,z:BRIDGE_Z},
 bridgeW:{x:25,z:BRIDGE_Z}, bridgeE:{x:35,z:BRIDGE_Z}, cityWest:{x:44,z:BRIDGE_Z}, cityNorth:{x:52,z:BRIDGE_Z},
 cityMid:{x:52,z:-35}, cityCross:{x:52,z:-44}, citySouth:{x:52,z:-52},
 eastNorth:{x:60,z:BRIDGE_Z}, eastMid:{x:60,z:-35}, eastCross:{x:60,z:-44}, eastSouth:{x:60,z:-52},
 market:{x:48.6,z:-35}, clinic:{x:55.8,z:-35}, garage:{x:48.6,z:-51}, power:{x:57.4,z:-48.7}
};
const ROAD_EDGES=[
 ['camp','forest'],['camp','schoolRoad'],['schoolRoad','mainCross'],['mainCross','bridgeW'],['bridgeW','bridgeE'],['bridgeE','cityWest'],['cityWest','cityNorth'],
 ['cityNorth','cityMid'],['cityMid','cityCross'],['cityCross','citySouth'],['cityNorth','eastNorth'],['cityMid','eastMid'],['cityCross','eastCross'],['citySouth','eastSouth'],
 ['eastNorth','eastMid'],['eastMid','eastCross'],['eastCross','eastSouth'],['cityMid','market'],['cityMid','clinic'],['citySouth','garage'],['eastSouth','power']
];
const RUIN_SPOTS={
 marketShelf:{site:'market',name:'식품 진열대',loot:{food:2}},
 marketBack:{site:'market',name:'무너진 뒤편 선반',loot:{potato:2},hazard:'unstable'},
 clinicCabinet:{site:'clinic',name:'진료소 캐비닛',loot:{cloth:2}},
 clinicSupply:{site:'clinic',name:'응급 보급함',loot:{food:1,cloth:1}},
 garageBench:{site:'garage',name:'정비 작업대',loot:{scrap:2}},
 garageLocker:{site:'garage',name:'금속 보관함',loot:{wood:1,battery:1},hazard:'sharp'}
};
const JOBS={
  technician:{name:'기술 담당',icon:'⚙️',desc:'하루가 바뀔 때 수리에 쓸 고철을 1개 확보합니다.'},
  gatherer:{name:'채집 담당',icon:'🪓',desc:'함께 채집해 나무·돌·먹을거리 획득량이 1개 늘어납니다.'},
  medic:{name:'의료 담당',icon:'🩹',desc:'굶주림과 갈증이 안정적일 때 체력 회복 속도가 2배가 됩니다.'}
};
const JOB_SCHEDULES={
 technician:[['아침 준비',6.5,8,'home'],['전력 장비 점검',8,12,'work'],['점심과 휴식',12,13,'meal'],['작업대 정비',13,18,'work'],['저녁 귀가',18,22,'home'],['수면',22,30,'home']],
 gatherer:[['아침 준비',6.5,8,'home'],['텃밭·채집 작업',8,12,'work'],['점심과 휴식',12,13,'meal'],['숲 채집·운반',13,18,'work'],['저녁 귀가',18,22,'home'],['수면',22,30,'home']],
 medic:[['아침 건강 확인',6.5,8,'work'],['쉼터 진료',8,12,'work'],['점심과 휴식',12,13,'meal'],['진료소 물품 회수',13,18,'work'],['저녁 귀가',18,22,'home'],['수면',22,30,'home']]
};
const KNOWLEDGE=[
 ['waterRisk','과학 · 물질','맑아 보여도 안전한 물은 아니다','자연의 물에는 눈에 보이지 않는 생물학적 위험이 있을 수 있습니다.'],
 ['boiling','과학 · 물질','끓이기는 생물학적 위험을 줄인다','충분히 가열하면 많은 미생물 위험을 줄일 수 있지만 모든 화학 오염을 없애는 만능 정수법은 아닙니다.'],
 ['chemicalPollution','과학 · 물질','끓여도 사라지지 않는 오염이 있다','일부 화학 오염은 물을 끓여도 안전해지지 않습니다. 오염원을 피하거나 알맞은 정수 방법과 다른 수원을 찾아야 합니다.'],
 ['combustion','과학 · 에너지','불에는 연료와 산소, 충분한 온도가 필요하다','젖은 연료는 불이 붙기 어렵고 연료가 다하면 불도 꺼집니다.'],
 ['insulation','과학 · 열','쉼터는 열 손실을 줄인다','비와 바람을 피하고 열의 이동을 줄이면 체온을 지키기 쉬워집니다.'],
 ['plantGrowth','과학 · 생명','먹을거리도 다시 자라나는 자원이다','식물은 알맞은 환경과 시간이 있으면 다시 자랄 수 있어 지속적인 식량원이 됩니다.'],
 ['foodPreservation','과학 · 생명','낮은 온도는 음식의 변화를 늦춘다','차갑게 보관하면 미생물의 활동과 여러 변화가 느려져 음식이 상하는 속도를 늦출 수 있습니다.'],
 ['waterTreatment','과학 · 물질','정수는 여러 단계를 조합한다','여과와 소독처럼 서로 다른 처리를 조합하면 물속 위험을 줄이는 데 도움이 됩니다. 오염 종류에 따라 필요한 방법은 달라집니다.'],
 ['ruinSafety','과학 · 안전','폐허에서는 물자보다 위험을 먼저 살핀다','무너진 구조물과 깨진 유리, 날카로운 금속은 보이지 않는 위험이 될 수 있습니다. 먼저 주변을 관찰하고 안전한 접근 경로를 찾는 것이 중요합니다.'],
 ['electricity','과학 · 전기','전기는 생산·저장·사용이 연결된다','배터리는 에너지를 저장하지만 필요한 곳에 우선순위를 정해 써야 합니다.'],
 ['division','사회 · 공동체','분업은 서로 다른 능력을 연결한다','각자가 잘하는 일을 맡으면 공동체 전체가 더 많은 일을 해낼 수 있습니다.'],
 ['logistics','사회 · 경제생활','생산한 물자는 보관하고 옮겨야 쓸 수 있다','공동체의 생산은 물자를 만드는 것에서 끝나지 않습니다. 필요한 곳에 저장하고 운반하는 물류가 있어야 실제 생활에 사용할 수 있습니다.'],
 ['scarcity','사회 · 경제생활','자원이 부족하면 선택이 필요하다','희소한 자원을 어디에 먼저 쓸지 정하면 얻는 것과 포기하는 것이 함께 생깁니다.'],
 ['community','사회 · 공동체','규칙은 함께 살아가기 위한 약속이다','공동체의 규칙은 사람들의 필요와 자원의 상태에 따라 서로 다른 결과를 만들 수 있습니다.'],
 ['riverSettlement','사회 · 지리','강은 정착에 유리하지만 위험도 있다','물과 농업·이동에 유리하지만 홍수 피해에 대비해야 합니다.'],
 ['flood','과학·사회 융합','재난은 자연현상과 사회의 준비가 함께 만든다','같은 폭우라도 지형, 시설, 대피와 자원 준비에 따라 피해가 달라질 수 있습니다.']
].map(x=>({id:x[0],subject:x[1],title:x[2],text:x[3]}));
const MISSIONS={
 1:{title:'깨끗한 물을 확보하라',text:'강에서 물을 뜬 뒤 체육관의 비상 버너를 이용해 첫 식수를 확보하세요.',steps:[['water','강물 뜨기'],['boil','물 끓이기'],['drink','깨끗한 물 마시기']]},
 2:{title:'불과 도구를 준비하라',text:'숲과 바위에서 자원을 모아 돌도끼와 모닥불을 준비하세요.',steps:[['axe','돌도끼 제작'],['campfire','모닥불 설치'],['cook','음식 익히기']]},
 3:{title:'비를 견딜 쉼터를 지어라',text:'오후부터 비가 내립니다. 쉼터를 만들고 비가 올 때 그 안으로 들어가세요.',steps:[['shelter','쉼터 설치'],['rain','비 오는 동안 쉼터에 있기']]},
 4:{title:'폐허 도시의 전력을 되살려라',text:'동쪽 폐허에서 배터리와 고철을 찾고 비상 배전반을 복구하세요.',steps:[['ruins','폐허 도시 도착'],['battery','배터리 확보'],['power','비상 전력 복구']]},
 5:{title:'혼자가 아닌 생존',text:'구조한 생존자에게 공동체에서 맡을 역할을 직접 정해 주세요.',steps:[['rescue','생존자 구조'],['job','역할 배정']]},
 6:{title:'부족한 자원을 함께 나눠라',text:'공동체의 식량과 물이 넉넉하지 않습니다. 배분 원칙을 정하세요.',steps:[['choice','배분 원칙 정하기'],['stock','공동 비축 확보']]},
 7:{title:'강이 넘치기 전에 대비하라',text:'폭우가 계속됩니다. 식수·식량·쉼터를 확인한 뒤 무전기로 구조 신호를 보내세요.',steps:[['ready','비상 물자 준비'],['radio','무전 송신']]}
};
const TUTORIAL=[
 {title:'이동해 보기',text:'WASD 또는 방향키로 캐릭터를 움직여 보세요.',hint:'앞으로 가는 W는 화면이 바라보는 방향으로 이동합니다.'},
 {title:'주변 둘러보기',text:'마우스를 누른 채 드래그해서 카메라를 돌려 보세요.',hint:'휠을 굴리면 카메라 거리를 바꿀 수 있습니다.'},
 {title:'강을 찾아가기',text:'화면 위 목표 표시를 따라 강변까지 이동하세요.',hint:'목표까지 거리가 점점 줄어드는지 확인하세요.'},
 {title:'강물 뜨기',text:'강변의 상호작용 표시가 뜨면 E를 눌러 물을 뜨세요.',hint:'맑아 보여도 바로 마시는 물은 아닙니다.'},
 {title:'물을 끓이기',text:'학교 야영지의 비상 버너로 돌아와 E를 눌러 물을 끓이세요.',hint:'처음 한 번은 비상 버너의 남은 연료를 사용할 수 있습니다.'},
 {title:'깨끗한 물 마시기',text:'하단 1번 슬롯 또는 숫자 1을 눌러 끓인 물을 마셔 보세요.',hint:'이 행동까지 마치면 조작 튜토리얼이 끝납니다.'}
];
const ui={
 canvas:$('#game'),hud:$('#hud'),start:$('#start'),loading:$('#loading'),loadingText:$('#loadingText'),ending:$('#ending'),decision:$('#decision'),
 newGame:$('#newGame'),continueGame:$('#continueGame'),restartGame:$('#restartGame'),
 day:$('#dayText'),clock:$('#clockText'),weather:$('#weatherText'),missionTitle:$('#missionTitle'),missionText:$('#missionText'),
 missionSteps:$('#missionSteps'),missionKicker:$('#missionKicker'),health:$('#health'),hunger:$('#hunger'),thirst:$('#thirst'),temp:$('#temp'),
 zone:$('#zoneText'),bearing:$('#bearingText'),interact:$('#interactPrompt'),toast:$('#toast'),panel:$('#panel'),panelTitle:$('#panelTitle'),
 panelBody:$('#panelBody'),closePanel:$('#closePanel'),hotWater:$('#hotWater'),hotFood:$('#hotFood'),hotAxe:$('#hotAxe'),hotItems:$('#hotItems'),
 endingText:$('#endingText'),endingStats:$('#endingStats'),continueSettlement:$('#continueSettlement'),joyKnob:$('#joyKnob'),mobileInteract:$('#mobileInteract'),
 mobileBuild:$('#mobileBuild'),mobileTablet:$('#mobileTablet'),tutorial:$('#tutorialCoach'),tutorialStep:$('#tutorialStep'),tutorialTitle:$('#tutorialTitle'),tutorialText:$('#tutorialText'),tutorialHint:$('#tutorialHint'),tutorialSkip:$('#tutorialSkip')
};
let scene,camera,renderer,loader,clock,game=null,running=false,paused=false,toastT=0,lastSave=0;
let camYaw=Math.PI,camPitch=.31,camDist=6.8,drag=false,lastPointer=null,buildMode=null,ghost=null,currentInteract=null;
const keys=new Set(), interactables=[], resources=[], placed=[], colliders=[], ruinZones=[], artFootprints=[], models=new Map();
const groups={world:new THREE.Group(),props:new THREE.Group(),dynamic:new THREE.Group(),buildings:new THREE.Group(),weather:new THREE.Group(),fx:new THREE.Group()};
const player={root:new THREE.Group(),visual:new THREE.Group(),speed:0,velocity:new THREE.Vector3(),wishDir:new THREE.Vector3(),touch:new THREE.Vector2(),sprite:null,model:null,walkPhase:0,stepClock:0,locomotion:'idle',stateTime:0,cameraArm:6.8};
const tmp=new THREE.Vector3(),tmp2=new THREE.Vector3(),fxParticles=[];
let audioCtx=null,audioMaster=null,windGain=null,rainGain=null,cameraKick=0;

function fresh(){
 return {version:1,day:1,time:430,health:100,hunger:82,thirst:72,temp:36.6,pos:{x:0,z:8},yaw:Math.PI,
  inv:{wood:0,stone:0,dirtyWater:0,chemWater:0,cleanWater:0,food:1,potato:1,cookedPotato:0,spoiledFood:0,cloth:0,scrap:0,battery:0,flashlight:0,axe:0},
  flags:{},buildings:[],knowledge:[],survivors:0,job:null,residents:{taeho:{rescued:false,job:null},mira:{rescued:false,job:null},junseo:{rescued:false,job:null}},
  powerKw:0,powerLoads:{light:true,cooler:true,purifier:true},trust:60,communityHealth:70,productivity:70,morale:70,
  distribution:null,floodLevel:0,phase:'survival',settlementLevel:0,storage:{},companion:null,flashlightOn:false,flashlightCharge:100,ruinNoise:0,worldSeed:Math.floor(Math.random()*1000000000),tutorial:{step:0,done:false,move:0,camera:false},playSeconds:0,finished:false};
}
function parse(v,d){try{return JSON.parse(v)??d}catch(_){return d}}
function load(){
 const s=parse(localStorage.getItem(SAVE),null);if(!s||s.version!==1)return null;const f=fresh();
 const merged={...f,...s,inv:{...f.inv,...s.inv},storage:{...f.storage,...(s.storage||{})},flags:{...s.flags},powerLoads:{...f.powerLoads,...(s.powerLoads||{})},tutorial:{...f.tutorial,...(s.tutorial||{})},buildings:Array.isArray(s.buildings)?s.buildings:[],knowledge:Array.isArray(s.knowledge)?s.knowledge:[],residents:{...f.residents,...(s.residents||{})}};
 if(s.survivors>0&&!merged.residents.taeho?.rescued)merged.residents.taeho={rescued:true,job:s.job||null};
 merged.survivors=Object.values(merged.residents).filter(r=>r?.rescued).length;merged.job=merged.residents.taeho?.job||s.job||null;
 return merged
}
function save(){if(!game)return;game.pos={x:player.root.position.x,z:player.root.position.z};game.yaw=camYaw;localStorage.setItem(SAVE,JSON.stringify(game));localStorage.setItem(KNOW,JSON.stringify([...new Set(game.knowledge)]))}
function withOldKnowledge(g){const old=parse(localStorage.getItem(KNOW),'[]');if(Array.isArray(old))g.knowledge=[...new Set([...g.knowledge,...old])];return g}
function flag(id,val=true){if(game.flags[id]===val)return false;game.flags[id]=val;save();updateMission();return true}
function discover(id){if(game.knowledge.includes(id))return;game.knowledge.push(id);const k=KNOWLEDGE.find(v=>v.id===id);if(k){sfx('discover');toast('📖 지식 발견 · '+k.title,'normal',3.2)}save();renderOpenPanel()}
function toast(text,tone='normal',sec=2.3){ui.toast.textContent=text;ui.toast.style.borderColor=tone==='danger'?'rgba(255,100,100,.6)':tone==='warn'?'rgba(255,211,106,.6)':'rgba(128,227,162,.42)';ui.toast.classList.add('show');toastT=sec}
function ensureAudio(){
 try{
  if(audioCtx){if(audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});return audioCtx}
  const A=window.AudioContext||window.webkitAudioContext;if(!A)return null;audioCtx=new A();audioMaster=audioCtx.createGain();audioMaster.gain.value=.48;audioMaster.connect(audioCtx.destination);
  const makeLoop=(kind,cutoff)=>{const len=Math.max(1,Math.floor(audioCtx.sampleRate*2)),buf=audioCtx.createBuffer(1,len,audioCtx.sampleRate),d=buf.getChannelData(0);for(let i=0;i<len;i++){const white=Math.random()*2-1;d[i]=kind==='rain'?white*.52:(white*.55+Math.sin(i*.0009)*.12)}const src=audioCtx.createBufferSource(),flt=audioCtx.createBiquadFilter(),gain=audioCtx.createGain();src.buffer=buf;src.loop=true;flt.type='lowpass';flt.frequency.value=cutoff;gain.gain.value=0;src.connect(flt).connect(gain).connect(audioMaster);src.start();return gain};
  windGain=makeLoop('wind',720);rainGain=makeLoop('rain',2200);return audioCtx
 }catch(_){return null}
}
function tone(freq,d=.08,type='sine',vol=.04,slide=1){
 const a=ensureAudio();if(!a||!audioMaster)return;const t=a.currentTime,o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(40,freq*slide),t+d);g.gain.setValueAtTime(Math.max(.0001,vol),t);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g).connect(audioMaster);o.start(t);o.stop(t+d+.02)
}
function noiseHit(d=.07,vol=.025,cutoff=900){
 const a=ensureAudio();if(!a||!audioMaster)return;const n=Math.max(1,Math.floor(a.sampleRate*d)),buf=a.createBuffer(1,n,a.sampleRate),arr=buf.getChannelData(0);for(let i=0;i<n;i++)arr[i]=(Math.random()*2-1)*(1-i/n);const src=a.createBufferSource(),flt=a.createBiquadFilter(),g=a.createGain();src.buffer=buf;flt.type='lowpass';flt.frequency.value=cutoff;g.gain.value=vol;src.connect(flt).connect(g).connect(audioMaster);src.start()
}
function sfx(kind){
 if(kind==='step'){noiseHit(.045,.018,520);tone(88,.045,'sine',.012,.82)}
 else if(kind==='chop'){noiseHit(.07,.04,760);tone(138,.09,'square',.026,.54)}
 else if(kind==='mine'){noiseHit(.075,.035,1500);tone(330,.11,'triangle',.032,.72)}
 else if(kind==='pickup'){tone(520,.065,'sine',.027,1.45);tone(760,.07,'sine',.018,1.1)}
 else if(kind==='water'){noiseHit(.13,.024,2200);tone(620,.12,'sine',.018,.72)}
 else if(kind==='fire'){tone(210,.08,'triangle',.023,.62);noiseHit(.055,.02,1100)}
 else if(kind==='power'){tone(180,.1,'sine',.03,1.8);tone(420,.18,'triangle',.026,1.3)}
 else if(kind==='rescue'){tone(440,.1,'sine',.025,1.25);tone(660,.18,'sine',.03,1.3)}
 else if(kind==='door'){tone(105,.11,'triangle',.026,.7);noiseHit(.08,.018,680)}
 else if(kind==='search'){noiseHit(.09,.024,1250);tone(310,.07,'triangle',.014,.82)}
 else if(kind==='discover'){tone(660,.08,'triangle',.024,1.15);tone(920,.16,'triangle',.027,1.08)}
}
function surfaceKind(){
 const p=player.root.position;if(Math.abs(p.x-16)<4.2||Math.abs(p.z+27)<3.8&&p.x>-35&&p.x<70)return'road';if(p.distanceTo(CITY_CENTER)<25)return'city';return p.x<-18?'forest':'ground'
}
function spawnImpact(pos,kind,count=9){
 const pal=kind==='tree'?[0x8d5d3b,0x5b7d45,0xa87547]:kind==='rock'?[0x8b8e88,0xb3b4ae,0x666b68]:[0x6fa6c2,0xbde7ee,0x4f8ca9];
 for(let i=0;i<count;i++){const geo=new THREE.BoxGeometry(.05+Math.random()*.08,.05+Math.random()*.09,.05+Math.random()*.08),m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:pal[i%pal.length],transparent:true}));m.position.copy(pos).add(new THREE.Vector3((Math.random()-.5)*.7,.5+Math.random()*.8,(Math.random()-.5)*.7));groups.fx.add(m);fxParticles.push({m,v:new THREE.Vector3((Math.random()-.5)*2.2,1.4+Math.random()*2.4,(Math.random()-.5)*2.2),life:.45+Math.random()*.28})}
}
function updateFx(dt){
 for(let i=fxParticles.length-1;i>=0;i--){const p=fxParticles[i];p.life-=dt;p.v.y-=5.8*dt;p.m.position.addScaledVector(p.v,dt);p.m.rotation.x+=dt*7;p.m.rotation.z+=dt*5;p.m.material.opacity=clamp(p.life/.22,0,1);if(p.life<=0){groups.fx.remove(p.m);p.m.geometry.dispose();p.m.material.dispose();fxParticles.splice(i,1)}}
 cameraKick=damp(cameraKick,0,10,dt)
}
function updateAudio(dt){
 if(!audioCtx)return;const w=getWeather(),hour=game?.time/60||12,night=hour<6.5||hour>19.5;
 const indoor=currentRuinZone(),muffle=indoor?.site?.28:1;if(windGain)windGain.gain.setTargetAtTime(((w==='rain'?.022:night?.012:.008)+(player.root.position.x<-18?.006:0))*muffle,audioCtx.currentTime,.35);
 if(rainGain)rainGain.gain.setTargetAtTime((w==='rain'?.045:0)*muffle,audioCtx.currentTime,.22)
}
function has(cost){return Object.entries(cost).every(([k,v])=>(game.inv[k]||0)>=v)}
function pay(cost){Object.entries(cost).forEach(([k,v])=>game.inv[k]=Math.max(0,(game.inv[k]||0)-v))}
function stock(id){return (game.inv[id]||0)+(game.storage?.[id]||0)}
function storageItems(){return Object.keys(ITEMS).filter(id=>!['axe','flashlight','chemWater','spoiledFood'].includes(id))}
function storageBuilt(){return hasBuilding('storehouse')}
function storeItem(id,n=1){if(!storageBuilt())return false;game.storage[id]=(game.storage[id]||0)+n;return true}
function deliverResource(id,n,source='주민 작업'){
 if(n<=0)return;if(storageBuilt()){storeItem(id,n);discover('logistics');toast('📦 '+source+' · '+(ITEMS[id]?.[0]||id)+' '+n+'개가 공동창고에 들어왔습니다.','normal',2.8)}
 else game.inv[id]=(game.inv[id]||0)+n
}
function depositStorage(){
 if(!storageBuilt())return toast('공동창고를 먼저 건설해야 합니다.','warn');let moved=0;
 for(const id of storageItems()){const n=game.inv[id]||0;if(n>0){game.storage[id]=(game.storage[id]||0)+n;game.inv[id]=0;moved+=n}}
 if(moved){discover('logistics');toast('📦 가방의 물자를 공동창고에 정리했습니다. 총 '+moved+'개','normal',3);save();renderPanel('storage');updateUI()}else toast('보관할 물자가 없습니다.')
}
function withdrawStorage(id,n=1){
 if(!storageBuilt())return;const have=game.storage[id]||0,take=Math.min(have,n);if(take<1)return toast('창고에 해당 물자가 없습니다.','warn');game.storage[id]-=take;game.inv[id]=(game.inv[id]||0)+take;toast((ITEMS[id]?.[1]||'📦')+' '+(ITEMS[id]?.[0]||id)+' '+take+'개 꺼냄');save();renderPanel('storage');updateUI()
}
function costText(cost){return Object.entries(cost).map(([k,v])=>(ITEMS[k]?.[1]||'•')+' '+(ITEMS[k]?.[0]||k)+' '+v).join(' · ')}
function addItem(id,n=1){game.inv[id]=(game.inv[id]||0)+n;sfx('pickup');toast((ITEMS[id]?.[1]||'📦')+' '+(ITEMS[id]?.[0]||id)+' +'+n);save();updateUI()}
function settlementSteps(){
 return [
  ['people','주민 3명 구조',residentCount()>=3],
  ['roles','주민 역할 배정',Object.values(game.residents||{}).filter(r=>r?.rescued).every(r=>!!r.job)],
  ['farm','텃밭 건설',hasBuilding('farm')],
  ['waterSystem','전기 정수기 건설',hasBuilding('purifier')&&!!game.flags.power],
  ['coldStorage','냉장 보관함 건설',hasBuilding('cooler')&&!!game.flags.power],
  ['reserve','식수 4 · 식량 6 비축',stock('cleanWater')>=4&&(stock('food')+stock('potato')+stock('cookedPotato'))>=6]
 ]
}
function missionDone(day=game.day){if(game?.phase==='settlement')return settlementSteps().every(s=>s[2]);const m=MISSIONS[day];return !!m&&m.steps.every(([id])=>!!game.flags[id])}
function groundColor(x,z,h=0){
 const base=new THREE.Color(0x73915f),forest=new THREE.Color(0x496c4b),hill=new THREE.Color(0x66745a),city=new THREE.Color(0x777b70),camp=new THREE.Color(0x819866),bank=new THREE.Color(0x7d8f63);
 let out=base.clone();const cityD=Math.hypot((x-49)/35,(z+33)/27),campD=Math.hypot((x+3)/28,(z-14)/24);
 if(x<-17)out.lerp(forest,clamp((-x-17)/38,0,1));if(x<-42&&z>14)out.lerp(hill,.65);
 if(cityD<1)out.lerp(city,clamp(1-cityD,0,1)*.72);if(campD<1)out.lerp(camp,clamp(1-campD,0,1)*.32);
 if(Math.abs(x-RIVER_X)<11)out.lerp(bank,clamp(1-Math.abs(x-RIVER_X)/11,0,1)*.4);
 const n=(Math.sin(x*.31+z*.17)+Math.sin(x*.11-z*.27))*.018;out.offsetHSL(0,0,n-h*.003);return out
}
function makeRiverGeometry(){
 const seg=40,half=7,verts=[],uv=[],idx=[];for(let i=0;i<=seg;i++){const z=-70+i*(140/seg),center=Math.sin(z*.055)*.75,width=half+Math.sin(z*.09)*.55;verts.push(center-width,0,z,center+width,0,z);uv.push(0,i/seg,1,i/seg)}
 for(let i=0;i<seg;i++){const a=i*2,b=a+1,c=a+2,d=a+3;idx.push(a,c,b,b,c,d)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g
}
function terrainHeight(x,z){
 let h=0;
 if(x<-15){const t=clamp((-x-15)/52,0,1);h+=t*(.35+.55*(Math.sin(x*.12)+Math.cos(z*.11))*.5+.7*Math.max(0,Math.sin((x+z)*.07)))}
 if(x<-42&&z>16)h+=1.25*clamp((-x-42)/22,0,1)*clamp((z-16)/35,0,1);
 return Math.max(0,h)
}
function addCollider(x,z,w,d,pad=.55){const b={x,z,hw:w/2+pad,hd:d/2+pad,cameraBlocker:w>3||d>3,enabled:true};colliders.push(b);return b}
function circleAabbHit(x,z,r,b){const nx=clamp(x,b.x-b.hw,b.x+b.hw),nz=clamp(z,b.z-b.hd,b.z+b.hd);return (x-nx)*(x-nx)+(z-nz)*(z-nz)<r*r}
function blockedAt(x,z,r=.42){
 if(colliders.some(b=>b.enabled!==false&&circleAabbHit(x,z,r,b)))return true;
 if(resources.some(o=>o.userData.available&&o.userData.resource!=='forage'&&Math.hypot(x-o.position.x,z-o.position.z)<r+(o.userData.resource==='tree'?.68:.94)))return true;
 return placed.some(p=>{const id=p.userData.interactable?.building;if(id==='campfire'||id==='farm')return false;const pr=(BUILD[id]?.radius||1)+.28;return Math.hypot(x-p.position.x,z-p.position.z)<r+pr})
}
function angleDelta(a,b){let d=(b-a+Math.PI)%(Math.PI*2)-Math.PI;if(d<-Math.PI)d+=Math.PI*2;return d}
function dampAngle(a,b,lambda,dt){return a+angleDelta(a,b)*(1-Math.exp(-lambda*dt))}
function setLocomotion(next){if(player.locomotion===next)return;player.locomotion=next;player.stateTime=0}
function riverBlocks(x,z,r=.42){return Math.abs(x-RIVER_X)<riverHalfWidth()+r&&Math.abs(z-BRIDGE_Z)>3.5}
function slopeAllowed(x0,z0,x1,z1){
 const d=Math.max(.001,Math.hypot(x1-x0,z1-z0)),rise=terrainHeight(x1,z1)-terrainHeight(x0,z0);return {ok:rise/d<=.72,slow:clamp(1-Math.max(0,rise/d)*.42,.62,1)}
}
function tryPlayerMove(dx,dz){
 const ox=player.root.position.x,oz=player.root.position.z,fullX=clamp(ox+dx,-68,68),fullZ=clamp(oz+dz,-68,68),fullSlope=slopeAllowed(ox,oz,fullX,fullZ);
 if(fullSlope.ok&&!blockedAt(fullX,fullZ)&&!riverBlocks(fullX,fullZ)){player.root.position.x=ox+dx*fullSlope.slow;player.root.position.z=oz+dz*fullSlope.slow;return true}
 const sx=clamp(ox+dx,-68,68),slopeX=slopeAllowed(ox,oz,sx,oz);
 if(Math.abs(dx)>.0001&&slopeX.ok&&!blockedAt(sx,oz)&&!riverBlocks(sx,oz)){player.root.position.x=ox+dx*slopeX.slow;player.velocity.z*=.35;return true}
 const sz=clamp(oz+dz,-68,68),slopeZ=slopeAllowed(ox,oz,ox,sz);
 if(Math.abs(dz)>.0001&&slopeZ.ok&&!blockedAt(ox,sz)&&!riverBlocks(ox,sz)){player.root.position.z=oz+dz*slopeZ.slow;player.velocity.x*=.35;return true}
 player.velocity.x*=.18;player.velocity.z*=.18;return false
}
function solidBox(w,h,d,c,x,y,z,pad=.25){const m=box(w,h,d,c,x,y,z);addCollider(x,z,w,d,pad);return m}
function currentRuinZone(){
 const px=player?.root?.position?.x??999,pz=player?.root?.position?.z??999;return ruinZones.find(z=>Math.abs(px-z.x)<z.hw&&Math.abs(pz-z.z)<z.hd)||null
}
function ruinShell(site,name,x,z,w,d,c=0x777b78,doorSide='east'){
 const wall=.45,h=3.4,door=2.4,walls=[],east=doorSide==='east';
 walls.push(solidBox(w,h,wall,c,x,h/2,z-d/2),solidBox(w,h,wall,c,x,h/2,z+d/2));
 if(east){
  walls.push(solidBox(wall,h,d,c,x-w/2,h/2,z),solidBox(wall,h,(d-door)/2,c,x+w/2,h/2,z-(d+door)/4),solidBox(wall,h,(d-door)/2,c,x+w/2,h/2,z+(d+door)/4))
 }else{
  walls.push(solidBox(wall,h,d,c,x+w/2,h/2,z),solidBox(wall,h,(d-door)/2,c,x-w/2,h/2,z-(d+door)/4),solidBox(wall,h,(d-door)/2,c,x-w/2,h/2,z+(d+door)/4))
 }
 walls.forEach(m=>{m.visible=false;m.material.transparent=true;m.material.opacity=0});
 const floor=box(w-.5,.07,d-.5,0x555b58,x,.035,z),roof=box(w,.15,d,0x303635,x,h+.08,z);roof.material=roof.material.clone();roof.material.transparent=true;roof.material.opacity=.94;roof.castShadow=true;
 const zone={site,name,x,z,hw:w/2-.4,hd:d/2-.4,walls,roof,light:null};ruinZones.push(zone);
 const panel=3.35,doorX=x+(east?w/2-.15:-w/2+.15),doorRot=east?Math.PI*.5:-Math.PI*.5;
 placeWorldModelSafe(ART.buildings+'wall-doorway-wide-square.glb',{x:doorX,z,target:panel,rot:doorRot,w:1,d:3.2,tag:'ruin-'+site,allowOverlap:true});
 placeWorldModelSafe(ART.buildings+'wall-window-wide-square-detailed.glb',{x:x-w*.18,z:z-d/2+.1,target:panel,rot:0,w:3.2,d:1,tag:'ruin-'+site,allowOverlap:true});
 placeWorldModelSafe(ART.buildings+'wall-window-square-detailed.glb',{x:x+(east?-w/2+.1:w/2-.1),z:z+d*.15,target:panel,rot:doorRot,w:1,d:3.2,tag:'ruin-'+site,allowOverlap:true});
 placeWorldModelSafe(ART.buildings+'wall.glb',{x:x+w*.22,z:z+d/2-.1,target:panel,rot:Math.PI,w:3.2,d:1,tag:'ruin-'+site,allowOverlap:true});
 scene.userData.ruinDoors=scene.userData.ruinDoors||{};
 const pivot=new THREE.Group();pivot.position.set(x+(east?w/2-.12:-w/2+.12),0,z-door*.45);groups.dynamic.add(pivot);
 const fallback=new THREE.Mesh(new THREE.BoxGeometry(.13,2.55,door*.9),new THREE.MeshStandardMaterial({color:0x6d5239,roughness:.86}));fallback.position.set(0,1.28,door*.45);fallback.castShadow=true;pivot.add(fallback);
 model(ART.buildings+'door-rotate-square-b.glb').then(o=>{if(!o)return;fallback.visible=false;normalize(o,2.7);o.position.z=door*.42;o.rotation.y=doorRot;pivot.add(o)});
 const blocker=addCollider(pivot.position.x,z,.32,door*.9,.02);blocker.cameraBlocker=false;addInteract(pivot,'ruinDoor',name+' 문 열기',{site});
 scene.userData.ruinDoors[site]={pivot,blocker,open:false,target:0,openAngle:east?-Math.PI*.5:Math.PI*.5,interactable:pivot};
 const light=new THREE.PointLight(site==='clinic'?0xc8e1ff:site==='garage'?0xffc37d:0xffe0aa,.18,8,2);light.position.set(x,2.45,z);scene.add(light);zone.light=light;
 label(name,x,h+1.1,z);return floor
}
function createRuinSpot(key,x,z,w=1.5,h=1.1,d=.6,color=0x6f6250){
 const info=RUIN_SPOTS[key];if(!info)return null;const o=box(w,h,d,color,x,h/2,z);o.userData.ruinSpot=key;addInteract(o,'ruinSearch',info.name+' 조사',{spot:key});return o
}
function toggleRuinDoor(site){
 const d=scene?.userData?.ruinDoors?.[site];if(!d)return;if(d.open&&player.root.position.distanceTo(d.pivot.position)<1.35)return toast('문간에서 조금 떨어져야 닫을 수 있습니다.','warn');
 d.open=!d.open;d.target=d.open?d.openAngle:0;d.blocker.enabled=!d.open;d.interactable.userData.interactable.label=(ruinZones.find(z=>z.site===site)?.name||'폐허')+(d.open?' 문 닫기':' 문 열기');sfx('door')
}
function searchRuinSpot(key){
 const info=RUIN_SPOTS[key];if(!info)return;const done='search_'+key,inspect='inspect_'+key;if(game.flags[done])return toast('이미 수색한 곳입니다.');
 if(info.hazard&&!game.flags[inspect]){
  game.flags[inspect]=true;discover('ruinSafety');const msg=info.hazard==='unstable'?'⚠️ 선반이 기울어져 있습니다. 먼저 무너지지 않는 쪽에서 접근해야 합니다.':'⚠️ 날카로운 금속과 깨진 조각이 있습니다. 손을 넣기 전에 주변을 치웠습니다.';sfx('search');toast(msg,'warn',4);save();return
 }
 sfx('search');for(const [item,n] of Object.entries(info.loot||{}))game.inv[item]=(game.inv[item]||0)+n;game.flags[done]=true;
 const same=Object.entries(RUIN_SPOTS).filter(([,v])=>v.site===info.site).map(([id])=>id),complete=same.every(id=>game.flags['search_'+id]);if(complete)game.flags['loot_'+info.site]=true;
 toast('🎒 '+info.name+' · '+Object.entries(info.loot||{}).map(([k,n])=>(ITEMS[k]?.[0]||k)+' +'+n).join(' · '),'normal',3.5);save();updateUI()
}
function ruinSearchProgress(site){
 const ids=Object.entries(RUIN_SPOTS).filter(([,v])=>v.site===site).map(([id])=>id),done=ids.filter(id=>game?.flags?.['search_'+id]).length;return {done,total:ids.length}
}
function updateRuinInteriors(dt){
 const inside=currentRuinZone(),site=inside?.site||null;if(scene.userData.activeRuinSite!==site){scene.userData.activeRuinSite=site;if(site){const p=ruinSearchProgress(site);game.flags['entered_'+site]=true;toast('🏚 '+inside.name+' 내부 · 수색 '+p.done+'/'+p.total,'normal',2.8);save()}}
 for(const z of ruinZones){const here=inside===z;if(z.roof){z.roof.material.opacity=damp(z.roof.material.opacity,here?.06:.94,8,dt);z.roof.material.depthWrite=!here}if(z.light)z.light.intensity=damp(z.light.intensity,here?.75:.16,5,dt)}
 for(const d of Object.values(scene?.userData?.ruinDoors||{}))d.pivot.rotation.y=dampAngle(d.pivot.rotation.y,d.target,10,dt)
}

function residentCount(){return Object.values(game?.residents||{}).filter(r=>r?.rescued).length}
function jobPower(role){let n=0;for(const [id,r] of Object.entries(game?.residents||{}))if(r?.rescued&&r.job===role)n+=RESIDENTS[id]?.preferred===role?1.25:1;return n}
function hasBuilding(id){return game?.buildings?.some(b=>b.id===id)}
function powerUse(extra=0){let use=0;if(game?.flags?.power&&game.powerLoads?.light)use+=.2;if(hasBuilding('cooler')&&game.powerLoads?.cooler)use+=.8;if(hasBuilding('purifier')&&game.powerLoads?.purifier)use+=1.2;return use+extra}
function devicePowered(id){if(!game?.flags?.power)return false;if(id==='light')return !!game.powerLoads?.light;if(!hasBuilding(id)||!game.powerLoads?.[id])return false;return powerUse()<=game.powerKw+.001}

function init3D(){
 renderer=new THREE.WebGLRenderer({canvas:ui.canvas,antialias:!matchMedia('(pointer:coarse)').matches,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));renderer.setSize(innerWidth,innerHeight,false);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
 scene=new THREE.Scene();scene.background=new THREE.Color(0x9ac8da);scene.fog=new THREE.Fog(0x9ac8da,50,120);
 camera=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,.1,180);clock=new THREE.Clock();loader=new GLTFLoader();
 Object.values(groups).forEach(g=>scene.add(g));
 const hemi=new THREE.HemisphereLight(0xe6f7ff,0x607054,1.7);scene.add(hemi);scene.userData.hemi=hemi;
 const sun=new THREE.DirectionalLight(0xfff0d0,2.55);sun.position.set(-32,48,20);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-70;sun.shadow.camera.right=70;sun.shadow.camera.top=70;sun.shadow.camera.bottom=-70;sun.shadow.bias=-.00015;sun.shadow.normalBias=.02;scene.add(sun);scene.userData.sun=sun;
 createSkyDome();
 const groundGeo=new THREE.PlaneGeometry(140,140,36,36),gp=groundGeo.attributes.position,colors=[];for(let i=0;i<gp.count;i++){const x=gp.getX(i),z=-gp.getY(i),h=terrainHeight(x,z),col=groundColor(x,z,h);gp.setZ(i,h);colors.push(col.r,col.g,col.b)}groundGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));gp.needsUpdate=true;groundGeo.computeVertexNormals();
 const ground=new THREE.Mesh(groundGeo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.98}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;groups.world.add(ground);
 const river=new THREE.Mesh(makeRiverGeometry(),new THREE.MeshPhysicalMaterial({color:0x4b9fb1,transparent:true,opacity:.84,roughness:.18,metalness:.03}));river.position.set(RIVER_X,.08,0);groups.world.add(river);scene.userData.river=river;
 box(7,.08,120,0x454b4b,16,.04,-2);box(95,.08,6,0x454b4b,8,.05,-27);
 for(let z=-54;z<=54;z+=10)box(.12,.012,4.7,0xe7d8a1,16,.092,z);for(let x=-34;x<=54;x+=10)box(4.7,.012,.12,0xe7d8a1,x,.092,-27);
 const bridgeHit=box(15,.35,5.5,0x4b5153,RIVER_X,.3,BRIDGE_Z);bridgeHit.material.transparent=true;bridgeHit.material.opacity=.05;
 const schoolHit=solidBox(13,5.5,9,0xc2aa85,-5,2.75,18,.15);schoolHit.visible=false;label('폐교 체육관',-5,6.9,18);
 placeWorldModel(ART.city+'big-building.glb',{x:-5,z:18,target:15.5,rot:Math.PI*.5});
 const rest=box(2.4,.12,1.2,0x526c55,1,.08,11);addInteract(rest,'rest','체육관 매트에서 쉬기');
 const burner=box(.8,.38,.7,0x4c5456,2,.19,9.4);addInteract(burner,'burner','비상 버너로 물 끓이기');label('비상 버너',2,1.25,9.4);
 const lampPole=box(.18,4,.18,0x4a5457,-2,2,10);const campLamp=new THREE.PointLight(0xffe2a1,0,18,2);campLamp.position.set(-2,3.8,10);scene.add(campLamp);scene.userData.campLamp=campLamp;
 decorateWorld();
 for(let i=0;i<18;i++)spawnResource('tree',-57+Math.random()*42,-15+Math.random()*70);
 for(let i=0;i<13;i++)spawnResource('rock',-58+Math.random()*46,-55+Math.random()*39);
 [[-8,8],[-11,13],[-7,3],[-12,5]].forEach(p=>spawnResource('tree',p[0],p[1]));
 [[-8,-2],[-12,-4],[-6,-6],[-14,0],[-10,2]].forEach(p=>spawnResource('rock',p[0],p[1]));
 [[-22,18],[-28,8],[-34,22],[-18,30],[-40,5],[-25,-8]].forEach(p=>spawnResource('forage',p[0],p[1]));
 ruinShell('market','폐마트',MARKET_POS.x,MARKET_POS.z,11,9,0x8b8375,'east');ruinShell('clinic','폐진료소',CLINIC_POS.x,CLINIC_POS.z,10,9,0x7a8587,'west');ruinShell('garage','정비 창고',GARAGE_POS.x,GARAGE_POS.z,11,8,0x6f7778,'east');
 label('폐허 도시',CITY_CENTER.x,9,CITY_CENTER.z);
 createRuinSpot('marketShelf',MARKET_POS.x-2.3,MARKET_POS.z-1.4,1.9,1.45,.65,0x775b3e);
 createRuinSpot('marketBack',MARKET_POS.x-2.5,MARKET_POS.z+2.1,1.7,1.55,.7,0x66503b);
 createRuinSpot('clinicCabinet',CLINIC_POS.x-2.0,CLINIC_POS.z-1.5,1.55,1.25,.55,0xc5cbc8);
 createRuinSpot('clinicSupply',CLINIC_POS.x-2.1,CLINIC_POS.z+2.0,1.4,1.0,.7,0x899b91);
 createRuinSpot('garageBench',GARAGE_POS.x-2.1,GARAGE_POS.z-1.2,1.9,1.05,.75,0x586164);
 createRuinSpot('garageLocker',GARAGE_POS.x-2.3,GARAGE_POS.z+1.9,1.35,1.75,.65,0x697276);
 placeWorldModel('../../assets/game/3d/survival/kenney-survival-kit/box-large-open.glb',{x:MARKET_POS.x+1.1,z:MARKET_POS.z+1.4,target:1.45,rot:.4});
 placeWorldModel('../../assets/game/3d/survival/kenney-survival-kit/box.glb',{x:CLINIC_POS.x+.8,z:CLINIC_POS.z-1.8,target:1.1,rot:-.2});
 placeWorldModel('../../assets/game/3d/survival/kenney-survival-kit/barrel-open.glb',{x:GARAGE_POS.x+.7,z:GARAGE_POS.z+1.2,target:1.45,rot:.25});
 const crate=box(1.3,1.1,1.3,0x715638,CRATE_POS.x,.58,CRATE_POS.z);addInteract(crate,'crate','폐허 보급 상자 열기');
 const powerbox=solidBox(1.4,1.9,.75,0x51625d,POWER_STATION.x,.95,POWER_STATION.z,.1);addInteract(powerbox,'powerbox','비상 배전반 복구');label('비상 배전반',POWER_STATION.x,2.8,POWER_STATION.z);
 const wasteTank=solidBox(2.2,2.2,2.2,0x68735f,WASTE_POS.x,1.1,WASTE_POS.z,.1);addInteract(wasteTank,'pollutedWater','이상한 냄새의 물 조사');label('파손된 저장탱크',57,3.2,-42);
 const pole=box(.35,5,.35,0x525d61,-4,2.5,12);addInteract(pole,'radio','비상 무전기 확인');label('비상 무전',-4,5.8,12);
 scene.userData.survivorNodes={};scene.userData.campResidents={};
 for(const [id,rdef] of Object.entries(RESIDENTS)){
   const field=new THREE.Group();field.position.copy(rdef.field);field.position.y=terrainHeight(field.position.x,field.position.z);const body=new THREE.Mesh(new THREE.CapsuleGeometry(.55,1.35,4,8),new THREE.MeshStandardMaterial({color:rdef.color}));body.position.y=1.2;field.add(body);upgradePerson(field,body,id==='junseo'?'character-female-b.glb':id==='mira'?'character-female-c.glb':'character-male-b.glb');const fl=makeLabel(id==='taeho'?'구조 요청':rdef.name+' 구조 요청');fl.position.y=3.4;fl.scale.multiplyScalar(.66);field.add(fl);field.visible=false;groups.dynamic.add(field);addInteract(field,'survivor',rdef.name+' 구조',{resident:id});scene.userData.survivorNodes[id]=field;
   const camp=new THREE.Group();camp.position.copy(rdef.camp);const cb=new THREE.Mesh(new THREE.CapsuleGeometry(.55,1.35,4,8),new THREE.MeshStandardMaterial({color:rdef.color}));cb.position.y=1.2;camp.add(cb);upgradePerson(camp,cb,id==='junseo'?'character-female-b.glb':id==='mira'?'character-female-c.glb':'character-male-b.glb');const cn=makeLabel(rdef.name);cn.position.y=3.4;cn.scale.multiplyScalar(.6);cn.userData.residentName=rdef.name;camp.add(cn);camp.userData.statusLabel=cn;camp.visible=false;groups.dynamic.add(camp);scene.userData.campResidents[id]=camp;
 }
 scene.userData.survivor=scene.userData.survivorNodes.taeho;scene.userData.campSurvivor=scene.userData.campResidents.taeho;
 const rz=new THREE.Object3D();rz.position.set(RIVER_X-6.3,0,5);groups.dynamic.add(rz);addInteract(rz,'river','강물 뜨기');
 player.root.position.copy(CAMP);player.root.add(player.visual);
 const shadow=new THREE.Mesh(new THREE.CircleGeometry(.62,20),new THREE.MeshBasicMaterial({color:0x132018,transparent:true,opacity:.28,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.025;player.root.add(shadow);player.userShadow=shadow;
 scene.add(player.root);createAvatar();
 bindInput();resize();addEventListener('resize',resize);
}
function box(w,h,d,c,x=0,y=h/2,z=0){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color:c,roughness:.9}));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;groups.props.add(m);return m}
function createSkyDome(){
 const geo=new THREE.SphereGeometry(165,28,16),mat=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,uniforms:{top:{value:new THREE.Color(0x4f8fb6)},horizon:{value:new THREE.Color(0xbfdde3)},ground:{value:new THREE.Color(0x8ea898)}},vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec3 vP;uniform vec3 top;uniform vec3 horizon;uniform vec3 ground;void main(){float h=normalize(vP).y;vec3 c=h>0.0?mix(horizon,top,smoothstep(0.0,.75,h)):mix(horizon,ground,smoothstep(0.0,-.5,h));gl_FragColor=vec4(c,1.0);}'});const sky=new THREE.Mesh(geo,mat);sky.renderOrder=-10;scene.add(sky);scene.userData.sky=sky
}
function footprintOverlaps(x,z,w,d,pad=.35,ignoreTag=''){
 return artFootprints.some(f=>f.tag!==ignoreTag&&Math.abs(x-f.x)<(w+f.w)/2+pad&&Math.abs(z-f.z)<(d+f.d)/2+pad)
}
function reserveFootprint(x,z,w,d,tag='decor'){if(footprintOverlaps(x,z,w,d,.18,''))return false;artFootprints.push({x,z,w,d,tag});return true}
function placeWorldModelSafe(url,{x=0,z=0,target=3,rot=0,y=0,w=2,d=2,tag='decor',parent=groups.props,tiltX=0,tiltZ=0,allowOverlap=false}={}){
 if(!allowOverlap&&!reserveFootprint(x,z,w,d,tag))return false;placeWorldModel(url,{x,z,target,rot,y,parent,tiltX,tiltZ});return true
}
function placeWorldModel(url,{x=0,z=0,target=3,rot=0,y=0,parent=groups.props,tiltX=0,tiltZ=0}={}){
 model(url).then(o=>{if(!o)return;normalize(o,target);o.position.x=x;o.position.z=z;o.position.y=terrainHeight(x,z)+y;o.rotation.y=rot;o.rotation.x=tiltX;o.rotation.z=tiltZ;parent.add(o)});
}
function normalizeShared(o,target){
 const b=new THREE.Box3().setFromObject(o),sz=b.getSize(new THREE.Vector3()),mx=Math.max(sz.x,sz.y,sz.z)||1;
 o.scale.multiplyScalar(target/mx);
 const b2=new THREE.Box3().setFromObject(o),c=b2.getCenter(new THREE.Vector3());
 o.position.x-=c.x;o.position.z-=c.z;o.position.y-=b2.min.y;
 o.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true}});
 return o;
}
function placeSharedWorldModel(id,{x=0,z=0,target=3,rot=0,y=0,parent=groups.props,tiltX=0,tiltZ=0,preset=null,shadow=true}={}){
 const profile=shared3DProfile(id);
 if(!shared3DCanUse(id)){console.warn('[Kidscade 3D QA] skipped unverified asset',id,profile.reason||'');return}
 const url=SHARED(id);if(!url)return;const usePreset=preset||shared3DRepairPreset(id);
 model(url).then(o=>{if(!o)return;normalizeShared(o,target);if(usePreset)recolorShared(o,usePreset);o.traverse(n=>{if(n.isMesh){n.castShadow=!!shadow;n.receiveShadow=true}});o.position.x+=x;o.position.z+=z;o.position.y+=terrainHeight(x,z)+y;o.rotation.y=rot;o.rotation.x=tiltX;o.rotation.z=tiltZ;parent.add(o)});
}
function scatterSharedCluster(cx,cz,items,radius=5,seedBase=1){
 for(let i=0;i<items.length;i++){
   const id=items[i],a=(i*2.399963+seedBase*.73)%(Math.PI*2),rr=radius*(.34+.58*((Math.sin((i+1)*(seedBase+1)*12.9898)*43758.5453)%1+1)%1);
   const x=cx+Math.cos(a)*rr,z=cz+Math.sin(a)*rr;
   if(Math.abs(x-RIVER_X)<8||Math.abs(z+27)<2.7&&x>-34&&x<58)continue;
   const small=/grass|plant|mushroom/i.test(id),rock=/rock/i.test(id);
   placeSharedWorldModel(id,{x,z,target:small?1.15:rock?1.45:2.0,rot:a*.63,shadow:!small});
 }
}
function upgradePerson(group,fallback,file){
 model(ART.people+file).then(o=>{if(!o)return;fallback.visible=false;normalize(o,2.75);o.rotation.y=Math.PI;group.add(o)})
}
function cityRoad(x,z,rot=0,type='road-straight.glb'){placeWorldModel(ART.roads+type,{x,z,target:7.9,rot,y:.035})}
function citySidewalk(x,z,rot=0){placeWorldModel(ART.roads+'road-side.glb',{x,z,target:7.9,rot,y:.045})}
function cityLot(x,z,w,d,labelText=''){
 box(w,.035,d,0x6d716c,x,.025,z);if(labelText)label(labelText,x,1.0,z)
}
function cityBuilding(file,x,z,target,w,d,rot=0,tag='city-building'){
 const ok=placeWorldModelSafe(ART.city+file,{x,z,target,rot,w,d,tag});if(ok)addCollider(x,z,w*.82,d*.82,.12);return ok
}
function decorateWorld(){
 // 학교 야영지: 운동장과 경계가 보여야 출발 지점의 성격이 바로 읽힌다.
 box(25,.025,16,0x927d5b,-5,.018,5);box(17,.012,.09,0xd9d0b6,-5,.038,5);box(.09,.012,10,0xd9d0b6,-5,.038,5);
 for(const [x,z,r] of [[-17,5,Math.PI*.5],[7,5,Math.PI*.5],[-11,-3,0],[-3,-3,0],[5,-3,0]]){
  placeWorldModel(ART.suburban+'fence-1x4.glb',{x,z,target:4.4,rot:r})
 }
 placeWorldModel(ART.nature+'fence-gate.glb',{x:1,z:-3,target:3.3});
 [-12,-7,-2,3].forEach((x,i)=>placeWorldModel(ART.suburban+(i%2?'path-stones-messy.glb':'path-stones-long.glb'),{x,z:12,target:4.1,rot:Math.PI*.5}));
 placeWorldModel(ART.city+'bench.glb',{x:3,z:13,target:2.2,rot:Math.PI});
 placeWorldModel(ART.city+'mailbox.glb',{x:7,z:12,target:1.6,rot:-.2});
 placeWorldModel(ART.city+'planter-and-bushes.glb',{x:-12,z:13,target:2.8});
 placeWorldModel('../../assets/game/3d/survival/kenney-survival-kit/tent-canvas.glb',{x:-9,z:8,target:3.8,rot:.3});
 placeWorldModel('../../assets/game/3d/survival/kenney-survival-kit/box-large.glb',{x:-6,z:8,target:1.5,rot:-.3});
 // 새 공용 자산: 학교 야영지의 생활 흔적과 탈출 실패 흔적을 강화한다.
 placeSharedWorldModel('prop.well',{x:-14,z:15,target:2.5,rot:.35});
 placeSharedWorldModel('prop.woodLog',{x:-11,z:6,target:2.2,rot:1.1});
 placeSharedWorldModel('prop.woodLog',{x:-8,z:5.4,target:1.9,rot:-.6});
 placeSharedWorldModel('vehicle.schoolBus',{x:8.6,z:21,target:6.1,rot:Math.PI*.52});

 // 도시 블루프린트: 도로 → 보도 → 필지 → 건물 → 차량/잔해 순으로 배치한다.
 reserveFootprint(MARKET_POS.x,MARKET_POS.z,12,10,'interactive-market');
 reserveFootprint(CLINIC_POS.x,CLINIC_POS.z,11,10,'interactive-clinic');
 reserveFootprint(GARAGE_POS.x,GARAGE_POS.z,12,9,'interactive-garage');
 reserveFootprint(POWER_STATION.x,POWER_STATION.z,3.5,3,'interactive-power');
 reserveFootprint(WASTE_POS.x,WASTE_POS.z,3.2,3.2,'interactive-waste');

 // 학교에서 도시로 이어지는 간선도로.
 for(let z=-52;z<=52;z+=8)cityRoad(16,z,0);
 for(let x=-32;x<=68;x+=8)cityRoad(x,-27,Math.PI*.5);
 placeWorldModel(ART.roads+'road-crossroad-line.glb',{x:16,z:-27,target:8.3,y:.045});
 placeWorldModel(ART.roads+'road-bridge.glb',{x:RIVER_X,z:BRIDGE_Z,target:15.2,rot:Math.PI*.5,y:.08});

 // 폐허 도시 안쪽의 작은 격자도로. 건물은 이 도로를 기준으로 필지 안에만 놓인다.
 for(let z=-55;z<=-19;z+=8)cityRoad(52,z,0);
 for(let x=36;x<=68;x+=8)cityRoad(x,-44,Math.PI*.5);
 placeWorldModel(ART.roads+'road-crossroad-path.glb',{x:52,z:-27,target:8.2,y:.05});
 placeWorldModel(ART.roads+'road-crossroad-path.glb',{x:52,z:-44,target:8.2,y:.05});
 for(let x=36;x<=68;x+=8){citySidewalk(x,-31.3,Math.PI*.5);citySidewalk(x,-39.7,Math.PI*.5)}
 for(let z=-51;z<=-19;z+=8){citySidewalk(47.7,z,0);citySidewalk(56.3,z,0)}

 // 네 개의 명확한 필지. 세 곳은 직접 들어가 조사하는 장소다.
 cityLot(MARKET_POS.x,MARKET_POS.z,13,11);
 cityLot(CLINIC_POS.x,CLINIC_POS.z,12,11);
 cityLot(GARAGE_POS.x,GARAGE_POS.z,13,10);
 cityLot(61,-51,12,10);

 // 배경 건물은 예약된 필지와 겹치지 않을 때만 생성한다.
 cityBuilding('building-red.glb',40,-19,9.5,8,7,.03,'north-row');
 cityBuilding('brown-building.glb',60,-19,10.5,8,7,-.04,'north-row');
 cityBuilding('building-green.glb',68,-36,10,7,9,.02,'east-row');
 cityBuilding('building-red-corner.glb',67,-55,9.2,7,8,.08,'south-row');
 cityBuilding('big-building.glb',38,-58,10.5,9,8,-.04,'south-row');
 placeSharedWorldModel('prop.waterTower',{x:61,z:-51,target:8.4,rot:.15});
 placeSharedWorldModel('building.house',{x:34,z:-48,target:7.2,rot:-.14});

 // 도로시설과 차량은 차도 또는 보도 가장자리에 정렬한다.
 const cityProps=[
  [ART.roads+'traffic-light.glb',50,-25,3.6,0,1.2,1.2,'street-prop'],
  [ART.roads+'traffic-light.glb',54,-46,3.6,Math.PI,1.2,1.2,'street-prop'],
  [ART.roads+'road-sign-warning.glb',36,-25,2.3,.1,1,1,'street-prop'],
  [ART.roads+'construction-barrier.glb',35,-29,2.5,.15,2.2,.7,'street-prop'],
  [ART.city+'fire-hydrant.glb',57,-31,1.25,0,.8,.8,'street-prop'],
  [ART.city+'bus-stop.glb',35,-24,3.0,Math.PI,3,1.5,'street-prop'],
  [ART.city+'bus-stop-sign.glb',32.8,-24,2.3,Math.PI,.8,.8,'street-prop'],
  [ART.city+'dumpster.glb',36,-38,2.0,.35,2.1,1.2,'street-prop'],
  [ART.city+'trash-can.glb',57,-40,1.25,.2,.8,.8,'street-prop'],
  [ART.cars+'ambulance.glb',63,-29,4.5,Math.PI*.5,4.5,2.1,'vehicle'],
  [ART.cars+'sedan.glb',48,-46.5,4.25,Math.PI*.5,4.2,2.0,'vehicle'],
  [ART.cars+'van.glb',55,-54,4.5,0,2.2,4.6,'vehicle'],
  [ART.cars+'debris-tire.glb',37,-42,1.1,.4,1.2,1.2,'debris']
 ];
 cityProps.forEach(([u,x,z,t,r,w,d,tag])=>placeWorldModelSafe(u,{x,z,target:t,rot:r,w,d,tag}));
 placeWorldModelSafe(ART.city+'debris-papers.glb',{x:56.8,z:-39,target:1.8,rot:1.1,w:1.6,d:1.2,tag:'debris'});
 placeSharedWorldModel('prop.crate',{x:CRATE_POS.x,z:CRATE_POS.z,target:1.4,rot:.18});

 // 간선도로의 생활 흔적. 도시 밖에서는 간격을 넓혀 시야를 확보한다.
 [[11,8],[11,-18],[11,-43]].forEach(([x,z])=>placeWorldModelSafe(ART.roads+'electricity-pole.glb',{x,z,target:5.8,w:1.2,d:1.2,tag:'utility'}));
 placeWorldModelSafe(ART.city+'stop-sign.glb',{x:24,z:-25,target:2.4,w:1,d:1,tag:'street-prop'});
 placeWorldModelSafe(ART.cars+'sedan.glb',{x:19,z:-42,target:4.4,rot:.12,w:4.3,d:2.1,tag:'vehicle'});
 placeWorldModelSafe(ART.cars+'van.glb',{x:10,z:-28,target:4.6,rot:Math.PI*.52,w:2.2,d:4.6,tag:'vehicle'});

 // 강둑: 직선 수로처럼 보이지 않도록 양안의 식생과 돌을 불규칙하게 섞는다.
 const bankZ=[-55,-43,-31,-18,-7,6,19,33,47,59];
 bankZ.forEach((z,i)=>{
  const wob=Math.sin(z*.37)*1.25;
  placeWorldModel(ART.nature+(i%3===0?'rock-small-c.glb':i%3===1?'plant-bush-large.glb':'grass-leafs-large.glb'),{x:RIVER_X-8.7-wob,z,target:i%3===0?1.4:2,rot:i*.73});
  placeWorldModel(ART.nature+(i%2?'rock-small-flat-b.glb':'plant-bush.glb'),{x:RIVER_X+8.8+wob,z:z+3,target:i%2?1.35:1.8,rot:i*.51})
 });
 placeWorldModel(ART.nature+'canoe.glb',{x:RIVER_X-6.2,z:19,target:3.5,rot:.2});

 // 숲은 가장자리의 활엽수에서 깊은 숲의 소나무, 산지 절벽으로 단계적으로 바뀐다.
 const forestArt=[
  [-21,46,'tree-default.glb',6],[-27,49,'tree-oak.glb',6.5],[-34,51,'tree-pine-round-a.glb',6.8],[-42,48,'tree-pine-tall-a.glb',7.2],
  [-53,43,'tree-pine-tall-b.glb',7.4],[-57,30,'tree-pine-round-c.glb',6.6],[-49,18,'tree-oak-dark.glb',6.2],
  [-51,28,'cliff-large-rock.glb',6],[-57,35,'cliff-rock.glb',5],[-45,43,'rock-large-c.glb',3.6],
  [-33,34,'plant-bush-large.glb',2.5],[-37,20,'plant-bush-detailed.glb',2.4],[-25,38,'grass-large.glb',2.2],[-20,24,'grass-leafs-large.glb',2.2],
  [-61,49,'cliff-top-rock.glb',5.4],[-60,18,'rock-tall-c.glb',3.8]
 ];
 forestArt.forEach(([x,z,file,t])=>placeWorldModel(ART.nature+file,{x,z,target:t,rot:(x+z)*.13}));
 [[33,15],[34,4],[34,-15],[33,-36]].forEach(([x,z],i)=>placeWorldModel(ART.nature+(i%2?'plant-bush.glb':'grass-large.glb'),{x,z,target:1.7+(i%2)*.4,rot:i*.8}));

 // 공용 Pixabay/CC0 묶음으로 숲의 수종·바위·하층 식생을 다양화한다.
 const sharedForest=[
  [-24,44,'nature.commonTreeA',6.2,.1],[-31,45,'nature.commonTreeB',6.4,.7],[-39,39,'nature.pineTreeA',6.8,-.5],
  [-47,31,'nature.pineTreeB',7.1,.4],[-55,23,'nature.pineTreeA',6.7,.9],[-29,28,'nature.commonTreeA',5.8,-.8],
  [-36,31,'nature.mossyRockA',2.1,.2],[-43,25,'nature.mossyRockB',2.3,1.1],[-51,38,'nature.rock',2.0,.5],
  [-26,35,'nature.grass',1.7,.3],[-40,17,'nature.plant',1.8,.7],[-49,45,'nature.mushroomA',1.15,.1],[-33,19,'nature.mushroomB',1.2,.8]
 ];
 sharedForest.forEach(([x,z,id,t,r])=>placeSharedWorldModel(id,{x,z,target:t,rot:r,shadow:!/grass|plant|mushroom/i.test(id)}));

 // 2차 아트 패스: 주요 구역 가장자리에 저밀도 군집을 두어 '낱개 소품' 느낌을 줄인다.
 scatterSharedCluster(-16,20,['nature.grass','nature.plant','nature.mossyRockA','nature.grass'],5.2,2);
 scatterSharedCluster(-45,36,['nature.mushroomA','nature.grass','nature.plant','nature.mossyRockB','nature.mushroomB','nature.grass'],7.3,5);
 scatterSharedCluster(20,33,['nature.grass','nature.rock','nature.plant','nature.grass'],5.6,7);
 scatterSharedCluster(31,-44,['nature.rock','nature.grass','nature.mossyRockA','nature.plant'],4.8,11);
 // Large animated animals are quarantined until skinned-model cloning/rest-pose QA is complete.
}
function drawLabel(sprite,text){
 const c=sprite?.userData?.labelCanvas,x=sprite?.userData?.labelCtx;if(!c||!x)return;x.clearRect(0,0,c.width,c.height);x.fillStyle='rgba(5,12,15,.76)';x.roundRect(4,4,312,64,18);x.fill();x.strokeStyle='rgba(255,255,255,.22)';x.stroke();x.fillStyle='#eef8ef';x.font='800 24px system-ui';x.textAlign='center';x.textBaseline='middle';x.fillText(text,160,36);sprite.material.map.needsUpdate=true;sprite.userData.labelText=text
}
function makeLabel(text){const c=document.createElement('canvas');c.width=320;c.height=72;const x=c.getContext('2d'),t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false}));s.scale.set(6.6,1.48,1);s.userData.labelCanvas=c;s.userData.labelCtx=x;drawLabel(s,text);return s}
function label(text,x,y,z){const s=makeLabel(text);s.position.set(x,y,z);s.userData.worldLabel=true;s.userData.labelRange=text==='폐허 도시'?36:22;s.scale.multiplyScalar(.72);groups.dynamic.add(s);return s}
function addInteract(o,type,labelText,data={}){o.userData.interactable={type,label:labelText,...data};interactables.push(o)}
const GENERIC_PALETTES={
 people:{skin:0xd9a67d,hair:0x382d2a,body:0x3f6e91,cloth:0x557a9a,pants:0x34424d,shoe:0x25292b,metal:0x747f84},
 city:{body:0xa66f58,wall:0xb28b6c,roof:0x4a5154,glass:0x668c9c,wood:0x74513a,metal:0x747d80,trim:0xc8b99b},
 roads:{body:0x4e5558,metal:0x7f898c,light:0xe9c96e,trim:0xd7d0b8},
 cars:{body:0x9c493d,glass:0x587d8e,tire:0x25292b,metal:0x81898b,light:0xf2d47a,trim:0x30373a},
 nature:{leaf:0x52784d,grass:0x668851,wood:0x6e4c35,rock:0x777d75,body:0x668851},
 survival:{cloth:0x7c825e,wood:0x70503a,metal:0x747d80,body:0x7f765f,trim:0xb8aa87},
 buildings:{wall:0x9a765f,roof:0x3f4649,glass:0x607f8e,wood:0x71503a,metal:0x747d80,trim:0xc4b697,body:0x95735d}
};
function genericPalette(url=''){if(url.includes('/characters/')||url.includes('/people/'))return GENERIC_PALETTES.people;if(url.includes('/nature/'))return GENERIC_PALETTES.nature;if(url.includes('city-kit-roads'))return GENERIC_PALETTES.roads;if(url.includes('/vehicles/'))return GENERIC_PALETTES.cars;if(url.includes('/buildings/'))return GENERIC_PALETTES.buildings;if(url.includes('/survival/'))return GENERIC_PALETTES.survival;return GENERIC_PALETTES.city}
function genericRole(label='',url=''){
 const n=String(label).toLowerCase();
 if(/skin|face|head|hand|arm/.test(n))return'skin';if(/hair|brow/.test(n))return'hair';if(/shirt|jacket|coat|torso|body/.test(n))return'body';if(/pants|trouser|leg/.test(n))return'pants';if(/shoe|boot|foot/.test(n))return'shoe';
 if(/leaf|foliage|crown|bush/.test(n))return'leaf';if(/grass|plant/.test(n))return'grass';if(/rock|stone|cliff/.test(n))return'rock';
 if(/glass|window|windshield/.test(n))return'glass';if(/tire|wheel|rubber/.test(n))return'tire';if(/light|lamp/.test(n))return'light';if(/roof/.test(n))return'roof';if(/wall|brick|facade/.test(n))return'wall';if(/wood|door|frame|bark|log/.test(n))return'wood';if(/metal|pipe|rim|axle/.test(n))return'metal';if(/trim|border/.test(n))return'trim';if(url.includes('/nature/'))return'body';return'body'
}
function repairAchromaticModel(o,url=''){
 const p=genericPalette(url);let slot=0;
 const fallbackRoles=url.includes('/people/')?['skin','body','pants','hair','shoe']:url.includes('/nature/')?['leaf','wood','rock','grass']:url.includes('city-kit-roads')?['body','trim','metal']:url.includes('/vehicles/')?['body','glass','tire','metal','light']:url.includes('/survival/')?['body','wood','metal','cloth','trim']:['wall','roof','trim','glass','wood','metal'];
 o.traverse(n=>{if(!n.isMesh)return;const src=Array.isArray(n.material)?n.material:[n.material];const next=src.map(m=>{const q=m?.clone?.()||new THREE.MeshStandardMaterial(),hsl={h:0,s:0,l:0};q.color?.getHSL(hsl);const blank=!q.map&&q.color&&hsl.s<.075;if(blank){const semantic=genericRole((n.name||'')+' '+(m?.name||''),url),fallback=fallbackRoles[slot++%fallbackRoles.length],role=p[semantic]!=null?semantic:fallback,hex=p[role]??0x7d827d;q.color.setHex(hex);q.roughness=role==='glass'?.3:role==='metal'?.55:.82;q.metalness=role==='metal'?.22:0;if(role==='glass'){q.transparent=true;q.opacity=.72;q.depthWrite=false}}return q});n.material=Array.isArray(n.material)?next:next[0]});
 return o
}
function clonePrepared(base,url){const o=base.clone(true);repairAchromaticModel(o,url);return o}
async function model(url){if(models.has(url))return clonePrepared(models.get(url),url);return new Promise(resolve=>loader.load(url,g=>{models.set(url,g.scene);resolve(clonePrepared(g.scene,url))},undefined,()=>resolve(null)))}
function normalize(o,target){const b=new THREE.Box3().setFromObject(o),sz=b.getSize(tmp),mx=Math.max(sz.x,sz.y,sz.z)||1;o.scale.multiplyScalar(target/mx);const b2=new THREE.Box3().setFromObject(o);o.position.y-=b2.min.y;o.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true}})}
function spawnResource(type,x,z){
 const r=new THREE.Group();r.position.set(x,terrainHeight(x,z),z);groups.props.add(r);
 let fallback;
 if(type==='tree'){fallback=new THREE.Mesh(new THREE.CylinderGeometry(.45,.65,4.6,7),new THREE.MeshStandardMaterial({color:0x6a5138}));fallback.position.y=2.3;r.add(fallback);const crown=new THREE.Mesh(new THREE.ConeGeometry(2.3,4.5,8),new THREE.MeshStandardMaterial({color:0x416a46}));crown.position.y=5.1;r.add(crown)}
 else if(type==='rock'){fallback=new THREE.Mesh(new THREE.DodecahedronGeometry(1.05),new THREE.MeshStandardMaterial({color:0x818681}));fallback.position.y=.8;r.add(fallback)}
 else{fallback=new THREE.Mesh(new THREE.DodecahedronGeometry(.9,1),new THREE.MeshStandardMaterial({color:0x5d8449}));fallback.scale.set(1.5,.65,1.5);fallback.position.y=.48;r.add(fallback)}
 r.userData={resource:type,available:true,respawn:0};resources.push(r);
 const labels={tree:'나무 채집',rock:'돌 채집',forage:'야생 감자 채집'};addInteract(r,type,labels[type]||'채집');
 const seed=Math.abs(Math.round(x*17+z*31));
 const assetId=type==='tree'?(seed%3===0?'nature.pineTreeA':seed%3===1?'nature.commonTreeA':'nature.commonTreeB'):type==='rock'?(seed%2?'nature.mossyRockA':'nature.rock'):'nature.plant';
 if(!shared3DIsApproved(assetId))return;
 model(SHARED(assetId)).then(o=>{if(!o)return;r.clear();normalizeShared(o,type==='tree'?5.2:type==='rock'?1.65:1.7);o.rotation.y=(seed%628)/100;r.add(o)})
}
function playerModelFile(){
 const src=currentAvatarSource()||'kidscade-survivor';let hash=0;for(let i=0;i<src.length;i++)hash=(hash*31+src.charCodeAt(i))>>>0;
 return ['character-female-a.glb','character-male-a.glb','character-female-d.glb','character-male-d.glb'][hash%4]
}
function createAvatar(){
 player.visual.clear();player.sprite=null;player.model=null;
 const fallback=makeSurvivorFallback();player.visual.add(fallback);
 model(ART.people+playerModelFile()).then(o=>{if(!o)return;fallback.visible=false;normalize(o,2.95);o.rotation.y=Math.PI;player.visual.add(o);player.model=o})
}
function makeSurvivorFallback(){
 const g=new THREE.Group(),skin=new THREE.MeshStandardMaterial({color:0xd5a078,roughness:.85}),jacket=new THREE.MeshStandardMaterial({color:0x3e7188,roughness:.8}),pants=new THREE.MeshStandardMaterial({color:0x33414b,roughness:.85}),dark=new THREE.MeshStandardMaterial({color:0x292d30,roughness:.9});
 const head=new THREE.Mesh(new THREE.SphereGeometry(.33,14,10),skin);head.position.y=2.48;g.add(head);
 const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.42,.72,4,8),jacket);torso.position.y=1.58;g.add(torso);
 for(const sx of [-1,1]){const arm=new THREE.Mesh(new THREE.CapsuleGeometry(.12,.72,3,7),jacket);arm.position.set(.52*sx,1.62,0);arm.rotation.z=.1*sx;g.add(arm);const leg=new THREE.Mesh(new THREE.CapsuleGeometry(.15,.76,3,7),pants);leg.position.set(.21*sx,.62,0);g.add(leg);const shoe=new THREE.Mesh(new THREE.BoxGeometry(.32,.18,.52),dark);shoe.position.set(.21*sx,.1,.1);g.add(shoe)}
 g.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true}});return g
}
function updatePlayerVisual(dt,state=player.locomotion){
 const moving=state!=='idle',sprint=state==='sprint',speed01=clamp(player.speed/(sprint?8.15:5.15),0,1);player.walkPhase+=dt*(moving?(sprint?12.2:8.7):2.2);
 const phase=player.walkPhase,amp=moving?speed01*(sprint?.052:.034):.009,breathe=Math.sin(phase*.42)*.006;
 player.visual.position.y=damp(player.visual.position.y,moving?Math.abs(Math.sin(phase))*amp:breathe,10,dt);
 player.visual.rotation.x=damp(player.visual.rotation.x,sprint?-.105:moving?-.025:0,8,dt);
 player.visual.rotation.z=damp(player.visual.rotation.z,moving?Math.sin(phase)*(.018+.018*speed01):0,9,dt);
 if(player.model){player.model.rotation.x=damp(player.model.rotation.x,0,10,dt);player.model.rotation.z=damp(player.model.rotation.z,0,10,dt)}
}
function tutorialActive(){return !!game&&!game.tutorial?.done&&game.phase==='survival'&&game.day===1}
function renderTutorial(){
 if(!ui.tutorial||!game)return;const active=tutorialActive();ui.tutorial.classList.toggle('hidden',!active);if(!active)return;
 const step=clamp(game.tutorial.step||0,0,TUTORIAL.length-1),t=TUTORIAL[step];ui.tutorialStep.textContent=(step+1)+' / '+TUTORIAL.length;ui.tutorialTitle.textContent=t.title;ui.tutorialText.textContent=t.text;ui.tutorialHint.textContent=t.hint
}
function tutorialNext(reason=''){
 if(!tutorialActive())return;game.tutorial.step=Math.min(TUTORIAL.length,Number(game.tutorial.step||0)+1);
 if(game.tutorial.step>=TUTORIAL.length){game.tutorial.done=true;toast('✅ 조작 튜토리얼 완료 · 이제 오늘의 생존 목표를 이어가세요.','normal',4)}
 save();renderTutorial()
}
function tutorialSignal(type,value=1){
 if(!tutorialActive())return;const s=game.tutorial.step||0;
 if(s===0&&type==='move'){game.tutorial.move=(game.tutorial.move||0)+value;if(game.tutorial.move>=3)tutorialNext('move')}
 else if(s===1&&type==='camera')tutorialNext('camera');
 else if(s===3&&type==='water')tutorialNext('water');
 else if(s===4&&type==='boil')tutorialNext('boil');
 else if(s===5&&type==='drink')tutorialNext('drink')
}
function updateTutorial(){
 if(!tutorialActive())return;const s=game.tutorial.step||0;
 if(s===2&&(game.flags.water||player.root.position.distanceTo(new THREE.Vector3(RIVER_X-6.3,terrainHeight(RIVER_X-6.3,5),5))<10))tutorialNext('river');
 else if(s===3&&game.flags.water)tutorialNext('water');
 else if(s===4&&game.flags.boil)tutorialNext('boil');
 else if(s===5&&game.flags.drink)tutorialNext('drink')
}
function skipTutorial(){if(!game)return;game.tutorial={...(game.tutorial||{}),done:true,step:TUTORIAL.length};save();renderTutorial();toast('튜토리얼을 건너뛰었습니다. TAB에서 지도와 생존 도감을 언제든 확인할 수 있습니다.')}
function bindInput(){const unlockAudio=()=>ensureAudio();window.addEventListener('pointerdown',unlockAudio,{once:true});window.addEventListener('keydown',unlockAudio,{once:true});
 addEventListener('keydown',e=>{if(['INPUT','TEXTAREA'].includes(e.target?.tagName))return;keys.add(e.code);if(e.code==='KeyE')interact();if(e.code==='KeyI')openPanel('inventory');if(e.code==='KeyC')openPanel('craft');if(e.code==='KeyB')openPanel('build');if(e.code==='Tab'){e.preventDefault();togglePanel()}if(e.code==='Digit1')useItem('cleanWater');if(e.code==='Digit2')useItem('food');if(e.code==='Escape'){if(buildMode)cancelBuild();else closePanel()}});
 addEventListener('keyup',e=>keys.delete(e.code));
 ui.canvas.addEventListener('pointerdown',e=>{drag=true;lastPointer=[e.clientX,e.clientY];ui.canvas.setPointerCapture?.(e.pointerId)});
 ui.canvas.addEventListener('pointermove',e=>{if(!drag||!lastPointer)return;const dx=e.clientX-lastPointer[0],dy=e.clientY-lastPointer[1];camYaw-=dx*.005;camPitch=clamp(camPitch+dy*.003,.18,.82);if(Math.abs(dx)+Math.abs(dy)>8)tutorialSignal('camera');lastPointer=[e.clientX,e.clientY]});
 ui.canvas.addEventListener('pointerup',()=>{drag=false;lastPointer=null});ui.canvas.addEventListener('wheel',e=>camDist=clamp(camDist+e.deltaY*.008,4.8,9.5),{passive:true});
 ui.mobileInteract?.addEventListener('click',interact);ui.mobileBuild?.addEventListener('click',()=>openPanel('build'));ui.mobileTablet?.addEventListener('click',togglePanel);
 ui.closePanel.addEventListener('click',closePanel);document.querySelectorAll('#hotbar button').forEach(b=>b.addEventListener('click',()=>b.dataset.use?useItem(b.dataset.use):openPanel(b.dataset.open)));
 document.querySelectorAll('#panel nav button').forEach(b=>b.addEventListener('click',()=>openPanel(b.dataset.tab,true)));document.querySelectorAll('#decision [data-choice]').forEach(b=>b.addEventListener('click',()=>chooseDistribution(b.dataset.choice)));ui.tutorialSkip?.addEventListener('click',skipTutorial);
 bindJoy();
}
function bindJoy(){const base=$('.joy-base');if(!base)return;let pid=null;function move(e){const r=base.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),m=Math.min(42,Math.hypot(dx,dy)),a=Math.atan2(dy,dx);player.touch.set(Math.cos(a)*m/42,Math.sin(a)*m/42);ui.joyKnob.style.transform='translate('+(Math.cos(a)*m)+'px,'+(Math.sin(a)*m)+'px)'}base.addEventListener('pointerdown',e=>{pid=e.pointerId;base.setPointerCapture(pid);move(e)});base.addEventListener('pointermove',e=>{if(e.pointerId===pid)move(e)});function end(e){if(e.pointerId!==pid)return;pid=null;player.touch.set(0,0);ui.joyKnob.style.transform=''}base.addEventListener('pointerup',end);base.addEventListener('pointercancel',end)}
function riverHalfWidth(){return 7*(scene?.userData?.river?.scale?.x||1)}
function updatePlayer(dt){
 const controlsLocked=!running||paused||!ui.panel.classList.contains('hidden')||!ui.decision.classList.contains('hidden')||buildMode;
 let x=0,y=0;if(!controlsLocked){if(keys.has('KeyA')||keys.has('ArrowLeft'))x--;if(keys.has('KeyD')||keys.has('ArrowRight'))x++;if(keys.has('KeyW')||keys.has('ArrowUp'))y--;if(keys.has('KeyS')||keys.has('ArrowDown'))y++;if(Math.abs(player.touch.x)>.05||Math.abs(player.touch.y)>.05){x+=player.touch.x;y+=player.touch.y}}
 const inputLen=Math.hypot(x,y);if(inputLen>1){x/=inputLen;y/=inputLen}
 const orbit=tmp.set(Math.sin(camYaw),0,Math.cos(camYaw)),forward=tmp2.set(-orbit.x,0,-orbit.z),right=new THREE.Vector3(forward.z,0,-forward.x);
 player.wishDir.set(0,0,0);if(inputLen>.01)player.wishDir.addScaledVector(right,x).addScaledVector(forward,-y).normalize();
 const sprinting=inputLen>.01&&keys.has('ShiftLeft'),targetSpeed=inputLen>.01?(sprinting?8.15:5.15):0,accel=inputLen>.01?(sprinting?7.5:9.5):13;
 const targetVX=player.wishDir.x*targetSpeed,targetVZ=player.wishDir.z*targetSpeed;
 player.velocity.x=damp(player.velocity.x,targetVX,accel,dt);player.velocity.z=damp(player.velocity.z,targetVZ,accel,dt);player.speed=Math.hypot(player.velocity.x,player.velocity.z);
 const moved=player.speed>.06&&tryPlayerMove(player.velocity.x*dt,player.velocity.z*dt);
 if(moved){tutorialSignal('move',player.speed*dt);const desiredYaw=Math.atan2(player.velocity.x,player.velocity.z);player.root.rotation.y=dampAngle(player.root.rotation.y,desiredYaw,sprinting?13:10,dt)}
 player.root.position.y=terrainHeight(player.root.position.x,player.root.position.z);
 const nextState=player.speed<.18?'idle':sprinting&&player.speed>5.8?'sprint':'walk';setLocomotion(nextState);player.stateTime+=dt;updatePlayerVisual(dt,nextState);
 if(player.speed>.35&&moved){player.stepClock+=dt*player.speed;const stride=nextState==='sprint'?2.75:2.18;if(player.stepClock>stride){player.stepClock=0;sfx('step')}}else player.stepClock=Math.min(player.stepClock,.8)
}

function segmentAabbT(x0,z0,x1,z1,b,expand=.18){
 const dx=x1-x0,dz=z1-z0;let tmin=0,tmax=1;for(const [o,d,min,max] of [[x0,dx,b.x-b.hw-expand,b.x+b.hw+expand],[z0,dz,b.z-b.hd-expand,b.z+b.hd+expand]]){if(Math.abs(d)<1e-9){if(o<min||o>max)return-1;continue}let t1=(min-o)/d,t2=(max-o)/d;if(t1>t2)[t1,t2]=[t2,t1];tmin=Math.max(tmin,t1);tmax=Math.min(tmax,t2);if(tmin>tmax)return-1}return tmin
}
function cameraBlocked(x,z){return colliders.some(b=>b.enabled!==false&&b.cameraBlocker&&Math.abs(x-b.x)<b.hw+.2&&Math.abs(z-b.z)<b.hd+.2)}
function resolveCamera(t,desired){
 const dist=desired.distanceTo(t);let safe=1;
 for(const b of colliders){if(b.enabled===false||!b.cameraBlocker)continue;const hit=segmentAabbT(t.x,t.z,desired.x,desired.z,b,.28);if(hit>=0&&hit<safe)safe=hit}
 if(safe<1)safe=Math.max(.2,safe-.38/Math.max(dist,.01));
 for(let i=2;i<=18;i++){const a=(i/18)*safe,x=t.x+(desired.x-t.x)*a,z=t.z+(desired.z-t.z)*a,y=t.y+(desired.y-t.y)*a;if(y<terrainHeight(x,z)+.42){safe=Math.max(.2,a-.06);break}}
 const out=new THREE.Vector3().lerpVectors(t,desired,safe);out.y=Math.max(out.y,terrainHeight(out.x,out.z)+.48);return out
}
function interactionLineClear(origin,target,targetObj=null){
 for(const b of colliders){if(b.enabled===false)continue;const cx=b.x,cz=b.z;if(targetObj&&Math.hypot(cx-target.x,cz-target.z)<1.45)continue;const hit=segmentAabbT(origin.x,origin.z,target.x,target.z,b,.05);if(hit>=.02&&hit<.92)return false}return true
}
function updateInteriorVisibility(){
 const px=player.root.position.x,pz=player.root.position.z;for(const zone of ruinZones){const inside=Math.abs(px-zone.x)<zone.hw&&Math.abs(pz-zone.z)<zone.hd;for(const wall of zone.walls){wall.material.opacity=damp(wall.material.opacity,inside?.18:1,8,.016);wall.material.depthWrite=!inside}}
}
function updateCamera(dt){
 const orbit=new THREE.Vector3(Math.sin(camYaw),0,Math.cos(camYaw)),screenForward=orbit.clone().multiplyScalar(-1),screenRight=new THREE.Vector3(screenForward.z,0,-screenForward.x);
 const pivot=new THREE.Vector3(player.root.position.x,player.root.position.y+1.25,player.root.position.z);
 const lookAt=pivot.clone().addScaledVector(screenForward,2.15).add(new THREE.Vector3(0,.28,0));
 const cp=Math.cos(camPitch),raw=pivot.clone().addScaledVector(orbit,cp*camDist).addScaledVector(screenRight,.58);raw.y+=2.25+Math.sin(camPitch)*camDist;
 const desired=resolveCamera(pivot,raw),minDist=2.75,actual=desired.distanceTo(pivot);
 if(actual<minDist){desired.copy(pivot).addScaledVector(orbit,minDist*.86).addScaledVector(screenRight,.42);desired.y=pivot.y+2.15}
 camera.position.lerp(desired,1-Math.exp(-12*dt));if(cameraKick>.003){camera.position.x+=(Math.random()-.5)*cameraKick;camera.position.y+=(Math.random()-.5)*cameraKick*.65}const fovTarget=player.speed>7?59:55;camera.fov=damp(camera.fov,fovTarget,5,dt);camera.updateProjectionMatrix();camera.lookAt(lookAt);
 if(scene?.userData?.sky)scene.userData.sky.position.copy(camera.position);updateInteriorVisibility()
}
function updateInteract(){
 if(!running||buildMode)return;let best=null,bestScore=Infinity;const origin=new THREE.Vector3(player.root.position.x,player.root.position.y+1.35,player.root.position.z),screenForward=new THREE.Vector3(-Math.sin(camYaw),0,-Math.cos(camYaw));
 for(const o of interactables){if(!o.visible)continue;const p=o.getWorldPosition(new THREE.Vector3()),d=p.distanceTo(player.root.position);if(d>3.9)continue;const flat=new THREE.Vector3(p.x-origin.x,0,p.z-origin.z),len=flat.length();if(len<.001)continue;flat.multiplyScalar(1/len);const facing=flat.dot(screenForward);if(facing<-.18)continue;if(!interactionLineClear(origin,p,o))continue;const score=d-facing*.85;if(score<bestScore){best=o;bestScore=score}}
 if(best!==currentInteract&&best){ui.interact.classList.remove('pop');void ui.interact.offsetWidth;ui.interact.classList.add('pop')}currentInteract=best;ui.interact.classList.toggle('hidden',!best);if(best)ui.interact.querySelector('span').textContent=best.userData.interactable?.label||'상호작용'
}
function interact(){if(!running||paused)return;if(buildMode){confirmBuild();return}if(!currentInteract)return;const d=currentInteract.userData.interactable||{},t=d.type;
 if(t==='river'){if(game.inv.dirtyWater>=4)return toast('들고 있는 강물이 많습니다. 먼저 처리해 보세요.','warn');game.inv.dirtyWater++;sfx('water');discover('waterRisk');flag('water');tutorialSignal('water');toast('🫗 강물을 떴습니다. 비상 버너나 모닥불에서 끓여 보세요.');save();return}
 if(t==='tree'||t==='rock'||t==='forage')return gather(currentInteract,t);if(t==='burner')return useBurner();if(t==='crate')return openCrate();if(t==='ruinDoor')return toggleRuinDoor(d.site);if(t==='ruinSearch')return searchRuinSpot(d.spot);if(t==='ruinCache')return lootRuin(d.cache);if(t==='powerbox')return repairPower();if(t==='pollutedWater')return samplePollutedWater();if(t==='survivor')return rescue(d.resident||'taeho');if(t==='radio')return useRadio();
 if(t==='rest'){if(game.phase==='settlement'||missionDone())advanceDay();else toast('오늘의 생존 목표를 먼저 해결해 보세요.','warn');return}if(t==='placed')usePlaced(d.building,currentInteract)
}
function gather(r,t){
 if(!r.userData.available)return;r.userData.available=false;r.userData.respawn=t==='forage'?65:45;
 const pos=r.getWorldPosition(new THREE.Vector3()),id=t==='tree'?'wood':t==='rock'?'stone':'potato';
 let n=t==='tree'&&game.inv.axe?2:1;const gatherBonus=jobPower('gatherer');if(gatherBonus)n+=Math.max(1,Math.floor(gatherBonus));
 sfx(t==='tree'?'chop':t==='rock'?'mine':'pickup');spawnImpact(pos,t, t==='forage'?6:11);cameraKick=Math.max(cameraKick,t==='rock'?.095:.06);
 const baseScale=r.scale.clone();r.scale.multiplyScalar(.88);setTimeout(()=>{r.scale.copy(baseScale);r.visible=false},120);
 if(t==='forage')discover('plantGrowth');setTimeout(()=>addItem(id,n),90)
}
function useBurner(){
 if(game.flags.burnerSpent)return toast('비상 버너의 남은 연료가 없습니다. 이제 직접 불을 피워야 합니다.','warn');
 if(game.inv.dirtyWater<1)return toast('먼저 강에서 물을 떠 오세요.','warn');
 game.inv.dirtyWater--;game.inv.cleanWater++;game.flags.burnerSpent=true;sfx('fire');discover('boiling');flag('boil');tutorialSignal('boil');toast('🔥 남은 연료로 강물을 충분히 끓였습니다. 깨끗한 물 +1','normal',3);save();updateUI()
}
function syncPowerVisual(){if(scene?.userData?.campLamp)scene.userData.campLamp.intensity=game?.flags?.power&&game.powerLoads?.light&&powerUse()<=game.powerKw+.001?3.2:0}
function repairPower(){
 if(game.day<4)return toast('배전반은 고장 나 있습니다. 먼저 필요한 부품을 찾아야 합니다.','warn');
 if(game.flags.power)return toast('⚡ 비상 전력망이 안정적으로 작동 중입니다. '+game.powerKw.toFixed(1)+' kW');
 if(game.inv.battery<1||game.inv.scrap<2)return toast('배터리 1개와 고철 2개가 필요합니다. 폐허를 더 조사하세요.','warn');
 game.inv.battery--;game.inv.scrap-=2;game.powerKw=2.4;sfx('power');discover('electricity');flag('power');syncPowerVisual();toast('⚡ 배전반 복구 완료 · 야영지 비상등과 무전기에 전력이 공급됩니다.','normal',4);save();updateUI()
}
function lootRuin(id){
 const key='loot_'+id;if(game.flags[key])return toast('이미 필요한 물자를 챙겼습니다.');
 const loot=id==='market'?{food:2,potato:2}:id==='clinic'?{cloth:2,food:1}:id==='garage'?{scrap:2,wood:1,battery:1}:{scrap:1};
 for(const [item,n] of Object.entries(loot))game.inv[item]=(game.inv[item]||0)+n;game.flags[key]=true;toast('🎒 폐허 수색 · '+Object.entries(loot).map(([k,n])=>(ITEMS[k]?.[0]||k)+' +'+n).join(' · '),'normal',3.5);save();updateUI()
}
function samplePollutedWater(){
 if(game.flags.chemSample)return toast('코를 찌르는 냄새가 납니다. 이 물은 식수로 쓰지 않는 편이 안전해 보입니다.','warn');
 game.flags.chemSample=true;game.inv.chemWater++;toast('☣️ 공장 오염수 샘플을 얻었습니다. 모닥불에서 가열하면 어떻게 될까요?','warn',3.8);save();updateUI()
}
function openCrate(){if(game.flags.crate)return toast('이미 확인한 상자입니다.');game.flags.crate=true;game.inv.scrap+=3;game.inv.battery++;game.inv.cloth++;game.inv.food+=2;flag('battery');toast('🔋 배터리 · 고철 · 천 · 식량을 확보했습니다. 배전반을 찾아 실제로 연결해 보세요.','normal',3);save();updateUI()}
function rescue(id='taeho'){
 if(game.day<5)return toast('아직 인기척이 없습니다.');const r=game.residents?.[id],def=RESIDENTS[id];if(!r||!def||r.rescued)return;
 r.rescued=true;sfx('rescue');game.survivors=residentCount();if(id==='taeho')game.job=null;
 const field=scene.userData.survivorNodes?.[id],camp=scene.userData.campResidents?.[id];if(field)field.visible=false;if(camp)camp.visible=true;
 if(id==='taeho')flag('rescue');toast(def.icon+' '+def.name+'를 구조했습니다. 캠프로 이동했습니다. 역할을 정해 주세요.','normal',3.5);save();setTimeout(()=>openPanel('settlement'),550)
}
function assignJob(id,role){
 const r=game.residents?.[id],def=RESIDENTS[id];if(!r?.rescued||r.job||!JOBS[role])return;r.job=role;if(id==='taeho')game.job=role;
 discover('division');if(id==='taeho')flag('job');save();renderOpenPanel();const bonus=def.preferred===role?' · 특기와 잘 맞아 효과가 더 큽니다.':'';toast(JOBS[role].icon+' '+def.name+' → '+JOBS[role].name+bonus,'normal',4)
}
function useRadio(){
 if(game.day<7)return toast('…치직… 아직 응답이 없습니다.');if(!game.flags.power)return toast('무전기를 쓸 전력이 없습니다. 폐허의 비상 전력망부터 복구하세요.','warn');
 if(powerUse(.8)>game.powerKw+.001)return toast('⚡ 무전 송신에 0.8kW가 더 필요합니다. 정착지에서 냉장고나 정수기 전원을 잠시 꺼 보세요.','warn',4);
 if(!readyFlood())return toast('폭우 속 장거리 이동 전에 물 2, 식량 2, 쉼터와 전력을 확보하세요.','warn');discover('flood');flag('radio');finish()
}
function usePlaced(id,obj){if(id==='campfire'){if(game.inv.dirtyWater>0&&game.inv.wood>0){game.inv.dirtyWater--;game.inv.wood--;game.inv.cleanWater++;discover('boiling');flag('boil');toast('🔥 강물을 충분히 끓였습니다. 깨끗한 물 +1');save();return}if(game.inv.chemWater>0&&!game.flags.chemBoilTried){if(game.inv.wood<1)return toast('가열할 장작이 필요합니다.','warn');game.inv.wood--;game.flags.chemBoilTried=true;discover('chemicalPollution');toast('☣️ 물은 끓었지만 이상한 냄새가 남아 있습니다. 화학 오염은 끓이기만 해서는 해결되지 않았습니다.','warn',5);save();return}if(game.inv.potato>0&&game.inv.wood>0){game.inv.potato--;game.inv.wood--;game.inv.cookedPotato++;discover('combustion');flag('cook');toast('🍠 감자를 구웠습니다.');save();return}return toast('끓일 강물이나 익힐 음식, 장작이 필요합니다.','warn')}if(id==='farm'){
 const st=obj?.userData?.buildState;if(!st)return;if(!st.planted){if(game.inv.potato<1)return toast('씨감자로 쓸 감자 1개가 필요합니다.','warn');game.inv.potato--;st.planted=true;st.growth=0;discover('plantGrowth');toast('🌱 감자를 심었습니다. 비와 시간이 작물을 자라게 합니다.');save();return}
 if((st.growth||0)<360)return toast('🌱 아직 자라는 중입니다. 성장 '+Math.round((st.growth||0)/3.6)+'%');
 st.planted=false;st.growth=0;game.inv.potato+=4;toast('🥔 감자 4개를 수확했습니다.');save();updateUI();return
 }if(id==='cooler'){toast(devicePowered('cooler')?'🧊 냉장 보관함 작동 중 · 하루가 지나도 식량 부패가 억제됩니다.':'냉장 보관함에 전력이 공급되지 않습니다.','normal',3);return}
 if(id==='purifier'){if(!devicePowered('purifier'))return toast('🚰 정수기에 전력이 공급되지 않습니다.','warn');if(game.inv.dirtyWater<1)return toast('처리할 강물이 없습니다.','warn');game.inv.dirtyWater--;game.inv.cleanWater++;discover('waterTreatment');toast('🚰 여과·소독 장치를 거쳐 깨끗한 물 +1');save();updateUI();return}
 if(id==='storehouse'){openPanel('storage');return}
 if(id==='shelter'){if(game.phase==='settlement'||missionDone())advanceDay();else toast('오늘의 목표를 조금 더 해결해 보세요.','warn')}else toast('작업대가 준비되었습니다.')}
function useItem(id){if(!game||!running)return;if(id==='cleanWater'){if(game.inv.cleanWater<1)return toast('깨끗한 물이 없습니다.','warn');game.inv.cleanWater--;game.thirst=clamp(game.thirst+38,0,100);flag('drink');tutorialSignal('drink');toast('💧 깨끗한 물을 마셨습니다.')}else{const f=game.inv.cookedPotato>0?'cookedPotato':'food';if(game.inv[f]<1)return toast('먹을 것이 없습니다.','warn');game.inv[f]--;game.hunger=clamp(game.hunger+(f==='cookedPotato'?28:35),0,100);toast((ITEMS[f]?.[1]||'🍽')+' 식사했습니다.')}save();updateUI()}
function openPanel(tab='inventory'){if(!game)return;ui.panel.classList.remove('hidden');ui.panel.dataset.tab=tab;$$('#panel nav button').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));renderPanel(tab)}
function closePanel(){ui.panel.classList.add('hidden')}
function togglePanel(){ui.panel.classList.contains('hidden')?openPanel('inventory'):closePanel()}
function renderOpenPanel(){if(!ui.panel.classList.contains('hidden'))renderPanel(ui.panel.dataset.tab||'inventory')}
function renderPanel(tab){
 const titles={inventory:'가방',craft:'제작',build:'건축',knowledge:'생존 도감',map:'지도',settlement:'정착지'};ui.panelTitle.textContent=titles[tab]||'생존 태블릿';
 if(tab==='inventory'){ui.panelBody.innerHTML='<div class="grid-cards">'+Object.entries(ITEMS).map(([id,d])=>'<div class="item-card"><b>'+d[1]+' '+d[0]+'</b><strong>'+(game.inv[id]||0)+'</strong><span>'+itemHint(id)+'</span></div>').join('')+'</div>';return}
 if(tab==='craft'||tab==='build'){const recipes=tab==='craft'?[{id:'axe',name:'돌도끼',icon:'🪓',cost:{wood:3,stone:2},desc:'나무 채집량이 늘어납니다.'}]:Object.entries(BUILD).map(([id,d])=>({id,...d,desc:'캠프에 배치하는 생존 시설입니다.'}));ui.panelBody.innerHTML='<div class="grid-cards">'+recipes.map(r=>'<div class="recipe-card"><b>'+r.icon+' '+r.name+'</b><p>'+r.desc+'<br><small>'+costText(r.cost)+'</small></p><button data-recipe="'+r.id+'" '+(!has(r.cost)||(r.id==='axe'&&game.inv.axe)?'disabled':'')+'>'+(tab==='build'?'배치하기':'제작하기')+'</button></div>').join('')+'</div>';ui.panelBody.querySelectorAll('[data-recipe]').forEach(b=>b.addEventListener('click',()=>tab==='build'?beginBuild(b.dataset.recipe):craft(b.dataset.recipe)));return}
 if(tab==='knowledge'){ui.panelBody.innerHTML='<div class="grid-cards">'+KNOWLEDGE.map(k=>{const on=game.knowledge.includes(k.id);return '<div class="knowledge-card '+(on?'':'locked')+'"><small>'+(on?k.subject:'???')+'</small><b>'+(on?k.title:'아직 발견하지 못한 지식')+'</b><p>'+(on?k.text:'게임 속 행동과 결과를 통해 직접 발견해 보세요.')+'</p></div>'}).join('')+'</div>';return}
 if(tab==='map'){
   const px=clamp((player.root.position.x+70)/140*100,4,96),pz=clamp((player.root.position.z+70)/140*100,4,96),o=currentObjective();
   ui.panelBody.innerHTML='<div class="map-board"><span class="map-zone forest">서쪽 숲</span><span class="map-zone hills">산비탈</span><span class="map-zone city">폐허 도시</span><span class="map-zone river">강</span><span class="map-landmark camp">⌂ 야영지</span><span class="map-landmark ruins">▦ 폐허</span><span class="map-player" style="left:'+px+'%;top:'+pz+'%">●</span></div><div class="settlement-card"><b>현재 위치 · '+ui.zone.textContent+'</b><p>'+(o?'다음 목표: '+o.name+' · 약 '+Math.round(player.root.position.distanceTo(o.pos))+'m':'오늘의 주요 목표를 모두 해결했습니다.')+'</p><p>강은 동쪽을 남북으로 가로지르고, 다리는 중앙 도로에 있습니다. 폭우 때에는 강폭이 넓어집니다.<br>폐허 수색 · 마트 '+ruinSearchProgress('market').done+'/'+ruinSearchProgress('market').total+' · 진료소 '+ruinSearchProgress('clinic').done+'/'+ruinSearchProgress('clinic').total+' · 정비창고 '+ruinSearchProgress('garage').done+'/'+ruinSearchProgress('garage').total+'</p></div>';return
 }
 const metrics=settlementMetrics();
 const residentRows=Object.entries(game.residents||{}).filter(([,r])=>r?.rescued).map(([id,r])=>'<div class="resident-row"><b>'+RESIDENTS[id].icon+' '+RESIDENTS[id].name+'</b><span>'+(r.job?(JOBS[r.job]?.name||r.job):'역할 미정')+(r.job===RESIDENTS[id].preferred?' · 특기 일치':'')+'<small>'+residentActivity(id)+'</small></span></div>').join('');
 const jobChoice=Object.entries(game.residents||{}).filter(([,r])=>r?.rescued&&!r.job).map(([rid])=>'<div class="job-choice"><h3>'+RESIDENTS[rid].name+'의 역할 정하기</h3><p>특기는 '+JOBS[RESIDENTS[rid].preferred].name+'이지만 다른 역할도 맡길 수 있습니다.</p>'+Object.entries(JOBS).map(([id,j])=>'<button data-resident="'+rid+'" data-job="'+id+'"><b>'+j.icon+' '+j.name+'</b><span>'+j.desc+(RESIDENTS[rid].preferred===id?' · 특기 보너스':'')+'</span></button>').join('')+'</div>').join('');
 const powerCard=game.flags.power?'<div class="power-card"><h3>⚡ 전력망 '+powerUse().toFixed(1)+' / '+game.powerKw.toFixed(1)+' kW</h3><p>무전 송신에는 순간적으로 0.8kW의 여유 전력이 필요합니다.</p>'+[['light','야영지 조명','.2'],['cooler','냉장 보관함','.8'],['purifier','전기 정수기','1.2']].map(([id,n,kw])=>{const exists=id==='light'||hasBuilding(id);return exists?'<button data-power="'+id+'">'+(game.powerLoads[id]?'ON':'OFF')+' · '+n+' ('+kw+'kW)</button>':''}).join('')+'</div>':'';
 ui.panelBody.innerHTML='<div class="settlement-card"><h3>한빛 야영지 · '+metrics.label+'</h3><div class="settlement-metrics"><b>자립력 '+metrics.resilience+'</b><span>생활 압박 '+metrics.pressure+'</span><span>식수 '+metrics.water+' · 식량 '+metrics.food+'</span></div><div class="settlement-bars"><label>주거<i style="width:'+Math.round(metrics.housing*100)+'%"></i></label><label>비축<i style="width:'+Math.round(metrics.supply*100)+'%"></i></label><label>전력<i style="width:'+Math.round(metrics.power*100)+'%"></i></label></div><p>👥 인구 '+metrics.population+'명 · 🤝 신뢰 '+Math.round(game.trust)+' · ❤️ 공동체 건강 '+Math.round(game.communityHealth)+' · 🙂 사기 '+Math.round(game.morale)+'</p><p>⚡ 비상 전력 '+(game.flags.power?game.powerKw.toFixed(1)+' kW':'복구 전')+' · ⛺ 쉼터 '+metrics.shelters+' · 🌱 텃밭 '+metrics.farms+'</p><div class="resident-list">'+(residentRows||'<p>아직 혼자입니다. 구조 신호를 찾아보세요.</p>')+'</div><p>'+(game.distribution?'배분 원칙: '+distributionName(game.distribution):'배분 원칙은 아직 정하지 않았습니다.')+'</p></div>'+powerCard+jobChoice;
 ui.panelBody.querySelectorAll('[data-job]').forEach(b=>b.addEventListener('click',()=>assignJob(b.dataset.resident,b.dataset.job)));ui.panelBody.querySelectorAll('[data-power]').forEach(b=>b.addEventListener('click',()=>togglePowerLoad(b.dataset.power)))
}
function itemHint(id){return {dirtyWater:'바로 마시기 안전하지 않을 수 있습니다.',chemWater:'공장 주변에서 얻었습니다. 끓인다고 반드시 안전해지는 것은 아닙니다.',cleanWater:'갈증을 회복합니다.',spoiledFood:'먹지 않는 것이 좋습니다. 음식 보관의 중요성을 보여주는 흔적입니다.',wood:'불과 건축의 기본 자원입니다.',stone:'도구와 모닥불에 쓰입니다.',battery:'전기 에너지 저장 장치입니다.',flashlight:'F키로 켜고 끕니다. 폐허 내부 탐색에 유용합니다.',scrap:'기계 제작에 쓸 수 있습니다.',cloth:'쉼터와 생활용품 재료입니다.',axe:'나무 채집량이 증가합니다.'}[id]||'생존에 사용할 수 있는 물자입니다.'}
function craft(id){if(id!=='axe')return;if(!has({wood:3,stone:2}))return toast('재료가 부족합니다.','warn');pay({wood:3,stone:2});game.inv.axe=1;flag('axe');toast('🪓 돌도끼를 만들었습니다.');renderOpenPanel();save()}
function beginBuild(id){const d=BUILD[id];if(!d||!has(d.cost))return toast('재료가 부족합니다.','warn');buildMode=id;closePanel();makeGhost(id);toast('건축 위치 선택 · 마우스로 방향을 보고 E로 설치 · Esc 취소')}
function makeGhost(id){cancelGhost();const d=BUILD[id];ghost=new THREE.Mesh(id==='campfire'?new THREE.CylinderGeometry(1,.9,.25,12):new THREE.BoxGeometry(id==='shelter'?3.8:2.2,id==='shelter'?2.7:1.1,id==='shelter'?3:1.4),new THREE.MeshBasicMaterial({color:0x63e895,transparent:true,opacity:.38,depthWrite:false}));if(id!=='campfire')ghost.position.y=id==='shelter'?1.35:.55;groups.dynamic.add(ghost)}
function updateGhost(){if(!ghost||!buildMode)return;const f=tmp.set(Math.sin(camYaw),0,Math.cos(camYaw)).multiplyScalar(-5.2);ghost.position.x=Math.round(player.root.position.x+f.x);ghost.position.z=Math.round(player.root.position.z+f.z);const gy=buildMode==='shelter'?1.35:(buildMode==='workbench'||buildMode==='cooler'||buildMode==='purifier')?.55:buildMode==='farm'?.09:0;ghost.position.y=terrainHeight(ghost.position.x,ghost.position.z)+gy;const valid=canBuild(ghost.position,BUILD[buildMode]);ghost.userData.valid=valid;ghost.material.color.setHex(valid?0x63e895:0xff6b6b)}
function canBuild(pos,d){if(Math.abs(pos.x-RIVER_X)<8||new THREE.Vector2(pos.x-CAMP.x,pos.z-CAMP.z).length()>28||blockedAt(pos.x,pos.z))return false;return !placed.some(p=>Math.hypot(p.position.x-pos.x,p.position.z-pos.z)<d.radius+(BUILD[p.userData.interactable?.building]?.radius||1))}
function cancelGhost(){if(ghost){groups.dynamic.remove(ghost);ghost.geometry.dispose();ghost.material.dispose();ghost=null}}
function cancelBuild(){buildMode=null;cancelGhost();toast('건축을 취소했습니다.')}
async function confirmBuild(){if(!buildMode||!ghost?.userData.valid)return toast('여기에는 설치하기 어렵습니다.','warn');const id=buildMode,d=BUILD[id];if(!has(d.cost)){cancelBuild();return toast('재료가 부족합니다.','warn')}pay(d.cost);const pos=ghost.position.clone();cancelGhost();buildMode=null;const state={id,x:pos.x,z:pos.z,planted:false,growth:0};game.buildings.push(state);await spawnPlaced(id,pos,state);flag(id);if(id==='shelter')discover('insulation');if(id==='campfire')discover('combustion');if(id==='storehouse')discover('logistics');toast(d.icon+' '+d.name+' 설치 완료');save()}
async function spawnPlaced(id,pos,state=null){
 const d=BUILD[id],r=new THREE.Group();r.position.copy(pos);r.position.y=terrainHeight(pos.x,pos.z);groups.buildings.add(r);placed.push(r);
 const labels={campfire:'모닥불 사용',shelter:'쉼터에서 쉬기',workbench:'작업대 사용',farm:'텃밭 관리',cooler:'냉장 보관함 확인',purifier:'전기 정수기 사용',storehouse:'공동창고 열기'};r.userData.interactable={type:'placed',label:labels[id]||d.name+' 사용',building:id};r.userData.buildState=state;interactables.push(r);
 let f=id==='campfire'?new THREE.Mesh(new THREE.CylinderGeometry(.9,.8,.25,12),new THREE.MeshStandardMaterial({color:0x76523a})):id==='farm'?new THREE.Mesh(new THREE.BoxGeometry(4,.18,3.2),new THREE.MeshStandardMaterial({color:0x6a4b32})):new THREE.Mesh(new THREE.BoxGeometry(id==='shelter'?3.5:2.2,id==='shelter'?2.6:1.1,id==='shelter'?2.8:1.3),new THREE.MeshStandardMaterial({color:id==='shelter'?0x9b8964:0x74553b}));
 f.position.y=id==='campfire'?.15:id==='farm'?.09:(id==='shelter'?1.3:.55);r.add(f);
 const o=await model('../../assets/game/3d/survival/kenney-survival-kit/'+d.model);if(o){r.clear();normalize(o,id==='shelter'?4:id==='campfire'?1.8:id==='farm'?3.5:2.2);r.add(o)}
 if(id==='campfire'){
  const light=new THREE.PointLight(0xff9b4a,2.4,11,2),flame=new THREE.Mesh(new THREE.ConeGeometry(.18,.62,8),new THREE.MeshBasicMaterial({color:0xffb04c,transparent:true,opacity:.9}));light.position.set(0,1.05,0);flame.position.set(0,.66,0);r.add(light,flame);r.userData.fireLight=light;r.userData.fireFlame=flame
 }else if(id==='cooler'||id==='purifier'){
  const indicator=new THREE.Mesh(new THREE.SphereGeometry(.08,8,6),new THREE.MeshStandardMaterial({color:0x31403b,emissive:0x000000,emissiveIntensity:0}));indicator.position.set(.35,.8,.55);r.add(indicator);r.userData.powerIndicator=indicator
 }
}
async function restoreBuildings(){for(const p of placed)groups.buildings.remove(p);placed.length=0;for(let i=interactables.length-1;i>=0;i--)if(interactables[i].userData.interactable?.building)interactables.splice(i,1);for(const b of game.buildings)await spawnPlaced(b.id,new THREE.Vector3(b.x,terrainHeight(b.x,b.z),b.z),b)}
function updateMission(){
 if(!game)return;
 if(game.phase==='settlement'){
   const steps=settlementSteps(),done=steps.every(s=>s[2]);ui.missionTitle.textContent=done?'정착지 자립 기반 완성':'정착지를 자립시켜라';ui.missionText.textContent=done?'이제 물·식량·주민·전력의 기본 순환이 갖춰졌습니다. 자유롭게 운영하며 문명을 키워 보세요.':'주민을 모으고 식량 생산, 저장, 정수 시설을 연결해 스스로 버틸 수 있는 정착지를 만드세요.';ui.missionSteps.innerHTML=steps.map(([,label,on])=>'<span class="'+(on?'done':'')+'">'+(on?'✓':'○')+' '+label+'</span>').join('');ui.missionKicker.textContent=done?'문명도 2 · 정착지':'정착지 운영 · 멸망 '+game.day+'일째';if(done&&game.settlementLevel<1){game.settlementLevel=1;save();toast('🏘️ 정착지 자립 기반 완성 · 문명도 2 달성!','normal',5)}return
 }
 const m=MISSIONS[Math.min(7,game.day)];ui.missionTitle.textContent=m.title;ui.missionText.textContent=m.text;ui.missionSteps.innerHTML=m.steps.map(([id,label])=>'<span class="'+(game.flags[id]?'done':'')+'">'+(game.flags[id]?'✓':'○')+' '+label+'</span>').join('');ui.missionKicker.textContent=missionDone()&&game.day<7?'오늘의 목표 완료 · 쉬면 다음 날':'오늘의 생존 목표'
}
function togglePowerLoad(id){
 if(!game.flags.power||!(id in game.powerLoads))return;game.powerLoads[id]=!game.powerLoads[id];if(powerUse()>game.powerKw+.001){game.powerLoads[id]=false;toast('⚡ 발전 용량을 넘습니다. 다른 장치를 먼저 꺼 주세요.','warn');return}syncPowerVisual();save();renderOpenPanel()
}
function updateFarms(dt){
 const gameMinutes=dt*(1440/DAY_SECONDS);for(const b of game.buildings||[])if(b.id==='farm'&&b.planted)b.growth=Math.min(360,(b.growth||0)+gameMinutes*(getWeather()==='rain'?1.25:1))
}
function updateBuildingFx(dt){
 const t=performance.now()*.001;for(const r of placed){const id=r.userData.interactable?.building;
  if(id==='campfire'&&r.userData.fireLight){const flick=.82+Math.sin(t*9+r.position.x)*.12+Math.sin(t*17+r.position.z)*.06;r.userData.fireLight.intensity=2.45*flick;r.userData.fireFlame.scale.set(.92+Math.sin(t*13)*.08,1+Math.sin(t*11)*.13,.92+Math.cos(t*15)*.08);r.userData.fireFlame.material.opacity=.74+.18*flick}
  if((id==='cooler'||id==='purifier')&&r.userData.powerIndicator){const on=devicePowered(id),m=r.userData.powerIndicator.material;m.color.setHex(on?0x75dca1:0x4a5551);m.emissive.setHex(on?0x2bc968:0x000000);m.emissiveIntensity=on?1.4:0}
 }}

function spoilFood(){
 if(devicePowered('cooler')){discover('foodPreservation');return 0}if((game.inv.potato||0)<1)return 0;
 const lost=Math.min(game.inv.potato,Math.max(1,Math.floor(game.inv.potato*.25)));game.inv.potato-=lost;game.inv.spoiledFood=(game.inv.spoiledFood||0)+lost;return lost
}
function advanceDay(){
 if(game.phase==='survival'&&game.day>=7)return;game.day++;game.time=420;game.hunger=clamp(game.hunger-12,0,100);game.thirst=clamp(game.thirst-10,0,100);
 const tech=jobPower('technician'),gather=jobPower('gatherer'),medic=jobPower('medic'),delivered=[];
 if(tech){const n=Math.max(1,Math.floor(tech));if(storageBuilt()){game.storage.scrap=(game.storage.scrap||0)+n;delivered.push('고철 '+n)}else game.inv.scrap+=n}
 if(gather){const w=Math.max(1,Math.floor(gather*2)),st=Math.max(1,Math.floor(gather));if(storageBuilt()){game.storage.wood=(game.storage.wood||0)+w;game.storage.stone=(game.storage.stone||0)+st;delivered.push('목재 '+w,'돌 '+st)}else{game.inv.wood+=w;game.inv.stone+=st}}
 if(medic)game.health=clamp(game.health+Math.round(12*medic),0,100);if(delivered.length)discover('logistics');
 const spoiled=spoilFood();player.root.position.copy(CAMP);player.root.position.y=terrainHeight(CAMP.x,CAMP.z);applyDayStart();save();toast('🌅 멸망 '+game.day+'일째.'+(spoiled?' 냉장되지 않은 감자 '+spoiled+'개가 상했습니다.':'')+(delivered.length?' 공동창고에 '+delivered.join(' · ')+' 도착.':tech||gather||medic?' 주민들의 역할 효과가 적용되었습니다.':''),'normal',4)
}
function applyDayStart(){
 for(const [id,rdef] of Object.entries(RESIDENTS)){const state=game.residents?.[id],field=scene.userData.survivorNodes?.[id],camp=scene.userData.campResidents?.[id];if(field)field.visible=game.day>=5&&!state?.rescued;if(camp)camp.visible=!!state?.rescued}
 if(game.day===6&&!game.flags.choice)setTimeout(()=>ui.decision.classList.remove('hidden'),800);if(game.phase==='survival'&&game.day>=7){discover('riverSettlement');toast('⚠️ 폭우 경보 · 강 수위가 실제로 상승하기 시작합니다.','warn',4)}syncPowerVisual();updateMission()}
function chooseDistribution(c){
 const effect={
  equal:{trust:6,health:-2,productivity:0,morale:7,note:'불만은 적지만 몸이 약한 사람에게는 몫이 부족했습니다.'},
  need:{trust:2,health:8,productivity:-3,morale:2,note:'건강은 좋아졌지만 일할 수 있는 사람의 몫이 줄어 생산성이 조금 낮아졌습니다.'},
  work:{trust:-3,health:0,productivity:9,morale:-4,note:'생산성은 높아졌지만 일부 주민이 배분을 불공평하게 느꼈습니다.'}
 }[c];if(!effect)return;
 game.distribution=c;game.trust=clamp(game.trust+effect.trust,0,100);game.communityHealth=clamp(game.communityHealth+effect.health,0,100);game.productivity=clamp(game.productivity+effect.productivity,0,100);game.morale=clamp(game.morale+effect.morale,0,100);
 discover('scarcity');discover('community');ui.decision.classList.add('hidden');flag('choice');toast('배분 결과 · '+effect.note,'normal',4.5);save()
}
function distributionName(c){return c==='equal'?'같은 양':c==='need'?'필요에 따라':c==='work'?'노동량 고려':'미정'}
function readyFlood(){return game.inv.cleanWater>=2&&(game.inv.food+game.inv.cookedPotato)>=2&&game.buildings.some(b=>b.id==='shelter')&&!!game.flags.power}
function derived(){if(game.day>=2&&game.inv.axe)flag('axe');if(game.day>=3&&getWeather()==='rain'){const s=placed.find(p=>p.userData.interactable?.building==='shelter');if(s&&player.root.position.distanceTo(s.position)<5)flag('rain')}if(game.day>=4&&player.root.position.distanceTo(RUINS)<15)flag('ruins');if(game.day>=6&&game.inv.cleanWater>=2&&(game.inv.food+game.inv.cookedPotato)>=2)flag('stock');if(game.day>=7&&readyFlood())flag('ready')}
function getWeather(){
 if(game.phase==='settlement'){const cycle=game.day%5;return cycle===0?'rain':cycle===1?'cloud':'clear'}
 if(game.day===3&&game.time>=480)return'rain';if(game.day>=7)return'rain';return game.day===6?'cloud':'clear'
}
function updateWeather(dt){
 const w=getWeather(),flood=game.phase==='survival'&&game.day>=7?clamp((game.time-420)/600,0,1):0;game.floodLevel=damp(game.floodLevel||0,flood,1.1,dt);
 const river=scene.userData.river;if(river){river.scale.x=damp(river.scale.x,1+game.floodLevel*.7,2.2,dt);river.position.y=damp(river.position.y,.08+game.floodLevel*.28,2.2,dt);river.material.opacity=.84+game.floodLevel*.1}
 ui.weather.textContent=w==='rain'?(game.phase==='survival'&&game.day>=7?'🌧 폭우 · 수위 '+Math.round(game.floodLevel*100)+'%':'🌧 비'):w==='cloud'?'☁ 흐림':'☀ 맑음';

 const hour=game.time/60,daylight=clamp(Math.sin(clamp((hour-5.4)/14.8,0,1)*Math.PI),0,1),weatherLight=w==='rain'?.42:w==='cloud'?.72:1;
 const dayTop=new THREE.Color(0x4f8fb6),dayHorizon=new THREE.Color(0xbfdde3),nightTop=new THREE.Color(0x101a2d),nightHorizon=new THREE.Color(0x405261);
 const top=nightTop.clone().lerp(dayTop,daylight),horizon=nightHorizon.clone().lerp(dayHorizon,daylight);
 if(w==='cloud'){top.lerp(new THREE.Color(0x6d8189),.42);horizon.lerp(new THREE.Color(0x9baeb0),.35)}
 if(w==='rain'){top.lerp(new THREE.Color(0x384d5b),.68);horizon.lerp(new THREE.Color(0x657982),.58)}
 const bg=horizon.clone().lerp(top,.32);scene.background.lerp(bg,dt*.7);scene.fog.color.copy(scene.background);scene.fog.near=damp(scene.fog.near,w==='rain'?34:daylight<.25?42:52,1.2,dt);scene.fog.far=damp(scene.fog.far,w==='rain'?92:daylight<.25?100:132,1.2,dt);
 const sun=scene.userData.sun,hemi=scene.userData.hemi,indoor=currentRuinZone(),interiorLight=indoor?.site?.42:1;if(sun){sun.intensity=damp(sun.intensity,(.12+2.45*daylight)*weatherLight*interiorLight,1.7,dt);const a=((game.time-360)/900)*Math.PI;sun.position.set(Math.cos(a)*42,8+Math.sin(a)*46,Math.sin(a)*30)}
 if(hemi)hemi.intensity=damp(hemi.intensity,(.48+1.35*daylight*(w==='rain'?.7:1))*(indoor?.site?.55:1),1.4,dt);
 const sky=scene.userData.sky?.material?.uniforms;if(sky){sky.top.value.lerp(top,dt*.65);sky.horizon.value.lerp(horizon,dt*.65);sky.ground.value.lerp(new THREE.Color(daylight<.25?0x334137:0x8ea898),dt*.5)}
 if(river){const waterTarget=new THREE.Color(daylight<.25?0x244d63:w==='rain'?0x47727c:0x4b9fb1);river.material.color.lerp(waterTarget,dt*.7)}
 const lamp=scene.userData.campLamp;if(lamp){const on=game.flags.power&&game.powerLoads?.light&&powerUse()<=game.powerKw+.001;lamp.intensity=damp(lamp.intensity,on?(1.2+(1-daylight)*4.2):0,4,dt)}

 if(w==='rain'){
  while(groups.weather.children.length<90){const r=new THREE.Mesh(new THREE.BoxGeometry(.025,.72,.025),new THREE.MeshBasicMaterial({color:0xb9def1,transparent:true,opacity:.48}));r.position.set(player.root.position.x+Math.random()*34-17,Math.random()*18+3,player.root.position.z+Math.random()*34-17);groups.weather.add(r)}
  for(const r of groups.weather.children){r.position.y-=dt*19;if(r.position.y<terrainHeight(r.position.x,r.position.z)){r.position.y=player.root.position.y+18;r.position.x=player.root.position.x+Math.random()*34-17;r.position.z=player.root.position.z+Math.random()*34-17}}
 }else groups.weather.clear()
}
function updateNeeds(dt){game.playSeconds+=dt;game.time+=dt*(1440/DAY_SECONDS);if(game.time>=1430){game.time=1430;if(missionDone()&&game.day<7&&Math.floor(game.playSeconds)%8===0)toast('오늘의 목표를 마쳤습니다. 캠프나 쉼터에서 쉬어 다음 날로 넘어가세요.')}
 const move=player.speed>1;game.hunger=clamp(game.hunger-dt*(move?.055:.035),0,100);game.thirst=clamp(game.thirst-dt*(move?.085:.052),0,100);const s=placed.find(p=>p.userData.interactable?.building==='shelter'),covered=s&&player.root.position.distanceTo(s.position)<4.8,target=getWeather()==='rain'&&!covered?35.5:36.6;game.temp=damp(game.temp,target,.05,dt);if(game.hunger<=0||game.thirst<=0||game.temp<35.2)game.health=clamp(game.health-dt*.7,0,100);else if(game.hunger>40&&game.thirst>40)game.health=clamp(game.health+dt*(.025+.025*jobPower('medic')),0,100);if(game.health<=0){game.health=60;game.hunger=Math.max(25,game.hunger);game.thirst=Math.max(25,game.thirst);player.root.position.copy(CAMP);toast('구조되었습니다. 발견한 지식은 유지됩니다. 캠프로 돌아왔습니다.','danger',4)}derived()}
function updateResources(dt){resources.forEach(r=>{if(!r.userData.available){r.userData.respawn-=dt;if(r.userData.respawn<=0){r.userData.available=true;r.visible=true}}})}
function updateWorldLabels(){
 if(!game)return;for(const o of groups.dynamic.children){if(!o.userData?.worldLabel)continue;const d=o.position.distanceTo(player.root.position),range=o.userData.labelRange||22;o.visible=d<range;if(o.visible){const a=clamp((range-d)/6,0,1);o.material.opacity=.28+.72*a}}
}
function nearestPlaced(id){return placed.find(p=>p.userData.interactable?.building===id)||null}
function roadNodeVector(id){const n=ROAD_NODES[id];return n?new THREE.Vector3(n.x,terrainHeight(n.x,n.z),n.z):null}
function nearestRoadNode(pos){
 let best=null,bd=Infinity;for(const [id,n] of Object.entries(ROAD_NODES)){const d=(pos.x-n.x)*(pos.x-n.x)+(pos.z-n.z)*(pos.z-n.z);if(d<bd){bd=d;best=id}}return best
}
function roadAdjacency(){
 const adj={};for(const id of Object.keys(ROAD_NODES))adj[id]=[];for(const [a,b] of ROAD_EDGES){const na=ROAD_NODES[a],nb=ROAD_NODES[b];if(!na||!nb)continue;const w=Math.hypot(na.x-nb.x,na.z-nb.z);adj[a].push([b,w]);adj[b].push([a,w])}return adj
}
function findRoadPath(from,target){
 if(Math.hypot(from.x-target.x,from.z-target.z)<9)return[target.clone()];
 const start=nearestRoadNode(from),goal=nearestRoadNode(target),adj=roadAdjacency(),dist={},prev={},open=new Set(Object.keys(ROAD_NODES));for(const id of open)dist[id]=Infinity;dist[start]=0;
 while(open.size){let u=null,best=Infinity;for(const id of open)if(dist[id]<best){best=dist[id];u=id}if(u==null||u===goal)break;open.delete(u);for(const [v,w] of adj[u]||[]){if(!open.has(v))continue;const nd=dist[u]+w;if(nd<dist[v]){dist[v]=nd;prev[v]=u}}}
 const ids=[];let cur=goal;while(cur){ids.push(cur);if(cur===start)break;cur=prev[cur]}ids.reverse();if(ids[0]!==start)return[target.clone()];
 const route=ids.map(roadNodeVector).filter(Boolean);route.push(target.clone());return route
}
function residentWaypoint(n,target,id){
 const key=id+'|'+residentActivity(id)+'|'+Math.round(target.x*2)/2+'|'+Math.round(target.z*2)/2;
 if(n.userData.routeKey!==key||!Array.isArray(n.userData.route)){n.userData.routeKey=key;n.userData.route=findRoadPath(n.position,target);n.userData.prevDist=Infinity}
 while(n.userData.route.length&&n.position.distanceTo(n.userData.route[0])<.65)n.userData.route.shift();
 return n.userData.route[0]||target
}
function residentSchedule(id){
 const r=game?.residents?.[id];if(!r?.rescued||!r.job)return null;let h=(game.time||720)/60;if(h<6.5)h+=24;const list=JOB_SCHEDULES[r.job]||[];return list.find(([,a,b])=>h>=a&&h<b)||list[list.length-1]||null
}
function residentActivity(id){
 const r=game?.residents?.[id];if(!r?.rescued)return'구조 대기';if(!r.job)return'역할 대기';return residentSchedule(id)?.[0]||'공동체 작업'
}
function residentWorkTarget(id){
 const r=game?.residents?.[id],activity=residentActivity(id);let p=null;if(!r?.job)return null;
 if(r.job==='technician'&&activity.includes('전력')&&game.flags.power)return POWER_STATION.clone().add(new THREE.Vector3(-1.7,0,1.4));
 if(r.job==='gatherer'&&activity.includes('숲'))return roadNodeVector('forest');
 if(r.job==='medic'&&activity.includes('진료소')&&game.flags.ruins)return CLINIC_POS.clone().add(new THREE.Vector3(-5.2,0,0));
 if(r.job==='technician')p=nearestPlaced('workbench')?.position;
 else if(r.job==='gatherer')p=nearestPlaced('farm')?.position;
 else if(r.job==='medic')p=nearestPlaced('shelter')?.position;
 if(p){const off=id==='taeho'?new THREE.Vector3(1.5,0,.8):id==='mira'?new THREE.Vector3(-1.3,0,1):new THREE.Vector3(1.1,0,-1.1);return p.clone().add(off)}
 if(r.job==='gatherer')return new THREE.Vector3(-10,0,8);if(r.job==='technician')return new THREE.Vector3(4,0,9);return new THREE.Vector3(0,0,11.5)
}
function residentTarget(id){
 const def=RESIDENTS[id],slot=residentSchedule(id);if(!def)return CAMP;if(!slot)return def.camp.clone();const mode=slot[3];
 if(mode==='home')return def.camp.clone();
 if(mode==='meal'){const fire=nearestPlaced('campfire')?.position;return fire?fire.clone().add(new THREE.Vector3(id==='mira'?-1.2:1.1,0,id==='junseo'?1.2:-.7)):CAMP.clone()}
 return residentWorkTarget(id)||def.camp.clone()
}
function settlementMetrics(){
 const population=1+residentCount(),shelters=game.buildings.filter(b=>b.id==='shelter').length,farms=game.buildings.filter(b=>b.id==='farm').length,food=stock('food')+stock('potato')+stock('cookedPotato'),water=stock('cleanWater');
 const housing=clamp((1+shelters*2)/Math.max(1,population),0,1),foodDays=food/Math.max(1,population),waterDays=water/Math.max(1,population),supply=clamp(Math.min(foodDays/2,waterDays/1.5),0,1);
 const powered=!!game.flags.power,margin=powered?Math.max(0,game.powerKw-powerUse()):0,power=powered?clamp(.45+margin/1.8,0,1):0;
 const purifierBuilt=hasBuilding('purifier'),coolerBuilt=hasBuilding('cooler'),waterSystem=purifierBuilt?(devicePowered('purifier')?1:.45):0,cold=coolerBuilt?(devicePowered('cooler')?1:.4):0,foodProd=farms?clamp(.5+farms*.25,0,1):0;
 const health=clamp((game.communityHealth||70)/100,0,1),morale=clamp((game.morale||70)/100,0,1),resilience=Math.round(100*(housing*.18+supply*.23+power*.14+waterSystem*.13+cold*.08+foodProd*.09+health*.1+morale*.05));
 const pressure=Math.round(100*clamp((1-housing)*.34+(1-supply)*.46+(powered?0:.2),0,1)),label=resilience>=72?'안정':resilience>=48?'긴장':'위기';
 return {population,shelters,farms,food,water,housing,supply,power,waterSystem,cold,foodProd,resilience,pressure,label}
}
function residentTryStep(n,target,id,dt){
 const dx=target.x-n.position.x,dz=target.z-n.position.z,dist=Math.hypot(dx,dz);if(dist<=.12)return false;
 const speed=dist>3?1.25:.78,step=Math.min(dist,speed*dt),ux=dx/dist,uz=dz/dist,side=n.userData.detourSide||1;
 const candidates=[[ux,uz],[uz*side,-ux*side],[-uz*side,ux*side]];
 let moved=false;
 for(const [vx,vz] of candidates){const nx=n.position.x+vx*step,nz=n.position.z+vz*step;if(blockedAt(nx,nz,.26)||riverBlocks(nx,nz,.26))continue;n.position.x=nx;n.position.z=nz;n.rotation.y=Math.atan2(vx,vz);moved=true;break}
 const newDist=Math.hypot(target.x-n.position.x,target.z-n.position.z),progress=(n.userData.prevDist??dist)-newDist;n.userData.prevDist=newDist;
 if(moved&&progress>.006)n.userData.stuck=0;else n.userData.stuck=(n.userData.stuck||0)+dt;
 if((n.userData.stuck||0)>2.1){n.userData.detourSide=-(n.userData.detourSide||1);n.userData.stuck=0;n.userData.prevDist=Infinity}
 return moved
}
function updateNpc(dt){
 if(!game)return;for(const [id,n] of Object.entries(scene?.userData?.campResidents||{})){if(!n?.visible)continue;
  const target=residentTarget(id),waypoint=residentWaypoint(n,target,id),moved=residentTryStep(n,waypoint,id,dt);
  if(moved){n.userData.walk=(n.userData.walk||0)+dt*8.4;n.position.y=terrainHeight(n.position.x,n.position.z)+Math.abs(Math.sin(n.userData.walk))*.025}
  else{n.userData.idle=(n.userData.idle||0)+dt*2;n.position.y=terrainHeight(n.position.x,n.position.z)+Math.sin(n.userData.idle)*.012}
  const status=residentActivity(id),labelNode=n.userData.statusLabel;if(labelNode&&labelNode.userData.labelText!==RESIDENTS[id].name+' · '+status)drawLabel(labelNode,RESIDENTS[id].name+' · '+status);
  if(labelNode)labelNode.visible=player.root.position.distanceTo(n.position)<15
 }
}
function currentObjective(){
 if(!game)return null;const nearestBuilding=id=>placed.find(p=>p.userData.interactable?.building===id)?.position||CAMP;
 if(tutorialActive()){const s=game.tutorial.step||0;if(s===2||s===3)return{name:'튜토리얼 · 강',pos:new THREE.Vector3(RIVER_X-6.3,0,5)};if(s===4)return{name:'튜토리얼 · 비상 버너',pos:new THREE.Vector3(2,0,9.4)};if(s===5)return{name:'튜토리얼 · 깨끗한 물',pos:CAMP}}
 if(game.phase==='settlement'){
   const steps=settlementSteps();if(!steps[0][2]){for(const [id,r] of Object.entries(game.residents||{}))if(!r?.rescued)return{name:RESIDENTS[id].name+' 구조',pos:RESIDENTS[id].field}}
   if(!steps[1][2])return{name:'주민 역할 배정',pos:CAMP};if(!steps[2][2])return{name:'텃밭 건설',pos:CAMP};if(!steps[3][2])return{name:'전기 정수기 건설',pos:CAMP};if(!steps[4][2])return{name:'냉장 보관함 건설',pos:CAMP};if(!steps[5][2])return{name:'비상 물자 비축',pos:CAMP};return null
 }
 if(game.day===1){if(!game.flags.water)return{name:'강',pos:new THREE.Vector3(RIVER_X-6.3,0,5)};if(!game.flags.boil)return{name:'비상 버너',pos:new THREE.Vector3(2,0,9.4)};if(!game.flags.drink)return{name:'깨끗한 물 마시기',pos:CAMP}}
 if(game.day===2){if(!game.flags.axe)return{name:'서쪽 숲·바위',pos:new THREE.Vector3(-12,0,2)};if(!game.flags.campfire)return{name:'캠프 건축 구역',pos:CAMP};if(!game.flags.cook)return{name:'모닥불',pos:nearestBuilding('campfire')}}
 if(game.day===3){if(!game.flags.shelter)return{name:'캠프 건축 구역',pos:CAMP};if(!game.flags.rain)return{name:'쉼터',pos:nearestBuilding('shelter')}}
 if(game.day===4){if(!game.flags.ruins)return{name:'폐허 도시',pos:RUINS};if(!game.flags.battery)return{name:'보급 상자',pos:CRATE_POS};if(!game.flags.power)return{name:'비상 배전반',pos:POWER_STATION}}
 if(game.day===5){if(!game.flags.rescue)return{name:'구조 요청',pos:SURVIVOR_POS};if(!game.flags.job)return{name:'정착지 태블릿',pos:CAMP}}
 if(game.day===6){if(!game.flags.choice)return{name:'공동체 회의',pos:CAMP};if(!game.flags.stock)return{name:'비상 물자 비축',pos:CAMP}}
 if(game.day===7){if(!game.flags.ready)return{name:'폭우 대비',pos:CAMP};if(!game.flags.radio)return{name:'비상 무전기',pos:new THREE.Vector3(-4,0,12)}}
 return null
}
function updateUI(){if(!game)return;ui.health.textContent=Math.round(game.health);ui.hunger.textContent=Math.round(game.hunger);ui.thirst.textContent=Math.round(game.thirst);ui.temp.textContent=game.temp.toFixed(1);ui.hotWater.textContent=game.inv.cleanWater;ui.hotFood.textContent=game.inv.food+game.inv.cookedPotato;ui.hotAxe.textContent=game.inv.axe?'✓':'-';ui.hotItems.textContent=Object.values(game.inv).reduce((a,b)=>a+b,0);const m=Math.floor(game.time),h=Math.floor(m/60),mm=m%60;ui.day.textContent='멸망 '+game.day+'일째';ui.clock.textContent=String(h).padStart(2,'0')+':'+String(mm).padStart(2,'0');const p=player.root.position;if(Math.abs(p.x-RIVER_X)<10)ui.zone.textContent='강변';else if(p.distanceTo(RUINS)<19)ui.zone.textContent='폐허 도시';else if(p.x<-42&&p.z>16)ui.zone.textContent='산비탈';else if(p.x<-18)ui.zone.textContent='서쪽 숲';else ui.zone.textContent='학교 야영지';const o=currentObjective();ui.bearing.textContent=o?'목표 · '+o.name+' '+Math.round(p.distanceTo(o.pos))+'m':'캠프 '+Math.round(p.distanceTo(CAMP))+'m';updateMission()}
function continueSettlement(){
 game.finished=false;game.phase='settlement';game.day=Math.max(8,game.day+1);game.time=420;game.floodLevel=0;player.root.position.copy(CAMP);player.root.position.y=terrainHeight(CAMP.x,CAMP.z);ui.ending.classList.add('hidden');ui.hud.classList.remove('hidden');running=true;paused=false;applyDayStart();save();toast('🏘️ 정착지 운영 시작 · 이제 7일 버티기가 아니라 스스로 살아가는 공동체를 만듭니다.','normal',5)
}
function finish(){if(game.finished)return;game.finished=true;save();running=false;ui.hud.classList.add('hidden');ui.ending.classList.remove('hidden');ui.endingText.textContent=(1+residentCount())+'명이 함께 살아남았습니다. 과학·사회 지식 '+game.knowledge.length+'개를 발견하고 '+game.buildings.length+'개의 시설을 세웠습니다.';ui.endingStats.innerHTML='<div><b>'+(1+residentCount())+'</b><small>인구</small></div><div><b>'+game.knowledge.length+'</b><small>발견 지식</small></div><div><b>'+game.buildings.length+'</b><small>시설</small></div><div><b>'+Math.round(game.trust)+'</b><small>신뢰</small></div>';window.KidscadeGame?.gameOver?.({score:game.knowledge.length*500+game.buildings.length*200+Math.round(game.trust)*10,day:7})}
async function start(freshRun){game=freshRun?withOldKnowledge(fresh()):withOldKnowledge(load()||fresh());if(!freshRun&&game.finished&&game.phase==='survival'){game.finished=false;game.phase='settlement';game.day=Math.max(8,game.day+1);game.time=420}camYaw=game.yaw||Math.PI;player.root.position.set(game.pos?.x||0,terrainHeight(game.pos?.x||0,game.pos?.z??8),game.pos?.z??8);game.survivors=residentCount();ui.start.classList.add('hidden');ui.ending.classList.add('hidden');ui.hud.classList.remove('hidden');running=true;paused=false;await restoreBuildings();applyDayStart();syncPowerVisual();updateUI();renderTutorial();window.KidscadeGame?.start?.({day:game.day});toast('E 상호작용 · C 제작 · B 건축 · TAB 생존 태블릿','normal',4)}
function resize(){renderer?.setSize(innerWidth,innerHeight,false);if(camera){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()}}
function loop(){requestAnimationFrame(loop);if(!renderer)return;const dt=Math.min(.05,clock.getDelta());if(running&&!paused){updatePlayer(dt);updateCamera(dt);updateInteract();updateGhost();updateNeeds(dt);updateResources(dt);updateFarms(dt);updateBuildingFx(dt);updateNpc(dt);updateWorldLabels();updateTutorial();updateRuinInteriors(dt);updateWeather(dt);updateFx(dt);updateAudio(dt);if(performance.now()-lastSave>20000){lastSave=performance.now();save()}if(toastT>0){toastT-=dt;if(toastT<=0)ui.toast.classList.remove('show')}updateUI()}else updateCamera(dt);renderer.render(scene,camera)}
async function boot(){init3D();ui.loadingText.textContent='검수된 3D 숲·폐허 자산과 키즈케이드 아바타를 연결하고 있어요.';await Promise.all(['campfire-pit.glb','structure.glb','workbench.glb'].map(f=>model('../../assets/game/3d/survival/kenney-survival-kit/'+f)));ui.loading.classList.add('hidden');ui.continueGame.disabled=!load();ui.continueGame.textContent=load()?'이어하기':'저장된 생존 없음';ui.newGame.addEventListener('click',()=>{localStorage.removeItem(SAVE);start(true)});ui.continueGame.addEventListener('click',()=>load()&&start(false));ui.restartGame.addEventListener('click',()=>{ui.ending.classList.add('hidden');localStorage.removeItem(SAVE);start(true)});ui.continueSettlement?.addEventListener('click',continueSettlement);window.KidscadeGame?.registerPauseHandlers?.({pause(){paused=true},resume(){paused=false;clock.getDelta()}});loop()}
boot().catch(err=>{console.error(err);ui.loadingText.textContent='월드를 준비하지 못했습니다. 새로고침해 주세요.';window.KidscadeGame?.reportError?.(err,{code:'APOCALYPSE_BOOT',fatal:true})});
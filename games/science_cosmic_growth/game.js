import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const $=id=>document.getElementById(id);
const LOW_POWER=innerWidth<760||((navigator.hardwareConcurrency||8)<=4)||((navigator.deviceMemory||8)<=4);
const SAVE_KEY=window.KidscadeGame?.storageKey?.('science_cosmic_growth','save')||'kidscade_game_v1:science_cosmic_growth:save';
const ROOT='../../assets/game/';
const AUDIO_ROOT='../../assets/audio/';
const EARTH=5.9722e24,JUPITER=1.89813e27,SUN=1.98847e30;

const STAGES=[
 {id:'dust',name:'우주 먼지',need:18,m0:1e-12,m1:1e-6,scale:'먼지 한 알보다 작음',fact:'우주 공간에도 아주 작은 고체 입자와 가스가 떠다닙니다.',discover:['cosmic_dust','micro_scale']},
 {id:'aggregate',name:'먼지 덩어리',need:24,m0:1e-6,m1:.05,scale:'눈에 겨우 보이는 알갱이',fact:'미세 입자들은 충돌하고 달라붙으며 더 큰 덩어리로 자랄 수 있습니다.',discover:['dust_aggregate']},
 {id:'pebble',name:'자갈 천체',need:34,m0:.05,m1:1e4,scale:'돌멩이에서 자동차 크기',fact:'작은 충돌이 계속되면 더 큰 덩어리가 되지만, 충돌이 너무 빠르면 다시 부서지기도 합니다.',discover:['collision_growth']},
 {id:'asteroid',name:'소행성',need:48,m0:1e4,m1:1e15,scale:'건물에서 작은 산 크기',fact:'질량이 커질수록 중력이 주변 물질의 경로를 더 크게 휘게 합니다.',discover:['asteroid','gravity']},
 {id:'planetesimal',name:'미행성',need:65,m0:1e15,m1:1e21,scale:'거대한 산에서 작은 위성 크기',fact:'행성 형성 과정에서는 미행성들이 서로 충돌하고 합쳐져 더 큰 천체가 됩니다.',discover:['planetesimal']},
 {id:'protoplanet',name:'원시행성',need:90,m0:1e21,m1:1e24,scale:'작은 행성 크기',fact:'충돌과 압축으로 내부가 뜨거워지고, 큰 천체는 중력 때문에 점점 둥글어집니다.',discover:['round_world','impact_heat']},
 {id:'rocky_planet',name:'암석행성',need:120,m0:1e24,m1:2e26,scale:'지구와 비슷하거나 더 큰 행성',fact:'암석행성에는 충돌구·대기·위성처럼 서로 다른 흔적과 환경이 생길 수 있습니다.',discover:['rocky_planet','earth_scale']},
 {id:'gas_giant',name:'거대행성',need:160,m0:2e26,m1:2.5e28,scale:'목성급 거대행성',fact:'거대행성은 두꺼운 수소·헬륨 대기를 가지며 강한 중력으로 많은 위성을 거느릴 수 있습니다.',discover:['gas_giant']},
 {id:'brown_dwarf',name:'갈색왜성',need:190,m0:2.5e28,m1:1.6e29,scale:'행성과 별 사이의 질량',fact:'갈색왜성은 행성보다 훨씬 무겁지만 보통 별처럼 안정적인 수소 핵융합을 이어가기에는 부족합니다.',discover:['brown_dwarf']},
 {id:'star',name:'별',need:240,m0:1.6e29,m1:4e31,scale:'태양급에서 거대질량별까지',fact:'중심의 압력과 온도가 충분히 높아지면 수소 핵융합이 시작되고 별이 스스로 빛납니다.',discover:['star_birth','fusion','solar_scale']},
 {id:'supergiant',name:'초거성',need:300,m0:4e31,m1:9e31,scale:'태양보다 훨씬 무거운 별',fact:'매우 무거운 별은 연료를 빠르게 소모하고 마지막에는 핵붕괴를 겪을 수 있습니다.',discover:['supergiant','heavy_elements']},
 {id:'supernova',name:'초신성 · 핵붕괴',need:100,m0:9e31,m1:6e31,scale:'별의 바깥층이 우주로 퍼지는 순간',fact:'핵붕괴 초신성에서는 별의 바깥층이 강하게 방출되고 중심에는 매우 조밀한 잔해가 남을 수 있습니다.',discover:['supernova'],auto:true},
 {id:'stellar_black_hole',name:'항성질량 블랙홀',need:360,m0:2e31,m1:2e35,scale:'별 수 개에서 수만 개 질량',fact:'사건의 지평선 안쪽에서는 빛도 바깥으로 탈출할 수 없습니다.',discover:['black_hole','event_horizon']},
 {id:'intermediate_black_hole',name:'중간질량 블랙홀',need:520,m0:2e35,m1:8e36,scale:'수백~수만 태양질량',fact:'중간질량 블랙홀은 항성질량과 초대질량 블랙홀 사이의 연결고리로 활발히 연구되고 있습니다.',discover:['intermediate_bh']},
 {id:'supermassive_black_hole',name:'초대질량 블랙홀',need:720,m0:8e36,m1:1e39,scale:'은하 중심을 차지할 규모',fact:'많은 은하 중심에는 수백만~수십억 태양질량의 초대질량 블랙홀이 있습니다.',discover:['supermassive_bh','galaxy_scale']},
 {id:'quasar',name:'활동은하핵 · 퀘이사',need:1000,m0:1e39,m1:1e41,scale:'은하보다 멀리서도 보이는 밝은 핵',fact:'블랙홀 자체가 빛나는 것이 아니라, 주변 강착원반의 뜨거운 물질이 엄청난 빛을 냅니다.',discover:['quasar']}
];

const DISCOVERIES=[
 {id:'cosmic_dust',cat:'body',min:0,icon:'✦',title:'우주 먼지',text:'성간 공간에는 규산염·탄소 성분 등을 포함한 매우 작은 고체 입자가 존재합니다.'},
 {id:'micro_scale',cat:'scale',min:0,icon:'🔬',title:'미세한 시작',text:'게임의 출발점은 눈으로 보기 어려운 미세 입자 규모입니다. 이후 크기 단위가 mm, m, km를 넘어 천문 단위까지 커집니다.'},
 {id:'static_stick',cat:'phenomenon',min:0,icon:'⚡',title:'미세 입자의 부착',text:'아주 작은 입자 단계에서는 표면 힘과 정전기적 상호작용 등이 입자가 달라붙는 데 도움을 줄 수 있습니다.',event:'spark'},
 {id:'dust_aggregate',cat:'body',min:1,icon:'·',title:'먼지 덩어리',text:'작은 알갱이들이 뭉친 다공성 덩어리는 행성 형성의 아주 초기 재료가 될 수 있습니다.'},
 {id:'collision_growth',cat:'phenomenon',min:2,icon:'💥',title:'충돌과 성장',text:'충돌은 천체를 키우기도 하고 부수기도 합니다. 속도·크기·재질에 따라 결과가 달라집니다.',event:'impact'},
 {id:'asteroid',cat:'body',min:3,icon:'🪨',title:'소행성',text:'소행성은 태양 주위를 도는 작은 암석·금속 천체입니다. 모양이 꼭 둥글 필요는 없습니다.'},
 {id:'gravity',cat:'phenomenon',min:3,icon:'◎',title:'중력 집중',text:'질량이 커질수록 주변 물질을 끌어당기는 중력의 영향이 커져 성장 속도도 달라질 수 있습니다.',event:'gravity'},
 {id:'planetesimal',cat:'body',min:4,icon:'◉',title:'미행성',text:'미행성은 원시행성계 원반에서 만들어지는 비교적 큰 고체 천체로, 서로 합쳐져 행성을 만드는 재료가 됩니다.'},\n {id:'comet',cat:'phenomenon',min:4,icon:'☄️',title:'혜성',text:'혜성은 얼음·먼지·암석으로 이루어진 작은 천체입니다. 별 가까이 가면 가스와 먼지가 방출되어 긴 꼬리가 보일 수 있습니다.',event:'comet'},
 {id:'round_world',cat:'phenomenon',min:5,icon:'⚪',title:'왜 큰 천체는 둥글까?',text:'천체가 충분히 커지면 자체 중력이 높은 부분을 끌어내리고 낮은 부분을 채우며 더 둥근 평형 모양을 만들게 됩니다.',event:'pulse'},
 {id:'impact_heat',cat:'phenomenon',min:5,icon:'🌋',title:'충돌 가열',text:'원시행성이 자랄 때 거대한 충돌과 압축은 내부를 뜨겁게 만들 수 있습니다.',event:'impact'},
 {id:'rocky_planet',cat:'body',min:6,icon:'🪐',title:'암석행성',text:'암석과 금속이 중심을 이루는 행성은 단단한 표면을 가질 수 있습니다.'},
 {id:'earth_scale',cat:'scale',min:6,icon:'🌍',title:'지구 질량',text:'지구의 질량은 약 5.97×10²⁴ kg입니다. 이후부터는 kg보다 지구 질량 단위가 훨씬 보기 편해집니다.'},
 {id:'moon_capture',cat:'phenomenon',min:6,icon:'🌙',title:'위성',text:'행성 주위를 도는 자연 천체를 위성이라고 합니다. 충돌 잔해가 뭉치거나 포획되는 등 여러 방식으로 생길 수 있습니다.',event:'moon'},
 {id:'crater',cat:'phenomenon',min:6,icon:'☄️',title:'충돌구',text:'빠른 천체가 표면에 충돌하면 둥근 충돌구와 분출물이 남을 수 있습니다.',event:'impact'},
 {id:'atmosphere',cat:'phenomenon',min:6,icon:'🌫️',title:'대기',text:'천체의 중력이 충분하고 조건이 맞으면 주변의 기체를 붙잡아 대기를 유지할 수 있습니다.',event:'atmosphere'},
 {id:'gas_giant',cat:'body',min:7,icon:'🌀',title:'거대행성',text:'목성처럼 수소와 헬륨이 큰 비중을 차지하는 거대행성은 두꺼운 대기와 강한 중력을 가집니다.'},
 {id:'rings',cat:'phenomenon',min:7,icon:'💫',title:'행성 고리',text:'얼음·암석 조각들이 행성 둘레를 공전하면 넓은 고리처럼 보일 수 있습니다.',event:'ring'},
 {id:'aurora',cat:'phenomenon',min:7,icon:'🌌',title:'오로라',text:'자기장과 대기가 있는 천체에서는 고에너지 입자가 대기와 충돌하면서 빛나는 오로라가 나타날 수 있습니다.',event:'aurora'},
 {id:'brown_dwarf',cat:'body',min:8,icon:'🟤',title:'갈색왜성',text:'갈색왜성은 별처럼 형성되지만 일반적인 별처럼 장기간 수소 핵융합을 유지하기에는 질량이 부족한 천체입니다.'},
 {id:'star_birth',cat:'body',min:9,icon:'☀️',title:'별의 탄생',text:'가스가 중력으로 수축해 중심이 충분히 뜨거워지면 수소 핵융합이 시작되어 별이 빛납니다.'},
 {id:'fusion',cat:'phenomenon',min:9,icon:'⚛️',title:'핵융합',text:'별의 중심에서는 가벼운 원자핵이 결합해 더 무거운 원자핵이 되며 에너지가 방출됩니다.'},
 {id:'solar_scale',cat:'scale',min:9,icon:'☀️',title:'태양 질량',text:'태양의 질량은 약 1.99×10³⁰ kg입니다. 별과 블랙홀은 보통 태양 질량(M☉)으로 비교합니다.'},
 {id:'flare',cat:'phenomenon',min:9,icon:'🔥',title:'항성 플레어',text:'별의 자기장에 저장된 에너지가 갑자기 방출되면 밝고 강력한 플레어가 일어날 수 있습니다.',event:'flare'},
 {id:'sunspot',cat:'phenomenon',min:9,icon:'●',title:'별의 흑점',text:'강한 자기장 때문에 주변보다 표면 온도가 낮아 상대적으로 어둡게 보이는 영역이 생길 수 있습니다.',event:'spot'},
 {id:'supergiant',cat:'body',min:10,icon:'🔴',title:'초거성',text:'질량이 매우 큰 별은 연료를 빠르게 사용하며 진화 후반에 매우 크고 밝은 초거성 단계에 들어갈 수 있습니다.'},
 {id:'heavy_elements',cat:'phenomenon',min:10,icon:'🧪',title:'별 속의 무거운 원소',text:'별 내부의 핵융합과 초신성 같은 격렬한 사건은 우주에 다양한 무거운 원소가 존재하게 되는 과정과 연결됩니다.',event:'spark'},
 {id:'supernova',cat:'phenomenon',min:11,icon:'💥',title:'핵붕괴 초신성',text:'매우 무거운 별의 중심핵이 붕괴하면 거대한 폭발이 일어나 바깥층 물질을 우주로 내보낼 수 있습니다.'},
 {id:'pulsar',cat:'phenomenon',min:11,icon:'📡',title:'펄서',text:'일부 초신성 뒤에는 빠르게 회전하는 중성자별이 남습니다. 방사선 빔이 지구 방향을 지날 때 규칙적인 펄스처럼 관측됩니다.',event:'pulsar'},
 {id:'black_hole',cat:'body',min:12,icon:'⚫',title:'블랙홀',text:'아주 강한 중력 때문에 특정 경계 안쪽에서 빛조차 탈출할 수 없는 천체입니다.'},
 {id:'event_horizon',cat:'phenomenon',min:12,icon:'⭕',title:'사건의 지평선',text:'블랙홀에서 바깥으로 되돌아올 수 없는 경계를 사건의 지평선이라고 합니다.'},
 {id:'no_vacuum',cat:'phenomenon',min:12,icon:'🧹',title:'우주 청소기는 아니다',text:'블랙홀은 멀리 있는 모든 것을 무조건 빨아들이는 청소기가 아닙니다. 같은 질량의 다른 천체처럼 중력이 작용합니다.',event:'orbit'},
 {id:'accretion_disk',cat:'phenomenon',min:12,icon:'🟠',title:'강착원반',text:'블랙홀로 떨어지는 물질이 회전하면서 뜨거운 원반을 만들 수 있습니다. 우리가 보는 밝은 빛은 주로 이 물질에서 나옵니다.',event:'disk'},
 {id:'lensing',cat:'phenomenon',min:12,icon:'🔭',title:'중력렌즈',text:'큰 질량은 주변의 시공간을 휘게 해 뒤쪽 천체의 빛 경로도 휘게 만들 수 있습니다.',event:'lens'},
 {id:'spaghettification',cat:'phenomenon',min:12,icon:'〰️',title:'스파게티화',text:'블랙홀 가까이에서는 위치에 따른 중력 차이가 커져 물체가 길게 늘어나는 조석 효과가 매우 강해질 수 있습니다.',event:'tidal'},
 {id:'intermediate_bh',cat:'body',min:13,icon:'⚫',title:'중간질량 블랙홀',text:'항성질량 블랙홀보다 무겁고 초대질량 블랙홀보다 가벼운 중간질량 블랙홀 후보들이 연구되고 있습니다.'},
 {id:'merger',cat:'phenomenon',min:13,icon:'⚫⚫',title:'블랙홀 병합',text:'두 블랙홀이 서로 공전하며 에너지를 잃으면 가까워지다가 하나로 합쳐질 수 있습니다.',event:'merge'},
 {id:'gravity_wave',cat:'phenomenon',min:13,icon:'〰',title:'중력파',text:'질량이 큰 천체가 가속 운동을 하면 시공간의 잔물결인 중력파가 퍼져나갈 수 있습니다.',event:'wave'},
 {id:'supermassive_bh',cat:'body',min:14,icon:'🌌',title:'초대질량 블랙홀',text:'은하 중심에는 태양 수백만 개에서 수십억 개에 해당하는 질량의 블랙홀이 존재할 수 있습니다.'},
 {id:'galaxy_scale',cat:'scale',min:14,icon:'🌌',title:'은하의 중심',text:'우리 은하 중심의 궁수자리 A*는 태양 약 400만 개 정도의 질량을 가진 초대질량 블랙홀입니다.'},
 {id:'unknown_origin',cat:'phenomenon',min:14,icon:'❓',title:'아직 풀리지 않은 기원',text:'초대질량 블랙홀이 우주 초기에 어떻게 그렇게 빠르게 커졌는지는 지금도 중요한 연구 주제입니다.',event:'question'},
 {id:'quasar',cat:'body',min:15,icon:'✨',title:'퀘이사',text:'활발히 물질을 먹는 초대질량 블랙홀 주변은 강착원반 때문에 멀리서도 매우 밝게 보일 수 있습니다.'},
 {id:'jet',cat:'phenomenon',min:15,icon:'↕️',title:'상대론적 제트',text:'일부 활동은하핵에서는 블랙홀 주변 자기장과 강착 과정 때문에 매우 빠른 입자 제트가 양쪽 방향으로 뻗어 나옵니다.',event:'jet'}
];

const UPGRADES=[
 {id:'electrostatic',min:0,cost:1,icon:'⚡',name:'정전기적 부착',desc:'탭 성장량 ×1.5',tap:1.5},
 {id:'micro_aggregate',min:1,cost:1,icon:'✦',name:'미세입자 응집',desc:'주변 입자 자동 유입 +0.25/s',auto:0.25},
 {id:'gravity_focus',min:3,cost:2,icon:'◎',name:'중력 집중',desc:'탭 성장량 ×1.8',tap:1.8},
 {id:'orbital_sweep',min:4,cost:2,icon:'↻',name:'궤도 쓸어담기',desc:'자동 성장 +1.2/s',auto:1.2},
 {id:'proto_disk',min:5,cost:3,icon:'💫',name:'원시행성계 원반',desc:'모든 자동 성장 ×1.7',autoMul:1.7},
 {id:'gas_accretion',min:7,cost:3,icon:'🌫️',name:'가스 강착',desc:'자동 성장 +4/s',auto:4},
 {id:'stellar_inflow',min:9,cost:3,icon:'☀️',name:'성간 가스 유입',desc:'자동 성장 +7/s',auto:7},
 {id:'fusion_pressure',min:9,cost:4,icon:'⚛️',name:'핵융합 압력',desc:'탭 성장량 ×2',tap:2},
 {id:'accretion_disk',min:12,cost:4,icon:'🟠',name:'강착원반',desc:'모든 자동 성장 ×1.8',autoMul:1.8},
 {id:'star_capture',min:12,cost:5,icon:'⭐',name:'항성 포획',desc:'자동 성장 +22/s',auto:22},
 {id:'cluster_feeding',min:13,cost:5,icon:'🌌',name:'성단 공급',desc:'자동 성장 +45/s',auto:45},
 {id:'blackhole_merger',min:14,cost:6,icon:'⚫',name:'블랙홀 병합',desc:'모든 성장 속도 ×2',tap:2,autoMul:2}
];

const ui={
 stage:$('stageLabel'),era:$('eraLabel'),scale:$('scaleLabel'),mass:$('massLabel'),fill:$('progressFill'),next:$('nextLabel'),insight:$('insightLabel'),
 rate:$('rateLabel'),upgrades:$('upgradeList'),discCount:$('discoveredCount'),discTotal:$('discoveryTotal'),codexProgress:$('codexProgress'),
 event:$('eventPill'),eventIcon:$('eventIcon'),eventLabel:$('eventLabel'),eventTimer:$('eventTimer'),hint:$('tapHint'),toast:$('toast'),
 evo:$('evolution'),evoKicker:$('evoKicker'),evoTitle:$('evoTitle'),evoFact:$('evoFact'),intro:$('intro'),continueBtn:$('continueBtn'),
 science:$('scienceModal'),scienceIcon:$('scienceIcon'),scienceCategory:$('scienceCategory'),scienceTitle:$('scienceTitle'),scienceText:$('scienceText'),scienceBonus:$('scienceBonus'),
 codex:$('codex'),codexGrid:$('codexGrid'),pause:$('pause'),error:$('webglError'),gain:$('gainFloatLayer')
};

function freshState(){
 return {stage:0,progress:0,insight:0,upgrades:{},discovered:{},taps:0,startedAt:Date.now(),lastSave:Date.now(),sound:true,blackHoleEra:false};
}
let state=freshState(),running=false,paused=false,modalOpen=false,last=performance.now(),uiClock=0,saveClock=0,autoAdvanceClock=0;
let eventNextAt=0,eventExpiresAt=0,currentEvent=null,eventSeenAt=0,toastTimer=0,evoTimer=0,tapPulse=0,lensPulse=0;
let renderer,scene,camera,bodyRoot,bodyGroup,contextGroup,fxGroup,starField,galaxyGroup;
let planetTextures=[],fxTextures={},gltfCache=new Map(),assetsReady=false;
const gltfLoader=new GLTFLoader(),texLoader=new THREE.TextureLoader(),activeFx=[];

function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function stage(){return STAGES[state.stage]}
function progressRatio(){const s=stage();return s.id==='quasar'?1-Math.exp(-state.progress/s.need):clamp(state.progress/s.need,0,1)}
function massNow(){
 const s=stage(),r=progressRatio(),a=Math.log10(s.m0),b=Math.log10(s.m1);
 return Math.pow(10,a+(b-a)*r);
}
function formatNumber(n,d=1){return Number(n).toLocaleString('ko-KR',{maximumFractionDigits:d})}
function formatMass(kg){
 if(!Number.isFinite(kg)||kg<=0)return '0 kg';
 if(kg<1e-9)return formatNumber(kg*1e12,1)+' ng';
 if(kg<1e-6)return formatNumber(kg*1e9,1)+' μg';
 if(kg<1e-3)return formatNumber(kg*1e6,1)+' mg';
 if(kg<1)return formatNumber(kg*1e3,1)+' g';
 if(kg<1e3)return formatNumber(kg,1)+' kg';
 if(kg<1e9)return formatNumber(kg/1e3,1)+' t';
 if(kg<EARTH*.01)return kg.toExponential(2)+' kg';
 if(kg<JUPITER*.1)return formatNumber(kg/EARTH,2)+' M⊕';
 if(kg<SUN*.08)return formatNumber(kg/JUPITER,2)+' M♃';
 return formatNumber(kg/SUN,2)+' M☉';
}
function tapPower(){
 let p=1+state.stage*.11;
 for(const u of UPGRADES)if(state.upgrades[u.id])p*=u.tap||1;
 return p;
}
function autoRate(){
 let r=state.stage>=2 ? 0.03*Math.pow(1.3,state.stage) : 0;
 let mul=1;
 for(const u of UPGRADES)if(state.upgrades[u.id]){r+=u.auto||0;mul*=u.autoMul||1}
 return r*mul;
}
function save(){
 if(!running)return;
 try{state.lastSave=Date.now();localStorage.setItem(SAVE_KEY,JSON.stringify(state))}catch(_){}
}
function hasSave(){try{return !!localStorage.getItem(SAVE_KEY)}catch(_){return false}}
function load(){
 try{
  const raw=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');
  if(!raw||!Number.isFinite(raw.stage))return false;
  state={...freshState(),...raw,stage:clamp(Math.floor(raw.stage),0,STAGES.length-1),upgrades:raw.upgrades||{},discovered:raw.discovered||{}};
  return true;
 }catch(_){return false}
}
function clearSave(){try{localStorage.removeItem(SAVE_KEY)}catch(_){}}
function toast(msg){
 clearTimeout(toastTimer);ui.toast.textContent=msg;ui.toast.classList.add('show');
 toastTimer=setTimeout(()=>ui.toast.classList.remove('show'),1500);
}
function floatGain(x,y,value){
 const el=document.createElement('span');el.className='gainFloat';el.textContent='+'+value.toFixed(value<10?1:0);el.style.left=(x-10)+'px';el.style.top=(y-10)+'px';ui.gain.appendChild(el);setTimeout(()=>el.remove(),950);
}
function reportAchievement(slot,detail={}){
 try{window.KidscadeGame?.achievement?.('science_cosmic_growth.'+slot,detail)}catch(_){}
}
function reportMilestone(id,detail={}){
 try{window.KidscadeGame?.milestone?.(id,{uniqueKey:id,...detail})}catch(_){}
}
function checkAchievements(){
 if(state.stage>=3)reportAchievement('first_asteroid',{stage:state.stage});
 if(state.stage>=9)reportAchievement('star_birth',{stage:state.stage});
 if(state.stage>=12)reportAchievement('black_hole',{stage:state.stage});
 if(Object.keys(state.discovered).length>=12)reportAchievement('discoveries_12',{discoveries:Object.keys(state.discovered).length});
 if(state.stage>=14)reportAchievement('galactic_core',{stage:state.stage});
}

let audioCtx=null,ambientNodes=[],impactAudio=null,whooshAudio=null;
function ensureAudio(){
 if(!state.sound)return;
 try{
  audioCtx=audioCtx||new(window.AudioContext||window.webkitAudioContext)();audioCtx.resume();
  if(!ambientNodes.length){
   const master=audioCtx.createGain();master.gain.value=.016;master.connect(audioCtx.destination);
   [48,72].forEach((f,i)=>{const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=i?'sine':'triangle';o.frequency.value=f;g.gain.value=i ? 0.45 : 0.7;o.connect(g).connect(master);o.start();ambientNodes.push(o,g)});ambientNodes.push(master);
  }
 }catch(_){}
}
function tone(freq=340,d=.06,g=.025,type='sine'){
 if(!state.sound)return;ensureAudio();
 try{const o=audioCtx.createOscillator(),v=audioCtx.createGain();o.type=type;o.frequency.value=freq;v.gain.setValueAtTime(.0001,audioCtx.currentTime);v.gain.exponentialRampToValueAtTime(g,audioCtx.currentTime+.008);v.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+d);o.connect(v).connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+d+.02)}catch(_){}
}
function playImpact(){
 if(!state.sound)return;
 try{impactAudio=impactAudio||new Audio(AUDIO_ROOT+'sfx/combat/impact-heavy-01.mp3');impactAudio.currentTime=0;impactAudio.volume=.2;impactAudio.play().catch(()=>tone(130,.13,.035,'triangle'))}catch(_){tone(130,.13,.035,'triangle')}
}
function playWhoosh(){
 if(!state.sound)return;
 try{whooshAudio=whooshAudio||new Audio(AUDIO_ROOT+'sfx/combat/projectile-whoosh-01.mp3');whooshAudio.currentTime=0;whooshAudio.volume=.16;whooshAudio.play().catch(()=>{})}catch(_){}
}
function evolutionSound(){[220,330,495,660].forEach((f,i)=>setTimeout(()=>tone(f,.15,.035,'triangle'),i*90))}

function initThree(){
 try{
  renderer=new THREE.WebGLRenderer({canvas:$('space'),antialias:!LOW_POWER,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,LOW_POWER?1.2:1.65));renderer.outputColorSpace=THREE.SRGBColorSpace;
  scene=new THREE.Scene();scene.background=new THREE.Color(0x020611);
  camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.1,600);camera.position.set(0,0,12);
  bodyRoot=new THREE.Group();bodyGroup=new THREE.Group();contextGroup=new THREE.Group();fxGroup=new THREE.Group();
  bodyRoot.add(bodyGroup);scene.add(contextGroup,bodyRoot,fxGroup);
  scene.add(new THREE.AmbientLight(0xffffff,.72));const keyLight=new THREE.DirectionalLight(0xddeeff,1.8);keyLight.position.set(5,7,9);scene.add(keyLight);
  makeStarfield();resize();addEventListener('resize',resize);
 }catch(e){console.error(e);ui.error.classList.remove('hidden');throw e}
}
function resize(){
 if(!renderer)return;camera.aspect=innerWidth/Math.max(1,innerHeight);camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false);
}
function makeStarfield(){
 if(starField)scene.remove(starField);
 const count=LOW_POWER?700:1800,arr=new Float32Array(count*3);
 for(let i=0;i<count;i++){arr[i*3]=(Math.random()-.5)*130;arr[i*3+1]=(Math.random()-.5)*85;arr[i*3+2]=-10-Math.random()*140}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(arr,3));
 const m=new THREE.PointsMaterial({color:0xcfe8ff,size:LOW_POWER ? 0.08 : 0.11,transparent:true,opacity:.8,sizeAttenuation:true});
 starField=new THREE.Points(g,m);scene.add(starField);
}
function clearGroup(g){while(g.children.length)g.remove(g.children[g.children.length-1])}
function texture(url){
 return new Promise(resolve=>texLoader.load(url,t=>{t.colorSpace=THREE.SRGBColorSpace;resolve(t)},undefined,()=>resolve(null)));
}
async function preloadAssets(){
 const planets=await Promise.all(Array.from({length:LOW_POWER?6:10},(_,i)=>texture(ROOT+'space/planets/planet'+String(i).padStart(2,'0')+'.png')));
 planetTextures=planets.filter(Boolean);
 const pairs=await Promise.all([
  ['flare',texture(ROOT+'effects/particles/kenney-particle-pack/flare-01.png')],
  ['smoke',texture(ROOT+'effects/particles/kenney-particle-pack/smoke-04.png')],
  ['spark',texture(ROOT+'effects/particles/kenney-particle-pack/spark-03.png')],
  ['star',texture(ROOT+'effects/particles/kenney-particle-pack/star-04.png')],
  ['twirl',texture(ROOT+'effects/particles/kenney-particle-pack/twirl-02.png')]
 ].map(async([k,p])=>[k,await p]));
 pairs.forEach(([k,v])=>fxTextures[k]=v);assetsReady=true;makeStarfieldTextured();if(running)rebuildVisual(true);
}
function makeStarfieldTextured(){
 if(!starField||!fxTextures.star)return;starField.material.map=fxTextures.star;starField.material.alphaTest=.02;starField.material.blending=THREE.AdditiveBlending;starField.material.needsUpdate=true;
}
function loadGLTF(url){
 if(!gltfCache.has(url))gltfCache.set(url,new Promise(resolve=>gltfLoader.load(url,g=>resolve(g),undefined,()=>resolve(null))));
 return gltfCache.get(url);
}
function normalizeClone(gltf,target=2.5){
 if(!gltf)return null;const o=gltf.scene.clone(true);o.updateMatrixWorld(true);let box=new THREE.Box3().setFromObject(o),sz=box.getSize(new THREE.Vector3()),base=Math.max(sz.x,sz.y,sz.z)||1;
 o.scale.multiplyScalar(target/base);o.updateMatrixWorld(true);box=new THREE.Box3().setFromObject(o);const c=box.getCenter(new THREE.Vector3());o.position.sub(c);
 o.traverse(n=>{if(n.isMesh){n.material=n.material.clone();n.material.roughness=.88;n.material.metalness=.05}});
 return o;
}
function materialColorForStage(idx){return [0x9a8b79,0x9d8f7d,0x8a7765,0x6f6258,0x725f54,0x8b604c][Math.min(5,idx)]||0x76665c}
function fallbackRock(target=2.4){
 const g=new THREE.IcosahedronGeometry(target*.5,2),p=g.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),j=.83+Math.random()*.26;p.setXYZ(i,x*j,y*j,z*j)}p.needsUpdate=true;g.computeVertexNormals();
 return new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:materialColorForStage(state.stage),roughness:.94,metalness:.04}));
}
async function replaceWithRock(stageIndex){
 const paths=[
  ROOT+'3d/nature/kenney-nature-kit/rock-small-e.glb',
  ROOT+'3d/nature/kenney-nature-kit/rock-large-c.glb',
  ROOT+'3d/nature/kenney-nature-kit/stone-large-b.glb'
 ];
 const expected=state.stage,gltf=await loadGLTF(paths[stageIndex%paths.length]);if(state.stage!==expected||state.stage<2||state.stage>5||!gltf)return;
 clearGroup(bodyGroup);const o=normalizeClone(gltf,2.8);if(o){o.traverse(n=>{if(n.isMesh&&n.material){n.material.color?.setHex(materialColorForStage(stageIndex));n.material.roughness=.92}});bodyGroup.add(o)}
}
function makeDust(){
 const count=LOW_POWER?90:170,pos=new Float32Array(count*3);
 for(let i=0;i<count;i++){const r=Math.random()*.92+.08,a=Math.random()*Math.PI*2,b=(Math.random()-.5)*Math.PI;pos[i*3]=Math.cos(a)*Math.cos(b)*r;pos[i*3+1]=Math.sin(a)*Math.cos(b)*r;pos[i*3+2]=Math.sin(b)*r*.6}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));
 const m=new THREE.PointsMaterial({color:state.stage?0xcabda6:0xe5d8bc,size:state.stage ? 0.07 : 0.045,transparent:true,opacity:.86,map:fxTextures.star||null,alphaTest:fxTextures.star ? 0.02 : 0,blending:THREE.AdditiveBlending});
 const pts=new THREE.Points(g,m);pts.userData.kind='dust';bodyGroup.add(pts);
}
function glowSprite(color=0xffd477,scale=4,opacity=.7,tex='flare'){
 const mat=new THREE.SpriteMaterial({map:fxTextures[tex]||null,color,transparent:true,opacity,depthWrite:false,blending:THREE.AdditiveBlending});
 const sp=new THREE.Sprite(mat);sp.scale.set(scale,scale,1);return sp;
}
function makePlanet(idx){
 const tex=planetTextures.length?planetTextures[(idx*2+3)%planetTextures.length]:null;
 const core=new THREE.Mesh(new THREE.SphereGeometry(1.22,LOW_POWER?24:48,LOW_POWER?16:32),new THREE.MeshStandardMaterial({color:idx===7?0x8e6d61:0x61738d,roughness:.8,metalness:0}));
 bodyGroup.add(core);
 if(tex){const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false}));sp.scale.set(3.02,3.02,1);sp.position.z=.25;sp.userData.kind='planetSprite';bodyGroup.add(sp)}
 if(idx>=6){const atm=new THREE.Mesh(new THREE.RingGeometry(1.27,1.35,64),new THREE.MeshBasicMaterial({color:idx===7?0xe8b58c:0x8edcff,transparent:true,opacity:.28,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}));atm.position.z=.18;bodyGroup.add(atm)}
 if(idx===7){const ring=new THREE.Mesh(new THREE.RingGeometry(1.55,2.05,96),new THREE.MeshBasicMaterial({color:0xeac58c,transparent:true,opacity:.33,side:THREE.DoubleSide}));ring.rotation.x=1.12;ring.rotation.z=.2;bodyGroup.add(ring)}
}
function makeStar(idx){
 const c=idx===10?0xff754d:0xffd784,r=idx===10?1.55:1.28;
 const core=new THREE.Mesh(new THREE.SphereGeometry(r,LOW_POWER?28:56,LOW_POWER?18:36),new THREE.MeshBasicMaterial({color:c}));
 core.userData.kind='starCore';bodyGroup.add(core);
 const g1=glowSprite(c,idx===10?5.7:4.8,.72);g1.position.z=-.1;bodyGroup.add(g1);
 const g2=glowSprite(idx===10?0xff3f32:0xfff0ba,idx===10?3.7:3.2,.42,'star');g2.position.z=.2;bodyGroup.add(g2);
}
function makeBlackHole(idx){
 const r=idx>=14?1.18:idx===13?1.04:.92;
 const halo=glowSprite(idx>=14?0xffb14c:0xff864f,5.4,.28,'twirl');halo.position.z=-.6;halo.userData.kind='diskSprite';bodyGroup.add(halo);
 for(let i=0;i<3;i++){
  const ring=new THREE.Mesh(new THREE.RingGeometry(r*1.25+i*.18,r*2.3+i*.23,LOW_POWER?64:128),new THREE.MeshBasicMaterial({color:[0xffd080,0xff774e,0xa978ff][i],transparent:true,opacity:.42-i*.08,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false}));
  ring.rotation.x=1.08;ring.rotation.z=.15+i*.04;ring.userData.kind='accretion';ring.userData.speed=.15+i*.08;bodyGroup.add(ring);
 }
 const core=new THREE.Mesh(new THREE.SphereGeometry(r,LOW_POWER?28:56,LOW_POWER?20:40),new THREE.MeshBasicMaterial({color:0x000000}));core.position.z=.22;core.userData.kind='blackCore';bodyGroup.add(core);
 const photon=new THREE.Mesh(new THREE.RingGeometry(r*1.04,r*1.12,96),new THREE.MeshBasicMaterial({color:0xffe3a0,transparent:true,opacity:.8,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}));photon.position.z=.24;bodyGroup.add(photon);
}
function makeOrbitLine(radius,opacity=.12){
 const pts=[];for(let i=0;i<=96;i++){const a=i/96*Math.PI*2;pts.push(new THREE.Vector3(Math.cos(a)*radius,Math.sin(a)*radius*.55,-.4))}
 const g=new THREE.BufferGeometry().setFromPoints(pts),m=new THREE.LineBasicMaterial({color:0xb4d4ff,transparent:true,opacity});return new THREE.Line(g,m);
}
function addMoonContext(count=2){
 for(let i=0;i<count;i++){const r=2.1+i*.65,moon=new THREE.Mesh(new THREE.SphereGeometry(.1+i*.02,14,10),new THREE.MeshStandardMaterial({color:0xbfc6cd,roughness:1}));moon.userData={orbit:true,r,angle:Math.random()*6.28,speed:.28+i*.06,flatten:.62};contextGroup.add(makeOrbitLine(r,.08),moon)}
}
function addPlanetSystem(count=5){
 for(let i=0;i<count;i++){const r=2.3+i*.72;contextGroup.add(makeOrbitLine(r,.09));let o;
  const tex=planetTextures.length?planetTextures[(i*2+state.stage)%planetTextures.length]:null;
  if(tex){o=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false}));const s=.24+i*.035;o.scale.set(s,s,1)}
  else o=new THREE.Mesh(new THREE.SphereGeometry(.11,12,8),new THREE.MeshBasicMaterial({color:new THREE.Color().setHSL(i/count,.55,.55)}));
  o.userData={orbit:true,r,angle:Math.random()*6.28,speed:.12/(1+i*.22),flatten:.55};contextGroup.add(o)
 }}
function addCluster(count){
 const pos=new Float32Array(count*3);for(let i=0;i<count;i++){const a=Math.random()*6.28,r=2.4+Math.pow(Math.random(),.6)*8.5;pos[i*3]=Math.cos(a)*r;pos[i*3+1]=Math.sin(a)*r*.62;pos[i*3+2]=-1-Math.random()*5}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));const m=new THREE.PointsMaterial({color:0xddeaff,size:LOW_POWER ? 0.035 : 0.055,map:fxTextures.star||null,transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false});
 const p=new THREE.Points(g,m);p.userData.kind='cluster';contextGroup.add(p)
}
function addGalaxy(count){
 const pos=new Float32Array(count*3),col=new Float32Array(count*3),c=new THREE.Color();
 for(let i=0;i<count;i++){const arm=i%3,rad=.3+Math.pow(Math.random(),.58)*9.5,ang=arm*2.094+rad*.63+(Math.random()-.5)*.55;pos[i*3]=Math.cos(ang)*rad;pos[i*3+1]=Math.sin(ang)*rad*.52;pos[i*3+2]=-2+(Math.random()-.5)*1.1;c.setHSL(.56+Math.random()*.13,.45,.68+Math.random()*.25);col[i*3]=c.r;col[i*3+1]=c.g;col[i*3+2]=c.b}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('color',new THREE.BufferAttribute(col,3));
 const m=new THREE.PointsMaterial({vertexColors:true,size:LOW_POWER ? 0.035 : 0.055,map:fxTextures.star||null,transparent:true,opacity:.86,blending:THREE.AdditiveBlending,depthWrite:false});
 galaxyGroup=new THREE.Points(g,m);galaxyGroup.userData.kind='galaxy';contextGroup.add(galaxyGroup)
}
function addQuasarJets(){
 const mat=new THREE.MeshBasicMaterial({color:0x8bdcff,transparent:true,opacity:.16,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
 const g=new THREE.ConeGeometry(.55,8,24,1,true);const a=new THREE.Mesh(g,mat),b=new THREE.Mesh(g,mat.clone());a.position.y=4;b.position.y=-4;b.rotation.z=Math.PI;a.position.z=b.position.z=-.8;contextGroup.add(a,b)
}
function rebuildContext(){
 clearGroup(contextGroup);galaxyGroup=null;
 const i=state.stage;
 if(i>=6&&i<=8)addMoonContext(i===7?5:2);
 if(i>=9&&i<=10)addPlanetSystem(LOW_POWER?4:6);
 if(i===11)addCluster(LOW_POWER?120:280);
 if(i===12)addCluster(LOW_POWER?170:420);
 if(i===13)addCluster(LOW_POWER?320:900);
 if(i>=14){addGalaxy(LOW_POWER?900:2600);if(i>=15)addQuasarJets()}
}
function rebuildVisual(noZoom=false){
 clearGroup(bodyGroup);const i=state.stage;
 if(i<=1)makeDust();
 else if(i<=5){bodyGroup.add(fallbackRock(i<4?2.2:2.65));replaceWithRock(i)}
 else if(i<=8)makePlanet(i);
 else if(i<=10)makeStar(i);
 else if(i===11){makeStar(10);spawnSupernovaBurst(true)}
 else makeBlackHole(i);
 rebuildContext();
 if(!noZoom)startZoomTransition();
}
let cameraTween=0;
function startZoomTransition(){cameraTween=1;playWhoosh()}
function spawnSpriteFx(texKey,color,x,y,scale,life=1){
 const sp=glowSprite(color,scale,.72,texKey);sp.position.set(x,y,.4);fxGroup.add(sp);activeFx.push({obj:sp,life,max:life,kind:'fade'});return sp
}
function spawnSupernovaBurst(big=false){
 const n=LOW_POWER?(big?45:18):(big?90:30);
 for(let i=0;i<n;i++){const a=Math.random()*6.28,s=.6+Math.random()*2.4,sp=spawnSpriteFx(i%3===0?'smoke':i%3===1?'spark':'star',[0xffd38a,0xff765c,0xbda0ff][i%3],0,0,.4+Math.random()*.8,1.8+Math.random());sp.userData.vx=Math.cos(a)*s;sp.userData.vy=Math.sin(a)*s;activeFx[activeFx.length-1].kind='burst'}
 if(big){playImpact();lensPulse=1.2}
}
function spawnTapMatter(clientX,clientY){
 const rect=renderer.domElement.getBoundingClientRect(),nx=(clientX-rect.left)/rect.width*2-1,ny=-((clientY-rect.top)/rect.height*2-1),v=new THREE.Vector3(nx,ny,.4).unproject(camera),dir=v.sub(camera.position).normalize(),dist=(0-camera.position.z)/dir.z,p=camera.position.clone().add(dir.multiplyScalar(dist));
 const count=LOW_POWER?2:4;
 for(let i=0;i<count;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(.035+Math.random()*.025,8,6),new THREE.MeshBasicMaterial({color:state.stage>=9?0xffd78a:state.stage>=12?0xff9a62:0xc9d8e8,transparent:true,opacity:.9}));m.position.copy(p).add(new THREE.Vector3((Math.random()-.5)*.7,(Math.random()-.5)*.7,.2));fxGroup.add(m);activeFx.push({obj:m,life:.65,max:.65,kind:'suck'})}
}
function triggerEventVisual(d){
 const kind=d.event||'pulse';
 if(kind==='impact'){spawnSupernovaBurst(false);bodyRoot.rotation.z+=(Math.random()-.5)*.15}
 else if(kind==='flare'){const sp=spawnSpriteFx('flare',0xff7a4f,1.1,.5,2.4,1.4);sp.userData.grow=1}
 else if(kind==='spark'){for(let i=0;i<8;i++)spawnSpriteFx('spark',0xb8e8ff,(Math.random()-.5)*3,(Math.random()-.5)*2,.35+Math.random()*.35,.8)}
 else if(kind==='ring'){const ring=new THREE.Mesh(new THREE.RingGeometry(1.6,2.25,96),new THREE.MeshBasicMaterial({color:0xf1d399,transparent:true,opacity:.5,side:THREE.DoubleSide}));ring.rotation.x=1.12;fxGroup.add(ring);activeFx.push({obj:ring,life:3,max:3,kind:'fade'})}
 else if(kind==='aurora'){const ring=new THREE.Mesh(new THREE.TorusGeometry(1.45,.07,10,80),new THREE.MeshBasicMaterial({color:0x67ffc7,transparent:true,opacity:.6,blending:THREE.AdditiveBlending}));ring.scale.y=.58;fxGroup.add(ring);activeFx.push({obj:ring,life:2.5,max:2.5,kind:'fade'})}
 else if(kind==='lens'){lensPulse=2.4;spawnSpriteFx('twirl',0xffd49a,0,0,6.5,2.4)}
 else if(kind==='tidal'){for(let i=0;i<24;i++){const sp=spawnSpriteFx('star',0xffe3b7,4+Math.random()*2,(Math.random()-.5)*.6,.18+Math.random()*.16,2);sp.userData.target=true;activeFx[activeFx.length-1].kind='tidal'}}
 else if(kind==='merge'){const m=new THREE.Mesh(new THREE.SphereGeometry(.42,24,16),new THREE.MeshBasicMaterial({color:0x000000}));m.position.set(5,1.8,.4);fxGroup.add(m);activeFx.push({obj:m,life:3,max:3,kind:'merge'});lensPulse=1.5}
 else if(kind==='wave'){const ring=new THREE.Mesh(new THREE.RingGeometry(.8,.86,96),new THREE.MeshBasicMaterial({color:0x9cdbff,transparent:true,opacity:.7,side:THREE.DoubleSide}));fxGroup.add(ring);activeFx.push({obj:ring,life:2.2,max:2.2,kind:'wave'})}
 else if(kind==='pulsar'){for(const a of [0,Math.PI]){const beam=new THREE.Mesh(new THREE.ConeGeometry(.18,8,18,1,true),new THREE.MeshBasicMaterial({color:0x9fe6ff,transparent:true,opacity:.35,blending:THREE.AdditiveBlending,side:THREE.DoubleSide}));beam.rotation.z=a-Math.PI/2;beam.position.x=Math.cos(a)*4;beam.position.y=Math.sin(a)*4;fxGroup.add(beam);activeFx.push({obj:beam,life:2,max:2,kind:'fade'})}}
 else if(kind==='jet'){for(let i=0;i<18;i++){const a=i%2?1:-1,sp=spawnSpriteFx('star',0x9de9ff,(Math.random()-.5)*.35,a*(1+Math.random()*5),.18+Math.random()*.25,1.8);sp.userData.vy=a*(1.2+Math.random()*2);activeFx[activeFx.length-1].kind='burst'}}
 else if(kind==='moon'||kind==='orbit'){const m=new THREE.Mesh(new THREE.SphereGeometry(.15,14,10),new THREE.MeshStandardMaterial({color:0xc4c9d0,roughness:1}));m.userData={orbit:true,r:2.4,angle:0,speed:1.2,flatten:.62};fxGroup.add(m);activeFx.push({obj:m,life:3,max:3,kind:'orbit'})}
 else if(kind==='disk'){spawnSpriteFx('twirl',0xffa45c,0,0,6.5,2.5)}
 else if(kind==='atmosphere'){spawnSpriteFx('smoke',0x85d7ff,0,0,4.2,2)}
 else {const sp=spawnSpriteFx('flare',0x9fe8ff,0,0,3.4,1.4);sp.userData.grow=1}
}
function updateFx(dt){
 for(let i=activeFx.length-1;i>=0;i--){const f=activeFx[i],o=f.obj;f.life-=dt;
  if(f.kind==='suck'){o.position.multiplyScalar(Math.pow(.04,dt));o.scale.multiplyScalar(.98)}
  else if(f.kind==='burst'){o.position.x+=(o.userData.vx||0)*dt;o.position.y+=(o.userData.vy||0)*dt;o.scale.multiplyScalar(1+dt*.3)}
  else if(f.kind==='tidal'){o.position.x-=dt*2.3;o.position.y*=Math.pow(.25,dt);o.scale.x*=1+dt*2}
  else if(f.kind==='merge'){o.position.x-=dt*1.65;o.position.y-=dt*.6}
  else if(f.kind==='wave'){const s=1+(f.max-f.life)*3;o.scale.setScalar(s)}
  else if(f.kind==='orbit'){o.userData.angle+=dt*o.userData.speed;o.position.set(Math.cos(o.userData.angle)*o.userData.r,Math.sin(o.userData.angle)*o.userData.r*o.userData.flatten,.3)}
  if(o.material&&'opacity'in o.material)o.material.opacity=Math.max(0,(f.life/f.max)*.75);
  if(o.userData.grow)o.scale.multiplyScalar(1+dt*1.8);
  if(f.life<=0){fxGroup.remove(o);activeFx.splice(i,1)}
 }
}
function updateScene(dt){
 if(starField){starField.rotation.z+=dt*.002;if(lensPulse>0){lensPulse=Math.max(0,lensPulse-dt);starField.scale.setScalar(1+Math.sin(lensPulse*8)*.018)}else starField.scale.setScalar(1)}
 bodyRoot.rotation.z+=dt*(state.stage<=5 ? 0.08 : 0.018);tapPulse=Math.max(0,tapPulse-dt*3.4);const pulse=1+tapPulse*.075;bodyRoot.scale.setScalar(pulse);
 for(const o of bodyGroup.children){if(o.userData.kind==='planetSprite')o.material.rotation=(o.material.rotation||0)+dt*.035;if(o.userData.kind==='diskSprite')o.material.rotation=(o.material.rotation||0)+dt*.14;if(o.userData.kind==='accretion')o.rotation.z+=dt*o.userData.speed;if(o.userData.kind==='starCore'){const s=1+Math.sin(performance.now()*.003)*.02;o.scale.setScalar(s)}}
 for(const o of contextGroup.children)if(o.userData?.orbit){o.userData.angle+=dt*o.userData.speed;o.position.set(Math.cos(o.userData.angle)*o.userData.r,Math.sin(o.userData.angle)*o.userData.r*o.userData.flatten,-.1)}
 if(galaxyGroup)galaxyGroup.rotation.z+=dt*.006;
 if(cameraTween>0){cameraTween=Math.max(0,cameraTween-dt*.6);camera.position.z=12+Math.sin((1-cameraTween)*Math.PI)*5.5}else camera.position.z+=(12-camera.position.z)*dt*4;
 updateFx(dt);
}
function discover(id,show=false){
 const d=DISCOVERIES.find(x=>x.id===id);if(!d)return false;
 const isNew=!state.discovered[id];if(isNew){state.discovered[id]=Date.now();state.insight+=1;toast('🔭 도감 발견 · '+d.title);renderUpgrades();checkAchievements();save()}
 if(show)openScience(d,isNew);
 return isNew;
}
function openScience(d,isNew=false){
 modalOpen=true;ui.scienceIcon.textContent=d.icon;ui.scienceCategory.textContent=d.cat==='body'?'천체 도감':d.cat==='scale'?'크기 비교':'우주 현상';
 ui.scienceTitle.textContent=d.title;ui.scienceText.textContent=d.text;ui.scienceBonus.textContent=isNew?'🔬 과학 포인트 +1':'이미 발견한 항목';ui.science.classList.remove('hidden');
}
function closeScience(){ui.science.classList.add('hidden');modalOpen=false;scheduleEvent(5000)}
function showEvolution(s){
 clearTimeout(evoTimer);ui.evoKicker.textContent=s.id.includes('black_hole')?'BLACK HOLE ERA':s.id==='supernova'?'STELLAR DEATH':'새로운 단계';
 ui.evoTitle.textContent=s.name;ui.evoFact.textContent=s.fact;ui.evo.classList.remove('hidden');evoTimer=setTimeout(()=>ui.evo.classList.add('hidden'),1950);
 evolutionSound();
}
function advanceStage(){
 if(state.stage>=STAGES.length-1)return;
 const prev=stage(),carry=Math.max(0,state.progress-prev.need);state.stage++;state.progress=carry;autoAdvanceClock=0;
 const s=stage();s.discover.forEach(id=>discover(id,false));reportMilestone('cosmic_stage_'+s.id,{stage:s.id,index:state.stage});
 if(state.stage===12){state.blackHoleEra=true;reportAchievement('black_hole',{stage:s.id})}
 showEvolution(s);rebuildVisual(false);renderUpgrades();checkAchievements();save();scheduleEvent(6500);
}
function addGrowth(amount){
 if(!running||paused||modalOpen)return;
 const s=stage();if(s.auto)return;
 state.progress+=amount;
 if(state.stage<STAGES.length-1&&state.progress>=s.need)advanceStage();
}
function onTap(e){
 if(!running||paused||modalOpen)return;ensureAudio();
 const s=stage();
 if(s.auto){spawnSupernovaBurst(false);tone(180+Math.random()*80,.08,.022,'triangle');return}
 const power=tapPower();state.taps++;addGrowth(power);tapPulse=1;spawnTapMatter(e.clientX,e.clientY);floatGain(e.clientX,e.clientY,power);tone(260+Math.min(520,state.stage*27)+Math.random()*35,.045,.018,'sine');
 if(state.taps===1)ui.hint.classList.add('dim');
 if(state.taps%25===0)playWhoosh();
}
function renderUpgrades(){
 ui.upgrades.innerHTML='';
 const visible=UPGRADES.filter(u=>u.min<=state.stage+1).slice(-6);
 for(const u of visible){const bought=!!state.upgrades[u.id],locked=u.min>state.stage,b=document.createElement('button');b.type='button';b.className='upgrade'+(bought?' bought':'')+(locked?' locked':'');
  b.innerHTML='<div class="uTop"><span class="uIcon">'+u.icon+'</span><span class="uName">'+u.name+'</span><span class="cost">'+(bought?'완료':locked?'잠김':'🔬 '+u.cost)+'</span></div><p>'+(locked?STAGES[u.min].name+' 단계에서 해금':u.desc)+'</p>';
  if(!bought&&!locked)b.onclick=()=>buyUpgrade(u);ui.upgrades.appendChild(b)
 }
}
function buyUpgrade(u){
 if(state.upgrades[u.id])return;if(state.insight<u.cost){toast('🔬 과학 포인트가 '+(u.cost-state.insight)+' 더 필요해요');tone(150,.12,.025,'triangle');return}
 state.insight-=u.cost;state.upgrades[u.id]=true;tone(520,.08,.03,'triangle');setTimeout(()=>tone(780,.12,.025,'triangle'),70);toast(u.name+' 강화 완료');renderUpgrades();save()
}
function renderUI(){
 const s=stage(),r=progressRatio(),disc=Object.keys(state.discovered).length;
 ui.stage.textContent=s.name;ui.era.textContent=state.stage>=12?'BLACK HOLE ERA':state.stage>=9?'STELLAR ERA':state.stage>=6?'PLANET ERA':'ACCRETION ERA';
 ui.scale.textContent=s.scale;ui.mass.textContent=formatMass(massNow());ui.fill.style.width=(r*100).toFixed(1)+'%';
 ui.next.textContent=state.stage===STAGES.length-1?'관측 가능한 끝 너머로 계속 성장 중':s.auto?'핵붕괴 진행 중 · '+Math.round(r*100)+'%':STAGES[state.stage+1].name+'까지 '+Math.round(r*100)+'%';
 ui.insight.textContent=state.insight;ui.rate.textContent='자동 +'+autoRate().toFixed(autoRate()<10?1:0)+'/s';ui.discCount.textContent=disc;ui.discTotal.textContent=DISCOVERIES.length;ui.codexProgress.textContent=disc+' / '+DISCOVERIES.length;
}
function scheduleEvent(delay){
 eventNextAt=performance.now()+(delay??(15000+Math.random()*12000));eventExpiresAt=0;currentEvent=null;ui.event.classList.add('hidden')
}
function maybeStartEvent(now){
 if(!running||paused||modalOpen||currentEvent||now<eventNextAt)return;
 const candidates=DISCOVERIES.filter(d=>d.event&&d.min<=state.stage&&!state.discovered[d.id]);
 const pool=candidates.length?candidates:DISCOVERIES.filter(d=>d.event&&d.min<=state.stage);
 if(!pool.length){scheduleEvent();return}
 currentEvent=pool[Math.floor(Math.random()*pool.length)];eventExpiresAt=now+9000;ui.eventIcon.textContent=currentEvent.icon;ui.eventLabel.textContent=currentEvent.title;ui.event.classList.remove('hidden');triggerEventVisual(currentEvent);eventSeenAt=now;
}
function updateEvent(now){
 if(!currentEvent)return;const left=(eventExpiresAt-now)/9000;ui.eventTimer.style.transform='scaleX('+clamp(left,0,1)+')';
 if(now>=eventExpiresAt){ui.event.classList.add('hidden');currentEvent=null;scheduleEvent(9000+Math.random()*10000)}
}
function observeEvent(){
 if(!currentEvent)return;const d=currentEvent;ui.event.classList.add('hidden');currentEvent=null;const fresh=discover(d.id,true);
 if(!fresh){state.progress+=Math.max(2,tapPower()*3);toast('이미 아는 현상 · 성장 보너스 +'+Math.max(2,tapPower()*3).toFixed(0))}
 scheduleEvent(12000+Math.random()*9000)
}
function renderCodex(tab='all'){
 ui.codexGrid.innerHTML='';const items=DISCOVERIES.filter(d=>tab==='all'||d.cat===tab);
 for(const d of items){const unlocked=!!state.discovered[d.id],el=document.createElement('button');el.type='button';el.className='codexItem'+(unlocked?'':' locked');el.innerHTML='<span class="cIcon">'+(unlocked?d.icon:'?')+'</span><b>'+(unlocked?d.title:'아직 발견하지 못함')+'</b><p>'+(unlocked?d.text:'우주에서 직접 관측하면 열립니다.')+'</p>';if(unlocked)el.onclick=()=>{ui.codex.classList.add('hidden');openScience(d,false)};ui.codexGrid.appendChild(el)}
}
function openCodex(){modalOpen=true;renderCodex(document.querySelector('.tabs button.active')?.dataset.tab||'all');ui.codex.classList.remove('hidden')}
function closeCodex(){ui.codex.classList.add('hidden');modalOpen=false}
function startGame(kind){
 if(kind==='new'){state=freshState();clearSave();discover('cosmic_dust',false);discover('micro_scale',false)}
 else if(!load()){state=freshState();discover('cosmic_dust',false);discover('micro_scale',false)}
 running=true;paused=false;modalOpen=false;checkAchievements();$('soundBtn').textContent=state.sound?'🔊':'🔇';ui.intro.classList.add('hidden');ui.pause.classList.add('hidden');rebuildVisual(true);renderUpgrades();renderUI();scheduleEvent(10000);
 try{window.KidscadeGame?.start?.({mode:'cosmic_growth'})}catch(_){}
 ensureAudio();save()
}
function pauseGame(){if(!running)return;paused=true;modalOpen=true;ui.pause.classList.remove('hidden');save()}
function resumeGame(){paused=false;modalOpen=false;ui.pause.classList.add('hidden');last=performance.now()}
function restartGame(){clearSave();state=freshState();ui.pause.classList.add('hidden');ui.intro.classList.remove('hidden');modalOpen=true;running=false;ui.continueBtn.classList.add('hidden');rebuildVisual(true);renderUI()}
function animate(now){
 requestAnimationFrame(animate);const dt=Math.min(.06,(now-last)/1000);last=now;
 if(running&&!paused&&!modalOpen){
  const s=stage();
  if(s.auto){autoAdvanceClock+=dt;state.progress=clamp(autoAdvanceClock/4.8*s.need,0,s.need);if(autoAdvanceClock>=4.8)advanceStage()}
  else{const a=autoRate();if(a>0)addGrowth(a*dt)}
  saveClock+=dt;if(saveClock>=6){saveClock=0;save()}
  maybeStartEvent(now);updateEvent(now)
 }
 updateScene(dt);uiClock+=dt;if(uiClock>.09){uiClock=0;renderUI()}
 renderer.render(scene,camera)
}

$('tapLayer').addEventListener('pointerdown',onTap);
addEventListener('keydown',e=>{if(e.code==='Space'&&running&&!modalOpen){e.preventDefault();onTap({clientX:innerWidth/2,clientY:innerHeight/2})}});
$('eventPill').addEventListener('click',observeEvent);
$('codexBtn').addEventListener('click',openCodex);$('quickCodex').addEventListener('click',openCodex);
document.querySelectorAll('[data-close="codex"]').forEach(b=>b.addEventListener('click',closeCodex));
document.querySelectorAll('[data-close="scienceModal"]').forEach(b=>b.addEventListener('click',closeScience));
$('scienceClose').addEventListener('click',closeScience);
document.querySelectorAll('.tabs button').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('active',x===b));renderCodex(b.dataset.tab)}));
$('newBtn').addEventListener('click',()=>startGame('new'));$('continueBtn').addEventListener('click',()=>startGame('continue'));
$('pauseBtn').addEventListener('click',pauseGame);$('resumeBtn').addEventListener('click',resumeGame);$('restartBtn').addEventListener('click',restartGame);
$('soundBtn').addEventListener('click',()=>{state.sound=!state.sound;$('soundBtn').textContent=state.sound?'🔊':'🔇';if(state.sound){ensureAudio();tone(600,.08,.025,'triangle')}save()});
document.addEventListener('visibilitychange',()=>{if(document.hidden)save()});addEventListener('beforeunload',save);

initThree();preloadAssets();ui.discTotal.textContent=DISCOVERIES.length;ui.continueBtn.classList.toggle('hidden',!hasSave());renderUI();renderUpgrades();requestAnimationFrame(animate);

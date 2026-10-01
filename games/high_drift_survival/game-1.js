'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const SAVE='kidscade_drift_v2_save', ENDINGS_KEY='kidscade_drift_endings_v2';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const round1=v=>Math.round(v*10)/10;
const ITEM={wood:['🪵','나무'],stone:['🪨','돌'],vine:['🪢','덩굴'],metal:['⚙️','금속'],cloth:['🧣','천'],battery:['🔋','건전지'],seed:['🌱','씨앗'],fish:['🐟','생선'],produce:['🥬','수확물'],rope:['🧵','밧줄']};
const PLACE={
 beach:{icon:'🏝️',name:'자갈 해변',desc:'부서진 배의 흔적과 떠밀려온 물건이 보인다. 젖은 선보다 높은 곳을 기억하자.',xy:[20,72]},
 camp:{icon:'⛺',name:'야영지',desc:'섬 생활의 중심. 쉬고, 먹고, 도구를 만들고, 밤을 준비하는 곳이다.',xy:[35,62]},
 forest:{icon:'🌲',name:'곰솔 숲',desc:'마른 가지와 덩굴을 얻을 수 있다. 무엇을 가져갈지 선택하는 것도 생존이다.',xy:[42,42]},
 stream:{icon:'💧',name:'작은 계곡',desc:'돌 사이로 물이 흐른다. 눈으로 맑아 보여도 바로 마시면 안 된다.',xy:[53,29]},
 cove:{icon:'🎣',name:'바위 만',desc:'물고기가 모이는 잔잔한 만. 강풍이 불면 접근하지 않는 편이 안전하다.',xy:[64,71]},
 cliff:{icon:'🧗',name:'바람 절벽',desc:'섬의 높은 지대. 밧줄이 있어야 안전하게 오를 수 있고 먼 바다를 볼 수 있다.',xy:[72,37]},
 lighthouse:{icon:'🔦',name:'등대 언덕',desc:'낡은 등대와 녹슨 장치가 남아 있다. 고칠 수만 있다면 최고의 구조 신호다.',xy:[80,19]}
};
const LINKS={beach:['camp','cove'],camp:['beach','forest'],forest:['camp','stream','cliff'],stream:['forest'],cove:['beach'],cliff:['forest','lighthouse'],lighthouse:['cliff']};
const WEATHER=[
 {n:'맑음',i:'☀️',fat:1,water:1},{n:'구름',i:'⛅',fat:.9,water:.95},{n:'비',i:'🌧️',fat:1.05,water:.85},{n:'맑음',i:'🌤️',fat:1,water:1},{n:'강풍',i:'💨',fat:1.2,water:1},{n:'비',i:'🌦️',fat:1.05,water:.9},{n:'폭염',i:'🔥',fat:1.2,water:1.25}
];
const ENDINGS={
 radio:['📻','전파를 탄 목소리','무전기에서 사람의 목소리가 들렸다. 위치를 정확히 알린 덕분에 구조대가 섬을 찾았다.','신호는 우연이 아니라 준비된 연결에서 시작되었다.'],
 lighthouse:['🔦','다시 켜진 등대','긴 어둠 끝에 등대의 빛이 바다를 훑었다. 지나가던 배가 반복되는 빛을 발견했다.','고친 지식이 가장 멀리 닿는 신호가 되었다.'],
 boat:['⛵','스스로 연 항로','날씨와 물때를 확인하고 물과 식량을 실은 뒤 수리한 어선으로 안전한 항구에 닿았다.','용기는 위험을 하나씩 줄여가는 준비에서 나온다.'],
 farmer:['🌱','섬의 작은 농부','빗물을 모으고 배수를 살피며 작은 밭을 일궜다. 섬에 먹을 것이 자라기 시작했다.','자연의 속도에 맞추는 것이 오래 사는 방법이었다.'],
 fisher:['🎣','파도를 읽는 어부','물때와 바람을 기록하고 필요한 만큼만 잡았다. 바위 만은 오래도록 먹을 것을 내어주었다.','오늘뿐 아니라 내일의 바다까지 생각했다.'],
 gatherer:['🌿','숲의 지혜를 얻은 사람','가져갈 것과 남겨둘 것을 구별하며 섬의 계절을 기록했다.','발견은 모두 가지는 일이 아니다.'],
 keeper:['🏮','섬의 등대지기','등대를 고치고 빗물과 식량을 안정적으로 마련했다. 밤마다 켜지는 빛은 다른 배의 길도 비췄다.','살아남기 위한 불빛이 다른 사람의 안전을 지켰다.'],
 village:['🏡','우리들의 작은 마을','거처와 밭, 건조대와 물 저장통이 이어졌다. 텅 빈 해변은 순환하는 생활터가 되었다.','많이 가지는 것보다 오래 이어지는 것이 중요했다.'],
 researcher:['🔬','무인도 생태 연구소','물때와 식물, 날씨와 생물의 흔적을 기록했다. 훗날 이곳은 작은 생태 연구소가 되었다.','섬에서 배운 질문들이 새로운 탐험의 시작이었다.'],
 survivor:['🧭','무사히 버틴 생존자','완벽한 시설은 없었지만 자원을 나누고 위험을 피하며 긴 시간을 버텼다. 정기 수색선이 흔적을 발견했다.','멈추어 관찰하고 다시 판단하는 힘이 마지막 도구였다.']
};
const KNOW={water:false,tide:false,forest:false,fish:false,circuit:false,farm:false,weather:false,signal:false};
let state=null, selectedDiff='normal', fishTimer=null, fishPos=0, fishDir=1;

function fresh(diff){
 const cfg={easy:{water:5,food:5,fatigue:4,hp:100,drain:.8},normal:{water:3.5,food:4,fatigue:10,hp:100,drain:1},hard:{water:2.5,food:3,fatigue:18,hp:92,drain:1.2}}[diff];
 return {version:2,difficulty:diff,drain:cfg.drain,day:1,time:8,hp:cfg.hp,water:cfg.water,food:cfg.food,fatigue:cfg.fatigue,rescue:0,eco:86,place:'beach',
 inv:{wood:1,stone:1,vine:0,metal:0,cloth:1,battery:0,seed:1,fish:0,produce:0,rope:0},
 unlocked:{beach:true,camp:true,forest:true,stream:false,cove:false,cliff:false,lighthouse:false},
 built:{shelter:0,fire:false,rain:false,field:false,drying:false,storage:false,sos:false},tools:{rod:false,radio:false,lighthouse:false,boat:false,mirror:false},
 skills:{gather:0,fish:0,farm:0,repair:0},knowledge:{...KNOW},farmStage:0,farmCare:0,daysSurvived:0,scouted:{beach:0,forest:0,cliff:0},
 wreck:false,logs:[{d:1,t:8,msg:'폭풍 뒤, 자갈 해변에서 눈을 떴다. 우선 물과 밤을 버틸 곳이 필요하다.'}],ended:false};
}
function weather(){return WEATHER[(state.day-1)%WEATHER.length]}
function fmtTime(t){const h=Math.floor(t)%24,m=Math.round((t-Math.floor(t))*60);return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`}
function log(msg){state.logs.unshift({d:state.day,t:state.time,msg});state.logs=state.logs.slice(0,60)}
function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>el.classList.remove('show'),1800)}
function save(silent=false){try{localStorage.setItem(SAVE,JSON.stringify(state));if(!silent)toast('생존 기록을 저장했어요.') }catch(e){if(!silent)toast('저장할 수 없어요.') }}
function load(){try{const s=JSON.parse(localStorage.getItem(SAVE)||'null');return s&&s.version===2?s:null}catch{return null}}
function endingList(){try{return JSON.parse(localStorage.getItem(ENDINGS_KEY)||'[]')}catch{return[]}}
function saveEnding(id){const list=endingList();if(!list.includes(id)){list.push(id);localStorage.setItem(ENDINGS_KEY,JSON.stringify(list))}}
function addItem(k,n){state.inv[k]=(state.inv[k]||0)+n}
function has(cost){return Object.entries(cost||{}).every(([k,v])=>(k==='water'?state.water:k==='food'?state.food:state.inv[k]||0)>=v)}
function pay(cost){for(const [k,v] of Object.entries(cost||{})){if(k==='water')state.water-=v;else if(k==='food')state.food-=v;else state.inv[k]-=v}}
function dayDrain(){
 const w=weather(), d=state.drain;
 state.water=round1(state.water-1.25*d*w.water);state.food=round1(state.food-1*d);state.fatigue=clamp(state.fatigue+(state.built.shelter?4:11)*d,0,100);state.daysSurvived++;
 if(w.n.includes('비')&&state.built.rain){state.water=round1(state.water+2);log('빗물 저장통에 물이 모였다. +물 2')}
 if(state.built.field&&state.farmCare>0){state.farmStage++;state.farmCare=Math.max(0,state.farmCare-1);if(state.farmStage>=3){addItem('produce',2);state.food=round1(state.food+1);state.farmStage=0;log('밭에서 수확물을 거뒀다. +수확물 2, +식량 1')}}
 if(state.water<=0){state.hp-=24;log('물을 확보하지 못해 탈수 증상이 심해졌다.')} else if(state.water<1){state.hp-=9;}
 if(state.food<=0){state.hp-=15;log('먹을 것이 부족해 체력이 떨어졌다.')} else if(state.food<1){state.hp-=6;}
 if(state.fatigue>=90)state.hp-=8;
 if(state.day===3){state.unlocked.cove=true;log('썰물이 빠지며 동쪽 바위 만으로 가는 길이 드러났다.')}
 if(state.day===4){state.inv.battery++;state.inv.metal++;log('밀려온 상자에서 건전지와 금속 부품을 찾았다.')}
 if(state.day===7){log('멀리서 큰 배의 기적 소리가 들렸다. 신호를 준비했다면 기회가 올 수 있다.')}
 if(state.day>=12&&state.hp>0&&!state.ended) finish('survivor');
}
function advance(hours,fat=0){
 if(state.ended)return;
 const oldDay=state.day; state.time+=hours; state.fatigue=clamp(state.fatigue+fat*state.drain*weather().fat,0,100);
 while(state.time>=24){state.time-=24;state.day++;dayDrain()}
 if(oldDay!==state.day)log(`${state.day}일째 아침. ${weather().i} ${weather().n} 날씨다.`);
 if(state.fatigue>=100){state.hp-=12;state.fatigue=86;log('무리한 활동으로 쓰러져 잠시 쉬었다.')}
 state.hp=clamp(state.hp,0,100); state.water=Math.max(0,state.water);state.food=Math.max(0,state.food);
 if(state.hp<=0) gameOver();
 save(true);
}

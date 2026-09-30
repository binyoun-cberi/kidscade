(() => {
'use strict';
const DATA=window.CodeQuestData;
const RuntimeAPI=window.CodeQuestRuntime;
if(!DATA||!RuntimeAPI)throw new Error('Code Quest data/runtime missing');
const $=id=>document.getElementById(id);
const canvas=$('world'),ctx=canvas.getContext('2d');
const missions=DATA.missions||[],B=DATA.blocks;
const SAVE_KEY='kidscade_game_v1:high_code_quest:topdown_v1';
const TILE=56,GRID_W=20,GRID_H=13;
const DIRS={up:{x:0,y:-1,a:-Math.PI/2},right:{x:1,y:0,a:0},down:{x:0,y:1,a:Math.PI/2},left:{x:-1,y:0,a:Math.PI}};
const DIR_ORDER=['up','right','down','left'];
const GROUPS={move:'이동',combat:'전투',sensor:'센서',flow:'반복',skill:'기술',resource:'장치'};

Object.assign(B,{
 MOVE_UP:{label:'위로 이동',icon:'↑',kind:'action',concept:'이동'},
 MOVE_RIGHT:{label:'오른쪽 이동',icon:'→',kind:'action',concept:'이동'},
 MOVE_DOWN:{label:'아래로 이동',icon:'↓',kind:'action',concept:'이동'},
 MOVE_LEFT:{label:'왼쪽 이동',icon:'←',kind:'action',concept:'이동'},
 DASH:{label:'대시',icon:'»',kind:'action',concept:'이동'},
 SLASH:{label:'디버그 검격',icon:'⚔',kind:'action',concept:'전투'},
 SPIN:{label:'회전 베기',icon:'⟳',kind:'action',concept:'범위 공격'},
 BOLT:{label:'코드 볼트',icon:'✦',kind:'action',concept:'원거리 공격'},
 GUARD:{label:'가드',icon:'◇',kind:'action',concept:'방어'},
 DODGE:{label:'회피',icon:'↯',kind:'action',concept:'방어'},
 WAIT:{label:'한 턴 기다리기',icon:'…',kind:'action',concept:'타이밍'},
 HEAL:{label:'회복 패치',icon:'♥',kind:'action',concept:'변수'},
 IF_ENEMY:{label:'적이 가까이 있다면',icon:'?',kind:'condition',condition:'enemyNear',concept:'조건'},
 IF_LINE:{label:'직선에 적이 있다면',icon:'⌖',kind:'condition',condition:'enemyLine',concept:'센서'},
 IF_PROJECTILE:{label:'탄환이 날아오면',icon:'!',kind:'condition',condition:'projectileThreat',concept:'센서'},
 IF_WINDUP:{label:'적이 기술 준비 중이면',icon:'!',kind:'condition',condition:'enemyCast',concept:'상태·조건'},
 IF_WALL:{label:'앞이 막혀 있다면',icon:'▧',kind:'condition',condition:'wallAhead',concept:'조건'},
 IF_HP_LOW:{label:'HP가 3 이하라면',icon:'♥',kind:'condition',condition:'hpLow',concept:'변수·조건'},
 IF_DATA:{label:'여기에 데이터가 있다면',icon:'◆',kind:'condition',condition:'dataHere',concept:'변수·조건'},
 IF_TERMINAL:{label:'단말기 위라면',icon:'▣',kind:'condition',condition:'terminalHere',concept:'상태·조건'},
 IF_CHARGER:{label:'충전 패드 위라면',icon:'⚡',kind:'condition',condition:'chargerHere',concept:'상태·조건'},
 IF_SWITCH:{label:'스위치 위라면',icon:'◉',kind:'condition',condition:'switchHere',concept:'상태·조건'},
 UNTIL_GOAL:{label:'출구에 닿을 때까지',icon:'↻',kind:'until',condition:'atGoal',concept:'조건 반복',limit:100},
 UNTIL_ENEMIES_GONE:{label:'적이 모두 사라질 때까지',icon:'↻',kind:'until',condition:'enemiesGone',concept:'조건 반복',limit:80},
 COLLECT_DATA:{label:'데이터 줍기',icon:'◆',kind:'action',concept:'변수'},
 UPLOAD:{label:'데이터 업로드',icon:'⇧',kind:'action',concept:'변수'},
 CHARGE:{label:'에너지 충전',icon:'⚡',kind:'action',concept:'자원'},
 TOGGLE:{label:'스위치 작동',icon:'◉',kind:'action',concept:'상태'}
});

const IMAGES={};
function img(key,src){const im=new Image();im.src=src;IMAGES[key]=im;}
img('hero','../../assets/game/characters/people/kenney-top-down-shooter/survivor-1/survivor1-hold.png');
img('heroBolt','../../assets/game/characters/people/kenney-top-down-shooter/survivor-1/survivor1-gun.png');
img('robot','../../assets/game/characters/people/kenney-top-down-shooter/robot-1/robot1-hold.png');
img('robotGun','../../assets/game/characters/people/kenney-top-down-shooter/robot-1/robot1-gun.png');
img('zombie','../../assets/game/characters/people/kenney-top-down-shooter/zombie-1/zoimbie1-hold.png');

let progress=loadProgress();
let missionIndex=Math.min(missions.length-1,Math.max(0,progress.current||0));
let mission=missions[missionIndex];
let world=null;
let mainProgram=[],functionPrograms={a:[],b:[]},codeTarget='main',insertPath=[];
let nodeSeq=0,executingNodeId='',errorNodeId='',paletteGroup='all',runSpeed=1,toastTimer=0,raf=0,lastFrame=0;
let runtime=null,selectionEnemyId='',stepActive=false;

function defaultProgress(){return{current:0,unlocked:1,completed:{},programs:{},best:{},attempts:{},wins:0};}
function loadProgress(){
 let raw={};try{raw=JSON.parse(localStorage.getItem(SAVE_KEY)||'{}')}catch(_){}
 return {...defaultProgress(),...raw,completed:raw.completed||{},programs:raw.programs||{},best:raw.best||{},attempts:raw.attempts||{}};
}
function saveProgress(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(progress))}catch(_){}}
function clone(v){return JSON.parse(JSON.stringify(v));}
function makeId(){return'n'+(++nodeSeq)}
function sound(key){try{window.KidscadeGame?.sound?.(key)}catch(_){}}
function toast(text,bad=false){const el=$('toast');if(!el)return;el.textContent=text;el.style.background=bad?'#ffdede':'#eef7ff';el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),1500)}
function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
function mdist(a,b){return Math.abs(a.x-b.x)+Math.abs(a.y-b.y)}
function cheb(a,b){return Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y))}
function key(x,y){return x+','+y}
function seeded(n){let s=(n*1664525+1013904223)>>>0;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296}}

function stageProfile(i){
 const arc=mission?.arc||'prologue',boss=Boolean(mission?.boss||i%5===4),tier=Math.floor(i/5);
 return{
  arc,boss,tier,
  enemyCount:boss?Math.min(3,1+Math.floor(i/18)):clamp(1+Math.floor(i/8),1,5),
  resource:i>=25,
  energy:i>=27,
  gates:i>=20,
  validation:i>=30,
  hp:6+Math.floor(i/10),
  objective:boss?'보스의 AI 패턴을 읽고 격파한 뒤 출구에 도착':i>=25?'데이터와 장치를 처리해 출구에 도착':'코드로 전장을 돌파해 출구에 도착'
 };
}
function allowedBlocks(i=missionIndex){
 const out=['MOVE_UP','MOVE_RIGHT','MOVE_DOWN','MOVE_LEFT'];
 if(i>=1)out.push('SLASH');
 if(i>=3)out.push('IF_ENEMY');
 if(i>=5)out.push('REP2','REP3');
 if(i>=7)out.push('DODGE','WAIT','IF_WINDUP');
 if(i>=10)out.push('GUARD','SPIN','IF_HP_LOW','HEAL');
 if(i>=14)out.push('BOLT','IF_LINE','IF_PROJECTILE');
 if(i>=18)out.push('UNTIL_GOAL','UNTIL_ENEMIES_GONE');
 if(i>=20)out.push('TOGGLE','IF_SWITCH','CALL_FN');
 if(i>=24)out.push('CALL_FN_B');
 if(i>=25)out.push('COLLECT_DATA','IF_DATA','UPLOAD','IF_TERMINAL');
 if(i>=27)out.push('CHARGE','IF_CHARGER');
 if(i>=30)out.push('DASH','IF_WALL','REP4');
 return [...new Set(out)];
}
function blockGroup(t){
 if(t.startsWith('MOVE_')||t==='DASH')return'move';
 if(['SLASH','SPIN','BOLT','GUARD','DODGE','WAIT','HEAL'].includes(t))return'combat';
 if(t.startsWith('IF_'))return'sensor';
 if(t.startsWith('REP')||t.startsWith('UNTIL_'))return'flow';
 if(t.startsWith('CALL_FN'))return'skill';
 return'resource';
}
function memoryLimit(){return codeTarget==='main'?18+Math.floor(missionIndex/8)*2:10+Math.floor(missionIndex/15)*2}
function store(){if(!progress.programs[missionIndex])progress.programs[missionIndex]={main:[],a:[],b:[]};return progress.programs[missionIndex]}
function normalizeNodes(list){return(list||[]).filter(n=>B[n.type]).map(n=>{const x={id:n.id||makeId(),type:n.type};if(Array.isArray(n.body))x.body=normalizeNodes(n.body);if(Array.isArray(n.elseBody))x.elseBody=normalizeNodes(n.elseBody);return x})}
function loadCode(){const s=store();mainProgram=normalizeNodes(clone(s.main||[]));functionPrograms={a:normalizeNodes(clone(s.a||[])),b:normalizeNodes(clone(s.b||[]))};insertPath=[]}
function persistCode(){const s=store();s.main=clone(mainProgram);s.a=clone(functionPrograms.a);s.b=clone(functionPrograms.b);progress.current=missionIndex;saveProgress()}
function activeRoot(){return codeTarget==='main'?mainProgram:functionPrograms[codeTarget]}
function resolveContainer(root,path){let list=root;for(const part of path){const[id,branch='body']=String(part).split(':');const n=list.find(v=>v.id===id);if(!n)break;if(!Array.isArray(n[branch]))n[branch]=[];list=n[branch]}return list}

function buildArena(i,variant=0){
 const rng=seeded(9901+i*97+variant*1009),p=stageProfile(i),walls=new Set();
 for(let x=0;x<GRID_W;x++){walls.add(key(x,0));walls.add(key(x,GRID_H-1))}
 for(let y=0;y<GRID_H;y++){walls.add(key(0,y));walls.add(key(GRID_W-1,y))}
 const pat=(i+variant)%5;
 const addV=(x,gaps)=>{for(let y=2;
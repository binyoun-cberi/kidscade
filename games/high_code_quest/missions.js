(function(){
'use strict';

const A={
 FWD:{label:'앞으로 달리기',icon:'→',kind:'action',concept:'순차'},
 BACK:{label:'한 칸 후퇴',icon:'←',kind:'action',concept:'이동'},
 JUMP:{label:'점프',icon:'⤴',kind:'action',concept:'행동'},
 HIGH_JUMP:{label:'높이 점프',icon:'⇈',kind:'action',concept:'행동'},
 DROP:{label:'아래로 내려가기',icon:'⇣',kind:'action',concept:'행동'},
 DASH:{label:'대시',icon:'»',kind:'action',concept:'행동'},
 DODGE:{label:'회피',icon:'↯',kind:'action',concept:'행동'},
 ATTACK:{label:'공격',icon:'⚔',kind:'action',concept:'행동'},
 WAIT:{label:'잠깐 기다리기',icon:'…',kind:'action',concept:'타이밍'},
 COLLECT:{label:'줍기',icon:'◆',kind:'action',concept:'변수'},
 OPEN:{label:'문 열기',icon:'▣',kind:'action',concept:'조건'},
 HEAL:{label:'회복',icon:'♥',kind:'action',concept:'변수'},
 REP2:{label:'2번 반복',icon:'×2',kind:'structure',count:2,concept:'반복'},
 REP3:{label:'3번 반복',icon:'×3',kind:'structure',count:3,concept:'반복'},
 REP4:{label:'4번 반복',icon:'×4',kind:'structure',count:4,concept:'반복'},
 IF_ENEMY:{label:'앞에 적이 있다면',icon:'?',kind:'condition',condition:'enemyAhead',concept:'조건'},
 IF_GAP:{label:'앞이 낭떠러지라면',icon:'?',kind:'condition',condition:'gapAhead',concept:'조건'},
 IF_UP:{label:'위에 길이 있다면',icon:'?',kind:'condition',condition:'platformAbove',concept:'조건'},
 IF_HP_LOW:{label:'HP가 2 이하라면',icon:'?',kind:'condition',condition:'hpLow',concept:'변수·조건'},
 IF_WINDUP:{label:'적이 공격 준비 중이면',icon:'!',kind:'condition',condition:'enemyWindup',concept:'상태·조건'},
 IF_CRYSTALS3:{label:'수정이 3개 이상이면',icon:'?',kind:'condition',condition:'crystals3',concept:'변수·조건'},
 CALL_FN:{label:'나의 기술',icon:'ƒ',kind:'call',concept:'함수'}
};

function floor(length,gaps=[],y=0){
 const set=new Set(gaps),out=[];let start=null;
 for(let x=0;x<length;x++){
  if(!set.has(x)&&start===null)start=x;
  if((set.has(x)||x===length-1)&&start!==null){
   const end=set.has(x)?x:x+1;
   out.push({x:start,y,w:end-start});
   start=null;
  }
 }
 return out;
}
function P(x,y,w){return {x,y,w};}
const PRO=['FWD','JUMP','ATTACK','COLLECT','OPEN','REP2','REP3','REP4','IF_ENEMY','IF_GAP','IF_CRYSTALS3','CALL_FN'];

const M=[
 {arc:'prologue',chapter:'입단 시험 · 1',concept:'순차 실행',title:'첫 발걸음',name:'1. 오른쪽으로 출발!',text:'코드는 위에서 아래로 실행돼요. 앞으로 달리기를 이어 붙여 출구까지 가 보세요.',objective:'출구까지 달려가기',start:{x:1,y:0},goal:{x:5,y:0},platforms:floor(8),crystals:[],doors:[],enemies:[],treasures:[],memory:7,par:4,available:['FWD'],reward:{id:'boots_basic',name:'원정대 장화',desc:'앞으로 달리기 명령을 익혔어요.'}},
 {arc:'prologue',chapter:'입단 시험 · 2',concept:'점프와 순서',title:'길이 끊겼어',name:'2. 점프!',text:'앞이 끊겼다면 점프가 필요해요. 실행 순서를 바르게 배치해 구덩이를 건너세요.',objective:'구덩이를 뛰어넘어 출구로',start:{x:1,y:0},goal:{x:8,y:0},platforms:floor(10,[4]),crystals:[],doors:[],enemies:[],treasures:[],memory:9,par:7,available:['FWD','JUMP'],reward:{id:'jump_module',name:'점프 모듈',desc:'점프로 끊어진 길을 건널 수 있어요.'}},
 {arc:'prologue',chapter:'입단 시험 · 3',concept:'순차 실행',title:'수정과 문',name:'3. 먼저 줍고, 그다음 열기',text:'수정을 지나치지 말고 그 자리에서 주운 뒤 문을 여세요.',objective:'수정 1개를 챙겨 문을 열고 출구로',start:{x:1,y:0},goal:{x:8,y:0},platforms:floor(10),crystals:[{x:3,y:0}],doors:[{x:6,y:0,need:1}],enemies:[],treasures:[],memory:10,par:9,available:['FWD','COLLECT','OPEN'],reward:{id:'hand_module',name:'수집 모듈',desc:'필드의 수정과 보물을 주울 수 있어요.'}},
 {arc:'prologue',chapter:'입단 시험 · 4',concept:'행동과 디버깅',title:'첫 버그 몬스터',name:'4. 가까이 가서 공격!',text:'적이 바로 앞에 있을 때만 공격이 성공해요. 잘못된 줄에서 프로그램이 멈춥니다.',objective:'버그 몬스터를 쓰러뜨리고 출구로',start:{x:1,y:0},goal:{x:9,y:0},platforms:floor(11),crystals:[],doors:[],enemies:[{x:5,y:0,type:'blob',hp:1}],treasures:[],memory:11,par:9,available:['FWD','ATTACK'],reward:{id:'sword_module',name:'디버그 블레이드',desc:'버그 몬스터를 공격할 수 있어요.'}},
 {arc:'prologue',chapter:'입단 시험 · 5',concept:'반복문',title:'같은 행동이 계속돼',name:'5. 반복해서 돌파!',text:'같은 코드를 길게 복사하지 말고 반복 블록 안에 묶어 보세요.',objective:'버그 몬스터 3마리를 지나 출구로',start:{x:1,y:0},goal:{x:13,y:0},platforms:floor(15),crystals:[],doors:[],enemies:[{x:4,y:0,type:'mush',hp:1},{x:8,y:0,type:'mush',hp:1},{x:12,y:0,type:'mush',hp:1}],treasures:[],memory:8,par:6,available:['FWD','ATTACK','REP2','REP3','REP4'],reward:{id:'loop_core',name:'반복 코어',desc:'같은 행동 묶음을 여러 번 실행할 수 있어요.'}},
 {arc:'prologue',chapter:'입단 시험 · 6',concept:'조건문',title:'있을 때만 공격',name:'6. 적을 보고 판단해',text:'몬스터 위치가 달라져도 작동하는 코드를 만들어 보세요.',objective:'적 감지 조건을 사용해 어떤 배치에서도 통과',start:{x:1,y:0},goal:{x:10,y:0},platforms:floor(12),crystals:[],doors:[],enemies:[{x:4,y:0,type:'blob',hp:1},{x:8,y:0,type:'blob',hp:1}],variants:[[4,8],[3,8],[5,7]],treasures:[],memory:9,par:8,available:['FWD','ATTACK','REP4','IF_ENEMY'],requireType:'IF_ENEMY',reward:{id:'enemy_sensor',name:'적 감지 센서',desc:'앞에 적이 있는지 조건으로 확인할 수 있어요.'}},
 {arc:'prologue',chapter:'입단 시험 · 7',concept:'조건문',title:'길을 읽고 달리기',name:'7. 떨어지기 전에 점프!',text:'구덩이 위치를 외우지 말고 센서로 판단하세요.',objective:'낭떠러지 조건을 사용해 출구로',start:{x:1,y:0},goal:{x:12,y:0},platforms:floor(14,[5,9]),crystals:[],doors:[],enemies:[],treasures:[],memory:9,par:7,available:['FWD','JUMP','REP4','IF_GAP'],requireType:'IF_GAP',reward:{id:'terrain_sensor',name:'지형 센서',desc:'앞의 낭떠러지를 코드로 감지할 수 있어요.'}},
 {arc:'prologue',chapter:'입단 시험 · 8',concept:'변수와 조건',title:'수정 = ?',name:'8. 세 개를 모으면 열려',text:'수정을 주울 때마다 수정 값이 1씩 올라가요. 3개가 되었을 때 문을 여세요.',objective:'수정 3개를 모아 문을 열고 출구로',start:{x:1,y:0},goal:{x:11,y:0},platforms:floor(13),crystals:[{x:3,y:0},{x:5,y:0},{x:7,y:0}],doors:[{x:9,y:0,need:3}],enemies:[],treasures:[],memory:12,par:10,available:['FWD','COLLECT','OPEN','REP3','IF_CRYSTALS3'],requireType:'IF_CRYSTALS3',reward:{id:'memory_sensor',name:'상태 메모리',desc:'수정 개수 같은 값을 조건으로 읽을 수 있어요.'}},
 {arc:'prologue',chapter:'입단 시험 · 9',concept:'함수',title:'내 기술 만들기',name:'9. 자주 쓰는 행동을 묶자',text:'자주 쓰는 전투 행동을 나의 기술에 저장하고 메인 코드에서 불러오세요.',objective:'나의 기술을 사용해 3마리 돌파',start:{x:1,y:0},goal:{x:13,y:0},platforms:floor(15),crystals:[],doors:[],enemies:[{x:4,y:0,type:'ghost',hp:1},{x:8,y:0,type:'ghost',hp:1},{x:12,y:0,type:'ghost',hp:1}],treasures:[],memory:8,par:5,functionMemory:7,available:['FWD','ATTACK','REP3','IF_ENEMY','CALL_FN'],requireType:'CALL_FN',requireFunction:true,reward:{id:'function_slot',name:'기술 슬롯',desc:'자주 쓰는 코드를 나의 기술로 저장할 수 있어요.'}},
 {arc:'prologue',chapter:'입단 시험 · 최종',concept:'종합',title:'NULL 골렘',name:'10. 입단 시험 최종전',text:'달리고, 줍고, 판단하고, 싸우세요. 지금까지 익힌 코드를 모두 사용하는 마지막 시험입니다.',objective:'수정 3개 → 문 열기 → 골렘 격파 → 출구',start:{x:1,y:0},goal:{x:16,y:0},platforms:floor(18,[6]),crystals:[{x:2,y:0},{x:3,y:0},{x:4,y:0}],doors:[{x:10,y:0,need:3}],enemies:[{x:14,y:0,type:'golem',hp:3,cycle:['idle','windup','slam','rest']}],treasures:[],memory:20,par:15,functionMemory:8,available:PRO,requireType:'IF_CRYSTALS3',reward:{id:'ranger_badge',name:'코드 원정대 배지',desc:'입단 시험 통과! 이제 버그월드 본편으로 출발할 수 있어요.',worldUnlock:'forest'}},

 {arc:'forest',chapter:'버섯 숲 · 1',concept:'분기와 탐험',title:'두 갈래 숲길',name:'11. 어느 길로 갈까?',text:'본편에서는 길이 위아래로 갈라져요. 위쪽은 짧고 보물이 있지만 점프가 더 필요합니다.',objective:'원하는 경로를 골라 숲 관문까지 이동',start:{x:1,y:0},goal:{x:17,y:0},platforms:[P(0,0,7),P(8,0,5),P(14,0,5),P(5,2,6),P(11,1,4),P(7,-2,7)],crystals:[],doors:[],enemies:[{x:9,y:0,type:'blob',hp:1},{x:8,y:2,type:'mush',hp:1}],treasures:[{x:7,y:2,id:'forest_cache',name:'숲의 메모리 조각'}],memory:16,par:12,functionMemory:8,available:['FWD','BACK','JUMP','ATTACK','COLLECT','REP2','REP3','REP4','IF_ENEMY','IF_GAP','CALL_FN'],carryProgram:true,reward:{id:'reflex_sensor',name:'반응 센서',desc:'적이 공격 준비 중인지 읽을 수 있어요.',unlockBlocks:['IF_WINDUP','DODGE','WAIT']}},
 {arc:'forest',chapter:'버섯 숲 · 2',concept:'상태 감지',title:'독포자 사수',name:'12. 공격 예고를 읽어!',text:'독버섯은 포자를 쏘기 전에 몸이 붉게 빛나요. 공격 준비 상태를 읽고 회피하세요.',objective:'독포자 공격을 피하며 숲을 통과',start:{x:1,y:0},goal:{x:15,y:0},platforms:[P(0,0,17),P(7,2,4)],crystals:[],doors:[],enemies:[{x:6,y:0,type:'spitter',hp:2,cycle:['idle','windup','shoot','rest']},{x:12,y:0,type:'spitter',hp:2,cycle:['idle','windup','shoot','rest']}],treasures:[{x:9,y:2,id:'altimeter_chip',name:'고도 측정 칩'}],memory:18,par:13,functionMemory:9,available:['FWD','BACK','JUMP','DODGE','ATTACK','WAIT','COLLECT','REP2','REP3','REP4','IF_ENEMY','IF_GAP','IF_WINDUP','CALL_FN'],requireType:'IF_WINDUP',carryProgram:true,reward:{id:'altimeter',name:'고도 센서',desc:'위쪽에 올라갈 수 있는 길이 있는지 감지할 수 있어요.',unlockBlocks:['IF_UP']}},
 {arc:'forest',chapter:'버섯 숲 · 3',concept:'높이와 경로',title:'박쥐 절벽',name:'13. 위쪽 길을 노려라',text:'이번에는 위쪽 발판에 희귀 보물이 있어요. 고도 센서로 올라갈 기회를 찾아 보세요.',objective:'절벽을 넘어 숲 깊숙이 이동',start:{x:1,y:0},goal:{x:17,y:0},platforms:[P(0,0,5),P(6,0,5),P(12,0,7),P(4,2,4),P(8,4,5),P(13,2,4),P(5,-2,5)],crystals:[],doors:[],enemies:[{x:7,y:2,type:'bat',hp:1,cycle:['hover','windup','swoop','rest']},{x:11,y:4,type:'bat',hp:1,cycle:['hover','windup','swoop','rest']}],treasures:[{x:10,y:4,id:'sky_shard',name:'하늘빛 수정'}],memory:19,par:14,functionMemory:9,available:['FWD','BACK','JUMP','DODGE','ATTACK','WAIT','COLLECT','REP2','REP3','REP4','IF_ENEMY','IF_GAP','IF_WINDUP','IF_UP','CALL_FN'],carryProgram:true,reward:{id:'high_jump_boots',name:'고점프 부츠',desc:'더 높은 발판으로 뛰어오르거나 아래 길로 내려갈 수 있어요.',unlockBlocks:['HIGH_JUMP','DROP']}},
 {arc:'forest',chapter:'버섯 숲 · 4',concept:'빌드와 보상',title:'숨은 보물길',name:'14. 위험한 길, 좋은 보상',text:'안전한 아래 길과 위험한 위 길 중 하나를 고르세요. 위 길에는 메모리 코어가 숨겨져 있습니다.',objective:'경로를 선택해 왕버섯 둥지 앞까지 이동',start:{x:1,y:0},goal:{x:19,y:0},platforms:[P(0,0,6),P(7,0,6),P(14,0,7),P(5,3,5),P(10,5,5),P(15,3,4),P(6,-2,8)],crystals:[],doors:[],enemies:[{x:8,y:0,type:'shield',hp:2,cycle:['guard','open','guard','open']},{x:12,y:5,type:'spitter',hp:2,cycle:['idle','windup','shoot','rest']},{x:16,y:3,type:'bat',hp:1,cycle:['hover','windup','swoop','rest']}],treasures:[{x:13,y:5,id:'memory_core',name:'메모리 코어 +2',memoryBonus:2}],memory:21,par:16,functionMemory:10,available:['FWD','BACK','JUMP','HIGH_JUMP','DROP','DODGE','ATTACK','WAIT','COLLECT','REP2','REP3','REP4','IF_ENEMY','IF_GAP','IF_WINDUP','IF_UP','CALL_FN'],carryProgram:true,reward:{id:'dash_boots',name:'대시 부츠',desc:'두 칸을 빠르게 돌파하는 대시 명령을 사용할 수 있어요.',unlockBlocks:['DASH']}},
 {arc:'forest',chapter:'버섯 숲 · 보스',concept:'상태·회피·공격',title:'왕버섯 BUGCAP',name:'15. 버섯 숲의 주인',text:'왕버섯은 독포자를 뿜기 전 공격 준비 상태가 됩니다. 회피와 공격 타이밍을 프로그램하세요.',objective:'BUGCAP을 쓰러뜨리고 숲의 코어 회수',start:{x:1,y:0},goal:{x:18,y:0},platforms:[P(0,0,20),P(6,2,4),P(12,2,4)],crystals:[],doors:[],enemies:[{x:14,y:0,type:'boss_mushroom',hp:6,boss:true,cycle:['idle','windup','spore','rest','rest']}],treasures:[{x:17,y:0,id:'forest_core',name:'버섯 숲 코어'}],memory:24,par:18,functionMemory:11,available:['FWD','BACK','JUMP','HIGH_JUMP','DROP','DASH','DODGE','ATTACK','WAIT','COLLECT','HEAL','REP2','REP3','REP4','IF_ENEMY','IF_GAP','IF_WINDUP','IF_HP_LOW','IF_UP','CALL_FN'],requireType:'IF_WINDUP',carryProgram:true,boss:true,reward:{id:'forest_core',name:'버섯 숲 코어',desc:'버섯 숲의 버그를 정화했어요. 최대 코드 메모리 +4.',memoryBonus:4}}
];

const regions=[
 {id:'prologue',name:'코드 캠프',subtitle:'입단 시험',start:0,end:9,icon:'⌘',x:12,y:56},
 {id:'forest',name:'버섯 숲',subtitle:'첫 번째 원정',start:10,end:14,icon:'♣',x:48,y:46,requiresMission:9},
 {id:'mine',name:'수정 광산',subtitle:'준비 중',locked:true,icon:'◆',x:79,y:62}
];

window.CodeQuestData={blocks:A,missions:M,regions};
})();
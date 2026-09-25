(function(){
'use strict';
const A={
 FWD:{label:'앞으로',icon:'↑',kind:'action',concept:'순차'},
 LEFT:{label:'왼쪽 돌기',icon:'↶',kind:'action',concept:'방향'},
 RIGHT:{label:'오른쪽 돌기',icon:'↷',kind:'action',concept:'방향'},
 ATTACK:{label:'공격',icon:'⚔',kind:'action',concept:'행동'},
 COLLECT:{label:'수정 줍기',icon:'◆',kind:'action',concept:'변수'},
 OPEN:{label:'문 열기',icon:'▣',kind:'action',concept:'조건'},
 REP2:{label:'2번 반복',icon:'×2',kind:'structure',count:2,concept:'반복'},
 REP3:{label:'3번 반복',icon:'×3',kind:'structure',count:3,concept:'반복'},
 REP4:{label:'4번 반복',icon:'×4',kind:'structure',count:4,concept:'반복'},
 IF_ENEMY:{label:'앞에 적이 있다면',icon:'?',kind:'condition',condition:'enemyAhead',concept:'조건'},
 IF_WALL:{label:'앞이 막혔다면',icon:'?',kind:'condition',condition:'wallAhead',concept:'조건'},
 IF_CRYSTALS3:{label:'수정이 3개 이상이면',icon:'?',kind:'condition',condition:'crystals3',concept:'변수·조건'},
 CALL_FN:{label:'나의 함수',icon:'ƒ',kind:'call',concept:'함수'}
};
const missions=[
 {chapter:'시작 마을',concept:'순차 실행',title:'첫 발걸음',name:'1. 앞으로 가 봐!',text:'명령은 위에서 아래로 차례대로 실행돼요. 출구까지 걸어가 보세요.',objective:'출구에 도착하기',w:5,h:5,start:[0,2],dir:1,goal:[3,2],walls:[],crystals:[],doors:[],enemies:[],memory:6,par:3,available:['FWD'],unlock:'오른쪽·왼쪽 돌기',nextBlocks:['LEFT','RIGHT']},
 {chapter:'시작 마을',concept:'순서와 방향',title:'길이 꺾였어',name:'2. 모퉁이를 돌아!',text:'방향을 바꾸는 명령도 실행 순서가 중요해요.',objective:'꺾인 길 끝의 출구에 도착하기',w:5,h:5,start:[1,3],dir:0,goal:[3,1],walls:[],crystals:[],doors:[],enemies:[],memory:8,par:5,available:['FWD','LEFT','RIGHT'],unlock:'수정 줍기·문 열기',nextBlocks:['COLLECT','OPEN']},
 {chapter:'시작 마을',concept:'순차 실행',title:'수정과 문',name:'3. 열쇠는 수정이야',text:'수정을 먼저 줍고 문 앞에서 문 열기 명령을 사용하세요.',objective:'수정을 챙겨 문을 열고 출구로',w:5,h:5,start:[0,2],dir:1,goal:[4,2],walls:[],crystals:[[2,2]],doors:[{x:3,y:2,need:1}],enemies:[],memory:9,par:6,available:['FWD','LEFT','RIGHT','COLLECT','OPEN'],unlock:'공격 명령',nextBlocks:['ATTACK']},
 {chapter:'시작 마을',concept:'행동과 디버깅',title:'첫 슬라임',name:'4. 앞을 보고 공격!',text:'공격은 바로 앞 칸에 적이 있을 때만 성공해요. 잘못된 줄에서 실행이 멈춥니다.',objective:'슬라임을 없애고 출구로',w:5,h:5,start:[0,2],dir:1,goal:[4,2],walls:[],crystals:[],doors:[],enemies:[{x:2,y:2,type:'blob',hp:1,behavior:'guard'}],memory:9,par:5,available:['FWD','LEFT','RIGHT','ATTACK'],unlock:'3번 반복',nextBlocks:['REP3']},
 {chapter:'반복의 숲',concept:'반복문',title:'같은 일이 세 번',name:'5. 반복해서 돌파!',text:'같은 명령 묶음을 여러 번 쓰지 말고 반복 블록 안에 넣어 보세요.',objective:'슬라임 3마리를 지나 출구로',w:8,h:5,start:[0,2],dir:1,goal:[7,2],walls:[],crystals:[],doors:[],enemies:[{x:2,y:2,type:'mush',hp:1,behavior:'guard'},{x:4,y:2,type:'mush',hp:1,behavior:'guard'},{x:6,y:2,type:'mush',hp:1,behavior:'guard'}],memory:8,par:5,available:['FWD','ATTACK','LEFT','RIGHT','REP2','REP3'],unlock:'조건 센서: 앞에 적',nextBlocks:['IF_ENEMY','REP4']},
 {chapter:'센서 동굴',concept:'조건문',title:'있을 때만 공격',name:'6. 센서가 알려 줄 거야',text:'적의 위치는 매번 달라질 수 있어요. 적이 앞에 있을 때만 공격하게 만들어 보세요.',objective:'조건을 사용해 출구까지 안전하게 이동',w:6,h:5,start:[0,2],dir:1,goal:[5,2],walls:[],crystals:[],doors:[],enemies:[{x:2,y:2,type:'blob',hp:1,behavior:'guard'},{x:4,y:2,type:'blob',hp:1,behavior:'guard'}],variants:[[[2,2],[4,2]],[[1,2],[4,2]],[[2,2],[3,2]]],memory:9,par:5,available:['FWD','ATTACK','REP3','REP4','IF_ENEMY'],requireType:'IF_ENEMY',unlock:'벽 감지 센서',nextBlocks:['IF_WALL']},
 {chapter:'센서 동굴',concept:'조건문',title:'벽이면 방향 바꾸기',name:'7. 막히기 전에 생각!',text:'벽에 부딪힌 뒤 고치는 대신, 벽을 미리 감지해서 방향을 바꿀 수 있어요.',objective:'벽 센서를 사용해 출구로',w:5,h:6,start:[1,4],dir:0,goal:[4,3],walls:[[1,2]],crystals:[],doors:[],enemies:[],memory:9,par:4,available:['FWD','LEFT','RIGHT','REP4','IF_WALL'],requireType:'IF_WALL',unlock:'수정 변수 조건',nextBlocks:['IF_CRYSTALS3']},
 {chapter:'기억의 광산',concept:'변수와 조건',title:'수정 = ?',name:'8. 세 개를 모으면 열려',text:'수정을 주울 때마다 수정 값이 1씩 늘어요. 값이 3 이상일 때 문을 열어 보세요.',objective:'수정 3개를 모아 문을 열고 출구로',w:6,h:5,start:[0,2],dir:1,goal:[5,2],walls:[],crystals:[[1,2],[2,2],[3,2]],doors:[{x:4,y:2,need:3}],enemies:[],memory:11,par:7,available:['FWD','COLLECT','OPEN','REP3','IF_CRYSTALS3'],requireType:'IF_CRYSTALS3',unlock:'나의 함수',nextBlocks:['CALL_FN']},
 {chapter:'함수의 성',concept:'함수',title:'자주 쓰는 행동 묶기',name:'9. 내 기술을 만들자',text:'함수 탭에 자주 쓰는 행동을 한 번 만들고, 메인 코드에서는 나의 함수를 호출하세요.',objective:'나의 함수를 호출해 몬스터 길 돌파',w:8,h:5,start:[0,2],dir:1,goal:[7,2],walls:[],crystals:[],doors:[],enemies:[{x:2,y:2,type:'ghost',hp:1,behavior:'guard'},{x:4,y:2,type:'ghost',hp:1,behavior:'guard'},{x:6,y:2,type:'ghost',hp:1,behavior:'guard'}],memory:8,par:5,functionMemory:6,available:['FWD','ATTACK','REP3','IF_ENEMY','CALL_FN'],requireType:'CALL_FN',requireFunction:true,unlock:'최종 원정 개방',nextBlocks:[]},
 {chapter:'버그의 탑',concept:'종합',title:'버그 골렘',name:'10. 배운 걸 전부 써!',text:'수정, 문, 반복, 조건을 모두 이용해 마지막 버그 골렘을 쓰러뜨리세요.',objective:'수정 3개 → 문 개방 → 골렘 격파 → 출구',w:8,h:7,start:[0,3],dir:1,goal:[7,3],walls:[],crystals:[[1,3],[2,3],[3,3]],doors:[{x:4,y:3,need:3}],enemies:[{x:6,y:3,type:'golem',hp:3,behavior:'guard'}],memory:18,par:12,functionMemory:8,available:Object.keys(A),requireType:'IF_CRYSTALS3',unlock:'코드 원정대 완주!',nextBlocks:[]}
];
window.CodeQuestData={blocks:A,missions:missions};
})();
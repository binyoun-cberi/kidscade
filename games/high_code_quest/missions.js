(function(){
'use strict';
const A={
 FWD:{label:'앞으로',icon:'→',kind:'action',concept:'순차'},
 LEFT:{label:'왼쪽 보기',icon:'←',kind:'action',concept:'방향'},
 RIGHT:{label:'오른쪽 보기',icon:'→',kind:'action',concept:'방향'},
 JUMP:{label:'점프',icon:'⤴',kind:'action',concept:'행동'},
 ATTACK:{label:'공격',icon:'⚔',kind:'action',concept:'행동'},
 COLLECT:{label:'수정 줍기',icon:'◆',kind:'action',concept:'변수'},
 OPEN:{label:'문 열기',icon:'▣',kind:'action',concept:'조건'},
 REP2:{label:'2번 반복',icon:'×2',kind:'structure',count:2,concept:'반복'},
 REP3:{label:'3번 반복',icon:'×3',kind:'structure',count:3,concept:'반복'},
 REP4:{label:'4번 반복',icon:'×4',kind:'structure',count:4,concept:'반복'},
 IF_ENEMY:{label:'앞에 적이 있다면',icon:'?',kind:'condition',condition:'enemyAhead',concept:'조건'},
 IF_GAP:{label:'앞이 낭떠러지라면',icon:'?',kind:'condition',condition:'gapAhead',concept:'조건'},
 IF_CRYSTALS3:{label:'수정이 3개 이상이면',icon:'?',kind:'condition',condition:'crystals3',concept:'변수·조건'},
 CALL_FN:{label:'나의 함수',icon:'ƒ',kind:'call',concept:'함수'}
};
const M=[
 {chapter:'시작 마을',concept:'순차 실행',title:'첫 발걸음',name:'1. 오른쪽으로 출발!',text:'코드는 위에서 아래로 실행돼요. 앞으로 명령을 이어 붙여 출구까지 가 보세요.',objective:'출구까지 달려가기',length:8,start:1,goal:5,gaps:[],crystals:[],doors:[],enemies:[],memory:7,par:4,available:['FWD'],unlock:'점프 명령',nextBlocks:['JUMP']},
 {chapter:'시작 마을',concept:'점프와 순서',title:'길이 끊겼어',name:'2. 점프!',text:'앞 칸이 비어 있으면 그냥 달릴 수 없어요. 점프로 한 칸짜리 구멍을 건너세요.',objective:'구덩이를 뛰어넘어 출구로',length:10,start:1,goal:8,gaps:[4],crystals:[],doors:[],enemies:[],memory:9,par:7,available:['FWD','JUMP'],unlock:'수정 줍기·문 열기',nextBlocks:['COLLECT','OPEN']},
 {chapter:'시작 마을',concept:'순차 실행',title:'수정과 문',name:'3. 먼저 줍고, 그다음 열기',text:'수정을 지나치지 말고 그 자리에서 주운 뒤 문을 여세요. 순서를 바꾸면 실패해요.',objective:'수정 1개를 챙겨 문을 열고 출구로',length:10,start:1,goal:8,gaps:[],crystals:[3],doors:[{x:6,need:1}],enemies:[],memory:10,par:8,available:['FWD','COLLECT','OPEN'],unlock:'공격 명령',nextBlocks:['ATTACK']},
 {chapter:'버그 들판',concept:'행동과 디버깅',title:'첫 버그 몬스터',name:'4. 가까이 가서 공격!',text:'적이 바로 앞에 있을 때만 공격이 성공해요. 잘못된 줄에서 프로그램이 멈춥니다.',objective:'버그 몬스터를 쓰러뜨리고 출구로',length:11,start:1,goal:9,gaps:[],crystals:[],doors:[],enemies:[{x:5,type:'blob',hp:1}],memory:11,par:9,available:['FWD','ATTACK'],unlock:'3번 반복',nextBlocks:['REP3']},
 {chapter:'반복의 숲',concept:'반복문',title:'같은 행동이 계속돼',name:'5. 반복해서 돌파!',text:'같은 코드를 길게 복사하지 말고 반복 블록 안에 묶어 보세요.',objective:'버그 몬스터 3마리를 지나 출구로',length:15,start:1,goal:13,gaps:[],crystals:[],doors:[],enemies:[{x:4,type:'mush',hp:1},{x:8,type:'mush',hp:1},{x:12,type:'mush',hp:1}],memory:8,par:6,available:['FWD','ATTACK','REP2','REP3','REP4'],unlock:'적 감지 조건',nextBlocks:['IF_ENEMY']},
 {chapter:'센서 계곡',concept:'조건문',title:'있을 때만 공격',name:'6. 적을 보고 판단해',text:'몬스터 위치가 달라져도 작동하는 코드를 만들어 보세요. 적이 앞에 있을 때만 공격하면 됩니다.',objective:'조건을 사용해 어떤 배치에서도 통과',length:12,start:1,goal:10,gaps:[],crystals:[],doors:[],enemies:[{x:4,type:'blob',hp:1},{x:8,type:'blob',hp:1}],variants:[[4,8],[3,8],[5,7]],memory:9,par:8,available:['FWD','ATTACK','REP4','IF_ENEMY'],requireType:'IF_ENEMY',unlock:'낭떠러지 감지 조건',nextBlocks:['IF_GAP','JUMP']},
 {chapter:'센서 계곡',concept:'조건문',title:'길을 읽고 달리기',name:'7. 떨어지기 전에 점프!',text:'구덩이 위치를 외우지 말고 센서로 판단하세요. 앞이 비어 있을 때만 점프합니다.',objective:'낭떠러지 조건을 사용해 출구로',length:14,start:1,goal:12,gaps:[5,9],crystals:[],doors:[],enemies:[],memory:9,par:7,available:['FWD','JUMP','REP4','IF_GAP'],requireType:'IF_GAP',unlock:'수정 변수 조건',nextBlocks:['IF_CRYSTALS3']},
 {chapter:'기억의 광산',concept:'변수와 조건',title:'수정 = ?',name:'8. 세 개를 모으면 열려',text:'수정을 주울 때마다 수정 값이 1씩 올라가요. 3개가 되었을 때 문을 여세요.',objective:'수정 3개를 모아 문을 열고 출구로',length:13,start:1,goal:11,gaps:[],crystals:[3,5,7],doors:[{x:9,need:3}],enemies:[],memory:12,par:10,available:['FWD','COLLECT','OPEN','REP3','IF_CRYSTALS3'],requireType:'IF_CRYSTALS3',unlock:'나의 함수',nextBlocks:['CALL_FN']},
 {chapter:'함수의 성',concept:'함수',title:'내 기술 만들기',name:'9. 자주 쓰는 행동을 묶자',text:'함수 탭에 자주 쓰는 전투 행동을 만들고 메인 코드에서는 나의 함수를 호출하세요.',objective:'나의 함수를 사용해 3마리 돌파',length:15,start:1,goal:13,gaps:[],crystals:[],doors:[],enemies:[{x:4,type:'ghost',hp:1},{x:8,type:'ghost',hp:1},{x:12,type:'ghost',hp:1}],memory:8,par:5,functionMemory:6,available:['FWD','ATTACK','REP3','IF_ENEMY','CALL_FN'],requireType:'CALL_FN',requireFunction:true,unlock:'최종 원정 개방',nextBlocks:[]},
 {chapter:'버그의 탑',concept:'종합',title:'버그 골렘',name:'10. 배운 걸 전부 써!',text:'달리고, 줍고, 판단하고, 싸우세요. 지금까지 배운 코딩 개념을 전부 이용하는 마지막 스테이지입니다.',objective:'수정 3개 → 문 열기 → 골렘 격파 → 출구',length:18,start:1,goal:16,gaps:[6],crystals:[2,3,4],doors:[{x:10,need:3}],enemies:[{x:14,type:'golem',hp:3}],memory:20,par:13,functionMemory:8,available:Object.keys(A),requireType:'IF_CRYSTALS3',unlock:'코드 원정대 완주!',nextBlocks:[]}
];
window.CodeQuestData={blocks:A,missions:M};
})();
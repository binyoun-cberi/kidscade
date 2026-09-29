(()=>{'use strict';

const LEVELS=[
 {id:1,chapter:'기초 추리',owner:'하린',avatar:'🧒',grid:[3,3],solution:[6,4,8,7,5,2],structure:{sequence:5,choice:0,repeat:0},initial:['points','diagonals','startType','endType'],extras:['turns','firstDir','endExact'],mission:'가장 기본적인 패턴 추리예요. 점 개수와 대각선 횟수부터 조합해 보세요.'},
 {id:2,chapter:'기초 추리',owner:'도윤',avatar:'👦',grid:[3,3],solution:[0,4,2,1,5,7],structure:{sequence:5,choice:0,repeat:0},initial:['points','diagonals','turns','startType'],extras:['straight','lastDir','startExact'],mission:'대각선이 많은 패턴이에요. 직선 이동과 방향 전환 횟수도 함께 생각하세요.'},
 {id:3,chapter:'기초 추리',owner:'유나',avatar:'👧',grid:[3,3],solution:[0,3,7,5,2,1,4],structure:{sequence:6,choice:0,repeat:0},initial:['points','diagonals','turns','endType'],extras:['firstDir','center','startExact'],mission:'방향이 자주 바뀌는 패턴입니다. 꺾이는 횟수가 중요한 단서예요.'},
 {id:4,chapter:'기초 추리',owner:'민재',avatar:'🧑',grid:[3,3],solution:[3,7,6,4,0,1,5,8],structure:{sequence:7,choice:0,repeat:0},initial:['points','diagonals','straight','startType'],extras:['turns','center','endExact'],mission:'점이 많아졌어요. 대각선과 직선이 각각 몇 번인지 세어 추리하세요.'},
 {id:5,chapter:'기초 추리',owner:'소율',avatar:'👧',grid:[4,4],solution:[4,0,5,2,1,6,7,11],structure:{sequence:7,choice:0,repeat:0},initial:['points','diagonals','startType','corners'],extras:['turns','firstDir','endExact'],mission:'4×4 잠금판입니다. 모서리를 몇 번 지나는지도 단서가 됩니다.'},
 {id:6,chapter:'기초 추리',owner:'지우',avatar:'🧒',grid:[4,4],solution:[1,4,8,13,10,9,14,11],structure:{sequence:7,choice:0,repeat:0},initial:['points','diagonals','turns','endType'],extras:['straight','lastDir','startExact'],mission:'ㄹ자처럼 훑는 문제가 아닙니다. 여러 특징을 동시에 만족하는 패턴을 찾아보세요.'},

 {id:7,chapter:'선택 추리',owner:'서아',avatar:'👧',grid:[3,3],solution:[0,4,2,1,3,7,8],structure:{sequence:4,choice:2,repeat:0},initial:['points','diagonals','choiceCount','startType'],extras:['turns','middleDir','endExact'],mission:'선택 구조가 2번 들어갑니다. 갈림길이 생기는 지점을 상상해 보세요.'},
 {id:8,chapter:'선택 추리',owner:'준호',avatar:'👦',grid:[3,3],solution:[6,4,0,1,5,7,3],structure:{sequence:4,choice:2,repeat:0},initial:['points','diagonals','choiceCount','endType'],extras:['firstDir','turns','startExact'],mission:'같은 선택 횟수라도 전혀 다른 모양이 나올 수 있어요. 다른 단서와 함께 판단하세요.'},
 {id:9,chapter:'선택 추리',owner:'채원',avatar:'🧒',grid:[4,4],solution:[1,4,0,5,8,13,10,15,14,11],structure:{sequence:7,choice:2,repeat:0},initial:['points','diagonals','choiceCount','turns'],extras:['corners','middleDir','endExact'],mission:'선택 2회와 많은 순차 이동이 섞인 긴 패턴입니다.'},
 {id:10,chapter:'선택 추리',owner:'예준',avatar:'👦',grid:[4,4],solution:[8,13,12,9,4,0,5,2,3,7,6,10],structure:{sequence:8,choice:3,repeat:0},initial:['points','diagonals','choiceCount','startType'],extras:['turns','straight','endExact'],mission:'선택이 3번 들어갑니다. 한 번의 예상으로 맞히기보다 비교 정보를 이용해 좁혀 가세요.'},
 {id:11,chapter:'선택 추리',owner:'다은',avatar:'👧',grid:[5,5],solution:[8,7,1,0,5,11,10,6,2,3,9],structure:{sequence:7,choice:3,repeat:0},initial:['points','diagonals','choiceCount','corners'],extras:['turns','firstDir','startExact'],mission:'5×5에서는 가능한 패턴이 훨씬 많아요. 조건을 하나씩 지워가며 추리하세요.'},
 {id:12,chapter:'선택 추리',owner:'현우',avatar:'🧑',grid:[5,5],solution:[11,15,20,16,22,18,13,7,8,14,19],structure:{sequence:6,choice:4,repeat:0},initial:['points','diagonals','choiceCount','turns'],extras:['straight','center','endExact'],mission:'선택 구조가 4번 들어가는 고난도 문제입니다. 비교 정보가 특히 중요해요.'},

 {id:13,chapter:'반복 추리',owner:'로아',avatar:'👧',grid:[5,5],solution:[0,1,5,6,10,11,15],structure:{sequence:0,choice:0,repeat:3},initial:['points','diagonals','repeatCount','repeatUnit'],extras:['startType','firstDir','endExact'],mission:'같은 2동작 묶음이 3번 반복돼요. 반복되는 형태를 예상해 보세요.'},
 {id:14,chapter:'반복 추리',owner:'시우',avatar:'👦',grid:[5,5],solution:[6,12,7,13,8,14,9],structure:{sequence:0,choice:0,repeat:3},initial:['points','diagonals','repeatCount','repeatUnit'],extras:['turns','startExact','lastDir'],mission:'2동작 묶음이 3번 반복됩니다. 대각선 횟수로 어떤 묶음인지 좁혀 보세요.'},
 {id:15,chapter:'반복 추리',owner:'아린',avatar:'👧',grid:[5,5],solution:[1,7,6,12,18,17,23],structure:{sequence:0,choice:0,repeat:2},initial:['points','diagonals','repeatCount','repeatUnit'],extras:['turns','firstDir','startExact'],mission:'3동작짜리 묶음을 2번 반복합니다. 반복 단위의 길이부터 활용하세요.'},
 {id:16,chapter:'반복 추리',owner:'태오',avatar:'🧒',grid:[5,5],solution:[3,8,12,13,18,22,23],structure:{sequence:0,choice:0,repeat:2},initial:['points','diagonals','repeatCount','repeatUnit'],extras:['straight','middleDir','endExact'],mission:'반복 횟수는 같아도 방향 조합은 다릅니다. 대각선과 직선 비율을 보세요.'},
 {id:17,chapter:'반복 추리',owner:'나윤',avatar:'👧',grid:[5,5],solution:[15,10,16,12,7,13,9],structure:{sequence:0,choice:0,repeat:2},initial:['points','diagonals','repeatCount','repeatUnit'],extras:['turns','firstDir','endExact'],mission:'같은 3동작 구조가 위치를 옮기며 반복됩니다. 시작 위치는 추가 단서로 열 수 있어요.'},
 {id:18,chapter:'종합 추리',owner:'루미',avatar:'🕵️',grid:[5,5],solution:[2,6,7,11,12,16,17,21,20,15,10,5,0,1],structure:{sequence:5,choice:2,repeat:3},initial:['points','diagonals','choiceCount','repeatCount'],extras:['turns','corners','startExact','endExact'],mission:'순차·선택·반복이 모두 들어간 마지막 비밀 패턴입니다. 단서와 오답 비교를 전부 활용하세요.'}
];

const SAVE_KEY='pattern_lock_v4';
const $=id=>document.getElementById(id);
const ui={
 menu:$('menuScreen'),game:$('gameScreen'),tutorial:$('tutorial'),handoff:$('handoffOverlay'),success:$('successOverlay'),
 grid:$('levelGrid'),progress:$('progressText'),stars:$('starText'),continue:$('continueBtn'),
 badge:$('levelBadge'),title:$('levelTitle'),counter:$('levelCounter'),ownerAvatar:$('ownerAvatar'),ownerLabel:$('ownerLabel'),phase:$('phaseText'),attempt:$('attemptBadge'),
 mission:$('missionText'),chips:$('logicChips'),clues:$('clueList'),feedback:$('feedbackCard'),
 board:$('board'),wrap:$('boardWrap'),trace:$('trace'),traceShadow:$('traceShadow'),toast:$('toast'),
 algorithm:$('algorithmText'),moves:$('moveCount'),undo:$('undoBtn'),reset:$('resetBtn'),clueBtn:$('clueBtn'),tip:$('releaseTip'),
 savePattern:$('savePatternBtn'),resultTitle:$('resultTitle'),resultEye:$('resultEyebrow'),resultMsg:$('resultMessage'),resultAlg:$('resultAlgorithm'),concept:$('conceptExplain'),earned:$('earnedStars'),next:$('nextBtn'),burst:$('burst')
};

let save=loadSave();
let state={mode:'menu',levelIndex:Math.max(0,Math.min(LEVELS.length-1,(save.unlocked||1)-1)),level:null,path:[],positions:[],dragging:false,pointerId:null,attempts:0,extraClues:0,freePattern:null,lastToast:0,sessionStarted:false};

function loadSave(){try{const v=window.KidscadeStorage?.getJson?.(SAVE_KEY,null);if(v&&typeof v==='object')return normalizeSave(v)}catch(_){}try{const v=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');if(v)return normalizeSave(v)}catch(_){}return{unlocked:1,stars:{},tutorialSeen:false}}
function normalizeSave(v){return{unlocked:Math.max(1,Math.min(LEVELS.length,Number(v.unlocked)||1)),stars:v.stars&&typeof v.stars==='object'?v.stars:{},tutorialSeen:!!v.tutorialSeen}}
function persist(){try{if(window.KidscadeStorage?.setJson){window.KidscadeStorage.setJson(SAVE_KEY,save);return}}catch(_){}try{localStorage.setItem(SAVE_KEY,JSON.stringify(save))}catch(_){}}
function sound(name){try{window.KidscadeGame?.sound?.(name)}catch(_){}}
function sdkStart(){try{window.KidscadeGame?.start?.({mode:'pattern-deduction',levels:LEVELS.length})}catch(_){}}
function sdkScore(){try{window.KidscadeGame?.score?.(totalStars(),{unit:'별',higherIsBetter:true})}catch(_){}}
function sdkGameOver(){try{window.KidscadeGame?.gameOver?.({score:totalStars(),scoreOptions:{unit:'별',higherIsBetter:true},completed:true})}catch(_){}}
function totalStars(){return Object.values(save.stars||{}).reduce((a,b)=>a+(Number(b)||0),0)}
function completedCount(){return Object.keys(save.stars||{}).filter(k=>(save.stars[k]||0)>0).length}
function samePath(a,b){return a.length===b.length&&a.every((v,i)=>v===b[i])}

function renderMenu(){
 ui.progress.textContent=completedCount()+' / '+LEVELS.length;ui.stars.textContent=totalStars();ui.grid.innerHTML='';
 const maxIndex=Math.min(save.unlocked-1,LEVELS.length-1);state.levelIndex=Math.max(0,Math.min(state.levelIndex,maxIndex));
 LEVELS.forEach((level,i)=>{const b=document.createElement('button'),locked=i+1>save.unlocked;b.type='button';b.className='level-dot'+(locked?' locked':'')+(i===state.levelIndex?' current':'');b.dataset.kind=level.chapter.includes('선택')?'condition':level.chapter.includes('반복')||level.chapter.includes('종합')?'repeat':'sequence';b.disabled=locked;b.setAttribute('aria-label',level.id+'단계 '+level.owner+'의 패턴'+(locked?' 잠김':''));b.innerHTML='<span>'+level.id+'</span>'+(save.stars[level.id]?'<span class="tiny-star">'+'★'.repeat(save.stars[level.id])+'</span>':'');b.addEventListener('click',()=>{state.levelIndex=i;renderMenu();startLevel(i)});ui.grid.appendChild(b)});
 ui.continue.textContent='이어하기 · '+LEVELS[state.levelIndex].owner+'의 패턴';
}
function showMenu(){state.mode='menu';state.dragging=false;ui.success.classList.add('hidden');ui.handoff.classList.add('hidden');ui.game.classList.add('hidden');ui.menu.classList.remove('hidden');renderMenu()}

function startLevel(index){
 state.mode='campaign';state.levelIndex=index;state.level=LEVELS[index];state.path=[];state.attempts=0;state.extraClues=0;
 if(!state.sessionStarted){state.sessionStarted=true;sdkStart()}
 ui.menu.classList.add('hidden');ui.success.classList.add('hidden');ui.handoff.classList.add('hidden');ui.game.classList.remove('hidden');ui.savePattern.classList.add('hidden');ui.clueBtn.classList.remove('hidden');ui.tip.classList.remove('hidden');
 setupLevelUi();buildBoard();renderPlayerPath();renderClues();ui.feedback.classList.add('hidden');ui.phase.textContent='단서만 보고 패턴을 예상하세요';
}
function setupLevelUi(){
 const l=state.level;ui.badge.textContent=l.chapter;ui.badge.style.color=l.chapter.includes('선택')?'var(--pink)':l.chapter.includes('반복')||l.chapter.includes('종합')?'var(--amber)':'var(--cyan)';
 ui.title.textContent=l.owner+'의 패턴';ui.counter.textContent=l.id+' / '+LEVELS.length;ui.ownerAvatar.textContent=l.avatar;ui.ownerLabel.textContent=l.owner+'의 휴대폰';ui.attempt.textContent='도전 1';ui.mission.textContent=l.mission;renderLogicChips(l);
}
function renderLogicChips(l){
 const s=l.structure||{sequence:0,choice:0,repeat:0},items=[];
 if(s.sequence)items.push('<span class="logic-chip seq">순차 <b>'+s.sequence+'회</b></span>');
 if(s.choice)items.push('<span class="logic-chip choice">선택 <b>'+s.choice+'회</b></span>');
 if(s.repeat)items.push('<span class="logic-chip repeat">반복 <b>'+s.repeat+'회</b></span>');
 ui.chips.innerHTML=items.join('');
}

function analyze(path,cols){
 const rows=cols,pos=i=>({r:Math.floor(i/cols),c:i%cols}),dirs=[];let diagonals=0,horiz=0,vert=0,turns=0;
 for(let i=1;i<path.length;i++){
   const a=pos(path[i-1]),b=pos(path[i]),dr=Math.sign(b.r-a.r),dc=Math.sign(b.c-a.c);
   const sym=dirSymbol(dr,dc);dirs.push(sym);if(dr&&dc)diagonals++;else if(dc)horiz++;else if(dr)vert++;
 }
 for(let i=1;i<dirs.length;i++)if(dirs[i]!==dirs[i-1])turns++;
 const isCorner=i=>{const p=pos(i);return(p.r===0||p.r===rows-1)&&(p.c===0||p.c===cols-1)};
 const isEdge=i=>{const p=pos(i);return p.r===0||p.c===0||p.r===rows-1||p.c===cols-1};
 const center=cols%2===1?Math.floor(cols/2)*cols+Math.floor(cols/2):-1;
 return{points:path.length,moves:path.length-1,diagonals,horiz,vert,straight:horiz+vert,turns,dirs,corners:path.filter(isCorner).length,start:path[0],end:path[path.length-1],startType:isCorner(path[0])?'모서리':isEdge(path[0])?'가장자리':'안쪽',endType:isCorner(path[path.length-1])?'모서리':isEdge(path[path.length-1])?'가장자리':'안쪽',center:center>=0&&path.includes(center)};
}
function dirSymbol(dr,dc){if(dr<0&&dc<0)return'↖';if(dr<0&&dc===0)return'↑';if(dr<0&&dc>0)return'↗';if(dr===0&&dc<0)return'←';if(dr===0&&dc>0)return'→';if(dr>0&&dc<0)return'↙';if(dr>0&&dc===0)return'↓';if(dr>0&&dc>0)return'↘';return'•'}
function locationName(i,cols){
 const r=Math.floor(i/cols),c=i%cols,last=cols-1;
 if(r===0&&c===0)return'왼쪽 위 모서리';if(r===0&&c===last)return'오른쪽 위 모서리';if(r===last&&c===0)return'왼쪽 아래 모서리';if(r===last&&c===last)return'오른쪽 아래 모서리';
 if(cols%2===1&&r===Math.floor(cols/2)&&c===Math.floor(cols/2))return'한가운데';
 if(r===0)return'맨 윗줄 왼쪽에서 '+(c+1)+'번째';if(r===last)return'맨 아랫줄 왼쪽에서 '+(c+1)+'번째';if(c===0)return'맨 왼쪽줄 위에서 '+(r+1)+'번째';if(c===last)return'맨 오른쪽줄 위에서 '+(r+1)+'번째';
 return'위에서 '+(r+1)+'번째 줄, 왼쪽에서 '+(c+1)+'번째';
}
function clueText(key,l){
 const a=analyze(l.solution,l.grid[0]),s=l.structure||{};
 switch(key){
   case'points':return'찍는 점은 모두 '+a.points+'개';
   case'diagonals':return'대각선 이동은 '+a.diagonals+'번';
   case'straight':return'가로·세로 직선 이동은 '+a.straight+'번';
   case'turns':return'이동 방향이 바뀌는 순간은 '+a.turns+'번';
   case'startType':return'시작점은 '+a.startType+'에 있음';
   case'endType':return'마지막 점은 '+a.endType+'에 있음';
   case'corners':return'모서리 점을 '+a.corners+'번 사용함';
   case'center':return a.center?'한가운데 점을 지나감':'한가운데 점은 지나지 않음';
   case'firstDir':return'첫 이동 방향은 '+a.dirs[0];
   case'lastDir':return'마지막 이동 방향은 '+a.dirs[a.dirs.length-1];
   case'middleDir':return'가운데쯤 이동 하나는 '+a.dirs[Math.floor(a.dirs.length/2)];
   case'startExact':return'시작점은 '+locationName(a.start,l.grid[0]);
   case'endExact':return'마지막 점은 '+locationName(a.end,l.grid[0]);
   case'choiceCount':return'선택 구조를 '+(s.choice||0)+'번 사용함';
   case'repeatCount':return'반복 구조를 '+(s.repeat||0)+'번 사용함';
   case'repeatUnit':{
     const count=Math.max(1,s.repeat||1),unit=Math.max(1,Math.round(a.moves/count));
     return unit+'동작짜리 묶음을 반복하는 구조';
   }
   default:return'패턴의 특징을 하나 더 생각해 보세요.';
 }
}
function renderClues(){
 const l=state.level,keys=[...(l.initial||[]),...(l.extras||[]).slice(0,state.extraClues)];
 ui.clues.innerHTML=keys.map((k,i)=>'<div class="clue-item"><span>'+(i+1)+'</span><b>'+clueText(k,l)+'</b></div>').join('');
 const remaining=(l.extras||[]).length-state.extraClues;ui.clueBtn.disabled=remaining<=0;ui.clueBtn.textContent=remaining>0?'🔎 단서 하나 더 ('+remaining+')':'단서 모두 공개';
}

function freeCreate(){
 state.mode='free-create';state.level={chapter:'친구 문제',owner:'나',avatar:'😎',grid:[4,4],solution:[],structure:{sequence:0,choice:0,repeat:0},initial:[],extras:[],mission:'4개 이상의 점을 이어 비밀 패턴을 만드세요. 친구에게는 이 패턴 대신 자동 생성된 단서만 보여 줍니다.'};state.path=[];state.freePattern=null;state.attempts=0;state.extraClues=0;
 ui.menu.classList.add('hidden');ui.game.classList.remove('hidden');ui.success.classList.add('hidden');ui.handoff.classList.add('hidden');ui.badge.textContent='출제';ui.badge.style.color='var(--green)';ui.title.textContent='내 비밀 패턴';ui.counter.textContent='FREE';ui.ownerAvatar.textContent='😎';ui.ownerLabel.textContent='내 휴대폰';ui.phase.textContent='친구가 못 보게 패턴을 만드세요';ui.attempt.textContent='출제 중';ui.mission.textContent=state.level.mission;ui.chips.innerHTML='';ui.clues.innerHTML='';ui.feedback.classList.add('hidden');ui.savePattern.classList.remove('hidden');ui.savePattern.disabled=true;ui.clueBtn.classList.add('hidden');ui.tip.textContent='패턴을 만든 뒤 “이 패턴을 비밀 문제로 내기”를 누르세요.';buildBoard();renderPlayerPath();
}
function beginFreeHandoff(){if(state.path.length<4)return;state.freePattern=[...state.path];ui.handoff.classList.remove('hidden')}
function beginFreeVerify(){
 const sol=[...state.freePattern],a=analyze(sol,4);state.mode='free-verify';state.level={chapter:'친구 추리',owner:'친구',avatar:'🕵️',grid:[4,4],solution:sol,structure:{sequence:a.moves,choice:0,repeat:0},initial:['points','diagonals','turns','startType'],extras:['straight','firstDir','endExact'],mission:'친구가 만든 정답은 끝까지 숨겨져 있어요. 자동 생성된 단서와 비교 결과만 보고 맞혀 보세요.'};state.path=[];state.attempts=0;state.extraClues=0;
 ui.handoff.classList.add('hidden');ui.badge.textContent='친구 추리';ui.badge.style.color='var(--green)';ui.title.textContent='친구의 비밀 패턴';ui.ownerAvatar.textContent='🕵️';ui.ownerLabel.textContent='친구의 휴대폰';ui.phase.textContent='정답은 안 보여요. 단서만 보고 추리!';ui.attempt.textContent='도전 1';ui.mission.textContent=state.level.mission;renderLogicChips(state.level);ui.savePattern.classList.add('hidden');ui.clueBtn.classList.remove('hidden');ui.tip.textContent='누른 채로 예상 패턴을 그리고 손을 떼면 비교해요.';buildBoard();renderPlayerPath();renderClues();ui.feedback.classList.add('hidden');
}

function buildBoard(){
 ui.board.innerHTML='';state.positions=[];const cols=state.level.grid[0],rows=state.level.grid[1],margin=cols>=5?105:cols>=4?130:180;
 for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const idx=r*cols+c,x=margin+c*((1000-margin*2)/(cols-1)),y=margin+r*((1000-margin*2)/(rows-1));state.positions[idx]={x,y,r,c};const n=document.createElement('div');n.className='node';n.dataset.index=idx;n.style.left=(x/10)+'%';n.style.top=(y/10)+'%';n.innerHTML='<span class="node-num">'+(idx+1)+'</span>';ui.board.appendChild(n)}
 updateNodes();
}
function updateNodes(){ui.board.querySelectorAll('.node').forEach(n=>{const idx=Number(n.dataset.index),p=state.path.indexOf(idx);n.classList.toggle('visited',p>=0);n.classList.toggle('current',p===state.path.length-1&&p>=0)})}
function pointsString(path){return path.map(i=>state.positions[i].x+','+state.positions[i].y).join(' ')}
function drawPath(path){const pts=pointsString(path);ui.trace.setAttribute('points',pts);ui.traceShadow.setAttribute('points',pts);updateNodes()}
function renderPlayerPath(){
 drawPath(state.path);ui.moves.textContent=state.path.length+'개 점';ui.algorithm.textContent=state.path.length?directionsText(state.path):(state.mode==='free-create'?'첫 점을 골라 비밀 패턴을 만드세요.':'단서를 읽고 시작점을 골라 보세요.');
 if(state.mode==='free-create')ui.savePattern.disabled=state.path.length<4;
}
function directions(path){const out=[];for(let i=1;i<path.length;i++){const a=state.positions[path[i-1]],b=state.positions[path[i]],dr=Math.sign(b.r-a.r),dc=Math.sign(b.c-a.c);out.push(dirSymbol(dr,dc))}return out}
function directionsText(path){const d=directions(path);return d.length?d.join(' '):'시작'}
function alignedStep(a,b){const A=state.positions[a],B=state.positions[b],dr=B.r-A.r,dc=B.c-A.c;if(!dr&&!dc)return null;if(!(dr===0||dc===0||Math.abs(dr)===Math.abs(dc)))return null;return{sr:Math.sign(dr),sc:Math.sign(dc),steps:Math.max(Math.abs(dr),Math.abs(dc))}}
function appendToward(idx){
 if(idx==null||idx<0||idx>=state.positions.length)return false;if(!state.path.length){state.path.push(idx);sound('click');renderPlayerPath();return true}
 const last=state.path[state.path.length-1];if(idx===last)return true;if(state.path.includes(idx))return false;const step=alignedStep(last,idx);if(!step)return false;const A=state.positions[last],cols=state.level.grid[0];let r=A.r,c=A.c,added=false;
 for(let k=0;k<step.steps;k++){r+=step.sr;c+=step.sc;const j=r*cols+c;if(state.path.includes(j))return added;state.path.push(j);added=true}
 if(added){sound('click');renderPlayerPath()}return added;
}
function undo(){if(!state.path.length)return;state.path.pop();sound('click');renderPlayerPath()}
function resetPath(){state.path=[];sound('click');renderPlayerPath();toast(state.mode==='free-create'?'새 비밀 패턴을 만들어 보세요.':'새 예상 패턴을 그려 보세요.')}
function toast(msg){ui.toast.textContent=msg;ui.toast.classList.add('show');clearTimeout(state.lastToast);state.lastToast=setTimeout(()=>ui.toast.classList.remove('show'),1600)}

function comparison(guess,target,cols){
 const ga=analyze(guess,cols),ta=analyze(target,cols),limit=Math.min(guess.length,target.length);let sameOrder=0,sameEdges=0;
 for(let i=0;i<limit;i++)if(guess[i]===target[i])sameOrder++;
 for(let i=1;i<limit;i++)if(guess[i-1]===target[i-1]&&guess[i]===target[i])sameEdges++;
 return{ga,ta,sameOrder,sameEdges,start:guess[0]===target[0],end:guess[guess.length-1]===target[target.length-1]};
}
function signedCompare(a,b,unit){if(a===b)return unit+' 정확';return a<b?unit+' '+(b-a)+' 부족':unit+' '+(a-b)+' 많음'}
function showFeedback(guess){
 const c=comparison(guess,state.level.solution,state.level.grid[0]),items=[
   signedCompare(c.ga.points,c.ta.points,'점'),
   signedCompare(c.ga.diagonals,c.ta.diagonals,'대각선'),
   '같은 순서의 점 '+c.sameOrder+'개',
   '같은 선분 '+c.sameEdges+'개',
   '시작점 '+(c.start?'일치':'불일치'),
   '끝점 '+(c.end?'일치':'불일치')
 ];
 ui.feedback.innerHTML='<strong>도전 '+state.attempts+' 비교</strong><div>'+items.map(v=>'<span>'+v+'</span>').join('')+'</div>';
 ui.feedback.classList.remove('hidden');
}
function finishAttempt(){
 if(state.mode==='free-create'||state.path.length<2)return;const target=state.level.solution;if(samePath(state.path,target)){complete();return}
 state.attempts++;sound('wrong');navigator.vibrate?.([45,25,45]);showFeedback([...state.path]);ui.wrap.classList.add('failed');ui.attempt.textContent='도전 '+(state.attempts+1);ui.phase.textContent='비교 정보를 보고 다시 예상하세요';toast('아직 달라요! 비교 정보로 범위를 좁혀 보세요.');
 setTimeout(()=>{ui.wrap.classList.remove('failed');state.path=[];renderPlayerPath()},520);
}
function revealClue(){
 const extras=state.level.extras||[];if(state.extraClues>=extras.length)return;state.extraClues++;sound('click');renderClues();toast('새 단서가 열렸어요.');ui.phase.textContent='새 단서를 포함해 다시 추리하세요';
}
function rating(){const cost=state.attempts+state.extraClues;if(cost<=1)return 3;if(cost<=4)return 2;return 1}
function answerSummary(l){
 const a=analyze(l.solution,l.grid[0]);return directionsText(l.solution)+' · '+a.points+'점 · 대각선 '+a.diagonals+'번';
}
function complete(){
 sound('correct');navigator.vibrate?.([35,35,70]);
 if(state.mode==='campaign'){
   const l=state.level,r=rating();save.stars[l.id]=Math.max(Number(save.stars[l.id])||0,r);if(l.id<LEVELS.length)save.unlocked=Math.max(save.unlocked,l.id+1);persist();sdkScore();
   ui.resultEye.textContent=l.owner+'의 비밀 패턴 발견';ui.resultTitle.textContent=l.id===LEVELS.length?'패턴 락 마스터!':'잠금 해제!';ui.earned.textContent='★'.repeat(r)+'☆'.repeat(3-r);
   ui.resultMsg.textContent=state.attempts===0?'주어진 단서만으로 첫 예상에 맞혔어요!':'정답을 본 적 없이 단서와 비교 정보만으로 패턴을 찾아냈어요.';
   ui.resultAlg.textContent=answerSummary(l);ui.concept.textContent='단서를 조합하고 틀린 예상에서 얻은 정보를 이용해 가능한 패턴을 줄여 나가는 추리 과정이 핵심이에요.';ui.next.textContent=l.id===LEVELS.length?'처음 화면으로':'다음 사람';if(l.id===LEVELS.length)sdkGameOver();
 }else{
   ui.resultEye.textContent='친구의 비밀 패턴 발견';ui.resultTitle.textContent='친구 패턴 해제!';ui.earned.textContent='🔓';ui.resultMsg.textContent='정답을 직접 보지 않고 자동 생성된 단서와 비교 정보만으로 맞혔어요.';ui.resultAlg.textContent=answerSummary(state.level);ui.concept.textContent='친구가 만든 임의의 패턴도 점 개수·대각선·방향 변화 같은 특징을 데이터로 바꾸면 추리 문제가 됩니다.';ui.next.textContent='새 패턴 내기';
 }
 ui.success.classList.remove('hidden');burst();
}
function burst(){ui.burst.innerHTML='';const chars=['?','✦','★','◆','?','★','●','✦'];for(let i=0;i<24;i++){const p=document.createElement('span');p.className='particle';p.textContent=chars[i%chars.length];const a=(Math.PI*2*i/24)+(i%3)*.08,r=90+(i%6)*23;p.style.setProperty('--x',Math.cos(a)*r+'px');p.style.setProperty('--y',Math.sin(a)*r+'px');p.style.setProperty('--r',(i*43)+'deg');p.style.color=i%2?'#ffd66b':'#5ce1e6';ui.burst.appendChild(p)}}

function eventIndex(e){const rect=ui.wrap.getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width*1000,y=(e.clientY-rect.top)/rect.height*1000;let best=null,dist=1e9;state.positions.forEach((p,i)=>{const d=Math.hypot(x-p.x,y-p.y);if(d<dist){dist=d;best=i}});const cols=state.level.grid[0],threshold=cols>=5?78:cols>=4?92:120;return dist<=threshold?best:null}
ui.wrap.addEventListener('pointerdown',e=>{if(state.mode==='menu'||!ui.success.classList.contains('hidden'))return;const idx=eventIndex(e);if(idx==null)return;if(state.mode!=='free-create')state.path=[];state.dragging=true;state.pointerId=e.pointerId;ui.wrap.setPointerCapture?.(e.pointerId);appendToward(idx);e.preventDefault()});
ui.wrap.addEventListener('pointermove',e=>{if(!state.dragging||e.pointerId!==state.pointerId)return;const idx=eventIndex(e);if(idx!=null)appendToward(idx);e.preventDefault()});
function stopPointer(e){if(e.pointerId!==state.pointerId)return;state.dragging=false;state.pointerId=null;try{ui.wrap.releasePointerCapture?.(e.pointerId)}catch(_){}if(state.mode!=='free-create')finishAttempt()}
ui.wrap.addEventListener('pointerup',stopPointer);ui.wrap.addEventListener('pointercancel',stopPointer);

function keyboardMove(dr,dc){
 if(state.mode==='menu'||!ui.success.classList.contains('hidden'))return;const cols=state.level.grid[0],rows=state.level.grid[1];
 if(!state.path.length){appendToward(Math.floor(rows/2)*cols+Math.floor(cols/2));return}
 const cur=state.positions[state.path[state.path.length-1]],r=cur.r+dr,c=cur.c+dc;if(r<0||c<0||r>=rows||c>=cols){toast('판 밖으로는 갈 수 없어요.');return}appendToward(r*cols+c);
}
addEventListener('keydown',e=>{if(state.mode==='menu')return;if(e.code==='Backspace'){e.preventDefault();undo();return}if(e.code==='KeyR'){e.preventDefault();resetPath();return}if(e.code==='Enter'){e.preventDefault();finishAttempt();return}const map={ArrowUp:[-1,0],ArrowDown:[1,0],ArrowLeft:[0,-1],ArrowRight:[0,1],KeyQ:[-1,-1],KeyE:[-1,1],KeyZ:[1,-1],KeyC:[1,1]};if(map[e.code]){e.preventDefault();keyboardMove(...map[e.code])}},{passive:false});

$('continueBtn').addEventListener('click',()=>startLevel(state.levelIndex));
$('freeBtn').addEventListener('click',freeCreate);
$('helpBtn').addEventListener('click',()=>ui.tutorial.classList.remove('hidden'));
$('tutorialCloseBtn').addEventListener('click',()=>{save.tutorialSeen=true;persist();ui.tutorial.classList.add('hidden')});
$('backBtn').addEventListener('click',showMenu);
$('undoBtn').addEventListener('click',undo);
$('resetBtn').addEventListener('click',resetPath);
$('clueBtn').addEventListener('click',revealClue);
$('savePatternBtn').addEventListener('click',beginFreeHandoff);
$('handoffStartBtn').addEventListener('click',beginFreeVerify);
$('resultMenuBtn').addEventListener('click',showMenu);
$('nextBtn').addEventListener('click',()=>{ui.success.classList.add('hidden');if(state.mode==='campaign'){if(state.level.id>=LEVELS.length){showMenu();return}state.levelIndex=state.level.id;startLevel(state.levelIndex)}else freeCreate()});
addEventListener('blur',()=>{state.dragging=false;state.pointerId=null});

function updateClock(){const d=new Date(),h=String(d.getHours()).padStart(2,'0'),m=String(d.getMinutes()).padStart(2,'0');$('clock').textContent=h+':'+m}
updateClock();setInterval(updateClock,30000);renderMenu();if(!save.tutorialSeen)ui.tutorial.classList.remove('hidden');
})();
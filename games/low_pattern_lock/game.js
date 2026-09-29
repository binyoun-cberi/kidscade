(()=>{'use strict';

const LEVELS=[
 {id:1,chapter:'관찰',owner:'하린',avatar:'🧒',grid:[3,3],solution:[6,4,8,7,5,2],structure:{sequence:5,choice:0,repeat:0},showLength:true,speed:360,mission:'하린이 그리는 지그재그 패턴을 보고 시작점과 대각선을 함께 기억하세요.'},
 {id:2,chapter:'관찰',owner:'도윤',avatar:'👦',grid:[3,3],solution:[0,4,2,1,5,7],structure:{sequence:5,choice:0,repeat:0},showLength:true,speed:340,mission:'도윤의 패턴은 직선보다 대각선이 많아요. 선의 모양보다 점의 순서를 기억해요.'},
 {id:3,chapter:'관찰',owner:'유나',avatar:'👧',grid:[3,3],solution:[0,3,7,5,2,1,4],structure:{sequence:6,choice:0,repeat:0},showLength:true,speed:330,mission:'유나의 패턴은 방향이 계속 바뀌어요. 어디서 꺾였는지 기억하세요.'},
 {id:4,chapter:'관찰',owner:'민재',avatar:'🧑',grid:[3,3],solution:[3,7,6,4,0,1,5,8],structure:{sequence:7,choice:0,repeat:0},showLength:false,speed:310,mission:'점 개수도 숨겨집니다. 민재가 손을 떼는 마지막 점까지 기억하세요.'},
 {id:5,chapter:'관찰',owner:'소율',avatar:'👧',grid:[4,4],solution:[4,0,5,2,1,6,7,11],structure:{sequence:7,choice:0,repeat:0},showLength:false,speed:300,mission:'4×4 잠금판이에요. 위·아래·대각선이 섞인 소율의 패턴을 그대로 재현하세요.'},
 {id:6,chapter:'관찰',owner:'지우',avatar:'🧒',grid:[4,4],solution:[1,4,8,13,10,9,14,11],structure:{sequence:7,choice:0,repeat:0},showLength:false,speed:290,mission:'지우의 패턴은 ㄹ자와 전혀 달라요. 방향 변화 자체를 하나의 이야기처럼 기억해 보세요.'},

 {id:7,chapter:'선택',owner:'서아',avatar:'👧',grid:[3,3],solution:[0,4,2,1,3,7,8],structure:{sequence:4,choice:2,repeat:0},markers:{4:'★',3:'●'},choiceRule:'선택 단서 · ★에서는 ↗, ●에서는 ↘을 선택해요.',showLength:true,speed:310,mission:'서아는 표시가 있는 점에서 조건을 보고 방향을 선택해요. 패턴과 선택 규칙을 함께 기억하세요.'},
 {id:8,chapter:'선택',owner:'준호',avatar:'👦',grid:[3,3],solution:[6,4,0,1,5,7,3],structure:{sequence:4,choice:2,repeat:0},markers:{4:'★',5:'●'},choiceRule:'선택 단서 · ★에서는 ↖, ●에서는 ↙을 선택해요.',showLength:false,speed:300,mission:'준호의 두 갈림길을 찾아보세요. 같은 점을 보더라도 조건에 따라 다음 방향이 달라집니다.'},
 {id:9,chapter:'선택',owner:'채원',avatar:'🧒',grid:[4,4],solution:[1,4,0,5,8,13,10,15,14,11],structure:{sequence:7,choice:2,repeat:0},markers:{4:'▲',10:'◆'},choiceRule:'선택 단서 · ▲에서는 ↑, ◆에서는 ↘을 선택해요.',showLength:false,speed:285,mission:'채원의 패턴은 두 번 선택하고 나머지는 순차로 이어집니다. 선택 지점을 기준으로 덩어리째 기억하세요.'},
 {id:10,chapter:'선택',owner:'예준',avatar:'👦',grid:[4,4],solution:[8,13,12,9,4,0,5,2,3,7,6,10],structure:{sequence:8,choice:3,repeat:0},markers:{13:'★',9:'●',2:'◆'},choiceRule:'선택 단서 · ★→← · ●→↖ · ◆→→',showLength:false,speed:270,mission:'선택이 세 번 들어간 긴 패턴이에요. 표시를 기준으로 앞뒤 순서를 나눠 기억하세요.'},
 {id:11,chapter:'선택',owner:'다은',avatar:'👧',grid:[5,5],solution:[8,7,1,0,5,11,10,6,2,3,9],structure:{sequence:7,choice:3,repeat:0},markers:{7:'▲',11:'●',6:'★'},choiceRule:'선택 단서 · ▲→↖ · ●→← · ★→↗',showLength:false,speed:255,mission:'5×5 잠금판으로 커졌어요. 다은의 선택 지점 세 곳을 기준점으로 삼아 기억하세요.'},
 {id:12,chapter:'선택',owner:'현우',avatar:'🧑',grid:[5,5],solution:[11,15,20,16,22,18,13,7,8,14,19],structure:{sequence:6,choice:4,repeat:0},markers:{15:'●',22:'★',13:'◆',8:'▲'},choiceRule:'선택 단서 · ●→↓ · ★→↗ · ◆→↖ · ▲→↘',showLength:false,speed:245,mission:'현우의 패턴에는 선택이 네 번 들어갑니다. 조건표를 보고 전체 패턴을 복원하세요.'},

 {id:13,chapter:'반복',owner:'로아',avatar:'👧',grid:[5,5],solution:[0,1,5,6,10,11,15],structure:{sequence:0,choice:0,repeat:3},repeatHint:'반복 단서 · (→ ↙) ×3',showLength:true,speed:285,mission:'로아의 패턴은 짧은 두 동작을 세 번 반복해요. 낱개보다 반복 묶음으로 기억하세요.'},
 {id:14,chapter:'반복',owner:'시우',avatar:'👦',grid:[5,5],solution:[6,12,7,13,8,14,9],structure:{sequence:0,choice:0,repeat:3},repeatHint:'반복 단서 · (↘ ↑) ×3',showLength:false,speed:270,mission:'시우의 패턴은 대각선과 위쪽 이동이 번갈아 반복됩니다. 반복 횟수까지 정확해야 해요.'},
 {id:15,chapter:'반복',owner:'아린',avatar:'👧',grid:[5,5],solution:[1,7,6,12,18,17,23],structure:{sequence:0,choice:0,repeat:2},repeatHint:'반복 단서 · (↘ ← ↘) ×2',showLength:false,speed:255,mission:'세 동작짜리 묶음을 두 번 반복합니다. 한 묶음의 순서를 먼저 잡아 보세요.'},
 {id:16,chapter:'반복',owner:'태오',avatar:'🧒',grid:[5,5],solution:[3,8,12,13,18,22,23],structure:{sequence:0,choice:0,repeat:2},repeatHint:'반복 단서 · (↓ ↙ →) ×2',showLength:false,speed:245,mission:'태오의 패턴은 아래·대각선·오른쪽이 한 세트예요. 같은 세트를 정확히 두 번 실행하세요.'},
 {id:17,chapter:'반복',owner:'나윤',avatar:'👧',grid:[5,5],solution:[15,10,16,12,7,13,9],structure:{sequence:0,choice:0,repeat:2},repeatHint:'반복 단서 · (↑ ↘ ↗) ×2',showLength:false,speed:235,mission:'나윤은 위로 올라갔다가 두 번 대각선으로 꺾는 묶음을 반복해요. 위치가 바뀌어도 구조는 같아요.'},
 {id:18,chapter:'종합',owner:'루미',avatar:'🕵️',grid:[5,5],solution:[2,6,7,11,12,16,17,21,20,15,10,5,0,1],structure:{sequence:5,choice:2,repeat:3},markers:{21:'★',5:'◆'},repeatHint:'반복 단서 · 처음은 (↙ →) ×3',choiceRule:'선택 단서 · ★에서는 ←, ◆에서는 ↑를 선택해요.',showLength:false,speed:220,mission:'마지막 보안 패턴! 반복 3회 뒤에 선택과 순차가 이어집니다. 구조를 나눠서 루미의 패턴을 완전히 복원하세요.'}
];

const SAVE_KEY='pattern_lock_v3';
const $=id=>document.getElementById(id);
const ui={
 menu:$('menuScreen'),game:$('gameScreen'),tutorial:$('tutorial'),handoff:$('handoffOverlay'),success:$('successOverlay'),
 grid:$('levelGrid'),progress:$('progressText'),stars:$('starText'),continue:$('continueBtn'),
 badge:$('levelBadge'),title:$('levelTitle'),counter:$('levelCounter'),ownerAvatar:$('ownerAvatar'),ownerLabel:$('ownerLabel'),phase:$('phaseText'),length:$('lengthBadge'),
 mission:$('missionText'),chips:$('logicChips'),command:$('commandCard'),
 board:$('board'),wrap:$('boardWrap'),trace:$('trace'),traceShadow:$('traceShadow'),toast:$('toast'),
 algorithm:$('algorithmText'),moves:$('moveCount'),undo:$('undoBtn'),reset:$('resetBtn'),replay:$('replayBtn'),tip:$('releaseTip'),
 savePattern:$('savePatternBtn'),resultTitle:$('resultTitle'),resultEye:$('resultEyebrow'),resultMsg:$('resultMessage'),resultAlg:$('resultAlgorithm'),concept:$('conceptExplain'),earned:$('earnedStars'),next:$('nextBtn'),burst:$('burst')
};
let save=loadSave();
let state={mode:'menu',levelIndex:Math.max(0,Math.min(LEVELS.length-1,(save.unlocked||1)-1)),level:null,path:[],positions:[],dragging:false,pointerId:null,previewing:false,previewPath:[],previewTimers:[],attempts:0,rewatches:0,freePattern:null,lastToast:0,sessionStarted:false};

function loadSave(){try{const v=window.KidscadeStorage?.getJson?.(SAVE_KEY,null);if(v&&typeof v==='object')return normalizeSave(v)}catch(_){}try{const v=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');if(v)return normalizeSave(v)}catch(_){}return{unlocked:1,stars:{},tutorialSeen:false}}
function normalizeSave(v){return{unlocked:Math.max(1,Math.min(LEVELS.length,Number(v.unlocked)||1)),stars:v.stars&&typeof v.stars==='object'?v.stars:{},tutorialSeen:!!v.tutorialSeen}}
function persist(){try{if(window.KidscadeStorage?.setJson){window.KidscadeStorage.setJson(SAVE_KEY,save);return}}catch(_){}try{localStorage.setItem(SAVE_KEY,JSON.stringify(save))}catch(_){}}
function sound(name){try{window.KidscadeGame?.sound?.(name)}catch(_){}}
function sdkStart(){try{window.KidscadeGame?.start?.({mode:'pattern-match',levels:LEVELS.length})}catch(_){}}
function sdkScore(){try{window.KidscadeGame?.score?.(totalStars(),{unit:'별',higherIsBetter:true})}catch(_){}}
function sdkGameOver(){try{window.KidscadeGame?.gameOver?.({score:totalStars(),scoreOptions:{unit:'별',higherIsBetter:true},completed:true})}catch(_){}}
function totalStars(){return Object.values(save.stars||{}).reduce((a,b)=>a+(Number(b)||0),0)}
function completedCount(){return Object.keys(save.stars||{}).filter(k=>(save.stars[k]||0)>0).length}
function samePath(a,b){return a.length===b.length&&a.every((v,i)=>v===b[i])}
function clearPreviewTimers(){for(const t of state.previewTimers)clearTimeout(t);state.previewTimers=[]}
function later(fn,ms){const t=setTimeout(fn,ms);state.previewTimers.push(t);return t}

function renderMenu(){
 ui.progress.textContent=completedCount()+' / '+LEVELS.length;ui.stars.textContent=totalStars();ui.grid.innerHTML='';
 const maxIndex=Math.min(save.unlocked-1,LEVELS.length-1);state.levelIndex=Math.max(0,Math.min(state.levelIndex,maxIndex));
 LEVELS.forEach((level,i)=>{const b=document.createElement('button'),locked=i+1>save.unlocked;b.type='button';b.className='level-dot'+(locked?' locked':'')+(i===state.levelIndex?' current':'');b.dataset.kind=level.chapter==='관찰'?'sequence':level.chapter==='선택'?'condition':'repeat';b.disabled=locked;b.setAttribute('aria-label',level.id+'단계 '+level.owner+'의 패턴'+(locked?' 잠김':''));b.innerHTML='<span>'+level.id+'</span>'+(save.stars[level.id]?'<span class="tiny-star">'+'★'.repeat(save.stars[level.id])+'</span>':'');b.addEventListener('click',()=>{state.levelIndex=i;renderMenu();startLevel(i)});ui.grid.appendChild(b)});
 ui.continue.textContent='이어하기 · '+LEVELS[state.levelIndex].owner+'의 패턴';
}
function showMenu(){clearPreviewTimers();state.mode='menu';state.previewing=false;state.dragging=false;ui.success.classList.add('hidden');ui.handoff.classList.add('hidden');ui.game.classList.add('hidden');ui.menu.classList.remove('hidden');renderMenu()}
function startLevel(index){
 clearPreviewTimers();state.mode='campaign';state.levelIndex=index;state.level=LEVELS[index];state.path=[];state.previewPath=[];state.attempts=0;state.rewatches=0;state.previewing=false;
 if(!state.sessionStarted){state.sessionStarted=true;sdkStart()}
 ui.menu.classList.add('hidden');ui.success.classList.add('hidden');ui.handoff.classList.add('hidden');ui.game.classList.remove('hidden');ui.savePattern.classList.add('hidden');ui.tip.classList.remove('hidden');
 setupLevelUi();buildBoard();renderPlayerPath();later(()=>showPreview(false),450);
}
function setupLevelUi(){
 const l=state.level;ui.badge.textContent=l.chapter;ui.badge.style.color=l.chapter==='관찰'?'var(--cyan)':l.chapter==='선택'?'var(--pink)':'var(--amber)';
 ui.title.textContent=l.owner+'의 패턴';ui.counter.textContent=l.id+' / '+LEVELS.length;ui.ownerAvatar.textContent=l.avatar;ui.ownerLabel.textContent=l.owner+'의 휴대폰';ui.phase.textContent='잠금 푸는 모습을 잘 보세요';
 ui.length.textContent=l.showLength?l.solution.length+'점':'점 개수 비공개';ui.length.classList.toggle('mystery',!l.showLength);ui.mission.textContent=l.mission;renderLogicChips(l);
 const clues=[l.repeatHint,l.choiceRule].filter(Boolean);if(clues.length){ui.command.innerHTML=clues.map(v=>'<span>'+v+'</span>').join('');ui.command.classList.remove('hidden')}else ui.command.classList.add('hidden');
}
function renderLogicChips(l){
 const s=l.structure||{sequence:0,choice:0,repeat:0};
 ui.chips.innerHTML='<span class="logic-chip seq">순차 <b>'+s.sequence+'</b></span><span class="logic-chip choice">선택 <b>'+s.choice+'</b></span><span class="logic-chip repeat">반복 <b>'+s.repeat+'</b></span>';
}
function freeCreate(){
 clearPreviewTimers();state.mode='free-create';state.level={chapter:'친구 문제',owner:'나',avatar:'😎',grid:[4,4],solution:[],structure:{sequence:0,choice:0,repeat:0},showLength:false,mission:'4개 이상의 점을 한 번의 드래그로 이어 나만의 패턴을 만드세요.'};state.path=[];state.previewPath=[];state.freePattern=null;state.attempts=0;state.rewatches=0;state.previewing=false;
 ui.menu.classList.add('hidden');ui.game.classList.remove('hidden');ui.success.classList.add('hidden');ui.handoff.classList.add('hidden');ui.badge.textContent='친구 문제';ui.badge.style.color='var(--green)';ui.title.textContent='내 패턴 만들기';ui.counter.textContent='FREE';ui.ownerAvatar.textContent='😎';ui.ownerLabel.textContent='내 휴대폰';ui.phase.textContent='친구가 못 보게 패턴을 만드세요';ui.length.textContent='4점 이상';ui.length.classList.remove('mystery');ui.mission.textContent=state.level.mission;ui.chips.innerHTML='';ui.command.classList.add('hidden');ui.savePattern.classList.remove('hidden');ui.savePattern.disabled=true;ui.replay.disabled=true;ui.tip.textContent='한 번에 이어 그린 뒤 “이 패턴을 문제로 내기”를 누르세요.';buildBoard();renderPlayerPath();toast('친구는 화면을 보지 않게 해주세요.');
}
function beginFreeHandoff(){if(state.path.length<4)return;state.freePattern=[...state.path];ui.handoff.classList.remove('hidden')}
function beginFreeVerify(){
 state.mode='free-verify';state.level={chapter:'친구 도전',owner:'친구',avatar:'🕵️',grid:[4,4],solution:[...state.freePattern],structure:{sequence:state.freePattern.length-1,choice:0,repeat:0},showLength:false,mission:'친구가 만든 패턴을 기억해서 똑같이 맞혀 보세요.'};state.path=[];state.previewPath=[];state.attempts=0;state.rewatches=0;state.previewing=false;
 ui.handoff.classList.add('hidden');ui.badge.textContent='친구 도전';ui.title.textContent='친구의 패턴';ui.ownerAvatar.textContent='🕵️';ui.ownerLabel.textContent='친구의 휴대폰';ui.phase.textContent='패턴을 잘 보세요';ui.length.textContent='점 개수 비공개';ui.length.classList.add('mystery');ui.mission.textContent=state.level.mission;renderLogicChips(state.level);ui.command.classList.add('hidden');ui.savePattern.classList.add('hidden');ui.replay.disabled=false;ui.tip.textContent='누른 채로 점을 이어 그리고 마지막 점에서 손을 떼면 확인해요.';buildBoard();renderPlayerPath();later(()=>showPreview(false),420);
}

function buildBoard(){
 ui.board.innerHTML='';state.positions=[];const cols=state.level.grid[0],rows=state.level.grid[1],margin=cols>=5?105:cols>=4?130:180;
 for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const idx=r*cols+c,x=margin+c*((1000-margin*2)/(cols-1)),y=margin+r*((1000-margin*2)/(rows-1));state.positions[idx]={x,y,r,c};const n=document.createElement('div');n.className='node';n.dataset.index=idx;n.style.left=(x/10)+'%';n.style.top=(y/10)+'%';n.innerHTML='<span class="node-num">'+(idx+1)+'</span>';const marker=state.level.markers?.[idx];if(marker){n.classList.add('has-marker');n.insertAdjacentHTML('beforeend','<span class="marker">'+marker+'</span>')}ui.board.appendChild(n)}
 updateNodes([]);
}
function updateNodes(path){
 ui.board.querySelectorAll('.node').forEach(n=>{const idx=Number(n.dataset.index),p=path.indexOf(idx);n.classList.toggle('visited',p>=0);n.classList.toggle('current',p===path.length-1&&p>=0);n.classList.toggle('preview-node',state.previewing&&p>=0)});
}
function pointsString(path){return path.map(i=>state.positions[i].x+','+state.positions[i].y).join(' ')}
function drawPath(path,preview=false){const pts=pointsString(path);ui.trace.setAttribute('points',pts);ui.traceShadow.setAttribute('points',pts);ui.wrap.classList.toggle('previewing',preview);updateNodes(path)}
function renderPlayerPath(){
 if(state.previewing)return;drawPath(state.path,false);ui.moves.textContent=state.path.length+'개 점';
 if(state.mode==='free-create')ui.algorithm.textContent=state.path.length?directionsText(state.path):'첫 점을 골라 패턴을 만드세요.';
 else ui.algorithm.textContent=state.path.length?directionsText(state.path):'기억한 시작점부터 그리세요.';
 if(state.mode==='free-create')ui.savePattern.disabled=state.path.length<4;
}
function directions(path){const out=[];for(let i=1;i<path.length;i++){const a=state.positions[path[i-1]],b=state.positions[path[i]],dr=Math.sign(b.r-a.r),dc=Math.sign(b.c-a.c);out.push(dirSymbol(dr,dc))}return out}
function directionsText(path){const d=directions(path);return d.length?d.join(' '):'시작'}
function dirSymbol(dr,dc){if(dr<0&&dc<0)return'↖';if(dr<0&&dc===0)return'↑';if(dr<0&&dc>0)return'↗';if(dr===0&&dc<0)return'←';if(dr===0&&dc>0)return'→';if(dr>0&&dc<0)return'↙';if(dr>0&&dc===0)return'↓';if(dr>0&&dc>0)return'↘';return'•'}
function alignedStep(a,b){
 const A=state.positions[a],B=state.positions[b],dr=B.r-A.r,dc=B.c-A.c;if(!dr&&!dc)return null;
 if(!(dr===0||dc===0||Math.abs(dr)===Math.abs(dc)))return null;return{sr:Math.sign(dr),sc:Math.sign(dc),steps:Math.max(Math.abs(dr),Math.abs(dc))};
}
function appendToward(idx){
 if(idx==null||idx<0||idx>=state.positions.length||state.previewing)return false;
 if(!state.path.length){state.path.push(idx);sound('click');renderPlayerPath();return true}
 const last=state.path[state.path.length-1];if(idx===last)return true;if(state.path.includes(idx))return false;
 const step=alignedStep(last,idx);if(!step)return false;
 const A=state.positions[last],cols=state.level.grid[0];let r=A.r,c=A.c,added=false;
 for(let k=0;k<step.steps;k++){r+=step.sr;c+=step.sc;const j=r*cols+c;if(state.path.includes(j))return added;state.path.push(j);added=true}
 if(added){sound('click');renderPlayerPath()}return added;
}
function undo(){if(state.previewing||!state.path.length)return;state.path.pop();sound('click');renderPlayerPath()}
function resetPath(){if(state.previewing)return;state.path=[];sound('click');renderPlayerPath();toast(state.mode==='free-create'?'새 패턴을 만들어 보세요.':'다시 기억해서 그려 보세요.')}
function toast(msg){ui.toast.textContent=msg;ui.toast.classList.add('show');clearTimeout(state.lastToast);state.lastToast=setTimeout(()=>ui.toast.classList.remove('show'),1450)}

function showPreview(isReplay){
 if(state.previewing||!state.level?.solution?.length)return;if(state.mode==='free-create')return;
 clearPreviewTimers();if(isReplay)state.rewatches++;state.previewing=true;state.dragging=false;state.path=[];state.previewPath=[];ui.replay.disabled=true;ui.undo.disabled=true;ui.reset.disabled=true;ui.phase.textContent=(state.mode==='campaign'?state.level.owner:'친구')+'의 패턴을 기억하세요!';ui.algorithm.textContent='눈으로 보고 머릿속에 묶어서 기억해요.';ui.moves.textContent='관찰 중';drawPath([],true);sound('click');
 const sol=state.level.solution,speed=state.level.speed||280;
 sol.forEach((node,i)=>later(()=>{state.previewPath=sol.slice(0,i+1);drawPath(state.previewPath,true);if(i>0)sound('click')},180+i*speed));
 later(()=>{drawPath([],true)},180+sol.length*speed+420);
 later(()=>{state.previewing=false;state.previewPath=[];ui.replay.disabled=false;ui.undo.disabled=false;ui.reset.disabled=false;ui.phase.textContent='이제 똑같이 그려 보세요';drawPath([],false);renderPlayerPath();toast('시작점부터 마지막 점까지 똑같이!')},180+sol.length*speed+720);
}
function finishAttempt(){
 if(state.previewing||state.mode==='free-create'||state.path.length<2)return;
 const target=state.level.solution;if(samePath(state.path,target)){complete();return}
 state.attempts++;sound('wrong');navigator.vibrate?.([45,25,45]);ui.wrap.classList.add('failed');toast('패턴이 일치하지 않아요. 어디가 다른지는 비밀!');
 later(()=>{ui.wrap.classList.remove('failed');state.path=[];renderPlayerPath();ui.phase.textContent='다시 도전해 보세요'},650);
}
function rating(){if(state.attempts===0&&state.rewatches===0)return 3;if(state.attempts<=1&&state.rewatches<=1)return 2;return 1}
function logicResult(l){
 const s=l.structure||{};const parts=[];
 if(s.repeat)parts.push((l.repeatHint||('반복 '+s.repeat+'회')).replace('반복 단서 · ',''));
 if(s.choice)parts.push((l.choiceRule||('선택 '+s.choice+'회')).replace('선택 단서 · ',''));
 if(s.sequence)parts.push('순차 이동 '+s.sequence+'회');
 return parts.join(' · ')||directionsText(l.solution);
}
function complete(){
 clearPreviewTimers();sound('correct');navigator.vibrate?.([35,35,70]);
 if(state.mode==='campaign'){
   const l=state.level,r=rating();save.stars[l.id]=Math.max(Number(save.stars[l.id])||0,r);if(l.id<LEVELS.length)save.unlocked=Math.max(save.unlocked,l.id+1);persist();sdkScore();
   ui.resultEye.textContent=l.owner+'의 패턴과 일치';ui.resultTitle.textContent=l.id===LEVELS.length?'패턴 락 마스터!':'잠금 해제!';ui.earned.textContent='★'.repeat(r)+'☆'.repeat(3-r);
   ui.resultMsg.textContent=r===3?'한 번 보고 정확하게 재현했어요.':r===2?'패턴을 다시 분석해서 정확히 맞혔어요.':'여러 번 도전했지만 결국 정확한 순서를 찾아냈어요.';
   ui.resultAlg.textContent=logicResult(l);ui.concept.textContent='정답은 “모든 점을 지나는 길”이 아니라 '+l.owner+'가 실제로 그린 점의 순서와 방향을 똑같이 재현하는 것이에요.';ui.next.textContent=l.id===LEVELS.length?'처음 화면으로':'다음 사람';if(l.id===LEVELS.length)sdkGameOver();
 }else{
   ui.resultEye.textContent='친구의 패턴과 일치';ui.resultTitle.textContent='친구의 잠금 해제!';ui.earned.textContent='🔓';ui.resultMsg.textContent='만든 사람이 정한 시작점·순서·끝점을 그대로 맞혔어요.';ui.resultAlg.textContent=directionsText(state.level.solution);ui.concept.textContent='한 사람이 알고리즘을 만들고 다른 사람이 그 알고리즘을 관찰·기억·재현한 셈이에요.';ui.next.textContent='새 패턴 내기';
 }
 ui.success.classList.remove('hidden');burst();
}
function burst(){ui.burst.innerHTML='';const chars=['✦','★','●','◆','✧','★','●','✦'];for(let i=0;i<24;i++){const p=document.createElement('span');p.className='particle';p.textContent=chars[i%chars.length];const a=(Math.PI*2*i/24)+(i%3)*.08,r=90+(i%6)*23;p.style.setProperty('--x',Math.cos(a)*r+'px');p.style.setProperty('--y',Math.sin(a)*r+'px');p.style.setProperty('--r',(i*43)+'deg');p.style.color=i%2?'#ffd66b':'#5ce1e6';ui.burst.appendChild(p)}}

function eventIndex(e){const rect=ui.wrap.getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width*1000,y=(e.clientY-rect.top)/rect.height*1000;let best=null,dist=1e9;state.positions.forEach((p,i)=>{const d=Math.hypot(x-p.x,y-p.y);if(d<dist){dist=d;best=i}});const cols=state.level.grid[0],threshold=cols>=5?78:cols>=4?92:120;return dist<=threshold?best:null}
ui.wrap.addEventListener('pointerdown',e=>{if(state.mode==='menu'||state.previewing||!ui.success.classList.contains('hidden'))return;const idx=eventIndex(e);if(idx==null)return;if(state.mode!=='free-create')state.path=[];state.dragging=true;state.pointerId=e.pointerId;ui.wrap.setPointerCapture?.(e.pointerId);appendToward(idx);e.preventDefault()});
ui.wrap.addEventListener('pointermove',e=>{if(!state.dragging||e.pointerId!==state.pointerId||state.previewing)return;const idx=eventIndex(e);if(idx!=null)appendToward(idx);e.preventDefault()});
function stopPointer(e){if(e.pointerId!==state.pointerId)return;state.dragging=false;state.pointerId=null;try{ui.wrap.releasePointerCapture?.(e.pointerId)}catch(_){}if(state.mode!=='free-create')finishAttempt()}
ui.wrap.addEventListener('pointerup',stopPointer);ui.wrap.addEventListener('pointercancel',stopPointer);

function keyboardMove(dr,dc){
 if(state.mode==='menu'||state.previewing||!ui.success.classList.contains('hidden'))return;
 const cols=state.level.grid[0],rows=state.level.grid[1];if(!state.path.length){appendToward(Math.floor(rows/2)*cols+Math.floor(cols/2));return}
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
$('replayBtn').addEventListener('click',()=>showPreview(true));
$('savePatternBtn').addEventListener('click',beginFreeHandoff);
$('handoffStartBtn').addEventListener('click',beginFreeVerify);
$('resultMenuBtn').addEventListener('click',showMenu);
$('nextBtn').addEventListener('click',()=>{ui.success.classList.add('hidden');if(state.mode==='campaign'){if(state.level.id>=LEVELS.length){showMenu();return}state.levelIndex=state.level.id;startLevel(state.levelIndex)}else freeCreate()});
addEventListener('blur',()=>{state.dragging=false;state.pointerId=null});

function updateClock(){const d=new Date(),h=String(d.getHours()).padStart(2,'0'),m=String(d.getMinutes()).padStart(2,'0');$('clock').textContent=h+':'+m}
updateClock();setInterval(updateClock,30000);renderMenu();if(!save.tutorialSeen)ui.tutorial.classList.remove('hidden');
})();
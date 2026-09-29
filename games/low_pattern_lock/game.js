(()=>{'use strict';

const LEVELS=[
 {id:1,kind:'sequence',title:'첫 번째 잠금',grid:[3,3],start:0,end:8,solution:[0,1,2,5,4,3,6,7,8],mission:'시작점에서 출발해 모든 점을 한 번씩 지나 끝점으로 가세요.'},
 {id:2,kind:'sequence',title:'대각선도 한 칸',grid:[3,3],start:6,end:2,solution:[6,3,0,1,4,7,8,5,2],mission:'상하좌우뿐 아니라 대각선도 한 칸 이동할 수 있어요.'},
 {id:3,kind:'sequence',title:'길어진 암호',grid:[3,4],start:0,end:11,solution:[0,3,6,9,10,7,4,1,2,5,8,11],mission:'12개의 점을 모두 지나 긴 순차 알고리즘을 완성하세요.'},
 {id:4,kind:'sequence',title:'4×4 보안',grid:[4,4],start:12,end:0,solution:[12,13,14,15,11,10,9,8,4,5,6,7,3,2,1,0],mission:'16개의 명령을 순서대로 연결해 첫 보안 구역을 통과하세요.'},
 {id:5,kind:'condition',title:'별을 차례대로',grid:[3,3],start:0,end:8,solution:[0,1,2,5,4,3,6,7,8],order:[2,4,6],mission:'모든 점을 지나되 ① → ② → ③ 표시를 순서대로 통과하세요.'},
 {id:6,kind:'condition',title:'조건을 확인해!',grid:[3,3],start:6,end:2,solution:[6,7,8,5,4,3,0,1,2],order:[8,4,0],mission:'다음 조건 점이 무엇인지 확인한 뒤 알맞은 길을 선택하세요.'},
 {id:7,kind:'condition',title:'세 갈래 선택',grid:[3,4],start:0,end:9,solution:[0,1,2,5,4,3,6,7,8,11,10,9],order:[5,6,11],mission:'①, ②, ③의 순서를 지키며 12개의 점을 모두 연결하세요.'},
 {id:8,kind:'condition',title:'조건 보안실',grid:[4,4],start:0,end:12,solution:[0,1,2,3,7,6,5,4,8,9,10,11,15,14,13,12],order:[3,4,11,15],mission:'네 개의 조건 점을 순서대로 지나 마지막에 끝점으로 가세요.'},
 {id:9,kind:'repeat',title:'같은 이동 묶기',grid:[3,3],start:0,end:8,solution:[0,1,2,5,4,3,6,7,8],mission:'반복 카드를 보고 같은 이동을 여러 번 묶어 실행하세요.',command:'→ ×2 · ↓ · ← ×2 · ↓ · → ×2'},
 {id:10,kind:'repeat',title:'지그재그 반복',grid:[3,4],start:0,end:9,solution:[0,1,2,5,4,3,6,7,8,11,10,9],mission:'반복 명령을 순서대로 실행해 12개의 점을 연결하세요.',command:'→ ×2 · ↓ · ← ×2 · ↓ · → ×2 · ↓ · ← ×2'},
 {id:11,kind:'repeat',title:'4×4 반복 암호',grid:[4,4],start:0,end:12,solution:[0,1,2,3,7,6,5,4,8,9,10,11,15,14,13,12],mission:'긴 이동도 반복으로 묶으면 알고리즘이 짧고 읽기 쉬워져요.',command:'→ ×3 · ↓ · ← ×3 · ↓ · → ×3 · ↓ · ← ×3'},
 {id:12,kind:'repeat',title:'마스터 패턴',grid:[4,4],start:0,end:3,solution:[0,4,8,12,13,9,5,1,2,6,10,14,15,11,7,3],mission:'세로 반복과 가로 이동을 조합해 마지막 잠금을 해제하세요.',command:'↓ ×3 · → · ↑ ×3 · → · ↓ ×3 · → · ↑ ×3'}
];

const KIND_META={
 sequence:{label:'순차',explain:'순차 구조는 명령을 정해진 순서대로 하나씩 실행하는 방법이에요.'},
 condition:{label:'선택',explain:'선택 구조는 조건을 확인하고 알맞은 다음 행동을 고르는 방법이에요.'},
 repeat:{label:'반복',explain:'반복 구조는 같은 명령을 여러 번 다시 쓰지 않고 묶어서 표현하는 방법이에요.'}
};
const SAVE_KEY='pattern_lock_v1';
const $=id=>document.getElementById(id);
const ui={menu:$('menuScreen'),game:$('gameScreen'),tutorial:$('tutorial'),success:$('successOverlay'),grid:$('levelGrid'),progress:$('progressText'),stars:$('starText'),continue:$('continueBtn'),badge:$('levelBadge'),title:$('levelTitle'),counter:$('levelCounter'),mission:$('missionText'),command:$('commandCard'),board:$('board'),wrap:$('boardWrap'),trace:$('trace'),traceShadow:$('traceShadow'),toast:$('toast'),algorithm:$('algorithmText'),moves:$('moveCount'),undo:$('undoBtn'),reset:$('resetBtn'),hint:$('hintBtn'),savePattern:$('savePatternBtn'),resultTitle:$('resultTitle'),resultEye:$('resultEyebrow'),resultMsg:$('resultMessage'),resultAlg:$('resultAlgorithm'),concept:$('conceptExplain'),earned:$('earnedStars'),next:$('nextBtn'),burst:$('burst')};

let save=loadSave();
let state={mode:'menu',levelIndex:Math.max(0,Math.min(LEVELS.length-1,(save.unlocked||1)-1)),level:null,path:[],positions:[],dragging:false,pointerId:null,mistakes:0,hints:0,startedAt:0,freePattern:null,lastToast:0,sessionStarted:false};

function loadSave(){try{const got=window.KidscadeStorage?.getJson?.(SAVE_KEY,null);if(got&&typeof got==='object')return normalizeSave(got)}catch(_){}try{const got=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');if(got)return normalizeSave(got)}catch(_){}return{unlocked:1,stars:{},tutorialSeen:false}}
function normalizeSave(v){return{unlocked:Math.max(1,Math.min(LEVELS.length,Number(v.unlocked)||1)),stars:v.stars&&typeof v.stars==='object'?v.stars:{},tutorialSeen:!!v.tutorialSeen}}
function persist(){try{if(window.KidscadeStorage?.setJson){window.KidscadeStorage.setJson(SAVE_KEY,save);return}}catch(_){}try{localStorage.setItem(SAVE_KEY,JSON.stringify(save))}catch(_){}}
function sound(name){try{window.KidscadeGame?.sound?.(name)}catch(_){}}
function sdkStart(){try{window.KidscadeGame?.start?.({mode:'campaign',levels:LEVELS.length})}catch(_){}}
function sdkScore(){const total=totalStars();try{window.KidscadeGame?.score?.(total,{unit:'별',higherIsBetter:true})}catch(_){}}
function sdkGameOver(){const total=totalStars();try{window.KidscadeGame?.gameOver?.({score:total,scoreOptions:{unit:'별',higherIsBetter:true},completed:true})}catch(_){}}
function totalStars(){return Object.values(save.stars||{}).reduce((a,b)=>a+(Number(b)||0),0)}
function completedCount(){return Object.keys(save.stars||{}).filter(k=>(save.stars[k]||0)>0).length}

function renderMenu(){
 ui.progress.textContent=completedCount()+' / '+LEVELS.length;ui.stars.textContent=totalStars();ui.grid.innerHTML='';
 const maxIndex=Math.min(save.unlocked-1,LEVELS.length-1);state.levelIndex=Math.max(0,Math.min(state.levelIndex,maxIndex));
 LEVELS.forEach((level,i)=>{const b=document.createElement('button'),locked=i+1>save.unlocked;b.type='button';b.className='level-dot'+(locked?' locked':'')+(i===state.levelIndex?' current':'');b.dataset.kind=level.kind;b.disabled=locked;b.setAttribute('aria-label',level.id+'단계 '+level.title+(locked?' 잠김':''));b.innerHTML='<span>'+level.id+'</span>'+(save.stars[level.id]?'<span class="tiny-star">'+'★'.repeat(save.stars[level.id])+'</span>':'');b.addEventListener('click',()=>{state.levelIndex=i;renderMenu();startLevel(i)});ui.grid.appendChild(b)});
 ui.continue.textContent='이어하기 · '+(state.levelIndex+1)+'단계';
}
function showMenu(){state.mode='menu';state.dragging=false;ui.success.classList.add('hidden');ui.game.classList.add('hidden');ui.menu.classList.remove('hidden');renderMenu()}
function startLevel(index){
 state.mode='campaign';state.levelIndex=index;state.level=LEVELS[index];state.path=[];state.mistakes=0;state.hints=0;state.startedAt=performance.now();
 if(!state.sessionStarted){state.sessionStarted=true;sdkStart()}
 ui.menu.classList.add('hidden');ui.success.classList.add('hidden');ui.game.classList.remove('hidden');ui.savePattern.classList.add('hidden');setupLevelUi();buildBoard();renderPath();toast('초록 시작점에서 출발하세요.');
}
function setupLevelUi(){const l=state.level,m=KIND_META[l.kind];ui.badge.textContent=m.label;ui.badge.style.color=l.kind==='sequence'?'var(--cyan)':l.kind==='condition'?'var(--pink)':'var(--amber)';ui.title.textContent=l.title;ui.counter.textContent=l.id+' / '+LEVELS.length;ui.mission.textContent=l.mission;if(l.command){ui.command.textContent='반복 카드  '+l.command;ui.command.classList.remove('hidden')}else ui.command.classList.add('hidden')}
function freeCreate(){state.mode='free-create';state.level={kind:'free',title:'내 패턴 만들기',grid:[3,3],start:null,end:null,mission:'4개 이상의 점을 이어 나만의 잠금 암호를 만드세요.'};state.path=[];state.freePattern=null;state.mistakes=0;state.hints=0;ui.menu.classList.add('hidden');ui.game.classList.remove('hidden');ui.success.classList.add('hidden');ui.badge.textContent='자유';ui.badge.style.color='var(--green)';ui.title.textContent='내 패턴 만들기';ui.counter.textContent='FREE';ui.mission.textContent=state.level.mission;ui.command.classList.add('hidden');ui.savePattern.classList.remove('hidden');ui.savePattern.disabled=true;ui.savePattern.textContent='이 패턴을 암호로 저장';buildBoard();renderPath();toast('아무 점에서 시작해도 좋아요.')}
function beginFreeVerify(){if(state.path.length<4)return;state.freePattern=[...state.path];state.mode='free-verify';state.level={kind:'free',title:'내 암호 풀기',grid:[3,3],start:state.freePattern[0],end:state.freePattern[state.freePattern.length-1],solution:[...state.freePattern],mission:'방금 만든 패턴을 똑같이 다시 그려 잠금을 해제하세요.'};state.path=[];state.mistakes=0;state.hints=0;ui.title.textContent='내 암호 풀기';ui.mission.textContent=state.level.mission;ui.savePattern.classList.add('hidden');buildBoard();renderPath();toast('기억한 패턴을 다시 그려 보세요.')}

function buildBoard(){ui.board.innerHTML='';state.positions=[];const cols=state.level.grid[0],rows=state.level.grid[1],margin=cols>=4?130:180;for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const idx=r*cols+c,x=cols===1?500:margin+c*((1000-margin*2)/(cols-1)),y=rows===1?500:margin+r*((1000-margin*2)/(rows-1));state.positions[idx]={x,y,r,c};const n=document.createElement('div');n.className='node';n.dataset.index=idx;n.style.left=(x/10)+'%';n.style.top=(y/10)+'%';n.innerHTML='<span class="node-num">'+(idx+1)+'</span>';if(state.level.start===idx)n.classList.add('start');if(state.level.end===idx)n.classList.add('end');const oi=state.level.order?.indexOf(idx)??-1;if(oi>=0){n.classList.add('checkpoint');n.insertAdjacentHTML('afterbegin','<span>'+(oi+1)+'</span>')}ui.board.appendChild(n)}updateNodes()}
function updateNodes(){ui.board.querySelectorAll('.node').forEach(n=>{const idx=Number(n.dataset.index),p=state.path.indexOf(idx);n.classList.toggle('visited',p>=0);n.classList.toggle('current',p===state.path.length-1&&p>=0)})}
function pointsString(path=state.path){return path.map(i=>state.positions[i].x+','+state.positions[i].y).join(' ')}
function renderPath(){const pts=pointsString();ui.trace.setAttribute('points',pts);ui.traceShadow.setAttribute('points',pts);updateNodes();const dirs=directions(state.path,state.level.grid[0]);ui.moves.textContent=Math.max(0,state.path.length-1)+'칸 이동';if(!state.path.length)ui.algorithm.textContent=state.mode==='free-create'?'첫 점을 골라 보세요.':'시작점을 눌러 보세요.';else if(state.path.length===1)ui.algorithm.textContent='시작 →';else ui.algorithm.textContent=dirs.join(' ');if(state.mode==='free-create')ui.savePattern.disabled=state.path.length<4}
function directions(path,cols){const out=[];for(let i=1;i<path.length;i++){const a=state.positions[path[i-1]]||posFromIndex(path[i-1],cols),b=state.positions[path[i]]||posFromIndex(path[i],cols),dr=Math.sign(b.r-a.r),dc=Math.sign(b.c-a.c);out.push(dirSymbol(dr,dc))}return out}
function posFromIndex(i,cols){return{r:Math.floor(i/cols),c:i%cols}}
function dirSymbol(dr,dc){if(dr<0&&dc<0)return'↖';if(dr<0&&dc===0)return'↑';if(dr<0&&dc>0)return'↗';if(dr===0&&dc<0)return'←';if(dr===0&&dc>0)return'→';if(dr>0&&dc<0)return'↙';if(dr>0&&dc===0)return'↓';if(dr>0&&dc>0)return'↘';return'•'}
function adjacent(a,b){const A=state.positions[a],B=state.positions[b];return!!(A&&B&&Math.max(Math.abs(A.r-B.r),Math.abs(A.c-B.c))===1)}
function nextConditionIndex(path){const order=state.level.order||[];let k=0;for(const p of path){if(p===order[k])k++}return k}
function tryAdd(idx){
 const l=state.level;if(idx==null||idx<0||idx>=state.positions.length)return false;
 if(state.path.length===0){if(state.mode==='free-create'){state.path=[idx];sound('click');renderPath();return true}if(idx!==l.start){bad(idx,'초록 시작점에서 시작하세요.');return false}state.path=[idx];sound('click');renderPath();return true}
 const last=state.path[state.path.length-1];if(idx===last)return true;if(state.path.includes(idx)){bad(idx,'한 번 지난 점은 다시 지날 수 없어요.');return false}if(!adjacent(last,idx)){bad(idx,'한 번에 한 칸만 이동할 수 있어요.');return false}
 if(state.mode==='campaign'&&idx===l.end&&state.path.length<state.positions.length-1){bad(idx,'끝점은 모든 점을 지난 뒤에!');return false}
 if(state.mode==='campaign'&&l.kind==='condition'&&l.order?.includes(idx)){const expected=l.order[nextConditionIndex(state.path)];if(idx!==expected){bad(idx,'조건 점은 번호 순서대로 지나야 해요.');return false}}
 if((state.mode==='campaign'&&l.kind==='repeat')||state.mode==='free-verify'){const expected=l.solution[state.path.length];if(idx!==expected){bad(idx,'반복 카드의 다음 이동을 확인해 보세요.');return false}}
 state.path.push(idx);sound('click');renderPath();if(isComplete())complete();return true;
}
function bad(idx,msg){state.mistakes++;sound('wrong');navigator.vibrate?.(28);toast(msg);const n=ui.board.querySelector('.node[data-index="'+idx+'"]');if(n){n.classList.remove('wrong');void n.offsetWidth;n.classList.add('wrong')}}
function isComplete(){const l=state.level;if(state.mode==='free-create')return false;if(state.mode==='free-verify')return state.path.length===l.solution.length&&state.path.every((v,i)=>v===l.solution[i]);if(state.path.length!==state.positions.length||state.path[state.path.length-1]!==l.end)return false;if(l.kind==='condition'&&nextConditionIndex(state.path)!==(l.order||[]).length)return false;if(l.kind==='repeat'&&!state.path.every((v,i)=>v===l.solution[i]))return false;return true}
function undo(){if(!state.path.length)return;state.path.pop();sound('click');renderPath()}
function resetPath(){state.path=[];sound('click');renderPath();toast(state.mode==='free-create'?'새 패턴을 만들어 보세요.':'시작점부터 다시!')}
function toast(msg){ui.toast.textContent=msg;ui.toast.classList.add('show');clearTimeout(state.lastToast);state.lastToast=setTimeout(()=>ui.toast.classList.remove('show'),1350)}
function getHint(){if(state.mode==='free-create'){toast('4개 이상 이어서 나만의 암호를 만들어 보세요.');return}state.hints++;const next=findNextHint();if(next==null){toast('되돌리거나 다시 시작하면 길이 보여요.');return}const n=ui.board.querySelector('.node[data-index="'+next+'"]');if(n){n.classList.remove('hint');void n.offsetWidth;n.classList.add('hint')}toast(state.path.length?'빛나는 점으로 한 칸 이동해 보세요.':'빛나는 시작점을 눌러 보세요.')}
function findNextHint(){const l=state.level;if(!state.path.length)return l.start;if((state.mode==='campaign'&&l.kind==='repeat')||state.mode==='free-verify')return l.solution[state.path.length]??null;const found=solveFrom(state.path,22000);return found?.[state.path.length]??null}
function solveFrom(prefix,budget){
 const l=state.level,N=state.positions.length,used=new Set(prefix);let steps=0;const requiredOrder=l.order||[];
 function nextCond(path){let k=0;for(const p of path){if(p===requiredOrder[k])k++}return k}
 function dfs(path){if(++steps>budget)return null;if(path.length===N)return path[path.length-1]===l.end&&nextCond(path)===requiredOrder.length?[...path]:null;const last=path[path.length-1];let cand=[];for(let i=0;i<N;i++)if(!used.has(i)&&adjacent(last,i)){if(i===l.end&&path.length<N-1)continue;if(requiredOrder.includes(i)&&i!==requiredOrder[nextCond(path)])continue;cand.push(i)}cand.sort((a,b)=>onward(a)-onward(b));for(const c of cand){used.add(c);path.push(c);const hit=dfs(path);if(hit)return hit;path.pop();used.delete(c)}return null}
 function onward(i){let n=0;for(let j=0;j<N;j++)if(!used.has(j)&&j!==i&&adjacent(i,j))n++;return n}
 return dfs([...prefix]);
}
function compressAlgorithm(path){const d=directions(path,state.level.grid[0]);if(!d.length)return'시작';const out=[];let cur=d[0],count=1;for(let i=1;i<=d.length;i++){if(d[i]===cur){count++;continue}out.push(cur+(count>1?' ×'+count:''));cur=d[i];count=1}return out.join(' · ')}
function starRating(){if(state.hints===0&&state.mistakes<=1)return 3;if(state.hints<=1&&state.mistakes<=3)return 2;return 1}
function complete(){
 sound('correct');navigator.vibrate?.([35,35,60]);const alg=compressAlgorithm(state.path);
 if(state.mode==='campaign'){const rating=starRating(),id=state.level.id;save.stars[id]=Math.max(Number(save.stars[id])||0,rating);if(id<LEVELS.length)save.unlocked=Math.max(save.unlocked,id+1);persist();sdkScore();ui.resultEye.textContent='잠금 해제 · '+KIND_META[state.level.kind].label;ui.resultTitle.textContent=id===LEVELS.length?'알고리즘 마스터!':'잠금 해제!';ui.earned.textContent='★'.repeat(rating)+'☆'.repeat(3-rating);ui.resultMsg.textContent=rating===3?'힌트에 거의 기대지 않고 깔끔하게 해결했어요.':rating===2?'좋아요! 다시 도전하면 별 3개도 가능해요.':'해결 성공! 되돌리기와 힌트를 이용해 끝까지 완성했어요.';ui.resultAlg.textContent=alg;ui.concept.textContent=KIND_META[state.level.kind].explain;ui.next.textContent=id===LEVELS.length?'처음 화면으로':'다음 잠금';if(id===LEVELS.length)sdkGameOver()}
 else{ui.resultEye.textContent='내 패턴';ui.resultTitle.textContent='내 암호도 풀었다!';ui.earned.textContent='🔓';ui.resultMsg.textContent='직접 만든 패턴을 기억하고 똑같이 재현했어요.';ui.resultAlg.textContent=alg;ui.concept.textContent='패턴을 만들고 다시 실행하는 것도 하나의 알고리즘을 만들고 실행하는 활동이에요.';ui.next.textContent='새 패턴 만들기'}
 ui.success.classList.remove('hidden');burst();
}
function burst(){ui.burst.innerHTML='';const chars=['✦','★','●','◆','✧','★','●','✦'];for(let i=0;i<24;i++){const p=document.createElement('span');p.className='particle';p.textContent=chars[i%chars.length];const a=(Math.PI*2*i/24)+(i%3)*.08,r=90+(i%6)*23;p.style.setProperty('--x',Math.cos(a)*r+'px');p.style.setProperty('--y',Math.sin(a)*r+'px');p.style.setProperty('--r',(i*43)+'deg');p.style.color=i%2?'#ffd66b':'#5ce1e6';ui.burst.appendChild(p)}}
function eventIndex(e){const rect=ui.wrap.getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width*1000,y=(e.clientY-rect.top)/rect.height*1000;let best=null,dist=1e9;state.positions.forEach((p,i)=>{const d=Math.hypot(x-p.x,y-p.y);if(d<dist){dist=d;best=i}});const threshold=state.level.grid[0]>=4?95:120;return dist<=threshold?best:null}
ui.wrap.addEventListener('pointerdown',e=>{if(state.mode==='menu'||!ui.success.classList.contains('hidden'))return;const idx=eventIndex(e);if(idx==null)return;state.dragging=true;state.pointerId=e.pointerId;ui.wrap.setPointerCapture?.(e.pointerId);tryAdd(idx);e.preventDefault()});
ui.wrap.addEventListener('pointermove',e=>{if(!state.dragging||e.pointerId!==state.pointerId)return;const idx=eventIndex(e);if(idx!=null)tryAdd(idx);e.preventDefault()});
function stopPointer(e){if(e.pointerId!==state.pointerId)return;state.dragging=false;state.pointerId=null;try{ui.wrap.releasePointerCapture?.(e.pointerId)}catch(_){}}
ui.wrap.addEventListener('pointerup',stopPointer);ui.wrap.addEventListener('pointercancel',stopPointer);
function keyboardMove(dr,dc){if(state.mode==='menu'||!ui.success.classList.contains('hidden'))return;if(!state.path.length){tryAdd(state.level.start??0);return}const cols=state.level.grid[0],rows=state.level.grid[1],cur=posFromIndex(state.path[state.path.length-1],cols),r=cur.r+dr,c=cur.c+dc;if(r<0||c<0||r>=rows||c>=cols){toast('판 밖으로는 갈 수 없어요.');return}tryAdd(r*cols+c)}
addEventListener('keydown',e=>{if(state.mode==='menu')return;if(e.code==='Backspace'){e.preventDefault();undo();return}if(e.code==='KeyR'){e.preventDefault();resetPath();return}if((e.code==='Space'||e.code==='Enter')&&!state.path.length){e.preventDefault();tryAdd(state.level.start??0);return}const map={ArrowUp:[-1,0],ArrowDown:[1,0],ArrowLeft:[0,-1],ArrowRight:[0,1],KeyQ:[-1,-1],KeyE:[-1,1],KeyZ:[1,-1],KeyC:[1,1]};if(map[e.code]){e.preventDefault();keyboardMove(...map[e.code])}},{passive:false});

$('continueBtn').addEventListener('click',()=>startLevel(state.levelIndex));$('freeBtn').addEventListener('click',freeCreate);$('helpBtn').addEventListener('click',()=>ui.tutorial.classList.remove('hidden'));$('tutorialCloseBtn').addEventListener('click',()=>{save.tutorialSeen=true;persist();ui.tutorial.classList.add('hidden')});$('backBtn').addEventListener('click',showMenu);$('undoBtn').addEventListener('click',undo);$('resetBtn').addEventListener('click',resetPath);$('hintBtn').addEventListener('click',getHint);$('savePatternBtn').addEventListener('click',beginFreeVerify);$('resultMenuBtn').addEventListener('click',showMenu);$('nextBtn').addEventListener('click',()=>{ui.success.classList.add('hidden');if(state.mode==='campaign'){if(state.level.id>=LEVELS.length){showMenu();return}state.levelIndex=state.level.id;startLevel(state.levelIndex)}else freeCreate()});addEventListener('blur',()=>{state.dragging=false;state.pointerId=null});
function updateClock(){const d=new Date(),h=String(d.getHours()).padStart(2,'0'),m=String(d.getMinutes()).padStart(2,'0');$('clock').textContent=h+':'+m}updateClock();setInterval(updateClock,30000);renderMenu();if(!save.tutorialSeen)ui.tutorial.classList.remove('hidden');
})();
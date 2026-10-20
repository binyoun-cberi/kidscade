(()=>{'use strict';

const LEVELS=[
 {id:1,chapter:'기초 추리',owner:'하린',avatar:'🧒',grid:[3,3],solution:[6,4,8,7,5,2],structure:{sequence:5,choice:0,repeat:0},mission:'점 개수와 대각선 같은 기본 단서부터 조합해 보세요.'},
 {id:2,chapter:'기초 추리',owner:'도윤',avatar:'👦',grid:[3,3],solution:[0,4,2,1,5,7],structure:{sequence:5,choice:0,repeat:0},mission:'대각선이 많은 패턴입니다. 방향 변화까지 생각해 보세요.'},
 {id:3,chapter:'기초 추리',owner:'유나',avatar:'👧',grid:[3,3],solution:[0,3,7,5,2,1,4],structure:{sequence:6,choice:0,repeat:0},mission:'꺾이는 횟수와 시작·끝 위치를 함께 추리하세요.'},
 {id:4,chapter:'기초 추리',owner:'민재',avatar:'🧑',grid:[3,3],solution:[3,7,6,4,0,1,5,8],structure:{sequence:7,choice:0,repeat:0},mission:'점이 많아졌습니다. 여러 특징을 동시에 만족하는 경로를 찾아보세요.'},
 {id:5,chapter:'기초 추리',owner:'소율',avatar:'👧',grid:[4,4],solution:[4,0,5,2,1,6,7,11],structure:{sequence:7,choice:0,repeat:0},mission:'4×4 잠금판입니다. 모서리와 대각선 정보가 중요해요.'},
 {id:6,chapter:'기초 추리',owner:'지우',avatar:'🧒',grid:[4,4],solution:[1,4,8,13,10,9,14,11],structure:{sequence:7,choice:0,repeat:0},mission:'단순한 ㄹ자 훑기가 아닙니다. 단서로 후보를 좁혀 보세요.'},

 {id:7,chapter:'선택 추리',owner:'서아',avatar:'👧',grid:[3,3],solution:[0,4,2,1,3,7,8],structure:{sequence:4,choice:2,repeat:0},mission:'숨은 알고리즘에는 조건에 따른 선택이 2번 들어갑니다.'},
 {id:8,chapter:'선택 추리',owner:'준호',avatar:'👦',grid:[3,3],solution:[6,4,0,1,5,7,3],structure:{sequence:4,choice:2,repeat:0},mission:'같은 선택 횟수라도 모양은 달라집니다. 위치 단서를 함께 사용하세요.'},
 {id:9,chapter:'선택 추리',owner:'채원',avatar:'🧒',grid:[4,4],solution:[1,4,0,5,8,13,10,15,14,11],structure:{sequence:7,choice:2,repeat:0},mission:'긴 순차 흐름 중 두 곳에서 선택이 일어나는 패턴입니다.'},
 {id:10,chapter:'선택 추리',owner:'예준',avatar:'👦',grid:[4,4],solution:[8,13,12,9,4,0,5,2,3,7,6,10],structure:{sequence:8,choice:3,repeat:0},mission:'선택이 3번 들어갑니다. 오답 비교도 정보로 사용하세요.'},
 {id:11,chapter:'선택 추리',owner:'다은',avatar:'👧',grid:[5,5],solution:[8,7,1,0,5,11,10,6,2,3,9],structure:{sequence:7,choice:3,repeat:0},mission:'5×5에서는 후보가 많습니다. 강한 단서는 나중에 열립니다.'},
 {id:12,chapter:'선택 추리',owner:'현우',avatar:'🧑',grid:[5,5],solution:[11,15,20,16,22,18,13,7,8,14,19],structure:{sequence:6,choice:4,repeat:0},mission:'선택 4회가 포함된 고난도 패턴입니다.'},

 {id:13,chapter:'반복 추리',owner:'로아',avatar:'👧',grid:[5,5],solution:[0,1,5,6,10,11,15],structure:{sequence:0,choice:0,repeat:3,unit:2},mission:'2동작짜리 명령 묶음이 3번 반복됩니다.'},
 {id:14,chapter:'반복 추리',owner:'시우',avatar:'👦',grid:[5,5],solution:[6,12,7,13,8,14,9],structure:{sequence:0,choice:0,repeat:3,unit:2},mission:'대각선이 포함된 2동작 묶음을 3번 반복합니다.'},
 {id:15,chapter:'반복 추리',owner:'아린',avatar:'👧',grid:[5,5],solution:[1,7,6,12,18,17,23],structure:{sequence:0,choice:0,repeat:2,unit:3},mission:'3동작짜리 명령 묶음을 2번 반복합니다.'},
 {id:16,chapter:'반복 추리',owner:'태오',avatar:'🧒',grid:[5,5],solution:[3,8,12,13,18,22,23],structure:{sequence:0,choice:0,repeat:2,unit:3},mission:'직선과 대각선이 섞인 3동작 묶음이 2번 반복됩니다.'},
 {id:17,chapter:'반복 추리',owner:'나윤',avatar:'👧',grid:[5,5],solution:[15,10,16,12,7,13,9],structure:{sequence:0,choice:0,repeat:2,unit:3},mission:'같은 명령 묶음이 위치를 옮기며 두 번 실행됩니다.'},
 {id:18,chapter:'종합 추리',owner:'루미',avatar:'🕵️',grid:[5,5],solution:[2,6,7,11,12,16,17,21,20,15,10,5,0,1],structure:{sequence:5,choice:2,repeat:3,unit:2},mission:'반복 블록 뒤에 선택과 순차가 이어지는 종합 알고리즘입니다.'}
];

const DIRS=[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
const SAVE_KEY='pattern_lock_v5';
const $=id=>document.getElementById(id);
const ui={
 menu:$('menuScreen'),game:$('gameScreen'),tutorial:$('tutorial'),handoff:$('handoffOverlay'),success:$('successOverlay'),
 grid:$('levelGrid'),progress:$('progressText'),stars:$('starText'),continue:$('continueBtn'),
 badge:$('levelBadge'),title:$('levelTitle'),counter:$('levelCounter'),ownerAvatar:$('ownerAvatar'),ownerLabel:$('ownerLabel'),phase:$('phaseText'),attempt:$('attemptBadge'),candidate:$('candidateBadge'),candidatePanel:$('candidatePanel'),candidateGallery:$('candidateGallery'),candidateGuide:$('candidateGuide'),
 mission:$('missionText'),chips:$('logicChips'),clues:$('clueList'),feedback:$('feedbackCard'),
 board:$('board'),wrap:$('boardWrap'),trace:$('trace'),traceShadow:$('traceShadow'),toast:$('toast'),
 algorithm:$('algorithmText'),moves:$('moveCount'),undo:$('undoBtn'),reset:$('resetBtn'),clueBtn:$('clueBtn'),submit:$('submitBtn'),tip:$('releaseTip'),
 savePattern:$('savePatternBtn'),resultTitle:$('resultTitle'),resultEye:$('resultEyebrow'),resultMsg:$('resultMessage'),resultAlg:$('resultAlgorithm'),concept:$('conceptExplain'),earned:$('earnedStars'),next:$('nextBtn'),burst:$('burst')
};

let save=loadSave();
let state={mode:'menu',levelIndex:Math.max(0,Math.min(LEVELS.length-1,(save.unlocked||1)-1)),level:null,path:[],positions:[],dragging:false,pointerId:null,attempts:0,extraClues:0,freePattern:null,lastToast:0,sessionStarted:false,bank:[],candidates:[],revealed:[],available:[],target:null,cursor:null,selectedKey:null,tried:new Set()};

function loadSave(){try{const v=window.KidscadeStorage?.getJson?.(SAVE_KEY,null);if(v&&typeof v==='object')return normalizeSave(v)}catch(_){}try{const v=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');if(v)return normalizeSave(v)}catch(_){}return{unlocked:1,stars:{},tutorialSeen:false,guideV6:false}}
function normalizeSave(v){return{unlocked:Math.max(1,Math.min(LEVELS.length,Number(v.unlocked)||1)),stars:v.stars&&typeof v.stars==='object'?v.stars:{},tutorialSeen:!!v.tutorialSeen,guideV6:!!v.guideV6}}
function persist(){try{if(window.KidscadeStorage?.setJson){window.KidscadeStorage.setJson(SAVE_KEY,save);return}}catch(_){}try{localStorage.setItem(SAVE_KEY,JSON.stringify(save))}catch(_){}}
function sound(name){try{window.KidscadeGame?.sound?.(name)}catch(_){}}
function sdkStart(){try{window.KidscadeGame?.start?.({mode:'pattern-deduction',levels:LEVELS.length})}catch(_){}}
function sdkScore(){try{window.KidscadeGame?.score?.(totalStars(),{unit:'별',higherIsBetter:true})}catch(_){}}
function sdkStageClear(stage,mode='campaign'){try{window.KidscadeGame?.result?.({scope:'stage',status:'completed',outcome:'clear',score:totalStars(),scoreOptions:{unit:'별',higherIsBetter:true},completed:true,completedCount:completedCount(),stage,mode})}catch(_){}}
function totalStars(){return Object.values(save.stars||{}).reduce((a,b)=>a+(Number(b)||0),0)}
function completedCount(){return Object.keys(save.stars||{}).filter(k=>(save.stars[k]||0)>0).length}
function samePath(a,b){return a.length===b.length&&a.every((v,i)=>v===b[i])}
function pathKey(path){return path.join('-')}
function mulberry32(seed){return function(){let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function int(rng,n){return Math.floor(rng()*n)}
function shuffle(a,rng){for(let i=a.length-1;i>0;i--){const j=int(rng,i+1);[a[i],a[j]]=[a[j],a[i]]}return a}

function renderMenu(){
 ui.progress.textContent=completedCount()+' / '+LEVELS.length;ui.stars.textContent=totalStars();ui.grid.innerHTML='';
 const maxIndex=Math.min(save.unlocked-1,LEVELS.length-1);state.levelIndex=Math.max(0,Math.min(state.levelIndex,maxIndex));
 LEVELS.forEach((level,i)=>{const b=document.createElement('button'),locked=i+1>save.unlocked;b.type='button';b.className='level-dot'+(locked?' locked':'')+(i===state.levelIndex?' current':'');b.dataset.kind=level.chapter.includes('선택')?'condition':level.chapter.includes('반복')||level.chapter.includes('종합')?'repeat':'sequence';b.disabled=locked;b.setAttribute('aria-label',level.id+'단계 '+level.owner+'의 패턴'+(locked?' 잠김':''));b.innerHTML='<span>'+level.id+'</span>'+(save.stars[level.id]?'<span class="tiny-star">'+'★'.repeat(save.stars[level.id])+'</span>':'');b.addEventListener('click',()=>{state.levelIndex=i;renderMenu();startLevel(i)});ui.grid.appendChild(b)});
 ui.continue.textContent='이어하기 · '+LEVELS[state.levelIndex].owner+'의 패턴';
}
function showMenu(){state.mode='menu';state.dragging=false;ui.success.classList.add('hidden');ui.handoff.classList.add('hidden');ui.game.classList.add('hidden');ui.menu.classList.remove('hidden');renderMenu()}

function startLevel(index){
 state.mode='campaign';state.levelIndex=index;state.level=LEVELS[index];state.path=[];state.attempts=0;state.extraClues=0;state.cursor=null;state.selectedKey=null;state.tried=new Set();
 if(!state.sessionStarted){state.sessionStarted=true;sdkStart()}
 ui.menu.classList.add('hidden');ui.success.classList.add('hidden');ui.handoff.classList.add('hidden');ui.game.classList.remove('hidden');ui.savePattern.classList.add('hidden');ui.clueBtn.classList.remove('hidden');ui.submit.classList.remove('hidden');ui.tip.classList.remove('hidden');
 setupLevelUi();buildBoard();prepareDeduction(state.level);renderPlayerPath();ui.feedback.classList.add('hidden');ui.phase.textContent='모양을 눌러 단서와 비교해 봐!';
}
function setupLevelUi(){
 const l=state.level;ui.badge.textContent=l.id<=2?'처음 도전':l.id<=6?'모양 탐정':l.id<=12?'추리 고수':'패턴 마스터';ui.badge.style.color=l.id<=6?'var(--cyan)':l.id<=12?'var(--pink)':'var(--amber)';
 ui.title.textContent=l.owner+'의 패턴';ui.counter.textContent=l.id+' / '+LEVELS.length;ui.ownerAvatar.textContent=l.avatar;ui.ownerLabel.textContent=l.owner+'의 휴대폰';ui.attempt.textContent='도전 1';ui.mission.textContent='아래 모양을 눌러 보고, 단서와 맞는 패턴을 찾아 봐!';
}

function analyze(path,cols){
 const rows=cols,pos=i=>({r:Math.floor(i/cols),c:i%cols}),dirs=[];let diagonals=0,horiz=0,vert=0,turns=0;
 for(let i=1;i<path.length;i++){const a=pos(path[i-1]),b=pos(path[i]),dr=Math.sign(b.r-a.r),dc=Math.sign(b.c-a.c),sym=dirSymbol(dr,dc);dirs.push(sym);if(dr&&dc)diagonals++;else if(dc)horiz++;else if(dr)vert++}
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
 if(r===0)return'맨 윗줄 '+(c+1)+'번째';if(r===last)return'맨 아랫줄 '+(c+1)+'번째';if(c===0)return'맨 왼쪽줄 '+(r+1)+'번째';if(c===last)return'맨 오른쪽줄 '+(r+1)+'번째';
 return'위 '+(r+1)+'번째 줄 · 왼쪽 '+(c+1)+'번째';
}

function randomSimplePath(cols,len,rng){
 for(let attempt=0;attempt<80;attempt++){
   let path=[int(rng,cols*cols)],used=new Set(path);
   while(path.length<len){
     const last=path[path.length-1],r=Math.floor(last/cols),c=last%cols;
     const next=shuffle(DIRS.map(([dr,dc])=>[r+dr,c+dc]).filter(([nr,nc])=>nr>=0&&nc>=0&&nr<cols&&nc<cols).map(([nr,nc])=>nr*cols+nc).filter(i=>!used.has(i)),rng)[0];
     if(next==null)break;path.push(next);used.add(next);
   }
   if(path.length===len)return path;
 }
 return null;
}
function repeatedPath(cols,unitLen,times,rng){
 for(let attempt=0;attempt<250;attempt++){
   const start=int(rng,cols*cols),sr=Math.floor(start/cols),sc=start%cols;
   const unit=Array.from({length:unitLen},()=>DIRS[int(rng,DIRS.length)]);
   let r=sr,c=sc,path=[start],used=new Set(path),ok=true;
   for(let t=0;t<times&&ok;t++)for(const [dr,dc] of unit){r+=dr;c+=dc;if(r<0||c<0||r>=cols||c>=cols){ok=false;break}const idx=r*cols+c;if(used.has(idx)){ok=false;break}path.push(idx);used.add(idx)}
   if(ok)return{path,structure:{sequence:0,choice:0,repeat:times,unit:unitLen}};
 }
 return null;
}
function mixedPath(cols,rng){
 for(let attempt=0;attempt<300;attempt++){
   const times=2+int(rng,2),unit=2+int(rng,2),rep=repeatedPath(cols,unit,times,rng);if(!rep)continue;
   const path=[...rep.path],used=new Set(path);let last=path[path.length-1],targetLen=10+int(rng,5),need=targetLen-path.length;
   while(need>0){
     const r=Math.floor(last/cols),c=last%cols;
     const choices=shuffle(DIRS.map(([dr,dc])=>[r+dr,c+dc]).filter(([nr,nc])=>nr>=0&&nc>=0&&nr<cols&&nc<cols).map(([nr,nc])=>nr*cols+nc).filter(i=>!used.has(i)),rng);
     if(!choices.length)break;last=choices[0];path.push(last);used.add(last);need--;
   }
   if(path.length>=9){const choice=1+int(rng,3),sequence=Math.max(1,path.length-1-choice-times);return{path,structure:{sequence,choice,repeat:times,unit}}}
 }
 return null;
}
function deriveRepeat(path,cols){
 const d=analyze(path,cols).dirs;
 for(const unit of [2,3,1])for(let times=4;times>=2;times--){if(unit*times>d.length)continue;let ok=true;for(let i=unit;i<unit*times;i++)if(d[i]!==d[i%unit]){ok=false;break}if(ok)return{repeat:times,unit}}
 return{repeat:0,unit:0};
}
function deriveStructure(path,cols){
 const rep=deriveRepeat(path,cols);if(rep.repeat)return{sequence:Math.max(0,path.length-1-rep.repeat*rep.unit),choice:0,repeat:rep.repeat,unit:rep.unit};
 return{sequence:path.length-1,choice:0,repeat:0,unit:0};
}
function generateBank(level){
 const rng=mulberry32(0xBEEF00+level.id*977),cols=level.grid[0],map=new Map();
 const add=(path,structure)=>{if(!path||path.length<4)return;const key=pathKey(path);if(!map.has(key))map.set(key,{path:[...path],structure:{...structure}})};
 add(level.solution,level.structure);
 const targetLen=level.solution.length;
 let guard=0;
 while(map.size<180&&guard++<5000){
   let item=null;
   if(level.chapter.includes('반복')){
     const unit=2+int(rng,2),times=2+int(rng,2);
     item=repeatedPath(cols,unit,times,rng);
   }else if(level.chapter.includes('종합'))item=mixedPath(cols,rng);
   else{
     const min=Math.max(4,targetLen-2),max=Math.min(cols*cols,targetLen+2),len=min+int(rng,max-min+1),path=randomSimplePath(cols,len,rng);
     if(path){
       let structure;
       if(level.chapter.includes('선택')){const choice=1+int(rng,Math.min(4,len-2));structure={sequence:Math.max(1,len-1-choice),choice,repeat:0,unit:0}}
       else structure={sequence:len-1,choice:0,repeat:0,unit:0};
       item={path,structure};
     }
   }
   if(item)add(item.path,item.structure);
 }
 return shuffle([...map.values()],rng);
}
function descriptor(kind,index=null){return{id:index==null?kind:kind+':'+index,kind,index}}
function cluePool(level){
 const base=['points','diagonals','turns','startType','endType','straight','corners','center','firstDir','lastDir','startExact','endExact'];
 const pool=base.map(k=>descriptor(k));
 for(let i=1;i<level.solution.length-1;i++)pool.push(descriptor('nodeAt',i));
 for(let i=0;i<level.solution.length-1;i++)pool.push(descriptor('dirAt',i));
 return pool;
}
function clueValue(desc,cand,level){
 const a=analyze(cand.path,level.grid[0]),s=cand.structure||{};
 switch(desc.kind){
   case'points':return a.points;case'diagonals':return a.diagonals;case'turns':return a.turns;case'startType':return a.startType;case'endType':return a.endType;case'straight':return a.straight;case'corners':return a.corners;case'center':return a.center;case'firstDir':return a.dirs[0]||'';case'lastDir':return a.dirs[a.dirs.length-1]||'';case'startExact':return a.start;case'endExact':return a.end;case'sequenceCount':return s.sequence||0;case'choiceCount':return s.choice||0;case'repeatCount':return s.repeat||0;case'repeatUnit':return s.unit||0;case'nodeAt':return cand.path[desc.index]??-1;case'dirAt':return a.dirs[desc.index]??'';default:return null;
 }
}
function clueText(desc,target,level){
 const v=clueValue(desc,target,level);
 switch(desc.kind){
   case'points':return'이어지는 점은 '+v+'개';case'diagonals':return'비스듬한 선은 '+v+'개';case'turns':return'방향을 바꾸는 곳은 '+v+'번';case'startType':return'시작점은 '+v+'에 있음';case'endType':return'마지막 점은 '+v+'에 있음';case'straight':return'가로·세로 이동은 '+v+'번';case'corners':return'모서리 점을 '+v+'개 사용함';case'center':return v?'한가운데 점을 지나감':'한가운데 점은 지나지 않음';case'firstDir':return'첫 이동 방향은 '+v;case'lastDir':return'마지막 이동 방향은 '+v;case'startExact':return'시작점은 '+locationName(v,level.grid[0]);case'endExact':return'마지막 점은 '+locationName(v,level.grid[0]);case'sequenceCount':return'순차 명령을 '+v+'회 사용함';case'choiceCount':return'선택 구조를 '+v+'회 사용함';case'repeatCount':return'반복 블록을 '+v+'회 실행함';case'repeatUnit':return v+'동작짜리 명령 묶음을 반복함';case'nodeAt':return(desc.index+1)+'번째로 찍는 점은 '+locationName(v,level.grid[0]);case'dirAt':return(desc.index+1)+'번째 이동 방향은 '+v;default:return'숨은 단서';
 }
}
function filterByClue(list,desc,target,level){const wanted=clueValue(desc,target,level);return list.filter(c=>clueValue(desc,c,level)===wanted)}
function chooseBestClue(list,pool,target,level,allowStrong){
 let best=null,bestCount=list.length+1;
 for(const d of pool){
   if(!allowStrong&&['startExact','endExact','nodeAt','dirAt'].includes(d.kind))continue;
   const count=filterByClue(list,d,target,level).length;
   if(!allowStrong&&count<=1)continue;
   if(count>0&&count<bestCount){best=d;bestCount=count}
 }
 return best;
}
function chooseBalancedClue(list,pool,target,level,desired=12,minRemaining=4){
 let best=null,bestScore=Infinity;
 for(const d of pool){
   if(['startExact','endExact','nodeAt','dirAt','firstDir','lastDir'].includes(d.kind))continue;
   const count=filterByClue(list,d,target,level).length;
   if(count<minRemaining||count>=list.length)continue;
   const score=Math.abs(count-desired);
   if(score<bestScore){best=d;bestScore=score}
 }
 return best;
}
function prepareDeduction(level){
 state.bank=generateBank(level);
 state.target=state.bank.find(c=>samePath(c.path,level.solution))||{path:[...level.solution],structure:{...level.structure}};
 state.candidates=[...state.bank];state.revealed=[];state.available=cluePool(level);
 const points=state.available.find(x=>x.kind==='points');if(points)applyClue(points);
 // Start with a manageable number of visible choices instead of a wall of text.
 const limit=level.id<=2?4:level.id<=6?6:level.id<=12?8:10;
 while(state.candidates.length>limit&&state.revealed.length<11){
   const current=state.candidates.length;
   const options=state.available.map(d=>({d,count:filterByClue(state.candidates,d,state.target,level).length}))
     .filter(x=>x.count>=2&&x.count<current)
     .sort((a,b)=>Math.abs(a.count-limit)-Math.abs(b.count-limit));
   const next=options[0]?.d||chooseBestClue(state.candidates,state.available,state.target,level,true);
   if(!next)break;
   applyClue(next);
 }
 renderClues();
}
function applyClue(desc){
 state.revealed.push(desc);state.available=state.available.filter(d=>d.id!==desc.id);
 state.candidates=filterByClue(state.candidates,desc,state.target,state.level);
}
function renderStructureChips(){ui.chips.innerHTML=''}
function renderClues(){
 ui.clues.innerHTML=state.revealed.map((d,i)=>'<div class="clue-item"><span>'+(i+1)+'</span><b>'+clueText(d,state.target,state.level)+'</b></div>').join('');
 ui.clueBtn.disabled=state.candidates.length<=1||!state.available.length;
 ui.clueBtn.textContent=state.candidates.length<=1?'마지막 모양 발견!':'💡 힌트 보기';
 if(state.selectedKey&&!state.candidates.some(c=>pathKey(c.path)===state.selectedKey)){
   state.selectedKey=null;state.path=[];state.cursor=null;renderPlayerPath();
 }
 if(state.mode==='campaign')ui.attempt.textContent='도전 '+(state.attempts+1)+' · '+'★'.repeat(rating());
 updateCandidateBadge();renderCandidates();
}
function updateCandidateBadge(){
 ui.candidate.textContent='남은 모양 '+state.candidates.length+'개';
 ui.candidate.classList.toggle('one',state.candidates.length===1);
}
function candidateSvg(path,cols){
 const pad=12,side=80,step=(side-pad*2)/(cols-1);
 const xy=i=>[pad+(i%cols)*step,pad+Math.floor(i/cols)*step];
 const all=Array.from({length:cols*cols},(_,i)=>xy(i));
 const line=path.map(i=>xy(i).join(',')).join(' ');
 const circles=all.map(([x,y])=>'<circle cx="'+x+'" cy="'+y+'" r="3.7" fill="#607d98"/>').join('');
 const ends=path.map((i,j)=>{const [x,y]=xy(i);return '<circle cx="'+x+'" cy="'+y+'" r="'+(j===0?5.6:3.4)+'" fill="'+(j===0?'#a0ffd0':'#e6fbff')+'"/>'}).join('');
 return '<svg viewBox="0 0 80 80" role="img" aria-label="패턴 모양"><polyline points="'+line+'" fill="none" stroke="#5ce1e6" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>'+circles+ends+'</svg>';
}
function renderCandidates(){
 if(state.mode==='free-create'){ui.candidatePanel.classList.add('hidden');return}
 ui.candidatePanel.classList.remove('hidden');
 const count=state.candidates.length;
 ui.candidateGuide.textContent=count===1?'이 모양을 눌러서 열어 봐!':'모양을 눌러 크게 보고, 옆으로 넘겨 봐 →';
 ui.candidateGallery.innerHTML='';
 const cols=state.level.grid[0];
 state.candidates.forEach((candidate,index)=>{
   const key=pathKey(candidate.path),selected=key===state.selectedKey;
   const button=document.createElement('button');
   button.type='button';button.className='candidate-option'+(selected?' selected':'');
   button.setAttribute('aria-pressed',String(selected));
   button.setAttribute('aria-label',(index+1)+'번 후보 패턴 선택, 점 '+candidate.path.length+'개');
   button.innerHTML='<span class="candidate-number">모양 '+(index+1)+'</span>'+candidateSvg(candidate.path,cols)+'<span class="candidate-points">점 '+candidate.path.length+'개</span>';
   button.addEventListener('click',()=>{
     state.path=[...candidate.path];state.cursor=candidate.path[candidate.path.length-1];
     state.selectedKey=key;renderPlayerPath();
     ui.candidateGallery.querySelectorAll('.candidate-option').forEach(b=>{const on=b===button;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on))});
     ui.phase.textContent='좋아! 단서와 맞는지 보고 잠금을 풀어 봐';
     toast((index+1)+'번 모양을 골랐어!');ui.wrap.scrollIntoView?.({behavior:'smooth',block:'center'});
   });
   ui.candidateGallery.appendChild(button);
 });
}
function freeCreate(){
 state.mode='free-create';state.level={id:99,chapter:'친구 문제',owner:'나',avatar:'😎',grid:[4,4],solution:[],structure:{sequence:0,choice:0,repeat:0,unit:0},mission:'4개 이상의 점을 이어 비밀 패턴을 만드세요.'};state.path=[];state.freePattern=null;state.attempts=0;state.extraClues=0;state.cursor=null;state.selectedKey=null;state.tried=new Set();
 ui.menu.classList.add('hidden');ui.game.classList.remove('hidden');ui.success.classList.add('hidden');ui.handoff.classList.add('hidden');ui.badge.textContent='출제';ui.badge.style.color='var(--green)';ui.title.textContent='내 비밀 패턴';ui.counter.textContent='FREE';ui.ownerAvatar.textContent='😎';ui.ownerLabel.textContent='내 휴대폰';ui.phase.textContent='친구가 못 보게 패턴을 만드세요';ui.attempt.textContent='출제 중';ui.candidate.textContent='정답 만들기';ui.candidate.classList.remove('one');ui.mission.textContent=state.level.mission;ui.chips.innerHTML='';ui.clues.innerHTML='';ui.feedback.classList.add('hidden');ui.candidatePanel.classList.add('hidden');ui.savePattern.classList.remove('hidden');ui.savePattern.disabled=true;ui.clueBtn.classList.add('hidden');ui.submit.classList.add('hidden');ui.tip.textContent='패턴을 만든 뒤 “이 패턴을 비밀 문제로 내기”를 누르세요.';buildBoard();renderPlayerPath();
}
function beginFreeHandoff(){if(state.path.length<4)return;state.freePattern=[...state.path];ui.handoff.classList.remove('hidden')}
function beginFreeVerify(){
 const sol=[...state.freePattern],structure=deriveStructure(sol,4);state.mode='free-verify';state.level={id:1001,chapter:'친구 추리',owner:'친구',avatar:'🕵️',grid:[4,4],solution:sol,structure,mission:'친구가 만든 정답은 끝까지 숨겨져 있어요. 단서와 후보 수만 보고 맞혀 보세요.'};state.path=[];state.attempts=0;state.extraClues=0;state.cursor=null;state.selectedKey=null;state.tried=new Set();
 ui.handoff.classList.add('hidden');ui.badge.textContent='친구 추리';ui.badge.style.color='var(--green)';ui.title.textContent='친구의 비밀 패턴';ui.ownerAvatar.textContent='🕵️';ui.ownerLabel.textContent='친구의 휴대폰';ui.phase.textContent='정답은 안 보여요. 단서만 보고 추리!';ui.attempt.textContent='도전 1';ui.mission.textContent='아래 모양 중 친구가 만든 비밀 패턴을 찾아 봐!';ui.savePattern.classList.add('hidden');ui.clueBtn.classList.remove('hidden');ui.submit.classList.remove('hidden');ui.tip.textContent='모양을 고르거나 직접 그린 다음 잠금을 풀어 봐.';buildBoard();prepareDeduction(state.level);renderPlayerPath();ui.feedback.classList.add('hidden');
}

function buildBoard(){
 ui.board.innerHTML='';state.positions=[];const cols=state.level.grid[0],rows=state.level.grid[1],margin=cols>=5?105:cols>=4?130:180;
 for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const idx=r*cols+c,x=margin+c*((1000-margin*2)/(cols-1)),y=margin+r*((1000-margin*2)/(rows-1));state.positions[idx]={x,y,r,c};const n=document.createElement('div');n.className='node';n.dataset.index=idx;n.style.left=(x/10)+'%';n.style.top=(y/10)+'%';n.innerHTML='<span class="node-num">'+(idx+1)+'</span>';ui.board.appendChild(n)}
 updateNodes();
}
function updateNodes(){ui.board.querySelectorAll('.node').forEach(n=>{const idx=Number(n.dataset.index),p=state.path.indexOf(idx);n.classList.toggle('visited',p>=0);n.classList.toggle('current',p===state.path.length-1&&p>=0);n.classList.toggle('cursor',state.cursor===idx)})}
function pointsString(path){return path.map(i=>state.positions[i].x+','+state.positions[i].y).join(' ')}
function drawPath(path){const pts=pointsString(path);ui.trace.setAttribute('points',pts);ui.traceShadow.setAttribute('points',pts);updateNodes()}
function renderPlayerPath(){
 drawPath(state.path);ui.moves.textContent=state.path.length+'개 점';ui.algorithm.textContent=state.path.length?directionsText(state.path):(state.mode==='free-create'?'첫 점을 골라 비밀 패턴을 만드세요.':'위에서 모양을 고르거나 직접 선을 그려 봐.');
 ui.submit.disabled=state.path.length<2;if(state.mode==='free-create')ui.savePattern.disabled=state.path.length<4;
}
function directions(path){const out=[];for(let i=1;i<path.length;i++){const a=state.positions[path[i-1]],b=state.positions[path[i]],dr=Math.sign(b.r-a.r),dc=Math.sign(b.c-a.c);out.push(dirSymbol(dr,dc))}return out}
function directionsText(path){const d=directions(path);return d.length?d.join(' '):'시작'}
function alignedStep(a,b){const A=state.positions[a],B=state.positions[b],dr=B.r-A.r,dc=B.c-A.c;if(!dr&&!dc)return null;if(!(dr===0||dc===0||Math.abs(dr)===Math.abs(dc)))return null;return{sr:Math.sign(dr),sc:Math.sign(dc),steps:Math.max(Math.abs(dr),Math.abs(dc))}}
function appendToward(idx){
 if(idx==null||idx<0||idx>=state.positions.length)return false;state.selectedKey=null;ui.candidateGallery.querySelectorAll('.candidate-option').forEach(b=>{b.classList.remove('selected');b.setAttribute('aria-pressed','false')});if(!state.path.length){state.path.push(idx);state.cursor=idx;sound('click');renderPlayerPath();return true}
 const last=state.path[state.path.length-1];if(idx===last)return true;if(state.path.includes(idx))return false;const step=alignedStep(last,idx);if(!step)return false;const A=state.positions[last],cols=state.level.grid[0];let r=A.r,c=A.c,added=false;
 for(let k=0;k<step.steps;k++){r+=step.sr;c+=step.sc;const j=r*cols+c;if(state.path.includes(j))return added;state.path.push(j);state.cursor=j;added=true}
 if(added){sound('click');renderPlayerPath()}return added;
}
function undo(){if(!state.path.length)return;state.selectedKey=null;state.path.pop();state.cursor=state.path[state.path.length-1]??null;sound('click');renderPlayerPath()}
function resetPath(){state.path=[];state.cursor=null;state.selectedKey=null;sound('click');renderPlayerPath();toast(state.mode==='free-create'?'새 비밀 패턴을 만들어 보세요.':'새 예상 패턴을 그려 보세요.')}
function toast(msg){ui.toast.textContent=msg;ui.toast.classList.add('show');clearTimeout(state.lastToast);state.lastToast=setTimeout(()=>ui.toast.classList.remove('show'),1600)}

function comparison(guess,target,cols){
 const ga=analyze(guess,cols),ta=analyze(target,cols),limit=Math.min(guess.length,target.length);let sameOrder=0,sameEdges=0;
 for(let i=0;i<limit;i++)if(guess[i]===target[i])sameOrder++;
 for(let i=1;i<limit;i++)if(guess[i-1]===target[i-1]&&guess[i]===target[i])sameEdges++;
 return{pointsDelta:ga.points-ta.points,diagDelta:ga.diagonals-ta.diagonals,sameOrder,sameEdges,start:guess[0]===target[0],end:guess[guess.length-1]===target[target.length-1]};
}
function filterByFeedback(list,guess,target,cols){
 const rest=list.filter(c=>!samePath(c.path,guess));
 if(rest.length<=1)return{candidates:rest,tip:'틀린 모양 하나를 지웠어!'};
 const actual=comparison(guess,target,cols);
 const checks=[
   {value:f=>f.start,text:v=>'첫 점이 '+(v?'같아!':'달라!')},
   {value:f=>f.end,text:v=>'끝 점이 '+(v?'같아!':'달라!')},
   {value:f=>f.diagDelta,text:v=>'비스듬한 선이 '+(v===0?'같은 개수야':Math.abs(v)+'개 '+(v>0?'더 많아':'더 적어'))},
   {value:f=>f.sameOrder,text:v=>'순서가 같은 점이 '+v+'개야'},
   {value:f=>f.sameEdges,text:v=>'똑같이 이어진 선이 '+v+'개야'}
 ];
 const choices=checks.map(check=>{
   const value=check.value(actual);
   const candidates=rest.filter(c=>check.value(comparison(guess,c.path,cols))===value);
   return{candidates,tip:check.text(value)};
 }).filter(c=>c.candidates.length>=2&&c.candidates.length<rest.length);
 choices.sort((a,b)=>Math.abs(a.candidates.length-Math.ceil(rest.length/2))-Math.abs(b.candidates.length-Math.ceil(rest.length/2)));
 return choices[0]||{candidates:rest,tip:'방금 골랐던 모양은 정답이 아니야'};
}
function showFeedback(tip){
 ui.feedback.innerHTML='<strong>아깝다! 다른 모양을 찾아보자.</strong><div><span>'+tip+'</span></div>';
 ui.feedback.classList.remove('hidden');
}
function finishAttempt(){
 if(state.mode==='free-create'||state.path.length<2)return;const guess=[...state.path],target=state.level.solution;if(samePath(guess,target)){complete();return}
 state.attempts++;state.tried.add(pathKey(guess));sound('wrong');navigator.vibrate?.([45,25,45]);const result=filterByFeedback(state.candidates,guess,target,state.level.grid[0]);showFeedback(result.tip);state.candidates=result.candidates;if(!state.candidates.some(c=>samePath(c.path,target)))state.candidates.unshift(state.target);
 ui.wrap.classList.add('failed');ui.attempt.textContent='도전 '+(state.attempts+1);ui.phase.textContent='괜찮아! 틀린 모양이 사라졌어';state.selectedKey=null;renderClues();toast('남은 모양 '+state.candidates.length+'개! 다시 골라 봐.');
 setTimeout(()=>{ui.wrap.classList.remove('failed');state.path=[];state.cursor=null;renderPlayerPath()},520);
}
function revealClue(){
 if(state.candidates.length<=1)return;
 const current=state.candidates.length,desired=current>4?Math.max(2,Math.ceil(current/2)):1;
 let d=null,bestScore=Infinity;
 for(const clue of state.available){
   const count=filterByClue(state.candidates,clue,state.target,state.level).length;
   if(count<=0||count>=current)continue;
   if(current>4&&count<2)continue;
   const score=Math.abs(count-desired);
   if(score<bestScore){d=clue;bestScore=score}
 }
 if(!d)d=chooseBestClue(state.candidates,state.available,state.target,state.level,true);
 if(!d)return;state.extraClues++;applyClue(d);sound('click');renderClues();ui.phase.textContent='힌트를 보고 남은 모양을 살펴봐';toast('남은 모양 '+state.candidates.length+'개!');
}
function rating(){const cost=state.attempts+state.extraClues;if(cost===0)return 3;if(cost<=2)return 2;return 1}
function answerSummary(l){const a=analyze(l.solution,l.grid[0]);return directionsText(l.solution)+' · '+a.points+'점 · 대각선 '+a.diagonals+'번'}
function complete(){
 sound('correct');navigator.vibrate?.([35,35,70]);
 if(state.mode==='campaign'){
   const l=state.level,r=rating();save.stars[l.id]=Math.max(Number(save.stars[l.id])||0,r);if(l.id<LEVELS.length)save.unlocked=Math.max(save.unlocked,l.id+1);persist();sdkScore();
   ui.resultEye.textContent=l.owner+'의 비밀 패턴 발견';ui.resultTitle.textContent=l.id===LEVELS.length?'패턴 락 마스터!':'잠금 해제!';ui.earned.textContent='★'.repeat(r)+'☆'.repeat(3-r);
   ui.resultMsg.textContent=state.attempts===0?'우와! 첫 도전에 비밀 패턴을 찾았어!':'틀려도 포기하지 않고 단서를 비교해서 찾았어!';
   ui.resultAlg.textContent=answerSummary(l);ui.concept.textContent='시작점, 선의 방향, 점의 순서를 잘 살피면 비슷한 모양도 구별할 수 있어!';ui.next.textContent=l.id===LEVELS.length?'처음 화면으로':'다음 사람';sdkStageClear(l.id,'campaign');
 }else{
   ui.resultEye.textContent='친구의 비밀 패턴 발견';ui.resultTitle.textContent='친구 패턴 해제!';ui.earned.textContent='🔓';ui.resultMsg.textContent='친구의 비밀 패턴을 찾아냈어!';ui.resultAlg.textContent=answerSummary(state.level);ui.concept.textContent='다른 패턴을 만들어서 친구와 역할을 바꿔 보자!';ui.next.textContent='새 패턴 내기';sdkStageClear('friend','friend');
 }
 ui.success.classList.remove('hidden');burst();
}
function burst(){ui.burst.innerHTML='';const chars=['?','✦','★','◆','?','★','●','✦'];for(let i=0;i<24;i++){const p=document.createElement('span');p.className='particle';p.textContent=chars[i%chars.length];const a=(Math.PI*2*i/24)+(i%3)*.08,r=90+(i%6)*23;p.style.setProperty('--x',Math.cos(a)*r+'px');p.style.setProperty('--y',Math.sin(a)*r+'px');p.style.setProperty('--r',(i*43)+'deg');p.style.color=i%2?'#ffd66b':'#5ce1e6';ui.burst.appendChild(p)}}

function eventIndex(e){const rect=ui.wrap.getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width*1000,y=(e.clientY-rect.top)/rect.height*1000;let best=null,dist=1e9;state.positions.forEach((p,i)=>{const d=Math.hypot(x-p.x,y-p.y);if(d<dist){dist=d;best=i}});const cols=state.level.grid[0],threshold=cols>=5?78:cols>=4?92:120;return dist<=threshold?best:null}
ui.wrap.addEventListener('pointerdown',e=>{if(state.mode==='menu'||!ui.success.classList.contains('hidden'))return;const idx=eventIndex(e);if(idx==null)return;state.dragging=true;state.pointerId=e.pointerId;ui.wrap.setPointerCapture?.(e.pointerId);appendToward(idx);e.preventDefault()});
ui.wrap.addEventListener('pointermove',e=>{if(!state.dragging||e.pointerId!==state.pointerId)return;const idx=eventIndex(e);if(idx!=null)appendToward(idx);e.preventDefault()});
function stopPointer(e){if(e.pointerId!==state.pointerId)return;state.dragging=false;state.pointerId=null;try{ui.wrap.releasePointerCapture?.(e.pointerId)}catch(_){}}
ui.wrap.addEventListener('pointerup',stopPointer);ui.wrap.addEventListener('pointercancel',stopPointer);

function moveCursor(dr,dc){
 const cols=state.level.grid[0],rows=state.level.grid[1];
 if(state.cursor==null){state.cursor=Math.floor(rows/2)*cols+Math.floor(cols/2);updateNodes();return}
 const p=state.positions[state.cursor],r=Math.max(0,Math.min(rows-1,p.r+dr)),c=Math.max(0,Math.min(cols-1,p.c+dc));state.cursor=r*cols+c;updateNodes();
}
addEventListener('keydown',e=>{
 if(state.mode==='menu')return;
 if(e.code==='Backspace'){e.preventDefault();undo();return}
 if(e.code==='KeyR'){e.preventDefault();resetPath();return}
 if(e.code==='Enter'){e.preventDefault();if(state.cursor!=null&&!state.path.length)appendToward(state.cursor);else finishAttempt();return}
 if(e.code==='Space'){e.preventDefault();if(state.cursor!=null)appendToward(state.cursor);return}
 const map={ArrowUp:[-1,0],ArrowDown:[1,0],ArrowLeft:[0,-1],ArrowRight:[0,1],KeyQ:[-1,-1],KeyE:[-1,1],KeyZ:[1,-1],KeyC:[1,1]};
 if(map[e.code]){e.preventDefault();if(state.path.length)keyboardDraw(...map[e.code]);else moveCursor(...map[e.code])}
},{passive:false});
function keyboardDraw(dr,dc){const cols=state.level.grid[0],rows=state.level.grid[1],last=state.positions[state.path[state.path.length-1]],r=last.r+dr,c=last.c+dc;if(r<0||c<0||r>=rows||c>=cols){toast('판 밖으로는 갈 수 없어요.');return}appendToward(r*cols+c)}

$('continueBtn').addEventListener('click',()=>startLevel(state.levelIndex));
$('freeBtn').addEventListener('click',freeCreate);
$('helpBtn').addEventListener('click',()=>ui.tutorial.classList.remove('hidden'));
$('tutorialCloseBtn').addEventListener('click',()=>{save.tutorialSeen=true;save.guideV6=true;persist();ui.tutorial.classList.add('hidden')});
$('backBtn').addEventListener('click',showMenu);
$('undoBtn').addEventListener('click',undo);
$('resetBtn').addEventListener('click',resetPath);
$('clueBtn').addEventListener('click',revealClue);
$('submitBtn').addEventListener('click',finishAttempt);
$('savePatternBtn').addEventListener('click',beginFreeHandoff);
$('handoffStartBtn').addEventListener('click',beginFreeVerify);
$('resultMenuBtn').addEventListener('click',showMenu);
$('nextBtn').addEventListener('click',()=>{ui.success.classList.add('hidden');if(state.mode==='campaign'){if(state.level.id>=LEVELS.length){showMenu();return}state.levelIndex=state.level.id;startLevel(state.levelIndex)}else freeCreate()});
addEventListener('blur',()=>{state.dragging=false;state.pointerId=null});

function updateClock(){const d=new Date(),h=String(d.getHours()).padStart(2,'0'),m=String(d.getMinutes()).padStart(2,'0');$('clock').textContent=h+':'+m}
updateClock();setInterval(updateClock,30000);renderMenu();if(!save.guideV6)ui.tutorial.classList.remove('hidden');
})();
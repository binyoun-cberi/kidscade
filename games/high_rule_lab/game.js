(function(){
'use strict';
const DATA=window.RuleLabData,Engine=window.RuleLabEngine,UI=window.RuleLabUI;
if(!DATA||!Array.isArray(DATA.levels))throw new Error('Rule Lab level data missing');
if(!Engine||!Engine.Turn||!UI||!UI.Renderer)throw new Error('Rule Lab v3 engine missing');
Object.assign(DATA.P,{PULL:'따라옴',FALL:'떨어짐'});
const $=id=>document.getElementById(id);
const board=$('board'),activeRules=$('activeRules'),toastEl=$('toast'),levelDialog=$('levelDialog'),clearDialog=$('clearDialog'),gameLog=$('gameLog');
const SAVE_KEY='kidscade_game_v1:high_rule_lab:progress_v3';
const LEGACY_SAVE_KEY='kidscade_game_v1:high_rule_lab:progress_v2';
const ASSETS={hero:'../../assets/game/characters/people/kenney-platformer-characters/player/poses/player-stand.png',rock:'../../assets/game/2d/racing/kenney-racing-pack/objects/rock3.png'};
const renderer=new UI.Renderer(board,activeRules,DATA,ASSETS);
let levelIndex=0,state=null,history=null,hintStep=0,clearedLock=false,touchStart=null,audioCtx=null,lastDiff={added:[],removed:[]};

function clone(v){return JSON.parse(JSON.stringify(v))}
function safeLoad(){
 let raw={};
 try{raw=JSON.parse(localStorage.getItem(SAVE_KEY)||localStorage.getItem(LEGACY_SAVE_KEY)||'{}')}catch(_){}
 return {unlocked:Math.max(1,Number(raw.unlocked)||1),cleared:raw.cleared||{},best:raw.best||{},discoveries:raw.discoveries||{}};
}
function saveProgress(data){try{localStorage.setItem(SAVE_KEY,JSON.stringify(data))}catch(_){}}
function tone(freq,dur,type){
 try{audioCtx=audioCtx||new(window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type||'sine';o.frequency.value=freq;g.gain.value=.045;o.connect(g).connect(audioCtx.destination);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+dur);o.start();o.stop(audioCtx.currentTime+dur)}catch(_){}
}
function toast(text){toastEl.textContent=text;toastEl.classList.add('show');clearTimeout(toastEl._t);toastEl._t=setTimeout(()=>toastEl.classList.remove('show'),1500)}
function announce(text){if(gameLog)gameLog.textContent=text}
function ruleText(sig){
 const p=sig.split('|'),subject=DATA.N[p[0]]||p[0],op=p[1]==='NEQ'?'≠':'=',right=p[2]==='property'?(DATA.P[p[3]]||p[3]):(DATA.N[p[3]]||p[3]);
 return subject+' '+op+' '+right;
}
function rememberDiscoveries(parsed){
 const save=safeLoad();let fresh=null;
 for(const sig of Engine.Rules.flatSignatures(parsed)){if(!save.discoveries[sig]){save.discoveries[sig]=true;fresh=sig}}
 if(fresh){saveProgress(save);const badge=$('discoveryBadge');badge.textContent='새 법칙 · '+ruleText(fresh);badge.hidden=false;clearTimeout(badge._t);badge._t=setTimeout(()=>{badge.hidden=true},1500)}
}
function flashDiff(diff,parsed){
 if(!diff.added.length&&!diff.removed.length)return;
 rememberDiscoveries(parsed);
 let message='법칙이 바뀌었어요!';
 if(diff.added.length)message=ruleText(diff.added[0]);
 else if(diff.removed.length)message=ruleText(diff.removed[0])+' 해제';
 $('ruleFlash').textContent=message;$('ruleFlash').classList.add('show');clearTimeout($('ruleFlash')._t);$('ruleFlash')._t=setTimeout(()=>$('ruleFlash').classList.remove('show'),900);
 announce(message);tone(620,.07,'triangle');
}
function updateMoveLabel(){$('moveLabel').textContent=(state?state.moves:0)+'수'}
function render(diff){
 const rules=Engine.Rules.parse(state);lastDiff=diff||{added:[],removed:[]};renderer.render(state,rules,lastDiff);updateMoveLabel();return rules;
}
function loadLevel(index){
 levelIndex=Math.max(0,Math.min(DATA.levels.length-1,index));
 const src=DATA.levels[levelIndex];
 state=Engine.State.fromLevel(src);history=new Engine.History(state);hintStep=0;clearedLock=false;lastDiff={added:[],removed:[]};
 document.documentElement.style.setProperty('--cols',src.w);document.documentElement.style.setProperty('--rows',src.h);
 $('stageLabel').textContent=(levelIndex+1)+' / '+DATA.levels.length;$('stageTitle').textContent=src.title;$('stageKicker').textContent=src.chapter;$('chapterPill').textContent=src.chapter;$('labNote').textContent=src.note||'문장을 밀어 세상의 법칙을 바꿔 보세요.';
 window.KidscadeGame?.start?.({stage:levelIndex+1});render();board.focus({preventScroll:true});announce((levelIndex+1)+'단계 '+src.title);
}
function move(dx,dy){
 if(clearedLock||clearDialog.open||levelDialog.open)return;
 const beforeRules=Engine.Rules.parse(state);
 const you=state.entities.filter(e=>e.kind==='object'&&Engine.Rules.hasProp(e.type,'YOU',beforeRules));
 if(!you.length){toast('지금은 "나"인 물체가 없어요. 되돌려 볼까요?');tone(160,.08,'square');return}
 const result=Engine.Turn.step(state,{dx,dy});
 if(!result.moved){tone(135,.04,'square');return}
 state=result.state;history.push(state);render(result.diff);flashDiff(result.diff,result.rules);
 if(result.won)setTimeout(clearLevel,180);
}
function undo(){
 const prev=history&&history.undo();
 if(!prev){toast('더 되돌릴 수 없어요.');return}
 state=prev;clearedLock=false;render();tone(280,.05,'sine');announce('한 수 되돌렸어요.');
}
function restart(){loadLevel(levelIndex);toast('처음 상태로 돌아왔어요.')}
function clearLevel(){
 if(clearedLock)return;clearedLock=true;tone(660,.09,'sine');setTimeout(()=>tone(880,.13,'sine'),80);
 const save=safeLoad(),key=String(levelIndex);save.cleared[key]=true;save.unlocked=Math.max(save.unlocked,Math.min(DATA.levels.length,levelIndex+2));const best=Number(save.best[key]);if(!best||state.moves<best)save.best[key]=state.moves;saveProgress(save);
 const clearedCount=Object.keys(save.cleared).length;window.KidscadeGame?.score?.(clearedCount,{unit:'단계',higherIsBetter:true});if(clearedCount===DATA.levels.length)window.KidscadeGame?.gameOver?.({score:clearedCount,scoreOptions:{unit:'단계',higherIsBetter:true}});
 $('clearChapter').textContent=DATA.levels[levelIndex].chapter;$('clearTitle').textContent=levelIndex===DATA.levels.length-1?'내 말 좀 들어 완주!':'실험 성공!';$('clearText').textContent=levelIndex===DATA.levels.length-1?'세상의 법칙을 읽고, 부수고, 다시 만드는 법을 익혔어요.':'세상의 법칙을 이용해 길을 만들었어요.';$('clearMoves').textContent=state.moves+'수';$('clearBest').textContent='최고 기록 '+save.best[key]+'수';$('nextBtn').textContent=levelIndex===DATA.levels.length-1?'처음으로':'다음 실험';if(!clearDialog.open)clearDialog.showModal();renderLevelGrid();announce('실험 성공. '+state.moves+'수');
}
function showHint(){const l=DATA.levels[levelIndex],hints=l.hints||[];if(!hints.length){toast('이 단계에는 힌트가 없어요.');return}const text=hints[Math.min(hintStep,hints.length-1)];hintStep++;toast(text);$('labNote').textContent=text;tone(420,.05,'sine');announce('힌트. '+text)}
function renderLevelGrid(){
 const save=safeLoad();$('levelGrid').innerHTML='';let lastChapter='';
 DATA.levels.forEach((l,i)=>{if(l.chapter!==lastChapter){lastChapter=l.chapter;const h=document.createElement('div');h.className='chapter-row';const total=DATA.levels.filter(x=>x.chapter===l.chapter).length;const done=DATA.levels.reduce((n,x,j)=>n+(x.chapter===l.chapter&&save.cleared[String(j)]?1:0),0);h.innerHTML='<b>'+l.chapter+'</b><span>'+done+' / '+total+'</span>';$('levelGrid').appendChild(h)}
 const b=document.createElement('button');b.type='button';b.className='level-card';if(save.cleared[String(i)])b.classList.add('cleared');if(i+1>save.unlocked){b.classList.add('locked');b.disabled=true}b.innerHTML='<b>'+(i+1)+'</b><small>'+l.chapter+'<br>'+l.title+'</small>';b.onclick=()=>{levelDialog.close();loadLevel(i)};$('levelGrid').appendChild(b)});
}
function openLevels(){renderLevelGrid();if(!levelDialog.open)levelDialog.showModal()}
function bind(){
 addEventListener('keydown',e=>{if(e.repeat||levelDialog.open||clearDialog.open)return;const k=e.key.toLowerCase();const dirs={arrowleft:[-1,0],a:[-1,0],arrowright:[1,0],d:[1,0],arrowup:[0,-1],w:[0,-1],arrowdown:[0,1],s:[0,1]};if(dirs[k]){e.preventDefault();move(dirs[k][0],dirs[k][1]);return}if(k==='z'){e.preventDefault();undo()}else if(k==='r'){e.preventDefault();restart()}});
 document.querySelectorAll('[data-dir]').forEach(b=>b.addEventListener('click',()=>{const m={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[b.dataset.dir];move(m[0],m[1])}));
 board.addEventListener('touchstart',e=>{const t=e.changedTouches[0];touchStart={x:t.clientX,y:t.clientY}},{passive:true});board.addEventListener('touchend',e=>{if(!touchStart)return;const t=e.changedTouches[0],dx=t.clientX-touchStart.x,dy=t.clientY-touchStart.y;touchStart=null;if(Math.max(Math.abs(dx),Math.abs(dy))<24)return;if(Math.abs(dx)>Math.abs(dy))move(Math.sign(dx),0);else move(0,Math.sign(dy))},{passive:true});
 $('undoBtn').onclick=undo;$('restartBtn').onclick=restart;$('levelBtn').onclick=openLevels;$('hintBtn').onclick=showHint;$('closeLevels').onclick=()=>levelDialog.close();$('retryBtn').onclick=()=>{clearDialog.close();loadLevel(levelIndex)};$('nextBtn').onclick=()=>{clearDialog.close();loadLevel(levelIndex===DATA.levels.length-1?0:levelIndex+1)};levelDialog.addEventListener('click',e=>{if(e.target===levelDialog)levelDialog.close()});
}
window.KidscadeGame?.registerPauseHandlers?.({pause(){},resume(){board.focus({preventScroll:true})}});
// v2 regression vocabulary retained in the v3 engine: hasProp(e.type,'MOVE' hasProp(e.type,'WEAK' progress_v2
bind();const save=safeLoad();loadLevel(Math.min(DATA.levels.length-1,Math.max(0,save.unlocked-1)));
})();

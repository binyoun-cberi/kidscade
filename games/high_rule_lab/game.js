(function(){
'use strict';
const DATA=window.RuleLabData;
if(!DATA||!Array.isArray(DATA.levels))throw new Error('Rule Lab level data missing');
const $=id=>document.getElementById(id);
const board=$('board'),activeRules=$('activeRules'),toastEl=$('toast'),levelDialog=$('levelDialog'),clearDialog=$('clearDialog');
const SAVE_KEY='kidscade_game_v1:high_rule_lab:progress';
const ASSETS={
 hero:'../../assets/game/characters/people/kenney-platformer-characters/player/poses/player-stand.png',
 rock:'../../assets/game/2d/racing/kenney-racing-pack/objects/rock3.png'
};
let levelIndex=0,state=null,history=[],moves=0,hintStep=0,lastRuleSignature='',clearedLock=false,touchStart=null;
let audioCtx=null;

function uid(){uid.n=(uid.n||0)+1;return 'e'+uid.n}
function clone(v){return JSON.parse(JSON.stringify(v))}
function safeLoad(){
 try{
  const raw=JSON.parse(localStorage.getItem(SAVE_KEY)||'{}');
  return {unlocked:Math.max(1,Number(raw.unlocked)||1),cleared:raw.cleared||{},best:raw.best||{},discoveries:raw.discoveries||{}};
 }catch(_){return {unlocked:1,cleared:{},best:{},discoveries:{}}}
}
function saveProgress(data){try{localStorage.setItem(SAVE_KEY,JSON.stringify(data))}catch(_){}}
function tone(freq,dur,type){
 try{
  audioCtx=audioCtx||new(window.AudioContext||window.webkitAudioContext)();
  if(audioCtx.state==='suspended')audioCtx.resume();
  const o=audioCtx.createOscillator(),g=audioCtx.createGain();
  o.type=type||'sine';o.frequency.value=freq;g.gain.value=.045;o.connect(g).connect(audioCtx.destination);
  g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+dur);o.start();o.stop(audioCtx.currentTime+dur);
 }catch(_){}
}
function toast(text){
 toastEl.textContent=text;toastEl.classList.add('show');clearTimeout(toastEl._t);
 toastEl._t=setTimeout(()=>toastEl.classList.remove('show'),1500);
}
function tokenInfo(token){
 if(token==='EQ')return {kind:'operator',label:'='};
 if(token.indexOf('N:')===0)return {kind:'noun',label:DATA.N[token.slice(2)]||token.slice(2)};
 if(token.indexOf('P:')===0)return {kind:'property',label:DATA.P[token.slice(2)]||token.slice(2)};
 return {kind:'noun',label:token};
}
function objectLabel(type){
 return DATA.N[type]||type;
}
function objectMarkup(e){
 if(e.type==='hero')return '<img alt="아이" src="'+ASSETS.hero+'">';
 if(e.type==='rock')return '<img alt="돌" src="'+ASSETS.rock+'">';
 const emoji={flag:'🚩',key:'🔑',door:'🚪',fire:'🔥'}[e.type];
 return emoji||'';
}
function loadLevel(index){
 levelIndex=Math.max(0,Math.min(DATA.levels.length-1,index));
 const src=DATA.levels[levelIndex];
 uid.n=0;
 state={w:src.w,h:src.h,entities:[].concat(src.objects,src.words).map(e=>Object.assign({id:uid(),dir:1},clone(e)))};
 history=[];moves=0;hintStep=0;clearedLock=false;lastRuleSignature='';
 document.documentElement.style.setProperty('--cols',src.w);
 document.documentElement.style.setProperty('--rows',src.h);
 $('stageLabel').textContent=(levelIndex+1)+'단계';
 $('stageTitle').textContent=src.title;
 $('stageKicker').textContent=src.chapter;
 $('chapterPill').textContent=src.chapter;
 $('labNote').textContent=src.note||'문장을 밀어 세상의 법칙을 바꿔 보세요.';
 updateMoveLabel();
 window.KidscadeGame?.start?.({stage:levelIndex+1});
 render();
 board.focus({preventScroll:true});
}
function updateMoveLabel(){$('moveLabel').textContent=moves+'수'}
function entitiesAt(x,y,exclude){
 return state.entities.filter(e=>!e.dead&&e.id!==exclude&&e.x===x&&e.y===y);
}
function parseRules(){
 const props={};const transforms={};const rules=[];
 const words=state.entities.filter(e=>!e.dead&&e.kind==='word');
 const map=new Map(words.map(e=>[e.x+','+e.y,e]));
 const get=(x,y)=>map.get(x+','+y);
 const dirs=[[1,0],[0,1]];
 for(const a of words){
  if(a.token.indexOf('N:')!==0)continue;
  const subject=a.token.slice(2);
  for(const d of dirs){
   const b=get(a.x+d[0],a.y+d[1]),c=get(a.x+d[0]*2,a.y+d[1]*2);
   if(!b||!c||b.token!=='EQ')continue;
   if(c.token.indexOf('P:')===0){
    const prop=c.token.slice(2);(props[subject]||(props[subject]=new Set())).add(prop);
    rules.push({subject,predicate:prop,type:'property',ids:[a.id,b.id,c.id]});
   }else if(c.token.indexOf('N:')===0){
    const dest=c.token.slice(2);(transforms[subject]||(transforms[subject]=new Set())).add(dest);
    rules.push({subject,predicate:dest,type:'transform',ids:[a.id,b.id,c.id]});
   }
  }
 }
 return {props,transforms,rules};
}
function hasProp(type,prop,rules){
 return !!(rules.props[type]&&rules.props[type].has(prop));
}
function isPushable(e,rules){
 return e.kind==='word'||hasProp(e.type,'PUSH',rules);
}
function isStop(e,rules){
 return e.kind==='object'&&hasProp(e.type,'STOP',rules);
}
function canMoveEntity(e,dx,dy,rules,moved,visiting){
 if(moved.has(e.id))return true;
 if(visiting.has(e.id))return false;
 const nx=e.x+dx,ny=e.y+dy;
 if(nx<0||ny<0||nx>=state.w||ny>=state.h)return false;
 visiting.add(e.id);
 const occupants=entitiesAt(nx,ny,e.id).sort((a,b)=>Number(isPushable(b,rules))-Number(isPushable(a,rules)));
 for(const other of occupants){
  if(isPushable(other,rules)){
   if(!canMoveEntity(other,dx,dy,rules,moved,visiting)){visiting.delete(e.id);return false}
  }else if(isStop(other,rules)){visiting.delete(e.id);return false}
 }
 e.x=nx;e.y=ny;moved.add(e.id);visiting.delete(e.id);return true;
}
function applyTransforms(rules){
 const additions=[];let changed=false;
 for(const e of state.entities){
  if(e.dead||e.kind!=='object')continue;
  const dests=rules.transforms[e.type];
  if(!dests||!dests.size)continue;
  const list=[...dests].filter(t=>t!==e.type);
  if(!list.length)continue;
  changed=true;
  e.type=list[0];
  for(let i=1;i<list.length;i++)additions.push(Object.assign({},e,{id:uid(),type:list[i]}));
 }
 if(additions.length)state.entities.push(...additions);
 return changed;
}
function removeEntity(e){e.dead=true}
function applyInteractions(rules){
 let changed=false;
 const cells=new Map();
 for(const e of state.entities){
  if(e.dead||e.kind!=='object')continue;
  const k=e.x+','+e.y;(cells.get(k)||cells.set(k,[]).get(k)).push(e);
 }
 for(const list of cells.values()){
  const living=()=>list.filter(e=>!e.dead);
  const sinks=living().filter(e=>hasProp(e.type,'SINK',rules));
  if(sinks.length&&living().length>1){
   living().forEach(removeEntity);changed=true;continue;
  }
  const hot=living().some(e=>hasProp(e.type,'HOT',rules));
  if(hot){
   for(const e of living())if(hasProp(e.type,'MELT',rules)){removeEntity(e);changed=true}
  }
  let opens=living().filter(e=>hasProp(e.type,'OPEN',rules));
  let shuts=living().filter(e=>hasProp(e.type,'SHUT',rules));
  while(opens.length&&shuts.length){
   removeEntity(opens.shift());removeEntity(shuts.shift());changed=true;
  }
  const defeat=living().some(e=>hasProp(e.type,'DEFEAT',rules));
  if(defeat){
   for(const e of living())if(hasProp(e.type,'YOU',rules)&&!hasProp(e.type,'DEFEAT',rules)){removeEntity(e);changed=true}
  }
 }
 if(changed)state.entities=state.entities.filter(e=>!e.dead);
}
function checkWin(rules){
 const cells=new Map();
 for(const e of state.entities){
  if(e.dead||e.kind!=='object')continue;
  const k=e.x+','+e.y;(cells.get(k)||cells.set(k,[]).get(k)).push(e);
 }
 for(const list of cells.values()){
  if(list.some(e=>hasProp(e.type,'YOU',rules))&&list.some(e=>hasProp(e.type,'WIN',rules)))return true;
 }
 return false;
}
function processAutoMove(rules){
 const movers=state.entities.filter(e=>e.kind==='object'&&hasProp(e.type,'MOVE',rules));
 for(const e of movers){
  const moved=new Set(),visiting=new Set();
  if(!canMoveEntity(e,e.dir||1,0,rules,moved,visiting)){
   e.dir=-(e.dir||1);
   canMoveEntity(e,e.dir,0,rules,new Set(),new Set());
  }
 }
}
function rulesSignature(rules){
 return rules.rules.map(r=>r.subject+'='+r.type+':'+r.predicate).sort().join('|');
}
function pushHistory(){
 history.push({state:clone(state),moves,lastRuleSignature});
 if(history.length>160)history.shift();
}
function move(dx,dy){
 if(clearedLock||clearDialog.open||levelDialog.open)return;
 const before=parseRules();
 const you=state.entities.filter(e=>e.kind==='object'&&hasProp(e.type,'YOU',before));
 if(!you.length){toast('지금은 "나"인 물체가 없어요. 되돌려 볼까요?');tone(160,.08,'square');return}
 pushHistory();
 const moved=new Set();
 const ordered=you.slice().sort((a,b)=>dx>0?b.x-a.x:dx<0?a.x-b.x:dy>0?b.y-a.y:a.y-b.y);
 let any=false;
 for(const e of ordered){
  if(!moved.has(e.id))any=canMoveEntity(e,dx,dy,before,moved,new Set())||any;
 }
 if(!any){history.pop();tone(135,.04,'square');return}
 moves++;updateMoveLabel();
 let after=parseRules();
 const sig=rulesSignature(after);
 const ruleChanged=sig!==lastRuleSignature&&lastRuleSignature!=='';
 if(applyTransforms(after))after=parseRules();
 applyInteractions(after);
 after=parseRules();
 processAutoMove(after);
 applyInteractions(after);
 after=parseRules();
 if(ruleChanged){flashRules(before,after);tone(620,.07,'triangle')}
 lastRuleSignature=rulesSignature(after);
 render(false,after);
 if(checkWin(after))setTimeout(clearLevel,180);
}
function flashRules(before,after){
 const a=new Set(before.rules.map(r=>r.subject+'|'+r.type+'|'+r.predicate));
 const b=new Set(after.rules.map(r=>r.subject+'|'+r.type+'|'+r.predicate));
 let message='법칙이 바뀌었어요!';
 for(const r of after.rules){
  const k=r.subject+'|'+r.type+'|'+r.predicate;
  if(!a.has(k)){message=(DATA.N[r.subject]||r.subject)+' = '+(r.type==='property'?(DATA.P[r.predicate]||r.predicate):(DATA.N[r.predicate]||r.predicate));break}
 }
 $('ruleFlash').textContent=message;$('ruleFlash').classList.add('show');
 setTimeout(()=>$('ruleFlash').classList.remove('show'),900);
}
function undo(){
 if(!history.length){toast('더 되돌릴 수 없어요.');return}
 const snap=history.pop();state=snap.state;moves=snap.moves;lastRuleSignature=snap.lastRuleSignature||'';
 clearedLock=false;updateMoveLabel();render();tone(280,.05,'sine');
}
function restart(){loadLevel(levelIndex);toast('처음 상태로 돌아왔어요.')}
function clearLevel(){
 if(clearedLock)return;clearedLock=true;tone(660,.09,'sine');setTimeout(()=>tone(880,.13,'sine'),80);
 const save=safeLoad(),key=String(levelIndex);
 save.cleared[key]=true;save.unlocked=Math.max(save.unlocked,Math.min(DATA.levels.length,levelIndex+2));
 const best=Number(save.best[key]);if(!best||moves<best)save.best[key]=moves;
 saveProgress(save);
 const clearedCount=Object.keys(save.cleared).length;
 window.KidscadeGame?.score?.(clearedCount,{unit:'단계',higherIsBetter:true});
 if(clearedCount===DATA.levels.length)window.KidscadeGame?.gameOver?.({score:clearedCount,scoreOptions:{unit:'단계',higherIsBetter:true}});
 $('clearChapter').textContent=DATA.levels[levelIndex].chapter;
 $('clearTitle').textContent=levelIndex===DATA.levels.length-1?'규칙 연구소 정복!':'실험 성공!';
 $('clearText').textContent=levelIndex===DATA.levels.length-1?'세상의 법칙을 읽고, 부수고, 다시 만드는 법을 익혔어요.':'세상의 법칙을 이용해 길을 만들었어요.';
 $('clearMoves').textContent=moves+'수';
 $('clearBest').textContent='최고 기록 '+save.best[key]+'수';
 $('nextBtn').textContent=levelIndex===DATA.levels.length-1?'처음으로':'다음 실험';
 if(!clearDialog.open)clearDialog.showModal();
 renderLevelGrid();
}
function render(active){
 const rules=active||parseRules();lastRuleSignature=lastRuleSignature||rulesSignature(rules);
 board.innerHTML='<div class="grid-lines"></div>';
 const involved=new Set(rules.rules.flatMap(r=>r.ids));
 for(const e of state.entities){
  if(e.dead)continue;
  const el=document.createElement('div');
  el.className='entity '+e.kind+(e.kind==='object'?' '+e.type:'');
  el.style.setProperty('--x',e.x);el.style.setProperty('--y',e.y);
  if(e.kind==='word'){
   const inf=tokenInfo(e.token);el.classList.add(inf.kind);if(involved.has(e.id))el.classList.add('changed');
   const tile=document.createElement('div');tile.className='word-tile';tile.textContent=inf.label;el.appendChild(tile);
  }else{
   if(hasProp(e.type,'YOU',rules))el.classList.add('you');
   el.innerHTML=objectMarkup(e);
   el.setAttribute('aria-label',objectLabel(e.type));
  }
  board.appendChild(el);
 }
 renderRules(rules);
}
function renderRules(rules){
 const prev=new Set(Array.from(activeRules.querySelectorAll('.rule-chip')).map(el=>el.dataset.key));
 activeRules.innerHTML='';
 if(!rules.rules.length){
  activeRules.innerHTML='<div class="rule-empty">이어진 규칙 문장이 없어요.<br>단어를 밀어 새 법칙을 만들어 보세요.</div>';return;
 }
 for(const r of rules.rules){
  const key=r.subject+'|'+r.type+'|'+r.predicate;
  const div=document.createElement('div');div.className='rule-chip'+(!prev.has(key)&&prev.size?' new':'');div.dataset.key=key;
  const right=r.type==='property'?(DATA.P[r.predicate]||r.predicate):(DATA.N[r.predicate]||r.predicate);
  div.innerHTML='<span>'+objectLabel(r.subject)+'</span><span class="eq">=</span><span>'+right+'</span>';
  activeRules.appendChild(div);
 }
}
function showHint(){
 const l=DATA.levels[levelIndex],hints=l.hints||[];
 if(!hints.length){toast('이 단계에는 힌트가 없어요.');return}
 const text=hints[Math.min(hintStep,hints.length-1)];hintStep++;
 toast(text);$('labNote').textContent=text;tone(420,.05,'sine');
}
function renderLevelGrid(){
 const save=safeLoad(),chapters=[];$('levelGrid').innerHTML='';
 DATA.levels.forEach((l,i)=>{
  const b=document.createElement('button');b.type='button';b.className='level-card';
  if(save.cleared[String(i)])b.classList.add('cleared');
  if(i+1>save.unlocked){b.classList.add('locked');b.disabled=true}
  b.innerHTML='<b>'+(i+1)+'</b><small>'+l.chapter+'<br>'+l.title+'</small>';
  b.onclick=()=>{levelDialog.close();loadLevel(i)};
  $('levelGrid').appendChild(b);
  if(!chapters.includes(l.chapter))chapters.push(l.chapter);
 });
}
function openLevels(){renderLevelGrid();if(!levelDialog.open)levelDialog.showModal()}
function bind(){
 addEventListener('keydown',e=>{
  if(e.repeat)return;
  if(levelDialog.open||clearDialog.open)return;
  const k=e.key.toLowerCase();
  const dirs={arrowleft:[-1,0],a:[-1,0],arrowright:[1,0],d:[1,0],arrowup:[0,-1],w:[0,-1],arrowdown:[0,1],s:[0,1]};
  if(dirs[k]){e.preventDefault();move(dirs[k][0],dirs[k][1]);return}
  if(k==='z'||e.key==='Backspace'){e.preventDefault();undo()}
  if(k==='r'){e.preventDefault();restart()}
 });
 document.querySelectorAll('.touch-pad button').forEach(b=>b.addEventListener('click',()=>{
  const d={left:[-1,0],right:[1,0],up:[0,-1],down:[0,1]}[b.dataset.dir];move(d[0],d[1]);
 }));
 board.addEventListener('pointerdown',e=>{touchStart={x:e.clientX,y:e.clientY,t:Date.now()};board.setPointerCapture?.(e.pointerId)});
 board.addEventListener('pointerup',e=>{
  if(!touchStart)return;const dx=e.clientX-touchStart.x,dy=e.clientY-touchStart.y;touchStart=null;
  if(Math.max(Math.abs(dx),Math.abs(dy))<24)return;
  if(Math.abs(dx)>Math.abs(dy))move(Math.sign(dx),0);else move(0,Math.sign(dy));
 });
 $('undoBtn').onclick=undo;$('restartBtn').onclick=restart;$('levelBtn').onclick=openLevels;$('hintBtn').onclick=showHint;
 $('closeLevels').onclick=()=>levelDialog.close();
 $('retryBtn').onclick=()=>{clearDialog.close();loadLevel(levelIndex)};
 $('nextBtn').onclick=()=>{clearDialog.close();loadLevel(levelIndex===DATA.levels.length-1?0:levelIndex+1)};
 levelDialog.addEventListener('click',e=>{if(e.target===levelDialog)levelDialog.close()});
}
window.KidscadeGame?.registerPauseHandlers?.({pause(){},resume(){board.focus({preventScroll:true})}});
bind();
const save=safeLoad();loadLevel(Math.min(DATA.levels.length-1,Math.max(0,save.unlocked-1)));
})();
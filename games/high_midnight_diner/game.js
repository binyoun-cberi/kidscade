(function(){
'use strict';
const R=window.MidnightDinerRules,P=window.MidnightDinerPlate;
const $=id=>document.getElementById(id);
const saveKey='midnightDinerBestV1';
let game=null,chosen=null,audio=null,muted=false,record=0,started=false,reviewPending=false,runReported=false,cookTimer=null,peekHeld=false,lastCookTick=0,lastGazePhase='',caughtFlashIndex=-1;
try{record=Number(localStorage.getItem(saveKey))||0;}catch(_){}
function sound(type){
 if(muted)return;
 try{audio=audio||new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();
 const osc=audio.createOscillator(),gain=audio.createGain(),now=audio.currentTime;
 osc.type=type==='danger'?'sawtooth':type==='warn'?'triangle':'sine';osc.frequency.setValueAtTime(type==='danger'?125:type==='warn'?940:type==='safe'?570:280,now);
 osc.frequency.exponentialRampToValueAtTime(type==='danger'?54:type==='warn'?520:type==='safe'?790:160,now+.19);
 gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.08,now+.012);gain.gain.exponentialRampToValueAtTime(.0001,now+.24);
 osc.connect(gain).connect(audio.destination);osc.start(now);osc.stop(now+.26);
 }catch(_){}
}
function reportMood(shock){
 if(!game)return;
 window.dispatchEvent(new CustomEvent('midnight-diner:state',{detail:{course:game.course,suspicion:game.suspicion,phase:game.phase,shock:!!shock}}));
 const mood=game.suspicion>=75?'요리사가 당신을 노려본다':game.suspicion>=40?'요리사의 손가락이 움직인다':'요리사는 당신을 지켜본다';
 $('chefMood').textContent=mood;
}
function note(message,style){
 const el=$('feedback');el.textContent=message;el.className='feedback'+(style?' '+style:'');
}
function repaint(){
 if(!game)return;
 const dish=game.dish;
 $('healthText').textContent=game.health;$('healthBar').style.width=game.health+'%';
 $('hungerText').textContent=game.hunger;$('hungerBar').style.width=game.hunger+'%';
 $('suspicionText').textContent=game.suspicion;$('suspicionBar').style.width=game.suspicion+'%';
 $('courseNum').textContent='COURSE '+String(Math.min(game.course+1,R.FOODS.length)).padStart(2,'0')+' / '+String(R.FOODS.length).padStart(2,'0');
 const timeline=$('courseTimeline');timeline.replaceChildren();
 for(let i=0;i<R.FOODS.length;i++){const step=document.createElement('span');step.className='course-step '+(i<game.course?'done':i===game.course?'active':'waiting');step.textContent=String(i+1).padStart(2,'0');step.setAttribute('aria-label',String(i+1)+'번째 접시 '+(i<game.course?'완료':i===game.course?'진행 중':'미진행'));timeline.append(step);}
 $('courseTitle').textContent=dish.spec.title;$('courseDetail').textContent=dish.spec.detail;
 $('banned').textContent=dish.spec.word;$('bites').textContent=dish.eaten+' / 3 한입';
 $('inspections').textContent=dish.inspectionsLeft+'회';
 $('selectionText').textContent=chosen===null?'어느 부분을 먹을까요?':String(chosen+1)+'번 부분 선택';
 const layout=document.querySelector('.game-layout');
 layout.classList.toggle('cooking',game.phase==='cooking');
 layout.classList.toggle('eating',game.phase==='playing');
 $('cookPanel').classList.toggle('hidden',game.phase!=='cooking');
 $('memoryPanel').classList.toggle('hidden',!dish.observed.length);
 renderMemory();
 const selectable=!reviewPending&&chosen!==null&&!dish.zones[chosen]?.removed&&game.phase==='playing';
 $('eatBtn').disabled=!selectable;$('inspectBtn').disabled=!selectable||(!dish.inspectionsLeft&&!dish.zones[chosen]?.inspected);
 $('questionBtn').disabled=reviewPending||game.phase!=='playing'||dish.asked;
 $('rejectBtn').disabled=reviewPending||game.phase!=='playing';
 $('score').textContent='점수 '+game.score;
 $('record').textContent='최고 기록 '+record;
 P.draw($('plate'),dish,chosen);
 reportMood(false);
}
function intro(){ $('veil').classList.remove('hidden');$('introModal').classList.remove('hidden');$('resultModal').classList.add('hidden');}
function start(){
 stopCooking();game=R.begin();chosen=null;started=true;reviewPending=false;runReported=false;
 $('reviewVeil').classList.add('hidden');
 $('veil').classList.add('hidden');$('notebookPanel').classList.add('hidden');
 $('chefLine').textContent='“'+game.dish.spec.line+'”';
 note('등을 돌릴 때 꾹 누르고, 어깨가 움직이면 즉시 놓으세요! 들키면 의심이 크게 올라갑니다.');
 try{window.KidscadeGame?.start?.();}catch(_){}
 repaint();reportMood(false);startCooking();
}
function finish(){
 if(game.phase!=='finished'||runReported)return;runReported=true;stopCooking();
 reviewPending=false;$('reviewVeil').classList.add('hidden');
 $('veil').classList.remove('hidden');$('introModal').classList.add('hidden');$('resultModal').classList.remove('hidden');
 $('endTitle').textContent=game.ending.title;$('endMessage').textContent=game.ending.message;
 $('endStats').replaceChildren();
 for(const s of ['안전한 한입 '+game.safeBites,'점수 '+game.score,'실수 '+game.dangers]){const span=document.createElement('span');span.textContent=s;$('endStats').append(span);}
 if(game.score>record){record=game.score;try{localStorage.setItem(saveKey,String(record));}catch(_){}}
 try{window.KidscadeGame?.score?.(game.score);window.KidscadeGame?.result?.({scope:'run',status:game.ending.won?'completed':'failed',outcome:game.ending.won?'win':'loss',score:game.score,safeBites:game.safeBites});}catch(_){}
 reportMood(true);
}

const COOK_TICK_MS=50;
function stopCooking(){
 if(cookTimer!==null){clearInterval(cookTimer);cookTimer=null;}
 peekHeld=false;lastGazePhase='';
 $('peekBtn').classList.remove('looking');
}
function renderMemory(){
 if(!game)return;
 const entries=$('memoryEntries');entries.replaceChildren();
 const list=game.dish.observed||[];
 if(!list.length){entries.textContent='아직 알아낸 재료가 없습니다. 흘끔 보기로 확인하세요.';return;}
 for(const info of list){
  const chip=document.createElement('span');
  chip.className='memory-chip '+(info.dangerous?'hazard':'safe');
  chip.textContent=info.zone+'번 · '+info.ingredient;
  entries.append(chip);
 }
}
function updateGaze(){
 if(!game||game.phase!=='cooking')return;
 const ev=R.cookingEvent(game);if(!ev)return;
 const labels={SAFE:'등을 돌리고 있다 · 지금 관찰 가능',WARN:'어깨가 움직인다 · 눈을 떼!',LOOK:'요리사가 돌아봤다 · 보지 마!'};
 const names={SAFE:'안전',WARN:'경고',LOOK:'응시'};
 const phase=ev.phase;
 const nextCost=R.peekCost(game.dish.peekCount);
 $('peekBudget').textContent=nextCost?'이미 '+game.dish.peekCount+'회 확인 · 다음 관찰 의심 +'+nextCost:'이미 '+game.dish.peekCount+'회 확인 · 다음 관찰 부담 없음';
 $('peekBudget').classList.toggle('costly',nextCost>0);
 $('peekCaption').textContent=phase==='SAFE'?'꾹 눌러 훔쳐보기':phase==='WARN'?'지금 손 떼기!':'요리사가 보고 있다!';
 const clock=$('cookClock');
 clock.textContent=names[phase];
 clock.className='gaze-indicator gaze-'+phase.toLowerCase();
 const stage=$('cookFlash'),peek=game.dish.currentPeek;
 stage.classList.toggle('revealed',!!peek&&peekHeld&&!peek.concealed&&phase==='SAFE');
 stage.classList.toggle('gaze-warn',phase==='WARN');
 stage.classList.toggle('gaze-look',phase==='LOOK');
 stage.textContent=phase==='SAFE'&&peekHeld&&peek?
   peek.concealed?'손에 가려 재료를 보지 못했다.':peek.zone+'번: '+peek.ingredient:
   labels[phase];
 $('peekBtn').disabled=phase==='LOOK';
 $('peekBtn').classList.toggle('warning',phase==='WARN');
 $('peekBtn').classList.toggle('looking',peekHeld);
 const timeFraction=(ev.index+ev.elapsedMs/ev.totalMs)/ev.total;
 $('cookBar').style.width=(100*timeFraction).toFixed(1)+'%';
 if(phase!==lastGazePhase){
  lastGazePhase=phase;
  window.dispatchEvent(new CustomEvent('midnight-diner:gaze',{detail:{phase,course:game.course,zone:ev.zone}}));
  if(phase==='WARN')sound('warn');
  dispatchCookVisual();
 }
}
function updateCookScene(){
 if(!game||game.phase!=='cooking')return;
 const ev=R.cookingEvent(game),dish=game.dish;
 if(!ev)return;
 const slots=$('cookSlots');slots.replaceChildren();
 slots.style.setProperty('--slots',String(dish.spec.count));
 for(let i=0;i<dish.spec.count;i++){
  const item=document.createElement('span');
  item.className='cook-slot'+(i===ev.zone-1?' current':'')+
   (dish.observed.some(x=>x.zone===i+1)?' seen':'');
  item.textContent=String(i+1);slots.append(item);
 }
 $('cookStage').textContent='조리 '+(ev.index+1)+' / '+ev.total+' · '+dish.spec.title;
 updateGaze();
}
function dispatchCookVisual(){
 if(game?.phase!=='cooking')return;
 const ev=R.cookingEvent(game),peek=game.dish.currentPeek;
 window.dispatchEvent(new CustomEvent('midnight-diner:cooking',{
  detail:{course:game.course,zone:ev.zone,step:ev.index,total:ev.total,
   looking:peekHeld&&ev.phase==='SAFE'&&!!peek,concealed:!!peek?.concealed,
   ingredient:peekHeld&&ev.phase==='SAFE'?peek?.ingredient||null:null}
 }));
}
function startCooking(){
 stopCooking();
 if(!game||game.phase!=='cooking')return;
 chosen=null;lastCookTick=performance.now();
 $('chefLine').textContent='“'+game.dish.spec.line+'”';
 updateCookScene();repaint();dispatchCookVisual();
 cookTimer=setInterval(()=>{
  if(!game||game.phase!=='cooking'||reviewPending){stopCooking();return;}
  const now=performance.now(),dt=Math.max(0,Math.min(100,now-lastCookTick));
  lastCookTick=now;
  if(document.hidden)return;
  const outcome=R.tickCooking(game,dt,peekHeld);
  if(!outcome.ok){stopCooking();return;}
  if(outcome.revealed){
   const peek=game.dish.currentPeek;
   if(peek)note(outcome.message, R.peekCost(game.dish.peekCount-1)>0?'danger':'good');
   sound(R.peekCost(game.dish.peekCount-1)>0?'warn':'safe');renderMemory();
  }
  if(outcome.warned){note('어깨가 움직였다! 지금 눈을 떼야 해.','danger');reportMood(false);}
  if(outcome.caught){
   onPeekUp();sound('danger');
   $('chefLine').textContent='“'+outcome.message+'”';
   note('발각! 의심도가 크게 올랐다. ('+game.catches+'회 적발)','danger');
   reportMood(true);
   window.dispatchEvent(new CustomEvent('midnight-diner:caught',{detail:{catches:game.catches,suspicion:game.suspicion}}));
  }
  if(game.phase==='finished'){stopCooking();finish();return;}
  if(outcome.finishedCooking){
   stopCooking();$('cookBar').style.width='100%';
   $('chefLine').textContent='“자, 다 됐어. 이번에는 어디를 먹겠니?”';
   note('조리 완료. 몰래 본 재료 위치를 기억해 안전한 부분을 선택하세요.');
   repaint();
   if(window.innerWidth<=930)window.scrollTo?.({top:0,behavior:'instant'});
   return;
  }
  if(outcome.finishedStep){lastGazePhase='';updateCookScene();dispatchCookVisual();}
  else{updateGaze();if(outcome.revealed||outcome.caught)dispatchCookVisual();}
  $('suspicionText').textContent=game.suspicion;
  $('suspicionBar').style.width=game.suspicion+'%';
 },COOK_TICK_MS);
}
function onPeekDown(ev){
 if(ev?.cancelable)ev.preventDefault();
 if(!game||game.phase!=='cooking'||reviewPending)return;
 if(R.gazePhase(game)==='LOOK')return;
 peekHeld=true;$('peekBtn').classList.add('looking');
 updateGaze();
}
function onPeekUp(){
 const previouslyHeld=peekHeld;
 peekHeld=false;$('peekBtn').classList.remove('looking');
 if(previouslyHeld&&game?.phase==='cooking'){updateGaze();dispatchCookVisual();}
}
$('peekBtn').addEventListener('pointerdown',onPeekDown);
for(const kind of ['pointerup','pointercancel','pointerleave'])$('peekBtn').addEventListener(kind,onPeekUp);
window.addEventListener('pointerup',onPeekUp);

function showReview(review){
 reviewPending=true;
 $('reviewTitle').textContent=review.rejected?'접시를 돌려보냈다':'접시를 비웠다';
 $('reviewSummary').textContent=review.rejected?
  review.title+'을(를) 거절했습니다. 허기는 줄었고 요리사의 의심은 커졌습니다.':
  '안전한 한입 '+review.safe+'회 · 위험 재료를 먹은 횟수 '+review.misses+'회'+(review.bonus?' · 완벽 식사 보너스 +'+review.bonus:'');
 $('reviewZones').replaceChildren();
 const bad=new Set(review.dangerousZones);
 for(let i=1;i<=R.FOODS[review.course].count;i++){
  const dot=document.createElement('span');dot.textContent=String(i);
  dot.className='review-zone '+(bad.has(i)?'hazard':'safe');
  dot.setAttribute('aria-label',i+'번 '+(bad.has(i)?'위험':'안전'));
  $('reviewZones').append(dot);
 }
 $('reviewClue').textContent='발견한 단서: '+review.clue;
 $('reviewVeil').classList.remove('hidden');
 repaint();
}
function dismissReview(){
 if(!reviewPending)return;
 reviewPending=false;$('reviewVeil').classList.add('hidden');
 if(game.phase==='cooking'){$('chefLine').textContent='“좋아, 다음 음식도 직접 보겠다고?”';startCooking();}
 else if(game.phase==='playing')$('chefLine').textContent='“'+game.dish.spec.line+'”';
 note('조리 기록을 기억하고 위험해 보이는 부분을 피하세요.');
 repaint();
}
$('nextCourseBtn').addEventListener('click',dismissReview);

function act(name){
 if(!game||game.phase!=='playing')return;
 if(reviewPending)return;
 const before=game.course;let outcome;
 if(name==='eat'||name==='inspect'){if(chosen===null)return;outcome=R[name](game,chosen);}
 else outcome=R[name](game);
 if(!outcome.ok){note(outcome.message);repaint();return;}
 window.dispatchEvent(new CustomEvent('midnight-diner:action',{detail:{name,dangerous:!!outcome.dangerous,course:before}}));
 if(name==='eat'){
  sound(outcome.dangerous?'danger':'safe');chosen=null;
  const glow=$('plateGlow');glow.classList.remove('danger','safe-bite');void glow.offsetWidth;
  glow.classList.add(outcome.dangerous?'danger':'safe-bite');
 }
 else sound('tap');
 if(name==='reject'||name==='question')chosen=null;
 note(outcome.message,outcome.dangerous?'danger':name==='eat'?'good':'');
 if(game.course!==before){chosen=null;$('chefLine').textContent='“한 접시 끝났군. 하지만 문은 아직 열리지 않았어.”';}
 else if(name==='reject')$('chefLine').textContent='“정말 안 먹겠다고?”';
 else if(name==='question')$('chefLine').textContent='“더는 묻지 마.”';
 else if(outcome.dangerous)$('chefLine').textContent='“천천히. 아직 끝나지 않았어.”';
 else if(name==='eat')$('chefLine').textContent='“그래, 한입 더.”';
 repaint();reportMood(!!outcome.dangerous);
 if(game.phase==='finished')finish();
 else if(outcome.courseReview)showReview(outcome.courseReview);
}
$('plate').addEventListener('pointerdown',ev=>{
 if(!game||game.phase!=='playing'||reviewPending)return;
 const index=P.hit($('plate'),ev,game.dish);
 if(index===null||index===undefined)return;
 if(game.dish.zones[index]?.removed){note('이미 먹은 부분이에요. 다른 부분을 골라 주세요.');return;}
 chosen=index;sound('tap');repaint();
});
for(const [id,name] of [['eatBtn','eat'],['inspectBtn','inspect'],['questionBtn','question'],['rejectBtn','reject']])$(id).addEventListener('click',()=>act(name));
$('startBtn').addEventListener('click',start);$('retryBtn').addEventListener('click',start);
$('soundBtn').addEventListener('click',()=>{muted=!muted;$('soundBtn').textContent=muted?'소리 끔':'소리 켬';});
function notebook(){
 $('notebookEntries').replaceChildren();
 const found=new Set(game?.discovered||[]);
 for(const [key,entry] of Object.entries(R.INGREDIENTS)){
 const item=document.createElement('div');item.className='note';
 const b=document.createElement('b'),small=document.createElement('small');
 b.textContent=entry.name+' '+(found.has(key)?'✓':'?');
 small.textContent=found.has(key)?entry.clue:'조사하거나 직접 먹어 보면 기록됩니다.';
 item.append(b,small);$('notebookEntries').append(item);
 }
 $('notebookPanel').classList.remove('hidden');
}
$('notebookBtn').addEventListener('click',notebook);$('closeNotebook').addEventListener('click',()=>$('notebookPanel').classList.add('hidden'));
$('notebookPanel').addEventListener('click',e=>{if(e.target===$('notebookPanel'))$('notebookPanel').classList.add('hidden');});
window.addEventListener('keyup',e=>{if(e.code==='Space')onPeekUp();});
window.addEventListener('blur',onPeekUp);
document.addEventListener('visibilitychange',()=>{if(document.hidden){onPeekUp();lastCookTick=performance.now();}});
window.addEventListener('keydown',e=>{
 if(e.key==='Escape'){$('notebookPanel').classList.add('hidden');return;}
 if(e.code==='Space'&&game?.phase==='cooking'){if(!e.repeat)onPeekDown(e);e.preventDefault();return;}
 if(reviewPending){if(e.key==='Enter')dismissReview();return;}
 if(!game||game.phase!=='playing'||!$('notebookPanel').classList.contains('hidden'))return;
 const n=Number(e.key);
 if(Number.isInteger(n)&&n>=1&&n<=game.dish.zones.length){
  if(!game.dish.zones[n-1].removed){chosen=n-1;repaint();}return;
 }
 const key=e.key.toLowerCase();
 if(key==='e')act('eat');
 if(key==='i')act('inspect');
 if(key==='q')act('question');
 if(key==='r')act('reject');
});
$('plateGlow').addEventListener('animationend',()=>$('plateGlow').classList.remove('danger','safe-bite'));
intro();
})();
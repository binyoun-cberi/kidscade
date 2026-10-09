(function(){
'use strict';
const R=window.MidnightDinerRules,P=window.MidnightDinerPlate;
const $=id=>document.getElementById(id);
const saveKey='midnightDinerBestV1';
let game=null,chosen=null,audio=null,muted=false,record=0,started=false;
try{record=Number(localStorage.getItem(saveKey))||0;}catch(_){}
function sound(type){
 if(muted)return;
 try{audio=audio||new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();
 const osc=audio.createOscillator(),gain=audio.createGain(),now=audio.currentTime;
 osc.type=type==='danger'?'sawtooth':'sine';osc.frequency.setValueAtTime(type==='danger'?125:type==='safe'?570:280,now);
 osc.frequency.exponentialRampToValueAtTime(type==='danger'?54:type==='safe'?790:160,now+.19);
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
 $('courseNum').textContent='COURSE '+String(game.course+1).padStart(2,'0')+' / 03';
 $('courseTitle').textContent=dish.spec.title;$('courseDetail').textContent=dish.spec.detail;
 $('banned').textContent=dish.spec.word;$('bites').textContent=dish.eaten+' / 3 한입';
 $('inspections').textContent=dish.inspectionsLeft+'회';
 $('selectionText').textContent=chosen===null?'어느 부분을 먹을까요?':String(chosen+1)+'번 부분 선택';
 const selectable=chosen!==null&&!dish.zones[chosen]?.removed&&game.phase==='playing';
 $('eatBtn').disabled=!selectable;$('inspectBtn').disabled=!selectable||(!dish.inspectionsLeft&&!dish.zones[chosen]?.inspected);
 $('questionBtn').disabled=game.phase!=='playing'||dish.asked;
 $('rejectBtn').disabled=game.phase!=='playing';
 $('score').textContent='점수 '+game.score;
 $('record').textContent='최고 기록 '+record;
 P.draw($('plate'),dish,chosen);
 reportMood(false);
}
function intro(){ $('veil').classList.remove('hidden');$('introModal').classList.remove('hidden');$('resultModal').classList.add('hidden');}
function start(){
 game=R.begin();chosen=null;started=true;
 $('veil').classList.add('hidden');$('notebookPanel').classList.add('hidden');
 $('chefLine').textContent='“'+game.dish.spec.line+'”';
 note('각 접시에서 세 입을 먹으세요. 위험한 재료에는 눈에 보이는 특징이 있어요.');
 try{window.KidscadeGame?.start?.();}catch(_){}
 repaint();reportMood(false);
}
function finish(){
 if(game.phase!=='finished')return;
 $('veil').classList.remove('hidden');$('introModal').classList.add('hidden');$('resultModal').classList.remove('hidden');
 $('endTitle').textContent=game.ending.title;$('endMessage').textContent=game.ending.message;
 $('endStats').replaceChildren();
 for(const s of ['안전한 한입 '+game.safeBites,'점수 '+game.score,'실수 '+game.dangers]){const span=document.createElement('span');span.textContent=s;$('endStats').append(span);}
 if(game.score>record){record=game.score;try{localStorage.setItem(saveKey,String(record));}catch(_){}}
 try{window.KidscadeGame?.score?.(game.score);window.KidscadeGame?.result?.({scope:'run',status:game.ending.won?'completed':'failed',outcome:game.ending.won?'win':'loss',score:game.score,safeBites:game.safeBites});}catch(_){}
 reportMood(true);
}
function act(name){
 if(!game||game.phase!=='playing')return;
 const before=game.course;let outcome;
 if(name==='eat'||name==='inspect'){if(chosen===null)return;outcome=R[name](game,chosen);}
 else outcome=R[name](game);
 if(!outcome.ok){note(outcome.message);repaint();return;}
 if(name==='eat'){sound(outcome.dangerous?'danger':'safe');chosen=null;if(outcome.dangerous)$('plateGlow').classList.add('danger');}
 else sound('tap');
 if(name==='reject'||name==='question')chosen=null;
 note(outcome.message,outcome.dangerous?'danger':name==='eat'?'good':'');
 if(game.course!==before){chosen=null;$('chefLine').textContent='“'+game.dish.spec.line+'”';}
 else if(name==='reject')$('chefLine').textContent='“정말 안 먹겠다고?”';
 else if(name==='question')$('chefLine').textContent='“더는 묻지 마.”';
 else if(outcome.dangerous)$('chefLine').textContent='“천천히. 아직 끝나지 않았어.”';
 else if(name==='eat')$('chefLine').textContent='“그래, 한입 더.”';
 repaint();reportMood(!!outcome.dangerous);if(game.phase==='finished')finish();
}
$('plate').addEventListener('pointerdown',ev=>{
 if(!game||game.phase!=='playing')return;
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
window.addEventListener('keydown',e=>{
 if(e.key==='Escape'){$('notebookPanel').classList.add('hidden');return;}
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
$('plateGlow').addEventListener('animationend',()=>$('plateGlow').classList.remove('danger'));
intro();
})();
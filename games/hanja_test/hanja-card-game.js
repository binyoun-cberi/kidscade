
(function(){
'use strict';

const DATA=window.KIDSCADE_HANJA_GRADE_DATA;
if(!DATA||!Array.isArray(DATA.entries)){throw new Error('한자 급수 데이터를 불러오지 못했습니다.');}

const ROUND_SIZE=25;
const PASS_CORRECT=20;
const GRADE_ORDER=[8,7,6,5,4,3,2,1];
const els={};
let selectedGrade=Math.min(8,Math.max(1,Number(localStorage.getItem('hanjaSelectedGrade')||8)));
let questions=[];
let state={idx:0,correct:0,wrong:0,skipped:0,points:0,combo:0,locked:false,started:false};
let audioCtx=null;
let drag=null;
let pad={drawing:false,last:null,ctx:null,dpr:1};

const $=id=>document.getElementById(id);
const shuffle=array=>{
  const a=array.slice();
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}
  return a;
};

function init(){
  ['setupScreen','gameScreen','resultScreen','gradeGrid','startBtn','questionCard','hanjaGlyph','cardGrade','deckCount','questionText','scoreText','comboText','gradeHud','meaningInput','readingInput','submitBtn','feedback','floatScore','writePad','clearPad','quitBtn','resultGrade','resultAccuracy','resultCorrect','resultWrong','resultSkipped','resultPoints','retryBtn','menuBtn','answerBox']
    .forEach(id=>els[id]=$(id));
  renderGradeButtons();
  bind();
  initPad();
  showSetup();
}

function renderGradeButtons(){
  els.gradeGrid.innerHTML='';
  GRADE_ORDER.forEach(g=>{
    const b=document.createElement('button');
    b.type='button';b.className='grade-btn'+(g===selectedGrade?' active':'');b.dataset.grade=String(g);
    b.innerHTML='<strong>'+g+'급</strong><small>누적 '+Number(DATA.cumulative[g]).toLocaleString()+'자</small>';
    b.addEventListener('click',()=>selectGrade(g));
    els.gradeGrid.appendChild(b);
  });
}

function selectGrade(g){
  selectedGrade=g;
  localStorage.setItem('hanjaSelectedGrade',String(g));
  els.gradeGrid.querySelectorAll('.grade-btn').forEach(b=>b.classList.toggle('active',Number(b.dataset.grade)===g));
  els.startBtn.textContent=g+'급 · 25장 시작';
}

function bind(){
  els.startBtn.addEventListener('click',startRound);
  els.submitBtn.addEventListener('click',submitAnswer);
  els.meaningInput.addEventListener('keydown',onEnter);
  els.readingInput.addEventListener('keydown',onEnter);
  els.clearPad.addEventListener('click',clearPad);
  els.retryBtn.addEventListener('click',startRound);
  els.menuBtn.addEventListener('click',showSetup);
  els.quitBtn.addEventListener('click',()=>{if(confirm('현재 25장 도전을 끝내고 급수 선택으로 돌아갈까요?'))showSetup()});
  bindCardSwipe();
}

function showSetup(){
  state.started=false;state.locked=false;
  els.gameScreen.classList.add('hidden');els.resultScreen.classList.add('hidden');els.setupScreen.classList.remove('hidden');
  selectGrade(selectedGrade);
}

function gradePool(){
  return DATA.entries.filter(row=>Number(row[1])>=selectedGrade);
}

function startRound(){
  ensureAudio();
  const pool=gradePool();
  questions=shuffle(pool).slice(0,ROUND_SIZE);
  if(questions.length<ROUND_SIZE){throw new Error('선택한 급수의 문제 수가 부족합니다.');}
  state={idx:0,correct:0,wrong:0,skipped:0,points:0,combo:0,locked:false,started:true};
  els.setupScreen.classList.add('hidden');els.resultScreen.classList.add('hidden');els.gameScreen.classList.remove('hidden');
  try{window.KidscadeGame?.start?.({mode:'hanja-card-grade-test',grade:selectedGrade,questions:ROUND_SIZE,poolSize:pool.length})}catch(_){}
  renderQuestion();
  requestAnimationFrame(resizePad);
}

function current(){return questions[state.idx]}

function renderQuestion(){
  if(state.idx>=questions.length)return finishRound();
  const item=current();
  state.locked=false;drag=null;
  els.questionCard.className='hanja-card';
  els.questionCard.style.transform='';
  els.questionCard.style.opacity='';
  els.hanjaGlyph.textContent=item[0];
  els.cardGrade.textContent=selectedGrade+'급 카드';
  els.deckCount.textContent='남은 카드 '+(ROUND_SIZE-state.idx)+'장';
  els.questionText.textContent=(state.idx+1)+' / '+ROUND_SIZE;
  els.gradeHud.textContent=selectedGrade+'급 · '+Number(DATA.cumulative[selectedGrade]).toLocaleString()+'자 풀';
  els.meaningInput.value='';els.readingInput.value='';
  els.meaningInput.disabled=false;els.readingInput.disabled=false;els.submitBtn.disabled=false;
  els.feedback.className='feedback';els.feedback.textContent='한자를 써 보면서 뜻과 음을 입력하세요.';
  updateHud();
  updateGhosts();
  clearPad();
  setTimeout(()=>{if(state.started&&!state.locked)els.meaningInput.focus({preventScroll:true})},70);
}

function updateGhosts(){
  const remaining=ROUND_SIZE-state.idx;
  document.querySelectorAll('.ghost-card').forEach((el,i)=>el.classList.toggle('hidden',remaining<=i+1));
}

function updateHud(){
  els.scoreText.textContent=state.points.toLocaleString();
  els.comboText.textContent=state.combo>1?'🔥 '+state.combo+' COMBO':'';
}

function onEnter(e){
  if(e.key==='Enter'){e.preventDefault();submitAnswer();}
}

function normalize(s){
  return String(s||'').normalize('NFC').trim().toLowerCase()
    .replace(/\s+/g,'')
    .replace(/[·ㆍ.,!?！？，。:;：；"'“”‘’\-_\/]/g,'');
}
function meaningVariants(s){
  const raw=String(s||'');
  const noParen=raw.replace(/\([^)]*\)|（[^）]*）/g,'');
  return new Set([normalize(raw),normalize(noParen)].filter(Boolean));
}
function senseMatches(item,meaning,reading){
  const m=normalize(meaning),r=normalize(reading);
  if(!m||!r)return false;
  const senses=Array.isArray(item[2])?item[2]:[];
  return senses.some(pair=>{
    const ms=Array.isArray(pair?.[0])?pair[0]:[];
    const rs=Array.isArray(pair?.[1])?pair[1]:[];
    const meaningOk=ms.some(x=>meaningVariants(x).has(m));
    const readingOk=rs.some(x=>normalize(x)===r);
    return meaningOk&&readingOk;
  });
}
function answerLabel(item){
  const labels=[];
  (item[2]||[]).forEach(pair=>{
    const ms=(pair?.[0]||[]).join('·');
    const rs=(pair?.[1]||[]).join('·');
    if(ms||rs)labels.push(ms+' '+rs);
  });
  return labels.join(' / ');
}

function submitAnswer(){
  if(state.locked||!state.started)return;
  const meaning=els.meaningInput.value,reading=els.readingInput.value;
  if(!meaning.trim()||!reading.trim()){
    els.answerBox.classList.remove('shake');void els.answerBox.offsetWidth;els.answerBox.classList.add('shake');
    els.feedback.className='feedback bad';els.feedback.textContent='뜻과 음을 모두 적어 주세요. 모르면 카드를 왼쪽으로 밀어 넘길 수 있어요.';
    playSound('tap');return;
  }
  const ok=senseMatches(current(),meaning,reading);
  resolveCard(ok,ok?'answer':'wrong');
}

function resolveCard(ok,reason){
  if(state.locked||!state.started)return;
  state.locked=true;
  els.meaningInput.disabled=true;els.readingInput.disabled=true;els.submitBtn.disabled=true;
  const item=current();

  if(ok){
    state.correct++;state.combo++;
    const earned=100+Math.min(150,(state.combo-1)*15);
    state.points+=earned;
    els.feedback.className='feedback ok';els.feedback.textContent='정답! '+answerLabel(item);
    els.floatScore.textContent='+'+earned;
    els.floatScore.classList.remove('show');void els.floatScore.offsetWidth;els.floatScore.classList.add('show');
    els.questionCard.classList.add('correct');playSound('correct');
    try{window.KidscadeGame?.milestone?.('hanja_correct',{grade:selectedGrade,correct:state.correct,combo:state.combo})}catch(_){}
  }else{
    state.wrong++;state.combo=0;
    if(reason==='skip')state.skipped++;
    els.feedback.className='feedback bad';
    els.feedback.textContent=(reason==='skip'?'넘김 · ':'아쉬워요 · ')+'정답: '+answerLabel(item);
    els.questionCard.classList.add('wrong');playSound('wrong');
  }
  updateHud();
  setTimeout(nextCard,ok?520:620);
}

function nextCard(){
  if(!state.started)return;
  state.idx++;
  if(state.idx>=ROUND_SIZE)finishRound();
  else renderQuestion();
}

function finishRound(){
  state.started=false;state.locked=true;
  const accuracy=Math.round(state.correct/ROUND_SIZE*100);
  els.gameScreen.classList.add('hidden');els.resultScreen.classList.remove('hidden');
  els.resultGrade.textContent=selectedGrade+'급 · 25장 완료';
  els.resultAccuracy.textContent=accuracy+'점';
  els.resultCorrect.textContent=state.correct+'개';
  els.resultWrong.textContent=(state.wrong-state.skipped)+'개';
  els.resultSkipped.textContent=state.skipped+'개';
  els.resultPoints.textContent='게임 점수 '+state.points.toLocaleString()+' P';
  const best=Number(localStorage.getItem('hanjaScore')||0);
  if(accuracy>best)localStorage.setItem('hanjaScore',String(accuracy));
  localStorage.setItem('hanjaCardPoints',String(Math.max(state.points,Number(localStorage.getItem('hanjaCardPoints')||0))));
  try{
    window.KidscadeGame?.score?.(accuracy,{unit:'점',higherIsBetter:true});
    window.KidscadeGame?.result?.({
      scope:'campaign',status:'completed',outcome:state.correct>=PASS_CORRECT?'win':'loss',
      score:accuracy,scoreOptions:{unit:'점',higherIsBetter:true},grade:selectedGrade,
      correct:state.correct,wrong:state.wrong-state.skipped,skipped:state.skipped,
      points:state.points,total:ROUND_SIZE,completed:true
    });
  }catch(_){}
}

function bindCardSwipe(){
  const card=els.questionCard;
  card.addEventListener('pointerdown',e=>{
    if(state.locked||!state.started)return;
    drag={id:e.pointerId,startX:e.clientX,lastX:e.clientX,startT:performance.now()};
    card.setPointerCapture?.(e.pointerId);card.classList.add('dragging');
  });
  card.addEventListener('pointermove',e=>{
    if(!drag||drag.id!==e.pointerId||state.locked)return;
    drag.lastX=e.clientX;
    const dx=Math.min(34,e.clientX-drag.startX);
    const rot=Math.max(-12,Math.min(4,dx/16));
    card.style.transform='translateX('+dx+'px) rotate('+rot+'deg)';
    card.style.opacity=String(Math.max(.62,1-Math.max(0,-dx)/430));
  });
  const end=e=>{
    if(!drag||drag.id!==e.pointerId)return;
    const dx=drag.lastX-drag.startX;
    const velocity=dx/Math.max(1,performance.now()-drag.startT);
    drag=null;card.classList.remove('dragging');
    if(dx<-85||velocity<-.55){
      card.style.transform='';card.style.opacity='';
      resolveCard(false,'skip');
    }else{
      card.style.transition='transform .18s ease,opacity .18s ease';
      card.style.transform='';card.style.opacity='';
      setTimeout(()=>{if(!state.locked)card.style.transition=''},190);
    }
  };
  card.addEventListener('pointerup',end);
  card.addEventListener('pointercancel',end);
}

function ensureAudio(){
  try{
    if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();
    if(audioCtx.state==='suspended')audioCtx.resume();
  }catch(_){}
}
function tone(freq,start,duration,type,gain){
  if(!audioCtx)return;
  const o=audioCtx.createOscillator(),g=audioCtx.createGain();
  o.type=type||'sine';o.frequency.setValueAtTime(freq,start);
  g.gain.setValueAtTime(gain||.12,start);g.gain.exponentialRampToValueAtTime(.001,start+duration);
  o.connect(g);g.connect(audioCtx.destination);o.start(start);o.stop(start+duration);
}
function playSound(kind){
  ensureAudio();if(!audioCtx)return;
  const t=audioCtx.currentTime;
  if(kind==='correct'){tone(660,t,.18,'sine',.14);tone(990,t+.09,.28,'sine',.12);}
  else if(kind==='wrong'){tone(220,t,.22,'sawtooth',.09);tone(140,t+.08,.3,'triangle',.08);}
  else tone(430,t,.08,'sine',.04);
}

function initPad(){
  const canvas=els.writePad;
  pad.ctx=canvas.getContext('2d',{alpha:true});
  canvas.addEventListener('pointerdown',e=>{
    if(!state.started)return;
    pad.drawing=true;canvas.setPointerCapture?.(e.pointerId);pad.last=padPoint(e);
  });
  canvas.addEventListener('pointermove',e=>{
    if(!pad.drawing||!pad.last)return;
    const p=padPoint(e),ctx=pad.ctx;
    ctx.strokeStyle='#26364a';ctx.lineWidth=5*pad.dpr;ctx.lineCap='round';ctx.lineJoin='round';
    ctx.beginPath();ctx.moveTo(pad.last.x,pad.last.y);ctx.lineTo(p.x,p.y);ctx.stroke();pad.last=p;
  });
  const stop=()=>{pad.drawing=false;pad.last=null};
  canvas.addEventListener('pointerup',stop);canvas.addEventListener('pointercancel',stop);canvas.addEventListener('pointerleave',stop);
  window.addEventListener('resize',()=>{if(!els.gameScreen.classList.contains('hidden'))resizePad()});
}
function padPoint(e){
  const rect=els.writePad.getBoundingClientRect();
  return {x:(e.clientX-rect.left)*pad.dpr,y:(e.clientY-rect.top)*pad.dpr};
}
function resizePad(){
  const c=els.writePad,rect=c.getBoundingClientRect();
  const dpr=Math.min(window.devicePixelRatio||1,2);
  if(!rect.width||!rect.height)return;
  pad.dpr=dpr;c.width=Math.max(1,Math.round(rect.width*dpr));c.height=Math.max(1,Math.round(rect.height*dpr));
  clearPad();
}
function clearPad(){
  if(!pad.ctx)return;
  pad.ctx.clearRect(0,0,els.writePad.width,els.writePad.height);
}

document.addEventListener('DOMContentLoaded',init);
})();


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
let writerInstance=null;
let writerSerial=0;
let writing={token:0,ready:false,complete:false,unavailable:false,mistakes:0,score:0,textPassed:false,loadTimer:null};

const $=id=>document.getElementById(id);
const shuffle=array=>{
  const a=array.slice();
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}
  return a;
};

function init(){
  ['setupScreen','gameScreen','resultScreen','gradeGrid','startBtn','questionCard','hanjaGlyph','cardGrade','deckCount','questionText','scoreText','comboText','gradeHud','meaningInput','readingInput','submitBtn','feedback','floatScore','writerTarget','writingStatus','restartWriting','quitBtn','resultGrade','resultAccuracy','resultCorrect','resultWrong','resultSkipped','resultWriting','resultPoints','retryBtn','menuBtn','answerBox']
    .forEach(id=>els[id]=$(id));
  renderGradeButtons();
  bind();
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
  els.restartWriting.addEventListener('click',restartWriting);
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
  state={idx:0,correct:0,wrong:0,skipped:0,points:0,combo:0,locked:false,started:true,writingScoreTotal:0,writingGraded:0,writingUnavailable:0};
  els.setupScreen.classList.add('hidden');els.resultScreen.classList.add('hidden');els.gameScreen.classList.remove('hidden');
  try{window.KidscadeGame?.start?.({mode:'hanja-card-grade-test',grade:selectedGrade,questions:ROUND_SIZE,poolSize:pool.length})}catch(_){}
  renderQuestion();
}

function current(){return questions[state.idx]}

function renderQuestion(){
  if(state.idx>=questions.length)return finishRound();
  const item=current();
  state.locked=false;drag=null;
  resetWritingState();
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
  requestAnimationFrame(()=>initWritingQuiz(item[0]));
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
  if(!ok)return resolveCard(false,'wrong');
  writing.textPassed=true;
  els.meaningInput.disabled=true;els.readingInput.disabled=true;els.submitBtn.disabled=true;
  if(writing.complete||writing.unavailable)return resolveCard(true,'answer');
  els.feedback.className='feedback ok';
  els.feedback.textContent='뜻과 음은 정답! 오른쪽에서 한자를 끝까지 바르게 써 주세요.';
  playSound('tap');
}

function resolveCard(ok,reason){
  if(state.locked||!state.started)return;
  state.locked=true;
  els.meaningInput.disabled=true;els.readingInput.disabled=true;els.submitBtn.disabled=true;
  const item=current();

  recordWritingGrade();
  if(ok){
    state.correct++;state.combo++;
    const writingBonus=writing.unavailable?0:Math.round((writing.score||100)*.3);
    const earned=100+Math.min(150,(state.combo-1)*15)+writingBonus;
    state.points+=earned;
    els.feedback.className='feedback ok';els.feedback.textContent='정답! '+(writing.unavailable?'필기 채점 생략 · ':'필기 '+writing.score+'점 · ')+answerLabel(item);
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
  const writingAvg=state.writingGraded?Math.round(state.writingScoreTotal/state.writingGraded):0;
  els.resultWriting.textContent=state.writingGraded?writingAvg+'점':'채점 없음';
  els.resultPoints.textContent='게임 점수 '+state.points.toLocaleString()+' P'+(state.writingUnavailable?' · 필기 데이터 없음 '+state.writingUnavailable+'장':'');
  const storedBest=Number(localStorage.getItem('hanjaScore')||0);
  const best=(Number.isFinite(storedBest)&&storedBest>=0&&storedBest<=100)?storedBest:0;
  if(storedBest!==best||accuracy>best)localStorage.setItem('hanjaScore',String(Math.max(best,accuracy)));
  try{localStorage.removeItem('hanjaRank')}catch(_){}
  localStorage.setItem('hanjaCardPoints',String(Math.max(state.points,Number(localStorage.getItem('hanjaCardPoints')||0))));
  try{
    window.KidscadeGame?.score?.(accuracy,{unit:'점',higherIsBetter:true});
    window.KidscadeGame?.result?.({
      scope:'campaign',status:'completed',outcome:state.correct>=PASS_CORRECT?'win':'loss',
      score:accuracy,scoreOptions:{unit:'점',higherIsBetter:true},grade:selectedGrade,
      correct:state.correct,wrong:state.wrong-state.skipped,skipped:state.skipped,
      writingAverage:writingAvg,writingGraded:state.writingGraded,writingUnavailable:state.writingUnavailable,
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

function resetWritingState(){
  if(writing.loadTimer)clearTimeout(writing.loadTimer);
  writerInstance=null;
  writing={token:++writerSerial,ready:false,complete:false,unavailable:false,mistakes:0,score:0,textPassed:false,loadTimer:null};
  if(els.writerTarget)els.writerTarget.innerHTML='';
  setWritingStatus('loading','필기 채점 준비 중…');
}

function setWritingStatus(kind,text){
  if(!els.writingStatus)return;
  els.writingStatus.className='writing-status '+kind;
  els.writingStatus.textContent=text;
}

function normalizeWriterChar(char){
  try{return String(char||'').normalize('NFKC')}catch(_){return String(char||'')}
}

function loadStrokeData(character,onLoad,onError,token){
  const normalized=normalizeWriterChar(character);
  const chars=[...new Set([normalized,String(character)])].filter(Boolean);
  const urls=[];
  chars.forEach(ch=>{
    const enc=encodeURIComponent(ch);
    urls.push('https://cdn.jsdelivr.net/npm/hanzi-writer-data@latest/'+enc+'.json');
    urls.push('https://cdn.jsdelivr.net/gh/MadLadSquad/hanzi-writer-data-youyin@latest/data/'+enc+'.json');
  });
  let index=0;
  const next=()=>{
    if(token!==writing.token)return;
    if(index>=urls.length){
      const err=new Error('stroke data unavailable');
      markWritingUnavailable('이 글자는 필기 데이터가 없어 뜻·음만 채점해요.',token);
      try{onError(err)}catch(_){}
      return;
    }
    fetch(urls[index++],{cache:'force-cache'})
      .then(res=>{if(!res.ok)throw new Error('stroke '+res.status);return res.json()})
      .then(data=>{
        if(token!==writing.token)return;
        writing.ready=true;
        if(writing.loadTimer){clearTimeout(writing.loadTimer);writing.loadTimer=null}
        setWritingStatus('ready','획순에 맞게 써 보세요');
        onLoad(data);
      })
      .catch(next);
  };
  next();
}

function initWritingQuiz(character){
  const token=writing.token;
  if(!state.started||state.locked||!els.writerTarget)return;
  els.writerTarget.innerHTML='';
  if(typeof window.HanziWriter==='undefined'){
    markWritingUnavailable('필기 채점기를 불러오지 못해 뜻·음만 채점해요.',token);
    return;
  }
  const shell=els.writerTarget.parentElement;
  const rect=shell.getBoundingClientRect();
  const size=Math.max(190,Math.min(380,Math.floor(Math.min(rect.width||300,rect.height||300)-18)));
  const writerChar=normalizeWriterChar(character);
  try{
    writerInstance=window.HanziWriter.create('writerTarget',writerChar,{
      width:size,height:size,padding:14,
      showCharacter:false,showOutline:true,
      strokeColor:'#26364a',outlineColor:'#d5dde6',
      highlightColor:'#f0a52b',drawingColor:'#376bd0',drawingWidth:12,
      charDataLoader:(char,onLoad,onError)=>loadStrokeData(char,onLoad,onError,token)
    });
    writing.loadTimer=setTimeout(()=>{
      if(token===writing.token&&!writing.ready&&!writing.complete&&!writing.unavailable){
        markWritingUnavailable('필기 데이터를 불러오지 못해 뜻·음만 채점해요.',token);
      }
    },5000);
    writerInstance.quiz({
      leniency:2.35,
      showHintAfterMisses:2,
      highlightOnComplete:true,
      onMistake:()=>{
        if(token!==writing.token||state.locked)return;
        writing.mistakes++;
        const preview=Math.max(40,100-writing.mistakes*10);
        setWritingStatus('miss','다시 한 획 · 현재 필기 '+preview+'점');
        playSound('tap');
      },
      onComplete:()=>{
        if(token!==writing.token||state.locked)return;
        writing.complete=true;
        writing.score=Math.max(40,100-writing.mistakes*10);
        if(writing.loadTimer){clearTimeout(writing.loadTimer);writing.loadTimer=null}
        setWritingStatus('pass','✓ 필기 통과 · '+writing.score+'점');
        playSound('write');
        if(writing.textPassed)resolveCard(true,'answer');
        else{
          els.feedback.className='feedback ok';
          els.feedback.textContent='필기 통과! 이제 뜻과 음을 입력해 주세요.';
        }
      }
    });
  }catch(err){
    console.warn('[Hanja Card] handwriting judge unavailable',err);
    markWritingUnavailable('필기 채점기를 사용할 수 없어 뜻·음만 채점해요.',token);
  }
}

function markWritingUnavailable(message,token=writing.token){
  if(token!==writing.token||writing.complete)return;
  writing.unavailable=true;
  if(writing.loadTimer){clearTimeout(writing.loadTimer);writing.loadTimer=null}
  setWritingStatus('unavailable','필기 채점 생략');
  if(els.feedback&&!state.locked)els.feedback.textContent=message;
  if(writing.textPassed)resolveCard(true,'answer');
}

function restartWriting(){
  if(!state.started||state.locked||writing.unavailable)return;
  const priorMistakes=writing.mistakes;
  if(writing.loadTimer)clearTimeout(writing.loadTimer);
  writing.ready=false;writing.complete=false;writing.score=0;writing.token=++writerSerial;writing.loadTimer=null;
  writing.mistakes=priorMistakes;
  setWritingStatus('loading','다시 쓰기 준비 중…');
  initWritingQuiz(current()[0]);
}

function recordWritingGrade(){
  if(writing.unavailable){
    state.writingUnavailable++;
    return;
  }
  state.writingGraded++;
  state.writingScoreTotal+=writing.complete?writing.score:0;
}

document.addEventListener('DOMContentLoaded',init);
})();

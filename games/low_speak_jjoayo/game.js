import { WORDS, PACK_LABELS } from './words.js';

const $ = id => document.getElementById(id);
const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition || null;

const ui = {
  menu:$('menuScreen'), game:$('gameScreen'), result:$('resultScreen'),
  durationChips:$('durationChips'), packChips:$('packChips'),
  voiceModeBtn:$('voiceModeBtn'), typingModeBtn:$('typingModeBtn'), voiceSupportText:$('voiceSupportText'),
  startBtn:$('startBtn'), score:$('scoreText'), timer:$('timerText'), timerBar:$('timerBar'),
  combo:$('comboText'), bestCombo:$('bestComboText'), comboBadge:$('comboBadge'),
  card:$('wordCard'), emoji:$('emojiText'), korean:$('koreanText'), pack:$('packText'),
  feedback:$('feedback'), micOrb:$('micOrb'), micStatus:$('micStatus'), heard:$('heardText'),
  typingForm:$('typingForm'), typingInput:$('typingInput'), hintBtn:$('hintBtn'), passBtn:$('passBtn'),
  switchInputBtn:$('switchInputBtn'), resultIcon:$('resultIcon'), resultTitle:$('resultTitle'),
  resultScore:$('resultScore'), resultCombo:$('resultCombo'), resultPass:$('resultPass'),
  resultSpeed:$('resultSpeed'), resultBest:$('resultBest'), reviewWords:$('reviewWords'),
  retryBtn:$('retryBtn'), menuBtn:$('menuBtn'), toast:$('toast')
};

const state = {
  phase:'menu',
  duration:60,
  pack:'all',
  inputMode:'voice',
  pool:[],
  current:null,
  currentIndex:-1,
  recentIds:[],
  correct:0,
  passed:0,
  combo:0,
  bestCombo:0,
  deadline:0,
  startedAt:0,
  questionShownAt:0,
  responseTimes:[],
  review:new Map(),
  raf:0,
  recognition:null,
  speechSession:0,
  manualSpeechStop:false,
  locked:false,
  hintSpeaking:false,
  lastTranscript:'',
  toastTimer:0
};

function showScreen(name){
  [ui.menu,ui.game,ui.result].forEach(el=>el.classList.remove('active'));
  ui[name].classList.add('active');
}

function normalize(value){
  let text=String(value||'').trim().toLowerCase();
  text=text.replace(/[’']/g,'');
  text=text.replace(/^(?:a|an|the)\s+/,'');
  return text.replace(/[^a-z0-9]+/g,'');
}

function acceptedAnswers(word,{speech=false}={}){
  const values=[word.en,...(word.aliases||[])];
  if(speech)values.push(...(word.speechAliases||[]));
  return values.map(normalize);
}

function isCorrectTranscript(text,{speech=false}={}){
  if(!state.current)return false;
  const candidate=normalize(text);
  return Boolean(candidate)&&acceptedAnswers(state.current,{speech}).includes(candidate);
}

function shuffle(items){
  const arr=[...items];
  for(let i=arr.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
  return arr;
}

function selectedPool(){
  const filtered=state.pack==='all'?WORDS:WORDS.filter(w=>w.cat===state.pack);
  return shuffle(filtered);
}

function setChipSelection(container,button){
  container.querySelectorAll('.chip').forEach(el=>el.classList.toggle('selected',el===button));
}

function setInputMode(mode,{announce=false}={}){
  const next=mode==='voice'&&SpeechRecognitionCtor?'voice':'typing';
  state.inputMode=next;
  ui.voiceModeBtn.classList.toggle('selected',next==='voice');
  ui.typingModeBtn.classList.toggle('selected',next==='typing');
  ui.typingForm.classList.toggle('hidden',next!=='typing');
  ui.switchInputBtn.textContent=next==='voice'?'⌨️ 타이핑 모드로 바꾸기':'🎤 말하기 모드로 바꾸기';
  if(state.phase==='playing'){
    if(next==='typing'){
      stopRecognition();
      ui.micOrb.classList.remove('live');
      ui.micStatus.textContent='타이핑 모드';
      ui.heard.textContent='영단어를 입력하고 Enter!';
      setTimeout(()=>ui.typingInput.focus(),50);
    }else{
      ui.typingInput.blur();
      beginListeningForQuestion();
    }
  }
  if(state.phase==='menu')resetStartButton();
  if(announce)toast(next==='voice'?'말하기 모드로 바꿨어요!':'타이핑 모드로 바꿨어요!');
}

async function ensureMicrophone(){
  if(!SpeechRecognitionCtor)return false;
  if(!navigator.mediaDevices?.getUserMedia)return true;
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    stream.getTracks().forEach(track=>track.stop());
    return true;
  }catch(_){
    return false;
  }
}

function showPreparing(message){
  ui.startBtn.disabled=true;
  ui.startBtn.textContent=message;
}

function resetStartButton(){
  ui.startBtn.disabled=false;
  ui.startBtn.textContent=state.inputMode==='voice'?'🎤 게임 시작':'⌨️ 게임 시작';
}

async function startRequested(){
  if(state.inputMode==='voice'){
    showPreparing('🎤 마이크 확인 중...');
    const ok=await ensureMicrophone();
    if(!ok){
      setInputMode('typing');
      toast('마이크를 쓸 수 없어 타이핑으로 시작해요.');
    }
  }
  resetStartButton();
  startRun();
}

function startRun(){
  state.phase='playing';
  state.pool=selectedPool();
  state.current=null;
  state.currentIndex=-1;
  state.recentIds=[];
  state.correct=0;
  state.passed=0;
  state.combo=0;
  state.bestCombo=0;
  state.deadline=performance.now()+state.duration*1000;
  state.startedAt=performance.now();
  state.responseTimes=[];
  state.review.clear();
  state.locked=false;
  state.lastTranscript='';
  state.hintSpeaking=false;
  try{window.KidscadeGame?.start?.({mode:state.inputMode,duration:state.duration,pack:state.pack})}catch(_){}
  showScreen('game');
  updateHud();
  nextQuestion();
  cancelAnimationFrame(state.raf);
  state.raf=requestAnimationFrame(tick);
}

function nextQuestion(){
  if(state.phase!=='playing')return;
  state.locked=false;
  state.speechSession++;
  stopRecognition(false);
  let options=state.pool.filter((_,idx)=>!state.recentIds.includes(idx));
  if(!options.length){
    state.pool=selectedPool();
    state.recentIds=[];
    options=state.pool;
  }
  const word=options[Math.floor(Math.random()*options.length)];
  const idx=state.pool.indexOf(word);
  state.recentIds.push(idx);
  if(state.recentIds.length>Math.min(8,state.pool.length-1))state.recentIds.shift();
  state.current=word;
  state.currentIndex=idx;
  state.questionShownAt=performance.now();
  state.lastTranscript='';
  ui.emoji.textContent=word.emoji;
  ui.korean.textContent=word.ko;
  ui.pack.textContent=PACK_LABELS[word.cat]||PACK_LABELS[state.pack]||'영단어';
  ui.feedback.className='feedback';
  ui.feedback.textContent=state.inputMode==='voice'?'영어로 말해 보세요!':'영단어를 입력해 보세요!';
  ui.heard.textContent=state.inputMode==='voice'?'말하면 여기에 보여요':'영단어를 입력하고 Enter!';
  ui.card.classList.remove('correct','skip');
  void ui.card.offsetWidth;
  if(state.inputMode==='voice')beginListeningForQuestion();
  else setTimeout(()=>ui.typingInput.focus(),30);
}

function beginListeningForQuestion(){
  if(state.phase!=='playing'||state.inputMode!=='voice'||!SpeechRecognitionCtor||state.hintSpeaking)return;
  const session=state.speechSession;
  spawnRecognition(session);
}

function spawnRecognition(session){
  if(session!==state.speechSession||state.phase!=='playing'||state.inputMode!=='voice')return;
  stopRecognition(false);
  const recognition=new SpeechRecognitionCtor();
  state.recognition=recognition;
  state.manualSpeechStop=false;
  recognition.lang='en-US';
  recognition.interimResults=true;
  recognition.maxAlternatives=5;
  const ua=navigator.userAgent||'';
  recognition.continuous=!/Android|iPhone|iPad|iPod/i.test(ua);

  recognition.onstart=()=>{
    if(session!==state.speechSession)return;
    ui.micOrb.classList.add('live');
    ui.micStatus.textContent='듣고 있어요';
  };

  recognition.onresult=event=>{
    if(session!==state.speechSession||state.phase!=='playing'||state.locked)return;
    let display='';
    for(let i=event.resultIndex;i<event.results.length;i++){
      const result=event.results[i];
      if(result[0]?.transcript)display=result[0].transcript.trim();
      for(let a=0;a<Math.min(result.length,5);a++){
        const transcript=result[a]?.transcript||'';
        if(isCorrectTranscript(transcript,{speech:true})){
          ui.heard.textContent='"'+transcript.trim()+'"';
          answerCorrect();
          return;
        }
      }
    }
    if(display){
      state.lastTranscript=display;
      ui.heard.textContent='"'+display+'"';
    }
  };

  recognition.onerror=event=>{
    if(session!==state.speechSession)return;
    ui.micOrb.classList.remove('live');
    if(event.error==='aborted')return;
    if(event.error==='not-allowed'||event.error==='service-not-allowed'){
      setInputMode('typing');
      toast('마이크 권한이 막혀 있어 타이핑으로 바꿨어요.');
      return;
    }
    if(event.error==='audio-capture'){
      setInputMode('typing');
      toast('마이크를 찾지 못해 타이핑으로 바꿨어요.');
      return;
    }
    if(event.error==='network'){
      ui.micStatus.textContent='음성인식 연결 확인 중';
      ui.feedback.className='feedback warn';
      ui.feedback.textContent='연결이 불안정해요. 타이핑으로 바꿔도 돼요.';
      return;
    }
    if(event.error!=='no-speech')ui.micStatus.textContent='다시 듣는 중...';
  };

  recognition.onend=()=>{
    if(state.recognition===recognition)state.recognition=null;
    ui.micOrb.classList.remove('live');
    if(session!==state.speechSession||state.phase!=='playing'||state.inputMode!=='voice'||state.manualSpeechStop||state.hintSpeaking)return;
    setTimeout(()=>spawnRecognition(session),120);
  };

  try{recognition.start()}
  catch(_){
    if(session===state.speechSession)setTimeout(()=>spawnRecognition(session),180);
  }
}

function stopRecognition(markManual=true){
  if(markManual)state.manualSpeechStop=true;
  const current=state.recognition;
  state.recognition=null;
  if(current){
    try{current.onend=null;current.abort()}catch(_){}
  }
  ui.micOrb.classList.remove('live');
}

function answerCorrect(){
  if(state.locked||state.phase!=='playing')return;
  state.locked=true;
  const elapsed=Math.max(.05,(performance.now()-state.questionShownAt)/1000);
  state.responseTimes.push(elapsed);
  if(elapsed>3.8)state.review.set(state.current.en,state.current);
  state.correct++;
  state.combo++;
  state.bestCombo=Math.max(state.bestCombo,state.combo);
  let bonus=0;
  if(state.combo%10===0)bonus=2;
  else if(state.combo%5===0)bonus=1;
  if(bonus){
    state.deadline+=bonus*1000;
    ui.feedback.textContent='🔥 '+state.combo+'콤보! +'+bonus+'초';
  }else{
    ui.feedback.textContent=elapsed<1.6?'⚡ PERFECT!':'✅ GOOD!';
  }
  ui.feedback.className='feedback good';
  ui.card.classList.add('correct');
  stopRecognition();
  toneCorrect();
  updateHud();
  setTimeout(nextQuestion,220);
}

function passQuestion(){
  if(state.locked||state.phase!=='playing')return;
  state.locked=true;
  state.passed++;
  state.combo=0;
  state.deadline-=1000;
  state.review.set(state.current.en,state.current);
  ui.feedback.className='feedback warn';
  ui.feedback.textContent='PASS! 정답은 '+state.current.en.toUpperCase();
  ui.card.classList.add('skip');
  stopRecognition();
  tonePass();
  updateHud();
  if(remainingMs()<=0){finishRun();return}
  setTimeout(nextQuestion,480);
}

function useHint(){
  if(state.locked||state.phase!=='playing'||state.hintSpeaking)return;
  state.deadline-=3000;
  state.combo=0;
  state.review.set(state.current.en,state.current);
  updateHud();
  if(remainingMs()<=0){finishRun();return}
  if(!window.speechSynthesis){
    ui.feedback.className='feedback warn';
    ui.feedback.textContent='정답: '+state.current.en.toUpperCase();
    return;
  }
  state.hintSpeaking=true;
  stopRecognition();
  ui.feedback.className='feedback warn';
  ui.feedback.textContent='🔊 '+state.current.en.toUpperCase();
  const utterance=new SpeechSynthesisUtterance(state.current.en);
  utterance.lang='en-US';
  utterance.rate=.82;
  const resume=()=>{
    if(!state.hintSpeaking)return;
    state.hintSpeaking=false;
    if(state.phase==='playing'&&state.inputMode==='voice')beginListeningForQuestion();
  };
  utterance.onend=resume;
  utterance.onerror=resume;
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
  setTimeout(resume,2200);
}

function submitTyping(event){
  event.preventDefault();
  if(state.phase!=='playing'||state.inputMode!=='typing'||state.locked)return;
  const value=ui.typingInput.value.trim();
  if(!value)return;
  ui.heard.textContent='"'+value+'"';
  ui.typingInput.value='';
  if(isCorrectTranscript(value,{speech:false})){
    answerCorrect();
  }else{
    state.combo=0;
    updateHud();
    ui.feedback.className='feedback warn';
    ui.feedback.textContent='한 번 더 생각해 봐요!';
    toneWrong();
  }
}

function remainingMs(){
  return Math.max(0,state.deadline-performance.now());
}

function tick(){
  if(state.phase!=='playing')return;
  const ms=remainingMs();
  const sec=ms/1000;
  ui.timer.textContent=sec.toFixed(1);
  ui.timer.classList.toggle('danger',sec<=10);
  ui.timerBar.style.width=Math.max(0,Math.min(100,ms/(state.duration*1000)*100))+'%';
  if(ms<=0){finishRun();return}
  state.raf=requestAnimationFrame(tick);
}

function updateHud(){
  ui.score.textContent=state.correct;
  ui.combo.textContent=state.combo;
  ui.bestCombo.textContent=state.bestCombo;
  ui.comboBadge.classList.toggle('hot',state.combo>=5);
}

function finishRun(){
  if(state.phase!=='playing')return;
  state.phase='ended';
  cancelAnimationFrame(state.raf);
  stopRecognition();
  try{speechSynthesis?.cancel?.()}catch(_){}
  const avg=state.responseTimes.length
    ? state.responseTimes.reduce((sum,v)=>sum+v,0)/state.responseTimes.length
    : 0;
  let best=state.correct;
  let improved=false;
  try{
    const result=window.KidscadeGame?.gameOver?.({
      score:state.correct,
      correct:state.correct,
      bestCombo:state.bestCombo,
      passed:state.passed,
      averageResponse:Number(avg.toFixed(2)),
      mode:state.inputMode,
      duration:state.duration,
      pack:state.pack
    });
    best=Number(result?.scoreResult?.best??state.correct);
    improved=Boolean(result?.scoreResult?.improved);
  }catch(_){}
  ui.resultIcon.textContent=improved?'🏆':'🐥';
  ui.resultTitle.textContent=improved?'쪼아! 최고 기록!':state.correct>=20?'엄청 빠른데요!':state.correct>=10?'좋아요, 한 번 더!':'다음 판은 더 빨라질 거예요!';
  ui.resultScore.textContent=state.correct;
  ui.resultCombo.textContent=state.bestCombo;
  ui.resultPass.textContent=state.passed;
  ui.resultSpeed.textContent=avg?avg.toFixed(2)+'초':'-';
  ui.resultBest.textContent=Number.isFinite(best)?best:state.correct;
  const review=[...state.review.values()].slice(0,6);
  ui.reviewWords.innerHTML=review.length
    ? review.map(word=>'<span>'+escapeHtml(word.ko)+' · '+escapeHtml(word.en)+'</span>').join('')
    : '<span>✨ 이번 판은 막힘이 거의 없었어요!</span>';
  showScreen('result');
}

function escapeHtml(value){
  return String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

function tone(freq,duration,type='sine',gain=.04){
  try{
    const ctx=tone.ctx||(tone.ctx=new (window.AudioContext||window.webkitAudioContext)());
    const osc=ctx.createOscillator();
    const vol=ctx.createGain();
    osc.type=type;osc.frequency.value=freq;
    vol.gain.setValueAtTime(gain,ctx.currentTime);
    vol.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+duration);
    osc.connect(vol).connect(ctx.destination);
    osc.start();osc.stop(ctx.currentTime+duration);
  }catch(_){}
}
function toneCorrect(){tone(660,.1);setTimeout(()=>tone(880,.13),80)}
function tonePass(){tone(230,.12,'square',.025)}
function toneWrong(){tone(180,.08,'square',.018)}

function toast(message){
  clearTimeout(state.toastTimer);
  ui.toast.textContent=message;
  ui.toast.classList.add('show');
  state.toastTimer=setTimeout(()=>ui.toast.classList.remove('show'),1900);
}

function returnMenu(){
  state.phase='menu';
  cancelAnimationFrame(state.raf);
  stopRecognition();
  try{speechSynthesis?.cancel?.()}catch(_){}
  showScreen('menu');
  resetStartButton();
}

ui.durationChips.addEventListener('click',event=>{
  const btn=event.target.closest('[data-duration]');
  if(!btn)return;
  state.duration=Number(btn.dataset.duration)||60;
  setChipSelection(ui.durationChips,btn);
});

ui.packChips.addEventListener('click',event=>{
  const btn=event.target.closest('[data-pack]');
  if(!btn)return;
  state.pack=btn.dataset.pack;
  setChipSelection(ui.packChips,btn);
});

ui.voiceModeBtn.addEventListener('click',()=>setInputMode('voice'));
ui.typingModeBtn.addEventListener('click',()=>setInputMode('typing'));
ui.startBtn.addEventListener('click',startRequested);
ui.passBtn.addEventListener('click',passQuestion);
ui.hintBtn.addEventListener('click',useHint);
ui.typingForm.addEventListener('submit',submitTyping);
ui.switchInputBtn.addEventListener('click',async()=>{
  if(state.inputMode==='voice'){setInputMode('typing',{announce:true});return}
  if(!SpeechRecognitionCtor){toast('이 브라우저는 말하기 모드를 지원하지 않아요.');return}
  const ok=await ensureMicrophone();
  if(ok)setInputMode('voice',{announce:true});
  else toast('마이크 권한을 확인해 주세요.');
});
ui.retryBtn.addEventListener('click',startRun);
ui.menuBtn.addEventListener('click',returnMenu);

document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&state.phase==='playing'){
    stopRecognition();
  }else if(!document.hidden&&state.phase==='playing'&&state.inputMode==='voice'){
    beginListeningForQuestion();
  }
});

if(!SpeechRecognitionCtor){
  ui.voiceModeBtn.disabled=true;
  ui.voiceSupportText.textContent='미지원';
  setInputMode('typing');
}else{
  ui.voiceSupportText.textContent='추천';
}
resetStartButton();

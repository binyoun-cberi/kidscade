(function () {
  'use strict';
  const E=window.DiceSurvivalEngine, P=window.Polyhedron3D;
  if(!E||!P){document.body.textContent='게임 파일을 불러오지 못했습니다.';return;}
  const $=id=>document.getElementById(id);
  const el={solo:$('soloMode'),duel:$('duelMode'),settings:$('duelSettings'),
    dieMode:$('dieMode'),roundLimit:$('roundLimit'),startDuel:$('startDuel'),reset:$('resetBtn'),
    scores:$('scores'),scoreTitle:$('scoreTitle'),recordBadge:$('recordBadge'),
    stage:$('stageLabel'),dieTitle:$('dieTitle'),stageNote:$('stageNote'),
    result:$('rollResult'),round:$('roundLabel'),mean:$('meanLabel'),rollCount:$('rollCount'),
    overlay:$('resultOverlay'),history:$('history'),numbers:$('numberGrid'),
    choiceCount:$('choiceCount'),turnHint:$('turnHint'),pickTitle:$('pickTitle'),
    chance:$('chanceLabel'),fill:$('chanceFill'),fraction:$('oddsFraction'),
    reward:$('rewardLabel'),lock:$('lockBtn'),roll:$('rollBtn'),next:$('nextBtn'),
    labChance:$('labChance'),labExpected:$('labExpected'),labObserved:$('labObserved'),arenaNext:$('arenaNextBtn')};
  const renderer=new P.DiceRenderer($('diceCanvas'));
  const BEST_KEY='kidscade_dice_survival_best_v1';
  let bestSaved=0;
  try{bestSaved=Math.max(0,Number(localStorage.getItem(BEST_KEY))||0);}catch(_){}
  const escape=s=>String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const labelPct=p=>(p*100).toFixed(p===0||p===1?0:1).replace(/\.0$/,'')+'%';
  const state={mode:'solo',players:[],hands:[],turn:0,round:1,limit:12,phase:'picking',rolls:[],last:null};
  let lastFaces=0;

  function facesNow(){
    const fixed=Number(el.dieMode.value);
    if(E.FACES.includes(fixed))return fixed;
    return state.mode==='solo'?E.dieForSolo(state.players[0].streak):E.dieForDuel(state.round);
  }
  function duelNames(){
    const names=[$('name1'),$('name2'),$('name3'),$('name4')].map(x=>x.value.trim());
    return [names[0]||'파랑',names[1]||'노랑',...names.slice(2).filter(Boolean)];
  }
  function resetGame(){
    state.players=(state.mode==='solo'?['나']:duelNames()).map(E.newPlayer);
    state.limit=Number(el.roundLimit.value)||12;
    state.round=1;state.hands=state.players.map(()=>new Set());state.turn=0;
    state.rolls=[];state.last=null;state.phase='picking';
    lastFaces=0;sync();
  }
  function recordSoloBest(){
    if(state.mode!=='solo')return;
    const value=state.players[0].best;
    if(value>bestSaved){
      bestSaved=value;
      try{localStorage.setItem(BEST_KEY,String(bestSaved));}catch(_){}
    }
  }
  function currentHand(){return state.hands[state.turn] || new Set();}
  function currentPlayer(){return state.players[state.turn] || null;}
  function setText(id,text){el[id].textContent=text;}
  function displayScores(){
    const viewing=state.mode==='solo'?[state.players[0]]:state.players;
    el.scores.innerHTML=viewing.map((p,i)=>{
      const active=state.mode==='duel'&&state.phase==='picking'&&state.turn===i;
      const ready=state.mode==='duel'&&state.hands[i].size>0&&!(state.phase==='picking'&&active);
      const outcome=state.last?.outcomes?.[i];
      const subtitle=state.mode==='solo'?'최고 기록 '+Math.max(bestSaved,p.best)+'회 · 전체 생존 '+p.survived+'회':
        state.phase==='picking'?(ready?'선택 완료 · 비공개':active?'지금 숫자를 고를 차례':'선택 대기'):
        outcome?('선택 '+outcome.chosen.slice().sort((a,b)=>a-b).join('·')+' ('+labelPct(outcome.chosen.length/state.last.faces)+') · '+(outcome.alive?'생존 성공':'탈락')+' · 최고 '+p.best+'회'):'전체 생존 '+p.survived+'회';
      return '<div class="score-line '+(active?'player-active':'')+'"><div class="score-left"><b>'+escape(p.name)+'</b><small'+(ready?' class="locked"':'')+'>'+escape(subtitle)+'</small></div><div class="score-right"><div><span>연속 생존</span><strong>'+p.streak+'회</strong></div><div><span>도전 점수</span><strong class="point">'+p.points.toLocaleString('ko-KR')+'</strong></div></div></div>';
    }).join('');
    setText('scoreTitle',state.mode==='solo'?'내 생존 기록':'대전 현황');
    setText('recordBadge',state.mode==='solo'?'개인 최고 '+bestSaved+'회':state.round+'/'+state.limit+' 판');
  }
  function displayNumbers(faces){
    const canPick=state.phase==='picking';
    // Retain the student's submitted choices in solo mode when showing the result.
    const showSoloPick=state.mode==='solo'&&state.hands[0]?.size>0;
    const showOdds=canPick||showSoloPick;
    const hand=canPick?currentHand():(showSoloPick?state.hands[0]:new Set());
    const previous=el.numbers.querySelectorAll('button');
    if(previous.length!==faces){
      el.numbers.innerHTML=Array.from({length:faces},(_,i)=>'<button type="button" data-number="'+(i+1)+'" aria-pressed="false">'+(i+1)+'</button>').join('');
    }
    el.numbers.classList.toggle('locked',!canPick);
    for(const btn of el.numbers.querySelectorAll('button')){
      const value=Number(btn.dataset.number),selected=hand.has(value);
      btn.classList.toggle('selected',selected);
      btn.setAttribute('aria-pressed',String(selected));
      btn.disabled=!canPick;
    }
    const count=hand.size;
    setText('choiceCount',canPick?count+'개 선택':state.mode==='duel'?'선택 비공개':count+'개 선택 완료');
    const p=count/faces;
    setText('chance',showOdds?labelPct(p):'—');
    el.fill.style.width=(showOdds?p*100:0)+'%';
    setText('fraction',showOdds?count+' / '+faces:'선택 결과는 아래에서 확인');
    setText('reward',showOdds&&count?'성공 보상 +'+E.riskScore(count,faces)+'점':'선택해야 점수 확인');
    setText('labChance',showOdds&&count?count+' / '+faces+' = '+labelPct(p):'아직 선택 전');
  }
  function displayHistory(faces){
    const faceRolls=state.rolls.filter(r=>r.faces===faces).map(r=>r.value);
    const stats=E.roundStats(faceRolls,faces);
    setText('labExpected',String(stats.expectedAverage));
    setText('labObserved',stats.average===null?'아직 굴리지 않음':stats.average.toFixed(2));
    setText('mean',stats.average===null?'— / '+stats.expectedAverage:stats.average.toFixed(2)+' / '+stats.expectedAverage);
    setText('rollCount',state.rolls.length+'회 시행');
    const recent=state.rolls.slice(-16).reverse();
    el.history.innerHTML=recent.length?recent.map((r,i)=>'<span class="chip '+(i===0?'latest':'')+'" title="'+r.faces+'면체 결과" aria-label="'+r.faces+'면체 '+r.value+'"><small>d'+r.faces+'</small><b>'+r.value+'</b></span>').join(''):'<span class="muted">첫 번째 주사위를 굴려 보세요.</span>';
  }
  function sync(){
    const duel=state.mode==='duel',faces=state.last?state.last.faces:facesNow();
    if(lastFaces!==faces&&!renderer.busy){renderer.setFaces(faces);lastFaces=faces;}
    el.solo.classList.toggle('active',!duel);el.duel.classList.toggle('active',duel);
    el.solo.setAttribute('aria-pressed',String(!duel));el.duel.setAttribute('aria-pressed',String(duel));
    el.settings.classList.toggle('hidden',!duel);
    const auto=el.dieMode.value==='stage';
    const level=duel?Math.min(4,Math.ceil(state.round/3)):
      Math.max(1,E.SOLO_STAGES.findIndex(stage=>stage.faces===faces)+1);
    setText('stage',auto?'STAGE '+String(level).padStart(2,'0'):'FREE PLAY');
    setText('dieTitle',faces+'면체 주사위');
    setText('stageNote',!auto?'주사위 면 수 고정':duel?'3라운드마다 주사위 변경':'연속 생존 3·6·10회에 변경');
    setText('round',duel?state.round+' / '+state.limit+'라운드':state.round+'번째 도전');
    setText('result',state.last?.value??'—');
    displayScores();displayNumbers(faces);displayHistory(faces);
    const picking=state.phase==='picking',ready=state.phase==='ready',rolling=state.phase==='rolling';
    const done=state.phase==='revealed'||state.phase==='ended';
    const player=currentPlayer();
    setText('pickTitle',!duel?'살아남을 숫자를 고르세요':picking?player.name+'의 생존 숫자':'모두 선택했습니다');
    setText('turnHint',!duel?'숫자를 1개 이상 선택하세요. 단, 모든 숫자를 고를 수는 없어요.':
      picking?player.name+' 차례입니다. 이전 참가자의 선택은 보이지 않아요.':
      ready?'모두 선택을 마쳤어요. 한 개의 주사위를 함께 굴립니다.':
      state.phase==='ended'?'대전 결과가 나왔어요. 기록을 비교해 보세요.':'다음 라운드로 진행하세요.');
    el.lock.classList.toggle('hidden',!duel||!picking);
    el.lock.disabled=!picking||!currentHand().size;
    el.roll.classList.toggle('hidden',(duel&&!ready)||done);
    el.roll.disabled=rolling||(duel?!ready:!picking||!currentHand().size);
    el.roll.textContent=rolling?'주사위가 굴러가는 중...':'3D 주사위 굴리기';
    el.next.classList.toggle('hidden',!done);
    el.next.textContent=state.phase==='ended'?'새 대전 시작':'다음 라운드';
    el.arenaNext.classList.toggle('hidden',!done);
    el.arenaNext.textContent=el.next.textContent;
    for(const control of [el.solo,el.duel,el.reset,el.startDuel,el.dieMode,el.roundLimit,$('name1'),$('name2'),$('name3'),$('name4')]){
      control.disabled=rolling;
    }
    if(!state.last&&picking){
      el.overlay.className='result-overlay';el.overlay.textContent='숫자를 선택하고 굴려 보세요';
    }else if(!state.last&&ready){
      el.overlay.className='result-overlay';el.overlay.textContent='모두 결정했어요! 굴려 보세요';
    }
  }
  el.numbers.addEventListener('click',e=>{
    const btn=e.target.closest('button[data-number]');
    if(!btn||state.phase!=='picking')return;
    const n=Number(btn.dataset.number),hand=currentHand(),faces=facesNow();
    if(hand.has(n))hand.delete(n);
    else{
      if(hand.size>=faces-1){el.turnHint.textContent='모든 숫자를 고르면 반드시 살아남기 때문에, 최소 1개는 남겨야 해요.';return;}
      hand.add(n);
    }
    sync();
  });
  el.lock.addEventListener('click',()=>{
    if(state.mode!=='duel'||state.phase!=='picking'||!currentHand().size)return;
    if(state.turn<state.players.length-1)state.turn++;
    else state.phase='ready';
    sync();
  });
  async function roll(){
    if(state.phase==='rolling'||state.phase==='revealed'||state.phase==='ended')return;
    if(state.mode==='duel'&&state.phase!=='ready')return;
    const faces=facesNow();
    if(state.hands.some(h=>!E.validPick([...h],faces)))return;
    const result=E.fairRoll(faces);
    state.phase='rolling';
    state.last=null;
    el.overlay.className='result-overlay';el.overlay.textContent='굴러가는 중...';
    sync();
    // On mobile the number pad is deliberately shown first. Bring the actual
    // moving 3D die into view as soon as the roll starts.
    if(window.matchMedia?.('(max-width: 1000px)')?.matches){
      const reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
      document.querySelector('.dice-section')?.scrollIntoView({
        behavior:reduce?'auto':'smooth',block:'start'
      });
    }
    try{await renderer.roll(result);}catch(error){
      console.error(error);state.phase=state.mode==='duel'?'ready':'picking';sync();return;
    }
    const outcomes=[];
    state.players=state.players.map((player,i)=>{
      const updated=E.resolveRoll(player,[...state.hands[i]],faces,result);
      outcomes.push({alive:updated.alive,chosen:[...state.hands[i]]});
      const {alive,...clean}=updated;
      if(state.mode==='solo'&&!alive)clean.points=0;
      return clean;
    });
    state.last={value:result,faces,outcomes};
    state.rolls.push({value:result,faces,round:state.round});
    recordSoloBest();
    if(state.mode==='duel'){
      state.phase=state.round>=state.limit?'ended':'revealed';
      const alive=outcomes.filter(o=>o.alive).length;
      if(state.phase==='ended'){
        const standings=E.rankPlayers(state.players);
        const highest=standings[0].points;
        const winners=standings.filter(p=>p.points===highest&&p.best===standings[0].best&&p.survived===standings[0].survived);
        el.overlay.textContent='최종 결과: '+winners.map(p=>p.name).join('·')+' 1위!';
      }else el.overlay.textContent=alive+'명 생존 / '+(outcomes.length-alive)+'명 탈락';
      el.overlay.className='result-overlay '+(alive?'success':'fail');
    }else{
      const survived=outcomes[0].alive;
      state.phase='revealed';
      el.overlay.textContent=survived?'생존 성공! 연속 '+state.players[0].streak+'회':'탈락! 연속 생존 0회부터 다시';
      el.overlay.className='result-overlay '+(survived?'success':'fail');
    }
    sync();
  }
  el.roll.addEventListener('click',roll);
  function nextRound(){
    if(state.phase==='ended'){resetGame();return;}
    if(state.phase!=='revealed')return;
    state.round++;state.phase='picking';state.turn=0;
    state.hands=state.players.map(()=>new Set());
    state.last=null;
    sync();
    if(window.matchMedia?.('(max-width: 1000px)')?.matches){
      // Return the next player to the choice surface without a forced jump on desktop.
      document.querySelector('.select-panel')?.scrollIntoView({behavior:'smooth',block:'start'});
    }
  }
  el.next.addEventListener('click',nextRound);
  el.arenaNext.addEventListener('click',nextRound);
  el.solo.addEventListener('click',()=>{if(state.phase==='rolling')return;state.mode='solo';resetGame();});
  el.duel.addEventListener('click',()=>{if(state.phase==='rolling')return;state.mode='duel';resetGame();});
  el.reset.addEventListener('click',()=>{if(state.phase==='rolling')return;resetGame();});
  el.startDuel.addEventListener('click',()=>{if(state.phase==='rolling')return;state.mode='duel';resetGame();});
  el.dieMode.addEventListener('change',()=>{if(state.phase==='rolling')return;resetGame();});
  el.roundLimit.addEventListener('change',()=>{if(state.phase==='rolling')return;resetGame();});
  resetGame();
})();

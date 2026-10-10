(() => {
  'use strict';
  const R=window.SquidSurvivalRules,$=id=>document.getElementById(id);
  const el={
    shell:$('shell'),frame:$('gameFrame'),steps:$('steps'),pills:R.ROUNDS.map((_,i)=>$('pill'+i)),
    best:$('bestCount'),lobby:$('lobby'),pregame:$('pregame'),rotate:$('rotate'),end:$('end'),
    preLabel:$('pregameLabel'),preTitle:$('pregameTitle'),preRule:$('pregameRule'),
    preWarning:$('pregameWarning'),demo:$('demo'),count:$('countdownNumber'),countFill:$('countdownFill'),
    endLabel:$('endLabel'),endIcon:$('endIcon'),endTitle:$('endTitle'),endDetail:$('endDetail'),
    endClears:$('endClears'),endBest:$('endBest'),endWins:$('endWins'),
    endRounds:R.ROUNDS.map((_,i)=>$('endRound'+i)),endButton:$('endButton'),quit:$('quitButton'),
    demoIcon:$('demoExtraIcon'),demoDesc:$('demoExtraDesc')
  };
  let state=R.initial(),ticker=null,deadline=0,runStartedAt=0,loadId=0;
  const record=(()=>{
    try{
      const v=JSON.parse(localStorage.getItem(R.SAVE_KEY)||'{}');
      return {best:Math.min(R.ROUNDS.length,Math.max(0,Number(v.best)||0)),
        wins:Math.max(0,Number(v.wins)||0),attempts:Math.max(0,Number(v.attempts)||0)};
    }catch(_){return{best:0,wins:0,attempts:0};}
  })();
  function save(){try{localStorage.setItem(R.SAVE_KEY,JSON.stringify(record));}catch(_){}}
  function sdk(name,value){try{window.KidscadeGame?.[name]?.(value);}catch(_){}}
  function portraitPhone(){
    return typeof window.matchMedia==='function'&&window.matchMedia('(orientation: portrait) and (pointer: coarse)').matches;
  }
  function stopCountdown(){
    if(ticker!==null){clearInterval(ticker);ticker=null;}
  }
  function show(name){
    for(const id of ['lobby','pregame','rotate','end'])el[id].classList.toggle('hidden',name!==id);
  }
  function render(){
    el.best.textContent=record.best+' / '+R.ROUNDS.length;
    el.shell.classList.toggle('running',state.phase==='running');
    el.frame.hidden=state.phase!=='running';
    el.quit.hidden=state.phase!=='running';
    for(let i=0;i<R.ROUNDS.length;i++){
      const pill=el.pills[i];
      pill.classList.toggle('passed',i<state.clearCount);
      pill.classList.toggle('active',i===state.roundIndex&&['intro','rotate','running'].includes(state.phase));
    }
    if(state.phase==='lobby')show('lobby');
    else if(state.phase==='rotate')show('rotate');
    else if(state.phase==='intro'){
      show('pregame');
      const round=R.ROUNDS[state.roundIndex];
      el.preLabel.textContent='ROUND '+String(state.roundIndex+1).padStart(2,'0')+' / '+String(R.ROUNDS.length).padStart(2,'0');
      el.preTitle.textContent=round.title;
      el.preRule.textContent=round.rule;
      el.preWarning.textContent=round.warning;
      el.demo.className='demo '+round.id;
      el.demoIcon.textContent=round.icon;
      el.demoDesc.textContent=round.skill+' · '+round.duration;
    }else if(state.phase==='running')show('');
    else if(['intermission','failed','champion'].includes(state.phase)){
      show('end');renderEnd();
    }
  }
  function renderEnd(){
    const champion=state.phase==='champion',failed=state.phase==='failed';
    const round=R.ROUNDS[state.roundIndex];
    el.end.classList.toggle('failed',failed);
    el.end.classList.toggle('champion',champion);
    el.endLabel.textContent=champion?'CHAMPION · ALL CLEAR':failed?'ELIMINATED':'ROUND CLEAR';
    el.endIcon.textContent=champion?'★':failed?'×':'✓';
    el.endTitle.textContent=champion?'최종 생존 성공!':failed?'대회 탈락!':round.title+' 통과!';
    el.endDetail.textContent=champion?'여섯 개의 게임을 모두 돌파했어요. 꼴뚜기 서바이벌 최종 생존자입니다.':
      failed?round.title+'에서 탈락했어요. 다시 참가하면 첫 라운드부터 시작해요.':
      '좋아요! 이제 다음 게임의 규칙을 살펴보고 도전해요.';
    el.endClears.textContent=state.clearCount+' / '+R.ROUNDS.length;
    el.endBest.textContent=record.best+' / '+R.ROUNDS.length;
    el.endWins.textContent=String(record.wins);
    el.endButton.textContent=state.phase==='intermission'?'다음 라운드 시작 →':'처음부터 다시 도전 ↻';
    for(let i=0;i<R.ROUNDS.length;i++){
      const badge=el.endRounds[i];
      badge.classList.toggle('passed',i<state.clearCount);
      badge.classList.toggle('failed',failed&&i===state.roundIndex);
    }
  }
  function startTournament(){
    if(!['lobby','champion','failed'].includes(state.phase))return;
    stopCountdown();
    el.frame.removeAttribute('src');
    state=R.reduce(state,{type:'START'});
    record.attempts++;save();
    runStartedAt=Date.now();
    sdk('start',{mode:'tournament',rounds:R.ROUNDS.length});
    prepareRound();
  }
  function prepareRound(){
    stopCountdown();
    if(state.phase==='rotate'&&!portraitPhone())state=R.reduce(state,{type:'ORIENTED'});
    if(state.phase!=='intro')return render();
    if(R.ROUNDS[state.roundIndex].id==='bridge'&&portraitPhone()){
      state=R.reduce(state,{type:'ROTATE'});
      return render();
    }
    render();
    deadline=Date.now()+3000;
    function countdown(){
      if(state.phase!=='intro')return stopCountdown();
      if(R.ROUNDS[state.roundIndex].id==='bridge'&&portraitPhone()){
        stopCountdown();state=R.reduce(state,{type:'ROTATE'});return render();
      }
      const left=Math.max(0,deadline-Date.now());
      el.count.textContent=String(Math.max(1,Math.ceil(left/1000)));
      el.countFill.style.width=Math.round(left/30)+'%';
      if(left<=0){stopCountdown();launchRound();}
    }
    countdown();ticker=setInterval(countdown,100);
  }
  function launchRound(){
    if(state.phase!=='intro')return;
    if(R.ROUNDS[state.roundIndex].id==='bridge'&&portraitPhone()){
      state=R.reduce(state,{type:'ROTATE'});return render();
    }
    state=R.reduce(state,{type:'READY'});
    loadId++;
    const round=R.ROUNDS[state.roundIndex];
    el.frame.title='서바이벌 '+(state.roundIndex+1)+'라운드: '+round.title;
    // Only known same-origin game pages are used; the child emits its existing SDK result.
    el.frame.src=R.gameUrl(round);
    render();
  }
  function recordResult(action){
    if(state.phase!=='running')return;
    const previous=state;
    state=R.reduce(state,action);
    if(state===previous)return;
    record.best=Math.max(record.best,state.clearCount);
    if(state.phase==='champion')record.wins++;
    save();
    if(state.phase==='champion'){
      sdk('score',state.clearCount);
      sdk('milestone','survival_champion');
      sdk('result',{scope:'run',status:'completed',outcome:'win',score:state.clearCount,
        roundsCleared:state.clearCount,roundsTotal:R.ROUNDS.length,elapsedMs:Date.now()-runStartedAt});
    }else if(state.phase==='failed'){
      sdk('score',state.clearCount);
      sdk('result',{scope:'run',status:'failed',outcome:'loss',score:state.clearCount,
        roundsCleared:state.clearCount,roundsTotal:R.ROUNDS.length,elapsedMs:Date.now()-runStartedAt});
    }else if(state.clearCount===1){
      sdk('milestone','first_survival_round');
    }
    render();
  }
  window.addEventListener('message',event=>{
    const action=R.validateEvent(state,event.data,event.origin===window.location.origin,
      event.source===el.frame.contentWindow);
    if(action)recordResult(action);
  });
  window.addEventListener('resize',()=>{
    if(state.phase==='rotate'&&!portraitPhone())prepareRound();
    else if(state.phase==='intro'&&R.ROUNDS[state.roundIndex].id==='bridge'&&portraitPhone()){
      stopCountdown();state=R.reduce(state,{type:'ROTATE'});render();
    }
  });
  $('startButton').addEventListener('click',startTournament);
  el.endButton.addEventListener('click',()=>{
    if(state.phase==='intermission'){
      state=R.reduce(state,{type:'NEXT'});prepareRound();
    }else if(state.phase==='failed'||state.phase==='champion')startTournament();
  });
  el.quit.addEventListener('click',()=>{
    if(state.phase!=='running')return;
    const round=R.ROUNDS[state.roundIndex];
    recordResult({type:'RESULT',gameId:round.gameId,status:'failed',outcome:'loss',score:0});
  });
  el.frame.addEventListener('error',()=>{
    if(state.phase!=='running')return;
    const round=R.ROUNDS[state.roundIndex];
    recordResult({type:'RESULT',gameId:round.gameId,status:'failed',outcome:'loss',score:0});
  });
  render();
})();
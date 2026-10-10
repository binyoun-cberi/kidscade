/* Tournament contract: standalone games stay playable outside this page. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.SquidSurvivalRules=api;
})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  const ROUNDS=Object.freeze([
    Object.freeze({
      id:'dalgona',gameId:'dalgona_trace',
      title:'달고나 게임',subtitle:'금이 가기 전에 모양을 완성하세요',
      src:'../dalgona-trace/index.html',
      rule:'노란 시작점에서부터 선을 따라 움직여요.',
      warning:'빠르거나 선을 벗어나면 금, 느리면 굳기!',
      duration:'약 1분',skill:'속도 · 정확도',icon:'◉',
      tip:'너무 서두르지도, 멈추지도 마세요.',
      detail:'선 위를 적당한 속도로 끝까지 따라 그리면 통과'
    }),
    Object.freeze({
      id:'bridge',gameId:'squid_memory_bridge',
      title:'기억의 다리',subtitle:'한 칸만 틀려도 탈락!',
      src:'../squid-memory-bridge/index.html',
      rule:'초록 발판이 나타나는 순서를 외워요.',
      warning:'다른 발판을 밟는 순간 대회 탈락!',
      duration:'90초',skill:'공간 · 순서 기억',icon:'▦',
      tip:'정답 확인은 가능하지만 시간이 계속 흘러요.',
      detail:'초록색 정답 발판만 순서대로 밟으면 통과'
    }),
    Object.freeze({
      id:'redlight',gameId:'squid_redlight',title:'멈춰! 움직여!',subtitle:'초록불에는 달리고 빨간불에는 정지',
      src:'./redlight.html',rule:'초록불에는 꾹 누르고, 노란불에 손을 떼세요.',
      warning:'빨간불에 움직이면 즉시 탈락!',duration:'50초',skill:'반응속도 · 행동 억제',icon:'●',
      tip:'멈추는 신호에 미리 반응하세요.',detail:'50초 안에 초록불에만 움직여 도착하면 통과'
    }),
    Object.freeze({
      id:'tug',gameId:'squid_tug',title:'줄다리기',subtitle:'타이밍에 맞춰 줄을 당기세요',
      src:'./tug.html',rule:'움직이는 표시가 초록색 중앙을 지날 때 당기세요.',
      warning:'연타하면 피로가 쌓여 오히려 밀려요!',duration:'38초',skill:'리듬 · 충동 억제',icon:'↔',
      tip:'연타보다 정확한 한 번이 더 강합니다.',detail:'줄의 힘을 100%까지 끌어오면 통과'
    }),
    Object.freeze({
      id:'marbles',gameId:'squid_marbles',title:'구슬 승부',subtitle:'구슬 수를 세어 올바른 주머니 선택',
      src:'./marbles.html',rule:'두 주머니를 비교해 홀짝·수량 조건에 맞게 고르세요.',
      warning:'다섯 문제 중 두 번 틀리면 탈락!',duration:'57초',skill:'수 감각 · 논리',icon:'◉',
      tip:'서두르기보다 구슬 수를 정확히 세세요.',detail:'5문제 중 적어도 4문제를 맞히면 통과'
    }),
    Object.freeze({
      id:'final',gameId:'squid_final',title:'꼴뚜기 결승전',subtitle:'기억·타이밍·계산의 마지막 관문',
      src:'./final.html',rule:'모양 네 개를 기억하고, 두 번 타이밍을 맞춘 뒤 계산하세요.',
      warning:'하나라도 틀리면 최종 라운드 탈락!',duration:'65초',skill:'기억 · 반응 · 계산',icon:'★',
      tip:'규칙을 한 번에 세 개 활용해야 합니다.',detail:'세 과제를 모두 끝내면 서바이벌 최종 생존!'
    })
  ]);
  const SAVE_KEY='kidscade_squid_survival_v1';
  const params=Object.freeze({survival:'1'});
  function nextRound(clearCount){return ROUNDS[clearCount]||null;}
  function gameUrl(round){
    if(!ROUNDS.includes(round))throw new Error('Unknown round');
    return round.src+'?survival=1';
  }
  function initial(){return{phase:'lobby',roundIndex:0,clearCount:0,results:[],locked:false};}
  function reduce(state,action){
    if(!action||typeof action.type!=='string')return state;
    switch(action.type){
      case 'START':
        if(state.phase!=='lobby'&&state.phase!=='failed'&&state.phase!=='champion')return state;
        return{phase:'intro',roundIndex:0,clearCount:0,results:[],locked:false};
      case 'READY':
        if(state.phase!=='intro'&&state.phase!=='rotate')return state;
        return{...state,phase:'running',locked:false};
      case 'ROTATE':
        if(state.phase!=='intro')return state;
        return{...state,phase:'rotate'};
      case 'ORIENTED':
        if(state.phase!=='rotate')return state;
        return{...state,phase:'intro'};
      case 'RESULT':{
        if(state.phase!=='running'||state.locked)return state;
        const round=ROUNDS[state.roundIndex];
        if(!round||action.gameId!==round.gameId)return state;
        if(action.status!=='completed'&&action.status!=='failed')return state;
        const win=action.status==='completed'&&(action.outcome==='clear'||action.outcome==='win');
        const entry={id:round.id,success:win,score:Number.isFinite(action.score)?action.score:0};
        const clearCount=state.clearCount+(win?1:0);
        return{...state,locked:true,phase:win?(clearCount===ROUNDS.length?'champion':'intermission'):'failed',
          clearCount,results:[...state.results,entry]};
      }
      case 'NEXT':
        if(state.phase!=='intermission')return state;
        return{...state,phase:'intro',roundIndex:state.roundIndex+1,locked:false};
      default:return state;
    }
  }
  function validateEvent(state,data,originMatches,sourceMatches){
    if(!originMatches||!sourceMatches||state.phase!=='running'||state.locked)return null;
    const round=ROUNDS[state.roundIndex],detail=data?.detail;
    if(data?.type!=='kidscade:game-event'||data.gameId!==round?.gameId||
       detail?.event!=='result'||detail?.gameId!==round.gameId)return null;
    if(detail.scope!=='stage'&&detail.scope!=='run')return null;
    if(['redlight','tug','marbles','final'].includes(round.id)&&detail.mode!==round.id)return null;
    if(!['completed','failed'].includes(detail.status))return null;
    // Accept only the result of the child challenge, never unrelated score/start events.
    if(!['clear','win','loss','fail'].includes(detail.outcome))return null;
    if(detail.status==='completed'&&!['clear','win'].includes(detail.outcome))return null;
    if(detail.status==='failed'&&!['loss','fail'].includes(detail.outcome))return null;
    return{type:'RESULT',gameId:round.gameId,status:detail.status,outcome:detail.outcome,
      score:Number.isFinite(detail.score)?detail.score:0};
  }
  return Object.freeze({ROUNDS,SAVE_KEY,params,nextRound,gameUrl,initial,reduce,validateEvent});
});

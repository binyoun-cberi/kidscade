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

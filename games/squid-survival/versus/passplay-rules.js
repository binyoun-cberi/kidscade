/* Pass-and-play two-player tournament. Deterministic; no DOM or device dependency. */
(function(root,factory){
 const get=(name,path)=>root[name]||(typeof require==='function'?require(path):null);
 const api=factory(get('SquidSurvivalRules','../rules.js'),get('SquidMiniRules','../mini-rules.js'),
   get('DalgonaTrace','../../dalgona-trace/trace.js'),get('SquidPath','../../squid-memory-bridge/path.js'));
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.SquidPassPlay=api;
})(typeof globalThis==='object'?globalThis:this,function(S,M,T,B){
'use strict';
if(!S||!M||!T||!B)throw Error('Missing game logic');
const ROUNDS=S.ROUNDS.map(r=>Object.freeze({id:r.id,title:r.title,icon:r.icon,skill:r.skill}));
const LIMITS=Object.freeze({dalgona:45000,bridge:38000,redlight:42000,tug:32000,marbles:42000,final:55000,overtime:20000});
const SAVE_KEY='kidscade_squid_passplay_v1';
const clamp=(a,b,c)=>Math.max(b,Math.min(c,a));
const directions=Object.freeze({up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]});
function seedAt(seed,round,player,attempt=0){
 return ((seed>>>0)^Math.imul(round+1,0x9e3779b1)^Math.imul(player+1,0x85ebca6b)^Math.imul(attempt+1,0xc2b2ae35))>>>0;
}
function orderFor(index){return index%2===0?[0,1]:[1,0];}
function createGame(round,player,seed,now,attempt=0){
 const id=round===6?'overtime':ROUNDS[round]?.id;
 if(!id)throw Error('Invalid round '+round);
 const game={id,round,player,startedAt:now,at:now,elapsed:0,limit:LIMITS[id],
  status:'playing',clear:false,reason:'',step:0,phase:'playing',
  seed:seedAt(seed,round,player,attempt),trace:null,traceState:null,map:null,body:null,
  previewUntil:0,question:null,answer:null,events:0};
 if(id==='dalgona'){
   game.trace={...T.buildTrace(1),timeLimitMs:LIMITS[id]};
   game.traceState=T.createState(game.trace);
 }else if(id==='bridge'){
   let whole=null;
   for(let n=0;n<22&&!whole;n++){
     try{whole=B.generate(1,(game.seed+n*173)>>>0);}catch(_){}
   }
   if(!whole)throw Error('Could not generate memory path');
   // A compact 12-cell track is legible on a phone. Each player gets a different one.
   game.map={width:whole.width,height:whole.height,path:whole.path.slice(0,12)};
   game.phase='preview';game.previewUntil=5000;
 }else if(id==='overtime'){
   game.question=M.mathQuestion(M.random(game.seed));
 }else{
   game.body=M.create(id,game.seed);
   game.body.limit=game.limit;
   M.start(game.body,now);
 }
 return game;
}
function start(seed=3741){return {seed:seed>>>0,phase:'lobby',roundIndex:0,
 totals:[0,0],history:[],turnIndex:0,active:null,game:null,turns:[null,null],
 winner:null,overtime:0,attempt:0};}
function begin(state){
 if(state.phase!=='lobby'&&state.phase!=='finished')return state;
 const seed=state.phase==='finished'?(state.seed+7919)>>>0:state.seed;
 return {...start(seed),phase:'handoff',active:0};
}
function ready(state,now){
 if(state.phase!=='handoff')return state;
 return {...state,phase:'playing',game:createGame(state.roundIndex,state.active,state.seed,now,state.attempt)};
}
function percentage(g){
 if(!g)return 0;
 if(g.id==='dalgona')return clamp(g.traceState.progress/g.trace.total,0,1);
 if(g.id==='bridge')return g.step/(g.map.path.length-1);
 if(g.id==='overtime')return g.answer!==null?1:0;
 if(g.id==='redlight')return g.body.progress/100;
 if(g.id==='tug')return clamp((g.body.rope-0)/100,0,1);
 if(g.id==='marbles')return clamp((g.body.correct+g.body.misses*.3)/5,0,1);
 const b=g.body;
 return b.part==='preview'?0:b.part==='memory'?b.entered*.09:
        b.part==='timing'?.38+b.timingHits*.20:.84;
}
function complete(g,ok,now,reason=''){
 if(g.status!=='playing')return g;
 g.status='done';g.clear=Boolean(ok);g.reason=reason||(ok?'성공!':'시간이 끝났어요.');
 g.elapsed=Math.min(g.limit,Math.max(0,now-g.startedAt));
 if(g.body)g.body.held=false;
 if(g.traceState)g.traceState.active=false;
 return g;
}
function metric(g){
 const time=clamp(1-g.elapsed/g.limit,0,1);
 if(g.id==='dalgona')return Math.round(T.grade(g.trace,g.traceState).score*.75+25*time);
 if(g.id==='marbles')return Math.round(80+20*time-(g.body?.misses||0)*9);
 if(g.id==='final')return Math.round(80+20*time-(g.body?.timingMisses||0)*7);
 if(g.id==='tug')return Math.round(80+20*time-(g.body?.fatigue||0)*.17);
 return Math.round(70+30*time);
}
function result(g){
 return {player:g.player,id:g.id,clear:g.clear,elapsed:g.elapsed,
  progress:percentage(g),metric:g.clear?metric(g):Math.round(percentage(g)*60),
  reason:g.reason,round:g.round};
}
function winnerOf(a,b){
 if(a.clear!==b.clear)return a.clear?0:1;
 if(a.clear){
   // Quality and completion time determine a full-screen duel's outcome.
   if(Math.abs(a.metric-b.metric)>=2)return a.metric>b.metric?0:1;
   if(Math.abs(a.elapsed-b.elapsed)>250)return a.elapsed<b.elapsed?0:1;
   return null;
 }
 if(Math.abs(a.progress-b.progress)>.025)return a.progress>b.progress?0:1;
 return null;
}
function outcome(state){
 const a=state.turns[0],b=state.turns[1];
 if(!a||!b)throw Error('Both turns must finish before scoring');
 const winner=winnerOf(a,b);
 return {index:state.roundIndex,id:ROUNDS[state.roundIndex]?.id||'overtime',winner,
  first:orderFor(state.roundIndex)[0],results:[a,b]};
}
function settle(state){
 const g=state.game;
 if(g?.status!=='done'||state.phase!=='playing')return state;
 const turns=state.turns.slice();turns[g.player]=result(g);
 if(state.turnIndex===0){
   return {...state,phase:'handoff',turnIndex:1,active:orderFor(state.roundIndex)[1],
     game:null,turns};
 }
 if(state.roundIndex===6){
   const a=turns[0],b=turns[1],winner=winnerOf(a,b);
   if(winner===null){
     return {...state,phase:'handoff',roundIndex:6,turnIndex:0,active:(state.overtime+1)%2,
       game:null,turns:[null,null],overtime:state.overtime+1,attempt:state.attempt+1};
   }
   const totals=state.totals.slice();totals[winner]++;
   return {...state,phase:'finished',winner,game:null,turns,totals};
 }
 const roundOutcome=outcome({...state,turns}),totals=state.totals.slice();
 if(roundOutcome.winner===null){totals[0]+=.5;totals[1]+=.5;}
 else totals[roundOutcome.winner]++;
 return {...state,phase:'round-result',game:null,turns,totals,
  history:[...state.history,roundOutcome],active:null};
}
function advanceRound(state){
 if(state.phase!=='round-result')return state;
 const next=state.roundIndex+1;
 if(next<6)return {...state,roundIndex:next,phase:'handoff',turnIndex:0,
   active:orderFor(next)[0],turns:[null,null],game:null};
 if(state.totals[0]!==state.totals[1])return {...state,phase:'finished',
   winner:state.totals[0]>state.totals[1]?0:1};
 return {...state,phase:'handoff',roundIndex:6,turnIndex:0,
   active:0,game:null,turns:[null,null],overtime:0,attempt:0};
}
function tick(state,now){
 if(state.phase!=='playing'||!state.game)return state;
 const g=state.game;
 if(g.status!=='playing')return settle(state);
 if(now<=g.at)return state;
 g.at=now;
 g.elapsed=Math.max(0,now-g.startedAt);
 if(g.id==='bridge'&&g.phase==='preview'&&g.elapsed>=g.previewUntil)g.phase='playing';
 if(g.id==='dalgona'){
   g.traceState=T.tick(g.trace,g.traceState,now);
   if(g.traceState.complete)complete(g,true,now);
   else if(g.traceState.failed)complete(g,false,now,g.traceState.reason);
 }else if(g.body){
   M.advance(g.body,now);
   if(g.body.status==='cleared')complete(g,true,now);
   if(g.body.status==='failed')complete(g,false,now,g.body.reason);
 }
 if(g.status==='playing'&&g.elapsed>=g.limit)complete(g,false,now,'제한시간 종료');
 return g.status==='done'?settle(state):state;
}
function input(state,action,value,now){
 if(state.phase!=='playing'||!state.game)return state;
 state=tick(state,now);if(state.phase!=='playing')return state;
 const g=state.game;
 if(g.id==='dalgona'){
   if(action==='trace-start')g.traceState=T.begin(g.trace,g.traceState,value,now).state;
   else if(action==='trace-move')g.traceState=T.move(g.trace,g.traceState,value,now);
   else if(action==='trace-end')g.traceState=T.release(g.trace,g.traceState,now);
   if(g.traceState.complete)complete(g,true,now);
   else if(g.traceState.failed)complete(g,false,now,g.traceState.reason);
 }else if(g.id==='bridge'&&g.phase==='playing'&&action==='step'&&directions[value]){
   const path=g.map.path,a=path[g.step],b=path[g.step+1];
   if(b!==undefined){
     const dx=directions[value][0],dy=directions[value][1],x=a%g.map.width+dx,y=Math.floor(a/g.map.width)+dy;
     if(x<0||x>=g.map.width||y<0||y>=g.map.height||x+y*g.map.width!==b)complete(g,false,now,'틀린 발판을 밟았어요.');
     else {g.step++;if(g.step===path.length-1)complete(g,true,now);}
   }
 }else if(g.id==='overtime'&&action==='answer'){
   if(!g.question.options.includes(Number(value)))return state;
   g.answer=Number(value);
   complete(g,g.answer===g.question.answer,now,g.answer===g.question.answer?'정답!':'오답입니다.');
 }else if(g.body){
   if(g.id==='redlight'&&action==='hold')M.act(g.body,'hold',Boolean(value),now);
   else if(g.id==='tug'&&action==='tap')M.act(g.body,'pull',null,now);
   else if(g.id==='marbles'&&action==='choose')M.act(g.body,'choose',value,now);
   else if(g.id==='final'){
     if(action==='symbol')M.act(g.body,'symbol',value,now);
     if(action==='tap')M.act(g.body,'hit',null,now);
     if(action==='answer')M.act(g.body,'answer',value,now);
   }
   if(g.body.status==='cleared')complete(g,true,now);
   else if(g.body.status==='failed')complete(g,false,now,g.body.reason);
 }
 return g.status==='done'?settle(state):state;
}
return Object.freeze({ROUNDS,LIMITS,SAVE_KEY,seedAt,orderFor,createGame,start,begin,ready,tick,input,
 percentage,result,metric,winnerOf,outcome,advanceRound});
});

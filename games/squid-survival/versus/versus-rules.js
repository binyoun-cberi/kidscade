/* Local two-player tournament. Same-round seeds and independent inputs; testable without DOM. */
(function(root,factory){
  const get=(name,path)=>root[name]||(typeof require==='function'?require(path):null);
  const api=factory(get('SquidSurvivalRules','../rules.js'),get('SquidMiniRules','../mini-rules.js'),
    get('DalgonaTrace','../../dalgona-trace/trace.js'),get('SquidPath','../../squid-memory-bridge/path.js'));
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.SquidVersusRules=api;
})(typeof globalThis==='object'?globalThis:this,function(S,M,T,Bridge){
'use strict';
if(!S||!M||!T||!Bridge)throw new Error('Missing versus dependencies');
const ROUNDS=S.ROUNDS.map(x=>Object.freeze({id:x.id,title:x.title,icon:x.icon,skill:x.skill}));
const LIMITS={dalgona:55000,bridge:42000,redlight:50000,tug:38000,marbles:57000,final:65000};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const symbols=M.SYMBOLS;
const saveKey='kidscade_squid_survival_versus_v1';
function makePlayer(id){return {id,done:false,clear:false,failed:false,doneAt:null,reason:'',hold:false,assist:0,progress:0,body:null,traceState:null,bridgeStep:0,bridgeWrong:false};}
function seedFor(seed,index){return ((seed>>>0)+Math.imul(index+1,2654435761))>>>0;}
function makeRound(index,seed,now){
  const def=ROUNDS[index];if(!def)throw new Error('Invalid versus round');
  const kind=def.id,round={index,id:kind,title:def.title,seed:seedFor(seed,index),startedAt:now,
    now,elapsed:0,limit:LIMITS[kind],phase:kind==='bridge'||kind==='final'?'preview':'playing',
    previewUntil:kind==='bridge'?5000:kind==='final'?3800:0,players:[makePlayer(0),makePlayer(1)],map:null,trace:null};
  if(kind==='dalgona'){
    round.trace=T.buildTrace(1);
    round.trace={...round.trace,timeLimitMs:round.limit};
    for(const p of round.players)p.traceState=T.createState(round.trace);
  }else if(kind==='bridge'){
    for(let tries=0;tries<35;tries++){
      try{round.map=Bridge.generate(1,round.seed+tries*91);break;}catch(_){}
    }
    if(!round.map)throw new Error('Could not build memory bridge');
  }else {
    for(const p of round.players){p.body=M.create(kind,round.seed);M.start(p.body,now);}
  }
  return round;
}
function initial(seed=8371){return {phase:'lobby',seed:seed>>>0,index:0,totals:[0,0],
  results:[],round:null,champion:null,rematch:0,tie:null};}
function start(state){if(!['lobby','finished'].includes(state.phase))return state;
  return {...initial((state.seed+7919)>>>0),phase:'intro'};}
function launch(state,now){
  if(state.phase!=='intro')return state;
  return {...state,phase:'playing',round:makeRound(state.index,state.seed,now)};
}
function progressOf(round,p){
 if(round.id==='dalgona')return p.traceState.progress/round.trace.total;
 if(round.id==='bridge')return p.bridgeStep/(round.map.path.length-1);
 if(round.id==='redlight')return p.body.progress/100;
 if(round.id==='tug')return clamp((p.body.rope-0)/100,0,1);
 if(round.id==='marbles')return clamp((p.body.questionIndex-p.body.misses*.35)/5,0,1);
 const b=p.body;
 return b.part==='preview'?0:b.part==='memory'?b.entered*.08:b.part==='timing'?.36+b.timingHits*.20:.84;
}
function done(round,p,now,success,reason=''){
 if(p.done)return;
 p.done=true;p.clear=success;p.failed=!success;p.doneAt=now;
 p.reason=reason||(!success?'시간이 끝났어요.':'완료!');
 p.hold=false;
}
function syncPlayer(round,p,now){
 if(p.done)return;
 if(round.id==='dalgona'){
   p.traceState=T.tick(round.trace,p.traceState,now);
   if(p.traceState.failed)done(round,p,now,false,p.traceState.reason);
   if(p.traceState.complete)done(round,p,now,true);
 }else if(round.id==='bridge'){
   // All bridge navigation is via explicit input; clock applies to both equally.
 }else{
   M.advance(p.body,now);
   if(p.body.status==='cleared')done(round,p,now,true);
   if(p.body.status==='failed')done(round,p,now,false,p.body.reason);
 }
 p.progress=progressOf(round,p);
}
function outcome(round){
 const a=round.players[0],b=round.players[1];
 const progress=[progressOf(round,a),progressOf(round,b)];
 const metric=p=>{
   if(round.id==='dalgona'&&p.clear)return T.grade(round.trace,p.traceState).score;
   if(p.body?.score)return p.body.score;
   return Math.round(100*progress[p.id]);
 };
 let win=null;
 if(a.clear!==b.clear)win=a.clear?0:1;
 else if(a.clear&&b.clear){
   if(Math.abs(a.doneAt-b.doneAt)>150)win=a.doneAt<b.doneAt?0:1;
   else if(Math.abs(metric(a)-metric(b))>2)win=metric(a)>metric(b)?0:1;
 }else if(Math.abs(progress[0]-progress[1])>0.025)win=progress[0]>progress[1]?0:1;
 const result={id:round.id,index:round.index,winner:win,progress,clear:[a.clear,b.clear],
   scores:[metric(a),metric(b)],elapsed:round.elapsed};
 return result;
}
function tick(state,now){
 if(state.phase==='playing'){
   const r=state.round;if(!r)return state;
   if(now<r.now)return state;
   const delta=Math.min(250,Math.max(0,now-r.now));
   r.now=now;r.elapsed=Math.min(r.limit,now-r.startedAt);
   if(r.phase==='preview'&&r.elapsed>=r.previewUntil)r.phase='playing';
   for(const p of r.players){
     if(r.id==='dalgona'&&p.assist!==0&&p.hold&&!p.done){
       const tip=T.sampleAt(r.trace,p.traceState.progress);
       if(!p.traceState.active){
         p.traceState=T.begin(r.trace,p.traceState,tip,now-delta).state;
       }
       const wave=Math.sin(r.elapsed/360);
       // A fixed held key is deliberately unsafe: alternate slow/fast as the speed fluctuates.
       const speed=120+112*wave+p.assist*62;
       const pos=T.sampleAt(r.trace,p.traceState.progress+Math.max(0,speed)*delta/1000);
       p.traceState=T.move(r.trace,p.traceState,pos,now);
     }
     syncPlayer(r,p,now);
     if(r.elapsed>=r.limit&&!p.done)done(r,p,now,false,'제한시간 종료');
   }
   const firstDone=r.players.filter(p=>p.done).map(p=>p.doneAt);
   if(firstDone.length&&r.players.some(p=>!p.done)&&now-Math.min(...firstDone)>=7500){
     for(const p of r.players)if(!p.done)done(r,p,now,false,'상대 선수보다 늦었어요.');
   }
   if(r.players.every(p=>p.done))return completeRound(state);
   return state;
 }
 if(state.phase==='tiebreak'&&state.tie){
   if(now>=state.tie.endsAt||state.tie.answers.every(a=>a!==null)||
      (state.tie.firstCorrectAt!==null&&now-state.tie.firstCorrectAt>=1200)){
      return settleTie(state,now);
   }
 }
 return state;
}
function completeRound(state){
 if(state.phase!=='playing')return state;
 const result=outcome(state.round),totals=state.totals.slice();
 if(result.winner===null){totals[0]+=.5;totals[1]+=.5;}
 else totals[result.winner]++;
 return {...state,phase:'summary',totals,results:[...state.results,result]};
}
function next(state,now){
 if(state.phase!=='summary')return state;
 const index=state.index+1;
 if(index<ROUNDS.length)return {...state,index,phase:'intro',round:null};
 if(state.totals[0]!==state.totals[1]){
   return {...state,index:ROUNDS.length,phase:'finished',champion:state.totals[0]>state.totals[1]?0:1,round:null};
 }
 return {...state,index:ROUNDS.length,phase:'tiebreak',round:null,tie:makeTie(state.seed,0,now)};
}
function makeTie(seed,serial,now){
 const rng=M.random((seed+serial*94183+1109)>>>0);
 return {serial,question:M.mathQuestion(rng),answers:[null,null],times:[null,null],
   startsAt:now,endsAt:now+15000,firstCorrectAt:null};
}
function tieAnswer(state,id,answer,now){
 if(state.phase!=='tiebreak'||!state.tie||id!==0&&id!==1)return state;
 const tie=state.tie;
 if(tie.answers[id]!==null||now>tie.endsAt)return state;
 const valid=tie.question.options.includes(Number(answer));
 if(!valid)return state;
 tie.answers[id]=Number(answer);tie.times[id]=now;
 if(Number(answer)===tie.question.answer&&tie.firstCorrectAt===null)tie.firstCorrectAt=now;
 return tick(state,now);
}
function settleTie(state,now=state.tie.endsAt){
 const q=state.tie.question,answers=state.tie.answers,times=state.tie.times;
 const good=answers.map(a=>a===q.answer);
 let winner=null;
 if(good[0]!==good[1])winner=good[0]?0:1;
 else if(good[0]&&good[1]&&Math.abs(times[0]-times[1])>150)winner=times[0]<times[1]?0:1;
 if(winner!==null){
   return {...state,phase:'finished',champion:winner,totals:state.totals.map((s,i)=>s+(i===winner?1:0)),tie:null};
 }
 return {...state,rematch:state.rematch+1,tie:makeTie(state.seed,state.rematch+1,now)};
}
const DIRECTIONS={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
function input(state,id,action,value,now){
 if(![0,1].includes(id))return state;
 if(state.phase==='tiebreak')return action==='answer'?tieAnswer(state,id,value,now):state;
 if(state.phase!=='playing'||!state.round)return state;
 state=tick(state,now);
 if(state.phase!=='playing')return state;
 const r=state.round,p=r.players[id];if(p.done)return state;
 if(r.id==='dalgona'){
   if(action==='trace-start')p.traceState=T.begin(r.trace,p.traceState,value,now).state;
   if(action==='trace-move')p.traceState=T.move(r.trace,p.traceState,value,now);
   if(action==='trace-end')p.traceState=T.release(r.trace,p.traceState,now);
   if(action==='assist'){p.assist=clamp(Number(value)||0,-1,1);if(p.assist===0&&p.hold){
     p.traceState=T.release(r.trace,p.traceState,now);p.hold=false;
   }}
   if(action==='hold'){p.hold=Boolean(value);if(!p.hold&&p.traceState.active){
     p.traceState=T.release(r.trace,p.traceState,now);
   }else if(p.hold&&!p.traceState.active){
     const tip=T.sampleAt(r.trace,p.traceState.progress);
     p.traceState=T.begin(r.trace,p.traceState,tip,now).state;
   }}
 }else if(r.id==='bridge'){
   if(r.phase==='preview')return state;
   if(action==='step'&&DIRECTIONS[value]){
     const cell=r.map.path[p.bridgeStep],target=r.map.path[p.bridgeStep+1];if(target===undefined)return state;
     const dx=DIRECTIONS[value][0],dy=DIRECTIONS[value][1];
     const x=cell%r.map.width+dx,y=Math.floor(cell/r.map.width)+dy;
     if(x<0||x>=r.map.width||y<0||y>=r.map.height||x+y*r.map.width!==target){
       p.bridgeWrong=true;done(r,p,now,false,'잘못된 발판을 밟았어요.');
     }else{
       p.bridgeStep++;
       if(p.bridgeStep===r.map.path.length-1)done(r,p,now,true);
     }
   }
 }else if(r.id==='redlight'){
   if(action==='hold')M.act(p.body,'hold',Boolean(value),now);
 }else if(r.id==='tug'){
   if(action==='tap')M.act(p.body,'pull',null,now);
 }else if(r.id==='marbles'){
   if(action==='choose')M.act(p.body,'choose',value,now);
 }else if(r.id==='final'){
   if(action==='symbol')M.act(p.body,'symbol',value,now);
   if(action==='tap')M.act(p.body,'hit',null,now);
   if(action==='answer')M.act(p.body,'answer',value,now);
 }
 syncPlayer(r,p,now);
 if(r.players.every(x=>x.done))return completeRound(state);
 return state;
}
return Object.freeze({ROUNDS,LIMITS,saveKey,initial,start,launch,tick,input,next,makeRound,
  outcome,progressOf,makeTie,tieAnswer,settleTie});
});

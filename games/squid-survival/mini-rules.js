/* Four real, deterministic survival mini-games; no external dependencies. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.SquidMiniRules=api;
})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
const MODES=Object.freeze({
  redlight:{id:'redlight',name:'멈춰! 움직여!',hint:'초록불에 누르고, 빨간불 전에 손을 떼세요.',limit:50000},
  tug:{id:'tug',name:'줄다리기',hint:'바늘이 초록 영역일 때 줄을 당기세요.',limit:38000},
  marbles:{id:'marbles',name:'구슬 승부',hint:'조건에 맞는 구슬 주머니를 선택하세요.',limit:57000},
  final:{id:'final',name:'꼴뚜기 결승전',hint:'기억 → 타이밍 → 수학의 세 시험을 통과하세요.',limit:65000}
});
const SYMBOLS=Object.freeze(['▲','●','■','★']);
function random(seed){let x=(seed>>>0)||123456789;return function(){x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;};}
function between(r,min,max){return min+Math.floor(r()*(max-min+1));}
function marbleQuestion(r,index){
  const types=['odd','even','greater','less','odd'];
  const type=types[index%types.length];
  for(let tries=0;tries<200;tries++){
    const left=between(r,2,12),right=between(r,2,12);
    if(left===right)continue;
    let target=0,correctLeft=false,correctRight=false,prompt='';
    if(type==='odd'){correctLeft=left%2===1;correctRight=right%2===1;prompt='홀수 구슬이 든 주머니는?';}
    if(type==='even'){correctLeft=left%2===0;correctRight=right%2===0;prompt='짝수 구슬이 든 주머니는?';}
    if(type==='greater'){
      target=between(r,4,10);correctLeft=left>target;correctRight=right>target;
      prompt=target+'개보다 많은 구슬은 어느 쪽?';
    }
    if(type==='less'){
      target=between(r,4,10);correctLeft=left<target;correctRight=right<target;
      prompt=target+'개보다 적은 구슬은 어느 쪽?';
    }
    if(correctLeft!==correctRight)return{type,prompt,left,right,target,answer:correctLeft?'left':'right'};
  }
  throw new Error('Could not generate a unique marble question');
}
function mathQuestion(r){
  const a=between(r,3,11),b=between(r,2,9),answer=a+b;
  const candidates=new Set([answer]);
  while(candidates.size<3)candidates.add(Math.max(1,answer+between(r,-5,5)));
  const options=[...candidates];
  // Fisher-Yates
  for(let i=options.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[options[i],options[j]]=[options[j],options[i]];}
  return{prompt:a+' + '+b+' = ?',options,answer};
}
function create(mode,seed=1507){
  if(!MODES[mode])throw Error('Unsupported game: '+mode);
  const r=random(seed),s={
    mode,seed:seed>>>0,status:'ready',startedAt:null,at:0,elapsed:0,
    limit:MODES[mode].limit,score:0,reason:'',events:0
  };
  if(mode==='redlight')Object.assign(s,{signal:'green',signalSince:0,signalEnds:between(r,1900,3000),held:false,progress:0,
    nextGreen:between(r,1900,3100),nextRed:between(r,1000,1650)});
  if(mode==='tug')Object.assign(s,{rope:29,fatigue:0,combo:0,lastTap:-9999,pulls:0,perfect:0});
  if(mode==='marbles')Object.assign(s,{questionIndex:0,correct:0,misses:0,questions:Array.from({length:5},(_,i)=>marbleQuestion(r,i))});
  if(mode==='final')Object.assign(s,{part:'preview',previewEnds:3800,sequence:Array.from({length:4},()=>SYMBOLS[between(r,0,3)]),
    entered:0,timingHits:0,timingMisses:0,lastHit:-9999,math:mathQuestion(r)});
  return s;
}
function finish(s,success,reason=''){
  if(s.status!=='playing')return s;
  s.status=success?'cleared':'failed';s.reason=reason;
  s.score=success?Math.max(50,Math.round(100-40*s.elapsed/s.limit-
    (s.mode==='tug'?s.fatigue*.2:0)-(s.mode==='marbles'?s.misses*12:0)-
    (s.mode==='final'?s.timingMisses*9:0))):0;
  return s;
}
function start(s,now){
  if(s.status!=='ready')return s;
  s.status='playing';s.startedAt=now;s.at=now;return s;
}
function timingPosition(s){const phase=((s.elapsed%1450)+1450)%1450/1450;return phase<=.5?phase*2:(1-phase)*2;}
function advance(s,now){
  if(s.status!=='playing')return s;
  let dt=Math.max(0,Math.min(500,now-s.at));
  s.elapsed=Math.max(s.elapsed,Math.max(0,now-s.startedAt));s.at=now;
  if(s.elapsed>=s.limit)return finish(s,false,'제한시간이 끝났어요.');
  if(s.mode==='redlight'){
    let loops=0;
    while(s.elapsed>=s.signalEnds&&loops++<10){
      const when=s.signalEnds;
      if(s.signal==='green'){s.signal='warning';s.signalEnds=when+470;}
      else if(s.signal==='warning'){s.signal='red';s.signalEnds=when+s.nextRed;}
      else{s.signal='green';s.signalEnds=when+s.nextGreen;}
      s.signalSince=when;
    }
    if(s.signal==='red'&&s.held&&s.elapsed-s.signalSince>160)return finish(s,false,'빨간불에 움직였어요!');
    if(s.signal==='green'&&s.held){
      s.progress=Math.min(100,s.progress+dt*.019);
      if(s.progress>=100)return finish(s,true);
    }
  }
  if(s.mode==='tug'){
    s.rope-=dt*.0009;
    s.fatigue=Math.max(0,s.fatigue-dt*.0016);
    if(s.rope<=0)return finish(s,false,'상대 팀에게 끌려갔어요.');
  }
  if(s.mode==='final'&&s.part==='preview'&&s.elapsed>=s.previewEnds)s.part='memory';
  return s;
}
function act(s,action,value,now){
  if(s.status!=='playing')return s;
  advance(s,now);
  if(s.status!=='playing')return s;
  if(s.mode==='redlight'){
    if(action==='hold'){s.held=Boolean(value);s.events++;}
  }else if(s.mode==='tug'&&action==='pull'){
    const delta=s.elapsed-s.lastTap;
    s.lastTap=s.elapsed;s.pulls++;s.events++;
    if(delta<260){s.fatigue+=24;s.rope-=8;s.combo=0;}
    else {
      const phase=(s.elapsed%1000)/1000,dist=Math.abs(phase-.5);
      if(dist<=.10){s.rope+=15;s.combo++;s.perfect++;}
      else if(dist<=.21){s.rope+=7;s.combo=0;}
      else{s.rope-=6;s.fatigue+=13;s.combo=0;}
    }
    if(s.rope>=100)finish(s,true);
    if(s.fatigue>=100||s.rope<=0)finish(s,false,'무리하게 줄을 당겼어요.');
  }else if(s.mode==='marbles'&&action==='choose'){
    if(value!=='left'&&value!=='right')return s;
    const q=s.questions[s.questionIndex];if(!q)return s;
    s.events++;
    if(value===q.answer)s.correct++;
    else s.misses++;
    s.questionIndex++;
    if(s.misses>=2)return finish(s,false,'구슬 두 번을 잘못 골랐어요.');
    if(s.questionIndex===s.questions.length)return finish(s,true);
  }else if(s.mode==='final'){
    if(s.part==='memory'&&action==='symbol'&&SYMBOLS.includes(value)){
      s.events++;
      if(value!==s.sequence[s.entered])return finish(s,false,'기억한 순서가 달라요.');
      s.entered++;
      if(s.entered===s.sequence.length)s.part='timing';
    }else if(s.part==='timing'&&action==='hit'){
      if(s.elapsed-s.lastHit<420)return s;
      s.lastHit=s.elapsed;s.events++;
      if(timingPosition(s)>=.76){s.timingHits++;}
      else{s.timingMisses++;}
      if(s.timingMisses>=3)return finish(s,false,'타이밍을 세 번 놓쳤어요.');
      if(s.timingHits>=2)s.part='math';
    }else if(s.part==='math'&&action==='answer'&&s.math.options.includes(Number(value))){
      s.events++;
      if(Number(value)!==s.math.answer)return finish(s,false,'계산 결과가 달라요.');
      return finish(s,true);
    }
  }
  return s;
}
return Object.freeze({MODES,SYMBOLS,create,start,advance,act,finish,timingPosition,marbleQuestion,mathQuestion,random});
});

'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const R=require('../games/squid-survival/mini-rules.js');
const DIR=path.join(__dirname,'../games/squid-survival');
const MODES=['redlight','tug','marbles','final'];

test('four real challenge modes have visible standalone pages and separate SDK identities',()=>{
  assert.deepEqual(Object.keys(R.MODES),MODES);
  const map={redlight:'squid_redlight',tug:'squid_tug',marbles:'squid_marbles',final:'squid_final'};
  for(const mode of MODES){
    const html=fs.readFileSync(path.join(DIR,mode,'index.html'),'utf8');
    assert.match(html,new RegExp('data-game-id="'+map[mode]+'"'));
    assert.match(html,new RegExp('data-mode="'+mode+'"'));
    assert.match(html,/mini-rules\.js\?v=3/);
    assert.match(html,/mini\.js\?v=5/);
    assert.match(html,/id="choices"/);
    assert.match(html,/id="scene"/);
  }
  const js=fs.readFileSync(path.join(DIR,'mini.js'),'utf8');
  assert.doesNotThrow(()=>new Function(js));
  assert.match(js,/addEventListener\('pointerdown'/);
  assert.match(js,/addEventListener\('keyup'/);
  assert.match(js,/KidscadeGame/);
  assert.match(js,/const nextKey=/); // choice buttons are not destroyed every frame
});
test('100 random traffic-light schedules can be cleared by reacting to the signal',()=>{
  for(let seed=1;seed<=100;seed++){
    const s=R.create('redlight',seed);
    R.start(s,0);
    for(let now=20;now<=s.limit;now+=20){
      R.advance(s,now);
      if(s.status!=='playing')break;
      R.act(s,'hold',s.signal==='green',now);
    }
    assert.equal(s.status,'cleared','seed '+seed);
    assert.ok(s.progress>=100);
  }
});
test('yellow signal is a warning, never an automatic stop: motion continues while held',()=>{
 for(let seed=1;seed<=100;seed++){
   const s=R.create('redlight',seed);R.start(s,0);
   R.act(s,'hold',true,10);
   let at=null,before=0;
   for(let now=20;now<5000&&s.status==='playing';now+=20){
     R.advance(s,now);
     if(s.signal==='warning'&&at===null){at=now;before=s.progress;}
     if(at!==null&&now>=at+180){
       assert.equal(s.signal,'warning');
       assert.equal(s.held,true);
       assert.ok(s.progress>before,'seed '+seed+' auto-stopped at yellow');
       R.act(s,'hold',false,now);
       const parked=s.progress;
       R.advance(s,now+100);
       assert.equal(s.progress,parked,'release must actually stop player');
       break;
     }
   }
   assert.notEqual(at,null);
 }
});
test('running on a red signal causes an immediate loss after the reaction window',()=>{
  const s=R.create('redlight',9);R.start(s,0);
  R.act(s,'hold',true,10);
  for(let now=20;now<s.limit&&s.status==='playing';now+=20)R.advance(s,now);
  assert.equal(s.status,'failed');
  assert.match(s.reason,/빨간불/);
});
test('yellow warning never brakes a held runner: movement continues until manual release',()=>{
 for(let seed=1;seed<=100;seed++){
   const held=R.create('redlight',seed);R.start(held,0);
   R.act(held,'hold',true,20);
   let yellowAt=null,yellowProgress=0,postYellow=0;
   for(let now=40;now<8000&&held.status==='playing';now+=20){
     R.advance(held,now);
     if(held.signal==='warning'&&yellowAt===null){
       yellowAt=now;yellowProgress=held.progress;
     }
     if(yellowAt!==null&&now===yellowAt+200)postYellow=held.progress;
   }
   assert.ok(yellowAt!==null,'seed '+seed+' warning not reached');
   assert.ok(postYellow>yellowProgress+2,'seed '+seed+' held runner auto-stopped on yellow');
   assert.equal(held.status,'failed','seed '+seed+' must fail if still holding into red');
   assert.match(held.reason,/빨간불/);
 }
});
test('releasing during yellow actually stops player through red; pressing green restarts movement',()=>{
 for(let seed=1;seed<=100;seed++){
   const s=R.create('redlight',seed);R.start(s,0);R.act(s,'hold',true,20);
   let releasedAt=null,whenStopped=0,survivedRed=false;
   for(let now=40;now<9500;now+=20){
     R.advance(s,now);
     if(s.signal==='warning'&&releasedAt===null){
       R.act(s,'hold',false,now);releasedAt=now;whenStopped=s.progress;
     }
     if(releasedAt!==null&&s.signal==='red'){
       assert.ok(Math.abs(s.progress-whenStopped)<.01,'seed '+seed+' player moved with button released');
       survivedRed=true;break;
     }
   }
   assert.ok(survivedRed,'seed '+seed+' never reached red after release');
   assert.equal(s.status,'playing','seed '+seed+' release should prevent disqualification');
   assert.equal(s.held,false);
 }
});
test('timed pulls consistently beat the opponent, while repeated spam leads to defeat',()=>{
  for(let seed=1;seed<=100;seed++){
    const s=R.create('tug',seed);R.start(s,0);
    for(let cycle=0;cycle<12&&s.status==='playing';cycle++){
       const time=Math.round((cycle+.5)*s.tugPeriod-s.tugOffset);
       if(time>0)R.act(s,'pull',null,time);
     }
    assert.equal(s.status,'cleared','tug seed '+seed);
    assert.ok(s.perfect>=4);
  }
  const spam=R.create('tug',13);R.start(spam,0);
  for(let t=10;t<1000&&spam.status==='playing';t+=50)R.act(spam,'pull',null,t);
  assert.equal(spam.status,'failed');
  assert.ok(spam.fatigue>0);
});
test('500 marble questions have exactly one correct answer and game enforces two misses',()=>{
  for(let seed=1;seed<=100;seed++){
    const s=R.create('marbles',seed);R.start(s,0);
    assert.equal(s.questions.length,5);
    for(const q of s.questions){
      assert.ok(q.left!==q.right);
      const check=value=>q.type==='odd'?value%2===1:q.type==='even'?value%2===0:q.type==='greater'?value>q.target:value<q.target;
      assert.notEqual(check(q.left),check(q.right));
      assert.equal(q.answer,check(q.left)?'left':'right');
    }
    while(s.status==='playing')R.act(s,'choose',s.questions[s.questionIndex].answer,1000+s.questionIndex*950);
    assert.equal(s.status,'cleared');
  }
  const wrong=R.create('marbles',61);R.start(wrong,0);
  for(let i=0;i<2;i++){
    const expected=wrong.questions[wrong.questionIndex].answer;
    R.act(wrong,'choose',expected==='left'?'right':'left',1000+i*200);
  }
  assert.equal(wrong.status,'failed');
  assert.equal(wrong.misses,2);
});
test('final has memory order, two timing hits and arithmetic gate',()=>{
  for(let seed=1;seed<=100;seed++){
    const s=R.create('final',seed);R.start(s,0);
    assert.equal(s.part,'preview');
    R.advance(s,3900);assert.equal(s.part,'memory');
    for(let i=0;i<4;i++)R.act(s,'symbol',s.sequence[i],4100+i*95);
    assert.equal(s.part,'timing');
    for(let t=4800;t<20000&&s.part==='timing';t+=40){
      if(R.timingPosition({...s,elapsed:t})>=.82)R.act(s,'hit',null,t);
    }
    assert.equal(s.part,'math');
    assert.ok(s.math.options.includes(s.math.answer));
    R.act(s,'answer',s.math.answer,21100);
    assert.equal(s.status,'cleared','final seed '+seed);
  }
});
test('wrong final memory, three missed rhythms, wrong math, timeout all fail',()=>{
  const memory=R.create('final',1);R.start(memory,0);R.advance(memory,3900);
  R.act(memory,'symbol',R.SYMBOLS.find(x=>x!==memory.sequence[0]),4000);
  assert.equal(memory.status,'failed');
  const timing=R.create('final',1);R.start(timing,0);R.advance(timing,3900);
  for(let i=0;i<4;i++)R.act(timing,'symbol',timing.sequence[i],4000+i*90);
  let misses=0,last=-1000;
   for(let t=4400;t<15000&&timing.status==='playing';t+=20){
     if(t-last>420&&R.timingPosition({...timing,elapsed:t})<.18){
       R.act(timing,'hit',null,t);last=t;misses++;
     }
   }
   assert.equal(misses,3);
  assert.equal(timing.status,'failed');
  const arithmetic=R.create('final',3);R.start(arithmetic,0);R.advance(arithmetic,3900);
  for(let i=0;i<4;i++)R.act(arithmetic,'symbol',arithmetic.sequence[i],4000+i*90);
  for(let t=4800;t<18000&&arithmetic.part==='timing';t+=40)
    if(R.timingPosition({...arithmetic,elapsed:t})>=.82)R.act(arithmetic,'hit',null,t);
  R.act(arithmetic,'answer',arithmetic.math.options.find(x=>x!==arithmetic.math.answer),21000);
  assert.equal(arithmetic.status,'failed');
  for(const mode of MODES){const s=R.create(mode,1);R.start(s,0);R.advance(s,s.limit+1);assert.equal(s.status,'failed');}
});

test('each replay changes signals, tug cadence, marble order and final timing',()=>{
  const signals=new Set(),tugPeriods=new Set(),finalPeriods=new Set(),orders=new Set();
  for(let seed=1;seed<=100;seed++){
    const red=R.create('redlight',seed);R.start(red,0);
    R.advance(red,red.signalEnds+1);
    const warning=red.signalEnds;
    R.advance(red,warning+1);
    const redEnd=red.signalEnds;
    R.advance(red,redEnd+1);
    signals.add([warning,redEnd,red.signalEnds].join(','));
    tugPeriods.add(R.create('tug',seed).tugPeriod);
    finalPeriods.add(R.create('final',seed).timingPeriod);
    orders.add(R.create('marbles',seed).questions.map(x=>x.type).join(','));
  }
  assert.ok(signals.size>75);assert.ok(tugPeriods.size>50);
  assert.ok(finalPeriods.size>50);assert.ok(orders.size>10);
  for(let seed=1;seed<=30;seed++){
    const tug=R.create('tug',seed);
    for(const phase of [.1,.5,.9]){
      tug.elapsed=tug.tugPeriod*phase-tug.tugOffset;
      assert.ok(Math.abs(R.tugPosition(tug)-phase)<1e-9);
    }
  }
});

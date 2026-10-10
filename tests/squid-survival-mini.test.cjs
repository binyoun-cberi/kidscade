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
    const html=fs.readFileSync(path.join(DIR,mode+'.html'),'utf8');
    assert.match(html,new RegExp('data-game-id="'+map[mode]+'"'));
    assert.match(html,new RegExp('data-mode="'+mode+'"'));
    assert.match(html,/mini-rules\.js\?v=1/);
    assert.match(html,/mini\.js\?v=2/);
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
test('running on a red signal causes an immediate loss after the reaction window',()=>{
  const s=R.create('redlight',9);R.start(s,0);
  R.act(s,'hold',true,10);
  for(let now=20;now<s.limit&&s.status==='playing';now+=20)R.advance(s,now);
  assert.equal(s.status,'failed');
  assert.match(s.reason,/빨간불/);
});
test('timed pulls consistently beat the opponent, while repeated spam leads to defeat',()=>{
  for(let seed=1;seed<=100;seed++){
    const s=R.create('tug',seed);R.start(s,0);
    for(let time=500;time<10000&&s.status==='playing';time+=1000)R.act(s,'pull',null,time);
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
  for(let i=0;i<3;i++)R.act(timing,'hit',null,4400+i*1450);
  assert.equal(timing.status,'failed');
  const arithmetic=R.create('final',3);R.start(arithmetic,0);R.advance(arithmetic,3900);
  for(let i=0;i<4;i++)R.act(arithmetic,'symbol',arithmetic.sequence[i],4000+i*90);
  for(let t=4800;t<18000&&arithmetic.part==='timing';t+=40)
    if(R.timingPosition({...arithmetic,elapsed:t})>=.82)R.act(arithmetic,'hit',null,t);
  R.act(arithmetic,'answer',arithmetic.math.options.find(x=>x!==arithmetic.math.answer),21000);
  assert.equal(arithmetic.status,'failed');
  for(const mode of MODES){const s=R.create(mode,1);R.start(s,0);R.advance(s,s.limit+1);assert.equal(s.status,'failed');}
});

'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'../games/high_ota_typographic_horror');
const L=require('../games/high_ota_typographic_horror/literacy.js');
const C3=require('../games/high_ota_typographic_horror/chapter3.js');
const R=require('../games/high_ota_typographic_horror/rules.js');
const X=require('../games/high_ota_typographic_horror/corrector.js');

test('reviewed exercises have one uniquely correct spelling and useful feedback',()=>{
  assert.ok(L.BANK.length>=50);
  const ids=new Set();
  const kinds=new Set();
  for(const q of L.BANK){
    assert.ok(!ids.has(q.id));ids.add(q.id);kinds.add(q.kind);
    assert.notEqual(q.wrong,q.correct,q.id);
    assert.equal(q.choices.length,4,q.id);
    assert.equal(new Set(q.choices).size,4,q.id);
    assert.equal(q.choices.filter(v=>v===q.correct).length,1,q.id);
    assert.ok(q.context.includes('___'),q.id);
    assert.ok(q.explain.length>8,q.id);
  }
  assert.deepEqual([...kinds].sort(),['맞춤법','문맥','받침','띄어쓰기'].sort());
});
test('unattended repeated misspellings awaken the Corrector without immediate failure',()=>{
  const s=L.create();
  assert.equal(s.coreDone,0);
  assert.equal(s.items.length,5);
  let awakened=false;
  for(let i=0;i<1700;i++){if(L.step(s,.1).awakened)awakened=true;}
  assert.equal(awakened,true);
  assert.equal(s.awakened,true);
  assert.ok(s.contamination>=65);
  assert.ok(s.items.filter(i=>i.kind==='transient').length<=3);
  const q=L.question(s.items[0]);
  const wrong=L.correct(s,s.items[0].uid,q.wrong);
  assert.equal(wrong.ok,false);
  assert.equal(s.coreDone,0);
  assert.ok(s.items.some(i=>i.uid==='core-0'));
});
test('good corrections decrease pollution, core progress and persistence survive retry',()=>{
  const s=L.create();
  for(let i=0;i<950;i++)L.step(s,.1);
  const high=s.contamination;
  const transient=s.items.find(i=>i.kind==='transient');
  assert.ok(transient);
  assert.equal(L.correct(s,transient.uid,L.question(transient).correct).ok,true);
  assert.ok(s.contamination<high);
  for(const item of [...s.items].filter(i=>i.kind==='core')){
    assert.equal(L.correct(s,item.uid,L.question(item).correct).ok,true);
  }
  assert.equal(s.coreDone,5);
  const saved=L.checkpoint(s),restarted=L.create();
  assert.equal(L.restore(restarted,saved),true);
  assert.equal(restarted.coreDone,5);
  assert.equal(restarted.items.filter(i=>i.kind==='core').length,0);
  assert.equal(restarted.awakened,false);
  assert.equal(restarted.contamination,0);
});
test('final record cannot open before five repairs even with documents A and B',()=>{
  const s=R.initialState();s.stage='explore';s.literacy=L.create();
  const c=C3.ensure(s);c.records.office=true;c.records.archive=true;
  assert.equal(C3.repairFinal(s,'기억',C3.FINAL_GATE),false);
  assert.equal(C3.interaction(s,C3.FINAL_GATE).type,'coreNeeded');
  for(const i of [...s.literacy.items]){
    assert.equal(L.correct(s.literacy,i.uid,L.question(i).correct).ok,true);
  }
  assert.equal(C3.interaction(s,C3.FINAL_GATE).type,'final');
  assert.equal(C3.repairFinal(s,'기억',C3.FINAL_GATE),true);
  assert.equal(s.stage,'final');
});
test('the Corrector sleeps until pollution threshold, then can patrol',()=>{
  const x=X.create(),s=L.create();
  const env={stage:'explore',awakened:false,safe:false,moving:true,running:true,
    noise:false,passable:(xx,z)=>xx>=-15&&xx<=3&&z>=-65&&z<=-39};
  assert.equal(X.step(x,.1,{x:-7,z:-43},{...env}).phase,'dormant');
  for(let i=0;i<1300;i++)L.step(s,.1);
  assert.equal(s.awakened,true);
  assert.equal(X.step(x,.1,{x:-7,z:-43},{...env,awakened:true}).phase,'patrol');
  assert.equal(X.step(x,.1,{x:-7,z:-43},{...env}).phase,'dormant');
});
test('browser loads vocabulary module, playable 4-way panel and world records',()=>{
  const js=fs.readFileSync(path.join(root,'game.js'),'utf8');
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  assert.ok(html.indexOf('src="literacy.js"')<html.indexOf('src="game.js"'));
  assert.match(html,/id="correctionPanel"/);
  assert.match(html,/id="literacyStatus"/);
  assert.match(js,/L\.step\(literacy,dt\)/);
  assert.match(js,/L\.correct\(literacy,activeCorrection/);
  assert.match(js,/syncLiteracyVisuals\(/);
  assert.match(js,/saveChapterCheckpoint/);
  assert.match(js,/overlays\.correction\.classList\.contains\('closed'\)/);
});

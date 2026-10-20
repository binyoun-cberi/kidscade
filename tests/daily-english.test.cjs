const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../games/daily_english/engine.js');
const C=require('../games/daily_english/content.js');
const NOW=Date.parse('2026-10-20T14:59:00Z'); // 23:59 in Korea
function complete(s,now=NOW){let result;while(s.active){const a=s.active;E.answer(s,a.deck[a.index].answer,now);result=E.advance(s,now);}return result;}
test('18 lessons contain solvable vocabulary, listening, spelling, order and conversation exercises',()=>{
  assert.equal(C.lessons.length,18);assert.equal(C.zones.length,3);
  for(const l of C.lessons){const deck=C.questions(l.index);assert.equal(deck.length,8);assert.equal(new Set(l.words.map(w=>w.en)).size,3);
    for(const q of deck){if(q.options){assert.ok(q.options.includes(q.answer));assert.equal(new Set(q.options).size,q.options.length);}else{const expected=q.answer.split(q.kind==='spell'?'':' ').sort();assert.deepEqual([...q.tokens].sort(),expected);}}
  }
});
test('perfect day permits exactly six new lessons, including the sixth at zero energy',()=>{
  const s=E.fresh(NOW);for(let i=0;i<6;i++){assert.equal(E.start(s,i,C.questions(i),NOW),true);const r=complete(s);assert.equal(r.unlocked,true);assert.equal(r.combo,i+1);assert.equal(s.streak,1);}
  assert.equal(s.energy,0);assert.equal(s.started,6);assert.equal(E.start(s,6,C.questions(6),NOW),false);assert.deepEqual(s.stickers,[3,6]);
});
test('mistakes drain energy, add a delayed recovery, and cannot charge twice before next',()=>{
  const s=E.fresh(NOW);E.start(s,0,C.questions(0),NOW);assert.equal(E.answer(s,'wrong',NOW),false);assert.equal(s.energy,23);assert.equal(s.active.deck[3].recovery,true);assert.equal(s.active.deck.length,9);
  assert.equal(E.answer(s,'wrong',NOW),null);assert.equal(s.energy,23);E.advance(s,NOW);const r=complete(s);assert.equal(r.errors,1);assert.equal(r.unlocked,true);assert.deepEqual(s.mistakes,[0]);
});
test('zero completed new lessons remains possible; exhaustion offers free practice and keeps streak',()=>{
  const s=E.fresh(NOW);s.energy=5;E.start(s,0,C.questions(0),NOW);E.answer(s,'wrong',NOW);assert.equal(s.active.mode,'practice');assert.equal(s.active.exhausted,true);E.advance(s,NOW);const r=complete(s);assert.equal(r.unlocked,false);assert.equal(s.completed.length,0);assert.equal(s.streak,1);assert.equal(s.energy,0);
  assert.equal(E.practice(s,0,C.questions(0),NOW),true);complete(s);assert.equal(s.energy,0);assert.equal(s.today,2);assert.equal(s.streak,1);
});
test('reload preserves paid entry, pending feedback, recovery queue and progress',()=>{
  const s=E.fresh(NOW);E.start(s,0,C.questions(0),NOW);E.answer(s,'wrong',NOW);const restored=E.load(JSON.parse(JSON.stringify(s)),NOW);assert.deepEqual(restored,s);assert.equal(E.answer(restored,'wrong',NOW),null);assert.equal(restored.energy,23);E.advance(restored,NOW);complete(restored);assert.deepEqual(restored.completed,[0]);
});
test('Korean midnight resets energy once and maintains daily streak rules',()=>{
  const s=E.fresh(NOW);E.start(s,0,C.questions(0),NOW);complete(s);const tomorrow=NOW+120000;E.roll(s,tomorrow);assert.equal(s.energy,30);assert.equal(s.today,0);assert.equal(s.streak,1);E.start(s,1,C.questions(1),tomorrow);complete(s,tomorrow);assert.equal(s.streak,2);E.roll(s,tomorrow);assert.equal(s.energy,25);E.roll(s,tomorrow+2*86400000);assert.equal(s.streak,0);
  assert.equal(E.day(Date.parse('2026-10-20T15:00:00Z')),'2026-10-21');
});
test('midnight during a lesson turns that reservation into practice without consuming the new budget',()=>{
  const s=E.fresh(NOW);E.start(s,0,C.questions(0),NOW);E.roll(s,NOW+120000);assert.equal(s.energy,30);assert.equal(s.active.mode,'practice');const r=complete(s,NOW+120000);assert.equal(r.unlocked,false);assert.equal(s.energy,30);
});
test('all 18 lessons unlock in sequence over three days, and mastered review costs no energy',()=>{
  const s=E.fresh(NOW);for(let i=0;i<18;i++){const now=NOW+Math.floor(i/6)*86400000;assert.equal(E.start(s,i,C.questions(i),now),true);complete(s,now);}assert.equal(s.completed.length,18);assert.equal(s.streak,3);assert.equal(s.stickers.length,6);assert.equal(E.start(s,0,C.questions(0),NOW+2*86400000),true);complete(s,NOW+2*86400000);assert.equal(s.energy,0);assert.equal(s.completed.length,18);
});
test('corrupt and invalid saves cannot unlock future lessons or crash question validation',()=>{
  const s=E.load({version:1,energy:-9,completed:[0,2,90],streak:NaN,active:{lesson:0,deck:Array(8).fill({kind:'choice',prompt:'?',answer:'a',options:{}})}},NOW);assert.equal(s.energy,0);assert.deepEqual(s.completed,[0]);assert.equal(s.active,null);assert.equal(E.start(s,5,C.questions(5),NOW),false);assert.equal(E.start(s,-1,C.questions(0),NOW),false);
});

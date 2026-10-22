'use strict';
// Full historical auto-play QA, not a mocked decision. Invoke every era extension
// in the same order as the real HTML without DOM-dependent controller code.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const dir=path.resolve(__dirname,'../games/high_one_life');
const sandbox={console};sandbox.window=sandbox;
vm.createContext(sandbox);
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
for(const match of html.matchAll(/<script src="\.\/([^?" ]+)/g)){
  if(match[1]==='game.js')continue;
  vm.runInContext(fs.readFileSync(path.join(dir,match[1]),'utf8'),sandbox,{filename:match[1]});
}
const Life=sandbox.OneLifeSim.Life,auto=sandbox.OneLifeAutoChoiceV1;
const Goryeo=sandbox.OneLifeGoryeo343,Joseon=sandbox.OneLifeJoseon;
const copy=v=>JSON.parse(JSON.stringify(v));
function simulate(birthYear,seed,origin){
  let life=new Life(seed,{birthYear,countryName:'대한민국',birthSetup:{origin,gender:seed%2?'남자':'여자'}});
  if(Goryeo.is(life))Goryeo.ensure(life);
  else if(Joseon.isJoseon(life))Joseon.ensure(life);
  let decisions=0,reflections=0,steps=0,saves=0;
  while(life.alive&&steps++<360){
    assert.equal(life.year,life.birthYear+life.age,'era chronology must stay continuous');
    if(!life.pending){life.tick();continue;}
    const plan=auto.decide(life);
    assert.ok(plan,'a pending historical choice must be available to automatic play: '+life.pending);
    const rng=life.rng;
    assert.deepEqual(copy(auto.decide(life)),copy(plan),'decision selection must be deterministic');
    assert.equal(life.rng,rng,'policy must not consume simulation RNG');
    if(decisions%11===0){
      const before=copy(life.snapshot());
      const restored=Life.restore(before);
      assert.ok(restored,'an in-year historical save can restore');
      assert.equal(restored.pending,life.pending);
      assert.deepEqual(copy(auto.decide(restored)),copy(plan),'auto selection survives restored choices');
      life=restored;saves++;
    }
    assert.equal(auto.tick(life),true,'pending choice must advance: '+life.pending);
    if(plan.type==='choice')decisions++;else reflections++;
  }
  assert.ok(steps<360,'a life must not get stuck in an auto-choice loop');
  assert.equal(life.alive,false,'the life must reach an ending');
  return {origin,year:birthYear,career:life.career,age:life.age,
    choices:decisions,reflections,saves,death:life.deathReason,
    log:life.log.length,resource:Goryeo.is(life)?life.goryeo343?.grain:life.joseon?.capital};
}
test('24 Goryeo and Joseon lives auto-play to endings with intact saved decision identity',()=>{
 const list=[];
 for(let i=0;i<12;i++){
   const seed=(Math.imul(i+1,32452843)>>>0);
   list.push(simulate(1200+(i*13)%190,seed,
     sandbox.OneLifeIdentity20.GORYEO_ORIGINS[i%sandbox.OneLifeIdentity20.GORYEO_ORIGINS.length]));
   list.push(simulate(1420+(i*29)%440,seed,
     ['상민','중인','양반','사노비'][i%4]));
 }
 assert.ok(list.every(item=>item.choices+item.reflections>0));
 assert.ok(new Set(list.filter(item=>item.year<1392).map(item=>item.career+'|'+item.age+'|'+item.death)).size>=4,
   'Korean medieval life endings should not all be identical');
 assert.ok(new Set(list.filter(item=>item.year>=1392).map(item=>item.career+'|'+item.age+'|'+item.death)).size>=4,
   'Joseon life endings should not all be identical');
 assert.ok(list.reduce((n,x)=>n+x.saves,0)>2,'restore checks must actually run');
});
test('single automatic decision cannot mutate a completed or missing life',()=>{
 assert.equal(auto.tick(null),false);
 assert.equal(auto.tick({alive:false,pending:'joseon:foo'}),false);
});

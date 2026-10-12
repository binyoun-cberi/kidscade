'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const root=path.join(__dirname,'../games/high_one_life');
const Sim=require(path.join(root,'engine.js'));
global.window={OneLifeSim:Sim};
for(const [file,exposed] of [
 ['world-v2.js','OneLifeWorld2'],['world-v3.js','OneLifeWorld3'],
 ['world-v4.js','OneLifeWorld4'],['world-v5.js','OneLifeWorld5'],
 ['careers-v6.js','OneLifeCareers6'],['events-v6.js','OneLifeEvents6'],
 ['world-v6.js','OneLifeWorld6'],['world-v7.js','OneLifeWorld7'],
 ['world-v8.js','OneLifeWorld8'],['world-v9.js','OneLifeWorld9']
 ])global.window[exposed]=require(path.join(root,file));
const W8=global.window.OneLifeWorld8,W9=global.window.OneLifeWorld9;
delete global.window;
function birth(seed,year=2026,country='대한민국'){
 const life=new Sim.Life(seed,{birthYear:year,countryName:country});
 W8.ensure(life);W8.moment(life);W9.ensure(life);
 return life;
}
function resume(life,choiceIndex=0){
 let choices=0;
 while(life.pending){
  const c=life.getChoice();
  if(c){assert.ok(c.options.length);assert.equal(life.choose(choiceIndex%c.options.length),true);choices++;}
  else if(life.getReflection()){assert.equal(life.reflect(),true);choices++;}
  else assert.fail('Unresolved pending gate '+life.pending+' at '+life.age);
  assert.ok(choices<15,'same-year decisions loop');
 }
 return choices;
}
test('v9 is layered on existing game UI and registers new bounded chronology',()=>{
 const h=fs.readFileSync(path.join(root,'index.html'),'utf8'),g=fs.readFileSync(path.join(root,'game.js'),'utf8');
 assert.match(h,/world-v9\.js\?v=\d+/);
 for(const id of ['v9PeopleList','v9Hobby','v9Loan','v9TimelineMore','v9ChronicleCount'])
  assert.ok(h.includes('id="'+id+'"'),id);
 assert.match(g,/timelineVisible=Math\.min\(760,timelineVisible\+60\)/);
 assert.equal(Sim.Life.prototype.__world9,true);
});
test('childhood hobby survives to 65 and named friends never duplicate',()=>{
 const l=birth(11727);
 let choices=0;
 while(l.alive&&l.age<66){
  if(l.pending){choices+=resume(l,0);continue;}
  l.tick();
 }
 const state=W9.ensure(l);
 assert.equal(state.hobby,'축구');
 assert.equal(state.hobbySince,7);
 assert.ok(state.memories.includes('취미:축구'));
 if(l.age>=64)assert.ok(l.log.some(e=>e.kind==='memory'&&e.text.includes('노년의 하루')));
 const ids=state.people.map(p=>p.id);
 assert.equal(new Set(ids).size,ids.length);
 assert.ok(state.people.some(p=>p.id==='mother'));
 assert.ok(state.people.some(p=>p.id==='father'));
 assert.ok(choices>5);
});
test('v9 decisions persist while later events cannot resurrect deceased relatives',()=>{
 const l=birth(191932,{valueOf(){return 1919;}}.valueOf());
 while(l.alive&&l.age<60){if(l.pending)resume(l,0);else l.tick();}
 const s=W9.ensure(l);
 for(const p of s.people){
  if(p.deadYear!==null){
   assert.equal(p.alive,false);
   assert.ok(p.deadYear>=p.birthYear);
   assert.ok(!l.log.some(e=>e.year>p.deadYear&&e.text.includes(p.name+'(와)과 오랜만')));
  }
 }
 const snapshot=JSON.parse(JSON.stringify(l.snapshot()));
 const restored=Sim.Life.restore(snapshot);
 assert.ok(restored);
 assert.deepEqual(restored.snapshot(),snapshot);
});
test('subsequent-year loan interest and amortization are finite and never pay twice',()=>{
 let result=null;
 for(let seed=1;seed<60&&!result;seed++){
  const l=birth(seed);
  while(l.alive&&l.age<23){if(l.pending)resume(l,0);else l.tick();}
  if(l.age!==23)continue;
  if(l.pending&&l.pending==='v9:repair-cost'){
   result=l;
   break;
  }
 }
 assert.ok(result,'Expected to find at least one seed with a 23-year repair decision');
 const l=result;
 assert.equal(l.choose(0),true);
 const f=W9.ensure(l).finance;
 assert.equal(f.originalDebt,2400);
 assert.equal(f.debt,2400);
 const oldDebt=f.debt;
 while(l.pending)resume(l,0);
 while(l.alive&&l.age<32){if(l.pending)resume(l,0);else l.tick();}
 assert.ok(f.debt<oldDebt);
 assert.equal(f.debt,0);
 assert.equal(f.paidOff,true);
 assert.equal(l.log.filter(e=>e.text.includes('생활 대출을 모두 상환')).length,1);
});
test('v9 in-year pending choices survive JSON saves with full history',()=>{
 const life=birth(88741,1919,'대한민국');
 let hit=null,steps=0;
 while(life.alive&&life.age<25&&steps++<150){
  if(life.pending&&String(life.pending).startsWith('v9:')){hit=JSON.parse(JSON.stringify(life.snapshot()));break;}
  if(life.pending)resume(life,0);else life.tick();
 }
 assert.ok(hit,'No in-year choice before 25');
 const reloaded=Sim.Life.restore(hit);
 assert.equal(reloaded.pending,hit.pending);
 assert.deepEqual(reloaded.snapshot(),hit);
 assert.ok(reloaded.getChoice()?.options?.length);
 const age=reloaded.age;
 assert.equal(reloaded.choose(0),true);
 assert.equal(reloaded.age,age);
});
test('1,200 full lives across modern and historical countries have no dead-person resurrections or save drift',()=>{
 const countries=['대한민국','브라질','일본','인도','나이지리아','미국'];
 const years=[1919,1935,1950,1987,2026];
 let completed=0,restores=0,maxHistory=0,choices=0;
 for(let i=0;i<1200;i++){
  const l=birth(((i+1)*2654435761)>>>0,years[i%years.length],countries[i%countries.length]);
  let loops=0;
  while(l.alive&&loops++<380){
   if(l.pending){choices+=resume(l,i%2);continue;}
   const before=l.age;
   l.tick();
   assert.equal(l.age,before+1);
   assert.equal(l.year,l.birthYear+l.age);
   if(l.alive&&[12,23,35,52,70].includes(l.age)){
    const snap=JSON.parse(JSON.stringify(l.snapshot()));
    const restored=Sim.Life.restore(snap);
    assert.ok(restored);
    assert.deepEqual(restored.snapshot(),snap);
    restores++;
   }
   assert.ok(Number.isFinite(l.money.netWorth));
   assert.ok(l.log.length<=760);
  }
  assert.equal(l.alive,false,'lifetime must eventually end');
  const p=W9.ensure(l).people;
  assert.equal(p.length,new Set(p.map(x=>x.id)).size);
  assert.ok(p.every(x=>x.birthYear<=l.year+30&&(!x.deadYear||x.deadYear>=x.birthYear)));
  maxHistory=Math.max(maxHistory,l.log.length);
  completed++;
 }
 assert.equal(completed,1200);
 assert.ok(restores>600);
 assert.ok(choices>5000);
 assert.ok(maxHistory>170,'v9 chronology should be much richer than legacy 100 entries');
});

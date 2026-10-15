'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const dir=path.join(__dirname,'..','games','high_one_life');
const Sim=require(path.join(dir,'engine.js'));
global.window={OneLifeSim:Sim};
const W2=require(path.join(dir,'world-v2.js'));
global.window.OneLifeWorld2=W2;
const W3=require(path.join(dir,'world-v3.js'));
global.window.OneLifeWorld3=W3;
const W4=require(path.join(dir,'world-v4.js'));
delete global.window;
function play(seed,country,changedAge,option){
 const p=new Sim.Life(seed>>>0);
 if(country)p.country=Sim.COUNTRIES.find(x=>x[0]===country);
 W4.ensure(p);let years=0,stops=0;
 const snapshots={};
 while(p.alive&&years<110){
  if(p.pending){
   const c=p.getChoice();
   assert.ok(c,'choice must be available');
   assert.ok(W4.GATES.includes(p.age));
   assert.equal(p.choose(p.age===changedAge?option:1),true);
   stops++;continue;
  }
  p.tick();years++;
  if([29,42,55,64].includes(p.age)){
   snapshots[p.age]={career:p.career,netWorth:p.money.netWorth,health:p.stats.health,
    income:p.money.income,education:p.world.educationLevel,network:p.arc.network,
    path:p.arc.path};
  }
 }
 assert.equal(p.alive,false,'life stuck');
 return {p,stops,snapshots};
}
test('53 condition-tagged branching families, five contextual gates and fast controls',()=>{
 assert.ok(W4.EVENTS.length>=50);
 assert.deepEqual(W4.GATES,[16,20,29,42,64]);
 assert.ok(W4.EVENTS.every(e=>e.lines.length>=2 && Array.isArray(e.requires)));
 const script=fs.readFileSync(path.join(dir,'game.js'),'utf8');
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 assert.match(script,/const YEAR_MS = 260/);
 assert.match(html,/world-v4\.js\?v=\d+/);
 assert.match(html,/sameBirthBtn/);
 assert.match(html,/endComparisonRows/);
 assert.doesNotMatch(html,/data-speed=|data-duration=/);
});
test('a fixed birth seed can produce distinct career, education and finances',()=>{
 let eligible=0,career=0,education=0,income=0,assets=0,chains=0;
 for(const nation of ['대한민국','인도','나이지리아']){
  for(let i=1;i<=120;i++){
   const seed=Math.imul(i+11,2654435761)>>>0;
   const p0=play(seed,nation,20,0),p1=play(seed,nation,20,1),p2=play(seed,nation,20,2);
   if(!p0.p.arc.decisions.some(d=>d.age===20))continue;
   eligible++;
   const choices=[p0,p1,p2];
   if(new Set(choices.map(x=>x.snapshots[29]?.career)).size>1)career++;
   if(new Set(choices.map(x=>x.snapshots[29]?.education)).size>1)education++;
   if(new Set(choices.map(x=>x.snapshots[42]?.income)).size>1)income++;
   if(new Set(choices.map(x=>x.snapshots[42]?.netWorth)).size>1)assets++;
   if(choices.some(x=>x.p.arc.eventCount>=5))chains++;
  }
 }
 assert.ok(eligible>300);
 assert.ok(career/eligible>.35,'career choices have negligible impact');
 assert.ok(education/eligible>.35,'education choices have negligible impact');
 assert.ok(income/eligible>.55,'choices do not affect incomes decades later');
 assert.ok(assets/eligible>.55,'choices do not affect assets decades later');
 assert.ok(chains/eligible>.75,'conditional events rarely run');
});
test('family, network, enterprise and job-loss pathways have conditional consequences',()=>{
 const seed=14355;const p=new Sim.Life(seed);
 W4.ensure(p);
 p.age=29;p.year=2026+29;p.pending=29;
 p.arc.business=true;
 assert.match(p.getChoice().title,/사업/);
 assert.equal(p.choose(0),true);
 assert.ok(p.arc.careerRisk>0);
 assert.ok(p.arc.decisions.some(d=>d.age===29));
 p.age=42;p.year=2026+42;p.pending=42;
 p.profile.child=true;
 assert.match(p.getChoice().title,/가족/);
 assert.equal(p.choose(2),true);
 assert.ok(p.arc.network>=4);
 assert.ok(p.arc.community>=3);
});
test('save/restore retains branching history and deterministic continuation',()=>{
 for(const country of ['인도','대한민국','나이지리아']){
  const life=new Sim.Life(913671);life.country=Sim.COUNTRIES.find(x=>x[0]===country);
  W4.ensure(life);
  while(life.age<42&&life.alive){
   if(life.pending)life.choose(life.age===20?2:1);
   else life.tick();
  }
  assert.ok(life.alive);
  const data=JSON.parse(JSON.stringify(life.snapshot()));
  const copy=Sim.Life.restore(data);
  assert.deepEqual(copy.snapshot(),data);
  if(life.pending){life.choose(1);copy.choose(1);}
  for(let i=0;i<11;i++){
   if(life.pending){life.choose(1);copy.choose(1);}
   else{life.tick();copy.tick();}
   assert.deepEqual(copy.snapshot(),life.snapshot());
  }
 }
});

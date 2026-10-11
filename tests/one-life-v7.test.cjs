'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path'),fs=require('node:fs');
const root=path.join(__dirname,'../games/high_one_life');
const Sim=require(path.join(root,'engine.js'));
global.window={OneLifeSim:Sim};
const W2=require(path.join(root,'world-v2.js'));global.window.OneLifeWorld2=W2;
const W3=require(path.join(root,'world-v3.js'));global.window.OneLifeWorld3=W3;
const W4=require(path.join(root,'world-v4.js'));global.window.OneLifeWorld4=W4;
const W5=require(path.join(root,'world-v5.js'));global.window.OneLifeWorld5=W5;
const Careers=require(path.join(root,'careers-v6.js'));global.window.OneLifeCareers6=Careers;
const Events=require(path.join(root,'events-v6.js'));global.window.OneLifeEvents6=Events;
const W6=require(path.join(root,'world-v6.js'));global.window.OneLifeWorld6=W6;
const W7=require(path.join(root,'world-v7.js'));delete global.window;
function birth(seed,country='대한민국',family){
 const life=new Sim.Life(seed>>>0),ct=Sim.COUNTRIES.find(x=>x[0]===country);
 assert.ok(ct,'Country supported: '+country);life.country=ct;
 if(family)life.familyLevel=family;
 W7.ensure(life);return life;
}
function toAge(life,target,choiceIndex=1){
 let steps=0;
 while(life.alive&&life.age<target&&steps<111){
  if(life.pending){const c=life.getChoice();assert.ok(c);assert.equal(life.choose(life.age===16||life.age===20?choiceIndex:1),true);}
  else{life.tick();steps++;}
 }
 return life;
}
test('v7 integrated with all existing branches and fast single-speed game',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),game=fs.readFileSync(path.join(root,'game.js'),'utf8');
 assert.match(html,/world-v7\.js\?v=\d+/);
 assert.match(html,/traitAptitude/);assert.match(html,/traitQualification/);
 assert.match(game,/YEAR_MS = 260/);
 assert.equal(W7.SKILLS.length,5);
 const l=birth(927181);
 assert.equal(l.world7.version,7);assert.ok(l.world7.familyPercentile>0);
 assert.ok(l.world7.talents.logic>=22&&l.world7.talents.logic<=95);
});
test('household resources differ inside the same national category and remain stable',()=>{
 const values=new Set(),sums={};
 for(const family of ['빠듯한 형편','평범한 형편','여유 있는 형편']){
  const nums=[];
  for(let i=1;i<=100;i++){
   const p=birth(Math.imul(i+50,2654435761)>>>0,'인도',family);
   values.add(p.profile.familyIncome);
   nums.push(p.profile.familyIncome);
  }
  sums[family]=nums.reduce((a,b)=>a+b,0)/nums.length;
 }
 assert.ok(values.size>220,'income remains fixed to three tier multipliers');
 assert.ok(sums['여유 있는 형편']>sums['평범한 형편']);
 assert.ok(sums['평범한 형편']>sums['빠듯한 형편']);
 const p=birth(241912,'미국'),s=p.snapshot();
 assert.equal(Sim.Life.restore(JSON.parse(JSON.stringify(s))).snapshot().profile.familyIncome,s.profile.familyIncome);
});
test('formal schooling and informal study remain separate',()=>{
 const p=birth(882211,'인도');
 toAge(p,16,2);
 assert.ok(p.world7.formalYears<=11);
 assert.ok(p.world7.informalLearning>=0);
 if(p.world7.formalYears<6)assert.notEqual(p.world.educationLevel,'중등 과정 이수');
});
test('higher knowledge creates more university access without guaranteeing admissions',()=>{
 const countries=['대한민국','인도','나이지리아','미국'];
 for(const country of countries){
  let pairs=0,low=0,high=0,changed=0;
  for(let i=1;i<=180;i++){
   const seed=Math.imul(i+104,2654435761)>>>0;
   const a=birth(seed,country),b=birth(seed,country);
   // Hold birth and subsequent choices constant. Only the school-age learning
   // score differs; we are checking causal sensitivity, not real rates.
   for(const [p,k] of [[a,10],[b,95]]){
    let years=0;
    while(p.alive&&p.age<21&&years<35){
     if(p.pending){if(p.age===16)p.stats.knowledge=k;
      p.choose(p.age===16||p.age===20?0:1);
     }else{p.tick();years++;}
    }
   }
   if(!a.alive||!b.alive||a.age<20||b.age<20)continue;
   pairs++;
   const x=a.world7.studyPath==='university',y=b.world7.studyPath==='university';
   low+=x;high+=y;changed+=(x!==y);
  }
  assert.ok(pairs>=160,country+' insufficient sample');
  assert.ok(high>low+20,country+' knowledge has no material effect on education');
  assert.ok(low>0&&high<pairs,country+' probability became an absolute outcome');
  assert.ok(changed>20,country+' no divergent adult route');
 }
});
test('professional licensing never appears as an unearned lifetime career',()=>{
 for(let i=1;i<=1600;i++){
  const p=birth(Math.imul(i+67,2654435761)>>>0,['대한민국','인도','나이지리아','미국'][i%4]);
  toAge(p,109,i%3);
  assert.equal(p.alive,false);
  for(const h of p.world6.history){
   if(W7.LICENSE[h.job])assert.ok(p.world7.qualification.includes(W7.LICENSE[h.job]),h.job+' without license');
   if(W7.DEGREE[h.job])assert.ok(p.world7.degree&&p.world7.major===W7.DEGREE[h.job],h.job+' without degree');
  }
  assert.ok(Number.isFinite(p.money.netWorth));
  assert.ok(p.money.expense>=0);
 }
});
test('same life restored halfway follows the same outcomes without repeating income mutations',()=>{
 const p=birth(9182729,'대한민국','여유 있는 형편');toAge(p,42,0);
 if(!p.alive)return;assert.ok(p.age===42);
 if(p.pending)p.choose(1);
 const data=JSON.parse(JSON.stringify(p.snapshot())),q=Sim.Life.restore(data);
 assert.deepEqual(q.snapshot(),data);
 for(let i=0;i<42&&p.alive;i++){
  if(p.pending){p.choose(1);q.choose(1);}
  else{p.tick();q.tick();}
  assert.deepEqual(q.snapshot(),p.snapshot());
 }
});
test('credentials alter eligible jobs within each of twelve career families',()=>{
 const p=birth(481191,'대한민국');
 const teacher=Careers.tracks.education.jobs.find(x=>x==='특수교육 교사');
 assert.equal(W7.allowed(p,teacher),false);
 const substitute=W7.resolveCareer(p,'education',teacher);
 assert.ok(substitute!==teacher);
 p.world7.qualification.push('teaching');
 assert.equal(W7.allowed(p,teacher),true);
 const pharmacist=Careers.tracks.health.jobs.find(x=>x==='약사');
 assert.equal(W7.allowed(p,pharmacist),false);
 p.world7.qualification.push('pharmacy');
 assert.equal(W7.allowed(p,pharmacist),true);
});

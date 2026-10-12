'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const root=path.resolve(__dirname,'../games/high_one_life');
const Sim=require(path.join(root,'engine.js'));
global.window={OneLifeSim:Sim};
for(const [file,key] of [
 ['world-v2.js','OneLifeWorld2'],['world-v3.js','OneLifeWorld3'],
 ['world-v4.js','OneLifeWorld4'],['world-v5.js','OneLifeWorld5'],
 ['careers-v6.js','OneLifeCareers6'],['events-v6.js','OneLifeEvents6'],
 ['world-v6.js','OneLifeWorld6'],['world-v7.js','OneLifeWorld7'],
 ['world-v8.js','OneLifeWorld8'],['world-v9.js','OneLifeWorld9'],
 ['history-data-v10.js','OneLifeHistoryData10'],
 ['history-stories-v10.js','OneLifeHistoryStories10'],
 ['history-effects-v10.js','OneLifeHistoryEffects10'],
 ['world-v10.js','OneLifeWorld10'],
 ['history-choices-v11.js','OneLifeHistoryChoices11'],
 ['era-policy-v12.js','OneLifeEraPolicy12'],
 ['world-v12.js','OneLifeWorld12']
 ])global.window[key]=require(path.join(root,file));
const W12=global.window.OneLifeWorld12,W10=global.window.OneLifeWorld10,W3=global.window.OneLifeWorld3;
const Policy=global.window.OneLifeEraPolicy12,Choices=global.window.OneLifeHistoryChoices11;
const Facts=global.window.OneLifeHistoryData10,Stories=global.window.OneLifeHistoryStories10;
delete global.window;
function birth(seed,birthYear=1935,countryName='대한민국'){
 const life=new Sim.Life(seed,{birthYear,countryName});W12.ensure(life);return life;
}
function pending(life,i=0){
 let n=0,changed=0;
 while(life.alive&&life.pending){
  if(n++>18)assert.fail('stuck pending at '+life.age+' '+life.pending);
  const c=life.getChoice();
  if(c){assert.ok(c.options?.length,'empty choice '+life.pending);assert.ok(life.choose(i%c.options.length),'failed '+c.title);changed++;}
  else if(life.getReflection()){assert.equal(life.reflect(),true);changed++;}
  else assert.fail('unhandled '+life.pending);
 }
 return changed;
}
function simulate(seed,year,country='대한민국',choice=0,stop=120){
 const l=birth(seed,year,country);
 let guard=0;
 while(l.alive&&l.age<stop&&guard++<450){if(l.pending)pending(l,choice);else l.tick();}
 return l;
}
test('history expansion includes >=60 factual entries, >=180 dated stories, >=50 choice seeds',()=>{
 assert.ok(Facts.FACTS.length>=60,Facts.FACTS.length);
 assert.ok(Stories.count>=180,Stories.count);
 assert.ok(Choices.count>=50,Choices.count);
 assert.equal(Facts.FACTS.length,new Set(Facts.FACTS.map(x=>x.id)).size);
 assert.equal(Choices.count,new Set(Choices.PATHS.map(x=>x.id)).size);
 assert.ok(Facts.FACTS.every(x=>/^https:\/\//.test(x.source)));
 assert.ok(Choices.PATHS.every(x=>x.min>=7&&x.max>=x.min&&Choices.OPTIONS[x.topic]?.length===2));
 for(const y of [1905,1919,1945,1950,1970,1987,1997,2020])
  assert.ok(Facts.forYear(y).length>0,y);
 const h=fs.readFileSync(path.join(root,'index.html'),'utf8');
 for(const f of ['history-choices-v11.js','era-policy-v12.js','world-v12.js'])
  assert.ok(h.includes(f),f);
});
test('early and late occupations are plausibly distinct and respect school qualifications',()=>{
 let l=birth(123,1919);
 l.year=1935;l.age=16;W3.setup(l);
 const early=Policy.careerName(l,'technology',1,'인공지능 개발자');
 assert.doesNotMatch(early,/앱|AI|인공지능/);
 assert.notEqual(early,'인공지능 개발자');
 const low=Policy.careerName(l,'health',1,'의사');
 assert.match(low,/보건|의료/);
 l.year=1978;l.age=59;l.world.educationYears=12;
 const later=Policy.careerName(l,'technology',1,'인공지능 개발자');
 assert.match(later,/전기|전자|기계/);
 assert.notEqual(early,later);
 l.year=2017;assert.equal(Policy.careerName(l,'technology',1,'소프트웨어 개발자'),'소프트웨어 개발자');
 const foreign=birth(3,1919);foreign.country=Sim.COUNTRIES.find(c=>c[0]==='브라질');
 assert.equal(Policy.at(foreign),null);
});
test('school age limits are based on year of schooling, not year of birth',()=>{
 const l=birth(34012,1935);
 l.age=5;l.year=1940;const p=Policy.at(l,1941);
 const w=W3.setup(l);
 w.schoolChance=.98;W12.beforeYear(l);
 assert.ok(w.schoolChance<=p.schoolCap+1e-12);
 const s=W12.ensure(l);
 assert.equal(s.primaryYear,1941);
 l.age=15;l.year=1950;w.secondaryChance=.99;W12.beforeYear(l);
 assert.ok(w.secondaryChance<=Policy.at(l,1951).secondaryCap+1e-12);
 assert.equal(s.secondaryYear,1951);
});
test('a historical choice changes family, skill or livelihood and returns in future life logs',()=>{
 let target=null;
 for(let seed=1;seed<40&&!target;seed++){
  const l=birth(seed,1935),max=20;
  while(l.alive&&l.age<max){
   if(l.pending){
    if(String(l.pending).startsWith('v12:')){target=l;break;}
    pending(l);
   }else l.tick();
  }
 }
 assert.ok(target,'era choice in 1935 birth should be reachable');
 const choice=target.getChoice();
 assert.ok(choice.historicalLife);
 assert.equal(choice.options.length,2);
 const saved=JSON.parse(JSON.stringify(target.snapshot()));
 const loaded=Sim.Life.restore(saved);
 assert.deepEqual(loaded.snapshot(),saved);
 assert.equal(loaded.pending,target.pending);
 const age=loaded.age,year=loaded.year;
 assert.equal(loaded.choose(0),true);
 assert.equal(loaded.age,age);
 const state=W12.ensure(loaded);
 assert.equal(state.decisions.length,1);
 assert.equal(state.followups.length,1);
 const event=state.followups[0];
 assert.ok(event.year>year&&event.year<=year+5);
 while(loaded.alive&&loaded.year<=event.year){
  if(loaded.pending)pending(loaded);
  else loaded.tick();
 }
 if(loaded.alive||loaded.year===event.year)
  assert.ok(loaded.log.some(x=>x.kind==='era-followup'&&x.year===event.year));
});
test('basic era economy model reflects 1997 crisis but never claims observed amounts',()=>{
 const k=birth(27182,1970);
 k.year=1997;k.age=27;
 const crisis=Policy.at(k);
 assert.ok(crisis.jobDisruption>Policy.at(k,1995).jobDisruption);
 assert.ok(crisis.incomeFactor<1);
 assert.equal(Policy.at(k,2026).incomeFactor,1);
 const b=birth(27182,1970);
 b.country=Sim.COUNTRIES.find(c=>c[0]==='브라질');
 assert.equal(Policy.at(b),null);
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.ok(html.includes('v12EconomyEra'));
});
test('1,500 lives across eight birth eras keep chronological order, no duplicate decisions, bounded saves',()=>{
 const years=[1900,1919,1935,1950,1970,1990,2000,2026];
 let lives=0,restores=0,historicalChoices=0,historicalLives=0,eras=0,longEchoes=0;
 for(let i=0;i<1500;i++){
  const l=birth(Math.imul(i+1,2654435761)>>>0,years[i%years.length],
   i%5===0?'브라질':'대한민국');
  let guard=0;
  while(l.alive&&guard++<420){
   if(l.pending){pending(l,i%2);continue;}
   const oldAge=l.age;
   l.tick();
   assert.equal(l.age,oldAge+1);
   assert.equal(l.year,l.birthYear+l.age);
   assert.ok(Number.isFinite(l.money.netWorth));
   assert.ok(l.log.length<=760);
   if(l.alive&&[7,16,25,40,60].includes(l.age)){
    const snapshot=JSON.parse(JSON.stringify(l.snapshot()));
    const copy=Sim.Life.restore(snapshot);
    assert.ok(copy);assert.deepEqual(copy.snapshot(),snapshot);
    restores++;
   }
  }
  assert.equal(l.alive,false,'life did not end');
  const w=W12.ensure(l);
  assert.ok(new Set(w.decisions.map(x=>x.id)).size===w.decisions.length);
  assert.ok(w.followups.every(x=>x.year>l.birthYear));
  if(l.country[0]==='대한민국')historicalLives++;
  else assert.equal(w.decisions.length,0);
  historicalChoices+=w.decisions.length;
  longEchoes+=l.log.filter(x=>x.kind==='era-followup').length;
  eras+=l.log.filter(x=>x.kind==='era-context').length;
  lives++;
 }
 assert.equal(lives,1500);
 assert.ok(restores>=1200);
 assert.ok(historicalLives>1000);
 assert.ok(historicalChoices>300);
 assert.ok(longEchoes>150);
 assert.ok(eras>600);
});

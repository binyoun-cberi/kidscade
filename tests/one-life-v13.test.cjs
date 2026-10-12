'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../games/high_one_life');
const Sim=require(path.join(root,'engine.js'));
global.window={OneLifeSim:Sim};
for(const [file,name] of [
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
 ['world-v12.js','OneLifeWorld12'],
 ['world-v13.js','OneLifeWorld13']
])global.window[name]=require(path.join(root,file));
const W9=global.window.OneLifeWorld9,W10=global.window.OneLifeWorld10,
 W12=global.window.OneLifeWorld12,W13=global.window.OneLifeWorld13;
delete global.window;
function birth(seed,year=1935,countryName='대한민국'){
 const l=new Sim.Life(seed,{birthYear:year,countryName});W13.state(l);return l;
}
function resolve(l,select=()=>0){
 let guard=0;
 while(l.alive&&l.pending){
  assert.ok(guard++<26,'stuck pending '+l.pending);
  const c=l.getChoice();
  if(c){const n=select(c,l);assert.ok(Number.isInteger(n)&&n>=0&&n<c.options.length);assert.equal(l.choose(n),true,'choice failed '+c.title);}
  else if(l.getReflection())assert.equal(l.reflect(),true);
  else assert.fail('unknown pending '+l.pending);
 }
}
function play(l,age,select=()=>0){
 let guard=0;
 while(l.alive&&l.age<age&&guard++<360){
  if(l.pending)resolve(l,select);else l.tick();
 }
 if(l.alive)resolve(l,select);
 return l;
}
test('v13 is loaded last, family health panels available, and old saves upgrade non-destructively',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.ok(html.indexOf('world-v12.js')<html.indexOf('world-v13.js'));
 assert.ok(html.indexOf('world-v13.js')<html.indexOf('game.js'));
 for(const id of ['v13CareYears','v13FamilyStatus','v13LifeMemories'])assert.ok(html.includes('id="'+id+'"'));
 const l=birth(981,1970);
 const old=l.snapshot();delete old.world13;
 const restored=Sim.Life.restore(JSON.parse(JSON.stringify(old)));
 assert.ok(restored);
 assert.equal(W13.state(restored).decisions.length,0);
 assert.equal(W13.summary(restored).careYears,0);
});
test('a named elderly living family member receives care and relationship/cost consequences persist through save',()=>{
 let selected=null;
 for(let seed=1;seed<=180&&!selected;seed++){
  const l=birth(seed,1970);
  l.age=40;l.year=2010;
  W9.syncPeople(l);W13.events(l,W13.state(l));
  const c=l.getChoice();
  if(c?.familyCare&&W13.state(l).active?.kind==='care')selected=l;
 }
 assert.ok(selected,'must offer care to a living named elder');
 const before=W13.state(selected).active;
 const parent=W9.ensure(selected).people.find(x=>x.id===before.personId);
 assert.ok(parent.alive);
 const rel=parent.relation,money=selected.money.netWorth;
 assert.equal(selected.choose(0),true);
 const s=W13.state(selected);
 assert.ok(s.decisions.some(d=>d.kind==='care'&&d.personId===parent.id));
 assert.ok(s.episodes.some(e=>e.kind==='care'&&e.personId===parent.id));
 assert.ok(parent.relation>rel);
 assert.equal(selected.money.netWorth,money);
 const saved=JSON.parse(JSON.stringify(selected.snapshot()));
 const resumed=Sim.Life.restore(saved);
 assert.deepEqual(resumed.snapshot(),saved);
 assert.equal(W13.summary(resumed).caringFor.includes(parent.name),true);
 W13.afterYear(Object.assign(resumed,{year:2011,age:41}));
 assert.ok(W13.state(resumed).carePoints>0);
 assert.ok(resumed.money.netWorth<money+1e5);
 const dead=W9.ensure(resumed).people.find(x=>x.id===parent.id);
 dead.alive=false;dead.deadYear=2012;
 resumed.year=2012;resumed.age=42;
 W13.afterYear(resumed);
 assert.equal(W13.summary(resumed).caringFor.includes(parent.name),false);
});
test('childhood/family milestones use actual named child birth years, do not force an imaginary child',()=>{
 const without=birth(12,1980);
 without.age=35;without.year=2015;W13.events(without,W13.state(without));
 assert.equal(without.log.some(e=>e.kind==='family13'&&/세가 되어/.test(e.text)&&/자녀/.test(e.text)),false);
 const l=birth(12,1980);
 l.age=37;l.year=2017;l.profile.child=true;W9.syncPeople(l);
 const child=W9.ensure(l).people.find(x=>x.role==='자녀');
 assert.ok(child&&child.birthYear===2017);
 for(const age of [3,9,16]){
  l.age=37+age;l.year=2017+age;l.pending=null;
  W13.events(l,W13.state(l));
 }
 assert.ok(l.log.some(x=>x.kind==='family13'&&x.text.includes(child.name)&&x.text.includes('3세')));
 assert.ok(l.log.some(x=>x.kind==='family13'&&x.text.includes(child.name)&&x.text.includes('9세')));
 assert.ok(l.log.some(x=>x.kind==='family13'&&x.text.includes(child.name)&&x.text.includes('16세')));
 assert.ok(W13.state(l).memories.some(x=>x.includes(child.name)));
});
test('a historical childhood disruption yields later individual education choice, not automatic political participation',()=>{
 let found=null;
 for(let seed=1;seed<60&&!found;seed++){
  const l=birth(seed,1935),h=W10.ensure(l);
  h.tags.push('학업 중단');
  l.age=28;l.year=1963;
  W13.events(l,W13.state(l));
  if(W13.state(l).active?.kind==='education')found=l;
 }
 assert.ok(found);
 const knowledge=found.stats.knowledge,year=found.year;
 const choice=found.getChoice();assert.ok(choice.familyCare);
 assert.equal(found.choose(0),true);
 assert.equal(found.year,year);
 assert.ok(found.stats.knowledge>knowledge);
 assert.ok(W13.state(found).followups.some(x=>x.year===year+4));
 assert.ok(found.log.every(e=>e.kind!=='care13-choice'||!e.text.includes('직접 독립운동')));
});
test('an existing v9/v10/v12 pending choice is not overwritten by new family decisions',()=>{
 for(let seed=1;seed<30;seed++){
  const l=birth(seed,1935);
  let guard=0;
  while(l.alive&&l.age<45&&guard++<220){
   if(l.pending){const before=l.pending;W13.afterYear(l);assert.equal(l.pending,before);resolve(l);}
   else l.tick();
  }
  const seen=W13.state(l).decisions;
  assert.equal(new Set(seen.map(x=>x.id)).size,seen.length);
 }
});
test('v13 choice is restored exactly while pending, with no repeated care charge on choosing',()=>{
 let target=null;
 for(let seed=1;seed<=70&&!target;seed++){
  const l=birth(seed,1970);
  play(l,45,()=>0);
  if(l.alive){
   for(let age=45;age<=80&&l.alive&&!target;age++){
    if(l.pending&&String(l.pending).startsWith('v13:'))target=l;
    else if(l.pending)resolve(l);
    else l.tick();
   }
  }
 }
 if(!target){
  const l=birth(7,1970);l.age=40;l.year=2010;W13.events(l,W13.state(l));
  if(l.pending?.startsWith('v13:'))target=l;
 }
 assert.ok(target);
 const saved=JSON.parse(JSON.stringify(target.snapshot()));
 const restored=Sim.Life.restore(saved);
 assert.deepEqual(restored.snapshot(),saved);
 assert.equal(restored.pending,target.pending);
 assert.ok(restored.getChoice()?.familyCare);
 assert.equal(restored.choose(0),true);
 assert.equal(restored.pending,null);
 assert.ok(W13.state(restored).decisions.length>0);
});
test('1,200 whole lives preserve chronology, finite finance, bounded care and followup integrity',()=>{
 const years=[1900,1919,1935,1950,1970,1990,2020,2026];
 let lives=0,restores=0,care=0,choices=0,echoes=0,individualHealth=0;
 for(let i=0;i<1200;i++){
  const l=birth(Math.imul(i+1,2654435761)>>>0,years[i%years.length],i%6===0?'브라질':'대한민국');
  let guard=0;
  while(l.alive&&guard++<400){
   if(l.pending){resolve(l,()=>i%2);continue;}
   const previous=l.age;l.tick();
   assert.equal(l.age,previous+1);
   assert.equal(l.year,l.birthYear+l.age);
   assert.ok(Number.isFinite(l.money.netWorth));
   assert.ok(l.log.length<=760);
   if(l.alive&&i%5===0&&[15,35,55].includes(l.age)){
    const snap=JSON.parse(JSON.stringify(l.snapshot()));
    const clone=Sim.Life.restore(snap);
    assert.deepEqual(clone.snapshot(),snap);
    restores++;
   }
  }
  assert.equal(l.alive,false);
  const s=W13.state(l),people=W9.ensure(l).people;
  assert.ok(new Set(s.decisions.map(x=>x.id)).size===s.decisions.length);
  assert.ok(s.episodes.length<=24&&s.followups.length<=18&&s.memories.length<=70);
  assert.ok(people.every(p=>p.deadYear===null||p.deadYear>=p.birthYear));
  care+=s.careYears;choices+=s.decisions.length;echoes+=s.totalFollowups;
  individualHealth+=s.decisions.filter(d=>d.kind==='wellness').length;
  lives++;
 }
 assert.equal(lives,1200);
 assert.ok(restores>300);
 assert.ok(choices>400,choices);
 assert.ok(care>100,care);
 assert.ok(echoes>250,echoes);
 assert.ok(individualHealth>100,individualHealth);
});

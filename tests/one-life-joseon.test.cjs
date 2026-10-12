'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=path.resolve(__dirname,'../games/high_one_life'),Sim=require(path.join(base,'engine.js'));
global.window={OneLifeSim:Sim};
for(const [file,name] of [
 ['world-v2.js','OneLifeWorld2'],['world-v3.js','OneLifeWorld3'],['world-v4.js','OneLifeWorld4'],
 ['world-v5.js','OneLifeWorld5'],['careers-v6.js','OneLifeCareers6'],['events-v6.js','OneLifeEvents6'],
 ['world-v6.js','OneLifeWorld6'],['world-v7.js','OneLifeWorld7'],['world-v8.js','OneLifeWorld8'],
 ['world-v9.js','OneLifeWorld9'],['history-data-v10.js','OneLifeHistoryData10'],
 ['history-stories-v10.js','OneLifeHistoryStories10'],['history-effects-v10.js','OneLifeHistoryEffects10'],
 ['world-v10.js','OneLifeWorld10'],['history-choices-v11.js','OneLifeHistoryChoices11'],
 ['era-policy-v12.js','OneLifeEraPolicy12'],['world-v12.js','OneLifeWorld12'],
 ['world-v13.js','OneLifeWorld13'],['joseon-v14.js','OneLifeJoseon']])
 global.window[name]=require(path.join(base,file));
const J=global.window.OneLifeJoseon,W9=global.window.OneLifeWorld9;delete global.window;
function born(seed,year){const l=new Sim.Life(seed,{birthYear:year,countryName:'대한민국'});J.ensure(l);return l;}
function settle(l,choice=0){
 let guard=0;
 while(l.alive&&l.pending){
  assert.ok(guard++<20,'infinite prompt '+l.pending);
  const c=l.getChoice();
  if(c){assert.equal(l.choose(choice%c.options.length),true,'choice failed: '+c.title);continue;}
  if(l.getReflection()){assert.equal(l.reflect(),true);continue;}
  assert.fail('unknown pending '+l.pending);
 }
}
function play(l,maxAge=104){
 let g=0;while(l.alive&&l.age<maxAge&&g++<430){if(l.pending)settle(l,l.age%2);else{const old=l.age;assert.equal(l.tick(),true);assert.equal(l.age,old+1);}}
 assert.ok(g<430);
 return l;
}
test('Joseon spans 1392 to 1896 while original 1900+ world stays available',()=>{
 for(const year of [1392,1400,1435,1580,1620,1650,1780,1860,1896,1898]){
  const l=born(42,year);assert.equal(l.birthYear,year);assert.ok(J.is(l));assert.equal(l.country[0],'대한민국');assert.equal(l.year,year);
 }
 const modern=new Sim.Life(7,{birthYear:2026});assert.equal(J.is(modern),false);
 const old=new Sim.Life(7,{birthYear:1900,countryName:'대한민국'});assert.equal(J.is(old),false);
 const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
 assert.ok(html.includes('data-era-year="1435"')&&html.includes('data-era-year="1780"'));
 assert.ok(html.indexOf('world-v13.js')<html.indexOf('joseon-v14.js'));
 assert.ok(html.indexOf('joseon-v14.js')<html.indexOf('game.js'));
});
test('40+ factual events cover early Joseon, invasions, reform and empire boundary',()=>{
 assert.ok(J.FACTS.length>=40);
 for(const [year,title] of [[1392,'조선 건국'],[1446,'훈민정음 반포'],[1592,'임진왜란 발발'],
  [1636,'병자호란'],[1750,'균역법'],[1876,'강화도조약'],[1894,'갑오개혁'],
  [1897,'대한제국 선포'],[1910,'국권 피탈']]){
  assert.ok(J.FACTS.some(e=>e.year===year&&e.title.includes(title)),year);
 }
 assert.ok(J.FACTS.every(x=>/^https:\/\//.test(x.source)));
 assert.ok(new Set(J.FACTS.map(x=>x.year)).size===J.FACTS.length);
});
test('status and region vary without forcing everyone into privileged careers',()=>{
 const counts=new Set(),regions=new Set(),jobs=new Set();
 for(let seed=1;seed<240;seed++){
  const l=born(seed,1510),s=J.ensure(l);
  counts.add(s.origin);regions.add(s.home);jobs.add(s.occupation);
  assert.match(l.profile.name,/^[가-힣]{2,4}$/);
  assert.equal(l.familyLevel,s.originLabel);
  assert.ok(Number.isFinite(s.grain));
  assert.ok(l.log.some(x=>x.kind==='birth'&&x.year===1510));
 }
 assert.ok(counts.size>=5,counts.size);
 assert.ok(regions.size>=7,regions.size);
 assert.ok(jobs.size>=5,jobs.size);
});
test('the 1592 war choices change living location and reappear in adulthood',()=>{
 let found=false;
 for(let seed=1;seed<400&&!found;seed++){
  const l=born(seed,1578);
  let n=0;
  while(l.alive&&l.year<1592&&n++<70){if(l.pending)settle(l);else l.tick();}
  if(!l.alive||l.year!==1592)continue;
  assert.equal(l.pending?.startsWith('joseon:'),true);
  const s=J.ensure(l),old=s.home,c=l.getChoice();
  assert.ok(c.joseon&&c.options.length===3);
  assert.equal(l.choose(0),true);
  assert.ok(s.relocations>=1);
  assert.ok(s.followups.some(f=>f.year===1598));
  assert.ok(l.log.some(x=>x.kind==='history'&&x.year===1592));
  const snapshot=JSON.parse(JSON.stringify(l.snapshot())),clone=Sim.Life.restore(snapshot);
  assert.ok(clone);assert.deepEqual(clone.snapshot(),snapshot);
  assert.equal(clone.joseon.home,s.home);
  found=true;
 }
 assert.ok(found);
});
test('pending Joseon choices survive browser save and can be selected after restore',()=>{
 let found=false;
 for(let seed=1;seed<80&&!found;seed++){
  const l=born(seed,1435);while(l.alive&&l.age<16){if(l.pending){if(l.pending.startsWith('joseon:'))break;settle(l);}else l.tick();}
  if(!l.alive||!l.pending?.startsWith('joseon:'))continue;
  const snapshot=JSON.parse(JSON.stringify(l.snapshot()));
  const restored=Sim.Life.restore(snapshot);
  assert.ok(restored);assert.equal(restored.pending,l.pending);
  assert.deepEqual(restored.snapshot(),snapshot);
  assert.equal(restored.choose(0),true);
  assert.equal(restored.pending,null);
  assert.ok(restored.joseon.choices.length>=1);
  found=true;
 }
 assert.ok(found);
});
test('late Joseon birth crosses 1894 reforms, 1897 empire and 1910 colonial history without modern loans',()=>{
 let found=false;
 for(let seed=1;seed<400&&!found;seed++){
  const l=born(seed,1880);
  while(l.alive&&l.year<1911){if(l.pending)settle(l);else l.tick();}
  if(!l.alive)continue;
  for(const year of [1894,1897,1905,1910])assert.ok(l.log.some(x=>x.kind==='history'&&x.year===year),year);
  assert.equal(J.period(1880),'개항기 조선');
  assert.equal(J.period(1897),'대한제국');
  assert.equal(J.period(1910),'일제강점기');
  assert.ok(l.log.every(e=>!/주택담보대출|스마트폰|웹.?개발자|현대식 대출/.test(e.text)));
  found=true;
 }
 assert.ok(found);
});
test('age-bounded exam system and family choices are not modern employment',()=>{
 assert.ok(J.OPTIONS.exam.length===2);
 assert.ok(J.OPTIONS.war.length===3);
 for(const year of [1450,1550,1710]){
  const l=born(123,year);
  play(l,85);
  const s=J.ensure(l);
  assert.ok(s.choices.every(x=>x.year===year+x.age));
  assert.ok(s.choices.every(x=>x.age>=0&&x.age<=102));
  assert.ok(l.log.every(e=>!/주택담보대출|회사원|스마트폰|신용카드|컴퓨터 개발자/.test(e.text)));
 }
});
test('1,200 varied Joseon lifetimes have consistent years, finite provisions and multiple branches',()=>{
 const years=[1392,1435,1500,1560,1580,1620,1650,1700,1780,1860,1890,1898];
 let runs=0,choices=0,history=0,followups=0,restores=0;
 for(let i=0;i<1200;i++){
  const l=born((Math.imul(i+1,2654435761))>>>0,years[i%years.length]);
  let n=0;
  while(l.alive&&n++<440){
   if(l.pending){settle(l,i%2);continue;}
   const old=l.age;
   assert.equal(l.tick(),true);
   assert.equal(l.age,old+1);
   assert.equal(l.year,l.birthYear+l.age);
   assert.ok(Number.isFinite(l.money.netWorth));
   assert.ok(l.log.length<=760);
   if(l.alive&&i%10===0&&[15,35,55].includes(l.age)){
    const saved=JSON.parse(JSON.stringify(l.snapshot()));
    const copy=Sim.Life.restore(saved);assert.deepEqual(copy.snapshot(),saved);
    restores++;
   }
  }
  assert.ok(!l.alive,'end of life must be reached');
  const s=J.ensure(l);
  assert.ok(new Set(s.choices.map(x=>x.id)).size===s.choices.length);
  assert.ok(s.followups.every(x=>x.year>l.year));
  assert.ok(W9.ensure(l).people.every(p=>p.deadYear==null||p.deadYear>=p.birthYear));
  choices+=s.choices.length;
  history+=l.log.filter(x=>x.kind==='history').length;
  followups+=l.log.filter(x=>x.kind==='joseon-followup').length;
  runs++;
 }
 assert.equal(runs,1200);
 assert.ok(choices>=4500,choices);
 assert.ok(history>=300,history);
 assert.ok(followups>=600,followups);
 assert.ok(restores>100,restores);
});

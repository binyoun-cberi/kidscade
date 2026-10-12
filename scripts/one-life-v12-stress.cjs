'use strict';
/* Run: node scripts/one-life-v12-stress.cjs 10000
 * Deterministic stress of 1900–2026 births; fictional model, not demographics.
 */
const assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'../games/high_one_life');
const Sim=require(path.join(root,'engine.js'));global.window={OneLifeSim:Sim};
for(const [file,key] of [
 ['world-v2.js','OneLifeWorld2'],['world-v3.js','OneLifeWorld3'],
 ['world-v4.js','OneLifeWorld4'],['world-v5.js','OneLifeWorld5'],
 ['careers-v6.js','OneLifeCareers6'],['events-v6.js','OneLifeEvents6'],
 ['world-v6.js','OneLifeWorld6'],['world-v7.js','OneLifeWorld7'],
 ['world-v8.js','OneLifeWorld8'],['world-v9.js','OneLifeWorld9'],
 ['history-data-v10.js','OneLifeHistoryData10'],['history-stories-v10.js','OneLifeHistoryStories10'],
 ['history-effects-v10.js','OneLifeHistoryEffects10'],['world-v10.js','OneLifeWorld10'],
 ['history-choices-v11.js','OneLifeHistoryChoices11'],['era-policy-v12.js','OneLifeEraPolicy12'],
 ['world-v12.js','OneLifeWorld12']
])global.window[key]=require(path.join(root,file));
const W12=global.window.OneLifeWorld12,W9=global.window.OneLifeWorld9,W10=global.window.OneLifeWorld10,
 DATA=global.window.OneLifeHistoryData10;
delete global.window;
const total=Math.max(1,Math.min(10000,Number.parseInt(process.argv[2]||'10000',10)||10000));
const years=[1900,1910,1919,1929,1935,1945,1950,1960,1970,1987,1990,1997,2000,2010,2020,2026];
const result={requested:total,complete:0,restores:0,choices:0,historyDecisions:0,personalDecisions:0,
 echoes:0,historicalRecords:0,minRecords:Infinity,maxRecords:0,deadBefore50:0,byBirthYear:{}};
function resolve(life,i){
 let n=0;
 while(life.alive&&life.pending){
  assert.ok(n++<20,'pending does not clear');
  const item=life.getChoice();
  if(item){
   const opts=item.options||[];assert.ok(opts.length,'no options');
   const choice=(i+life.age+n)%opts.length;
   assert.equal(life.choose(choice),true,'choice failed '+life.pending);
   result.choices++;
  }else if(life.getReflection())assert.equal(life.reflect(),true);
  else assert.fail('unknown pending '+life.pending);
 }
}
const began=Date.now();
for(let i=0;i<total;i++){
 const birthYear=years[i%years.length];
 const country=i%7===0?'브라질':'대한민국';
 const life=new Sim.Life(Math.imul(i+1,2654435761)>>>0,{birthYear,
  countryName:country==='대한민국'?'대한민국':undefined});
 if(country!=='대한민국')life.country=Sim.COUNTRIES.find(x=>x[0]==='브라질');
 W12.ensure(life);
 let guard=0;
 while(life.alive&&guard++<430){
  if(life.pending){resolve(life,i);continue;}
  const age=life.age;
  life.tick();
  assert.equal(life.age,age+1);
  assert.equal(life.year,life.birthYear+life.age);
  assert.ok(Number.isFinite(life.money.netWorth));
  assert.ok(life.log.length<=760);
  if(life.alive&&i%25===0&&[10,25,42,60].includes(life.age)){
   const snapshot=JSON.parse(JSON.stringify(life.snapshot()));
   const cloned=Sim.Life.restore(snapshot);
   assert.ok(cloned);assert.deepEqual(cloned.snapshot(),snapshot);
   result.restores++;
  }
 }
 assert.equal(life.alive,false,'life did not conclude');
 const s=W12.ensure(life),h=W10.ensure(life),people=W9.ensure(life).people;
 assert.equal(new Set(s.decisions.map(x=>x.id)).size,s.decisions.length);
 assert.equal(new Set(people.map(x=>x.id)).size,people.length);
 assert.ok(people.every(p=>p.deadYear===null||p.deadYear>=p.birthYear));
 if(country!=='대한민국')assert.equal(h.factsSeen.length,0);
 result.historicalRecords+=life.log.filter(x=>x.kind==='history').length;
 result.historyDecisions+=h.decisions.length;
 result.personalDecisions+=s.decisions.length;
 result.echoes+=life.log.filter(x=>x.kind==='era-followup').length;
 result.minRecords=Math.min(result.minRecords,life.log.length);
 result.maxRecords=Math.max(result.maxRecords,life.log.length);
 if(life.age<50)result.deadBefore50++;
 const key=String(birthYear);
 const line=result.byBirthYear[key]||(result.byBirthYear[key]={lives:0,personalChoices:0,historicalFacts:0,followups:0});
 line.lives++;line.personalChoices+=s.decisions.length;
 line.historicalFacts+=h.factsSeen.length;
 line.followups+=life.log.filter(x=>x.kind==='era-followup').length;
 result.complete++;
 if((i+1)%2000===0)process.stdout.write('Stress progress '+(i+1)+'/'+total+'\n');
}
result.ms=Date.now()-began;
assert.equal(result.complete,total);
assert.ok(result.restores>0);
assert.ok(result.personalDecisions>total*.45,'too few personal decisions');
assert.ok(result.echoes>total*.25,'few lasting outcomes');
assert.ok(result.historicalRecords>total*2,'too few historical facts');
console.log(JSON.stringify(result,null,2));

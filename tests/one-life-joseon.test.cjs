'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=path.resolve(__dirname,'../games/high_one_life');
const Sim=require(path.join(base,'engine.js'));
global.window={OneLifeSim:Sim};
for(const [file,key] of [
 ['world-v2.js','OneLifeWorld2'],['world-v3.js','OneLifeWorld3'],
 ['world-v4.js','OneLifeWorld4'],['world-v5.js','OneLifeWorld5'],
 ['careers-v6.js','OneLifeCareers6'],['events-v6.js','OneLifeEvents6'],
 ['world-v6.js','OneLifeWorld6'],['world-v7.js','OneLifeWorld7'],
 ['world-v8.js','OneLifeWorld8'],['world-v9.js','OneLifeWorld9'],
 ['history-data-v10.js','OneLifeHistoryData10'],['history-stories-v10.js','OneLifeHistoryStories10'],
 ['history-effects-v10.js','OneLifeHistoryEffects10'],['world-v10.js','OneLifeWorld10'],
 ['history-choices-v11.js','OneLifeHistoryChoices11'],['era-policy-v12.js','OneLifeEraPolicy12'],
 ['world-v12.js','OneLifeWorld12'],['world-v13.js','OneLifeWorld13'],
 ['joseon-v1.js','OneLifeJoseon'],['joseon-v2.js','OneLifeJoseon2']
])global.window[key]=require(path.join(base,file));
const J=global.window.OneLifeJoseon, W8=global.window.OneLifeWorld8;
delete global.window;
function born(seed,year){
 const l=new Sim.Life(seed,{birthYear:year});
 W8.ensure(l);if(J.isJoseon(l))J.ensure(l);
 return l;
}
function resolve(l,index=0){
 let guard=0;
 while(l.alive&&l.pending&&guard++<30){
  const c=l.getChoice();
  if(c)assert.equal(l.choose(Math.min(index,c.options.length-1)),true);
  else if(l.getReflection())assert.equal(l.reflect(),true);
  else assert.fail('unknown pending: '+l.pending);
 }
 assert.ok(guard<30,'stuck decision');
}
function until(l,year,index=0){
 let guard=0;
 while(l.alive&&l.year<year&&guard++<165){
  if(l.pending)resolve(l,index);else l.tick();
 }
 return l;
}
test('1392 through 1897 births start on the Korean peninsula; modern births stay modern',()=>{
 for(const y of [1392,1450,1592,1636,1750,1876,1894,1897]){
  const l=born(y+713,y);
  assert.equal(l.birthYear,y);assert.equal(l.country[0],'대한민국');
  assert.ok(J.isJoseon(l));assert.ok(J.summary(l).region);
  assert.ok(['양반','중인','상민','천민'].includes(J.ensure(l).birthStatus));
 }
 for(const y of [1900,1919,2026]){
  const l=born(y+11,y);assert.equal(l.birthYear,y);assert.equal(J.isJoseon(l),false);
 }
 const invalid=born(100,1199);assert.equal(invalid.birthYear,2026);
});
test('age-specific Joseon education, livelihood and marriage choices change the household',()=>{
 const l=born(50231,1480);
 until(l,1488);assert.equal(l.age,8);
 const c=l.getChoice();assert.ok(c&&/글을 배울/.test(c.title));assert.equal(c.options.length,3);
 const before=J.ensure(l).studyYears;
 resolve(l,0);assert.ok(J.ensure(l).studyYears>before);
 until(l,1495);assert.equal(l.getChoice()?.title,'어떤 일로 살아갈까?');
 resolve(l,1);assert.equal(J.ensure(l).occupation,'장사·수공업');
 until(l,1499);assert.ok(/혼인/.test(l.getChoice()?.title||''));
 resolve(l,0);assert.equal(J.summary(l).married,true);
 assert.ok(l.log.some(e=>e.kind==='joseon-choice'));
 assert.equal(l.log.some(e=>/연금|사무직|대학교|컴퓨터/.test(e.text)),false);
});
test('war produces persistent household changes and a meaningful wartime choice',()=>{
 const l=born(5216,1590);until(l,1592);
 assert.equal(l.year,1592);assert.ok(l.log.some(e=>e.kind==='history'&&e.text.includes('임진왜란')));
 assert.ok(J.summary(l).warMemory.includes('임진왜란 발발'));
 assert.ok(J.ensure(l).hardshipUntil>1592);
 const adult=born(5236,1618);until(adult,1636);
 assert.ok(adult.alive&&adult.getChoice());
 assert.match(adult.getChoice().title,/병자호란/);
 const n=adult.getChoice().options.length;assert.equal(n,3);
 const oldMove=J.summary(adult).relocations;resolve(adult,0);
 assert.ok(J.summary(adult).relocations>oldMove);
 assert.ok(J.ensure(adult).followups.some(f=>f.year===1639));
});
test('the 1894 reform ends the legal caste system and years later use the modern engine',()=>{
 let l;
 for(let seed=1;seed<=100;seed++){
  const trial=born(seed,1880);until(trial,1894);
  if(trial.alive){l=trial;break;}
 }
 assert.ok(l,'at least one example survives to the 1894 reform');
 assert.ok(l.log.some(e=>e.text.includes('갑오개혁')));
 assert.match(J.summary(l).status,/법적 신분제 폐지/);
 until(l,1902);
 if(l.alive){assert.equal(l.year,1902);assert.equal(J.inOldEra(l),false);}
});
test('an unanswered Joseon choice persists after save, without duplicating birth entries',()=>{
 const l=born(987654,1580);until(l,1588);
 assert.equal(l.age,8);assert.ok(l.pending?.startsWith('joseon:'));
 const snap=JSON.parse(JSON.stringify(l.snapshot()));
 const restored=Sim.Life.restore(snap);
 assert.ok(restored);assert.equal(restored.year,l.year);
 assert.equal(restored.pending,l.pending);
 assert.deepEqual(restored.getChoice(),l.getChoice());
 assert.equal(restored.log.filter(e=>e.kind==='joseon-birth').length,1);
 assert.equal(restored.choose(0),true);
 assert.ok(restored.joseon.decisions.some(d=>d.age===8));
 assert.equal(Sim.Life.restore(JSON.parse(JSON.stringify(restored.snapshot()))).joseon.decisions.length,1);
});
test('the browser entry loads the Joseon rules after modern modules and before the controller',()=>{
 const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
 assert.match(html,/min="1200" max="2026"/);
 assert.ok(html.indexOf('world-v13.js')<html.indexOf('joseon-v1.js'));
 assert.ok(html.indexOf('joseon-v1.js')<html.indexOf('joseon-v2.js'));
 assert.ok(html.indexOf('joseon-v2.js')<html.indexOf('game.js'));
 const game=fs.readFileSync(path.join(base,'game.js'),'utf8');
 assert.match(game,/Joseon\.inOldEra/);assert.match(game,/Joseon\.eventFor/);
});

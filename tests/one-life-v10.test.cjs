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
 ['world-v10.js','OneLifeWorld10']])
 global.window[name]=require(path.join(root,file));
const W9=global.window.OneLifeWorld9,W10=global.window.OneLifeWorld10,
 Data=global.window.OneLifeHistoryData10,Stories=global.window.OneLifeHistoryStories10,
 History=require(path.join(root,'history.js'));
delete global.window;
function newLife(seed,year=1935,countryName='대한민국'){
 const life=new Sim.Life(seed,{birthYear:year,countryName});
 W10.ensure(life);
 return life;
}
function resolve(life,choiceFor=()=>0){
 let guard=0;
 while(life.alive&&life.pending){
  assert.ok(guard++<20,'unending in-year pending');
  if(life.getChoice()){
   const choice=life.getChoice(),index=choiceFor(choice,life);
   assert.ok(index>=0&&index<choice.options.length,'invalid choice index '+choice.title);
   assert.equal(life.choose(index),true,'unable to choose '+choice.title);
  }else if(life.getReflection())assert.equal(life.reflect(),true);
  else assert.fail('unrecognized pending '+life.pending);
 }
}
function reach(life,year,choose=()=>0){
 let n=0;
 while(life.alive&&life.year<year&&n++<170){
  if(life.pending){resolve(life,choose);continue;}
  const old=life.age;life.tick();assert.equal(life.age,old+1);
  History.contextualize(life);
 }
 if(life.alive)resolve(life,choose);
 return life;
}
test('v10 historical source catalogue is unique, dated, and separate from fiction',()=>{
 assert.ok(Data.FACTS.length>=45);
 assert.ok(Stories.count>=85);
 assert.ok(new Set(Data.FACTS.map(e=>e.id)).size===Data.FACTS.length);
 assert.ok(Data.FACTS.every(e=>/^https:\/\//.test(e.source)&&e.year>=1900&&e.year<=2026));
 for(const [year,topic] of [[1919,'3·1운동'],[1945,'광복'],[1950,'한국전쟁'],[1953,'정전협정'],
   [1987,'6월 민주항쟁'],[1997,'IMF'],[2020,'코로나19']])
  assert.ok(Data.forYear(year).some(e=>e.title.includes(topic)),year+' '+topic);
 assert.equal(Data.legalFor(1942,'mortgage'),false);
 assert.equal(Data.legalFor(2002,'smartphone'),false);
 assert.equal(Data.legalFor(2020,'mortgage'),true);
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.match(html,/history-data-v10\.js\?v=\d+/);
 assert.ok(html.indexOf('world-v9.js')<html.indexOf('world-v10.js'));
 assert.ok(html.indexOf('world-v10.js')<html.indexOf('game.js'));
});
test('1935 birth faces war-time household decision, resettlement and interrupted schooling',()=>{
 let seen=false;
 for(let seed=5;seed<150&&!seen;seed++){
  const l=newLife(seed,1935);
  while(l.alive&&l.year<1950){
   if(l.pending){resolve(l);continue;}
   l.tick();History.contextualize(l);
  }
  if(!l.alive||l.year!==1950)continue;
  resolve(l);
  const s=W10.ensure(l);
  assert.ok(s.factsSeen.some(id=>Data.FACTS.find(f=>f.id===id)?.title==='한국전쟁 발발'));
  assert.equal(l.log.filter(e=>e.kind==='history'&&e.year===1950).length,Data.forYear(1950).length);
  assert.ok(s.tags.includes('한국전쟁 시기'));
  assert.equal(s.schoolInterrupted,true);
  assert.ok(s.moves>=1);
  assert.ok(s.followups.some(x=>x.kind==='war-after'));
  assert.ok(l.log.some(e=>e.kind==='history-choice'&&e.year===1950));
  const snapshot=JSON.parse(JSON.stringify(l.snapshot()));
  assert.deepEqual(Sim.Life.restore(snapshot).snapshot(),snapshot);
  seen=true;
 }
 assert.equal(seen,true,'a 1935-born person should survive through 1950 in at least one seed');
});
test('war-time choice resumes schooling after 1953 when the player elects to study again',()=>{
 let success=false;
 for(let seed=1;seed<180&&!success;seed++){
  const l=newLife(seed,1935);
  reach(l,1953,()=>0);
  if(!l.alive||l.year!==1953)continue;
  const s=W10.ensure(l);
  assert.ok(s.tags.includes('정전 이후 생활 회복'));
  assert.equal(s.schoolInterrupted,false);
  assert.ok(l.log.some(e=>e.kind==='history-followup'&&e.year===1953));
  assert.ok(l.log.some(e=>e.kind==='history-choice'&&e.year===1953));
  success=true;
 }
 assert.ok(success);
});
test('1997 financial crisis changes life conditions and results in year-1999 aftereffect',()=>{
 let found=false;
 for(let seed=1;seed<120&&!found;seed++){
  const l=newLife(seed,1970);
  reach(l,1997,()=>1);
  if(!l.alive||l.year!==1997)continue;
  const s=W10.ensure(l);
  assert.ok(s.tags.includes('외환·금융 위기 경험'));
  assert.ok(s.followups.some(x=>x.year===1999&&x.kind==='financial-recovery'));
  assert.ok(l.log.some(x=>x.kind==='history-choice'&&x.year===1997));
  reach(l,1999,()=>1);
  if(l.alive)assert.ok(l.log.some(x=>x.kind==='history-followup'&&x.year===1999));
  found=true;
 }
 assert.equal(found,true);
});
test('a 1950 birth learns about war through family, not an adult choice',()=>{
 const l=newLife(855,1950);
 const st=W10.ensure(l);
 assert.equal(l.age,0);
 assert.ok(st.tags.includes('한국전쟁 시기'));
 assert.ok(st.familyProtected);
 assert.ok(l.log.some(x=>x.year===1950&&x.kind==='history'));
 assert.equal(st.active,null);
 assert.equal(st.decisions.length,0);
});
test('1942 and 1962 historical paths never get modern mortgage or 23-year repair scenario',()=>{
 const f=newLife(314159,1919);
 f.age=23;f.year=1942;
 assert.ok(W9.eventsForYear(f,W9.ensure(f)).every(e=>e.id!=='repair-cost'));
 f.age=43;f.year=1962;
 assert.ok(W9.eventsForYear(f,W9.ensure(f)).every(e=>e.id!=='housing'));
});
test('historical-choice pending data survives exact JSON save and prevents replay',()=>{
 let found=false;
 for(let seed=1;seed<150&&!found;seed++){
  const l=newLife(seed,1935);
  let guard=0;
  while(l.alive&&l.year<=1950&&guard++<150){
   if(typeof l.pending==='string'&&l.pending.startsWith('v10:')){
    const snap=JSON.parse(JSON.stringify(l.snapshot()));
    const copy=Sim.Life.restore(snap);
    assert.equal(copy.pending,l.pending);
    assert.deepEqual(copy.snapshot(),snap);
    assert.ok(copy.getChoice()?.history);
    const before=copy.year;
    assert.equal(copy.choose(0),true);
    assert.equal(copy.year,before);
    assert.ok(W10.ensure(copy).decisions.length);
    assert.equal(new Set(W10.ensure(copy).decisions.map(x=>x.id)).size,W10.ensure(copy).decisions.length);
    found=true;break;
   }
   if(l.pending)resolve(l);
   else{l.tick();History.contextualize(l);}
  }
 }
 assert.equal(found,true);
});
test('850 varied-era simulated lives maintain year, bounded logs, unique decisions and safe restore',()=>{
 const years=[1900,1919,1935,1950,1970,1990,2020,2026],countries=['대한민국','브라질','대한민국','일본'];
 let lives=0,saved=0,facts=0,impacts=0,lifeStories=0,choices=0;
 for(let i=0;i<850;i++){
  const l=newLife(((i+1)*2654435761)>>>0,years[i%years.length],countries[i%4]);
  let n=0;
  while(l.alive&&n++<400){
   if(l.pending){
    resolve(l,choice=>i%choice.options.length);
    choices++;continue;
   }
   l.tick();History.contextualize(l);
   assert.equal(l.year,l.birthYear+l.age);
   assert.ok(Number.isFinite(l.money.netWorth));
   assert.ok(l.log.length<=760);
   if(l.alive&&[7,15,30,60].includes(l.age)){
    const snap=JSON.parse(JSON.stringify(l.snapshot()));
    const copy=Sim.Life.restore(snap);
    assert.ok(copy);assert.deepEqual(copy.snapshot(),snap);
    saved++;
   }
  }
  assert.equal(l.alive,false,'must eventually die');
  const s=W10.ensure(l);
  assert.ok(new Set(s.decisions.map(x=>x.id)).size===s.decisions.length);
  if(l.country[0]!=='대한민국')assert.equal(s.factsSeen.length,0);
  facts+=s.factsSeen.length;impacts+=s.historyImpacts;lifeStories+=l.log.filter(x=>x.kind==='history-life').length;
  lives++;
 }
 assert.equal(lives,850);
 assert.ok(saved>500);
 assert.ok(facts>1000);
 assert.ok(impacts>200);
 assert.ok(lifeStories>1000);
 assert.ok(choices>1000);
});

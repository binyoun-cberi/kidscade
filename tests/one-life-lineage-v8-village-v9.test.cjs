'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const dir=path.join(__dirname,'../games/high_one_life'),Sim=require(path.join(dir,'engine.js'));
global.window={OneLifeSim:Sim};
const load=(file,key)=>{const v=require(path.join(dir,file));if(key)window[key]=v;return v};
load('world-v2.js','OneLifeWorld2');
load('joseon-history-policy.js','OneLifeJoseonPolicy');
const J=load('joseon-v1.js','OneLifeJoseon');
const V2=load('joseon-v2.js','OneLifeJoseon2');
load('joseon-v3.js','OneLifeJoseon3');
const V4=load('joseon-v4.js','OneLifeJoseon4');
const V5=load('joseon-v5.js','OneLifeJoseon5');
load('joseon-v6.js','OneLifeJoseon6');
load('joseon-v7-life.js','OneLifeJoseon7');
const V8=load('joseon-v8-lineage.js','OneLifeJoseon8');
const V9=load('joseon-v9-village.js','OneLifeJoseon9');
const Colonial=load('colonial-daily-v2.js','OneLifeColonialDaily');
delete global.window;
function born(year,seed){const l=new Sim.Life(seed,{birthYear:year,countryName:'대한민국'});
 if(J.isJoseon(l)){J.ensure(l);V8.ensure(l);V9.ensure(l)}return l}
function age(l,n){l.age=n;l.year=l.birthYear+n;l.alive=true;l.pending=null;return l}
test('bon-gwan is authentic named seat yet independent of current home and class',()=>{
 assert.ok(V8.CLANS.length>=22);
 const seats=new Set(V8.CLANS.map(c=>c[1]+' '+c[0]+'씨'));
 assert.ok(seats.has('평산 신씨')&&seats.has('밀양 박씨')&&seats.has('경주 김씨'));
 let mismatch=0;
 for(let seed=1;seed<=130;seed++){
  const l=born(1580,seed*91),clan=V8.summary(l),j=J.summary(l);
  assert.ok(seats.has(clan.clan));assert.ok(clan.name.startsWith(clan.surname));
  if(!V8.CLANS.some(c=>c[2]===j.region&&c[1]+' '+c[0]+'씨'===clan.clan))mismatch++;
  assert.ok(V4.summary(l).people.some(p=>p.role==='father'&&p.name.startsWith(clan.surname)));
 }
 assert.ok(mismatch>15,'bon-gwan must differ from residence in some families');
});
test('lineage, family names and neighbors persist after restoration',()=>{
 const l=born(1580,773),v=V9.ensure(l),b=V8.summary(l);
 const p=V4.summary(l).people.find(x=>x.role==='father');
 v.water=17;v.homes[0].trust=81;
 const copy=Sim.Life.restore(JSON.parse(JSON.stringify(l.snapshot())));
 assert.deepEqual(V8.summary(copy),b);
 assert.equal(V4.summary(copy).people.find(x=>x.role==='father').name,p.name);
 assert.equal(V9.summary(copy).water,17);
 assert.equal(V9.summary(copy).neighbors[0].trust,81);
});
test('Jeju births and diving risks are reachable',()=>{
 let cases=0;
 for(let seed=1;seed<=250;seed++){const l=born(1650,seed*37);
  if(J.summary(l).region==='제주도'){
   cases++;l.gender='여자';age(l,23);
   assert.equal(V9.eligible(l,V9.EVENTS.find(e=>e.id==='haenyeo')),true);
  }
 }
 assert.ok(cases>0,'Jeju should occur naturally as a birth region');
});
test('land-water choices alter neighborhood trust and persist as named consequences',()=>{
 const l=age(born(1600,77),23),v=V9.ensure(l);
 J.ensure(l).region='경기도';V5.ensure(l).origin='자작 농가';
 const event=V9.EVENTS.find(e=>e.id==='water');assert.ok(V9.eligible(l,event));
 v.active={id:l.year+'-water',year:l.year,eventId:'water'};l.pending='joseon9:'+v.active.id;
 const trust=v.trust;assert.equal(l.getChoice().options.length,3);
 assert.equal(l.choose(0),true);assert.ok(v.trust>trust);
 const c=l.log.findLast(e=>e.kind==='joseon9-choice');
 const copy=Sim.Life.restore(JSON.parse(JSON.stringify(l.snapshot())));
 assert.equal(copy.joseon9.followups[0].id,c.causeId.slice(8));
 copy.year+=3;copy.age+=3;copy.pending=null;V9.yearly(copy,V9.ensure(copy));
 assert.ok(copy.log.some(e=>e.kind==='joseon9-followup'&&e.causeId===c.causeId));
});
test('hazardous sea choices can end a life and the reason is preserved',()=>{
 let deaths=0;
 for(let seed=1;seed<=280;seed++){
  const l=age(born(1690,seed*233),31),s=V5.ensure(l),j=J.ensure(l),v=V9.ensure(l);
  s.origin='어부 가계';j.region='전라도';v.active={id:l.year+'-fishing',year:l.year,eventId:'fishing'};
  l.pending='joseon9:'+v.active.id;
  assert.equal(l.choose(2),true);
  if(!l.alive){
   deaths++;assert.match(l.deathReason,/풍랑/);
   const copy=Sim.Life.restore(JSON.parse(JSON.stringify(l.snapshot())));
   assert.equal(copy.alive,false);
   assert.equal(copy.deathReason,l.deathReason);
  }
 }
 assert.ok(deaths>0,'risky offshore fishing must have actual fatal consequence');
});
test('colonial rules appear only in historically valid years and persist across saves',()=>{
 const events=Colonial.EVENTS;
 for(const e of events){
  const l=age(born(1910,715),24);
  l.year=e.start;l.age=Math.max(e.age,e.start-l.birthYear);
  assert.equal(Colonial.eligible(l,e),true,e.id);
  l.year=e.start-1;assert.equal(Colonial.eligible(l,e),false,e.id);
 }
 const l=age(born(1919,535),21),s=Colonial.ensure(l),e=events.find(e=>e.id==='name');
 l.year=1940;s.active={id:'1940-name',eventId:e.id,year:1940};l.pending='colonialDaily:1940-name';
 assert.equal(l.choose(2),true);
 const save=JSON.parse(JSON.stringify(l.snapshot())),copy=Sim.Life.restore(save);
 assert.equal(copy.colonialDaily.decisions.at(-1).eventId,'name');
 assert.ok(copy.colonialDaily.followups.some(f=>f.id==='1940-name'));
});
test('90 Joseon and colonial lives complete without impossible pending decisions',()=>{
 const discovered=new Set();let count=0;
 for(const year of [1392,1580,1700,1810,1910,1930]){
  for(let seed=1;seed<=15;seed++){
   const life=born(year,seed*499+year),end=Math.min(year+81,2026);
   let guard=0;
   while(life.alive&&life.year<end&&++guard<340){
    if(life.pending){
     const p=life.getChoice();if(p)assert.equal(life.choose(seed%p.options.length),true,life.pending);
     else if(life.getReflection())assert.equal(life.reflect(''),true);
     else assert.fail('unknown pending '+life.pending);
    }else assert.equal(life.tick(),true);
   }
   assert.ok(guard<340,'stalled '+life.year);
   const saves=Sim.Life.restore(JSON.parse(JSON.stringify(life.snapshot())));
   assert.equal(saves.pending,life.pending);
   for(const d of life.log.filter(x=>x.kind==='joseon9-choice'||x.kind==='colonialDaily-choice')){discovered.add(d.text.split(' — ')[0]);count++}
  }
 }
 assert.ok(count>100,'too few household or colonial encounters '+count);
 assert.ok(discovered.size>=12,'limited variety '+discovered.size);
});
test('registered in correct script order and displayed on birth and mobile',()=>{
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8'),game=fs.readFileSync(path.join(dir,'game.js'),'utf8');
 for(const name of ['joseon-v8-lineage.js','joseon-v9-village.js','colonial-daily-v2.js'])assert.ok(html.includes(name));
 assert.ok(html.indexOf('joseon-v7-life.js')<html.indexOf('joseon-v8-lineage.js'));
 assert.ok(html.indexOf('joseon-v8-lineage.js')<html.indexOf('joseon-v9-village.js'));
 assert.ok(html.indexOf('joseon-v9-village.js')<html.indexOf('colonial-daily-v2.js'));
 assert.ok(html.includes('id="birthLineage"')&&html.includes('id="villageNeighbors"'));
 assert.match(game,/Joseon8\.summary/);assert.match(game,/Joseon9\.summary/);assert.match(game,/colonialDaily-choice/);
});

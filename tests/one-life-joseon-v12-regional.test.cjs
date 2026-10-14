'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const folder=path.resolve(__dirname,'../games/high_one_life'),Sim=require(path.join(folder,'engine.js'));
global.window={OneLifeSim:Sim};
function load(file,key){const mod=require(path.join(folder,file));if(key)global.window[key]=mod;return mod;}
load('world-v2.js','OneLifeWorld2');
load('joseon-history-policy.js','OneLifeJoseonPolicy');
const J=load('joseon-v1.js','OneLifeJoseon'),V2=load('joseon-v2.js','OneLifeJoseon2');
load('joseon-v3.js','OneLifeJoseon3');
load('joseon-v4.js','OneLifeJoseon4');
const V5=load('joseon-v5.js','OneLifeJoseon5');
load('joseon-v6.js','OneLifeJoseon6');
load('joseon-v7-life.js','OneLifeJoseon7');
load('joseon-v8-lineage.js','OneLifeJoseon8');
const V9=load('joseon-v9-village.js','OneLifeJoseon9');
load('joseon-annals-v10.js','OneLifeJoseonAnnals');
load('joseon-v11-late-life.js','OneLifeJoseon11');
const V12=load('joseon-v12-regional.js','OneLifeJoseon12');
load('colonial-daily-v2.js','OneLifeColonialDaily');
delete global.window;
const born=(year,seed=151)=>new Sim.Life(seed,{birthYear:year,countryName:'대한민국'});
function set(l,year,region,origin,gender){
 l.year=year;l.age=year-l.birthYear;l.alive=true;l.pending=null;
 const j=J.ensure(l);j.region=region;
 if(origin)V5.ensure(l).origin=origin;
 if(gender)l.gender=gender;
 return l;
}
function force(l,id,i=0){
 const e=V12.EVENTS.find(e=>e.id===id);assert.ok(e,'missing '+id);
 const s=V12.ensure(l);s.active={id:l.year+'-'+id,eventId:id,year:l.year};
 l.pending='joseon12:'+s.active.id;
 assert.equal(l.getChoice().options.length,3);
 assert.equal(l.choose(i),true);
 return s;
}
test('25 new regional livelihood episodes have unique IDs, dated sources and three choices',()=>{
 assert.equal(V12.EVENTS.length,25);
 assert.equal(new Set(V12.EVENTS.map(e=>e.id)).size,25);
 for(const e of V12.EVENTS){
  assert.ok(e.group&&e.title&&e.desc);
  assert.equal(e.opts.length,3,e.id);
  assert.ok(e.src&&Object.values(V12.SOURCES).includes(e.src));
  assert.ok(e.opts.every(o=>o.label&&o.note&&o.after));
 }
 assert.equal(V12.EVENTS.find(e=>e.id==='womenLetters').from,1446);
 assert.equal(V12.EVENTS.find(e=>e.id==='seowonAccess').from,1543);
});
test('seagoing nets and boats are restricted to seafaring work',()=>{
 const l=set(born(1660,214),1680,'전라도','어부 가계','남자');
 const fishing=V12.EVENTS.find(e=>e.id==='netRepair');
 assert.ok(V12.eligible(l,fishing));
 const state=V12.ensure(l),start=state.nets;force(l,'netRepair',0);
 assert.ok(state.nets>start);
 assert.ok(l.log.some(e=>e.kind==='joseon12-choice'&&e.sourceUrl===V12.SOURCES.occupations));
 V5.ensure(l).origin='소작 농가';J.ensure(l).occupation='농사';
 assert.equal(V12.eligible(l,fishing),false);
});
test('Jeju female apprentices train first, unrelated regions and men do not dive',()=>{
 const l=set(born(1650,306),1672,'제주도','자작 농가','여자');
 const s=V12.ensure(l);s.diving=0;
 const learn=V12.EVENTS.find(e=>e.id==='diverLearning'),comm=V12.EVENTS.find(e=>e.id==='diverCommunity');
 assert.equal(V12.eligible(l,learn),true);
 assert.equal(V12.eligible(l,comm),false);
 force(l,'diverLearning',0);
 assert.ok(s.diving>=2);
 assert.equal(V12.eligible(l,comm),true);
 l.gender='남자';assert.equal(V12.eligible(l,comm),false);
 l.gender='여자';J.ensure(l).region='강원도';assert.equal(V12.eligible(l,comm),false);
});
test('rural merchant stock, craft orders and neighbors have persistent costs',()=>{
 const l=set(born(1700,817),1742,'경상도','상인 가계');
 const s=V12.ensure(l),v=V9.ensure(l);
 const before=s.customers;force(l,'packTravel',2);
 assert.ok(s.customers>before);
 l.pending=null;const trust=v.trust;
 force(l,'marketCredit',1);
 assert.ok(v.trust>trust);
 const copy=Sim.Life.restore(JSON.parse(JSON.stringify(l.snapshot())));
 assert.equal(copy.joseon12.customers,s.customers);
 assert.equal(V9.summary(copy).trust,v.trust);
});
test('craft skill and material shortage continue year after year',()=>{
 const l=set(born(1750,231),1782,'충청도','도공 가계');
 const s=V12.ensure(l);s.materials=5;s.goods=4;
 force(l,'artisanOrder',0);
 assert.equal(s.materials,2);
 assert.ok(s.goods>=9);
 const learned=s.skill;
 l.pending=null;
 force(l,'kilnFire',0);
 assert.ok(s.skill>learned);
 s.materials=0;s.processedYear=1782;
 l.year=1784;l.age=34;l.pending=null;
 V12.yearly(l,s);
 assert.ok(l.log.some(e=>e.kind==='joseon12-memory'&&e.text.includes('재료')));
});
test('female household literacy is possible without opening a seowon to everyone',()=>{
 const l=set(born(1680,493),1701,'충청도','소작 농가','여자');
 const s=V12.ensure(l);J.ensure(l).literacy=0;
 const women=V12.EVENTS.find(e=>e.id==='womenLetters'),school=V12.EVENTS.find(e=>e.id==='seowonAccess');
 assert.equal(V12.eligible(l,women),true);
 assert.equal(V12.eligible(l,school),false);
 force(l,'womenLetters',0);
 assert.equal(J.ensure(l).literacy,1);
 assert.equal(V12.eligible(l,school),false);
});
test('the consequences refer to existing named neighbors and survive saving',()=>{
 const l=set(born(1710,598),1742,'강원도','소작 농가');
 const village=V9.ensure(l),neighbor=village.homes[0].name,s=V12.ensure(l);
 force(l,'forestFirewood',1);
 const cause=l.log.findLast(x=>x.kind==='joseon12-choice').causeId;
 const cp=Sim.Life.restore(JSON.parse(JSON.stringify(l.snapshot())));
 assert.equal(V12.ensure(cp).followups.length,1);
 assert.ok(V12.ensure(cp).followups[0].text.includes(neighbor));
 cp.year=1745;cp.age=35;cp.pending=null;
 V12.yearly(cp,V12.ensure(cp));
 assert.ok(cp.log.some(x=>x.kind==='joseon12-followup'&&x.causeId===cause));
});
test('existing records without v12 restore normally without invented choices',()=>{
 const l=set(born(1580,123),1612,'함경도','소작 농가');
 const old=l.snapshot();delete old.joseon12;
 const cp=Sim.Life.restore(JSON.parse(JSON.stringify(old)));
 assert.equal(V12.summary(cp).decisions,0);
 assert.equal(V12.ensure(cp).followups.length,0);
});
test('160 lifetimes spanning Joseon maintain working choices and legitimate snapshots',()=>{
 let decisions=0;const ids=new Set();
 for(const year of [1392,1480,1560,1680,1780,1860,1890,1900]){
  for(let n=1;n<=20;n++){
   const l=born(year,year*41+n*373);
   let guard=0;const end=Math.min(2026,year+82);
   while(l.alive&&l.year<end&&guard++<600){
    if(l.pending){
     const p=l.getChoice();
     if(p)assert.equal(l.choose(n%p.options.length),true,l.pending);
     else if(l.getReflection())assert.equal(l.reflect(''),true);
     else assert.fail('Unknown pending '+l.pending);
    }else assert.equal(l.tick(),true);
   }
   assert.ok(guard<600,'life stuck at '+l.year);
   const cloned=Sim.Life.restore(JSON.parse(JSON.stringify(l.snapshot())));
   assert.equal(cloned.pending,l.pending);
   assert.deepEqual(V12.summary(cloned),V12.summary(l));
   for(const d of V12.ensure(l).decisions){ids.add(d.eventId);decisions++}
  }
 }
 assert.ok(decisions>95,'livelihood choices too rare '+decisions);
 assert.ok(ids.size>=13,'too few unique settings '+ids.size);
});
test('UI is optional and modules retain correct load order',()=>{
 const html=fs.readFileSync(path.join(folder,'index.html'),'utf8'),ui=fs.readFileSync(path.join(folder,'game.js'),'utf8');
 assert.ok(html.indexOf('joseon-v11-late-life.js')<html.indexOf('joseon-v12-regional.js'));
 assert.ok(html.indexOf('joseon-v12-regional.js')<html.indexOf('colonial-daily-v2.js'));
 for(const x of ['joseonRegionalLedger','regionalTools','regionalSourceLink'])assert.ok(html.includes('id="'+x+'"'));
 assert.ok(ui.includes('Joseon12?.summary'));
 assert.ok(ui.includes('joseon12-followup'));
});

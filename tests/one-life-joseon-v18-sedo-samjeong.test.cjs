'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../games/high_one_life');
const Sim=require(path.join(root,'engine.js'));
global.window={OneLifeSim:Sim};
const load=(file,key)=>{const m=require(path.join(root,file));if(key)global.window[key]=m;return m;};
load('world-v2.js','OneLifeWorld2');load('joseon-history-policy.js','OneLifeJoseonPolicy');
const J=load('joseon-v1.js','OneLifeJoseon'),V2=load('joseon-v2.js','OneLifeJoseon2');
load('joseon-v3.js','OneLifeJoseon3');const V4=load('joseon-v4.js','OneLifeJoseon4');
const V5=load('joseon-v5.js','OneLifeJoseon5');load('joseon-v6.js','OneLifeJoseon6');
load('joseon-v7-life.js','OneLifeJoseon7');load('joseon-v8-lineage.js','OneLifeJoseon8');
const V9=load('joseon-v9-village.js','OneLifeJoseon9');load('joseon-annals-v10.js','OneLifeJoseonAnnals');
const V11=load('joseon-v11-late-life.js','OneLifeJoseon11');
load('joseon-v12-regional.js','OneLifeJoseon12');
load('joseon-v13-war-recovery.js','OneLifeJoseon13');
const V14=load('joseon-v14-captivity-generations.js','OneLifeJoseon14');
load('joseon-v15-genealogy.js','OneLifeGenealogyV15');
load('joseon-v17-branch-switch.js','OneLifeBranchSwitchV17');
const V18=load('joseon-v18-sedo-samjeong.js','OneLifeJoseon18');
load('colonial-daily-v2.js','OneLifeColonialDaily');delete global.window;
const born=(year=1800,seed=511)=>new Sim.Life(seed,{birthYear:year,countryName:'대한민국'});
const at=(l,year,region='경상도')=>{l.year=year;l.age=year-l.birthYear;l.alive=true;l.pending=null;J.ensure(l).region=region;return l;};
function force(l,eventId,index=0){
 const event=V18.EVENTS.find(e=>e.id===eventId);assert.ok(event);
 const s=V18.ensure(l),id=l.year+'-'+eventId;s.active={id,eventId,year:l.year};l.pending='joseon18:'+id;
 const p=l.getChoice();assert.ok(p);assert.equal(p.options.length,3);
 assert.equal(l.choose(index),true);return {s,event};
}
test('21 detailed events have unique IDs, 3 valid choices, sources and historical windows',()=>{
 assert.equal(V18.EVENTS.length,21);
 assert.equal(new Set(V18.EVENTS.map(e=>e.id)).size,21);
 const categories=new Set(V18.EVENTS.map(e=>e.category));
 for(const name of ['전정','군정','환정','관아','세도정치','저항','개혁'])assert.ok(categories.has(name));
 for(const e of V18.EVENTS){
  assert.ok(e.from>=1800&&e.to<=1869&&e.from<=e.to);
  assert.equal(e.options.length,3);
  assert.ok(e.source.startsWith('https://'));
  assert.ok(e.options.every(o=>o.label&&o.note&&o.follow));
 }
});
test('land misassessment raises separate tax exposure and preserves written evidence',()=>{
 const l=at(born(1800,15),1837),s=V18.ensure(l);
 assert.equal(s.landDebt,0);
 force(l,'landExtra',2);
 assert.ok(s.anger>=3&&s.complaints>0&&s.trust>0);
 force(l,'landFalse',1);
 assert.ok(s.landDebt>0);
 assert.equal(s.militaryDebt,0);
 assert.equal(s.grainDebt,0);
});
test('dead-person military levy is recognized as a burden on surviving relatives',()=>{
 const l=at(born(1800,16),1841),f=V4.ensure(l);
 const p=f.people.find(p=>p.role==='father');
 p.alive=false;p.sex='남자';p.diedYear=1840;
 const s=V18.ensure(l);force(l,'militaryDead',1);
 assert.ok(s.militaryDebt>0);
 assert.ok(l.log.some(e=>e.kind==='joseon18-choice'));
});
test('underage military levy can involve the household’s male child',()=>{
 const l=at(born(1800,17),1833),f=V4.ensure(l);
 const p=f.people.find(x=>x.role==='sibling')||f.people[0];
 f.people.push({...p,id:'child-0',role:'child',sex:'남자',name:'김민',birthYear:1822,alive:true,atHome:true});
 const s=V18.ensure(l);force(l,'militaryChild',2);
 assert.ok(s.anger>=3&&s.complaints>0);
});
test('separate mandatory-granary debt accumulates and affects household after several years',()=>{
 const l=at(born(1800,18),1839),s=V18.ensure(l);force(l,'grainForced',1);
 assert.ok(s.grainDebt>=5);
 force(l,'grainPhantom',1);
 assert.ok(s.grainDebt>=7);
 const previous=J.ensure(l).capital,priorGrain=V2.ensure(l).grain;
 at(l,1840);s.processedYear=1839;
 V18.yearly(l,s);
 assert.ok(J.ensure(l).capital<previous);
 assert.ok(V2.ensure(l).grain<priorGrain);
 assert.ok(s.penaltyYears>0);
});
test('a clerk refusing to falsify documents does not automatically become an inspector',()=>{
 const l=at(born(1800,19),1837),s=V18.ensure(l),v=V5.ensure(l);
 v.origin='서리 가계';v.role='서리';
 force(l,'clerkBook',0);
 assert.ok(s.integrity>=4&&s.proof>=4);
 assert.equal(s.corruption,0);
 assert.equal(v.inspector,false);
});
test('a clerk obeying an improper order has lasting corruption and trust effects',()=>{
 const l=at(born(1800,20),1845),s=V18.ensure(l),v=V5.ensure(l);
 v.origin='서리 가계';v.role='서리';
 force(l,'clerkBook',1);
 assert.ok(s.corruption>0);
 assert.ok(s.anger>=4);
 assert.ok(V9.ensure(l).trust<80);
});
test('1862 summons an uprising where appropriate and a nationwide reform without erasing prior abuses',()=>{
 const l=at(born(1810,121),1862,'경상도'),s=V18.ensure(l);
 s.landDebt=9;s.militaryDebt=4;s.grainDebt=11;s.anger=8;
 s.processedYear=1861;
 V18.yearly(l,s);
 const ids=[s.active?.eventId,...s.queue.map(q=>q.eventId)];
 assert.ok(ids.includes('uprising1862'));
 assert.ok(ids.includes('reform1862'));
 assert.equal(s.landDebt+s.militaryDebt+s.grainDebt,24);
 assert.equal(V18.prompt(l).description.includes('여러 해'),true);
});
test('reform events do not create a fictional immediate blanket tax amnesty',()=>{
 const l=at(born(1810,122),1862,'한양'),s=V18.ensure(l);
 s.landDebt=8;s.militaryDebt=5;s.grainDebt=9;
 force(l,'reform1862',1);
 assert.equal(s.landDebt,8);
 assert.equal(s.militaryDebt,5);
 assert.equal(s.grainDebt,9);
});
test('a character born after 1869 does not enter the samjeong-event loop',()=>{
 const l=at(born(1874,45),1894),s=V18.ensure(l);
 const old=J.ensure(l).capital;s.processedYear=1893;
 V18.yearly(l,s);assert.equal(s.decisions.length,0);
 assert.equal(s.active,null);assert.equal(J.ensure(l).capital,old);
});
test('old saves without the new module restore without changing previous game modules',()=>{
 const l=at(born(1810,142),1844),data=l.snapshot();delete data.joseon18;
 const cp=Sim.Life.restore(JSON.parse(JSON.stringify(data)));
 assert.ok(cp);
 assert.equal(V18.summary(cp).total,0);
 assert.equal(V11.summary(cp).taxDebt,V11.summary(l).taxDebt);
});
test('new saves restore decisions, all three fiscal ledgers and follow-up cause links',()=>{
 const l=at(born(1800,151),1844),s=V18.ensure(l);
 force(l,'landExtra',1);force(l,'grainForced',1);
 const snap=JSON.parse(JSON.stringify(l.snapshot()));
 const cp=Sim.Life.restore(snap);
 assert.deepEqual(V18.summary(cp),V18.summary(l));
 assert.equal(V18.ensure(cp).decisions.length,2);
 const orig=l.log.filter(e=>e.kind==='joseon18-choice').map(x=>x.causeId);
 const after=cp.log.filter(e=>e.kind==='joseon18-choice').map(x=>x.causeId);
 assert.deepEqual(after,orig);
 assert.ok(after.every(x=>x.startsWith('joseon18:')));
});
test('family succession inherits part of unpaid burdens, never moral corruption automatically',()=>{
 const parent=at(born(1800,44),1850),family=V4.ensure(parent),base=family.people[0];
 family.people.push({...base,id:'child-0',role:'child',name:'박연',sex:'여자',
  birthYear:1825,alive:true,atHome:true,diedYear:null});
 const s=V18.ensure(parent);s.landDebt=20;s.militaryDebt=16;s.grainDebt=12;s.anger=8;s.corruption=10;s.integrity=8;
 parent.finish('세월을 마쳤다.');
 const child=V14.continueAsHeir(parent,'child-0');
 assert.ok(child);
 const b=V18.ensure(child);
 assert.equal(b.landDebt,10);assert.equal(b.militaryDebt,8);assert.equal(b.grainDebt,6);
 assert.equal(b.corruption,0);assert.equal(b.integrity,0);
 assert.ok(child.log.some(e=>e.kind==='joseon18-family'));
});
test('year and class differences do not erase all local variation',()=>{
 assert.ok(V18.intensity(1852,'전라도')>V18.intensity(1812,'경기도'));
 assert.ok(V18.intensity(1862,'경상도')>V18.intensity(1852,'경상도'));
 assert.equal(V18.intensity(1852,'전라도')-V18.intensity(1852,'경기도'),1);
});
test('browser includes historical ledger and correctly ordered module scripts',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const js=fs.readFileSync(path.join(root,'game.js'),'utf8');
 assert.ok(html.indexOf('joseon-v17-branch-switch.js')<html.indexOf('joseon-v18-sedo-samjeong.js'));
 assert.ok(html.indexOf('joseon-v18-sedo-samjeong.js')<html.indexOf('colonial-daily-v2.js'));
 for(const id of ['samjeongLedger','samjeongLand','samjeongMilitary','samjeongGrain','samjeongPoliticalContext'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(js.includes('Joseon18?.summary(life)'));
 assert.ok(js.includes("'joseon18-choice'"));
});
test('160 varied life simulations finish pending choices, preserve persistent fiscal records on reload',()=>{
 let decisions=0;
 for(const year of [1780,1800,1815,1828,1840,1860,1875,1900,1500,1690]){
  for(let seed=1;seed<=16;seed++){
   const l=born(year,year*71+seed*281);
   let guard=0;
   while(l.alive&&l.year<Math.min(1899,year+84)&&guard++<790){
    if(l.pending){
     const p=l.getChoice();
     if(p)assert.equal(l.choose(seed%p.options.length),true,'choose '+l.pending);
     else if(l.getReflection())assert.equal(l.reflect(''),true);
     else assert.fail('unhandled pending '+l.pending);
    }else assert.equal(l.tick(),true);
   }
   assert.ok(guard<790,'stuck in '+l.year+' with '+l.pending);
   const cp=Sim.Life.restore(JSON.parse(JSON.stringify(l.snapshot())));
   assert.deepEqual(V18.summary(cp),V18.summary(l));
   decisions+=V18.summary(l)?.decisions||0;
  }
 }
 assert.ok(decisions>10,'must appear during ordinary play: '+decisions);
});

'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../games/high_one_life'),Sim=require(path.join(root,'engine.js'));
global.window={OneLifeSim:Sim};
function load(file,globalName){const x=require(path.join(root,file));if(globalName)window[globalName]=x;return x}
load('world-v2.js','OneLifeWorld2');load('joseon-history-policy.js','OneLifeJoseonPolicy');
const J=load('joseon-v1.js','OneLifeJoseon'),V2=load('joseon-v2.js','OneLifeJoseon2');
load('joseon-v3.js','OneLifeJoseon3');
const V4=load('joseon-v4.js','OneLifeJoseon4'),V5=load('joseon-v5.js','OneLifeJoseon5');
load('joseon-v6.js','OneLifeJoseon6');load('joseon-v7-life.js','OneLifeJoseon7');
load('joseon-v8-lineage.js','OneLifeJoseon8');
const V9=load('joseon-v9-village.js','OneLifeJoseon9');
load('joseon-annals-v10.js','OneLifeJoseonAnnals');
load('joseon-v11-late-life.js','OneLifeJoseon11');
load('joseon-v12-regional.js','OneLifeJoseon12');
const War=load('joseon-v13-war-recovery.js','OneLifeJoseon13');
load('colonial-daily-v2.js','OneLifeColonialDaily');
delete global.window;
const born=(year,seed=77)=>new Sim.Life(seed,{birthYear:year,countryName:'대한민국'});
function at(l,year,region='경상도'){
 l.year=year;l.age=year-l.birthYear;l.alive=true;l.pending=null;
 J.ensure(l).region=region;
 return l;
}
function force(l,id,i=0){
 const e=War.EVENTS.find(e=>e.id===id);assert.ok(e,id);
 const s=War.ensure(l);
 s.active={id:l.year+'-'+id,eventId:id,year:l.year};l.pending='joseon13:'+s.active.id;
 assert.equal(l.getChoice().options.length,3,id);
 assert.equal(l.choose(i),true,id);return s;
}
test('26 different regional wartime and recovery encounters include three choices and sources',()=>{
 assert.equal(War.EVENTS.length,26);
 assert.equal(new Set(War.EVENTS.map(e=>e.id)).size,26);
 for(const e of War.EVENTS){
  assert.ok(e.title&&e.scene);
  assert.equal(e.options.length,3,e.id);
  assert.ok(e.source?.startsWith('https://'),e.id);
  assert.ok(e.options.every(o=>o.label&&o.note&&o.after),e.id);
 }
});
test('1592 alarm concerns invasion corridor and Jeongyu return is southern, not northern',()=>{
 const south=at(born(1570),1592,'경상도');
 const north=at(born(1570),1592,'평안도');
 const imjin=War.EVENTS.find(e=>e.id==='imjinAlarm');
 assert.ok(War.allowed(south,imjin));assert.equal(War.allowed(north,imjin),false);
 const northEvent=War.EVENTS.find(e=>e.id==='imjinNorth');
 assert.ok(War.allowed(north,northEvent));
 const jeongyu=War.EVENTS.find(e=>e.id==='jeongyu1597');
 at(south,1597,'전라도');assert.ok(War.allowed(south,jeongyu));
 at(south,1597,'함경도');assert.equal(War.allowed(south,jeongyu),false);
});
test('1627 local invasions differ from southern reports and 1636 capital invasion',()=>{
 const p=at(born(1600,52),1627,'평안도');
 const q=at(born(1600,83),1627,'전라도');
 assert.ok(War.allowed(p,War.EVENTS.find(e=>e.id==='jeongmyo1627')));
 assert.ok(War.allowed(q,War.EVENTS.find(e=>e.id==='jeongmyoNews')));
 assert.equal(War.allowed(q,War.EVENTS.find(e=>e.id==='jeongmyo1627')),false);
 at(p,1636,'경기도');
 assert.ok(War.allowed(p,War.EVENTS.find(e=>e.id==='byeongja1636')));
 at(q,1636,'전라도');
 assert.ok(War.allowed(q,War.EVENTS.find(e=>e.id==='byeongjaProvince')));
 assert.equal(War.allowed(q,War.EVENTS.find(e=>e.id==='byeongja1636')),false);
});
test('rebuild damages shelter and land while changing old granary, trust and costs',()=>{
 const l=at(born(1570,197),1592,'경상도'),s=War.ensure(l),v=V9.ensure(l);
 const trust=v.trust,grain=V2.ensure(l).grain;
 force(l,'imjinAlarm',0);
 assert.ok(s.damage>=2);assert.equal(s.moves,1);assert.ok(v.trust>trust);
 assert.ok(V2.ensure(l).grain<grain);
 at(l,1601,'경상도');l.pending=null;
 const repair=War.EVENTS.find(x=>x.id==='imjinRepair');
 assert.equal(War.allowed(l,repair),true);
 force(l,'imjinRepair',0);
 assert.ok(s.repair>=4);
 const copy=Sim.Life.restore(JSON.parse(JSON.stringify(l.snapshot())));
 assert.deepEqual(War.summary(copy),War.summary(l));
 copy.pending=null;copy.year=1603;copy.age=33;
 // Repairs recur in years congruent to 1 modulo 3, while damage remains.
 War.ensure(copy).damage=2;
 War.yearly(copy,War.ensure(copy));
 assert.ok(copy.log.some(e=>e.kind==='joseon13-followup'));
});
test('missing relative refers to existing living family and is not misreported dead',()=>{
 const l=at(born(1568,916),1592,'경상도'),s=War.ensure(l);
 const before=V4.summary(l).people.filter(p=>p.alive).length;
 force(l,'missing1593',0);
 assert.equal(s.missing.length,1);
 const m=s.missing[0];
 assert.equal(m.status,'missing');
 assert.ok(V4.summary(l).people.some(p=>p.id===m.personId&&p.name===m.name&&p.alive&&!p.atHome));
 assert.equal(V4.summary(l).people.filter(p=>p.alive).length,before);
 const restore=Sim.Life.restore(JSON.parse(JSON.stringify(l.snapshot())));
 assert.deepEqual(War.summary(restore).missing,War.summary(l).missing);
 assert.equal(V4.summary(restore).people.find(p=>p.id===m.personId).atHome,false);
});
test('return or continued search is deterministic, never a fabricated confirmed death',()=>{
 let returning=null;
 for(let seed=1;seed<=150;seed++){
  const l=at(born(1608,seed*71),1637,'경기도');
  const s=force(l,'ganghwa1637',0);
  if(!s.missing.length)continue;
  at(l,1638,'경기도');l.pending=null;
  const person=s.missing[0],was=V4.summary(l).people.find(p=>p.id===person.personId);
  assert.ok(was?.alive);
  force(l,'ransom1638',0);
  if(person.status==='returned'){
   returning=l;assert.equal(V4.summary(l).people.find(p=>p.id===person.personId).atHome,person.atHome);break;
  }
  assert.ok(person.status==='missing'||person.status==='unresolved');
 }
 assert.ok(returning,'at least one family must reunite when pursuing return');
 const copy=Sim.Life.restore(JSON.parse(JSON.stringify(returning.snapshot())));
 assert.equal(War.summary(copy).returned.length,1);
 assert.equal(War.summary(copy).missing.length,0);
});
test('families from Jeongmyo 1627 have a chance to seek news by 1628, not only 1638',()=>{
 const l=at(born(1602,319),1627,'평안도');
 const s=force(l,'jeongmyoMissing',0);
 assert.equal(s.missing[0].era,'hiran');
 at(l,1628,'평안도');
 assert.ok(War.allowed(l,War.EVENTS.find(x=>x.id==='ransom1628')));
 assert.equal(War.allowed(l,War.EVENTS.find(x=>x.id==='ransom1638')),false);
});
test('postwar hardship can recur over years without relabeling a household death',()=>{
 const l=at(born(1570,708),1592,'한양'),s=War.ensure(l);
 force(l,'imjinCapital',0);
 const before=V2.ensure(l).grain;
 at(l,1602,'한양');s.processedYear=1601;
 War.yearly(l,s);
 assert.ok(s.hardship>=1);
 assert.ok(V2.ensure(l).grain<=before);
 const old=l.snapshot();delete old.joseon13;
 const cp=Sim.Life.restore(JSON.parse(JSON.stringify(old)));
 assert.equal(War.ensure(cp).decisions.length,0);
 assert.equal(War.summary(cp).missing.length,0);
});
test('160 complete lives do not stall on wartime choices and save cleanly',()=>{
 let total=0;const ids=new Set(),regions=new Set();
 for(const birth of [1540,1560,1575,1590,1600,1610,1620,1630]){
  for(let i=1;i<=20;i++){
   const l=born(birth,birth*17+i*281);
   let tries=0;const horizon=Math.min(1900,birth+80);
   while(l.alive&&l.year<horizon&&++tries<650){
    if(l.pending){
     const p=l.getChoice();
     if(p)assert.equal(l.choose(i%p.options.length),true,'pending '+l.pending);
     else if(l.getReflection())assert.equal(l.reflect(''),true);
     else assert.fail('unknown pending '+l.pending);
    }else assert.equal(l.tick(),true);
   }
   assert.ok(tries<650,'stalled '+l.year);
   const copy=Sim.Life.restore(JSON.parse(JSON.stringify(l.snapshot())));
   assert.deepEqual(War.summary(copy),War.summary(l));
   assert.equal(copy.pending,l.pending);
   for(const d of War.ensure(l).decisions){total++;ids.add(d.eventId);regions.add(J.summary(l).region);}
  }
 }
 assert.ok(total>90,'too few war and recovery stories '+total);
 assert.ok(ids.size>=14,'too few distinct events '+ids.size);
});
test('war UI appears after occupation and village layers, and personal records are linked',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),game=fs.readFileSync(path.join(root,'game.js'),'utf8');
 assert.ok(html.indexOf('joseon-v12-regional.js')<html.indexOf('joseon-v13-war-recovery.js'));
 assert.ok(html.indexOf('joseon-v13-war-recovery.js')<html.indexOf('colonial-daily-v2.js'));
 for(const id of ['joseonWarRecord','warMissingFamily','warRecoveryStatus','warHistorySource'])assert.ok(html.includes('id="'+id+'"'));
 assert.ok(game.includes('Joseon13?.summary(life)'));
 assert.ok(game.includes('joseon13-followup'));
 assert.ok(game.includes('전란에 헤어져'));
});

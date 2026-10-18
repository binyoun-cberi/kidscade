'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../games/high_one_life'),Sim=require(path.join(root,'engine.js'));
global.window={OneLifeSim:Sim};
const load=(p,k)=>{const v=require(path.join(root,p));if(k)global.window[k]=v;return v;};
load('world-v2.js','OneLifeWorld2');load('joseon-history-policy.js','OneLifeJoseonPolicy');
const J=load('joseon-v1.js','OneLifeJoseon'),V2=load('joseon-v2.js','OneLifeJoseon2');
load('joseon-v3.js','OneLifeJoseon3');load('joseon-v4.js','OneLifeJoseon4');
load('joseon-v5.js','OneLifeJoseon5');load('joseon-v6.js','OneLifeJoseon6');
load('joseon-v7-life.js','OneLifeJoseon7');load('joseon-v8-lineage.js','OneLifeJoseon8');
load('joseon-v9-village.js','OneLifeJoseon9');
const Annals=load('joseon-annals-v10.js','OneLifeJoseonAnnals');
load('colonial-daily-v2.js','OneLifeColonialDaily');delete global.window;
const born=(y,s=77)=>new Sim.Life(s,{birthYear:y,countryName:'대한민국'});
function move(l,y,region){l.year=y;l.age=y-l.birthYear;l.alive=true;l.pending=null;J.ensure(l).region=region;return l;}
function clearChoices(l){let guard=0;while(l.pending&&!l.pending.startsWith('joseonAnnals:')&&guard++<30){const p=l.getChoice();if(p)l.choose(0);else if(l.getReflection())l.reflect('');else assert.fail('Unknown pending '+l.pending);}assert.ok(guard<30);}
test('19 primary records have individual canonical citations and no fabricated player facts',()=>{
 assert.equal(Annals.ARTICLES.length,19);
 assert.equal(new Set(Annals.ARTICLES.map(a=>a.id)).size,19);
 for(const a of Annals.ARTICLES){
  assert.equal(a.url,'https://sillok.history.go.kr/id/'+a.id);
  assert.equal(a.year,+a.day.slice(0,4));
  assert.match(a.id,/^[a-z]{3}_[0-9]{8}_[0-9]{3}$/);
  assert.equal(a.options.length,3);
  assert.ok(a.fact&&a.scene&&a.sourceTitle);
  assert.equal(a.authenticity,'primary-record');
  assert.equal(a.scenario,'fictional-household');
 }
});
test('province and date controls prevent unrelated households receiving the article',()=>{
 const relief=Annals.ARTICLES.find(a=>a.year===1436);
 const farmer=move(born(1420,12),1436,'경상도');
 assert.ok(Annals.eligible(farmer,relief));
 J.ensure(farmer).region='평안도';
 assert.equal(Annals.eligible(farmer,relief),false);
 const hungry=move(born(1640,7),1670,'함경도');
 const disaster=Annals.ARTICLES.find(a=>a.year===1670);
 assert.ok(Annals.eligible(hungry,disaster));
 hungry.year=1671;assert.equal(Annals.eligible(hungry,disaster),false);
 const baby=move(born(1670,7),1670,'전라도');
 assert.equal(Annals.eligible(baby,disaster),false);
});

test('new cases respect place and chronology across illness, maritime work, markets and famines',()=>{
 const scenarios=[
  ['kja_10303017_002',1497,'함경도','전라도'],
  ['kka_11503021_001',1520,'전라도','평안도'],
  ['kka_11908007_004',1524,'평안도','강원도'],
  ['kpa_12302010_002',1645,'한양','경상도'],
  ['wua_10107019_001',1725,'충청도','함경도'],
  ['wva_10710008_002',1783,'전라도','평안도'],
  ['kva_11505010_002',1791,'충청도','함경도']
 ];
 for(const [id,year,place,other] of scenarios){
  const a=Annals.ARTICLES.find(x=>x.id===id);
  assert.ok(a,id);
  const adult=move(born(year-24,year+13),year,place);
  assert.equal(Annals.eligible(adult,a),true,id+' in '+place);
  J.ensure(adult).region=other;
  assert.equal(Annals.eligible(adult,a),false,id+' outside '+place);
  adult.year=year-1;
  assert.equal(Annals.eligible(adult,a),false,id+' too early');
 }
});
test('only an actual royal annals record can create its own source-linked choice',()=>{
 const l=move(born(1473,314),1497,'함경도'),s=Annals.ensure(l);
 Annals.yearly(l,s);clearChoices(l);
 assert.match(l.pending,/^joseonAnnals:/);
 const source=l.log.find(e=>e.kind==='joseonAnnals-fact');
 assert.ok(source?.sourceUrl.endsWith('kja_10303017_002'));
 assert.equal(l.choose(1),true);
 const saved=JSON.parse(JSON.stringify(l.snapshot()));
 const next=Sim.Life.restore(saved);
 assert.equal(Annals.sourceFor(next).articleId,'kja_10303017_002');
 assert.ok(Annals.ensure(next).decisions.some(d=>d.articleId==='kja_10303017_002'));
});
test('debates and memorials are not falsely described as automatically enacted law',()=>{
 const hunt=Annals.ARTICLES.find(a=>a.year===1439);
 const levy=Annals.ARTICLES.find(a=>a.year===1750);
 const sea=Annals.ARTICLES.find(a=>a.year===1778);
 assert.match(hunt.fact,/포획/);
 assert.match(levy.fact,/논|검토/);
 assert.match(sea.fact,/상소/);
 assert.doesNotMatch(levy.scene,/모든 백성의 군포가 줄었다/);
});
test('record alone cannot change fictional household; decisions and followups are saved',()=>{
 const l=move(born(1640,103),1670,'경상도'),grain=V2.ensure(l).grain,s=Annals.ensure(l);
 Annals.yearly(l,s);assert.equal(V2.ensure(l).grain,grain);
 assert.ok(l.log.some(e=>e.kind==='joseonAnnals-fact'&&e.sourceUrl.endsWith('wra_11110015_001')));
 clearChoices(l);
 assert.match(l.pending,/^joseonAnnals:/);
 assert.equal(l.choose(1),true);
 assert.equal(Annals.sourceFor(l).articleId,'wra_11110015_001');
 const c=l.log.findLast(e=>e.kind==='joseonAnnals-choice');
 assert.ok(c.causeId);
 const copy=Sim.Life.restore(JSON.parse(JSON.stringify(l.snapshot())));
 assert.deepEqual(Annals.sourceFor(copy),Annals.sourceFor(l));
 assert.deepEqual(Annals.ensure(copy).decisions,Annals.ensure(l).decisions);
 copy.year=1672;copy.age=32;copy.pending=null;Annals.yearly(copy,Annals.ensure(copy));
 assert.ok(copy.log.some(e=>e.kind==='joseonAnnals-followup'&&e.causeId===c.causeId));
});
test('legacy saves do not retroactively invent historical encounters',()=>{
 const l=move(born(1680,11),1700,'충청도');
 const old=l.snapshot();delete old.joseonAnnals;
 const restored=Sim.Life.restore(JSON.parse(JSON.stringify(old)));
 assert.equal(Annals.sourceFor(restored),null);
 assert.equal(Annals.ensure(restored).seen.length,0);
});
test('multiple full lives progress with no new deadlocks',()=>{
 let articles=0;
 for(const year of [1392,1420,1430,1640,1730,1750])for(let seed=1;seed<=12;seed++){
  const l=born(year,year+seed*499);let steps=0;
  while(l.alive&&l.year<Math.min(1899,year+77)&&steps++<520){
   if(l.pending){const p=l.getChoice();if(p)assert.equal(l.choose(seed%p.options.length),true);
    else if(l.getReflection())assert.equal(l.reflect(''),true);
    else assert.fail('Unknown '+l.pending);
   }else assert.equal(l.tick(),true);
  }
  assert.ok(steps<520,'stalled '+l.year);
  const copy=Sim.Life.restore(JSON.parse(JSON.stringify(l.snapshot())));
  assert.deepEqual(Annals.sourceFor(copy),Annals.sourceFor(l));
  for(const e of l.log.filter(e=>e.kind==='joseonAnnals-fact')){
   const a=Annals.ARTICLES.find(a=>a.url===e.sourceUrl);
   assert.ok(a);assert.equal(e.year,a.year);articles++;
  }
 }
 assert.ok(articles>6,'too few primary-source encounters: '+articles);
});
test('reading-source UI is collapsed and script loads in the right order',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),game=fs.readFileSync(path.join(root,'game.js'),'utf8');
 assert.ok(html.indexOf('joseon-v9-village.js')<html.indexOf('joseon-annals-v10.js'));
 assert.ok(html.indexOf('joseon-annals-v10.js')<html.indexOf('colonial-daily-v2.js'));
 assert.ok(html.includes('details id="annalsSourcePanel"'));
 assert.ok(html.includes('id="annalsSourceLink"'));
 assert.ok(game.includes('Annals?.sourceFor'));
 assert.ok(game.includes('joseonAnnals-followup'));
});

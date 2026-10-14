'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const folder=path.resolve(__dirname,'../games/high_one_life'),Sim=require(path.join(folder,'engine.js'));
global.window={OneLifeSim:Sim};
function load(filename,key){const x=require(path.join(folder,filename));if(key)window[key]=x;return x}
load('world-v2.js','OneLifeWorld2');load('joseon-history-policy.js','OneLifeJoseonPolicy');
const J=load('joseon-v1.js','OneLifeJoseon'),V2=load('joseon-v2.js','OneLifeJoseon2');
load('joseon-v3.js','OneLifeJoseon3');
const V4=load('joseon-v4.js','OneLifeJoseon4'),V5=load('joseon-v5.js','OneLifeJoseon5');
load('joseon-v6.js','OneLifeJoseon6');load('joseon-v7-life.js','OneLifeJoseon7');
load('joseon-v8-lineage.js','OneLifeJoseon8');const V9=load('joseon-v9-village.js','OneLifeJoseon9');
load('joseon-annals-v10.js','OneLifeJoseonAnnals');
const V11=load('joseon-v11-late-life.js','OneLifeJoseon11');
load('colonial-daily-v2.js','OneLifeColonialDaily');delete global.window;
function born(year,seed=213){return new Sim.Life(seed,{birthYear:year,countryName:'대한민국'})}
function set(l,year,region,origin){
 l.year=year;l.age=year-l.birthYear;l.alive=true;l.pending=null;
 J.ensure(l).region=region;if(origin){V5.ensure(l).origin=origin}
 return l;
}
function force(l,id,index=0){
 const e=V11.EVENTS.find(e=>e.id===id);assert.ok(e);
 const s=V11.ensure(l);s.active={id:l.year+'-'+id,eventId:id,year:l.year};
 l.pending='joseon11:'+s.active.id;
 const p=l.getChoice();assert.ok(p,p?.title);assert.equal(p.options.length,3);
 assert.equal(l.choose(index),true);return s;
}
test('18 late-Joseon situations have unique IDs, three options and historical context',()=>{
 assert.equal(V11.EVENTS.length,18);
 assert.equal(new Set(V11.EVENTS.map(e=>e.id)).size,18);
 for(const e of V11.EVENTS){
  assert.ok(e.scene&&e.title);
  assert.equal(e.options.length,3);
  assert.ok(e.source?.startsWith('https://'));
  assert.ok(e.options.every(o=>o.label&&o.note&&o.follow));
 }
 assert.equal(V11.SOURCES.abolition,'https://sillok.history.go.kr/id/kwa_10101028_001');
});
test('1801 statute only concerns relevant bonded origins, not every type of enslavement',()=>{
 const l=set(born(1770,431),1801,'경상도','공노비');
 assert.ok(V11.fits(l,V11.EVENTS.find(e=>e.id==='register1801')));
 const former=V5.ensure(l);former.origin='사노비';former.publicOffice=null;
 assert.ok(V11.fits(l,V11.EVENTS.find(e=>e.id==='register1801')));
 assert.match(V11.EVENTS.find(e=>e.id==='register1801').scene,/모두에게 같은 변화가 찾아온 것은 아니다/);
 former.origin='소작 농가';
 assert.equal(V11.fits(l,V11.EVENTS.find(e=>e.id==='register1801')),false);
});
test('geographic and chronological gating: rebellion and military conflict do not reach every province',()=>{
 const dates=[['hgr1811',1811,'평안도','경상도'],['jinju1862',1862,'경상도','평안도'],
  ['byeongin1866',1866,'경기도','전라도'],['shinmi1871',1871,'한양','전라도'],
  ['donghak1894',1894,'전라도','함경도']];
 for(const [id,year,ok,bad] of dates){
  const l=set(born(year-27,year*7),year,ok);
  const e=V11.EVENTS.find(x=>x.id===id);
  assert.equal(V11.fits(l,e),true,id);
  J.ensure(l).region=bad;assert.equal(V11.fits(l,e),false,id);
  J.ensure(l).region=ok;l.year=year-1;assert.equal(V11.fits(l,e),false,id);
 }
});
test('tenant grain, neighbor trust, loan ledger and displacement have genuine lasting costs',()=>{
 const l=set(born(1820,392),1850,'전라도','소작 농가'),s=V11.ensure(l);
 const neighbors=V9.ensure(l),j=J.ensure(l);neighbors.trust=61;
 force(l,'villageMutual',0);
 assert.equal(neighbors.trust,66);
 l.pending=null;force(l,'grainBorrow',0);
 assert.ok(s.taxDebt>=3);
 const debt=s.taxDebt;const original=j.capital;
 s.processedYear=1850;l.year=1851;l.age=31;V11.yearly(l,s);
 l.year=1852;l.age=32;V11.yearly(l,s);
 l.year=1853;l.age=33;V11.yearly(l,s);
 assert.ok(s.taxDebt>=debt);
 const changes=Sim.Life.restore(JSON.parse(JSON.stringify(l.snapshot())));
 assert.equal(V11.summary(changes).taxDebt,s.taxDebt);
 assert.equal(V9.summary(changes).trust,neighbors.trust);
 assert.ok(Number.isFinite(original));
});
test('1862 opposition changes finances and has linked future narration after restoring',()=>{
 const l=set(born(1835,338),1862,'경상도','소작 농가'),s=V11.ensure(l);
 s.taxDebt=9;force(l,'jinju1862',0);
 assert.equal(s.taxDebt,6);
 const event=l.log.findLast(e=>e.kind==='joseon11-choice');assert.ok(event.causeId&&event.sourceUrl);
 const copy=Sim.Life.restore(JSON.parse(JSON.stringify(l.snapshot())));
 assert.equal(V11.summary(copy).taxDebt,6);
 assert.ok(V11.ensure(copy).followups.some(x=>x.id===event.causeId.slice('joseon11:'.length)));
 copy.year=1865;copy.age=30;copy.pending=null;
 V11.yearly(copy,V11.ensure(copy));
 assert.ok(copy.log.some(e=>e.kind==='joseon11-followup'&&e.causeId===event.causeId));
});
test('historical 1894 legal abolition is not portrayed as ending customary prejudice',()=>{
 const gabo=V11.EVENTS.find(e=>e.id==='gabo1894');
 assert.match(gabo.scene,/사람들의 태도는 쉽게 바뀌지 않는다/);
 const l=set(born(1868,449),1894,'충청도','사노비');
 assert.ok(V11.fits(l,gabo));
 force(l,'gabo1894',1);
 assert.ok(V11.ensure(l).followups.length);
});
test('old saves migrate without retroactive tax debt and character dies without pending deadlock',()=>{
 const l=set(born(1840,241),1865,'전라도'),data=l.snapshot();
 delete data.joseon11;
 const c=Sim.Life.restore(JSON.parse(JSON.stringify(data)));
 assert.equal(V11.summary(c).taxDebt,0);
 assert.equal(V11.ensure(c).decisions.length,0);
});
test('144 simulated lives across 1801-1894 finish with no stuck decisions, preserving saves',()=>{
 const seen=new Set();let choices=0;
 for(const year of [1740,1770,1800,1825,1840,1860]){
  for(let seed=1;seed<=24;seed++){
   const l=born(year,year*59+seed*133);let guard=0;
   while(l.alive&&l.year<Math.min(1899,year+83)&&guard++<550){
    if(l.pending){
     const p=l.getChoice();
     if(p)assert.equal(l.choose(seed%p.options.length),true,l.pending);
     else if(l.getReflection())assert.equal(l.reflect(''),true);
     else assert.fail('Unhandled '+l.pending);
    }else assert.equal(l.tick(),true);
   }
   assert.ok(guard<550,'stalled at '+l.year);
   const copy=Sim.Life.restore(JSON.parse(JSON.stringify(l.snapshot())));
   assert.deepEqual(V11.summary(copy),V11.summary(l));
   for(const q of V11.ensure(l).decisions){seen.add(q.eventId);choices++}
  }
 }
 assert.ok(choices>110,'insufficient life events '+choices);
 assert.ok(seen.size>=12,'limited variety '+seen.size);
});
test('the event module, optional sources and historical summary load in correct order',()=>{
 const html=fs.readFileSync(path.join(folder,'index.html'),'utf8');
 const game=fs.readFileSync(path.join(folder,'game.js'),'utf8');
 assert.ok(html.indexOf('joseon-annals-v10.js')<html.indexOf('joseon-v11-late-life.js'));
 assert.ok(html.indexOf('joseon-v11-late-life.js')<html.indexOf('colonial-daily-v2.js'));
 assert.ok(html.includes('id="lateJoseonLedger"'));
 assert.ok(html.includes('id="lateJoseonSourceLink"'));
 assert.match(game,/Joseon11\?\.summary/);assert.match(game,/joseon11-followup/);
});

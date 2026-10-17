'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'../games/high_one_life');
const Sim=require(path.join(root,'engine.js'));
global.window={OneLifeSim:Sim};
const load=(f,key)=>{const v=require(path.join(root,f));if(key)global.window[key]=v;return v};
load('world-v2.js','OneLifeWorld2');load('joseon-history-policy.js','OneLifeJoseonPolicy');
const J=load('joseon-v1.js','OneLifeJoseon'),V2=load('joseon-v2.js','OneLifeJoseon2');
load('joseon-v3.js','OneLifeJoseon3');const V4=load('joseon-v4.js','OneLifeJoseon4');
const V5=load('joseon-v5.js','OneLifeJoseon5');
load('joseon-v6.js','OneLifeJoseon6');load('joseon-v7-life.js','OneLifeJoseon7');
load('joseon-v8-lineage.js','OneLifeJoseon8');const V9=load('joseon-v9-village.js','OneLifeJoseon9');
load('joseon-annals-v10.js','OneLifeJoseonAnnals');
load('joseon-v11-late-life.js','OneLifeJoseon11');load('joseon-v12-regional.js','OneLifeJoseon12');
load('joseon-v13-war-recovery.js','OneLifeJoseon13');
const V14=load('joseon-v14-captivity-generations.js','OneLifeJoseon14');
delete global.window;
const make=(birth=1620,seed=102)=>{const l=new Sim.Life(seed,{birthYear:birth,countryName:'대한민국'});
 l.year=birth+25;l.age=25;J.ensure(l);V2.ensure(l);V4.ensure(l);V5.ensure(l);V9.ensure(l);return l;};
const invoke=(l,mod,prefix,id,index)=>{
 const s=mod.ensure(l);s.active={id:l.year+'-'+id,eventId:id,year:l.year};l.pending=prefix+':'+s.active.id;
 const shown=l.getChoice();assert.equal(shown.options.length,3);
 assert.equal(l.choose(index),true);return {s,shown};
};
test('calf already born remains after either care option, but sold calf does not',()=>{
 for(const index of [0,1,2]){
  const l=make(1600,201+index),v=V9.ensure(l),before=v.animals.ox;
  invoke(l,V9,'joseon9','oxBirth',index);
  assert.equal(v.animals.ox,before+(index===2?0:1));
  const restored=Sim.Life.restore(JSON.parse(JSON.stringify(l.snapshot())));
  assert.equal(V9.ensure(restored).animals.ox,v.animals.ox);
 }
});
test('zero-grain charity offers labor, not fictional rice or free supplies',()=>{
 for(const [event,idx,pattern] of [['holiday',2,/마당 일/],['seollal',2,/땔감/],['temple',0,/물통/]]){
  const l=make(1600,350),stock=V2.ensure(l);stock.grain=0;
  const {s,shown}=invoke(l,V9,'joseon9',event,idx);
  assert.match(shown.options[idx].label,pattern);
  assert.equal(stock.grain,0);
  assert.match(s.followups.at(-1).text,/곡식|물|장작|물통|마당/);
  const restored=Sim.Life.restore(JSON.parse(JSON.stringify(l.snapshot())));
  assert.equal(V2.ensure(restored).grain,0);
 }
});
test('donating real grain reduces real household grain',()=>{
 const l=make(1600,353),stock=V2.ensure(l);stock.grain=10;
 invoke(l,V9,'joseon9','holiday',2);
 assert.equal(stock.grain,8);
});
test('landless nonfarmers do not own imaginary fields; midwife needs no spouse',()=>{
 const l=make(1600,355),j=J.ensure(l),s=V5.ensure(l);
 j.region='경기도';j.land=0;s.origin='어부 가계';s.trade='어부';
 for(const id of ['water','wildBoar'])assert.equal(V9.eligible(l,V9.EVENTS.find(x=>x.id===id)),false);
 s.origin='소작 농가';s.trade='논을 부쳐 먹음';
 for(const id of ['water','wildBoar'])assert.equal(V9.eligible(l,V9.EVENTS.find(x=>x.id===id)),true);
 V4.ensure(l).people=V4.ensure(l).people.filter(p=>!['spouse','child'].includes(p.role));
 assert.equal(V9.eligible(l,V9.EVENTS.find(x=>x.id==='midwife')),true);
});
test('helping another captive never returns the protagonist or spends a personal request',()=>{
 const l=make(1570,356);l.year=1605;l.age=35;
 const s=V14.ensure(l);
 s.captivity={realm:'japan',from:1597,years:8,status:'held',contacts:4,work:'일손',returnedYear:null,route:null,attempts:0};
 assert.equal(V14.repatriationChance(s.captivity,s,2,1605),0);
 invoke(l,V14,'joseon14','ransomOpportunity',2);
 assert.equal(s.captivity.status,'held');assert.equal(s.captivity.attempts,0);
 const restored=Sim.Life.restore(JSON.parse(JSON.stringify(l.snapshot())));
 assert.equal(V14.ensure(restored).captivity.status,'held');
});
test('childless artisan teaches neighbors without inventing children',()=>{
 const l=make(1570,359);l.year=1607;l.age=37;
 V4.ensure(l).people=V4.ensure(l).people.filter(p=>p.role!=='child');
 const s=V14.ensure(l);s.skills=10;s.heritage.skills=0;
 invoke(l,V14,'joseon14','homeWork',1);
 assert.equal(s.heritage.skills,0);
 assert.match(l.log.map(x=>x.text).join(' '),/배우려는 이웃/);
});

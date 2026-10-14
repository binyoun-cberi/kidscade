'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const dir=path.resolve(__dirname,'../games/high_one_life'),Sim=require(path.join(dir,'engine.js'));
global.window={OneLifeSim:Sim};
function load(file,key){const v=require(path.join(dir,file));if(key)global.window[key]=v;return v;}
load('world-v2.js','OneLifeWorld2');
load('joseon-history-policy.js','OneLifeJoseonPolicy');
const J=load('joseon-v1.js','OneLifeJoseon');
const V2=load('joseon-v2.js','OneLifeJoseon2');
load('joseon-v3.js','OneLifeJoseon3');
const V4=load('joseon-v4.js','OneLifeJoseon4');
const V5=load('joseon-v5.js','OneLifeJoseon5');
load('joseon-v6.js','OneLifeJoseon6');
const V7=load('joseon-v7-life.js','OneLifeJoseon7');delete global.window;
const birth=(year,seed=17)=>{
 const l=new Sim.Life(seed,{birthYear:year,countryName:'대한민국'});
 J.ensure(l);V2.ensure(l);V4.ensure(l);V5.ensure(l);V7.ensure(l);return l;
};
const setAge=(l,age)=>{
 l.year=l.birthYear+age;l.age=age;l.pending=null;l.alive=true;return l;
};
test('39 unique everyday choices spanning family, class, learning, illness, material culture and disasters',()=>{
 assert.equal(V7.EVENTS.length,39);
 assert.equal(new Set(V7.EVENTS.map(x=>x.id)).size,39);
 assert.deepEqual([...new Set(V7.EVENTS.map(x=>x.group))].sort(),
  ['family','illness','learning','livelihood','material','place','skill','status','village','weather','wild'].sort());
 for(const e of V7.EVENTS){
  assert.ok(e.title&&e.desc,e.id);
  assert.equal(e.options.length,3,e.id);
  for(const o of e.options)assert.ok(o.label&&o.note&&o.after,e.id);
 }
});
test('dated institutions cannot occur before they existed',()=>{
 const before= setAge(birth(1460),35),after=setAge(birth(1570),35);
 assert.equal(V7.eligible(before,V7.EVENTS.find(x=>x.id==='hyangyak')),false);
 assert.equal(V7.eligible(before,V7.EVENTS.find(x=>x.id==='seowon')),false);
 assert.equal(V7.eligible(after,V7.EVENTS.find(x=>x.id==='hyangyak')),true);
 const j=J.ensure(after);j.literacy=3;after.gender='남자';
 V5.ensure(after).origin='서리 가계';
 assert.equal(V7.eligible(after,V7.EVENTS.find(x=>x.id==='seowon')),true);
 const lady=setAge(birth(1780),25);lady.gender='여자';
 assert.equal(V7.eligible(lady,V7.EVENTS.find(x=>x.id==='gache')),true);
 const post=setAge(birth(1790),25);post.gender='여자';
 assert.equal(V7.eligible(post,V7.EVENTS.find(x=>x.id==='gache')),false);
 assert.equal(V7.eligible(post,V7.EVENTS.find(x=>x.id==='gacheBan')),true);
});
test('bonded servants and hired workers have separate choices',()=>{
 const l=setAge(birth(1660),22),social=V5.ensure(l),own=J.ensure(l);
 own.region='강원도';social.origin='사노비';social.freed=false;
 assert.equal(V7.eligible(l,V7.EVENTS.find(e=>e.id==='master')),true);
 assert.equal(V7.eligible(l,V7.EVENTS.find(e=>e.id==='servant')),false);
 social.origin='소작 농가';social.freed=false;
 assert.equal(V7.eligible(l,V7.EVENTS.find(e=>e.id==='master')),false);
 assert.equal(V7.eligible(l,V7.EVENTS.find(e=>e.id==='servant')),true);
});
test('choices keep named outcomes after saving and reloading',()=>{
 const l=setAge(birth(1710,112),22),s=V7.ensure(l),e=V7.EVENTS.find(x=>x.id==='friendship');
 s.active={id:l.year+'-'+e.id,eventId:e.id,year:l.year};l.pending='joseon7:'+s.active.id;
 const old=l.stats.bonds;assert.equal(l.getChoice().options.length,3);assert.equal(l.choose(0),true);
 assert.ok(l.stats.bonds>old);
 const chosen=l.log.findLast(x=>x.kind==='joseon7-choice');
 assert.ok(chosen?.causeId);
 const snap=JSON.parse(JSON.stringify(l.snapshot())),copy=Sim.Life.restore(snap);
 assert.deepEqual(V7.summary(copy),V7.summary(l));
 assert.deepEqual(V7.ensure(copy).followups,V7.ensure(l).followups);
 assert.equal(copy.pending,l.pending);
 copy.year+=3;copy.age+=3;copy.pending=null;V7.yearly(copy,V7.ensure(copy));
 assert.ok(copy.log.some(x=>x.kind==='joseon7-followup'&&x.causeId===chosen.causeId));
});
test('multiple historical lifetimes progress with no stuck personal-life queue',()=>{
 let count=0,seen=new Set(),later=0;
 for(const year of [1392,1500,1580,1700,1790,1880])for(let seed=1;seed<=28;seed++){
  const life=birth(year,year*13+seed*109);
  let guard=0;
  while(life.alive&&life.year<year+76&&guard++<350){
   if(life.pending){
    const prompt=life.getChoice();
    if(prompt)assert.equal(life.choose(seed%prompt.options.length),true,life.pending);
    else if(life.getReflection())assert.equal(life.reflect(''),true);
    else assert.fail('unexpected pending '+life.pending);
   }else assert.equal(life.tick(),true);
  }
  assert.ok(guard<350,life.year+' stuck');
  const decisions=life.log.filter(x=>x.kind==='joseon7-choice');
  for(const d of decisions)seen.add(d.causeId.split('-').at(-1));
  later+=life.log.filter(x=>x.kind==='joseon7-followup').length;
  const copy=Sim.Life.restore(JSON.parse(JSON.stringify(life.snapshot())));
  assert.equal(copy.pending,life.pending);
  assert.deepEqual(V7.summary(copy),V7.summary(life));
  count+=decisions.length;
 }
 assert.ok(count>700,'not enough lived-life events: '+count);
 assert.ok(seen.size>24,'too few distinct encounters: '+seen.size);
 assert.ok(later>450,'not enough delayed consequences: '+later);
});
test('entry script loads the life module after existing Joseon rules',()=>{
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 assert.ok(html.indexOf('joseon-v6.js')<html.indexOf('joseon-v7-life.js'));
 assert.ok(html.indexOf('joseon-v7-life.js')<html.indexOf('game.js'));
});

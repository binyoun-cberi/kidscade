'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../games/high_one_life');
const Sim=require(path.join(root,'engine.js'));
global.window={OneLifeSim:Sim};
const W2=require(path.join(root,'world-v2.js'));
global.window.OneLifeWorld2=W2;
const J=require(path.join(root,'joseon-v1.js'));
global.window.OneLifeJoseon=J;
const V2=require(path.join(root,'joseon-v2.js'));
global.window.OneLifeJoseon2=V2;
const V3=require(path.join(root,'joseon-v3.js'));
global.window.OneLifeJoseon3=V3;
const V4=require(path.join(root,'joseon-v4.js'));
delete global.window;
function birth(year,seed){
 const l=new Sim.Life(seed,{birthYear:year,countryName:'대한민국'});
 J.ensure(l);V2.ensure(l);V3.ensure(l);V4.ensure(l);return l;
}
function settle(l,choice=0){
 let guard=0;
 while(l.alive&&l.pending){
  assert.ok(++guard<28,'stuck with '+l.pending);
  const p=l.getChoice();
  if(p)assert.equal(l.choose(choice%p.options.length),true);
  else if(l.getReflection())assert.equal(l.reflect(''),true);
  else assert.fail('unhandled '+l.pending);
 }
}
function until(l,target,choice=0){
 let guard=0;
 while(l.alive&&l.year<target){
  assert.ok(++guard<135,'year stuck '+l.year);
  if(l.pending)settle(l,choice);
  else assert.equal(l.tick(),true);
 }
 return l;
}
test('named family has stable identities and different ages',()=>{
 const l=birth(1500,17);
 const f=V4.summary(l);
 assert.equal(f.parents,2);
 assert.ok(f.people.every(x=>x.name&&x.trait&&Number.isInteger(x.age)));
 assert.equal(new Set(f.people.map(x=>x.id)).size,f.people.length);
 assert.equal(J.ensure(l).household,1+f.alive);
 const save=JSON.parse(JSON.stringify(l.snapshot()));
 const rr=Sim.Life.restore(save);
 assert.deepEqual(V4.summary(rr).people,f.people);
 until(l,1510);
 if(l.alive)assert.ok(V4.summary(l).people.some(x=>x.role==='mother'&&x.age>35));
});
test('marriage, birth and family deaths have independent records',()=>{
 const l=until(birth(1500,17),1560);
 assert.ok(l.alive);
 const f=V4.summary(l);
 assert.ok(f.spouse);
 assert.ok(f.people.some(x=>x.role==='child'&&x.age>=16));
 assert.ok(f.people.some(x=>['mother','father'].includes(x.role)&&!x.alive));
 assert.ok(l.log.some(x=>x.kind==='joseon4-family'));
 assert.ok(l.log.some(x=>x.kind==='joseon4-memory'&&x.text.includes('세상을 떠났다')));
});
test('family choice is actionable and saved; consequences occur three years later',()=>{
 const l=birth(1500,17);
 let found=false,guard=0;
 while(l.alive&&l.year<1550&&guard++<135){
  if(l.pending?.startsWith('joseon4:')){found=true;break;}
  if(l.pending)settle(l);else l.tick();
 }
 assert.ok(found,'family choice never appeared');
 const rr=Sim.Life.restore(JSON.parse(JSON.stringify(l.snapshot())));
 assert.equal(rr.pending,l.pending);
 assert.deepEqual(rr.getChoice(),l.getChoice());
 const start=rr.year;
 assert.equal(rr.choose(1),true);
 assert.ok(rr.log.some(x=>x.kind==='joseon4-choice'));
 const before=rr.joseon4.memories.length;
 until(rr,start+3,1);
 if(rr.alive){
  assert.ok(rr.log.some(x=>x.kind==='joseon4-followup'));
  assert.ok(rr.joseon4.memories.length>before);
 }
 const saved=Sim.Life.restore(JSON.parse(JSON.stringify(rr.snapshot())));
 assert.equal(saved.joseon4.decisions.length,rr.joseon4.decisions.length);
 assert.equal(saved.joseon4.followups.length,rr.joseon4.followups.length);
});
test('legacy Joseon saves still open; modern births unaffected',()=>{
 const legacy=birth(1700,42).snapshot();delete legacy.joseon4;
 const old=Sim.Life.restore(legacy);
 assert.ok(V4.summary(old));
 for(const year of [1900,1919,2026]){
  const l=birth(year,92);
  assert.equal(V4.summary(l),null);
  assert.equal(l.snapshot().joseon4,undefined);
 }
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.ok(html.indexOf('joseon-v3.js')<html.indexOf('joseon-v4.js'));
 assert.ok(html.indexOf('joseon-v4.js')<html.indexOf('game.js'));
});
test('family chronology does not stall during 450 Joseon lifetimes',()=>{
 let lives=0,choices=0;
 for(const year of [1392,1450,1540,1580,1640,1670,1730,1810,1870]){
  for(let seed=1;seed<=50;seed++){
   const l=birth(year,seed+Math.imul(year,13));
   let ticks=0;
   while(l.alive&&l.age<100){
    assert.ok(++ticks<280,'stalled '+year+'/'+seed+' '+l.pending);
    if(l.pending)settle(l,seed%3);else l.tick();
    assert.equal(l.year,l.birthYear+l.age);
    const s=V4.ensure(l);
    assert.ok(s.queue.length<=8&&s.people.length<=12);
    assert.ok(s.followups.length<=24);
    assert.equal(new Set(s.people.map(x=>x.id)).size,s.people.length);
   }
   choices+=V4.ensure(l).decisions.length;lives++;
  }
 }
 assert.equal(lives,450);
 assert.ok(choices>250);
});

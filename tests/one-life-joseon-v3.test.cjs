'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../games/high_one_life');
const Sim=require(path.join(root,'engine.js'));
global.window={OneLifeSim:Sim};
const W2=require(path.join(root,'world-v2.js'));global.window.OneLifeWorld2=W2;
const J=require(path.join(root,'joseon-v1.js'));global.window.OneLifeJoseon=J;
const V2=require(path.join(root,'joseon-v2.js'));global.window.OneLifeJoseon2=V2;
const V3=require(path.join(root,'joseon-v3.js'));delete global.window;
function born(seed,year){
 const life=new Sim.Life(seed,{birthYear:year,countryName:'대한민국'});
 J.ensure(life);V2.ensure(life);V3.ensure(life);
 return life;
}
function settle(life,index=0){
 let attempts=0;
 while(life.alive&&life.pending){
  assert.ok(attempts++<20,'pending chain');
  const choice=life.getChoice();
  if(choice)assert.equal(life.choose(index%choice.options.length),true,'choose failed '+choice.title);
  else if(life.getReflection())assert.equal(life.reflect(''),true);
  else assert.fail('unrecognized pending '+life.pending);
 }
}
function toYear(life,year,index=0){
 let guard=0;
 while(life.alive&&life.year<year){
  assert.ok(guard++<135,'timeline stopped');
  if(life.pending)settle(life,index);else assert.equal(life.tick(),true);
 }
 return life;
}
test('Joseon scenes render with valid canvas-only drawing for every landscape',()=>{
 const kindNames=new Set();
 const fills=new Set();
 const fake={width:600,height:258,getContext:()=>({
  fillRect(x,y,w,h){assert.ok([x,y,w,h].every(Number.isFinite));assert.ok(w>0&&h>0);fills.add(this.fillStyle);},
  clearRect(){},set fillStyle(v){this._color=v;},get fillStyle(){return this._color;}
 })};
 for(let year of [1480,1510,1580,1618,1680,1750,1810,1880])
  for(let seed=1;seed<=50;seed++){
   const life=born(seed,year);
   kindNames.add(V3.summary(life).scene);
   assert.equal(V3.paint(fake,life),true);
  }
 for(const kind of ['farm','market','mountain','port','study'])assert.ok(kindNames.has(kind),'missing '+kind);
 assert.ok(fills.size>=10,'little visual palette variation');
 assert.equal(V3.paint(fake,born(77,2026)),false);
});
test('seasonal art and local childhood stories vary without invented historical dates',()=>{
 const l=born(17,1500);
 const scenes=new Set(),seasons=new Set();
 for(let i=0;i<30&&l.alive;i++){
  if(l.pending)settle(l);else l.tick();
  scenes.add(V3.summary(l).scene);
  seasons.add(V3.summary(l).season);
 }
 assert.ok(seasons.size>=3,'years should display changing seasons');
 assert.ok(V3.ensure(l).storiesSeen.length>=2);
 assert.ok(l.log.some(e=>e.kind==='joseon3-memory'));
 assert.ok(!l.log.filter(e=>e.kind==='joseon3-memory').some(e=>e.text.includes('가상 인물')));
});
test('everyday apprenticeship opens at 12 and affects later years',()=>{
 const l=toYear(born(17,1580),1592);
 assert.equal(l.age,12);
 // v1 war event may precede the apprenticeship; eventually it must be offered.
 settle(l,0);
 assert.ok(V3.ensure(l).decisions.some(d=>d.kind==='apprentice'),'apprenticeship did not occur');
 const d=V3.ensure(l).decisions.find(d=>d.kind==='apprentice');
 assert.equal(d.age,12);
 toYear(l,1595);
 if(l.alive)assert.ok(l.log.some(e=>e.kind==='joseon3-followup'));
});
test('famine and family choices can coexist in one saved life without losing pending actions',()=>{
 const l=toYear(born(17,1645),1670);
 assert.equal(l.year,1670);assert.ok(l.alive);
 assert.match(l.getChoice().title,/경신대기근/);
 const old=JSON.parse(JSON.stringify(l.snapshot()));
 const restored=Sim.Life.restore(old);
 assert.equal(restored.pending,l.pending);
 assert.equal(restored.getChoice().title,l.getChoice().title);
 settle(restored,1);
 toYear(restored,1680,2);
 const second=Sim.Life.restore(JSON.parse(JSON.stringify(restored.snapshot()));
 assert.ok(second);
 assert.equal(second.joseon3.choiceCount,restored.joseon3.choiceCount);
 assert.equal(second.joseon2.grain,restored.joseon2.grain);
 assert.equal(second.joseon.hardshipUntil,restored.joseon.hardshipUntil);
});
test('trade, farming and family legacy make different trajectories',()=>{
 const farmer=toYear(born(26,1710),1737,0);
 const trader=toYear(born(26,1710),1737,1);
 assert.ok(farmer.alive&&trader.alive);
 const a=V3.ensure(farmer).decisions.find(d=>d.kind==='livelihood');
 const b=V3.ensure(trader).decisions.find(d=>d.kind==='livelihood');
 assert.ok(a&&b);assert.notEqual(a.action,b.action);
 assert.notEqual(J.ensure(farmer).land,J.ensure(trader).land);
});
test('modern births do not receive Joseon states or art and old saves remain compatible',()=>{
 for(const year of [1900,1919,2026]){
  const l=born(77,year);
  assert.equal(V3.summary(l),null);
  assert.equal(l.snapshot().joseon3,undefined);
 }
 const old=born(42,1700).snapshot();
 delete old.joseon3;
 const restored=Sim.Life.restore(old);
 assert.ok(restored);assert.equal(V3.ensure(restored).decisions.length,0);
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const order=['joseon-v1.js','joseon-v2.js','joseon-v3.js','game.js'];
 for(let i=1;i<order.length;i++)assert.ok(html.indexOf(order[i-1])<html.indexOf(order[i]));
});
test('multigeneration stress: 450 lives remain playable with bounded event state',()=>{
 let lives=0,stages=0;
 for(const year of [1392,1450,1540,1580,1640,1670,1730,1810,1870]){
  for(let seed=1;seed<=50;seed++){
   const life=born(seed+Math.imul(year,13),year);
   let guard=0;
   while(life.alive&&life.age<100){
    assert.ok(guard++<260,'simulation stuck '+year+'/'+seed+' '+life.pending);
    if(life.pending)settle(life,seed%3);else life.tick();
    assert.equal(life.year,life.birthYear+life.age);
    assert.ok(V3.ensure(life).decisions.length<=35);
    assert.ok(V3.ensure(life).followups.length<=20);
   }
   stages+=V3.ensure(life).choiceCount;lives++;
  }
 }
 assert.equal(lives,450);
 assert.ok(stages>300,'everyday choices never became reachable');
});

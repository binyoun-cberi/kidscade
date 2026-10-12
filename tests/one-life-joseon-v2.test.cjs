'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../games/high_one_life');
const Sim=require(path.join(root,'engine.js'));
global.window={OneLifeSim:Sim};
const W2=require(path.join(root,'world-v2.js'));global.window.OneLifeWorld2=W2;
const J=require(path.join(root,'joseon-v1.js'));global.window.OneLifeJoseon=J;
const V2=require(path.join(root,'joseon-v2.js'));delete global.window;
function birth(seed,year){
 const l=new Sim.Life(seed,{birthYear:year,countryName:'대한민국'});
 J.ensure(l);V2.ensure(l);return l;
}
function resolve(l,option=0){
 let n=0;
 while(l.alive&&l.pending&&n++<32){
  const choice=l.getChoice();
  if(choice)assert.equal(l.choose(Math.min(option,choice.options.length-1)),true);
  else if(l.getReflection())assert.equal(l.reflect(),true);
  else assert.fail('unhandled pending '+l.pending);
 }
 assert.ok(n<32,'pending did not resolve');
}
function until(l,year,option=0){
 let count=0;
 while(l.alive&&l.year<year&&count++<160){
  if(l.pending)resolve(l,option);else assert.equal(l.tick(),true);
 }
 return l;
}
test('Joseon rulers and regional livelihood differ without manufacturing statistical claims',()=>{
 assert.equal(V2.ruler(1418),'세종');
 assert.equal(V2.ruler(1671),'현종');
 assert.equal(V2.ruler(1776),'정조');
 assert.equal(V2.ruler(1895),'고종');
 const a=birth(3,1765),b=birth(17,1765);
 assert.equal(J.ensure(a).region,'한양');
 assert.equal(J.ensure(b).region,'전라도');
 assert.notEqual(V2.summary(a).regionWork,V2.summary(b).regionWork);
 assert.ok(Number.isInteger(V2.summary(a).grain));
 assert.equal(V2.summary(a).events,0);
});
test('1670-1671 famine affects food, livelihood and choices across save/reload',()=>{
 const l=until(birth(17,1645),1670);
 assert.equal(l.year,1670);assert.ok(l.alive);
 assert.match(l.getChoice().title,/경신대기근/);
 assert.equal(l.getChoice().options.length,3);
 assert.ok(l.log.some(e=>e.kind==='history'&&e.text.includes('경신대기근')));
 assert.ok(J.ensure(l).hardshipUntil>l.year);
 assert.ok(V2.summary(l).scarcityUntil>l.year);
 const original=JSON.parse(JSON.stringify(l.snapshot()));
 const restored=Sim.Life.restore(original);
 assert.equal(restored.pending,l.pending);
 assert.deepEqual(restored.getChoice(),l.getChoice());
 assert.equal(restored.joseon.hardshipUntil,l.joseon.hardshipUntil);
 assert.equal(restored.joseon2.scarcityUntil,l.joseon2.scarcityUntil);
 assert.equal(restored.profile.familyIncome,l.profile.familyIncome);
 const oldGiven=V2.summary(restored).helpGiven;
 resolve(restored,1);
 assert.equal(V2.summary(restored).helpGiven,oldGiven+1);
 assert.ok(restored.log.some(e=>e.kind==='joseon2-choice'));
 until(restored,1671,0);
 if(restored.alive){
  assert.ok(restored.log.some(e=>e.text.includes('경신대기근 지속')));
  assert.ok(V2.summary(restored).scarcityUntil>=1672);
 }
 const second=Sim.Life.restore(JSON.parse(JSON.stringify(restored.snapshot())));
 assert.equal(second.joseon2.helpGiven,restored.joseon2.helpGiven);
 assert.equal(second.joseon2.decisions.length,1);
});
test('1695 famine independently interrupts a later Joseon household',()=>{
 const l=until(birth(1,1668),1695);
 assert.ok(l.alive);
 assert.match(l.getChoice().title,/을병대기근/);
 resolve(l,2);
 assert.ok(J.summary(l).relocations>=1);
 assert.ok(V2.summary(l).scarcityUntil>l.year);
});
test('1791 market reform offers a Hanseong merchant family actual choices',()=>{
 const l=until(birth(3,1765),1791);
 assert.equal(J.ensure(l).region,'한양');
 assert.equal(l.getChoice()?.options.length,3);
 assert.match(l.getChoice().title,/장터/);
 const before=J.summary(l).capital;
 resolve(l,0);
 assert.equal(J.summary(l).occupation,'장사·수공업');
 assert.ok(J.summary(l).capital<before);
 assert.ok(V2.ensure(l).decisions.some(x=>x.action==='openTrade'));
});
test('1894 peasant movement intersects the legal status reform but never scripts participation',()=>{
 const l=until(birth(17,1869),1894);
 assert.ok(l.alive);
 assert.match(J.summary(l).status,/법적 신분제 폐지/);
 assert.match(l.getChoice().title,/동학농민운동/);
 assert.ok(!l.log.some(e=>e.text.includes('봉기에 직접 참가했다')));
 resolve(l,2);
 assert.equal(V2.summary(l).helpGiven,1);
 assert.equal(J.summary(l).status.includes('법적 신분제 폐지'),true);
});
test('age-29 decisions are grounded in province and have persistent outcomes',()=>{
 const l=until(birth(26,1710),1739);
 assert.ok(l.alive);assert.equal(J.ensure(l).region,'강원도');
 assert.match(l.getChoice().title,/강원도/);
 const land=J.ensure(l).land;
 resolve(l,0);
 assert.equal(J.ensure(l).land,land+1);
 assert.ok(V2.summary(l).decisions>=1);
 const restored=Sim.Life.restore(JSON.parse(JSON.stringify(l.snapshot())));
 assert.equal(restored.joseon2.decisions.length,l.joseon2.decisions.length);
});
test('old saves, modern-era births and century transitions preserve older systems',()=>{
 const l=birth(420,1880);
 const legacy=l.snapshot();delete legacy.joseon2;
 const old=Sim.Life.restore(legacy);
 assert.ok(old);assert.ok(V2.ensure(old));assert.equal(old.joseon2.decisions.length,0);
 const modern=birth(54321,1919);
 assert.equal(V2.summary(modern),null);
 assert.equal(modern.snapshot().joseon2,undefined);
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.ok(html.indexOf('joseon-v1.js')<html.indexOf('joseon-v2.js'));
 assert.ok(html.indexOf('joseon-v2.js')<html.indexOf('game.js'));
});
test('stress: historical play never stalls with nested choices or multiple crises',()=>{
 let ended=0;
 for(const year of [1392,1540,1645,1690,1730,1870]){
  for(let seed=10;seed<45;seed++){
   const life=birth(seed,year);
   let guard=0;
   while(life.alive&&life.age<100&&guard++<260){
    if(life.pending)resolve(life,seed%3);else life.tick();
    assert.equal(life.year,life.birthYear+life.age);
    assert.ok(life.joseon2.grain>=0&&life.joseon2.grain<=200);
    assert.ok(life.joseon.capital>=-120&&life.joseon.capital<=600);
   }
   assert.ok(guard<260,'loop stalled '+year+'/'+seed);
   ended++;
  }
 }
 assert.equal(ended,210);
});

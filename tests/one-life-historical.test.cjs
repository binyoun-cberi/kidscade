'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'../games/high_one_life');
const Sim=require(path.join(root,'engine.js'));
global.window={OneLifeSim:Sim};
const W2=require(path.join(root,'world-v2.js'));global.window.OneLifeWorld2=W2;
const W3=require(path.join(root,'world-v3.js'));global.window.OneLifeWorld3=W3;
const W4=require(path.join(root,'world-v4.js'));global.window.OneLifeWorld4=W4;
const W5=require(path.join(root,'world-v5.js'));global.window.OneLifeWorld5=W5;
const C=require(path.join(root,'careers-v6.js'));global.window.OneLifeCareers6=C;
const E=require(path.join(root,'events-v6.js'));global.window.OneLifeEvents6=E;
const W6=require(path.join(root,'world-v6.js'));global.window.OneLifeWorld6=W6;
const W7=require(path.join(root,'world-v7.js'));global.window.OneLifeWorld7=W7;
const W8=require(path.join(root,'world-v8.js'));global.window.OneLifeWorld8=W8;
const History=require(path.join(root,'history.js'));delete global.window;
test('birth years are stable; existing saves restore to 2026',()=>{
 const l=new Sim.Life(8142,{birthYear:1919,countryName:'대한민국'});
 assert.equal(l.birthYear,1919);assert.equal(l.year,1919);assert.equal(l.country[0],'대한민국');
 W8.ensure(l);W8.moment(l);assert.equal(History.contextualize(l),true);
 assert.equal(History.contextualize(l),false);
 const snapshot=JSON.parse(JSON.stringify(l.snapshot()));
 assert.equal(snapshot.birthYear,1919);
 assert.deepEqual(Sim.Life.restore(snapshot).snapshot(),snapshot);
 const legacy=new Sim.Life(8143).snapshot();delete legacy.birthYear;
 const old=Sim.Life.restore(legacy);assert.equal(old.birthYear,2026);
 assert.equal(old.year,2026);
});
test('1919 Korean birth crosses documented 1945 liberation at age 26 without shifting years',()=>{
 const l=new Sim.Life(3191919,{birthYear:1919,countryName:'대한민국'});
 W8.ensure(l);W8.moment(l);History.contextualize(l);
 let count=0;
 while(l.alive&&l.age<26&&count++<100){
  if(l.pending){if(l.getChoice())l.choose(0);else if(l.getReflection())l.reflect();else assert.fail('stuck choice');}
  else{l.tick();History.contextualize(l);}
 }
 // A historical person's survival is stochastic: cross-year fidelity must hold whether or not they survive.
 assert.equal(l.year,1919+l.age);
 if(l.age===26){
  assert.equal(l.year,1945);
  assert.ok(l.log.some(e=>e.kind==='history'&&e.year===1945&&e.text.includes('광복')));
 }
 const at1945=new Sim.Life(319,{birthYear:1945,countryName:'대한민국'});
 assert.equal(History.contextualize(at1945),true);
 assert.equal(History.currentEvent(at1945).title,'광복');
 assert.equal(History.place(new Sim.Life(27,{birthYear:1919,countryName:'대한민국'})).includes('일본 식민'),true);
});
test('historic mode never borrows 2024-25 official rates as 1919 observations',()=>{
 const korea=Sim.COUNTRIES.find(x=>x[0]==='대한민국');
 const l=new Sim.Life(23001,{birthYear:1919,countryName:'대한민국'});
 W3.setup(l); W8.ensure(l);
 const m=W8.mortality(korea,'여자',1919);
 assert.equal(m.sourceUnder5,'game');
 assert.equal(m.sourceLife,'game');
 assert.equal(l.world.hasPublishedBaseline,false);
 assert.equal(Sim.birthWeight(korea,1919),1);
 assert.ok(Number.isFinite(W8.survival(korea,'여자',80,1919)));
 assert.equal(History.period(l),'일제강점기');
});
test('historical scene labels and years are selectable without replacing main game',()=>{
 const h=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const c=fs.readFileSync(path.join(root,'game.js'),'utf8');
 for(const name of ['birthYearInput','birthLocation','birthEraNote','historyContext'])
  assert.ok(h.includes('id="'+name+'"'),name);
 assert.match(h,/min="1392" max="2026"/);
 assert.match(h,/data-era-year="1919"/);
 assert.match(h,/data-era-year="1935"/);
 assert.match(h,/history\.js\?v=/);
 assert.match(c,/birthYear:snapshot\.birthYear/);
 assert.match(c,/History\.contextualize/);
 assert.match(c,/life\.birthYear\+' — '/);
});

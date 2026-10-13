'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../games/high_one_life');
const Sim=require(path.join(root,'engine.js'));
global.window={OneLifeSim:Sim};
const W2=require(path.join(root,'world-v2.js'));global.window.OneLifeWorld2=W2;
const J=require(path.join(root,'joseon-v1.js'));global.window.OneLifeJoseon=J;
const V2=require(path.join(root,'joseon-v2.js'));global.window.OneLifeJoseon2=V2;
const V3=require(path.join(root,'joseon-v3.js'));global.window.OneLifeJoseon3=V3;
const V4=require(path.join(root,'joseon-v4.js'));delete global.window;
const born=(year,seed)=>{const l=new Sim.Life(seed,{birthYear:year,countryName:'대한민국'});if(J.isJoseon(l)){J.ensure(l);V2.ensure(l);V3.ensure(l);V4.ensure(l);}return l;};
function advance(l,to,idx=0){let count=0;while(l.alive&&l.year<to){assert.ok(++count<165,'stuck '+l.year+' '+l.pending);if(l.pending){const p=l.getChoice();if(p)assert.equal(l.choose(idx%p.options.length),true);else if(l.getReflection())assert.equal(l.reflect(''),true);else assert.fail('unknown pending '+l.pending);}else assert.equal(l.tick(),true);}return l;}
test('cash and debt are distinguished from land tenure and stored grain',()=>{
 const l=born(1570,17),s=J.ensure(l);s.capital=-35;s.land=4;
 const e=J.summary(l).economy;
 assert.equal(e.cash,0);assert.equal(e.debt,35);
 assert.equal(e.ownedLand+e.leasedLand,e.workedLand);
 assert.equal(e.workedLand,4);
 assert.equal(e.granary,V2.ensure(l).grain);
 assert.match(e.condition,/빚/);
 assert.ok(e.labor.includes('일손'));
});
test('no debt does not imply farm ownership or guaranteed happiness',()=>{
 const l=born(1570,20),s=J.ensure(l);s.capital=120;s.land=2;
 const e=J.summary(l).economy;
 assert.equal(e.debt,0);
 assert.equal(e.cash,120);
 assert.ok(e.ownedLand<=e.workedLand);
 assert.ok(l.stats.happiness>=0);
});
test('debt opens three distinct paths without mandatory wealth accumulation',()=>{
 const l=born(1600,17),s=J.ensure(l);
 s.capital=-30;s.active={id:'audit-hardship',kind:'household'};l.pending='joseon:audit-hardship';
 const choice=l.getChoice();
 assert.match(choice.title,/빚/);
 assert.deepEqual(choice.options.map(x=>x.action),['wagework','mutualAid','care']);
 const before=l.stats.bonds,capital=s.capital;
 assert.equal(l.choose(1),true);
 assert.equal(s.capital,capital);
 assert.ok(l.stats.bonds>before);
});
test('poverty is not an automatic loss of happiness, just as wealth is not an automatic gain',()=>{
 const l=born(1700,9),s=J.ensure(l);
 l.age=29;l.year=1729;s.capital=-100;l.stats.happiness=51;
 assert.equal(J.yearly(l),true);
 assert.equal(l.stats.happiness,51);
 const t=born(1700,19),r=J.ensure(t);
 t.age=29;t.year=1729;r.capital=200;t.stats.happiness=51;
 assert.equal(J.yearly(t),true);
 assert.equal(t.stats.happiness,51);
});
test('income has itemized subsistence, cultivation and borrowed-land charges',()=>{
 const l=advance(born(1700,17),1730);
 const view=J.summary(l).economy;
 assert.ok(view.costs);
 const c=view.costs;
 assert.equal(view.expense,c.subsistence+c.care+c.landExpenses+c.rent+c.levies);
 assert.ok(view.income>=0&&view.expense>=0);
 assert.equal(view.leasedLand,view.workedLand-view.ownedLand);
 assert.ok(c.rent>=0);
});
test('historical lending events carry concrete reasons instead of treating poverty as failure',()=>{
 const l=born(1700,17),s=J.ensure(l),book=s.economy;
 s.capital=-32;book.previousCapital=5;book.currentYear=1700;
 l.year=1701;l.age=1;J.recordEconomy(l);
 assert.ok(l.log.some(x=>x.kind==='joseon-economy'&&/빚/.test(x.text)));
 assert.equal(J.summary(l).economy.debt,32);
 assert.equal(J.summary(l).economy.povertyYears,1);
 assert.ok(!l.log.some(x=>x.kind==='joseon-economy'&&/실패|낙오/.test(x.text)));
});
test('economy records persist losslessly on save and restore',()=>{
 const l=advance(born(1500,17),1530);
 assert.ok(J.summary(l).economy.costs);
 const after=Sim.Life.restore(JSON.parse(JSON.stringify(l.snapshot())));
 assert.deepEqual(J.summary(after).economy,J.summary(l).economy);
});
test('older saves have no fabricated new debt when economy state is missing',()=>{
 const l=advance(born(1700,17),1720),save=JSON.parse(JSON.stringify(l.snapshot()));
 save.joseon.capital=-41;delete save.joseon.economy;
 const restored=Sim.Life.restore(save);
 assert.equal(J.summary(restored).economy.debt,41);
 assert.equal(restored.joseon.economy.previousCapital,-41);
 assert.equal(restored.joseon.economy.currentYear,restored.year);
});
test('the lived household and biography show land, grain, debt, work and relationships',()=>{
 const source=fs.readFileSync(path.join(root,'game.js'),'utf8');
 assert.match(source,/빌린 땅/);
 assert.match(source,/e\.condition/);
 assert.match(source,/e\.debt/);
 assert.match(source,/life\.stats\.bonds>=65/);
 assert.doesNotMatch(source,/지금까지 모아 온 집안 재산/);
});
test('360 simulated lives preserve poverty, autonomy and chronology across eras',()=>{
 let lives=0,poor=0,socialInDebt=0;
 for(const year of [1392,1500,1580,1670,1810,1870,1919,2026]){
  for(let seed=1;seed<=45;seed++){
   const l=advance(born(year,year+seed*149),year+95,seed%3),saved=Sim.Life.restore(JSON.parse(JSON.stringify(l.snapshot())));
   assert.equal(saved.pending,l.pending);
   if(J.isJoseon(l)){
    const e=J.summary(l).economy;
    assert.ok(e.ownedLand<=e.workedLand);
    assert.ok(e.debt>=0&&e.cash>=0);
    if(e.debt>0){poor++;if(l.stats.bonds>=65)socialInDebt++;}
    assert.deepEqual(J.summary(saved).economy,e);
   }else assert.equal(J.summary(l),null);
   lives++;
  }
 }
 assert.equal(lives,360);
 assert.ok(poor>0,'poverty was erased from the simulation');
 assert.ok(socialInDebt>0,'debt should not automatically extinguish relationships');
});

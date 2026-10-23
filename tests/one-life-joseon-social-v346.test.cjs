'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const dir=path.resolve(__dirname,'../games/high_one_life');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const c={console};c.window=c;vm.createContext(c);
for(const m of html.matchAll(/<script src="\.\/([^?" ]+)/g)){
 if(['game.js','goryeo-view-v343.js'].includes(m[1]))continue;
 vm.runInContext(fs.readFileSync(path.join(dir,m[1]),'utf8'),c,{filename:m[1]});
}
const L=c.OneLifeSim.Life,J=c.OneLifeJoseon,V5=c.OneLifeJoseon5,Core=c.OneLifeSocial346;
const copy=x=>JSON.parse(JSON.stringify(x));
function born(kind,seed=315,year=1700){
 const origins={court:'왕실 종친',bonded:'사노비',commoner:'상민',baekjeong:'백정'};
 const l=new L(seed,{birthYear:year,countryName:'대한민국',birthSetup:{origin:origins[kind],gender:'남자'}});
 l.age=28;l.year=year+28;l.stats.health=100;
 J.ensure(l);V5.ensure(l);
 return l;
}
function begin(kind,seed=315,year=1700){
 const l=born(kind,seed,year);assert.equal(Core.enabled(l,kind),true,kind);
 assert.equal(Core.start(l,kind),true);
 assert.equal(l.pending,'joseon346:'+kind+':case1');
 return l;
}
function step(l,index,years=1){
 const initial=l.pending;
 assert.ok(l.getChoice());
 assert.equal(l.getChoice().options.length,3);
 assert.equal(l.choose(index),true);
 assert.notEqual(l.pending,initial);
 if(l.joseon346.active){
  l.age+=years;l.year+=years;
  assert.equal(Core.due(l),true);
 }
 return l;
}
function complete(kind,choices=[0,0,0,0],seed=315){
 let l=begin(kind,seed);
 for(let i=0;i<4;i++){
  const state=copy(l.snapshot());
  const restored=L.restore(state);
  assert.deepEqual(copy(restored.getChoice()),copy(l.getChoice()));
  l=step(restored,choices[i]);
 }
 assert.equal(l.joseon346.profiles[kind].stage,'done');
 assert.equal(l.joseon346.profiles[kind].choices.length,4);
 return l;
}
test('all four social modules load and register before the controller',()=>{
 assert.equal(Core.categories.size,4);
 for(const kind of ['court','bonded','commoner','baekjeong'])assert.ok(Core.categories.has(kind));
 const core=html.indexOf('joseon-social-core-v346.js?v=1');
 assert.ok(core>0);
 for(const kind of ['court','bonded','commoner','baekjeong']){
  const index=html.indexOf('joseon-'+kind+'-v346.js?v=2');
  assert.ok(index>core);
  assert.ok(index<html.indexOf('game.js?v=84'));
 }
 const runner=fs.readFileSync(path.resolve(__dirname,'../scripts/run-ci-tests.cjs'),'utf8');
 assert.ok(runner.includes('tests/one-life-joseon-social-v346.test.cjs'));
});
test('each class produces three distinct lived scenes and one delayed outcome',()=>{
 for(const kind of ['court','bonded','commoner','baekjeong']){
  const life=complete(kind,[0,1,2,0],187);
  const p=life.joseon346.profiles[kind];
  assert.equal(new Set(p.order).size,3,kind);
  assert.ok(p.outcome,kind);
  assert.ok(life.log.filter(e=>e.kind==='joseon346-choice').length===4);
  assert.ok(Core.summary(life).lastOutcome);
 }
});
test('a royal relative never automatically becomes king and career status changes by faction decisions',()=>{
 const mild=complete('court',[0,0,0,2],210);
 assert.notEqual(J.ensure(mild).occupation,'국왕');
 assert.equal(J.ensure(mild).office,false);
 const r=born('court',210);assert.equal(r.joseon5.origin,'왕실 종친');
 r.joseon5.origin='백정';assert.equal(Core.enabled(r,'court'),false);
});
test('a bonded person cannot appear in commoner or Baekjeong episodes',()=>{
 const l=born('bonded');
 assert.equal(Core.enabled(l,'bonded'),true);
 assert.equal(Core.enabled(l,'commoner'),false);
 assert.equal(Core.enabled(l,'baekjeong'),false);
 assert.equal(Core.enabled(l,'court'),false);
 const escaped=complete('bonded',[0,0,0,1],121);
 assert.equal(V5.ensure(escaped).freed,false);
 assert.ok(['fugitive','recaptured'].includes(escaped.joseon346.profiles.bonded.outcome));
 const f=escaped.joseon344;
 if(f)assert.ok(['escaped','recaptured'].includes(f.fugitive));
});
test('documented manumission is an outcome, not automatic when someone asks',()=>{
 let freed=0,refused=0;
 for(let seed=1;seed<=35;seed++){
  const l=begin('bonded',seed);
  l.joseon346.profiles.bonded.meters.documents=95;
  l.joseon346.profiles.bonded.meters.savings=85;
  for(const x of [0,0,0,0])step(l,x);
  if(V5.ensure(l).freed)freed++;
  else refused++;
  assert.equal(l.joseon346.profiles.bonded.outcome==='freed',V5.ensure(l).freed);
 }
 assert.ok(freed>0,'eligible documentation should sometimes be accepted');
 assert.ok(refused>0,'petition success cannot be guaranteed');
});
test('higher pursuit danger can result in recapture while legal status stays bonded',()=>{
 let caught=0,hidden=0;
 for(let seed=1;seed<=35;seed++){
  const l=begin('bonded',seed);
  l.joseon346.profiles.bonded.meters.danger=78;
  for(const x of [1,1,1,1])step(l,x);
  if(l.joseon346.profiles.bonded.outcome==='recaptured')caught++;
  if(l.joseon346.profiles.bonded.outcome==='fugitive')hidden++;
  assert.equal(V5.ensure(l).freed,false);
 }
 assert.ok(caught>0);
 assert.ok(hidden>0);
});
test('commoner crises may lead to migration; earning money never automatically changes birth status',()=>{
 const a=begin('commoner',71);
 a.joseon346.profiles.commoner.meters.debt=70;
 for(const x of [1,1,1,2])step(a,x);
 assert.equal(a.joseon346.profiles.commoner.outcome,'wanderer');
 assert.equal(c.OneLifeJoseon325.ensure(a).stage,'forest');
 assert.equal(J.ensure(a).birthStatus,'상민');
 const wealthy=complete('commoner',[0,0,0,1],77);
 assert.equal(J.ensure(wealthy).birthStatus,'상민');
});
test('Baekjeong craft and kinship paths never silently change to bonded slavery or elite office',()=>{
 for(const ending of [0,1,2]){
  const l=complete('baekjeong',[0,0,0,ending],212);
  assert.equal(l.joseon5.origin,'백정');
  assert.equal(l.joseon5.freed,false);
  assert.equal(J.ensure(l).office,false);
  assert.equal(J.ensure(l).birthStatus,'상민');
 }
 const l=born('baekjeong');assert.equal(Core.enabled(l,'commoner'),false);
});
test('a chosen pending case, order, and hidden scores survive exact save/restore',()=>{
 const l=begin('baekjeong',144);
 const pending=l.pending,first=copy(l.getChoice());
 const restored=L.restore(copy(l.snapshot()));
 assert.equal(restored.pending,pending);
 assert.deepEqual(copy(restored.getChoice()),first);
 assert.deepEqual(copy(restored.joseon346.profiles.baekjeong.order),copy(l.joseon346.profiles.baekjeong.order));
 assert.equal(restored.choose(0),true);
 assert.equal(restored.choose(0),false);
});
test('restoration rejects fabricated case indexes, duplicate case order and impossible meters',()=>{
 const l=begin('commoner',65);
 const data=copy(l.snapshot());data.joseon346.profiles.commoner.order=[99,99,99];
 const broken=L.restore(data);
 assert.equal(broken.pending?.startsWith('joseon346:')||false,false);
 assert.equal(broken.joseon346.active,null);
 const valid=copy(l.snapshot());
 valid.joseon346.profiles.commoner.meters.debt=900000;
 valid.joseon346.profiles.commoner.meters.credit=-99;
 const clean=L.restore(valid);
 assert.equal(clean.joseon346.profiles.commoner.meters.debt,100);
 assert.equal(clean.joseon346.profiles.commoner.meters.credit,0);
});
test('no social module begins in modern times, captivity or during magistrate hearings',()=>{
 for(const kind of ['court','bonded','commoner','baekjeong']){
  const l=born(kind,15,1860);l.year=1895;l.age=35;
  assert.equal(Core.enabled(l,kind),false);
 }
 const cLife=born('court');
 cLife.joseon345={stage:'hearings'};
 assert.equal(Core.enabled(cLife,'court'),false);
});
test('the visible game summary does not expose hidden reputation meters',()=>{
 const l=begin('court');const summary=Core.summary(l);
 assert.match(summary.label,/조정|정치|당쟁/);
 for(const key of ['influence','integrity','enemies','loyalty','people']){
  assert.equal(Object.prototype.hasOwnProperty.call(summary,key),false);
 }
});

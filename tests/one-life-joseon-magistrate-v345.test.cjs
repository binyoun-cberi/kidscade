'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const dir=path.resolve(__dirname,'../games/high_one_life');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const c={console};c.window=c;vm.createContext(c);
for(const m of html.matchAll(/<script src="\.\/([^?" ]+)/g)){
 if(['game.js','goryeo-view-v343.js'].includes(m[1]))continue;
 vm.runInContext(fs.readFileSync(path.join(dir,m[1]),'utf8'),c,{filename:m[1]});
}
const L=c.OneLifeSim.Life,J=c.OneLifeJoseon,V5=c.OneLifeJoseon5,F=c.OneLifeFate344,
 M=c.OneLifeMagistrate345,Paths=c.OneLifeJoseon325,copy=x=>JSON.parse(JSON.stringify(x));
function born(seed=28,year=1720){
 const life=new L(seed,{birthYear:year,countryName:'대한민국',birthSetup:{origin:'양반',gender:'남자'}});
 const j=J.ensure(life);j.office=true;V5.ensure(life).rank=2;
 life.year=year+32;life.age=32;life.stats.health=95;M.ensure(life);
 assert.ok(F.queue(life,'magistrate'));
 assert.equal(life.pending,'joseon344:magistrate');
 return life;
}
function next(life,years=1){
 life.age+=years;life.year+=years;
 assert.equal(M.schedule(life),true,'expected a due court hearing at '+life.year);
 return life;
}
function run(seed,year=1720,choices=[0,0,0,0],reviewChoice=0){
 let l=born(seed,year);l.choose(0);
 for(const x of choices){
  next(l);const before=copy(l.getChoice());
  const roundtrip=L.restore(copy(l.snapshot()));
  assert.deepEqual(copy(roundtrip.getChoice()),before,'pending case changed on restore');
  l=roundtrip;
  assert.equal(l.getChoice().options.length,3);
  assert.equal(l.choose(x),true);
 }
 next(l,2);
 assert.equal(l.pending,'joseon345:review');
 assert.equal(l.choose(reviewChoice),true);
 assert.equal(l.joseon345.stage,'done');
 return l;
}
test('six different courtroom dilemmas load after original fate arcs without duplicate prompt engines',()=>{
 assert.equal(M.CASES.length,6);
 assert.ok(html.indexOf('joseon-fate-v344.js?v=4')<html.indexOf('joseon-magistrate-v345.js?v=4'));
 assert.ok(html.indexOf('joseon-magistrate-v345.js?v=4')<html.indexOf('goryeo-v343.js?v=2'));
 assert.ok(fs.readFileSync(path.resolve(__dirname,'../scripts/run-ci-tests.cjs'),'utf8')
  .includes('tests/one-life-joseon-magistrate-v345.test.cjs'));
 for(const scene of M.CASES){
  assert.ok(scene.id&&scene.title&&scene.options.length===3);
  for(const option of scene.options)assert.ok(option[0]&&option[1]&&option[2]);
 }
});
test('magistrate must hear four different cases before future reputation review',()=>{
 const l=born(121);
 assert.equal(l.getChoice().options.length,3);
 assert.equal(l.choose(0),true);
 assert.equal(l.joseon345.stage,'hearings');
 assert.equal(l.pending,null);
 assert.equal(l.joseon345.counters.corruption,0);
 for(let i=0;i<4;i++){
  next(l);
  assert.equal(l.pending,'joseon345:case'+(i+1));
  assert.equal(l.getChoice().options.length,3);
  assert.equal(l.choose(0),true);
  assert.equal(l.joseon345.caseIndex,i+1);
 }
 assert.equal(new Set(l.joseon345.order).size,4);
 assert.equal(l.joseon345.stage,'review');
 assert.equal(l.pending,null);
 next(l,2);assert.equal(l.pending,'joseon345:review');
 assert.equal(l.choose(0),true);
 assert.ok(l.joseon345.judgment);
 assert.equal(M.summary(l).hearings,4);
 assert.equal(l.joseon345.records.some(x=>/송사|장부|억울/.test(x.text)),true);
 assert.equal(l.log.filter(x=>x.kind==='joseon345-choice').length,5);
});
test('choices accumulate hidden reputation; identical seed, opposite rulings lead to different fates',()=>{
 const good=run(19,1680,[0,0,0,0],0);
 const bad=run(19,1680,[1,1,1,1],2);
 const g=good.joseon345.counters,b=bad.joseon345.counters;
 assert.ok(g.trust>b.trust);
 assert.ok(g.corruption<b.corruption);
 assert.ok(g.resentment<b.resentment);
 assert.ok(['monument','praised','respected'].includes(good.joseon345.judgment),good.joseon345.judgment);
 assert.ok(['exile','dismissed','ordinary','advanced'].includes(bad.joseon345.judgment),bad.joseon345.judgment);
 assert.notEqual(good.joseon345.judgment,bad.joseon345.judgment);
 assert.ok(good.log.filter(e=>e.kind==='joseon345-life').length>=5);
});
test('no new stele during 1741-1800 ban even when residents admire the verdicts',()=>{
 for(let seed=1;seed<=16;seed++){
  const good=run(seed,1730,[0,0,0,0],1); // 1762-1768
  assert.notEqual(good.joseon345.judgment,'monument');
  assert.equal(good.joseon345.monument,false);
 }
});
test('good rulings can sometimes create a memorial, not automatically guarantee it',()=>{
 let memorials=0,others=0;
 for(let seed=1;seed<=36;seed++){
  const l=run(seed,1690,[0,0,0,0],0);
  if(l.joseon345.monument)memorials++;
  else others++;
 }
 assert.ok(memorials>0,'no positive stele endings were reachable');
 assert.ok(others>0,'praise must not guarantee a stele');
});
test('biased cases can trigger audit, resignation or exile without making every official identical',()=>{
 const outcomes=new Set();
 for(let seed=1;seed<=32;seed++){
  const life=run(seed,1690,[1,1,1,1],2);
  outcomes.add(life.joseon345.judgment);
  if(life.joseon345.judgment==='exile'){
   assert.equal(Paths.ensure(life).law.kind,'exile');
   assert.equal(J.ensure(life).office,false);
  }
 }
 assert.ok(outcomes.has('exile')||outcomes.has('dismissed'));
 assert.ok(outcomes.size>=2,Array.from(outcomes).join(','));
});
test('saved cases reject invented options and do not reroll a court record',()=>{
 const l=born(240);l.choose(1);next(l);
 const before=copy(l.getChoice()),snapshot=copy(l.snapshot());
 snapshot.joseon345.order=[99,99,99,99];
 snapshot.joseon345.counters.trust=900000;
 snapshot.joseon345.counters.corruption=-999;
 const invalid=L.restore(snapshot);
 assert.equal(invalid.joseon345.stage,'idle');
 assert.equal(invalid.joseon345.counters.trust,100);
 assert.equal(invalid.joseon345.counters.corruption,0);
 assert.equal(invalid.pending?.startsWith('joseon345:')||false,false);
 const valid=L.restore(copy(l.snapshot()));
 assert.equal(valid.pending,l.pending);
 assert.deepEqual(copy(valid.getChoice()),before);
 assert.deepEqual(copy(valid.joseon345.order),copy(l.joseon345.order));
 assert.equal(valid.choose(0),true);assert.equal(valid.choose(0),false);
});
test('UI exposes hearings and story, never the hidden reputation numbers',()=>{
 const l=born();l.choose(0);next(l);l.choose(0);
 const summary=M.summary(l);
 assert.equal(summary.hearings,1);
 assert.match(summary.label,/송사/);
 for(const meter of ['trust','fairness','corruption','resentment','favor','proof','relief'])
  assert.equal(Object.prototype.hasOwnProperty.call(summary,meter),false);
 assert.ok(typeof c.OneLifeFate344.summary==='function');
});

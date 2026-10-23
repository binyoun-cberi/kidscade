'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const dir=path.resolve(__dirname,'../games/high_one_life');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const context={console};context.window=context;vm.createContext(context);
for(const item of html.matchAll(/<script src="\.\/([^?" ]+)/g)){
 const file=item[1];
 if(file==='game.js'||file==='goryeo-view-v343.js')continue;
 vm.runInContext(fs.readFileSync(path.join(dir,file),'utf8'),context,{filename:file});
}
const Life=context.OneLifeSim.Life,J=context.OneLifeJoseon,V5=context.OneLifeJoseon5;
const Fate=context.OneLifeFate344,Paths=context.OneLifeJoseon325;
const copy=x=>JSON.parse(JSON.stringify(x));
function born(year=1700,origin='양반',seed=215){
 const l=new Life(seed,{birthYear:year,countryName:'대한민국',birthSetup:{origin,gender:'남자'}});
 J.ensure(l);V5.ensure(l);Fate.ensure(l);return l;
}
function prompt(l,key){assert.equal(Fate.queue(l,key),true,key);assert.equal(l.pending,'joseon344:'+key);const p=l.getChoice();assert.equal(p.options.length,3);return p;}
function after(l,delta){l.age+=delta;l.year+=delta;Fate.advance(l);return l;}
test('branch module loads after old Joseon paths and before the Goryeo handoff',()=>{
 assert.ok(html.indexOf('household-v342.js?v=3')<html.indexOf('joseon-fate-v344.js?v=4'));
 assert.ok(html.indexOf('joseon-fate-v344.js?v=4')<html.indexOf('goryeo-v343.js?v=3'));
 assert.equal(typeof Fate.queue,'function');
 const runner=fs.readFileSync(path.resolve(__dirname,'../scripts/run-ci-tests.cjs'),'utf8');
 assert.ok(runner.includes('tests/one-life-joseon-fate-v344.test.cjs'));
});
test('historically impossible male-only civil examinations are not offered to women',()=>{
 const l=born(1580);assert.ok(Fate.eligible(l).includes('scholar')||l.age<17);
 l.age=22;l.year+=22;l.stats.knowledge=80;assert.ok(Fate.eligible(l).includes('scholar'));
 l.gender='여자';assert.ok(!Fate.eligible(l).includes('scholar'));
});
test('local scholar route differentiates first exam from office and persists years later',()=>{
 const l=born(1580,'양반',47);l.age=20;l.year=1600;
 const first=prompt(l,'scholar');
 assert.match(first.title,/공부/);
 assert.equal(l.choose(0),true);
 assert.equal(J.ensure(l).office,false);
 assert.ok(['passed','failed'].includes(Fate.ensure(l).examination));
 const saved=copy(l.snapshot()),restored=Life.restore(saved);
 assert.equal(restored.joseon344.examination,l.joseon344.examination);
 after(restored,2);
 assert.equal(restored.pending,'joseon344:scholarAfter');
 assert.deepEqual(copy(restored.getChoice()),copy(Fate.plan(restored,'scholarAfter')));
 assert.equal(restored.choose(0),true);
 assert.equal(J.ensure(restored).office,false);
 assert.match(restored.career,/진사|글 선생/);
 assert.equal(restored.joseon344.choices.length,2);
});
test('magistrate now hears individual disputes rather than receiving an instant moral label',()=>{
 const hearing=context.OneLifeMagistrate345;
 const l=born(1740,'양반',18);l.age=30;l.year=1770;
 J.ensure(l).office=true;V5.ensure(l).rank=2;
 prompt(l,'magistrate');assert.equal(l.choose(0),true);
 assert.equal(hearing.ensure(l).stage,'hearings');
 assert.equal(hearing.ensure(l).caseIndex,0);
 assert.equal(Fate.ensure(l).magistrate,'none');
 l.year++;l.age++;assert.equal(hearing.schedule(l),true);
 assert.equal(l.pending,'joseon345:case1');
 assert.equal(l.getChoice().options.length,3);
 assert.equal(l.choose(0),true);
 assert.equal(hearing.ensure(l).caseIndex,1);
 assert.ok(hearing.ensure(l).records.length>=2,'the appointment and first ruling are recorded');
});
test('escaped slave stays legally bonded until documented manumission and can be caught',()=>{
 const l=born(1700,'사노비',97);l.age=19;l.year=1719;
 assert.ok(Fate.eligible(l).includes('slave'));
 prompt(l,'slave');assert.equal(l.choose(1),true);
 assert.equal(Fate.ensure(l).fugitive,'escaped');
 assert.equal(V5.ensure(l).freed,false);
 const restored=Life.restore(copy(l.snapshot()));
 assert.equal(restored.joseon344.fugitive,'escaped');
 after(restored,2);assert.equal(restored.pending,'joseon344:slaveAfter');
 assert.equal(restored.choose(2),true);
 assert.ok(['hiding','recaptured'].includes(Fate.ensure(restored).fugitive));
 assert.equal(V5.ensure(restored).freed,false);
});
test('a harvest failure depletes real stores and a night departure reaches existing forest/outlaw route',()=>{
 const l=born(1810,'상민',83);l.age=30;l.year=1840;V5.ensure(l).origin='자작 농가';
 J.ensure(l).occupation='농사';const grain=context.OneLifeJoseon2.ensure(l).grain;
 prompt(l,'harvest');
 assert.ok(context.OneLifeJoseon2.ensure(l).grain<=grain);
 assert.equal(l.choose(2),true);
 assert.equal(Paths.ensure(l).stage,'forest');
 assert.equal(Paths.ensure(l).stageDue,1843);
 assert.ok(Paths.plans(l,Paths.ensure(l)).forest.choices[2][0].includes('약탈'));
 assert.equal(l.snapshot().joseon325.stage,'forest');
});
test('wealth cannot buy a legitimate Yangban identity; fraudulent genealogy has later consequences',()=>{
 const l=born(1720,'상민',312);l.age=35;l.year=1755;
 J.ensure(l).capital=180;const previous=J.ensure(l).birthStatus,origin=V5.ensure(l).origin;
 assert.ok(Fate.eligible(l).includes('fortune'));
 prompt(l,'fortune');assert.equal(l.choose(1),true);
 assert.equal(Fate.ensure(l).lineage,'questioned');
 const restored=Life.restore(copy(l.snapshot()));
 after(restored,2);
 assert.equal(restored.pending,'joseon344:fortuneAfter');
 assert.equal(restored.choose(0),true);
 assert.equal(restored.joseon344.lineage,'withdrawn');
 assert.equal(J.ensure(restored).birthStatus,previous);
 assert.equal(V5.ensure(restored).origin,origin);
});
test('extravagant noble can lose money then move to an existing bandit-capable mountain route',()=>{
 const l=born(1740,'양반',85);l.age=23;l.year=1763;
 assert.ok(Fate.eligible(l).includes('prodigal'));
 const cash=J.ensure(l).capital;prompt(l,'prodigal');assert.equal(l.choose(0),true);
 assert.ok(J.ensure(l).capital<cash);
 const restored=Life.restore(copy(l.snapshot()));
 after(restored,2);
 assert.equal(restored.pending,'joseon344:prodigalAfter');
 assert.equal(restored.choose(2),true);
 assert.equal(Paths.ensure(restored).stage,'forest');
});
test('all six major arcs have three concrete decisions and later steps remain deterministic',()=>{
 const l=born();
 for(const key of [...Fate.names,...Fate.steps]){
  const prompt=Fate.plan(l,key);
  assert.equal(prompt.options.length,3);
  assert.ok(prompt.options.every(x=>x.label&&x.note&&x.label.length>5),key);
 }
 const first=Fate.dice(99,410),second=Fate.dice(99,410);
 assert.equal(first,second);
 assert.ok(first>=0&&first<1);
});
test('restore discards forged pending effects, unknown branches and oversized state',()=>{
 const l=born(1750,'양반',123);prompt(l,'scholar');
 const saved=copy(l.snapshot());
 saved.joseon344.active='forged';
 saved.joseon344.started=['__proto__','scholar'];
 saved.joseon344.scenes=[{year:1750,text:'x'.repeat(800)}];
 const restored=Life.restore(saved);
 assert.equal(restored.joseon344.active,null);
 assert.equal(restored.joseon344.started.length,1);
 assert.equal(restored.joseon344.scenes[0].text.length,250);
 assert.equal(restored.pending==='joseon344:forged',false);
});

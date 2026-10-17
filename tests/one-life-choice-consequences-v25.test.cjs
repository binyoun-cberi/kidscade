'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../games/high_one_life');
const Sim=require(path.join(root,'engine.js'));global.window={OneLifeSim:Sim};
const load=(file,name)=>{const api=require(path.join(root,file));if(name)global.window[name]=api;return api;};
const W2=load('world-v2.js','OneLifeWorld2');load('joseon-history-policy.js','OneLifeJoseonPolicy');
const J=load('joseon-v1.js','OneLifeJoseon');load('joseon-v2.js','OneLifeJoseon2');
load('joseon-v3.js','OneLifeJoseon3');load('joseon-v4.js','OneLifeJoseon4');
load('joseon-v5.js','OneLifeJoseon5');load('joseon-v6.js','OneLifeJoseon6');
load('joseon-v7-life.js','OneLifeJoseon7');load('joseon-v8-lineage.js','OneLifeJoseon8');
const V9=load('joseon-v9-village.js','OneLifeJoseon9');
load('joseon-annals-v10.js','OneLifeJoseonAnnals');
const V11=load('joseon-v11-late-life.js','OneLifeJoseon11');
const V12=load('joseon-v12-regional.js','OneLifeJoseon12');
const V13=load('joseon-v13-war-recovery.js','OneLifeJoseon13');
const V14=load('joseon-v14-captivity-generations.js','OneLifeJoseon14');
load('joseon-v15-genealogy.js','OneLifeGenealogyV15');
load('joseon-v17-branch-switch.js','OneLifeBranchSwitchV17');
const V18=load('joseon-v18-sedo-samjeong.js','OneLifeJoseon18');
const V19=load('joseon-v19-local-office.js','OneLifeJoseon19');
const C=load('colonial-daily-v2.js','OneLifeColonialDaily');
load('travel-v22.js','OneLifeTravel22');
delete global.window;
const born=(year=1880,seed=437)=>{const l=new Sim.Life(seed,{birthYear:year,countryName:'대한민국'});W2.enrich(l);return l;};
const at=(l,year)=>{l.year=year;l.age=year-l.birthYear;l.pending=null;return l;};
function act(l,id,year,index=0){
 at(l,year);
 const s=C.ensure(l),e=C.EVENTS.find(e=>e.id===id);assert.ok(e);
 s.active={id:year+'-'+id,eventId:id,year};l.pending='colonialDaily:'+s.active.id;
 assert.equal(l.getChoice().options.length,3);
 assert.ok(l.choose(index));
 return C.ensure(l);
}
test('every colonial choice creates a distinct, persistent family trace',()=>{
 assert.equal(C.EVENTS.length,20);
 assert.equal(Object.keys(C.ARC).length,C.EVENTS.length);
 let choices=0;
 for(const e of C.EVENTS){
  const rows=C.ARC[e.id];assert.equal(rows?.length,3,e.id);
  assert.equal(new Set(e.options.map(x=>x.label)).size,3,e.id);
  assert.equal(new Set(rows.map(x=>JSON.stringify(x))).size,3,e.id);
  for(let i=0;i<3;i++){
   const l=born(Math.min(1892,e.start-e.age-3),3000+choices);
   const state=act(l,e.id,e.start,i);
   assert.ok(state.decisions.some(d=>d.eventId===e.id&&d.trace),e.id);
   assert.ok(Object.values(state.threads).some(x=>x>0),e.id);
   const snap=JSON.parse(JSON.stringify(l.snapshot()));
   const copy=Sim.Life.restore(snap);
   assert.deepEqual(C.ensure(copy).threads,state.threads,'lost trace '+e.id+'/'+i);
   assert.equal(C.ensure(copy).decisions.at(-1).option,i);
   choices++;
  }
 }
 console.log('COLONIAL_CHOICE_COVERAGE='+JSON.stringify({events:C.EVENTS.length,branches:choices,persistentBranches:choices}));
});
test('same family makes a meaningfully different land decision years later',()=>{
 const recorded=born(),unrecorded=born();
 for(const l of [recorded,unrecorded])l.profile.settlement='농촌';
 act(recorded,'landRegistry',1912,0);act(unrecorded,'landRegistry',1912,2);
 assert.ok(C.ensure(recorded).threads.records>C.ensure(unrecorded).threads.records);
 at(recorded,1921);at(unrecorded,1921);
 const e=C.EVENTS.find(e=>e.id==='riceExpansion');
 for(const l of [recorded,unrecorded]){const s=C.ensure(l);s.active={id:'1921-'+e.id,eventId:e.id,year:1921};l.pending='colonialDaily:'+s.active.id;}
 assert.match(recorded.getChoice().description,/문서|장부/);
 assert.notEqual(recorded.getChoice().description,unrecorded.getChoice().description);
 const before=recorded.stats.wealth,other=unrecorded.stats.wealth;
 assert.equal(recorded.choose(0),true);assert.equal(unrecorded.choose(0),true);
 assert.equal(recorded.stats.wealth-before,unrecorded.stats.wealth-other+1);
});
test('learning, family news, and provisions carry forward to appropriate later-year stories',()=>{
 const literate=born(1900),newcomer=born(1900);
 act(literate,'nightLearning',1921,0);
 const A=C.ensure(literate),B=C.ensure(newcomer);
 for(const l of [literate,newcomer]){at(l,1942);C.ensure(l).active={id:'1942-languageSociety1942',eventId:'languageSociety1942',year:1942};l.pending='colonialDaily:1942-languageSociety1942';}
 assert.match(literate.getChoice().description,/배운 글/);
 assert.doesNotMatch(newcomer.getChoice().description,/예전에 배운 글/);
 assert.equal(literate.choose(0),true);assert.ok(A.threads.learning>0);
 assert.equal(newcomer.choose(0),true);assert.ok(B.threads.learning>0);
 const kin=born(1900),noKin=born(1900);
 act(kin,'laborNotices',1940,0);
 for(const l of [kin,noKin]){at(l,1945);C.ensure(l).active={id:'1945-liberationDay',eventId:'liberationDay',year:1945};l.pending='colonialDaily:1945-liberationDay';}
 assert.match(kin.getChoice().description,/적어 둔 이름과 주소/);
 assert.doesNotMatch(noKin.getChoice().description,/적어 둔 이름과 주소/);
});
test('landlord/tenancy is not automatically a city household decision',()=>{
 const l=at(born(1890),1925);
 l.profile.settlement='도시';l.profile.motherJob='상인';l.profile.fatherJob='식당 종업원';
 for(const id of ['landRegistry','riceExpansion','tenantPetition']){
  const e=C.EVENTS.find(e=>e.id===id);
  if(l.year>=e.start&&l.year<=e.end)assert.equal(C.eligible(l,e),false,id);
 }
 l.profile.settlement='농촌';
 assert.equal(C.eligible(l,C.EVENTS.find(e=>e.id==='tenantPetition')),true);
});
test('captivity relationships change future chance without guaranteeing return',()=>{
 const c={realm:'japan'},s={contacts:0,overseas:{homeNews:0}};
 const first=V14.repatriationChance(c,s,0,1607);
 s.contacts=15;s.overseas.homeNews=15;
 const later=V14.repatriationChance(c,s,0,1607);
 assert.ok(later>first);
 assert.ok(later<1);
 assert.equal(V14.repatriationChance(c,s,2,1607),V14.repatriationChance(c,{contacts:0,overseas:{homeNews:0}},2,1607));
 const manchu={realm:'qing'};
 assert.ok(V14.repatriationChance(manchu,s,0,1638)>V14.repatriationChance(manchu,{contacts:0,overseas:{homeNews:0}},0,1638));
});
test('the life-ending story remembers the choices that were actually made',()=>{
 const game=fs.readFileSync(path.join(root,'game.js'),'utf8');
 assert.ok(game.includes('const colonialLegacy=colonial?.decisions?.length'));
 assert.ok(game.includes('남겨 둔 장부와 글이 뒤에 닥친 일을 이해할 때'));
 assert.ok(game.includes('colonialLegacy,'));
});
test('portfolio audit of Joseon and colonial event options captures repetitions',()=>{
 const sets=[['village',V9.EVENTS],['lateJoseon',V11.EVENTS],['regional',V12.EVENTS],
 ['war',V13.EVENTS],['captivity',V14.EPISODES],['threeTaxes',V18.EVENTS],
 ['localOffice',V19.EVENTS],['colonial',C.EVENTS]];
 let scenes=0,choices=0,identical=0,identicalOutcomes=0;
 const repeated=new Map();
 for(const [name,events] of sets){
  assert.ok(events.length,name);
  for(const e of events){
   scenes++;
   const opts=e.options||e.opts;
   assert.ok(Array.isArray(opts)&&opts.length>=2,name+'/'+e.id);
   const labels=opts.map(o=>o.label);
   choices+=labels.length;
   if(new Set(labels).size<labels.length)identical++;
   const effects=opts.map(o=>JSON.stringify(o.delta||o.change||o.d||o.effect||{}));
   if(new Set(effects).size===1)identicalOutcomes++;
   for(const label of labels)repeated.set(label,(repeated.get(label)||0)+1);
  }
 }
 const hot=[...repeated.entries()].filter(x=>x[1]>1).sort((a,b)=>b[1]-a[1]).slice(0,12);
 const report={scenes,choices,identicalLabelsWithinScene:identical,identicalNumericOutcomesWithinScene:identicalOutcomes,repeatedLabels:hot};
 console.log('ONE_LIFE_OPTION_PORTFOLIO='+JSON.stringify(report));
 assert.equal(identical,0,'the same text cannot be two choices in one scene');
 assert.ok(choices>=280,'choices collapsed or scripts not loaded');
});

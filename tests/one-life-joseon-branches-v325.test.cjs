'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const dir=path.resolve(__dirname,'../games/high_one_life'),Sim=require(path.join(dir,'engine.js'));
global.window={OneLifeSim:Sim};
const load=(file,name)=>{const api=require(path.join(dir,file));if(name)global.window[name]=api;return api;};
load('world-v2.js','OneLifeWorld2');load('joseon-history-policy.js','OneLifeJoseonPolicy');
const J=load('joseon-v1.js','OneLifeJoseon'),V2=load('joseon-v2.js','OneLifeJoseon2');
load('joseon-v3.js','OneLifeJoseon3');load('joseon-v4.js','OneLifeJoseon4');
const V5=load('joseon-v5.js','OneLifeJoseon5'),V6=load('joseon-v6.js','OneLifeJoseon6');
load('joseon-v7-life.js','OneLifeJoseon7');load('joseon-v8-lineage.js','OneLifeJoseon8');
load('joseon-v9-village.js','OneLifeJoseon9');load('joseon-annals-v10.js','OneLifeJoseonAnnals');
const V11=load('joseon-v11-late-life.js','OneLifeJoseon11');
load('joseon-v12-regional.js','OneLifeJoseon12');load('joseon-v13-war-recovery.js','OneLifeJoseon13');
load('joseon-v14-captivity-generations.js','OneLifeJoseon14');
load('joseon-v15-genealogy.js','OneLifeGenealogyV15');
load('joseon-v17-branch-switch.js','OneLifeBranchSwitchV17');
const V18=load('joseon-v18-sedo-samjeong.js','OneLifeJoseon18');
load('joseon-v19-local-office.js','OneLifeJoseon19');
load('colonial-daily-v2.js','OneLifeColonialDaily');
load('travel-v22.js','OneLifeTravel22');
load('consequences-v30.js','OneLifeConsequences30');
const B=load('joseon-branches-v325.js','OneLifeJoseon325');
delete global.window;
const create=(year=1835,seed=91,origin='소작 농가',region='경상도')=>{
 const l=new Sim.Life(seed,{birthYear:year-28,countryName:'대한민국'});
 l.year=year;l.age=28;l.alive=true;l.pending=null;
 const j=J.ensure(l),soc=V5.ensure(l);j.region=region;j.land=1;
 soc.origin=origin;soc.role='';V2.ensure(l).grain=4;B.ensure(l);
 return l;
};
function select(l,key,index){
 const s=B.ensure(l);assert.ok(B.queue(l,s,key),'duplicate '+key);
 assert.equal(B.promote(l),true,key);
 assert.equal(l.pending,'joseon325:'+key);
 const prompt=l.getChoice();assert.ok(prompt&&prompt.options.length===3,key+' '+JSON.stringify(prompt));
 assert.equal(l.choose(index),true);
 return s;
}
function step(l,n=1){l.year+=n;l.age+=n;l.pending=null;B.yearly(l);}
test('high real debt can trigger flight or forest subsistence without erasing the ledger',()=>{
 const l=create(),s=B.ensure(l),j=J.ensure(l);
 V11.ensure(l).taxDebt=14;V18.ensure(l).grainDebt=12;V2.ensure(l).grain=3;
 assert.equal(B.canDebt(l,s),true);
 const former=j.region;
 select(l,'hardship',2);
 assert.equal(s.stage,'forest');assert.equal(j.region,'강원도');
 assert.match(j.occupation,/화전/);assert.equal(j.land,0);
 assert.equal(V11.ensure(l).taxDebt,14);
 assert.equal(V18.ensure(l).grainDebt,12);
 assert.notEqual(former,j.region);
 assert.equal(B.summary(l).residence,'산골 화전');
 const copy=Sim.Life.restore(JSON.parse(JSON.stringify(l.snapshot())));
 assert.equal(B.summary(copy).stage,'forest');assert.equal(V11.ensure(copy).taxDebt,14);
 step(copy,3);assert.equal(copy.pending,'joseon325:forest');
 assert.equal(copy.getChoice().options.length,3);
 assert.ok(copy.choose(0));
 assert.equal(B.ensure(copy).stage,'forest');
 assert.ok(J.ensure(copy).land>=1);
});
test('economic paths are not offered in wrong centuries or to children',()=>{
 const l=create(1620);const s=B.ensure(l);
 J.ensure(l).capital=-80;V2.ensure(l).grain=1;
 assert.equal(B.canDebt(l,s),false);
 l.year=1840;l.age=12;assert.equal(B.canDebt(l,s),false);
 l.age=40;l.year=1840;assert.equal(B.canDebt(l,s),true);
});
test('joining an outlaw group creates a later legal case, not an immediate arbitrary conviction',()=>{
 const l=create(),s=B.ensure(l);V11.ensure(l).taxDebt=12;
 select(l,'hardship',2);step(l,3);assert.equal(l.pending,'joseon325:forest');
 assert.ok(l.choose(2));assert.equal(s.stage,'outlaw');
 assert.equal(s.law.kind,'free');
 step(l,2);assert.equal(l.pending,'joseon325:outlaw');
 assert.ok(l.choose(0));
 assert.ok(['prison','free'].includes(s.law.kind));
 assert.equal(s.stage,'wanderer');
});
test('political punishment requires a real official, mature year and staged review',()=>{
 const l=create(1670,234,'문반 양반'),j=J.ensure(l),soc=V5.ensure(l),s=B.ensure(l);
 j.office=true;soc.rank=3;
 assert.equal(B.canPolitics(l,s),true);
 select(l,'politics',0);assert.equal(s.politics.stage,'petition');
 step(l,2);assert.equal(l.pending,'joseon325:fallout');
 assert.ok(l.choose(1));assert.equal(s.politics.stage,'trial');
 step(l,1);assert.equal(l.pending,'joseon325:trial');
 assert.ok(l.choose(0));
 assert.ok(['exile','free'].includes(s.law.kind));
 assert.equal(s.politics.stage,'judged');
 const from=Sim.Life.restore(JSON.parse(JSON.stringify(l.snapshot())));
 assert.equal(B.summary(from).politics,'judged');
});
test('no faction politics for earlier centuries or non-officials',()=>{
 const l=create(1492,322,'문반 양반'),s=B.ensure(l),j=J.ensure(l),soc=V5.ensure(l);
 soc.rank=3;j.office=true;assert.equal(B.canPolitics(l,s),false);
 l.year=1670;assert.equal(B.canPolitics(l,s),true);
 j.office=false;assert.equal(B.canPolitics(l,s),false);
});
test('authorized private trade differs from smugglers and requires historical port access',()=>{
 const l=create(1730,355,'역관 가계'),j=J.ensure(l),s=B.ensure(l);
 j.region='경상도';assert.equal(B.canTrade(l,s),true);
 const lawAbiding=create(1730,355,'역관 가계');
 select(lawAbiding,'commerce',0);
 assert.equal(B.summary(lawAbiding).trade,'licensed');
 assert.equal(lawAbiding.pending,null);
 const illicit=create(1730,355,'역관 가계');
 select(illicit,'commerce',1);
 assert.equal(B.summary(illicit).trade,'risk');
 step(illicit,1);
 assert.equal(illicit.pending,'joseon325:inquiry');
 assert.ok(illicit.choose(0));
 assert.equal(B.summary(illicit).trade,'judged');
 const restored=Sim.Life.restore(JSON.parse(JSON.stringify(illicit.snapshot())));
 assert.equal(B.summary(restored).trade,'judged');
 j.region='평안도';assert.equal(B.canTrade(l,s),false);
});
test('seven occupational paths each offer actual work, changing skill and cash',()=>{
 const cases=[
  ['constable','서리 가계'],['potter','도공 가계'],['carpenter','목수 가계'],
  ['lacquer','도공 가계'],['painter','도공 가계'],['poet','역관 가계'],
  ['performer','보부상 가계']
 ];
 assert.equal(Object.keys(B.JOBS).length,7);
 for(const [job,origin] of cases){
  const l=create(1810,614,origin);l.gender='남자';l.stats.knowledge=78;const s=B.ensure(l);
  assert.ok(B.eligibleJobs(l).includes(job),job+' requires correct class/era');
  assert.equal(B.startCareer(l,s,job),true,job);
  assert.equal(s.career.code,job);
  const cash=J.ensure(l).capital;
  select(l,'careerTask',0);
  assert.equal(s.career.workIndex,1);
  assert.ok(s.career.skill>1);
  assert.notEqual(J.ensure(l).capital,cash);
  assert.equal(B.summary(l).profession.name,B.JOBS[job].name);
  const restored=Sim.Life.restore(JSON.parse(JSON.stringify(l.snapshot())));
  assert.equal(B.summary(restored).profession.skill,s.career.skill);
 }
});
test('multiple craft episodes and a second prison release are never blocked by an old key',()=>{
 const l=create(1810,618,'도공 가계'),s=B.ensure(l);
 assert.ok(B.startCareer(l,s,'potter'));
 select(l,'careerTask',0);
 const first=s.career.skill;
 assert.ok(first>1);
 select(l,'careerTask',0);
 assert.equal(s.career.workIndex,2);
 assert.ok(s.career.skill>first);
 // A later conviction must not inherit the consumed release flag.
 s.seen.push('release');
 assert.ok(B.lockup(l,s,'prison',1,'고을 옥'));
 l.year+=1;l.age+=1;l.pending=null;
 assert.equal(B.queue(l,s,'release'),true);
 assert.equal(s.queue.includes('release'),true);
});
test('a craft episode with no materials never grants an invented sale',()=>{
 const l=create(1810,619,'목수 가계'),s=B.ensure(l);
 assert.ok(B.startCareer(l,s,'carpenter'));
 s.career.materials=0;J.ensure(l).capital=0;
 const oldSkill=s.career.skill;
 select(l,'careerTask',2);
 assert.equal(s.career.skill,oldSkill);
 assert.equal(s.career.materials,0);
 assert.ok(s.stories.some(x=>/재료/.test(x.text)));
});
test('detention skips ordinary home economies and provides a releasable choice',()=>{
 const l=create(1810,744,'목수 가계'),s=B.ensure(l);
 const before=J.ensure(l).capital,year=l.year;
 assert.ok(B.lockup(l,s,'prison',2,'고을 옥'));
 assert.equal(s.law.kind,'prison');assert.match(J.ensure(l).occupation,/옥/);
 assert.equal(l.tick(),true);assert.equal(l.year,year+1);
 assert.equal(J.ensure(l).capital,before,'prison is not normal farm or career income');
 assert.equal(l.tick(),true);assert.equal(l.pending,'joseon325:release');
 const snap=Sim.Life.restore(JSON.parse(JSON.stringify(l.snapshot())));
 assert.equal(snap.pending,'joseon325:release');
 assert.equal(snap.getChoice().options.length,3);
 assert.ok(snap.choose(0));assert.equal(B.ensure(snap).law.kind,'free');
});
test('browser integrates Joseon branch before drawing life and covers saved traces',()=>{
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 const a=html.indexOf('consequences-v30.js?v=1'),b=html.indexOf('joseon-branches-v325.js?v=2'),c=html.indexOf('game.js?v=61');
 assert.ok(a>=0&&b>a&&c>b);
 for(const id of ['life325Panel','life325Summary','life325Records'])assert.ok(html.includes('id="'+id+'"'));
 const game=fs.readFileSync(path.join(dir,'game.js'),'utf8');
 assert.match(game,/paintJoseon325\(\)/);
 assert.match(game,/OneLifeBiography328.isChoice/);
});

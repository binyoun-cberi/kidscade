'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'../games/high_one_life');
// Use the actual browser order so newly stacked wrappers cannot escape the regression.
function runtime(){const c={console};c.window=c;vm.createContext(c);
 for(const match of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="\.\/([^?" ]+)/g)){
  if(match[1]==='game.js')continue;
  vm.runInContext(fs.readFileSync(path.join(root,match[1]),'utf8'),c,{filename:match[1]});
 }return c;}
function birth(c,year,sex='여자',seed=117){const l=new c.OneLifeSim.Life(seed,{birthYear:year,countryName:'대한민국',birthSetup:{gender:sex}});c.OneLifeWorld8.ensure(l);return l;}
function complete(c,l){let steps=0,decisions=0,restored=false;
 while(l.alive&&steps++<850){
  if(l.age>=35&&!restored){l=c.OneLifeSim.Life.restore(JSON.parse(JSON.stringify(l.snapshot())));assert.ok(l);restored=true;}
  if(l.pending){const q=l.getChoice();if(q){assert.ok(l.choose(0));decisions++;}else{assert.ok(l.getReflection());l.reflect();}}
  else assert.ok(l.tick());
 }assert.ok(steps<850);return {l,decisions};}
test('production module stack advances modern lives with real chapters and restored state',()=>{
 const c=runtime();for(const year of [1905,1919,1950,2026]){
  const {l,decisions}=complete(c,birth(c,year));
  assert.ok(l.age>35);assert.ok(decisions>3,year+' decisions');
  assert.ok(l.log.some(e=>e.age>20&&e.kind!=='death'),year+' adult records');
  const picked=c.OneLifeBiography328.highlights(l);
  assert.ok(picked.length>3);assert.equal(picked.at(-1).kind,'death');
  assert.ok(picked.some(e=>e.age>20&&e.kind!=='death'));
  assert.doesNotMatch(c.OneLifeBiography328.recap(l),/아직 정해지지 않음|undefined/);
 }
});
test('marriage creates the spouse in the household and genealogy in the same choice',()=>{
 const c=runtime(),l=birth(c,1580,'남자',17),J=c.OneLifeJoseon,V4=c.OneLifeJoseon4;
 l.age=19;l.year=1599;const j=J.ensure(l),social=c.OneLifeJoseon5.ensure(l);
 social.origin='소작 농가';social.freed=false;social.monastic=false;j.status='상민';
 V4.ensure(l);j.active={id:'1599-marriage',kind:'marriage'};l.pending='joseon:1599-marriage';
 assert.ok(l.choose(0));assert.ok(V4.summary(l).spouse);
 const g=c.OneLifeGenealogyV15.summary(l);assert.ok(g.nodes.some(n=>n.role==='spouse'));
 const saved=c.OneLifeSim.Life.restore(JSON.parse(JSON.stringify(l.snapshot())));
 assert.equal(V4.summary(saved).spouse.name,V4.summary(l).spouse.name);
});
test('female naval-family background cannot turn into naval military duty or a schoolmaster career',()=>{
 const c=runtime(),l=birth(c,1580),J=c.OneLifeJoseon;
 l.age=24;l.year=1604;const j=J.ensure(l),s=c.OneLifeJoseon5.ensure(l);
 s.origin='수군 가계';s.role='수군';j.occupation='수군';l.career='수군';
 c.OneLifeJoseon5.ensure(l);assert.doesNotMatch(s.role,/^수군$/);assert.doesNotMatch(s.trade,/해안 방비/);
 j.active={id:'1604-vocation',kind:'vocation'};l.pending='joseon:1604-vocation';assert.ok(l.choose(0));
 assert.notEqual(s.role,'수군');assert.doesNotMatch(j.occupation,/해안 방비/);
 j.literacy=3;j.studyYears=3;l.stats.knowledge=90;
 assert.equal(c.OneLifeJoseon6.adopt(l,'teacher'),false);
 // A saved professional school career cannot revive merely through restore.
 const data=JSON.parse(JSON.stringify(l.snapshot()));
 data.joseon6.career={code:'teacher',started:1600,trained:true,resources:{books:6,pupils:3},contacts:[]};
 data.joseon.occupation='집안과 마을의 글 선생';
 const restored=c.OneLifeSim.Life.restore(data);
 assert.equal(c.OneLifeJoseon6.summary(restored).primary,null);
 assert.doesNotMatch(J.summary(restored).occupation,/서당|훈장/);
});
test('child clothing distinguishes trousers and skirts; ending includes new module choices',()=>{
 const c=runtime();assert.match(c.OneLifeJoseonCulture.wardrobe(1588,'상민','남자','',8).label,/바지/);
 assert.match(c.OneLifeJoseonCulture.wardrobe(1588,'상민','여자','',8).label,/치마/);
 assert.ok(c.OneLifeBiography328.isChoice({kind:'joseonWomen327-choice'}));
 assert.ok(c.OneLifeBiography328.isChoice({kind:'joseon325-choice'}));
 assert.match(c.OneLifeBiography328.recap({log:[{age:0,text:'태어났다',kind:'birth'}]}),/중간 기록이 남아 있지 않아/);
});

test('royal girls learn household duties rather than receiving the military vocation',()=>{
 const c=runtime(),l=birth(c,1580),J=c.OneLifeJoseon;
 l.age=15;l.year=1595;const j=J.ensure(l),s=c.OneLifeJoseon5.ensure(l);
 s.origin='왕실 종친';j.active={kind:'vocation',id:'1595-vocation'};l.pending='joseon:1595-vocation';
 const q=l.getChoice();assert.ok(q);assert.ok(q.options.some(o=>o.action==='courtHousehold'));
 assert.ok(q.options.every(o=>o.action!=='courtGuard'));assert.ok(l.choose(q.options.findIndex(o=>o.action==='courtHousehold')));
 assert.match(j.occupation,/살림/);
});

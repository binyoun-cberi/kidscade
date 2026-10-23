'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const dir=path.resolve(__dirname,'../games/high_one_life');
const home=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const ctx={console};ctx.window=ctx;vm.createContext(ctx);
for(const part of home.matchAll(/<script src="\.\/([^?" ]+)/g)){
 if(['game.js','goryeo-view-v343.js'].includes(part[1]))continue;
 vm.runInContext(fs.readFileSync(path.join(dir,part[1]),'utf8'),ctx,{filename:part[1]});
}
const Life=ctx.OneLifeSim.Life,Fate=ctx.OneLifeFate344,J=ctx.OneLifeJoseon,V5=ctx.OneLifeJoseon5,Core=ctx.OneLifeSocial346;
const Archive=require('../games/high_one_life/life-archive-v1.js');
const clone=x=>JSON.parse(JSON.stringify(x));
function born(origin='양반',seed=17,year=1700){
 const l=new Life(seed,{birthYear:year,countryName:'대한민국',birthSetup:{origin,gender:'남자'}});
 J.ensure(l);V5.ensure(l);Fate.ensure(l);return l;
}
function age(l,n){l.age=n;l.year=l.birthYear+n;l.stats.health=95;return l;}
function fateChoice(l,key,index){
 assert.equal(Fate.queue(l,key),true,key);
 assert.equal(l.pending,'joseon344:'+key);
 assert.ok(l.getChoice()?.options?.length===3);
 assert.equal(l.choose(index),true);
}
test('scholars who skip an exam are not falsely described as failing it',()=>{
 const l=age(born('양반',24),22);
 fateChoice(l,'scholar',1);
 assert.equal(Fate.ensure(l).examination,'not_taken');
 l.age+=2;l.year+=2;Fate.advance(l);
 assert.equal(l.pending,'joseon344:scholarAfter');
 assert.match(l.getChoice().description,/응시하지 않았다/);
 assert.match(l.getChoice().options[1].label,/처음 소과/);
 assert.equal(l.choose(1),true);
 assert.match(l.career,/과거를 준비/);
 assert.match(l.log.at(-2).text,/처음으로 소과에 응시하려고/);
 assert.ok(!l.log.some(e=>/벼슬길 대신 고향/.test(e.text)));
 const restored=Life.restore(clone(l.snapshot()));
 assert.equal(restored.joseon344.examination,'not_taken');
});
test('failed scholars receive a retake, not the first-time or advanced exam text',()=>{
 let tried=0;
 for(let seed=1;seed<90;seed++){
  const l=age(born('양반',seed),20);
  fateChoice(l,'scholar',0);
  if(Fate.ensure(l).examination!=='failed')continue;
  l.age+=2;l.year+=2;Fate.advance(l);
  assert.match(l.getChoice().title,/떨어진/);
  assert.match(l.getChoice().options[1].label,/다음 소과/);
  tried++;break;
 }
 assert.ok(tried>0);
});
test('a memorial is not claimed merely because an official wanted praise',()=>{
 const l=age(born('양반',74),30),s=Fate.ensure(l);
 s.magistrate='benevolent';
 fateChoice(l,'magistrateAfter',2);
 assert.equal(s.memorial,'none');
 assert.notEqual(Fate.summary(l).title,'송덕비가 세워진 수령');
 assert.equal(Life.restore(clone(l.snapshot())).joseon344.memorial,'none');
});
test('a raised memorial is explicitly recorded and survives restoration',()=>{
 let found=0;
 for(let seed=1;seed<=100;seed++){
  const l=age(born('양반',seed),38),s=Fate.ensure(l);
  s.magistrate='benevolent';fateChoice(l,'magistrateAfter',0);
  if(s.memorial==='raised'){
   assert.match(Fate.summary(l).title,/송덕비가 세워진/);
   assert.ok(s.scenes.some(x=>/실제로 송덕비를 세웠다/.test(x.text)));
   assert.equal(Life.restore(clone(l.snapshot())).joseon344.memorial,'raised');
   found++;break;
  }
 }
 assert.ok(found>0);
});
test('documented freedom after flight clears the escaped status and updates the legal record',()=>{
 let freed=0;
 for(let seed=1;seed<100;seed++){
  const l=age(born('사노비',seed),24),s=Fate.ensure(l);
  s.fugitive='escaped';
  fateChoice(l,'slaveAfter',1);
  if(!V5.ensure(l).freed)continue;
  assert.equal(s.fugitive,'freed');
  assert.equal(V5.ensure(l).legal,'양인');
  assert.equal(Fate.summary(l).title,'속량을 거쳐 새 길을 찾는 삶');
  assert.match(l.career,/속량/);
  freed++;break;
 }
 assert.ok(freed>0);
});
test('a royal relative choosing family instead of court is not rewritten as a former official',()=>{
 const l=age(born('왕실 종친',48),28),j=J.ensure(l);
 j.office=false;
 assert.equal(Core.start(l,'court'),true);
 for(let i=0;i<4;i++){
  assert.ok(l.getChoice());
  assert.equal(l.choose(i===3?2:0),true);
  if(l.pending===null&&l.joseon346?.active){l.year++;l.age++;Core.due(l);}
 }
 assert.equal(j.office,false);
 assert.match(j.occupation,/왕실 종친/);
 assert.doesNotMatch(j.occupation,/전직 관료/);
 assert.match(l.joseon346.profiles.court.outcome,/retired/);
});
test('archive classifies eras by country and never labels 1919 Brazil as colonial Korea',()=>{
 assert.equal(Archive.era(1919,'대한민국'),'일제강점기');
 assert.equal(Archive.era(1919,'브라질'),'20세기 전반');
 assert.equal(Archive.era(1270,'대한민국'),'고려');
 assert.equal(Archive.era(1740,'대한민국'),'조선');
 assert.equal(Archive.era(1904,'대한민국'),'대한제국기');
 assert.equal(Archive.era(1950,'미국'),'근현대');
});
test('20-item recent-life storage never pretends to be a complete lifetime total',()=>{
 const recent=Array.from({length:20},(_,i)=>({birthYear:1700,age:38,country:'대한민국',career:'장인 '+i}));
 assert.equal(Archive.entries([...recent,...recent]).length,20);
 assert.equal(Archive.countLabel(recent,null),'최소 20번의 인생');
 const next=Archive.nextCount(recent,null);
 assert.deepEqual(next,{total:21,minimum:true});
 assert.equal(Archive.countLabel(recent,next),'최소 21번의 인생');
 const tracked={total:88,minimum:false};
 assert.equal(Archive.nextCount(recent,tracked).total,89);
 assert.equal(Archive.countLabel(recent,tracked),'88번의 인생');
});
test('archive preserves origin and meaningful ending without displaying raw HTML',()=>{
 const life={country:['대한민국','🇰🇷'],birthYear:1730,age:52,
  career:'향리로 돌아온 선비',profile:{name:'서진'}};
 const one=Archive.make(life,{origin:'소작 농가',ending:'유배에서 돌아온 삶'});
 const r=Archive.describe(one);
 assert.match(r.title,/서진.*선비/);
 assert.match(r.detail,/소작 농가.*유배/);
 assert.equal(Archive.entries([{age:999,birthYear:1700},one]).length,1);
 const source=fs.readFileSync(path.join(dir,'game.js'),'utf8');
 assert.ok(source.includes('document.createElement(\'article\')'));
 assert.ok(source.includes('Archive.countLabel'));
 assert.ok(source.includes('Archive.make'));
 assert.ok(!source.includes('card.innerHTML'));
});

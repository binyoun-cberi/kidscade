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
const born=(year,seed)=>{const life=new Sim.Life(seed,{birthYear:year,countryName:'대한민국'});if(J.isJoseon(life)){J.ensure(life);V2.ensure(life);V3.ensure(life);V4.ensure(life);}return life;};
function advance(life,to,choiceIndex=0){
 let loops=0;
 while(life.alive&&life.year<to){
  assert.ok(++loops<220,'unresponsive at '+life.year+' '+life.pending);
  if(life.pending){
   const choice=life.getChoice();
   if(choice)assert.equal(life.choose(choiceIndex%choice.options.length),true);
   else if(life.getReflection())assert.equal(life.reflect(''),true);
   else assert.fail('unknown choice '+life.pending);
  }else assert.equal(life.tick(),true);
 }
 return life;
}
test('family choice past 1900 changes only that decision cost, not the whole balance',()=>{
 let l=null;
 for(let seed=1;seed<=90&&!l;seed++){
  const candidate=advance(born(1870,seed),1925);
  if(candidate.alive)l=candidate;
 }
 assert.ok(l,'could not find a living historical-to-modern handoff');
 const s=V4.ensure(l),p=s.people.find(x=>x.alive);
 assert.ok(p);
 l.pending=null;s.active={id:'audit-modern',kind:'elders',personId:p.id,year:l.year};
 l.pending='joseon4:audit-modern';
 l.money.netWorth=789123;const old=jcap(),initial=l.money.netWorth;
 function jcap(){return J.ensure(l).capital;}
 const prompt=l.getChoice();assert.ok(prompt);
 assert.equal(l.choose(1),true);
 assert.equal(l.money.netWorth-initial,(jcap()-old)*100);
 assert.ok(l.money.netWorth>700000);
 assert.equal(l.log.at(-1).causeId,'joseon4:audit-modern');
});
test('famine choices cannot share nonexistent grain, but can borrow with a liability',()=>{
 const l=born(1670,17),s=V2.ensure(l);
 s.grain=0;s.active={id:'audit-famine',kind:'famine',title:'흉년',year:l.year};
 l.pending='joseon2:audit-famine';
 const prompt=l.getChoice();
 assert.ok(prompt.options.some(x=>x.action==='borrow'));
 assert.ok(!prompt.options.some(x=>x.action==='share'));
 const before=s.grain;
 assert.equal(l.choose(prompt.options.findIndex(x=>x.action==='borrow')),true);
 assert.equal(s.grain,before+3);assert.equal(s.famineLoans.at(-1).remaining,4);
 assert.equal(l.log.at(-1).causeId,'joseon2:audit-famine');
 s.grain=20;s.active={id:'audit-share',kind:'famine',title:'흉년',year:l.year};l.pending='joseon2:audit-share';
 assert.ok(l.getChoice().options.some(x=>x.action==='share'));
 assert.equal(l.choose(l.getChoice().options.findIndex(x=>x.action==='share')),true);
 assert.equal(s.grain,0);
});
test('village generosity costs real grain or turns into labor',()=>{
 const l=born(1700,17),s=V3.ensure(l);V2.ensure(l).grain=0;
 s.active={id:'audit-neighbors',kind:'household',year:l.year};l.pending='joseon3:audit-neighbors';
 const p=l.getChoice(),idx=p.options.findIndex(x=>x.action==='shareLabor');
 assert.ok(idx>=0);
 assert.equal(l.choose(idx),true);
 assert.equal(V2.ensure(l).grain,0);
 assert.equal(l.log.at(-1).causeId,'joseon3:audit-neighbors');
});
test('births after reform are recorded as former legal-status households',()=>{
 const l=born(1897,13);
 const birth=l.log.find(e=>e.kind==='joseon-birth');
 assert.ok(birth);assert.match(birth.text,/옛 .* 가계/);
 assert.match(J.summary(l).status,/법적 신분제 폐지/);
});
test('different family choices in one year retain distinct cause identifiers',()=>{
 const l=born(1450,8*31);
 advance(l,1510);
 const choice=l.log.filter(x=>x.kind==='joseon4-choice'&&x.causeId);
 const follow=l.log.filter(x=>x.kind==='joseon4-followup'&&x.causeId);
 assert.ok(choice.length>0&&follow.length>0);
 const set=new Set(choice.map(x=>x.causeId));
 assert.ok(follow.some(x=>set.has(x.causeId)));
 assert.equal(new Set(choice.map(x=>x.causeId)).size,choice.length);
});
test('historical age-map displays every entry; ending requires exact consequence ID',()=>{
 const source=fs.readFileSync(path.join(root,'game.js'),'utf8');
 assert.match(source,/events\.map\(x=>/);
 assert.match(source,/e\.causeId\?life\.log\.find/);
 assert.doesNotMatch(source,/after=life\.log\.find\(x=>x\.kind===aftermath&&x\.year>=/);
});
test('saving and loading preserves the choice-to-outcome identifiers',()=>{
 const l=advance(born(1450,31*8),1502,0);
 const choice=l.log.find(x=>x.kind==='joseon4-choice'&&x.causeId);
 assert.ok(choice,'missing family choice reference');
 const restored=Sim.Life.restore(JSON.parse(JSON.stringify(l.snapshot())));
 assert.ok(restored.log.some(x=>x.kind==='joseon4-choice'&&x.causeId===choice.causeId));
 const affected=restored.log.find(x=>x.kind==='joseon4-followup'&&x.causeId===choice.causeId);
 if(affected)assert.match(affected.text,/날|곡식|살림|소식|일/);
});
test('historical biographies retain earlier chapters without inflating modern logs',()=>{
 const historical=born(1870,17),modern=born(1919,17);
 for(let i=0;i<275;i++){historical.logEvent('옛날 이야기 '+i,'joseon-memory');modern.logEvent('오늘 이야기 '+i,'world');}
 assert.ok(historical.log.length>=275);
 assert.ok(modern.log.length<=101);
});
test('360 varied lives remain solvable and preserve cause references across saves',()=>{
 for(const year of [1392,1580,1670,1810,1870,1890,1919,2026]){
  for(let i=1;i<=45;i++){
   const l=advance(born(year,year+i*149),year+92,i%3);
   const snap=JSON.parse(JSON.stringify(l.snapshot()));
   const restored=Sim.Life.restore(snap);
   assert.equal(restored.pending,l.pending);
   if(J.isJoseon(l)){
    const family=V4.summary(l);assert.ok(family.atHome<=family.alive);
    assert.ok(family.people.every(x=>x.age>=0&&x.age<=115));
    if(l.alive&&l.year>=1900)assert.equal(l.joseon4.processedYear,l.year);
    assert.ok(l.log.every(x=>!x.causeId||typeof x.causeId==='string'));
    const out=restored.log.filter(x=>x.causeId);
    assert.ok(out.every(x=>l.log.some(e=>e.causeId===x.causeId&&e.text===x.text)));
   }
  }
 }
});

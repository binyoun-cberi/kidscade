'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../games/high_one_life'),Sim=require(path.join(root,'engine.js'));
global.window={OneLifeSim:Sim};
const load=(file,key)=>{const mod=require(path.join(root,file));if(key)global.window[key]=mod;return mod};
load('world-v2.js','OneLifeWorld2');
load('joseon-history-policy.js','OneLifeJoseonPolicy');
const J=load('joseon-v1.js','OneLifeJoseon'),V2=load('joseon-v2.js','OneLifeJoseon2');
load('joseon-v3.js','OneLifeJoseon3');
const V4=load('joseon-v4.js','OneLifeJoseon4'),V5=load('joseon-v5.js','OneLifeJoseon5');
load('joseon-v6.js','OneLifeJoseon6');load('joseon-v7-life.js','OneLifeJoseon7');
load('joseon-v8-lineage.js','OneLifeJoseon8');const V9=load('joseon-v9-village.js','OneLifeJoseon9');
load('joseon-annals-v10.js','OneLifeJoseonAnnals');load('joseon-v11-late-life.js','OneLifeJoseon11');
const V12=load('joseon-v12-regional.js','OneLifeJoseon12');
const V13=load('joseon-v13-war-recovery.js','OneLifeJoseon13');
const V14=load('joseon-v14-captivity-generations.js','OneLifeJoseon14');
load('colonial-daily-v2.js','OneLifeColonialDaily');delete global.window;
const born=(year,seed=107)=>new Sim.Life(seed,{birthYear:year,countryName:'대한민국'});
function at(l,year,place='경상도'){
 l.year=year;l.age=year-l.birthYear;l.alive=true;l.pending=null;
 J.ensure(l).region=place;return l;
}
function force(l,id,i=0){
 const e=V14.EPISODES.find(e=>e.id===id);assert.ok(e,id);
 const s=V14.ensure(l);s.active={id:l.year+'-'+id,eventId:id,year:l.year};l.pending='joseon14:'+s.active.id;
 const p=l.getChoice();assert.equal(p.options.length,3);
 assert.equal(l.choose(i),true);return s;
}
test('regional capture applies to wars, not arbitrary provinces or years',()=>{
 const south=at(born(1572,15),1597,'전라도'),north=at(born(1572,41),1597,'평안도');
 assert.equal(V14.eraFor(south),'japan');assert.equal(V14.eraFor(north),null);
 const later=at(born(1605,52),1627,'평안도');assert.equal(V14.eraFor(later),'laterJin');
 const qing=at(born(1605,53),1637,'경기도');assert.equal(V14.eraFor(qing),'qing');
 at(qing,1650);assert.equal(V14.canCapture(qing),false);
});
test('captured protagonist stays alive and can learn work while held',()=>{
 const l=at(born(1570,210),1597,'경상도');
 assert.equal(V14.capture(l),true);assert.equal(l.alive,true);
 const s=V14.ensure(l);assert.equal(s.captivity.status,'held');
 const n=s.skills;force(l,'captivityWork',1);
 assert.ok(s.skills>n);assert.ok(l.alive);
 assert.equal(V14.summary(l).captivity.realm,'japan');
});
test('captivity save and restoration preserve period, continuing effects, work and body state',()=>{
 const l=at(born(1575,111),1597,'전라도');
 V14.capture(l);V14.ensure(l).body.movement='오래 걸을 때 다리가 아픔';
 force(l,'captivityLetters',0);
 const saved=JSON.parse(JSON.stringify(l.snapshot()));
 const c=Sim.Life.restore(saved);
 assert.deepEqual(V14.summary(c),V14.summary(l));
 assert.equal(V14.ensure(c).captivity.status,'held');
 assert.equal(V14.ensure(c).body.movement,'오래 걸을 때 다리가 아픔');
});
test('Japanese repatriation and Qing ransom are separate historical paths',()=>{
 const jap=at(born(1575,278),1597,'경상도');V14.capture(jap);
 at(jap,1605,'경상도');assert.equal(V14.opportunity(jap,V14.ensure(jap)),true);
 assert.equal(V14.reunion(jap,V14.ensure(jap),'쇄환'),true);
 assert.equal(V14.summary(jap).captivity.status,'returned');
 const q=at(born(1609,701),1637,'경기도');V14.capture(q);
 at(q,1638,'경기도');assert.equal(V14.opportunity(q,V14.ensure(q)),true);
 assert.equal(V14.reunion(q,V14.ensure(q),'속환'),true);
 assert.equal(V14.summary(q).captivity.route,'속환');
 assert.ok(q.alive);
});
test('post-return body adaptation can improve access without magically curing injuries',()=>{
 const l=at(born(1570,301),1597,'경상도');
 V14.capture(l);const s=V14.ensure(l);s.body.pain=5;s.body.movement='걷기 어려움';
 at(l,1607);V14.reunion(l,s,'쇄환');
 const first=s.body.access;force(l,'homeWork',0);
 assert.ok(s.body.access>first);
 assert.equal(s.body.pain,5);assert.equal(s.body.movement,'걷기 어려움');
});
test('distress is not a psychiatric diagnosis or inherited genetic condition',()=>{
 const l=at(born(1601,477),1637,'경기도');
 V14.capture(l);V14.ensure(l).experience.sleep=8;
 at(l,1640);V14.reunion(l,V14.ensure(l),'속환');
 force(l,'homeSenses',1);
 assert.ok(V14.ensure(l).experience.sleep<=8);
 assert.equal('diagnosis' in V14.summary(l),false);
 assert.equal('hereditaryTrauma' in V14.summary(l),false);
});
test('return is a possibility, not an automatic result of the peace treaty',()=>{
 const l=at(born(1570,808),1597,'경상도');V14.capture(l);
 at(l,1608);
 const s=V14.ensure(l);assert.equal(s.captivity.status,'held');
 assert.equal(V14.opportunity(l,s),true);
 // Historical year progression alone must not force return.
 s.processedYear=1607;V14.yearly(l,s);
 assert.equal(s.captivity.status,'held');
});
test('heir must be a real living child with a valid age, female children may inherit',()=>{
 const l=at(born(1590,789),1640,'전라도'),f=V4.ensure(l),p=f.people.find(x=>x.role==='sibling');
 l.gender='남자';
 const child={...p,id:'child-0',role:'child',name:'김연',sex:'여자',birthYear:1611,atHome:true,alive:true,legal:'양인',married:false,diedYear:null};
 f.people.push(child);l.profile.name='김정';
 l.finish('오랜 세월 끝에 삶을 마쳤다.');
 assert.equal(V14.heirs(l).length,1);
 const h=V14.heirs(l)[0];assert.equal(h.gender,'여자');
 const next=V14.continueAsHeir(l,h.id);assert.ok(next);
 assert.equal(next.year,1640);assert.equal(next.age,29);
 assert.equal(next.gender,'여자');assert.equal(next.profile.name,'김연');
 assert.equal(next.joseon14.familyLine.at(-1).name,'김정');
 assert.equal(V4.ensure(next).people.find(x=>x.role==='father').name,'김정');
 assert.equal(V4.ensure(next).people.find(x=>x.role==='father').alive,false);
 assert.equal(V14.heirs(next).length,0,'living heir cannot start another generation yet');
});
test('family economy, property damage and useful skills inherit without a deterministic trauma transfer',()=>{
 const l=at(born(1590,989),1640,'경상도'),f=V4.ensure(l);
 const p=f.people.find(x=>x.role==='sibling');
 f.people.push({...p,id:'child-0',role:'child',name:'박자연',sex:'남자',birthYear:1610,atHome:true,alive:true,legal:'양인',diedYear:null});
 J.ensure(l).capital=100;V2.ensure(l).grain=40;
 V13.ensure(l).damage=8;V13.ensure(l).fields=6;
 V14.ensure(l).skills=13;V14.ensure(l).heritage.skills=10;
 V14.ensure(l).experience.vigilance=10;V14.ensure(l).body.movement='다리의 움직임이 제한됨';
 l.finish('가족에게 삶을 남겼다.');
 const next=V14.continueAsHeir(l,'child-0');
 assert.ok(next);
 assert.equal(J.ensure(next).capital,65);assert.equal(V2.ensure(next).grain,24);
 assert.ok(V13.ensure(next).damage>0);
 assert.ok(V14.ensure(next).heritage.skills>0);
 assert.equal(V14.ensure(next).experience.vigilance,0);
 assert.equal(V14.ensure(next).body.movement,'');
 assert.equal(Sim.Life.restore(JSON.parse(JSON.stringify(next.snapshot()))).joseon14.familyLine.length,1);
});
test('three successive generations preserve ancestry without copied injuries',()=>{
 const a=at(born(1570,713),1620,'전라도'),f=V4.ensure(a);
 const template=f.people.find(p=>p.role==='sibling')||f.people.find(p=>p.role==='mother');
 f.people.push({...template,id:'child-0',role:'child',name:'이선',birthYear:1591,sex:'여자',alive:true,atHome:true,legal:'양인',diedYear:null});
 V14.ensure(a).body.movement='걸을 때 불편함';
 V14.ensure(a).heritage.skills=8;
 a.finish('삶을 마쳤다.');
 const second=V14.continueAsHeir(a,'child-0');
 assert.ok(second);assert.equal(second.year,1620);
 const f2=V4.ensure(second);
 f2.people.push({...f2.people[0],id:'child-0',role:'child',name:'이연',sex:'남자',birthYear:1602,alive:true,atHome:true,legal:'양인',diedYear:null});
 second.year=1630;second.age=second.year-second.birthYear;
 second.finish('삶을 마쳤다.');
 const third=V14.continueAsHeir(second,'child-0');
 assert.ok(third);assert.equal(third.year,1630);
 assert.equal(V14.summary(third).familyLine.length,2);
 assert.deepEqual(V14.summary(third).familyLine.map(v=>v.name),[a.profile.name,'이선']);
 assert.equal(V14.summary(third).body.movement,'');
 assert.equal(Sim.Life.restore(JSON.parse(JSON.stringify(third.snapshot()))).joseon14.familyLine.length,2);
});
test('old saves without captivity can restore and still play',()=>{
 const l=at(born(1575,701),1600,'충청도');
 const saved=l.snapshot();delete saved.joseon14;
 const restored=Sim.Life.restore(JSON.parse(JSON.stringify(saved)));
 assert.equal(V14.summary(restored).captivity,null);
 assert.equal(V14.summary(restored).familyLine.length,0);
});
test('multiple full lives with v14 maintain pending choices, saved outcomes and regional limits',()=>{
 let n=0;
 for(const birth of [1555,1570,1590,1600,1620,1630,1650,1690])
  for(let seed=1;seed<=16;seed++){
   const l=born(birth,birth*39+seed*157);
   let guard=0;while(l.alive&&l.year<Math.min(1899,birth+80)&&guard++<650){
    if(l.pending){
     const p=l.getChoice();
     if(p)assert.equal(l.choose(seed%p.options.length),true,'cannot choose '+l.pending);
     else if(l.getReflection())assert.equal(l.reflect(''),true);
     else assert.fail('unhandled pending '+l.pending);
    }else assert.equal(l.tick(),true);
   }
   assert.ok(guard<650,'stalled '+l.year);
   const c=Sim.Life.restore(JSON.parse(JSON.stringify(l.snapshot())));
   assert.deepEqual(V14.summary(c),V14.summary(l));
   n+=V14.ensure(l).decisions.length;
  }
 assert.ok(n>9,'new episodes should actually appear in different lives '+n);
});
test('the page loads v14 in sequence, with a genuine heir button and diary',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const game=fs.readFileSync(path.join(root,'game.js'),'utf8');
 assert.ok(html.indexOf('joseon-v13-war-recovery.js')<html.indexOf('joseon-v14-captivity-generations.js'));
 assert.ok(html.indexOf('joseon-v14-captivity-generations.js')<html.indexOf('colonial-daily-v2.js'));
 for(const id of ['joseonCaptivityRecord','heirSelect','heirContinueBtn','captivityBody'])assert.ok(html.includes('id="'+id+'"'));
 assert.ok(game.includes('Joseon14.continueAsHeir'));
 assert.ok(game.includes('joseon14-followup'));
});

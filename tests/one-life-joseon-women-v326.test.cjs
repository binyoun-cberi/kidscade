'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const dir=path.resolve(__dirname,'../games/high_one_life'),Sim=require(path.join(dir,'engine.js'));
global.window={OneLifeSim:Sim};
const load=(file,key)=>{const api=require(path.join(dir,file));if(key)global.window[key]=api;return api;};
load('world-v2.js','OneLifeWorld2');load('joseon-history-policy.js','OneLifeJoseonPolicy');
const J=load('joseon-v1.js','OneLifeJoseon');
load('joseon-v2.js','OneLifeJoseon2');load('joseon-v3.js','OneLifeJoseon3');
const V4=load('joseon-v4.js','OneLifeJoseon4');
const V5=load('joseon-v5.js','OneLifeJoseon5');
load('joseon-v6.js','OneLifeJoseon6');load('joseon-v7-life.js','OneLifeJoseon7');
load('joseon-v8-lineage.js','OneLifeJoseon8');load('joseon-v9-village.js','OneLifeJoseon9');
load('joseon-annals-v10.js','OneLifeJoseonAnnals');
load('joseon-v11-late-life.js','OneLifeJoseon11');
load('joseon-v12-regional.js','OneLifeJoseon12');
load('joseon-v13-war-recovery.js','OneLifeJoseon13');
load('joseon-v14-captivity-generations.js','OneLifeJoseon14');
load('joseon-v15-genealogy.js','OneLifeGenealogyV15');
load('joseon-v17-branch-switch.js','OneLifeBranchSwitchV17');
load('joseon-v18-sedo-samjeong.js','OneLifeJoseon18');
load('joseon-v19-local-office.js','OneLifeJoseon19');
load('colonial-daily-v2.js','OneLifeColonialDaily');
load('travel-v22.js','OneLifeTravel22');load('consequences-v30.js','OneLifeConsequences30');
const B=load('joseon-branches-v325.js','OneLifeJoseon325');
const W=load('joseon-women-v326.js','OneLifeJoseonWomen326');
delete global.window;
function born(year=1700,seed=109,gender='여자',age=24){
 const l=new Sim.Life(seed,{birthYear:year,countryName:'대한민국',birthSetup:{gender}});
 l.gender=gender;l.age=age;l.year=year+age;l.pending=null;l.alive=true;
 J.ensure(l);V5.ensure(l);V4.ensure(l);W.ensure(l);
 return l;
}
function year(l,age){
 l.age=age;l.year=l.birthYear+age;l.pending=null;
 const w=W.ensure(l);if(w){w.processedYear=l.year-1;W.yearly(l);}
}
function chooseWomen(l,index=0){
 assert.match(String(l.pending),/^joseonWomen326:/);
 const q=l.getChoice();assert.equal(q.options.length,3);assert.equal(l.choose(index),true);
}
test('women receive meaningful youth, household, work, property and later-life choices',()=>{
 const l=born(1660,30);
 year(l,24);chooseWomen(l,0);chooseWomen(l,1); // youth + family queued
 year(l,32);chooseWomen(l,0);
 year(l,40);chooseWomen(l,0);
 year(l,59);chooseWomen(l,1);
 const s=W.summary(l);
 assert.equal(s.decisions,5);assert.equal(s.craft>=5,true);
 assert.equal(s.property,2);
 assert.match(s.livelihood,/옷감/);
 assert.equal(l.log.filter(x=>x.kind==='joseonWomen326-choice').length,5);
});
test('three-year callbacks describe the actual earlier choice, never generic traces',()=>{
 const l=born(1700,293,'여자',14);
 year(l,16);chooseWomen(l,1); // learned Hangul
 const follow=W.ensure(l).followups;
 assert.equal(follow.length,1);
 assert.equal(follow[0].key,'youth');
 assert.equal(follow[0].choice,1);
 assert.equal(Object.hasOwn(follow[0],'text'),false);
 const copy=Sim.Life.restore(JSON.parse(JSON.stringify(l.snapshot())));
 assert.deepEqual(W.ensure(copy).followups,follow);
 year(copy,19);
 assert.equal(W.ensure(copy).followups.length,0);
 assert.ok(copy.log.some(x=>/편지에서 보내는 사람의 이름을 읽어 주었다/.test(x.text)));
 assert.ok(!copy.log.some(x=>/그때 택한 일|흔적을 남겼다/.test(x.text)));
});
test('spouse death opens widowhood choices but never resurrects or remarries automatically',()=>{
 const l=born(1720,32),j=J.ensure(l);
 j.married=true;V4.ensure(l).people.push({id:'spouse-test',role:'spouse',name:'배우자',birthYear:1718,sex:'남자',alive:false,diedYear:1751});
 year(l,36);
 assert.equal(l.getChoice().title,'배우자가 떠난 뒤 남은 살림');
 chooseWomen(l,1);
 assert.match(W.summary(l).familyPath,/사별/);
 assert.equal(J.ensure(l).married,true,'women 3.26 cannot change marriage flag');
 assert.equal(V4.summary(l).people.some(p=>p.id==='spouse-test'&&p.alive),false);
});
test('women are not accidentally offered constable service and men never enter women-only phases',()=>{
 const l=born(1780,13);const social=V5.ensure(l);social.origin='서리 가계';
 assert.equal(B.eligibleJobs(l).includes('constable'),false);
 const m=born(1780,13,'남자');V5.ensure(m).origin='서리 가계';
 assert.equal(B.eligibleJobs(m).includes('constable'),true);
 year(m,37);assert.equal(W.summary(m),null);assert.equal(m.pending,null);
});
test('detention and captivity pause women-only household decisions',()=>{
 const l=born(1700,23);
 B.lockup(l,B.ensure(l),'prison',2,'고을 옥');
 W.ensure(l).processedYear=l.year-1;W.yearly(l);
 assert.equal(W.accessible(l),false);assert.equal(W.promote(l),false);
 const c=born(1700,24);c.joseon14={captivity:{status:'held'}};
 W.ensure(c).processedYear=c.year-1;W.yearly(c);
 assert.equal(W.summary(c).decisions,0);assert.equal(c.pending,null);
});
test('women-only saves restore pending choices, delayed consequences and the correct age',()=>{
 const l=born(1640,115);
 year(l,24);chooseWomen(l,1);
 const before=W.summary(l);
 const copy=Sim.Life.restore(JSON.parse(JSON.stringify(l.snapshot())));
 assert.deepEqual(W.summary(copy),before);
 assert.equal(copy.age,l.age);
 assert.equal(copy.pending,l.pending);
 assert.equal(copy.getChoice()?.title,l.getChoice()?.title);
 assert.equal(W.ensure(copy).followups.length,W.ensure(l).followups.length);
 const pending=born(1650,50);year(pending,24);
 const restored=Sim.Life.restore(JSON.parse(JSON.stringify(pending.snapshot())));
 assert.equal(restored.pending,pending.pending);
 assert.equal(restored.getChoice().title,pending.getChoice().title);
});
test('200 female life-play simulations, mixed birth centuries, save checks and no endless pending loops',()=>{
 const phases=new Set();let womenChoices=0,finished=0,restored=0;
 for(const birthYear of [1420,1530,1650,1780,1820]){
  for(let seed=1;seed<=40;seed++){
   const l=born(birthYear,birthYear*31+seed*17,'여자',12);
   l.pending=null;
   // Each life is repeatedly played, not merely assigned the next year.
   for(let steps=0;steps<165&&!(!l.alive||l.age>=72||l.year>=1895);steps++){
    if(l.pending){
     const q=l.getChoice();
     if(q?.options?.length){
      if(String(l.pending).startsWith('joseonWomen326:'))phases.add(l.pending.split(':')[1]);
      assert.equal(l.choose(seed%q.options.length),true);
     }else if(l.getReflection()){assert.equal(l.reflect(''),true);}
     else {assert.fail('unresolvable pending '+String(l.pending));}
    }else{
     const ok=l.tick();if(!ok)break;
    }
   }
   womenChoices+=W.summary(l)?.decisions||0;
   if(!l.alive||l.age>=72)finished++;
   if(seed%8===0){
    const copy=Sim.Life.restore(JSON.parse(JSON.stringify(l.snapshot())));
    assert.ok(copy);
    assert.deepEqual(W.summary(copy),W.summary(l));restored++;
   }
  }
 }
 assert.ok(womenChoices>170,'too few female choices: '+womenChoices);
 assert.ok(phases.has('youth')&&phases.has('work')&&phases.has('property'),'unseen phases '+[...phases]);
 assert.equal(restored,25);assert.ok(finished>20);
});
test('browser script order and female life panel are wired',()=>{
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8'),
  game=fs.readFileSync(path.join(dir,'game.js'),'utf8');
 assert.ok(html.indexOf('joseon-branches-v325.js')<html.indexOf('joseon-women-v326.js'));
 assert.ok(html.indexOf('joseon-women-v326.js')<html.search(/game\.js\?v=\d+/));
 for(const id of ['lifeWomen326Panel','lifeWomen326Summary','lifeWomen326Records','lifeWomen326Count'])
  assert.ok(html.includes('id="'+id+'"'));
 assert.match(game,/paintJoseonWomen326\(\)/);
 assert.match(game,/OneLifeJoseonWomen326/);
});

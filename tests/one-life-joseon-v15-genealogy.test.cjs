'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const dir=path.resolve(__dirname,'../games/high_one_life'),Sim=require(path.join(dir,'engine.js'));
global.window={OneLifeSim:Sim};
const load=(file,name)=>{const mod=require(path.join(dir,file));if(name)window[name]=mod;return mod};
load('world-v2.js','OneLifeWorld2');load('joseon-history-policy.js','OneLifeJoseonPolicy');
const J=load('joseon-v1.js','OneLifeJoseon'),V2=load('joseon-v2.js','OneLifeJoseon2');
load('joseon-v3.js','OneLifeJoseon3');const V4=load('joseon-v4.js','OneLifeJoseon4');
load('joseon-v5.js','OneLifeJoseon5');load('joseon-v6.js','OneLifeJoseon6');
load('joseon-v7-life.js','OneLifeJoseon7');const V8=load('joseon-v8-lineage.js','OneLifeJoseon8');
load('joseon-v9-village.js','OneLifeJoseon9');load('joseon-annals-v10.js','OneLifeJoseonAnnals');
load('joseon-v11-late-life.js','OneLifeJoseon11');load('joseon-v12-regional.js','OneLifeJoseon12');
const V13=load('joseon-v13-war-recovery.js','OneLifeJoseon13');
const V14=load('joseon-v14-captivity-generations.js','OneLifeJoseon14');
const Tree=load('joseon-v15-genealogy.js','OneLifeGenealogyV15');
load('colonial-daily-v2.js','OneLifeColonialDaily');delete global.window;
const born=(year=1590,seed=81)=>new Sim.Life(seed,{birthYear:year,countryName:'대한민국'});
const move=(life,year,region='경상도')=>{life.year=year;life.age=year-life.birthYear;life.alive=true;life.pending=null;J.ensure(life).region=region;return life};
function child(l,id,name,year,sex='여자'){
 const family=V4.ensure(l),base=family.people.find(p=>p.role==='sibling')||family.people[0];
 family.people.push({...base,id,role:'child',name,sex,birthYear:year,alive:true,atHome:true,
  work:'가업을 익히는 중',diedYear:null,legal:'양인',lifeYears:95});
}
test('the genealogy starts with named real family members and no fabricated grandparents',()=>{
 const l=born(),g=Tree.summary(l),family=V4.summary(l);
 assert.equal(g.nodes.filter(n=>n.generation===0).length,2);
 assert.ok(g.nodes.some(n=>n.id===g.selfId&&n.name===l.profile.name));
 assert.equal(g.nodes.length,family.people.length+1);
 assert.ok(g.nodes.every(n=>n.name&&!n.name.includes('할아버지')));
 assert.ok(g.clan.endsWith('씨'));
});
test('spouses, daughters and sons connect to the correct parents',()=>{
 const l=move(born(1590,201),1640),fam=V4.ensure(l);
 child(l,'child-0','김연',1610,'여자');child(l,'child-1','김민',1614,'남자');
 const spouse=fam.people.find(p=>p.role==='spouse');
 if(!spouse)fam.people.push({...fam.people[0],id:'spouse',role:'spouse',name:'박순',birthYear:1593,alive:true});
 const summary=Tree.summary(l),me=summary.nodes.find(n=>n.id===summary.selfId),children=summary.nodes.filter(n=>n.role==='child');
 assert.equal(children.length,2);
 for(const k of children){
  assert.ok([1610,1614].includes(k.birthYear));
  assert.ok(k.fatherId===me.id||k.motherId===me.id);
  assert.ok(k.motherId&&k.fatherId);
 }
 assert.ok(me.partnerId);
});
test('father and mother records are not duplicated when playing as a daughter',()=>{
 const parent=move(born(1590,789),1640),fam=V4.ensure(parent);
 parent.gender='남자';const surname=V8.ensure(parent).surname;
 parent.joseon8.givenName='정';parent.profile.name=surname+'정';
 const parentName=parent.profile.name,childName=surname+'연';
 child(parent,'child-0',childName,1611,'여자');
 const familyBefore=Tree.summary(parent),daughterId=familyBefore.nodes.find(p=>p.name===childName).id;
 parent.finish('세상을 떠났다');
 const next=V14.continueAsHeir(parent,'child-0');assert.ok(next);
 const tree=Tree.summary(next);
 assert.equal(next.profile.name,childName);
 assert.equal(tree.selfId,daughterId);
 assert.equal(tree.nodes.filter(p=>p.id===daughterId).length,1);
 assert.equal(tree.nodes.filter(p=>p.name===parentName).length,1);
 assert.equal(tree.nodes.find(p=>p.id===familyBefore.selfId).diedYear,1640);
 const mother=tree.nodes.find(p=>p.id===tree.nodes.find(p=>p.id===daughterId).fatherId);
 assert.equal(mother.name,parentName);
});
test('multiple generations keep unique people, lineage IDs, occupations and heritage',()=>{
 const a=move(born(1570,713),1620),f=V4.ensure(a);
 const familySurname=V8.ensure(a).surname;
 child(a,'child-0',familySurname+'선',1591,'여자');
 Tree.sync(a);a.finish('삶을 마쳤다');
 const second=V14.continueAsHeir(a,'child-0');
 assert.ok(second);
 const f2=V4.ensure(second);child(second,'child-0',familySurname+'연',1602,'남자');
 second.year=1630;second.age=1630-second.birthYear;second.finish('삶을 마쳤다');
 const third=V14.continueAsHeir(second,'child-0');
 assert.ok(third);const tree=Tree.summary(third);
 assert.equal(tree.generation,3);
 assert.equal(tree.nodes.filter(n=>n.name===familySurname+'선').length,1);
 assert.equal(tree.nodes.filter(n=>n.name===familySurname+'연').length,1);
 assert.equal(new Set(tree.nodes.map(n=>n.id)).size,tree.nodes.length);
 assert.ok(tree.nodes.find(n=>n.name===familySurname+'선').diedYear);
 assert.equal(tree.nodes.find(n=>n.id===tree.selfId).name,familySurname+'연');
});
test('a missing family member remains distinct from an actual death',()=>{
 const l=move(born(1560,825),1592,'경상도');
 const person=V4.ensure(l).people.find(p=>p.role==='sibling');
 V13.ensure(l).missing.push({personId:person.id,name:person.name,year:1592,status:'missing',era:'imjin'});
 const tree=Tree.summary(l),entry=tree.nodes.find(p=>p.name===person.name);
 assert.equal(entry.missing,true);assert.equal(entry.alive,true);
 V13.ensure(l).missing[0].status='returned';
 const returned=Tree.summary(l).nodes.find(p=>p.id===entry.id);
 assert.equal(returned.missing,false);assert.equal(returned.returned,true);
});
test('snapshot, reload and resnapshot keep the exact ancestor and child links',()=>{
 const l=move(born(1590,112),1640);child(l,'child-0','김슬',1610,'여자');
 Tree.sync(l);
 const before=Tree.summary(l);
 const cp=Sim.Life.restore(JSON.parse(JSON.stringify(l.snapshot())));
 const after=Tree.summary(cp);
 assert.deepEqual(after,before);
 assert.equal(cp.snapshot().genealogy15.nodes.length,before.nodes.length);
});
test('legacy saves missing the genealogy field rebuild only known people',()=>{
 const l=move(born(1590,881),1630),saved=l.snapshot();
 delete saved.genealogy15;
 const cp=Sim.Life.restore(JSON.parse(JSON.stringify(saved)));
 const r=Tree.summary(cp);
 assert.equal(r.generation,1);
 assert.ok(r.nodes.some(n=>n.id===r.selfId));
 assert.ok(r.nodes.length<=13);
});
test('UI includes both live and ending entry points and accessible detail dialog',()=>{
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8'),game=fs.readFileSync(path.join(dir,'game.js'),'utf8');
 assert.ok(html.indexOf('joseon-v14-captivity-generations.js')<html.indexOf('joseon-v15-genealogy.js'));
 assert.ok(html.indexOf('joseon-v15-genealogy.js')<html.indexOf('colonial-daily-v2.js'));
 for(const id of ['openGenealogyBtn','endGenealogyBtn','genealogyModal','genealogyPersonDetail','genealogyGenerations','genealogyClose'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(html.includes('aria-modal="true"'));
 assert.ok(game.includes('Genealogy.summary(life)')&&game.includes('Genealogy.ROLES'));
 assert.ok(game.includes("genealogyClose').addEventListener"));
});
test('120 simulated Joseon lives generate bounded valid genealogy and survive save',()=>{
 for(const birth of [1440,1520,1570,1620,1740,1850]){
  for(let seed=1;seed<=20;seed++){
   const l=born(birth,birth*53+seed*11);let guard=0;
   while(l.alive&&l.year<birth+72&&guard++<570){
    if(l.pending){
      const p=l.getChoice();
      if(p)assert.equal(l.choose(seed%p.options.length),true);
      else if(l.getReflection())assert.equal(l.reflect(''),true);
      else assert.fail('unhandled '+l.pending);
    }else assert.equal(l.tick(),true);
   }
   assert.ok(guard<570);
   const tree=Tree.summary(l);
   assert.ok(tree.nodes.length<=140);
   assert.equal(new Set(tree.nodes.map(n=>n.id)).size,tree.nodes.length);
   const cp=Sim.Life.restore(JSON.parse(JSON.stringify(l.snapshot())));
   assert.equal(Tree.summary(cp).nodes.length,tree.nodes.length);
  }
 }
});

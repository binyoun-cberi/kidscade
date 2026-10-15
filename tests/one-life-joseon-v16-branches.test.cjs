'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../games/high_one_life'),Sim=require(path.join(root,'engine.js'));
global.window={OneLifeSim:Sim};
const load=(file,key)=>{const x=require(path.join(root,file));if(key)window[key]=x;return x};
load('world-v2.js','OneLifeWorld2');load('joseon-history-policy.js','OneLifeJoseonPolicy');
const J=load('joseon-v1.js','OneLifeJoseon'),V2=load('joseon-v2.js','OneLifeJoseon2');
load('joseon-v3.js','OneLifeJoseon3');const V4=load('joseon-v4.js','OneLifeJoseon4');
load('joseon-v5.js','OneLifeJoseon5');load('joseon-v6.js','OneLifeJoseon6');
load('joseon-v7-life.js','OneLifeJoseon7');const V8=load('joseon-v8-lineage.js','OneLifeJoseon8');
load('joseon-v9-village.js','OneLifeJoseon9');load('joseon-annals-v10.js','OneLifeJoseonAnnals');
load('joseon-v11-late-life.js','OneLifeJoseon11');load('joseon-v12-regional.js','OneLifeJoseon12');
load('joseon-v13-war-recovery.js','OneLifeJoseon13');
const V14=load('joseon-v14-captivity-generations.js','OneLifeJoseon14');
const Tree=load('joseon-v15-genealogy.js','OneLifeGenealogyV15');
load('colonial-daily-v2.js','OneLifeColonialDaily');delete global.window;
function family(seed=823){
 const l=new Sim.Life(seed,{birthYear:1570,countryName:'대한민국'});
 l.year=1630;l.age=60;l.alive=true;l.pending=null;
 J.ensure(l).region='전라도';
 const f=V4.ensure(l),p=f.people.find(x=>x.role==='sibling')||f.people[0],name=V8.ensure(l).surname;
 for(const [index,year,sex] of [[0,1598,'남자'],[1,1601,'여자'],[2,1604,'남자']]){
  f.people.push({...p,id:'child-'+index,role:'child',name:name+(sex==='여자'?'연':'길')+index,
    birthYear:year,sex,alive:true,atHome:true,married:true,work:'가족의 생업',
    legal:'양인',diedYear:null,lifeYears:95});
 }
 Tree.sync(l);l.finish('오랜 삶을 마쳤다.');
 return l;
}
const move=(l,y)=>{l.year=y;l.age=y-l.birthYear;l.alive=true;l.pending=null;return l};
test('choosing a daughter keeps her single identity and two sibling houses',()=>{
 const l=family(),earlier=Tree.summary(l),next=V14.continueAsHeir(l,'child-1');
 assert.ok(next);
 const after=Tree.summary(next);
 assert.equal(after.branches.length,2);
 const daughter=earlier.nodes.find(n=>n.birthYear===1601&&n.role==='child');
 assert.equal(after.selfId,daughter.id);
 assert.equal(after.nodes.filter(n=>n.id===daughter.id).length,1);
 assert.ok(after.branches.every(b=>b.label.includes('집안')));
});
test('the eldest and youngest sons have separate descendant branches after decades',()=>{
 const l=family(980),next=V14.continueAsHeir(l,'child-1');
 move(next,1690);
 const tree=Tree.summary(next);
 for(const branch of tree.branches){
  const descendants=tree.nodes.filter(n=>n.branchId===branch.id&&n.role==='descendant');
  assert.ok(descendants.length>=1,branch.label);
  assert.ok(tree.nodes.some(n=>n.branchId===branch.id&&n.role==='spouse'));
  assert.ok(descendants.every(n=>n.simulated&&n.generation>tree.nodes.find(p=>p.id===branch.id).generation));
 }
 assert.equal(new Set(tree.nodes.map(n=>n.id)).size,tree.nodes.length);
});
test('daughter branch children retain their mother link and partner',()=>{
 const l=family(1062),next=V14.continueAsHeir(l,'child-0');
 move(next,1680);
 const tree=Tree.summary(next);
 const daughter=tree.branches.map(b=>tree.nodes.find(p=>p.id===b.id)).find(p=>p.sex==='여자');
 assert.ok(daughter);
 const spouse=tree.nodes.find(p=>p.id===daughter.partnerId);
 assert.ok(spouse);
 const descendants=tree.nodes.filter(p=>p.motherId===daughter.id&&p.fatherId===spouse.id);
 assert.ok(descendants.length>0);
});
test('family parentage links never point to a younger ancestor',()=>{
 const l=family(381),next=V14.continueAsHeir(l,'child-1');
 move(next,1680);const tree=Tree.summary(next),ids=new Map(tree.nodes.map(n=>[n.id,n]));
 for(const n of tree.nodes){
  for(const key of ['motherId','fatherId']){
   if(!n[key])continue;
   assert.ok(ids.has(n[key]),n.name+' missing parent');
   assert.ok(ids.get(n[key]).birthYear<n.birthYear,n.name+' impossible birth order');
  }
 }
});
test('a change in playable seed does not rename already recorded branch descendants',()=>{
 const l=family(447),middle=V14.continueAsHeir(l,'child-1');
 move(middle,1665);const before=Tree.summary(middle);
 const f=V4.ensure(middle),base=f.people.find(p=>p.role==='sibling');
 const surname=V8.ensure(middle).surname;
 f.people.push({...base,id:'child-0',role:'child',name:surname+'환',
  sex:'남자',birthYear:1625,alive:true,atHome:true,married:false,diedYear:null});
 middle.finish('삶을 마쳤다.');
 const next=V14.continueAsHeir(middle,'child-0');
 assert.ok(next);move(next,1710);
 const tree=Tree.summary(next);
 for(const n of before.nodes.filter(n=>n.simulated)){
  const preserved=tree.nodes.find(x=>x.id===n.id);
  assert.ok(preserved,n.id);
  assert.equal(preserved.name,n.name);
 }
 assert.equal(Tree.ensure(l).familySeed,Tree.ensure(next).familySeed);
});
test('reloading a save never duplicates branch family members',()=>{
 const next=V14.continueAsHeir(family(1417),'child-1');
 move(next,1684);const before=Tree.summary(next);
 const loaded=Sim.Life.restore(JSON.parse(JSON.stringify(next.snapshot())));
 assert.deepEqual(Tree.summary(loaded),before);
 assert.deepEqual(Tree.summary(loaded),Tree.summary(loaded));
});
test('existing v15 saves with no branch data still open',()=>{
 const l=family(213),data=l.snapshot();
 delete data.genealogy15.branches;delete data.genealogy15.familySeed;
 const loaded=Sim.Life.restore(JSON.parse(JSON.stringify(data)));
 assert.equal(Tree.summary(loaded).branches.length,0);
 assert.ok(Tree.summary(loaded).nodes.some(n=>n.role==='child'));
});
test('descendants are not displayed before they are born',()=>{
 const next=V14.continueAsHeir(family(315),'child-1');
 move(next,1631);
 assert.ok(Tree.summary(next).nodes.every(p=>p.birthYear<=1631));
 move(next,1680);
 assert.ok(Tree.summary(next).nodes.every(p=>p.birthYear<=1680));
});
test('viewer contains expandable branches and horizontal mobile navigation',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),
  js=fs.readFileSync(path.join(root,'game.js'),'utf8'),
  css=fs.readFileSync(path.join(root,'joseon-genealogy-v15.css'),'utf8');
 for(const id of ['genealogyExpandAll','genealogyBranchCount','genealogyGenerations'])
  assert.ok(html.includes('id="'+id+'"'));
 assert.ok(js.includes('const renderBranch=(person,depth=0)=>'));
 assert.ok(js.includes('genealogyFolded.clear()'));
 assert.ok(css.includes('.genealogy-fork')&&css.includes('overflow-x:auto'));
});
test('180 complete life progressions preserve a bounded distinct lineage',()=>{
 for(const year of [1440,1510,1570,1620,1750,1850])
  for(let seed=1;seed<=30;seed++){
   const l=new Sim.Life(year*29+seed*1009,{birthYear:year,countryName:'대한민국'});
   let guard=0;
   while(l.alive&&l.year<year+78&&guard++<660){
    if(l.pending){
     const p=l.getChoice();
     if(p)assert.equal(l.choose(seed%p.options.length),true);
     else if(l.getReflection())assert.equal(l.reflect(''),true);
     else assert.fail('Unhandled pending '+l.pending);
    }else assert.equal(l.tick(),true);
   }
   assert.ok(guard<660);
   const restored=Sim.Life.restore(JSON.parse(JSON.stringify(l.snapshot())));
   const tree=Tree.summary(restored);
   assert.ok(tree.nodes.length<=140);
   assert.equal(new Set(tree.nodes.map(n=>n.id)).size,tree.nodes.length);
  }
});

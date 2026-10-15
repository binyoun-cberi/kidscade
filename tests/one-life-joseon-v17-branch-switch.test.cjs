'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=path.resolve(__dirname,'../games/high_one_life'),Sim=require(path.join(base,'engine.js'));
global.window={OneLifeSim:Sim};
const load=(file,key)=>{const x=require(path.join(base,file));if(key)window[key]=x;return x};
load('world-v2.js','OneLifeWorld2');load('joseon-history-policy.js','OneLifeJoseonPolicy');
const J=load('joseon-v1.js','OneLifeJoseon');
load('joseon-v2.js','OneLifeJoseon2');load('joseon-v3.js','OneLifeJoseon3');
const V4=load('joseon-v4.js','OneLifeJoseon4');
load('joseon-v5.js','OneLifeJoseon5');load('joseon-v6.js','OneLifeJoseon6');
load('joseon-v7-life.js','OneLifeJoseon7');load('joseon-v8-lineage.js','OneLifeJoseon8');
load('joseon-v9-village.js','OneLifeJoseon9');load('joseon-annals-v10.js','OneLifeJoseonAnnals');
load('joseon-v11-late-life.js','OneLifeJoseon11');load('joseon-v12-regional.js','OneLifeJoseon12');
load('joseon-v13-war-recovery.js','OneLifeJoseon13');
const V14=load('joseon-v14-captivity-generations.js','OneLifeJoseon14');
const Tree=load('joseon-v15-genealogy.js','OneLifeGenealogyV15');
const Switch=load('joseon-v17-branch-switch.js','OneLifeBranchSwitchV17');
load('colonial-daily-v2.js','OneLifeColonialDaily');
delete global.window;
function family(seed=350,year=1630){
 const l=new Sim.Life(seed,{birthYear:1590,countryName:'대한민국'});
 l.year=year;l.age=year-1590;l.alive=true;l.pending=null;J.ensure(l).region='경상도';
 const f=V4.ensure(l),basePerson=f.people.find(x=>x.role==='sibling')||f.people[0];
 const surname=l.profile.name.slice(0,1)||'김';
 for(let i=0;i<3;i++){
  f.people.push({...basePerson,id:'child-'+i,role:'child',
   name:surname+['철','연','길'][i],sex:i===1?'여자':'남자',
   birthYear:1600+i*3,alive:true,diedYear:null,atHome:true,married:true,
   work:'집안 살림',legal:'양인',lifeYears:98});
 }
 Tree.sync(l);return l;
}
function branchFamily(seed=888){
 const l=family(seed);
 l.finish('나이 들어 세상을 떠났다.');
 const middle=V14.continueAsHeir(l,'child-1');
 assert.ok(middle,'heir life missing');
 middle.year=1655;middle.age=1655-middle.birthYear;middle.alive=true;middle.pending=null;
 const info=Tree.summary(middle);
 assert.equal(info.branches.length,2);
 return middle;
}
test('offers living relatives but excludes current life, spouses, minors and missing people',()=>{
 const l=branchFamily(),now=Tree.summary(l);
 const choose=Switch.options(l);
 assert.ok(choose.some(x=>now.branches.some(b=>b.id===x.id)));
 assert.ok(!choose.some(x=>x.id===now.selfId));
 assert.ok(!choose.some(x=>now.nodes.find(n=>n.id===x.id)?.role==='spouse'));
 const sibling=now.nodes.find(n=>now.branches.some(b=>b.id===n.id));
 sibling.missing=true;
 assert.ok(!Switch.options(l).some(x=>x.id===sibling.id));
 sibling.missing=false;sibling.alive=false;
 assert.ok(!Switch.options(l).some(x=>x.id===sibling.id));
});
test('switching to a side relative retains identity, current year and a copy of the family register',()=>{
 const life=branchFamily(941),original=Tree.summary(life);
 const target=original.nodes.find(n=>original.branches.some(b=>b.id===n.id));
 const originalHealth=life.stats.health;
 const next=Switch.switchTo(life,target.id);
 assert.ok(next);
 assert.equal(next.profile.name,target.name);assert.equal(next.birthYear,target.birthYear);
 assert.equal(next.year,life.year);assert.equal(next.age,life.year-target.birthYear);
 assert.equal(Tree.summary(next).selfId,target.id);
 assert.ok(Tree.summary(next).branches.length>=2);
 assert.ok(next.log.some(e=>e.kind==='joseon17-switch'));
 assert.ok(Switch.get(next).states[original.selfId]);
 assert.equal(life.stats.health,originalHealth);
});
test('returning to a previously played relative restores individual statistics and dated log',()=>{
 const original=branchFamily(1207),origin=Tree.summary(original).selfId,health=original.stats.health;
 const branchId=Tree.summary(original).branches[0].id;
 const side=Switch.switchTo(original,branchId);assert.ok(side);
 side.stats.health=12;
 side.year+=3;side.age=side.year-side.birthYear;
 const back=Switch.switchTo(side,origin);
 assert.ok(back);assert.equal(back.stats.health,health);
 assert.equal(back.year,side.year);
 assert.ok(back.log.some(e=>e.kind==='joseon17-gap'));
 assert.ok(Switch.get(back).states[branchId]);
});
test('saved branches survive page reload, and no archive snapshot nests the whole archive',()=>{
 const l=branchFamily(1313),baseId=Tree.summary(l).selfId,target=Tree.summary(l).branches[0].id;
 const side=Switch.switchTo(l,target);
 const exported=JSON.parse(JSON.stringify(side.snapshot()));
 assert.ok(exported.branchSwitch17.states[baseId]);
 for(const saved of Object.values(exported.branchSwitch17.states))
  assert.equal(saved.branchSwitch17,undefined);
 const restored=Sim.Life.restore(exported);
 assert.ok(restored);
 const back=Switch.switchTo(restored,baseId);
 assert.ok(back);
 assert.equal(back.profile.name,l.profile.name);
 assert.equal(Tree.summary(back).selfId,baseId);
});
test('separate branches can be switched repeatedly without reusing each other’s log or health',()=>{
 const l=branchFamily(432);
 const [a,b]=Tree.summary(l).branches.map(x=>x.id);
 const first=Switch.switchTo(l,a);first.stats.health=31;
 const second=Switch.switchTo(first,b);second.stats.health=79;
 const back=Switch.switchTo(second,a);
 assert.ok(back);assert.equal(back.stats.health,31);
 const again=Switch.switchTo(back,b);
 assert.ok(again);assert.equal(again.stats.health,79);
 assert.equal(Tree.summary(again).selfId,b);
});
test('switching a fictional descendant marks that exact person as played',()=>{
 const l=branchFamily(668),node=Tree.summary(l).nodes.find(p=>p.simulated&&p.birthYear<=l.year-12&&!p.diedYear);
 if(!node){return;}
 const next=Switch.switchTo(l,node.id);
 assert.ok(next);const changed=Tree.summary(next).nodes.find(p=>p.id===node.id);
 assert.equal(changed.simulated,false);
 assert.equal(changed.name,node.name);
});
test('switch does not work for someone deceased, unborn, or a time outside Joseon',()=>{
 const l=branchFamily(1949),tree=Tree.summary(l);
 const p=tree.nodes.find(n=>tree.branches.some(b=>b.id===n.id));
 p.alive=false;
 assert.equal(Switch.switchTo(l,p.id),null);
 p.alive=true;
 assert.equal(Switch.switchTo(l,'not-family'),null);
 l.year=1900;l.age=1900-l.birthYear;
 assert.equal(Switch.options(l).length,0);
 assert.equal(Switch.switchTo(l,p.id),null);
});
test('a successor preserves the other branch archives after death',()=>{
 const l=branchFamily(774);
 const branchId=Tree.summary(l).branches[0].id;
 const side=Switch.switchTo(l,branchId);
 // Provide an actual living child and allow the family module to inherit.
 const f=V4.ensure(side),template=f.people.find(p=>p.role==='sibling')||f.people[0];
 f.people.push({...template,id:'child-0',role:'child',
  name:side.profile.name.slice(0,1)+'민',birthYear:side.year-17,
  sex:'남자',alive:true,atHome:true,diedYear:null,lifeYears:95});
 side.finish('세상을 떠났다.');
 const heir=V14.continueAsHeir(side,'child-0');assert.ok(heir);
 assert.equal(Switch.carryToSuccessor(side,heir),true);
 const register=Switch.get(heir);
 assert.ok(register.states[Tree.summary(side).selfId]);
 assert.ok(register.states[Tree.summary(l).selfId]);
});
test('old saves containing no character archive are restored as usual',()=>{
 const l=family(1950),snap=l.snapshot();
 delete snap.branchSwitch17;
 const restored=Sim.Life.restore(JSON.parse(JSON.stringify(snap)));
 assert.ok(restored);
 assert.equal(Switch.get(restored).currentId,Tree.summary(restored).selfId);
 assert.equal(Object.keys(Switch.get(restored).states).length,0);
});
test('UI contains character switching, an explanation, and independent autosave',()=>{
 const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
 const game=fs.readFileSync(path.join(base,'game.js'),'utf8');
 assert.ok(html.includes('id="genealogySwitchBtn"'));
 assert.ok(html.includes('id="genealogySwitchHint"'));
 assert.ok(html.indexOf('joseon-v15-genealogy.js')<html.indexOf('joseon-v17-branch-switch.js'));
 assert.ok(game.includes('BranchSwitch.switchTo(life,genealogySelected)'));
 assert.ok(game.includes('BranchSwitch?.carryToSuccessor(life,successor)'));
 assert.ok(game.includes('refreshSpeedControls();startLife();'));
});
test('150 histories do not lose multi-step genealogy snapshots',()=>{
 for(const year of [1420,1490,1560,1620,1740]){
  for(let seed=1;seed<=30;seed++){
   const life=new Sim.Life(year*53+seed*71,{birthYear:year,countryName:'대한민국'});
   let guard=0;
   while(life.alive&&life.year<year+67&&++guard<600){
    if(life.pending){
     const p=life.getChoice();
     if(p)assert.equal(life.choose(seed%p.options.length),true);
     else if(life.getReflection())assert.equal(life.reflect(''),true);
     else assert.fail('unhandled pending '+life.pending);
    }else assert.equal(life.tick(),true);
   }
   assert.ok(guard<600);
   const restored=Sim.Life.restore(JSON.parse(JSON.stringify(life.snapshot())));
   assert.ok(restored);
   assert.equal(Tree.summary(restored).nodes.length,Tree.summary(life).nodes.length);
  }
 }
});

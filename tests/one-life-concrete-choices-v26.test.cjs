'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const root=path.resolve(__dirname,'../games/high_one_life');
const Sim=require(path.join(root,'engine.js'));global.window={OneLifeSim:Sim};
const load=(file,key)=>{const api=require(path.join(root,file));if(key)global.window[key]=api;return api;};
load('world-v2.js','OneLifeWorld2');load('joseon-history-policy.js','OneLifeJoseonPolicy');
load('joseon-v1.js','OneLifeJoseon');load('joseon-v2.js','OneLifeJoseon2');
load('joseon-v3.js','OneLifeJoseon3');load('joseon-v4.js','OneLifeJoseon4');
load('joseon-v5.js','OneLifeJoseon5');load('joseon-v6.js','OneLifeJoseon6');
load('joseon-v7-life.js','OneLifeJoseon7');load('joseon-v8-lineage.js','OneLifeJoseon8');
const V9=load('joseon-v9-village.js','OneLifeJoseon9');
load('joseon-annals-v10.js','OneLifeJoseonAnnals');
load('joseon-v11-late-life.js','OneLifeJoseon11');
load('joseon-v12-regional.js','OneLifeJoseon12');
load('joseon-v13-war-recovery.js','OneLifeJoseon13');
const V14=load('joseon-v14-captivity-generations.js','OneLifeJoseon14');
load('joseon-v15-genealogy.js','OneLifeGenealogyV15');
load('joseon-v17-branch-switch.js','OneLifeBranchSwitchV17');
load('joseon-v18-sedo-samjeong.js','OneLifeJoseon18');
const V19=load('joseon-v19-local-office.js','OneLifeJoseon19');
const C=load('colonial-daily-v2.js','OneLifeColonialDaily');
delete global.window;
const targets=[
 ['colonial',C.EVENTS,C.EVENTS.map(e=>e.id)],
 ['joseonVillage',V9.EVENTS,['water','oxBirth','sickOx','wildBoar','tigerHouse','midwife','filial','market','village','holiday','seollal','gender']],
 ['captivity',V14.EPISODES,['captivityWork','captivityLetters','captivityNews','japanWorkshop','japanFamilyTies','manchuLanguage','manchuRansomNames','ransomOpportunity','homecoming','homeStigma','homeNewFamily']],
 ['localOffice',V19.EVENTS,V19.EVENTS.map(e=>e.id)]
];
test('165 concrete choices: each says WHAT, WHY/RISK and WHAT REMAINS afterward',()=>{
 let cases=0;
 for(const [group,items,ids] of targets){
  const m=new Map(items.map(e=>[e.id,e]));
  for(const id of ids){
   const scene=m.get(id);assert.ok(scene,group+'/'+id);
   const opts=scene.options||scene.opts;
   assert.equal(opts?.length,3,group+'/'+id);
   assert.equal(new Set(opts.map(o=>o.label)).size,3,group+'/'+id+' repeated labels');
   for(const [i,o] of opts.entries()){
    const after=o.result||o.after||o.follow;
    assert.ok(o.label.length>=13,group+'/'+id+'/'+i+' lacks actionable target');
    assert.ok(o.note.length>=26,group+'/'+id+'/'+i+' lacks explanation');
    assert.ok(after?.length>=25,group+'/'+id+'/'+i+' has no concrete aftermath');
    assert.doesNotMatch(o.label,/^(가족을 챙긴다|이웃을 돕는다|기록을 남긴다|상황을 지켜본다|가족을 돌본다|함께한다)$/);
    assert.ok(!/(?:선택하면 무조건|확실하게 귀환|모든 문제가 해결)/.test(after));
    cases++;
   }
  }
 }
 console.log('ONE_LIFE_CONCRETE_CHOICES='+JSON.stringify({episodes:targets.reduce((a,x)=>a+x[2].length,0),options:cases}));
 assert.equal(cases,165);
});
test('land records, medicine, neighbor aid and war letters state a specific action rather than moral intent',()=>{
 const one=(list,id,i)=>{const e=list.find(x=>x.id===id);return e.options[i]};
 assert.match(one(C.EVENTS,'landRegistry',0).label,/문권|세금/);
 assert.match(one(C.EVENTS,'laborNotices',2).note,/쌀|장작|양식/);
 assert.match(one(C.EVENTS,'liberationDay',1).label,/주소|이름/);
 assert.match(one(V9.EVENTS,'filial',0).note,/기침|덮을 것/);
 assert.match(one(V9.EVENTS,'water',0).label,/윗논 주인/);
 assert.match(one(V14.EPISODES,'ransomOpportunity',0).note,/사절|귀환/);
 assert.match(one(V19.EVENTS,'clerkNetwork',0).note,/장부|수량/);
});
test('physical repercussions match the stated action, not unrelated punishment',()=>{
 const ox=V9.EVENTS.find(x=>x.id==='sickOx');
 assert.equal(ox.options[2].delta.chicken,undefined,'isolation must not kill a healthy chicken');
 const boar=V9.EVENTS.find(x=>x.id==='wildBoar');
 assert.equal(boar.options[2].delta.grain,undefined,'reporting a boar to officials must not consume five bags of grain');
 const copy=fs.readFileSync(path.join(root,'joseon-v9-village.js'),'utf8');
 assert.doesNotMatch(copy,/if\(d\.chicken<0&&s\.animals\.chicken===0\)/,'isolation must not arbitrarily destroy other livestock');
 const captives=fs.readFileSync(path.join(root,'joseon-v14-captivity-generations.js'),'utf8');
 assert.doesNotMatch(captives,/if\(e\.id==='homeStigma'&&index!==0\)s\.stigma/,'privacy must not create stigma');
 const colonial=fs.readFileSync(path.join(root,'colonial-daily-v2.js'),'utf8');
 assert.doesNotMatch(colonial,/o\.result\+' '\+memory\.text/,'generic repeated good-deed follow-up');
});
test('actual decision UI exposes HOW and WHY in readable supporting notes',()=>{
 const game=fs.readFileSync(path.join(root,'game.js'),'utf8');
 assert.match(game,/note\.textContent=opt\.note/);
 const styles=fs.readFileSync(path.join(root,'style.css'),'utf8');
 assert.match(styles,/\.choice-option small\{[^}]*font-size:12\.5px/);
 assert.match(styles,/\.choice-option small\{[^}]*line-height:1\.55/);
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 for(const version of ['style.css?v=2','joseon-v9-village.js?v=4','joseon-v14-captivity-generations.js?v=9','colonial-daily-v2.js?v=4'])assert.ok(html.includes(version),version);
});

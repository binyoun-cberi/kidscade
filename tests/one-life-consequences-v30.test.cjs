'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const dir=path.resolve(__dirname,'../games/high_one_life');
const Sim=require(path.join(dir,'engine.js'));global.window={OneLifeSim:Sim};
const load=(f,key)=>{const api=require(path.join(dir,f));if(key)global.window[key]=api;return api;};
load('world-v2.js','OneLifeWorld2');load('joseon-history-policy.js','OneLifeJoseonPolicy');
const J=load('joseon-v1.js','OneLifeJoseon'),V2=load('joseon-v2.js','OneLifeJoseon2');
load('joseon-v3.js','OneLifeJoseon3');load('joseon-v4.js','OneLifeJoseon4');
const V5=load('joseon-v5.js','OneLifeJoseon5');
load('joseon-v6.js','OneLifeJoseon6');load('joseon-v7-life.js','OneLifeJoseon7');
load('joseon-v8-lineage.js','OneLifeJoseon8');const V9=load('joseon-v9-village.js','OneLifeJoseon9');
const L30=load('consequences-v30.js','OneLifeConsequences30');
delete global.window;
function make(seed=79,year=1600){
 const l=new Sim.Life(seed,{birthYear:year,countryName:'대한민국'});
 l.year=year+27;l.age=27;l.alive=true;l.pending=null;
 J.ensure(l).region='경기도';J.ensure(l).land=3;
 V2.ensure(l).grain=20;
 V5.ensure(l).origin='자작 농가';
 V9.ensure(l).homes[0].wealth=90;
 return l;
}
function chooseVillage(l,id,index){
 const s=V9.ensure(l),e=V9.EVENTS.find(x=>x.id===id);assert.ok(e);
 s.active={id:l.year+'-'+id,eventId:id,year:l.year};l.pending='joseon9:'+s.active.id;
 assert.equal(l.getChoice().options.length,3);
 assert.equal(l.choose(index),true);
 return L30.summary(l).arcs.find(a=>a.year===l.year&&a.type===L30.KINDS[id]);
}
function arrive(l,years=3){
 l.year+=years;l.age+=years;l.pending=null;L30.yearly(l);L30.promote(l);
}
test('all four village choices leave durable objects and open distinct future branches',()=>{
 const cases=[['holiday',2,'aid',3],['water',0,'water',2],['toolLoan',0,'tool',4],['sickOx',0,'ox',3]];
 for(const [id,index,type,after] of cases){
  let opened=false;
  // Some neighbors may have moved away. That is an intended alternate
  // consequence, not a failing life; another birth must reach the playable branch.
  for(let seed=171;seed<210&&!opened;seed++){
   const l=make(seed,id==='water'?1620:1600),before=l.year;
   const record=chooseVillage(l,id,index);
   assert.ok(record,id+' had no durable trace');assert.equal(record.type,type);
   assert.equal(record.due,before+after);
   assert.equal(L30.summary(l).open,1);
   const restored=Sim.Life.restore(JSON.parse(JSON.stringify(l.snapshot())));
   assert.deepEqual(L30.summary(restored),L30.summary(l),'missing trace on restore '+id);
   arrive(restored,after);
   if(!restored.pending?.startsWith('life30:')){
    assert.equal(L30.summary(restored).arcs[0].status,'closed','unexpected lost follow-up '+id);
    continue;
   }
   opened=true;
   const prompt=restored.getChoice();
   assert.equal(prompt.options.length,3);assert.ok(prompt.description.length>30);
   assert.equal(restored.choose(0),true);
   assert.equal(L30.summary(restored).arcs[0].status,'resolved');
   assert.equal(L30.summary(restored).open,0);
   assert.ok(restored.log.some(x=>x.kind==='life30-result'&&x.causeId.startsWith('life30:')));
  }
  assert.equal(opened,true,'never offered future branch '+id);
 }
});
test('same birth but different help produces different future opportunity and cause',()=>{
 const generous=make(311),reserved=make(311);
 chooseVillage(generous,'holiday',2);
 chooseVillage(reserved,'holiday',0);
 assert.equal(L30.summary(generous).open,1);
 assert.equal(L30.summary(reserved).open,0);
 arrive(generous,3);arrive(reserved,3);
 assert.ok(!String(reserved.pending||'').startsWith('life30:'));
 assert.ok(['open','closed'].includes(L30.summary(generous).arcs[0].status));
 if(L30.summary(generous).arcs[0].status==='open')assert.match(generous.pending||'',/^life30:/);
});
test('same household cannot receive free rice if neighbor has too little',()=>{
 const l=make(314);
 chooseVillage(l,'holiday',2);
 const arc=L30.ensure(l).arcs[0];
 arrive(l,3);
 if(l.pending){V9.ensure(l).homes[0].wealth=10;const before=V2.ensure(l).grain;
  const scene=l.getChoice();
  assert.match(scene.options[0].label,/밭두렁/);
  assert.equal(l.choose(0),true);
  assert.equal(V2.ensure(l).grain,before,'poor neighbor cannot materialize grain');
  assert.equal(arc.status,'resolved');
 }
});
test('an absent neighbor or lost field closes a promise without reviving a character',()=>{
 const away=make(402);chooseVillage(away,'holiday',2);
 L30.ensure(away).people.n0.present=false;arrive(away,3);
 assert.ok(!String(away.pending||'').startsWith('life30:'));
 assert.equal(L30.summary(away).arcs[0].status,'closed');
 const landless=make(501);chooseVillage(landless,'water',0);
 J.ensure(landless).land=0;V5.ensure(landless).origin='어부 가계';
 arrive(landless,2);
 assert.equal(L30.summary(landless).arcs[0].status,'closed');
});
test('tools cannot be borrowed without a real source, and grainless families can pay with labor',()=>{
 const l=make(622),e=V9.EVENTS.find(x=>x.id==='toolLoan');
 assert.ok(e);assert.equal(V9.eligible(l,e),true);
 V9.ensure(l).homes[0].wealth=0;assert.equal(V9.eligible(l,e),false);
 V9.ensure(l).homes[0].wealth=80;
 V2.ensure(l).grain=0;
 const s=V9.ensure(l);
 s.active={id:l.year+'-toolLoan',year:l.year,eventId:'toolLoan'};l.pending='joseon9:'+s.active.id;
 const presented=l.getChoice();assert.match(presented.options[1].label,/품일/);
 assert.equal(l.choose(1),true);
 assert.equal(V2.ensure(l).grain,0);
 assert.equal(L30.summary(l).arcs[0].type,'tool');
});
test('ill animal is not resurrected when all livestock were already lost',()=>{
 const l=make(625);
 chooseVillage(l,'sickOx',1);
 V9.ensure(l).animals.ox=0;
 arrive(l,3);
 assert.equal(L30.summary(l).arcs[0].status,'closed');
 assert.equal(V9.ensure(l).animals.ox,0);
});
test('one pending branch survives save and cannot duplicate at the same year',()=>{
 const l=make(631);chooseVillage(l,'water',1);arrive(l,2);
 if(L30.summary(l).arcs[0].status==='open'){
  assert.ok(l.pending?.startsWith('life30:'));
  const s=JSON.parse(JSON.stringify(l.snapshot())),copy=Sim.Life.restore(s);
  assert.equal(copy.pending,l.pending);
  assert.deepEqual(copy.getChoice(),l.getChoice());
  assert.equal(copy.choose(2),true);
  assert.equal(L30.summary(copy).arcs.length,1);
  L30.promote(copy);assert.ok(!String(copy.pending||'').startsWith('life30:'));
 }
});
test('exact module ordering and accessible records on screen',()=>{
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 const j=html.indexOf('joseon-v9-village.js?v=6'),c=html.indexOf('consequences-v30.js?v=1');
 const g=html.search(/game\.js\?v=\d+/);
 assert.ok(j>=0&&c>j&&g>c);
 for(const id of ['life30Panel','life30Count','life30Records'])assert.ok(html.includes('id="'+id+'"'));
 const ui=fs.readFileSync(path.join(dir,'game.js'),'utf8');
 assert.ok(ui.includes('Life30.summary(life)'));assert.ok(ui.includes('paintLife30();'));
});

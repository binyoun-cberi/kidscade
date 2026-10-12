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
function born(year,seed){
 const life=new Sim.Life(seed,{birthYear:year,countryName:'대한민국'});
 if(J.isJoseon(life)){J.ensure(life);V2.ensure(life);V3.ensure(life);V4.ensure(life);}
 return life;
}
function advance(life,target,selection=0){
 let guard=0;
 while(life.alive&&life.year<target){
  assert.ok(++guard<150,'stuck '+life.year+' '+life.pending);
  if(life.pending){
   const choice=life.getChoice();
   if(choice)assert.equal(life.choose(selection%choice.options.length),true);
   else if(life.getReflection())assert.equal(life.reflect(''),true);
   else assert.fail('unknown pending '+life.pending);
  }else assert.equal(life.tick(),true);
 }
 return life;
}
test('Joseon born households and older children continue changing after 1900',()=>{
 const l=advance(born(1870,17),1920);
 assert.equal(l.year,1920);assert.ok(l.alive);
 assert.equal(V4.ensure(l).processedYear,l.year);
 const family=V4.summary(l),child=family.people.find(p=>p.role==='child');
 assert.ok(child&&child.age>=16);
 assert.notEqual(child.work,'자라는 중');
 assert.ok(family.atHome<=family.alive);
 const restored=Sim.Life.restore(JSON.parse(JSON.stringify(l.snapshot())));
 assert.equal(restored.pending,l.pending);
 assert.equal(V4.ensure(restored).processedYear,l.year);
 assert.deepEqual(V4.summary(restored).people,family.people);
});
test('independent relatives are not counted as living under the same roof',()=>{
 const l=advance(born(1500,17),1543);
 assert.ok(l.alive);
 const f=V4.summary(l);
 assert.ok(f.people.some(p=>p.role==='sibling'&&!p.atHome));
 assert.ok(f.atHome<f.alive);
 assert.equal(J.ensure(l).household,1+f.atHome);
 assert.equal(new Set(f.people.map(p=>p.name)).size,f.people.length);
});
test('dialogue and followups do not expose code-like phrases or broken Korean particles',()=>{
 const a=advance(born(1580,17),1625);
 const b=advance(born(1645,17),1685,1);
 for(const life of [a,b]){
  const lines=life.log.filter(e=>e.kind.startsWith('joseon')).map(e=>e.text);
  assert.ok(lines.length>15);
  assert.ok(lines.every(t=>!/와의 일:|다고 선택했던 일이|는 선택이 지금의|춘식가|점순와/.test(t)));
  assert.ok(lines.some(t=>t.includes('피란')||t.includes('곡식')));
  assert.ok(lines.some(t=>t.includes('익힌')||t.includes('도왔')||t.includes('돌보')));
 }
});
test('commoner civil examination and middle-class technical examinations are distinct',()=>{
 const l=born(1740,17),s=J.ensure(l);
 l.gender='남자';s.birthStatus='상민';s.status='상민';
 s.active={id:'test-exam',kind:'examination'};
 assert.match(J.promptFor(l,s).options[0].label,/문과/);
 s.birthStatus='중인';s.status='중인';
 assert.match(J.promptFor(l,s).title,/기술직/);
 assert.ok(J.promptFor(l,s).options.some(o=>o.action==='technical'));
});
test('historical interface avoids modern survival curves and supports specific endings',()=>{
 const code=fs.readFileSync(path.join(root,'game.js'),'utf8');
 assert.match(code,/if\(Joseon\.isJoseon\(life\)\)\{\s*\$\('survivalChart'\)/);
 assert.match(code,/const aftermath=\{/);
 assert.match(code,/joseon4-followup/);
 assert.doesNotMatch(code,/join\('과\/와 '\)/);
});
test('1900+ births stay on their existing system; historical saves remain loadable',()=>{
 for(const year of [1900,1919,2026]){
  const l=advance(born(year,17),year+5);
  assert.equal(V4.summary(l),null);
  assert.equal(l.snapshot().joseon4,undefined);
 }
 const save=JSON.parse(JSON.stringify(born(1700,42).snapshot()));
 delete save.joseon4;
 const l=Sim.Life.restore(save);
 assert.ok(V4.ensure(l));
 assert.equal(V4.summary(l).decisions,0);
});
test('300 varied lives progress and save without duplicated relatives or frozen years',()=>{
 let checked=0;
 for(const year of [1392,1580,1670,1800,1870,1919]){
  for(let seed=1;seed<=50;seed++){
   const life=advance(born(year,year+seed*149),year+90,seed%3);
   const save=JSON.parse(JSON.stringify(life.snapshot()));
   const restored=Sim.Life.restore(save);
   assert.equal(restored.pending,life.pending);
   if(J.isJoseon(life)){
    const f=V4.summary(life);
    assert.ok(f.atHome<=f.alive);
    assert.equal(new Set(f.people.map(p=>p.id)).size,f.people.length);
    assert.ok(f.people.every(p=>p.age<130));
    if(life.alive&&life.year>1900)assert.equal(life.joseon4.processedYear,life.year);
   }
   checked++;
  }
 }
 assert.equal(checked,300);
});

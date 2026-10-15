'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../games/high_one_life');
const Identity=require(path.join(root,'identity-v20.js'));
const Sim=require(path.join(root,'engine.js'));
global.window={OneLifeSim:Sim};
const load=(file,key)=>{const m=require(path.join(root,file));if(key)window[key]=m;return m;};
const W2=load('world-v2.js','OneLifeWorld2');
for(const [filename,key] of [
 ['world-v3.js','OneLifeWorld3'],['world-v4.js','OneLifeWorld4'],
 ['world-v5.js','OneLifeWorld5'],['careers-v6.js','OneLifeCareers6'],
 ['events-v6.js','OneLifeEvents6'],['world-v6.js','OneLifeWorld6'],
 ['world-v7.js','OneLifeWorld7'],['world-v8.js','OneLifeWorld8']])load(filename,key);
const World9=load('world-v9.js','OneLifeWorld9');
load('joseon-history-policy.js','OneLifeJoseonPolicy');
const J=load('joseon-v1.js','OneLifeJoseon');
load('joseon-v2.js','OneLifeJoseon2');
load('joseon-v3.js','OneLifeJoseon3');
const V4=load('joseon-v4.js','OneLifeJoseon4');
const V5=load('joseon-v5.js','OneLifeJoseon5');
const V8=load('joseon-v8-lineage.js','OneLifeJoseon8');
delete global.window;
const born=(year,setup,seed=11223)=>new Sim.Life(seed,{birthYear:year,countryName:'대한민국',birthSetup:setup});

test('starting without choices keeps randomized birth fields',()=>{
 const life=born(1820,{});assert.equal(life.birthYear,1820);
 assert.equal(life.birthSetup.name,'');assert.equal(life.birthSetup.origin,'');
 assert.ok(['여자','남자'].includes(life.gender));
});

test('selected historic name gender and origin drive actual family state and survive save',()=>{
 const life=born(1820,{name:'홍길동',gender:'여자',origin:'사노비'},18021);
 assert.equal(life.gender,'여자');
 W2.enrich(life);J.ensure(life);V5.ensure(life);V8.ensure(life);
 assert.equal(life.profile.name,'홍길동');
 assert.equal(J.ensure(life).birthStatus,'천민');
 assert.equal(V5.summary(life).origin,'사노비');
 assert.equal(V8.summary(life).surname,'홍');
 const copy=Sim.Life.restore(JSON.parse(JSON.stringify(life.snapshot())));
 assert.equal(copy.profile.name,'홍길동');assert.equal(copy.gender,'여자');
 assert.equal(V5.summary(copy).origin,'사노비');assert.equal(V8.summary(copy).surname,'홍');
});

test('broad noble class and a royal house are distinct starts',()=>{
 const noble=born(1700,{origin:'양반'},17),royal=born(1700,{origin:'왕실 종친'},18);
 assert.equal(J.ensure(noble).birthStatus,'양반');
 assert.equal(J.ensure(royal).birthStatus,'양반');
 assert.equal(V5.summary(royal).origin,'왕실 종친');
});

test('origin selection closes at the proper period and family means household income after 1894',()=>{
 assert.equal(Identity.normalizeBirth(1887,{origin:'사노비'}).origin,'');
 assert.equal(Identity.normalizeBirth(1894,{origin:'왕실 종친'}).origin,'');
 const l=born(1896,{origin:'사노비',gender:'남자',familyLevel:'빠듯한 형편'},55);
 assert.equal(l.birthSetup.origin,'');assert.equal(l.familyLevel,'빠듯한 형편');
 assert.equal(J.ensure(l).family,'빠듯한 형편');
 const modern=born(2026,{name:'김다온',gender:'남자',familyLevel:'여유 있는 형편'},56);
 assert.equal(modern.familyLevel,'여유 있는 형편');
 assert.equal(W2.enrich(modern).profile.name,'김다온');
 const copy=Sim.Life.restore(JSON.parse(JSON.stringify(modern.snapshot())));
 assert.equal(copy.birthSetup.familyLevel,'여유 있는 형편');
});

test('malformed names and birth origins never enter the game state',()=>{
 assert.equal(Identity.cleanName('<img src=x>'),'');
 assert.equal(Identity.normalizeBirth(1820,{origin:'왕',name:'<script>'}).origin,'');
 const life=born(1820,{name:'가'.repeat(40),gender:'기타',origin:'임금'},42);
 assert.equal(life.birthSetup.name,'');assert.equal(life.birthSetup.gender,'');
});

test('newborn name changes a historical family record and persists without a second prompt',()=>{
 const life=born(1800,{name:'홍길동',gender:'남자'},33);
 J.ensure(life);V8.ensure(life);
 life.year=1830;life.age=30;
 const state=V4.ensure(life),template=state.people[0];
 state.people.push({...template,id:'child-test',role:'child',name:'홍순덕',sex:'여자',birthYear:1830,alive:true});
 life.logEvent('홍순덕이 태어났다. 아이가 울었다.','joseon4-family');
 const candidate=Identity.newborn(life,state.people,null);
 assert.equal(candidate?.id,'j:child-test');
 assert.ok(Identity.rename(life,candidate,'미란',V8.ensure(life).surname));
 assert.equal(state.people.at(-1).name,'홍미란');
 assert.ok(life.log.some(x=>x.text.includes('홍미란이 태어났다')));
 assert.equal(Identity.newborn(life,state.people,null),null);
 const copy=Sim.Life.restore(JSON.parse(JSON.stringify(life.snapshot())));
 assert.equal(V4.ensure(copy).people.find(x=>x.id==='child-test').name,'홍미란');
 assert.equal(Identity.newborn(copy,V4.ensure(copy).people,null),null);
});

test('newborn name in a modern family persists and uses no Joseon surname',()=>{
 const life=born(2026,{},102);W2.enrich(life);
 life.year=2056;life.age=30;
 const state=World9.ensure(life);
 state.people.push({...state.people[0],id:'child-1',role:'자녀',name:'다은',birthYear:2056,alive:true});
 life.logEvent('다은(이)가 가족이 되었다.','relationship');
 const baby=Identity.newborn(life,null,state.people);
 assert.ok(baby);
 assert.ok(Identity.rename(life,baby,'하늘'));
 assert.equal(state.people.find(x=>x.id==='child-1').name,'하늘');
 const copy=Sim.Life.restore(JSON.parse(JSON.stringify(life.snapshot())));
 assert.equal(World9.ensure(copy).people.find(x=>x.id==='child-1').name,'하늘');
 assert.equal(Identity.newborn(copy,null,World9.ensure(copy).people),null);
});

test('start and birth controls are wired and loaded ahead of the engine',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const script=fs.readFileSync(path.join(root,'game.js'),'utf8');
 for(const id of ['birthNameInput','birthGenderInput','birthOriginInput','birthFamilyInput','birthRandomBtn',
  'newbornModal','newbornNameInput','newbornNameConfirm','newbornNameRandom'])assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(html.indexOf('identity-v20.js')<html.indexOf('engine.js'));
 assert.ok(script.includes('offerNewbornName()'));
 assert.ok(script.includes('birthSetup:life.birthSetup'));
});

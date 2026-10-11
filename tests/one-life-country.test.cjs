'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..','games','high_one_life');
const Sim=require(path.join(root,'engine.js'));
global.window={OneLifeSim:Sim};
const World2=require(path.join(root,'world-v2.js'));
global.window.OneLifeWorld2=World2;
const World3=require(path.join(root,'world-v3.js'));
delete global.window;
const read=x=>fs.readFileSync(path.join(root,x),'utf8');
function run(country,seed,choose=(life)=>life.age%3){
 const person=new Sim.Life(seed>>>0);
 person.country=Sim.COUNTRIES.find(c=>c[0]===country);
 assert.ok(person.country);
 World3.setup(person);
 let presses=0,years=0;
 while(person.alive&&years<110){
  if(person.pending){
   assert.ok(person.getChoice(),'unexpected reflection or invalid choice at '+person.age);
   assert.ok(World3.PAUSE_AGES.includes(person.age));
   assert.ok(person.choose(choose(person)));
   presses++;continue;
  }
  person.tick();years++;
 }
 assert.ok(!person.alive,'life should eventually end');
 return {person,presses};
}
test('national demographic references and educational proxy are clearly labeled',()=>{
 assert.ok(World3.LIFE_2024['대한민국']>World3.LIFE_2024['인도']);
 assert.ok(World3.LIFE_2024['인도']>World3.LIFE_2024['나이지리아']);
 assert.match(read('world-v3.js'),/SP.DYN.LE00.IN/);
 assert.match(read('world-v3.js'),/NOT published country rates/);
 assert.match(read('index.html'),/countrySourceNote/);
 assert.match(read('index.html'),/world-v3\.js/);
 assert.match(read('game.js'),/const YEAR_MS = 260/);
 assert.match(read('game.js'),/World4\.ensure\(life\)/);
 assert.doesNotMatch(read('index.html'),/data-speed=|data-duration=/);
});
test('3 national cohorts have visibly different yet overlapping lives; all finish quickly',()=>{
 const samples={};const states={};
 for(const country of ['일본','인도','나이지리아']){
  const ages=[],income=[],schoolStatus=new Set(),professions=new Set(),stops=new Set();
  for(let i=1;i<=220;i++){
   const {person}=run(country,Math.imul(i+82,2654435761),life=>{
    stops.add(life.age);return (i+life.age)%life.getChoice().options.length;
   });
   ages.push(person.age);income.push(person.money.income);
   schoolStatus.add(person.world.educationLevel);
   professions.add(person.world.occupation);
   assert.ok(person.stats.health>=0&&person.stats.health<=100);
   assert.ok(Number.isFinite(person.money.netWorth));
  }
  const mean=ages.reduce((a,b)=>a+b,0)/ages.length;
  const meanIncome=income.reduce((a,b)=>a+b,0)/income.length;
  samples[country]={age:mean,income:meanIncome,range:Math.max(...ages)-Math.min(...ages)};
  states[country]={schoolStatus:schoolStatus.size,professions:professions.size,stops:[...stops]};
  assert.ok(states[country].schoolStatus>=2,'no alternate educational routes');
  assert.ok(states[country].professions>=3,'too few jobs in '+country);
  assert.deepEqual([...stops].sort((a,b)=>a-b),[16,20,29,42,64].filter(age=>ages.some(x=>x>=age)));
  assert.ok(samples[country].range>=20,'same-country lifetimes lack variety');
 }
 assert.ok(samples['일본'].age>samples['인도'].age+6);
 assert.ok(samples['인도'].age>samples['나이지리아'].age+7);
 // Salary generation (not last income after retirement) is checked below.
});
test('country and household change opportunities and salaries, while chance remains meaningful',()=>{
 const wages={};
 for(const name of ['미국','대한민국','인도','나이지리아']){
  const c=Sim.COUNTRIES.find(item=>item[0]===name);
  const factor=World2.COUNTRY_FACTOR(c)*World3.countryEconomy(c);
  wages[name]=factor;
 }
 assert.ok(wages['미국']>wages['나이지리아']*5);
 assert.ok(wages['대한민국']>wages['인도']*3);
 const person=run('인도',88888).person;
 assert.ok(person.world.educationYears>=0);
 assert.ok(['농촌','도시','소도시'].includes(person.profile.settlement));
 assert.ok(person.log.some(e=>e.kind==='milestone'));
});
test('save restore is exact after 29-year milestone, including country context and yearly ledger',()=>{
 for(const c of ['대한민국','나이지리아','인도']){
  const person=new Sim.Life(123366),country=Sim.COUNTRIES.find(x=>x[0]===c);
  person.country=country;World3.setup(person);
  while(person.alive&&person.age<29){
   if(person.pending)person.choose(0);else person.tick();
  }
  assert.ok(person.alive);
  const save=person.snapshot(),copy=Sim.Life.restore(JSON.parse(JSON.stringify(save)));
  assert.ok(copy);
  assert.deepEqual(copy.snapshot(),save);
  if(person.pending){person.choose(0);copy.choose(0);}
  for(let j=0;j<8&&person.alive;j++){
   if(person.pending){person.choose(0);copy.choose(0);}
   else {person.tick();copy.tick();}
  }
  assert.deepEqual(copy.snapshot(),person.snapshot());
 }
});

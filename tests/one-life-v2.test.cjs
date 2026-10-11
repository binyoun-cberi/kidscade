'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.resolve(__dirname,'..');
const dir=path.join(base,'games','high_one_life');
const Sim=require(path.join(dir,'engine.js'));
global.window={OneLifeSim:Sim};
const World=require(path.join(dir,'world-v2.js'));
const Pixels=require(path.join(dir,'pixel-scene.js'));
delete global.window;
const read=f=>fs.readFileSync(path.join(dir,f),'utf8');
test('One Life v2 provides concrete birth profile, financial statement and pixel scene',()=>{
 const html=read('index.html');
 for(const id of ['birthCertificate','birthName','birthDate','birthMother','birthFather','birthSiblings',
  'lifeScene','sceneLabel','profileName','nameHeadline','netWorth','annualIncome','annualExpense',
  'annualBalance','employmentStatus','endNetWorth']) assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(html,/world-v2\.js\?v=2/);
 assert.match(html,/pixel-scene\.js\?v=2/);
 assert.match(html,/v2-style\.css/);
 assert.match(read('v2-style.css'),/@media\(max-width:440px\)/);
 assert.doesNotThrow(()=>new Function(read('game.js')));
});
test('1000 lives cover all decisions, positive/negative balances and stable save/restore',()=>{
 let complete=0,choices=0,saveCount=0;
 const nations=new Set();let debtSeen=false,bonusSeen=false;
 for(let seed=1;seed<=1000;seed++){
  const life=new Sim.Life(Math.imul(seed,2654435761)>>>0);
  World.enrich(life);
  assert.ok(life.profile.name.length>0);
  assert.ok(life.profile.city.length>0);
  assert.ok(life.profile.motherAge>=22 && life.profile.fatherAge>=23);
  assert.ok(life.profile.siblings>=0);
  nations.add(life.country[0]);
  let loops=0;
  while(life.alive && loops<109){
   if(life.pending){
    if(life.getChoice()) assert.equal(life.choose((seed+life.age)%life.getChoice().options.length),true);
    else if(life.getReflection())assert.equal(life.reflect(''),true);
    else assert.fail('unknown pending: '+life.pending);
    choices++;continue;
   }
   life.tick();loops++;
   if(life.money.netWorth<0)debtSeen=true;
   if(life.money.netWorth>0)bonusSeen=true;
   for(const key of ['netWorth','income','expense','lastBalance'])assert.ok(Number.isFinite(life.money[key]),key);
   if(life.alive&&[10,20,24,33,37,48,64,73].includes(life.age)){
    const restored=Sim.Life.restore(JSON.parse(JSON.stringify(life.snapshot())));
    assert.deepEqual(restored.snapshot(),life.snapshot(),'restore diverged at age '+life.age);
    saveCount++;
   }
  }
  assert.equal(life.alive,false,'never finished for seed '+seed);
  complete++;
 }
 assert.equal(complete,1000);
 assert.ok(choices>10000,choices+' decisions');
 assert.ok(saveCount>6000);
 assert.ok(nations.size>=75,nations.size+' nations');
 assert.ok(debtSeen && bonusSeen,'finance never crosses positive and negative');
});
test('extra adult decision survives reload and changes household state',()=>{
 const person=new Sim.Life(123456);World.enrich(person);
 let tickCount=0;
 while(person.age<37&&person.alive&&tickCount<40){
  if(person.pending){
   if(person.getChoice()){
    const choice=person.getChoice();
    if(choice.age===33)person.choose(0);
    else if(choice.age===37)break;
    else person.choose(0);
   }else if(person.getReflection())person.reflect();
  }else{person.tick();tickCount++;}
 }
 assert.equal(person.pending,'extra:37');
 const restored=Sim.Life.restore(JSON.parse(JSON.stringify(person.snapshot())));
 assert.equal(restored.pending,'extra:37');
 assert.equal(restored.choose(0),true);
 assert.equal(restored.profile.child,true);
 assert.equal(restored.profile.partner,true);
});
test('pixel diorama draws environment, stages and household variants without image network',()=>{
 const stages=new Set();let rects=0;
 const ctx={fillRect(){rects++},fillText(){},set fillStyle(x){},set imageSmoothingEnabled(x){},set textAlign(x){},set font(x){}};
 const canvas={width:0,height:0,getContext:()=>ctx};
 const person=new Sim.Life(6757);World.enrich(person);
 for(const age of [0,8,22,33,37,64,90]){
  person.age=age;person.year=2026+age;
  if(age>=37){person.profile.child=true;person.profile.partner=true;}
  stages.add(Pixels.paint(canvas,person));
 }
 assert.equal(canvas.width,600);
 assert.equal(canvas.height,258);
 assert.ok(stages.has('가정')&&stages.has('학교')&&stages.has('노년의 일상'));
 assert.ok(rects>500);
});

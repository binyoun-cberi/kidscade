'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const dir=path.join(__dirname,'..','games','high_one_life');
const Sim=require(path.join(dir,'engine.js'));
global.window={OneLifeSim:Sim};
const W2=require(path.join(dir,'world-v2.js'));global.window.OneLifeWorld2=W2;
const W3=require(path.join(dir,'world-v3.js'));global.window.OneLifeWorld3=W3;
const W4=require(path.join(dir,'world-v4.js'));global.window.OneLifeWorld4=W4;
const W5=require(path.join(dir,'world-v5.js'));global.window.OneLifeWorld5=W5;
const Careers=require(path.join(dir,'careers-v6.js'));global.window.OneLifeCareers6=Careers;
const Events=require(path.join(dir,'events-v6.js'));global.window.OneLifeEvents6=Events;
const W6=require(path.join(dir,'world-v6.js'));global.window.OneLifeWorld6=W6;
const BaseScene=require(path.join(dir,'pixel-scene.js'));global.window.OneLifeScene=BaseScene;
const Scene=require(path.join(dir,'scenes-v6.js'));
delete global.window;
function play(seed,country,selected=1){
 const p=new Sim.Life(seed>>>0);
 if(country)p.country=Sim.COUNTRIES.find(x=>x[0]===country);
 W6.ensure(p);
 let years=0;
 while(p.alive&&years<110){
  if(p.pending){const c=p.getChoice();assert.ok(c);assert.equal(p.choose(p.age===20?selected:1),true);}
  else{p.tick();years++;}
  assert.ok(Number.isFinite(p.money.netWorth));
 }
 assert.equal(p.alive,false);
 return p;
}
test('career catalogue offers 84 professions in twelve areas and 32 image scenes',()=>{
 assert.equal(Object.keys(Careers.tracks).length,12);
 assert.equal(Object.values(Careers.tracks).reduce((n,d)=>n+d.jobs.length,0),84);
 assert.equal(new Set(Object.values(Careers.tracks).flatMap(d=>d.jobs)).size,84);
 assert.equal(Careers.scenes.length,32);
 assert.equal(new Set(Careers.scenes).size,32);
 assert.equal(Events.events.length,170);
 assert.equal(W4.EVENTS.length+W5.templates.length+Events.events.length,314);
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 for(const file of ['careers-v6.js','events-v6.js','world-v6.js','scenes-v6.js','world-v6.css'])
  assert.ok(html.includes(file),file);
 for(const id of ['careerCurrent','careerJourney','careerChangeCount'])assert.ok(html.includes('id="'+id+'"'));
 assert.match(fs.readFileSync(path.join(dir,'game.js'),'utf8'),/const YEAR_MS = 4000/);
});
test('32 original pixel scenes draw different stage labels and visible props',()=>{
 const canvas={width:600,height:258};
 let rects=0,labels=[];
 canvas.getContext=()=>({fillRect(){rects++;},fillText(x){labels.push(x);},
  set fillStyle(x){},set font(x){},set textAlign(x){},set imageSmoothingEnabled(x){}});
 for(const scene of Careers.scenes){
  const p=new Sim.Life(81120);W6.ensure(p);p.age=40;p.world6.scene=scene;
  assert.equal(Scene.paint(canvas,p),scene);
 }
 assert.ok(rects>2200);
 assert.equal(Object.keys(Scene.names).length,32);
 assert.ok(new Set(labels).size>=32);
});
test('1500 lives complete with different jobs and savings paths',()=>{
 const jobs=new Set(),regions=new Set(),scenes=new Set(),events=new Set();
 let runs=0,saveChecks=0,jobSwitchers=0;
 for(let i=1;i<=1500;i++){
  const p=new Sim.Life(Math.imul(i,2654435761)>>>0);W6.ensure(p);let years=0;
  while(p.alive&&years<110){
   if(p.pending){assert.ok(p.getChoice());p.choose((i+p.age)%p.getChoice().options.length);}
   else {p.tick();years++;}
   if(p.world6.profession){jobs.add(p.world6.profession);scenes.add(p.world6.scene);}
   if(p.age===42&&p.alive&&!p.pending){
    const s=JSON.parse(JSON.stringify(p.snapshot()));
    assert.deepEqual(Sim.Life.restore(s).snapshot(),s);
    saveChecks++;
   }
  }
  assert.equal(p.alive,false);
  runs++;regions.add(p.country[0]);jobSwitchers+=p.world6.history.length>1;
  for(const e of p.world6.seen)events.add(e);
 }
 assert.equal(runs,1500);
 assert.ok(jobs.size>=76,'too few career identities reached');
 assert.ok(scenes.size>=22,'pixel scenes not driven by careers');
 assert.ok(regions.size>=70,'birth diversity collapsed');
 assert.ok(events.size>=140,'new conditional stories rarely reached');
 assert.ok(jobSwitchers>=600,'job changes never occur');
 assert.ok(saveChecks>1100);
});
test('same birth but different choices change livelihoods and finances decades later',()=>{
 for(const nation of ['인도','대한민국','나이지리아']){
  let eligible=0,jobDifferent=0,moneyDifferent=0;
  for(let i=1;i<=110;i++){
   const seed=Math.imul(i+17,2654435761)>>>0;
   const lives=[0,1,2].map(choice=>play(seed,nation,choice));
   if(!lives.every(p=>p.arc.decisions.some(x=>x.age===20)))continue;
   eligible++;
   jobDifferent+=new Set(lives.map(p=>p.world6.profession)).size>1;
   moneyDifferent+=new Set(lives.map(p=>p.money.netWorth)).size>1;
  }
  assert.ok(eligible>85);
  assert.ok(jobDifferent/eligible>.55,nation+' career selection collapsed');
  assert.ok(moneyDifferent/eligible>.7,nation+' money outcomes collapsed');
 }
});
test('job history survives save/restore with identical continued event outcomes',()=>{
 const p=new Sim.Life(9182729);W6.ensure(p);let years=0;
 while(p.alive&&p.age<44&&years<110){if(p.pending)p.choose(1);else {p.tick();years++;}}
 assert.ok(p.alive);
 const saved=JSON.parse(JSON.stringify(p.snapshot()));
 const q=Sim.Life.restore(saved);assert.deepEqual(q.snapshot(),saved);
 for(let i=0;i<12&&p.alive;i++){
  if(p.pending){p.choose(1);q.choose(1);}
  else{p.tick();q.tick();}
  assert.deepEqual(q.snapshot(),p.snapshot());
 }
});

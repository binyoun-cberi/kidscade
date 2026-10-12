'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const root=path.join(__dirname,'../games/high_one_life');
const Sim=require(path.join(root,'engine.js'));
global.window={OneLifeSim:Sim};
const V2=require(path.join(root,'world-v2.js'));global.window.OneLifeWorld2=V2;
const V3=require(path.join(root,'world-v3.js'));global.window.OneLifeWorld3=V3;
const V4=require(path.join(root,'world-v4.js'));global.window.OneLifeWorld4=V4;
const V5=require(path.join(root,'world-v5.js'));global.window.OneLifeWorld5=V5;
const Careers=require(path.join(root,'careers-v6.js'));global.window.OneLifeCareers6=Careers;
const Events=require(path.join(root,'events-v6.js'));global.window.OneLifeEvents6=Events;
const V6=require(path.join(root,'world-v6.js'));global.window.OneLifeWorld6=V6;
const V7=require(path.join(root,'world-v7.js'));global.window.OneLifeWorld7=V7;
const V8=require(path.join(root,'world-v8.js'));global.window.OneLifeWorld8=V8;
const Base=require(path.join(root,'pixel-scene.js'));global.window.OneLifeScene=Base;
const V6Scene=require(path.join(root,'scenes-v6.js'));global.window.OneLifeScenes6=V6Scene;
const V8Scene=require(path.join(root,'scenes-v8.js'));delete global.window;
function birth(seed,country){
 const l=new Sim.Life(seed>>>0);
 if(country)l.country=Sim.COUNTRIES.find(c=>c[0]===country);
 V8.ensure(l);V8.moment(l);return l;
}
function finish(l,index=1){
 let years=0;
 while(l.alive&&years<111){
  if(l.pending){const c=l.getChoice();
   if(c)assert.equal(l.choose(Math.min(index,c.options.length-1)),true);
   else if(l.getReflection())l.reflect();
   else assert.fail('Unresolved pause '+l.age);
  }else{l.tick();years++;}
 }
 assert.equal(l.alive,false,'Lifetime did not finish');
}
test('v8 maintains fast game, four in-game panels, original choices and existing save key',()=>{
 const h=fs.readFileSync(path.join(root,'index.html'),'utf8'),g=fs.readFileSync(path.join(root,'game.js'),'utf8');
 for(const file of ['world-v8.js','scenes-v8.js','world-v8.css'])assert.ok(h.includes(file),file);
 for(const id of ['birthHome','birthContext','storyTools','survivalChart','survivalActual','survivalOther','survivalDot','ageMap','peers'])
  assert.ok(h.includes('id="'+id+'"'),'Missing UI '+id);
 assert.match(g,/YEAR_MS = 260/);
 assert.equal((h.match(/data-story-tab=/g)||[]).length,4);
 assert.equal((h.match(/data-peer-age=/g)||[]).length,5);
 assert.match(h,/나이별 곡선은 게임에서 재구성한 값/);assert.match(h,/개인의 수명이나 사망 시기를 알려 주지는 않습니다/);
});
test('birth home and parent occupations persist with the same birth seed',()=>{
 for(const nation of ['케냐','대한민국','인도','모나코','나이지리아']){
  const a=birth(813147,nation),b=birth(813147,nation);
  assert.equal(V8.synopsis(a),V8.synopsis(b));
  assert.equal(a.world8.housing,b.world8.housing);
  assert.equal(a.world8.regionName,b.world8.regionName);
  assert.match(V8.synopsis(a),/어머니/);
  assert.equal(a.world8.stories.length,1);
  const s=JSON.parse(JSON.stringify(a.snapshot()));
  assert.deepEqual(Sim.Life.restore(s).snapshot(),s);
 }
});
test('all 103 countries have contextual climate and a monotone bounded model survival curve',()=>{
 assert.equal(Sim.COUNTRIES.length,103);
 const climates=new Set(),towns=new Set();
 for(const c of Sim.COUNTRIES){
  const l=birth(112491,c[0]),p=l.world8;
  assert.ok(p.climate&&p.structure&&p.regionName,c[0]);
  climates.add(p.climate);towns.add(p.region);
  for(const sex of ['남자','여자']){
   const points=V8.points(c,sex);
   assert.equal(points.length,111);assert.equal(points[0].value,1);
   for(let i=1;i<111;i++){
    assert.ok(points[i].value>=0&&points[i].value<=points[i-1].value+1e-12,c[0]+' '+sex+' age '+i);
   }
   assert.ok(points[5].value>.88,'Unexpected excessively high early mortality');
  }
 }
 assert.ok(climates.size>=9);
 assert.ok(towns.size>=12);
});
test('country-urban/rural scenes use actual context overlays while preserving career stages',()=>{
 let draws=0,labels=0;
 const ctx={fillRect(){draws++;},fillText(){labels++;},set fillStyle(x){},set font(x){},set textAlign(x){},set imageSmoothingEnabled(x){}};
 const canvas={width:600,height:258,getContext:()=>ctx};
 for(const c of Sim.COUNTRIES){
  const p=birth(424411,c[0]);
  p.age=29;p.world6.scene='workshop';
  assert.equal(V8Scene.paint(canvas,p),'workshop');
 }
 assert.ok(draws>5000);assert.ok(labels>=103);
});
test('1,236 lives cover every nation, preserve midlife saves and family milestones',()=>{
 const jobs=new Set(),homes=new Set(),regions=new Set();let completed=0,restores=0,stories=0;
 for(const country of Sim.COUNTRIES){
  for(let i=1;i<=12;i++){
   const p=birth(Math.imul(i+Sim.COUNTRIES.indexOf(country)*13,2654435761)>>>0,country[0]);
   let years=0;
   while(p.alive&&years<111){
    if(p.pending){const c=p.getChoice();if(c)p.choose((i+p.age)%c.options.length);else if(p.getReflection())p.reflect();else assert.fail('stuck');}
    else{p.tick();years++;if(p.age===42&&p.alive){
     const s=JSON.parse(JSON.stringify(p.snapshot()));assert.deepEqual(Sim.Life.restore(s).snapshot(),s);restores++;
    }}
   }
   assert.equal(p.alive,false);
   completed++;homes.add(p.world8.housing);regions.add(p.world8.region);jobs.add(p.world6.profession);
   stories+=p.world8.stories.length;
   assert.ok(Number.isFinite(p.money.netWorth));
  }
 }
 assert.equal(completed,1236);assert.ok(restores>700);
 assert.ok(homes.size===4);assert.ok(regions.size>=12);
 assert.ok(jobs.size>=70);assert.ok(stories>2000);
});

test('mobile story and pause controls precede the long sidebar',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const css=fs.readFileSync(path.join(root,'world-v8.css'),'utf8');
 const story=html.indexOf('<article class="chronicle">');
 const aside=html.indexOf('<aside class="info">');
 const pause=html.indexOf('id="pauseBtn"');
 const focus=html.indexOf('class="focus-block"');
 assert.ok(story>=0 && pause>story && aside>pause,'pause must be inside the visible main story');
 assert.ok(focus>pause && focus<aside,'yearly focus buttons must be beside the playing scene');
 assert.equal((html.match(/id="pauseBtn"/g)||[]).length,1);
 assert.match(css,/\.play-layout>\.chronicle\s*\{order:0\}/);
 assert.match(css,/\.play-layout>\.info\s*\{order:1\}/);
 assert.match(css,/\.chronicle>\.controls \.pause\s*\{[^}]*min-height:44px/);
 assert.match(html,/같은 해에 태어난 네 사람/);
 assert.match(html,/사는 곳도, 가족도, 살아온 시간도 서로 다릅니다/);
 assert.doesNotMatch(html,/같은 순간에 태어난 네 사람/);
});

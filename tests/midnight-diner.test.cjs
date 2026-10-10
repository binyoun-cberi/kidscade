'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const R=require('../games/high_midnight_diner/rules.js');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
function cook(g,observeAll=false){
 const first=g.dish;
 assert.equal(g.phase,'cooking');
 const seen=new Set();
 while(g.phase==='cooking'){
  const ev=R.cookingEvent(g);
  assert.ok(ev);assert.ok(!seen.has(ev.zone));
  seen.add(ev.zone);
  if(observeAll&&first.peekCount<3)R.peekCooking(g);
  const result=R.observeCooking(g,false);
  assert.equal(result.ok,true);
 }
 assert.equal(g.phase,'playing');
 assert.equal(seen.size,first.spec.count);
}
test('v3 forces cooking observation before food can be tasted',()=>{
 const g=R.begin(42);
 assert.equal(g.phase,'cooking');
 assert.equal(R.eat(g,0).ok,false);
 assert.equal(R.inspect(g,0).ok,false);
 assert.equal(R.question(g).ok,false);
 assert.equal(R.cookingEvent(g).index,0);
 cook(g);
 assert.equal(g.phase,'playing');
 assert.equal(R.cookingEvent(g),null);
});
test('300 seeds always have a fair five-course cooking-to-eating route',()=>{
 for(let seed=1;seed<=300;seed++){
  const g=R.begin(seed);
  for(let i=0;i<R.FOODS.length;i++){
   assert.equal(g.course,i);
   const dish=g.dish,spec=R.FOODS[i];
   assert.equal(dish.zones.length,spec.count);
   assert.equal(dish.zones.filter(z=>z.dangerous).length,spec.hazards);
   assert.ok(dish.zones.some(z=>z.dangerous&&z.shade>=.18));
   cook(g);
   const safe=dish.zones.filter(z=>!z.dangerous).slice(0,3);
   assert.equal(safe.length,3);
   for(const z of safe)assert.equal(R.eat(g,z.id).dangerous,false);
   assert.equal(g.lastReview.safe,3);
   assert.equal(g.history.length,i+1);
  }
  assert.equal(g.ending.won,true);
  assert.equal(g.safeBites,15);
  assert.equal(g.score,2050);
 }
});
test('peeking reveals true ingredients from their exact plated positions and costs suspicion only once per event',()=>{
 for(let seed=1;seed<=100;seed++){
  const g=R.begin(seed),dish=g.dish;
  for(let i=0;i<dish.spec.count;i++){
   const expected=R.cookingEvent(g),z=dish.zones[expected.zone-1];
   const before=g.suspicion;
   const first=R.peekCooking(g),repeat=R.peekCooking(g);
   assert.equal(first.ok,true);
   assert.equal(repeat.free,true);
   assert.equal(g.suspicion,before+(i<3?2:5));
   assert.equal(first.zone,expected.zone);
   if(!first.concealed)assert.equal(first.ingredient,z.dangerous?dish.spec.word:'일반 양념');
   const obs=R.observeCooking(g,false);assert.equal(obs.zone,expected.zone);
  }
  assert.equal(g.phase,'playing');
  assert.equal(dish.observed.length,dish.zones.filter(z=>z.shade>=.18).length);
 }
});
test('inspection returns ambiguous scents and never says safe/unsafe',()=>{
 const g=R.begin(24);cook(g);
 const z=g.dish.zones[0];
 const result=R.inspect(g,z.id);
 assert.equal(result.ok,true);
 assert.equal(typeof result.strong,'boolean');
 assert.doesNotMatch(result.message,/안전\\.|위험!/);
 assert.equal(R.inspect(g,z.id).free,true);
 assert.equal(g.dish.inspectionsLeft,1);
});
test('chefs clues are truthful and rejecting all plates loses',()=>{
 const g=R.begin(123);
 for(let stage=0;stage<5;stage++){
  cook(g);
  const half=Math.ceil(g.dish.spec.count/2);
  const expected=g.dish.zones.filter(z=>z.id<half&&z.dangerous).length;
  assert.equal(R.question(g).count,expected);
  assert.equal(R.question(g).ok,false);
  for(const z of g.dish.zones.filter(z=>!z.dangerous).slice(0,3))R.eat(g,z.id);
 }
 assert.equal(g.ending.won,true);
 const loser=R.begin(444);
 while(loser.phase!=='finished'){
  cook(loser);
  R.reject(loser);
 }
 assert.equal(loser.ending.won,false);
});
test('v3 does not encode exact danger marks in plate renderer',()=>{
 for(const file of ['games/high_midnight_diner/plate.js','games/high_midnight_diner/plate-extra.js'])
  assert.doesNotMatch(read(file),/z\.dangerous/,file);
 const html=read('games/high_midnight_diner/index.html');
 for(const id of ['cookPanel','peekBtn','cookSlots','cookFlash','memoryPanel','memoryEntries','chefLine'])
  assert.match(html,new RegExp('id="'+id+'"'));
 const dialogue=html.indexOf('class="dialogue dialogue-right"');
 assert.ok(dialogue>html.indexOf('class="dining"'));
 assert.ok(!html.slice(0,html.indexOf('class="dining"')).includes('id="chefLine"'));
});
test('five existing food/chef models and catalogue integration exist',()=>{
 for(const file of [
 'assets/game/3d/interiors/charming-kitchen-set/fridge.glb',
 'assets/game/3d/interiors/charming-kitchen-set/stove.glb',
 'assets/game/3d/interiors/modular-sushi-restaurant-kit/ramen.glb',
 'assets/game/3d/interiors/modular-sushi-restaurant-kit/dango.glb',
 'assets/game/3d/interiors/modular-sushi-restaurant-kit/gyoza.glb',
 'assets/game/3d/food/ultimate-food-pack/pancakes-stack.glb',
 'assets/game/3d/food/ultimate-food-pack/cupcake.glb',
 'assets/game/npcs/glTF/Chef_Male.gltf'
 ])assert.ok(fs.existsSync(path.join(root,file)),file);
 const html=read('games/high_midnight_diner/index.html');
 for(const file of ['rules.js','game.js','kitchen.js','plate.js','plate-extra.js','style.css','layout.css','overlay.css','v2.css','v3.css'])
  assert.ok(html.includes(file),file);
 const c=JSON.parse(read('data/games.json'));
 assert.equal(c.games.find(g=>g.id==='high_midnight_diner').href,'games/high_midnight_diner/index.html');
 assert.match(read('games/high_midnight_diner/kitchen.js'),/Chef_Male.gltf/);
});

test('v4 cooking controls live outside 3D kitchen and eating fills mobile viewport',()=>{
 const html=read('games/high_midnight_diner/index.html');
 const kitchenEnd=html.indexOf('</section>',html.indexOf('class="kitchen"'));
 const diningStart=html.indexOf('class="dining"');
 const cookPanel=html.indexOf('id="cookPanel"');
 const course=html.indexOf('class="course-line"');
 const memory=html.indexOf('id="memoryPanel"');
 assert.ok(kitchenEnd>0&&diningStart>kitchenEnd);
 assert.ok(cookPanel>diningStart&&cookPanel>course&&cookPanel<memory,'cook HUD must be in the right-side dining controls');
 const css=read('games/high_midnight_diner/v4.css');
 assert.match(css,/\.cook-panel\s*\{\s*position:relative!important/);
 assert.match(css,/\.game-layout\.cooking \.plate-wrap/);
 assert.match(css,/\.game-layout\.eating \.kitchen\s*\{\s*display:none!important/);
 assert.match(css,/#plate\s*\{[\s\S]*?aspect-ratio:10\/7/);
 assert.match(css,/height:auto!important/);
 assert.match(html,/v4\.css/);
});
test('v4 stops ingredient visibility when peeking ends and pauses hidden tab timers',()=>{
 const js=read('games/high_midnight_diner/game.js');
 assert.match(js,/looking:peekHeld&&!!peek/);
 assert.match(js,/if\(previouslyHeld&&game\?\.phase==='cooking'\)updateCookScene\(\)/);
 assert.match(js,/if\(document\.hidden\)return;/);
 assert.match(js,/layout\.classList\.toggle\('eating',game\.phase==='playing'\)/);
 const scene=read('games/high_midnight_diner/kitchen.js');
 assert.match(scene,/cookingPhase=d\.phase==='cooking'/);
 assert.match(scene,/spoon\.visible=cookingPhase/);
 assert.match(scene,/Chef_Male\.gltf',2\.22,-\.1,0,\.43,0/);
 assert.match(scene,/stove\.glb',1\.12,-1\.38,0/);
});

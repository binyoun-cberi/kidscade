'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const R=require('../games/high_midnight_diner/rules.js');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
function progressCooking(g,shouldLook=()=>false){
 let ticks=0;
 while(g.phase==='cooking'){
  const event=R.cookingEvent(g);
  R.tickCooking(g,50,shouldLook(event));
  assert.ok(++ticks<1000,'cooking must finish or fail');
 }
 return ticks;
}
test('v5 locks eating during timed cooking, then unlocks after all food actions',()=>{
 const g=R.begin(42);
 assert.equal(g.phase,'cooking');
 assert.equal(R.eat(g,0).ok,false);
 assert.equal(R.inspect(g,0).ok,false);
 const ev=R.cookingEvent(g);
 assert.equal(ev.phase,'SAFE');
 assert.ok(ev.totalMs>ev.warnEnd&&ev.warnEnd>ev.safeEnd);
 progressCooking(g);
 assert.equal(g.phase,'playing');
 assert.equal(g.dish.cookIndex,g.dish.spec.count);
});
test('SAFE reveals correct ingredient after a short sustained peek without suspicion',()=>{
 for(let seed=1;seed<=100;seed++){
  const g=R.begin(seed),dish=g.dish,first=dish.cookOrder[0],z=dish.zones[first];
  const before=g.suspicion;
  let revealed=null;
  for(let i=0;i<25;i++){
   const outcome=R.tickCooking(g,50,true);
   if(outcome.revealed)revealed=dish.currentPeek;
   if(revealed)break;
  }
  assert.ok(revealed,'sustained peek should eventually reveal the action');
  assert.equal(g.suspicion,before);
  assert.equal(revealed.zone,first+1);
  if(!revealed.concealed){
   assert.equal(revealed.ingredient,z.dangerous?dish.spec.word:'일반 양념');
   assert.equal(dish.observed.at(-1).zone,first+1);
  }
 }
});
test('WARNING phase has 460ms+ telegraph with fair reaction grace period',()=>{
 const g=R.begin(24),timing=R.timingFor(g);
 assert.ok(timing.warnEnd-timing.safeEnd>=460);
 let warned=0,caught=0;
 while(g.phase==='cooking'&&g.dish.cookIndex===0){
  const phase=R.gazePhase(g);
  const x=R.tickCooking(g,50,phase==='SAFE');
  if(x.warned)warned++;
  if(x.caught)caught++;
 }
 assert.equal(warned,0);
 assert.equal(caught,0);
 assert.equal(g.catches,0);
 assert.equal(g.suspicion,8);
});
test('WARNING lingering has a small penalty, looking at chef gets progressive catches',()=>{
 const g=R.begin(25);
 let warned=0,caught=0;
 for(let i=0;i<260&&g.phase==='cooking';i++){
  const x=R.tickCooking(g,50,true);
  if(x.warned)warned++;
  if(x.caught)caught++;
 }
 assert.equal(caught,3);
 assert.ok(warned>=3);
 assert.equal(g.phase,'finished');
 assert.equal(g.ending.won,false);
 assert.equal(g.ending.message,'요리사가 당신의 식사를 중단시켰다.');
 assert.equal(g.suspicion,100);
});
test('releasing before LOOK prevents catches even after WARN',()=>{
 const g=R.begin(41);
 let warned=0,caught=0;
 while(g.phase==='cooking'&&g.dish.cookIndex===0){
  const ev=R.cookingEvent(g);
  const stillLooking=ev.phase==='SAFE'||(ev.phase==='WARN'&&ev.elapsedMs<ev.safeEnd+210);
  const x=R.tickCooking(g,50,stillLooking);
  if(x.warned)warned++;if(x.caught)caught++;
 }
 assert.equal(warned,1);
 assert.equal(caught,0);
 assert.equal(g.catches,0);
 assert.equal(g.suspicion,12);
});
test('200 randomized full five-course routes remain solvable with timely peeks',()=>{
 for(let seed=1;seed<=200;seed++){
  const g=R.begin(seed);
  for(let course=0;course<R.FOODS.length;course++){
   const dish=g.dish;
   assert.equal(g.phase,'cooking');
   assert.equal(dish.zones.filter(z=>z.dangerous).length,dish.spec.hazards);
   assert.ok(dish.zones.some(z=>z.dangerous&&z.shade>=.18));
   progressCooking(g,ev=>ev.phase==='SAFE');
   assert.equal(g.phase,'playing');
   assert.equal(g.catches,0);
   const safe=dish.zones.filter(z=>!z.dangerous).slice(0,3);
   for(const z of safe)assert.equal(R.eat(g,z.id).dangerous,false);
   assert.equal(g.history.length,course+1);
  }
  assert.equal(g.ending.won,true);
  assert.equal(g.score,2050);
 }
});
test('v5 controls and 3D chef gaze are synced to safe/warning/look stages',()=>{
 const html=read('games/high_midnight_diner/index.html');
 const js=read('games/high_midnight_diner/game.js');
 const kitchen=read('games/high_midnight_diner/kitchen.js');
 const css=read('games/high_midnight_diner/v5.css');
 assert.match(html,/v5\.css/);
 assert.match(html,/id="cookClock" class="gaze-indicator gaze-safe"/);
 assert.match(js,/R\.tickCooking\(game,dt,peekHeld\)/);
 assert.match(js,/midnight-diner:gaze/);
 assert.match(js,/midnight-diner:caught/);
 assert.match(kitchen,/gazePhase==='SAFE'/);
 assert.match(kitchen,/gazePhase==='WARN'/);
 assert.match(css,/\.gaze-indicator/);
 assert.match(css,/\.plate-wrap\s*\{flex-shrink:0!important/);
 const diningIndex=html.indexOf('class="dining"');
 assert.ok(html.indexOf('id="cookPanel"')>diningIndex,'peek overlay must not obscure chef');
});
test('existing GLB chef and food models plus catalog registration remain intact',()=>{
 for(const file of [
 'assets/game/npcs/glTF/Chef_Male.gltf',
 'assets/game/3d/interiors/charming-kitchen-set/fridge.glb',
 'assets/game/3d/interiors/modular-sushi-restaurant-kit/ramen.glb',
 'assets/game/3d/interiors/modular-sushi-restaurant-kit/dango.glb',
 'assets/game/3d/food/ultimate-food-pack/cupcake.glb'
 ])assert.ok(fs.existsSync(path.join(root,file)),file);
 const catalog=JSON.parse(read('data/games.json'));
 assert.equal(catalog.games.find(x=>x.id==='high_midnight_diner').href,'games/high_midnight_diner/index.html');
});

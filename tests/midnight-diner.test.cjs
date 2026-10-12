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
   progressCooking(g,ev=>ev.phase==='SAFE'&&ev.index<3);
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


test('v7 repeat observations cost less while keeping an escalating risk',()=>{
 assert.deepEqual([0,1,2,3,4,5,6,7].map(R.peekCost),[0,0,2,3,5,7,9,11]);
 const g=R.begin(42);
 const increments=[];
 while(g.phase==='cooking'){
  const e=R.cookingEvent(g);
  const before=g.suspicion;
  let observed=false;
  while(g.phase==='cooking'&&R.cookingEvent(g)?.index===e.index){
   const x=R.cookingEvent(g);
   const result=R.tickCooking(g,50,x.phase==='SAFE');
   observed ||=!!result.revealed;
  }
  increments.push(g.suspicion-before);
  assert.ok(observed,'safe glimpse must be possible');
 }
 assert.deepEqual(increments.slice(0,5),[0,0,2,3,5]);
});
test('v6 gaze and animation metadata are connected, and fixed mobile peek remains onscreen',()=>{
 const html=read('games/high_midnight_diner/index.html');
 const css=read('games/high_midnight_diner/v6.css');
 const js=read('games/high_midnight_diner/game.js');
 const scene=read('games/high_midnight_diner/kitchen.js');
 assert.match(html,/v6\.css/);
 assert.match(html,/id="peekBudget"/);
 assert.match(html,/id="peekCaption"/);
 assert.match(css,/position:fixed!important/);
 assert.match(css,/safe-area-inset-bottom/);
 assert.match(css,/\.fallback-chef/);
 assert.match(js,/R\.peekCost\(game\.dish\.peekCount\)/);
 assert.match(scene,/group\.userData\.clips=g\.animations/);
 assert.match(scene,/new THREE\.AnimationMixer/);
 assert.match(scene,/getObjectByName\('Fist\.R'\)/);
 assert.match(scene,/getWorldPosition\(handPosition\)/);
 assert.match(scene,/chefPick\.fadeOut/);
});

test('v7 renders stage and interactions inside one immersive viewport',()=>{
 const html=read('games/high_midnight_diner/index.html');
 const css=read('games/high_midnight_diner/immersive.css');
 assert.match(html,/immersive\.css/);
 assert.match(html,/VERSION 9/);
 assert.match(css,/#game\{position:relative;[^}]*height:100dvh/);
 assert.match(css,/\.dining,\.game-layout\.cooking \.dining,\.game-layout\.eating \.dining\{/);
 assert.match(css,/\.kitchen,\.game-layout\.cooking \.kitchen,\.game-layout\.eating \.kitchen\{/);
 assert.match(css,/\.game-layout\.eating \.plate-wrap\{/);
 assert.match(css,/\.game-layout\.cooking #peekBtn\{/);
 assert.match(css,/backdrop-filter:none!important/);
 assert.doesNotMatch(html,/오른쪽 접시/);
});
test('v7 allows 4-5 well-timed looks per plate without unavoidable suspicion defeat',()=>{
 for(const count of [4,5]){
  for(let seed=1;seed<=50;seed++){
   const game=R.begin(seed);
   for(let course=0;course<R.FOODS.length;course++){
    const dish=game.dish;
    progressCooking(game,ev=>ev.phase==='SAFE'&&ev.index<count);
    assert.equal(game.phase,'playing');
    const choices=dish.zones.filter(z=>!z.dangerous).slice(0,3);
    for(const z of choices)R.eat(game,z.id);
   }
   assert.equal(game.ending?.won,true,'seed '+seed+' with '+count+' looks');
  }
 }
});
test('v7 notebook pauses observation and prevents invisible punishment',()=>{
 const js=read('games/high_midnight_diner/game.js');
 assert.match(js,/onPeekUp\(\);\s*\$\('notebookEntries'\)/);
 assert.match(js,/document\.hidden\|\|!\$\('notebookPanel'\)\.classList\.contains\('hidden'\)/);
 assert.match(js,/function closeNotebook\(\)/);
});

test('v7.1 finished food plate stays above the scene and action bar on all screen shapes',()=>{
 const html=read('games/high_midnight_diner/index.html');
 const css=read('games/high_midnight_diner/plate-visibility.css');
 const js=read('games/high_midnight_diner/game.js');
 assert.match(html,/href="plate-visibility\.css"/);
 assert.match(css,/\.game-layout\.eating \.plate-wrap\{/);
 assert.match(css,/z-index:22!important/);
 assert.match(css,/\.game-layout\.eating #plate\{/);
 assert.match(css,/visibility:visible!important/);
 assert.match(css,/\.game-layout\.eating \.action-bar\{z-index:30!important\}/);
 assert.match(css,/orientation:portrait/);
 assert.match(css,/orientation:landscape/);
 assert.match(css,/safe-area-inset-bottom/);
 assert.match(js,/layout\.classList\.toggle\('eating',game\.phase==='playing'\)/);
 assert.match(js,/P\.draw\(\$\('plate'\),dish,chosen\)/);
 const g=R.begin(42);
 progressCooking(g);
 assert.equal(g.phase,'playing','finished cooking should activate the visible eating stage');
});

test('v8 all five edible illustrations render without hiding the forbidden ingredient answer',()=>{
 const vm=require('node:vm'),plateSource=read('games/high_midnight_diner/plate.js');
 const win={},sandbox={window:win};
 vm.runInNewContext(plateSource,sandbox,{filename:'plate.js'});
 const plate=win.MidnightDinerPlate;
 assert.ok(plate?.draw&&plate?.hit&&plate?.hitAt);
 assert.doesNotMatch(plateSource,/z\.dangerous|zone\.dangerous/,'finished food must not reveal danger simply through color');
 const methods=['clearRect','beginPath','closePath','ellipse','fill','stroke','moveTo','lineTo','arc','bezierCurveTo','quadraticCurveTo','fillText','fillRect','save','restore','translate','scale','rotate','clip'];
 const ctx={createRadialGradient(){return {addColorStop(){}}}};
 methods.forEach(m=>ctx[m]=()=>{});
 const canvas={getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0,width:600,height:420})};
 for(let course=0;course<R.FOODS.length;course++){
  const dish=R.dishFor(course,R.rng(12345+course));
  assert.doesNotThrow(()=>plate.draw(canvas,dish,null),dish.spec.id);
  assert.doesNotThrow(()=>plate.draw(canvas,dish,0),dish.spec.id+' selected');
  for(const z of dish.zones){
   const p=dish.spec.id==='pancake'
    ?{x:300+Math.cos(-Math.PI/2+(z.id+.5)*Math.PI/4)*135,y:210+Math.sin(-Math.PI/2+(z.id+.5)*Math.PI/4)*135*.68}
    :plate.PLACES[dish.spec.id](z.id);
   assert.equal(plate.hitAt(p.x,p.y,dish),z.id,dish.spec.id+' center '+z.id);
   if(dish.spec.id!=='pancake'){
    const numberPosition={soup:[25,23],skewer:[0,27],dumpling:[26,22],cake:[24,23]}[dish.spec.id];
    assert.equal(plate.hitAt(p.x+numberPosition[0],p.y+numberPosition[1],dish),z.id,dish.spec.id+' badge '+z.id);
   }
  }
 }
});
test('v8 gaze patterns vary by action with fair fake turns and warning windows',()=>{
 let feints=0;let minSafe=Infinity,maxSafe=0;
 const rhythms=new Set();
 for(let seed=1;seed<=100;seed++){
  const g=R.begin(seed);
  for(let step=0;step<g.dish.spec.count;step++){
   const t=R.timingFor(g);
   assert.ok(t.warnEnd-t.safeEnd>=500);
   assert.ok(t.totalMs-t.warnEnd>=390);
   minSafe=Math.min(minSafe,t.safeEnd);maxSafe=Math.max(maxSafe,t.safeEnd);
   rhythms.add([t.safeEnd,t.warnEnd-t.safeEnd,t.totalMs-t.warnEnd].join(','));
   if(t.feintStart!==null){
    feints++;
    assert.ok(t.feintStart>t.revealAt+t.holdNeeded,'first safe look remains fair');
    g.dish.elapsedMs=t.feintStart+40;
    assert.equal(R.gazePhase(g),'FEINT');
    const before=g.suspicion,ev=R.tickCooking(g,50,true);
    assert.equal(ev.caught,false);assert.equal(ev.warned,false);
    assert.equal(g.suspicion,before,'harmless fake turn must not cause punishment');
    g.dish.elapsedMs=t.feintEnd;
    assert.equal(R.gazePhase(g),'SAFE');
   }
   R.observeCooking(g,false);
  }
 }
 assert.ok(maxSafe-minSafe>=400,'safe time should not sound like fixed beats');
 assert.ok(rhythms.size>100,'chef must have diverse timing');
 assert.ok(feints>=60,'fake turns should actually occur');
 const html=read('games/high_midnight_diner/index.html');
 const js=read('games/high_midnight_diner/game.js');
 const kitchen=read('games/high_midnight_diner/kitchen.js');
 assert.match(html,/v8\.css/);
 assert.doesNotMatch(html,/plate-extra\.js/);
 assert.match(js,/FEINT/);
 assert.match(kitchen,/gazePhase==='FEINT'/);
 assert.match(kitchen,/FOOD_ITEMS\+'skewer\.glb'/);
 assert.match(kitchen,/FOOD_ITEMS\+'cake\.glb'/);
});

// v9: real GLB food models replace decorative sketches only after successful
// screenshot conversion. Every course remains playable offline/WebGL-disabled.
test('v9 uses real local food GLB geometry for every dish, keeping illustrated fallback',()=>{
 const html=read('games/high_midnight_diner/index.html');
 const assetLoader=read('games/high_midnight_diner/plate-assets.js');
 const plateSource=read('games/high_midnight_diner/plate.js');
 const kitchen=read('games/high_midnight_diner/kitchen.js');
 const gameSource=read('games/high_midnight_diner/game.js');
 assert.match(html,/plate-assets\.js/);
 assert.match(html,/VERSION 9/);
 assert.match(assetLoader,/GLTFLoader/);
 assert.match(assetLoader,/setAssetImages/);
 assert.match(assetLoader,/drawImage\(renderer\.domElement,0,0\)/);
 assert.match(plateSource,/drawAssetFood\(c,dish,selected\)/);
 assert.match(gameSource,/midnight-diner:food-assets/);
 assert.match(kitchen,/FOOD_ITEMS\+'cake\.glb'/);
 assert.doesNotMatch(kitchen,/cake-slicer\.glb/);
 const files=[
  'assets/game/3d/food/ultimate-food-pack/pancakes-stack.glb',
  'assets/game/food/bowl-soup.glb',
  'assets/game/food/mushroom-half.glb',
  'assets/game/food/skewer.glb',
  'assets/game/3d/interiors/modular-sushi-restaurant-kit/gyoza.glb',
  'assets/game/food/cake.glb'
 ];
 for(const file of files)assert.ok(fs.existsSync(path.join(root,file)),file);
});
test('v9 asset-rendered portions, labels, removed pieces, and interactions stay in sync',()=>{
 const vm=require('node:vm'),plateSource=read('games/high_midnight_diner/plate.js');
 const target={};vm.runInNewContext(plateSource,{window:target},{filename:'plate.js'});
 const plate=target.MidnightDinerPlate;
 let images=0,labels=0;
 const fake={width:320,height:320};
 const ctx={createRadialGradient:()=>({addColorStop(){}}),drawImage(){images++},fillText(){labels++}};
 for(const fn of ['clearRect','beginPath','closePath','ellipse','fill','stroke','moveTo','lineTo','arc','rect','bezierCurveTo','quadraticCurveTo','fillRect','save','restore','translate','scale','rotate','clip'])ctx[fn]=()=>{};
 const canvas={getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0,width:600,height:420})};
 let fallbackDraws=0;
 const first=R.dishFor(0,R.rng(12));
 plate.draw(canvas,first,null);fallbackDraws=images;
 assert.equal(fallbackDraws,0,'illustrated backup must remain active before GLB loads');
 const graphics={pancake:{main:fake},soup:{main:fake,piece:fake},
  skewer:{main:fake},dumpling:{piece:fake},cake:{main:fake}};
 for(let i=0;i<R.FOODS.length;i++){
  const dish=R.dishFor(i,R.rng(i+47)),type=dish.spec.id;
  plate.setAssetImages(type,graphics[type]);
  const before=images;
  assert.doesNotThrow(()=>plate.draw(canvas,dish,0),type);
  assert.ok(images>before,type+' must composite real GLB imagery');
  assert.ok(labels>0,type+' must label selectable pieces');
  const removed=dish.zones[0];
  removed.removed=true;const beforeRemoved=images;
  plate.draw(canvas,dish,null);
  const remaining=images-beforeRemoved;
  if(type==='pancake'||type==='cake'||type==='skewer'||type==='dumpling'){
   assert.equal(remaining,dish.spec.count-1,'removed food portion should disappear '+type);
  }else assert.equal(remaining,dish.spec.count,
   'soup should keep bowl plus remaining mushrooms');
  removed.removed=false;
  if(type==='cake'){
   for(let z=0;z<dish.spec.count;z++){
    const pt=plate.cakeSectorCenter(z);
    assert.equal(plate.hitAt(pt.x,pt.y,dish),z,'slice '+z+' should select');
   }
  }
 }
});

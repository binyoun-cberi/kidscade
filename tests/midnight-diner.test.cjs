'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const R=require('../games/high_midnight_diner/rules.js');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('five courses: distinct 1-8 zones, 2-3 fair dangers, 15 safe bites can win',()=>{
 assert.equal(R.FOODS.length,5);
 assert.deepEqual(R.FOODS.map(x=>x.id),['pancake','soup','skewer','dumpling','cake']);
 for(let seed=1;seed<=300;seed++){
  const g=R.begin(seed);
  for(let stage=0;stage<R.FOODS.length;stage++){
   assert.equal(g.course,stage);
   const dish=g.dish,spec=R.FOODS[stage];
   assert.equal(dish.zones.length,spec.count);
   assert.equal(dish.zones.filter(z=>z.dangerous).length,spec.hazards);
   assert.ok(dish.zones.length-spec.hazards>=3);
   const safe=dish.zones.filter(z=>!z.dangerous).slice(0,3).map(z=>z.id);
   for(const id of safe)assert.equal(R.eat(g,id).dangerous,false);
   assert.equal(g.lastReview.safe,3);
   assert.equal(g.lastReview.dangerousZones.length,spec.hazards);
   assert.equal(g.history.length,stage+1);
  }
  assert.equal(g.phase,'finished');
  assert.equal(g.ending.won,true);
  assert.equal(g.safeBites,15);
  assert.equal(g.score,15*100+5*60+250);
 }
});

test('chef clue is true, bounded to the first half and cannot be repeated',()=>{
 for(let seed=11;seed<70;seed++){
  const g=R.begin(seed);
  for(let i=0;i<R.FOODS.length;i++){
   const spec=g.dish.spec;
   const half=Math.ceil(spec.count/2);
   const expected=g.dish.zones.filter(z=>z.id<half&&z.dangerous).length;
   const clue=R.question(g);
   assert.equal(clue.ok,true);
   assert.equal(clue.half,half);assert.equal(clue.count,expected);
   assert.equal(R.question(g).ok,false);
   g.dish.zones.filter(z=>!z.dangerous).slice(0,3).forEach(z=>R.eat(g,z.id));
  }
  assert.equal(g.ending.won,true);
 }
});
test('inspection repeat is free; new check is limited to two per course',()=>{
 const game=R.begin(44),id=game.dish.zones.findIndex(z=>z.dangerous);
 assert.equal(R.inspect(game,id).dangerous,true);
 assert.equal(game.dish.inspectionsLeft,1);
 assert.equal(R.inspect(game,id).free,true);
 assert.equal(game.dish.inspectionsLeft,1);
 const second=game.dish.zones.findIndex(z=>z.id!==id);
 R.inspect(game,second);
 assert.equal(game.dish.inspectionsLeft,0);
 assert.equal(R.inspect(game,game.dish.zones.findIndex(z=>!z.inspected)).ok,false);
});
test('danger removes 33 health; systematic rejection never escapes',()=>{
 const danger=R.begin(99);
 for(let i=0;i<2;i++){
  const id=danger.dish.zones.findIndex(z=>z.dangerous&&!z.removed);
  assert.equal(R.eat(danger,id).dangerous,true);
 }
 assert.equal(danger.health,34);
 assert.equal(R.eat(danger,danger.dish.zones.findIndex(z=>!z.dangerous)).dangerous,false);
 assert.equal(danger.course,1);
 assert.equal(R.eat(danger,danger.dish.zones.findIndex(z=>z.dangerous)).dangerous,true);
 assert.equal(danger.health,1);
 const loser=R.begin(55);
 for(let i=0;i<5&&loser.phase==='playing';i++)R.reject(loser);
 assert.equal(loser.phase,'finished');assert.equal(loser.ending.won,false);
});
test('reviews disclose exact previously hidden evidence, not future-course positions',()=>{
 const g=R.begin(14),bad=g.dish.zones.filter(z=>z.dangerous).map(z=>z.id+1);
 for(const z of g.dish.zones.filter(z=>!z.dangerous).slice(0,3))R.eat(g,z.id);
 assert.deepEqual(g.lastReview.dangerousZones,bad);
 assert.deepEqual(g.lastReview.course,0);
 assert.equal(g.lastReview.banned,'seed');
 assert.equal(g.dish.spec.id,'soup');
 assert.ok(g.lastReview.clue.includes('세 개'));
});
test('assets, accessibility and catalogue are correctly linked',()=>{
 for(const file of [
 'assets/game/3d/interiors/charming-kitchen-set/fridge.glb',
 'assets/game/3d/interiors/charming-kitchen-set/stove.glb',
 'assets/game/3d/interiors/modular-sushi-restaurant-kit/ramen.glb',
 'assets/game/3d/interiors/modular-sushi-restaurant-kit/dango.glb',
 'assets/game/3d/interiors/modular-sushi-restaurant-kit/gyoza.glb',
 'assets/game/3d/food/ultimate-food-pack/pancakes-stack.glb',
 'assets/game/3d/food/ultimate-food-pack/cupcake.glb',
 'assets/game/npcs/glTF/OldClassy_Male.gltf'
 ])assert.ok(fs.existsSync(path.join(root,file)),file);
 const html=read('games/high_midnight_diner/index.html');
 for(const file of ['rules.js','game.js','plate.js','plate-extra.js','kitchen.js','style.css','layout.css','overlay.css','v2.css'])assert.ok(html.includes(file),file);
 for(const id of ['reviewVeil','reviewZones','reviewClue','nextCourseBtn','courseTimeline'])assert.match(html,new RegExp('id="'+id+'"'));
 const catalog=JSON.parse(read('data/games.json'));
 const entry=catalog.games.find(g=>g.id==='high_midnight_diner');
 assert.equal(entry.href,'games/high_midnight_diner/index.html');
 assert.match(read('games/high_midnight_diner/kitchen.js'),/GLTFLoader/);
});

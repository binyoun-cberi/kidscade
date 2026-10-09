'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const R=require('../games/high_midnight_diner/rules.js');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('all 3 dishes have 2 dangers and identifiable safe areas',()=>{
 for(let seed=1;seed<=50;seed++){
  const game=R.begin(seed);
  for(let stage=0;stage<3;stage++){
   assert.equal(game.course,stage);
   assert.equal(game.dish.zones.filter(z=>z.dangerous).length,2);
   const ids=game.dish.zones.filter(z=>!z.dangerous).slice(0,3).map(z=>z.id);
   assert.equal(ids.length,3);
   for(const id of ids){const result=R.eat(game,id);assert.equal(result.ok,true);assert.equal(result.dangerous,false);}
  }
  assert.equal(game.phase,'finished');
  assert.equal(game.ending.won,true);
  assert.equal(game.safeBites,9);
 }
});
test('inspections reveal danger and consume only 2 chances',()=>{
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
test('reject-only strategy fails with hunger or suspicion',()=>{
 const game=R.begin(55);
 for(let i=0;i<3&&game.phase==='playing';i++)R.reject(game);
 assert.equal(game.phase,'finished');
 assert.equal(game.ending.won,false);
});
test('critical existing library assets and correct game integration resolve',()=>{
 const files=[
 'assets/game/3d/interiors/charming-kitchen-set/fridge.glb',
 'assets/game/3d/interiors/charming-kitchen-set/stove.glb',
 'assets/game/3d/interiors/charming-kitchen-set/cutting-board.glb',
 'assets/game/3d/interiors/modular-sushi-restaurant-kit/ramen.glb',
 'assets/game/3d/interiors/modular-sushi-restaurant-kit/gyoza.glb',
 'assets/game/3d/food/ultimate-food-pack/pancakes-stack.glb',
 'assets/game/npcs/glTF/OldClassy_Male.gltf'
 ];
 for(const file of files)assert.ok(fs.existsSync(path.join(root,file)),file);
 const html=read('games/high_midnight_diner/index.html');
 for(const file of ['rules.js','game.js','plate.js','plate-extra.js','kitchen.js','style.css','layout.css','overlay.css'])assert.ok(html.includes(file),file);
 const catalog=JSON.parse(read('data/games.json'));
 const entry=catalog.games.find(game=>game.id==='high_midnight_diner');
 assert.ok(entry);assert.equal(entry.href,'games/high_midnight_diner/index.html');
 assert.match(read('games/high_midnight_diner/kitchen.js'),/GLTFLoader/);
});

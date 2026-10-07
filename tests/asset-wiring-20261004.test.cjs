const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

test('Seed World wires the expanded staged crop pack without a second mushroom inventory key',()=>{
  const js=read('world-v3/kidscade-world-v3.js');
  for(const crop of ['Beet','Lettuce','Mushroom','Rice','Watermelon','Wheat','Bamboo','BushBerries']){
    for(let stage=1;stage<=4;stage++)assert.ok(js.includes(crop+'_'+stage+'.fbx'),crop+' stage '+stage);
  }
  assert.ok(js.includes("mushroom:['Mushroom_1.fbx'"));
  assert.doesNotMatch(js,/mushroomCrop/);
  assert.match(read('world-v3/kidscade-world.html'),/kidscade-world-v3\.js\?v=51/);
});

test('Little World turns settlement levels into visible farms and village infrastructure',()=>{
  const js=read('games/high_little_world/game.js');
  for(const asset of [
    'quaternius_cc0-barn-666.glb','quaternius_cc0-chicken-coop-819.glb',
    'quaternius_cc0-cow-881.glb','quaternius_cc0-pig-1226.glb',
    'quaternius_cc0-well-1471.glb','quaternius_cc0-windmill-1504.glb',
    'quaternius_cc0-wheat-1478.glb','quaternius_cc0-corn-866.glb','quaternius_cc0-rice-1294.glb'
  ])assert.ok(js.includes(asset),asset);
  assert.match(js,/if\(s\.level>=1\)/);
  assert.match(js,/if\(s\.level>=2\)/);
  assert.match(js,/if\(s\.level>=3\)/);
  assert.match(read('games/high_little_world/index.html'),/game\.js\?v=2/);
});

test('Clinic mixes the NPC character pack into patient appearances',()=>{
  const html=read('games/job_internal_medicine/오늘도 진료중!.html');
  for(const token of ['Casual_Female.gltf','Casual_Male.gltf','Suit_Female.gltf','Worker_Male.gltf','OldClassy_'])assert.ok(html.includes(token),token);
  assert.match(html,/patientModelPool\(sex,age\)/);
  assert.ok(html.includes("name.indexOf('/')>=0?'../../assets/game/'"));
});

test('Cube Architect registers the remaining Cube World animals and enemies',()=>{
  const roster=read('games/cube3d/cube-architect-creatures.js');
  const assets=read('games/cube3d/cube-architect-creature-assets.js');
  for(const id of ['chick','cat','dog','horse','raccoon','zombie','wizard','demon','giant'])assert.ok(roster.includes(id+":{id:'"+id+"'"),id);
  for(const file of ['Chick','Cat','Dog','Horse','Raccoon'])assert.ok(assets.includes('Animals/glTF/'+file+'.gltf'),file);
  for(const file of ['Zombie','Wizard','Demon','Giant'])assert.ok(assets.includes('Enemies/glTF/'+file+'.gltf'),file);
  assert.match(read('games/cube3d/index.html'),/cube-architect-creatures\.js\?v=20261004-32/);
});

test('Bunsik Kitchen uses cute KIDSCADE cooks and rotating customer sources',()=>{
  const js=read('games/job_bogle_bunsik/bunsik-kitchen.js');
  assert.match(js,/const NPCS=/);
  assert.match(js,/const AVATAR_SHEET=/);
  assert.match(js,/makeCuteCook\('player'\)/);
  assert.match(js,/makeCuteCook\('helper'\)/);
  assert.match(js,/paintCuteCook\(/);
  for(const file of ['Casual_Female.gltf','OldClassy_Female.gltf','Suit_Male.gltf'])assert.ok(js.includes(file),file);
  assert.match(js,/this\.loadModel\(spec\.root,spec\.file,1\.65\)/);
  assert.match(read('games/job_bogle_bunsik/보글보글 분식집.html'),/bunsik-kitchen\.js\?v=23/);
});

test('catalog publishes cache-busted entries for changed standalone games',()=>{
  const catalog=JSON.parse(read('data/games.json'));
  const href=id=>catalog.games.find(g=>g.id===id)?.href;
  assert.equal(href('high_little_world'),'games/high_little_world/index.html?v=2');
  assert.equal(href('job_internal_medicine'),'games/job_internal_medicine/오늘도 진료중!.html?v=4');
  assert.equal(href('job_bogle_bunsik'),'games/job_bogle_bunsik/보글보글 분식집.html?v=23');
});

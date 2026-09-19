const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const dir=path.join(root,'games','toddler_penguin_ice_pop');
const html=fs.readFileSync(path.join(dir,'펭귄 얼음 톡톡!.html'),'utf8');
const js=fs.readFileSync(path.join(dir,'penguin-ice-3d.js'),'utf8');
const css=fs.readFileSync(path.join(dir,'penguin-ice-3d.css'),'utf8');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data','games.json'),'utf8'));

test('Penguin Ice Pop canonical entry loads its 3D runtime',()=>{
  assert.match(html,/type="importmap"/);
  assert.match(html,/penguin-ice-3d\.css/);
  assert.match(html,/penguin-ice-3d\.js/);
  assert.match(html,/id="ice3d"/);
  assert.match(css,/#ice3d/);
});

test('Penguin Ice Pop uses the committed penguin asset and procedural ice board',()=>{
  assert.ok(fs.existsSync(path.join(root,'assets','game','characters','pets','animal-penguin.glb')));
  assert.match(js,/animal-penguin\.glb/);
  assert.match(js,/CylinderGeometry\(HEX_R,HEX_R,ICE_H,6/);
  assert.match(js,/MeshPhysicalMaterial/);
  assert.match(js,/THREE\.Raycaster/);
});

test('Penguin Ice Pop keeps board-game support and cascade rules',()=>{
  assert.match(js,/function edgeConnected/);
  assert.match(js,/function supportState/);
  assert.match(js,/function hitTile/);
  assert.match(js,/function failPenguin/);
  assert.match(js,/function splashRipple/);
  assert.match(js,/state\.mode==='color'/);
  assert.match(js,/state\.mode==='count'/);
  assert.match(js,/state\.mode==='friends'/);
});

test('Penguin Ice Pop catalog points at the 3D rework',()=>{
  const game=catalog.games.find(g=>g.id==='toddler_penguin_ice_pop');
  assert.ok(game);
  assert.equal(game.href,'games/toddler_penguin_ice_pop/펭귄 얼음 톡톡!.html?v=rework-3');
});

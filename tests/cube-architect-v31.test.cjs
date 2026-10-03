const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('games/cube3d/index.html');
const main=read('games/cube3d/cube-architect.js');
const creatures=read('games/cube3d/cube-architect-creatures.js');
const creatureAssets=read('games/cube3d/cube-architect-creature-assets.js');
const worldAssets=read('games/cube3d/cube-architect-world-assets.js');

test('v31 Cube World rework loads before the runtime and classic scripts still parse',()=>{
  assert.doesNotThrow(()=>new Function(main));
  assert.doesNotThrow(()=>new Function(creatures));
  assert.match(html,/cube-architect-world-assets\.js\?v=20261003-31/);
  assert.match(html,/cube-architect-creatures\.js\?v=20261003-31/);
  assert.match(html,/cube-architect-creature-assets\.js\?v=20261003-31/);
  assert.match(html,/cube-architect\.js\?v=20261003-31/);
  assert.ok(html.indexOf('cube-architect-world-assets.js')<html.indexOf('cube-architect.js'));
});

test('terrain reuses the Cube World pixel atlas while keeping the chunk renderer',()=>{
  assert.match(main,/Blocks_PixelArt\.png/);
  assert.match(main,/CUBE_WORLD_PIXEL_TILES/);
  assert.match(main,/function cubeWorldAtlasTexture/);
  assert.match(main,/grassSide:\[\.6,0\]/);
  assert.match(main,/grassTop:\[0,\.6\]/);
  assert.match(main,/snowTop:\[\.2,\.2\]/);
  assert.match(main,/pixelTextureCache\.clear\(\)/);
  assert.match(main,/if\(mode==='free'\)rebuildAllWorldMeshes\(\)/);
});

test('biome decoration uses Cube World environment glTF assets without replacing world blocks',()=>{
  assert.match(worldAssets,/Environment\/glTF\/Grass_Big\.gltf/);
  assert.match(worldAssets,/Environment\/glTF\/Bush\.gltf/);
  assert.match(worldAssets,/Environment\/glTF\/Mushroom\.gltf/);
  assert.match(worldAssets,/Environment\/glTF\/Bamboo\.gltf/);
  assert.match(worldAssets,/Environment\/glTF\/Rock1\.gltf/);
  assert.match(worldAssets,/Environment\/glTF\/Crystal_Small\.gltf/);
  assert.match(worldAssets,/function loadProp/);
  assert.match(main,/function cubeWorldDecorSpec/);
  assert.match(main,/function buildChunkCubeWorldDecor/);
  assert.match(main,/worldDecorative:true/);
  assert.match(main,/cube-architect-world-assets-ready/);
});

test('Cube World fauna and enemies join the existing survival roster',()=>{
  for(const id of ['pig','sheep','chicken','wolf','goblin','skeleton','yeti']){
    assert.match(creatures,new RegExp(id+":\\{id:'"+id+"'"));
  }
  assert.match(creatureAssets,/cube world\//);
  assert.match(creatureAssets,/Animals\/glTF\/Pig\.gltf/);
  assert.match(creatureAssets,/Animals\/glTF\/Wolf\.gltf/);
  assert.match(creatureAssets,/Enemies\/glTF\/Goblin\.gltf/);
  assert.match(creatureAssets,/Enemies\/glTF\/Yeti\.gltf/);
});

test('Cube World tool models are registered for the existing pickaxe progression',()=>{
  assert.match(worldAssets,/Tools\/glTF\/Pickaxe_Wood\.gltf/);
  assert.match(worldAssets,/Tools\/glTF\/Pickaxe_Stone\.gltf/);
  assert.match(worldAssets,/Tools\/glTF\/Pickaxe_Gold\.gltf/);
  assert.match(worldAssets,/function loadTool/);
});

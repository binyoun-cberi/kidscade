'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const js=read('games/cube3d/cube-architect.js');
const html=read('games/cube3d/index.html');

test('v26 natural block visual rework parses and is cache-busted',()=>{
  assert.doesNotThrow(()=>new Function(js));
  assert.match(html,/cube-architect\.js\?v=20261005-hunt1/);
});
test('natural blocks use shared procedural pixel textures',()=>{
  assert.match(js,/function pixelTexture/);
  assert.match(js,/new THREE\.CanvasTexture/);
  assert.match(js,/THREE\.NearestFilter/);
  assert.match(js,/pixelTextureCache=new Map/);
  for(const kind of ['dirt','stone','sand','redSand','gravel','snow','clay','ironOre','leaves','pineLeaves'])
    assert.ok(js.includes("'"+kind+"'"),kind);
});
test('grass and logs have face-specific materials',()=>{
  assert.match(js,/m=\[side,side,top,bottom,side,side\]/);
  assert.match(js,/type==='log'\|\|type==='pineLog'/);
  assert.match(js,/pineLogTop/);
  assert.match(js,/grassSideMarsh/);
  assert.match(js,/grassTopPine/);
  assert.match(js,/grassTopFlowers/);
});
test('grass and foliage silhouettes are no longer plain full cubes',()=>{
  assert.match(js,/const leafCubeGeo=new THREE\.BoxGeometry\(\.94,\.94,\.94\)/);
  assert.match(js,/const grassTuftGeo=new THREE\.PlaneGeometry\(\.09,\.3\)/);
  assert.match(js,/function decorateGrassTop/);
  assert.match(js,/worldDecorative=true/);
  assert.match(js,/root\.scale\.set\(v,\.95\+hash2/);
});
test('decorative grass does not become a separate interaction target',()=>{
  assert.match(js,/if\(o\.isMesh&&!o\.userData\?\.worldDecorative\)/);
});

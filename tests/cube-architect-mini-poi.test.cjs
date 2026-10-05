'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

const main=read('games/cube3d/cube-architect.js');
const html=read('games/cube3d/index.html');

test('mini POI runtime parses',()=>{
  assert.doesNotThrow(()=>new Function(main));
});

test('eight biomes each define two distinct discovery sites',()=>{
  for(const biome of ['meadow','forest','pine','snow','desert','badlands','marsh','flowers']){
    const re=new RegExp(biome+":\\[([\\s\\S]*?)\\n  \\]",'m');
    const match=main.match(re);
    assert.ok(match,biome+' mini POI group');
    const ids=[...match[1].matchAll(/id:'([^']+)'/g)].map(m=>m[1]);
    assert.equal(ids.length,2,biome+' should have two sites');
  }
  assert.equal((main.match(/kind:'(?:camp|well|oldCamp|fallenTree|watchPost|cairn|snowStation|iceMarker|oasis|fossil|minerCamp|stoneArch|boardwalk|reedShrine|flowerGarden|picnic)'/g)||[]).length,16);
});

test('mini POIs are deterministic, chunk-safe, and avoid landmark clear zones',()=>{
  assert.match(main,/function buildMiniPoiCatalog/);
  assert.match(main,/miniPoiLocalCoord/);
  assert.match(main,/lx<4\|\|lx>11\|\|lz<4\|\|lz>11/);
  assert.match(main,/poiRules\.isLandmarkClearZone/);
  assert.match(main,/function generateMiniPoiChunk/);
  assert.match(main,/generateMiniPoiChunk\(cx,cz\)/);
});

test('discovery markers grant biome rewards and persist through collected state',()=>{
  assert.match(main,/addCollectible\('mini:'\+spec\.id/);
  assert.match(main,/miniPoi:true,reward:spec\.reward/);
  assert.match(main,/const reward=m\.userData\.reward/);
  assert.match(main,/trackSurvival\('find',id\)/);
  assert.match(main,/collected\.has\('mini:'\+spec\.id\)/);
});

test('mini POI guidance and marker culling are active',()=>{
  assert.match(main,/function nearestUncollectedMiniPoi/);
  assert.match(main,/근처 발견지/);
  assert.match(main,/m\.visible=dist<=WORLD_VIEW_RADIUS\+5/);
});

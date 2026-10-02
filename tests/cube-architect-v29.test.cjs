'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const js=read('games/cube3d/cube-architect.js');
const voxelJs=read('games/cube3d/cube-architect-voxel.js');
const html=read('games/cube3d/index.html');

test('v29 voxel runtime parses and loads before the main game',()=>{
  assert.doesNotThrow(()=>new Function(js));
  assert.doesNotThrow(()=>new Function(voxelJs));
  assert.match(html,/cube-architect-voxel\.js\?v=20261003-29/);
  assert.match(html,/cube-architect\.js\?v=20261003-29/);
  assert.ok(html.indexOf('cube-architect-voxel.js')<html.indexOf('cube-architect.js'));
});

test('voxel runtime exposes six faces and resolves a triangle hit back to one block',()=>{
  const win={};
  const api=new Function('window',voxelJs+';return window.CubeArchitectVoxel;')(win);
  assert.equal(api.FACE_DEFS.length,6);
  assert.equal(api.chunkKey(-1,2),'-1,2');
  const matrixWorld={tag:'matrix'};
  const hit={
    object:{matrixWorld,userData:{worldChunkMesh:true,faceMap:[
      {worldBlock:true,worldKey:'4,2,7',gx:4,gy:2,gz:7,type:'stone',shapeKind:'cuboid',dims:[1,1,1],faceIndex:5}
    ]}},
    faceIndex:0,face:{materialIndex:0},point:{x:4,y:2.5,z:7}
  };
  const resolved=api.resolveHit(hit);
  assert.equal(resolved.object.userData.worldKey,'4,2,7');
  assert.equal(resolved.object.userData.type,'stone');
  assert.equal(resolved.object.matrixWorld,matrixWorld);
  assert.equal(resolved.face.materialIndex,5);
});

test('ordinary terrain is chunk meshed while special blocks keep object rendering',()=>{
  assert.match(js,/function isChunkRenderableData/);
  assert.match(js,/voxelRuntime\.buildChunkMeshes/);
  assert.match(js,/worldChunkMeshMap=new Map/);
  assert.match(js,/if\(d\.hidden\|\|isChunkRenderableData\(data\)\)return null/);
  assert.match(js,/data&&!isChunkRenderableData\(data\)&&visibleAt/);
});

test('chunk updates batch edits, interactions and simulation against world data',()=>{
  assert.match(js,/function queueWorldChunkRemesh/);
  assert.match(js,/Promise\.resolve\(\)\.then\(flushDirtyWorldChunks\)/);
  assert.match(js,/voxelRuntime\?\.resolveHit\?voxelRuntime\.resolveHit\(hit\):hit/);
  assert.match(js,/function forEachActiveWorldBlock/);
  assert.match(js,/forEachActiveWorldBlock\(\(key,d,x,y,z\)=>/);
});

test('grass detail is retained with instancing instead of per-block blade meshes',()=>{
  assert.match(js,/function buildChunkGrassInstances/);
  assert.match(js,/new THREE\.InstancedMesh\(grassTuftGeo,grassTuftMaterial\(variant\),items\.length\)/);
});

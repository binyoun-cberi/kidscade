'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const js=read('games/cube3d/cube-architect.js');
const html=read('games/cube3d/index.html');
const css=read('games/cube3d/cube-architect.css');

test('v25 tactile survival scripts parse and load',()=>{
  assert.doesNotThrow(()=>new Function(js));
  assert.match(html,/cube-architect\.js\?v=20261002-27/);
  assert.match(html,/id="miningProgress"/);
  assert.match(html,/id="survivalCraftDetail"/);
});
test('survival gathering uses hold progress instead of one-click block removal',()=>{
  assert.match(js,/function startMining/);
  assert.match(js,/function updateMining/);
  assert.match(js,/function miningSeconds/);
  assert.match(js,/miningProgress\+=dt\/Math\.max/);
  assert.match(js,/function spawnBreakParticles/);
});
test('touch movement keeps analog magnitude and softer look sensitivity',()=>{
  assert.match(js,/const analog=\(magnitude-\.12\)\/\.88/);
  assert.match(js,/multiplyScalar\(speed\*dt\*analog\)/);
  assert.match(js,/dx\*\.0029/);
});
test('crafting has visual selection detail and batches inventory updates',()=>{
  assert.match(js,/function renderCraftDetail/);
  assert.match(js,/function renderCraftTabs/);
  assert.match(js,/inventoryBatchDepth\+\+/);
  assert.match(js,/setTimeout\(\(\)=>\{/);
  assert.match(css,/\.craft-workspace/);
  assert.match(css,/@keyframes craftPop/);
});
test('block changes use deferred saves and panels return to play',()=>{
  assert.match(js,/function markFreeWorldDirty/);
  assert.match(js,/if\(freeSaveDirty\)\{/);
  assert.match(js,/if\(now>=freeSaveDueAt\)saveFreeWorld\(\)/);
  assert.match(js,/function resumeFreePointerLock/);
  assert.match(js,/freeStepHop=1/);
});

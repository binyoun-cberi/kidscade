'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

const main=read('games/cube3d/cube-architect.js');
const html=read('games/cube3d/index.html');
const ui=read('games/cube3d/cube-architect-ui.css');

test('craft discovery and audio runtime parses and is cache-busted',()=>{
  assert.doesNotThrow(()=>new Function(main));
  assert.match(html,/cube-architect\.js\?v=20261005-craft-audio1/);
  assert.match(html,/cube-architect-ui\.css\?v=20261005-craft-audio1/);
});

test('recipes are discovered from meaningful materials and retain unread state',()=>{
  assert.match(main,/discoveredResources=new Set/);
  assert.match(main,/discoveredRecipeIds=new Set/);
  assert.match(main,/unreadRecipeIds=new Set/);
  assert.match(main,/function recipeDiscoveryClues/);
  assert.match(main,/function refreshRecipeDiscoveries/);
  assert.match(main,/discoveredRecipeIds\.has\(r\.id\)/);
  assert.match(main,/discoveredResources:\[\.\.\.discoveredResources\]/);
  assert.match(main,/discoveredRecipes:\[\.\.\.discoveredRecipeIds\]/);
  assert.match(main,/unreadRecipes:\[\.\.\.unreadRecipeIds\]/);
});

test('new recipes surface through HUD and crafting browser',()=>{
  assert.match(html,/id="craftDiscoveryNotice"/);
  assert.match(html,/id="craftDiscoverySummary"/);
  assert.match(main,/function updateCraftDiscoveryHud/);
  assert.match(main,/new-recipe/);
  assert.match(main,/craft-new-chip/);
  assert.match(ui,/#craftDiscoveryNotice/);
  assert.match(ui,/\.survival-recipe\.new-recipe/);
});

test('footsteps react to terrain and movement distance',()=>{
  assert.match(main,/function groundSurfaceType/);
  assert.match(main,/function updateFootstepAudio/);
  assert.match(main,/function stepSfx/);
  assert.match(main,/footstepDistanceAcc/);
  assert.match(main,/updateFootstepAudio\(\)/);
  assert.match(main,/landedThisFrame/);
});

test('ambient audio reacts to weather biome fire and water movement',()=>{
  assert.match(main,/function noiseBurst/);
  assert.match(main,/function ambientSfx/);
  assert.match(main,/function nearAmbientHeat/);
  assert.match(main,/function updateAmbientAudio/);
  assert.match(main,/weather==='storm'/);
  assert.match(main,/weather==='rain'/);
  assert.match(main,/\['snow','desert','badlands'\]\.includes\(biome\)/);
  assert.match(main,/biome==='marsh'/);
  assert.match(main,/freeFluidKind==='lava'/);
});

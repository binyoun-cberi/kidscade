'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const root=require('node:path').resolve(__dirname,'..');
const read=p=>fs.readFileSync(root+'/'+p,'utf8');
const main=read('games/cube3d/cube-architect.js');
const worldSource=read('games/cube3d/cube-architect-world.js');
const w={};new Function('window',worldSource)(w);
const rules=w.CubeArchitectWorld;

test('post-camp survival goals are optional adventures, not a linear gate',()=>{
  const adventures=rules.GOALS.filter(g=>g.kind==='adventure');
  assert.equal(adventures.length,5);
  assert.deepEqual(adventures.map(g=>g.id),['explore','furnace','smelt','geometry','landmark']);
  assert.match(main,/자유 생존 · 원하는 대로/);
  assert.match(main,/안 해도 괜찮아요/);
});

test('recipes are discovered from materials without quest-stage requirements',()=>{
  const discovery=main.slice(main.indexOf('function refreshRecipeDiscoveries'),main.indexOf('function markRecipeSeen'));
  const visible=main.slice(main.indexOf('function visibleSurvivalRecipes'),main.indexOf('function renderCraftTabs'));
  assert.doesNotMatch(discovery,/recipe\.stage\s*[<>]=?\s*survivalStage/);
  assert.doesNotMatch(visible,/r\.stage\s*[<>]=?\s*survivalStage/);
  assert.match(discovery,/recipeUnlocked\(recipe\.id\)/);
});

test('landmarks and geometry tools are not locked behind survivalStage',()=>{
  const dungeon=main.slice(main.indexOf('function openLandmarkDungeon'),main.indexOf('function returnFromDungeon'));
  const placement=main.slice(main.indexOf('function placementPreviewValid'),main.indexOf('function buildFreePlacementGhost'));
  const mobile=main.slice(main.indexOf('function configureMobileMode'),main.indexOf('function enableMobileFallback'));
  assert.doesNotMatch(dungeon,/survivalStage/);
  assert.doesNotMatch(placement,/survivalStage/);
  assert.doesNotMatch(mobile,/survivalStage/);
  assert.match(main,/if\(e\.code==='KeyP'\)paintLookedFace\(\)/);
  assert.match(main,/if\(e\.code==='KeyX'\)toggleXray\(\)/);
});

test('geometry adventure rewards a larger cuboid but landmark tech remains the best upgrade',()=>{
  const fn=main.slice(main.indexOf('function survivalCuboidMax'),main.indexOf('function landmarkPoiBaseY'));
  const c={gameFreeMode:'survival',unlockedTech:new Set(),survivalAdventureDone:new Set()};
  vm.createContext(c);vm.runInContext(fn,c);
  assert.equal(c.survivalCuboidMax(),3);
  c.survivalAdventureDone.add('geometry');assert.equal(c.survivalCuboidMax(),4);
  c.unlockedTech.add('largeCuboid');assert.equal(c.survivalCuboidMax(),6);
  c.gameFreeMode='creative';assert.equal(c.survivalCuboidMax(),8);
});

test('danger pacing uses time and place rather than mandatory quest completion',()=>{
  const roster=main.slice(main.indexOf('function creatureRosterForBiome'),main.indexOf('function creatureRespawnReady'));
  const elite=main.slice(main.indexOf('function tryRareEliteSpawn'),main.indexOf('function maintainWildCreatures'));
  assert.doesNotMatch(roster,/survivalStage/);
  assert.doesNotMatch(elite,/survivalStage/);
  assert.match(elite,/survivalWorldTime<180/);
});

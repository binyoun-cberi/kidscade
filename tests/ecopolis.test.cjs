const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const dir=path.join(root,'games','high_ecopolis');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const css=fs.readFileSync(path.join(dir,'style.css'),'utf8');
const js=fs.readFileSync(path.join(dir,'game.js'),'utf8');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data','games.json'),'utf8'));

test('Ecopolis is registered as a high-grade science strategy game',()=>{
  const game=catalog.games.find(g=>g.id==='high_ecopolis');
  assert.ok(game);
  assert.equal(game.title,'에코폴리스');
  assert.equal(game.age,'high');
  assert.equal(game.subject,'science');
  assert.equal(game.genre,'strategy');
  assert.deepEqual(game.input,['touch','keyboard']);
  assert.equal(game.href,'games/high_ecopolis/index.html?v=3');
});

test('Ecopolis uses the common shell and local Three runtime',()=>{
  assert.match(html,/kidscade-game-sdk\.js/);
  assert.match(html,/data-game-id="high_ecopolis"/);
  assert.match(html,/three-r160\/three\.module\.js/);
  assert.match(js,/from 'three'/);
  assert.match(css,/touch-action:none/);
});

test('Ecopolis contains the reverse city-builder loop',()=>{
  for(const pattern of [
    /wind:\{label:'풍력 발전기'/,
/solar:\{label:'태양광 발전소'/,
/geothermal:\{label:'지열 발전소'/,
/nuclear:\{label:'원자력 발전소'/,
/coal:\{label:'화력 발전소'/,
/carfactory:\{label:'자동차 공장'/,
/landfill:\{label:'쓰레기 매립지'/,
/quarry:\{label:'채석장'/,
/parking:\{label:'대형 주차장'/,
/channel:\{label:'콘크리트 하천'/,
/lawn:\{label:'잔디공원'/,
/plantation:\{label:'단일수종 조림'/,
    /purifier:\{label:'토양 정화기'/,
    /waterfilter:\{label:'하천 정화기'/,
    /wetland:\{label:'습지 씨앗'/,
    /forest:\{label:'숲 묘목장'/,
    /meadow:\{label:'꽃초원 씨앗'/,
    /recycler:\{label:'회수선'/,
    /function purifyLand/,
    /function purifyWater/,
    /function seedBiome/,
    /function updateSpecies/,
    /function launchRecycler/,
    /buildings\.length===0/,
    /function ecologyTick/,
/function polluteAround/,
/function energySummary/,
/function scarLand/,
/function paveLand/,
/function concreteChannel/,
/habitatStress/,
/waterStress/,
/function completeGame/
  ]) assert.match(js,pattern);
});

test('Ecopolis supports procedural regions, analysis views, touch, tutorial and saving',()=>{
  assert.match(js,/function mulberry32/);
  assert.match(js,/SCENARIOS/);
  assert.match(js,/function sunAt/);
  assert.match(js,/function geothermalAt/);
  assert.match(js,/ecosystem\.carbon/);
  assert.match(js,/function toggleAnalysis/);
  assert.match(js,/pointerdown/);
  assert.match(js,/function showTutorial/);
  assert.match(js,/function saveGame/);
  assert.match(js,/function loadGame/);
  assert.match(html,/data-scenario="valley"/);
  assert.match(html,/data-scenario="marsh"/);
  assert.match(html,/data-scenario="dust"/);
});

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const ROOT=path.resolve(__dirname,'..');
const runtime=fs.readFileSync(path.join(ROOT,'games','high_bridge_builder','bridge-builder.js'),'utf8');
const html=fs.readFileSync(path.join(ROOT,'games','high_bridge_builder','index.html'),'utf8');
const css=fs.readFileSync(path.join(ROOT,'games','high_bridge_builder','bridge-builder.css'),'utf8');

test('Bridge Builder is now a one-stroke draw-a-road game',()=>{
  assert.match(html,/검은 선 하나만 그리세요/);
  assert.match(html,/내가 그린 선 그대로/);
  assert.match(html,/id="testBtn"/);
  assert.match(html,/id="resetBtn"/);
  assert.doesNotMatch(html,/id="undoBtn"/);
  assert.match(runtime,/function startStroke/);
  assert.match(runtime,/function extendStroke/);
  assert.match(runtime,/function finishStroke/);
  assert.match(runtime,/pointerdown/);
  assert.match(runtime,/pointermove/);
});

test('old structural bridge simulation is completely removed',()=>{
  assert.doesNotMatch(runtime,/\bdeck\b/);
  assert.doesNotMatch(runtime,/\bbrace\b/);
  assert.doesNotMatch(runtime,/makeNode/);
  assert.doesNotMatch(runtime,/makeEdge/);
  assert.doesNotMatch(runtime,/makeBend/);
  assert.doesNotMatch(runtime,/breakRatio/);
  assert.doesNotMatch(runtime,/strain/);
  assert.doesNotMatch(runtime,/solveConstraint/);
  assert.doesNotMatch(runtime,/nearestEdgeProjection/);
});

test('starting a new stroke replaces the previous road',()=>{
  assert.match(runtime,/function startStroke[\s\S]*S\.points=\[\]/);
  assert.match(runtime,/S\.roadProfile=null/);
  assert.match(runtime,/S\.bridgeReady=false/);
});

test('drawn line is sampled directly into the road the car follows',()=>{
  assert.match(runtime,/function segmentYAtX/);
  assert.match(runtime,/function buildRoadProfile/);
  assert.match(runtime,/function roadYAt/);
  assert.match(runtime,/function roadAngleAt/);
  assert.match(runtime,/var y=roadYAt\(v\.x\)/);
});

test('a bridge only needs one continuous line touching both platform lips',()=>{
  assert.match(runtime,/function snapBridgeEnds/);
  assert.match(runtime,/leftOK/);
  assert.match(runtime,/rightOK/);
  assert.match(runtime,/return leftOK&&rightOK/);
  assert.match(runtime,/양쪽 벽 끝에 선을 닿게 해 주세요/);
});

test('ink limits only drawing length and no longer represents materials',()=>{
  assert.match(runtime,/inkLeft/);
  assert.match(runtime,/S\.inkLeft=Math\.max\(0,S\.inkLeft-d\)/);
  assert.match(html,/남은 잉크/);
  assert.doesNotMatch(html,/보강선/);
  assert.doesNotMatch(html,/재료 선택/);
});

test('vehicle success is simple deterministic traversal rather than structural physics',()=>{
  assert.match(runtime,/function updateRun\(dt\)/);
  assert.match(runtime,/v\.x\+=v\.speed\*dt/);
  assert.match(runtime,/if\(v\.x>b\.rightX\+95\)succeed\(\)/);
  assert.doesNotMatch(runtime,/function physics/);
});

test('mobile play area keeps the 12 by 7 canvas and v8 runtime',()=>{
  assert.match(css,/aspect-ratio:12\/7/);
  assert.match(css,/width:100%!important/);
  assert.match(html,/bridge-builder\.js\?v=8/);
  assert.match(html,/bridge-builder\.css\?v=8/);
});

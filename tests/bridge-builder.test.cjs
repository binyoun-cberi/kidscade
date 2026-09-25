const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const ROOT=path.resolve(__dirname,'..');
const runtime=fs.readFileSync(path.join(ROOT,'games','high_bridge_builder','bridge-builder.js'),'utf8');
const html=fs.readFileSync(path.join(ROOT,'games','high_bridge_builder','index.html'),'utf8');
const css=fs.readFileSync(path.join(ROOT,'games','high_bridge_builder','bridge-builder.css'),'utf8');

test('Bridge Builder is a one-stroke auto-run game',()=>{
  assert.match(html,/선 하나만 그리면 돼요/);
  assert.match(html,/자동으로 출발/);
  assert.match(html,/id="resetBtn"/);
  assert.doesNotMatch(html,/id="testBtn"/);
  assert.doesNotMatch(html,/id="inkBar"/);
  assert.doesNotMatch(html,/남은 잉크/);
  assert.match(runtime,/function startStroke/);
  assert.match(runtime,/function finishStroke/);
  assert.match(runtime,/setTimeout\(function\(\)\{[\s\S]*startTest\(\)/);
});

test('car is parked and visible before the player draws',()=>{
  assert.match(runtime,/function parkVehicle/);
  assert.match(runtime,/parkVehicle\(\);[\s\S]*showHint/);
  assert.match(runtime,/x:b\.leftX-58/);
  assert.match(runtime,/function drawCar/);
});

test('starting a new stroke immediately replaces the previous road',()=>{
  assert.match(runtime,/function startStroke[\s\S]*S\.points=\[\]/);
  assert.match(runtime,/S\.roadProfile=null/);
  assert.match(runtime,/S\.bridgeReady=false/);
  assert.match(runtime,/parkVehicle\(\)/);
});

test('drawn line itself becomes the road profile',()=>{
  assert.match(runtime,/function segmentYAtX/);
  assert.match(runtime,/function buildRoadProfile/);
  assert.match(runtime,/function roadYAt/);
  assert.match(runtime,/function roadAngleAt/);
  assert.match(runtime,/var y=roadYAt\(v\.x\)/);
});

test('bridge validation accepts a line spanning the gap and snaps only the sampled ends',()=>{
  assert.match(runtime,/MAX_JOIN_Y=145/);
  assert.match(runtime,/if\(profile\[k\]===null\)return null/);
  assert.match(runtime,/Math\.abs\(profile\[0\]-b\.leftY\)>MAX_JOIN_Y/);
  assert.match(runtime,/profile\[0\]=b\.leftY/);
  assert.match(runtime,/profile\[profile\.length-1\]=b\.rightY/);
});

test('old structure and material simulation stays removed',()=>{
  assert.doesNotMatch(runtime,/\bdeck\b/);
  assert.doesNotMatch(runtime,/\bbrace\b/);
  assert.doesNotMatch(runtime,/makeNode/);
  assert.doesNotMatch(runtime,/makeEdge/);
  assert.doesNotMatch(runtime,/makeBend/);
  assert.doesNotMatch(runtime,/breakRatio/);
  assert.doesNotMatch(runtime,/strain/);
  assert.doesNotMatch(runtime,/solveConstraint/);
  assert.doesNotMatch(runtime,/function physics/);
});

test('only the redraw control lives inside the visible play area',()=>{
  assert.match(html,/class="reset-floating"/);
  assert.doesNotMatch(html,/class="actions"/);
  assert.match(css,/\.reset-floating/);
  assert.match(css,/position:absolute/);
});

test('mobile play area keeps the 12 by 7 canvas and v9 runtime',()=>{
  assert.match(css,/aspect-ratio:12\/7/);
  assert.match(css,/width:100%!important/);
  assert.match(html,/bridge-builder\.js\?v=9/);
  assert.match(html,/bridge-builder\.css\?v=9/);
});

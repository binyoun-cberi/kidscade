const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const ROOT=path.resolve(__dirname,'..');
const runtime=fs.readFileSync(path.join(ROOT,'games','high_bridge_builder','bridge-builder.js'),'utf8');
const html=fs.readFileSync(path.join(ROOT,'games','high_bridge_builder','index.html'),'utf8');
const css=fs.readFileSync(path.join(ROOT,'games','high_bridge_builder','bridge-builder.css'),'utf8');

test('Bridge Builder stays a one-stroke auto-run game',()=>{
  assert.match(html,/선 하나만 그리면 돼요/);
  assert.match(html,/자동으로 출발/);
  assert.match(html,/id="resetBtn"/);
  assert.doesNotMatch(html,/id="testBtn"/);
  assert.doesNotMatch(html,/id="inkBar"/);
  assert.match(runtime,/function startStroke/);
  assert.match(runtime,/function finishStroke/);
  assert.match(runtime,/setTimeout\(function\(\)\{[\s\S]*startTest\(\)/);
});

test('only stage one is a plain gap and later stages add route-changing obstacles',()=>{
  assert.match(runtime,/title:"1\. 작은 개울"[\s\S]*obstacles:\[\]/);
  assert.match(runtime,/title:"2\. 바위 기둥"[\s\S]*type:"up"/);
  assert.match(runtime,/title:"3\. 낮은 터널"[\s\S]*type:"down"/);
  assert.match(runtime,/title:"4\. 위로, 아래로!"[\s\S]*type:"up"[\s\S]*type:"down"/);
  assert.match(runtime,/title:"5\. 좁은 관문"/);
  assert.match(runtime,/title:"6\. 지그재그 협곡"/);
  assert.match(runtime,/title:"7\. 두 개의 관문"/);
  assert.match(runtime,/title:"8\. 마지막 협곡"/);
});

test('car collides with the authored obstacles instead of ignoring them',()=>{
  assert.match(runtime,/function resolvedObstacles/);
  assert.match(runtime,/function carHitsObstacle/);
  assert.match(runtime,/if\(carHitsObstacle\(v\)\)/);
  assert.match(runtime,/장애물을 피해 길을 다시 그려 보세요/);
  assert.match(runtime,/function drawObstacles/);
});

test('car is parked and visible before the player draws',()=>{
  assert.match(runtime,/function parkVehicle/);
  assert.match(runtime,/parkVehicle\(\);[\s\S]*showHint/);
  assert.match(runtime,/x:b\.leftX-58/);
  assert.match(runtime,/function drawCar/);
});

test('drawn line itself becomes the road profile',()=>{
  assert.match(runtime,/function segmentYAtX/);
  assert.match(runtime,/function buildRoadProfile/);
  assert.match(runtime,/function roadYAt/);
  assert.match(runtime,/function roadAngleAt/);
  assert.match(runtime,/var y=roadYAt\(v\.x\)/);
});

test('engine audio starts with the run and changes pitch on slopes',()=>{
  assert.match(runtime,/function ensureAudio/);
  assert.match(runtime,/function startEngine/);
  assert.match(runtime,/function stopEngine/);
  assert.match(runtime,/function updateEngine/);
  assert.match(runtime,/a\.type="sawtooth"/);
  assert.match(runtime,/b\.type="triangle"/);
  assert.match(runtime,/startEngine\(\);[\s\S]*내가 그린 길을 달리는 중/);
  assert.match(runtime,/updateEngine\(v\.angle\)/);
});

test('old structural bridge simulation stays removed',()=>{
  assert.doesNotMatch(runtime,/\bdeck\b/);
  assert.doesNotMatch(runtime,/\bbrace\b/);
  assert.doesNotMatch(runtime,/makeNode/);
  assert.doesNotMatch(runtime,/makeEdge/);
  assert.doesNotMatch(runtime,/makeBend/);
  assert.doesNotMatch(runtime,/breakRatio/);
  assert.doesNotMatch(runtime,/solveConstraint/);
  assert.doesNotMatch(runtime,/function physics/);
});

test('only redraw control lives inside the visible play area',()=>{
  assert.match(html,/class="reset-floating"/);
  assert.doesNotMatch(html,/class="actions"/);
  assert.match(css,/\.reset-floating/);
  assert.match(css,/position:absolute/);
});

test('mobile play area keeps the 12 by 7 canvas and v12 runtime',()=>{
  assert.match(css,/aspect-ratio:12\/7/);
  assert.match(css,/width:100%!important/);
  assert.match(html,/bridge-builder\.js\?v=12/);
  assert.match(html,/bridge-builder\.css\?v=12/);
});

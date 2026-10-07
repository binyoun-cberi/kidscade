const fs=require('node:fs');
const path=require('node:path');
const test=require('node:test');
const assert=require('node:assert/strict');

const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'games/korea_puzzle/K-퍼즐 지도 맞추기.html'),'utf8');
const script=(html.match(/<script>\s*([\s\S]*?)<\/script>/)||[])[1];

test('K-map puzzle inline runtime parses',()=>{
  assert.ok(script);
  assert.doesNotThrow(()=>new Function(script));
});

test('K-map puzzle throttles drag DOM writes to animation frames',()=>{
  assert.match(script,/function schedulePieceTransform/);
  assert.match(script,/requestAnimationFrame/);
  assert.match(script,/schedulePieceTransform\(this, d\)/);
});

test('K-map puzzle reduces SVG work for dense maps',()=>{
  assert.match(html,/performance-mode/);
  assert.match(script,/totalPieces >= 40/);
  assert.match(script,/piece\.filter\(needsHitArea\)/);
  assert.match(html,/class", "piece-shape"/);
});

test('K-map world puzzle flies from Seoul, follows the plane, and pauses puzzle timing',()=>{
  assert.match(html,/id="travel-overlay"/);
  assert.match(html,/id="travel-canvas"/);
  assert.match(html,/id="arrival-modal"/);
  assert.match(html,/id="btn-arrival-continue"/);
  assert.match(script,/const SEOUL_COORDS = \[126\.9780, 37\.5665\]/);
  assert.match(script,/let travelOrigin = \{name:'서울'/);
  assert.match(script,/d3\.geoOrthographic\(\)/);
  assert.match(script,/d3\.geoInterpolate\(from\.coords,to\.coords\)/);
  assert.match(script,/\.rotate\(\[-center\[0\],-center\[1\]\]\)/);
  assert.match(script,/drawTravelFrame\(center,from,to,t,zoom\)/);
  assert.match(script,/pauseGameTimer\(\)/);
  assert.match(script,/resumeGameTimer\(\)/);
  assert.match(script,/travelOrigin=to/);
});

test('K-map world placement waits for arrival modal before resuming or clearing',()=>{
  assert.match(script,/runWorldTravel\(d\)\.then\(\(\)=>\{/);
  assert.match(script,/if\(placedPieces === totalPieces\) checkWin\(\)/);
  assert.match(script,/else gameActive = true/);
  assert.match(script,/await showArrival\(from,to\)/);
  assert.match(script,/arrival-distance/);
  assert.match(script,/CONTINENT_KO/);
});

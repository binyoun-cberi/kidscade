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

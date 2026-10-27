'use strict';
const assert=require('node:assert/strict');
const {detectPitch}=require('./pitch-detection.js');
let seed=31;
function noise(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2147483648-1}
for(const rate of [44100,48000]){
  for(const hz of [90,110,146.83,196,220,261.63,329.63,440,523.25,659.25,880]){
    for(const kind of ['sine','noise']){
      const samples=Float32Array.from({length:4096},(_,i)=>.2*Math.sin(2*Math.PI*hz*i/rate)+(kind==='noise'?.025*noise():0));
      const got=detectPitch(samples,rate).hz;
      assert.ok(got && Math.abs(1200*Math.log2(got/hz))<30,JSON.stringify({rate,hz,kind,got}));
    }
  }
  for(const hz of [110,220,329.63,440]){
    const samples=Float32Array.from({length:4096},(_,i)=>{const t=2*Math.PI*hz*i/rate;return .2*(.2*Math.sin(t)+Math.sin(2*t)+.15*Math.sin(3*t))});
    const got=detectPitch(samples,rate).hz;
    assert.ok(got && Math.abs(1200*Math.log2(got/hz))<30,JSON.stringify({rate,hz,got}));
  }
}
assert.equal(detectPitch(new Float32Array(4096),48000).hz,null);
assert.equal(detectPitch(Float32Array.from({length:4096},()=>.1*noise()),48000).hz,null);
console.log('Pitch detection: 54 cases passed');

'use strict';
const assert=require('node:assert/strict');
const {detectPitch}=require('./pitch-detection.js');
let seed=31,count=0;
function noise(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2147483648-1}
function tone(hz,rate,n,kind='sine'){return Float32Array.from({length:n},(_,i)=>{const t=2*Math.PI*hz*i/rate;return kind==='harmonic'?.2*(.2*Math.sin(t)+Math.sin(2*t)+.15*Math.sin(3*t)):.2*Math.sin(t)+(kind==='noise'?.025*noise():0)})}
function expectPitch(samples,rate,hz){const got=detectPitch(samples,rate);assert.ok(got.hz&&Math.abs(1200*Math.log2(got.hz/hz))<30,JSON.stringify({rate,hz,got}));assert.ok(got.clarity>=.8);count++}
for(const n of [2048,4096])for(const rate of [44100,48000]){
  for(const hz of [90,110,146.83,196,220,261.63,329.63,440,523.25,659.25,880])for(const kind of ['sine','noise','harmonic'])expectPitch(tone(hz,rate,n,kind),rate,hz);
  assert.equal(detectPitch(new Float32Array(n),rate).hz,null);count++;
  assert.equal(detectPitch(new Float32Array(n).fill(.2),rate).hz,null);count++;
  expectPitch(Float32Array.from(tone(220,rate,n),v=>v+.3),rate,220);
  // History must not lock an actual octave switch to the preceding pitch.
  for(const hz of [220,440,220,880,110,440])expectPitch(tone(hz,rate,n),rate,hz);
}
for(let i=0;i<50;i++){assert.equal(detectPitch(Float32Array.from({length:2048},()=>.1*noise()),48000).hz,null);count++}
for(const samples of [new Float32Array(2048).fill(NaN),new Float32Array(2048).fill(Infinity),new Float32Array(64)]){assert.equal(detectPitch(samples,48000).hz,null);count++}
assert.equal(detectPitch(tone(220,48000,2048),0).hz,null);count++;
assert.equal(detectPitch(tone(220,48000,2048),48000,{minClarity:2}).hz,null);count++;
assert.equal(detectPitch(tone(1100,48000,2048),48000).hz,null);count++;
// Verify classic-script loading used by both pages, without CommonJS or a CDN.
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),sandbox={};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'vendor/pitchy.bundle.js'),'utf8'),sandbox);
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'pitch-detection.js'),'utf8'),sandbox);
assert.ok(Math.abs(sandbox.KidscadePitch.detectPitch(tone(440,48000,2048),48000).hz-440)<1);count++;
for(const file of ['index.html','melody-studio.html']){const html=fs.readFileSync(path.join(__dirname,file),'utf8');assert.ok(html.indexOf('vendor/pitchy.bundle.js')<html.indexOf('src="pitch-detection.js'));count++}
console.log('Pitch detection: '+count+' cases passed');

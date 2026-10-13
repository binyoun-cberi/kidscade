const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {detectPitch}=require('../games/low_perfect_pitch/pitch-detection.js');

function voice(hz,{rate=48000,size=4096,amp=.13,harmonics=0,noise=0}={}){
  const buf=new Float32Array(size);
  let seed=13241;
  for(let i=0;i<size;i++){
    const phase=2*Math.PI*hz*i/rate;
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    buf[i]=amp*(Math.sin(phase)+harmonics*Math.sin(2*phase)+harmonics*.2*Math.sin(3*phase))
      +noise*((seed/4294967296)*2-1);
  }
  return buf;
}

for(const rate of [44100,48000]){
  for(const frequency of [100,130.81,196,261.63,440,659.25,880]){
    test('recognizes '+frequency+' Hz voice at '+rate+' Hz sample rate',()=>{
      const detected=detectPitch(voice(frequency,{rate}),rate);
      assert.ok(detected.hz!==null,'expected a note, got '+JSON.stringify(detected));
      assert.ok(Math.abs(1200*Math.log2(detected.hz/frequency))<30,
        'detected '+detected.hz+' instead of '+frequency);
    });
  }
}

test('recognizes a quiet note rather than treating it as silence',()=>{
  const result=detectPitch(voice(220,{amp:.012}),48000);
  assert.ok(result.hz!==null);
  assert.ok(Math.abs(result.hz-220)<5);
});

test('recognizes a voiced note with harmonics and room noise',()=>{
  const result=detectPitch(voice(220,{harmonics:.65,noise:.008}),48000);
  assert.ok(result.hz!==null);
  assert.ok(Math.abs(1200*Math.log2(result.hz/220))<40);
});

test('silence and faint ambient noise are not judged as sung notes',()=>{
  assert.equal(detectPitch(new Float32Array(4096),48000).hz,null);
  assert.equal(detectPitch(voice(230,{amp:0,noise:.001}),48000).hz,null);
});

test('game loads the detector ahead of the controller and samples microphone frames',()=>{
  const dir=path.join(__dirname,'..','games','low_perfect_pitch');
  const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
  const code=fs.readFileSync(path.join(dir,'game.js'),'utf8');
  assert.ok(html.indexOf('pitch-detection.js?v=6')>=0);
  assert.ok(html.indexOf('pitch-detection.js?v=6')<html.indexOf('game.js?v=6'));
  assert.match(code,/window\.KidscadePitch\.detectPitch/);
  assert.match(code,/analyser\.fftSize=4096/);
  assert.match(code,/state\.lastPitchAt!==state\.calLastSampleAt/);
  assert.match(code,/bestError/);
  assert.match(code,/state\.gameMode==='stair'\?0:4/);
});

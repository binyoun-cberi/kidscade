/* Local Pitchy/MPM adapter. Dependencies are bundled with this game. */
(function(root,factory){
  const dependency=typeof module==='object'&&module.exports?require('./vendor/pitchy.bundle.js'):root.KidscadePitchy;
  const api=factory(dependency);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.KidscadePitch=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(Pitchy){
  'use strict';
  // Reuse detector FFT buffers and centered input, rather than allocating per frame.
  const cache=new Map();
  function detectPitch(samples,sampleRate,options={}){
    const n=samples?.length||0;
    if(!Pitchy?.PitchDetector||!Number.isFinite(sampleRate)||sampleRate<=0||n<1024||n>16384)return {hz:null,rms:0,clarity:0};
    const minHz=options.minHz??75,maxHz=options.maxHz??1000,minRms=options.minRms??0.003,minClarity=options.minClarity??0.8;
    if(!Number.isFinite(minHz)||!Number.isFinite(maxHz)||minHz<=0||maxHz<=minHz||!Number.isFinite(minRms)||minRms<0||!Number.isFinite(minClarity)||minClarity<0||minClarity>1)return {hz:null,rms:0,clarity:0};
    let mean=0;
    for(let i=0;i<n;i++){if(!Number.isFinite(samples[i]))return {hz:null,rms:0,clarity:0};mean+=samples[i]}
    mean/=n;
    let power=0;
    for(let i=0;i<n;i++){const v=samples[i]-mean;power+=v*v}
    const rms=Math.sqrt(power/n);
    if(rms<minRms||rms===0)return {hz:null,rms,clarity:0};
    let entry=cache.get(n);
    if(!entry){
      if(cache.size>=2)cache.delete(cache.keys().next().value);
      entry={detector:Pitchy.PitchDetector.forFloat32Array(n),input:new Float32Array(n)};
      cache.set(n,entry);
    }
    for(let i=0;i<n;i++)entry.input[i]=samples[i]-mean;
    const [frequency,confidence]=entry.detector.findPitch(entry.input,sampleRate);
    const clarity=Number.isFinite(confidence)?Math.max(0,Math.min(1,confidence)):0;
    // The relative peak threshold inside MPM is distinct from this acceptance gate.
    // Do not store noise as melody or score it as an intentional sung note.
    if(!Number.isFinite(frequency)||clarity<minClarity||frequency<minHz/1.0006||frequency>maxHz*1.0006)return {hz:null,rms,clarity};
    return {hz:Math.max(minHz,Math.min(maxHz,frequency)),rms,clarity};
  }
  return {detectPitch};
});

/* Lightweight, local-only YIN pitch detection for voice input. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.KidscadePitch=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function detectPitch(samples,sampleRate,options={}){
    const n=samples?.length||0;
    if(!Number.isFinite(sampleRate)||sampleRate<=0||n<1024)return {hz:null,rms:0,clarity:0};
    const minHz=options.minHz||75,maxHz=options.maxHz||1000;
    const minTau=Math.max(2,Math.ceil(sampleRate/maxHz));
    const maxTau=Math.min(Math.floor(sampleRate/minHz),Math.floor(n/2)-2);
    if(maxTau<=minTau)return {hz:null,rms:0,clarity:0};
    let mean=0;
    for(let i=0;i<n;i++)mean+=samples[i];
    mean/=n;
    let power=0;
    for(let i=0;i<n;i++){const v=samples[i]-mean;power+=v*v}
    const rms=Math.sqrt(power/n);
    // Keep quiet singing audible, but reject silence before searching for a pitch.
    if(rms<(options.minRms??0.003))return {hz:null,rms,clarity:0};
    // Use a fixed comparison window: lower notes benefit from the longer FFT buffer,
    // while small phones avoid a needless full-buffer quadratic cost.
    const compareSize=Math.min(n-maxTau,Math.max(768,Math.floor(sampleRate*0.042)));
    const cmnd=new Float32Array(maxTau+1);
    let running=0,best=-1,bestValue=1;
    cmnd[0]=1;
    for(let tau=1;tau<=maxTau;tau++){
      let difference=0;
      for(let i=0;i<compareSize;i++){
        const delta=samples[i]-samples[i+tau];
        difference+=delta*delta;
      }
      running+=difference;
      const value=running?difference*tau/running:1;
      cmnd[tau]=value;
      if(tau>=minTau&&value<bestValue){bestValue=value;best=tau}
    }
    const threshold=options.threshold??0.18;
    let selected=-1;
    for(let tau=minTau;tau<=maxTau;tau++){
      if(cmnd[tau]<threshold){
        while(tau+1<=maxTau&&cmnd[tau+1]<cmnd[tau])tau++;
        selected=tau;
        break;
      }
    }
    if(selected<0){
      if(best<0||bestValue>0.25)return {hz:null,rms,clarity:Math.max(0,1-bestValue)};
      selected=best;
    }
    let tau=selected;
    if(selected>1&&selected<maxTau){
      const left=cmnd[selected-1],center=cmnd[selected],right=cmnd[selected+1];
      const denom=left-2*center+right;
      if(Math.abs(denom)>1e-7)tau+=Math.max(-1,Math.min(1,(left-right)/(2*denom)));
    }
    const hz=sampleRate/tau;
    if(!Number.isFinite(hz)||hz<minHz||hz>maxHz)return {hz:null,rms,clarity:0};
    return {hz,rms,clarity:Math.max(0,Math.min(1,1-cmnd[selected]))};
  }
  return {detectPitch};
});

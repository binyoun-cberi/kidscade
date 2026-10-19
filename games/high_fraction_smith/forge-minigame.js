(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.FractionSmithForge=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function create(){return {stage:'heat',pumps:0,hits:0,accuracy:0,quality:0,done:false}}
  function act(session,timing=.5){
    if(session.done)return session;
    if(session.stage==='heat'){
      session.pumps++;
      if(session.pumps>=4)session.stage='hammer';
    }else if(session.stage==='hammer'){
      // A moving mark at 0.75 is the centre of the hammer's sweet spot.
      const closeness=Math.max(0,1-Math.abs(timing-.75)/.30);
      session.accuracy+=closeness;
      session.hits++;
      if(session.hits>=3)session.stage='quench';
    }else if(session.stage==='quench'){
      session.stage='done';session.done=true;
      session.quality=Math.round(60+40*session.accuracy/3);
    }
    return session;
  }
  return {create,act};
});

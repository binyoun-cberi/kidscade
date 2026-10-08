/* Pure scoring and responsive layout rules for Hanja Sichuan. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.HanjaSichuanRules=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const COSTS=Object.freeze({wrong:25,hint:80,shuffle:120});
  function score(points,penalties){
    return Math.max(0,Math.round(Number(points)||0)-Math.max(0,Math.round(Number(penalties)||0)));
  }
  function rewards({clear,wrong,hints,shuffles,mode,secondsLeft}){
    if(!clear)return Object.freeze({time:0,accuracy:0,independent:0,total:0,perfect:false});
    const perfect=wrong===0&&hints===0&&shuffles===0;
    const time=mode==='timed'?Math.max(0,Math.floor(secondsLeft||0))*3:0;
    const accuracy=perfect?300:0;
    const independent=hints===0?100:0;
    return Object.freeze({time,accuracy,independent,total:time+accuracy+independent,perfect});
  }
  function tileSize({viewportWidth,viewportHeight=1080,boardWidth,cols,zoomed=false}){
    const view=Math.max(240,Math.min(
      Number(boardWidth)||Math.max(240,(Number(viewportWidth)||375)-30),
      Math.max(240,(Number(viewportWidth)||375)-16)
    ));
    const mobile=(Number(viewportWidth)||375)<=640;
    if(!mobile){
      const desired={4:114,6:100,8:84,10:72}[cols]||72;
      const height=Number(viewportHeight)||1080;
      const heightLimit=height<=880?88:height<=1024?103:desired;
      return Math.max(52,Math.min(desired,heightLimit,Math.floor((view-10)/(cols+1.08))));
    }
    if(zoomed)return 68;
    return Math.max(24,Math.min(72,Math.floor((view-5)/(cols+1.08))));
  }
  const TUTORIAL_REQUIRED=2;
  function tutorialState(value){
    const numeric=Number(value);
    const clears=Number.isFinite(numeric)?Math.min(TUTORIAL_REQUIRED,Math.max(0,Math.trunc(numeric))):0;
    return Object.freeze({clears,required:TUTORIAL_REQUIRED,completed:clears>=TUTORIAL_REQUIRED,nextDifficulty:clears>=TUTORIAL_REQUIRED?'easy':'start'});
  }
  function tutorialAfterGame(value,{clear=false,difficulty=''}={}){
    const previous=tutorialState(value);
    const advanced=Boolean(clear&&difficulty==='start'&&!previous.completed);
    const next=tutorialState(previous.clears+(advanced?1:0));
    return Object.freeze({...next,advanced});
  }
  return Object.freeze({COSTS,score,rewards,tileSize,TUTORIAL_REQUIRED,tutorialState,tutorialAfterGame});
});

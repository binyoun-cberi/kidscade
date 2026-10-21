(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.FractionSmithForge=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const level=v=>Number.isSafeInteger(v)?Math.min(2,Math.max(0,v)):0;
  function hitFeedback(timing,timingWindow,center=.75){
    const gap=Math.abs(timing-center);
    const accuracy=Math.max(0,1-gap/timingWindow);
    return {grade:gap<=.065?'perfect':gap<=timingWindow/2?'good':'miss',accuracy};
  }
  function qualityRank(quality){
    if(quality>=95)return {id:'masterpiece',label:'명품',icon:'🌟',goldBonus:20};
    if(quality>=80)return {id:'fine',label:'우수',icon:'✨',goldBonus:10};
    return {id:'standard',label:'튼튼한',icon:'⚒️',goldBonus:0};
  }
  function create(options={}){
    const basePumps=Number.isSafeInteger(options.basePumps)?Math.max(2,Math.min(5,options.basePumps)):4;
    const requiredHits=Number.isSafeInteger(options.hammerCount)?Math.max(1,Math.min(3,options.hammerCount)):3;
    const techniques={draw:{center:.74,duration:1500},fit:{center:.55,duration:1650},spread:{center:.60,duration:1850},bend:{center:.42,duration:1750},flatten:{center:.50,duration:1900},point:{center:.83,duration:1200},curve:{center:.40,duration:1800},square:{center:.65,duration:1500},ornament:{center:.72,duration:2100}};
    const technique=techniques[options.technique]||{center:.75,duration:1500};
    return {stage:'heat',pumps:0,requiredPumps:Math.max(1,basePumps-level(options.furnaceLevel)),requiredHits,hits:0,hitGrades:[],
      timingWindow:.30+level(options.hammerLevel)*.08,timingCenter:technique.center,hammerDuration:technique.duration,technique:options.technique||'standard',accuracy:0,lastHit:null,quality:0,done:false};
  }
  function act(session,timing=.5){
    if(session.done)return session;
    if(session.stage==='heat'){
      session.pumps++;
      if(session.pumps>=session.requiredPumps)session.stage='hammer';
    }else if(session.stage==='hammer'){
      // A moving mark at 0.75 is the centre of the hammer's sweet spot.
      session.lastHit=hitFeedback(timing,session.timingWindow,session.timingCenter);
      session.accuracy+=session.lastHit.accuracy;
      session.hitGrades.push(session.lastHit.grade);
      session.hits++;
      if(session.hits>=session.requiredHits)session.stage='quench';
    }else if(session.stage==='quench'){
      session.stage='done';session.done=true;
      session.quality=Math.round(60+40*session.accuracy/session.requiredHits);
    }
    return session;
  }
  return {create,act,hitFeedback,qualityRank};
});

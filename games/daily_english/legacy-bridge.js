// Keep old World Language Arcade progress intact while sharing its English mastery.
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.DailyEnglishLegacy=api;})(typeof window==='undefined'?null:window,()=>{
  'use strict';
  const KEY='languageArcadeLearningV2',INTERVALS=[0,1,3,7,14,30];
  const safeObject=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
  function read(storage){try{return safeObject(JSON.parse(storage.getItem(KEY)||'null'));}catch(_){return {};}}
  function summary(storage,now=Date.now()){
    const p=read(storage),c=safeObject(safeObject(p.courses).en),items=safeObject(p.items);
    const known=Object.entries(items).filter(([key,v])=>/^eng(?:Words|Sentences):\d+$/.test(key)&&v&&Number(v.seen)>0);
    return {xp:Math.max(0,Number(c.xp)||0),finished:Object.values(safeObject(c.lessons)).filter(x=>x?.complete).length,known:known.length,due:known.filter(([,v])=>Number(v.dueAt)<=now).length,keys:known.map(([key])=>key),dueKeys:known.filter(([,v])=>Number(v.dueAt)<=now).sort((a,b)=>(Number(a[1].mastery)||0)-(Number(b[1].mastery)||0)).map(([key])=>key)};
  }
  function record(storage,key,correct,now=Date.now()){
    if(!/^eng(?:Words|Sentences):\d+$/.test(key))return false;
    try{
      const p=read(storage);p.items=safeObject(p.items);
      const s=safeObject(p.items[key]);
      s.mastery=Math.max(0,Math.min(5,Number(s.mastery)||0));s.streak=Math.max(0,Number(s.streak)||0);
      s.wrong=Math.max(0,Number(s.wrong)||0);s.seen=Math.max(0,Number(s.seen)||0)+1;
      if(correct){s.streak++;s.mastery=Math.min(5,s.mastery+1);s.dueAt=now+INTERVALS[Math.max(1,Math.min(5,Math.floor(s.mastery)))]*86400000;}
      else{s.streak=0;s.wrong++;s.mastery=Math.max(0,s.mastery-1);s.dueAt=now+10*60000;}
      p.items[key]=s;storage.setItem(KEY,JSON.stringify(p));return true;
    }catch(_){return false;}
  }
  return {KEY,read,summary,record};
});

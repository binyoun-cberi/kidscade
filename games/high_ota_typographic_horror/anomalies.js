/* O T A — the Eraser and the Misreader. Each has a legible, avoidable rule.
 * They never spawn inside a player or teleport through solid world geometry. */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.OtaAnomalies=api;
})(typeof window!=='undefined'?window:undefined,function(){
  'use strict';
  const HOME=Object.freeze({eraser:{x:-1.4,z:-47.6},misreader:{x:1.4,z:-52.2}});
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  function create(seed=1){
    return {seed:seed>>>0,time:0,active:null,phase:'dormant',phaseTime:0,
      cooldown:0,nextKind:(seed&1)?'misreader':'eraser',warning:null,
      eraser:{...HOME.eraser,danger:0},misreader:{...HOME.misreader,focus:0},
      wrongs:0,encounters:0};
  }
  function begin(s,kind){
    if(s.active||s.cooldown>0)return false;
    s.active=kind;s.phase='warning';s.phaseTime=0;s.warning=kind;
    s.encounters++;
    Object.assign(s[kind],HOME[kind]);
    s.eraser.danger=0;s.misreader.focus=0;
    return true;
  }
  function wrongAnswer(s){
    s.wrongs++;
    if(s.time>8&&s.wrongs>=2)begin(s,'misreader');
  }
  function moveToward(subject,target,dt,speed,passable){
    const dx=target.x-subject.x,dz=target.z-subject.z,d=Math.hypot(dx,dz);
    if(d<.05)return;
    const step=Math.min(d,dt*speed),x=subject.x+dx/d*step,z=subject.z+dz/d*step;
    if(passable(x,z)){subject.x=x;subject.z=z;return;}
    if(passable(x,subject.z))subject.x=x;
    if(passable(subject.x,z))subject.z=z;
  }
  function step(s,dt,p,env){
    dt=clamp(Number(dt)||0,0,.1);
    if(env.stage!=='explore')return {caught:false,kind:null,phase:'dormant',distance:Infinity,erasing:false};
    s.time+=dt;s.cooldown=Math.max(0,s.cooldown-dt);
    if(!s.active&&s.time>32+s.encounters*38&&s.cooldown===0){
      begin(s,s.nextKind);
      s.nextKind=s.nextKind==='eraser'?'misreader':'eraser';
    }
    if(!s.active)return {caught:false,kind:null,phase:s.phase,distance:Infinity,erasing:false};
    s.phaseTime+=dt;
    const kind=s.active,monster=s[kind];
    if(s.phase==='warning'){
      if(s.phaseTime>=3){s.phase='stalking';s.phaseTime=0;s.warning=null;}
      return {caught:false,kind,phase:s.phase,distance:dist(monster,p),erasing:false,warning:kind};
    }
    if(s.phaseTime>=28){
      s.active=null;s.phase='dormant';s.cooldown=16;s.phaseTime=0;
      s.eraser.danger=0;s.misreader.focus=0;
      return {caught:false,kind:null,phase:'dormant',distance:Infinity,erasing:false};
    }
    const d=dist(monster,p),safe=Boolean(env.hidden);
    const passable=typeof env.passable==='function'?env.passable:()=>true;
    const target=(d<10&&!safe)?p:{
      x:HOME[kind].x+Math.sin(s.time*.35+(kind==='eraser'?0:2))*2.3,
      z:HOME[kind].z+Math.cos(s.time*.25+(kind==='eraser'?0:2))*4.1
    };
    const ward=kind==='eraser'&&env.lightOn===true;
    // The Misreader keeps an uneasy reading distance; it does not overlap the
    // player's camera and make the gaze rule impossible to understand.
    if(kind!=='misreader'||d>3.1||safe)
      moveToward(monster,target,dt,ward?.62:(kind==='eraser'?1.64:1.96),passable);
    const distance=dist(monster,p);
    if(kind==='eraser'){
      const erasing=!ward&&distance<4.5;
      monster.danger=clamp(monster.danger+(erasing&&distance<2.05&&!safe?27:-36)*dt,0,100);
      return {caught:monster.danger>=100,kind,phase:s.phase,distance,erasing,pressure:monster.danger};
    }
    const vx=(monster.x-p.x)/Math.max(.01,distance),vz=(monster.z-p.z)/Math.max(.01,distance);
    const looking=(-Math.sin(p.yaw||0)*vx-Math.cos(p.yaw||0)*vz)>.79
      &&Math.abs(p.pitch||0)<.55&&distance<7;
    monster.focus=clamp(monster.focus+(!safe&&looking?32:-43)*dt,0,100);
    return {caught:monster.focus>=100,kind,phase:s.phase,distance,looking,
      erasing:false,pressure:monster.focus,misreading:looking&&distance<8};
  }
  return Object.freeze({HOME,create,begin,wrongAnswer,step});
});

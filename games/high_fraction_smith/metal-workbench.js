(function(root,factory){
  const E=typeof module==='object'&&module.exports?require('./fraction-engine.js'):root.FractionSmithMath;
  const api=factory(E);
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.FractionSmithMetal=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(E){
  'use strict';
  const CUTS=[{parts:2,at:1,label:'반으로'},{parts:3,at:1,label:'3등분'},{parts:4,at:1,label:'4등분'}];
  function cut(value,parts=2,at=1){
    if(![2,3,4].includes(parts)||!Number.isSafeInteger(at)||at<=0||at>=parts)
      return {ok:false,reason:'invalid-cut'};
    const a=E.make(value.n*at,value.d*parts);
    const b=E.make(value.n*(parts-at),value.d*parts);
    if(!E.nice(a,{maxAbs:8,maxDen:40,allowZero:false})||!E.nice(b,{maxAbs:8,maxDen:40,allowZero:false}))
      return {ok:false,reason:'too-small'};
    return {ok:true,left:a,right:b,original:E.make(value.n,value.d),parts,at};
  }
  function bar(value){
    const n=Math.max(0,value.n),d=value.d,whole=Math.floor(n/d),partial=n%d;
    const bars=[];
    for(let i=0;i<Math.min(whole,4);i++)bars.push({filled:100,segments:1,label:'1'});
    if(partial||bars.length===0)bars.push({filled:Math.round(partial/d*100),segments:Math.min(d,20),label:partial+'/'+d});
    return {bars,over:Math.max(0,whole-4),numeric:n/d};
  }
  function markup(value){
    const result=bar(value);
    return '<span class="metal-bars" aria-hidden="true">'+result.bars.map(unit=>
      '<span class="metal-unit" style="--divisions:'+unit.segments+'">'+
      '<span class="metal-filled" style="width:'+unit.filled+'%"></span></span>'
    ).join('')+(result.over?'<small>+'+result.over+'</small>':'')+'</span>';
  }
  return {CUTS,cut,bar,markup};
});

/* Ota — writing redefines actual authored surfaces, never the whole collision grid.
 * Pure state and geometry: input must name an existing writable object. */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.OtaRewrite=api;
})(typeof window!=='undefined'?window:undefined,function(){
  'use strict';
  const WALL=Object.freeze({id:'wall',name:'벽',x:-3.38,z:-52.0,
    halfWidth:1.16,reach:2.9});
  const LIGHT=Object.freeze({id:'ceiling',name:'천장',x:0,z:-43.7,reach:2.65});
  const GAP=Object.freeze({minX:-4.31,maxX:-3.015,minZ:-53.13,maxZ:-50.87});
  function create(){return {doorMade:false,doorOpen:false,lightOn:false,changes:0};}
  const normalize=word=>String(word||'').trim().replace(/\s/g,'');
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
  function target(s,p){
    if(!p||!s)return null;
    const wall=Math.abs(p.x-WALL.x)<WALL.reach&&
      Math.abs(p.z-WALL.z)<1.28 && Math.sin(p.yaw||0)>.24;
    if(wall)return {id:'wall',label:s.doorMade?'문에 이름 쓰기 · 열고 닫기':'벽에 새 이름 쓰기'};
    const ceiling=distance(p,LIGHT)<LIGHT.reach&&(p.pitch||0)>.21;
    if(ceiling)return {id:'ceiling',label:s.lightOn?'조명에 이름 쓰기 · 끄기':'천장에 이름 쓰기'};
    return null;
  }
  function write(s,site,word,p){
    const value=normalize(word);
    if(!s||!['wall','ceiling'].includes(site))return {ok:false,reason:'target'};
    if(site==='wall'){
      if(value!=='문'&&value!=='벽')return {ok:false,reason:'word'};
      if(value==='벽'&&s.doorMade&&withinGap(p))
        return {ok:false,reason:'occupied'};
      s.doorMade=value==='문';s.doorOpen=value==='문';
      s.changes++;return {ok:true,kind:value,action:value==='문'?'formed':'restored'};
    }
    if(value!=='조명'&&value!=='천장')return {ok:false,reason:'word'};
    s.lightOn=value==='조명';s.changes++;
    return {ok:true,kind:value,action:s.lightOn?'lit':'dark'};
  }
  function withinGap(p){
    return Boolean(p&&p.x>=GAP.minX-.23&&p.x<=GAP.maxX+.23&&
      p.z>=GAP.minZ-.15&&p.z<=GAP.maxZ+.15);
  }
  function toggleDoor(s,p){
    if(!s||!s.doorMade)return {ok:false,reason:'absent'};
    if(s.doorOpen&&withinGap(p))return {ok:false,reason:'occupied'};
    s.doorOpen=!s.doorOpen;s.changes++;
    return {ok:true,open:s.doorOpen};
  }
  function canMove(s,x,z,ordinaryMove){
    // All geometry except the hand-authored slot remains governed by Chapter 3.
    const inside=z>GAP.minZ&&z<GAP.maxZ&&x>GAP.minX&&x<GAP.maxX;
    if(!inside)return ordinaryMove(x,z);
    if(!s?.doorMade||!s.doorOpen)return false;
    return true;
  }
  function checkpoint(s){return {v:1,doorMade:!!s.doorMade,doorOpen:!!s.doorOpen,
    lightOn:!!s.lightOn,changes:s.changes||0};}
  function restore(s,data){
    Object.assign(s,create());
    if(!data||data.v!==1)return false;
    s.doorMade=!!data.doorMade;
    s.doorOpen=s.doorMade&&!!data.doorOpen;
    s.lightOn=!!data.lightOn;
    s.changes=Math.min(999,Math.max(0,Number(data.changes)||0));
    return true;
  }
  return Object.freeze({WALL,LIGHT,GAP,create,normalize,target,write,withinGap,
    toggleDoor,canMove,checkpoint,restore});
});

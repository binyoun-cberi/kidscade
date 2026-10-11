/* Ota — word architecture. Pure geometry metadata, no browser or Three.js dependencies.
 * Words explain real collidable surfaces. Walkable doorways remain open in the collision rules. */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.OtaSurfaces=api;
})(typeof window!=='undefined'?window:undefined,function(){
  'use strict';
  const surfaces=[];
  const portals=[];
  const mistakes=[];
  const freeze=o=>Object.freeze(o);
  const area=(kind,id,x,y,z,w,h,rx=0,ry=0,extra={})=>{
    surfaces.push(freeze({kind,id,x,y,z,w,h,rx,ry,...extra}));
  };
  // Floor and ceiling are true horizontal planes, matching existing black solids.
  const slab=(name,x,z,w,depth)=>{
    area('floor',name+'-floor',x,.011,z,w,depth,-Math.PI/2,0);
    area('ceiling',name+'-ceiling',x,3.174,z,w,depth,Math.PI/2,0);
  };
  const wallX=(name,x,z,length,extra={})=>
    area('wall',name,x,1.63,z,length,3.05,0,x<0?Math.PI/2:-Math.PI/2,extra);
  const wallZ=(name,x,z,length,extra={})=>
    area('wall',name,x,1.63,z,length,3.05,0,0,extra);
  slab('entry-hall',0,-15.25,6.7,44.35);
  slab('records-hall',0,-52.47,6.7,29.9);
  slab('office',-9.35,-47.2,12.05,16.4);
  slab('archive',9.35,-47.2,12.05,16.4);
  wallX('first-left',-3.255,-15.25,44.3);
  wallX('first-right',3.255,-15.25,44.3);
  for(const side of [-1,1]){
    const x=side*3.255;
    wallX((side<0?'left':'right')+'-entrance',x,-40.9,6.7);
    wallX((side<0?'left':'right')+'-lower',x,-58.55,18.1);
    wallX((side<0?'office':'archive')+'-outside',side*15.385,-47.2,16.4);
    wallZ((side<0?'office':'archive')+'-front',side*9.38,-38.97,11.8);
    wallZ((side<0?'office':'archive')+'-back',side*9.38,-55.42,11.8);
  }
  wallX('office-separator-upper',-10.875,-43.24,7.35);
  wallX('office-separator-lower',-10.875,-52.85,5.25);
  wallZ('start-end',0,6.924,6.6);
  wallZ('final-end',0,-67.42,6.6);
  // Real voids at the two side entrances are framed by repeated "문" glyphs.
  function sideDoor(name,x){
    const ry=x<0?Math.PI/2:-Math.PI/2;
    for(const [n,z] of [['start',-44.29],['end',-49.10]])
      portals.push(freeze({id:name+'-'+n,kind:'door',x,y:1.55,z,w:.66,h:2.6,rx:0,ry}));
    portals.push(freeze({id:name+'-lintel',kind:'door',x,y:2.95,z:-46.7,w:4.38,h:.42,rx:0,ry}));
  }
  sideDoor('office-portal',-3.235);
  sideDoor('archive-portal',3.235);
  // Opening text only appears AFTER puzzle leaves are removed from collision.
  function solvedGate(name,z,gate){
    for(const [n,x] of [['left',-1.27],['right',1.27]])
      portals.push(freeze({id:name+'-'+n,kind:'door',x,y:1.48,z,
        w:.45,h:2.40,rx:0,ry:0,when:gate}));
    portals.push(freeze({id:name+'-top',kind:'door',x:0,y:2.88,z,
      w:2.56,h:.38,rx:0,ry:0,when:gate}));
  }
  solvedGate('repaired-door',-30.04,'doorFixed');
  solvedGate('final-door',-58.54,'finalFixed');
  // A few wrong surface names, not an entire red room. Puzzle labels stay clean.
  for(const entry of [
    ['wall-01','wall','볏',-3.215,1.6,-9,0,Math.PI/2],
    ['wall-02','wall','벅',3.215,1.8,-22,0,-Math.PI/2],
    ['door-01','door','뭄',3.215,1.45,-46.7,0,-Math.PI/2],
    ['wall-03','wall','병',-3.215,1.5,-43.5,0,Math.PI/2],
    ['wall-04','wall','벽?',3.215,1.9,-60.3,0,-Math.PI/2],
    ['ceiling-01','ceiling','조멍',0,3.135,-13.6,Math.PI/2,0],
    ['ceiling-02','ceiling','전장',1.5,3.135,-52.0,Math.PI/2,0],
    ['floor-01','floor','바닦',-1.3,.029,-33.5,-Math.PI/2,0]
  ]){
    const [id,kind,wrong,x,y,z,rx,ry]=entry;
    mistakes.push(freeze({id,kind,wrong,x,y,z,rx,ry}));
  }
  function nearestDistance(s,p){
    const dx=Math.abs(p.x-s.x),dz=Math.abs(p.z-s.z);
    if(s.kind==='floor'||s.kind==='ceiling'){
      return Math.hypot(Math.max(0,dx-s.w/2),Math.max(0,dz-s.h/2));
    }
    if(s.ry!==0)return Math.hypot(dx,Math.max(0,dz-s.w/2));
    return Math.hypot(Math.max(0,dx-s.w/2),dz);
  }
  function visibility(s,p){
    const d=nearestDistance(s,p);
    const near=(s.kind==='floor'||s.kind==='ceiling')?1:Math.min(1,Math.max(0,(d-.34)/.52));
    const far=Math.min(1,Math.max(0,(13.5-d)/4.5));
    return near*far;
  }
  return freeze({
    surfaces:freeze(surfaces),portals:freeze(portals),mistakes:freeze(mistakes),
    nearestDistance,visibility
  });
});

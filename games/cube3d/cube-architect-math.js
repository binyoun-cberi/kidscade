/* Cuboid Mathematics · 2022 curriculum, elementary grades 5–6.
 * Pure geometry calculations: no browser or Three.js dependency.
 */
(()=>{
'use strict';
function dimensions(raw){
  if(!Array.isArray(raw)||raw.length!==3)return null;
  const d=raw.map(Number);
  return d.every(n=>Number.isInteger(n)&&n>=1&&n<=64)?d:null;
}
function measurements(raw){
  const d=dimensions(raw);if(!d)return null;
  const [w,h,z]=d;
  return {dimensions:d,volume:w*h*z,area:2*(w*h+w*z+h*z),
    pairs:[[w,h],[w,z],[h,z]],faceAreas:[h*z,h*z,w*z,w*z,w*h,w*h]};
}
function visibleUnitFaces(points){
  const set=new Set(points.map(([x,y,z])=>x+','+y+','+z));
  let faces=0;
  for(const [x,y,z] of points)
    for(const [dx,dy,dz] of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]])
      if(!set.has((x+dx)+','+(y+dy)+','+(z+dz)))faces++;
  return faces;
}
function layeredCounts(points){
  const result=new Map();
  for(const [x,y,z] of points)result.set(y,(result.get(y)||0)+1);
  return [...result].sort((a,b)=>a[0]-b[0]).map(([height,count])=>({height:height+1,count}));
}
function projectionCounts(points){
  return {top:new Set(points.map(([x,,z])=>x+','+z)).size,
    front:new Set(points.map(([x,y])=>x+','+y)).size,
    side:new Set(points.map(([,y,z])=>z+','+y)).size};
}
function unfoldedLayout(layout){
  if(!Array.isArray(layout)||layout.length!==6)return {valid:false,reason:'six'};
  const lookup=new Map();
  for(let i=0;i<layout.length;i++){
    const [x,y]=layout[i];if(!Number.isInteger(x)||!Number.isInteger(y)||lookup.has(x+','+y))
      return {valid:false,reason:'duplicate'};
    lookup.set(x+','+y,i);
  }
  const neg=a=>a.map(n=>-n);
  const axis=new Array(6);
  axis[0]={right:[1,0,0],down:[0,1,0],normal:[0,0,1]};
  const queue=[0],hinges=[],errors=[];
  while(queue.length){
    const i=queue.shift(),parent=axis[i],from=layout[i];
    for(const [dx,dy,side] of [[1,0,'right'],[-1,0,'left'],[0,1,'down'],[0,-1,'up']]){
      const j=lookup.get((from[0]+dx)+','+(from[1]+dy));
      if(j===undefined)continue;
      const next=side==='right'?{right:neg(parent.normal),down:parent.down,normal:parent.right}:
        side==='left'?{right:parent.normal,down:parent.down,normal:neg(parent.right)}:
        side==='down'?{right:parent.right,down:neg(parent.normal),normal:parent.down}:
        {right:parent.right,down:parent.normal,normal:neg(parent.down)};
      if(!axis[j]){axis[j]=next;hinges.push({parent:i,child:j,dx,dy,side});queue.push(j)}
      else if(axis[j].normal.join()!=next.normal.join()||axis[j].right.join()!=next.right.join())
        errors.push('orientation');
    }
  }
  const normals=axis.filter(Boolean).map(a=>a.normal.join());
  return {valid:axis.every(Boolean)&&new Set(normals).size===6&&!errors.length,
    hinges,normals,reason:errors.length?'overlap':axis.some(a=>!a)?'disconnected':'ok'};
}
const api=Object.freeze({measurements,visibleUnitFaces,layeredCounts,projectionCounts,unfoldedLayout});
if(typeof window!=='undefined')window.CubeArchitectMath=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();

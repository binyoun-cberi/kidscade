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
  const faces=axis.filter(Boolean),normals=faces.map(a=>a.normal.join());
  const connected=faces.length===6;
  return {valid:connected&&new Set(normals).size===6&&!errors.length,
    hinges,normals,reason:!connected?'disconnected':errors.length?'overlap':new Set(normals).size!==6?'overlap':'ok'};
}
/* Compare shapes with exactly the same volume; count all 6 exterior faces,
 * including the underside (a closed painted model, not an open building).
 */
function equalVolumeAlternative(raw,maximum=12){
  const current=measurements(raw);if(!current)return null;
  const candidates=[];
  for(let a=1;a<=maximum;a++)for(let b=a;b<=maximum;b++){
    const c=current.volume/(a*b);
    if(!Number.isInteger(c)||c<b||c>maximum)continue;
    const alt=measurements([a,b,c]);
    if(alt.area!==current.area)candidates.push(alt);
  }
  candidates.sort((a,b)=>{
    const compactA=Math.max(...a.dimensions)<=6?0:1;
    const compactB=Math.max(...b.dimensions)<=6?0:1;
    return compactA-compactB||Math.abs(a.area-current.area)-Math.abs(b.area-current.area)||
      Math.max(...a.dimensions)-Math.max(...b.dimensions);
  });
  return candidates[0]||null;
}
const DRAFT_GRID_SIZE=6;
function draftPlace(layout,index,x,y){
  if(!Array.isArray(layout)||layout.length!==6||!Number.isInteger(index)||index<0||index>5||
    !Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||
    x>=DRAFT_GRID_SIZE||y>=DRAFT_GRID_SIZE)return null;
  const next=layout.map(p=>Array.isArray(p)?p.slice():null);
  for(let i=0;i<next.length;i++)if(i!==index&&next[i]&&next[i][0]===x&&next[i][1]===y)return null;
  next[index]=[x,y];return next;
}
function draftReport(layout){
  if(!Array.isArray(layout)||layout.length!==6)return {placed:0,valid:false,reason:'six'};
  const placed=layout.filter(v=>Array.isArray(v)).length;
  if(placed!==6)return {placed,valid:false,reason:'incomplete'};
  return {placed,...unfoldedLayout(layout)};
}
const api=Object.freeze({measurements,visibleUnitFaces,layeredCounts,projectionCounts,unfoldedLayout,equalVolumeAlternative,draftPlace,draftReport,DRAFT_GRID_SIZE});
if(typeof window!=='undefined')window.CubeArchitectMath=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();

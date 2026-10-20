// A single swipe can cover several rows, but each row still receives a separate
// walking / tool-contact animation in the game flow.
export function sampleStroke(points,step=18){
  if(!Array.isArray(points)||points.length<2)return points||[];
  const sampled=[points[0]];
  for(let i=1;i<points.length&&sampled.length<160;i++){
    const a=points[i-1],b=points[i];
    const d=Math.hypot(b.x-a.x,b.y-a.y),count=Math.min(32,Math.max(1,Math.ceil(d/step)));
    for(let j=1;j<=count&&sampled.length<160;j++){
      sampled.push({x:a.x+(b.x-a.x)*j/count,y:a.y+(b.y-a.y)*j/count});
    }
  }
  return sampled;
}
export function uniqueStrokeTargets(targets){
  const seen=new Set();
  return targets.filter(index=>Number.isInteger(index)&&index>=0&&!seen.has(index)&&Boolean(seen.add(index)));
}

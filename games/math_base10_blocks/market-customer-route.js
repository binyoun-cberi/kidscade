
// Grid routes stay inside the store and avoid shelves and the register.
export function retailPath(from,to,obstacles,step=.25){
 const points=[],index=new Map();for(let z=-4;z<=4.001;z+=step)for(let x=-4.5;x<=4.501;x+=step){
  if(obstacles.some(b=>Math.abs(x-b.x)<b.w/2+.19&&Math.abs(z-b.z)<b.d/2+.19))continue;
  index.set(Math.round(x/step)+','+Math.round(z/step),points.length);points.push([x,z]);
 }
 if(!points.length)return null;
 const closest=q=>points.reduce((best,p,i)=>Math.hypot(p[0]-q[0],p[1]-q[1])<Math.hypot(points[best][0]-q[0],points[best][1]-q[1])?i:best,0);
 const start=closest(from),end=closest(to),queue=[start],parent=new Map([[start,-1]]);
 for(let h=0;h<queue.length&&!parent.has(end);h++){
  const cur=queue[h],[x,z]=points[cur];
  for(const [dx,dz]of [[step,0],[-step,0],[0,step],[0,-step]]){
   const n=index.get(Math.round((x+dx)/step)+','+Math.round((z+dz)/step));
   if(n===undefined||parent.has(n))continue;parent.set(n,cur);queue.push(n);
  }
 }
 if(!parent.has(end))return null;
 const path=[];for(let cur=end;cur!==-1;cur=parent.get(cur))path.push(points[cur]);return path.reverse();
}

// Camera-relative, frame-rate-independent third-person controls.
// Three.js free: unit tests can verify exactly which way the farmer faces.
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
export const MOVE_SPEED=4.7;
export const TURN_SPEED=11;
export const LOOK_SPEED=7;

export function cameraRelativeInput(keys,stick,viewAngle){
  const pressed=key=>keys.has(key);
  let horizontal=(pressed('d')||pressed('arrowright')?1:0)-
      (pressed('a')||pressed('arrowleft')?1:0)+(Number(stick?.x)||0);
  let vertical=(pressed('s')||pressed('arrowdown')?1:0)-
      (pressed('w')||pressed('arrowup')?1:0)+(Number(stick?.y)||0);
  const mag=Math.hypot(horizontal,vertical);
  if(mag<.05)return {x:0,z:0,active:false};
  const strength=Math.min(1,mag);
  horizontal/=mag;vertical/=mag;
  const angle=Number.isFinite(viewAngle)?viewAngle:0;
  return {x:(horizontal*Math.cos(angle)+vertical*Math.sin(angle))*strength,
    z:(-horizontal*Math.sin(angle)+vertical*Math.cos(angle))*strength,active:true};
}
// The farmer's eyes and toes face LOCAL -Z. In Three.js a positive Y rotation
// sends local -Z toward WORLD -X (not +X). The old sign was reversed, which
// made the character appear to moonwalk whenever walking sideways.
export function farmerHeading(x,z){return Math.atan2(-x,-z)}
export function facingDirection(yaw){
  return {x:-Math.sin(yaw),z:-Math.cos(yaw)};
}
export function headingDifference(current,target){
  return Math.atan2(Math.sin(target-current),Math.cos(target-current));
}
export function shouldTurnBeforeWalk(current,target,maxError=.25){
  return Math.abs(headingDifference(current,target))>maxError;
}
export function rotateToward(current,target,dt,speed=TURN_SPEED){
  if(!Number.isFinite(target))return current;
  const delta=headingDifference(current,target);
  return current+delta*(1-Math.exp(-speed*clamp(dt,0,.20)));
}
export function walkPlayer(position,direction,dt,{goalDistance=null,bounds=21.7,obstacles=[],speedMultiplier=1}={}){
  const mag=Math.hypot(direction.x,direction.z);
  if(mag<.05)return {x:position.x,z:position.z,moving:false,blocked:false};
  const dist=Math.min(goalDistance===null?Infinity:goalDistance,MOVE_SPEED*clamp(dt,0,.20)*Math.min(1,mag)*clamp(speedMultiplier,.1,1));
  const sx=direction.x/mag*dist,sz=direction.z/mag*dist;
  const collides=(x,z)=>obstacles.some(o=>Math.abs(x-o.x)<o.w/2+.45&&Math.abs(z-o.z)<o.d/2+.45);
  let x=position.x,z=position.z;
  const testX=clamp(x+sx,-bounds,bounds);
  if(!collides(testX,z))x=testX;
  const testZ=clamp(z+sz,-bounds,bounds);
  if(!collides(x,testZ))z=testZ;
  const travelled=Math.hypot(x-position.x,z-position.z);
  return {x,z,moving:travelled>.001,blocked:travelled<dist*.15&&dist>.001};
}

// A straight line towards a station can run directly into the market or house.
// Route around the same padded rectangles used by walkPlayer instead of
// repeatedly walking into a wall. This is small enough to recompute per click.
function insideObstacle(point,obstacle,margin=.45){
  return Math.abs(point.x-obstacle.x)<obstacle.w/2+margin&&
    Math.abs(point.z-obstacle.z)<obstacle.d/2+margin;
}
function clearSegment(from,to,obstacles,margin=.45){
  for(const obstacle of obstacles){
    const ranges=[
      [obstacle.x-obstacle.w/2-margin,obstacle.x+obstacle.w/2+margin,'x'],
      [obstacle.z-obstacle.d/2-margin,obstacle.z+obstacle.d/2+margin,'z']
    ];
    let entry=0,exit=1,intersects=true;
    for(const [low,high,axis] of ranges){
      const delta=to[axis]-from[axis];
      if(Math.abs(delta)<1e-9){
        if(from[axis]<=low||from[axis]>=high){intersects=false;break}
        continue;
      }
      const a=(low-from[axis])/delta,b=(high-from[axis])/delta;
      entry=Math.max(entry,Math.min(a,b));exit=Math.min(exit,Math.max(a,b));
      if(entry>exit){intersects=false;break}
    }
    if(intersects&&entry<1&&exit>0)return false;
  }
  return true;
}
export function nearestWalkablePoint(point,obstacles=[],bounds=21.7){
  if(!obstacles.some(o=>insideObstacle(point,o)))return {...point};
  const options=[];
  for(const o of obstacles){
    if(!insideObstacle(point,o))continue;
    const dx=o.w/2+.61,dz=o.d/2+.61;
    options.push({x:o.x-dx,z:point.z},{x:o.x+dx,z:point.z},
      {x:point.x,z:o.z-dz},{x:point.x,z:o.z+dz});
  }
  return options.filter(p=>Math.abs(p.x)<=bounds&&Math.abs(p.z)<=bounds&&
    !obstacles.some(o=>insideObstacle(p,o)))
    .sort((a,b)=>Math.hypot(a.x-point.x,a.z-point.z)-Math.hypot(b.x-point.x,b.z-point.z))[0]||null;
}
export function planNavigationRoute(start,destination,obstacles=[],bounds=21.7){
  if(![start?.x,start?.z,destination?.x,destination?.z].every(Number.isFinite)||
     Math.abs(destination.x)>bounds||Math.abs(destination.z)>bounds||
     obstacles.some(o=>insideObstacle(destination,o)))return null;
  if(obstacles.some(o=>insideObstacle(start,o)))return null;
  const goal={x:destination.x,z:destination.z};
  if(clearSegment(start,goal,obstacles))return [goal];
  const corners=[];
  for(const o of obstacles){
    // Arrival switches to the next waypoint within .34 units, so the
    // clearance must exceed that turning radius as well as player padding.
    const dx=o.w/2+1.4,dz=o.d/2+1.4;
    for(const x of [o.x-dx,o.x+dx])for(const z of [o.z-dz,o.z+dz]){
      const p={x,z};
      if(Math.abs(x)<=bounds&&Math.abs(z)<=bounds&&
         !obstacles.some(other=>insideObstacle(p,other)))corners.push(p);
    }
  }
  const nodes=[{x:start.x,z:start.z},...corners,goal],end=nodes.length-1;
  const distance=Array(nodes.length).fill(Infinity),previous=Array(nodes.length).fill(-1);
  const visited=new Set();distance[0]=0;
  while(visited.size<nodes.length){
    let node=-1;
    for(let i=0;i<nodes.length;i++)if(!visited.has(i)&&
      (node<0||distance[i]<distance[node]))node=i;
    if(node<0||!Number.isFinite(distance[node])||node===end)break;
    visited.add(node);
    for(let i=1;i<nodes.length;i++){
      if(visited.has(i)||!clearSegment(nodes[node],nodes[i],obstacles))continue;
      const d=distance[node]+Math.hypot(nodes[node].x-nodes[i].x,nodes[node].z-nodes[i].z);
      if(d<distance[i]){distance[i]=d;previous[i]=node}
    }
  }
  if(!Number.isFinite(distance[end]))return null;
  const path=[];for(let i=end;i>0;i=previous[i]){
    if(i<0)return null;
    path.unshift({x:nodes[i].x,z:nodes[i].z});
  }
  return path;
}

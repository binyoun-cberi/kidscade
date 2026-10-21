// Village NPCs follow actual paths, pause at destinations, and never play
// walking animations while standing still. Independent of Three.js and DOM.
export const PASSER_PATHS=Object.freeze([
  Object.freeze([{x:-3.8,z:10.1},{x:-3.8,z:13.0},{x:-1.6,z:13.0},{x:-1.5,z:11.0},{x:-3.8,z:10.1}]),
  Object.freeze([{x:5.4,z:11.2},{x:5.9,z:12.3},{x:5.7,z:15.4},{x:3.8,z:15.4},{x:3.8,z:11.2},{x:5.4,z:11.2}])
]);
export function moveNPC(position,target,dt,speed=1){
  const x=target.x-position.x,z=target.z-position.z,length=Math.hypot(x,z);
  if(length<.035)return {x:target.x,z:target.z,moving:false,arrived:true,heading:position.heading??0,distance:0};
  const travelled=Math.min(length,Math.max(0,Math.min(.2,dt))*speed),k=travelled/length;
  return {x:position.x+x*k,z:position.z+z*k,moving:travelled>.00001,
    arrived:length-travelled<.035,heading:Math.atan2(-x,-z),distance:travelled};
}
export function createWaypointWalker(points,speed=1.08){
  const state={x:points[0].x,z:points[0].z,heading:0,index:1,rest:0,walking:false,distance:0};
  return {state,update(dt){
    if(state.rest>0){state.rest=Math.max(0,state.rest-dt);state.walking=false;return state}
    const step=moveNPC(state,points[state.index],dt,speed);
    state.x=step.x;state.z=step.z;state.heading=step.heading;
    state.distance+=step.distance;state.walking=step.moving;
    if(step.arrived){state.index=(state.index+1)%points.length;state.rest=1.3;state.walking=false}
    return state;
  }};
}
export function chorePose(gesture,t){
  const s=Math.sin(t*3.2);
  if(gesture==='sweep')return {left:-.7+s*.19,right:-.8-s*.22,lean:.12};
  if(gesture==='tend')return {left:-.35+s*.14,right:-.62-s*.17,lean:.20};
  if(gesture==='stock')return {left:-.42+s*.19,right:-.58-s*.16,lean:.08};
  if(gesture==='sell')return {left:.02,right:-.55+s*.13,lean:0};
  if(gesture==='wave')return {left:0,right:-1+s*.19,lean:0};
  return {left:0,right:-.09,lean:0};
}

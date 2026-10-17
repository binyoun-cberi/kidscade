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
export function farmerHeading(x,z){return Math.atan2(x,-z)}
export function rotateToward(current,target,dt,speed=TURN_SPEED){
  if(!Number.isFinite(target))return current;
  const delta=Math.atan2(Math.sin(target-current),Math.cos(target-current));
  return current+delta*(1-Math.exp(-speed*clamp(dt,0,.08)));
}
export function walkPlayer(position,direction,dt,{goalDistance=null,bounds=21.7,obstacles=[]}={}){
  const mag=Math.hypot(direction.x,direction.z);
  if(mag<.05)return {x:position.x,z:position.z,moving:false,blocked:false};
  const dist=Math.min(goalDistance===null?Infinity:goalDistance,MOVE_SPEED*clamp(dt,0,.08)*Math.min(1,mag));
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

// Time-dependent farm interactions: approach -> prepare -> tool contact -> recovery.
// This module never changes soil, crop inventory, or the player's save state.
import {distanceToPlot} from '../world.mjs';

export const ACTION_PHASES=Object.freeze(['approach','ready','animation','recovery']);
const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
export function actionApproachPoint(plot,position,margin=.92){
  const dx=position.x-plot.x,dz=position.z-plot.z;
  const hx=plot.w/2,hz=plot.d/2;
  // Prefer the closest side of the plot to the player, not its center.
  const borderX=Math.sign(dx||1)*(hx+margin),borderZ=Math.sign(dz||1)*(hz+margin);
  const diffX=Math.abs(dx)-(hx+margin),diffZ=Math.abs(dz)-(hz+margin);
  if(diffX>0&&diffZ>0)return {x:plot.x+borderX,z:plot.z+borderZ};
  if(diffX>0)return {x:plot.x+borderX,z:clamp(position.z,plot.z-hz,plot.z+hz)};
  if(diffZ>0)return {x:clamp(position.x,plot.x-hx,plot.x+hx),z:plot.z+borderZ};
  // Already inside field footprint; move to the nearest short side.
  if(hx-Math.abs(dx)<hz-Math.abs(dz))return {x:plot.x+borderX,z:clamp(position.z,plot.z-hz,plot.z+hz)};
  return {x:clamp(position.x,plot.x-hx,plot.x+hx),z:plot.z+borderZ};
}
export function actionContactPoint(plot,position){
  return {x:clamp(position.x,plot.x-plot.w/2+.1,plot.x+plot.w/2-.1),
    z:clamp(position.z,plot.z-plot.d/2+.1,plot.z+plot.d/2-.1)};
}
export function createFarmActionFlow({interactionDistance=1.65,walkTimeout=18}={}){
  let active=null;
  const report=(type,detail={})=>({type,...detail});
  const flow={
    get active(){return active?{...active,goal:{...active.goal}}:null},
    get busy(){return active!==null},
    request({action,plot,position}){
      if(active)return report('busy',{message:'지금 하던 작업을 마친 뒤 시도해 주세요.'});
      if(!plot||!position||!action)return report('invalid');
      const distance=distanceToPlot(position,plot),goal=actionApproachPoint(plot,position);
      active={fieldId:plot.id,action,phase:distance>interactionDistance?'approach':'ready',
        goal,elapsed:0,applied:false};
      return report('queued',{phase:active.phase,goal:{...goal},fieldId:plot.id});
    },
    tick(dt,position,{impact=false,working=false}={}){
      if(!active)return null;
      if(!Number.isFinite(dt)||dt<0)return null;
      const job=active;
      if(job.phase==='approach'){
        job.elapsed+=dt;
        if(job.elapsed>walkTimeout){active=null;return report('timeout',{fieldId:job.fieldId})}
        // Caller supplies current plot geometry; entering goal vicinity is
        // authoritative, not reaching the approximate center of the field.
        if(Math.hypot(position.x-job.goal.x,position.z-job.goal.z)>.38)return null;
        job.phase='ready';
      }
      if(job.phase==='ready'){
        job.phase='animation';job.elapsed=0;
        return report('start',{action:job.action,fieldId:job.fieldId});
      }
      if(job.phase==='animation'){
        if(impact&&!job.applied){
          job.applied=true;job.phase='recovery';
          return report('impact',{action:job.action,fieldId:job.fieldId});
        }
        return null;
      }
      if(job.phase==='recovery'&&!working){
        const completed=job;active=null;
        return report('complete',{action:completed.action,fieldId:completed.fieldId});
      }
      return null;
    },
    cancelApproach(){
      if(!active||active.phase!=='approach')return false;
      active=null;return true;
    },
    reset(){active=null}
  };
  return flow;
}

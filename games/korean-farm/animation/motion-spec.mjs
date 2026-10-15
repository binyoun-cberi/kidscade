// Pure, deterministic action poses. Rendering, skeletal meshes and assets are separate.
export const FARM_ACTION_MOTIONS=Object.freeze({
  till:{duration:1.1,tool:'hoe',impact:.48},
  plant:{duration:1.08,tool:'seed',impact:.58},
  water:{duration:1.28,tool:'can',impact:.36},
  gate:{duration:.95,tool:'lever',impact:.54},
  weed:{duration:.97,tool:'hand',impact:.56},
  fertilize:{duration:1.0,tool:'seed',impact:.52},
  harvest:{duration:1.18,tool:'basket',impact:.60}
});
const clamp=(v)=>Math.max(0,Math.min(1,Number.isFinite(v)?v:0));
export function motionPose(kind,progress=0,{moving=false,time=0}={}){
  const p=clamp(progress);
  const sway=Math.sin(time*8.5);
  const walk=moving?1:0;
  const base={bodyLean:.025*Math.sin(time*1.8),bodyTilt:0,bodyYaw:0,
    leftArm:.07+walk*sway*.48,rightArm:-.05-walk*sway*.48,
    leftElbow:-.15,rightElbow:-.13,leftLeg:-walk*sway*.45,rightLeg:walk*sway*.45,
    leftKnee:walk*Math.max(0,-sway)*.22,rightKnee:walk*Math.max(0,sway)*.22,
    crouch:0,headTilt:.025*Math.sin(time*1.3),toolTilt:0,
    working:false,tool:'none',impact:false};
  const def=FARM_ACTION_MOTIONS[kind];
  if(!def)return base;
  const bump=Math.sin(Math.PI*p);
  const stroke=Math.sin(Math.PI*2*p);
  const reach=Math.sin(Math.PI*Math.min(1,p*1.5));
  base.working=true;base.tool=def.tool;base.impact=p>=def.impact;
  base.leftLeg=0;base.rightLeg=0;base.leftKnee=0;base.rightKnee=0;
  if(kind==='till'){
    base.bodyLean=.14+.29*bump;
    base.leftArm=.32+stroke*.34;
    base.rightArm=.6+stroke*.67;
    base.leftElbow=-.6;base.rightElbow=-.32;
    base.crouch=.06+.1*bump;
    base.toolTilt=-.3+.8*stroke;
  }else if(kind==='plant'||kind==='weed'){
    base.bodyLean=.24+.39*bump;
    base.leftArm=.48+.48*reach;
    base.rightArm=.5+.65*reach;
    base.leftElbow=-.34;base.rightElbow=-.4;
    base.leftKnee=.34*bump;base.rightKnee=.58*bump;
    base.crouch=.28*bump;
    base.toolTilt=.12*stroke;
  }else if(kind==='water'){
    base.bodyLean=.08+.16*bump;
    base.leftArm=.2+.42*bump;
    base.rightArm=.55+.4*bump;
    base.rightElbow=-.55;
    base.toolTilt=.28+1.02*bump;
  }else if(kind==='gate'){
    base.bodyLean=.08+.25*bump;
    base.leftArm=.26;
    base.rightArm=.4+.93*bump;
    base.rightElbow=-.6;
    base.toolTilt=.25+.5*bump;
  }else if(kind==='fertilize'){
    base.bodyLean=.09+.3*bump;
    base.leftArm=.4+.35*bump;
    base.rightArm=.6+.5*bump+.13*stroke;
    base.rightElbow=-.65;
    base.crouch=.08*bump;
  }else if(kind==='harvest'){
    base.bodyLean=.25+.27*bump;
    base.leftArm=.6+.39*bump;
    base.rightArm=.62+.4*bump;
    base.leftElbow=-.4;base.rightElbow=-.67;
    base.crouch=.13*bump;
    base.toolTilt=.2+.45*bump;
  }
  base.headTilt=-base.bodyLean*.28;
  return base;
}
export function actionProgress(kind,elapsed){
  const def=FARM_ACTION_MOTIONS[kind];
  return def?clamp(elapsed/def.duration):1;
}

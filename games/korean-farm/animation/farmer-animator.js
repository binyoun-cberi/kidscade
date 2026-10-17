import * as THREE from 'three';
import {FARM_ACTION_MOTIONS,motionPose,actionProgress} from './motion-spec.mjs';

const SKIN=0xdeb08a,SHIRT=0x547b60,PANTS=0x455b57,BOOTS=0x564a3d,STRAW=0xd5ba79,HAIR=0x362f2c;
function material(color){return new THREE.MeshStandardMaterial({color,roughness:.91,metalness:0})}
function box(parent,w,h,d,color,x=0,y=0,z=0){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material(color));
  m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
function sphere(parent,r,color,x=0,y=0,z=0,segments=10){
  const m=new THREE.Mesh(new THREE.SphereGeometry(r,segments,7),material(color));
  m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;
}
function cylinder(parent,rt,rb,h,color,x=0,y=0,z=0,segments=8){
  const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,segments),material(color));
  m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;
}
function toolVariants(hand){
  const tools=new Map();
  const make=(kind)=>{const group=new THREE.Group();group.visible=false;hand.add(group);tools.set(kind,group);return group};
  const hoe=make('hoe');
  cylinder(hoe,.035,.04,.72,0x866342,.11,-.27,-.08).rotation.z=-.32;
  const blade=box(hoe,.28,.07,.18,0x89949a,.23,-.59,-.08);blade.rotation.z=.27;
  const watering=make('can');
  cylinder(watering,.21,.19,.32,0x7ca5a0,.10,-.32,-.02);
  cylinder(watering,.08,.09,.065,0xb7d1c1,.1,-.15,-.02);
  const spout=cylinder(watering,.06,.09,.36,0x7ca5a0,-.15,-.22,-.1);spout.rotation.z=-1.15;
  const rim=new THREE.Mesh(new THREE.TorusGeometry(.16,.028,5,12,Math.PI*1.18),material(0xadc4b7));
  rim.position.set(.1,-.15,.04);rim.rotation.y=Math.PI/2;watering.add(rim);
  const seed=make('seed');
  box(seed,.25,.3,.17,0xc7a471,.12,-.3,0);
  sphere(seed,.065,0x8c613b,.1,-.12,-.04);
  const basket=make('basket');
  cylinder(basket,.24,.16,.26,0xb58b58,.09,-.39,.01);
  const handle=new THREE.Mesh(new THREE.TorusGeometry(.19,.025,4,12,Math.PI),material(0x9e744b));
  handle.position.set(.09,-.26,.01);basket.add(handle);
  const lever=make('lever');
  cylinder(lever,.035,.04,.55,0x977450,.1,-.29,-.04).rotation.z=-.3;
  sphere(lever,.07,0x6d8968,.18,-.03,-.04);
  return tools;
}
// This actor is deliberately articulated rather than rotating a single rigid GLB.
// It guarantees clearly different farm actions on desktop and mobile.
export function createFarmerAnimator(){
  const root=new THREE.Group();root.name='KoreanFarmArticulatedFarmer';
  const body=new THREE.Group();body.position.y=.80;root.add(body);
  const torso=box(body,.58,.65,.37,SHIRT,0,.32,0);
  box(body,.60,.12,.39,0x6b8a6e,0,.04,0);
  const head=new THREE.Group();head.position.set(0,.87,0);body.add(head);
  cylinder(head,.17,.16,.18,SKIN,0,-.19,0);
  sphere(head,.25,SKIN,0,.06,0);
  box(head,.43,.14,.31,HAIR,0,.25,.025);
  for(const x of [-.085,.085])sphere(head,.022,0x3e3e36,x,.065,-.235,7);
  box(head,.12,.015,.02,0xb87863,0,-.055,-.249);
  const cap=new THREE.Group();cap.position.set(0,.37,0);head.add(cap);
  cylinder(cap,.21,.25,.22,STRAW,0,.025,0);
  cylinder(cap,.38,.38,.04,0xe0c887,0,-.10,0,14);
  cylinder(cap,.27,.27,.035,0x8d8655,0,-.045,0);
  const shoulders={},elbows={},legs={},knees={};
  for(const [side,sign] of [['left',-1],['right',1]]){
    const pivot=new THREE.Group();pivot.position.set(sign*.38,.59,0);body.add(pivot);shoulders[side]=pivot;
    sphere(pivot,.135,SHIRT,0,0,0);
    box(pivot,.20,.37,.21,SHIRT,0,-.19,0);
    const elbow=new THREE.Group();elbow.position.y=-.37;pivot.add(elbow);elbows[side]=elbow;
    box(elbow,.16,.25,.17,SKIN,0,-.13,0);
    sphere(elbow,.104,SKIN,0,-.28,0);
    const leg=new THREE.Group();leg.position.set(sign*.17,.79,0);root.add(leg);legs[side]=leg;
    box(leg,.235,.4,.27,PANTS,0,-.21,0);
    const knee=new THREE.Group();knee.position.y=-.43;leg.add(knee);knees[side]=knee;
    box(knee,.195,.33,.22,PANTS,0,-.15,0);
    box(knee,.25,.14,.37,BOOTS,0,-.34,-.075);
  }
  const tools=toolVariants(elbows.right);
  let currentAction=null,elapsed=0,emitted=false;
  const setTool=kind=>{for(const [name,obj] of tools)obj.visible=name===kind};
  return {
    root,
    get busy(){return Boolean(currentAction)},
    get activeAction(){return currentAction},
    get progress(){return currentAction?actionProgress(currentAction,elapsed):0},
    trigger(kind){
      if(!FARM_ACTION_MOTIONS[kind])return false;
      currentAction=kind;elapsed=0;emitted=false;setTool(FARM_ACTION_MOTIONS[kind].tool);
      return true;
    },
    update(dt,{moving=false,time=0}={}){
      dt=Math.max(0,Math.min(.08,dt));
      let impact=null;
      if(currentAction){
        elapsed+=dt;
        const progress=actionProgress(currentAction,elapsed);
        const info=FARM_ACTION_MOTIONS[currentAction];
        if(!emitted&&progress>=info.impact){impact=currentAction;emitted=true}
        if(progress>=1){currentAction=null;setTool('none')}
      }
      const active=currentAction;
      const pose=motionPose(active,active?actionProgress(active,elapsed):0,{moving:moving&&!active,time});
      body.rotation.x=pose.bodyLean;body.rotation.z=pose.bodyTilt;
      body.rotation.y=pose.bodyYaw;
      root.position.y=-pose.crouch*.16+(moving&&!active?Math.abs(Math.sin(time*9))*.035:Math.sin(time*1.8)*.009);
      body.position.y=.80-pose.crouch*.38;
      head.rotation.x=pose.headTilt;
      shoulders.left.rotation.x=pose.leftArm;
      shoulders.right.rotation.x=pose.rightArm;
      elbows.left.rotation.x=pose.leftElbow;
      elbows.right.rotation.x=pose.rightElbow;
      legs.left.rotation.x=pose.leftLeg;
      legs.right.rotation.x=pose.rightLeg;
      knees.left.rotation.x=-pose.leftKnee;knees.right.rotation.x=-pose.rightKnee;
      for(const [name,tool] of tools)if(tool.visible){
        tool.rotation.z=pose.toolTilt;
        tool.rotation.x=name==='can'?pose.toolTilt*.7:pose.toolTilt*.25;
      }
      return {impact,working:Boolean(active)};
    }
  };
}

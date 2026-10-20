// Two approachable rural characters, rendered from low-poly geometry rather
// than unlicensed models. They are decorative until the player clicks their
// nearby interaction hit box; there is no invisible wandering collision.
import * as THREE from 'three';

function person(parent,name,x,z,{shirt,skirt,skin,hat,apron=false}){
  const root=new THREE.Group();root.name=name;root.position.set(x,0,z);parent.add(root);
  const material=(color)=>new THREE.MeshStandardMaterial({color,roughness:.96,flatShading:true});
  const mats=[material(shirt),material(skirt),material(skin),material(hat),material(0xf0e5c4),material(0x5d4939)];
  const part=(geometry,index,x,y,z,group=root)=>{
    const m=new THREE.Mesh(geometry,mats[index]);m.position.set(x,y,z);m.castShadow=true;group.add(m);return m;
  };
  const box=(w,h,d,index,x,y,z,group)=>part(new THREE.BoxGeometry(w,h,d),index,x,y,z,group);
  box(.49,.76,.31,0,0,1.12,0);
  if(apron)box(.42,.50,.04,4,0,1.0,-.19);
  const head=part(new THREE.SphereGeometry(.24,10,7),2,0,1.70,-.02);
  part(new THREE.CylinderGeometry(.31,.38,.095,10),3,0,1.91,-.02);
  part(new THREE.CylinderGeometry(.22,.24,.17,10),3,0,2.04,-.02);
  const leftArm=new THREE.Group(),rightArm=new THREE.Group();
  for(const [arm,side] of [[leftArm,-1],[rightArm,1]]){
    arm.position.set(side*.30,1.39,0);root.add(arm);
    box(.15,.58,.19,0,0,-.22,0,arm);
    part(new THREE.SphereGeometry(.1,7,6),2,0,-.53,0,arm);
  }
  const leftLeg=new THREE.Group(),rightLeg=new THREE.Group();
  for(const [leg,side] of [[leftLeg,-1],[rightLeg,1]]){
    leg.position.set(side*.14,.80,0);root.add(leg);
    box(.18,.73,.2,1,0,-.39,0,leg);box(.23,.16,.33,5,0,-.73,-.07,leg);
  }
  return {root,leftArm,rightArm,leftLeg,rightLeg,mats,head};
}
function label(root,name){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=84;
  const ctx=canvas.getContext('2d');
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const setText=value=>{
    ctx.clearRect(0,0,256,84);
    ctx.fillStyle='#fff6de';ctx.beginPath();ctx.roundRect(8,5,240,72,30);ctx.fill();
    ctx.strokeStyle='#76926a';ctx.lineWidth=5;ctx.stroke();
    ctx.fillStyle='#3d6148';ctx.font='bold 30px sans-serif';ctx.textAlign='center';
    ctx.fillText(value,128,53,220);texture.needsUpdate=true;
  };
  setText(name);
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));
  sprite.position.set(0,2.48,0);sprite.scale.set(1.65,.54,1);root.add(sprite);
  return {sprite,texture,setText};
}
export function createVillagePeople(scene){
  const root=new THREE.Group();root.name='solnaeri-villagers';scene.add(root);
  const merchant=person(root,'순옥 아주머니 · 장터',9.8,15.3,
    {shirt:0x7a9e79,skirt:0x394b70,skin:0xe2b78c,hat:0xb59668,apron:true});
  const neighbor=person(root,'영수 할아버지 · 이웃',2.8,13.4,
    {shirt:0x8b755a,skirt:0x495f57,skin:0xd7aa84,hat:0x9fbd8a});
  const festivalHost=person(root,'소담이 · 마을 행사',-1.1,15.4,
    {shirt:0xb76765,skirt:0x486c6d,skin:0xe6b990,hat:0xc3aa65,apron:true});
  const merchantLabel=label(merchant.root,'장터 순옥'),neighborLabel=label(neighbor.root,'이웃 영수');
  const festivalLabel=label(festivalHost.root,'마을 행사 · 소담');
  const booth=new THREE.Group();booth.position.set(-1.1,0,16.55);root.add(booth);
  const mat=color=>new THREE.MeshStandardMaterial({color,roughness:.9});
  const boothMats=[mat(0x9a6348),mat(0xecc579),mat(0xd77665),mat(0x9ac9ad)];
  const plank=(w,h,d,x,y,z,idx)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),boothMats[idx]);
    o.position.set(x,y,z);o.castShadow=true;booth.add(o);return o};
  plank(2.4,.27,.65,0,.68,0,0);
  for(const x of [-1.07,1.07])plank(.10,2.6,.12,x,1.65,.15,0);
  plank(2.4,.12,.7,0,2.92,.15,1);
  const flags=[];
  for(let i=0;i<7;i++){
    const flag=plank(.24,.26,.05,-.9+i*.3,2.75,.52,i%2?2:3);flag.rotation.z=i%2?.16:-.16;flags.push(flag);
  }
  let currentFestivalLabel='';
  const setFestival=event=>{
    if(!event)return;
    const text=event.open?'행사 · '+event.title:event.startsIn?'소담 · '+event.startsIn+'일 후':'다음 장날 준비';
    if(text===currentFestivalLabel)return;
    currentFestivalLabel=text;booth.userData.open=event.open;
    festivalLabel.setText(text);
    for(const flag of flags)flag.visible=event.open;
  };
  // Shopkeeper remains behind the stand; neighbor walks a short, predictable
  // stretch of open lane and comes back to the same interaction marker.
  const tick=(dt,elapsed,farmerPosition)=>{
    const nearMerchant=Math.hypot(farmerPosition.x-9.8,farmerPosition.z-15.3)<3.2;
    merchantLabel.sprite.visible=Math.hypot(farmerPosition.x-9.8,farmerPosition.z-15.3)<8;
    merchant.rightArm.rotation.z=nearMerchant?-.8+Math.sin(elapsed*5)*.22:-.20;
    merchant.leftArm.rotation.z=.18;
    const phase=Math.sin(elapsed*.53),stride=Math.cos(elapsed*.53);
    neighbor.root.position.x=2.8+phase*.46;
    neighbor.root.position.z=13.4+Math.sin(elapsed*.53+.3)*.24;
    neighborLabel.sprite.visible=Math.hypot(farmerPosition.x-neighbor.root.position.x,farmerPosition.z-neighbor.root.position.z)<8;
    neighbor.root.rotation.y=stride<0?-.35:.35;
    neighbor.leftLeg.rotation.x=stride*.20;neighbor.rightLeg.rotation.x=-stride*.20;
    neighbor.leftArm.rotation.x=-stride*.18;neighbor.rightArm.rotation.x=stride*.18;
    if(Math.hypot(farmerPosition.x-neighbor.root.position.x,farmerPosition.z-neighbor.root.position.z)<3){
      neighbor.rightArm.rotation.z=-.75+Math.sin(elapsed*4)*.12;
    }else neighbor.rightArm.rotation.z=-.1;
    const nearHost=Math.hypot(farmerPosition.x+1.1,farmerPosition.z-15.4)<4;
    festivalLabel.sprite.visible=Math.hypot(farmerPosition.x+1.1,farmerPosition.z-15.4)<9;
    festivalHost.rightArm.rotation.z=nearHost?-.8+Math.sin(elapsed*3)*.18:-.16;
    // No per-frame geometry allocation, physics collision, or texture downloads.
  };
  return {root,stats:{people:3},update:tick,setFestival,dispose(){
    root.parent?.remove(root);
    root.traverse(obj=>{if(obj.isMesh)obj.geometry?.dispose?.()});
    for(const p of [merchant,neighbor,festivalHost])for(const material of p.mats)material.dispose();
    for(const material of boothMats)material.dispose();
    for(const item of [merchantLabel,neighborLabel,festivalLabel]){item.texture.dispose();item.sprite.material.dispose()}
    root.clear();
  }};
}

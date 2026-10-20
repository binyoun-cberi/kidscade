// Three approachable residents and a festival crowd made from low-poly
// geometry. Only the three residents have interaction markers; festive guests
// are decorative, wander within a small plaza, and have no hidden colliders.
import * as THREE from 'three';
import {FESTIVAL_GUESTS,FESTIVAL_THEMES,festivalSceneState} from './festival-ambience.mjs';
import {villageRoutine} from './village-routines.mjs';

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
  // Two unobtrusive passersby keep the lanes lived-in even outside festival week.
  // They have no colliders and no interactive targets.
  const passers=[
    person(root,'길을 걷는 농부',-3.8,10.1,{shirt:0x7b996b,skirt:0x596f66,skin:0xd8a780,hat:0xa69a67}),
    person(root,'산책하는 이웃',5.4,11.2,{shirt:0xbf947f,skirt:0x647b9a,skin:0xe5b995,hat:0xb69a73})
  ];
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
  // A small decorated square: seasonal lanterns, pennants, produce and local
  // families. These use shared materials and never request extra game assets.
  const festivalSquare=new THREE.Group();festivalSquare.name='solnaeri-festival-square';root.add(festivalSquare);
  const seasonMats=[mat(0xeea9b5),mat(0xa4c995),mat(0xf5d28a),mat(0xe88742),mat(0x5f9c55)];
  const make=(geometry,index,x,y,z,parent=festivalSquare)=>{
    const mesh=new THREE.Mesh(geometry,seasonMats[index]);mesh.position.set(x,y,z);
    mesh.castShadow=true;parent.add(mesh);return mesh;
  };
  const pennants=[];
  for(let i=0;i<13;i++){
    const x=-5.3+i*.72;
    const flag=make(new THREE.ConeGeometry(.22,.44,3),i%3,x,2.85+Math.sin(i*.9)*.11,19);
    flag.rotation.z=Math.PI;flag.rotation.y=Math.PI/6;pennants.push(flag);
  }
  const lanterns=[];
  for(const [x,z] of [[-5.5,15],[-5.5,19.2],[3.6,15],[3.6,19.2]]){
    const post=make(new THREE.CylinderGeometry(.055,.07,2.95,6),4,x,1.47,z);
    post.castShadow=false;
    const globe=make(new THREE.SphereGeometry(.28,9,6),lanterns.length%3,x,2.93,z);
    globe.castShadow=false;lanterns.push(globe);
  }
  // The harvest display physically changes with the season, rather than only
  // swapping HUD text. Repainted produce has leaf/ear accents on each item.
  const produceDisplay=new THREE.Group();produceDisplay.name='solnaeri-festival-harvest';
  produceDisplay.position.set(-1.1,0,16.55);festivalSquare.add(produceDisplay);
  const produceItems=[];
  for(let i=0;i<7;i++){
    const x=-.85+(i%4)*.55,z=.08+Math.floor(i/4)*.3;
    const produce=make(new THREE.SphereGeometry(.13,7,5),3,x,.91,z,produceDisplay);
    const leaf=make(new THREE.ConeGeometry(.10,.20,5),4,x,1.07,z,produceDisplay);
    produceItems.push({produce,leaf});
  }
  const guestGroup=new THREE.Group();guestGroup.name='solnaeri-festival-visitors';festivalSquare.add(guestGroup);
  const guests=FESTIVAL_GUESTS.map((guest,i)=>{
    const actor=person(guestGroup,guest.name,guest.x,guest.z,{shirt:guest.shirt,skirt:guest.skirt,
      skin:i%2?0xe2b18a:0xc89472,hat:i%2?0xba9a73:0xc9b37b});
    actor.root.scale.setScalar(guest.scale);
    // Woven market basket carried by one visitor, using a third material.
    if(guest.role==='browse'){
      const basketMat=new THREE.MeshStandardMaterial({color:0xa4794c,roughness:1});
      const basket=new THREE.Mesh(new THREE.CylinderGeometry(.22,.17,.25,8),basketMat);
      basket.position.set(.39,.77,-.08);basket.castShadow=true;actor.root.add(basket);
      actor.mats.push(basketMat);
    }
    return {...actor,...guest,phase:i*1.31};
  });
  const thankYou=new THREE.Group();thankYou.name='solnaeri-festival-thanks';
  festivalSquare.add(thankYou);
  for(const x of [-.78,.78]){
    const rosette=make(new THREE.SphereGeometry(.24,8,6),2,-1.1+x,2.5,17.08,thankYou);
    rosette.castShadow=false;
    make(new THREE.BoxGeometry(.075,.46,.04),0,-1.1+x,2.19,17.08,thankYou);
  }
  const celebrationCount=56;
  const positions=new Float32Array(celebrationCount*3),colors=new Float32Array(celebrationCount*3);
  const confettiGeometry=new THREE.BufferGeometry();
  confettiGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
  confettiGeometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
  const confettiMaterial=new THREE.PointsMaterial({size:.16,vertexColors:true,transparent:true,opacity:.9,depthWrite:false});
  const confetti=new THREE.Points(confettiGeometry,confettiMaterial);confetti.name='solnaeri-festival-cheers';
  confetti.frustumCulled=false;confetti.visible=false;festivalSquare.add(confetti);
  let celebrationStart=null,celebrationPending=false;
  const stats={people:3,passersby:2,visitors:FESTIVAL_GUESTS.length,activeVisitors:0,season:'봄',festivalOpen:false,completed:false,routines:{}};
  let currentFestivalLabel='';
  const setFestival=event=>{
    if(!event)return;
    const display=festivalSceneState(event),theme=FESTIVAL_THEMES[display.season];
    const text=display.completed?'소담 · 함께해서 고마워요!':
      display.open?'행사 · '+event.title:event.startsIn?'소담 · '+event.startsIn+'일 후':'다음 장날 준비';
    if(text!==currentFestivalLabel){currentFestivalLabel=text;festivalLabel.setText(text)}
    booth.userData.open=display.open;
    festivalSquare.visible=display.open;
    thankYou.visible=display.completed;
    stats.activeVisitors=display.visitors;
    stats.festivalOpen=display.open;
    stats.season=display.season;
    stats.completed=display.completed;
    for(const flag of flags)flag.visible=display.open;
    for(let i=0;i<3;i++)seasonMats[i].color.setHex(theme.colors[i]);
    seasonMats[3].color.setHex(theme.produce);seasonMats[4].color.setHex(theme.leaf);
    // Corn sits in husks, rice shows golden ears; spring/winter display roots.
    for(const item of produceItems){
      const grain=display.season==='가을',corn=display.season==='여름';
      item.produce.scale.set(grain ? .70 : corn ? .8 : 1,grain ? 1.35 : corn ? 1.55 : 1,1);
      item.leaf.scale.set(grain ? .62 : 1,grain ? 1.25 : corn ? 1.6 : 1,1);
    }
    if(!display.open){confetti.visible=false;celebrationPending=false;celebrationStart=null}
  };
  const celebrate=()=>{
    if(!stats.festivalOpen)return;
    celebrationPending=true;celebrationStart=null;
  };
  // Shopkeeper remains behind the stand; neighbor walks a short, predictable
  // stretch of open lane and comes back to the same interaction marker.
  const tick=(dt,elapsed,farmerPosition,minute=420)=>{
    const merchantTask=villageRoutine('market',minute),neighborTask=villageRoutine('neighbor',minute),
      festivalTask=villageRoutine('festival',minute);
    stats.routines={market:merchantTask.label,neighbor:neighborTask.label,festival:festivalTask.label};
    const blend=Math.min(1,dt*2);
    for(const [actor,task] of [[merchant,merchantTask],[neighbor,neighborTask],[festivalHost,festivalTask]]){
      actor.root.position.x+=(task.x-actor.root.position.x)*blend;
      actor.root.position.z+=(task.z-actor.root.position.z)*blend;
    }
    for(let i=0;i<passers.length;i++){
      const actor=passers[i],t=elapsed*.42+i*2.9;
      actor.root.position.x=(i===0?-3.8:5.4)+Math.sin(t)*1.15;
      actor.root.position.z=(i===0?10.1:11.2)+Math.cos(t*.65)*.45;
      actor.root.rotation.y=Math.cos(t)>=0?-.55:.55;
      actor.leftLeg.rotation.x=Math.sin(t*3)*.24;
      actor.rightLeg.rotation.x=-actor.leftLeg.rotation.x;
      actor.leftArm.rotation.x=-actor.leftLeg.rotation.x*.55;
      actor.rightArm.rotation.x=actor.leftLeg.rotation.x*.55;
    }
    const nearMerchant=Math.hypot(farmerPosition.x-9.8,farmerPosition.z-15.3)<3.2;
    merchantLabel.sprite.visible=Math.hypot(farmerPosition.x-9.8,farmerPosition.z-15.3)<8;
    merchant.rightArm.rotation.z=nearMerchant?-.8+Math.sin(elapsed*5)*.22:merchantTask.gesture==='stock'?-.42+Math.sin(elapsed*2)*.20:-.20;
    merchant.leftArm.rotation.z=.18;
    const stride=Math.cos(elapsed*.53);
    neighborLabel.sprite.visible=Math.hypot(farmerPosition.x-neighbor.root.position.x,farmerPosition.z-neighbor.root.position.z)<8;
    neighbor.root.rotation.y=stride<0?-.35:.35;
    neighbor.leftLeg.rotation.x=stride*.20;neighbor.rightLeg.rotation.x=-stride*.20;
    neighbor.leftArm.rotation.x=-stride*.18;neighbor.rightArm.rotation.x=stride*.18;
    if(Math.hypot(farmerPosition.x-neighbor.root.position.x,farmerPosition.z-neighbor.root.position.z)<3){
      neighbor.rightArm.rotation.z=-.75+Math.sin(elapsed*4)*.12;
    }else neighbor.rightArm.rotation.z=-.1;
    const nearHost=Math.hypot(farmerPosition.x+1.1,farmerPosition.z-15.4)<4;
    festivalLabel.sprite.visible=Math.hypot(farmerPosition.x+1.1,farmerPosition.z-15.4)<9;
    festivalHost.rightArm.rotation.z=nearHost||stats.festivalOpen?-.8+Math.sin(elapsed*3)*.18:festivalTask.gesture==='sweep'?-.43+Math.sin(elapsed*2)*.2:-.16;
    if(stats.festivalOpen){
      for(const guest of guests){
        const t=elapsed*(guest.role==='skip'?2.6:1.3)+guest.phase;
        guest.root.position.x=guest.x+Math.sin(t)*.20;
        guest.root.position.z=guest.z+Math.cos(t*.71)*.12;
        guest.root.rotation.y=Math.sin(t*.46)*.35+(guest.role==='browse'?-1.0:.1);
        const clap=guest.role==='clap';
        guest.leftArm.rotation.z=clap?-.85+Math.sin(t*4)*.32:-.16+Math.sin(t)*.10;
        guest.rightArm.rotation.z=clap ? .85-Math.sin(t*4)*.32 :
          guest.role==='wave' ? -1+Math.sin(t*2.3)*.24 : .15;
        guest.leftLeg.rotation.x=guest.role==='skip'?Math.sin(t*2)*.38:Math.sin(t)*.08;
        guest.rightLeg.rotation.x=guest.role==='skip'?-Math.sin(t*2)*.38:-Math.sin(t)*.08;
        guest.root.position.y=guest.role==='skip'?Math.abs(Math.sin(t*1.7))*.085:0;
      }
      for(let i=0;i<pennants.length;i++)pennants[i].rotation.z=Math.PI+Math.sin(elapsed*2+i*.7)*.11;
      for(let i=0;i<lanterns.length;i++)lanterns[i].position.y=2.93+Math.sin(elapsed*1.2+i)*.065;
      if(celebrationPending){celebrationPending=false;celebrationStart=elapsed}
      const age=celebrationStart===null?Infinity:elapsed-celebrationStart;
      confetti.visible=age<6;
      if(confetti.visible){
        for(let i=0;i<celebrationCount;i++){
          const wave=(i*0.61803398875)%1,angle=i*2.3999632297;
          const radius=.5+((i*17)%31)/31*2.8;
          positions[3*i]=-1.1+Math.cos(angle)*radius+Math.sin(age+i)*.10;
          positions[3*i+1]=.6+((wave+age*(.13+.03*(i%3)))%1)*2.9;
          positions[3*i+2]=16.65+Math.sin(angle)*radius;
          const color=seasonMats[i%3].color;
          colors[3*i]=color.r;colors[3*i+1]=color.g;colors[3*i+2]=color.b;
        }
        confettiGeometry.attributes.position.needsUpdate=true;
        confettiGeometry.attributes.color.needsUpdate=true;
      }
    }
    // No per-frame geometry allocation, physics collision, or texture downloads.
  };
  return {root,stats,update:tick,setFestival,celebrate,dispose(){
    root.parent?.remove(root);
    root.traverse(obj=>{if(obj.isMesh)obj.geometry?.dispose?.()});
    for(const p of [merchant,neighbor,festivalHost,...guests,...passers])for(const material of p.mats)material.dispose();
    for(const material of boothMats)material.dispose();
    for(const material of seasonMats)material.dispose();
    confettiGeometry.dispose();confettiMaterial.dispose();
    for(const item of [merchantLabel,neighborLabel,festivalLabel]){item.texture.dispose();item.sprite.material.dispose()}
    root.clear();
  }};
}

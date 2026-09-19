import * as THREE from 'three';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';

const ROOT=new URL('../assets/game/',import.meta.url);
const PEOPLE=new URL('characters/people/',ROOT).href;
const SUBURBAN=new URL('3d/city/kenney-city-kit-suburban/',ROOT).href;
const ROADS=new URL('3d/city/kenney-city-kit-roads/',ROOT).href;
const POLY=new URL('3d/city/poly-pizza-city-pack/',ROOT).href;
const MARKET=new URL('shops/market/',ROOT).href;
const FURNITURE=new URL('3d/interiors/kenney-furniture-kit/',ROOT).href;

export const CITY_BOUNDS={x1:-26,x2:26,z1:20,z2:40};

const CITY_ASSET={
  market:SUBURBAN+'building-type-b.glb',
  hardware:SUBURBAN+'building-type-c.glb',
  cafe:SUBURBAN+'building-type-d.glb',
  arcade:SUBURBAN+'building-type-e.glb',
  civic:SUBURBAN+'building-type-f.glb',
  library:SUBURBAN+'building-type-h.glb',
  clinic:SUBURBAN+'building-type-i.glb',
  road:ROADS+'road-straight.glb',
  cross:ROADS+'road-crossroad.glb',
  lamp:ROADS+'light-square.glb',
  busStop:POLY+'bus-stop.glb',
  busSign:POLY+'bus-stop-sign.glb',
  bicycle:POLY+'bicycle.glb',
  mailbox:POLY+'mailbox.glb',
  atm:POLY+'atm.glb',
  planter:POLY+'planter-and-bushes.glb',
  fruit:MARKET+'display-fruit.glb',
  bread:MARKET+'display-bread.glb',
  register:MARKET+'cash-register.glb',
  cart:MARKET+'shopping-cart.glb',
  employee:MARKET+'character-employee.glb',
  bench:FURNITURE+'bench.glb'
};

const NPC_MODELS={
  minji:PEOPLE+'character-female-a.glb',
  junho:PEOPLE+'character-male-a.glb',
  haneul:PEOPLE+'character-female-b.glb',
  doyun:PEOPLE+'character-male-b.glb',
  yuna:PEOPLE+'character-female-c.glb',
  taeho:PEOPLE+'character-male-c.glb',
  sora:PEOPLE+'character-female-d.glb',
  hyunwoo:PEOPLE+'character-male-d.glb',
  nari:PEOPLE+'character-female-e.glb',
  woojin:PEOPLE+'character-male-e.glb',
  seoyeon:PEOPLE+'character-female-f.glb',
  minseok:PEOPLE+'character-male-f.glb',
  clerk:CITY_ASSET.employee
};

function makeLabel(text,{width=2.2,height=.52,font=38}={}){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,512,128);
  ctx.fillStyle='rgba(255,249,218,.94)';ctx.strokeStyle='#4b5841';ctx.lineWidth=8;
  const x=12,y=16,w=488,h=96,r=26;
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#2d3a2d';ctx.font='700 '+font+'px system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,65);
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
  const mat=new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false,depthTest:true});
  const sp=new THREE.Sprite(mat);sp.scale.set(width,height,1);sp.renderOrder=20;return sp;
}

async function addNpc(ctx,id,name,x,z,{radius=.48,role='resident',label=true}={}){
  const gltf=await ctx.loadGLTF(NPC_MODELS[id]);
  // Keep the complete character asset: independent skeleton + original animation clips.
  const model=ctx.prepModel(cloneSkeleton(gltf.scene));
  // Match the already-working people pipeline used by the market game:
  // normalize by the largest axis, then center X/Z and put feet on local Y=0.
  model.updateMatrixWorld(true);
  let b=new THREE.Box3().setFromObject(model),size=b.getSize(new THREE.Vector3());
  const baseSize=Math.max(size.x,size.y,size.z)||1;
  model.scale.multiplyScalar(1.82/baseSize);
  model.updateMatrixWorld(true);
  b=new THREE.Box3().setFromObject(model);
  const center=b.getCenter(new THREE.Vector3());
  model.position.x-=center.x;
  model.position.z-=center.z;
  model.position.y-=b.min.y;
  model.updateMatrixWorld(true);
  const anchor=new THREE.Group();anchor.position.set(x,.025,z);anchor.add(model);
  const mixer=new THREE.AnimationMixer(model);
  const clips=Array.isArray(gltf.animations)?gltf.animations:[];
  const idleClip=clips.find(c=>/idle|stand/i.test(c.name))||clips[0]||null;
  const walkClip=clips.find(c=>/walk|run/i.test(c.name))||idleClip;
  let action=null,animState='';
  function playAnim(kind){
    const clip=kind==='walk'?walkClip:idleClip;
    if(!clip||animState===kind)return;
    action?.fadeOut?.(.12);
    const next=mixer.clipAction(clip);next.reset();next.enabled=true;next.setLoop(THREE.LoopRepeat,Infinity);next.fadeIn(.12);next.play();
    action=next;animState=kind;
  }
  playAnim('idle');
  const shadow=new THREE.Mesh(new THREE.CircleGeometry(.38,20),new THREE.MeshBasicMaterial({color:0x263126,transparent:true,opacity:.18,depthWrite:false}));
  shadow.rotation.x=-Math.PI/2;shadow.position.y=.008;anchor.add(shadow);
  ctx.parent.add(anchor);
  const tag=label?makeLabel(name,{width:1.2,height:.30,font:32}):null;
  if(tag){tag.position.set(x,2.12,z);tag.visible=false;ctx.parent.add(tag)}
  return {id,name,object:anchor,model,mixer,playAnim,label:tag,interaction:null,homeX:x,homeZ:z,groundY:.025,r:radius,role,phase:(id.length*1.37)%6.2};
}

function overlaps(a,b,pad=.08){
  return Math.abs(a.x-b.x)<(a.w+b.w)/2+pad&&Math.abs(a.z-b.z)<(a.d+b.d)/2+pad;
}
function validateMapLayout(objects){
  for(let i=0;i<objects.length;i++)for(let j=i+1;j<objects.length;j++){
    const a=objects[i],b=objects[j];
    if(!overlaps(a,b))continue;
    const pair=a.type+'-'+b.type;
    if(pair==='road-road'||pair==='road-plaza'||pair==='plaza-road')continue;
    console.warn('[World v3 map overlap]',a.id,b.id);
  }
}

export async function buildKidscadeCity(ctx){
  const {parent,addModel,box,plane,interact,collider,loadGLB,loadGLTF,prepModel,actions,getGameTime,getPlayerPosition}=ctx;
  const layout=[],buildingLabels=[];const track=(id,type,x,z,w,d)=>{layout.push({id,type,x,z,w,d});return {id,type,x,z,w,d}};

  // One continuous town floor, then clearly separated road, sidewalks/plaza, and building lots.
  plane(parent,0,30,52,20,0xb6b09c,.012);
  box(parent,0,30,52,20,.18,0x9d9988,-.18);
  plane(parent,0,32.6,11.0,3.4,0xcabd9c,.025);track('city-plaza','plaza',0,32.6,11,3.4);
  plane(parent,0,35.0,8.0,1.7,0xd8caa7,.024);
  box(parent,0,29,52,3.2,.06,0x666d70,.025);

  // Roads use a strict four-unit grid. Only the entrance reaches the main road;
  // the northern civic area is pedestrian space rather than another asphalt spur.
  const roadX=[-24,-20,-16,-12,-8,-4,4,8,12,16,20,24];
  await Promise.all([
    addModel(parent,CITY_ASSET.cross,{x:0,z:29,w:4.0,h:.28,d:4.0,rot:0,name:'city-road-cross'}),
    ...roadX.map(x=>addModel(parent,CITY_ASSET.road,{x,z:29,w:4.0,h:.28,d:4.0,rot:Math.PI/2,name:'city-road-main-'+x})),
    addModel(parent,CITY_ASSET.road,{x:0,z:25,w:4.0,h:.28,d:4.0,rot:0,name:'city-road-entry-25'}),
    addModel(parent,CITY_ASSET.road,{x:0,z:21,w:4.0,h:.28,d:4.0,rot:0,name:'city-road-entry-21'})
  ]);
  track('main-road','road',0,29,52,3.2);track('entry-road','road',0,23,3.2,8);

  const buildings=[
    ['market',CITY_ASSET.market,-18.0,23.8,6.0,5.2,'씨앗마트',2.25],
    ['hardware',CITY_ASSET.hardware,-9.5,23.8,6.0,5.2,'튼튼 철물점',2.25],
    ['cafe',CITY_ASSET.cafe,9.5,23.8,6.0,5.2,'하늘 카페',2.25],
    ['arcade',CITY_ASSET.arcade,18.0,23.8,6.0,5.2,'키즈 아케이드',2.25],
    ['library',CITY_ASSET.library,-13.0,36.4,6.2,5.0,'마을 도서관',-2.25],
    ['civic',CITY_ASSET.civic,0,36.5,7.2,5.0,'마을회관',-2.25],
    ['clinic',CITY_ASSET.clinic,13.0,36.4,6.2,5.0,'튼튼 보건소',-2.25]
  ];
  for(const [id,url,x,z,w,d,name,labelDz] of buildings){
    await addModel(parent,url,{x,z,w,h:5.0,d,rot:Math.PI,name:'city-'+id});
    collider('outdoor',x,z,w*.82,d*.70);track('building-'+id,'building',x,z,w*.82,d*.70);
    const label=makeLabel(name,{width:1.9,height:.44,font:33});label.position.set(x,3.72,z+labelDz);label.userData.anchor={x,z:z+labelDz};label.visible=false;parent.add(label);buildingLabels.push(label);
  }

  // Market props are grouped into one readable outdoor storefront, not scattered on the road.
  await Promise.all([
    addModel(parent,CITY_ASSET.fruit,{x:-19.2,z:26.25,w:1.7,h:1.4,d:1.05,rot:0,name:'market-fruit'}),
    addModel(parent,CITY_ASSET.bread,{x:-17.0,z:26.25,w:1.7,h:1.4,d:1.05,rot:0,name:'market-bread'}),
    addModel(parent,CITY_ASSET.register,{x:-18.1,z:26.0,w:.8,h:.62,d:.7,rot:Math.PI,name:'market-register'}),
    addModel(parent,CITY_ASSET.cart,{x:-15.15,z:26.0,w:1.0,h:.95,d:1.1,rot:.1,name:'market-cart'}),
    addModel(parent,CITY_ASSET.atm,{x:-21.0,z:26.0,w:.75,h:1.45,d:.65,rot:Math.PI/2,name:'market-atm'})
  ]);
  track('market-display','decor',-18.1,26.5,5.9,1.35);

  // Plaza furniture stays off the road and leaves the center open for resident gatherings.
  await Promise.all([
    addModel(parent,CITY_ASSET.bench,{x:-3.6,z:32.55,w:2.0,h:.95,d:.78,rot:Math.PI/2,name:'plaza-bench-west'}),
    addModel(parent,CITY_ASSET.bench,{x:3.6,z:32.55,w:2.0,h:.95,d:.78,rot:-Math.PI/2,name:'plaza-bench-east'}),
    addModel(parent,CITY_ASSET.planter,{x:-5.0,z:32.65,w:1.2,h:.85,d:.85,rot:0,name:'plaza-planter-west'}),
    addModel(parent,CITY_ASSET.planter,{x:5.0,z:32.65,w:1.2,h:.85,d:.85,rot:0,name:'plaza-planter-east'}),
    addModel(parent,CITY_ASSET.mailbox,{x:-6.0,z:34.45,w:.7,h:1.25,d:.6,rot:0,name:'town-mailbox'})
  ]);

  // Dedicated transport corner. The unused traffic light was removed until actual vehicle AI exists.
  await Promise.all([
    addModel(parent,CITY_ASSET.busStop,{x:21.5,z:33.0,w:2.7,h:2.5,d:1.5,rot:-Math.PI/2,name:'seed-bus-stop'}),
    addModel(parent,CITY_ASSET.busSign,{x:20.1,z:31.85,w:.55,h:2.2,d:.55,rot:0,name:'seed-bus-sign'}),
    addModel(parent,CITY_ASSET.bicycle,{x:18.6,z:34.25,w:1.55,h:1.15,d:.55,rot:.25,name:'town-bicycle'})
  ]);
  track('transport-corner','decor',20.4,33.1,5.2,3.3);

  // Lamps follow sidewalks instead of sitting in the carriageway.
  for(const [x,z] of [[-24,26.2],[-12,26.2],[12,26.2],[24,26.2],[-19.5,34.3],[-7,34.3],[7,34.3],[17,35.0]]){
    await addModel(parent,CITY_ASSET.lamp,{x,z,w:.5,h:3.4,d:.5,rot:0});
  }

  const npcCtx={parent,loadGLTF,prepModel};
  const npcs=[];
  npcs.push(await addNpc(npcCtx,'minji','민지',-18.0,26.65,{role:'shop'}));
  npcs.push(await addNpc(npcCtx,'junho','준호',-9.5,26.65,{role:'shop'}));
  npcs.push(await addNpc(npcCtx,'haneul','하늘',9.5,26.65,{role:'shop'}));
  npcs.push(await addNpc(npcCtx,'doyun','도윤',0.0,33.25,{role:'civic',radius:.62}));
  npcs.push(await addNpc(npcCtx,'yuna','유나',4.0,32.25,{role:'resident',radius:.68}));
  npcs.push(await addNpc(npcCtx,'taeho','태호',18.0,26.65,{role:'arcade'}));
  npcs.push(await addNpc(npcCtx,'sora','소라',-13.0,33.35,{role:'library'}));
  npcs.push(await addNpc(npcCtx,'hyunwoo','현우',-5.8,33.55,{role:'delivery',radius:.7}));
  npcs.push(await addNpc(npcCtx,'nari','나리',13.0,33.35,{role:'clinic'}));
  npcs.push(await addNpc(npcCtx,'woojin','우진',-2.4,32.2,{role:'resident',radius:.72}));
  npcs.push(await addNpc(npcCtx,'seoyeon','서연',2.2,33.4,{role:'resident',radius:.68}));
  npcs.push(await addNpc(npcCtx,'minseok','민석',21.0,31.55,{role:'bus'}));
  npcs.push(await addNpc(npcCtx,'clerk','마트직원',-16.0,26.45,{role:'shop',label:false,radius:.25}));

  const byId=Object.fromEntries(npcs.map(n=>[n.id,n]));
  function bind(id,r,label,action){
    const n=byId[id];if(!n)return;
    n.interaction=interact('outdoor',n.object.position.x,n.object.position.z,r,label,action);
  }
  bind('minji',1.35,'민지와 이야기하기',()=>actions.resident('minji'));
  bind('junho',1.35,'준호와 이야기하기',()=>actions.resident('junho'));
  bind('haneul',1.35,'하늘과 이야기하기',()=>actions.resident('haneul'));
  bind('doyun',1.35,'도윤과 이야기하기',()=>actions.resident('doyun'));
  bind('yuna',1.35,'유나와 이야기하기',()=>actions.resident('yuna'));
  bind('taeho',1.35,'태호와 이야기하기',()=>actions.resident('taeho'));
  bind('sora',1.35,'소라와 이야기하기',()=>actions.resident('sora'));
  bind('hyunwoo',1.35,'현우와 이야기하기',()=>actions.resident('hyunwoo'));
  bind('nari',1.35,'나리와 이야기하기',()=>actions.resident('nari'));
  bind('woojin',1.35,'우진과 이야기하기',()=>actions.resident('woojin'));
  bind('seoyeon',1.35,'서연과 이야기하기',()=>actions.resident('seoyeon'));
  bind('minseok',1.45,'민석과 이야기하기',()=>actions.resident('minseok'));

  interact('outdoor',-3.6,32.55,1.2,'광장 벤치에서 쉬기',()=>actions.bench());
  interact('outdoor',3.6,32.55,1.2,'광장 벤치에서 쉬기',()=>actions.bench());

  validateMapLayout(layout);

  // Until obstacle-aware pathfinding exists, residents stay on safe town-side role anchors.
  // This prevents long straight-line walks through buildings, trees, the river and the player home.
  const eveningSlots={
    doyun:{x:-1.6,z:32.55},yuna:{x:1.6,z:32.45},hyunwoo:{x:-3.2,z:33.35},
    woojin:{x:3.2,z:33.30},seoyeon:{x:0,z:33.45}
  };
  const dayRoleTargets={
    yuna:{x:-15.4,z:32.0,r:.38},      // produce / farm information corner
    woojin:{x:-8.0,z:32.15,r:.42},    // west plaza / forest information corner
    seoyeon:{x:8.0,z:32.15,r:.42},    // east plaza / Cube Pets information corner
    hyunwoo:{x:-5.7,z:34.1,r:.38}     // mailbox / delivery corner
  };

  return {
    npcs,
    bounds:CITY_BOUNDS,
    update(now,dt){
      const minutes=typeof getGameTime==='function'?getGameTime():720;
      const hour=minutes/60,evening=hour>=18&&hour<23,daytime=hour>=7&&hour<18;
      const player=typeof getPlayerPosition==='function'?getPlayerPosition():null;
      for(const label of buildingLabels){const a=label.userData.anchor;label.visible=!!player&&Math.hypot(player.x-a.x,player.z-a.z)<7.5;}
      for(const n of npcs){
        let hx=n.homeX,hz=n.homeZ,r=n.r;
        if(daytime&&dayRoleTargets[n.id]){const q=dayRoleTargets[n.id];hx=q.x;hz=q.z;r=q.r;}
        else if(evening&&eveningSlots[n.id]){const q=eveningSlots[n.id];hx=q.x;hz=q.z;r=.35;}
        const tx=hx+Math.sin(now/2600+n.phase)*r;
        const tz=hz+Math.cos(now/3100+n.phase)*r*.55;
        const dx=tx-n.object.position.x,dz=tz-n.object.position.z;
        n.object.position.x+=dx*Math.min(1,dt*.72);
        n.object.position.z+=dz*Math.min(1,dt*.72);
        if(Math.abs(dx)+Math.abs(dz)>.01)n.object.rotation.y=Math.atan2(dx,dz);
        const walking=Math.abs(dx)+Math.abs(dz)>.025;
        n.playAnim?.(walking?'walk':'idle');
        n.mixer?.update(dt);
        n.object.position.y=n.groundY+(walking?Math.abs(Math.sin(now/170+n.phase))*.012:0);
        if(n.label){n.label.position.set(n.object.position.x,2.12,n.object.position.z);n.label.visible=!!player&&Math.hypot(player.x-n.object.position.x,player.z-n.object.position.z)<3.4;}
        if(n.interaction){n.interaction.x=n.object.position.x;n.interaction.z=n.object.position.z;}
      }
    }
  };
}

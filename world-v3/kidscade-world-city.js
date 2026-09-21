import * as THREE from 'three';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import {CITY_BOUNDS,WORLD_GRID} from './kidscade-world-grid.js?v=3';
export {CITY_BOUNDS};

const ROOT=new URL('../assets/game/',import.meta.url);
const PEOPLE=new URL('characters/people/',ROOT).href;
const SUBURBAN=new URL('3d/city/kenney-city-kit-suburban/',ROOT).href;
const ROADS=new URL('3d/city/kenney-city-kit-roads/',ROOT).href;
const POLY=new URL('3d/city/poly-pizza-city-pack/',ROOT).href;
const MARKET=new URL('shops/market/',ROOT).href;
const FURNITURE=new URL('3d/interiors/kenney-furniture-kit/',ROOT).href;

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
  model.traverse(n=>{if(n.isSkinnedMesh)n.frustumCulled=false;});
  const mixer=new THREE.AnimationMixer(model);
  const clips=Array.isArray(gltf.animations)?gltf.animations:[];
  const idleClip=clips.find(c=>/idle|stand/i.test(c.name))||clips[0]||null;
  const walkSource=clips.find(c=>/walk|run/i.test(c.name))||idleClip;
  // KayKit/UnityGLTF walk clips contain root.position translation (root motion).
  // The NPC anchor already handles world movement, so keeping that track makes the body drift away
  // while labels/interactions remain at the correct town position.
  const walkClip=walkSource?walkSource.clone():null;
  if(walkClip)walkClip.tracks=walkClip.tracks.filter(t=>!/^root\.position$/i.test(t.name));
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
  return {id,name,object:anchor,model,mixer,playAnim,label:tag,interaction:null,homeX:x,homeZ:z,groundY:.025,r:radius,role,phase:(id.length*1.37)%6.2,targetX:x,targetZ:z,nextDecision:0,moving:false,anchorX:x,anchorZ:z};
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
  const {parent,addModel,box,plane,interact,collider,loadGLTF,prepModel,actions,getGameTime,getPlayerPosition}=ctx;
  const layout=[],buildingLabels=[];
  const track=(id,type,x,z,w,d)=>{layout.push({id,type,x,z,w,d});return {id,type,x,z,w,d}};
  const p=(id,dx=0,dz=0)=>{const c=WORLD_GRID[id];return {x:c.cx+dx,z:c.cz+dz}};

  // Road-first city: asphalt occupies ONLY the 4m gutters between 20x20 city parcels.
  box(parent,0,36,44,4,.09,0x62696d,-.01);    // between lower / upper city squares
  box(parent,0,36,4,44,.09,0x62696d,-.01);    // between west / east city squares
  box(parent,0,12,44,4,.09,0x62696d,-.01);    // shared approach from home/farm
  track('city-road-mid-horizontal','road',0,36,44,4);
  track('city-road-mid-vertical','road',0,36,4,44);
  track('city-road-south','road',0,12,44,4);

  // Sidewalk ribbons live just INSIDE each parcel, parallel to the road gutters.
  for(const x of [-2.55,2.55])plane(parent,x,36,.7,44,0xe6dfca,.06);
  for(const z of [33.45,38.55])plane(parent,0,z,44,.7,0xe6dfca,.06);
  for(const z of [14.55])plane(parent,0,z,44,.7,0xe6dfca,.06);

  // Crosswalks connect the exact centers of parcel entrances.
  for(const x of [-12,12]){
    for(const z of [10.8,11.55,12.3,13.05])plane(parent,x,z,3.0,.34,0xf3eee1,.11);
    for(const z of [34.8,35.55,36.3,37.05])plane(parent,x,z,3.0,.34,0xf3eee1,.11);
  }
  for(const z of [24,48]){
    for(const x of [-1.4,-.65,.1,.85])plane(parent,x,z,.34,3.0,0xf3eee1,.11);
  }

  const market=p('cityMarket'),leisure=p('cityLeisure'),civic=p('cityCivic'),transit=p('cityTransit');
  const buildings=[
    ['market',CITY_ASSET.market,market.x-4.7,market.z-5.2,6.0,5.2,'씨앗마트',2.25],
    ['hardware',CITY_ASSET.hardware,market.x+4.7,market.z-5.2,6.0,5.2,'튼튼 철물점',2.25],
    ['cafe',CITY_ASSET.cafe,leisure.x-4.7,leisure.z-5.2,6.0,5.2,'하늘 카페',2.25],
    ['arcade',CITY_ASSET.arcade,leisure.x+4.7,leisure.z-5.2,6.0,5.2,'키즈 아케이드',2.25],
    ['library',CITY_ASSET.library,civic.x-4.7,civic.z-5.0,6.2,5.0,'마을 도서관',2.25],
    ['civic',CITY_ASSET.civic,civic.x+4.7,civic.z-5.0,6.6,5.0,'마을회관',2.25],
    ['clinic',CITY_ASSET.clinic,transit.x-4.7,transit.z-5.0,6.2,5.0,'튼튼 보건소',2.25]
  ];
  for(const [id,url,x,z,w,d,name,labelDz] of buildings){
    await addModel(parent,url,{x,z,w,h:5.0,d,rot:Math.PI,name:'city-'+id});
    collider('outdoor',x,z,w*.82,d*.70);track('building-'+id,'building',x,z,w*.82,d*.70);
    const label=makeLabel(name,{width:1.9,height:.44,font:33});
    label.position.set(x,3.72,z+labelDz);label.userData.anchor={x,z:z+labelDz};label.visible=false;
    parent.add(label);buildingLabels.push(label);
  }

  // Commerce props stay deep inside the market parcel, never on the south or center roads.
  await Promise.all([
    addModel(parent,CITY_ASSET.fruit,{x:market.x-5.6,z:market.z+.5,w:1.6,h:1.35,d:1.0,rot:0,name:'market-fruit'}),
    addModel(parent,CITY_ASSET.bread,{x:market.x-3.4,z:market.z+.5,w:1.6,h:1.35,d:1.0,rot:0,name:'market-bread'}),
    addModel(parent,CITY_ASSET.register,{x:market.x-4.5,z:market.z+.1,w:.8,h:.62,d:.7,rot:Math.PI,name:'market-register'}),
    addModel(parent,CITY_ASSET.cart,{x:market.x-.8,z:market.z+.4,w:1.0,h:.95,d:1.1,rot:.1,name:'market-cart'}),
    addModel(parent,CITY_ASSET.atm,{x:market.x-7.2,z:market.z+.4,w:.75,h:1.45,d:.65,rot:Math.PI/2,name:'market-atm'})
  ]);
  track('market-display','decor',market.x-4.0,market.z+.5,7.0,1.6);

  // Leisure parcel keeps a large empty center for NPCs and events.
  await Promise.all([
    addModel(parent,CITY_ASSET.bench,{x:leisure.x-4.4,z:leisure.z+3.0,w:2.0,h:.95,d:.78,rot:Math.PI/2,name:'plaza-bench-west'}),
    addModel(parent,CITY_ASSET.bench,{x:leisure.x+4.4,z:leisure.z+3.0,w:2.0,h:.95,d:.78,rot:-Math.PI/2,name:'plaza-bench-east'}),
    addModel(parent,CITY_ASSET.planter,{x:leisure.x-6.5,z:leisure.z+2.7,w:1.2,h:.85,d:.85,rot:0,name:'plaza-planter-west'}),
    addModel(parent,CITY_ASSET.planter,{x:leisure.x+6.5,z:leisure.z+2.7,w:1.2,h:.85,d:.85,rot:0,name:'plaza-planter-east'})
  ]);

  // Civic parcel.
  await Promise.all([
    addModel(parent,CITY_ASSET.mailbox,{x:civic.x,z:civic.z+1.8,w:.7,h:1.25,d:.6,rot:0,name:'town-mailbox'}),
    addModel(parent,CITY_ASSET.planter,{x:civic.x,z:civic.z+6.4,w:1.2,h:.85,d:.85,rot:0,name:'civic-planter'})
  ]);

  // Transit / clinic parcel.
  await Promise.all([
    addModel(parent,CITY_ASSET.busStop,{x:transit.x+4.8,z:transit.z+2.0,w:2.7,h:2.5,d:1.5,rot:-Math.PI/2,name:'seed-bus-stop'}),
    addModel(parent,CITY_ASSET.busSign,{x:transit.x+3.1,z:transit.z+.2,w:.55,h:2.2,d:.55,rot:0,name:'seed-bus-sign'}),
    addModel(parent,CITY_ASSET.bicycle,{x:transit.x+6.2,z:transit.z+5.7,w:1.55,h:1.15,d:.55,rot:.25,name:'town-bicycle'})
  ]);
  track('transport-corner','decor',transit.x+4.8,transit.z+2.4,6.4,7.2);

  // Lamps are also kept inside parcels, at least 1m from the road gutter.
  for(const [x,z] of [
    [market.x-8,market.z+3.0],[market.x+8,market.z+3.0],
    [leisure.x-8,leisure.z+3.0],[leisure.x+8,leisure.z+3.0],
    [civic.x-8,civic.z+3.0],[civic.x+8,civic.z+3.0],
    [transit.x-8,transit.z+3.0],[transit.x+8,transit.z+3.0]
  ])await addModel(parent,CITY_ASSET.lamp,{x,z,w:.5,h:3.4,d:.5,rot:0});

  const npcCtx={parent,loadGLTF,prepModel};
  const npcs=[];
  npcs.push(await addNpc(npcCtx,'minji','민지',market.x-4.7,market.z-1.0,{role:'shop'}));
  npcs.push(await addNpc(npcCtx,'junho','준호',market.x+4.7,market.z-1.0,{role:'shop'}));
  npcs.push(await addNpc(npcCtx,'haneul','하늘',leisure.x-4.7,leisure.z-1.0,{role:'shop'}));
  npcs.push(await addNpc(npcCtx,'taeho','태호',leisure.x+4.7,leisure.z-1.0,{role:'arcade'}));
  npcs.push(await addNpc(npcCtx,'doyun','도윤',civic.x+4.5,civic.z+1.0,{role:'civic',radius:.45}));
  npcs.push(await addNpc(npcCtx,'sora','소라',civic.x-4.5,civic.z+1.0,{role:'library'}));
  npcs.push(await addNpc(npcCtx,'nari','나리',transit.x-4.5,transit.z+1.0,{role:'clinic'}));
  npcs.push(await addNpc(npcCtx,'minseok','민석',transit.x+4.5,transit.z+1.0,{role:'bus'}));
  npcs.push(await addNpc(npcCtx,'yuna','유나',leisure.x-4.0,leisure.z+4.2,{role:'resident',radius:.55}));
  npcs.push(await addNpc(npcCtx,'woojin','우진',leisure.x,leisure.z+4.8,{role:'resident',radius:.55}));
  npcs.push(await addNpc(npcCtx,'seoyeon','서연',leisure.x+4.0,leisure.z+4.2,{role:'resident',radius:.55}));
  npcs.push(await addNpc(npcCtx,'hyunwoo','현우',market.x,market.z+4.5,{role:'delivery',radius:.45}));
  npcs.push(await addNpc(npcCtx,'clerk','마트직원',market.x-6.6,market.z-1.2,{role:'shop',label:false,radius:.20}));

  const byId=Object.fromEntries(npcs.map(n=>[n.id,n]));
  function bind(id,r,label,action){
    const n=byId[id];if(!n)return;
    n.interaction=interact('outdoor',n.object.position.x,n.object.position.z,r,label,action);
  }
  for(const [id,label] of [
    ['minji','민지와 이야기하기'],['junho','준호와 이야기하기'],['haneul','하늘과 이야기하기'],
    ['taeho','태호와 이야기하기'],['doyun','도윤과 이야기하기'],['sora','소라와 이야기하기'],
    ['nari','나리와 이야기하기'],['minseok','민석과 이야기하기'],['yuna','유나와 이야기하기'],
    ['woojin','우진과 이야기하기'],['seoyeon','서연과 이야기하기'],['hyunwoo','현우와 이야기하기']
  ])bind(id,id==='minseok'?1.45:1.35,label,()=>actions.resident(id));

  interact('outdoor',leisure.x-4.4,leisure.z+3.0,1.2,'광장 벤치에서 쉬기',()=>actions.bench());
  interact('outdoor',leisure.x+4.4,leisure.z+3.0,1.2,'광장 벤치에서 쉬기',()=>actions.bench());

  validateMapLayout(layout);

  const eveningSlots={
    doyun:{x:leisure.x-3.8,z:leisure.z+4.0},
    yuna:{x:leisure.x-1.9,z:leisure.z+4.4},
    hyunwoo:{x:leisure.x,z:leisure.z+3.8},
    woojin:{x:leisure.x+2.0,z:leisure.z+4.4},
    seoyeon:{x:leisure.x+3.8,z:leisure.z+4.0}
  };
  const dayRoleTargets={
    yuna:{x:leisure.x-4.0,z:leisure.z+4.2,r:.35},
    woojin:{x:leisure.x,z:leisure.z+4.8,r:.35},
    seoyeon:{x:leisure.x+4.0,z:leisure.z+4.2,r:.35},
    hyunwoo:{x:market.x,z:market.z+4.5,r:.35}
  };

  function chooseNpcDecision(n,hx,hz,r,now){
    const mostlyStationary=['shop','arcade','library','clinic','bus','civic'].includes(n.role);
    const pauseChance=mostlyStationary?.82:.55;
    n.anchorX=hx;n.anchorZ=hz;
    n.nextDecision=now+(mostlyStationary?2800:1800)+Math.random()*(mostlyStationary?4200:3000);
    if(Math.random()<pauseChance){
      n.moving=false;n.targetX=n.object.position.x;n.targetZ=n.object.position.z;return;
    }
    n.targetX=hx+(Math.random()*2-1)*r;
    n.targetZ=hz+(Math.random()*2-1)*r*.62;
    n.moving=true;
  }

  return {
    npcs,bounds:CITY_BOUNDS,
    update(now,dt){
      const minutes=typeof getGameTime==='function'?getGameTime():720;
      const hour=minutes/60,evening=hour>=18&&hour<23,daytime=hour>=7&&hour<18;
      const player=typeof getPlayerPosition==='function'?getPlayerPosition():null;
      for(const label of buildingLabels){
        const a=label.userData.anchor;label.visible=!!player&&Math.hypot(player.x-a.x,player.z-a.z)<7.5;
      }
      for(const n of npcs){
        let hx=n.homeX,hz=n.homeZ,r=n.r;
        if(daytime&&dayRoleTargets[n.id]){const q=dayRoleTargets[n.id];hx=q.x;hz=q.z;r=q.r;}
        else if(evening&&eveningSlots[n.id]){const q=eveningSlots[n.id];hx=q.x;hz=q.z;r=.30;}
        const anchorShift=Math.hypot((n.anchorX??hx)-hx,(n.anchorZ??hz)-hz);
        if(anchorShift>.12){
          n.anchorX=hx;n.anchorZ=hz;n.targetX=hx;n.targetZ=hz;n.moving=true;n.nextDecision=now+900;
        }else if(now>=n.nextDecision){
          chooseNpcDecision(n,hx,hz,r,now);
        }
        let walking=false;
        if(n.moving){
          const dx=n.targetX-n.object.position.x,dz=n.targetZ-n.object.position.z,d=Math.hypot(dx,dz);
          if(d<.055){
            n.moving=false;n.nextDecision=now+1800+Math.random()*3200;
          }else{
            const speed=['shop','arcade','library','clinic','bus','civic'].includes(n.role)?.38:.58;
            const step=Math.min(d,speed*dt);
            n.object.position.x+=dx/d*step;n.object.position.z+=dz/d*step;
            n.object.rotation.y=Math.atan2(dx,dz);walking=true;
          }
        }
        n.playAnim?.(walking?'walk':'idle');n.mixer?.update(dt);
        n.object.position.y=n.groundY+(walking?Math.abs(Math.sin(now/170+n.phase))*.010:0);
        if(n.label){
          n.label.position.set(n.object.position.x,2.12,n.object.position.z);
          n.label.visible=!!player&&Math.hypot(player.x-n.object.position.x,player.z-n.object.position.z)<3.4;
        }
        if(n.interaction){n.interaction.x=n.object.position.x;n.interaction.z=n.object.position.z;}
      }
    }
  };
}

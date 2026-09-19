import * as THREE from 'three';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import {CITY_BOUNDS,WORLD_GRID} from './kidscade-world-grid.js?v=1';
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

  // Four city cells are already drawn by the world grid. Internal roads sit exactly on cell borders.
  box(parent,0,30,40,3.2,.06,0x666d70,.025);   // horizontal city divider
  box(parent,0,30,3.2,40,.06,0x666d70,.025);   // vertical city divider

  const roadZ=[12,16,20,24,28,32,36,40,44,48];
  const roadX=[-18,-14,-10,-6,-2,2,6,10,14,18];
  const roadModels=[];
  for(const z of roadZ){
    if(Math.abs(z-30)<1)continue;
    roadModels.push(addModel(parent,CITY_ASSET.road,{x:0,z,w:4,h:.28,d:4,rot:0,name:'city-road-v-'+z}));
  }
  for(const x of roadX){
    if(Math.abs(x)<1)continue;
    roadModels.push(addModel(parent,CITY_ASSET.road,{x,z:30,w:4,h:.28,d:4,rot:Math.PI/2,name:'city-road-h-'+x}));
  }
  roadModels.push(addModel(parent,CITY_ASSET.cross,{x:0,z:30,w:4,h:.28,d:4,rot:0,name:'city-road-cross'}));
  await Promise.all(roadModels);
  track('city-road-horizontal','road',0,30,40,3.2);
  track('city-road-vertical','road',0,30,3.2,40);

  // Each city square has its own pedestrian floor and centered entrance from the square above.
  plane(parent,-10,21.8,18.5,4.0,0xd4c8aa,.12);
  plane(parent,10,24.0,18.5,7.0,0xcfbf99,.12);
  plane(parent,-10,36.0,18.5,6.0,0xd4c8aa,.12);
  plane(parent,10,39.0,18.5,8.0,0xd0c3a6,.12);
  plane(parent,-10,14.5,3.0,9.0,0xd8c79c,.13);
  plane(parent,10,14.5,3.0,9.0,0xd8c79c,.13);
  for(const x of [-10,10])for(const z of [28.8,29.6,30.4,31.2])plane(parent,x,z,3.0,.28,0xf2ead6,.15);

  const buildings=[
    ['market',CITY_ASSET.market,-15.0,17.0,6.0,5.2,'씨앗마트',2.25],
    ['hardware',CITY_ASSET.hardware,-5.0,17.0,6.0,5.2,'튼튼 철물점',2.25],
    ['cafe',CITY_ASSET.cafe,5.0,17.0,6.0,5.2,'하늘 카페',2.25],
    ['arcade',CITY_ASSET.arcade,15.0,17.0,6.0,5.2,'키즈 아케이드',2.25],
    ['library',CITY_ASSET.library,-15.0,38.0,6.2,5.0,'마을 도서관',-2.25],
    ['civic',CITY_ASSET.civic,-5.0,38.0,7.0,5.0,'마을회관',-2.25],
    ['clinic',CITY_ASSET.clinic,5.0,38.0,6.2,5.0,'튼튼 보건소',-2.25]
  ];
  for(const [id,url,x,z,w,d,name,labelDz] of buildings){
    await addModel(parent,url,{x,z,w,h:5.0,d,rot:Math.PI,name:'city-'+id});
    collider('outdoor',x,z,w*.82,d*.70);track('building-'+id,'building',x,z,w*.82,d*.70);
    const label=makeLabel(name,{width:1.9,height:.44,font:33});
    label.position.set(x,3.72,z+labelDz);label.userData.anchor={x,z:z+labelDz};label.visible=false;
    parent.add(label);buildingLabels.push(label);
  }

  // Commerce cell (-20..0 / 10..30).
  await Promise.all([
    addModel(parent,CITY_ASSET.fruit,{x:-16.2,z:20.7,w:1.6,h:1.35,d:1.0,rot:0,name:'market-fruit'}),
    addModel(parent,CITY_ASSET.bread,{x:-14.2,z:20.7,w:1.6,h:1.35,d:1.0,rot:0,name:'market-bread'}),
    addModel(parent,CITY_ASSET.register,{x:-15.2,z:20.3,w:.8,h:.62,d:.7,rot:Math.PI,name:'market-register'}),
    addModel(parent,CITY_ASSET.cart,{x:-11.8,z:20.6,w:1.0,h:.95,d:1.1,rot:.1,name:'market-cart'}),
    addModel(parent,CITY_ASSET.atm,{x:-18.0,z:20.6,w:.75,h:1.45,d:.65,rot:Math.PI/2,name:'market-atm'})
  ]);
  track('market-display','decor',-15.0,20.7,6.6,1.5);

  // Leisure cell (0..20 / 10..30): open plaza remains readable and event-ready.
  await Promise.all([
    addModel(parent,CITY_ASSET.bench,{x:6.5,z:25.0,w:2.0,h:.95,d:.78,rot:Math.PI/2,name:'plaza-bench-west'}),
    addModel(parent,CITY_ASSET.bench,{x:13.5,z:25.0,w:2.0,h:.95,d:.78,rot:-Math.PI/2,name:'plaza-bench-east'}),
    addModel(parent,CITY_ASSET.planter,{x:4.0,z:24.7,w:1.2,h:.85,d:.85,rot:0,name:'plaza-planter-west'}),
    addModel(parent,CITY_ASSET.planter,{x:16.0,z:24.7,w:1.2,h:.85,d:.85,rot:0,name:'plaza-planter-east'})
  ]);

  // Civic cell (-20..0 / 30..50).
  await Promise.all([
    addModel(parent,CITY_ASSET.mailbox,{x:-10.0,z:34.0,w:.7,h:1.25,d:.6,rot:0,name:'town-mailbox'}),
    addModel(parent,CITY_ASSET.planter,{x:-10.0,z:42.5,w:1.2,h:.85,d:.85,rot:0,name:'civic-planter'})
  ]);

  // Transit/health cell (0..20 / 30..50).
  await Promise.all([
    addModel(parent,CITY_ASSET.busStop,{x:15.0,z:40.5,w:2.7,h:2.5,d:1.5,rot:-Math.PI/2,name:'seed-bus-stop'}),
    addModel(parent,CITY_ASSET.busSign,{x:13.5,z:38.8,w:.55,h:2.2,d:.55,rot:0,name:'seed-bus-sign'}),
    addModel(parent,CITY_ASSET.bicycle,{x:16.8,z:44.0,w:1.55,h:1.15,d:.55,rot:.25,name:'town-bicycle'})
  ]);
  track('transport-corner','decor',15.0,41.0,6.0,7.0);

  // Lamps stay on cell sidewalks, never in the 3m road corridors.
  for(const [x,z] of [[-18,23],[-2,23],[2,23],[18,23],[-18,34],[-2,34],[2,34],[18,34],[-18,46],[-2,46],[2,46],[18,46]]){
    await addModel(parent,CITY_ASSET.lamp,{x,z,w:.5,h:3.4,d:.5,rot:0});
  }

  const npcCtx={parent,loadGLTF,prepModel};
  const npcs=[];
  npcs.push(await addNpc(npcCtx,'minji','민지',-15.0,20.4,{role:'shop'}));
  npcs.push(await addNpc(npcCtx,'junho','준호',-5.0,20.4,{role:'shop'}));
  npcs.push(await addNpc(npcCtx,'haneul','하늘',5.0,20.4,{role:'shop'}));
  npcs.push(await addNpc(npcCtx,'taeho','태호',15.0,20.4,{role:'arcade'}));
  npcs.push(await addNpc(npcCtx,'doyun','도윤',-5.0,34.5,{role:'civic',radius:.45}));
  npcs.push(await addNpc(npcCtx,'sora','소라',-15.0,34.5,{role:'library'}));
  npcs.push(await addNpc(npcCtx,'nari','나리',5.0,34.5,{role:'clinic'}));
  npcs.push(await addNpc(npcCtx,'minseok','민석',15.0,38.0,{role:'bus'}));
  npcs.push(await addNpc(npcCtx,'yuna','유나',7.0,24.0,{role:'resident',radius:.55}));
  npcs.push(await addNpc(npcCtx,'woojin','우진',10.0,25.0,{role:'resident',radius:.55}));
  npcs.push(await addNpc(npcCtx,'seoyeon','서연',13.0,24.0,{role:'resident',radius:.55}));
  npcs.push(await addNpc(npcCtx,'hyunwoo','현우',-10.0,23.5,{role:'delivery',radius:.45}));
  npcs.push(await addNpc(npcCtx,'clerk','마트직원',-17.0,20.2,{role:'shop',label:false,radius:.20}));

  const byId=Object.fromEntries(npcs.map(n=>[n.id,n]));
  function bind(id,r,label,action){
    const n=byId[id];if(!n)return;
    n.interaction=interact('outdoor',n.object.position.x,n.object.position.z,r,label,action);
  }
  bind('minji',1.35,'민지와 이야기하기',()=>actions.resident('minji'));
  bind('junho',1.35,'준호와 이야기하기',()=>actions.resident('junho'));
  bind('haneul',1.35,'하늘과 이야기하기',()=>actions.resident('haneul'));
  bind('taeho',1.35,'태호와 이야기하기',()=>actions.resident('taeho'));
  bind('doyun',1.35,'도윤과 이야기하기',()=>actions.resident('doyun'));
  bind('sora',1.35,'소라와 이야기하기',()=>actions.resident('sora'));
  bind('nari',1.35,'나리와 이야기하기',()=>actions.resident('nari'));
  bind('minseok',1.45,'민석과 이야기하기',()=>actions.resident('minseok'));
  bind('yuna',1.35,'유나와 이야기하기',()=>actions.resident('yuna'));
  bind('woojin',1.35,'우진과 이야기하기',()=>actions.resident('woojin'));
  bind('seoyeon',1.35,'서연과 이야기하기',()=>actions.resident('seoyeon'));
  bind('hyunwoo',1.35,'현우와 이야기하기',()=>actions.resident('hyunwoo'));

  interact('outdoor',6.5,25.0,1.2,'광장 벤치에서 쉬기',()=>actions.bench());
  interact('outdoor',13.5,25.0,1.2,'광장 벤치에서 쉬기',()=>actions.bench());

  validateMapLayout(layout);

  const eveningSlots={
    doyun:{x:7.2,z:24.5},yuna:{x:8.5,z:25.0},hyunwoo:{x:10.0,z:24.0},
    woojin:{x:11.5,z:25.0},seoyeon:{x:12.8,z:24.5}
  };
  const dayRoleTargets={
    yuna:{x:7.0,z:24.0,r:.35},
    woojin:{x:10.0,z:25.0,r:.35},
    seoyeon:{x:13.0,z:24.0,r:.35},
    hyunwoo:{x:-10.0,z:23.5,r:.35}
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

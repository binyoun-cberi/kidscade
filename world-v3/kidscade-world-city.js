import * as THREE from 'three';

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
  traffic:ROADS+'traffic-light.glb',
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
  basket:MARKET+'shopping-basket.glb',
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

function makeLabel(text){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,512,128);
  ctx.fillStyle='rgba(255,249,218,.94)';ctx.strokeStyle='#4b5841';ctx.lineWidth=8;
  const x=12,y=16,w=488,h=96,r=26;
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#2d3a2d';ctx.font='700 42px system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,65);
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
  const mat=new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false});
  const sp=new THREE.Sprite(mat);sp.scale.set(3.2,.8,1);sp.renderOrder=20;return sp;
}

async function addNpc(ctx,id,name,x,z,{radius=.48,role='resident',label=true}={}){
  const base=await ctx.loadGLB(NPC_MODELS[id]);
  const object=ctx.prepModel(base.clone(true));
  object.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(object),size=box.getSize(new THREE.Vector3());
  const scale=1.68/Math.max(.01,size.y);
  object.scale.multiplyScalar(scale);object.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(object);
  object.position.set(x,-b.min.y,z);
  ctx.parent.add(object);
  const tag=label?makeLabel(name):null;
  if(tag){tag.position.set(x,2.05,z);ctx.parent.add(tag)}
  return {id,name,object,label:tag,homeX:x,homeZ:z,r:radius,role,phase:(id.length*1.37)%6.2};
}

export async function buildKidscadeCity(ctx){
  const {parent,addModel,box,plane,interact,collider,loadGLB,prepModel,actions,getGameTime}=ctx;

  // The city is part of the same continuous world, south of the campsite.
  plane(parent,0,29,52,18,0xb8b09a,.012);
  box(parent,0,29,52,18,.20,0x9e9a86,-.20);
  box(parent,0,29,50,3.0,.10,0x6e7376,.03);
  box(parent,0,24.4,3.0,7.0,.10,0x6e7376,.03);
  box(parent,0,34.0,3.0,7.0,.10,0x6e7376,.03);

  await Promise.all([
    addModel(parent,CITY_ASSET.cross,{x:0,z:29,w:4.2,h:.32,d:4.2,rot:0}),
    addModel(parent,CITY_ASSET.road,{x:-4.1,z:29,w:4.0,h:.32,d:4.0,rot:Math.PI/2}),
    addModel(parent,CITY_ASSET.road,{x:4.1,z:29,w:4.0,h:.32,d:4.0,rot:Math.PI/2}),
    addModel(parent,CITY_ASSET.road,{x:-8.2,z:29,w:4.0,h:.32,d:4.0,rot:Math.PI/2}),
    addModel(parent,CITY_ASSET.road,{x:8.2,z:29,w:4.0,h:.32,d:4.0,rot:Math.PI/2}),
    addModel(parent,CITY_ASSET.road,{x:0,z:25,w:4.0,h:.32,d:4.0,rot:0}),
    addModel(parent,CITY_ASSET.road,{x:0,z:33,w:4.0,h:.32,d:4.0,rot:0})
  ]);

  const buildings=[
    ['market',CITY_ASSET.market,-18.0,25.7,6.0,5.2,'씨앗마트'],
    ['hardware',CITY_ASSET.hardware,-9.7,25.7,6.0,5.2,'튼튼 철물점'],
    ['cafe',CITY_ASSET.cafe,9.7,25.7,6.0,5.2,'하늘 카페'],
    ['arcade',CITY_ASSET.arcade,18.0,25.7,6.0,5.2,'키즈 아케이드'],
    ['library',CITY_ASSET.library,-13.2,35.6,6.2,5.0,'마을 도서관'],
    ['civic',CITY_ASSET.civic,0,35.7,7.2,5.0,'마을회관'],
    ['clinic',CITY_ASSET.clinic,13.2,35.6,6.2,5.0,'튼튼 보건소']
  ];
  for(const [id,url,x,z,w,d,name] of buildings){
    await addModel(parent,url,{x,z,w,h:5.0,d,rot:Math.PI,name:'city-'+id});
    collider('outdoor',x,z,w*.82,d*.70);
    const s=makeLabel(name);s.position.set(x,3.75,z+2.15);parent.add(s);
  }

  await Promise.all([
    addModel(parent,CITY_ASSET.fruit,{x:-19.5,z:29.2,w:1.8,h:1.45,d:1.2,rot:0}),
    addModel(parent,CITY_ASSET.bread,{x:-17.0,z:29.2,w:1.8,h:1.45,d:1.2,rot:0}),
    addModel(parent,CITY_ASSET.cart,{x:-15.0,z:30.1,w:1.1,h:1.0,d:1.2,rot:.25}),
    addModel(parent,CITY_ASSET.register,{x:-18.2,z:30.4,w:.85,h:.65,d:.75,rot:Math.PI}),
    addModel(parent,CITY_ASSET.bench,{x:4.8,z:31.9,w:2.1,h:1.0,d:.8,rot:0}),
    addModel(parent,CITY_ASSET.bench,{x:-4.8,z:31.9,w:2.1,h:1.0,d:.8,rot:Math.PI}),
    addModel(parent,CITY_ASSET.busStop,{x:22.0,z:33.2,w:2.7,h:2.5,d:1.5,rot:-Math.PI/2}),
    addModel(parent,CITY_ASSET.busSign,{x:20.7,z:32.1,w:.55,h:2.2,d:.55,rot:0}),
    addModel(parent,CITY_ASSET.bicycle,{x:18.8,z:34.3,w:1.6,h:1.2,d:.55,rot:.35}),
    addModel(parent,CITY_ASSET.mailbox,{x:-6.3,z:33.5,w:.75,h:1.3,d:.65,rot:0}),
    addModel(parent,CITY_ASSET.atm,{x:-21.0,z:30.3,w:.8,h:1.5,d:.7,rot:Math.PI/2}),
    addModel(parent,CITY_ASSET.planter,{x:7.0,z:33.3,w:2.0,h:1.0,d:1.0,rot:0})
  ]);

  for(const [x,z] of [[-23,23],[-12,23],[12,23],[23,23],[-23,34],[-6,34],[6,34],[23,34]]){
    await addModel(parent,CITY_ASSET.lamp,{x,z,w:.55,h:3.5,d:.55,rot:0});
  }
  await addModel(parent,CITY_ASSET.traffic,{x:2.4,z:27,w:.65,h:2.8,d:.65,rot:0});

  const npcCtx={parent,loadGLB,prepModel};
  const npcs=[];
  npcs.push(await addNpc(npcCtx,'minji','민지',-18.0,30.5,{role:'shop'}));
  npcs.push(await addNpc(npcCtx,'junho','준호',-9.7,30.4,{role:'shop'}));
  npcs.push(await addNpc(npcCtx,'haneul','하늘',9.7,30.3,{role:'shop'}));
  npcs.push(await addNpc(npcCtx,'doyun','도윤',0.0,33.0,{role:'civic'}));
  npcs.push(await addNpc(npcCtx,'yuna','유나',4.4,30.9,{radius:.9}));
  npcs.push(await addNpc(npcCtx,'taeho','태호',18.0,30.2,{role:'arcade'}));
  npcs.push(await addNpc(npcCtx,'sora','소라',-13.2,32.7,{role:'library'}));
  npcs.push(await addNpc(npcCtx,'hyunwoo','현우',-5.0,33.0,{role:'delivery'}));
  npcs.push(await addNpc(npcCtx,'nari','나리',13.2,32.8,{role:'clinic'}));
  npcs.push(await addNpc(npcCtx,'woojin','우진',-3.3,30.8,{radius:1.0}));
  npcs.push(await addNpc(npcCtx,'seoyeon','서연',2.2,31.6,{radius:1.0}));
  npcs.push(await addNpc(npcCtx,'minseok','민석',21.3,31.9,{role:'bus'}));
  npcs.push(await addNpc(npcCtx,'clerk','마트직원',-16.1,29.9,{role:'shop',label:false}));

  interact('outdoor',-18.0,30.5,1.35,'민지와 이야기하기',()=>actions.resident('minji'));
  interact('outdoor',-9.7,30.4,1.35,'준호와 이야기하기',()=>actions.resident('junho'));
  interact('outdoor',9.7,30.3,1.35,'하늘과 이야기하기',()=>actions.resident('haneul'));
  interact('outdoor',0.0,33.0,1.35,'도윤과 이야기하기',()=>actions.resident('doyun'));
  interact('outdoor',4.4,30.9,1.35,'유나와 이야기하기',()=>actions.resident('yuna'));
  interact('outdoor',18.0,30.2,1.35,'태호와 이야기하기',()=>actions.resident('taeho'));
  interact('outdoor',-13.2,32.7,1.35,'소라와 이야기하기',()=>actions.resident('sora'));
  interact('outdoor',-5.0,33.0,1.35,'현우와 이야기하기',()=>actions.resident('hyunwoo'));
  interact('outdoor',13.2,32.8,1.35,'나리와 이야기하기',()=>actions.resident('nari'));
  interact('outdoor',-3.3,30.8,1.35,'우진과 이야기하기',()=>actions.resident('woojin'));
  interact('outdoor',2.2,31.6,1.35,'서연과 이야기하기',()=>actions.resident('seoyeon'));
  interact('outdoor',21.3,31.9,1.45,'민석과 이야기하기',()=>actions.resident('minseok'));
  interact('outdoor',4.8,31.9,1.2,'도시 벤치에서 쉬기',()=>actions.bench());
  interact('outdoor',-4.8,31.9,1.2,'광장 벤치에서 쉬기',()=>actions.bench());

  return {
    npcs,
    update(now,dt){
      const minutes=typeof getGameTime==='function'?getGameTime():720;
      const hour=minutes/60,evening=hour>=18&&hour<23;
      for(let idx=0;idx<npcs.length;idx++){
        const n=npcs[idx];
        let hx=n.homeX,hz=n.homeZ,r=n.r;
        // Residents gather around the plaza in the evening; workers remain by their workplaces.
        if(evening&&n.role==='resident'){
          hx=-4+(idx%5)*2;hz=31.2+(idx%2)*1.0;r=.75;
        }
        const tx=hx+Math.sin(now/2600+n.phase)*r;
        const tz=hz+Math.cos(now/3100+n.phase)*r*.55;
        const dx=tx-n.object.position.x,dz=tz-n.object.position.z;
        n.object.position.x+=dx*Math.min(1,dt*.7);
        n.object.position.z+=dz*Math.min(1,dt*.7);
        if(Math.abs(dx)+Math.abs(dz)>.01)n.object.rotation.y=Math.atan2(dx,dz);
        n.object.position.y=Math.abs(Math.sin(now/420+n.phase))*.018;
        if(n.label)n.label.position.set(n.object.position.x,2.05,n.object.position.z);
      }
    }
  };
}

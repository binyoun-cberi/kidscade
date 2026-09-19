import * as THREE from 'three';

const ROOT=new URL('../assets/game/',import.meta.url);
const PEOPLE=new URL('characters/people/',ROOT).href;
const SUBURBAN=new URL('3d/city/kenney-city-kit-suburban/',ROOT).href;
const ROADS=new URL('3d/city/kenney-city-kit-roads/',ROOT).href;
const MARKET=new URL('shops/market/',ROOT).href;
const FURNITURE=new URL('3d/interiors/kenney-furniture-kit/',ROOT).href;

const CITY_ASSET={
  market:SUBURBAN+'building-type-b.glb',
  hardware:SUBURBAN+'building-type-c.glb',
  cafe:SUBURBAN+'building-type-d.glb',
  arcade:SUBURBAN+'building-type-e.glb',
  civic:SUBURBAN+'building-type-f.glb',
  road:ROADS+'road-straight.glb',
  cross:ROADS+'road-crossroad.glb',
  lamp:ROADS+'light-square.glb',
  traffic:ROADS+'traffic-light.glb',
  fruit:MARKET+'display-fruit.glb',
  bread:MARKET+'display-bread.glb',
  register:MARKET+'cash-register.glb',
  cart:MARKET+'shopping-cart.glb',
  basket:MARKET+'shopping-basket.glb',
  bench:FURNITURE+'bench.glb'
};
const NPC_MODELS={
  minji:PEOPLE+'character-female-a.glb',
  junho:PEOPLE+'character-male-a.glb',
  haneul:PEOPLE+'character-female-b.glb',
  doyun:PEOPLE+'character-male-b.glb',
  yuna:PEOPLE+'character-female-c.glb',
  taeho:PEOPLE+'character-male-c.glb'
};

function makeLabel(text){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,512,128);
  ctx.fillStyle='rgba(255,249,218,.94)';ctx.strokeStyle='#4b5841';ctx.lineWidth=8;
  const x=12,y=16,w=488,h=96,r=26;
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#2d3a2d';ctx.font='700 44px system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,65);
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
  const mat=new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false});
  const sp=new THREE.Sprite(mat);sp.scale.set(3.2,.8,1);sp.renderOrder=20;return sp;
}

async function addNpc(ctx,id,name,x,z,homeRadius=.55){
  const base=await ctx.loadGLB(NPC_MODELS[id]);
  const object=ctx.prepModel(base.clone(true));
  object.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(object),size=box.getSize(new THREE.Vector3());
  const scale=1.68/Math.max(.01,size.y);
  object.scale.multiplyScalar(scale);object.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(object);
  object.position.set(x,-b.min.y,z);
  ctx.parent.add(object);
  const label=makeLabel(name);label.position.set(x,2.05,z);ctx.parent.add(label);
  ctx.collider('outdoor',x,z,.55,.55);
  return {id,name,object,label,homeX:x,homeZ:z,r:homeRadius,phase:Math.random()*6.2};
}

export async function buildKidscadeCity(ctx){
  const {parent,addModel,box,plane,interact,collider,loadGLB,prepModel,actions}=ctx;
  // The city begins after the southern campsite and remains part of one continuous world.
  plane(parent,0,29,48,17,0xb8b09a,.012);
  box(parent,0,29,48,17,.20,0x9e9a86,-.20);
  box(parent,0,29,46,3.0,.10,0x6e7376,.03);
  box(parent,0,24.4,3.0,7.0,.10,0x6e7376,.03);
  box(parent,0,33.7,3.0,6.0,.10,0x6e7376,.03);

  // Actual Kenney roads mark the central crossing.
  await Promise.all([
    addModel(parent,CITY_ASSET.cross,{x:0,z:29,w:4.2,h:.32,d:4.2,rot:0}),
    addModel(parent,CITY_ASSET.road,{x:-4.1,z:29,w:4.0,h:.32,d:4.0,rot:Math.PI/2}),
    addModel(parent,CITY_ASSET.road,{x:4.1,z:29,w:4.0,h:.32,d:4.0,rot:Math.PI/2}),
    addModel(parent,CITY_ASSET.road,{x:0,z:25,w:4.0,h:.32,d:4.0,rot:0}),
    addModel(parent,CITY_ASSET.road,{x:0,z:33,w:4.0,h:.32,d:4.0,rot:0})
  ]);

  const buildings=[
    ['market',CITY_ASSET.market,-15.5,25.8,6.0,5.2],
    ['hardware',CITY_ASSET.hardware,-7.4,25.8,6.0,5.2],
    ['cafe',CITY_ASSET.cafe,8.0,25.8,6.0,5.2],
    ['arcade',CITY_ASSET.arcade,16.0,25.8,6.0,5.2],
    ['civic',CITY_ASSET.civic,0,35.4,7.2,5.2]
  ];
  for(const [id,url,x,z,w,d] of buildings){
    await addModel(parent,url,{x,z,w,h:5.0,d,rot:Math.PI,name:'city-'+id});
    collider('outdoor',x,z,w*.82,d*.70);
  }

  // Outdoor market props make shopping visibly different from a menu-only building.
  await Promise.all([
    addModel(parent,CITY_ASSET.fruit,{x:-17.2,z:29.0,w:1.8,h:1.45,d:1.2,rot:0}),
    addModel(parent,CITY_ASSET.bread,{x:-14.7,z:29.0,w:1.8,h:1.45,d:1.2,rot:0}),
    addModel(parent,CITY_ASSET.cart,{x:-12.8,z:30.0,w:1.1,h:1.0,d:1.2,rot:.25}),
    addModel(parent,CITY_ASSET.register,{x:-15.8,z:30.3,w:.85,h:.65,d:.75,rot:Math.PI}),
    addModel(parent,CITY_ASSET.bench,{x:4.8,z:31.9,w:2.1,h:1.0,d:.8,rot:0})
  ]);

  for(const [x,z] of [[-20,23],[-10,23],[10,23],[20,23],[-20,34],[-10,34],[10,34],[20,34]]){
    await addModel(parent,CITY_ASSET.lamp,{x,z,w:.55,h:3.5,d:.55,rot:0});
  }
  await addModel(parent,CITY_ASSET.traffic,{x:2.4,z:27,w:.65,h:2.8,d:.65,rot:0});

  const labels=[
    ['씨앗마트',-15.5,3.7,28.0],
    ['튼튼 철물점',-7.4,3.7,28.0],
    ['하늘 카페',8.0,3.7,28.0],
    ['키즈 아케이드',16.0,3.7,28.0],
    ['마을회관',0,3.8,33.1]
  ];
  for(const [name,x,y,z] of labels){const s=makeLabel(name);s.position.set(x,y,z);parent.add(s)}

  const npcCtx={parent,loadGLB,prepModel,collider};
  const npcs=[];
  npcs.push(await addNpc(npcCtx,'minji','민지',-15.6,30.5));
  npcs.push(await addNpc(npcCtx,'junho','준호',-7.3,30.4));
  npcs.push(await addNpc(npcCtx,'haneul','하늘',8.0,30.3));
  npcs.push(await addNpc(npcCtx,'doyun','도윤',1.8,33.2));
  npcs.push(await addNpc(npcCtx,'yuna','유나',4.8,31.1,.9));
  npcs.push(await addNpc(npcCtx,'taeho','태호',15.5,30.2));

  interact('outdoor',-15.6,30.5,1.35,'민지에게 장보기',()=>actions.shop('market','민지'));
  interact('outdoor',-7.3,30.4,1.35,'준호에게 도구·재료 사기',()=>actions.shop('hardware','준호'));
  interact('outdoor',8.0,30.3,1.35,'하늘 카페 이용하기',()=>actions.shop('cafe','하늘'));
  interact('outdoor',1.8,33.2,1.35,'도윤에게 일자리 알아보기',()=>actions.jobs());
  interact('outdoor',4.8,31.1,1.35,'유나와 이야기하기',()=>actions.talk('yuna','유나'));
  interact('outdoor',15.5,30.2,1.35,'태호와 아케이드 놀기',()=>actions.arcade());
  interact('outdoor',4.8,31.9,1.2,'도시 벤치에서 쉬기',()=>actions.bench());

  return {
    npcs,
    update(now,dt){
      // Small idle/wander movement around each assigned place.
      for(const n of npcs){
        const tx=n.homeX+Math.sin(now/2600+n.phase)*n.r;
        const tz=n.homeZ+Math.cos(now/3100+n.phase)*n.r*.55;
        const dx=tx-n.object.position.x,dz=tz-n.object.position.z;
        n.object.position.x+=dx*Math.min(1,dt*.7);
        n.object.position.z+=dz*Math.min(1,dt*.7);
        if(Math.abs(dx)+Math.abs(dz)>.01)n.object.rotation.y=Math.atan2(dx,dz);
        n.object.position.y=Math.abs(Math.sin(now/420+n.phase))*.018;
        n.label.position.set(n.object.position.x,2.05,n.object.position.z);
      }
    }
  };
}

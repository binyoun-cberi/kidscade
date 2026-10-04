import * as THREE from 'three';

const ROOT=new URL('../assets/game/',import.meta.url);
const MARKET=new URL('shops/market/',ROOT).href;
const BAKERY=new URL('3d/bakery/interior/',ROOT).href;
const SURVIVAL=new URL('3d/survival/kenney-survival-kit/',ROOT).href;
const PEOPLE=new URL('characters/people/',ROOT).href;

export const VENUE_MODES={
  market:'venue-market',
  hardware:'venue-hardware',
  cafe:'venue-cafe',
  museum:'venue-museum'
};

export const VENUE_INFO={
  market:{name:'씨앗마트',npc:'민지',npcId:'minji',model:PEOPLE+'character-female-a.glb'},
  hardware:{name:'튼튼 철물점',npc:'준호',npcId:'junho',model:PEOPLE+'character-male-a.glb'},
  cafe:{name:'하늘 카페',npc:'하늘',npcId:'haneul',model:PEOPLE+'character-female-b.glb'},
  museum:{name:'씨앗 자연박물관'}
};

export const VENUE_BOUNDS={x1:-5.45,x2:5.45,z1:-3.85,z2:3.85};

function canvasLabel(text,{width=3.1,height=.76,font=42}={}){
  const c=document.createElement('canvas');c.width=512;c.height=128;
  const x=c.getContext('2d');x.clearRect(0,0,512,128);
  x.fillStyle='rgba(255,248,215,.96)';x.strokeStyle='#4b5841';x.lineWidth=8;
  x.beginPath();x.roundRect(14,16,484,96,24);x.fill();x.stroke();
  x.fillStyle='#2f3b2e';x.font='900 '+font+'px system-ui,sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(text,256,66);
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false}));
  sp.scale.set(width,height,1);sp.renderOrder=15;return sp;
}

function addShell(group,box,color,accent,name){
  box(group,0,0,11.2,8.0,.18,color,-.12);
  box(group,0,-4.0,11.2,.22,2.75,accent,0);
  box(group,-5.6,0,.22,8.0,2.75,accent,0);
  box(group,5.6,0,.22,8.0,2.75,accent,0);
  box(group,0,-3.84,11.0,.10,.12,0xffffff,2.68);
  const sign=canvasLabel(name);sign.position.set(0,2.45,-3.72);group.add(sign);

  // Indoor illumination stays warm and readable even when the outdoor day/night cycle is dark.
  const ambient=new THREE.AmbientLight(0xffefd2,1.35);ambient.name='venue-ambient';group.add(ambient);
  for(const x of [-2.6,2.6]){
    const light=new THREE.PointLight(0xffdfad,2.15,11,1.8);
    light.position.set(x,2.45,.15);light.name='venue-warm-light';group.add(light);
  }
}

async function addMerchant(group,addModel,kind,x,z){
  const info=VENUE_INFO[kind];
  const model=await addModel(group,info.model,{x,z,w:1.05,h:1.82,d:1.05,rot:Math.PI,name:'venue-'+kind+'-merchant'});
  if(!model)return null;
  const tag=canvasLabel(info.npc,{width:1.15,height:.30,font:34});tag.position.set(x,2.05,z);group.add(tag);
  return model;
}

export async function buildVenueInteriors(ctx){
  const {parent,addModel,box,plane,interact,collider,actions}=ctx;
  const groups={},built=new Set(),buildPromises={};

  for(const kind of Object.keys(VENUE_MODES)){
    const g=new THREE.Group();g.name='venue-'+kind;g.visible=false;parent.add(g);groups[kind]=g;
  }

  async function buildMarket(){
    const kind='market',g=groups[kind],mode=VENUE_MODES[kind];addShell(g,box,0xd9d3bd,0xf0ead8,VENUE_INFO[kind].name);
    interact(mode,0,3.35,1.0,'🚪 밖으로 나가기',()=>actions.exitVenue());
    interact(mode,2.55,1.80,1.25,'🧺 민지에게 계산하기',()=>actions.shop('market','민지'));
    interact(mode,-2.35,2.0,1.35,'🥕 진열 상품 살펴보기',()=>actions.shop('market','민지'));
    interact(mode,2.55,.15,1.18,'💬 민지와 이야기하기',()=>actions.resident('minji'));
    collider(mode,-3.65,-1.35,1.1,2.1);collider(mode,-1.85,-1.35,1.1,2.1);
    collider(mode,4.05,-1.45,1.05,2.05);collider(mode,-2.35,1.20,3.8,.9);collider(mode,2.55,1.05,1.25,.85);
    await Promise.all([
      addModel(g,MARKET+'shelf-boxes.glb',{x:-3.65,z:-1.35,w:1.25,h:1.85,d:2.3,rot:Math.PI/2,name:'market-shelf-boxes'}),
      addModel(g,MARKET+'shelf-bags.glb',{x:-1.85,z:-1.35,w:1.25,h:1.85,d:2.3,rot:Math.PI/2,name:'market-shelf-bags'}),
      addModel(g,MARKET+'freezer.glb',{x:4.05,z:-1.45,w:1.25,h:1.75,d:2.3,rot:Math.PI/2,name:'market-freezer'}),
      addModel(g,MARKET+'display-fruit.glb',{x:-3.35,z:1.20,w:1.55,h:1.30,d:.95,rot:0,name:'market-fruit-display'}),
      addModel(g,MARKET+'display-bread.glb',{x:-1.35,z:1.20,w:1.55,h:1.30,d:.95,rot:0,name:'market-bread-display'}),
      addModel(g,MARKET+'cash-register.glb',{x:2.55,z:1.05,w:.78,h:.62,d:.70,rot:Math.PI,name:'market-register'}),
      addModel(g,MARKET+'shopping-basket.glb',{x:4.1,z:1.9,w:.72,h:.5,d:.62,rot:.25,name:'market-basket'}),
      addModel(g,MARKET+'shopping-cart.glb',{x:4.35,z:2.65,w:1.0,h:.92,d:1.15,rot:-.15,name:'market-cart'}),
      addMerchant(g,addModel,kind,2.55,.15)
    ]);
  }

  async function buildHardware(){
    const kind='hardware',g=groups[kind],mode=VENUE_MODES[kind];addShell(g,box,0xb9aa8e,0xd9c7a5,VENUE_INFO[kind].name);
    interact(mode,0,3.35,1.0,'🚪 밖으로 나가기',()=>actions.exitVenue());
    interact(mode,0,-1.45,1.35,'🛠️ 준호에게 물건 사기',()=>actions.shop('hardware','준호'));
    interact(mode,3.3,2.65,1.15,'🪵 자재 살펴보기',()=>actions.shop('hardware','준호'));
    interact(mode,0,-3.15,1.18,'💬 준호와 이야기하기',()=>actions.resident('junho'));
    collider(mode,0,-2.45,2.5,.95);collider(mode,-3.75,-1.65,1.3,1.05);collider(mode,3.70,-1.65,1.3,1.05);
    collider(mode,-3.2,1.8,2.3,1.0);collider(mode,3.35,1.85,2.5,1.0);
    await Promise.all([
      addModel(g,SURVIVAL+'workbench.glb',{x:0,z:-2.45,w:2.7,h:1.35,d:1.05,rot:0,name:'hardware-counter'}),
      addModel(g,SURVIVAL+'workbench-anvil.glb',{x:-3.75,z:-1.65,w:1.55,h:1.35,d:1.20,rot:.15,name:'hardware-anvil'}),
      addModel(g,SURVIVAL+'workbench-grind.glb',{x:3.70,z:-1.65,w:1.55,h:1.45,d:1.20,rot:-.12,name:'hardware-grind'}),
      addModel(g,SURVIVAL+'tool-axe.glb',{x:-2.8,z:-3.45,w:.60,h:1.0,d:.25,rot:0,name:'hardware-axe'}),
      addModel(g,SURVIVAL+'tool-pickaxe.glb',{x:-1.7,z:-3.45,w:.60,h:1.0,d:.25,rot:0,name:'hardware-pick'}),
      addModel(g,SURVIVAL+'tool-hammer.glb',{x:-.6,z:-3.45,w:.60,h:1.0,d:.25,rot:0,name:'hardware-hammer'}),
      addModel(g,SURVIVAL+'box-large.glb',{x:-3.8,z:1.75,w:1.25,h:1.05,d:1.15,rot:.08,name:'hardware-box-a'}),
      addModel(g,SURVIVAL+'box.glb',{x:-2.55,z:1.9,w:.9,h:.75,d:.85,rot:-.08,name:'hardware-box-b'}),
      addModel(g,SURVIVAL+'resource-wood.glb',{x:2.65,z:1.9,w:1.35,h:.65,d:.9,rot:.22,name:'hardware-wood'}),
      addModel(g,SURVIVAL+'resource-stone-large.glb',{x:4.05,z:1.85,w:1.0,h:.78,d:1.0,rot:.15,name:'hardware-stone'}),
      addMerchant(g,addModel,kind,0,-3.15)
    ]);
  }

  async function buildCafe(){
    const kind='cafe',g=groups[kind],mode=VENUE_MODES[kind];addShell(g,box,0xcaa980,0xf0dfc7,VENUE_INFO[kind].name);
    plane(g,0,.35,9.5,6.2,0xdab88f,.012);
    interact(mode,0,3.35,1.0,'🚪 밖으로 나가기',()=>actions.exitVenue());
    interact(mode,.35,-1.20,1.35,'☕ 하늘에게 주문하기',()=>actions.shop('cafe','하늘'));
    interact(mode,.35,-3.10,1.18,'💬 하늘과 이야기하기',()=>actions.resident('haneul'));
    interact(mode,-2.65,2.55,1.1,'🪑 카페에서 쉬기',()=>actions.cafeRest());
    interact(mode,2.65,2.55,1.1,'🪑 카페에서 쉬기',()=>actions.cafeRest());
    collider(mode,0,-2.35,4.7,.85);collider(mode,-2.55,-1.15,2.2,.8);collider(mode,3.55,-1.45,.9,.9);
    collider(mode,-2.65,1.5,1.3,1.3);collider(mode,2.65,1.5,1.3,1.3);
    await Promise.all([
      addModel(g,BAKERY+'counter-table.glb',{x:0,z:-2.35,w:5.0,h:1.15,d:1.0,rot:0,name:'cafe-counter'}),
      addModel(g,BAKERY+'display-case-long.glb',{x:-2.55,z:-1.15,w:2.4,h:1.35,d:.95,rot:0,name:'cafe-display'}),
      addModel(g,BAKERY+'coffee-machine.glb',{x:1.55,z:-2.0,w:.82,h:.95,d:.68,rot:0,name:'cafe-coffee-machine'}),
      addModel(g,BAKERY+'cash-register.glb',{x:.35,z:-1.95,w:.65,h:.55,d:.58,rot:Math.PI,name:'cafe-register'}),
      addModel(g,BAKERY+'pastry-stand-a-decorated.glb',{x:3.55,z:-1.45,w:1.0,h:1.30,d:1.0,rot:0,name:'cafe-pastry'}),
      addModel(g,BAKERY+'rug.glb',{x:0,z:1.55,w:7.0,h:.06,d:3.0,rot:0,name:'cafe-rug'}),
      addModel(g,BAKERY+'table-round-a.glb',{x:-2.65,z:1.50,w:1.45,h:1.05,d:1.45,rot:0,name:'cafe-table-a'}),
      addModel(g,BAKERY+'table-round-b.glb',{x:2.65,z:1.50,w:1.45,h:1.05,d:1.45,rot:0,name:'cafe-table-b'}),
      addModel(g,BAKERY+'chair.glb',{x:-3.65,z:1.55,w:.75,h:1.05,d:.75,rot:Math.PI/2,name:'cafe-chair-a1'}),
      addModel(g,BAKERY+'chair.glb',{x:-1.65,z:1.55,w:.75,h:1.05,d:.75,rot:-Math.PI/2,name:'cafe-chair-a2'}),
      addModel(g,BAKERY+'chair.glb',{x:1.65,z:1.55,w:.75,h:1.05,d:.75,rot:Math.PI/2,name:'cafe-chair-b1'}),
      addModel(g,BAKERY+'chair.glb',{x:3.65,z:1.55,w:.75,h:1.05,d:.75,rot:-Math.PI/2,name:'cafe-chair-b2'}),
      addMerchant(g,addModel,kind,.35,-3.10)
    ]);
  }

  const museumDisplays={},museumSlots={};

  function museumObject(shape,color,scale=1){
    const g=new THREE.Group(),mat=new THREE.MeshStandardMaterial({color,roughness:.64,metalness:shape==='crystal'?.18:0});
    let body;
    if(shape==='fish'){
      body=new THREE.Mesh(new THREE.SphereGeometry(.16,12,8),mat);body.scale.set(1.55,.72,.72);g.add(body);
      const tail=new THREE.Mesh(new THREE.ConeGeometry(.13,.22,3),mat);tail.rotation.z=Math.PI/2;tail.position.x=-.26;g.add(tail);
    }else if(shape==='bug'){
      body=new THREE.Mesh(new THREE.SphereGeometry(.12,10,7),mat);body.scale.set(.8,1.25,.72);g.add(body);
      for(const sx of [-.11,.11]){const wing=new THREE.Mesh(new THREE.SphereGeometry(.10,8,6),new THREE.MeshStandardMaterial({color:0xd8e3c5,transparent:true,opacity:.72,roughness:.5}));wing.scale.set(.55,.18,1.2);wing.position.set(sx,.04,0);g.add(wing)}
    }else if(shape==='mushroom'){
      const stem=new THREE.Mesh(new THREE.CylinderGeometry(.055,.07,.17,8),new THREE.MeshStandardMaterial({color:0xe8d9b8,roughness:.8}));stem.position.y=-.02;g.add(stem);
      body=new THREE.Mesh(new THREE.SphereGeometry(.14,12,8),mat);body.scale.set(1,.45,1);body.position.y=.11;g.add(body);
    }else if(shape==='crystal'){
      body=new THREE.Mesh(new THREE.OctahedronGeometry(.15,0),mat);body.scale.set(.78,1.45,.78);g.add(body);
    }else if(shape==='pearl'){
      body=new THREE.Mesh(new THREE.SphereGeometry(.13,12,8),new THREE.MeshStandardMaterial({color:0xf7f0dc,roughness:.24,metalness:.08}));g.add(body);
    }else{
      body=new THREE.Mesh(new THREE.SphereGeometry(.13,10,7),mat);body.scale.set(1,.82,1);g.add(body);
    }
    g.scale.setScalar(scale);return g;
  }

  function addMuseumSlot(parent,id,x,z,{color=0xd39a5c,shape='produce',scale=1}={}){
    const slot=new THREE.Group();slot.name='museum-slot-'+id.replace(':','-');slot.visible=false;parent.add(slot);
    const pedestal=new THREE.Mesh(new THREE.CylinderGeometry(.18,.22,.12,10),new THREE.MeshStandardMaterial({color:0xe4dfd2,roughness:.82}));
    pedestal.position.set(x,.08,z);slot.add(pedestal);
    const object=museumObject(shape,color,scale);object.position.set(x,.31,z);slot.add(object);
    museumSlots[id]=slot;return slot;
  }

  function addMuseumSectionLabel(parent,text,x,z,width=1.5){
    const label=canvasLabel(text,{width,height:.30,font:29});label.position.set(x,1.46,z);parent.add(label);
  }

  async function buildMuseum(){
    const kind='museum',g=groups[kind],mode=VENUE_MODES[kind];addShell(g,box,0xc9c5b4,0xe7e2d1,VENUE_INFO[kind].name);
    interact(mode,0,3.35,1.0,'🚪 박물관 밖으로 나가기',()=>actions.exitVenue());
    interact(mode,-1.45,2.45,1.35,'📖 씨앗 자연도감 보기',()=>actions.museumCatalog?.());
    interact(mode,1.45,2.45,1.35,'🎁 발견물 기증하기',()=>actions.museumDonate?.());

    box(g,0,2.15,3.8,.75,.85,0x8f7455,.02);
    const reception=canvasLabel('도감 · 기증 접수',{width:2.25,height:.48,font:32});
    reception.position.set(0,1.55,2.12);g.add(reception);

    // Each donation owns one independent 3D slot. Wings appear after the first
    // donation, then visibly fill one object at a time instead of popping in complete.
    const aquarium=new THREE.Group();aquarium.name='museum-aquarium';g.add(aquarium);
    box(aquarium,-4.15,-1.55,2.15,3.55,.18,0x6da7bf,.02);
    box(aquarium,-4.15,-1.55,1.78,3.15,.10,0x8ed3d8,.32);
    addMuseumSectionLabel(aquarium,'🐟 수조',-4.15,-3.05,1.18);
    [
      ['fish:pond',-4.55,-2.25,0x6fc0d2],['fish:river',-3.75,-1.85,0x5b90cc],
      ['fish:beach',-4.55,-1.05,0xe8b45f],['fish:rare',-3.75,-.65,0xd7b5ef]
    ].forEach(([id,x,z,color])=>addMuseumSlot(aquarium,id,x,z,{color,shape:'fish',scale:.9}));

    const nature=new THREE.Group();nature.name='museum-nature';g.add(nature);
    box(nature,-1.75,-1.55,1.85,3.55,.18,0x7f9861,.02);
    addMuseumSectionLabel(nature,'🍄 자연',-1.75,-3.05,1.18);
    [
      ['nature:pearl',-2.05,-2.20,0xf4ead6,'pearl'],['nature:shell',-1.42,-1.72,0xe4aa93,'produce'],
      ['nature:bug',-2.05,-1.08,0x55734f,'bug'],['nature:mushroom',-1.42,-.58,0xc95d51,'mushroom']
    ].forEach(([id,x,z,color,shape])=>addMuseumSlot(nature,id,x,z,{color,shape,scale:.9}));

    const mineral=new THREE.Group();mineral.name='museum-mineral';g.add(mineral);
    box(mineral,-3.0,.75,4.3,1.25,.18,0x8b857d,.02);
    addMuseumSectionLabel(mineral,'💎 광물',-3.0,.22,1.22);
    [
      ['mineral:stone',-4.55,.85,0x8d9396],['mineral:iron',-3.78,.85,0x66717a],
      ['mineral:copper',-3.0,.85,0xb7794e],['mineral:quartz',-2.22,.85,0x9fd7dc],
      ['mineral:gold',-1.45,.85,0xe2c65c]
    ].forEach(([id,x,z,color])=>addMuseumSlot(mineral,id,x,z,{color,shape:'crystal',scale:.95}));

    const farm=new THREE.Group();farm.name='museum-farm';g.add(farm);
    box(farm,2.55,-.65,5.15,4.65,.18,0xa9865f,.02);
    addMuseumSectionLabel(farm,'🌱 농업 · 요리',2.55,-3.0,1.65);
    const farmIds=[
      'crop:potato','crop:carrot','crop:tomato','crop:strawberry','crop:corn','crop:pumpkin','crop:beet','crop:lettuce','crop:mushroom',
      'crop:rice','crop:watermelon','crop:wheat','crop:bamboo','crop:berry',
      'fruit:apple','fruit:pear','fruit:peach','fruit:orange','fruit:cherry',
      'food:grilledFish','food:bakedPotato','food:veggieSoup','food:mushroomSoup','food:omelet','food:fruitSalad','food:cityLunch','food:cafeToast'
    ];
    const farmColors=[0xc9a16a,0xe67e3a,0xc95142,0xe85e72,0xf0cb55,0xe98932,0xb7355b,0x70ad55,0xc95d51,0xe4d176,0x4e9857,0xd9b95d,0x5f9d57,0x8650a1,0xcf4d3f,0xd4b16e,0xf0a079,0xe8a552,0xb83d52,0x659db2,0xc69b5b,0x8ebc6a,0xc88c65,0xe3c36b,0xa8c77d,0x86a9c5,0xb87c55];
    farmIds.forEach((id,index)=>{
      const col=index%9,row=Math.floor(index/9),x=.45+col*.52,z=-2.25+row*.78;
      addMuseumSlot(farm,id,x,z,{color:farmColors[index]||0xd39a5c,shape:id==='crop:mushroom'?'mushroom':id.startsWith('food:')?'produce':'produce',scale:.68});
    });

    museumDisplays.aquarium=aquarium;
    museumDisplays.nature=nature;
    museumDisplays.mineral=mineral;
    museumDisplays.farm=farm;
    syncMuseumDisplays();
  }

  function syncMuseumDisplays(){
    const summary=actions.museumSummary?.()||{},exhibits=summary.exhibits||{},donated=new Set(summary.donatedIds||[]);
    for(const [key,group] of Object.entries(museumDisplays))group.visible=!!exhibits[key];
    for(const [id,slot] of Object.entries(museumSlots))slot.visible=donated.has(id);
  }

  const builders={market:buildMarket,hardware:buildHardware,cafe:buildCafe,museum:buildMuseum};
  function hideAll(){for(const g of Object.values(groups))g.visible=false}
  function ensure(kind){
    if(built.has(kind))return Promise.resolve(groups[kind]);
    if(buildPromises[kind])return buildPromises[kind];
    const fn=builders[kind];if(!fn)return Promise.resolve(null);
    buildPromises[kind]=fn().then(()=>{built.add(kind);return groups[kind]}).catch(err=>{console.warn('[World v3] venue build failed',kind,err);return groups[kind]});
    return buildPromises[kind];
  }
  async function show(kind){
    hideAll();const g=groups[kind];if(!g)return null;g.visible=true;
    await ensure(kind);if(kind==='museum')syncMuseumDisplays();if(g)g.visible=true;return g;
  }
  hideAll();
  return {groups,show,hideAll,ensure,syncMuseumDisplays,isBuilt:kind=>built.has(kind)};
}

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

  const museumDisplays={};

  async function buildMuseum(){
    const kind='museum',g=groups[kind],mode=VENUE_MODES[kind];addShell(g,box,0xc9c5b4,0xe7e2d1,VENUE_INFO[kind].name);
    interact(mode,0,3.35,1.0,'🚪 박물관 밖으로 나가기',()=>actions.exitVenue());
    interact(mode,-1.45,2.45,1.35,'📖 씨앗 자연도감 보기',()=>actions.museumCatalog?.());
    interact(mode,1.45,2.45,1.35,'🎁 발견물 기증하기',()=>actions.museumDonate?.());

    // Reception and four exhibit wings. Each wing becomes visible only after the
    // first matching donation, so the room physically fills as the collection grows.
    box(g,0,2.15,3.8,.75,.85,0x8f7455,.02);
    const reception=canvasLabel('도감 · 기증 접수',{width:2.25,height:.48,font:32});
    reception.position.set(0,1.55,2.12);g.add(reception);

    const aquarium=new THREE.Group();aquarium.name='museum-aquarium';g.add(aquarium);
    box(aquarium,-3.35,-1.45,2.65,2.0,1.55,0x6da7bf,.02);
    box(aquarium,-3.35,-1.45,2.25,1.6,.10,0x8ed3d8,1.42);
    const aqLabel=canvasLabel('🐟 물고기 수조',{width:1.45,height:.34,font:31});aqLabel.position.set(-3.35,2.02,-1.45);aquarium.add(aqLabel);

    const nature=new THREE.Group();nature.name='museum-nature';g.add(nature);
    box(nature,3.35,-1.55,2.65,1.85,.52,0x7f9861,.02);
    for(const [x,z,color] of [[2.75,-1.62,0xd9c69b],[3.35,-1.35,0xb98b63],[3.92,-1.66,0xe2d4b4]])box(nature,x,z,.42,.42,.48,color,.53);
    const natureLabel=canvasLabel('🍄 자연 채집관',{width:1.55,height:.34,font:31});natureLabel.position.set(3.35,1.48,-1.55);nature.add(natureLabel);

    const mineral=new THREE.Group();mineral.name='museum-mineral';g.add(mineral);
    box(mineral,-3.15,.62,3.0,1.25,.48,0x8b857d,.02);
    for(const [x,color,h] of [[-4.05,0x8d9396,.52],[-3.15,0xb7794e,.64],[-2.25,0xe2c65c,.72]])box(mineral,x,.62,.48,.48,h,color,.50);
    const mineralLabel=canvasLabel('💎 광물 전시관',{width:1.55,height:.34,font:31});mineralLabel.position.set(-3.15,1.52,.62);mineral.add(mineralLabel);

    const farm=new THREE.Group();farm.name='museum-farm';g.add(farm);
    box(farm,3.15,.55,3.0,1.30,.50,0xa9865f,.02);
    for(const [x,color] of [[2.35,0xe67e3a],[3.15,0xc95142],[3.95,0xf0cb55]])box(farm,x,.55,.44,.44,.60,color,.52);
    const farmLabel=canvasLabel('🌱 농업·요리관',{width:1.65,height:.34,font:31});farmLabel.position.set(3.15,1.55,.55);farm.add(farmLabel);

    museumDisplays.aquarium=aquarium;
    museumDisplays.nature=nature;
    museumDisplays.mineral=mineral;
    museumDisplays.farm=farm;
    syncMuseumDisplays();
  }

  function syncMuseumDisplays(){
    const exhibits=actions.museumSummary?.()?.exhibits||{};
    for(const [key,group] of Object.entries(museumDisplays))group.visible=!!exhibits[key];
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

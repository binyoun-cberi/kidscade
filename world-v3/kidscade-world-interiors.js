import * as THREE from 'three';

const ROOT=new URL('../assets/game/',import.meta.url);
const MARKET=new URL('shops/market/',ROOT).href;
const BAKERY=new URL('3d/bakery/interior/',ROOT).href;
const SURVIVAL=new URL('3d/survival/kenney-survival-kit/',ROOT).href;

export const VENUE_MODES={
  market:'venue-market',
  hardware:'venue-hardware',
  cafe:'venue-cafe'
};

export const VENUE_INFO={
  market:{name:'씨앗마트',npc:'민지'},
  hardware:{name:'튼튼 철물점',npc:'준호'},
  cafe:{name:'하늘 카페',npc:'하늘'}
};

export const VENUE_BOUNDS={x1:-5.45,x2:5.45,z1:-3.85,z2:3.85};

function makeSign(text){
  const c=document.createElement('canvas');c.width=512;c.height=128;
  const x=c.getContext('2d');x.clearRect(0,0,512,128);
  x.fillStyle='rgba(255,248,215,.96)';x.strokeStyle='#4b5841';x.lineWidth=8;
  x.beginPath();x.roundRect(14,16,484,96,24);x.fill();x.stroke();
  x.fillStyle='#2f3b2e';x.font='900 42px system-ui,sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(text,256,66);
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false}));
  sp.scale.set(3.1,.76,1);sp.position.set(0,2.45,-3.72);sp.renderOrder=15;return sp;
}

function addShell(group,box,color,accent){
  box(group,0,0,11.2,8.0,.18,color,-.12);
  box(group,0,-4.0,11.2,.22,2.75,accent,0);
  box(group,-5.6,0,.22,8.0,2.75,accent,0);
  box(group,5.6,0,.22,8.0,2.75,accent,0);
  box(group,0,-3.84,11.0,.10,.12,0xffffff,2.68);
}

export async function buildVenueInteriors(ctx){
  const {parent,addModel,box,plane,interact,collider,actions}=ctx;
  const groups={};

  const makeVenue=(kind,floor,wall)=>{
    const g=new THREE.Group();g.name='venue-'+kind;g.visible=false;parent.add(g);
    addShell(g,box,floor,wall);g.add(makeSign(VENUE_INFO[kind].name));
    interact(VENUE_MODES[kind],0,3.35,1.0,'🚪 밖으로 나가기',()=>actions.exitVenue());
    groups[kind]=g;return g;
  };

  // 씨앗마트: 실제 진열대를 걸어 다니고 계산대에서 기존 구매/판매 기능을 연다.
  {
    const g=makeVenue('market',0xd9d3bd,0xf0ead8);
    await Promise.all([
      addModel(g,MARKET+'shelf-boxes.glb',{x:-3.65,z:-1.35,w:1.25,h:1.85,d:2.3,rot:Math.PI/2,name:'market-shelf-boxes'}),
      addModel(g,MARKET+'shelf-bags.glb',{x:-1.85,z:-1.35,w:1.25,h:1.85,d:2.3,rot:Math.PI/2,name:'market-shelf-bags'}),
      addModel(g,MARKET+'freezer.glb',{x:4.05,z:-1.45,w:1.25,h:1.75,d:2.3,rot:Math.PI/2,name:'market-freezer'}),
      addModel(g,MARKET+'display-fruit.glb',{x:-3.35,z:1.20,w:1.55,h:1.30,d:.95,rot:0,name:'market-fruit-display'}),
      addModel(g,MARKET+'display-bread.glb',{x:-1.35,z:1.20,w:1.55,h:1.30,d:.95,rot:0,name:'market-bread-display'}),
      addModel(g,MARKET+'cash-register.glb',{x:2.55,z:1.05,w:.78,h:.62,d:.70,rot:Math.PI,name:'market-register'}),
      addModel(g,MARKET+'shopping-basket.glb',{x:4.1,z:1.9,w:.72,h:.5,d:.62,rot:.25,name:'market-basket'}),
      addModel(g,MARKET+'shopping-cart.glb',{x:4.35,z:2.65,w:1.0,h:.92,d:1.15,rot:-.15,name:'market-cart'})
    ]);
    collider(VENUE_MODES.market,-3.65,-1.35,1.1,2.1);collider(VENUE_MODES.market,-1.85,-1.35,1.1,2.1);
    collider(VENUE_MODES.market,4.05,-1.45,1.05,2.05);collider(VENUE_MODES.market,-2.35,1.20,3.8,.9);
    collider(VENUE_MODES.market,2.55,1.05,1.25,.85);
    interact(VENUE_MODES.market,2.55,1.80,1.25,'🧺 민지에게 계산하기',()=>actions.shop('market','민지'));
    interact(VENUE_MODES.market,-2.35,2.0,1.35,'🥕 진열 상품 살펴보기',()=>actions.shop('market','민지'));
  }

  // 튼튼 철물점: 공구와 자재가 보이는 작업장형 매장.
  {
    const g=makeVenue('hardware',0xb9aa8e,0xd9c7a5);
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
      addModel(g,SURVIVAL+'resource-stone-large.glb',{x:4.05,z:1.85,w:1.0,h:.78,d:1.0,rot:.15,name:'hardware-stone'})
    ]);
    collider(VENUE_MODES.hardware,0,-2.45,2.5,.95);collider(VENUE_MODES.hardware,-3.75,-1.65,1.3,1.05);
    collider(VENUE_MODES.hardware,3.70,-1.65,1.3,1.05);collider(VENUE_MODES.hardware,-3.2,1.8,2.3,1.0);
    collider(VENUE_MODES.hardware,3.35,1.85,2.5,1.0);
    interact(VENUE_MODES.hardware,0,-1.45,1.35,'🛠️ 준호에게 물건 사기',()=>actions.shop('hardware','준호'));
    interact(VENUE_MODES.hardware,3.3,2.65,1.15,'🪵 자재 살펴보기',()=>actions.shop('hardware','준호'));
  }

  // 하늘 카페: 베이커리 CC0 에셋으로 실제 카운터와 좌석을 만든다.
  {
    const g=makeVenue('cafe',0xcaa980,0xf0dfc7);
    plane(g,0,.35,9.5,6.2,0xdab88f,.012);
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
      addModel(g,BAKERY+'chair.glb',{x:3.65,z:1.55,w:.75,h:1.05,d:.75,rot:-Math.PI/2,name:'cafe-chair-b2'})
    ]);
    collider(VENUE_MODES.cafe,0,-2.35,4.7,.85);collider(VENUE_MODES.cafe,-2.55,-1.15,2.2,.8);
    collider(VENUE_MODES.cafe,3.55,-1.45,.9,.9);collider(VENUE_MODES.cafe,-2.65,1.5,1.3,1.3);collider(VENUE_MODES.cafe,2.65,1.5,1.3,1.3);
    interact(VENUE_MODES.cafe,.35,-1.20,1.35,'☕ 하늘에게 주문하기',()=>actions.shop('cafe','하늘'));
    interact(VENUE_MODES.cafe,-2.65,2.55,1.1,'🪑 카페에서 쉬기',()=>actions.rest());
    interact(VENUE_MODES.cafe,2.65,2.55,1.1,'🪑 카페에서 쉬기',()=>actions.rest());
  }

  function hideAll(){for(const g of Object.values(groups))g.visible=false}
  function show(kind){hideAll();if(groups[kind])groups[kind].visible=true}
  hideAll();
  return {groups,show,hideAll};
}

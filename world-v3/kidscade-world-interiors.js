import * as THREE from 'three';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import {residentVisual} from './kidscade-world-npc-style.js?v=2';
import {schoolPeriodAt} from './kidscade-world-school.js?v=3';

const ROOT=new URL('../assets/game/',import.meta.url);
const MARKET=new URL('shops/market/',ROOT).href;
const BAKERY=new URL('3d/bakery/interior/',ROOT).href;
const SURVIVAL=new URL('3d/survival/kenney-survival-kit/',ROOT).href;
const FURNITURE=new URL('3d/interiors/kenney-furniture-kit/',ROOT).href;

export const VENUE_MODES={
  market:'venue-market',
  hardware:'venue-hardware',
  cafe:'venue-cafe',
  museum:'venue-museum',
  school:'venue-school'
};

export const VENUE_INFO={
  market:{name:'씨앗마트',npc:'민지 선생님',npcId:'minji'},
  hardware:{name:'튼튼 철물점',npc:'준호 선생님',npcId:'junho'},
  cafe:{name:'하늘 카페',npc:'하늘 선생님',npcId:'haneul'},
  museum:{name:'씨앗 자연박물관'},
  school:{name:'씨앗학교',npc:'민지 선생님',npcId:'minji'}
};

export const VENUE_BOUNDS={x1:-5.15,x2:5.15,z1:-3.62,z2:3.62};

function canvasLabel(text,{width=3.1,height=.76,font=42,depthTest=true}={}){
  const c=document.createElement('canvas');c.width=512;c.height=128;
  const x=c.getContext('2d');
  const draw=value=>{
    x.clearRect(0,0,512,128);
    x.fillStyle='rgba(255,248,215,.97)';x.strokeStyle='#42503d';x.lineWidth=8;
    x.beginPath();x.roundRect(14,16,484,96,24);x.fill();x.stroke();
    x.fillStyle='#263226';x.font='900 '+font+'px system-ui,sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(String(value||''),256,66,448);
  };
  draw(text);
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false,depthTest}));
  sp.scale.set(width,height,1);sp.renderOrder=25;
  sp.userData.setText=value=>{draw(value);tex.needsUpdate=true;};
  return sp;
}

function merchantLabel(name,role,accent){
  const c=document.createElement('canvas');c.width=640;c.height=192;
  const x=c.getContext('2d');
  x.shadowColor='rgba(32,40,30,.20)';x.shadowBlur=10;x.shadowOffsetY=6;
  x.fillStyle='rgba(255,250,230,.985)';x.strokeStyle='#40503b';x.lineWidth=9;
  x.beginPath();x.roundRect(16,14,608,164,36);x.fill();x.stroke();
  x.shadowColor='transparent';x.fillStyle=accent||'#7c9863';x.beginPath();x.arc(61,69,14,0,Math.PI*2);x.fill();
  x.fillStyle='#263226';x.font='900 48px system-ui,sans-serif';x.textAlign='left';x.textBaseline='middle';x.fillText(name,92,67,510);
  x.fillStyle='rgba(38,50,38,.72)';x.font='800 27px system-ui,sans-serif';x.fillText(role,61,127,525);
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false,depthTest:false}));
  sp.scale.set(1.72,.52,1);sp.renderOrder=42;return sp;
}

function addShell(group,box,plane,color,accent,name,kind){
  box(group,0,0,10.6,7.45,.18,color,-.12);
  box(group,0,-3.72,10.6,.22,2.75,accent,0);
  box(group,-5.30,0,.22,7.45,2.75,accent,0);
  box(group,5.30,0,.22,7.45,2.75,accent,0);
  box(group,0,-3.57,10.30,.10,.12,0xffffff,2.68);
  box(group,0,-3.56,10.25,.08,.13,kind==='hardware'?0x8e7655:0xbfae88,.04);
  const sign=canvasLabel(name,{width:1.78,height:.42,font:34,depthTest:false});
  sign.position.set(-.35,2.25,-3.50);group.add(sign);

  if(kind==='market'){
    plane(group,0,.15,9.7,6.35,0xe9e2cf,.015);
  }else if(kind==='hardware'){
    plane(group,0,.10,9.7,6.35,0xb99b70,.015);
  }else if(kind==='cafe'){
    plane(group,0,.55,9.7,5.25,0xd9b780,.016);
    plane(group,0,-2.45,9.7,1.55,0xd1c3ac,.018);
  }

  const ambientColor=kind==='hardware'?0xffe3bd:kind==='cafe'?0xffead0:0xfff3da;
  const ambient=new THREE.AmbientLight(ambientColor,kind==='hardware'?1.00:1.12);ambient.name='venue-ambient';group.add(ambient);
  for(const [lx,lz,intensity] of [[-2.7,-.4,1.65],[2.5,.4,1.75]]){
    const light=new THREE.PointLight(kind==='hardware'?0xffd0a0:0xffd9aa,intensity,10.5,1.85);
    light.position.set(lx,2.42,lz);light.name='venue-warm-light';group.add(light);
  }
}

async function addMerchant(group,loadGLTF,prepModel,kind,x,z,merchantMixers){
  const info=VENUE_INFO[kind],visual=residentVisual(info.npcId);
  const gltf=await loadGLTF(visual.url);
  const model=prepModel(cloneSkeleton(gltf.scene));
  model.updateMatrixWorld(true);
  let b=new THREE.Box3().setFromObject(model),size=b.getSize(new THREE.Vector3());
  const baseSize=Math.max(size.x,size.y,size.z)||1;
  model.scale.multiplyScalar((Number(visual.height)||1.82)/baseSize);
  model.updateMatrixWorld(true);b=new THREE.Box3().setFromObject(model);
  const center=b.getCenter(new THREE.Vector3());
  model.position.x-=center.x;model.position.z-=center.z;model.position.y-=b.min.y;
  model.rotation.y=Math.PI;
  model.traverse(n=>{if(n.isSkinnedMesh)n.frustumCulled=false;});
  const anchor=new THREE.Group();anchor.position.set(x,.025,z);anchor.add(model);group.add(anchor);

  const clips=Array.isArray(gltf.animations)?gltf.animations:[],idle=clips.find(clip=>/idle|stand/i.test(clip.name))||clips[0]||null;
  if(idle){
    const mixer=new THREE.AnimationMixer(model),action=mixer.clipAction(idle);
    action.setLoop(THREE.LoopRepeat,Infinity);action.play();merchantMixers.push(mixer);
  }
  const tag=merchantLabel(info.npc,visual.role,visual.accent);tag.position.set(x,2.22,z);group.add(tag);
  return anchor;
}

async function addSchoolPerson(group,loadGLTF,prepModel,id,x,z,schoolActors,mixers){
  const visual=residentVisual(id),gltf=await loadGLTF(visual.url);
  const model=prepModel(cloneSkeleton(gltf.scene));
  model.updateMatrixWorld(true);
  let b=new THREE.Box3().setFromObject(model),size=b.getSize(new THREE.Vector3()),baseSize=Math.max(size.x,size.y,size.z)||1;
  model.scale.multiplyScalar((Number(visual.height)||1.80)/baseSize);
  model.updateMatrixWorld(true);b=new THREE.Box3().setFromObject(model);
  const center=b.getCenter(new THREE.Vector3());
  model.position.x-=center.x;model.position.z-=center.z;model.position.y-=b.min.y;model.rotation.y=Math.PI;
  model.traverse(n=>{if(n.isSkinnedMesh)n.frustumCulled=false;});
  const anchor=new THREE.Group();anchor.position.set(x,.025,z);anchor.add(model);group.add(anchor);
  const clips=Array.isArray(gltf.animations)?gltf.animations:[],idle=clips.find(clip=>/idle|stand/i.test(clip.name))||clips[0]||null;
  if(idle){
    const mixer=new THREE.AnimationMixer(model),action=mixer.clipAction(idle);
    action.setLoop(THREE.LoopRepeat,Infinity);action.play();mixers.push(mixer);
  }
  const tag=canvasLabel(visual.name,{width:1.15,height:.30,font:28,depthTest:false});tag.position.set(x,2.12,z);group.add(tag);
  const actor={id,anchor,label:tag,interaction:null,kind:String(visual.role||'').includes('선생님')?'teacher':'student'};schoolActors.push(actor);return actor;
}

export async function buildVenueInteriors(ctx){
  const {parent,addModel,box,plane,interact,collider,loadGLTF,prepModel,actions,getGameTime}=ctx;
  const groups={},built=new Set(),buildPromises={},merchantMixers=[],schoolActors=[];
  let schoolBoardLabel=null,schoolTopicLabel=null,lastSchoolPeriodId='';

  for(const kind of Object.keys(VENUE_MODES)){
    const g=new THREE.Group();g.name='venue-'+kind;g.visible=false;parent.add(g);groups[kind]=g;
  }

  async function buildMarket(){
    const kind='market',g=groups[kind],mode=VENUE_MODES[kind];addShell(g,box,plane,0xd9d3bd,0xf0ead8,VENUE_INFO[kind].name,kind);
    interact(mode,0,3.18,1.0,'🚪 밖으로 나가기',()=>actions.exitVenue());
    interact(mode,3.18,1.42,1.25,'🧮 민지 선생님과 장보기',()=>actions.shop('market','민지 선생님'));
    interact(mode,-2.45,1.55,1.25,'🥕 진열 상품 살펴보기',()=>actions.shop('market','민지 선생님'));
    interact(mode,3.18,.55,1.15,'💬 민지 선생님과 이야기하기',()=>actions.resident('minji'));

    // Two clear shopping aisles plus a service counter; nothing touches the cutaway wall.
    for(const [x,z] of [[-2.55,-.85],[-.55,-.85],[1.45,-.85]])collider(mode,x,z,1.05,2.0);
    collider(mode,3.72,-2.15,1.25,1.55);
    collider(mode,-2.35,1.45,3.55,.88);
    collider(mode,3.18,1.48,2.35,.92);

    box(g,3.18,1.48,2.35,.88,.91,0xb8aa8f,.02);
    box(g,3.18,1.48,2.12,.10,.07,0xf1e6ca,.94);

    await Promise.all([
      addModel(g,MARKET+'wall-window.glb',{x:-3.25,z:-3.48,w:2.25,h:2.25,d:.28,rot:0,name:'market-window-a'}),
      addModel(g,MARKET+'wall-window.glb',{x:3.15,z:-3.48,w:2.25,h:2.25,d:.28,rot:0,name:'market-window-b'}),
      addModel(g,MARKET+'shelf-boxes.glb',{x:-2.55,z:-.85,w:1.18,h:1.82,d:2.18,rot:Math.PI/2,name:'market-shelf-boxes-a'}),
      addModel(g,MARKET+'shelf-bags.glb',{x:-.55,z:-.85,w:1.18,h:1.82,d:2.18,rot:Math.PI/2,name:'market-shelf-bags'}),
      addModel(g,MARKET+'shelf-boxes.glb',{x:1.45,z:-.85,w:1.18,h:1.82,d:2.18,rot:Math.PI/2,name:'market-shelf-boxes-b'}),
      addModel(g,MARKET+'freezers-standing.glb',{x:3.72,z:-2.15,w:1.25,h:1.95,d:1.55,rot:0,name:'market-freezers'}),
      addModel(g,MARKET+'display-fruit.glb',{x:-3.25,z:1.45,w:1.48,h:1.27,d:.92,rot:0,name:'market-fruit-display'}),
      addModel(g,MARKET+'display-bread.glb',{x:-1.45,z:1.45,w:1.48,h:1.27,d:.92,rot:0,name:'market-bread-display'}),
      addModel(g,MARKET+'cash-register.glb',{x:3.18,y:.94,z:1.48,w:.72,h:.52,d:.60,rot:Math.PI,name:'market-register'}),
      addModel(g,MARKET+'shopping-basket.glb',{x:4.03,z:2.45,w:.68,h:.48,d:.58,rot:.15,name:'market-basket'}),
      addModel(g,MARKET+'shopping-cart.glb',{x:3.45,z:2.72,w:.92,h:.87,d:1.05,rot:-.12,name:'market-cart'}),
      addMerchant(g,loadGLTF,prepModel,kind,3.18,.50,merchantMixers)
    ]);
  }

  async function buildHardware(){
    const kind='hardware',g=groups[kind],mode=VENUE_MODES[kind];addShell(g,box,plane,0xb9aa8e,0xd9c7a5,VENUE_INFO[kind].name,kind);
    interact(mode,0,3.18,1.0,'🚪 밖으로 나가기',()=>actions.exitVenue());
    interact(mode,2.65,-.65,1.30,'🛠️ 준호 선생님과 준비물 보기',()=>actions.shop('hardware','준호 선생님'));
    interact(mode,-3.05,1.55,1.20,'🪵 자재 살펴보기',()=>actions.shop('hardware','준호 선생님'));
    interact(mode,2.65,-2.55,1.12,'💬 준호 선생님과 이야기하기',()=>actions.resident('junho'));

    // A real tool wall reads as a workshop instead of loose tools floating in the room.
    box(g,0,-3.48,5.30,.12,1.48,0x75644f,.70);
    box(g,0,-3.39,5.10,.06,.12,0xb99a68,2.10);
    collider(mode,-3.55,-1.30,1.40,1.15);
    collider(mode,-3.45,.55,1.45,1.10);
    collider(mode,2.65,-1.35,2.55,1.15);
    collider(mode,-3.05,1.65,2.50,1.20);

    await Promise.all([
      addModel(g,SURVIVAL+'tool-axe.glb',{x:-1.55,y:.98,z:-3.32,w:.52,h:.88,d:.22,rot:0,name:'hardware-wall-axe'}),
      addModel(g,SURVIVAL+'tool-pickaxe.glb',{x:0,y:.98,z:-3.32,w:.52,h:.88,d:.22,rot:0,name:'hardware-wall-pick'}),
      addModel(g,SURVIVAL+'tool-hammer.glb',{x:1.55,y:.98,z:-3.32,w:.52,h:.88,d:.22,rot:0,name:'hardware-wall-hammer'}),
      addModel(g,SURVIVAL+'workbench-anvil.glb',{x:-3.55,z:-1.30,w:1.52,h:1.30,d:1.16,rot:.05,name:'hardware-anvil'}),
      addModel(g,SURVIVAL+'workbench-grind.glb',{x:-3.45,z:.55,w:1.52,h:1.38,d:1.16,rot:-.08,name:'hardware-grind'}),
      addModel(g,SURVIVAL+'workbench.glb',{x:2.65,z:-1.35,w:2.65,h:1.32,d:1.08,rot:0,name:'hardware-counter'}),
      addModel(g,SURVIVAL+'box-large.glb',{x:-3.75,z:1.62,w:1.18,h:1.0,d:1.08,rot:.04,name:'hardware-box-a'}),
      addModel(g,SURVIVAL+'box.glb',{x:-2.55,z:1.82,w:.86,h:.72,d:.82,rot:-.05,name:'hardware-box-b'}),
      addModel(g,SURVIVAL+'resource-planks.glb',{x:-1.52,z:1.58,w:1.40,h:.58,d:.85,rot:.10,name:'hardware-planks'}),
      addModel(g,SURVIVAL+'resource-stone-large.glb',{x:.15,z:1.72,w:.90,h:.70,d:.90,rot:.10,name:'hardware-stone'}),
      addModel(g,SURVIVAL+'barrel.glb',{x:4.15,z:1.78,w:.72,h:1.0,d:.72,rot:0,name:'hardware-barrel'}),
      addMerchant(g,loadGLTF,prepModel,kind,2.65,-2.58,merchantMixers)
    ]);
  }

  async function buildCafe(){
    const kind='cafe',g=groups[kind],mode=VENUE_MODES[kind];addShell(g,box,plane,0xcaa980,0xf0dfc7,VENUE_INFO[kind].name,kind);
    interact(mode,0,3.18,1.0,'🚪 밖으로 나가기',()=>actions.exitVenue());
    interact(mode,1.45,-1.20,1.35,'☕ 하늘 선생님에게 주문하기',()=>actions.shop('cafe','하늘 선생님'));
    interact(mode,1.45,-2.72,1.12,'💬 하늘 선생님과 이야기하기',()=>actions.resident('haneul'));
    interact(mode,-2.65,1.35,1.10,'🪑 카페에서 쉬기',()=>actions.cafeRest());
    interact(mode,2.45,1.35,1.10,'🪑 카페에서 쉬기',()=>actions.cafeRest());

    collider(mode,1.30,-2.05,4.35,.88);
    collider(mode,-2.75,-1.75,2.10,.92);
    collider(mode,-2.65,1.35,1.35,1.35);
    collider(mode,2.45,1.35,1.35,1.35);

    await Promise.all([
      addModel(g,BAKERY+'wall-panelled-bakery-window-large.glb',{x:-3.15,z:-3.48,w:2.30,h:2.40,d:.28,rot:0,name:'cafe-wall-window-a'}),
      addModel(g,BAKERY+'wall-panelled-bakery-straight.glb',{x:0,z:-3.48,w:2.30,h:2.40,d:.28,rot:0,name:'cafe-wall-panel'}),
      addModel(g,BAKERY+'wall-panelled-bakery-window-large.glb',{x:3.15,z:-3.48,w:2.30,h:2.40,d:.28,rot:0,name:'cafe-wall-window-b'}),
      addModel(g,BAKERY+'floor-wood.glb',{x:0,z:.65,w:9.45,h:.07,d:5.10,rot:0,name:'cafe-floor-wood'}),
      addModel(g,BAKERY+'floor-tiled.glb',{x:0,z:-2.42,w:9.45,h:.075,d:1.55,rot:0,name:'cafe-floor-tile'}),
      addModel(g,BAKERY+'counter-table.glb',{x:1.30,z:-2.05,w:4.35,h:1.12,d:.90,rot:0,name:'cafe-counter'}),
      addModel(g,BAKERY+'display-case-long.glb',{x:-2.75,z:-1.75,w:2.15,h:1.28,d:.92,rot:0,name:'cafe-display'}),
      addModel(g,BAKERY+'coffee-machine.glb',{x:1.85,y:.91,z:-2.05,w:.68,h:.68,d:.56,rot:Math.PI,name:'cafe-coffee-machine'}),
      addModel(g,BAKERY+'cash-register.glb',{x:.70,y:.91,z:-2.05,w:.55,h:.48,d:.50,rot:Math.PI,name:'cafe-register'}),
      addModel(g,BAKERY+'pastry-stand-a-decorated.glb',{x:2.80,y:.90,z:-2.05,w:.72,h:.78,d:.72,rot:0,name:'cafe-pastry'}),
      addModel(g,BAKERY+'mug-b-stacked.glb',{x:3.42,y:.91,z:-2.05,w:.42,h:.44,d:.42,rot:0,name:'cafe-mugs'}),
      addModel(g,BAKERY+'cookie-jar.glb',{x:-1.88,y:.92,z:-1.75,w:.38,h:.46,d:.38,rot:0,name:'cafe-cookie-jar'}),
      addModel(g,BAKERY+'rug.glb',{x:0,z:1.30,w:6.65,h:.055,d:2.75,rot:0,name:'cafe-rug'}),
      addModel(g,BAKERY+'table-round-a.glb',{x:-2.65,z:1.35,w:1.42,h:1.02,d:1.42,rot:0,name:'cafe-table-a'}),
      addModel(g,BAKERY+'table-round-b.glb',{x:2.45,z:1.35,w:1.42,h:1.02,d:1.42,rot:0,name:'cafe-table-b'}),
      addModel(g,BAKERY+'chair.glb',{x:-3.65,z:1.35,w:.70,h:1.0,d:.70,rot:Math.PI/2,name:'cafe-chair-a1'}),
      addModel(g,BAKERY+'chair.glb',{x:-1.65,z:1.35,w:.70,h:1.0,d:.70,rot:-Math.PI/2,name:'cafe-chair-a2'}),
      addModel(g,BAKERY+'chair.glb',{x:1.45,z:1.35,w:.70,h:1.0,d:.70,rot:Math.PI/2,name:'cafe-chair-b1'}),
      addModel(g,BAKERY+'chair.glb',{x:3.45,z:1.35,w:.70,h:1.0,d:.70,rot:-Math.PI/2,name:'cafe-chair-b2'}),
      addMerchant(g,loadGLTF,prepModel,kind,1.45,-2.75,merchantMixers)
    ]);
  }

  async function buildSchool(){
    const kind='school',g=groups[kind],mode=VENUE_MODES[kind];addShell(g,box,plane,0xd7cfb4,0xeee6cf,VENUE_INFO[kind].name,kind);
    interact(mode,0,3.18,1.0,'🚪 학교 밖으로 나가기',()=>actions.exitVenue());
    interact(mode,0,-2.72,1.40,'🧑‍🏫 현재 수업 참여하기',()=>actions.schoolClass?.());

    // Front teaching wall.
    box(g,0,-3.45,5.20,.12,1.38,0x355746,1.43);
    box(g,0,-3.36,5.42,.08,.10,0xd9c49a,2.14);
    schoolBoardLabel=canvasLabel('오늘도 생활 속에서 배워요!',{width:2.95,height:.43,font:30,depthTest:false});
    schoolBoardLabel.position.set(0,2.12,-3.31);g.add(schoolBoardLabel);
    schoolTopicLabel=canvasLabel('📋 시간표는 수업에 따라 바뀌어요',{width:2.75,height:.34,font:25,depthTest:false});
    schoolTopicLabel.position.set(0,1.64,-3.30);g.add(schoolTopicLabel);

    // Six desks: five classmates plus one intentionally empty player seat.
    const deskSpots=[[-2.45,-.45],[0,-.45],[2.45,-.45],[-2.45,1.45],[0,1.45],[2.45,1.45]];
    for(let i=0;i<deskSpots.length;i++){
      const [x,z]=deskSpots[i];
      await addModel(g,FURNITURE+'desk.glb',{x,z,w:1.35,h:.92,d:.72,rot:Math.PI,name:'school-desk-'+i});
      await addModel(g,FURNITURE+'chair-desk.glb',{x,z:z+.72,w:.72,h:1.02,d:.72,rot:0,name:'school-chair-'+i});
      collider(mode,x,z,1.18,.62);
    }
    const mySeat=canvasLabel('내 자리',{width:.90,height:.27,font:27,depthTest:false});mySeat.position.set(2.45,1.70,1.48);g.add(mySeat);
    interact(mode,2.45,1.62,1.02,'🪑 내 자리에서 수업 참여하기',()=>actions.schoolClass?.());

    // Subject corners let every teacher still matter inside the school even though
    // the main classroom only renders one homeroom teacher at a time.
    await Promise.all([
      addModel(g,FURNITURE+'bookcase-open.glb',{x:-4.25,z:-1.75,w:1.10,h:2.05,d:.52,rot:Math.PI/2,name:'school-korean-books'}),
      addModel(g,FURNITURE+'bathroom-cabinet.glb',{x:4.25,z:-1.75,w:1.08,h:1.60,d:.52,rot:-Math.PI/2,name:'school-health-cabinet'}),
      addModel(g,FURNITURE+'table.glb',{x:4.10,z:1.55,w:1.55,h:.82,d:1.00,rot:Math.PI/2,name:'school-practical-table'}),
      addModel(g,FURNITURE+'bench.glb',{x:-4.05,z:1.55,w:1.65,h:.86,d:.70,rot:Math.PI/2,name:'school-pe-bench'}),
      addModel(g,FURNITURE+'plant-small2.glb',{x:-4.25,z:.10,w:.62,h:.72,d:.62,rot:0,name:'school-class-plant'})
    ]);
    interact(mode,-4.12,-1.75,1.00,'📚 소라 선생님의 국어 코너',()=>actions.resident('sora'));
    interact(mode,4.12,-1.75,1.00,'🩺 나리 선생님의 보건 코너',()=>actions.resident('nari'));
    interact(mode,4.05,1.55,1.05,'🛠️ 준호 선생님의 실과 코너',()=>actions.resident('junho'));
    interact(mode,-4.00,1.55,1.05,'🏃 민석 선생님의 체육 코너',()=>actions.resident('minseok'));
    interact(mode,-4.20,.10,.95,'🗺️ 도윤 선생님의 마을 관찰판',()=>actions.resident('doyun'));
    interact(mode,4.20,.10,.95,'🍱 하늘 선생님의 급식 이야기',()=>actions.resident('haneul'));

    const teachers=['minji','sora','doyun','junho','nari','minseok','haneul'];
    for(const id of teachers){
      const actor=await addSchoolPerson(g,loadGLTF,prepModel,id,0,-2.35,schoolActors,merchantMixers);
      actor.interaction=interact(mode,0,-2.35,1.10,'🧑‍🏫 수업 참여하기',()=>actions.schoolClass?.());
    }
    const classmates=[
      ['yuna',-2.45,-.05],['woojin',0,-.05],['seoyeon',2.45,-.05],['taeho',-2.45,1.85],['hyunwoo',0,1.85]
    ];
    for(const [id,x,z] of classmates){
      const actor=await addSchoolPerson(g,loadGLTF,prepModel,id,x,z,schoolActors,merchantMixers);
      actor.interaction=interact(mode,x,z,1.0,'💬 '+residentVisual(id).name+'와 이야기하기',()=>actions.resident(id));
    }
    syncSchoolActors();
  }

  function syncSchoolActors(){
    if(!schoolActors.length)return;
    const mins=Number(getGameTime?.()??720),period=schoolPeriodAt(mins);
    if(period.id===lastSchoolPeriodId)return;
    const previous=lastSchoolPeriodId;lastSchoolPeriodId=period.id;
    const studentsInside=['class','club'].includes(period.kind);
    for(const actor of schoolActors){
      const visible=actor.kind==='teacher'
        ?period.kind==='class'&&actor.id===period.teacher
        :studentsInside;
      actor.anchor.visible=visible;actor.label.visible=visible;
      if(actor.interaction){
        actor.interaction.enabled=visible;
        if(actor.kind==='teacher'&&visible)actor.interaction.label=(period.icon||'🧑‍🏫')+' '+(period.label||'수업')+' 참여하기';
      }
    }
    schoolBoardLabel?.userData?.setText?.((period.icon||'🏫')+' '+(period.label||'씨앗학교'));
    schoolTopicLabel?.userData?.setText?.(period.board||'오늘도 즐겁게 배워요.');
    if(previous&&previous!==period.id&&groups.school?.visible)actions.schoolBell?.(period);
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
    const kind='museum',g=groups[kind],mode=VENUE_MODES[kind];addShell(g,box,plane,0xc9c5b4,0xe7e2d1,VENUE_INFO[kind].name,kind);
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

  const builders={market:buildMarket,hardware:buildHardware,cafe:buildCafe,museum:buildMuseum,school:buildSchool};
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
    await ensure(kind);if(kind==='museum')syncMuseumDisplays();if(kind==='school')syncSchoolActors();if(g)g.visible=true;return g;
  }
  hideAll();
  return {groups,show,hideAll,ensure,syncMuseumDisplays,syncSchoolActors,isBuilt:kind=>built.has(kind),update(dt){for(const mixer of merchantMixers)mixer.update(dt);syncSchoolActors();}};
}

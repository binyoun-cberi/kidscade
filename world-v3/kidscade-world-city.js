import * as THREE from 'three';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import {CITY_BOUNDS,WORLD_GRID} from './kidscade-world-grid.js?v=6';
import {createResidentLife} from './kidscade-world-residents.js?v=7';
import {residentVisual} from './kidscade-world-npc-style.js?v=2';
import {SCHOOL_PROFILES,schoolInteractionLabel} from './kidscade-world-school.js?v=3';
export {CITY_BOUNDS};

const ROOT=new URL('../assets/game/',import.meta.url);
const PEOPLE=new URL('characters/people/',ROOT).href;
const SUBURBAN=new URL('3d/city/kenney-city-kit-suburban/',ROOT).href;
const ROADS=new URL('3d/city/kenney-city-kit-roads/',ROOT).href;
const POLY=new URL('3d/city/poly-pizza-city-pack/',ROOT).href;
const MARKET=new URL('shops/market/',ROOT).href;
const FURNITURE=new URL('3d/interiors/kenney-furniture-kit/',ROOT).href;
const QBUILD=new URL('buildings/Models with Materials/FBX/',ROOT).href;

const CITY_ASSET={
  market:SUBURBAN+'building-type-b.glb',
  hardware:QBUILD+'1Story_Sign_Mat.fbx',
  cafe:QBUILD+'1Story_GableRoof_Mat.fbx',
  arcade:SUBURBAN+'building-type-e.glb',
  civic:QBUILD+'2Story_Columns_Mat.fbx',
  school:QBUILD+'2Story_Columns_Mat.fbx',
  library:QBUILD+'2Story_Balcony_Mat.fbx',
  clinic:QBUILD+'1Story_RoundRoof_Mat.fbx',
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
  bench:FURNITURE+'bench.glb',
  museum:SUBURBAN+'building-type-i.glb',
  homes:[
    SUBURBAN+'building-type-a.glb',SUBURBAN+'building-type-c.glb',SUBURBAN+'building-type-d.glb',
    SUBURBAN+'building-type-f.glb',SUBURBAN+'building-type-g.glb',SUBURBAN+'building-type-h.glb',
    SUBURBAN+'building-type-j.glb',SUBURBAN+'building-type-k.glb'
  ],
  pathLong:SUBURBAN+'path-stones-long.glb',
  pathMessy:SUBURBAN+'path-stones-messy.glb',
  driveway:SUBURBAN+'driveway-short.glb',
  residentialTreeLarge:SUBURBAN+'tree-large.glb',
  residentialTreeSmall:SUBURBAN+'tree-small.glb',
  residentialFence:SUBURBAN+'fence-low.glb'
};

function makeLabel(text,{width=2.2,height=.52,font=38}={}){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
  const ctx=canvas.getContext('2d'),x=12,y=16,w=488,h=96,r=26;
  const draw=value=>{
    ctx.clearRect(0,0,512,128);
    ctx.fillStyle='rgba(255,249,218,.94)';ctx.strokeStyle='#4b5841';ctx.lineWidth=8;
    ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle='#2d3a2d';ctx.font='700 '+font+'px system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(value||''),256,65,455);
  };
  draw(text);
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
  const mat=new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false,depthTest:true});
  const sp=new THREE.Sprite(mat);sp.scale.set(width,height,1);sp.renderOrder=20;
  sp.userData.setText=value=>{draw(value);tex.needsUpdate=true;};return sp;
}
function makeResidentLabel(text,{role='주민',accent='#7c9863'}={}){
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=224;
  const ctx=canvas.getContext('2d'),x=18,y=18,w=732,h=188,r=44;
  const draw=value=>{
    const title=String(value||'주민');
    ctx.clearRect(0,0,768,224);
    ctx.shadowColor='rgba(31,40,31,.22)';ctx.shadowBlur=14;ctx.shadowOffsetY=8;
    ctx.fillStyle='rgba(255,250,229,.985)';ctx.strokeStyle='#40503b';ctx.lineWidth=10;
    ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();ctx.stroke();
    ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.shadowOffsetY=0;
    ctx.fillStyle=accent;ctx.beginPath();ctx.arc(72,84,17,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#263226';ctx.font='900 58px system-ui,sans-serif';ctx.textAlign='left';ctx.textBaseline='middle';
    ctx.fillText(title,108,80,610);
    ctx.fillStyle='rgba(38,50,38,.76)';ctx.font='800 31px system-ui,sans-serif';
    ctx.fillText(role,72,148,620);
  };
  draw(text);
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.minFilter=THREE.LinearFilter;
  const mat=new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false,depthTest:true});
  const sp=new THREE.Sprite(mat);sp.scale.set(1.92,.56,1);sp.renderOrder=40;
  sp.userData.setText=value=>{
    draw(value);tex.needsUpdate=true;
    sp.scale.x=Math.min(2.9,Math.max(1.92,1.22+String(value||'').length*.17));
  };
  return sp;
}



const CHARACTER_GROUND_CLEARANCE=.018;

function inPlaceCharacterClip(source){
  if(!source)return null;
  const clip=source.clone?source.clone():source;
  if(clip?.tracks)clip.tracks=clip.tracks.filter(track=>!/(^|[./])(?:root|bone)\.position$/i.test(String(track.name||'')));
  return clip;
}
function normalizeCharacterModel(model,height){
  model.updateMatrixWorld(true);
  let b=new THREE.Box3().setFromObject(model),size=b.getSize(new THREE.Vector3());
  const baseHeight=Math.max(.001,size.y||Math.max(size.x,size.z)||1);
  model.scale.multiplyScalar((Number(height)||1.82)/baseHeight);
  model.updateMatrixWorld(true);
  b=new THREE.Box3().setFromObject(model);
  const center=b.getCenter(new THREE.Vector3());
  model.position.x-=center.x;model.position.z-=center.z;model.position.y-=b.min.y;
  model.updateMatrixWorld(true);
  b=new THREE.Box3().setFromObject(model);
  if(Number.isFinite(b.min.y)&&Math.abs(b.min.y)>.0001)model.position.y-=b.min.y;
  model.updateMatrixWorld(true);
}

async function mapLimit(items,limit,worker){
  const out=new Array(items.length);let cursor=0;
  async function lane(){
    while(true){
      const index=cursor++;if(index>=items.length)return;
      out[index]=await worker(items[index],index);
    }
  }
  await Promise.all(Array.from({length:Math.min(Math.max(1,limit),items.length)},()=>lane()));
  return out;
}

async function addNpc(ctx,id,name,x,z,{radius=.48,role='resident',label=true}={}){
  const visual=residentVisual(id);
  const gltf=await ctx.loadGLTF(visual.url);
  // Keep the complete character asset: independent skeleton + original animation clips.
  const model=ctx.prepModel(cloneSkeleton(gltf.scene));
  // Match the already-working people pipeline used by the market game:
  // normalize by the largest axis, then center X/Z and put feet on local Y=0.
  normalizeCharacterModel(model,visual.height);
  const anchor=new THREE.Group();anchor.position.set(x,.025,z);anchor.add(model);
  model.traverse(n=>{if(n.isSkinnedMesh)n.frustumCulled=false;});
  const mixer=new THREE.AnimationMixer(model);
  const clips=Array.isArray(gltf.animations)?gltf.animations:[];
  // These glTF NPCs use "Bone.position" as the skeleton root while KayKit uses
  // "root.position". Strip both from idle/walk so animation can never push a
  // character sideways or below the terrain independently of its world anchor.
  const idleClip=inPlaceCharacterClip(clips.find(c=>/idle|stand/i.test(c.name))||clips[0]||null);
  const walkClip=inPlaceCharacterClip(clips.find(c=>/walk|run/i.test(c.name))||idleClip);
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
  const tag=label?makeResidentLabel(name,{role:visual.role,accent:visual.accent}):null;
  if(tag){tag.position.set(x,2.22,z);tag.visible=false;ctx.parent.add(tag)}
  return {id,name,object:anchor,model,mixer,playAnim,label:tag,interaction:null,homeX:x,homeZ:z,groundY:CHARACTER_GROUND_CLEARANCE,r:radius,role,phase:(id.length*1.37)%6.2,targetX:x,targetZ:z,nextDecision:0,moving:false,anchorX:x,anchorZ:z};
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
  const layout=[],buildingLabels=[],walkSurfaces=[];
  const track=(id,type,x,z,w,d)=>{layout.push({id,type,x,z,w,d});return {id,type,x,z,w,d}};
  const registerSurface=(id,x,z,w,d,y)=>{walkSurfaces.push({id,x,z,w,d,y});};
  const groundSurfaceYAt=(x,z)=>{
    let y=0;
    for(const surface of walkSurfaces){
      if(Math.abs(x-surface.x)<=surface.w/2&&Math.abs(z-surface.z)<=surface.d/2)y=Math.max(y,surface.y);
    }
    return y;
  };
  const characterGroundYAt=(x,z)=>groundSurfaceYAt(x,z)+CHARACTER_GROUND_CLEARANCE;
  const p=(id,dx=0,dz=0)=>{const c=WORLD_GRID[id];return {x:c.cx+dx,z:c.cz+dz}};

  // Road-first city: asphalt occupies ONLY the 4m gutters between 20x20 city parcels.
  box(parent,0,36,44,4,.09,0x62696d,-.01);    // between lower / upper core city squares
  box(parent,0,36,4,44,.09,0x62696d,-.01);    // between west / east core city squares
  box(parent,-24,36,4,44,.09,0x62696d,-.01);  // museum avenue between camp/museum and the core town
  box(parent,0,12,44,4,.09,0x62696d,-.01);    // shared approach from home/farm
  registerSurface('road-mid-horizontal',0,36,44,4,.08);
  registerSurface('road-mid-vertical',0,36,4,44,.08);
  registerSurface('road-museum',-24,36,4,44,.08);
  registerSurface('road-south',0,12,44,4,.08);
  track('city-road-mid-horizontal','road',0,36,44,4);
  track('city-road-mid-vertical','road',0,36,4,44);
  track('city-road-museum','road',-24,36,4,44);
  track('city-road-south','road',0,12,44,4);

  // Sidewalk ribbons live just INSIDE each parcel, parallel to the road gutters.
  for(const x of [-2.55,2.55]){plane(parent,x,36,.7,44,0xe6dfca,.06);registerSurface('sidewalk-x-'+x,x,36,.7,44,.06);}
  for(const z of [33.45,38.55]){plane(parent,0,z,44,.7,0xe6dfca,.06);registerSurface('sidewalk-z-'+z,0,z,44,.7,.06);}
  for(const z of [14.55]){plane(parent,0,z,44,.7,0xe6dfca,.06);registerSurface('sidewalk-south-'+z,0,z,44,.7,.06);}

  // Crosswalks connect the exact centers of parcel entrances.
  for(const x of [-12,12]){
    for(const z of [10.8,11.55,12.3,13.05]){plane(parent,x,z,3.0,.34,0xf3eee1,.11);registerSurface('crosswalk-s-'+x+'-'+z,x,z,3.0,.34,.11);}
    for(const z of [34.8,35.55,36.3,37.05]){plane(parent,x,z,3.0,.34,0xf3eee1,.11);registerSurface('crosswalk-n-'+x+'-'+z,x,z,3.0,.34,.11);}
  }
  for(const z of [24,48]){
    for(const x of [-1.4,-.65,.1,.85]){plane(parent,x,z,.34,3.0,0xf3eee1,.11);registerSurface('crosswalk-v-'+x+'-'+z,x,z,.34,3.0,.11);}
  }

  const market=p('cityMarket'),leisure=p('cityLeisure'),civic=p('cityCivic'),transit=p('cityTransit'),museum=p('museum'),
    residentialSouth=p('residentialSouth'),residentialNorth=p('residentialNorth');
  const buildings=[
    ['market',CITY_ASSET.market,market.x-4.7,market.z-5.2,6.0,5.2,'씨앗마트',2.25],
    ['hardware',CITY_ASSET.hardware,market.x+4.7,market.z-5.2,6.0,5.2,'튼튼 철물점',2.25],
    ['cafe',CITY_ASSET.cafe,leisure.x-4.7,leisure.z-5.2,6.0,5.2,'하늘 카페',2.25],
    ['arcade',CITY_ASSET.arcade,leisure.x+4.7,leisure.z-5.2,6.0,5.2,'키즈 아케이드',2.25],
    ['library',CITY_ASSET.library,civic.x-4.7,civic.z-5.0,6.2,5.0,'마을 도서관',2.25],
    ['school',CITY_ASSET.school,civic.x+4.7,civic.z-5.0,6.6,5.0,'씨앗학교',2.25],
    ['clinic',CITY_ASSET.clinic,transit.x-4.7,transit.z-5.0,6.2,5.0,'튼튼 보건소',2.25],
    ['museum',CITY_ASSET.museum,museum.x,museum.z-4.4,10.5,7.0,'씨앗 자연박물관',3.15]
  ];
  for(const [id,url,x,z,w,d,name,labelDz] of buildings){
    await addModel(parent,url,{x,z,w,h:5.0,d,rot:Math.PI,name:'city-'+id});
    collider('outdoor',x,z,w*.82,d*.70);track('building-'+id,'building',x,z,w*.82,d*.70);
    const label=makeLabel(name,{width:1.9,height:.44,font:33});
    label.position.set(x,3.72,z+labelDz);label.userData.anchor={x,z:z+labelDz};label.visible=false;
    parent.add(label);buildingLabels.push(label);
  }

  // Walk-in venues share the same transition system. Triggers sit just outside the building colliders.
  for(const [id,x,z,r,label] of [
    ['market',market.x-4.7,market.z-2.55,1.35,'🚪 씨앗마트 들어가기'],
    ['hardware',market.x+4.7,market.z-2.55,1.35,'🚪 튼튼 철물점 들어가기'],
    ['cafe',leisure.x-4.7,leisure.z-2.55,1.35,'🚪 하늘 카페 들어가기'],
    ['museum',museum.x,museum.z-.55,1.55,'🏛️ 씨앗 자연박물관 들어가기'],
    ['school',civic.x+4.7,civic.z-2.55,1.45,'🏫 씨앗학교 들어가기']
  ])interact('outdoor',x,z,r,label,()=>actions.enterVenue?.(id));

  // Commerce props stay deep inside the market parcel, never on the south or center roads.
  await Promise.all([
    addModel(parent,CITY_ASSET.fruit,{x:market.x-5.8,z:market.z+.6,w:1.6,h:1.35,d:1.0,rot:0,name:'market-fruit'}),
    addModel(parent,CITY_ASSET.bread,{x:market.x-3.5,z:market.z+.6,w:1.6,h:1.35,d:1.0,rot:0,name:'market-bread'}),
    addModel(parent,CITY_ASSET.register,{x:market.x-4.7,z:market.z+2.0,w:.8,h:.62,d:.7,rot:Math.PI,name:'market-register'}),
    addModel(parent,CITY_ASSET.cart,{x:market.x-.8,z:market.z+.4,w:1.0,h:.95,d:1.1,rot:.1,name:'market-cart'}),
    addModel(parent,CITY_ASSET.atm,{x:market.x-7.3,z:market.z+2.0,w:.75,h:1.45,d:.65,rot:Math.PI/2,name:'market-atm'})
  ]);
  track('market-fruit','decor',market.x-5.8,market.z+.6,1.6,1.0);
  track('market-bread','decor',market.x-3.5,market.z+.6,1.6,1.0);
  track('market-register','decor',market.x-4.7,market.z+2.0,.8,.7);
  track('market-cart','decor',market.x-.8,market.z+.4,1.0,1.1);
  track('market-atm','decor',market.x-7.3,market.z+2.0,.75,.65);

  // Leisure parcel keeps a large empty center for NPCs and events.
  await Promise.all([
    addModel(parent,CITY_ASSET.bench,{x:leisure.x-4.4,z:leisure.z+3.0,w:2.0,h:.95,d:.78,rot:Math.PI/2,name:'plaza-bench-west'}),
    addModel(parent,CITY_ASSET.bench,{x:leisure.x+4.4,z:leisure.z+3.0,w:2.0,h:.95,d:.78,rot:-Math.PI/2,name:'plaza-bench-east'}),
    addModel(parent,CITY_ASSET.planter,{x:leisure.x-6.5,z:leisure.z+2.7,w:1.2,h:.85,d:.85,rot:0,name:'plaza-planter-west'}),
    addModel(parent,CITY_ASSET.planter,{x:leisure.x+6.5,z:leisure.z+2.7,w:1.2,h:.85,d:.85,rot:0,name:'plaza-planter-east'})
  ]);

  // Daily request board: three notes refresh with the DailyDirector.
  {
    const bx=leisure.x,bz=leisure.z+7.1;
    box(parent,bx-.95,bz,.12,.12,1.75,0x72513a,.02);
    box(parent,bx+.95,bz,.12,.12,1.75,0x72513a,.02);
    box(parent,bx,bz,2.25,.18,1.15,0xb98b58,.72);
    box(parent,bx,bz-.02,2.45,.24,.14,0x6b4931,1.84);
    for(const dx of [-.62,0,.62])box(parent,bx+dx,bz-.12,.48,.035,.58,0xfff1c9,1.02+(dx===0?.08:0));
    track('daily-request-board','decor',bx,bz,2.25,.32);
    interact('outdoor',bx,bz+.75,1.35,'📌 오늘의 학교생활 보기',()=>actions.dailyBoard?.());
  }

  // School / library campus. The former civic hall is now the school building;
  // the northern half of the parcel stays open as a small schoolyard for breaks and events.
  plane(parent,civic.x+4.7,civic.z+3.8,7.2,6.0,0xb7b18d,.065);
  registerSurface('school-yard',civic.x+4.7,civic.z+3.8,7.2,6.0,.065);
  for(const x of [civic.x+2.1,civic.x+4.7,civic.x+7.3]){
    box(parent,x,civic.z+3.8,.08,5.0,.025,0xf3eee1,.078);
  }
  for(const z of [civic.z+1.8,civic.z+3.8,civic.z+5.8]){
    box(parent,civic.x+4.7,z,6.0,.08,.025,0xf3eee1,.079);
  }
  track('school-yard','plaza',civic.x+4.7,civic.z+3.8,7.2,6.0);

  // Playground equipment is intentionally lightweight and readable from the isometric camera.
  // The mini-games themselves live in the school-life state so these props remain safe for old saves.
  const goalMat=0xf7f3df;
  for(const z of [civic.z+1.22,civic.z+6.38]){
    box(parent,civic.x+3.72,z,.10,.10,1.15,goalMat,.58);
    box(parent,civic.x+5.68,z,.10,.10,1.15,goalMat,.58);
    box(parent,civic.x+4.70,z,2.06,.10,.10,goalMat,1.12);
  }
  const soccerBall=new THREE.Mesh(new THREE.SphereGeometry(.22,16,12),new THREE.MeshStandardMaterial({color:0xf5f3e9,roughness:.72}));
  soccerBall.position.set(civic.x+4.7,.24,civic.z+3.25);soccerBall.name='schoolyard-soccer-ball';parent.add(soccerBall);
  const dodgeBall=new THREE.Mesh(new THREE.SphereGeometry(.20,16,12),new THREE.MeshStandardMaterial({color:0xd85b50,roughness:.68}));
  dodgeBall.position.set(civic.x+6.55,.22,civic.z+4.35);dodgeBall.name='schoolyard-dodge-ball';parent.add(dodgeBall);
  const lunchMarker=makeLabel('🍱 급식 자리',{width:1.20,height:.30,font:27});
  lunchMarker.position.set(civic.x+7.2,1.72,civic.z+6.10);lunchMarker.userData.anchor={x:civic.x+7.2,z:civic.z+6.10};lunchMarker.visible=false;
  parent.add(lunchMarker);buildingLabels.push(lunchMarker);

  interact('outdoor',civic.x+4.7,civic.z+3.25,1.05,'⚽ 운동장 놀이하기',()=>actions.schoolYard?.());
  interact('outdoor',civic.x+6.55,civic.z+4.35,1.00,'🔴 피구 한 판 하기',()=>actions.schoolBreakGame?.('dodge'));
  interact('outdoor',civic.x+2.2,civic.z+5.55,1.15,'👫 친구와 같이 놀기',()=>actions.schoolFriends?.());
  interact('outdoor',civic.x+7.2,civic.z+6.10,1.20,'🍱 오늘의 급식 먹기',()=>actions.schoolLunch?.());

  await Promise.all([
    addModel(parent,CITY_ASSET.mailbox,{x:civic.x-1.0,z:civic.z+1.8,w:.7,h:1.25,d:.6,rot:0,name:'town-mailbox'}),
    addModel(parent,CITY_ASSET.planter,{x:civic.x-6.7,z:civic.z+6.2,w:1.2,h:.85,d:.85,rot:0,name:'library-planter'}),
    addModel(parent,CITY_ASSET.bench,{x:civic.x+2.2,z:civic.z+6.1,w:1.9,h:.92,d:.74,rot:Math.PI/2,name:'schoolyard-bench-a'}),
    addModel(parent,CITY_ASSET.bench,{x:civic.x+7.2,z:civic.z+6.1,w:1.9,h:.92,d:.74,rot:-Math.PI/2,name:'schoolyard-bench-b'})
  ]);
  const schoolYardLabel=makeLabel('씨앗학교 운동장',{width:1.85,height:.40,font:31});
  schoolYardLabel.position.set(civic.x+4.7,2.75,civic.z+6.0);schoolYardLabel.userData.anchor={x:civic.x+4.7,z:civic.z+6.0};schoolYardLabel.visible=false;
  parent.add(schoolYardLabel);buildingLabels.push(schoolYardLabel);

  // Transit / clinic parcel.
  await Promise.all([
    addModel(parent,CITY_ASSET.busStop,{x:transit.x+4.8,z:transit.z+2.0,w:2.7,h:2.5,d:1.5,rot:-Math.PI/2,name:'seed-bus-stop'}),
    addModel(parent,CITY_ASSET.busSign,{x:transit.x+3.1,z:transit.z+.2,w:.55,h:2.2,d:.55,rot:0,name:'seed-bus-sign'}),
    addModel(parent,CITY_ASSET.bicycle,{x:transit.x+6.2,z:transit.z+5.7,w:1.55,h:1.15,d:.55,rot:.25,name:'town-bicycle'})
  ]);
  track('transport-corner','decor',transit.x+4.8,transit.z+2.4,6.4,7.2);

  // Residential districts occupy the two previously dead eastern parcels.
  // Lower town has eight compact homes; upper town keeps more breathing room around a small park.
  const residentHomes={};
  const homeDefs=[
    ['minji','민지',residentialSouth.x-6.6,residentialSouth.z-4.6,0,Math.PI],
    ['junho','준호',residentialSouth.x-2.2,residentialSouth.z-4.6,1,Math.PI],
    ['haneul','하늘',residentialSouth.x+2.2,residentialSouth.z-4.6,2,Math.PI],
    ['taeho','태호',residentialSouth.x+6.6,residentialSouth.z-4.6,3,Math.PI],
    ['yuna','유나',residentialSouth.x-6.6,residentialSouth.z+4.6,4,0],
    ['woojin','우진',residentialSouth.x-2.2,residentialSouth.z+4.6,5,0],
    ['seoyeon','서연',residentialSouth.x+2.2,residentialSouth.z+4.6,6,0],
    ['hyunwoo','현우',residentialSouth.x+6.6,residentialSouth.z+4.6,7,0],
    ['doyun','도윤',residentialNorth.x-4.7,residentialNorth.z-4.4,3,Math.PI],
    ['sora','소라',residentialNorth.x+4.7,residentialNorth.z-4.4,6,Math.PI],
    ['nari','나리',residentialNorth.x-4.7,residentialNorth.z+4.4,2,0],
    ['minseok','민석',residentialNorth.x+4.7,residentialNorth.z+4.4,5,0]
  ];

  // Main garden lanes visually connect to the x=24 road without creating another asphalt grid.
  plane(parent,residentialSouth.x,residentialSouth.z,18.6,1.35,0xd8ceb2,.065);
  plane(parent,residentialNorth.x,residentialNorth.z,18.6,1.35,0xd8ceb2,.065);
  plane(parent,residentialSouth.x-8.7,residentialSouth.z,1.4,18.4,0xd8ceb2,.064);
  plane(parent,residentialNorth.x-8.7,residentialNorth.z,1.4,18.4,0xd8ceb2,.064);
  registerSurface('res-south-lane',residentialSouth.x,residentialSouth.z,18.6,1.35,.065);
  registerSurface('res-north-lane',residentialNorth.x,residentialNorth.z,18.6,1.35,.065);
  registerSurface('res-south-cross',residentialSouth.x-8.7,residentialSouth.z,1.4,18.4,.064);
  registerSurface('res-north-cross',residentialNorth.x-8.7,residentialNorth.z,1.4,18.4,.064);

  await mapLimit(homeDefs,4,async def=>{
    const [id,name,x,z,assetIndex,rot]=def,north=z>=(residentialNorth.z-10),frontDz=rot===Math.PI?2.05:-2.05;
    await addModel(parent,CITY_ASSET.homes[assetIndex%CITY_ASSET.homes.length],{
      x,z,w:north?4.25:3.85,h:north?4.25:3.95,d:3.45,rot,name:'resident-home-'+id
    });
    collider('outdoor',x,z,north?3.65:3.35,2.85);
    track('resident-home-'+id,'building',x,z,north?3.65:3.35,2.85);
    const door={x,z:z+frontDz};residentHomes[id]=door;
    // Doorstep path reaches the shared garden lane, so every house is visibly connected.
    const laneZ=north?residentialNorth.z:residentialSouth.z,pathZ=(door.z+laneZ)/2;
    const pathD=Math.abs(door.z-laneZ)+.85;plane(parent,x,pathZ,.78,pathD,0xd7ccb1,.072);registerSurface('home-path-'+id,x,pathZ,.78,pathD,.072);
    const label=makeLabel(name+'의 집',{width:1.48,height:.36,font:30});
    label.position.set(x,3.05,z+frontDz*.72);label.userData.anchor={x,z:z+frontDz*.72};label.visible=false;
    parent.add(label);buildingLabels.push(label);
  });

  // South residential planting: enough detail to hide the parcel edge without blocking the central lane.
  await Promise.all([
    [residentialSouth.x-8.2,residentialSouth.z-7.2,1],[residentialSouth.x+8.0,residentialSouth.z-6.8,0],
    [residentialSouth.x-8.1,residentialSouth.z+7.1,0],[residentialSouth.x+8.0,residentialSouth.z+7.0,1]
  ].map(([x,z,large])=>addModel(parent,large?CITY_ASSET.residentialTreeLarge:CITY_ASSET.residentialTreeSmall,{x,z,w:1.7,h:3.4,d:1.7,rot:.1})));

  // North residential district keeps a real pocket park between the four homes.
  plane(parent,residentialNorth.x,residentialNorth.z,6.8,5.4,0x9db67c,.07);
  registerSurface('north-pocket-park',residentialNorth.x,residentialNorth.z,6.8,5.4,.07);
  await Promise.all([
    addModel(parent,CITY_ASSET.bench,{x:residentialNorth.x-1.9,z:residentialNorth.z+.2,w:1.9,h:.92,d:.74,rot:Math.PI/2,name:'residential-park-bench-a'}),
    addModel(parent,CITY_ASSET.bench,{x:residentialNorth.x+1.9,z:residentialNorth.z-.2,w:1.9,h:.92,d:.74,rot:-Math.PI/2,name:'residential-park-bench-b'}),
    addModel(parent,CITY_ASSET.planter,{x:residentialNorth.x,z:residentialNorth.z-2.0,w:1.2,h:.85,d:.85,rot:0,name:'residential-park-planter'}),
    addModel(parent,CITY_ASSET.residentialTreeLarge,{x:residentialNorth.x,z:residentialNorth.z+2.0,w:2.0,h:3.8,d:2.0,rot:.2,name:'residential-park-tree'})
  ]);
  track('residential-pocket-park','plaza',residentialNorth.x,residentialNorth.z,6.8,5.4);

  // Lamps are also kept inside parcels, at least 1m from the road gutter.
  await Promise.all([
    [market.x-8,market.z+3.0],[market.x+8,market.z+3.0],
    [leisure.x-8,leisure.z+3.0],[leisure.x+8,leisure.z+3.0],
    [civic.x-8,civic.z+3.0],[civic.x+8,civic.z+3.0],
    [transit.x-8,transit.z+3.0],[transit.x+8,transit.z+3.0]
  ].map(([x,z])=>addModel(parent,CITY_ASSET.lamp,{x,z,w:.5,h:3.4,d:.5,rot:0})));

  const npcCtx={parent,loadGLTF,prepModel};
  const npcDefs=[
    ['minji','민지',market.x-4.7,market.z-1.0,{role:'shop'}],
    ['junho','준호',market.x+4.7,market.z-1.0,{role:'shop'}],
    ['haneul','하늘',leisure.x-4.7,leisure.z-1.0,{role:'shop'}],
    ['taeho','태호',leisure.x+4.7,leisure.z-1.0,{role:'arcade'}],
    ['doyun','도윤',civic.x+4.5,civic.z+1.0,{role:'civic',radius:.45}],
    ['sora','소라',civic.x-4.5,civic.z+1.0,{role:'library'}],
    ['nari','나리',transit.x-4.5,transit.z+1.0,{role:'clinic'}],
    ['minseok','민석',transit.x+4.5,transit.z+1.0,{role:'bus'}],
    ['yuna','유나',leisure.x-4.0,leisure.z+4.2,{role:'resident',radius:.55}],
    ['woojin','우진',leisure.x,leisure.z+4.8,{role:'resident',radius:.55}],
    ['seoyeon','서연',leisure.x+4.0,leisure.z+4.2,{role:'resident',radius:.55}],
    ['hyunwoo','현우',market.x,market.z+4.5,{role:'delivery',radius:.45}],
    ['clerk',SCHOOL_PROFILES.clerk.name,market.x-6.6,market.z-1.2,{role:'student',label:false,radius:.20}],
    ['visitor',SCHOOL_PROFILES.visitor.name,leisure.x+3.0,leisure.z+6.7,{role:'student',radius:.42}]
  ];
  // Resident glTF files are roughly 25 MB together. Four lanes overlap network/decode
  // work without hammering low-end classroom tablets with 14 simultaneous parses.
  const npcs=await mapLimit(npcDefs,4,([id,name,x,z,opts])=>addNpc(npcCtx,id,name,x,z,opts));
  const visitor=npcs.find(n=>n.id==='visitor');
  if(visitor){visitor.object.visible=false;if(visitor.label)visitor.label.visible=false}

  for(const n of npcs){
    n.groundY=characterGroundYAt(n.object.position.x,n.object.position.z);
    n.object.position.y=n.groundY;
    if(n.label)n.label.position.y=n.groundY+2.195;
  }
  const byId=Object.fromEntries(npcs.map(n=>[n.id,n]));
  for(const n of npcs){
    if(n.id==='clerk')continue;
    const marker=makeLabel('💬',{width:1.55,height:.36,font:26});
    marker.position.set(n.object.position.x,2.82,n.object.position.z);marker.visible=false;parent.add(marker);n.chatMarker=marker;
  }
  function bind(id,r,label,action){
    const n=byId[id];if(!n)return;
    n.interaction=interact('outdoor',n.object.position.x,n.object.position.z,r,label,action);
  }
  for(const id of ['minji','junho','haneul','taeho','doyun','sora','nari','minseok','yuna','woojin','seoyeon','hyunwoo']){
    bind(id,id==='minseok'?1.45:1.35,schoolInteractionLabel(id),()=>actions.resident(id));
  }
  bind('visitor',1.45,'🎒 오늘의 교류 학생과 이야기하기',()=>actions.dailyVisitor?.());

  interact('outdoor',leisure.x-4.4,leisure.z+3.0,1.2,'광장 벤치에서 쉬기',()=>actions.bench());
  interact('outdoor',leisure.x+4.4,leisure.z+3.0,1.2,'광장 벤치에서 쉬기',()=>actions.bench());

  validateMapLayout(layout);

  const pois={
    market:{x:market.x-4.7,z:market.z-1.0,r:.32},
    hardware:{x:market.x+4.7,z:market.z-1.0,r:.32},
    cafe:{x:leisure.x-4.7,z:leisure.z-1.0,r:.32},
    arcade:{x:leisure.x+4.7,z:leisure.z-1.0,r:.34},
    civic:{x:civic.x+4.5,z:civic.z+1.0,r:.38},
    schoolGate:{x:civic.x+4.7,z:civic.z-2.15,r:.72},
    schoolInside:{x:civic.x+4.7,z:civic.z-4.4,r:.10},
    schoolYard:{x:civic.x+4.7,z:civic.z+3.5,r:2.25},
    schoolGarden:{x:civic.x+1.7,z:civic.z+5.5,r:.90},
    library:{x:civic.x-4.5,z:civic.z+1.0,r:.34},
    clinic:{x:transit.x-4.5,z:transit.z+1.0,r:.34},
    busStop:{x:transit.x+4.5,z:transit.z+1.0,r:.36},
    marketFront:{x:market.x,z:market.z+4.5,r:1.15},
    cafeFront:{x:leisure.x-4.0,z:leisure.z+3.9,r:.80},
    plazaWest:{x:leisure.x-4.0,z:leisure.z+4.0,r:1.0},
    plazaEast:{x:leisure.x+4.0,z:leisure.z+4.0,r:1.0},
    plazaCenter:{x:leisure.x,z:leisure.z+3.4,r:1.35},
    civicGarden:{x:civic.x,z:civic.z+6.0,r:1.15},
    coveredPlaza:{x:leisure.x-1.0,z:leisure.z-1.1,r:.72},
    riverLook:{x:5.0,z:15.8,r:.8},
    homeFallback:{x:residentialSouth.x-8.6,z:residentialSouth.z,r:.25},
    'home-minji':{...residentHomes.minji,r:.18},
    'home-junho':{...residentHomes.junho,r:.18},
    'home-haneul':{...residentHomes.haneul,r:.18},
    'home-taeho':{...residentHomes.taeho,r:.18},
    'home-yuna':{...residentHomes.yuna,r:.18},
    'home-woojin':{...residentHomes.woojin,r:.18},
    'home-seoyeon':{...residentHomes.seoyeon,r:.18},
    'home-hyunwoo':{...residentHomes.hyunwoo,r:.18},
    'home-doyun':{...residentHomes.doyun,r:.18},
    'home-sora':{...residentHomes.sora,r:.18},
    'home-nari':{...residentHomes.nari,r:.18},
    'home-minseok':{...residentHomes.minseok,r:.18}
  };
  const livingNpcs=npcs.filter(n=>n.id!=='clerk'&&n.id!=='visitor');
  const npcBlockers=layout.filter(v=>v.type==='building'||v.type==='decor');
  const isNpcBlocked=(x,z)=>npcBlockers.some(v=>Math.abs(x-v.x)<v.w/2+.34&&Math.abs(z-v.z)<v.d/2+.34);
  const residentLife=createResidentLife({
    npcs:livingNpcs,pois,
    getMinutes:()=>typeof getGameTime==='function'?getGameTime():720,
    getPlayer:()=>typeof getPlayerPosition==='function'?getPlayerPosition():null,
    getDailyState:()=>typeof getDailyState==='function'?getDailyState():null,
    getGroundY:characterGroundYAt,
    isBlocked:isNpcBlocked
  });

  return {
    npcs,bounds:CITY_BOUNDS,residentLife,groundSurfaceYAt,characterGroundYAt,
    groundAudit:()=>npcs.map(n=>({id:n.id,x:n.object.position.x,z:n.object.position.z,y:n.object.position.y,expected:characterGroundYAt(n.object.position.x,n.object.position.z),delta:n.object.position.y-characterGroundYAt(n.object.position.x,n.object.position.z)})),
    update(now,dt){
      const player=typeof getPlayerPosition==='function'?getPlayerPosition():null;
      for(const label of buildingLabels){
        const a=label.userData.anchor;label.visible=!!player&&Math.hypot(player.x-a.x,player.z-a.z)<7.5;
      }
      residentLife.update(now,dt);
      const clerk=byId.clerk;
      if(clerk){
        clerk.groundY=characterGroundYAt(clerk.object.position.x,clerk.object.position.z);clerk.object.position.y=clerk.groundY;
        clerk.playAnim?.('idle');clerk.mixer?.update(dt);
        if(clerk.interaction){clerk.interaction.x=clerk.object.position.x;clerk.interaction.z=clerk.object.position.z;}
      }
      const visitor=byId.visitor,daily=typeof getDailyState==='function'?getDailyState():null;
      if(visitor){
        const names={crafter:'토리 · 만들기 동아리 학생',collector:'모아 · 생태 동아리 학생',prospector:'반짝 · 과학탐구 학생',angler:'파도 · 낚시체험 학생'};
        const visible=!!daily&&daily.visitor&&daily.visitor!=='none';
        visitor.object.visible=visible;visitor.groundY=characterGroundYAt(visitor.object.position.x,visitor.object.position.z);visitor.object.position.y=visitor.groundY;visitor.playAnim?.('idle');visitor.mixer?.update(dt);
        if(visitor.label){
          visitor.label.userData?.setText?.(names[daily?.visitor]||SCHOOL_PROFILES.visitor.role);
          visitor.label.position.set(visitor.object.position.x,visitor.object.position.y+2.195,visitor.object.position.z);
          visitor.label.visible=visible&&!!player&&Math.hypot(player.x-visitor.object.position.x,player.z-visitor.object.position.z)<4.2;
        }
        if(visitor.interaction){visitor.interaction.enabled=visible;visitor.interaction.x=visitor.object.position.x;visitor.interaction.z=visitor.object.position.z;}
      }
    }
  };}

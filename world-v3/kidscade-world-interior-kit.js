import * as THREE from 'three';

const FURNITURE=new URL('../assets/game/3d/interiors/kenney-furniture-kit/',import.meta.url).href;
const BAKERY=new URL('../assets/game/3d/bakery/interior/',import.meta.url).href;

export const HOME_INTERIOR_LEVELS={
  1:{
    bounds:{x1:-3.35,x2:3.35,z1:-3.65,z2:3.85},
    floorColor:'#b98555',wallColor:'#efe1c8',trimColor:'#9b6c49',
    camera:{viewHeight:6.15,playerFollow:.28,offset:[6.8,8.9,8.7],targetY:.60}
  },
  2:{
    bounds:{x1:-5.05,x2:5.05,z1:-4.25,z2:4.05},
    floorColor:'#c08f5d',wallColor:'#f1e3cc',trimColor:'#946746',
    camera:{viewHeight:7.35,playerFollow:.32,offset:[7.4,9.7,9.5],targetY:.62}
  },
  3:{
    bounds:{x1:-6.55,x2:6.55,z1:-4.75,z2:4.15},
    floorColor:'#c59662',wallColor:'#f2e6d2',trimColor:'#8f6344',
    camera:{viewHeight:8.25,playerFollow:.36,offset:[8.0,10.3,10.0],targetY:.64}
  }
};

function clampLevel(level){
  const n=Math.max(1,Math.min(3,Math.floor(Number(level)||1)));
  return HOME_INTERIOR_LEVELS[n]?n:1;
}

export function homeInteriorCameraProfile(level){
  const def=HOME_INTERIOR_LEVELS[clampLevel(level)];
  const b=def.bounds;
  return {
    ...def.camera,
    centerX:(b.x1+b.x2)/2,
    centerZ:(b.z1+b.z2)/2
  };
}

function makeWoodTexture(color){
  const c=document.createElement('canvas');c.width=256;c.height=256;
  const x=c.getContext('2d');x.fillStyle=color;x.fillRect(0,0,256,256);
  const rows=6,h=256/rows;
  for(let r=0;r<rows;r++){
    const shade=r%2===0?'rgba(255,255,255,.045)':'rgba(0,0,0,.045)';
    x.fillStyle=shade;x.fillRect(0,r*h,256,h);
    x.strokeStyle='rgba(77,52,35,.22)';x.lineWidth=2;
    x.beginPath();x.moveTo(0,r*h);x.lineTo(256,r*h);x.stroke();
    const seam=((r*53)%170)+38;
    x.beginPath();x.moveTo(seam,r*h);x.lineTo(seam,(r+1)*h);x.stroke();
  }
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
  tex.wrapS=THREE.RepeatWrapping;tex.wrapT=THREE.RepeatWrapping;return tex;
}

function makeWallTexture(color){
  const c=document.createElement('canvas');c.width=192;c.height=192;
  const x=c.getContext('2d');x.fillStyle=color;x.fillRect(0,0,192,192);
  x.strokeStyle='rgba(116,88,64,.10)';x.lineWidth=2;
  for(let y=24;y<192;y+=48){x.beginPath();x.moveTo(0,y);x.lineTo(192,y);x.stroke();}
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
  tex.wrapS=THREE.RepeatWrapping;tex.wrapT=THREE.RepeatWrapping;return tex;
}

function makeTileTexture(){
  const c=document.createElement('canvas');c.width=192;c.height=192;
  const x=c.getContext('2d');x.fillStyle='#dbcdbb';x.fillRect(0,0,192,192);
  x.strokeStyle='rgba(96,83,72,.20)';x.lineWidth=3;
  for(let p=0;p<=192;p+=48){
    x.beginPath();x.moveTo(p,0);x.lineTo(p,192);x.stroke();
    x.beginPath();x.moveTo(0,p);x.lineTo(192,p);x.stroke();
  }
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
  tex.wrapS=THREE.RepeatWrapping;tex.wrapT=THREE.RepeatWrapping;return tex;
}

function staticMesh(mesh){
  mesh.updateMatrix();mesh.matrixAutoUpdate=false;return mesh;
}

function floorMesh(def){
  const b=def.bounds,w=b.x2-b.x1,d=b.z2-b.z1,cx=(b.x1+b.x2)/2,cz=(b.z1+b.z2)/2;
  const tex=makeWoodTexture(def.floorColor);tex.repeat.set(Math.max(3,w*.7),Math.max(3,d*.7));
  const mat=new THREE.MeshStandardMaterial({map:tex,roughness:.86,metalness:.02});
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,.18,d),mat);
  mesh.position.set(cx,-.10,cz);mesh.receiveShadow=true;mesh.castShadow=false;return staticMesh(mesh);
}

function wallMaterial(def,length=6){
  const tex=makeWallTexture(def.wallColor);tex.repeat.set(Math.max(2,length*.45),2.2);
  return new THREE.MeshStandardMaterial({map:tex,roughness:.91,metalness:0});
}

function addWallBox(group,side,x,z,w,d,h,def){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),wallMaterial(def,Math.max(w,d)));
  mesh.position.set(x,h/2,z);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.homeWall=side;
  group.add(staticMesh(mesh));return mesh;
}

function addBaseboard(group,side,x,z,w,d,def,y=0){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,.15,d),new THREE.MeshStandardMaterial({color:def.trimColor,roughness:.78}));
  mesh.position.set(x,y+.075,z);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.homeWall=side;
  group.add(staticMesh(mesh));return mesh;
}

function addWallShell(group,def){
  const b=def.bounds,th=.18,h=2.72,centerZ=(b.z1+b.z2)/2,depth=b.z2-b.z1,width=b.x2-b.x1;
  const walls={};
  walls.north=new THREE.Group();walls.north.name='home-wall-north';group.add(walls.north);
  walls.south=new THREE.Group();walls.south.name='home-wall-south';group.add(walls.south);
  walls.west=new THREE.Group();walls.west.name='home-wall-west';group.add(walls.west);
  walls.east=new THREE.Group();walls.east.name='home-wall-east';group.add(walls.east);

  addWallBox(walls.north,'north',0,b.z1,width,th,h,def);
  addBaseboard(walls.north,'north',0,b.z1+.10,width-.18,.10,def);

  addWallBox(walls.west,'west',b.x1,centerZ,th,depth,h,def);
  addBaseboard(walls.west,'west',b.x1+.10,centerZ,.10,depth-.18,def);
  addWallBox(walls.east,'east',b.x2,centerZ,th,depth,h,def);
  addBaseboard(walls.east,'east',b.x2-.10,centerZ,.10,depth-.18,def);

  // The entrance wall is a real wall with an opening, but the cutaway camera
  // normally hides this side so the room reads clearly from the isometric view.
  const doorW=1.55,sideW=(width-doorW)/2;
  addWallBox(walls.south,'south',b.x1+sideW/2,b.z2,sideW,th,h,def);
  addWallBox(walls.south,'south',b.x2-sideW/2,b.z2,sideW,th,h,def);
  const lintelH=.48,lintel=addWallBox(walls.south,'south',0,b.z2,doorW,th,lintelH,def);
  lintel.position.y=2.72-lintelH/2;lintel.updateMatrix();
  addBaseboard(walls.south,'south',b.x1+sideW/2,b.z2-.10,sideW-.12,.10,def);
  addBaseboard(walls.south,'south',b.x2-sideW/2,b.z2-.10,sideW-.12,.10,def);
  return walls;
}

function addKitchenInset(group,def,level){
  if(level<2)return;
  const b=def.bounds,width=level===2?2.9:3.6,depth=level===2?2.65:3.15;
  const x=b.x2-width/2-.20,z=b.z1+depth/2+.20;
  const tex=makeTileTexture();tex.repeat.set(width*.85,depth*.85);
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,depth),new THREE.MeshStandardMaterial({map:tex,roughness:.82}));
  mesh.rotation.x=-Math.PI/2;mesh.position.set(x,.012,z);mesh.receiveShadow=true;group.add(staticMesh(mesh));
  const trim=new THREE.Mesh(new THREE.BoxGeometry(.08,.045,depth),new THREE.MeshStandardMaterial({color:def.trimColor,roughness:.8}));
  trim.position.set(x-width/2,.028,z);group.add(staticMesh(trim));
}

function addWarmLights(group,def){
  const ambient=new THREE.AmbientLight(0xffedcf,.42);ambient.name='home-interior-ambient';group.add(ambient);
  const b=def.bounds,cx=(b.x1+b.x2)/2,cz=(b.z1+b.z2)/2;
  const key=new THREE.PointLight(0xffd9a2,1.35,12,1.8);key.position.set(cx-1.2,2.45,cz-.8);key.name='home-interior-key';group.add(key);
  const fill=new THREE.PointLight(0xfff0d2,.72,10,1.8);fill.position.set(cx+1.7,2.15,cz+1.4);fill.name='home-interior-fill';group.add(fill);
}

function freezeObject(object){
  if(!object)return object;
  object.updateMatrixWorld(true);
  object.traverse(node=>{if(node===object)return;node.updateMatrix?.();node.matrixAutoUpdate=false;});
  object.updateMatrix();object.matrixAutoUpdate=false;return object;
}

async function addArchitecturalDetails(group,addModel,def,level){
  const b=def.bounds,back=b.z1+.13;
  const jobs=[
    addModel(group,FURNITURE+'wall-window-slide.glb',{x:-Math.min(1.55,(b.x2-b.x1)*.22),z:back,w:2.05,h:2.25,d:.28,rot:0,name:'home-window-main-l'+level}),
    addModel(group,FURNITURE+'rug-doormat.glb',{x:0,z:b.z2-.48,w:1.7,h:.06,d:.72,rot:0,name:'home-doormat-l'+level}),
    addModel(group,FURNITURE+'lamp-wall.glb',{x:Math.min(1.85,b.x2-.55),z:back+.03,w:.45,h:.78,d:.30,rot:0,name:'home-wall-lamp-l'+level})
  ];
  if(level>=2){
    jobs.push(addModel(group,BAKERY+'curtains.glb',{x:-Math.min(1.55,(b.x2-b.x1)*.22),z:back+.05,w:2.3,h:2.20,d:.30,rot:0,name:'home-curtains-l'+level}));
    jobs.push(addModel(group,FURNITURE+'wall-window.glb',{x:b.x2-.12,z:.25,w:2.0,h:2.2,d:.26,rot:-Math.PI/2,name:'home-side-window-l'+level}));
  }
  if(level>=3){
    jobs.push(addModel(group,BAKERY+'wall-shelf-bakery-a.glb',{x:3.65,z:back+.08,w:1.55,h:.88,d:.30,rot:0,name:'home-architecture-shelf-a'}));
    jobs.push(addModel(group,BAKERY+'wall-shelf-bakery-b.glb',{x:5.05,z:back+.08,w:1.2,h:.82,d:.30,rot:0,name:'home-architecture-shelf-b'}));
  }
  const objects=await Promise.all(jobs);objects.forEach(freezeObject);
}

async function buildLevel(parent,addModel,level){
  const def=HOME_INTERIOR_LEVELS[level],group=new THREE.Group();group.name='home-interior-level-'+level;group.visible=false;parent.add(group);
  group.add(floorMesh(def));
  const walls=addWallShell(group,def);
  addKitchenInset(group,def,level);
  addWarmLights(group,def);
  await addArchitecturalDetails(group,addModel,def,level);
  return {group,walls,def};
}

export async function buildHomeInterior({parent,addModel}){
  const levels={};
  for(const level of [1,2,3])levels[level]=await buildLevel(parent,addModel,level);
  let current=1;
  function setLevel(level){
    current=clampLevel(level);
    for(const [id,entry] of Object.entries(levels))entry.group.visible=Number(id)===current;
  }
  function updateCutaway(cameraX,cameraZ){
    const entry=levels[current];if(!entry)return;
    const b=entry.def.bounds,cx=(b.x1+b.x2)/2,cz=(b.z1+b.z2)/2;
    // Hide the two walls nearest the camera. The opposite walls remain opaque,
    // so the room still reads as a real building instead of a three-sided stage.
    entry.walls.east.visible=Number(cameraX)<cx;
    entry.walls.west.visible=Number(cameraX)>=cx;
    entry.walls.south.visible=Number(cameraZ)<cz;
    entry.walls.north.visible=Number(cameraZ)>=cz;
  }
  setLevel(1);
  return {
    setLevel,
    updateCutaway,
    currentLevel:()=>current,
    getBounds:()=>HOME_INTERIOR_LEVELS[current].bounds,
    getCameraProfile:()=>homeInteriorCameraProfile(current)
  };
}

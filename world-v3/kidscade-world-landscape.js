import * as THREE from 'three';
import {WORLD_GRID} from './kidscade-world-grid.js?v=5';

const ROOT=new URL('../assets/game/3d/',import.meta.url).href;
const NATURE=ROOT+'nature/kenney-nature-kit/';
const COMMUNITY_ROOT=new URL('../assets/',import.meta.url).href;
const COMMUNITY={
  treeA:COMMUNITY_ROOT+'quaternius_cc0-common-tree-849.glb',
  treeB:COMMUNITY_ROOT+'quaternius_cc0-common-tree-855.glb',
  pineA:COMMUNITY_ROOT+'quaternius_cc0-pine-tree-1228.glb',
  pineB:COMMUNITY_ROOT+'quaternius_cc0-pine-tree-1237.glb',
  mossA:COMMUNITY_ROOT+'quaternius_cc0-mossy-rock-1303.glb',
  mossB:COMMUNITY_ROOT+'quaternius_cc0-mossy-rock-1308.glb',
  grass:COMMUNITY_ROOT+'quaternius_cc0-grass-1070.glb',
  plant:COMMUNITY_ROOT+'quaternius_cc0-plant-1249.glb',
  woodLog:COMMUNITY_ROOT+'quaternius_cc0-wood-log-1520.glb'
};

function ellipse(parent,x,z,rx,rz,color,y=.035,rotation=0,opacity=1){
  const mat=new THREE.MeshStandardMaterial({color,roughness:.96,transparent:opacity<1,opacity,depthWrite:opacity>=1});
  const mesh=new THREE.Mesh(new THREE.CircleGeometry(1,20),mat);
  mesh.scale.set(rx,rz,1);
  mesh.rotation.x=Math.PI/2;
  mesh.rotation.z=rotation;
  mesh.position.set(x,y,z);
  mesh.receiveShadow=true;
  parent.add(mesh);
  return mesh;
}

function waterShape(parent,points,color=0x5b9fc0,y=.058){
  const shape=new THREE.Shape();
  points.forEach(([x,z],i)=>i?shape.lineTo(x,z):shape.moveTo(x,z));
  shape.closePath();
  const mesh=new THREE.Mesh(
    new THREE.ShapeGeometry(shape),
    new THREE.MeshStandardMaterial({color,roughness:.22,metalness:.02,transparent:true,opacity:.94,side:THREE.DoubleSide})
  );
  mesh.rotation.x=-Math.PI/2;
  mesh.position.y=y;
  mesh.receiveShadow=true;
  parent.add(mesh);
  return mesh;
}

export async function buildWorldLandscape({parent,addModel}){
  const p=id=>WORLD_GRID[id];

  // Soften the lower-world road grid. The collision/travel corridor stays 4 m wide,
  // while irregular grass shoulders make it read as a country path rather than a board-game gutter.
  const shoulderColor=0x89a96a;
  for(const [x,z,rx,rz,rot] of [
    [-44,-12.0,2.2,.72,.15],[-38,-11.7,1.8,.62,-.12],[-30,-12.25,1.9,.65,.08],
    [-18,-11.75,1.9,.66,-.08],[-8,-12.20,2.0,.68,.12],[7,-11.78,1.8,.62,-.10],
    [18,-12.22,2.1,.70,.10],[31,-11.78,1.9,.66,-.06],[43,-12.20,2.0,.70,.08],
    [-24.25,-8, .72,2.0,.10],[-23.72,0,.68,2.15,-.10],[-24.28,8,.75,1.85,.06],
    [24.22,-8,.72,1.9,-.08],[23.75,0,.70,2.05,.09],[24.26,8,.75,1.9,-.05]
  ])ellipse(parent,x,z,rx,rz,shoulderColor,.031,rot);

  // A few darker/lighter patches cross parcel edges so adjacent zones blend visually.
  for(const [x,z,rx,rz,color,rot] of [
    [-27,5,2.8,1.15,0x64895a,.20],[-21,-5,2.5,1.0,0x7d9e63,-.12],
    [21,5,2.3,1.0,0x8eaa6b,.16],[27,-5,2.4,1.0,0x858e69,-.18],
    [5,-15,2.8,.92,0x91ae70,.08],[17,-9,2.5,.86,0x91ad6d,-.10]
  ])ellipse(parent,x,z,rx,rz,color,.032,rot,.96);

  // River → estuary → sea. This replaces the old visual break at the x=-24 road.
  waterShape(parent,[[-26.2,-26.65],[-21.8,-26.65],[-21.8,-21.35],[-26.2,-21.35]],0x579fc1,.057);
  waterShape(parent,[[-31.8,-26.7],[-26.0,-26.4],[-26.0,-21.5],[-31.0,-22.1],[-33.0,-24.1]],0x5c9fbe,.056);
  waterShape(parent,[[-35.0,-30.2],[-31.0,-29.0],[-30.0,-25.0],[-32.2,-23.6],[-36.5,-26.7]],0x60a4c4,.055);

  // The main north-south path becomes a small bridge where the connected river crosses it.
  await addModel(parent,NATURE+'bridge-wood-narrow.glb',{x:-24,z:-24,w:3.15,h:.78,d:5.7,rot:Math.PI/2,name:'west-river-road-bridge'});

  // Waterfront detail: landing, canoe, lilies and bank vegetation.
  await Promise.all([
    addModel(parent,NATURE+'canoe.glb',{x:-18.0,z:-20.0,w:2.0,h:.52,d:.78,rot:.25,name:'river-canoe'}),
    addModel(parent,NATURE+'lily-large.glb',{x:-16.5,z:-24.7,w:.62,h:.18,d:.62,rot:.15,name:'river-lily-a'}),
    addModel(parent,NATURE+'lily-small.glb',{x:-9.5,z:-23.6,w:.42,h:.14,d:.42,rot:-.20,name:'river-lily-b'}),
    addModel(parent,NATURE+'plant-bush-large.glb',{x:-19.5,z:-20.7,w:1.25,h:.92,d:1.25,rot:.1,name:'river-bank-bush-a'}),
    addModel(parent,NATURE+'plant-bush.glb',{x:-5.2,z:-27.0,w:.92,h:.70,d:.92,rot:-.1,name:'river-bank-bush-b'}),
    addModel(parent,COMMUNITY.mossA,{x:-18.7,z:-27.6,w:1.05,h:.72,d:1.0,rot:.34,name:'river-shared-moss-a'}),
    addModel(parent,COMMUNITY.plant,{x:-7.1,z:-20.5,w:.72,h:.72,d:.72,rot:-.22,name:'river-shared-plant'}),
    addModel(parent,COMMUNITY.woodLog,{x:-5.8,z:-25.4,w:1.65,h:.58,d:.72,rot:1.05,name:'river-shared-log'})
  ]);

  // Beach now has three readable sub-spaces: estuary rocks, open sand, and a small landing.
  await Promise.all([
    addModel(parent,NATURE+'tree-palm-detailed-tall.glb',{x:-43.0,z:-19.0,w:2.1,h:4.3,d:2.1,rot:.18,name:'beach-palm-a'}),
    addModel(parent,NATURE+'tree-palm-detailed-short.glb',{x:-39.2,z:-18.0,w:1.8,h:3.2,d:1.8,rot:-.22,name:'beach-palm-b'}),
    addModel(parent,NATURE+'canoe.glb',{x:-34.0,z:-29.1,w:2.1,h:.55,d:.82,rot:-.45,name:'beach-canoe'}),
    addModel(parent,NATURE+'rock-small-flat-a.glb',{x:-31.4,z:-26.3,w:.85,h:.42,d:.85,rot:.2,name:'estuary-rock-a'}),
    addModel(parent,NATURE+'rock-small-b.glb',{x:-33.5,z:-27.2,w:.75,h:.55,d:.72,rot:-.3,name:'estuary-rock-b'}),
    addModel(parent,NATURE+'log.glb',{x:-41.5,z:-27.0,w:1.75,h:.55,d:.70,rot:.65,name:'beach-driftwood'})
  ]);

  // Camp becomes a real small campsite rather than one fire and four trees.
  const camp=p('camp');
  await Promise.all([
    addModel(parent,NATURE+'tent-detailed-open.glb',{x:camp.cx-5.0,z:camp.cz-2.7,w:2.5,h:2.0,d:2.5,rot:.38,name:'camp-tent-a'}),
    addModel(parent,NATURE+'tent-small-closed.glb',{x:camp.cx+4.7,z:camp.cz-2.3,w:2.15,h:1.65,d:2.15,rot:-.42,name:'camp-tent-b'}),
    addModel(parent,NATURE+'log-large.glb',{x:camp.cx-3.8,z:camp.cz+2.3,w:1.9,h:.55,d:.75,rot:1.05,name:'camp-seat-log-a'}),
    addModel(parent,NATURE+'log-large.glb',{x:camp.cx+1.4,z:camp.cz+3.2,w:1.9,h:.55,d:.75,rot:-.45,name:'camp-seat-log-b'}),
    addModel(parent,NATURE+'stump-round-detailed.glb',{x:camp.cx+4.1,z:camp.cz+2.9,w:.85,h:.68,d:.85,rot:.1,name:'camp-stump'}),
    addModel(parent,NATURE+'plant-bush-large.glb',{x:camp.cx-7.2,z:camp.cz+1.3,w:1.2,h:.92,d:1.2,rot:.15,name:'camp-bush'}),
    addModel(parent,COMMUNITY.mossB,{x:camp.cx+7.0,z:camp.cz-5.7,w:1.0,h:.68,d:1.0,rot:.25,name:'camp-shared-moss'}),
    addModel(parent,COMMUNITY.grass,{x:camp.cx-6.6,z:camp.cz-5.4,w:.78,h:.72,d:.78,rot:-.14,name:'camp-shared-grass'}),
    addModel(parent,COMMUNITY.plant,{x:camp.cx+6.3,z:camp.cz+5.2,w:.70,h:.72,d:.70,rot:.18,name:'camp-shared-plant'})
  ]);

  // Edge clusters disguise long straight parcel boundaries while keeping paths walkable.
  await Promise.all([
    addModel(parent,NATURE+'grass-large.glb',{x:-25.8,z:5.2,w:1.1,h:.70,d:1.1,rot:.2,name:'edge-grass-forest-home-a'}),
    addModel(parent,COMMUNITY.grass,{x:-22.2,z:-4.7,w:.82,h:.72,d:.82,rot:-.2,name:'edge-shared-grass-forest-home-b'}),
    addModel(parent,COMMUNITY.treeA,{x:-29.0,z:7.6,w:1.7,h:3.45,d:1.7,rot:.38,name:'forest-shared-tree-a'}),
    addModel(parent,COMMUNITY.treeB,{x:-43.2,z:-6.8,w:1.75,h:3.55,d:1.75,rot:-.24,name:'forest-shared-tree-b'}),
    addModel(parent,COMMUNITY.pineA,{x:-40.4,z:7.2,w:1.65,h:3.65,d:1.65,rot:.17,name:'forest-shared-pine-a'}),
    addModel(parent,COMMUNITY.mossA,{x:-31.0,z:-6.1,w:1.0,h:.68,d:1.0,rot:.34,name:'forest-shared-moss-a'}),
    addModel(parent,NATURE+'grass-leafs-large.glb',{x:22.1,z:5.8,w:1.0,h:.75,d:1.0,rot:.1,name:'edge-grass-farm-quarry-a'}),
    addModel(parent,NATURE+'rock-small-flat-c.glb',{x:25.7,z:-4.8,w:.95,h:.42,d:.95,rot:-.1,name:'edge-rock-farm-quarry-b'})
  ]);

  return {connectedRiver:true,softenedRoads:true,communityNature:true};
}

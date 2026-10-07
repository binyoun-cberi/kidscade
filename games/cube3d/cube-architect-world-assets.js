import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const loader=new GLTFLoader();
const cache=new Map();
const ROOT='../../assets/game/cube world/';
const FURNITURE_ROOT='../../assets/game/3d/interiors/kenney-furniture-kit/';
const SURVIVAL_ROOT='../../assets/game/3d/survival/kenney-survival-kit/';

const PROP_SPECS={
  grassBig:{url:ROOT+'Environment/glTF/Grass_Big.gltf',height:.55},
  grassSmall:{url:ROOT+'Environment/glTF/Grass_Small.gltf',height:.34},
  bush:{url:ROOT+'Environment/glTF/Bush.gltf',height:.72},
  flowers1:{url:ROOT+'Environment/glTF/Flowers_1.gltf',height:.48},
  flowers2:{url:ROOT+'Environment/glTF/Flowers_2.gltf',height:.48},
  mushroom:{url:ROOT+'Environment/glTF/Mushroom.gltf',height:.42},
  plant2:{url:ROOT+'Environment/glTF/Plant_2.gltf',height:.5},
  plant3:{url:ROOT+'Environment/glTF/Plant_3.gltf',height:.56},
  bamboo:{url:ROOT+'Environment/glTF/Bamboo.gltf',height:1.25},
  bambooMid:{url:ROOT+'Environment/glTF/Bamboo_Mid.gltf',height:.9},
  bambooSmall:{url:ROOT+'Environment/glTF/Bamboo_Small.gltf',height:.62},
  rock1:{url:ROOT+'Environment/glTF/Rock1.gltf',height:.48},
  rock2:{url:ROOT+'Environment/glTF/Rock2.gltf',height:.58},
  crystalSmall:{url:ROOT+'Environment/glTF/Crystal_Small.gltf',height:.46},
  crystalBig:{url:ROOT+'Environment/glTF/Crystal_Big.gltf',height:.82}
};

const TOOL_SPECS={
  woodPick:{url:ROOT+'Tools/glTF/Pickaxe_Wood.gltf',height:.72},
  stonePick:{url:ROOT+'Tools/glTF/Pickaxe_Stone.gltf',height:.72},
  ironPick:{url:ROOT+'Tools/glTF/Pickaxe_Gold.gltf',height:.72,tint:0xc6d0d8},
  woodSword:{url:ROOT+'Tools/glTF/Sword_Wood.gltf',height:.78},
  stoneSword:{url:ROOT+'Tools/glTF/Sword_Stone.gltf',height:.78},
  ironSword:{url:ROOT+'Tools/glTF/Sword_Gold.gltf',height:.78,tint:0xc6d0d8}
};

// Kept separate from vegetation: placement models are loaded only when a player builds one.
const FURNITURE_SPECS={
  chair:{url:FURNITURE_ROOT+'chair.glb',height:.87,footprint:.88},
  desk:{url:FURNITURE_ROOT+'desk.glb',height:.84,footprint:.96},
  bookshelf:{url:FURNITURE_ROOT+'bookcase-open.glb',height:.98,footprint:.93},
  bed:{url:FURNITURE_ROOT+'bed-single.glb',height:.58,footprint:.97},
  sofa:{url:FURNITURE_ROOT+'lounge-sofa.glb',height:.84,footprint:.96},
  bench:{url:FURNITURE_ROOT+'bench.glb',height:.76,footprint:.98},
  coffeeTable:{url:FURNITURE_ROOT+'table-coffee.glb',height:.58,footprint:.92},
  floorLamp:{url:FURNITURE_ROOT+'lamp-round-floor.glb',height:1.3,footprint:.8},
  rug:{url:FURNITURE_ROOT+'rug-round.glb',height:.045,footprint:.96}
};
const SURVIVAL_SPECS={
  workbench:{url:SURVIVAL_ROOT+'workbench.glb',height:.87,footprint:.97},
  chest:{url:SURVIVAL_ROOT+'chest.glb',height:.79,footprint:.9},
  crate:{url:SURVIVAL_ROOT+'box-large.glb',height:.85,footprint:.92},
  campfire:{url:SURVIVAL_ROOT+'campfire-pit.glb',height:.22,footprint:.84},
  fence:{url:SURVIVAL_ROOT+'fence.glb',height:.92,footprint:.98},
  tent:{url:SURVIVAL_ROOT+'tent-canvas.glb',height:.98,footprint:.98},
  bedroll:{url:SURVIVAL_ROOT+'bedroll.glb',height:.17,footprint:.92}
};
const PLACEMENT_SPECS=Object.fromEntries(Object.entries({...FURNITURE_SPECS,...SURVIVAL_SPECS}).map(([key,spec])=>[key,{...spec,floorCentered:true}]));
function cloneMaterial(material,tint){
  const next=material?.clone?material.clone():material;
  if(!next)return next;
  for(const key of ['map','emissiveMap','normalMap','roughnessMap','metalnessMap']){
    const tex=next[key];
    if(!tex)continue;
    tex.magFilter=THREE.NearestFilter;
    if(key==='map')tex.minFilter=THREE.NearestFilter;
    tex.generateMipmaps=false;
    tex.needsUpdate=true;
  }
  if(tint&&next.color){
    const c=new THREE.Color(tint);
    next.color.lerp(c,.7);
  }
  return next;
}
function prep(root,spec){
  root.traverse?.(o=>{
    if(!o.isMesh)return;
    o.castShadow=true;o.receiveShadow=true;
    if(Array.isArray(o.material))o.material=o.material.map(m=>cloneMaterial(m,spec.tint));
    else if(o.material)o.material=cloneMaterial(o.material,spec.tint);
  });
  return root;
}
function normalize(root,spec){
  root.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(root),size=new THREE.Vector3(),center=new THREE.Vector3();
  box.getSize(size);box.getCenter(center);
  const h=Math.max(.001,size.y);
  const width=Math.max(.001,size.x,size.z);
  // A one-cell prop never extends into its neighboring cell.
  const scale=Math.min((spec.height||1)/h,spec.footprint?spec.footprint/width:Infinity);
  root.scale.multiplyScalar(scale);
  root.position.x-=center.x*scale;
  root.position.z-=center.z*scale;
  root.updateMatrixWorld(true);
  const box2=new THREE.Box3().setFromObject(root);
  root.position.y-=box2.min.y;
  // World block roots are centered half a block above the supporting floor.
  if(spec.floorCentered)root.position.y-=.5;
  root.rotation.y=spec.rotationY??0;
  return root;
}
async function source(key,specs){
  const spec=specs[key];
  if(!spec)throw new Error('unknown Cube World asset '+key);
  const cacheKey=spec.url;
  if(!cache.has(cacheKey)){
    cache.set(cacheKey,new Promise((resolve,reject)=>loader.load(spec.url,resolve,undefined,reject)));
  }
  return {gltf:await cache.get(cacheKey),spec};
}
async function loadFrom(key,specs){
  const {gltf,spec}=await source(key,specs);
  const model=normalize(prep(gltf.scene.clone(true),spec),spec);
  const wrapper=new THREE.Group();
  wrapper.name='CubeWorld_'+key;
  wrapper.userData={cubeWorldAsset:true,assetKey:key};
  wrapper.add(model);
  return wrapper;
}
function loadProp(key){return loadFrom(key,PROP_SPECS)}
function loadTool(key){return loadFrom(key,TOOL_SPECS)}
function loadPlacement(key){return loadFrom(key,PLACEMENT_SPECS)}

window.CubeArchitectWorldAssets={
  PROP_SPECS,TOOL_SPECS,FURNITURE_SPECS,SURVIVAL_SPECS,PLACEMENT_SPECS,
  loadProp,loadTool,loadPlacement
};
window.dispatchEvent(new CustomEvent('cube-architect-world-assets-ready'));

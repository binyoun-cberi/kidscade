import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const loader=new GLTFLoader();
const cache=new Map();
const ROOT='../../assets/game/cube world/';

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
  ironPick:{url:ROOT+'Tools/glTF/Pickaxe_Gold.gltf',height:.72,tint:0xc6d0d8}
};

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
  const h=Math.max(.001,size.y),scale=(spec.height||1)/h;
  root.scale.multiplyScalar(scale);
  root.position.x-=center.x*scale;
  root.position.z-=center.z*scale;
  root.updateMatrixWorld(true);
  const box2=new THREE.Box3().setFromObject(root);
  root.position.y-=box2.min.y;
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

window.CubeArchitectWorldAssets={PROP_SPECS,TOOL_SPECS,loadProp,loadTool};
window.dispatchEvent(new CustomEvent('cube-architect-world-assets-ready'));

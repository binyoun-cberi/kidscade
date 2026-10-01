import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const loader=new GLTFLoader();
const cache=new Map();
const ROOT='../../assets/game/';
const SPECS={
  deer:{url:ROOT+'characters/pets/animal-deer.glb',height:1.28},
  frog:{url:ROOT+'3d/characters/quaternius/frog.glb',height:.62},
  slime:{url:ROOT+'3d/characters/monsters/ultimate-monsters-bundle/green-blob.glb',height:.9},
  burrower:{url:ROOT+'3d/characters/monsters/ultimate-monsters-bundle/green-spiky-blob.glb',height:.78,tint:0xd6a458},
  golem:{url:ROOT+'3d/characters/monsters/ultimate-monsters-bundle/goleling.glb',height:1.9}
};

function cloneMaterial(mat,tint){
  const next=mat?.clone?mat.clone():mat;
  if(next?.color&&tint){
    const t=new THREE.Color(tint);
    next.color.lerp(t,.42);
  }
  return next;
}
function normalize(root,spec){
  root.traverse?.(o=>{
    if(!o.isMesh)return;
    o.castShadow=true;o.receiveShadow=true;
    if(Array.isArray(o.material))o.material=o.material.map(m=>cloneMaterial(m,spec.tint));
    else if(o.material)o.material=cloneMaterial(o.material,spec.tint);
  });
  const box=new THREE.Box3().setFromObject(root),size=new THREE.Vector3(),center=new THREE.Vector3();
  box.getSize(size);box.getCenter(center);
  const h=Math.max(.001,size.y),scale=spec.height/h;
  root.scale.multiplyScalar(scale);
  const box2=new THREE.Box3().setFromObject(root);
  root.position.x-=center.x*scale;
  root.position.z-=center.z*scale;
  root.position.y-=box2.min.y;
  root.rotation.y=Math.PI;
  root.userData.kidscadeCreatureAsset=true;
  return root;
}
async function template(key){
  if(cache.has(key))return cache.get(key);
  const spec=SPECS[key];
  if(!spec)throw new Error('unknown creature asset '+key);
  const promise=new Promise((resolve,reject)=>{
    loader.load(spec.url,gltf=>{
      const root=normalize(gltf.scene,spec);
      resolve({root,animations:gltf.animations||[]});
    },undefined,reject);
  });
  cache.set(key,promise);
  return promise;
}
async function load(key){
  const data=await template(key);
  const root=data.root.clone(true);
  root.traverse?.(o=>{
    if(o.isMesh&&o.material){
      if(Array.isArray(o.material))o.material=o.material.map(m=>m?.clone?m.clone():m);
      else if(o.material.clone)o.material=o.material.clone();
    }
  });
  return root;
}
window.CubeArchitectCreatureAssets={SPECS,load};
window.dispatchEvent(new CustomEvent('cube-architect-creature-assets-ready'));

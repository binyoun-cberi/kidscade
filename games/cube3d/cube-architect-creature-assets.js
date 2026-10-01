import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

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
  const box=new THREE.Box3().setFromObject(root),size=new THREE.Vector3(),center=new THREE.Vector3();
  box.getSize(size);box.getCenter(center);
  const h=Math.max(.001,size.y),scale=spec.height/h;
  root.scale.multiplyScalar(scale);
  const box2=new THREE.Box3().setFromObject(root);
  root.position.x-=center.x*scale;
  root.position.z-=center.z*scale;
  root.position.y-=box2.min.y;
  root.rotation.y=Math.PI;
  return root;
}
async function source(key){
  if(cache.has(key))return cache.get(key);
  const spec=SPECS[key];
  if(!spec)throw new Error('unknown creature asset '+key);
  const promise=new Promise((resolve,reject)=>{
    loader.load(spec.url,gltf=>resolve(gltf),undefined,reject);
  });
  cache.set(key,promise);
  return promise;
}
function clipFor(clips,state){
  const tests={
    idle:/idle|stand|breath|rest/i,
    move:/walk|run|move|crawl|swim/i,
    hop:/jump|hop|leap/i,
    attack:/attack|hit|bite|slam|punch/i
  };
  return clips.find(c=>tests[state]?.test(c.name))||
    (state==='hop'?clips.find(c=>tests.move.test(c.name)):null)||
    (state==='attack'?clips.find(c=>tests.move.test(c.name)):null)||
    clips.find(c=>tests.idle.test(c.name))||clips[0]||null;
}
function setState(wrapper,state,fade=.16){
  const anim=wrapper?.userData?.assetAnimation;if(!anim||anim.state===state)return;
  const clip=clipFor(anim.clips,state);if(!clip)return;
  const next=anim.mixer.clipAction(clip);
  next.reset().setEffectiveTimeScale(state==='move'?1.12:1).setEffectiveWeight(1).play();
  if(anim.action&&anim.action!==next)anim.action.crossFadeTo(next,fade,false);
  anim.action=next;anim.state=state;
}
async function load(key){
  const gltf=await source(key),spec=SPECS[key];
  const model=normalize(prep(SkeletonUtils.clone(gltf.scene),spec),spec);
  const wrapper=new THREE.Group();
  wrapper.name='KidscadeCreatureAsset_'+key;
  wrapper.add(model);
  const clips=Array.isArray(gltf.animations)?gltf.animations:[];
  if(clips.length){
    const mixer=new THREE.AnimationMixer(model);
    wrapper.userData.assetAnimation={mixer,clips,action:null,state:null};
    setState(wrapper,'idle',0);
  }
  wrapper.userData.kidscadeCreatureAsset=true;
  return wrapper;
}
function update(wrapper,dt,state='idle'){
  if(!wrapper)return;
  setState(wrapper,state);
  wrapper.userData.assetAnimation?.mixer?.update(Math.min(.05,Math.max(0,dt||0)));
}
window.CubeArchitectCreatureAssets={SPECS,load,update,setState};
window.dispatchEvent(new CustomEvent('cube-architect-creature-assets-ready'));

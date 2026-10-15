import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import {scanSceneColors,repairRiceColors,repairCropColors} from './animation/color-audit.mjs';

// Paths remain in the shared library. Nothing is duplicated in this game directory.
const BASE='../../assets/';
const NATURE=BASE+'game/3d/nature/kenney-nature-kit/';
const SURVIVAL=BASE+'game/3d/survival/kenney-survival-kit/';
const COZY=BASE+'more assets/cozyfarmbystyloo new/GLB/';
export const FARM_MODELS=Object.freeze({
  farmer:{url:BASE+'game/characters/people/character-male-a.glb',height:1.7},
  farmhouse:{url:BASE+'game/3d/city/kenney-city-kit-suburban/building-type-a.glb',height:5.0},
  barn:{url:COZY+'barnlvl1.glb',height:3.3},
  well:{url:BASE+'quaternius_cc0-well-1471.glb',height:1.8},
  tree:{url:NATURE+'tree-default.glb',height:3.0},
  treeFall:{url:NATURE+'tree-default-fall.glb',height:3.0},
  pine:{url:NATURE+'tree-pine-default-a.glb',height:3.2},
  rock:{url:NATURE+'rock-large-a.glb',height:.8},
  fence:{url:NATURE+'fence-simple.glb',height:.95},
  hoe:{url:SURVIVAL+'tool-hoe.glb',height:.8},
  wateringCan:{url:COZY+'wateringcan_001.glb',height:.65},
  carrot:{url:NATURE+'crop-carrot.glb',height:.62},
  corn:{url:NATURE+'crops-corn-stage-d.glb',height:1.8},
  riceFallback:{url:BASE+'quaternius_cc0-rice-1294.glb',height:1.1}
});
const gltfLoader=new GLTFLoader(),fbxLoader=new FBXLoader(),cache=new Map();
export const assetReport=new Map();
function source(url,kind='glb'){
  if(!cache.has(url)){
    cache.set(url,new Promise(resolve=>{
      const loader=kind==='fbx'?fbxLoader:gltfLoader;
      loader.load(url,result=>{const root=kind==='fbx'?result:result.scene;assetReport.set(url,{status:'loaded',kind,colors:scanSceneColors(root),repainted:0});resolve(root)},
        undefined,e=>{assetReport.set(url,{status:'failed',kind,message:String(e?.message||e).slice(0,140)});resolve(null)});
    }));
  }
  return cache.get(url);
}
export function normalise(object,height=1){
  object.updateMatrixWorld(true);
  let bbox=new THREE.Box3().setFromObject(object),size=bbox.getSize(new THREE.Vector3());
  const scale=height/Math.max(.001,size.y);
  object.scale.multiplyScalar(scale);object.updateMatrixWorld(true);
  bbox=new THREE.Box3().setFromObject(object);
  const centre=bbox.getCenter(new THREE.Vector3());
  object.position.x-=centre.x;object.position.z-=centre.z;object.position.y-=bbox.min.y;
  object.traverse(node=>{
    if(!node.isMesh)return;
    node.castShadow=true;node.receiveShadow=true;
    if(node.isSkinnedMesh)node.frustumCulled=false;
    // Clone materials before altering side or fallback colors. Cached GLTF/FBX sources
    // remain intact and a single plot cannot recolor all other model instances.
    const mats=Array.isArray(node.material)?node.material:[node.material];
    const own=mats.map(m=>m?.clone?m.clone():m);
    own.forEach(m=>{if(m&&'side'in m&&m.side===THREE.FrontSide)m.side=THREE.DoubleSide});
    node.material=Array.isArray(node.material)?own:own[0];
  });
  return object;
}
function cloneSource(source){return source?cloneSkeleton(source):null;}
export async function loadModel(key){
  const def=FARM_MODELS[key];if(!def)return null;
  const data=await source(def.url);
  return data?normalise(cloneSource(data),def.height):null;
}
function handmadeRice(stage){
  const root=new THREE.Group();
  const stalk=new THREE.MeshStandardMaterial({color:stage===4?0xc6a646:0x5b9a40,roughness:1,side:THREE.DoubleSide});
  const grain=new THREE.MeshStandardMaterial({color:0xe1c671,roughness:1});
  const height=[.26,.43,.67,.9][stage-1];
  for(let j=0;j<5;j++){
    const px=((j*7)%5-2)*.07,pz=((j*3)%5-2)*.055;
    const leaf=new THREE.Mesh(new THREE.ConeGeometry(.055,height,3),stalk);
    leaf.position.set(px,height/2,pz);leaf.rotation.z=(j-2)*.09;root.add(leaf);
    if(stage>=3){const ear=new THREE.Mesh(new THREE.SphereGeometry(.046,5,4),grain);ear.position.set(px+(j-2)*.012,height*.86,pz);root.add(ear)}
  }
  return root;
}
// Existing Quaternius Rice_1..4 FBX files are loaded directly for visual review.
// No conversion or asset replacement happens in this PR. A GLB then a procedural
// placeholder keep the map usable even when an FBX material fails in the browser.
export async function loadRiceStage(stage){
  const n=Math.max(1,Math.min(4,Math.round(stage)));
  const fbxUrl=BASE+'game/crops/FBX/Rice_'+n+'.fbx';
  const fbx=await source(fbxUrl,'fbx');
  if(fbx){
    const object=normalise(cloneSource(fbx),[.28,.48,.76,1.07][n-1]);
    const fixed=repairRiceColors(object,n);
    const info=assetReport.get(fbxUrl);
    if(info)info.repainted=Math.max(info.repainted||0,fixed);
    return {object,origin:fixed?'FBX 원본 · 색상 보완 '+fixed+'곳':'FBX 성장 단계 원본'};
  }
  const glb=await source(FARM_MODELS.riceFallback.url);
  if(glb){
    const object=normalise(cloneSource(glb),[.28,.48,.76,1.07][n-1]);
    const fixed=repairRiceColors(object,n);
    const info=assetReport.get(FARM_MODELS.riceFallback.url);
    if(info)info.repainted=Math.max(info.repainted||0,fixed);
    return {object,origin:fixed?'GLB 대체 · 색상 보완':'GLB 대체 모델'};
  }
  return {object:handmadeRice(n),origin:'색상 지정 임시 모델'};
}

// Farm-specific crop stages: the original PR 2 loaded full-size vegetables at every
// growth stage. Reuse existing Carrot_1..4 FBX and Kenney corn stage A..D instead.
export async function loadFarmCropStage(kind,stage){
  const n=Math.max(1,Math.min(4,Math.round(Number(stage)||1)));
  if(kind==='rice')return loadRiceStage(n);
  if(!['carrot','corn'].includes(kind))return {object:null,origin:'알 수 없는 작물'};
  const fbx=kind==='carrot';
  const url=fbx
    ?BASE+'game/crops/FBX/Carrot_'+n+'.fbx'
    :NATURE+'crops-corn-stage-'+['a','b','c','d'][n-1]+'.glb';
  const targetHeights=kind==='carrot'?[.19,.31,.43,.65]:[.23,.57,1.08,1.75];
  const object=await source(url,fbx?'fbx':'glb');
  if(object){
    const crop=normalise(cloneSource(object),targetHeights[n-1]);
    const fixed=repairCropColors(crop,kind,n);
    const info=assetReport.get(url);if(info)info.repainted=Math.max(info.repainted||0,fixed);
    return {object:crop,origin:(fbx?'Quaternius FBX':'Kenney GLB')+' '+n+'단계'+(fixed?' · 색 보완 '+fixed+'곳':'')};
  }
  const fallbackUrl=FARM_MODELS[kind].url;
  const fallback=await source(fallbackUrl);
  if(fallback){
    const crop=normalise(cloneSource(fallback),targetHeights[n-1]);
    const fixed=repairCropColors(crop,kind,n);
    const info=assetReport.get(fallbackUrl);if(info)info.repainted=Math.max(info.repainted||0,fixed);
    return {object:crop,origin:'공용 GLB 대체'+(fixed?' · 색 보완':'')};
  }
  return {object:null,origin:'작물 임시 모형'};
}

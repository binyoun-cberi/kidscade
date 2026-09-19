import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const NS=window.KidscadeWorldV2=window.KidscadeWorldV2||{};
const ROOT=new URL('../assets/game/3d/interiors/kenney-furniture-kit/',import.meta.url);
const FILES={
  bed:'bed-single.glb',
  desk:'desk.glb',
  bookshelf:'bookcase-open.glb',
  sofa:'lounge-sofa.glb',
  diningTable:'table.glb',
  fridge:'kitchen-fridge.glb',
  sink:'kitchen-sink.glb',
  counter:'kitchen-cabinet.glb',
  stove:'kitchen-stove.glb',
  rug:'rug-rectangle.glb'
};
const DRAW={
  bed:{scaleW:1.22,scaleH:1.32,y:.09},
  desk:{scaleW:1.18,scaleH:1.36,y:.08},
  bookshelf:{scaleW:1.28,scaleH:1.12,y:.03},
  sofa:{scaleW:1.20,scaleH:1.28,y:.08},
  diningTable:{scaleW:1.15,scaleH:1.40,y:.09},
  fridge:{scaleW:1.34,scaleH:1.16,y:.03},
  sink:{scaleW:1.28,scaleH:1.32,y:.07},
  counter:{scaleW:1.20,scaleH:1.28,y:.06},
  stove:{scaleW:1.30,scaleH:1.20,y:.04},
  rug:{scaleW:1.08,scaleH:1.38,y:.13}
};

const cache=new Map();
const pending=new Map();
const loader=new GLTFLoader();

const renderCanvas=document.createElement('canvas');
renderCanvas.width=224;renderCanvas.height=224;
let renderer=null;
try{
  renderer=new THREE.WebGLRenderer({
    canvas:renderCanvas,
    alpha:true,
    antialias:true,
    preserveDrawingBuffer:true,
    powerPreference:'low-power'
  });
  renderer.setSize(224,224,false);
  renderer.setPixelRatio(1);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.05;
}catch(err){
  console.warn('[Kidscade World] Furniture sprite renderer unavailable',err);
}

function prep(root){
  root.traverse(n=>{
    if(!n.isMesh)return;
    n.castShadow=false;n.receiveShadow=false;
    if(n.material){
      const mats=Array.isArray(n.material)?n.material:[n.material];
      const cloned=mats.map(m=>{
        const x=m.clone();
        if('roughness' in x)x.roughness=Math.max(.55,x.roughness??.75);
        if('metalness' in x)x.metalness=Math.min(.18,x.metalness??0);
        return x;
      });
      n.material=Array.isArray(n.material)?cloned:cloned[0];
    }
  });
  return root;
}

function frameObject(root){
  root.updateMatrixWorld(true);
  let box=new THREE.Box3().setFromObject(root);
  const size=box.getSize(new THREE.Vector3());
  const center=box.getCenter(new THREE.Vector3());
  const max=Math.max(size.x,size.y,size.z)||1;
  root.scale.multiplyScalar(2.25/max);
  root.updateMatrixWorld(true);
  box=new THREE.Box3().setFromObject(root);
  const c=box.getCenter(new THREE.Vector3());
  root.position.x-=c.x;
  root.position.z-=c.z;
  root.position.y-=box.min.y;
}

function snapshot(key,gltf){
  if(!renderer)return null;
  const scene=new THREE.Scene();
  const object=prep(gltf.scene.clone(true));
  frameObject(object);
  object.rotation.y=-Math.PI*.20;
  scene.add(object);

  const hemi=new THREE.HemisphereLight(0xffffff,0x59664e,2.3);scene.add(hemi);
  const keyLight=new THREE.DirectionalLight(0xfff3d4,3.2);keyLight.position.set(-4,7,5);scene.add(keyLight);
  const fill=new THREE.DirectionalLight(0x9cc6ff,.85);fill.position.set(4,4,-5);scene.add(fill);

  const camera=new THREE.OrthographicCamera(-1.85,1.85,1.9,-1.55,.01,30);
  camera.position.set(4.3,3.6,5.4);
  camera.lookAt(0,.68,0);
  camera.updateProjectionMatrix();

  renderer.setClearColor(0x000000,0);
  renderer.clear();
  renderer.render(scene,camera);

  const img=new Image();
  img.decoding='async';
  img.src=renderCanvas.toDataURL('image/png');
  cache.set(key,img);
  return img;
}

function load(key){
  if(cache.has(key))return Promise.resolve(cache.get(key));
  if(pending.has(key))return pending.get(key);
  const file=FILES[key];
  if(!file)return Promise.resolve(null);
  const p=new Promise(resolve=>{
    loader.load(new URL(file,ROOT).href,gltf=>{
      try{resolve(snapshot(key,gltf))}catch(err){console.warn('[Kidscade World] furniture snapshot failed',key,err);resolve(null)}
    },undefined,err=>{console.warn('[Kidscade World] furniture model failed',key,err);resolve(null)});
  }).finally(()=>pending.delete(key));
  pending.set(key,p);
  return p;
}

function drawShadow(ctx,e){
  ctx.save();
  ctx.globalAlpha=.14;
  ctx.fillStyle='#1d241c';
  ctx.beginPath();
  ctx.ellipse(e.centerX,e.y+e.h-3,Math.max(20,e.w*.47),Math.max(5,e.h*.10),0,0,Math.PI*2);
  ctx.fill();
  ctx.restore();
}

function draw(key,ctx,e,fallback){
  const img=cache.get(key);
  if(!img||!img.complete||!img.naturalWidth){
    if(!pending.has(key))load(key);
    fallback?.(ctx,e);
    return false;
  }
  const opt=DRAW[key]||{};
  drawShadow(ctx,e);
  const dw=e.w*(opt.scaleW||1.18);
  const dh=e.h*(opt.scaleH||1.28);
  const x=e.centerX-dw/2;
  const y=e.y+e.h-dh-(e.h*(opt.y||0));
  ctx.save();
  ctx.imageSmoothingEnabled=true;
  ctx.drawImage(img,x,y,dw,dh);
  ctx.restore();
  return true;
}

function decorate(key,fallback){
  return function(ctx,e,w){
    return draw(key,ctx,e,(c,target)=>fallback?.(c,target,w));
  };
}

function preload(keys=Object.keys(FILES)){
  return Promise.all(keys.map(load));
}

NS.ModelSprites={FILES,DRAW,load,preload,draw,decorate,cache,ready:key=>cache.has(key)};
preload();

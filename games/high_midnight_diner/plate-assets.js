/* Midnight Diner v9 — real GLB food models rendered into durable 2D images.
 * The food remains selectable in one canvas, so the original hitboxes, touch
 * handling, and low-end/WebGL-disabled illustrated fallback keep working.
 */
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const P=window.MidnightDinerPlate;
const BASE='../../assets/game/food/';
const OTHER='../../assets/game/3d/food/ultimate-food-pack/';
const SUSHI='../../assets/game/3d/interiors/modular-sushi-restaurant-kit/';
const entries=[
 ['pancake','main',OTHER+'pancakes-stack.glb'],
 ['soup','main',BASE+'bowl-soup.glb'],
 ['soup','piece',BASE+'mushroom-half.glb'],
 ['skewer','main',BASE+'skewer.glb'],
 ['dumpling','piece',SUSHI+'gyoza.glb'],
 ['cake','main',BASE+'cake.glb']
];
const state={ready:[],failed:[],complete:false};
window.MidnightDinerFoodAssets=state;
function inform(course){
 window.dispatchEvent(new CustomEvent('midnight-diner:food-assets',{detail:{course}}));
}
async function build(){
 let renderer;
 try{
  const canvas=document.createElement('canvas');
  renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'low-power'});
  renderer.setPixelRatio(1);renderer.setSize(320,320,false);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.25;
  renderer.setClearColor(0x000000,0);
 }catch(error){
  console.warn('Diner 3D food thumbnails unavailable; keeping illustrated fallback.',error);
  state.failed.push('WebGL');state.complete=true;inform(null);return;
 }
 const loader=new GLTFLoader();
 const snapshots={};
 const scene=new THREE.Scene();
 const ambient=new THREE.HemisphereLight(0xfff1ce,0x57412e,2.5);scene.add(ambient);
 const key=new THREE.DirectionalLight(0xffd9a2,3.2);key.position.set(-5,9,7);scene.add(key);
 const fill=new THREE.DirectionalLight(0xb9cde2,1.35);fill.position.set(6,4,-7);scene.add(fill);
 const camera=new THREE.OrthographicCamera(-1,1,1,-1,.01,200);
 function load(path){
  return new Promise((resolve,reject)=>loader.load(path,
   gltf=>resolve(gltf.scene||gltf.scenes?.[0]||null),
   undefined,reject));
 }
 function snapshot(object,id){
  const group=new THREE.Group();group.add(object);scene.add(group);
  object.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(object);
  const dimensions=new THREE.Vector3(),center=new THREE.Vector3();
  bounds.getSize(dimensions);bounds.getCenter(center);
  if(!Number.isFinite(dimensions.length())||dimensions.length()<.001){
   scene.remove(group);throw new Error('Empty food geometry: '+id);
  }
  object.position.sub(center);
  // A warm, slightly elevated three-quarter view preserves real GLB geometry.
  const diameter=Math.max(dimensions.x,dimensions.y,dimensions.z,.001);
  const view=id==='pancake'||id==='cake'?[.48,1.7,.86]:
   id==='skewer'?[.50,1.18,1.52]:[.72,1.38,1.36];
  const distance=diameter*3;
  camera.position.set(view[0]*distance,view[1]*distance,view[2]*distance);
  const ortho=diameter*(id==='skewer'?1.08:1.03);
  camera.left=-ortho;camera.right=ortho;camera.top=ortho;camera.bottom=-ortho;
  camera.lookAt(0,0,0);camera.updateProjectionMatrix();
  renderer.clear();renderer.render(scene,camera);
  const still=document.createElement('canvas');still.width=320;still.height=320;
  const ctx=still.getContext('2d');
  if(!ctx){scene.remove(group);throw new Error('2D canvas unavailable');}
  ctx.drawImage(renderer.domElement,0,0);
  scene.remove(group);
  return still;
 }
 try{
  // Loading sequentially keeps GPU memory and peak tablet memory modest.
  for(const [course,role,url] of entries){
   try{
    const object=await load(url);
    if(!object)throw new Error('Missing GLB scene');
    const result=snapshot(object,course);
    if(!snapshots[course])snapshots[course]={};
    snapshots[course][role]=result;
    P?.setAssetImages?.(course,{...snapshots[course]});
    state.ready.push(course+':'+role);inform(course);
   }catch(error){
    state.failed.push(course+':'+role);
    console.warn('Diner food GLB failed, illustrated fallback remains:',url,error);
   }
  }
 }finally{
  state.complete=true;
  try{renderer.dispose();renderer.forceContextLoss();}catch(_){}
  inform(null);
 }
}
build().catch(error=>{
 state.failed.push('loader');state.complete=true;
 console.warn('Diner food asset renderer failed; keeping illustrated fallback.',error);
 inform(null);
});

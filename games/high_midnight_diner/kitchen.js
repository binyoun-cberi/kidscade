import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const canvas=document.getElementById('scene');
const kitchen=document.querySelector('.kitchen');
const K='../../assets/game/3d/interiors/charming-kitchen-set/';
const S='../../assets/game/3d/interiors/modular-sushi-restaurant-kit/';
const F='../../assets/game/3d/food/ultimate-food-pack/';
const PEOPLE='../../assets/game/npcs/glTF/';
const scene=new THREE.Scene();scene.background=new THREE.Color(0x25241d);
const camera=new THREE.PerspectiveCamera(38,1,.05,80);camera.position.set(0,2.2,7.8);camera.lookAt(0,1.7,0);
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'low-power'});renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;canvas.classList.add('ready');}
catch(error){console.warn('Midnight diner WebGL unavailable; using illustrated kitchen fallback',error);}
if(renderer){
const ambient=new THREE.HemisphereLight(0xb2a384,0x14120c,1.5);scene.add(ambient);
const lamp=new THREE.PointLight(0xffbe6b,38,11);lamp.position.set(-.9,4.6,3.3);scene.add(lamp);
const fill=new THREE.DirectionalLight(0xa6b4ad,1.3);fill.position.set(3,2.8,5);scene.add(fill);
function box(name,w,h,d,color,x,y,z){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.84}));mesh.position.set(x,y,z);mesh.name=name;scene.add(mesh);return mesh;}
box('wall',11,6,.14,0x72694a,0,2.4,-2.3);
for(let i=0;i<12;i++)box('wall seam',.018,5,.03,0x534e37,-5.2+i*.94,2.2,-2.205);
for(let i=0;i<7;i++)box('tile seam',11,.018,.03,0x514b37,0,.4+i*.65,-2.18);
box('kitchen counter',10,1.05,1.3,0x3b392c,0,.56,-1.15);
box('countertop',10,.15,1.7,0x827054,0,1.14,-1.02);
box('front counter',12,.7,1.18,0x5b4631,0,.34,3.1);
box('front lip',12,.1,1.4,0x9c7652,0,.75,3.1);
box('under-counter shelf',9,.08,.82,0x282821,0,.45,-.62);
const loader=new GLTFLoader();
async function load(url,height,x,y,z,rotation=0){
 return new Promise(resolve=>{
 loader.load(url,g=>{
  const obj=g.scene||g.scenes?.[0];if(!obj){resolve(null);return;}
  obj.updateMatrixWorld(true);
  let bounds=new THREE.Box3().setFromObject(obj),size=new THREE.Vector3();bounds.getSize(size);
  if(size.y<.001){resolve(null);return;}
  obj.scale.setScalar(height/size.y);obj.updateMatrixWorld(true);bounds.setFromObject(obj);
  const center=new THREE.Vector3();bounds.getCenter(center);
  const group=new THREE.Group();group.position.set(x,y,z);group.rotation.y=rotation;
  obj.position.x-=center.x;obj.position.y-=bounds.min.y;obj.position.z-=center.z;
  obj.traverse(n=>{if(n.isMesh){n.castShadow=false;n.receiveShadow=true;}});
  group.add(obj);scene.add(group);resolve(group);
 },undefined,()=>resolve(null));
 });
}
let chef=null,food=null,mood=0,shock=0,course=0,frame=0,disposed=false;
const decor=[
 [K+'fridge.glb',2.9,-3.95,1.15,-1.8,0],
 [K+'stove.glb',1.4,-2.7,1.12,-1.13,0],
 [K+'wall-knife-rack.glb',.53,2.8,2.5,-2.03,0],
 [K+'cutting-board.glb',.35,2.1,1.19,-.78,0],
 [K+'pan.glb',.26,-2.55,1.19,-.8,0],
 [K+'pot.glb',.31,.3,1.22,-.7,0],
 [S+'plate.glb',.1,1.35,1.22,-.55,0]
];
for(const d of decor)load(d[0],...d.slice(1));
load(PEOPLE+'OldClassy_Male.gltf',1.7,0,1.18,-.85,Math.PI).then(obj=>{chef=obj;});
const foods=[F+'pancakes-stack.glb',S+'ramen.glb',S+'gyoza.glb'];
async function setCourse(index){
 const old=food;food=null;if(old)scene.remove(old);
 const next=await load(foods[index]||foods[0],.36,1.35,1.21,-.45,-.25);
 if(course===index)food=next;else if(next)scene.remove(next);
}
setCourse(0);
window.addEventListener('midnight-diner:state',ev=>{
 const d=ev.detail||{};mood=(d.suspicion||0)/100;if(d.shock)shock=1;
 if(Number.isInteger(d.course)&&d.course!==course){course=d.course;setCourse(Math.min(2,course));}
});
function resize(){
 const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
 renderer.setSize(w,h,false);camera.aspect=w/h;
 camera.fov=h<320?55:38;camera.position.z=h<320?8.6:7.8;camera.updateProjectionMatrix();
}
window.addEventListener('resize',resize);resize();
const clock=new THREE.Clock();
function tick(){
 if(disposed)return;requestAnimationFrame(tick);const t=clock.getElapsedTime();frame++;
 if(frame%20===0)resize();
 lamp.intensity=38+Math.sin(t*17)*.7+(mood>.6?Math.sin(t*8)*2:0);
 if(chef){chef.rotation.y=Math.PI+Math.sin(t*1.1)*(.07+mood*.24);chef.position.x=Math.sin(t*.4)*.03;chef.rotation.z=shock*.08;}
 if(food)food.rotation.y+=.002;
 if(shock>0)shock=Math.max(0,shock-.016);
 renderer.render(scene,camera);
}
tick();
window.addEventListener('pagehide',()=>{disposed=true;renderer.dispose();},{once:true});
}
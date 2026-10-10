import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const canvas=document.getElementById('scene');
const kitchen=document.querySelector('.kitchen');
const K='../../assets/game/3d/interiors/charming-kitchen-set/';
const S='../../assets/game/3d/interiors/modular-sushi-restaurant-kit/';
const F='../../assets/game/3d/food/ultimate-food-pack/';
const PEOPLE='../../assets/game/npcs/glTF/';
const FOOD_ITEMS='../../assets/game/food/';
const scene=new THREE.Scene();scene.background=new THREE.Color(0x25241d);
const camera=new THREE.PerspectiveCamera(38,1,.05,80);camera.position.set(0,2.2,5.8);camera.lookAt(0,1.52,-.15);
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'low-power'});renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;/* Show illustrated fallback until a chef model is confirmed. */}
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
box('front counter',5,.47,.8,0x483a2b,0,.24,1.18);
box('front lip',5,.11,.9,0x9c7652,0,.52,1.18);
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
  group.add(obj);group.userData.clips=g.animations||[];scene.add(group);resolve(group);
 },undefined,()=>resolve(null));
 });
}
let chef=null,chefMixer=null,chefPick=null,chefNeck=null,chefHand=null,chefIdle=null,food=null,mood=0,shock=0,course=0,frame=0,disposed=false,reactionName='',reactionUntil=0,previousPrepStep=-1;
const decor=[
 [K+'fridge.glb',2.7,-2.15,0,-1.72,0],
 [K+'stove.glb',1.12,-1.38,0,-1.04,0],
 [K+'wall-knife-rack.glb',.45,1.75,2.22,-2.02,0],
 [K+'cutting-board.glb',.19,1.22,1.19,-.75,0],
 [K+'pan.glb',.22,-1.28,1.16,-.72,0],
 [K+'pot.glb',.25,.48,1.19,-.69,0],
 [S+'plate.glb',.1,1.43,1.19,-.57,0]
];
for(const d of decor)load(d[0],...d.slice(1));
load(PEOPLE+'Chef_Male.gltf',2.22,-.1,0,.43,0).then(async obj=>{
 chef=obj||await load(PEOPLE+'OldClassy_Male.gltf',2.15,-.1,0,.43,0);
 if(chef){
  // Reuse the model's authored skeletal clips rather than spinning a rigid mannequin.
  const clips=chef.userData.clips||[];
  chefMixer=new THREE.AnimationMixer(chef.children[0]);
  const idle=clips.find(x=>x.name==='Idle');
  const pick=clips.find(x=>x.name==='PickUp');
  if(idle){chefIdle=chefMixer.clipAction(idle);chefIdle.play();}
  if(pick){
   chefPick=chefMixer.clipAction(pick);
   chefPick.setLoop(THREE.LoopOnce,1);
   chefPick.clampWhenFinished=true;
  }
  chefNeck=chef.getObjectByName('Neck');
  chefHand=chef.getObjectByName('Fist.R')||chef.getObjectByName('Fist.L');
  canvas.classList.add('ready');
 }
 else console.warn('Midnight diner: chef asset missing, illustrated fallback remains visible');
});
const foods=[F+'pancakes-stack.glb',S+'ramen.glb',S+'dango.glb',S+'gyoza.glb',F+'cupcake.glb'];
async function setCourse(index){
 const old=food;food=null;if(old)scene.remove(old);
 const next=await load(foods[index]||foods[0],.36,1.35,1.21,-.45,-.25);
 if(course===index){food=next;}else if(next)scene.remove(next);
}
setCourse(0);
window.addEventListener('midnight-diner:state',ev=>{
 const d=ev.detail||{};mood=(d.suspicion||0)/100;if(d.shock)shock=1;
 cookingPhase=d.phase==='cooking';
 if(!cookingPhase){
  lookingAtFood=false;
  ingredientModels.forEach(obj=>obj.visible=false);
 }
 if(Number.isInteger(d.course)&&d.course!==course){course=d.course;setCourse(Math.min(4,course));}
});
function resize(){
 const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
 renderer.setSize(w,h,false);camera.aspect=w/h;
 camera.fov=h<320?47:h>680?43:40;camera.position.z=h<320?6.5:5.8;camera.lookAt(0,1.52,-.15);camera.updateProjectionMatrix();
}
window.addEventListener('resize',resize);resize();
const clock=new THREE.Clock();
const handPosition=new THREE.Vector3();
// Reusable spoon and ingredient proxy: animation follows the exact serving number
// shared with cooking rules, never inventing a different dangerous position.
const spoon=new THREE.Group();
const spoonHandle=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.92,9),new THREE.MeshStandardMaterial({color:0xa9a99c,metalness:.65,roughness:.35}));
spoonHandle.rotation.z=Math.PI/3;spoon.add(spoonHandle);
const spoonBowl=new THREE.Mesh(new THREE.SphereGeometry(.13,12,7),new THREE.MeshStandardMaterial({color:0xc2bca8,metalness:.62,roughness:.28}));
spoonBowl.position.set(-.41,-.2,0);spoonBowl.scale.set(1,.32,.65);spoon.add(spoonBowl);
spoon.position.set(.4,1.76,-.2);scene.add(spoon);
const addedIngredient=new THREE.Mesh(new THREE.DodecahedronGeometry(.12),new THREE.MeshStandardMaterial({color:0x8e764c,roughness:1}));
addedIngredient.visible=false;scene.add(addedIngredient);
let currentZone=1,currentTotal=5,lookingAtFood=false,foodIngredient=null,stirUntil=0,cookingPhase=false,gazePhase='SAFE';
const ingredientModels=new Map();
const ingredientFiles={
 seed:'tomato-slice.glb',mushroom:'mushroom-half.glb',bean:'cherries.glb',
 thread:'celery-stick.glb',dust:'cheese-cut.glb',safe:'carrot.glb'
};
for(const [key,file] of Object.entries(ingredientFiles)){
 load(FOOD_ITEMS+file,.29,0,-9,0).then(obj=>{
  if(!obj)return;
  obj.visible=false;ingredientModels.set(key,obj);
 });
}
window.addEventListener('midnight-diner:cooking',ev=>{
 const d=ev.detail||{};
 currentZone=d.zone||1;currentTotal=d.total||5;lookingAtFood=!!d.looking&&!d.concealed;
 foodIngredient=d.ingredient;
 stirUntil=clock.getElapsedTime()+1.4;
 if(d.step!==previousPrepStep){previousPrepStep=d.step;
  if(chefPick){chefPick.reset();chefPick.fadeIn(.13);chefPick.play();}
 }
 const prohibited=lookingAtFood&&foodIngredient&&foodIngredient!=='일반 양념';
 addedIngredient.material.color.setHex(prohibited?0x874638:0x8e9464);
 addedIngredient.visible=lookingAtFood;
 ingredientModels.forEach(obj=>obj.visible=false);
 const key=lookingAtFood?(foodIngredient==='일반 양념'?'safe':['seed','mushroom','bean','thread','dust'][course]):null;
 const visual=key&&ingredientModels.get(key);
 if(visual)visual.visible=true;
});
window.addEventListener('midnight-diner:gaze',ev=>{
 const next=ev.detail?.phase||'SAFE';
 gazePhase=next;
 kitchen.classList.remove('gaze-safe','gaze-warn','gaze-look');
 kitchen.classList.add('gaze-'+next.toLowerCase());
 if(next==='LOOK'){lookingAtFood=false;ingredientModels.forEach(obj=>obj.visible=false);}
});
window.addEventListener('midnight-diner:caught',ev=>{
 shock=1.4;lookingAtFood=false;ingredientModels.forEach(obj=>obj.visible=false);
 kitchen.classList.add('caught');
 window.setTimeout(()=>kitchen.classList.remove('caught'),450);
});
window.addEventListener('midnight-diner:action',ev=>{
 const action=ev.detail||{};
 reactionName=action.name||'';
 reactionUntil=clock.getElapsedTime()+1.6;
 kitchen.classList.remove('threat','glance','pleased');
 void kitchen.offsetWidth;
 const next=reactionName==='reject'?'threat':reactionName==='inspect'||reactionName==='question'?'glance':'pleased';
 kitchen.classList.add(next);
 window.setTimeout(()=>kitchen.classList.remove(next),1100);
});
// A few small steam motes reuse basic geometry and materials rather than downloading another asset.
const steam=[];
for(let i=0;i<6;i++){
 const sprite=new THREE.Mesh(
  new THREE.SphereGeometry(.027+i*.004,6,5),
  new THREE.MeshBasicMaterial({color:0xbfc3a6,transparent:true,opacity:.12,depthWrite:false})
 );
 sprite.visible=false;scene.add(sprite);steam.push(sprite);
}
function tick(){
 if(disposed)return;requestAnimationFrame(tick);if(document.hidden)return;
 const delta=clock.getDelta(),t=clock.elapsedTime;frame++;
 if(chefMixer)chefMixer.update(delta);
 if(frame%20===0)resize();
 lamp.intensity=(gazePhase==='LOOK'&&cookingPhase?29:38)+Math.sin(t*17)*.7+(mood>.6?Math.sin(t*8)*2:0);
 if(chef){
 const reacting=t<reactionUntil;
 // The cook looks away during SAFE, begins turning on WARN,
 // and faces the player while LOOK. Never snap the entire model in one frame.
 const target=cookingPhase?
  (gazePhase==='SAFE'?Math.PI*.72:gazePhase==='WARN'?Math.PI*.37:0):
  Math.sin(t*.7)*.05;
 chef.rotation.y+=(target-chef.rotation.y)*.16;
 chef.position.x=Math.sin(t*.4)*.03;
 chef.position.z=.43+(reacting&&reactionName==='reject'?.17:0);
 chef.rotation.z=shock*.055+(reacting&&reactionName==='inspect'?.07:0);
 if(chefNeck){
  const targetTurn=cookingPhase?(gazePhase==='WARN'?.22:gazePhase==='LOOK'?-.12:0):0;
  chefNeck.rotation.y+=(targetTurn-chefNeck.rotation.y)*.18;
 }
}
 if(food)food.rotation.y+=.002;
 const stirring=t<stirUntil;
 const x=-1.1+(Math.max(1,currentZone)-1)/Math.max(1,currentTotal-1)*2.15;
 spoon.visible=cookingPhase;
 spoon.position.set(x,1.66+Math.sin(t*11)*.06,-.16);
 if(chefHand&&cookingPhase){
  chef.updateMatrixWorld(true);
  chefHand.getWorldPosition(handPosition);
  spoon.position.lerp(handPosition,0.87);
  spoon.position.y+=.05;
 }
 spoon.rotation.set(0,0,stirring?Math.sin(t*10)*.35:.08);
 const currentModel=[...ingredientModels.values()].find(obj=>obj.visible);
 addedIngredient.visible=cookingPhase&&stirring&&lookingAtFood&&!currentModel;
 const y=1.6-Math.min(1,Math.max(0,1-(stirUntil-t)/1.4))*.3;
 if(addedIngredient.visible)addedIngredient.position.set(spoon.position.x,Math.max(1.15,spoon.position.y-.13),spoon.position.z-.08);
 if(currentModel){currentModel.visible=cookingPhase&&lookingAtFood;if(currentModel.visible)currentModel.position.set(spoon.position.x,Math.max(1.15,spoon.position.y-.13),spoon.position.z-.09);}
 steam.forEach((sprite,i)=>{
  const show=course===1&&!!food;
  sprite.visible=show;
  if(show){
   const rise=(t*.24+i*.19)%1;
   sprite.position.set(1.35+Math.sin(t*.8+i*3)*.055,1.47+rise*.45,-.4);
   sprite.material.opacity=.15*(1-rise);
   sprite.scale.setScalar(.6+rise*1.8);
  }
 });
 if(shock>0)shock=Math.max(0,shock-.016);
 renderer.render(scene,camera);
}
tick();
window.addEventListener('pagehide',()=>{disposed=true;renderer.dispose();},{once:true});
}
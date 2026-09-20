import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
(()=>{'use strict';
const $=id=>document.getElementById(id),T=THREE,KEY='nyamUniverse_v2';
const LOW_POWER=innerWidth<760||((navigator.hardwareConcurrency||8)<=4);
const SHADOWS=!LOW_POWER;
const stages=[
 {name:'아주 작은 세계',min:1e-8,max:1e-6,sky:0xb4e4f1,ground:0x83bac8,items:['작은 바이러스','돌기 바이러스','큰 바이러스'],types:[15,15,15]},
 {name:'물방울 속 세상',min:1e-6,max:.001,sky:0xa4dfe0,ground:0x72bdb3,items:['막대 세균','둥근 세균 무리','짚신벌레'],types:[16,17,18]},
 {name:'풀잎 아래',min:.001,max:.01,sky:0xb8e6ed,ground:0x79b674,items:['씨앗','새싹','작은 버섯'],types:[13,14,2]},
 {name:'정원의 작은 손님',min:.01,max:1,sky:0xa9def1,ground:0x86bd6b,items:['당근','브로콜리','호박'],types:[10,11,12]},
 {name:'마을을 한입에',min:1,max:1000,sky:0xa8dced,ground:0x8cbb70,items:['나무','자동차','집'],types:[3,4,5]},
 {name:'구름 너머',min:1000,max:1e6,sky:0x91b4df,ground:0x528ca4,items:['작은 섬','산맥','큰 섬'],types:[6,6,6]},
 {name:'행성 산책',min:1e6,max:1e9,sky:0x111932,ground:0x18213a,items:['소행성','달','행성'],types:[0,7,7]},
 {name:'별들의 바다',min:1e9,max:149597870700,sky:0x0b1029,ground:0x10172c,items:['행성','고리 행성','별'],types:[7,8,9]}
];
let renderer;try{renderer=new T.WebGLRenderer({canvas:$('view'),antialias:true});}catch(e){$('err').classList.remove('hidden');return}
renderer.setPixelRatio(Math.min(devicePixelRatio||1,LOW_POWER?1.1:1.6));renderer.shadowMap.enabled=SHADOWS;renderer.shadowMap.type=T.PCFSoftShadowMap;
const scene=new T.Scene(),cam=new T.PerspectiveCamera(52,1,.1,350);scene.add(new T.HemisphereLight(0xffffff,0x647d83,2));const sun=new T.DirectionalLight(0xffffff,2.4);sun.position.set(-18,35,15);sun.castShadow=SHADOWS;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-45,right:45,top:45,bottom:-45,far:100});scene.add(sun);scene.add(sun.target);
const world=new T.Group();scene.add(world);const floor=new T.Mesh(new T.PlaneGeometry(350,350),new T.MeshStandardMaterial({color:0x8cbb70,roughness:1}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
const sphere=new T.IcosahedronGeometry(1,2),box=new T.BoxGeometry(1,1,1),cone=new T.ConeGeometry(1,1,6),ring=new T.RingGeometry(.92,1,36);ring.rotateX(-Math.PI/2);
const mats=new Map();function mat(c){if(!mats.has(c))mats.set(c,new T.MeshStandardMaterial({color:c,roughness:.78}));return mats.get(c)}
function part(g,geo,c,x,y,z,sx,sy=sx,sz=sx){const m=new T.Mesh(geo,mat(c));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=SHADOWS;m.receiveShadow=true;g.add(m);return m}
const gltfLoader=new GLTFLoader(),textureLoader=new T.TextureLoader(),assetTemplates=new Map();
const ASSET_SPECS={
 mushroom:{url:"../../assets/game/3d/nature/kenney-nature-kit/mushroom-red.glb",size:1.0},
 seed:{url:"../../assets/game/food/soy.glb",size:.9},
 sprout:{url:"../../assets/game/3d/nature/kenney-nature-kit/crops-leafs-stage-a.glb",size:1.0},
 carrot:{url:"../../assets/game/food/carrot.glb",size:1.0},
 broccoli:{url:"../../assets/game/food/broccoli.glb",size:1.0},
 pumpkin:{url:"../../assets/game/food/pumpkin-basic.glb",size:1.0},
 tree:{url:"../../assets/game/3d/nature/kenney-nature-kit/tree-default.glb",size:1.2},
 car:{url:"../../assets/game/3d/vehicles/kenney-car-kit/sedan.glb",size:1.25},
 house:{url:"../../assets/game/3d/city/kenney-city-kit-suburban/building-type-a.glb",size:1.35},
 mountain:{url:"../../assets/game/3d/nature/kenney-nature-kit/rock-tall-a.glb",size:1.2},
 star:{url:"../../assets/game/platformer/pickups/star_yellow.glb",size:1.0},
 grass:{url:"../../assets/game/3d/nature/kenney-nature-kit/grass-large.glb",size:1.0},
 bush:{url:"../../assets/game/3d/nature/kenney-nature-kit/plant-bush-small.glb",size:1.0}
};
const TYPE_ASSET={2:"mushroom",3:"tree",4:"car",5:"house",6:"mountain",9:"star",10:"carrot",11:"broccoli",12:"pumpkin",13:"seed",14:"sprout"};
const PLANET_URLS=Array.from({length:6},(_,i)=>"../../assets/game/space/planets/planet0"+i+".png");
let planetTextures=[],assetsReady=false;
function normalizeAsset(root,target=1){
 root.updateMatrixWorld(true);
 let b=new T.Box3().setFromObject(root),size=b.getSize(new T.Vector3()),longest=Math.max(.001,size.x,size.y,size.z);
 root.scale.multiplyScalar(target/longest);root.updateMatrixWorld(true);
 b=new T.Box3().setFromObject(root);const c=b.getCenter(new T.Vector3());
 root.position.x-=c.x;root.position.z-=c.z;root.position.y-=b.min.y;
 root.traverse(o=>{if(o.isMesh){o.castShadow=SHADOWS;o.receiveShadow=true;}});
 return root;
}
async function loadAssetTemplate(key,spec){
 const gltf=await gltfLoader.loadAsync(spec.url);
 assetTemplates.set(key,normalizeAsset(gltf.scene,spec.size||1));
}
function cloneAsset(key){
 const t=assetTemplates.get(key);return t?t.clone(true):null;
}
const assetWarmup=Promise.allSettled([
 ...Object.entries(ASSET_SPECS).map(([k,v])=>loadAssetTemplate(k,v)),
 ...PLANET_URLS.map(url=>textureLoader.loadAsync(url).then(tex=>{tex.colorSpace=T.SRGBColorSpace;planetTextures.push(tex);}))
]).then(results=>{
 assetsReady=true;
 const failed=results.filter(x=>x.status==="rejected").length;
 const el=$("assetStatus");if(el)el.textContent=failed?"3D 에셋 일부는 기본 모델로 표시돼요":"실제 3D 월드 에셋 준비 완료";
});

function critter(color){let g=new T.Group();part(g,sphere,color,0,.8,0,.8,.72,.8);for(let x of [-.29,.29]){part(g,sphere,0xffffff,x,1.04,.66,.22);part(g,sphere,0x243343,x,1.04,.84,.105);part(g,sphere,0xffa9ac,x*1.6,.75,.64,.13,.07,.07);part(g,sphere,color,x,.15,.1,.26,.16,.36)}part(g,sphere,0x283e48,0,.63,.74,.2,.09,.05);part(g,cone,color,-.43,1.58,0,.22,.43,.22);part(g,cone,color,.43,1.58,0,.22,.43,.22);return g}
const player=critter(0x62cfa3);scene.add(player);
function model(type,color){
 const real=cloneAsset(TYPE_ASSET[type]);
 if(real){real.userData.realAsset=TYPE_ASSET[type];return real;}
 let g=new T.Group();if(type===0){part(g,sphere,color,0,.48,0,.5);part(g,sphere,0xffffff,.25,.72,.25,.14)}
 if(type===1){part(g,sphere,color,0,.43,0,.48,.43,.48);part(g,box,0x49794c,0,.95,0,.12,.26,.12)}
 if(type===2){part(g,cone,color,0,.65,0,.65,.4,.65);part(g,box,0xf3e1b6,0,.25,0,.19,.5,.19)}
 if(type===3){part(g,box,0x987255,0,.42,0,.19,.85,.19);part(g,cone,0x4b9971,0,1,0,.68,1.25,.68)}
 if(type===4){part(g,box,color,0,.33,0,1,.34,.65);part(g,box,0xd9edf3,0,.6,-.1,.58,.3,.57);for(let x of [-.48,.48])for(let z of [-.22,.22])part(g,sphere,0x35465a,x,.18,z,.18)}
 if(type===5){part(g,box,0xffefd1,0,.5,0,.95,1,.8);part(g,cone,color,0,1.22,0,.8,.5,.8);part(g,box,0x50768d,0,.28,.405,.22,.5,.04);for(let x of [-.3,.3])part(g,box,0x8ed1e2,x,.65,.41,.18,.2,.04)}
 if(type===6){part(g,sphere,0x61af88,0,.1,0,.75,.16,.65);part(g,cone,0x879da1,0,.5,0,.48,.9,.48);part(g,cone,0xf4f4ec,0,.87,0,.17,.27,.17)}
 if(type>=7){part(g,sphere,color,0,.6,0,.6);if(type===8){const r=new T.Mesh(ring,mat(0xe8c799));r.scale.set(1.05,1,1.05);r.position.y=.6;r.rotation.z=.25;g.add(r)}if(type===9){for(let a=0;a<6;a++){const p=part(g,cone,0xffdc80,Math.cos(a)*.7,.6+Math.sin(a)*.7,0,.18,.4,.18);p.rotation.z=a-1.57}}}return g}
// Recognizable produce, with shared geometry and materials.
const originalModel=model;
model=function(type,color){
 if(type<10){const g=originalModel(type,color);
  if(type===7||type===8){for(let i=0;i<5;i++){const a=i*2.4;part(g,sphere,type===7?0x65bfa8:0xceaa71,Math.sin(a)*.43,.7+Math.cos(a)*.3,Math.cos(a)*.4,.21,.12,.15)} }
  return g;
 }
 const g=new T.Group();
 function leaf(x,y,z,a=0,scale=1){const m=part(g,sphere,0x459d49,x,y,z,.1*scale,.34*scale,.07*scale);m.rotation.z=a;return m}
 if(type===10){const root=part(g,cone,0xf58a27,0,.48,0,.31,.92,.31);root.rotation.z=Math.PI;for(let i=-1;i<=1;i++)leaf(i*.12,1.03,0,-i*.5);for(let i=0;i<3;i++)part(g,box,0xd56a20,.04,.35+i*.18,.19,.18,.024,.025);}
 if(type===11){part(g,box,0x91be58,0,.35,0,.22,.65,.22);for(let i=0;i<7;i++){let a=i*2.4;part(g,sphere,i%2?0x329548:0x24763e,Math.sin(a)*.29,.76+(i%3)*.08,Math.cos(a)*.25,.29)}leaf(.2,.4,0,-.8);}
 if(type===12){for(let i=0;i<9;i++){let a=i*Math.PI*2/9;part(g,sphere,i%2?0xf19a25:0xe78020,Math.cos(a)*.22,.45,Math.sin(a)*.22,.32,.43,.32)}part(g,box,0x627f37,0,.96,0,.12,.25,.12).rotation.z=-.25;leaf(.19,.91,0,-1.2,.8);}
 if(type===13){part(g,sphere,0xb68a4e,0,.18,0,.25,.16,.4);part(g,box,0xe2bd76,0,.31,0,.025,.015,.45);}
 if(type===14){part(g,box,0x73a44b,0,.3,0,.06,.6,.06);leaf(-.14,.45,0,.9);leaf(.14,.62,0,-.9);}
 if(type===15){part(g,sphere,0xb08bda,0,.53,0,.34);for(let i=0;i<12;i++){const a=i*Math.PI*2/12,x=Math.cos(a),y=Math.sin(a);const stem=part(g,box,0x8066b7,x*.39,.53+y*.39,0,.055,.21,.055);stem.rotation.z=a-Math.PI/2;part(g,sphere,0xed9bc9,x*.51,.53+y*.51,0,.09)}for(let i=-1;i<=1;i++)part(g,sphere,0xe5c3f4,i*.14,.58,.29,.065);}
 if(type===16||type===18){const body=part(g,sphere,type===16?0x49cbbb:0xeca858,0,.35,0,.28,.3,.62);for(let i=0;i<4;i++)part(g,sphere,0xffeb99,0,.48,-.3+i*.19,.075);for(let i=0;i<7;i++)part(g,sphere,0x59aa9c,Math.sin(i*.7)*.12,.26,-.64-i*.09,.035);if(type===18){for(let i=0;i<9;i++)for(let dir of [-1,1])part(g,box,0xf0cf78,dir*.29,.35,-.45+i*.11,.15,.025,.025)}}
 if(type===17){for(let i=0;i<5;i++)part(g,sphere,i%2?0x78cda0:0x48ab83,Math.sin(i*2.4)*.22,.3+(i%2)*.15,Math.cos(i*2.4)*.22,.24);}
 return g;
};
function faceDirection(g,x,z,dt){if(Math.hypot(x,z)<.001)return;const a=Math.atan2(x,z);const delta=Math.atan2(Math.sin(a-g.rotation.y),Math.cos(a-g.rotation.y));g.rotation.y+=delta*(1-Math.exp(-dt*14));}
const scenery=new T.Group();scene.add(scenery);
let backdropTexture=null;
function addSceneryAsset(key,x,z,scale=1,rot=0){
 const obj=cloneAsset(key);if(!obj)return false;
 obj.position.set(x,0,z);obj.rotation.y=rot;obj.scale.multiplyScalar(scale);scenery.add(obj);return true;
}
function decorateAssetScenery(rand){
 const spread=()=>({x:(rand()-.5)*210,z:(rand()-.5)*210,rot:rand()*Math.PI*2});
 const addMany=(keys,count,min,max)=>{
   for(let i=0;i<count;i++){const p=spread(),key=keys[i%keys.length];addSceneryAsset(key,p.x,p.z,min+rand()*(max-min),p.rot);}
 };
 if(level===2)addMany(["sprout","grass","mushroom"],LOW_POWER?9:16,.8,2.1);
 else if(level===3)addMany(["tree","bush","carrot","pumpkin"],LOW_POWER?8:15,1.2,3.0);
 else if(level===4){
   addMany(["tree","house"],LOW_POWER?7:12,2.2,5.0);
   addMany(["car"],LOW_POWER?3:6,1.4,2.0);
 }else if(level===5)addMany(["mountain"],LOW_POWER?10:18,2.8,7.0);
 if(level>=6&&planetTextures.length){
   const count=LOW_POWER?3:5;
   for(let i=0;i<count;i++){
     const tex=planetTextures[(i+level*2)%planetTextures.length];
     const sp=new T.Sprite(new T.SpriteMaterial({map:tex,transparent:true,depthWrite:false,opacity:.72}));
     sp.position.set((rand()-.5)*180,18+rand()*45,(rand()-.5)*180);
     const size=8+rand()*16;sp.scale.set(size,size,1);sp.userData.disposable=true;scenery.add(sp);
   }
 }
}
function decorate(){
 scenery.traverse(o=>{if(o.userData.disposable){o.geometry?.dispose?.();o.material?.dispose?.()}});scenery.clear();
 const space=level>=6;floor.visible=!space;
 const c=document.createElement('canvas');c.width=1024;c.height=512;const ctx=c.getContext('2d');
 const palettes=[['#153653','#317c92'],['#0b4e65','#359b9f'],['#8dcad7','#d3efb3'],['#77badf','#e0f3c5'],['#72b6e0','#daedf4'],['#214679','#8fcfea'],['#060c25','#202958'],['#09091e','#352455']];
 const grad=ctx.createLinearGradient(0,0,0,512);grad.addColorStop(0,palettes[level][0]);grad.addColorStop(1,palettes[level][1]);ctx.fillStyle=grad;ctx.fillRect(0,0,1024,512);
 let seed=77+level;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 if(space||level<2){for(let i=0;i<(space?450:80);i++){const x=rand()*1024,y=rand()*512,r=space?.5+rand()*1.3:3+rand()*13;ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fillStyle='rgba(200,235,255,'+(.15+rand()*.7)+')';if(space)ctx.fill();else{ctx.strokeStyle='#a4eaf944';ctx.stroke()}}}
 if(backdropTexture)backdropTexture.dispose();backdropTexture=new T.CanvasTexture(c);scene.background=backdropTexture;scene.fog=space?null:new T.Fog(stages[level].sky,75,150);
 for(let i=0;i<(LOW_POWER?34:58);i++){
 const g=new T.Group(),x=(rand()-.5)*240,z=(rand()-.5)*240;g.position.set(x,0,z);
 if(level<2){const m=part(g,sphere,level===0?0x66bdcf:0x83dbc3,0,-.08,0,1+rand()*2,.06,1+rand()*2);}
 else if(level<4){for(let j=0;j<3;j++){const m=part(g,cone,level===2?0x3e8a54:0x66a659,j*.4,level===2?1.3:.25,0,.16,level===2?2.6:.5,.16);m.rotation.z=(j-1)*.2}}
 else if(level===4){part(g,box,0xc3c8bd,0,.008,0,12,.012,2);for(let j=-2;j<=2;j++)part(g,box,0xf5efcf,j*2,.02,0,.8,.012,.08);}
 else if(level===5){for(let j=0;j<3;j++)part(g,sphere,0xf3faff,j*2,1.3,0,3, .45,1.4)}
 else {part(g,sphere,i%3?0xc2d8ff:0xffe5ae,0,8+rand()*35,0,.06+rand()*.09);}
 scenery.add(g);
 }
 if(space){const positions=new Float32Array(900);for(let i=0;i<900;i+=3){positions[i]=(rand()-.5)*260;positions[i+1]=rand()*100-20;positions[i+2]=(rand()-.5)*260}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(positions,3));const stars=new T.Points(geo,new T.PointsMaterial({color:0xdceaff,size:.15,sizeAttenuation:true}));stars.userData.disposable=true;scenery.add(stars);}
 decorateAssetScenery(rand);
}
const colors=[0xf6b75f,0xe67e88,0xa997e4,0x69c5d5,0xf4d079,0x7bcb96];let grace=0,death=null,stageStartCount=0,chapterTimer=0;
function showChapter(){
 const el=$("chapter");if(!el)return;
 el.querySelector("strong").textContent=(level+1)+"단계 · "+stages[level].name;
 el.querySelector("span").textContent=fmt(stages[level].min)+" → "+fmt(stages[level].max)+" · "+stages[level].items.join(" · ");
 el.classList.add("show");clearTimeout(chapterTimer);chapterTimer=setTimeout(()=>el.classList.remove("show"),1900);
}let level=0,logSize=-8,count=0,foods=[],bots=[],effects=[],playing=false,mode='menu',elapsed=0,last=0,eatCooldown=0,dash=0,dashCool=0,toastTime=0,sound=true,ac=null,pointer=null,joy={x:0,y:0},keys={},saveTimer=0;
function fmt(m){let n,u;if(m<1e-6){n=m/1e-9;u='nm'}else if(m<.001){n=m/1e-6;u='μm'}else if(m<.01){n=m/.001;u='mm'}else if(m<1){n=m/.01;u='cm'}else if(m<1000){n=m;u='m'}else if(m<1e9){n=m/1000;u='km'}else{n=m/149597870700;u='AU'}return (n<.1?n.toFixed(3):n<10?n.toFixed(2):n.toFixed(0))+' '+u}
function progress(){let s=stages[level];return Math.max(0,Math.min(1,(logSize-Math.log10(s.min))/Math.log10(s.max/s.min)))}function radius(){return .8+progress()*3.8}
function tell(t){$('toast').textContent=t;toastTime=3}
function beep(f=600){if(!sound)return;try{ac??=new (window.AudioContext||window.webkitAudioContext)();ac.resume();let o=ac.createOscillator(),g=ac.createGain();o.type='sine';o.frequency.setValueAtTime(f,ac.currentTime);o.frequency.exponentialRampToValueAtTime(f*.55,ac.currentTime+.12);g.gain.setValueAtTime(.06,ac.currentTime);g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+.18);o.connect(g);g.connect(ac.destination);o.start();o.stop(ac.currentTime+.2)}catch(e){}}
function spawnFood(index,near=false){let s=stages[level],tier=index%3,sz=[.32,.8,1.8][tier]*(.85+Math.random()*.4);let g=model(s.types[tier],colors[index%colors.length]);g.scale.setScalar(sz);let ang=Math.random()*Math.PI*2,dist=near?4+Math.random()*9:8+Math.random()*65;g.position.set(player.position.x+Math.cos(ang)*dist,0,player.position.z+Math.sin(ang)*dist);world.add(g);let r=new T.Mesh(ring,new T.MeshBasicMaterial({color:0xafffc1,transparent:true,opacity:.65,side:T.DoubleSide}));r.scale.setScalar(sz*.85+.2);r.position.y=.025;g.add(r);foods.push({g,r,size:sz,name:s.items[tier]})}
function build(){grace=2;death=null;stageStartCount=count;player.visible=true;for(let f of foods)f.r.material.dispose();for(let b of bots)b.halo.material.dispose();world.clear();foods=[];bots=[];effects=[];scene.fog=new T.Fog(stages[level].sky,65,155);floor.material.color.setHex(stages[level].ground);player.position.set(0,0,0);player.rotation.set(0,0,0);decorate();showChapter();for(let i=0;i<(LOW_POWER?120:170);i++)spawnFood(i,i<20);for(let i=0;i<7;i++){let size=1.1+i*.46,g=critter(colors[i%6]);g.scale.setScalar(size);g.position.set(Math.cos(i)* (14+i*5),0,Math.sin(i)*(14+i*5));world.add(g);const halo=new T.Mesh(ring,new T.MeshBasicMaterial({color:0xff6969,transparent:true,opacity:.8,side:T.DoubleSide}));halo.position.y=.025;halo.scale.setScalar(1.1);g.add(halo);bots.push({g,halo,size,phase:Math.random()*6,hit:0})}tell(stages[level].name+' · 작은 것부터 냠냠!');cam.position.set(0,13,19)}
function save(){try{localStorage.setItem(KEY,JSON.stringify({level,logSize,count}))}catch(e){}}function saved(){try{let s=JSON.parse(localStorage.getItem(KEY));if(s&&Number.isInteger(s.level)&&s.level>=0&&s.level<8&&Number.isFinite(s.logSize)&&s.logSize>=Math.log10(stages[s.level].min)&&s.logSize<=Math.log10(stages[s.level].max)&&Number.isFinite(s.count))return s}catch(e){}return null}
function clearInput(){keys={};pointer=null;joy.x=joy.y=0;$('knob').style.transform=''}async function start(load){let s=load?saved():null;level=s?.level||0;logSize=s?.logSize??-8;count=s?.count||0;dash=0;dashCool=0;if(level>=2&&!assetsReady)await Promise.race([assetWarmup,new Promise(r=>setTimeout(r,1300))]);build();playing=true;mode='play';for(let id of ['menu','paused','win','lost'])$(id).classList.add('hidden');clearInput();beep();save()}
function burst(pos){for(let i=0;i<9;i++){let m=new T.Mesh(sphere,mat(colors[i%6]));m.scale.setScalar(.12);m.position.copy(pos);m.position.y=1;world.add(m);effects.push({m,t:0,v:new T.Vector3((Math.random()-.5)*5,2+Math.random()*4,(Math.random()-.5)*5)})}}
function eat(size,name,pos,cpu=false){count++;logSize+=Math.log10(1+(cpu?.85:.23)*Math.pow(size/radius(),.45));burst(pos);beep(cpu?280:650+Math.random()*300);eatCooldown=.07;if(cpu)tell('이제 내가 더 커! 친구도 냠냠!');if(logSize>=Math.log10(stages[level].max)){if(level===7){logSize=Math.log10(stages[7].max);playing=false;mode='win';$('win').classList.remove('hidden');$('result').textContent=count+'개를 먹고 10 nm에서 1 AU까지 자랐어요!';try{localStorage.removeItem(KEY)}catch(e){}clearInput();return}level++;logSize=Math.log10(stages[level].min);build();save();beep(1000)} }
function swallowed(b){
 if(!playing||grace>0)return;
 playing=false;mode='dead';clearInput();dash=0;
 death={t:0,from:player.position.clone(),to:b.g.position.clone(),scale:player.scale.x};
 $('lostResult').textContent=stages[level].name+'에서 '+fmt(10**logSize)+'까지 자랐어요.';
 tell('앗! 큰 친구에게 먹혔어!');beep(130);
 try{localStorage.setItem(KEY,JSON.stringify({level,logSize:Math.log10(stages[level].min),count:stageStartCount}))}catch(e){}
}
$('retry').onclick=()=>start(true);$('restart').onclick=()=>start(false);
function update(dt){elapsed+=dt;toastTime-=dt;$('toast').style.opacity=toastTime>0?1:0;let pr=progress(),r=radius();if(!death)player.scale.lerp(new T.Vector3(r,r,r),Math.min(1,dt*5));if(playing){grace=Math.max(0,grace-dt);eatCooldown-=dt;dash=Math.max(0,dash-dt);dashCool=Math.max(0,dashCool-dt);let x=(keys.ArrowRight||keys.d?1:0)-(keys.ArrowLeft||keys.a?1:0)+joy.x,z=(keys.ArrowDown||keys.s?1:0)-(keys.ArrowUp||keys.w?1:0)+joy.y;let len=Math.hypot(x,z);if(len>.1){let v=(7+r*1.2)*(dash>0?2.2:1);player.position.x+=x/Math.max(1,len)*v*dt;player.position.z+=z/Math.max(1,len)*v*dt;faceDirection(player,x,z,dt);player.rotation.z=Math.sin(elapsed*12)*.055;player.position.y=Math.abs(Math.sin(elapsed*9))*.1*r}else{player.rotation.z*=.9;player.position.y=.03*Math.sin(elapsed*3)}
for(let i=foods.length-1;i>=0;i--){let f=foods[i],d=Math.hypot(f.g.position.x-player.position.x,f.g.position.z-player.position.z);f.r.visible=f.size<r*.82;f.r.material.opacity=.45+Math.sin(elapsed*3)*.15;if(d>90){f.g.position.set(player.position.x+(Math.random()-.5)*110,0,player.position.z+(Math.random()-.5)*110)}if(d<r*.7+f.size*.25&&f.size<r*.82&&eatCooldown<=0){let old=level;foods.splice(i,1);world.remove(f.g);f.r.material.dispose();eat(f.size,f.name,f.g.position);if(level!==old||!playing)break;spawnFood(Math.floor(Math.random()*3),true)}}
for(let i=bots.length-1;i>=0&&playing;i--){let b=bots[i],dx=player.position.x-b.g.position.x,dz=player.position.z-b.g.position.z,d=Math.hypot(dx,dz);const beforeX=b.g.position.x,beforeZ=b.g.position.z;b.hit-=dt;let edible=b.size<r*.82,dangerous=r<b.size*.82,speed=edible?2.3:dangerous?2.8:1.1;b.halo.material.color.setHex(edible?0x8affb0:dangerous?0xff6169:0xffd36b);if(d<12&&d>.01&&(edible||dangerous)){let dir=edible?-1:1;b.g.position.x+=dx/d*speed*dt*dir;b.g.position.z+=dz/d*speed*dt*dir}else{b.g.position.x+=Math.sin(elapsed*.3+b.phase)*dt;b.g.position.z+=Math.cos(elapsed*.4+b.phase)*dt}faceDirection(b.g,b.g.position.x-beforeX,b.g.position.z-beforeZ,dt);b.g.position.y=Math.abs(Math.sin(elapsed*3+b.phase))*.08*b.size;if(d>90){b.g.position.x=player.position.x+25*Math.cos(b.phase);b.g.position.z=player.position.z+25*Math.sin(b.phase)}if(d<(r+b.size)*.6){if(edible){let old=level;bots.splice(i,1);world.remove(b.g);b.halo.material.dispose();eat(b.size,'친구',b.g.position,true);if(old!==level)break}else if(dangerous){if(grace<=0){swallowed(b);break}}else if(b.hit<=0){b.hit=2;if(d>.01){player.position.x-=dx/d*3;player.position.z-=dz/d*3}tell('비슷한 크기야. 조금 더 먹고 오자!');beep(160)}}}
saveTimer+=dt;if(saveTimer>3){saveTimer=0;if(playing)save()}}
if(death){death.t+=dt;const t=Math.min(1,death.t/.65);player.position.lerpVectors(death.from,death.to,t);player.position.y+=Math.sin(t*Math.PI)*1.2;player.scale.setScalar(death.scale*Math.max(.001,1-t));if(t>=1){player.visible=false;$('lost').classList.remove('hidden')}}
for(let i=effects.length-1;i>=0;i--){let e=effects[i];e.t+=dt;e.m.position.addScaledVector(e.v,dt);e.v.y-=10*dt;e.m.scale.setScalar(.13*(1-e.t/.7));if(e.t>.7){world.remove(e.m);effects.splice(i,1)}}
scenery.position.set(Math.floor(player.position.x/120)*120,0,Math.floor(player.position.z/120)*120);floor.position.set(player.position.x,0,player.position.z);sun.position.set(player.position.x-18,35,player.position.z+15);sun.target.position.copy(player.position);let target=new T.Vector3(player.position.x,10+r*2.1,player.position.z+15+r*2.8);cam.position.lerp(target,1-Math.exp(-dt*4));cam.lookAt(player.position.x,1+r*.5,player.position.z-3);$('zone').textContent=(level+1)+' / 8 · '+stages[level].name;$('size').textContent=fmt(10**logSize);$('fill').style.width=(pr*100)+'%';$('next').textContent='다음 크기 '+fmt(stages[level].max)+' · '+count+'개 냠냠';$('targets').textContent='먹을 것 · '+stages[level].items.join(' · ');$('dash').textContent=dashCool>0?Math.ceil(dashCool)+'초':'쌩쌩!';renderer.render(scene,cam)}
function boost(){if(playing&&dashCool<=0){dash=1.1;dashCool=4;beep(900)}}function pause(){if(!playing)return;playing=false;mode='pause';save();clearInput();$('paused').classList.remove('hidden')}
$('start').onclick=()=>start(false);$('continue').onclick=()=>start(true);$('again').onclick=()=>start(false);$('pause').onclick=pause;$('resume').onclick=()=>{playing=true;mode='play';$('paused').classList.add('hidden');clearInput()};$('home').onclick=()=>{mode='menu';$('paused').classList.add('hidden');$('menu').classList.remove('hidden');$('continue').classList.toggle('hidden',!saved())};$('sound').onclick=()=>{sound=!sound;$('sound').textContent=sound?'♪':'♪ ×'};$('dash').onpointerdown=e=>{e.preventDefault();boost()};addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();keys[e.key]=true;if(e.key===' ')boost();if(e.key==='Escape')pause()});addEventListener('keyup',e=>{keys[e.key]=false});addEventListener('blur',()=>{clearInput();pause()});document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});
function attach(el){el.addEventListener('pointerdown',e=>{if(!playing||pointer)return;el.setPointerCapture(e.pointerId);pointer={id:e.pointerId,x:e.clientX,y:e.clientY};joy.x=joy.y=0});el.addEventListener('pointermove',e=>{if(!pointer||pointer.id!==e.pointerId)return;let x=(e.clientX-pointer.x)/45,y=(e.clientY-pointer.y)/45,d=Math.max(1,Math.hypot(x,y));joy.x=x/d;joy.y=y/d;$('knob').style.transform='translate('+joy.x*30+'px,'+joy.y*30+'px)'});for(let name of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(name,e=>{if(pointer?.id===e.pointerId)clearInput()})}attach($('joy'));attach($('view'));
function resize(){renderer.setSize(innerWidth,innerHeight);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix()}addEventListener('resize',resize);resize();build();$('continue').classList.toggle('hidden',!saved());function frame(t){let dt=Math.min(.04,(t-last)/1000||.016);last=t;update(dt);requestAnimationFrame(frame)}requestAnimationFrame(frame);
})();


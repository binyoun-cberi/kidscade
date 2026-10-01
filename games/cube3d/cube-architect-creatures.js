/* Cube Architect v22 creature roster and fallback voxel models. */
(()=>{
'use strict';

const SPECIES={
  deer:{id:'deer',name:'사슴',kind:'passive',biomes:['forest','flowers'],asset:'deer',hp:1,speed:.55,radius:8},
  frog:{id:'frog',name:'개구리',kind:'passive',biomes:['marsh'],asset:'frog',hp:1,speed:.35,radius:6},
  camel:{id:'camel',name:'낙타',kind:'passive',biomes:['desert','badlands'],asset:null,hp:1,speed:.46,radius:9},
  shadowBug:{id:'shadowBug',name:'그림자 벌레',kind:'hostile',biomes:['forest','pine','meadow'],asset:null,hp:2,speed:.82,radius:9,nocturnal:true,damage:1,reward:{charcoal:1}},
  slime:{id:'slime',name:'늪 슬라임',kind:'hostile',biomes:['marsh'],asset:'slime',hp:2,speed:.48,radius:8,damage:1,reward:{clay:2}},
  burrower:{id:'burrower',name:'모래잠복충',kind:'hostile',biomes:['desert','badlands'],asset:'burrower',hp:3,speed:.92,radius:9,damage:1,reward:{sand:3}},
  cubeGolem:{id:'cubeGolem',name:'큐브 골렘',kind:'hostile',biomes:['badlands'],asset:'golem',hp:5,speed:.43,radius:10,damage:2,reward:{stone:5,ironOre:1},elite:true}
};

function mat(color,emissive=0){
  return new THREE.MeshStandardMaterial({color,roughness:.78,emissive,emissiveIntensity:emissive?.35:0});
}
function box(w,h,d,m,x=0,y=0,z=0){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);
  mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;return mesh;
}
function sphere(r,m,x=0,y=0,z=0,segments=8){
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(r,segments,Math.max(6,segments-2)),m);
  mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;return mesh;
}
function holder(){
  const g=new THREE.Group();g.name='creatureVisual';return g;
}
function fallbackDeer(){
  const g=holder(),fur=mat(0x9b633c),light=mat(0xd9b48b),dark=mat(0x30251f);
  g.add(box(.78,.5,.34,fur,0,.57,.05),box(.36,.4,.31,fur,0,.95,-.38));
  for(const x of [-.27,.27])for(const z of [-.12,.2])g.add(box(.11,.62,.11,dark,x,.3,z));
  g.add(box(.08,.32,.08,dark,-.12,1.25,-.4),box(.08,.32,.08,dark,.12,1.25,-.4));
  g.add(box(.05,.05,.035,dark,-.09,1.0,-.55),box(.05,.05,.035,dark,.09,1.0,-.55));
  g.add(box(.18,.12,.06,light,0,.86,-.56));return g;
}
function fallbackFrog(){
  const g=holder(),green=mat(0x68a64c),belly=mat(0xc9d88b),dark=mat(0x172b1a);
  g.add(box(.55,.28,.48,green,0,.22,0),box(.48,.25,.42,green,0,.42,-.18));
  g.add(sphere(.11,green,-.16,.58,-.29),sphere(.11,green,.16,.58,-.29));
  g.add(sphere(.045,dark,-.16,.6,-.37),sphere(.045,dark,.16,.6,-.37));
  g.add(box(.3,.08,.18,belly,-.29,.12,.12),box(.3,.08,.18,belly,.29,.12,.12));return g;
}
function fallbackCamel(){
  const g=holder(),fur=mat(0xb98a52),dark=mat(0x3b2e21),light=mat(0xd7b17b);
  g.add(box(.95,.46,.38,fur,0,.86,.06));
  g.add(box(.42,.42,.35,fur,0,1.28,-.48));
  g.add(box(.25,.5,.24,fur,0,1.02,-.38));
  const hump=sphere(.28,fur,.12,1.2,.1,8);hump.scale.set(1,.85,.8);g.add(hump);
  for(const x of [-.32,.32])for(const z of [-.1,.21]){
    g.add(box(.13,.88,.13,dark,x,.45,z),box(.17,.1,.28,dark,x,.04,z-.04));
  }
  g.add(box(.09,.09,.035,dark,-.11,1.34,-.66),box(.09,.09,.035,dark,.11,1.34,-.66));
  g.add(box(.28,.12,.06,light,0,1.18,-.67));
  return g;
}
function fallbackShadowBug(){
  const g=holder(),shadow=mat(0x242238,0x5b4bb7),eye=mat(0xbd9cff,0x9f7aea);
  g.add(sphere(.32,shadow,0,.3,0),box(.36,.18,.45,shadow,0,.22,.27));
  for(const side of [-1,1])for(const z of [-.25,0,.25]){
    const leg=box(.42,.055,.06,shadow,side*.35,.16,z);leg.rotation.z=side*.18;g.add(leg);
  }
  g.add(sphere(.055,eye,-.11,.36,-.29),sphere(.055,eye,.11,.36,-.29));return g;
}
function fallbackSlime(){
  const g=holder(),green=mat(0x5aaa5d,0x244d27),eye=mat(0x172117);
  const body=box(.72,.62,.66,green,0,.36,0);body.scale.set(1,.9,1);g.add(body);
  g.add(box(.08,.1,.035,eye,-.15,.45,-.34),box(.08,.1,.035,eye,.15,.45,-.34));return g;
}
function fallbackBurrower(){
  const g=holder(),sand=mat(0xc89f59),dark=mat(0x4b3920),red=mat(0xe07a48,0x8d3d22);
  const body=sphere(.36,sand,0,.3,0,7);body.scale.set(1.1,.72,1.25);g.add(body);
  for(let i=0;i<8;i++){const a=i*Math.PI/4,spike=box(.08,.28,.08,dark,Math.sin(a)*.32,.58,Math.cos(a)*.32);spike.rotation.z=Math.sin(a)*.35;g.add(spike)}
  g.add(sphere(.055,red,-.11,.34,-.39),sphere(.055,red,.11,.34,-.39));return g;
}
function fallbackGolem(){
  const g=holder(),stone=mat(0x777c83),edge=mat(0x50545a),core=mat(0x52e0d1,0x27b9ac);
  g.add(box(.72,.72,.52,stone,0,1.08,0),box(.52,.5,.48,stone,0,1.68,-.02));
  const la=box(.32,.86,.32,edge,-.55,1.03,0),ra=box(.32,.86,.32,edge,.55,1.03,0);
  const ll=box(.34,.8,.36,edge,-.21,.42,0),rl=box(.34,.8,.36,edge,.21,.42,0);g.add(la,ra,ll,rl);
  g.add(box(.22,.22,.08,core,0,1.12,-.3));return g;
}
function makeFallback(id){
  if(id==='deer')return fallbackDeer();
  if(id==='frog')return fallbackFrog();
  if(id==='camel')return fallbackCamel();
  if(id==='shadowBug')return fallbackShadowBug();
  if(id==='slime')return fallbackSlime();
  if(id==='burrower')return fallbackBurrower();
  if(id==='cubeGolem')return fallbackGolem();
  return holder();
}
function create(id){
  const spec=SPECIES[id];if(!spec)return null;
  const root=new THREE.Group();root.name='Creature_'+id;
  const visual=makeFallback(id);root.add(visual);
  root.userData={...root.userData,creature:true,species:id,spec,visual,hp:spec.hp,maxHp:spec.hp,
    dir:Math.random()*Math.PI*2,turn:.8+Math.random()*2.6,homeX:0,homeZ:0,phase:Math.random()*6.28,
    hurtUntil:0,assetPending:false,assetReady:false,dead:false};
  return root;
}
window.CubeArchitectCreatures={SPECIES,create,makeFallback};
})();
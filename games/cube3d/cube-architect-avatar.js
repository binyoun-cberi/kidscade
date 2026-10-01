/* Blocky 3D player avatar for Cube Architect.
   Reuses Kidscade's existing avatar equipment ids instead of creating a second wardrobe. */
(()=>{
'use strict';

const EQUIPPED_KEY='kidscade_avatar_equipped';
const SHOP_KEY='kidscade-avatar-shop-v2';
const DEFAULTS={
  skin:'skin_peach',hair:'hair_short',top:'top_tee',bottom:'bottom_shorts',
  head:'head_none',face:'face_none',hand:'hand_none',background:'bg_basic',aura:'aura_none'
};
const COLORS={
  skin:{skin_peach:0xF1C27D,skin_warm:0xDDA574,skin_tan:0xB97850,skin_deep:0x7A4A32},
  hair:{
    hair_short:0x3b2b24,hair_bob:0x4b2e24,hair_curl:0x2f241f,hair_pony:0x5a3426,
    hair_spike:0x222831,hair_buns:0x2f241f,hair_wave:0x6b3f2a,hair_twin:0x45312a,
    hair_mushroom:0x352722,hair_bluewave:0x2563eb,hair_rainbow:0xa855f7
  },
  top:{
    top_tee:0x5eead4,top_hoodie:0x8b5cf6,top_soccer:0x2563eb,top_uniform:0xf8fafc,
    top_varsity:0x2563eb,top_sailor:0xf8fafc,top_lab:0xf8fafc,top_chef:0xfff7ed,
    top_wizard:0x6d28d9,top_armor:0x94a3b8,top_space:0xf8fafc
  },
  bottom:{
    bottom_shorts:0x475569,bottom_jeans:0x2563eb,bottom_skirt:0xfb7185,bottom_track:0x1f2937,
    bottom_cargo:0x64748b,bottom_denimskirt:0x3b82f6,bottom_apron:0xef4444,
    bottom_wizard:0x4c1d95,bottom_armor:0x64748b,bottom_space:0xe2e8f0
  }
};
const HEAD_COLORS={
  head_cap:0x2563eb,head_headphones:0x8b5cf6,head_beanie:0xf97316,head_bunny:0xf9a8d4,
  head_tiara:0xfbbf24,head_chef:0xfff7ed,head_wizard:0x6d28d9,head_crown:0xfbbf24,
  head_halo:0xfde68a,head_space:0xe2e8f0
};

function host(){
  try{if(parent&&parent!==window&&parent.location.origin===location.origin)return parent}catch(_){}
  return window;
}
function safeJson(raw){
  try{return raw?JSON.parse(raw):null}catch(_){return null}
}
function readEquipment(){
  const h=host();
  let saved=null;
  try{saved=safeJson(h.localStorage?.getItem(EQUIPPED_KEY))}catch(_){}
  if(!saved)try{saved=safeJson(localStorage.getItem(EQUIPPED_KEY))}catch(_){}
  // Some versions of the deluxe studio store the equipment in a nested shop object.
  if(!saved){
    let shop=null;
    try{shop=safeJson(h.localStorage?.getItem(SHOP_KEY))}catch(_){}
    if(!shop)try{shop=safeJson(localStorage.getItem(SHOP_KEY))}catch(_){}
    saved=shop?.equipped||shop?.equipment||shop?.current||null;
  }
  return {...DEFAULTS,...(saved&&typeof saved==='object'?saved:{})};
}
function signature(e=readEquipment()){
  return ['skin','hair','top','bottom','head','face','hand','aura'].map(k=>e[k]||'').join('|');
}
function mat(color,opts={}){
  return new THREE.MeshStandardMaterial({color,roughness:opts.roughness??.76,metalness:opts.metalness??0,
    transparent:!!opts.transparent,opacity:opts.opacity??1,emissive:opts.emissive||0,
    emissiveIntensity:opts.emissiveIntensity||0});
}
function box(w,h,d,material,x=0,y=0,z=0){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
  m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;return m;
}
function limb(material,x,y,w=.18,h=.58,d=.2){
  const g=new THREE.Group();g.position.set(x,y,0);
  const m=box(w,h,d,material,0,-h/2,0);g.add(m);return g;
}
function addHair(root,id,color){
  const m=mat(color),cap=box(.59,.12,.59,m,0,1.89,0);root.add(cap);
  if(['hair_bob','hair_wave','hair_mushroom','hair_rainbow','hair_bluewave'].includes(id)){
    root.add(box(.12,.38,.55,m,-.29,1.69,.01),box(.12,.38,.55,m,.29,1.69,.01));
  }
  if(['hair_pony','hair_twin'].includes(id)){
    const p=box(.18,.42,.18,m,id==='hair_pony'?.29:-.32,1.63,.26);root.add(p);
    if(id==='hair_twin')root.add(box(.18,.42,.18,m,.32,1.63,.26));
  }
  if(id==='hair_buns'){
    root.add(box(.23,.23,.23,m,-.29,1.96,0),box(.23,.23,.23,m,.29,1.96,0));
  }
  if(id==='hair_curl'){
    for(const x of [-.25,0,.25])for(const z of [-.22,.2])root.add(box(.2,.2,.2,m,x,1.91,z));
  }
  if(id==='hair_spike'){
    for(const x of [-.24,-.08,.08,.24]){const spike=box(.12,.26,.12,m,x,2.02,0);spike.rotation.z=(x<0?1:-1)*.18;root.add(spike)}
  }
}
function addHeadItem(root,id){
  if(!id||id==='head_none')return;
  const c=HEAD_COLORS[id]||0xfbbf24,m=mat(c,{metalness:id==='head_crown'?.2:0});
  if(id==='head_cap'){
    root.add(box(.62,.16,.61,m,0,1.99,0),box(.42,.08,.28,m,0,1.93,-.38));
  }else if(id==='head_headphones'){
    root.add(box(.68,.09,.12,m,0,1.92,.03),box(.12,.34,.16,m,-.35,1.77,0),box(.12,.34,.16,m,.35,1.77,0));
  }else if(id==='head_beanie'){
    root.add(box(.61,.23,.61,m,0,2.0,0),box(.16,.16,.16,m,0,2.19,0));
  }else if(id==='head_bunny'){
    root.add(box(.58,.08,.12,m,0,1.98,0),box(.13,.52,.14,m,-.18,2.22,0),box(.13,.52,.14,m,.18,2.22,0));
  }else if(id==='head_tiara'||id==='head_crown'){
    root.add(box(.54,.13,.13,m,0,2.0,-.16));
    for(const x of [-.19,0,.19])root.add(box(.11,id==='head_crown'?.26:.18,.11,m,x,2.13,-.16));
  }else if(id==='head_chef'){
    root.add(box(.66,.14,.62,m,0,1.98,0));
    for(const x of [-.21,0,.21])root.add(box(.23,.24,.23,m,x,2.13,0));
  }else if(id==='head_wizard'){
    root.add(box(.72,.08,.72,m,0,1.98,0));
    const cone=new THREE.Mesh(new THREE.ConeGeometry(.34,.75,4),m);cone.position.y=2.37;cone.rotation.y=Math.PI/4;cone.castShadow=true;root.add(cone);
  }else if(id==='head_halo'){
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.34,.035,8,24),mat(c,{emissive:c,emissiveIntensity:.65}));
    ring.rotation.x=Math.PI/2;ring.position.y=2.25;root.add(ring);
  }else if(id==='head_space'){
    const shell=box(.7,.68,.7,mat(0xcbd5e1,{transparent:true,opacity:.42}),0,1.63,0);root.add(shell);
  }
}
function addFace(root,id){
  const dark=mat(0x172033),lens=mat(id==='face_sun'?0x111827:0x93c5fd,{transparent:id!=='face_sun',opacity:.72});
  if(!id||id==='face_none')return;
  const y=1.62,z=-.292;
  if(['face_round','face_sun','face_goggles','face_star','face_heart'].includes(id)){
    const w=id==='face_goggles'?.27:.19,h=id==='face_sun'?.11:.17;
    root.add(box(w,h,.035,lens,-.15,y,z),box(w,h,.035,lens,.15,y,z),box(.11,.035,.035,dark,0,y,z-.003));
  }
}
function addHandItem(root,id){
  if(!id||id==='hand_none')return;
  const g=new THREE.Group();g.position.set(.42,.83,-.03);g.rotation.z=-.12;root.add(g);
  if(id==='hand_sword'){
    g.add(box(.06,.72,.06,mat(0xdbeafe,{metalness:.35}),0,-.22,0),box(.28,.06,.08,mat(0xfbbf24),0,.08,0));
  }else if(id==='hand_wand'){
    g.add(box(.055,.65,.055,mat(0xa78bfa),0,-.2,0));
    const orb=new THREE.Mesh(new THREE.OctahedronGeometry(.13),mat(0xfde047,{emissive:0xf59e0b,emissiveIntensity:.5}));orb.position.y=.15;g.add(orb);
  }else if(id==='hand_book'){
    g.add(box(.31,.38,.09,mat(0x2563eb),0,-.12,-.08));
  }else if(id==='hand_ball'){
    const ball=new THREE.Mesh(new THREE.SphereGeometry(.2,10,8),mat(0xf8fafc));ball.position.y=-.17;ball.castShadow=true;g.add(ball);
  }else if(id==='hand_camera'){
    g.add(box(.34,.24,.18,mat(0x334155),0,-.08,-.08));
  }else if(id==='hand_gamepad'){
    g.add(box(.34,.2,.12,mat(0x7c3aed),0,-.08,-.08));
  }else if(id==='hand_guitar'){
    const body=new THREE.Mesh(new THREE.SphereGeometry(.22,8,6),mat(0xf97316));body.scale.set(1,.72,.42);body.position.y=-.2;g.add(body);
    g.add(box(.07,.62,.07,mat(0x92400e),0,.13,0));
  }else{
    g.add(box(.12,.46,.12,mat(0x64748b),0,-.15,0));
  }
}
function addAura(root,id){
  if(!id||id==='aura_none')return;
  const colors={
    aura_star:0xfde047,aura_heart:0xec4899,aura_bubble:0x67e8f9,aura_music:0xa855f7,
    aura_leaf:0x22c55e,aura_snow:0xe0f2fe,aura_fire:0xf97316,aura_rainbow:0x60a5fa,aura_lightning:0xfde047
  };
  const c=colors[id]||0xfde047,pieces=[];
  for(let i=0;i<6;i++){
    const geo=id==='aura_bubble'?new THREE.SphereGeometry(.055,7,5):new THREE.OctahedronGeometry(.065);
    const piece=new THREE.Mesh(geo,mat(c,{transparent:true,opacity:.8,emissive:c,emissiveIntensity:.45}));
    piece.userData.avatarAuraIndex=i;root.add(piece);pieces.push(piece);
  }
  root.userData.auraPieces=pieces;
}
function create(equipment=readEquipment()){
  const e={...DEFAULTS,...equipment},root=new THREE.Group();
  root.name='CubeArchitectPlayerAvatar';
  const skin=mat(COLORS.skin[e.skin]||COLORS.skin.skin_peach);
  const hairColor=COLORS.hair[e.hair]||COLORS.hair.hair_short;
  const top=mat(COLORS.top[e.top]||COLORS.top.top_tee,{metalness:e.top==='top_armor'?.18:0});
  const bottom=mat(COLORS.bottom[e.bottom]||COLORS.bottom.bottom_shorts,{metalness:e.bottom==='bottom_armor'?.15:0});
  const shoe=mat(e.bottom==='bottom_space'?0x94a3b8:0x293241);
  const head=box(.56,.56,.56,skin,0,1.58,0);
  const torso=box(.62,.64,.34,top,0,.95,0);
  const leftArm=limb(top,-.4,1.25,.18,.59,.2),rightArm=limb(top,.4,1.25,.18,.59,.2);
  const leftLeg=limb(bottom,-.17,.63,.22,.61,.24),rightLeg=limb(bottom,.17,.63,.22,.61,.24);
  leftLeg.add(box(.23,.16,.34,shoe,0,-.56,-.05));rightLeg.add(box(.23,.16,.34,shoe,0,-.56,-.05));
  root.add(torso,head,leftArm,rightArm,leftLeg,rightLeg);

  // Simple voxel face on the -Z side.
  const eyeMat=mat(0x1f2937),mouthMat=mat(0x9f4f4f);
  root.add(box(.065,.065,.025,eyeMat,-.14,1.62,-.293),box(.065,.065,.025,eyeMat,.14,1.62,-.293),
    box(.16,.035,.025,mouthMat,0,1.45,-.294));

  addHair(root,e.hair,hairColor);
  addHeadItem(root,e.head);
  addFace(root,e.face);
  addHandItem(root,e.hand);
  addAura(root,e.aura);

  root.userData.avatarRig={leftArm,rightArm,leftLeg,rightLeg,equipment:e};
  root.userData.avatarSignature=signature(e);
  root.traverse(o=>{if(o.isMesh){o.frustumCulled=true;o.userData.avatarPart=true}});
  return root;
}
function animate(root,time,moving,onGround=true){
  const rig=root?.userData?.avatarRig;if(!rig)return;
  const t=time*.008,walk=moving&&onGround?Math.sin(t)*.72:0;
  rig.leftLeg.rotation.x=walk;rig.rightLeg.rotation.x=-walk;
  rig.leftArm.rotation.x=-walk*.82;rig.rightArm.rotation.x=walk*.82;
  root.position.y+=moving&&onGround?Math.abs(Math.sin(t*2))*.025:Math.sin(time*.002)*.008;
  const pieces=root.userData.auraPieces||[];
  pieces.forEach((p,i)=>{
    const a=time*.0011+i*Math.PI*2/pieces.length;
    const r=.55+(i%2)*.12;
    p.position.set(Math.cos(a)*r,.65+(i%3)*.48+Math.sin(a*1.7)*.12,Math.sin(a)*r);
  });
}
window.CubeArchitectAvatar={EQUIPPED_KEY,SHOP_KEY,DEFAULTS,readEquipment,signature,create,animate};
})();
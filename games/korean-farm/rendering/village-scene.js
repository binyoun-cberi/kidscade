// Solnaeri village: modern Korean farm life, built from small, color-controlled low-poly primitives.
// No network or new art license dependency. Decorations do NOT add invisible colliders.
import * as THREE from 'three';

export const VILLAGE_SCENE_VERSION=1;
const palette=Object.freeze({
  blue:0x4b86a5,roofShadow:0x346a89,brick:0xc9b18f,plaster:0xe6d9b8,
  timber:0x795841,darkWood:0x634d3b,stone:0xb9b4a1,roadStone:0x998c70,
  earth:0xb29a73,straw:0xdbbe7c,redPepper:0xc94c30,leaf:0x588651,
  deepLeaf:0x436c49,cream:0xf2dfb5,grey:0x858c88,water:0x5b9fa8
});
const matCache=new Map();
const material=(color,opts={})=>{
  const key=color+'|'+(opts.metalness||0)+'|'+(opts.roughness??.9);
  if(!matCache.has(key))matCache.set(key,new THREE.MeshStandardMaterial({
    color,roughness:opts.roughness??.92,metalness:opts.metalness||0,
    side:THREE.DoubleSide
  }));
  return matCache.get(key);
};
function box(parent,w,h,d,color,x=0,y=0,z=0,opts={}){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material(color,opts));
  mesh.position.set(x,y,z);mesh.castShadow=opts.shadow!==false;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function cylinder(parent,top,bottom,height,color,x=0,y=0,z=0,n=9){
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(top,bottom,height,n),material(color));
  mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function sphere(parent,r,color,x=0,y=0,z=0,n=7){
  const mesh=new THREE.Mesh(new THREE.IcosahedronGeometry(r,0),material(color));
  mesh.position.set(x,y,z);mesh.castShadow=true;parent.add(mesh);return mesh;
}
function grouping(root,name,x=0,z=0,angle=0){
  const g=new THREE.Group();g.name=name;g.position.set(x,0,z);g.rotation.y=angle;root.add(g);return g;
}
function gableRoof(group,{width,depth,height,rise,color,trim}){
  const half=width/2+.22,slant=Math.hypot(half,rise);
  for(const sign of [-1,1]){
    const plane=box(group,slant+.1,.13,depth+.62,color,sign*half*.5,height+rise*.5,0);
    plane.rotation.z=sign*(Math.atan2(rise,half));
    // Metal roof seams read as corrugation at a distance.
    for(let z=-depth/2;z<=depth/2+.01;z+=.44){
      const rib=box(group,slant+.06,.026,.045,trim,sign*half*.5,height+rise*.5+.09,z,{shadow:false});
      rib.rotation.z=plane.rotation.z;
    }
  }
  box(group,.16,.16,depth+.75,trim,0,height+rise+.035,0);
}
function farmhouse(root){
  const g=grouping(root,'solnaeri-farmhouse',10.1,-13);
  box(g,5.25,.28,4.6,0xbab09b,0,.17,0);
  box(g,4.85,2.68,4.0,palette.plaster,0,1.5,0);
  box(g,5.0,.26,.13,palette.timber,0,.54,2.02);
  // Front facing south on the playfield: entrance, narrow windows and wooden frames.
  box(g,1.06,1.72,.10,palette.timber,-.2,1.22,2.08);
  box(g,.78,1.42,.10,0xb6c6b9,-.2,1.20,2.15);
  sphere(g,.045,0xc59b4d,.1,1.28,2.25);
  for(const x of [-1.75,1.55]){
    box(g,1.02,.92,.11,palette.darkWood,x,1.67,2.09);
    box(g,.85,.75,.12,0xb1cfcb,x,1.68,2.17,{shadow:false});
    box(g,.055,.8,.14,palette.timber,x,1.69,2.26);
    box(g,.9,.055,.14,palette.timber,x,1.68,2.26);
  }
  // A blue metal roof is common in contemporary Korean village scenery.
  gableRoof(g,{width:5.16,depth:4.12,height:2.86,rise:1.14,
    color:palette.blue,trim:palette.roofShadow});
  const chimney=box(g,.47,1.2,.47,0x978c79,1.48,3.37,-1.02);
  box(g,.59,.1,.59,0x726f65,1.48,3.99,-1.02);
  box(g,1.74,.16,.68,0xb0a48d,-.2,.19,2.6);
  for(let i=0;i<3;i++)box(g,1.04,.07,.54,0xb8aa96,-.2,.06,3+i*.55,{shadow:false});
  return g;
}
function shed(root){
  const g=grouping(root,'grain-shed',18,-12,.04);
  box(g,3.4,.28,3.2,0xb2a18a,0,.17,0);
  box(g,3,1.96,2.7,0x95745c,0,1.13,0);
  for(let x=-1.32;x<1.4;x+=.45)box(g,.06,1.85,.07,0x75573f,x,1.23,1.39);
  box(g,1.22,1.6,.11,0x5e5446,0,1.02,1.43);
  box(g,.08,1.6,.12,0xb4a080,0,1.03,1.54);
  gableRoof(g,{width:3.3,depth:2.85,height:2.22,rise:.73,color:0x796b5b,trim:0x665f57});
  for(let i=0;i<3;i++){
    const bag=box(g,.58,.7,.42,0xc6ac77,-1.08+i*.67,.41,2.07);
    bag.rotation.z=(i-1)*.08;
  }
  return g;
}
function bigJar(root,x,z,scale=1){
  const g=grouping(root,'onggi-jar',x,z);
  g.scale.setScalar(scale);
  cylinder(g,.42,.30,.55,0x735344,0,.34,0,10);
  sphere(g,.40,0x875e48,0,.43,0,10);
  cylinder(g,.35,.35,.055,0x57483c,0,.73,0,10);
  return g;
}
function yard(root){
  const g=grouping(root,'farmyard',10.1,-9.1);
  box(g,8.35,.075,3.10,0xc6b493,1.55,.036,0,{shadow:false});
  // Flat stepping stones connect entrance to the road.
  for(let i=0;i<5;i++){
    let p=box(root,.76,.09,.58,i%2?0xb4b0a1:0xc1bcb0,9.85,.11,-10.7+i*.66,{shadow:false});
    p.rotation.y=i*.08;
  }
  for(let i=0;i<3;i++)bigJar(root,13.15+i*.68,-8.67,.68+i*.06);
  // Pyeongsang low wooden platform and sit-able-looking design; decorative only in 4.2.
  const bench=grouping(root,'wooden-pyeongsang',14.55,-10.65);
  box(bench,1.55,.16,1.08,0xa97951,0,.53,0);
  for(const x of [-.61,.61])for(const z of [-.36,.36])
    box(bench,.15,.49,.15,0x79573f,x,.26,z);
  for(let i=0;i<7;i++)box(bench,.052,.025,1.03,0xc19566,-.66+i*.22,.63,0,{shadow:false});
  // Pepper drying rack with visible red pods.
  const rack=grouping(root,'red-pepper-drying-rack',12.5,-10.85);
  for(const x of [-.78,.78])for(const z of [-.40,.40])
    box(rack,.09,.62,.09,0x835b3b,x,.32,z);
  box(rack,1.83,.11,1.02,0xa78157,0,.67,0);
  for(let i=0;i<22;i++){
    const x=-.71+(i%8)*.20,z=-.34+Math.floor(i/8)*.24;
    const pod=box(rack,.09,.055,.16,i%5===0?0xd66d36:palette.redPepper,x,.77,z,{shadow:false});
    pod.rotation.y=(i%5)*.38;
  }
  // Tub and handcart: small recognizable everyday courtyard props.
  cylinder(root,.50,.41,.30,0x4e8195,7.2,.19,-9.0,12);
  cylinder(root,.43,.43,.02,0x87b9bf,7.2,.35,-9.0,12);
  const cart=grouping(root,'wheelbarrow',16.8,-8.1,-.3);
  box(cart,1.1,.19,.63,0x668667,0,.48,0);
  cylinder(cart,.28,.28,.12,0x48504a,-.42,.26,-.44,10).rotation.x=Math.PI/2;
  for(const x of [-.34,.34])box(cart,.07,.08,1.21,0x866545,x,.40,.62);
  // Split rail fences only along the exterior; do not block path to fields.
  for(const x of [7.1,8.25,9.4,10.55,11.7])
    box(root,.1,.67,.12,0xb29a76,x,.36,-16.8);
  box(root,4.7,.09,.11,0xb29a76,9.4,.64,-16.8,{shadow:false});
  return g;
}
function laneDetails(root){
  const r=grouping(root,'country-path-details');
  // Small packed-earth edge patches; do not cover fields.
  const strips=[
    [-.95,8.5,.28,8.8],[.98,8.5,.25,9.1],[-1.1,-1.6,.2,7.0],
    [4.2,10.8,6.4,.22],[10.0,4.95,7.3,.24],
    [16.1,8.7,.23,9.0]
  ];
  strips.forEach(([x,z,w,d],i)=>box(r,w,.025,d,i%2?0xb69e79:0xae9b7b,x,.058,z,{shadow:false}));
  // Pebbles and farm path wear using a single instanced mesh rather than hundreds of draw calls.
  const geom=new THREE.DodecahedronGeometry(1,0);
  const pebbles=new THREE.InstancedMesh(geom,material(0xa49a81),150);
  pebbles.name='country-path-pebbles';pebbles.castShadow=false;pebbles.receiveShadow=true;
  const dummy=new THREE.Object3D();
  for(let i=0;i<150;i++){
    const onNorth=i<65;
    const x=onNorth?-22+(i*3.71)%44:(i%2?-.99:.99)+Math.sin(i*2.4)*.20;
    const z=onNorth?10.3+Math.sin(i*2.67)*1.35:-12+(i*2.19)%19;
    const size=.055+((i*7)%13)*.009;
    dummy.position.set(x,.095,z);dummy.rotation.set(0,(i*1.9)%3.14,0);
    dummy.scale.set(size,.025,size*1.5);dummy.updateMatrix();pebbles.setMatrixAt(i,dummy.matrix);
  }
  pebbles.instanceMatrix.needsUpdate=true;r.add(pebbles);
  return r;
}
function waterside(root){
  const g=grouping(root,'irrigation-ditch-and-reeds');
  // Narrow, repaired earthen bank separated from rice field hit meshes.
  for(let i=0;i<18;i++){
    const z=-16+i*1.62;
    const x=-19.0+(i%4)*.07;
    const tuft=grouping(g,'reed',x,z);
    for(let n=0;n<3;n++){
      const blade=box(tuft,.035,.45+(n%3)*.16,.043,n%2?0x86955d:0x698458,
        (n-1)*.10,.28+(n%3)*.05,0,{shadow:false});
      blade.rotation.z=(n-1)*.21;
    }
    if(i%3===0)cylinder(g,.13,.19,.19,0xa7a79a,-16.23,.11,z,7);
  }
  // A wooden sluice gate echoes the actual rice field irrigation action.
  const gate=grouping(g,'timber-irrigation-gate',-17.5,-3.2);
  for(const x of [-.48,.48])box(gate,.11,1.10,.10,0x74563c,x,.61,0);
  box(gate,1.13,.13,.12,0xa17a50,0,1.12,0);
  box(gate,.86,.44,.09,0x876644,0,.48,0);
  cylinder(gate,.05,.05,.4,0xb5a479,.0,1.30,0).rotation.z=Math.PI/2;
  // Stones on the far bank, leaving the existing wooden crossing untouched.
  for(let i=0;i<12;i++){
    let x=-20.1+Math.sin(i*7)*.23,z=-13+i*2.26;
    sphere(g,.15+(i%3)*.05,i%2?0xaaa69c:0x8e9f86,x,.14,z);
  }
  return g;
}
function marketCorner(root){
  const g=grouping(root,'farm-road-market-corner',8.5,14);
  const counter=grouping(g,'farm-produce-stand');
  box(counter,2.6,.18,.95,0x9a754e,0,.85,0);
  for(const x of [-1.05,1.05])box(counter,.13,1.9,.13,0x835f3e,x,1,0);
  box(counter,3,.08,1.55,palette.blue,0,1.98,0);
  box(counter,2.2,.43,.65,0xb99a67,0,.57,0);
  for(let j=0;j<6;j++){
    const x=-.85+(j%3)*.83,z=(j<3?-.22:.2);
    cylinder(counter,.25,.20,.14,j%2?0xa5855c:0xb59a68,x,1.02,z,8);
    for(let k=0;k<4;k++){
      sphere(counter,.10,j<3?0xb3753b:0x6e9949,x+(k-1.5)*.09,1.18,z);
    }
  }
  const cart=grouping(g,'produce-cart',3.6,0.2);
  box(cart,1.30,.35,.82,0x8b6a49,0,.62,0);
  for(const x of [-.45,.45])cylinder(cart,.26,.26,.16,0x4e544b,x,.36,.5,10).rotation.x=Math.PI/2;
  for(const x of [-.35,.35])box(cart,.07,.07,1.1,0x97764a,x,.73,-.83);
  return g;
}
function minorScenery(root){
  const g=grouping(root,'rural-edge-details');
  // Electric poles with crossbar; typical contemporary agricultural settlement.
  for(const [x,z] of [[3.2,16.0],[20.3,8.2],[-3.9,18.6]]){
    const pole=grouping(g,'utility-pole',x,z);
    cylinder(pole,.085,.13,4.1,0x9a9785,0,2.06,0,9);
    box(pole,1.05,.12,.13,0x696c68,0,3.86,0);
    for(const bx of [-.39,.39])cylinder(pole,.1,.10,.22,0xc8d2c8,bx,4.05,0,8);
  }
  // Untamed native-looking weeds at outer world edge; never over a field or the lane.
  const clusters=[[-21.6,-15],[-22,-7],[-21.5,5],[-21,19],[2,-21],
    [9,-20],[15,-19],[21,-16],[22,2],[21.6,17],[-7,20],[-13,19]];
  clusters.forEach(([x,z],i)=>{
    const tuft=grouping(g,'edge-grass',x,z);
    for(let n=0;n<5;n++){
      const blade=box(tuft,.10,.28+((i+n)%4)*.10,.08,n%3?palette.leaf:0x8b9c61,
        Math.sin(n*2.4)*.19,.18+((i+n)%4)*.04,Math.cos(n*2.4)*.16,{shadow:false});
      blade.rotation.z=(n-2)*.16;
    }
    if(i%3===0)sphere(tuft,.26,0x9a9d8a,.55,.18,.27);
  });
  return g;
}
function nameplate(root,label,x,z,rotation=0){
  const g=grouping(root,'wooden-village-sign',x,z,rotation);
  box(g,.11,1.11,.1,palette.timber,0,.55,0);
  box(g,1.62,.49,.09,0xe7d0a4,0,1.13,0);
  const canvas=document.createElement('canvas');canvas.width=384;canvas.height=128;
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,384,128);
  ctx.fillStyle='#365f46';ctx.textAlign='center';ctx.font='bold 52px sans-serif';
  ctx.fillText(label,192,82);
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(1.52,.43),new THREE.MeshBasicMaterial({
    map:tex,transparent:true,side:THREE.DoubleSide
  }));
  sign.position.set(0,1.13,.06);g.add(sign);
  // Held until teardown. Avoid throwing away texture before WebGL finishes.
  g.userData.labelTexture=tex;
  return g;
}
export function buildSolnaeriVillage(scene){
  const root=new THREE.Group();root.name='solnaeri-4-2-village';scene.add(root);
  const areas=[
    farmhouse(root),shed(root),yard(root),laneDetails(root),
    waterside(root),marketCorner(root),minorScenery(root)
  ];
  // Village directions that do not overlap clickable plots.
  nameplate(root,'솔내리',2.2,11.4);
  nameplate(root,'마을 장터',6.0,16.0);
  let meshCount=0,instanced=0,textured=0;
  root.traverse(item=>{
    if(item.isMesh){meshCount++;if(item.isInstancedMesh)instanced++;if(item.material?.map)textured++}
  });
  return {
    root,
    stats:{areas:areas.length,meshes:meshCount,instanced,signs:2,textured},
    dispose(){
      for(const child of root.children){
        child.traverse(item=>{if(item.userData?.labelTexture)item.userData.labelTexture.dispose()});
      }
      root.parent?.remove(root);
      // Cached materials are shared by all meshes; their single disposal is safe on teardown.
      root.traverse(item=>{if(item.isMesh)item.geometry?.dispose?.()});
      for(const item of matCache.values())item.dispose();
      root.clear();
    }
  };
}

// Kidscade Chibi v5.3 — 22 original procedural accessory silhouettes.
// These are skinned 3D meshes, not a recolored asset listing or flat sprites.
// All geometry is authored in the original Chibi GLB bind-pose coordinate space.
import * as THREE from '../assets/vendor/three-r160/three.module.js';

export const ACCESSORY_STYLES=[
  {id:'chibi_shoe_sneakers',label:'운동화',kind:'sneakers',category:'shoes',slot:'shoes',color:'#e5e9ef'},
  {id:'chibi_shoe_hightop',label:'하이탑',kind:'hightop',category:'shoes',slot:'shoes',color:'#d15651'},
  {id:'chibi_shoe_loafers',label:'로퍼',kind:'loafers',category:'shoes',slot:'shoes',color:'#514438'},
  {id:'chibi_shoe_boots',label:'발목 부츠',kind:'boots',category:'shoes',slot:'shoes',color:'#a17c56'},
  {id:'chibi_shoe_sandals',label:'샌들',kind:'sandals',category:'shoes',slot:'shoes',color:'#e0b58b'},
  {id:'chibi_shoe_slippers',label:'슬리퍼',kind:'slippers',category:'shoes',slot:'shoes',color:'#79b9ab'},
  {id:'chibi_hat_baseball',label:'야구모자',kind:'baseball',category:'accessory',slot:'hat',color:'#5975ba'},
  {id:'chibi_hat_bucket',label:'버킷햇',kind:'bucket',category:'accessory',slot:'hat',color:'#87a58f'},
  {id:'chibi_hat_beanie',label:'비니',kind:'beanie',category:'accessory',slot:'hat',color:'#da9b59'},
  {id:'chibi_hat_beret',label:'베레모',kind:'beret',category:'accessory',slot:'hat',color:'#a45369'},
  {id:'chibi_hat_straw',label:'밀짚모자',kind:'straw',category:'accessory',slot:'hat',color:'#dcbf75'},
  {id:'chibi_face_round',label:'둥근 안경',kind:'round',category:'accessory',slot:'face',color:'#485568'},
  {id:'chibi_face_square',label:'사각 안경',kind:'square',category:'accessory',slot:'face',color:'#293a52'},
  {id:'chibi_face_sunglasses',label:'선글라스',kind:'sunglasses',category:'accessory',slot:'face',color:'#252a37'},
  {id:'chibi_face_goggles',label:'고글',kind:'goggles',category:'accessory',slot:'face',color:'#5e9ea9'},
  {id:'chibi_face_mask',label:'마스크',kind:'mask',category:'accessory',slot:'face',color:'#d8ecf0'},
  {id:'chibi_bag_school',label:'책가방',kind:'schoolbag',category:'accessory',slot:'bag',color:'#6a8bca'},
  {id:'chibi_bag_crossbody',label:'크로스백',kind:'crossbody',category:'accessory',slot:'bag',color:'#b38556'},
  {id:'chibi_bag_mini',label:'미니 백팩',kind:'minibag',category:'accessory',slot:'bag',color:'#d899b8'},
  {id:'chibi_gear_headphones',label:'헤드폰',kind:'headphones',category:'accessory',slot:'hat',color:'#6253a9'},
  {id:'chibi_gear_watch',label:'손목시계',kind:'watch',category:'accessory',slot:'wrist',color:'#424e65'},
  {id:'chibi_gear_scarf',label:'목도리',kind:'scarf',category:'accessory',slot:'neck',color:'#b34e64'}
];

export const ACCESSORY_SLOTS={shoes:6,hat:6,face:5,bag:3,wrist:1,neck:1};
export const ACCESSORY_COUNT=22;

function box(w,h,d,x,y,z){
  const g=new THREE.BoxGeometry(w,h,d,6,4,4);
  g.translate(x,y,z);
  return g;
}
function sphere(x,y,z,sx,sy,sz,segments=16){
  const g=new THREE.SphereGeometry(1,segments,12);
  g.scale(sx,sy,sz);g.translate(x,y,z);return g;
}
function ring(radius,tube,x,y,z,axis='z'){
  const g=new THREE.TorusGeometry(radius,tube,8,28);
  if(axis==='y')g.rotateX(Math.PI/2);
  else if(axis==='x')g.rotateY(Math.PI/2);
  g.translate(x,y,z);return g;
}
function cyl(top,bottom,h,x,y,z){
  const g=new THREE.CylinderGeometry(top,bottom,h,20,4);
  g.translate(x,y,z);return g;
}
function buildGeometry(style,source,sourceHair,eyes){
  const kind=style.kind;
  if(style.slot==='shoes'){
    const geometry=source.geometry.clone();
    geometry.computeBoundingBox();
    const bb=geometry.boundingBox;
    const mid=bb.getCenter(new THREE.Vector3());
    const bottom=bb.min.y, height=bb.max.y-bottom;
    const attr=geometry.getAttribute('position');
    const adjustments={
      sneakers:[1.16,1.06,1.05],hightop:[1.12,1.22,1.09],
      loafers:[1.02,.87,1.08],boots:[1.22,1.35,1.12],
      sandals:[1.07,.70,1.08],slippers:[1.18,.57,1.12]
    };
    const [width,heightScale,depth]=adjustments[kind];
    for(let i=0;i<attr.count;i++){
      const x=attr.getX(i),y=attr.getY(i),z=attr.getZ(i);
      const lift=Math.max(0,Math.min(1,(y-bottom)/Math.max(height,.001)));
      // Original foot skinning retained. Larger cuff increases ankle profile;
      // toe area is a separate dimension from sole thickness.
      attr.setXYZ(i,x*width,bottom+(y-bottom)*heightScale,
        mid.z+(z-mid.z)*(depth+.09*(1-lift)));
    }
    attr.needsUpdate=true;geometry.computeVertexNormals();
    geometry.computeBoundingBox();geometry.computeBoundingSphere();
    return geometry;
  }
  sourceHair.geometry.computeBoundingBox();
  eyes.geometry.computeBoundingBox();
  const hb=sourceHair.geometry.boundingBox,eb=eyes.geometry.boundingBox;
  const scalpY=hb.max.y-.035;
  const hc=hb.getCenter(new THREE.Vector3());
  const headR=Math.max(.20,(hb.max.x-hb.min.x)*.48);
  const faceZ=eb.max.z+.020;
  const eyeY=(eb.min.y+eb.max.y)*.50;
  switch(kind){
    case 'baseball':return sphere(hc.x,scalpY,hc.z,headR*1.12,.102,headR*.95);
    case 'bucket':return cyl(headR*.98,headR*1.14,.18,hc.x,scalpY-.050,hc.z);
    case 'beanie':return sphere(hc.x,scalpY+.014,hc.z,headR*1.08,.163,headR*1.03);
    case 'beret':return sphere(hc.x-.030,scalpY+.080,hc.z,headR*1.30,.110,headR*1.02);
    case 'straw':return cyl(headR*.88,headR*.98,.145,hc.x,scalpY+.016,hc.z);
    case 'round':return ring(.071,.009,-.110,eyeY,faceZ);
    case 'square':return box(.150,.119,.012,-.110,eyeY,faceZ);
    case 'sunglasses':return sphere(-.110,eyeY,faceZ,.078,.055,.010);
    case 'goggles':return box(.365,.133,.055,0,eyeY,faceZ+.015);
    case 'mask':return sphere(0,eyeY-.131,faceZ-.014,.161,.113,.060);
    case 'schoolbag':return box(.335,.360,.172,0,.966,-.240);
    case 'crossbody':return box(.265,.210,.115,.224,.832,.150);
    case 'minibag':return sphere(0,.968,-.236,.145,.187,.110);
    case 'headphones':return ring(headR*1.10,.029,0,scalpY-.09,hc.z,'z');
    case 'watch':return box(.065,.035,.054,.366,.792,.015);
    case 'scarf':return ring(.157,.037,0,1.141,0,'y');
    default:throw Error('Unknown accessory geometry '+kind);
  }
}
function createDetails(style,context){
  const {source,sourceHair,eyes,add}=context;
  const kind=style.kind;
  const black='#304052',white='#f4f2eb',accent='#f5c96e';
  sourceHair.geometry.computeBoundingBox();eyes.geometry.computeBoundingBox();
  const hb=sourceHair.geometry.boundingBox,eb=eyes.geometry.boundingBox;
  const scalpY=hb.max.y-.035,hc=hb.getCenter(new THREE.Vector3());
  const headR=Math.max(.20,(hb.max.x-hb.min.x)*.48);
  const faceZ=eb.max.z+.020,eyeY=(eb.min.y+eb.max.y)*.50;
  if(style.slot==='shoes'){
    source.geometry.computeBoundingBox();
    const b=source.geometry.boundingBox;
    const toe=b.max.z+.014, soleY=b.min.y+.009;
    for(const sign of [-1,1]){
      const x=sign*.145;
      if(kind!=='sandals'&&kind!=='slippers')
        add(box(.128,.028,.268,x,soleY,toe-.111),black,'sole_'+sign,'shoe');
      if(kind==='sneakers'||kind==='hightop'){
        for(let i=0;i<3;i++)add(box(.091,.008,.009,x,b.min.y+.07+i*.018,toe-.050-i*.023),white,'lace_'+sign+'_'+i,'shoe');
      }else if(kind==='loafers')
        add(box(.14,.016,.013,x,b.min.y+.10,toe-.05),accent,'vamp_'+sign,'shoe');
      else if(kind==='boots')
        add(cyl(.089,.09,.142,x,b.min.y+.151,-.003),style.color,'shaft_'+sign,'shoe');
      else if(kind==='sandals'){
        add(box(.154,.024,.035,x,b.min.y+.050,toe-.065),style.color,'strapA_'+sign,'shoe');
        add(box(.143,.023,.038,x,b.min.y+.065,toe-.155),style.color,'strapB_'+sign,'shoe');
      }else if(kind==='slippers')
        add(sphere(x,b.min.y+.056,toe-.107,.092,.044,.129),style.color,'softUpper_'+sign,'shoe');
    }
  } else if(style.slot==='hat'){
    if(kind==='baseball'){
      add(sphere(0,scalpY-.072,hc.z+headR*.92,.183,.018,.097),style.color,'brim');
      add(box(.035,.048,.012,0,scalpY+.067,hc.z+headR*.96),white,'badge');
    }else if(kind==='bucket'){
      add(cyl(headR*1.25,headR*1.25,.025,0,scalpY-.155,hc.z),style.color,'brim');
      add(ring(headR*.98,.013,0,scalpY-.035,hc.z,'y'),black,'stitch');
    }else if(kind==='beanie'){
      add(ring(headR*.96,.030,0,scalpY-.089,hc.z,'y'),white,'cuff');
      add(sphere(0,scalpY+.174,hc.z,.052,.046,.052),style.color,'pom');
    }else if(kind==='beret'){
      add(ring(headR*.93,.014,0,scalpY-.014,hc.z,'y'),black,'edge');
      add(cyl(.018,.020,.048,-.03,scalpY+.171,hc.z),black,'stem');
    }else if(kind==='straw'){
      add(cyl(headR*1.55,headR*1.55,.022,0,scalpY-.052,hc.z),style.color,'brim');
      add(ring(headR*.95,.019,0,scalpY+.038,hc.z,'y'),'#9b7250','ribbon');
    }else if(kind==='headphones'){
      for(const sign of [-1,1])
        add(box(.057,.144,.108,sign*(headR*1.11),eyeY+.065,hc.z),'#2e344b','earCup_'+sign);
    }
  }else if(style.slot==='face'){
    if(['round','square','sunglasses','goggles'].includes(kind)){
      if(kind==='round'){
        add(ring(.071,.009,.110,eyeY,faceZ),style.color,'rightLens');
      }else if(kind==='square'){
        add(box(.150,.119,.012,.110,eyeY,faceZ),style.color,'rightLens');
        for(const sign of [-1,1])
          add(box(.144,.012,.021,sign*.110,eyeY+.061,faceZ),black,'topFrame_'+sign);
      }else if(kind==='sunglasses')
        add(sphere(.110,eyeY,faceZ,.078,.055,.010),style.color,'rightLens');
      else if(kind==='goggles')
        add(box(.327,.091,.017,0,eyeY,faceZ+.046),'#8bcdd7','glass');
      add(box(.076,.012,.019,0,eyeY+.008,faceZ),style.color,'bridge');
      for(const sign of [-1,1])
        add(box(.113,.014,.012,sign*.238,eyeY+.02,faceZ-.053),black,'temple_'+sign);
    }else if(kind==='mask'){
      add(box(.30,.010,.013,0,eyeY-.049,faceZ+.021),white,'noseBridge');
      for(const sign of [-1,1])
        add(ring(.058,.008,sign*.177,eyeY-.125,faceZ-.052,'x'),white,'earLoop_'+sign);
    }
  }else if(style.slot==='bag'){
    if(kind==='schoolbag'||kind==='minibag'){
      for(const sign of [-1,1])
        add(box(.043,.343,.042,sign*.110,.993,-.172),black,'strap_'+sign);
      add(box(kind==='schoolbag'?.24:.17,.096,.014,0,.976,-.336),white,'frontPocket');
    }else {
      // Crossbody strap follows the diagonal torso and carries an offset pouch.
      const g=box(.035,.51,.019,.032,1.065,.119);
      g.rotateZ(-.49);add(g,black,'strap');
      add(box(.177,.036,.016,.224,.872,.225),accent,'clasp');
    }
  }else if(kind==='watch'){
    add(ring(.054,.013,.366,.792,.015,'x'),black,'band');
    add(box(.038,.021,.012,.366,.792,.050),'#c3d7e9','face');
  }else if(kind==='scarf'){
    add(box(.081,.227,.041,.082,1.012,.167),style.color,'tail');
    add(box(.090,.039,.049,.082,.900,.167),accent,'fringe');
  }
}
export function createAccessoryPack({
  getNode,cloneSkinnedMeshWithGeometry,makeSolidMaterial,makeRigidSkinnedPiece
}){
  const body=getNode('character_low'),shoes=getNode('shoe');
  const hair=getNode('hairone'),eyes=getNode('eyes');
  if(!body?.isSkinnedMesh||!shoes?.isSkinnedMesh||!hair?.isSkinnedMesh||!eyes?.isSkinnedMesh)
    throw Error('Chibi v5.3 needs the original body, shoe, hair and eye skinned meshes');
  const made=[];
  const reference=body;
  const headBone=reference.skeleton.bones.find(b=>/head/i.test(b.name))?.name;
  const spineBone=reference.skeleton.bones.find(b=>/spine/i.test(b.name))?.name;
  if(!headBone||!spineBone)throw Error('Chibi v5.3 cannot find head/spine bones');
  const p=body.geometry.getAttribute('position'),
    indices=body.geometry.getAttribute('skinIndex'),
    weights=body.geometry.getAttribute('skinWeight');
  const shoeP=shoes.geometry.getAttribute('position'),
    shoeI=shoes.geometry.getAttribute('skinIndex'),
    shoeW=shoes.geometry.getAttribute('skinWeight');
  const nearestWeight=(geometry,shoeRegion=false)=>{
    const points=geometry.getAttribute('position'),src=shoeRegion?shoeP:p;
    const srcI=shoeRegion?shoeI:indices,srcW=shoeRegion?shoeW:weights;
    const outI=new Uint16Array(points.count*4),outW=new Float32Array(points.count*4);
    for(let i=0;i<points.count;i++){
      const x=points.getX(i),y=points.getY(i),z=points.getZ(i);
      let closest=0,distance=Infinity;
      for(let j=0;j<src.count;j++){
        const dx=x-src.getX(j),dy=y-src.getY(j),dz=z-src.getZ(j);
        const dist=dx*dx+dy*dy+dz*dz;
        if(dist<distance){closest=j;distance=dist;}
      }
      for(let k=0;k<4;k++){
        outI[i*4+k]=srcI.getComponent(closest,k);
        outW[i*4+k]=srcW.getComponent(closest,k);
      }
    }
    geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(outI,4));
    geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(outW,4));
  };
  for(const style of ACCESSORY_STYLES){
    if(getNode(style.id))continue;
    const group=new THREE.Group();
    group.name=style.id;
    group.userData={type:'chibi-v5.3-accessory',slot:style.slot,kind:style.kind,
      fit:'shared',category:style.category,assetVersion:'v5.3'};
    const template=style.slot==='shoes'?shoes:body;
    const rigid=style.slot==='hat'||style.slot==='face'||style.slot==='bag'||style.slot==='neck';
    const bone=style.slot==='hat'||style.slot==='face'?headBone:spineBone;
    const add=(geometry,color,id,region)=>{
      const material=makeSolidMaterial(color,style.label+' '+id);
      geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
      let mesh;
      if(rigid){
        mesh=makeRigidSkinnedPiece(template,geometry,bone,material,style.id+'_'+id);
      }else{
        nearestWeight(geometry,region==='shoe');
        mesh=cloneSkinnedMeshWithGeometry(template,geometry,material,style.id+'_'+id);
      }
      mesh.userData={type:'chibi-v5.3-geometry',piece:id,slot:style.slot};
      group.add(mesh);
    };
    const main=buildGeometry(style,template,hair,eyes);
    add(main,style.color,'shell',style.slot==='shoes'?'shoe':'body');
    createDetails(style,{source:template,sourceHair:hair,eyes,add});
    body.parent.add(group);
    group.visible=false;
    made.push(group);
  }
  if(made.length!==ACCESSORY_COUNT)throw Error('v5.3 accessory count mismatch: '+made.length);
  return made;
}

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

// In source Chibi bind-pose units. Rules are additive, reversible and distinct
// for the two body silhouettes; none mutate base GLB geometry.
export const ACCESSORY_FIT_RULES={
  shoes:{male:[0,-.007,0,1.035],female:[0,-.007,0,1.00]},
  hat:{male:[0,-.030,-.003,.975],female:[0,-.040,0,.985]},
  face:{male:[0,-.012,-.018,.985],female:[0,-.009,-.014,.980]},
  bag:{male:[0,-.014,.020,.940],female:[0,-.009,.025,.925]},
  neck:{male:[0,.025,-.015,1.015],female:[0,.020,-.008,.960]},
  wrist:{male:[-.018,-.019,0,.935],female:[-.014,-.014,0,.895]}
};
export const ACCESSORY_STYLE_FIT={
  chibi_shoe_boots:[0,-.011,0,1.045],
  chibi_shoe_hightop:[0,-.005,0,1.015],
  chibi_hat_straw:[0,-.019,0,.97],
  chibi_hat_bucket:[0,-.012,0,.98],
  chibi_hat_beret:[0,-.018,.012,.97],
  chibi_gear_headphones:[0,.034,.007,1.03],
  chibi_face_goggles:[0,.009,-.008,.99],
  chibi_face_mask:[0,-.023,-.012,.98],
  chibi_bag_school:[0,.006,-.026,.99],
  chibi_bag_mini:[0,.012,-.016,1.00],
  chibi_bag_crossbody:[-.016,.010,-.008,1.00],
  chibi_gear_scarf:[0,.007,-.013,.95]
};
export const ACCESSORY_CONFLICTS={
  headTop:['hat','headphones'],
  face:['round','square','sunglasses','goggles','mask'],
  bag:['schoolbag','crossbody','minibag'],
  shoes:['sneakers','hightop','loafers','boots','sandals','slippers']
};
const fitComponent=(value,component)=>value?.[component]??(component===3?1:0);

/** Applies bounded offsets to the accessory *group*, retaining bind matrices.
 *  The silhouette-specific table and optional clothing clearance are re-run
 *  after outfit, body or accessory changes (never cumulatively).
 */
export function applyAccessoryFit({getNode,fit='male',topName='',headwearName='',hairName=''}){
  const used=[];
  const puffy=/(hoodie|sweater|knit|bomber|varsity|jacket|cardigan)/i.test(topName);
  const elevatedCollar=/(hoodie|bomber|varsity|jacket|cardigan)/i.test(topName);
  for(const style of ACCESSORY_STYLES){
    const group=getNode(style.id);
    if(!group?.isGroup)continue;
    const baseline=ACCESSORY_FIT_RULES[style.slot]?.[fit]||[0,0,0,1];
    const local=ACCESSORY_STYLE_FIT[style.id]||[0,0,0,1];
    const x=fitComponent(baseline,0)+fitComponent(local,0);
    let y=fitComponent(baseline,1)+fitComponent(local,1);
    let z=fitComponent(baseline,2)+fitComponent(local,2);
    let scale=fitComponent(baseline,3)*fitComponent(local,3);
    if(style.slot==='bag'&&puffy)z-=.042;
    if(style.slot==='neck'&&elevatedCollar){y+=.026;scale*=1.07;}
    // Headphones are worn *over* the hair. They do not use hat flattening.
    if(style.kind==='headphones')y+=.016;
    // Keep the supplied dimensions bounded: procedural shapes should not
    // leap away from the body even when a bulky coat is selected.
    group.position.set(
      THREE.MathUtils.clamp(x,-.09,.09),
      THREE.MathUtils.clamp(y,-.11,.11),
      THREE.MathUtils.clamp(z,-.10,.10)
    );
    group.scale.setScalar(THREE.MathUtils.clamp(scale,.84,1.10));

    // A final bind-pose/world-bounds fit keeps hats from hovering above the
    // CURRENT hairstyle and shoes from dropping below the original sole.
    // This is recomputed from the baseline offsets (never accumulated).
    if(group.visible&&(style.slot==='hat'||style.slot==='shoes')){
      const reference=style.slot==='hat'
        ?getNode(hairName||'hairone')
        :getNode('shoe');
      if(reference){
        group.updateWorldMatrix(true,true);
        reference.updateWorldMatrix(true,true);
        const accessoryBox=new THREE.Box3().setFromObject(group,true);
        const referenceBox=new THREE.Box3().setFromObject(reference,true);
        if(!accessoryBox.isEmpty()&&!referenceBox.isEmpty()){
          const width=referenceBox.max.x-referenceBox.min.x;
          const hairHeight=referenceBox.max.y-referenceBox.min.y;
          // The hat's opening should sit *around* the head, roughly one
          // crown-radius below its top; aligning brim with hair top is why
          // the former hat floated like a plate above the character.
          const target=style.slot==='hat'
            ?referenceBox.max.y-Math.min(hairHeight*.32,width*.37)
            :referenceBox.min.y;
          const current=accessoryBox.min.y;
          const worldDelta=THREE.MathUtils.clamp(target-current,
            style.slot==='hat'?-.42:-.035,
            style.slot==='hat'?.14:.035);
          const parentScale=group.parent?.getWorldScale(new THREE.Vector3()).y||1;
          group.position.y=THREE.MathUtils.clamp(
            group.position.y+worldDelta/parentScale,-.50,.20);
          group.updateWorldMatrix(true,true);
        }
      }
    }
    group.userData.fitState={bodyFit:fit,topName,headwearName,
      offset:[group.position.x,group.position.y,group.position.z],
      scale:group.scale.x};
    if(group.visible)used.push({id:style.id,slot:style.slot,...group.userData.fitState});
  }
  return used;
}


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
/**
 * Open-bottom head-fitting hat shells. The old spheres/cylinders had flat
 * undersides that looked like UFOs resting on top of the hairstyle.
 * Profiles are in source rig coordinates and follow actual crown curvature.
 */
function sculptHat(kind,center,radius,scalpY){
  const rim=scalpY-.118;
  const rows={
    baseball:[[1.055,0],[1.075,.032],[1.08,.075],[.995,.145],[.84,.205],[.53,.251],[.18,.274],[0,.281]],
    bucket:[[1.08,0],[1.085,.037],[1.04,.105],[.97,.171],[.80,.217],[.44,.240],[0,.246]],
    beanie:[[1.015,0],[1.07,.031],[1.085,.095],[1.025,.171],[.82,.235],[.47,.280],[0,.300]],
    beret:[[.85,0],[.98,.034],[1.23,.092],[1.31,.148],[1.24,.197],[.98,.256],[.52,.285],[0,.294]],
    straw:[[.93,0],[.965,.038],[.953,.139],[.875,.219],[.60,.246],[0,.253]]
  }[kind];
  if(!rows)throw Error('Unknown hat shell profile '+kind);
  const g=new THREE.LatheGeometry(rows.map(([r,h])=>
    new THREE.Vector2(radius*r,rim+h)),28,0,Math.PI*2);
  g.translate(center.x,0,center.z);
  return g;
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
  const scalpY=hb.max.y-.145;
  const hc=hb.getCenter(new THREE.Vector3());
  const headR=Math.max(.20,(hb.max.x-hb.min.x)*.48);
  const faceZ=eb.max.z+.020;
  const eyeY=(eb.min.y+eb.max.y)*.50;
  switch(kind){
    case 'baseball':
    case 'bucket':
    case 'beanie':
    case 'beret':
    case 'straw':return sculptHat(kind,hc,headR,scalpY);
    case 'round':return ring(.071,.009,-.110,eyeY,faceZ);
    case 'square':return box(.150,.119,.012,-.110,eyeY,faceZ);
    case 'sunglasses':return sphere(-.110,eyeY,faceZ,.078,.055,.010);
    case 'goggles':return box(.365,.133,.055,0,eyeY,faceZ+.015);
    case 'mask':return sphere(0,eyeY-.131,faceZ-.014,.161,.113,.060);
    case 'schoolbag':return box(.335,.360,.172,0,.966,-.240);
    case 'crossbody':return box(.265,.210,.115,.224,.832,.150);
    case 'minibag':return sphere(0,.968,-.236,.145,.187,.110);
    case 'headphones':return ring(headR*1.01,.029,0,scalpY-.105,hc.z,'z');
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
  const scalpY=hb.max.y-.145,hc=hb.getCenter(new THREE.Vector3());
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
    const rimY=scalpY-.118;
    if(kind==='baseball'){
      // A front-projecting visor below the cap's curved opening.
      add(sphere(0,rimY+.004,hc.z+headR*.92,headR*.68,.017,headR*.52),
        style.color,'visor');
      add(ring(headR*1.055,.009,hc.x,rimY+.015,hc.z,'y'),black,'seam');
    }else if(kind==='bucket'){
      add(cyl(headR*1.27,headR*1.27,.024,hc.x,rimY-.012,hc.z),style.color,'brim');
      add(ring(headR*1.04,.012,hc.x,rimY+.074,hc.z,'y'),black,'stitch');
    }else if(kind==='beanie'){
      add(ring(headR*1.045,.026,hc.x,rimY+.027,hc.z,'y'),
        '#eee6de','knitBand');
      // A modest fabric seam replaces the old protruding spike/pom.
      add(ring(headR*.44,.006,hc.x,rimY+.266,hc.z,'y'),
        style.color,'crownStitch');
    }else if(kind==='beret'){
      // Narrow fitted band under a raised, rounded beret crown.
      add(ring(headR*.865,.020,hc.x,rimY+.012,hc.z,'y'),black,'headBand');
    }else if(kind==='straw'){
      add(cyl(headR*1.52,headR*1.52,.023,hc.x,rimY-.010,hc.z),
        style.color,'wideBrim');
      add(ring(headR*.945,.020,hc.x,rimY+.102,hc.z,'y'),
        '#9b7250','ribbon');
    }else if(kind==='headphones'){
      for(const sign of [-1,1])
        add(box(.057,.144,.108,sign*(headR*1.11),eyeY+.065,hc.z),
          '#2e344b','earCup_'+sign);
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
  getNode,cloneSkinnedMeshWithGeometry,makeSolidMaterial
}){
  const body=getNode('character_low'),shoes=getNode('shoe');
  const hair=getNode('hairone'),eyes=getNode('eyes');
  if(!body?.isSkinnedMesh||!shoes?.isSkinnedMesh||!hair?.isSkinnedMesh||!eyes?.isSkinnedMesh)
    throw Error('Chibi v5.3 needs the original body, shoe, hair and eye skinned meshes');
  const made=[];
  // Some Chibi versions sanitize or rename anatomical bones. Reuse the
  // original skinned body's closest bind-pose weights for every new piece;
  // this anchors hats to the head, bags to the torso and watches to the arm
  // without relying on developer-assumed bone names.
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
    const add=(geometry,color,id,region)=>{
      const material=makeSolidMaterial(color,style.label+' '+id);
      geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
      nearestWeight(geometry,region==='shoe');
      const mesh=cloneSkinnedMeshWithGeometry(template,geometry,material,style.id+'_'+id);
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

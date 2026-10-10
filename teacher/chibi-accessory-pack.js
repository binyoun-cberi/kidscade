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
  hat:{male:[0,-.025,-.003,.995],female:[0,-.027,0,.995]},
  face:{male:[0,-.014,.018,1.02],female:[0,-.012,.026,1.02]},
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
  chibi_face_mask:[0,-.012,-.007,1.00],
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
// v6.4: project every accessory vertex onto the FRONT of the actual head.
// An eyeball bounding-box Z is not a face surface: it caused the old mask to
// disappear behind cheeks and the sunglass lenses to intersect the eyes.
const facialSurfaceCache=new WeakMap();
function faceDepthAtGeometry(geometry){
  if(facialSurfaceCache.has(geometry))return facialSurfaceCache.get(geometry);
  const p=geometry.getAttribute('position'),idx=geometry.getIndex(),triangles=[];
  const count=idx?idx.count:p.count;
  for(let i=0;i+2<count;i+=3){
    const a=idx?idx.getX(i):i,b=idx?idx.getX(i+1):i+1,c=idx?idx.getX(i+2):i+2;
    const x0=p.getX(a),y0=p.getY(a),z0=p.getZ(a);
    const x1=p.getX(b),y1=p.getY(b),z1=p.getZ(b);
    const x2=p.getX(c),y2=p.getY(c),z2=p.getZ(c);
    const minx=Math.min(x0,x1,x2),maxx=Math.max(x0,x1,x2);
    const miny=Math.min(y0,y1,y2),maxy=Math.max(y0,y1,y2);
    if(maxy<1.22||miny>1.94||minx>.42||maxx<-.42)continue;
    const det=(y1-y2)*(x0-x2)+(x2-x1)*(y0-y2);
    if(Math.abs(det)<1e-10)continue;
    triangles.push({x0,y0,z0,x1,y1,z1,x2,y2,z2,minx,maxx,miny,maxy,inv:1/det});
  }
  const sampler=(x,y)=>{
    let front=-Infinity;
    for(const t of triangles){
      if(x<t.minx-1e-6||x>t.maxx+1e-6||y<t.miny-1e-6||y>t.maxy+1e-6)continue;
      const u=((t.y1-t.y2)*(x-t.x2)+(t.x2-t.x1)*(y-t.y2))*t.inv;
      const v=((t.y2-t.y0)*(x-t.x2)+(t.x0-t.x2)*(y-t.y2))*t.inv;
      if(u<-.00001||v<-.00001||u+v>1.00001)continue;
      front=Math.max(front,u*t.z0+v*t.z1+(1-u-v)*t.z2);
    }
    return front;
  };
  facialSurfaceCache.set(geometry,sampler);
  return sampler;
}
function fitCurvedFaceParts(group,body,eyes,fit){
  if(group.userData.curvedFaceFit===fit)return;
  if(!body?.isSkinnedMesh||!eyes?.isSkinnedMesh)return;
  const bodyDepth=faceDepthAtGeometry(body.geometry);
  const eyeDepth=faceDepthAtGeometry(eyes.geometry);
  const faceZ=(x,y,withEyes=false)=>{
    const skin=bodyDepth(x,y),iris=withEyes?eyeDepth(x,y):-Infinity;
    return Math.max(skin,iris);
  };
  group.traverse(node=>{
    if(!node.isSkinnedMesh)return;
    const spec=node.geometry.userData.kidscadeFaceProjection;
    if(!spec)return;
    const projected=node.geometry.clone();
    const attr=projected.getAttribute('position');
    if(spec==='strap'){
      const sign=node.name.endsWith('_-1')?-1:1;
      const pts=[
        [sign*.155,-.238],[sign*.203,-.255],[sign*.251,-.312],
        [sign*.214,-.361],[sign*.155,-.387]
      ].map(([x,dy],i)=>{
        const y=group.userData.faceEyeY+dy;
        const actual=faceZ(x,y);
        const baseline=Number.isFinite(actual)?actual:group.userData.faceFallbackZ;
        return new THREE.Vector3(x,y,baseline+(i===2?-.012:.016));
      });
      const loop=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),24,.006,6,false);
      loop.userData.kidscadeFaceProjection='strap';
      node.geometry=loop;
      projected.dispose();
      return;
    }
    for(let i=0;i<attr.count;i++){
      const x=attr.getX(i),y=attr.getY(i);
      const actual=faceZ(x,y,spec==='lens');
      const fallback=group.userData.faceFallbackZ;
      attr.setZ(i,(Number.isFinite(actual)?actual:fallback)+(spec==='lens'?.027:.018));
    }
    attr.needsUpdate=true;
    projected.userData.kidscadeFaceProjection=spec;
    projected.computeVertexNormals();projected.computeBoundingBox();projected.computeBoundingSphere();
    node.geometry=projected;
  });
  group.userData.curvedFaceFit=fit;
}

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
    if(style.kind==='mask'||style.kind==='sunglasses'){
      // Source-mesh projected vertices already contain the correct local XYZ.
      // The old generic 1.02 scale and Z/Y offsets broke exact registration.
      group.position.set(0,0,0);
      group.scale.setScalar(1);
      fitCurvedFaceParts(group,getNode(fit==='male'?'kidscade_male_body':'character_low'),
        getNode(fit==='male'?'kidscade_male_eyes':'eyes'),fit);
    }

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
          // The v5 cap anchored its BOTTOM to the hair crown: it pushed the
          // entire hat into the air. Anchor the cap TOP instead, keeping its
          // crown intersecting the hair while the brim sits over the forehead.
          const target=style.slot==='hat'
            ?referenceBox.max.y-.158
            :referenceBox.min.y;
          const current=style.slot==='hat'?accessoryBox.max.y:accessoryBox.min.y;
          const worldDelta=THREE.MathUtils.clamp(target-current,style.slot==='hat'?-.21:-.035,.10);
          const parentScale=group.parent?.getWorldScale(new THREE.Vector3()).y||1;
          group.position.y=THREE.MathUtils.clamp(
            group.position.y+worldDelta/parentScale,-.31,.13);
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
// Curved, single-sided face patch. The outer edges turn back toward the
// cheeks instead of projecting a whole ellipsoid out from the face.
function facePatch(cx,cy,frontZ,width,height,curve=.028,rows=10,columns=20){
  const positions=[],uvs=[],indices=[];
  for(let j=0;j<=rows;j++){
    const v=j/rows,ny=v*2-1;
    for(let i=0;i<=columns;i++){
      const u=i/columns,nx=u*2-1;
      const x=cx+nx*width*.5;
      const y=cy+ny*height*.5;
      // The nose/central lens edge projects slightly more than the cheeks.
      const z=frontZ-curve*nx*nx-.004*ny*ny;
      positions.push(x,y,z);uvs.push(u,v);
    }
  }
  for(let j=0;j<rows;j++)for(let i=0;i<columns;i++){
    const a=j*(columns+1)+i,b=a+columns+1;
    indices.push(a,a+1,b,b,a+1,b+1);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  g.setIndex(indices);g.userData.kidscadeFacePatch=true;
  g.computeVertexNormals();return g;
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
  const scalpY=hb.max.y-.145;
  const hc=hb.getCenter(new THREE.Vector3());
  const headR=Math.max(.20,(hb.max.x-hb.min.x)*.48);
  const faceZ=eb.max.z+.020;
  const eyeY=(eb.min.y+eb.max.y)*.50;
  switch(kind){
    case 'baseball':{
      // A real open-bottom cap dome, not the v5 flattened full ellipsoid.
      const crown=new THREE.SphereGeometry(1,24,14,0,Math.PI*2,0,Math.PI*.54);
      crown.scale(headR*1.04,.205,headR*1.02);
      crown.translate(hc.x,scalpY-.012,hc.z);
      return crown;
    }
    case 'bucket':return cyl(headR*.98,headR*1.14,.18,hc.x,scalpY-.050,hc.z);
    case 'beanie':return sphere(hc.x,scalpY+.014,hc.z,headR*1.08,.163,headR*1.03);
    case 'beret':return sphere(hc.x-.030,scalpY+.080,hc.z,headR*1.30,.110,headR*1.02);
    case 'straw':return cyl(headR*.88,headR*.98,.145,hc.x,scalpY+.016,hc.z);
    case 'round':return ring(.071,.009,-.110,eyeY,faceZ);
    case 'square':return box(.150,.119,.012,-.110,eyeY,faceZ);
    case 'sunglasses':return facePatch(-.110,eyeY,faceZ+.016,.205,.140,.027);
    case 'goggles':return box(.365,.133,.055,0,eyeY,faceZ+.015);
    case 'mask':return facePatch(0,eyeY-.305,faceZ+.009,.335,.205,.055,14,28);
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
    if(kind==='baseball'){
      // The spherical cap alone read as a floating blue plate. Add a
      // forehead-hugging fabric crown wall and a distinct forward bill.
      const capBand=new THREE.CylinderGeometry(headR*1.045,headR*1.07,.145,24,3,true);
      capBand.translate(0,scalpY-.088,hc.z);
      add(capBand,style.color,'crownWall');
      add(sphere(0,scalpY-.119,hc.z+headR*1.31,.202,.023,.139),style.color,'brim');
      // Omit the raised badge: it became a vertical spike above the cap in WALK/RUN.
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
        add(facePatch(.110,eyeY,faceZ+.016,.205,.140,.027),style.color,'rightLens');
      else if(kind==='goggles')
        add(box(.327,.091,.017,0,eyeY,faceZ+.046),'#8bcdd7','glass');
      add(facePatch(0,eyeY+.008,faceZ+.022,.055,.014,.006,2,8),style.color,'bridge');
      for(const sign of [-1,1])
        add(box(.113,.014,.012,sign*.238,eyeY+.02,faceZ-.004),black,'temple_'+sign);
    }else if(kind==='mask'){
      add(facePatch(0,eyeY-.225,faceZ+.014,.265,.014,.030,2,20),white,'noseBridge');
      for(const sign of [-1,1])
        add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
          new THREE.Vector3(sign*.155,eyeY-.238,faceZ+.015),
          new THREE.Vector3(sign*.23,eyeY-.30,faceZ-.025),
          new THREE.Vector3(sign*.155,eyeY-.387,faceZ+.015)
        ]),24,.006,6,false),white,'earLoop_'+sign);
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
  eyes.geometry.computeBoundingBox();
  const faceEyeY=(eyes.geometry.boundingBox.min.y+eyes.geometry.boundingBox.max.y)*.5;
  const faceFallbackZ=eyes.geometry.boundingBox.max.z+.04;
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
    if(style.kind==='mask'||style.kind==='sunglasses'){
      group.userData.faceEyeY=faceEyeY;
      group.userData.faceFallbackZ=faceFallbackZ;
    }
    const add=(geometry,color,id,region)=>{
      if((kind=>kind==='mask'||kind==='sunglasses')(style.kind)){
        if(geometry.userData.kidscadeFacePatch)
          geometry.userData.kidscadeFaceProjection=style.kind==='sunglasses'?'lens':'skin';
        if(id.startsWith('earLoop_'))geometry.userData.kidscadeFaceProjection='strap';
      }
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

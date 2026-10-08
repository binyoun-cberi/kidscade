// Kidscade Chibi v5.2: rig-preserving outfit shapes.
// Each style clones a source skinned mesh, reshapes its actual silhouette, and
// optionally adds correctly skinned 3D details. It never edits the source rig.
import * as THREE from '../assets/vendor/three-r160/three.module.js';

export const OUTFIT_LIBRARY={
  male:{
    top:['kidscade_male_tshirt','chibi_male_hoodie','chibi_male_bomber','chibi_male_varsity','chibi_male_oxford','chibi_male_sweater'],
    bottom:['kidscade_male_shorts','chibi_male_jeans','chibi_male_joggers','chibi_male_chinos']
  },
  female:{
    top:['shirt','kidscade_hoodie_blue','chibi_female_cardigan','chibi_female_blouse','chibi_female_knit','chibi_female_jacket'],
    bottom:['skirt','chibi_female_jeans','chibi_female_shorts','chibi_female_widepants']
  }
};

// Every identifier owns a different profile; fabric dye alone is not a style.
export const OUTFIT_STYLES=[
  {id:'chibi_male_hoodie',label:'박시 후드티',fit:'male',category:'top',base:'kidscade_male_tshirt',color:'#4879ce',
    shape:{chest:.09,shoulder:.12,hem:.16,sleeve:.16,depth:.12,drop:.035},details:['hood','pocket','rib','longSleeve']},
  {id:'chibi_male_bomber',label:'봄버 재킷',fit:'male',category:'top',base:'kidscade_male_tshirt',color:'#38614c',
    shape:{chest:.15,shoulder:.18,hem:-.035,sleeve:.21,depth:.16,drop:.015},details:['collar','zip','rib','longSleeve']},
  {id:'chibi_male_varsity',label:'바시티 재킷',fit:'male',category:'top',base:'kidscade_male_tshirt',color:'#a94450',
    shape:{chest:.16,shoulder:.22,hem:.015,sleeve:.24,depth:.14,drop:.020},details:['collar','buttons','stripes','longSleeve']},
  {id:'chibi_male_oxford',label:'옥스퍼드 셔츠',fit:'male',category:'top',base:'kidscade_male_tshirt',color:'#d2e9ef',
    shape:{chest:.055,shoulder:.04,hem:.055,sleeve:.025,depth:.05,drop:.046},details:['collar','buttons','longSleeve']},
  {id:'chibi_male_sweater',label:'니트 스웨터',fit:'male',category:'top',base:'kidscade_male_tshirt',color:'#c7a56d',
    shape:{chest:.13,shoulder:.10,hem:.115,sleeve:.12,depth:.135,drop:.015},details:['rib','collar','longSleeve']},
  {id:'chibi_female_cardigan',label:'롱 가디건',fit:'female',category:'top',base:'shirt',color:'#d29aab',
    shape:{chest:.09,shoulder:.07,hem:.21,sleeve:.12,depth:.12,drop:.083},details:['buttons','pocket','longSleeve']},
  {id:'chibi_female_blouse',label:'프릴 블라우스',fit:'female',category:'top',base:'shirt',color:'#f0e2d5',
    shape:{chest:.035,shoulder:.13,hem:.18,sleeve:.20,depth:.085,drop:.024},details:['collar','buttons','puffSleeve']},
  {id:'chibi_female_knit',label:'루즈 니트',fit:'female',category:'top',base:'shirt',color:'#d2bbde',
    shape:{chest:.15,shoulder:.105,hem:.15,sleeve:.18,depth:.15,drop:.020},details:['rib','collar','longSleeve']},
  {id:'chibi_female_jacket',label:'데님 재킷',fit:'female',category:'top',base:'shirt',color:'#5485a8',
    shape:{chest:.17,shoulder:.23,hem:.055,sleeve:.23,depth:.18,drop:.043},details:['collar','zip','pocket','longSleeve']},

  {id:'chibi_male_jeans',label:'스트레이트 청바지',fit:'male',category:'bottom',base:'kidscade_male_shorts',color:'#365d8a',
    shape:{hip:.13,thigh:.085,calf:.11,flare:.025,length:0},details:['waist']},
  {id:'chibi_male_joggers',label:'조거 팬츠',fit:'male',category:'bottom',base:'kidscade_male_shorts',color:'#4c596c',
    shape:{hip:.20,thigh:.20,calf:.16,flare:-.14,length:-.012},details:['waist','cuff']},
  {id:'chibi_male_chinos',label:'테이퍼드 치노',fit:'male',category:'bottom',base:'kidscade_male_shorts',color:'#bba987',
    shape:{hip:.11,thigh:.13,calf:.025,flare:-.08,length:0},details:['waist']},
  {id:'chibi_female_jeans',label:'슬림 청바지',fit:'female',category:'bottom',base:'ninjasuitshort',color:'#52739a',
    shape:{hip:.09,thigh:.075,calf:.065,flare:-.035,length:0},details:['waist']},
  {id:'chibi_female_shorts',label:'플레어 반바지',fit:'female',category:'bottom',base:'ninjasuitshort',color:'#bd8d65',
    shape:{hip:.125,thigh:.17,calf:0,flare:.19,length:0},details:['waist']},
  {id:'chibi_female_widepants',label:'와이드 팬츠',fit:'female',category:'bottom',base:'ninjasuitshort',color:'#8b807b',
    shape:{hip:.18,thigh:.22,calf:.27,flare:.23,length:0},details:['waist']}
]; // 9 new tops and 6 new bottoms; 20 total with the five existing styles.

const smooth=(a,b,v)=>{
  const t=THREE.MathUtils.clamp((v-a)/(b-a),0,1);
  return t*t*(3-2*t);
};
function remeshSource(source,style){
  const geometry=source.geometry.clone();
  const positions=geometry.getAttribute('position');
  const shape=style.shape;
  for(let i=0;i<positions.count;i++){
    let x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
    const ax=Math.abs(x);
    if(style.category==='top'){
      const torso=(1-smooth(.18,.39,ax))*smooth(.70,.84,y)*(1-smooth(1.24,1.37,y));
      const shoulder=smooth(.90,1.02,y)*(1-smooth(1.20,1.34,y));
      const hem=(1-smooth(.78,1.03,y))*smooth(.58,.72,y);
      const sleeves=smooth(.14,.25,ax)*(1-smooth(.45,.60,ax))*smooth(.79,.96,y);
      // The chest/hem volume and sleeve silhouette vary separately.
      x*=1+shape.chest*torso+shape.shoulder*shoulder+shape.hem*hem+shape.sleeve*sleeves;
      z*=1+shape.depth*(.56*torso+.30*shoulder+.14*hem)+shape.sleeve*.28*sleeves;
      y-=shape.drop*hem;
    }else{
      const waist=smooth(.62,.73,y)*(1-smooth(.80,.93,y));
      const thigh=smooth(.23,.37,y)*(1-smooth(.61,.77,y));
      const calf=smooth(.035,.11,y)*(1-smooth(.31,.47,y));
      const hem=1-smooth(.10,.33,y);
      const legBand=smooth(.045,.13,ax);
      const factor=1+shape.hip*waist+shape.thigh*thigh*legBand+
        shape.calf*calf*legBand+shape.flare*hem*legBand;
      const center=Math.sign(x)*.145;
      x=center+(x-center)*factor;
      z*=1+.06*shape.hip+.67*shape.thigh*thigh+.7*shape.calf*calf+
        .52*shape.flare*hem;
      y+=shape.length*(1-smooth(.08,.30,y));
    }
    positions.setXYZ(i,x,y,z);
  }
  positions.needsUpdate=true;
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function add3dDetails({THREE: _THREE, getNode,cloneSkinnedMeshWithGeometry,source,style,group,makeSolidMaterial,makeRigidSkinnedPiece,resolveFirstBoneName}){
  const spine=resolveFirstBoneName(source.skeleton,['DEF-spine.002','DEF-spine.003','DEF-spine.001','spine']);
  const pelvis=resolveFirstBoneName(source.skeleton,['DEF-spine','DEF-spine.001','spine']);
  const accent=makeSolidMaterial(style.color==='\x23f0e2d5'?'#ccb7ae':'#ecedf0',style.label+' 마감');
  const dark=makeSolidMaterial('#2d3442',style.label+' 디테일');
  const add=(geometry,material,id,bone=spine)=>{
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    group.add(makeRigidSkinnedPiece(source,geometry,bone,material,style.id+'_'+id));
  };
  const fitBody=getNode(style.fit==='male'?'kidscade_male_body':'character_low');
  const addMatchedSleeve=(geometry,id,sign)=>{
    if(!fitBody?.isSkinnedMesh)throw new Error('Sleeve skin reference body unavailable');
    const reference=fitBody.geometry;
    const refPos=reference.getAttribute('position');
    const refIndex=reference.getAttribute('skinIndex');
    const refWeight=reference.getAttribute('skinWeight');
    const p=geometry.getAttribute('position');
    const indices=new Uint16Array(p.count*4);
    const weights=new Float32Array(p.count*4);
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
      let nearest=-1,score=Infinity;
      for(let j=0;j<refPos.count;j++){
        const bx=refPos.getX(j),by=refPos.getY(j),bz=refPos.getZ(j);
        if(Math.sign(bx)!==sign||Math.abs(bx)<.135||by<.67||by>1.20)continue;
        const distance=(x-bx)**2+(y-by)**2*1.4+(z-bz)**2;
        if(distance<score){score=distance;nearest=j;}
      }
      if(nearest<0)throw new Error('No suitable original Chibi arm weights');
      for(let k=0;k<4;k++){
        indices[i*4+k]=refIndex.getComponent(nearest,k);
        weights[i*4+k]=refWeight.getComponent(nearest,k);
      }
    }
    geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));
    geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
    geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
    const mesh=cloneSkinnedMeshWithGeometry(
      source,geometry,makeSolidMaterial(style.color,style.label+' 연결 소매'),style.id+'_'+id
    );
    mesh.userData={type:'skinned-sleeve',sourceWeights:'nearest-fit-body-arm'};
    group.add(mesh);
  };
  if(style.details.includes('longSleeve')||style.details.includes('puffSleeve')){
    const puff=style.details.includes('puffSleeve');
    for(const sign of [-1,1]){
      const start=new THREE.Vector3(sign*.20,1.08,-.026);
      const elbow=new THREE.Vector3(sign*.30,.91,-.039);
      const cuff=new THREE.Vector3(sign*.345,.775,-.044);
      const makeTube=(from,to,rStart,rEnd)=>{
        const d=to.clone().sub(from);
        const geometry=new THREE.CylinderGeometry(rEnd,rStart,d.length(),12,3,false);
        geometry.applyMatrix4(new THREE.Matrix4().compose(
          from.clone().add(to).multiplyScalar(.5),
          new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize()),
          new THREE.Vector3(1,1,1)
        ));
        return geometry;
      };
      // Rounded shoulder insert closes the seam between the modified shirt
      // shoulder and the separately articulated extension in WALK/RUN.
      const shoulderCap=new THREE.SphereGeometry(puff?.110:.096,14,10);
      shoulderCap.scale(1.02,.90,.83);
      shoulderCap.translate(sign*.20,1.044,-.018);
      addMatchedSleeve(shoulderCap,sign<0?'shoulderCap_left':'shoulderCap_right',sign);
      const upper=makeTube(start,elbow,puff?.105:.086,puff?.086:.076);
      addMatchedSleeve(upper,sign<0?'upperSleeve_left':'upperSleeve_right',sign);
      if(!puff){
        const lower=makeTube(elbow,cuff,.081,.065);
        addMatchedSleeve(lower,sign<0?'forearmSleeve_left':'forearmSleeve_right',sign);
      }
    }
  }
  if(style.details.includes('hood')){
    const hood=new THREE.SphereGeometry(.185,16,10,0,Math.PI*2,0,Math.PI*.68);
    hood.scale(1.07,.70,.67);
    hood.translate(0,1.19,-.16);
    add(hood,makeSolidMaterial(style.color,style.label+' 후드'),'hood');
  }
  if(style.details.includes('collar')){
    const collar=new THREE.TorusGeometry(.083,.012,8,26);
    collar.rotateX(Math.PI/2);collar.scale(1.14,.76,1);
    collar.translate(0,1.122,.035);
    add(collar,accent,'collar');
  }
  if(style.details.includes('rib')){
    const rib=new THREE.TorusGeometry(.082,.014,8,24);
    rib.rotateX(Math.PI/2);rib.scale(1.06,.80,1);
    rib.translate(0,1.105,.04);
    add(rib,dark,'rib');
  }
  if(style.details.includes('pocket')){
    const pocket=new THREE.BoxGeometry(.20,.105,.015,4,2,1);
    pocket.translate(0,.835,.177);
    add(pocket,makeSolidMaterial(style.color,style.label+' 포켓'),'pocket');
  }
  if(style.details.includes('zip')){
    const zip=new THREE.BoxGeometry(.009,.27,.009);
    zip.translate(0,.96,.19);
    add(zip,accent,'zip');
  }
  if(style.details.includes('buttons')){
    for(let j=0;j<3;j++){
      const button=new THREE.SphereGeometry(.008,8,6);
      button.translate(0,1.04-j*.080,.181);
      add(button,accent,'button_'+j);
    }
  }
  if(style.details.includes('stripes')){
    for(const sign of [-1,1]){
      const stripe=new THREE.BoxGeometry(.012,.13,.009);
      stripe.translate(sign*.16,1.01,.143);
      add(stripe,accent,sign<0?'stripe_left':'stripe_right');
    }
  }
  if(style.details.includes('waist')){
    const band=new THREE.TorusGeometry(.208,.009,6,24);
    band.rotateX(Math.PI/2);band.scale(1,.70,1);
    band.translate(0,.74,0);
    add(band,dark,'waist',pelvis);
  }
  if(style.details.includes('cuff')){
    for(const sign of [-1,1]){
      const ring=new THREE.TorusGeometry(.074,.012,6,18);
      ring.rotateX(Math.PI/2);ring.translate(sign*.15,.13,0);
      add(ring,dark,sign<0?'cuff_left':'cuff_right',pelvis);
    }
  }
}

/** A real pair of articulated trouser legs, not an elongated skirt tube.
 * Each cylinder vertex blends source thigh and shin bones around the knee.
 * Both legs inherit the original Chibi 78-bone skeleton/bind matrix.
 */
const TWO_LEG_STYLES=new Set([
  'chibi_male_jeans','chibi_male_joggers','chibi_male_chinos',
  'chibi_female_jeans','chibi_female_widepants'
]);
function makeTrouserLegs({getNode,source,style,group,material,cloneSkinnedMeshWithGeometry}){
  const skeleton=source.skeleton;
  const reference=getNode(style.fit==='male'?'kidscade_male_body':'character_low');
  if(!reference?.isSkinnedMesh)throw new Error('Missing fit body for trouser skin transfer');
  const refPositions=reference.geometry.getAttribute('position');
  const refIndices=reference.geometry.getAttribute('skinIndex');
  const refWeights=reference.geometry.getAttribute('skinWeight');
  if(!refPositions||!refIndices||!refWeights)throw new Error('Chibi body missing reference skin weights');
  for(const side of ['left','right']){
    const sign=side==='left'?-1:1;
    // These indices resolve actual GLTFLoader-sanitized Chibi bones.
    const thigh=skeleton.bones.findIndex(bone=>bone.name==='DEF-thigh'+(side==='left'?'L':'R'));
    const shin=skeleton.bones.findIndex(bone=>bone.name==='DEF-shin'+(side==='left'?'L':'R'));
    if(thigh<0||shin<0)throw new Error('Missing articulated '+side+' leg bones for '+style.id);
    const wide=style.id==='chibi_female_widepants';
    const jogger=style.id==='chibi_male_joggers';
    const chino=style.id==='chibi_male_chinos';
    // Overlap the original shorts cuff at the upper thigh to prevent skin
    // wedges between the pelvis shell and the independent leg cylinders.
    const upperRadius=wide?.151:jogger?.154:chino?.145:.143;
    const lowerRadius=wide?.116:jogger?.075:chino?.076:.088;
    const top=.755,bottom=.082;
    const geometry=new THREE.CylinderGeometry(upperRadius,lowerRadius,top-bottom,16,9,false);
    geometry.translate(sign*(wide?.166:.153),(top+bottom)*.5,0);
    const positions=geometry.getAttribute('position');
    const indices=new Uint16Array(positions.count*4);
    const weights=new Float32Array(positions.count*4);
    // Match the nearest bind-pose body surface vertex. The original body
    // has blended pelvis, thigh, knee and shin weights which keep trouser
    // openings aligned with the shorts and eliminate exposed wedge seams.
    for(let i=0;i<positions.count;i++){
      const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
      let nearest=-1,best=Infinity;
      for(let j=0;j<refPositions.count;j++){
        const rx=refPositions.getX(j),ry=refPositions.getY(j),rz=refPositions.getZ(j);
        if(Math.sign(rx)!==sign&&Math.abs(rx)>.03)continue;
        const d=(x-rx)**2+(y-ry)**2*1.35+(z-rz)**2;
        if(d<best){best=d;nearest=j;}
      }
      if(nearest<0)throw new Error('Unable to resolve trouser skin reference');
      const offset=i*4;
      for(let k=0;k<4;k++){
        indices[offset+k]=refIndices.getComponent(nearest,k);
        weights[offset+k]=refWeights.getComponent(nearest,k);
      }
    }
    geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));
    geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const leg=cloneSkinnedMeshWithGeometry(source,geometry,material,style.id+'_leg_'+side);
    leg.userData={part:'trouser-leg',side,fit:style.fit,articulation:'nearest-body-surface-skin-weights',thighBone:thigh,shinBone:shin};
    group.add(leg);
  }
}

export function createOutfitPack({
  getNode,cloneSkinnedMeshWithGeometry,makeSolidMaterial,
  makeRigidSkinnedPiece,resolveFirstBoneName
}){
  const created=[];
  for(const style of OUTFIT_STYLES){
    if(getNode(style.id))continue;
    const source=getNode(style.base);
    if(!source?.isSkinnedMesh)throw Error('Missing rigged garment base '+style.base+' for '+style.id);
    const geometry=remeshSource(source,style);
    const material=makeSolidMaterial(style.color,style.label);
    const group=new THREE.Group();
    group.name=style.id;
    group.userData={
      type:'kidscade-rigged-garment',fit:style.fit,category:style.category,
      sourceMesh:style.base,geometryPolicy:'source-skinned-silhouette-v5.2',
      shapeProfile:{...style.shape},detailMeshes:[...style.details]
    };
    const shell=cloneSkinnedMeshWithGeometry(source,geometry,material,style.id+'_shell');
    group.add(shell);
    if(TWO_LEG_STYLES.has(style.id))makeTrouserLegs({getNode,source,style,group,material,cloneSkinnedMeshWithGeometry});
    add3dDetails({THREE,getNode,cloneSkinnedMeshWithGeometry,source,style,group,makeSolidMaterial,makeRigidSkinnedPiece,resolveFirstBoneName});
    source.parent.add(group);
    group.visible=false;
    created.push(group);
  }
  return created;
}

// Kidscade Chibi v5.2: rig-preserving outfit shapes.
// Each style clones a source skinned mesh, reshapes its actual silhouette, and
// optionally adds correctly skinned 3D details. It never edits the source rig.
import * as THREE from '../assets/vendor/three-r160/three.module.js';

export const OUTFIT_LIBRARY={
  male:{
    top:['kidscade_male_tshirt','chibi_male_hoodie','chibi_male_bomber','chibi_male_varsity','chibi_male_oxford','chibi_male_sweater','chibi_male_trackjacket','chibi_male_rugby','chibi_male_utilityvest'],
    bottom:['kidscade_male_shorts','chibi_male_jeans','chibi_male_joggers','chibi_male_chinos','chibi_male_cargo','chibi_male_trackpants']
  },
  female:{
    top:['shirt','kidscade_hoodie_blue','chibi_female_cardigan','chibi_female_blouse','chibi_female_knit','chibi_female_jacket','chibi_female_blazer','chibi_female_sailor','chibi_female_tunic'],
    bottom:['skirt','chibi_female_jeans','chibi_female_shorts','chibi_female_widepants','chibi_female_pleated','chibi_female_culottes']
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


  {id:'chibi_male_trackjacket',label:'운동 점퍼',fit:'male',category:'top',base:'kidscade_male_tshirt',color:'#268a81',shape:{chest:.135,shoulder:.18,hem:.03,sleeve:.24,depth:.13,drop:.012},details:['zip','stripes','rib','longSleeve']},
  {id:'chibi_male_rugby',label:'럭비 셔츠',fit:'male',category:'top',base:'kidscade_male_tshirt',color:'#e0b961',shape:{chest:.18,shoulder:.15,hem:.12,sleeve:.10,depth:.15,drop:.032},details:['collar','buttons','longSleeve']},
  {id:'chibi_male_utilityvest',label:'탐험 조끼',fit:'male',category:'top',base:'kidscade_male_tshirt',color:'#8c9363',shape:{chest:.13,shoulder:.12,hem:.17,sleeve:.01,depth:.14,drop:.06},details:['pocket','zip','collar']},
  {id:'chibi_female_blazer',label:'스쿨 블레이저',fit:'female',category:'top',base:'shirt',color:'#394b7a',shape:{chest:.14,shoulder:.17,hem:.19,sleeve:.16,depth:.14,drop:.048},details:['collar','buttons','pocket','longSleeve']},
  {id:'chibi_female_sailor',label:'세일러 블라우스',fit:'female',category:'top',base:'shirt',color:'#faf3de',shape:{chest:.075,shoulder:.12,hem:.12,sleeve:.11,depth:.075,drop:.031},details:['collar','stripes','longSleeve']},
  {id:'chibi_female_tunic',label:'롱 튜닉',fit:'female',category:'top',base:'shirt',color:'#b7a4da',shape:{chest:.12,shoulder:.045,hem:.32,sleeve:.06,depth:.13,drop:.095},details:['buttons','pocket','longSleeve']},
  {id:'chibi_male_cargo',label:'카고 팬츠',fit:'male',category:'bottom',base:'kidscade_male_shorts',color:'#66745d',shape:{hip:.18,thigh:.18,calf:.16,flare:.04,length:0},details:['waist','pocket']},
  {id:'chibi_male_trackpants',label:'트랙 팬츠',fit:'male',category:'bottom',base:'kidscade_male_shorts',color:'#34415c',shape:{hip:.16,thigh:.14,calf:.06,flare:-.06,length:0},details:['waist','stripes']},
  {id:'chibi_female_pleated',label:'플리츠 스커트',fit:'female',category:'bottom',base:'skirt',color:'#866594',shape:{hip:.09,thigh:.10,calf:0,flare:.13,length:-.015},details:['waist']},
  {id:'chibi_female_culottes',label:'큐롯 반바지',fit:'female',category:'bottom',base:'ninjasuitshort',color:'#c89b7b',shape:{hip:.17,thigh:.18,calf:0,flare:.22,length:0},details:['waist']},
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
/**
 * Chibi v5.5: prevent source-skinned fabric transforms from collapsing,
 * inverting or stretching individual source triangles.
 * Vertices are blended back towards their untouched bind-pose coordinates
 * when the authored silhouette would create unsafe local deformation.
 * Original skinIndex, skinWeight, UV and triangle indices are preserved.
 */
function stabilizeGarmentMesh(source,geometry){
  const origin=source.geometry.getAttribute('position');
  const target=geometry.getAttribute('position');
  const triangles=geometry.getIndex();
  if(!origin||!target||origin.count!==target.count)
    throw Error('Garment source and deformed mesh vertex counts mismatch');
  const maxDrift=.062;
  let driftLimited=0,unsafeTriangles=0;
  const original=new Float32Array(origin.array.length);
  original.set(origin.array);
  const blend=new Float32Array(target.count);
  blend.fill(1);
  // Distance clamp prevents lone protruding hem or shoulder vertices.
  for(let i=0;i<target.count;i++){
    const dx=target.getX(i)-origin.getX(i);
    const dy=target.getY(i)-origin.getY(i);
    const dz=target.getZ(i)-origin.getZ(i);
    const dist=Math.hypot(dx,dy,dz);
    if(dist>maxDrift){
      blend[i]=maxDrift/dist;
      driftLimited++;
    }
  }
  const ax=new THREE.Vector3(),bx=new THREE.Vector3(),cx=new THREE.Vector3();
  const ap=new THREE.Vector3(),bp=new THREE.Vector3(),cp=new THREE.Vector3();
  const edge1=new THREE.Vector3(),edge2=new THREE.Vector3();
  const normalOrig=new THREE.Vector3(),normalChanged=new THREE.Vector3();
  const trianglesCount=triangles?Math.floor(triangles.count/3):Math.floor(target.count/3);
  const getIndex=(t,k)=>triangles?triangles.getX(t*3+k):t*3+k;
  const getBlended=(index,out)=>{
    const t=blend[index];
    out.set(
      origin.getX(index)+(target.getX(index)-origin.getX(index))*t,
      origin.getY(index)+(target.getY(index)-origin.getY(index))*t,
      origin.getZ(index)+(target.getZ(index)-origin.getZ(index))*t);
    return out;
  };
  let recoveryPasses=0;
  for(let pass=0;pass<12;pass++){
    let changed=false;
    for(let t=0;t<trianglesCount;t++){
      const a=getIndex(t,0),b=getIndex(t,1),c=getIndex(t,2);
      ax.fromBufferAttribute(origin,a);bx.fromBufferAttribute(origin,b);
      cx.fromBufferAttribute(origin,c);
      normalOrig.copy(edge1.subVectors(bx,ax))
        .cross(edge2.subVectors(cx,ax));
      const originalArea=normalOrig.length();
      if(originalArea<1e-10)continue;
      getBlended(a,ap);getBlended(b,bp);getBlended(c,cp);
      normalChanged.copy(edge1.subVectors(bp,ap))
        .cross(edge2.subVectors(cp,ap));
      const changedArea=normalChanged.length();
      const dot=normalOrig.dot(normalChanged);
      // Preserve winding and avoid highly narrowed or overstretched faces.
      const invalid=dot<=0||changedArea<originalArea*.42||
        changedArea>originalArea*2.4;
      if(!invalid)continue;
      unsafeTriangles++;
      for(const i of [a,b,c]){
        // Back off invalid triangle deformation; eventually restore source
        // vertices if they cannot maintain a stable surface.
        const next=pass<8?blend[i]*.60:0;
        if(next<blend[i]){blend[i]=next;changed=true;}
      }
    }
    if(!changed)break;
    recoveryPasses++;
  }
  // Final audit is on the *resulting* mesh, not the number of issues seen
  // mid-iteration. Fail closed rather than exporting inverted or collapsed
  // fabric triangles that can look like exploded polygons in WebGL.
  let residualUnsafeTriangles=0;
  for(let t=0;t<trianglesCount;t++){
    const a=getIndex(t,0),b=getIndex(t,1),c=getIndex(t,2);
    ax.fromBufferAttribute(origin,a);bx.fromBufferAttribute(origin,b);
    cx.fromBufferAttribute(origin,c);
    normalOrig.copy(edge1.subVectors(bx,ax)).cross(edge2.subVectors(cx,ax));
    const originalArea=normalOrig.length();
    if(originalArea<1e-10)continue;
    getBlended(a,ap);getBlended(b,bp);getBlended(c,cp);
    normalChanged.copy(edge1.subVectors(bp,ap)).cross(edge2.subVectors(cp,ap));
    const area=normalChanged.length();
    if(normalOrig.dot(normalChanged)<=0||area<originalArea*.42||area>originalArea*2.4)
      residualUnsafeTriangles++;
  }
  if(residualUnsafeTriangles)throw Error(
    'Unsafe garment mesh after recovery: '+residualUnsafeTriangles+' triangles'
  );
  let changedVertices=0;
  for(let i=0;i<target.count;i++){
    if(blend[i]>=.99999)continue;
    const p=getBlended(i,ap);
    target.setXYZ(i,p.x,p.y,p.z);changedVertices++;
  }
  target.needsUpdate=true;
  geometry.userData={
    ...geometry.userData,
    meshSafety:'bounded-deformation-with-local-triangle-winding-and-area-v5.5',
    driftLimited,unsafeTriangles,changedVertices,maxDrift,
    recoveryPasses,residualUnsafeTriangles
  };
  return geometry.userData;
}


// Smooth each procedural sleeve/trouser surface against multiple nearby body
// vertices instead of copying one skin-weight tuple. Abrupt nearest-neighbor
// jumps at elbows and knees previously left visible cracks while walking.
function transferSmoothSkinWeights(geometry,reference,{sign,region}){
  const refPos=reference?.geometry?.getAttribute('position');
  const refIndex=reference?.geometry?.getAttribute('skinIndex');
  const refWeight=reference?.geometry?.getAttribute('skinWeight');
  const pos=geometry.getAttribute('position');
  if(!refPos||!refIndex||!refWeight||!pos)throw Error('Missing body skin reference for '+region);
  const candidates=[];
  for(let j=0;j<refPos.count;j++){
    const x=refPos.getX(j),y=refPos.getY(j),z=refPos.getZ(j);
    if(region==='arm'){
      if(Math.sign(x)!==sign||Math.abs(x)<.135||y<.55||y>1.24)continue;
    }else if(region==='pelvis'){
      if(y<.38||y>.95)continue;
    }else if(Math.sign(x)!==sign&&Math.abs(x)>.03)continue;
    candidates.push({j,x,y,z});
  }
  if(candidates.length<4)throw Error('Insufficient '+region+' skin reference vertices');
  const indices=new Uint16Array(pos.count*4);
  const weights=new Float32Array(pos.count*4);
  let fallbackCount=0;
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
    const nearest=[];
    for(const item of candidates){
      const d=(x-item.x)**2+(y-item.y)**2*1.4+(z-item.z)**2;
      if(nearest.length===4&&d>=nearest[3].d)continue;
      let k=0;
      while(k<nearest.length&&nearest[k].d<d)k++;
      nearest.splice(k,0,{j:item.j,d});
      if(nearest.length>4)nearest.pop();
    }
    const influence=new Map();
    let total=0;
    for(const {j,d} of nearest){
      // A small epsilon prevents a single coincident vertex from completely
      // overriding its neighbors and helps interpolation across UV seams.
      const strength=1/(d+.0004);
      for(let k=0;k<4;k++){
        const w=refWeight.getComponent(j,k)*strength;
        if(!(w>0))continue;
        const bone=refIndex.getComponent(j,k);
        influence.set(bone,(influence.get(bone)||0)+w);
        total+=w;
      }
    }
    if(!(total>0))throw Error('Unweighted '+region+' garment vertex '+i);
    const sorted=[...influence].sort((a,b)=>b[1]-a[1]).slice(0,4);
    const sum=sorted.reduce((acc,p)=>acc+p[1],0);
    if(!(sum>0))throw Error('Invalid '+region+' garment skin distribution');
    if(nearest[0].d>.09)fallbackCount++;
    for(let k=0;k<sorted.length;k++){
      indices[i*4+k]=sorted[k][0];
      weights[i*4+k]=sorted[k][1]/sum;
    }
  }
  geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));
  geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
  geometry.userData={...geometry.userData,skinTransfer:{
    method:'four-neighbor-smooth-body-weights-v5.8',region,neighbors:4,
    vertices:pos.count,distantSamples:fallbackCount
  }};
  return geometry.userData.skinTransfer;
}


// Skin long sleeves to their actual upper-arm and forearm bones. Sampling
// nearby torso vertices bent the cuffs into large detached fabric spikes.
// Extract *real* skinned arm triangles from the fitted Chibi body. Arbitrary
// procedural cylinders split from the shoulder in WALK, even with plausible
// arm-bone weights, because their assumed bind coordinates were not the
// source GLB's own arm surface.
function buildSkinConformingSleeve(body,sign,puff){
  const original=body.geometry;
  const positions=original.getAttribute('position');
  if(!original.getAttribute('normal'))original.computeVertexNormals();
  const normals=original.getAttribute('normal');
  const uv=original.getAttribute('uv');
  const skinIndex=original.getAttribute('skinIndex');
  const skinWeight=original.getAttribute('skinWeight');
  const index=original.getIndex();
  const side=sign>0?'L':'R';
  // Numbered twist bones (DEF-forearmR001 etc.) control the source forearm.
  // A strict endsWith(side) test selected only the shoulder/upper arm.
  const sideVariant=new RegExp(side+'[0-9]*$');
  const armBones=new Set(body.skeleton.bones.map((bone,i)=>({
    name:bone.name.replace(/[._]/g,'').toUpperCase(),i
  })).filter(item=>sideVariant.test(item.name)&&
    /UPPERARM|FOREARM|LOWERARM/.test(item.name)).map(item=>item.i));
  if(!positions||!skinIndex||!skinWeight||!index||armBones.size<2)
    throw Error('Cannot extract the '+side+' source skinned arm');
  const allow=i=>{
    const x=positions.getX(i),y=positions.getY(i);
    // Puffy blouse sleeves stop above the elbow; jackets keep their
    // full forearm-length sleeves. These two cuts must not look identical.
    const sleeveHem=puff?.945:.50;
    if(x*sign<.115||y<sleeveHem||y>1.18)return false;
    let armWeight=0;
    for(let k=0;k<4;k++){
      if(armBones.has(skinIndex.getComponent(i,k)))
        armWeight+=skinWeight.getComponent(i,k);
    }
    // Forearm vertices near the wrist blend into the hand. Keeping only
    // vertices with >42% arm influence cut the sleeve off at the elbow.
    return armWeight>.16;
  };
  // Inspect source arm skinning by vertical slice. Lower arms in the CC0
  // GLB may have different bone ownership from the visible upper-arm shell.
  const sourceBands=[
    {min:.40,max:.60,count:0,arm:0,hand:0,top:new Map()},
    {min:.60,max:.75,count:0,arm:0,hand:0,top:new Map()},
    {min:.75,max:.90,count:0,arm:0,hand:0,top:new Map()},
    {min:.90,max:1.05,count:0,arm:0,hand:0,top:new Map()},
    {min:1.05,max:1.20,count:0,arm:0,hand:0,top:new Map()}
  ];
  for(let i=0;i<positions.count;i++){
    const x=positions.getX(i),y=positions.getY(i);
    if(x*sign<.115)continue;
    const band=sourceBands.find(row=>y>=row.min&&y<row.max);
    if(!band)continue;
    band.count++;
    for(let k=0;k<4;k++){
      const w=skinWeight.getComponent(i,k),bi=skinIndex.getComponent(i,k);
      if(!w)continue;
      const bone=body.skeleton.bones[bi]?.name||'unknown';
      band.top.set(bone,(band.top.get(bone)||0)+w);
      if(armBones.has(bi))band.arm+=w;
      if(/hand/i.test(bone))band.hand+=w;
    }
  }
  const sourceBandReport=sourceBands.map(({min,max,count,arm,hand,top})=>({
    range:[min,max],count,arm:Number(arm.toFixed(2)),hand:Number(hand.toFixed(2)),
    dominant:[...top].sort((a,b)=>b[1]-a[1]).slice(0,5)
      .map(([name,weight])=>[name,Number(weight.toFixed(2))])
  }));
  const verts=[],uvs=[],bones=[],weights=[];
  let triangles=0,minY=Infinity,maxY=-Infinity;
  const verticalBands=[0,0,0,0];
  const add=i=>{
    const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
    minY=Math.min(minY,y);maxY=Math.max(maxY,y);
    verticalBands[y<.6?0:y<.75?1:y<.95?2:3]++;
    // Offset along the body's own outward normal, not the guessed world X/Z
    // directions. The original 0.011 allowance z-fought with the visible skin.
    const coverage=smooth(.50,.61,y)*(1-smooth(1.105,1.18,y));
    const allowance=(puff?.058:.026)*coverage;
    verts.push(x+normals.getX(i)*allowance,
      y+normals.getY(i)*allowance,
      z+normals.getZ(i)*allowance);
    uvs.push(uv?.getX(i)||0,uv?.getY(i)||0);
    for(let k=0;k<4;k++){
      bones.push(skinIndex.getComponent(i,k));
      weights.push(skinWeight.getComponent(i,k));
    }
  };
  for(let n=0;n<index.count;n+=3){
    const i=index.getX(n),j=index.getX(n+1),k=index.getX(n+2);
    if(!allow(i)||!allow(j)||!allow(k))continue;
    add(i);add(j);add(k);
    triangles++;
  }
  if(triangles<12)throw Error('No sufficiently connected '+side+' arm skin triangles: '+triangles);
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(bones,4));
  geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();geometry.computeBoundingSphere();
  geometry.userData={skinTransfer:{
    method:'source-body-arm-skin-v5.9',region:'arm',neighbors:4,
    vertices:verts.length/3,triangles,minY,maxY,verticalBands,sourceBandReport
  }};
  return geometry;
}
function bindYokeToPelvis(geometry,skeleton){
  const pelvis=skeleton.bones.findIndex(bone=>bone.name==='DEF-spine');
  if(pelvis<0)throw Error('Missing pelvis spine bone for trouser yoke');
  const n=geometry.getAttribute('position').count;
  const indices=new Uint16Array(n*4),weights=new Float32Array(n*4);
  for(let i=0;i<n;i++){indices[i*4]=pelvis;weights[i*4]=1;}
  geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));
  geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
  geometry.userData={...geometry.userData,skinTransfer:{
    method:'pelvis-anchored-yoke-v5.9',region:'pelvis',neighbors:1,vertices:n,
    bone:skeleton.bones[pelvis].name
  }};
  return geometry.userData.skinTransfer;
}

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
  stabilizeGarmentMesh(source,geometry);
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
  if(style.details.includes('longSleeve')||style.details.includes('puffSleeve')){
    if(!fitBody?.isSkinnedMesh)throw Error('Missing fitted Chibi body for sleeves');
    const puff=style.details.includes('puffSleeve');
    for(const sign of [-1,1]){
      const sleeve=buildSkinConformingSleeve(fitBody,sign,puff);
      const name=style.id+'_continuousSleeve_'+(sign<0?'left':'right');
      const mesh=cloneSkinnedMeshWithGeometry(source,sleeve,
        makeSolidMaterial(style.color,style.label+' 바디밀착 소매'),name);
      mesh.userData={part:'source-arm-sleeve',sourceWeights:'native-fitted-body-skin',
        skinTransfer:sleeve.userData.skinTransfer};
      group.add(mesh);
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
    if(style.category==='bottom'){
      // Cargo flapped pockets belong on moving thighs, never on the chest.
      for(const sign of [-1,1]){
        const thigh=resolveFirstBoneName(source.skeleton,[
          sign<0?'DEF-thighL':'DEF-thighR',
          sign<0?'DEF-thigh.L':'DEF-thigh.R'
        ]);
        const cargo=new THREE.BoxGeometry(.088,.094,.023,3,2,1);
        cargo.translate(sign*.173,.495,.139);
        add(cargo,makeSolidMaterial(style.color,style.label+' 카고 포켓'),
          sign<0?'cargo_left':'cargo_right',thigh);
        const flap=new THREE.BoxGeometry(.092,.021,.027);
        flap.translate(sign*.173,.55,.147);
        add(flap,dark,sign<0?'cargo_flap_left':'cargo_flap_right',thigh);
      }
    }else{
      const pocket=new THREE.BoxGeometry(.20,.105,.015,4,2,1);
      pocket.translate(0,.835,.151);
      add(pocket,makeSolidMaterial(style.color,style.label+' 포켓'),'pocket');
    }
  }
  if(style.details.includes('zip')){
    // The old rigid, bright .27m zipper floated in front of the moving
    // jacket in profile view. A very shallow dark seam stays visually sewn in.
    const zip=new THREE.BoxGeometry(.005,.20,.002);
    zip.translate(0,.985,.105);
    add(zip,dark,'zip');
  }
  if(style.details.includes('buttons')){
    for(let j=0;j<3;j++){
      const button=new THREE.SphereGeometry(.008,8,6);
      button.translate(0,1.04-j*.080,.151);
      add(button,accent,'button_'+j);
    }
  }
  if(style.details.includes('stripes')){
    for(const sign of [-1,1]){
      if(style.category==='bottom'){
        // Body-space straight stripe boxes floated beside animated legs.
        // makeTrouserLegs now generates a strip following each weighted leg.
        continue;
      }else{
        const stripe=new THREE.BoxGeometry(.012,.13,.009);
        stripe.translate(sign*.16,1.01,.143);
        add(stripe,accent,sign<0?'stripe_left':'stripe_right');
      }
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
      // Cuffs must follow the lower leg, not the pelvis during WALK/RUN.
      const shin=resolveFirstBoneName(source.skeleton,[
        sign<0?'DEF-shinL':'DEF-shinR',
        sign<0?'DEF-shin.L':'DEF-shin.R'
      ]);
      add(ring,dark,sign<0?'cuff_left':'cuff_right',shin);
    }
  }
  // v6.1 identity details. Each model needs a readable silhouette,
  // not another label on exactly the same monochrome jersey.
  if(style.id==='chibi_male_rugby'){
    const navy=makeSolidMaterial('#354962','럭비 셔츠 가로줄');
    for(const y of [.965,1.052]){
      const band=new THREE.BoxGeometry(.320,.047,.009,2,1,1);
      band.translate(0,y,.153);
      add(band,navy,'rugby_band_'+Math.round(y*1000));
    }
  }
  if(style.id==='chibi_male_utilityvest'){
    const seam=makeSolidMaterial('#404b37','탐험 조끼 포켓');
    for(const sign of [-1,1]){
      const pocket=new THREE.BoxGeometry(.112,.103,.023,2,2,1);
      pocket.translate(sign*.113,.922,.167);
      add(pocket,seam,'utility_pocket_'+sign);
      const flap=new THREE.BoxGeometry(.116,.025,.025);
      flap.translate(sign*.113,.976,.182);
      add(flap,accent,'utility_flap_'+sign);
    }
  }
  if(style.id==='chibi_female_blazer'){
    const lapelMat=makeSolidMaterial('#a6b4d0','블레이저 라펠');
    for(const sign of [-1,1]){
      const lapel=new THREE.BoxGeometry(.048,.151,.010);
      lapel.rotateZ(sign*.27);
      lapel.translate(sign*.079,1.038,.167);
      add(lapel,lapelMat,'blazer_lapel_'+sign);
    }
  }
  if(style.id==='chibi_female_sailor'){
    const blue=makeSolidMaterial('#324b79','세일러 칼라');
    const red=makeSolidMaterial('#cb5266','세일러 리본');
    for(const sign of [-1,1]){
      const panel=new THREE.BoxGeometry(.069,.135,.016);
      panel.rotateZ(sign*.53);
      panel.translate(sign*.057,1.077,.156);
      add(panel,blue,'sailor_v_collar_'+sign);
    }
    const ribbon=new THREE.BoxGeometry(.025,.095,.012);
    ribbon.translate(0,.990,.177);
    add(ribbon,red,'sailor_necktie');
    // Smooth lower shirt edge: the original source hem deformed into
    // long sawtooth-shaped triangles in front-view screenshots.
    const hem=new THREE.CylinderGeometry(.168,.198,.076,24,2,true);
    hem.scale(1,1,.77);hem.translate(0,.812,0);
    add(hem,makeSolidMaterial(style.color,'세일러 셔츠 부드러운 밑단'),'sailor_smooth_hem',pelvis);
  }
  if(style.id==='chibi_female_tunic'){
    const hem=new THREE.CylinderGeometry(.169,.246,.20,26,5,true);
    hem.scale(1,1,.80);hem.translate(0,.753,0);
    add(hem,makeSolidMaterial(style.color,'롱 튜닉 하단'),'tunic_long_hem',pelvis);
  }
  if(style.id==='chibi_female_pleated'){
    const fold=makeSolidMaterial('#715480','플리츠 주름');
    for(let i=-3;i<=3;i++){
      const pleat=new THREE.BoxGeometry(.012,.177,.009);
      pleat.translate(i*.060,.583,.166+Math.abs(i)*-.003);
      add(pleat,fold,'skirt_pleat_'+i,pelvis);
    }
  }
  if(style.id==='chibi_female_culottes'){
    const seam=new THREE.BoxGeometry(.012,.095,.012);
    seam.translate(0,.619,.179);
    add(seam,dark,'culottes_leg_split',pelvis);
  }
}


// The original shorts shell and separate trouser legs left an open triangle
// of skin at the pelvis. This short, weighted waist-to-crotch yoke covers it
// without joining the trouser legs all the way down like a skirt.
function addTrouserHipYoke({source,style,group,material,reference,cloneSkinnedMeshWithGeometry}){
  const top=.79,bottom=.365;
  // Men use a slightly narrower fitted pelvic yoke. Keep the bridge wide
  // enough to hide the upper-thigh seam, but not a skirt-like belt.
  const male=style.fit==='male';
  const geometry=new THREE.CylinderGeometry(
    male?.216:.227,male?.193:.201,top-bottom,24,7,true);
  geometry.scale(1,1,.82);
  geometry.translate(0,(top+bottom)*.5,.003);
  const p=geometry.getAttribute('position');
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    const lower=smooth(.365,.59,y);
    // Push just the front-center crotch panel outward enough to cover the
    // remaining narrow exposed skin wedge; keep the side silhouette slender.
    const frontCenter=z>0?
      (1-smooth(.035,.16,Math.abs(x)))*(1-smooth(.54,.72,y)):0;
    p.setXYZ(i,x*(1-.03*(1-lower)),y,
      z*(z>0?1.06:1.03)+.035*frontCenter);
  }
  p.needsUpdate=true;
  bindYokeToPelvis(geometry,source.skeleton);
  geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
  const yoke=cloneSkinnedMeshWithGeometry(source,geometry,material,style.id+'_hip_yoke');
  yoke.userData={part:'trouser-hip-yoke',fit:style.fit,
    coverage:'waist-to-crotch-only',skinTransfer:geometry.userData.skinTransfer};
  group.add(yoke);
}

/** A real pair of articulated trouser legs, not an elongated skirt tube.
 * Each cylinder vertex blends source thigh and shin bones around the knee.
 * Both legs inherit the original Chibi 78-bone skeleton/bind matrix.
 */
const TWO_LEG_STYLES=new Set([
  'chibi_male_jeans','chibi_male_joggers','chibi_male_chinos','chibi_male_cargo','chibi_male_trackpants',
  'chibi_female_jeans','chibi_female_widepants'
]);
function makeTrouserLegs({getNode,source,style,group,material,cloneSkinnedMeshWithGeometry}){
  const skeleton=source.skeleton;
  const reference=getNode(style.fit==='male'?'kidscade_male_body':'character_low');
  if(!reference?.isSkinnedMesh)throw new Error('Missing fit body for trouser skin transfer');
  addTrouserHipYoke({source,style,group,material,reference,cloneSkinnedMeshWithGeometry});
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
    // v6.6: protect thigh and knee clearance while removing the balloon-like
    // cylindrical profile identified by the real WebGL wardrobe audit.
    const male=style.fit==='male';
    const upperRadius=wide?.140:jogger?.143:chino?.137:male?.137:.143;
    const lowerRadius=wide?.104:jogger?.075:chino?.074:male?.081:.088;
    const top=.755,bottom=.082;
    const geometry=new THREE.CylinderGeometry(upperRadius,lowerRadius,top-bottom,16,9,false);
    geometry.translate(sign*(wide?.178:.155),(top+bottom)*.5,0);
    const positions=geometry.getAttribute('position');
    // Body knees and upper thighs protrude more toward +Z than a round tube.
    // Give the front thigh an anatomically shaped clearance allowance.
    for(let i=0;i<positions.count;i++){
      const y=positions.getY(i),z=positions.getZ(i);
      const thighFront=smooth(.22,.36,y)*(1-smooth(.58,.75,y));
      if(z>0)positions.setZ(i,z*(1+(wide?.42:male?.48:.68)*thighFront));
      if(wide){
        // Define two visible trouser legs instead of a skirt-like broad tube;
        // a tapered knee with a relaxed hem keeps the garment recognizable.
        const x=positions.getX(i),center=sign*.178;
        const knee=smooth(.23,.35,y)*(1-smooth(.42,.57,y));
        const hem=1-smooth(.10,.25,y);
        const fullness=1-.11*knee+.025*hem;
        positions.setX(i,center+(x-center)*fullness);
        positions.setZ(i,positions.getZ(i)*fullness);
      }
    }
    positions.needsUpdate=true;
    // Smooth 4-neighbor skin transfer follows the knee and pelvis blends
    // without stitching a thigh vertex to a single unrelated body triangle.
    transferSmoothSkinWeights(geometry,reference,{sign,region:'leg'});
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const leg=cloneSkinnedMeshWithGeometry(source,geometry,material,style.id+'_leg_'+side);
    leg.userData={part:'trouser-leg',side,fit:style.fit,articulation:'four-neighbor-smooth-body-weights',skinTransfer:geometry.userData.skinTransfer,thighBone:thigh,shinBone:shin};
    group.add(leg);
    if(style.id==='chibi_male_trackpants'){
      // Fabric-colored piping samples the ACTUAL tapered cylinder surface
      // with its own smooth four-neighbor leg weights. No rigid unattached
      // thigh/shin boxes; no gap at the knee during WALK/RUN.
      const verts=[],triangles=[],steps=16,width=.016;
      const center=sign*(wide?.178:.155);
      for(let j=0;j<=steps;j++){
        const y=top-(top-bottom)*j/steps;
        const fraction=(y-bottom)/(top-bottom);
        const radius=lowerRadius+(upperRadius-lowerRadius)*fraction;
        for(const z of [-width,width]){
          const surfaceX=center+sign*(Math.sqrt(Math.max(0,radius*radius-z*z))+.005);
          verts.push(surfaceX,y,z);
        }
        if(j<steps){
          const row=j*2;
          triangles.push(row,row+1,row+2,row+1,row+3,row+2);
        }
      }
      const piping=new THREE.BufferGeometry();
      piping.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
      piping.setIndex(triangles);
      transferSmoothSkinWeights(piping,reference,{sign,region:'leg'});
      piping.computeVertexNormals();piping.computeBoundingBox();piping.computeBoundingSphere();
      const stripeMat=new THREE.MeshStandardMaterial({color:'#ece9dd',roughness:.88,side:THREE.DoubleSide});
      const stripe=cloneSkinnedMeshWithGeometry(source,piping,stripeMat,
        style.id+(sign<0?'_stripe_left_weighted':'_stripe_right_weighted'));
      stripe.userData={part:'weighted-trouser-side-piping',side,
        skinTransfer:piping.userData.skinTransfer};
      group.add(stripe);
    }
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
      sourceMesh:style.base,geometryPolicy:'source-skinned-silhouette-v5.5-safe',
      safetyReport:{...geometry.userData},
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

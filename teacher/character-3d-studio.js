import * as THREE from '../assets/vendor/three-r160/three.module.js';

window.__kc3dStudioModuleReady=true;

const ADMIN_KEY_NAME='kc_teacher_admin_key';
const RIG_VERSION='kidscade-humanoid-v3';
const CLIP_NAMES=['IDLE','WALK','RUN','JUMP','ATTACK','HURT','DEAD'];
const $=id=>document.getElementById(id);

let scene,camera,renderer,controls,characterRoot,skinnedMesh,skeletonHelper,mixer;
let clips=[],activeAction=null,activeClip='IDLE',lastTime=performance.now();
let bodyStyle='soft3',activeView='threeQuarter',currentDim=null;

const params={
  height:1.22,
  headScale:1,
  shoulderScale:1,
  limbScale:1,
  skinColor:'#f2b892',
  hairColor:'#35271f',
  topColor:'#5b7cfa',
  bottomColor:'#34495e',
  shoeColor:'#f3f4f6',
  eyeColor:'#1f2937'
};

const BODY_STYLES={
  legacy:{
    label:'V1 기존 마네킹',
    defaults:{height:1.35,headScale:1,shoulderScale:1,limbScale:1}
  },
  chibi2:{
    label:'V2 SD 기본형',
    defaults:{height:1.25,headScale:1,shoulderScale:1,limbScale:1}
  },
  action2:{
    label:'V2 액션 과장형',
    defaults:{height:1.28,headScale:.96,shoulderScale:1.06,limbScale:1.12}
  },
  soft3:{
    label:'V3 SoftMesh SD',
    defaults:{height:1.22,headScale:1,shoulderScale:1,limbScale:1}
  }
};

function setStatus(text,error=false){
  const el=$('status');
  if(!el)return;
  el.textContent=text;
  el.className='status'+(error?' error':'');
}

function createSimpleOrbitControls(camera,domElement){
  const target=new THREE.Vector3(0,.75,0);
  let dragging=false,lastX=0,lastY=0;
  let theta=.64,phi=1.18,radius=4.9;
  let minDistance=1.3,maxDistance=7,maxPolarAngle=Math.PI*.49;

  const syncFromCamera=()=>{
    const offset=camera.position.clone().sub(target);
    radius=Math.max(.01,offset.length());
    theta=Math.atan2(offset.x,offset.z);
    phi=Math.acos(THREE.MathUtils.clamp(offset.y/radius,-1,1));
  };

  const update=()=>{
    radius=THREE.MathUtils.clamp(radius,minDistance,maxDistance);
    phi=THREE.MathUtils.clamp(phi,.12,maxPolarAngle);
    const sin=Math.sin(phi);
    camera.position.set(
      target.x+radius*sin*Math.sin(theta),
      target.y+radius*Math.cos(phi),
      target.z+radius*sin*Math.cos(theta)
    );
    camera.lookAt(target);
  };

  domElement.addEventListener('pointerdown',event=>{
    dragging=true;lastX=event.clientX;lastY=event.clientY;
    domElement.setPointerCapture?.(event.pointerId);
  });
  domElement.addEventListener('pointermove',event=>{
    if(!dragging)return;
    const dx=event.clientX-lastX,dy=event.clientY-lastY;
    lastX=event.clientX;lastY=event.clientY;
    theta-=dx*.008;
    phi-=dy*.008;
    update();
  });
  const stop=event=>{
    dragging=false;
    try{domElement.releasePointerCapture?.(event.pointerId)}catch(_){}
  };
  domElement.addEventListener('pointerup',stop);
  domElement.addEventListener('pointercancel',stop);
  domElement.addEventListener('wheel',event=>{
    event.preventDefault();
    radius*=Math.exp(event.deltaY*.0011);
    update();
  },{passive:false});

  syncFromCamera();
  update();

  return {
    target,
    update,
    syncFromCamera,
    get minDistance(){return minDistance},
    set minDistance(v){minDistance=v;update()},
    get maxDistance(){return maxDistance},
    set maxDistance(v){maxDistance=v;update()},
    get maxPolarAngle(){return maxPolarAngle},
    set maxPolarAngle(v){maxPolarAngle=v;update()},
    enableDamping:false
  };
}

function mergeRigidGeometries(geometries,materialSlots){
  if(!geometries.length)throw new Error('병합할 캐릭터 메시가 없습니다.');
  const names=Object.keys(geometries[0].attributes);
  const merged=new THREE.BufferGeometry();
  for(const name of names){
    const first=geometries[0].getAttribute(name);
    const ArrayType=first.array.constructor;
    const total=geometries.reduce((sum,g)=>{
      const attr=g.getAttribute(name);
      if(!attr||attr.itemSize!==first.itemSize||attr.normalized!==first.normalized){
        throw new Error('메시 속성 형식이 서로 달라 병합할 수 없습니다: '+name);
      }
      return sum+attr.array.length;
    },0);
    const array=new ArrayType(total);
    let offset=0;
    for(const g of geometries){
      const attr=g.getAttribute(name);
      array.set(attr.array,offset);
      offset+=attr.array.length;
    }
    merged.setAttribute(name,new THREE.BufferAttribute(array,first.itemSize,first.normalized));
  }
  let start=0;
  geometries.forEach((g,i)=>{
    const count=g.getAttribute('position').count;
    merged.addGroup(start,count,materialSlots[i]??0);
    start+=count;
  });
  return merged;
}

function adminKey(){
  try{return sessionStorage.getItem(ADMIN_KEY_NAME)||''}catch(_){return ''}
}

async function authorize(){
  const key=adminKey();
  if(!key){
    $('gateText').innerHTML='전역 관리자 로그인이 필요합니다. <a href="/teacher/">관리자 화면에서 로그인</a>한 뒤 다시 열어 주세요.';
    return false;
  }
  try{
    const response=await fetch('/api/teacher/overview',{
      credentials:'same-origin',
      headers:{authorization:'Bearer '+key}
    });
    const body=await response.json().catch(()=>({}));
    if(!response.ok||!body.ok||body.scope!=='global'){
      $('gateText').innerHTML='전역 관리자 권한을 확인하지 못했습니다. <a href="/teacher/">관리자 화면으로 돌아가기</a>';
      return false;
    }
    $('gate').classList.add('hidden');
    $('studio').classList.remove('hidden');
    return true;
  }catch(_){
    $('gateText').textContent='관리자 권한 확인 중 네트워크 오류가 발생했습니다.';
    return false;
  }
}

function initScene(){
  const canvas=$('view');
  scene=new THREE.Scene();
  scene.background=new THREE.Color(0x1d2935);
  scene.fog=new THREE.Fog(0x1d2935,7,13);

  camera=new THREE.PerspectiveCamera(40,1,.01,50);
  camera.position.set(2.8,1.75,3.8);

  renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.8));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.05;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;

  scene.add(new THREE.HemisphereLight(0xf3f8ff,0x56616a,2.25));
  const sun=new THREE.DirectionalLight(0xffffff,3);
  sun.position.set(3.5,6,4);
  sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);
  sun.shadow.camera.left=-3;sun.shadow.camera.right=3;sun.shadow.camera.top=4;sun.shadow.camera.bottom=-1;
  scene.add(sun);

  const floorMat=new THREE.MeshStandardMaterial({color:0x4f5d66,roughness:.98,metalness:0});
  const floor=new THREE.Mesh(new THREE.CircleGeometry(4.5,48),floorMat);
  floor.rotation.x=-Math.PI/2;
  floor.position.y=-.005;
  floor.receiveShadow=true;
  scene.add(floor);

  const grid=new THREE.GridHelper(8,32,0x7f91a0,0x485862);
  grid.position.y=.003;
  scene.add(grid);

  controls=createSimpleOrbitControls(camera,canvas);
  controls.enableDamping=true;
  controls.target.set(0,.75,0);
  controls.minDistance=1.3;
  controls.maxDistance=7;
  controls.maxPolarAngle=Math.PI*.49;

  addEventListener('resize',resize);
  resize();
}

function resize(){
  if(!renderer)return;
  const canvas=$('view');
  const r=canvas.getBoundingClientRect();
  const w=Math.max(1,Math.floor(r.width));
  const h=Math.max(1,Math.floor(r.height));
  renderer.setSize(w,h,false);
  camera.aspect=w/h;
  camera.updateProjectionMatrix();
}

function mat(color,roughness=.76){
  return new THREE.MeshStandardMaterial({color:new THREE.Color(color),roughness,metalness:.02});
}

function readParams(){
  params.height=Number($('height').value);
  params.headScale=Number($('headScale').value);
  params.shoulderScale=Number($('shoulderScale').value);
  params.limbScale=Number($('limbScale').value);
  for(const key of ['skinColor','hairColor','topColor','bottomColor','shoeColor','eyeColor'])params[key]=$(key).value;
}

function syncOutputs(){
  $('heightOut').textContent=Number($('height').value).toFixed(2)+' m';
  $('headOut').textContent=Number($('headScale').value).toFixed(2)+'×';
  $('shoulderOut').textContent=Number($('shoulderScale').value).toFixed(2)+'×';
  $('limbOut').textContent=Number($('limbScale').value).toFixed(2)+'×';
}

function disposeObject(root){
  if(!root)return;
  root.traverse(n=>{
    if(n.geometry)n.geometry.dispose?.();
    if(n.material){
      const list=Array.isArray(n.material)?n.material:[n.material];
      list.forEach(m=>m?.dispose?.());
    }
  });
}

function makeBone(name,parent,local){
  const b=new THREE.Bone();
  b.name=name;
  b.position.set(local[0],local[1],local[2]);
  parent?.add(b);
  return b;
}

function rigidGeometry(geometry,matrix,boneIndex){
  const g=geometry.index?geometry.toNonIndexed():geometry.clone();
  if(g!==geometry)geometry.dispose();
  g.clearGroups();
  g.applyMatrix4(matrix);
  const count=g.getAttribute('position').count;
  const indices=new Uint16Array(count*4);
  const weights=new Float32Array(count*4);
  for(let i=0;i<count;i++){
    indices[i*4]=boneIndex;
    weights[i*4]=1;
  }
  g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));
  g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
  return g;
}

function boxPart(size,center,boneIndex){
  const g=new THREE.BoxGeometry(size[0],size[1],size[2],1,1,1);
  const m=new THREE.Matrix4().makeTranslation(center[0],center[1],center[2]);
  return rigidGeometry(g,m,boneIndex);
}

function spherePart(scale,center,boneIndex,segments=10,rings=7){
  const g=new THREE.SphereGeometry(1,segments,rings);
  const m=new THREE.Matrix4().compose(
    new THREE.Vector3(center[0],center[1],center[2]),
    new THREE.Quaternion(),
    new THREE.Vector3(scale[0],scale[1],scale[2])
  );
  return rigidGeometry(g,m,boneIndex);
}

function cylinderPart(radius,height,center,boneIndex){
  const g=new THREE.CylinderGeometry(radius,radius*.97,height,8,1,false);
  const m=new THREE.Matrix4().makeTranslation(center[0],center[1],center[2]);
  return rigidGeometry(g,m,boneIndex);
}

function capsulePart(radius,height,center,boneIndex,scaleX=1,scaleZ=1){
  const straight=Math.max(.001,height-radius*2);
  const g=new THREE.CapsuleGeometry(radius,straight,3,8);
  const m=new THREE.Matrix4().compose(
    new THREE.Vector3(center[0],center[1],center[2]),
    new THREE.Quaternion(),
    new THREE.Vector3(scaleX,1,scaleZ)
  );
  return rigidGeometry(g,m,boneIndex);
}

function taperedPart(topRadius,bottomRadius,height,center,boneIndex,depthScale=.58){
  const g=new THREE.CylinderGeometry(topRadius,bottomRadius,height,8,1,false);
  const m=new THREE.Matrix4().compose(
    new THREE.Vector3(center[0],center[1],center[2]),
    new THREE.Quaternion(),
    new THREE.Vector3(1,1,depthScale)
  );
  return rigidGeometry(g,m,boneIndex);
}

function normalizeBoneWeights(pairs){
  const clean=(pairs||[]).filter(p=>p&&p[1]>0).slice(0,4);
  const total=clean.reduce((s,p)=>s+p[1],0)||1;
  const indices=[0,0,0,0],weights=[0,0,0,0];
  clean.forEach((p,i)=>{indices[i]=p[0];weights[i]=p[1]/total});
  return {indices,weights};
}

function skinnedRingShell(rings,segments=14){
  const pos=[],skinI=[],skinW=[],idx=[];
  for(const ring of rings){
    const weights=normalizeBoneWeights(ring.weights);
    for(let s=0;s<segments;s++){
      const a=s/segments*Math.PI*2;
      pos.push(
        (ring.cx||0)+Math.cos(a)*ring.rx,
        ring.y,
        (ring.cz||0)+Math.sin(a)*ring.rz
      );
      skinI.push(...weights.indices);
      skinW.push(...weights.weights);
    }
  }
  for(let r=0;r<rings.length-1;r++){
    for(let s=0;s<segments;s++){
      const n=(s+1)%segments;
      const a=r*segments+s,b=r*segments+n,c=(r+1)*segments+s,d=(r+1)*segments+n;
      idx.push(a,c,b,b,c,d);
    }
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(skinI,4));
  g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(skinW,4));
  g.setIndex(idx);
  g.computeVertexNormals();
  const non=g.toNonIndexed();
  g.dispose();
  return non;
}

function softTorsoGeometry(dim,boneIndex){
  const H=dim.H;
  const sh=params.shoulderScale;
  return skinnedRingShell([
    {y:dim.hipY-.010*H,rx:.105*H,rz:.090*H,weights:[[boneIndex.Hips,1]]},
    {y:dim.hipY+.025*H,rx:.122*H,rz:.101*H,weights:[[boneIndex.Hips,.82],[boneIndex.Spine,.18]]},
    {y:dim.spineY-.018*H,rx:.135*H,rz:.108*H,weights:[[boneIndex.Hips,.32],[boneIndex.Spine,.68]]},
    {y:dim.spineY+.026*H,rx:.151*H,rz:.113*H,weights:[[boneIndex.Spine,.82],[boneIndex.Chest,.18]]},
    {y:dim.chestY-.015*H,rx:.164*H*sh,rz:.118*H,weights:[[boneIndex.Spine,.28],[boneIndex.Chest,.72]]},
    {y:dim.shoulderY-.020*H,rx:.178*H*sh,rz:.116*H,weights:[[boneIndex.Chest,1]]},
    {y:dim.shoulderY+.012*H,rx:.150*H*sh,rz:.105*H,weights:[[boneIndex.Chest,1]]},
    {y:dim.neckY-.006*H,rx:.072*H,rz:.070*H,weights:[[boneIndex.Chest,.72],[boneIndex.Neck,.28]]}
  ],16);
}

function softForearmGeometry(dim,x,upperBone,lowerBone){
  const H=dim.H;
  const elbow=dim.shoulderY-dim.upperArmLen;
  const wrist=elbow-dim.lowerArmLen;
  const r=dim.limb*.54;
  return skinnedRingShell([
    {cx:x,y:elbow+.030*H,rx:r*1.08,rz:r*.94,weights:[[upperBone,.86],[lowerBone,.14]]},
    {cx:x,y:elbow+.010*H,rx:r*1.12,rz:r*.97,weights:[[upperBone,.64],[lowerBone,.36]]},
    {cx:x,y:elbow-.010*H,rx:r*1.10,rz:r*.96,weights:[[upperBone,.36],[lowerBone,.64]]},
    {cx:x,y:elbow-.045*H,rx:r,rz:r*.92,weights:[[lowerBone,.94],[upperBone,.06]]},
    {cx:x,y:(elbow+wrist)*.5,rx:r*.91,rz:r*.86,weights:[[lowerBone,1]]},
    {cx:x,y:wrist+.018*H,rx:r*.83,rz:r*.80,weights:[[lowerBone,1]]}
  ],14);
}

function softLegGeometry(dim,x,upperBone,lowerBone){
  const H=dim.H;
  const knee=dim.kneeY,ankle=dim.ankleY;
  const r=dim.limb*.63;
  const shortsBottom=dim.hipY-.085*H;
  return skinnedRingShell([
    {cx:x,y:shortsBottom+.016*H,rx:r*1.04,rz:r*.98,weights:[[upperBone,1]]},
    {cx:x,y:shortsBottom-.010*H,rx:r,rz:r*.94,weights:[[upperBone,1]]},
    {cx:x,y:knee+.030*H,rx:r*.91,rz:r*.90,weights:[[upperBone,.88],[lowerBone,.12]]},
    {cx:x,y:knee+.010*H,rx:r*.88,rz:r*.88,weights:[[upperBone,.63],[lowerBone,.37]]},
    {cx:x,y:knee-.012*H,rx:r*.86,rz:r*.87,weights:[[upperBone,.35],[lowerBone,.65]]},
    {cx:x,y:knee-.045*H,rx:r*.82,rz:r*.85,weights:[[lowerBone,.96],[upperBone,.04]]},
    {cx:x,y:(knee+ankle)*.5,rx:r*.76,rz:r*.82,weights:[[lowerBone,1]]},
    {cx:x,y:ankle+.020*H,rx:r*.70,rz:r*.78,weights:[[lowerBone,1]]}
  ],14);
}

function bodyDimensions(style,H){
  if(style==='soft3'){
    return {
      style,H,
      ankleY:.082*H,
      kneeY:.252*H,
      hipY:.425*H,
      spineY:.505*H,
      chestY:.570*H,
      shoulderY:.626*H,
      neckY:.648*H,
      headBoneY:.662*H,
      headCenterY:.820*H,
      headRX:.183*H*params.headScale,
      headRY:.180*H*params.headScale,
      headRZ:.168*H*params.headScale,
      shoulderX:.165*H*params.shoulderScale,
      hipX:.076*H,
      upperArmLen:.136*H,
      lowerArmLen:.126*H,
      upperLegLen:(.425-.252)*H,
      lowerLegLen:(.252-.082)*H,
      limb:.072*H*params.limbScale,
      handX:.061*H,handY:.066*H,handZ:.056*H,
      footX:.108*H,footY:.066*H,footZ:.157*H,
      eyeSize:.021*H,
      torsoH:.20*H,torsoCenterY:.535*H,torsoTop:.17*H,torsoBottom:.13*H,
      rounded:true,soft:true
    };
  }
  if(style==='legacy'){
    return {
      style,H,
      ankleY:.065*H,kneeY:.292*H,hipY:.515*H,spineY:.615*H,chestY:.715*H,
      shoulderY:.755*H,neckY:.835*H,headBoneY:.855*H,headCenterY:.925*H,
      headRX:.092*H*params.headScale,headRY:.075*H*params.headScale,headRZ:.088*H*params.headScale,
      shoulderX:.145*H*params.shoulderScale,hipX:.075*H,
      upperArmLen:.185*H,lowerArmLen:.17*H,
      upperLegLen:(.515-.292)*H,lowerLegLen:(.292-.065)*H,
      limb:.055*H*params.limbScale,
      handX:.032*H,handY:.038*H,handZ:.032*H,
      footX:.070*H,footY:.055*H,footZ:.135*H,
      eyeSize:.012*H,torsoH:.23*H,torsoCenterY:.695*H,torsoTop:.145*H,torsoBottom:.13*H,
      rounded:false,soft:false
    };
  }

  const action=style==='action2';
  return {
    style,H,
    ankleY:.078*H,
    kneeY:.247*H,
    hipY:.418*H,
    spineY:.49*H,
    chestY:.558*H,
    shoulderY:.625*H,
    neckY:.648*H,
    headBoneY:.665*H,
    headCenterY:.828*H,
    headRX:(action ? .175 : .184)*H*params.headScale,
    headRY:(action ? .164 : .172)*H*params.headScale,
    headRZ:(action ? .158 : .166)*H*params.headScale,
    shoulderX:(action ? .176 : .158)*H*params.shoulderScale,
    hipX:(action ? .082 : .074)*H,
    upperArmLen:(action ? .137 : .132)*H,
    lowerArmLen:(action ? .126 : .122)*H,
    upperLegLen:(.418-.247)*H,
    lowerLegLen:(.247-.078)*H,
    limb:(action ? .078 : .068)*H*params.limbScale,
    handX:(action ? .072 : .056)*H,
    handY:(action ? .068 : .058)*H,
    handZ:(action ? .064 : .053)*H,
    footX:(action ? .116 : .098)*H,
    footY:(action ? .078 : .067)*H,
    footZ:(action ? .170 : .148)*H,
    eyeSize:(action ? .020 : .022)*H,
    torsoH:(action ? .205 : .19)*H,
    torsoCenterY:(action ? .53 : .535)*H,
    torsoTop:(action ? .17 : .157)*H*params.shoulderScale,
    torsoBottom:(action ? .135 : .128)*H,
    rounded:true,soft:false
  };
}

function q(x=0,y=0,z=0){
  const out=new THREE.Quaternion();
  out.setFromEuler(new THREE.Euler(x,y,z,'XYZ'));
  return out;
}

function qValues(list){
  const values=[];
  for(const e of list){
    const v=q(e[0]||0,e[1]||0,e[2]||0);
    values.push(v.x,v.y,v.z,v.w);
  }
  return values;
}

function qTrack(bone,times,eulers){
  return new THREE.QuaternionKeyframeTrack(bone+'.quaternion',times,qValues(eulers));
}

function vTrack(bone,times,values){
  return new THREE.VectorKeyframeTrack(bone+'.position',times,values.flat());
}

function buildClips(dim){
  const walkT=[0,.25,.5,.75,1];
  const walkA=[0,.58,0,-.58,0];
  const opp=[0,-.58,0,.58,0];
  const e=x=>[x,0,0];
  const clipsOut=[];

  clipsOut.push(new THREE.AnimationClip('IDLE',2,[
    qTrack('Chest',[0,1,2],[[0,0,-.015],[.025,0,.015],[0,0,-.015]]),
    qTrack('UpperArm_L',[0,1,2],[[.03,0,.03],[-.03,0,.015],[.03,0,.03]]),
    qTrack('UpperArm_R',[0,1,2],[[-.03,0,-.03],[.03,0,-.015],[-.03,0,-.03]])
  ]));

  clipsOut.push(new THREE.AnimationClip('WALK',1,[
    qTrack('UpperLeg_L',walkT,walkA.map(e)),
    qTrack('UpperLeg_R',walkT,opp.map(e)),
    qTrack('UpperArm_L',walkT,opp.map(v=>[-v,0,.05])),
    qTrack('UpperArm_R',walkT,walkA.map(v=>[-v,0,-.05])),
    qTrack('LowerLeg_L',walkT,[[0,0,0],[.12,0,0],[.52,0,0],[.1,0,0],[0,0,0]]),
    qTrack('LowerLeg_R',walkT,[[.52,0,0],[.1,0,0],[0,0,0],[.12,0,0],[.52,0,0]])
  ]));

  clipsOut.push(new THREE.AnimationClip('RUN',.72,[
    qTrack('UpperLeg_L',[0,.18,.36,.54,.72],[e(0),e(.88),e(0),e(-.88),e(0)]),
    qTrack('UpperLeg_R',[0,.18,.36,.54,.72],[e(0),e(-.88),e(0),e(.88),e(0)]),
    qTrack('UpperArm_L',[0,.18,.36,.54,.72],[e(0),e(-.8),e(0),e(.8),e(0)]),
    qTrack('UpperArm_R',[0,.18,.36,.54,.72],[e(0),e(.8),e(0),e(-.8),e(0)]),
    qTrack('Chest',[0,.18,.36,.54,.72],[[.10,0,0],[.13,0,.04],[.10,0,0],[.13,0,-.04],[.10,0,0]])
  ]));

  clipsOut.push(new THREE.AnimationClip('JUMP',1.15,[
    vTrack('Hips',[0,.25,.55,.82,1.15],[
      [0,dim.hipY,0],[0,dim.hipY+.05*dim.H,0],[0,dim.hipY+.20*dim.H,0],[0,dim.hipY+.08*dim.H,0],[0,dim.hipY,0]
    ]),
    qTrack('UpperArm_L',[0,.25,.55,1.15],[[0,0,.05],[-.45,0,.2],[-1.5,0,.15],[0,0,.05]]),
    qTrack('UpperArm_R',[0,.25,.55,1.15],[[0,0,-.05],[-.45,0,-.2],[-1.5,0,-.15],[0,0,-.05]]),
    qTrack('UpperLeg_L',[0,.55,1.15],[[0,0,0],[-.38,0,.12],[0,0,0]]),
    qTrack('UpperLeg_R',[0,.55,1.15],[[0,0,0],[-.38,0,-.12],[0,0,0]])
  ]));

  clipsOut.push(new THREE.AnimationClip('ATTACK',.72,[
    qTrack('Chest',[0,.2,.4,.72],[[0,0,0],[0,-.18,0],[.04,.28,0],[0,0,0]]),
    qTrack('UpperArm_R',[0,.18,.38,.72],[[0,0,-.04],[-.6,0,-.25],[-1.4,-.15,-.10],[0,0,-.04]]),
    qTrack('LowerArm_R',[0,.18,.38,.72],[[0,0,0],[-.8,0,0],[-.18,0,0],[0,0,0]])
  ]));

  clipsOut.push(new THREE.AnimationClip('HURT',.7,[
    qTrack('Chest',[0,.15,.35,.7],[[0,0,0],[.22,0,.08],[-.10,0,-.05],[0,0,0]]),
    qTrack('UpperArm_L',[0,.15,.35,.7],[[0,0,.04],[.55,0,.42],[-.2,0,.18],[0,0,.04]]),
    qTrack('UpperArm_R',[0,.15,.35,.7],[[0,0,-.04],[.55,0,-.42],[-.2,0,-.18],[0,0,-.04]])
  ]));

  clipsOut.push(new THREE.AnimationClip('DEAD',1.3,[
    vTrack('Root',[0,.55,1.3],[[0,0,0],[.04,.04,0],[.30,.17,0]]),
    qTrack('Root',[0,.55,1.3],[[0,0,0],[0,0,-.45],[0,0,-1.47]]),
    qTrack('UpperArm_L',[0,.55,1.3],[[0,0,.04],[.3,0,.4],[.1,0,.15]]),
    qTrack('UpperArm_R',[0,.55,1.3],[[0,0,-.04],[-.2,0,-.45],[.1,0,-.12]])
  ]));

  clipsOut.forEach(c=>c.optimize());
  return clipsOut;
}

function addHeadDetails(headBone,dim,materials){
  const chibi=dim.style!=='legacy';
  const soft=dim.style==='soft3';
  const H=dim.H;

  const hair=new THREE.Mesh(
    new THREE.SphereGeometry(1,soft?20:(chibi?12:10),soft?12:(chibi?8:6),0,Math.PI*2,0,Math.PI*(soft?.50:(chibi?.46:.57))),
    materials[4]
  );
  hair.name='Hair';
  hair.scale.set(dim.headRX*(soft?1.075:1.055),dim.headRY*(soft?1.055:1.035),dim.headRZ*(soft?1.065:1.055));
  hair.position.set(0,dim.headCenterY-dim.headBoneY+(soft?.006:(chibi?.010:.014))*H,-(soft?.010:(chibi?.012:.005))*H);
  hair.castShadow=true;
  headBone.add(hair);

  const faceY=dim.headCenterY-dim.headBoneY;
  if(soft){
    const whiteMat=mat('#f8fafc',.70);
    whiteMat.name='EyeWhite';
    const eyeWhiteGeo=new THREE.SphereGeometry(1,12,8);
    const pupilGeo=new THREE.SphereGeometry(1,10,7);
    for(const side of [-1,1]){
      const white=new THREE.Mesh(eyeWhiteGeo.clone(),whiteMat);
      white.name=side<0?'EyeWhite_L':'EyeWhite_R';
      white.scale.set(.030*H,.039*H,.010*H);
      white.position.set(side*dim.headRX*.39,faceY-.022*H,dim.headRZ*.935);
      headBone.add(white);

      const pupil=new THREE.Mesh(pupilGeo.clone(),materials[5]);
      pupil.name=side<0?'Eye_L':'Eye_R';
      pupil.scale.set(.0135*H,.018*H,.007*H);
      pupil.position.set(side*dim.headRX*.39,faceY-.023*H,dim.headRZ*.979);
      headBone.add(pupil);

      const brow=new THREE.Mesh(new THREE.BoxGeometry(.041*H,.006*H,.006*H),materials[4]);
      brow.name=side<0?'Brow_L':'Brow_R';
      brow.position.set(side*dim.headRX*.39,faceY+.025*H,dim.headRZ*.972);
      brow.rotation.z=side*.08;
      headBone.add(brow);

      const ear=new THREE.Mesh(new THREE.SphereGeometry(1,10,7),materials[0]);
      ear.name=side<0?'Ear_L':'Ear_R';
      ear.scale.set(.020*H,.030*H,.016*H);
      ear.position.set(side*dim.headRX*.99,faceY-.006*H,0);
      headBone.add(ear);
    }

    const mouth=new THREE.Mesh(new THREE.BoxGeometry(.041*H,.006*H,.006*H),materials[5]);
    mouth.name='Mouth';
    mouth.position.set(0,faceY-.093*H,dim.headRZ*.972);
    headBone.add(mouth);

    const bangGeo=new THREE.ConeGeometry(.026*H,.070*H,7);
    const bangs=[[-.098,.24],[-.050,.12],[0,0],[.050,-.12],[.098,-.24]];
    for(const [x,rot] of bangs){
      const bang=new THREE.Mesh(bangGeo.clone(),materials[4]);
      bang.name='HairFringe';
      bang.position.set(x*H,faceY+.071*H,dim.headRZ*.91);
      bang.rotation.z=rot;
      bang.rotation.x=-.08;
      bang.castShadow=true;
      headBone.add(bang);
    }
    return;
  }

  const eyeGeo=new THREE.SphereGeometry(dim.eyeSize,chibi?9:7,chibi?7:5);
  const eyeMat=materials[5];
  const eyeY=faceY+(chibi?-.018:.012)*H;
  for(const side of [-1,1]){
    const eye=new THREE.Mesh(eyeGeo.clone(),eyeMat);
    eye.name=side<0?'Eye_L':'Eye_R';
    eye.position.set(side*dim.headRX*(chibi?.38:.39),eyeY,dim.headRZ*.91);
    eye.scale.set(chibi?.86:1,chibi?1.12:.88,.48);
    headBone.add(eye);
  }

  if(chibi){
    const mouth=new THREE.Mesh(new THREE.BoxGeometry(.037*H,.007*H,.006*H),materials[5]);
    mouth.name='Mouth';
    mouth.position.set(0,faceY-.078*H,dim.headRZ*.955);
    headBone.add(mouth);

    const bangGeo=new THREE.ConeGeometry(.030*H,.075*H,5);
    for(const [x,rot] of [[-.065,.18],[0,0],[.065,-.18]]){
      const bang=new THREE.Mesh(bangGeo.clone(),materials[4]);
      bang.name='HairFringe';
      bang.position.set(x*H,faceY+.055*H,dim.headRZ*.89);
      bang.rotation.z=rot;
      bang.rotation.x=-.10;
      bang.castShadow=true;
      headBone.add(bang);
    }
  }else{
    const nose=new THREE.Mesh(new THREE.BoxGeometry(.018*H,.018*H,.025*H),materials[0]);
    nose.name='Nose';
    nose.position.set(0,faceY-.018*H,dim.headRZ*.96);
    headBone.add(nose);
  }
}

function setCameraView(name,markButton=true){
  if(!camera||!controls||!currentDim)return;
  activeView=name;
  const H=currentDim.H;
  controls.target.set(0,H*.50,0);
  if(name==='front')camera.position.set(0,H*.72,H*2.55);
  else if(name==='side')camera.position.set(H*2.55,H*.72,0);
  else if(name==='back')camera.position.set(0,H*.72,-H*2.55);
  else camera.position.set(H*1.68,H*.82,H*1.92);
  controls.syncFromCamera?.();
  controls.update();
  if(markButton){
    document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
  }
}

function buildCharacter(){
  readParams();
  setStatus('캐릭터와 리그를 만드는 중…');

  if(activeAction)activeAction.stop();
  activeAction=null;
  mixer=null;
  clips=[];

  if(skeletonHelper){
    scene.remove(skeletonHelper);
    skeletonHelper.geometry?.dispose?.();
    skeletonHelper.material?.dispose?.();
    skeletonHelper=null;
  }
  if(characterRoot){
    scene.remove(characterRoot);
    disposeObject(characterRoot);
  }

  const H=params.height;
  const dim=bodyDimensions(bodyStyle,H);
  currentDim=dim;

  characterRoot=new THREE.Group();
  characterRoot.name='KidscadeCharacter';
  characterRoot.userData={
    type:'kidscade-rigged-character',
    rigVersion:RIG_VERSION,
    bodyStyle,
    bodyStyleLabel:BODY_STYLES[bodyStyle]?.label||bodyStyle,
    units:'meters',
    upAxis:'Y',
    groundOrigin:true,
    designTarget:bodyStyle==='legacy'?'legacy mannequin':'Kidscade SD game character',
    generator:'Kidscade 3D Character Studio'
  };
  scene.add(characterRoot);

  const root=makeBone('Root',null,[0,0,0]);
  const hips=makeBone('Hips',root,[0,dim.hipY,0]);
  const spine=makeBone('Spine',hips,[0,dim.spineY-dim.hipY,0]);
  const chest=makeBone('Chest',spine,[0,dim.chestY-dim.spineY,0]);
  const neck=makeBone('Neck',chest,[0,dim.neckY-dim.chestY,0]);
  const head=makeBone('Head',neck,[0,dim.headBoneY-dim.neckY,0]);

  const upperArmL=makeBone('UpperArm_L',chest,[dim.shoulderX,dim.shoulderY-dim.chestY,0]);
  const lowerArmL=makeBone('LowerArm_L',upperArmL,[0,-dim.upperArmLen,0]);
  const handL=makeBone('Hand_L',lowerArmL,[0,-dim.lowerArmLen,0]);
  const upperArmR=makeBone('UpperArm_R',chest,[-dim.shoulderX,dim.shoulderY-dim.chestY,0]);
  const lowerArmR=makeBone('LowerArm_R',upperArmR,[0,-dim.upperArmLen,0]);
  const handR=makeBone('Hand_R',lowerArmR,[0,-dim.lowerArmLen,0]);

  const upperLegL=makeBone('UpperLeg_L',hips,[dim.hipX,0,0]);
  const lowerLegL=makeBone('LowerLeg_L',upperLegL,[0,-dim.upperLegLen,0]);
  const footL=makeBone('Foot_L',lowerLegL,[0,-dim.lowerLegLen,0]);
  const upperLegR=makeBone('UpperLeg_R',hips,[-dim.hipX,0,0]);
  const lowerLegR=makeBone('LowerLeg_R',upperLegR,[0,-dim.upperLegLen,0]);
  const footR=makeBone('Foot_R',lowerLegR,[0,-dim.lowerLegLen,0]);

  const bones=[root,hips,spine,chest,neck,head,upperArmL,lowerArmL,handL,upperArmR,lowerArmR,handR,upperLegL,lowerLegL,footL,upperLegR,lowerLegR,footR];
  const boneIndex=Object.fromEntries(bones.map((b,i)=>[b.name,i]));

  const materials=[
    mat(params.skinColor,.82),
    mat(params.topColor,.76),
    mat(params.bottomColor,.82),
    mat(params.shoeColor,.70),
    mat(params.hairColor,.88),
    mat(params.eyeColor,.72)
  ];
  materials.forEach((m,i)=>m.name=['Skin','Top','Bottom','Shoes','Hair','Eyes'][i]);

  const geoms=[];
  const materialSlots=[];
  const push=(g,slot)=>{geoms.push(g);materialSlots.push(slot)};

  if(dim.soft){
    push(softTorsoGeometry(dim,boneIndex),1);
    push(capsulePart(.048*H,.092*H,[0,dim.hipY-.020*H,0],boneIndex.Hips,2.55,1.50),2);
    push(cylinderPart(.020*H,.026*H,[0,dim.neckY+.002*H,0],boneIndex.Neck),0);
    push(spherePart([dim.headRX,dim.headRY,dim.headRZ],[0,dim.headCenterY,0],boneIndex.Head,20,14),0);
  }else if(!dim.rounded){
    const torsoW=dim.shoulderX*1.62;
    push(boxPart([torsoW,.23*H,.13*H],[0,.695*H,0],boneIndex.Chest),1);
    push(boxPart([.225*H,.095*H,.13*H],[0,.49*H,0],boneIndex.Hips),2);
    push(cylinderPart(.028*H,.04*H,[0,.842*H,0],boneIndex.Neck),0);
    push(spherePart([dim.headRX,dim.headRY,dim.headRZ],[0,dim.headCenterY,0],boneIndex.Head),0);
  }else{
    push(taperedPart(dim.torsoTop,dim.torsoBottom,dim.torsoH,[0,dim.torsoCenterY,0],boneIndex.Chest,.56),1);
    push(capsulePart(.045*H,.090*H,[0,dim.hipY-.008*H,0],boneIndex.Hips,2.55,1.35),2);
    push(cylinderPart(.020*H,.028*H,[0,dim.neckY+.004*H,0],boneIndex.Neck),0);
    push(spherePart([dim.headRX,dim.headRY,dim.headRZ],[0,dim.headCenterY,0],boneIndex.Head),0);
  }

  for(const side of [-1,1]){
    const suffix=side>0?'L':'R';
    const sx=side*dim.shoulderX;
    const hipX=side*dim.hipX;
    const uArm=boneIndex['UpperArm_'+suffix],lArm=boneIndex['LowerArm_'+suffix],hand=boneIndex['Hand_'+suffix];
    const uLeg=boneIndex['UpperLeg_'+suffix],lLeg=boneIndex['LowerLeg_'+suffix],foot=boneIndex['Foot_'+suffix];

    if(dim.soft){
      push(spherePart([dim.limb*.58,dim.limb*.58,dim.limb*.54],[sx,dim.shoulderY-.006*H,0],uArm,12,8),1);
      push(capsulePart(dim.limb*.50,dim.upperArmLen*.74,[sx,dim.shoulderY-dim.upperArmLen*.33,0],uArm,1.02,.94),1);
      push(softForearmGeometry(dim,sx,uArm,lArm),0);
      push(spherePart([dim.handX,dim.handY,dim.handZ],[sx,dim.shoulderY-dim.upperArmLen-dim.lowerArmLen-.038*H,.010*H],hand,14,9),0);

      push(capsulePart(dim.limb*.66,dim.upperLegLen*.50,[hipX,dim.hipY-dim.upperLegLen*.20,0],uLeg,1.06,1.0),2);
      push(softLegGeometry(dim,hipX,uLeg,lLeg),0);
      push(spherePart([dim.footX,dim.footY,dim.footZ],[hipX,dim.footY*.60,.050*H],foot,14,9),3);
      push(boxPart([dim.footX*1.55,.018*H,dim.footZ*1.45],[hipX,.011*H,.050*H],foot),3);
    }else if(!dim.rounded){
      push(boxPart([dim.limb,dim.upperArmLen*.96,dim.limb],[sx,dim.shoulderY-dim.upperArmLen*.48,0],uArm),1);
      push(boxPart([dim.limb*.88,dim.lowerArmLen*.95,dim.limb*.88],[sx,dim.shoulderY-dim.upperArmLen-dim.lowerArmLen*.475,0],lArm),0);
      push(spherePart([dim.handX,dim.handY,dim.handZ],[sx,dim.shoulderY-dim.upperArmLen-dim.lowerArmLen-.032*H,0],hand,8,5),0);
      push(boxPart([dim.limb*1.18,dim.upperLegLen*.97,dim.limb*1.18],[hipX,dim.hipY-dim.upperLegLen*.485,0],uLeg),2);
      push(boxPart([dim.limb,dim.lowerLegLen*.96,dim.limb],[hipX,dim.kneeY-dim.lowerLegLen*.48,0],lLeg),0);
      push(boxPart([dim.footX,.055*H,dim.footZ],[hipX,.033*H,.035*H],foot),3);
    }else{
      push(capsulePart(dim.limb*.52,dim.upperArmLen*.96,[sx,dim.shoulderY-dim.upperArmLen*.49,0],uArm,1,.92),1);
      push(capsulePart(dim.limb*.46,dim.lowerArmLen*.95,[sx,dim.shoulderY-dim.upperArmLen-dim.lowerArmLen*.48,0],lArm,1,.92),0);
      push(spherePart([dim.handX,dim.handY,dim.handZ],[sx,dim.shoulderY-dim.upperArmLen-dim.lowerArmLen-.035*H,.008*H],hand,9,6),0);

      push(capsulePart(dim.limb*.58,dim.upperLegLen*.97,[hipX,dim.hipY-dim.upperLegLen*.49,0],uLeg,1.04,1),2);
      push(capsulePart(dim.limb*.50,dim.lowerLegLen*.96,[hipX,dim.kneeY-dim.lowerLegLen*.48,0],lLeg,1,1),0);
      push(spherePart([dim.footX,dim.footY,dim.footZ],[hipX,dim.footY*.58,.040*H],foot,9,6),3);
    }
  }

  const merged=mergeRigidGeometries(geoms,materialSlots);
  geoms.forEach(g=>g.dispose());
  merged.computeBoundingSphere();
  merged.computeBoundingBox();

  skinnedMesh=new THREE.SkinnedMesh(merged,materials);
  skinnedMesh.name='KidscadeBody';
  skinnedMesh.castShadow=true;
  skinnedMesh.receiveShadow=true;
  skinnedMesh.frustumCulled=false;
  skinnedMesh.add(root);
  root.updateMatrixWorld(true);
  const skeleton=new THREE.Skeleton(bones);
  skinnedMesh.bind(skeleton);
  characterRoot.add(skinnedMesh);

  addHeadDetails(head,dim,materials);

  skeletonHelper=new THREE.SkeletonHelper(skinnedMesh);
  skeletonHelper.name='RigPreviewOnly';
  skeletonHelper.visible=$('showBones').checked;
  skeletonHelper.material.depthTest=false;
  skeletonHelper.material.transparent=true;
  skeletonHelper.material.opacity=.92;
  scene.add(skeletonHelper);

  clips=buildClips(dim);
  characterRoot.userData.animationClips=CLIP_NAMES.slice();
  mixer=new THREE.AnimationMixer(characterRoot);

  const boneList=$('boneList');
  boneList.innerHTML=bones.map(b=>'<span>'+b.name+'</span>').join('');
  $('boneCount').textContent=String(bones.length);

  const triangles=countTriangles(characterRoot);
  $('triangleCount').textContent=triangles.toLocaleString();
  $('polyBadge').textContent=triangles.toLocaleString()+' triangles';
  $('rigBadge').textContent='✓ '+(BODY_STYLES[bodyStyle]?.label||'Humanoid')+' · '+bones.length+' bones';
  $('clipBadge').textContent=clips.length+' clips';
  if($('rigVersionLabel'))$('rigVersionLabel').textContent=bodyStyle==='legacy'?'Humanoid v2 · V1 body':'Kidscade Humanoid v2';

  setCameraView(activeView,false);
  document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===activeView));

  playClip(activeClip||'IDLE');
  setStatus('생성 완료 · '+(BODY_STYLES[bodyStyle]?.label||bodyStyle)+' · '+triangles.toLocaleString()+' triangles');
}

function countTriangles(root){
  let n=0;
  root.traverse(o=>{
    if(!o.isMesh||!o.geometry)return;
    n+=o.geometry.index?o.geometry.index.count/3:o.geometry.getAttribute('position').count/3;
  });
  return Math.round(n);
}

function playClip(name){
  activeClip=name;
  document.querySelectorAll('[data-clip]').forEach(b=>b.classList.toggle('active',b.dataset.clip===name));
  if(!mixer)return;
  if(activeAction)activeAction.fadeOut(.12);
  const clip=clips.find(c=>c.name===name);
  if(!clip)return;
  const next=mixer.clipAction(clip);
  next.reset();
  next.enabled=true;
  next.setEffectiveTimeScale(Number($('speed')?.value||1));
  next.setEffectiveWeight(1);
  next.setLoop(name==='DEAD'?THREE.LoopOnce:THREE.LoopRepeat,name==='DEAD'?1:Infinity);
  next.clampWhenFinished=name==='DEAD';
  next.fadeIn(.12).play();
  activeAction=next;
}

function resetPose(){
  if(activeAction)activeAction.stop();
  activeAction=null;
  mixer?.stopAllAction();
  skinnedMesh?.skeleton?.pose();
  if(characterRoot){
    characterRoot.position.set(0,0,0);
    characterRoot.quaternion.identity();
  }
  activeClip='';
  document.querySelectorAll('[data-clip]').forEach(b=>b.classList.remove('active'));
  setStatus('기본 바인드 자세로 돌아왔습니다.');
}

function applyBodyStyle(name){
  const profile=BODY_STYLES[name];
  if(!profile)return;
  bodyStyle=name;
  for(const [key,value] of Object.entries(profile.defaults)){
    const el=$(key);
    if(el)el.value=String(value);
  }
  document.querySelectorAll('[data-body-style]').forEach(b=>b.classList.toggle('active',b.dataset.bodyStyle===name));
  syncOutputs();
  buildCharacter();
}

function download(name,blob){
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1200);
}

function exportSpec(){
  readParams();
  const spec={
    version:2,
    type:'kidscade-humanoid-rig-spec',
    rigVersion:RIG_VERSION,
    bodyStyle,
    bodyStyleLabel:BODY_STYLES[bodyStyle]?.label||bodyStyle,
    generatedAt:new Date().toISOString(),
    coordinateSystem:{up:'Y',units:'meters',origin:'ground-center',forward:'+Z'},
    parameters:{...params},
    proportionGuide:bodyStyle==='legacy'
      ?{headsTall:'legacy',headHeightRatio:.15}
      :{headsTall:bodyStyle==='action2'?'about 3.05':'about 2.9',headHeightRatio:Number((currentDim?.headRY*2/currentDim?.H||0).toFixed(3))},
    bones:skinnedMesh?.skeleton?.bones.map(b=>({name:b.name,parent:b.parent?.isBone?b.parent.name:null}))||[],
    clips:clips.map(c=>({name:c.name,duration:Number(c.duration.toFixed(3)),tracks:c.tracks.map(t=>t.name)})),
    skinning:'rigid-single-bone-weight',
    reuseRule:'Characters using the same bone names and hierarchy can share retargeted Kidscade humanoid animations.'
  };
  download('kidscade-humanoid-rig-spec.json',new Blob([JSON.stringify(spec,null,2)+'\n'],{type:'application/json'}));
  setStatus('리그 규격 JSON을 저장했습니다.');
}

async function exportGlb(){
  if(!characterRoot||!skinnedMesh)return;
  setStatus('GLB를 만드는 중…');
  const wasHelper=skeletonHelper?.visible;
  const resumeClip=activeClip;
  const resumeRotation=characterRoot.rotation.y;
  if(skeletonHelper)skeletonHelper.visible=false;

  if(activeAction)activeAction.stop();
  mixer?.stopAllAction();
  skinnedMesh.skeleton.pose();
  characterRoot.position.set(0,0,0);
  characterRoot.rotation.set(0,0,0);
  characterRoot.updateMatrixWorld(true);

  const restorePreview=()=>{
    characterRoot.rotation.y=resumeRotation;
    if(skeletonHelper)skeletonHelper.visible=wasHelper;
    if(resumeClip)playClip(resumeClip);
  };

  let GLTFExporter;
  try{
    ({GLTFExporter}=await import('../assets/vendor/three-r160/addons/exporters/GLTFExporter.js'));
  }catch(error){
    restorePreview();
    console.error(error);
    setStatus('GLB exporter를 불러오지 못했습니다. 미리보기와 리깅은 정상 사용 가능합니다.',true);
    return;
  }

  const exporter=new GLTFExporter();
  exporter.parse(
    characterRoot,
    result=>{
      restorePreview();
      const blob=result instanceof ArrayBuffer
        ?new Blob([result],{type:'model/gltf-binary'})
        :new Blob([JSON.stringify(result)],{type:'model/gltf+json'});
      download('kidscade-'+bodyStyle+'-rigged-character.glb',blob);
      setStatus('GLB 저장 완료 · 바인드 자세 + 스켈레톤 + '+clips.length+'개 애니메이션');
    },
    error=>{
      restorePreview();
      console.error(error);
      setStatus('GLB 내보내기에 실패했습니다: '+(error?.message||error),true);
    },
    {binary:true,trs:true,onlyVisible:false,animations:clips,includeCustomExtensions:false}
  );
}

function wireUi(){
  ['height','headScale','shoulderScale','limbScale'].forEach(id=>{
    $(id).addEventListener('input',syncOutputs);
    $(id).addEventListener('change',buildCharacter);
  });
  ['skinColor','hairColor','topColor','bottomColor','shoeColor','eyeColor'].forEach(id=>$(id).addEventListener('change',buildCharacter));
  $('rebuild').addEventListener('click',buildCharacter);
  $('showBones').addEventListener('change',()=>{if(skeletonHelper)skeletonHelper.visible=$('showBones').checked});
  $('resetPose').addEventListener('click',resetPose);
  $('exportGlb').addEventListener('click',exportGlb);
  $('exportSpec').addEventListener('click',exportSpec);
  $('speed').addEventListener('input',()=>{if(activeAction)activeAction.setEffectiveTimeScale(Number($('speed').value))});
  document.querySelectorAll('[data-clip]').forEach(b=>b.addEventListener('click',()=>playClip(b.dataset.clip)));
  document.querySelectorAll('[data-body-style]').forEach(b=>b.addEventListener('click',()=>applyBodyStyle(b.dataset.bodyStyle)));
  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setCameraView(b.dataset.view)));
}

function loop(now){
  requestAnimationFrame(loop);
  const dt=Math.min(.05,(now-lastTime)/1000);
  lastTime=now;
  if(mixer)mixer.update(dt);
  if(characterRoot&&$('autoRotate')?.checked)characterRoot.rotation.y+=dt*.55;
  controls?.update();
  renderer?.render(scene,camera);
}

async function boot(){
  const ok=await authorize();
  if(!ok)return;
  initScene();
  wireUi();
  syncOutputs();
  try{buildCharacter()}catch(error){
    console.error(error);
    setStatus('초기 캐릭터 생성 실패: '+(error?.message||error),true);
  }
  requestAnimationFrame(loop);
}

boot();

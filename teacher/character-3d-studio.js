import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

window.__kc3dStudioModuleReady=true;

const ADMIN_KEY_NAME='kc_teacher_admin_key';
const RIG_VERSION='kidscade-humanoid-v1';
const CLIP_NAMES=['IDLE','WALK','RUN','JUMP','ATTACK','HURT','DEAD'];
const $=id=>document.getElementById(id);

let scene,camera,renderer,controls,characterRoot,skinnedMesh,skeletonHelper,mixer;
let clips=[],activeAction=null,activeClip='IDLE',lastTime=performance.now();

const params={
  height:1.35,
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

const PRESETS={
  kid:{height:1.35,headScale:1.02,shoulderScale:.94,limbScale:1.02,topColor:'#5b7cfa',bottomColor:'#34495e'},
  chibi:{height:1.22,headScale:1.28,shoulderScale:.88,limbScale:1.08,topColor:'#ef6f9b',bottomColor:'#4d5f82'},
  hero:{height:1.48,headScale:.90,shoulderScale:1.15,limbScale:1.08,topColor:'#2f8f6b',bottomColor:'#5a4538'},
  slim:{height:1.52,headScale:.92,shoulderScale:.96,limbScale:.78,topColor:'#7758c8',bottomColor:'#30364a'}
};

function setStatus(text,error=false){
  const el=$('status');
  if(!el)return;
  el.textContent=text;
  el.className='status'+(error?' error':'');
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

  controls=new OrbitControls(camera,canvas);
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
  const hair=new THREE.Mesh(
    new THREE.SphereGeometry(1,10,6,0,Math.PI*2,0,Math.PI*.57),
    materials[4]
  );
  hair.name='Hair';
  hair.scale.set(dim.headRX*1.055,dim.headRY*1.03,dim.headRZ*1.055);
  hair.position.set(0,dim.headCenterY-dim.headBoneY+.014*dim.H,-.005*dim.H);
  hair.castShadow=true;
  headBone.add(hair);

  const eyeGeo=new THREE.SphereGeometry(.012*dim.H,7,5);
  const eyeMat=materials[5];
  for(const side of [-1,1]){
    const eye=new THREE.Mesh(eyeGeo.clone(),eyeMat);
    eye.name=side<0?'Eye_L':'Eye_R';
    eye.position.set(side*dim.headRX*.39,dim.headCenterY-dim.headBoneY+.012*dim.H,dim.headRZ*.91);
    eye.scale.set(1,.88,.55);
    headBone.add(eye);
  }

  const nose=new THREE.Mesh(new THREE.BoxGeometry(.018*dim.H,.018*dim.H,.025*dim.H),materials[0]);
  nose.name='Nose';
  nose.position.set(0,dim.headCenterY-dim.headBoneY-.018*dim.H,dim.headRZ*.96);
  headBone.add(nose);
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
  const dim={
    H,
    ankleY:.065*H,
    kneeY:.292*H,
    hipY:.515*H,
    spineY:.615*H,
    chestY:.715*H,
    shoulderY:.755*H,
    neckY:.835*H,
    headBoneY:.855*H,
    headCenterY:.925*H,
    headRX:.092*H*params.headScale,
    headRY:.075*H*params.headScale,
    headRZ:.088*H*params.headScale,
    shoulderX:.145*H*params.shoulderScale,
    hipX:.075*H,
    upperArmLen:.185*H,
    lowerArmLen:.17*H,
    upperLegLen:(.515-.292)*H,
    lowerLegLen:(.292-.065)*H,
    limb:.055*H*params.limbScale
  };

  characterRoot=new THREE.Group();
  characterRoot.name='KidscadeCharacter';
  characterRoot.userData={
    type:'kidscade-rigged-character',
    rigVersion:RIG_VERSION,
    units:'meters',
    upAxis:'Y',
    groundOrigin:true,
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
    mat(params.topColor,.78),
    mat(params.bottomColor,.83),
    mat(params.shoeColor,.72),
    mat(params.hairColor,.9),
    mat(params.eyeColor,.8)
  ];
  materials.forEach((m,i)=>m.name=['Skin','Top','Bottom','Shoes','Hair','Eyes'][i]);

  const geoms=[];
  const materialSlots=[];
  const push=(g,slot)=>{geoms.push(g);materialSlots.push(slot)};

  const torsoW=dim.shoulderX*1.62;
  push(boxPart([torsoW,.23*H,.13*H],[0,.695*H,0],boneIndex.Chest),1);
  push(boxPart([.225*H,.095*H,.13*H],[0,.49*H,0],boneIndex.Hips),2);
  push(cylinderPart(.028*H,.04*H,[0,.842*H,0],boneIndex.Neck),0);
  push(spherePart([dim.headRX,dim.headRY,dim.headRZ],[0,dim.headCenterY,0],boneIndex.Head),0);

  for(const side of [-1,1]){
    const suffix=side>0?'L':'R';
    const sx=side*dim.shoulderX;
    const hipX=side*dim.hipX;
    const uArm=boneIndex['UpperArm_'+suffix],lArm=boneIndex['LowerArm_'+suffix],hand=boneIndex['Hand_'+suffix];
    const uLeg=boneIndex['UpperLeg_'+suffix],lLeg=boneIndex['LowerLeg_'+suffix],foot=boneIndex['Foot_'+suffix];

    push(boxPart([dim.limb,dim.upperArmLen*.96,dim.limb],[sx,dim.shoulderY-dim.upperArmLen*.48,0],uArm),1);
    push(boxPart([dim.limb*.88,dim.lowerArmLen*.95,dim.limb*.88],[sx,dim.shoulderY-dim.upperArmLen-dim.lowerArmLen*.475,0],lArm),0);
    push(spherePart([dim.limb*.58,.038*H,dim.limb*.58],[sx,dim.shoulderY-dim.upperArmLen-dim.lowerArmLen-.032*H,0],hand,8,5),0);

    push(boxPart([dim.limb*1.18,dim.upperLegLen*.97,dim.limb*1.18],[hipX,dim.hipY-dim.upperLegLen*.485,0],uLeg),2);
    push(boxPart([dim.limb,dim.lowerLegLen*.96,dim.limb],[hipX,dim.kneeY-dim.lowerLegLen*.48,0],lLeg),0);
    push(boxPart([dim.limb*1.28,.055*H,.135*H],[hipX,.033*H,.035*H],foot),3);
  }

  const merged=mergeGeometries(geoms,true);
  geoms.forEach(g=>g.dispose());
  if(!merged)throw new Error('캐릭터 메시 병합에 실패했습니다.');
  for(let i=0;i<merged.groups.length;i++)merged.groups[i].materialIndex=materialSlots[i]??0;
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
  $('rigBadge').textContent='✓ Humanoid Rig · '+bones.length+' bones';
  $('clipBadge').textContent=clips.length+' clips';

  controls.target.set(0,H*.52,0);
  camera.position.set(H*1.75,H*1.18,H*2.35);
  controls.update();

  playClip(activeClip);
  setStatus('생성 완료 · '+bones.length+' bones · '+triangles.toLocaleString()+' triangles');
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

function applyPreset(name){
  const p=PRESETS[name];
  if(!p)return;
  for(const [key,value] of Object.entries(p)){
    const el=$(key);
    if(el)el.value=String(value);
  }
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
    version:1,
    type:'kidscade-humanoid-rig-spec',
    rigVersion:RIG_VERSION,
    generatedAt:new Date().toISOString(),
    coordinateSystem:{up:'Y',units:'meters',origin:'ground-center',forward:'+Z'},
    parameters:{...params},
    bones:skinnedMesh?.skeleton?.bones.map(b=>({name:b.name,parent:b.parent?.isBone?b.parent.name:null}))||[],
    clips:clips.map(c=>({name:c.name,duration:Number(c.duration.toFixed(3)),tracks:c.tracks.map(t=>t.name)})),
    skinning:'rigid-single-bone-weight',
    reuseRule:'Characters using the same bone names and hierarchy can share retargeted Kidscade humanoid animations.'
  };
  download('kidscade-humanoid-rig-spec.json',new Blob([JSON.stringify(spec,null,2)+'\n'],{type:'application/json'}));
  setStatus('리그 규격 JSON을 저장했습니다.');
}

function exportGlb(){
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

  const exporter=new GLTFExporter();
  exporter.parse(
    characterRoot,
    result=>{
      restorePreview();
      const blob=result instanceof ArrayBuffer
        ?new Blob([result],{type:'model/gltf-binary'})
        :new Blob([JSON.stringify(result)],{type:'model/gltf+json'});
      download('kidscade-rigged-character.glb',blob);
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
  document.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>applyPreset(b.dataset.preset)));
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

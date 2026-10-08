import * as THREE from '../assets/vendor/three-r160/three.module.js';

window.__kc3dStudioModuleReady=true;

const ADMIN_KEY_NAME='kc_teacher_admin_key';
const CHIBI_ASSET_URL='/assets/game/chibi/ChibiCharactersV1.2/ChibiCharacters/glb/allinonepr.glb';
const CHIBI_SOURCE='Styloo Chibi Characters v1.2';
const CHIBI_LICENSE='CC0-1.0';
const TARGET_HEIGHT=1.22;
const $=id=>document.getElementById(id);

const FEMALE_BASE_NODES=['character_low','eyelashes','eyes','tooth'];
const MALE_BASE_NODES=['kidscade_male_body','kidscade_male_eyes','kidscade_male_brows','tooth'];
const BASE_VARIANT_NODES=[...new Set([...FEMALE_BASE_NODES,...MALE_BASE_NODES])];
const BASE_NODES=FEMALE_BASE_NODES;
const HAIR_NODES=['hairone','hairT','hairtail','hairtailknight','hairvariant','hairvariant.001','kidscade_male_hair_short'];

const PRESETS={
  base:[...FEMALE_BASE_NODES],
  male:[...MALE_BASE_NODES,'kidscade_male_hair_short','kidscade_male_tshirt','kidscade_male_shorts','shoe'],
  hoodie:[...FEMALE_BASE_NODES,'hairvariant','kidscade_hoodie_blue','pants','shoe'],
  student:[...BASE_NODES,'hairvariant','shirt','skirt','shoe','bag'],
  merchant:[...BASE_NODES,'hairone','chemise','pants','bottes','hat'],
  archer:[...BASE_NODES,'hairvariant.001','greenoutfit','greenoutfitbelt','greenoutfitneckless','bottesgreen'],
  ninja:[...BASE_NODES,'hairtail','ninjassuit','ninjassuitmask','ninjassuitshoe','ninjassuitthigh','ninjasuitshort'],
  knight:[...BASE_NODES,'hairtailknight','amorarm','amorplastron','armorceinturethighs','armorhelmet','armorknees','armorlegs','armorshoe','armorskirt','armorthigh','ceinture']
};

const PART_LABELS={
  amorarm:'갑옷 팔',amorplastron:'갑옷 흉갑',armorceinturethighs:'갑옷 허리',
  armorhelmet:'기사 투구',armorknees:'무릎 갑옷',armorlegs:'다리 갑옷',armorshoe:'갑옷 신발',
  armorskirt:'갑옷 스커트',armorthigh:'허벅지 갑옷',bag:'학생 가방',bottes:'상인 부츠',
  bottesgreen:'궁수 부츠',ceinture:'기사 벨트',chemise:'상인 셔츠',greenoutfit:'궁수 의상',
  greenoutfitbelt:'궁수 벨트',greenoutfitneckless:'궁수 목걸이',hairone:'단정한 헤어',
  hairT:'T 헤어',hairtail:'포니테일',hairtailknight:'기사 헤어',hairvariant:'학생 헤어',
  'hairvariant.001':'궁수 헤어',hat:'상인 모자',ninjassuit:'닌자 상의',ninjassuitmask:'닌자 마스크',
  ninjassuitshoe:'닌자 신발',ninjassuitthigh:'닌자 허벅지',ninjasuitshort:'닌자 하의',
  pants:'상인 바지',shirt:'학생 셔츠',shoe:'학생 신발',skirt:'학생 치마',
  kidscade_hoodie_blue:'파란 후드티',
  kidscade_male_hair_short:'남자 짧은 머리',
  kidscade_male_tshirt:'남자 기본 티셔츠',
  kidscade_male_shorts:'남자 기본 반바지'
};

const TOGGLE_NODES=Object.keys(PART_LABELS);
const TRACKED_PART_NODES=[...new Set([...BASE_VARIANT_NODES,...TOGGLE_NODES])];

const CLIP_LABELS={
  anim_iddle:'IDLE','anim_iddle.001':'IDLE ALT',anim_walk:'WALK',anim_run:'RUN',
  anim_jump:'JUMP',anim_flip:'FLIP',anim_push:'PUSH',anim_crouch:'CROUCH',
  anim_crouchiddle:'CROUCH IDLE',anim_uncrouch:'STAND',anim_dying:'DYING',
  iddleanim_:'IDLE','iddle.001anim_':'IDLE ALT',walkanim_:'WALK',runanim_:'RUN',
  jumpanim_:'JUMP',flipanim_:'FLIP',pushanim_:'PUSH',crouchanim_:'CROUCH',
  crouchiddleanim_:'CROUCH IDLE',uncrouchanim_:'STAND',dyinganim_:'DYING'
};

let scene,camera,renderer,controls;
let avatarRoot=null,sourceScene=null,primarySkinnedMesh=null,skeletonHelper=null,mixer=null;
let animations=[],activeAction=null,activeClip='',currentPreset='male',activeView='threeQuarter';
let maleWalkClips=new Map(),maleRunClips=new Map();
let originalMaterials=new Map();
let loaded=false;
let lastTime=performance.now();

function setStatus(text,error=false){
  const el=$('status');
  if(!el)return;
  el.textContent=text;
  el.className='status'+(error?' error':'');
}

function setAssetStatus(text,error=false){
  const el=$('chibiAssetStatus');
  if(!el)return;
  el.textContent=text;
  el.className='asset-status'+(error?' error':'');
}

function setReady(ready){
  loaded=!!ready;
  $('exportGlb').disabled=!ready;
  $('exportSpec').disabled=!ready;
  $('chibiHair').disabled=!ready;
  $('chibiUnlit').disabled=!ready;
  document.querySelectorAll('[data-chibi-preset],[data-view]').forEach(el=>el.disabled=!ready);
}

function showAssetError(message){
  setReady(false);
  const box=$('assetMissing');
  box.classList.remove('hidden');
  box.innerHTML=message;
  setAssetStatus('Chibi GLB 로드 실패',true);
  setStatus('Chibi 에셋이 없어 제작실을 시작할 수 없습니다.',true);
  $('rigBadge').textContent='Chibi GLB 없음';
  $('polyBadge').textContent='0 triangles';
  $('clipBadge').textContent='0 clips';
}

function clearAssetError(){
  $('assetMissing').classList.add('hidden');
  $('assetMissing').textContent='';
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

function createOrbitControls(camera,domElement){
  const target=new THREE.Vector3(0,TARGET_HEIGHT*.52,0);
  let theta=.72,phi=1.12,radius=2.7;
  let minDistance=.8,maxDistance=5,maxPolarAngle=Math.PI*.49;
  const pointers=new Map();
  let previousPinch=0;

  const syncFromCamera=()=>{
    const offset=camera.position.clone().sub(target);
    radius=Math.max(.01,offset.length());
    theta=Math.atan2(offset.x,offset.z);
    phi=Math.acos(THREE.MathUtils.clamp(offset.y/radius,-1,1));
  };

  const update=()=>{
    radius=THREE.MathUtils.clamp(radius,minDistance,maxDistance);
    phi=THREE.MathUtils.clamp(phi,.10,maxPolarAngle);
    const sin=Math.sin(phi);
    camera.position.set(
      target.x+radius*sin*Math.sin(theta),
      target.y+radius*Math.cos(phi),
      target.z+radius*sin*Math.cos(theta)
    );
    camera.lookAt(target);
  };

  domElement.addEventListener('pointerdown',event=>{
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    domElement.setPointerCapture?.(event.pointerId);
    if(pointers.size===2){
      const p=[...pointers.values()];
      previousPinch=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);
    }
  });

  domElement.addEventListener('pointermove',event=>{
    const previous=pointers.get(event.pointerId);
    if(!previous)return;
    const next={x:event.clientX,y:event.clientY};
    pointers.set(event.pointerId,next);

    if(pointers.size===1){
      theta-=(next.x-previous.x)*.008;
      phi-=(next.y-previous.y)*.008;
      update();
      return;
    }

    if(pointers.size===2){
      const p=[...pointers.values()];
      const pinch=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);
      if(previousPinch>0&&pinch>0){
        radius*=previousPinch/pinch;
        update();
      }
      previousPinch=pinch;
    }
  });

  const release=event=>{
    pointers.delete(event.pointerId);
    previousPinch=0;
    try{domElement.releasePointerCapture?.(event.pointerId)}catch(_){}
  };
  domElement.addEventListener('pointerup',release);
  domElement.addEventListener('pointercancel',release);
  domElement.addEventListener('wheel',event=>{
    event.preventDefault();
    radius*=Math.exp(event.deltaY*.0011);
    update();
  },{passive:false});

  syncFromCamera();
  update();

  return {
    target,update,syncFromCamera,
    get minDistance(){return minDistance},set minDistance(v){minDistance=v;update()},
    get maxDistance(){return maxDistance},set maxDistance(v){maxDistance=v;update()},
    get maxPolarAngle(){return maxPolarAngle},set maxPolarAngle(v){maxPolarAngle=v;update()}
  };
}

function initScene(){
  const canvas=$('view');
  scene=new THREE.Scene();
  scene.background=new THREE.Color(0x1d2935);
  scene.fog=new THREE.Fog(0x1d2935,6,11);

  camera=new THREE.PerspectiveCamera(38,1,.01,40);
  camera.position.set(1.7,1.25,2.2);

  renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.8));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.05;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;

  scene.add(new THREE.HemisphereLight(0xf3f8ff,0x56616a,2.1));
  const sun=new THREE.DirectionalLight(0xffffff,2.8);
  sun.position.set(3,5,4);
  sun.castShadow=true;
  scene.add(sun);

  const floor=new THREE.Mesh(
    new THREE.CircleGeometry(3.3,48),
    new THREE.MeshStandardMaterial({color:0x52636d,roughness:.98,metalness:0})
  );
  floor.rotation.x=-Math.PI/2;
  floor.position.y=-.006;
  floor.receiveShadow=true;
  scene.add(floor);

  const grid=new THREE.GridHelper(6,30,0x81929f,0x465863);
  grid.position.y=.002;
  scene.add(grid);

  controls=createOrbitControls(camera,canvas);
  controls.minDistance=.75;
  controls.maxDistance=4.5;
  controls.maxPolarAngle=Math.PI*.49;

  addEventListener('resize',resize);
  resize();
}

function resize(){
  if(!renderer)return;
  const rect=$('view').getBoundingClientRect();
  const w=Math.max(1,Math.floor(rect.width));
  const h=Math.max(1,Math.floor(rect.height));
  renderer.setSize(w,h,false);
  camera.aspect=w/h;
  camera.updateProjectionMatrix();
}

function isEffectivelyVisible(object,root){
  let current=object;
  while(current&&current!==root){
    if(current.visible===false)return false;
    current=current.parent;
  }
  return root?.visible!==false;
}

function countVisibleTriangles(root){
  let total=0;
  root?.traverse?.(object=>{
    if(!object.isMesh||!object.geometry||!isEffectivelyVisible(object,root))return;
    total+=object.geometry.index
      ?object.geometry.index.count/3
      :(object.geometry.getAttribute('position')?.count||0)/3;
  });
  return Math.round(total);
}

function visibleBounds(root){
  const box=new THREE.Box3();
  const temp=new THREE.Box3();
  let found=false;
  root.updateMatrixWorld(true);
  root.traverse(object=>{
    if(!object.isMesh||!object.geometry||!isEffectivelyVisible(object,root))return;
    if(!object.geometry.boundingBox)object.geometry.computeBoundingBox();
    if(!object.geometry.boundingBox)return;
    temp.copy(object.geometry.boundingBox).applyMatrix4(object.matrixWorld);
    box.union(temp);
    found=true;
  });
  return found?box:null;
}

function normalizeRuntimeNodeName(name){
  const raw=String(name||'');
  const sanitized=THREE.PropertyBinding?.sanitizeNodeName
    ?THREE.PropertyBinding.sanitizeNodeName(raw)
    :raw.split('.').join('').split(':').join('').split('/').join('').split('[').join('').split(']').join('').split(' ').join('_');
  return sanitized.toLowerCase();
}

function getNode(name){
  if(!sourceScene)return null;
  const direct=sourceScene.getObjectByName(name);
  if(direct)return direct;

  const wanted=normalizeRuntimeNodeName(name);
  let found=null;
  sourceScene.traverse(object=>{
    if(found)return;
    if(normalizeRuntimeNodeName(object.name)===wanted)found=object;
  });
  return found;
}

function setNodeVisible(name,visible){
  const object=getNode(name);
  if(object)object.visible=!!visible;
}

function selectedParts(){
  return TRACKED_PART_NODES.filter(name=>getNode(name)?.visible);
}

function renderPartChecks(){
  const host=$('wardrobeParts');
  host.innerHTML=TOGGLE_NODES.map(name=>{
    const exists=!!getNode(name);
    return '<label class="part-check"><input type="checkbox" data-chibi-part="'+name+'" '+(exists?'':'disabled')+'> '+(PART_LABELS[name]||name)+'</label>';
  }).join('');
  refreshPartChecks();
}

function refreshPartChecks(){
  document.querySelectorAll('[data-chibi-part]').forEach(input=>{
    const object=getNode(input.dataset.chibiPart);
    input.checked=!!object?.visible;
    input.disabled=!object||!loaded;
  });
}

function applyHair(name){
  HAIR_NODES.forEach(hair=>setNodeVisible(hair,false));
  if(name)setNodeVisible(name,true);
  $('chibiHair').value=name||'';
  refreshPartChecks();
  refreshMetrics();
}

function applyPreset(name){
  if(!sourceScene||!PRESETS[name])return;
  currentPreset=name;
  const wanted=new Set(PRESETS[name]);
  if(name==='male'&&!$('maleBrowPreview').checked)wanted.delete('kidscade_male_brows');
  $('maleBrowPreview').disabled=name!=='male';

  // 여자/남자 베이스는 동시에 켜지지 않는다.
  BASE_VARIANT_NODES.forEach(node=>setNodeVisible(node,false));
  BASE_VARIANT_NODES.forEach(node=>{
    if(wanted.has(node))setNodeVisible(node,true);
  });

  // 헤어도 항상 한 종류만 보이게 한다.
  HAIR_NODES.forEach(node=>setNodeVisible(node,false));
  TOGGLE_NODES.filter(node=>!HAIR_NODES.includes(node)).forEach(node=>{
    setNodeVisible(node,wanted.has(node));
  });

  const hair=HAIR_NODES.find(node=>wanted.has(node))||'';
  if(hair)setNodeVisible(hair,true);
  $('chibiHair').value=hair;
  document.querySelectorAll('[data-chibi-preset]').forEach(button=>{
    button.classList.toggle('active',button.dataset.chibiPreset===name);
  });
  refreshPartChecks();
  refreshMetrics();
  // 프리셋 전환 중 WALK를 재생하고 있었다면 현재 몸체에 맞는 클립으로 전환한다.
  syncActiveWalkStyle();
}


function makeSolidMaterial(color,name){
  const material=new THREE.MeshStandardMaterial({
    color:new THREE.Color(color),
    roughness:.92,
    metalness:0
  });
  material.name=name;
  return material;
}

function normalizeRuntimeBoneName(name){
  const raw=String(name||'');
  const sanitized=THREE.PropertyBinding?.sanitizeNodeName
    ?THREE.PropertyBinding.sanitizeNodeName(raw)
    :raw.split('.').join('').split(':').join('').split('/').join('').split('[').join('').split(']').join('').split(' ').join('_');
  return sanitized.toLowerCase();
}

function resolveBoneIndex(skeleton,boneName){
  const wanted=normalizeRuntimeBoneName(boneName);
  return skeleton.bones.findIndex(bone=>
    bone.name===boneName || normalizeRuntimeBoneName(bone.name)===wanted
  );
}

function addRigidSkinAttributes(geometry,skeleton,boneName){
  const boneIndex=resolveBoneIndex(skeleton,boneName);
  if(boneIndex<0){
    const spineNames=skeleton.bones
      .map(bone=>bone.name)
      .filter(name=>/spine/i.test(name))
      .join(', ');
    throw new Error('후드티용 본을 찾지 못했습니다: '+boneName+' · 사용 가능한 spine: '+spineNames);
  }
  const count=geometry.getAttribute('position').count;
  const indices=new Uint16Array(count*4);
  const weights=new Float32Array(count*4);
  for(let i=0;i<count;i++){
    indices[i*4]=boneIndex;
    weights[i*4]=1;
  }
  geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));
  geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
}

function makeRigidSkinnedPiece(template,geometry,boneName,material,name){
  addRigidSkinAttributes(geometry,template.skeleton,boneName);
  const mesh=new THREE.SkinnedMesh(geometry,material);
  mesh.name=name;
  mesh.bindMode=template.bindMode;
  mesh.bind(template.skeleton,template.bindMatrix);
  mesh.position.copy(template.position);
  mesh.quaternion.copy(template.quaternion);
  mesh.scale.copy(template.scale);
  mesh.castShadow=true;
  mesh.receiveShadow=true;
  mesh.frustumCulled=false;
  return mesh;
}

function resolveFirstBoneName(skeleton,candidates){
  for(const name of candidates){
    if(resolveBoneIndex(skeleton,name)>=0)return name;
  }
  throw new Error('후드티용 본 후보를 찾지 못했습니다: '+candidates.join(', '));
}

function makeTubeGeometry(points,radius=.0022,tubularSegments=12){
  const curve=new THREE.CatmullRomCurve3(points,false,'centripetal',.55);
  const geometry=new THREE.TubeGeometry(curve,tubularSegments,radius,5,false);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function makeBoundSeam(template,points,boneName,material,name,radius=.0022){
  return makeRigidSkinnedPiece(
    template,
    makeTubeGeometry(points,radius,12),
    boneName,
    material,
    name
  );
}

function makeSleeveGeometry(start,end,shoulderRadius=.078,cuffRadius=.062){
  const direction=end.clone().sub(start);
  const length=direction.length();
  const geometry=new THREE.CylinderGeometry(cuffRadius,shoulderRadius,length,12,2,false);
  const midpoint=start.clone().add(end).multiplyScalar(.5);
  const quaternion=new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0,1,0),
    direction.clone().normalize()
  );
  const matrix=new THREE.Matrix4().compose(
    midpoint,
    quaternion,
    new THREE.Vector3(1,1,1)
  );
  geometry.applyMatrix4(matrix);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function createKidscadeBlueHoodie(){
  if(getNode('kidscade_hoodie_blue'))return getNode('kidscade_hoodie_blue');

  const shirt=getNode('shirt');
  if(!shirt?.isSkinnedMesh)throw new Error('후드티 베이스가 될 shirt SkinnedMesh를 찾지 못했습니다.');

  const group=new THREE.Group();
  group.name='kidscade_hoodie_blue';
  group.userData={
    type:'kidscade-custom-garment',
    label:'파란 후드티',
    base:'shirt',
    author:'Kidscade',
    createdFromCc0:true
  };

  const bodyGeometry=shirt.geometry.clone();
  const pos=bodyGeometry.getAttribute('position');
  const centerY=.98;
  for(let i=0;i<pos.count;i++){
    let x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);

    // 몸통은 허리가 들어가지 않는 박시한 후드티 실루엣으로 만든다.
    const torsoVertex=Math.abs(x)<.225;
    if(torsoVertex&&y<1.02){
      const lower=Math.max(0,Math.min(1,(1.02-y)/.28));
      x*=1.10+lower*.08;
    }else{
      x*=1.075;
    }

    y=centerY+(y-centerY)*1.025;
    if(torsoVertex&&y<.84)y-=.018;
    z=z*1.105+(z>0?.008:-.006);

    // 목은 과하게 조이지 않고 살짝만 정돈한다. 실제 마감은 아래의 얇은 시보리가 담당한다.
    if(torsoVertex&&y>1.075){
      const t=Math.min(1,(y-1.075)/.13);
      x*=1-t*.035;
      z+=t*.006;
    }

    pos.setXYZ(i,x,y,z);
  }
  pos.needsUpdate=true;
  bodyGeometry.computeVertexNormals();
  bodyGeometry.computeBoundingBox();
  bodyGeometry.computeBoundingSphere();

  const blue=makeSolidMaterial('#4f7df3','Kidscade Hoodie Blue');
  const darkBlue=makeSolidMaterial('#3b63cc','Kidscade Hoodie Detail');
  const seamBlue=makeSolidMaterial('#6687e6','Kidscade Hoodie Stitch');
  const white=makeSolidMaterial('#f8fafc','Kidscade Hoodie String');

  const body=new THREE.SkinnedMesh(bodyGeometry,blue);
  body.name='kidscade_hoodie_blue_body';
  body.bindMode=shirt.bindMode;
  body.bind(shirt.skeleton,shirt.bindMatrix);
  body.position.copy(shirt.position);
  body.quaternion.copy(shirt.quaternion);
  body.scale.copy(shirt.scale);
  body.castShadow=true;
  body.receiveShadow=true;
  body.frustumCulled=false;
  group.add(body);

  const upperSpineBone=resolveFirstBoneName(shirt.skeleton,[
    'DEF-spine.003','DEF-spine.002','DEF-spine.001','spine','Spine'
  ]);
  const lowerSpineBone=resolveFirstBoneName(shirt.skeleton,[
    'DEF-spine.001','DEF-spine.002','spine','Spine'
  ]);
  const upperArmLBone=resolveFirstBoneName(shirt.skeleton,[
    'DEF-upper_arm.L','DEF-upper_arm.L.001','upper_arm.L','UpperArm_L'
  ]);
  const upperArmRBone=resolveFirstBoneName(shirt.skeleton,[
    'DEF-upper_arm.R','DEF-upper_arm.R.001','upper_arm.R','UpperArm_R'
  ]);

  // 실제 소매 덩어리: 어깨에서 팔꿈치 위까지 넉넉하게 떨어지는 반소매.
  const sleeveL=makeSleeveGeometry(
    new THREE.Vector3(.145,1.105,-.004),
    new THREE.Vector3(.265,1.018,-.038),
    .076,.060
  );
  const sleeveR=makeSleeveGeometry(
    new THREE.Vector3(-.145,1.105,-.004),
    new THREE.Vector3(-.265,1.018,-.038),
    .076,.060
  );
  group.add(makeRigidSkinnedPiece(
    shirt,sleeveL,upperArmLBone,blue,'kidscade_hoodie_blue_sleeve_L'
  ));
  group.add(makeRigidSkinnedPiece(
    shirt,sleeveR,upperArmRBone,blue,'kidscade_hoodie_blue_sleeve_R'
  ));

  // 뒤쪽에서 실제로 보이는 후드 볼륨.
  const hoodBackGeometry=new THREE.SphereGeometry(.195,16,10,0,Math.PI*2,0,Math.PI*.72);
  hoodBackGeometry.scale(1.04,.78,.58);
  hoodBackGeometry.translate(0,1.205,-.145);
  hoodBackGeometry.computeVertexNormals();
  hoodBackGeometry.computeBoundingBox();
  hoodBackGeometry.computeBoundingSphere();
  group.add(makeRigidSkinnedPiece(
    shirt,hoodBackGeometry,upperSpineBone,blue,'kidscade_hoodie_blue_hood_back'
  ));

  // 목 둘레는 셔츠 깃처럼 튀지 않는 얇은 둥근 시보리만 남긴다.
  const collarGeometry=new THREE.TorusGeometry(.087,.008,8,24);
  collarGeometry.rotateX(Math.PI/2);
  collarGeometry.scale(1.05,.72,1);
  collarGeometry.translate(0,1.116,.035);
  collarGeometry.computeVertexNormals();
  collarGeometry.computeBoundingBox();
  collarGeometry.computeBoundingSphere();
  group.add(makeRigidSkinnedPiece(
    shirt,collarGeometry,upperSpineBone,darkBlue,'kidscade_hoodie_blue_collar'
  ));

  // 몸통/소매 경계 재봉선은 본체보다 아주 조금만 밝고 얇게.
  group.add(makeBoundSeam(
    shirt,
    [
      new THREE.Vector3(-.050,1.102,.111),
      new THREE.Vector3(-.110,1.086,.109),
      new THREE.Vector3(-.165,1.047,.103),
      new THREE.Vector3(-.205,.995,.096)
    ],
    upperSpineBone,seamBlue,'kidscade_hoodie_blue_seam_left',.0018
  ));
  group.add(makeBoundSeam(
    shirt,
    [
      new THREE.Vector3(.050,1.102,.111),
      new THREE.Vector3(.110,1.086,.109),
      new THREE.Vector3(.165,1.047,.103),
      new THREE.Vector3(.205,.995,.096)
    ],
    upperSpineBone,seamBlue,'kidscade_hoodie_blue_seam_right',.0018
  ));

  // 몸통에 밀착되는 얇은 곡면형 캥거루 포켓
  const pocketShape=new THREE.Shape();
  pocketShape.moveTo(-.135,.040);
  pocketShape.lineTo(-.095,.090);
  pocketShape.quadraticCurveTo(0,.118,.095,.090);
  pocketShape.lineTo(.135,.040);
  pocketShape.lineTo(.108,-.055);
  pocketShape.quadraticCurveTo(0,-.092,-.108,-.055);
  pocketShape.closePath();

  const pocketGeometry=new THREE.ExtrudeGeometry(pocketShape,{
    depth:.012,
    bevelEnabled:true,
    bevelThickness:.004,
    bevelSize:.004,
    bevelSegments:2,
    curveSegments:10,
    steps:1
  });
  pocketGeometry.translate(0,0,-.006);
  pocketGeometry.scale(1,.94,1);
  pocketGeometry.translate(0,.855,.151);
  pocketGeometry.computeVertexNormals();
  pocketGeometry.computeBoundingBox();
  pocketGeometry.computeBoundingSphere();

  group.add(makeRigidSkinnedPiece(
    shirt,pocketGeometry,'DEF-spine.001',blue,'kidscade_hoodie_blue_pocket'
  ));

  // 포켓은 양쪽 손이 들어가는 사선 입구와 아래 외곽 봉제선으로 읽히게 한다.
  group.add(makeBoundSeam(
    shirt,
    [
      new THREE.Vector3(-.118,.902,.159),
      new THREE.Vector3(-.080,.929,.161),
      new THREE.Vector3(-.034,.944,.162)
    ],
    lowerSpineBone,seamBlue,'kidscade_hoodie_blue_pocket_opening_L',.0016
  ));
  group.add(makeBoundSeam(
    shirt,
    [
      new THREE.Vector3(.118,.902,.159),
      new THREE.Vector3(.080,.929,.161),
      new THREE.Vector3(.034,.944,.162)
    ],
    lowerSpineBone,seamBlue,'kidscade_hoodie_blue_pocket_opening_R',.0016
  ));
  group.add(makeBoundSeam(
    shirt,
    [
      new THREE.Vector3(-.108,.846,.157),
      new THREE.Vector3(-.086,.802,.155),
      new THREE.Vector3(0,.784,.154),
      new THREE.Vector3(.086,.802,.155),
      new THREE.Vector3(.108,.846,.157)
    ],
    lowerSpineBone,seamBlue,'kidscade_hoodie_blue_pocket_bottom_seam',.0015
  ));

  for(const x of [-.055,.055]){
    const stringGeometry=new THREE.CylinderGeometry(.006,.006,.16,8,1,false);
    stringGeometry.translate(x,1.135,.188);
    group.add(makeRigidSkinnedPiece(
      shirt,stringGeometry,'DEF-spine.003',white,'kidscade_hoodie_string_'+(x<0?'L':'R')
    ));

    const tipGeometry=new THREE.SphereGeometry(.010,8,6);
    tipGeometry.translate(x,1.055,.188);
    group.add(makeRigidSkinnedPiece(
      shirt,tipGeometry,'DEF-spine.003',white,'kidscade_hoodie_tip_'+(x<0?'L':'R')
    ));
  }

  shirt.parent.add(group);
  group.visible=false;
  return group;
}


function cloneSkinnedMeshWithGeometry(template,geometry,material,name){
  const mesh=new THREE.SkinnedMesh(geometry,material);
  mesh.name=name;
  mesh.bindMode=template.bindMode;
  mesh.bind(template.skeleton,template.bindMatrix);
  mesh.position.copy(template.position);
  mesh.quaternion.copy(template.quaternion);
  mesh.scale.copy(template.scale);
  mesh.castShadow=true;
  mesh.receiveShadow=true;
  mesh.frustumCulled=false;
  return mesh;
}

/**
 * Chibi hairone 메시를 재사용한 남자 기본 숏컷.
 * 원본의 정점 연결/UV/가중치/재질은 그대로 두고, 하단 보브컷만 연속적으로 들어 올린다.
 * geometry 좌표계의 실제 경계를 기준으로 변형하여 캐릭터 스케일과 무관하게 적용한다.
 */
function createKidscadeMaleHairShort(){
  if(getNode('kidscade_male_hair_short'))return getNode('kidscade_male_hair_short');

  const source=getNode('hairone');
  if(!source?.isSkinnedMesh){
    throw new Error('남자 숏컷의 원본 hairone SkinnedMesh를 찾지 못했습니다.');
  }

  const geometry=source.geometry.clone();
  geometry.computeBoundingBox();
  const bounds=geometry.boundingBox;
  const size=bounds.getSize(new THREE.Vector3());
  if(size.y<=.00001||size.x<=.00001||size.z<=.00001){
    geometry.dispose();
    throw new Error('hairone 메시의 크기가 유효하지 않습니다.');
  }

  const centerX=(bounds.min.x+bounds.max.x)*.5;
  const centerZ=(bounds.min.z+bounds.max.z)*.5;
  const cutoff=bounds.min.y+size.y*.60;
  const lowerRange=cutoff-bounds.min.y;
  const positions=geometry.getAttribute('position');

  for(let i=0;i<positions.count;i++){
    const ox=positions.getX(i);
    const oy=positions.getY(i);
    const oz=positions.getZ(i);
    const lower=THREE.MathUtils.clamp((cutoff-oy)/lowerRange,0,1);
    const taper=lower*lower*(3-2*lower);

    // 보브컷 절단선에서 기울기가 갑자기 변하지 않게, 아래쪽으로 갈수록
    // 압축 강도를 늘린다. 윗머리는 원본을 보존하고 짧은 머리 끝은 매끈하게 잇는다.
    const y=oy+(cutoff-oy)*.58*taper;

    // 옆머리와 뒷머리도 같은 부드러운 가중치로 줄여 갑작스러운 단차를 막는다.
    const x=centerX+(ox-centerX)*(1-.17*taper);
    const z=centerZ+(oz-centerZ)*(1-.11*taper);
    positions.setXYZ(i,x,y,z);
  }
  // 원본 긴 머리의 끝 정점 일부가 위쪽으로 압축되면서 눈높이까지 올라온다.
  // 눈 앞쪽/관자놀이 쪽에서는 그 면을 렌더링하지 않고, 뒤통수 아래쪽만 살린다.
  // hairone의 UV, geometry 속성, skinIndex/skinWeight, skeleton은 그대로 유지한다.
  const eyes=getNode('eyes');
  if(!eyes?.isSkinnedMesh){
    geometry.dispose();
    throw new Error('남자 숏컷 충돌 검사에 필요한 eyes SkinnedMesh를 찾지 못했습니다.');
  }
  eyes.geometry.computeBoundingBox();
  const eyeClearanceY=eyes.geometry.boundingBox.max.y+.02;
  const backOfFaceZ=centerZ-.045;
  const originalIndex=geometry.getIndex();
  if(!originalIndex){
    geometry.dispose();
    throw new Error('남자 숏컷의 hairone 메시에는 삼각형 인덱스가 필요합니다.');
  }
  const kept=[];
  for(let j=0;j<originalIndex.count;j+=3){
    const a=originalIndex.getX(j),b=originalIndex.getX(j+1),c=originalIndex.getX(j+2);
    const lowest=Math.min(positions.getY(a),positions.getY(b),positions.getY(c));
    const foremost=Math.max(positions.getZ(a),positions.getZ(b),positions.getZ(c));
    if(lowest>=eyeClearanceY || foremost<=backOfFaceZ){
      kept.push(a,b,c);
    }
  }
  if(kept.length<originalIndex.count*.40){
    geometry.dispose();
    throw new Error('남자 숏컷의 눈가 영역 제거 범위가 너무 큽니다.');
  }
  geometry.setIndex(kept);
  positions.needsUpdate=true;
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  // 새 스켈레톤이나 원통·구·원뿔을 만들지 않는다. hairone 원본 weights를 공유한다.
  const hair=cloneSkinnedMeshWithGeometry(
    source,
    geometry,
    Array.isArray(source.material)?source.material.slice():source.material,
    'kidscade_male_hair_short'
  );
  hair.userData={
    ...source.userData,
    type:'kidscade-male-short-hair',
    generatedFrom:'hairone',
    geometryPolicy:'retains-source-uv-indices-and-skin-weights',
    sourceHeight:size.y,
    shapedHeight:geometry.boundingBox.max.y-geometry.boundingBox.min.y,
    eyeClearanceY,
    removedEyeLevelTriangles:(originalIndex.count-kept.length)/3,
    eyeClearancePolicy:'trim front/side hair faces below upper-eye clearance; keep rear nape'
  };

  source.parent.add(hair);
  hair.visible=false;
  return hair;
}

function createKidscadeMaleSet(){
  if(getNode('kidscade_male_body'))return getNode('kidscade_male_body');

  const bodySource=getNode('character_low');
  const eyesSource=getNode('eyes');
  const lashesSource=getNode('eyelashes');
  const shirtSource=getNode('shirt');
  const shortsSource=getNode('ninjasuitshort');
  if(
    !bodySource?.isSkinnedMesh||
    !eyesSource?.isSkinnedMesh||
    !lashesSource?.isSkinnedMesh||
    !shirtSource?.isSkinnedMesh||
    !shortsSource?.isSkinnedMesh
  ){
    throw new Error('남자 베이스 제작에 필요한 character_low / eyes / eyelashes / shirt / ninjasuitshort SkinnedMesh를 찾지 못했습니다.');
  }

  const root=bodySource.parent;
  const group=new THREE.Group();
  group.name='kidscade_male_set';
  group.userData={
    type:'kidscade-custom-male-base',
    label:'남자 기본형',
    rig:'source-78-bone',
    author:'Kidscade',
    createdFromCc0:true,
    meshPolicy:'reuse-source-meshes-only'
  };

  // 1) 상체 폭을 키우고 허벅지/종아리 두께를 줄여 소년형 실루엣을 정리한다.
  //    몸통과 다리 각 부위에 부드러운 가중치를 사용해 원래 리깅/관절을 유지한다.
  const smooth=(a,b,v)=>{
    const t=THREE.MathUtils.clamp((v-a)/(b-a),0,1);
    return t*t*(3-2*t);
  };
  const bodyGeometry=bodySource.geometry.clone();
  const bp=bodyGeometry.getAttribute('position');
  for(let i=0;i<bp.count;i++){
    let x=bp.getX(i),y=bp.getY(i),z=bp.getZ(i);

    const ax=Math.abs(x);

    // 상체를 좌우로 한 단계 넓힌다. 팔 끝과 목에는 영향이 줄어들도록
    // 몸통 중앙과 가슴/어깨 높이에만 연속적인 가중치를 적용한다.
    const upperTorso=smooth(.76,1.02,y)*(1-smooth(1.22,1.40,y));
    const torsoCore=1-smooth(.21,.48,ax);
    x*=1+upperTorso*(.145*torsoCore+.018*(1-torsoCore));
    if(z>0)z*=1-.022*upperTorso*torsoCore;

    // 허리~골반은 갑자기 잘록해지지 않도록 연결부만 아주 약하게 보완한다.
    const waist=smooth(.48,.66,y)*(1-smooth(.82,.98,y));
    x*=1+.012*waist*(1-smooth(.18,.36,ax));

    // 다리를 중앙으로 옮기지 않고 각 다리의 중심축을 기준으로만 가늘게 만든다.
    // 발, 손, 무릎/골반 접합부와 머리에는 영향을 주지 않는다.
    const thigh=smooth(.18,.36,y)*(1-smooth(.62,.81,y));
    const calf=smooth(.025,.12,y)*(1-smooth(.34,.51,y));
    const legBand=smooth(.055,.14,ax)*(1-smooth(.39,.52,ax));
    const legSlim=legBand*(.115*thigh+.085*calf);
    if(legSlim>0){
      const legCenter=Math.sign(x)*.145;
      x=legCenter+(x-legCenter)*(1-legSlim);
      z*=1-legBand*(.04*thigh+.028*calf);
    }

    // 얼굴 아래쪽만 조심스럽게 손질. 눈·귀·목은 변형하지 않는다.
    if(y>=1.34&&y<=1.60&&z>.05){
      const jaw=smooth(1.34,1.42,y)*(1-smooth(1.52,1.60,y));
      x*=1+.036*jaw;
      z*=1-.018*jaw;
    }

    bp.setXYZ(i,x,y,z);
  }
  bp.needsUpdate=true;
  bodyGeometry.computeVertexNormals();
  bodyGeometry.computeBoundingBox();
  bodyGeometry.computeBoundingSphere();

  group.add(cloneSkinnedMeshWithGeometry(
    bodySource,bodyGeometry,
    Array.isArray(bodySource.material)?bodySource.material.slice():bodySource.material,
    'kidscade_male_body'
  ));

  // 2) character_low 머리에는 눈 흰자/속눈썹/눈썹이 이미 들어 있다.
  //    별도 eyes 메시를 축소하면 기존 얼굴 화장과 틀어져 두 눈처럼 보인다.
  //    원본 눈 메시를 같은 정점/UV/가중치/위치로 사용하고, 별도 눈썹은 만들지 않는다.
  const eyeGeometry=eyesSource.geometry.clone();
  const maleEyes=cloneSkinnedMeshWithGeometry(
    eyesSource,
    eyeGeometry,
    Array.isArray(eyesSource.material)?eyesSource.material.slice():eyesSource.material,
    'kidscade_male_eyes'
  );
  maleEyes.userData={
    ...eyesSource.userData,
    generatedFrom:'eyes',
    eyeHeightScale:1,
    alignsWith:'character_low native face markings'
  };
  group.add(maleEyes);

  // 3) 눈썹은 원본 eyelashes의 독립된 좌/우 눈썹 2개 섬만 가져온다.
  //    이 얼굴은 본체에 눈가의 선이 이미 있으므로 다른 속눈썹은 절대 복제하지 않는다.
  const browGeometry=lashesSource.geometry.clone();
  const browPositions=browGeometry.getAttribute('position');
  const originalIndex=browGeometry.getIndex();
  if(!originalIndex)throw new Error('Original Chibi eyebrows require indexed triangles.');
  const eyebrowRegionFloor=1.76; // brows >=1.772, eyelashes <=1.726
  const kept=[];
  for(let j=0;j<originalIndex.count;j+=3){
    const a=originalIndex.getX(j),b=originalIndex.getX(j+1),c=originalIndex.getX(j+2);
    if(Math.min(browPositions.getY(a),browPositions.getY(b),browPositions.getY(c))>=eyebrowRegionFloor){
      kept.push(a,b,c);
    }
  }
  if(kept.length!==72){
    browGeometry.dispose();
    throw new Error('Chibi eyebrow source changed: expected 24 triangles but got '+kept.length/3);
  }
  browGeometry.setIndex(kept);
  const browCenterY=1.792;
  for(let i=0;i<browPositions.count;i++){
    const x=browPositions.getX(i),y=browPositions.getY(i),z=browPositions.getZ(i);
    browPositions.setXYZ(i,x*1.022,browCenterY+(y-browCenterY)*.70-.024,z+.010);
  }
  browPositions.needsUpdate=true;
  browGeometry.computeVertexNormals();
  browGeometry.computeBoundingBox();
  browGeometry.computeBoundingSphere();
  const maleBrows=cloneSkinnedMeshWithGeometry(
    lashesSource,browGeometry,makeSolidMaterial('#332723','Kidscade Male Brows'),
    'kidscade_male_brows'
  );
  maleBrows.userData={...lashesSource.userData,generatedFrom:'eyelashes',
    extractedBrowTriangles:kept.length/3,region:'two original eyebrow mesh islands only'};
  group.add(maleBrows);

  // 4) 기존 shirt의 topology/skinWeight를 그대로 쓰되, 소매 외곽만 확장한다.
  //    목선은 유지해 구멍이 커지지 않게 하고 어깨 앞쪽 여유를 둬 피부 관통을 방지한다.
  const tshirtMaterial=makeSolidMaterial('#4d78d6','Kidscade Male T-shirt');
  const tshirtGeometry=shirtSource.geometry.clone();
  const tp=tshirtGeometry.getAttribute('position');
  for(let i=0;i<tp.count;i++){
    let x=tp.getX(i),y=tp.getY(i),z=tp.getZ(i);
    const shoulder=smooth(.88,1.03,y)*(1-smooth(1.15,1.24,y));
    const sleeve=smooth(.10,.23,Math.abs(x));
    // 몸통이 넓어진 만큼 셔츠도 여유 있게 맞추되, 기존 소매 가중치를 유지한다.
    x*=1.135+.065*shoulder*sleeve;
    z*=1.04+.065*shoulder;
    if(z>0)z+=.006*shoulder;
    tp.setXYZ(i,x,y,z);
  }
  tp.needsUpdate=true;
  tshirtGeometry.computeVertexNormals();
  tshirtGeometry.computeBoundingBox();
  tshirtGeometry.computeBoundingSphere();
  const maleTshirt=cloneSkinnedMeshWithGeometry(
    shirtSource,tshirtGeometry,tshirtMaterial,'kidscade_male_tshirt'
  );
  maleTshirt.userData={...shirtSource.userData,generatedFrom:'shirt',fit:'smooth shoulder/sleeve clearance'};
  group.add(maleTshirt);

  // 5) 반바지는 긴 pants를 압축하지 않는다.
  //    원본 ninjasuitshort의 topology/weights를 유지하며 밑단만 하체와 함께 살짝 슬림화한다.
  const shortsMaterial=makeSolidMaterial('#29446f','Kidscade Male Shorts');
  const shortsGeometry=shortsSource.geometry.clone();
  const sp=shortsGeometry.getAttribute('position');
  for(let i=0;i<sp.count;i++){
    let x=sp.getX(i),y=sp.getY(i),z=sp.getZ(i);
    const ax=Math.abs(x);
    // 반바지 밑단도 조금 슬림하게. 허리/골반은 그대로 두어 몸체와 관통하지 않는다.
    const legOpening=smooth(.24,.37,y)*(1-smooth(.59,.75,y));
    const legBand=smooth(.055,.14,ax)*(1-smooth(.39,.52,ax));
    const openingTrim=.072*legOpening*legBand;
    const legCenter=Math.sign(x)*.145;
    x=legCenter+(x-legCenter)*(1-openingTrim);
    x*=1.015;
    z*=1.01-.018*legOpening*legBand;
    sp.setXYZ(i,x,y,z);
  }
  sp.needsUpdate=true;
  shortsGeometry.computeVertexNormals();
  shortsGeometry.computeBoundingBox();
  shortsGeometry.computeBoundingSphere();
  group.add(cloneSkinnedMeshWithGeometry(
    shortsSource,shortsGeometry,shortsMaterial,'kidscade_male_shorts'
  ));

  root.add(group);
  group.visible=true;
  ['kidscade_male_body','kidscade_male_eyes','kidscade_male_brows','kidscade_male_tshirt','kidscade_male_shorts']
    .forEach(name=>setNodeVisible(name,false));
  return group;
}

function makeUnlitMaterial(source){
  const material=new THREE.MeshBasicMaterial({
    color:source?.color?.clone?.()||new THREE.Color(0xffffff),
    map:source?.map||null,
    alphaMap:source?.alphaMap||null,
    transparent:!!source?.transparent,
    opacity:source?.opacity??1,
    alphaTest:source?.alphaTest??0,
    side:source?.side??THREE.FrontSide,
    vertexColors:!!source?.vertexColors
  });
  material.name=(source?.name||'material')+'__kidscade_unlit';
  material.userData.kidscadeGeneratedUnlit=true;
  return material;
}

function applyMaterialMode(useUnlit){
  if(!sourceScene)return;
  sourceScene.traverse(object=>{
    if(!object.isMesh)return;
    if(!originalMaterials.has(object.uuid)){
      originalMaterials.set(object.uuid,Array.isArray(object.material)?object.material.slice():object.material);
    }
    const original=originalMaterials.get(object.uuid);
    const current=Array.isArray(object.material)?object.material:[object.material];
    current.forEach(material=>{
      if(material?.userData?.kidscadeGeneratedUnlit)material.dispose?.();
    });
    object.material=useUnlit
      ?(Array.isArray(original)?original.map(makeUnlitMaterial):makeUnlitMaterial(original))
      :(Array.isArray(original)?original.slice():original);
  });
  $('materialModeLabel').textContent=useUnlit?'Unlit/NPR':'원본 PBR';
  setAssetStatus((useUnlit?'Unlit/NPR':'원본 PBR')+' 재질 · '+(currentPreset==='custom'?'사용자 조합':currentPreset));
}

function normalizeAvatar(){
  sourceScene.updateMatrixWorld(true);

  const body=getNode('character_low');
  let box=null;
  if(body){
    if(!body.geometry?.boundingBox)body.geometry?.computeBoundingBox?.();
    if(body.geometry?.boundingBox){
      box=body.geometry.boundingBox.clone().applyMatrix4(body.matrixWorld);
    }
  }
  if(!box||box.isEmpty())box=visibleBounds(sourceScene);
  if(!box||box.isEmpty())throw new Error('Chibi 캐릭터의 크기를 계산할 수 없습니다.');

  const size=box.getSize(new THREE.Vector3());
  const scale=size.y>0?TARGET_HEIGHT/size.y:1;
  sourceScene.scale.setScalar(scale);
  sourceScene.updateMatrixWorld(true);

  const groundBox=visibleBounds(sourceScene);
  if(!groundBox||groundBox.isEmpty())throw new Error('Chibi 캐릭터의 바닥 위치를 계산할 수 없습니다.');
  const center=groundBox.getCenter(new THREE.Vector3());
  sourceScene.position.x-=center.x;
  sourceScene.position.z-=center.z;
  sourceScene.position.y-=groundBox.min.y;
  sourceScene.updateMatrixWorld(true);
}

function uniqueBones(){
  const map=new Map();
  sourceScene?.traverse?.(object=>{
    if(!object.isSkinnedMesh)return;
    for(const bone of object.skeleton?.bones||[]){
      if(!map.has(bone.uuid))map.set(bone.uuid,bone);
    }
  });
  return [...map.values()];
}

function choosePrimarySkinnedMesh(){
  let best=null;
  sourceScene.traverse(object=>{
    if(!object.isSkinnedMesh)return;
    if(!best||(object.skeleton?.bones?.length||0)>(best.skeleton?.bones?.length||0))best=object;
  });
  return best;
}

function populateBoneList(){
  const bones=uniqueBones();
  $('boneList').innerHTML=bones.map(bone=>'<span>'+bone.name.replace(/^DEF-/,'')+'</span>').join('');
  $('boneCount').textContent=String(bones.length);
  return bones.length;
}

function clipLabel(name){
  return CLIP_LABELS[name]||name.replace(/^anim_/,'').replace(/anim_$/,'').replaceAll('_',' ').toUpperCase();
}

function populateAnimationButtons(){
  $('clipGrid').innerHTML=animations.map(clip=>
    '<button class="secondary" data-clip="'+clip.name+'">'+clipLabel(clip.name)+'</button>'
  ).join('');
}

function idleClipName(){
  return animations.find(c=>c.name==='anim_iddle')?.name
    ||animations.find(c=>c.name==='iddleanim_')?.name
    ||animations[0]?.name
    ||'';
}

/**
 * Locomotion variants retain source stride, foot-contact timing and all public
 * clip names, but rebalance the torso and upper-arm swing around each bone's
 * bind quaternion. Scaling the absolute Euler angles used to tilt the resting
 * pose as well as the movement, which caused unnatural shoulder posture.
 */
const MALE_WALK_POSITION_X=.43;
const MALE_RUN_POSITION_X=.60;
const MALE_WALK_SPINE_FACTORS={
  'DEF-spine':{roll:.38,yaw:.70},
  'DEF-spine001':{roll:.55,yaw:.85},
  'DEF-spine002':{roll:.72,yaw:.82},
  'DEF-spine003':{roll:.85,yaw:.72},
  'DEF-spine004':{roll:.90,yaw:.78}
};
const MALE_RUN_SPINE_FACTORS={
  'DEF-spine':{roll:.55,yaw:.78},
  'DEF-spine001':{roll:.65,yaw:.90},
  'DEF-spine002':{roll:.78,yaw:.88},
  'DEF-spine003':{roll:.90,yaw:.85},
  'DEF-spine004':{roll:.92,yaw:.90}
};

function isWalkClipName(name){
  return name==='anim_walk'||name==='walkanim_';
}

function isRunClipName(name){
  return name==='anim_run'||name==='runanim_';
}

function isMaleBodyVisible(){
  return !!getNode('kidscade_male_body')?.visible;
}

function sourceBone(name){
  const wanted=normalizeRuntimeBoneName(name);
  let found=null;
  sourceScene?.traverse?.(object=>{
    if(!found&&object.isBone&&normalizeRuntimeBoneName(object.name)===wanted)found=object;
  });
  return found;
}

function buildMaleLocomotionClip(sourceClip,settings){
  const result=sourceClip.clone();
  result.name=sourceClip.name;
  const base=new THREE.Quaternion();
  const invertedBase=new THREE.Quaternion();
  const delta=new THREE.Quaternion();
  const animated=new THREE.Quaternion();
  const euler=new THREE.Euler(0,0,0,'XYZ');

  for(const track of result.tracks){
    const dot=track.name.lastIndexOf('.');
    if(dot<0)continue;
    const rawBone=track.name.slice(0,dot);
    const bone=normalizeRuntimeBoneName(rawBone);
    const property=track.name.slice(dot+1);
    if(bone===normalizeRuntimeBoneName('DEF-spine')&&property==='position'){
      const values=track.values;
      let min=Infinity,max=-Infinity;
      for(let i=0;i<values.length;i+=3){
        min=Math.min(min,values[i]);
        max=Math.max(max,values[i]);
      }
      const center=(min+max)*.5;
      for(let i=0;i<values.length;i+=3){
        values[i]=center+(values[i]-center)*settings.lateralScale;
      }
      continue;
    }
    if(property!=='quaternion')continue;

    const factorEntry=Object.entries(settings.spineFactors)
      .find(([name])=>normalizeRuntimeBoneName(name)===bone);
    const factors=factorEntry?.[1];
    const upperArm=/upper[_-]?arm/i.test(bone);
    if(!factors&&!upperArm)continue;

    const bindBone=sourceBone(rawBone);
    if(!bindBone)continue; // Unknown rig: use untouched source animation.
    base.copy(bindBone.quaternion).normalize();
    invertedBase.copy(base).invert();

    const values=track.values;
    for(let i=0;i<values.length;i+=4){
      animated.set(values[i],values[i+1],values[i+2],values[i+3]).normalize();
      delta.copy(invertedBase).multiply(animated).normalize();
      euler.setFromQuaternion(delta,'XYZ');
      if(factors){
        euler.y*=factors.yaw;
        euler.z*=factors.roll;
      }
      if(upperArm){
        euler.x*=settings.armPitch;
        euler.z*=settings.armRoll;
      }
      animated.copy(base).multiply(delta.setFromEuler(euler)).normalize();
      values[i]=animated.x;
      values[i+1]=animated.y;
      values[i+2]=animated.z;
      values[i+3]=animated.w;
    }
  }
  result.userData={
    ...sourceClip.userData,
    kidscadeMaleBalancedLocomotion:true,
    sourceClip:sourceClip.name,
    lateralScale:settings.lateralScale
  };
  return result;
}

function buildMaleWalkClip(sourceClip){
  return buildMaleLocomotionClip(sourceClip,{
    lateralScale:MALE_WALK_POSITION_X,
    spineFactors:MALE_WALK_SPINE_FACTORS,
    armPitch:1.10,
    armRoll:.88
  });
}

function buildMaleRunClip(sourceClip){
  return buildMaleLocomotionClip(sourceClip,{
    lateralScale:MALE_RUN_POSITION_X,
    spineFactors:MALE_RUN_SPINE_FACTORS,
    armPitch:1.08,
    armRoll:.94
  });
}

function resolvePlaybackClip(sourceClip){
  if(!isMaleBodyVisible())return sourceClip;
  if(isWalkClipName(sourceClip.name))return maleWalkClips.get(sourceClip.name)||sourceClip;
  if(isRunClipName(sourceClip.name))return maleRunClips.get(sourceClip.name)||sourceClip;
  return sourceClip;
}

function syncActiveWalkStyle(){
  if(activeClip&&(isWalkClipName(activeClip)||isRunClipName(activeClip)))playClip(activeClip);
}

function playClip(name){
  if(!mixer)return;
  const sourceClip=animations.find(item=>item.name===name);
  if(!sourceClip)return;
  const clip=resolvePlaybackClip(sourceClip);
  const derived=clip!==sourceClip;
  const gaitBadge=$('gaitBadge');
  if(gaitBadge)gaitBadge.textContent=derived?'남자형 동작 보정 · '+clipLabel(name):'원본 동작 · '+clipLabel(name);

  activeClip=name;
  document.querySelectorAll('[data-clip]').forEach(button=>{
    button.classList.toggle('active',button.dataset.clip===name);
  });

  if(activeAction)activeAction.fadeOut(.12);
  const once=name==='anim_dying'||name==='dyinganim_';
  const next=mixer.clipAction(clip);
  next.reset();
  next.enabled=true;
  next.setEffectiveWeight(1);
  next.setEffectiveTimeScale(Number($('speed').value||1));
  next.setLoop(once?THREE.LoopOnce:THREE.LoopRepeat,once?1:Infinity);
  next.clampWhenFinished=once;
  next.fadeIn(.12).play();
  activeAction=next;
}

function resetPose(){
  activeAction?.stop();
  activeAction=null;
  mixer?.stopAllAction();
  sourceScene?.traverse?.(object=>{
    if(object.isSkinnedMesh)object.skeleton?.pose?.();
  });
  activeClip='';
  document.querySelectorAll('[data-clip]').forEach(button=>button.classList.remove('active'));
  setStatus('원본 바인드 자세로 돌아왔습니다.');
}

function setCameraView(name){
  activeView=name;
  controls.target.set(0,TARGET_HEIGHT*.52,0);
  if(name==='face'){
    controls.target.set(0,TARGET_HEIGHT*.82,0);
    camera.position.set(0,TARGET_HEIGHT*.86,TARGET_HEIGHT*1.02);
  }
  else if(name==='front')camera.position.set(0,TARGET_HEIGHT*.76,TARGET_HEIGHT*2.25);
  else if(name==='side')camera.position.set(TARGET_HEIGHT*2.25,TARGET_HEIGHT*.76,0);
  else if(name==='back')camera.position.set(0,TARGET_HEIGHT*.76,-TARGET_HEIGHT*2.25);
  else camera.position.set(TARGET_HEIGHT*1.52,TARGET_HEIGHT*.82,TARGET_HEIGHT*1.72);
  controls.syncFromCamera();
  controls.update();
  document.querySelectorAll('[data-view]').forEach(button=>{
    button.classList.toggle('active',button.dataset.view===name);
  });
}

function refreshMetrics(){
  if(!avatarRoot)return;
  const triangles=countVisibleTriangles(avatarRoot);
  const bones=uniqueBones().length;
  $('triangleCount').textContent=triangles.toLocaleString();
  $('polyBadge').textContent=triangles.toLocaleString()+' triangles';
  $('boneCount').textContent=String(bones);
  $('animationCount').textContent=String(animations.length);
  $('rigBadge').textContent='✓ Chibi Rig · '+bones+' bones';
  $('clipBadge').textContent=animations.length+' clips';
  $('rigVersionLabel').textContent='원본 '+bones+'-bone SkinnedMesh';
  $('modelInfoTip').textContent='현재 '+selectedParts().length+'개 교체 파츠가 표시 중이며, export 시 보이는 메시만 포함합니다.';
}

async function loadChibi(){
  clearAssetError();
  setReady(false);
  setAssetStatus('원본 Chibi GLB를 불러오는 중…');
  setStatus('Chibi GLB를 불러오는 중…');

  let GLTFLoader;
  try{
    ({GLTFLoader}=await import('../assets/vendor/three-r160/addons/loaders/GLTFLoader.js'));
  }catch(error){
    console.error(error);
    showAssetError('GLTFLoader를 불러오지 못했습니다. Three.js vendor 구성을 확인해 주세요.');
    return false;
  }

  let gltf;
  try{
    gltf=await new GLTFLoader().loadAsync(CHIBI_ASSET_URL+'?v=20261007-chibi12');
  }catch(error){
    console.error(error);
    showAssetError('<b>'+CHIBI_ASSET_URL+'</b> 파일을 찾지 못했습니다.<br>폴백 캐릭터는 사용하지 않습니다. 저장소의 실제 Chibi GLB 경로를 확인해 주세요.');
    return false;
  }

  sourceScene=gltf.scene;
  sourceScene.name='StylooChibiAllInOne';
  animations=gltf.animations||[];
  maleWalkClips=new Map(
    animations.filter(clip=>isWalkClipName(clip.name))
      .map(clip=>[clip.name,buildMaleWalkClip(clip)])
  );
  maleRunClips=new Map(
    animations.filter(clip=>isRunClipName(clip.name))
      .map(clip=>[clip.name,buildMaleRunClip(clip)])
  );
  originalMaterials=new Map();

  TOGGLE_NODES.forEach(name=>setNodeVisible(name,false));
  FEMALE_BASE_NODES.forEach(name=>setNodeVisible(name,true));
  const initial=new Set(PRESETS.student);
  TOGGLE_NODES.forEach(name=>setNodeVisible(name,initial.has(name)));

  try{
    normalizeAvatar();
  }catch(error){
    console.error(error);
    showAssetError('Chibi GLB는 열렸지만 캐릭터 크기/원점을 계산하지 못했습니다.');
    return false;
  }

  avatarRoot=new THREE.Group();
  avatarRoot.name='KidscadeChibiAvatar';
  avatarRoot.userData={
    type:'kidscade-chibi-avatar',
    source:CHIBI_SOURCE,
    sourceUrl:'https://styloo.itch.io/chibi',
    license:CHIBI_LICENSE,
    asset:CHIBI_ASSET_URL
  };
  avatarRoot.add(sourceScene);
  scene.add(avatarRoot);

  sourceScene.traverse(object=>{
    if(!object.isMesh)return;
    object.castShadow=true;
    object.receiveShadow=true;
    object.frustumCulled=false;
  });

  primarySkinnedMesh=choosePrimarySkinnedMesh();
  if(!primarySkinnedMesh){
    showAssetError('Chibi GLB에서 SkinnedMesh를 찾지 못했습니다.');
    scene.remove(avatarRoot);
    avatarRoot=null;
    return false;
  }

  try{
    createKidscadeBlueHoodie();
    createKidscadeMaleSet();
    createKidscadeMaleHairShort();
  }catch(error){
    console.error(error);
    showAssetError('Chibi 본체는 열렸지만 커스텀 파츠 생성에 실패했습니다: '+(error?.message||error));
    scene.remove(avatarRoot);
    avatarRoot=null;
    return false;
  }

  mixer=new THREE.AnimationMixer(sourceScene);
  skeletonHelper=new THREE.SkeletonHelper(sourceScene);
  skeletonHelper.visible=$('showBones').checked;
  skeletonHelper.material.depthTest=false;
  skeletonHelper.material.transparent=true;
  skeletonHelper.material.opacity=.88;
  scene.add(skeletonHelper);

  populateBoneList();
  populateAnimationButtons();
  renderPartChecks();
  applyPreset('male');
  applyMaterialMode($('chibiUnlit').checked);
  setCameraView(activeView);

  setReady(true);
  refreshPartChecks();
  refreshMetrics();
  clearAssetError();

  setAssetStatus('로드 완료 · 남자 기본형 선택 · WALK/RUN 보정 · '+uniqueBones().length+' bones · '+animations.length+' animations');
  setStatus('Chibi 제작실 준비 완료');

  const idle=idleClipName();
  if(idle)playClip(idle);
  return true;
}

function download(name,blob){
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement('a');
  anchor.href=url;
  anchor.download=name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1200);
}

function exportSpec(){
  if(!loaded)return;
  const spec={
    version:1,
    type:'kidscade-chibi-avatar-spec',
    source:CHIBI_SOURCE,
    sourceUrl:'https://styloo.itch.io/chibi',
    license:CHIBI_LICENSE,
    asset:CHIBI_ASSET_URL,
    preset:currentPreset,
    materialMode:$('chibiUnlit').checked?'unlit-npr':'original-pbr',
    visibleParts:selectedParts(),
    triangles:countVisibleTriangles(avatarRoot),
    bones:uniqueBones().map(bone=>({
      name:bone.name,
      parent:bone.parent?.isBone?bone.parent.name:null
    })),
    clips:animations.map(clip=>({
      name:clip.name,
      duration:Number(clip.duration.toFixed(3))
    })),
    walkStyle:isMaleBodyVisible()?'balanced-locomotion-v2':'source',
    coordinateSystem:{up:'Y',units:'meters',origin:'ground-center'}
  };
  download(
    'kidscade-chibi-'+currentPreset+'-spec.json',
    new Blob([JSON.stringify(spec,null,2)+'\n'],{type:'application/json'})
  );
  setStatus('아바타 규격 JSON을 저장했습니다.');
}

async function exportGlb(){
  if(!loaded||!avatarRoot)return;
  setStatus('GLB를 만드는 중…');

  const wasHelper=skeletonHelper?.visible;
  const resumeClip=activeClip;
  const resumeRotation=avatarRoot.rotation.y;
  if(skeletonHelper)skeletonHelper.visible=false;

  activeAction?.stop();
  mixer?.stopAllAction();
  sourceScene.traverse(object=>{
    if(object.isSkinnedMesh)object.skeleton?.pose?.();
  });
  avatarRoot.rotation.set(0,0,0);
  avatarRoot.updateMatrixWorld(true);

  const restore=()=>{
    avatarRoot.rotation.y=resumeRotation;
    if(skeletonHelper)skeletonHelper.visible=wasHelper;
    if(resumeClip)playClip(resumeClip);
  };

  let GLTFExporter;
  try{
    ({GLTFExporter}=await import('../assets/vendor/three-r160/addons/exporters/GLTFExporter.js'));
  }catch(error){
    restore();
    console.error(error);
    setStatus('GLB exporter를 불러오지 못했습니다.',true);
    return;
  }

  new GLTFExporter().parse(
    avatarRoot,
    result=>{
      restore();
      const blob=result instanceof ArrayBuffer
        ?new Blob([result],{type:'model/gltf-binary'})
        :new Blob([JSON.stringify(result)],{type:'model/gltf+json'});
      download('kidscade-chibi-'+currentPreset+'.glb',blob);
      setStatus('GLB 저장 완료 · 선택 파츠 + 원본 rig + '+animations.length+'개 애니메이션');
    },
    error=>{
      restore();
      console.error(error);
      setStatus('GLB 내보내기에 실패했습니다: '+(error?.message||error),true);
    },
    {
      binary:true,
      trs:true,
      onlyVisible:true,
      // Keep 11 clip names while exporting the tuned WALK only for a visible male base.
      animations:animations.map(clip=>resolvePlaybackClip(clip)),
      includeCustomExtensions:false
    }
  );
}

function wireUi(){
  $('showBones').addEventListener('change',()=>{
    if(skeletonHelper)skeletonHelper.visible=$('showBones').checked;
  });

  $('speed').addEventListener('input',()=>{
    if(activeAction)activeAction.setEffectiveTimeScale(Number($('speed').value));
  });

  $('resetPose').addEventListener('click',resetPose);
  $('exportGlb').addEventListener('click',exportGlb);
  $('exportSpec').addEventListener('click',exportSpec);

  $('clipGrid').addEventListener('click',event=>{
    const button=event.target.closest('[data-clip]');
    if(button)playClip(button.dataset.clip);
  });

  document.querySelectorAll('[data-view]').forEach(button=>{
    button.addEventListener('click',()=>setCameraView(button.dataset.view));
  });

  document.querySelectorAll('[data-chibi-preset]').forEach(button=>{
    button.addEventListener('click',()=>applyPreset(button.dataset.chibiPreset));
  });

  $('chibiHair').addEventListener('change',event=>{
    applyHair(event.target.value);
    currentPreset='custom';
    document.querySelectorAll('[data-chibi-preset]').forEach(button=>button.classList.remove('active'));
  });

  $('chibiUnlit').addEventListener('change',event=>applyMaterialMode(event.target.checked));
  $('maleBrowPreview').addEventListener('change',event=>{
    if(currentPreset!=='male')return;
    setNodeVisible('kidscade_male_brows',event.target.checked);
    refreshMetrics();
  });

  $('wardrobeParts').addEventListener('change',event=>{
    const input=event.target.closest('[data-chibi-part]');
    if(!input)return;

    const part=input.dataset.chibiPart;
    if(HAIR_NODES.includes(part)){
      applyHair(input.checked?part:'');
    }else{
      setNodeVisible(part,input.checked);
      refreshPartChecks();
      refreshMetrics();
    }

    currentPreset='custom';
    document.querySelectorAll('[data-chibi-preset]').forEach(button=>button.classList.remove('active'));
    // Preserve the correct WALK/RUN clip when switching into a custom preset.
    if(part==='kidscade_male_body'||BASE_VARIANT_NODES.includes(part))syncActiveWalkStyle();
  });
}

function loop(now){
  requestAnimationFrame(loop);
  const dt=Math.min(.05,(now-lastTime)/1000);
  lastTime=now;
  if(mixer)mixer.update(dt);
  if(avatarRoot&&$('autoRotate').checked)avatarRoot.rotation.y+=dt*.55;
  controls?.update();
  renderer?.render(scene,camera);
}

async function boot(){
  const ok=await authorize();
  if(!ok)return;
  initScene();
  wireUi();
  requestAnimationFrame(loop);
  await loadChibi();
}

boot();

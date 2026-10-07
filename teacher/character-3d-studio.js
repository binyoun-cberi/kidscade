import * as THREE from '../assets/vendor/three-r160/three.module.js';

window.__kc3dStudioModuleReady=true;

const ADMIN_KEY_NAME='kc_teacher_admin_key';
const CHIBI_ASSET_URL='/assets/game/chibi/ChibiCharactersV1.2/ChibiCharacters/glb/allinonepr.glb';
const CHIBI_SOURCE='Styloo Chibi Characters v1.2';
const CHIBI_LICENSE='CC0-1.0';
const TARGET_HEIGHT=1.22;
const $=id=>document.getElementById(id);

const BASE_NODES=['character_low','eyelashes','eyes','tooth'];
const HAIR_NODES=['hairone','hairT','hairtail','hairtailknight','hairvariant','hairvariant.001'];

const PRESETS={
  base:[...BASE_NODES],
  hoodie:[...BASE_NODES,'hairvariant','kidscade_hoodie_blue','pants','shoe'],
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
  kidscade_hoodie_blue:'파란 후드티'
};

const TOGGLE_NODES=Object.keys(PART_LABELS);

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
let animations=[],activeAction=null,activeClip='',currentPreset='hoodie',activeView='threeQuarter';
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

function getNode(name){
  return sourceScene?.getObjectByName(name)||null;
}

function setNodeVisible(name,visible){
  const object=getNode(name);
  if(object)object.visible=!!visible;
}

function selectedParts(){
  return TOGGLE_NODES.filter(name=>getNode(name)?.visible);
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
  BASE_NODES.forEach(node=>setNodeVisible(node,true));
  TOGGLE_NODES.forEach(node=>setNodeVisible(node,wanted.has(node)));
  const hair=HAIR_NODES.find(node=>wanted.has(node))||'';
  $('chibiHair').value=hair;
  document.querySelectorAll('[data-chibi-preset]').forEach(button=>{
    button.classList.toggle('active',button.dataset.chibiPreset===name);
  });
  refreshPartChecks();
  refreshMetrics();
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

function makeTubeGeometry(points,radius=.0045,tubularSegments=20){
  const curve=new THREE.CatmullRomCurve3(points,false,'centripetal',.55);
  const geometry=new THREE.TubeGeometry(curve,tubularSegments,radius,8,false);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function makeBoundSeam(template,points,boneName,material,name,radius=.0045){
  return makeRigidSkinnedPiece(
    template,
    makeTubeGeometry(points,radius,20),
    boneName,
    material,
    name
  );
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

    x*=1.075;
    y=centerY+(y-centerY)*1.035;
    z=z*1.11+(z>0?.008:-.006);

    // 원본 shirt의 깊은 넥홀을 살짝 조여 후드티 목이 뚫려 보이지 않게 한다.
    if(y>1.06){
      const t=Math.min(1,(y-1.06)/.16);
      x*=1-t*.10;
      z=z*(1-t*.18)+t*.014;
      y+=t*.018;
    }

    pos.setXYZ(i,x,y,z);
  }
  pos.needsUpdate=true;
  bodyGeometry.computeVertexNormals();
  bodyGeometry.computeBoundingBox();
  bodyGeometry.computeBoundingSphere();

  const blue=makeSolidMaterial('#4f7df3','Kidscade Hoodie Blue');
  const darkBlue=makeSolidMaterial('#3b63cc','Kidscade Hoodie Detail');
  const seamBlue=makeSolidMaterial('#7598f5','Kidscade Hoodie Stitch');
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

  const hoodGeometry=new THREE.TorusGeometry(.205,.050,10,24);
  hoodGeometry.rotateX(Math.PI/2);
  hoodGeometry.scale(1.05,.72,.82);
  hoodGeometry.translate(0,1.235,-.105);
  group.add(makeRigidSkinnedPiece(
    shirt,hoodGeometry,'DEF-spine.003',blue,'kidscade_hoodie_blue_hood'
  ));

  const upperSpineBone=resolveFirstBoneName(shirt.skeleton,[
    'DEF-spine.003','DEF-spine.002','DEF-spine.001','spine','Spine'
  ]);
  const lowerSpineBone=resolveFirstBoneName(shirt.skeleton,[
    'DEF-spine.001','DEF-spine.002','spine','Spine'
  ]);

  // 목 시보리: 넥홀을 덮고 후드티 카라처럼 보이게 한다.
  const collarGeometry=new THREE.TorusGeometry(.108,.015,10,28);
  collarGeometry.rotateX(Math.PI/2);
  collarGeometry.scale(1.02,.70,1);
  collarGeometry.translate(0,1.118,.040);
  collarGeometry.computeVertexNormals();
  collarGeometry.computeBoundingBox();
  collarGeometry.computeBoundingSphere();
  group.add(makeRigidSkinnedPiece(
    shirt,collarGeometry,upperSpineBone,darkBlue,'kidscade_hoodie_blue_collar'
  ));

  // 래글런 느낌의 몸통/소매 경계 재봉선.
  group.add(makeBoundSeam(
    shirt,
    [
      new THREE.Vector3(-.040,1.115,.105),
      new THREE.Vector3(-.105,1.090,.105),
      new THREE.Vector3(-.165,1.025,.102),
      new THREE.Vector3(-.210,.935,.094)
    ],
    upperSpineBone,seamBlue,'kidscade_hoodie_blue_seam_left',.0038
  ));
  group.add(makeBoundSeam(
    shirt,
    [
      new THREE.Vector3(.040,1.115,.105),
      new THREE.Vector3(.105,1.090,.105),
      new THREE.Vector3(.165,1.025,.102),
      new THREE.Vector3(.210,.935,.094)
    ],
    upperSpineBone,seamBlue,'kidscade_hoodie_blue_seam_right',.0038
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

  // 캥거루 포켓 입구와 양 옆 봉제선.
  group.add(makeBoundSeam(
    shirt,
    [
      new THREE.Vector3(-.112,.905,.159),
      new THREE.Vector3(-.055,.930,.162),
      new THREE.Vector3(.055,.930,.162),
      new THREE.Vector3(.112,.905,.159)
    ],
    lowerSpineBone,seamBlue,'kidscade_hoodie_blue_pocket_opening',.0030
  ));
  group.add(makeBoundSeam(
    shirt,
    [
      new THREE.Vector3(-.114,.900,.158),
      new THREE.Vector3(-.108,.852,.157),
      new THREE.Vector3(-.096,.802,.155)
    ],
    lowerSpineBone,seamBlue,'kidscade_hoodie_blue_pocket_seam_left',.0027
  ));
  group.add(makeBoundSeam(
    shirt,
    [
      new THREE.Vector3(.114,.900,.158),
      new THREE.Vector3(.108,.852,.157),
      new THREE.Vector3(.096,.802,.155)
    ],
    lowerSpineBone,seamBlue,'kidscade_hoodie_blue_pocket_seam_right',.0027
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

function playClip(name){
  if(!mixer)return;
  const clip=animations.find(item=>item.name===name);
  if(!clip)return;

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
  if(name==='front')camera.position.set(0,TARGET_HEIGHT*.76,TARGET_HEIGHT*2.25);
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
  originalMaterials=new Map();

  TOGGLE_NODES.forEach(name=>setNodeVisible(name,false));
  BASE_NODES.forEach(name=>setNodeVisible(name,true));
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
  }catch(error){
    console.error(error);
    showAssetError('Chibi 본체는 열렸지만 파란 후드티 생성에 실패했습니다: '+(error?.message||error));
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
  applyPreset('hoodie');
  applyMaterialMode($('chibiUnlit').checked);
  setCameraView(activeView);

  setReady(true);
  refreshPartChecks();
  refreshMetrics();
  clearAssetError();

  setAssetStatus('로드 완료 · 파란 후드티 제작 완료 · '+uniqueBones().length+' bones · '+animations.length+' animations');
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
      animations,
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

  $('wardrobeParts').addEventListener('change',event=>{
    const input=event.target.closest('[data-chibi-part]');
    if(!input)return;
    setNodeVisible(input.dataset.chibiPart,input.checked);
    const activeHair=HAIR_NODES.find(name=>getNode(name)?.visible)||'';
    $('chibiHair').value=activeHair;
    currentPreset='custom';
    document.querySelectorAll('[data-chibi-preset]').forEach(button=>button.classList.remove('active'));
    refreshMetrics();
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

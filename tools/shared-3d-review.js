import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {SHARED_3D,shared3DProfile} from '../assets/game/manifest/shared-community-3d.js';

const canvas=document.getElementById('view'),select=document.getElementById('assetSelect');
const ui={status:document.getElementById('status'),file:document.getElementById('file'),bytes:document.getElementById('bytes'),tags:document.getElementById('tags'),meshes:document.getElementById('meshes'),materials:document.getElementById('materials'),materialDetail:document.getElementById('materialDetail'),vertexColors:document.getElementById('vertexColors'),materialVerdict:document.getElementById('materialVerdict'),animations:document.getElementById('animations'),bounds:document.getElementById('bounds'),reason:document.getElementById('reason')};
const scene=new THREE.Scene();scene.background=new THREE.Color(0x1b2932);
const camera=new THREE.PerspectiveCamera(50,1,.01,200);camera.position.set(4,3,5);
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
scene.add(new THREE.HemisphereLight(0xeaf7ff,0x53614f,2));
const sun=new THREE.DirectionalLight(0xffffff,2.4);sun.position.set(4,8,5);scene.add(sun);
const floor=new THREE.GridHelper(20,40,0x66808f,0x354852);scene.add(floor);
const axes=new THREE.AxesHelper(2);scene.add(axes);
const root=new THREE.Group();scene.add(root);
const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;
const loader=new GLTFLoader();
const assets=Object.values(SHARED_3D).sort((a,b)=>a.id.localeCompare(b.id));
let current=0,raw=false,loadToken=0,currentObject=null,currentGltf=null,materialMode='original';
const AUDIT_KEY='kidscade-shared3d-audit-v1';
let auditReport=null;
const auditProgress=document.getElementById('auditProgress'),scanAllBtn=document.getElementById('scanAll'),downloadAuditBtn=document.getElementById('downloadAudit');

for(const [i,a] of assets.entries()){const o=document.createElement('option');o.value=String(i);o.textContent=a.id;select.appendChild(o)}
function clear(){while(root.children.length)root.remove(root.children[0])}
function formatBytes(n){return n>1024*1024?(n/1024/1024).toFixed(2)+' MB':(n/1024).toFixed(1)+' KB'}
function normalized(sceneObj){
  const b=new THREE.Box3().setFromObject(sceneObj),size=b.getSize(new THREE.Vector3()),mx=Math.max(size.x,size.y,size.z)||1;
  sceneObj.scale.multiplyScalar(3/mx);
  const b2=new THREE.Box3().setFromObject(sceneObj),c=b2.getCenter(new THREE.Vector3());
  sceneObj.position.x-=c.x;sceneObj.position.z-=c.z;sceneObj.position.y-=b2.min.y;
}
function frameObject(o){
  const b=new THREE.Box3().setFromObject(o),size=b.getSize(new THREE.Vector3()),c=b.getCenter(new THREE.Vector3()),m=Math.max(size.x,size.y,size.z,1);
  controls.target.copy(c);camera.position.set(c.x+m*1.5,c.y+m*.9,c.z+m*1.7);camera.near=Math.max(.01,m/1000);camera.far=Math.max(100,m*20);camera.updateProjectionMatrix();controls.update();
}
const SLOT_COLORS=[0xe85d5d,0x4f91e8,0x55bd79,0xe7bd4d,0xa96bd7,0x42c3c8,0xe88ab6,0xb47b4c];
function materialList(o){
  const rows=[],seen=new Set();
  o.traverse(n=>{if(!n.isMesh)return;const list=Array.isArray(n.material)?n.material:[n.material];for(const m of list){if(!m||seen.has(m.uuid))continue;seen.add(m.uuid);rows.push({
    uuid:m.uuid,name:m.name||'(이름 없음)',type:m.type||'Material',
    color:m.color?'#'+m.color.getHexString():'-',map:!!m.map,normalMap:!!m.normalMap,
    metalness:typeof m.metalness==='number'?m.metalness:null,roughness:typeof m.roughness==='number'?m.roughness:null
  })}});
  return rows;
}
function cloneOriginalMaterials(o){
  o.traverse(n=>{if(!n.isMesh)return;if(!n.userData.qaOriginalMaterial)n.userData.qaOriginalMaterial=Array.isArray(n.material)?n.material.map(m=>m?.clone?.()||m):n.material?.clone?.()||n.material});
}
function restoreOriginalMaterials(o){
  o.traverse(n=>{if(!n.isMesh||!n.userData.qaOriginalMaterial)return;n.material=Array.isArray(n.userData.qaOriginalMaterial)?n.userData.qaOriginalMaterial.map(m=>m?.clone?.()||m):n.userData.qaOriginalMaterial?.clone?.()||n.userData.qaOriginalMaterial});
}
function applySlotDiagnostic(o){
  restoreOriginalMaterials(o);let i=0;
  o.traverse(n=>{if(!n.isMesh)return;const list=Array.isArray(n.material)?n.material:[n.material];n.material=list.map(m=>{const q=new THREE.MeshStandardMaterial({color:SLOT_COLORS[i++%SLOT_COLORS.length],roughness:.72,metalness:.03});q.name='QA_SLOT_'+(m?.name||i);return q});if(!Array.isArray(n.userData.qaOriginalMaterial))n.material=n.material[0]});
}
function semanticColor(name,index){
  const s=(name||'').toLowerCase();
  if(/glass|window|windshield/.test(s))return 0x5d90a6;
  if(/tire|tyre|wheel|rubber/.test(s))return 0x25292c;
  if(/light|lamp|head/.test(s))return 0xffe7a8;
  if(/leaf|foliage|grass|plant/.test(s))return 0x4d9b59;
  if(/trunk|wood|bark/.test(s))return 0x79533a;
  if(/water/.test(s))return 0x56a9c2;
  if(/metal|frame|bumper|pipe/.test(s))return 0x89959b;
  return [0xd9ad36,0x5c91c9,0x63a86d,0xb56a52][index%4];
}
function applyRepairPreview(o){
  restoreOriginalMaterials(o);let i=0;
  o.traverse(n=>{if(!n.isMesh)return;const list=Array.isArray(n.material)?n.material:[n.material];const made=list.map(m=>{
    const q=m?.clone?.()||new THREE.MeshStandardMaterial();
    if(q.color)q.color.setHex(semanticColor((n.name||'')+' '+(m?.name||''),i));
    q.map=null;q.vertexColors=false;q.transparent=!!m?.transparent;q.opacity=m?.opacity??1;i++;return q
  });n.material=Array.isArray(n.userData.qaOriginalMaterial)?made:made[0]});
}
function applyWireframe(o){
  restoreOriginalMaterials(o);o.traverse(n=>{if(!n.isMesh)return;const list=Array.isArray(n.material)?n.material:[n.material];const made=list.map(m=>{const q=m?.clone?.()||new THREE.MeshStandardMaterial();q.wireframe=true;return q});n.material=Array.isArray(n.userData.qaOriginalMaterial)?made:made[0]});
}
function applyMaterialMode(){
  if(!currentObject)return;
  if(materialMode==='slot')applySlotDiagnostic(currentObject);
  else if(materialMode==='repair')applyRepairPreview(currentObject);
  else if(materialMode==='wire')applyWireframe(currentObject);
  else restoreOriginalMaterials(currentObject);
}
function objectStructure(o,gltf=null){
  let meshes=0,skinnedMeshes=0,morphMeshes=0,vertices=0,vertexColorMeshes=0;
  o.traverse(n=>{
    if(!n.isMesh)return;meshes++;
    if(n.isSkinnedMesh)skinnedMeshes++;
    if(n.morphTargetInfluences?.length)morphMeshes++;
    const pos=n.geometry?.getAttribute?.('position');if(pos)vertices+=pos.count||0;if(n.geometry?.getAttribute?.('color'))vertexColorMeshes++;
  });
  const ml=materialList(o),textured=ml.filter(m=>m.map).length;
  const gray=ml.filter(m=>{if(!m.color||m.color==='-')return false;const c=new THREE.Color(m.color);return Math.max(c.r,c.g,c.b)-Math.min(c.r,c.g,c.b)<.08}).length;
  const b=new THREE.Box3().setFromObject(o),sz=b.getSize(new THREE.Vector3()),center=b.getCenter(new THREE.Vector3());
  return {meshes,skinnedMeshes,morphMeshes,vertices,vertexColorMeshes,materials:ml.length,texturedMaterials:textured,grayMaterials:gray,animations:gltf?.animations?.length||0,bounds:[sz.x,sz.y,sz.z],center:[center.x,center.y,center.z]};
}
function auditSuggestion(asset,st){
  if(asset.bytes>4_000_000)return {state:'blocked',reason:'4MB 초과 — 최적화 전 자동 로딩 금지'};
  if(st.skinnedMeshes>0||st.animations>0)return {state:'review',reason:'스킨/애니메이션 모델 — SkeletonUtils·기본 포즈·클립 확인 필요'};
  if(st.materials===0)return {state:'review',reason:'표준 재질 정보가 보이지 않음'};
  if(st.vertexColorMeshes>0)return {state:'approved-candidate',reason:'정점색이 포함된 정적 모델 — 무채색 재질만 보고 색 없음으로 판정하지 않음'};
  if(st.texturedMaterials===0&&st.grayMaterials===st.materials&&st.materials>0)return {state:'repair',reason:st.materials>1?'무텍스처 무채색 재질 슬롯 — 런타임 팔레트 후보':'단일 무채색 재질 — 부분 채색은 모델 편집 필요'};
  if(Math.max(...st.bounds)>100||Math.min(...st.bounds)<=0)return {state:'review',reason:'비정상 바운드/스케일 확인 필요'};
  return {state:'approved-candidate',reason:'구조 검사상 정적 사용 후보 — 최종 육안 확인 필요'};
}
function auditLoad(asset){
  return new Promise(resolve=>{
    loader.load('../'+asset.path,g=>{
      const raw=g.scene,st=objectStructure(raw,g),suggestion=auditSuggestion(asset,st);
      resolve({id:asset.id,path:asset.path,bytes:asset.bytes,tags:asset.tags,usage:{loadPolicy:asset.loadPolicy,maxInstances:asset.maxInstances,cloneMode:asset.cloneMode},...st,suggestion});
    },undefined,e=>resolve({id:asset.id,path:asset.path,bytes:asset.bytes,error:String(e?.message||e),suggestion:{state:'review',reason:'로드 실패'}}));
  });
}
async function runFullAudit(){
  scanAllBtn.disabled=true;downloadAuditBtn.disabled=true;
  const results=[];
  for(let i=0;i<assets.length;i++){
    auditProgress.textContent='구조 검사 '+(i+1)+' / '+assets.length+' · '+assets[i].id;
    results.push(await auditLoad(assets[i]));
  }
  const summary={};
  for(const r of results){const k=r.suggestion?.state||'unknown';summary[k]=(summary[k]||0)+1}
  auditReport={version:1,generatedAt:new Date().toISOString(),assetCount:results.length,summary,results};
  try{localStorage.setItem(AUDIT_KEY,JSON.stringify(auditReport))}catch(_){}
  auditProgress.textContent='검사 완료 · '+Object.entries(summary).map(([k,v])=>k+' '+v).join(' · ');
  scanAllBtn.disabled=false;downloadAuditBtn.disabled=false;
}
function downloadAudit(){
  if(!auditReport)return;
  const blob=new Blob([JSON.stringify(auditReport,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='kidscade-shared-3d-audit.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function materialSummary(o){
  const mats=new Set();let meshes=0,gray=0,vertexColorMeshes=0;
  o.traverse(n=>{if(!n.isMesh)return;meshes++;if(n.geometry?.getAttribute?.('color'))vertexColorMeshes++;const list=Array.isArray(n.material)?n.material:[n.material];for(const m of list){if(!m)continue;mats.add(m.uuid);const c=m.color;if(c){const max=Math.max(c.r,c.g,c.b),min=Math.min(c.r,c.g,c.b);if(max-min<.08)gray++}}});
  return {meshes,materials:mats.size,gray,vertexColorMeshes};
}
function updateMeta(a,g,o){
  const profile=shared3DProfile(a.id);ui.status.textContent=profile.state;ui.status.className=profile.state;
  ui.file.textContent=a.path;ui.bytes.textContent=formatBytes(a.bytes);ui.tags.innerHTML=a.tags.map(t=>'<span class="pill">'+t+'</span>').join('');
  ui.animations.textContent=String(g.animations?.length||0);const ms=materialSummary(o),ml=materialList(o);ui.meshes.textContent=String(ms.meshes);ui.materials.textContent=ms.materials+'개 · 무채색 후보 '+ms.gray;
  ui.materialDetail.innerHTML=ml.slice(0,12).map((m,i)=>(i+1)+'. '+m.name+' · '+m.color+(m.map?' · texture':'')).join('<br>')||'재질 정보 없음';ui.vertexColors.textContent=ms.vertexColorMeshes?ms.vertexColorMeshes+'개 메시에서 사용':'없음';
  const textured=ml.filter(m=>m.map).length;
  ui.materialVerdict.textContent=ms.vertexColorMeshes>0?'정점색을 사용함 — 재질이 회색이어도 실제 모델은 색이 있을 수 있음':ms.materials>1?(textured?'여러 재질/텍스처가 있어 런타임 색상 보정 가능성이 높음':'여러 재질 슬롯이 있어 코드에서 부분별 색상 복구 가능'):ms.materials===1?(textured?'단일 텍스처 재질 — 원본 텍스처 확인 필요':'단일 무텍스처 재질 — 전체 색상 변경만 가능, 부분 채색은 모델 편집 권장'):'재질 없음/비표준 — 모델 편집 또는 원본 재확인 권장';
  const b=new THREE.Box3().setFromObject(o),sz=b.getSize(new THREE.Vector3());ui.bounds.textContent=sz.x.toFixed(2)+' × '+sz.y.toFixed(2)+' × '+sz.z.toFixed(2);ui.reason.textContent=profile.reason||'-';
}
function loadIndex(i){
  current=(i+assets.length)%assets.length;select.value=String(current);const a=assets[current],token=++loadToken;clear();
  ui.file.textContent='불러오는 중...';loader.load('../'+a.path,g=>{if(token!==loadToken)return;const o=g.scene;root.add(o);currentObject=o;currentGltf=g;cloneOriginalMaterials(o);if(!raw)normalized(o);o.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true}});applyMaterialMode();frameObject(o);updateMeta(a,g,o)},undefined,e=>{if(token!==loadToken)return;ui.file.textContent='로드 실패: '+a.path;console.error(e)});
}
select.addEventListener('change',()=>loadIndex(Number(select.value)));document.getElementById('prev').onclick=()=>loadIndex(current-1);document.getElementById('next').onclick=()=>loadIndex(current+1);
document.getElementById('toggleRaw').onclick=()=>{raw=!raw;document.getElementById('toggleRaw').textContent=raw?'정규화 보기':'원본 피벗 보기';loadIndex(current)};
document.getElementById('originalMaterial').onclick=()=>{materialMode='original';applyMaterialMode()};
document.getElementById('slotMaterial').onclick=()=>{materialMode='slot';applyMaterialMode()};
document.getElementById('repairMaterial').onclick=()=>{materialMode='repair';applyMaterialMode()};
document.getElementById('wireMaterial').onclick=()=>{materialMode='wire';applyMaterialMode()};
scanAllBtn.onclick=runFullAudit;downloadAuditBtn.onclick=downloadAudit;
try{auditReport=JSON.parse(localStorage.getItem(AUDIT_KEY)||'null');if(auditReport?.results?.length===assets.length){downloadAuditBtn.disabled=false;auditProgress.textContent='이전에 검사한 '+auditReport.results.length+'개 결과가 있습니다.'}}catch(_){}
function resize(){const r=canvas.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix()}addEventListener('resize',resize);resize();
function loop(){requestAnimationFrame(loop);controls.update();renderer.render(scene,camera)}loop();loadIndex(0);

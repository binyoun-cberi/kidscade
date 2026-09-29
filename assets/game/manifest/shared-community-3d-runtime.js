import * as THREE from 'three';
import {shared3DProfile,shared3DCanUse,shared3DRepairPreset} from './shared-community-3d.js';

export const SHARED_3D_MATERIAL_PRESETS=Object.freeze({
  schoolBus:Object.freeze({body:0xd9a928,glass:0x6a8fa0,tire:0x25292b,metal:0x7f898c,light:0xffdf86,trim:0x2f3436}),
  ruinedHouse:Object.freeze({body:0xa95843,wall:0xa95843,roof:0x34383c,wood:0x68452f,glass:0x557984,trim:0xd2c4a7,metal:0x747d80})
});
const ROLE_PATTERNS=[
  ['glass',/glass|window|windshield|windscreen/i],['tire',/tire|tyre|wheel|rubber/i],['light',/light|lamp|headlight|taillight/i],
  ['roof',/roof|shingle|tile/i],['wall',/wall|brick|plaster|facade|house/i],['wood',/wood|door|frame|beam|bark/i],
  ['metal',/metal|bumper|axle|pipe|rim/i],['trim',/trim|border|step/i]
];
function roleFor(label=''){for(const [role,re] of ROLE_PATTERNS)if(re.test(label))return role;return 'body'}
export function normalizeShared3DObject(obj,target=1){
  obj.updateMatrixWorld(true);
  let box=new THREE.Box3().setFromObject(obj),size=box.getSize(new THREE.Vector3()),base=Math.max(size.x,size.y,size.z)||1;
  obj.scale.multiplyScalar(target/base);obj.updateMatrixWorld(true);
  box=new THREE.Box3().setFromObject(obj);const center=box.getCenter(new THREE.Vector3());
  obj.position.x-=center.x;obj.position.z-=center.z;obj.position.y-=box.min.y;
  return obj;
}
export function repairShared3DMaterials(obj,presetName){
  const p=SHARED_3D_MATERIAL_PRESETS[presetName];if(!p)return obj;
  const fallbackRoles=presetName==='schoolBus'?['body','glass','tire','metal','light','trim']:['wall','roof','wood','glass','trim','metal'];
  const slots=new Map();let cursor=0;
  obj.traverse(n=>{
    if(!n.isMesh)return;
    const list=Array.isArray(n.material)?n.material:[n.material];
    const made=list.map(src=>{
      const m=src?.clone?.()||new THREE.MeshStandardMaterial(),label=(n.name||'')+' '+(src?.name||'');
      const meaningful=ROLE_PATTERNS.some(([,re])=>re.test(label)),key=src?.uuid||label;
      if(!slots.has(key))slots.set(key,fallbackRoles[Math.min(cursor++,fallbackRoles.length-1)]);
      const role=meaningful?roleFor(label):slots.get(key);
      if(m.color)m.color.setHex(p[role]??p.body??0x8c8c8c);
      if(!m.map){m.roughness=role==='glass'?.28:role==='metal'?.52:.78;m.metalness=role==='metal'?.28:0}
      if(role==='glass'){m.transparent=true;m.opacity=.72;m.depthWrite=false}
      m.needsUpdate=true;return m
    });
    n.material=Array.isArray(n.material)?made:made[0];
  });
  return obj;
}
export function prepareShared3DObject(obj,id,target=1){
  if(!obj||!shared3DCanUse(id))return null;
  normalizeShared3DObject(obj,target);
  const preset=shared3DRepairPreset(id);if(preset)repairShared3DMaterials(obj,preset);
  obj.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true}});
  return obj;
}
export function shared3DRuntimeState(id){return shared3DProfile(id).state}

// Non-destructive color/material diagnostics for Kidscade farm assets.
// A neutral untextured material is a suspect, NOT proof of a broken asset.
export const CROP_COLOR_PALETTES=Object.freeze({
  rice:Object.freeze([0x65a849,0x5e9b45,0x83a447,0xc2a046]),
  corn:Object.freeze([0x62a74b,0x5e9c46,0x639a40,0x78a146]),
  carrot:Object.freeze([0x609e49,0x5d9a47,0x679d44,0x679d44])
});
export function isNeutralUntextured(material){
  if(!material?.color||material.map||material.vertexColors||material.alphaMap)return false;
  const c=material.color,values=[c.r,c.g,c.b];
  if(!values.every(Number.isFinite))return false;
  return Math.min(...values)>.34&&Math.max(...values)-Math.min(...values)<.09;
}
export function cropFallbackHex(kind,stage,meshName=''){
  const palette=CROP_COLOR_PALETTES[kind]||CROP_COLOR_PALETTES.rice;
  const i=Math.min(3,Math.max(0,Math.round(Number(stage)||1)-1));
  const name=String(meshName).toLowerCase();
  if(/soil|dirt|earth/.test(name))return 0x86674a;
  if(/root|carrot_body|tuber/.test(name))return kind==='carrot'?0xd8793e:0x86674a;
  if(/grain|ear|ricehead|seed|panicle/.test(name))return i===3?0xe4c067:0xbac86d;
  return palette[i];
}
export function scanSceneColors(root){
  const summary={meshes:0,materials:0,textured:0,vertexColor:0,painted:0,neutralUntextured:0,missingMaterial:0};
  root?.traverse?.(mesh=>{
    if(!mesh.isMesh)return;
    summary.meshes++;
    const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
    for(const mat of materials){
      if(!mat){summary.missingMaterial++;continue}
      summary.materials++;
      if(mat.map||mat.alphaMap)summary.textured++;
      else if(mat.vertexColors)summary.vertexColor++;
      else if(isNeutralUntextured(mat))summary.neutralUntextured++;
      else summary.painted++;
    }
  });
  return summary;
}
export function repairCropColors(root,kind,stage){
  let repainted=0;
  root?.traverse?.(mesh=>{
    if(!mesh.isMesh)return;
    const mats=Array.isArray(mesh.material)?mesh.material:[mesh.material];
    const next=mats.map(mat=>{
      if(!isNeutralUntextured(mat))return mat;
      const clone=mat.clone();
      clone.color.setHex(cropFallbackHex(kind,stage,mesh.name+' '+(mat.name||'')));
      clone.needsUpdate=true;repainted++;
      return clone;
    });
    mesh.material=Array.isArray(mesh.material)?next:next[0];
  });
  return repainted;
}

// Kept for existing rice-specific QA and compatibility with PR 2 imports.
export function repairRiceColors(root,stage){return repairCropColors(root,'rice',stage)}

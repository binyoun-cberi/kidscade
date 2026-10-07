import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

test('global admin exposes the 3D character studio',()=>{
  const admin=fs.readFileSync(path.join(ROOT,'teacher','index.html'),'utf8');
  const html=fs.readFileSync(path.join(ROOT,'teacher','character-3d-studio.html'),'utf8');
  assert.match(admin,/\/teacher\/character-3d-studio\.html/);
  assert.match(html,/전역 관리자/);
  assert.match(html,/three-r160/);
  assert.match(html,/character-3d-studio\.js/);
});

test('3D character studio builds a reusable humanoid rig',()=>{
  const js=fs.readFileSync(path.join(ROOT,'teacher','character-3d-studio.js'),'utf8');
  for(const bone of ['Root','Hips','Spine','Chest','Neck','Head','UpperArm_L','LowerArm_L','Hand_L','UpperLeg_L','LowerLeg_L','Foot_L']){
    assert.match(js,new RegExp("'"+bone+"'"));
  }
  assert.match(js,/new THREE\.SkinnedMesh/);
  assert.match(js,/new THREE\.Skeleton/);
  assert.match(js,/skinIndex/);
  assert.match(js,/skinWeight/);
  assert.match(js,/kidscade-humanoid-v3/);
});

test('3D character studio previews and exports the standard animation set',()=>{
  const js=fs.readFileSync(path.join(ROOT,'teacher','character-3d-studio.js'),'utf8');
  for(const clip of ['IDLE','WALK','RUN','JUMP','ATTACK','HURT','DEAD']){
    assert.match(js,new RegExp("'"+clip+"'"));
  }
  assert.match(js,/GLTFExporter/);
  assert.match(js,/binary:true/);
  assert.match(js,/animations:bodyStyle==='assetChibi'\\?chibiAnimations:clips/);
  assert.match(js,/kidscade-'\+bodyStyle\+'-rigged-character\\.glb/);
});

test('3D character studio remains global-admin only',()=>{
  const js=fs.readFileSync(path.join(ROOT,'teacher','character-3d-studio.js'),'utf8');
  assert.match(js,/kc_teacher_admin_key/);
  assert.match(js,/\/api\/teacher\/overview/);
  assert.match(js,/body\.scope!=='global'/);
});


test('vendors every Three addon imported by the 3D studio',()=>{
  const required=[
    'assets/vendor/three-r160/addons/controls/OrbitControls.js',
    'assets/vendor/three-r160/addons/exporters/GLTFExporter.js',
    'assets/vendor/three-r160/addons/utils/BufferGeometryUtils.js',
    'assets/vendor/three-r160/addons/utils/TextureUtils.js'
  ];
  for(const rel of required){
    assert.ok(fs.existsSync(path.join(ROOT,rel)),rel+' must exist in the local Three r160 vendor');
  }
  const exporter=fs.readFileSync(path.join(ROOT,'assets/vendor/three-r160/addons/exporters/GLTFExporter.js'),'utf8');
  assert.match(exporter,/\.\.\/utils\/TextureUtils\.js/);
});


test('3D studio starts with only the local Three core module',()=>{
  const js=fs.readFileSync(path.join(ROOT,'teacher','character-3d-studio.js'),'utf8');
  assert.match(js,/import \* as THREE from '\.\.\/assets\/vendor\/three-r160\/three\.module\.js'/);
  assert.doesNotMatch(js,/^import .*OrbitControls/m);
  assert.doesNotMatch(js,/^import .*GLTFExporter/m);
  assert.doesNotMatch(js,/^import .*BufferGeometryUtils/m);
  assert.match(js,/createSimpleOrbitControls/);
  assert.match(js,/mergeRigidGeometries/);
  assert.match(js,/await import\('\.\.\/assets\/vendor\/three-r160\/addons\/exporters\/GLTFExporter\.js'\)/);
});


test('Chibi v2 keeps the reference-inspired SD proportions explicit',()=>{
  const js=fs.readFileSync(path.join(ROOT,'teacher','character-3d-studio.js'),'utf8');
  const html=fs.readFileSync(path.join(ROOT,'teacher','character-3d-studio.html'),'utf8');
  assert.match(js,/chibi2/);
  assert.match(js,/action2/);
  assert.match(js,/headRY:\(action \? \.164 : \.172\)\*H/);
  assert.match(js,/hipY:\.418\*H/);
  assert.match(js,/handX:\(action \? \.072 : \.056\)\*H/);
  assert.match(js,/footZ:\(action \? \.170 : \.148\)\*H/);
  assert.match(html,/V2 · SD 도형형/);
  assert.match(html,/V2 · 액션 과장형/);
});

test('3D studio offers four-way silhouette inspection',()=>{
  const html=fs.readFileSync(path.join(ROOT,'teacher','character-3d-studio.html'),'utf8');
  const js=fs.readFileSync(path.join(ROOT,'teacher','character-3d-studio.js'),'utf8');
  for(const view of ['front','threeQuarter','side','back']){
    assert.match(html,new RegExp('data-view="'+view+'"'));
  }
  assert.match(js,/function setCameraView/);
  assert.match(js,/data-body-style/);
});


test('SoftMesh v3 uses continuous skinned shells and blended joint weights',()=>{
  const js=fs.readFileSync(path.join(ROOT,'teacher','character-3d-studio.js'),'utf8');
  const html=fs.readFileSync(path.join(ROOT,'teacher','character-3d-studio.html'),'utf8');
  assert.match(js,/soft3/);
  assert.match(js,/function skinnedRingShell/);
  assert.match(js,/function softTorsoGeometry/);
  assert.match(js,/function softForearmGeometry/);
  assert.match(js,/function softLegGeometry/);
  assert.match(js,/blended-two-bone-joints/);
  assert.match(js,/\[\[upperBone,\.86\],\[lowerBone,\.14\]\]/);
  assert.match(js,/\[\[upperBone,\.35\],\[lowerBone,\.65\]\]/);
  assert.match(html,/V3 · SoftMesh 실험형/);
  assert.match(js,/blended-two-bone-joints/);
});

test('SoftMesh v3 records the inspected Kidscade people GLB baseline',()=>{
  const js=fs.readFileSync(path.join(ROOT,'teacher','character-3d-studio.js'),'utf8');
  assert.match(js,/character-female-a\.glb/);
  assert.match(js,/character-male-a\.glb/);
  assert.match(js,/femaleA:\{triangles:876,skinnedMeshes:2,joints:7\}/);
  assert.match(js,/maleA:\{triangles:723,skinnedMeshes:2,joints:7\}/);
  assert.match(js,/Existing Kidscade people GLBs were inspected as topology\/skinning references/);
});


test('Chibi asset mode is the default 3D avatar workflow',()=>{
  const js=fs.readFileSync(path.join(ROOT,'teacher','character-3d-studio.js'),'utf8');
  const html=fs.readFileSync(path.join(ROOT,'teacher','character-3d-studio.html'),'utf8');
  assert.match(js,/bodyStyle='assetChibi'/);
  assert.match(js,/GLTFLoader/);
  assert.match(js,/\/chibi\/glb\/allinonepr\.glb/);
  assert.match(html,/실물 Chibi Asset · 기본/);
  assert.match(html,/Styloo Chibi Characters v1\.2/);
});

test('Chibi wardrobe exposes the source clothing and hair parts',()=>{
  const js=fs.readFileSync(path.join(ROOT,'teacher','character-3d-studio.js'),'utf8');
  const html=fs.readFileSync(path.join(ROOT,'teacher','character-3d-studio.html'),'utf8');
  for(const part of ['shirt','skirt','shoe','bag','chemise','pants','hat','greenoutfit','ninjassuit','armorhelmet','armorshoe','hairvariant','hairtail']){
    assert.match(js,new RegExp(part.replace('.','\\.')));
  }
  for(const preset of ['student','merchant','archer','ninja','knight']){
    assert.match(html,new RegExp('data-chibi-preset="'+preset+'"'));
  }
  assert.match(js,/applyChibiPreset/);
  assert.match(js,/applyChibiHair/);
  assert.match(js,/selectedChibiParts/);
});

test('Chibi export keeps source animations and exports visible parts only',()=>{
  const js=fs.readFileSync(path.join(ROOT,'teacher','character-3d-studio.js'),'utf8');
  assert.match(js,/chibiAnimations/);
  assert.match(js,/anim_crouch/);
  assert.match(js,/anim_iddle/);
  assert.match(js,/anim_walk/);
  assert.match(js,/anim_run/);
  assert.match(js,/anim_jump/);
  assert.match(js,/onlyVisible:bodyStyle==='assetChibi'/);
  assert.match(js,/animations:bodyStyle==='assetChibi'\?chibiAnimations:clips/);
});

test('Chibi asset manifest records CC0 source and wardrobe presets',()=>{
  const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,'chibi','asset-manifest.json'),'utf8'));
  assert.equal(manifest.license,'CC0-1.0');
  assert.equal(manifest.primary,'glb/allinonepr.glb');
  assert.ok(manifest.presets.student.includes('shirt'));
  assert.ok(manifest.presets.ninja.includes('ninjassuit'));
  assert.ok(manifest.presets.knight.includes('armorhelmet'));
  assert.equal(manifest.animations.length,11);
});

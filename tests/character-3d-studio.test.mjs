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
  assert.match(js,/kidscade-humanoid-v2/);
});

test('3D character studio previews and exports the standard animation set',()=>{
  const js=fs.readFileSync(path.join(ROOT,'teacher','character-3d-studio.js'),'utf8');
  for(const clip of ['IDLE','WALK','RUN','JUMP','ATTACK','HURT','DEAD']){
    assert.match(js,new RegExp("'"+clip+"'"));
  }
  assert.match(js,/GLTFExporter/);
  assert.match(js,/binary:true/);
  assert.match(js,/animations:clips/);
  assert.match(js,/kidscade-rigged-character\.glb/);
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
  assert.match(html,/V2 · SD 기본형/);
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

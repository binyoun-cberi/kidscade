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
  assert.match(js,/kidscade-humanoid-v1/);
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

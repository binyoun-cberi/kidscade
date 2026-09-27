const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const dir=path.join(root,'games','job_driver_license');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const css=fs.readFileSync(path.join(dir,'driver-license.css'),'utf8');
const js=fs.readFileSync(path.join(dir,'driver-license.js'),'utf8');

test('Driver License keeps automatic/manual exam modes and full course stages',()=>{
  assert.match(html,/2종 자동/);
  assert.match(html,/1종 보통/);
  for(const stage of ['PREP','HILL','INTERSECTION','PARK','ACCEL','EMERGENCY','SECURE']){
    assert.match(js,new RegExp("stage==='"+stage+"'"));
  }
});

test('Driver License v8 uses SAT collision instead of AABB fallback',()=>{
  assert.match(js,/function rectsIntersectSAT/);
  assert.match(js,/function rectCorners2D/);
  assert.match(js,/return rectsIntersectSAT\(carRect\(\)/);
  assert.doesNotMatch(js,/const minX=Math\.min\(\.\.\.carPts/);
});

test('Driver License v8 has reverse camera and steering prediction guides',()=>{
  assert.match(html,/id="backupCamera"/);
  assert.match(css,/\.backup-camera\.show/);
  assert.match(js,/backupCamera=new THREE\.PerspectiveCamera/);
  assert.match(js,/function initBackupGuides/);
  assert.match(js,/function updateBackupGuide/);
  assert.match(js,/Math\.tan\(car\.wheelAngle\)\/2\.62/);
  assert.match(js,/currentDirection\(\)===-1/);
});

test('Driver License v8 records driving quality and parking alignment',()=>{
  assert.match(js,/let runStats=/);
  assert.match(js,/function parkingMetrics/);
  assert.match(js,/runStats\.maxSpeed/);
  assert.match(js,/runStats\.collisions/);
  assert.match(js,/runStats\.offroad/);
  assert.match(js,/주차 정렬/);
  assert.match(css,/result-summary/);
});

test('Driver License v8 touch pedals use continuous pointer position',()=>{
  assert.match(js,/const y=clamp\(\(e\.clientY-r\.top\)/);
  assert.match(js,/touch\[kind\]=clamp\(\.1\+y\*\.9/);
  assert.doesNotMatch(js,/const base=kind==='throttle'/);
});

test('Driver License module syntax parses after removing ESM imports',()=>{
  const body=js.replace(/^import .*$/gm,'');
  assert.doesNotThrow(()=>new Function(body));
});

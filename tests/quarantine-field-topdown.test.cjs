const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const ROOT=path.resolve(__dirname,'..');
const gameDir=path.join(ROOT,'games','high_quarantine_17');

test('격리구역 17 v21 uses the same 3D camp language for CCTV and field missions',()=>{
  const html=fs.readFileSync(path.join(gameDir,'격리구역 17.html'),'utf8');
  const outbreak=fs.readFileSync(path.join(gameDir,'outbreak-v3.js'),'utf8');
  const field=fs.readFileSync(path.join(gameDir,'field-topdown-v18.js'),'utf8');
  const facility=fs.readFileSync(path.join(gameDir,'facility-3d-v20.js'),'utf8');
  const field3d=fs.readFileSync(path.join(gameDir,'field-3d-v21.js'),'utf8');
  const game=fs.readFileSync(path.join(gameDir,'game-v2.js'),'utf8');
  const catalog=JSON.parse(fs.readFileSync(path.join(ROOT,'data','games.json'),'utf8'));
  const entry=(catalog.games||catalog).find(g=>g.id==='high_quarantine_17');

  assert.match(html,/field-topdown-v18\.js\?v=4/);
  assert.match(html,/facility-3d-v20\.js\?v=3/);
  assert.match(html,/three-r160\/three\.module\.js/);
  assert.match(html,/3D 격리시설\/CAMP-17/);
  assert.equal(entry.href,'games/high_quarantine_17/격리구역 17.html?v=21');

  assert.match(field,/api\.respondCamp=function/);
  assert.match(field,/api\.respondGlobal=function/);
  assert.match(field,/api\.respondPatrol=function/);
  assert.match(field,/startPatrol/);
  assert.match(field,/escortDistance/);
  assert.match(field,/keys\.mobileFire/);
  assert.match(field,/mode==='patrol'/);
  assert.match(field,/q17FightRoom/);
  assert.match(field,/resetMission\('isolation'/);
  assert.match(field,/자동포탑/);
  assert.match(field,/state\.crates/);
  assert.match(field,/state\.survivors/);
  assert.match(field,/bridge\(\)/);
  assert.match(field,/kidscade-avatar-studio-preview/);
  assert.match(field,/guest-default\.png/);
  assert.match(field,/Q17Field3DBridge/);
  assert.match(field,/aimAt:\(x,y,down=false\)/);
  assert.match(field,/window\.Q17Field3D\?\.active/);
  for(const asset of ['tent-detailed-open.glb','construction-fence.glb','ambulance.glb','gatelng-gun-turret.glb','character-female-a.glb']){
    assert.ok(field3d.includes(asset),asset);
  }
  assert.match(field3d,/raycaster\.ray\.intersectPlane/);
  assert.match(field3d,/kidscade-avatar-studio-preview/);
  assert.match(field3d,/q17FieldStage3D/);
  assert.match(field3d,/q17-field-input-layer/);
  assert.match(field3d,/version:'21\.1'/);
  for(const asset of ['tent-detailed-open.glb','bed.glb','construction-fence.glb','ambulance.glb','gatelng-gun-turret.glb','character-male-a.glb']){
    assert.ok(facility.includes(asset),asset);
  }
  assert.match(facility,/Q17Surveillance/);
  assert.match(facility,/getIsolationSnapshot/);
  assert.match(facility,/applyNoveltyPalette|function tint\(/);
  assert.match(facility,/q17Camp3D/);
  assert.match(facility,/q17Iso3D/);
  assert.match(facility,/position\.set\(0,13\.2,15\.8\)/);
  assert.match(facility,/position\.set\(0,10\.8,12\.5\)/);
  assert.match(facility,/Residential cluster/);
  assert.match(facility,/Defensive perimeter/);
  assert.match(facility,/air-lock entry/);
  assert.match(facility,/isoSlotLights/);
  assert.match(facility,/campBeacon/);
  assert.match(facility,/mode==='camp'\?1\.88:1\.72/);
  assert.match(facility,/version:'20\.2'/);
  for(const landmark of ['지휘소','A/B 격리동','보급창고','의무막사','외곽 검문 게이트']){
    assert.ok(facility.includes(landmark)&&field3d.includes(landmark),'same CAMP-17 landmarks: '+landmark);
  }
  assert.match(facility,/X\(270\)/);
  assert.match(field3d,/sx\(270\)/);
  assert.match(facility,/X\(720\)/);
  assert.match(field3d,/sx\(720\)/);
  assert.match(field3d,/function ensureCrate/);
  assert.match(field3d,/if\(!s\.active\)\{last=t;requestAnimationFrame\(frame\);return\}/);
  assert.match(outbreak,/resolveIsolationField:function/);
  assert.match(outbreak,/현장 소탕 완료/);

  assert.match(game,/patrolWeek=\[1,3,5\]/);
  assert.match(game,/time:94/);
  assert.match(game,/time:102/);
  assert.doesNotThrow(()=>new Function(field));
  assert.doesNotThrow(()=>new Function(facility.replace(/^import .*$/mg,'').replace(/import\\.meta\\.url/g,'document.baseURI')));
  assert.doesNotThrow(()=>new Function(field3d.replace(/^import .*$/mg,'').replace(/import\\.meta\\.url/g,'document.baseURI')));
  assert.doesNotThrow(()=>new Function(game));
  assert.doesNotThrow(()=>new Function(outbreak));
});

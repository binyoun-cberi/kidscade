const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const ROOT=path.resolve(__dirname,'..');
const gameDir=path.join(ROOT,'games','high_quarantine_17');

test('격리구역 17 v22 keeps checkpoint, isolation, CAMP and field missions in one 3D flow',()=>{
  const html=fs.readFileSync(path.join(gameDir,'격리구역 17.html'),'utf8');
  const outbreak=fs.readFileSync(path.join(gameDir,'outbreak-v3.js'),'utf8');
  const field=fs.readFileSync(path.join(gameDir,'field-topdown-v18.js'),'utf8');
  const surveillance=fs.readFileSync(path.join(gameDir,'surveillance-v11.js'),'utf8');
  const facility=fs.readFileSync(path.join(gameDir,'facility-3d-v20.js'),'utf8');
  const field3d=fs.readFileSync(path.join(gameDir,'field-3d-v21.js'),'utf8');
  const main3d=fs.readFileSync(path.join(gameDir,'quarantine-3d-v22.js'),'utf8');
  const game=fs.readFileSync(path.join(gameDir,'game-v2.js'),'utf8');
  const catalog=JSON.parse(fs.readFileSync(path.join(ROOT,'data','games.json'),'utf8'));
  const entry=(catalog.games||catalog).find(g=>g.id==='high_quarantine_17');

  assert.match(html,/surveillance-v11\.js\?v=8/);
  assert.match(html,/field-topdown-v18\.js\?v=6/);
  assert.match(html,/facility-3d-v20\.js\?v=5/);
  assert.match(html,/field-3d-v21\.js\?v=4/);
  assert.match(html,/three-r160\/three\.module\.js/);
  assert.match(html,/3D 격리시설\/CAMP-17/);
  assert.equal(entry.href,'games/high_quarantine_17/격리구역 17.html?v=22');

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
  assert.match(field,/function moveTowardSmart/);
  assert.match(field,/function findWalkable/);
  assert.match(field,/function segmentBlocked/);
  assert.match(field,/state\.pendingThreats/);
  assert.match(field,/sourceResidents/);
  assert.match(field,/sourceThreats/);
  assert.match(field,/lostIds:state\.survivors/);
  assert.match(field,/Math\.max\(1,Number\(state\.payload\.count\)\|\|1\)/);
  assert.match(surveillance,/const CAMP_OBSTACLES=/);
  assert.match(surveillance,/function campBlockedAt/);
  assert.match(surveillance,/function campWaypoint/);
  assert.match(surveillance,/const step=3,minX=4,maxX=96/);
  assert.match(surveillance,/residents:liveResidents\.map/);
  assert.match(surveillance,/threats:active\.map/);
  assert.match(surveillance,/applyCombatLosses\(result\.losses\|\|0,result\.lostIds\)/);
  for(const asset of ['tent-detailed-open.glb','construction-fence.glb','ambulance.glb','gatelng-gun-turret.glb','character-female-a.glb']){
    assert.ok(field3d.includes(asset),asset);
  }
  assert.match(field3d,/raycaster\.ray\.intersectPlane/);
  assert.match(field3d,/kidscade-avatar-studio-preview/);
  assert.match(field3d,/q17FieldStage3D/);
  assert.match(field3d,/q17-field-input-layer/);
  assert.match(field3d,/version:'21\.3'/);
  assert.match(main3d,/Q-17 CHECKPOINT/);
  assert.match(main3d,/통과 · CAMP-17/);
  assert.match(main3d,/A 추가검사/);
  assert.match(main3d,/고위험 격리/);
  assert.match(main3d,/syncQueue/);
  assert.match(main3d,/q17-main3d/);
  assert.match(main3d,/version:'22\.0'/);
  assert.match(game,/getMain3DSnapshot/);
  assert.match(game,/q17-main3d/);
  assert.match(game,/personId:'w'\+state\.weekIndex\+'c'\+state\.caseIndex/);
  assert.match(outbreak,/personId:p\.personId/);
  assert.match(surveillance,/personId:payload\.personId/);
  assert.match(field,/personId:seed\?\.personId/);
  assert.match(field3d,/function actorPath/);
  assert.match(facility,/function personAsset/);
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
  assert.match(facility,/air-lock entry/);
  assert.match(facility,/isoSlotLights/);
  assert.match(facility,/isoSlotAssignments/);
  assert.match(facility,/isoActorSlots/);
  assert.match(facility,/\.3,tz=\(Number\(info\.y\)-50\)\*\.16875/);
  assert.match(facility,/campBeacon/);
  assert.match(facility,/mode==='camp'\?1\.88:1\.72/);
  assert.match(facility,/version:'20\.4'/);
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
  assert.doesNotThrow(()=>new Function(surveillance));
  assert.doesNotThrow(()=>new Function(facility.replace(/^import .*$/mg,'').replace(/import\.meta\.url/g,'document.baseURI')));
  assert.doesNotThrow(()=>new Function(field3d.replace(/^import .*$/mg,'').replace(/import\.meta\.url/g,'document.baseURI')));
  assert.doesNotThrow(()=>new Function(main3d.replace(/^import .*$/mg,'').replace(/import\.meta\.url/g,'document.baseURI')));
  assert.doesNotThrow(()=>new Function(game));
  assert.doesNotThrow(()=>new Function(outbreak));
});

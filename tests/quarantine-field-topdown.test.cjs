const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const ROOT=path.resolve(__dirname,'..');
const gameDir=path.join(ROOT,'games','high_quarantine_17');

test('격리구역 17 v26 keeps one 3D flow and preserves outbreak pressure across eight weeks',()=>{
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

  assert.match(html,/surveillance-v11\.js\?v=12/);
  assert.match(html,/field-topdown-v18\.js\?v=12/);
  assert.match(html,/facility-3d-v20\.js\?v=9/);
  assert.match(html,/field-3d-v21\.js\?v=7/);
  assert.match(html,/three-r160\/three\.module\.js/);
  assert.match(html,/3D 격리시설\/CAMP-17/);
  assert.equal(entry.href,'games/high_quarantine_17/격리구역 17.html?v=26');

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
  assert.doesNotMatch(field,/kidscade-avatar|avatar-studio-preview|guest-default\.png/);
  assert.match(field,/Q17Field3DBridge/);
  assert.match(field,/지휘소 장비 책상/);
  assert.match(field,/보급 천막·적재물/);
  assert.match(field,/addObstacle\(770,95,38,82,'금속 쉘터'\)/);
  assert.match(field,/\{x:760,y:395,r:15,opened:false/);
  assert.match(surveillance,/지휘소 장비 책상/);
  assert.match(surveillance,/보급 천막·적재물/);
  assert.match(surveillance,/경찰차/);
  assert.match(surveillance,/지원 밴/);
  assert.match(main3d,/plane\(world,15,16,0x4a4d49\)/);
  assert.match(main3d,/\[-\.65,\.865,2\.08\]/);
  assert.match(facility,/\[X\(247\),\.95,Z\(102\)\]/);
  assert.match(facility,/\[X\(273\),\.95,Z\(102\)\]/);
  assert.match(facility,/\[\[520,234\],\[760,395\],\[350,288\]\]/);

  assert.match(field,/aimAt:\(x,y,down=false\)/);
  assert.match(field,/window\.Q17Field3D\?\.active/);
  assert.match(field,/function moveTowardSmart/);
  assert.match(field,/function pointBlocked/);
  assert.match(field,/function segmentBlockedFor/);
  assert.match(field,/function fieldWaypoint/);
  assert.match(field,/const step=24,r=e\.r\|\|10/);
  assert.doesNotMatch(field,/폐기물 컨테이너/);
  assert.doesNotMatch(field3d,/A\.dumpster/);
  assert.doesNotMatch(facility,/A\.dumpster/);
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
  assert.match(surveillance,/function fieldResidentSelection/);
  assert.match(surveillance,/survivorCount:fieldResidents\.length/);
  assert.match(surveillance,/residents:fieldResidents\.map/);
  assert.match(surveillance,/threats:active\.map/);
  assert.match(surveillance,/applyCombatLosses\(result\.losses\|\|0,result\.lostIds\)/);
  for(const asset of [
    'tent-detailed-open.glb','bed-single.glb','construction-fence.glb','ambulance.glb',
    'police.glb','van.glb','structure-metal.glb','structure-canvas.glb',
    'fence-fortified.glb','box-large.glb','barrel.glb','radio.glb','laptop.glb',
    'gatelng-gun-turret.glb','character-female-a.glb'
  ]) assert.ok(field3d.includes(asset),asset);
  assert.match(field3d,/raycaster\.ray\.intersectPlane/);
  assert.doesNotMatch(field3d,/kidscade-avatar|avatar-studio-preview|guest-default\.png/);
  assert.match(field3d,/q17FieldStage3D/);
  assert.match(field3d,/q17-field-input-layer/);
  assert.match(field3d,/version:'21\.7'/);
  assert.match(main3d,/Q-17 CHECKPOINT/);
  assert.match(main3d,/통과 · CAMP-17/);
  assert.match(main3d,/A 추가검사/);
  assert.match(main3d,/격리 · 소각 처리/);
  assert.match(main3d,/syncQueue/);
  assert.match(main3d,/q17-main3d/);
  assert.match(main3d,/version:'22\.4'/);
  assert.match(main3d,/bottom:390px/);
  assert.match(main3d,/camera\.aspect<\.9/);
  assert.match(main3d,/const DECISION_PATHS=/);
  assert.match(main3d,/function pathPoint/);
  assert.match(main3d,/function walkPose/);
  assert.match(main3d,/queueActors\.get\(info\?\.id\)/);
  assert.match(main3d,/function mainSceneVisible/);
  for(const tool of ['id','doc','temp','uv','blood','resp','bag'])assert.ok(main3d.includes("tool==='"+tool+"'")||main3d.includes("tool==='"+tool+"'"),'3D tool feedback '+tool);
  assert.match(game,/처리 현황/);
  assert.match(game,/setTimeout\(nextCase,1050\)/);
  assert.match(game,/정유리'[\s\S]*infected:true/);
  assert.match(game,/김로아'[\s\S]*infected:true/);
  assert.match(game,/김현우'[\s\S]*infected:true/);
  assert.doesNotMatch(game,/pp\.infected&&action==='quarantine'\)state\.infection=clamp\(state\.infection-1/);
  assert.match(outbreak,/확진 소각 완료[\s\S]*시설 내 감염원 제거/);
  assert.doesNotMatch(outbreak,/burnDetainee[\s\S]{0,900}infectionDelta:-1/);
  assert.match(field,/mode==='camp'[\s\S]*infectionDelta:-1/);
  assert.match(surveillance,/\.slice\(0,12\)/);
  assert.match(surveillance,/Math\.hypot\(\(Number\(r\.x\)/);
  assert.match(facility,/\.slice\(0,20\)/);
  assert.match(facility,/q17Camp3DPopulation/);
  assert.match(facility,/3D 표시/);
  assert.match(outbreak,/admitResident/);
  assert.match(surveillance,/function admitResident/);
  assert.match(surveillance,/CAMP-17 입소/);
  assert.match(field,/slice\(0,12\)/);
  assert.match(field,/totalResidentCount/);
  assert.match(field,/위험구역 인근/);
  assert.match(field,/personId:src\.personId/);
  assert.match(game,/getMain3DSnapshot/);
  assert.match(game,/q17-main3d/);
  assert.match(game,/personId:'w'\+state\.weekIndex\+'c'\+state\.caseIndex/);
  assert.match(outbreak,/personId:p\.personId/);
  assert.match(surveillance,/personId:payload\.personId/);
  assert.match(field,/personId:seed\?\.personId/);
  assert.match(field3d,/function actorPath/);
  assert.match(facility,/function personAsset/);
  assert.match(field3d,/const playerRoot=new THREE\.Group\(\)/);
  assert.match(field3d,/cloneAsset\(A\.maleC,1\.72/);
  assert.match(field,/경찰차/);
  assert.match(field,/지원 밴/);
  assert.match(main3d,/A\.police/);
  assert.match(main3d,/A\.fortifiedFence/);
  assert.match(main3d,/A\.radio/);
  assert.match(main3d,/A\.laptop/);
  assert.match(facility,/A\.structureMetal/);
  assert.match(facility,/A\.sideTable/);

  for(const asset of [
    'tent-detailed-open.glb','bed-single.glb','construction-fence.glb','ambulance.glb',
    'police.glb','van.glb','structure-metal.glb','structure-canvas.glb',
    'fence-fortified.glb','box-large.glb','barrel.glb','radio.glb','laptop.glb',
    'trashcan.glb','gatelng-gun-turret.glb','character-male-a.glb'
  ]) assert.ok(facility.includes(asset),asset);
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
  assert.match(facility,/version:'20\.8'/);
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
  for(const rel of [
    'assets/game/3d/interiors/kenney-furniture-kit/bed-single.glb',
    'assets/game/3d/interiors/kenney-furniture-kit/radio.glb',
    'assets/game/3d/interiors/kenney-furniture-kit/laptop.glb',
    'assets/game/3d/interiors/kenney-furniture-kit/trashcan.glb',
    'assets/game/3d/survival/kenney-survival-kit/structure-metal.glb',
    'assets/game/3d/survival/kenney-survival-kit/structure-canvas.glb',
    'assets/game/3d/survival/kenney-survival-kit/fence-fortified.glb',
    'assets/game/3d/survival/kenney-survival-kit/box-large.glb',
    'assets/game/3d/survival/kenney-survival-kit/barrel.glb',
    'assets/game/3d/vehicles/kenney-car-kit/police.glb',
    'assets/game/3d/vehicles/kenney-car-kit/van.glb',
  ]) assert.ok(fs.existsSync(path.join(ROOT,rel)),'missing Q17 shared asset '+rel);
  assert.doesNotThrow(()=>new Function(field));
  assert.doesNotThrow(()=>new Function(surveillance));
  assert.doesNotThrow(()=>new Function(facility.replace(/^import .*$/mg,'').replace(/import\.meta\.url/g,'document.baseURI')));
  assert.doesNotThrow(()=>new Function(field3d.replace(/^import .*$/mg,'').replace(/import\.meta\.url/g,'document.baseURI')));
  assert.doesNotThrow(()=>new Function(main3d.replace(/^import .*$/mg,'').replace(/import\.meta\.url/g,'document.baseURI')));
  assert.doesNotThrow(()=>new Function(game));
  assert.doesNotThrow(()=>new Function(outbreak));
});

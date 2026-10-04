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

test('Driver License v9 touch pedals act like real pedals and can be feathered upward',()=>{
  assert.match(js,/touch\[kind\]=1/);
  assert.match(js,/const up=Math\.max\(0,startY-e\.clientY\)/);
  assert.match(js,/touch\[kind\]=clamp\(1-up\/travel,0,1\)/);
});

test('Driver License module syntax parses after removing ESM imports',()=>{
  const body=js.replace(/^import .*$/gm,'');
  assert.doesNotThrow(()=>new Function(body));
});


test('Driver License steering input targets a shaped angle instead of continuously accumulating',()=>{
  assert.match(js,/const rawSteer=Math\.abs\(inp\.steer\)<\.025\?0:inp\.steer/);
  assert.match(js,/const shapedSteer=Math\.sign\(rawSteer\)\*Math\.pow\(Math\.abs\(rawSteer\),1\.18\)/);
  assert.match(js,/const steerTarget=shapedSteer\*steerLimit/);
  assert.match(js,/approach\(car\.steeringWheel,steerTarget/);
  assert.doesNotMatch(js,/car\.steeringWheel\+inp\.steer\*330\*dt/);
});

test('Driver License v9 has examiner rules and immediate disqualification paths',()=>{
  assert.match(js,/const EXAM_RULES=/);
  assert.match(js,/function examinerMonitor/);
  assert.match(js,/function disqualify/);
  assert.match(js,/안전띠 미착용/);
  assert.match(js,/경사로 1m 이상 후방 밀림/);
  assert.match(js,/신호위반 또는 정지선 침범/);
  assert.match(js,/안전사고 발생/);
});

test('Driver License v17 evaluates emergency stop before the three-second hazard window',()=>{
  assert.match(html,/id="hazard"/);
  assert.match(js,/function toggleHazard/);
  assert.match(js,/emergencyStopLimit:2/);
  assert.match(js,/emergencyHazardLimit:3/);
  assert.match(js,/hazardElapsed=examiner\.emergencyStopTime===null\?0:emergencyTimer-examiner\.emergencyStopTime/);
  assert.match(js,/정지 후 3초 이내 비상등 조작 실패/);
  assert.match(js,/정지 전 비상등 조작/);
});

test('Driver License v9 requires three-second hill stop and parking-brake confirmation',()=>{
  assert.match(js,/hillStopSeconds:3/);
  assert.match(js,/parkingBrakeHold>=1/);
  assert.match(js,/parkingLimit:120/);
});

test('Driver License v9 exposes a live examiner panel',()=>{
  assert.match(html,/id="examinerPanel"/);
  assert.match(html,/id="examinerState"/);
  assert.match(html,/id="examinerText"/);
  assert.match(css,/#examinerPanel/);
});


test('Driver License v10 upgrades the exam course with shared 3D environment assets',()=>{
  for(const token of ['traffic-light.glb','construction-cone.glb','light-square.glb','tree-default.glb','tree-oak.glb','tree-pine-round-a.glb','big-building.glb','building-red.glb','sedan.glb']){
    assert.match(js,new RegExp(token.replace(/[.*+?^$\{\}()|[\]\\]/g,'\\$&')));
  }
  assert.match(js,/function rebuildVisualEnvironment/);
  assert.match(js,/function cloneVisual/);
  assert.match(js,/function makeEnhancedRoad/);
});

test('Driver License v10 uses tighter cinematic lighting, fog and driver FOV',()=>{
  assert.match(js,/new THREE\.Fog\(0x86c8e4,28,92\)/);
  assert.match(js,/new THREE\.PerspectiveCamera\(54/);
  assert.match(js,/sunLight\.shadow\.mapSize\.set\(2048,2048\)/);
  assert.match(js,/function updateShadowFocus/);
  assert.match(js,/new THREE\.DirectionalLight\(0x91c9ff,\.68\)/);
});

test('Driver License v10 adds a hood layer without exposing it in mirrors',()=>{
  assert.match(js,/function buildHood/);
  assert.match(js,/o\.layers\.set\(2\)/);
  assert.match(js,/camera\.layers\.enable\(2\)/);
});


test('Driver License v11 lets the driver complete PREP before seatbelt enforcement',()=>{
  assert.match(js,/if\(stage!=='PREP'&&!car\.seatbelt\)/);
  assert.doesNotMatch(js,/if\(!car\.seatbelt\)\{disqualify\('안전띠 미착용'\)/);
});

test('Driver License v11 preserves low-speed automatic creep',()=>{
  assert.match(js,/if\(Math\.abs\(car\.speed\)<\.002\)car\.speed=0/);
  assert.doesNotMatch(js,/if\(Math\.abs\(car\.speed\)<\.015\)car\.speed=0/);
  assert.match(js,/const creepTarget=1\.05/);
});


test('Driver License v12 uses a climbable ten-percent hill',()=>{
  assert.match(js,/return \(60-z\)\*\.1/);
  assert.match(js,/return \(z-40\)\*\.1/);
  assert.match(js,/return -\.1/);
  assert.match(js,/const ang=Math\.atan\(\.1\)/);
});

test('Driver License v12 automatic physics simulation reaches creep and climbs the hill',()=>{
  const dt=1/60;
  const approach=(v,target,amount)=>v<target?Math.min(target,v+amount):Math.max(target,v-amount);
  const gd=z=>z<=60&&z>=50?-.1:z<50&&z>=40?.1:0;
  const step=(state,throttle=0,brake=0)=>{
    let {speed,z}=state,drive=Math.pow(throttle,1.18)*2.15;
    if(throttle<.04&&brake<.04){
      const target=1.05;
      if(speed<target-.05)speed=approach(speed,target,.72*dt);
      else if(speed>target+.08)speed=approach(speed,target,.82*dt);
    }
    const gravity=-9.81*(gd(z)*-1);
    if(brake>.01)speed=approach(speed,0,(1.6+brake*5.6)*dt);
    else{
      speed+=(drive+gravity)*dt;
      if(throttle>=.04)speed=approach(speed,0,.08*dt);
    }
    speed=Math.max(-3.6,Math.min(9,speed));
    if(Math.abs(speed)<.002)speed=0;
    z-=speed*dt;
    return{speed,z};
  };
  let creep={speed:0,z:73};
  for(let i=0;i<180;i++)creep=step(creep,0,0);
  assert.ok(creep.speed*3.6>3,'automatic creep should exceed 3 km/h');

  let hill={speed:0,z:54};
  for(let i=0;i<120;i++)hill=step(hill,.7,0);
  assert.ok(hill.z<54,'70% throttle should move forward uphill');
  assert.ok(hill.speed>0,'hill start should remain forward');

  let braking={speed:20/3.6,z:75},distance=0;
  for(let i=0;i<60&&braking.speed>0;i++){
    const before=braking.z;braking=step(braking,0,1);distance+=Math.abs(braking.z-before);
  }
  assert.ok(braking.speed===0,'full brake should stop from 20 km/h within one second');
  assert.ok(distance<3,'20 km/h stopping distance should stay below 3m in the game model');
});


test('Driver License v13 keeps camera heading aligned with vehicle steering direction',()=>{
  assert.match(js,/camera\.rotation\.y=-car\.yaw\+headYaw/);
  assert.match(js,/const backYaw=-car\.yaw\+Math\.PI/);

  const dt=1/60,wheelbase=2.62,speed=10/3.6;
  let yaw=0,x=0,z=73;
  const wheelAngle=-30*Math.PI/180; // left steering
  for(let i=0;i<60;i++){
    yaw=Math.atan2(Math.sin(yaw+(speed/wheelbase)*Math.tan(wheelAngle)*dt),Math.cos(yaw+(speed/wheelbase)*Math.tan(wheelAngle)*dt));
    x+=Math.sin(yaw)*speed*dt;
    z-=Math.cos(yaw)*speed*dt;
  }
  const cameraYaw=-yaw;
  const cameraForwardX=-Math.sin(cameraYaw);
  assert.ok(x<0,'left steering must move the car toward world left');
  assert.ok(cameraForwardX<0,'driver camera must look toward the same leftward heading');
});

test('Driver License v13 steering returns quickly instead of feeling boat-like',()=>{
  assert.match(js,/const steerRate=Math\.abs\(rawSteer\)>\.025\?1650:2100/);
  assert.match(js,/Math\.pow\(Math\.abs\(rawSteer\),1\.18\)/);
  assert.match(js,/lerp\(500,265,clamp\(steerSpeedKmh\/38,0,1\)\)/);
});


test('driving test uses QA-gated shared community 3D scenery',()=>{
  assert.match(js,/shared-community-3d\.js/);
  assert.match(js,/shared-community-3d-runtime\.js/);
  assert.match(js,/prepareShared3DObject/);
  for(const id of ['nature.commonTreeA','prop.waterTower','prop.well','vehicle.schoolBus','building.house'])assert.match(js,new RegExp(id.replace(/\./g,'\\.')));
  assert.match(js,/sharedHouse/);
  assert.match(js,/sharedBus/);
  assert.match(html,/driver-license\.js\?v=17/);
});


test('Driver License v16 respects shared 3D performance policy',()=>{
  assert.match(js,/shared3DShouldLoad/);
  assert.match(js,/sharedCoarse/);
  assert.match(js,/shadows:key!==\'sharedGrass\'/);
  assert.match(html,/driver-license\.js\?v=17/);
});


test('Driver License v17 adds randomized stationary control tasks',()=>{
  assert.match(html,/id="headlight"/);
  assert.match(html,/id="wiper"/);
  assert.match(js,/const CONTROL_TASK_POOL=/);
  assert.match(js,/function verifyControlAction/);
  assert.match(js,/sectionResults=\{controls:'pending'/);
  assert.match(js,/운전장치 조작 오류/);
});

test('Driver License v17 requires the T-parking confirmation line',()=>{
  assert.match(js,/parkingSensorSeen/);
  assert.match(js,/확인선 감지/);
  assert.match(js,/parkingReverseSeen&&parkingSensorSeen&&kmh<\.7/);
  assert.match(js,/line\(5\.45,\.24,42,36\.6,0x46d9ff/);
});

test('Driver License v17 suppresses coaching text during exam mode',()=>{
  assert.match(js,/mode==='exam'&&gameState==='playing'/);
  assert.match(js,/기능시험에서는 공략 설명을 숨기고/);
});

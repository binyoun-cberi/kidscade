import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {cameraRelativeInput,farmerHeading,facingDirection,shouldTurnBeforeWalk,headingDifference,rotateToward,walkPlayer,nearestWalkablePoint,planNavigationRoute} from '../games/korean-farm/interactions/navigation.mjs';
import {VILLAGE_COLLIDERS} from '../games/korean-farm/rendering/village-layout.mjs';
import {fieldStatusIndicators} from '../games/korean-farm/farming/field-status.mjs';
import {FIELD_DEFS} from '../games/korean-farm/world.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const html=fs.readFileSync(path.join(ROOT,'games/korean-farm/index.html'),'utf8');
const game=fs.readFileSync(path.join(ROOT,'games/korean-farm/game.js'),'utf8');
const css=fs.readFileSync(path.join(ROOT,'games/korean-farm/style.css'),'utf8');
const near=(a,b,eps=1e-6)=>assert.ok(Math.abs(a-b)<eps,`${a} != ${b}`);

test('camera relative movement follows screen axes at four cardinal orbit angles',()=>{
  const up=new Set(['w']),right=new Set(['d']);
  const empty={x:0,y:0};
  const dirs=[
    {a:0,up:[0,-1],right:[1,0]},
    {a:Math.PI/2,up:[-1,0],right:[0,-1]},
    {a:Math.PI,up:[0,1],right:[-1,0]},
    {a:-Math.PI/2,up:[1,0],right:[0,1]}
  ];
  for(const {a,up:expectedUp,right:expectedRight} of dirs){
    const u=cameraRelativeInput(up,empty,a),r=cameraRelativeInput(right,empty,a);
    near(u.x,expectedUp[0]);near(u.z,expectedUp[1]);
    near(r.x,expectedRight[0]);near(r.z,expectedRight[1]);
  }
});
test('diagonal controls are normalized, no faster than cardinal steps',()=>{
  const straight=cameraRelativeInput(new Set(['w']),null,0);
  const diag=cameraRelativeInput(new Set(['w','d']),null,0);
  near(Math.hypot(straight.x,straight.z),1);
  near(Math.hypot(diag.x,diag.z),1);
  const step1=walkPlayer({x:0,z:0},straight,.5);
  const step2=walkPlayer({x:0,z:0},diag,.5);
  near(Math.hypot(step1.x,step1.z),Math.hypot(step2.x,step2.z));
});
test('joystick up/right matches keyboard without deadzone jitter',()=>{
  const stick=cameraRelativeInput(new Set(),{x:.5,y:-.5},.6);
  const keys=cameraRelativeInput(new Set(['w','d']),null,.6);
  near(stick.x/Math.hypot(stick.x,stick.z),keys.x);
  near(stick.z/Math.hypot(stick.x,stick.z),keys.z);
  assert.equal(cameraRelativeInput(new Set(),{x:.01,y:.02},0).active,false);
});
test('face models looking along local -Z must match world travel in 8 directions',()=>{
  // This is independent of the heading implementation: Three.js Y rotation of
  // local forward (0,0,-1) yields (-sin(yaw),0,-cos(yaw)).
  for(const [x,z] of [[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]]){
    const yaw=farmerHeading(x,z);
    const forward=facingDirection(yaw);
    const alignment=(forward.x*x+forward.z*z)/Math.hypot(x,z);
    assert.ok(alignment>.999999,'Farmer is moonwalking toward '+x+','+z+'; alignment='+alignment);
  }
  near(farmerHeading(0,-1),0);
  near(farmerHeading(1,0),-Math.PI/2);
  near(farmerHeading(-1,0),Math.PI/2);
  near(Math.cos(farmerHeading(0,1)),-1);
  assert.match(fs.readFileSync(path.join(ROOT,'games/korean-farm/animation/farmer-animator.js'),'utf8'),/\.065,-\.235/);
});
test('reversing direction rotates the farmer in place before walking',()=>{
  assert.equal(shouldTurnBeforeWalk(0,Math.PI),true);
  assert.equal(shouldTurnBeforeWalk(0,-Math.PI/2),true);
  assert.equal(shouldTurnBeforeWalk(0,.2),false);
  assert.equal(shouldTurnBeforeWalk(0,.3),true);
  let current=0,goal=farmerHeading(0,1),frames=0;
  while(shouldTurnBeforeWalk(current,goal)&&frames<90){
    current=rotateToward(current,goal,1/60);frames++;
  }
  assert.ok(frames>0&&frames<45,'Turn-in-place must resolve promptly, frames='+frames);
  assert.ok(Math.abs(headingDifference(current,goal))<=.25);
  assert.match(game,/shouldTurnBeforeWalk\(farmer.rotation.y,farmerFacingTarget\)\)return false/);
  assert.match(game,/const stepX=result.x-state.player.x,stepZ=result.z-state.player.z/);
  assert.match(game,/farmerFacingTarget=farmerHeading\(stepX,stepZ\)/);
  assert.ok(game.indexOf('const result=walkPlayer(state.player,direction')<game.indexOf('const stepX=result.x-state.player.x'));
});
test('turning rotates toward the shorter angle instead of snapping through 360 degrees',()=>{
  const current=3.09,target=-3.09;
  const next=rotateToward(current,target,.016);
  assert.ok(next>current&&next-current<.08,{current,target,next});
  const half=rotateToward(0,Math.PI/2,.016);
  assert.ok(half>0&&half<Math.PI/2);
  near(rotateToward(.2,.2,.02),.2);
});
test('long frames preserve walking distance instead of reducing travel speed',()=>{
  let regular={x:0,z:0},slow={x:0,z:0};
  for(let i=0;i<60;i++)regular=walkPlayer(regular,{x:1,z:0},1/60);
  for(let i=0;i<5;i++)slow=walkPlayer(slow,{x:1,z:0},.2);
  near(regular.x,4.7,.001);
  near(slow.x,regular.x,.001);
  const turned=rotateToward(0,Math.PI,.2);
  assert.ok(turned>0&&turned<=Math.PI);
  assert.ok(game.includes('Math.min(.20,(now-last)/1000)'), 'The rendering loop should preserve elapsed movement time');
});
test('colliding with walls never produces walking-in-place animation',()=>{
  const at={x:10.1,z:-13};
  const block=walkPlayer(at,{x:1,z:0},.016,{obstacles:VILLAGE_COLLIDERS});
  assert.equal(block.moving,false);
  assert.equal(block.blocked,true);
  near(block.x,at.x);near(block.z,at.z);
  const free=walkPlayer({x:0,z:9},{x:1,z:0},.016,{obstacles:VILLAGE_COLLIDERS});
  assert.ok(free.moving);
});
test('click-to-walk auto motion clamps the last frame without overshooting',()=>{
  const result=walkPlayer({x:0,z:0},{x:1,z:0},.075,{goalDistance:.11});
  near(result.x,.11);
  near(result.z,0);
  assert.ok(result.moving);
});
test('waypoint navigation reaches village services from every field and another service',()=>{
  const market={x:8.5,z:15.25},home={x:9.9,z:-10.05},compost={x:4.2,z:-10.35};
  const starts=[...FIELD_DEFS.map(p=>({x:p.x,z:p.z+p.d/2+1})),market,home,compost,{x:-5,z:3}];
  for(const from of starts)for(const destination of [market,home,compost]){
    const route=planNavigationRoute(from,destination,VILLAGE_COLLIDERS);
    assert.ok(route?.length, `No route from ${JSON.stringify(from)} to ${JSON.stringify(destination)}`);
    let position={...from},point=0;
    for(let frame=0;frame<3600&&point<route.length;frame++){
      const waypoint=route[point],distance=Math.hypot(waypoint.x-position.x,waypoint.z-position.z);
      if(distance<.34){point++;continue}
      position=walkPlayer(position,{x:(waypoint.x-position.x)/distance,z:(waypoint.z-position.z)/distance},
        1/30,{goalDistance:distance,bounds:21.7,obstacles:VILLAGE_COLLIDERS});
    }
    assert.equal(point,route.length,
      `Route blocked from ${JSON.stringify(from)} to ${JSON.stringify(destination)}: ${JSON.stringify({route,position})}`);
  }
});
test('trapped saved position is recovered and unreachable destinations fail safely',()=>{
  const homeCollider=VILLAGE_COLLIDERS.find(p=>Math.hypot(p.x-9.9,p.z+10.82)<5);
  assert.ok(homeCollider,'Home collider should exist');
  const position={x:homeCollider.x,z:homeCollider.z};
  const rescued=nearestWalkablePoint(position,VILLAGE_COLLIDERS);
  assert.ok(rescued&&Math.hypot(position.x-rescued.x,position.z-rescued.z)>.1);
  assert.ok(!VILLAGE_COLLIDERS.some(o=>Math.abs(rescued.x-o.x)<o.w/2+.45&&Math.abs(rescued.z-o.z)<o.d/2+.45));
  assert.equal(planNavigationRoute({x:-5,z:3},position,VILLAGE_COLLIDERS),null);
  assert.equal(planNavigationRoute(position,{x:0,z:9},VILLAGE_COLLIDERS),null);
  assert.match(game,/if\(navigationStall>1\.8\)/);
  assert.match(game,/nearestWalkablePoint\(state\.player,obstacles,bounds\)/);
});
test('rice planting supports touch anywhere on the chosen paddy and WebGL errors explain recovery',()=>{
  assert.match(game,/raycaster\.ray\.intersectPlane\(plantingPlane,point\)/);
  assert.match(game,/seedlingAtPoint\(plot,point\)/);
  assert.match(html,/id="loadingDetail"/);
  assert.match(html,/id="retryLoad"/);
  assert.match(game,/\$\('loading'\)\.classList\.add\('failed'\)/);
  assert.match(game,/브라우저의 하드웨어 가속/);
  assert.match(css,/#loading\.failed \.spinner\{display:none\}/);
});
test('farm HUD has four primary buttons, optional tools and proper mobile-safe sheet',()=>{
  const tools=html.match(/<nav id="bottomBar"[^>]*>([\s\S]*?)<\/nav>/)?.[1]||'';
  assert.equal([...tools.matchAll(/<button\b/g)].length,4);
  for(const id of ['nearFieldBtn','bagBtn','sleepBtn','moreBtn','moreTools','turnLeft','turnRight','saveBtn','qaBtn','focusFarm']){
    assert.match(html,new RegExp('id="'+id+'"'));
  }
  assert.match(html,/aria-expanded="false"/);
  assert.match(css,/#app:has\(\.inspector:not\(\.hidden\)\) #objective\{display:none\}/);
  assert.match(css,/max-height:min\(43dvh,360px\)/);
  assert.match(game,/viewAngle=rotateToward\(viewAngle,state\.camera\.angle/);
  assert.match(game,/farmer\.rotation\.y=rotateToward\(farmer\.rotation\.y,farmerFacingTarget/);
  assert.match(game,/!overlayShown\?move/);
  assert.match(game,/farmerFacingTarget=farmerHeading/);
  assert.doesNotMatch(game,/moving=true;\s*farmer\.rotation\.y=Math\.atan2/);
});
test('keyboard actions do not run while dialog is visible or text input has focus',()=>{
  assert.match(game,/target\?\.closest\?\.\('input,textarea,select,\[contenteditable="true"\]'\)/);
  assert.match(game,/if\(!\$\('modal'\)\.classList\.contains\('hidden'\)&&key!=='escape'\)return/);
  assert.match(game,/keys\.clear\(\);joystick\.x=0;joystick\.y=0;/);
});

test('field status rings prioritize urgent care and harvest without opening the inspector',()=>{
  const healthy={kind:'rice',planted:true,growth:.4,waterDepthCm:2.2,nitrogen:.34,weeds:.38,health:.55};
  assert.deepEqual(fieldStatusIndicators(healthy),[]);
  const mild=fieldStatusIndicators({...healthy,waterDepthCm:1.1});
  const urgent=fieldStatusIndicators({...healthy,waterDepthCm:0});
  assert.equal(mild[0].id,'dry');
  assert.ok(mild[0].urgency>0&&mild[0].urgency<1);
  assert.equal(urgent[0].urgency,1);
  const ripe=fieldStatusIndicators({...healthy,growth:1,waterDepthCm:2.2});
  assert.equal(ripe[0].id,'harvest');
  assert.equal(ripe[0].icon,'🌾');
});
test('rice sluices are interactive in-world objects with no gate action button',()=>{
  assert.doesNotMatch(html,/data-action="gate"/);
  assert.match(game,/raycaster\.intersectObjects\(gateHits,false\)/);
  assert.match(game,/function activateSluice\(id\)/);
  assert.match(game,/farmFlow\.request\(\{action:'gate',plot,position:state\.player,goal:sluice\.stand\}\)/);
  assert.match(game,/if\(nearest\)activateSluice\(nearest\)/);
  const village=fs.readFileSync(path.join(ROOT,'games/korean-farm/rendering/village-scene.js'),'utf8');
  assert.doesNotMatch(village,/timber-irrigation-gate/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {cameraRelativeInput,farmerHeading,facingDirection,shouldTurnBeforeWalk,headingDifference,rotateToward,walkPlayer} from '../games/korean-farm/interactions/navigation.mjs';
import {VILLAGE_COLLIDERS} from '../games/korean-farm/rendering/village-layout.mjs';
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
  let current=0,goal=farmerHeading(0,1),frames=0;
  while(shouldTurnBeforeWalk(current,goal)&&frames<90){
    current=rotateToward(current,goal,1/60);frames++;
  }
  assert.ok(frames>0&&frames<45,'Turn-in-place must resolve promptly, frames='+frames);
  assert.ok(Math.abs(headingDifference(current,goal))<=Math.PI*.43);
  assert.match(game,/shouldTurnBeforeWalk\(farmer.rotation.y,farmerFacingTarget\)\)return false/);
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

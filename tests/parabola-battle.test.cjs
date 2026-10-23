'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../games/low_parabola_battle/physics.js');
const flat = [[0,520],[1200,520]];

test('angle and power are clamped and launch is finite', () => {
  const shot = P.launch({x:100,y:430},999,200,1);
  assert.ok(Number.isFinite(shot.vx) && Number.isFinite(shot.vy));
  assert.ok(Math.abs(Math.hypot(shot.vx,shot.vy)-P.speedForPower(100))<1e-7);
});
test('45 degrees gives the greatest range over level ground at equal speed', () => {
  const p=75,s=P.speedForPower(p);
  const range=a=>s*s*Math.sin(2*a*Math.PI/180)/P.GRAVITY;
  assert.ok(range(45)>range(25));
  assert.ok(range(45)>range(65));
  assert.ok(Math.abs(range(30)-range(60))<1e-6);
});
test('wind shifts projectile horizontally but not vertically',()=>{
  const still=P.launch({x:120,y:420},45,70,1,0);
  const windy=P.launch({x:120,y:420},45,70,1,20);
  const a=P.at(still,1.25),b=P.at(windy,1.25);
  assert.ok(b.x>a.x);
  assert.equal(b.y,a.y);
});
test('gravity pulls a shot downward and it lands on the terrain',()=>{
  const shot=P.launch({x:120,y:460},55,60,1,0);
  const result=P.trace({shot,knots:flat});
  assert.equal(result.kind,'ground');
  assert.ok(Math.abs(result.point.y-520)<3.1);
  assert.ok(result.points.length>5);
});
test('trajectory can hit an elevated target before hitting terrain',()=>{
  const shot=P.launch({x:100,y:450},50,70,1);
  const place=P.at(shot,1.1);
  assert.ok(place.y<P.terrainY(flat,place.x)-25);
  const result=P.trace({shot,knots:flat,targets:[{...place,radius:10}]});
  assert.equal(result.kind,'target');
  assert.equal(result.targetIndex,0);
});
test('rising ground blocks a low shot',()=>{
  const knots=[[0,520],[250,520],[300,360],[500,360],[650,520],[1200,520]];
  const shot=P.launch({x:100,y:472},10,65,1);
  const result=P.trace({shot,knots,targets:[{x:900,y:490,radius:16}]});
  assert.equal(result.kind,'ground');
  assert.ok(result.point.x<650);
});
test('falling outside the stage ends the simulation safely',()=>{
  const shot=P.launch({x:1100,y:400},45,100,1);
  const result=P.trace({shot,knots:flat});
  assert.equal(result.kind,'out');
  assert.ok(result.points.length<2000);
});
test('AI returns a legal angle and power',()=>{
  const result=P.chooseAiShot({origin:{x:1040,y:460},direction:-1,wind:0,knots:flat,
    target:{x:150,y:490,radius:23},difficulty:'normal'});
  assert.ok(result.angle>=5&&result.angle<=85);
  assert.ok(result.power>=10&&result.power<=100);
});

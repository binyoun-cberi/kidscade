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

test('a crater deepens the center without raising or moving the original ground',()=>{
  const before=[[0,520],[200,520],[400,500],[800,520],[1200,520]];
  const copy=before.map(pair=>pair.slice());
  const crater=P.craterTerrain(before,400,60,28);
  assert.deepEqual(before,copy);
  assert.ok(P.terrainY(crater,400)>P.terrainY(before,400)+25);
  assert.equal(P.terrainY(crater,100),P.terrainY(before,100));
  assert.equal(P.terrainY(crater,800),P.terrainY(before,800));
  assert.ok(crater.every(([x,y],i)=>i===0||x>crater[i-1][0]));
});
test('repeated impacts deepen an existing crater but keep a legal ground surface',()=>{
  let knots=[[0,520],[1200,520]];
  for(let n=0;n<8;n++)knots=P.craterTerrain(knots,520,74,42);
  assert.ok(P.terrainY(knots,520)<=P.HEIGHT-14);
  const result=P.trace({shot:P.launch({x:220,y:440},45,75),knots});
  assert.ok(['ground','out','target'].includes(result.kind));
});
test('blast damage respects radius and supports a nearby splash',()=>{
  const opponent={x:700,y:489,radius:23};
  assert.equal(P.blastHits({x:744,y:520},opponent,59),true);
  assert.equal(P.blastHits({x:800,y:520},opponent,59),false);
  assert.equal(P.blastHits(null,opponent,59),false);
});
test('every practice stage remains reachable in normal and windy conditions',()=>{
  const fs=require('node:fs'), path=require('node:path');
  const game=fs.readFileSync(path.join(__dirname,'../games/low_parabola_battle/game.js'),'utf8');
  const st=game.match(/const STAGES = (\[[\s\S]*?\]);/);
  assert.ok(st,'stage definition not found');
  const stages=Function('return '+st[1])();
  assert.equal(stages.length,6);
  const winds=[-24,22,30,-18,14,0];
  for(let i=0;i<stages.length;i++){
    const stage=stages[i];
    for(const wind of [0,winds[i]]){
      let reached=false;
      const goal={x:stage.goal,y:P.terrainY(stage.knots,stage.goal)-26,radius:29};
      for(let angle=5;angle<=85&&!reached;angle+=2){
        for(let power=20;power<=100;power+=2){
          const radians=angle*Math.PI/180;
          const origin={x:135+Math.cos(radians)*38,
            y:P.terrainY(stage.knots,135)-31-Math.sin(radians)*38};
          if(P.trace({shot:P.launch(origin,angle,power,1,wind),
            knots:stage.knots,targets:[goal]}).kind==='target'){reached=true;break;}
        }
      }
      assert.ok(reached,'unreachable stage '+(i+1)+' with wind '+wind);
    }
  }
});

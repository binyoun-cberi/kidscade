'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const W=require('../games/high_ota_typographic_horror/rewrite.js');
const C3=require('../games/high_ota_typographic_horror/chapter3.js');
const S=require('../games/high_ota_typographic_horror/surfaces.js');
const ROOT=path.join(__dirname,'../games/high_ota_typographic_horror');

test('writing 문 into a wall creates actual corridor and a closed door blocks crossing',()=>{
  const state=W.create();
  const original=(x,z)=>C3.canMove({stage:'explore'},x,z);
  assert.equal(original(-3.35,-52),false);
  assert.equal(W.canMove(state,-3.35,-52,original),false);
  assert.deepEqual(W.write(state,'wall','문',{x:-1.5,z:-52}),
    {ok:true,kind:'문',action:'formed'});
  assert.equal(state.doorMade,true);
  assert.equal(state.doorOpen,true);
  assert.equal(W.canMove(state,-3.35,-52,original),true,'correct word must remove the wall collision');
  assert.equal(W.toggleDoor(state,{x:-1.5,z:-52}).open,false);
  assert.equal(W.canMove(state,-3.35,-52,original),false,'closed 문 is a tangible obstacle');
  assert.equal(W.toggleDoor(state,{x:-1.5,z:-52}).open,true);
  assert.equal(W.canMove(state,-3.35,-52,original),true);
  assert.deepEqual(W.write(state,'wall','벽',{x:-1.5,z:-52}),
    {ok:true,kind:'벽',action:'restored'});
  assert.equal(W.canMove(state,-3.35,-52,original),false);
});
test('not every wall becomes magically permeable',()=>{
  const state=W.create();W.write(state,'wall','문',{x:-1.5,z:-52});
  const rule=(x,z)=>C3.canMove({stage:'explore'},x,z);
  assert.equal(W.canMove(state,-3.38,-52,rule),true);
  assert.equal(W.canMove(state,-3.38,-47.5,rule),rule(-3.38,-47.5));
  assert.equal(W.canMove(state,-11,-42,rule),rule(-11,-42));
  assert.equal(W.canMove(state,-3.38,-54.2,rule),rule(-3.38,-54.2));
  assert.equal(W.canMove(state,99,-52,rule),false);
});
test('naming is literal and collision cannot close on the player',()=>{
  const s=W.create();
  assert.equal(W.write(s,'wall','창문').ok,false);
  assert.equal(W.write(s,'ceiling','문').ok,false);
  assert.equal(W.normalize(' 조 명 '),'조명');
  W.write(s,'wall',' 문 ');
  assert.equal(W.toggleDoor(s,{x:-3.35,z:-52}).reason,'occupied');
  assert.equal(W.write(s,'wall','벽',{x:-3.35,z:-52}).reason,'occupied');
  assert.equal(s.doorOpen,true,'occupied slot must stay traversable');
});
test('ceiling light is a physical state, not a fake UI lamp',()=>{
  const s=W.create();
  assert.equal(s.lightOn,false);
  assert.equal(W.write(s,'ceiling','조명').ok,true);
  assert.equal(s.lightOn,true);
  assert.equal(W.write(s,'ceiling','천장').ok,true);
  assert.equal(s.lightOn,false);
});
test('look direction selects specific wall or ceiling without stealing core-puzzle input',()=>{
  const s=W.create();
  const wall={x:-1.5,z:-52,yaw:Math.PI/2,pitch:0};
  const ceiling={x:0,z:-43.7,yaw:0,pitch:.4};
  assert.equal(W.target(s,wall).id,'wall');
  assert.equal(W.target(s,{...wall,yaw:0}),null);
  assert.equal(W.target(s,ceiling).id,'ceiling');
  assert.equal(W.target(s,{...ceiling,pitch:0}),null);
  assert.equal(W.target(s,{x:0,z:-53,yaw:0,pitch:.6}),null);
});
test('checkpoint restores door, light and closed/open state',()=>{
  const first=W.create();W.write(first,'wall','문');W.write(first,'ceiling','조명');
  W.toggleDoor(first,{x:-1.5,z:-52});
  const saved=W.checkpoint(first),restored=W.create();
  assert.equal(W.restore(restored,saved),true);
  assert.deepEqual(restored,first);
  assert.equal(W.restore(restored,{v:9}),false);
  assert.equal(restored.lightOn,false);
});
test('visual game actually uses authored geometry, light, input and checkpoints',()=>{
  const game=fs.readFileSync(path.join(ROOT,'game.js'),'utf8');
  const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
  assert.ok(html.indexOf('src="rewrite.js"')<html.indexOf('src="game.js"'));
  assert.match(game,/rewriteWallPlug=box/);
  assert.match(game,/rewriteWallPlug\.visible=!rewrite\.doorMade/);
  assert.match(game,/rewriteDoorBlock\.visible=rewrite\.doorMade&&!rewrite\.doorOpen/);
  assert.match(game,/RW\.canMove\(rewrite,x,z,\(a,b\)=>C3\.canMove\(state,a,b\)\)/);
  assert.match(game,/new THREE\.PointLight\(0xffcd63,0,8\.0,2\)/);
  assert.match(game,/rewriteGlow\.visible=rewrite\.lightOn/);
  assert.match(game,/data\.rewrite=RW\.checkpoint\(rewrite\)/);
  assert.match(game,/RW\.restore\(rewrite,data\.rewrite\)/);
  assert.match(game,/openRewrite\(target\.id\)/);
  assert.match(html,/id="rewriteInput"/);
  assert.match(html,/id="rewriteToggle"/);
  assert.ok(S.surfaces.some(p=>p.id==='rewrite-wall-panel'));
});

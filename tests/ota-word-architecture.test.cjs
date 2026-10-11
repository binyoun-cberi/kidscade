'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const S=require('../games/high_ota_typographic_horror/surfaces.js');
const C=require('../games/high_ota_typographic_horror/chapter3.js');
const R=require('../games/high_ota_typographic_horror/rules.js');
const root=path.join(__dirname,'../games/high_ota_typographic_horror');

test('real scene areas receive distinct floor, wall and ceiling words',()=>{
  const kinds=S.surfaces.reduce((x,s)=>(x[s.kind]=(x[s.kind]||0)+1,x),{});
  assert.deepEqual(kinds,{floor:4,ceiling:4,wall:18});
  assert.equal(S.portals.length,12);
  assert.ok(S.mistakes.length>=5);
  const ids=[...S.surfaces,...S.portals].map(s=>s.id);
  assert.equal(ids.length,new Set(ids).size,'every geometry section has a stable identity');
  for(const s of [...S.surfaces,...S.portals]){
    for(const key of ['x','y','z','w','h','rx','ry'])assert.ok(Number.isFinite(s[key]),s.id+':'+key);
    assert.ok(s.w>0&&s.h>0);
  }
});
test('word corridor boundaries match collision and do not make side entrances impassable',()=>{
  const state=R.initialState();state.stage='explore';
  const walk=(x,z)=>R.canMove(state,x,z)&&C.canMove(state,x,z);
  assert.equal(walk(0,-15),true);
  assert.equal(walk(-3.5,-15),false,'wall faces are solid');
  assert.equal(walk(3.5,-15),false);
  assert.equal(C.canMove(state,3.4,-46.5),true,'right archive entrance is open');
  assert.equal(C.canMove(state,-3.4,-46.5),true,'left office entrance is open');
  assert.equal(C.canMove(state,3.4,-51),false,'word-wall is real collision');
  assert.equal(C.canMove(state,-3.4,-51),false);
  assert.ok(S.portals.some(p=>p.id==='office-portal-lintel'&&p.x<0));
  assert.ok(S.portals.some(p=>p.id==='archive-portal-lintel'&&p.x>0));
});
test('puzzle doors never reveal the answer before physical repair',()=>{
  const repaired=S.portals.filter(p=>p.when==='doorFixed');
  const final=S.portals.filter(p=>p.when==='finalFixed');
  assert.equal(repaired.length,3);
  assert.equal(final.length,3);
  assert.equal(S.portals.filter(p=>!p.when).length,6);
  assert.ok(!S.portals.some(p=>Math.abs(p.z+25.85)<.4),'distortion puzzle does not turn into a fake door');
});
test('floor and ceiling remain visible inside while nearby walls fade before filling view',()=>{
  const floor=S.surfaces.find(p=>p.id==='entry-hall-floor');
  const roof=S.surfaces.find(p=>p.id==='entry-hall-ceiling');
  const wall=S.surfaces.find(p=>p.id==='first-left');
  assert.equal(S.visibility(floor,{x:0,z:-14}),1);
  assert.equal(S.visibility(roof,{x:0,z:-14}),1);
  assert.ok(S.visibility(wall,{x:-3.0,z:-15})<.1,'near black wall must not dominate camera');
  assert.ok(S.visibility(wall,{x:0,z:-15})>.9);
  assert.ok(S.visibility(wall,{x:0,z:60})<.05);
});
test('environment architecture uses repeated words rather than hundreds of plane labels',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const game=fs.readFileSync(path.join(root,'game.js'),'utf8');
  assert.ok(html.indexOf('src="surfaces.js"')<html.indexOf('src="game.js"'));
  assert.match(game,/surfaceAtlas\(kind\)/);
  assert.match(game,/THREE\.RepeatWrapping/);
  assert.match(game,/makeArchitecturePlane\(spec\)/);
  assert.match(game,/updateWordArchitecture\(elapsed,threat\)/);
  assert.match(game,/const focusFactor=focus/);
  assert.match(game,/const strength=spec\.kind==='door'/);
  assert.match(game,/surfaceKind=spec\.kind/);
  assert.doesNotMatch(game,/function stamp\(/);
});

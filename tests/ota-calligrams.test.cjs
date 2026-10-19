'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'../games/high_ota_typographic_horror');
const CG=require('../games/high_ota_typographic_horror/calligrams.js');
const R=require('../games/high_ota_typographic_horror/rules.js');
const C=require('../games/high_ota_typographic_horror/chapter3.js');
const S=require('../games/high_ota_typographic_horror/surfaces.js');

test('three distinct recognizable object shapes are constructed from Korean words',()=>{
  const models=CG.collection(),ids=models.map(o=>o.id);
  assert.equal(models.length,9);
  assert.equal(new Set(ids).size,9);
  assert.equal(models.filter(o=>o.type==='door').length,5);
  assert.equal(models.filter(o=>o.type==='locker').length,3);
  assert.equal(models.filter(o=>o.type==='computer').length,1);
  for(const model of models){
    assert.ok(model.parts.length>=14,model.id);
    assert.ok(model.parts.every(p=>typeof p.word==='string'&&p.word.length>0),model.id);
    for(const p of model.parts){
      for(const k of ['x','y','z','w','h','rx'])assert.ok(Number.isFinite(p[k]),model.id+':'+k);
      assert.ok(p.w>0&&p.h>0,model.id);
    }
  }
  const door=models.find(o=>o.id==='gate-door');
  assert.ok(door.parts.some(p=>p.word==='손잡이'));
  assert.ok(door.parts.some(p=>p.word==='경첩'));
  assert.ok(door.parts.some(p=>p.word.includes('문턱')));
  const locker=models.find(o=>o.id==='locker-chase');
  assert.ok(locker.parts.some(p=>p.word==='틈'));
  assert.ok(locker.parts.some(p=>p.word==='숨기'));
  const computer=models.find(o=>o.id==='management-computer');
  for(const word of ['화면화면화면','키보드키보드','받침대','본체','전원'])
    assert.ok(computer.parts.some(p=>p.word===word),word);
});
test('calligram doorway matches physical passage and protects gated rooms',()=>{
  const models=CG.collection();
  const office=models.find(o=>o.id==='office-door');
  const archive=models.find(o=>o.id==='archive-door');
  assert.equal(office.x,-3.235);
  assert.equal(archive.x,3.235);
  assert.equal(office.z,-46.7);assert.equal(archive.z,-46.7);
  for(const doorway of [office,archive]){
    const top=doorway.parts.find(p=>p.y===2.66);
    assert.ok(top.w>=4.6&&top.w<=4.9,'word-frame spans the actual ~4.8m doorway');
    assert.ok(doorway.parts.every(p=>!p.role.startsWith('leaf')),'walkable side door has no blocking leaf');
  }
  assert.equal(models.find(o=>o.id==='gate-door').gate,'doorFixed');
  assert.equal(models.find(o=>o.id==='final-door').gate,'finalFixed');
  assert.ok(S.portals.some(p=>p.when==='doorFixed'));
  const initial=R.initialState();
  assert.equal(R.canMove(initial,0,-30.15),false);
  assert.equal(C.canMove({stage:'explore'},3.4,-46.7),true);
});
test('word lockers belong to the actual two hiding positions and office shelter',()=>{
  const models=CG.collection().filter(o=>o.type==='locker');
  for(const loc of R.LOCKERS)assert.ok(models.some(o=>o.z===loc.z&&Math.abs(o.x-loc.x)<.5));
  assert.ok(models.some(o=>o.id==='locker-office'&&o.chapter));
  assert.ok(models.every(o=>o.parts.filter(p=>p.role==='leafL'||p.role==='leafR').length>=10));
});
test('game hooks scene, hides old labels, animates physics-gated objects',()=>{
  const js=fs.readFileSync(path.join(root,'game.js'),'utf8');
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  assert.ok(html.indexOf('src="calligrams.js"')<html.indexOf('src="game.js"'));
  assert.match(js,/const CG = window\.OtaCalligrams/);
  assert.match(js,/buildWordArchitecture\(\);buildCalligrams\(\)/);
  assert.match(js,/updateCalligrams\(dt,threat\)/);
  assert.match(js,/flashLockerAt\(player\)/);
  assert.match(js,/obj\.gate==='rewriteDoor'\?rewrite\.doorMade:C3\.ensure\(state\)\.finalFixed/);
  assert.match(js,/if\(mode!==obj\.screenText\)/);
  assert.match(js,/const target=elapsed<obj\.swingUntil\?\.88:0/);
  assert.match(js,/if\(spec\.kind!=='door'\)makeArchitecturePlane\(spec\)/);
  assert.doesNotMatch(js,/label\('컴퓨터','#e3d2a0'/);
});

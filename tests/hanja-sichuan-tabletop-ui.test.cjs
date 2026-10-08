'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const read=path=>fs.readFileSync(require('node:path').join(ROOT,path),'utf8');
const html=read('games/hanja_sichuan/index.html');
const rules=require('../games/hanja_sichuan/rules.js');

test('desktop play scene uses a felt mahjong table instead of a dashboard',()=>{
  assert.match(html,/class="play-layout"/);
  assert.match(html,/class="setup-panel"/);
  assert.match(html,/class="play-main"/);
  assert.match(html,/class="mini-guide"/);
  assert.match(html,/repeating-linear-gradient/);
  assert.match(html,/\.game\{[^}]*border:9px solid #986744/);
  assert.match(html,/radial-gradient\(ellipse at 50% 20%,#377f69/);
  assert.match(html,/\.hud\{[^}]*border-bottom:1px solid/);
  assert.match(html,/\.stat\{[^}]*background:none/);
  assert.match(html,/\.tile\.reading\{[^}]*#cfe7d9/);
  assert.doesNotMatch(html, /--bg:#101b2d/);
});
test('desktop beginner tiles are scaled for readability while master still fits',()=>{
  assert.equal(rules.tileSize({viewportWidth:1600,boardWidth:900,cols:4}),114);
  assert.equal(rules.tileSize({viewportWidth:1600,boardWidth:900,cols:6}),100);
  assert.equal(rules.tileSize({viewportWidth:1600,boardWidth:900,cols:8}),84);
  assert.equal(rules.tileSize({viewportWidth:1600,boardWidth:900,cols:10}),72);
  assert.equal(rules.tileSize({viewportWidth:1754,viewportHeight:832,boardWidth:900,cols:4}),88);
  assert.equal(rules.tileSize({viewportWidth:1754,viewportHeight:1080,boardWidth:900,cols:4}),114);
  for(const cols of [4,6,8,10]){
    const tile=rules.tileSize({viewportWidth:1120,boardWidth:760,cols});
    assert.ok(tile*(cols+1.08)<=760,'does not fit desktop board '+cols);
  }
});
test('mobile controls and path geometry remain intact',()=>{
  assert.match(html,/@media\(max-width:980px\)/);
  assert.match(html,/@media\(max-width:540px\)/);
  assert.match(html,/id="viewToggle"/);
  assert.match(html,/id="panLeft"/);
  assert.match(html,/id="panRight"/);
  assert.match(html,/id="boardScroll"/);
  assert.match(html,/const boardRoom=vw>980/);
  assert.match(html,/const cell=currentCell\(\)/);
  assert.match(html,/st\.zoomed=!st\.zoomed/);
  assert.match(html,/id="selectedInfo"/);
  assert.match(html,/id="finishDialog"/);
  for(const width of [320,375,430]){
    for(const cols of [4,6,8,10]){
      const viewportWidth=width,boardWidth=width-26;
      const tile=rules.tileSize({viewportWidth,boardWidth,cols});
      assert.ok(tile*(cols+1.08)<=boardWidth,'mobile board overflow at '+width+'px, '+cols+' columns');
    }
  }
});
test('UI keeps Hanja game bindings and its script still parses',()=>{
  assert.match(html,/KIDSCADE_HANJA_GRADE_DATA/);
  assert.match(html,/HanjaSichuanEngine/);
  assert.match(html,/Rules\.score/);
  assert.match(html,/Rules\.rewards/);
  assert.match(html,/SDK\.result/);
  const script=[...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
  for(const code of script)assert.doesNotThrow(()=>new Function(code));
});

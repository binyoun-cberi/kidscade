const fs=require('node:fs');
const path=require('node:path');
const test=require('node:test');
const assert=require('node:assert/strict');

const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const js=read('games/cube3d/cube-architect.js');
const html=read('games/cube3d/index.html');
const css=read('games/cube3d/cube-architect.css');

test('mobile survival radial action menu is wired and parseable',()=>{
  assert.doesNotThrow(()=>new Function(js));
  assert.match(html,/id="mobileActionRadial"/);
  assert.match(html,/data-radial-action="observe"/);
  assert.match(html,/data-radial-action="use"/);
  assert.match(html,/data-radial-action="harvest"/);
  assert.match(html,/data-radial-action="place"/);
  assert.match(css,/Mobile survival radial action menu/);
  assert.match(js,/function initMobileActionRadial/);
  assert.match(js,/function executeMobileRadialAction/);
});

test('radial gesture maps four directions and supports tap default action',()=>{
  assert.match(js,/dx>0\?'use':'place'/);
  assert.match(js,/dy>0\?'harvest':'observe'/);
  assert.match(js,/setTimeout\(openMobileActionRadial,310\)/);
  assert.match(js,/else mobileDefaultAction\(\)/);
  assert.match(js,/navigator\.vibrate/);
});

test('survival uses one action hub instead of duplicate harvest and place buttons',()=>{
  assert.match(js,/survivalActionHub=target==='free'&&gameFreeMode==='survival'/);
  assert.match(js,/mobileBreak.*survivalActionHub/);
  assert.match(js,/mobilePlace.*survivalActionHub/);
  assert.match(css,/mobile-action-hub/);
});

test('camp starts with simple taps while the radial menu remains available',()=>{
  const camp=read('games/cube3d/cube-architect-camp.js');
  assert.doesNotMatch(camp,/mobile-radial-open|mobile-radial-harvest/);
  assert.match(js,/행동 버튼을 한 번 눌러 보자/);
  assert.match(js,/function executeMobileRadialAction/);
});

test('radial one-shot mining stops after one block',()=>{
  assert.match(js,/const oneShot=miningSource==='radial'/);
  assert.match(js,/if\(oneShot\)stopMining\(\)/);
});


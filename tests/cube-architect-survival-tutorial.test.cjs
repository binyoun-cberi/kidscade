'use strict';
const fs=require('node:fs'),path=require('node:path'),test=require('node:test'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const js=read('games/cube3d/cube-architect.js'),css=read('games/cube3d/cube-architect.css');
test('survival lessons use the camp while creative retains camera practice',()=>{
 assert.doesNotThrow(()=>new Function(js));
 assert.match(js,/if\(kind==='free'&&gameFreeMode==='survival'\)\{showSurvivalCamp\(force\);return\}/);
 assert.match(js,/function showSurvivalCamp/);
 assert.match(js,/campLesson:\{\.\.\.survivalCamp\}/);
 assert.match(js,/wait:'free-view-toggle'/);
});
test('camp instructions sit inside the inventory and mobile controls remain reachable',()=>{
 const html=read('games/cube3d/index.html');
 assert.match(html,/id="campInventoryHint"/);assert.match(html,/id="campInventoryHelp"/);
 assert.match(js,/syncCampInventory\(step\)/);assert.match(css,/camp-inventory\{visibility:hidden\}/);
 assert.match(css,/#tutorial\.camp\.coach/);assert.match(css,/max-height:540px/);
});
test('camp can recover materials and a lost workbench without skipping the lesson',()=>{
 assert.match(js,/function campHelp/);
 assert.match(js,/campNearest\(\['workbench'\]\)/);
 assert.match(js,/campNearest\(\['log','pineLog'\]\)/);
 assert.match(js,/if\(e\.code==='KeyH'&&campActive\(\)\)/);
 assert.match(js,/if\(savedStage<6\)/);
 assert.match(js,/campActive\(\)\?0:survivalTimeAcc/);
});

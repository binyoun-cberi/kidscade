const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(ROOT,'index_base.html'),'utf8');
const source=fs.readFileSync(path.join(ROOT,'app/features/pet/canvas-renderers.js'),'utf8');
const renderers=require('../app/features/pet/canvas-renderers.js');
const expected=["roundedRect","ellipseGradient","drawEye","drawSoftShadow","drawCareBadge","drawSeaPlant","drawOrnament","drawRockCave","drawRock","drawShrimp","drawSnail","drawWheel","drawHouse","drawPerch","drawHangingToy","drawBranch","drawLeafCluster","drawWindow","drawCatTree","drawDogBed","drawFish","drawFoodPellets","drawSeed","drawCookie","drawCarrot","drawFruitSnack","drawSunSpot","drawLeafSnack","drawBall","drawHearts","drawZzz","drawBridge","drawTunnel","drawStick","drawLamp","drawVine","drawSwing","drawLadder","drawMirror","drawCatTowerExtra","drawWaterFountain","drawLeash","drawCone","drawPlatform","drawHayRack","drawBlock","drawMat","drawShade","drawRope","drawThermo"];

test('pet canvas renderer module owns isolated drawing primitives outside index_base',()=>{
  assert.ok(html.includes('<script src="app/features/pet/canvas-renderers.js"></script>'));
  assert.ok(html.indexOf('app/features/pet/canvas-renderers.js')<html.indexOf('// 오디오 시스템'));
  for(const name of expected){
    assert.equal(typeof renderers[name],'function',name+' is exported');
    assert.doesNotMatch(html,new RegExp('function\\s+'+name+'\\s*\\('),name+' should not stay inline');
  }
  assert.match(html,/KidscadePetCanvasRenderers \|\| \{\}/);
});

test('extracted pet canvas renderers stay state-free and parse cleanly',()=>{
  assert.doesNotThrow(()=>new Function(source));
  assert.doesNotMatch(source,/\\b(?:pet3d|getAutoAction|particles|PETS|FISH_DB|document|localStorage|sessionStorage|fetch|coins|changeSeeds|showToast|save3d|updatePetUI|performance)\\b/);
});

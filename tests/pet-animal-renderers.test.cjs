const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(ROOT,'index_base.html'),'utf8');
const source=fs.readFileSync(path.join(ROOT,'app/features/pet/animal-renderers.js'),'utf8');
const animals=require('../app/features/pet/animal-renderers.js');
const expected=["drawHamster","drawIguana","drawParrot","drawCat","drawDog","drawGoat","drawPig","drawSugarGlider","drawRabbit","drawTurtle"];
const removed=["drawHamster","drawIguana","drawParrot","drawCat","drawDog","drawGoat","drawPig","drawSugarGlider","drawRabbit","drawTurtle","drawFeline","drawHoofed"];

test('animal renderers move drawing bodies out of index_base while preserving state wrappers',()=>{
  assert.ok(html.includes('<script src="app/features/pet/animal-renderers.js"></script>'));
  assert.ok(html.indexOf('canvas-renderers.js')<html.indexOf('animal-renderers.js'));
  assert.ok(html.indexOf('animal-renderers.js')<html.indexOf('// 오디오 시스템'));
  for(const name of expected){
    assert.equal(typeof animals[name],'function',name+' is exported');
    assert.match(html,new RegExp('function\\s+'+name+'\\s*\\([^)]*\\)\\{\\s*return animalRenderers\\.'+name));
  }
  for(const name of ["drawFeline","drawHoofed"]){
    assert.doesNotMatch(html,new RegExp('function\\s+'+name+'\\s*\\('),name+' should be module-internal');
  }
});

test('animal renderer module is visual-only and receives action explicitly',()=>{
  assert.doesNotThrow(()=>new Function(source));
  assert.doesNotMatch(source,/\\b(?:pet3d|getAutoAction|performance|document|localStorage|sessionStorage|fetch|coins|changeSeeds|showToast|save3d|updatePetUI)\\b/);
  for(const name of expected){
    assert.match(source,new RegExp('function\\s+'+name+'\\s*\\([^)]*action\\)'));
  }
});

test('main lobby inline controller remains syntactically complete after extraction',()=>{
  const inlineScripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
    .map(match=>match[1])
    .filter(code=>code.trim());
  const controller=inlineScripts.find(code=>code.includes('// 오디오 시스템'));
  assert.ok(controller,'main inline controller should still exist');
  assert.doesNotThrow(()=>new Function(controller));
});

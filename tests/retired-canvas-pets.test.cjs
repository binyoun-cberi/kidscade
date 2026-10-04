const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const ROOT=path.resolve(__dirname,'..');
const indexBase=fs.readFileSync(path.join(ROOT,'index_base.html'),'utf8');
const worldV3=fs.readFileSync(path.join(ROOT,'world-v3','kidscade-world-v3.js'),'utf8');

test('retired canvas pet runtime stays removed from the lobby',()=>{
  assert.equal(fs.existsSync(path.join(ROOT,'app','features','pet','canvas-renderers.js')),false);
  assert.equal(fs.existsSync(path.join(ROOT,'app','features','pet','animal-renderers.js')),false);
  assert.doesNotMatch(indexBase,/setupSookCanvasPets/);
  assert.doesNotMatch(indexBase,/KidscadePetCanvasRenderers|KidscadePetAnimalRenderers/);
  assert.doesNotMatch(indexBase,/\bpet3d\b/);
  assert.doesNotMatch(indexBase,/app\/features\/pet\/(?:canvas|animal)-renderers\.js/);
});

test('Seed World route and legacy Cube Pets migration stay intact',()=>{
  assert.match(indexBase,/if \(tabName === 'room'\) \{\s*window\.openKidscadeLifeWorld\?\.\(\);\s*return;/s);
  assert.match(indexBase,/localStorage\.getItem\('kidscade_sook_canvas_pet'\)/);
  assert.match(worldV3,/localStorage\.getItem\('kidscade_sook_canvas_pet'\)/);
  assert.match(worldV3,/raw\?\.unlockedPets/);
});

test('main lobby inline controller still parses after retirement',()=>{
  const inlineScripts=[...indexBase.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
    .map(match=>match[1])
    .filter(code=>code.trim());
  const controller=inlineScripts.find(code=>code.includes('// 오디오 시스템'));
  assert.ok(controller,'main inline controller should still exist');
  assert.doesNotThrow(()=>new Function(controller));
});

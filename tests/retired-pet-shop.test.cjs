const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const ROOT=path.resolve(__dirname,'..');
const indexBase=fs.readFileSync(path.join(ROOT,'index_base.html'),'utf8');
const shopUi=fs.readFileSync(path.join(ROOT,'shop-ui.js'),'utf8');
const clarity=fs.readFileSync(path.join(ROOT,'ui-clarity-overhaul.js'),'utf8');
const storage=fs.readFileSync(path.join(ROOT,'kidscade-storage.js'),'utf8');
const accountClient=fs.readFileSync(path.join(ROOT,'account-client.js'),'utf8');
const worldV3=fs.readFileSync(path.join(ROOT,'world-v3','kidscade-world-v3.js'),'utf8');

test('retired Canvas pet shop is absent from the live lobby and shared shop UI',()=>{
  assert.doesNotMatch(indexBase,/data-tab="pet"/);
  assert.doesNotMatch(indexBase,/pet_unlock_parrot|pet_turtle_ramp/);
  assert.doesNotMatch(indexBase,/kidscade_pet_items/);
  assert.doesNotMatch(indexBase,/sookPet(?:IsUnlocked|Select|Buy)/);
  assert.doesNotMatch(indexBase,/function\s+(?:getPetShopItem|getPetItemCount|changePetItemCount|animatePetRoomAvatar|finishPetCare|usePetCareItem|showEvolutionHint)\s*\(/);
  assert.doesNotMatch(shopUi,/activeTab === 'pet'|btn-open-pet-shop-compact|isPetUnlocked|selectPet|buyPetThing/);
  assert.doesNotMatch(clarity,/\.shop-tab\[data-tab="pet"\]|#btn-open-pet-shop-compact/);
});

test('live pet growth and World v3 migration remain intact',()=>{
  assert.match(indexBase,/safeParseStorage\('kidscade_pet', \{\}\)/);
  assert.match(indexBase,/function\s+checkPetEvolution\s*\(/);
  assert.match(indexBase,/function\s+switchSookTab\s*\(/);
  assert.match(indexBase,/localStorage\.getItem\('kidscade_sook_canvas_pet'\)/);
  assert.match(worldV3,/localStorage\.getItem\('kidscade_sook_canvas_pet'\)/);
});

test('legacy petItems key stays available only for compatibility cleanup outside lobby runtime',()=>{
  assert.match(storage,/petItems:\s*'kidscade_pet_items'/);
  assert.match(accountClient,/'petItems'/);
  assert.doesNotMatch(indexBase,/kidscade_pet_items/);
});

test('main lobby inline controller still parses after pet shop retirement',()=>{
  const inlineScripts=[...indexBase.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
    .map(match=>match[1])
    .filter(code=>code.trim());
  const controller=inlineScripts.find(code=>code.includes('// 오디오 시스템'));
  assert.ok(controller,'main inline controller should still exist');
  assert.doesNotThrow(()=>new Function(controller));
});

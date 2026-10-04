const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'avatar-studio.html'),'utf8');
const js=fs.readFileSync(path.join(root,'avatar-pixel-studio.js'),'utf8');
const integration=fs.readFileSync(path.join(root,'avatar-integration.js'),'utf8');
const css=fs.readFileSync(path.join(root,'avatar-pixel-studio.css'),'utf8');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'assets/game/characters/kidscade-avatar-v3/school-starter/manifest.json'),'utf8'));

test('public v3 avatar controller parses cleanly',()=>{
  assert.doesNotThrow(()=>new Function(js));
  assert.match(html,/avatar-pixel-studio\.js\?v=40/);
  assert.doesNotMatch(html,/pixel-avatar-renderer\.js/);
});

test('public studio uses school starter v3 assets instead of legacy v2 parts',()=>{
  assert.match(js,/kidscade-avatar-v3\/school-starter/);
  assert.match(js,/school-starter-sheet\.png/);
  assert.match(js,/kidscade-avatar-v3/);
  assert.match(js,/pixel-v3-school-starter-1/);
  assert.doesNotMatch(js,/male-short-01|blue-star-zip-hoodie|denim-cuffed-jeans/);
  assert.doesNotMatch(html,/v2 RIG|파란 후드|데님 팬츠/);
});

test('school starter exposes all eight completed motion groups',()=>{
  const expected={stand:2,walk:4,jump:1,attack:5,hurt:2,dead:4,sit:2,pickup:3};
  for(const [kind,count] of Object.entries(expected)){
    assert.equal(manifest.animations[kind].length,count,kind);
    assert.match(html,new RegExp('data-motion="'+kind+'"'));
  }
  assert.equal(manifest.frameOrder.length,23);
  assert.match(js,/function frameAt\(mode,timeSec=0\)/);
  assert.match(js,/durationMs/);
});

test('public studio lists only registered v3 starter parts and exposes no JSON tools',()=>{
  for(const tab of ['hair','eyes','mouth','earring','upper','lower','shoes','weapon','shield']){
    assert.match(html,new RegExp('data-tab="'+tab+'"'));
  }
  for(const id of ['basic-tousled-hair-01','basic-eyes-01','basic-flat-mouth-01','basic-school-uniform-upper-01','basic-school-uniform-lower-01','basic-sneakers-01','school-ruler-01','school-textbook-01']){
    assert.ok(Object.values(manifest.assetIds).includes(id),id);
  }
  assert.doesNotMatch(html,/type="file"|application\/json|JSON 적용|JSON 가져오기|JSON 내보내기/);
  assert.doesNotMatch(js,/FileReader|showOpenFilePicker|importFullAdjustment|applyAdjustmentJsonFile/);
});

test('public v3 studio stays compatible with lobby integration API',()=>{
  for(const token of ['window.KidscadeAvatarShop','getPreviewDataURL','renderPreviewFrame','setPreviewMode','setSeeds','kidscade-avatar-change']){
    assert.ok(js.includes(token),token);
  }
  assert.match(integration,/PREVIEW_VERSION = 'pixel-v3-school-starter-1'/);
  assert.match(integration,/PIXEL_STATE_KEY = 'kidscade-avatar-v3'/);
  assert.match(integration,/SCHOOL_DEFAULT_IMAGE/);
  assert.doesNotMatch(integration,/pixel-avatar-renderer\.js\?v=27|GUEST_DEFAULT_CONFIG|guestConfigFromPixelState/);
});

test('legacy avatar data is not reused as v3 appearance',()=>{
  assert.match(js,/LEGACY_STATE_KEYS=\['kidscade-pixel-avatar-v1','kidscade_avatar_equipped'\]/);
  assert.match(js,/kidscade-avatar-v3-migrated-from-legacy/);
  assert.doesNotMatch(js,/localStorage\.removeItem\('kidscade-pixel-avatar-v1'\)/);
});

test('pixel canvas keeps crisp scaling and responsive controls',()=>{
  assert.match(css,/image-rendering:pixelated/);
  assert.match(css,/@media\(max-width:720px\)/);
});
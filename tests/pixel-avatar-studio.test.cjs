const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'avatar-studio.html'),'utf8');
const js=fs.readFileSync(path.join(root,'avatar-pixel-studio.js'),'utf8');
const renderer=fs.readFileSync(path.join(root,'pixel-avatar-renderer.js'),'utf8');
const css=fs.readFileSync(path.join(root,'avatar-pixel-studio.css'),'utf8');
const rig=JSON.parse(fs.readFileSync(path.join(root,'assets/game/characters/kidscade-avatar-v1/runtime/avatar-rig-v2.json'),'utf8'));

test('avatar studio and renderer JavaScript both parse cleanly',()=>{
  assert.doesNotThrow(()=>new Function(renderer));
  assert.doesNotThrow(()=>new Function(js));
});

test('pixel avatar studio loads the shared rig renderer before the studio controller',()=>{
  assert.match(html,/pixel-avatar-renderer\.js\?v=10/);
  assert.match(html,/avatar-pixel-studio\.js\?v=10/);
  assert.ok(html.indexOf('pixel-avatar-renderer.js?v=10')<html.indexOf('avatar-pixel-studio.js?v=10'));
  assert.match(html,/avatarCanvas/);
  assert.doesNotMatch(html,/avatar-pack-1\.js/);
});

test('pixel avatar studio keeps split hair, face and animated clothes assets',()=>{
  assert.match(js,/hair\/\$\{layer\}\/\$\{set\}/);
  assert.match(js,/runtime\/face/);
  assert.match(js,/hairPath\('back'/);
  assert.match(js,/hairPath\('front'/);
  assert.match(js,/blue-star-zip-hoodie-01/);
  assert.match(js,/denim-cuffed-jeans-01/);
  assert.match(js,/eyes:8/);
  assert.match(js,/eyebrows:6/);
  assert.match(js,/noses:4/);
  assert.match(js,/mouths:8/);
  assert.match(js,/blush:4/);
});

test('studio delegates actual composition to the anchor-rig renderer',()=>{
  assert.match(js,/KidscadePixelAvatarV2/);
  assert.match(js,/renderer\.renderTo/);
  assert.match(js,/rendererConfig/);
  assert.doesNotMatch(js,/function drawLayer/);
  assert.match(js,/animationFrames=\{idle:\[\],walk:\[\]\}/);
  assert.match(js,/renderPreviewFrame:\(mode='idle',time=0\)=>previewFrame\(mode,time\)/);
  assert.match(js,/kidscade-pixel-avatar-v1/);
  assert.match(js,/kidscade-avatar-studio-preview/);
});

test('pixel avatar studio stays compatible with existing avatar integration',()=>{
  assert.match(js,/window\.KidscadeAvatarShop/);
  assert.match(js,/getPreviewDataURL/);
  assert.match(js,/renderPreviewFrame/);
  assert.match(js,/setSeeds/);
  assert.match(js,/kidscade-avatar-change/);
  assert.match(js,/version:'pixel-v2-rig'/);
});

test('new users start with a complete outfit and legacy equipment can migrate',()=>{
  assert.match(js,/upper:1,lower:1/);
  assert.match(js,/kidscade_avatar_equipped/);
  assert.match(js,/legacyMigrationState/);
});

test('avatar rig defines named anchors, named z slots and an item attachment contract',()=>{
  for(const anchor of ['headTop','brow','eyeCenter','nose','mouth','earL','earR','neck','root','handL','handR','footL','footR']){
    assert.ok(Array.isArray(rig.canonicalAnchors[anchor]),'missing anchor '+anchor);
  }
  for(const slot of ['hairBack','body','lowerClothes','upperClothes','face','hairFront','eyeAccessory','cap','faceAccessoryOver','weapon']){
    assert.equal(typeof rig.zSlots[slot],'number','missing z slot '+slot);
  }
  assert.deepEqual(rig.partContract.required,['src','attach','pivot','zSlot']);
  assert.equal(rig.partContract.example.attach,'nose');
  assert.equal(rig.partContract.example.zSlot,'faceAccessoryOver');
  for(const [name,spec] of Object.entries(rig.layerSpecs)){
    assert.ok(rig.canonicalAnchors[spec.attach],name+' has invalid anchor');
    assert.equal(typeof rig.zSlots[spec.zSlot],'number',name+' has invalid z slot');
  }
});

test('renderer positions parts by anchor and pivot rather than hardcoded per-item offsets',()=>{
  assert.match(renderer,/RIG_PATH='runtime\/avatar-rig-v2\.json'/);
  assert.match(renderer,/resolvePlacement\(spec,frame\)/);
  assert.match(renderer,/canonicalAnchors\[spec\.attach\]/);
  assert.match(renderer,/targetCtx\.translate\(ax,ay\)/);
  assert.match(renderer,/targetCtx\.translate\(-px,-py\)/);
  assert.match(renderer,/calls\.sort\(\(a,b\)=>a\.z-b\.z\|\|a\.order-b\.order\)/);
  assert.match(renderer,/setExtraParts/);
  assert.match(renderer,/KidscadePixelAvatarV2=api/);
  assert.match(renderer,/KidscadePixelAvatarV1=api/);
});

test('existing head layers inherit pose transforms through semantic transform groups',()=>{
  assert.equal(rig.layerSpecs.hairBack.transformGroup,'head');
  assert.equal(rig.layerSpecs.hairFront.transformGroup,'head');
  assert.equal(rig.layerSpecs.eyes.attach,'eyeCenter');
  assert.equal(rig.layerSpecs.eyebrows.attach,'brow');
  assert.equal(rig.layerSpecs.nose.attach,'nose');
  assert.equal(rig.layerSpecs.mouth.attach,'mouth');
  assert.match(renderer,/frame\?\.\[transformName\]/);
});

test('runtime assets are revisioned so regenerated PNGs do not stay stale in browser cache',()=>{
  assert.match(js,/ASSET_REV='10'/);
  assert.match(js,/function rev\(src\)/);
  assert.match(renderer,/ASSET_REV='10'/);
});

test('pixel canvas keeps crisp scaling and responsive controls',()=>{
  assert.match(css,/image-rendering:pixelated/);
  assert.match(css,/@media\(max-width:720px\)/);
});
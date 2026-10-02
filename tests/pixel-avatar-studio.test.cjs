const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'avatar-studio.html'),'utf8');
const js=fs.readFileSync(path.join(root,'avatar-pixel-studio.js'),'utf8');
const renderer=fs.readFileSync(path.join(root,'pixel-avatar-renderer.js'),'utf8');
const css=fs.readFileSync(path.join(root,'avatar-pixel-studio.css'),'utf8');
const lab=fs.readFileSync(path.join(root,'pixel-avatar-lab.html'),'utf8');
const rig=JSON.parse(fs.readFileSync(path.join(root,'assets/game/characters/kidscade-avatar-v1/runtime/avatar-rig-v2.json'),'utf8'));
const hairExtract=fs.readFileSync(path.join(root,'scripts/extract-avatar-hair.py'),'utf8');

test('avatar studio and renderer JavaScript both parse cleanly',()=>{
  assert.doesNotThrow(()=>new Function(renderer));
  assert.doesNotThrow(()=>new Function(js));
});

test('pixel avatar studio loads the shared rig renderer before the studio controller',()=>{
  assert.match(html,/pixel-avatar-renderer\.js\?v=16/);
  assert.match(html,/avatar-pixel-studio\.js\?v=16/);
  assert.ok(html.indexOf('pixel-avatar-renderer.js?v=16')<html.indexOf('avatar-pixel-studio.js?v=16'));
  assert.match(html,/avatarCanvas/);
  assert.doesNotMatch(html,/avatar-pack-1\.js/);
});

test('pixel avatar studio keeps split hair, face and animated clothes assets',()=>{
  assert.match(js,/hair\/\$\{layer\}\/\$\{set\}/);
  assert.match(renderer,/runtime\/face/);
  assert.match(js,/hairPath\('back'/);
  assert.match(js,/hairPath\('front'/);
  assert.match(renderer,/blue-star-zip-hoodie-01/);
  assert.match(renderer,/denim-cuffed-jeans-01/);
  assert.match(js,/eyes:8/);
  assert.match(js,/eyebrows:6/);
  assert.match(js,/noses:4/);
  assert.match(js,/mouths:8/);
  assert.match(js,/blush:4/);
});

test('studio delegates actual composition to the anchor-rig renderer',()=>{
  assert.match(js,/KidscadePixelAvatarV2/);
  assert.match(js,/r\.renderTo/);
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
  assert.match(js,/version:'pixel-v2-rig-hairfit-6'/);
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

test('avatar rig lab proves a cropped accessory can attach to the nose anchor',()=>{
  assert.match(lab,/anchorNose/);
  assert.match(lab,/width=16;c\.height=14/);
  assert.match(lab,/attach:'nose'/);
  assert.match(lab,/pivot:\[8,7\]/);
  assert.match(lab,/zSlot:'faceAccessoryOver'/);
  assert.match(lab,/setExtraParts/);
});

test('hair normalization uses one uniform contain scale instead of stretching every style',()=>{
  assert.match(hairExtract,/"targetWidth": 64/);
  assert.match(hairExtract,/"targetTop": 14/);
  assert.match(hairExtract,/"targetWidth": 70/);
  assert.match(hairExtract,/"targetTop": 12/);
  assert.match(hairExtract,/scale = min\(/);
  assert.doesNotMatch(hairExtract,/verticalFactor/);
  assert.match(hairExtract,/"scaleX": round\(scale,4\)/);
  assert.match(hairExtract,/"scaleY": round\(scale,4\)/);
});

test('hair cleanup keeps bangs intact and removes white matte fringe',()=>{
  assert.match(hairExtract,/def remove_white_matte\(/);
  assert.match(hairExtract,/touches_transparency/);
  assert.match(hairExtract,/bg_distance=112/);
  assert.doesNotMatch(hairExtract,/coverage =/);
  assert.match(hairExtract,/remove_white_matte\(clear_bg\(tile\)\)/);
  assert.match(hairExtract,/def build_face_feature_mask\(/);
  assert.match(hairExtract,/Hair is allowed to overlap eyes, eyebrows, nose and mouth/);
  assert.doesNotMatch(hairExtract,/front_alpha = ImageChops\.subtract\(front_alpha, protect_mask\)/);
  assert.doesNotMatch(hairExtract,/build_face_protect/);
  assert.doesNotMatch(hairExtract,/protect_mask/);
  assert.match(hairExtract,/faceClipping/);
});

test('renderer uses one identical transform for every hair style and both split layers',()=>{
  assert.match(renderer,/const HAIR_RENDER_TWEAK=Object\.freeze/);
  assert.match(renderer,/scaleX:1\.07/);
  assert.match(renderer,/scaleY:1\.07/);
  assert.match(renderer,/offsetX:0/);
  assert.match(renderer,/offsetY:0/);
  assert.match(renderer,/key==='hairBack'\|\|key==='hairFront'/);
  assert.doesNotMatch(renderer,/\[1,5,9\]/);
  assert.match(renderer,/renderTweak:hairRenderTweak\(key\)/);
  assert.match(renderer,/tweakScaleX/);
  assert.match(renderer,/tweakScaleY/);
});

test('runtime assets are revisioned so regenerated PNGs do not stay stale in browser cache',()=>{
  assert.match(js,/ASSET_REV='16'/);
  assert.match(js,/function rev\(src\)/);
  assert.match(renderer,/ASSET_REV='16'/);
});

test('pixel canvas keeps crisp scaling and responsive controls',()=>{
  assert.match(css,/image-rendering:pixelated/);
  assert.match(css,/@media\(max-width:720px\)/);
});
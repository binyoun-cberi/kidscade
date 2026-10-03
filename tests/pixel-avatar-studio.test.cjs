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
const hairCatalog=JSON.parse(fs.readFileSync(path.join(root,'assets/game/characters/kidscade-avatar-v1/runtime/hair/approved-hair-manifest.json'),'utf8'));
const legacyHairWorkflow=fs.readFileSync(path.join(root,'.github/workflows/avatar-hair-extract.yml'),'utf8');
const upperClothesExtract=fs.readFileSync(path.join(root,'scripts/extract-avatar-upper-clothes.py'),'utf8');
const lowerClothesExtract=fs.readFileSync(path.join(root,'scripts/extract-avatar-lower-clothes.py'),'utf8');

test('avatar studio and renderer JavaScript both parse cleanly',()=>{
  assert.doesNotThrow(()=>new Function(renderer));
  assert.doesNotThrow(()=>new Function(js));
});

test('pixel avatar studio loads the shared rig renderer before the studio controller',()=>{
  assert.match(html,/pixel-avatar-renderer\.js\?v=26/);
  assert.match(html,/avatar-pixel-studio\.js\?v=30/);
  assert.ok(html.indexOf('pixel-avatar-renderer.js?v=26')<html.indexOf('avatar-pixel-studio.js?v=30'));
  assert.match(html,/avatarCanvas/);
  assert.doesNotMatch(html,/avatar-pack-1\.js/);
});

test('pixel avatar studio exposes only the curated standalone hair catalog',()=>{
  assert.match(renderer,/HAIR_CATALOG_PATH='runtime\/hair\/approved-hair-manifest\.json'/);
  assert.match(renderer,/hairRecord\(c\.hairId\)/);
  assert.match(renderer,/hairBack:hair\?\.back\|\|null/);
  assert.match(renderer,/hairFront:hair\?\.front\|\|null/);
  assert.doesNotMatch(renderer,/runtime\/hair\/front\/\$\{hs\}/);
  assert.doesNotMatch(js,/hairPath\(/);
  assert.match(js,/approvedHairs\(\)/);
  assert.match(js,/data-hair-id/);
  assert.match(renderer,/runtime\/face/);
  assert.match(renderer,/blue-star-zip-hoodie-01/);
  assert.match(renderer,/denim-cuffed-jeans-01/);
  assert.match(js,/eyes:8/);
  assert.match(js,/eyebrows:6/);
  assert.match(js,/noses:4/);
  assert.match(js,/mouths:8/);
  assert.match(js,/blush:4/);
});

test('avatar studio exposes one stand idle walk and jump preview controller',()=>{
  assert.equal((html.match(/id="motionControls"/g)||[]).length,1);
  assert.match(html,/data-motion="static"/);
  assert.match(html,/data-motion="idle"/);
  assert.match(html,/data-motion="walk"/);
  assert.match(html,/data-motion="jump"/);
  assert.match(js,/function startPreviewMode\(mode='static'\)/);
  assert.match(js,/function setPreviewMode\(mode\)/);
  assert.match(js,/function previewTick\(now\)/);
  assert.match(js,/Math\.sin\(Math\.PI\*phase\)/);
  assert.match(js,/setPreviewMode:startPreviewMode/);
  assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
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
  assert.match(js,/version:'pixel-v2-rig-haircatalog-5'/);
});

test('new and legacy users fall back to the curated default hair with a complete outfit',()=>{
  assert.match(js,/hairId:'male-short-01'/);
  assert.match(js,/upper:1,lower:1/);
  assert.match(js,/kidscade_avatar_equipped/);
  assert.match(js,/legacyMigrationState/);
  assert.doesNotMatch(js,/hairMap=/);
  assert.doesNotMatch(js,/femaleHair=/);
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

test('curated hair catalog uses the head-fitted short hair fallback',()=>{
  assert.equal(hairCatalog.type,'kidscade-approved-hair-catalog');
  assert.equal(hairCatalog.legacyHidden,true);
  assert.equal(hairCatalog.fallbackId,'male-short-01');
  assert.equal(hairCatalog.coordinateSystem.canvas[0],128);
  assert.equal(hairCatalog.coordinateSystem.canvas[1],128);
  assert.equal(hairCatalog.coordinateSystem.centerX,65.5);
  assert.equal(hairCatalog.coordinateSystem.runtimeScale,1);
  assert.deepEqual(hairCatalog.coordinateSystem.runtimeOffset,[0,0]);
  const fallback=hairCatalog.items.find(item=>item.id===hairCatalog.fallbackId);
  assert.ok(fallback?.approved);
  assert.equal(fallback.back,null);
  assert.match(fallback.front,/runtime\/hair\/approved\/hair-male-01\.png/);
  const assetPath=path.join(root,'assets/game/characters/kidscade-avatar-v1',fallback.front);
  assert.ok(fs.existsSync(assetPath));
  const png=fs.readFileSync(assetPath);
  assert.equal(png.readUInt32BE(16),128);
  assert.equal(png.readUInt32BE(20),128);
});

test('renderer migrates legacy hair selections to the approved fallback and supports future back hair',()=>{
  assert.match(renderer,/hairId:'male-short-01'/);
  assert.match(renderer,/fallbackHairId\(\)/);
  assert.match(renderer,/this\.hairRecord\(String\(raw\.hairId\|\|''\)\)\?\.id\|\|this\.fallbackHairId\(\)/);
  assert.match(renderer,/hairBack:hair\?\.back\|\|null/);
  assert.match(renderer,/hairFront:hair\?\.front\|\|null/);
  assert.doesNotMatch(renderer,/HAIR_RENDER_TWEAK/);
  assert.doesNotMatch(renderer,/hairRenderTweak/);
});

test('legacy sheet hair stays in the repository but its automatic build is retired',()=>{
  assert.match(hairExtract,/COMMON_CELL_FIT/);
  assert.match(legacyHairWorkflow,/Legacy avatar sheet hair build \(manual\)/);
  assert.match(legacyHairWorkflow,/workflow_dispatch:/);
  assert.doesNotMatch(legacyHairWorkflow,/\n  push:/);
  assert.doesNotMatch(js,/스타일 A/);
  assert.doesNotMatch(js,/스타일 B/);
  assert.doesNotMatch(html,/전체 48/);
  assert.doesNotMatch(html,/스타일 A 24/);
  assert.doesNotMatch(html,/스타일 B 24/);
});

test('runtime assets are revisioned so curated hair migrations do not stay stale in browser cache',()=>{
  assert.match(js,/ASSET_REV='26'/);
  assert.match(js,/function rev\(src\)/);
  assert.match(renderer,/ASSET_REV='26'/);
});


test('animated clothes use a small walk-only coverage guard',()=>{
  assert.match(upperClothesExtract,/WALK_TOP_Y=63/);
  assert.match(upperClothesExtract,/WALK_MAX_W=58/);
  assert.match(upperClothesExtract,/WALK_MAX_H=37/);
  assert.match(lowerClothesExtract,/WALK_TOP_Y = 83/);
  assert.match(lowerClothesExtract,/WALK_MAX_H = 37/);
  assert.match(lowerClothesExtract,/WALK_MAX_W = 46/);
  assert.match(upperClothesExtract,/approved\/hair-male-01\.png/);
  assert.match(lowerClothesExtract,/approved\/hair-male-01\.png/);
});

test('pixel canvas keeps crisp scaling and responsive controls',()=>{
  assert.match(css,/image-rendering:pixelated/);
  assert.match(css,/@media\(max-width:720px\)/);
});
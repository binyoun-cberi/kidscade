const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'avatar-studio.html'),'utf8');
const js=fs.readFileSync(path.join(root,'avatar-pixel-studio.js'),'utf8');
const renderer=fs.readFileSync(path.join(root,'pixel-avatar-renderer.js'),'utf8');
const v3Studio=fs.readFileSync(path.join(root,'assets/game/characters/kidscade-avatar-v3/runtime/avatar-school-studio.js'),'utf8');
const v3Runtime=fs.readFileSync(path.join(root,'assets/game/characters/kidscade-avatar-v3/runtime/school-avatar-runtime.js'),'utf8');
const css=fs.readFileSync(path.join(root,'avatar-pixel-studio.css'),'utf8');
const lab=fs.readFileSync(path.join(root,'pixel-avatar-lab.html'),'utf8');
const rig=JSON.parse(fs.readFileSync(path.join(root,'assets/game/characters/kidscade-avatar-v1/runtime/avatar-rig-v2.json'),'utf8'));
const hairExtract=fs.readFileSync(path.join(root,'scripts/extract-avatar-hair.py'),'utf8');
const hairCatalog=JSON.parse(fs.readFileSync(path.join(root,'assets/game/characters/kidscade-avatar-v1/runtime/hair/approved-hair-manifest.json'),'utf8'));
const legacyHairWorkflow=fs.readFileSync(path.join(root,'.github/workflows/avatar-hair-extract.yml'),'utf8');
const upperClothesExtract=fs.readFileSync(path.join(root,'scripts/extract-avatar-upper-clothes.py'),'utf8');
const lowerClothesExtract=fs.readFileSync(path.join(root,'scripts/extract-avatar-lower-clothes.py'),'utf8');

test('avatar runtimes and studio controllers parse cleanly',()=>{
  assert.doesNotThrow(()=>new Function(renderer));
  assert.doesNotThrow(()=>new Function(js));
  assert.doesNotThrow(()=>new Function(v3Runtime));
  assert.doesNotThrow(()=>new Function(v3Studio));
});

test('public avatar studio loads only the v3 school runtime and controller',()=>{
  assert.match(html,/assets\/game\/characters\/kidscade-avatar-v3\/runtime\/school-avatar-runtime\.js/);
  assert.match(html,/assets\/game\/characters\/kidscade-avatar-v3\/runtime\/avatar-school-studio\.js/);
  assert.ok(html.indexOf('school-avatar-runtime.js')<html.indexOf('avatar-school-studio.js'));
  assert.doesNotMatch(html,/pixel-avatar-renderer\.js/);
  assert.doesNotMatch(html,/avatar-pixel-studio\.js/);
  assert.match(html,/avatarCanvas/);
});

test('v3 public studio exposes nine registered starter slots and no JSON controls',()=>{
  for(const tab of ['hair','eyes','mouth','earring','upper','lower','shoes','weapon','shield'])assert.match(html,new RegExp('data-tab="'+tab+'"'));
  assert.match(v3Studio,/school-starter-01/);
  assert.match(v3Studio,/school-ruler-01/);
  assert.match(v3Studio,/school-textbook-01/);
  assert.doesNotMatch(html,/application\/json|JSON 적용|JSON 내보내기/);
  assert.doesNotMatch(v3Studio,/FileReader|type=['"]file['"]/);
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

test('v3 studio exposes all eight approved animation groups',()=>{
  assert.equal((html.match(/id="motionControls"/g)||[]).length,1);
  for(const mode of ['static','walk','jump','attack','hurt','dead','sit','pickup'])assert.match(html,new RegExp('data-motion="'+mode+'"'));
  assert.match(v3Studio,/function startPreviewMode\(mode='static'\)/);
  assert.match(v3Studio,/renderPreviewFrame/);
  assert.match(v3Runtime,/static:'stand',idle:'stand',smile:'stand'/);
  assert.match(v3Runtime,/attack:'attack'/);
  assert.match(v3Runtime,/pickup:'pickup'/);
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
  assert.match(js,/version:'pixel-v2-rig-haircatalog-6'/);
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
  assert.match(js,/ASSET_REV='27'/);
  assert.match(js,/function rev\(src\)/);
  assert.match(renderer,/ASSET_REV='27'/);
});


test('animated clothes use frame-synced upper paper-doll motion and guarded lower coverage',()=>{
  assert.match(upperClothesExtract,/TORSO_LEFT=52/);
  assert.match(upperClothesExtract,/LEFT_SLEEVE_CUT=61/);
  assert.match(upperClothesExtract,/RIGHT_SLEEVE_CUT=70/);
  assert.match(upperClothesExtract,/def arm_anchor\(/);
  assert.match(upperClothesExtract,/def transform_part\(/);
  assert.match(upperClothesExtract,/animated-upper-clothing-paperdoll/);
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
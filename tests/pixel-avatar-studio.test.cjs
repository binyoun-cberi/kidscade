const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'avatar-studio.html'),'utf8');
const js=fs.readFileSync(path.join(root,'avatar-pixel-studio.js'),'utf8');
const integration=fs.readFileSync(path.join(root,'avatar-integration.js'),'utf8');
const css=fs.readFileSync(path.join(root,'avatar-pixel-studio.css'),'utf8');
const starterDir=path.join(root,'assets/game/characters/kidscade-avatar-v3/school-starter');
const manifest=JSON.parse(fs.readFileSync(path.join(starterDir,'manifest.json'),'utf8'));
const eyeCatalog=JSON.parse(fs.readFileSync(path.join(starterDir,'eyes/catalog.json'),'utf8'));
const hairCatalog=JSON.parse(fs.readFileSync(path.join(starterDir,'hair/catalog.json'),'utf8'));
const hairColorCatalog=JSON.parse(fs.readFileSync(path.join(starterDir,'hair-color/catalog.json'),'utf8'));
const upperCatalog=JSON.parse(fs.readFileSync(path.join(starterDir,'upper/catalog.json'),'utf8'));
const lowerCatalog=JSON.parse(fs.readFileSync(path.join(starterDir,'lower/catalog.json'),'utf8'));
const shoeCatalog=JSON.parse(fs.readFileSync(path.join(starterDir,'shoes/catalog.json'),'utf8'));
const effectCatalog=JSON.parse(fs.readFileSync(path.join(starterDir,'effect/catalog.json'),'utf8'));
const earringCatalog=JSON.parse(fs.readFileSync(path.join(starterDir,'earring/catalog.json'),'utf8'));
const toolCatalog=JSON.parse(fs.readFileSync(path.join(starterDir,'tool/catalog.json'),'utf8'));
const teachingAidCatalog=JSON.parse(fs.readFileSync(path.join(starterDir,'teaching-aid/catalog.json'),'utf8'));

test('public v3 avatar controller parses cleanly',()=>{
  assert.doesNotThrow(()=>new Function(js));
  assert.match(html,/avatar-pixel-studio\.js\?v=74/);
  assert.doesNotMatch(html,/pixel-avatar-renderer\.js/);
});

test('category tabs expose previous and next scroll buttons and keep active tabs visible',()=>{
  assert.match(html,/id="tabPrevBtn"[^>]*aria-label="이전 카테고리"/);
  assert.match(html,/id="tabNextBtn"[^>]*aria-label="다음 카테고리"/);
  assert.match(css,/\.category-nav\{/);
  assert.match(css,/\.tab-scroll-btn\{/);
  assert.match(js,/function updateTabScrollButtons\(\)/);
  assert.match(js,/function scrollCategoryTabs\(direction\)/);
  assert.match(js,/function revealActiveTab\(button,behavior='smooth'\)/);
  assert.match(js,/tabPrevBtn\?\.addEventListener\('click'/);
  assert.match(js,/tabNextBtn\?\.addEventListener\('click'/);
  assert.match(js,/tabs\?\.addEventListener\('scroll',updateTabScrollButtons/);
  assert.match(js,/window\.addEventListener\('resize',updateTabScrollButtons\)/);
});

test('public studio uses school starter v3 assets instead of legacy v2 parts',()=>{
  assert.match(js,/kidscade-avatar-v3\/school-starter/);
  assert.match(js,/school-starter-sheet\.png/);
  assert.match(js,/kidscade-avatar-v3/);
  assert.match(js,/pixel-v3-school-starter-29/);
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
  for(const tab of ['skin','hair','hairColor','eyes','mouth','earring','upper','lower','shoes','effect','weapon','shield']){
    assert.match(html,new RegExp('data-tab="'+tab+'"'));
  }
  for(const id of ['basic-tousled-hair-01','basic-eyes-01','basic-flat-mouth-01','basic-school-uniform-upper-01','basic-school-uniform-lower-01','basic-sneakers-01','school-ruler-01','school-textbook-01']){
    assert.ok(Object.values(manifest.assetIds).includes(id),id);
  }
  assert.doesNotMatch(html,/type="file"|application\/json|JSON 적용|JSON 가져오기|JSON 내보내기/);
  assert.doesNotMatch(js,/FileReader|showOpenFilePicker|importFullAdjustment|applyAdjustmentJsonFile/);
});

test('hat slot is presented to children as head accessories while keeping the internal hat key',()=>{
  assert.match(html,/data-tab="hat"[^>]*>머리 장식</);
  assert.match(js,/hat:\{label:'머리 장식',name:'착용 안 함',assetKey:'hat'\}/);
  assert.match(js,/ensureAssetAccess\(key,id,group\.defaultId,item\.label\)/);
});

test('back accessories render behind the body and use the wardrobe shop flow',()=>{
  assert.match(html,/data-tab="back"[^>]*>등 장식</);
  assert.match(js,/back:\{label:'등 장식',name:'착용 안 함',assetKey:'back'\}/);
  assert.match(js,/wardrobe\.draw\(target,frameId,'back',wardrobeIds\)/);
  const backDraw=js.indexOf("wardrobe.draw(target,frameId,'back',wardrobeIds)");
  const bodyDraw=js.indexOf("target.drawImage(base,0,0)",backDraw);
  assert.ok(backDraw>=0&&bodyDraw>backDraw);
  assert.match(js,/back:\[20,28,88,92\]/);
});
test('face accessory labels stay child-friendly while mask ids remain internal',()=>{
  assert.match(html,/data-tab="mask"[^>]*>얼굴 장식</);
  assert.match(js,/mask:\{label:'얼굴 장식'/);
  assert.doesNotMatch(js,/round-glasses-01<\/small>/);
  assert.doesNotMatch(js,/cheek-bandage-01<\/small>/);
});

test('avatar option cards show friendly labels without internal asset ids',()=>{
  assert.doesNotMatch(js,/part-name[^\n]*<small>\$\{item\.id\}<\/small>/);
  assert.doesNotMatch(js,/part-name[^\n]*<small>'\+item\.id\+'<\/small>/);
  assert.doesNotMatch(js,/part-name[^\n]*<small>\$\{id\}<\/small>/);
  assert.match(js,/data-weapon-id/);
  assert.match(js,/data-shield-id/);
  assert.match(js,/data-hair-id/);
  assert.match(js,/data-eye-id/);
});


test('public v3 studio stays compatible with lobby integration API',()=>{
  for(const token of ['window.KidscadeAvatarShop','getPreviewDataURL','renderPreviewFrame','setPreviewMode','setSeeds','kidscade-avatar-change']){
    assert.ok(js.includes(token),token);
  }
  assert.match(integration,/PREVIEW_VERSION = 'pixel-v3-school-starter-29'/);
  assert.match(integration,/PIXEL_STATE_KEY = 'kidscade-avatar-v3'/);
  assert.match(integration,/SCHOOL_DEFAULT_IMAGE/);
  assert.doesNotMatch(integration,/pixel-avatar-renderer\.js\?v=27|GUEST_DEFAULT_CONFIG|guestConfigFromPixelState/);
});

test('avatar shop uses one global purchase sequence across every cosmetic category',()=>{
  assert.deepEqual(manifest.economy.steps,[100,200,300,500,800,1300]);
  assert.equal(manifest.economy.cap,1300);
  assert.equal(manifest.economy.pricing,'global-purchase-sequence');
  assert.equal(manifest.economy.defaultAssetsFree,true);
  assert.equal(manifest.economy.skinColorFree,true);
  assert.equal(manifest.economy.raritySystem,false);
  assert.match(html,/app\/features\/avatar\/avatar-economy\.js\?v=1/);
  assert.ok(html.indexOf('app/features/avatar/avatar-economy.js')<html.indexOf('avatar-pixel-studio.js'));
  assert.match(js,/const economy=window\.KidscadeAvatarEconomy/);
  assert.match(js,/avatarPurchaseCount:economy\?\.normalizePurchaseCount\(state\.avatarPurchaseCount\)\|\|0/);
  assert.match(js,/economy\.quote\(state\.ownedAssets,state\.avatarPurchaseCount,category,id,defaultId\)/);
  assert.match(js,/state\.avatarPurchaseCount=economy\.normalizePurchaseCount\(state\.avatarPurchaseCount\)\+1/);
  assert.match(js,/function migrateAvatarEconomy\(\)/);
  assert.match(js,/function ensureAssetAccess\(category,id,defaultId,label\)/);
  assert.match(js,/className='shop-badge '/);
  assert.match(css,/\.option \.shop-badge\.locked/);
  assert.match(css,/\.option\.locked-shop/);
});

test('avatar purchases spend the shared seed wallet through the parent integration',()=>{
  assert.match(js,/kidscade-avatar-purchase-request/);
  assert.match(js,/kidscade-avatar-purchase-result/);
  assert.match(integration,/function spendAvatarSeeds\(amount, reason = '아바타 꾸미기 구매'\)/);
  assert.match(integration,/KidscadeSeedWallet/);
  assert.match(integration,/wallet\.spend\(price, \{ reason, source: 'avatar-studio' \}\)/);
  assert.match(integration,/\[100, 200, 300, 500, 800, 1300\]\.includes\(price\)/);
  assert.match(integration,/kidscade-avatar-purchase-request/);
  assert.match(integration,/kidscade-avatar-purchase-result/);
});

test('all non-default avatar asset selectors are purchase-gated while skin stays free',()=>{
  for(const category of ['hair','hairColor','eyes','upper','lower','earring','shoes','weapon','shield']){
    assert.ok(js.includes("ensureAssetAccess('"+category+"'"),category);
  }
  assert.match(js,/ensureAssetAccess\(key,id,group\.defaultId,item\.label\)/);
  assert.ok(js.includes("back:{label:'등 장식',name:'착용 안 함',assetKey:'back'}"));
  assert.doesNotMatch(js,/ensureAssetAccess\('skin'/);
  assert.match(js,/quote\.free\?'기본':quote\.owned\?'보유':'🌱 '/);
  assert.match(js,/기본 세트로 돌아왔어요\. 구매한 파츠는 그대로 보유해요!/);
});


test('legacy avatar data is not reused as v3 appearance',()=>{
  assert.doesNotMatch(js,/kidscade-pixel-avatar-v1|kidscade_avatar_equipped|migrated-from-legacy/);
  assert.match(js,/const STATE_KEY='kidscade-avatar-v3'/);
});

test('pixel canvas keeps crisp scaling and responsive controls',()=>{
  assert.match(css,/image-rendering:pixelated/);
  assert.match(css,/@media\(max-width:720px\)/);
});

test('mobile avatar studio stays inside the viewport and uses compact two-column motion controls',()=>{
  assert.match(css,/\/\* v3 mobile atelier compact layout \*\//);
  assert.match(css,/html,body\{max-width:100%;overflow-x:hidden\}/);
  assert.match(css,/\.motion-controls\{grid-column:2;grid-row:2;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css,/\.preview-actions\{grid-column:1\/-1;grid-row:3/);
  assert.match(css,/\.skin-presets\{grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(css,/\.seed-badge\{display:inline-flex!important/);
  assert.match(html,/avatar-pixel-studio\.css\?v=7/);
});


test('public studio supports free skin color without exposing JSON editing',()=>{
  assert.match(html,/data-tab="skin"/);
  assert.match(js,/const SKIN_PRESETS=/);
  assert.match(js,/function loadSkinPalette\(\)/);
  assert.match(js,/function recolorSkin\(target,frameId='stand-01'\)/);
  assert.match(js,/function setSkinColor\(/);
  assert.match(js,/skinColorPicker/);
  assert.match(js,/type="color"/);
  assert.match(js,/skinColor:normalizeHexColor\(state\.skinColor\)/);
  assert.match(js,/recolorSkin\((?:target|baseCtx),frameId\)/);
  assert.match(css,/\.skin-picker-card/);
  assert.match(css,/input\[type=color\]/);
  assert.equal(manifest.customization.skinColor.freeColor,true);
  assert.equal(manifest.customization.skinColor.preserveShading,true);
  assert.equal(manifest.customization.skinColor.scope,'body-skin-only');
});

test('skin recoloring uses the registered exact BODY palette instead of color guessing',()=>{
  const skin=manifest.customization.skinColor;
  assert.equal(skin.mode,'body-frame-palette-remap-v4');
  assert.equal(skin.paletteSource,'body-first-frame');
  assert.equal(skin.defaultColor,'#fce2d2');
  assert.equal(skin.sourcePalette.length,8);
  assert.deepEqual(skin.sourcePalette.map(item=>item.source),['#fce2d2','#fac8b7','#d1b0ac','#cb9790','#9e7270','#9d8185','#805e61','#7b5053']);
  assert.deepEqual(skin.sourcePalette.map(item=>item.shade),[1,.94,.85,.79,.68,.71,.62,.58]);
  assert.match(js,/function loadSkinPalette\(\)/);
  assert.match(js,/config\.sourcePalette/);
  assert.match(js,/targetRgb\.map\(value=>Math\.max\(0,Math\.min\(255,Math\.round\(value\*src\.shade\)\)\)\)/);
  assert.match(js,/remap\.get\(colorKey\(data\[i\],data\[i\+1\],data\[i\+2\]\)\)/);
  assert.doesNotMatch(js,/isLikelySkin|getImageData\(40,22,50,52\)|rgbToHsl|hslToRgb/);
});

test('skin recoloring covers every source and derived animation frame',()=>{
  const skin=manifest.customization.skinColor;
  assert.deepEqual(skin.sourceFrames,['stand-01','stand-02','walk-01','walk-02','walk-03','walk-04','jump-01']);
  assert.equal(Object.keys(skin.frameSources).length,23);
  assert.deepEqual(Object.keys(skin.frameSources),manifest.frameOrder);
  for(const frameId of manifest.frameOrder){
    assert.ok(Array.isArray(skin.frameSources[frameId])&&skin.frameSources[frameId].length>0,frameId);
  }
  assert.deepEqual(skin.frameSources['attack-03'],['stand-01','jump-01']);
  assert.deepEqual(skin.frameSources['attack-04'],['stand-01','jump-01']);
  assert.deepEqual(skin.frameSources['sit-01'],['stand-01','jump-01']);
  assert.deepEqual(skin.frameSources['sit-02'],['stand-02','jump-01']);
  assert.match(js,/function discoverSourceFrameSkinPalette\(frameId\)/);
  assert.match(js,/function frameImageData\(frameId\)\{\s*const body=bodyFrameCanvas\(frameId\)/);
  assert.match(js,/if\(body\)\{\s*const c=body\.getContext\('2d',\{alpha:true\}\)/);
  assert.match(js,/function loadFrameSkinPalettes\(\)/);
  assert.match(js,/function skinPaletteForFrame\(frameId\)/);
  assert.match(js,/recolorSkin\((?:target|baseCtx),frameId\)/);
  assert.match(js,/loadFrameSkinPalettes\(\);/);
  assert.doesNotMatch(js,/recolorSkin\(target\);/);
});

test('skin color persists in the v3 avatar state and reset returns to original tone',()=>{
  assert.match(js,/let state=\{version:3,setId:'school-starter-01',skinColor:null,hairColorId:'brown',economyVersion:0,avatarPurchaseCount:0,ownedAssets:\{\}\}/);
  assert.match(js,/skinColor:normalizeHexColor\(saved\.skinColor\)/);
  assert.match(js,/state\.skinColor=normalizeHexColor\(value\)/);
  assert.match(js,/state=\{version:3,setId:manifest\?\.id\|\|'school-starter-01',skinColor:null,hairColorId:hairColorCatalog\?\.defaultId\|\|'brown',\.\.\.shopState\}/);
  assert.match(js,/localStorage\.setItem\(STATE_KEY,JSON\.stringify\(payload\)\)/);
});


test('v3 eye catalog adds ten JSON eye assets and keeps the builtin default',()=>{
  assert.equal(manifest.partCatalogs.eyes,'eyes/catalog.json');
  assert.equal(eyeCatalog.type,'kidscade-avatar-eye-catalog');
  assert.equal(eyeCatalog.layer,'eyes');
  assert.equal(eyeCatalog.defaultId,'basic-eyes-01');
  assert.equal(eyeCatalog.items.length,25);
  const extra=eyeCatalog.items.filter(item=>item.id!==eyeCatalog.defaultId);
  assert.equal(extra.length,24);
  assert.equal(new Set(extra.map(item=>item.id)).size,24);
  for(const item of extra){
    const file=JSON.parse(fs.readFileSync(path.join(starterDir,'eyes',item.file),'utf8'));
    assert.equal(file.type,'kidscade-avatar-eye-part',item.id);
    assert.equal(file.id,item.id);
    assert.equal(file.layer,'eyes');
    assert.equal(file.bodyId,'maple-lite-body-v3');
    assert.deepEqual(file.canvas,[128,128]);
    assert.ok(file.pixels.length>=20,item.id);
    for(const pixel of file.pixels){
      assert.equal(pixel.length,6,item.id);
      assert.ok(pixel[0]>=0&&pixel[0]<128&&pixel[1]>=0&&pixel[1]<128,item.id);
      for(const value of pixel.slice(2))assert.ok(Number.isInteger(value)&&value>=0&&value<=255,item.id);
    }
  }
});

test('public renderer composes selected JSON eyes across the 23-frame v3 motion set',()=>{
  assert.match(js,/async function loadEyeCatalog\(\)/);
  assert.match(js,/function transformEyeCanvas\(source,frameId\)/);
  assert.match(js,/function applyEyePart\(target,frameId,eyeId=selectedEyeId\(\)\)/);
  assert.match(js,/data-eye-id/);
  assert.match(js,/frameTransforms/);
  assert.match(js,/sampledEyeSkin\(image,frameId\)/);
  assert.equal(Object.keys(eyeCatalog.frameTransforms).length,16);
  assert.equal(eyeCatalog.sourceFrames.length,7);
  assert.equal(eyeCatalog.sourceFrames.length+Object.keys(eyeCatalog.frameTransforms).length,23);
  assert.equal(eyeCatalog.baseClearPixels.length,98);
});


test('v3 hair catalog contains style choices only and keeps the builtin tousled style',()=>{
  assert.equal(manifest.partCatalogs.hair,'hair/catalog.json');
  assert.equal(manifest.partCatalogs.hairColor,'hair-color/catalog.json');
  assert.equal(hairCatalog.type,'kidscade-avatar-hair-catalog');
  assert.equal(hairCatalog.layer,'hair');
  assert.equal(hairCatalog.defaultId,'basic-tousled-hair-01');
  assert.equal(hairCatalog.items.length,33);
  const extra=hairCatalog.items.filter(item=>item.id!==hairCatalog.defaultId);
  assert.equal(extra.length,32);
  assert.equal(new Set(extra.map(item=>item.id)).size,32);
  assert.ok(hairCatalog.items.every(item=>!/cherry-pink|peach-pink|mint|sky-blue|lavender|blue-purple|rose-gold|white-blonde/.test(item.id)));
  const malePackIds=['dandy-cut-hair-01','two-block-hair-01','gyle-cut-hair-01','comma-hair-01','leaf-cut-hair-01','as-perm-hair-01','shadow-perm-hair-01','pomade-hair-01','regent-hair-01','crew-cut-hair-01','soft-mohawk-hair-01','wolf-cut-hair-01'];
  assert.ok(malePackIds.every(id=>hairCatalog.items.some(item=>item.id===id)));
  assert.equal(new Set(malePackIds).size,12);
  const cartoonPackIds=['hero-spike-hair-01','prince-spike-hair-01','ninja-spike-hair-01','raven-spike-hair-01','explosion-spike-hair-01','ice-white-spike-hair-01','split-tone-hair-01','star-tri-hair-01','mega-twintail-hair-01','curly-hero-hair-01'];
  assert.ok(cartoonPackIds.every(id=>hairCatalog.items.some(item=>item.id===id)));
  assert.equal(new Set(cartoonPackIds).size,10);
  for(const item of extra){
    const file=JSON.parse(fs.readFileSync(path.join(starterDir,'hair',item.file),'utf8'));
    assert.equal(file.type,'kidscade-avatar-hair-part',item.id);
    assert.equal(file.id,item.id);
    assert.equal(file.layer,'hair');
    assert.equal(file.bodyId,'maple-lite-body-v3');
    assert.deepEqual(file.canvas,[128,128]);
    assert.ok(file.pixels.length>=250,item.id);
  }
});

test('male hair pack keeps tousled-base metadata and dark outline palette',()=>{
  const ids=['dandy-cut-hair-01','two-block-hair-01','gyle-cut-hair-01','comma-hair-01','leaf-cut-hair-01','as-perm-hair-01','shadow-perm-hair-01','pomade-hair-01','regent-hair-01','crew-cut-hair-01','soft-mohawk-hair-01','wolf-cut-hair-01'];
  for(const id of ids){
    const item=hairCatalog.items.find(candidate=>candidate.id===id);
    assert.ok(item,id);
    const file=JSON.parse(fs.readFileSync(path.join(starterDir,'hair',item.file),'utf8'));
    assert.equal(file.sourceBaseId,'basic-tousled-hair-01',id);
    assert.equal(file.referenceFrame,'stand-01',id);
    assert.ok(file.pixels.length>=700,id);
    assert.ok(file.pixels.some(pixel=>pixel.slice(2).join(',')==='48,42,48,255'),id+' outline');
    assert.ok(file.pixels.some(pixel=>pixel.slice(2).join(',')==='121,85,62,255'),id+' base');
  }
});

test('shared hair-color catalog dyes every hairstyle without duplicating style JSON',()=>{
  assert.equal(hairColorCatalog.type,'kidscade-avatar-hair-color-catalog');
  assert.equal(hairColorCatalog.defaultId,'brown');
  assert.equal(hairColorCatalog.items.length,9);
  assert.deepEqual(
    hairColorCatalog.items.map(item=>item.id),
    ['brown','cherry-pink','peach-pink','mint','sky-blue','lavender','blue-purple','rose-gold','white-blonde']
  );
  assert.deepEqual(hairColorCatalog.sourcePalette.outline,[48,42,48,255]);
  for(const item of hairColorCatalog.items){
    assert.match(item.swatch,/^#[0-9a-f]{6}$/i,item.id);
    for(const role of ['deepShade','shade','base','light']){
      assert.equal(item[role].length,4,item.id+' '+role);
      for(const value of item[role])assert.ok(Number.isInteger(value)&&value>=0&&value<=255,item.id+' '+role);
    }
  }
  assert.equal(manifest.customization.hairColor.mode,'shared-palette-remap-v1');
  assert.equal(manifest.customization.hairColor.separateFromStyle,true);
  assert.equal(manifest.customization.hairColor.preserveOutline,true);
  assert.match(js,/function loadHairColorCatalog\(\)/);
  assert.match(js,/function recolorHairPixels\(pixels,colorId=selectedHairColorId\(\)\)/);
  assert.match(js,/function renderHairColorOptions\(\)/);
  assert.match(js,/data-hair-color-id/);
  assert.match(js,/recolorHairPixels\(packLayerPixels\(frameId,'hair'\),hairColorId\)/);
  assert.match(js,/hairLayerCanvas\(hairId,frameId,hairColorId\)/);
  assert.match(js,/hairColorId:selectedHairColorId\(\)/);
});

test('legacy duplicated dye ids migrate to style plus shared hair color',()=>{
  assert.match(js,/const LEGACY_DYED_HAIR=/);
  assert.match(js,/'neat-short-hair-mint-01':\['neat-short-hair-01','mint'\]/);
  assert.match(js,/'school-ponytail-hair-lavender-01':\['school-ponytail-hair-02','lavender'\]/);
  assert.match(js,/function migrateLegacyHairSelection\(\)/);
  assert.match(js,/state\.hairColorId=mapped\[1\]/);
});

test('custom hair renders from clean BODY frames instead of the baked default-hair sheet',()=>{
  const bodyFiles=[
    'ChatGPT 이미지 2026년 10월 3일 오후 08_59_08-1.png',
    'ChatGPT 이미지 2026년 10월 3일 오후 08_59_09-2.png',
    'ChatGPT 이미지 2026년 10월 3일 오후 08_59_10-3.png',
    'ChatGPT 이미지 2026년 10월 3일 오후 08_59_11-4.png',
    'ChatGPT 이미지 2026년 10월 3일 오후 08_59_12-5.png',
    'ChatGPT 이미지 2026년 10월 3일 오후 08_59_13-6.png',
    'ChatGPT 이미지 2026년 10월 3일 오후 08_59_14-7.png'
  ];
  assert.equal(manifest.bodyRender.mode,'body-first');
  assert.deepEqual(manifest.bodyRender.sourceFrames,['stand-01','stand-02','walk-01','walk-02','walk-03','walk-04','jump-01']);
  assert.equal(manifest.bodyRender.derivedFrames,16);
  for(const file of bodyFiles)assert.equal(fs.existsSync(path.join(root,'assets/game/characters',file)),true,file);
  assert.match(js,/const BODY_SOURCE_FILES=\[/);
  assert.match(js,/const BODY_SOURCE_FRAME_IDS=\['stand-01','stand-02','walk-01','walk-02','walk-03','walk-04','jump-01'\]/);
  assert.match(js,/const BODY_SOURCE_RESOLUTION=64/);
  assert.match(js,/const BODY_SOURCE_PALETTE=12/);
  assert.match(js,/function rasterBodySource\(img\)/);
  assert.match(js,/function deriveBodyFrame\(frameId\)/);
  assert.match(js,/function loadBodyFrames\(\)/);
  assert.match(js,/spec\.type==='attackMix'/);
  assert.match(js,/spec\.type==='sitMix'/);

  const drawStart=js.indexOf('function drawFrame(target,index,');
  const drawEnd=js.indexOf('\nfunction drawStatic(){',drawStart);
  assert.ok(drawStart>=0&&drawEnd>drawStart);
  const draw=js.slice(drawStart,drawEnd);
  const cleanStart=draw.indexOf('if(cleanBody){');
  const fallbackStart=draw.indexOf('}else{',cleanStart);
  assert.ok(cleanStart>=0&&fallbackStart>cleanStart);
  const clean=draw.slice(cleanStart,fallbackStart);
  const fallback=draw.slice(fallbackStart);
  assert.match(clean,/baseCtx\.drawImage\(cleanBody,0,0\)/);
  assert.match(clean,/if\(customHair\)paintHairLayer\(baseCtx,hairLayerCanvas\(hairId,frameId,hairColorId\)\)/);
  assert.match(clean,/else drawPixelTuples\(baseCtx,recolorHairPixels\(packLayerPixels\(frameId,'hair'\),hairColorId\)\)/);
  assert.doesNotMatch(clean,/clearBaseHair/);
  assert.doesNotMatch(clean,/drawImage\(sheet/);
  assert.match(fallback,/baseCtx\.drawImage\(sheet,index\*SIZE/);
  assert.match(fallback,/if\(customHair\|\|coloredHair\)clearBaseHair\(baseCtx,frameId\)/);
});

test('public renderer keeps legacy hair clearing only as fallback across all 23 motion frames',()=>{
  const countRuns=runs=>runs.reduce((sum,row)=>sum+(row[1]||[]).reduce((n,run)=>n+run[1]-run[0],0),0);
  assert.match(js,/async function loadHairCatalog\(\)/);
  assert.match(js,/function transformHairCanvas\(source,frameId\)/);
  assert.match(js,/function clearBaseHair\(target,frameId\)/);
  assert.match(js,/function paintHairLayer\(target,layer\)/);
  assert.match(js,/data-hair-id/);
  assert.match(js,/hairProtectedKeys/);
  assert.equal(hairCatalog.sourceFrames.length,7);
  assert.equal(Object.keys(hairCatalog.frameTransforms).length,16);
  assert.equal(hairCatalog.sourceFrames.length+Object.keys(hairCatalog.frameTransforms).length,23);
  assert.equal(countRuns(hairCatalog.clear.skinRuns),656);
  assert.equal(countRuns(hairCatalog.clear.outlineRuns),79);
  assert.equal(countRuns(hairCatalog.clear.transparentRuns),166);
  assert.equal(countRuns(hairCatalog.clear.skinRuns)+countRuns(hairCatalog.clear.outlineRuns)+countRuns(hairCatalog.clear.transparentRuns),901);
  assert.equal(hairCatalog.clear.outlineSource,'#7b5053');
  assert.ok(hairCatalog.protectedColors.length>=10);
});

test('hair style and dye persist independently beside eye choice in the v3 public avatar state',()=>{
  assert.match(js,/state\.assetIds=\{\.\.\.\(manifest\?\.assetIds\|\|\{\}\),\.\.\.\(state\.assetIds\|\|\{\}\),hair:id\}/);
  assert.match(js,/state\.assetIds\.hair/);
  assert.match(js,/await loadHairPart\(state\.assetIds\.hair\)/);
  assert.match(js,/state\.hairColorId=id/);
  assert.match(js,/hairColorId:selectedHairColorId\(\)/);
  assert.match(js,/헤어 '\+\(hairCatalog\?\.items\?\.length\|\|0\)\+'종 · 염색 '\+\(hairColorCatalog\?\.items\?\.length\|\|0\)\+'종/);
});


test('v3 upper catalog adds ten JSON tops and keeps the builtin school uniform',()=>{
  assert.equal(manifest.partCatalogs.upper,'upper/catalog.json');
  assert.equal(upperCatalog.type,'kidscade-avatar-upper-catalog');
  assert.equal(upperCatalog.layer,'upper');
  assert.equal(upperCatalog.defaultId,'basic-school-uniform-upper-01');
  assert.equal(upperCatalog.items.length,33);
  assert.equal(upperCatalog.sourcePalette.length,7);
  assert.equal(Object.keys(upperCatalog.frameBounds).length,23);
  const extra=upperCatalog.items.filter(item=>item.id!==upperCatalog.defaultId);
  assert.equal(extra.length,32);
  for(const item of extra){
    const file=JSON.parse(fs.readFileSync(path.join(starterDir,'upper',item.file),'utf8'));
    if(file.type==='kidscade-avatar-full-adjustment'){assert.equal(file.assetIds.upper,item.id);assert.equal(Object.keys(file.frames).length,23);continue}
    assert.equal(file.type,'kidscade-avatar-upper-part',item.id);
    assert.equal(file.layer,'upper');
    assert.equal(file.palette.length,7,item.id);
    for(const color of file.palette)for(const value of color)assert.ok(Number.isInteger(value)&&value>=0&&value<=255,item.id);
  }
});
test('roleplay upper pack adds fourteen distinct 23-frame tops',()=>{
  const ids=['soccer-uniform-01','baseball-uniform-01','basketball-uniform-01','taekwondo-uniform-01','scientist-coat-01','chef-uniform-01','firefighter-jacket-01','police-uniform-01','spacesuit-01','wizard-robe-01','explorer-vest-01','pajama-top-01','raincoat-01','school-cardigan-01'];
  assert.equal(ids.length,14);
  assert.equal(new Set(ids).size,14);
  for(const id of ids){
    const item=upperCatalog.items.find(candidate=>candidate.id===id);assert.ok(item,id);
    const file=JSON.parse(fs.readFileSync(path.join(starterDir,'upper',item.file),'utf8'));
    assert.equal(file.type,'kidscade-avatar-full-adjustment',id);
    assert.equal(file.assetIds.upper,id,id);
    assert.equal(Object.keys(file.frames).length,23,id);
    assert.ok(file.sourceTemplateId,id+' sourceTemplateId');
    for(const frameId of manifest.frameOrder){
      const pixels=file.frames[frameId].layers.upper.operations[0].pixels;
      assert.ok(Array.isArray(pixels)&&pixels.length>=450,id+' '+frameId);
    }
  }
});

test('public renderer applies selected tops to all 23 exact upper frame bounds',()=>{
  assert.match(js,/async function loadUpperCatalog\(\)/);
  assert.match(js,/function applyUpperPart\(target,frameId,upperId=selectedUpperId\(\)\)/);
  assert.match(js,/data-upper-id/);
  assert.deepEqual(Object.keys(upperCatalog.frameBounds),manifest.frameOrder);
});
test('upper choice persists in public v3 state',()=>{
  assert.match(js,/state\.assetIds\.upper/);
  assert.match(js,/await loadUpperPart\(state\.assetIds\.upper\)/);
});


test('v3 lower catalog adds ten JSON pants and keeps the builtin school uniform lower',()=>{
  assert.equal(manifest.partCatalogs.lower,'lower/catalog.json');
  assert.equal(lowerCatalog.type,'kidscade-avatar-lower-catalog');
  assert.equal(lowerCatalog.layer,'lower');
  assert.equal(lowerCatalog.defaultId,'basic-school-uniform-lower-01');
  assert.equal(lowerCatalog.items.length,14);
  assert.deepEqual(lowerCatalog.sourcePalette,[[26,36,52,255],[46,64,85,255],[66,87,109,255],[87,107,124,255]]);
  assert.equal(Object.keys(lowerCatalog.frameBounds).length,23);
  assert.deepEqual(Object.keys(lowerCatalog.frameBounds),manifest.frameOrder);
  const extra=lowerCatalog.items.filter(item=>item.id!==lowerCatalog.defaultId);
  assert.equal(extra.length,13);
  assert.equal(new Set(extra.map(item=>item.id)).size,13);
  for(const item of extra){
    const file=JSON.parse(fs.readFileSync(path.join(starterDir,'lower',item.file),'utf8'));
    if(file.type==='kidscade-avatar-full-adjustment'){assert.equal(file.assetIds.lower,item.id);assert.equal(Object.keys(file.frames).length,23);continue}
    assert.equal(file.type,'kidscade-avatar-lower-part',item.id);
    assert.equal(file.id,item.id);
    assert.equal(file.layer,'lower');
    assert.equal(file.bodyId,'maple-lite-body-v3');
    assert.deepEqual(file.canvas,[128,128]);
    assert.equal(file.palette.length,4,item.id);
    assert.equal(file.frameMode,'exact-source-palette-remap-23');
    for(const color of file.palette){
      assert.equal(color.length,4,item.id);
      for(const value of color)assert.ok(Number.isInteger(value)&&value>=0&&value<=255,item.id);
    }
  }
});

test('public renderer applies selected JSON lower parts to all 23 frame bounds',()=>{
  assert.match(js,/async function loadLowerCatalog\(\)/);
  assert.match(js,/async function loadLowerPart\(id\)/);
  assert.match(js,/function applyLowerPart\(target,frameId,lowerId=selectedLowerId\(\)\)/);
  assert.match(js,/data-lower-id/);
  assert.match(js,/renderLowerOptions/);
  assert.match(js,/drawLowerThumbnail/);
  assert.match(js,/applyLowerPart\((?:target|baseCtx),frameId,lowerId\)/);
  assert.deepEqual(Object.keys(lowerCatalog.frameBounds),manifest.frameOrder);
});

test('lower choice persists in public v3 state',()=>{
  assert.match(js,/state\.assetIds\.lower/);
  assert.match(js,/await loadLowerPart\(state\.assetIds\.lower\)/);
  assert.match(js,/lower:id/);
});


test('hair visual regression keeps repaired partings solid and rebuilt ponytail sealed and off the eye',()=>{
  const loadHair=name=>JSON.parse(fs.readFileSync(path.join(starterDir,'hair',name),'utf8'));
  const coordSet=data=>new Set(data.pixels.map(pixel=>pixel[0]+','+pixel[1]));
  const side=coordSet(loadHair('side-part-hair-01.json'));
  const curly=coordSet(loadHair('curly-hair-01.json'));
  const pony=coordSet(loadHair('school-ponytail-hair-02.json'));
  const neatData=loadHair('neat-short-hair-01.json');
  const neat=coordSet(neatData);
  const sideRepair={22:[61,62,63],23:[61,62,63],24:[61,62,63],25:[60,61,62],26:[60,61,62],27:[60,61,62],28:[60,61,62],29:[60,61],30:[60,61],31:[60],33:[59]};
  for(const [y,xs] of Object.entries(sideRepair))for(const x of xs)assert.ok(side.has(x+','+y),'side-part gap '+x+','+y);
  const curlyRepair={38:[[61,61]],39:[[60,62],[72,72]],40:[[59,62],[71,73]],41:[[58,63],[70,73]],42:[[58,64],[69,74]],43:[[59,64],[70,75]],44:[[60,63],[71,75]],45:[[60,62],[71,74]]};
  for(const [y,runs] of Object.entries(curlyRepair))for(const [a,b] of runs)for(let x=a;x<=b;x++)assert.ok(curly.has(x+','+y),'curly gap '+x+','+y);
  const eyeMask=new Set(eyeCatalog.baseClearPixels.map(pixel=>pixel[0]+','+pixel[1]));
  assert.deepEqual([...pony].filter(key=>eyeMask.has(key)),[]);
  assert.deepEqual([...neat].filter(key=>eyeMask.has(key)),[]);
  assert.deepEqual([...curly].filter(key=>eyeMask.has(key)),[]);
  const expectedNeatExtents={23:[65,65],24:[57,71],25:[57,73],26:[57,76],27:[51,77],28:[51,79],29:[51,80],30:[51,81],31:[46,82],32:[46,82],33:[46,83],34:[46,84],35:[46,84],36:[44,85],37:[44,85],38:[44,85],39:[44,85],40:[44,85],41:[45,84],42:[45,84],43:[45,83],44:[45,83],45:[45,83],46:[47,81],47:[47,81]};
  for(const [y,expected] of Object.entries(expectedNeatExtents)){
    const xs=neatData.pixels.filter(pixel=>pixel[1]===Number(y)).map(pixel=>pixel[0]);
    assert.ok(xs.length>0,'neat-short row '+y);
    assert.deepEqual([Math.min(...xs),Math.max(...xs)],expected,'body-fit neat-short extent '+y);
  }
  assert.ok(neatData.pixels.some(pixel=>pixel[1]===47&&pixel[0]<=49),'neat-short side hair reaches lower beside face');
  assert.ok(neatData.pixels.some(pixel=>pixel[1]===47&&pixel[0]>=79),'neat-short right side hair reaches lower beside face');
  const starterPack=JSON.parse(fs.readFileSync(path.join(starterDir,'school-starter.json'),'utf8'));
  const tousledTop=starterPack.frames['stand-01'].layers.hair.operations.flatMap(operation=>operation.pixels||[]).filter(pixel=>pixel[1]>=23&&pixel[1]<=35);
  const neatTop=neatData.pixels.filter(pixel=>pixel[1]>=23&&pixel[1]<=35);
  assert.deepEqual(
    neatTop.map(pixel=>pixel.slice(0,2)),
    tousledTop.map(pixel=>pixel.slice(0,2)),
    'neat-short upper silhouette follows builtin tousled hair exactly'
  );
  const ponyData=loadHair('school-ponytail-hair-02.json');
  assert.ok(ponyData.pixels.some(pixel=>pixel[0]>=86&&pixel[1]>=38&&pixel[1]<=48),'body-fit ponytail tail');
  assert.ok(ponyData.pixels.every(pixel=>pixel[0]<=94),'ponytail stays close to body head');
  assert.equal(hairColorCatalog.items.length,9);
  assert.ok(hairColorCatalog.items.some(item=>item.id==='mint'));
  assert.ok(hairColorCatalog.items.some(item=>item.id==='white-blonde'));
  assert.ok(hairCatalog.items.some(item=>item.id==='school-ponytail-hair-02'&&item.file==='school-ponytail-hair-02.json'));
  assert.ok(!hairCatalog.items.some(item=>item.id==='ponytail-hair-01'));
  assert.equal(fs.existsSync(path.join(starterDir,'hair','ponytail-hair-01.json')),false);
  for(let y=22;y<=35;y++){
    const xs=[...pony].map(key=>key.split(',').map(Number)).filter(([x,py])=>py===y&&x>=48&&x<=82).map(([x])=>x).sort((a,b)=>a-b);
    for(let i=1;i<xs.length;i++)assert.ok(xs[i]-xs[i-1]<=1,'rebuilt ponytail crown gap at row '+y);
  }
});


test('trousers have separate legs and four depth tones in the starter JSON',()=>{
  const pack=JSON.parse(fs.readFileSync(path.join(starterDir,'school-starter.json'),'utf8'));
  for(const id of manifest.frameOrder){
    const pixels=pack.frames[id].layers.lower.operations[0].pixels;
    assert.ok(pixels.length>100,id);
    assert.ok(new Set(pixels.map(p=>p.slice(2).join(','))).size>=3,id);
    assert.ok(pixels.every(p=>lowerCatalog.sourcePalette.some(c=>c.join(',')===p.slice(2).join(','))),id);
  }
  const stand=pack.frames['stand-01'].layers.lower.operations[0].pixels;
  const ankle=stand.filter(p=>p[1]===109).map(p=>p[0]).sort((a,b)=>a-b);
  assert.ok(ankle.length>4);
  assert.ok(ankle.some((x,i)=>i>0&&x-ankle[i-1]>1),'transparent gap between trouser legs');
});


test('school accessory catalogs expose 20 shoes, 10 earrings, 32 tools and 6 teaching aids plus defaults',()=>{
  assert.equal(manifest.partCatalogs.shoes,'shoes/catalog.json');
  assert.equal(manifest.partCatalogs.earring,'earring/catalog.json');
  assert.equal(manifest.partCatalogs.weapon,'tool/catalog.json');
  assert.equal(manifest.partCatalogs.shield,'teaching-aid/catalog.json');
  assert.equal(shoeCatalog.items.length,21);
  assert.equal(earringCatalog.items.length,11);
  assert.equal(toolCatalog.items.length,33);
  assert.equal(teachingAidCatalog.items.length,7);
  const silhouetteShoes={
    '하이탑 운동화':'hightop-sneaker','농구화':'basketball-shoe','축구화':'soccer-cleat','장화':'rain-boot','털부츠':'fur-boot',
    '슬리퍼':'slipper','샌들':'sandal','롤러스케이트':'roller-skate','인라인스케이트':'inline-skate','캐릭터 슬리퍼':'character-slipper'
  };
  for(const [label,shape] of Object.entries(silhouetteShoes)){const item=shoeCatalog.items.find(candidate=>candidate.label===label);assert.ok(item,label);assert.equal(item.shape,shape,label)}
  assert.match(js,/function splitShoeComponents\(pixels\)/);
  assert.match(js,/function shoeSilhouettePixels\(def,frameId\)/);
  for(const shape of Object.values(silhouetteShoes))assert.match(js,new RegExp("def\\.shape==='"+shape+"'"),shape);
  assert.equal(new Set(shoeCatalog.items.map(item=>item.id)).size,21);
  assert.equal(new Set(earringCatalog.items.map(item=>item.id)).size,11);
  assert.equal(new Set(toolCatalog.items.map(item=>item.id)).size,33);
  assert.equal(new Set(teachingAidCatalog.items.map(item=>item.id)).size,7);
  for(const label of ['연필','색연필','사인펜','크레파스','붓','단소','리코더','청소빗자루','물로켓','가위','별모양 마법지팡이','축구공','농구공','배구공'])assert.ok(toolCatalog.items.some(item=>item.label===label),label);
  const hobbyTools={
    '게임기':'handheld-game','카메라':'camera','돋보기':'magnifier','망원경':'telescope','마이크':'microphone','기타':'guitar','우쿨렐레':'ukulele','낚싯대':'fishing-rod','잠자리채':'bug-net',
    '물총':'water-gun','풍선':'balloon','꽃다발':'bouquet','아이스크림':'ice-cream','솜사탕':'cotton-candy','햄버거':'hamburger','음료수':'drink','랜턴':'lantern','보물지도':'treasure-map'
  };
  for(const [label,kind] of Object.entries(hobbyTools)){const item=toolCatalog.items.find(candidate=>candidate.label===label);assert.ok(item,label);assert.equal(item.kind,kind,label);assert.match(js,new RegExp("def\\.kind==='"+kind+"'"),kind)}
  assert.equal(toolCatalog.items.find(item=>item.label==='축구공').kind,'soccer-ball');
  assert.equal(toolCatalog.items.find(item=>item.label==='농구공').kind,'basketball');
  assert.equal(toolCatalog.items.find(item=>item.label==='배구공').kind,'volleyball');
  for(const label of ['지우개','이로미','쓰레받기','연필깎이','곰돌이인형','베개'])assert.ok(teachingAidCatalog.items.some(item=>item.label===label),label);
});

test('special effect catalog exposes ten purchasable pixel effects plus a free none option',()=>{
  assert.equal(manifest.partCatalogs.effect,'effect/catalog.json');
  assert.equal(manifest.assetIds.effect,'no-effect');
  assert.equal(effectCatalog.type,'kidscade-avatar-effect-catalog');
  assert.equal(effectCatalog.defaultId,'no-effect');
  assert.equal(effectCatalog.items.length,11);
  assert.equal(new Set(effectCatalog.items.map(item=>item.id)).size,11);
  const expected={'반짝이':'sparkle','별이 떠다님':'stars','하트':'hearts','눈송이':'snow','불꽃':'flame','번개':'lightning','음표':'music-notes','작은 구름':'small-cloud','나뭇잎':'leaves','무지개':'rainbow'};
  for(const [label,kind] of Object.entries(expected)){const item=effectCatalog.items.find(candidate=>candidate.label===label);assert.ok(item,label);assert.equal(item.kind,kind,label)}
  assert.equal(effectCatalog.items.find(item=>item.id==='cloud-effect-01').pass,'back');
  assert.equal(effectCatalog.items.find(item=>item.id==='rainbow-effect-01').pass,'back');
  assert.match(html,/data-tab="effect" type="button">이펙트<\/button>/);
  assert.match(js,/function loadEffectCatalog\(\)/);
  assert.match(js,/function selectedEffectId\(\)/);
  assert.match(js,/function effectPixels\(def,frameId,pass\)/);
  assert.match(js,/function drawEffectPass\(target,frameId,id=selectedEffectId\(\),pass='front'\)/);
  assert.match(js,/drawEffectPass\(target,frameId,effectId,'back'\)/);
  assert.match(js,/drawEffectPass\(target,frameId,effectId,'front'\)/);
  assert.match(js,/data-effect-id/);
  assert.match(js,/function setEffectAsset\(id\)/);
  assert.match(js,/effect:id/);
});

test('public avatar renders school accessories on all motion frames with correct hand and depth rules',()=>{
  assert.match(js,/const SCHOOL_PACK_URL=ROOT\+'\/school-starter\.json'/);
  assert.match(js,/function stripDefaultEquipment\(target,frameId\)/);
  assert.match(js,/function drawEquipmentPass\(target,frameId,slot,id,pass\)/);
  assert.match(js,/const ACCESSORY_OUTLINE=\[24,20,23,255\]/);
  assert.match(js,/function accessoryOutlinePixels\(pixels,color=ACCESSORY_OUTLINE\)/);
  assert.match(js,/function drawPixelTuples\(target,pixels,withOutline=false\)/);
  assert.match(js,/drawPixelTuples\(target,equipmentPassPixels\(def,frameId,slot,pass\),true\)/);
  assert.match(js,/drawPixelTuples\(target,earringShapePixels\(def,frameId\),true\)/);
  assert.match(js,/accessoryOutlinePixels\(packLayerPixels\(frameId,'earring'\)\)/);
  assert.match(js,/accessoryOutlinePixels\(pixels\)/);
  assert.match(js,/function drawSoccerBall\(/);
  assert.match(js,/function drawBasketball\(/);
  assert.match(js,/function drawVolleyball\(/);
  assert.match(js,/def\.kind==='soccer-ball'/);
  assert.match(js,/def\.kind==='basketball'/);
  assert.match(js,/def\.kind==='volleyball'/);
  assert.doesNotMatch(js,/def\.kind\.endsWith\('-ball'\)/);
  assert.deepEqual(toolCatalog.attackBackFrames,['attack-02']);
  assert.equal(toolCatalog.hand,'left');
  assert.equal(teachingAidCatalog.hand,'right');
  assert.equal(toolCatalog.frameCount,23);
  assert.equal(teachingAidCatalog.frameCount,23);
  assert.equal(manifest.frameOrder.length,23);
  assert.match(js,/drawEquipmentPass\(target,frameId,'weapon',toolId,'back'\)/);
  assert.match(js,/target\.drawImage\(base,0,0\)/);
  assert.match(js,/drawEquipmentPass\(target,frameId,'shield',aidId,'front'\)/);
  assert.match(js,/drawEquipmentPass\(target,frameId,'weapon',toolId,'front'\)/);
});

test('public accessory selection persists paired equipment slots and renames book tab to teaching aids',()=>{
  assert.match(html,/data-tab="shield" type="button">교구<\/button>/);
  assert.doesNotMatch(html,/data-tab="shield" type="button">책<\/button>/);
  assert.match(js,/function setShoeAsset\(id\)/);
  assert.match(js,/function setEarringAsset\(id\)/);
  assert.match(js,/function setToolAsset\(id\)/);
  assert.match(js,/function setTeachingAidAsset\(id\)/);
  assert.match(js,/weaponFront:id,weaponBack:id/);
  assert.match(js,/shieldFront:id,shieldBack:id/);
  assert.match(js,/data-weapon-id/);
  assert.match(js,/data-shield-id/);
});

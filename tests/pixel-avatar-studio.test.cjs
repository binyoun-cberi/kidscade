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
const upperCatalog=JSON.parse(fs.readFileSync(path.join(starterDir,'upper/catalog.json'),'utf8'));
const lowerCatalog=JSON.parse(fs.readFileSync(path.join(starterDir,'lower/catalog.json'),'utf8'));
const shoeCatalog=JSON.parse(fs.readFileSync(path.join(starterDir,'shoes/catalog.json'),'utf8'));
const earringCatalog=JSON.parse(fs.readFileSync(path.join(starterDir,'earring/catalog.json'),'utf8'));
const toolCatalog=JSON.parse(fs.readFileSync(path.join(starterDir,'tool/catalog.json'),'utf8'));
const teachingAidCatalog=JSON.parse(fs.readFileSync(path.join(starterDir,'teaching-aid/catalog.json'),'utf8'));

test('public v3 avatar controller parses cleanly',()=>{
  assert.doesNotThrow(()=>new Function(js));
  assert.match(html,/avatar-pixel-studio\.js\?v=52/);
  assert.doesNotMatch(html,/pixel-avatar-renderer\.js/);
});

test('public studio uses school starter v3 assets instead of legacy v2 parts',()=>{
  assert.match(js,/kidscade-avatar-v3\/school-starter/);
  assert.match(js,/school-starter-sheet\.png/);
  assert.match(js,/kidscade-avatar-v3/);
  assert.match(js,/pixel-v3-school-starter-10/);
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
  for(const tab of ['skin','hair','eyes','mouth','earring','upper','lower','shoes','weapon','shield']){
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
  assert.match(integration,/PREVIEW_VERSION = 'pixel-v3-school-starter-10'/);
  assert.match(integration,/PIXEL_STATE_KEY = 'kidscade-avatar-v3'/);
  assert.match(integration,/SCHOOL_DEFAULT_IMAGE/);
  assert.doesNotMatch(integration,/pixel-avatar-renderer\.js\?v=27|GUEST_DEFAULT_CONFIG|guestConfigFromPixelState/);
});

test('legacy avatar data is not reused as v3 appearance',()=>{
  assert.doesNotMatch(js,/kidscade-pixel-avatar-v1|kidscade_avatar_equipped|migrated-from-legacy/);
  assert.match(js,/const STATE_KEY='kidscade-avatar-v3'/);
});

test('pixel canvas keeps crisp scaling and responsive controls',()=>{
  assert.match(css,/image-rendering:pixelated/);
  assert.match(css,/@media\(max-width:720px\)/);
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
  assert.equal(skin.mode,'frame-aware-palette-remap-v3');
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
  assert.match(js,/function loadFrameSkinPalettes\(\)/);
  assert.match(js,/function skinPaletteForFrame\(frameId\)/);
  assert.match(js,/recolorSkin\((?:target|baseCtx),frameId\)/);
  assert.match(js,/loadFrameSkinPalettes\(\);/);
  assert.doesNotMatch(js,/recolorSkin\(target\);/);
});

test('skin color persists in the v3 avatar state and reset returns to original tone',()=>{
  assert.match(js,/let state=\{version:3,setId:'school-starter-01',skinColor:null\}/);
  assert.match(js,/skinColor:normalizeHexColor\(saved\.skinColor\)/);
  assert.match(js,/state\.skinColor=normalizeHexColor\(value\)/);
  assert.match(js,/state=\{version:3,setId:manifest\?\.id\|\|'school-starter-01',skinColor:null\}/);
  assert.match(js,/localStorage\.setItem\(STATE_KEY,JSON\.stringify\(payload\)\)/);
});


test('v3 eye catalog adds ten JSON eye assets and keeps the builtin default',()=>{
  assert.equal(manifest.partCatalogs.eyes,'eyes/catalog.json');
  assert.equal(eyeCatalog.type,'kidscade-avatar-eye-catalog');
  assert.equal(eyeCatalog.layer,'eyes');
  assert.equal(eyeCatalog.defaultId,'basic-eyes-01');
  assert.equal(eyeCatalog.items.length,11);
  const extra=eyeCatalog.items.filter(item=>item.id!==eyeCatalog.defaultId);
  assert.equal(extra.length,10);
  assert.equal(new Set(extra.map(item=>item.id)).size,10);
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


test('v3 hair catalog adds ten JSON hairstyles and keeps the builtin tousled style',()=>{
  assert.equal(manifest.partCatalogs.hair,'hair/catalog.json');
  assert.equal(hairCatalog.type,'kidscade-avatar-hair-catalog');
  assert.equal(hairCatalog.layer,'hair');
  assert.equal(hairCatalog.defaultId,'basic-tousled-hair-01');
  assert.equal(hairCatalog.items.length,11);
  const extra=hairCatalog.items.filter(item=>item.id!==hairCatalog.defaultId);
  assert.equal(extra.length,10);
  assert.equal(new Set(extra.map(item=>item.id)).size,10);
  for(const item of extra){
    const file=JSON.parse(fs.readFileSync(path.join(starterDir,'hair',item.file),'utf8'));
    assert.equal(file.type,'kidscade-avatar-hair-part',item.id);
    assert.equal(file.id,item.id);
    assert.equal(file.layer,'hair');
    assert.equal(file.bodyId,'maple-lite-body-v3');
    assert.deepEqual(file.canvas,[128,128]);
    assert.ok(file.pixels.length>=250,item.id);
    for(const pixel of file.pixels){
      assert.equal(pixel.length,6,item.id);
      assert.ok(pixel[0]>=0&&pixel[0]<128&&pixel[1]>=0&&pixel[1]<128,item.id);
      for(const value of pixel.slice(2))assert.ok(Number.isInteger(value)&&value>=0&&value<=255,item.id);
    }
  }
});

test('public renderer replaces the baked default hair safely across all 23 motion frames',()=>{
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

test('hair choice persists beside eye choice in the v3 public avatar state',()=>{
  assert.match(js,/state\.assetIds=\{\.\.\.\(manifest\?\.assetIds\|\|\{\}\),\.\.\.\(state\.assetIds\|\|\{\}\),hair:id\}/);
  assert.match(js,/state\.assetIds\.hair/);
  assert.match(js,/await loadHairPart\(state\.assetIds\.hair\)/);
  assert.match(js,/헤어 11종/);
});


test('v3 upper catalog adds ten JSON tops and keeps the builtin school uniform',()=>{
  assert.equal(manifest.partCatalogs.upper,'upper/catalog.json');
  assert.equal(upperCatalog.type,'kidscade-avatar-upper-catalog');
  assert.equal(upperCatalog.layer,'upper');
  assert.equal(upperCatalog.defaultId,'basic-school-uniform-upper-01');
  assert.equal(upperCatalog.items.length,11);
  assert.equal(upperCatalog.sourcePalette.length,7);
  assert.equal(Object.keys(upperCatalog.frameBounds).length,23);
  const extra=upperCatalog.items.filter(item=>item.id!==upperCatalog.defaultId);
  assert.equal(extra.length,10);
  for(const item of extra){
    const file=JSON.parse(fs.readFileSync(path.join(starterDir,'upper',item.file),'utf8'));
    assert.equal(file.type,'kidscade-avatar-upper-part',item.id);
    assert.equal(file.layer,'upper');
    assert.equal(file.palette.length,7,item.id);
    for(const color of file.palette)for(const value of color)assert.ok(Number.isInteger(value)&&value>=0&&value<=255,item.id);
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
  assert.match(js,/상의 11종/);
});


test('v3 lower catalog adds ten JSON pants and keeps the builtin school uniform lower',()=>{
  assert.equal(manifest.partCatalogs.lower,'lower/catalog.json');
  assert.equal(lowerCatalog.type,'kidscade-avatar-lower-catalog');
  assert.equal(lowerCatalog.layer,'lower');
  assert.equal(lowerCatalog.defaultId,'basic-school-uniform-lower-01');
  assert.equal(lowerCatalog.items.length,11);
  assert.deepEqual(lowerCatalog.sourcePalette,[[26,36,52,255],[46,64,85,255],[66,87,109,255],[87,107,124,255]]);
  assert.equal(Object.keys(lowerCatalog.frameBounds).length,23);
  assert.deepEqual(Object.keys(lowerCatalog.frameBounds),manifest.frameOrder);
  const extra=lowerCatalog.items.filter(item=>item.id!==lowerCatalog.defaultId);
  assert.equal(extra.length,10);
  assert.equal(new Set(extra.map(item=>item.id)).size,10);
  for(const item of extra){
    const file=JSON.parse(fs.readFileSync(path.join(starterDir,'lower',item.file),'utf8'));
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
  assert.match(js,/하의 11종/);
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
  const expectedNeatExtents={33:[47,82],34:[47,82],35:[47,82],36:[47,82],37:[47,82],38:[47,82],39:[47,82],40:[48,82],41:[48,81],42:[48,81],43:[49,80]};
  for(const [y,expected] of Object.entries(expectedNeatExtents)){
    const xs=neatData.pixels.filter(pixel=>pixel[1]===Number(y)).map(pixel=>pixel[0]);
    assert.ok(xs.length>0,'neat-short row '+y);
    assert.deepEqual([Math.min(...xs),Math.max(...xs)],expected,'body-fit neat-short extent '+y);
  }
  const ponyData=loadHair('school-ponytail-hair-02.json');
  assert.ok(ponyData.pixels.some(pixel=>pixel[0]>=86&&pixel[1]>=38&&pixel[1]<=48),'body-fit ponytail tail');
  assert.ok(ponyData.pixels.every(pixel=>pixel[0]<=94),'ponytail stays close to body head');
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


test('school accessory catalogs expose 10 shoes, 10 earrings, 14 tools and 6 teaching aids plus defaults',()=>{
  assert.equal(manifest.partCatalogs.shoes,'shoes/catalog.json');
  assert.equal(manifest.partCatalogs.earring,'earring/catalog.json');
  assert.equal(manifest.partCatalogs.weapon,'tool/catalog.json');
  assert.equal(manifest.partCatalogs.shield,'teaching-aid/catalog.json');
  assert.equal(shoeCatalog.items.length,11);
  assert.equal(earringCatalog.items.length,11);
  assert.equal(toolCatalog.items.length,15);
  assert.equal(teachingAidCatalog.items.length,7);
  assert.equal(new Set(shoeCatalog.items.map(item=>item.id)).size,11);
  assert.equal(new Set(earringCatalog.items.map(item=>item.id)).size,11);
  assert.equal(new Set(toolCatalog.items.map(item=>item.id)).size,15);
  assert.equal(new Set(teachingAidCatalog.items.map(item=>item.id)).size,7);
  for(const label of ['연필','색연필','사인펜','크레파스','붓','단소','리코더','청소빗자루','물로켓','가위','별모양 마법지팡이','축구공','농구공','배구공'])assert.ok(toolCatalog.items.some(item=>item.label===label),label);
  assert.equal(toolCatalog.items.find(item=>item.label==='축구공').kind,'soccer-ball');
  assert.equal(toolCatalog.items.find(item=>item.label==='농구공').kind,'basketball');
  assert.equal(toolCatalog.items.find(item=>item.label==='배구공').kind,'volleyball');
  for(const label of ['지우개','이로미','쓰레받기','연필깎이','곰돌이인형','베개'])assert.ok(teachingAidCatalog.items.some(item=>item.label===label),label);
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
  assert.match(js,/신발 11종/);
  assert.match(js,/귀걸이 11종/);
  assert.match(js,/도구 15종/);
  assert.match(js,/교구 7종/);
});

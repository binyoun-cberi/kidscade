const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'teacher','avatar-clothing-studio.html'),'utf8');
const js=fs.readFileSync(path.join(root,'teacher-avatar-clothing-studio.js'),'utf8');
const teacherHtml=fs.readFileSync(path.join(root,'teacher','index.html'),'utf8');
const teacherJs=fs.readFileSync(path.join(root,'teacher-accounts.js'),'utf8');

test('avatar studio JavaScript parses cleanly',()=>{
  assert.doesNotThrow(()=>new Function(js));
});

test('global admin exposes the avatar studio entry point',()=>{
  assert.match(teacherHtml,/id="admin-tools"/);
  assert.match(teacherHtml,/\/teacher\/avatar-clothing-studio\.html/);
  assert.match(teacherHtml,/아바타 제작실/);
  assert.match(teacherJs,/admin-tools/);
});

test('studio stays on exact 128x128 runtime coordinates',()=>{
  assert.match(html,/canvas id="workCanvas" width="128" height="128"/);
  assert.match(js,/const SIZE=128/);
  assert.match(js,/const ROOT_X=64/);
  assert.match(js,/const GROUND_Y=118/);
  assert.match(js,/imageSmoothingEnabled=false/);
});

test('v3 frame contract uses stand 2 walk 4 and jump 1',()=>{
  for(const frame of ['stand-01','stand-02','walk-01','walk-02','walk-03','walk-04','jump-01']) assert.ok(js.includes(frame));
});

test('studio exposes requested avatar part slots without a nose slot',()=>{
  const buttons=[
    'layerBody','layerHair','layerEyes','layerMouth','layerEarring','layerMask',
    'layerUpper','layerLower','layerShoes','layerGloves','layerHat'
  ];
  for(const id of buttons) assert.ok(html.includes('id="'+id+'"'));
  assert.ok(!html.includes('id="layerNose"'));
  assert.ok(!html.includes('id="noseId"'));
  assert.ok(js.includes("const LAYERS=['body','eyes','mouth','mask','lower','shoes','upper','gloves','hair','earring','hat'];"));
  assert.ok(!js.includes("nose:"));
});

test('parts are grouped for face hair outfit and accessories',()=>{
  assert.ok(js.includes("const FACE_LAYERS=['eyes','mouth'];"));
  assert.ok(js.includes("const HAIR_LAYERS=['hair','hat'];"));
  assert.ok(js.includes("const OUTFIT_LAYERS=['upper','lower','shoes','gloves'];"));
  assert.ok(js.includes("const ACCESSORY_LAYERS=['earring','mask'];"));
  for(const id of ['showBody','showFace','showHair','showClothes','showAccessories']) assert.ok(html.includes('id="'+id+'"'));
});

test('render order keeps clothing face hair jewelry and hat compositable',()=>{
  assert.ok(js.includes("const RENDER_ORDER=['body','lower','shoes','upper','gloves','eyes','mouth','mask','hair','earring','hat'];"));
  assert.match(js,/for\(const layer of RENDER_ORDER\)/);
});

test('each active part has an asset id and grouped export folder',()=>{
  for(const id of ['bodyId','hairId','eyesId','mouthId','earringId','maskId','upperId','lowerId','shoesId','glovesId','hatId']){
    assert.ok(html.includes('id="'+id+'"'));
  }
  for(const folder of ['face/eyes','face/mouth','outfit/shoes','outfit/gloves','accessories/earring','accessories/mask','accessories/hat']){
    assert.ok(js.includes(folder));
  }
});

test('auto fit includes face accessories shoes gloves and hats',()=>{
  for(const layer of ['hair','hat','eyes','mouth','mask','earring','upper','lower','shoes','gloves']){
    assert.ok(js.includes("activeLayer==='"+layer+"'"));
  }
});

test('github starter library maps every uploaded starter asset',()=>{
  assert.ok(html.includes('id="loadStarterSet"'));
  for(const layer of ['hair','eyes','mouth','upper','lower','shoes','gloves','earring','mask','hat']){
    assert.ok(html.includes('data-layer="'+layer+'"'));
  }
  for(const file of ['hair-01_stand-01.png','eyes01.png','mouth01.png','earing01.png','mask01.png','hoodie01.png','jenas01.png','shoes01.png','gloves01.png','hat01.png']){
    assert.ok(js.includes(file));
  }
  assert.ok(js.includes("const STARTER_CORE_LAYERS=['hair','eyes','mouth','upper','lower','shoes','gloves'];"));
  assert.match(js,/async function loadStarterAsset\(/);
  assert.match(js,/async function loadStarterSet\(/);
});

test('exact 128 starter images bypass destructive repixelization',()=>{
  assert.ok(js.includes('sourceRuntimeReady=w===SIZE&&h===SIZE'));
  assert.match(js,/if\(sourceRuntimeReady\)/);
  assert.ok(js.includes('hardenAlpha(base,1)'));
});

test('a finished part can be copied to all animation frames',()=>{
  assert.ok(html.includes('id="copyLayerAllFrames"'));
  assert.match(js,/function copyLayerToAllFrames\(\)/);
  assert.match(js,/for\(const f of FRAMES\)/);
});

test('nudge arrows move an imported image before commit and a layer after commit',()=>{
  assert.ok(html.includes('id="nudgeMode"'));
  assert.match(js,/function nudgeCurrent\(dx,dy\)/);
  assert.match(js,/if\(sourceImage\)/);
  assert.ok(js.includes('stampX'));
  assert.ok(js.includes('stampY'));
});

test('old split-hair projects are migrated into the single hair layer',()=>{
  assert.ok(js.includes('src.hairBack||src.hairFront'));
  assert.ok(js.includes("layerCtx(f.id,'hair')"));
});

test('manifest records expanded part system and availability',()=>{
  assert.ok(js.includes("version:4,type:'kidscade-avatar-v3'"));
  assert.ok(js.includes('layerOrder:[...RENDER_ORDER]'));
  assert.ok(js.includes('groups:{face:[...FACE_LAYERS]'));
  assert.ok(js.includes('ids:Object.fromEntries(LAYERS.map'));
});

test('studio exports current layers composite and full zip bundle',()=>{
  for(const id of ['exportCurrent','exportComposite','exportCurrentBody','exportCurrentHair','exportManifest','exportBundle']){
    assert.ok(html.includes('id="'+id+'"'));
  }
  assert.match(js,/function buildZip\(/);
  assert.ok(js.includes('kidscade-avatar-v3-bundle.zip'));
  assert.ok(js.includes('folder={...LAYER_FOLDERS}'));
});

test('studio can preload the uploaded left-facing body draft set',()=>{
  assert.ok(html.includes('id="loadDraftBodySet"'));
  assert.ok(js.includes('DRAFT_BODY_SOURCE_SECONDS=[8,9,10,11,12,13,14]'));
  assert.match(js,/async function loadDraftBodySet\(/);
});

test('uploaded body loader resolves relative asset paths and cannot hang forever',()=>{
  assert.ok(js.includes("new URL('../assets/game/characters/'+file,window.location.href).href"));
  assert.ok(js.includes('function loadImageUrl(url,timeoutMs=10000)'));
  assert.ok(js.includes('10초 안에 이미지를 받지 못했습니다'));
});

test('studio verifies global admin before exposing production tools',()=>{
  assert.ok(js.includes('kc_teacher_admin_key'));
  assert.ok(js.includes('/api/teacher/overview'));
  assert.ok(js.includes("body.scope!=='global'"));
});

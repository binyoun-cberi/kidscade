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
  for(const frame of ['stand-01','stand-02','walk-01','walk-02','walk-03','walk-04','jump-01']) assert.match(js,new RegExp(frame));
});

test('studio exposes all requested avatar part slots',()=>{
  const buttons=[
    'layerBody','layerHair','layerEyes','layerNose','layerMouth','layerEarring','layerMask',
    'layerUpper','layerLower','layerShoes','layerGloves','layerHat'
  ];
  for(const id of buttons) assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(js,/const LAYERS=\['body','eyes','nose','mouth','mask','lower','shoes','upper','gloves','hair','earring','hat'\]/);
});

test('parts are grouped for face hair outfit and accessories',()=>{
  assert.match(js,/const FACE_LAYERS=\['eyes','nose','mouth'\]/);
  assert.match(js,/const HAIR_LAYERS=\['hair','hat'\]/);
  assert.match(js,/const OUTFIT_LAYERS=\['upper','lower','shoes','gloves'\]/);
  assert.match(js,/const ACCESSORY_LAYERS=\['earring','mask'\]/);
  for(const id of ['showBody','showFace','showHair','showClothes','showAccessories']) assert.match(html,new RegExp('id="'+id+'"'));
});

test('render order keeps clothes face hair jewelry and hat compositable',()=>{
  assert.match(js,/const RENDER_ORDER=\['body','lower','shoes','upper','gloves','eyes','nose','mouth','mask','hair','earring','hat'\]/);
  assert.match(js,/for\(const layer of RENDER_ORDER\)/);
});

test('each part has an asset id and grouped export folder',()=>{
  for(const id of ['bodyId','hairId','eyesId','noseId','mouthId','earringId','maskId','upperId','lowerId','shoesId','glovesId','hatId']){
    assert.match(html,new RegExp('id="'+id+'"'));
  }
  assert.match(js,/face\/eyes/);
  assert.match(js,/face\/nose/);
  assert.match(js,/face\/mouth/);
  assert.match(js,/outfit\/shoes/);
  assert.match(js,/outfit\/gloves/);
  assert.match(js,/accessories\/earring/);
  assert.match(js,/accessories\/mask/);
  assert.match(js,/accessories\/hat/);
});

test('auto fit includes face accessories shoes gloves and hats',()=>{
  for(const layer of ['hair','hat','eyes','nose','mouth','mask','earring','upper','lower','shoes','gloves']){
    assert.match(js,new RegExp("activeLayer==='"+layer+"'"));
  }
});

test('a finished part can be copied to all animation frames',()=>{
  assert.match(html,/id="copyLayerAllFrames"/);
  assert.match(js,/function copyLayerToAllFrames\(\)/);
  assert.match(js,/for\(const f of FRAMES\)/);
});

test('nudge arrows move an imported image before commit and a layer after commit',()=>{
  assert.match(html,/id="nudgeMode"/);
  assert.match(js,/function nudgeCurrent\(dx,dy\)/);
  assert.match(js,/if\(sourceImage\)/);
  assert.match(js,/stampX/);
  assert.match(js,/stampY/);
  assert.match(js,/clearStamp\(\);\n  afterEdit/);
});

test('old split-hair projects are migrated into the single hair layer',()=>{
  assert.match(js,/src\.hairBack\|\|src\.hairFront/);
  assert.match(js,/layerCtx\(f\.id,'hair'\)/);
});

test('manifest records expanded part system and availability',()=>{
  assert.match(js,/version:4,type:'kidscade-avatar-v3'/);
  assert.match(js,/layerOrder:\[\.\.\.RENDER_ORDER\]/);
  assert.match(js,/groups:\{face:\[\.\.\.FACE_LAYERS\]/);
  assert.match(js,/ids:Object\.fromEntries\(LAYERS\.map/);
});

test('studio exports current layers composite and full zip bundle',()=>{
  for(const id of ['exportCurrent','exportComposite','exportCurrentBody','exportCurrentHair','exportManifest','exportBundle']){
    assert.match(html,new RegExp('id="'+id+'"'));
  }
  assert.match(js,/function buildZip\(/);
  assert.match(js,/kidscade-avatar-v3-bundle\.zip/);
  assert.match(js,/folder=\{\.\.\.LAYER_FOLDERS\}/);
});

test('studio can preload the uploaded left-facing body draft set',()=>{
  assert.match(html,/id="loadDraftBodySet"/);
  assert.match(js,/DRAFT_BODY_SOURCE_SECONDS=\[8,9,10,11,12,13,14\]/);
  assert.match(js,/async function loadDraftBodySet\(/);
});

test('uploaded body loader resolves relative asset paths and cannot hang forever',()=>{
  assert.match(js,/new URL\('\.\.\/assets\/game\/characters\/'\+file,window\.location\.href\)\.href/);
  assert.match(js,/function loadImageUrl\(url,timeoutMs=10000\)/);
  assert.match(js,/10초 안에 이미지를 받지 못했습니다/);
});

test('studio verifies global admin before exposing production tools',()=>{
  assert.match(js,/kc_teacher_admin_key/);
  assert.match(js,/\/api\/teacher\/overview/);
  assert.match(js,/body\.scope!=='global'/);
});

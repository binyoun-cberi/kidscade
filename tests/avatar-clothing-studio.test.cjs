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

test('default avatar workflow uses one full hair layer',()=>{
  for(const id of ['layerBody','layerHair','layerUpper','layerLower']) assert.match(html,new RegExp('id="'+id+'"'));
  assert.doesNotMatch(html,/id="layerHairBack"/);
  assert.doesNotMatch(html,/id="layerHairFront"/);
  assert.match(js,/const LAYERS=\['body','hair','upper','lower'\]/);
  assert.match(js,/hairMode:'single'/);
  assert.match(js,/layerOrder:\['body','lower','upper','hair'\]/);
});

test('old split-hair projects are migrated into the single hair layer',()=>{
  assert.match(js,/src\.hairBack\|\|src\.hairFront/);
  assert.match(js,/layerCtx\(f\.id,'hair'\)/);
  assert.match(js,/if\(src\.hairBack\)/);
  assert.match(js,/if\(src\.hairFront\)/);
});

test('frame alignment tools support reference comparison and precise editing',()=>{
  for(const id of ['referenceFrame','showReference','showDifference','toolSelect','nudgeUp','nudgeDown','nudgeLeft','nudgeRight','alignCenter','alignGround','shrinkSelection','growSelection']){
    assert.match(html,new RegExp('id="'+id+'"'));
  }
  assert.match(js,/function drawDifferenceOverlay\(\)/);
  assert.match(js,/function moveLayerOrSelection\(/);
  assert.match(js,/function resizeSelection\(/);
});

test('nudge arrows move an imported image before commit and a layer after commit',()=>{
  assert.match(html,/id="nudgeMode"/);
  assert.match(js,/function nudgeCurrent\(dx,dy\)/);
  assert.match(js,/if\(sourceImage\)/);
  assert.match(js,/stampX/);
  assert.match(js,/stampY/);
  assert.match(js,/nudgeCurrent\(0,-1\)/);
  assert.match(js,/nudgeCurrent\(-1,0\)/);
  assert.match(js,/clearStamp\(\);\n  afterEdit/);
});

test('image importer can auto-fit and pixelize body hair and clothes',()=>{
  for(const id of ['pixelPreviewCanvas','paletteSize','pixelResolution','alphaCut','removeFlatBg','cleanupNoise','autoOutline','autoFitStamp','pixelizePreview','applyPixelized']){
    assert.match(html,new RegExp('id="'+id+'"'));
  }
  assert.match(js,/activeLayer==='hair'/);
  assert.match(js,/function hardenAlpha\(/);
  assert.match(js,/function quantizeCanvas\(/);
  assert.match(js,/function cleanupSingletons\(/);
  assert.match(js,/function addAutoOutline\(/);
});

test('studio exports single hair and full zip bundle',()=>{
  for(const id of ['exportCurrent','exportComposite','exportCurrentBody','exportCurrentHair','exportManifest','exportBundle']){
    assert.match(html,new RegExp('id="'+id+'"'));
  }
  assert.match(js,/function exportCurrentHair\(\)/);
  assert.match(js,/layerCanvas\(currentFrame,'hair'\)/);
  assert.match(js,/folder=\{body:'body',hair:'hair',upper:'upper',lower:'lower'\}/);
  assert.match(js,/kidscade-avatar-v3-bundle\.zip/);
});

test('studio can preload the uploaded left-facing body draft set',()=>{
  assert.match(html,/id="loadDraftBodySet"/);
  assert.match(js,/DRAFT_BODY_SOURCE_SECONDS=\[8,9,10,11,12,13,14\]/);
  assert.match(js,/async function loadDraftBodySet\(/);
  assert.match(js,/ROOT_X-masterCenter/);
  assert.match(js,/GROUND_Y-masterBox\.maxY/);
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

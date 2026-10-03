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
  assert.match(teacherHtml,//teacher/avatar-clothing-studio.html/);
  assert.match(teacherHtml,/아바타 제작실/);
  assert.match(teacherJs,/$('admin-tools')?.classList.toggle('hidden', globalOnlyHidden)/);
});

test('studio is fixed to real 128x128 runtime coordinates',()=>{
  assert.match(html,/canvas id="workCanvas" width="128" height="128"/);
  assert.match(js,/const SIZE=128/);
  assert.match(js,/const ROOT_X=64/);
  assert.match(js,/const GROUND_Y=118/);
  assert.match(js,/imageSmoothingEnabled=false/);
});

test('v3 frame contract uses stand 2 walk 4 and jump 1',()=>{
  assert.match(js,/stand-01/);
  assert.match(js,/stand-02/);
  assert.match(js,/length:4/);
  assert.match(js,/jump-01/);
  assert.match(js,/kind:'stand'/);
  assert.match(js,/kind:'walk'/);
  assert.match(js,/kind:'jump'/);
});

test('studio supports body hair and clothing as independent frame layers',()=>{
  for(const id of ['layerBody','layerHairBack','layerHairFront','layerUpper','layerLower']){
    assert.match(html,new RegExp('id="'+id+'"'));
  }
  assert.match(js,/const LAYERS=['body','hairBack','hairFront','upper','lower']/);
  assert.match(js,/['hairBack','body','lower','upper','hairFront']/);
});

test('frame alignment tools support reference comparison and precise editing',()=>{
  for(const id of ['referenceFrame','showReference','showDifference','toolSelect','nudgeUp','nudgeDown','nudgeLeft','nudgeRight','alignCenter','alignGround','shrinkSelection','growSelection']){
    assert.match(html,new RegExp('id="'+id+'"'));
  }
  assert.match(js,/function drawDifferenceOverlay()/);
  assert.match(js,/function moveLayerOrSelection(/);
  assert.match(js,/function resizeSelection(/);
  assert.match(js,/ROOT_X-(box.x+(box.w-1)/2)/);
  assert.match(js,/GROUND_Y-box.maxY/);
});

test('image importer can auto-fit and pixelize body hair and clothes',()=>{
  for(const id of ['pixelPreviewCanvas','paletteSize','pixelResolution','alphaCut','removeFlatBg','cleanupNoise','autoOutline','autoFitStamp','pixelizePreview','applyPixelized']){
    assert.match(html,new RegExp('id="'+id+'"'));
  }
  assert.match(js,/function refreshPreparedSource()/);
  assert.match(js,/function targetRectForLayer()/);
  assert.match(js,/activeLayer==='body'/);
  assert.match(js,/activeLayer==='hairBack'||activeLayer==='hairFront'/);
  assert.match(js,/function hardenAlpha(/);
  assert.match(js,/function quantizeCanvas(/);
  assert.match(js,/function cleanupSingletons(/);
  assert.match(js,/function addAutoOutline(/);
});

test('studio exports individual body hair composite and full zip bundle',()=>{
  for(const id of ['exportCurrent','exportComposite','exportCurrentBody','exportCurrentHair','exportManifest','exportBundle']){
    assert.match(html,new RegExp('id="'+id+'"'));
  }
  assert.match(js,/function exportCurrentBody()/);
  assert.match(js,/function exportCurrentHair()/);
  assert.match(js,/function compositeCanvas(/);
  assert.match(js,/function buildZip(/);
  assert.match(js,/kidscade-avatar-v3-bundle.zip/);
  assert.match(js,/hair/back/);
  assert.match(js,/hair/front/);
});

test('project format keeps frame layers and v3 runtime metadata',()=>{
  assert.match(js,/type:'kidscade-avatar-studio-project'/);
  assert.match(js,/mirrorRight:true/);
  assert.match(js,/mirrorForRight:true/);
  assert.match(js,/frameSets:{stand:/);
  assert.match(js,/logicalRoot:[ROOT_X,82]/);
});

test('studio verifies global admin before exposing production tools',()=>{
  assert.match(js,/kc_teacher_admin_key/);
  assert.match(js,//api/teacher/overview/);
  assert.match(js,/body.scope!=='global'/);
});

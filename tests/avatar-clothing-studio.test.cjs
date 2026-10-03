const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'teacher','avatar-clothing-studio.html'),'utf8');
const js=fs.readFileSync(path.join(root,'teacher-avatar-clothing-studio.js'),'utf8');

test('avatar studio JavaScript parses cleanly',()=>{
  assert.doesNotThrow(()=>new Function(js));
});

test('maple-style layout exposes left asset browser, right animation and correction panels',()=>{
  for(const id of ['assetCategory','assetSearch','assetGrid','frameGrid','editLayerSelect','selectedAssetList','nudgeMode']){
    assert.ok(html.includes('id="'+id+'"'));
  }
  assert.ok(html.includes('에셋 라이브러리'));
  assert.ok(html.includes('애니메이션'));
  assert.ok(html.includes('보정 도구'));
  assert.ok(html.includes('현재 착용 에셋'));
});

test('studio stays on exact 128x128 runtime coordinates',()=>{
  assert.ok(html.includes('canvas id="workCanvas" width="128" height="128"'));
  assert.ok(js.includes('const SIZE=128'));
  assert.ok(js.includes('const ROOT_X=64'));
  assert.ok(js.includes('const GROUND_Y=118'));
});

test('asset catalog registers starter parts except nose',()=>{
  for(const file of ['hair-01_stand-01.png','eyes01.png','mouth01.png','earing01.png','mask01.png','hoodie01.png','jenas01.png','shoes01.png','gloves01.png','hat01.png']){
    assert.ok(js.includes(file));
  }
  assert.ok(!js.includes("layer:'nose'"));
  assert.ok(!html.includes('noseId'));
  assert.ok(!html.includes('layerNose'));
});

test('asset browser renders image thumbnails and filters by category',()=>{
  assert.ok(js.includes('const ASSET_CATALOG=['));
  assert.ok(js.includes('const ASSET_CATEGORY_ORDER='));
  assert.match(js,/function buildAssetBrowser\(\)/);
  assert.match(js,/function renderAssetGrid\(\)/);
  assert.ok(js.includes("button.className='asset-card'"));
  assert.ok(js.includes('img.src=assetEntryUrl(item)'));
});

test('clicking an asset loads it into the selected part preview',()=>{
  assert.match(js,/async function loadCatalogAsset\(/);
  assert.ok(js.includes("button.addEventListener('click',()=>loadCatalogAsset(item"));
  assert.ok(js.includes('pendingCatalogAsset='));
});

test('current equipped asset list shows previews and remove actions',()=>{
  assert.match(js,/function renderSelectedAssetList\(\)/);
  assert.ok(js.includes("className='selected-row'"));
  assert.ok(js.includes("querySelector('.selected-remove')"));
  assert.ok(js.includes('setAssetMeta(currentFrame,row.layer,null)'));
});

test('selected asset metadata follows frame copy operations',()=>{
  assert.ok(js.includes('setAssetMeta(f.id,activeLayer,assetMeta(currentFrame,activeLayer))'));
  assert.ok(js.includes('setAssetMeta(currentFrame,activeLayer,assetMeta(prev,activeLayer))'));
});

test('project save persists selected asset metadata',()=>{
  assert.ok(js.includes('selectedAssets:Object.fromEntries'));
  assert.ok(js.includes('project.selectedAssets'));
});

test('animation contract remains stand 2 walk 4 jump 1',()=>{
  for(const frame of ['stand-01','stand-02','walk-01','walk-02','walk-03','walk-04','jump-01']) assert.ok(js.includes(frame));
});

test('nudge and drawing controls remain available',()=>{
  for(const id of ['nudgeUp','nudgeDown','nudgeLeft','nudgeRight','toolPencil','toolErase','toolSelect','undo','redo']){
    assert.ok(html.includes('id="'+id+'"'));
  }
  assert.match(js,/function nudgeCurrent\(dx,dy\)/);
});

test('studio exports runtime bundle',()=>{
  for(const id of ['exportCurrent','exportComposite','exportManifest','exportBundle']){
    assert.ok(html.includes('id="'+id+'"'));
  }
  assert.ok(js.includes('kidscade-avatar-v3-bundle.zip'));
});

test('studio verifies global admin',()=>{
  assert.ok(js.includes('kc_teacher_admin_key'));
  assert.ok(js.includes('/api/teacher/overview'));
  assert.ok(js.includes("body.scope!=='global'"));
});

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

test('BODY is protected from accidental deletion and missing frames are repaired',()=>{
  assert.ok(js.includes("const bodySafetySnapshots=new Map()"));
  assert.ok(js.includes("const protectedBody=row.layer==='body'"));
  assert.ok(js.includes("if(activeLayer==='body')return setStatus('BODY는 아바타의 기준 바디라 비울 수 없습니다."));
  assert.ok(js.includes("for(const layer of LAYERS)if(layer!=='body')"));
  assert.match(js,/async function repairMissingBodyFrames\(/);
  assert.ok(js.includes("else if(missingBodyFrames().length)await repairMissingBodyFrames(false)"));
  assert.ok(js.includes("BODY가 완전히 사라지는 편집을 안전장치가 되돌렸습니다."));
});

test('BODY reference JSON exports exact pixels for asset generation',()=>{
  assert.ok(html.includes('id="exportBodyReference"'));
  assert.match(js,/function buildBodyReferenceAnalysis\(\)/);
  assert.match(js,/function exportBodyReferenceFile\(\)/);
  assert.ok(js.includes("type:'kidscade-avatar-body-reference'"));
  assert.ok(js.includes('alphaRuns:alphaRunsOfCanvas(body,1)'));
  assert.ok(js.includes('pixels:sparsePixelsOfCanvas(body,1)'));
  assert.ok(js.includes('assetGenerationContract:{'));
  assert.ok(js.includes("bodyIsReferenceOnly:true"));
});

test('pending asset preview cannot leak into another layer or frame',()=>{
  assert.ok(js.includes('let catalogLoadToken=0'));
  assert.ok(js.includes("if(layer!==activeLayer&&(sourceImage||pendingCatalogAsset))clearStamp()"));
  assert.ok(js.includes("if(id!==currentFrame&&(sourceImage||pendingCatalogAsset))clearStamp()"));
  assert.ok(js.includes("if(loadToken!==catalogLoadToken||activeLayer!==layer||currentFrame!=='stand-01')return false"));
  assert.ok(js.includes('catalogLoadToken++;'));
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

test('whole-part pixel scaling controls resize the active layer with nearest-neighbor rendering',()=>{
  for(const id of ['partSizeStatus','scalePartDown1','scalePartUp1','scalePartDown5','scalePartUp5','scalePartWidthDown','scalePartWidthUp','scalePartHeightDown','scalePartHeightUp']){
    assert.ok(html.includes('id="'+id+'"'));
  }
  assert.match(js,/function resizeActiveLayer\(/);
  assert.match(js,/function partScaleAnchor\(/);
  assert.match(js,/function refreshPartSizeStatus\(/);
  assert.ok(js.includes("const bottomAnchored=['body','lower','shoes'].includes(layer)"));
  assert.ok(js.includes('c.imageSmoothingEnabled=false'));
  assert.ok(js.includes("resizeActiveLayer({uniformPixels:-1})"));
  assert.ok(js.includes("resizeActiveLayer({factor:1.05})"));
  assert.ok(js.includes("resizeActiveLayer({dw:-1})"));
  assert.ok(js.includes("resizeActiveLayer({dh:1})"));
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


test('single focus toggle switches between all parts and body plus active part',()=>{
  assert.ok(html.includes('id="focusPartToggle"'));
  assert.ok(html.includes('선택 파츠만 보기'));
  assert.ok(js.includes('let focusPartOnly=false'));
  assert.match(js,/function toggleFocusPart\(\)/);
  assert.ok(js.includes("button.textContent=focusPartOnly?'모든 파츠 보기':'선택 파츠만 보기'"));
  assert.ok(js.includes("const focusVisible=!focusPartOnly||layer==='body'||layer===activeLayer"));
});


test('studio exports an AI-readable analysis file for the active part',()=>{
  assert.ok(html.includes('id="exportPartAnalysis"'));
  assert.ok(js.includes("type:'kidscade-avatar-part-analysis'"));
  assert.match(js,/function buildPartAnalysis\(/);
  assert.match(js,/function sparsePixelsOfCanvas\(/);
  assert.match(js,/function alphaRunsOfCanvas\(/);
  assert.match(js,/function canvasMetrics\(/);
  assert.ok(js.includes("adjustmentContract:{"));
  assert.ok(js.includes("type:'kidscade-avatar-part-adjustment'"));
});

test('studio imports AI adjustment JSON with frame operations',()=>{
  assert.ok(html.includes('id="importPartAdjustment"'));
  assert.match(js,/function validateAdjustmentFile\(/);
  assert.match(js,/async function applyPartAdjustment\(/);
  for(const op of ['translate','moveRect','setPixels','replacePixels']) assert.ok(js.includes("'"+op+"'"));
  assert.match(js,/function snapshotFrameLayer\(/);
  assert.match(js,/function shiftLayerFrame\(/);
  assert.match(js,/function moveRectOnFrame\(/);
  assert.match(js,/function applyPixelTuples\(/);
});

test('AI adjustment exchange validates 128x128 target and checksums',()=>{
  assert.ok(js.includes("data.target?.canvas"));
  assert.ok(js.includes('canvasChecksum(layerCanvas(frameId,layer))'));
  assert.ok(js.includes('baseChecksum'));
  assert.ok(html.includes('id="adjustmentSummary"'));
});


test('studio exports whole-avatar analysis JSON with every frame and layer',()=>{
  assert.ok(html.includes('id="exportFullAnalysis"'));
  assert.ok(js.includes("type:'kidscade-avatar-full-analysis'"));
  assert.match(js,/function buildFullAnalysis\(\)/);
  assert.ok(js.includes('layers[layer]={'));
  assert.ok(js.includes('pixels:sparsePixelsOfCanvas(c,1)'));
  assert.ok(js.includes('frameOrder:FRAMES.map'));
  assert.ok(js.includes('layerOrder:[...RENDER_ORDER]'));
});

test('whole-avatar analysis includes body skin exposure diagnostics',()=>{
  assert.match(js,/function bodyExposureDiagnostics\(frameId\)/);
  assert.ok(js.includes("const GARMENT_COVER_LAYERS=['upper','lower','shoes','gloves']"));
  assert.match(js,/function isSkinColorCandidate\(/);
  assert.ok(js.includes('visibleSkinCandidatePixels'));
  assert.ok(js.includes('garmentEdgeSkinCandidatePixels'));
  assert.ok(js.includes('visibleSkinComponents'));
  assert.ok(js.includes('garmentEdgeSkinComponents'));
  assert.ok(js.includes('coverageByGarment'));
});

test('studio imports whole-avatar AI adjustment JSON across frame-layer pairs',()=>{
  assert.ok(html.includes('id="importFullAdjustment"'));
  assert.ok(js.includes("type!=='kidscade-avatar-full-adjustment'"));
  assert.match(js,/function validateFullAdjustmentFile\(/);
  assert.match(js,/function applyLayerAdjustmentPlan\(/);
  assert.match(js,/async function applyFullAdjustment\(/);
  assert.ok(js.includes('framePlan.layers'));
  assert.ok(js.includes('baseChecksum'));
});

test('whole adjustment contract supports translate rectangle moves and pixel patches',()=>{
  for(const op of ['translate','moveRect','setPixels','replacePixels']) assert.ok(js.includes("'"+op+"'"));
  assert.ok(js.includes("Do not modify BODY merely to hide clothing leaks"));
  assert.ok(js.includes("Use exposure diagnostics only as hints"));
});

#!/usr/bin/env node
'use strict';

// Deterministic real-WebGL Chibi visual audit. Uses the same installed Chrome
// approach as Word Siege; no server credentials and no authentication bypass
// are shipped to the live application.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const http=require('node:http');
const cp=require('node:child_process');
const sharp=require('sharp');
const {once}=require('node:events');

const ROOT=path.resolve(__dirname,'..');
const OUT=path.resolve(process.env.KIDSCADE_CHIBI_AUDIT_OUT||path.join(os.tmpdir(),'kidscade-chibi-visual-audit'));
const CHROME=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser']
  .find(p=>fs.existsSync(p));
if(!CHROME)throw Error('Chrome/Chromium required for Chibi WebGL audit');
fs.mkdirSync(OUT,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.glb':'model/gltf-binary',
  '.gltf':'model/gltf+json','.json':'application/json','.png':'image/png','.webp':'image/webp'};
const server=http.createServer((req,res)=>{
  const uri=new URL(req.url,'http://localhost');
  const file=path.resolve(ROOT,'.'+decodeURIComponent(uri.pathname));
  if(file!==ROOT&&!file.startsWith(ROOT+path.sep)){res.writeHead(403);res.end();return;}
  fs.readFile(file,(err,bytes)=>{
    if(err){res.writeHead(404);res.end('Not found: '+uri.pathname);return;}
    res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});
    res.end(bytes);
  });
});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let chrome,ws,userDir;
const errors=[];
(async()=>{
  server.listen(0,'127.0.0.1');
  await once(server,'listening');
  userDir=fs.mkdtempSync(path.join(os.tmpdir(),'kidscade-chibi-cdp-'));
  chrome=cp.spawn(CHROME,[
    '--headless=new','--no-sandbox','--disable-dev-shm-usage',
    '--use-angle=swiftshader','--enable-unsafe-swiftshader','--remote-allow-origins=*',
    '--disable-background-networking','--no-first-run','--remote-debugging-port=0',
    '--user-data-dir='+userDir,'about:blank'
  ],{stdio:['ignore','ignore','pipe']});
  let stderr='';
  chrome.stderr.on('data',data=>{stderr+=String(data).slice(0,1000);stderr=stderr.slice(-4000);});
  let target=null;
  for(let n=0;n<300;n++){
    if(chrome.exitCode!==null)throw Error('Chrome exited: '+stderr);
    const file=path.join(userDir,'DevToolsActivePort');
    if(fs.existsSync(file)){
      const port=Number(fs.readFileSync(file,'utf8').split(/\r?\n/)[0]);
      if(port)try{
        const all=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
        target=all.find(x=>x.type==='page');
      }catch{}
      if(target)break;
    }
    await sleep(100);
  }
  if(!target)throw Error('Chrome DevTools did not become ready: '+stderr);
  ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
  const pending=new Map();let nextId=0;
  ws.onmessage=event=>{
    const message=JSON.parse(event.data);
    if(message.method==='Runtime.exceptionThrown')errors.push(message.params?.exceptionDetails?.text||'Browser exception');
    if(!message.id)return;
    const task=pending.get(message.id);
    if(!task)return;
    pending.delete(message.id);
    if(message.error)task.reject(Error(message.error.message));
    else task.resolve(message.result||{});
  };
  const send=(method,params={})=>new Promise((resolve,reject)=>{
    const id=++nextId;
    pending.set(id,{resolve,reject});
    ws.send(JSON.stringify({id,method,params}));
  });
  const evalPage=async expression=>{
    const reply=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(reply.exceptionDetails)throw Error(JSON.stringify(reply.exceptionDetails).slice(0,1000));
    return reply.result?.value;
  };
  await send('Page.enable');await send('Runtime.enable');
  // Only the local test browser mocks the overview response, and only for this
  // exact authorization endpoint. No credentials leak into files/screenshots.
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`(()=>{
    try{sessionStorage.setItem('kc_teacher_admin_key','LOCAL_CHIBI_BROWSER_AUDIT');}catch(e){}
    const realFetch=window.fetch.bind(window);
    window.fetch=(input,init)=>{
      const url=new URL(typeof input==='string'?input:input.url,location.href);
      if(url.pathname==='/api/teacher/overview'){
        return Promise.resolve(new Response(JSON.stringify({ok:true,scope:'global'}),{
          status:200,headers:{'content-type':'application/json'}
        }));
      }
      return realFetch(input,init);
    };
  })();`});
  const origin='http://127.0.0.1:'+server.address().port;
  await send('Emulation.setDeviceMetricsOverride',{width:1024,height:900,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:origin+'/teacher/character-3d-studio.html?audit=1'});
  let ready=false,detail='';
  for(let n=0;n<260;n++){
    const status=await evalPage(`(()=>({
      ready:!!window.__kc3dAudit?.ready,
      status:document.getElementById('chibiAssetStatus')?.textContent||'',
      assetError:document.getElementById('assetMissing')?.textContent||'',
      gate:document.getElementById('gateText')?.textContent||''
    }))()`);
    ready=status.ready;
    detail=status.status+' / '+status.assetError+' / '+status.gate;
    if(ready)break;
    if(/로드 실패|생성에 실패|열 수 없|찾지 못|WebGL/.test(detail))break;
    await sleep(100);
  }
  assert.ok(ready,'Chibi WebGL never became ready: '+detail+' / '+errors.join('; '));
  const clipNames=await evalPage('window.__kc3dAudit.clips.map(x=>x.label)');
  for(const name of ['IDLE','WALK','RUN','JUMP'])assert.ok(clipNames.includes(name),'Missing '+name+' clip');

  const report={version:'chibi-v5.2',source:'Styloo Chibi real GLB in local Chrome',cases:[],warnings:[]};
  // Test actual GLB mesh availability, geometry variation and one-visible-hair
  // invariant for each gender-fit tab rather than just counting HTML options.
  const catalog=JSON.parse(fs.readFileSync(path.join(ROOT,'chibi/asset-manifest.json'),'utf8'))
    .wardrobeLibrary.hairStyles;
  report.hairPack={counts:{male:catalog.male.length,female:catalog.female.length},variants:[]};
  for(const [fit,names] of Object.entries(catalog)){
    const changed=await evalPage("(()=>{document.querySelector('[data-body-fit=\\\""+fit+"\\\"]').click();return {fit:document.querySelector('[data-body-fit=\\\""+fit+"\\\"]').classList.contains('active'),choices:[...document.querySelector('#chibiHair').options].map(x=>x.value)}})()");
    assert.ok(changed.fit,'Body tab inactive: '+fit);
    assert.deepEqual(changed.choices.slice(1),names,'Wrong hairstyle order: '+fit);
    const geometry=await evalPage('window.__kc3dAudit.hairCatalog()');
    for(const name of names){
      const mesh=geometry.find(entry=>entry.name===name);
      assert.ok(mesh?.available&&mesh?.vertices>100,'Hair mesh absent: '+name);
      assert.equal(mesh.fit,fit,'Hair fit mismatch: '+name);
      const expr="(()=>{const select=document.querySelector('#chibiHair');select.value="+JSON.stringify(name)+";select.dispatchEvent(new Event('change',{bubbles:true}));return {choice:select.value,visible:window.__kc3dAudit.hairCatalog().filter(x=>x.visible).map(x=>x.name)}})()";
      const state=await evalPage(expr);
      assert.equal(state.choice,name,'Hair selector did not change');
      assert.deepEqual(state.visible,[name],'Overlapping hair meshes: '+fit+'/'+name);
      report.hairPack.variants.push({name,fit,vertices:mesh.vertices,fingerprint:mesh.fingerprint});
    }
  }
  assert.equal(new Set(report.hairPack.variants.map(x=>x.fingerprint)).size,16,
    'Not all hairstyle choices have distinct 3D geometry');
  await evalPage("document.querySelector('[data-body-fit=\\\"male\\\"]').click()");

  const sample=async(clip,view,phase,prefix)=>{
    const pose=await evalPage('window.__kc3dAudit.sample('+JSON.stringify(clip)+','+
      JSON.stringify(view)+','+phase+')');
    assert.equal(pose.skeletonBones,78,'Unexpected skeleton bones');
    assert.ok(pose.triangles>1000,'Character geometry missing');
    const rect=await evalPage(`(()=>{
      const r=document.getElementById('view').getBoundingClientRect();
      return {x:r.left+scrollX,y:r.top+scrollY,width:r.width,height:r.height};
    })()`);
    const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,
      clip:{x:rect.x,y:rect.y,width:rect.width,height:rect.height,scale:1}});
    const bytes=Buffer.from(shot.data,'base64');
    assert.ok(bytes.length>4000,'Empty screenshot '+clip+'/'+view+'/'+phase);
    const file=prefix+'-'+clip.toLowerCase()+'-'+view+'-'+Math.round(phase*100)+'.png';
    fs.writeFileSync(path.join(OUT,file),bytes);
    const statistics=await sharp(bytes).stats();
    assert.ok(statistics.channels.some(x=>x.stdev>12),'Unrendered canvas: '+file);
    report.cases.push({...pose,image:file,imageBytes:bytes.length});
    return pose;
  };
  for(const clip of ['WALK','RUN']){
    for(const view of ['front','side']){
      for(const phase of [0,.25,.5,.75])await sample(clip,view,phase,'desktop');
    }
  }


  // Reproduce the user's exposed temple while the head turns during WALK/RUN.
  // The right-hand side silhouette can look continuous in IDLE but crack in
  // animated poses; cover side + 45deg and both halves of the movement cycle.
  report.templeAudit={version:'v7',cases:[],counts:{}};
  const templeCatalog=JSON.parse(fs.readFileSync(path.join(ROOT,'chibi/asset-manifest.json'),'utf8'))
    .wardrobeLibrary.hairStyles.male;
  await evalPage("document.querySelector('[data-body-fit=\"male\"]').click()");
  const baseTemples=await evalPage("window.__kc3dAudit.hairCatalog().find(x=>x.name==='kidscade_male_hair_short')");
  assert.ok(baseTemples?.preservedTempleTriangles>0,
    'Source temple geometry has no preserved exterior eye-level triangles');
  assert.ok(baseTemples.preservedTempleTriangles<100,
    'Temple fix brought back too many long bob side faces');
  assert.ok(baseTemples?.removedEyeLevelTriangles>0,
    'Central eye-overhang crop stopped functioning');
  report.templeAudit.counts={
    preservedSideTriangles:baseTemples.preservedTempleTriangles,
    trimmedFrontTriangles:baseTemples.removedEyeLevelTriangles
  };
  for(const name of templeCatalog){
    const state=await evalPage("(()=>{const el=document.getElementById('chibiHair');el.value="+
      JSON.stringify(name)+";el.dispatchEvent(new Event('change',{bubbles:true}));"+
      "return window.__kc3dAudit.hairCatalog().find(x=>x.name==="+JSON.stringify(name)+")})()");
    assert.ok(state?.visible&&state?.preservedTempleTriangles===baseTemples.preservedTempleTriangles,
      'Male hair lost the v7 temple polygon repair: '+name);
    for(const clip of ['WALK','RUN']){
      for(const [view,fraction] of [['side',.25],['side',.75],['threeQuarter',.5]]){
        const pose=await sample(clip,view,fraction,'temple-'+name);
        assert.ok(pose.selectedParts.includes(name),'Missing hairstyle in animated frame '+name);
        report.templeAudit.cases.push({name,clip,view,fraction});
      }
    }
  }
  // Existing full-body samples use male default after this focused audit.
  await evalPage("document.querySelector('[data-body-fit=\"male\"]').click()");

  await sample('IDLE','side',0,'male-hair');
  await evalPage("(()=>{const select=document.querySelector('#chibiHair');select.value='kidscade_male_hair_swept';select.dispatchEvent(new Event('change',{bubbles:true}))})()");
  await sample('IDLE','side',0,'male-hair-swept');
  await evalPage("(()=>{document.querySelector('[data-body-fit=\\\"female\\\"]').click();const select=document.querySelector('#chibiHair');select.value='chibi_female_hair_layered';select.dispatchEvent(new Event('change',{bubbles:true}))})()");
  await sample('IDLE','side',0,'female-hair-layered');
  await evalPage("document.querySelector('[data-body-fit=\\\"male\\\"]').click()");
  await sample('IDLE','threeQuarter',0,'desktop');
  await sample('IDLE','side',0,'desktop');
  await sample('JUMP','side',.5,'desktop');


  // Outfit pack: exercise every body-fit/category garment, collect animated
  // bone-deformed clearance samples, and capture a real WebGL preview.
  const outfits=JSON.parse(fs.readFileSync(path.join(ROOT,'chibi/asset-manifest.json'),'utf8'))
    .outfitLibrary;
  report.outfitPack={styles:[],roundtrip:[],notes:[]};
  const setFit=fit=>evalPage("document.querySelector('[data-body-fit="+JSON.stringify(fit)+"]').click()");
  const selectGarment=(category,name)=>evalPage("(()=>{"+
    "document.querySelector('[data-wardrobe-category="+JSON.stringify(category)+"]').click();"+
    "const input=document.querySelector('[data-chibi-part="+JSON.stringify(name)+"]');"+
    "if(!input)return {error:'Missing garment input'};"+
    "input.checked=true;input.dispatchEvent(new Event('change',{bubbles:true}));"+
    "return {name:input.dataset.chibiPart,checked:input.checked,"+
      "visible:window.__kc3dAudit.outfitCatalog().filter(x=>x.visible&&x.category==="+JSON.stringify(category)+").map(x=>x.name)};"+
    "})()");
  const catalog3d=await evalPage('window.__kc3dAudit.outfitCatalog()');
  assert.equal(catalog3d.length,20,'Must have exactly 20 catalogued top/bottom styles');
  const newStyles=catalog3d.filter(x=>x.name.startsWith('chibi_'));
  assert.equal(newStyles.length,15,'Must have 15 new generated styles');
  assert.equal(new Set(newStyles.map(x=>x.fingerprint)).size,15,
    'New garments do not all have distinct skinned-shell geometry');
  for(const name of ['chibi_male_hoodie','chibi_male_bomber','chibi_male_varsity','chibi_male_oxford','chibi_male_sweater','chibi_female_cardigan','chibi_female_knit','chibi_female_jacket']){
    const style=catalog3d.find(x=>x.name===name);
    assert.ok(style?.extras>=4,'Long sleeves missing from outerwear style: '+name);
  }
  assert.ok(catalog3d.find(x=>x.name==='chibi_female_blouse')?.extras>=6,
    'Blouse missing modeled puff sleeves');
  for(const name of ['chibi_male_jeans','chibi_male_joggers','chibi_male_chinos','chibi_female_jeans','chibi_female_widepants']){
    const style=catalog3d.find(x=>x.name===name);
    assert.ok(style?.extras>=3,'Trousers must have separate left and right skinned leg meshes: '+name);
  }

  for(const fit of ['male','female']){
    await setFit(fit);
    for(const category of ['top','bottom']){
      const names=outfits[fit][category];
      assert.equal(names.length,category==='top'?6:4,'Wrong style count for '+fit+'/'+category);
      for(const name of names){
        const expected=catalog3d.find(x=>x.name===name);
        assert.ok(expected?.available&&expected.vertices>100,'Missing rigged shell '+name);
        assert.equal(expected.rigBones,78,'Bad skeleton on '+name);
        const choice=await selectGarment(category,name);
        assert.equal(choice.name,name,'Garment checkbox missing: '+name);
        assert.equal(choice.checked,true);
        assert.deepEqual(choice.visible,[name],'Multiple '+category+' pieces visible: '+name);
        const motion=[];
        for(const clip of ['WALK','RUN']){
          await evalPage("window.__kc3dAudit.sample("+JSON.stringify(clip)+",'side',0.25)");
          const proximity=await evalPage('window.__kc3dAudit.garmentSurvey()');
          const row=proximity.find(x=>x.name===name);
          assert.ok(row&&row.tested>0,'No animated garment surface samples for '+name+'/'+clip);
          motion.push({clip,...row});
        }
        await sample('IDLE','threeQuarter',0,'outfit-'+name);
        report.outfitPack.styles.push({name,fit,category,vertices:expected.vertices,
          fingerprint:expected.fingerprint,extraMeshes:expected.extras,motion});
      }
    }
  }
  // Re-import the generated binary GLB. Checking the file header alone is not
  // enough: verify named garments, rigged meshes, and 11 animation clips.
  for(const [fit,top,bottom] of [
    ['male','chibi_male_bomber','chibi_male_joggers'],
    ['female','chibi_female_jacket','chibi_female_widepants']
  ]){
    await setFit(fit);
    await selectGarment('top',top);
    await selectGarment('bottom',bottom);
    for(const clip of ['WALK','RUN']){
      for(const view of ['front','side']){
        await sample(clip,view,.25,'motion-'+fit+'-'+top+'-'+bottom);
      }
    }
    const exported=await evalPage('window.__kc3dAudit.roundtripExport()');
    assert.ok(exported.bytes>30000,'Empty GLB '+fit);
    assert.equal(exported.clips.length,11,'Animation clips missing in GLB '+fit);
    assert.ok(exported.skins.some(x=>x.name===top+'_shell'&&x.bones===78),
      'Exported upper garment lost its skin rig: '+top);
    assert.ok(exported.skins.some(x=>x.name===bottom+'_shell'&&x.bones===78),
      'Exported lower garment lost its skin rig: '+bottom);
    if(bottom.includes('joggers')||bottom.includes('widepants')){
      for(const side of ['left','right'])assert.ok(
        exported.skins.some(x=>x.name===bottom+'_leg_'+side&&x.bones===78),
        'Articulated GLB trouser '+side+' leg missing: '+bottom);
    }
    report.outfitPack.roundtrip.push({fit,top,bottom,bytes:exported.bytes,
      clips:exported.clips,riggedPieces:exported.skins.length});
  }
  await setFit('male');
  report.outfitPack.notes.push('Animated-pose proximity is a diagnostic, not definitive triangle-mesh penetration certification.');
  const allMotion=report.outfitPack.styles.flatMap(style=>style.motion);
  const nearCount=allMotion.reduce((sum,row)=>sum+row.closeSurfaceSamples,0);
  const testedCount=allMotion.reduce((sum,row)=>sum+row.tested,0);
  console.log('CHIBI_OUTFIT_AUDIT '+JSON.stringify({styles:report.outfitPack.styles.length,
    exportedGlbs:report.outfitPack.roundtrip.length,nearSamples:nearCount,
    testedSamples:testedCount,nearRatio:Number((nearCount/Math.max(testedCount,1)).toFixed(4)),
    caveat:'proximity is not proof of zero intersection'}));


  // Chibi v5.3 — test actual 3D accessories, not just UI labels.
  const accessoryManifest=JSON.parse(fs.readFileSync(path.join(ROOT,'chibi/asset-manifest.json'),'utf8')).accessoryLibrary;
  assert.equal(accessoryManifest.count,22);
  const accessories=await evalPage('window.__kc3dAudit.accessoryCatalog()');
  assert.equal(accessories.length,22,'Missing Chibi v5.3 accessory entries');
  assert.equal(new Set(accessories.map(x=>x.fingerprint)).size,22,'Accessories share duplicate geometry');
  report.accessoryPack={styles:[],roundtrip:[],thumbnailReady:{}};
  await setFit('male');
  const chooseAccessory=(category,name)=>evalPage("(()=>{"+
    "document.querySelector('[data-wardrobe-category="+JSON.stringify(category)+"]').click();"+
    "const input=document.querySelector('[data-chibi-part="+JSON.stringify(name)+"]');"+
    "if(!input)return {missing:true};"+
    "input.checked=true;input.dispatchEvent(new Event('change',{bubbles:true}));"+
    "const catalog=window.__kc3dAudit.accessoryCatalog();"+
    "return {checked:input.checked,name:input.dataset.chibiPart,"+
    "active:catalog.filter(x=>x.visible).map(x=>({name:x.id,slot:x.slot}))};"+
    "})()");
  for(const item of accessories){
    assert.ok(item.meshCount>=1&&item.vertices>60,'Accessory geometry absent: '+item.id);
    assert.ok(item.skins.every(skin=>skin.bones===78),'Accessory rig mismatch: '+item.id);
    const selected=await chooseAccessory(item.category,item.id);
    assert.equal(selected.name,item.id,'Accessory picker missing '+item.id);
    assert.ok(selected.checked,'Accessory checkbox not selected '+item.id);
    assert.deepEqual(selected.active.filter(x=>x.slot===item.slot).map(x=>x.name),[item.id],
      'Accessory slot overlap: '+item.id);
    const shot=await sample('WALK','threeQuarter',.25,'v53-'+item.id);
    assert.ok(shot.selectedParts.includes(item.id),'Accessory not in rendered pose: '+item.id);
    report.accessoryPack.styles.push({id:item.id,slot:item.slot,skins:item.skins.length,
      vertices:item.vertices,fingerprint:item.fingerprint});
  }

  // Chibi v5.3.1: ensure touching shoes/hat/bag does not stack old geometry,
  // and that crown reduction is reversible (original hair remains intact).
  report.accessoryPack.fitAndCollision={};
  await setFit('male');
  await chooseAccessory('accessory','chibi_hat_baseball');
  const withCap=await evalPage('window.__kc3dAudit.equipmentAudit()');
  assert.ok(withCap.hair.length===1&&withCap.hair[0].hatSafe,
    'Cap did not activate reversible HAT-SAFE hair geometry');
  assert.ok(Object.values(withCap.visibleSlots).every(names=>names.length<=1),
    'Slots overlap after wearing cap');
  await sample('WALK','side',.5,'v53-fit-hat-safe');
  await chooseAccessory('accessory','chibi_gear_headphones');
  const withHeadphones=await evalPage('window.__kc3dAudit.equipmentAudit()');
  assert.ok(!withHeadphones.hair[0].hatSafe,
    'HAT-SAFE geometry remained after removing hat for headphones');
  assert.deepEqual(withHeadphones.visibleSlots.hat,['chibi_gear_headphones']);
  await chooseAccessory('shoes','chibi_shoe_boots');
  const bootFit=await evalPage('window.__kc3dAudit.equipmentAudit()');
  assert.deepEqual(bootFit.visibleSlots.shoes,['chibi_shoe_boots'],
    'Legacy shoes show through selected boots');
  await selectGarment('top','chibi_male_bomber');
  await chooseAccessory('accessory','chibi_bag_school');
  const bomberFit=await evalPage('window.__kc3dAudit.equipmentAudit()');
  const bomberBag=bomberFit.accessories.find(x=>x.id==='chibi_bag_school');
  assert.ok(bomberBag&&bomberBag.topName==='chibi_male_bomber',
    'Backpack did not adjust to bulky jacket');
  await selectGarment('top','kidscade_male_tshirt');
  const shirtFit=await evalPage('window.__kc3dAudit.equipmentAudit()');
  const shirtBag=shirtFit.accessories.find(x=>x.id==='chibi_bag_school');
  assert.ok(shirtBag&&bomberBag.offset[2]<shirtBag.offset[2],
    'Backpack did not release jacket clearance');
  await setFit('female');
  await chooseAccessory('accessory','chibi_bag_school');
  const femaleFit=await evalPage('window.__kc3dAudit.equipmentAudit()');
  const femaleBag=femaleFit.accessories.find(x=>x.id==='chibi_bag_school');
  assert.ok(femaleBag&&femaleBag.scale!==bomberBag.scale,
    'Female body has no separate accessory fit');
  assert.ok(Object.values(femaleFit.visibleSlots).every(names=>names.length<=1),
    'Female body has clashing legacy/accessory slots');
  report.accessoryPack.fitAndCollision={
    maleWithHat:withCap.hair,maleWithHeadphones:withHeadphones.hair,
    boots:bootFit.visibleSlots.shoes,
    jacketBag:bomberBag.offset,shirtBag:shirtBag.offset,
    femaleBag:femaleBag.offset
  };
  await setFit('male');

  for(const [fit,accessoryIds] of [
    ['male',['chibi_shoe_hightop','chibi_hat_baseball','chibi_face_round','chibi_bag_school','chibi_gear_watch','chibi_gear_scarf']],
    ['female',['chibi_shoe_boots','chibi_hat_beret','chibi_face_sunglasses','chibi_bag_mini','chibi_gear_watch','chibi_gear_scarf']]
  ]){
    await setFit(fit);
    for(const id of accessoryIds){
      const item=accessories.find(x=>x.id===id);
      await chooseAccessory(item.category,id);
    }
    for(const clip of ['WALK','RUN'])await sample(clip,'side',.25,'v53-equipped-'+fit);
    const glb=await evalPage('window.__kc3dAudit.roundtripExport()');
    assert.equal(glb.clips.length,11,'v5.3 GLB lost animation clips: '+fit);
    for(const id of accessoryIds){
      assert.ok(glb.partNames.includes(id),'GLB selection missing '+id);
      assert.ok(glb.skins.some(x=>x.name===id+'_shell'&&x.bones===78),
        'GLB missing rigged accessory shell: '+id);
    }
    report.accessoryPack.roundtrip.push({fit,bytes:glb.bytes,accessoryIds,skins:glb.skins.length,clips:glb.clips.length});
  }
  await evalPage("document.querySelector('[data-wardrobe-category=\"accessory\"]').click()");
  await sleep(1000);
  const previews=await evalPage('window.__kc3dAudit.accessoryThumbStatus()');
  assert.ok(previews.tiles.length>=16,'Accessory thumb picker not rendered');
  assert.ok(previews.tiles.filter(x=>x.hasCache).length>=16,'Accessory thumbnails did not render');
  // Hash the whole image rather than comparing one center pixel, which can
  // be the same pale background across otherwise distinct 3D assets.
  const thumbExpr="(()=>{const canvases=[...document.querySelectorAll('[data-part-thumb]')];return canvases.map(c=>{const pixels=c.getContext('2d').getImageData(0,0,112,112).data;let hash=2166136261,contrasting=0;for(let i=0;i<pixels.length;i+=16){hash=Math.imul(hash^pixels[i],16777619);hash=Math.imul(hash^pixels[i+1],16777619);hash=Math.imul(hash^pixels[i+2],16777619);if(pixels[i]<160||pixels[i+1]<160||pixels[i+2]<160)contrasting++}return {name:c.dataset.partThumb,hash:hash>>>0,contrasting,png:c.toDataURL('image/png')}})})()";
  const thumbValues=await evalPage(thumbExpr);
  for(const thumb of thumbValues){
    fs.writeFileSync(path.join(OUT,'v53-thumb-'+thumb.name+'.png'),
      Buffer.from(thumb.png.split(',')[1],'base64'));
  }
  assert.ok(new Set(thumbValues.map(x=>x.hash)).size>=8,
    '3D preview tile whole-image hashes do not vary between different assets');
  assert.ok(thumbValues.filter(x=>x.contrasting>15).length>=8,
    '3D thumbnails appear empty, not just uniform background');
  report.accessoryPack.thumbnailReady={count:previews.tiles.length,
    cached:previews.tiles.filter(x=>x.hasCache).length,
    wholeImageHashes:thumbValues.map(({name,hash,contrasting})=>({name,hash,contrasting}))};

  // Collect joint trajectories as evidence, but do not claim automatic
  // foot-ground/contact correctness based on bone-pivot height alone.
  for(const clip of ['WALK','RUN']){
    const frames=report.cases.filter(x=>x.clip.toLowerCase().includes(clip.toLowerCase())&&x.view==='side');
    report.warnings.push(clip+': '+frames.length+' side-view joint snapshots captured; foot sliding and clothing intersections require human review.');
  }

  // Phone quick controls must be visible and usable with a narrow viewport.
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await evalPage('window.dispatchEvent(new Event("resize"))');
  await sleep(150);
  const phone=await evalPage(`(()=>{
    const canvas=document.getElementById('view').getBoundingClientRect();
    const panel=document.querySelector('.quick-controls').getBoundingClientRect();
    const buttons=[...document.querySelectorAll('[data-quick-clip],[data-quick-view],[data-quick-speed]')];
    return {canvasWidth:canvas.width,panelWidth:panel.width,panelLeft:panel.left,
      buttons:buttons.map(b=>({name:b.dataset.quickClip||b.dataset.quickView||b.dataset.quickSpeed,
        disabled:b.disabled,width:b.getBoundingClientRect().width})),
      docWidth:document.documentElement.scrollWidth};
  })()`);
  assert.ok(phone.canvasWidth>=330,'Mobile avatar preview too narrow');
  assert.ok(phone.panelWidth>=330&&phone.panelLeft>=-1,'Quick controls clipped');
  assert.ok(phone.docWidth<=392,'Page overflows mobile width');
  assert.ok(phone.buttons.every(x=>!x.disabled&&x.width>=44),'Quick controls inaccessible');
  const active=await evalPage(`(()=>{
    document.querySelector('[data-quick-clip="RUN"]').click();
    document.querySelector('[data-quick-view="side"]').click();
    document.querySelector('[data-quick-speed="0.5"]').click();
    return {run:document.querySelector('[data-quick-clip="RUN"]').classList.contains('active'),
      side:document.querySelector('[data-quick-view="side"]').classList.contains('active'),
      speed:document.getElementById('speed').value};
  })()`);
  assert.deepEqual(active,{run:true,side:true,speed:'0.5'},'Quick controls not linked to real viewer');
  report.mobile=phone;
  await sample('RUN','side',.25,'phone');

  fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2)+'\n');
  assert.equal(errors.length,0,'Browser exceptions: '+errors.join('; '));
  console.log('CHIBI_VISUAL_AUDIT '+JSON.stringify({cases:report.cases.length,viewport:'1024x900 + 390x844',
    clips:['WALK','RUN','IDLE','JUMP'],output:OUT,warnings:report.warnings}));
})().catch(error=>{console.error('CHIBI_VISUAL_AUDIT_FAILED',error.stack||error);process.exitCode=1;}).finally(async()=>{
  try{ws?.close();}catch{}
  if(chrome){try{chrome.kill('SIGTERM');}catch{}}
  if(server.listening)await new Promise(resolve=>server.close(resolve));
  if(userDir)try{fs.rmSync(userDir,{recursive:true,force:true});}catch{}
});

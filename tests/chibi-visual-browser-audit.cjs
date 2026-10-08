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
      gate:document.getElementById('gateText')?.textContent||''
    }))()`);
    ready=status.ready;
    detail=status.status+' / '+status.gate;
    if(ready)break;
    if(/로드 실패|생성에 실패|열 수 없|찾지 못|WebGL/.test(detail))break;
    await sleep(100);
  }
  assert.ok(ready,'Chibi WebGL never became ready: '+detail+' / '+errors.join('; '));
  const clipNames=await evalPage('window.__kc3dAudit.clips.map(x=>x.label)');
  for(const name of ['IDLE','WALK','RUN','JUMP'])assert.ok(clipNames.includes(name),'Missing '+name+' clip');

  const report={version:'chibi-v4.1',source:'Styloo Chibi real GLB in local Chrome',cases:[],warnings:[]};
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

  await sample('IDLE','side',0,'male-hair');
  await evalPage("(()=>{const select=document.querySelector('#chibiHair');select.value='kidscade_male_hair_swept';select.dispatchEvent(new Event('change',{bubbles:true}))})()");
  await sample('IDLE','side',0,'male-hair-swept');
  await evalPage("(()=>{document.querySelector('[data-body-fit=\\\"female\\\"]').click();const select=document.querySelector('#chibiHair');select.value='chibi_female_hair_layered';select.dispatchEvent(new Event('change',{bubbles:true}))})()");
  await sample('IDLE','side',0,'female-hair-layered');
  await evalPage("document.querySelector('[data-body-fit=\\\"male\\\"]').click()");
  await sample('IDLE','threeQuarter',0,'desktop');
  await sample('IDLE','side',0,'desktop');
  await sample('JUMP','side',.5,'desktop');

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

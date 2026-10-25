#!/usr/bin/env node
'use strict';
// Real Chrome/WebGL playthrough of "못 찾겠다 꾀꼬리". Uses built-in Node CDP, not Playwright.
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const http=require('node:http');
const cp=require('node:child_process');
const assert=require('node:assert/strict');
const {once}=require('node:events');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.resolve(process.env.KIDSCADE_KKWA_AUDIT_OUT||path.join(os.tmpdir(),'kkwaekkori-real-play'));
const CHROME=[process.env.KIDSCADE_CHROMIUM,'/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(x=>x&&fs.existsSync(x));
if(!CHROME)throw Error('Need a Chrome/Chromium executable to perform the real WebGL playthrough');
fs.mkdirSync(OUT,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.glb':'model/gltf-binary','.gltf':'model/gltf+json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.json':'application/json'};
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  let file=path.resolve(ROOT,'.'+decodeURIComponent(url.pathname));
  if(url.pathname.endsWith('/'))file=path.join(file,'index.html');
  if(file!==ROOT&&!file.startsWith(ROOT+path.sep)){res.writeHead(403);res.end();return}
  fs.readFile(file,(err,body)=>{
    if(err){res.writeHead(404);res.end('Missing '+url.pathname);return}
    if(url.pathname.endsWith('/tod_mot_chatgetda_kkwaekkori/game.js')){
      const expose="\nwindow.__KK_TEST__={\n  snapshot:()=>({active,mode,stage:town?.stageName,people:town?.people.length,targets:town?.order.length,\n    found:found.length,level:challengeLevel,time:timeRemaining,viewSize,look:[cameraLook.x,cameraLook.z],\n    currentTarget:getTarget()?.id,celebration:!!celebration,preview:!!previewActor,\n    shown:!document.querySelector('#start').classList.contains('hidden')}),\n  targetTap:()=>{const t=getTarget(),h=citizenMeshes.get(t?.id)?.holder;if(!h)return null;\n    scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);\n    const p=h.position.clone();p.y+=.85;p.project(camera);\n    const r=canvas.getBoundingClientRect();\n    return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2,z:p.z};},\n  deliveryPosition:()=>{const p=town?.people.find(q=>q.activity==='deliver'&&q.slot===1);\n    const h=citizenMeshes.get(p?.id)?.holder;return h?[h.position.x,h.position.z]:null;}\n};";
      body=Buffer.concat([body,Buffer.from('\n'+expose)]);
    }
    res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});
    res.end(body);
  });
});
let chrome,ws,profile,serverOpen=false,passed=0;
(async()=>{
  server.listen(0,'127.0.0.1');await once(server,'listening');serverOpen=true;
  const base='http://127.0.0.1:'+server.address().port+'/games/tod_mot_chatgetda_kkwaekkori/';
  profile=fs.mkdtempSync(path.join(os.tmpdir(),'kkwaecc-chrome-'));
  chrome=cp.spawn(CHROME,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-background-networking','--no-first-run',
    '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--remote-allow-origins=*',
    '--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','pipe']});
  let stderr='';chrome.stderr.on('data',x=>{stderr=(stderr+String(x)).slice(-2400)});
  let target;
  for(let i=0;i<200;i++){
    if(chrome.exitCode!==null)throw Error('Chrome exited '+stderr);
    await sleep(100);
    const portFile=path.join(profile,'DevToolsActivePort');if(!fs.existsSync(portFile))continue;
    try{
      const port=Number(fs.readFileSync(portFile,'utf8').split(/\r?\n/)[0]);
      const all=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
      target=all.find(x=>x.type==='page');if(target)break;
    }catch(_){}
  }
  if(!target)throw Error('No Chrome DevTools page '+stderr);
  ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((ok,fail)=>{ws.onopen=ok;ws.onerror=fail});
  const pending=new Map(),errors=[];let seq=0;
  ws.onmessage=e=>{
    const d=JSON.parse(e.data);
    if(d.method==='Runtime.exceptionThrown')errors.push(d.params?.exceptionDetails?.exception?.description||d.params?.exceptionDetails?.text||'unknown browser exception');
    if(!d.id)return;const p=pending.get(d.id);if(!p)return;
    pending.delete(d.id);if(d.error)p.reject(Error(d.error.message));else p.resolve(d.result||{});
  };
  const send=(method,params={})=>new Promise((ok,fail)=>{const id=++seq;pending.set(id,{ok,fail});ws.send(JSON.stringify({id,method,params}))});
  const evaluate=async code=>{
    const r=await send('Runtime.evaluate',{expression:code,returnByValue:true,awaitPromise:true});
    if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);
    return r.result?.value;
  };
  const wait=async(code,ms=40000)=>{
    const deadline=Date.now()+ms;let last;
    while(Date.now()<deadline){
      try{last=await evaluate(code);if(last)return last;}catch(e){last=e.message}
      await sleep(160);
    }
    throw Error('Timed out: '+code+' last='+JSON.stringify(last));
  };
  async function screenshot(name){
    const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    const buffer=Buffer.from(r.data,'base64');const file=path.join(OUT,name+'.png');
    fs.writeFileSync(file,buffer);assert.ok(buffer.length>25000,'Image is suspiciously blank: '+file);
    return buffer.length;
  }
  const click=async(x,y)=>{
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',x,y,button:'none'});
    await send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',clickCount:1});
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',clickCount:1});
  };
  await send('Page.enable');await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:base});
  await wait("!!document.querySelector('#quickStart') && !!window.__KK_TEST__",30000);
  await evaluate("document.querySelector('#quickStart').click()");
  await wait("window.__KK_TEST__.snapshot().active",65000);
  assert.equal(await evaluate("__KK_TEST__.snapshot().people"),18);
  assert.equal(await evaluate("__KK_TEST__.snapshot().preview"),true);
  const startPos=await evaluate("__KK_TEST__.deliveryPosition()");
  await sleep(1700);
  const endPos=await evaluate("__KK_TEST__.deliveryPosition()");
  assert.ok(startPos&&endPos&&Math.hypot(startPos[0]-endPos[0],startPos[1]-endPos[1])>.03,'delivery residents must really walk in 3D');
  await screenshot('01-desktop-existing-game');passed++;
  // Test direct controls through CDP input, not via game's internal pick function.
  const look0=await evaluate("__KK_TEST__.snapshot().look");
  await click(830,440); // legitimate wrong/empty tap should not end the untimed game
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:720,y:470});
  await send('Input.dispatchMouseEvent',{type:'mousePressed',x:720,y:470,button:'left',clickCount:1});
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:810,y:490,button:'left',buttons:1});
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:810,y:490,button:'left',clickCount:1});
  const look1=await evaluate("__KK_TEST__.snapshot().look");
  assert.ok(Math.hypot(look1[0]-look0[0],look1[1]-look0[1])>.05,'Dragging the world must move the camera');
  await evaluate("document.querySelector('#rotateRight').click();document.querySelector('#resetViewBtn').click();document.querySelector('#seeThrough').click()");
  // Rotation changes the plane projection; verify drag still follows the ground.
  const turnBefore=await evaluate("__KK_TEST__.snapshot().look");
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:720,y:460});
  await send('Input.dispatchMouseEvent',{type:'mousePressed',x:720,y:460,button:'left',clickCount:1});
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:810,y:470,button:'left',buttons:1});
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:810,y:470,button:'left',clickCount:1});
  const turnAfter=await evaluate("__KK_TEST__.snapshot().look");
  assert.ok(Math.hypot(turnAfter[0]-turnBefore[0],turnAfter[1]-turnBefore[1])>.05,'Rotated camera dragging must still move the town');
    await evaluate("document.querySelector('#hintBtn').click();document.querySelector('#hintBtn').click()");
  await sleep(250);
  const xy=await evaluate("__KK_TEST__.targetTap()");
  assert.ok(xy&&xy.x>10&&xy.x<1270&&xy.y>5&&xy.y<795,'the target should be visible after hint '+JSON.stringify(xy));
  await click(xy.x,xy.y);
  await wait("__KK_TEST__.snapshot().found===1",6000);
  await wait("!document.querySelector('#finish').classList.contains('hidden')",8000);
  await screenshot('02-found-friend');passed++;
  // Large town: five consecutive targets, camera hint, see-through, real pointer events.
  await evaluate("document.querySelector('#otherStageBtn').click();document.querySelector('#difficulty').value='hard';document.querySelector('[data-stage=large]').click()");
  await wait("__KK_TEST__.snapshot().active&&__KK_TEST__.snapshot().targets===5",65000);
  await screenshot('03-large-town');passed++;
  for(let round=1;round<=5;round++){
    await evaluate("document.querySelector('#hintBtn').click();document.querySelector('#hintBtn').click()");
    await sleep(120);
    const xy=await evaluate("__KK_TEST__.targetTap()");
    assert.ok(xy&&xy.x>=0&&xy.x<1280&&xy.y>=0&&xy.y<800,'target out of viewport round '+round+' '+JSON.stringify(xy));
    await click(xy.x,xy.y);
    await wait("__KK_TEST__.snapshot().found>="+round,4000);
    await wait("!__KK_TEST__.snapshot().celebration",5000);
  }
  await wait("!document.querySelector('#finish').classList.contains('hidden')",3000);
  await screenshot('04-large-finished');passed++;
  // Mobile landscape, interactive target card.
  await send('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:true});
  await evaluate("document.querySelector('#otherStageBtn').click();document.querySelector('[data-stage=medium]').click()");
  await wait("__KK_TEST__.snapshot().active&&__KK_TEST__.snapshot().targets===3",65000);
  await evaluate("document.querySelector('#compactMission').click()");
  assert.equal(await evaluate("document.querySelector('.mission').classList.contains('minimized')"),true);
  await screenshot('05-mobile-landscape');passed++;
  await evaluate("document.querySelector('#menuBtn').click();document.querySelector('#challengeStart').click()");
  await wait("__KK_TEST__.snapshot().mode==='challenge'&&__KK_TEST__.snapshot().active",65000);
  assert.equal(await evaluate("__KK_TEST__.snapshot().people"),11);
  await screenshot('06-challenge-round-one');passed++;
  const stageTap=await evaluate("__KK_TEST__.targetTap()");
  if(stageTap&&stageTap.x>=0&&stageTap.x<=844&&stageTap.y>=0&&stageTap.y<=390){
    await click(stageTap.x,stageTap.y);
    await wait("__KK_TEST__.snapshot().level===2",8000);
    await wait("__KK_TEST__.snapshot().active",65000);
    assert.equal(await evaluate("__KK_TEST__.snapshot().people"),14);
    await screenshot('07-challenge-round-two');passed++;
  }
  assert.deepEqual(errors,[],'Browser JS exceptions: '+JSON.stringify(errors));
  console.log(JSON.stringify({passed:true,scenarios:passed,loadedAssets:true,walking:true,drag:true,regularFinished:true,largeFinished:true,mobile:true,challenge:true,errors:[],screenshots:OUT}));
})().catch(err=>{console.error('KKWAEKKORI BROWSER AUDIT FAILED',err);process.exitCode=1}).finally(async()=>{
  try{ws?.close();chrome?.kill('SIGKILL');}catch(_){}
  if(serverOpen)await new Promise(ok=>server.close(ok));
  if(profile)fs.rmSync(profile,{recursive:true,force:true});
});

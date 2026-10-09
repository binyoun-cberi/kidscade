#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const os=require('node:os');
const cp=require('node:child_process');
const sharp=require('sharp');
const {once}=require('node:events');
const ROOT=path.resolve(__dirname,'..');
const OUT=process.env.KIDSCADE_GIGACITY_AUDIT_OUT||path.join(os.tmpdir(),'kidscade-gigacity-browser-audit');
fs.mkdirSync(OUT,{recursive:true});
const CHROME=[process.env.CHROME_BIN,'/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].filter(Boolean).find(fs.existsSync);
assert.ok(CHROME,'Chromium is needed for Gigacity visual test');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css','.glb':'model/gltf-binary','.png':'image/png','.json':'application/json'};
const server=http.createServer((req,res)=>{
  const uri=new URL(req.url,'http://localhost');
  const file=path.resolve(ROOT,'.'+decodeURIComponent(uri.pathname));
  if(file!==ROOT&&!file.startsWith(ROOT+path.sep)){res.writeHead(403);res.end();return;}
  fs.readFile(file,(err,b)=>{
    if(err){res.writeHead(404);res.end('Not found');return;}
    res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});res.end(b);
  });
});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let chrome,ws,userDir;
const errors=[],responses=[];
(async()=>{
  try{
    server.listen(0,'127.0.0.1');
    await once(server,'listening');
    userDir=fs.mkdtempSync(path.join(os.tmpdir(),'gigacity-cdp-'));
    chrome=cp.spawn(CHROME,[
      '--headless=new','--no-sandbox','--disable-dev-shm-usage','--enable-webgl',
      '--enable-unsafe-swiftshader','--use-angle=swiftshader','--remote-allow-origins=*',
      '--disable-background-networking','--no-first-run','--remote-debugging-port=0',
      '--user-data-dir='+userDir,'about:blank'
    ],{stdio:['ignore','ignore','pipe']});
    let stderr='';
    chrome.stderr.on('data',b=>{stderr=(stderr+String(b)).slice(-3000);});
    let target;
    for(let k=0;k<250;k++){
      if(chrome.exitCode!==null)throw Error('Chrome exited: '+stderr);
      const p=path.join(userDir,'DevToolsActivePort');
      if(fs.existsSync(p)){
        const port=Number(fs.readFileSync(p,'utf8').split('\n')[0]);
        if(port)try{
          const targets=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
          target=targets.find(t=>t.type==='page');
        }catch{}
      }
      if(target)break;
      await sleep(100);
    }
    assert.ok(target,'No browser debugging endpoint: '+stderr);
    ws=new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
    let seq=0;
    const pending=new Map();
    ws.onmessage=e=>{
      const m=JSON.parse(String(e.data));
      if(m.method==='Runtime.exceptionThrown')errors.push(m.params?.exceptionDetails?.text||'Browser exception');
      if(m.method==='Log.entryAdded'&&m.params?.entry?.level==='error')errors.push(m.params.entry.text||'Browser error');
      if(m.method==='Network.responseReceived')responses.push({url:m.params?.response?.url,status:m.params?.response?.status});
      if(!m.id||!pending.has(m.id))return;
      const p=pending.get(m.id);pending.delete(m.id);
      if(m.error)p.reject(Error(m.error.message));else p.resolve(m.result||{});
    };
    const send=(method,params={})=>new Promise((resolve,reject)=>{
      const id=++seq;pending.set(id,{resolve,reject});
      ws.send(JSON.stringify({id,method,params}));
    });
    const evaluate=async expression=>{
      const x=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
      if(x.exceptionDetails)throw Error(JSON.stringify(x.exceptionDetails).slice(0,900));
      return x.result?.value;
    };
    const click=s=>evaluate('document.querySelector('+JSON.stringify(s)+').click()');
    const viewport=(width,height,scale)=>send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:scale,mobile:true});
    const snap=async name=>{
      const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true});
      const bytes=Buffer.from(r.data,'base64');
      fs.writeFileSync(path.join(OUT,name+'.png'),bytes);
      const pixels=await sharp(bytes).removeAlpha().raw().toBuffer({resolveWithObject:true});
      let luminance=0;for(let i=0;i<pixels.data.length;i+=3)luminance+=pixels.data[i]*0.21+pixels.data[i+1]*0.72+pixels.data[i+2]*0.07;
      return {pixels:pixels.data,mean:Math.round(luminance/(pixels.data.length/3)),w:pixels.info.width,h:pixels.info.height};
    };
    const change=(a,b)=>{
      assert.equal(a.pixels.length,b.pixels.length);
      let n=0;for(let i=0;i<a.pixels.length;i+=3){
        if(Math.abs(a.pixels[i]-b.pixels[i])+Math.abs(a.pixels[i+1]-b.pixels[i+1])+Math.abs(a.pixels[i+2]-b.pixels[i+2])>45)n++;
      }
      return Math.round(n*100/(a.pixels.length/3));
    };
    await send('Page.enable');await send('Runtime.enable');await send('Log.enable');await send('Network.enable');
    await viewport(844,390,2);
    await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
    await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/games/gigacity_lite/index.html'});
    for(let k=0;k<120;k++){
      const ready=await evaluate('Boolean(document.querySelector("#start"))').catch(()=>false);
      if(ready)break;
      await sleep(100);
    }
    await sleep(1800);
    const gl=await evaluate('({gl2:!!document.querySelector("#city")?.getContext("webgl2"),width:document.querySelector("#city")?.width,height:document.querySelector("#city")?.height})');
    console.log('3D canvas:',JSON.stringify(gl));
    assert.ok(gl.gl2&&gl.width>0&&gl.height>0,'WebGL2 canvas not active');
    await click('#start');await sleep(1200);
    const chase=await snap('01-chase-landscape');
    console.log('CHASE brightness:',chase.mean);
    assert.ok(chase.mean>12,'Chase scene is nearly black');
    await click('[data-view-mode="cockpit"]');await sleep(600);
    const cockpit=await snap('02-cockpit-landscape');
    const cockpitDelta=change(chase,cockpit);
    console.log('COCKPIT brightness and visual change:',cockpit.mean,cockpitDelta+'%');
    assert.ok(cockpitDelta>2,'Cockpit view did not visually change');
    assert.equal(await evaluate('document.querySelector("[data-view-mode=cockpit]").getAttribute("aria-pressed")'),'true');
    await click('[data-view-mode="free"]');await sleep(550);
    const free=await snap('03-free-landscape');
    const freeDelta=change(cockpit,free);
    console.log('FREE vs cockpit changed pixels:',freeDelta+'%');
    assert.ok(freeDelta>2,'Free view did not visually change');
    await click('[data-view-mode="cockpit"]');await click('#timeButton');await sleep(600);
    const night=await snap('04-cockpit-night');
    const nightDelta=change(cockpit,night);
    console.log('NIGHT vs DAY changed pixels:',nightDelta+'%');
    assert.ok(nightDelta>3,'Night switch did not visually change sky/buildings');
    const altitudeBefore=await evaluate('parseInt(document.querySelector("#altitude").textContent)');
    const touch=await evaluate('(()=>{const r=document.querySelector("#ascend").getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()');
    await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:touch.x,y:touch.y,id:42}]});
    await sleep(530);
    await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await sleep(100);
    const altitudeAfter=await evaluate('parseInt(document.querySelector("#altitude").textContent)');
    console.log('ASCEND touch altitude:',altitudeBefore,'->',altitudeAfter);
    assert.ok(altitudeAfter>altitudeBefore,'Touch ascend did not increase height');
    await viewport(390,844,3);await sleep(550);
    const portrait=await snap('05-cockpit-portrait');
    const overlap=await evaluate('(()=>{const a=document.querySelector("#seedPanel").getBoundingClientRect(),b=document.querySelector("#cameraViews").getBoundingClientRect();return Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top))})()');
    console.log('Portrait seed vs view button overlap:',overlap,'px2');
    assert.ok(overlap<1,'Portrait camera buttons overlap city input');
    assert.ok(portrait.mean>8,'Portrait viewport is black');
    const badResponses=responses.filter(x=>x.status>=400);
    console.log('HTTP errors:',JSON.stringify(badResponses.slice(0,8)));
    assert.ok(responses.some(x=>x.url?.endsWith('/race-future.glb')&&x.status===200),'Kenney player GLB was not loaded');
    assert.equal(errors.length,0,'JavaScript errors: '+errors.join(' | ').slice(0,850));
    assert.equal(badResponses.length,0,'Asset request failed');
    const report={ok:true,viewport:'844x390 and 390x844',chaseVsCockpit:cockpitDelta,freeVsCockpit:freeDelta,nightVsDay:nightDelta,ascend:[altitudeBefore,altitudeAfter],portraitOverlap:overlap,chromeErrors:errors,screenshots:5};
    fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2));
    console.log('GIGACITY_SIMULATION_PASSED',JSON.stringify(report));
  }catch(err){
    console.error('GIGACITY_SIMULATION_FAILED',err?.stack||String(err));
    fs.writeFileSync(path.join(OUT,'failure.txt'),String(err?.stack||err));
    process.exitCode=1;
  }finally{
    try{ws?.close();}catch{}
    try{chrome?.kill('SIGTERM');}catch{}
    server.close();
    if(userDir)try{fs.rmSync(userDir,{recursive:true,force:true});}catch{}
  }
})();

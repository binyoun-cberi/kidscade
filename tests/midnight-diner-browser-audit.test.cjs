'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os'),cp=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
const CHROME=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function localServer(){
 const inject="window.__dinerAudit={state:()=>game,skip:()=>{stopCooking();while(game?.phase==='cooking')R.observeCooking(game,false);repaint()},selected:()=>chosen};";
 return http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost'),local=decodeURIComponent(url.pathname);
  const file=path.resolve(ROOT,'.'+local);
  if(file!==ROOT&&!file.startsWith(ROOT+path.sep)){res.writeHead(403);return res.end();}
  fs.readFile(file,(err,buf)=>{
   if(err){res.writeHead(404);return res.end('missing '+local);}
   if(local==='/games/high_midnight_diner/game.js'){
    const s=buf.toString('utf8'),at='intro();\n})();';
    if(!s.includes(at)){res.writeHead(500);return res.end('audit hook missing');}
    buf=Buffer.from(s.replace(at,inject+'\n'+at));
   }
   const ext=path.extname(file);
   const types={'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.png':'image/png','.gltf':'model/gltf+json','.glb':'model/gltf-binary'};
   res.writeHead(200,{'content-type':types[ext]||'application/octet-stream'});res.end(buf);
  });
 });
}
async function run(){
 const server=localServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'diner-cdp-'));
 const chrome=cp.spawn(CHROME,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl','--disable-background-networking','--remote-allow-origins=*','--remote-debugging-port=0','--user-data-dir='+dir,'about:blank'],{stdio:'ignore'});
 let ws;
 try{
  let endpoint;
  for(let i=0;i<160;i++){
   await sleep(100);
   const name=path.join(dir,'DevToolsActivePort');if(!fs.existsSync(name))continue;
   try{
    const port=fs.readFileSync(name,'utf8').split(/\r?\n/)[0];
    const list=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
    endpoint=list.find(x=>x.type==='page')?.webSocketDebuggerUrl;if(endpoint)break;
   }catch(_){}
  }
  assert.ok(endpoint,'Chrome CDP did not start');
  ws=new WebSocket(endpoint);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});
  let id=0,errors=[],pending=new Map(),missing=[];
  ws.onmessage=e=>{
   const m=JSON.parse(e.data);
   if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);
   if(m.method==='Network.responseReceived'&&m.params.response.status>=400)missing.push(m.params.response.url+' '+m.params.response.status);
   if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result||{});}
  };
  const send=(method,params={})=>new Promise((resolve,reject)=>{const i=++id;pending.set(i,{resolve,reject});ws.send(JSON.stringify({id:i,method,params}))});
  const ev=async code=>{
   const x=await send('Runtime.evaluate',{expression:code,returnByValue:true,awaitPromise:true});
   if(x.exceptionDetails)throw Error(x.exceptionDetails.text+': '+(x.exceptionDetails.exception?.description||''));return x.result?.value;
  };
  await send('Runtime.enable');await send('Page.enable');await send('Network.enable');
  const origin='http://127.0.0.1:'+server.address().port;
  const devices=[['phone portrait',390,844,true],['phone landscape',844,390,true],['tablet',1024,768,true],['desktop',1366,768,false]];
  for(const [label,w,h,mobile] of devices){
   await send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile});
   await send('Emulation.setTouchEmulationEnabled',{enabled:mobile,maxTouchPoints:3});
   await send('Page.navigate',{url:origin+'/games/high_midnight_diner/index.html'});
   let ready=false;
   for(let tries=0;tries<130;tries++){
    await sleep(100);
    if(await ev('!!window.__dinerAudit && document.readyState==="complete"')){ready=true;break;}
   }
   assert.ok(ready,label+' loading failed '+errors.join(';'));
   await ev('document.getElementById("startBtn").click();__dinerAudit.skip()');
   for(let i=0;i<200;i++){await sleep(100);if(await ev('window.MidnightDinerFoodAssets?.complete'))break;}
   const assets=await ev('({ready:MidnightDinerFoodAssets.ready,failed:MidnightDinerFoodAssets.failed})');
   const results=[];
   for(let i=0;i<5;i++){
    const current=await ev('(()=>{const g=__dinerAudit.state(),a=document.getElementById("plate"),r=a.getBoundingClientRect(),px=a.getContext("2d").getImageData(0,0,600,420).data;let visible=0,color=0;for(let j=0;j<px.length;j+=4){if(px[j+3]>32){visible++;if(Math.max(px[j],px[j+1],px[j+2])-Math.min(px[j],px[j+1],px[j+2])>18)color++;}}const z=g.dish.zones.find(x=>!x.dangerous&&!x.removed),angle=-Math.PI/2+(z.id+.5)*Math.PI*2/g.dish.spec.count;const p=g.dish.spec.id==="pancake"||g.dish.spec.id==="cake"&&MidnightDinerFoodAssets.ready.includes("cake:main")?{x:300+125*Math.cos(angle),y:210+125*.68*Math.sin(angle)}:MidnightDinerPlate.PLACES[g.dish.spec.id](z.id);const x=r.x+p.x*r.width/600,y=r.y+p.y*r.height/420;return {id:g.dish.spec.id,phase:g.phase,rect:{x:r.x,y:r.y,w:r.width,h:r.height},color,visible,hit:document.elementFromPoint(x,y)?.id||"",touch:{x,y},target:z.id};})()');
    results.push(current);
    assert.equal(current.phase,'playing',label+' meal '+i+' not playable');
    assert.ok(current.rect.w>100&&current.rect.h>70,label+' tiny food plate '+JSON.stringify(current));
    assert.ok(current.rect.y>=0&&current.rect.y+current.rect.h<=h+1,label+' plate offscreen '+JSON.stringify(current));
    assert.ok(current.rect.x>=-1&&current.rect.x+current.rect.w<=w+1,label+' plate horizontal clipping '+JSON.stringify(current));
    assert.ok(current.color>1000,label+' missing colored pixels '+JSON.stringify(current));
    assert.equal(current.hit,'plate',label+' food is covered '+JSON.stringify(current));
    if(i===0){
     if(mobile){await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...current.touch,id:1}]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
     else{await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...current.touch});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...current.touch});}
     await sleep(100);
     assert.equal(await ev('__dinerAudit.selected()'),current.target,label+' finger/mouse failed to select food');
    }
    for(let j=0;j<3;j++){
     const n=await ev('__dinerAudit.state().dish.zones.find(z=>!z.dangerous&&!z.removed).id');
     await ev('window.dispatchEvent(new KeyboardEvent("keydown",{key:String('+String(n+1)+'),bubbles:true}));document.getElementById("eatBtn").click()');
     if(j<2)assert.equal(await ev('__dinerAudit.state().dish.eaten'),j+1,label+' eat button failed');
    }
    if(i<4){
     assert.equal(await ev('!document.getElementById("reviewVeil").classList.contains("hidden")'),true,label+' review modal failed');
     await ev('document.getElementById("nextCourseBtn").click();__dinerAudit.skip()');
    }
   }
   const end=await ev('({won:__dinerAudit.state().ending?.won,finished:!document.getElementById("resultModal").classList.contains("hidden")})');
   console.log('DINER_REAL_BROWSER '+JSON.stringify({device:label,assets,results,end,errors:errors.slice(-8),missing:missing.slice(-8)}));
   assert.deepEqual(assets.failed,[],label+' food rendering failed');
   assert.equal(assets.ready.length,6,label+' real 3D foods not loaded');
   assert.equal(end.won,true,label+' five course play did not end in victory');
   assert.equal(end.finished,true,label+' game-over modal not visible');
  }
  assert.deepEqual(errors,[],'browser JS errors');
  assert.deepEqual(missing.filter(x=>/\.glb|\.gltf|Textures/.test(x)),[],'GLB texture HTTP errors');
 }finally{
  try{ws?.close()}catch(_){}
  chrome.kill('SIGKILL');server.close();
  // Chrome may still be releasing its profile during process shutdown.
  try{fs.rmSync(dir,{force:true,recursive:true,maxRetries:12,retryDelay:200});}
  catch(err){console.warn('Nonfatal Chromium temporary-profile cleanup:',err.message);}
 }
}
test('midnight diner food visibility, WebGL loading, tap and 5 course gameplay on 4 viewports',{skip:!CHROME,timeout:180000},run);

#!/usr/bin/env node
'use strict';
// Actual Chromium / CDP interaction with screenshots; no external npm dependencies.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),cp=require('node:child_process'),assert=require('node:assert/strict');
const {once}=require('node:events');
const ROOT=path.resolve(__dirname,'..');
const CHROME=[process.env.CHROME_PATH,'/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser','/opt/google/chrome/chrome'].find(v=>v&&fs.existsSync(v));
if(!CHROME)throw Error('Chrome/Chromium is required');
const OUT=process.env.AIR_TRAFFIC_AUDIT_OUT||fs.mkdtempSync(path.join(os.tmpdir(),'air-traffic-audit-'));fs.mkdirSync(OUT,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),f=path.resolve(ROOT,'.'+pathname);
 if(!f.startsWith(ROOT+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(f,(err,body)=>{
  if(err){res.writeHead(404);res.end(pathname);return;}
  if(pathname==='/games/high_air_traffic_control/game.js'){
   let src=body.toString('utf8');
   assert.match(src,/\}\)\(\);\s*$/);
   src=src.replace(/\}\)\(\);\s*$/,'window.__airTrafficAudit={get game(){return game;},get paused(){return paused;},get speed(){return speed;},step(n){for(let i=0;i<n&&game&&game.phase==="running";i++)C.step(game,1/30)},finish(){finish()}};})();');
   body=Buffer.from(src);
  }
  res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});res.end(body);
 });
});
const pause=ms=>new Promise(done=>setTimeout(done,ms));
let chrome,ws;
(async()=>{
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const port=server.address().port,dir=fs.mkdtempSync(path.join(os.tmpdir(),'air-traffic-chrome-'));
 chrome=cp.spawn(CHROME,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+dir,'about:blank'],{stdio:['ignore','ignore','pipe']});
 let diag='',target;
 chrome.stderr.on('data',d=>{diag+=String(d).slice(0,100);});
 for(let n=0;n<250;n++){
  await pause(100);if(chrome.exitCode!==null)throw Error('Chrome exited '+diag.slice(-400));
  const f=path.join(dir,'DevToolsActivePort');if(!fs.existsSync(f))continue;
  try{const p=Number(fs.readFileSync(f,'utf8').split(/\r?\n/)[0]);const list=await(await fetch('http://127.0.0.1:'+p+'/json/list')).json();target=list.find(x=>x.type==='page');if(target)break;}catch{}
 }
 if(!target)throw Error('Chrome DevTools not available '+diag.slice(-400));
 ws=new WebSocket(target.webSocketDebuggerUrl);
 await new Promise((done,fail)=>{ws.onopen=done;ws.onerror=fail;});
 let serial=0;const pending=new Map(),errors=[];
 ws.onmessage=e=>{
  const v=JSON.parse(e.data);
  if(v.method==='Runtime.exceptionThrown')errors.push(v.params?.exceptionDetails?.text||'Browser exception');
  if(!v.id)return;const p=pending.get(v.id);if(!p)return;pending.delete(v.id);
  v.error?p.reject(Error(v.error.message)):p.resolve(v.result||{});
 };
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
 const js=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error('JS error: '+JSON.stringify(r.exceptionDetails));return r.result?.value;};
 const wait=async(expr,ms=10000)=>{const start=Date.now();while(Date.now()-start<ms){if(await js(expr))return;await pause(85);}throw Error('Timeout: '+expr);};
 const screenshot=async name=>{const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false}),b=Buffer.from(r.data,'base64');assert.ok(b.length>14000,'Blank screenshot '+name+': '+b.length);fs.writeFileSync(path.join(OUT,name+'.png'),b);};
 const click=async id=>js('document.getElementById('+JSON.stringify(id)+').click()');
 const tap=async(x,y,touch=false,delay=40)=>{
  if(touch){await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});await pause(delay);await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
  else{await send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',clickCount:1});}
 };
 await send('Page.enable');await send('Runtime.enable');
 const url='http://127.0.0.1:'+port+'/games/high_air_traffic_control/index.html';
 const visit=async(w,h,mobile=false)=>{
  await send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile});
  await send('Emulation.setTouchEmulationEnabled',{enabled:mobile,maxTouchPoints:5});
  await send('Page.navigate',{url});
  await wait('!!(window.AirTrafficCore&&window.__airTrafficAudit&&document.getElementById("startBtn"))');await pause(220);
 };
 await visit(1440,900);
 assert.equal(await js('document.title'),'관제탑 시뮬레이터 | 키즈케이드');
 await screenshot('01-desktop-start');
 await click('startBtn');await wait('document.getElementById("startModal").hidden&&__airTrafficAudit.game.planes.length>0');
 assert.equal(await js('document.getElementById("radar").getContext("2d").getImageData(90,90,1,1).data[3]'),255);
 assert.ok(await js('document.querySelector(".flight-row b").textContent.length>3'));
 await screenshot('02-desktop-running');
 const pos=await js('(()=>{let r=document.querySelector(".flight-row").getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()');
 await tap(pos.x,pos.y);await wait('__airTrafficAudit.game.selectedId!==null');
 const rect=await js('(()=>{let r=document.getElementById("radar").getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}})()');
 await tap(rect.x+rect.w*.67,rect.y+rect.h*.41);
 assert.equal(await js('!!__airTrafficAudit.game.planes.find(p=>p.id===__airTrafficAudit.game.selectedId)?.waypoint'),true);
 assert.equal(await js('__airTrafficAudit.game.controlled'),1);
 await click('highAltBtn');await click('pauseBtn');await wait('__airTrafficAudit.paused');
 const before=await js('__airTrafficAudit.game.elapsed');await pause(390);const after=await js('__airTrafficAudit.game.elapsed');
 assert.ok(Math.abs(after-before)<.04,'Pause must freeze simulation');
 await screenshot('03-desktop-paused');
 await click('pauseBtn');await wait('!__airTrafficAudit.paused');
 await js('__airTrafficAudit.game.elapsed=__airTrafficAudit.game.duration-0.1;__airTrafficAudit.step(6);__airTrafficAudit.finish()');
 await wait('document.getElementById("endModal").hidden===false');
 assert.equal(await js('__airTrafficAudit.game.phase'),'failed');
 assert.match(await js('document.getElementById("endMessage").textContent'),/직접 안내/);
 await screenshot('04-desktop-shift-report');
 await click('chooseBtn');
 await js('document.querySelector("[data-map=metro]").click()');await click('startBtn');
 await wait('__airTrafficAudit.game.mapKey==="metro"');
 assert.equal(await js('__airTrafficAudit.game.airports.length'),3);await screenshot('05-city-sector');
 await visit(390,844,true);await click('startBtn');await wait('!!document.querySelector(".flight-row")');
 await js('document.querySelector(".flight-row").scrollIntoView({block:"center"})');await pause(160);
 const mobile=await js('(()=>{let r=document.querySelector(".flight-row").getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,scroll:document.documentElement.scrollWidth,viewport:innerWidth}})()');
 assert.ok(mobile.scroll<=mobile.viewport+1,'Horizontal overflow on mobile');
 await tap(mobile.x,mobile.y,true,520);await wait('__airTrafficAudit.game.selectedId!==null');
 await screenshot('06-mobile-selected');
 await js('document.getElementById("radar").scrollIntoView({block:"center"})');await pause(160);
 const mp=await js('(()=>{let r=document.getElementById("radar").getBoundingClientRect();return{x:r.x+r.width*.58,y:r.y+r.height*.52}})()');
 await tap(mp.x,mp.y,true);await wait('__airTrafficAudit.game.controlled===1');
 assert.ok(await js('document.getElementById("ordersValue").textContent.includes("1 /")'));
 await screenshot('07-mobile-routed');
 await click('newBtn');await js('document.querySelector("[data-map=coast]").click()');await click('startBtn');
 assert.equal(await js('__airTrafficAudit.game.mapKey'),'coast');await js('__airTrafficAudit.step(600)');
 await wait('document.querySelectorAll(".flight-row").length>=2');
 assert.equal(await js('__airTrafficAudit.game.map.requiredCommands'),3);await screenshot('08-coast-touch');
 assert.deepEqual(errors,[],'No uncaught browser errors');
 console.log(JSON.stringify({result:'PASS',realChrome:true,desktop:true,mobileTouch:true,controlledOrders:true,pause:true,shiftReport:true,screenshots:fs.readdirSync(OUT).filter(x=>x.endsWith('.png')),output:OUT}));
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;}).finally(()=>{try{ws?.close();}catch{}try{chrome?.kill('SIGTERM');}catch{}try{server.close();}catch{}});

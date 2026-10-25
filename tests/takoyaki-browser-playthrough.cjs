#!/usr/bin/env node
'use strict';
// Real Chromium/CDP visual and gameplay simulation. No third-party JS packages.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),cp=require('node:child_process'),assert=require('node:assert/strict');
const {once}=require('node:events');
const ROOT=path.resolve(__dirname,'..');
const GAME='/games/job_takoyaki_simulator/빙글빙글 타코야키집.html';
const CHROME=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(f=>fs.existsSync(f));
if(!CHROME)throw Error('Chrome is required');
const MIME={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css;charset=utf-8','.json':'application/json','.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost'),full=path.resolve(ROOT,'.'+decodeURIComponent(url.pathname));
  if(!(full===ROOT||full.startsWith(ROOT+path.sep))){res.writeHead(403);res.end();return}
  fs.readFile(full,(err,body)=>{
    if(err){res.writeHead(404);res.end('missing '+url.pathname);return;}
    if(decodeURIComponent(url.pathname)===GAME){
      const from='boot();\n})();';
      const to='window.__takoyakiAudit={game,startDay,tapSlot,actionFilling,actionTopping,actionPack,scoreBall,activeOrder,chooseOrder,resetSlots,isReady,addOrder,updateCooking,updateOrders};boot();\n})();';
      const before=body.toString();
      if(!before.includes(from)){res.writeHead(500);res.end('missing audit hook');return;}
      body=Buffer.from(before.replace(from,to));
    }
    res.writeHead(200,{'Content-Type':MIME[path.extname(full)]||'application/octet-stream'});res.end(body);
  });
});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
let chrome,ws;
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const port=server.address().port,userData=fs.mkdtempSync(path.join(os.tmpdir(),'takoyaki-chrome-'));
 chrome=cp.spawn(CHROME,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--remote-debugging-port=0','--user-data-dir='+userData,'about:blank'],{stdio:['ignore','ignore','pipe']});
 let diagnostic='',target;
 chrome.stderr.on('data',x=>{diagnostic=(diagnostic+String(x)).slice(-2400)});
 for(let i=0;i<250;i++){
   await pause(120);
   if(chrome.exitCode!==null)throw Error('Chrome exited: '+diagnostic);
   const f=path.join(userData,'DevToolsActivePort');
   if(!fs.existsSync(f))continue;
   try {
     const p=Number(fs.readFileSync(f,'utf8').split(/\r?\n/)[0]);
     const x=await (await fetch('http://127.0.0.1:'+p+'/json/list')).json();
     target=x.find(y=>y.type==='page');if(target)break;
   }catch{}
 }
 if(!target)throw Error('no debugger target: '+diagnostic);
 ws=new WebSocket(target.webSocketDebuggerUrl);
 await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});
 let serial=0,waiting=new Map(),errors=[],requests=[];
 ws.onmessage=evt=>{
   const x=JSON.parse(evt.data);
   if(x.method==='Runtime.exceptionThrown')errors.push((x.params.exceptionDetails?.exception?.description||x.params.exceptionDetails?.text||'exception').slice(0,350));
   if(x.method==='Network.responseReceived'&&x.params.response.status>=400)requests.push([x.params.response.status,x.params.response.url]);
   if(!x.id)return;const q=waiting.get(x.id);if(!q)return;waiting.delete(x.id);x.error?q.reject(Error(x.error.message)):q.resolve(x.result||{});
 };
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;waiting.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
 const evalJS=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails).slice(0,1200));return r.result?.value};
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
 const cases=[{w:1280,h:800,day:4,name:'desktop'},{w:390,h:844,day:7,name:'mobile-portrait'},{w:844,h:390,day:12,name:'mobile-landscape'}];
 for(const config of cases){
   await send('Emulation.setDeviceMetricsOverride',{width:config.w,height:config.h,deviceScaleFactor:1,mobile:config.w<900});
   await send('Page.navigate',{url:'http://127.0.0.1:'+port+encodeURI(GAME)});
   await pause(1600);
   assert.ok(await evalJS('!!window.__takoyakiAudit'),'missing game audit hook');
   await evalJS(`__takoyakiAudit.game.day=${config.day};__takoyakiAudit.startDay();true`);
   await pause(1000);
   const geometry=await evalJS(`(()=>{const rect=id=>{const e=document.getElementById(id),r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom,visible:!!e.offsetParent}};return {screen:[innerWidth,innerHeight],stage:rect('stage'),board:rect('stage'),bottom:rect('btnPack'),sauce:rect('btnSauce'),octo:rect('btnOcto'),orders:rect('orders'),startVisible:getComputedStyle(document.getElementById('startScreen')).display,scrollWidth:document.documentElement.scrollWidth,popup:document.getElementById('qualityResult').textContent,classes:document.querySelector('.app').className}})()`);
   assert.equal(geometry.startVisible,'none','start overlay still visible');
   assert.ok(geometry.stage.w>=200&&geometry.stage.h>150,'pan too small');
   assert.ok(geometry.bottom.visible,'pack button hidden');
   assert.ok(geometry.bottom.bottom<=config.h+1,'pack button below viewport');
   assert.ok(geometry.bottom.x>=0&&geometry.bottom.right<=config.w+2,'pack button clipped horizontally');
   assert.ok(geometry.sauce.visible,'sauce selector not visible');
   assert.ok(geometry.scrollWidth<=config.w+2,'horizontal overflow');
   const outcome=await evalJS(`(()=>{
     const a=__takoyakiAudit,g=a.game,order=a.activeOrder();
     for(let n=0;n<order.pieces;n++){
       a.tapSlot(n);let s=g.slots[n];
       if(g.day>=7){
         a.actionFilling(order.filling);
         if(order.extraOcto)a.actionFilling('octopus');
       }
       for(let k=0;k<3;k++){s.phaseCook=12;s.totalCook=order.crispy?52:42;s.innerCook=34;a.tapSlot(n);}
       s.totalCook=order.crispy?52:42;s.innerCook=34;s.shape=100;s.phaseCook=10;
       a.tapSlot(n);
       if(g.day>=4){
         for(const type of ['sauce','mayo','katsu','aonori'])if(order[type])a.actionTopping(type);
       }
     }
     if(g.day>=4)a.actionPack();
     return {day:g.day,pieces:order.pieces,served:g.dayServed,score:g.dayScore,remaining:g.orders.length,feedback:document.getElementById('qualityResult').textContent}
   })()`);
   assert.equal(outcome.served,1,'order was not completed: '+JSON.stringify(outcome));
   assert.ok(outcome.score>0,'score not credited');
   await pause(450);
   const image=await send('Page.captureScreenshot',{format:'jpeg',quality:50,captureBeyondViewport:false});
   console.log('TAKOYAKI_AUDIT '+JSON.stringify({config:config.name,geometry,outcome,errors:errors.slice(-3),requestErrors:requests.slice(-4)}));
   console.log('TAKOYAKI_IMAGE_'+config.name.replace(/-/g,'_')+'='+image.data);
 }
 // Visit every day sequentially and complete one full order with exact ingredients.
 await send('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:'http://127.0.0.1:'+port+encodeURI(GAME)});
 await pause(900);
 const season=await evalJS(`(()=>{
   const a=__takoyakiAudit,g=a.game,results=[];
   for(let day=1;day<=12;day++){
     g.day=day;a.startDay();
     const o=a.activeOrder();
     for(let n=0;n<o.pieces;n++){
       a.tapSlot(n);let s=g.slots[n];
       if(day>=7){a.actionFilling(o.filling);if(o.extraOcto)a.actionFilling('octopus');}
       for(let j=0;j<3;j++){s.phaseCook=11;s.totalCook=o.crispy?52:42;s.innerCook=34;a.tapSlot(n);}
       s.phaseCook=9;s.totalCook=o.crispy?52:42;s.innerCook=34;a.tapSlot(n);
       if(day>=4)for(const t of ['sauce','mayo','katsu','aonori'])if(o[t])a.actionTopping(t);
     }
     if(day>=4)a.actionPack();
     results.push({day,served:g.dayServed,score:g.dayScore,pieces:o.pieces,holes:g.slots.filter(x=>x.unlocked).length});
   }
   return results;
 })()`);
 assert.equal(season.length,12);
 assert.ok(season.every((r,i)=>r.served===1&&r.score>0&&r.holes===i+1),'12-day simulation failed '+JSON.stringify(season));
 console.log('TAKOYAKI_SEASON '+JSON.stringify(season));
 assert.deepEqual(errors,[],'browser exceptions: '+JSON.stringify(errors));
 assert.deepEqual(requests.filter(x=>!/favicon/.test(x[1])),[],'network errors: '+JSON.stringify(requests));
 console.log('TAKOYAKI_PASS 12 days + 3 responsive real-browser configurations');
})().catch(e=>{console.error('TAKOYAKI_FAIL '+e.stack);process.exitCode=1}).finally(async()=>{try{ws?.close()}catch{};try{chrome?.kill('SIGTERM')}catch{};await new Promise(r=>server.close(r));});

#!/usr/bin/env node
'use strict';
// Real Chromium input/playthrough audit. The browser serves the actual repo game.
// A read-only QA accessor and stage selector are injected ONLY by this local
// test server. Input, drawing, car driving and collisions use real browser events.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const http=require('node:http');
const cp=require('node:child_process');

const ROOT=path.resolve(__dirname,'..');
const OUT=process.env.KIDSCADE_BRIDGE_AUDIT_OUT||path.join(os.tmpdir(),'kidscade-bridge-browser-audit');
const CHROME=[process.env.CHROME_BIN,'/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].filter(Boolean).find(fs.existsSync);
assert.ok(CHROME,'Real Chromium is required for the bridge playthrough');
fs.mkdirSync(OUT,{recursive:true});
const errors=[],reports=[];
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'};
const hook='window.__bridgeAudit={state:()=>({level:S.level+1,mode:S.mode,pointMode:S.pointMode,waypoints:S.waypoints.length,drawLength:S.drawLength,bridgeReady:S.bridgeReady,drawing:S.drawing,stars:el.stars.textContent}),bank:()=>banks(),level:n=>LEVELS[n-1],setLevel:n=>{S.level=n-1;resetLevel()}};\n})();';
const server=http.createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(pathname==='/favicon.ico'){res.writeHead(204);res.end();return}
  if(pathname==='/kidscade-game-sdk.js'){
    res.writeHead(200,{'content-type':'text/javascript; charset=utf-8'});
    res.end('window.KidscadeGame={start(){},score(){},sound(){},registerPauseHandlers(){}};');
    return;
  }
  const file=path.resolve(ROOT,'.'+pathname);
  if(file!==ROOT&&!file.startsWith(ROOT+path.sep)){res.writeHead(403);res.end();return}
  fs.readFile(file,(err,bytes)=>{
    if(err){res.writeHead(404);res.end('Missing file '+pathname);return}
    if(pathname==='/games/high_bridge_builder/bridge-builder.js'){
      let code=bytes.toString('utf8');
      assert.match(code,/\}\)\(\);\s*$/);
      code=code.replace(/\}\)\(\);\s*$/,hook);
      bytes=Buffer.from(code);
    }
    res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});
    res.end(bytes);
  });
});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let chrome,socket,profile;
async function start(){
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 profile=fs.mkdtempSync(path.join(os.tmpdir(),'kidscade-bridge-chrome-'));
 chrome=cp.spawn(CHROME,[
   '--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu',
   '--remote-debugging-port=0','--remote-allow-origins=*','--disable-background-networking',
   '--user-data-dir='+profile,'about:blank'
 ],{stdio:['ignore','ignore','pipe']});
 let websocket='';
 for(let n=0;n<150;n++){
   if(chrome.exitCode!==null)throw Error('Chromium exited before DevTools started');
   const portFile=path.join(profile,'DevToolsActivePort');
   if(fs.existsSync(portFile)){
     const port=Number(fs.readFileSync(portFile,'utf8').split(/\r?\n/)[0]);
     if(port)try{
       const tabs=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
       websocket=tabs.find(t=>t.type==='page')?.webSocketDebuggerUrl||'';
     }catch(_){}
     if(websocket)break;
   }
   await sleep(100);
 }
 assert.ok(websocket,'Chromium debugging websocket not found');
 socket=new WebSocket(websocket);
 await new Promise((ok,fail)=>{socket.onopen=ok;socket.onerror=fail});
}
const pending=new Map();let sequence=0;
function command(method,params={}){
 return new Promise((resolve,reject)=>{
   const id=++sequence;
   pending.set(id,{resolve,reject});
   socket.send(JSON.stringify({id,method,params}));
 });
}
async function evaluate(expression){
 const result=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
 if(result.exceptionDetails)throw Error('Chromium JS: '+JSON.stringify(result.exceptionDetails).slice(0,1200));
 return result.result?.value;
}
async function until(expr,label,limit=140){
 for(let i=0;i<limit;i++){if(await evaluate(expr))return;await sleep(100)}
 throw Error('Timed out waiting for '+label);
}
async function screenshot(name){
 const r=await command('Page.captureScreenshot',{format:'png',fromSurface:true});
 fs.writeFileSync(path.join(OUT,name+'.png'),Buffer.from(r.data,'base64'));
}
async function setDevice(width,height,mobile){
 await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});
 await command('Emulation.setTouchEmulationEnabled',{enabled:mobile,maxTouchPoints:5});
 await sleep(150);
}
async function location(id){
 return await evaluate('(function(){var r=document.getElementById('+JSON.stringify(id)+').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,width:r.width,height:r.height}})()');
}
async function boardPoint(x,y){
 const r=await evaluate('(function(){var b=document.getElementById("game").getBoundingClientRect();return {left:b.left,top:b.top,width:b.width,height:b.height}})()');
 return {x:r.left+x*r.width/1200,y:r.top+y*r.height/700};
}
async function clickMouse(id){
 const p=await location(id);
 await command('Input.dispatchMouseEvent',{type:'mousePressed',x:p.x,y:p.y,button:'left',clickCount:1});
 await command('Input.dispatchMouseEvent',{type:'mouseReleased',x:p.x,y:p.y,button:'left',clickCount:1});
}
async function touchAt(x,y){
 await command('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x,y,force:1}]});
 await command('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
}
async function tap(id){
 const p=await location(id);
 await touchAt(p.x,p.y);
}
async function stroke(points,touch){
 const screen=[];
 for(const [x,y] of points)screen.push(await boardPoint(x,y));
 if(touch){
   await command('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,...screen[0],force:1}]});
   for(let i=1;i<screen.length;i++){
     await command('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,...screen[i],force:1}]});
     await sleep(12);
   }
   await command('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 }else{
   await command('Input.dispatchMouseEvent',{type:'mouseMoved',...screen[0],button:'none'});
   await command('Input.dispatchMouseEvent',{type:'mousePressed',...screen[0],button:'left',clickCount:1});
   for(let i=1;i<screen.length;i++){
     await command('Input.dispatchMouseEvent',{type:'mouseMoved',...screen[i],button:'left',buttons:1});
     await sleep(12);
   }
   await command('Input.dispatchMouseEvent',{type:'mouseReleased',...screen[screen.length-1],button:'left',clickCount:1});
 }
}
async function reportScene(tag){
 const scene=await evaluate('(function(){var c=document.getElementById("game"),r=c.getBoundingClientRect(),w=c.parentElement.getBoundingClientRect(),a=document.querySelector(".assist-controls").getBoundingClientRect();return {stage:document.getElementById("stageTitle").textContent,viewport:[innerWidth,innerHeight],canvas:{width:r.width,height:r.height,left:r.left,top:r.top},wrap:{width:w.width,height:w.height},control:{width:a.width,height:a.height,bottom:a.bottom},scrollWidth:document.documentElement.scrollWidth,state:window.__bridgeAudit.state()}})()');
 assert.ok(Math.abs(scene.canvas.width/scene.canvas.height-12/7)<.02,'canvas distorted '+tag);
 assert.ok(scene.scrollWidth<=scene.viewport[0]+3,'horizontal scroll overflow '+tag);
 assert.ok(scene.control.bottom<=scene.viewport[1]+3,'controls clipped off bottom '+tag);
 reports.push({tag,...scene});
 return scene;
}
function chooseRoute(stage,b,level){
 const groups=new Map();
 for(const o of level.obstacles){
   if(!groups.has(o.at))groups.set(o.at,[]);
   groups.get(o.at).push(o);
 }
 const waypoints=[];
 for(const [at,obstacles] of [...groups.entries()].sort((a,b)=>a[0]-b[0])){
   const ups=obstacles.filter(o=>o.type==='up').map(o=>o.top);
   const downs=obstacles.filter(o=>o.type==='down').map(o=>o.bottom);
   const top=ups.length?Math.min(...ups):999;
   const bottom=downs.length?Math.max(...downs):0;
   let y;
   if(top<999&&bottom>0)y=(top-25+bottom+85)/2;
   else if(top<999)y=top-80;
   else y=bottom+95;
   const pad=Math.max(...obstacles.map(o=>o.w))/2+55;
   const mid=b.leftX+(b.rightX-b.leftX)*at;
   const entry=Math.max(b.leftX+5,mid-pad);
   const leave=Math.min(b.rightX-5,mid+pad);
   waypoints.push({x:waypoints.length?Math.max(waypoints[waypoints.length-1].x+2,entry):entry,y});
   waypoints.push({x:Math.max(waypoints[waypoints.length-1].x+2,leave),y});
 }
 return waypoints;
}
async function pointRoute(stage,name){
 await evaluate('window.__bridgeAudit.setLevel('+stage+')');
 const b=await evaluate('window.__bridgeAudit.bank()');
 const level=await evaluate('window.__bridgeAudit.level('+stage+')');
 const route=chooseRoute(stage,b,level);
 if(route.length===0)throw Error('pointRoute needs obstacles on stage '+stage);
 for(let i=0;i<route.length;i++){
   const p=await boardPoint(route[i].x,route[i].y);
   await touchAt(p.x,p.y);
 }
 const state=await evaluate('window.__bridgeAudit.state()');
 assert.equal(state.waypoints,route.length,'lost real touch waypoint at stage '+stage);
 await tap('goBtn');
 await until('window.__bridgeAudit.state().mode==="end"','stage '+stage+' finish',160);
 const result=await evaluate('window.__bridgeAudit.state()');
 await reportScene(name||'stage-'+stage);
 await screenshot(name||'stage-'+stage);
 assert.match(result.stars,/★/,'stage must award a star');
 return {stage,routeCount:route.length,stars:result.stars};
}
async function main(){
 await start();
 socket.onmessage=e=>{
   const msg=JSON.parse(e.data);
   if(msg.method==='Runtime.exceptionThrown')errors.push(msg.params?.exceptionDetails?.exception?.description||msg.params?.exceptionDetails?.text||'exception');
   if(!msg.id)return;
   const cb=pending.get(msg.id);
   if(!cb)return;pending.delete(msg.id);
   msg.error?cb.reject(Error(msg.error.message)):cb.resolve(msg.result||{});
 };
 await command('Page.enable');await command('Runtime.enable');
 await setDevice(1280,800,false);
 await command('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/games/high_bridge_builder/index.html'});
 await until('!!window.__bridgeAudit','game loaded');
 assert.equal(await evaluate('document.title'),'다리야 버텨줘!');
 await reportScene('desktop-initial');
 await screenshot('desktop-initial');
 const b=await evaluate('window.__bridgeAudit.bank()');
 const startPoint=[b.leftX+12,b.leftY],finishPoint=[b.rightX-55,b.rightY];
 await stroke(Array.from({length:21},(_,i)=>{
   const t=i/20;return [startPoint[0]+(finishPoint[0]-startPoint[0])*t,startPoint[1]+(finishPoint[1]-startPoint[1])*t]
 }),false);
 await until('window.__bridgeAudit.state().mode==="end"','desktop first crossing',140);
 assert.match(await evaluate('document.getElementById("resultTitle").textContent'),/건넜다/);
 await screenshot('desktop-stage-1-win');
 await clickMouse('continueBtn');
 assert.equal((await evaluate('window.__bridgeAudit.state()')).level,2);
 // A straight line into the rock should fail; then a retry should work.
 const bank2=await evaluate('window.__bridgeAudit.bank()');
 await stroke(Array.from({length:22},(_,i)=>{
  const t=i/21;return [bank2.leftX+12+(bank2.rightX-bank2.leftX-75)*t,bank2.leftY+(bank2.rightY-bank2.leftY)*t]
 }),false);
 await until('window.__bridgeAudit.state().mode==="run"','collision car started',30);
 await until('window.__bridgeAudit.state().mode==="build" && document.getElementById("toast").textContent.includes("장애물")','rock collision',130);
 assert.ok((await evaluate('document.getElementById("toast").textContent')).includes('장애물'),'failed crossing must explain collision');
 await screenshot('desktop-stage-2-collision');
 await clickMouse('resetBtn');
 assert.equal((await evaluate('window.__bridgeAudit.state()')).mode,'build');
 // Tablets use actual Chrome touch events rather than directly calling game handlers.
 await setDevice(1024,768,true);
 await reportScene('tablet-1024-initial');
 await screenshot('tablet-1024-initial');
 await tap('modeBtn');
 assert.equal((await evaluate('window.__bridgeAudit.state()')).pointMode,true);
 for(const stage of [2,8,16,24,32,40]){
   await pointRoute(stage,'tablet-stage-'+stage);
 }
 await setDevice(932,430,true);
 await reportScene('tablet-landscape-initial');
 await screenshot('tablet-landscape-initial');
 await pointRoute(3,'tablet-landscape-stage-3');
 // Try the other input style on a wide tablet.
 await tap('modeBtn');
 assert.equal((await evaluate('window.__bridgeAudit.state()')).pointMode,false);
 await evaluate('window.__bridgeAudit.setLevel(1)');
 const bank3=await evaluate('window.__bridgeAudit.bank()');
 await stroke(Array.from({length:23},(_,i)=>{
   const t=i/22;return [bank3.leftX+10+(bank3.rightX-bank3.leftX-70)*t,bank3.leftY+(bank3.rightY-bank3.leftY)*t]
 }),true);
 await until('window.__bridgeAudit.state().mode==="end"','touch-swipe on wide tablet',140);
 await screenshot('tablet-landscape-swipe-win');
 await reportScene('tablet-landscape-swipe-win');
 // Portrait is a limited orientation, but it should not throw or lose buttons.
 await setDevice(390,844,true);
 await reportScene('tablet-portrait');
 await screenshot('tablet-portrait');
 assert.equal(errors.length,0,'uncaught runtime errors: '+JSON.stringify(errors));
 const summary={passed:true,checks:['desktop 1 success','desktop 2 collision','touch point stages 2,8,16,24,32,40,3','wide tablet swipe success','tablet/portrait layouts'],reports,errors};
 fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(summary,null,2));
 console.log('[bridge-browser] PASS '+JSON.stringify(summary));
}
main().catch(e=>{
 console.error('[bridge-browser] FAIL',e.stack||e);
 console.error('[bridge-browser] latest reports '+JSON.stringify(reports.slice(-4)));
 fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify({passed:false,error:String(e.stack||e),reports,errors},null,2));
 process.exitCode=1;
}).finally(async()=>{
 try{socket?.close()}catch(_){}
 if(chrome&&chrome.exitCode===null&&chrome.signalCode===null){
   await new Promise(resolve=>{
     let done=false,force,deadline;
     const finish=()=>{if(done)return;done=true;clearTimeout(force);clearTimeout(deadline);chrome.removeListener('close',finish);resolve()};
     chrome.once('close',finish);
     try{chrome.kill('SIGTERM')}catch(_){}
     force=setTimeout(()=>{try{chrome.kill('SIGKILL')}catch(_){}},2000);
     deadline=setTimeout(finish,4000);
   });
 }
 await new Promise(resolve=>server.close(resolve));
 if(profile)try{await fs.promises.rm(profile,{recursive:true,force:true,maxRetries:12,retryDelay:200})}catch(e){console.warn('[bridge-browser] nonfatal cleanup',e.code)}
});

#!/usr/bin/env node
'use strict';
// Real Chrome + WebGL / desktop and touch visual traversal of Ota prologue.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const http=require('node:http'),cp=require('node:child_process');
const sharp=require('sharp'),{once}=require('node:events');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.resolve(process.env.KIDSCADE_OTA_AUDIT_OUT||path.join(os.tmpdir(),'kidscade-ota-audit'));
fs.mkdirSync(OUT,{recursive:true});
const CHROME=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
if(!CHROME)throw Error('Chromium required');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.png':'image/png'};
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  const file=path.resolve(ROOT,'.'+decodeURIComponent(url.pathname));
  if(file!==ROOT&&!file.startsWith(ROOT+path.sep)){res.writeHead(403);res.end();return;}
  fs.readFile(file,(err,data)=>{
    if(err){res.writeHead(url.pathname==='/favicon.ico'?204:404);res.end();return;}
    res.writeHead(200,{'content-type':types[path.extname(file)]||'application/octet-stream'});res.end(data);
  });
});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const report={version:'ota-prologue-browser-v1',desktop:[],mobile:[],errors:[]};
let chrome,ws,userDir,pending=new Map(),id=0;
function send(method,params={}) {
  return new Promise((resolve,reject)=>{const next=++id;pending.set(next,{resolve,reject});ws.send(JSON.stringify({id:next,method,params}));});
}
async function evalPage(expression) {
  const reply=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(reply.exceptionDetails)throw Error('Browser evaluation: '+JSON.stringify(reply.exceptionDetails).slice(0,900));
  return reply.result?.value;
}
const snap=()=>evalPage('window.OtaDebug?.snapshot()');
async function screenshot(file,category){
  const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  const bytes=Buffer.from(r.data,'base64'),dest=path.join(OUT,file);
  fs.writeFileSync(dest,bytes);
  const {data,info}=await sharp(bytes).resize(160,90,{fit:'fill'}).removeAlpha().raw().toBuffer({resolveWithObject:true});
  const lum=[];
  for(let i=0;i<data.length;i+=3)lum.push(.2126*data[i]+.7152*data[i+1]+.0722*data[i+2]);
  const mean=lum.reduce((a,b)=>a+b,0)/lum.length;
  const nonblack=lum.filter(x=>x>24).length/lum.length;
  const bright=lum.filter(x=>x>115).length/lum.length;
  const stats={file,bytes:bytes.length,w:info.width,h:info.height,averageBrightness:+mean.toFixed(1),
    nonblackRatio:+nonblack.toFixed(3),brightRatio:+bright.toFixed(3)};
  report[category].push(stats);
  assert.ok(bytes.length>3500,'Blank captured frame: '+file);
  return stats;
}
async function key(code,pressed) {
  return evalPage("document.dispatchEvent(new KeyboardEvent('"+(pressed?'keydown':'keyup')+"',{bubbles:true,code:"+JSON.stringify(code)+",key:"+JSON.stringify(code)+"}))");
}
async function move(code,ms,withShift=false) {
  if(withShift)await key('ShiftLeft',true);
  await key(code,true);await sleep(ms);await key(code,false);
  if(withShift)await key('ShiftLeft',false);
}
async function interact(){await key('KeyE',true);await sleep(65);await key('KeyE',false);}
async function ensureStage(stage,context){
  const got=await snap();
  assert.equal(got.stage,stage,context+': '+JSON.stringify(got));
  return got;
}
async function moveUntil(axis,target,stage,seconds=9) {
  const isX=axis==='x';let count=0;
  while(count++<Math.ceil(seconds*8)){
    const s=await snap();
    if(s.stage==='lost')throw Error('Monster caught the player while walking to '+axis+'='+target+' / '+JSON.stringify(s));
    const current=s.player[axis],remaining=target-current;
    if(Math.abs(remaining)<.40) return s;
    const code=isX?(remaining>0?'KeyD':'KeyA'):(remaining>0?'KeyS':'KeyW');
    await move(code,Math.max(75,Math.min(210,Math.round(Math.abs(remaining)/4.85*850))),true);
  }
  const last=await snap();
  if(Math.abs(last.player[axis]-target)<.43)return last;
  throw Error('Could not reach '+axis+' '+target+': '+JSON.stringify(last));
}
(async()=>{
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const origin='http://127.0.0.1:'+server.address().port;
  userDir=fs.mkdtempSync(path.join(os.tmpdir(),'ota-cdp-'));
  chrome=cp.spawn(CHROME,['--headless=new','--no-sandbox','--disable-dev-shm-usage',
    '--use-angle=swiftshader','--enable-unsafe-swiftshader','--remote-allow-origins=*',
    '--disable-background-networking','--no-first-run','--remote-debugging-port=0','--user-data-dir='+userDir,'about:blank'],
    {stdio:['ignore','ignore','pipe']});
  let stderr='';chrome.stderr.on('data',d=>{stderr=(stderr+String(d)).slice(-3000);});
  let target;
  for(let n=0;n<240;n++){
    if(chrome.exitCode!==null)throw Error('Chrome exited: '+stderr);
    const file=path.join(userDir,'DevToolsActivePort');
    if(fs.existsSync(file)){
      const port=+fs.readFileSync(file,'utf8').split(/\r?\n/)[0];
      try{
        const list=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
        target=list.find(t=>t.type==='page');if(target)break;
      }catch(_){}
    }await sleep(100);
  }
  assert.ok(target,'No Chrome CDP target: '+stderr);
  ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((ok,bad)=>{ws.onopen=ok;ws.onerror=bad;});
  ws.onmessage=e=>{
    const m=JSON.parse(e.data);
    if(m.method==='Runtime.exceptionThrown')report.errors.push(m.params?.exceptionDetails?.exception?.description||m.params?.exceptionDetails?.text||'exception');
    if(m.method==='Log.entryAdded'&&m.params?.entry?.level==='error')report.errors.push(m.params.entry.text);
    if(!m.id)return;const p=pending.get(m.id);if(!p)return;pending.delete(m.id);
    if(m.error)p.reject(Error(m.error.message));else p.resolve(m.result||{});
  };
  await send('Page.enable');await send('Runtime.enable');await send('Log.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:origin+'/games/high_ota_typographic_horror/index.html?visual-audit=1'});
  for(let i=0;i<95;i++){if(await snap())break;await sleep(80);}
  assert.ok(await snap(),'Game never initialized: '+report.errors.join('; '));
  report.renderer=await evalPage("(()=>({webgl:!!document.querySelector('#scene').getContext('webgl2'),canvas:{w:document.querySelector('#scene').width,h:document.querySelector('#scene').height},title:document.title}))()");
  await screenshot('01-intro-desktop.png','desktop');
  await evalPage("document.getElementById('start').click()");
  await sleep(300);
  await screenshot('02-management-room.png','desktop');
  // Approach the desk without moving inside the collision volume.
  await moveUntil('x',-1.4,'console');
  await moveUntil('z',3.45,'console');
  const near=await snap();
  report.consoleApproach=near;
  await interact();await ensureStage('anomaly','read management report');
  await screenshot('03-anomaly.png','desktop');
  await moveUntil('x',0,'anomaly');
  await moveUntil('z',-15.45,'anomaly',15);
  await ensureStage('chase','monster trigger');
  await screenshot('04-pursuit.png','desktop');
  // Stay ahead by sprinting and veer toward the right-hand hiding locker.
  await moveUntil('z',-22.35,'chase',4);
  await moveUntil('x',2.35,'chase',3);
  const preHide=await snap();report.preHide=preHide;
  await interact();await ensureStage('hiding','enter locker');
  await screenshot('05-hidden-in-locker.png','desktop');
  await sleep(5050);
  await ensureStage('door','enemy loses player in locker');
  await interact();
  const left=await snap();assert.equal(left.hidden,false,'Exited locker after danger passes');
  await moveUntil('x',0,'door');
  await moveUntil('z',-28.55,'door');
  const blocked=await evalPage('window.OtaRules.canMove({doorFixed:false},0,-30.15)');
  assert.equal(blocked,false,'Unrepaired wall is solid');
  await screenshot('06-wall-before-repair.png','desktop');
  await interact();
  assert.equal(await evalPage("document.getElementById('fixPanel').classList.contains('closed')"),false,
    'Repair UI opens within range');
  await screenshot('07-repair-dialog.png','desktop');
  await evalPage("document.querySelector('[data-word=\\\"벽\\\"]').click()");
  assert.equal((await snap()).mistakes,1,'Wrong label increments error');
  await evalPage("document.querySelector('[data-word=\\\"문\\\"]').click()");
  await ensureStage('exit','door repaired');
  await screenshot('08-open-door.png','desktop');
  await moveUntil('z',-35.5,'exit');
  await ensureStage('won','final escape');
  await screenshot('09-victory.png','desktop');

  await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});
  await send('Page.navigate',{url:origin+'/games/high_ota_typographic_horror/index.html?mobile-audit=1'});
  for(let i=0;i<100;i++){if((await snap())?.stage==='console')break;await sleep(85);}
  const mobileUI=await evalPage("(()=>{const stick=document.getElementById('stick').getBoundingClientRect(),buttons=document.getElementById('buttons').getBoundingClientRect();return {coarse:matchMedia('(pointer:coarse)').matches,stickDisplay:getComputedStyle(document.getElementById('mobile')).display,stick:{left:stick.left,right:stick.right,bottom:stick.bottom},buttons:{left:buttons.left,right:buttons.right,bottom:buttons.bottom},viewport:{width:innerWidth,height:innerHeight},canvas:{w:document.querySelector('#scene').width,h:document.querySelector('#scene').height}}})()");
  report.mobileUI=mobileUI;
  assert.equal(mobileUI.stickDisplay,'block','Mobile joystick is visible');
  assert.ok(mobileUI.stick.right<mobileUI.buttons.left,'Touch controls do not collide');
  await screenshot('10-intro-mobile.png','mobile');
  await evalPage("document.getElementById('start').click()");
  await sleep(250);
  await screenshot('11-gameplay-mobile.png','mobile');
  await evalPage("document.getElementById('action').click()");
  const before=await snap();
  assert.equal(before.stage,'console','Far action cannot accidentally skip objective');
  // Touch emulation: real event reaches joystick and drives 3D position.
  const stickXY=await evalPage("(()=>{const r=document.getElementById('stick').getBoundingClientRect();return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)}})()");
  await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:stickXY.x,y:stickXY.y,id:1}]});
  await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:stickXY.x,y:stickXY.y-30,id:1}]});
  await sleep(700);
  await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await sleep(150);
  const after=await snap();
  report.mobileMove={before:before.player,after:after.player,deltaZ:after.player.z-before.player.z};
  assert.ok(after.player.z<before.player.z-.3,'Mobile joystick must move forward');
  await screenshot('12-mobile-after-joystick.png','mobile');
  assert.deepEqual(report.errors,[],'Browser errors must be empty');
  console.log('OTA BROWSER AUDIT '+JSON.stringify(report,null,2));
  fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2)+'\n');
})().catch(err=>{
  report.errors.push(err.stack||String(err));
  fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.error('OTA BROWSER AUDIT FAILED\n'+JSON.stringify(report,null,2));
  process.exitCode=1;
}).finally(async()=>{try{ws?.close();}catch(_){}try{chrome?.kill('SIGTERM');}catch(_){}try{server.close();}catch(_){}if(userDir)try{fs.rmSync(userDir,{recursive:true,force:true});}catch(_){}});

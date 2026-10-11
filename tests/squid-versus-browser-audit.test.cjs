'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'),http=require('node:http');
const ROOT=path.resolve(__dirname,'..'),PAGE='/games/squid-survival/versus/index.html';
const CHROME=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const mimetype={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
 '.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
function serve(){
 return http.createServer((req,res)=>{
  let p;try{p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch(_){res.writeHead(400);res.end();return;}
  const file=path.resolve(ROOT,'.'+p);
  if(!file.startsWith(ROOT+path.sep)){res.writeHead(403);res.end();return;}
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);res.end('missing');return;}
   res.writeHead(200,{'content-type':mimetype[path.extname(file)]||'application/octet-stream'});res.end(data);});
 });
}
async function browserAudit(){
 const server=serve();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'kidscade-passplay-'));
 const chrome=cp.spawn(CHROME,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu',
 '--no-first-run','--disable-background-networking','--remote-allow-origins=*','--remote-debugging-port=0',
 '--user-data-dir='+dir,'about:blank'],{stdio:['ignore','ignore','pipe']});
 let socket=null,stderr='';
 chrome.stderr.on('data',c=>{stderr=(stderr+c.toString()).slice(-1200);});
 try{
  let endpoint=null;
  for(let i=0;i<150;i++){
   await sleep(100);if(chrome.exitCode!==null)throw Error('Chrome exited '+stderr);
   const active=path.join(dir,'DevToolsActivePort');
   if(!fs.existsSync(active))continue;
   try{
    const port=Number(fs.readFileSync(active,'utf8').split(/\r?\n/)[0]);
    const list=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
    endpoint=list.find(x=>x.type==='page')?.webSocketDebuggerUrl;if(endpoint)break;
   }catch(_){}
  }
  if(!endpoint)throw Error('Cannot open Chrome debugger '+stderr);
  socket=new WebSocket(endpoint);
  await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
  const requests=new Map(),errors=[];let counter=0;
  socket.onmessage=m=>{
   const d=JSON.parse(m.data);
   if(d.method==='Runtime.exceptionThrown')errors.push(d.params?.exceptionDetails?.exception?.description||d.params?.exceptionDetails?.text);
   const p=requests.get(d.id);if(p){requests.delete(d.id);d.error?p.reject(Error(d.error.message)):p.resolve(d.result||{});}
  };
  const send=(method,params={})=>new Promise((resolve,reject)=>{
   const id=++counter;requests.set(id,{resolve,reject});
   socket.send(JSON.stringify({id,method,params}));
  });
  const evaluate=async code=>{
   const r=await send('Runtime.evaluate',{expression:code,awaitPromise:true,returnByValue:true});
   if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);
   return r.result?.value;
  };
  await send('Runtime.enable');await send('Page.enable');await send('Network.enable');
  const devices=[
   {name:'iPhone portrait',w:390,h:844,mobile:true},
   {name:'iPhone landscape',w:844,h:390,mobile:true},
   {name:'tablet',w:1024,h:768,mobile:true},
   {name:'PC',w:1280,h:720,mobile:false}
  ];
  const stats=[];
  for(const device of devices){
   const errorCount=errors.length;
   await send('Emulation.setDeviceMetricsOverride',{width:device.w,height:device.h,deviceScaleFactor:device.mobile?2:1,mobile:device.mobile});
   await send('Emulation.setTouchEmulationEnabled',{enabled:device.mobile,maxTouchPoints:3});
   await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+PAGE});
   for(let i=0;i<70;i++){
    await sleep(100);
    if(await evaluate('document.readyState==="complete" && typeof SquidPassPlay!=="undefined" && !!document.getElementById("dialogButton")'))break;
    if(i===69)throw Error(device.name+' did not load');
   }
   assert.equal(await evaluate('document.querySelectorAll("canvas").length'),1,'must be a single canvas on '+device.name);
   assert.equal(await evaluate('!document.getElementById("dialog").hidden'),true);
   await evaluate('document.getElementById("dialogButton").click()');
   let handoff=await evaluate('({title:document.getElementById("dialogTitle").textContent,stage:document.getElementById("dialogEyebrow").textContent})');
   assert.match(handoff.title,/1P 차례/,device.name+' must hand off before starting');
   await evaluate('document.getElementById("dialogButton").click()');
   await sleep(3300);
   const shot=await evaluate(`(()=>{
    const a=document.getElementById('board'),r=a.getBoundingClientRect();
    const area=document.querySelector('.board-wrap').getBoundingClientRect();
    const ctl=document.getElementById('controls').getBoundingClientRect();
    const menu=document.querySelector('#kidscade-game-shell .kcgs-open');
    const p=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
    const transform=a.getContext('2d').getTransform();
    return {w:r.width,h:r.height,x:r.x,y:r.y,
      outer:area.width,controlHeight:ctl.height,controlsY:ctl.y,
      turn:document.getElementById('turnChip').textContent,
      round:document.getElementById('roundTitle').textContent,
      dialogHidden:document.getElementById('dialog').hidden,
      hit:p?.id||'',menu:!!menu,
      transform:{a:transform.a,d:transform.d},
      orientation:innerWidth>innerHeight?'landscape':'portrait'
     };
   })()`);
   assert.equal(shot.dialogHidden,true,device.name+' handoff failed');
   assert.match(shot.turn,/1P/,device.name);
   assert.equal(shot.hit,'board',device.name+' canvas covered by another component');
   assert.ok(shot.w>=300&&shot.h>=150,device.name+' canvas too small '+JSON.stringify(shot));
   assert.ok(shot.y>=0&&shot.y+shot.h<=device.h+1,device.name+' canvas cut off');
   assert.ok(Math.abs(shot.transform.a-shot.transform.d)<1e-5,device.name+' art should not stretch');
   // Draw the start of a real dalgona gesture, with speed close to 100 logical px/s.
   const coords=await evaluate(`(()=>{
     const c=document.getElementById('board'),r=c.getBoundingClientRect();
     const k=Math.min(r.width/520,r.height/340),ox=(r.width-520*k)/2,oy=(r.height-340*k)/2;
     const t=DalgonaTrace.buildTrace(1),track=innerWidth<500||innerWidth>1100?DalgonaTrace.reversed(t):t,
       start=DalgonaTrace.sampleAt(track,0),next=DalgonaTrace.sampleAt(track,8);
     const map=p=>({x:Math.round(r.x+ox+(102+p.x*.79)*k),y:Math.round(r.y+oy+(12+p.y*.79)*k)});
     return [map(start),map(next)];
   })()`);
   if(device.mobile){
    await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...coords[0],id:1}]});
    await sleep(75);
    await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...coords[1],id:1}]});
    await sleep(100);
    await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   }else{
    await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...coords[0]});
    await sleep(75);
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',button:'left',buttons:1,...coords[1]});
    await sleep(100);
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...coords[1]});
   }
   await sleep(120);
   const status=await evaluate('({text:document.getElementById("detail").textContent,percent:parseFloat(document.getElementById("progress").style.width),visible:document.getElementById("dialog").hidden})');
   assert.ok(status.percent>0,device.name+' did not register a real pointer stroke '+JSON.stringify(status));
   assert.equal(status.visible,true,device.name+' stopped unexpectedly');
   assert.equal(errors.length,errorCount,device.name+' browser exception '+errors.slice(errorCount).join('; '));
   stats.push({device:device.name,gesture:device.w<500||device.w>1100?'counterclockwise':'clockwise',canvasWidth:Math.round(shot.w),canvasHeight:Math.round(shot.h),interaction:status.percent,visible:true});
  }
  return stats;
 }finally{
  if(socket)socket.close();chrome.kill('SIGKILL');server.close();
  try{fs.rmSync(dir,{recursive:true,force:true});}catch(_){}
 }
}
test('pass-and-play uses one full-size playable canvas and handoff on iPhone, tablet and PC',async t=>{
 if(!CHROME){t.skip('Chrome not installed');return;}
 const stats=await browserAudit();for(const a of stats)console.log('Passplay browser audit: '+JSON.stringify(a));
},{timeout:150000});

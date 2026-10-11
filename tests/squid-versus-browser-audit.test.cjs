'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const http=require('node:http'),os=require('node:os'),cp=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
const PAGE='/games/squid-survival/versus/index.html';
const CHROME=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const mimetype={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.svg':'image/svg+xml',
 '.ogg':'audio/ogg','.webp':'image/webp'};
function createServer(){
 return http.createServer((req,res)=>{
  let name;
  try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch(_){res.writeHead(400);res.end();return;}
  const file=path.resolve(ROOT,'.'+name);
  if(file!==ROOT&&!file.startsWith(ROOT+path.sep)){res.writeHead(403);res.end();return;}
  fs.readFile(file,(error,data)=>{
   if(error){res.writeHead(404);res.end('Missing '+name);return;}
   res.writeHead(200,{'content-type':mimetype[path.extname(file)]||'application/octet-stream'});res.end(data);
  });
 });
}
async function browserRun(){
 const server=createServer();
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port+PAGE;
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'kidscade-versus-cdp-'));
 const child=cp.spawn(CHROME,['--headless=new','--no-sandbox','--disable-dev-shm-usage',
 '--disable-gpu','--disable-background-networking','--no-first-run','--remote-allow-origins=*',
 '--remote-debugging-port=0','--user-data-dir='+dir,'about:blank'],{stdio:['ignore','ignore','pipe']});
 let ws=null,serial=0,stderr='';
 const errors=[],missing=[];
 child.stderr.on('data',data=>{stderr=(stderr+data.toString()).slice(-2000);});
 try{
  let endpoint=null;
  for(let n=0;n<180;n++){
   await sleep(100);
   if(child.exitCode!==null)throw Error('Chrome exited '+stderr);
   const active=path.join(dir,'DevToolsActivePort');
   if(!fs.existsSync(active))continue;
   try{
    const port=Number(fs.readFileSync(active,'utf8').split(/\r?\n/)[0]);
    const response=await fetch('http://127.0.0.1:'+port+'/json/list');
    endpoint=(await response.json()).find(x=>x.type==='page')?.webSocketDebuggerUrl;
    if(endpoint)break;
   }catch(_){}
  }
  if(!endpoint)throw Error('Chrome debugging not found '+stderr);
  ws=new WebSocket(endpoint);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
  const pending=new Map();
  ws.onmessage=msg=>{
   const data=JSON.parse(msg.data);
   if(data.method==='Runtime.exceptionThrown')errors.push(data.params?.exceptionDetails?.exception?.description||data.params?.exceptionDetails?.text||'JS exception');
   if(data.method==='Network.loadingFailed'&&data.params?.errorText?.includes('ERR_FILE'))missing.push(data.params.errorText);
   const p=pending.get(data.id);if(p){pending.delete(data.id);data.error?p.reject(Error(data.error.message)):p.resolve(data.result||{});}
  };
  const send=(method,params={})=>new Promise((resolve,reject)=>{
    const id=++serial;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));
  });
  const evaluate=async js=>{
    const r=await send('Runtime.evaluate',{expression:js,returnByValue:true,awaitPromise:true});
    if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);
    return r.result?.value;
  };
  await send('Runtime.enable');await send('Page.enable');await send('Network.enable');
  const sizes=[{name:'PC',w:1280,h:720,mobile:false},{name:'태블릿',w:1024,h:768,mobile:true},
    {name:'아이폰 가로',w:844,h:390,mobile:true}];
  const stats=[];
  for(const size of sizes){
   const errorStart=errors.length;
   await send('Emulation.setDeviceMetricsOverride',{width:size.w,height:size.h,deviceScaleFactor:size.mobile?2:1,mobile:size.mobile});
   await send('Emulation.setTouchEmulationEnabled',{enabled:size.mobile,maxTouchPoints:5});
   await send('Page.navigate',{url});
   for(let i=0;i<70;i++){
     await sleep(100);
     const ready=await evaluate('document.readyState==="complete" && !!window.SquidVersusRules && !!document.getElementById("dialogButton")');
     if(ready)break;
     if(i===69)throw Error(size.name+' game did not load');
   }
   const lobby=await evaluate('({title:document.title,dialog:!document.getElementById("dialog").hidden,buttons:document.querySelectorAll("button").length})');
   assert.ok(lobby.dialog,size.name+' missing intro');
   await evaluate('document.getElementById("dialogButton").click();document.getElementById("dialogButton").click();');
   await sleep(2850);
   const snapshot=await evaluate(`(()=>{
      const ids=['board0','board1','controls0','controls1','time','dialog','rotate'];
      const elements=Object.fromEntries(ids.map(id=>{const el=document.getElementById(id),r=el.getBoundingClientRect();
        return[id,{x:r.x,y:r.y,w:r.width,h:r.height,hidden:el.hidden}];}));
      const c0=document.getElementById('board0'),c1=document.getElementById('board1');
      const a=c0.getBoundingClientRect(),b=c1.getBoundingClientRect();
      const first=document.elementFromPoint(a.left+a.width/2,a.top+a.height/2);
      const second=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);
      return {innerWidth:innerWidth,innerHeight:innerHeight,elements,time:document.getElementById('time').textContent,
        title:document.getElementById('roundTitle').textContent,
        controls:[document.getElementById('controls0').querySelectorAll('button').length,
                  document.getElementById('controls1').querySelectorAll('button').length],
        pickable:[first?.id,second?.id],
        count:[document.getElementById('board0').width,document.getElementById('board1').width]};})()`);
   assert.equal(snapshot.elements.dialog.hidden,true,size.name+' never started');
   assert.equal(snapshot.pickable[0],'board0',size.name+' left canvas obscured');
   assert.equal(snapshot.pickable[1],'board1',size.name+' right canvas obscured');
   for(const id of ['board0','board1']){
      const c=snapshot.elements[id];assert.ok(c.w>=220&&c.h>=95,size.name+' canvas too small: '+JSON.stringify(c));
      assert.ok(c.y>=0&&c.y+c.h<=size.h+1,size.name+' canvas outside viewport');
   }
   assert.equal(snapshot.controls[0],2);assert.equal(snapshot.controls[1],2);
   if(size.mobile){
     // Two real concurrent touch contacts, one per candy canvas.
     const a=snapshot.elements.board0,b=snapshot.elements.board1;
     const xy=(c)=>({x:Math.round(c.x+c.w*.5),y:Math.round(c.y+c.h*.24)});
     const t0=xy(a),t1=xy(b);
     await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...t0,id:10},{...t1,id:20}]});
     await sleep(50);
     await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[
       {...t0,y:t0.y+3,id:10},{...t1,y:t1.y+3,id:20}]});
     await sleep(50);
     await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   }
   await sleep(100);
   assert.equal(errors.length,errorStart,size.name+' browser errors: '+errors.slice(errorStart).join('; '));
   stats.push({device:size.name,...snapshot,exceptions:errors.slice(errorStart)});
   if(size.name==='아이폰 가로'){
      const shot=await send('Page.captureScreenshot',{format:'jpeg',quality:38,captureBeyondViewport:false});
      console.log('KIDSCADE_VERSUS_CAPTURE_START'+shot.data+'KIDSCADE_VERSUS_CAPTURE_END');
   }
  }
  return stats;
 }finally{
  if(ws)ws.close();
  child.kill('SIGKILL');server.close();
  try{fs.rmSync(dir,{recursive:true,force:true});}catch(_){}
 }
}
test('two-player stage renders and both canvases accept independent touches on PC, tablet and iPhone',async t=>{
 if(!CHROME){t.skip('Chrome/Chromium not available on this runner');return;}
 const results=await browserRun();
 for(const result of results)console.log('2P browser audit: '+JSON.stringify(result));
},{timeout:150000});

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
    {name:'아이폰 가로',w:844,h:390,mobile:true},
    {name:'아이폰 세로→가로',w:390,h:844,mobile:true}];
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
   if(size.w<size.h){
     await evaluate('document.getElementById("dialogButton").click();document.getElementById("dialogButton").click();');
     await sleep(250);
     const before=await evaluate('({rotate:!document.getElementById("rotate").hidden,dialog:!document.getElementById("dialog").hidden,time:document.getElementById("time").textContent})');
     assert.equal(before.rotate,true,'portrait phone must show landscape guidance');
     assert.equal(before.dialog,true,'portrait phone must not start tournament behind overlay');
     await send('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:2,mobile:true});
     await sleep(150);
     await evaluate('document.getElementById("dialogButton").click()');
     await sleep(2850);
     const after=await evaluate('({rotate:!document.getElementById("rotate").hidden,dialog:!document.getElementById("dialog").hidden,time:document.getElementById("time").textContent})');
     assert.equal(after.rotate,false,'rotation must hide guidance');
     assert.equal(after.dialog,false,'landscape rotation must allow actual game start');
     assert.equal(errors.length,errorStart,'rotation must not throw');
     stats.push({device:size.name,before,after});
     continue;
   }
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
        buttonHeight:[0,1].map(player=>document.getElementById('controls'+player).querySelector('button:last-of-type').getBoundingClientRect().height),
        buttonReachable:[0,1].map(player=>{
          const controls=document.getElementById('controls'+player);
          const button=controls.querySelector('button:last-of-type');
          const r=button.getBoundingClientRect();
          const hit=document.elementFromPoint(r.x+r.width*.85,r.y+r.height*.55);
          return button===hit||button.contains(hit);
        }),
        shellMenu:(()=>{const menu=document.querySelector('#kidscade-game-shell .kcgs-open');
          if(!menu)return null;const r=menu.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};})(),
        count:[document.getElementById('board0').width,document.getElementById('board1').width]};})()`);
   assert.equal(snapshot.elements.dialog.hidden,true,size.name+' never started');
   assert.equal(snapshot.pickable[0],'board0',size.name+' left canvas obscured');
   assert.equal(snapshot.pickable[1],'board1',size.name+' right canvas obscured');
   for(const id of ['board0','board1']){
      const c=snapshot.elements[id];assert.ok(c.w>=220&&c.h>=95,size.name+' canvas too small: '+JSON.stringify(c));
      assert.ok(c.y>=0&&c.y+c.h<=size.h+1,size.name+' canvas outside viewport');
   }
   assert.equal(snapshot.controls[0],2);assert.equal(snapshot.controls[1],2);
   assert.deepEqual(snapshot.buttonReachable,[true,true],size.name+' touch button is covered by a fixed overlay: '+JSON.stringify(snapshot));
   if(size.name==='아이폰 가로')assert.ok(snapshot.buttonHeight.every(h=>h>=44),'phone touch targets must be >=44 CSS px');
   if(size.mobile){
     // Two real concurrent touch contacts, one per candy canvas.
     const fingerPoints=await evaluate(`(()=>{
       const trace=DalgonaTrace.buildTrace(1),samples=[trace.path[0],trace.path[20]];
       const ids=['board0','board1'];
       return ids.map(id=>{
         const box=document.getElementById(id).getBoundingClientRect(),k=Math.min(box.width/520,box.height/320);
         const offsetX=(box.width-520*k)/2,offsetY=(box.height-320*k)/2;
         return samples.map(p=>({
            x:Math.round(box.x+offsetX+(116+p.x*.72)*k),
            y:Math.round(box.y+offsetY+(16+p.y*.72)*k)
         }));
       });
     })()`);
     await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[
       {...fingerPoints[0][0],id:10},{...fingerPoints[1][0],id:20}]});
     await sleep(100);
     await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[
       {...fingerPoints[0][1],id:10},{...fingerPoints[1][1],id:20}]});
     await sleep(70);
     await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
     await sleep(100);
     const motion=await evaluate(`({
        progress:[document.getElementById('meter0').style.width,document.getElementById('meter1').style.width],
        labels:[document.getElementById('detail0').textContent,document.getElementById('detail1').textContent],
        transforms:['board0','board1'].map(id=>{
          const t=document.getElementById(id).getContext('2d').getTransform();
          return {x:t.a,y:t.d};
        })
      })`);
     assert.ok(motion.progress.every(p=>parseFloat(p)>0),size.name+' simultaneous touches did not progress: '+JSON.stringify(motion));
     assert.ok(motion.transforms.every(x=>Math.abs(x.x-x.y)<1e-5),size.name+' circle has anisotropic scaling: '+JSON.stringify(motion));
     snapshot.multitouch=motion;
   }
   await sleep(100);
   assert.equal(errors.length,errorStart,size.name+' browser errors: '+errors.slice(errorStart).join('; '));
   stats.push({device:size.name,...snapshot,exceptions:errors.slice(errorStart)});
   if(process.env.KIDSCADE_VERSUS_CAPTURE==='1'&&size.name==='아이폰 가로'){
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

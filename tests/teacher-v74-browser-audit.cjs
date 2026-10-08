#!/usr/bin/env node
'use strict';
// Chrome DevTools Protocol: real WebGL, actual GLTF assets, no mocked renderer.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),cp=require('node:child_process');
const {once}=require('node:events');
const root=path.resolve(__dirname,'..'),wait=ms=>new Promise(ok=>setTimeout(ok,ms));
const chromePath=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(p=>fs.existsSync(p));
if(!chromePath)throw Error('Chrome missing');
const server=http.createServer((req,res)=>{
  try{
    const u=new URL(req.url,'http://127.0.0.1');
    const full=path.resolve(root,'.'+decodeURIComponent(u.pathname));
    if(!full.startsWith(root+path.sep))throw Error('Outside repository');
    fs.readFile(full,(e,data)=>{
      if(e){res.writeHead(404);res.end('NOT FOUND '+u.pathname);return}
      const ext=path.extname(full);
      res.writeHead(200,{'Content-Type':{'.html':'text/html;charset=utf-8','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.gltf':'model/gltf+json','.glb':'model/gltf-binary'}[ext]||'application/octet-stream','Access-Control-Allow-Origin':'*'});
      res.end(data);
    });
  }catch(e){res.writeHead(403);res.end(String(e))}
});
let chrome,ws;
(async()=>{
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const port=server.address().port,dir=fs.mkdtempSync(path.join(os.tmpdir(),'teacher-qa-'));
 chrome=cp.spawn(chromePath,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
   '--enable-webgl','--enable-unsafe-swiftshader',
   '--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+dir,'about:blank'],
   {stdio:['ignore','ignore','pipe']});
 let browserErrors='',target=null;
 chrome.stderr?.on('data',b=>{browserErrors+=String(b).slice(0,500)});
 for(let i=0;i<240;i++){
   await wait(100);
   if(chrome.exitCode!==null)throw Error('Chrome exited '+chrome.exitCode+': '+browserErrors.slice(-500));
   try{
     const p=path.join(dir,'DevToolsActivePort');
     if(!fs.existsSync(p))continue;
     const n=Number(fs.readFileSync(p,'utf8').split(/\n/)[0]);
     const j=await(await fetch('http://127.0.0.1:'+n+'/json/list')).json();
     target=j.find(x=>x.type==='page');if(target)break;
   }catch{}
 }
 if(!target)throw Error('Chrome unavailable at '+chromePath+', process='+chrome.pid+', diagnostic='+browserErrors.slice(-4500));
 ws=new WebSocket(target.webSocketDebuggerUrl);
 await new Promise((yes,no)=>{ws.onopen=yes;ws.onerror=no});
 const pending=new Map(),runtimeErrors=[],networkErrors=[];let seq=0;
 ws.onmessage=e=>{
   const m=JSON.parse(e.data);
   if(m.method==='Runtime.exceptionThrown')runtimeErrors.push(m.params?.exceptionDetails?.exception?.description||m.params?.exceptionDetails?.text);
   if(m.method==='Log.entryAdded'&&m.params?.entry?.level==='error')runtimeErrors.push('console:'+m.params.entry.text);
   if(m.method==='Network.responseReceived'&&m.params?.response?.status>=400)networkErrors.push({status:m.params.response.status,url:m.params.response.url});
   if(!m.id)return;
   const call=pending.get(m.id);if(!call)return;pending.delete(m.id);
   if(m.error)call.no(Error(m.error.message));else call.yes(m.result||{});
 };
 const send=(method,params={})=>new Promise((yes,no)=>{const id=++seq;pending.set(id,{yes,no});ws.send(JSON.stringify({id,method,params}))});
 const evaluate=async expression=>{
   const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
   if(r.exceptionDetails)throw Error('Evaluate failed '+JSON.stringify(r.exceptionDetails).slice(0,650));
   return r.result?.value;
 };
 const shot=async name=>{
   const r=await send('Page.captureScreenshot',{format:'jpeg',quality:34,captureBeyondViewport:false,fromSurface:true});
   const directory=path.join(root,'teacher-visual-audit');
   fs.mkdirSync(directory,{recursive:true});
   fs.writeFileSync(path.join(directory,name+'.jpg'),Buffer.from(r.data,'base64'));
   console.log('TEACHER_QA_IMAGE_'+name+'='+r.data);
 };
 const metrics=()=>evaluate(`(()=>{
   const ids=['hud','dayStrip','campaignStatus','instructionPanel','rosterToggle','studentStrip','guide','joystick','actionButton'];
   const visible=id=>{
     const e=document.getElementById(id),r=e.getBoundingClientRect(),c=getComputedStyle(e);
     return {id,x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height),
       show:c.display!=='none'&&c.visibility!=='hidden'&&r.width>0&&r.height>0};
   };
   return {viewport:[innerWidth,innerHeight],nodes:ids.map(visible),scrollWidth:document.documentElement.scrollWidth};
 })()`);
 await send('Page.enable');await send('Runtime.enable');await send('Log.enable');await send('Network.enable');
 await send('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:'http://127.0.0.1:'+port+'/games/teacher-classroom-sim-prototype/index.html?teacherQa=1'});
 let ready=false;
 for(let i=0;i<250;i++){
   await wait(200);
   try{ready=await evaluate("!!window.__teacherQa && document.querySelector('#startButton').disabled===false")}catch{}
   if(ready)break;
 }
 if(!ready)throw Error('Game never completed GLTF boot: '+JSON.stringify(runtimeErrors).slice(0,1600));
 console.log('TEACHER_QA_BOOT '+JSON.stringify(await evaluate('window.__teacherQa.info()')));
 await send('Runtime.evaluate',{expression:'window.__teacherQa.begin()',userGesture:true,returnByValue:true,awaitPromise:true});
 const audioBoot=await evaluate('window.__teacherQa.audio()');
 console.log('TEACHER_QA_SOUND_BOOT '+JSON.stringify(audioBoot));
 if(!audioBoot.hasContext)throw Error('No AudioContext after start gesture');
 await wait(2800);
 await evaluate('window.__teacherQa.camera([0,12.5,10.6],[0,.3,-.3])');
 await wait(400);
 await shot('initial-15-students');
 await evaluate('window.__teacherQa.camera([7,4.8,3.1],[1.4,.62,-1.2])');
 await wait(250);await shot('student-side-view');
 await evaluate('window.__teacherQa.camera([0,12.5,10.6],[0,.3,-.3])');
 console.log('TEACHER_QA_INITIAL '+JSON.stringify(await evaluate('window.__teacherQa.info()')));
 const panelWide=await metrics();console.log('TEACHER_QA_UI_DESKTOP '+JSON.stringify(panelWide));
 await evaluate('window.__teacherQa.moveToBoard()');
 await evaluate('window.__teacherQa.simulate(22.2)');
 console.log('TEACHER_QA_AFTER_EXPLAIN '+JSON.stringify(await evaluate('window.__teacherQa.info()')));
 const assign=await evaluate('window.__teacherQa.action()');console.log('TEACHER_QA_ASSIGN '+JSON.stringify(assign));
 await evaluate('window.__teacherQa.simulate(11)');
 await wait(250);await shot('practice-writing-question');
 const q=await evaluate('window.__teacherQa.info()');console.log('TEACHER_QA_PRACTICE '+JSON.stringify(q));
 const audioPractice=await evaluate('window.__teacherQa.audio()');
 console.log('TEACHER_QA_SOUND_PRACTICE '+JSON.stringify(audioPractice));
 if((audioPractice.stats.pencil||0)<2)throw Error('Pencil Foley did not respond to lesson practice');
 const id=q.roster.findIndex(s=>s.question);
 if(id>=0){
   const answer=await evaluate('window.__teacherQa.moveToStudent('+id+')');
   console.log('TEACHER_QA_QUESTION_ACTION '+JSON.stringify({student:id,action:answer}));
   const result=await evaluate('window.__teacherQa.action()');
   console.log('TEACHER_QA_QUESTION_ANSWER '+JSON.stringify(result));
 }
 await evaluate('window.__teacherQa.moveToBoard()');
 await evaluate('window.__teacherQa.simulate(39)');
 console.log('TEACHER_QA_BEFORE_RECAP '+JSON.stringify(await evaluate('window.__teacherQa.info()')));
 const recap=await evaluate('window.__teacherQa.action()');console.log('TEACHER_QA_RECAP_START '+JSON.stringify(recap));
 await evaluate('window.__teacherQa.simulate(14.2)');
 console.log('TEACHER_QA_AFTER_RECAP '+JSON.stringify(await evaluate('window.__teacherQa.info()')));
 const beforeMute=await evaluate('window.__teacherQa.audio()');
 await evaluate("document.getElementById('soundButton').click()");
 const audioMuted=await evaluate('window.__teacherQa.audio()');
 console.log('TEACHER_QA_SOUND_MUTED '+JSON.stringify(audioMuted));
 if(audioMuted.enabled||!audioMuted.mediaMuted.every(Boolean))throw Error('Sound toggle did not mute both Foley and recordings');
 await evaluate("document.getElementById('soundButton').click()");
 const audioRestored=await evaluate('window.__teacherQa.audio()');
 console.log('TEACHER_QA_SOUND_RESTORED '+JSON.stringify(audioRestored));
 if(!audioRestored.enabled||audioRestored.mediaMuted.some(Boolean))throw Error('Sound toggle did not restore audio');
 if((beforeMute.stats['cue:write']||0)<1||!audioPractice.hasContext)throw Error('School feedback cue missing');
 await shot('lesson-complete');
 await send('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:true});
 await wait(450);
 const compact=await metrics();
 console.log('TEACHER_QA_UI_COMPACT '+JSON.stringify(compact));
 function collision(a,b){return a.show&&b.show&&a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h}
 function checkNoOverlap(data,left,right){
   const a=data.nodes.find(x=>x.id===left),b=data.nodes.find(x=>x.id===right);
   if(collision(a,b))throw Error('UI overlaps: '+left+' / '+right+' / '+JSON.stringify(data));
 }
 checkNoOverlap(compact,'dayStrip','campaignStatus');
 checkNoOverlap(compact,'instructionPanel','joystick');
 await shot('compact-landscape');
 await evaluate("document.getElementById('rosterToggle').click()");
 await wait(150);
 const rosterGeometry=await metrics();
 console.log('TEACHER_QA_UI_ROSTER '+JSON.stringify(rosterGeometry));
 checkNoOverlap(rosterGeometry,'studentStrip','joystick');
 await shot('roster-open-compact');
 await evaluate("document.getElementById('rosterToggle').click()");
 await send('Emulation.setDeviceMetricsOverride',{width:1024,height:768,deviceScaleFactor:1,mobile:true});
 await evaluate("window.__teacherQa.room('science')");
 await wait(1500);
 console.log('TEACHER_QA_ROOM_SCIENCE '+JSON.stringify(await evaluate('window.__teacherQa.info()')));
 await shot('science-stools');
 await evaluate('window.__teacherQa.camera([6.5,3.7,4.0],[0,.62,-.9])');
 await wait(260);await shot('science-stools-side');
 console.log('TEACHER_QA_ERRORS '+JSON.stringify(runtimeErrors.slice(0,20)));
 console.log('TEACHER_QA_NETWORK '+JSON.stringify(networkErrors.slice(0,20)));
 console.log('TEACHER_QA_DONE');
})().catch(e=>{console.error('TEACHER_QA_FAILED',e.stack||String(e));process.exitCode=1}).finally(()=>{
 try{ws?.close()}catch{}
 try{chrome?.kill()}catch{}
 server.close();
});

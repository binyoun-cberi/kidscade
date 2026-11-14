#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const http=require('node:http');
const cp=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
const CHROME=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
if(!CHROME)throw Error('Chromium required');
const fixture='<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><main><h1>게임 화면</h1></main><script src="/app/platform/return-nudge.js"></script></html>';
const server=http.createServer((req,res)=>{
 const name=new URL(req.url,'http://127.0.0.1').pathname;
 if(name==='/'){res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end(fixture);return;}
 if(name!=='/app/platform/return-nudge.js'){res.writeHead(404);res.end();return;}
 fs.readFile(path.join(ROOT,'app/platform/return-nudge.js'),(e,bytes)=>{
  if(e){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'content-type':'text/javascript'});res.end(bytes);
 });
});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let chrome,socket,dir;
async function audit(){
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 dir=fs.mkdtempSync(path.join(os.tmpdir(),'kc-return-audit-'));
 chrome=cp.spawn(CHROME,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-background-networking','--remote-debugging-port=0','--remote-allow-origins=*','--user-data-dir='+dir,'about:blank'],{stdio:['ignore','ignore','pipe']});
 let wsUrl='';
 for(let i=0;i<160;i++){
  if(chrome.exitCode!==null)throw Error('Chrome exited early');
  const file=path.join(dir,'DevToolsActivePort');
  if(fs.existsSync(file))try{
   const port=Number(fs.readFileSync(file,'utf8').split(/\r?\n/)[0]);
   const targets=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
   wsUrl=targets.find(x=>x.type==='page')?.webSocketDebuggerUrl||'';
  }catch(_){}
  if(wsUrl)break;
  await sleep(100);
 }
 assert.ok(wsUrl,'CDP missing');
 socket=new WebSocket(wsUrl);
 await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j});
 let id=0;const pending=new Map(),errors=[];
 socket.onmessage=event=>{
  const m=JSON.parse(event.data);
  if(m.method==='Runtime.exceptionThrown')errors.push(m.params?.exceptionDetails?.text||'error');
  if(!m.id)return;const p=pending.get(m.id);if(!p)return;
  pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result||{});
 };
 const send=(method,params={})=>new Promise((r,j)=>{const i=++id;pending.set(i,{resolve:r,reject:j});socket.send(JSON.stringify({id:i,method,params}));});
 const evaluate=async expr=>{const r=await send('Runtime.evaluate',{expression:expr,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails).slice(0,1300));return r.result?.value;};
 const waitFor=async(expr,desc)=>{for(let i=0;i<100;i++){if(await evaluate(expr))return;await sleep(100)}throw Error('Timeout: '+desc)};
 const tap=async()=>{
  const b=await evaluate("(()=>{const n=document.querySelector('#kidscade-return-nudge button');if(!n)return null;const r=n.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,ok:r.width>100&&r.height>40,top:document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)===n}})()");
  assert.ok(b?.ok&&b.top,'button not tappable');
  await send('Input.dispatchMouseEvent',{type:'mousePressed',x:b.x,y:b.y,button:'left',clickCount:1});
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:b.x,y:b.y,button:'left',clickCount:1});
 };
 await send('Page.enable');await send('Runtime.enable');
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});
 await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'});
 await waitFor('window.__kidscadeReturnNudgeInstalled===true','runtime loaded');
 await evaluate("(()=>{window.__t=100000;window.__v='visible';window.__speechMode='start';window.__spoken=null;Date.now=()=>window.__t;Object.defineProperty(document,'visibilityState',{configurable:true,get(){return window.__v}});window.SpeechSynthesisUtterance=function(text){this.text=text};Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speaking:false,getVoices(){return [{lang:'ko-KR',name:'Korean'},{lang:'ko-KR',name:'Google 한국어 여성'}]},cancel(){},speak(u){window.__spoken={voice:u.voice?.name,volume:u.volume,lang:u.lang};if(window.__speechMode==='error'){u.onerror?.({error:'not-allowed'});return;}this.speaking=true;setTimeout(()=>u.onstart?.(),0)}}});window.__switch=(visible)=>{window.__v=visible?'visible':'hidden';document.dispatchEvent(new Event('visibilitychange'))};})()");
 await evaluate('window.__switch(false);window.__t+=5000;window.__switch(true)');
 await waitFor("!!document.querySelector('#kidscade-return-nudge button')",'dialog appears');
 const overlay=await evaluate("(()=>{const d=document.getElementById('kidscade-return-nudge'),r=d.getBoundingClientRect();return{open:d.open,tag:d.tagName,w:r.width,h:r.height,button:d.querySelector('button')?.textContent,scroll:document.documentElement.scrollWidth,view:innerWidth}})()");
 assert.equal(overlay.open,true);assert.equal(overlay.tag,'DIALOG');assert.equal(overlay.button,'▶ 게임 계속하기');
 assert.ok(overlay.w>=380&&overlay.h>=800&&overlay.scroll<=overlay.view+2);
 assert.equal(await evaluate('window.__spoken'),null,'must not speak before click');
 await tap();await waitFor("!document.getElementById('kidscade-return-nudge')",'dialog cleared');
 const voice=await evaluate('window.__spoken');
 assert.equal(voice.voice,'Google 한국어 여성');assert.equal(voice.volume,1);assert.equal(voice.lang,'ko-KR');
 await evaluate("window.__speechMode='error';window.__t+=50000;window.__switch(false);window.__t+=5000;window.__switch(true)");
 await waitFor("!!document.querySelector('#kidscade-return-nudge button')",'second warning');
 await tap();
 await waitFor("document.getElementById('kidscade-return-nudge')?.textContent.includes('음성을 재생하지 못했어요')",'failure warning');
 assert.equal(await evaluate("document.querySelector('#kidscade-return-nudge button')?.disabled"),true);
 await evaluate('window.__t+=60000');
 await waitFor("!document.getElementById('kidscade-return-nudge')",'60s wait ends');
 await evaluate('window.__t+=50000;window.__switch(false);window.__t+=1200001;window.__switch(true)');
 assert.equal(await evaluate("!!document.getElementById('kidscade-return-nudge')"),false);
 assert.deepEqual(errors,[]);
 console.log('RETURN_NUDGE_REAL_CHROMIUM_PASS',JSON.stringify({viewport:'390x844',dialog:true,voice:voice.voice,volume:voice.volume,waitSeconds:60}));
}
audit().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{try{socket?.close()}catch(_){}try{chrome?.kill()}catch(_){}try{await new Promise(r=>server.close(r))}catch(_){}try{if(dir)fs.rmSync(dir,{recursive:true,force:true})}catch(_){}});

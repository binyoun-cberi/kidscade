#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),cp=require('node:child_process'),assert=require('node:assert/strict');
const CHROME=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
if(!CHROME){console.log('[corn browser] SKIP no chromium');process.exit(0)}
const root=path.resolve(__dirname,'..'),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const hook=`
if(new URL(location.href).searchParams.has('cornQa')){
 window.__cornQA={
  get:()=>({seed:state.maze?.seed,won:state.won,phase:state.hunter?.phase,elapsed:state.elapsed,player:{...state.player},guess:state.guess,mapOpen:state.mapOpen,instances:world.children.reduce((n,c)=>n+Number(!!c.isInstancedMesh)+c.children.filter(x=>x.isInstancedMesh).length,0),shortest:M.route(state.maze,0,state.maze.exit).length-1}),
  first:()=>state.maze.stations[0],second:()=>state.maze.stations[1],exit:()=>state.maze.exit,action:()=>nearAction(),
  go:(end)=>{const path=M.route(state.maze,M.current(state.maze,state.player.x,state.player.z),end);if(!path.length)throw Error('No route');
   let steps=0;for(const cell of path.slice(1)){const dest=M.center(state.maze,cell);state.yaw=Math.atan2(-(dest.x-state.player.x),-(dest.z-state.player.z));state.keys.add('KeyW');
    for(let n=0;n<90;n++){const distance=Math.hypot(dest.x-state.player.x,dest.z-state.player.z);if(distance<.012)break;const before=distance;step(Math.min(.05,distance/3.65));steps++;if(Math.hypot(dest.x-state.player.x,dest.z-state.player.z)>before-.0001)throw Error('Blocked movement '+cell);}
    state.keys.delete('KeyW');if(Math.hypot(dest.x-state.player.x,dest.z-state.player.z)>.025)throw Error('Missed destination '+cell);}
   return{cells:path.length,steps,seconds:state.elapsed}},
  advance:seconds=>{for(let left=seconds;left>0;left-=.05)step(Math.min(.05,left));return state.hunter.phase}
 };
}
`;
const server=http.createServer((req,res)=>{
 const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 if(p==='/favicon.ico'){res.writeHead(204);res.end();return}
 const file=path.resolve(root,'.'+p);
 if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return}
 fs.readFile(file,(err,data)=>{
  if(err){res.writeHead(404);res.end();return}
  if(p==='/games/high-corn-maze/game.js')data=Buffer.from(data.toString('utf8')+'\n'+hook);
  res.writeHead(200,{'content-type':{'.html':'text/html','.js':'text/javascript','.css':'text/css','.glb':'model/gltf-binary','.obj':'text/plain','.svg':'image/svg+xml'}[path.extname(file)]||'application/octet-stream'});res.end(data)
 });
});
let chrome,ws,profile;const exceptions=[],network=[],consoleErrors=[];
async function main(){
 await new Promise(r=>server.listen(0,'127.0.0.1',r));profile=fs.mkdtempSync(path.join(os.tmpdir(),'kc-corn-browser-'));
 chrome=cp.spawn(CHROME,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--enable-unsafe-swiftshader','--use-angle=swiftshader','--remote-debugging-port=0','--remote-allow-origins=*','--disable-background-networking','--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
 let url;
 for(let n=0;n<160;n++){
  const f=path.join(profile,'DevToolsActivePort');
  if(fs.existsSync(f))try{const port=+fs.readFileSync(f,'utf8').split('\n')[0];const tabs=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();url=tabs.find(x=>x.type==='page')?.webSocketDebuggerUrl}catch{}
  if(url)break;await sleep(100);
 }
 assert.ok(url,'Chrome debugging port missing');
 ws=new WebSocket(url);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});
 let id=0;const pending=new Map();
 ws.onmessage=e=>{const m=JSON.parse(String(e.data));if(m.method==='Runtime.exceptionThrown')exceptions.push(m.params?.exceptionDetails?.exception?.description||'exception');
 if(m.method==='Log.entryAdded'&&m.params?.entry?.level==='error')consoleErrors.push(m.params.entry.text);
 if(m.method==='Runtime.consoleAPICalled'&&m.params?.type==='error')consoleErrors.push(m.params.args?.map(x=>x.value||x.description).join(' ')||'console error');
 if(m.method==='Network.responseReceived'&&m.params?.response?.status>=400)network.push(m.params.response.url);
 const v=pending.get(m.id);if(!v)return;pending.delete(m.id);m.error?v[1](Error(m.error.message)):v[0](m.result||{})};
 const send=(method,params={})=>new Promise((r,j)=>{const key=++id;pending.set(key,[r,j]);ws.send(JSON.stringify({id:key,method,params}))});
 const ev=async expression=>{const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw Error(JSON.stringify(result.exceptionDetails).slice(0,1100));return result.result?.value};
 const wait=async(exp,label)=>{for(let i=0;i<130;i++){if(await ev(exp).catch(()=>false))return;await sleep(100)}throw Error('Timeout '+label+' errors='+exceptions.slice(-2)+' http='+network.slice(-8)+' console='+consoleErrors.slice(-8)+' page='+JSON.stringify(await ev("({qa:typeof window.__cornQA,game:document.querySelector('#startOverlay')?.className,title:document.title,scripts:[...document.scripts].map(s=>s.src),resources:performance.getEntriesByType('resource').filter(x=>x.name.includes('three-r160')).slice(-12).map(x=>x.name)})").catch(e=>e.message)))};
 const shot=async label=>{await sleep(150);const x=await send('Page.captureScreenshot',{format:'png'});const size=Buffer.from(x.data,'base64').length;assert.ok(size>6000,label+' screenshot too small '+size);console.log('[corn browser] screenshot '+label+' bytes='+size)};
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Log.enable');
 await send('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/games/high-corn-maze/index.html?cornQa=1'});
 await wait('Boolean(window.CornMaze&&document.querySelector("#startButton"))','boot');
 await ev('document.querySelector(".mode[data-mode=explore]").click();document.querySelector("#startButton").click()');
 await wait('window.__cornQA?.get()?.instances>0','3D corn generated');
 await shot('desktop');
 const first=await ev('window.__cornQA.go(window.__cornQA.first())');
 assert.equal(await ev('window.__cornQA.action().type'),'map');
 await ev('document.querySelector("#interact").click()');assert.equal(await ev('window.__cornQA.get().mapOpen'),true);
 await ev(`(()=>{const c=document.querySelector('#mapCanvas'),r=c.getBoundingClientRect();c.dispatchEvent(new PointerEvent('pointerdown',{clientX:r.left+r.width*.5,clientY:r.top+r.height*.5,bubbles:true}));})()`);
 assert.ok(await ev('window.__cornQA.get().guess>=0'),'Cannot mark map');
 await shot('map');
 await ev('document.querySelector("#closeMap").click()');
 const second=await ev('window.__cornQA.go(window.__cornQA.second())');
 assert.ok(second.steps>100,'Player must physically traverse the maze to next map');
 const end=await ev('window.__cornQA.go(window.__cornQA.exit())');
 assert.equal(await ev('window.__cornQA.action().type'),'exit');
 await ev('document.querySelector("#interact").click()');
 assert.equal(await ev('window.__cornQA.get().won'),true);
 await shot('escape');
 console.log('[corn browser] PASS walking first='+JSON.stringify(first)+' second='+JSON.stringify(second)+' finish='+JSON.stringify(end));
 await send('Emulation.setDeviceMetricsOverride',{width:430,height:932,deviceScaleFactor:1,mobile:true});
 await ev('document.querySelector("#retry").click()');
 await wait('window.__cornQA?.get()?.instances>0','mobile re-entry');
 const mobile=await ev(`(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,controls:getComputedStyle(document.querySelector('#touchControls')).display}))()`);
 assert.ok(mobile.scroll<=mobile.width+2,'mobile horizontal overflow');
 assert.equal(mobile.controls,'block');await shot('mobile');
 await ev('document.querySelector(".mode[data-mode=normal]").click();document.querySelector("#startButton").click()');
 assert.equal(await ev('window.__cornQA.advance(74)'),'chase');
 assert.equal(await ev('window.__cornQA.get().phase'),'chase');
 console.log('[corn browser] PASS pursuit + mobile',JSON.stringify(mobile));
 assert.deepEqual(exceptions,[],'Browser JS exceptions');assert.deepEqual(network,[],'HTTP error');
}
main().catch(e=>{console.error('[corn browser] FAIL',e.stack||e);process.exitCode=1}).finally(async()=>{try{ws?.close()}catch{}try{chrome?.kill('SIGKILL')}catch{}try{server.close()}catch{}await sleep(180);try{fs.rmSync(profile,{force:true,recursive:true,maxRetries:4,retryDelay:150})}catch(e){console.warn('[corn browser] cleanup ignored',e.code)}});

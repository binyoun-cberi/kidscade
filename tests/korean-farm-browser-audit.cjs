#!/usr/bin/env node
'use strict';
// Real Chromium/WebGL playthrough against the farm's actual game code.
// The local static server exposes a read-only+setup QA hook; production is untouched.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const os=require('node:os'),http=require('node:http'),cp=require('node:child_process');
const sharp=require('sharp'),{once}=require('node:events');
const ROOT=path.resolve(__dirname,'..'),OUT=process.env.KIDSCADE_FARM_AUDIT_OUT||path.join(os.tmpdir(),'kidscade-farm-audit');
fs.mkdirSync(OUT,{recursive:true});
const CHROME=[process.env.CHROME_BIN,'/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].filter(Boolean).find(fs.existsSync);
assert.ok(CHROME,'Chromium missing');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8',
 '.css':'text/css; charset=utf-8','.glb':'model/gltf-binary','.fbx':'application/octet-stream','.json':'application/json',
 '.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
const hook=[
"window.__farmQA={",
" ready:()=>!loading&&!disposed&&Boolean(renderer&&farmerAnimator),",
" state:()=>({day:state.day,money:state.money,inventory:{...state.inventory},stats:{...state.stats},",
"   fields:state.fields.map(f=>({id:f.id,growth:f.growth,planted:f.planted,water:f.waterDepthCm,gate:f.gateOpen})),",
"   player:{...state.player},saving:localStorage.getItem(SAVE_KEY)?.length||0}),",
" teleport:(x,z)=>{state.player.x=x;state.player.z=z;farmer.position.set(x,0,z);camTarget.set(x,0,z);moveGoal=null;},",
" select:id=>chooseField(id),",
" visuals:()=>({renderer:!!renderer?.getContext(),size:[renderer.domElement.width,renderer.domElement.height],",
"   actor:farmerAnimator.root.children.length,assets:[...assetReport].map(([url,a])=>({url,status:a.status,colors:a.colors,repainted:a.repainted||0})),",
"   crops:[...plotMeshes].map(([id,r])=>({id,count:r.cropLayer.children.length}))})",
"};"
].join('\n');
const server=http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(pathname==='/favicon.ico'){res.writeHead(204);res.end();return}
 const file=path.resolve(ROOT,'.'+decodeURIComponent(pathname));
 if(file!==ROOT&&!file.startsWith(ROOT+path.sep)){res.writeHead(403);res.end();return}
 fs.readFile(file,(err,bytes)=>{
  if(err){res.writeHead(404);res.end('Missing '+pathname);return}
  if(pathname==='/games/korean-farm/game.js'){
   const code=bytes.toString('utf8');
   if(!code.includes('main().catch(')){res.writeHead(500);res.end('Game changed: hook missing');return}
   bytes=Buffer.from(code+'\n'+hook);
  }
  res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});res.end(bytes);
 });
});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const errors=[],network=[],report={cases:[],screenshots:[],errors,network};
let chrome,ws,profile;
async function main(){
 server.listen(0,'127.0.0.1');await once(server,'listening');
 let endpoint=null,stderr='';
 for(let attempt=0;attempt<3&&!endpoint;attempt++){
  if(chrome){try{chrome.kill('SIGKILL')}catch{};await sleep(250)}
  if(profile)fs.rmSync(profile,{force:true,recursive:true});
  profile=fs.mkdtempSync(path.join(os.tmpdir(),'korean-farm-qa-'));
  chrome=cp.spawn(CHROME,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--enable-webgl',
   '--enable-unsafe-swiftshader','--use-angle=swiftshader','--disable-background-networking',
   '--no-first-run','--remote-allow-origins=*','--remote-debugging-port=0',
   '--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','pipe']});
  chrome.stderr.on('data',b=>{stderr=(stderr+String(b)).slice(-2500)});
  for(let n=0;n<170;n++){
   if(chrome.exitCode!==null)break;
   const f=path.join(profile,'DevToolsActivePort');
   if(fs.existsSync(f))try{
    const port=Number(fs.readFileSync(f,'utf8').split('\n')[0]);
    const pages=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
    endpoint=pages.find(x=>x.type==='page')?.webSocketDebuggerUrl;
   }catch{}
   if(endpoint)break;await sleep(100);
  }
 }
 assert.ok(endpoint,'Chrome did not start: '+stderr);
 ws=new WebSocket(endpoint);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});
 let next=0;const tasks=new Map();
 ws.onmessage=event=>{
  const m=JSON.parse(String(event.data));
  if(m.method==='Runtime.exceptionThrown')errors.push(String(m.params?.exceptionDetails?.exception?.description||
   m.params?.exceptionDetails?.text||'Exception').slice(0,1000));
  if(m.method==='Log.entryAdded'&&m.params?.entry?.level==='error')errors.push(String(m.params.entry.text||'Log').slice(0,800));
  if(m.method==='Network.responseReceived'&&m.params?.response?.status>=400)network.push({
   status:m.params.response.status,url:m.params.response.url});
  const task=tasks.get(m.id);if(!task)return;tasks.delete(m.id);
  if(m.error)task.reject(Error(m.error.message));else task.resolve(m.result||{});
 };
 const send=(method,params={})=>new Promise((resolve,reject)=>{
  const id=++next;tasks.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));
 });
 const evaluate=async expression=>{
  const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(r.exceptionDetails)throw Error('Eval: '+JSON.stringify(r.exceptionDetails).slice(0,1100));
  return r.result?.value;
 };
 const click=selector=>evaluate('document.querySelector('+JSON.stringify(selector)+').click()');
 const waitFor=async(expression,ms=24000)=>{
  for(let t=0;t<ms;t+=150){if(await evaluate(expression).catch(()=>false))return;await sleep(150)}
  throw Error('Timeout: '+expression+' / errors '+JSON.stringify(errors.slice(-3)));
 };
 const screenshot=async name=>{
  const r=await send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});
  const bytes=Buffer.from(r.data,'base64');fs.writeFileSync(path.join(OUT,name+'.png'),bytes);
  const {data,info}=await sharp(bytes).removeAlpha().raw().toBuffer({resolveWithObject:true});
  let sum=0,sum2=0;for(let i=0;i<data.length;i+=3){const y=data[i]*.21+data[i+1]*.72+data[i+2]*.07;sum+=y;sum2+=y*y}
  const n=data.length/3,contrast=Math.sqrt(sum2/n-(sum/n)**2);
  assert.ok(bytes.length>6000&&contrast>16,'Blank game screenshot: '+name);
  report.screenshots.push({name,width:info.width,height:info.height,bytes:bytes.length,contrast:Math.round(contrast)});
 };
 const check=(name,ok,detail={})=>{report.cases.push({name,pass:Boolean(ok),detail});assert.ok(ok,name+': '+JSON.stringify(detail).slice(0,1500))};
 await send('Page.enable');await send('Runtime.enable');await send('Log.enable');await send('Network.enable');
 await send('Emulation.setDeviceMetricsOverride',{width:1260,height:760,deviceScaleFactor:1,mobile:false});
 const url='http://127.0.0.1:'+server.address().port+'/games/korean-farm/index.html';
 await send('Page.navigate',{url});
 await waitFor('Boolean(window.__farmQA?.ready())',35000);
 await sleep(600);
 const visuals=await evaluate('window.__farmQA.visuals()');
 check('WebGL scene and actor started',visuals.renderer&&visuals.size[0]>=800&&visuals.actor>0,visuals);
 check('Six fields populated',visuals.crops.length===6&&visuals.crops.every(x=>x.count>0),visuals.crops);
 check('Shared 3D models loading',visuals.assets.filter(x=>x.status==='loaded').length>=10,visuals.assets);
 await screenshot('01-desktop-farm');
 const initial=await evaluate('window.__farmQA.state()');
 check('Ripe rice available',initial.fields.find(x=>x.id==='rice-4').growth===1);
 await evaluate('window.__farmQA.teleport(-8.65,-0.9)');
 await evaluate('window.__farmQA.select("rice-4")');
 await click('#actionButtons [data-action="harvest"]');await sleep(450);
 const harvested=await evaluate('window.__farmQA.state()');
 check('Harvest produces inventory',harvested.inventory.rice>0&&harvested.stats.harvests===1,harvested.stats);
 await screenshot('02-harvest');
 await click('#bagBtn');await click('.sell-btn');
 const sold=await evaluate('window.__farmQA.state()');
 check('Sell removes produce and pays money',sold.inventory.rice===0&&sold.money>initial.money&&sold.stats.sales===1);
 await click('#modalClose');
 await click('#actionButtons [data-action="till"]');
 await click('#actionButtons [data-action="plant"]');
 const planted=await evaluate('window.__farmQA.state()');
 check('Replant changes crop state and consumes seed',planted.fields.find(x=>x.id==='rice-4').planted&&
  planted.fields.find(x=>x.id==='rice-4').growth<.2&&planted.inventory.seedRice<initial.inventory.seedRice);
 await click('#actionButtons [data-action="gate"]');
 const gated=await evaluate('window.__farmQA.state()');
 check('Open water gate increases water',gated.fields.find(x=>x.id==='rice-4').gate&&
  gated.fields.find(x=>x.id==='rice-4').water>initial.fields.find(x=>x.id==='rice-4').water);
 await click('#sleepBtn');
 const morning=await evaluate('window.__farmQA.state()');
 check('Day advances crop growth',morning.day===2&&
  morning.fields.find(x=>x.id==='rice-4').growth>planted.fields.find(x=>x.id==='rice-4').growth);
 await screenshot('03-replanted-paddy');
 await send('Page.reload',{ignoreCache:true});
 await waitFor('Boolean(window.__farmQA?.ready())',35000);
 const restored=await evaluate('window.__farmQA.state()');
 check('Save survives reload',restored.day===2&&restored.money===sold.money&&
  restored.fields.find(x=>x.id==='rice-4').planted&&restored.saving>100);
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
 await sleep(500);
 const mobile=await evaluate('({w:innerWidth,h:innerHeight,scroll:document.documentElement.scrollWidth,bar:document.querySelector("#bottomBar").getBoundingClientRect().width,bag:document.querySelector("#bagBtn").getBoundingClientRect().width,stick:getComputedStyle(document.querySelector("#joystick")).display})');
 check('Mobile portrait main controls fit',mobile.scroll<=mobile.w+5&&mobile.bar>0&&mobile.bag>0&&mobile.stick!=='none',mobile);
 await screenshot('04-mobile-portrait');
 await click('#bagBtn');await screenshot('05-mobile-inventory');
 const final=await evaluate('window.__farmQA.visuals()');report.assetSummary=final.assets;
 check('No page exceptions',errors.length===0,{errors});
 const critical=network.filter(x=>/\/games\/korean-farm\/|\/assets\/vendor\/three|\/assets\/game\/crops\/FBX\/Rice_/.test(x.url));
 check('No missing critical scripts and rice models',critical.length===0,{critical});
 report.result='PASS';fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2));
 console.log('KOREAN_FARM_BROWSER_PLAYTEST_PASS '+JSON.stringify({cases:report.cases.length,screenshots:report.screenshots,assets:final.assets.length,network:network.length}));
}
main().catch(e=>{
 report.result='FAIL';report.failure=String(e.stack||e);
 fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2));
 console.error('KOREAN_FARM_BROWSER_PLAYTEST_FAIL',report.failure);process.exitCode=1;
}).finally(()=>{
 try{ws?.close()}catch{}
 try{chrome?.kill('SIGKILL')}catch{}
 try{server.close()}catch{}
 try{if(profile)fs.rmSync(profile,{force:true,recursive:true})}catch{}
});

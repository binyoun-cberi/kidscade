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
" clearSave:()=>{localStorage.removeItem(SAVE_KEY);",
"   window.addEventListener('pagehide',()=>localStorage.removeItem(SAVE_KEY),{once:true});},",
" state:()=>({day:state.day,money:state.money,energy:state.energy,inventory:{...state.inventory},stats:{...state.stats},",
"   upgrades:{...state.upgrades},market:{...state.market},cargo:{...state.cargo},",
"   fields:state.fields.map(f=>({id:f.id,growth:f.growth,planted:f.planted,water:f.waterDepthCm,gate:f.gateOpen,gateLevel:f.gateLevel,transplants:f.transplants,work:f.work,weeds:f.weeds,moisture:f.moisture})),",
"   player:{...state.player},saving:localStorage.getItem(SAVE_KEY)?.length||0}),",
" teleport:(x,z)=>{state.player.x=x;state.player.z=z;farmer.position.set(x,0,z);camTarget.set(x,0,z);clearMovement();pendingStation=null;},",
" select:id=>chooseField(id),",
" work:index=>runFieldStrip(index),",
" plant:index=>runSeedlingPlant(index),",
" gate:id=>activateSluice(id),",
" gateLevel:(id,level)=>activateSluice(id,level),",
" rest:()=>advanceFarmDayAfterRest(),",
" markers:id=>({work:plotMeshes.get(id)?.work?.targets?.length||0,plant:plotMeshes.get(id)?.planting?.targets?.length||0}),",
" tap:(kind,index)=>{const rec=plotMeshes.get(state.selected);",
"   const targets=kind==='work'?rec?.work?.targets:rec?.planting?.targets;",
"   const target=targets?.find(t=>t.userData[kind==='work'?'stripIndex':'cellIndex']===index);",
"   if(!target)return false;scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);",
"   const p=target.getWorldPosition(new THREE.Vector3()).project(camera),r=$('farm').getBoundingClientRect();",
"   inspectAt({clientX:r.left+(p.x+1)*r.width/2,clientY:r.top+(1-p.y)*r.height/2});return true;},",
" plantMode:()=>({active:plantingMode,selectedSeedling}),",
" finishPlanting:(id)=>{const f=fieldById(state,id);",
"   for(let i=0;i<25;i++)if(f?.transplants&&!f.transplants[i])plantSeedling(state,id,i);",
"   syncFieldVisual(id);save(true);return seedlingCount(f)},",
" flow:()=>({busy:farmFlow.busy,active:farmFlow.active}),",
" debug:()=>({paused,loading,actorBusy:farmerAnimator?.busy,keys:[...keys],raf,focus:document.activeElement?.id}),",
" facing:()=>({yaw:farmer.rotation.y,target:farmerFacingTarget,viewAngle,zoom:state.camera.zoom,",
"   actorScreen:(()=>{const v=new THREE.Vector3(state.player.x,1.6,state.player.z).project(camera);",
"     return {x:(v.x+1)*innerWidth/2,y:(1-v.y)*innerHeight/2}})()}),",
" visuals:()=>({renderer:!!renderer?.getContext(),size:[renderer.domElement.width,renderer.domElement.height],",
"   actor:farmerAnimator.root.children.length,assets:[...assetReport].map(([url,a])=>({url,status:a.status,colors:a.colors,repainted:a.repainted||0})),",
"   crops:[...plotMeshes].map(([id,r])=>({id,count:r.cropLayer.children.length,spots:r.planting?.targets?.length||0})),",
"   village:villageScene?.stats||null,sceneryCount:villageScene?.root?.children?.length||0})",
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
 check('Six fields populated',visuals.crops.length===6&&
   visuals.crops.every(x=>x.count>0||(x.id==='rice-1'&&x.spots===25)),visuals.crops);
 check('First paddy is prepared for interactive rice planting',
   (await evaluate('window.__farmQA.state()')).fields.find(f=>f.id==='rice-1').transplants.every(x=>!x));
 check('Shared 3D models loading',visuals.assets.filter(x=>x.status==='loaded').length>=10,visuals.assets);
 check('Korean village has seven detailed areas and enough decorative meshes',
   visuals.village?.areas===7&&visuals.village.meshes>180&&visuals.village.instanced>=1,
   visuals.village);
 await screenshot('01-desktop-farm');
 await evaluate('window.__farmQA.teleport(10.25,-8.1)');
 await sleep(550);
 await screenshot('01b-farmhouse-courtyard');
 await evaluate('window.__farmQA.teleport(7.6,11.4)');
 await sleep(550);
 await screenshot('01c-village-market');
 await evaluate('window.__farmQA.teleport(-5,3)');
 await sleep(420);
 const walkFrom=await evaluate('window.__farmQA.state().player');
 await evaluate('document.querySelector("#farm").focus()');
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'d',code:'KeyD',windowsVirtualKeyCode:68});
 await sleep(580);
 const duringKey=await evaluate('window.__farmQA.debug()');
 await send('Input.dispatchKeyEvent',{type:'keyUp',key:'d',code:'KeyD',windowsVirtualKeyCode:68});
 const walkTo=await evaluate('window.__farmQA.state().player');
 check('Real keyboard movement changes 3D player position',Math.hypot(walkTo.x-walkFrom.x,walkTo.z-walkFrom.z)>.12,
   {from:walkFrom,to:walkTo,duringKey});
 await waitFor('Math.abs(Math.atan2(Math.sin(window.__farmQA.facing().target-window.__farmQA.facing().yaw),Math.cos(window.__farmQA.facing().target-window.__farmQA.facing().yaw)))<.11',7000);
 const facing=await evaluate('window.__farmQA.facing()');
 // The eyes are on local -Z. After rotation about Y, world-facing is
 // (-sin(yaw),-cos(yaw)). This dot-product must be positive and near 1.
 // Comparing against farmerHeading() alone previously concealed a sign error.
 const travelled={x:walkTo.x-walkFrom.x,z:walkTo.z-walkFrom.z};
 const travelledLength=Math.hypot(travelled.x,travelled.z);
 const worldFace={x:-Math.sin(facing.yaw),z:-Math.cos(facing.yaw)};
 const facingDot=(worldFace.x*travelled.x+worldFace.z*travelled.z)/travelledLength;
 check('Farmer eyes and chest actually point where the player walks',
  facingDot>.96,{facing,travelled,worldFace,facingDot});
 // Explicitly test the reverse key after a rightward walk: no moonwalking.
 const reverseStart=await evaluate('window.__farmQA.state().player');
 await evaluate('window.__farmQA.reverseOrigin=window.__farmQA.state().player');
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'a',code:'KeyA',windowsVirtualKeyCode:65});
 // Headless software WebGL can run at low FPS. Hold the key until the turn
 // actually finishes and the feet begin travelling, rather than timing
 // out during the deliberate turn-in-place animation.
 await waitFor('Math.hypot(window.__farmQA.state().player.x-window.__farmQA.reverseOrigin.x,window.__farmQA.state().player.z-window.__farmQA.reverseOrigin.z)>.27',7000);
 await sleep(320);
 await send('Input.dispatchKeyEvent',{type:'keyUp',key:'a',code:'KeyA',windowsVirtualKeyCode:65});
 const reverseEnd=await evaluate('window.__farmQA.state().player');
 const reverseFace=await evaluate('window.__farmQA.facing()');
 const reverseDelta={x:reverseEnd.x-reverseStart.x,z:reverseEnd.z-reverseStart.z};
 const reverseLen=Math.hypot(reverseDelta.x,reverseDelta.z);
 const reverseDot=(-Math.sin(reverseFace.yaw)*reverseDelta.x-
  Math.cos(reverseFace.yaw)*reverseDelta.z)/Math.max(.00001,reverseLen);
 check('Reverse direction turns the farmer before stepping backward',reverseLen>.12&&reverseDot>.94,
  {reverseDelta,reverseFace,reverseDot});
 await click('#moreBtn');await click('#turnLeft');
 await sleep(420);
 const orbited=await evaluate('window.__farmQA.facing()');
 check('Camera orbit changes view smoothly',Math.abs(orbited.viewAngle-facing.viewAngle)>.2,
  {before:facing,after:orbited});
 const initial=await evaluate('window.__farmQA.state()');
 check('Ripe rice available',initial.fields.find(x=>x.id==='rice-4').growth===1);
 await evaluate('window.__farmQA.teleport(-8.65,-0.9)');
 await evaluate('window.__farmQA.select("rice-4")');
 await click('#actionButtons [data-action="harvest"]');
 check('Harvest shows five in-world sickle zones',
   (await evaluate("!document.querySelector('#fieldWorkHud').classList.contains('hidden')"))&&
   (await evaluate('window.__farmQA.markers("rice-4").work'))===5);
 const immediate=await evaluate('window.__farmQA.state()');
 check('Opening sickle HUD never creates free yield',
   immediate.inventory.rice===initial.inventory.rice&&immediate.stats.harvests===initial.stats.harvests);
 await screenshot('02a-sickle-hud');
 check('3D sickle target accepts the actual raycast input path',
   (await evaluate('window.__farmQA.tap("work",0)'))===true);
 const queuedHarvest=await evaluate('window.__farmQA.state()');
 check('Sickle does not cut before contact',
   queuedHarvest.fields.find(x=>x.id==='rice-4').work.harvested.every(x=>!x)&&queuedHarvest.inventory.rice===0);
 await waitFor('window.__farmQA.state().fields.find(x=>x.id==="rice-4").work.harvested[0]===true',12000);
 await waitFor('!window.__farmQA.flow().busy',5500);
 const oneCut=await evaluate('window.__farmQA.state()');
 check('First cut only removes one row',oneCut.fields.find(x=>x.id==='rice-4').work.harvested.filter(Boolean).length===1&&
   oneCut.inventory.rice===0&&oneCut.stats.harvests===0);
 await screenshot('02b-first-cut-row');
 for(const n of [1,2,3,4]){
   await evaluate('window.__farmQA.work('+n+')');
   if(n<4)await waitFor('window.__farmQA.state().fields.find(x=>x.id==="rice-4").work.harvested['+n+']===true',12000);
   else await waitFor('window.__farmQA.state().stats.harvests===1',12000);
   await waitFor('!window.__farmQA.flow().busy',5000);
 }
 const harvested=await evaluate('window.__farmQA.state()');
 check('Fifth cut pays yield and clears field',
   harvested.inventory.rice>0&&harvested.stats.harvests===1&&
   !harvested.fields.find(x=>x.id==='rice-4').planted,harvested.stats);
 await screenshot('02-harvest');
 await evaluate('window.__farmQA.teleport(18,-9.5)');
 await click('#barnBtn');
 await waitFor('document.querySelector("#modalTitle").textContent.includes("창고")',9000);
 await click('.bag-item button');
 const loaded=await evaluate('window.__farmQA.state()');
 check('Barn physically moves harvest into carried basket',loaded.cargo.rice>0&&
   loaded.inventory.rice===0&&loaded.stats.sales===0,loaded.cargo);
 await click('#modalClose');
 await evaluate('window.__farmQA.teleport(8.5,15.25)');
 await click('#bagBtn');
 await waitFor('!document.querySelector("#modal").classList.contains("hidden")',9000);
 await click('.sell-btn');
 const sold=await evaluate('window.__farmQA.state()');
 check('Market only sells crops carried from the barn',sold.inventory.rice===0&&sold.cargo.rice===0&&sold.money>initial.money&&sold.stats.sales===1);
 await click('#modalClose');
 await evaluate('window.__farmQA.teleport(-8.65,-0.9)');
 await evaluate('window.__farmQA.select("rice-4")');
 await click('#actionButtons [data-action="till"]');
 check('Hoe tool opens five physical working rows',
   (await evaluate("!document.querySelector('#fieldWorkHud').classList.contains('hidden')"))&&
   (await evaluate('window.__farmQA.markers("rice-4").work'))===5);
 for(const n of [0,1,2,3,4]){
   await evaluate('window.__farmQA.work('+n+')');
   await waitFor('window.__farmQA.state().fields.find(x=>x.id==="rice-4").work.tilled['+n+']===true',12000);
   await waitFor('!window.__farmQA.flow().busy',5000);
 }
 check('Hoeing prepares soil after fifth stroke',
   (await evaluate('window.__farmQA.state().fields.find(x=>x.id==="rice-4").work.tilled.every(Boolean)')));
 await evaluate('window.__farmQA.select("rice-4")');
 await click('#actionButtons [data-action="plant"]');
 const planting=await evaluate('window.__farmQA.plantMode()');
 check('Plant action opens in-world planting mini game',planting.active&&
   (await evaluate('window.__farmQA.markers("rice-4").plant'))===25,planting);
 await screenshot('02a-planting-hud-desktop');
 check('3D rice seedling position accepts the raycast input path',
   (await evaluate('window.__farmQA.tap("plant",12)'))===true);
 const queued=await evaluate('window.__farmQA.state()');
 check('Seedling does not appear until hand reaches the mud',
   queued.fields.find(x=>x.id==='rice-4').transplants.every(x=>!x),queued.fields.find(x=>x.id==='rice-4'));
 await waitFor('window.__farmQA.state().fields.find(x=>x.id==="rice-4").transplants[12]===true',12000);
 await waitFor('!window.__farmQA.flow().busy',5000);
 const one=await evaluate('window.__farmQA.state()');
 check('One tap plants only one rice clump',one.fields.find(x=>x.id==='rice-4').transplants.filter(Boolean).length===1&&
   one.fields.find(x=>x.id==='rice-4').planted===false&&one.inventory.seedRice<initial.inventory.seedRice);
 await screenshot('02b-one-seedling-desktop');
 await evaluate('window.__farmQA.plant(13)');
 await waitFor('window.__farmQA.state().fields.find(x=>x.id==="rice-4").transplants[13]===true',12000);
 await waitFor('!window.__farmQA.flow().busy',5000);
 const two=await evaluate('window.__farmQA.state()');
 check('Second tap uses same bundle and keeps the first planted',
   two.fields.find(x=>x.id==='rice-4').transplants.filter(Boolean).length===2&&
   two.inventory.seedRice===one.inventory.seedRice);
 // Speed up only the remaining positions in browser regression; pure model
 // tests verify all 25 seedling contacts individually.
 check('Completing 25 spots yields the growing crop',
   (await evaluate('window.__farmQA.finishPlanting("rice-4")'))===25);
 await click('#exitPlanting');
 await waitFor('window.__farmQA.state().fields.find(x=>x.id==="rice-4").planted===true');
 const planted=await evaluate('window.__farmQA.state()');
 check('Replant changes crop state and consumes seed',
   planted.fields.find(x=>x.id==='rice-4').planted&&
   planted.fields.find(x=>x.id==='rice-4').growth<.2&&planted.inventory.seedRice<initial.inventory.seedRice);
 await evaluate('window.__farmQA.teleport(-8.65,-0.9)');
 await evaluate('window.__farmQA.gate("rice-4")');
 await waitFor('!window.__farmQA.flow().busy',5000);
 const gated=await evaluate('window.__farmQA.state()');
 check('Open water gate increases water',gated.fields.find(x=>x.id==='rice-4').gate&&
  gated.fields.find(x=>x.id==='rice-4').water>initial.fields.find(x=>x.id==='rice-4').water);
 await evaluate('window.__farmQA.teleport(9.9,-10.05)');
 await click('#sleepBtn');
 await waitFor('document.querySelector("#modalTitle").textContent.includes("쉬어가기")',8000);
 await click('.rest-option');
 await waitFor('window.__farmQA.state().day===2',15000);
 await click('#modalClose');
 const morning=await evaluate('window.__farmQA.state()');
 check('Day advances crop growth',morning.day===2&&
  morning.fields.find(x=>x.id==='rice-4').growth>planted.fields.find(x=>x.id==='rice-4').growth);
 await screenshot('03-replanted-paddy');
 // Pressing a distant farm action once must walk to the field and perform it.
 await evaluate('window.__farmQA.teleport(0,9)');
 await evaluate('window.__farmQA.select("rice-1")');
 const beforeWeeding=await evaluate('window.__farmQA.state()');
 await click('#actionButtons [data-action="weed"]');
 await evaluate('window.__farmQA.work(0)');
 const approach=await evaluate('window.__farmQA.flow()');
 check('One distant farm tap queues automatic approach',approach.busy&&approach.active.phase==='approach',
  approach);
 const noPremature=await evaluate('window.__farmQA.state()');
 check('No resources consumed during approach',noPremature.fields.find(x=>x.id==='rice-1').growth===
  beforeWeeding.fields.find(x=>x.id==='rice-1').growth);
 await waitFor('!window.__farmQA.flow().busy',35000);
 const walked=await evaluate('window.__farmQA.state()');
 check('Far-away action completes without second button press',walked.energy<beforeWeeding.energy&&
   walked.fields.find(x=>x.id==='rice-1').work.weeded[0],
  {start:beforeWeeding.player,end:walked.player,energy:walked.energy});
 await click('#exitFieldWork');
 await send('Page.reload',{ignoreCache:true});
 await waitFor('Boolean(window.__farmQA?.ready())',35000);
 const restored=await evaluate('window.__farmQA.state()');
 check('Save survives reload',restored.day===2&&restored.money===sold.money&&
  restored.fields.find(x=>x.id==='rice-4').planted&&restored.fields.find(x=>x.id==='rice-1').work.weeded[0]&&restored.saving>100);
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
 await sleep(500);
 const mobile=await evaluate('({w:innerWidth,h:innerHeight,scroll:document.documentElement.scrollWidth,bar:document.querySelector("#bottomBar").getBoundingClientRect().width,bag:document.querySelector("#bagBtn").getBoundingClientRect().width,stick:getComputedStyle(document.querySelector("#joystick")).display})');
 check('Mobile portrait main controls fit',mobile.scroll<=mobile.w+5&&mobile.bar>0&&mobile.bag>0&&mobile.stick!=='none',mobile);
 const buttons=await evaluate(`(()=>{const b=document.querySelector('#bottomBar').getBoundingClientRect();
   return [...document.querySelectorAll('#bottomBar button')].map(el=>{
     const r=el.getBoundingClientRect();return {label:el.textContent,visible:r.width>0&&r.height>0&&
       r.left>=b.left-2&&r.right<=b.right+2&&r.bottom<=innerHeight};
   });
 })()`);
 check('Every mobile tool is visible without horizontal scrolling',buttons.every(x=>x.visible),buttons);
 const intro=await evaluate(`(()=>{const r=document.querySelector('#objective').getBoundingClientRect();
   return {right:r.right,width:r.width,view:innerWidth}})()`);
 check('Mobile onboarding leaves majority of game view unobscured',intro.width<intro.view*.65,intro);
 await screenshot('04-mobile-portrait');
 await evaluate('window.__farmQA.select("carrot-1")');
 await click('#actionButtons [data-action="water"]');
 const portraitWork=await evaluate(`(()=>{
   const el=document.querySelector('#fieldWorkHud'),r=el.getBoundingClientRect();
   return {w:innerWidth,visible:!el.classList.contains('hidden'),
     left:r.left,right:r.right,zones:window.__farmQA.markers('carrot-1').work};
 })()`);
 check('Mobile fieldwork HUD fits while five zones stay on the field',
   portraitWork.visible&&portraitWork.zones===5&&portraitWork.left>=0&&
   portraitWork.right<=portraitWork.w,portraitWork);
 await screenshot('04b-mobile-water-tool-hud');
 await click('#exitFieldWork');
 await evaluate('window.__farmQA.select("rice-1")');
 await click('#actionButtons [data-action="plant"]');
 const portraitPlant=await evaluate(`(()=>{
   const hud=document.querySelector('#plantingHud').getBoundingClientRect();
   return {w:innerWidth,visible:!document.querySelector('#plantingHud').classList.contains('hidden'),
     left:hud.left,right:hud.right,bottom:hud.bottom,zones:window.__farmQA.markers('rice-1').plant};
 })()`);
 check('Mobile planting HUD fits with 25 in-world planting spots',
   portraitPlant.visible&&portraitPlant.zones===25&&portraitPlant.left>=0&&
   portraitPlant.right<=portraitPlant.w,portraitPlant);
 await screenshot('04a-mobile-transplant-hud');
 await click('#exitPlanting');
 const touchStart=await evaluate('window.__farmQA.state().player');
 const stick=await evaluate(`(()=>{const r=document.querySelector('#joystick').getBoundingClientRect();
   return {x:r.left+r.width/2,y:r.top+r.height/2,
     front:document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.closest('#joystick')?.id||null,
     inspector:!document.querySelector('#inspector').classList.contains('hidden')}})()`);
 check('Joystick stays tappable above the restored mobile inspector',
   stick.front==='joystick'&&stick.inspector,stick);
 await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:stick.x,y:stick.y,id:17}]});
 await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:stick.x+25,y:stick.y-7,id:17}]});
 await sleep(640);
 await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 const touchEnd=await evaluate('window.__farmQA.state().player');
 check('Real mobile virtual joystick moves player',Math.hypot(touchEnd.x-touchStart.x,touchEnd.z-touchStart.z)>.16,
   {start:touchStart,end:touchEnd});
 const visibleTools=await evaluate(`(()=>({main:document.querySelectorAll('#bottomBar button').length,
   menuHidden:document.querySelector('#moreTools').classList.contains('hidden'),
   panel:document.querySelector('#bottomBar').getBoundingClientRect().toJSON(),
   header:document.querySelector('#topbar').getBoundingClientRect().toJSON()}))()`);
 check('Mobile has four visible primary tools',visibleTools.main===4&&visibleTools.menuHidden,visibleTools);
 await evaluate('window.__farmQA.select("rice-1")');
 await sleep(480);
 const sheet=await evaluate(`(()=>{
   const ins=document.querySelector('#inspector'),obj=document.querySelector('#objective');
   const r=ins.getBoundingClientRect(),o=obj.getBoundingClientRect();
   const a=window.__farmQA.facing().actorScreen;
   return {sheet:{left:r.left,top:r.top,bottom:r.bottom,width:r.width},
     objective:getComputedStyle(obj).display,actor:a,screen:{w:innerWidth,h:innerHeight}};
 })()`);
 check('Mobile field inspection removes overlapping objective',sheet.objective==='none',sheet);
 check('Field inspector fits phone and leaves actor above the sheet',
  sheet.sheet.left>=-1&&sheet.sheet.bottom<=sheet.screen.h+1&&
  sheet.actor.y<sheet.sheet.top+40,sheet);
 await screenshot('05-mobile-field-inspector');
 await click('#closeInspect');
 await click('#moreBtn');
 const menu=await evaluate(`(()=>{
   const e=document.querySelector('#moreTools'),r=e.getBoundingClientRect();
   return {open:!e.classList.contains('hidden'),left:r.left,right:r.right,bottom:r.bottom,height:r.height};
 })()`);
 check('More controls remain within mobile viewport',menu.open&&menu.left>=0&&
   menu.right<=390&&menu.bottom<=844,menu);
 await screenshot('06-mobile-advanced-controls');
 await click('#moreBtn');
 await evaluate('window.__farmQA.teleport(8.5,15.25)');
 await click('#bagBtn');
 await waitFor('!document.querySelector("#modal").classList.contains("hidden")',9000);
 const modalStart=await evaluate('window.__farmQA.state().player');
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'d',code:'KeyD',windowsVirtualKeyCode:68});
 await sleep(300);
 await send('Input.dispatchKeyEvent',{type:'keyUp',key:'d',code:'KeyD',windowsVirtualKeyCode:68});
 const modalEnd=await evaluate('window.__farmQA.state().player');
 check('Inventory modal blocks unwanted movement',
   Math.hypot(modalEnd.x-modalStart.x,modalEnd.z-modalStart.z)<.001,
   {modalStart,modalEnd});
 await screenshot('07-mobile-inventory');
 await click('#modalClose');
 await send('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:true});
 await sleep(280);
 const landscape=await evaluate(`(()=>{
   const r=document.querySelector('#bottomBar').getBoundingClientRect();
   return {w:innerWidth,h:innerHeight,scroll:document.documentElement.scrollWidth,
     toolbar:{left:r.left,right:r.right,bottom:r.bottom},buttons:[...document.querySelectorAll('#bottomBar button')].map(x=>x.getBoundingClientRect().toJSON())};
 })()`);
 check('Landscape phone retains four tappable controls',landscape.w>=840&&
   landscape.scroll<=landscape.w+3&&landscape.buttons.every(b=>
     b.width>=45&&b.height>=38&&b.right<=landscape.w&&b.bottom<=landscape.h),
   landscape);
 await screenshot('08-mobile-landscape');

 // Full in-game work-flow playthrough on a clean save, without direct crop-state shortcuts.
 await send('Emulation.setDeviceMetricsOverride',{width:1260,height:760,deviceScaleFactor:1,mobile:false});
 await send('Emulation.setTouchEmulationEnabled',{enabled:false});
 await evaluate('window.__farmQA.clearSave()');
 await send('Page.reload',{ignoreCache:true});
 await waitFor('Boolean(window.__farmQA?.ready())',35000);
 const fresh=await evaluate('window.__farmQA.state()');
 check('Marathon fresh save has 25 unplanted seedlings and starting supplies',
   fresh.day===1&&fresh.inventory.seedRice===8&&fresh.energy===100&&
   fresh.fields.find(f=>f.id==='rice-1').transplants.every(v=>!v),fresh);
 await click('#guideRice');
 await click('#actionButtons [data-action="plant"]');
 check('New-farm guidance leads to a playable in-world transplant HUD',
   (await evaluate('window.__farmQA.plantMode().active'))===true);
 for(let n=0;n<5;n++){
   await evaluate('window.__farmQA.plant('+n+')');
   await waitFor('window.__farmQA.state().fields.find(f=>f.id==="rice-1").transplants['+n+']===true',15000);
   await waitFor('!window.__farmQA.flow().busy',15000);
 }
 const firstFive=await evaluate('window.__farmQA.state()');
 check('Five individual spots each require a completed tool action',
   firstFive.fields.find(f=>f.id==='rice-1').transplants.filter(Boolean).length===5,
   firstFive.fields.find(f=>f.id==='rice-1').transplants);
 await screenshot('09-marathon-paused-planting');
 for(let n=5;n<25;n++){
   await evaluate('window.__farmQA.plant('+n+')');
   await waitFor('window.__farmQA.state().fields.find(f=>f.id==="rice-1").transplants['+n+']===true',15000);
   await waitFor('!window.__farmQA.flow().busy',15000);
 }
 const full=await evaluate('window.__farmQA.state()');
 check('All 25 individual planting actions use exactly one seed bundle',
   full.fields.find(f=>f.id==='rice-1').transplants.filter(Boolean).length===25&&
   full.inventory.seedRice===7&&full.energy===75&&
   full.fields.find(f=>f.id==='rice-1').planted,full);
 await screenshot('10-marathon-all-25-planted');
 check('Finished planting restores normal field inspection and control',
   (await evaluate("!document.querySelector('#inspector').classList.contains('hidden')"))===true);
 // Use the game's day-transition function, including its genuine weather and growth rules.
 let ripe=false,elapsedDays=0,minHealth=1;
 for(let n=0;n<115;n++){
   const a=await evaluate('window.__farmQA.state()');
   const f=a.fields.find(x=>x.id==='rice-1');
   if(f.growth>=.999){ripe=true;break}
   await evaluate('window.__farmQA.rest()');
   await click('#modalClose');
   elapsedDays++;
 }
 const calendarRun=await evaluate('window.__farmQA.state()');
 check('Full rice season eventually reaches harvest readiness through actual day turns',
   ripe||calendarRun.fields.find(f=>f.id==='rice-1').growth>=.999,
   {days:elapsedDays,now:calendarRun.day,crop:calendarRun.fields.find(f=>f.id==='rice-1')});
 await screenshot('11-marathon-grown-rice');
 await evaluate('window.__farmQA.select("rice-1")');
 await click('#actionButtons [data-action="harvest"]');
 for(const n of [0,1]){
   await evaluate('window.__farmQA.work('+n+')');
   await waitFor('window.__farmQA.state().fields.find(f=>f.id==="rice-1").work.harvested['+n+']===true',15000);
   await waitFor('!window.__farmQA.flow().busy',12000);
 }
 const cut2=await evaluate('window.__farmQA.state()');
 check('Partial harvest retains living standing rows without paying inventory',
   cut2.fields.find(f=>f.id==='rice-1').work.harvested.filter(Boolean).length===2&&
   cut2.inventory.rice===0&&cut2.stats.harvests===0,cut2);
 await screenshot('12-marathon-half-harvest');
 await click('#exitFieldWork');
 await send('Page.reload',{ignoreCache:true});
 await waitFor('Boolean(window.__farmQA?.ready())',35000);
 const midRestore=await evaluate('window.__farmQA.state()');
 check('Quit/reload mid-harvest preserves exactly two cut rows with no stock',
   midRestore.fields.find(f=>f.id==='rice-1').work.harvested.filter(Boolean).length===2&&
   midRestore.stats.harvests===0&&midRestore.inventory.rice===0,midRestore);
 await evaluate('window.__farmQA.select("rice-1")');
 await click('#actionButtons [data-action="harvest"]');
 for(const n of [2,3,4]){
   await evaluate('window.__farmQA.work('+n+')');
   if(n<4)await waitFor('window.__farmQA.state().fields.find(f=>f.id==="rice-1").work.harvested['+n+']===true',15000);
   else await waitFor('window.__farmQA.state().stats.harvests===1',15000);
   await waitFor('!window.__farmQA.flow().busy',12000);
 }
 const fullHarvest=await evaluate('window.__farmQA.state()');
 check('Finishing interrupted harvest pays exactly once and clears standing rice',
   fullHarvest.stats.harvests===1&&fullHarvest.inventory.rice>0&&
   !fullHarvest.fields.find(f=>f.id==='rice-1').planted,fullHarvest);
 await screenshot('13-marathon-complete-harvest');
 await evaluate('window.__farmQA.teleport(8.5,15.25)');
 await click('#bagBtn');
 await waitFor('!document.querySelector("#modal").classList.contains("hidden")',9000);
 await click('.sell-btn');
 const soldAfter=await evaluate('window.__farmQA.state()');
 check('Real full-cycle sale increments balance and removes harvested crop',
   soldAfter.stats.sales===1&&soldAfter.inventory.rice===0&&soldAfter.money>4200,soldAfter);
 const preUpgrade=await evaluate('window.__farmQA.state()');
 await click('.farm-upgrade button:not(:disabled)');
 const upgraded=await evaluate('window.__farmQA.state()');
 check('First sale unlocks a persistable tool upgrade with actual coin cost',
   Object.values(upgraded.upgrades).some(Boolean)&&upgraded.money<preUpgrade.money,
   {before:preUpgrade.money,after:upgraded.money,upgrades:upgraded.upgrades});
 await click('#modalClose');
 await evaluate('window.__farmQA.teleport(-12.85,-5.2)');
 await evaluate('window.__farmQA.select("rice-1")');
 await click('#actionButtons [data-action="till"]');
 for(const n of [0,1,2,3,4]){
   await evaluate('window.__farmQA.work('+n+')');
   await waitFor('window.__farmQA.state().fields.find(f=>f.id==="rice-1").work.tilled['+n+']===true',15000);
   await waitFor('!window.__farmQA.flow().busy',12000);
 }
 const plowed=await evaluate('window.__farmQA.state()');
 check('Full-cycle plowing restores sowable ground in five physical passes',
   plowed.fields.find(f=>f.id==='rice-1').work.tilled.every(Boolean),plowed);
 await screenshot('14-marathon-soil-ready');
 await send('Page.reload',{ignoreCache:true});
 await waitFor('Boolean(window.__farmQA?.ready())',35000);
 const persisted=await evaluate('window.__farmQA.state()');
 check('End-to-end harvest/sale/soil restoration persists across second reload',
   persisted.stats.harvests===1&&persisted.stats.sales===1&&
   persisted.fields.find(f=>f.id==='rice-1').work.tilled.every(Boolean)&&
   !persisted.fields.find(f=>f.id==='rice-1').planted,
   {day:persisted.day,inventory:persisted.inventory,stats:persisted.stats});
 report.endurance={daysElapsed:elapsedDays,startingMoney:4200,
   sales:persisted.stats.sales,harvests:persisted.stats.harvests,
   firstBatch:5,fullSeedlings:25,screenshots:6};
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

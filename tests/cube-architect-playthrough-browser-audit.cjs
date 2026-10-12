#!/usr/bin/env node
'use strict';
// Full Chromium playthrough against the actual local game. Never mocks game logic.
// A temporary /game.js-only playtest probe reads closure state to validate side effects.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const http=require('node:http'),cp=require('node:child_process'),os=require('node:os');
const {once}=require('node:events');
const ROOT=path.resolve(__dirname,'..');
const OUTPUT=process.env.KIDSCADE_CUBE_AUDIT_OUT||path.join(os.tmpdir(),'kidscade-cube-playthrough');
fs.mkdirSync(OUTPUT,{recursive:true});
const CHROME=[process.env.CHROME_BIN,'/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser']
  .filter(Boolean).find(fs.existsSync);
assert.ok(CHROME,'Chrome not installed');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
 '.glb':'model/gltf-binary','.gltf':'model/gltf+json','.png':'image/png','.jpg':'image/jpeg','.json':'application/json'};
const HOOK=`window.__cubePlaytest={
 state:()=>({mode,gameFreeMode,camp:campStep()?.id||null,workbench:magicWorkbenchPos?.slice(),
   pos:camera.position.toArray(),health:survivalHealth,bag:{...survivalBag},
   benchOpen:survivalCamp.workbenchOpened||false,inventoryOpen,surface:survivalInventoryTab,
   workbenchModel:magicWorkbenchPos?worldMeshMap.get(worldKey(...magicWorkbenchPos))?.children?.length:0,
   saveEdits:worldEdits.size,returnAt:magicWorkbenchReturnAt}),
 near:()=>hasWorkbench(),moveTo:(x,z)=>{
   const top=groundTopBelow(x,30,z);camera.position.set(x,top+1.62,z);
   freePhysicsY=top+1.62;freeVelocityY=0;onGround=true;streamWorldMeshes(true);return camera.position.toArray();
 },
 useBench:()=>{const p=magicWorkbenchPos;return p?placeFreeBlock({object:{userData:{type:'workbench',gx:p[0],gy:p[1],gz:p[2]}}}):false},
 give:(t,n)=>addToBag(t,n),doReturn:()=>magicWorkbenchReturn(),
 setExposure:n=>{survivalExposure=n;renderSurvivalSafety(null)},
 campId:()=>campStep()?.id,
 currentBlock:(p)=>getBlock(...p)?.type||null,
 homeReturnPoint:()=>magicWorkbenchReturnPoint(),
 closeTutorial:()=>tutorialFinish(false)
};`;
const server=http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(pathname==='/favicon.ico'){res.writeHead(204);res.end();return}
 const full=path.resolve(ROOT,'.'+decodeURIComponent(pathname));
 if(full!==ROOT&&!full.startsWith(ROOT+path.sep)){res.writeHead(403);res.end();return}
 fs.readFile(full,(err,bytes)=>{
   if(err){res.writeHead(404);res.end('Missing '+pathname);return}
   if(pathname==='/games/cube3d/cube-architect.js'){
     let source=bytes.toString('utf8');
     const needle='window.CubeArchitect={enterMode,showHome};';
     if(!source.includes(needle)){res.writeHead(500);res.end('Missing test hook point');return}
     bytes=Buffer.from(source.replace(needle,HOOK+'\n'+needle));
   }
   res.writeHead(200,{'content-type':mime[path.extname(full)]||'application/octet-stream'});res.end(bytes);
 });
});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let chrome,ws,profile;
const errors=[],steps=[],requests=[];
async function run(){
  server.listen(0,'127.0.0.1');await once(server,'listening');
  profile=fs.mkdtempSync(path.join(os.tmpdir(),'cube-realbrowser-'));
  chrome=cp.spawn(CHROME,['--headless=new','--no-sandbox','--disable-dev-shm-usage',
    '--enable-webgl','--enable-unsafe-swiftshader','--use-angle=swiftshader','--remote-allow-origins=*',
    '--disable-background-networking','--no-first-run','--remote-debugging-port=0','--user-data-dir='+profile,
    'about:blank'],{stdio:['ignore','ignore','pipe']});
  let stderr='';chrome.stderr.on('data',data=>{stderr=(stderr+String(data)).slice(-1800)});
  let endpoint;
  for(let i=0;i<200;i++){
    if(chrome.exitCode!==null)throw Error('Chrome died '+stderr);
    const p=path.join(profile,'DevToolsActivePort');
    if(fs.existsSync(p))try{
      const port=Number(fs.readFileSync(p,'utf8').split('\n')[0]);
      endpoint=(await(await fetch('http://127.0.0.1:'+port+'/json/list')).json()).find(x=>x.type==='page')?.webSocketDebuggerUrl;
    }catch{}
    if(endpoint)break;await sleep(100);
  }
  assert.ok(endpoint,'No Chrome DevTools endpoint '+stderr);
  ws=new WebSocket(endpoint);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});
  let id=0;const pending=new Map();
  ws.onmessage=e=>{
    const message=JSON.parse(String(e.data));
    if(message.method==='Runtime.exceptionThrown')errors.push('EXCEPTION: '+(message.params?.exceptionDetails?.exception?.description||message.params?.exceptionDetails?.text||'').slice(0,650));
    if(message.method==='Log.entryAdded'&&message.params?.entry?.level==='error')errors.push('LOG: '+message.params.entry.text);
    if(message.method==='Network.responseReceived'&&message.params?.response?.status>=400)requests.push({status:message.params.response.status,url:message.params.response.url});
    if(!message.id||!pending.has(message.id))return;
    const p=pending.get(message.id);pending.delete(message.id);
    if(message.error)p.reject(Error(message.error.message));else p.resolve(message.result||{});
  };
  const send=(method,params={})=>new Promise((resolve,reject)=>{const key=++id;pending.set(key,{resolve,reject});ws.send(JSON.stringify({id:key,method,params}))});
  const evaluate=async expression=>{
    const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(result.exceptionDetails)throw Error('Evaluate: '+JSON.stringify(result.exceptionDetails).slice(0,1100));
    return result.result?.value;
  };
  const click=selector=>evaluate('document.querySelector('+JSON.stringify(selector)+').click()');
  const state=()=>evaluate('window.__cubePlaytest?.state()');
  const waitFor=async(expr,timeout=15000)=>{
    for(let i=0;i<timeout/160;i++){try{if(await evaluate(expr))return true}catch{}await sleep(160)}
    throw Error('Timed out: '+expr+'; '+JSON.stringify({errors:errors.slice(-6),requests:requests.slice(-7)}));
  };
  const record=(name,data)=>{steps.push({name,data});console.log('CUBE_PLAY',name,JSON.stringify(data))};
  const screenshot=async name=>{
    const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true});
    const buffer=Buffer.from(shot.data,'base64');fs.writeFileSync(path.join(OUTPUT,name+'.png'),buffer);
    const sharp=require('sharp'),meta=await sharp(buffer).stats();
    record('frame_'+name,{bytes:buffer.length,mean:Math.round(meta.channels.slice(0,3).reduce((a,c)=>a+c.mean,0)/3)});
    assert.ok(buffer.length>12000,'Blank browser render '+name);
  };
  const key=async(code,keyCode)=>{await send('Input.dispatchKeyEvent',{type:'keyDown',code,key:keyCode,windowsVirtualKeyCode:keyCode==='e'||keyCode==='E'?69:27});await sleep(90);await send('Input.dispatchKeyEvent',{type:'keyUp',code,key:keyCode,windowsVirtualKeyCode:keyCode==='e'||keyCode==='E'?69:27})};
  const viewport=(w,h,deviceScaleFactor=1,mobile=false)=>send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor,mobile});
  await send('Page.enable');await send('Runtime.enable');await send('Log.enable');await send('Network.enable');

  // Desktop: click the same game card and controls a real player sees.
  await viewport(1365,768,1,false);
  const url='http://127.0.0.1:'+server.address().port+'/games/cube3d/index.html';
  await send('Page.navigate',{url});
  await waitFor('window.CubeArchitectReady===true',20000);
  assert.ok(await evaluate('!document.querySelector("#homeScreen").classList.contains("hidden")'),'Home never appeared');
  await screenshot('01-desktop-home');
  await click('[data-mode="free"]');
  await waitFor('window.__cubePlaytest?.state()?.workbench?.length===3',25000);
  await sleep(700);
  const start=await state();
  record('desktop_started',start);
  assert.equal(start.mode,'free');
  assert.equal(start.gameFreeMode,'survival');
  assert.ok(start.workbenchModel>=1,'Workbench world object never appeared');
  assert.ok(start.saveEdits>0,'Starter placed without saving');
  assert.ok(await evaluate('!document.querySelector("#magicWorkbenchGuide").classList.contains("hidden")'),'Magic direction HUD missing');
  await screenshot('02-desktop-tutorial-and-workshop');
  // Dismiss first-time tutorial through the real visible UI.
  await click('#tutorialSkip');await sleep(120);
  await key('KeyE','e');await sleep(220);
  const bag=await evaluate('({open:!document.querySelector("#blockInventory").classList.contains("hidden"),mode:document.querySelector("#blockInventory").dataset.bagTab,title:document.querySelector("#inventoryTitle").textContent,craftDisplay:getComputedStyle(document.querySelector("#survivalCraftPanel")).display,bagDisplay:getComputedStyle(document.querySelector("#inventoryGrid")).display})');
  record('desktop_backpack',bag);
  assert.ok(bag.open&&bag.mode==='bag'&&bag.craftDisplay==='none'&&bag.bagDisplay!=='none','E must open backpack, not crafting');
  await screenshot('03-desktop-backpack');
  await click('#inventoryClose');await sleep(100);
  const away=await evaluate('window.__cubePlaytest.moveTo(18,5)');
  record('walked_far_simulated',away);
  await sleep(220);
  assert.equal(await evaluate('window.__cubePlaytest.near()'),false,'Far place should not count as near workbench');
  await key('KeyE','e');await sleep(100);
  const farPanel=await evaluate('({tab:document.querySelector("#blockInventory").dataset.bagTab,disabled:document.querySelector("[data-bag-tab=craft]").disabled})');
  record('far_backpack',farPanel);
  assert.equal(farPanel.tab,'bag');
  assert.equal(farPanel.disabled,true,'Player can manufacture remotely');
  await click('#inventoryClose');
  await screenshot('04-desktop-lost-near-far-hud');
  const beforeReturn=await state();
  await click('#magicWorkbenchReturn');await sleep(250);
  const afterReturn=await state();
  record('return_to_workbench',{before:beforeReturn.pos,after:afterReturn.pos,home:afterReturn.workbench,returnAt:afterReturn.returnAt});
  assert.ok(Math.hypot(afterReturn.pos[0]-afterReturn.workbench[0],afterReturn.pos[2]-afterReturn.workbench[2])<5,'Return did not land near workshop');
  assert.ok(afterReturn.returnAt>0,'Return cooldown not recorded');
  assert.equal(await evaluate('document.querySelector("#magicWorkbenchReturn").disabled'),true,'Return spam remains enabled');
  await screenshot('05-desktop-returned');
  // Native block-use event path, target ray provided by playtest probe.
  await evaluate('window.__cubePlaytest.useBench()');await sleep(350);
  const craftUI=await evaluate('({open:!document.querySelector("#blockInventory").classList.contains("hidden"),tab:document.querySelector("#blockInventory").dataset.bagTab,recipes:document.querySelectorAll("[data-recipe-id]").length,craftDisplay:getComputedStyle(document.querySelector("#survivalCraftPanel")).display,bagDisplay:getComputedStyle(document.querySelector("#inventoryGrid")).display})');
  record('workbench_crafting',craftUI);
  assert.ok(craftUI.open&&craftUI.tab==='craft'&&craftUI.craftDisplay!=='none'&&craftUI.bagDisplay==='none','Workbench did not open independent crafting screen');
  await screenshot('06-desktop-crafting');
  await evaluate('window.__cubePlaytest.give("log",5)');
  await sleep(250);
  const recipe=await evaluate('({available:!!document.querySelector("[data-recipe-id=planks]"),count:document.querySelectorAll("[data-recipe-id]").length})');
  record('gathered_wood_recipes',recipe);
  assert.ok(recipe.available,'Planks recipe not revealed after wood pickup');
  await click('[data-recipe-id="planks"]');await sleep(160);
  assert.equal(await evaluate('document.querySelector("#craftSelectedButton")?.disabled'),false,'Sufficient wood but cannot craft planks');
  await click('#craftSelectedButton');await sleep(720);
  const made=await state();record('wood_to_planks',{log:made.bag.log,planks:made.bag.planks});
  assert.ok(made.bag.planks>=4,'Craft action did not add planks');
  await screenshot('07-desktop-made-planks');
  await click('#inventoryClose');await click('#actionSave');await sleep(250);
  await send('Page.reload',{ignoreCache:true});
  await waitFor('window.CubeArchitectReady===true && window.__cubePlaytest?.state()?.mode==="home" && document.querySelector("[data-mode=free]")',25000);
  await click('[data-mode="free"]');await waitFor('window.__cubePlaytest?.state()?.workbench?.length===3',20000);
  const reloaded=await state();record('reload',{workbench:reloaded.workbench,bag:reloaded.bag,edits:reloaded.saveEdits});
  assert.deepEqual(reloaded.workbench,start.workbench,'Workshop moved on reload');
  assert.ok(reloaded.bag.planks>=4,'Crafted inventory not saved');

  // Mobile/tablet: restart with coarse pointer and real touch controls.
  await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  await viewport(844,390,2,true);
  await send('Page.navigate',{url:url+'?tablet=1'});
  await waitFor('window.CubeArchitectReady===true && location.search==="?tablet=1" && window.__cubePlaytest?.state()?.mode==="home"',25000);
  await click('[data-mode="free"]');await waitFor('window.__cubePlaytest?.state()?.workbench?.length===3',20000);
  await sleep(450);await screenshot('08-tablet-survival');
  const tablet=await evaluate('({mobile:!document.querySelector("#mobileControls").classList.contains("hidden"),inventory:!!document.querySelector("#mobileInventory"),direction:!document.querySelector("#magicWorkbenchGuide").classList.contains("hidden"),viewport:innerWidth,scroll:document.documentElement.scrollWidth})');
  record('tablet_start',tablet);
  assert.ok(tablet.mobile&&tablet.direction,'Tablet HUD/control missing');
  await click('#tutorialSkip');await click('#mobileInventory');await sleep(220);
  const mobileBag=await evaluate('({open:!document.querySelector("#blockInventory").classList.contains("hidden"),tab:document.querySelector("#blockInventory").dataset.bagTab,display:getComputedStyle(document.querySelector("#survivalCraftPanel")).display,rect:(()=>{const r=document.querySelector("#blockInventory").getBoundingClientRect();return {top:r.top,bottom:r.bottom}})()})');
  record('tablet_bag',mobileBag);
  assert.ok(mobileBag.open&&mobileBag.tab==='bag'&&mobileBag.display==='none','Tablet backpack opens crafting unexpectedly');
  await screenshot('09-tablet-bag');
  await click('#inventoryClose');
  // Test actual mobile workshop interaction path.
  await evaluate('window.__cubePlaytest.useBench()');await sleep(220);
  const tabletCraft=await evaluate('({open:!document.querySelector("#blockInventory").classList.contains("hidden"),tab:document.querySelector("#blockInventory").dataset.bagTab,display:getComputedStyle(document.querySelector("#survivalCraftPanel")).display})');
  record('tablet_craft',tabletCraft);
  assert.ok(tabletCraft.open&&tabletCraft.tab==='craft'&&tabletCraft.display!=='none','Tablet workshop fails');
  await screenshot('10-tablet-craft');
  await click('#inventoryClose');

  assert.equal(errors.length,0,'Browser exceptions: '+errors.slice(0,8).join(' | '));
  const critical=requests.filter(x=>/cube-architect|three-r160|assets\/game\/3d\/survival/.test(x.url));
  assert.deepEqual(critical,[],'Missing critical game resources');
  return {result:'PASS',steps,errors,requests};
}
run().then(result=>{fs.writeFileSync(path.join(OUTPUT,'report.json'),JSON.stringify(result,null,2));console.log('CUBE_PLAY_RESULT PASS')})
.catch(err=>{fs.writeFileSync(path.join(OUTPUT,'report.json'),JSON.stringify({result:'FAIL',error:String(err.stack||err),steps,errors,requests},null,2));console.error('CUBE_PLAY_RESULT FAIL',err.stack||err);process.exitCode=1})
.finally(async()=>{try{ws?.close()}catch{};try{chrome?.kill('SIGTERM')}catch{};try{server.close()}catch{};try{fs.rmSync(profile,{force:true,recursive:true})}catch{}});

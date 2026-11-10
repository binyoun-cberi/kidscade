#!/usr/bin/env node
'use strict';
// Real Chrome/WebGL playthrough of "못 찾겠다 꾀꼬리". Uses built-in Node CDP, not Playwright.
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const http=require('node:http');
const cp=require('node:child_process');
const assert=require('node:assert/strict');
const {once}=require('node:events');
const {findWalkingDelivery}=require('./helpers/kkwaekkori-motion.cjs');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.resolve(process.env.KIDSCADE_KKWA_AUDIT_OUT||path.join(os.tmpdir(),'kkwaekkori-real-play'));
const CHROME=[process.env.KIDSCADE_CHROMIUM,'/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(x=>x&&fs.existsSync(x));
if(!CHROME)throw Error('Need a Chrome/Chromium executable to perform the real WebGL playthrough');
fs.mkdirSync(OUT,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.glb':'model/gltf-binary','.gltf':'model/gltf+json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.json':'application/json'};
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  let file=path.resolve(ROOT,'.'+decodeURIComponent(url.pathname));
  if(url.pathname.endsWith('/'))file=path.join(file,'index.html');
  if(file!==ROOT&&!file.startsWith(ROOT+path.sep)){res.writeHead(403);res.end();return}
  fs.readFile(file,(err,body)=>{
    if(err){res.writeHead(404);res.end('Missing '+url.pathname);return}
    if(url.pathname.endsWith('/tod_mot_chatgetda_kkwaekkori/game.js')){
      const expose="\nwindow.__KK_TEST__={\n  snapshot:()=>({active,mode,stage:town?.stageName,people:town?.people.length,targets:town?.order.length,\n    found:found.length,level:challengeLevel,time:timeRemaining,viewSize,look:[cameraLook.x,cameraLook.z],\n    currentTarget:getTarget()?.id,celebration:!!celebration,preview:!!previewActor,\n    shown:!document.querySelector('#start').classList.contains('hidden')}),\n  targetTap:()=>{const t=getTarget(),h=citizenMeshes.get(t?.id)?.holder;if(!h)return null;\n    scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);\n    const p=h.position.clone();p.y+=.85;p.project(camera);\n    const r=canvas.getBoundingClientRect();\n    return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2,z:p.z};},\n  deliverySnapshot:()=>({seed:town?.seed,time:town?.time,residents:(town?.people||[]).filter(p=>p.routine==='deliver').map(p=>{\n    const h=citizenMeshes.get(p.id)?.holder;return {id:p.id,state:p.state,rendered:h?[h.position.x,h.position.z]:null,simulated:[p.position.x,p.position.z]};})}),\n  greetingSnapshot:()=>({events:town?.greetingCount||0,target:getTarget()?.id,\n    residents:(town?.people||[]).filter(p=>p.socialWith).map(p=>({\n      id:p.id,peer:p.socialWith,reserved:p.reserved,pose:getPose(p),\n      marker:greetingMarkers.get(p.id)?.visible||false,\n      position:[p.position.x,p.position.z]\n    }))}),\n  streetSnapshot:()=>{const plan=getStreetPlan(town);return {\n    roads:plan.roads.length,walks:plan.walks.length,crossings:plan.crossings.length,\n    shownWalks:scenery.getObjectByName('city-linked-sidewalks')?.count||0,\n    shownCrossings:scenery.getObjectByName('city-crossing-ramps')?.count||0,\n    zebra:scenery.getObjectByName('city-crossing-stripes')?.count||0,\n    trees:scenery.getObjectByName('city-greenbelt-crowns')?.count||0\n  }},\n  bakerySnapshot:()=>({time:town?.time,visits:town?.commerce.visits||0,\n    purchases:town?.commerce.purchases||0,completed:town?.commerce.completed||0,\n    shoppers:(town?.people||[]).filter(p=>p.errand?.phase==='carrying').map(p=>({\n      id:p.id,phase:p.errand.phase,visual:getVisualActivity(p),reserved:p.reserved,\n      bag:!!citizenMeshes.get(p.id)?.appearance.getObjectByName('bakery-shopping-bag'),\n      bread:p.errand.bread,propVariant:p.propVariant,block:p.block.id\n    }))}),\n  transitSnapshot:()=>{const service=town?.transit,bus=service?.bus,\n    car=cars.find(c=>c.routeBus),rider=town?.people.find(p=>p.id===bus?.rider);\n    return {enabled:!!service,stops:service?.stations.length||0,\n      platforms:scenery.children.filter(c=>c.name==='real-bus-platform').length,\n      boarded:service?.boarded||0,alighted:service?.alighted||0,arrivals:service?.arrivals||0,\n      phase:bus?.phase,stopIndex:bus?.stopIndex,bus:bus?[bus.position.x,bus.position.z]:null,\n      model:car?[car.holder.position.x,car.holder.position.z]:null,\n      door:car?.doorLamp.visible||false,\n      rider:rider?{id:rider.id,state:rider.state,reserved:rider.reserved,\n        visible:citizenMeshes.get(rider.id)?.holder.visible??null}:null};},\n  focusBus:()=>{const saved=[cameraLook.x,cameraLook.z],bus=town.transit.bus.position;\n    cameraLook.set(bus.x,0,bus.z);updateCamera();return saved;},\n  restoreFocus:(saved)=>{cameraLook.set(saved[0],0,saved[1]);updateCamera();},\n  trafficSnapshot:()=>({enabled:!!town?.traffic,phase:town?.traffic?trafficPhase(town):null,\n    junctions:town?.traffic?.junctions.length||0,\n    lights:trafficHeads.map(h=>({horizontal:h.horizontal.material.color.getHex(),\n      vertical:h.vertical.material.color.getHex()})),\n    cars:(town?.traffic?.cars||[]).map(c=>{const m=cars.find(x=>x.simCar===c);\n      return {id:c.id,sim:[c.position.x,c.position.z],\n        model:m?[m.holder.position.x,m.holder.position.z]:null};}),\n    lightStops:town?.traffic?.lightStops||0,\n    vehicleYields:town?.traffic?.vehicleYields||0}),\n  focusSignal:()=>{const old=[cameraLook.x,cameraLook.z],p=town.traffic.junctions[0];\n    cameraLook.set(p.x,0,p.z);updateCamera();return old;},\n  renderQuality:()=>{const b=renderer.getDrawingBufferSize(new THREE.Vector2());\n    const q=previewRenderer.getDrawingBufferSize(new THREE.Vector2());\n    return {pixelRatio:renderer.getPixelRatio(),previewRatio:previewRenderer.getPixelRatio(),\n      deviceDpr:devicePixelRatio,mainPixels:Math.round(b.x*b.y),\n      previewPixels:Math.round(q.x*q.y),drawCalls:renderer.info.render.calls,\n      visibleCitizens:town?.people.filter(p=>p.state!=='riding').length||0,\n      city:town?.stageName,frames:renderer.info.render.frame};},\n  legacyRenderBudget:()=>{renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.55));\n    previewRenderer.setPixelRatio(Math.min(devicePixelRatio||1,1.55));},\n  restoreRenderBudget:()=>{applyGraphicsBudget();},\n  frameProbe:(duration=1600)=>new Promise(done=>{let first=null,previous=null;const d=[];\n    function frame(now){if(first===null)first=now;\n      if(previous!==null)d.push(now-previous);previous=now;\n      if(now-first<duration){requestAnimationFrame(frame);return;}\n      const sorted=d.sort((a,b)=>a-b),total=sorted.reduce((a,b)=>a+b,0);\n      done({frames:d.length,fps:Math.round(1000*d.length/total*10)/10,\n        medianMs:Math.round(sorted[Math.floor(sorted.length*.5)]*10)/10,\n        p90Ms:Math.round(sorted[Math.floor(sorted.length*.9)]*10)/10,\n        deviceDpr:devicePixelRatio});}\n    requestAnimationFrame(frame);}),\n  vehicleGeometry:()=>{scene.updateMatrixWorld(true);\n    const vehicles=cars.filter(c=>c.routeBus||c.simCar).map(c=>{\n      const mesh=new THREE.Box3();let loaded=false;\n      for(const part of c.holder.children)if(part.name!=='bus-door-ready'){\n        mesh.expandByObject(part);loaded ||=part.type==='Group';}\n      const size=mesh.getSize(new THREE.Vector3());\n      return {kind:c.routeBus?'bus':'car',loaded,\n        length:c.routeBus?size.z:size.x,width:c.routeBus?size.x:size.z,\n        height:size.y,bounds:[mesh.min.x,mesh.max.x,mesh.min.z,mesh.max.z]};});\n    const bus=cars.find(c=>c.routeBus),box=new THREE.Box3();\n    if(bus)for(const part of bus.holder.children)if(part.name!=='bus-door-ready')box.expandByObject(part);\n    const pedestrians=(town?.people||[]).filter(p=>p.state==='walking');\n    const touching=pedestrians.filter(p=>{\n      const m=citizenMeshes.get(p.id);if(!m?.body)return false;\n      m.holder.updateMatrixWorld(true);\n      return box.intersectsBox(new THREE.Box3().setFromObject(m.body));\n    }).map(p=>p.id);\n    return {vehicles,touching,busPhase:town?.transit?.bus.phase||'none'};}\n};";
      // Seed only the audit's initial quick-start; normal gameplay stays random.
      const original=body.toString('utf8');
      const quickStart="startTown('small',getSeed(),[],'easy')";
      assert.ok(original.includes(quickStart),'quick-start seed hook must match the game');
      body=Buffer.from(original.replace(quickStart,"startTown('small',42,[],'easy')")+'\n'+expose);
    }
    res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});
    res.end(body);
  });
});
let chrome,ws,profile,serverOpen=false,passed=0;
(async()=>{
  server.listen(0,'127.0.0.1');await once(server,'listening');serverOpen=true;
  const base='http://127.0.0.1:'+server.address().port+'/games/tod_mot_chatgetda_kkwaekkori/';
  profile=fs.mkdtempSync(path.join(os.tmpdir(),'kkwaecc-chrome-'));
  chrome=cp.spawn(CHROME,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-background-networking','--no-first-run',
    '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--remote-allow-origins=*',
    '--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','pipe']});
  let stderr='';chrome.stderr.on('data',x=>{stderr=(stderr+String(x)).slice(-2400)});
  let target;
  for(let i=0;i<200;i++){
    if(chrome.exitCode!==null)throw Error('Chrome exited '+stderr);
    await sleep(100);
    const portFile=path.join(profile,'DevToolsActivePort');if(!fs.existsSync(portFile))continue;
    try{
      const port=Number(fs.readFileSync(portFile,'utf8').split(/\r?\n/)[0]);
      const all=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
      target=all.find(x=>x.type==='page');if(target)break;
    }catch(_){}
  }
  if(!target)throw Error('No Chrome DevTools page '+stderr);
  ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((ok,fail)=>{ws.onopen=ok;ws.onerror=fail});
  const pending=new Map(),errors=[];let seq=0;
  ws.onmessage=e=>{
    const d=JSON.parse(e.data);
    if(d.method==='Runtime.exceptionThrown')errors.push(d.params?.exceptionDetails?.exception?.description||d.params?.exceptionDetails?.text||'unknown browser exception');
    if(!d.id)return;const p=pending.get(d.id);if(!p)return;
    pending.delete(d.id);if(d.error)p.reject(Error(d.error.message));else p.resolve(d.result||{});
  };
  const send=(method,params={})=>new Promise((ok,fail)=>{const id=++seq;pending.set(id,{resolve:ok,reject:fail});ws.send(JSON.stringify({id,method,params}))});
  const evaluate=async code=>{
    const r=await send('Runtime.evaluate',{expression:code,returnByValue:true,awaitPromise:true});
    if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);
    return r.result?.value;
  };
  const wait=async(code,ms=40000)=>{
    const deadline=Date.now()+ms;let last;
    while(Date.now()<deadline){
      try{last=await evaluate(code);if(last)return last;}catch(e){last=e.message}
      await sleep(160);
    }
    throw Error('Timed out: '+code+' last='+JSON.stringify(last));
  };
  async function screenshot(name){
    const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    const buffer=Buffer.from(r.data,'base64');const file=path.join(OUT,name+'.png');
    fs.writeFileSync(file,buffer);assert.ok(buffer.length>25000,'Image is suspiciously blank: '+file);
    return buffer.length;
  }
  const click=async(x,y)=>{
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',x,y,button:'none'});
    await send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',clickCount:1});
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',clickCount:1});
  };
  await send('Page.enable');await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:base});
  await wait("!!document.querySelector('#quickStart') && !!window.__KK_TEST__",30000);
  await evaluate("document.querySelector('#quickStart').click()");
  await wait("window.__KK_TEST__.snapshot().active",65000);
  assert.equal(await evaluate("__KK_TEST__.snapshot().people"),18);
  assert.equal(await evaluate("__KK_TEST__.snapshot().preview"),true);
  const smallStreets=await evaluate("__KK_TEST__.streetSnapshot()");
  assert.equal(smallStreets.roads,3);
  assert.equal(smallStreets.walks,72);
  assert.equal(smallStreets.crossings,14);
  assert.equal(smallStreets.shownWalks,smallStreets.walks);
  assert.equal(smallStreets.shownCrossings,smallStreets.crossings);
  assert.equal(smallStreets.zebra,smallStreets.crossings*5);
  assert.ok(smallStreets.trees>=24,'the town should have a surrounding greenbelt');
  // Follow the actual bus, not a decorative car. It must move on the same
  // simulation coordinates while a background rider is hidden in the cabin.
  const ridingBus=await wait("(()=>{const s=__KK_TEST__.transitSnapshot();return s.enabled&&s.stops>=2&&s.platforms===s.stops&&s.boarded>0&&s.phase==='driving'&&s.rider?.state==='riding'&&!s.rider.visible&&Math.hypot(s.bus[0]-s.model[0],s.bus[1]-s.model[1])<.025?s:null;})()",45000);
  assert.equal(ridingBus.rider.reserved,false,'sought friend must remain on foot');
  assert.ok(ridingBus.bus.every(Number.isFinite),'bus position must be real and finite');
  const realGeometry=await evaluate("__KK_TEST__.vehicleGeometry()");
  assert.equal(realGeometry.vehicles.length,2,'small town bus and one road car');
  for(const vehicle of realGeometry.vehicles){
    assert.ok(vehicle.length>=vehicle.width,'3D vehicle meshes must face their actual lane');
    assert.ok(vehicle.width<1.45,'vehicle must fit inside a modeled street lane');
  }
  console.log('KKWA REAL VEHICLE GEOMETRY '+JSON.stringify(realGeometry));
  const oldFocus=await evaluate("__KK_TEST__.focusBus()");
  await screenshot('00-real-bus-with-passenger');passed++;
  await evaluate("__KK_TEST__.restoreFocus("+JSON.stringify(oldFocus)+")");
  // The rendered traffic light must show the same permission that actually
  // stops simulation-driven cars; all signals are placed at true intersections.
  const initialTraffic=await evaluate("__KK_TEST__.trafficSnapshot()");
  assert.equal(initialTraffic.enabled,true);
  assert.equal(initialTraffic.junctions,2);
  assert.equal(initialTraffic.lights.length,initialTraffic.junctions);
  assert.equal(initialTraffic.cars.length,1);
  const movingTraffic=await wait("(()=>{const s=__KK_TEST__.trafficSnapshot();const c=s.cars[0];return c?.model&&Math.abs(c.sim[0]-("+initialTraffic.cars[0].sim[0]+"))>.5&&Math.hypot(c.sim[0]-c.model[0],c.sim[1]-c.model[1])<.025?s:null;})()",25000);
  assert.ok(movingTraffic.cars[0].model,'a real three-dimensional car must follow the sim');
  const verticalGreen=await wait("(()=>{const s=__KK_TEST__.trafficSnapshot();return s.phase==='vertical'&&s.lights.length===2?s:null;})()",25000);
  for(const head of verticalGreen.lights){
    assert.equal(head.vertical,0x57e79c,'a permitted vertical bus lane must glow green');
    assert.equal(head.horizontal,0xe95d62,'cars stopped by this aspect must see red');
  }
  const previousLook=await evaluate("__KK_TEST__.focusSignal()");
  await screenshot('00-live-road-traffic-signals');passed++;
  await evaluate("__KK_TEST__.restoreFocus("+JSON.stringify(previousLook)+")");
  const deliveryStart=await evaluate("__KK_TEST__.deliverySnapshot()");
  assert.ok(deliveryStart.residents.length>0,'the town must contain delivery residents');
  // Deliveries depart after a short activity pause and may yield to traffic. Wait for their natural departure; never fast-forward or
  // change positions to make this check pass. Slow WebGL runners get wall time.
  const movementDeadline=Date.now()+90000;
  let deliveryEnd=deliveryStart,walkingDelivery=null;
  while(Date.now()<movementDeadline&&!walkingDelivery){
    await sleep(160);
    deliveryEnd=await evaluate("__KK_TEST__.deliverySnapshot()");
    walkingDelivery=findWalkingDelivery(deliveryStart,deliveryEnd);
  }
  assert.ok(walkingDelivery,'delivery residents must really walk in 3D: '+JSON.stringify({before:deliveryStart,after:deliveryEnd}));
  console.log('Natural delivery walk verified: '+JSON.stringify({id:walkingDelivery.id,seed:deliveryEnd.seed,time:deliveryEnd.time}));
  // Read a real WebGL frame with reciprocal greetings and visible scene markers.
  const greeting=await wait("(()=>{const s=__KK_TEST__.greetingSnapshot();return s.events>0&&s.residents.length>=2&&s.residents.every(p=>p.marker)?s:null;})()",30000);
  const pairs=new Map(greeting.residents.map(p=>[p.id,p]));
  for(const p of greeting.residents){
    const friend=pairs.get(p.peer);
    assert.ok(friend&&friend.peer===p.id,'greeting must be reciprocal in Chrome');
    assert.equal(p.reserved,false,'targets and near matches keep their original action');
    assert.notEqual(p.id,greeting.target);
    assert.equal(p.pose,'interact-right');
    assert.ok(Math.hypot(p.position[0]-friend.position[0],p.position[1]-friend.position[1])<=1.5);
  }
  // Follow a naturally purchased, rendered shopping bag in actual Chrome.
  const shopping=await wait("(()=>{const s=__KK_TEST__.bakerySnapshot();return s.purchases>0&&s.shoppers.some(p=>p.bag&&p.visual==='deliver')?s:null;})()",35000);
  const actualCarrier=shopping.shoppers.find(p=>p.bag&&p.visual==='deliver');
  assert.equal(actualCarrier.reserved,false,'the shopper must never be a target or foil');
  assert.equal(actualCarrier.bread,actualCarrier.propVariant,'the exact bread model is carried');
  await screenshot('00-bakery-purchase-and-bag');passed++;
  await screenshot('00-visible-neighbor-greeting');passed++;
  await screenshot('01-desktop-existing-game');passed++;
  // Test direct controls through CDP input, not via game's internal pick function.
  const look0=await evaluate("__KK_TEST__.snapshot().look");
  await click(830,440); // legitimate wrong/empty tap should not end the untimed game
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:720,y:470});
  await send('Input.dispatchMouseEvent',{type:'mousePressed',x:720,y:470,button:'left',clickCount:1});
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:810,y:490,button:'left',buttons:1});
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:810,y:490,button:'left',clickCount:1});
  const look1=await evaluate("__KK_TEST__.snapshot().look");
  assert.ok(Math.hypot(look1[0]-look0[0],look1[1]-look0[1])>.05,'Dragging the world must move the camera');
  await evaluate("document.querySelector('#resetViewBtn').click();document.querySelector('#rotateRight').click();document.querySelector('#seeThrough').click()");
  // Rotation changes the plane projection; verify drag still follows the ground.
  const turnBefore=await evaluate("__KK_TEST__.snapshot().look");
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:720,y:460});
  await send('Input.dispatchMouseEvent',{type:'mousePressed',x:720,y:460,button:'left',clickCount:1});
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:810,y:470,button:'left',buttons:1});
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:810,y:470,button:'left',clickCount:1});
  const turnAfter=await evaluate("__KK_TEST__.snapshot().look");
  assert.ok(Math.hypot(turnAfter[0]-turnBefore[0],turnAfter[1]-turnBefore[1])>.05,'Rotated camera dragging must still move the town');
    await evaluate("document.querySelector('#hintBtn').click();document.querySelector('#hintBtn').click()");
  await sleep(250);
  const xy=await evaluate("__KK_TEST__.targetTap()");
  assert.ok(xy&&xy.x>10&&xy.x<1270&&xy.y>5&&xy.y<795,'the target should be visible after hint '+JSON.stringify(xy));
  await click(xy.x,xy.y);
  await wait("__KK_TEST__.snapshot().found===1",6000);
  await wait("!document.querySelector('#finish').classList.contains('hidden')",8000);
  await screenshot('02-found-friend');passed++;
  // Large town: five consecutive targets, camera hint, see-through, real pointer events.
  await evaluate("document.querySelector('#otherStageBtn').click();document.querySelector('#difficulty').value='hard';document.querySelector('[data-stage=large]').click()");
  await wait("__KK_TEST__.snapshot().active&&__KK_TEST__.snapshot().targets===5",65000);
  const largeStreets=await evaluate("__KK_TEST__.streetSnapshot()");
  assert.equal(largeStreets.roads,9);
  assert.equal(largeStreets.walks,336);
  assert.equal(largeStreets.crossings,90);
  assert.equal(largeStreets.shownWalks,largeStreets.walks);
  assert.equal(largeStreets.shownCrossings,largeStreets.crossings);
  assert.equal(largeStreets.zebra,largeStreets.crossings*5);
  assert.ok((await evaluate("__KK_TEST__.transitSnapshot()")).stops>=2,'large city must have transit stations');
  await screenshot('03-large-town');passed++;
  // 1024x768 DPR2 iPad-style viewport with actual Chrome/WebGL rendering.
  // Report measured SwiftShader frame rates; never claim they represent a
  // physical iPad or require a device-independent minimum FPS.
  await send('Emulation.setDeviceMetricsOverride',{width:1024,height:768,deviceScaleFactor:2,mobile:true});
  await sleep(450);
  await evaluate('resize()');
  const tablet=await evaluate('__KK_TEST__.renderQuality()');
  assert.equal(tablet.city,'large');
  assert.equal(tablet.deviceDpr,2);
  assert.ok(tablet.pixelRatio<=1.001&&tablet.previewRatio<=1.001,
    'large-town tablet must respect DPR1 main and preview budget');
  const reduced=await evaluate('__KK_TEST__.frameProbe(1500)');
  await evaluate('__KK_TEST__.legacyRenderBudget()');
  const legacy=await evaluate('__KK_TEST__.renderQuality()');
  assert.ok(legacy.mainPixels>tablet.mainPixels*2.1,
    'DPR1 must allocate less than half the prior high-DPR world pixels');
  const oldPerformance=await evaluate('__KK_TEST__.frameProbe(1500)');
  await evaluate('__KK_TEST__.restoreRenderBudget()');
  await sleep(200);
  const restored=await evaluate('__KK_TEST__.renderQuality()');
  assert.equal(restored.mainPixels,tablet.mainPixels,'tablet budget must restore after benchmark');
  for(const sample of [reduced,oldPerformance])assert.ok(
    Number.isFinite(sample.fps)&&sample.frames>=8,'real browser must render measurable frames');
  console.log('KKWA TABLET RENDER BENCHMARK '+JSON.stringify({
    viewport:'1024x768@2',new:tablet,reduced,legacy,oldPerformance,restored}));
  await screenshot('03-tablet-large-town');passed++;
  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
  await evaluate('resize()');

  assert.equal(await evaluate("document.querySelector('#seeThrough').getAttribute('aria-pressed')"),'false','new cities should start opaque');
  await evaluate("document.querySelector('#seeThrough').click()");
  for(let round=1;round<=5;round++){
    await evaluate("document.querySelector('#hintBtn').click();document.querySelector('#hintBtn').click()");
    await sleep(120);
    const xy=await evaluate("__KK_TEST__.targetTap()");
    assert.ok(xy&&xy.x>=0&&xy.x<1280&&xy.y>=0&&xy.y<800,'target out of viewport round '+round+' '+JSON.stringify(xy));
    await click(xy.x,xy.y);
    await wait("__KK_TEST__.snapshot().found>="+round,4000);
    await wait("!__KK_TEST__.snapshot().celebration",12000);
  }
  await wait("!document.querySelector('#finish').classList.contains('hidden')",3000);
  await screenshot('04-large-finished');passed++;
  // Mobile landscape, interactive target card.
  await send('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:true});
  await evaluate("document.querySelector('#otherStageBtn').click();document.querySelector('[data-stage=medium]').click()");
  await wait("__KK_TEST__.snapshot().active&&__KK_TEST__.snapshot().targets===3",65000);
  await evaluate("document.querySelector('#compactMission').click()");
  assert.equal(await evaluate("document.querySelector('.mission').classList.contains('minimized')"),true);
  await screenshot('05-mobile-landscape');passed++;
  await evaluate("document.querySelector('#menuBtn').click();document.querySelector('#challengeStart').click()");
  await wait("__KK_TEST__.snapshot().mode==='challenge'&&__KK_TEST__.snapshot().active",65000);
  assert.equal(await evaluate("__KK_TEST__.snapshot().people"),11);
  assert.equal(await evaluate("__KK_TEST__.trafficSnapshot().enabled"),false,
    'arcade should keep original decorative road animation');
  assert.equal(await evaluate("__KK_TEST__.transitSnapshot().enabled"),false,
    'timed arcade remains free of passenger transport');
  assert.equal(await evaluate("__KK_TEST__.bakerySnapshot().visits"),0,
    'arcade must not start the background shopping itinerary');
  await screenshot('06-challenge-round-one');passed++;
  const stageTap=await evaluate("__KK_TEST__.targetTap()");
  if(stageTap&&stageTap.x>=0&&stageTap.x<=844&&stageTap.y>=0&&stageTap.y<=390){
    await click(stageTap.x,stageTap.y);
    await wait("__KK_TEST__.snapshot().level===2",8000);
    await wait("__KK_TEST__.snapshot().active",65000);
    assert.equal(await evaluate("__KK_TEST__.snapshot().people"),14);
    await screenshot('07-challenge-round-two');passed++;
  }
  assert.deepEqual(errors,[],'Browser JS exceptions: '+JSON.stringify(errors));
  console.log(JSON.stringify({passed:true,scenarios:passed,loadedAssets:true,walking:true,drag:true,regularFinished:true,largeFinished:true,mobile:true,challenge:true,errors:[],screenshots:OUT}));
})().catch(err=>{console.error('KKWAEKKORI BROWSER AUDIT FAILED',err);process.exitCode=1}).finally(async()=>{
  try{ws?.close();chrome?.kill('SIGKILL');}catch(_){}
  if(serverOpen)await new Promise(ok=>server.close(ok));
  if(profile)try{fs.rmSync(profile,{recursive:true,force:true,maxRetries:8,retryDelay:250});}catch(e){console.warn('Chrome profile cleanup:',e.message)}
});

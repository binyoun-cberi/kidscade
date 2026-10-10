const fs=require('fs'),path=require('path'),os=require('os'),http=require('http'),cp=require('child_process'),sharp=require('sharp'),assert=require('node:assert/strict');
const {once}=require('events');
const ROOT=path.resolve(__dirname,'..'),OUT=process.env.TIDY_AUDIT_OUT||path.join(os.tmpdir(),'tidy-audit');
fs.mkdirSync(OUT,{recursive:true});
const CHROME=['/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync);
const injection=[
'window.__AUDIT={',
's:()=>({level,done:cleanCount,total:totalCount,models:models.size,items:things.length,stains:stains.length,selected:things.indexOf(selected),coins,stainsLeft:stains.filter(s=>!s.done).length,piles:clutterPiles.length,decor:decorations.length,decorHidden:decorationsHidden,decorHeight:Math.max(0,...decorations.map(d=>d.height))}),',
'point:(kind,i)=>{',
'const o=kind==="item"?things[i]:kind==="station"?stations[i]:stains[i];',
'if(!o||o.done)return{missing:true};',
'const v=kind==="item"?o.group.position:kind==="station"?o.group.position:o.mesh.position;',
'const q=new THREE.Vector3(v.x,kind==="item"?.25:kind==="station"?(o.key==="shelf"?1.05:.62):.05,v.z).project(camera);',
'const ox=(q.x+1)*innerWidth/2,oy=(1-q.y)*innerHeight/2;',
'const seen={};',
'for(const radius of [0,3,6,10,17,24])for(const [dx,dy] of radius===0?[[0,0]]:[[radius,0],[-radius,0],[0,radius],[0,-radius],[radius,radius],[radius,-radius],[-radius,radius],[-radius,-radius]]){',
'const x=Math.round(ox+dx),y=Math.round(oy+dy);if(x<0||y<0||x>=innerWidth||y>=innerHeight)continue;',
'const h=kind==="station"?candidateAt({clientX:x,clientY:y,pointerType:"touch"}):getHit({clientX:x,clientY:y}),cover=document.elementFromPoint(x,y);',
'if((kind==="station"?h===o:h?.kind===kind&&h.value===o)&&cover===canvas)return{x,y};',
'const k=(kind==="station"?(h?.key||"none"):(h?.kind||"none"))+"/"+(cover?.id||cover?.tagName);seen[k]=(seen[k]||0)+1;',
'}return{blocked:true,index:i,kind,center:[Math.round(ox),Math.round(oy)],seen};',
'},',
'keys:()=>things.map(t=>t.key),stationIndex:key=>stations.findIndex(s=>s.key===key),reroll:()=>buildRoom(),positions:()=>things.map(t=>[Number(t.home.x.toFixed(2)),Number(t.home.z.toFixed(2))]),dragActive:()=>!!dragging,clearItems:()=>{for(const t of [...things])if(!t.done)placeItem(t,stations.find(s=>s.key===t.zone));return cleanCount},',
'forceFinish:()=>{for(const t of [...things])if(!t.done)placeItem(t,stations.find(s=>s.key===t.zone));for(const s of [...stains])if(!s.done)cleanStain(s,1);return{level,done:cleanCount,total:totalCount,overlay:!$("end").classList.contains("hidden")}}',
'};'
].join('\n');
const types={'.html':'text/html','.js':'text/javascript','.glb':'model/gltf-binary','.png':'image/png','.json':'application/json','.css':'text/css'};
const server=http.createServer((req,res)=>{
const url=new URL(req.url,'http://localhost'),f=path.resolve(ROOT,'.'+decodeURIComponent(url.pathname));
if(url.pathname==='/favicon.ico'){res.writeHead(204);res.end();return}
if(!f.startsWith(ROOT+path.sep)){res.writeHead(403);res.end();return}
fs.readFile(f,(err,b)=>{
if(err){res.writeHead(404);res.end();return}
if(url.pathname==='/games/sim_tidy_king/game.js')b=Buffer.from(String(b)+'\n'+injection);
res.writeHead(200,{'content-type':types[path.extname(f)]||'application/octet-stream'});res.end(b);
});
});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let browser,ws,profile;const report=[];
(async()=>{
server.listen(0,'127.0.0.1');await once(server,'listening');
profile=fs.mkdtempSync(path.join(os.tmpdir(),'tidy-cdp-'));
browser=cp.spawn(CHROME,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--enable-unsafe-swiftshader','--use-angle=swiftshader','--remote-allow-origins=*','--disable-background-networking','--no-first-run','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
let target;
for(let i=0;i<240;i++){const p=path.join(profile,'DevToolsActivePort');if(fs.existsSync(p))try{const port=fs.readFileSync(p,'utf8').split('\n')[0];target=(await(await fetch('http://127.0.0.1:'+port+'/json/list')).json()).find(t=>t.type==='page')}catch{}if(target)break;await sleep(100)}
if(!target)throw Error('no CDP browser');
ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((ok,no)=>{ws.onopen=ok;ws.onerror=no});
let seq=0;const pending=new Map(),errors=[],httpErrors=[];
ws.onmessage=e=>{const m=JSON.parse(String(e.data));
if(m.method==='Runtime.exceptionThrown')errors.push(m.params?.exceptionDetails?.exception?.description||m.params?.exceptionDetails?.text);
if(m.method==='Network.responseReceived'&&m.params?.response?.status>=400)httpErrors.push({status:m.params.response.status,url:m.params.response.url});
if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.no(Error(m.error.message+' ('+p.method+' '+JSON.stringify(p.params).slice(0,350)+')')):p.ok(m.result||{})}};
const send=(method,params={})=>new Promise((ok,no)=>{const id=++seq;pending.set(id,{ok,no,method,params});ws.send(JSON.stringify({id,method,params}))});
const ev=async e=>{const r=await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result?.value};
const click=async(x,y,touch)=>{
if(touch){await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:2}]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})}
else{await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',x,y,clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',x,y,clickCount:1})}
};
const drag=async(x,y,tx,ty,touch)=>{
 const steps=8;
 if(touch){
  await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:2}]});
  for(let i=1;i<=steps;i++){
   const t=i/steps;
   await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+(tx-x)*t,y:y+(ty-y)*t,id:2}]});
  }
  await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 }else{
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x,y});
  await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',x,y,clickCount:1});
  for(let i=1;i<=steps;i++){
   const t=i/steps;
   await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:x+(tx-x)*t,y:y+(ty-y)*t,button:'left',buttons:1});
  }
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',x:tx,y:ty,clickCount:1});
 }
};
const snap=async n=>{const s=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});const b=Buffer.from(s.data,'base64');fs.writeFileSync(path.join(OUT,n+'.png'),b);const p=await sharp(b).resize({width:420,withoutEnlargement:true}).jpeg({quality:52}).toBuffer();console.log('TIDY_PREVIEW '+n+' '+p.toString('base64'))};
await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
const defs=[{name:'portrait',w:390,h:844,touch:true},{name:'landscape',w:844,h:390,touch:true},{name:'desktop',w:1280,h:800,touch:false}];
const kinds={book:'shelf',pen:'shelf',pillow:'laundry',bag:'trash',bottle:'recycle',can:'recycle',carton:'recycle',cup:'sink',plate:'sink',pan:'sink',toy:'toys'};
for(const c of defs){
errors.length=0;httpErrors.length=0;
await send('Emulation.setDeviceMetricsOverride',{width:c.w,height:c.h,deviceScaleFactor:1,mobile:c.touch});
await send('Emulation.setTouchEmulationEnabled',{enabled:c.touch,maxTouchPoints:5});
await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/games/sim_tidy_king/index.html'});
for(let i=0;i<90;i++){if(await ev('!!document.querySelector("#start")').catch(()=>false))break;await sleep(100)}
await sleep(500);await snap(c.name+'-intro');
const quickDefault=await ev('({easy:document.querySelector("#modeEasy").getAttribute("aria-pressed"),big:document.querySelector("#modeBig").getAttribute("aria-pressed")})');
assert.deepEqual(quickDefault,{easy:'true',big:'false'},c.name+' must start in preschool mode');
await ev('document.querySelector("#modeBig").click()'); // Preserve full mountain stress test
await ev('document.querySelector("#start").click()');
let s;for(let i=0;i<350;i++){s=await ev('window.__AUDIT?.s()').catch(()=>null);if(s?.total>0)break;await sleep(100)}
if(!s?.total)throw Error('loading timeout '+c.name+' errors='+JSON.stringify(errors));
await sleep(700);await snap(c.name+'-room');
const overlap=await ev('(()=>{const a=document.querySelector("#actions").getBoundingClientRect(),b=document.querySelector("#mission").getBoundingClientRect();return{actionsMission:Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)),scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth}})()');
const keys=await ev('window.__AUDIT.keys()'),blocked=[],failed=[];
const positions=await ev('window.__AUDIT.positions()');
const xs=[...new Set(positions.map(p=>p[0]))],zs=[...new Set(positions.map(p=>p[1]))];
assert.ok(xs.length>=30&&zs.length>=30,'clutter should not form neat 8xN rows: '+JSON.stringify({xs:xs.length,zs:zs.length}));
// A tap followed by another tap must NOT complete an item: physical dragging is required.
const first=await ev('window.__AUDIT.point("item",0)');
const firstTarget=await ev('window.__AUDIT.point("station",'+await ev('window.__AUDIT.stationIndex('+JSON.stringify(kinds[keys[0]])+')')+')');
assert.ok(!first.blocked&&!firstTarget.blocked,c.name+' first item cannot be selected');
await click(first.x,first.y,c.touch);await click(firstTarget.x,firstTarget.y,c.touch);
assert.equal(await ev('window.__AUDIT.s().done'),0,c.name+' tapping twice should not sort');
const wrongIndex=await ev('window.__AUDIT.stationIndex("'+(kinds[keys[0]]==='shelf'?'trash':'shelf')+'")');
const wrong=await ev('window.__AUDIT.point("station",'+wrongIndex+')');
assert.ok(!wrong?.blocked&&Number.isFinite(wrong.x)&&Number.isFinite(wrong.y),c.name+' incorrect-bin target blocked: '+JSON.stringify(wrong));
await drag(first.x,first.y,wrong.x,wrong.y,c.touch);
assert.equal(await ev('window.__AUDIT.s().done'),0,c.name+' wrong bin must reject');
const dragSampleCount=c.name==='portrait'?keys.length:28;
for(let i=0;i<dragSampleCount;i++){
const p=await ev('window.__AUDIT.point("item",'+i+')');
if(p?.blocked){blocked.push(p);continue}
const idx=await ev('window.__AUDIT.stationIndex('+JSON.stringify(kinds[keys[i]])+')');
const to=await ev('window.__AUDIT.point("station",'+idx+')');
if(to?.blocked){failed.push({i,kind:'station',to});continue}
const before=await ev('window.__AUDIT.s().done');
await drag(p.x,p.y,to.x,to.y,c.touch);
const after=await ev('window.__AUDIT.s().done');
if(after!==before+1)failed.push({i,key:keys[i],kind:'drag-to-place',before,after,to});
}
if(c.name!=='portrait')await ev('window.__AUDIT.clearItems()');
const stains=[];
for(let i=0;i<s.stains;i++){const p=await ev('window.__AUDIT.point("stain",'+i+')');if(p?.blocked){stains.push(p);continue}for(let j=0;j<7;j++)await click(p.x,p.y,c.touch);}
const played=await ev('window.__AUDIT.s()');
const half=await ev('window.__AUDIT.s()');await snap(c.name+'-after');
const forced=await ev('window.__AUDIT.forceFinish()');await sleep(850);await snap(c.name+'-success');
const photo=await ev('({before:document.querySelector("#beforePhoto").src.length,after:document.querySelector("#afterPhoto").src.length,beforeLoaded:document.querySelector("#beforePhoto").naturalWidth,afterLoaded:document.querySelector("#afterPhoto").naturalWidth})');
await ev('document.querySelector("#next").click()');await sleep(750);
const kitchen=await ev('window.__AUDIT.s()');await snap(c.name+'-kitchen');
const unpickable=[];for(let i=0;i<kitchen.items;i++){const p=await ev('window.__AUDIT.point("item",'+i+')');if(p?.blocked)unpickable.push(p)}
// Repeatedly reroll kitchen clutter: each item must remain selectable.
for(let reroll=0;reroll<(c.name==='portrait'?3:1);reroll++){
 await ev('window.__AUDIT.reroll()');
 const size=await ev('window.__AUDIT.s().items');
 for(let i=0;i<size;i++){
  const hit=await ev('window.__AUDIT.point("item",'+i+')');
  if(hit?.blocked)unpickable.push({reroll,...hit});
 }
}
const finish2=await ev('window.__AUDIT.forceFinish()');
const last=await ev('({visible:!document.querySelector("#end").classList.contains("hidden"),name:document.querySelector("#endTitle").textContent,save:localStorage.getItem("kidscade-tidy-king-v1")})');
await send('Page.reload',{ignoreCache:true});await sleep(850);
const revisited=await ev('({kitchenEnabled:!document.querySelector("#startKitchen").disabled,kitchenVisible:!document.querySelector("#startKitchen").hidden})');
if(revisited.kitchenEnabled)await ev('document.querySelector("#startKitchen").click()');
let direct=null;for(let i=0;i<100;i++){direct=await ev('window.__AUDIT?.s()').catch(()=>null);if(direct?.total>0)break;await sleep(100)}
const result={name:c.name,initial:s,quickDefault,overlap,dragSampleCount,played,clutterVariety:{uniqueX:xs.length,uniqueZ:zs.length},half,blocked,failed,stains,forced,photo,kitchen,unpickable,finish2,last,revisited,direct,errors:[...errors],httpErrors:[...httpErrors]};
assert.equal(errors.length,0,c.name+' browser errors: '+JSON.stringify(errors.slice(0,3)));
assert.equal(blocked.length,0,c.name+' unclickable props: '+JSON.stringify(blocked.slice(0,3)));
assert.equal(failed.length,0,c.name+' input failures: '+JSON.stringify(failed.slice(0,3)));
assert.equal(stains.length,0,c.name+' unfinished stains: '+JSON.stringify(stains.slice(0,3)));
assert.equal(unpickable.length,0,c.name+' unclickable kitchen props: '+JSON.stringify(unpickable.slice(0,3)));
assert.equal(overlap.actionsMission,0,c.name+' controls overlap');
assert.ok(photo.before>5000&&photo.after>5000&&photo.beforeLoaded>10&&photo.afterLoaded>10,c.name+' before-after photos missing');
assert.equal(s.total,103,c.name+' apartment mission count missing');
assert.equal(kitchen.total,107,c.name+' kitchen mission count missing');
assert.equal(s.piles,4,c.name+' trash mountains missing');
assert.ok(s.decor>=220&&s.decorHeight>1.6,c.name+' no elevated trash piles');
assert.equal(half.decorHidden,half.decor,c.name+' trash mountains should disappear at 100%');
assert.ok(revisited.kitchenEnabled&&revisited.kitchenVisible&&direct?.level===1,c.name+' cannot open unlocked kitchen directly');
if(c.name==='portrait'){
  // Fresh page must return to preschool mode with short, achievable sessions.
  await send('Page.reload',{ignoreCache:true});await sleep(850);
  await ev('document.querySelector("#start").click()');
  let shortRoom=null;
  for(let i=0;i<100;i++){shortRoom=await ev('window.__AUDIT?.s()').catch(()=>null);if(shortRoom?.total>0)break;await sleep(100)}
  assert.equal(shortRoom.total,52,'preschool apartment should require 50 items and 2 stains');
  assert.equal(shortRoom.items,50);
  const shortKeys=await ev('window.__AUDIT.keys()');
  for(let i=0;i<shortKeys.length;i++){
    const a=await ev('window.__AUDIT.point("item",'+i+')');
    const idx=await ev('window.__AUDIT.stationIndex('+JSON.stringify(kinds[shortKeys[i]])+')');
    const b=await ev('window.__AUDIT.point("station",'+idx+')');
    assert.ok(!a?.blocked&&!b?.blocked,'preschool drag target hidden '+i);
    await drag(a.x,a.y,b.x,b.y,c.touch);
  }
  const stainN=await ev('window.__AUDIT.s().stains');
  for(let i=0;i<stainN;i++){
    const a=await ev('window.__AUDIT.point("stain",'+i+')');
    assert.ok(!a.blocked,'preschool stain obstructed '+i);
    for(let n=0;n<7;n++)await click(a.x,a.y,c.touch);
  }
  const shortEnd=await ev('window.__AUDIT.s()');
  assert.equal(shortEnd.done,52,'preschool apartment must complete');
  assert.equal(shortEnd.decorHidden,240,'all rubbish scenery must clear in easy mode');
  await snap('preschool-quick-complete');
  await ev('document.querySelector("#next").click()');
  await sleep(700);
  const quickKitchen=await ev('window.__AUDIT.s()');
  assert.equal(quickKitchen.total,52,'preschool kitchen should require 50 items and 2 stains');
  console.log('TIDY_PRESCHOOL_RESULT '+JSON.stringify({shortRoom,shortEnd,quickKitchen}));
}
report.push(result);console.log('TIDY_AUDIT_RESULT '+JSON.stringify(result));
}
fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2));console.log('TIDY_AUDIT_DONE');
})().catch(e=>{console.error('TIDY_AUDIT_FATAL',e.stack||e);process.exitCode=1}).finally(()=>{try{ws?.close()}catch{}try{browser?.kill()}catch{}try{server.close()}catch{}try{if(profile)fs.rmSync(profile,{recursive:true,force:true})}catch{}});

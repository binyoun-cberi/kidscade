const fs=require('fs'),path=require('path'),os=require('os'),http=require('http'),cp=require('child_process'),sharp=require('sharp');
const {once}=require('events');
const ROOT=path.resolve(__dirname,'..'),OUT=process.env.TIDY_AUDIT_OUT||path.join(os.tmpdir(),'tidy-audit');
fs.mkdirSync(OUT,{recursive:true});
const CHROME=['/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync);
const injection=[
'window.__AUDIT={',
's:()=>({level,done:cleanCount,total:totalCount,models:models.size,items:things.length,stains:stains.length,selected:things.indexOf(selected),coins,stainsLeft:stains.filter(s=>!s.done).length}),',
'point:(kind,i)=>{',
'const o=kind==="item"?things[i]:kind==="station"?stations[i]:stains[i];',
'if(!o||o.done)return{missing:true};',
'const v=kind==="item"?o.group.position:kind==="station"?o.group.position:o.mesh.position;',
'const q=new THREE.Vector3(v.x,kind==="item"?.25:kind==="station"?.12:.05,v.z).project(camera);',
'const ox=(q.x+1)*innerWidth/2,oy=(1-q.y)*innerHeight/2;',
'const seen={};',
'for(const radius of [0,3,6,10,17,24])for(const [dx,dy] of radius===0?[[0,0]]:[[radius,0],[-radius,0],[0,radius],[0,-radius],[radius,radius],[radius,-radius],[-radius,radius],[-radius,-radius]]){',
'const x=Math.round(ox+dx),y=Math.round(oy+dy);if(x<0||y<0||x>=innerWidth||y>=innerHeight)continue;',
'const h=getHit({clientX:x,clientY:y}),cover=document.elementFromPoint(x,y);',
'if(h?.kind===kind&&h.value===o&&cover===canvas)return{x,y};',
'const k=(h?.kind||"none")+"/"+(cover?.id||cover?.tagName);seen[k]=(seen[k]||0)+1;',
'}return{blocked:true,index:i,kind,center:[Math.round(ox),Math.round(oy)],seen};',
'},',
'keys:()=>things.map(t=>t.key),stationIndex:key=>stations.findIndex(s=>s.key===key),',
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
if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.no(Error(m.error.message)):p.ok(m.result||{})}};
const send=(method,params={})=>new Promise((ok,no)=>{const id=++seq;pending.set(id,{ok,no});ws.send(JSON.stringify({id,method,params}))});
const ev=async e=>{const r=await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result?.value};
const click=async(x,y,touch)=>{
if(touch){await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:2}]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})}
else{await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',x,y,clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',x,y,clickCount:1})}
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
await ev('document.querySelector("#start").click()');
let s;for(let i=0;i<350;i++){s=await ev('window.__AUDIT?.s()').catch(()=>null);if(s?.total>0)break;await sleep(100)}
if(!s?.total)throw Error('loading timeout '+c.name+' errors='+JSON.stringify(errors));
await sleep(700);await snap(c.name+'-room');
const overlap=await ev('(()=>{const a=document.querySelector("#actions").getBoundingClientRect(),b=document.querySelector("#mission").getBoundingClientRect();return{actionsMission:Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)),scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth}})()');
const keys=await ev('window.__AUDIT.keys()'),blocked=[],failed=[];
for(let i=0;i<keys.length;i++){
const p=await ev('window.__AUDIT.point("item",'+i+')');
if(p?.blocked){blocked.push(p);continue}
await click(p.x,p.y,c.touch);
const selected=await ev('window.__AUDIT.s().selected');
if(selected!==i){failed.push({i,kind:'select',selected});continue}
const idx=await ev('window.__AUDIT.stationIndex('+JSON.stringify(kinds[keys[i]])+')');
const to=await ev('window.__AUDIT.point("station",'+idx+')');
if(to?.blocked){failed.push({i,kind:'station',to});continue}
const before=await ev('window.__AUDIT.s().done');
await click(to.x,to.y,c.touch);
const after=await ev('window.__AUDIT.s().done');
if(after!==before+1)failed.push({i,kind:'place',before,after});
}
const stains=[];
for(let i=0;i<s.stains;i++){const p=await ev('window.__AUDIT.point("stain",'+i+')');if(p?.blocked){stains.push(p);continue}for(let j=0;j<7;j++)await click(p.x,p.y,c.touch);}
const half=await ev('window.__AUDIT.s()');await snap(c.name+'-after');
const forced=await ev('window.__AUDIT.forceFinish()');await sleep(750);await snap(c.name+'-success');
await ev('document.querySelector("#next").click()');await sleep(750);
const kitchen=await ev('window.__AUDIT.s()');await snap(c.name+'-kitchen');
const unpickable=[];for(let i=0;i<kitchen.items;i++){const p=await ev('window.__AUDIT.point("item",'+i+')');if(p?.blocked)unpickable.push(p)}
const finish2=await ev('window.__AUDIT.forceFinish()');
const last=await ev('({visible:!document.querySelector("#end").classList.contains("hidden"),name:document.querySelector("#endTitle").textContent,save:localStorage.getItem("kidscade-tidy-king-v1")})');
const result={name:c.name,initial:s,overlap,half,blocked,failed,stains,forced,kitchen,unpickable,finish2,last,errors:[...errors],httpErrors:[...httpErrors]};
report.push(result);console.log('TIDY_AUDIT_RESULT '+JSON.stringify(result));
}
fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2));console.log('TIDY_AUDIT_DONE');
})().catch(e=>{console.error('TIDY_AUDIT_FATAL',e.stack||e);process.exitCode=1}).finally(()=>{try{ws?.close()}catch{}try{browser?.kill()}catch{}try{server.close()}catch{}try{if(profile)fs.rmSync(profile,{recursive:true,force:true})}catch{}});

#!/usr/bin/env node
'use strict';
// Full Chromium playthrough against the actual local game. Never mocks game logic.
// A temporary /game.js-only playtest probe reads closure state to validate side effects.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const http=require('node:http'),cp=require('node:child_process'),os=require('node:os');
const {once}=require('node:events');
const ROOT=path.resolve(__dirname,'..');
const OUTPUT=process.env.KIDSCADE_CUBE_AUDIT_OUT||path.join(os.tmpdir(),'kidscade-cube-visual-quiz');
fs.mkdirSync(OUTPUT,{recursive:true});
const CHROME=[process.env.CHROME_BIN,'/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser']
  .filter(Boolean).find(fs.existsSync);
assert.ok(CHROME,'Chrome not installed');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
 '.glb':'model/gltf-binary','.gltf':'model/gltf+json','.png':'image/png','.jpg':'image/jpeg','.json':'application/json'};
const server=http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(pathname==='/favicon.ico'){res.writeHead(204);res.end();return}
 const full=path.resolve(ROOT,'.'+decodeURIComponent(pathname));
 if(full!==ROOT&&!full.startsWith(ROOT+path.sep)){res.writeHead(403);res.end();return}
 fs.readFile(full,(err,bytes)=>{
   if(err){res.writeHead(404);res.end('Missing '+pathname);return}
   if(pathname==='/games/cube3d/index.html')bytes=Buffer.from(bytes.toString().replace('<head>','<head><script>Math.random=()=>0.05;</script>'));
   res.writeHead(200,{'content-type':mime[path.extname(full)]||'application/octet-stream'});res.end(bytes);
 });
});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let chrome,ws,profile;
const errors=[],steps=[],requests=[];
let diagnoseFailure=null;
async function run(){
  server.listen(0,'127.0.0.1');await once(server,'listening');
  let endpoint,stderr='';
  // Shared GitHub runners occasionally stall during Chrome startup; retry with
  // a new isolated browser profile rather than treating infrastructure as game failure.
  for(let attempt=1;attempt<=3&&!endpoint;attempt++){
    if(chrome){try{chrome.kill('SIGKILL')}catch{};await sleep(400)}
    if(profile){try{fs.rmSync(profile,{force:true,recursive:true})}catch{}}
    profile=fs.mkdtempSync(path.join(os.tmpdir(),'cube-realbrowser-'));
    chrome=cp.spawn(CHROME,['--headless=new','--no-sandbox','--disable-dev-shm-usage',
      '--enable-webgl','--enable-unsafe-swiftshader','--use-angle=swiftshader',
      '--remote-allow-origins=*','--disable-background-networking','--no-first-run',
      '--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],
      {stdio:['ignore','ignore','pipe']});
    stderr='';chrome.stderr.on('data',data=>{stderr=(stderr+String(data)).slice(-1800)});
    for(let i=0;i<155;i++){
      if(chrome.exitCode!==null)break;
      const p=path.join(profile,'DevToolsActivePort');
      if(fs.existsSync(p))try{
        const port=Number(fs.readFileSync(p,'utf8').split('\n')[0]);
        endpoint=(await(await fetch('http://127.0.0.1:'+port+'/json/list')).json()).find(x=>x.type==='page')?.webSocketDebuggerUrl;
      }catch{}
      if(endpoint)break;await sleep(100);
    }
    if(!endpoint)console.warn('CUBE_CHROME_START_RETRY',attempt,stderr.slice(-700));
  }
  assert.ok(endpoint,'No Chrome DevTools endpoint after 3 attempts '+stderr);
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
  // Mobile game buttons deliberately use pointerdown (not click).
  const touchTap=async selector=>{
    const point=await evaluate('(()=>{const r=document.querySelector('+JSON.stringify(selector)+').getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2,w:r.width,h:r.height}})()');
    assert.ok(point.w>0&&point.h>0,'Touch target invisible: '+selector);
    await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:point.x,y:point.y,id:72}]});
    await sleep(95);
    await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  };
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
    if(['02-desktop-tutorial-and-workshop','06-desktop-crafting','08-tablet-survival','10-tablet-craft'].includes(name)){
      const thumbnail=await sharp(buffer).resize({width:470,withoutEnlargement:true}).jpeg({quality:42}).toBuffer();
      console.log('CUBE_PREVIEW',name,thumbnail.toString('base64'));
    }
    record('frame_'+name,{bytes:buffer.length,mean:Math.round(meta.channels.slice(0,3).reduce((a,c)=>a+c.mean,0)/3)});
    assert.ok(buffer.length>12000,'Blank browser render '+name);
  };
  const key=async(code,keyCode)=>{await send('Input.dispatchKeyEvent',{type:'keyDown',code,key:keyCode,windowsVirtualKeyCode:keyCode==='e'||keyCode==='E'?69:27});await sleep(90);await send('Input.dispatchKeyEvent',{type:'keyUp',code,key:keyCode,windowsVirtualKeyCode:keyCode==='e'||keyCode==='E'?69:27})};
  const viewport=(w,h,deviceScaleFactor=1,mobile=false)=>send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor,mobile});
  await send('Page.enable');await send('Runtime.enable');await send('Log.enable');await send('Network.enable');

  diagnoseFailure=async()=>{await screenshot('99-failure');return evaluate(`({prompt:document.querySelector('#gsQuestionText')?.textContent,feedback:document.querySelector('#gsSelectionFeedback')?.textContent,rootClass:document.querySelector('#geometryStudio')?.className})`)};
  await viewport(1365,900,1,false);
  await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/games/cube3d/index.html'});
  await waitFor('window.CubeGeometryStudio && window.CubeArchitectReady');
  await click('[data-mode="studio"]');
  await waitFor('document.querySelector("#geometryStudio.gs-quiz-mode") && !document.querySelector("#gsQuizBoard").hidden');
  const select=async(selector,value)=>evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  async function question(kind){
    await click('#gsQuizSettings');
    await select('#gsGrade','6');await click('#gsQuizSettings');
    await select('#gsQuizKind',kind);
    await click('#gsQuestion');await sleep(100);
    await waitFor('document.querySelector("#gsQuestionText").textContent.length>4');
  }
  async function point(id){return evaluate(`(()=>{const e=document.querySelector('[data-quiz-choice="${id}"]')||document.querySelector('[data-quiz-element="${id}"]');return{x:Number(e.dataset.screenX),y:Number(e.dataset.screenY)}})()`)}
  async function nativePick(id,touch=false){const p=await point(id);record('native-pick-'+id,{...p,hit:await evaluate('(()=>{const e=document.elementFromPoint('+p.x+','+p.y+');return e?{tag:e.tagName,id:e.id,text:e.textContent?.slice(0,50)}:null})()')});assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));
    if(touch){await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x,y:p.y,id:1}]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})}
    else {await send('Input.dispatchMouseEvent',{type:'mousePressed',x:p.x,y:p.y,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:p.x,y:p.y,button:'left',clickCount:1})}
  }
  await question('pickVertex');
  const compassBefore=await evaluate(`({x:document.querySelector('#gsAxisX').getAttribute('x2'),box:document.querySelector('#gsOrientation').getBoundingClientRect().toJSON()})`);
  await send('Input.dispatchMouseEvent',{type:'mousePressed',x:950,y:450,button:'left',clickCount:1});
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:1070,y:450,button:'left',buttons:1});
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:1070,y:450,button:'left',clickCount:1});
  const compassAfter=await evaluate(`({x:document.querySelector('#gsAxisX').getAttribute('x2'),box:document.querySelector('#gsOrientation').getBoundingClientRect().toJSON()})`);
  assert.notEqual(compassBefore.x,compassAfter.x,'XYZ axis direction must track rotation');
  assert.equal(compassBefore.box.x,compassAfter.box.x,'XYZ guide must stay fixed on screen');
  assert.equal(compassBefore.box.y,compassAfter.box.y,'XYZ guide must not travel with the model');
  await click('#gsResetView');
  assert.ok(Math.abs(Number(await evaluate(`document.querySelector('#gsAxisX').getAttribute('x2')`))-Number(compassBefore.x))<.01,'reset must restore orientation');
  await screenshot('00-desktop-question');
  await nativePick('v1');
  assert.equal(await evaluate('document.querySelector("#gsAnswerMarker").textContent'),'×','wrong vertex should show X');
  await nativePick('v0');
  assert.ok((await evaluate('document.querySelector("#gsSelectionFeedback").textContent')).includes('정답'),'vertex canvas ray pick failed');
  await screenshot('01-vertex-correct');
  await question('pickEdge');await nativePick('e0');
  assert.ok((await evaluate('document.querySelector("#gsSelectionFeedback").textContent')).includes('정답'),'edge canvas ray pick failed');
  await question('pickFace');await nativePick('f0');
  assert.ok((await evaluate('document.querySelector("#gsSelectionFeedback").textContent')).includes('정답'),'face canvas ray pick failed');
  await question('incidentEdge');for(const id of ['e0','e3','e8'])await nativePick(id);
  assert.equal(await evaluate('document.querySelector("#gsPickProgress").textContent'),'찾은 곳 3 / 3');
  await question('volume');
  assert.equal(await evaluate('document.querySelectorAll(".gs-dimension-label").length'),3);
  await screenshot('02-curved-length-volume');
  await evaluate(`document.querySelector('#gsAnswer').value='8';document.querySelector('#gsAnswerForm').requestSubmit()`);
  assert.ok((await evaluate('document.querySelector("#gsSelectionFeedback").textContent')).includes('정답'));
  await question('faceArea');await evaluate(`document.querySelector('#gsAnswer').value='4';document.querySelector('#gsAnswerForm').requestSubmit()`);
  assert.ok((await evaluate('document.querySelector("#gsSelectionFeedback").textContent')).includes('정답'));
  const Q=require('../games/cube3d/cube-geometry-quiz.js');
  for(const kind of ['netEdge','netVertex']){
    await question(kind);await screenshot('03-'+kind+'-flat');if(kind==='netVertex')assert.ok(await evaluate(`(()=>{const r=document.querySelector('.gs-vertex-label.is-reference').getBoundingClientRect(),top=document.querySelector('.gs-question-card').getBoundingClientRect().bottom,bottom=document.querySelector('#gsAnswerDock').getBoundingClientRect().top;return r.top>top&&r.bottom<bottom})()`),'net reference must stay between the problem and answer dock');const q=Q.makeQuestion(kind,[2,2,2],()=>.05);
    for(const id of q.answers)await nativePick(id);
    assert.equal(await evaluate('document.querySelector("#gsFoldControl").hidden'),false,'fold slider unavailable after a correct net answer');
    await evaluate(`(()=>{const e=document.querySelector('#gsFold');e.value='100';e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    await screenshot('04-'+kind+'-folded');
  }
  await viewport(390,844,1,true);await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
  await question('pickVertex');await nativePick('v0',true);
  assert.ok((await evaluate('document.querySelector("#gsSelectionFeedback").textContent')).includes('정답'),'phone touch vertex failed');
  assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'),'phone horizontal overflow');
  assert.ok(await evaluate(`(()=>{const r=document.querySelector('#gsOrientation').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.bottom<document.querySelector('#gsAnswerDock').getBoundingClientRect().top})()`),'phone XYZ guide must remain inside the view');
  await screenshot('05-phone-vertex');
  await question('volume');
  const dimensionsInside=await evaluate(`Array.from(document.querySelectorAll('.gs-dimension-label')).every(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth})`);
  assert.ok(dimensionsInside,'phone length labels must not be clipped');await screenshot('06-phone-volume');
  assert.equal(errors.length,0,'Browser exceptions: '+errors.slice(0,8).join(' | '));
  assert.deepEqual(requests.filter(x=>/cube-geometry|three-r160|cube-architect/.test(x.url)),[],'Missing cube quiz resources');
  return {result:'PASS',steps,errors,requests};
}
run().then(result=>{fs.writeFileSync(path.join(OUTPUT,'report.json'),JSON.stringify(result,null,2));console.log('CUBE_PLAY_RESULT PASS')})
.catch(async err=>{let diagnostic;try{diagnostic=await diagnoseFailure?.()}catch{};fs.writeFileSync(path.join(OUTPUT,'report.json'),JSON.stringify({result:'FAIL',error:String(err.stack||err),diagnostic,steps,errors,requests},null,2));console.error('CUBE_PLAY_RESULT FAIL',err.stack||err);process.exitCode=1})
.finally(async()=>{try{ws?.close()}catch{};try{chrome?.kill('SIGTERM')}catch{};try{server.close()}catch{};try{fs.rmSync(profile,{force:true,recursive:true})}catch{}});

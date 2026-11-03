#!/usr/bin/env node
'use strict';
// Real Chrome design pass + deterministic UI state smoke test.
// Serves the tracked game files, without external 3D libraries or CDN.
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const http=require('node:http');
const cp=require('node:child_process');
const assert=require('node:assert/strict');

const ROOT=path.resolve(__dirname,'../games/probability_dice_survival');
const chromePath=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser']
 .find(x=>fs.existsSync(x));
if(!chromePath) { console.log('[dice-browser] SKIP: no Chrome/Chromium installed');process.exit(0); }
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const server=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
 const file=path.resolve(ROOT,'.'+pathname);
 if(file!==ROOT&&!file.startsWith(ROOT+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(file,(err,data)=>{
  if(err){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});
  res.end(data);
 });
});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let child,socket,dir;
const errors=[];
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 dir=fs.mkdtempSync(path.join(os.tmpdir(),'kc-dice-browser-'));
 child=cp.spawn(chromePath,[
  '--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu',
  '--remote-debugging-port=0','--remote-allow-origins=*','--disable-background-networking',
  '--user-data-dir='+dir,'about:blank'
 ],{stdio:['ignore','ignore','pipe']});
 let wsUrl='';
 for(let i=0;i<150;i++){
  if(child.exitCode!==null)throw Error('Chrome unexpectedly exited');
  const file=path.join(dir,'DevToolsActivePort');
  if(fs.existsSync(file)){
   const port=Number(fs.readFileSync(file,'utf8').split(/\r?\n/)[0]);
   if(port)try{
    const tabs=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
    wsUrl=tabs.find(x=>x.type==='page')?.webSocketDebuggerUrl||'';
   }catch(_){}
   if(wsUrl)break;
  }
  await sleep(100);
 }
 assert.ok(wsUrl,'Chrome DevTools did not start');
 socket=new WebSocket(wsUrl);
 await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
 const pending=new Map();let id=0;
 socket.onmessage=event=>{
  const message=JSON.parse(event.data);
  if(message.method==='Runtime.exceptionThrown')errors.push(message.params?.exceptionDetails?.text||'uncaught');
  if(!message.id)return;
  const entry=pending.get(message.id);if(!entry)return;
  pending.delete(message.id);
  message.error?entry.reject(Error(message.error.message)):entry.resolve(message.result||{});
 };
 const cmd=(method,params={})=>new Promise((resolve,reject)=>{
  const i=++id;pending.set(i,{resolve,reject});socket.send(JSON.stringify({id:i,method,params}));
 });
 const evaluate=async expr=>{
  const r=await cmd('Runtime.evaluate',{expression:expr,returnByValue:true,awaitPromise:true});
  if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails).slice(0,1500));
  return r.result?.value;
 };
 const waitFor=async(expr,label,loops=80)=>{
  for(let i=0;i<loops;i++){if(await evaluate(expr))return;await sleep(100);}
  throw Error('Timed out: '+label);
 };
  const select=async(n)=>evaluate("document.querySelectorAll('#numberGrid button')["+(n-1)+"].click()");
 await cmd('Page.enable');await cmd('Runtime.enable');
 await cmd('Emulation.setDeviceMetricsOverride',{width:1280,height:880,deviceScaleFactor:1,mobile:false});
 // The responsive reduced-motion animation still renders the 3D polygon.
 await cmd('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await cmd('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/index.html'});
  await waitFor("document.querySelectorAll('#numberGrid button').length===6",'desktop ready');
 assert.equal(await evaluate("document.title"),'운명의 주사위 | 키즈케이드');
 assert.equal(await evaluate("document.querySelector('h1').textContent"),'운명의 주사위');
 const desktop=await evaluate(`(()=>{
  const pick=document.querySelector('.select-panel').getBoundingClientRect();
  const dice=document.querySelector('.dice-section').getBoundingClientRect();
  const settings=document.querySelector('.setting').getBoundingClientRect();
  const c=document.querySelector('#diceCanvas'),pixels=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
  let ink=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>0)ink++;
  return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,pickX:pick.x,pickY:pick.y,settingsY:settings.y,diceX:dice.x,canvasInk:ink};
 })()`);
 assert.ok(desktop.scrollWidth<=desktop.width+2,'desktop horizontal overflow');
 assert.ok(desktop.pickX>desktop.diceX,'desktop controls should sit next to arena');
 assert.ok(desktop.pickY<desktop.settingsY,'desktop number picker must be above the settings');
 assert.ok(desktop.canvasInk>2000,'actual 3D dice canvas rendered blank');
 for(let i=1;i<=5;i++)await select(i);
 assert.equal(await evaluate("document.querySelector('#chanceLabel').textContent"),'83.3%');
 assert.equal(await evaluate("document.querySelector('#rollBtn').disabled"),false);
 await evaluate("document.querySelector('#rollBtn').click()");
 await waitFor("!document.querySelector('#nextBtn').classList.contains('hidden')",'solo landed');
 const solo=await evaluate(`(()=>{
  const result=+document.querySelector('#rollResult').textContent;
  return {result,overlay:document.querySelector('#resultOverlay').textContent,
   chance:document.querySelector('#chanceLabel').textContent,
   selected:document.querySelectorAll('#numberGrid button.selected').length,
   landed:[...document.querySelectorAll('#numberGrid button.landed-alive, #numberGrid button.landed-fail')].map(b=>({number:+b.dataset.number,alive:b.classList.contains('landed-alive'),label:b.getAttribute('aria-label')})),
   records:document.querySelectorAll('#history .chip').length};
 })()`);
 assert.ok(solo.result>=1&&solo.result<=6);
 assert.equal(solo.chance,'83.3%');
 assert.equal(solo.selected,5,'selected numbers should remain highlighted after roll');
 assert.equal(solo.records,1,'first history result should be saved');
 assert.equal(solo.landed.length,1,'the landed face needs one clear highlight');
 assert.equal(solo.landed[0].number,solo.result);
 assert.equal(solo.landed[0].alive,solo.result!==6);
 assert.ok(solo.landed[0].label.includes('나온 숫자'));
 assert.ok(solo.result===6?solo.overlay.includes('0회'):solo.overlay.includes('1회'),'solo streak outcome mismatch');
 await evaluate("document.querySelector('#nextBtn').click()");
 assert.equal(await evaluate("document.querySelector('#roundLabel').textContent"),'2번째 도전');

 await evaluate("document.querySelector('#duelMode').click()");
 assert.ok(await evaluate("!document.querySelector('#duelSettings').classList.contains('hidden')"));
 for(let i=1;i<=5;i++)await select(i);
 await evaluate("document.querySelector('#lockBtn').click()");
 assert.ok((await evaluate("document.querySelector('#pickTitle').textContent")).includes('노랑'));
 await select(6);
 await evaluate("document.querySelector('#lockBtn').click()");
 assert.equal(await evaluate("document.querySelector('#rollBtn').disabled"),false);
 await evaluate("document.querySelector('#rollBtn').click()");
 await waitFor("!document.querySelector('#nextBtn').classList.contains('hidden')",'duel landed');
 const duel=await evaluate(`(()=>{
  const cards=[...document.querySelectorAll('.score-line')].map(x=>x.textContent);
  return {result:+document.querySelector('#rollResult').textContent,cards,
  overlay:document.querySelector('#resultOverlay').textContent};
 })()`);
 assert.equal(duel.cards.length,2);
 assert.ok(duel.cards[0].includes('선택 1·2·3·4·5'));
 assert.ok(duel.cards[1].includes('선택 6'));
 assert.ok(duel.overlay.includes('1명 생존 / 1명 탈락'));
 assert.equal(await evaluate("document.querySelectorAll('#numberGrid button.landed-shared').length"),1,'duel must show the single shared dice result');
 const mobileBefore=await cmd('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 const mobile=await evaluate(`(()=>{
  const pick=document.querySelector('.select-panel').getBoundingClientRect();
  const dice=document.querySelector('.dice-section').getBoundingClientRect();
  const btn=document.querySelector('#arenaNextBtn');
  return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,
   pickY:pick.y,diceY:dice.y,pickWidth:pick.width,arenaNextVisible:getComputedStyle(btn).display!=='none'};
 })()`);
 assert.ok(mobile.scrollWidth<=mobile.width+2,'mobile horizontal overflow');
 assert.ok(mobile.pickY<mobile.diceY,'on mobile students must pick before the arena');
 assert.equal(mobile.arenaNextVisible,true,'mobile next-round button missing near results');
 await evaluate("document.querySelector('#arenaNextBtn').click()");
 assert.ok((await evaluate("document.querySelector('#pickTitle').textContent")).includes('파랑'));
 await evaluate("document.querySelector('#soloMode').click()");
 await evaluate("(()=>{const s=document.querySelector('#dieMode');s.value='20';s.dispatchEvent(new Event('change',{bubbles:true}));})()");
 assert.equal(await evaluate("document.querySelectorAll('#numberGrid button').length"),20);
 await select(20);
 await evaluate("document.querySelector('#rollBtn').click()");
 await waitFor("!document.querySelector('#nextBtn').classList.contains('hidden')",'mobile d20 landed');
 assert.ok(await evaluate("document.querySelector('#rollResult').textContent !== '—'"));
 // Finish a complete 4-person 6-round match, including d6->d8 transition.
 await evaluate("(()=>{document.querySelector('#duelMode').click();const a=document.querySelector('#name3'),b=document.querySelector('#name4');a.value='초록';b.value='보라';const d=document.querySelector('#dieMode');d.value='stage';d.dispatchEvent(new Event('change',{bubbles:true}));const r=document.querySelector('#roundLimit');r.value='6';r.dispatchEvent(new Event('change',{bubbles:true}));})()");
 for(let round=1;round<=6;round++){
  const cardCount=await evaluate("document.querySelectorAll('.score-line').length");
  assert.equal(cardCount,4,'four player scorecards missing in round '+round);
  for(let player=1;player<=4;player++){
   await select(player);
   await evaluate("document.querySelector('#lockBtn').click()");
  }
  assert.equal(await evaluate("document.querySelector('#rollBtn').disabled"),false);
  await evaluate("document.querySelector('#rollBtn').click()");
  await waitFor("!document.querySelector('#nextBtn').classList.contains('hidden')",'four player match round '+round);
  const result=await evaluate("({result:+document.querySelector('#rollResult').textContent,faces:+document.querySelector('#dieTitle').textContent.split('면')[0]})");
  assert.ok(result.result>=1&&result.result<=result.faces,'four person die result out of range');
  assert.equal(result.faces,round<=3?6:8,'round-scoped die stages diverged');
  if(round<6)await evaluate("document.querySelector('#arenaNextBtn').click()");
 }
 assert.ok((await evaluate("document.querySelector('#resultOverlay').textContent")).includes('최종 결과:'));
 await evaluate("document.querySelector('#arenaNextBtn').click()");
 assert.equal(await evaluate("document.querySelector('#roundLabel').textContent"),'1 / 6라운드');
 assert.deepEqual(errors,[],'uncaught Chrome exceptions');
 console.log('[dice-browser] PASS desktop='+JSON.stringify(desktop));
 console.log('[dice-browser] PASS solo='+JSON.stringify(solo));
 console.log('[dice-browser] PASS duel='+JSON.stringify(duel));
 console.log('[dice-browser] PASS mobile='+JSON.stringify(mobile));
 console.log('[dice-browser] PASS 20-face mobile dice animation');
})().catch(e=>{console.error('[dice-browser] FAIL',e.stack||e);process.exitCode=1;})
.finally(async()=>{
 try{socket?.close();}catch(_){}
 if(child&&!child.killed)child.kill('SIGTERM');
 await new Promise(resolve=>server.close(resolve));
 if(dir)fs.rmSync(dir,{recursive:true,force:true});
});

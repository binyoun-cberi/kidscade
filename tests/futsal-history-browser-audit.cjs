'use strict';
// Real Chrome responsive verification of Futsal History League, no third-party tools.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const http=require('node:http'),cp=require('node:child_process'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const chrome=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(x=>fs.existsSync(x));
if(!chrome){console.log('[futsal-browser] SKIP Chrome unavailable');process.exit(0);}
const server=http.createServer((req,res)=>{
  let file;
  try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));}
  catch(e){res.writeHead(400);res.end();return;}
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  fs.readFile(file,(err,bytes)=>{if(err){res.writeHead(404);res.end();return;}
    const ext=path.extname(file),type={'.js':'text/javascript','.html':'text/html','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg','.json':'application/json'}[ext]||'application/octet-stream';
    res.writeHead(200,{'content-type':type});res.end(bytes);
  });
});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let child,ws,profile;
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  profile=fs.mkdtempSync(path.join(os.tmpdir(),'kc-futsal-audit-'));
  child=cp.spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--disable-background-networking','--remote-debugging-port=0','--remote-allow-origins=*','--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
  let endpoint='';
  for(let i=0;i<210;i++){
    if(child.exitCode!==null)throw Error('Chrome exited');
    const active=path.join(profile,'DevToolsActivePort');
    if(fs.existsSync(active))try{
      const port=Number(fs.readFileSync(active,'utf8').split(/\r?\n/)[0]);
      const pages=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
      endpoint=pages.find(p=>p.type==='page')?.webSocketDebuggerUrl||'';
    }catch(e){}
    if(endpoint)break;await sleep(100);
  }
  assert.ok(endpoint,'Chrome DevTools did not start');
  ws=new WebSocket(endpoint);
  await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
  let id=0;const pending=new Map(),exceptions=[];
  ws.onmessage=e=>{
    const data=JSON.parse(e.data);
    if(data.method==='Runtime.exceptionThrown')exceptions.push(data.params?.exceptionDetails?.text||'uncaught');
    const task=pending.get(data.id);if(!task)return;
    pending.delete(data.id);data.error?task.reject(Error(data.error.message)):task.resolve(data.result||{});
  };
  const cmd=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});
  const evalJS=async script=>{
    const r=await cmd('Runtime.evaluate',{expression:script,returnByValue:true,awaitPromise:true});
    if(r.exceptionDetails)throw Error('Page error '+JSON.stringify(r.exceptionDetails).slice(0,1000));
    return r.result?.value;
  };
  const wait=async(code,stage)=>{
    for(let i=0;i<95;i++){if(await evalJS(code))return;await sleep(100);}
    throw Error('Timed out '+stage);
  };
  const resize=async(w,h,mobile)=>{await cmd('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile});await cmd('Emulation.setTouchEmulationEnabled',{enabled:mobile,maxTouchPoints:5});await sleep(150);};
  const screenshot=async name=>{
    const out=process.env.KIDSCADE_FUTSAL_AUDIT_OUT;
    if(!out)return;
    fs.mkdirSync(out,{recursive:true});
    const png=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(png.data,'base64'));
  };
  await cmd('Page.enable');await cmd('Runtime.enable');
  await resize(1280,760,false);
  await cmd('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/games/high_seed_fc_manager/index.html'});
  await wait("document.querySelector('#newGameBtn')?.offsetWidth>0",'entry');
  await evalJS("document.querySelector('#newGameBtn').click()");
  await wait("document.querySelector('.club-card')?.offsetWidth>0",'club selection');
  const clubs=await evalJS("(()=>({count:document.querySelectorAll('.club-card').length,tiers:[...document.querySelectorAll('.club-tier')].map(el=>el.textContent.trim()),identities:document.querySelectorAll('.club-identity').length,notice:document.querySelector('.club-balance-note')?.textContent||''}))()");
  assert.equal(clubs.count,8,'all historic clubs must be selectable');
  assert.equal(clubs.identities,8,'each club must explain strengths and weaknesses');
  assert.ok(clubs.tiers.some(t=>t.includes('1/5'))&&clubs.tiers.some(t=>t.includes('5/5')),'strength range is missing');
  assert.ok(clubs.notice.includes('게임용')||clubs.notice.includes('가상'),'fictional balance disclaimer is missing');
  await screenshot('club-choice-desktop');
  await resize(960,600,true);
  await evalJS("document.querySelector('.club-card').scrollIntoView({block:'center',inline:'nearest'})");
  await sleep(100);
  const tabletChoice=await evalJS("(()=>{const card=document.querySelector('.club-card'),r=card.getBoundingClientRect(),hit=document.elementFromPoint(Math.max(0,Math.min(innerWidth-1,r.left+r.width/2)),Math.max(0,Math.min(innerHeight-1,r.top+r.height/2)));return {tier:card.querySelector('.club-tier')?.textContent,visible:r.width>120&&r.height>120,hit:card===hit||card.contains(hit),width:innerWidth,overflow:document.documentElement.scrollWidth-innerWidth}})()");
  assert.ok(tabletChoice.visible&&tabletChoice.hit,'club choice not tappable at tablet width');
  assert.ok(tabletChoice.overflow<=2,'club selection has horizontal overflow');
  await screenshot('club-choice-tablet');
  await resize(1280,760,false);
  await evalJS("document.querySelector('.club-card').click()");
  await wait("document.querySelector('#playMatch')?.offsetWidth>0",'dashboard');
  const challenge=await evalJS("(()=>({preview:document.querySelector('.match-difficulty')?.textContent||'',tasks:document.querySelector('.task-list')?.textContent||''}))()");
  assert.ok(challenge.preview.includes('상대 전력'),'fixture preview must show opponent rating');
  assert.ok(challenge.tasks.includes('상대 난이도')&&challenge.tasks.includes('상대 공략'),'fixture needs difficulty and tactical weaknesses');
  await screenshot('fixture-scouting-desktop');
  await evalJS("document.querySelector('#playMatch').click()");
  await wait("!document.querySelector('#matchLayer').classList.contains('hidden')",'match');
  await evalJS("document.querySelector('#matchTutorialSkipAll').click()");
  const desktop=await evalJS("({panel:getComputedStyle(document.querySelector('#matchCoachPanel')).display,toggle:getComputedStyle(document.querySelector('#matchCoachToggle')).display})");
  assert.notEqual(desktop.panel,'none');assert.equal(desktop.toggle,'none');
  await screenshot('desktop-watch');
  await resize(960,600,true);
  const tabletBefore=await evalJS("({panel:getComputedStyle(document.querySelector('#matchCoachPanel')).display,toggle:getComputedStyle(document.querySelector('#matchCoachToggle')).display,expanded:document.querySelector('#matchCoachToggle').getAttribute('aria-expanded')})");
  assert.equal(tabletBefore.panel,'none');assert.notEqual(tabletBefore.toggle,'none');assert.equal(tabletBefore.expanded,'false');
  await evalJS("document.querySelector('#matchCoachToggle').click()");
  const open=await evalJS("(()=>{const p=document.querySelector('#matchCoachPanel'),b=document.querySelector('#matchCoachToggle');return {display:getComputedStyle(p).display,expanded:b.getAttribute('aria-expanded'),doesNotCoverClose:p.getBoundingClientRect().top>=b.getBoundingClientRect().bottom-3}})()");
  assert.equal(open.display,'flex');assert.equal(open.expanded,'true');assert.equal(open.doesNotCoverClose,true);
  await evalJS("document.querySelector('#matchCoachToggle').click();document.querySelector('#directControlBtn').click()");
  await sleep(250);
  const tablet=await evalJS("(()=>{const b=document.querySelector('#shootTackleBtn'),r=b.getBoundingClientRect();const hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return {panel:getComputedStyle(document.querySelector('#matchCoachPanel')).display,opacity:+getComputedStyle(document.querySelector('#futsalTouch')).opacity,buttonAccessible:hit===b||b.contains(hit),buttonOnScreen:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight,buttonWidth:r.width,buttonHeight:r.height,overflow:document.documentElement.scrollWidth-innerWidth}})()");
  assert.equal(tablet.panel,'none');assert.ok(tablet.opacity>.9);
  assert.ok(tablet.buttonAccessible&&tablet.buttonOnScreen,'touch shot inaccessible at 960px');
  assert.ok(tablet.buttonWidth>=44&&tablet.buttonHeight>=42);
  assert.ok(tablet.overflow<=2);
  await screenshot('tablet-direct');
  await resize(700,440,true);
  const narrow=await evalJS("(()=>{const b=document.querySelector('#shootTackleBtn').getBoundingClientRect();const c=document.querySelector('#matchCoachToggle').getBoundingClientRect();return {onScreen:b.left>=0&&b.right<=innerWidth&&b.top>=0&&b.bottom<=innerHeight,toggleOnScreen:c.left>=0&&c.right<=innerWidth&&c.top>=0}})()");
  assert.ok(narrow.onScreen&&narrow.toggleOnScreen,'narrow tablet controls clipped');
  await screenshot('narrow-landscape');
  assert.deepEqual(exceptions,[],'uncaught Chrome exception');
  console.log('[futsal-browser] PASS desktop '+JSON.stringify(desktop));
  console.log('[futsal-browser] PASS 960px tablet '+JSON.stringify({tabletBefore,open,tablet}));
  console.log('[futsal-browser] PASS 700px landscape '+JSON.stringify(narrow));
})().catch(e=>{console.error('[futsal-browser] FAIL',e.stack||e);process.exitCode=1;})
.finally(async()=>{
  try{ws?.close();}catch(e){}
  if(child&&!child.killed)child.kill('SIGTERM');
  await new Promise(r=>server.close(r));
  if(profile){await sleep(170);try{fs.rmSync(profile,{recursive:true,force:true,maxRetries:6,retryDelay:140});}catch(e){}}
});

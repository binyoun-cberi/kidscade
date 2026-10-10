#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const http=require('node:http');
const cp=require('node:child_process');
const {once}=require('node:events');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.resolve(process.env.KIDSCADE_OPENMON_AUDIT_OUT||path.join(os.tmpdir(),'kidscade-openmon-audit'));
const CHROME=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(x=>fs.existsSync(x));
if(!CHROME)throw Error('Openmon browser audit requires Chrome/Chromium');
fs.mkdirSync(OUT,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.json':'application/json'};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 const file=path.resolve(ROOT,'.'+decodeURIComponent(url.pathname));
 if(file!==ROOT&&!file.startsWith(ROOT+path.sep)){res.writeHead(403);res.end();return}
 fs.readFile(file,(err,content)=>{
  if(err){res.writeHead(404);res.end('File missing '+url.pathname);return}
  res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});
  res.end(content);
 });
});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let chrome,ws,profile;
(async()=>{
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const local='http://127.0.0.1:'+server.address().port;
 profile=fs.mkdtempSync(path.join(os.tmpdir(),'kidscade-openmon-cdp-'));
 chrome=cp.spawn(CHROME,[
  '--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu',
  '--disable-background-networking','--no-first-run','--remote-allow-origins=*',
  '--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'
 ],{stdio:['ignore','ignore','pipe']});
 let target=null,stderr='';
 chrome.stderr.on('data',x=>{stderr+=String(x).slice(-300);stderr=stderr.slice(-1200)});
 for(let i=0;i<300;i++){
  if(chrome.exitCode!==null)throw Error('Chrome quit: '+stderr);
  await sleep(100);
  const active=path.join(profile,'DevToolsActivePort');
  if(!fs.existsSync(active))continue;
  try{
   const port=Number(fs.readFileSync(active,'utf8').split(/\r?\n/)[0]);
   if(!port)continue;
   const resp=await fetch('http://127.0.0.1:'+port+'/json/list');
   target=(await resp.json()).find(x=>x.type==='page');if(target)break;
  }catch(e){}
 }
 if(!target)throw Error('Failed to discover Chrome CDP target '+stderr);
 ws=new WebSocket(target.webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject});
 const pending=new Map(),errors=[];let serial=0;
 ws.onmessage=evt=>{
  const data=JSON.parse(evt.data);
  if(data.method==='Runtime.exceptionThrown')errors.push(data.params?.exceptionDetails?.exception?.description||data.params?.exceptionDetails?.text||'Unknown exception');
  if(!data.id)return;
  const p=pending.get(data.id);if(!p)return;pending.delete(data.id);
  if(data.error)p.reject(Error(data.error.message));else p.resolve(data.result||{});
 };
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
 const evaluate=async expression=>{
  const res=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(res.exceptionDetails)throw Error(res.exceptionDetails.exception?.description||res.exceptionDetails.text);
  return res.result?.value;
 };
 const evalFn=async fn=>evaluate('('+fn.toString()+')()');
 async function screenshot(name){
  const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  fs.writeFileSync(path.join(OUT,name+'.png'),Buffer.from(shot.data,'base64'));
 }
 await send('Page.enable');await send('Runtime.enable');
 const cases=[{name:'iphone-portrait',w:390,h:844},{name:'desktop',w:1200,h:850}];
 for(const config of cases){
  errors.length=0;
  await send('Emulation.setDeviceMetricsOverride',{width:config.w,height:config.h,deviceScaleFactor:1,mobile:config.w<500});
  await send('Page.navigate',{url:local+'/games/openmon-expedition/index.html'});
  await sleep(600);
  // Reloading a running page resaves on visibilitychange. Use the game's own
  // "new game" control to reset the second viewport without that race.
  await evalFn(()=>{
    if(document.getElementById('starterOverlay').hidden){
      window.confirm=()=>true;
      document.getElementById('newGame').click();
    }
    return true;
  });
  const initial=await evalFn(()=>{
   const $=id=>document.getElementById(id);
   const rect=$('starterOverlay').getBoundingClientRect();
   const canvas=$('worldCanvas').getBoundingClientRect();
   return {starter:!$('starterOverlay').hidden,buttons:document.querySelectorAll('[data-starter]').length,
    modalWidth:rect.width,canvasWidth:canvas.width,canvasHeight:canvas.height,
    docWidth:document.documentElement.scrollWidth,screen:innerWidth,images:performance.getEntriesByType('resource').filter(r=>r.name.includes('Openmon')).length};
  });
  assert.ok(initial.starter&&initial.buttons===3,'Starter dialog missing '+config.name+JSON.stringify(initial));
  assert.ok(initial.canvasWidth>230&&initial.canvasHeight>125,'Canvas too small '+config.name);
  assert.ok(initial.docWidth<=initial.screen+3,'Horizontal overflow '+config.name+JSON.stringify(initial));
  await screenshot(config.name+'-starter');
  await evalFn(()=>document.querySelector('[data-starter="set1_r02_c02"]').click());
  await sleep(300);
  const field=await evalFn(()=>{
   const debug=window.OPENMON_EXPEDITION_DEBUG,canvas=document.getElementById('worldCanvas'),ctx=canvas.getContext('2d');
   const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data,colors=new Set();
   for(let y=20;y<canvas.height;y+=16)for(let x=10;x<canvas.width;x+=16){const i=(y*canvas.width+x)*4;colors.add(pixels[i]+','+pixels[i+1]+','+pixels[i+2]);}
   return {visible:document.getElementById('starterOverlay').hidden,
    player:debug.getState().party[0].id,tilesColored:colors.size,partyCards:document.querySelectorAll('.member').length,
    images:Array.from(document.images).filter(x=>!x.complete).length,
    townAtlas:performance.getEntriesByType('resource').some(r=>r.name.includes('kenney-tiny-town')),
    scrollWidth:document.documentElement.scrollWidth};
  });
  assert.ok(field.visible&&field.player==='set1_r02_c02'&&field.partyCards===1,'Cannot start expedition '+config.name+JSON.stringify(field));
  assert.ok(field.tilesColored>=8&&field.townAtlas,'World must render Kenney-powered pixel tiles '+config.name+JSON.stringify(field));
  await screenshot(config.name+'-field');
  const hudAudit=await evalFn(()=>{
    const $=id=>document.getElementById(id),buttons=document.querySelectorAll('[data-hud]');
    const field=$('worldCanvas').getBoundingClientRect();
    const hud=$('hudParty').getBoundingClientRect();
    const control=$('interactBtn').getBoundingClientRect();
    const viewHeight=document.documentElement.clientHeight;
    const sections={},errors=[];
    for(const [key,id,word] of [
      ['party','hudParty','우리 키즈몬'],['bag','hudBag','탐험 가방'],
      ['dex','hudDex','탐험 도감'],['goals','hudGoals','탐험 목표'],['menu','hudMenu','키즈몬 메뉴']
    ]){
      $(id).click();
      sections[key]={
        open:!$('genericOverlay').classList.contains('hidden'),
        title:$('genericTitle').textContent,
        content:$('genericBody').textContent.includes(word.replace('우리 키즈몬','HP')),
      };
      if(!$('genericTitle').textContent.includes(word))errors.push('Missing '+key+' title');
      if(key==='party'&&$('genericBody').querySelectorAll('.member').length!==1)errors.push('Party entries hidden');
      if(key==='bag'&&!$('genericBody').textContent.includes('키즈볼'))errors.push('Missing 키즈볼');
      if(key==='dex'&&$('genericBody').querySelectorAll('.dex-card').length!==102)errors.push('Missing dex entries');
      if(key==='menu'&&!$('genericBody').querySelector('[data-hud-action="restart"]'))errors.push('Missing restart');
      $('genericClose').click();
    }
    return {buttons:buttons.length,fieldHeight:field.height,visibleHeight:viewHeight,
      pageScrollHeight:document.documentElement.scrollHeight,
      navVisible:hud.top>=0&&hud.bottom<=viewHeight,
      controlVisible:control.top>0&&control.bottom<=viewHeight+2,
      modalStates:sections,errors};
  });
  assert.equal(hudAudit.buttons,5,'Exactly five in-world HUD action buttons must be visible');
  assert.ok(hudAudit.fieldHeight>=config.h*.92,'Immersive map too short '+config.name+JSON.stringify(hudAudit));
  assert.ok(hudAudit.pageScrollHeight<=config.h+5,'Dashboard still forces vertical scroll '+config.name+JSON.stringify(hudAudit));
  assert.ok(hudAudit.navVisible&&hudAudit.controlVisible,'HUD or A button clipped '+config.name+JSON.stringify(hudAudit));
  assert.equal(hudAudit.errors.length,0,'HUD modal route failed '+config.name+JSON.stringify(hudAudit));
  await screenshot(config.name+'-hud');
  const moveDexAudit=await evalFn(()=>{
   const $=id=>document.getElementById(id);
   $('hudDex').click();
   const mons=document.querySelectorAll('.dex-card').length;
   document.querySelector('[data-dex-tab="moves"]').click();
   const total=document.querySelectorAll('[data-move]').length;
   const initialCard=document.querySelector('[data-move]')?.getBoundingClientRect();
   const initialVisible=!!initialCard&&initialCard.top<innerHeight-20&&initialCard.bottom>0;
   const heading=$('genericTitle').textContent;
   const descriptor=$('moveDexDetail').textContent;
   const filter=$('moveDexType');
   filter.value='leaf';filter.dispatchEvent(new Event('change',{bubbles:true}));
   const leaves=Array.from(document.querySelectorAll('[data-move]')).map(x=>x.dataset.move);
   const switchOwner=$('moveDexOwner');
   switchOwner.value='party:0';switchOwner.dispatchEvent(new Event('change',{bubbles:true}));
   const own=Array.from(document.querySelectorAll('[data-move]')).map(x=>x.dataset.move);
   filter.value='all';filter.dispatchEvent(new Event('change',{bubbles:true}));
   switchOwner.value='all';switchOwner.dispatchEvent(new Event('change',{bubbles:true}));
   const input=$('moveDexSearch');input.value='피보새';
   input.dispatchEvent(new Event('input',{bubbles:true}));
   const byName=Array.from(document.querySelectorAll('[data-move]')).map(x=>x.dataset.move);
   const sig=document.querySelector('[data-move="fiboStrikes"]');
   if(sig)sig.click();
   const signature=$('moveDexDetail').textContent;
   input.value='없는-기술-zxwv999';input.dispatchEvent(new Event('input',{bubbles:true}));
   const empty=document.querySelectorAll('[data-move]').length===0;
   input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));
   return {mons,total,initialVisible,heading,descriptor:descriptor.slice(0,140),leaves,own,byName,
    signature:signature.slice(0,250),empty,restored:document.querySelectorAll('[data-move]').length};
  });
  assert.ok(moveDexAudit.mons===102&&moveDexAudit.total===41&&moveDexAudit.initialVisible&&
    moveDexAudit.heading.includes('기술 도감')&&
    moveDexAudit.leaves.length>0&&moveDexAudit.leaves.length<41&&
    moveDexAudit.own.length>0&&moveDexAudit.own.length<=moveDexAudit.leaves.length&&
    moveDexAudit.byName.includes('fiboStrikes')&&
    moveDexAudit.signature.includes('2번 연속')&&
    moveDexAudit.empty&&moveDexAudit.restored===41,
    'Skill encyclopedia search/filter/detail broke '+config.name+JSON.stringify(moveDexAudit));
  await screenshot(config.name+'-move-dex');
  await evalFn(()=>document.getElementById('genericClose').click());

  const battleStart=await evalFn(()=>{
   const E=window.OPENMON_EXPEDITION_ENGINE,debug=window.OPENMON_EXPEDITION_DEBUG,s=debug.getState();
   let entry=null;
   for(let x=20;x<40&&!entry;x++)for(let y=14;y<23;y++){
    if(E.terrain(x,y)!=='grass')continue;
    for(const [dx,dy,dir] of [[1,0,'left'],[-1,0,'right'],[0,1,'up'],[0,-1,'down']]){
     if(E.canMove(x+dx,y+dy)){entry={from:{x:x+dx,y:y+dy},button:dir};break}
    }
    if(entry)break
   }
   if(!entry)return {error:'no reachable grass entry'};
   s.pos=entry.from;s.grassSteps=4;s.encounters=0;
   document.querySelector('[data-dir="'+entry.button+'"]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:7}));
   document.querySelector('[data-dir="'+entry.button+'"]').dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:7}));
   const b=debug.getBattle();
   return {hasBattle:!!b,buttonCount:document.querySelectorAll('[data-action]').length,foe:b?.foe.id,
     displayed:!document.getElementById('battleOverlay').classList.contains('hidden'),
     foeSprite:!!document.querySelector('#foeArt .pixel-art'),
     foeHp:document.getElementById('foeHpLabel').textContent};
  });
  assert.ok(battleStart.hasBattle&&battleStart.displayed&&battleStart.foeSprite&&battleStart.buttonCount===4,'Encounter failed '+config.name+JSON.stringify(battleStart));
  await screenshot(config.name+'-battle');
  const rootButtons=await evalFn(()=>document.querySelectorAll('[data-action]').length);
  await evalFn(()=>document.querySelector('[data-action="fight"]').click());
  await screenshot(config.name+'-battle-skill-selection');
  const turnMenu=await evalFn(()=>{
   const battle=window.OPENMON_EXPEDITION_DEBUG.getBattle();
   const own=window.OPENMON_EXPEDITION_DEBUG.getState().party[0];
   const skills=Array.from(document.querySelectorAll('[data-action^="move:"]'));
   const signatures=skills.map(b=>b.textContent);
   const pre=own.moveSlots.map(x=>x.pp);
   const display=skills.every(b=>b.textContent.includes('PP'));
   const moveBtn=skills.find(x=>x.dataset.action==='move:'+own.moveSlots[1].id);
   moveBtn.click();
   const post=own.moveSlots.map(x=>x.pp);
   const foeUsedPP=battle.foe.moveSlots.some(slot=>slot.pp<window.OPENMON_TURN_BATTLE.moves[slot.id].pp);
   return {skills:skills.length,signatures,display,
    consumed:pre[1]-post[1],foeUsedPP,turn:battle.turn,overlay:!document.getElementById('battleOverlay').classList.contains('hidden')};
  });
  assert.ok(rootButtons===4&&turnMenu.skills===4&&turnMenu.display&&turnMenu.consumed===1&&
    turnMenu.foeUsedPP&&turnMenu.overlay,
    'New turn-based move menu and PP broke '+config.name+JSON.stringify(turnMenu));
  await screenshot(config.name+'-battle-moves');
  const result=await evalFn(()=>{
   const debug=window.OPENMON_EXPEDITION_DEBUG,b=debug.getBattle();
   b.foe.hp=1;
   Math.random=()=>0;
   document.querySelector('[data-action="ball"]').click();
   const won=b.done;
   document.getElementById('battleContinue').click();
   return {won,caught:debug.getState().catches,party:debug.getState().party.length,
    saved:!!localStorage.getItem('kidscade.openmon.expedition.save.v1')};
  });
  assert.ok(result.won&&result.caught===1&&result.party===2&&result.saved,'Capture/save broke '+config.name+JSON.stringify(result));
  await send('Page.reload',{ignoreCache:true});await sleep(450);
  const resumed=await evalFn(()=>{
   const s=window.OPENMON_EXPEDITION_DEBUG.getState();
   return {loaded:!!s,caught:s?.catches,party:s?.party.length,starterHidden:document.getElementById('starterOverlay').hidden};
  });
  assert.ok(resumed.loaded&&resumed.caught===1&&resumed.party===2&&resumed.starterHidden,'Reload lost progress '+config.name+JSON.stringify(resumed));
  assert.equal(errors.length,0,'Browser errors '+config.name+': '+JSON.stringify(errors.slice(0,3)));
  console.log('OPENMON_BROWSER_AUDIT '+config.name+' '+JSON.stringify({initial,field,hudAudit,moveDexAudit,battleStart,turnMenu,result,resumed,errors:errors.length}));
 }
 console.log('OPENMON_BROWSER_AUDIT_PASSED 2 viewports, atlas, starter, encounter, capture, autosave, reload');
})().catch(e=>{console.error(e.stack||e);process.exitCode=1}).finally(()=>{
 try{ws?.close()}catch(e){}
 try{chrome?.kill()}catch(e){}
 try{server.close()}catch(e){}
 try{if(profile)fs.rmSync(profile,{recursive:true,force:true})}catch(e){}
});

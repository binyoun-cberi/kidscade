#!/usr/bin/env node
'use strict';

// Runs on an Ubuntu GitHub Actions runner with Chrome. No Playwright packages needed.
// Local HTTP source, real browser/Canvas, responsive geometry and pointer input.
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const http=require('node:http');
const cp=require('node:child_process');
const assert=require('node:assert/strict');
const {once}=require('node:events');

const ROOT=path.resolve(__dirname,'..');
const CANDIDATES=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'];
const chromePath=CANDIDATES.find(f=>fs.existsSync(f));
if(!chromePath)throw new Error('Chrome/Chromium is needed for the visual audit');

const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json'};
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  const full=path.resolve(ROOT,'.'+decodeURIComponent(url.pathname));
  if(!(full===ROOT||full.startsWith(ROOT+path.sep))){res.writeHead(403);res.end();return}
  fs.readFile(full,(err,buf)=>{
    if(err){res.writeHead(404);res.end('Not found');return}
    res.writeHead(200,{'Content-Type':MIME[path.extname(full)]||'application/octet-stream'});
    res.end(buf);
  });
});
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let chrome,ws;
(async()=>{
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const port=server.address().port;
  const userData=fs.mkdtempSync(path.join(os.tmpdir(),'word-siege-chrome-'));
  chrome=cp.spawn(chromePath,[
    '--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
    '--no-first-run','--no-default-browser-check','--remote-debugging-port=0',
    '--user-data-dir='+userData,'about:blank'
  ],{stdio:['ignore','ignore','pipe']});
  let diagnostic='',target;
  chrome.stderr?.on('data',part=>{diagnostic+=String(part).slice(0,700)});
  for(let i=0;i<300;i++){
    await pause(100);
    if(chrome.exitCode!==null)throw new Error('Chrome exited '+chrome.exitCode+' '+diagnostic.slice(-600));
    try{
      const portFile=path.join(userData,'DevToolsActivePort');
      if(!fs.existsSync(portFile))continue;
      const dynamicPort=Number(fs.readFileSync(portFile,'utf8').split(/\r?\n/)[0]);
      if(!dynamicPort)continue;
      const res=await fetch('http://127.0.0.1:'+dynamicPort+'/json/list');
      const all=await res.json();target=all.find(x=>x.type==='page');if(target)break;
    }catch{}
  }
  if(!target)throw new Error('Chrome DevTools never opened '+diagnostic.slice(-700));
  ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject});
  const pending=new Map(),pageErrors=[];let serial=0;
  ws.onmessage=event=>{
    const msg=JSON.parse(event.data);
    if(msg.method==='Runtime.exceptionThrown'){
      pageErrors.push(msg.params?.exceptionDetails?.text||'Unknown browser exception');
    }
    if(!msg.id)return;
    const p=pending.get(msg.id);if(!p)return;pending.delete(msg.id);
    if(msg.error)p.reject(new Error(msg.error.message));else p.resolve(msg.result||{});
  };
  const send=(method,params={})=>new Promise((resolve,reject)=>{
    const id=++serial;pending.set(id,{resolve,reject});
    ws.send(JSON.stringify({id,method,params}));
  });
  const evaluate=async expression=>{
    const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(result.exceptionDetails)throw new Error(JSON.stringify(result.exceptionDetails).slice(0,500));
    return result.result?.value;
  };
  await send('Page.enable');await send('Runtime.enable');
  const cases=[
    {w:844,h:390,name:'small-landscape'},
    {w:667,h:375,name:'compact-landscape'},
    {w:390,h:844,name:'mobile-portrait'},
    {w:1024,h:768,name:'tablet-landscape'}
  ];
  for(const [index,config] of cases.entries()){
    await send('Emulation.setDeviceMetricsOverride',{width:config.w,height:config.h,deviceScaleFactor:1,mobile:true});
    await send('Page.navigate',{url:'http://127.0.0.1:'+port+'/games/language_word_siege/index.html'});
    await pause(1000);
    let status=await evaluate(`(()=>{
      const all=['boardWrap','game','rack','waveBtn','startBtn'].map(id=>!!document.getElementById(id));
      return {all,title:document.title};
    })()`);
    assert.ok(status.all.every(Boolean),'Missing essential DOM: '+config.name);
    const stageCount=await evaluate("document.querySelectorAll('#stageList .stage-choice').length");
    assert.equal(stageCount,20,'stage selection must contain twenty boards');
    const initiallyLocked=await evaluate("document.querySelectorAll('#stageList .stage-choice:disabled').length");
    assert.ok(initiallyLocked>=19,'fresh campaign should lock later boards');
    const selectorGeometry=await evaluate(`(()=>{
      const panel=document.querySelector('#startOverlay .panel').getBoundingClientRect();
      const start=document.getElementById('startBtn').getBoundingClientRect();
      const list=document.getElementById('stageList').getBoundingClientRect();
      return {panelTop:panel.top,panelBottom:panel.bottom,startTop:start.top,startBottom:start.bottom,
        listTop:list.top,listBottom:list.bottom,screenHeight:innerHeight};
    })()`);
    assert.ok(selectorGeometry.panelBottom<=config.h+2,'stage selector beyond viewport '+config.name);
    if(index===0||index===2){
      const shot=await send('Page.captureScreenshot',{format:'jpeg',quality:40,captureBeyondViewport:false});
      console.log('WORD_SIEGE_IMAGE_stage-select-'+config.name+'='+shot.data);
    }
    await evaluate("document.getElementById('startBtn').click()");
    await pause(250);
    const geometry=await evaluate(`(()=>{
      const rect=id=>{const r=document.getElementById(id).getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}};
      const tiles=[...document.querySelectorAll('#rack .tile')].map(el=>{const r=el.getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height,bottom:r.bottom}});
      return {screen:{w:innerWidth,h:innerHeight},board:rect('boardWrap'),canvas:rect('game'),
        rack:rect('rack'),bottom:rect('rack'),wave:rect('waveBtn'),status:rect('statusBox'),tiles,
        scrollWidth:document.documentElement.scrollWidth,
        floatingMenu:(()=>{
          const button=document.querySelector('#kidscade-game-shell .kcgs-open');
          if(!button)return null;
          const r=button.getBoundingClientRect();
          return {x:r.left,y:r.top,right:r.right,bottom:r.bottom};
        })()};
    })()`);
    assert.ok(Math.abs(geometry.board.h-geometry.canvas.h)<2,'canvas is clipped: '+config.name+' '+JSON.stringify(geometry));
    assert.ok(Math.abs(geometry.board.w-geometry.canvas.w)<2,'canvas width mismatch: '+config.name);
    assert.ok(geometry.board.h>95,'too little board area: '+config.name+' '+JSON.stringify(geometry));
    assert.ok(geometry.tiles.length===12);
    assert.ok(geometry.tiles.every(t=>t.x>=-1&&t.y>=0&&t.x+t.w<=config.w+1&&t.bottom<=config.h+1),'letter rack clipped: '+config.name);
    assert.ok(geometry.scrollWidth<=config.w+2,'horizontal overflow: '+config.name+' width='+geometry.scrollWidth);
    if(geometry.floatingMenu){
      assert.ok(geometry.tiles.every(t=>t.x+t.w<=geometry.floatingMenu.x||t.x>=geometry.floatingMenu.right||t.bottom<=geometry.floatingMenu.y||t.y>=geometry.floatingMenu.bottom),
        'floating SDK menu covers a letter tile: '+config.name+' '+JSON.stringify(geometry.floatingMenu));
    }
    const waveBefore=await evaluate("document.getElementById('waveText').textContent");
    await evaluate("document.getElementById('waveBtn').click()");
    const waveAfter=await evaluate("document.getElementById('waveText').textContent");
    assert.equal(waveAfter,waveBefore,'Wave started without attacking tower: '+config.name);
    // Press the same letter tiles a student taps. Then place towers via real PointerEvent.
    async function build(word,nx,ny){
      const result=await evaluate(`(()=>{
        const used=new Set();
        for(const ch of '${word}'){
          const tiles=[...document.querySelectorAll('#rack .tile')];
          const index=tiles.findIndex((t,i)=>!used.has(i)&&t.textContent===ch);
          if(index<0)return 'missing-letter-'+ch;
          used.add(index);tiles[index].click();
        }
        const build=document.getElementById('buildBtn');
        if(build.disabled)return 'disabled-build';
        build.click();
        const rect=document.getElementById('game').getBoundingClientRect();
        document.getElementById('game').dispatchEvent(new PointerEvent('pointerdown',{
          bubbles:true,clientX:rect.left+rect.width*${nx},clientY:rect.top+rect.height*${ny},pointerType:'touch'
        }));
        return document.getElementById('statusBox').textContent;
      })()`);
      assert.match(result, /배치 완료/,'Failed to build '+word+' / '+config.name+' '+result);
    }
    await build('MINER',.22,.18);
    await build('ARROW',.39,.55);
    let wordStatus=await evaluate("document.getElementById('wordMeta').textContent");
    assert.ok(wordStatus,'composer meta should render');
    await evaluate("document.getElementById('waveBtn').click()");
    await pause(1300);
    const wave=await evaluate("document.getElementById('waveText').textContent");
    assert.ok(wave.startsWith('1 / '),'Wave 1 did not start: '+config.name);
    const report={name:config.name,viewport:config.w+'x'+config.h,boardH:Math.round(geometry.board.h),
      tiles:geometry.tiles.length,rows:[...new Set(geometry.tiles.map(t=>Math.round(t.y)))].length,
      inWave:wave};
    console.log('WORD_SIEGE_VISUAL '+JSON.stringify(report));
    if(index===0||index===2){
      const shot=await send('Page.captureScreenshot',{format:'jpeg',quality:38,captureBeyondViewport:false});
      console.log('WORD_SIEGE_IMAGE_'+config.name+'='+shot.data);
    }
  }
  // Open later campaign boards through the same stored unlock the game writes on victory.
  await evaluate("window.KidscadeStorage.setRaw('kidscade_word_siege_stage_v1','20')");
  await send('Emulation.setDeviceMetricsOverride',{width:1024,height:768,deviceScaleFactor:1,mobile:true});
  for(const index of [5,9,14,19]){
    await send('Page.navigate',{url:'http://127.0.0.1:'+port+'/games/language_word_siege/index.html?stageAudit='+index});
    await pause(700);
    const selected=await evaluate(`(()=>{
      const buttons=[...document.querySelectorAll('#stageList .stage-choice')];
      if(buttons.some(b=>b.disabled))return 'still-locked';
      buttons[${index}].click();
      document.getElementById('startBtn').click();
      return document.getElementById('stageText').textContent;
    })()`);
    assert.equal(selected,String(index+1).padStart(2,'0'),'Could not load advanced stage '+index);
    await pause(300);
    if(index===9||index===19){
      const shot=await send('Page.captureScreenshot',{format:'jpeg',quality:42,captureBeyondViewport:false});
      console.log('WORD_SIEGE_IMAGE_'+(index===19?'apocalypse-stage':'first-finale')+'='+shot.data);
    }
    console.log('WORD_SIEGE_CAMPAIGN '+JSON.stringify({index:index+1,selected}));
  }
  // Test arbitrary English entry on the real browser, independent of rack order.
  await send('Page.navigate',{url:'http://127.0.0.1:'+port+'/games/language_word_siege/index.html?typingAudit=1'});
  await pause(650);
  const cow=await evaluate(`(()=>{
    const field=document.getElementById('freeWord');
    const result={};
    document.getElementById('startBtn').click();
    const initial=[...document.querySelectorAll('#rack .tile')].map(t=>t.textContent).join('');
    field.value='cow';field.dispatchEvent(new Event('input',{bubbles:true}));
    result.cowWord=document.getElementById('currentWord').textContent;
    result.cowDefinition=document.getElementById('wordMeta').textContent;
    result.cowEnabled=!document.getElementById('buildBtn').disabled;
    document.getElementById('buildBtn').click();
    const box=document.getElementById('game').getBoundingClientRect();
    document.getElementById('game').dispatchEvent(new PointerEvent('pointerdown',{
      bubbles:true,clientX:box.left+box.width*.39,clientY:box.top+box.height*.55,pointerType:'touch'
    }));
    result.after=document.getElementById('statusBox').textContent;
    result.rackUnchanged=initial===[...document.querySelectorAll('#rack .tile')].map(t=>t.textContent).join('');
    field.value='nuke';field.dispatchEvent(new Event('input',{bubbles:true}));
    result.nukeDefinition=document.getElementById('wordMeta').textContent;
    result.nukeDisabled=document.getElementById('buildBtn').disabled;
    field.value='asdfgh';field.dispatchEvent(new Event('input',{bubbles:true}));
    result.gibberishDisabled=document.getElementById('buildBtn').disabled;
    return result;
  })()`);
  assert.equal(cow.cowWord,'COW','direct input must capitalize');
  assert.ok(cow.cowDefinition.includes('소'));
  assert.ok(cow.cowEnabled);
  assert.ok(cow.after.includes('배치 완료'),'direct COW failed to build: '+JSON.stringify(cow));
  assert.ok(cow.rackUnchanged,'direct input should not consume alphabet tiles');
  assert.ok(cow.nukeDefinition.includes('핵'));
  assert.ok(cow.nukeDisabled,'NUKE is too cheap at the start');
  assert.ok(cow.gibberishDisabled,'gibberish should be rejected');
  console.log('WORD_SIEGE_FREE_TYPE '+JSON.stringify(cow));

  // A real browser exercises the silly tower through the same touch controls as a child.
  await send('Page.navigate',{url:'http://127.0.0.1:'+port+'/games/language_word_siege/index.html?funMusicAudit=1'});
  await pause(650);
  const music=await evaluate(`(()=>{
    document.getElementById('startBtn').click();
    const word=document.getElementById('freeWord');
    word.value='music';word.dispatchEvent(new Event('input',{bubbles:true}));
    const data={
      name:document.getElementById('currentWord').textContent,
      description:document.getElementById('wordMeta').textContent,
      affordable:!document.getElementById('buildBtn').disabled
    };
    if(data.affordable){
      document.getElementById('buildBtn').click();
      const board=document.getElementById('game').getBoundingClientRect();
      document.getElementById('game').dispatchEvent(new PointerEvent('pointerdown',{
        bubbles:true,clientX:board.left+board.width*.22,clientY:board.top+board.height*.18,pointerType:'touch'
      }));
    }
    data.result=document.getElementById('statusBox').textContent;
    if(data.result.includes('배치 완료'))document.getElementById('waveBtn').click();
    data.wave=document.getElementById('waveText').textContent;
    return data;
  })()`);
  assert.equal(music.name,'MUSIC');
  assert.ok(music.description.includes('춤'),'MUSIC must explain its funny behavior');
  assert.equal(music.affordable,true);
  assert.ok(music.result.includes('배치 완료'),'MUSIC should be placeable by touch');
  assert.ok(music.wave.startsWith('1 / '),'MUSIC must actually launch a defensive wave');
  await pause(1800);
  const musicShot=await send('Page.captureScreenshot',{format:'jpeg',quality:46,captureBeyondViewport:false});
  console.log('WORD_SIEGE_FUN_MUSIC '+JSON.stringify(music));
  console.log('WORD_SIEGE_IMAGE_fun-music='+musicShot.data);
  const vocabulary=await evaluate(`(()=>{
    const input=document.getElementById('freeWord'),meta=document.getElementById('wordMeta');
    const result={};
    for(const word of ['BOOK','APPLE','CONVERSATION','FIREWORK']){
      input.value=word;input.dispatchEvent(new Event('input',{bubbles:true}));
      result[word]=meta.textContent;
    }
    return result;
  })()`);
  for(const [word,description] of Object.entries(vocabulary)){
    assert.ok(description&&!description.includes('빠른 공격'),'No generic rapid text for '+word);
  }
  assert.match(vocabulary.BOOK,/핀볼|튕김/);
  assert.match(vocabulary.APPLE,/과즙/);
  assert.match(vocabulary.CONVERSATION,/무지개|광선/);
  assert.match(vocabulary.FIREWORK,/불꽃/);
  console.log('WORD_SIEGE_VOCABULARY_ABILITIES '+JSON.stringify(vocabulary));

  assert.equal(pageErrors.length,0,'Browser JavaScript errors: '+JSON.stringify(pageErrors));
  console.log('WORD_SIEGE_BROWSER_AUDIT_PASSED 4 sizes, 20 stage selectors, 4 advanced stage renders and pointer gameplay');
})().catch(e=>{console.error(e.stack||e);process.exitCode=1}).finally(async()=>{
  try{ws?.close()}catch{}
  try{chrome?.kill()}catch{}
  server.close();
});

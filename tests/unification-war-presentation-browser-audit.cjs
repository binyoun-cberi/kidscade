// Run manually with Playwright installed; optional KIDSCADE_PLAYWRIGHT_MODULE and CHROME_BIN overrides.
const {chromium}=require(process.env.KIDSCADE_PLAYWRIGHT_MODULE||'playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert/strict');const root=path.resolve(__dirname,'..'),output=process.env.KIDSCADE_WAR_AUDIT_OUT||path.join(require('os').tmpdir(),'unification-war-presentation-audit');fs.mkdirSync(output,{recursive:true});
const chrome=[process.env.CHROME_BIN,'/opt/google/chrome/chrome','/usr/bin/google-chrome','/usr/bin/chromium'].filter(Boolean).find(p=>fs.existsSync(p));assert.ok(chrome,'Chrome not found');
const server=http.createServer((req,res)=>{const p=new URL(req.url,'http://localhost').pathname;const file=path.resolve(root,'.'+decodeURIComponent(p));if(!file.startsWith(root+'/')){res.writeHead(403);return res.end();}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);return res.end();}if(p.endsWith('/high_history_map/index.html'))data=Buffer.from(data.toString().replace('bind();initStart();',`window.__review={state:()=>state,busy:()=>presentationBusy,run:code=>eval(code)};bind();initStart();`));res.setHeader('content-type',file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':'text/plain');res.end(data);});});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:chrome,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});try{
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:'+server.address().port+'/games/high_history_map/index.html');await page.locator('#tutorialCheck').uncheck();await page.locator('#startBtn').click();
await page.evaluate(()=>UnificationWarPresentation.setMode('normal'));
let target=await page.evaluate(()=>__review.run(`selectUnit('b1');Object.keys(reachable).find(k=>!reachable[k].attack&&!unitsAt(state.tiles[k].q,state.tiles[k].r).length)`));
await page.locator('#hexLayer polygon[data-key="'+target+'"]').click();await page.waitForFunction(()=>__review.busy());
const afterMove=await page.evaluate(()=>JSON.stringify(__review.state()));await page.screenshot({path:path.join(output,'war-move.png')});
// E must not process another turn while a presentation is running.
await page.keyboard.press('e');assert.equal(await page.evaluate(()=>__review.state().turn),1);await page.keyboard.press('Escape');await page.waitForFunction(()=>!__review.busy());
assert.equal(await page.evaluate(()=>JSON.stringify(__review.state())),afterMove);
// A weakly defended city exercises combat, casualties, flag raising and deferred UI.
target=await page.evaluate(()=>__review.run(`var t=tile(20,30),a=unitById('b1'),origin=neighbors(t.q,t.r).find(n=>n.terrain!=='sea'&&!unitsAt(n.q,n.r).length);origin.owner='baekje';a.q=origin.q;a.r=origin.r;a.troops=600;a.moved=false;t.owner='goguryeo';state.cityGarrisons[t.city]=20;state.engineRevision++;selectUnit(a.id);focusPlayerCamera();key(t.q,t.r)`));
await page.locator('#hexLayer polygon[data-key="'+target+'"]').click();await page.locator('#confirmCombat').click();await page.waitForFunction(()=>__review.busy());await page.screenshot({path:path.join(output,'war-combat-animation.png')});
await page.waitForFunction(()=>document.getElementById('warEventTitle').textContent.includes('확보'));await page.screenshot({path:path.join(output,'war-capture.png')});
await page.keyboard.press('Escape');await page.waitForFunction(()=>!__review.busy());assert.ok(await page.evaluate(()=>__review.state().warChronicle.some(e=>e.city==='ungjin')));
await page.locator('#endTurnTop').click();await page.waitForFunction(()=>__review.busy());const afterTurn=await page.evaluate(()=>JSON.stringify(__review.state()));await page.screenshot({path:path.join(output,'war-enemy-turn.png')});
await page.keyboard.press('Escape');await page.waitForFunction(()=>!__review.busy());assert.equal(await page.evaluate(()=>JSON.stringify(__review.state())),afterTurn);
// All events bypass motion in off mode, with no dangling input lock.
await page.evaluate(()=>UnificationWarPresentation.setMode('off'));await page.locator('#endTurnTop').click();await page.waitForFunction(()=>!__review.busy());
await page.evaluate(()=>__review.run(`state.finished=true;openResult('time')`));assert.equal(await page.locator('.war-result-map').count(),1);assert.equal(await page.locator('.war-result-stats div').count(),3);await page.screenshot({path:path.join(output,'war-conclusion.png')});
await page.setViewportSize({width:844,height:390});await page.screenshot({path:path.join(output,'war-conclusion-mobile.png')});
assert.deepEqual(errors,[]);console.log(JSON.stringify({errors,moveSkipPreservesState:true,enemySkipPreservesState:true,cityCapture:true,offModeUnlocked:true,resultMap:true}));
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});

// Run with Playwright installed. KIDSCADE_CHROMIUM may point to an existing Chromium.
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const os=require('node:os');
const assert=require('node:assert/strict');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES ? path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright') : 'playwright');
const root=path.resolve(__dirname,'..');
const game=path.join(root,'games/tod_mot_chatgetda_kkwaekkori/game.js');
const output=process.env.KIDSCADE_AUDIT_DIR||path.join(os.tmpdir(),'kkwaekkori-audit');
fs.mkdirSync(output,{recursive:true});

(async()=>{
  const server=http.createServer((req,res)=>{
    let file=path.join(root,decodeURIComponent(req.url.split('?')[0]));
    if(file.endsWith(path.sep))file+='index.html';
    if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    const types={'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.glb':'model/gltf-binary','.png':'image/png'};
    fs.readFile(file,(error,body)=>{res.statusCode=error?404:200;res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(error?'not found':body);});
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try{
    browser=await chromium.launch({executablePath:process.env.KIDSCADE_CHROMIUM||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
    const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('response',r=>{if(r.status()>=400&&r.url().includes('/assets/game/'))errors.push(`${r.status()} ${r.url()}`);});
    const instrument=async target=>target.route('**/game.js?v=3',route=>route.fulfill({contentType:'application/javascript',body:fs.readFileSync(game,'utf8')+`\nwindow.__audit={startTown,getTarget,scene,camera,citizenMeshes,get town(){return town},get celebration(){return celebration},get previewActor(){return previewActor}};`}));
    await instrument(page);
    const url=`http://127.0.0.1:${server.address().port}/games/tod_mot_chatgetda_kkwaekkori/`;
    await page.goto(url);await page.locator('#quickStart').click();
    await page.locator('#start').waitFor({state:'hidden',timeout:30000});
    assert.equal(await page.evaluate(()=>new Set(__audit.town.people.map(p=>p.activity)).size),9);
    assert.equal(await page.evaluate(()=>__audit.previewActor!==__audit.citizenMeshes.get(__audit.getTarget().id).holder),true);
    await page.screenshot({path:path.join(output,'desktop.png')});
    await page.evaluate(()=>__audit.startTown('large',19,[],'hard'));
    const rounds=await page.evaluate(()=>__audit.town.order.length);assert.equal(rounds,5);
    for(let i=0;i<rounds;i++){
      for(let hint=0;hint<3;hint++)await page.locator('#hintBtn').click();
      if(i===0)await page.locator('#seeThrough').click();
      const at=await page.evaluate(()=>{
        const a=__audit,holder=a.citizenMeshes.get(a.getTarget().id).holder;
        a.scene.updateMatrixWorld(true);a.camera.updateMatrixWorld(true);
        const q=holder.position.clone();q.y+=1.04;q.project(a.camera);
        const r=document.querySelector('#town').getBoundingClientRect();return {x:r.left+(q.x+1)*r.width/2,y:r.top+(1-q.y)*r.height/2};
      });
      await page.mouse.click(at.x,at.y);
      await page.waitForFunction(()=>!__audit.celebration,{},{timeout:30000});
      assert.ok((await page.locator('#progress').textContent()).includes(`${i+1} / 5`));
    }
    assert.equal(await page.locator('#finish').isVisible(),true);
    await page.setViewportSize({width:844,height:390});
    await page.evaluate(()=>__audit.startTown('medium',7,[],'normal'));
    assert.equal(await page.locator('#hintBtn').isVisible(),true);
    await page.screenshot({path:path.join(output,'mobile.png')});
    assert.deepEqual(errors,[]);
    const missing=await browser.newPage();await instrument(missing);
    await missing.route('**/character-male-f.glb',route=>route.abort());
    await missing.goto(url);await missing.locator('#quickStart').click();
    await missing.locator('#start').waitFor({state:'hidden',timeout:30000});
    assert.equal(await missing.evaluate(()=>__audit.town.order.every(id=>__audit.town.people.find(p=>p.id===id).modelVariant!==11)),true);
    console.log(JSON.stringify({passed:true,targetsFound:rounds,missingAssetExcluded:true,screenshots:output}));
  }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});

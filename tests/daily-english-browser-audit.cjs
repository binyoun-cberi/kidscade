// Run with node tests/daily-english-browser-audit.cjs. Uses the installed browser.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const os=require('node:os');
const {pathToFileURL}=require('node:url');
const KEY='kidscade_game_v1:daily_english:progress';
const out=process.env.DAILY_ENGLISH_AUDIT_OUT||fs.mkdtempSync(path.join(os.tmpdir(),'daily-english-'));
const url=pathToFileURL(path.resolve(__dirname,'../games/daily_english/index.html')).href;
(async()=>{
  fs.mkdirSync(out,{recursive:true});
  const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/opt/google/chrome/chrome',headless:true,args:['--no-sandbox']});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:950}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.clock.install({time:new Date('2026-10-20T06:00:00Z')});
    await page.goto(url);await page.evaluate(()=>{localStorage.clear();});await page.reload();
    await page.screenshot({path:path.join(out,'desktop.png'),fullPage:true});
    assert.equal(await page.locator('.lesson-button').count(),18);
    assert.equal(await page.locator('.lesson-button:disabled').count(),17);
    const read=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
    async function solve(wrongFirst=false){
      await page.locator('#begin').click();
      let round=0;
      while(await page.locator('#lesson').isVisible()){
        const s=await read(),q=s.active.deck[s.active.index];
        if(wrongFirst&&round===0){const i=q.options.findIndex(x=>x!==q.answer);await page.locator('#answers>button').nth(i).click();}
        else if(q.options){await page.locator('#answers>button').nth(q.options.indexOf(q.answer)).click();}
        else{
          const tokens=q.answer.split(q.kind==='spell'?'':' '),used=new Set();
          for(const t of tokens){const i=q.tokens.findIndex((x,i)=>x===t&&!used.has(i));used.add(i);await page.locator('#answers>button').nth(i).click();}
          await page.locator('#check').click();
        }
        await page.locator('#feedback').waitFor({state:'visible'});
        if(round===0)await page.screenshot({path:path.join(out,'question.png'),fullPage:true});
        await page.locator('#next').click();
        await page.waitForFunction(k=>{const s=JSON.parse(localStorage.getItem(k));return !s.active||s.active.feedback===null;},KEY);
        round++;
      }
      await page.locator('#result').waitFor({state:'visible'});
      await page.locator('#result-home').click();
      return round;
    }
    for(let i=0;i<18;i++){
      if(i&&i%6===0){await page.clock.setFixedTime(new Date(Date.parse('2026-10-20T06:00:00Z')+Math.floor(i/6)*86400000));await page.reload();}
      await page.locator('#continue').click();
      assert.equal(await solve(),8);
      assert.equal((await read()).completed.length,i+1);
      if(i===5){assert.equal((await read()).energy,0);assert.match(await page.locator('#continue').textContent(),/연습/);}
    }
    let s=await read();assert.equal(s.streak,3);assert.equal(s.stickers.length,6);
    // Reload keeps a paid entry and an unanswered session intact.
    await page.evaluate(k=>{const E=DailyEnglishEngine,s=E.fresh();s.energy=5;localStorage.setItem(k,JSON.stringify(s));},KEY);
    await page.reload();await page.locator('#continue').click();await page.reload();assert.equal((await read()).energy,0);
    await page.locator('#continue').click();assert.equal(await solve(true),9);
    s=await read();assert.equal(s.completed.length,0);assert.equal(s.energy,0);assert.equal(s.streak,1);
    await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(out,'mobile.png'),fullPage:true});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.locator('#continue').click();await page.locator('#begin').click();await page.screenshot({path:path.join(out,'mobile-question.png'),fullPage:true});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    assert.deepEqual(errors,[]);
    console.log('PASS: 18 lessons / 144 questions, three daily budgets, reload, energy exhaustion, free practice, streak, desktop/mobile. Screenshots: '+out);
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

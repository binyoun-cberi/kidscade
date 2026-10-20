// Run from the repository root with Node and Playwright. Starts a local server unless TEACHER_QA_URL is set.
// Software-rendered QA uses half-resolution 3D and disables shadows; HUD remains at native resolution.
const {chromium}=require('playwright');
const {readFileSync,existsSync}=require('node:fs');
const {resolve}=require('node:path');
const assert=require('node:assert/strict');
let base=process.env.TEACHER_QA_URL,server;
async function serve(){
 if(base)return;
 const {readFile}=require('node:fs'),root=process.cwd();
 server=require('node:http').createServer((req,res)=>{
  const file=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));
  if(!file.startsWith(root+'/')){res.writeHead(403).end();return;}
  readFile(file,(err,body)=>{if(err){res.writeHead(404).end();return;}const ext=file.split('.').at(-1);res.setHeader('Content-Type',({js:'text/javascript',mjs:'text/javascript',html:'text/html',css:'text/css',json:'application/json',gltf:'model/gltf+json',glb:'model/gltf-binary',mp3:'audio/mpeg',png:'image/png'})[ext]||'application/octet-stream');res.end(body);});
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port;
}
const game='games/teacher-classroom-sim-prototype/';
const diagnostics=`
window.__teacherQA={
 prepare(){
  for(const s of students){s.health.state='healthy';s.health.revealed=false;s.health.dismissed=false;s.health.awayUntilPeriod=0;s.health.restUntilPeriod=0;}
  player.root.position.set(activeSpace.teachingPoint.x,0,activeSpace.teachingPoint.z);enterStep(1);
  lessonFlow.phase='practice';lessonFlow.assigned=true;lessonFlow.progress=0;
  const s=students[0];s.runtime.mode='offtask';s.runtime.focus=0;player.root.position.copy(s.actor.root.position);player.root.position.x+=.9;scanAction();updateHud();
 },
 snapshot(){return {time:stepTime,paused,day:campaign.day,notes:campaign.studentMemory.minsu.notes,trust:campaign.studentMemory.minsu.trust,focus:students[0].runtime.focusMax,friendships:[...friendships],relations:[...relations],fallback:students.some(s=>s.actor.usingFallback),subject:campaign.subjectMastery.minsu['수학']};},
 finish(){friendships.set('jiwoo|minsu',4);relations.add('minsu|taeho');finishDay();},
};`;
(async()=>{
 await serve();
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE||(existsSync('/opt/google/chrome/chrome')?'/opt/google/chrome/chrome':undefined),args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage','--enable-webgl']});
 const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE ERROR:',e.message);});
 await page.route('**/school-day-game.js?*',route=>route.fulfill({contentType:'text/javascript',body:readFileSync(resolve(game,'school-day-game.js'),'utf8').replace('renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.65));','renderer.setPixelRatio(.5);').replace('renderer.shadowMap.enabled=true;','renderer.shadowMap.enabled=false;')+'\n'+diagnostics}));
 await page.goto(base+'/'+game+'index.html');console.log('Loaded page');
 await page.waitForFunction(()=>window.__teacherQA&&document.querySelector('#startButton').disabled===false,{},{timeout:60000});
 console.log('Boot ready');assert.equal((await page.evaluate(()=>window.__teacherQA.snapshot())).fallback,false,'real character assets must load');
 await page.locator('#startButton').click();
 await page.evaluate(()=>window.KidscadeGame.pause());
 const shellPause=await page.evaluate(()=>window.__teacherQA.snapshot());assert.equal(shellPause.paused,true);
 await page.evaluate(()=>window.KidscadeGame.resume());assert.equal(await page.evaluate(()=>window.__teacherQA.snapshot().paused),false);
 await page.evaluate(()=>window.KidscadeGame.setMuted(true));assert.equal(await page.locator('#soundButton').textContent(),'무음');
 await page.locator('#soundButton').click();assert.equal(await page.locator('#soundButton').textContent(),'소리');
 await page.evaluate(()=>window.__teacherQA.prepare());
 console.log('Lesson prepared');const before=await page.evaluate(()=>window.__teacherQA.snapshot());
 await page.locator('#actionButton').click();await page.locator('#careDialog:not(.hidden)').waitFor();
 if(process.env.TEACHER_QA_SCREENSHOTS)await page.screenshot({path:process.env.TEACHER_QA_SCREENSHOTS+'/teacher-care.png'});
 const pausedAt=await page.evaluate(()=>window.__teacherQA.snapshot().time);
 await page.waitForTimeout(250);
 assert.equal(await page.evaluate(()=>window.__teacherQA.snapshot().time),pausedAt,'teaching pauses while choosing care');
 await page.locator('[data-care="encourage"]').click();
 console.log('Care selected');const after=await page.evaluate(()=>window.__teacherQA.snapshot());
 assert.equal(after.paused,false);assert.equal(after.notes.length,1);assert.ok(after.trust>0);assert.ok(after.focus>before.focus);assert.ok(after.subject>before.subject);
 await page.locator('#rosterToggle').click();await page.locator('#studentStrip [data-student="minsu"]').click();
 assert.equal(await page.locator('#studentDetail meter').count(),6);
 if(process.env.TEACHER_QA_SCREENSHOTS)await page.screenshot({path:process.env.TEACHER_QA_SCREENSHOTS+'/teacher-record.png'});
 await page.locator('#closeDetail').click();
 // Keep a visible care queue while inspecting each responsive layout.
 await page.evaluate(()=>{window.__teacherQA.prepare();});
 for(const [width,height] of [[1440,900],[1024,768],[844,390],[667,375],[390,844]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(150);
  const boxes=await page.evaluate(()=>Object.fromEntries(['hud','dayStrip','instructionPanel','attentionPanel','joystick','actionButton','rosterToggle','helpButton','soundButton','kidscade-game-shell','guide'].map(id=>{
   const r=document.getElementById(id).getBoundingClientRect();return [id,{x:r.x,y:r.y,w:r.width,h:r.height}];
  })));
  for(const [id,r]of Object.entries(boxes))assert.ok(r.x>=-1&&r.y>=-1&&r.x+r.w<=width+1&&r.y+r.h<=height+1,id+' leaves '+width+'x'+height);
  const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
  for(const [a,b]of [['instructionPanel','attentionPanel'],['attentionPanel','actionButton'],['instructionPanel','joystick'],['dayStrip','rosterToggle'],['dayStrip','helpButton'],['dayStrip','soundButton'],['actionButton','kidscade-game-shell'],['guide','actionButton'],['guide','joystick'],['guide','instructionPanel']])assert.equal(overlap(boxes[a],boxes[b]),false,a+' overlaps '+b+' at '+width+'x'+height);
  if(process.env.TEACHER_QA_SCREENSHOTS)await page.screenshot({path:process.env.TEACHER_QA_SCREENSHOTS+'/teacher-'+width+'x'+height+'.png'});
 }
 await page.evaluate(()=>window.__teacherQA.finish());await page.locator('#restartButton').click();
 await page.waitForFunction(()=>window.__teacherQA&&document.querySelector('#startButton').disabled===false,{},{timeout:60000});
 const next=await page.evaluate(()=>window.__teacherQA.snapshot());
 assert.equal(next.day,2);assert.equal(next.notes.length,1);assert.equal(next.trust,after.trust);assert.equal(next.focus,after.focus);
 assert.ok(next.friendships.some(([key,value])=>key==='jiwoo|minsu'&&value===4));assert.ok(next.relations.includes('minsu|taeho'));
 assert.deepEqual(errors,[]);console.log('PASS: real 3D boot, care pause/resume, tailored learning, 5 HUD sizes, SDK pause/mute, next-day memory');
 await browser.close();server?.close();
})().catch(e=>{console.error(e);server?.close();process.exit(1);});

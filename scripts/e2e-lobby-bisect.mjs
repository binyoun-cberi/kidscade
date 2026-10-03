import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT=process.cwd();
const DIST=path.join(ROOT,'dist');
const PORT=4181;
const ORIGIN=`http://127.0.0.1:${PORT}`;

function mime(file){
  return file.endsWith('.html')?'text/html; charset=utf-8':
    file.endsWith('.js')||file.endsWith('.mjs')?'text/javascript; charset=utf-8':
    file.endsWith('.css')?'text/css; charset=utf-8':
    file.endsWith('.json')?'application/json; charset=utf-8':'application/octet-stream';
}
const server=http.createServer((req,res)=>{
  let rel='index.html';
  try{rel=decodeURIComponent(new URL(req.url,ORIGIN).pathname).replace(/^\/+/, '')||'index.html'}catch(_){}
  let file=path.normalize(path.join(DIST,rel));
  if(!file.startsWith(DIST)||!fs.existsSync(file)){res.writeHead(404);res.end('not found');return}
  try{if(fs.statSync(file).isDirectory())file=path.join(file,'index.html')}catch(_){}
  res.writeHead(200,{'content-type':mime(file),'cache-control':'no-store'});
  fs.createReadStream(file).pipe(res);
});
await new Promise((resolve,reject)=>{server.on('error',reject);server.listen(PORT,'127.0.0.1',resolve)});

const suspects=[
  'avatar-integration.js',
  'seed-world-meta.js',
  'avatar-preview-boot-fix.js',
  'life-world-integration.js',
  'auto-update.js',
  'profile-history.js',
  'server-stats.js',
  'ui-information-architecture.js',
  'ui-visual-polish.js',
  'account-client.js',
  'account-session-safety.js',
  'account-ui-runtime.js',
  'account-profile-gate.js',
  'seed-balance-sync.js',
  'ui-clarity-overhaul.js',
  'ui-topbar-compact.js',
  'seed-house-entry.js',
  'game-registry.js',
  'game-filter.js',
  'catalog-discovery.js',
  'game-cover-placeholders.js',
  'dashboard-recent.js',
  'activity-feed.js',
  'achievement-gallery.js',
  'game-frame-shell.js',
  'game-launcher.js',
  'home-v2.js'
];

async function probe(disabled=[]){
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1280,height:800}});
  for(const name of disabled){
    await context.route(url=>new URL(url).pathname.endsWith('/'+name), route=>
      route.fulfill({status:200,contentType:'text/javascript; charset=utf-8',body:`/* e2e disabled ${name} */`})
    );
  }
  await context.route('**/api/account/me', route=>route.fulfill({status:401,contentType:'application/json',body:'{"ok":false,"error":"not_authenticated"}'}));
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e?.message||e)));
  const started=Date.now();
  let ok=false,detail='';
  try{
    const response=await page.goto(ORIGIN+'/',{waitUntil:'domcontentloaded',timeout:4500});
    ok=Boolean(response&&response.status()<400);
    detail=`status=${response?.status()} ready=${await page.evaluate(()=>document.readyState)}`;
  }catch(e){
    detail=String(e?.message||e).split('\n')[0];
  }
  const ms=Date.now()-started;
  try{await context.close()}catch(_){}
  try{await browser.close()}catch(_){}
  return {ok,ms,detail,errors:errors.slice(0,4)};
}

const baseline=await probe([]);
console.log('[BISECT] baseline '+JSON.stringify(baseline));
const results=[];
for(const name of suspects){
  const result=await probe([name]);
  results.push({name,...result});
  console.log('[BISECT] disable '+name+' '+JSON.stringify(result));
}
const rescuers=results.filter(r=>r.ok).sort((a,b)=>a.ms-b.ms);
console.log('\n=== LOBBY LOAD BISECT ===');
console.log(JSON.stringify({baseline,rescuers,results},null,2));

await new Promise(resolve=>server.close(resolve));
if(!baseline.ok && rescuers.length===0) process.exitCode=2;

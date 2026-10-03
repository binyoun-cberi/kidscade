import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = path.resolve(process.cwd());
const DIST = path.join(ROOT, 'dist');
const requestedTarget = String(process.env.TARGET_URL || '').trim();
const serveDist = process.env.SERVE_DIST === '1' || !requestedTarget;
const PORT = Number(process.env.E2E_PORT || 4173);
const TARGET_URL = requestedTarget || `http://127.0.0.1:${PORT}/`;

const steps = [];
const consoleErrors = [];
const consoleWarnings = [];
const pageErrors = [];
const requestFailures = [];
const badResponses = [];

function record(name, ok, detail = null) {
  const row = { name, ok:Boolean(ok), detail };
  steps.push(row);
  const prefix = ok ? 'PASS' : 'FAIL';
  console.log(`[E2E ${prefix}] ${name}${detail ? ' :: ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''}`);
  return ok;
}

async function attempt(name, fn) {
  try {
    const detail = await fn();
    record(name, true, detail ?? null);
  } catch (error) {
    record(name, false, String(error?.stack || error));
  }
}

function mimeFor(file) {
  const ext = path.extname(file).toLowerCase();
  return ({
    '.html':'text/html; charset=utf-8',
    '.js':'text/javascript; charset=utf-8',
    '.mjs':'text/javascript; charset=utf-8',
    '.css':'text/css; charset=utf-8',
    '.json':'application/json; charset=utf-8',
    '.png':'image/png',
    '.jpg':'image/jpeg',
    '.jpeg':'image/jpeg',
    '.webp':'image/webp',
    '.svg':'image/svg+xml',
    '.glb':'model/gltf-binary',
    '.mp3':'audio/mpeg',
    '.wav':'audio/wav',
    '.ogg':'audio/ogg'
  })[ext] || 'application/octet-stream';
}

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let pathname = '/';
      try { pathname = decodeURIComponent(new URL(req.url, `http://127.0.0.1:${PORT}`).pathname); } catch (_) {}
      let rel = pathname.replace(/^\/+/, '') || 'index.html';
      let file = path.normalize(path.join(DIST, rel));
      if (!file.startsWith(DIST)) {
        res.writeHead(403); res.end('forbidden'); return;
      }
      try {
        if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
      } catch (_) {}
      if (!fs.existsSync(file)) {
        res.writeHead(404, { 'content-type':'text/plain; charset=utf-8' });
        res.end('not found');
        return;
      }
      res.writeHead(200, {
        'content-type':mimeFor(file),
        'cache-control':'no-store',
        'access-control-allow-origin':'*'
      });
      fs.createReadStream(file).pipe(res);
    });
    server.on('error', reject);
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

let server = null;
if (serveDist) server = await startServer();

const browser = await chromium.launch({ headless:true });
const context = await browser.newContext({
  viewport:{ width:1600, height:1000 },
  ignoreHTTPSErrors:true
});

let mockedLoggedIn = false;
const testAccount = {
  role:'student',
  loginId:'KC-E2E01-01',
  nickname:'E2E테스터',
  className:'E2E 테스트반',
  classCode:'E2E01',
  revision:1,
  lastLoginAt:new Date().toISOString()
};
const testState = {
  version:1,
  profile:{ version:1, nickname:'E2E테스터' },
  seeds:123,
  sproutPower:45,
  avatarInventory:[],
  avatarEquipped:{},
  playHistory:{ games:{} },
  inventory:{},
  equipped:{}
};

await context.route('**/api/account/me', async route => {
  if (!mockedLoggedIn) {
    await route.fulfill({ status:401, contentType:'application/json', body:JSON.stringify({ ok:false, error:'not_authenticated' }) });
  } else {
    await route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({ ok:true, account:testAccount, state:testState }) });
  }
});
await context.route('**/api/account/login', async route => {
  mockedLoggedIn = true;
  await route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({ ok:true, account:testAccount, state:testState }) });
});
await context.route('**/api/account/sync', async route => {
  await route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({ ok:true, account:testAccount, state:testState }) });
});
await context.route('**/api/economy/summary', async route => {
  await route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({ ok:true, enabled:false }) });
});

const page = await context.newPage();
page.on('console', msg => {
  const text = msg.text();
  if (msg.type() === 'error') consoleErrors.push(text);
  if (msg.type() === 'warning') consoleWarnings.push(text);
});
page.on('pageerror', error => pageErrors.push(String(error?.stack || error)));
page.on('requestfailed', req => requestFailures.push({ url:req.url(), failure:req.failure()?.errorText || '' }));
page.on('response', res => {
  if (res.status() >= 400 && !/\/api\/(account|economy)\//.test(res.url())) {
    badResponses.push({ status:res.status(), url:res.url() });
  }
});

await attempt('open lobby', async () => {
  const response = await page.goto(TARGET_URL, { waitUntil:'domcontentloaded', timeout:30000 });
  if (!response || response.status() >= 400) throw new Error('navigation failed: ' + response?.status());
  return { status:response.status(), url:page.url() };
});

await page.waitForTimeout(1200);

await attempt('select high-school age when age gate is visible', async () => {
  const gate = page.locator('#age-selection-screen');
  if (await gate.isVisible().catch(() => false)) {
    const high = page.locator('[data-target-age="high"]');
    await high.click({ timeout:5000 });
    await page.waitForTimeout(250);
    return 'selected high';
  }
  return 'age gate already dismissed';
});

await page.waitForTimeout(2200);

await attempt('core runtime globals exist', async () => {
  const state = await page.evaluate(() => ({
    boot:Boolean(window.KidscadeBoot),
    games:Boolean(window.KidscadeGames),
    dashboard:Boolean(window.KidscadeDashboard),
    play:Boolean(window.KidscadePlay),
    frame:Boolean(window.KidscadeGameFrame),
    covers:Boolean(window.KidscadeGameCovers),
    home:Boolean(window.KidscadeHomeV2),
    world:Boolean(window.KidscadeWorld),
    avatarOverlay:Boolean(document.getElementById('kidscade-avatar-studio-overlay'))
  }));
  const missing = Object.entries(state).filter(([,v]) => !v).map(([k]) => k);
  if (missing.length) throw new Error('missing globals: ' + missing.join(', '));
  return state;
});

await attempt('lobby left classic mode cleanly or activates recommended Home V2', async () => {
  const state = await page.evaluate(() => {
    const home = document.getElementById('kc-home-v2');
    return {
      homeReady:document.body.classList.contains('kc-home-v2-ready'),
      homeMode:document.body.dataset.kcHomeMode || '',
      homeLayout:document.body.dataset.kcHomeLayout || '',
      homeExists:Boolean(home),
      homeVisible:Boolean(home && !home.hidden && getComputedStyle(home).display !== 'none'),
      hero:Boolean(document.querySelector('.kc-home-hero')),
      libraryVisible:getComputedStyle(document.getElementById('game-list')).display !== 'none'
    };
  });
  if (!state.homeReady) throw new Error('recommended Home V2 never activated: ' + JSON.stringify(state));
  if (!state.homeVisible || !state.hero) throw new Error('Home V2 ready flag set without visible hero: ' + JSON.stringify(state));
  return state;
});

await attempt('game catalog rendered', async () => {
  const state = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('#game-list > .game-card')];
    const visible = cards.filter(card => !card.classList.contains('hidden') && getComputedStyle(card).display !== 'none');
    return {
      total:cards.length,
      visible:visible.length,
      counter:document.getElementById('visible-game-count')?.textContent?.trim() || ''
    };
  });
  if (state.total < 50) throw new Error('too few game cards: ' + JSON.stringify(state));
  return state;
});

await attempt('game cover images are attached and actually loaded', async () => {
  await page.waitForTimeout(1200);
  const state = await page.evaluate(() => {
    const cards=[...document.querySelectorAll('#game-list > .game-card')];
    const shells=[...document.querySelectorAll('#game-list > .game-card .game-cover-shell')];
    const imgs=[...document.querySelectorAll('#game-list > .game-card .game-cover-image')];
    return {
      cards:cards.length,
      shells:shells.length,
      imgWithSrc:imgs.filter(img => Boolean(img.currentSrc || img.src)).length,
      loaded:imgs.filter(img => img.complete && img.naturalWidth > 0).length,
      failed:imgs.filter(img => img.complete && img.naturalWidth === 0 && Boolean(img.currentSrc || img.src)).slice(0,10).map(img => img.currentSrc || img.src)
    };
  });
  if (state.shells < Math.min(20, Math.floor(state.cards * 0.5))) throw new Error('covers were not attached: ' + JSON.stringify(state));
  if (state.loaded < Math.min(10, state.shells)) throw new Error('cover images did not load: ' + JSON.stringify(state));
  return state;
});

await attempt('theme button is clickable', async () => {
  const button=page.locator('#theme-btn');
  await button.scrollIntoViewIfNeeded();
  const before=await page.evaluate(() => document.body.classList.contains('dark-mode'));
  await button.click({ timeout:5000 });
  const after=await page.evaluate(() => document.body.classList.contains('dark-mode'));
  if (before === after) throw new Error('dark-mode state did not change');
  await button.click({ timeout:5000 });
  return { before, after };
});

await attempt('home layout toggle switches recommendation/classic modes', async () => {
  const button=page.locator('#btn-home-layout');
  await button.scrollIntoViewIfNeeded();
  const before=await page.evaluate(() => document.body.dataset.kcHomeLayout || '');
  await button.click({ timeout:5000 });
  await page.waitForTimeout(150);
  const after=await page.evaluate(() => document.body.dataset.kcHomeLayout || '');
  if (!before || before === after) throw new Error(`home layout did not change: ${before} -> ${after}`);
  await button.click({ timeout:5000 });
  return { before, after };
});

await attempt('search input filters and clear restores cards', async () => {
  const input=page.locator('#game-search-input');
  await input.fill('석기');
  await page.waitForTimeout(150);
  const filtered=await page.evaluate(() => [...document.querySelectorAll('#game-list > .game-card')].filter(card => !card.classList.contains('hidden')).length);
  if (filtered < 1) throw new Error('search produced no visible cards');
  const clear=page.locator('#clear-search-btn');
  if (await clear.count()) await clear.click();
  else await input.fill('');
  await page.waitForTimeout(120);
  return { filtered };
});

await attempt('login modal opens and mocked student login completes', async () => {
  const login=page.locator('[data-kca-login]').first();
  await login.scrollIntoViewIfNeeded();
  await login.click({ timeout:5000 });
  const modal=page.locator('#kc-account-modal');
  if (!(await modal.isVisible())) throw new Error('account modal did not open');
  await page.locator('#kca-login-id').fill('KC-E2E01-01');
  await page.locator('#kca-login-pin').fill('123456');
  await page.locator('#kca-login-form .kca-login').click();
  await page.waitForTimeout(250);
  const text=await page.locator('#kc-account-slot').innerText();
  if (!text.includes('KC-E2E01-01')) throw new Error('account slot did not switch to logged-in state: ' + text);
  if (await modal.isVisible()) throw new Error('login modal remained visible after successful login');
  return text.replace(/\s+/g,' ').trim();
});

await attempt('avatar preview is the new runtime and customizer iframe opens', async () => {
  const state=await page.evaluate(() => ({
    buttonText:document.getElementById('avatar-open-btn')?.textContent?.trim() || '',
    preview:Boolean(document.getElementById('kidscade-deluxe-avatar-preview')),
    image:Boolean(document.querySelector('#kidscade-deluxe-avatar-preview .kidscade-avatar-live-img'))
  }));
  if (!state.preview) throw new Error('new avatar preview layer missing: ' + JSON.stringify(state));
  const button=page.locator('#avatar-open-btn');
  await button.scrollIntoViewIfNeeded();
  await button.click({ timeout:5000 });
  await page.waitForTimeout(250);
  const overlay=page.locator('#kidscade-avatar-studio-overlay');
  if (!(await overlay.evaluate(el => el.classList.contains('open')))) throw new Error('avatar studio overlay did not open');
  const frame=page.locator('#kidscade-avatar-studio-frame');
  const src=await frame.getAttribute('src');
  if (!src || !src.includes('avatar-studio.html')) throw new Error('avatar studio iframe src missing: ' + src);
  await page.waitForTimeout(500);
  const child=page.frames().find(f => f.url().includes('avatar-studio.html'));
  if (!child) throw new Error('avatar studio iframe frame not attached');
  const bodyText=(await child.locator('body').innerText().catch(() => '')).slice(0,200);
  if (!bodyText.trim()) throw new Error('avatar studio iframe body is empty');
  await page.locator('#kidscade-avatar-studio-close').click({ timeout:5000 });
  return { ...state, src, frameText:bodyText.replace(/\s+/g,' ').trim() };
});

await attempt('Seed World button opens its iframe', async () => {
  const button=page.locator('#btn-open-shop');
  await button.scrollIntoViewIfNeeded();
  await button.click({ timeout:5000 });
  await page.waitForTimeout(250);
  const overlay=page.locator('#kidscade-life-world-overlay');
  const open=await overlay.evaluate(el => el.classList.contains('open')).catch(() => false);
  if (!open) throw new Error('Seed World overlay did not open');
  const src=await page.locator('#kidscade-life-world-frame').getAttribute('src');
  if (!src || !src.includes('world-v3/kidscade-world.html')) throw new Error('Seed World iframe src missing: ' + src);
  await page.evaluate(() => window.closeKidscadeLifeWorld?.());
  return { src };
});

await attempt('game card opens launch shell and a real game iframe starts', async () => {
  await page.evaluate(() => window.KidscadeHomeV2?.showLibrary?.());
  await page.waitForTimeout(120);
  const card=page.locator('#game-list > .game-card:not(.hidden)').first();
  const id=await card.getAttribute('data-id');
  await card.scrollIntoViewIfNeeded();
  await card.click({ timeout:5000 });
  const modal=page.locator('#game-modal');
  if (!(await modal.isVisible())) throw new Error('game modal did not open for ' + id);
  const start=page.locator('[data-stage-action="start"]');
  if (!(await start.isVisible())) throw new Error('game launch intro did not show start button');
  await start.click({ timeout:5000 });
  await page.waitForFunction(() => {
    const frame=document.getElementById('game-iframe');
    return frame && frame.getAttribute('src') && frame.getAttribute('src') !== 'about:blank';
  }, null, { timeout:10000 });
  const src=await page.locator('#game-iframe').getAttribute('src');
  await page.waitForTimeout(500);
  const iframe=page.frames().find(f => f !== page.mainFrame() && f.url() && !f.url().startsWith('about:blank') && !f.url().includes('avatar-studio') && !f.url().includes('kidscade-world'));
  if (!iframe) throw new Error('game iframe document did not attach: ' + src);
  const frameBody=(await iframe.locator('body').innerText().catch(()=>'')).slice(0,120);
  await page.locator('#close-modal-btn').click({ timeout:5000 });
  return { id, src, frameText:frameBody.replace(/\s+/g,' ').trim() };
});

await attempt('representative visible controls are not covered by an invisible overlay', async () => {
  const result=await page.evaluate(() => {
    const selectors=['#theme-btn','#btn-home-layout','#avatar-open-btn','#btn-open-shop','#game-search-input'];
    return selectors.map(selector => {
      const el=document.querySelector(selector);
      if (!el) return { selector, missing:true };
      const r=el.getBoundingClientRect();
      const x=Math.min(innerWidth-1,Math.max(0,r.left+r.width/2));
      const y=Math.min(innerHeight-1,Math.max(0,r.top+r.height/2));
      const top=document.elementFromPoint(x,y);
      return {
        selector,
        visible:Boolean(r.width&&r.height&&getComputedStyle(el).visibility!=='hidden'&&getComputedStyle(el).display!=='none'),
        pointerEvents:getComputedStyle(el).pointerEvents,
        top:top ? (top.id ? '#'+top.id : top.className || top.tagName) : null,
        ownsTop:Boolean(top && (top===el || el.contains(top) || top.contains(el)))
      };
    });
  });
  const blocked=result.filter(x=>!x.missing&&x.visible&&(!x.ownsTop||x.pointerEvents==='none'));
  if (blocked.length) throw new Error('blocked controls: '+JSON.stringify(blocked));
  return result;
});

await page.screenshot({ path:path.join(ROOT,'e2e-lobby-final.png'), fullPage:true }).catch(()=>{});

const diagnostics = await page.evaluate(() => ({
  readyState:document.readyState,
  bodyClass:document.body.className,
  bodyDataset:{...document.body.dataset},
  activeElement:document.activeElement?.id || document.activeElement?.tagName || '',
  modals:[...document.querySelectorAll('#game-modal,#kidscade-avatar-studio-overlay,#kidscade-life-world-overlay,#kc-account-modal')].map(el=>({
    id:el.id,
    className:el.className,
    display:getComputedStyle(el).display,
    pointerEvents:getComputedStyle(el).pointerEvents
  }))
})).catch(()=>({}));

console.log('\n=== E2E DIAGNOSTIC SUMMARY ===');
console.log(JSON.stringify({
  target:TARGET_URL,
  steps,
  consoleErrors,
  consoleWarnings:consoleWarnings.slice(0,50),
  pageErrors,
  requestFailures:requestFailures.slice(0,50),
  badResponses:badResponses.slice(0,50),
  diagnostics
}, null, 2));

await browser.close();
if (server) await new Promise(resolve => server.close(resolve));

if (steps.some(step => !step.ok)) process.exitCode = 1;

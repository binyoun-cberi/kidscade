#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SITE_URL = process.env.SITE_URL || 'https://kidscade.binyoun.workers.dev/';
const EXPECTED_BUILD = process.env.EXPECTED_BUILD || '';
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT || 9223);
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS || 30000);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function chromeBinary() {
  const candidates = [
    process.env.CHROME_BIN,
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser'
  ].filter(Boolean);
  return candidates.find(existsSync) || null;
}

async function waitForJson(url, timeout = 10000) {
  const started = Date.now();
  let lastError;
  while (Date.now() - started < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) return await response.json();
      lastError = new Error('HTTP ' + response.status);
    } catch (error) {
      lastError = error;
    }
    await sleep(150);
  }
  throw lastError || new Error('Timed out waiting for ' + url);
}

function createCdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let nextId = 1;
  const pending = new Map();
  const listeners = new Map();

  const opened = new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });

  ws.addEventListener('message', event => {
    const message = JSON.parse(String(event.data));
    if (message.id && pending.has(message.id)) {
      const item = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) item.reject(new Error(message.error.message || JSON.stringify(message.error)));
      else item.resolve(message.result);
      return;
    }
    if (message.method && listeners.has(message.method)) {
      for (const listener of listeners.get(message.method)) listener(message.params || {});
    }
  });

  async function send(method, params = {}) {
    await opened;
    const id = nextId++;
    const response = new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    ws.send(JSON.stringify({ id, method, params }));
    return response;
  }

  function on(method, listener) {
    if (!listeners.has(method)) listeners.set(method, new Set());
    listeners.get(method).add(listener);
  }

  function close() {
    ws.close();
  }

  return { send, on, close };
}

async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || 'Runtime evaluation failed');
  }
  return result.result?.value;
}

async function waitFor(cdp, expression, message, timeout = TIMEOUT_MS) {
  const started = Date.now();
  let lastValue;
  while (Date.now() - started < timeout) {
    try {
      lastValue = await evaluate(cdp, expression);
      if (lastValue) return lastValue;
    } catch (_) {}
    await sleep(200);
  }
  throw new Error(message + ' (last=' + JSON.stringify(lastValue) + ')');
}

async function clickSelector(cdp, selector) {
  const point = await evaluate(cdp, `(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || rect.width < 1 || rect.height < 1) return null;
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);
  if (!point) throw new Error('Clickable element not available: ' + selector);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 });
}

async function state(cdp) {
  return evaluate(cdp, `(() => {
    const body = document.body;
    const button = document.getElementById('btn-home-layout');
    const home = document.getElementById('kc-home-v2');
    const discovery = document.querySelector('.kc-discovery');
    const list = document.getElementById('game-list');
    const visible = el => el ? getComputedStyle(el).display : null;
    return {
      readyState: document.readyState,
      homeReady: body.classList.contains('kc-home-v2-ready'),
      layout: body.dataset.kcHomeLayout || null,
      mode: body.dataset.kcHomeMode || null,
      buttonLabel: button?.querySelector('.kc-home-layout-label')?.textContent?.trim() || null,
      buttonAria: button?.getAttribute('aria-label') || null,
      buttonBound: button?.dataset.kcHomeLayoutBound || null,
      homeDisplay: visible(home),
      discoveryDisplay: visible(discovery),
      gameListDisplay: visible(list)
    };
  })()`);
}

function assertToggle(before, after, restored) {
  if (!before.homeReady) throw new Error('Recommended home never reached ready state.');
  if (!before.layout || !after.layout || !restored.layout) throw new Error('Missing home layout dataset.');
  if (before.layout === after.layout) throw new Error('First click did not change home layout.');
  if (restored.layout !== before.layout) throw new Error('Second click did not restore the original home layout.');

  const beforeClassic = before.layout === 'classic';
  const afterClassic = after.layout === 'classic';
  if (beforeClassic === afterClassic) throw new Error('Layout did not toggle between classic and recommend.');

  const expect = (condition, message) => {
    if (!condition) throw new Error(message);
  };

  if (before.layout === 'recommend') {
    expect(before.homeDisplay !== 'none', 'Recommended home shell is hidden before first toggle.');
    expect(after.homeDisplay === 'none', 'Recommended home shell stayed visible in classic layout.');
    expect(after.discoveryDisplay !== 'none', 'Classic discovery area stayed hidden after first toggle.');
  } else {
    expect(before.homeDisplay === 'none', 'Recommended home shell is visible in classic layout.');
    expect(after.homeDisplay !== 'none', 'Recommended home shell stayed hidden in recommend layout.');
  }

  expect(restored.homeDisplay === before.homeDisplay, 'Second toggle did not restore recommended-home visibility.');
  expect(restored.discoveryDisplay === before.discoveryDisplay, 'Second toggle did not restore classic-home visibility.');
}

async function main() {
  const chrome = chromeBinary();
  if (!chrome) throw new Error('Chrome/Chromium executable not found on runner.');

  const userDataDir = path.join(os.tmpdir(), 'kidscade-home-smoke-' + process.pid);
  const browser = spawn(chrome, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--disable-background-networking',
    '--window-size=1440,1100',
    '--remote-debugging-address=127.0.0.1',
    '--remote-debugging-port=' + DEBUG_PORT,
    '--user-data-dir=' + userDataDir,
    'about:blank'
  ], { stdio: ['ignore', 'ignore', 'pipe'] });

  let browserStderr = '';
  browser.stderr.on('data', chunk => { browserStderr += String(chunk); });

  let cdp;
  const browserErrors = [];
  try {
    const targets = await waitForJson('http://127.0.0.1:' + DEBUG_PORT + '/json/list');
    const page = targets.find(target => target.type === 'page');
    if (!page?.webSocketDebuggerUrl) throw new Error('No Chrome page target available.');

    cdp = createCdp(page.webSocketDebuggerUrl);
    cdp.on('Runtime.exceptionThrown', params => {
      browserErrors.push('exception: ' + (params.exceptionDetails?.text || 'unknown'));
    });
    cdp.on('Log.entryAdded', params => {
      const entry = params.entry;
      if (entry?.level === 'error') browserErrors.push('log: ' + entry.text);
    });

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Log.enable');

    const url = new URL(SITE_URL);
    url.searchParams.set('homeToggleSmoke', EXPECTED_BUILD || String(Date.now()));
    await cdp.send('Page.navigate', { url: url.toString() });

    await waitFor(cdp, 'document.readyState === "complete"', 'Site did not finish loading.');

    const ageVisible = await evaluate(cdp, `(() => {
      const el = document.getElementById('age-selection-screen');
      if (!el) return false;
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    })()`);

    if (ageVisible) {
      await clickSelector(cdp, '[data-target-age="high"]');
    }

    await waitFor(
      cdp,
      'document.body.classList.contains("kc-home-v2-ready") && !!document.getElementById("btn-home-layout")',
      'Recommended home did not initialize.'
    );
    await waitFor(
      cdp,
      'document.getElementById("btn-home-layout")?.dataset?.kcHomeLayoutBound === "1"',
      'Home layout toggle button was not bound.'
    );

    const before = await state(cdp);
    await clickSelector(cdp, '#btn-home-layout');
    await waitFor(
      cdp,
      `document.body.dataset.kcHomeLayout && document.body.dataset.kcHomeLayout !== ${JSON.stringify(before.layout)}`,
      'First home-layout click did not change layout.'
    );
    const after = await state(cdp);

    await clickSelector(cdp, '#btn-home-layout');
    await waitFor(
      cdp,
      `document.body.dataset.kcHomeLayout === ${JSON.stringify(before.layout)}`,
      'Second home-layout click did not restore layout.'
    );
    const restored = await state(cdp);

    assertToggle(before, after, restored);

    console.log('KIDSCADE_HOME_TOGGLE_SMOKE PASS');
    console.log(JSON.stringify({ url: url.toString(), before, after, restored, browserErrors }, null, 2));
  } catch (error) {
    let snapshot = null;
    try { if (cdp) snapshot = await state(cdp); } catch (_) {}
    console.error('KIDSCADE_HOME_TOGGLE_SMOKE FAIL');
    console.error(error?.stack || error);
    console.error(JSON.stringify({ snapshot, browserErrors, browserStderr: browserStderr.slice(-4000) }, null, 2));
    process.exitCode = 1;
  } finally {
    try { cdp?.close(); } catch (_) {}
    browser.kill('SIGTERM');
  }
}

main().catch(error => {
  console.error('KIDSCADE_HOME_TOGGLE_SMOKE FAIL');
  console.error(error?.stack || error);
  process.exitCode = 1;
});

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const ROOT=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');

const index=read('index.html');
const bootstrap=read('main-bootstrap.js');
const base=read('index_base.html');
const home=read('home-v2.js');
const finalizer=read('scripts/finalize-lobby-build.cjs');

test('bootstrap failure uses modern recovery controls and never opens the raw template',()=>{
  assert.match(index,/\.loader-actions\{/);
  assert.match(bootstrap,/KIDSCADE 안전 복구/);
  assert.match(bootstrap,/data-kc-retry/);
  assert.match(bootstrap,/data-kc-reload/);
  assert.doesNotMatch(bootstrap,/href=["']index_base\.html/);
  assert.doesNotMatch(bootstrap,/기존 화면 열기/);
});

test('direct index_base navigation redirects to the canonical lobby before legacy scripts',()=>{
  const guard=base.indexOf('data-kc-template-guard');
  const firstRuntime=base.indexOf('src="touch-interaction-guard.js"');
  assert.ok(guard>0 && firstRuntime>guard,'template guard should run before lobby runtime scripts');
  assert.match(base,/index_base\\\.html/);
  assert.match(base,/window\.location\.replace\(target\.href\)/);
});

test('Home V2 exposes classic home only after a structural health check',()=>{
  assert.match(home,/function classicFallbackReady\(\)/);
  assert.match(home,/getElementById\('game-list'\)/);
  assert.match(home,/list\?\.querySelector\?\.\('\.game-card'\)/);
  assert.match(home,/typeof root\.KidscadePlay\?\.open === 'function'/);
  assert.match(home,/if \(classicFallbackReady\(\)\)/);
  assert.match(home,/function showRecoveryPanel\(reason = 'not-ready'\)/);
  assert.match(home,/KIDSCADE 안전 복구/);
  assert.match(home,/data-kc-home-reload/);
});

test('Cloudflare finalizer removes the transitional template from public dist',()=>{
  assert.match(finalizer,/fs\.rmSync\(legacyTemplatePath, \{ force: true \}\)/);
  assert.match(finalizer,/Final lobby must not publish index_base\.html/);
  const distIndex=path.join(ROOT,'dist','index.html');
  if (fs.existsSync(distIndex)) {
    assert.equal(fs.existsSync(path.join(ROOT,'dist','index_base.html')),false);
  }
});

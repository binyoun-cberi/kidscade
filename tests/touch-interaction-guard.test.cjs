const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const stripHref=href=>{
  const value=String(href||'').trim();
  if(!value||/^(?:https?:|data:|javascript:|#)/i.test(value))return '';
  const plain=value.split(/[?#]/,1)[0].replace(/^\/+/, '');
  try{return decodeURIComponent(plain)}catch(_){return plain}
};

test('touch interaction guard parses and preserves editable fields',()=>{
  const js=read('touch-interaction-guard.js');
  const result=spawnSync(process.execPath,['--check',path.join(root,'touch-interaction-guard.js')],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr||result.stdout);
  assert.match(js,/-webkit-touch-callout:none/);
  assert.match(js,/-webkit-user-select:none/);
  assert.match(js,/input,textarea,select/);
  assert.match(js,/contenteditable/);
  assert.match(js,/contextmenu/);
  assert.match(js,/event\.preventDefault\(\)/);
  assert.match(js,/event\.stopPropagation\(\)/);
  assert.match(js,/selectstart/);
  assert.match(js,/pointerType==='touch'/);
  assert.match(js,/pointerType==='pen'/);
});

test('main Kidscade shell loads and cache-busts the touch guard',()=>{
  const html=read('index_base.html');
  const bootstrap=read('main-bootstrap.js');
  assert.match(html,/src="touch-interaction-guard\.js"/);
  assert.match(bootstrap,/touch-interaction-guard\.js/);
});

test('Cloudflare integration injector adds touch guard to every catalog game',()=>{
  const src=read('scripts/inject-game-integrations.cjs');
  assert.match(src,/TOUCH_GUARD_SRC/);
  assert.match(src,/touch-interaction-guard\.js\?v=20260919-1/);
  assert.match(src,/touchGuardInjected/);
  assert.match(src,/injectAudioRuntimeIntoCatalogGames/);
});

test('built enabled catalog games all contain the touch guard',()=>{
  const dist=path.join(root,'dist');
  assert.ok(fs.existsSync(dist),'dist must exist before touch integration tests');
  const catalog=JSON.parse(fs.readFileSync(path.join(dist,'data','games.json'),'utf8'));
  let checked=0;
  for(const game of catalog.games||[]){
    if(!game||game.disabled)continue;
    const relative=stripHref(game.href);
    if(!relative||!/\.html?$/i.test(relative))continue;
    const file=path.join(dist,relative);
    assert.ok(fs.existsSync(file),`built game entry is missing: ${relative}`);
    const html=fs.readFileSync(file,'utf8');
    assert.match(html,/touch-interaction-guard\.js\?v=20260919-1/,`touch guard missing from ${game.id}: ${relative}`);
    checked++;
  }
  assert.ok(checked>=90,`expected broad catalog coverage, checked only ${checked}`);
});

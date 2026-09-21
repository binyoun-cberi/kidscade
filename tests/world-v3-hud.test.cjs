const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const html=read('world-v3/kidscade-world.html');
const runtime=read('world-v3/kidscade-world-v3.js');
const avatar=read('avatar-integration.js');
const integration=read('life-world-integration.js');
const garden=read('garden.js');
const index=read('index.html');
const indexBase=read('index_base.html');

test('avatar customize action lives inside the avatar preview and Seed World stays the main action',()=>{
  assert.match(indexBase,/id="avatar-plaza-preview"[\s\S]*id="avatar-open-btn"[\s\S]*<\/div>/);
  assert.match(indexBase,/avatar-preview-edit/);
  assert.match(indexBase,/id="btn-open-shop"[\s\S]*씨앗 월드/);
  assert.match(avatar,/function ensurePreviewEditButton/);
  assert.match(avatar,/z-index:80/);
  assert.match(avatar,/button\.textContent = '👕 꾸미기'/);
});

test('Seed World uses the compact survival HUD instead of the old debug panels',()=>{
  assert.match(html,/id="helpBtn"/);
  assert.match(html,/class="orbHud health"/);
  assert.match(html,/class="orbHud hunger"/);
  assert.match(html,/id="quickbar"/);
  for(const slot of ['hand','axe','pick','bag','pet'])assert.match(html,new RegExp('data-quick="'+slot+'"'));
  assert.match(html,/id="statusClock"/);
  assert.match(html,/id="coinCount"/);
  assert.match(html,/id="seedCount"/);
  assert.match(html,/id="worldMailChip"/);
  assert.match(html,/id="worldTaskChip"/);
  assert.match(html,/seed-world-meta\.js\?v=1/);
  assert.doesNotMatch(html,/class="hud"/);
  assert.doesNotMatch(html,/id="close"/);
});

test('Seed World quickbar has real equipment, durability, inventory and pet switching',()=>{
  assert.match(runtime,/p\.equippedTool=/);
  assert.match(runtime,/function setEquippedTool/);
  assert.match(runtime,/function requireEquippedTool/);
  assert.match(runtime,/requireEquippedTool\(item\)/);
  assert.match(runtime,/requireEquippedTool\('pick'\)/);
  assert.match(runtime,/\{1:'hand',2:'axe',3:'pick',4:'bag',5:'pet'\}/);
  assert.match(runtime,/data-pet-quick/);
  assert.match(runtime,/inventoryPanel\(\)/);
  assert.match(runtime,/healthLiquid\.style\.height/);
  assert.match(runtime,/hungerLiquid\.style\.height/);
  assert.match(runtime,/axeDur\.style\.width/);
  assert.match(runtime,/pickDur\.style\.width/);
  assert.match(runtime,/function mailboxPanel/);
  assert.match(runtime,/function dailyLifePanel/);
  assert.match(runtime,/function trophyPanel/);
  assert.match(runtime,/function cosmeticShopPanel/);
  assert.match(runtime,/function worldMapPanel/);
  assert.match(runtime,/name:'game-mailbox'/);
  assert.match(runtime,/Meta\?\.recordExplore/);
  assert.match(runtime,/worldMailChip\?\.addEventListener\('click',mailboxPanel\)/);
  assert.match(runtime,/worldTaskChip\?\.addEventListener\('click',dailyLifePanel\)/);
  assert.match(runtime,/Bridge\?\.spendSeeds/);
  assert.match(integration,/function syncWorldEntryStatus/);
  assert.match(integration,/pendingMail/);
  assert.match(integration,/ripeCropCount/);
});

test('hidden avatar runtimes are silenced while games or Seed World are active',()=>{
  assert.match(runtime,/function silenceAvatarRuntime/);
  assert.match(runtime,/doc\.addEventListener\('play',stop,true\)/);
  assert.match(avatar,/function externalGameActive/);
  assert.match(avatar,/kidscade-life-world-overlay/);
  assert.match(avatar,/game-modal/);
  assert.match(avatar,/function silenceStudioMedia/);
  assert.match(avatar,/setPreviewSuspended\(blocked\)/);
});

test('Seed World HUD release is cache-bumped and scripts parse',()=>{
  assert.match(html,/kidscade-world-v3\.js\?v=30/);
  assert.match(integration,/world-v3\/kidscade-world\.html\?v=30/);
  assert.match(garden,/avatar-preview-inline-edit-v5/);
  assert.match(garden,/world-v3-homestead-v30/);
  assert.match(index,/main-bootstrap\.js\?v=20260921-seed-world-homestead-4/);

  const moduleSource=runtime.replace(/^import .*$/gm,'').replace(/^export /gm,'');
  const moduleCheck=spawnSync(process.execPath,['--check'],{input:moduleSource,encoding:'utf8'});
  assert.equal(moduleCheck.status,0,moduleCheck.stderr||moduleCheck.stdout);
  for(const src of [avatar,integration,garden]){
    const check=spawnSync(process.execPath,['--check'],{input:src,encoding:'utf8'});
    assert.equal(check.status,0,check.stderr||check.stdout);
  }
});

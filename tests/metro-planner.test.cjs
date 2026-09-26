const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const dir=path.join(root,'games','high_metro_planner');
const html=fs.readFileSync(path.join(dir,'메트로 플래너.html'),'utf8');
const css=fs.readFileSync(path.join(dir,'metro.css'),'utf8');
const js=fs.readFileSync(path.join(dir,'metro.js'),'utf8');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data','games.json'),'utf8'));
const storage=fs.readFileSync(path.join(root,'kidscade-storage.js'),'utf8');

test('Metro Planner remains the canonical high-grade catalog game',()=>{
  const game=catalog.games.find(g=>g.id==='high_metro_planner');
  assert.ok(game);
  assert.equal(game.title,'메트로 플래너');
  assert.equal(game.age,'high');
  assert.equal(game.href,'games/high_metro_planner/메트로 플래너.html?v=1');
  assert.match(html,/대한민국 철도망/);
});

test('Metro Planner browser source parses and keeps registered storage',()=>{
  assert.doesNotThrow(()=>new Function(js));
  assert.match(storage,/metroPlannerSave:\s*'kidscade_metro_planner_v1'/);
  assert.match(js,/KidscadeStorage\?\.setJson\('metroPlannerSave'/);
  assert.doesNotMatch(js,/localStorage\.(?:getItem|setItem|removeItem)/);
});

test('Korea rework separates track construction from service operation',()=>{
  assert.match(js,/const CITIES=\[/);
  assert.match(js,/const CORRIDOR_DEFS=\[/);
  assert.match(js,/builtTracks:new Set\(\)/);
  assert.match(js,/function buildTrack\(/);
  assert.match(js,/function canExtendService\(/);
  assert.match(js,/먼저 두 도시 사이에 선로를 건설하세요/);
  assert.match(html,/id="trackTool"/);
  assert.match(html,/id="serviceList"/);
});

test('Metro Planner models cached routing, headways, OD demand and transfers',()=>{
  assert.match(js,/routingCache=new Map\(\)/);
  assert.match(js,/networkDirty:true/);
  assert.match(js,/function getRoute\(/);
  assert.match(js,/function serviceHeadway\(/);
  assert.match(js,/function spawnPassengerGroup\(/);
  assert.match(js,/function timePhase\(/);
  assert.match(js,/route\.firstService===line\.id&&route\.firstNext===nextId/);
});

test('Metro Planner includes finance, debt, reports and map layers',()=>{
  assert.match(js,/function updateEconomy\(/);
  assert.match(js,/state\.debt<120/);
  assert.match(js,/function openMonthReport\(/);
  assert.match(js,/const layers=\['기본','수요','혼잡','수익'\]/);
  assert.match(html,/id="monthReport"/);
  assert.match(html,/id="debtLabel"/);
});

test('Metro Planner remains touch responsive and reuses local audio assets',()=>{
  assert.match(css,/touch-action:none/);
  assert.match(css,/@media\(max-width:720px\)/);
  for(const rel of [
    'assets/audio/ui/kenney_interface/click_002.ogg',
    'assets/audio/ui/kenney_interface/confirmation_001.ogg',
    'assets/audio/ui/kenney_interface/error_002.ogg',
    'assets/audio/ui/kenney_interface/tick_001.ogg',
    'assets/audio/sfx/success/cheer-yay-01.mp3',
    'assets/audio/sfx/failure/fail-sting-01.mp3'
  ]) assert.ok(fs.existsSync(path.join(root,rel)),rel);
});

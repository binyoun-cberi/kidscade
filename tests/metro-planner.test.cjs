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

test('Metro Planner catalog points at the Korea rail rework',()=>{
  const game=catalog.games.find(g=>g.id==='high_metro_planner');
  assert.ok(game);
  assert.equal(game.title,'메트로 플래너');
  assert.equal(game.age,'high');
  assert.equal(game.href,'games/high_metro_planner/메트로 플래너.html?v=2');
  assert.match(game.description,/대한민국 주요 도시/);
  assert.match(html,/metro\.css\?v=2/);
  assert.match(html,/metro\.js\?v=2/);
});

test('Metro Planner browser source parses and keeps registered storage',()=>{
  assert.doesNotThrow(()=>new Function(js));
  assert.match(storage,/metroPlannerSave:\s*'kidscade_metro_planner_v1'/);
  assert.match(js,/KidscadeStorage\?\.setJson\('metroPlannerSave'/);
  assert.doesNotMatch(js,/localStorage\.(?:getItem|setItem|removeItem)/);
});

test('Metro Planner uses a Korea city and corridor network instead of random stations',()=>{
  for(const city of ['서울','인천','수원','춘천','원주','강릉','천안','청주','대전','전주','대구','광주','울산','부산']){
    assert.match(js,new RegExp("name:'"+city+"'"));
  }
  assert.match(js,/const CORRIDOR_DEFS=/);
  assert.match(js,/terrainName\(/);
  assert.match(js,/trackCost\(/);
  assert.doesNotMatch(js,/NAME_POOL/);
  assert.doesNotMatch(js,/spawnStation\(/);
});

test('Metro Planner separates physical track from service lines and train headways',()=>{
  assert.match(js,/tracks:new Set\(\)/);
  assert.match(js,/function buildTrack\(/);
  assert.match(js,/function addServiceSegment\(/);
  assert.match(js,/function calculateHeadway\(/);
  assert.match(js,/function serviceCycleMinutes\(/);
  assert.match(js,/state\.tracks\.has\(keyPair\(aId,bId\)\)/);
  assert.match(html,/선로와 노선 분리/);
});

test('Metro Planner routes destination passengers with waiting and transfer costs',()=>{
  assert.match(js,/const TRANSFER_PENALTY=8/);
  assert.match(js,/function shortestRoute\(/);
  assert.match(js,/function warmRouteCache\(/);
  assert.match(js,/routeCache=new Map\(\)/);
  assert.match(js,/networkDirty=true/);
  assert.match(js,/e\.headway\/2/);
  assert.match(js,/addQueue\(origin\.id,dest\.id,count,0\)/);
  assert.match(js,/function handleTrainAtStation\(/);
});

test('Metro Planner includes finance, accessibility, monthly reports, and debt handling',()=>{
  assert.match(js,/function calcAccessibility\(/);
  assert.match(js,/function operatingCost\(/);
  assert.match(js,/function openMonthReport\(/);
  assert.match(js,/MAX_DEBT=150/);
  assert.match(js,/운영자금 .*자동 대출/);
  assert.match(html,/월간 운영 보고/);
  assert.match(html,/전국 접근성/);
  assert.match(html,/노선 성적표/);
});

test('Metro Planner remains touch responsive and reuses local Kidscade audio assets',()=>{
  assert.match(css,/touch-action:none/);
  assert.match(css,/@media\(max-width:720px\)/);
  assert.match(css,/\.sidePanel/);
  for(const rel of [
    'assets/audio/ui/kenney_interface/click_002.ogg',
    'assets/audio/ui/kenney_interface/confirmation_001.ogg',
    'assets/audio/ui/kenney_interface/error_002.ogg',
    'assets/audio/ui/kenney_interface/tick_001.ogg',
    'assets/audio/sfx/success/cheer-yay-01.mp3',
    'assets/audio/sfx/failure/fail-sting-01.mp3'
  ]) assert.ok(fs.existsSync(path.join(root,rel)),rel);
  assert.doesNotMatch(html,/게임 목록|게임으로 돌아가기/);
});

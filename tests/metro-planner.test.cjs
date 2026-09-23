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

test('Metro Planner is a canonical high-grade catalog game',()=>{
  const game=catalog.games.find(g=>g.id==='high_metro_planner');
  assert.ok(game);
  assert.equal(game.title,'메트로 플래너');
  assert.equal(game.age,'high');
  assert.equal(game.href,'games/high_metro_planner/메트로 플래너.html?v=1');
  assert.ok(html.length>1000);
});

test('Metro Planner browser source parses and uses registered storage',()=>{
  assert.doesNotThrow(()=>new Function(js));
  assert.match(storage,/metroPlannerSave:\s*'kidscade_metro_planner_v1'/);
  assert.match(js,/KidscadeStorage\?\.setJson\('metroPlannerSave'/);
  assert.doesNotMatch(js,/localStorage\.(?:getItem|setItem|removeItem)/);
});

test('Metro Planner keeps transport simulation and congestion rules in the game',()=>{
  assert.match(js,/function shortestPath\(/);
  assert.match(js,/const transfer=cur\.line!==-1&&cur\.line!==e\.line \? \.52 : 0/);
  assert.match(js,/function segmentCrossesRiver\(/);
  assert.match(js,/if\(s\.queue\.length>=8\)s\.danger\+=dt/);
  assert.match(js,/if\(s\.danger>=14\)/);
  assert.match(js,/Math\.min\(38,6\+1\.5\*m\+\.38\*m\*m\)/);
  assert.match(js,/state\.stations\.length>=16/);
  assert.match(js,/pendingTrim/);
});

test('Metro Planner is touch responsive and reuses local Kidscade audio assets',()=>{
  assert.match(css,/touch-action:none/);
  assert.match(css,/@media\(max-width:760px\)/);
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

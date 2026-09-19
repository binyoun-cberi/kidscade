const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const dir=path.join(root,'games','job_scuba_diver');
const html=fs.readFileSync(path.join(dir,'심해 다이버 시뮬레이터.html'),'utf8');
const css=fs.readFileSync(path.join(dir,'deep-diver-2d.css'),'utf8');
const js=fs.readFileSync(path.join(dir,'diver-v7.js'),'utf8');

test('Deep Diver v8 uses the 2D runtime',()=>{
  assert.match(html,/deep-diver-2d\.css\?v=8/);
  assert.match(html,/diver-v7\.js\?v=8/);
  assert.doesNotMatch(html,/diver-v4\.js/);
  assert.ok(css.length>6000);
  assert.ok(js.length>25000);
});

test('Deep Diver v8 browser runtime parses',()=>{
  const result=spawnSync(process.execPath,['--check',path.join(dir,'diver-v7.js')],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr||result.stdout);
});

test('Deep Diver v8 has core career systems',()=>{
  for(const token of ['산호초 생태 조사','해초 숲 표본 조사','침수 유적 기록','난파선 기록 장치','심해 생물 조사']){
    assert.ok(js.includes(token),token);
  }
  assert.match(js,/function useCamera/);
  assert.match(js,/function fireHarpoon/);
  assert.match(js,/function useSonar/);
  assert.match(js,/function openShop/);
  assert.match(js,/function openCodex/);
  assert.match(js,/function missionComplete/);
});

test('Deep Diver v8 uses tracked underwater, fish and pirate assets',()=>{
  const required=[
    'assets/game/2d/underwater/underwater-diving/player/player-swiming.png',
    'assets/game/2d/underwater/deep-diver/creatures/shark/shark-swim-atlas.png',
    'assets/game/2d/underwater/underwater-diving/enemies/mine.png',
    'assets/game/2d/underwater/underwater-diving/environment/props.png',
    'assets/game/2d/fish/fish_blue.png',
    'assets/game/2d/fish/fish_grey_long_a.png',
    'assets/game/2d/pirate/ships/ship-8.png'
  ];
  for(const rel of required)assert.ok(fs.existsSync(path.join(root,rel)),'missing '+rel);
  assert.match(js,/underwater-diving/);
  assert.match(js,/2d\/fish/);
  assert.match(js,/2d\/pirate/);
  assert.match(js,/deep-diver\/creatures\/shark/);
  assert.match(js,/giant:\{name:'대형 심해 상어',img:'shark',animated:true,fw:32,fh:32,frames:8/);
});

test('Deep Diver v8 supports desktop and touch controls',()=>{
  assert.match(js,/keys\.arrowleft/);
  assert.match(js,/touch\.x/);
  assert.match(html,/id="stick"/);
  assert.match(html,/id="actionMobile"/);
  assert.match(html,/id="dashMobile"/);
  assert.match(css,/100dvh/);
});

test('Deep Diver v8 guarantees mission-critical fish',()=>{
  for(const k of ['blue','orange','dart','long','giant']){
    assert.match(js,new RegExp("makeFish\\('"+k+"'"));
  }
});

test('catalog points to Deep Diver v8',()=>{
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'data','games.json'),'utf8'));
  const game=catalog.games.find(g=>g.id==='job_scuba_diver');
  assert.equal(game.href,'games/job_scuba_diver/심해 다이버 시뮬레이터.html?v=8');
  assert.equal(game.scoreKey,'deep_diver_2d_v7');
});


test('Deep Diver v8 gives every depth band a distinct biome identity',()=>{
  assert.match(js,/tag:'햇빛과 산호 군락'/);
  assert.match(js,/tag:'거대한 해초와 흐르는 조류'/);
  assert.match(js,/tag:'석조 기둥과 가라앉은 회랑'/);
  assert.match(js,/tag:'녹슨 잔해와 기뢰 수역'/);
  assert.match(js,/tag:'빛이 사라진 열수 분출대'/);
  assert.match(js,/function zonePlantPool/);
  assert.match(js,/function drawZoneLandmarks/);
  assert.match(js,/seaweedOrangeA/);
  assert.match(js,/bgSeaA/);
  assert.match(js,/const VENTS=/);
  assert.match(css,/#zoneToast b/);
  assert.match(css,/#zoneToast small/);
});

test('Deep Diver v8 has terrain collision and foreground depth',()=>{
  assert.match(js,/function buildTerrain/);
  assert.match(js,/function resolvePlayerTerrain/);
  assert.match(js,/function drawTerrain/);
  assert.match(js,/function drawForeground/);
  assert.match(js,/world\.terrain\.some/);
  assert.match(js,/drawTerrain\(\).*drawDecor\(\)/s);
  assert.match(js,/drawPlayer\(\).*drawForeground\(\)/s);
  for(const zone of ['reef','kelp','ruins','wreck','abyss'])assert.ok(js.includes(",'"+zone+"'"),zone);
});


test('Deep Diver v8 camera uses the visible photo frame',()=>{
  assert.match(js,/function photoFrameRect/);
  assert.match(js,/getBoundingClientRect/);
  assert.match(js,/cameraLead/);
  assert.match(js,/o\.s\.x>=r\.left/);
});

test('Deep Diver v8 sonar guides off-screen targets',()=>{
  assert.match(js,/function drawSonarGuides/);
  assert.match(js,/function sonarGuideTargets/);
  assert.match(js,/수면 귀환/);
});

test('Deep Diver v8 does not award the contract reward on rescue failure',()=>{
  assert.match(js,/base=ok&&complete\?world\.contract\.reward:0/);
  assert.match(js,/world\.maxDepth\*\(ok\?1\.25:\.25\)/);
});

test('Deep Diver v8 separates collision primitives from visible terrain',()=>{
  assert.match(js,/function terrainTopOffset/);
  assert.doesNotMatch(js,/ctx\.roundRect/);
  assert.match(js,/const pts=14/);
});

test('Deep Diver v8 touch tools fire directly',()=>{
  assert.match(js,/#mActions \[data-tool\]/);
  assert.match(css,/#actionMobile\{display:none!important\}/);
});


test('Deep Diver v8 separates biome ecology and hostile behavior',()=>{
  assert.match(js,/const BIOME_POPULATIONS=/);
  assert.match(js,/reef:\[\['blue',10\]/);
  assert.match(js,/kelp:\[\['green',7\]/);
  assert.match(js,/wreck:\[\['brown',5\]/);
  assert.match(js,/hunter:\{name:'큰이빨 포식어'/);
  assert.match(js,/behavior:'predator'/);
  assert.match(js,/behavior:'ambush'/);
  assert.match(js,/behavior:'territorial'/);
  assert.match(js,/function updateFishAI/);
  assert.match(js,/sense=f\.key==='giant'\?520:360/);
});

test('Deep Diver v8 makes depth itself more dangerous',()=>{
  assert.match(js,/const ZONE_RULES=/);
  assert.match(js,/abyss:\{oxygen:1\.38/);
  assert.match(js,/dashing\?2\.05:1/);
  assert.match(js,/function applyZoneEnvironment/);
  assert.match(js,/const VENTS=/);
  assert.match(js,/열수 분출!/);
  assert.match(js,/drawDangerFX/);
  assert.match(js,/drawBiomeBoundaries/);
});

test('Deep Diver v8 uses the wider vegetation library',()=>{
  for(const token of ['background_seaweed_b.png','background_seaweed_d.png','background_seaweed_e.png','background_seaweed_g.png','background_seaweed_h.png','seaweed_green_d.png','seaweed_pink_d.png']){
    assert.ok(js.includes(token),token);
  }
  assert.match(js,/count=z\.id==='reef'\?62:z\.id==='kelp'\?78/);
});

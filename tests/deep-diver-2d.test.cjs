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

test('Deep Diver v11 uses the 2D runtime',()=>{
  assert.match(html,/deep-diver-2d\.css\?v=11/);
  assert.match(html,/diver-v7\.js\?v=11/);
  assert.doesNotMatch(html,/diver-v4\.js/);
  assert.ok(css.length>6000);
  assert.ok(js.length>25000);
});

test('Deep Diver v11 browser runtime parses',()=>{
  const result=spawnSync(process.execPath,['--check',path.join(dir,'diver-v7.js')],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr||result.stdout);
});

test('Deep Diver v11 has core career systems',()=>{
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

test('Deep Diver v11 uses tracked underwater, fish and pirate assets',()=>{
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

test('Deep Diver v11 supports desktop and touch controls',()=>{
  assert.match(js,/keys\.arrowleft/);
  assert.match(js,/touch\.x/);
  assert.match(html,/id="stick"/);
  assert.match(html,/id="actionMobile"/);
  assert.match(html,/id="dashMobile"/);
  assert.match(css,/100dvh/);
});

test('Deep Diver v11 guarantees mission-critical fish',()=>{
  for(const k of ['blue','orange','pink','long','giant']){
    assert.match(js,new RegExp("makeFish\\('"+k+"'"));
  }
});

test('catalog points to Deep Diver v11',()=>{
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'data','games.json'),'utf8'));
  const game=catalog.games.find(g=>g.id==='job_scuba_diver');
  assert.equal(game.href,'games/job_scuba_diver/심해 다이버 시뮬레이터.html?v=11');
  assert.equal(game.scoreKey,'deep_diver_2d_v7');
});


test('Deep Diver v11 is substantially deeper and wider',()=>{
  assert.match(js,/const WORLD=\{w:6800,h:4200,surface:60,scaleDepth:5\.5\}/);
  assert.match(js,/const SUBZONES=\[/);
  assert.match(js,/expandedCount=Math\.max\(count,Math\.round\(count\*1\.55\)\)/);
  assert.match(js,/name:'포식자 해구'/);
  assert.match(js,/if\(dep>=600\)world\.mission\.deep=true/);
  assert.match(js,/dashTime/);
  assert.match(js,/visited\.reefMaze/);
  assert.match(js,/visited\.currentCut/);
  assert.match(js,/d\.behavior==='predator'\?1\.24/);
});

test('Deep Diver v11 gives every depth band a distinct biome identity',()=>{
  assert.match(js,/tag:'햇빛·산호 절벽·얕은 수로'/);
  assert.match(js,/tag:'거대한 해초·강한 조류·숨은 통로'/);
  assert.match(js,/tag:'석조 회랑·붕괴된 광장·깊은 우물'/);
  assert.match(js,/tag:'선체 잔해·기뢰 골목·화물 구역'/);
  assert.match(js,/tag:'무광층·열수 계곡·포식자 영역'/);
  assert.match(js,/function zonePlantPool/);
  assert.match(js,/function drawZoneLandmarks/);
  assert.match(js,/seaweedOrangeA/);
  assert.match(js,/bgSeaA/);
  assert.match(js,/const VENTS=/);
  assert.match(css,/#zoneToast b/);
  assert.match(css,/#zoneToast small/);
});

test('Deep Diver v11 has terrain collision and foreground depth',()=>{
  assert.match(js,/function buildTerrain/);
  assert.match(js,/function resolvePlayerTerrain/);
  assert.match(js,/function drawTerrain/);
  assert.match(js,/function drawForeground/);
  assert.match(js,/world\.terrain\.some/);
  assert.match(js,/drawTerrain\(\).*drawDecor\(\)/s);
  assert.match(js,/drawPlayer\(\).*drawForeground\(\)/s);
  for(const zone of ['reef','kelp','ruins','wreck','abyss'])assert.ok(js.includes(",'"+zone+"'"),zone);
});


test('Deep Diver v11 makes oxygen a return-planning resource',()=>{
  assert.match(js,/function oxygenReserveStatus/);
  assert.match(js,/귀환 산소가 빠듯합니다/);
  assert.match(js,/귀환 산소 위험 · 지금 상승하세요/);
  assert.match(html,/id="reserveText"/);
  assert.match(css,/reserve-critical/);
});

test('Deep Diver v11 uses edge-triggered burst dash',()=>{
  assert.match(js,/dashInput=!!\(keys\.shift\|\|touch\.dash\)/);
  assert.match(js,/dashPressed=dashInput&&!p\.dashHeld&&len>\.1/);
  assert.match(js,/p\.dashHeld=dashInput/);
});

test('Deep Diver v11 turns photo grades into research rewards',()=>{
  assert.match(js,/const PHOTO_MULT=/);
  assert.match(js,/function photoValue/);
  assert.match(js,/world\.photoIncome\+=bonus/);
  assert.match(js,/예상 '\+photoGrade\(t\)\+'등급/);
  assert.match(js,/gradeAtLeast\(m\.photoGrades\.long,'A'\)/);
});

test('Deep Diver v11 harpoon aims freely and reels hooked fish',()=>{
  assert.match(js,/aimX:1,aimY:0/);
  assert.match(js,/p\.aimX=ix;p\.aimY=iy/);
  assert.match(js,/vy:uy\*speed/);
  assert.match(js,/function hookFish/);
  assert.match(js,/function updateTether/);
  assert.match(js,/function reelHarpoon/);
  assert.match(js,/작살 줄이 끊어졌습니다/);
  assert.match(js,/drawTether/);
});

test('Deep Diver v11 softly gates depth by contract and suit rating',()=>{
  assert.match(js,/const CONTRACT_DEPTH_RATING=\[150,285,430,575,760\]/);
  assert.match(js,/function ratedDepth/);
  assert.match(js,/meta\.up\.suit\*22/);
  assert.match(js,/function applyDepthPressure/);
  assert.match(js,/수압 한계 초과/);
  assert.match(js,/class="depthRating"/);
});

test('Deep Diver v11 camera uses the visible photo frame',()=>{
  assert.match(js,/function photoFrameRect/);
  assert.match(js,/getBoundingClientRect/);
  assert.match(js,/cameraLead/);
  assert.match(js,/o\.s\.x>=r\.left/);
});

test('Deep Diver v11 sonar guides off-screen targets',()=>{
  assert.match(js,/function drawSonarGuides/);
  assert.match(js,/function sonarGuideTargets/);
  assert.match(js,/수면 귀환/);
});

test('Deep Diver v11 requires safe return for all economic rewards',()=>{
  assert.match(js,/base=ok&&complete\?world\.contract\.reward:0/);
  assert.match(js,/depthBonus=ok\?Math\.round\(world\.maxDepth\*1\.25\):0/);
  assert.match(js,/gain=ok\?Math\.max\(0,world\.income\+base\+depthBonus\+survival\):0/);
  assert.match(js,/구조 시 현장 표본·유물·사진 연구 보상은 회수되지 않습니다/);
});

test('Deep Diver v11 separates collision primitives from visible terrain',()=>{
  assert.match(js,/function terrainTopOffset/);
  assert.doesNotMatch(js,/ctx\.roundRect/);
  assert.match(js,/const pts=14/);
});

test('Deep Diver v11 touch tools fire directly',()=>{
  assert.match(js,/#mActions \[data-tool\]/);
  assert.match(css,/#actionMobile\{display:none!important\}/);
});


test('Deep Diver v11 has living ecology and species-specific attack states',()=>{
  assert.match(js,/const ATTACK_PROFILE=/);
  for(const token of ["brown:{sense:205","dart:{sense:285","angler:{sense:265","hunter:{sense:390","giant:{sense:590"])assert.ok(js.includes(token),token);
  assert.match(js,/function nearestEcoFish/);
  assert.match(js,/function nearestKelpCover/);
  assert.match(js,/school fish actually align\/cohere\/separate/);
  assert.match(js,/nearestEcoFish\(f,f\.key==='giant'\?430:285/);
  assert.match(js,/attackMode='windup'/);
  assert.match(js,/attackMode='lunge'/);
  assert.match(js,/function launchFishAttack/);
  assert.match(js,/world\.lightJam=Math\.max/);
  assert.match(js,/type:'wake'/);
});

test('Deep Diver v11 makes biome hazards demand active navigation',()=>{
  assert.match(js,/sub\.id==='currentCut'/);
  assert.match(js,/world\.currentBurst/);
  assert.match(js,/other\.fuse=\.18/);
  assert.match(js,/d<125\*sc&&burst>\.68/);
  assert.match(js,/p\.vy-=130/);
});

test('Deep Diver v11 reef contract stays inside reef ecology and requires photo quality',()=>{
  assert.match(js,/청색 암초어·주황 산호어·분홍 산호어를 각각 B등급 이상/);
  assert.match(js,/\['blue','orange','pink'\]\.every\(k=>gradeAtLeast\(m\.photoGrades\[k\],'B'\)\)/);
  assert.doesNotMatch(js,/m\.photos\.blue&&m\.photos\.orange&&m\.photos\.dart/);
});

test('Deep Diver v11 separates biome ecology and hostile behavior',()=>{
  assert.match(js,/const BIOME_POPULATIONS=/);
  assert.match(js,/reef:\[\['blue',10\]/);
  assert.match(js,/kelp:\[\['green',7\]/);
  assert.match(js,/wreck:\[\['brown',8\]/);
  assert.match(js,/hunter:\{name:'큰이빨 포식어'/);
  assert.match(js,/behavior:'predator'/);
  assert.match(js,/behavior:'ambush'/);
  assert.match(js,/behavior:'territorial'/);
  assert.match(js,/function updateFishAI/);
  assert.match(js,/const ATTACK_PROFILE=/);
  assert.match(js,/giant:\{sense:590/);
  assert.match(js,/hunter:\{sense:390/);
});

test('Deep Diver v11 makes depth itself more dangerous',()=>{
  assert.match(js,/const ZONE_RULES=/);
  assert.match(js,/abyss:\{oxygen:1\.52/);
  assert.match(js,/pressureBurn=1\+Math\.min\(1\.15,world\.pressureOver\/150\*\.52\)/);
  assert.match(js,/function applyZoneEnvironment/);
  assert.match(js,/const VENTS=/);
  assert.match(js,/열수 분출!/);
  assert.match(js,/drawDangerFX/);
  assert.match(js,/drawBiomeBoundaries/);
});

test('Deep Diver v11 uses the wider vegetation library',()=>{
  for(const token of ['background_seaweed_b.png','background_seaweed_d.png','background_seaweed_e.png','background_seaweed_g.png','background_seaweed_h.png','seaweed_green_d.png','seaweed_pink_d.png']){
    assert.ok(js.includes(token),token);
  }
  assert.match(js,/count=z\.id==='reef'\?110:z\.id==='kelp'\?145/);
});

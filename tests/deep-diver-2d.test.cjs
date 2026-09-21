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

test('Deep Diver v15 uses the 2D runtime',()=>{
  assert.match(html,/deep-diver-2d\.css\?v=14/);
  assert.match(html,/diver-v7\.js\?v=18/);
  assert.doesNotMatch(html,/diver-v4\.js/);
  assert.ok(css.length>6000);
  assert.ok(js.length>25000);
});

test('Deep Diver v15 browser runtime parses',()=>{
  const result=spawnSync(process.execPath,['--check',path.join(dir,'diver-v7.js')],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr||result.stdout);
});

test('Deep Diver v15 has core career systems',()=>{
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

test('Deep Diver v15 uses tracked underwater, fish and pirate assets',()=>{
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

test('Deep Diver v15 connects the uploaded fauna library',()=>{
  const required=[
    'assets/game/2d/underwater/deep-diver/creatures/crustaceans/crab/frames/crab-walk-01.png',
    'assets/game/2d/underwater/deep-diver/creatures/crustaceans/mantis-shrimp/mantis-shrimp-2x.png',
    'assets/game/2d/underwater/deep-diver/creatures/echinoderms/purple-sea-urchin.png',
    'assets/game/2d/underwater/deep-diver/creatures/echinoderms/ochre-sea-star.png',
    'assets/game/2d/underwater/deep-diver/creatures/echinoderms/crown-of-thorns-starfish.png',
    'assets/game/2d/underwater/deep-diver/creatures/mollusks/nautilus/nautilus.png',
    'assets/game/2d/underwater/deep-diver/creatures/cephalopods/squid/squid-sprites.png',
    'assets/game/2d/underwater/deep-diver/creatures/cephalopods/kraken/kraken-anim.gif',
    'assets/game/2d/underwater/deep-diver/creatures/cnidarians/jellyfish/swim/jellyfish-swim-12.png',
    'assets/game/2d/underwater/deep-diver/creatures/cnidarians/jellyfish/attack/jellyfish-attack-12.png',
    'assets/game/2d/underwater/deep-diver/creatures/megafauna/whale/whale.png',
    'assets/game/2d/underwater/deep-diver/creatures/megafauna/vaquita/vaquita-porpoise.png',
    'assets/game/2d/underwater/deep-diver/creatures/shark/variants/shark-001-64px.gif'
  ];
  for(const rel of required)assert.ok(fs.existsSync(path.join(root,rel)),'missing '+rel);
  assert.match(js,/const FAUNA=/);
  assert.match(js,/crustaceans\/crab\/frames\/crab-walk-01\.png/);
  assert.match(js,/cephalopods\/kraken\/kraken-anim\.gif/);
  assert.match(js,/megafauna\/vaquita\/vaquita-porpoise\.png/);
});

test('Deep Diver v15 has non-fish ecological movement classes',()=>{
  for(const token of [
    "crab:{name:'바위게'",
    "urchin:{name:'보라성게'",
    "nautilus:{name:'앵무조개'",
    "squid:{name:'심해 오징어'",
    "jelly:{name:'푸른 해파리'",
    "whale:{name:'대형 고래'",
    "vaquita:{name:'바키타'",
    "shark2:{name:'회유성 상어'"
  ])assert.ok(js.includes(token),token);
  assert.match(js,/motion:'crawler'/);
  assert.match(js,/motion:'sessile'/);
  assert.match(js,/motion:'drifter'/);
  assert.match(js,/motion:'jelly'/);
  assert.match(js,/motion:'jet'/);
  assert.match(js,/motion:'megafauna'/);
  assert.match(js,/function drawSequence/);
  assert.match(js,/JELLY_ATTACK_KEYS/);
});

test('Deep Diver v15 places fauna by biome and curated subzone encounters',()=>{
  assert.match(js,/const FAUNA_POPULATIONS=/);
  assert.match(js,/reef:\[\['crab',8\]/);
  assert.match(js,/kelp:\[\['crab',5\],\['nautilus',4\],\['jelly',7\]/);
  assert.match(js,/const encounters=\[/);
  assert.match(js,/\['nautilus',2140,980,19311\]/);
  assert.match(js,/\['shark2',6040,3100,19333\]/);
});

test('Deep Diver v15 adds mantis shrimp and kraken boss encounters',()=>{
  assert.match(js,/mantis:\{name:'공작갯가재'/);
  assert.match(js,/kraken:\{name:'심해 크라켄'/);
  assert.match(js,/mantis:\{sense:180/);
  assert.match(js,/kraken:\{sense:690/);
  assert.match(js,/spawnCreature\('mantis',WORLD\.w\*\.61,455,19401,'reefMaze'\)/);
  assert.match(js,/spawnCreature\('kraken',WORLD\.w\*\.53,4015,19402,'predatorTrench'\)/);
  assert.match(js,/대형 공작갯가재 발견/);
  assert.match(js,/심해 크라켄/);
  assert.match(js,/대형 개체 · /);
});

test('Deep Diver v15 connects rendered salvage, vegetation and ambience assets',()=>{
  const required=[
    'assets/game/2d/underwater/deep-diver/pickups/icons_128/bucket.png',
    'assets/game/2d/underwater/deep-diver/pickups/icons_128/fishingrod.png',
    'assets/game/2d/underwater/deep-diver/pickups/icons_128/gold.png',
    'assets/game/2d/underwater/deep-diver/pickups/icons_128/key.png',
    'assets/game/2d/underwater/deep-diver/pickups/icons_128/ruby.png',
    'assets/game/2d/underwater/deep-diver/pickups/icons_128/saphire.png',
    'assets/game/2d/underwater/deep-diver/pickups/icons_128/seashell.png',
    'assets/game/2d/underwater/deep-diver/pickups/icons_128/silvercup.png',
    'assets/game/2d/underwater/deep-diver/pickups/icons_128/silverplate.png',
    'assets/game/2d/underwater/deep-diver/pickups/icons_128/telescope.png',
    'assets/game/2d/underwater/deep-diver/pickups/icons_128/tincan.png',
    'assets/game/2d/underwater/deep-diver/pickups/icons_128/trout.png',
    'assets/game/2d/underwater/deep-diver/vegetation/water-plant-02.png',
    'assets/game/2d/underwater/deep-diver/vegetation/grass-clump-01.png',
    'assets/audio/incoming/newmusical/dragon-studio-underwater-ambience-376890.mp3'
  ];
  for(const rel of required)assert.ok(fs.existsSync(path.join(root,rel)),'missing '+rel);
  assert.match(js,/const PICKUP=/);
  assert.match(js,/const VEG=/);
  assert.match(js,/const AMBIENCE_SRC=/);
  assert.match(js,/pickupGold:PICKUP\+'gold\.png'/);
  assert.match(js,/waterPlant2:VEG\+'water-plant-02\.png'/);
});

test('Deep Diver v15 renders salvage icons instead of placeholder rectangles',()=>{
  assert.match(js,/icon:'pickupKey'/);
  assert.match(js,/icon:'pickupTelescope'/);
  assert.match(js,/icon:'pickupRuby'/);
  assert.match(js,/icon:'pickupSaphire'/);
  assert.match(js,/icon:'pickupGold'/);
  assert.match(js,/im=q\.icon\?imgs\[q\.icon\]:null/);
  assert.match(js,/drawImg\(im,p\.x,p\.y\+bob,size,size/);
  assert.match(js,/큰 조개껍데기/);
  assert.match(js,/은제 잔/);
  assert.match(js,/녹슨 통조림/);
});

test('Deep Diver v15 uses the new vegetation in habitats and cover logic',()=>{
  assert.match(js,/waterPlant2/);
  assert.match(js,/grassClump/);
  assert.match(js,/d\.type==='waterPlant2'/);
  assert.match(js,/d\.type==='grassClump'/);
  assert.match(js,/type:'waterPlant2'/);
  assert.match(js,/type:'grassClump'/);
});

test('Deep Diver v15 loops underwater ambience only during active dives',()=>{
  assert.match(js,/function ensureAmbience/);
  assert.match(js,/ambience\.loop=true/);
  assert.match(js,/ambience\.volume=\.20/);
  assert.match(js,/function syncAmbience/);
  assert.match(js,/sound&&state==='playing'&&!document\.hidden/);
  assert.match(js,/syncAmbience\(\)/);
  assert.match(js,/dragon-studio-underwater-ambience-376890\.mp3/);
});

test('Deep Diver v15 stabilizes creature spawn placement',()=>{
  assert.match(js,/function creatureSpawnPad/);
  assert.match(js,/function safeCreatureSpawn/);
  assert.match(js,/function spawnCreature/);
  assert.match(js,/spawnBlocked/);
  assert.match(js,/spawnCreature\('mantis',WORLD\.w\*\.61,455,19401,'reefMaze'\)/);
  assert.match(js,/spawnCreature\('kraken',WORLD\.w\*\.53,4015,19402,'predatorTrench'\)/);
  assert.match(js,/spawnCreature\('giant',WORLD\.w\*\.74,3920,9921,'predatorTrench'\)/);
});

test('Deep Diver v15 prevents patrol direction thrashing',()=>{
  assert.match(js,/patrolDir:dir/);
  assert.match(js,/faceDir:dir/);
  assert.match(js,/turnLock:0/);
  assert.match(js,/if\(f\.x>=right&&f\.patrolDir>0\)/);
  assert.match(js,/if\(f\.x<=left&&f\.patrolDir<0\)/);
  assert.doesNotMatch(js,/Math\.abs\(f\.x-f\.homeX\)>230\)f\.vx=-dir/);
  assert.match(js,/f\.turnLock<=0/);
});

test('Deep Diver v15 respects source sprite facing for megafauna',()=>{
  assert.match(js,/whale:\{[^\n]*spriteFacing:'left'/);
  assert.match(js,/vaquita:\{[^\n]*spriteFacing:'left'/);
  assert.match(js,/flip=sp\.spriteFacing==='left'\?dir>0:dir<0/);
});

test('Deep Diver v15 recovers creatures cleanly from terrain collisions',()=>{
  assert.match(js,/const prevX=f\.x,prevY=f\.y/);
  assert.match(js,/f\.x=prevX;f\.y=prevY/);
  assert.match(js,/safeCreatureSpawn\(f\.key,f\.homeX,f\.baseY/);
  assert.match(js,/hitDist=Math\.hypot\(p\.x-f\.x,p\.y-f\.y\)/);
});

test('Deep Diver v15 supports desktop and touch controls',()=>{
  assert.match(js,/keys\.arrowleft/);
  assert.match(js,/touch\.x/);
  assert.match(html,/id="stick"/);
  assert.match(html,/id="actionMobile"/);
  assert.match(html,/id="dashMobile"/);
  assert.match(css,/100dvh/);
});

test('Deep Diver v15 guarantees mission-critical fish through safe spawning',()=>{
  for(const k of ['blue','orange','pink','long','giant']){
    assert.match(js,new RegExp("spawnCreature\\('"+k+"'"));
  }
});

test('catalog points to Deep Diver v15',()=>{
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'data','games.json'),'utf8'));
  const game=catalog.games.find(g=>g.id==='job_scuba_diver');
  assert.equal(game.href,'games/job_scuba_diver/심해 다이버 시뮬레이터.html?v=19');
  assert.equal(game.scoreKey,'deep_diver_2d_v7');
});


test('Deep Diver v15 is substantially deeper and wider',()=>{
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

test('Deep Diver v15 gives every depth band a distinct biome identity',()=>{
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

test('Deep Diver v15 has terrain collision and foreground depth',()=>{
  assert.match(js,/function buildTerrain/);
  assert.match(js,/function resolvePlayerTerrain/);
  assert.match(js,/function drawTerrain/);
  assert.match(js,/function drawForeground/);
  assert.match(js,/world\.terrain\.some/);
  assert.match(js,/drawTerrain\(\).*drawDecor\(\)/s);
  assert.match(js,/drawPlayer\(\).*drawForeground\(\)/s);
  for(const zone of ['reef','kelp','ruins','wreck','abyss'])assert.ok(js.includes(",'"+zone+"'"),zone);
});


test('Deep Diver v15 gives all fifteen subzones unique gameplay rules',()=>{
  for(const id of [
    'reefShelf','reefMaze','blueDrop',
    'kelpEdge','kelpCathedral','currentCut',
    'ruinGate','ruinCourt','ruinWell',
    'wreckOuter','mineLane','cargoGrave',
    'blackwater','ventValley','predatorTrench'
  ])assert.match(js,new RegExp(id+":\\{"),id);
  assert.match(js,/photo:1\.15/);
  assert.match(js,/terrainHazard:'coral'/);
  assert.match(js,/rarePhoto:1\.20/);
  assert.match(js,/speed:\.90/);
  assert.match(js,/stealth:\.62/);
  assert.match(js,/surge:true/);
  assert.match(js,/dashSilt:true/);
  assert.match(js,/sonarRecharge:1\.55/);
  assert.match(js,/oxygen:1\.12/);
  assert.match(js,/terrainHazard:'debris'/);
  assert.match(js,/magneticMines:true/);
  assert.match(js,/salvage:true/);
  assert.match(js,/photoPenalty:\.14/);
  assert.match(js,/thermal:true/);
  assert.match(js,/sonarAggro:true/);
});

test('Deep Diver v15 exposes subzone mechanics through HUD and entry feedback',()=>{
  assert.match(js,/const subRuleForY=/);
  assert.match(js,/sr\.short/);
  assert.match(js,/SUBZONE_RULES\[sub\.id\]\?\.tip/);
  assert.match(js,/function drawSubzoneFX/);
  assert.match(js,/drawSubzoneFX\(\)/);
});

test('Deep Diver v15 links subzone risk and reward systems',()=>{
  assert.match(js,/applySubzoneTerrainHazard/);
  assert.match(js,/subRule\.oxygen\|\|1/);
  assert.match(js,/subRule\.sonarRecharge>1/);
  assert.match(js,/sub\.id==='mineLane'/);
  assert.match(js,/소나 펄스가 포식자에게 들켰습니다/);
  assert.match(js,/루비 화물/);
  assert.match(js,/열수 광물 표본/);
  assert.match(js,/world\.silt/);
  assert.match(js,/world\.thermalLift/);
});

test('Deep Diver v15 makes oxygen a return-planning resource',()=>{
  assert.match(js,/function oxygenReserveStatus/);
  assert.match(js,/귀환 산소가 빠듯합니다/);
  assert.match(js,/귀환 산소 위험 · 지금 상승하세요/);
  assert.match(html,/id="reserveText"/);
  assert.match(css,/reserve-critical/);
});

test('Deep Diver v15 uses edge-triggered burst dash',()=>{
  assert.match(js,/dashInput=!!\(keys\.shift\|\|touch\.dash\)/);
  assert.match(js,/dashPressed=dashInput&&!p\.dashHeld&&len>\.1/);
  assert.match(js,/p\.dashHeld=dashInput/);
});

test('Deep Diver v15 turns photo grades into research rewards',()=>{
  assert.match(js,/const PHOTO_MULT=/);
  assert.match(js,/function photoValue/);
  assert.match(js,/world\.photoIncome\+=bonus/);
  assert.match(js,/예상 '\+photoGrade\(t\)\+'등급/);
  assert.match(js,/gradeAtLeast\(m\.photoGrades\.long,'A'\)/);
});

test('Deep Diver v15 harpoon aims freely and reels hooked fish',()=>{
  assert.match(js,/aimX:1,aimY:0/);
  assert.match(js,/p\.aimX=ix;p\.aimY=iy/);
  assert.match(js,/vy:uy\*speed/);
  assert.match(js,/function hookFish/);
  assert.match(js,/function updateTether/);
  assert.match(js,/function reelHarpoon/);
  assert.match(js,/작살 줄이 끊어졌습니다/);
  assert.match(js,/drawTether/);
});

test('Deep Diver v18 softly gates free-dive depth by suit rating',()=>{
  assert.match(js,/const CONTRACT_DEPTH_RATING=\[150,285,430,575,760\]/);
  assert.match(js,/function ratedDepth/);
  assert.match(js,/170\+\(meta\.up\.suit\|\|0\)\*115/);
  assert.match(js,/function applyDepthPressure/);
  assert.match(js,/수압 한계 초과/);
  assert.match(js,/class="depthRating"/);
});
test('Deep Diver v15 camera uses the visible photo frame',()=>{
  assert.match(js,/function photoFrameRect/);
  assert.match(js,/getBoundingClientRect/);
  assert.match(js,/cameraLead/);
  assert.match(js,/o\.s\.x>=r\.left/);
});

test('Deep Diver v15 sonar guides off-screen targets',()=>{
  assert.match(js,/function drawSonarGuides/);
  assert.match(js,/function sonarGuideTargets/);
  assert.match(js,/탐사선 · 귀환/);
});

test('Deep Diver v15 requires safe return for all economic rewards',()=>{
  assert.match(js,/base=ok&&complete\?world\.contract\.reward:0/);
  assert.match(js,/depthBonus=ok\?Math\.round\(world\.maxDepth\*1\.25\):0/);
  assert.match(js,/gain=ok\?Math\.max\(0,world\.income\+base\+depthBonus\+survival\):0/);
  assert.match(js,/구조 시 인양 보상과 오늘 잡은 식재료는 회수되지 않습니다/);
});

test('Deep Diver v15 separates collision primitives from visible terrain',()=>{
  assert.match(js,/function terrainTopOffset/);
  assert.doesNotMatch(js,/ctx\.roundRect/);
  assert.match(js,/const pts=14/);
});

test('Deep Diver v15 touch tools fire directly',()=>{
  assert.match(js,/#mActions \[data-tool\]/);
  assert.match(css,/#actionMobile\{display:none!important\}/);
});


test('Deep Diver v15 has living ecology and species-specific attack states',()=>{
  assert.match(js,/const ATTACK_PROFILE=/);
  for(const token of ["brown:{sense:205","dart:{sense:285","angler:{sense:265","hunter:{sense:390","giant:{sense:590"])assert.ok(js.includes(token),token);
  assert.match(js,/function nearestEcoFish/);
  assert.match(js,/function nearestKelpCover/);
  assert.match(js,/school fish actually align\/cohere\/separate/);
  assert.match(js,/nearestEcoFish\(f,f\.key==='giant'\|\|f\.key==='kraken'\?430:285/);
  assert.match(js,/attackMode='windup'/);
  assert.match(js,/attackMode='lunge'/);
  assert.match(js,/function launchFishAttack/);
  assert.match(js,/world\.lightJam=Math\.max/);
  assert.match(js,/type:'wake'/);
});

test('Deep Diver v15 makes biome hazards demand active navigation',()=>{
  assert.match(js,/currentCut:\{[^\n]*surge:true/);
  assert.match(js,/world\.currentBurst/);
  assert.match(js,/other\.fuse=\.18/);
  assert.match(js,/d<125\*sc&&burst>\.68/);
  assert.match(js,/p\.vy-=130/);
});

test('Deep Diver v15 reef contract stays inside reef ecology and requires photo quality',()=>{
  assert.match(js,/청색 암초어·주황 산호어·분홍 산호어를 각각 B등급 이상/);
  assert.match(js,/\['blue','orange','pink'\]\.every\(k=>gradeAtLeast\(m\.photoGrades\[k\],'B'\)\)/);
  assert.doesNotMatch(js,/m\.photos\.blue&&m\.photos\.orange&&m\.photos\.dart/);
});

test('Deep Diver v15 separates biome ecology and hostile behavior',()=>{
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

test('Deep Diver v15 makes depth itself more dangerous',()=>{
  assert.match(js,/const ZONE_RULES=/);
  assert.match(js,/abyss:\{oxygen:1\.52/);
  assert.match(js,/pressureBurn=1\+Math\.min\(1\.15,world\.pressureOver\/150\*\.52\)/);
  assert.match(js,/function applyZoneEnvironment/);
  assert.match(js,/const VENTS=/);
  assert.match(js,/열수 분출!/);
  assert.match(js,/drawDangerFX/);
  assert.match(js,/drawBiomeBoundaries/);
});

test('Deep Diver v15 uses the wider vegetation library',()=>{
  for(const token of ['background_seaweed_b.png','background_seaweed_d.png','background_seaweed_e.png','background_seaweed_g.png','background_seaweed_h.png','seaweed_green_d.png','seaweed_pink_d.png']){
    assert.ok(js.includes(token),token);
  }
  assert.match(js,/count=z\.id==='reef'\?110:z\.id==='kelp'\?145/);
});


test('Deep Diver v16 fixes the opaque shark variant and adds a day-night restaurant loop',()=>{
  assert.match(html,/id="restaurantScreen"/);
  assert.match(html,/FREE DIVE \/ TYCOON BY NIGHT/);
  assert.match(js,/shark2:SHARK\+'shark-swim-atlas\.png'/);
  assert.match(js,/shark2:\{name:'회유성 상어',img:'shark2',animated:true,fw:32,fh:32,frames:8/);
  assert.doesNotMatch(js,/shark2:FAUNA\+'shark\/variants\/shark-001-64px\.gif'/);
  assert.match(js,/const RECIPES=\[/);
  assert.match(js,/function startRestaurant/);
  assert.match(js,/function serveRestaurant/);
  assert.match(js,/function finishRestaurant/);
  assert.match(js,/world\.catchCounts\[f\.key\]/);
  assert.match(js,/meta\.stock\[key\]/);
  assert.match(js,/밤 장사 시작/);
  assert.match(css,/\.recipeGrid/);
  assert.match(css,/\.restaurantOrder/);
});


test('Deep Diver v17 turns night service into an active mini tycoon',()=>{
  assert.match(html,/TYCOON BY NIGHT/);
  assert.match(js,/const CUSTOMER_SPRITES=\[/);
  assert.match(js,/female\/poses\/female-stand\.png/);
  assert.match(js,/function spawnRestaurantCustomer/);
  assert.match(js,/function tickRestaurant/);
  assert.match(js,/function selectRestaurantCustomer/);
  assert.match(js,/function startRestaurantPrep/);
  assert.match(js,/function stopRestaurantPrep/);
  assert.match(js,/function stopRestaurantCook/);
  assert.match(js,/function serveRestaurantDish/);
  assert.match(js,/patience/);
  assert.match(js,/restaurantTimingScore/);
  assert.match(css,/\.diningRoom/);
  assert.match(css,/\.tycoonSeat/);
  assert.match(css,/\.timingBar/);
  assert.match(css,/\.customerSprite/);
});

test('Deep Diver v18 makes exploration missions optional and returns through the surface boat',()=>{
  assert.match(js,/const FREE_DIVE=\{/);
  assert.match(js,/의뢰는 완전히 선택 사항입니다/);
  assert.match(js,/function drawBoat/);
  assert.match(js,/dinghy-large2\.png/);
  assert.match(js,/탐사선으로 돌아와 오늘의 낮 탐사를 마쳤습니다/);
  assert.doesNotMatch(js,/if\(p\.y<WORLD\.surface\+45&&missionComplete\(\)/);
  assert.match(html,/선착장 · 오늘의 출항 준비/);
});

test('Deep Diver v18 has a low upgradeable daily catch weight',()=>{
  assert.match(js,/const CATCH_CAP_LEVELS=\[4,7,11,16,22,30\]/);
  assert.match(js,/catchCap:\{name:'선상 냉장 어획함'/);
  assert.match(js,/world\.catchWeight\+weight>world\.st\.catchCap/);
  assert.match(html,/오늘 어획/);
});

test('Deep Diver v18 has loadout capture tools with colored gear tiers',()=>{
  for(const token of ["harpoon:{name:'작살'","net:{name:'그물'","gloves:{name:'철제 장갑'","knife:{name:'채집칼'","trap:{name:'통발'"]) assert.ok(js.includes(token),token);
  assert.match(js,/const GEAR_TIER_COLORS=/);
  assert.match(js,/function gearLoadoutCards/);
  assert.match(js,/function useNet/);
  assert.match(js,/function useGloves/);
  assert.match(js,/function useKnife/);
  assert.match(js,/function useTrap/);
  assert.match(css,/\.gearCard/);
  assert.match(html,/data-tool="net"/);
  assert.match(html,/data-tool="gloves"/);
});

test('Deep Diver v18 harvests sea plants and shellfish for richer recipes',()=>{
  for(const token of ["seaweed:{name:'미역'","kelp:{name:'다시마'","redAlgae:{name:'붉은 해조'","seaLettuce:{name:'바다상추'","mussel:{name:'홍합'"]) assert.ok(js.includes(token),token);
  assert.match(js,/function buildHarvestables/);
  assert.match(js,/function drawHarvestables/);
  assert.match(js,/name:'성게 해초 덮밥'/);
  assert.match(js,/name:'홍합 다시마 국'/);
  assert.match(js,/name:'오징어 붉은해조 무침'/);
  assert.match(js,/groups:\[\['mussel'\],\['kelp','seaweed'\]\]/);
});

test('Deep Diver v18 adds restaurant and expedition upgrade trees',()=>{
  for(const key of ['seats','stove','prep','fridge','tray','menu','helper']) assert.ok(js.includes(key+':{name:'),key);
  assert.match(js,/slots:\{name:'채집 장비 랙'/);
  assert.match(js,/function shopUpCost/);
  assert.match(js,/function gearUpCost/);
  assert.match(js,/restaurantSeatCount/);
  assert.match(js,/meta\.shopUp\.stove/);
  assert.match(js,/meta\.shopUp\.prep/);
});

test('Deep Diver v18 links existing cooking assets',()=>{
  const required=[
    'assets/game/food/fish.glb',
    'assets/game/food/mussel.glb',
    'assets/game/3d/interiors/modular-sushi-restaurant-kit/sea-urchin-open.glb',
    'assets/game/3d/interiors/modular-sushi-restaurant-kit/squid.glb',
    'assets/game/3d/interiors/modular-sushi-restaurant-kit/ramen.glb',
    'assets/game/3d/interiors/modular-sushi-restaurant-kit/plate.glb',
    'assets/game/3d/interiors/modular-sushi-restaurant-kit/pan.glb'
  ];
  for(const rel of required) assert.ok(fs.existsSync(path.join(root,rel)),'missing '+rel);
  assert.match(js,/const COOK_ASSETS=\{/);
  assert.match(js,/sea-urchin-open\.glb/);
  assert.match(css,/\.ingredientSprite/);
});


test('Deep Diver v19 consumes generated four-frame creature strips without pre-cut PNG files',()=>{
  assert.match(js,/const GEN_FAUNA=FAUNA\+'generated\/'/);
  assert.match(js,/function trimmedStripFrames/);
  assert.match(js,/getImageData\(0,0,iw,ih\)/);
  assert.match(js,/function drawTrimmedStrip/);
  assert.match(js,/if\(sp\.stripFrames\)drawTrimmedStrip/);
  for(const key of ['barracuda','giantIsopod','bream','cuttlefish','hermitCrab','moonJelly','lionfish','manta','moray','octopus','puffer','scallop','seaCucumber','seahorse','coelacanth','skate','starfishStrip']) assert.match(js,new RegExp(key+":\\{name:"),key);
});

test('Deep Diver v19 generated species are distributed across all five biomes',()=>{
  assert.match(js,/reef:\[.*\['bream',5\].*\['seahorse',2\]/);
  assert.match(js,/kelp:\[.*\['barracuda',3\].*\['manta',1\]/);
  assert.match(js,/ruins:\[.*\['moray',3\].*\['scallop',4\]/);
  assert.match(js,/wreck:\[.*\['giantIsopod',2\]/);
  assert.match(js,/abyss:\[.*\['coelacanth',3\].*\['giantIsopod',5\]/);
});

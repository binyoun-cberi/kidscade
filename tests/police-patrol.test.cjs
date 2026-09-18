const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const dir=path.join(root,'games','job_police_car');
const html=fs.readFileSync(path.join(dir,'경찰차 시뮬레이터.html'),'utf8');
const css=fs.readFileSync(path.join(dir,'police-patrol.css'),'utf8');
const js=fs.readFileSync(path.join(dir,'police-patrol.js'),'utf8');
const rootEntry=fs.readFileSync(path.join(root,'경찰차 시뮬레이터.html'),'utf8');
const assetRoot=path.join(root,'assets','game','2d','racing','kenney-racing-pack');

test('Police Patrol is split into a reusable runtime',()=>{
  assert.match(html,/police-patrol\.css\?v=2/);
  assert.match(html,/police-patrol\.js\?v=2/);
  assert.match(html,/audio-manager\.js/);
  assert.match(rootEntry,/games\/job_police_car\/police-patrol\.css\?v=2/);
  assert.match(rootEntry,/games\/job_police_car\/police-patrol\.js\?v=2/);
  assert.doesNotMatch(rootEntry,/location\.replace|http-equiv="refresh"/i);
  assert.ok(css.length>5000);
  assert.ok(js.length>18000);
});

test('Police Patrol browser script parses',()=>{
  const result=spawnSync(process.execPath,['--check',path.join(dir,'police-patrol.js')],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr||result.stdout);
});

test('Police Patrol uses tracked Kenney racing assets',()=>{
  const required=[
    'cars/car_blue_1.png','cars/car_red_2.png','cars/car_black_1.png',
    'objects/lights.png','objects/cone_straight.png','objects/barrier_red.png',
    'objects/tree_large.png','objects/tree_small.png','objects/skidmark_long_1.png',
    'tiles/grass/land_grass01.png','tiles/asphalt-road/road_asphalt01.png','LICENSE.txt'
  ];
  for(const rel of required){
    assert.ok(fs.existsSync(path.join(assetRoot,rel)),'missing '+rel);
    if(rel!=='LICENSE.txt')assert.ok(js.includes(rel.split('/').pop()),'runtime does not reference '+rel);
  }
  assert.match(js,/kenney-racing-pack/);
  assert.doesNotMatch(html+css+js,/https?:\/\//i);
});

test('Police Patrol uses real sprites for police, traffic and incident props',()=>{
  assert.match(js,/police:ROOT\+'cars\/car_blue_1\.png'/);
  assert.match(js,/suspect:ROOT\+'cars\/car_red_2\.png'/);
  assert.match(js,/drawSprite\(A\.lights/);
  assert.match(js,/drawSprite\(A\.cone/);
  assert.match(js,/drawSprite\(A\.barrier/);
  assert.match(js,/drawSprite\(A\.skid/);
  assert.match(js,/drawSprite\(d\.small\?A\.treeSmall:A\.tree/);
});

test('Police Patrol retains varied job missions and adds road hazard work',()=>{
  assert.match(js,/spawnPursuit/);
  assert.match(js,/spawnAccident/);
  assert.match(js,/spawnTrafficMission/);
  assert.match(js,/spawnObstacle/);
  assert.match(js,/수배 차량 추격/);
  assert.match(js,/현장 안전 확보/);
  assert.match(js,/안전콘 설치/);
  assert.match(js,/낙하물 정리/);
});

test('Police siren causes nearby civilian traffic to yield',()=>{
  assert.match(js,/function updateYield/);
  assert.match(js,/if\(!player\.siren\)return/);
  assert.match(js,/c\.yield=Math\.max\(c\.yield,1\.2\)/);
  assert.match(js,/desired=65/);
});

test('Police Patrol supports desktop and touch driving',()=>{
  assert.match(js,/keys\.w/);
  assert.match(js,/keys\.a/);
  assert.match(js,/keys\.d/);
  assert.match(js,/keys\.r/);
  assert.match(js,/touch\.steer/);
  assert.match(html,/id="joy"/);
  assert.match(html,/id="sirenBtn"/);
  assert.match(css,/@media\(hover:none\),\(pointer:coarse\)/);
});

test('Police Patrol only uses valid shared static audio keys',()=>{
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'assets','audio','audio-catalog.json'),'utf8'));
  const keys=[...js.matchAll(/sfx\(\s*['"]([a-z0-9_.-]+)['"]/g)].map(m=>m[1]);
  assert.ok(keys.length>=3);
  for(const key of keys)assert.ok(catalog.sounds[key],'missing audio key '+key);
  assert.ok(catalog.sounds['collect.coin_pickup']);
  assert.ok(catalog.sounds['collect.coin_drop']);
});

test('catalog and Cloudflare build point to Police Patrol v2',()=>{
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'data','games.json'),'utf8'));
  const game=catalog.games.find(g=>g.id==='job_police_car');
  assert.equal(game.href,'games/job_police_car/경찰차 시뮬레이터.html?v=2');
  const distCatalog=JSON.parse(fs.readFileSync(path.join(root,'dist','data','games.json'),'utf8'));
  const builtGame=distCatalog.games.find(g=>g.id==='job_police_car');
  assert.equal(builtGame.href,'games/job_police_car/경찰차 시뮬레이터.html?v=2');
  assert.ok(fs.existsSync(path.join(root,'dist','games','job_police_car','경찰차 시뮬레이터.html')));
  assert.ok(fs.existsSync(path.join(root,'dist','games','job_police_car','police-patrol.js')));
  assert.ok(fs.existsSync(path.join(root,'dist','assets','game','2d','racing','kenney-racing-pack','cars','car_blue_1.png')));
});

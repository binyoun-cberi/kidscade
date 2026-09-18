const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const dir=path.join(root,'games','spelling_frog');
const html=fs.readFileSync(path.join(dir,'스펠링 프로그.html'),'utf8');
const runtime=fs.readFileSync(path.join(dir,'spelling-frog-runtime.js'),'utf8');
const loader=fs.readFileSync(path.join(dir,'spelling-frog-loader.js'),'utf8');

test('Spelling Frog uses local Three.js and split runtime files',()=>{
  assert.match(html,/spelling-frog-loader\.js\?v=20260918-3/);
  assert.match(loader,/\.\.\/\.\.\/assets\/vendor\/three-r160\/three\.module\.js/);
  assert.match(loader,/spelling-frog-runtime\.js\?v=20260918-3/);
  assert.match(loader,/spelling-frog-log-fix\.js\?v=20260914-1/);
  assert.doesNotMatch(html+runtime+loader,/cdn\.jsdelivr|cdnjs\.cloudflare|https?:\/\//i);
  assert.match(html,/audio-manager\.js\?v=20260917-1/);
});

test('Spelling Frog runtime and loader parse',()=>{
  const runtimeCheck=spawnSync(process.execPath,['--check',path.join(dir,'spelling-frog-runtime.js')],{encoding:'utf8'});
  assert.equal(runtimeCheck.status,0,runtimeCheck.stderr||runtimeCheck.stdout);
  const loaderCheck=spawnSync(process.execPath,['--input-type=module','--check'],{input:loader,encoding:'utf8'});
  assert.equal(loaderCheck.status,0,loaderCheck.stderr||loaderCheck.stdout);
});

test('Spelling Frog uses cute round frog plus retained state sprite assets',()=>{
  assert.ok(fs.existsSync(path.join(root,'assets','game','2d','animals','round','frog.png')));
  assert.match(runtime,/animals\/round\/frog\.png/);
  for(const name of ['frog-leap.png','frog-hit.png','frog-dead.png']){
    const p=path.join(root,'assets','game','2d','platformer-art','extended','enemies',name);
    assert.ok(fs.existsSync(p),'missing '+name);
    assert.ok(runtime.includes(name),'runtime missing '+name);
  }
  assert.match(runtime,/function setFrogState/);
  assert.match(runtime,/setFrogState\('leap'\)/);
  assert.match(runtime,/setFrogState\('hit'\)/);
  assert.match(runtime,/setFrogState\('dead'\)/);
});

test('Spelling Frog uses local vehicle, road, river, log, tree and letter assets',()=>{
  const required=[
    ['racing/kenney-racing-pack/cars/car_red_1.png','car_red_1.png'],
    ['racing/kenney-racing-pack/cars/car_blue_3.png','car_blue_3.png'],
    ['racing/kenney-racing-pack/tiles/asphalt-road/road_asphalt01.png','road_asphalt01.png'],
    ['racing/kenney-racing-pack/tiles/grass/land_grass01.png','land_grass01.png'],
    ['racing/kenney-racing-pack/objects/tree_large.png','tree_large.png'],
    ['platformer-art/base/tiles/liquid-water-top-mid.png','liquid-water-top-mid.png'],
    ['platformer-art/base/tiles/bridge-logs.png','bridge-logs.png'],
    ['letters/blue/letter-a.png','letterRoot'],
    ['letters/yellow/letter-z.png','letterRoot']
  ];
  for(const [rel,needle] of required){
    assert.ok(fs.existsSync(path.join(root,'assets','game','2d',rel)),'missing '+rel);
    assert.ok(runtime.includes(needle),'runtime does not reference '+needle);
  }
  assert.match(runtime,/function letterAsset/);
  assert.match(runtime,/VIS\.carRoot/);
  assert.match(runtime,/VIS\.water/);
  assert.match(runtime,/VIS\.logs/);
});

test('Spelling Frog owns its event audio without duplicate shared hooks',()=>{
  assert.match(html,/__spellingFrogOwnAudio=true/);
  assert.match(runtime,/movement\.jump/);
  assert.match(runtime,/collect\.coin_pickup/);
  assert.match(runtime,/failure\.fail_sting/);
  assert.match(runtime,/combat\.impact_heavy/);
  assert.match(runtime,/success\.cheer_woohoo/);
  const hooks=fs.readFileSync(path.join(root,'game-audio-hooks.js'),'utf8');
  assert.match(hooks,/function setupSpellingFrog\(\) \{\s*if \(window\.__spellingFrogOwnAudio\) return;/);
});

test('Spelling Frog keeps moving-log rider fix wired in',()=>{
  assert.match(html,/spelling-frog-log-fix\.js/);
  const patch=fs.readFileSync(path.join(root,'spelling-frog-log-fix.js'),'utf8');
  assert.match(patch,/frog\.position\.x\s*\+=\s*dx/);
  assert.match(runtime,/function isOnLog/);
  assert.match(runtime,/logs\.push/);
});

test('Spelling Frog catalog points to asset rework version',()=>{
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'data','games.json'),'utf8'));
  const game=catalog.games.find(g=>g.id==='spelling_frog');
  assert.equal(game.href,'games/spelling_frog/스펠링 프로그.html?v=20260918-3');
  assert.match(game.description,/개구리.*차량.*알파벳/);
  const bootstrap=fs.readFileSync(path.join(root,'main-bootstrap.js'),'utf8');
  assert.match(bootstrap,/스펠링 프로그\.html\?v=20260918-3/);
});

test('Cloudflare artifact contains Spelling Frog runtime and assets',()=>{
  const built=path.join(root,'dist','games','spelling_frog');
  assert.ok(fs.existsSync(path.join(built,'스펠링 프로그.html')));
  assert.ok(fs.existsSync(path.join(built,'spelling-frog-runtime.js')));
  assert.ok(fs.existsSync(path.join(built,'spelling-frog-loader.js')));
  const builtHtml=fs.readFileSync(path.join(built,'스펠링 프로그.html'),'utf8');
  assert.match(builtHtml,/spelling-frog-loader\.js\?v=20260918-3/);
  assert.ok(fs.existsSync(path.join(root,'dist','assets','game','2d','platformer-art','extended','enemies','frog-leap.png')));
  assert.ok(fs.existsSync(path.join(root,'dist','assets','game','2d','letters','blue','letter-a.png')));
  assert.ok(fs.existsSync(path.join(root,'dist','assets','game','2d','racing','kenney-racing-pack','cars','car_red_1.png')));
});

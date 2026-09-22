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
  assert.match(html,/spelling-frog-loader\.js\?v=20260922-1/);
  assert.match(html,/\.\.\/\.\.\/assets\/vendor\/three-r160\/three\.module\.js/);
  assert.match(loader,/from 'three'/);
  assert.match(loader,/spelling-frog-runtime\.js\?v=20260922-1/);
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

test('Spelling Frog uses animated 3D frog and GLTF loader',()=>{
  assert.ok(fs.existsSync(path.join(root,'assets','game','3d','characters','quaternius','frog.glb')));
  assert.match(html,/type="importmap"/);
  assert.match(loader,/GLTFLoader/);
  assert.match(runtime,/characters\/quaternius\/frog\.glb/);
  assert.match(runtime,/function prime3DAssets/);
  assert.match(runtime,/AnimationMixer/);
  assert.match(runtime,/setFrogState\('leap'\)/);
  assert.match(runtime,/setFrogState\('hit'\)/);
  assert.match(runtime,/setFrogState\('dead'\)/);
});

test('Spelling Frog uses shared CC0 3D road, vehicle, nature and train assets',()=>{
  const required=[
    ['3d/city/kenney-city-kit-roads/road-straight.glb','road-straight.glb'],
    ['3d/vehicles/kenney-car-kit/sedan.glb','carSedan'],
    ['3d/vehicles/kenney-car-kit/suv.glb','carSuv'],
    ['3d/nature/kenney-nature-kit/tree-default.glb','treeDefault'],
    ['3d/nature/kenney-nature-kit/log-large.glb','logLarge'],
    ['3d/rail/kenney-train-kit/railroad-rail-straight.glb','railroad-rail-straight.glb'],
    ['3d/rail/kenney-train-kit/train-locomotive-a.glb','trainLoco']
  ];
  for(const [rel,needle] of required){
    assert.ok(fs.existsSync(path.join(root,'assets','game',rel)),'missing '+rel);
    assert.ok(runtime.includes(needle),'runtime does not reference '+needle);
  }
  assert.match(runtime,/function cloneModel/);
  assert.match(runtime,/function createVehicleModel/);
  assert.match(runtime,/function addRailSurface/);
});


test('Spelling Frog preloads visible letters and preserves answer routes',()=>{
  assert.match(runtime,/function prepareUpcomingLetterRow/);
  assert.match(runtime,/prepareUpcomingLetterRow\(\)/);
  assert.match(runtime,/function choiceCols/);
  assert.match(runtime,/reserved=new Set\(choiceCols\(\)\)/);
});

test('Spelling Frog advances its animation mixer and repairs missing Kenney colormap visuals',()=>{
  assert.match(runtime,/frogMixer\)frogMixer\.update\(dt\)/);
  assert.doesNotMatch(runtime,/rotation\.x=-Math\.PI\/2;if\(frogMixer\)/);
  assert.match(runtime,/function styleModel/);
  assert.match(runtime,/MODEL_COLORS/);
  assert.match(runtime,/addVehicleGlass/);
});


test('Spelling Frog trains cross the full extended map before despawning',()=>{
  assert.match(runtime,/TRAIN_LIMIT/);
  assert.match(runtime,/const gone=t\.dir>0\?t\.mesh\.position\.x>TRAIN_LIMIT/);
  assert.doesNotMatch(runtime,/ph>=6\.3&&ph<7\.4/);
  assert.match(runtime,/road-straight\.glb/);
});

test('Spelling Frog has an animated 3D stork threat',()=>{
  assert.ok(fs.existsSync(path.join(root,'assets','game','3d','characters','monsters','ultimate-monsters-bundle','birb.glb')));
  assert.match(runtime,/storkBird/);
  assert.match(runtime,/function mountStork3D/);
  assert.match(runtime,/function updateStorkThreat/);
  assert.match(runtime,/storkMixer/);
});

test('Spelling Frog extends scenery beyond the playable board and adds collision feedback',()=>{
  assert.match(runtime,/WORLD_WIDTH/);
  assert.match(runtime,/function addEdgeWalls/);
  assert.match(runtime,/function decorateOuterRow/);
  assert.match(runtime,/function triggerImpact/);
  assert.match(runtime,/impactShake/);
  assert.match(runtime,/HitReact|hitreact/);
  assert.match(html,/id="impactFlash"/);
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
  assert.equal(game.href,'games/spelling_frog/스펠링 프로그.html?v=20260922-1');
  assert.match(game.description,/개구리.*차량.*알파벳/);
  const bootstrap=fs.readFileSync(path.join(root,'main-bootstrap.js'),'utf8');
  assert.match(bootstrap,/스펠링 프로그\.html\?v=20260922-1/);
});

test('Cloudflare artifact contains Spelling Frog runtime and assets',()=>{
  const built=path.join(root,'dist','games','spelling_frog');
  assert.ok(fs.existsSync(path.join(built,'스펠링 프로그.html')));
  assert.ok(fs.existsSync(path.join(built,'spelling-frog-runtime.js')));
  assert.ok(fs.existsSync(path.join(built,'spelling-frog-loader.js')));
  const builtHtml=fs.readFileSync(path.join(built,'스펠링 프로그.html'),'utf8');
  assert.match(builtHtml,/spelling-frog-loader\.js\?v=20260922-1/);
  assert.ok(fs.existsSync(path.join(root,'dist','assets','game','3d','characters','quaternius','frog.glb')));
  assert.ok(fs.existsSync(path.join(root,'dist','assets','game','2d','letters','blue','letter-a.png')));
  assert.ok(fs.existsSync(path.join(root,'dist','assets','game','2d','racing','kenney-racing-pack','cars','car_red_1.png')));
});

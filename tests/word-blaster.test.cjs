const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const dir=path.join(root,'games','low_word_blaster');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const runtime=fs.readFileSync(path.join(dir,'word-blaster.js'),'utf8');
const data=fs.readFileSync(path.join(dir,'word-blaster-data.js'),'utf8');

test('Word Blaster uses local Three.js and parses as modules',()=>{
  assert.match(html,/assets\/vendor\/three-r160\/three\.module\.js/);
  assert.doesNotMatch(html+runtime,/cdn\.jsdelivr|cdnjs\.cloudflare/i);
  const a=spawnSync(process.execPath,['--input-type=module','--check'],{input:runtime,encoding:'utf8'});
  assert.equal(a.status,0,a.stderr||a.stdout);
  const b=spawnSync(process.execPath,['--input-type=module','--check'],{input:data,encoding:'utf8'});
  assert.equal(b.status,0,b.stderr||b.stdout);
});

test('Word Blaster has the intended low-grade learning loop',()=>{
  assert.match(runtime,/new THREE\.Raycaster\(\)/);
  assert.match(runtime,/state\.time=state\.totalTime=20/);
  assert.match(runtime,/reveal=state\.boss\?7:5/);
  assert.match(runtime,/function startBoss\(/);
  assert.match(runtime,/state\.round>=rounds\.length/);
  assert.match(runtime,/wordBlasterBestScore/);
  assert.match(data,/en:'APPLE'/);
  assert.match(data,/boss:\['I','LIKE','APPLES'\]/);
});

test('Word Blaster has resilient asset fallbacks and Kidscade scenery',()=>{
  assert.match(runtime,/assets\/game\/3d\/word-blaster/);
  assert.match(runtime,/raygun-big\.png/);
  assert.match(runtime,/ultimate-monsters-bundle\//);
  assert.match(runtime,/dragon\.glb/);
  for(const name of ['blaster.glb','cloud.glb','letter-drone.glb','platform-large-grass.glb']){
    assert.ok(fs.existsSync(path.join(root,'assets','game','3d','word-blaster',name)),'missing Word Blaster asset: '+name);
  }
  assert.match(runtime,/function makeProceduralDrone\(/);
  assert.match(runtime,/function proceduralCloud\(/);
});

test('Word Blaster is registered as a low-grade language game',()=>{
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'data','games.json'),'utf8'));
  const game=catalog.games.find(g=>g.id==='low_word_blaster');
  assert.ok(game);
  assert.equal(game.title,'워드 블라스터');
  assert.equal(game.href,'games/low_word_blaster/index.html?v=1');
  assert.equal(game.category,'lang');
  assert.equal(game.age,'low');
  assert.equal(game.scoreKey,'wordBlasterBestScore');
});

test('Word Blaster package tracks the Kenney Starter Kit asset source',()=>{
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'assets','game','manifest','word-blaster-pack.json'),'utf8'));
  assert.equal(manifest.name,'Word Blaster Starter FPS assets');
  assert.match(manifest.source,/KenneyNL\/Starter-Kit-FPS/);
  assert.ok(manifest.files.some(x=>x.endsWith('/letter-drone.glb')));
  assert.ok(fs.existsSync(path.join(root,'assets','game','licenses','word-blaster-starter-kit-fps.md')));
});

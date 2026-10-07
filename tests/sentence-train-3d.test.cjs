const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'문장열차.html'),'utf8');
const dir=path.join(root,'games','sentence_train');
const runtime=fs.readFileSync(path.join(dir,'sentence-train-3d.js'),'utf8');
const loader=fs.readFileSync(path.join(dir,'sentence-train-3d-loader.js'),'utf8');

test('Sentence Train browser runtimes parse',()=>{
  const scripts=[...html.matchAll(/<script(?![^>]*type=["'](?:module|importmap)["'])(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).join('\n');
  let result=spawnSync(process.execPath,['--check'],{input:scripts,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr||result.stdout);
  result=spawnSync(process.execPath,['--check'],{input:runtime,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr||result.stdout);
  assert.match(loader,/import \* as THREE from 'three'/);
  assert.match(loader,/GLTFLoader/);
});

test('Sentence Train uses tracked Kenney Train Kit assets',()=>{
  const required=[
    'assets/game/3d/rail/kenney-train-kit/train-locomotive-a.glb',
    'assets/game/3d/rail/kenney-train-kit/train-carriage-container-blue.glb',
    'assets/game/3d/rail/kenney-train-kit/train-carriage-container-green.glb',
    'assets/game/3d/rail/kenney-train-kit/train-carriage-container-red.glb',
    'assets/game/3d/rail/kenney-train-kit/train-carriage-box.glb',
    'assets/game/3d/rail/kenney-train-kit/train-connector.glb',
    'assets/game/3d/rail/kenney-train-kit/railroad-straight.glb'
  ];
  for(const rel of required)assert.ok(fs.existsSync(path.join(root,rel)),'missing '+rel);
  assert.match(runtime,/train-locomotive-a\.glb/);
  assert.match(runtime,/train-carriage-container-blue\.glb/);
  assert.match(runtime,/railroad-straight\.glb/);
});

test('Sentence Train v7 makes the 3D train the sentence board and keeps readable composition',()=>{
  assert.match(runtime,/SENTENCE_TRAIN_BUILD='v7-train-is-the-board'/);
  assert.match(runtime,/body2:/);
  assert.match(runtime,/roof:/);
  assert.match(runtime,/clone\(key,1\.62,'max'\)/);
  assert.match(runtime,/clone\(locoKey,1\.82,'max'\)/);
  assert.match(runtime,/clone\(keys\[stationIndex\],3\.15,'max'\)/);
  assert.match(runtime,/toneMappingExposure=\.88/);
  assert.match(runtime,/camera\.fov=narrow\?39:34/);
  assert.match(html,/Sentence Train v7 · train-is-the-board rework/);
  assert.match(html,/\.scene\{height:420px/);
});

test('Sentence Train v5 uses color palettes, perspective and a curved rail path',()=>{
  assert.match(runtime,/TRAIN_PALETTES/);
  assert.match(runtime,/STATION_PALETTES/);
  assert.match(runtime,/function recolor/);
  assert.match(runtime,/new THREE\.CatmullRomCurve3/);
  assert.match(runtime,/new THREE\.PerspectiveCamera/);
  assert.match(runtime,/function trackPose/);
  assert.match(runtime,/function positionTrain/);
  assert.match(html,/Sentence Train v5 · true depth \+ colorful assets/);
  assert.match(html,/class="carriage-order"/);
  assert.match(html,/곡선 선로를 달리는 3D 문장열차/);
  assert.doesNotMatch(html,/\$\('#trainWrap'\)\.classList\.add\('depart'\)/);
});

test('Sentence Train v4 is a platform-first 3D rebuild',()=>{
  assert.match(html,/Sentence Train v4 · platform-first overhaul/);
  assert.match(html,/PLATFORM 01/);
  assert.match(html,/KIDSCADE RAIL · JOURNEY/);
  assert.match(html,/scene-loading/);
  assert.match(html,/document\.body\.dataset\.trainTheme=level/);
  assert.match(html,/SentenceTrain3D\?\.setTheme/);
  assert.match(runtime,/train-locomotive-passenger-a\.glb/);
  assert.match(runtime,/train-diesel-a\.glb/);
  assert.match(runtime,/train-electric-city-a\.glb/);
  assert.match(runtime,/function setTheme/);
  assert.doesNotMatch(html,/id="weatherIcon"/);
  assert.doesNotMatch(html,/id="stationBuilding"/);
});

test('Sentence Train replaces drawn station scenery with real tracked assets',()=>{
  const required=[
    'assets/game/3d/city/kenney-city-kit-suburban/building-type-f.glb',
    'assets/game/3d/city/kenney-city-kit-suburban/building-type-h.glb',
    'assets/game/3d/city/kenney-city-kit-suburban/building-type-d.glb',
    'assets/game/3d/city/kenney-city-kit-suburban/building-type-q.glb',
    'assets/game/3d/interiors/kenney-furniture-kit/bench.glb',
    'assets/game/3d/city/kenney-city-kit-roads/light-curved.glb',
    'assets/game/3d/nature/kenney-nature-kit/sign.glb',
    'assets/game/3d/nature/kenney-nature-kit/plant-bush.glb',
    'assets/game/3d/nature/kenney-nature-kit/flower-yellow-a.glb'
  ];
  for(const rel of required)assert.ok(fs.existsSync(path.join(root,rel)),'missing '+rel);
  assert.match(runtime,/stationA:asset\('3d\/city\/kenney-city-kit-suburban\/building-type-f\.glb'\)/);
  assert.match(runtime,/function buildStation/);
  assert.match(runtime,/setStation/);
  assert.match(html,/assetStationName/);
  assert.match(html,/sentence-train-3d-ready \.station-building\{display:none!important\}/);
});

test('Sentence Train keeps sentence ordering gameplay while syncing 3D carriage count',()=>{
  assert.match(html,/const BANK=\{/);
  assert.match(html,/function renderRound\(\)/);
  assert.match(html,/function checkAnswer\(\)/);
  assert.match(html,/dataset\.text/);
  assert.match(html,/SentenceTrain3D\?\.setCars/);
  assert.match(html,/SentenceTrain3D\?\.setCarLabel/);
  assert.match(runtime,/function setCarLabel/);
  assert.match(html,/id="boardingStatus"/);
  assert.match(html,/출발 준비 중/);
  assert.match(html,/SentenceTrain3D\?\.depart/);
  assert.match(html,/SentenceTrain3D\?\.celebrate/);
  assert.match(html,/dataset\\.car/);
});

test('Sentence Train has local Three.js and CSS fallback train',()=>{
  assert.match(html,/id="train3d"/);
  assert.match(html,/assets\/vendor\/three-r160\/three\.module\.js/);
  assert.match(html,/sentence-train-3d-loader\.js\?v=7/);
  assert.match(html,/function engineMarkup\(\)/);
  assert.match(html,/sentence-train-3d-ready/);
});

test('Sentence Train catalog points to v7',()=>{
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'data','games.json'),'utf8'));
  const game=catalog.games.find(g=>g.id==='kor_sentence_train');
  assert.ok(game);
  assert.equal(game.href,'문장열차.html?v=7');
});

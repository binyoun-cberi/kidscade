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

test('Sentence Train keeps sentence ordering gameplay while syncing 3D carriage count',()=>{
  assert.match(html,/const BANK=\{/);
  assert.match(html,/function renderRound\(\)/);
  assert.match(html,/function checkAnswer\(\)/);
  assert.match(html,/dataset\.text/);
  assert.match(html,/SentenceTrain3D\?\.setCars/);
  assert.match(html,/SentenceTrain3D\?\.depart/);
  assert.match(html,/SentenceTrain3D\?\.celebrate/);
  assert.match(html,/data-car/);
});

test('Sentence Train has local Three.js and CSS fallback train',()=>{
  assert.match(html,/id="train3d"/);
  assert.match(html,/assets\/vendor\/three-r160\/three\.module\.js/);
  assert.match(html,/sentence-train-3d-loader\.js\?v=1/);
  assert.match(html,/function engineMarkup\(\)/);
  assert.match(html,/sentence-train-3d-ready/);
});

test('Sentence Train catalog points to v2',()=>{
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'data','games.json'),'utf8'));
  const game=catalog.games.find(g=>g.id==='kor_sentence_train');
  assert.ok(game);
  assert.equal(game.href,'문장열차.html?v=2');
});

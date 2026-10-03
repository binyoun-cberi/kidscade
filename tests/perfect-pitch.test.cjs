const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const dir=path.join(root,'games','low_perfect_pitch');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const runtime=fs.readFileSync(path.join(dir,'game.js'),'utf8');

test('Perfect Pitch uses local Web Audio microphone pitch control',()=>{
  assert.match(runtime,/getUserMedia/);
  assert.match(runtime,/createAnalyser/);
  assert.match(runtime,/getFloatTimeDomainData/);
  assert.match(runtime,/hzToMidi/);
  assert.match(runtime,/1200\*Math\.log2/);
  assert.doesNotMatch(html+runtime,/openai|googleapis|azure|assemblyai|deepgram/i);
});

test('Perfect Pitch has calibration, three difficulties, and SDK lifecycle',()=>{
  assert.match(runtime,/beginCalibration/);
  assert.match(runtime,/easy:\{label:'초급'/);
  assert.match(runtime,/normal:\{label:'보통'/);
  assert.match(runtime,/hard:\{label:'도전'/);
  assert.match(runtime,/KidscadeGame\?\.start/);
  assert.match(runtime,/KidscadeGame\?\.gameOver/);
  assert.ok(html.includes('data-game-id="low_perfect_pitch"'));
});

test('Perfect Pitch includes endless high-note stair mode',()=>{
  assert.ok(html.includes('data-mode="stair"'));
  assert.match(runtime,/gameMode:'classic'/);
  assert.match(runtime,/function startStairGame/);
  assert.match(runtime,/function stairGameLoop/);
  assert.match(runtime,/function stairSemitone/);
  assert.match(runtime,/stairLives:3/);
  assert.match(runtime,/restEvery:7/);
  assert.match(runtime,/큰 소리는 필요 없어요/);
});

test('Perfect Pitch runtime parses',()=>{
  const checked=spawnSync(process.execPath,['--check'],{input:runtime,encoding:'utf8'});
  assert.equal(checked.status,0,checked.stderr||checked.stdout);
});

test('Perfect Pitch is registered as a music game',()=>{
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'data','games.json'),'utf8'));
  const game=catalog.games.find(g=>g.id==='low_perfect_pitch');
  assert.ok(game);
  assert.equal(game.title,'퍼펙트 피치');
  assert.equal(game.category,'music');
  assert.equal(game.subject,'arts');
  assert.equal(game.genre,'rhythm');
  assert.equal(game.age,'low');
  assert.deepEqual(game.ages,['low','high']);
});

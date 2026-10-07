const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const dir=path.join(root,'games','language_word_siege');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const runtime=fs.readFileSync(path.join(dir,'game.js'),'utf8');
const dataSource=fs.readFileSync(path.join(dir,'word-data.js'),'utf8');

function loadData(){
  const sandbox={window:{}};
  vm.runInNewContext(dataSource,sandbox,{filename:'word-data.js'});
  return sandbox.window.WordSiegeData;
}

function canSpell(rack,word){
  const counts={};
  for(const c of rack)counts[c]=(counts[c]||0)+1;
  for(const c of word){if(!counts[c])return false;counts[c]--}
  return true;
}

test('Word Siege runtime parses and uses Kidscade shared storage',()=>{
  for(const file of ['game.js','word-data.js']){
    const src=fs.readFileSync(path.join(dir,file),'utf8');
    const parsed=spawnSync(process.execPath,['--check'],{input:src,encoding:'utf8'});
    assert.equal(parsed.status,0,parsed.stderr||parsed.stdout);
  }
  assert.ok(html.includes('../../kidscade-storage.js'));
  assert.ok(html.includes('data-game-id="language_word_siege"'));
  assert.ok(!runtime.includes('localStorage.getItem('));
  assert.ok(!runtime.includes('localStorage.setItem('));
});

test('Word Siege starts with a guaranteed economy and attack choice',()=>{
  const data=loadData();
  assert.equal(data.maxRack,12);
  assert.equal(data.startRack.length,12);
  assert.ok(canSpell(data.startRack,'MINER'));
  assert.ok(canSpell(data.startRack,'ARROW'));
  assert.equal(data.words.MINER.role,'resource');
  assert.equal(data.words.ARROW.role,'rapid');
  assert.equal(data.words.FIRE.role,'burn');
  assert.equal(data.words.ICE.role,'slow');
  assert.equal(data.words.FAST.role,'modifier');
  assert.ok(Object.keys(data.words).length>=80);
});

test('Word Siege contains the intended tower-defense and anti-stall loop',()=>{
  assert.match(runtime,/const MAX_WAVES=8|state\.wave>=8|WAVE.*8/);
  assert.match(runtime,/function availableWords\(/);
  assert.match(runtime,/function showHint\(/);
  assert.match(runtime,/function ensurePlayableRack\(/);
  assert.match(runtime,/def\.role==='resource'/);
  assert.match(runtime,/function applyLinks\(/);
  assert.match(runtime,/Math\.max\(\.65,Math\.pow\(\.93,duplicates\)\)/);
  assert.match(runtime,/function startWave\(/);
  assert.match(runtime,/function endGame\(/);
});

test('Word Siege storage keys are registered',()=>{
  const storage=fs.readFileSync(path.join(root,'kidscade-storage.js'),'utf8');
  assert.match(storage,/wordSiegeDictionary:\s*'kidscade_word_siege_discovered_v1'/);
  assert.match(storage,/wordSiegeBest:\s*'kidscade_word_siege_best_v1'/);
});

test('Word Siege is registered as a language strategy game',()=>{
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'data','games.json'),'utf8'));
  const game=catalog.games.find(g=>g.id==='language_word_siege');
  assert.ok(game);
  assert.equal(game.title,'워드 시즈');
  assert.equal(game.subject,'language');
  assert.equal(game.genre,'strategy');
  assert.deepEqual(game.ages,['low','high']);
  assert.equal(game.scoreKey,'kidscade_word_siege_best_v1');
});

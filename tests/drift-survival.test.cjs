const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const ROOT=path.resolve(__dirname,'..');
const GAME=path.join(ROOT,'games','high_drift_survival');

function read(name){return fs.readFileSync(path.join(GAME,name),'utf8')}

test('drift survival scripts remain valid JavaScript',()=>{
  for(const name of ['game-1.js','game-2.js','game-3.js','game-4.js']){
    assert.doesNotThrow(()=>new vm.Script(read(name),{filename:name}),name+' must parse');
  }
});

test('drift survival gameplay source remains clean UTF-8',()=>{
  const source=read('game-2.js');
  assert.doesNotMatch(source,/ì•|ëŠ|ðŸ|�|\u0000/);
  assert.match(source,/아직 갈 수 없는 곳이에요/);
  assert.match(source,/FARM MINI GAME/);
  assert.match(source,/function startGather\(/);
  assert.match(source,/function startFishing\(/);
  assert.match(source,/function startRepair\(/);
  assert.match(source,/function startFarm\(/);
});

test('drift survival keeps the connected survival loop',()=>{
  const source=read('game-2.js');
  assert.match(source,/function selfSufficiency\(/);
  assert.match(source,/function chooseSettlement\(/);
  assert.match(source,/state\.inv\.rope/);
  assert.match(source,/state\.tools\.lighthouse/);
  assert.match(source,/state\.built\.field/);
  assert.match(source,/state\.rescue/);
});

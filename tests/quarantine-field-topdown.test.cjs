const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const ROOT=path.resolve(__dirname,'..');
const gameDir=path.join(ROOT,'games','high_quarantine_17');

test('격리구역 17 v18 uses CAMP-17 topdown field missions',()=>{
  const html=fs.readFileSync(path.join(gameDir,'격리구역 17.html'),'utf8');
  const outbreak=fs.readFileSync(path.join(gameDir,'outbreak-v3.js'),'utf8');
  const field=fs.readFileSync(path.join(gameDir,'field-topdown-v18.js'),'utf8');
  const catalog=JSON.parse(fs.readFileSync(path.join(ROOT,'data','games.json'),'utf8'));
  const entry=(catalog.games||catalog).find(g=>g.id==='high_quarantine_17');

  assert.match(html,/field-topdown-v18\.js\?v=1/);
  assert.match(html,/CAMP-17 탑다운 현장 출동/);
  assert.equal(entry.href,'games/high_quarantine_17/격리구역 17.html?v=18');

  assert.match(field,/api\.respondCamp=function/);
  assert.match(field,/api\.respondGlobal=function/);
  assert.match(field,/q17FightRoom/);
  assert.match(field,/resetMission\('isolation'/);
  assert.match(field,/자동포탑/);
  assert.match(field,/state\.crates/);
  assert.match(field,/state\.survivors/);
  assert.match(field,/bridge\(\)/);
  assert.match(outbreak,/resolveIsolationField:function/);
  assert.match(outbreak,/현장 소탕 완료/);

  assert.doesNotThrow(()=>new Function(field));
  assert.doesNotThrow(()=>new Function(outbreak));
});

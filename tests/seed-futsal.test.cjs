const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.join(__dirname,'..');
const gameDir=path.join(root,'games','high_seed_fc_manager');
const enginePath=path.join(gameDir,'futsal-history-match.js');
const dataPath=path.join(gameDir,'data.js');
const indexPath=path.join(gameDir,'index.html');

test('Seed Futsal is absorbed into Futsal History League',()=>{
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'data','games.json'),'utf8'));
  const games=Array.isArray(catalog)?catalog:catalog.games;
  assert.equal(games.some(item=>item.id==='high_seed_futsal'),false);
  const game=games.find(item=>item.id==='high_seed_fc_manager');
  assert.ok(game);
  assert.equal(game.title,'풋살 히스토리그');
  assert.equal(game.genre,'sports');
  assert.deepEqual(game.input,['touch','keyboard']);
  assert.equal(fs.existsSync(path.join(root,'games','high_seed_futsal')),false);
});

test('Futsal History League uses a physical 5v5 match engine',()=>{
  const source=fs.readFileSync(enginePath,'utf8');
  const data=fs.readFileSync(dataPath,'utf8');
  assert.doesNotThrow(()=>new vm.Script(source));
  assert.match(source,/FIELD_W=1500,FIELD_H=840/);
  assert.match(source,/ball:\{x:FIELD_W\/2,y:FIELD_H\/2,z:0,vx:0,vy:0,vz:0/);
  assert.match(source,/function tendencies\(/);
  assert.match(source,/function aiCarrier\(/);
  assert.match(source,/function tackle\(/);
  assert.match(source,/function render\(canvas\)/);
  assert.match(source,/kenney-platformer-characters/);
  assert.match(source,/ball_soccer1\.png/);
  assert.match(data,/'1-2-1':\['GK','CB','WG','WG','ST'\]/);
  assert.match(data,/'4-0':\['GK','CM','CM','WG','WG'\]/);
});

test('Futsal History League exposes direct keyboard and touch controls',()=>{
  const html=fs.readFileSync(indexPath,'utf8');
  assert.match(html,/data-game-id="high_seed_fc_manager"/);
  assert.match(html,/data-fh-action="switch"/);
  assert.match(html,/data-fh-action="pass"/);
  assert.match(html,/data-fh-action="through"/);
  assert.match(html,/data-fh-action="lob"/);
  assert.match(html,/data-fh-action="shoot"/);
  assert.match(html,/futsal-history-match\.js\?v=12/);
});

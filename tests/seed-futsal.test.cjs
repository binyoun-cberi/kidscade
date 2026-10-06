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
const gamePath=path.join(gameDir,'game.js');
const stylePath=path.join(gameDir,'style.css');

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
  assert.match(html,/futsal-history-match\.js\?v=14/);
});


test('Futsal History League lets children switch between watch and direct control',()=>{
  const engine=fs.readFileSync(enginePath,'utf8');
  const game=fs.readFileSync(gamePath,'utf8');
  const html=fs.readFileSync(indexPath,'utf8');
  assert.doesNotThrow(()=>new vm.Script(game));
  assert.match(engine,/directControl:false/);
  assert.match(engine,/m\.setDirectControl=function\(on\)/);
  assert.match(engine,/m\.getControlState=function\(\)/);
  assert.match(engine,/if\(m\.directControl\)userPlayer\(m\.controlled,dt\)/);
  assert.match(game,/function toggleDirectControl\(\)/);
  assert.match(game,/match\.setDirectControl\(false\)/);
  assert.match(html,/id="directControlBtn"/);
  assert.match(html,/🎮 직접 조종 켜기/);
  assert.doesNotMatch(html,/data-fh-hold="jockey"/);
});

test('Futsal History League teaches tackle timing instead of hiding the success window',()=>{
  const engine=fs.readFileSync(enginePath,'utf8');
  const game=fs.readFileSync(gamePath,'utf8');
  const html=fs.readFileSync(indexPath,'utf8');
  const css=fs.readFileSync(stylePath,'utf8');
  assert.match(engine,/function tackleGuide\(/);
  assert.match(engine,/d<=48/);
  assert.match(engine,/d<=72/);
  assert.match(engine,/지금! 초록 표시에서 D를 누르면 태클 성공률이 높아요/);
  assert.match(engine,/emit\('foul'/);
  assert.match(game,/function updateControlCoach\(\)/);
  assert.match(game,/초록 표시 \+ “지금! D 태클”/);
  assert.match(html,/id="controlHint"/);
  assert.match(html,/초록 표시에서 D 태클/);
  assert.match(css,/tackle-ready/);
  assert.match(css,/tackle-near/);
});

test('Futsal History League has stadium-style audio feedback',()=>{
  const engine=fs.readFileSync(enginePath,'utf8');
  const game=fs.readFileSync(gamePath,'utf8');
  assert.match(engine,/emit\('call'/);
  assert.match(game,/function startStadiumAmbience\(\)/);
  assert.match(game,/function crowdSwell\(/);
  assert.match(game,/function whistleSfx\(/);
  assert.match(game,/function passThump\(/);
  assert.match(game,/function teammateVoice\(/);
  assert.match(game,/e\.type==='pass'\|\|e\.type==='cross'/);
  assert.match(game,/e\.type==='tackle'/);
  assert.match(game,/e\.type==='foul'/);
  assert.match(game,/e\.type==='call'/);
});

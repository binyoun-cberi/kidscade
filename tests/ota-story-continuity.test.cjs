'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const dir=path.join(__dirname,'../games/high_ota_typographic_horror');
const game=fs.readFileSync(path.join(dir,'game.js'),'utf8');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');

test('new story ending offers an optional maze without changing speedrun or visual QA',()=>{
  assert.match(game,/if\(visualAudit\)C3\.finish\(state,player\)/);
  assert.match(game,/else if\(run\.mode==='story'\)\{/);
  assert.match(game,/overlays\.mazeChoice\.classList\.remove\('closed'\)/);
  assert.match(game,/else enterMaze\(\)/);
  assert.match(game,/state\.stage='won';state\.finished=true;syncStage\(before\)/);
  assert.match(game,/state\.stage='maze'/);
  assert.match(game,/if\(won\)clearChapterCheckpoint\(\)/);
  assert.match(html,/id="mazeChoice"/);
  assert.match(html,/id="mazeContinue"/);
  assert.match(html,/id="mazeFinish"/);
});

test('the final decision modal freezes the same hazards as reading puzzles',()=>{
  const start=game.indexOf('function animate(now)');
  const end=game.indexOf('function resize()',start);
  const loop=game.slice(start,end);
  assert.ok(start>0&&end>start);
  for(const id of ['fix','correction','rewrite','sentence','mazeChoice'])
    assert.ok(loop.includes('overlays.'+id+".classList.contains('closed')"),id+' must freeze the update loop');
  const interaction=game.slice(game.indexOf('function interact()'),game.indexOf('function openPuzzle('));
  assert.match(interaction,/overlays\.mazeChoice\.classList\.contains\('closed'\)/);
});

test('story checkpoints survive tab closes and new runs remove both copies',()=>{
  const save=game.slice(game.indexOf('function saveChapterCheckpoint()'),game.indexOf('function clearLiteracyVisuals()'));
  assert.match(save,/sessionStorage\.setItem\(CHECKPOINT_KEY,value\)/);
  assert.match(save,/localStorage\.setItem\(CHECKPOINT_KEY,value\)/);
  const load=game.slice(game.indexOf('function loadChapterCheckpoint()'),game.indexOf('function respawnAtCheckpoint()'));
  assert.match(load,/\['sessionStorage','localStorage'\]/);
  assert.match(load,/saved\?\.version===3/);
  assert.match(load,/saved\.run\?\.mode==='story'/);
  assert.match(load,/sessionStorage\.removeItem\(CHECKPOINT_KEY\)/);
  assert.match(load,/localStorage\.removeItem\(CHECKPOINT_KEY\)/);
  assert.match(game,/el\('start'\)\.addEventListener\('click',\(\)=>\{\s*clearChapterCheckpoint\(\)/);
  assert.match(game,/data\.maze=M\.snapshot\(maze\)/);
});

test('window reveals a room visually while collision remains controlled by existing rules',()=>{
  assert.match(game,/rewriteWindowFrame=new THREE\.Group\(\)/);
  assert.match(game,/rewriteWallPlug\.material\.transparent=true/);
  assert.match(game,/rewriteWallPlug\.material\.opacity=rewrite\.windowMade\?\.12:1/);
  assert.match(game,/rewriteWindowClue\.visible=state\.stage==='explore'&&rewrite\.windowMade/);
  assert.match(game,/RW\.canMove\(rewrite,x,z,\(a,b\)=>C3\.canMove\(state,a,b\)\)/);
  assert.match(game,/rewrite\.doorMade\?'문':rewrite\.windowMade\?'창문':'벽'/);
});

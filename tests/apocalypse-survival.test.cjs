const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const dir=path.join(root,'games','high_apocalypse_survival');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const js=fs.readFileSync(path.join(dir,'game.js'),'utf8');
const css=fs.readFileSync(path.join(dir,'style.css'),'utf8');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data','games.json'),'utf8'));

test('apocalypse survival module parses and loads Kidscade shell',()=>{
  const stripped=js.replace(/^import .*$/gm,'');
  const r=spawnSync(process.execPath,['--check'],{input:stripped,encoding:'utf8'});
  assert.equal(r.status,0,r.stderr||r.stdout);
  assert.match(html,/kidscade-game-sdk\.js/);
  assert.match(html,/data-game-id="high_apocalypse_survival"/);
  assert.match(html,/type="importmap"/);
  assert.match(html,/game\.js\?v=1/);
});

test('seven-day science and social survival loop is wired',()=>{
  for(const day of [1,2,3,4,5,6,7])assert.match(js,new RegExp('\\n '+day+':\\{title:'));
  for(const id of ['waterRisk','boiling','combustion','insulation','electricity','division','scarcity','community','riverSettlement','flood'])assert.ok(js.includes("'"+id+"'"),id);
  for(const id of ['campfire','shelter','workbench'])assert.ok(js.includes(id),id);
  assert.match(js,/chooseDistribution/);
  assert.match(js,/readyFlood/);
  assert.match(js,/finish\(\)/);
});

test('tracked Kidscade survival assets used by the game exist',()=>{
  const base=path.join(root,'assets','game','3d','survival','kenney-survival-kit');
  for(const file of ['tree.glb','rock-a.glb','campfire-pit.glb','structure.glb','workbench.glb'])assert.ok(fs.existsSync(path.join(base,file)),'missing '+file);
  assert.match(js,/kenney-survival-kit/);
  assert.match(js,/kidscade-avatar-studio-preview/);
});

test('game is registered in catalog metadata v7',()=>{
  const game=catalog.games.find(g=>g.id==='high_apocalypse_survival');
  assert.ok(game,'catalog entry missing');
  assert.equal(game.href,'games/high_apocalypse_survival/index.html?v=1');
  assert.equal(game.subject,'science');
  assert.equal(game.genre,'sandbox');
  assert.ok(game.players.includes('solo'));
  assert.ok(game.input.includes('keyboard'));
  assert.ok(game.input.includes('touch'));
});

test('responsive classroom UI exposes survival tablet and mobile controls',()=>{
  for(const text of ['생존 도감','정착지','공동체 의사결정','멸망 7일째'])assert.ok(html.includes(text),text);
  assert.match(css,/\.mobile-move/);
  assert.match(css,/@media/);
});
